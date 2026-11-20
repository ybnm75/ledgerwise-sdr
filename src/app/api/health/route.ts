import { ensureDatabase, getDatabase } from "@/lib/db";

export async function GET() {
  try {
    await ensureDatabase();
    await getDatabase().execute("SELECT 1 AS ok");
    return Response.json({ status: "healthy" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
