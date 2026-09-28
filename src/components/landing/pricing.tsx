import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { cn } from "cn";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";

const PLANS = [
  { key: "starter", price: "$39", featured: false },
  { key: "growth", price: "$99", featured: true },
  { key: "scale", price: null, featured: false },
] as const;

export async function Pricing() {
  const t = await getTranslations();

  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t("pricing.title")}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
        </Reveal>

        <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-[1fr_1.2fr_1fr]">
          {PLANS.map((plan, i) => {
            const features = t.raw(`pricing.${plan.key}.features`) as string[];
            return (
              <Reveal key={plan.key} delay={i * 0.06}>
                <article
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border p-6 sm:p-8",
                    plan.featured
                      ? "border-primary/40 bg-card shadow-[0_30px_60px_-30px_oklch(0.45_0.12_37/0.45)] ring-1 ring-primary/30 lg:-my-4 lg:py-12"
                      : "border-border bg-card/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{t(`pricing.${plan.key}.name`)}</h3>
                    {plan.featured && (
                      <span className="rounded-full bg-ember-soft px-2.5 py-1 text-xs font-medium text-primary">
                        {t("pricing.popular")}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{t(`pricing.${plan.key}.desc`)}</p>
                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight" dir="ltr">
                      {plan.price ?? t("pricing.custom")}
                    </span>
                    {plan.price && <span className="text-sm text-muted-foreground">{t("pricing.monthly")}</span>}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <CheckIcon weight="bold" className="mt-0.5 size-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-8">
                    <a
                      href="#demo"
                      className={buttonVariants({ size: "lg", variant: plan.featured ? "default" : "outline", className: "w-full" })}
                    >
                      {t("common.tryDemo")}
                    </a>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
