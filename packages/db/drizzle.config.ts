import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Local dev keeps DATABASE_URL in the app's .env.local
config({ path: "../../apps/app/.env.local" });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
