import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleInboundMessage } from "@/lib/receptionist/respond";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Public website demo: talks to a demo business through exactly the same
// pipeline as WhatsApp (channel "web"). Rate limited to keep costs bounded.

export const maxDuration = 60;

const bodySchema = z.object({
  business: z.string().regex(/^[a-z0-9-]{3,60}$/),
  sessionId: z.guid(),
  text: z.string().trim().min(1).max(1000),
});

const LIMITS = [
  { key: (ip: string) => `demo:ip:${ip}`, limit: 60, windowSeconds: 3600 },
  { key: () => "demo:global", limit: 3000, windowSeconds: 86_400 },
];

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const { business, sessionId, text } = parsed.data;

  const db = createAdminClient();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  for (const rule of [...LIMITS, { key: () => `demo:session:${sessionId}`, limit: 40, windowSeconds: 3600 }]) {
    const { data: allowed, error } = await db.rpc("hit_rate_limit", {
      p_key: rule.key(ip),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) throw error;
    if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const { data: demo } = await db.from("businesses").select("id").eq("slug", business).eq("is_demo", true).maybeSingle();
  if (!demo) return Response.json({ error: "unknown_business" }, { status: 404 });

  const result = await handleInboundMessage({ businessId: demo.id, channel: "web", externalUserId: sessionId, text });

  if (result.status === "replied") {
    return Response.json({ status: "replied", reply: result.reply });
  }
  return Response.json({ status: "skipped", reason: result.reason });
}
