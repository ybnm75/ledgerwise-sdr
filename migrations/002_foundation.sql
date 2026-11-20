ALTER TABLE audit_events ADD COLUMN actor_type TEXT;
ALTER TABLE audit_events ADD COLUMN actor_id TEXT;

CREATE TABLE IF NOT EXISTS auth_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  client_key TEXT NOT NULL,
  succeeded INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_events_client_idx
  ON auth_events(client_key, created_at);

CREATE TABLE IF NOT EXISTS quota_usage (
  scope TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  window_start TEXT NOT NULL,
  used INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(scope, subject_key, window_start)
);
