import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAgentInstructions } from "@/lib/agent-prompt";

// Köprü (bridge/), çağrı başlarken işletmenin ajan yapılandırmasını buradan çeker.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-bridge-secret");
  if (!process.env.BRIDGE_SHARED_SECRET || secret !== process.env.BRIDGE_SHARED_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId gerekli" }, { status: 400 });

  const business = await db.business.findUnique({
    where: { id: businessId },
    include: { agent: true, services: true },
  });
  if (!business || !business.agent) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({
    voice: business.agent.voice,
    instructions: buildAgentInstructions({
      businessName: business.name,
      sector: business.sector,
      greeting: business.agent.greeting,
      extraNotes: business.agent.extraNotes,
      workingHours: business.agent.workingHours,
      services: business.services,
    }),
    services: business.services.map((s) => ({ id: s.id, name: s.name })),
  });
}
