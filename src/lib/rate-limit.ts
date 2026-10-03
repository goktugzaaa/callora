import "server-only";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitRule = { key: string; limit: number; windowSeconds: number };

/** Fixed-window limits backed by Postgres (works across serverless instances). */
export async function withinRateLimits(rules: RateLimitRule[]): Promise<boolean> {
  const db = createAdminClient();
  for (const rule of rules) {
    const { data: allowed, error } = await db.rpc("hit_rate_limit", {
      p_key: rule.key,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) throw error;
    if (!allowed) return false;
  }
  return true;
}

export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
