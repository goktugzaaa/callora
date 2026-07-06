import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, fmtDuration, OUTCOME_LABELS } from "@/lib/format";

export default async function CagrilarPage() {
  const session = (await getSession())!;
  const calls = await db.call.findMany({
    where: { businessId: session.businessId },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: { appointment: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Çağrılar</h1>
        <p className="text-sm text-muted mt-1">
          Asistanın karşıladığı tüm görüşmeler. Detay için satıra tıklayın.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Arayan</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Tarih</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Süre</th>
              <th className="px-4 py-3 font-medium">Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  Henüz çağrı kaydı yok. Telefon bağlantısını kurduğunuzda görüşmeler burada listelenecek.
                </td>
              </tr>
            )}
            {calls.map((c) => {
              const o = OUTCOME_LABELS[c.outcome] ?? OUTCOME_LABELS.bilgi;
              return (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/panel/cagrilar/${c.id}`} className="font-medium hover:text-accent-strong">
                      {c.fromNumber || "Bilinmeyen"}
                    </Link>
                    <p className="text-xs text-muted sm:hidden">{fmtDateTime(c.startedAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">
                    {fmtDateTime(c.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-muted hidden md:table-cell">
                    {fmtDuration(c.durationSec)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] border rounded-full px-2.5 py-0.5 ${o.cls}`}>
                      {o.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
