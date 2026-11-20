CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  owner TEXT NOT NULL,
  state TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL,
  provider_message_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS agent_decisions (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  action TEXT NOT NULL,
  confidence REAL NOT NULL,
  reason TEXT NOT NULL,
  reply TEXT NOT NULL,
  risk_flags_json TEXT NOT NULL,
  source TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS decisions_thread_idx ON agent_decisions(thread_id, created_at);

CREATE TABLE IF NOT EXISTS thread_ownership (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  previous_owner TEXT NOT NULL,
  new_owner TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

ALTER TABLE suppressions ADD COLUMN thread_id TEXT;
ALTER TABLE suppressions ADD COLUMN triggering_message_id TEXT;
