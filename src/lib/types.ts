export type LeadStatus = "qualified" | "review" | "rejected" | "suppressed";
export type DraftStatus = "pending" | "approved" | "rejected";

export type Evidence = {
  id: string;
  kind: "commerce" | "location" | "size" | "revenue" | "scale" | "trigger" | "contact";
  claim: string;
  quote: string;
  url: string;
  sourceTitle: string;
  capturedAt: string;
};

export type Lead = {
  id: string;
  company: string;
  domain: string;
  category: string;
  location: string;
  contactName: string | null;
  contactRole: string;
  score: number;
  status: LeadStatus;
  rationale: string;
  gaps: string[];
  evidence: Evidence[];
  draft: {
    subject: string;
    body: string;
    status: DraftStatus;
  };
};

export type ReplyDecision = {
  intent: "interested" | "question" | "objection" | "unsubscribe" | "bot_question" | "unknown";
  action: "reply" | "offer_slots" | "suppress" | "handoff";
  confidence: number;
  reason: string;
};
