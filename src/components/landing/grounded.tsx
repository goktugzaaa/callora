import { CalendarCheckIcon, CheckCircleIcon, DatabaseIcon, LockSimpleIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { cn } from "cn";
import { Logo } from "@/components/brand/logo";
import { Reveal } from "@/components/motion/reveal";

// A sequence diagram of one real booking: who says what, and which backend
// call backs every answer. Lanes collapse into a single column on mobile.

type Step =
  | { kind: "say"; lane: 0 | 1; text: string }
  | { kind: "call"; fn: string; args: string; result: string; icon: typeof CalendarCheckIcon };

function Lane({ step }: { step: Step }) {
  if (step.kind === "call") {
    return (
      <div className="md:col-span-2 md:col-start-2 md:ms-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-primary/40 bg-ember-soft/60 px-3.5 py-2.5 font-mono text-[12.5px]">
          <step.icon className="size-4 shrink-0 text-primary" />
          <span className="text-foreground">
            {step.fn}(<span className="text-muted-foreground">{step.args}</span>)
          </span>
          <span className="text-muted-foreground" aria-hidden>
            →
          </span>
          <span className="font-medium text-primary">{step.result}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={cn(step.lane === 0 ? "md:col-start-1" : "md:col-start-2")}>
      <p
        dir="auto"
        className={cn(
          "w-fit max-w-full rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-[0_1px_0.5px_oklch(0_0_0/0.1)]",
          step.lane === 0 ? "rounded-es-md bg-card" : "rounded-es-md bg-wa-out",
        )}
      >
        {step.text}
      </p>
    </div>
  );
}

export async function Grounded() {
  const t = await getTranslations("grounded");

  const steps: Step[] = [
    { kind: "say", lane: 0, text: t("stepAsk") },
    { kind: "call", fn: "checkAvailability", args: "balayage, Thu", result: "17:00 · James", icon: CalendarCheckIcon },
    { kind: "say", lane: 1, text: t("stepReply") },
    { kind: "say", lane: 0, text: t("stepYes") },
    { kind: "call", fn: "createBooking", args: "balayage, Thu 17:00", result: "ok · 7F3A91C2", icon: CheckCircleIcon },
    { kind: "say", lane: 1, text: t("stepConfirm") },
  ];

  const lanes = [
    { label: t("customer"), icon: <UserIcon className="size-4" /> },
    { label: t("assistant"), icon: <Logo showWordmark={false} className="[&>span]:size-5 [&>span]:rounded-md [&>span]:p-1" /> },
    { label: t("database"), icon: <DatabaseIcon className="size-4" /> },
  ];

  return (
    <section id="how" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">{t("body")}</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-sunken p-4 sm:p-8">
            <div className="mb-6 hidden grid-cols-3 gap-6 md:grid">
              {lanes.map((lane) => (
                <p key={lane.label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="flex size-7 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-border">
                    {lane.icon}
                  </span>
                  {lane.label}
                </p>
              ))}
            </div>
            <div className="relative grid gap-3 md:grid-cols-3 md:gap-x-6">
              {/* lane guides: they organise the diagram, one per column */}
              <div aria-hidden className="pointer-events-none absolute inset-0 hidden grid-cols-3 gap-x-6 md:grid">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="ms-3.5 border-s border-dashed border-border" />
                ))}
              </div>
              {steps.map((step, i) => (
                <div key={i} className="relative contents">
                  <Lane step={step} />
                </div>
              ))}
            </div>
            <p className="relative mt-8 flex items-start gap-3 rounded-xl bg-card p-4 text-sm leading-relaxed text-muted-foreground ring-1 ring-border">
              <LockSimpleIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              {t("guard")}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
