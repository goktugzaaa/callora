// Callora Ses Köprüsü
// Twilio Media Streams (g711 ulaw) <-> OpenAI Realtime API arasında sesi taşır.
// Çağrı bitince dökümü ve sonucu Callora paneline yazar.
//
// Ortam değişkenleri:
//   OPENAI_API_KEY       - zorunlu
//   PANEL_URL            - Callora panelinin adresi (örn. https://callora.example.com)
//   BRIDGE_SHARED_SECRET - panel ile aynı değer
//   PORT                 - varsayılan 8081

import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";

const {
  OPENAI_API_KEY,
  PANEL_URL = "http://localhost:3000",
  BRIDGE_SHARED_SECRET,
  PORT = 8081,
} = process.env;

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY gerekli");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Callora bridge ayakta\n");
});
const wss = new WebSocketServer({ server });

async function panelFetch(path, options = {}) {
  const res = await fetch(`${PANEL_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-bridge-secret": BRIDGE_SHARED_SECRET ?? "",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Panel ${path} -> ${res.status}`);
  return res.json();
}

wss.on("connection", (twilioWs) => {
  console.log("Twilio bağlandı");

  let openaiWs = null;
  let streamSid = null;
  let businessId = null;
  let fromNumber = "";
  let callStart = Date.now();
  let appointmentId = null;
  const transcript = [];

  function closeAll() {
    try { openaiWs?.close(); } catch {}
    try { twilioWs.close(); } catch {}
  }

  async function connectOpenAI() {
    let config;
    try {
      config = await panelFetch(`/api/bridge/config?businessId=${businessId}`);
    } catch (err) {
      console.error("Yapılandırma alınamadı:", err.message);
      closeAll();
      return;
    }

    openaiWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-realtime", {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    });

    openaiWs.on("open", () => {
      openaiWs.send(
        JSON.stringify({
          type: "session.update",
          session: {
            type: "realtime",
            instructions: config.instructions,
            audio: {
              input: {
                format: { type: "audio/pcmu" },
                transcription: { model: "gpt-4o-mini-transcribe", language: "tr" },
                turn_detection: { type: "server_vad", silence_duration_ms: 600 },
              },
              output: {
                format: { type: "audio/pcmu" },
                voice: config.voice ?? "coral",
              },
            },
            tools: [
              {
                type: "function",
                name: "book_appointment",
                description:
                  "Müşteri randevu bilgilerini onayladığında randevuyu kaydeder. Tüm alanlar teyit edilmeden çağırma.",
                parameters: {
                  type: "object",
                  properties: {
                    customerName: { type: "string", description: "Müşterinin adı soyadı" },
                    customerPhone: { type: "string", description: "Müşterinin telefon numarası" },
                    serviceName: { type: "string", description: "İstenen hizmetin adı" },
                    startsAtISO: {
                      type: "string",
                      description: "Randevu başlangıcı, ISO 8601 (örn. 2026-07-03T14:30:00+03:00)",
                    },
                    notes: { type: "string", description: "Ek notlar" },
                  },
                  required: ["customerName", "customerPhone", "serviceName", "startsAtISO"],
                },
              },
            ],
          },
        })
      );
      // Asistan çağrıyı karşılasın
      openaiWs.send(JSON.stringify({ type: "response.create" }));
    });

    openaiWs.on("message", async (raw) => {
      let ev;
      try {
        ev = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (ev.type) {
        case "response.output_audio.delta":
          if (streamSid && ev.delta) {
            twilioWs.send(
              JSON.stringify({
                event: "media",
                streamSid,
                media: { payload: ev.delta },
              })
            );
          }
          break;

        case "input_audio_buffer.speech_started":
          // Arayan konuşmaya başladı: asistanın sesini kes (barge-in)
          if (streamSid) {
            twilioWs.send(JSON.stringify({ event: "clear", streamSid }));
          }
          break;

        case "conversation.item.input_audio_transcription.completed":
          if (ev.transcript) transcript.push({ role: "arayan", text: ev.transcript.trim() });
          break;

        case "response.output_audio_transcript.done":
          if (ev.transcript) transcript.push({ role: "asistan", text: ev.transcript.trim() });
          break;

        case "response.function_call_arguments.done": {
          if (ev.name !== "book_appointment") break;
          let result = { ok: false, error: "bilinmeyen hata" };
          try {
            const args = JSON.parse(ev.arguments);
            const data = await panelFetch("/api/bridge/book", {
              method: "POST",
              body: JSON.stringify({ businessId, ...args }),
            });
            appointmentId = data.appointmentId;
            result = { ok: true, message: "Randevu başarıyla kaydedildi." };
          } catch (err) {
            console.error("Randevu kaydedilemedi:", err.message);
            result = { ok: false, error: "Randevu kaydedilemedi, müşteriden numara alıp geri dönüş sözü ver." };
          }
          openaiWs.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: ev.call_id,
                output: JSON.stringify(result),
              },
            })
          );
          openaiWs.send(JSON.stringify({ type: "response.create" }));
          break;
        }

        case "error":
          console.error("OpenAI hata:", JSON.stringify(ev.error ?? ev));
          break;
      }
    });

    openaiWs.on("close", () => closeAll());
    openaiWs.on("error", (err) => {
      console.error("OpenAI WS hatası:", err.message);
      closeAll();
    });
  }

  twilioWs.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.event) {
      case "start":
        streamSid = msg.start.streamSid;
        businessId = msg.start.customParameters?.businessId;
        fromNumber = msg.start.customParameters?.from ?? "";
        callStart = Date.now();
        console.log(`Çağrı başladı: ${streamSid} (işletme: ${businessId})`);
        if (!businessId) {
          console.error("businessId parametresi yok, çağrı kapatılıyor");
          closeAll();
          return;
        }
        connectOpenAI();
        break;

      case "media":
        if (openaiWs?.readyState === WebSocket.OPEN) {
          openaiWs.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: msg.media.payload,
            })
          );
        }
        break;

      case "stop":
        console.log(`Çağrı bitti: ${streamSid}`);
        closeAll();
        break;
    }
  });

  twilioWs.on("close", async () => {
    try { openaiWs?.close(); } catch {}
    if (!businessId) return;
    // Çağrı kaydını panele yaz
    try {
      await panelFetch("/api/bridge/call-log", {
        method: "POST",
        body: JSON.stringify({
          businessId,
          twilioSid: streamSid,
          fromNumber,
          durationSec: Math.round((Date.now() - callStart) / 1000),
          transcript,
          outcome: appointmentId ? "randevu" : transcript.length > 0 ? "bilgi" : "kacirilan",
          appointmentId,
        }),
      });
      console.log("Çağrı kaydı panele yazıldı");
    } catch (err) {
      console.error("Çağrı kaydı yazılamadı:", err.message);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Callora bridge ${PORT} portunda dinliyor`);
});
