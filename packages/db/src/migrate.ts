import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/*
 * Creating and migrating a database from code, for the app's tests
 * (apps/app/test/global-setup.ts). `pnpm db:migrate` is still how real
 * databases are migrated.
 */

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

/** Creates the database in `url` if it doesn't exist yet. */
export async function ensureDatabase(url: string) {
  const name = new URL(url).pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [name]);
    if (!rowCount) await client.query(`create database "${name.replace(/"/g, "")}"`);
  } finally {
    await client.end();
  }
}

/** Brings the database in `url` up to the latest migration. */
export async function migrateDatabase(url: string) {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}
