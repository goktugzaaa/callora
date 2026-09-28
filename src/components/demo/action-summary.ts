// Turns a stored assistant action (tool call + result) into a short,
// human-readable line for the demo panel and the dashboard inbox.

export type ActionLike = { tool: string; ok: boolean; input?: unknown; output?: unknown };

type Translate = (key: string, values?: Record<string, string | number>) => string;

type AnyRecord = Record<string, unknown>;
const rec = (v: unknown): AnyRecord => (v && typeof v === "object" ? (v as AnyRecord) : {});
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

function shortDate(date: string | undefined, weekday: string | undefined): string | undefined {
  if (!date) return undefined;
  const [, m, d] = date.split("-");
  return `${weekday ? `${weekday.slice(0, 3)} ` : ""}${Number(d)}/${Number(m)}`;
}

export function summarizeAction(action: ActionLike, t: Translate): { label: string; detail?: string } {
  const label = t(action.tool) || action.tool;
  const out = rec(action.output);
  const input = rec(action.input);

  if (!action.ok) {
    const error = str(out.error) ?? str(rec(out).message);
    return { label, detail: error ? `${t("failed")} · ${error.replaceAll("_", " ")}` : t("failed") };
  }

  switch (action.tool) {
    case "getServices": {
      const services = Array.isArray(out.services) ? out.services.length : 0;
      return { label, detail: t("services", { count: services }) };
    }
    case "checkAvailability": {
      const times = Array.isArray(out.times) ? out.times.length : 0;
      if (times > 0) {
        const day = shortDate(str(out.date), str(out.weekday)) ?? str(out.weekday);
        return { label, detail: [day, t("times", { count: times })].filter(Boolean).join(" · ") };
      }
      const next = Array.isArray(out.nextAvailable) ? (out.nextAvailable as AnyRecord[]) : [];
      if (next.length > 0) {
        return { label, detail: next.map((d) => shortDate(str(d.date), str(d.weekday))).join(", ") };
      }
      return { label, detail: t("noTimes") };
    }
    case "createBooking":
    case "rescheduleBooking": {
      const booking = rec(out.booking);
      const reference = str(booking.reference);
      const start = str(booking.start);
      return {
        label,
        detail: [reference ? t("reference", { reference }) : undefined, start?.replace(/^(\d{4}-\d{2}-\d{2})T/, "$1 ")].filter(Boolean).join(" · "),
      };
    }
    case "cancelBooking": {
      const reference = str(out.cancelled);
      return { label, detail: reference ? t("reference", { reference }) : undefined };
    }
    case "requestHumanHandover":
      return { label, detail: str(input.reason) };
    case "createLead":
      return { label, detail: str(input.interest) ?? str(input.name) };
    default:
      return { label };
  }
}
