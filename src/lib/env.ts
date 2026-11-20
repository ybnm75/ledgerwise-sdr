import { z } from "zod";

const RuntimeEnvironment = z.object({
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().optional(),
  APP_PASSWORD: z.string().min(10),
  AUTH_SECRET: z.string().min(32)
});

export function isHostedProduction() {
  return Boolean(process.env.VERCEL);
}

export function runtimeEnvironment() {
  const hosted = isHostedProduction();
  const values = {
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? (hosted ? "" : "file:local.db"),
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || undefined,
    APP_PASSWORD: process.env.APP_PASSWORD ?? (hosted ? "" : "ledgerwise-demo"),
    AUTH_SECRET: process.env.AUTH_SECRET ?? (hosted ? "" : "local-development-secret-change-me")
  };
  const parsed = RuntimeEnvironment.safeParse(values);
  if (!parsed.success) {
    throw new Error("Required production environment variables are not configured.");
  }
  if (hosted && parsed.data.TURSO_DATABASE_URL.startsWith("file:")) {
    throw new Error("Production must use a durable Turso database.");
  }
  return parsed.data;
}
