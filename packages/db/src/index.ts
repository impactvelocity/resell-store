import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export * from "./schema";
export { schema };

const globalForDb = globalThis as unknown as { pool?: Pool };

// One pool per process; dev hot reloads would otherwise open a new one each time
const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type Db = typeof db;

// Query helpers from the same drizzle-orm instance as the schema. Import these from
// @repo/db, not drizzle-orm, or pnpm can hand the app a second copy with clashing types.
export {
  and, asc, count, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, lt, lte, ne, not, notInArray, or, sql,
} from "drizzle-orm";
export type { SQL } from "drizzle-orm";
