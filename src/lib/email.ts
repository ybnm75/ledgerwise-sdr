import { createHash } from "node:crypto";
import { enforceOutboundPolicy } from "@/lib/policy";

export async function sendApprovedEmail(input: { to: string; subject: string; body: string; leadId: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("The email provider is not configured.");

  const policy = enforceOutboundPolicy(input.body);
  if (!policy.allowed) throw new Error(`Outbound policy blocked: ${policy.violations.join(", ")}.`);

  const plainText = `${input.body.trim()}\n\nReply “stop” and I won’t contact you again.`;
  const idempotencyKey = createHash("sha256")
    .update(`${input.leadId}:${input.to}:${input.subject}:${plainText}`)
    .digest("hex");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: plainText })
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(`Email delivery failed with ${response.status}.`);
  return body;
}
