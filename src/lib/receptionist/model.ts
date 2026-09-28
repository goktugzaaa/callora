import "server-only";
import { createGoogle, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/**
 * The model behind the assistant, chosen with AI_MODEL ("provider/model").
 *
 * - google/* with GEMINI_API_KEY          -> Gemini API directly
 * - anything else (openai/gpt-..., etc.)   -> Vercel AI Gateway
 *   (AI_GATEWAY_API_KEY locally; automatic OIDC auth on Vercel)
 *
 * Switching to OpenAI is a one-line change: AI_MODEL=openai/gpt-5.4-mini
 */
export const DEFAULT_MODEL = "google/gemini-3.8-flash";

export function receptionistModel(): { id: string; model: LanguageModel; providerOptions?: Record<string, GoogleLanguageModelOptions> } {
  const id = process.env.AI_MODEL || DEFAULT_MODEL;
  const [provider, ...rest] = id.split("/");

  if (provider === "google" && process.env.GEMINI_API_KEY && !process.env.AI_GATEWAY_API_KEY) {
    const google = createGoogle({ apiKey: process.env.GEMINI_API_KEY });
    return {
      id,
      model: google(rest.join("/")),
      // Receptionist replies need speed more than deep reasoning.
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
    };
  }

  return { id, model: id };
}
