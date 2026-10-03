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

export const DEMO_BUSINESSES: SeedBusiness[] = [
  {
    slug: "lumiere-london",
    name: "Lumière Beauty Lounge",
    category: "beauty_salon",
    description: "Boutique hair, nails and skin studio in Marylebone, London.",
    timezone: "Europe/London",
    currency: "GBP",
    phone: "+442079460123",
    email: "hello@lumiere-demo.com",
    address: "21 Marylebone High Street, London W1U",
    mapsUrl: "https://maps.google.com/?q=Marylebone+High+Street+London",
    assistant: {
      name: "Ava",
      tone: "warm",
      languages: ["en", "tr", "ar"],
      greeting: "Welcome to Lumière Beauty Lounge! I'm Ava, how can I help you today?",
      instructions:
        "Recommend a free 15-minute consultation before any colour or keratin service. Brides get a trial session included in the bridal package.",
    },
    booking: { slotIntervalMin: 15, minNoticeMin: 60, maxAdvanceDays: 60, bufferMin: 10, cancellationNoticeHours: 24 },
    hours: {
      1: [["09:00", "19:00"]],
      2: [["09:00", "19:00"]],
      3: [["09:00", "19:00"]],
      4: [["09:00", "21:00"]],
      5: [["09:00", "19:00"]],
      6: [["09:00", "18:00"]],
    },
    staff: [
      { key: "sophie", name: "Sophie", title: "Senior Stylist", color: "#c0845c" },
      { key: "james", name: "James", title: "Colour Specialist", color: "#7c6cf2", hours: { 2: [["11:00", "19:00"]], 3: [["11:00", "19:00"]], 4: [["11:00", "21:00"]], 5: [["11:00", "19:00"]], 6: [["09:00", "17:00"]] } },
      { key: "mia", name: "Mia", title: "Nail Artist", color: "#e0679a" },
      { key: "ella", name: "Ella", title: "Aesthetician & Makeup Artist", color: "#2f9e8f", hours: { 1: [["09:00", "17:00"]], 3: [["09:00", "17:00"]], 4: [["12:00", "21:00"]], 5: [["09:00", "17:00"]], 6: [["09:00", "18:00"]] } },
    ],
    services: [
      { key: "cut", name: { en: "Haircut & Blow-dry", tr: "Saç Kesimi ve Fön", ar: "قص وتجفيف الشعر" }, durationMin: 60, price: 55, staff: ["sophie"] },
      { key: "blowdry", name: { en: "Blow-dry & Styling", tr: "Fön ve Şekillendirme", ar: "سشوار وتصفيف" }, durationMin: 45, price: 35, staff: ["sophie"] },
      { key: "roots", name: { en: "Root Colour Touch-up", tr: "Dip Boya", ar: "صبغة الجذور" }, durationMin: 90, price: 75, priceIsFrom: true, staff: ["james"] },
      { key: "balayage", name: { en: "Balayage", tr: "Balyaj", ar: "بالياج" }, description: { en: "Hand-painted highlights including toner and blow-dry.", tr: "Tonlama ve fön dahil, elde boyanan balyaj.", ar: "هايلايت مرسوم يدويًا مع تونر وسشوار." }, durationMin: 180, price: 180, priceIsFrom: true, staff: ["james"] },
      { key: "keratin", name: { en: "Keratin Smoothing Treatment", tr: "Keratin Bakımı", ar: "علاج الكيراتين" }, durationMin: 150, price: 150, priceIsFrom: true, staff: ["james", "sophie"] },
      { key: "mani", name: { en: "Classic Manicure", tr: "Klasik Manikür", ar: "مانيكير كلاسيك" }, durationMin: 45, price: 25, staff: ["mia"] },
      { key: "gel", name: { en: "Gel Manicure", tr: "Kalıcı Oje Manikür", ar: "مانيكير جل" }, durationMin: 60, price: 35, staff: ["mia"] },
      { key: "pedi", name: { en: "Spa Pedicure", tr: "Spa Pedikür", ar: "باديكير سبا" }, durationMin: 60, price: 40, staff: ["mia"] },
      { key: "facial", name: { en: "Hydrating Facial", tr: "Nemlendirici Cilt Bakımı", ar: "تنظيف بشرة مرطب" }, durationMin: 60, price: 70, staff: ["ella"] },
      { key: "brows", name: { en: "Eyebrow Threading", tr: "İple Kaş Alımı", ar: "تنظيف الحواجب بالخيط" }, durationMin: 15, price: 12, staff: ["ella"] },
      { key: "bridal", name: { en: "Bridal Hair & Makeup", tr: "Gelin Saçı ve Makyajı", ar: "تسريحة ومكياج عروس" }, description: { en: "Includes a trial session. Priced after a free consultation.", tr: "Prova seansı dahil. Fiyat ücretsiz ön görüşmeden sonra belirlenir.", ar: "يشمل جلسة تجريبية. السعر بعد استشارة مجانية." }, durationMin: 180, price: null, staff: ["ella"] },
    ],
    faqs: [
      { q: "Is there parking nearby?", a: "Yes, the Moxon Street car park is a two-minute walk away." },
      { q: "Which payment methods do you accept?", a: "All major cards, Apple Pay, Google Pay and cash." },
      { q: "Which products do you use?", a: "Kérastase and L'Oréal Professionnel for hair, OPI for nails." },
      { q: "Do you accept walk-ins?", a: "When a stylist is free, yes, but booking ahead guarantees your time." },
      { q: "What is your cancellation policy?", a: "Free cancellation up to 24 hours before your appointment." },
    ],
    customers: [
      { key: "emily", name: "Emily Carter", phone: "+447700900101", language: "en", source: "whatsapp" },
      { key: "zeynep", name: "Zeynep Aksoy", phone: "+447700900102", language: "tr", source: "whatsapp" },
      { key: "olivia", name: "Olivia Brown", phone: "+447700900103", language: "en", source: "whatsapp", notes: "Prefers Sophie. Sensitive scalp, patch test before colour." },
      { key: "layla", name: "Layla Haddad", phone: "+447700900104", language: "ar", source: "web" },
      { key: "hannah", name: "Hannah Wilson", phone: "+447700900105", language: "en", source: "web" },
      { key: "charlotte", name: "Charlotte Evans", phone: "+447700900106", language: "en", source: "whatsapp", notes: "Wedding on the 14th next month, interested in the bridal package." },
      { key: "grace", name: "Grace Taylor", phone: "+447700900107", language: "en", source: "manual" },
      { key: "amelia", name: "Amelia Davies", phone: "+447700900108", language: "en", source: "whatsapp" },
    ],
    appointments: [
      { customer: "emily", service: "cut", staff: "sophie", dayOffset: -6, time: "11:00", status: "completed", source: "whatsapp" },
      { customer: "zeynep", service: "gel", staff: "mia", dayOffset: -5, time: "16:00", status: "completed", source: "whatsapp" },
      { customer: "grace", service: "facial", staff: "ella", dayOffset: -4, time: "12:00", status: "completed", source: "manual" },
      { customer: "layla", service: "roots", staff: "james", dayOffset: -3, time: "13:00", status: "completed", source: "web" },
      { customer: "hannah", service: "brows", staff: "ella", dayOffset: -2, time: "16:30", status: "no_show", source: "web" },
      { customer: "olivia", service: "blowdry", staff: "sophie", dayOffset: -1, time: "17:00", status: "completed", source: "whatsapp" },
      { customer: "emily", service: "mani", staff: "mia", dayOffset: 0, time: "15:00", status: "confirmed", source: "whatsapp" },
      { customer: "amelia", service: "keratin", staff: "james", dayOffset: 1, time: "12:00", status: "confirmed", source: "whatsapp" },
      { customer: "zeynep", service: "pedi", staff: "mia", dayOffset: 1, time: "17:00", status: "confirmed", source: "whatsapp" },
      { customer: "olivia", service: "balayage", staff: "james", dayOffset: 3, time: "13:00", status: "confirmed", source: "whatsapp" },
      { customer: "hannah", service: "facial", staff: "ella", dayOffset: 4, time: "11:00", status: "pending", source: "web" },
      { customer: "layla", service: "cut", staff: "sophie", dayOffset: 6, time: "16:30", status: "confirmed", source: "web" },
    ],
    conversations: [
      {
        customer: "zeynep",
        channel: "whatsapp",
        daysAgo: 1,
        language: "tr",
        messages: [
          { role: "customer", text: "Merhaba, yarın akşam fön için yer var mı?", minutesAfter: 0 },
          { role: "assistant", text: "Merhaba Zeynep Hanım! Fön ve şekillendirme 45 dakika, 35 £. Yarın akşam Sophie için *17:00*, *17:30* ve *18:15* boş. Hangisi uygun?", minutesAfter: 1, actions: [{ tool: "getServices", ok: true }, { tool: "checkAvailability", ok: true }] },
          { role: "customer", text: "17:30 olsun", minutesAfter: 3 },
          { role: "assistant", text: "Harika! Yarın *17:30*'da Sophie ile fön ve şekillendirme. Onaylıyor musunuz?", minutesAfter: 3 },
          { role: "customer", text: "Evet", minutesAfter: 4 },
          { role: "assistant", text: "Randevunuz oluşturuldu ✅ Randevu numaranız *7F3A91C2*. Görüşmek üzere!", minutesAfter: 4, actions: [{ tool: "createBooking", ok: true }] },
        ],
      },
      {
        customer: "charlotte",
        channel: "whatsapp",
        daysAgo: 0,
        language: "en",
        mode: "human",
        needsAttention: true,
        handoverReason: "Bride asking for a group price for 6 bridesmaids.",
        messages: [
          { role: "customer", text: "Hi! My wedding is next month and I need hair & makeup for me and 6 bridesmaids. What would that cost?", minutesAfter: 0 },
          { role: "assistant", text: "Congratulations, Charlotte! 💍 The bridal package includes a trial session, and its price is set after a free consultation. For the bridesmaids, I've asked our team to put together a group offer; they'll reply here shortly.", minutesAfter: 1, actions: [{ tool: "getServices", ok: true }, { tool: "createLead", ok: true }, { tool: "requestHumanHandover", ok: true }] },
        ],
      },
      {
        customer: "emily",
        channel: "whatsapp",
        daysAgo: 2,
        language: "en",
        messages: [
          { role: "customer", text: "Hi! Can I get a gel manicure this week?", minutesAfter: 0 },
          { role: "assistant", text: "Hi Emily! A gel manicure is 60 minutes and £35. Mia has *Wednesday 3:00 PM* or *Thursday 11:00 AM* free. Which works better?", minutesAfter: 1, actions: [{ tool: "getServices", ok: true }, { tool: "checkAvailability", ok: true }] },
          { role: "customer", text: "Actually make it a classic one, same day 3pm", minutesAfter: 5 },
          { role: "assistant", text: "Done! Your classic manicure with Mia is booked for *Wednesday at 3:00 PM*. Reference: *2B81D0E4*. See you then!", minutesAfter: 6, actions: [{ tool: "checkAvailability", ok: true }, { tool: "createBooking", ok: true }] },
        ],
      },
      {
        customer: "layla",
        channel: "web",
        daysAgo: 3,
        language: "ar",
        messages: [
          { role: "customer", text: "مرحبا، في مواقف سيارات قريبة؟ وقديش سعر تنظيف البشرة؟", minutesAfter: 0 },
          { role: "assistant", text: "أهلاً! يوجد موقف سيارات في شارع موكسون على بعد دقيقتين سيرًا. تنظيف البشرة المرطب مدته 60 دقيقة وسعره 70 جنيهًا إسترلينيًا. هل أبحث لك عن موعد؟", minutesAfter: 1, actions: [{ tool: "getBusinessInfo", ok: true }, { tool: "getServices", ok: true }] },
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
