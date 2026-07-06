"use client";

import { useEffect, useRef, useState } from "react";
import {
  PhoneIcon,
  PhoneSlashIcon,
  MicrophoneIcon,
} from "@phosphor-icons/react";
import { GeminiLiveCall } from "@/lib/gemini-live";

type Speaker = "asistan" | "arayan";
type Phase = "idle" | "ringing" | "incall" | "ended";
type Mode = "sim" | "live" | "gemini";

const SCRIPT: { who: Speaker; text: string }[] = [
  { who: "asistan", text: "Nova Diş Kliniği, hoş geldiniz. Ben kliniğin dijital asistanıyım. Nasıl yardımcı olabilirim?" },
  { who: "arayan", text: "Merhaba, dişim ağrıyor. Yarın için randevu alabilir miyim?" },
  { who: "asistan", text: "Geçmiş olsun. Yarın saat on dörtte muayene için yerimiz var. Ayırayım mı?" },
  { who: "arayan", text: "Olur, çok iyi olur. Adım Murat Demir." },
  { who: "asistan", text: "Teşekkürler Murat Bey. Yarın saat on dört, muayene randevunuz oluşturuldu. Onay mesajı gönderiyorum. İyi günler dilerim." },
];

function pickVoice(voices: SpeechSynthesisVoice[], preferFemale: boolean) {
  const tr = voices.filter((v) => v.lang.toLowerCase().startsWith("tr"));
  if (tr.length === 0) return voices[0] ?? null;
  if (tr.length === 1) return tr[0];
  const female = tr.find((v) => /female|kadın|yelda|filiz|emel/i.test(v.name));
  const male = tr.find((v) => /male|erkek|tolga|cem/i.test(v.name));
  return preferFemale ? female ?? tr[0] : male ?? tr[tr.length - 1];
}

export default function VoiceCallDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("sim");
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [caption, setCaption] = useState<{ who: Speaker; text: string } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef<number>(0);
  const geminiRef = useRef<GeminiLiveCall | null>(null);
  const startedRef = useRef(false); // aynı anda ikinci çağrının başlamasını engeller

  useEffect(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.getVoices();
    return () => hangUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  function startRingTone() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 425;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0;
    const t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const start = t + i * 2.8;
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.setValueAtTime(0, start + 1.2);
    }
    osc.start();
    ringNodesRef.current = { osc, gain };
  }

  function stopRingTone() {
    try {
      ringNodesRef.current?.gain.gain.cancelScheduledValues(0);
      ringNodesRef.current?.gain.gain.setValueAtTime(0, 0);
      ringNodesRef.current?.osc.stop();
    } catch {
      /* zaten durmuş */
    }
    ringNodesRef.current = null;
  }

  function startTimer() {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function speak(line: { who: Speaker; text: string }): Promise<void> {
    return new Promise((resolve) => {
      if (cancelledRef.current) return resolve();
      const u = new SpeechSynthesisUtterance(line.text);
      const voices = window.speechSynthesis.getVoices();
      const voice = pickVoice(voices, line.who === "asistan");
      if (voice) u.voice = voice;
      u.lang = "tr-TR";
      u.rate = line.who === "asistan" ? 1.02 : 1.05;
      u.pitch = line.who === "asistan" ? 1.05 : 0.85;
      u.onstart = () => {
        setSpeaker(line.who);
        setCaption(line);
      };
      u.onend = () => {
        setSpeaker(null);
        resolve();
      };
      u.onerror = () => {
        setSpeaker(null);
        resolve();
      };
      window.speechSynthesis.speak(u);
    });
  }

  async function runSimCall() {
    // Zil sesi ve "ringing" fazı startCall'da başladı; burada sadece sürdür.
    setMode("sim");
    await new Promise((r) => setTimeout(r, 2600));
    if (cancelledRef.current) return;
    stopRingTone();
    setPhase("incall");
    startTimer();
    for (const line of SCRIPT) {
      if (cancelledRef.current) return;
      await speak(line);
      await new Promise((r) => setTimeout(r, 350));
    }
    if (!cancelledRef.current) endCall();
  }

  function attachAnalyser(stream: MediaStream) {
    const ctx = getCtx();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    src.connect(analyser);
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
      barRefs.current.forEach((bar, i) => {
        if (!bar) return;
        const jitter = 0.55 + 0.45 * Math.sin(Date.now() / 90 + i * 1.7);
        bar.style.transform = `scaleY(${Math.max(0.15, Math.min(1, avg * 2.4 * jitter))})`;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  async function runLiveCall(clientSecret: string) {
    setMode("live");
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.addTrack(mic.getTracks()[0], mic);
      pc.ontrack = (e) => {
        if (audioElRef.current) audioElRef.current.srcObject = e.streams[0];
        attachAnalyser(e.streams[0]);
      };
      const dc = pc.createDataChannel("oai-events");
      dc.onopen = () => {
        stopRingTone();
        setPhase("incall");
        startTimer();
        dc.send(JSON.stringify({ type: "response.create" }));
      };
      dc.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data);
          if (ev.type === "conversation.item.input_audio_transcription.completed" && ev.transcript) {
            setCaption({ who: "arayan", text: ev.transcript.trim() });
          }
          if (ev.type === "response.output_audio_transcript.done" && ev.transcript) {
            setCaption({ who: "asistan", text: ev.transcript.trim() });
          }
          if (ev.type === "output_audio_buffer.started") setSpeaker("asistan");
          if (ev.type === "output_audio_buffer.stopped") setSpeaker(null);
        } catch {
          /* yoksay */
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const res = await fetch("https://api.openai.com/v1/realtime/calls?model=gpt-realtime", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      if (!res.ok) throw new Error("baglanti kurulamadi");
      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
    } catch {
      pcRef.current?.close();
      pcRef.current = null;
      micRef.current?.getTracks().forEach((t) => t.stop());
      micRef.current = null;
      if (!cancelledRef.current) runSimCall();
    }
  }

  async function runGeminiCall(cfg: {
    token: string;
    model: string;
    voice: string;
    instructions: string;
  }) {
    setMode("gemini");
    let opened = false;
    const fallback = () => {
      geminiRef.current?.stop();
      geminiRef.current = null;
      if (cancelledRef.current) return;
      if (opened) endCall();
      else runSimCall();
    };
    const call = new GeminiLiveCall(cfg.token, cfg.model, cfg.instructions, cfg.voice, {
      onOpen: () => {
        if (cancelledRef.current) return;
        opened = true;
        stopRingTone();
        setPhase("incall");
        startTimer();
      },
      onCaption: (who, text) => setCaption({ who, text }),
      onSpeaking: (speaking) => setSpeaker(speaking ? "asistan" : null),
      onClose: () => {
        if (!cancelledRef.current) endCall();
      },
      onError: fallback,
    });
    geminiRef.current = call;
    try {
      await call.start();
    } catch {
      fallback();
    }
  }

  async function startCall() {
    if (startedRef.current) return; // çift tık koruması
    startedRef.current = true;
    cancelledRef.current = false;
    setCaption(null);
    setPhase("ringing"); // butonu hemen gizle, ikinci tıklamayı önle
    getCtx().resume();
    startRingTone();

    // 1. Gemini Live (ücretsiz kotayla test için)
    try {
      const g = await fetch("/api/gemini/session", { method: "POST" }).then((r) => r.json());
      if (cancelledRef.current) return;
      if (g.mode === "gemini" && g.token) {
        runGeminiCall(g);
        return;
      }
    } catch {
      /* sıradaki sağlayıcıya geç */
    }

    // 2. OpenAI Realtime
    try {
      const s = await fetch("/api/realtime/session", { method: "POST" }).then((r) => r.json());
      if (cancelledRef.current) return;
      if (s.mode === "live" && s.clientSecret) {
        runLiveCall(s.clientSecret);
        return;
      }
    } catch {
      /* sim'e düş */
    }

    // 3. Anahtar yoksa: tarayıcı sesiyle örnek görüşme
    if (!cancelledRef.current) runSimCall();
  }

  function endCall() {
    setPhase("ended");
    setSpeaker(null);
    setTimeout(() => {
      setPhase("idle");
      setCaption(null);
    }, 1800);
    cleanup();
  }

  function hangUp() {
    cancelledRef.current = true;
    cleanup();
    setPhase("idle");
    setSpeaker(null);
    setCaption(null);
  }

  function cleanup() {
    startedRef.current = false; // yeni çağrıya izin ver
    stopRingTone();
    window.speechSynthesis?.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    cancelAnimationFrame(rafRef.current);
    geminiRef.current?.stop();
    geminiRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    setMuted(false);
  }

  function toggleMute() {
    const next = !muted;
    if (geminiRef.current) {
      geminiRef.current.setMuted(next);
    } else if (micRef.current) {
      micRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    } else {
      return;
    }
    setMuted(next);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const active = phase === "ringing" || phase === "incall";
  const orbState =
    speaker === "asistan"
      ? "orb-speaking"
      : phase === "incall" || phase === "ringing"
      ? ""
      : "orb-idle";
  const liveVoice = mode === "live" || mode === "gemini";

  return (
    <div className="card w-full max-w-md p-6 select-none shadow-[0_24px_60px_-24px_rgba(24,24,27,0.18)]">
      {/* Üst şerit */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold leading-tight">Nova Diş Kliniği</p>
          <p className="text-xs text-muted mt-0.5">
            {phase === "idle" && "Callora asistanı yanıtlar"}
            {phase === "ringing" && "Aranıyor..."}
            {phase === "incall" && (liveVoice ? "Canlı görüşme" : "Örnek görüşme")}
            {phase === "ended" && "Görüşme bitti"}
          </p>
        </div>
        {phase === "incall" ? (
          <span className="font-mono text-sm text-accent-strong tabular-nums">{mm}:{ss}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-accent" : "bg-muted-2"}`} />
            7/24
          </span>
        )}
      </div>

      {/* Orb */}
      <div className="relative flex items-center justify-center py-10">
        <div className="relative h-36 w-36">
          {phase === "ringing" && (
            <>
              <span className="ring-pulse absolute inset-0 rounded-full border border-accent/60" />
              <span
                className="ring-pulse absolute inset-0 rounded-full border border-accent/30"
                style={{ animationDelay: "0.45s" }}
              />
            </>
          )}
          <div className={`voice-orb absolute inset-0 ${orbState}`} />
          {/* Konuşma çubukları: orb üzerinde beyaz */}
          <div className="absolute inset-0 flex items-center justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                ref={(el) => {
                  barRefs.current[i] = el;
                }}
                className={`w-[5px] rounded-full bg-white/90 transition-opacity duration-300 ${
                  speaker ? "opacity-100" : "opacity-0"
                } ${speaker && mode !== "live" ? "wave-bar" : ""}`}
                style={{
                  height: `${[26, 42, 54, 38, 22][i]}px`,
                  animationDelay: `${i * 0.12}s`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Altyazı */}
      <div className="h-16 flex items-center justify-center px-2 text-center">
        {caption ? (
          <p className="text-sm leading-snug text-foreground/90">
            <span
              className={`mr-2 text-[11px] font-semibold uppercase tracking-wide ${
                caption.who === "asistan" ? "text-accent-strong" : "text-muted"
              }`}
            >
              {caption.who === "asistan" ? "Asistan" : "Siz"}
            </span>
            {caption.text}
          </p>
        ) : (
          <p className="text-sm text-muted">
            {phase === "idle"
              ? "Asistanın telefonu nasıl yanıtladığını dinleyin. Ses açık olsun."
              : phase === "ringing"
              ? "Hat çalıyor..."
              : ""}
          </p>
        )}
      </div>

      {/* Kontroller */}
      <div className="flex items-center justify-center gap-4 pt-4">
        {!active ? (
          <button
            onClick={startCall}
            className="h-14 w-14 rounded-full bg-accent-strong text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-[0_10px_24px_-10px_rgba(5,150,105,0.55)]"
            aria-label="Demoyu ara"
          >
            <PhoneIcon size={24} weight="fill" />
          </button>
        ) : (
          <>
            {liveVoice && (
              <button
                onClick={toggleMute}
                className={`h-11 w-11 rounded-full border flex items-center justify-center transition-colors ${
                  muted ? "border-warning text-warning" : "border-line text-muted hover:text-foreground"
                }`}
                aria-label="Sustur"
              >
                <MicrophoneIcon size={18} weight={muted ? "fill" : "regular"} />
              </button>
            )}
            <button
              onClick={hangUp}
              className="h-14 w-14 rounded-full bg-danger text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              aria-label="Kapat"
            >
              <PhoneSlashIcon size={24} weight="fill" />
            </button>
          </>
        )}
      </div>
      <p className="text-[11px] text-muted-2 text-center mt-4">
        {liveVoice && active
          ? "Mikrofonunuz açık, asistanla gerçekten konuşabilirsiniz."
          : "Tarayıcı sesiyle örnek görüşme. API anahtarı tanımlıysa mikrofonla gerçek konuşmaya döner."}
      </p>
      <audio ref={audioElRef} autoPlay className="hidden" />
    </div>
  );
}
