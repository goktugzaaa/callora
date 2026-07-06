import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  greeting: z.string().min(10).max(500),
  voice: z.enum(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"]),
  extraNotes: z.string().max(2000),
  workingHours: z.string(),
  services: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(100),
        durationMin: z.number().int().min(5).max(480),
        priceTry: z.number().int().min(0).nullable(),
      })
    )
    .max(30),
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri: " + parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { greeting, voice, extraNotes, workingHours, services } = parsed.data;

  await db.agentConfig.update({
    where: { businessId: session.businessId },
    data: { greeting, voice, extraNotes, workingHours },
  });

  const keepIds = services.filter((s) => s.id).map((s) => s.id!);
  await db.service.deleteMany({
    where: { businessId: session.businessId, id: { notIn: keepIds } },
  });
  for (const s of services) {
    if (s.id) {
      await db.service.update({
        where: { id: s.id },
        data: { name: s.name, durationMin: s.durationMin, priceTry: s.priceTry },
      });
    } else {
      await db.service.create({
        data: {
          businessId: session.businessId,
          name: s.name,
          durationMin: s.durationMin,
          priceTry: s.priceTry,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
