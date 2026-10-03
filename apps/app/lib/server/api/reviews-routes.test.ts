import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, review, shop } from "@repo/db";
import { resetDb } from "../../../test/db";
import { api, createKey } from "../../../test/factories-api";
import { createListing, createOrder, createSale, createUser } from "../../../test/factories";
import { clearEmails, emailsTo } from "../../../test/mail";

/*
 * Reviews through the real /v1 route handler with real keys and Postgres: a
 * store's public reviews, the buyer leaving one, the seller's list and reply,
 * permissions, and the review.created webhook.
 */

const afterCallbacks: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: vi.fn((fn: () => unknown) => afterCallbacks.push(fn)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saveWebhook } = await import("./webhooks");
const reviews = await import("../reviews");

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

/** A completed order, a full key for the seller and a buyer key. */
async function setup() {
  const sale = await createSale();
  const order = await createOrder(sale, { status: "completed", completedAt: new Date() });
  const seller = await createKey(sale.seller.id);
  const buyer = await createKey(sale.buyer.id, { kind: "agent", handle: "jess" });
  return { ...sale, order, sellerKey: seller.token, buyerKey: buyer.token };
}

describe("POST /orders/:id/review", () => {
  it("lets the buyer review a completed order and emails the seller", async () => {
    const s = await setup();
    const res = await api("POST", `/orders/${s.order.id}/review`, {
      token: s.buyerKey,
      json: { rating: 5, body: "Exactly like the photos." },
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      object: "review",
      order: s.order.id,
      rating: 5,
      body: "Exactly like the photos.",
      from: "Jess",
      public: true,
      hidden: false,
      reply: null,
      listing: { id: s.listing.id, title: s.listing.title, url: expect.stringContaining(s.listing.slug!) },
      shop: { slug: s.shop.slug, name: s.shop.name },
    });
    await flushAfter();
    expect(emailsTo(s.seller.email)).toEqual([expect.stringContaining("5 stars")]);

    // And they can read it back
    const back = await api("GET", `/orders/${s.order.id}/review`, { token: s.buyerKey });
    expect(back.status).toBe(200);
    expect(back.body.id).toBe(res.body.id);
  });

  it("takes form fields like curl -d, including a private review", async () => {
    const s = await setup();
    const res = await api("POST", `/orders/${s.order.id}/review`, { token: s.buyerKey, form: "rating=3&public=false" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ rating: 3, body: null, public: false });
  });

  it("says no to a second review, a bad rating, an unfinished order and someone else's order", async () => {
    const s = await setup();
    await api("POST", `/orders/${s.order.id}/review`, { token: s.buyerKey, json: { rating: 5 } });
    const twice = await api("POST", `/orders/${s.order.id}/review`, { token: s.buyerKey, json: { rating: 1 } });
    expect(twice.status).toBe(409);
    expect(twice.body.error.message).toMatch(/already reviewed/);

    const bad = await api("POST", `/orders/${s.order.id}/review`, { token: s.buyerKey, json: { rating: 7 } });
    expect(bad.status).toBe(400);
    expect(bad.body.error.param).toBe("rating");

    const l = await createListing(s.shop.id);
    const shipped = await createOrder({ buyer: s.buyer, shop: s.shop, listing: l }, { status: "shipped" });
    const early = await api("POST", `/orders/${shipped.id}/review`, { token: s.buyerKey, json: { rating: 5 } });
    expect(early.status).toBe(409);
    expect(early.body.error.message).toMatch(/all done/);

    const notMine = await api("POST", `/orders/${s.order.id}/review`, { token: s.sellerKey, json: { rating: 5 } });
    expect(notMine.status).toBe(409);
    expect(await db.select().from(review)).toHaveLength(1);
  });

  it("needs the buying permission and a key", async () => {
    const s = await setup();
    const readOnly = await createKey(s.buyer.id, { kind: "api", scopes: ["read"] });
    const res = await api("POST", `/orders/${s.order.id}/review`, { token: readOnly.token, json: { rating: 5 } });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('"buying"');
    expect((await api("POST", `/orders/${s.order.id}/review`, { json: { rating: 5 } })).status).toBe(401);
  });

  it("404s reading a review that isn't there or isn't yours", async () => {
    const s = await setup();
    expect((await api("GET", `/orders/${s.order.id}/review`, { token: s.buyerKey })).status).toBe(404);
    await api("POST", `/orders/${s.order.id}/review`, { token: s.buyerKey, json: { rating: 5 } });
    expect((await api("GET", `/orders/${s.order.id}/review`, { token: s.sellerKey })).status).toBe(404);
  });

  it("sends review.created to the seller's webhook", async () => {
    const s = await setup();
    const received: { type: string; object: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const event = JSON.parse(init.body as string);
        received.push({ type: event.type, object: event.data.object });
        return new Response("ok", { status: 200 });
      }),
    );
    await saveWebhook(s.seller.id, { url: "https://hooks.example.test/resell", events: ["review.created"] });
    const res = await api("POST", `/orders/${s.order.id}/review`, { token: s.buyerKey, json: { rating: 4, body: "Nice", public: false } });
    await vi.waitFor(() =>
      expect(received).toEqual([
        {
          type: "review.created",
          object: expect.objectContaining({ object: "review", id: res.body.id, rating: 4, body: "Nice", public: false, from: "Jess", order: s.order.id }),
        },
      ]),
    );
  });
});

describe("GET /stores/:slug/reviews", () => {
  it("lists public reviews without a key, with the rating and seller replies, and pages", async () => {
    const s = await setup();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const buyer = await createUser({ name: `Buyer${i} Surname` });
      const l = await createListing(s.shop.id);
      const o = await createOrder({ buyer, shop: s.shop, listing: l }, { status: "completed" });
      const r = await reviews.leaveReview({ buyerId: buyer.id, orderId: o.id, rating: 4 + (i % 2), body: `Review ${i}` });
      ids.push(r.id);
    }
    // A private one doesn't show or count
    await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 1, public: false });
    await reviews.replyToReview({ sellerId: s.seller.id, reviewId: ids[2]!, body: "Thank you!" });

    const first = await api("GET", `/stores/${s.shop.slug}/reviews?limit=2`);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ object: "list", rating: { average: 4.3, count: 3 }, has_more: true });
    expect(first.body.data).toHaveLength(2);
    expect(first.body.data[0]).toMatchObject({ object: "review", id: ids[2], from: "Buyer2", reply: { body: "Thank you!" } });
    // Public responses don't say who bought what beyond a first name, or the order
    expect(first.body.data[0]).not.toHaveProperty("order");
    expect(first.body.data[0]).not.toHaveProperty("public");
    expect(JSON.stringify(first.body)).not.toContain("Surname");

    const second = await api("GET", `/stores/${s.shop.slug}/reviews?limit=2&cursor=${first.body.next_cursor}`);
    expect(second.body.data.map((r: { id: string }) => r.id)).toEqual([ids[0]]);
    expect(second.body).toMatchObject({ has_more: false, next_cursor: null });

    const fives = await api("GET", `/stores/${s.shop.slug}/reviews?rating=5`);
    expect(fives.body.data.map((r: { rating: number }) => r.rating)).toEqual([5]);
  });

  it("404s a private shop or one that isn't there", async () => {
    const s = await setup();
    await db.update(shop).set({ visibility: "private" }).where(eq(shop.id, s.shop.id));
    expect((await api("GET", `/stores/${s.shop.slug}/reviews`)).status).toBe(404);
    expect((await api("GET", `/stores/nobody-here/reviews`)).status).toBe(404);
  });
});

describe("seller: GET /reviews and POST /reviews/:id/reply", () => {
  it("lists every review on the seller's shops, private ones too", async () => {
    const s = await setup();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 2, body: "Meh", public: false });
    const other = await createSale();
    const o = await createOrder(other, { status: "completed" });
    await reviews.leaveReview({ buyerId: other.buyer.id, orderId: o.id, rating: 5 });

    const res = await api("GET", "/reviews", { token: s.sellerKey });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ object: "list", total: 1, has_more: false });
    expect(res.body.data[0]).toMatchObject({ id: r.id, order: s.order.id, public: false, hidden: false, rating: 2, from: "Jess" });

    expect((await api("GET", `/reviews?shop=${s.shop.slug}`, { token: s.sellerKey })).body.total).toBe(1);
    expect((await api("GET", `/reviews?shop=${other.shop.slug}`, { token: s.sellerKey })).status).toBe(404);
  });

  it("replies once, and sending again changes the reply", async () => {
    const s = await setup();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    const res = await api("POST", `/reviews/${r.id}/reply`, { token: s.sellerKey, json: { body: "Thanks, Jess!" } });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatchObject({ body: "Thanks, Jess!" });
    const again = await api("POST", `/reviews/${r.id}/reply`, { token: s.sellerKey, form: "body=Thanks+so+much%2C+Jess!" });
    expect(again.body.reply.body).toBe("Thanks so much, Jess!");
    const [row] = await db.select().from(review).where(eq(review.id, r.id));
    expect(row!.sellerReply).toBe("Thanks so much, Jess!");
  });

  it("needs the shops permission, so an agent link can't reply, and it's only for the shop's owner", async () => {
    const s = await setup();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    const agent = await createKey(s.seller.id, { kind: "agent", handle: "maya-agent" });
    const denied = await api("POST", `/reviews/${r.id}/reply`, { token: agent.token, json: { body: "Hi" } });
    expect(denied.status).toBe(403);
    expect(denied.body.error.message).toContain('"shops"');

    const stranger = await createUser();
    const strangerKey = await createKey(stranger.id);
    const notYours = await api("POST", `/reviews/${r.id}/reply`, { token: strangerKey.token, json: { body: "Hi" } });
    expect(notYours.status).toBe(409);

    const empty = await api("POST", `/reviews/${r.id}/reply`, { token: s.sellerKey, json: { body: "  " } });
    expect(empty.status).toBe(409);
    expect(empty.body.error.message).toMatch(/few words/);
  });
});
