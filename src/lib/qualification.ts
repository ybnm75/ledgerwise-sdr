import type { Evidence } from "@/lib/types";

const weights: Record<Evidence["kind"], number> = {
  commerce: 25,
  location: 15,
  size: 20,
  trigger: 30,
  contact: 10
};

export function scoreEvidence(evidence: Evidence[]) {
  const kinds = new Set(evidence.map((item) => item.kind));
  return [...kinds].reduce((score, kind) => score + weights[kind], 0);
}

export function qualificationBand(score: number) {
  if (score >= 75) return "Strong fit";
  if (score >= 55) return "Review";
  return "Research needed";
}
