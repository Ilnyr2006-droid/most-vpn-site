import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __mostPostgresPool: Pool | undefined;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPostgresPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  if (!globalThis.__mostPostgresPool) {
    const max = Number(process.env.PGPOOL_MAX ?? "5");
    globalThis.__mostPostgresPool = new Pool({
      connectionString,
      max: Number.isFinite(max) && max > 0 ? Math.min(max, 20) : 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return globalThis.__mostPostgresPool;
}
