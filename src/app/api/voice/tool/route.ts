import type { NextRequest } from "next/server";
import { z } from "zod";
import { withinRateLimits } from "@/lib/rate-limit";
import { demoSessionSchema, loadDemoBusiness, voiceDemoConfigured } from "@/lib/voice/demo-session";
import { isVoiceToolName, runVoiceTool, voiceContext } from "@/lib/voice/voice";

// Tool calls from the website voice demo. The browser only names the tool and
// passes the model's arguments; which business and which caller it acts for is
// resolved here from the call session, never taken from the client.

export const maxDuration = 30;

const bodySchema = demoSessionSchema.extend({
  toolCallId: z.string().max(200),
  toolName: z.string().max(60),
  args: z.unknown(),
});

export async function POST(request: NextRequest) {
  if (!voiceDemoConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const { business, session, toolCallId, toolName, args } = parsed.data;
  if (!isVoiceToolName(toolName)) return Response.json({ error: "unknown_tool" }, { status: 400 });

  const allowed = await withinRateLimits([{ key: `voice:tools:${session}`, limit: 60, windowSeconds: 3600 }]);
  if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  const profile = await loadDemoBusiness(business);
  if (!profile) return Response.json({ error: "unknown_business" }, { status: 404 });

  const ctx = await voiceContext(profile.id, session);
  const output = await runVoiceTool(ctx, toolName, args, toolCallId);
  return Response.json(output ?? null);
}
