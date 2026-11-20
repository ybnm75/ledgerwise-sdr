import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { runtimeEnvironment } from "@/lib/env";

let client: Client | null = null;
let ready: Promise<void> | null = null;

export function getDatabase() {
  if (client) return client;
  const environment = runtimeEnvironment();
  client = createClient({ url: environment.TURSO_DATABASE_URL, authToken: environment.TURSO_AUTH_TOKEN });
  return client;
}

export function ensureDatabase() {
  if (ready) return ready;
  const db = getDatabase();
  ready = db.execute("SELECT version FROM schema_migrations WHERE version = 6 LIMIT 1")
    .then((result) => {
      if (!result.rows.length) throw new Error("Database migrations are incomplete. Run npm run db:migrate.");
    })
    .catch((error) => {
      ready = null;
      if (error instanceof Error && error.message.includes("Database migrations")) throw error;
      throw new Error("Database schema is unavailable. Run npm run db:migrate.");
    });
  return ready;
}

export async function saveLeadDraft(input: {
  id: string;
  status: "pending" | "approved" | "rejected";
  subject: string;
  body: string;
  actor?: { type: string; id: string };
}) {
  await ensureDatabase();
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.batch([
    {
      sql: `INSERT INTO lead_state (id, draft_status, draft_subject, draft_body, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              draft_status = excluded.draft_status,
              draft_subject = excluded.draft_subject,
              draft_body = excluded.draft_body,
              updated_at = excluded.updated_at`,
      args: [input.id, input.status, input.subject, input.body, now]
    },
    {
      sql: `INSERT INTO audit_events (id, entity_type, entity_id, action, payload_json, created_at, actor_type, actor_id)
            VALUES (?, 'lead', ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), input.id, `draft.${input.status}`, JSON.stringify({ subject: input.subject }), now, input.actor?.type ?? "system", input.actor?.id ?? "system"]
    }
  ], "write");
  return { updatedAt: now };
}

export async function getLeadDraft(id: string) {
  await ensureDatabase();
  const result = await getDatabase().execute({
    sql: `SELECT id, draft_status, draft_subject, draft_body, updated_at FROM lead_state WHERE id = ? LIMIT 1`,
    args: [id]
  });
  return result.rows[0] ?? null;
}

export async function listAuditEvents(entityId: string) {
  await ensureDatabase();
  const result = await getDatabase().execute({
    sql: `SELECT id, action, payload_json, created_at FROM audit_events
          WHERE entity_id = ? ORDER BY created_at DESC LIMIT 50`,
    args: [entityId]
  });
  return result.rows;
}

export async function saveSuppression(input: { company: string; contactKey: string; reason: string; threadId?: string; triggeringMessageId?: string }) {
  await ensureDatabase();
  const now = new Date().toISOString();
  await getDatabase().execute({
    sql: `INSERT INTO suppressions (id, company, contact_key, reason, created_at, thread_id, triggering_message_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(contact_key) DO UPDATE SET reason=excluded.reason, thread_id=excluded.thread_id, triggering_message_id=excluded.triggering_message_id`,
    args: [randomUUID(), input.company, input.contactKey, input.reason, now, input.threadId ?? null, input.triggeringMessageId ?? null]
  });
}

export async function isSuppressed(contactKey: string) {
  await ensureDatabase();
  const result = await getDatabase().execute({
    sql: `SELECT id FROM suppressions WHERE contact_key = ? LIMIT 1`,
    args: [contactKey]
  });
  return result.rows.length > 0;
}

export async function recordAuditEvent(input: {
  entityType: string;
  entityId: string;
  action: string;
  payload: unknown;
  actor?: { type: string; id: string };
}) {
  await ensureDatabase();
  const now = new Date().toISOString();
  await getDatabase().execute({
    sql: `INSERT INTO audit_events (id, entity_type, entity_id, action, payload_json, created_at, actor_type, actor_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), input.entityType, input.entityId, input.action, JSON.stringify(input.payload), now, input.actor?.type ?? "system", input.actor?.id ?? "system"]
  });
}

export async function recordProviderUsage(input: {
  provider: string;
  operation: string;
  units: number;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  runId?: string;
}) {
  await ensureDatabase();
  await getDatabase().execute({
    sql: `INSERT INTO provider_usage (id, run_id, provider, operation, units, input_tokens, output_tokens, latency_ms, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), input.runId ?? null, input.provider, input.operation, input.units, input.inputTokens ?? 0, input.outputTokens ?? 0, input.latencyMs, new Date().toISOString()]
  });
}

export async function saveBooking(input: {
  company: string;
  attendeeName: string;
  attendeeEmail: string;
  startsAt: string;
  providerUid?: string;
  attendeeTimeZone?: string;
  threadId?: string;
  eventUrl?: string;
  idempotencyKey?: string;
}) {
  await ensureDatabase();
  const now = new Date().toISOString();
  await getDatabase().execute({
    sql: `INSERT INTO bookings (id, company, attendee_name, attendee_email, starts_at, provider_uid, status, created_at, attendee_time_zone, thread_id, event_url, idempotency_key)
          VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)`,
    args: [randomUUID(), input.company, input.attendeeName, input.attendeeEmail, input.startsAt, input.providerUid ?? null, now, input.attendeeTimeZone ?? null, input.threadId ?? null, input.eventUrl ?? null, input.idempotencyKey ?? null]
  });
}

export async function listBookings() {
  await ensureDatabase();
  const result = await getDatabase().execute(`SELECT id, company, attendee_name, attendee_email, starts_at, provider_uid, status, attendee_time_zone, thread_id, event_url, created_at
    FROM bookings WHERE status='confirmed' ORDER BY starts_at ASC`);
  return result.rows;
}
