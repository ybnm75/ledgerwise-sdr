import type { Lead, Evidence } from "@/lib/types";
import { ensureDatabase, getDatabase } from "@/lib/db";

function safeJsonArray(value: unknown) {
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function listResearchedLeads(): Promise<Lead[]> {
  await ensureDatabase();
  const companies = await getDatabase().execute(`SELECT c.id, c.name, c.domain, c.category, c.location, c.status,
    q.score, q.rationale, q.gaps_json,
    (SELECT role FROM contacts WHERE company_id = c.id ORDER BY updated_at DESC LIMIT 1) AS contact_role,
    (SELECT name FROM contacts WHERE company_id = c.id ORDER BY updated_at DESC LIMIT 1) AS contact_name
    FROM companies c JOIN qualification_results q ON q.company_id = c.id
    ORDER BY q.score DESC, c.name ASC LIMIT 100`);
  if (!companies.rows.length) return [];
  const leads: Lead[] = [];
  for (const row of companies.rows) {
    const result = await getDatabase().execute({
      sql: `SELECT id, kind, claim, excerpt, source_url, source_title, captured_at
            FROM evidence WHERE company_id = ? ORDER BY captured_at DESC`,
      args: [String(row.id)]
    });
    const evidence = result.rows.map((item) => ({
      id: String(item.id),
      kind: String(item.kind) as Evidence["kind"],
      claim: String(item.claim),
      quote: String(item.excerpt),
      url: String(item.source_url),
      sourceTitle: String(item.source_title),
      capturedAt: String(item.captured_at)
    }));
    const commerce = evidence.find((item) => item.kind === "commerce")?.claim ?? "The company has sourced ecommerce evidence.";
    const trigger = evidence.find((item) => item.kind === "trigger")?.claim ?? "A timely trigger still needs verification.";
    leads.push({
      id: String(row.id),
      company: String(row.name),
      domain: String(row.domain),
      category: String(row.category || "Ecommerce"),
      location: String(row.location || "Location unverified"),
      contactName: row.contact_name ? String(row.contact_name) : null,
      contactRole: String(row.contact_role || "Decision-maker unverified"),
      score: Number(row.score),
      status: String(row.status) as Lead["status"],
      rationale: String(row.rationale),
      gaps: safeJsonArray(row.gaps_json),
      evidence,
      draft: {
        subject: `${String(row.name)} finance operations`,
        body: `Hi there,\n\n${trigger} ${commerce}\n\nLedgerwise handles monthly bookkeeping for ecommerce brands. Would it be useful to compare notes on your current close?\n\nBest,\nLedgerwise`,
        status: "pending"
      }
    });
  }
  return leads;
}
