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

export function scoreEvidence(evidence: Evidence[]) {
  const kinds = new Set(evidence.map((item) => item.kind));
  return [...kinds].reduce((score, kind) => score + weights[kind], 0);
}

export function qualificationBand(score: number) {
  if (score >= 80) return "Strong fit";
  if (score >= 60) return "Review";
  return "Research needed";
}
