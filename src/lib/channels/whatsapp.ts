import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { decryptSecret } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// WhatsApp Business Platform (Cloud API) — the official Meta API.
// Each business connects its own number; incoming webhooks are routed to the
// right tenant by `phone_number_id`.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v26.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type IncomingWhatsAppMessage = {
  phoneNumberId: string;
  from: string; // customer's wa_id, e.g. "962791234567"
  profileName: string | null;
  id: string; // wamid
  text: string;
};

export type WhatsAppStatusUpdate = {
  phoneNumberId: string;
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
};

/** Verifies Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw body with the app secret). */
export function verifySignature(rawBody: string, header: string | null, appSecret: string | undefined): boolean {
  if (!header || !appSecret || !header.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex"));
  const received = Buffer.from(header.slice("sha256=".length));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

type WebhookPayload = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: {
          id: string;
          from: string;
          type: string;
          text?: { body?: string };
          button?: { text?: string };
          interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
        }[];
        statuses?: { id: string; status: string }[];
      };
    }[];
  }[];
};

const NON_TEXT_PLACEHOLDER: Record<string, string> = {
  image: "[The customer sent a photo]",
  audio: "[The customer sent a voice message]",
  video: "[The customer sent a video]",
  document: "[The customer sent a document]",
  sticker: "[The customer sent a sticker]",
  location: "[The customer shared a location]",
  contacts: "[The customer shared a contact]",
};

export function parseWebhook(payload: WebhookPayload): {
  messages: IncomingWhatsAppMessage[];
  statuses: WhatsAppStatusUpdate[];
} {
  const messages: IncomingWhatsAppMessage[] = [];
  const statuses: WhatsAppStatusUpdate[] = [];
  if (payload.object !== "whatsapp_business_account") return { messages, statuses };

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (change.field !== "messages" || !value || !phoneNumberId) continue;

      for (const m of value.messages ?? []) {
        const text =
          m.text?.body ??
          m.button?.text ??
          m.interactive?.button_reply?.title ??
          m.interactive?.list_reply?.title ??
          NON_TEXT_PLACEHOLDER[m.type] ??
          "[Unsupported message]";
        const contact = value.contacts?.find((c) => c.wa_id === m.from);
        messages.push({ phoneNumberId, from: m.from, profileName: contact?.profile?.name ?? null, id: m.id, text });
      }
      for (const s of value.statuses ?? []) {
        if (s.status === "sent" || s.status === "delivered" || s.status === "read" || s.status === "failed") {
          statuses.push({ phoneNumberId, messageId: s.id, status: s.status });
        }
      }
    }
  }
  return { messages, statuses };
}

export type WhatsAppConnection = { businessId: string; phoneNumberId: string; accessToken: string };

export async function connectionForPhoneNumber(phoneNumberId: string): Promise<WhatsAppConnection | null> {
  const { data, error } = await createAdminClient()
    .from("whatsapp_accounts")
    .select("business_id, phone_number_id, status, whatsapp_credentials(access_token_encrypted)")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();
  if (error) throw error;
  const encrypted = data?.whatsapp_credentials?.access_token_encrypted;
  if (!data || data.status !== "connected" || !encrypted) return null;
  return { businessId: data.business_id, phoneNumberId: data.phone_number_id, accessToken: decryptSecret(encrypted) };
}

export async function connectionForBusiness(businessId: string): Promise<WhatsAppConnection | null> {
  const { data, error } = await createAdminClient()
    .from("whatsapp_accounts")
    .select("phone_number_id")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  return data ? connectionForPhoneNumber(data.phone_number_id) : null;
}

async function graph<T>(connection: WhatsAppConnection, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${GRAPH_URL}/${connection.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  const json = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(`WhatsApp API ${response.status}: ${json.error?.message ?? "unknown error"}`);
  return json;
}

/** Sends a free-form text reply (allowed within 24 h of the customer's last message). */
export async function sendText(connection: WhatsAppConnection, to: string, text: string): Promise<string | null> {
  const result = await graph<{ messages?: { id: string }[] }>(connection, {
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text, preview_url: true },
  });
  return result.messages?.[0]?.id ?? null;
}

/** Marks the customer's message as read and shows "typing…" while the assistant works. */
export async function markReadWithTyping(connection: WhatsAppConnection, messageId: string): Promise<void> {
  await graph(connection, { status: "read", message_id: messageId, typing_indicator: { type: "text" } });
}
