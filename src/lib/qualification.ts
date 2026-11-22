import type { Evidence } from "@/lib/types";

const weights: Record<Evidence["kind"], number> = {
  commerce: 20,
  location: 15,
  size: 20,
  revenue: 15,
  scale: 15,
  trigger: 20,
  contact: 10
};

export type QualificationResult = {
  score: number;
  band: "qualified" | "review" | "research_needed";
  gates: Record<Evidence["kind"] | "scaleSignal", boolean>;
  gaps: string[];
  rationale: string;
};

export function evaluateQualificationKinds(kindsInput: Iterable<Evidence["kind"]>): QualificationResult {
  const kinds = new Set(kindsInput);
  const score = [...kinds].reduce((total, kind) => total + weights[kind], 0);
  const gates = {
    commerce: kinds.has("commerce"),
    location: kinds.has("location"),
    size: kinds.has("size"),
    revenue: kinds.has("revenue"),
    scale: kinds.has("scale"),
    trigger: kinds.has("trigger"),
    contact: kinds.has("contact"),
    scaleSignal: kinds.has("size") || kinds.has("revenue") || kinds.has("scale")
  };
  const required = [
    ["Ecommerce activity", gates.commerce],
    ["US location", gates.location],
    ["Current trigger", gates.trigger],
    ["Named decision-maker", gates.contact],
    ["Scale signal", gates.scaleSignal]
  ] as const;
  const gaps = required.filter(([, present]) => !present).map(([label]) => label);
  const mandatory = gaps.length === 0;
  const band = score >= 80 && mandatory ? "qualified" : score >= 60 ? "review" : "research_needed";
  return {
    score,
    band,
    gates,
    gaps,
    rationale: band === "qualified"
      ? "The company passes the ecommerce, US location, current trigger, named decision-maker, and verified scale gates."
      : `The company remains ${band === "review" ? "in review" : "in research"} because ${gaps.join(", ").toLowerCase()} ${gaps.length === 1 ? "is" : "are"} not yet verified.`
  };
}

export function scoreEvidence(evidence: Evidence[]) {
  const kinds = new Set(evidence.map((item) => item.kind));
  return [...kinds].reduce((score, kind) => score + weights[kind], 0);
}

export function qualificationBand(score: number) {
  if (score >= 80) return "Strong fit";
  if (score >= 60) return "Review";
  return "Research needed";
}
