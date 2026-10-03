import type { NextRequest } from "next/server";
import { z } from "zod";
import { withinRateLimits } from "@/lib/rate-limit";
import type { Json } from "@/lib/supabase/database.types";
import { demoSessionSchema, loadDemoBusiness, voiceDemoConfigured } from "@/lib/voice/demo-session";
import { saveVoiceTranscript, voiceContext } from "@/lib/voice/voice";

// Saves the transcript of a website voice call, so it appears in the inbox
// like any WhatsApp conversation (channel "voice").

const jsonValue: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue)]),
);

const bodySchema = demoSessionSchema.extend({
  turns: z
    .array(
      z.object({
        role: z.enum(["customer", "assistant"]),
        text: z.string().max(4000),
        actions: z
          .array(z.object({ tool: z.string().max(60), ok: z.boolean(), input: jsonValue, output: jsonValue }))
          .max(20)
          .optional(),
      }),
    )
    .max(200),
});

export async function POST(request: NextRequest) {
  if (!voiceDemoConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const { business, session, turns } = parsed.data;

  const allowed = await withinRateLimits([{ key: `voice:transcript:${session}`, limit: 20, windowSeconds: 3600 }]);
  if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  const profile = await loadDemoBusiness(business);
  if (!profile) return Response.json({ error: "unknown_business" }, { status: 404 });

  await saveVoiceTranscript(await voiceContext(profile.id, session), turns);
  return Response.json({ ok: true });
}
