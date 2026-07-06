import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, fmtDuration, OUTCOME_LABELS } from "@/lib/format";

export default async function PanelPage() {
  const session = (await getSession())!;
  const businessId = session.businessId;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [callCount, apptCount, afterHoursCalls, recentCalls, upcoming, services] =
    await Promise.all([
      db.call.count({ where: { businessId, startedAt: { gte: monthStart } } }),
      db.appointment.count({
        where: { businessId, createdAt: { gte: monthStart }, source: "telefon" },
      }),
      db.call.findMany({
        where: { businessId, startedAt: { gte: monthStart } },
        select: { startedAt: true },
      }),
      db.call.findMany({
        where: { businessId },
        orderBy: { startedAt: "desc" },
        take: 6,
      }),
      db.appointment.findMany({
        where: { businessId, startsAt: { gte: new Date() }, status: "onaylandi" },
        orderBy: { startsAt: "asc" },
        take: 5,
        include: { service: true },
      }),
      db.service.findMany({ where: { businessId } }),
    ]);

  const offHours = afterHoursCalls.filter((c) => {
    const h = c.startedAt.getHours();
    return h < 9 || h >= 18;
  }).length;

  const avgPrice =
    services.filter((s) => s.priceTry).reduce((a, s) => a + (s.priceTry ?? 0), 0) /
    Math.max(1, services.filter((s) => s.priceTry).length);
  const estRevenue = Math.round(apptCount * (avgPrice || 500));

  const stats = [
    { label: "Bu ay karşılanan çağrı", value: callCount, icon: "📞" },
    { label: "Telefonla alınan randevu", value: apptCount, icon: "📅" },
    { label: "Mesai dışı kurtarılan çağrı", value: offHours, icon: "🌙" },
    {
      label: "Tahmini kazandırılan ciro",
      value: `${estRevenue.toLocaleString("tr-TR")} ₺`,
      icon: "💰",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Genel Bakış</h1>
        <p className="text-sm text-muted mt-1">
          Asistanınızın bu ayki performansı bir bakışta.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <span className="text-xl">{s.icon}</span>
            <p className="text-2xl font-bold mt-2">{s.value}</p>
            <p className="text-xs text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Son Çağrılar</h2>
            <Link href="/panel/cagrilar" className="text-xs text-accent-strong hover:underline">
              Tümünü gör →
            </Link>
          </div>
          <div className="space-y-3">
            {recentCalls.length === 0 && (
              <p className="text-sm text-muted">Henüz çağrı yok.</p>
            )}
            {recentCalls.map((c) => {
              const o = OUTCOME_LABELS[c.outcome] ?? OUTCOME_LABELS.bilgi;
              return (
                <Link
                  key={c.id}
                  href={`/panel/cagrilar/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 hover:border-accent/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.fromNumber || "Bilinmeyen"}</p>
                    <p className="text-xs text-muted">
                      {fmtDateTime(c.startedAt)} · {fmtDuration(c.durationSec)}
                    </p>
                  </div>
                  <span className={`text-[11px] border rounded-full px-2.5 py-0.5 shrink-0 ${o.cls}`}>
                    {o.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Yaklaşan Randevular</h2>
            <Link href="/panel/randevular" className="text-xs text-accent-strong hover:underline">
              Tümünü gör →
            </Link>
          </div>
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted">Yaklaşan randevu yok.</p>
            )}
            {upcoming.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.customerName}</p>
                  <p className="text-xs text-muted">
                    {a.service?.name ?? "Genel"} · {fmtDateTime(a.startsAt)}
                  </p>
                </div>
                <span className="text-xs text-muted shrink-0">{a.customerPhone}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
