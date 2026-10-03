import { ArrowsLeftRightIcon, ChatTextIcon, PhoneCallIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { VoiceCallLoader } from "@/components/demo/voice-call-loader";
import { Reveal } from "@/components/motion/reveal";

export async function Voice() {
  const t = await getTranslations("voice");
  const points = [
    { icon: PhoneCallIcon, text: t("b1") },
    { icon: ArrowsLeftRightIcon, text: t("b2") },
    { icon: ChatTextIcon, text: t("b3") },
  ];

  return (
    <section id="voice" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <Reveal className="lg:order-2">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <PhoneCallIcon className="size-3.5 text-primary" />
            {t("badge")}
          </p>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-4 max-w-[52ch] text-pretty text-lg leading-relaxed text-muted-foreground">{t("body")}</p>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ember-soft text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="pt-1 leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.08} className="lg:order-1">
          <VoiceCallLoader />
        </Reveal>
      </div>
    </section>
  );
}
