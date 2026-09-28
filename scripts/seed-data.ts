// Demo tenants for the public website demo and the demo dashboard.
// Times are local to each business; dates are relative to "today" at seed time.

export type SeedService = {
  key: string;
  name: { en: string; ar?: string; tr?: string };
  description?: { en: string; ar?: string; tr?: string };
  durationMin: number;
  price: number | null;
  priceIsFrom?: boolean;
  staff: string[]; // staff keys
};

export type SeedStaff = {
  key: string;
  name: string;
  title: string;
  color: string;
  /** weekday -> [start, end]; omit to follow business hours */
  hours?: Record<number, [string, string][]>;
};

export type SeedConversation = {
  customer: string; // customer key
  channel: "whatsapp" | "web";
  daysAgo: number;
  mode?: "ai" | "human";
  needsAttention?: boolean;
  handoverReason?: string;
  language: "en" | "ar" | "tr";
  messages: { role: "customer" | "assistant" | "staff"; text: string; minutesAfter: number; actions?: { tool: string; ok: boolean }[] }[];
};

export type SeedCustomer = {
  key: string;
  name: string;
  phone: string;
  language: "en" | "ar" | "tr";
  source: "whatsapp" | "web" | "manual";
  notes?: string;
};

export type SeedAppointment = {
  customer: string;
  service: string;
  staff: string;
  dayOffset: number; // relative to today (local)
  time: string; // HH:MM local
  status: "confirmed" | "pending" | "completed" | "cancelled" | "no_show";
  source: "whatsapp" | "web" | "manual";
};

export type SeedBusiness = {
  slug: string;
  name: string;
  category: "beauty_salon" | "spa" | "clinic" | "dental" | "barbershop" | "other";
  description: string;
  timezone: string;
  currency: string;
  phone: string;
  email: string;
  address: string;
  mapsUrl: string;
  assistant: {
    name: string;
    tone: "warm" | "professional" | "luxury" | "playful";
    languages: ("en" | "ar" | "tr")[];
    greeting: string;
    instructions: string;
  };
  booking: { slotIntervalMin: number; minNoticeMin: number; maxAdvanceDays: number; bufferMin: number; cancellationNoticeHours: number };
  hours: Record<number, [string, string][]>; // 0 = Sunday
  staff: SeedStaff[];
  services: SeedService[];
  faqs: { q: string; a: string }[];
  customers: SeedCustomer[];
  appointments: SeedAppointment[];
  conversations: SeedConversation[];
};

const SAT_TO_THU = (open: string, close: string): Record<number, [string, string][]> => ({
  0: [[open, close]],
  1: [[open, close]],
  2: [[open, close]],
  3: [[open, close]],
  4: [[open, close]],
  6: [[open, close]],
});

export const DEMO_BUSINESSES: SeedBusiness[] = [
  {
    slug: "lumiere-amman",
    name: "Lumière Beauty Lounge",
    category: "beauty_salon",
    description: "Boutique hair, nails and skin studio in Abdoun, Amman.",
    timezone: "Asia/Amman",
    currency: "JOD",
    phone: "+962791000100",
    email: "hello@lumiere-demo.com",
    address: "14 Cairo Street, Abdoun, Amman",
    mapsUrl: "https://maps.google.com/?q=Abdoun+Amman",
    assistant: {
      name: "Layla",
      tone: "warm",
      languages: ["en", "ar"],
      greeting: "Welcome to Lumière Beauty Lounge! I'm Layla, how can I help you today?",
      instructions:
        "Recommend a free 15-minute consultation before any colour or keratin service. Brides get a trial session included in the bridal package.",
    },
    booking: { slotIntervalMin: 15, minNoticeMin: 60, maxAdvanceDays: 60, bufferMin: 10, cancellationNoticeHours: 4 },
    hours: { ...SAT_TO_THU("10:00", "20:00"), 5: [["14:00", "20:00"]] },
    staff: [
      { key: "rania", name: "Rania", title: "Senior Stylist", color: "#c0845c" },
      { key: "omar", name: "Omar", title: "Colour Specialist", color: "#7c6cf2", hours: { 0: [["12:00", "20:00"]], 1: [["12:00", "20:00"]], 2: [["12:00", "20:00"]], 3: [["12:00", "20:00"]], 4: [["12:00", "20:00"]], 6: [["10:00", "18:00"]] } },
      { key: "dana", name: "Dana", title: "Nail Artist", color: "#e0679a" },
      { key: "hala", name: "Hala", title: "Aesthetician & Makeup Artist", color: "#2f9e8f", hours: { 1: [["10:00", "18:00"]], 2: [["10:00", "18:00"]], 3: [["10:00", "18:00"]], 4: [["10:00", "18:00"]], 5: [["14:00", "20:00"]], 6: [["10:00", "18:00"]] } },
    ],
    services: [
      { key: "cut", name: { en: "Haircut & Blow-dry", ar: "قص وتجفيف الشعر" }, durationMin: 60, price: 25, staff: ["rania"] },
      { key: "blowdry", name: { en: "Blow-dry & Styling", ar: "سشوار وتصفيف" }, durationMin: 45, price: 15, staff: ["rania"] },
      { key: "roots", name: { en: "Root Colour Touch-up", ar: "صبغة الجذور" }, durationMin: 90, price: 45, priceIsFrom: true, staff: ["omar"] },
      { key: "balayage", name: { en: "Balayage", ar: "بالياج" }, description: { en: "Hand-painted highlights including toner and blow-dry.", ar: "هايلايت مرسوم يدويًا مع تونر وسشوار." }, durationMin: 180, price: 120, priceIsFrom: true, staff: ["omar"] },
      { key: "keratin", name: { en: "Keratin Smoothing Treatment", ar: "علاج الكيراتين" }, durationMin: 150, price: 90, priceIsFrom: true, staff: ["omar", "rania"] },
      { key: "mani", name: { en: "Classic Manicure", ar: "مانيكير كلاسيك" }, durationMin: 45, price: 12, staff: ["dana"] },
      { key: "gel", name: { en: "Gel Manicure", ar: "مانيكير جل" }, durationMin: 60, price: 18, staff: ["dana"] },
      { key: "pedi", name: { en: "Spa Pedicure", ar: "باديكير سبا" }, durationMin: 60, price: 18, staff: ["dana"] },
      { key: "facial", name: { en: "Hydrating Facial", ar: "تنظيف بشرة مرطب" }, durationMin: 60, price: 35, staff: ["hala"] },
      { key: "brows", name: { en: "Eyebrow Threading", ar: "تنظيف الحواجب بالخيط" }, durationMin: 15, price: 5, staff: ["hala"] },
      { key: "bridal", name: { en: "Bridal Hair & Makeup", ar: "تسريحة ومكياج عروس" }, description: { en: "Includes a trial session. Priced after a free consultation.", ar: "يشمل جلسة تجريبية. السعر بعد استشارة مجانية." }, durationMin: 180, price: null, staff: ["hala"] },
    ],
    faqs: [
      { q: "Is there parking?", a: "Yes, free valet parking right in front of the salon." },
      { q: "Which payment methods do you accept?", a: "Cash, all major cards and CliQ." },
      { q: "Which products do you use?", a: "Kérastase and L'Oréal Professionnel for hair, OPI for nails." },
      { q: "Do you accept walk-ins?", a: "When a stylist is free, yes — but booking ahead guarantees your time." },
      { q: "Is the salon ladies-only?", a: "Our main floor is ladies-only. Colour services take place in a private studio." },
    ],
    customers: [
      { key: "sara", name: "Sara Haddad", phone: "+962791234501", language: "en", source: "whatsapp" },
      { key: "lina", name: "لينا الخطيب", phone: "+962791234502", language: "ar", source: "whatsapp" },
      { key: "noor", name: "Noor Abbadi", phone: "+962791234503", language: "en", source: "whatsapp", notes: "Prefers Rania. Sensitive scalp — patch test before colour." },
      { key: "reem", name: "ريم العلي", phone: "+962791234504", language: "ar", source: "whatsapp" },
      { key: "maya", name: "Maya Nasser", phone: "+962791234505", language: "en", source: "web" },
      { key: "dima", name: "ديما منصور", phone: "+962791234506", language: "ar", source: "whatsapp", notes: "Wedding on the 14th next month — interested in bridal package." },
      { key: "tala", name: "Tala Qasem", phone: "+962791234507", language: "en", source: "manual" },
      { key: "yara", name: "يارا الزعبي", phone: "+962791234508", language: "ar", source: "whatsapp" },
    ],
    appointments: [
      { customer: "sara", service: "cut", staff: "rania", dayOffset: -6, time: "11:00", status: "completed", source: "whatsapp" },
      { customer: "lina", service: "gel", staff: "dana", dayOffset: -5, time: "16:00", status: "completed", source: "whatsapp" },
      { customer: "tala", service: "facial", staff: "hala", dayOffset: -4, time: "12:00", status: "completed", source: "manual" },
      { customer: "reem", service: "roots", staff: "omar", dayOffset: -3, time: "13:00", status: "completed", source: "whatsapp" },
      { customer: "maya", service: "brows", staff: "hala", dayOffset: -2, time: "17:30", status: "no_show", source: "web" },
      { customer: "noor", service: "blowdry", staff: "rania", dayOffset: -1, time: "18:00", status: "completed", source: "whatsapp" },
      { customer: "sara", service: "mani", staff: "dana", dayOffset: 0, time: "15:00", status: "confirmed", source: "whatsapp" },
      { customer: "yara", service: "keratin", staff: "omar", dayOffset: 1, time: "12:00", status: "confirmed", source: "whatsapp" },
      { customer: "lina", service: "pedi", staff: "dana", dayOffset: 1, time: "17:00", status: "confirmed", source: "whatsapp" },
      { customer: "noor", service: "balayage", staff: "omar", dayOffset: 3, time: "13:00", status: "confirmed", source: "whatsapp" },
      { customer: "maya", service: "facial", staff: "hala", dayOffset: 4, time: "11:00", status: "pending", source: "web" },
      { customer: "reem", service: "cut", staff: "rania", dayOffset: 6, time: "16:30", status: "confirmed", source: "whatsapp" },
    ],
    conversations: [
      {
        customer: "yara",
        channel: "whatsapp",
        daysAgo: 1,
        language: "ar",
        messages: [
          { role: "customer", text: "مرحبا، بدي احجز كيراتين بكرا اذا في مجال", minutesAfter: 0 },
          { role: "assistant", text: "أهلًا يارا! يسعدني أساعدك 🌸 علاج الكيراتين يستغرق حوالي ساعتين ونص، والسعر يبدأ من 90 دينار. بكرا عندنا متاح الساعة 12:00 ظهرًا أو 2:30 عصرًا مع عمر. أي وقت يناسبك؟", minutesAfter: 1, actions: [{ tool: "getServices", ok: true }, { tool: "checkAvailability", ok: true }] },
          { role: "customer", text: "الساعة 12 تمام", minutesAfter: 3 },
          { role: "assistant", text: "تمام! للتأكيد: علاج الكيراتين بكرا الساعة *12:00 ظهرًا* مع عمر. أأكد الحجز؟", minutesAfter: 3 },
          { role: "customer", text: "اي اكيد", minutesAfter: 4 },
          { role: "assistant", text: "تم تأكيد حجزك ✅ رقم الحجز: *7F3A91C2*. نشوفك بكرا!", minutesAfter: 4, actions: [{ tool: "createBooking", ok: true }] },
        ],
      },
      {
        customer: "dima",
        channel: "whatsapp",
        daysAgo: 0,
        language: "ar",
        mode: "human",
        needsAttention: true,
        handoverReason: "Bride asking for a custom package price for 6 bridesmaids.",
        messages: [
          { role: "customer", text: "مرحبا، عرسي الشهر الجاي وبدي باكج للعروس و٦ وصيفات. قديش السعر؟", minutesAfter: 0 },
          { role: "assistant", text: "ألف مبروك ديما! 💍 باكج العروس يشمل التسريحة والمكياج مع جلسة تجريبية، والسعر يُحدد بعد استشارة مجانية. بالنسبة للوصيفات، رح أحوّلك لفريقنا ليعطوكِ عرض خاص يناسبك.", minutesAfter: 1, actions: [{ tool: "getServices", ok: true }, { tool: "createLead", ok: true }, { tool: "requestHumanHandover", ok: true }] },
        ],
      },
      {
        customer: "sara",
        channel: "whatsapp",
        daysAgo: 2,
        language: "en",
        messages: [
          { role: "customer", text: "Hi! Can I get a gel manicure this week?", minutesAfter: 0 },
          { role: "assistant", text: "Hi Sara! Of course 💅 A gel manicure is 60 minutes and 18 JOD. Dana has *Wednesday 3:00 PM* or *Thursday 11:00 AM* free. Which works better?", minutesAfter: 1, actions: [{ tool: "getServices", ok: true }, { tool: "checkAvailability", ok: true }] },
          { role: "customer", text: "Actually make it a classic one, same day 3pm", minutesAfter: 5 },
          { role: "assistant", text: "Done! Your classic manicure with Dana is booked for *Wednesday at 3:00 PM*. Reference: *2B81D0E4*. See you then!", minutesAfter: 6, actions: [{ tool: "checkAvailability", ok: true }, { tool: "createBooking", ok: true }] },
        ],
      },
      {
        customer: "maya",
        channel: "web",
        daysAgo: 3,
        language: "en",
        messages: [
          { role: "customer", text: "Do you have parking? And how much is a facial?", minutesAfter: 0 },
          { role: "assistant", text: "Yes — there's free valet parking right in front of the salon. Our Hydrating Facial is 60 minutes and 35 JOD. Would you like me to check a time for you?", minutesAfter: 1, actions: [{ tool: "getBusinessInfo", ok: true }, { tool: "getServices", ok: true }] },
        ],
      },
    ],
  },
  {
    slug: "serenity-dubai",
    name: "Serenity Spa & Wellness",
    category: "spa",
    description: "Day spa in Jumeirah offering massages, hammam rituals and facials.",
    timezone: "Asia/Dubai",
    currency: "AED",
    phone: "+971501000200",
    email: "relax@serenity-demo.com",
    address: "Jumeirah Beach Road, Dubai",
    mapsUrl: "https://maps.google.com/?q=Jumeirah+Dubai",
    assistant: {
      name: "Noor",
      tone: "luxury",
      languages: ["en", "ar"],
      greeting: "Welcome to Serenity Spa & Wellness. I'm Noor — how may I help you unwind today?",
      instructions: "Remind guests to arrive 15 minutes early to enjoy the relaxation lounge.",
    },
    booking: { slotIntervalMin: 30, minNoticeMin: 120, maxAdvanceDays: 90, bufferMin: 15, cancellationNoticeHours: 12 },
    hours: { 0: [["10:00", "22:00"]], 1: [["10:00", "22:00"]], 2: [["10:00", "22:00"]], 3: [["10:00", "22:00"]], 4: [["10:00", "22:00"]], 5: [["10:00", "22:00"]], 6: [["10:00", "22:00"]] },
    staff: [
      { key: "aisha", name: "Aisha", title: "Senior Therapist", color: "#2f9e8f" },
      { key: "maya", name: "Maya", title: "Massage Therapist", color: "#7c6cf2" },
      { key: "grace", name: "Grace", title: "Skin Specialist", color: "#e0679a" },
    ],
    services: [
      { key: "swedish", name: { en: "Swedish Massage", ar: "مساج سويدي" }, durationMin: 60, price: 350, staff: ["aisha", "maya"] },
      { key: "deep", name: { en: "Deep Tissue Massage", ar: "مساج الأنسجة العميقة" }, durationMin: 60, price: 420, staff: ["aisha", "maya"] },
      { key: "stone", name: { en: "Hot Stone Ritual", ar: "طقوس الأحجار الساخنة" }, durationMin: 90, price: 550, staff: ["aisha"] },
      { key: "hammam", name: { en: "Moroccan Hammam", ar: "حمام مغربي" }, durationMin: 75, price: 390, staff: ["aisha", "grace"] },
      { key: "facial", name: { en: "Signature Glow Facial", ar: "فيشل التوهج المميز" }, durationMin: 60, price: 480, staff: ["grace"] },
    ],
    faqs: [
      { q: "Do you have changing rooms and showers?", a: "Yes, private changing suites with showers, robes and slippers." },
      { q: "Is there valet parking?", a: "Complimentary valet parking for all guests." },
    ],
    customers: [
      { key: "fatima", name: "فاطمة الشامسي", phone: "+971501234601", language: "ar", source: "whatsapp" },
      { key: "emma", name: "Emma Clarke", phone: "+971501234602", language: "en", source: "whatsapp" },
    ],
    appointments: [
      { customer: "emma", service: "stone", staff: "aisha", dayOffset: 1, time: "18:00", status: "confirmed", source: "whatsapp" },
      { customer: "fatima", service: "hammam", staff: "grace", dayOffset: 2, time: "11:00", status: "confirmed", source: "whatsapp" },
    ],
    conversations: [],
  },
  {
    slug: "nova-istanbul",
    name: "Nova Diş Kliniği",
    category: "dental",
    description: "Nişantaşı'nda estetik ve genel diş hekimliği kliniği.",
    timezone: "Europe/Istanbul",
    currency: "TRY",
    phone: "+905321000300",
    email: "merhaba@nova-demo.com",
    address: "Teşvikiye Cd. 21, Nişantaşı, İstanbul",
    mapsUrl: "https://maps.google.com/?q=Nisantasi+Istanbul",
    assistant: {
      name: "Elif",
      tone: "professional",
      languages: ["tr", "en"],
      greeting: "Nova Diş Kliniği'ne hoş geldiniz, ben Elif. Size nasıl yardımcı olabilirim?",
      instructions: "Fiyat soran hastalara muayene sonrası kesin fiyat verileceğini hatırlat.",
    },
    booking: { slotIntervalMin: 15, minNoticeMin: 120, maxAdvanceDays: 45, bufferMin: 5, cancellationNoticeHours: 24 },
    hours: {
      1: [["09:00", "12:30"], ["13:30", "18:00"]],
      2: [["09:00", "12:30"], ["13:30", "18:00"]],
      3: [["09:00", "12:30"], ["13:30", "18:00"]],
      4: [["09:00", "12:30"], ["13:30", "18:00"]],
      5: [["09:00", "12:30"], ["13:30", "18:00"]],
      6: [["10:00", "15:00"]],
    },
    staff: [
      { key: "selin", name: "Dt. Selin Aydın", title: "Estetik Diş Hekimi", color: "#7c6cf2" },
      { key: "mert", name: "Dt. Mert Kaya", title: "İmplantolog", color: "#2f9e8f" },
    ],
    services: [
      { key: "exam", name: { tr: "Muayene", en: "Check-up" }, durationMin: 30, price: 800, staff: [] },
      { key: "cleaning", name: { tr: "Diş Taşı Temizliği", en: "Scale & Polish" }, durationMin: 45, price: 1500, staff: [] },
      { key: "filling", name: { tr: "Dolgu", en: "Filling" }, durationMin: 45, price: 2200, priceIsFrom: true, staff: [] },
      { key: "whitening", name: { tr: "Diş Beyazlatma", en: "Teeth Whitening" }, durationMin: 60, price: 6500, staff: ["selin"] },
      { key: "implant", name: { tr: "İmplant Konsültasyonu", en: "Implant Consultation" }, durationMin: 30, price: null, staff: ["mert"] },
    ],
    faqs: [
      { q: "Anlaşmalı sigortanız var mı?", a: "Başlıca özel sağlık sigortalarıyla anlaşmamız var; randevuda poliçenizi getirmeniz yeterli." },
      { q: "Otopark var mı?", a: "Binanın karşısındaki ücretli otoparkı kullanabilirsiniz." },
    ],
    customers: [
      { key: "ayse", name: "Ayşe Demir", phone: "+905321234701", language: "tr", source: "whatsapp" },
      { key: "john", name: "John Miller", phone: "+447700900123", language: "en", source: "web" },
    ],
    appointments: [
      { customer: "ayse", service: "cleaning", staff: "selin", dayOffset: 1, time: "10:00", status: "confirmed", source: "whatsapp" },
      { customer: "john", service: "implant", staff: "mert", dayOffset: 2, time: "14:00", status: "confirmed", source: "web" },
    ],
    conversations: [],
  },
];
