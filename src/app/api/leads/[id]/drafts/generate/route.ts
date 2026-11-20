import { requireApiSession } from "@/lib/auth";
import { generateGroundedDraft } from "@/lib/drafts";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const auth = requireApiSession(request, { mutation: true });
  if (auth.response) return auth.response;
  const { id } = await context.params;
  try {
    const draft = await generateGroundedDraft(id, auth.session.sub);
    return Response.json({ data: draft }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The draft could not be generated.";
    return Response.json({ error: message }, { status: 409 });
  }
}
