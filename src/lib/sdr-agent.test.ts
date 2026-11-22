import { describe, expect, it } from "vitest";
import { nextSdrAgentAction } from "@/lib/sdr-agent";

describe("bounded SDR agent planning", () => {
  it("drafts only after qualification and grounding gates pass", () => {
    expect(nextSdrAgentAction({ band: "qualified", evidenceKinds: ["commerce", "trigger", "location", "contact", "scale"], gaps: [] }).action).toBe("generate_draft");
  });

  it("requests human evidence verification for an unqualified lead", () => {
    expect(nextSdrAgentAction({ band: "research_needed", evidenceKinds: ["commerce"], gaps: ["Current trigger"] })).toMatchObject({ action: "verify_evidence" });
  });

  it("does not draft without commerce grounding", () => {
    expect(nextSdrAgentAction({ band: "qualified", evidenceKinds: ["trigger"], gaps: [] }).action).toBe("verify_grounding");
  });

  it("does not draft without current-trigger grounding", () => {
    expect(nextSdrAgentAction({ band: "qualified", evidenceKinds: ["commerce"], gaps: [] }).action).toBe("verify_grounding");
  });

  it("ignores extra evidence without bypassing mandatory gates", () => {
    expect(nextSdrAgentAction({ band: "review", evidenceKinds: ["commerce", "trigger", "size", "revenue"], gaps: ["Named decision-maker"] }).action).toBe("verify_evidence");
  });
});
