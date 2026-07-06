import { NextRequest, NextResponse } from "next/server";

// Twilio numarasının "A call comes in" webhook'u bu adrese bağlanır:
//   https://SITENIZ/api/voice/incoming?biz=<businessId>
// Dönen TwiML, çağrının sesini Twilio Media Streams üzerinden köprüye (bridge/) akıtır.
export async function POST(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("biz") ?? "";
  const bridgeUrl = process.env.BRIDGE_WS_URL;

  let fromNumber = "";
  try {
    const form = await req.formData();
    fromNumber = (form.get("From") as string) ?? "";
  } catch {
    // gövde yoksa sorun değil
  }

  if (!bridgeUrl || !businessId) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="tr-TR">Uzgunuz, sesli asistan su anda yapilandirilmamis. Lutfen daha sonra tekrar arayin.</Say>
  <Hangup/>
</Response>`;
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  }

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${esc(bridgeUrl)}">
      <Parameter name="businessId" value="${esc(businessId)}"/>
      <Parameter name="from" value="${esc(fromNumber)}"/>
    </Stream>
  </Connect>
</Response>`;

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
