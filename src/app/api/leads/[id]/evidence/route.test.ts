import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyAndSaveEvidence } = vi.hoisted(() => ({ verifyAndSaveEvidence: vi.fn() }));

vi.mock("@/lib/auth", () => ({ requireApiSession: () => ({ session: { sub: "reviewer" }, response: null }) }));
vi.mock("@/lib/evidence-review", () => ({ verifyAndSaveEvidence }));

import { POST } from "@/app/api/leads/[id]/evidence/route";

function request(body: unknown) {
  return new Request("https://ledgerwise.example/api/leads/company-1/evidence", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://ledgerwise.example" },
    body: JSON.stringify(body)
  });
}

describe("human-reviewed evidence route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAndSaveEvidence.mockResolvedValue({ evidence: { id: "manual-1" }, duplicate: false, score: 80, status: "qualified", gaps: [] });
  });

  it("verifies and saves a complete evidence submission", async () => {
    const response = await POST(request({
      kind: "location",
      claim: "The company is based in Austin, Texas.",
      excerpt: "Our headquarters are located in Austin, Texas.",
      sourceUrl: "https://brand.example/about"
    }), { params: Promise.resolve({ id: "company-1" }) });
    expect(response.status).toBe(201);
    expect(verifyAndSaveEvidence).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-1", actorId: "reviewer" }));
  });

  it("requires name and role when the reviewer verifies contact evidence", async () => {
    const response = await POST(request({
      kind: "contact",
      claim: "A named finance leader is listed.",
      excerpt: "Jordan Lee serves as Chief Financial Officer.",
      sourceUrl: "https://brand.example/team"
    }), { params: Promise.resolve({ id: "company-1" }) });
    expect(response.status).toBe(400);
    expect(verifyAndSaveEvidence).not.toHaveBeenCalled();
  });
});
