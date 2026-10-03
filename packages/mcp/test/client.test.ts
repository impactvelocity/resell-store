import { describe, expect, it, vi } from "vitest";
import { ResellApiError, ResellClient, seg, type FetchLike } from "../src/client";

/*
 * ResellClient against a fake fetch: where requests go, which headers they
 * carry, and how the API's error envelope turns into ResellApiError.
 */

function fakeFetch(status = 200, body: unknown = { ok: true }) {
  const text = typeof body === "string" ? body : body === null ? "" : JSON.stringify(body);
  return vi.fn<FetchLike>(async () => new Response(status === 204 ? null : text, { status }));
}

function call(f: ReturnType<typeof fakeFetch>, i = 0) {
  const [url, init] = f.mock.calls[i]!;
  return { url: new URL(url), init: init!, headers: init!.headers as Record<string, string> };
}

describe("ResellClient requests", () => {
  it("joins the base URL and path, dropping trailing slashes", async () => {
    const f = fakeFetch();
    const c = new ResellClient({ baseUrl: "https://api.example.test/v1///", fetch: f });
    expect(c.baseUrl).toBe("https://api.example.test/v1");
    await c.get("/shops");
    expect(call(f).url.toString()).toBe("https://api.example.test/v1/shops");
    expect(call(f).init.method).toBe("GET");
  });

  it("puts query values in the URL and skips empty ones", async () => {
    const f = fakeFetch();
    const c = new ResellClient({ baseUrl: "https://api.example.test/v1", fetch: f });
    await c.get("/offers", { role: "buyer", limit: 5, offers: true, status: undefined, listing: null, q: "" });
    const { url } = call(f);
    expect(Object.fromEntries(url.searchParams)).toEqual({ role: "buyer", limit: "5", offers: "true" });
  });

  it("sends the token as a bearer header, trimmed", async () => {
    const f = fakeFetch();
    const c = new ResellClient({ baseUrl: "https://api.example.test/v1", token: "  rs_live_abc  ", fetch: f });
    expect(c.hasToken).toBe(true);
    await c.get("/me");
    expect(call(f).headers.authorization).toBe("Bearer rs_live_abc");
    expect(call(f).headers.accept).toBe("application/json");
    expect(call(f).headers["user-agent"]).toBe("resell-mcp/0.1");
  });

  it("sends no authorization header without a token (or with a blank one)", async () => {
    const f = fakeFetch();
    const c = new ResellClient({ baseUrl: "https://api.example.test/v1", token: "   ", fetch: f, userAgent: "tests/1" });
    expect(c.hasToken).toBe(false);
    await c.get("/market/search");
    expect(call(f).headers.authorization).toBeUndefined();
    expect(call(f).headers["user-agent"]).toBe("tests/1");
  });

  it("sends JSON bodies with a content type, and an empty object for a bare POST or PUT", async () => {
    const f = fakeFetch();
    const c = new ResellClient({ baseUrl: "https://api.example.test/v1", fetch: f });
    await c.post("/offers", { listing: "l1", amount: 20 });
    expect(call(f, 0).init.method).toBe("POST");
    expect(call(f, 0).headers["content-type"]).toBe("application/json");
    expect(JSON.parse(call(f, 0).init.body as string)).toEqual({ listing: "l1", amount: 20 });

    await c.post("/offers/o1/accept");
    expect(call(f, 1).init.body).toBe("{}");
    await c.put("/market/listings/l1/like");
    expect(call(f, 2).init.method).toBe("PUT");
    expect(call(f, 2).init.body).toBe("{}");
    await c.patch("/shops/maya", { about: "hi" });
    expect(call(f, 3).init.method).toBe("PATCH");
  });

  it("sends DELETE and GET without a body", async () => {
    const f = fakeFetch();
    const c = new ResellClient({ baseUrl: "https://api.example.test/v1", fetch: f });
    await c.delete("/listings/l1");
    expect(call(f).init.method).toBe("DELETE");
    expect(call(f).init.body).toBeUndefined();
    expect(call(f).headers["content-type"]).toBeUndefined();
  });

  it("returns the parsed JSON, or null for an empty answer", async () => {
    const c1 = new ResellClient({ baseUrl: "https://x.test/v1", fetch: fakeFetch(200, { object: "shop", slug: "maya" }) });
    expect(await c1.get("/shops/maya")).toEqual({ object: "shop", slug: "maya" });
    const c2 = new ResellClient({ baseUrl: "https://x.test/v1", fetch: fakeFetch(204, null) });
    expect(await c2.delete("/webhooks")).toBeNull();
  });
});

describe("withHeaders", () => {
  it("sends extra headers on every request without changing the original client", async () => {
    const seen: Record<string, string>[] = [];
    const base = new ResellClient({
      baseUrl: "https://api.example.test/v1",
      token: "t",
      fetch: async (_input, init) => {
        seen.push(init?.headers as Record<string, string>);
        return new Response("{}");
      },
    });
    await base.withHeaders({ "resell-tool": "search" }).get("/me");
    await base.get("/me");
    expect(seen[0]).toMatchObject({ "resell-tool": "search", authorization: "Bearer t" });
    expect(seen[1]).not.toHaveProperty("resell-tool");
  });
});

describe("ResellClient errors", () => {
  it("turns the API's error envelope into a ResellApiError", async () => {
    const f = fakeFetch(400, { error: { type: "invalid_request", message: "amount: Too small.", param: "amount" } });
    const c = new ResellClient({ baseUrl: "https://x.test/v1", fetch: f });
    const error = await c.post("/offers", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ResellApiError);
    expect(error).toMatchObject({ status: 400, type: "invalid_request", message: "amount: Too small.", param: "amount" });
  });

  it("keeps the status for 401, 403, 404 and 409", async () => {
    for (const [status, type] of [
      [401, "unauthorized"],
      [403, "forbidden"],
      [404, "not_found"],
      [409, "conflict"],
    ] as const) {
      const c = new ResellClient({ baseUrl: "https://x.test/v1", fetch: fakeFetch(status, { error: { type, message: "No." } }) });
      await expect(c.get("/x")).rejects.toMatchObject({ status, type, message: "No." });
    }
  });

  it("falls back to server_error with the status when there's no envelope", async () => {
    const c = new ResellClient({ baseUrl: "https://x.test/v1", fetch: fakeFetch(502, { nope: true }) });
    await expect(c.get("/x")).rejects.toMatchObject({ status: 502, type: "server_error", message: "The API answered 502." });
  });

  it("says so when the answer isn't JSON", async () => {
    const c = new ResellClient({ baseUrl: "https://x.test/v1", fetch: fakeFetch(500, "<html>oops</html>") });
    const error = await c.get("/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ResellApiError);
    expect(error).toMatchObject({ status: 500, type: "server_error" });
    expect((error as Error).message).toContain("isn't JSON (500)");
  });
});

describe("account", () => {
  it("is null without a token and never calls the API", async () => {
    const f = fakeFetch();
    const c = new ResellClient({ baseUrl: "https://x.test/v1", fetch: f });
    expect(await c.account()).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("reads /me with a token", async () => {
    const me = { id: "u1", name: "Maya", email: "m@x.test", key: { kind: "agent", scopes: ["read"], ask_first: [] }, shops: [] };
    const f = fakeFetch(200, me);
    const c = new ResellClient({ baseUrl: "https://x.test/v1", token: "maya-abc", fetch: f });
    expect(await c.account()).toEqual(me);
    expect(call(f).url.pathname).toBe("/v1/me");
  });
});

describe("seg", () => {
  it("keeps an id or slug to one path segment", () => {
    expect(seg(" maya ")).toBe("maya");
    expect(seg("a/b")).toBe("a%2Fb");
    expect(seg("../me")).toBe("..%2Fme");
    expect(seg("x?y=1#z")).toBe("x%3Fy%3D1%23z");
  });

  it("refuses empty, '.' and '..' segments, which a URL would drop or climb out of", () => {
    for (const bad of ["", "  ", ".", "..", " .. "]) {
      expect(() => seg(bad)).toThrow(ResellApiError);
    }
    expect(seg("...")).toBe("...");
    expect(seg(".hidden")).toBe(".hidden");
  });
});
