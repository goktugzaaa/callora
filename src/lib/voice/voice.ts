import "server-only";
import { createGoogle } from "@ai-sdk/google";
import { experimental_getRealtimeToolDefinitions as getRealtimeToolDefinitions } from "ai";
import type { z } from "zod";
import type { Locale } from "@/i18n/locales";
import type { BusinessProfile } from "@/lib/receptionist/data";
import { buildInstructions } from "@/lib/receptionist/instructions";
import { findOrCreateConversation } from "@/lib/receptionist/respond";
import { receptionistTools, type ReceptionistContext } from "@/lib/receptionist/tools";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { CALL_START_MARKER, VOICE_MODEL } from "./constants";

// Voice channel. The same assistant (instructions + receptionistTools) that
// answers WhatsApp, speaking through Gemini Live. The browser talks to Gemini
// directly with a short-lived token whose setup (instructions, tools, voice)
// is locked on the server; tool calls come back to /api/voice/tool and run here.

const VOICE_NAME = process.env.VOICE_NAME || "Aoede";

const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", ar: "Arabic", tr: "Turkish" };

export function voiceInstructions(profile: BusinessProfile, callerLocale: Locale): string {
  const languages = profile.assistant.languages as Locale[];
  const greetIn = languages.includes(callerLocale) ? callerLocale : (languages[0] ?? "en");
  return `${buildInstructions(profile, "voice")}

# Call flow
The call starts when you receive "${CALL_START_MARKER}". Greet the caller right away in ${LANGUAGE_NAMES[greetIn]}, in one short sentence, then listen. From then on, speak the caller's language.
Before a tool call, say a brief natural filler such as "one moment, let me check".
Keep each answer short enough to say in one breath. Never read out lists; offer two or three options at most.`;
}

export async function createVoiceSetup(profile: BusinessProfile, callerLocale: Locale) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const tools = await getRealtimeToolDefinitions({ tools: receptionistTools });
  const token = await createGoogle({ apiKey }).experimental_realtime.getToken({
    model: VOICE_MODEL,
    // The token may only *start* sessions for 30 s; the setup below is locked in.
    expiresAfterSeconds: 30,
    sessionConfig: {
      instructions: voiceInstructions(profile, callerLocale),
      voice: VOICE_NAME,
      outputModalities: ["audio"],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      tools,
      // Wait for availability and booking results instead of talking over them.
      providerOptions: { google: { defaultToolBehavior: "BLOCKING" } },
    },
  });
  return { ...token, tools };
}

/** The conversation (and anonymous caller) behind one browser call. */
export async function voiceContext(businessId: string, sessionId: string): Promise<ReceptionistContext> {
  const conversation = await findOrCreateConversation(
    { businessId, channel: "voice", externalUserId: sessionId, text: "" },
    null,
  );
  return { businessId, conversationId: conversation.id, customerId: conversation.customer_id, channel: "voice" };
}

export type VoiceToolName = keyof typeof receptionistTools;

export function isVoiceToolName(name: string): name is VoiceToolName {
  return Object.hasOwn(receptionistTools, name);
}

type ToolExecutor = (
  input: unknown,
  options: { toolCallId: string; messages: []; context: ReceptionistContext },
) => Promise<unknown>;

/** Runs one receptionist tool with server-side context, validating the model's arguments first. */
export async function runVoiceTool(ctx: ReceptionistContext, name: VoiceToolName, args: unknown, toolCallId: string) {
  const definition = receptionistTools[name];
  const parsed = (definition.inputSchema as z.ZodType).safeParse(args ?? {});
  if (!parsed.success) {
    return { ok: false, error: "invalid_arguments", message: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  return (definition.execute as unknown as ToolExecutor)(parsed.data, { toolCallId, messages: [], context: ctx });
}

export type TranscriptTurn = {
  role: "customer" | "assistant";
  text: string;
  actions?: { tool: string; ok: boolean; input: Json; output: Json }[];
};

/** Stores the call transcript. Idempotent: the client may send the full transcript again. */
export async function saveVoiceTranscript(ctx: ReceptionistContext, turns: TranscriptTurn[]) {
  const db = createAdminClient();
  const { error: deleteError } = await db
    .from("messages")
    .delete()
    .eq("conversation_id", ctx.conversationId)
    .eq("business_id", ctx.businessId);
  if (deleteError) throw deleteError;

  const startedAt = Date.now() - turns.length * 1000;
  const rows = turns
    .filter((turn) => turn.text.trim() !== "" || (turn.actions?.length ?? 0) > 0)
    .map((turn, i) => ({
      business_id: ctx.businessId,
      conversation_id: ctx.conversationId,
      role: turn.role,
      content: turn.text.trim().slice(0, 4000) || "…",
      actions: (turn.actions ?? []) as unknown as Json,
      created_at: new Date(startedAt + i * 1000).toISOString(),
    }));
  if (rows.length === 0) return;
  const { error } = await db.from("messages").insert(rows);
  if (error) throw error;
}
