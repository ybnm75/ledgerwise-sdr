import { describe, expect, it } from "vitest";
import { classifyReplyDeterministically, enforceOutboundPolicy, honestBotReply } from "@/lib/policy";
import { replyCases } from "../../benchmarks/reply-cases";

const stopCases = [
  "Stop emailing me.",
  "unsubscribe",
  "Please remove me from this list",
  "Not interested, thanks.",
  "Do not contact me again.",
  "Don't email this address.",
  "STOP",
  "We are not interested right now.",
  "Please unsubscribe our team.",
  "Remove me, please."
];

const bookingCases = [
  "Can we book a call?",
  "Let's talk next week.",
  "Do you have any free time Tuesday?",
  "Send me your calendar.",
  "I would like to schedule a chat.",
  "Sounds good, can we meet?",
  "What is your availability?",
  "Could we have a call tomorrow?",
  "Let's schedule 20 minutes.",
  "Happy to chat with your team."
];

const botCases = [
  "Are you a bot?",
  "Are you AI?",
  "Is this automated?",
  "Am I talking to a bot?",
  "Is this an AI assistant?"
];

describe("deterministic reply policy", () => {
  it.each(stopCases)("suppresses stop intent: %s", (message) => {
    expect(classifyReplyDeterministically(message)).toMatchObject({ action: "suppress", confidence: 1 });
  });

  it.each(bookingCases)("routes booking intent: %s", (message) => {
    expect(classifyReplyDeterministically(message)).toMatchObject({ action: "offer_slots" });
  });

  it.each(botCases)("detects bot identity questions: %s", (message) => {
    expect(classifyReplyDeterministically(message)).toMatchObject({ intent: "bot_question", action: "reply" });
  });

  it("covers every benchmark safety category before the model", () => {
    const deterministicCategories = new Set(["stop", "booking", "bot", "pricing", "compliance", "injection", "ambiguous"]);
    for (const item of replyCases.filter((candidate) => deterministicCategories.has(candidate.category))) {
      expect(classifyReplyDeterministically(item.message), item.id).toMatchObject({ action: item.expectedAction });
    }
  });

  it("answers bot questions honestly", () => {
    expect(honestBotReply()).toContain("AI assistant");
    expect(honestBotReply()).toContain("human sales team");
  });

  it.each([
    "It costs $500 per month.",
    "Pricing is 900 dollars.",
    "The monthly fee is reasonable."
  ])("blocks price language: %s", (message) => {
    expect(enforceOutboundPolicy(message)).toEqual({ allowed: false, violations: ["price_quote"] });
  });

  it.each([
    "I am not a bot.",
    "I'm not AI.",
    "This is not automated."
  ])("blocks dishonest bot denial: %s", (message) => {
    expect(enforceOutboundPolicy(message)).toEqual({ allowed: false, violations: ["bot_denial"] });
  });
});
