import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { processDemoMessage } from "@/lib/threads";

const Input = z.object({ message: z.string().min(1).max(5000), providerMessageId: z.string().max(200).optional() });
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const auth = requireApiSession(request, { mutation: true });
  if (auth.response) return auth.response;
  const parsed = Input.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "The demo reply is invalid." }, { status: 400 });
  const { id } = await context.params;
  try {
    const data = await processDemoMessage({ threadId: id, message: parsed.data.message, providerMessageId: parsed.data.providerMessageId ?? `demo-${randomUUID()}` });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The reply was handed to a human." }, { status: 503 });
  }
}
