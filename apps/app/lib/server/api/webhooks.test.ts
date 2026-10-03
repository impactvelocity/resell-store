import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, message, thread, webhookEndpoint, type WebhookEvent } from "@repo/db";
import { resetDb } from "../../../test/db";
import { api, createKey } from "../../../test/factories-api";
import { createOffer, createOrder, createSale } from "../../../test/factories";

/*
 * Webhooks: the Resell-Signature HMAC (`${t}.${body}`), saving, rotating and
 * deleting the endpoint, one signed delivery with fetch stubbed (status,
 * errors, the 10 second timeout), events only going out when subscribed,
 * and the /v1/webhooks routes.
 */

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const wh = await import("./webhooks");

type Sent = { url: string; init: RequestInit; event: { id: string; object: string; type: string; created_at: string; data: { object: Record<string, unknown> } } };

/** Stubs fetch; `answer` decides each response (or throws). */
function stubFetch(answer: () => Response | Promise<Response> = () => new Response("ok", { status: 200 })) {
  const sent: Sent[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    sent.push({ url, init, event: JSON.parse(init.body as string) });
    return answer();
  });
  vi.stubGlobal("fetch", fn);
  return { sent, fn };
}

const headersOf = (s: Sent) => s.init.headers as Record<string, string>;

/** Lets fire-and-forget emits finish. */
const settle = () => new Promise((r) => setTimeout(r, 150));

beforeEach(async () => {
  await resetDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sign", () => {
  it("is HMAC-SHA256 of `${t}.${body}` with the secret, in hex", () => {
    const body = '{"id":"evt_1","type":"listing.sold"}';
    const expected = createHmac("sha256", "whsec_test").update(`1759500000.${body}`).digest("hex");
    expect(wh.sign("whsec_test", 1759500000, body)).toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes with the secret, the time or the body", () => {
    const base = wh.sign("a", 1, "x");
    expect(wh.sign("b", 1, "x")).not.toBe(base);
    expect(wh.sign("a", 2, "x")).not.toBe(base);
    expect(wh.sign("a", 1, "y")).not.toBe(base);
  });
});

describe("the event list", () => {
  it("includes order problems and refunds, and defaults to the three everyday ones", () => {
    const ids = wh.webhookEvents.map((e) => e.id);
    expect(ids).toEqual(
      expect.arrayContaining(["listing.sold", "offer.received", "offer.updated", "question.asked", "order.completed", "order.problem", "order.refunded", "payout.sent"]),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(wh.defaultWebhookEvents).toEqual(["listing.sold", "offer.received", "question.asked"]);
  });
});

describe("saving the endpoint", () => {
  it("makes a whsec_ secret the first time and keeps it on later saves", async () => {
    const { seller } = await createSale();
    expect(await wh.getWebhook(seller.id)).toBeNull();

    const first = await wh.saveWebhook(seller.id, { url: "https://a.example.test/hook", events: ["listing.sold"] });
    expect(first.secret).toMatch(/^whsec_[A-Za-z0-9_-]{32}$/);
    expect(first.enabled).toBe(true);

    const second = await wh.saveWebhook(seller.id, { url: "https://b.example.test/hook", events: ["offer.received"], enabled: false });
    expect(second.secret).toBe(first.secret);
    expect(second).toMatchObject({ url: "https://b.example.test/hook", events: ["offer.received"], enabled: false });
    expect(await db.select().from(webhookEndpoint)).toHaveLength(1);
  });

  it("rotates the secret, and returns null when there's nothing to rotate", async () => {
    const { seller, buyer } = await createSale();
    const saved = await wh.saveWebhook(seller.id, { url: "https://a.example.test/hook", events: [] });
    const rotated = await wh.rotateWebhookSecret(seller.id);
    expect(rotated!.secret).toMatch(/^whsec_/);
    expect(rotated!.secret).not.toBe(saved.secret);
    expect(await wh.rotateWebhookSecret(buyer.id)).toBeNull();
  });

  it("deletes it", async () => {
    const { seller } = await createSale();
    await wh.saveWebhook(seller.id, { url: "https://a.example.test/hook", events: [] });
    await wh.deleteWebhook(seller.id);
    expect(await wh.getWebhook(seller.id)).toBeNull();
  });
});

describe("deliver", () => {
  async function endpoint() {
    const { seller } = await createSale();
    return wh.saveWebhook(seller.id, { url: "https://hooks.example.test/resell", events: ["listing.sold"] });
  }

  it("POSTs a signed JSON event the receiver can verify", async () => {
    const ep = await endpoint();
    const { sent } = stubFetch();
    const result = await wh.deliver(ep, "listing.sold", { object: "order", id: "ord_1" });

    expect(sent).toHaveLength(1);
    const s = sent[0]!;
    expect(s.url).toBe("https://hooks.example.test/resell");
    expect(s.init.method).toBe("POST");
    expect(s.init.redirect).toBe("manual");
    expect(s.init.signal).toBeInstanceOf(AbortSignal);
    expect(headersOf(s)).toMatchObject({
      "content-type": "application/json",
      "user-agent": "resell.store-webhooks/1",
      "resell-event": "listing.sold",
    });
    expect(s.event).toEqual({
      id: expect.stringMatching(/^evt_[0-9a-f]{24}$/),
      object: "event",
      type: "listing.sold",
      created_at: expect.any(String),
      data: { object: { object: "order", id: "ord_1" } },
    });
    expect(result).toEqual({ id: s.event.id, status: 200, error: null });

    // What a receiver does: split the header, recompute, compare
    const header = headersOf(s)["resell-signature"]!;
    const match = header.match(/^t=(\d+),v1=([0-9a-f]{64})$/);
    expect(match).not.toBeNull();
    const [, t, v1] = match!;
    expect(Math.abs(Number(t) - Date.now() / 1000)).toBeLessThan(5);
    expect(createHmac("sha256", ep.secret).update(`${t}.${s.init.body}`).digest("hex")).toBe(v1);
  });

  it("records a good delivery on the endpoint", async () => {
    const ep = await endpoint();
    stubFetch(() => new Response(null, { status: 204 }));
    await wh.deliver(ep, "ping", { object: "ping" });
    const row = (await wh.getWebhook(ep.userId))!;
    expect(row.lastStatus).toBe(204);
    expect(row.lastError).toBeNull();
    expect(row.lastDeliveredAt).toBeInstanceOf(Date);
  });

  it("records what the server answered when it isn't a 2xx", async () => {
    const ep = await endpoint();
    stubFetch(() => new Response("nope", { status: 500 }));
    const result = await wh.deliver(ep, "ping", {});
    expect(result).toMatchObject({ status: 500, error: "Your server answered 500." });
    expect(await wh.getWebhook(ep.userId)).toMatchObject({ lastStatus: 500, lastError: "Your server answered 500." });
  });

  it("treats a redirect as a failure rather than following it", async () => {
    const ep = await endpoint();
    stubFetch(() => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }));
    const result = await wh.deliver(ep, "ping", {});
    expect(result).toMatchObject({ status: 302, error: "Your server answered 302." });
  });

  it("records an unreachable server without throwing", async () => {
    const ep = await endpoint();
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const result = await wh.deliver(ep, "ping", {});
    expect(result).toMatchObject({ status: null, error: "We couldn't reach your server." });
    expect(await wh.getWebhook(ep.userId)).toMatchObject({ lastStatus: null, lastError: "We couldn't reach your server." });
  });

  it("gives up after 10 seconds and says so", async () => {
    const ep = await endpoint();
    const timeout = vi.spyOn(AbortSignal, "timeout");
    stubFetch(() => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    const result = await wh.deliver(ep, "ping", {});
    expect(timeout).toHaveBeenCalledWith(10_000);
    expect(result).toMatchObject({ status: null, error: "Your server took longer than 10 seconds." });
  });
});

describe("emitting events", () => {
  async function seller(events: WebhookEvent[], enabled = true) {
    const sale = await createSale();
    await wh.saveWebhook(sale.seller.id, { url: "https://hooks.example.test/resell", events, enabled });
    return sale;
  }

  it("sends offer.received with the offer when the seller asked for it", async () => {
    const sale = await seller(["offer.received"]);
    const o = await createOffer(sale, { amountCents: 7_500, note: "Hi" });
    const { sent } = stubFetch();
    wh.emitOfferEvent(o.id, "offer.received");
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]!.event.type).toBe("offer.received");
    expect(sent[0]!.event.data.object).toMatchObject({ object: "offer", id: o.id, amount: 75, status: "open", buyer: { name: "Jess" } });
  });

  it("doesn't send events the seller didn't subscribe to", async () => {
    const sale = await seller(["listing.sold"]);
    const o = await createOffer(sale);
    const { fn } = stubFetch();
    wh.emitOfferEvent(o.id, "offer.received");
    wh.emitOfferEvent(o.id, "offer.updated");
    await settle();
    expect(fn).not.toHaveBeenCalled();
  });

  it("doesn't send anything while the webhook is switched off, or without one", async () => {
    const off = await seller(["offer.received"], false);
    const o1 = await createOffer(off);
    const none = await createSale();
    const o2 = await createOffer(none);
    const { fn } = stubFetch();
    wh.emitOfferEvent(o1.id, "offer.received");
    wh.emitOfferEvent(o2.id, "offer.received");
    await settle();
    expect(fn).not.toHaveBeenCalled();
  });

  it("sends order.problem and order.refunded when subscribed, and only those", async () => {
    const sale = await seller(["order.problem", "order.refunded"]);
    const order = await createOrder(sale, { paypal: true });
    const { sent } = stubFetch();
    wh.emitOrderEvent(order.id, "listing.sold");
    wh.emitOrderEvent(order.id, "order.problem");
    wh.emitOrderEvent(order.id, "order.refunded");
    wh.emitOrderEvent(order.id, "payout.sent");
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    await settle();
    expect(sent.map((s) => s.event.type).sort()).toEqual(["order.problem", "order.refunded"]);
    expect(sent[0]!.event.data.object).toMatchObject({ object: "order", id: order.id, total: 109, payout: { seller_net: 94.71 } });
  });

  it("sends question.asked for a buyer's message, never for the seller's own reply", async () => {
    const sale = await seller(["question.asked"]);
    const [t] = await db.insert(thread).values({ shopId: sale.shop.id, buyerId: sale.buyer.id, listingId: sale.listing.id }).returning();
    const [fromBuyer] = await db.insert(message).values({ threadId: t!.id, authorId: sale.buyer.id, side: "buyer", body: "Does it fit a 10?" }).returning();
    const [fromSeller] = await db.insert(message).values({ threadId: t!.id, authorId: sale.seller.id, side: "seller", body: "Yes!" }).returning();
    const { sent } = stubFetch();
    wh.emitQuestion(fromSeller!.id);
    wh.emitQuestion(fromBuyer!.id);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    await settle();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.event.data.object).toMatchObject({
      object: "message",
      id: fromBuyer!.id,
      thread: t!.id,
      from: "Jess",
      body: "Does it fit a 10?",
      shop: { slug: sale.shop.slug },
      listing: { id: sale.listing.id },
    });
  });

  it("never throws into the caller when delivery fails", async () => {
    const sale = await seller(["offer.received"]);
    const o = await createOffer(sale);
    const { fn } = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    expect(() => wh.emitOfferEvent(o.id, "offer.received")).not.toThrow();
    await vi.waitFor(() => expect(fn).toHaveBeenCalled());
    await vi.waitFor(async () => expect((await wh.getWebhook(sale.seller.id))!.lastError).toBe("We couldn't reach your server."));
  });
});

describe("/v1/webhooks", () => {
  it("shows the signing secret only when the webhook is first set", async () => {
    const { seller } = await createSale();
    const { token } = await createKey(seller.id);

    expect((await api("GET", "/webhooks", { token })).body).toEqual({ object: "webhook", url: null, events: [], enabled: false });

    const created = await api("PUT", "/webhooks", { token, json: { url: "https://example.com/hooks/resell" } });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ url: "https://example.com/hooks/resell", events: wh.defaultWebhookEvents, enabled: true });
    expect(created.body.secret).toMatch(/^whsec_/);

    const updated = await api("PUT", "/webhooks", { token, form: "url=https://example.com/v2&events=listing.sold,order.refunded" });
    expect(updated.body.secret).toBeUndefined();
    expect(updated.body.secret_last4).toBe(created.body.secret.slice(-4));
    expect(updated.body.events).toEqual(["listing.sold", "order.refunded"]);

    const got = await api("GET", "/webhooks", { token });
    expect(got.body).not.toHaveProperty("secret");
    expect(got.body.url).toBe("https://example.com/v2");
  });

  it("only takes https addresses (or localhost) and known events", async () => {
    const { seller } = await createSale();
    const { token } = await createKey(seller.id);
    const http = await api("PUT", "/webhooks", { token, json: { url: "http://example.com/hook" } });
    expect(http.status).toBe(400);
    expect(http.body.error).toMatchObject({ param: "url", message: expect.stringContaining("https://") });
    expect((await api("PUT", "/webhooks", { token, json: { url: "http://localhost:3000/hook" } })).status).toBe(200);
    const badEvent = await api("PUT", "/webhooks", { token, json: { url: "https://example.com/h", events: ["listing.sold", "everything"] } });
    expect(badEvent.status).toBe(400);
    expect(badEvent.body.error.param).toMatch(/^events/);
  });

  it("sends a test ping and reports the answer", async () => {
    const { seller } = await createSale();
    const { token } = await createKey(seller.id);
    expect((await api("POST", "/webhooks/test", { token })).status).toBe(404);

    await api("PUT", "/webhooks", { token, json: { url: "https://example.com/hook" } });
    const { sent } = stubFetch(() => new Response("teapot", { status: 418 }));
    const res = await api("POST", "/webhooks/test", { token });
    expect(res.body).toEqual({ object: "webhook_test", event: sent[0]!.event.id, status: 418, error: "Your server answered 418." });
    expect(sent[0]!.event.type).toBe("ping");
    expect((await api("GET", "/webhooks", { token })).body.last_delivery).toMatchObject({ status: 418 });
  });

  it("rotates the secret and stops webhooks", async () => {
    const { seller } = await createSale();
    const { token } = await createKey(seller.id);
    expect((await api("POST", "/webhooks/rotate-secret", { token })).status).toBe(404);
    const created = await api("PUT", "/webhooks", { token, json: { url: "https://example.com/hook" } });
    const rotated = await api("POST", "/webhooks/rotate-secret", { token });
    expect(rotated.body.secret).toMatch(/^whsec_/);
    expect(rotated.body.secret).not.toBe(created.body.secret);

    const stopped = await api("DELETE", "/webhooks", { token });
    expect(stopped.body).toEqual({ object: "webhook", url: null, events: [], enabled: false });
    expect(await wh.getWebhook(seller.id)).toBeNull();
  });

  it("isn't available to an agent link", async () => {
    const { seller } = await createSale();
    const { token } = await createKey(seller.id, { kind: "agent" });
    const res = await api("GET", "/webhooks", { token });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('"webhooks"');
  });
});
