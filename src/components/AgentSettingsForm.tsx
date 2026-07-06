"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const VOICES = [
  ["coral", "Coral: sıcak, kadın"],
  ["sage", "Sage: sakin, kadın"],
  ["shimmer", "Shimmer: enerjik, kadın"],
  ["alloy", "Alloy: nötr"],
  ["ash", "Ash: derin, erkek"],
  ["echo", "Echo: net, erkek"],
  ["ballad", "Ballad: yumuşak, erkek"],
  ["verse", "Verse: canlı, erkek"],
];

const DAYS: [string, string][] = [
  ["pzt", "Pazartesi"],
  ["sal", "Salı"],
  ["car", "Çarşamba"],
  ["per", "Perşembe"],
  ["cum", "Cuma"],
  ["cmt", "Cumartesi"],
  ["paz", "Pazar"],
];

type Service = { id?: string; name: string; durationMin: number; priceTry: number | null };
type Hours = Record<string, [string, string] | null>;

export default function AgentSettingsForm({
  initial,
}: {
  initial: {
    greeting: string;
    voice: string;
    extraNotes: string;
    workingHours: string;
    services: Service[];
  };
}) {
  const router = useRouter();
  const [greeting, setGreeting] = useState(initial.greeting);
  const [voice, setVoice] = useState(initial.voice);
  const [extraNotes, setExtraNotes] = useState(initial.extraNotes);
  const [services, setServices] = useState<Service[]>(initial.services);
  const [hours, setHours] = useState<Hours>(() => {
    try {
      return JSON.parse(initial.workingHours);
    } catch {
      return {};
    }
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function setService(i: number, patch: Partial<Service>) {
    setServices((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/asistan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        greeting,
        voice,
        extraNotes,
        workingHours: JSON.stringify(hours),
        services: services.filter((s) => s.name.trim()),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Kaydedildi. Asistan bir sonraki çağrıdan itibaren güncel ayarlarla konuşur." });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg({ ok: false, text: data.error ?? "Kaydedilemedi" });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-5 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Karşılama cümlesi</label>
          <p className="text-xs text-muted mb-2">Asistan her çağrıya bu cümleyle başlar.</p>
          <textarea
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            rows={3}
            className="input resize-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5">Ses</label>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} className="input">
            {VOICES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5">Özel talimatlar</label>
          <p className="text-xs text-muted mb-2">
            Örn: &quot;Fiyat sorulursa net rakam verme&quot;, &quot;Acil vakaları hekime yönlendir&quot;.
          </p>
          <textarea
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            rows={4}
            className="input resize-none"
            placeholder="Asistanın uyması gereken işletmenize özel kurallar..."
          />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-1">Hizmetler</h3>
        <p className="text-xs text-muted mb-4">
          Asistan randevu alırken bu listeden hizmet ve süre önerir. Fiyat boş bırakılırsa telefonda fiyat söylemez.
        </p>
        <div className="space-y-2.5">
          {services.map((s, i) => (
            <div key={s.id ?? `new-${i}`} className="grid grid-cols-[1fr_90px_110px_32px] gap-2 items-center">
              <input
                value={s.name}
                onChange={(e) => setService(i, { name: e.target.value })}
                placeholder="Hizmet adı"
                className="input !py-2"
              />
              <input
                type="number"
                value={s.durationMin}
                onChange={(e) => setService(i, { durationMin: parseInt(e.target.value) || 30 })}
                className="input !py-2"
                title="Süre (dk)"
              />
              <input
                type="number"
                value={s.priceTry ?? ""}
                onChange={(e) =>
                  setService(i, { priceTry: e.target.value ? parseInt(e.target.value) : null })
                }
                placeholder="₺ (ops.)"
                className="input !py-2"
              />
              <button
                onClick={() => setServices((prev) => prev.filter((_, j) => j !== i))}
                className="text-muted hover:text-danger"
                title="Sil"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setServices((prev) => [...prev, { name: "", durationMin: 30, priceTry: null }])}
          className="text-sm text-accent-strong hover:underline mt-3"
        >
          + Hizmet ekle
        </button>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-1">Çalışma saatleri</h3>
        <p className="text-xs text-muted mb-4">Asistan bu saatlerin dışına randevu vermez.</p>
        <div className="space-y-2">
          {DAYS.map(([key, label]) => {
            const range = hours[key];
            return (
              <div key={key} className="grid grid-cols-[110px_auto_1fr] gap-3 items-center">
                <span className="text-sm">{label}</span>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={!!range}
                    onChange={(e) =>
                      setHours((prev) => ({
                        ...prev,
                        [key]: e.target.checked ? ["09:00", "18:00"] : null,
                      }))
                    }
                  />
                  Açık
                </label>
                {range ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={range[0]}
                      onChange={(e) =>
                        setHours((prev) => ({ ...prev, [key]: [e.target.value, range[1]] }))
                      }
                      className="input !py-1.5 !w-auto"
                    />
                    <span className="text-muted text-xs">-</span>
                    <input
                      type="time"
                      value={range[1]}
                      onChange={(e) =>
                        setHours((prev) => ({ ...prev, [key]: [range[0], e.target.value] }))
                      }
                      className="input !py-1.5 !w-auto"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted">Kapalı</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-accent-strong" : "text-danger"}`}>{msg.text}</p>
      )}
      <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-50">
        {busy ? "Kaydediliyor..." : "Ayarları Kaydet"}
      </button>
    </div>
  );
}
