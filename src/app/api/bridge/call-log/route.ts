import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  businessId: z.string(),
  twilioSid: z.string().nullable().default(null),
  fromNumber: z.string().default(""),
  durationSec: z.number().int().min(0),
  transcript: z.array(z.object({ role: z.string(), text: z.string() })),
  outcome: z.enum(["randevu", "bilgi", "kacirilan", "yonlendirme"]),
  appointmentId: z.string().nullable().default(null),
});

// Köprü, çağrı bitince kaydı buraya yazar.
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

  const { businessId, twilioSid, fromNumber, durationSec, transcript, outcome, appointmentId } =
    parsed.data;

  const call = await db.call.create({
    data: {
      businessId,
      twilioSid,
      fromNumber,
      durationSec,
      transcript: JSON.stringify(transcript),
      outcome,
      appointmentId,
    },
  });

  return NextResponse.json({ ok: true, callId: call.id });
}
