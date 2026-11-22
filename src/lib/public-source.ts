import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SourceVerificationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "SourceVerificationError";
  }
}

export function normalizeSourceText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
}

export function sourceContainsExcerpt(content: string, excerpt: string) {
  const normalizedExcerpt = normalizeSourceText(excerpt);
  return normalizedExcerpt.length >= 20 && normalizeSourceText(content).includes(normalizedExcerpt);
}

export function isPrivateAddress(rawAddress: string) {
  const address = rawAddress.toLowerCase().replace(/^\[|\]$/g, "");
  if (address.startsWith("::ffff:")) return isPrivateAddress(address.slice(7));
  if (address === "::1" || address === "::" || address.startsWith("fe8") || address.startsWith("fe9") ||
    address.startsWith("fea") || address.startsWith("feb") || address.startsWith("fc") || address.startsWith("fd") ||
    address.startsWith("2001:db8:")) return true;
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 0 && (parts[2] === 0 || parts[2] === 2)) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19 || parts[1] === 51)) ||
    (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) || parts[0] >= 224;
}

export async function assertPublicSourceUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SourceVerificationError("Enter a valid public source URL.", 400);
  }
  if (!(["https:", "http:"] as string[]).includes(url.protocol) || url.username || url.password || url.port) {
    throw new SourceVerificationError("Only standard public HTTP sources are allowed.", 400);
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new SourceVerificationError("Private source addresses are not allowed.", 400);
  }
  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new SourceVerificationError("Private source addresses are not allowed.", 400);
  }
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new SourceVerificationError("The source hostname could not be resolved.", 422);
  }
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new SourceVerificationError("Private source addresses are not allowed.", 400);
  }
  return url;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlToText(html: string) {
  return decodeEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html: string, fallback: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeEntities(match?.[1] ?? fallback).replace(/\s+/g, " ").trim().slice(0, 300);
}

async function readLimitedBody(response: Response, limit: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new SourceVerificationError("The source page is too large to verify safely.", 422);
    }
    result += decoder.decode(value, { stream: true });
  }
  return result + decoder.decode();
}

export async function fetchPublicSource(rawUrl: string, redirects = 0): Promise<{ url: string; title: string; content: string; contentHash: string }> {
  if (redirects > 3) throw new SourceVerificationError("The source redirected too many times.", 422);
  const url = await assertPublicSourceUrl(rawUrl);
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      headers: { "User-Agent": "LedgerwiseEvidenceReview/1.0 (+human-reviewed case-study evidence)" },
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    throw new SourceVerificationError("The public source could not be fetched.", 502);
  }
  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    return fetchPublicSource(new URL(location, url).toString(), redirects + 1);
  }
  if (!response.ok) throw new SourceVerificationError(`The public source returned ${response.status}.`, 422);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new SourceVerificationError("The source must be a readable HTML or text page.", 422);
  }
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > 1_000_000) throw new SourceVerificationError("The source page is too large to verify safely.", 422);
  const raw = await readLimitedBody(response, 1_000_000);
  const content = contentType.includes("text/html") ? htmlToText(raw) : raw.replace(/\s+/g, " ").trim();
  if (content.length < 20) throw new SourceVerificationError("The source did not contain enough readable text.", 422);
  return {
    url: url.toString(),
    title: contentType.includes("text/html") ? titleFromHtml(raw, url.hostname) : url.hostname,
    content,
    contentHash: createHash("sha256").update(content).digest("hex")
  };
}

export function sourceReliability(sourceUrl: string, companyDomain: string) {
  const normalizeHost = (value: string) => value.toLowerCase().replace(/^www\./, "");
  const sourceHost = normalizeHost(new URL(sourceUrl).hostname);
  const companyHost = normalizeHost(companyDomain);
  return sourceHost === companyHost || sourceHost.endsWith(`.${companyHost}`) ? "first_party" : "third_party";
}
