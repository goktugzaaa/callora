import { describe, expect, it } from "vitest";
import { intersectShifts, slotsForDay, slotsForRange, staffAvailableAt, type AvailabilityQuery } from "./availability";
import { formatLocalDateTime, parseClock, parseLocalDate, parseLocalDateTime, weekdayOf } from "./time";

const AMMAN = "Asia/Amman"; // UTC+3, no DST
const MONDAY = parseLocalDate("2030-01-07")!; // weekday 1

const hm = (from: string, to: string) => ({ start: parseClock(from), end: parseClock(to) });
const at = (local: string, tz = AMMAN) => parseLocalDateTime(local, tz)!;
const times = (slots: { start: Date }[], tz = AMMAN) => slots.map((s) => formatLocalDateTime(s.start, tz).slice(11));

function query(overrides: Partial<AvailabilityQuery> = {}): AvailabilityQuery {
  return {
    timeZone: AMMAN,
    now: at("2030-01-01T09:00"),
    businessHours: { 1: [hm("10:00", "13:00")] },
    staff: [{ id: "rania", hours: null }],
    busy: [],
    rules: { slotIntervalMin: 30, minNoticeMin: 60, maxAdvanceDays: 60, bufferMin: 0 },
    durationMin: 30,
    ...overrides,
  };
}

describe("time helpers", () => {
  it("validates calendar dates", () => {
    expect(parseLocalDate("2030-02-30")).toBeNull();
    expect(parseLocalDate("2030-1-7")).toBeNull();
    expect(parseLocalDate("2030-01-07")).toEqual({ year: 2030, month: 1, day: 7 });
  });

  it("interprets wall-clock times in the business time zone", () => {
    expect(at("2030-01-07T10:00").toISOString()).toBe("2030-01-07T07:00:00.000Z");
    expect(at("2030-01-07T10:00", "Asia/Dubai").toISOString()).toBe("2030-01-07T06:00:00.000Z");
    expect(at("2030-01-07T10:00", "Europe/Istanbul").toISOString()).toBe("2030-01-07T07:00:00.000Z");
    expect(parseLocalDateTime("2030-01-07T25:00", AMMAN)).toBeNull();
  });

  it("round-trips local date-times", () => {
    expect(formatLocalDateTime(at("2030-01-07T15:45"), AMMAN)).toBe("2030-01-07T15:45");
  });

  it("uses 0 = Sunday for weekdays", () => {
    expect(weekdayOf(MONDAY)).toBe(1);
    expect(weekdayOf(parseLocalDate("2030-01-06")!)).toBe(0);
  });
});

describe("slotsForDay", () => {
  it("offers every interval that fits inside opening hours", () => {
    expect(times(slotsForDay(query(), MONDAY))).toEqual(["10:00", "10:30", "11:00", "11:30", "12:00", "12:30"]);
  });

  it("returns instants in UTC for the business time zone", () => {
    expect(slotsForDay(query(), MONDAY)[0].start.toISOString()).toBe("2030-01-07T07:00:00.000Z");
  });

  it("is closed on days without hours", () => {
    expect(slotsForDay(query(), parseLocalDate("2030-01-08")!)).toEqual([]);
  });

  it("never lets a service run past closing time", () => {
    expect(times(slotsForDay(query({ durationMin: 90 }), MONDAY))).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  it("supports split shifts", () => {
    const q = query({ businessHours: { 1: [hm("10:00", "11:00"), hm("16:00", "17:00")] } });
    expect(times(slotsForDay(q, MONDAY))).toEqual(["10:00", "10:30", "16:00", "16:30"]);
  });

  it("skips slots that overlap existing appointments", () => {
    const q = query({ busy: [{ staffId: "rania", start: at("2030-01-07T11:00"), end: at("2030-01-07T11:45") }] });
    expect(times(slotsForDay(q, MONDAY))).toEqual(["10:00", "10:30", "12:00", "12:30"]);
  });

  it("keeps the buffer free after each new appointment", () => {
    const q = query({
      rules: { slotIntervalMin: 30, minNoticeMin: 0, maxAdvanceDays: 60, bufferMin: 15 },
      busy: [{ staffId: "rania", start: at("2030-01-07T11:00"), end: at("2030-01-07T12:00") }],
    });
    // 10:30 + 30 min + 15 min buffer = 11:15 > 11:00 -> not offered
    expect(times(slotsForDay(q, MONDAY))).toEqual(["10:00", "12:00", "12:30"]);
  });

  it("intersects personal schedules with business hours", () => {
    const q = query({ staff: [{ id: "dana", hours: { 1: [hm("11:30", "18:00")] } }] });
    expect(times(slotsForDay(q, MONDAY))).toEqual(["11:30", "12:00", "12:30"]);
  });

  it("lists every staff member who can take a slot", () => {
    const q = query({
      staff: [
        { id: "rania", hours: null },
        { id: "dana", hours: null },
      ],
      busy: [{ staffId: "rania", start: at("2030-01-07T10:00"), end: at("2030-01-07T10:30") }],
    });
    const slots = slotsForDay(q, MONDAY);
    expect(slots[0].staffIds).toEqual(["dana"]);
    expect(slots[1].staffIds).toEqual(["rania", "dana"]);
  });

  it("business-wide closures block everyone", () => {
    const q = query({
      staff: [
        { id: "rania", hours: null },
        { id: "dana", hours: null },
      ],
      busy: [{ staffId: null, start: at("2030-01-07T00:00"), end: at("2030-01-08T00:00") }],
    });
    expect(slotsForDay(q, MONDAY)).toEqual([]);
  });

  it("enforces minimum notice", () => {
    const q = query({ now: at("2030-01-07T10:15") }); // earliest = 11:15
    expect(times(slotsForDay(q, MONDAY))).toEqual(["11:30", "12:00", "12:30"]);
  });

  it("enforces how far ahead customers can book", () => {
    const q = query({ now: at("2029-12-01T09:00"), rules: { ...query().rules, maxAdvanceDays: 30 } });
    expect(slotsForDay(q, MONDAY)).toEqual([]);
  });
});

describe("slotsForRange and staffAvailableAt", () => {
  it("finds the next open days", () => {
    const q = query({ businessHours: { 1: [hm("10:00", "11:00")], 3: [hm("10:00", "11:00")] } });
    const days = slotsForRange(q, parseLocalDate("2030-01-07")!, 7);
    expect(days.map((d) => d.date.day)).toEqual([7, 9]);
  });

  it("confirms availability only for exact offered start times", () => {
    const q = query();
    expect(staffAvailableAt(q, at("2030-01-07T10:30"))).toEqual(["rania"]);
    expect(staffAvailableAt(q, at("2030-01-07T10:10"))).toEqual([]);
    expect(staffAvailableAt(q, at("2030-01-07T13:00"))).toEqual([]);
  });
});

describe("intersectShifts", () => {
  it("returns only the overlapping parts", () => {
    expect(intersectShifts([hm("09:00", "12:00"), hm("14:00", "20:00")], [hm("10:00", "18:00")])).toEqual([
      hm("10:00", "12:00"),
      hm("14:00", "18:00"),
    ]);
  });
});
