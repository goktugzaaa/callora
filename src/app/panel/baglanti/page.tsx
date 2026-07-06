import { getSession } from "@/lib/auth";

export default async function BaglantiPage() {
  const session = (await getSession())!;
  const bridgeConfigured = !!(process.env.BRIDGE_WS_URL && process.env.BRIDGE_SHARED_SECRET);
  const openaiConfigured = !!process.env.OPENAI_API_KEY;

  const webhookUrl = `https://SITENIZ.com/api/voice/incoming?biz=${session.businessId}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Telefon Bağlantısı</h1>
        <p className="text-sm text-muted mt-1">
          Asistanın gerçek telefon çağrılarını karşılaması için gereken adımlar.
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-semibold">Sistem durumu</h2>
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <span className={openaiConfigured ? "text-accent-strong" : "text-danger"}>
              {openaiConfigured ? "●" : "○"}
            </span>
            OpenAI API anahtarı {openaiConfigured ? "tanımlı" : "tanımlı değil (OPENAI_API_KEY)"}
          </p>
          <p className="flex items-center gap-2">
            <span className={bridgeConfigured ? "text-accent-strong" : "text-danger"}>
              {bridgeConfigured ? "●" : "○"}
            </span>
            Ses köprüsü {bridgeConfigured ? "yapılandırılmış" : "yapılandırılmamış (BRIDGE_WS_URL + BRIDGE_SHARED_SECRET)"}
          </p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">Kurulum adımları</h2>
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="h-6 w-6 shrink-0 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-xs font-semibold">1</span>
            <div>
              <p className="font-medium">Twilio hesabı açın, Türkçe destekli bir numara alın</p>
              <p className="text-muted mt-0.5">twilio.com üzerinden. Numara maliyeti ~1-5 $/ay.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 shrink-0 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-xs font-semibold">2</span>
            <div>
              <p className="font-medium">Ses köprüsünü çalıştırın</p>
              <p className="text-muted mt-0.5">
                Projedeki <code className="bg-surface-2 px-1.5 py-0.5 rounded text-xs">bridge/</code> klasörü, Twilio ile
                yapay zekâ arasında sesi taşıyan küçük bir sunucudur. README&apos;deki komutla dakikalar içinde ayağa kalkar.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 shrink-0 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-xs font-semibold">3</span>
            <div>
              <p className="font-medium">Numaranızın webhook&apos;unu bu adrese yönlendirin</p>
              <p className="text-muted mt-0.5 mb-2">
                Twilio panelinde &quot;A call comes in&quot; alanına aşağıdaki adresi yapıştırın:
              </p>
              <code className="block bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs break-all">
                {webhookUrl}
              </code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 shrink-0 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-xs font-semibold">4</span>
            <div>
              <p className="font-medium">Mevcut iş numaranızı yönlendirin (opsiyonel)</p>
              <p className="text-muted mt-0.5">
                Operatörünüzden &quot;meşgulse / 15 sn cevapsızsa yönlendir&quot; servisini Twilio numaranıza açtırın.
                Böylece siz açamadığınızda asistan devreye girer.
              </p>
            </div>
          </li>
        </ol>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-2">İşletme kimliğiniz</h2>
        <p className="text-sm text-muted mb-2">Webhook adresindeki biz parametresi:</p>
        <code className="block bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs break-all">
          {session.businessId}
        </code>
      </div>
    </div>
  );
}
