import { requireApiSession } from "@/lib/auth";
import { ensureDatabase, getDatabase } from "@/lib/db";

export async function GET(request: Request) {
  const auth = requireApiSession(request);
  if (auth.response) return auth.response;
  await ensureDatabase();
  const events = await getDatabase().execute(`SELECT id, entity_type, entity_id, action, payload_json, actor_type, actor_id, created_at
    FROM audit_events ORDER BY created_at DESC LIMIT 100`);
  return Response.json({ data: events.rows });
}
