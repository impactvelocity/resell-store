import { defineConfig } from "vitest/config";

/* Renders every email template in Node; JSX uses React's automatic runtime. */
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", "out/**", ".react-email/**"],
  },
});
