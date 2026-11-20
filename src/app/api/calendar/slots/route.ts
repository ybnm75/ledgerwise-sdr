import { getAvailableSlots } from "@/lib/calendar";

export async function GET() {
  try {
    const slots = await getAvailableSlots();
    return Response.json({ data: slots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar availability failed.";
    return Response.json({ error: message }, { status: 503 });
  }
}
