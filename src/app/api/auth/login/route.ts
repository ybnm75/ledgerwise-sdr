import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createSessionToken, hasValidOrigin, passwordMatches, SESSION_COOKIE } from "@/lib/auth";
import { ensureDatabase, getDatabase } from "@/lib/db";
import { consumeQuota } from "@/lib/rate-limit";

const Login = z.object({ password: z.string().min(1).max(200) });

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Request origin was rejected." }, { status: 403 });
  const key = clientKey(request);
  const quota = await consumeQuota({ scope: "login", subjectKey: key, limit: 5, windowSeconds: 15 * 60 });
  if (!quota.allowed) return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  const parsed = Login.safeParse(await request.json());
  const succeeded = parsed.success && passwordMatches(parsed.data.password);
  await ensureDatabase();
  await getDatabase().execute({
    sql: `INSERT INTO auth_events (id, event_type, client_key, succeeded, created_at) VALUES (?, 'login', ?, ?, ?)`,
    args: [randomUUID(), key, succeeded ? 1 : 0, new Date().toISOString()]
  });
  if (!succeeded) return NextResponse.json({ error: "The password is incorrect." }, { status: 401 });
  const response = NextResponse.json({ data: { authenticated: true } });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60
  });
  return response;
}
