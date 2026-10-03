import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiKey, apiUsage, db, eq } from "@repo/db";
import { z } from "zod";
import { resetDb } from "../../../test/db";
import { createKey } from "../../../test/factories-api";
import { createUser } from "../../../test/factories";
import { CommerceError } from "../commerce";
import { currentMonth } from "./keys";

/*
 * createRouter with a handful of made-up routes: matching and params, who
 * may call ("public" vs "key", scopes), body and query validation, status
 * codes, the error envelope, CORS and the monthly request limit.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { revalidatePath } = await import("next/cache");
const { createRouter, route } = await import("./router");
const { ApiError, flag, money, page, pagination } = await import("./http");

const seen: { auth: unknown; params: unknown; query: unknown; body: unknown }[] = [];

const handle = createRouter([
  route({
    method: "GET",
    path: "/things",
    group: "Test",
    summary: "List things",
    access: "public",
    query: z.object({ ...pagination, sold: flag().optional() }),
    handler: async ({ auth, query }) => {
      seen.push({ auth, params: {}, query, body: {} });
      return page(["a", "b", "c", "d", "e"], query);
    },
  }),
  route({
    method: "GET",
    path: "/things/:id",
    group: "Test",
    summary: "Get a thing",
    access: "key",
    handler: async ({ params, auth }) => ({ object: "thing", id: params.id, owner: auth!.user.id }),
  }),
  route({
    method: "POST",
    path: "/things/:id/buy",
    group: "Test",
    summary: "Buy a thing",
    access: "key",
    scope: "buying",
    body: z.object({ amount: money(), note: z.string().max(10).optional(), fields: z.record(z.string(), z.string()).optional() }),
    handler: async ({ params, body }) => {
      seen.push({ auth: null, params, query: {}, body });
      return { object: "purchase", id: params.id, ...body };
    },
  }),
  route({
    method: "POST",
    path: "/listings",
    group: "Test",
    summary: "Make one",
    access: "key",
    scope: "listings",
    handler: async () => ({ object: "listing", id: "new" }),
  }),
  route({
    method: "DELETE",
    path: "/things/:id",
    group: "Test",
    summary: "Delete",
    access: "key",
    scope: "listings",
    handler: async () => undefined,
  }),
  route({
    method: "POST",
    path: "/explode/:how",
    group: "Test",
    summary: "Fail on purpose",
    access: "public",
    handler: async ({ params }) => {
      if (params.how === "commerce") throw new CommerceError("That offer has already been answered.");
      if (params.how === "api") throw new ApiError("not_found", "No thing.", "id");
      throw new Error("database exploded with secrets");
    },
  }),
]);

const req = (method: string, path: string, init: { token?: string; body?: string; type?: string; headers?: Record<string, string> } = {}) =>
  new Request(`http://localhost:5689/api/v1${path}`, {
    method,
    body: init.body,
    headers: {
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.type ? { "content-type": init.type } : {}),
      ...init.headers,
    },
  });

async function call(r: Request) {
  const res = await handle(r);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
}

beforeEach(async () => {
  await resetDb();
  seen.length = 0;
  vi.clearAllMocks();
});

describe("matching", () => {
  it("routes /api/v1/... and api.resell.store/v1/..., with or without a trailing slash", async () => {
    expect((await call(req("GET", "/things"))).status).toBe(200);
    expect((await call(req("GET", "/things/"))).status).toBe(200);
    expect((await call(new Request("https://api.resell.store/v1/things"))).status).toBe(200);
  });

  it("decodes path params", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id);
    const res = await call(req("GET", "/things/caf%C3%A9%20one", { token }));
    expect(res.body).toEqual({ object: "thing", id: "café one", owner: maya.id });
  });

  it("answers 400, not a crash, for a path param that isn't valid percent-encoding", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id);
    const res = await call(req("GET", "/things/%E0%A4%A", { token }));
    expect(res.status).toBe(400);
    expect(res.body.error.type).toBe("invalid_request");
  });

  it("answers 404 with the error envelope for an unknown path", async () => {
    const res = await call(req("GET", "/nope"));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { type: "not_found", message: expect.stringContaining("There's no /nope in the API") } });
    expect(res.headers.get("x-request-id")).toMatch(/^req_[0-9a-f]{20}$/);
  });

  it("names the allowed methods when the path exists but the method doesn't", async () => {
    const res = await call(req("PATCH", "/things/1"));
    expect(res.status).toBe(400);
    expect(res.body.error.type).toBe("invalid_request");
    expect(res.body.error.message).toContain("doesn't take PATCH");
    expect(res.headers.get("allow")).toBe("GET, DELETE");
  });

  it("answers CORS preflights", async () => {
    const res = await handle(req("OPTIONS", "/things/1/buy"));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-headers")).toContain("Authorization");
  });

  it("puts CORS headers and JSON content type on normal answers", async () => {
    const res = await handle(req("GET", "/things"));
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});

describe("who may call", () => {
  it("lets anyone call a public route", async () => {
    const res = await call(req("GET", "/things"));
    expect(res.status).toBe(200);
    expect(seen[0]!.auth).toBeNull();
  });

  it("passes the caller along on a public route when a key is sent", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id);
    await call(req("GET", "/things", { token }));
    expect((seen[0]!.auth as { user: { id: string } }).user.id).toBe(maya.id);
  });

  it("refuses a bad key with 401, even on a public route", async () => {
    const res = await call(req("GET", "/things", { token: "rs_live_nottherealthing" }));
    expect(res.status).toBe(401);
    expect(res.body.error.type).toBe("unauthorized");
  });

  it("needs a key for key routes", async () => {
    const res = await call(req("GET", "/things/1"));
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain("Authorization: Bearer");
  });

  it("accepts the key in X-API-Key too", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id);
    const res = await call(req("GET", "/things/1", { headers: { "x-api-key": token } }));
    expect(res.status).toBe(200);
  });

  it("refuses a revoked key", async () => {
    const maya = await createUser();
    const { token, row } = await createKey(maya.id);
    await db.update(apiKey).set({ revokedAt: new Date() }).where(eq(apiKey.id, row.id));
    expect((await call(req("GET", "/things/1", { token }))).status).toBe(401);
  });

  it("answers 403 naming the scope a key is missing", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id, { scopes: ["read"] });
    const res = await call(req("POST", "/things/1/buy", { token, body: '{"amount": 5}', type: "application/json" }));
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ type: "forbidden", message: expect.stringContaining('"buying" permission') });
  });

  it("needs the read scope for a GET on a key route", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id, { scopes: ["buying"] });
    const res = await call(req("GET", "/things/1", { token }));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('"read"');
  });
});

describe("bodies and queries", () => {
  let token: string;
  beforeEach(async () => {
    const maya = await createUser();
    token = (await createKey(maya.id)).token;
  });

  it("validates a JSON body and hands the parsed values to the handler", async () => {
    const res = await call(req("POST", "/things/t1/buy", { token, body: '{"amount": "19.999", "note": "hi"}', type: "application/json" }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ object: "purchase", id: "t1", amount: 20, note: "hi" });
  });

  it("takes curl -d form fields with bracket nesting", async () => {
    const res = await call(
      req("POST", "/things/t1/buy", { token, body: "amount=150&fields[Brand]=Le+Creuset&fields[Size]=5.5%20qt", type: "application/x-www-form-urlencoded" }),
    );
    expect(res.status).toBe(200);
    expect(seen[0]!.body).toEqual({ amount: 150, fields: { Brand: "Le Creuset", Size: "5.5 qt" } });
  });

  it("answers 400 naming the field when the body is wrong", async () => {
    const res = await call(req("POST", "/things/t1/buy", { token, body: '{"amount": "lots"}', type: "application/json" }));
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ type: "invalid_request", message: expect.stringMatching(/^amount: /), param: "amount" });

    const long = await call(req("POST", "/things/t1/buy", { token, body: '{"amount": 1, "note": "far too long a note"}', type: "application/json" }));
    expect(long.body.error.param).toBe("note");
  });

  it("answers 400 for a body that isn't valid JSON", async () => {
    const res = await call(req("POST", "/things/t1/buy", { token, body: "{amount:", type: "application/json" }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("The body isn't valid JSON.");
  });

  it("validates the query string and pages through the results", async () => {
    const first = await call(req("GET", "/things?limit=2"));
    expect(first.body).toEqual({ object: "list", data: ["a", "b"], total: 5, has_more: true });
    const last = await call(req("GET", "/things?limit=2&offset=4&sold=yes"));
    expect(last.body).toEqual({ object: "list", data: ["e"], total: 5, has_more: false });
    expect(seen[1]!.query).toEqual({ limit: 2, offset: 4, sold: true });

    const bad = await call(req("GET", "/things?limit=500"));
    expect(bad.status).toBe(400);
    expect(bad.body.error.param).toBe("limit");
  });
});

describe("status codes and errors", () => {
  it("answers 201 when something is created and 204 when there's nothing to say", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id);
    expect((await call(req("POST", "/listings", { token }))).status).toBe(201);
    const del = await handle(req("DELETE", "/things/1", { token }));
    expect(del.status).toBe(204);
    expect(await del.text()).toBe("");
  });

  it("refreshes the app's pages after a change, never after a read", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id);
    await call(req("GET", "/things/1", { token }));
    expect(revalidatePath).not.toHaveBeenCalled();
    await call(req("POST", "/listings", { token }));
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("turns the shop's own rule errors into 409 conflicts", async () => {
    const res = await call(req("POST", "/explode/commerce"));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { type: "conflict", message: "That offer has already been answered." } });
  });

  it("passes ApiErrors through with their param", async () => {
    const res = await call(req("POST", "/explode/api"));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { type: "not_found", message: "No thing.", param: "id" } });
  });

  it("hides unexpected errors behind a 500 that quotes the request id", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(req("POST", "/explode/boom"));
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.error.type).toBe("server_error");
    expect(res.body.error.message).not.toContain("secrets");
    expect(res.body.error.message).toContain(res.headers.get("x-request-id")!);
  });
});

describe("monthly limit", () => {
  it("counts each keyed request and reports what's left", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id);
    const a = await call(req("GET", "/things/1", { token }));
    expect(a.headers.get("x-ratelimit-limit")).toBe("10000");
    expect(a.headers.get("x-ratelimit-remaining")).toBe("9999");
    const b = await call(req("GET", "/things/1", { token }));
    expect(b.headers.get("x-ratelimit-remaining")).toBe("9998");
  });

  it("doesn't count requests made without a key", async () => {
    const res = await call(req("GET", "/things"));
    expect(res.headers.get("x-ratelimit-limit")).toBeNull();
    expect(await db.select().from(apiUsage)).toEqual([]);
  });

  it("allows the 10,000th request of the month and refuses the next with 429", async () => {
    const maya = await createUser();
    const { token } = await createKey(maya.id);
    await db.insert(apiUsage).values({ userId: maya.id, month: currentMonth(), requests: 9_999 });

    const last = await call(req("GET", "/things/1", { token }));
    expect(last.status).toBe(200);
    expect(last.headers.get("x-ratelimit-remaining")).toBe("0");

    const over = await call(req("GET", "/things/1", { token }));
    expect(over.status).toBe(429);
    expect(over.body.error.type).toBe("rate_limited");
    expect(over.body.error.message).toContain("10,000");
    expect(over.headers.get("x-ratelimit-remaining")).toBe("0");
  });

  it("marks the key as used", async () => {
    const maya = await createUser();
    const { token, row } = await createKey(maya.id);
    await call(req("GET", "/things/1", { token }));
    await vi.waitFor(async () => {
      const [k] = await db.select().from(apiKey).where(eq(apiKey.id, row.id));
      expect(k!.lastUsedAt).not.toBeNull();
    });
  });
});
