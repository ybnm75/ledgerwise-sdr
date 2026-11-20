import { requireApiSession } from "@/lib/auth";
import { ensureDatabase, getDatabase } from "@/lib/db";

export async function GET(request: Request) {
  const auth = requireApiSession(request);
  if (auth.response) return auth.response;
  await ensureDatabase();
  const runs = await getDatabase().execute(`SELECT id, trigger_type, status, candidate_count, succeeded_count, failed_count, usage_json, error, started_at, completed_at
    FROM research_runs ORDER BY started_at DESC LIMIT 10`);
  return Response.json({ data: runs.rows });
}
