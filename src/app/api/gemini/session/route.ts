import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { buildAgentInstructions } from "@/lib/agent-prompt";

// Tarayıcı demosu için Gemini Live ephemeral token üretir.
// GEMINI_API_KEY yoksa { mode: "none" } döner; demo OpenAI'a, o da yoksa örnek görüşmeye düşer.
// Ephemeral token yalnızca v1alpha'da desteklenir ve kısa ömürlüdür; API anahtarı tarayıcıya sızmaz.
export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ mode: "none" });
  }

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
    : "Sen bir işletmenin Türkçe konuşan telefon resepsiyonistisin. Nazik ol, randevu taleplerini topla, yalnızca Türkçe konuş.";

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    if (!token.name) {
      return NextResponse.json({ mode: "none" });
    }

    return NextResponse.json({
      mode: "gemini",
      token: token.name,
      model: "gemini-2.5-flash-native-audio-latest",
      voice: "Aoede",
      instructions,
    });
  } catch (err) {
    console.error("Gemini token hatası:", err);
    return NextResponse.json({ mode: "none" });
  }
}
