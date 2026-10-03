import { getTranslations } from "next-intl/server";
import { cn } from "cn";
import { Reveal } from "@/components/motion/reveal";

// How customers actually write, in a few of the languages the assistant
// handles, with the kind of reply it gives. Labels are the languages' own names.
const EXAMPLES = [
  {
    lang: "en",
    label: "English",
    ask: "Can I get a haircut on Saturday morning?",
    reply: "Of course! Sophie is free on Saturday at 10:00 or 11:30. Which one works for you?",
  },
  {
    lang: "tr",
    label: "Türkçe",
    ask: "Yarın diş temizliği için yer var mı?",
    reply: "Merhaba! Yarın Dt. Selin Aydın için 10:00 ve 14:30 boş. Hangisi uygun?",
  },
  {
    lang: "ar",
    label: "العربية",
    ask: "ابي احجز مساج باجر العصر",
    reply: "حياك الله! عندنا مساج سويدي باجر الساعة 4:00 أو 5:30 العصر. أي وقت يناسبك؟",
  },
  {
    lang: "de",
    label: "Deutsch",
    ask: "Habt ihr am Freitag noch einen Termin für eine Maniküre?",
    reply: "Ja! Am Freitag ist um 15:00 oder 16:30 Uhr noch etwas frei. Was passt dir besser?",
  },
  {
    lang: "es",
    label: "Español",
    ask: "¿Tienen hueco para un facial esta semana?",
    reply: "¡Claro! Hay disponibilidad el jueves a las 11:00 o el viernes a las 17:00. ¿Cuál prefieres?",
  },
] as const;

export async function Dialects() {
  const t = await getTranslations("dialects");

  return (
    <section id="product" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">{t("body")}</p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {EXAMPLES.map((example, i) => (
            <Reveal
              key={example.lang}
              delay={i * 0.06}
              className={cn(i < 3 ? "lg:col-span-2" : "lg:col-span-3", i === 4 && "sm:col-span-2 lg:col-span-3")}
            >
              <figure lang={example.lang} className="wa-wallpaper h-full overflow-hidden rounded-2xl border border-border bg-wa-wall p-4">
                <figcaption className="mb-3 text-xs font-medium text-wa-meta">{example.label}</figcaption>
                <div className="flex flex-col gap-2 text-[14px] leading-[1.45]">
                  <p dir="auto" className="max-w-[88%] self-end rounded-[14px] rounded-se-[4px] bg-wa-out px-3 py-2 shadow-[0_1px_0.5px_oklch(0_0_0/0.12)]">
                    {example.ask}
                  </p>
                  <p dir="auto" className="max-w-[92%] self-start rounded-[14px] rounded-ss-[4px] bg-wa-in px-3 py-2 shadow-[0_1px_0.5px_oklch(0_0_0/0.12)]">
                    {example.reply}
                  </p>
                </div>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
