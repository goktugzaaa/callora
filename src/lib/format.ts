const TZ = "Europe/Istanbul";

export function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TZ,
  }).format(d);
}

export function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: TZ }).format(d);
}

export function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { timeStyle: "short", timeZone: TZ }).format(d);
}

export function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} dk ${s} sn` : `${s} sn`;
}

export const OUTCOME_LABELS: Record<string, { label: string; cls: string }> = {
  randevu: { label: "Randevu alındı", cls: "bg-accent/10 text-accent-strong border-accent/30" },
  bilgi: { label: "Bilgi verildi", cls: "bg-surface-2 text-muted border-line" },
  yonlendirme: { label: "Yönlendirildi", cls: "bg-warning/10 text-warning border-warning/30" },
  kacirilan: { label: "Kaçırılan", cls: "bg-danger/10 text-danger border-danger/30" },
};

export const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  onaylandi: { label: "Onaylandı", cls: "bg-accent/10 text-accent-strong border-accent/30" },
  bekliyor: { label: "Bekliyor", cls: "bg-warning/10 text-warning border-warning/30" },
  iptal: { label: "İptal", cls: "bg-danger/10 text-danger border-danger/30" },
  tamamlandi: { label: "Tamamlandı", cls: "bg-surface-2 text-muted border-line" },
};
