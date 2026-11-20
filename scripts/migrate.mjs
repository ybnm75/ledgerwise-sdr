import { createClient } from "@libsql/client";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const databaseUrl = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const database = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined
});

const migrationsDirectory = resolve(process.cwd(), "migrations");
const files = (await readdir(migrationsDirectory))
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();

await database.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
)`);

const appliedResult = await database.execute("SELECT version FROM schema_migrations");
const applied = new Set(appliedResult.rows.map((row) => Number(row.version)));

for (const file of files) {
  const version = Number(file.split("_", 1)[0]);
  if (applied.has(version)) continue;
  const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const now = new Date().toISOString();
  await database.batch([
    ...statements,
    {
      sql: "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
      args: [version, file, now]
    }
  ], "write");
  process.stdout.write(`Applied ${file}\n`);
}

await database.close();
