import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, webhookDelivery, webhookEndpoint, webhookSubscription } from "@repo/db";
import { resetDb } from "../../../test/db";
import { api, createKey } from "../../../test/factories-api";
import { createOffer, createOrder, createSale } from "../../../test/factories";

/*
 * Webhook subscriptions (REST hooks, for Zapier): adding one per address,
 * events going to the endpoint and every subscription that asked, 410 Gone
 * deleting a subscription, retries and the three-day turn-off staying per
 * target, samples built from the seller's latest things (or made up), the
 * /v1/webhooks/subscriptions and /samples routes, and the Zapier app
 * (integrations/zapier) offering a trigger for every event.
 */

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const wh = await import("./webhooks");
const samples = await import("./webhook-samples");

type Sent = {
  url: string;
  body: string;
  signature: string;
  event: { id: string; type: string; test?: boolean; data: { object: Record<string, unknown> } };
};

/** Stubs fetch; `status` decides each answer by address. */
function stubFetch(status: (url: string) => number = () => 200) {
  const sent: Sent[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const body = init.body as string;
      sent.push({ url, body, signature: (init.headers as Record<string, string>)["resell-signature"]!, event: JSON.parse(body) });
      return new Response("", { status: status(url) });
    }),
  );
  return sent;
}

const ZAP = "https://hooks.zapier.com/hooks/standard/1/abc/";
const MIN = 60_000;

beforeEach(async () => {
  await resetDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("adding subscriptions", () => {
  it("makes one per address with its own secret, and updates it when the address comes again", async () => {
    const { seller } = await createSale();
    const first = await wh.addSubscription(seller.id, { url: ZAP, events: ["listing.sold"], source: "zapier", name: "Sales to a sheet" });
    expect(first!.secret).toMatch(/^whsec_/);
    const again = await wh.addSubscription(seller.id, { url: ZAP, events: ["offer.received"], source: "zapier" });
    expect(again!.id).toBe(first!.id);
    expect(again).toMatchObject({ events: ["offer.received"], secret: first!.secret, enabled: true });
    expect(await wh.listSubscriptions(seller.id)).toHaveLength(1);
  });

  it("stops at the limit", async () => {
    const { seller } = await createSale();
    await db.insert(webhookSubscription).values(
      Array.from({ length: wh.MAX_SUBSCRIPTIONS }, (_, i) => ({
        userId: seller.id,
        url: `https://h.example.test/${i}`,
        events: ["listing.sold" as const],
        secret: "whsec_x",
        source: "api" as const,
      })),
    );
    expect(await wh.addSubscription(seller.id, { url: ZAP, events: ["listing.sold"], source: "app" })).toBeNull();
  });

  it("only removes the owner's own", async () => {
    const a = await createSale();
    const b = await createSale();
    const sub = await wh.addSubscription(a.seller.id, { url: ZAP, events: ["listing.sold"], source: "app" });
    expect(await wh.removeSubscription(b.seller.id, sub!.id)).toBe(false);
    expect(await wh.removeSubscription(a.seller.id, sub!.id)).toBe(true);
    expect(await wh.listSubscriptions(a.seller.id)).toHaveLength(0);
  });
});

describe("emitting to subscriptions", () => {
  it("sends to the endpoint and each subscription that asked for the event, signed with each one's secret", async () => {
    const sale = await createSale();
    const endpoint = await wh.saveWebhook(sale.seller.id, { url: "https://mine.example.test/hook", events: ["offer.received"] });
    const sub = await wh.addSubscription(sale.seller.id, { url: ZAP, events: ["offer.received", "listing.sold"], source: "zapier" });
    await wh.addSubscription(sale.seller.id, { url: "https://other.example.test/h", events: ["listing.sold"], source: "app" });
    const o = await createOffer(sale);
    const sent = stubFetch();
    wh.emitOfferEvent(o.id, "offer.received");
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(sent.map((s) => s.url).sort()).toEqual([ZAP, "https://mine.example.test/hook"]);
    const secrets: Record<string, string> = { [ZAP]: sub!.secret, "https://mine.example.test/hook": endpoint.secret };
    for (const s of sent) {
      const [, t, v1] = /^t=(\d+),v1=([0-9a-f]+)$/.exec(s.signature)!;
      expect(v1).toBe(wh.sign(secrets[s.url]!, Number(t), s.body));
    }
    expect(sent.every((s) => s.event.type === "offer.received" && s.event.data.object.id === o.id)).toBe(true);
    expect(sent.some((s) => "test" in s.event)).toBe(false);
  });

  it("skips a subscription that's turned off", async () => {
    const sale = await createSale();
    const sub = await wh.addSubscription(sale.seller.id, { url: ZAP, events: ["offer.received"], source: "zapier" });
    await db.update(webhookSubscription).set({ enabled: false }).where(eq(webhookSubscription.id, sub!.id));
    const o = await createOffer(sale);
    const sent = stubFetch();
    wh.emitOfferEvent(o.id, "offer.received");
    await new Promise((r) => setTimeout(r, 150));
    expect(sent).toHaveLength(0);
  });

  it("deletes a subscription that answers 410 Gone, and doesn't queue a retry", async () => {
    const sale = await createSale();
    const sub = await wh.addSubscription(sale.seller.id, { url: ZAP, events: ["listing.sold"], source: "zapier" });
    stubFetch(() => 410);
    const result = await wh.deliverToSubscription(sub!, "listing.sold", { id: "x" });
    expect(result.status).toBe(410);
    expect(await wh.listSubscriptions(sale.seller.id)).toHaveLength(0);
    expect(await db.select().from(webhookDelivery)).toHaveLength(0);
  });

  it("records the last result on the subscription, not the endpoint", async () => {
    const sale = await createSale();
    await wh.saveWebhook(sale.seller.id, { url: "https://mine.example.test/hook", events: ["listing.sold"] });
    const sub = await wh.addSubscription(sale.seller.id, { url: ZAP, events: ["listing.sold"], source: "zapier" });
    stubFetch(() => 500);
    await wh.deliverToSubscription(sub!, "listing.sold", { id: "x" });
    const [row] = await db.select().from(webhookSubscription).where(eq(webhookSubscription.id, sub!.id));
    expect(row).toMatchObject({ lastStatus: 500, lastError: "Your server answered 500." });
    expect(row!.failingSince).toBeInstanceOf(Date);
    expect(await wh.getWebhook(sale.seller.id)).toMatchObject({ lastStatus: null, failingSince: null });
  });
});

describe("retrying subscriptions", () => {
  it("tries a failed event again at the same address with the same id", async () => {
    const sale = await createSale();
    const sub = await wh.addSubscription(sale.seller.id, { url: ZAP, events: ["listing.sold"], source: "zapier" });
    const sent = stubFetch(() => (sent.length === 1 ? 503 : 200));
    const first = await wh.deliverToSubscription(sub!, "listing.sold", { id: "ord_1" });
    const out = await wh.retryWebhooks(new Date(Date.now() + 6 * MIN));
    expect(out).toMatchObject({ retried: 1, delivered: 1 });
    expect(sent.map((s) => [s.url, s.event.id])).toEqual([
      [ZAP, first.id],
      [ZAP, first.id],
    ]);
    const [d] = await db.select().from(webhookDelivery);
    expect(d).toMatchObject({ status: "delivered", subscriptionId: sub!.id });
  });

  it("turns off only the subscription that's failed for three days, and only gives up its own events", async () => {
    const sale = await createSale();
    await wh.saveWebhook(sale.seller.id, { url: "https://mine.example.test/hook", events: ["listing.sold"] });
    const sub = await wh.addSubscription(sale.seller.id, { url: ZAP, events: ["listing.sold"], source: "zapier" });
    stubFetch(() => 500);
    await wh.deliverToSubscription(sub!, "listing.sold", { id: "a" });
    await wh.deliver((await wh.getWebhook(sale.seller.id))!, "listing.sold", { id: "b" });
    const now = new Date(Date.now() + 3 * 24 * 60 * MIN + MIN);
    await db.update(webhookSubscription).set({ failingSince: new Date(now.getTime() - 3 * 24 * 60 * MIN - 1) });
    await db.update(webhookEndpoint).set({ failingSince: now });
    await db.update(webhookDelivery).set({ nextAttemptAt: new Date(now.getTime() + 60 * MIN) });
    await wh.retryWebhooks(now);
    expect((await wh.getSubscription(sale.seller.id, sub!.id))!.enabled).toBe(false);
    expect((await wh.getWebhook(sale.seller.id))!.enabled).toBe(true);
    const rows = await db.select().from(webhookDelivery);
    expect(rows.find((r) => r.subscriptionId)!.status).toBe("failed");
    expect(rows.find((r) => !r.subscriptionId)!.status).toBe("pending");
    expect(await wh.pendingDeliveries(sale.seller.id)).toBe(1);
  });
});

describe("samples", () => {
  it("builds them from the seller's latest real things, marked as tests", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true });
    const [event] = await samples.sampleEvents(sale.seller.id, "listing.sold");
    expect(event).toMatchObject({ object: "event", type: "listing.sold", test: true, data: { object: { object: "order", id: order.id } } });
    expect(event!.id).toMatch(/^evt_sample_/);
  });

  it("makes one up when there's nothing yet", async () => {
    const { seller } = await createSale();
    for (const e of wh.webhookEvents) {
      const list = await samples.sampleEvents(seller.id, e.id);
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ type: e.id, test: true });
      expect(list[0]!.data.object).toHaveProperty("id");
    }
  });

  it("sends one to a subscription without queuing a retry", async () => {
    const sale = await createSale();
    const o = await createOffer(sale);
    const sub = await wh.addSubscription(sale.seller.id, { url: ZAP, events: ["offer.received"], source: "app" });
    const sent = stubFetch(() => 500);
    const res = await samples.sendSample(sub!);
    expect(res).toMatchObject({ event: "offer.received", status: 500 });
    expect(sent[0]!.event).toMatchObject({ type: "offer.received", test: true, data: { object: { id: o.id } } });
    expect(await db.select().from(webhookDelivery)).toHaveLength(0);
  });
});

describe("/v1/webhooks/subscriptions", () => {
  it("subscribes, lists, tests and unsubscribes, the way Zapier does", async () => {
    const sale = await createSale();
    const { token } = await createKey(sale.seller.id);
    const zapier = { "resell-client": "Zapier" };

    const made = await api("POST", "/webhooks/subscriptions", {
      token,
      headers: zapier,
      json: { url: ZAP, events: ["listing.sold"], name: "Sales to a sheet" },
    });
    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({ object: "webhook_subscription", url: ZAP, events: ["listing.sold"], source: "zapier", enabled: true });
    expect(made.body.secret).toMatch(/^whsec_/);

    const list = await api("GET", "/webhooks/subscriptions", { token });
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].secret).toBeUndefined();

    const sent = stubFetch();
    const test = await api("POST", `/webhooks/subscriptions/${made.body.id}/test`, { token });
    expect(test.body).toMatchObject({ object: "webhook_test", type: "listing.sold", status: 200 });
    expect(sent[0]!.event.test).toBe(true);

    const gone = await api("DELETE", `/webhooks/subscriptions/${made.body.id}`, { token });
    expect(gone.body).toEqual({ object: "webhook_subscription", id: made.body.id, deleted: true });
    expect((await api("DELETE", `/webhooks/subscriptions/${made.body.id}`, { token })).status).toBe(404);
  });

  it("takes a comma list of events from curl, and refuses unknown ones or none", async () => {
    const sale = await createSale();
    const { token } = await createKey(sale.seller.id);
    const ok = await api("POST", "/webhooks/subscriptions", { token, form: `url=${ZAP}&events=listing.sold,review.created` });
    expect(ok.body).toMatchObject({ events: ["listing.sold", "review.created"], source: "api" });
    expect((await api("POST", "/webhooks/subscriptions", { token, json: { url: ZAP, events: ["everything"] } })).status).toBe(400);
    expect((await api("POST", "/webhooks/subscriptions", { token, json: { url: ZAP, events: [] } })).status).toBe(400);
    expect((await api("POST", "/webhooks/subscriptions", { token, json: { url: "http://example.com/h", events: ["listing.sold"] } })).status).toBe(400);
  });

  it("can't see or remove someone else's", async () => {
    const a = await createSale();
    const b = await createSale();
    const sub = await wh.addSubscription(a.seller.id, { url: ZAP, events: ["listing.sold"], source: "app" });
    const { token } = await createKey(b.seller.id);
    expect((await api("GET", "/webhooks/subscriptions", { token })).body.data).toHaveLength(0);
    expect((await api("DELETE", `/webhooks/subscriptions/${sub!.id}`, { token })).status).toBe(404);
    expect((await api("POST", `/webhooks/subscriptions/${sub!.id}/test`, { token })).status).toBe(404);
  });

  it("serves samples for a known event and a 404 for anything else", async () => {
    const sale = await createSale();
    const { token } = await createKey(sale.seller.id);
    const res = await api("GET", "/webhooks/samples/review.created?limit=2", { token });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ object: "list", has_more: false });
    expect(res.body.data[0]).toMatchObject({ type: "review.created", test: true, data: { object: { object: "review" } } });
    expect((await api("GET", "/webhooks/samples/everything", { token })).status).toBe(404);
  });
});

describe("the Zapier app", () => {
  it("has a trigger for every event", () => {
    const require = createRequire(import.meta.url);
    const { events } = require("../../../../../integrations/zapier/lib/events.js") as { events: { event: string }[] };
    expect(events.map((e) => e.event).sort()).toEqual(wh.webhookEvents.map((e) => e.id).sort());
  });
});
