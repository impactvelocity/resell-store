import { ensureDatabase, migrateDatabase } from "@repo/db/migrate";

/*
 * Once per run: make sure the test database exists and is on the latest
 * migration. Points at resell_test on the dev Postgres unless
 * TEST_DATABASE_URL says otherwise. Refuses anything not named *_test, so a
 * typo can't wipe real data.
 */

const url = process.env.TEST_DATABASE_URL ?? "postgres://resell:resell@localhost:5433/resell_test";

export default async function setup() {
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) throw new Error(`Tests only run against a *_test database, not "${name}".`);
  try {
    await ensureDatabase(url);
  } catch (error) {
    throw new Error(`Can't reach Postgres for tests at ${new URL(url).host}. Start it with \`pnpm db:up\`.\n${error}`);
  }
  await migrateDatabase(url);
}
