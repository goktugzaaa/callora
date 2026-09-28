import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { slotsForDay, slotsForRange, staffAvailableAt, type Slot } from "@/lib/booking/availability";
import {
  addDays,
  formatClock,
  formatLocalDate,
  formatLocalDateTime,
  parseLocalDate,
  parseLocalDateTime,
  toLocalDate,
  toLocalMinutes,
  weekdayOf,
  type LocalDate,
} from "@/lib/booking/time";
import { normalizePhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAvailabilityQuery,
  loadBusinessProfile,
  loadOpeningHours,
  loadServices,
  loadStaff,
  staffForService,
  type BusinessProfile,
  type ServiceRecord,
  type StaffRecord,
} from "./data";

/**
 * Server-side context every tool receives. It is never shown to the model,
 * so the model cannot redirect a tool to another business or customer.
 */
export const receptionistContextSchema = z.object({
  businessId: z.guid(),
  conversationId: z.guid(),
  customerId: z.guid(),
  channel: z.enum(["whatsapp", "web", "voice"]),
});
export type ReceptionistContext = z.infer<typeof receptionistContextSchema>;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_TIMES_PER_DAY = 24;

type Failure = { ok: false; error: string; message: string };
const fail = (error: string, message: string): Failure => ({ ok: false, error, message });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireProfile(businessId: string): Promise<BusinessProfile> {
  const profile = await loadBusinessProfile(businessId);
  if (!profile) throw new Error(`Business ${businessId} not found`);
  return profile;
}

const normalize = (s: string) => s.trim().toLowerCase();

/** Match a service by id or by its name in any language. */
function resolveService(services: ServiceRecord[], ref: string): ServiceRecord | null {
  const wanted = normalize(ref);
  return (
    services.find((s) => s.id === ref.trim()) ??
    services.find((s) => Object.values(s.name).some((n) => n && normalize(n) === wanted)) ??
    null
  );
}

function resolveStaff(staff: StaffRecord[], ref: string): StaffRecord | null {
  const wanted = normalize(ref);
  return staff.find((m) => m.id === ref.trim()) ?? staff.find((m) => normalize(m.name) === wanted) ?? null;
}

function describeDay(date: LocalDate) {
  return { date: formatLocalDate(date), weekday: WEEKDAYS[weekdayOf(date)] };
}

function partOfDayFilter(part: "morning" | "afternoon" | "evening" | undefined, tz: string) {
  if (!part) return () => true;
  return (slot: Slot) => {
    const minutes = toLocalMinutes(slot.start, tz);
    if (part === "morning") return minutes < 12 * 60;
    if (part === "afternoon") return minutes >= 12 * 60 && minutes < 17 * 60;
    return minutes >= 17 * 60;
  };
}

function presentTimes(slots: Slot[], staff: StaffRecord[], tz: string) {
  const nameOf = new Map(staff.map((m) => [m.id, m.name]));
  return slots.slice(0, MAX_TIMES_PER_DAY).map((slot) => ({
    time: formatClock(toLocalMinutes(slot.start, tz)),
    staff: slot.staffIds.map((id) => nameOf.get(id) ?? id),
  }));
}

function presentBooking(
  a: { id: string; starts_at: string; status: string; price: number | null },
  service: ServiceRecord | undefined,
  staffName: string | undefined,
  profile: BusinessProfile,
) {
  const start = new Date(a.starts_at);
  const day = toLocalDate(start, profile.timezone);
  return {
    reference: a.id.slice(0, 8).toUpperCase(),
    appointmentId: a.id,
    service: service?.name ?? {},
    staff: staffName ?? null,
    start: formatLocalDateTime(start, profile.timezone),
    weekday: WEEKDAYS[weekdayOf(day)],
    durationMin: service?.durationMin ?? null,
    price: a.price,
    currency: profile.currency,
    status: a.status,
  };
}

/** Least-booked staff member that day, so work spreads evenly. */
function pickStaff(candidates: string[], busyCount: Map<string, number>): string {
  return [...candidates].sort((a, b) => (busyCount.get(a) ?? 0) - (busyCount.get(b) ?? 0))[0];
}

async function alternativesAround(profile: BusinessProfile, service: ServiceRecord, staff: StaffRecord[], day: LocalDate) {
  const q = await buildAvailabilityQuery(profile, service, day, 7, { staff });
  return slotsForRange(q, day, 7)
    .slice(0, 3)
    .map(({ date, slots }) => ({ ...describeDay(date), times: presentTimes(slots, staff, profile.timezone).slice(0, 8) }));
}

/** Upcoming active appointments of the current customer only. */
async function customerAppointments(ctx: ReceptionistContext) {
  const { data, error } = await createAdminClient()
    .from("appointments")
    .select("id, service_id, staff_id, starts_at, ends_at, status, price")
    .eq("business_id", ctx.businessId)
    .eq("customer_id", ctx.customerId)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", new Date(Date.now() - 60 * 60_000).toISOString())
    .order("starts_at");
  if (error) throw error;
  return data;
}

function findAppointment<T extends { id: string }>(appointments: T[], ref: string): T | undefined {
  const wanted = ref.trim().toLowerCase();
  return appointments.find((a) => a.id === wanted || a.id.startsWith(wanted));
}

function tooLateToChange(profile: BusinessProfile, startsAt: string): boolean {
  const deadline = new Date(startsAt).getTime() - profile.booking.cancellation_notice_hours * 3_600_000;
  return Date.now() > deadline;
}

/**
 * Saves name/phone on the customer. If another customer of this business
 * already owns the phone number, the conversation is linked to that customer
 * (same person, new chat) and their id is returned.
 */
async function saveCustomerDetails(
  ctx: ReceptionistContext,
  details: { name?: string; phone?: string | null; email?: string },
): Promise<string> {
  const db = createAdminClient();
  const patch: { name?: string; phone?: string; email?: string } = {};
  if (details.name) patch.name = details.name.trim().slice(0, 120);
  if (details.phone) patch.phone = details.phone;
  if (details.email) patch.email = details.email.trim().slice(0, 200);
  if (Object.keys(patch).length === 0) return ctx.customerId;

  const { error } = await db.from("customers").update(patch).eq("id", ctx.customerId).eq("business_id", ctx.businessId);
  if (!error) return ctx.customerId;
  if (error.code !== "23505" || !patch.phone) throw error;

  const { data: existing, error: lookupError } = await db
    .from("customers")
    .select("id")
    .eq("business_id", ctx.businessId)
    .eq("phone", patch.phone)
    .single();
  if (lookupError) throw lookupError;
  await db.from("conversations").update({ customer_id: existing.id }).eq("id", ctx.conversationId).eq("business_id", ctx.businessId);
  const rest = { ...patch };
  delete rest.phone;
  if (Object.keys(rest).length > 0) await db.from("customers").update(rest).eq("id", existing.id).eq("business_id", ctx.businessId);
  return existing.id;
}

async function customerPhone(ctx: ReceptionistContext): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("customers")
    .select("phone")
    .eq("id", ctx.customerId)
    .eq("business_id", ctx.businessId)
    .single();
  return data?.phone ?? null;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const receptionistTools = {
  getBusinessInfo: tool({
    description:
      "Business facts: address, contact details, opening hours, upcoming closures, booking policies and FAQs. Use it for any question about the business.",
    inputSchema: z.object({}),
    contextSchema: receptionistContextSchema,
    execute: async (_input, { context }) => {
      const db = createAdminClient();
      const profile = await requireProfile(context.businessId);
      const now = new Date();
      const [hours, faqs, closures] = await Promise.all([
        loadOpeningHours(profile.id),
        db
          .from("faqs")
          .select("question, answer")
          .eq("business_id", profile.id)
          .eq("active", true)
          .order("sort_order"),
        db
          .from("time_off")
          .select("starts_at, ends_at, reason")
          .eq("business_id", profile.id)
          .is("staff_id", null)
          .gt("ends_at", now.toISOString())
          .lt("starts_at", new Date(now.getTime() + 45 * 86_400_000).toISOString()),
      ]);
      return {
        name: profile.name,
        category: profile.category,
        description: profile.description,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        mapsUrl: profile.maps_url,
        timezone: profile.timezone,
        currency: profile.currency,
        openingHours: WEEKDAYS.map((day, i) => ({
          day,
          hours: hours[i]?.map((s) => `${formatClock(s.start)}–${formatClock(s.end)}`) ?? "closed",
        })),
        closures: (closures.data ?? []).map((c) => ({
          from: formatLocalDateTime(new Date(c.starts_at), profile.timezone),
          to: formatLocalDateTime(new Date(c.ends_at), profile.timezone),
          reason: c.reason,
        })),
        policies: {
          cancellationNoticeHours: profile.booking.cancellation_notice_hours,
          minimumNoticeMinutes: profile.booking.min_notice_min,
          bookingWindowDays: profile.booking.max_advance_days,
        },
        faqs: faqs.data ?? [],
      };
    },
  }),

  getServices: tool({
    description:
      "The complete, current service menu with durations, prices and which staff perform each service. Prices here are the only valid prices.",
    inputSchema: z.object({}),
    contextSchema: receptionistContextSchema,
    execute: async (_input, { context }) => {
      const profile = await requireProfile(context.businessId);
      const [services, staff] = await Promise.all([loadServices(profile.id), loadStaff(profile.id)]);
      return {
        currency: profile.currency,
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          price: s.price, // null = price given after consultation; never estimate it
          priceIsFrom: s.priceIsFrom,
          staff: staffForService(staff, s).map((m) => ({ id: m.id, name: m.name, title: m.title })),
        })),
      };
    },
  }),

  checkAvailability: tool({
    description:
      "Real available start times for a service. Call it before offering any time; only offer times it returns. Without a date it returns the next available days.",
    inputSchema: z.object({
      service: z.string().describe("Service id from getServices (or its exact name)"),
      date: z.string().optional().describe("Local date YYYY-MM-DD. Omit to get the next available days."),
      staff: z.string().optional().describe("Staff id or name — only when the customer asked for someone specific"),
      partOfDay: z.enum(["morning", "afternoon", "evening"]).optional(),
    }),
    contextSchema: receptionistContextSchema,
    execute: async ({ service: serviceRef, date, staff: staffRef, partOfDay }, { context }) => {
      const profile = await requireProfile(context.businessId);
      const tz = profile.timezone;
      const [services, allStaff] = await Promise.all([loadServices(profile.id), loadStaff(profile.id)]);
      const service = resolveService(services, serviceRef);
      if (!service) return fail("unknown_service", "No such service. Call getServices and use a listed id.");

      let staff = staffForService(allStaff, service);
      if (staffRef) {
        const member = resolveStaff(allStaff, staffRef);
        if (!member) return fail("unknown_staff", "No such staff member.");
        if (!staff.some((m) => m.id === member.id)) {
          return fail("staff_does_not_offer_service", `${member.name} does not perform this service.`);
        }
        staff = [member];
      }
      const staffDirectory = Object.fromEntries(staff.map((m) => [m.name, m.id]));
      const today = toLocalDate(new Date(), tz);
      const matchesPart = partOfDayFilter(partOfDay, tz);

      if (date) {
        const day = parseLocalDate(date);
        if (!day) return fail("invalid_date", "Use the format YYYY-MM-DD.");
        const q = await buildAvailabilityQuery(profile, service, day, 1, { staff });
        const slots = slotsForDay(q, day).filter(matchesPart);
        if (slots.length > 0) {
          return {
            ok: true,
            ...describeDay(day),
            durationMin: service.durationMin,
            times: presentTimes(slots, staff, tz),
            staffDirectory,
          };
        }
        const next = await alternativesAround(profile, service, staff, addDays(day, 1));
        return { ok: true, ...describeDay(day), times: [], nextAvailable: next, staffDirectory };
      }

      const q = await buildAvailabilityQuery(profile, service, today, 14, { staff });
      const days = slotsForRange(q, today, 14)
        .map(({ date: d, slots }) => ({ date: d, slots: slots.filter(matchesPart) }))
        .filter((d) => d.slots.length > 0)
        .slice(0, 3);
      return {
        ok: true,
        durationMin: service.durationMin,
        nextAvailable: days.map((d) => ({ ...describeDay(d.date), times: presentTimes(d.slots, staff, tz).slice(0, 8) })),
        staffDirectory,
      };
    },
  }),

  createBooking: tool({
    description:
      "Books an appointment. Only call after the customer explicitly confirmed service, date, time and name. The booking exists ONLY if this returns ok: true.",
    inputSchema: z.object({
      service: z.string().describe("Service id from getServices"),
      startTime: z.string().describe("Local start time YYYY-MM-DDTHH:mm, one offered by checkAvailability"),
      staff: z.string().optional().describe("Staff id or name if the customer chose someone"),
      customerName: z.string().min(1).max(120),
      customerPhone: z.string().optional().describe("With country code. Not needed on WhatsApp."),
      notes: z.string().max(500).optional(),
    }),
    contextSchema: receptionistContextSchema,
    execute: async (input, { context }) => {
      const profile = await requireProfile(context.businessId);
      const tz = profile.timezone;
      const [services, allStaff] = await Promise.all([loadServices(profile.id), loadStaff(profile.id)]);
      const service = resolveService(services, input.service);
      if (!service) return fail("unknown_service", "No such service. Call getServices and use a listed id.");

      const start = parseLocalDateTime(input.startTime, tz);
      if (!start) return fail("invalid_time", "Use the format YYYY-MM-DDTHH:mm from checkAvailability.");

      const eligible = staffForService(allStaff, service);
      let preferred: StaffRecord | null = null;
      if (input.staff) {
        preferred = resolveStaff(eligible, input.staff);
        if (!preferred) return fail("staff_does_not_offer_service", "That staff member does not perform this service.");
      }

      // Phone: WhatsApp already gives us the number; other channels must collect it.
      let phone: string | null = null;
      if (input.customerPhone) {
        phone = normalizePhone(input.customerPhone, tz);
        if (!phone) return fail("invalid_phone", "Ask for the phone number including the country code.");
      } else if (!(await customerPhone(context))) {
        return fail("phone_required", "Ask the customer for a phone number before booking.");
      }

      const day = toLocalDate(start, tz);
      const q = await buildAvailabilityQuery(profile, service, day, 1, { staff: eligible });
      const candidates = staffAvailableAt(q, start).filter((id) => !preferred || id === preferred.id);
      if (candidates.length === 0) {
        return {
          ...fail("slot_unavailable", "That time is not available. Offer these alternatives instead."),
          alternatives: await alternativesAround(profile, service, preferred ? [preferred] : eligible, day),
        };
      }

      const busyCount = new Map<string, number>();
      for (const b of q.busy) if (b.staffId) busyCount.set(b.staffId, (busyCount.get(b.staffId) ?? 0) + 1);
      const staffId = pickStaff(candidates, busyCount);

      const customerId = await saveCustomerDetails(context, { name: input.customerName, phone });

      const end = new Date(start.getTime() + service.durationMin * 60_000);
      const { data, error } = await createAdminClient()
        .from("appointments")
        .insert({
          business_id: profile.id,
          customer_id: customerId,
          service_id: service.id,
          staff_id: staffId,
          conversation_id: context.conversationId,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          blocked_until: new Date(end.getTime() + profile.booking.buffer_min * 60_000).toISOString(),
          status: profile.booking.auto_confirm ? "confirmed" : "pending",
          source: context.channel,
          price: service.price,
          notes: input.notes ?? "",
        })
        .select("id, starts_at, status, price")
        .single();

      if (error?.code === "23P01") {
        // Someone took the slot between the check and the insert.
        return {
          ...fail("slot_just_taken", "That time was just booked by someone else. Offer these alternatives."),
          alternatives: await alternativesAround(profile, service, eligible, day),
        };
      }
      if (error) throw error;

      return {
        ok: true,
        booking: presentBooking(data, service, allStaff.find((m) => m.id === staffId)?.name, profile),
        note: data.status === "pending" ? "Pending: the business will confirm it." : undefined,
      };
    },
  }),

  getMyAppointments: tool({
    description: "The current customer's upcoming appointments. Use before rescheduling or cancelling.",
    inputSchema: z.object({}),
    contextSchema: receptionistContextSchema,
    execute: async (_input, { context }) => {
      const profile = await requireProfile(context.businessId);
      const [appointments, services, staff] = await Promise.all([
        customerAppointments(context),
        loadServices(profile.id),
        loadStaff(profile.id),
      ]);
      return {
        appointments: appointments.map((a) =>
          presentBooking(
            a,
            services.find((s) => s.id === a.service_id),
            staff.find((m) => m.id === a.staff_id)?.name,
            profile,
          ),
        ),
      };
    },
  }),

  rescheduleBooking: tool({
    description: "Moves one of the customer's appointments to a new time offered by checkAvailability.",
    inputSchema: z.object({
      appointment: z.string().describe("appointmentId or reference from getMyAppointments"),
      newStartTime: z.string().describe("Local start time YYYY-MM-DDTHH:mm"),
      staff: z.string().optional(),
    }),
    contextSchema: receptionistContextSchema,
    execute: async (input, { context }) => {
      const profile = await requireProfile(context.businessId);
      const tz = profile.timezone;
      const appointment = findAppointment(await customerAppointments(context), input.appointment);
      if (!appointment) return fail("not_found", "No upcoming appointment with that reference for this customer.");
      if (tooLateToChange(profile, appointment.starts_at)) {
        return fail(
          "too_late_to_change",
          `Changes need at least ${profile.booking.cancellation_notice_hours} hours notice. Offer a human handover.`,
        );
      }

      const [services, allStaff] = await Promise.all([loadServices(profile.id), loadStaff(profile.id)]);
      const service = services.find((s) => s.id === appointment.service_id);
      if (!service) return fail("service_unavailable", "This service is no longer offered. Offer a human handover.");
      const start = parseLocalDateTime(input.newStartTime, tz);
      if (!start) return fail("invalid_time", "Use the format YYYY-MM-DDTHH:mm from checkAvailability.");

      const eligible = staffForService(allStaff, service);
      const preferred = input.staff ? resolveStaff(eligible, input.staff) : null;
      const day = toLocalDate(start, tz);
      const q = await buildAvailabilityQuery(profile, service, day, 1, {
        staff: eligible,
        excludeAppointmentId: appointment.id,
      });
      const candidates = staffAvailableAt(q, start);
      const staffId = preferred
        ? candidates.find((id) => id === preferred.id)
        : (candidates.find((id) => id === appointment.staff_id) ?? candidates[0]);
      if (!staffId) {
        return {
          ...fail("slot_unavailable", "That time is not available. Offer these alternatives instead."),
          alternatives: await alternativesAround(profile, service, preferred ? [preferred] : eligible, day),
        };
      }

      const end = new Date(start.getTime() + service.durationMin * 60_000);
      const { data, error } = await createAdminClient()
        .from("appointments")
        .update({
          staff_id: staffId,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          blocked_until: new Date(end.getTime() + profile.booking.buffer_min * 60_000).toISOString(),
        })
        .eq("id", appointment.id)
        .eq("business_id", profile.id)
        .select("id, starts_at, status, price")
        .single();
      if (error?.code === "23P01") return fail("slot_just_taken", "That time was just taken. Check availability again.");
      if (error) throw error;

      return { ok: true, booking: presentBooking(data, service, allStaff.find((m) => m.id === staffId)?.name, profile) };
    },
  }),

  cancelBooking: tool({
    description: "Cancels one of the customer's appointments after they confirmed they want to cancel.",
    inputSchema: z.object({
      appointment: z.string().describe("appointmentId or reference from getMyAppointments"),
      reason: z.string().max(300).optional(),
    }),
    contextSchema: receptionistContextSchema,
    execute: async (input, { context }) => {
      const profile = await requireProfile(context.businessId);
      const appointment = findAppointment(await customerAppointments(context), input.appointment);
      if (!appointment) return fail("not_found", "No upcoming appointment with that reference for this customer.");
      if (tooLateToChange(profile, appointment.starts_at)) {
        return fail(
          "too_late_to_cancel",
          `Cancellations need at least ${profile.booking.cancellation_notice_hours} hours notice. Offer a human handover.`,
        );
      }
      const { error } = await createAdminClient()
        .from("appointments")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: input.reason ?? null })
        .eq("id", appointment.id)
        .eq("business_id", profile.id);
      if (error) throw error;
      return { ok: true, cancelled: appointment.id.slice(0, 8).toUpperCase() };
    },
  }),

  createLead: tool({
    description:
      "Saves the customer's contact details and what they are interested in, so the team can follow up. Use when someone shares details or shows interest without booking.",
    inputSchema: z.object({
      name: z.string().max(120).optional(),
      phone: z.string().optional().describe("With country code"),
      email: z.string().max(200).optional(),
      interest: z.string().max(300).optional().describe("What they want, e.g. 'bridal package in June'"),
    }),
    contextSchema: receptionistContextSchema,
    execute: async (input, { context }) => {
      const profile = await requireProfile(context.businessId);
      const phone = input.phone ? normalizePhone(input.phone, profile.timezone) : null;
      if (input.phone && !phone) return fail("invalid_phone", "Ask for the phone number including the country code.");
      const customerId = await saveCustomerDetails(context, { name: input.name, phone, email: input.email });

      if (input.interest) {
        const db = createAdminClient();
        const { data } = await db.from("customers").select("notes").eq("id", customerId).single();
        const stamp = formatLocalDate(toLocalDate(new Date(), profile.timezone));
        const notes = [data?.notes, `${stamp}: ${input.interest}`].filter(Boolean).join("\n");
        await db.from("customers").update({ notes }).eq("id", customerId).eq("business_id", profile.id);
      }
      return { ok: true };
    },
  }),

  requestHumanHandover: tool({
    description:
      "Hands the conversation to a human team member and stops automatic replies. Use for complaints, refunds, medical or sensitive questions, anything you cannot answer from the tools, or when the customer asks for a person.",
    inputSchema: z.object({
      reason: z.string().max(300).describe("Short summary for the team"),
    }),
    contextSchema: receptionistContextSchema,
    execute: async ({ reason }, { context }) => {
      const { error } = await createAdminClient()
        .from("conversations")
        .update({ mode: "human", needs_attention: true, handover_reason: reason })
        .eq("id", context.conversationId)
        .eq("business_id", context.businessId);
      if (error) throw error;
      return { ok: true, message: "A team member has been notified and will reply in this chat." };
    },
  }),
};

export type ReceptionistTools = typeof receptionistTools;
