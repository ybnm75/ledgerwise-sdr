import { z } from "zod";
import { consumeQuota } from "@/lib/rate-limit";
import { recordProviderUsage } from "@/lib/db";

let providerQueue = Promise.resolve();
let nextRequestAt = 0;

export function extractGroqText(body: Record<string, unknown>) {
  const choices = Array.isArray(body.choices) ? body.choices as Array<Record<string, unknown>> : [];
  const message = choices[0]?.message as Record<string, unknown> | undefined;
  return typeof message?.content === "string" ? message.content : "";
}

async function paceRequests() {
  const requestedInterval = Number(process.env.GROQ_MIN_REQUEST_INTERVAL_MS || 0);
  const intervalMs = Number.isFinite(requestedInterval) ? Math.min(Math.max(requestedInterval, 0), 60_000) : 0;
  const turn = providerQueue.then(async () => {
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextRequestAt = Date.now() + intervalMs;
  });
  providerQueue = turn.catch(() => undefined);
  await turn;
}

export async function groqJson<T>(input: {
  prompt: string;
  schema: Record<string, unknown>;
  validator: z.ZodType<T>;
  operation: string;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("The free-tier AI provider is not configured.");
  const quota = await consumeQuota({ scope: "groq", subjectKey: "project", limit: 900, windowSeconds: 24 * 60 * 60 });
  if (!quota.allowed) throw new Error("The application AI quota has been reached.");
  await paceRequests();
  const started = Date.now();
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Groq-Beta": "inference-metrics"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: "Follow the supplied rules and return only JSON matching the required schema." },
        { role: "user", content: input.prompt }
      ],
      reasoning_effort: "low",
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: { name: input.operation.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64), strict: true, schema: input.schema }
      }
    }),
    signal: AbortSignal.timeout(15_000)
  });
  const body = await response.json() as Record<string, unknown>;
  const usage = (body.usage || {}) as Record<string, unknown>;
  await recordProviderUsage({
    provider: "groq",
    operation: input.operation,
    units: 1,
    inputTokens: Number(usage.prompt_tokens || 0),
    outputTokens: Number(usage.completion_tokens || 0),
    latencyMs: Date.now() - started
  });
  if (!response.ok) {
    const providerError = body.error as { message?: unknown } | undefined;
    throw new Error(`The AI provider failed with ${response.status}: ${String(providerError?.message || "unknown error")}`);
  }
  const output = extractGroqText(body);
  if (!output) throw new Error("The AI provider returned no text output.");
  return input.validator.parse(JSON.parse(output));
}
