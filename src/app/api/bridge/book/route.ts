import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  businessId: z.string(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(7),
  serviceName: z.string(),
  startsAtISO: z.string(),
  notes: z.string().default(""),
});

// Köprüdeki book_appointment aracı bu ucu çağırır: randevu oluşturur.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-bridge-secret");
  if (!process.env.BRIDGE_SHARED_SECRET || secret !== process.env.BRIDGE_SHARED_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const { businessId, customerName, customerPhone, serviceName, startsAtISO, notes } = parsed.data;

  const start = new Date(startsAtISO);
  if (isNaN(start.getTime())) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  }

  const service = await db.service.findFirst({
    where: { businessId, name: { contains: serviceName } },
  });
  const durationMin = service?.durationMin ?? 30;

  const appt = await db.appointment.create({
    data: {
      businessId,
      serviceId: service?.id ?? null,
      customerName,
      customerPhone,
      startsAt: start,
      endsAt: new Date(start.getTime() + durationMin * 60000),
      source: "telefon",
      notes,
    },
  });

  return NextResponse.json({ ok: true, appointmentId: appt.id });
}
