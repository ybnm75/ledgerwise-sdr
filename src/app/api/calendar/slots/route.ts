import { getAvailableSlots } from "@/lib/calendar";
import { requireApiSession } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = requireApiSession(request);
  if (auth.response) return auth.response;
  try {
    const slots = await getAvailableSlots();
    return Response.json({ data: slots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar availability failed.";
    return Response.json({ error: message }, { status: 503 });
  }
}
