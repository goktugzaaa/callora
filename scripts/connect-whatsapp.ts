/**
 * Connects a WhatsApp Business number to a business (until the dashboard's
 * "Connect WhatsApp" flow exists).
 *
 *   npm run whatsapp:connect -- <business-slug> <phone-number-id> <waba-id> <access-token>
 *
 * Values come from Meta: developers.facebook.com → your app → WhatsApp → API Setup.
 * The access token is stored AES-256-GCM encrypted (ENCRYPTION_KEY).
 */
import { createCipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

const [slug, phoneNumberId, wabaId, accessToken] = process.argv.slice(2);
if (!slug || !phoneNumberId || !wabaId || !accessToken) {
  console.error("Usage: npm run whatsapp:connect -- <business-slug> <phone-number-id> <waba-id> <access-token>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const key = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");
if (!url || !secret) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
if (key.length !== 32) throw new Error("Set ENCRYPTION_KEY (32 bytes, base64) in .env.local");

// Same format as src/lib/crypto.ts (v1:iv:tag:data)
function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

const db = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: business, error } = await db.from("businesses").select("id, name").eq("slug", slug).maybeSingle();
if (error) throw error;
if (!business) throw new Error(`No business with slug "${slug}"`);

// Ask Meta for the number's display name, which also proves the token works.
const graph = process.env.WHATSAPP_GRAPH_VERSION || "v26.0";
const res = await fetch(`https://graph.facebook.com/${graph}/${phoneNumberId}?fields=display_phone_number,verified_name`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const info = (await res.json()) as { display_phone_number?: string; verified_name?: string; error?: { message?: string } };
if (!res.ok) throw new Error(`Meta rejected the token or phone number id: ${info.error?.message ?? res.status}`);

const account = await db.from("whatsapp_accounts").upsert({
  business_id: business.id,
  phone_number_id: phoneNumberId,
  waba_id: wabaId,
  display_phone_number: info.display_phone_number ?? "",
  verified_name: info.verified_name ?? "",
  status: "connected",
  connected_at: new Date().toISOString(),
});
if (account.error) throw account.error;

const credentials = await db.from("whatsapp_credentials").upsert({
  business_id: business.id,
  access_token_encrypted: encrypt(accessToken),
  updated_at: new Date().toISOString(),
});
if (credentials.error) throw credentials.error;

console.log(`✓ ${info.display_phone_number} (${info.verified_name}) now answers for ${business.name}`);
