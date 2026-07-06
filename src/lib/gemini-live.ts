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

function floatTo16BitPCM(input: Float32Array): Uint8Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return new Uint8Array(out.buffer);
}

/**
 * Tarayıcıda Gemini Live ile gerçek zamanlı sesli görüşme.
 * Giriş: mikrofon -> 16 kHz mono PCM16. Çıkış: 24 kHz PCM16, sırayla oynatılır.
 */
export class GeminiLiveCall {
  private session: Session | null = null;
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
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

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    this.inputCtx = new AudioContext({ sampleRate: 16000 });
    this.outputCtx = new AudioContext({ sampleRate: 24000 });
    await this.inputCtx.resume();
    await this.outputCtx.resume();

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
    if (!this.inputCtx || !this.stream) return;
    this.source = this.inputCtx.createMediaStreamSource(this.stream);
    this.processor = this.inputCtx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (this.muted || !this.session) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = floatTo16BitPCM(input);
      this.session.sendRealtimeInput({
        audio: { data: base64FromBytes(pcm), mimeType: "audio/pcm;rate=16000" },
      });
    };
    this.source.connect(this.processor);
    this.processor.connect(this.inputCtx.destination);
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
    if (!this.outputCtx) return;
    const bytes = bytesFromBase64(b64);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const float = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float[i] = pcm[i] / 32768;

    const buffer = this.outputCtx.createBuffer(1, float.length, 24000);
    buffer.copyToChannel(float, 0);
    const src = this.outputCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.outputCtx.destination);

    const now = this.outputCtx.currentTime;
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
    this.stream?.getTracks().forEach((t) => t.stop());
    try {
      this.session?.close();
    } catch {
      /* yoksay */
    }
    try {
      this.inputCtx?.close();
    } catch {
      /* yoksay */
    }
    try {
      this.outputCtx?.close();
    } catch {
      /* yoksay */
    }
    this.session = null;
  }
}
