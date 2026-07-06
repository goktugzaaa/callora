import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";

export type GeminiCallbacks = {
  onOpen: () => void;
  onCaption: (who: "asistan" | "arayan", text: string) => void;
  onSpeaking: (speaking: boolean) => void;
  onClose: () => void;
  onError: (msg: string) => void;
};

function base64FromBytes(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Mikrofon örneklerini (native sampleRate, ör. 48kHz) 16kHz PCM16'ya indir.
// iOS Safari AudioContext'in istenen sampleRate'ini yok sayabildiği için elle yapılır.
function downsampleTo16kPCM(input: Float32Array, srcRate: number): Uint8Array {
  if (srcRate === 16000) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return new Uint8Array(out.buffer);
  }
  const ratio = srcRate / 16000;
  const newLen = Math.floor(input.length / ratio);
  const out = new Int16Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const frac = idx - i0;
    const sample = input[i0] * (1 - frac) + (input[i0 + 1] ?? input[i0]) * frac;
    const s = Math.max(-1, Math.min(1, sample));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return new Uint8Array(out.buffer);
}

/**
 * Tarayıcıda Gemini Live ile gerçek zamanlı sesli görüşme.
 * Mobil uyumu: mikrofon stream'i ve AudioContext DIŞARIDAN (kullanıcı jesti içinde
 * açılmış olarak) verilir — iOS getUserMedia/AudioContext jest kısıtları için şart.
 * Giriş: 16 kHz mono PCM16 (elle downsample). Çıkış: 24 kHz PCM16, sırayla oynatılır.
 */
export class GeminiLiveCall {
  private session: Session | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private sink: GainNode | null = null;
  private nextStart = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private muted = false;
  private outBuf = "";
  private inBuf = "";
  private stopped = false;

  constructor(
    private token: string,
    private model: string,
    private instructions: string,
    private voice: string,
    private cb: GeminiCallbacks
  ) {}

  // stream + ctx kullanıcı jesti içinde açılmış olmalı (startCall onClick).
  async start(stream: MediaStream, ctx: AudioContext) {
    this.stream = stream;
    this.ctx = ctx;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* yoksay */
      }
    }

    const ai = new GoogleGenAI({
      apiKey: this.token,
      httpOptions: { apiVersion: "v1alpha" },
    });

    this.session = await ai.live.connect({
      model: this.model,
      callbacks: {
        onopen: () => {
          if (this.stopped) return;
          this.startMic();
          this.cb.onOpen();
        },
        onmessage: (m: LiveServerMessage) => this.onMessage(m),
        onerror: (e: ErrorEvent) => this.cb.onError(e?.message ?? "Gemini bağlantı hatası"),
        onclose: () => this.cb.onClose(),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: this.instructions,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voice } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });
  }

  private startMic() {
    if (!this.ctx || !this.stream) return;
    const rate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (this.muted || !this.session || this.stopped) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = downsampleTo16kPCM(input, rate);
      this.session.sendRealtimeInput({
        audio: { data: base64FromBytes(pcm), mimeType: "audio/pcm;rate=16000" },
      });
    };
    // Mikrofonu hoparlöre geri vermemek için sıfır kazançlı çıkışa bağla.
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
    this.sink.connect(this.ctx.destination);
  }

  private onMessage(m: LiveServerMessage) {
    const audioB64 = m.data;
    if (audioB64) {
      this.cb.onSpeaking(true);
      this.play(audioB64);
    }

    const sc = m.serverContent;
    if (sc?.outputTranscription?.text) {
      this.outBuf += sc.outputTranscription.text;
      this.cb.onCaption("asistan", this.outBuf.trim());
    }
    if (sc?.inputTranscription?.text) {
      this.inBuf += sc.inputTranscription.text;
      this.cb.onCaption("arayan", this.inBuf.trim());
    }
    if (sc?.interrupted) {
      this.stopPlayback();
      this.outBuf = "";
    }
    if (sc?.turnComplete) {
      this.outBuf = "";
      this.inBuf = "";
    }
  }

  private play(b64: string) {
    if (!this.ctx) return;
    const bytes = bytesFromBase64(b64);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const float = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float[i] = pcm[i] / 32768;

    // 24 kHz buffer; context farklı bir orandaysa tarayıcı oynatırken yeniden örnekler.
    const buffer = this.ctx.createBuffer(1, float.length, 24000);
    buffer.copyToChannel(float, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    const start = Math.max(now, this.nextStart);
    src.start(start);
    this.nextStart = start + buffer.duration;
    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0) this.cb.onSpeaking(false);
    };
  }

  private stopPlayback() {
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* zaten durmuş */
      }
    });
    this.sources.clear();
    this.nextStart = 0;
    this.cb.onSpeaking(false);
  }

  setMuted(m: boolean) {
    this.muted = m;
  }

  // Sadece kendi düğümlerini bırakır; stream ve ctx sahibi (bileşen) yönetir.
  stop() {
    this.stopped = true;
    this.stopPlayback();
    try {
      this.processor?.disconnect();
    } catch {
      /* yoksay */
    }
    try {
      this.source?.disconnect();
    } catch {
      /* yoksay */
    }
    try {
      this.sink?.disconnect();
    } catch {
      /* yoksay */
    }
    try {
      this.session?.close();
    } catch {
      /* yoksay */
    }
    this.session = null;
  }
}
