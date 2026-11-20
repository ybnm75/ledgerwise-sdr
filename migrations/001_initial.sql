CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_state (
  id TEXT PRIMARY KEY,
  draft_status TEXT NOT NULL,
  draft_subject TEXT NOT NULL,
  draft_body TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_entity_idx
  ON audit_events(entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS suppressions (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  contact_key TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  provider_uid TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
