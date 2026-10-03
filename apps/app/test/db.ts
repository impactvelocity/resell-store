import { db, sql } from "@repo/db";

/**
 * Empties every app table (Better Auth's too) so each test starts clean.
 * Keeps the schema and the migrations journal.
 */
export async function resetDb() {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
  if (tables) await db.execute(sql.raw(`truncate table ${tables} restart identity cascade`));
}
