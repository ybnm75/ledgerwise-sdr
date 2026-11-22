import { randomUUID } from "node:crypto";
import { RunTree } from "langsmith";
import { ensureDatabase, getDatabase, recordAuditEvent, recordProviderUsage } from "@/lib/db";
import { draftPolicyResult, generateGroundedDraft } from "@/lib/drafts";
import type { Evidence } from "@/lib/types";

export type SdrAgentStep = {
  id: "inspect" | "retrieve" | "qualify" | "draft" | "policy" | "approval";
  label: string;
  status: "complete" | "blocked" | "waiting";
  summary: string;
  latencyMs: number;
};

export type SdrAgentRun = {
  id: string;
  status: "blocked" | "awaiting_approval";
  nextAction: string;
  model: string;
  durationMs: number;
  cashCostUsd: 0;
  traceEnabled: boolean;
  steps: SdrAgentStep[];
  citations: Array<{ id: string; kind: Evidence["kind"]; claim: string; url: string }>;
  usage: { inputTokens: number; outputTokens: number; providerLatencyMs: number };
  draft?: Awaited<ReturnType<typeof generateGroundedDraft>>;
};

export function nextSdrAgentAction(input: { band: string; evidenceKinds: Iterable<string>; gaps: string[] }) {
  const kinds = new Set(input.evidenceKinds);
  if (input.band !== "qualified") {
    return { action: "verify_evidence" as const, reason: `Human verification required: ${input.gaps.join(", ") || "qualification policy incomplete"}.` };
  }
  if (!kinds.has("commerce") || !kinds.has("trigger")) {
    return { action: "verify_grounding" as const, reason: "Verified commerce and trigger evidence are required before drafting." };
  }
  return { action: "generate_draft" as const, reason: "Qualification and grounding gates passed." };
}

function completedStep(id: SdrAgentStep["id"], label: string, summary: string, started: number): SdrAgentStep {
  return { id, label, status: "complete", summary, latencyMs: Date.now() - started };
}

function safeJsonArray(value: unknown) {
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function sendTrace(action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    console.warn("LangSmith SDR agent trace failed", error instanceof Error ? error.message : error);
  }
}

export async function runSdrAgent(companyId: string, requestedBy: string): Promise<SdrAgentRun> {
  await ensureDatabase();
  const database = getDatabase();
  const runId = randomUUID();
  const runStarted = Date.now();
  const steps: SdrAgentStep[] = [];
  const traceEnabled = Boolean(process.env.LANGSMITH_API_KEY);
  const trace = traceEnabled ? new RunTree({
    name: "ledgerwise-sdr-agent",
    run_type: "chain",
    project_name: process.env.LANGSMITH_PROJECT || "ledgerwise-evaluation",
    tracingEnabled: true,
    inputs: { companyId },
    tags: ["production", "bounded-agent", "human-approval"],
    metadata: { agentVersion: "sdr-agent-v1", requestedBy }
  }) : null;
  if (trace) await sendTrace(() => trace.postRun());

  try {
    let started = Date.now();
    const companyResult = await database.execute({
      sql: `SELECT c.name, c.status, q.score, q.band, q.gaps_json
            FROM companies c JOIN qualification_results q ON q.company_id = c.id
            WHERE c.id = ? LIMIT 1`,
      args: [companyId]
    });
    const company = companyResult.rows[0];
    if (!company) throw new Error("The company must be researched before the SDR agent can run.");
    steps.push(completedStep("inspect", "Inspect lead", `Loaded ${String(company.name)} and its current qualification result.`, started));

    started = Date.now();
    const evidenceResult = await database.execute({
      sql: `SELECT id, kind, claim, source_url FROM evidence WHERE company_id = ? ORDER BY captured_at DESC`,
      args: [companyId]
    });
    const citations = evidenceResult.rows.map((row) => ({
      id: String(row.id),
      kind: String(row.kind) as Evidence["kind"],
      claim: String(row.claim),
      url: String(row.source_url)
    }));
    steps.push(completedStep("retrieve", "Retrieve verified evidence", `Retrieved ${citations.length} server-verified citations.`, started));

    started = Date.now();
    const gaps = safeJsonArray(company.gaps_json);
    const decision = nextSdrAgentAction({ band: String(company.band), evidenceKinds: citations.map((item) => item.kind), gaps });
    if (decision.action !== "generate_draft") {
      steps.push({ id: "qualify", label: "Evaluate qualification", status: "blocked", summary: decision.reason, latencyMs: Date.now() - started });
      steps.push({ id: "approval", label: "Human approval", status: "waiting", summary: "No draft or send action was taken.", latencyMs: 0 });
      const result: SdrAgentRun = {
        id: runId,
        status: "blocked",
        nextAction: decision.reason,
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        durationMs: Date.now() - runStarted,
        cashCostUsd: 0,
        traceEnabled,
        steps,
        citations,
        usage: { inputTokens: 0, outputTokens: 0, providerLatencyMs: 0 }
      };
      await recordAuditEvent({ entityType: "lead", entityId: companyId, action: "agent.run.blocked", payload: result, actor: { type: "agent", id: "sdr-agent-v1" } });
      await recordProviderUsage({ provider: "internal", operation: "sdr-agent-run", units: steps.length, latencyMs: result.durationMs, runId });
      if (trace) {
        steps.forEach((step) => trace.addEvent({ name: step.id, message: step.summary }));
        await trace.end({ status: result.status, nextAction: result.nextAction });
        await sendTrace(() => trace.patchRun());
      }
      return result;
    }
    steps.push(completedStep("qualify", "Evaluate qualification", `Score ${Number(company.score)} passes every mandatory gate.`, started));

    started = Date.now();
    const draft = await generateGroundedDraft(companyId, "sdr-agent-v1", runId);
    steps.push(completedStep("draft", "Generate grounded draft", `Created immutable draft revision ${draft.version} from verified evidence.`, started));

    started = Date.now();
    const policy = draftPolicyResult("pending", draft.body);
    if (!policy.allowed) throw new Error(`Outbound policy blocked: ${policy.violations.join(", ")}.`);
    steps.push(completedStep("policy", "Run policy checks", "Grounding, pricing, disclosure, and approval boundaries passed.", started));
    steps.push({ id: "approval", label: "Human approval", status: "waiting", summary: "A reviewer must approve this exact revision before delivery.", latencyMs: 0 });

    const usageResult = await database.execute({
      sql: `SELECT COALESCE(SUM(input_tokens), 0) AS input_tokens, COALESCE(SUM(output_tokens), 0) AS output_tokens,
            COALESCE(SUM(latency_ms), 0) AS latency_ms FROM provider_usage WHERE run_id = ? AND provider = 'groq'`,
      args: [runId]
    });
    const usageRow = usageResult.rows[0];
    const result: SdrAgentRun = {
      id: runId,
      status: "awaiting_approval",
      nextAction: "Review and approve the generated draft. The agent cannot send it.",
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      durationMs: Date.now() - runStarted,
      cashCostUsd: 0,
      traceEnabled,
      steps,
      citations,
      usage: {
        inputTokens: Number(usageRow?.input_tokens ?? 0),
        outputTokens: Number(usageRow?.output_tokens ?? 0),
        providerLatencyMs: Number(usageRow?.latency_ms ?? 0)
      },
      draft
    };
    await recordAuditEvent({ entityType: "lead", entityId: companyId, action: "agent.run.awaiting_approval", payload: { ...result, draft: { id: draft.id, version: draft.version } }, actor: { type: "agent", id: "sdr-agent-v1" } });
    await recordProviderUsage({ provider: "internal", operation: "sdr-agent-run", units: steps.length, latencyMs: result.durationMs, runId });
    if (trace) {
      steps.forEach((step) => trace.addEvent({ name: step.id, message: step.summary }));
      await trace.end({ status: result.status, draftId: draft.id, nextAction: result.nextAction, usage: result.usage });
      await sendTrace(() => trace.patchRun());
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "The SDR agent failed.";
    await recordAuditEvent({ entityType: "lead", entityId: companyId, action: "agent.run.failed", payload: { runId, message, steps }, actor: { type: "agent", id: "sdr-agent-v1" } });
    if (trace) {
      await trace.end({}, message);
      await sendTrace(() => trace.patchRun());
    }
    throw error;
  }
}
