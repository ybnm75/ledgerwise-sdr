import { requireApiSession } from "@/lib/auth";
import { listBookings } from "@/lib/db";

export async function GET(request: Request) {
  const auth = requireApiSession(request);
  if (auth.response) return auth.response;
  return Response.json({ data: await listBookings() });
}
