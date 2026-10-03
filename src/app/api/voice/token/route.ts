import type { NextRequest } from "next/server";
import { isLocale } from "@/i18n/locales";
import { clientIp, withinRateLimits } from "@/lib/rate-limit";
import { demoSessionSchema, loadDemoBusiness, voiceDemoConfigured } from "@/lib/voice/demo-session";
import { createVoiceSetup, voiceContext } from "@/lib/voice/voice";

// Setup endpoint for the website voice demo (experimental_useRealtime `api.token`).
// Returns a short-lived Gemini Live token whose instructions and tools are
// locked server-side. Rate limited: every token costs real audio minutes.

export async function POST(request: NextRequest) {
  if (!voiceDemoConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const search = request.nextUrl.searchParams;
  const parsed = demoSessionSchema.safeParse({ business: search.get("business"), session: search.get("session") });
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const { business, session } = parsed.data;
  const locale = search.get("locale");

  const allowed = await withinRateLimits([
    { key: `voice:ip:${clientIp(request)}`, limit: 8, windowSeconds: 3600 },
    { key: `voice:session:${session}`, limit: 3, windowSeconds: 3600 },
    { key: "voice:global", limit: 300, windowSeconds: 86_400 },
  ]);
  if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  const profile = await loadDemoBusiness(business);
  if (!profile) return Response.json({ error: "unknown_business" }, { status: 404 });

  await voiceContext(profile.id, session); // create the call record before audio starts
  const setup = await createVoiceSetup(profile, isLocale(locale) ? locale : "en");
  return Response.json(setup, { headers: { "Cache-Control": "no-store" } });
}
