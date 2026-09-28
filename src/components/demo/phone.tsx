"use client";

import {
  ArrowCounterClockwiseIcon,
  BatteryFullIcon,
  CaretLeftIcon,
  CellSignalFullIcon,
  ChecksIcon,
  HeadsetIcon,
  LockSimpleIcon,
  PaperPlaneRightIcon,
  PhoneIcon,
  SealCheckIcon,
  SmileyIcon,
  VideoCameraIcon,
  WarningCircleIcon,
  WifiHighIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type FormEvent, type RefObject } from "react";
import { cn } from "cn";
import type { ActionLike } from "./action-summary";
import type { DemoBusiness } from "./demo-businesses";
import { WhatsAppText } from "./whatsapp-text";

export type ChatMessage = {
  id: string;
  role: "customer" | "assistant" | "notice";
  content: string;
  at: number;
  actions?: ActionLike[];
  tone?: "info" | "handover" | "error";
};

type Labels = {
  online: string;
  typing: string;
  today: string;
  placeholder: string;
  send: string;
  reset: string;
  tryAsking: string;
  welcome: string;
};

type Props = {
  business: DemoBusiness;
  messages: ChatMessage[];
  typing: boolean;
  suggestions: string[] | null;
  draft: string;
  inputRef: RefObject<HTMLInputElement | null>;
  locale: string;
  labels: Labels;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => void;
  onReset: () => void;
  onInteract: () => void;
};

function clock(at: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(at);
}

/** A phone running a WhatsApp-style chat. Purely presentational. */
export function Phone({
  business,
  messages,
  typing,
  suggestions,
  draft,
  inputRef,
  locale,
  labels,
  onDraftChange,
  onSend,
  onReset,
  onInteract,
}: Props) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages.length, typing, suggestions, reduceMotion]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSend(draft);
  }

  return (
    <div className="relative mx-auto w-full max-w-[352px] rounded-[3rem] bg-[linear-gradient(145deg,oklch(0.93_0.005_250),oklch(0.78_0.01_250)_45%,oklch(0.9_0.006_250))] p-[9px] shadow-[0_50px_100px_-30px_oklch(0.25_0.04_262/0.5),0_0_0_1px_oklch(0.6_0.01_250/0.35)] dark:bg-[linear-gradient(145deg,oklch(0.42_0.01_260),oklch(0.26_0.01_260)_45%,oklch(0.36_0.01_260))] dark:shadow-[0_50px_100px_-30px_oklch(0_0_0/0.8),0_0_0_1px_oklch(1_0_0/0.08)]">
      <div className="relative flex h-[min(660px,76dvh)] min-h-[520px] flex-col overflow-hidden rounded-[2.45rem] bg-wa-wall">
        {/* status bar */}
        <div className="relative flex h-10 shrink-0 items-center justify-between bg-wa-header px-7 pt-1 text-[12px] font-semibold" dir="ltr">
          <span>9:41</span>
          <span aria-hidden className="absolute left-1/2 top-2 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-[oklch(0.12_0.005_260)]" />
          <span className="flex items-center gap-1">
            <CellSignalFullIcon weight="fill" className="size-3.5" />
            <WifiHighIcon weight="bold" className="size-3.5" />
            <BatteryFullIcon weight="fill" className="size-4" />
          </span>
        </div>

        {/* chat header */}
        <header className="flex shrink-0 items-center gap-2.5 border-b border-black/5 bg-wa-header px-3 pb-2.5 pt-1.5 dark:border-white/5">
          <CaretLeftIcon className="size-5 shrink-0 text-wa-accent rtl:-scale-x-100" />
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", business.avatarClass)}>
            {business.initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-center gap-1 truncate text-[13.5px] font-semibold">
              <span dir="auto" className="truncate">{business.name}</span>
              <SealCheckIcon weight="fill" className="size-3.5 shrink-0 text-wa-accent" />
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={typing ? "typing" : "online"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn("text-[11.5px]", typing ? "text-wa-accent" : "text-wa-meta")}
              >
                {typing ? labels.typing : labels.online}
              </motion.p>
            </AnimatePresence>
          </div>
          <VideoCameraIcon className="size-5 text-wa-accent" />
          <PhoneIcon className="size-[18px] text-wa-accent" />
          <button
            type="button"
            onClick={onReset}
            aria-label={labels.reset}
            title={labels.reset}
            className="-me-1 flex size-8 items-center justify-center rounded-full text-wa-meta transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          >
            <ArrowCounterClockwiseIcon className="size-4" />
          </button>
        </header>

        {/* messages */}
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          className="wa-wallpaper no-scrollbar flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-3"
        >
          <p className="mx-auto w-fit rounded-md bg-wa-in/90 px-2.5 py-1 text-[11px] font-medium text-wa-meta shadow-sm">
            {labels.today}
          </p>
          <p className="mx-auto mb-2 max-w-[94%] rounded-lg bg-wa-notice px-3 py-2 text-center text-[11px] leading-relaxed text-wa-notice-foreground">
            <LockSimpleIcon weight="fill" className="me-1 inline size-3 align-[-1px]" />
            {labels.welcome}
          </p>

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                layout="position"
                initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={cn("flex", m.role === "customer" && "justify-end", m.role === "notice" && "justify-center")}
              >
                {m.role === "notice" ? (
                  <p
                    className={cn(
                      "my-1 max-w-[92%] rounded-lg px-3 py-1.5 text-center text-[11.5px] leading-relaxed shadow-sm",
                      m.tone === "error" && "bg-danger-soft text-destructive",
                      m.tone === "handover" && "bg-warning-soft text-foreground/85",
                      (!m.tone || m.tone === "info") && "bg-wa-in text-foreground/80",
                    )}
                  >
                    {m.tone === "error" ? (
                      <WarningCircleIcon className="me-1 inline size-3.5 align-[-2px]" />
                    ) : m.tone === "handover" ? (
                      <HeadsetIcon className="me-1 inline size-3.5 align-[-2px]" />
                    ) : null}
                    {m.content}
                  </p>
                ) : (
                  <div
                    className={cn(
                      "relative max-w-[84%] rounded-[14px] px-2.5 pb-1 pt-1.5 text-[13.5px] leading-[1.42] shadow-[0_1px_0.5px_oklch(0_0_0/0.13)]",
                      m.role === "customer" ? "rounded-se-[4px] bg-wa-out" : "rounded-ss-[4px] bg-wa-in",
                    )}
                  >
                    <p dir="auto" className="whitespace-pre-wrap break-words pe-1">
                      <WhatsAppText text={m.content} />
                    </p>
                    <span className="float-end -mb-0.5 ms-3 mt-1 flex items-center gap-0.5 text-[10px] text-wa-meta" dir="ltr">
                      {clock(m.at, locale)}
                      {m.role === "customer" && <ChecksIcon weight="bold" className="size-3.5 text-wa-read" />}
                    </span>
                    <span className="clear-both block" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {typing && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex"
              aria-label={labels.typing}
            >
              <div className="flex items-center gap-1 rounded-[14px] rounded-ss-[4px] bg-wa-in px-3.5 py-3 shadow-[0_1px_0.5px_oklch(0_0_0/0.13)]">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="wa-typing-dot size-1.5 rounded-full bg-wa-meta" style={{ animationDelay: `${i * 160}ms` }} />
                ))}
              </div>
            </motion.div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div className="pt-2">
              <p className="mb-1.5 px-1 text-center text-[11px] font-medium text-wa-meta">{labels.tryAsking}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    dir="auto"
                    onClick={() => onSend(s)}
                    className="rounded-full border border-wa-accent/35 bg-wa-in px-3 py-1.5 text-[12px] text-wa-accent-strong transition-colors hover:bg-wa-accent/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* composer */}
        <form onSubmit={submit} className="flex shrink-0 items-center gap-2 bg-wa-header px-2.5 pb-4 pt-2">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-wa-in px-3 ring-1 ring-black/5 dark:ring-white/5">
            <SmileyIcon className="size-5 shrink-0 text-wa-meta" />
            <label htmlFor="demo-composer" className="sr-only">
              {labels.placeholder}
            </label>
            <input
              id="demo-composer"
              ref={inputRef}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onFocus={onInteract}
              placeholder={labels.placeholder}
              dir="auto"
              maxLength={1000}
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-wa-meta"
            />
          </div>
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={labels.send}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-wa-accent text-white shadow-sm transition-transform active:scale-95 disabled:opacity-70"
          >
            <PaperPlaneRightIcon weight="fill" className="size-[18px] rtl:-scale-x-100" />
          </button>
        </form>
      </div>
    </div>
  );
}
