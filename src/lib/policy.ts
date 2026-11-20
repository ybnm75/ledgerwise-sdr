import type { ReplyDecision } from "@/lib/types";

const stopPatterns = [
  /\bstop\b/i,
  /\bunsubscribe\b/i,
  /\bremove me\b/i,
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
  /\b(?:sounds good|let's talk|lets talk)\b/i
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
