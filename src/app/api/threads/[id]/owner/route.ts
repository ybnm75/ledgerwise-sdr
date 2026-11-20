import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { changeThreadOwner, listThreads } from "@/lib/threads";

const Input = z.object({ owner: z.enum(["agent", "human"]) });
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const auth = requireApiSession(request, { mutation: true });
  if (auth.response) return auth.response;
  const parsed = Input.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid conversation owner." }, { status: 400 });
  const { id } = await context.params;
  try {
    await changeThreadOwner({ threadId: id, owner: parsed.data.owner, actorId: auth.session.sub });
    return Response.json({ data: await listThreads() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ownership could not be changed." }, { status: 409 });
  }
}
