import { describe, expect, it } from "vitest";
import { suppressedContactReply } from "@/lib/agent";

describe("existing suppression policy", () => {
  it("never emits an automatic reply for an already-suppressed contact", () => {
    expect(suppressedContactReply()).toMatchObject({
      intent: "unsubscribe",
      action: "suppress",
      confidence: 1,
      reply: "",
      source: "policy"
    });
  });
});
