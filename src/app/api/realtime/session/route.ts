import { NextResponse } from "next/server";
import { demoAgentInstructions } from "@/lib/agent-prompt";

export const dynamic = "force-dynamic";

// Tarayıcı demosu için OpenAI Realtime ephemeral anahtarı üretir.
// OPENAI_API_KEY yoksa { mode: "sim" } döner ve arayüz senaryolu demoya düşer.
// Veritabanı kullanmaz — Vercel'de yalnız API anahtarıyla çalışır.
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ mode: "sim" });
  }

  try {
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
          instructions: demoAgentInstructions(),
          audio: {
            output: { voice: "coral" },
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
  } catch (err) {
    console.error("Realtime session hatası:", err);
    return NextResponse.json({ mode: "sim" });
  }
}
