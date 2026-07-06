# Callora — İşletmeler için 7/24 Yapay Zekâ Telefon Asistanı

Kaçırılan her çağrı, kaçırılan bir müşteridir. Callora; klinik, kuaför, veteriner, oto servis gibi randevuyla çalışan işletmelerin telefonlarını doğal Türkçe konuşan yapay zekâ ile karşılar, randevu alır ve her görüşmeyi panele işler.

## Bileşenler

| Parça | Ne yapar |
|---|---|
| `src/` (Next.js) | Tanıtım sitesi + işletme paneli + API |
| `bridge/` | Twilio Media Streams ↔ OpenAI Realtime ses köprüsü (gerçek telefon çağrıları için) |
| `prisma/` | SQLite veritabanı şeması + demo verisi |

## Hızlı başlangıç (yerel)

```bash
npm install
npx prisma migrate dev      # veritabanını oluşturur
npm run db:seed             # demo verisi yükler
npm run dev                 # http://localhost:3000
```

Demo hesap: **demo@callora.app / demo1234**

`OPENAI_API_KEY` tanımlı değilse ana sayfadaki sesli demo, senaryolu örnek görüşme oynatır. Anahtar tanımlıysa tarayıcıdan mikrofonla asistanla gerçekten konuşabilirsiniz (WebRTC + OpenAI Realtime).

## Ortam değişkenleri

`.env.example` dosyasına bakın:

- `DATABASE_URL` — SQLite yolu (varsayılan `file:./dev.db`)
- `AUTH_SECRET` — oturum imzalama anahtarı (üretimde mutlaka değiştirin)
- `OPENAI_API_KEY` — canlı sesli demo + telefon köprüsü
- `BRIDGE_WS_URL` — köprünün dışarıdan erişilebilir WebSocket adresi (`wss://...`)
- `BRIDGE_SHARED_SECRET` — panel ↔ köprü arası API anahtarı

## Gerçek telefon çağrıları (canlıya çıkış)

1. **Twilio hesabı** açın, ses destekli bir numara alın (~1-5 $/ay).
2. **Köprüyü çalıştırın** — herkese açık bir sunucuda (Railway/Fly/VPS):
   ```bash
   cd bridge
   npm install
   OPENAI_API_KEY=sk-... PANEL_URL=https://paneliniz.com BRIDGE_SHARED_SECRET=gizli npm start
   ```
   Yerel test için `ngrok http 8081` ile tünel açabilirsiniz.
3. **Paneli yayınlayın** (Vercel vb.) ve `BRIDGE_WS_URL` + `BRIDGE_SHARED_SECRET` değişkenlerini tanımlayın.
4. Twilio numaranızın **"A call comes in"** webhook'unu şuna yönlendirin:
   ```
   https://paneliniz.com/api/voice/incoming?biz=<isletme-id>
   ```
   İşletme kimliği panelde **Telefon Bağlantısı** sayfasında yazar.
5. (Önerilen) İşletmenin mevcut numarasına operatörden **"meşgulse / cevapsızsa yönlendir"** servisini açtırıp Twilio numarasına yönlendirin. Böylece işletme telefonu açamadığında asistan devreye girer.

Çağrı akışı: `Arayan → Twilio → bridge (g711) → OpenAI Realtime → bridge → Twilio → Arayan`. Randevu kesinleşince köprü `book_appointment` aracıyla panele yazar; çağrı bitince döküm `Çağrılar` sayfasına düşer.

## Satış / fiyatlandırma fikri

- Başlangıç: 1.490 ₺/ay (200 dk) · Profesyonel: 2.990 ₺/ay (600 dk) · İşletme+: özel
- Maliyet tarafı: OpenAI Realtime görüşme-dakikası + Twilio dakika ücreti. 600 dk'lık planda marj korunur; dakika aşımı ek paketle satılır.
- İlk müşteri için en güçlü argüman: **"mesai dışı kaçan çağrılar"** — panel bunu ayrı metrik olarak gösterir.

## Teknik notlar

- Next.js 16 (App Router, `src/proxy.ts` ile oturum koruması), Tailwind v4, Prisma 6 + SQLite, jose (JWT cookie), bcryptjs.
- Üretimde SQLite yerine Postgres'e geçmek için `prisma/schema.prisma` içindeki `provider` değerini değiştirip migration almak yeterli.
- Köprü tek dosyalık Node sunucusudur (`bridge/server.js`), tek bağımlılığı `ws`.
