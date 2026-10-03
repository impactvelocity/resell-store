import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, webhookDelivery, webhookEndpoint } from "@repo/db";
import { resetDb } from "../../../test/db";
import { createSale } from "../../../test/factories";

/*
 * Webhook retries: a failed event is queued with the same id, the sweep tries
 * it again on the backoff schedule and stops after six tries, a working
 * server clears the failure clock, three days of failures turn the endpoint
 * off (and saving switches it back on), and "ping" tests are never retried.
 */

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const wh = await import("./webhooks");

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Stubs fetch with a list of statuses to answer in turn (the last one repeats). */
function answers(...statuses: number[]) {
  const sent: { id: string }[] = [];
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(init.body as string));
      const status = statuses[Math.min(i++, statuses.length - 1)]!;
      return new Response("", { status });
    }),
  );
  return sent;
}

async function endpoint() {
  const { seller } = await createSale();
  return wh.saveWebhook(seller.id, { url: "https://hooks.example.test/resell", events: ["listing.sold"] });
}

const deliveries = (userId: string) => db.select().from(webhookDelivery).where(eq(webhookDelivery.userId, userId));

beforeEach(async () => {
  await resetDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deliver", () => {
  it("records a delivered event and doesn't queue it", async () => {
    const ep = await endpoint();
    answers(200);
    await wh.deliver(ep, "listing.sold", { id: "ord_1" });
    const [row] = await deliveries(ep.userId);
    expect(row).toMatchObject({ status: "delivered", attempts: 1, nextAttemptAt: null });
    expect(row!.deliveredAt).toBeInstanceOf(Date);
  });

  it("queues a failed event to try again in about 5 minutes and starts the failure clock", async () => {
    const ep = await endpoint();
    answers(500);
    const before = Date.now();
    const result = await wh.deliver(ep, "listing.sold", { id: "ord_1" });
    const [row] = await deliveries(ep.userId);
    expect(row).toMatchObject({ status: "pending", attempts: 1, lastStatus: 500, eventId: result.id });
    expect(row!.nextAttemptAt!.getTime() - before).toBeGreaterThanOrEqual(5 * MIN - 1000);
    expect(row!.nextAttemptAt!.getTime() - before).toBeLessThan(6 * MIN);
    const [saved] = await db.select().from(webhookEndpoint).where(eq(webhookEndpoint.userId, ep.userId));
    expect(saved!.failingSince).toBeInstanceOf(Date);
  });

  it("never queues the test ping", async () => {
    const ep = await endpoint();
    answers(500);
    await wh.deliver(ep, "ping", {});
    expect(await deliveries(ep.userId)).toHaveLength(0);
  });
});

describe("retryWebhooks", () => {
  it("leaves events alone until they're due", async () => {
    const ep = await endpoint();
    answers(500);
    await wh.deliver(ep, "listing.sold", { id: "ord_1" });
    const sent = answers(200);
    expect(await wh.retryWebhooks(new Date(Date.now() + MIN))).toMatchObject({ retried: 0 });
    expect(sent).toHaveLength(0);
  });

  it("sends the same event again when it's due, and marks it delivered", async () => {
    const ep = await endpoint();
    answers(500);
    const first = await wh.deliver(ep, "listing.sold", { id: "ord_1" });
    const sent = answers(200);
    expect(await wh.retryWebhooks(new Date(Date.now() + 6 * MIN))).toMatchObject({ retried: 1, delivered: 1 });
    expect(sent).toEqual([expect.objectContaining({ id: first.id })]);
    const [row] = await deliveries(ep.userId);
    expect(row).toMatchObject({ status: "delivered", attempts: 2, nextAttemptAt: null });
    const [saved] = await db.select().from(webhookEndpoint).where(eq(webhookEndpoint.userId, ep.userId));
    expect(saved!.failingSince).toBeNull();
    expect(saved!.lastError).toBeNull();
  });

  it("backs off 5m, 30m, 2h, 6h, 24h and gives up after six tries", async () => {
    const ep = await endpoint();
    answers(503);
    await wh.deliver(ep, "listing.sold", { id: "ord_1" });
    let now = Date.now();
    const waits: number[] = [];
    for (let i = 0; i < 5; i++) {
      const [row] = await deliveries(ep.userId);
      waits.push(Math.round((row!.nextAttemptAt!.getTime() - now) / MIN));
      now = row!.nextAttemptAt!.getTime() + 1000;
      await wh.retryWebhooks(new Date(now));
    }
    expect(waits).toEqual([5, 30, 120, 360, 1440]);
    const [row] = await deliveries(ep.userId);
    expect(row).toMatchObject({ status: "failed", attempts: 6, nextAttemptAt: null, lastStatus: 503 });
  });

  it("doesn't send twice when two sweeps run at once", async () => {
    const ep = await endpoint();
    answers(500);
    await wh.deliver(ep, "listing.sold", { id: "ord_1" });
    const sent = answers(200);
    const at = new Date(Date.now() + 6 * MIN);
    await Promise.all([wh.retryWebhooks(at), wh.retryWebhooks(at)]);
    expect(sent).toHaveLength(1);
  });

  it("gives up on events for a webhook that's been switched off", async () => {
    const ep = await endpoint();
    answers(500);
    await wh.deliver(ep, "listing.sold", { id: "ord_1" });
    await db.update(webhookEndpoint).set({ enabled: false }).where(eq(webhookEndpoint.userId, ep.userId));
    const sent = answers(200);
    await wh.retryWebhooks(new Date(Date.now() + 6 * MIN));
    expect(sent).toHaveLength(0);
    const [row] = await deliveries(ep.userId);
    expect(row).toMatchObject({ status: "failed", nextAttemptAt: null });
  });

  it("turns off an endpoint that has failed for three days, and saving switches it back on", async () => {
    const ep = await endpoint();
    answers(500);
    await wh.deliver(ep, "listing.sold", { id: "ord_1" });
    await db
      .update(webhookEndpoint)
      .set({ failingSince: new Date(Date.now() - 73 * HOUR) })
      .where(eq(webhookEndpoint.userId, ep.userId));
    const result = await wh.retryWebhooks(new Date());
    expect(result.turnedOff).toBe(1);
    const off = await wh.getWebhook(ep.userId);
    expect(off).toMatchObject({ enabled: false });
    expect(off!.lastError).toMatch(/three days/);
    expect((await deliveries(ep.userId))[0]).toMatchObject({ status: "failed" });

    const back = await wh.saveWebhook(ep.userId, { url: ep.url, events: ep.events });
    expect(back).toMatchObject({ enabled: true, failingSince: null });
  });

  it("counts what's still waiting for /tools/api", async () => {
    const ep = await endpoint();
    answers(500);
    await wh.deliver(ep, "listing.sold", { id: "ord_1" });
    await wh.deliver(ep, "listing.sold", { id: "ord_2" });
    expect(await wh.pendingDeliveries(ep.userId)).toBe(2);
  });
});
