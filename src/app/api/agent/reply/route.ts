import { z } from "zod";
import { draftReply, suppressedContactReply } from "@/lib/agent";
import { isSuppressed, recordAuditEvent, saveSuppression } from "@/lib/db";
import { requireApiSession } from "@/lib/auth";

const Input = z.object({
  message: z.string().min(1).max(5000),
  company: z.string().min(1).max(200),
  evidence: z.array(z.string().max(500)).max(20),
  threadId: z.string().max(200).optional(),
  contactKey: z.string().max(320).optional()
});

export async function POST(request: Request) {
  const auth = requireApiSession(request, { mutation: true });
  if (auth.response) return auth.response;
  const parsed = Input.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "The reply payload is invalid.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const alreadySuppressed = parsed.data.contactKey
      ? await isSuppressed(parsed.data.contactKey.toLowerCase())
      : false;
    const result = alreadySuppressed ? suppressedContactReply() : await draftReply(parsed.data);
    if (parsed.data.threadId) {
      await recordAuditEvent({ entityType: "thread", entityId: parsed.data.threadId, action: `agent.${result.action}`, payload: result, actor: { type: "human", id: auth.session.sub } });
    }
    if (result.action === "suppress" && parsed.data.contactKey && !alreadySuppressed) {
      await saveSuppression({ company: parsed.data.company, contactKey: parsed.data.contactKey, reason: result.reason });
    }
    return Response.json({ data: result });
  } catch (error) {
    console.error("Reply agent failed", error);
    return Response.json({ error: "The reply was routed to a human because the agent failed safely." }, { status: 503 });
  }
}
