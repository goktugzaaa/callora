"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AppointmentActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: string) {
    setBusy(true);
    await fetch("/api/randevular", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    router.refresh();
    setBusy(false);
  }

  if (status === "iptal" || status === "tamamlandi") return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setStatus("tamamlandi")}
        disabled={busy}
        className="text-xs rounded-md border border-line px-2.5 py-1 text-muted hover:text-accent-strong hover:border-accent/50 transition-colors disabled:opacity-50"
      >
        Tamamlandı
      </button>
      <button
        onClick={() => setStatus("iptal")}
        disabled={busy}
        className="text-xs rounded-md border border-line px-2.5 py-1 text-muted hover:text-danger hover:border-danger/50 transition-colors disabled:opacity-50"
      >
        İptal
      </button>
    </div>
  );
}
