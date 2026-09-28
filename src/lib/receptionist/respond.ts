import "server-only";
import { ToolLoopAgent, isStepCount, type ModelMessage } from "ai";
import { isLocale, type Locale } from "@/i18n/locales";
import { detectLanguage } from "@/lib/localized";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, Tables } from "@/lib/supabase/database.types";
import { loadBusinessProfile, type BusinessProfile } from "./data";
import { buildInstructions, type Channel } from "./instructions";
import { receptionistModel } from "./model";
import { receptionistTools, type ReceptionistContext, type ReceptionistTools } from "./tools";

// Channel-agnostic message pipeline. WhatsApp, the website demo and (later)
// voice all call handleInboundMessage(); only delivery differs per channel.

export type InboundMessage = {
  businessId: string;
  channel: Channel;
  /** WhatsApp wa_id, or the web chat session id */
  externalUserId: string;
  text: string;
  /** WhatsApp message id — makes webhook retries idempotent */
  externalMessageId?: string;
  /** E.164, when the channel tells us (WhatsApp) */
  phone?: string | null;
  profileName?: string | null;
};

export type AssistantAction = {
  tool: string;
  ok: boolean;
  input: Json;
  output: Json;
};

export type ReplyMessage = { id: string; content: string; actions: AssistantAction[]; createdAt: string };

export type InboundResult =
  | { status: "replied"; conversationId: string; reply: ReplyMessage }
  | {
      status: "skipped";
      conversationId: string | null;
      reason: "duplicate" | "human_mode" | "ai_disabled" | "business_inactive" | "superseded";
    };

const HISTORY_LIMIT = 40;
const WRITE_TOOLS = new Set(["createBooking", "rescheduleBooking", "cancelBooking", "createLead", "requestHumanHandover"]);

const FALLBACK: Record<Locale, string> = {
  en: "Sorry, I'm having a little trouble right now. A team member will reply to you here shortly.",
  ar: "عذرًا، أواجه مشكلة بسيطة حاليًا. سيرد عليك أحد أعضاء فريقنا هنا قريبًا.",
  tr: "Üzgünüm, şu an küçük bir sorun yaşıyorum. Ekibimizden biri kısa süre içinde buradan size dönecek.",
};

type Conversation = Tables<"conversations">;

function isActive(profile: BusinessProfile): boolean {
  if (profile.is_demo) return true;
  if (profile.status === "suspended") return false;
  return !(profile.status === "trial" && profile.trial_ends_at && new Date(profile.trial_ends_at) < new Date());
}

async function findOrCreateConversation(msg: InboundMessage, language: Locale | null): Promise<Conversation> {
  const db = createAdminClient();
  const existing = await db
    .from("conversations")
    .select("*")
    .eq("business_id", msg.businessId)
    .eq("channel", msg.channel)
    .eq("external_id", msg.externalUserId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  // New conversation: reuse the customer if we know their phone number.
  let customerId: string | null = null;
  if (msg.phone) {
    const { data } = await db
      .from("customers")
      .select("id")
      .eq("business_id", msg.businessId)
      .eq("phone", msg.phone)
      .maybeSingle();
    customerId = data?.id ?? null;
  }
  if (!customerId) {
    const { data, error } = await db
      .from("customers")
      .insert({
        business_id: msg.businessId,
        phone: msg.phone ?? null,
        name: msg.profileName?.slice(0, 120) ?? null,
        source: msg.channel,
        language,
      })
      .select("id")
      .single();
    if (error) throw error;
    customerId = data.id;
  }

  const created = await db
    .from("conversations")
    .insert({
      business_id: msg.businessId,
      customer_id: customerId,
      channel: msg.channel,
      external_id: msg.externalUserId,
      language,
    })
    .select("*")
    .single();
  if (created.error?.code === "23505") return findOrCreateConversation(msg, language); // concurrent first message
  if (created.error) throw created.error;
  return created.data;
}

/** Stored messages -> model messages, merging consecutive turns of the same side. */
function toModelMessages(rows: Pick<Tables<"messages">, "role" | "content">[]): ModelMessage[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const row of rows) {
    if (row.role === "system") continue;
    const role = row.role === "customer" ? "user" : "assistant";
    const content = row.role === "staff" ? `(sent by a team member) ${row.content}` : row.content;
    const last = out.at(-1);
    if (last?.role === role) last.content += `\n${content}`;
    else out.push({ role, content });
  }
  while (out[0]?.role === "assistant") out.shift();
  return out;
}

function truncateJson(value: unknown, maxLength = 4000): Json {
  const text = JSON.stringify(value ?? null);
  if (text.length <= maxLength) return JSON.parse(text) as Json;
  return { truncated: true, preview: text.slice(0, maxLength) };
}

function contextForAllTools(ctx: ReceptionistContext) {
  return Object.fromEntries(Object.keys(receptionistTools).map((name) => [name, ctx])) as {
    [K in keyof ReceptionistTools]: ReceptionistContext;
  };
}

export async function handleInboundMessage(msg: InboundMessage): Promise<InboundResult> {
  const db = createAdminClient();
  const profile = await loadBusinessProfile(msg.businessId);
  if (!profile) throw new Error(`Unknown business ${msg.businessId}`);

  const language = detectLanguage(msg.text);
  const conversation = await findOrCreateConversation(msg, language);
  const replyLanguage: Locale = language ?? (isLocale(conversation.language) ? conversation.language : "en");

  const inserted = await db
    .from("messages")
    .insert({
      business_id: profile.id,
      conversation_id: conversation.id,
      role: "customer",
      content: msg.text,
      external_id: msg.externalMessageId ?? null,
    })
    .select("id")
    .single();
  if (inserted.error?.code === "23505") return { status: "skipped", conversationId: conversation.id, reason: "duplicate" };
  if (inserted.error) throw inserted.error;

  await db
    .from("conversations")
    .update({ status: "open", ...(language ? { language } : {}) })
    .eq("id", conversation.id);

  const skip = !isActive(profile)
    ? "business_inactive"
    : !profile.assistant.enabled
      ? "ai_disabled"
      : conversation.mode === "human"
        ? "human_mode"
        : null;
  if (skip) {
    await db.from("conversations").update({ needs_attention: true }).eq("id", conversation.id);
    return { status: "skipped", conversationId: conversation.id, reason: skip };
  }

  const history = await db
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (history.error) throw history.error;

  const ctx: ReceptionistContext = {
    businessId: profile.id,
    conversationId: conversation.id,
    customerId: conversation.customer_id,
    channel: msg.channel,
  };
  const { id: modelId, model, providerOptions } = receptionistModel();

  let content: string;
  let actions: AssistantAction[] = [];
  try {
    const agent = new ToolLoopAgent({
      model,
      instructions: buildInstructions(profile, msg.channel),
      tools: receptionistTools,
      toolsContext: contextForAllTools(ctx),
      stopWhen: isStepCount(8),
      providerOptions,
    });
    const result = await agent.generate({ messages: toModelMessages(history.data.reverse()) });

    actions = result.steps.flatMap((step) =>
      step.content.flatMap((part): AssistantAction[] => {
        if (part.type === "tool-result") {
          const output = part.output as { ok?: boolean } | undefined;
          return [{ tool: part.toolName, ok: output?.ok !== false, input: truncateJson(part.input), output: truncateJson(part.output) }];
        }
        if (part.type === "tool-error") {
          return [{ tool: part.toolName, ok: false, input: truncateJson(part.input), output: { error: String(part.error) } }];
        }
        return [];
      }),
    );
    content = result.text.trim() || FALLBACK[replyLanguage];

    await db.from("ai_usage").insert({
      business_id: profile.id,
      conversation_id: conversation.id,
      model: modelId,
      input_tokens: result.totalUsage.inputTokens ?? 0,
      output_tokens: result.totalUsage.outputTokens ?? 0,
      tool_calls: actions.length,
    });
  } catch (error) {
    console.error("[receptionist] generation failed", error);
    content = FALLBACK[replyLanguage];
    await db
      .from("conversations")
      .update({ needs_attention: true, handover_reason: "The assistant could not reply (AI error)." })
      .eq("id", conversation.id);
  }

  // If the customer sent another message meanwhile, the newer run answers with
  // full context — unless this run already changed something they must hear about.
  const latest = await db
    .from("messages")
    .select("id")
    .eq("conversation_id", conversation.id)
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const changedSomething = actions.some((a) => a.ok && WRITE_TOOLS.has(a.tool));
  if (latest.data && latest.data.id !== inserted.data.id && !changedSomething) {
    return { status: "skipped", conversationId: conversation.id, reason: "superseded" };
  }

  const reply = await db
    .from("messages")
    .insert({
      business_id: profile.id,
      conversation_id: conversation.id,
      role: "assistant",
      content,
      actions: actions as unknown as Json,
      delivery_status: msg.channel === "whatsapp" ? "pending" : null,
    })
    .select("id, content, created_at")
    .single();
  if (reply.error) throw reply.error;

  return {
    status: "replied",
    conversationId: conversation.id,
    reply: { id: reply.data.id, content: reply.data.content, actions, createdAt: reply.data.created_at },
  };
}
