export const evidenceWeights = {
  commerce: 20,
  location: 15,
  size: 20,
  revenue: 15,
  scale: 15,
  trigger: 20,
  contact: 10
};

const monthPattern = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

export function triggerIsCurrent(value, asOf = new Date()) {
  const text = String(value || "");
  const patterns = [
    /\b20\d{2}-\d{2}-\d{2}\b/g,
    new RegExp(`\\b${monthPattern}\\s+\\d{1,2},?\\s+20\\d{2}\\b`, "gi"),
    new RegExp(`\\b${monthPattern}\\s+20\\d{2}\\b`, "gi")
  ];
  const dates = patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => new Date(match[0]))).filter((date) => !Number.isNaN(date.getTime()));
  const cutoff = new Date(asOf);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const futureTolerance = new Date(asOf.getTime() + 24 * 60 * 60 * 1000);
  return dates.some((date) => date >= cutoff && date <= futureTolerance);
}

export function isLiveHiringTrigger(sourceUrl, value) {
  const path = String(sourceUrl || "").toLowerCase();
  const text = String(value || "").toLowerCase();
  return /(?:career|jobs?|hiring|opportunities)/.test(path) &&
    /(?:full-time|part-time|opening|opportunit|hiring|apply|associate|manager|director|controller|account|finance|operations)/.test(text);
}

export function scaleEvidenceIsExplicit(value) {
  const text = String(value || "").toLowerCase();
  return /(?:\$|\b\d[\d,.]*\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|dozen|hundred|thousand|million|billion)\b)/.test(text) &&
    /(?:fund|rais|revenue|employee|team|hire|job|store|location|warehouse|customer|order|retail|expand|growth)/.test(text);
}

const labels = {
  commerce: "Ecommerce activity",
  location: "US location",
  trigger: "Current trigger",
  contact: "Named decision-maker",
  scale: "Scale signal"
};

export function qualifyEvidence(evidence) {
  const kinds = new Set(evidence.map((item) => item.kind));
  const score = [...kinds].reduce((total, kind) => total + (evidenceWeights[kind] || 0), 0);
  const gates = {
    commerce: kinds.has("commerce"),
    location: kinds.has("location"),
    size: kinds.has("size"),
    revenue: kinds.has("revenue"),
    scale: kinds.has("scale"),
    trigger: kinds.has("trigger"),
    contact: kinds.has("contact")
  };
  const scaleSignal = gates.size || gates.revenue || gates.scale;
  const required = {
    commerce: gates.commerce,
    location: gates.location,
    trigger: gates.trigger,
    contact: gates.contact,
    scale: scaleSignal
  };
  const mandatory = Object.values(required).every(Boolean);
  const band = score >= 80 && mandatory ? "qualified" : score >= 60 ? "review" : "research_needed";
  const gaps = Object.entries(required).filter(([, present]) => !present).map(([kind]) => labels[kind]);
  return {
    score,
    band,
    gates: { ...gates, scaleSignal },
    gaps,
    rationale: band === "qualified"
      ? "The company passes the ecommerce, US location, current trigger, named decision-maker, and verified scale gates."
      : `The company remains ${band === "review" ? "in review" : "in research"} because ${gaps.join(", ").toLowerCase()} ${gaps.length === 1 ? "is" : "are"} not yet verified.`
  };
}
