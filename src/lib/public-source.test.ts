import { describe, expect, it } from "vitest";
import { isPrivateAddress, normalizeSourceText, sourceContainsExcerpt, sourceReliability } from "@/lib/public-source";

describe("public source verification", () => {
  it("matches exact evidence despite harmless whitespace and case differences", () => {
    expect(normalizeSourceText("  New\nYork  ")).toBe("new york");
    expect(sourceContainsExcerpt("The company is based in Austin, Texas.", "company is based in  AUSTIN, Texas")).toBe(true);
    expect(sourceContainsExcerpt("The company is based in Austin.", "A different unsupported statement")).toBe(false);
  });

  it("rejects private IPv4, IPv6, and mapped addresses", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("192.168.1.10")).toBe(true);
    expect(isPrivateAddress("100.64.0.1")).toBe(true);
    expect(isPrivateAddress("203.0.113.10")).toBe(true);
    expect(isPrivateAddress("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("labels company-domain sources separately from third-party sources", () => {
    expect(sourceReliability("https://www.brand.example/news", "brand.example")).toBe("first_party");
    expect(sourceReliability("https://press.brand.example/news", "brand.example")).toBe("first_party");
    expect(sourceReliability("https://news.example/story", "brand.example")).toBe("third_party");
  });
});
