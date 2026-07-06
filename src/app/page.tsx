import Link from "next/link";
import {
  PhoneIncomingIcon,
  CalendarCheckIcon,
  ChatTextIcon,
  SlidersIcon,
  BellRingingIcon,
  ClockIcon,
  ScissorsIcon,
  ToothIcon,
  PawPrintIcon,
  BarbellIcon,
  CarIcon,
  ForkKnifeIcon,
  ScalesIcon,
  FirstAidIcon,
  CheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import Hero from "@/components/Hero";
import Reveal from "@/components/Reveal";
import Logo from "@/components/Logo";

const STEPS = [
  {
    title: "Asistanınızı tanımlayın",
    desc: "İşletme adı, hizmetler, çalışma saatleri. Panelden 5 dakikada hazır.",
  },
  {
    title: "Numaranızı yönlendirin",
    desc: "Telefonunuz meşgulse ya da 15 saniye cevapsız kalırsa çağrı asistana düşer.",
  },
  {
    title: "İşinize dönün",
    desc: "Randevular takviminize, görüşme dökümleri panelinize kendiliğinden işlenir.",
  },
];

const SECTORS = [
  { icon: ToothIcon, name: "Diş klinikleri" },
  { icon: ScissorsIcon, name: "Kuaför ve güzellik" },
  { icon: PawPrintIcon, name: "Veterinerler" },
  { icon: BarbellIcon, name: "Spor salonları" },
  { icon: CarIcon, name: "Oto servisler" },
  { icon: ForkKnifeIcon, name: "Restoranlar" },
  { icon: ScalesIcon, name: "Hukuk büroları" },
  { icon: FirstAidIcon, name: "Poliklinikler" },
];

const PLANS = [
  {
    name: "Başlangıç",
    price: "1.490",
    desc: "Tek hatlı küçük işletmeler",
    features: ["Aylık 200 dakika görüşme", "Randevu yönetimi", "Görüşme dökümleri", "E-posta desteği"],
    highlight: false,
  },
  {
    name: "Profesyonel",
    price: "2.990",
    desc: "Yoğun telefon trafiği olanlar",
    features: [
      "Aylık 600 dakika görüşme",
      "SMS onay ve hatırlatma",
      "Çoklu hizmet takvimi",
      "Öncelikli destek",
    ],
    highlight: true,
  },
  {
    name: "İşletme+",
    price: "Özel",
    desc: "Zincirler ve yüksek hacim",
    features: ["Sınırsız dakika seçenekleri", "Çoklu şube yönetimi", "CRM ve takvim entegrasyonları", "Özel ses ve senaryo"],
    highlight: false,
  },
];

const FAQS = [
  {
    q: "Asistan gerçekten doğal mı konuşuyor?",
    a: "Evet. Callora gerçek zamanlı yapay zekâ ses modelleri kullanır. Sözünüzü kestiğinizde susar, dinler ve doğal biçimde devam eder. Yukarıdaki demoyu arayıp kendiniz duyabilirsiniz.",
  },
  {
    q: "Mevcut numaramı değiştirmem gerekir mi?",
    a: "Hayır. En yaygın kurulum şu: numaranız meşgul ya da 15 saniye cevapsız kaldığında çağrı asistana yönlenir. İsterseniz size özel yeni bir numara da tanımlarız.",
  },
  {
    q: "Cevaplayamadığı bir soru gelirse ne olur?",
    a: "Uydurmaz. Arayanın adını ve numarasını alır, konuyu not eder, panelinize geri dönüş bekleyen olarak düşer. Acil durumları tanır ve doğru yere yönlendirir.",
  },
  {
    q: "Kurulum ne kadar sürer?",
    a: "Kaydolup asistanı tanımlamak yaklaşık 5 dakika. Numara yönlendirmesiyle birlikte aynı gün canlıya çıkarsınız.",
  },
  {
    q: "KVKK uyumlu mu?",
    a: "Görüşme kayıtları yalnızca sizin panelinizde saklanır. Arayanlara görüşme başında yapay zekâ asistanla konuştukları bildirilebilir. Veri işleme sözleşmesi tüm planlara dahildir.",
  },
];

function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-line bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex items-center gap-7 text-sm text-muted">
          <a href="#nasil" className="hover:text-foreground transition-colors">Nasıl çalışır</a>
          <a href="#ozellikler" className="hover:text-foreground transition-colors">Özellikler</a>
          <a href="#fiyat" className="hover:text-foreground transition-colors">Fiyatlar</a>
          <a href="#sss" className="hover:text-foreground transition-colors">SSS</a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/giris"
            className="text-sm text-muted hover:text-foreground transition-colors px-3 py-2"
          >
            Giriş
          </Link>
          <Link href="/kayit" className="btn-primary !py-2 !px-4 text-sm">
            Ücretsiz Başla
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <Nav />

      <Hero />

      {/* Gerçek iddialar */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-9 grid sm:grid-cols-3 gap-8">
          {[
            { icon: ClockIcon, text: "7/24 açık. Öğle arası, gece yarısı, bayram fark etmez." },
            { icon: PhoneIncomingIcon, text: "Her çağrı ilk çalışta yanıtlanır, hiçbiri sesli mesaja düşmez." },
            { icon: ChatTextIcon, text: "Her görüşmenin tam dökümü panelinizde saklanır." },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <Icon size={20} className="text-accent-strong shrink-0 mt-0.5" />
              <p className="text-sm text-muted leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nasıl çalışır */}
      <section id="nasil" className="py-28">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <h2 className="text-3xl md:text-[2.6rem] font-semibold tracking-tighter leading-tight">
              Üç adımda devrede
            </h2>
            <div className="mt-10">
              {STEPS.map((s, i) => (
                <div key={s.title} className="relative flex gap-5 pb-10 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span className="absolute left-[15px] top-9 bottom-0 w-px bg-line" />
                  )}
                  <span className="h-8 w-8 shrink-0 rounded-full bg-surface border border-line text-foreground flex items-center justify-center text-sm font-semibold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-sm">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            {/* Panelin gerçek çağrı listesinin mini önizlemesi; içerik demo veritabanıyla birebir */}
            <div className="card lift p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="font-semibold text-sm">Bugün karşılanan çağrılar</p>
                <span className="text-xs text-muted-2">Callora Panel</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { from: "+90 532 111 22 33", time: "19:42", result: "Randevu alındı", ok: true },
                  { from: "+90 534 999 00 11", time: "13:05", result: "Bilgi verildi", ok: false },
                  { from: "+90 533 444 55 66", time: "21:15", result: "Randevu alındı", ok: true },
                  { from: "+90 539 888 77 66", time: "22:10", result: "Yönlendirildi", ok: false },
                ].map((c) => (
                  <div
                    key={c.from}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PhoneIncomingIcon size={16} className="text-accent-strong shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.from}</p>
                        <p className="text-xs text-muted-2">Mesai dışı · {c.time}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] border rounded-full px-2.5 py-1 shrink-0 ${
                        c.ok
                          ? "border-accent/30 text-accent-strong bg-accent/[0.08]"
                          : "border-line text-muted"
                      }`}
                    >
                      {c.result}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.05] px-4 py-3">
                <BellRingingIcon size={16} className="text-accent-strong shrink-0" />
                <p className="text-xs text-muted leading-snug">
                  Bu çağrıların hepsi siz kapalıyken geldi. İkisi randevuya dönüştü.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Özellikler: bento */}
      <section id="ozellikler" className="py-28 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <h2 className="text-3xl md:text-[2.6rem] font-semibold tracking-tighter leading-tight max-w-lg">
              Telefon trafiğinizin tamamı, tek panelde
            </h2>
          </Reveal>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            <Reveal className="md:col-span-2">
              <div className="card lift p-7 h-full bg-gradient-to-br from-emerald-50/80 via-surface to-surface">
                <PhoneIncomingIcon size={26} className="text-accent-strong" />
                <h3 className="font-semibold text-lg mt-4 tracking-tight">Doğal Türkçe karşılama</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed max-w-md">
                  Arayan, karşısında bir robot menüsü değil sohbet eden bir resepsiyonist bulur.
                  Sözü kesilince susar, dinler, kaldığı yerden devam eder.
                </p>
                <div className="mt-6 rounded-xl border border-line bg-surface p-4 space-y-2.5 max-w-md shadow-sm">
                  <p className="text-xs leading-relaxed">
                    <span className="text-accent-strong font-semibold">Asistan </span>
                    <span className="text-muted">Yarın 14:00 muayene için uygun, ayırayım mı?</span>
                  </p>
                  <p className="text-xs leading-relaxed">
                    <span className="font-semibold">Arayan </span>
                    <span className="text-muted">Olur. Adım Murat Demir, 0533 444 55 66.</span>
                  </p>
                  <p className="text-xs leading-relaxed">
                    <span className="text-accent-strong font-semibold">Asistan </span>
                    <span className="text-muted">Randevunuz oluşturuldu, onay mesajı geliyor. İyi günler.</span>
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="card lift p-7 h-full">
                <CalendarCheckIcon size={26} className="text-accent-strong" />
                <h3 className="font-semibold text-lg mt-4 tracking-tight">Randevu kendiliğinden</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Ad, numara, hizmet, saat. Görüşme biterken randevu takviminize işlenmiş olur.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="card lift p-7 h-full">
                <ChatTextIcon size={26} className="text-accent-strong" />
                <h3 className="font-semibold text-lg mt-4 tracking-tight">Kelimesi kelimesine döküm</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Kim aradı, ne istedi, sonuç ne oldu. Her çağrının tam metni panelde.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="card lift p-7 h-full">
                <SlidersIcon size={26} className="text-accent-strong" />
                <h3 className="font-semibold text-lg mt-4 tracking-tight">Sizin kurallarınız</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Karşılama cümlesi, fiyat politikası, çalışma saatleri. Asistan sizin
                  talimatlarınızla konuşur, bilmediğini uydurmaz.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="card lift p-7 h-full">
                <BellRingingIcon size={26} className="text-accent-strong" />
                <h3 className="font-semibold text-lg mt-4 tracking-tight">Acili tanır</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  Acil durumda doğru yere yönlendirir, kritik çağrılarda sizi anında bilgilendirir.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Sektör şeridi */}
      <section className="py-16 border-t border-line overflow-hidden bg-surface">
        <p className="text-center text-sm text-muted mb-8 px-5">
          Randevuyla çalışan her işletme için
        </p>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-surface to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-surface to-transparent z-10" />
          <div className="marquee-track flex w-max gap-3">
            {[...SECTORS, ...SECTORS].map(({ icon: Icon, name }, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex items-center gap-2.5 rounded-full border border-line bg-background px-5 py-2.5 text-sm whitespace-nowrap text-muted"
              >
                <Icon size={17} className="text-accent-strong" />
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Fiyatlandırma */}
      <section id="fiyat" className="py-28 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <h2 className="text-3xl md:text-[2.6rem] font-semibold tracking-tighter leading-tight text-center">
              Bir resepsiyonistin maaşından çok daha az
            </h2>
            <p className="text-muted text-center mt-3 text-sm">
              Tüm planlarda 14 gün ücretsiz deneme. Kredi kartı gerekmez.
            </p>
          </Reveal>
          <div className="mt-14 grid md:grid-cols-3 gap-4 items-stretch max-w-4xl mx-auto">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.06}>
                <div
                  className={`card lift p-7 h-full flex flex-col ${
                    p.highlight
                      ? "border-foreground/70 shadow-[0_20px_48px_-24px_rgba(24,24,27,0.28)]"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.highlight && (
                      <span className="text-[11px] font-medium bg-ink text-white rounded-full px-2.5 py-1">
                        Popüler
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1">{p.desc}</p>
                  <p className="mt-5">
                    <span className="text-3xl font-semibold tracking-tight">{p.price}</span>
                    {p.price !== "Özel" && <span className="text-muted text-sm"> ₺/ay</span>}
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5 items-start">
                        <CheckIcon size={15} className="text-accent-strong shrink-0 mt-0.5" />
                        <span className="text-muted">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/kayit"
                    className={`mt-7 w-full ${p.highlight ? "btn-primary" : "btn-ghost"}`}
                  >
                    Ücretsiz Başla
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="py-28 border-t border-line">
        <div className="mx-auto max-w-2xl px-5">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter text-center mb-10">
              Sık sorulanlar
            </h2>
          </Reveal>
          <div className="divide-y divide-line border-y border-line">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="font-medium cursor-pointer list-none flex justify-between items-center gap-4 text-[15px]">
                  {f.q}
                  <span className="text-muted-2 group-open:rotate-45 transition-transform text-xl leading-none shrink-0">
                    +
                  </span>
                </summary>
                <p className="text-sm text-muted mt-3 leading-relaxed pr-8">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Kapanış */}
      <section className="py-32 border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tighter leading-[1.05]">
              Bir sonraki çağrıyı
              <br />
              <span className="text-accent-strong">kaçırmayın.</span>
            </h2>
            <p className="text-muted mt-5">
              Kurulum 5 dakika. 14 gün ücretsiz, iptal tek tık.
            </p>
            <Link href="/kayit" className="btn-primary mt-8">
              Ücretsiz Başla
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="mx-auto max-w-6xl px-5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <p>© {new Date().getFullYear()} Callora. Yapay zekâ telefon asistanı.</p>
          <div className="flex gap-6">
            <a href="#ozellikler" className="hover:text-foreground transition-colors">Özellikler</a>
            <a href="#fiyat" className="hover:text-foreground transition-colors">Fiyatlar</a>
            <Link href="/giris" className="hover:text-foreground transition-colors">Giriş</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
