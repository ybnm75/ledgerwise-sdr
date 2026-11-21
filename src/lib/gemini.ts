import { z } from "zod";
import { consumeQuota } from "@/lib/rate-limit";
import { recordProviderUsage } from "@/lib/db";

export function extractGeminiText(body: Record<string, unknown>) {
  if (typeof body.output_text === "string") return body.output_text;
  const steps = Array.isArray(body.steps) ? body.steps as Array<Record<string, unknown>> : [];
  return String(steps
    .filter((step) => step.type === "model_output" && Array.isArray(step.content))
    .flatMap((step) => step.content as Array<Record<string, unknown>>)
    .find((content) => content.type === "text")?.text || "");
}

export async function geminiJson<T>(input: {
  prompt: string;
  schema: Record<string, unknown>;
  validator: z.ZodType<T>;
  operation: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("The free-tier AI provider is not configured.");
  const quota = await consumeQuota({ scope: "gemini", subjectKey: input.operation, limit: 500, windowSeconds: 30 * 24 * 60 * 60 });
  if (!quota.allowed) throw new Error("The application AI quota has been reached.");
  const started = Date.now();
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      input: input.prompt,
      generation_config: {
        thinking_level: "low",
        thinking_summaries: "none"
      },
      response_format: { type: "text", mime_type: "application/json", schema: input.schema }
    }),
    signal: AbortSignal.timeout(60_000)
  });
  const body = await response.json() as Record<string, unknown>;
  const usage = (body.usage || body.usage_metadata || {}) as Record<string, unknown>;
  const inputTokens = Number(usage.total_input_tokens || usage.input_tokens || usage.prompt_token_count || 0);
  const outputTokens = Number(usage.total_output_tokens || usage.output_tokens || usage.candidates_token_count || 0);
  await recordProviderUsage({
    provider: "gemini",
    operation: input.operation,
    units: 1,
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - started
  });
  if (!response.ok) {
    const providerError = body.error as { message?: unknown } | undefined;
    throw new Error(`The AI provider failed with ${response.status}: ${String(providerError?.message || "unknown error")}`);
  }
  const output = extractGeminiText(body);
  if (!output) throw new Error("The AI provider returned no text output.");
  return input.validator.parse(JSON.parse(output));
}
