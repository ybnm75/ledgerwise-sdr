import { randomUUID } from "node:crypto";
import { ensureDatabase, getDatabase, recordAuditEvent, saveSuppression } from "@/lib/db";
import { draftReply } from "@/lib/agent";

export type ThreadView = {
  id: string;
  company: string;
  contact: string;
  contactKey: string;
  subject: string;
  owner: "agent" | "human";
  state: "agent" | "handoff" | "suppressed" | "booking";
  isDemo: boolean;
  messages: Array<{ id: string; direction: "inbound" | "outbound"; sender: string; body: string; source: string; createdAt: string }>;
  decision: null | { intent: string; action: string; confidence: number; reason: string; reply: string; riskFlags: string[]; source: string };
};

const demos = [
  { id: "demo-thread-booking", company: "Bobo's", contact: "Finance team", key: "demo+bobos@example.com", subject: "Re: finance operations", state: "booking", message: "This could be useful. Are you free next Tuesday afternoon?" },
  { id: "demo-thread-stop", company: "hiyo", contact: "Operations", key: "demo+hiyo@example.com", subject: "Re: monthly close", state: "suppressed", message: "Not interested. Please remove me from your list." },
  { id: "demo-thread-handoff", company: "Evvy", contact: "Finance", key: "demo+evvy@example.com", subject: "Re: bookkeeping", state: "handoff", message: "Can you explain your SOC 2 controls and data retention terms?" }
] as const;

export async function ensureDemoThreads() {
  await ensureDatabase();
  const count = await getDatabase().execute("SELECT COUNT(*) AS count FROM threads");
  if (Number(count.rows[0]?.count ?? 0) > 0) return;
  const timestamp = new Date().toISOString();
  for (const demo of demos) {
    await getDatabase().batch([
      {
        sql: `INSERT INTO threads (id, company_name, contact_name, contact_key, subject, owner, state, is_demo, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'agent', ?, 1, ?, ?)`,
        args: [demo.id, demo.company, demo.contact, demo.key, demo.subject, demo.state, timestamp, timestamp]
      },
      {
        sql: `INSERT INTO messages (id, thread_id, direction, sender, body, source, created_at)
              VALUES (?, ?, 'outbound', 'Ledgerwise agent', 'Would it be useful to compare notes on your current month-end close?', 'demo', ?)`,
        args: [randomUUID(), demo.id, timestamp]
      },
      {
        sql: `INSERT INTO messages (id, thread_id, direction, sender, body, source, created_at)
              VALUES (?, ?, 'inbound', ?, ?, 'demo', ?)`,
        args: [randomUUID(), demo.id, demo.contact, demo.message, timestamp]
      }
    ], "write");
  }
}

export async function listThreads(): Promise<ThreadView[]> {
  await ensureDemoThreads();
  const result = await getDatabase().execute("SELECT * FROM threads ORDER BY updated_at DESC");
  const output: ThreadView[] = [];
  for (const row of result.rows) {
    const messages = await getDatabase().execute({
      sql: "SELECT id, direction, sender, body, source, created_at FROM messages WHERE thread_id=? ORDER BY created_at ASC, rowid ASC",
      args: [String(row.id)]
    });
    const decisions = await getDatabase().execute({
      sql: "SELECT intent, action, confidence, reason, reply, risk_flags_json, source FROM agent_decisions WHERE thread_id=? ORDER BY created_at DESC LIMIT 1",
      args: [String(row.id)]
    });
    const decision = decisions.rows[0];
    output.push({
      id: String(row.id),
      company: String(row.company_name),
      contact: String(row.contact_name),
      contactKey: String(row.contact_key),
      subject: String(row.subject),
      owner: String(row.owner) as ThreadView["owner"],
      state: String(row.state) as ThreadView["state"],
      isDemo: Number(row.is_demo) === 1,
      messages: messages.rows.map((message) => ({
        id: String(message.id),
        direction: String(message.direction) as "inbound" | "outbound",
        sender: String(message.sender),
        body: String(message.body),
        source: String(message.source),
        createdAt: String(message.created_at)
      })),
      decision: decision ? {
        intent: String(decision.intent),
        action: String(decision.action),
        confidence: Number(decision.confidence),
        reason: String(decision.reason),
        reply: String(decision.reply),
        riskFlags: JSON.parse(String(decision.risk_flags_json)) as string[],
        source: String(decision.source)
      } : null
    });
  }
  return output;
}

export async function changeThreadOwner(input: { threadId: string; owner: "agent" | "human"; actorId: string }) {
  await ensureDatabase();
  const result = await getDatabase().execute({ sql: "SELECT owner FROM threads WHERE id=? LIMIT 1", args: [input.threadId] });
  if (!result.rows[0]) throw new Error("Conversation not found.");
  const previous = String(result.rows[0].owner);
  if (previous === input.owner) return;
  const timestamp = new Date().toISOString();
  await getDatabase().batch([
    { sql: "UPDATE threads SET owner=?, state=?, updated_at=? WHERE id=?", args: [input.owner, input.owner === "human" ? "handoff" : "agent", timestamp, input.threadId] },
    {
      sql: `INSERT INTO thread_ownership (id, thread_id, previous_owner, new_owner, actor_id, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), input.threadId, previous, input.owner, input.actorId, input.owner === "human" ? "Salesperson took control." : "Salesperson returned control to the agent.", timestamp]
    }
  ], "write");
  await recordAuditEvent({ entityType: "thread", entityId: input.threadId, action: `owner.${input.owner}`, payload: { previous, owner: input.owner }, actor: { type: "human", id: input.actorId } });
}

export async function processDemoMessage(input: { threadId: string; message: string; providerMessageId: string }) {
  await ensureDatabase();
  const duplicate = await getDatabase().execute({ sql: "SELECT id FROM messages WHERE provider_message_id=? LIMIT 1", args: [input.providerMessageId] });
  if (duplicate.rows.length) return { duplicate: true, threads: await listThreads() };
  const threadResult = await getDatabase().execute({ sql: "SELECT * FROM threads WHERE id=? LIMIT 1", args: [input.threadId] });
  const thread = threadResult.rows[0];
  if (!thread) throw new Error("Conversation not found.");
  const messageId = randomUUID();
  const timestamp = new Date().toISOString();
  await getDatabase().execute({
    sql: `INSERT INTO messages (id, thread_id, direction, sender, body, source, provider_message_id, created_at)
          VALUES (?, ?, 'inbound', ?, ?, 'demo', ?, ?)`,
    args: [messageId, input.threadId, String(thread.contact_name), input.message, input.providerMessageId, timestamp]
  });
  const ownedByHuman = String(thread.owner) === "human";
  const result = ownedByHuman ? {
    intent: "unknown" as const,
    action: "handoff" as const,
    confidence: 1,
    reason: "A salesperson owns this conversation, so the agent cannot send automatically.",
    reply: "",
    riskFlags: ["human_owned"],
    source: "policy" as const
  } : await draftReply({ message: input.message, company: String(thread.company_name), evidence: [] });
  const state = result.action === "suppress" ? "suppressed" : result.action === "offer_slots" ? "booking" : result.action === "handoff" ? "handoff" : "agent";
  const decisionId = randomUUID();
  const operations: Array<string | { sql: string; args: Array<string | number | null> }> = [
    {
      sql: `INSERT INTO agent_decisions (id, thread_id, message_id, intent, action, confidence, reason, reply, risk_flags_json, source, prompt_version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reply-v2', ?)`,
      args: [decisionId, input.threadId, messageId, result.intent, result.action, result.confidence, result.reason, result.reply, JSON.stringify(result.riskFlags ?? []), result.source, timestamp]
    },
    { sql: "UPDATE threads SET state=?, updated_at=? WHERE id=?", args: [state, timestamp, input.threadId] }
  ];
  if (result.action === "reply" && result.reply && !ownedByHuman) {
    operations.push({
      sql: `INSERT INTO messages (id, thread_id, direction, sender, body, source, created_at)
            VALUES (?, ?, 'outbound', 'Ledgerwise agent', ?, 'demo-agent', ?)`,
      args: [randomUUID(), input.threadId, result.reply, timestamp]
    });
  }
  await getDatabase().batch(operations, "write");
  if (result.action === "suppress") {
    await saveSuppression({ company: String(thread.company_name), contactKey: String(thread.contact_key), reason: result.reason, threadId: input.threadId, triggeringMessageId: messageId });
  }
  await recordAuditEvent({ entityType: "thread", entityId: input.threadId, action: `agent.${result.action}`, payload: { decisionId, messageId, confidence: result.confidence, demo: true }, actor: { type: "system", id: "reply-agent" } });
  return { duplicate: false, result, threads: await listThreads() };
}
