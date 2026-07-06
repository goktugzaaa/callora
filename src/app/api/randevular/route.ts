import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(7),
  serviceId: z.string().nullable(),
  startsAt: z.string().datetime(),
  notes: z.string().max(500).default(""),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const { customerName, customerPhone, serviceId, startsAt, notes } = parsed.data;
  let durationMin = 30;
  if (serviceId) {
    const service = await db.service.findFirst({
      where: { id: serviceId, businessId: session.businessId },
    });
    if (!service) return NextResponse.json({ error: "Hizmet bulunamadı" }, { status: 404 });
    durationMin = service.durationMin;
  }

  const start = new Date(startsAt);
  const appt = await db.appointment.create({
    data: {
      businessId: session.businessId,
      serviceId,
      customerName,
      customerPhone,
      startsAt: start,
      endsAt: new Date(start.getTime() + durationMin * 60000),
      source: "panel",
      notes,
    },
  });

  return NextResponse.json({ ok: true, id: appt.id });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["onaylandi", "iptal", "tamamlandi"]),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const result = await db.appointment.updateMany({
    where: { id: parsed.data.id, businessId: session.businessId },
    data: { status: parsed.data.status },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
