import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectionForBusiness, sendText, type WhatsAppConnection } from "./whatsapp";

/**
 * Sends a stored outbound message (assistant or staff) to the customer's
 * WhatsApp and records the delivery status on the message row.
 */
export async function deliverToWhatsApp(
  params: { businessId: string; conversationId: string; messageId: string; text: string },
  connection?: WhatsAppConnection | null,
): Promise<boolean> {
  const db = createAdminClient();
  const conn = connection ?? (await connectionForBusiness(params.businessId));
  const { data: conversation } = await db
    .from("conversations")
    .select("external_id, channel")
    .eq("id", params.conversationId)
    .eq("business_id", params.businessId)
    .single();

  if (!conn || conversation?.channel !== "whatsapp") {
    await db.from("messages").update({ delivery_status: "failed" }).eq("id", params.messageId);
    return false;
  }

  try {
    const wamid = await sendText(conn, conversation.external_id, params.text);
    await db.from("messages").update({ delivery_status: "sent", external_id: wamid }).eq("id", params.messageId);
    return true;
  } catch (error) {
    console.error("[whatsapp] send failed", error);
    await db.from("messages").update({ delivery_status: "failed" }).eq("id", params.messageId);
    return false;
  }
}
