import { z } from "zod";
import { ensureDatabase, getDatabase, isSuppressed, recordAuditEvent } from "@/lib/db";
import { sendApprovedEmail } from "@/lib/email";
import { requireApiSession } from "@/lib/auth";
import { draftEvidenceIsCurrent, latestDraft } from "@/lib/drafts";
import { createHash, randomUUID } from "node:crypto";

const Input = z.object({
  leadId: z.string().min(1).max(200),
  to: z.string().email()
});

export async function POST(request: Request) {
  const auth = requireApiSession(request, { mutation: true });
  if (auth.response) return auth.response;
  const parsed = Input.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "A verified recipient email is required." }, { status: 400 });

  let reservedKey = "";
  try {
    if (await isSuppressed(parsed.data.to.toLowerCase())) {
      return Response.json({ error: "This recipient is suppressed and cannot be contacted." }, { status: 409 });
    }
    const draft = await latestDraft(parsed.data.leadId);
    if (!draft || draft.status !== "approved") {
      return Response.json({ error: "Only the latest human-approved draft can be sent." }, { status: 409 });
    }
    const qualification = await getDatabase().execute({
      sql: "SELECT band FROM qualification_results WHERE company_id = ? LIMIT 1",
      args: [parsed.data.leadId]
    });
    if (String(qualification.rows[0]?.band || "") !== "qualified") {
      return Response.json({ error: "This researched lead has not passed the qualification gates." }, { status: 409 });
    }
    if (!(await draftEvidenceIsCurrent(parsed.data.leadId, draft.evidenceIds))) {
      return Response.json({ error: "The approved draft references stale evidence and must be regenerated." }, { status: 409 });
    }
    const allowedRecipient = process.env.TEST_RECIPIENT_EMAIL?.toLowerCase();
    if (!allowedRecipient || parsed.data.to.toLowerCase() !== allowedRecipient) {
      return Response.json({ error: "Demo delivery is restricted to the configured test recipient." }, { status: 403 });
    }
    const idempotencyKey = createHash("sha256").update(`${draft.id}:${parsed.data.to.toLowerCase()}`).digest("hex");
    reservedKey = idempotencyKey;
    await ensureDatabase();
    const existing = await getDatabase().execute({ sql: "SELECT status, response_json FROM send_attempts WHERE idempotency_key = ? LIMIT 1", args: [idempotencyKey] });
    if (String(existing.rows[0]?.status || "") === "sent") {
      return Response.json({ data: JSON.parse(String(existing.rows[0]?.response_json || "{}")), duplicate: true });
    }
    if (String(existing.rows[0]?.status || "") === "sending") {
      return Response.json({ error: "This approved revision is already being delivered." }, { status: 409 });
    }
    const timestamp = new Date().toISOString();
    await getDatabase().execute({
      sql: `INSERT INTO send_attempts (id, idempotency_key, draft_id, recipient, status, provider, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'sending', 'resend-sandbox', ?, ?)
            ON CONFLICT(idempotency_key) DO UPDATE SET status='sending', error=NULL, updated_at=excluded.updated_at`,
      args: [randomUUID(), idempotencyKey, draft.id, parsed.data.to.toLowerCase(), timestamp, timestamp]
    });
    const delivery = await sendApprovedEmail({
      to: parsed.data.to,
      subject: draft.subject,
      body: draft.body,
      idempotencyKey
    });
    await getDatabase().execute({
      sql: `UPDATE send_attempts SET status='sent', response_json=?, updated_at=? WHERE idempotency_key=?`,
      args: [JSON.stringify(delivery), new Date().toISOString(), idempotencyKey]
    });
    await recordAuditEvent({
      entityType: "lead",
      entityId: parsed.data.leadId,
      action: "email.sent",
      payload: { to: parsed.data.to, delivery },
      actor: { type: "human", id: auth.session.sub }
    });
    return Response.json({ data: delivery }, { status: 201 });
  } catch (error) {
    console.error("Email send failed", error);
    const message = error instanceof Error ? error.message : "The email was not sent.";
    if (reservedKey) {
      await getDatabase().execute({
        sql: `UPDATE send_attempts SET status='failed', error=?, updated_at=? WHERE idempotency_key=?`,
        args: [message.slice(0, 1000), new Date().toISOString(), reservedKey]
      }).catch(() => undefined);
    }
    return Response.json({ error: message }, { status: 503 });
  }
}
