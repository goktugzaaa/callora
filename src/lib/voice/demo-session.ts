import "server-only";
import { z } from "zod";
import { loadBusinessProfile, type BusinessProfile } from "@/lib/receptionist/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// The public website voice demo only ever talks to demo businesses.

export const demoSessionSchema = z.object({
  business: z.string().regex(/^[a-z0-9-]{3,60}$/),
  session: z.guid(),
});

export function voiceDemoConfigured(): boolean {
  return (
    isSupabaseConfigured() &&
    Boolean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    Boolean(process.env.GEMINI_API_KEY)
  );
}

export async function loadDemoBusiness(slug: string): Promise<BusinessProfile | null> {
  const { data } = await createAdminClient()
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .eq("is_demo", true)
    .maybeSingle();
  return data ? loadBusinessProfile(data.id) : null;
}
