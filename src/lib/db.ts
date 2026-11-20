import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "node:crypto";

let client: Client | null = null;
let ready: Promise<void> | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  return client;
}

export function ensureDatabase() {
  if (ready) return ready;
  const db = getClient();
  ready = db.batch([
    `CREATE TABLE IF NOT EXISTS lead_state (
      id TEXT PRIMARY KEY,
      draft_status TEXT NOT NULL,
      draft_subject TEXT NOT NULL,
      draft_body TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_events(entity_type, entity_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS suppressions (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      contact_key TEXT NOT NULL UNIQUE,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      attendee_name TEXT NOT NULL,
      attendee_email TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      provider_uid TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  ], "write").then(() => undefined);
  return ready;
}

export async function saveLeadDraft(input: {
  id: string;
  status: "pending" | "approved" | "rejected";
  subject: string;
  body: string;
}) {
  await ensureDatabase();
  const db = getClient();
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
      sql: `INSERT INTO audit_events (id, entity_type, entity_id, action, payload_json, created_at)
            VALUES (?, 'lead', ?, ?, ?, ?)`,
      args: [randomUUID(), input.id, `draft.${input.status}`, JSON.stringify({ subject: input.subject }), now]
    }
  ], "write");
  return { updatedAt: now };
}

export async function getLeadDraft(id: string) {
  await ensureDatabase();
  const result = await getClient().execute({
    sql: `SELECT id, draft_status, draft_subject, draft_body, updated_at FROM lead_state WHERE id = ? LIMIT 1`,
    args: [id]
  });
  return result.rows[0] ?? null;
}

export async function listAuditEvents(entityId: string) {
  await ensureDatabase();
  const result = await getClient().execute({
    sql: `SELECT id, action, payload_json, created_at FROM audit_events
          WHERE entity_id = ? ORDER BY created_at DESC LIMIT 50`,
    args: [entityId]
  });
  return result.rows;
}

export async function saveSuppression(input: { company: string; contactKey: string; reason: string }) {
  await ensureDatabase();
  const now = new Date().toISOString();
  await getClient().execute({
    sql: `INSERT INTO suppressions (id, company, contact_key, reason, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(contact_key) DO UPDATE SET reason = excluded.reason`,
    args: [randomUUID(), input.company, input.contactKey, input.reason, now]
  });
}

export async function isSuppressed(contactKey: string) {
  await ensureDatabase();
  const result = await getClient().execute({
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
}) {
  await ensureDatabase();
  const now = new Date().toISOString();
  await getClient().execute({
    sql: `INSERT INTO audit_events (id, entity_type, entity_id, action, payload_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), input.entityType, input.entityId, input.action, JSON.stringify(input.payload), now]
  });
}

export async function saveBooking(input: {
  company: string;
  attendeeName: string;
  attendeeEmail: string;
  startsAt: string;
  providerUid?: string;
}) {
  await ensureDatabase();
  const now = new Date().toISOString();
  await getClient().execute({
    sql: `INSERT INTO bookings (id, company, attendee_name, attendee_email, starts_at, provider_uid, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
    args: [randomUUID(), input.company, input.attendeeName, input.attendeeEmail, input.startsAt, input.providerUid ?? null, now]
  });
}
