import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { runtimeEnvironment } from "@/lib/env";

export const SESSION_COOKIE = "ledgerwise_session";
const SESSION_SECONDS = 8 * 60 * 60;

export type Session = {
  sub: "reviewer";
  role: "salesperson";
  exp: number;
};

function sign(value: string) {
  return createHmac("sha256", runtimeEnvironment().AUTH_SECRET).update(value).digest("base64url");
}

export function createSessionToken(now = Date.now()) {
  const payload: Session = {
    sub: "reviewer",
    role: "salesperson",
    exp: Math.floor(now / 1000) + SESSION_SECONDS
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): Session | null {
  if (!token) return null;
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expectedSignature = sign(encoded);
  const expected = Buffer.from(expectedSignature);
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Session;
    if (payload.sub !== "reviewer" || payload.role !== "salesperson" || payload.exp <= Math.floor(now / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function passwordMatches(candidate: string) {
  const actual = Buffer.from(runtimeEnvironment().APP_PASSWORD);
  const supplied = Buffer.from(candidate);
  return actual.length === supplied.length && timingSafeEqual(actual, supplied);
}

export async function currentSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

function cookieToken(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1];
}

export function requestSession(request: Request) {
  return verifySessionToken(cookieToken(request));
}

export function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.VERCEL_ENV !== "production";
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function requireApiSession(request: Request, options?: { mutation?: boolean }) {
  const session = requestSession(request);
  if (!session) {
    return { session: null, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (options?.mutation && !hasValidOrigin(request)) {
    return { session: null, response: NextResponse.json({ error: "Request origin was rejected." }, { status: 403 }) };
  }
  return { session, response: null };
}
