import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, fmtDuration, OUTCOME_LABELS } from "@/lib/format";

export default async function CagriDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = (await getSession())!;

  const call = await db.call.findFirst({
    where: { id, businessId: session.businessId },
    include: { appointment: { include: { service: true } } },
  });
  if (!call) notFound();

  let transcript: { role: string; text: string }[] = [];
  try {
    transcript = JSON.parse(call.transcript);
  } catch {
    transcript = [];
  }

  const o = OUTCOME_LABELS[call.outcome] ?? OUTCOME_LABELS.bilgi;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/panel/cagrilar" className="text-xs text-muted hover:text-accent-strong">
          ← Çağrılara dön
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold">{call.fromNumber || "Bilinmeyen numara"}</h1>
          <span className={`text-[11px] border rounded-full px-2.5 py-0.5 ${o.cls}`}>{o.label}</span>
        </div>
        <p className="text-sm text-muted mt-1">
          {fmtDateTime(call.startedAt)} · {fmtDuration(call.durationSec)}
        </p>
      </div>

      {call.appointment && (
        <div className="card p-4 border-accent/30">
          <p className="text-xs text-accent-strong font-medium mb-1">📅 Bu görüşmede randevu oluşturuldu</p>
          <p className="text-sm">
            {call.appointment.customerName} · {call.appointment.service?.name ?? "Genel"} ·{" "}
            {fmtDateTime(call.appointment.startsAt)}
          </p>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Görüşme Dökümü</h2>
        <div className="space-y-3">
          {transcript.length === 0 && (
            <p className="text-sm text-muted">Bu çağrı için döküm bulunamadı.</p>
          )}
          {transcript.map((m, i) => (
            <div key={i} className={`flex ${m.role === "asistan" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "asistan"
                    ? "bg-surface-2 border border-line"
                    : "bg-accent/15 border border-accent/30"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wide text-muted mb-0.5">
                  {m.role === "asistan" ? "Asistan" : "Arayan"}
                </p>
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
