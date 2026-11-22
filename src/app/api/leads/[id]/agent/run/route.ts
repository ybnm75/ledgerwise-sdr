import { requireApiSession } from "@/lib/auth";
import { runSdrAgent } from "@/lib/sdr-agent";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const auth = requireApiSession(request, { mutation: true });
  if (auth.response) return auth.response;
  const { id } = await context.params;
  try {
    const data = await runSdrAgent(id, auth.session.sub);
    return Response.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The SDR agent could not complete this run.";
    return Response.json({ error: message }, { status: 409 });
  }
}
