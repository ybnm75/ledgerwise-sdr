import { NextResponse } from "next/server";
import { hasValidOrigin, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Request origin was rejected." }, { status: 403 });
  const response = NextResponse.json({ data: { authenticated: false } });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
