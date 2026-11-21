import { describe, expect, it } from "vitest";
import { draftPolicyResult, outreachSafeClaim } from "@/lib/drafts";

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

  it("removes product prices from evidence before composing outreach", () => {
    expect(outreachSafeClaim("Rookwood sells a Pinecone Vase for $192.00")).toBe("Rookwood sells a Pinecone Vase");
    expect(outreachSafeClaim("Holiday Tree Trio at $178.00 (regular price $198.00)")).not.toMatch(/\$/);
  });
});
