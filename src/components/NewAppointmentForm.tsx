"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Service = { id: string; name: string };

export default function NewAppointmentForm({ services }: { services: Service[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const date = form.get("date") as string;
    const time = form.get("time") as string;
    const res = await fetch("/api/randevular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: form.get("customerName"),
        customerPhone: form.get("customerPhone"),
        serviceId: form.get("serviceId") || null,
        startsAt: new Date(`${date}T${time}`).toISOString(),
        notes: form.get("notes") ?? "",
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Randevu oluşturulamadı");
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary !px-4 !py-2 text-sm">
        + Yeni Randevu
      </button>
    );
  }

  return (
    <div className="card p-5 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Yeni Randevu</h3>
        <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground text-sm">
          ✕
        </button>
      </div>
      <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
        <input name="customerName" required placeholder="Müşteri adı" className="input" />
        <input name="customerPhone" required placeholder="Telefon (05xx...)" className="input" />
        <select name="serviceId" className="input" defaultValue="">
          <option value="">Hizmet seçin (opsiyonel)</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input name="date" type="date" required className="input" />
          <input name="time" type="time" required className="input" />
        </div>
        <input name="notes" placeholder="Not (opsiyonel)" className="input sm:col-span-2" />
        {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary sm:col-span-2 disabled:opacity-50">
          {busy ? "Kaydediliyor..." : "Randevuyu Kaydet"}
        </button>
      </form>
    </div>
  );
}
