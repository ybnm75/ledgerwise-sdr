import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, hasValidOrigin, passwordMatches, verifySessionToken } from "@/lib/auth";

describe("reviewer authentication", () => {
  const previous = { ...process.env };

  beforeEach(() => {
    process.env.APP_PASSWORD = "test-reviewer-password";
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env = { ...previous };
  });

  it("signs and verifies an unexpired session", () => {
    const now = Date.parse("2026-11-20T12:00:00Z");
    expect(verifySessionToken(createSessionToken(now), now)?.role).toBe("salesperson");
  });

  it("rejects tampered and expired sessions", () => {
    const now = Date.parse("2026-11-20T12:00:00Z");
    const token = createSessionToken(now);
    expect(verifySessionToken(`${token}x`, now)).toBeNull();
    expect(verifySessionToken(token, now + 9 * 60 * 60 * 1000)).toBeNull();
  });

  it("compares the configured password and rejects cross-origin mutations", () => {
    expect(passwordMatches("test-reviewer-password")).toBe(true);
    expect(passwordMatches("wrong-password")).toBe(false);
    expect(hasValidOrigin(new Request("https://desk.example/api", { headers: { origin: "https://evil.example" } }))).toBe(false);
    expect(hasValidOrigin(new Request("https://desk.example/api", { headers: { origin: "http://desk.example" } }))).toBe(false);
  });
});
