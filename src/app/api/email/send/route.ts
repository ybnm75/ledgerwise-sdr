import { z } from "zod";
import { getLeadDraft, isSuppressed, recordAuditEvent } from "@/lib/db";
import { sendApprovedEmail } from "@/lib/email";

const Input = z.object({
  leadId: z.string().min(1).max(200),
  to: z.string().email()
});

export async function POST(request: Request) {
  const parsed = Input.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "A verified recipient email is required." }, { status: 400 });

  try {
    if (await isSuppressed(parsed.data.to.toLowerCase())) {
      return Response.json({ error: "This recipient is suppressed and cannot be contacted." }, { status: 409 });
    }
    const draft = await getLeadDraft(parsed.data.leadId);
    if (!draft || draft.draft_status !== "approved") {
      return Response.json({ error: "Only the latest human-approved draft can be sent." }, { status: 409 });
    }
    const delivery = await sendApprovedEmail({
      leadId: parsed.data.leadId,
      to: parsed.data.to,
      subject: String(draft.draft_subject),
      body: String(draft.draft_body)
    });
    await recordAuditEvent({
      entityType: "lead",
      entityId: parsed.data.leadId,
      action: "email.sent",
      payload: { to: parsed.data.to, delivery }
    });
    return Response.json({ data: delivery }, { status: 201 });
  } catch (error) {
    console.error("Email send failed", error);
    const message = error instanceof Error ? error.message : "The email was not sent.";
    return Response.json({ error: message }, { status: 503 });
  }
}
