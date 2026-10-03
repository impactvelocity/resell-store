import { McpServer } from "@modelcontextprotocol/server";
import { buyerInstructions, buyerTools } from "./buyer";
import { ResellClient, type Account, type ClientOptions } from "./client";
import { sellerInstructions, sellerTools } from "./seller";
import { allowedTools, registerTools, type ToolDef } from "./tools";

export { ResellApiError, ResellClient, type Account, type ClientOptions, type FetchLike } from "./client";
export { buyerTools, sellerTools, type ToolDef };
export { allowedTools };

/** For hosting over HTTP: one handler, a fresh server per request (see apps/app/app/api/mcp). */
export { createMcpHandler } from "@modelcontextprotocol/server";

export type ServerKind = "seller" | "buyer";

export const VERSION = "0.1.0";

export const serverInfo: Record<ServerKind, { name: string; title: string; instructions: string; tools: ToolDef[] }> = {
  seller: {
    name: "resell-store-seller",
    title: "resell.store: your shops",
    instructions: sellerInstructions,
    tools: sellerTools,
  },
  buyer: {
    name: "resell-store-buyer",
    title: "resell.store: shopping",
    instructions: buyerInstructions,
    tools: buyerTools,
  },
};

/**
 * One MCP server instance for one connection. Looks up what the key may do
 * (GET /v1/me) and offers only those tools. Pass `account` if you already
 * have it, to skip that call.
 */
export async function createResellServer(kind: ServerKind, client: ResellClient, opts: { account?: Account | null } = {}) {
  const info = serverInfo[kind];
  const account = opts.account !== undefined ? opts.account : await client.account();
  const max = account?.key.max_offer;
  const instructions =
    kind === "buyer" && typeof max === "number"
      ? `${info.instructions}\nThe person set a ceiling of $${max} for any one thing: don't offer or agree to more than that; ask them instead.`
      : info.instructions;
  const server = new McpServer(
    { name: info.name, title: info.title, version: VERSION },
    { instructions, capabilities: { tools: {} } },
  );
  registerTools(server, client, info.tools, { account });
  return server;
}

export function createClient(opts: ClientOptions) {
  return new ResellClient(opts);
}
