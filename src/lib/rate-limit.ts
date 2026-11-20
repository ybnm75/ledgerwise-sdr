import { getDatabase, ensureDatabase } from "@/lib/db";

export async function consumeQuota(input: {
  scope: string;
  subjectKey: string;
  limit: number;
  windowSeconds: number;
  now?: Date;
}) {
  await ensureDatabase();
  const now = input.now ?? new Date();
  const windowMs = input.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
  const database = getDatabase();
  await database.execute({
    sql: `INSERT INTO quota_usage (scope, subject_key, window_start, used, updated_at)
          VALUES (?, ?, ?, 1, ?)
          ON CONFLICT(scope, subject_key, window_start)
          DO UPDATE SET used = used + 1, updated_at = excluded.updated_at`,
    args: [input.scope, input.subjectKey, windowStart, now.toISOString()]
  });
  const result = await database.execute({
    sql: `SELECT used FROM quota_usage WHERE scope = ? AND subject_key = ? AND window_start = ?`,
    args: [input.scope, input.subjectKey, windowStart]
  });
  const used = Number(result.rows[0]?.used ?? input.limit + 1);
  return { allowed: used <= input.limit, used, remaining: Math.max(0, input.limit - used), windowStart };
}
