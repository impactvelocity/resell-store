import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ApiScope } from "@repo/db";
import { ApiError, queryObject, readBody, toApiError, type Auth } from "./http";
import { runAfterResponse } from "../later";
import { countRequest, MONTHLY_LIMIT, touchKey, verifyToken } from "./keys";
import { noteClient, recordActivity } from "./log";

/*
 * The /v1 router. Every route is one `route()` definition: method, path, who
 * may call it, its schemas, an example and the handler. The same definitions
 * drive the docs site and /v1/openapi.json, so they can't drift apart.
 */

export type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * "public": anyone; a key, if sent, is checked and passed along (for "liked").
 * "key": needs a valid key with `scope` (GETs default to "read").
 */
export type Access = "public" | "key";

type AnyObject = z.ZodType<Record<string, unknown>, unknown>;

export type Example = {
  /** Request body (JSON) or query string for the docs and curl sample. */
  body?: Record<string, unknown>;
  query?: string;
  /** Path with the params filled in, when it reads better than :id. */
  path?: string;
  response: unknown;
};

export type RouteDef<Q extends AnyObject = AnyObject, B extends AnyObject = AnyObject> = {
  method: Method;
  /** "/listings/:id/publish" (under /v1). */
  path: string;
  /** Docs grouping: one reference page per group. */
  group: string;
  summary: string;
  description?: string;
  access: Access;
  scope?: ApiScope;
  query?: Q;
  body?: B;
  example?: Example;
  /** Accepts multipart/form-data (photo uploads). */
  multipart?: boolean;
  handler: (ctx: {
    req: Request;
    auth: Auth | null;
    params: Record<string, string>;
    query: z.output<Q>;
    body: z.output<B>;
    form: FormData | null;
  }) => Promise<unknown>;
};

/** Identity function that keeps the schema types for the handler. */
export function route<Q extends AnyObject = AnyObject, B extends AnyObject = AnyObject>(def: RouteDef<Q, B>) {
  return def as unknown as RouteDef;
}

type Compiled = RouteDef & { pattern: RegExp; keys: string[] };

function compile(def: RouteDef): Compiled {
  const keys: string[] = [];
  const source = def.path
    .split("/")
    .map((part) => {
      if (part.startsWith(":")) {
        keys.push(part.slice(1));
        return "([^/]+)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { ...def, pattern: new RegExp(`^${source}/?$`), keys };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, data: unknown, headers: Record<string, string> = {}) {
  return new Response(status === 204 ? null : JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS, ...headers },
  });
}

function errorResponse(error: ApiError, headers: Record<string, string> = {}) {
  return json(
    error.status,
    { error: { type: error.type, message: error.message, ...(error.param ? { param: error.param } : {}) } },
    headers,
  );
}

function bearer(req: Request) {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return req.headers.get("x-api-key")?.trim() || null;
}

/** Strips everything up to and including /v1, so /api/v1/x and api.resell.store/v1/x both route. */
function routePath(url: URL) {
  const i = url.pathname.indexOf("/v1/");
  if (i >= 0) return url.pathname.slice(i + 3);
  return url.pathname.endsWith("/v1") ? "/" : url.pathname;
}

export function createRouter(defs: RouteDef[]) {
  const routes = defs.map(compile);

  return async function handle(req: Request): Promise<Response> {
    const requestId = `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const base = { "x-request-id": requestId };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, ...base } });

    const url = new URL(req.url);
    const path = routePath(url);
    const matches = routes
      .map((r) => ({ r, m: r.pattern.exec(path) }))
      .filter((x): x is { r: Compiled; m: RegExpExecArray } => x.m !== null);
    if (matches.length === 0)
      return errorResponse(new ApiError("not_found", `There's no ${path} in the API. See https://docs.resell.store/api.`), base);
    const match = matches.find((x) => x.r.method === req.method);
    if (!match) {
      return errorResponse(
        new ApiError("invalid_request", `${path} doesn't take ${req.method}. Try ${[...new Set(matches.map((x) => x.r.method))].join(" or ")}.`),
        { ...base, allow: matches.map((x) => x.r.method).join(", ") },
      );
    }
    const { r, m } = match;
    let headers: Record<string, string> = base;
    let params: Record<string, string> = {};
    let auth: Auth | null = null;
    let body: unknown = {};
    try {
      // Inside the try: a bad escape like %E0%A4%A makes decodeURIComponent throw
      try {
        params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1]!)]));
      } catch {
        throw new ApiError("invalid_request", "Part of that path isn't valid URL encoding.");
      }
      // Who's calling
      const token = bearer(req);
      if (token) {
        const found = await verifyToken(token);
        if (!found) throw new ApiError("unauthorized", "That key isn't valid. It may have been replaced; make a new one at resell.store/tools/api.");
        auth = found;
      }
      if (r.access === "key") {
        if (!auth)
          throw new ApiError("unauthorized", "This needs your secret key: send it as `Authorization: Bearer rs_live_…`.");
        const scope = r.scope ?? (r.method === "GET" ? "read" : undefined);
        if (scope && !auth.key.scopes.includes(scope))
          throw new ApiError("forbidden", `This key isn't allowed to do that (it needs the "${scope}" permission). Change what it may do at resell.store/tools/agent.`);
      }
      if (auth) {
        const used = await countRequest(auth.user.id);
        headers = {
          ...headers,
          "x-ratelimit-limit": String(MONTHLY_LIMIT),
          "x-ratelimit-remaining": String(Math.max(0, MONTHLY_LIMIT - used)),
        };
        if (used > MONTHLY_LIMIT)
          throw new ApiError("rate_limited", `That's the ${MONTHLY_LIMIT.toLocaleString("en-US")} requests for this month. It starts over on the 1st.`);
        void touchKey(auth.key.id).catch(() => {});
        const who = auth;
        runAfterResponse(() => noteClient(who, req.headers));
      }

      const { body: rawBody, form } = await readBody(req);
      const query = r.query ? r.query.parse(queryObject(url)) : {};
      body = r.body ? r.body.parse(rawBody) : {};
      const out = await r.handler({ req, auth, params, query, body: body as Record<string, unknown>, form });
      if (auth) {
        const done = { auth, headers: req.headers, route: r, params, body, out, ok: true };
        runAfterResponse(() => recordActivity(done));
      }
      // A change through the API shows in the app straight away, like a change made there
      if (r.method !== "GET") {
        try {
          revalidatePath("/", "layout");
        } catch {}
      }
      if (out === undefined) return json(204, null, headers);
      return json(r.method === "POST" && /\/(shops|listings|offers|threads|research|subscriptions)$/.test(r.path) ? 201 : 200, out, headers);
    } catch (error) {
      const known = toApiError(error);
      // The owner should see what it tried and wasn't allowed to do
      if (known?.type === "forbidden" && auth) {
        const tried = { auth, headers: req.headers, route: r, params, body, out: null, ok: false };
        runAfterResponse(() => recordActivity(tried));
      }
      if (known) return errorResponse(known, headers);
      console.error("API request failed", requestId, req.method, path, error);
      return errorResponse(new ApiError("server_error", `Something went wrong on our side. If it keeps happening, quote ${requestId}.`), headers);
    }
  };
}
