import {
  ArrowsClockwiseIcon,
  CalendarPlusIcon,
  ChatCircleTextIcon,
  FlagIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { getTranslations } from "next-intl/server";
import { cn } from "cn";
import { Reveal } from "@/components/motion/reveal";

// One day at a salon open 10:00-20:00. Messages keep coming outside those
// hours; each marker is something the assistant handled on its own.

const OPEN = 10 * 60;
const CLOSE = 20 * 60;
const DAY = 24 * 60;

const EVENTS: { time: string; key: string; icon: Icon }[] = [
  { time: "02:20", key: "e5", icon: FlagIcon },
  { time: "08:12", key: "e1", icon: CalendarPlusIcon },
  { time: "13:40", key: "e2", icon: ChatCircleTextIcon },
  { time: "21:47", key: "e3", icon: ArrowsClockwiseIcon },
  { time: "23:55", key: "e4", icon: CalendarPlusIcon },
];

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const pct = (m: number) => (m / DAY) * 100;
const isOpen = (m: number) => m >= OPEN && m < CLOSE;

export async function AfterHours() {
  const t = await getTranslations("afterHours");

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">{t("body")}</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
            {/* Desktop: a 24-hour track */}
            <div className="relative hidden h-[300px] md:block">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
              <div
                className="absolute top-1/2 h-10 -translate-y-1/2 rounded-full bg-surface-sunken ring-1 ring-border"
                style={{ insetInlineStart: `${pct(OPEN)}%`, width: `${pct(CLOSE - OPEN)}%` }}
              >
                <span className="absolute inset-0 flex items-center justify-end pe-4 text-xs font-medium text-muted-foreground">
                  {t("hours")} 10:00-20:00
                </span>
              </div>
              {[0, 6, 12, 18, 24].map((h) => (
                <span
                  key={h}
                  className="absolute top-[calc(50%+2rem)] -translate-x-1/2 font-mono text-[11px] text-muted-foreground rtl:translate-x-1/2"
                  style={{ insetInlineStart: `${pct(h * 60)}%` }}
                  dir="ltr"
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}

              {EVENTS.map((event, i) => {
                const m = minutes(event.time);
                const open = isOpen(m);
                const above = i % 2 === 0;
                const p = pct(m);
                const align = p < 12 ? "start" : p > 88 ? "end" : "center";
                return (
                  <div key={event.key} className="absolute inset-y-0" style={{ insetInlineStart: `${p}%` }}>
                    <span
                      className={cn(
                        "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-card rtl:translate-x-1/2",
                        open ? "bg-foreground/70" : "bg-primary",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute w-px -translate-x-1/2 bg-border rtl:translate-x-1/2",
                        above ? "bottom-[calc(50%+0.5rem)] top-[3.25rem]" : "bottom-[3.25rem] top-[calc(50%+0.5rem)]",
                      )}
                    />
                    <div
                      className={cn(
                        "absolute w-[210px]",
                        above ? "top-0" : "bottom-0",
                        align === "center" && "start-0 -translate-x-1/2 rtl:translate-x-1/2",
                        align === "start" && "-start-6",
                        align === "end" && "-end-6",
                      )}
                    >
                      <EventCard time={event.time} text={t(event.key)} icon={event.icon} open={open} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile: the same day as a list */}
            <ol className="space-y-3 md:hidden">
              {EVENTS.map((event) => (
                <li key={event.key}>
                  <EventCard time={event.time} text={t(event.key)} icon={event.icon} open={isOpen(minutes(event.time))} />
                </li>
              ))}
            </ol>

            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground md:mt-2">
              <span className="size-2.5 rounded-full bg-primary" />
              {t("outside")}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function EventCard({ time, text, icon: IconComponent, open }: { time: string; text: string; icon: Icon; open: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 text-sm shadow-[0_10px_30px_-18px_oklch(0.3_0.04_262/0.4)]",
        open ? "border-border bg-card" : "border-primary/30 bg-ember-soft/70",
      )}
    >
      <IconComponent className={cn("mt-0.5 size-4 shrink-0", open ? "text-muted-foreground" : "text-primary")} />
      <span className="min-w-0 leading-snug">
        <span className="block font-mono text-xs text-muted-foreground" dir="ltr">
          {time}
        </span>
        <span className="block">{text}</span>
      </span>
    </div>
  );
}
