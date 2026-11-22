import { beforeEach, describe, expect, it, vi } from "vitest";

const { runSdrAgent } = vi.hoisted(() => ({ runSdrAgent: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireApiSession: () => ({ session: { sub: "reviewer" }, response: null }) }));
vi.mock("@/lib/sdr-agent", () => ({ runSdrAgent }));

import { POST } from "@/app/api/leads/[id]/agent/run/route";

describe("SDR agent route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runSdrAgent.mockResolvedValue({ id: "run-1", status: "awaiting_approval", steps: [] });
  });

  it("runs the bounded agent as the authenticated reviewer", async () => {
    const response = await POST(new Request("https://ledgerwise.example/api/leads/company-1/agent/run", { method: "POST" }), { params: Promise.resolve({ id: "company-1" }) });
    expect(response.status).toBe(200);
    expect(runSdrAgent).toHaveBeenCalledWith("company-1", "reviewer");
  });

  it("does not hide agent failures", async () => {
    runSdrAgent.mockRejectedValue(new Error("Provider unavailable"));
    const response = await POST(new Request("https://ledgerwise.example/api/leads/company-1/agent/run", { method: "POST" }), { params: Promise.resolve({ id: "company-1" }) });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "Provider unavailable" });
  });
});
