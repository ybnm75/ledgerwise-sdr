import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Client } from "langsmith/client";
import { evaluate } from "langsmith/evaluation";
import { traceable } from "langsmith/traceable";
import { draftReply } from "../src/lib/agent";
import { enforceOutboundPolicy } from "../src/lib/policy";
import { replyCases, type ReplyBenchmarkCase } from "../benchmarks/reply-cases";

type Output = Awaited<ReturnType<typeof runCase>>;
const mode = process.argv.includes("--smoke") ? "smoke" : process.env.BENCHMARK_MODE || "full";
const selected = mode === "smoke"
  ? (["stop", "booking", "bot"] as const).flatMap((category) => replyCases.filter((item) => item.category === category).slice(0, 7)).slice(0, 20)
  : replyCases;
const datasetVersion = createHash("sha256").update(JSON.stringify(replyCases)).digest("hex").slice(0, 12);
const datasetName = `ledgerwise-replies-${datasetVersion}`;

async function runCase(input: { message: string; category: string }) {
  const started = performance.now();
  const result = await draftReply({ message: input.message, company: "Benchmark Company", evidence: ["Benchmark Company sells products online."] });
  return { ...result, latencyMs: performance.now() - started, policyAllowed: enforceOutboundPolicy(result.reply).allowed };
}

const tracedTarget = traceable(runCase, {
  name: "ledgerwise-reply-benchmark",
  run_type: "chain",
  tags: ["benchmark", "reply-v2", mode],
  processInputs: (inputs) => ({ category: String((inputs as { category?: string }).category || "unknown"), messageHash: createHash("sha256").update(String((inputs as { message?: string }).message || "")).digest("hex") }),
  processOutputs: (outputs) => ({ action: outputs.action, intent: outputs.intent, confidence: outputs.confidence, latencyMs: outputs.latencyMs, policyAllowed: outputs.policyAllowed })
});

function pass(caseItem: ReplyBenchmarkCase, output: Output) {
  return output.action === caseItem.expectedAction &&
    (!caseItem.expectedIntent || output.intent === caseItem.expectedIntent) &&
    (!caseItem.requiredText || output.reply.includes(caseItem.requiredText)) &&
    output.policyAllowed;
}

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))] ?? 0;
}

function summarize(rows: Array<{ caseItem: ReplyBenchmarkCase; output: Output }>, experimentName?: string) {
  const categoryResults = Object.fromEntries([...new Set(rows.map((row) => row.caseItem.category))].map((category) => {
    const subset = rows.filter((row) => row.caseItem.category === category);
    return [category, { passed: subset.filter((row) => pass(row.caseItem, row.output)).length, total: subset.length }];
  }));
  const latencies = rows.map((row) => row.output.latencyMs);
  const failures = rows.filter((row) => !pass(row.caseItem, row.output)).map((row) => ({ id: row.caseItem.id, expected: row.caseItem.expectedAction, action: row.output.action, intent: row.output.intent, reason: row.output.reason }));
  const critical = rows.filter((row) => ["stop", "booking", "bot", "pricing", "compliance", "injection"].includes(row.caseItem.category));
  return {
    generatedAt: new Date().toISOString(),
    dataset: { name: datasetName, version: datasetVersion, cases: rows.length, mode },
    experimentName: experimentName ?? null,
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    cost: { actualCashUsd: 0, freeTier: true, modelCalls: rows.filter((row) => row.output.source === "model").length, projectedPaidRateConfigured: false },
    latencyMs: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95), maximum: Math.max(...latencies, 0) },
    quality: {
      passed: rows.length - failures.length,
      total: rows.length,
      passRate: rows.length ? (rows.length - failures.length) / rows.length : 0,
      criticalPassed: critical.filter((row) => pass(row.caseItem, row.output)).length,
      criticalTotal: critical.length,
      categories: categoryResults
    },
    release: { passed: failures.length === 0, blockers: failures },
    limits: { langSmithBaseTraceCeiling: 4500, scheduledRunsPerMonth: 4, maximumBenchmarkCasesPerRun: 150 }
  };
}

async function localRun() {
  const rows = [];
  for (const caseItem of selected) rows.push({ caseItem, output: await tracedTarget({ message: caseItem.message, category: caseItem.category }) });
  return { rows, experimentName: undefined };
}

async function langSmithRun() {
  const client = new Client({ apiKey: process.env.LANGSMITH_API_KEY });
  if (!(await client.hasDataset({ datasetName }))) {
    const dataset = await client.createDataset(datasetName, { description: "Ledgerwise reply routing and safety benchmark." });
    await client.createExamples({
      datasetId: dataset.id,
      inputs: replyCases.map((item) => ({ message: item.message, category: item.category })),
      referenceOutputs: replyCases.map((item) => ({ id: item.id, expectedAction: item.expectedAction, expectedIntent: item.expectedIntent ?? null, requiredText: item.requiredText ?? null }))
    });
  }
  const releaseEvaluator = ({ outputs, referenceOutputs }: {
    run: unknown;
    example: unknown;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    referenceOutputs?: Record<string, unknown>;
  }) => ({
    key: "release_case_pass",
    score: Number(outputs.action === referenceOutputs?.expectedAction &&
      (!referenceOutputs?.expectedIntent || outputs.intent === referenceOutputs.expectedIntent) &&
      (!referenceOutputs?.requiredText || String(outputs.reply).includes(String(referenceOutputs.requiredText))) &&
      outputs.policyAllowed === true)
  });
  const experiment = await evaluate(runCase, {
    data: datasetName,
    experimentPrefix: `ledgerwise-reply-${mode}`,
    description: "Rules-first reply benchmark with critical safety gates.",
    metadata: { datasetVersion, model: process.env.GEMINI_MODEL || "gemini-3.8-flash", gitSha: process.env.GITHUB_SHA || "local" },
    maxConcurrency: 2,
    uploadRuns: true,
    disableEvaluatorTracing: true,
    evaluators: [releaseEvaluator]
  });
  const byMessage = new Map(replyCases.map((item) => [item.message, item]));
  const rows: Array<{ caseItem: ReplyBenchmarkCase; output: Output }> = [];
  for await (const row of experiment) {
    const message = String(row.run.inputs?.message || "");
    const caseItem = byMessage.get(message);
    if (caseItem) rows.push({ caseItem, output: row.run.outputs as Output });
  }
  return { rows, experimentName: experiment.experimentName };
}

const useLangSmith = Boolean(process.env.LANGSMITH_API_KEY) && mode !== "smoke";
const result = useLangSmith ? await langSmithRun() : await localRun();
const report = summarize(result.rows, result.experimentName);
await mkdir("benchmark-results", { recursive: true });
await writeFile("benchmark-results/latest.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.release.passed) process.exitCode = 1;
