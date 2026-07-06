import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { demoAgentInstructions } from "@/lib/agent-prompt";

export const dynamic = "force-dynamic";

// Teşhis: anahtarın deploy edilen fonksiyonda görünüp görünmediğini bildirir.
// Değeri sızdırmaz; yalnızca var/yok ve uzunluk. Tarayıcıdan açılabilir (GET).
export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  let tokenOk = false;
  let tokenError: string | null = null;
  if (key) {
    try {
      const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: "v1alpha" } });
      const t = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          httpOptions: { apiVersion: "v1alpha" },
        },
      });
      tokenOk = !!t.name;
    } catch (e) {
      tokenError = e instanceof Error ? e.message : String(e);
    }
  }
  return NextResponse.json({
    keyPresent: !!key,
    keyLength: key ? key.length : 0,
    tokenMintOk: tokenOk,
    tokenError,
  });
}

// Tarayıcı demosu için Gemini Live ephemeral token üretir.
// GEMINI_API_KEY yoksa { mode: "none" } döner; demo OpenAI'a, o da yoksa örnek görüşmeye düşer.
// Veritabanı kullanmaz — Vercel'de yalnız API anahtarıyla çalışır.
// Ephemeral token kısa ömürlüdür ve yalnızca v1alpha'da desteklenir; API anahtarı tarayıcıya sızmaz.
export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ mode: "none" });
  }

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
      instructions: demoAgentInstructions(),
    });
  } catch (err) {
    console.error("Gemini token hatası:", err);
    return NextResponse.json({ mode: "none" });
  }
}
