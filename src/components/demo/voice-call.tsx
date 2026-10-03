"use client";

import { google } from "@ai-sdk/google";
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  HeadsetIcon,
  ListMagnifyingGlassIcon,
  MicrophoneIcon,
  MicrophoneSlashIcon,
  PhoneDisconnectIcon,
  PhoneIcon,
  StorefrontIcon,
  UserPlusIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { experimental_useRealtime as useRealtime } from "@ai-sdk/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { CALL_START_MARKER, MAX_CALL_MS, VOICE_MODEL } from "@/lib/voice/constants";
import { summarizeAction, type ActionLike } from "./action-summary";
import { DEMO_BUSINESSES } from "./demo-businesses";

// Browser phone call with the same receptionist that answers WhatsApp.
// Audio goes straight to Gemini Live; tool calls go to /api/voice/tool and run
// on the server against the demo business; the transcript is saved afterwards.

const model = google.experimental_realtime(VOICE_MODEL);
const sessionConfig = {
  outputModalities: ["audio" as const],
  inputAudioTranscription: {},
  outputAudioTranscription: {},
};

const ASSISTANT_NAMES: Record<string, string> = {
  "lumiere-amman": "Layla",
  "serenity-dubai": "Noor",
  "nova-istanbul": "Elif",
};

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

type Phase = "idle" | "starting" | "live" | "ended";
type ErrorKind = "mic" | "unavailable" | "rateLimited";
type LoggedAction = ActionLike & { key: string; assistantIndex: number };

function textOf(message: { parts: { type: string; text?: string }[] }): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

function errorKind(error: Error): ErrorKind {
  if (/setup: 429/.test(error.message)) return "rateLimited";
  return "unavailable";
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function VoiceCall() {
  const t = useTranslations("voice");
  const ta = useTranslations("actions");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();

  const [slug, setSlug] = useState(locale === "tr" ? "nova-istanbul" : "lumiere-amman");
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<ErrorKind | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [actions, setActions] = useState<LoggedAction[]>([]);
  const greeted = useRef(false);
  const assistantCount = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const endCallRef = useRef<() => void>(() => {});

  const business = DEMO_BUSINESSES.find((b) => b.slug === slug) ?? DEMO_BUSINESSES[0];
  const assistantName = ASSISTANT_NAMES[slug] ?? "Callora";

  const api = useMemo(
    () => ({ token: `/api/voice/token?business=${slug}&session=${sessionId}&locale=${locale}` }),
    [slug, sessionId, locale],
  );

  const realtime = useRealtime({
    model,
    api,
    sessionConfig,
    onToolCall: async ({ toolCall }) => {
      const response = await fetch("/api/voice/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: slug,
          session: sessionId,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          args: toolCall.args ?? {},
        }),
      });
      const output: unknown = response.ok
        ? await response.json()
        : { ok: false, error: "tool_failed", message: "The booking system did not respond. Offer a call back." };
      const ok = (output as { ok?: boolean } | null)?.ok !== false;
      setActions((prev) => [
        ...prev,
        {
          key: toolCall.toolCallId,
          tool: toolCall.toolName,
          ok,
          input: toolCall.args ?? {},
          output,
          assistantIndex: assistantCount.current,
        },
      ]);
      return output;
    },
    onError: (e) => {
      setError(errorKind(e));
    },
  });

  const { status, messages, isPlaying, isCapturing } = realtime;

  // Captions without the hidden "call connected" cue.
  const captions = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ id: m.id, role: m.role, text: textOf(m) }))
        .filter((m) => m.text !== "" && m.text !== CALL_START_MARKER),
    [messages],
  );
  useEffect(() => {
    assistantCount.current = captions.filter((c) => c.role === "assistant").length;
  }, [captions]);

  const saveTranscript = useCallback(() => {
    const assistantCaptions = captions.filter((c) => c.role === "assistant");
    const turns = captions.map((c) => {
      const index = c.role === "assistant" ? assistantCaptions.indexOf(c) : -1;
      return {
        role: c.role === "user" ? ("customer" as const) : ("assistant" as const),
        text: c.text,
        actions: actions
          .filter((a) => c.role === "assistant" && Math.min(a.assistantIndex, assistantCaptions.length - 1) === index)
          .map(({ tool, ok, input, output }) => ({ tool, ok, input, output })),
      };
    });
    if (turns.length === 0) return;
    void fetch("/api/voice/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business: slug, session: sessionId, turns }),
      keepalive: true,
    }).catch(() => {});
  }, [actions, captions, sessionId, slug]);

  const endCall = useCallback(async () => {
    if (phase !== "live" && phase !== "starting") return;
    setPhase("ended");
    await realtime.close().catch(() => realtime.disconnect());
    saveTranscript();
  }, [phase, realtime, saveTranscript]);

  async function startCall() {
    setError(null);
    setActions([]);
    greeted.current = false;
    setPhase("starting");
    let stream: MediaStream;
    try {
      // Ask for the microphone inside the click, before anything async (iOS Safari).
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError("mic");
      setPhase("idle");
      return;
    }
    await realtime.connect({ stream });
    void realtime.resumePlayback().catch(() => {});
  }

  function callAgain() {
    setSessionId(crypto.randomUUID());
    startedAtRef.current = null;
    setStartedAt(null);
    setActions([]);
    setPhase("idle");
  }

  useEffect(() => {
    endCallRef.current = () => void endCall();
  }, [endCall]);

  // Follow the session: connected -> live (assistant greets first),
  // dropped while live -> ended, failed while starting -> back to idle.
  // Updates are deferred one tick: they react to the session, not to render.
  useEffect(() => {
    let next: (() => void) | null = null;
    if (status === "connected" && phase === "starting") {
      if (!greeted.current) {
        greeted.current = true;
        realtime.sendTextMessage(CALL_START_MARKER);
      }
      next = () => {
        const at = Date.now();
        startedAtRef.current = at;
        setStartedAt(at);
        setNow(at);
        setPhase("live");
      };
    } else if (phase === "live" && (status === "disconnected" || status === "error")) {
      next = () => {
        setPhase("ended");
        saveTranscript();
      };
    } else if (phase === "starting" && error) {
      realtime.disconnect();
      next = () => setPhase("idle");
    }
    if (!next) return;
    const id = window.setTimeout(next, 0);
    return () => window.clearTimeout(id);
  }, [status, phase, error, realtime, saveTranscript]);

  // Call clock; demo calls hang up on their own after MAX_CALL_MS.
  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (startedAtRef.current && at - startedAtRef.current >= MAX_CALL_MS) endCallRef.current();
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const elapsed = startedAt ? now - startedAt : 0;

  const translate = (key: string, values?: Record<string, string | number>) => (ta.has(key) ? ta(key, values) : key);
  const visibleCaptions = captions.slice(-4);
  const chips = actions.slice(-3);
  const live = phase === "live";

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      {/* business picker (only between calls) */}
      <div role="group" aria-label={t("pick")} className="mb-5 flex justify-center gap-1.5">
        {DEMO_BUSINESSES.map((b) => (
          <button
            key={b.slug}
            type="button"
            aria-pressed={b.slug === slug}
            disabled={phase === "starting" || live}
            onClick={() => {
              setSlug(b.slug);
              setSessionId(crypto.randomUUID());
              setPhase("idle");
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
              b.slug === slug
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {b.city}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_40px_80px_-40px_oklch(0.3_0.04_262/0.45)] dark:shadow-[0_40px_80px_-40px_oklch(0_0_0/0.75)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 start-1/2 size-72 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.72_0.13_40/0.18),transparent)] rtl:translate-x-1/2"
        />

        {/* who is on the line */}
        <div className="relative flex flex-col items-center pt-2 text-center">
          <div className="relative flex size-24 items-center justify-center">
            {live && isPlaying && !reduceMotion && (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:1.6s]" />
                <span className="absolute -inset-2 animate-ping rounded-full bg-primary/10 [animation-delay:0.4s] [animation-duration:1.6s]" />
              </>
            )}
            <span
              className={cn(
                "relative flex size-20 items-center justify-center rounded-full text-xl font-semibold ring-4 ring-card",
                business.avatarClass,
              )}
            >
              {business.initials}
            </span>
          </div>
          <p className="mt-4 text-lg font-semibold tracking-tight">{business.name}</p>
          <p className="text-sm text-muted-foreground">{t("assistantRole", { name: assistantName })}</p>
          <p className="mt-2 h-5 font-mono text-xs text-muted-foreground" aria-live="polite" dir="ltr">
            {phase === "starting" && t("connecting")}
            {live && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-success" />
                {formatDuration(elapsed)} · {isPlaying ? t("speaking", { name: assistantName }) : t("listening")}
              </span>
            )}
            {phase === "ended" && t("ended")}
          </p>
        </div>

        {/* captions */}
        <div className="relative mt-5 min-h-[9.5rem] space-y-2 rounded-2xl bg-surface-sunken p-3" aria-live="polite">
          {visibleCaptions.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm leading-relaxed text-muted-foreground">
              {phase === "idle" ? t("hint") : t("waiting")}
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {visibleCaptions.map((c) => (
                <motion.p
                  key={c.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm leading-relaxed"
                  dir="auto"
                >
                  <span className={cn("me-1.5 font-medium", c.role === "assistant" ? "text-primary" : "text-foreground")}>
                    {c.role === "assistant" ? assistantName : t("you")}:
                  </span>
                  <span className="text-foreground/85">{c.text}</span>
                </motion.p>
              ))}
            </AnimatePresence>
          )}
        </div>

        {error && (
          <p className="relative mt-3 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-destructive">
            <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
            {t(error === "mic" ? "micDenied" : error)}
          </p>
        )}

        {/* controls */}
        <div className="relative mt-6 flex items-center justify-center gap-3">
          {phase === "idle" && (
            <Button size="lg" onClick={startCall} className="h-12 px-7">
              <PhoneIcon weight="fill" className="size-4" />
              {t("call", { name: assistantName })}
            </Button>
          )}
          {phase === "starting" && (
            <Button size="lg" disabled className="h-12 px-7">
              <PhoneIcon weight="fill" className="size-4 animate-pulse" />
              {t("connecting")}
            </Button>
          )}
          {live && (
            <>
              <Button
                variant="outline"
                size="icon-lg"
                aria-label={isCapturing ? t("mute") : t("unmute")}
                onClick={() => (isCapturing ? realtime.stopAudioCapture() : void realtime.resumeAudioCapture())}
              >
                {isCapturing ? <MicrophoneIcon className="size-5" /> : <MicrophoneSlashIcon className="size-5" />}
              </Button>
              <Button
                size="lg"
                onClick={() => void endCall()}
                className="h-12 bg-destructive px-7 text-white hover:bg-destructive/90"
              >
                <PhoneDisconnectIcon weight="fill" className="size-4" />
                {t("end")}
              </Button>
            </>
          )}
          {phase === "ended" && (
            <Button size="lg" variant="outline" onClick={callAgain} className="h-12 px-7">
              <PhoneIcon className="size-4" />
              {t("again")}
            </Button>
          )}
        </div>
        <p className="relative mt-4 text-center text-xs leading-relaxed text-muted-foreground">{t("note")}</p>
      </div>

      {/* backend calls made during the conversation */}
      <div aria-live="polite" className="mt-4 flex flex-col gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {chips.map((action) => {
            const Icon = ICONS[action.tool] ?? ListMagnifyingGlassIcon;
            const { label, detail } = summarizeAction(action, translate);
            return (
              <motion.div
                key={action.key}
                layout
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card/90 p-3 shadow-[0_18px_40px_-18px_oklch(0.3_0.04_262/0.35)] backdrop-blur-md"
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
  );
}
