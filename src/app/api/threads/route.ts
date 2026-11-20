import { requireApiSession } from "@/lib/auth";
import { listThreads } from "@/lib/threads";

export async function GET(request: Request) {
  const auth = requireApiSession(request);
  if (auth.response) return auth.response;
  return Response.json({ data: await listThreads() });
}
