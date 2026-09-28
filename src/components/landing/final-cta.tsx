import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";

export async function FinalCta() {
  const t = await getTranslations();
  const locale = await getLocale();
  const counterpartLang = locale === "ar" ? "en" : "ar";

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,oklch(0.56_0.17_37),oklch(0.42_0.13_28))] px-6 py-16 text-center text-[oklch(0.985_0.008_45)] sm:px-12 sm:py-20">
          <div aria-hidden className="absolute -top-24 start-1/2 size-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(1_0_0/0.16),transparent)] rtl:translate-x-1/2" />
          <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{t("cta.title")}</h2>
          <p className="relative mt-3 text-xl text-[oklch(0.93_0.03_45)] sm:text-2xl">
            <bdi lang={counterpartLang}>{t("cta.counterpart")}</bdi>
          </p>
          <p className="relative mt-5 text-[oklch(0.93_0.03_45)]">{t("cta.body")}</p>
          <a
            href="#demo"
            className="relative mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-[oklch(0.99_0.004_45)] px-7 text-[0.95rem] font-medium text-[oklch(0.3_0.08_35)] shadow-[0_10px_30px_-10px_oklch(0.2_0.08_30/0.6)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {t("common.tryDemo")}
            <ArrowRightIcon className="size-4 rtl:-scale-x-100" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}
