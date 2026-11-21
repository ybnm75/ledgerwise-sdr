import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbExecute, sendApprovedEmail, latestDraft, draftEvidenceIsCurrent } = vi.hoisted(() => ({
  dbExecute: vi.fn(),
  sendApprovedEmail: vi.fn(),
  latestDraft: vi.fn(),
  draftEvidenceIsCurrent: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  requireApiSession: () => ({ session: { sub: "reviewer" }, response: null })
}));

vi.mock("@/lib/db", () => ({
  ensureDatabase: vi.fn(),
  getDatabase: () => ({ execute: dbExecute }),
  isSuppressed: vi.fn(async () => false),
  recordAuditEvent: vi.fn()
}));

vi.mock("@/lib/drafts", () => ({ latestDraft, draftEvidenceIsCurrent }));
vi.mock("@/lib/email", () => ({ sendApprovedEmail }));

import { POST } from "@/app/api/email/send/route";

function request() {
  return new Request("https://ledgerwise.example/api/email/send", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://ledgerwise.example" },
    body: JSON.stringify({ leadId: "company-1", to: "reviewer@example.com" })
  });
}

describe("approved email route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TEST_RECIPIENT_EMAIL = "reviewer@example.com";
    latestDraft.mockResolvedValue({
      id: "draft-1",
      companyId: "company-1",
      status: "approved",
      subject: "Subject",
      body: "Safe body",
      evidenceIds: ["evidence-1"],
      version: 1,
      origin: "human",
      contentHash: "hash"
    });
    draftEvidenceIsCurrent.mockResolvedValue(true);
    sendApprovedEmail.mockResolvedValue({ id: "resend-1" });
    dbExecute.mockImplementation(async (input: string | { sql: string }) => {
      const sql = typeof input === "string" ? input : input.sql;
      if (sql.includes("qualification_results")) return { rows: [{ band: "qualified" }] };
      if (sql.includes("SELECT status, response_json")) return { rows: [] };
      return { rows: [] };
    });
  });

  it("sends the latest qualified, current, human-approved revision", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(sendApprovedEmail).toHaveBeenCalledOnce();
  });

  it("blocks a lead that has not passed qualification", async () => {
    dbExecute.mockImplementation(async (input: string | { sql: string }) => {
      const sql = typeof input === "string" ? input : input.sql;
      if (sql.includes("qualification_results")) return { rows: [{ band: "research_needed" }] };
      return { rows: [] };
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(sendApprovedEmail).not.toHaveBeenCalled();
  });

  it("blocks a lead with no qualification result", async () => {
    dbExecute.mockImplementation(async () => ({ rows: [] }));
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(sendApprovedEmail).not.toHaveBeenCalled();
  });

  it("blocks an approved revision after its evidence becomes stale", async () => {
    draftEvidenceIsCurrent.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(sendApprovedEmail).not.toHaveBeenCalled();
  });
});
