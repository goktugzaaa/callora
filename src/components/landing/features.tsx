import {
  CalendarXIcon,
  ClockIcon,
  HourglassMediumIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  UserFocusIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { cn } from "cn";
import { Reveal } from "@/components/motion/reveal";

// Bento of real UI fragments (same tokens and shapes as the dashboard),
// not screenshots. Row 1: takeover (4) + rules (2). Row 2: menu, security, analytics.

const MENU = [
  { names: { en: "Haircut & Blow-dry", tr: "Saç Kesimi ve Fön", ar: "قص وتجفيف الشعر" }, min: 60, price: "£55" },
  { names: { en: "Gel Manicure", tr: "Kalıcı Oje Manikür", ar: "مانيكير جل" }, min: 60, price: "£35" },
  { names: { en: "Balayage", tr: "Balyaj", ar: "بالياج" }, min: 180, price: "£180+" },
];

// Illustrative week, shown with a "sample data" label.
const WEEK = [
  { ai: 62, human: 12 },
  { ai: 48, human: 10 },
  { ai: 71, human: 8 },
  { ai: 55, human: 14 },
  { ai: 88, human: 9 },
  { ai: 94, human: 16 },
  { ai: 40, human: 6 },
];

export async function Features() {
  const t = await getTranslations("features");

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h2>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-6">
          {/* Takeover */}
          <Reveal className="lg:col-span-4">
            <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <div className="p-6 sm:p-8">
                <h3 className="text-xl font-semibold tracking-tight">{t("takeover.title")}</h3>
                <p className="mt-2 max-w-[52ch] text-pretty leading-relaxed text-muted-foreground">{t("takeover.body")}</p>
              </div>
              <div className="mt-auto grid border-t border-border sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                <ul className="divide-y divide-border bg-surface-sunken/60 text-sm">
                  {[
                    { name: "Charlotte Evans", text: t("takeover.c1"), time: "21:14", flag: true },
                    { name: "Zeynep Aksoy", text: t("takeover.c2"), time: "20:02", flag: false },
                    { name: "Hannah Wilson", text: t("takeover.c3"), time: "18:45", flag: false },
                  ].map((row) => (
                    <li key={row.name} className={cn("flex gap-3 px-4 py-3", row.flag && "bg-warning-soft/60")}>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold">
                        {row.name.split(" ").map((p) => p[0]).join("")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{row.name}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{row.time}</span>
                        </span>
                        <span dir="auto" className="block truncate text-muted-foreground">
                          {row.text}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="hidden flex-col gap-3 p-5 sm:flex">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-foreground/80">
                      <span className="size-1.5 rounded-full bg-warning" />
                      {t("takeover.flag")}
                    </span>
                    <span className="inline-flex rounded-full bg-secondary p-0.5 text-xs font-medium">
                      <span className="rounded-full px-2.5 py-1 text-muted-foreground">{t("takeover.ai")}</span>
                      <span className="rounded-full bg-card px-2.5 py-1 shadow-sm">{t("takeover.you")}</span>
                    </span>
                  </div>
                  <p dir="auto" className="w-fit max-w-[85%] rounded-[14px] rounded-ss-[4px] bg-secondary px-3 py-2 text-sm">
                    {t("takeover.c1")}
                  </p>
                  <div className="mt-auto flex items-center gap-2 rounded-full border border-border bg-background p-1 ps-4">
                    <span className="flex-1 truncate text-sm text-muted-foreground">{t("takeover.reply")}</span>
                    <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
                      {t("takeover.button")}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </Reveal>

          {/* Rules */}
          <Reveal delay={0.06} className="lg:col-span-2">
            <article className="flex h-full flex-col rounded-2xl border border-border bg-surface-sunken p-6 sm:p-8">
              <h3 className="text-xl font-semibold tracking-tight">{t("rules.title")}</h3>
              <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{t("rules.body")}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {[
                  { icon: ClockIcon, text: t("rules.r1") },
                  { icon: HourglassMediumIcon, text: t("rules.r2") },
                  { icon: CalendarXIcon, text: t("rules.r3") },
                  { icon: UserFocusIcon, text: t("rules.r4") },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 ring-1 ring-border">
                    <Icon className="size-4 shrink-0 text-primary" />
                    {text}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          {/* Bilingual menu */}
          <Reveal delay={0.04} className="lg:col-span-2">
            <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-xl font-semibold tracking-tight">{t("menu.title")}</h3>
              <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{t("menu.body")}</p>
              <ul className="mt-6 space-y-3">
                {MENU.map((item) => (
                  <li key={item.names.en} className="flex items-baseline justify-between gap-4 border-b border-dashed border-border pb-3 last:border-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        <bdi lang="en">{item.names.en}</bdi>
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        <bdi lang="tr">{item.names.tr}</bdi> · <bdi lang="ar">{item.names.ar}</bdi>
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className="block font-mono text-sm" dir="ltr">
                        {item.price}
                      </span>
                      <span className="block font-mono text-xs text-muted-foreground" dir="ltr">
                        {item.min} min
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          {/* Security */}
          <Reveal delay={0.08} className="lg:col-span-2">
            <article className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-[linear-gradient(150deg,oklch(0.58_0.17_38),oklch(0.43_0.13_28))] p-6 text-[oklch(0.985_0.008_45)] sm:p-8">
              <div aria-hidden className="absolute -end-10 -top-10 size-48 rounded-full bg-[radial-gradient(closest-side,oklch(1_0_0/0.18),transparent)]" />
              <ShieldCheckIcon weight="duotone" className="size-9" />
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{t("security.title")}</h3>
              <p className="mt-2 text-pretty leading-relaxed text-[oklch(0.95_0.02_45)]">{t("security.body")}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {["Lumière · London", "Nova · İstanbul", "Serenity · Dubai"].map((name) => (
                  <li key={name} className="flex items-center gap-2.5 rounded-xl bg-black/15 px-3 py-2 backdrop-blur-sm">
                    <WhatsappLogoIcon weight="fill" className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{name}</span>
                    <LockKeyIcon className="size-4 shrink-0 opacity-80" />
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          {/* Analytics */}
          <Reveal delay={0.12} className="lg:col-span-2">
            <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-xl font-semibold tracking-tight">{t("analytics.title")}</h3>
              <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{t("analytics.body")}</p>
              <div className="mt-auto pt-8">
                <div className="flex h-32 items-end gap-2" aria-hidden>
                  {WEEK.map((day, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col justify-end gap-1">
                      <span className="rounded-t-md bg-chart-1" style={{ height: `${day.ai}%` }} />
                      <span className="rounded-b-md bg-chart-5" style={{ height: `${day.human}%` }} />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{t("analytics.sample")}</p>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
