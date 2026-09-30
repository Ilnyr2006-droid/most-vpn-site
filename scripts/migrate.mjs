import { readFile, readdir } from "fs/promises";
import path from "path";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_MIGRATOR_URL?.trim();

if (!connectionString) {
  throw new Error("DATABASE_MIGRATOR_URL is required to run migrations");
}

const client = new Client({ connectionString });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = path.join(process.cwd(), "migrations");
  const files = (await readdir(dir))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();

  for (const name of files) {
    const already = await client.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [name]
    );

    if (already.rowCount) {
      process.stdout.write(`skip ${name}\n`);
      continue;
    }

    const sql = await readFile(path.join(dir, name), "utf8");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [name]
      );
      await client.query("COMMIT");
      process.stdout.write(`applied ${name}\n`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
