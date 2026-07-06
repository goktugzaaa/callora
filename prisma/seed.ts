import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function daysAgo(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysAhead(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await db.user.upsert({
    where: { email: "demo@callora.app" },
    update: {},
    create: {
      email: "demo@callora.app",
      passwordHash,
      name: "Demo Kullanıcı",
    },
  });

  const existing = await db.business.findUnique({ where: { ownerId: user.id } });
  if (existing) {
    console.log("Seed zaten mevcut, atlanıyor.");
    return;
  }

  const business = await db.business.create({
    data: {
      name: "Nova Diş Kliniği",
      phone: "+90 212 555 0142",
      sector: "klinik",
      ownerId: user.id,
      agent: {
        create: {
          greeting:
            "Nova Diş Kliniği'ni aradığınız için teşekkürler. Ben kliniğin dijital asistanıyım. Randevu almak ya da bilgi sormak için size nasıl yardımcı olabilirim?",
          voice: "coral",
          extraNotes:
            "Fiyat sorulursa net rakam verme, 'muayene sonrası hekimimiz net bilgi verir' de. Acil durumlarda hastayı en yakın acile yönlendir.",
        },
      },
      services: {
        create: [
          { name: "Muayene", durationMin: 30, priceTry: 800 },
          { name: "Diş Temizliği", durationMin: 30, priceTry: 1500 },
          { name: "Dolgu", durationMin: 45, priceTry: 2200 },
          { name: "İmplant Konsültasyonu", durationMin: 30 },
        ],
      },
    },
    include: { services: true },
  });

  const svc = (name: string) => business.services.find((s) => s.name === name)!;

  const upcoming = [
    { n: "Elif Kaya", p: "+90 532 111 2233", s: "Muayene", d: daysAhead(1, 10) },
    { n: "Murat Demir", p: "+90 533 444 5566", s: "Diş Temizliği", d: daysAhead(1, 14, 30) },
    { n: "Zeynep Arslan", p: "+90 535 777 8899", s: "Dolgu", d: daysAhead(2, 11) },
    { n: "Ahmet Yılmaz", p: "+90 536 222 3344", s: "İmplant Konsültasyonu", d: daysAhead(3, 15) },
    { n: "Seda Koç", p: "+90 537 555 6677", s: "Muayene", d: daysAhead(4, 9, 30) },
  ];

  for (const a of upcoming) {
    const service = svc(a.s);
    await db.appointment.create({
      data: {
        businessId: business.id,
        serviceId: service.id,
        customerName: a.n,
        customerPhone: a.p,
        startsAt: a.d,
        endsAt: new Date(a.d.getTime() + service.durationMin * 60000),
        status: "onaylandi",
        source: "telefon",
      },
    });
  }

  const calls: {
    from: string;
    at: Date;
    dur: number;
    outcome: string;
    transcript: { role: string; text: string }[];
    booking?: { n: string; p: string; s: string; d: Date };
  }[] = [
    {
      from: "+90 532 111 2233",
      at: daysAgo(1, 19, 42),
      dur: 96,
      outcome: "randevu",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği'ni aradığınız için teşekkürler. Size nasıl yardımcı olabilirim?" },
        { role: "arayan", text: "Merhaba, dişim ağrıyor, yarın için randevu alabilir miyim?" },
        { role: "asistan", text: "Geçmiş olsun. Yarın saat 10:00 muayene için uygun, sizin için ayırayım mı?" },
        { role: "arayan", text: "Olur, çok iyi olur." },
        { role: "asistan", text: "Adınızı ve telefon numaranızı alabilir miyim?" },
        { role: "arayan", text: "Elif Kaya, 0532 111 22 33." },
        { role: "asistan", text: "Randevunuz oluşturuldu: yarın 10:00, muayene. SMS ile onay göndereceğiz. Geçmiş olsun, iyi günler." },
      ],
      booking: { n: "Elif Kaya", p: "+90 532 111 2233", s: "Muayene", d: daysAhead(1, 10) },
    },
    {
      from: "+90 533 444 5566",
      at: daysAgo(1, 21, 15),
      dur: 74,
      outcome: "randevu",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği, dijital asistan. Nasıl yardımcı olabilirim?" },
        { role: "arayan", text: "Diş temizliği yaptırmak istiyorum, hafta içi öğleden sonra." },
        { role: "asistan", text: "Yarın 14:30 uygun. Ayırayım mı?" },
        { role: "arayan", text: "Evet. Murat Demir, 0533 444 55 66." },
        { role: "asistan", text: "Randevunuz alındı. Yarın 14:30'da bekliyoruz, iyi akşamlar." },
      ],
      booking: { n: "Murat Demir", p: "+90 533 444 5566", s: "Diş Temizliği", d: daysAhead(1, 14, 30) },
    },
    {
      from: "+90 534 999 0011",
      at: daysAgo(2, 13, 5),
      dur: 58,
      outcome: "bilgi",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği, size nasıl yardımcı olabilirim?" },
        { role: "arayan", text: "İmplant fiyatlarınız nedir?" },
        { role: "asistan", text: "İmplant planlaması kişiye özel olduğu için net fiyatı muayene sonrası hekimimiz belirliyor. Ücretsiz konsültasyon randevusu oluşturabilirim, ister misiniz?" },
        { role: "arayan", text: "Şimdilik sadece bilgi almak istemiştim, teşekkürler." },
        { role: "asistan", text: "Rica ederim, dilediğiniz zaman arayabilirsiniz. İyi günler." },
      ],
    },
    {
      from: "+90 535 777 8899",
      at: daysAgo(3, 20, 48),
      dur: 88,
      outcome: "randevu",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği'ni aradınız, ben dijital asistanım." },
        { role: "arayan", text: "Dolgum düştü, en kısa zamanda gelmem lazım." },
        { role: "asistan", text: "Anladım. En erken uygun saat öbür gün 11:00. Sizin için ayırayım mı?" },
        { role: "arayan", text: "Tamam. Zeynep Arslan, 0535 777 88 99." },
        { role: "asistan", text: "Randevunuz oluşturuldu. O zamana kadar sıcak-soğuktan kaçının. Geçmiş olsun." },
      ],
      booking: { n: "Zeynep Arslan", p: "+90 535 777 8899", s: "Dolgu", d: daysAhead(2, 11) },
    },
    {
      from: "+90 538 123 4567",
      at: daysAgo(4, 12, 20),
      dur: 45,
      outcome: "bilgi",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği, nasıl yardımcı olabilirim?" },
        { role: "arayan", text: "Cumartesi açık mısınız?" },
        { role: "asistan", text: "Evet, cumartesi 10:00-16:00 arası hizmet veriyoruz. Randevu oluşturmamı ister misiniz?" },
        { role: "arayan", text: "Şimdilik gerek yok, teşekkürler." },
      ],
    },
    {
      from: "+90 536 222 3344",
      at: daysAgo(5, 18, 33),
      dur: 102,
      outcome: "randevu",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği'ni aradığınız için teşekkürler." },
        { role: "arayan", text: "İmplant düşünüyorum, önce bir görüşme yapmak istiyorum." },
        { role: "asistan", text: "Tabii, implant konsültasyonu ücretsiz. Bu hafta perşembe 15:00 uygun mu?" },
        { role: "arayan", text: "Uygun. Ahmet Yılmaz, 0536 222 33 44." },
        { role: "asistan", text: "Randevunuz alındı. Panoramik röntgeniniz varsa yanınızda getirmenizi rica ederiz." },
      ],
      booking: { n: "Ahmet Yılmaz", p: "+90 536 222 3344", s: "İmplant Konsültasyonu", d: daysAhead(3, 15) },
    },
    {
      from: "+90 539 888 7766",
      at: daysAgo(6, 22, 10),
      dur: 39,
      outcome: "yonlendirme",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği, size nasıl yardımcı olabilirim?" },
        { role: "arayan", text: "Çocuğum düştü, dişi kırıldı, kanama var!" },
        { role: "asistan", text: "Geçmiş olsun. Aktif kanama varsa lütfen vakit kaybetmeden en yakın acile gidin. Yarın sabah ilk saat için de kliniğimizde yer ayırabilirim, ister misiniz?" },
        { role: "arayan", text: "Önce acile gidiyoruz." },
        { role: "asistan", text: "Doğru karar. Geçmiş olsun, yarın durumu için bizi arayabilirsiniz." },
      ],
    },
    {
      from: "+90 537 555 6677",
      at: daysAgo(7, 9, 12),
      dur: 66,
      outcome: "randevu",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği, günaydın. Nasıl yardımcı olabilirim?" },
        { role: "arayan", text: "Genel kontrol için randevu istiyorum, sabah saatleri." },
        { role: "asistan", text: "Cuma 09:30 uygun. Ayırayım mı?" },
        { role: "arayan", text: "Evet. Seda Koç, 0537 555 66 77." },
        { role: "asistan", text: "Randevunuz oluşturuldu, cuma 09:30'da görüşmek üzere." },
      ],
      booking: { n: "Seda Koç", p: "+90 537 555 6677", s: "Muayene", d: daysAhead(4, 9, 30) },
    },
    {
      from: "+90 530 246 8100",
      at: daysAgo(8, 23, 55),
      dur: 51,
      outcome: "bilgi",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği'ni aradınız. Şu an kapalıyız ancak ben 7/24 buradayım." },
        { role: "arayan", text: "Diş beyazlatma yapıyor musunuz?" },
        { role: "asistan", text: "Evet, ofis tipi beyazlatma uyguluyoruz. Detaylar için muayene randevusu önerebilirim." },
        { role: "arayan", text: "Yarın ararım, teşekkürler." },
      ],
    },
    {
      from: "+90 531 135 7911",
      at: daysAgo(10, 16, 40),
      dur: 29,
      outcome: "bilgi",
      transcript: [
        { role: "asistan", text: "Nova Diş Kliniği, nasıl yardımcı olabilirim?" },
        { role: "arayan", text: "Adresiniz neresi?" },
        { role: "asistan", text: "Bağdat Caddesi No:112, Kadıköy'deyiz. Dilerseniz konumu SMS ile gönderebilirim." },
        { role: "arayan", text: "Gönderin lütfen." },
      ],
    },
  ];

  for (const c of calls) {
    let appointmentId: string | undefined;
    if (c.booking) {
      const appt = await db.appointment.findFirst({
        where: { businessId: business.id, customerName: c.booking.n },
      });
      appointmentId = appt?.id;
    }
    await db.call.create({
      data: {
        businessId: business.id,
        fromNumber: c.from,
        startedAt: c.at,
        durationSec: c.dur,
        transcript: JSON.stringify(c.transcript),
        outcome: c.outcome,
        appointmentId,
      },
    });
  }

  console.log("Seed tamam: demo@callora.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
