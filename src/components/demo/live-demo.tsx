"use client";

import {
  CalendarCheckIcon,
  CheckCircleIcon,
  HeadsetIcon,
  ListMagnifyingGlassIcon,
  StorefrontIcon,
  UserPlusIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "cn";
import { directionOf, type Locale } from "@/i18n/locales";
import { summarizeAction, type ActionLike } from "./action-summary";
import { DEMO_BUSINESSES } from "./demo-businesses";
import { INTRO_SCRIPTS, type ScriptLine } from "./intro-scripts";
import { Phone, type ChatMessage } from "./phone";

// Hero demo: first plays a short, real-shaped conversation, then hands the
// phone to the visitor. Live messages go through /api/demo/chat, the same
// pipeline WhatsApp uses. Backend calls float next to the phone as they happen.

type Phase = "idle" | "intro" | "live";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  getBusinessInfo: StorefrontIcon,
  getServices: ListMagnifyingGlassIcon,
  checkAvailability: CalendarCheckIcon,
  createBooking: CheckCircleIcon,
  getMyAppointments: ListMagnifyingGlassIcon,
  rescheduleBooking: CalendarCheckIcon,
  cancelBooking: XCircleIcon,
  createLead: UserPlusIcon,
  requestHumanHandover: HeadsetIcon,
};

const uid = () => crypto.randomUUID();

function toMessage(line: ScriptLine, at: number): ChatMessage {
  return { id: uid(), role: line.role, content: line.text, at, actions: line.role === "assistant" ? line.actions : undefined };
}

export function LiveDemo() {
  const locale = useLocale() as Locale;
  const t = useTranslations("simulator");
  const ta = useTranslations("actions");
  const reduceMotion = useReducedMotion();
  const script = INTRO_SCRIPTS[locale];

  const [slug, setSlug] = useState(script.business);
  const [phase, setPhase] = useState<Phase>("idle");
  const [intro, setIntro] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [chips, setChips] = useState<(ActionLike & { key: string })[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const sessions = useRef<Record<string, string>>({});
  const fromX = directionOf(locale) === "rtl" ? -16 : 16;
  const inView = useInView(rootRef, { once: true, amount: 0.35 });

  const business = DEMO_BUSINESSES.find((b) => b.slug === slug) ?? DEMO_BUSINESSES[0];

  const showChips = useCallback((actions: ActionLike[] | undefined) => {
    if (actions?.length) setChips(actions.slice(-3).map((a) => ({ ...a, key: uid() })));
  }, []);

  const clearTimers = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };

  const goLive = useCallback(() => {
    setPhase("live");
    setThreads((prev) => ({
      ...prev,
      [script.business]: prev[script.business] ?? [
        { id: uid(), role: "notice", content: t("yourTurn"), at: Date.now(), tone: "info" },
      ],
    }));
  }, [script.business, t]);

  const finishIntro = useCallback(() => {
    clearTimers();
    const now = Date.now();
    setIntro(script.lines.map((line, i) => toMessage(line, now - (script.lines.length - i) * 45_000)));
    setTyping(false);
    const lastWithActions = [...script.lines].reverse().find((l) => l.role === "assistant" && l.actions?.length);
    showChips(lastWithActions?.role === "assistant" ? lastWithActions.actions : undefined);
    goLive();
  }, [goLive, script.lines, showChips]);

  // Play the scripted intro once, when the phone first scrolls into view.
  const started = useRef(false);
  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    // Everything below runs on timers: the effect only subscribes to time.
    const schedule = (delay: number, fn: () => void) => timers.current.push(window.setTimeout(fn, delay));
    if (reduceMotion) {
      schedule(0, finishIntro);
      return;
    }
    schedule(0, () => setPhase("intro"));
    let at = 700;
    for (const line of script.lines) {
      if (line.role === "customer") {
        schedule(at, () => setIntro((prev) => [...prev, toMessage(line, Date.now())]));
        at += 850;
      } else {
        schedule(at, () => {
          setTyping(true);
          showChips(line.actions);
        });
        at += Math.min(2400, 900 + line.text.length * 11);
        schedule(at, () => {
          setTyping(false);
          setIntro((prev) => [...prev, toMessage(line, Date.now())]);
        });
        at += 1300;
      }
    }
    schedule(at, goLive);
  }, [inView, reduceMotion, script.lines, finishIntro, goLive, showChips]);

  useEffect(() => clearTimers, []);

  /** Any interaction during the intro skips straight to the live chat. */
  const interact = () => {
    if (phase !== "live") finishIntro();
  };

  function append(target: string, message: ChatMessage) {
    setThreads((prev) => ({ ...prev, [target]: [...(prev[target] ?? []), message] }));
  }

  /** One backend conversation per demo business, kept until "New chat". */
  function sessionFor(target: string): string {
    sessions.current[target] ??= uid();
    return sessions.current[target];
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || typing) return;
    interact();
    const target = slug;
    setDraft("");
    append(target, { id: uid(), role: "customer", content, at: Date.now() });
    setTyping(true);

    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: target, sessionId: sessionFor(target), text: content }),
      });
      if (res.status === 429) {
        append(target, { id: uid(), role: "notice", content: t("rateLimited"), at: Date.now(), tone: "error" });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as
        | { status: "replied"; reply: { id: string; content: string; actions: ActionLike[] } }
        | { status: "skipped"; reason: string };

      if (data.status === "replied") {
        showChips(data.reply.actions);
        append(target, { id: data.reply.id, role: "assistant", content: data.reply.content, at: Date.now(), actions: data.reply.actions });
        if (data.reply.actions.some((a) => a.tool === "requestHumanHandover" && a.ok)) {
          append(target, { id: uid(), role: "notice", content: t("handover"), at: Date.now(), tone: "handover" });
        }
      } else if (data.reason === "human_mode") {
        append(target, { id: uid(), role: "notice", content: t("handover"), at: Date.now(), tone: "handover" });
      }
    } catch {
      append(target, { id: uid(), role: "notice", content: t("unavailable"), at: Date.now(), tone: "error" });
    } finally {
      setTyping(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }

  function reset() {
    interact();
    setIntro([]);
    setChips([]);
    delete sessions.current[slug];
    setThreads((prev) => ({ ...prev, [slug]: [] }));
  }

  function switchBusiness(next: string) {
    interact();
    setSlug(next);
    setChips([]);
  }

  const liveMessages = threads[slug] ?? [];
  const messages = slug === script.business ? [...intro, ...liveMessages] : liveMessages;
  const hasCustomerMessages = liveMessages.some((m) => m.role === "customer");
  const suggestions = phase === "live" && !hasCustomerMessages && !typing ? business.suggestions : null;
  const translate = (key: string, values?: Record<string, string | number>) => (ta.has(key) ? ta(key, values) : key);

  return (
    <div ref={rootRef} data-phase={phase} className="relative mx-auto w-full max-w-[352px] xl:me-8 xl:ms-auto">
      {/* business picker */}
      <div role="group" aria-label={t("pickBusiness")} className="mb-5 flex justify-center gap-1.5">
        {DEMO_BUSINESSES.map((b) => (
          <button
            key={b.slug}
            type="button"
            aria-pressed={b.slug === slug}
            onClick={() => switchBusiness(b.slug)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              b.slug === slug
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card/70 text-muted-foreground backdrop-blur hover:text-foreground",
            )}
          >
            {b.city}
          </button>
        ))}
      </div>

      <div className="relative">
        <Phone
          business={business}
          messages={messages}
          typing={typing}
          suggestions={suggestions}
          draft={draft}
          inputRef={inputRef}
          locale={locale}
          labels={{
            online: t("online"),
            typing: t("typing"),
            today: t("today"),
            placeholder: t("placeholder"),
            send: t("send"),
            reset: t("reset"),
            tryAsking: t("tryAsking"),
            welcome: t("welcome"),
          }}
          onDraftChange={setDraft}
          onSend={send}
          onReset={reset}
          onInteract={interact}
        />

        {/* backend calls, floating beside the phone on large screens */}
        <div
          aria-live="polite"
          aria-label={t("actionsTitle")}
          className="mt-5 flex flex-col gap-2 xl:absolute xl:end-[calc(100%-2rem)] xl:top-[30%] xl:mt-0 xl:w-[258px]"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {chips.map((action, i) => {
              const Icon = ICONS[action.tool] ?? ListMagnifyingGlassIcon;
              const { label, detail } = summarizeAction(action, translate);
              return (
                <motion.div
                  key={action.key}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, x: fromX, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26, delay: reduceMotion ? 0 : i * 0.35 }}
                  className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card/90 p-3 shadow-[0_18px_40px_-18px_oklch(0.3_0.04_262/0.35)] backdrop-blur-md dark:shadow-[0_18px_40px_-18px_oklch(0_0_0/0.7)]"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      action.ok ? "bg-ember-soft text-primary" : "bg-danger-soft text-destructive",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block font-mono text-[11px] text-muted-foreground" dir="ltr">
                      {action.tool}()
                    </span>
                    <span className="mt-0.5 block text-[13px] font-medium">{label}</span>
                    {detail && (
                      <span dir="auto" className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {detail}
                      </span>
                    )}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
