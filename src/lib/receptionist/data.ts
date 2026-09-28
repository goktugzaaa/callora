import "server-only";
import type { AvailabilityQuery, BookingRules, Busy, WeeklyHours } from "@/lib/booking/availability";
import { addDays, localToInstant, parseClock, type LocalDate } from "@/lib/booking/time";
import { asLocalized, type LocalizedText } from "@/lib/localized";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

// Data access for the assistant. Runs with the service role (there is no user
// session on a WhatsApp webhook), so EVERY query here filters by business_id.

export type BusinessProfile = Tables<"businesses"> & {
  assistant: Tables<"assistant_settings">;
  booking: Tables<"booking_settings">;
};

export type ServiceRecord = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  durationMin: number;
  price: number | null;
  priceIsFrom: boolean;
  staffIds: string[]; // empty = any active staff member
};

export type StaffRecord = {
  id: string;
  name: string;
  title: string;
  hours: WeeklyHours | null;
  serviceIds: string[];
};

export async function loadBusinessProfile(businessId: string): Promise<BusinessProfile | null> {
  const { data, error } = await createAdminClient()
    .from("businesses")
    .select("*, assistant_settings(*), booking_settings(*)")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.assistant_settings || !data.booking_settings) return null;
  const { assistant_settings, booking_settings, ...business } = data;
  return { ...business, assistant: assistant_settings, booking: booking_settings };
}

export function bookingRules(settings: Tables<"booking_settings">): BookingRules {
  return {
    slotIntervalMin: settings.slot_interval_min,
    minNoticeMin: settings.min_notice_min,
    maxAdvanceDays: settings.max_advance_days,
    bufferMin: settings.buffer_min,
  };
}

function toWeeklyHours(rows: { weekday: number; start: string; end: string }[]): WeeklyHours {
  const hours: WeeklyHours = {};
  for (const row of rows) {
    (hours[row.weekday] ??= []).push({ start: parseClock(row.start), end: parseClock(row.end) });
  }
  for (const shifts of Object.values(hours)) shifts?.sort((a, b) => a.start - b.start);
  return hours;
}

export async function loadOpeningHours(businessId: string): Promise<WeeklyHours> {
  const { data, error } = await createAdminClient()
    .from("working_hours")
    .select("weekday, opens_at, closes_at")
    .eq("business_id", businessId);
  if (error) throw error;
  return toWeeklyHours(data.map((r) => ({ weekday: r.weekday, start: r.opens_at, end: r.closes_at })));
}

export async function loadServices(businessId: string): Promise<ServiceRecord[]> {
  const { data, error } = await createAdminClient()
    .from("services")
    .select("id, name, description, duration_min, price, price_is_from, staff_services(staff_id)")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data.map((s) => ({
    id: s.id,
    name: asLocalized(s.name),
    description: asLocalized(s.description),
    durationMin: s.duration_min,
    price: s.price,
    priceIsFrom: s.price_is_from,
    staffIds: s.staff_services.map((x) => x.staff_id),
  }));
}

export async function loadStaff(businessId: string): Promise<StaffRecord[]> {
  const { data, error } = await createAdminClient()
    .from("staff")
    .select("id, name, title, staff_hours(weekday, starts_at, ends_at), staff_services(service_id)")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data.map((m) => ({
    id: m.id,
    name: m.name,
    title: m.title,
    hours:
      m.staff_hours.length > 0
        ? toWeeklyHours(m.staff_hours.map((h) => ({ weekday: h.weekday, start: h.starts_at, end: h.ends_at })))
        : null,
    serviceIds: m.staff_services.map((x) => x.service_id),
  }));
}

export function staffForService(staff: StaffRecord[], service: ServiceRecord): StaffRecord[] {
  return service.staffIds.length === 0 ? staff : staff.filter((m) => service.staffIds.includes(m.id));
}

/** Active appointments and time off overlapping [from, to). */
export async function loadBusy(businessId: string, from: Date, to: Date, excludeAppointmentId?: string): Promise<Busy[]> {
  const db = createAdminClient();
  let appointments = db
    .from("appointments")
    .select("id, staff_id, starts_at, blocked_until")
    .eq("business_id", businessId)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", to.toISOString())
    .gt("blocked_until", from.toISOString());
  if (excludeAppointmentId) appointments = appointments.neq("id", excludeAppointmentId);

  const [booked, off] = await Promise.all([
    appointments,
    db
      .from("time_off")
      .select("staff_id, starts_at, ends_at")
      .eq("business_id", businessId)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString()),
  ]);
  if (booked.error) throw booked.error;
  if (off.error) throw off.error;

  return [
    ...booked.data.map((a) => ({ staffId: a.staff_id, start: new Date(a.starts_at), end: new Date(a.blocked_until) })),
    ...off.data.map((t) => ({ staffId: t.staff_id, start: new Date(t.starts_at), end: new Date(t.ends_at) })),
  ];
}

/** Everything the availability engine needs for `service` over `days` local days from `from`. */
export async function buildAvailabilityQuery(
  profile: BusinessProfile,
  service: ServiceRecord,
  from: LocalDate,
  days: number,
  options: { staff?: StaffRecord[]; excludeAppointmentId?: string } = {},
): Promise<AvailabilityQuery> {
  const tz = profile.timezone;
  const rangeStart = localToInstant(from, 0, tz);
  const rangeEnd = localToInstant(addDays(from, days), 0, tz);
  const [businessHours, allStaff, busy] = await Promise.all([
    loadOpeningHours(profile.id),
    options.staff ? Promise.resolve(options.staff) : loadStaff(profile.id),
    loadBusy(profile.id, rangeStart, rangeEnd, options.excludeAppointmentId),
  ]);

  return {
    timeZone: tz,
    now: new Date(),
    businessHours,
    staff: staffForService(allStaff, service).map((m) => ({ id: m.id, hours: m.hours })),
    busy,
    rules: bookingRules(profile.booking),
    durationMin: service.durationMin,
  };
}
