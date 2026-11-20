CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  category TEXT,
  location TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  claim TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_title TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  reliability TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS evidence_company_idx ON evidence(company_id, kind);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL,
  email TEXT,
  email_status TEXT NOT NULL,
  source_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qualification_results (
  company_id TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  band TEXT NOT NULL,
  rationale TEXT NOT NULL,
  gates_json TEXT NOT NULL,
  gaps_json TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_runs (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  succeeded_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  usage_json TEXT NOT NULL,
  error TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS research_tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  company_id TEXT,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TEXT,
  completed_at TEXT,
  UNIQUE(run_id, domain),
  FOREIGN KEY(run_id) REFERENCES research_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_title TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  UNIQUE(company_id, source_url, content_hash),
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_usage (
  id TEXT PRIMARY KEY,
  run_id TEXT,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  units INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
