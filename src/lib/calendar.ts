import { z } from "zod";
import { createHash } from "node:crypto";
import { recordProviderUsage } from "@/lib/db";

const BookingInput = z.object({
  start: z.string().datetime(),
  attendee: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    timeZone: z.string().min(1).refine(isValidTimeZone)
  }),
  company: z.string().min(1),
  threadId: z.string().optional(),
  idempotencyKey: z.string().min(1).max(128).optional()
});

export type BookingInput = z.infer<typeof BookingInput>;

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function bookingProviderEventId(idempotencyKey: string) {
  return `event${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 40)}`;
}

type BusyPeriod = { start: string; end: string };
type CalendarRules = {
  timeZone: string;
  workdayStartMinutes: number;
  workdayEndMinutes: number;
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeMinutes: number;
};

const defaultRules: CalendarRules = {
  timeZone: process.env.GOOGLE_CALENDAR_TIME_ZONE || "Africa/Algiers",
  workdayStartMinutes: 9 * 60,
  workdayEndMinutes: 17 * 60,
  durationMinutes: 30,
  bufferMinutes: 15,
  minimumNoticeMinutes: 24 * 60
};

export function calendarHostTimeZone() {
  return defaultRules.timeZone;
}

function calendarConfig() {
  const values = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    calendarId: process.env.GOOGLE_CALENDAR_ID
  };
  if (!values.clientId || !values.clientSecret || !values.refreshToken || !values.calendarId) {
    throw new Error("Google Calendar is not configured.");
  }
  return values as { clientId: string; clientSecret: string; refreshToken: string; calendarId: string };
}

async function accessToken() {
  const config = calendarConfig();
  const started = Date.now();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token"
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });
  const body = await response.json() as { access_token?: string };
  await recordProviderUsage({ provider: "google-calendar", operation: "oauth", units: 1, latencyMs: Date.now() - started });
  if (!response.ok || !body.access_token) throw new Error("Google Calendar authorization failed.");
  return body.access_token;
}

async function freeBusy(start: Date, end: Date) {
  const config = calendarConfig();
  const token = await accessToken();
  const started = Date.now();
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: start.toISOString(), timeMax: end.toISOString(), timeZone: defaultRules.timeZone, items: [{ id: config.calendarId }] }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });
  const body = await response.json() as { calendars?: Record<string, { busy?: BusyPeriod[]; errors?: unknown[] }> };
  await recordProviderUsage({ provider: "google-calendar", operation: "freebusy", units: 1, latencyMs: Date.now() - started });
  if (!response.ok) throw new Error(`Calendar availability failed with ${response.status}.`);
  const calendar = body.calendars?.[config.calendarId];
  if (calendar?.errors?.length) throw new Error("Calendar availability returned an error.");
  return calendar?.busy ?? [];
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { weekday: value("weekday"), hour: Number(value("hour")), minute: Number(value("minute")) };
}

function overlaps(start: number, end: number, busy: BusyPeriod[], bufferMs: number) {
  return busy.some((period) => {
    const busyStart = Date.parse(period.start) - bufferMs;
    const busyEnd = Date.parse(period.end) + bufferMs;
    return start < busyEnd && end > busyStart;
  });
}

export function calculateSlots(input: {
  rangeStart: Date;
  rangeEnd: Date;
  busy: BusyPeriod[];
  now?: Date;
  rules?: CalendarRules;
  limit?: number;
}) {
  const rules = input.rules ?? defaultRules;
  const now = input.now ?? new Date();
  const earliest = Math.max(input.rangeStart.getTime(), now.getTime() + rules.minimumNoticeMinutes * 60_000);
  const stepMs = 30 * 60_000;
  let cursor = Math.ceil(earliest / stepMs) * stepMs;
  const durationMs = rules.durationMinutes * 60_000;
  const bufferMs = rules.bufferMinutes * 60_000;
  const slots: string[] = [];
  while (cursor + durationMs <= input.rangeEnd.getTime() && slots.length < (input.limit ?? 12)) {
    const date = new Date(cursor);
    const parts = localParts(date, rules.timeZone);
    const localMinutes = parts.hour * 60 + parts.minute;
    const workingDay = !["Sat", "Sun"].includes(parts.weekday);
    const insideHours = localMinutes >= rules.workdayStartMinutes && localMinutes + rules.durationMinutes <= rules.workdayEndMinutes;
    if (workingDay && insideHours && !overlaps(cursor, cursor + durationMs, input.busy, bufferMs)) slots.push(date.toISOString());
    cursor += stepMs;
  }
  return slots;
}

export async function getAvailableSlots(input?: { start?: Date; end?: Date; limit?: number }) {
  const start = input?.start ?? new Date();
  const end = input?.end ?? new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
  const busy = await freeBusy(start, end);
  return calculateSlots({ rangeStart: start, rangeEnd: end, busy, limit: input?.limit ?? 12 });
}

async function selectedSlotIsAvailable(start: Date) {
  const end = new Date(start.getTime() + defaultRules.durationMinutes * 60_000);
  const busy = await freeBusy(new Date(start.getTime() - defaultRules.bufferMinutes * 60_000), new Date(end.getTime() + defaultRules.bufferMinutes * 60_000));
  return calculateSlots({
    rangeStart: start,
    rangeEnd: end,
    busy,
    now: new Date(0),
    rules: { ...defaultRules, minimumNoticeMinutes: 0 },
    limit: 1
  }).includes(start.toISOString());
}

export async function createBooking(rawInput: BookingInput) {
  const input = BookingInput.parse(rawInput);
  const start = new Date(input.start);
  if (start.getTime() < Date.now() + defaultRules.minimumNoticeMinutes * 60_000) {
    throw new Error("Bookings require at least 24 hours of notice.");
  }
  if (!(await selectedSlotIsAvailable(start))) throw new Error("That slot is no longer available. Refresh availability and choose another time.");
  const config = calendarConfig();
  const token = await accessToken();
  const end = new Date(start.getTime() + defaultRules.durationMinutes * 60_000);
  const started = Date.now();
  const providerEventId = input.idempotencyKey ? bookingProviderEventId(input.idempotencyKey) : undefined;
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events`);
  url.searchParams.set("sendUpdates", "all");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(providerEventId ? { id: providerEventId } : {}),
      summary: `Ledgerwise introduction — ${input.company}`,
      description: "Booked through the Ledgerwise Sales Desk supervised agent.",
      start: { dateTime: start.toISOString(), timeZone: defaultRules.timeZone },
      end: { dateTime: end.toISOString(), timeZone: defaultRules.timeZone },
      attendees: [{ email: input.attendee.email, displayName: input.attendee.name }],
      extendedProperties: { private: { source: "ledgerwise-sales-desk", threadId: input.threadId ?? "" } }
    }),
    signal: AbortSignal.timeout(15_000)
  });
  const body = await response.json() as { id?: string; htmlLink?: string; status?: string };
  await recordProviderUsage({ provider: "google-calendar", operation: "create-event", units: 1, latencyMs: Date.now() - started });
  if (response.status === 409 && providerEventId) {
    const reconcileStarted = Date.now();
    const existing = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events/${providerEventId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });
    const existingBody = await existing.json() as { id?: string; htmlLink?: string; status?: string };
    await recordProviderUsage({ provider: "google-calendar", operation: "get-event", units: 1, latencyMs: Date.now() - reconcileStarted });
    if (existing.ok && existingBody.id) {
      return { providerUid: existingBody.id, eventUrl: existingBody.htmlLink ?? "", status: existingBody.status ?? "confirmed" };
    }
  }
  if (!response.ok || !body.id) throw new Error(`Calendar booking failed with ${response.status}.`);
  return { providerUid: body.id, eventUrl: body.htmlLink ?? "", status: body.status ?? "confirmed" };
}
