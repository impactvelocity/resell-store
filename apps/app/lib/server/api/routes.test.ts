import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, listing, offer, orders } from "@repo/db";
import { resetDb } from "../../../test/db";
import { api, createKey } from "../../../test/factories-api";
import { createListing, createOffer, createOrder, createSale, createShop, createUser } from "../../../test/factories";
import { clearEmails, emailsTo } from "../../../test/mail";

/*
 * End to end through the real /v1 route handler (app/api/v1/[[...path]]),
 * with real keys and Postgres: shops and listings, the marketplace, a buyer
 * making an offer and the seller answering it, orders for both sides,
 * confirming delivery, the checkout link and /openapi.json.
 * PayPal, the shop's negotiating agent and webhook delivery are stand-ins.
 */

const afterCallbacks: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: vi.fn((fn: () => unknown) => afterCallbacks.push(fn)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../negotiator", () => ({ negotiate: vi.fn(async () => {}) }));
vi.mock("../paypal", async (orig) => ({
  ...(await orig<typeof import("../paypal")>()),
  releaseToSeller: vi.fn(async () => ({ payoutRef: "PAYOUT-1", status: "SUCCESS" })),
  refundCapture: vi.fn(async () => ({ id: "REFUND-1", status: "COMPLETED", amountCents: null })),
}));

const paypal = await import("../paypal");
const { saveWebhook } = await import("./webhooks");

/** Points the seller's webhook at a stand-in server and returns the events it receives. */
async function catchWebhooks(sellerId: string, events: Parameters<typeof saveWebhook>[1]["events"]) {
  const received: { type: string; object: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const event = JSON.parse(init.body as string);
      received.push({ type: event.type, object: event.data.object });
      return new Response("ok", { status: 200 });
    }),
  );
  await saveWebhook(sellerId, { url: "https://hooks.example.test/resell", events });
  return received;
}
const { apiRoutes, openapi } = await import("./index");

/** Runs what the routes queued with after() (emails), like Next does once the response is sent. */
async function flushAfter() {
  while (afterCallbacks.length) await afterCallbacks.shift()!();
}

beforeEach(async () => {
  vi.unstubAllGlobals();
  await resetDb();
  clearEmails();
  afterCallbacks.length = 0;
  vi.clearAllMocks();
});

/** A seller with a key and a live $100 listing, and a buyer with an agent link. */
async function setup(opts: { listing?: Parameters<typeof createListing>[1] } = {}) {
  const sale = await createSale({ listing: opts.listing });
  const sellerKey = (await createKey(sale.seller.id, { kind: "api" })).token;
  const buyerKey = (await createKey(sale.buyer.id, { kind: "agent", handle: "jess" })).token;
  return { ...sale, sellerKey, buyerKey };
}

describe("account", () => {
  it("GET /me says who the key belongs to, what it may do and the month's usage", async () => {
    const s = await setup();
    const res = await api("GET", "/me", { token: s.buyerKey });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      object: "account",
      id: s.buyer.id,
      email: s.buyer.email,
      key: { kind: "agent", scopes: expect.arrayContaining(["read", "buying"]), ask_first: ["offers", "buying"] },
      shops: [],
      usage: { requests: 1, limit: 10_000 },
    });
    const seller = await api("GET", "/me", { token: s.sellerKey });
    expect(seller.body.shops).toEqual([expect.objectContaining({ object: "shop", slug: s.shop.slug })]);
  });

  it("answers OPTIONS through the exported handler", async () => {
    const res = await api("OPTIONS", "/offers");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });
});

describe("shops", () => {
  it("lists only the caller's own shops, with counts", async () => {
    const s = await setup();
    await createShop(s.buyer.id, { slug: "jess-things" });
    const res = await api("GET", "/shops", { token: s.sellerKey });
    expect(res.body).toMatchObject({ object: "list", total: 1, has_more: false });
    expect(res.body.data[0]).toMatchObject({ slug: s.shop.slug, counts: { live: 1, drafts: 0, sold: 0 } });
  });

  it("gets one shop with its numbers, and 404s on someone else's", async () => {
    const s = await setup();
    const mine = await api("GET", `/shops/${s.shop.slug}`, { token: s.sellerKey });
    expect(mine.status).toBe(200);
    expect(mine.body).toMatchObject({ object: "shop", slug: s.shop.slug, stats: { views: 0, offers_waiting: 0 } });
    const theirs = await api("GET", `/shops/${s.shop.slug}`, { token: s.buyerKey });
    expect(theirs.status).toBe(404);
  });

  it("opens a shop from curl -d fields and refuses a taken slug", async () => {
    const s = await setup();
    const res = await api("POST", "/shops", { token: s.sellerKey, form: "name=Maya%27s+kitchen&slug=Maya-Kitchen&category=Home" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ object: "shop", slug: "maya-kitchen", name: "Maya's kitchen", category: "Home", visibility: "public" });

    const again = await api("POST", "/shops", { token: s.sellerKey, json: { name: "Copy", slug: "maya-kitchen" } });
    expect(again.status).toBe(400);
    expect(again.body.error).toMatchObject({ type: "invalid_request", param: "slug" });
  });

  it("won't let an agent link open shops", async () => {
    const s = await setup();
    const res = await api("POST", "/shops", { token: s.buyerKey, json: { name: "Nope", slug: "nope-shop" } });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('"shops"');
  });

  it("changes only the settings sent", async () => {
    const s = await setup();
    const res = await api("PATCH", `/shops/${s.shop.slug}`, { token: s.sellerKey, json: { about: "Kitchen things", haggle: "true", lowest_percent: "20" } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ about: "Kitchen things", name: s.shop.name, agent: { haggle: true, lowest_percent: 20 } });
  });
});

describe("listings", () => {
  it("lists the seller's listings with filters and pages", async () => {
    const s = await setup();
    await createListing(s.shop.id, { status: "draft", publishedAt: null, slug: null });
    await createListing(s.shop.id);

    const all = await api("GET", "/listings?limit=2", { token: s.sellerKey });
    expect(all.body).toMatchObject({ object: "list", total: 3, has_more: true });
    expect(all.body.data).toHaveLength(2);
    const next = await api("GET", "/listings?limit=2&offset=2", { token: s.sellerKey });
    expect(next.body.data).toHaveLength(1);
    expect(next.body.has_more).toBe(false);

    const drafts = await api("GET", "/listings?status=draft", { token: s.sellerKey });
    expect(drafts.body.total).toBe(1);
    expect(drafts.body.data[0].status).toBe("draft");

    expect((await api("GET", "/listings", { token: s.buyerKey })).body).toEqual({ object: "list", data: [], total: 0, has_more: false });
  });

  it("gets one of the seller's listings in dollars, and hides it from others", async () => {
    const s = await setup();
    const res = await api("GET", `/listings/${s.listing.id}`, { token: s.sellerKey });
    expect(res.body).toMatchObject({ object: "listing", id: s.listing.id, shop: s.shop.slug, price: 100, shipping: 9, status: "live", photos: [] });
    expect((await api("GET", `/listings/${s.listing.id}`, { token: s.buyerKey })).status).toBe(404);
  });

  it("makes and publishes a listing from form fields with bracketed details", async () => {
    const s = await setup();
    const res = await api("POST", "/listings", {
      token: s.sellerKey,
      form: "title=Yellow+dutch+oven&price=185&lowest_price=160&fields[Brand]=Le+Creuset&fields[Condition]=Like+new&publish=true",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "live", title: "Yellow dutch oven", price: 185, lowest_price: 160 });
    expect(res.body.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Brand", value: "Le Creuset" }),
        expect.objectContaining({ label: "Condition", value: "Like new" }),
      ]),
    );
    expect(res.body.url).toContain(s.shop.slug);
  });

  it("refuses to make a listing with nothing to go on", async () => {
    const s = await setup();
    const res = await api("POST", "/listings", { token: s.sellerKey, json: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Say what it is");
  });
});

describe("marketplace (no key needed)", () => {
  it("shows stores, a store's shelf and a listing", async () => {
    const s = await setup();
    const stores = await api("GET", "/market/stores");
    expect(stores.status).toBe(200);
    expect(stores.body.data.map((x: { slug: string }) => x.slug)).toContain(s.shop.slug);

    const store = await api("GET", `/market/stores/${s.shop.slug}`);
    expect(store.body).toMatchObject({ object: "store", slug: s.shop.slug, followers: 0 });
    expect(store.body).not.toHaveProperty("following");
    expect(store.body.listings.map((l: { id: string }) => l.id)).toContain(s.listing.id);

    const one = await api("GET", `/market/listings/${s.listing.id}`);
    expect(one.body).toMatchObject({ object: "public_listing", id: s.listing.id, price: 100, store: s.shop.slug });
    expect(one.body).not.toHaveProperty("liked");
  });

  it("says whether the caller likes or follows things when a key is sent", async () => {
    const s = await setup();
    expect((await api("PUT", `/market/listings/${s.listing.id}/like`, { token: s.buyerKey })).body).toEqual({
      object: "like",
      listing: s.listing.id,
      liked: true,
    });
    expect((await api("GET", `/market/listings/${s.listing.id}`, { token: s.buyerKey })).body.liked).toBe(true);
    await api("PUT", `/market/stores/${s.shop.slug}/follow`, { token: s.buyerKey });
    expect((await api("GET", `/market/stores/${s.shop.slug}`, { token: s.buyerKey })).body).toMatchObject({ following: true, followers: 1 });
    expect((await api("GET", "/likes", { token: s.buyerKey })).body.total).toBe(1);
  });

  it("hides drafts and private shops", async () => {
    const s = await setup();
    const draft = await createListing(s.shop.id, { status: "draft", slug: null, publishedAt: null });
    expect((await api("GET", `/market/listings/${draft.id}`)).status).toBe(404);

    const hidden = await createShop(s.seller.id, { visibility: "private" });
    const secret = await createListing(hidden.id);
    expect((await api("GET", `/market/stores/${hidden.slug}`)).status).toBe(404);
    expect((await api("GET", `/market/listings/${secret.id}`)).status).toBe(404);
  });

  it("searches what's for sale", async () => {
    const s = await setup({ listing: { title: "Yellow enamel dutch oven", name: "Dutch oven" } });
    const res = await api("GET", "/market/search?q=dutch+oven");
    expect(res.status).toBe(200);
    expect(res.body.object).toBe("search_result");
    expect(res.body.data.map((l: { id: string }) => l.id)).toContain(s.listing.id);
    expect((await api("GET", "/market/search?price=cheap")).status).toBe(400);
  });

  it("shrugs off __proto__ tricks in the query string", async () => {
    const res = await api("GET", "/market/search?__proto__[isAdmin]=1&constructor[prototype]=x");
    try {
      expect(res.status).toBe(200);
      expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
    } finally {
      delete (Object.prototype as Record<string, unknown>).isAdmin;
    }
  });
});

describe("offers", () => {
  it("lets a buyer make an offer, and tells the seller", async () => {
    const s = await setup();
    const hooks = await catchWebhooks(s.seller.id, ["offer.received"]);
    const res = await api("POST", "/offers", { token: s.buyerKey, json: { listing: s.listing.id, amount: 80, note: "Pick up Saturday?" } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      object: "offer",
      status: "open",
      amount: 80,
      agreed: 80,
      counter: null,
      note: "Pick up Saturday?",
      listing: { id: s.listing.id, price: 100 },
      shop: { slug: s.shop.slug },
    });
    await vi.waitFor(() => expect(hooks).toEqual([{ type: "offer.received", object: expect.objectContaining({ id: res.body.id, amount: 80 }) }]));

    await flushAfter();
    expect(emailsTo(s.seller.email)).toHaveLength(1);
  });

  it("refuses offers at the asking price, on your own listing, or without the buying permission", async () => {
    const s = await setup();
    const atPrice = await api("POST", "/offers", { token: s.buyerKey, json: { listing: s.listing.id, amount: 100 } });
    expect(atPrice.status).toBe(409);
    expect(atPrice.body.error.message).toContain("asking price");

    const own = await api("POST", "/offers", { token: s.sellerKey, json: { listing: s.listing.id, amount: 50 } });
    expect(own.status).toBe(409);

    const readOnly = (await createKey(s.buyer.id, { kind: "api", scopes: ["read"] })).token;
    expect((await api("POST", "/offers", { token: readOnly, json: { listing: s.listing.id, amount: 50 } })).status).toBe(403);

    const bad = await api("POST", "/offers", { token: s.buyerKey, json: { listing: s.listing.id } });
    expect(bad.status).toBe(400);
    expect(bad.body.error.param).toBe("amount");
  });

  it("shows the offer to the seller and to the buyer, each on their side", async () => {
    const s = await setup();
    const made = await api("POST", "/offers", { token: s.buyerKey, json: { listing: s.listing.id, amount: 80 } });

    const sellerList = await api("GET", "/offers?status=open", { token: s.sellerKey });
    expect(sellerList.body).toMatchObject({ object: "list", total: 1 });
    expect(sellerList.body.data[0]).toMatchObject({ id: made.body.id, buyer: { name: "Jess" } });

    const buyerList = await api("GET", "/offers?role=buyer", { token: s.buyerKey });
    expect(buyerList.body.data.map((o: { id: string }) => o.id)).toEqual([made.body.id]);
    // Their own offers aren't "offers on my listings"
    expect((await api("GET", "/offers", { token: s.buyerKey })).body.total).toBe(0);

    expect((await api("GET", `/offers/${made.body.id}`, { token: s.sellerKey })).body.id).toBe(made.body.id);
    expect((await api("GET", `/offers/${made.body.id}`, { token: s.buyerKey })).body.id).toBe(made.body.id);
    const stranger = await createUser();
    const strangerKey = (await createKey(stranger.id)).token;
    expect((await api("GET", `/offers/${made.body.id}`, { token: strangerKey })).status).toBe(404);
  });

  it("goes counter → accept-counter → checkout at the agreed price", async () => {
    const s = await setup();
    const hooks = await catchWebhooks(s.seller.id, ["offer.updated"]);
    const made = await api("POST", "/offers", { token: s.buyerKey, json: { listing: s.listing.id, amount: 80 } });
    const id = made.body.id;

    const tooHigh = await api("POST", `/offers/${id}/counter`, { token: s.sellerKey, json: { amount: 120 } });
    expect(tooHigh.status).toBe(409);

    const countered = await api("POST", `/offers/${id}/counter`, { token: s.sellerKey, form: "amount=90" });
    expect(countered.status).toBe(200);
    expect(countered.body).toMatchObject({ status: "countered", amount: 80, counter: 90, agreed: 90, countered_by: "seller" });
    await flushAfter();
    expect(emailsTo(s.buyer.email).length).toBeGreaterThan(0);

    const taken = await api("POST", `/offers/${id}/accept-counter`, { token: s.buyerKey });
    expect(taken.body.status).toBe("accepted");
    await vi.waitFor(() => expect(hooks).toEqual([{ type: "offer.updated", object: expect.objectContaining({ id, status: "accepted" }) }]));

    const link = await api("POST", "/checkout", { token: s.buyerKey, json: { listing: s.listing.id } });
    expect(link.status).toBe(200);
    expect(link.body).toEqual({
      object: "checkout_link",
      listing: s.listing.id,
      price: 90,
      offer: id,
      url: `http://localhost:5689/checkout/${s.listing.id}`,
    });
  });

  it("lets the seller accept or decline once, and only their own offers", async () => {
    const s = await setup();
    const made = await api("POST", "/offers", { token: s.buyerKey, json: { listing: s.listing.id, amount: 80 } });
    const id = made.body.id;

    // The buyer's agent link may answer offers, but not on someone else's listing
    const notTheirs = await api("POST", `/offers/${id}/accept`, { token: s.buyerKey });
    expect(notTheirs.status).toBe(409);
    expect(notTheirs.body.error.message).toBe("That offer isn't yours to answer.");
    // A seller key without the "offers" permission can't answer at all
    const noOffers = (await createKey(s.seller.id, { kind: "agent", scopes: ["read"] })).token;
    expect((await api("POST", `/offers/${id}/accept`, { token: noOffers })).status).toBe(403);

    const accepted = await api("POST", `/offers/${id}/accept`, { token: s.sellerKey });
    expect(accepted.body).toMatchObject({ status: "accepted", agreed: 80 });
    const twice = await api("POST", `/offers/${id}/decline`, { token: s.sellerKey });
    expect(twice.status).toBe(409);
    expect(twice.body.error.message).toContain("already been answered");
  });

  it("lets the buyer withdraw an open offer", async () => {
    const s = await setup();
    const made = await api("POST", "/offers", { token: s.buyerKey, json: { listing: s.listing.id, amount: 80 } });
    const res = await api("POST", `/offers/${made.body.id}/withdraw`, { token: s.buyerKey });
    expect(res.body.status).toBe("withdrawn");
    const [row] = await db.select().from(offer).where(eq(offer.id, made.body.id));
    expect(row!.status).toBe("withdrawn");
  });

  it("reads an open offer past its deadline as expired", async () => {
    const s = await setup();
    await createOffer(s, { expiresAt: new Date(Date.now() - 60_000) });
    const res = await api("GET", "/offers?role=buyer", { token: s.buyerKey });
    expect(res.body.data[0].status).toBe("expired");
  });
});

describe("orders", () => {
  it("shows a sale to the seller and the order to the buyer, each with their own view", async () => {
    const s = await setup();
    const order = await createOrder(s, { paypal: true });

    const sales = await api("GET", "/sales", { token: s.sellerKey });
    expect(sales.body).toMatchObject({ object: "list", total: 1 });
    expect(sales.body.data[0]).toMatchObject({
      id: order.id,
      status: "paid",
      item: 100,
      shipping: 9,
      total: 109,
      buyer: { name: "Jess" },
      payout: { provider: "paypal", platform_fee: 10, seller_net: 94.71, released_at: null },
    });

    const mine = await api("GET", "/orders", { token: s.buyerKey });
    expect(mine.body.total).toBe(1);
    expect(mine.body.data[0]).toMatchObject({ id: order.id, total: 109, ship_to: expect.objectContaining({ name: "Jess Buyer" }) });
    expect(mine.body.data[0]).not.toHaveProperty("payout");
    expect(mine.body.data[0]).not.toHaveProperty("buyer");

    expect((await api("GET", `/orders/${order.id}`, { token: s.buyerKey })).body.id).toBe(order.id);
    expect((await api("GET", `/orders/${order.id}`, { token: s.sellerKey })).status).toBe(404);
    expect((await api("GET", `/sales/${order.id}`, { token: s.buyerKey })).status).toBe(404);
    expect((await api("GET", "/sales?status=shipped", { token: s.sellerKey })).body.total).toBe(0);
  });

  it("goes paid → shipped → confirmed, which releases the money", async () => {
    const s = await setup();
    const hooks = await catchWebhooks(s.seller.id, ["order.completed", "payout.sent"]);
    const order = await createOrder(s, { paypal: true });

    const early = await api("POST", `/orders/${order.id}/confirm`, { token: s.buyerKey });
    expect(early.status).toBe(409);
    expect(early.body.error.message).toBe("It hasn't shipped yet.");

    const shipped = await api("POST", `/sales/${order.id}/ship`, { token: s.sellerKey, json: { tracking_number: " 9400111899223197428490 " } });
    expect(shipped.body).toMatchObject({ status: "shipped", tracking_number: "9400111899223197428490" });
    expect(shipped.body.shipped_at).not.toBeNull();
    await flushAfter();
    expect(emailsTo(s.buyer.email).length).toBeGreaterThan(0);

    const sellerTries = await api("POST", `/orders/${order.id}/confirm`, { token: s.sellerKey });
    expect(sellerTries.status).toBe(409);

    const done = await api("POST", `/orders/${order.id}/confirm`, { token: s.buyerKey });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ id: order.id, status: "completed" });
    expect(done.body.completed_at).not.toBeNull();
    expect(paypal.releaseToSeller).toHaveBeenCalledWith(order.paymentRef, 0);
    await vi.waitFor(() => expect(hooks.map((h) => h.type).sort()).toEqual(["order.completed", "payout.sent"]));
    expect(hooks[0]!.object).toMatchObject({ object: "order", id: order.id });

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row!.payoutRef).toBe("PAYOUT-1");
    expect(row!.releasedAt).not.toBeNull();

    const again = await api("POST", `/orders/${order.id}/confirm`, { token: s.buyerKey });
    expect(again.status).toBe(409);
  });

  it("won't ship twice", async () => {
    const s = await setup();
    const order = await createOrder(s, { status: "shipped", shippedAt: new Date() });
    const res = await api("POST", `/sales/${order.id}/ship`, { token: s.sellerKey });
    expect(res.status).toBe(409);
  });
});

describe("checkout link", () => {
  it("gives the listing price when there's no accepted offer, and charges nothing", async () => {
    const s = await setup();
    const res = await api("POST", "/checkout", { token: s.buyerKey, form: `listing=${s.listing.id}` });
    expect(res.body).toMatchObject({ object: "checkout_link", price: 100, offer: null });
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("404s on something that isn't for sale", async () => {
    const s = await setup();
    await db.update(listing).set({ status: "sold" }).where(eq(listing.id, s.listing.id));
    const res = await api("POST", "/checkout", { token: s.buyerKey, json: { listing: s.listing.id } });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("That listing isn't for sale right now.");
  });
});

describe("/openapi.json", () => {
  it("is served without a key and describes every route", async () => {
    const res = await api("GET", "/openapi.json");
    expect(res.status).toBe(200);
    const doc = res.body;
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info).toMatchObject({ title: "resell.store API", version: "1" });
    expect(doc.servers[0].url).toMatch(/^https?:\/\//);
    expect(doc.components.securitySchemes.bearer).toEqual(expect.objectContaining({ type: "http", scheme: "bearer" }));

    for (const r of apiRoutes) {
      const path = r.path.replace(/:([A-Za-z]+)/g, "{$1}");
      expect(doc.paths[path], path).toBeDefined();
      expect(doc.paths[path][r.method.toLowerCase()], `${r.method} ${path}`).toBeDefined();
    }
    for (const p of ["/offers", "/offers/{id}/accept", "/orders", "/orders/{id}/confirm", "/checkout", "/shops/{slug}", "/market/search"]) {
      expect(doc.paths[p], p).toBeDefined();
    }
  });

  it("gives unique operation ids, path params, query params, bodies and security", () => {
    const doc = openapi() as unknown as {
      paths: Record<string, Record<string, { operationId: string; parameters: { name: string; in: string; required: boolean }[]; requestBody?: { content: Record<string, { schema: { properties?: Record<string, unknown>; required?: string[] } }> }; security: unknown[]; "x-scope"?: string; tags: string[]; responses: Record<string, unknown> }>>;
    };
    const ops = Object.values(doc.paths).flatMap((p) => Object.values(p));
    const ids = ops.map((o) => o.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of ops) {
      expect(o.tags).toHaveLength(1);
      expect(o.responses).toHaveProperty("200");
      expect(o.responses).toHaveProperty("default");
    }

    const confirm = doc.paths["/orders/{id}/confirm"]!.post!;
    expect(confirm.parameters).toContainEqual({ name: "id", in: "path", required: true, schema: { type: "string" } });
    expect(confirm.security).toEqual([{ bearer: [] }]);
    expect(confirm["x-scope"]).toBe("buying");

    const makeOffer = doc.paths["/offers"]!.post!;
    const schema = makeOffer.requestBody!.content["application/json"]!.schema;
    expect(Object.keys(schema.properties!)).toEqual(expect.arrayContaining(["listing", "amount", "note"]));
    expect(schema.required).toEqual(expect.arrayContaining(["listing", "amount"]));
    expect(makeOffer.requestBody!.content).toHaveProperty("application/x-www-form-urlencoded");

    const listOffers = doc.paths["/offers"]!.get!;
    expect(listOffers.parameters.map((p) => p.name)).toEqual(expect.arrayContaining(["role", "status", "limit", "offset"]));
    expect(listOffers.parameters.find((p) => p.name === "limit")!.in).toBe("query");

    const search = doc.paths["/market/search"]!.get!;
    expect(search.security).toEqual([{}, { bearer: [] }]);
  });
});
