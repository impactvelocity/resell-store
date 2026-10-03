import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CommerceError } from "../commerce";
import { MessageError } from "../messages";
import { ApiError, flag, hasScope, int, money, notFound, page, pagination, queryObject, readBody, stringList, toApiError } from "./http";

/*
 * The /v1 plumbing that doesn't need a database: error types and statuses,
 * reading JSON and `curl -d` bodies (with bracket nesting), query strings,
 * the string-friendly schema helpers and Stripe-style pages.
 */

const post = (body: string, type?: string) =>
  new Request("http://x.test/api/v1/thing", { method: "POST", body, headers: type ? { "content-type": type } : {} });

describe("ApiError", () => {
  it("maps each error type to its HTTP status", () => {
    const statuses = {
      invalid_request: 400,
      unauthorized: 401,
      forbidden: 403,
      not_found: 404,
      conflict: 409,
      rate_limited: 429,
      unavailable: 503,
      server_error: 500,
    } as const;
    for (const [type, status] of Object.entries(statuses)) {
      expect(new ApiError(type as keyof typeof statuses, "x").status).toBe(status);
    }
  });

  it("keeps the param it's about", () => {
    const e = new ApiError("invalid_request", "Pick another.", "slug");
    expect(e).toMatchObject({ type: "invalid_request", message: "Pick another.", param: "slug" });
  });

  it("words not-found the same way everywhere", () => {
    const e = notFound("listing");
    expect(e.status).toBe(404);
    expect(e.message).toBe("No listing with that id, or it isn't yours.");
  });
});

describe("toApiError", () => {
  it("passes an ApiError through", () => {
    const e = new ApiError("conflict", "Nope.");
    expect(toApiError(e)).toBe(e);
  });

  it("turns a zod error into a 400 naming the field", () => {
    const result = z.object({ shop: z.object({ name: z.string() }) }).safeParse({ shop: { name: 3 } });
    const e = toApiError(result.error)!;
    expect(e.status).toBe(400);
    expect(e.param).toBe("shop.name");
    expect(e.message).toMatch(/^shop\.name: /);
  });

  it("turns the shop's own rule errors into 409s and message problems into 400s", () => {
    expect(toApiError(new CommerceError("That's your own listing."))).toMatchObject({ status: 409, type: "conflict", message: "That's your own listing." });
    expect(toApiError(new MessageError("Say something first."))).toMatchObject({ status: 400, type: "invalid_request" });
  });

  it("leaves anything else alone so it becomes a 500", () => {
    expect(toApiError(new Error("boom"))).toBeNull();
    expect(toApiError("boom")).toBeNull();
  });
});

describe("hasScope", () => {
  it("checks the key's scopes and is false without a key", () => {
    const auth = { key: { scopes: ["read", "offers"] }, user: { id: "u", name: "", email: "" } } as never;
    expect(hasScope(auth, "offers")).toBe(true);
    expect(hasScope(auth, "buying")).toBe(false);
    expect(hasScope(null, "read")).toBe(false);
  });
});

describe("readBody", () => {
  it("reads a JSON object", async () => {
    expect(await readBody(post('{"amount": 150, "note": "hi"}', "application/json"))).toEqual({
      body: { amount: 150, note: "hi" },
      form: null,
    });
  });

  it("reads JSON even without a content type", async () => {
    expect((await readBody(post('{"a":1}'))).body).toEqual({ a: 1 });
  });

  it("refuses broken JSON and JSON that isn't an object", async () => {
    await expect(readBody(post("{nope", "application/json"))).rejects.toMatchObject({ status: 400, message: "The body isn't valid JSON." });
    await expect(readBody(post("[1,2]", "application/json"))).rejects.toMatchObject({ status: 400, message: "The body should be a JSON object." });
    await expect(readBody(post("null", "application/json"))).rejects.toMatchObject({ status: 400 });
  });

  it("reads curl -d form fields, nesting one level with brackets", async () => {
    const { body } = await readBody(
      post(
        "title=Dutch+oven&price=185&fields[Brand]=Le%20Creuset&fields[Size]=5.5+qt&tags[]=kitchen&tags[]=cast+iron&color=yellow&color=orange",
        "application/x-www-form-urlencoded",
      ),
    );
    expect(body).toEqual({
      title: "Dutch oven",
      price: "185",
      fields: { Brand: "Le Creuset", Size: "5.5 qt" },
      tags: ["kitchen", "cast iron"],
      color: ["yellow", "orange"],
    });
  });

  it("doesn't crash when a field is sent both plain and with brackets", async () => {
    const { body } = await readBody(post("tags=a&tags[]=b&fields=x&fields[Brand]=Le+Creuset", "application/x-www-form-urlencoded"));
    expect(body).toEqual({ tags: ["a", "b"], fields: { Brand: "Le Creuset" } });
  });

  it("treats a body that isn't JSON-shaped as form fields even without a content type", async () => {
    expect((await readBody(post("amount=20&listing=abc"))).body).toEqual({ amount: "20", listing: "abc" });
  });

  it("reads multipart forms and hands the form along for uploads", async () => {
    const form = new FormData();
    form.set("alt", "Front");
    form.append("file", new Blob(["fake"], { type: "image/png" }), "a.png");
    const req = new Request("http://x.test/api/v1/listings/1/photos", { method: "POST", body: form });
    const { body, form: got } = await readBody(req);
    expect(body.alt).toBe("Front");
    expect(got?.get("file")).toBeInstanceOf(Blob);
  });

  it("ignores bodies on GET and DELETE, and empty bodies", async () => {
    expect(await readBody(new Request("http://x.test/", { method: "GET" }))).toEqual({ body: {}, form: null });
    expect(await readBody(new Request("http://x.test/", { method: "DELETE", body: '{"a":1}' }))).toEqual({ body: {}, form: null });
    expect(await readBody(post("   ", "application/json"))).toEqual({ body: {}, form: null });
  });
});

describe("queryObject", () => {
  it("can't be used to pollute Object.prototype", () => {
    const out = queryObject(new URL("http://x.test/?__proto__[polluted]=yes&constructor[prototype]=1&prototype=2&q=ok"));
    try {
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(out).toEqual({ q: "ok" });
    } finally {
      delete (Object.prototype as Record<string, unknown>).polluted;
    }
  });

  it("treats keys like toString and constructor as ordinary missing keys", () => {
    expect(queryObject(new URL("http://x.test/?toString=a&hasOwnProperty[x]=b"))).toEqual({ toString: "a", hasOwnProperty: { x: "b" } });
  });

  it("reads the query string with the same bracket rules", () => {
    expect(queryObject(new URL("http://x.test/?q=dutch+oven&limit=10&status[]=open&status[]=countered"))).toEqual({
      q: "dutch oven",
      limit: "10",
      status: ["open", "countered"],
    });
  });
});

describe("schema helpers", () => {
  it("money takes numbers or strings of dollars and rounds to the cent", () => {
    expect(money().parse("185.50")).toBe(185.5);
    expect(money().parse(19.999)).toBe(20);
    expect(money().safeParse("abc").success).toBe(false);
    expect(money().safeParse(-1).success).toBe(false);
    expect(money().safeParse(100_001).success).toBe(false);
  });

  it("flag reads true/false words from forms", () => {
    for (const yes of [true, "true", "1", "yes", "on"]) expect(flag().parse(yes)).toBe(true);
    for (const no of [false, "false", "0", "no", "off"]) expect(flag().parse(no)).toBe(false);
    expect(flag().safeParse("maybe").success).toBe(false);
  });

  it("int coerces and keeps to its range", () => {
    expect(int(1, 5).parse("3")).toBe(3);
    expect(int(1, 5).safeParse("6").success).toBe(false);
    expect(int(1, 5).safeParse("2.5").success).toBe(false);
  });

  it("stringList takes an array, a[] fields or a comma list", () => {
    expect(stringList().parse(["a", " b "])).toEqual(["a", "b"]);
    expect(stringList().parse("a, b,,c")).toEqual(["a", "b", "c"]);
    expect(stringList(2).safeParse("a,b,c").success).toBe(false);
  });

  it("pagination defaults to 25 from the start and caps at 100", () => {
    const q = z.object(pagination);
    expect(q.parse({})).toEqual({ limit: 25, offset: 0 });
    expect(q.parse({ limit: "10", offset: "20" })).toEqual({ limit: 10, offset: 20 });
    expect(q.safeParse({ limit: "101" }).success).toBe(false);
    expect(q.safeParse({ limit: "0" }).success).toBe(false);
    expect(q.safeParse({ offset: "-1" }).success).toBe(false);
  });
});

describe("page", () => {
  const all = Array.from({ length: 7 }, (_, i) => i + 1);

  it("returns a Stripe-style list with the total and whether there's more", () => {
    expect(page(all, { limit: 3, offset: 0 })).toEqual({ object: "list", data: [1, 2, 3], total: 7, has_more: true });
    expect(page(all, { limit: 3, offset: 3 })).toEqual({ object: "list", data: [4, 5, 6], total: 7, has_more: true });
    expect(page(all, { limit: 3, offset: 6 })).toEqual({ object: "list", data: [7], total: 7, has_more: false });
  });

  it("is empty past the end", () => {
    expect(page(all, { limit: 3, offset: 50 })).toEqual({ object: "list", data: [], total: 7, has_more: false });
    expect(page([], { limit: 25, offset: 0 })).toEqual({ object: "list", data: [], total: 0, has_more: false });
  });
});
