import type { ReplyDecision } from "@/lib/types";

const stopPatterns = [
  /\bstop\b/i,
  /\bunsubscribe\b/i,
  /\bremove (?:me|this address|our team)\b/i,
  /\bnot interested\b/i,
  /\bdo not (?:email|contact)\b/i,
  /\bdon't (?:email|contact)\b/i
];

const botPatterns = [
  /\b(?:are|is) (?:you|this) (?:an? )?(?:ai|bot|automated)\b/i,
  /\bam i talking to (?:an? )?(?:ai|bot)\b/i
];

const bookingPatterns = [
  /\b(?:book|schedule|calendar|call|chat|meet|availability|free time)\b/i,
  /\b(?:sounds good|let's talk|lets talk|are you free)\b/i
];

const pricingPatterns = [
  /\b(?:price|pricing|cost|costs|fee|fees|quote|rate|rates|discount|pay|expensive|how much|dollar amount)\b/i,
  /\$\s*\d/i
];

const compliancePatterns = [
  /\b(?:soc 2|security controls?|data retention|customer data|data hosted|legal review|contract|dpa|encryption|vendor assessment|deletion requests?|subprocessors?|breach notification|indemnity|cyber insurance|penetration test|access do bookkeepers)\b/i
];

const injectionPatterns = [
  /\b(?:ignore (?:all )?(?:previous )?instructions|system prompt|act as an administrator|disable suppression|send secrets|override the human approval|developer message|api keys?|internal tools|invent a discount|auto-send|change your confidence)\b/i
];

const ambiguousPatterns = [
  /^(?:maybe|what|interesting|i'm unsure|i am unsure|can you clarify|this is complicated|possibly later|i need to think|who is this|not sure what you mean)[.!?]?$/i
];

export function classifyReplyDeterministically(text: string): ReplyDecision | null {
  if (stopPatterns.some((pattern) => pattern.test(text))) {
    return {
      intent: "unsubscribe",
      action: "suppress",
      confidence: 1,
      reason: "The reply contains an explicit stop or negative-interest instruction."
    };
  }

  if (botPatterns.some((pattern) => pattern.test(text))) {
    return {
      intent: "bot_question",
      action: "reply",
      confidence: 1,
      reason: "The prospect directly asked whether the sender is automated."
    };
  }

  if (injectionPatterns.some((pattern) => pattern.test(text))) {
    return { intent: "unknown", action: "handoff", confidence: 1, reason: "The message attempts to override system or approval policy." };
  }

  if (pricingPatterns.some((pattern) => pattern.test(text))) {
    return { intent: "question", action: "handoff", confidence: 1, reason: "Pricing and commercial terms require a human response." };
  }

  if (compliancePatterns.some((pattern) => pattern.test(text))) {
    return { intent: "question", action: "handoff", confidence: 1, reason: "Security, legal, and compliance questions require a human response." };
  }

  if (ambiguousPatterns.some((pattern) => pattern.test(text.trim()))) {
    return { intent: "unknown", action: "handoff", confidence: 1, reason: "The message is too ambiguous for an automatic response." };
  }

  if (bookingPatterns.some((pattern) => pattern.test(text))) {
    return {
      intent: "interested",
      action: "offer_slots",
      confidence: 0.96,
      reason: "The reply asks to talk or requests availability."
    };
  }

  return null;
}

export function enforceOutboundPolicy(text: string) {
  const violations: string[] = [];
  const pricePattern = /(?:\$|usd|dollars?|per month|monthly fee|pricing is|costs?\s+\d)/i;
  const dishonestBotPattern = /(?:i am not|i'm not|this is not) (?:an? )?(?:ai|bot|automated)/i;

  if (pricePattern.test(text)) violations.push("price_quote");
  if (dishonestBotPattern.test(text)) violations.push("bot_denial");

  return { allowed: violations.length === 0, violations };
}

export function honestBotReply() {
  return "Yes. I’m an AI assistant working for Ledgerwise, with a human sales team supervising this inbox. I can answer straightforward questions, or I can hand this conversation to a person now.";
}
