CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL,
  origin TEXT NOT NULL,
  status TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  UNIQUE(company_id, version)
);

CREATE INDEX IF NOT EXISTS drafts_company_idx ON drafts(company_id, version DESC);

CREATE TABLE IF NOT EXISTS send_attempts (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  draft_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_id TEXT,
  response_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(draft_id) REFERENCES drafts(id)
);
