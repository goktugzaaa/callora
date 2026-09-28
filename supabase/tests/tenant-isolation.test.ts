import { beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, createTestDb, createUser, pgErrorCode, type Db } from "./harness";

type Tenant = {
  ownerId: string;
  businessId: string;
  staffId: string;
  serviceId: string;
  customerId: string;
  conversationId: string;
  appointmentId: string;
};

const TENANT_TABLES = [
  "assistant_settings",
  "booking_settings",
  "working_hours",
  "staff",
  "services",
  "faqs",
  "customers",
  "conversations",
  "messages",
  "appointments",
];

async function seedTenant(db: Db, slug: string): Promise<Tenant> {
  const ownerId = await createUser(db, `${slug}@example.com`);

  const businessId = await asUser(db, ownerId, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      "select public.create_business($1, $2, 'beauty_salon', 'Asia/Amman', 'JOD', '{en,ar}') as id",
      [`Salon ${slug}`, slug],
    );
    return rows[0].id;
  });

  return asService(db, async (tx) => {
    const one = async (sql: string, params: unknown[]) =>
      (await tx.query<{ id: string }>(sql, params)).rows[0].id;

    await tx.query(
      "insert into public.working_hours (business_id, weekday, opens_at, closes_at) values ($1, 1, '10:00', '20:00')",
      [businessId],
    );
    await tx.query("insert into public.faqs (business_id, question, answer) values ($1, 'Parking?', 'Yes')", [
      businessId,
    ]);
    const staffId = await one("insert into public.staff (business_id, name) values ($1, 'Rania') returning id", [
      businessId,
    ]);
    const serviceId = await one(
      `insert into public.services (business_id, name, duration_min, price)
       values ($1, '{"en":"Haircut","ar":"قص شعر"}', 45, 20) returning id`,
      [businessId],
    );
    const customerId = await one(
      "insert into public.customers (business_id, name, phone) values ($1, 'Lina', '+962790000001') returning id",
      [businessId],
    );
    const conversationId = await one(
      `insert into public.conversations (business_id, customer_id, channel, external_id)
       values ($1, $2, 'whatsapp', '962790000001') returning id`,
      [businessId, customerId],
    );
    await tx.query(
      "insert into public.messages (business_id, conversation_id, role, content) values ($1, $2, 'customer', 'Hi')",
      [businessId, conversationId],
    );
    const appointmentId = await one(
      `insert into public.appointments
         (business_id, customer_id, service_id, staff_id, starts_at, ends_at, blocked_until, source)
       values ($1, $2, $3, $4, '2030-01-07 10:00+03', '2030-01-07 10:45+03', '2030-01-07 10:45+03', 'whatsapp')
       returning id`,
      [businessId, customerId, serviceId, staffId],
    );

    return { ownerId, businessId, staffId, serviceId, customerId, conversationId, appointmentId };
  });
}

describe("tenant isolation (row-level security)", () => {
  let db: Db;
  let a: Tenant;
  let b: Tenant;

  beforeAll(async () => {
    db = await createTestDb();
    a = await seedTenant(db, "salon-a");
    b = await seedTenant(db, "salon-b");
  });

  it("an owner sees only their own business", async () => {
    const ids = await asUser(db, a.ownerId, async (tx) =>
      (await tx.query<{ id: string }>("select id from public.businesses")).rows.map((r) => r.id),
    );
    expect(ids).toEqual([a.businessId]);
  });

  it.each(TENANT_TABLES)("%s: reads never cross tenants", async (table) => {
    const businessIds = await asUser(db, a.ownerId, async (tx) =>
      (await tx.query<{ business_id: string }>(`select distinct business_id from public.${table}`)).rows.map(
        (r) => r.business_id,
      ),
    );
    expect(businessIds).toEqual([a.businessId]);
  });

  it("cannot read another tenant's customers even by id", async () => {
    const rows = await asUser(db, a.ownerId, async (tx) =>
      (await tx.query("select * from public.customers where id = $1", [b.customerId])).rows,
    );
    expect(rows).toHaveLength(0);
  });

  it("cannot insert rows into another tenant", async () => {
    const code = await asUser(db, a.ownerId, (tx) =>
      pgErrorCode(tx.query("insert into public.customers (business_id, name) values ($1, 'Intruder')", [b.businessId])),
    );
    expect(code).toBe("42501"); // insufficient_privilege (RLS with check)
  });

  it("cannot update or delete another tenant's rows", async () => {
    await asUser(db, a.ownerId, async (tx) => {
      const updated = await tx.query("update public.appointments set status = 'cancelled' where id = $1", [
        b.appointmentId,
      ]);
      const deleted = await tx.query("delete from public.services where id = $1", [b.serviceId]);
      expect(updated.affectedRows).toBe(0);
      expect(deleted.affectedRows).toBe(0);
    });
    const status = await asService(db, async (tx) =>
      (await tx.query<{ status: string }>("select status from public.appointments where id = $1", [b.appointmentId]))
        .rows[0].status,
    );
    expect(status).toBe("confirmed");
  });

  it("cannot move a row into another tenant", async () => {
    const code = await asUser(db, a.ownerId, (tx) =>
      pgErrorCode(tx.query("update public.faqs set business_id = $1 where business_id = $2", [b.businessId, a.businessId])),
    );
    expect(code).toBe("42501");
  });

  it("composite foreign keys block cross-tenant references, even for the server", async () => {
    const code = await asService(db, (tx) =>
      pgErrorCode(
        tx.query(
          `insert into public.appointments
             (business_id, customer_id, service_id, staff_id, starts_at, ends_at, blocked_until)
           values ($1, $2, $3, $4, '2030-02-01 10:00+03', '2030-02-01 11:00+03', '2030-02-01 11:00+03')`,
          [a.businessId, a.customerId, a.serviceId, b.staffId],
        ),
      ),
    );
    expect(code).toBe("23503"); // foreign_key_violation
  });

  it("anonymous visitors see nothing", async () => {
    const counts = await asUser(db, null, async (tx) =>
      Promise.all(
        ["businesses", "customers", "messages", "appointments"].map(
          async (t) => (await tx.query<{ n: number }>(`select count(*)::int as n from public.${t}`)).rows[0].n,
        ),
      ),
    );
    expect(counts).toEqual([0, 0, 0, 0]);
  });

  it("WhatsApp access tokens are unreadable to business members", async () => {
    await asService(db, async (tx) => {
      await tx.query(
        "insert into public.whatsapp_accounts (business_id, phone_number_id, waba_id) values ($1, 'pn-a', 'waba-a')",
        [a.businessId],
      );
      await tx.query(
        "insert into public.whatsapp_credentials (business_id, access_token_encrypted) values ($1, 'secret')",
        [a.businessId],
      );
    });
    await asUser(db, a.ownerId, async (tx) => {
      expect((await tx.query("select * from public.whatsapp_accounts")).rows).toHaveLength(1);
      expect((await tx.query("select * from public.whatsapp_credentials")).rows).toHaveLength(0);
    });
  });
});

describe("roles", () => {
  let db: Db;
  let a: Tenant;

  beforeAll(async () => {
    db = await createTestDb();
    a = await seedTenant(db, "salon-roles");
  });

  it("a viewer can read but not write", async () => {
    const viewerId = await createUser(db, "viewer@example.com");
    await asService(db, (tx) =>
      tx.query("insert into public.business_members (business_id, user_id, role) values ($1, $2, 'viewer')", [
        a.businessId,
        viewerId,
      ]),
    );
    await asUser(db, viewerId, async (tx) => {
      expect((await tx.query("select id from public.services")).rows).toHaveLength(1);
      const code = await pgErrorCode(
        tx.query(`insert into public.services (business_id, name, duration_min) values ($1, '{"en":"X"}', 30)`, [
          a.businessId,
        ]),
      );
      expect(code).toBe("42501");
    });
  });

  it("staff can handle appointments but not change configuration", async () => {
    const staffUserId = await createUser(db, "staff@example.com");
    await asService(db, (tx) =>
      tx.query("insert into public.business_members (business_id, user_id, role) values ($1, $2, 'staff')", [
        a.businessId,
        staffUserId,
      ]),
    );
    await asUser(db, staffUserId, async (tx) => {
      const updated = await tx.query("update public.appointments set notes = 'Arrived' where id = $1", [
        a.appointmentId,
      ]);
      expect(updated.affectedRows).toBe(1);
      const code = await pgErrorCode(
        tx.query(`insert into public.services (business_id, name, duration_min) values ($1, '{"en":"X"}', 30)`, [
          a.businessId,
        ]),
      );
      expect(code).toBe("42501");
    });
  });

  it("owners cannot change their own plan or status; platform admins can", async () => {
    const code = await asUser(db, a.ownerId, (tx) =>
      pgErrorCode(tx.query("update public.businesses set status = 'active' where id = $1", [a.businessId])),
    );
    expect(code).toBe("42501");

    const adminId = await createUser(db, "admin@example.com");
    await asService(db, (tx) => tx.query("insert into public.platform_admins (user_id) values ($1)", [adminId]));
    await asUser(db, adminId, async (tx) => {
      const res = await tx.query("update public.businesses set status = 'suspended' where id = $1", [a.businessId]);
      expect(res.affectedRows).toBe(1);
      expect((await tx.query("select id from public.businesses")).rows.length).toBeGreaterThan(0);
    });
  });

  it("the rate limiter is server-only", async () => {
    const code = await asUser(db, a.ownerId, (tx) => pgErrorCode(tx.query("select public.hit_rate_limit('k', 5, 60)")));
    expect(code).toBe("42501");

    const results = await asService(db, async (tx) => {
      const out: boolean[] = [];
      for (let i = 0; i < 4; i++) {
        out.push((await tx.query<{ ok: boolean }>("select public.hit_rate_limit('k', 3, 60) as ok")).rows[0].ok);
      }
      return out;
    });
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("appointment overlap protection", () => {
  let db: Db;
  let a: Tenant;

  const insert = (tx: Db, start: string, end: string, blockedUntil = end, staffId = a.staffId) =>
    tx.query(
      `insert into public.appointments
         (business_id, customer_id, service_id, staff_id, starts_at, ends_at, blocked_until)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [a.businessId, a.customerId, a.serviceId, staffId, start, end, blockedUntil],
    );

  beforeAll(async () => {
    db = await createTestDb();
    a = await seedTenant(db, "salon-overlap");
  });

  it("rejects a double booking for the same staff member", async () => {
    // Seeded appointment: 2030-01-07 10:00–10:45 (+03)
    const code = await asService(db, (tx) => pgErrorCode(insert(tx, "2030-01-07 10:30+03", "2030-01-07 11:00+03")));
    expect(code).toBe("23P01"); // exclusion_violation
  });

  it("allows back-to-back appointments", async () => {
    const code = await asService(db, (tx) => pgErrorCode(insert(tx, "2030-01-07 10:45+03", "2030-01-07 11:30+03")));
    expect(code).toBeNull();
  });

  it("respects the buffer stored in blocked_until", async () => {
    await asService(db, (tx) => insert(tx, "2030-01-08 10:00+03", "2030-01-08 10:30+03", "2030-01-08 10:45+03"));
    const code = await asService(db, (tx) => pgErrorCode(insert(tx, "2030-01-08 10:40+03", "2030-01-08 11:00+03")));
    expect(code).toBe("23P01");
  });

  it("cancelled appointments free the slot", async () => {
    await asService(db, (tx) =>
      tx.query("update public.appointments set status = 'cancelled' where id = $1", [a.appointmentId]),
    );
    const code = await asService(db, (tx) => pgErrorCode(insert(tx, "2030-01-07 10:00+03", "2030-01-07 10:30+03")));
    expect(code).toBeNull();
  });

  it("a new appointment turns the lead into a customer", async () => {
    const stage = await asService(db, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        "insert into public.customers (business_id, name) values ($1, 'New lead') returning id",
        [a.businessId],
      );
      await tx.query(
        `insert into public.appointments
           (business_id, customer_id, service_id, staff_id, starts_at, ends_at, blocked_until)
         values ($1, $2, $3, $4, '2030-03-01 12:00+03', '2030-03-01 12:45+03', '2030-03-01 12:45+03')`,
        [a.businessId, rows[0].id, a.serviceId, a.staffId],
      );
      return (await tx.query<{ stage: string }>("select stage from public.customers where id = $1", [rows[0].id]))
        .rows[0].stage;
    });
    expect(stage).toBe("customer");
  });
});
