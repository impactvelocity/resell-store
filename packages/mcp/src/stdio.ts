import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createResellServer, ResellClient, type ServerKind } from "./index";

/*
 * Run a resell.store MCP server locally over stdio:
 *
 *   RESELL_API_KEY=rs_live_… resell-mcp            # your shops
 *   RESELL_API_KEY=rs_live_… resell-mcp buyer      # shopping (key optional)
 *
 * RESELL_API_URL points it at another API (default https://api.resell.store/v1).
 */

const kind = (process.argv[2] ?? "seller") as ServerKind;
if (kind !== "seller" && kind !== "buyer") {
  console.error('Usage: resell-mcp [seller|buyer]  (set RESELL_API_KEY)');
  process.exit(2);
}

const token = process.env.RESELL_API_KEY ?? null;
if (kind === "seller" && !token) {
  console.error("Set RESELL_API_KEY to your secret key or agent link token from resell.store/tools/api.");
  process.exit(2);
}

const client = new ResellClient({
  baseUrl: process.env.RESELL_API_URL ?? "https://api.resell.store/v1",
  token,
  userAgent: `resell-mcp-stdio/${kind}`,
});

// Fail early (and readably) on a bad key, rather than on the first tool call
const account = token
  ? await client.account().catch((error: Error) => {
      console.error(`resell.store didn't accept that key: ${error.message}`);
      process.exit(1);
    })
  : null;

serveStdio(() => createResellServer(kind, client, { account }));
