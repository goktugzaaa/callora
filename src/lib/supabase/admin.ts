import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | undefined;

/**
 * Service-role client. Bypasses row-level security, so it is only used where
 * no user session exists (WhatsApp webhooks, the public demo, the assistant's
 * tools) and every query MUST be scoped by `business_id` explicitly.
 * Composite foreign keys in the schema still prevent cross-tenant references.
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (!client) {
    const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !secret) throw new Error("Supabase server credentials are not configured");
    client = createClient<Database>(SUPABASE_URL, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
