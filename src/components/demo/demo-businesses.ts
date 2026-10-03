// The demo tenants shown in the website simulator (seeded by scripts/seed.ts).

import type { Locale } from "@/i18n/locales";

export type DemoBusiness = {
  slug: string;
  name: string;
  city: string;
  initials: string;
  assistant: string;
  avatarClass: string;
  suggestions: string[];
};

export const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    slug: "lumiere-london",
    name: "Lumière Beauty Lounge",
    city: "London",
    initials: "LB",
    assistant: "Ava",
    avatarClass: "bg-[oklch(0.62_0.09_45)] text-white",
    suggestions: ["Can I book a blow-dry tomorrow evening?", "How much is balayage?", "Is there parking nearby?"],
  },
  {
    slug: "nova-istanbul",
    name: "Nova Diş Kliniği",
    city: "İstanbul",
    initials: "ND",
    assistant: "Elif",
    avatarClass: "bg-[oklch(0.5_0.08_260)] text-white",
    suggestions: ["Yarın diş temizliği için yer var mı?", "How much is an implant consultation?", "Otopark var mı?"],
  },
  {
    slug: "serenity-dubai",
    name: "Serenity Spa & Wellness",
    city: "Dubai",
    initials: "SS",
    assistant: "Noor",
    avatarClass: "bg-[oklch(0.5_0.07_190)] text-white",
    suggestions: ["Hot stone massage this Friday?", "هل عندكم حمام مغربي؟", "What should I bring?"],
  },
];

/** Which demo business opens first for each site language. */
export const DEFAULT_DEMO_BUSINESS: Record<Locale, string> = {
  en: "lumiere-london",
  tr: "nova-istanbul",
  ar: "serenity-dubai",
};
