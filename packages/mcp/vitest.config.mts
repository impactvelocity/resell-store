import { defineConfig } from "vitest/config";

/* The MCP servers' client and tools, with fetch always mocked. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
