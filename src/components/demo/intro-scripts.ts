import type { Locale } from "@/i18n/locales";
import type { ActionLike } from "./action-summary";

// The conversation that plays in the hero before the visitor takes over.
// It mirrors a real run of the assistant against the seeded demo business:
// same services, prices, staff and tool calls. Nothing here is sent to the AI.

export type ScriptLine =
  | { role: "customer"; text: string }
  | { role: "assistant"; text: string; actions?: ActionLike[] };

export type IntroScript = { business: string; lines: ScriptLine[] };

const ok = (tool: string, output: unknown = {}, input: unknown = {}): ActionLike => ({ tool, ok: true, input, output });

const slots = (day: string, ...times: string[]) => ({ date: "", weekday: day, times: times.map((time) => ({ time })) });

export const INTRO_SCRIPTS: Record<Locale, IntroScript> = {
  en: {
    business: "lumiere-amman",
    lines: [
      { role: "customer", text: "Hi! Can I get a blow-dry tomorrow evening?" },
      {
        role: "assistant",
        text: "Hi! A blow-dry & styling is 45 min and 15 JOD. Tomorrow evening Rania is free at *6:00 PM*, *6:30 PM* or *7:15 PM*. Which suits you?",
        actions: [ok("getServices", { services: new Array(11).fill(0) }), ok("checkAvailability", slots("Tomorrow", "18:00", "18:30", "19:15"))],
      },
      { role: "customer", text: "6:30 please. It's Sara" },
      { role: "assistant", text: "Perfect, Sara. Blow-dry & styling tomorrow at *6:30 PM* with Rania. Shall I confirm it?" },
      { role: "customer", text: "Yes please" },
      {
        role: "assistant",
        text: "Booked ✅ See you tomorrow at 6:30 PM. Your reference is *2B81D0E4*.",
        actions: [ok("createBooking", { booking: { reference: "2B81D0E4", start: "Tomorrow 18:30" } })],
      },
    ],
  },
  ar: {
    business: "lumiere-amman",
    lines: [
      { role: "customer", text: "مرحبا، بدي سشوار بكرا المسا إذا في مجال" },
      {
        role: "assistant",
        text: "أهلين! السشوار والتصفيف 45 دقيقة بـ 15 دينار. بكرا المسا رانيا فاضية الساعة *6:00* أو *6:30* أو *7:15*. شو بناسبك؟",
        actions: [ok("getServices", { services: new Array(11).fill(0) }), ok("checkAvailability", slots("بكرا", "18:00", "18:30", "19:15"))],
      },
      { role: "customer", text: "6:30 لو سمحتي، اسمي سارة" },
      { role: "assistant", text: "تمام يا سارة: سشوار وتصفيف بكرا الساعة *6:30 مساءً* مع رانيا. أأكد الحجز؟" },
      { role: "customer", text: "اي أكيد" },
      {
        role: "assistant",
        text: "تم الحجز ✅ نشوفك بكرا الساعة 6:30 مساءً. رقم الحجز *2B81D0E4*.",
        actions: [ok("createBooking", { booking: { reference: "2B81D0E4", start: "بكرا 18:30" } })],
      },
    ],
  },
  tr: {
    business: "nova-istanbul",
    lines: [
      { role: "customer", text: "Merhaba, yarın diş temizliği için yer var mı?" },
      {
        role: "assistant",
        text: "Merhaba! Diş taşı temizliği 45 dakika ve 1.500 TL. Yarın Dt. Selin Aydın için *10:00*, *11:15* ve *14:30* boş. Hangisi uygun?",
        actions: [
          ok("getServices", { services: new Array(5).fill(0) }),
          ok("checkAvailability", slots("Yarın", "10:00", "11:15", "14:30")),
        ],
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
};
