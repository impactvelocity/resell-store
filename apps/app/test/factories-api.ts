import type { ApiKeyKind, ApiScope } from "@repo/db";

/*
 * Helpers for the public API tests: a key for a person, and a way to call
 * /v1 through the real route handler (app/api/v1/[[...path]]/route.ts) the
 * way curl or the MCP client would.
 */

export const API_BASE = "http://localhost:5689/api/v1";

/** Issues a key (via keys.ts, so it's hashed like a real one) and returns the token. */
export async function createKey(
  userId: string,
  opts: { kind?: ApiKeyKind; scopes?: ApiScope[]; askFirst?: ApiScope[]; handle?: string } = {},
) {
  const { issueKey } = await import("../lib/server/api/keys");
  const { row, token } = await issueKey({
    userId,
    kind: opts.kind ?? "api",
    handle: opts.handle ?? "tester",
    scopes: opts.scopes,
    askFirst: opts.askFirst,
  });
  return { row, token };
}

type CallOpts = {
  token?: string | null;
  /** Sent as JSON. */
  json?: unknown;
  /** Sent as application/x-www-form-urlencoded, like `curl -d`. */
  form?: string;
  /** A raw body with whatever content-type is in `headers`. */
  raw?: string;
  headers?: Record<string, string>;
};

export type ApiResult<T = Record<string, unknown>> = { status: number; body: T; headers: Headers };

/** Calls the API through the exported route handler and parses the JSON answer. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(method: string, path: string, opts: CallOpts = {}): Promise<ApiResult<T>> {
  const route = await import("../app/api/v1/[[...path]]/route");
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers["content-type"] ??= "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form !== undefined) {
    headers["content-type"] ??= "application/x-www-form-urlencoded";
    body = opts.form;
  } else if (opts.raw !== undefined) {
    body = opts.raw;
  }
  const req = new Request(`${API_BASE}${path}`, { method, headers, body });
  const handler = route[method as "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS"];
  const res = await handler(req);
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T, headers: res.headers };
}
