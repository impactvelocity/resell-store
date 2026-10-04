import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/*
 * Code tests (no browser). Pure functions run as they are; anything that
 * touches Postgres uses its own database, resell_test on the local Docker
 * server (`pnpm db:up`), created and migrated by test/global-setup.ts and
 * emptied before each test with resetDb(). Files run one at a time because
 * they share that database. PayPal, email and Render are always mocked.
 */

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://resell:resell@localhost:5433/resell_test";

export default defineConfig({
  resolve: {
    // Next.js makes this a no-op on the server; outside Next it throws
    alias: { "server-only": here("./test/empty.ts") },
  },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**"],
    globalSetup: [here("./test/global-setup.ts")],
    setupFiles: [here("./test/setup.ts")],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: "test",
      NEXT_PUBLIC_ROOT_DOMAIN: "localhost:5689",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
      BETTER_AUTH_URL: "http://localhost:5689",
      // Never reach real services from a test
      RESEND_API_KEY: "",
      PAYPAL_CLIENT_ID: "",
      PAYPAL_CLIENT_SECRET: "",
      PAYPAL_PARTNER_MERCHANT_ID: "",
      PAYPAL_WEBHOOK_ID: "",
      PAYOUT_DEMO_MINUTES_PER_DAY: "",
      PLATFORM_FEE_BPS: "",
      ANTHROPIC_API_KEY: "",
      CHANNEL3_API_KEY: "",
      JINA_EMBEDDING_MODEL_KEY: "",
      R2_URL: "",
      SUPPORT_EMAIL: "",
      CRON_SECRET: "test-cron-secret",
    },
  },
});
