import { describe, expect, it } from "vitest";
import { isLiveHiringTrigger, qualifyEvidence, scaleEvidenceIsExplicit, triggerIsCurrent } from "./research-policy.mjs";

const evidence = (...kinds) => kinds.map((kind) => ({ kind }));

describe("scheduled research qualification", () => {
  it("qualifies a lead with every mandatory gate and a public scale signal", () => {
    const result = qualifyEvidence(evidence("commerce", "location", "trigger", "contact", "scale"));
    expect(result.band).toBe("qualified");
    expect(result.score).toBe(80);
    expect(result.gaps).toEqual([]);
  });

  it("accepts sourced employee count or revenue as the scale gate", () => {
    expect(qualifyEvidence(evidence("commerce", "location", "trigger", "contact", "size")).band).toBe("qualified");
    expect(qualifyEvidence(evidence("commerce", "location", "trigger", "contact", "revenue")).band).toBe("qualified");
  });

  it("does not qualify a high score with a missing mandatory gate", () => {
    const result = qualifyEvidence(evidence("commerce", "location", "trigger", "size", "revenue", "scale"));
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.band).not.toBe("qualified");
    expect(result.gaps).toContain("Named decision-maker");
  });

  it("accepts only explicitly dated triggers from the previous 12 months", () => {
    const asOf = new Date("2026-11-22T12:00:00Z");
    expect(triggerIsCurrent("The company expanded on March 15, 2019.", asOf)).toBe(false);
    expect(triggerIsCurrent("The company expanded on February 5, 2026.", asOf)).toBe(true);
    expect(triggerIsCurrent("The company recently expanded.", asOf)).toBe(false);
  });

  it("accepts a live first-party job listing as a current trigger", () => {
    expect(isLiveHiringTrigger("https://brand.example/pages/careers", "Full-time operations manager opportunity")).toBe(true);
    expect(isLiveHiringTrigger("https://brand.example/pages/about", "We value career growth")).toBe(false);
  });

  it("requires a quantified operational scale signal", () => {
    expect(scaleEvidenceIsExplicit("The company opened three retail stores.")).toBe(true);
    expect(scaleEvidenceIsExplicit("The company is growing quickly.")).toBe(false);
  });
});
