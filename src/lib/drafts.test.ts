import { describe, expect, it } from "vitest";
import { draftPolicyResult } from "@/lib/drafts";

describe("draft review policy", () => {
  it("allows a reviewer to reject content that outbound policy would block", () => {
    expect(draftPolicyResult("rejected", "A product costs $192.00.")).toEqual({
      allowed: true,
      violations: []
    });
  });

  it("still blocks price language from pending and approved drafts", () => {
    expect(draftPolicyResult("pending", "A product costs $192.00.").allowed).toBe(false);
    expect(draftPolicyResult("approved", "A product costs $192.00.").allowed).toBe(false);
  });
});
