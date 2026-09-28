// Supabase connection settings. Accepts both the current key names
// (publishable / secret) and the legacy ones (anon / service_role) that the
// Vercel Marketplace integration injects.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL !== "" && SUPABASE_PUBLISHABLE_KEY !== "";
}
