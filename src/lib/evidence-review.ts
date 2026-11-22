import { createHash, randomUUID } from "node:crypto";
import { ensureDatabase, getDatabase } from "@/lib/db";
import { evaluateQualificationKinds } from "@/lib/qualification";
import { fetchPublicSource, sourceContainsExcerpt, SourceVerificationError, sourceReliability } from "@/lib/public-source";
import type { Evidence } from "@/lib/types";

export type ReviewedEvidenceInput = {
  companyId: string;
  kind: Evidence["kind"];
  claim: string;
  excerpt: string;
  sourceUrl: string;
  contactName?: string;
  contactRole?: string;
  actorId: string;
};

export async function verifyAndSaveEvidence(input: ReviewedEvidenceInput) {
  await ensureDatabase();
  const database = getDatabase();
  const companyResult = await database.execute({
    sql: "SELECT id, domain FROM companies WHERE id = ? LIMIT 1",
    args: [input.companyId]
  });
  const company = companyResult.rows[0];
  if (!company) throw new SourceVerificationError("The researched company was not found.", 404);

  const started = Date.now();
  const source = await fetchPublicSource(input.sourceUrl);
  if (!sourceContainsExcerpt(source.content, input.excerpt)) {
    throw new SourceVerificationError("The exact excerpt was not found on the public source page.", 422);
  }

  const evidenceKey = `${input.companyId}\n${input.kind}\n${source.url}\n${input.excerpt.replace(/\s+/g, " ").trim()}`;
  const evidenceId = `manual_${createHash("sha256").update(evidenceKey).digest("hex").slice(0, 24)}`;
  const existing = await database.execute({
    sql: `SELECT id, kind, claim, excerpt, source_url, source_title, captured_at
          FROM evidence WHERE id = ? LIMIT 1`,
    args: [evidenceId]
  });
  const kindsResult = await database.execute({ sql: "SELECT DISTINCT kind FROM evidence WHERE company_id = ?", args: [input.companyId] });
  const kinds = [...new Set([...kindsResult.rows.map((row) => String(row.kind) as Evidence["kind"]), input.kind])];
  const qualification = evaluateQualificationKinds(kinds);
  const timestamp = new Date().toISOString();
  const reliability = sourceReliability(source.url, String(company.domain));
  const contactId = `contact_${createHash("sha256").update(`${input.companyId}\n${input.contactName ?? ""}\n${input.contactRole ?? ""}`).digest("hex").slice(0, 24)}`;
  const operations: Array<{ sql: string; args: Array<string | number | null> }> = [
    {
      sql: `INSERT OR IGNORE INTO source_snapshots (id, company_id, source_url, source_title, content_text, content_hash, captured_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), input.companyId, source.url, source.title, source.content.slice(0, 100_000), source.contentHash, timestamp]
    },
    {
      sql: `INSERT OR IGNORE INTO evidence (id, company_id, kind, claim, excerpt, source_url, source_title, captured_at, reliability, content_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [evidenceId, input.companyId, input.kind, input.claim, input.excerpt.replace(/\s+/g, " ").trim(), source.url, source.title, timestamp, reliability, source.contentHash]
    },
    {
      sql: `INSERT INTO qualification_results (company_id, score, band, rationale, gates_json, gaps_json, policy_version, evaluated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'qualification-v3-human-review', ?)
            ON CONFLICT(company_id) DO UPDATE SET score=excluded.score, band=excluded.band, rationale=excluded.rationale,
              gates_json=excluded.gates_json, gaps_json=excluded.gaps_json, policy_version=excluded.policy_version, evaluated_at=excluded.evaluated_at`,
      args: [input.companyId, qualification.score, qualification.band, qualification.rationale, JSON.stringify(qualification.gates), JSON.stringify(qualification.gaps), timestamp]
    },
    {
      sql: `UPDATE companies SET status=?, location=CASE WHEN ?='location' THEN ? ELSE location END, updated_at=? WHERE id=?`,
      args: [qualification.band === "qualified" ? "qualified" : "review", input.kind, input.kind === "location" ? input.claim : null, timestamp, input.companyId]
    },
    {
      sql: `INSERT INTO audit_events (id, entity_type, entity_id, action, payload_json, created_at, actor_type, actor_id)
            VALUES (?, 'lead', ?, 'evidence.verified', ?, ?, 'human', ?)`,
      args: [randomUUID(), input.companyId, JSON.stringify({ evidenceId, kind: input.kind, sourceUrl: source.url, contentHash: source.contentHash, duplicate: existing.rows.length > 0 }), timestamp, input.actorId]
    },
    {
      sql: `INSERT INTO provider_usage (id, run_id, provider, operation, units, latency_ms, created_at)
            VALUES (?, NULL, 'direct', 'human-evidence-verification', 1, ?, ?)`,
      args: [randomUUID(), Date.now() - started, timestamp]
    }
  ];
  if (input.kind === "contact" && input.contactName && input.contactRole) {
    operations.splice(2, 0, {
      sql: `INSERT INTO contacts (id, company_id, name, role, email, email_status, source_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, NULL, 'source-verified', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, source_url=excluded.source_url, updated_at=excluded.updated_at`,
      args: [contactId, input.companyId, input.contactName, input.contactRole, source.url, timestamp, timestamp]
    });
  }
  await database.batch(operations, "write");

  const stored = existing.rows[0];
  const evidence: Evidence = stored ? {
    id: String(stored.id),
    kind: String(stored.kind) as Evidence["kind"],
    claim: String(stored.claim),
    quote: String(stored.excerpt),
    url: String(stored.source_url),
    sourceTitle: String(stored.source_title),
    capturedAt: String(stored.captured_at)
  } : {
    id: evidenceId,
    kind: input.kind,
    claim: input.claim,
    quote: input.excerpt.replace(/\s+/g, " ").trim(),
    url: source.url,
    sourceTitle: source.title,
    capturedAt: timestamp
  };
  return {
    evidence,
    duplicate: existing.rows.length > 0,
    score: qualification.score,
    status: qualification.band === "qualified" ? "qualified" as const : "review" as const,
    rationale: qualification.rationale,
    gaps: qualification.gaps,
    contactName: input.kind === "contact" ? input.contactName ?? null : undefined,
    contactRole: input.kind === "contact" ? input.contactRole ?? null : undefined,
    location: input.kind === "location" ? input.claim : undefined
  };
}
