import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAgentInstructions } from "@/lib/agent-prompt";

// Tarayıcı demosu için OpenAI Realtime ephemeral anahtarı üretir.
// OPENAI_API_KEY yoksa { mode: "sim" } döner ve arayüz senaryolu demoya düşer.
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ mode: "sim" });
  }

  // Demo işletmesi: seed'deki ilk işletme. Canlıda oturumdaki işletme kullanılabilir.
  const business = await db.business.findFirst({
    include: { agent: true, services: true },
  });

  const instructions = business?.agent
    ? buildAgentInstructions({
        businessName: business.name,
        sector: business.sector,
        greeting: business.agent.greeting,
        extraNotes: business.agent.extraNotes,
        workingHours: business.agent.workingHours,
        services: business.services,
      })
    : "Sen bir işletmenin Türkçe konuşan telefon resepsiyonistisin. Nazik ol, randevu taleplerini topla.";

  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: "gpt-realtime",
        instructions,
        audio: {
          output: { voice: business?.agent?.voice ?? "coral" },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Realtime client_secrets hatası:", detail);
    return NextResponse.json({ mode: "sim" });
  }

  const data = await res.json();
  return NextResponse.json({ mode: "live", clientSecret: data.value });
}
