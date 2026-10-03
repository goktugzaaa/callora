import type { Locale } from "@/i18n/locales";
import type { ActionLike } from "./action-summary";
import { DEFAULT_DEMO_BUSINESS } from "./demo-businesses";

// The conversation that plays in the hero before the visitor takes over.
// It mirrors a real run of the assistant against the seeded demo business:
// same services, prices, staff and tool calls. Nothing here is sent to the AI.

export type ScriptLine =
  | { role: "customer"; text: string }
  | { role: "assistant"; text: string; actions?: ActionLike[] };

export type IntroScript = { business: string; lines: ScriptLine[] };

const ok = (tool: string, output: unknown = {}, input: unknown = {}): ActionLike => ({ tool, ok: true, input, output });

const slots = (day: string, ...times: string[]) => ({ date: "", weekday: day, times: times.map((time) => ({ time })) });

const services = (count: number) => ({ services: new Array(count).fill(0) });

export const INTRO_SCRIPTS: Record<Locale, IntroScript> = {
  en: {
    business: DEFAULT_DEMO_BUSINESS.en,
    lines: [
      { role: "customer", text: "Hi! Can I get a blow-dry tomorrow evening?" },
      {
        role: "assistant",
        text: "Hi! A blow-dry & styling is 45 minutes and £35. Tomorrow evening Sophie is free at *5:00 PM*, *5:30 PM* or *6:15 PM*. Which suits you?",
        actions: [ok("getServices", services(11)), ok("checkAvailability", slots("Tomorrow", "17:00", "17:30", "18:15"))],
      },
      { role: "customer", text: "5:30 please. It's Emily" },
      { role: "assistant", text: "Perfect, Emily. Blow-dry & styling tomorrow at *5:30 PM* with Sophie. Shall I confirm it?" },
      { role: "customer", text: "Yes please" },
      {
        role: "assistant",
        text: "Booked ✅ See you tomorrow at 5:30 PM. Your reference is *2B81D0E4*.",
        actions: [ok("createBooking", { booking: { reference: "2B81D0E4", start: "Tomorrow 17:30" } })],
      },
    ],
  },
  tr: {
    business: DEFAULT_DEMO_BUSINESS.tr,
    lines: [
      { role: "customer", text: "Merhaba, yarın diş temizliği için yer var mı?" },
      {
        role: "assistant",
        text: "Merhaba! Diş taşı temizliği 45 dakika ve 1.500 TL. Yarın Dt. Selin Aydın için *10:00*, *11:15* ve *14:30* boş. Hangisi uygun?",
        actions: [ok("getServices", services(5)), ok("checkAvailability", slots("Yarın", "10:00", "11:15", "14:30"))],
      },
      { role: "customer", text: "11:15 olsun, adım Ayşe" },
      { role: "assistant", text: "Teşekkürler Ayşe Hanım. Yarın *11:15*'te Dt. Selin Aydın ile diş taşı temizliği. Onaylıyor musunuz?" },
      { role: "customer", text: "Evet" },
      {
        role: "assistant",
        text: "Randevunuz oluşturuldu ✅ Randevu numaranız *4C19A7E2*. Görüşmek üzere!",
        actions: [ok("createBooking", { booking: { reference: "4C19A7E2", start: "Yarın 11:15" } })],
      },
    ],
  },
  ar: {
    business: DEFAULT_DEMO_BUSINESS.ar,
    lines: [
      { role: "customer", text: "مرحبا، ابي احجز مساج سويدي باجر العصر" },
      {
        role: "assistant",
        text: "حياك الله! المساج السويدي 60 دقيقة بـ 350 درهم. باجر العصر عندنا الساعة *4:00* أو *5:30* مع عائشة. أي وقت يناسبك؟",
        actions: [ok("getServices", services(5)), ok("checkAvailability", slots("باجر", "16:00", "17:30"))],
      },
      { role: "customer", text: "5:30 لو سمحت، اسمي فاطمة" },
      { role: "assistant", text: "تمام يا فاطمة: مساج سويدي باجر الساعة *5:30 العصر* مع عائشة. أأكد الحجز؟" },
      { role: "customer", text: "اي أكيد" },
      {
        role: "assistant",
        text: "تم الحجز ✅ ننتظرك باجر الساعة 5:30. رقم الحجز *9A2C61F0*.",
        actions: [ok("createBooking", { booking: { reference: "9A2C61F0", start: "باجر 17:30" } })],
      },
    ],
  },
};
