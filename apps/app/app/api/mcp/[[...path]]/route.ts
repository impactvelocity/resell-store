import { createMcpHandler, createResellServer, ResellClient, type Account, type ServerKind } from "@repo/mcp";
import { handleApiRequest } from "../../../../lib/server/api";
import { docsUrl, siteUrl } from "../../../../lib/urls";

/*
 * The hosted MCP servers (mcp.resell.store, rewritten here by proxy.ts):
 *
 *   /u/{agent link token}     your shops (D2's private link)
 *   /buy                      shopping, search and look only
 *   /buy/{token}              shopping as you: like, follow, offer, message
 *   /seller, /buyer           the same, with the token in an Authorization header
 *
 * Each request gets a fresh server whose tools call the public API
 * in-process (same router, auth and limits as api.resell.store), using the
 * token from the link. Tools the token isn't allowed to use aren't offered.
 */

export const dynamic = "force-dynamic";

const apiBase = siteUrl("/api/v1");

/** The API, called without leaving the process. */
const inProcessFetch = (input: string, init?: RequestInit) => handleApiRequest(new Request(input, init));

/** Who a token is, for a few seconds, so each MCP request doesn't look it up again. */
const accounts = new Map<string, { account: Account; at: number }>();
const ACCOUNT_TTL = 15_000;

async function accountFor(client: ResellClient, token: string) {
  const hit = accounts.get(token);
  if (hit && Date.now() - hit.at < ACCOUNT_TTL) return hit.account;
  const account = await client.account();
  if (accounts.size > 500) accounts.clear();
  if (account) accounts.set(token, { account, at: Date.now() });
  return account;
}

type Target = { kind: ServerKind; token: string | null };

function target(req: Request): Target | null {
  const parts = new URL(req.url).pathname.replace(/^\/api\/mcp/, "").split("/").filter(Boolean);
  const header = req.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  const [first, second] = parts;
  if (first === "u" && second) return { kind: "seller", token: decodeURIComponent(second) };
  if (first === "seller") return { kind: "seller", token: bearer };
  if (first === "buy" || first === "buyer") return { kind: "buyer", token: second ? decodeURIComponent(second) : bearer };
  return null;
}

/** `agent`: the connecting app's user agent, so the owner's activity log can name it when the app doesn't. */
function clientFor(token: string | null, agent?: string | null) {
  return new ResellClient({
    baseUrl: apiBase,
    token,
    fetch: inProcessFetch,
    userAgent: "resell-mcp-hosted",
    headers: agent ? { "resell-client-agent": agent.slice(0, 200) } : undefined,
  });
}

const handlers = Object.fromEntries(
  (["seller", "buyer"] as const).map((kind) => [
    kind,
    createMcpHandler(
      async ({ requestInfo }) => {
        const t = requestInfo ? target(requestInfo) : null;
        const token = t?.token ?? null;
        const client = clientFor(token, requestInfo?.headers.get("user-agent"));
        const account = token ? await accountFor(client, token) : null;
        return createResellServer(kind, client, { account });
      },
      { onerror: (error) => console.error(`[mcp:${kind}]`, error.message) },
    ),
  ]),
) as Record<ServerKind, ReturnType<typeof createMcpHandler>>;

function problem(status: number, message: string) {
  return Response.json({ error: { type: status === 401 ? "unauthorized" : "not_found", message } }, { status });
}

async function handle(req: Request) {
  const t = target(req);
  if (!t) return problem(404, `This is resell.store's MCP server. See ${docsUrl("/mcp")} for the addresses.`);

  // Someone opened the link in a browser: show them how to use it instead
  if (req.method === "GET" && req.headers.get("accept")?.includes("text/html")) {
    return Response.redirect(docsUrl("/mcp"), 302);
  }

  if (t.kind === "seller" && !t.token) {
    return problem(401, "The shop server needs your private link from resell.store/tools/agent (or a secret key as a Bearer token).");
  }
  if (t.token) {
    try {
      await accountFor(clientFor(t.token), t.token);
    } catch {
      return problem(401, "That link doesn't work any more. Make a new one at resell.store/tools/agent.");
    }
  }
  return handlers[t.kind].fetch(req);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
