import { getTranslations } from "next-intl/server";
import { cn } from "cn";
import { Reveal } from "@/components/motion/reveal";

// Real examples of how customers in Jordan, the Gulf and Turkey write,
// with the kind of reply the assistant gives. The text is language-specific
// by nature, so only the labels are translated.
const EXAMPLES = [
  {
    label: "levantine",
    ask: "بدي احجز قص شعر بكرا الساعة 5",
    reply: "أكيد! بكرا الساعة 5 رانيا فاضية لقص وتجفيف الشعر. شو الاسم الكريم؟",
  },
  {
    label: "english",
    ask: "Do you do bridal packages?",
    reply: "We do! Bridal hair & makeup includes a trial session, and the price is set after a free consultation. Shall I book one?",
  },
  {
    label: "arabizi",
    ask: "fi maw3ed la manicure el yom?",
    reply: "أهلين! في مجال اليوم الساعة 4:00 أو 5:30 عند دانة. أي وقت بناسبك؟",
  },
  {
    label: "gulf",
    ask: "ابي احجز مساج باجر العصر",
    reply: "حياك الله! عندنا مساج سويدي باجر الساعة 4:00 أو 5:30 العصر. أي وقت يناسبك؟",
  },
  {
    label: "turkish",
    ask: "Cumartesi açık mısınız?",
    reply: "Evet, cumartesi 10:00-15:00 arası açığız. Randevu oluşturmamı ister misiniz?",
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
            <Reveal key={example.label} delay={i * 0.06} className={cn(i < 3 ? "lg:col-span-2" : "lg:col-span-3", i === 4 && "sm:col-span-2 lg:col-span-3")}>
              <figure
                className="wa-wallpaper h-full overflow-hidden rounded-2xl border border-border bg-wa-wall p-4"
              >
                <figcaption className="mb-3 text-xs font-medium text-wa-meta">{t(example.label)}</figcaption>
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
