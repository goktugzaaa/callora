import { LOCALES, type Locale } from "@/i18n/locales";
import type { Json } from "@/lib/supabase/database.types";

/** Text stored per language, e.g. a service name: {"en": "Haircut", "ar": "قص شعر"}. */
export type LocalizedText = Partial<Record<Locale, string>>;

export function asLocalized(value: Json | null | undefined): LocalizedText {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: LocalizedText = {};
  for (const locale of LOCALES) {
    const text = (value as Record<string, Json | undefined>)[locale];
    if (typeof text === "string" && text.trim() !== "") out[locale] = text;
  }
  return out;
}

/** The text in `locale`, falling back to English, then any language provided. */
export function pickLocalized(value: Json | LocalizedText | null | undefined, locale: Locale): string {
  const text = asLocalized(value as Json);
  return text[locale] ?? text.en ?? Object.values(text)[0] ?? "";
}

/** Rough language guess for an incoming message (script-based, good enough for routing). */
export function detectLanguage(text: string): Locale | null {
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[ğĞışŞİçÇöÖüÜ]/.test(text)) return "tr";
  if (/[a-zA-Z]{2,}/.test(text)) return "en";
  return null;
}
