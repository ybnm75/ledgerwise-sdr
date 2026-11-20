import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { classifyReplyDeterministically, enforceOutboundPolicy, honestBotReply } from "@/lib/policy";

const ReplySchema = z.object({
  intent: z.enum(["interested", "question", "objection", "unsubscribe", "bot_question", "unknown"]),
  action: z.enum(["reply", "offer_slots", "suppress", "handoff"]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  reply: z.string()
});

export type AgentReply = z.infer<typeof ReplySchema> & {
  source: "policy" | "model" | "fallback";
};

const instructions = `You are the supervised email agent for Ledgerwise, a US bookkeeping firm serving ecommerce brands.

Rules:
1. Never quote a price. Pricing is discussed on a call.
2. Never state a company-specific fact unless it appears in the supplied evidence.
3. Stop, unsubscribe, or not-interested requests must produce action=suppress and an empty reply.
4. If asked whether you are a bot, say honestly that you are an AI assistant supervised by Ledgerwise's human team.
5. If you are uncertain, the request is sensitive, or confidence is below 0.8, action=handoff.
6. Keep replies under 90 words. Do not pressure the prospect.
7. If the prospect wants to talk, action=offer_slots. Do not invent times.`;

export async function draftReply(input: {
  message: string;
  company: string;
  evidence: string[];
}): Promise<AgentReply> {
  const deterministic = classifyReplyDeterministically(input.message);
  if (deterministic?.action === "suppress") {
    return { ...deterministic, reply: "", source: "policy" };
  }
  if (deterministic?.intent === "bot_question") {
    return { ...deterministic, reply: honestBotReply(), source: "policy" };
  }
  if (deterministic?.action === "offer_slots") {
    return { ...deterministic, reply: "I’d be glad to arrange that. I’ll check the Ledgerwise team’s live calendar and send a few available times.", source: "policy" };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      intent: "unknown",
      action: "handoff",
      confidence: 0,
      reason: "The AI provider is not configured, so the thread is routed to a human.",
      reply: "",
      source: "fallback"
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-6.2-sol",
    input: [
      { role: "system", content: instructions },
      {
        role: "user",
        content: JSON.stringify({
          company: input.company,
          verifiedEvidence: input.evidence,
          prospectReply: input.message
        })
      }
    ],
    text: { format: zodTextFormat(ReplySchema, "ledgerwise_reply") }
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    return {
      intent: "unknown",
      action: "handoff",
      confidence: 0,
      reason: "The model did not return a usable structured decision.",
      reply: "",
      source: "fallback"
    };
  }

  const outbound = enforceOutboundPolicy(parsed.reply);
  if (!outbound.allowed || parsed.confidence < 0.8) {
    return {
      ...parsed,
      action: "handoff",
      reason: !outbound.allowed
        ? `A deterministic outbound check blocked: ${outbound.violations.join(", ")}.`
        : "The model confidence is below the automatic-reply threshold.",
      reply: "",
      source: "model"
    };
  }

  return { ...parsed, source: "model" };
}
