import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, STATUS_LABELS } from "@/lib/format";
import AppointmentActions from "@/components/AppointmentActions";
import NewAppointmentForm from "@/components/NewAppointmentForm";

export default async function RandevularPage() {
  const session = (await getSession())!;
  const [appointments, services] = await Promise.all([
    db.appointment.findMany({
      where: { businessId: session.businessId },
      orderBy: { startsAt: "desc" },
      take: 100,
      include: { service: true },
    }),
    db.service.findMany({
      where: { businessId: session.businessId },
      select: { id: true, name: true },
    }),
  ]);

  const now = new Date();
  const upcoming = appointments
    .filter((a) => a.startsAt >= now && a.status === "onaylandi")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = appointments.filter((a) => a.startsAt < now || a.status !== "onaylandi");

  function Row({ a }: { a: (typeof appointments)[number] }) {
    const s = STATUS_LABELS[a.status] ?? STATUS_LABELS.onaylandi;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{a.customerName}</p>
          <p className="text-xs text-muted mt-0.5">
            {a.service?.name ?? "Genel"} · {fmtDateTime(a.startsAt)} · {a.customerPhone}
            {a.source === "telefon" && " · 🎙️ asistan aldı"}
          </p>
          {a.notes && <p className="text-xs text-muted mt-1 italic">{a.notes}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] border rounded-full px-2.5 py-0.5 ${s.cls}`}>{s.label}</span>
          <AppointmentActions id={a.id} status={a.status} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Randevular</h1>
          <p className="text-sm text-muted mt-1">
            Asistanın telefonda aldığı ve elle eklenen tüm randevular.
          </p>
        </div>
        <NewAppointmentForm services={services} />
      </div>

      <section>
        <h2 className="font-semibold mb-3">Yaklaşan ({upcoming.length})</h2>
        <div className="space-y-2.5">
          {upcoming.length === 0 && <p className="text-sm text-muted">Yaklaşan randevu yok.</p>}
          {upcoming.map((a) => (
            <Row key={a.id} a={a} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Geçmiş & Diğer</h2>
        <div className="space-y-2.5">
          {past.length === 0 && <p className="text-sm text-muted">Kayıt yok.</p>}
          {past.slice(0, 30).map((a) => (
            <Row key={a.id} a={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
