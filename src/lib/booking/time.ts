import { TZDate } from "@date-fns/tz";

/** A calendar day in a business's local time zone. `month` is 1–12. */
export type LocalDate = { year: number; month: number; day: number };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/;
const CLOCK_RE = /^(\d{2}):(\d{2})(?::\d{2})?$/;

function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** "2026-09-28" -> LocalDate, or null when malformed or not a real day. */
export function parseLocalDate(value: string): LocalDate | null {
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isRealDate(year, month, day) ? { year, month, day } : null;
}

/** "10:30" or "10:30:00" (Postgres `time`) -> minutes since midnight. */
export function parseClock(value: string): number {
  const m = CLOCK_RE.exec(value);
  if (!m) throw new Error(`Invalid clock time: ${value}`);
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) throw new Error(`Invalid clock time: ${value}`);
  return hours * 60 + minutes;
}

export function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** The instant at which the wall clock in `timeZone` shows `date` + `minutes`. */
export function localToInstant(date: LocalDate, minutes: number, timeZone: string): Date {
  const local = new TZDate(date.year, date.month - 1, date.day, Math.floor(minutes / 60), minutes % 60, timeZone);
  return new Date(local.getTime());
}

/** "2026-09-28T15:30" interpreted in `timeZone`, or null when malformed. */
export function parseLocalDateTime(value: string, timeZone: string): Date | null {
  const m = DATETIME_RE.exec(value.trim());
  if (!m) return null;
  const date = parseLocalDate(`${m[1]}-${m[2]}-${m[3]}`);
  const hours = Number(m[4]);
  const minutes = Number(m[5]);
  if (!date || hours > 23 || minutes > 59) return null;
  return localToInstant(date, hours * 60 + minutes, timeZone);
}

export function toLocalDate(instant: Date, timeZone: string): LocalDate {
  const local = new TZDate(instant.getTime(), timeZone);
  return { year: local.getFullYear(), month: local.getMonth() + 1, day: local.getDate() };
}

/** Minutes since local midnight of `instant` in `timeZone`. */
export function toLocalMinutes(instant: Date, timeZone: string): number {
  const local = new TZDate(instant.getTime(), timeZone);
  return local.getHours() * 60 + local.getMinutes();
}

/** 0 = Sunday … 6 = Saturday, matching `working_hours.weekday`. */
export function weekdayOf(date: LocalDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function formatLocalDate(date: LocalDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/** Instant -> "2026-09-28T15:30" in `timeZone` (the format the assistant speaks). */
export function formatLocalDateTime(instant: Date, timeZone: string): string {
  return `${formatLocalDate(toLocalDate(instant, timeZone))}T${formatClock(toLocalMinutes(instant, timeZone))}`;
}
