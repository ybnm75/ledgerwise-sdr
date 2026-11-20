import { z } from "zod";
import { consumeQuota } from "@/lib/rate-limit";
import { recordProviderUsage } from "@/lib/db";

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
      response_format: { type: "text", mime_type: "application/json", schema: input.schema }
    }),
    signal: AbortSignal.timeout(60_000)
  });
  const body = await response.json() as Record<string, unknown>;
  const usage = (body.usage || body.usage_metadata || {}) as Record<string, unknown>;
  const inputTokens = Number(usage.input_tokens || usage.prompt_token_count || 0);
  const outputTokens = Number(usage.output_tokens || usage.candidates_token_count || 0);
  await recordProviderUsage({
    provider: "gemini",
    operation: input.operation,
    units: 1,
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - started
  });
  if (!response.ok) throw new Error(`The AI provider failed with ${response.status}.`);
  const output = String(body.output_text || "");
  return input.validator.parse(JSON.parse(output));
}
