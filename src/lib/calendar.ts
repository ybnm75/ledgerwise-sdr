import { z } from "zod";

const SlotResponse = z.object({
  status: z.string().optional(),
  data: z.record(z.string(), z.array(z.object({ start: z.string() }))).optional()
});

const BookingInput = z.object({
  start: z.string().datetime(),
  attendee: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    timeZone: z.string().min(1)
  })
});

export type BookingInput = z.infer<typeof BookingInput>;

function calendarConfig() {
  const eventTypeId = Number(process.env.CALCOM_EVENT_TYPE_ID);
  if (!Number.isFinite(eventTypeId)) throw new Error("CALCOM_EVENT_TYPE_ID is not configured.");
  return { eventTypeId, apiKey: process.env.CALCOM_API_KEY };
}

export async function getAvailableSlots(input?: { start?: Date; end?: Date; timeZone?: string }) {
  const { eventTypeId } = calendarConfig();
  const start = input?.start ?? new Date();
  const end = input?.end ?? new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const timeZone = input?.timeZone ?? "America/New_York";
  const url = new URL("https://api.cal.com/v2/slots");
  url.searchParams.set("eventTypeId", String(eventTypeId));
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("end", end.toISOString());
  url.searchParams.set("timeZone", timeZone);

  const response = await fetch(url, {
    headers: { "cal-api-version": "2024-09-04" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Cal.com availability failed with ${response.status}.`);
  const parsed = SlotResponse.parse(await response.json());
  return Object.values(parsed.data ?? {}).flat().map((slot) => slot.start).slice(0, 12);
}

export async function createBooking(rawInput: BookingInput) {
  const input = BookingInput.parse(rawInput);
  const { eventTypeId, apiKey } = calendarConfig();
  if (!apiKey) throw new Error("CALCOM_API_KEY is not configured.");

  const response = await fetch("https://api.cal.com/v2/bookings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "cal-api-version": "2024-08-13"
    },
    body: JSON.stringify({
      eventTypeId,
      start: input.start,
      attendee: input.attendee,
      metadata: { source: "ledgerwise-sales-desk" }
    })
  });

  const body: unknown = await response.json();
  if (!response.ok) throw new Error(`Cal.com booking failed with ${response.status}.`);
  return body;
}
