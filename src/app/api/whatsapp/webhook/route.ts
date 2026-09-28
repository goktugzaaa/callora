import { after, type NextRequest } from "next/server";
import { deliverToWhatsApp } from "@/lib/channels/deliver";
import {
  connectionForPhoneNumber,
  markReadWithTyping,
  parseWebhook,
  verifySignature,
  type IncomingWhatsAppMessage,
  type WhatsAppStatusUpdate,
} from "@/lib/channels/whatsapp";
import { phoneFromWhatsAppId } from "@/lib/phone";
import { handleInboundMessage } from "@/lib/receptionist/respond";
import { createAdminClient } from "@/lib/supabase/admin";

// One webhook for the whole platform (configured once in the Meta app).
// Messages are routed to the right business by the receiving phone_number_id.

export const maxDuration = 60;

/** Meta's verification handshake when the webhook URL is registered. */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ok =
    params.get("hub.mode") === "subscribe" &&
    !!process.env.WHATSAPP_VERIFY_TOKEN &&
    params.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN;
  return ok ? new Response(params.get("hub.challenge") ?? "", { status: 200 }) : new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: Parameters<typeof parseWebhook>[0];
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const { messages, statuses } = parseWebhook(payload);

  // Acknowledge immediately (Meta retries slow webhooks); do the work afterwards.
  after(async () => {
    await Promise.allSettled([...messages.map(processMessage), ...statuses.map(processStatus)]);
  });
  return new Response("OK", { status: 200 });
}

async function processMessage(message: IncomingWhatsAppMessage) {
  const connection = await connectionForPhoneNumber(message.phoneNumberId);
  if (!connection) {
    console.warn(`[whatsapp] no connected business for phone_number_id ${message.phoneNumberId}`);
    return;
  }

  markReadWithTyping(connection, message.id).catch(() => {});

  const result = await handleInboundMessage({
    businessId: connection.businessId,
    channel: "whatsapp",
    externalUserId: message.from,
    externalMessageId: message.id,
    text: message.text,
    phone: phoneFromWhatsAppId(message.from),
    profileName: message.profileName,
  });

  if (result.status === "replied") {
    await deliverToWhatsApp(
      {
        businessId: connection.businessId,
        conversationId: result.conversationId,
        messageId: result.reply.id,
        text: result.reply.content,
      },
      connection,
    );
  }
}

// Webhooks can arrive out of order; a status may only move forward.
const PREVIOUS_STATUSES = {
  sent: ["pending"],
  delivered: ["pending", "sent"],
  read: ["pending", "sent", "delivered"],
  failed: ["pending", "sent", "delivered"],
} as const;

async function processStatus(update: WhatsAppStatusUpdate) {
  const db = createAdminClient();
  const { data: account } = await db
    .from("whatsapp_accounts")
    .select("business_id")
    .eq("phone_number_id", update.phoneNumberId)
    .maybeSingle();
  if (!account) return;
  await db
    .from("messages")
    .update({ delivery_status: update.status })
    .eq("business_id", account.business_id)
    .eq("external_id", update.messageId)
    .in("delivery_status", [...PREVIOUS_STATUSES[update.status]]);
}
