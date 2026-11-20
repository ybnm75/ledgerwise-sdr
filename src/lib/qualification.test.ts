import { describe, expect, it } from "vitest";
import { qualificationBand, scoreEvidence } from "@/lib/qualification";
import type { Evidence } from "@/lib/types";

const evidence = (kind: Evidence["kind"]): Evidence => ({
  id: kind,
  kind,
  claim: kind,
  quote: kind,
  url: "https://example.com",
  sourceTitle: "Test source",
  capturedAt: "2026-11-20T00:00:00Z"
});

describe("qualification", () => {
  it("counts each evidence class once", () => {
    expect(scoreEvidence([evidence("commerce"), evidence("commerce"), evidence("trigger")])).toBe(55);
  });

  it("maps thresholds to review bands", () => {
    expect(qualificationBand(75)).toBe("Strong fit");
    expect(qualificationBand(55)).toBe("Review");
    expect(qualificationBand(54)).toBe("Research needed");
  });
});
