/**
 * Seeds the demo tenants and the demo login.   npm run db:seed
 *
 * Safe to re-run: each demo business is deleted and recreated with dates
 * relative to today. Real (non-demo) businesses are never touched.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 * Optional: DEMO_USER_EMAIL, DEMO_USER_PASSWORD, PLATFORM_ADMIN_EMAIL
 */
import { createClient } from "@supabase/supabase-js";
import { addDays, localToInstant, parseClock, toLocalDate } from "../src/lib/booking/time";
import type { Database } from "../src/lib/supabase/database.types";
import { DEMO_BUSINESSES, type SeedBusiness } from "./seed-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");

const db = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@callora.app";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "callora-demo";

function must<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(`${what}: ${result.error?.message ?? "no data"}`);
  }
  return result.data as NonNullable<T>;
}

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureDemoUser(): Promise<string> {
  const existing = await findUserId(DEMO_EMAIL);
  if (existing) return existing;
  const { data, error } = await db.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Owner", locale: "en" },
  });
  if (error) throw error;
  return data.user.id;
}

async function seedBusiness(seed: SeedBusiness, demoUserId: string) {
  await db.from("businesses").delete().eq("slug", seed.slug).eq("is_demo", true);

  const business = must(
    await db
      .from("businesses")
      .insert({
        slug: seed.slug,
        name: seed.name,
        category: seed.category,
        description: seed.description,
        timezone: seed.timezone,
        currency: seed.currency,
        phone: seed.phone,
        email: seed.email,
        address: seed.address,
        maps_url: seed.mapsUrl,
        status: "active",
        plan: "growth",
        trial_ends_at: null,
        is_demo: true,
      })
      .select("id")
      .single(),
    `business ${seed.slug}`,
  );
  const businessId = business.id;
  const tz = seed.timezone;
  const today = toLocalDate(new Date(), tz);
  const at = (dayOffset: number, time: string) => localToInstant(addDays(today, dayOffset), parseClock(time), tz);

  must(
    await db
      .from("assistant_settings")
      .insert({
        business_id: businessId,
        assistant_name: seed.assistant.name,
        tone: seed.assistant.tone,
        languages: seed.assistant.languages,
        greeting: seed.assistant.greeting,
        instructions: seed.assistant.instructions,
      })
      .select("business_id"),
    "assistant settings",
  );
  must(
    await db
      .from("booking_settings")
      .insert({
        business_id: businessId,
        slot_interval_min: seed.booking.slotIntervalMin,
        min_notice_min: seed.booking.minNoticeMin,
        max_advance_days: seed.booking.maxAdvanceDays,
        buffer_min: seed.booking.bufferMin,
        cancellation_notice_hours: seed.booking.cancellationNoticeHours,
      })
      .select("business_id"),
    "booking settings",
  );
  must(
    await db
      .from("business_members")
      .insert({ business_id: businessId, user_id: demoUserId, role: "viewer" })
      .select("user_id"),
    "demo membership",
  );

  must(
    await db
      .from("working_hours")
      .insert(
        Object.entries(seed.hours).flatMap(([weekday, shifts]) =>
          shifts.map(([opens, closes]) => ({ business_id: businessId, weekday: Number(weekday), opens_at: opens, closes_at: closes })),
        ),
      )
      .select("id"),
    "working hours",
  );

  const staffIds = new Map<string, string>();
  for (const [i, member] of seed.staff.entries()) {
    const row = must(
      await db
        .from("staff")
        .insert({ business_id: businessId, name: member.name, title: member.title, color: member.color, sort_order: i })
        .select("id")
        .single(),
      `staff ${member.key}`,
    );
    staffIds.set(member.key, row.id);
    if (member.hours) {
      must(
        await db
          .from("staff_hours")
          .insert(
            Object.entries(member.hours).flatMap(([weekday, shifts]) =>
              shifts.map(([start, end]) => ({
                business_id: businessId,
                staff_id: row.id,
                weekday: Number(weekday),
                starts_at: start,
                ends_at: end,
              })),
            ),
          )
          .select("id"),
        `staff hours ${member.key}`,
      );
    }
  }

  const services = new Map<string, { id: string; durationMin: number; price: number | null }>();
  for (const [i, service] of seed.services.entries()) {
    const row = must(
      await db
        .from("services")
        .insert({
          business_id: businessId,
          name: service.name,
          description: service.description ?? {},
          duration_min: service.durationMin,
          price: service.price,
          price_is_from: service.priceIsFrom ?? false,
          sort_order: i,
        })
        .select("id")
        .single(),
      `service ${service.key}`,
    );
    services.set(service.key, { id: row.id, durationMin: service.durationMin, price: service.price });
    if (service.staff.length > 0) {
      must(
        await db
          .from("staff_services")
          .insert(service.staff.map((key) => ({ business_id: businessId, staff_id: staffIds.get(key)!, service_id: row.id })))
          .select("service_id"),
        `staff for ${service.key}`,
      );
    }
  }

  if (seed.faqs.length > 0) {
    must(
      await db
        .from("faqs")
        .insert(seed.faqs.map((f, i) => ({ business_id: businessId, question: f.q, answer: f.a, sort_order: i })))
        .select("id"),
      "faqs",
    );
  }

  const customers = new Map<string, string>();
  for (const c of seed.customers) {
    const row = must(
      await db
        .from("customers")
        .insert({
          business_id: businessId,
          name: c.name,
          phone: c.phone,
          language: c.language,
          source: c.source,
          notes: c.notes ?? "",
        })
        .select("id")
        .single(),
      `customer ${c.key}`,
    );
    customers.set(c.key, row.id);
  }

  for (const a of seed.appointments) {
    const service = services.get(a.service)!;
    const start = at(a.dayOffset, a.time);
    const end = new Date(start.getTime() + service.durationMin * 60_000);
    must(
      await db
        .from("appointments")
        .insert({
          business_id: businessId,
          customer_id: customers.get(a.customer)!,
          service_id: service.id,
          staff_id: staffIds.get(a.staff)!,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          blocked_until: new Date(end.getTime() + seed.booking.bufferMin * 60_000).toISOString(),
          status: a.status,
          source: a.source,
          price: service.price,
          cancelled_at: a.status === "cancelled" ? start.toISOString() : null,
        })
        .select("id"),
      `appointment ${a.customer}/${a.service}`,
    );
  }

  for (const conv of seed.conversations) {
    const customerId = customers.get(conv.customer)!;
    const startedAt = new Date(Date.now() - conv.daysAgo * 86_400_000 - 2 * 3_600_000);
    const conversation = must(
      await db
        .from("conversations")
        .insert({
          business_id: businessId,
          customer_id: customerId,
          channel: conv.channel,
          external_id: conv.channel === "whatsapp" ? seed.customers.find((c) => c.key === conv.customer)!.phone.slice(1) : crypto.randomUUID(),
          mode: conv.mode ?? "ai",
          needs_attention: conv.needsAttention ?? false,
          handover_reason: conv.handoverReason ?? null,
          language: conv.language,
          created_at: startedAt.toISOString(),
        })
        .select("id")
        .single(),
      "conversation",
    );
    for (const m of conv.messages) {
      must(
        await db
          .from("messages")
          .insert({
            business_id: businessId,
            conversation_id: conversation.id,
            role: m.role,
            content: m.text,
            actions: (m.actions ?? []).map((a) => ({ ...a, input: {}, output: {} })),
            delivery_status: m.role === "customer" ? null : "read",
            created_at: new Date(startedAt.getTime() + m.minutesAfter * 60_000).toISOString(),
          })
          .select("id"),
        "message",
      );
    }
  }

  console.log(`  ✓ ${seed.name} (${seed.slug})`);
}

async function main() {
  console.log("Seeding demo data…");
  const demoUserId = await ensureDemoUser();
  for (const seed of DEMO_BUSINESSES) await seedBusiness(seed, demoUserId);

  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;
  if (adminEmail) {
    const adminId = await findUserId(adminEmail);
    if (adminId) {
      await db.from("platform_admins").upsert({ user_id: adminId });
      console.log(`  ✓ ${adminEmail} is a platform admin`);
    } else {
      console.log(`  ! ${adminEmail} has not signed up yet — sign up, then re-run the seed to grant admin access`);
    }
  }
  console.log(`Demo login: ${DEMO_EMAIL}`);
}

await main();
