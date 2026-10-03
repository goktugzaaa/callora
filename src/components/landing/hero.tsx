import { ArrowRightIcon, WhatsappLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { LiveDemo } from "@/components/demo/live-demo";
import { buttonVariants } from "@/components/ui/button";

export async function Hero() {
  const t = await getTranslations();

  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 end-[-12%] h-[640px] w-[640px] rounded-full bg-[radial-gradient(closest-side,oklch(0.72_0.13_40/0.15),transparent)] dark:bg-[radial-gradient(closest-side,oklch(0.6_0.14_40/0.18),transparent)]" />
        <div className="absolute bottom-[-18rem] start-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,oklch(0.75_0.08_152/0.12),transparent)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pb-28 lg:pt-14 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* CSS entrance (no JS needed), so the headline paints immediately */}
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <WhatsappLogoIcon weight="fill" className="size-3.5 text-wa-accent" />
            {t("hero.eyebrow")}
          </p>

          <h1 className="mt-7 text-[2.35rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-[2.9rem] xl:text-[3.35rem]">
            <span className="block">{t("hero.titleA")}</span>
            <span className="block text-primary">{t("hero.titleB")}</span>
          </h1>
          <p className="mt-6 max-w-[44ch] text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#demo" className={buttonVariants({ size: "lg" })}>
              {t("common.tryDemo")}
              <ArrowRightIcon className="size-4 rtl:-scale-x-100" />
            </a>
            <a href="#how" className={buttonVariants({ size: "lg", variant: "outline", className: "border-foreground/15" })}>
              {t("nav.how")}
            </a>
          </div>
        </div>

        <div
          id="demo"
          className="scroll-mt-24 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:fill-mode-both motion-safe:delay-150 motion-safe:duration-700"
        >
          <LiveDemo />
        </div>
      </div>
    </section>
  );
}
