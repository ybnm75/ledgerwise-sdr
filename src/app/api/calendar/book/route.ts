import { z } from "zod";
import { createBooking } from "@/lib/calendar";
import { saveBooking } from "@/lib/db";

const Input = z.object({
  start: z.string().datetime(),
  attendee: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    timeZone: z.string().min(1).max(80)
  }),
  company: z.string().min(1).max(200)
});

export async function POST(request: Request) {
  const parsed = Input.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "The booking details are invalid." }, { status: 400 });
  try {
    const booking = await createBooking(parsed.data);
    await saveBooking({
      company: parsed.data.company,
      attendeeName: parsed.data.attendee.name,
      attendeeEmail: parsed.data.attendee.email,
      startsAt: parsed.data.start
    });
    return Response.json({ data: booking }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The booking failed.";
    return Response.json({ error: message }, { status: 503 });
  }
}
