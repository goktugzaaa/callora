// The demo tenants shown in the website simulator (seeded by scripts/seed.ts).

export type DemoBusiness = {
  slug: string;
  name: string;
  city: string;
  initials: string;
  avatarClass: string;
  suggestions: string[];
};

export const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    slug: "lumiere-amman",
    name: "Lumière Beauty Lounge",
    city: "Amman",
    initials: "LB",
    avatarClass: "bg-[oklch(0.62_0.09_45)] text-white",
    suggestions: ["Can I book a blow-dry tomorrow evening?", "قديش سعر البالياج؟", "Do you have parking?"],
  },
  {
    slug: "serenity-dubai",
    name: "Serenity Spa & Wellness",
    city: "Dubai",
    initials: "SS",
    avatarClass: "bg-[oklch(0.5_0.07_190)] text-white",
    suggestions: ["Hot stone massage this Friday?", "هل عندكم حمام مغربي؟", "What should I bring?"],
  },
  {
    slug: "nova-istanbul",
    name: "Nova Diş Kliniği",
    city: "İstanbul",
    initials: "ND",
    avatarClass: "bg-[oklch(0.5_0.08_260)] text-white",
    suggestions: ["Yarın diş temizliği için yer var mı?", "How much is an implant consultation?", "Otopark var mı?"],
  },
];
