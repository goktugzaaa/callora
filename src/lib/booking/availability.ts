import { addDays, localToInstant, toLocalDate, weekdayOf, type LocalDate } from "./time";

/** A working period in local minutes since midnight, end exclusive. */
export type Shift = { start: number; end: number };

/** weekday (0 = Sunday) -> shifts. A missing weekday means closed. */
export type WeeklyHours = Partial<Record<number, Shift[]>>;

export type StaffAvailability = {
  id: string;
  /** Personal schedule, intersected with the business hours. null = follows business hours. */
  hours: WeeklyHours | null;
};

/** Time that cannot be booked. staffId null = the whole business is unavailable. */
export type Busy = { staffId: string | null; start: Date; end: Date };

export type BookingRules = {
  slotIntervalMin: number;
  minNoticeMin: number;
  maxAdvanceDays: number;
  bufferMin: number;
};

export type AvailabilityQuery = {
  timeZone: string;
  now: Date;
  businessHours: WeeklyHours;
  /** Only staff who can perform the requested service. */
  staff: StaffAvailability[];
  /** Existing appointments (start -> blocked_until) and time off. */
  busy: Busy[];
  rules: BookingRules;
  durationMin: number;
};

export type Slot = { start: Date; end: Date; staffIds: string[] };

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export function intersectShifts(a: Shift[], b: Shift[]): Shift[] {
  const out: Shift[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) out.push({ start, end });
    }
  }
  return out.sort((p, q) => p.start - q.start);
}

/**
 * Bookable start times on one local day. Each slot lists every staff member
 * who could take it. The database overlap constraint remains the final guard;
 * this function decides what the assistant is allowed to offer.
 */
export function slotsForDay(q: AvailabilityQuery, day: LocalDate): Slot[] {
  const { rules } = q;
  const weekday = weekdayOf(day);
  const businessShifts = q.businessHours[weekday] ?? [];
  const earliest = q.now.getTime() + rules.minNoticeMin * MINUTE;
  const latest = q.now.getTime() + rules.maxAdvanceDays * DAY;
  const duration = q.durationMin * MINUTE;
  const buffer = rules.bufferMin * MINUTE;
  const byStart = new Map<number, Slot>();

  for (const member of q.staff) {
    const shifts = member.hours ? intersectShifts(member.hours[weekday] ?? [], businessShifts) : businessShifts;
    const busy = q.busy.filter((b) => b.staffId === null || b.staffId === member.id);

    for (const shift of shifts) {
      const first = Math.ceil(shift.start / rules.slotIntervalMin) * rules.slotIntervalMin;
      for (let minute = first; minute + q.durationMin <= shift.end; minute += rules.slotIntervalMin) {
        const start = localToInstant(day, minute, q.timeZone).getTime();
        if (start < earliest || start > latest) continue;

        const blockedUntil = start + duration + buffer;
        const clashes = busy.some((b) => b.start.getTime() < blockedUntil && start < b.end.getTime());
        if (clashes) continue;

        const slot = byStart.get(start) ?? { start: new Date(start), end: new Date(start + duration), staffIds: [] };
        slot.staffIds.push(member.id);
        byStart.set(start, slot);
      }
    }
  }

  return [...byStart.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Days with at least one slot, scanning `days` days from `from`. */
export function slotsForRange(q: AvailabilityQuery, from: LocalDate, days: number): { date: LocalDate; slots: Slot[] }[] {
  const out: { date: LocalDate; slots: Slot[] }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const slots = slotsForDay(q, date);
    if (slots.length > 0) out.push({ date, slots });
  }
  return out;
}

/** Staff who can take an appointment starting exactly at `start` (empty = not bookable). */
export function staffAvailableAt(q: AvailabilityQuery, start: Date): string[] {
  const slot = slotsForDay(q, toLocalDate(start, q.timeZone)).find((s) => s.start.getTime() === start.getTime());
  return slot?.staffIds ?? [];
}
