import { z } from "zod";
import { createBooking, isValidTimeZone } from "@/lib/calendar";
import { saveBooking } from "@/lib/db";
import { requireApiSession } from "@/lib/auth";
import { createHash } from "node:crypto";
import { ensureDatabase, getDatabase } from "@/lib/db";

const Input = z.object({
  start: z.string().datetime(),
  attendee: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    timeZone: z.string().min(1).max(80).refine(isValidTimeZone, "A valid IANA timezone is required.")
  }),
  company: z.string().min(1).max(200),
  threadId: z.string().max(200).optional()
});

export async function POST(request: Request) {
  const auth = requireApiSession(request, { mutation: true });
  if (auth.response) return auth.response;
  const parsed = Input.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "The booking details are invalid." }, { status: 400 });
  try {
    const idempotencyKey = createHash("sha256").update(`${parsed.data.attendee.email.toLowerCase()}:${parsed.data.start}:${parsed.data.company}`).digest("hex");
    await ensureDatabase();
    const existing = await getDatabase().execute({ sql: "SELECT id, provider_uid, event_url FROM bookings WHERE idempotency_key=? LIMIT 1", args: [idempotencyKey] });
    if (existing.rows[0]) return Response.json({ data: existing.rows[0], duplicate: true });
    const booking = await createBooking({ ...parsed.data, idempotencyKey });
    await saveBooking({
      company: parsed.data.company,
      attendeeName: parsed.data.attendee.name,
      attendeeEmail: parsed.data.attendee.email,
      startsAt: parsed.data.start,
      providerUid: booking.providerUid,
      attendeeTimeZone: parsed.data.attendee.timeZone,
      threadId: parsed.data.threadId,
      eventUrl: booking.eventUrl,
      idempotencyKey,
      actor: { type: "human", id: auth.session.sub }
    });
    return Response.json({ data: booking }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The booking failed.";
    return Response.json({ error: message }, { status: 503 });
  }
}
