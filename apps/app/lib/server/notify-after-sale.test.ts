import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, dispute, disputeEvent, type DisputeEventKind } from "@repo/db";
import { render, toPlainText } from "@repo/email";
import { resetDb } from "../../test/db";
import { createOffer, createOrder, createSale, daysAgo } from "../../test/factories";
import { clearEmails, emailsTo, sentEmails } from "../../test/mail";
import { sendEmail } from "./email";
import * as after from "./notify-after-sale";
import * as notify from "./notify";

/*
 * Who gets which email after a sale (notify-after-sale.ts, plus the shared
 * helpers and commerce emails in notify.ts). sendEmail is the spy from
 * test/setup.ts; @example.com addresses are only logged; nothing here ever
 * throws.
 */

type Sale = Awaited<ReturnType<typeof createSale>>;

beforeEach(async () => {
  await resetDb();
  clearEmails();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** The plain text of the last email sent to `to`. */
async function textTo(to: string) {
  const call = vi
    .mocked(sendEmail)
    .mock.calls.map(([msg]) => msg)
    .filter((m) => m.to === to)
    .at(-1);
  if (!call) throw new Error(`Nothing was sent to ${to}`);
  return toPlainText(await render(call.react));
}

const title = (sale: Sale) => sale.listing.title!;

async function disputeWith(orderId: string, events: { side: "buyer" | "seller" | "platform"; kind: DisputeEventKind; body?: string; amountCents?: number }[], extra: Partial<typeof dispute.$inferInsert> = {}) {
  const [d] = await db.insert(dispute).values({ orderId, reason: "damaged", ...extra }).returning();
  const start = Date.now() - events.length * 60_000;
  for (const [i, e] of events.entries())
    await db.insert(disputeEvent).values({ disputeId: d!.id, ...e, createdAt: new Date(start + i * 60_000) });
  return d!;
}

describe("offer emails", () => {
  it("reminds the seller about an open offer", async () => {
    const sale = await createSale();
    const o = await createOffer(sale);
    await after.notifyOfferAnswerReminder(o.id);
    expect(sentEmails).toEqual([{ to: sale.seller.email, subject: "Jess's $80 offer runs out soon" }]);
    expect(await textTo(sale.seller.email)).toContain("Answer the offer");
  });

  it("reminds the buyer about a counter, or an accepted offer to pay for", async () => {
    const sale = await createSale();
    const countered = await createOffer(sale, { status: "countered", counterCents: 9_050 });
    await after.notifyOfferBuyerReminder(countered.id);
    expect(sentEmails).toEqual([{ to: sale.buyer.email, subject: `${sale.shop.name}'s counter runs out soon` }]);
    expect(await textTo(sale.buyer.email)).toContain("$90.50");

    clearEmails();
    const sale2 = await createSale();
    const accepted = await createOffer(sale2, { status: "accepted", counterCents: 9_000 });
    await after.notifyOfferBuyerReminder(accepted.id);
    expect(emailsTo(sale2.buyer.email)).toEqual([expect.stringMatching(new RegExp(`^Pay for ${title(sale2)} by `))]);
    expect(await textTo(sale2.buyer.email)).toContain("Pay $90");
  });

  it("tells the right people when an offer runs out, depending on whose turn it was", async () => {
    const sale = await createSale();
    const o = await createOffer(sale, { status: "expired", counterCents: 9_000 });

    await after.notifyOfferExpired(o.id, "open");
    expect(sentEmails).toEqual([
      { to: sale.buyer.email, subject: `Your offer on ${title(sale)} ran out` },
      { to: sale.seller.email, subject: "Jess's offer ran out" },
    ]);

    clearEmails();
    await after.notifyOfferExpired(o.id, "countered");
    expect(sentEmails).toEqual([{ to: sale.seller.email, subject: "Jess didn't answer your counter" }]);

    clearEmails();
    await after.notifyOfferExpired(o.id, "accepted");
    expect(sentEmails).toEqual([
      { to: sale.buyer.email, subject: `Your deal on ${title(sale)} lapsed` },
      { to: sale.seller.email, subject: `Jess didn't pay for ${title(sale)}` },
    ]);

    clearEmails();
    await after.notifyOfferExpired(o.id, "declined");
    expect(sentEmails).toEqual([]);
  });
});

describe("shipping emails", () => {
  it("nudges the seller and tells the buyer they can cancel", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(3.5) });

    await after.notifyShipReminder(order.id);
    await after.notifyShipLate(order.id);

    expect(sentEmails).toEqual([
      { to: sale.seller.email, subject: `Did you ship ${title(sale)}?` },
      { to: sale.buyer.email, subject: `${title(sale)} hasn't shipped yet` },
    ]);
    expect(await textTo(sale.buyer.email)).toContain("$109");
    expect(await textTo(sale.buyer.email)).toContain("Cancel for a refund");
  });

  it("says nothing once it has shipped", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "shipped", shippedAt: new Date() });
    await after.notifyShipReminder(order.id);
    await after.notifyShipLate(order.id);
    expect(sentEmails).toEqual([]);
  });
});

describe("notifyCancelled", () => {
  it("tells the buyer they're refunded and the seller it's cancelled", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "cancelled", refundedCents: 10_900 });

    await after.notifyCancelled(order.id, "seller");

    expect(sentEmails).toEqual([
      { to: sale.buyer.email, subject: `Refunded: ${title(sale)}` },
      { to: sale.seller.email, subject: `Cancelled: ${title(sale)}` },
    ]);
    expect(await textTo(sale.buyer.email)).toContain("couldn't send it");
    expect(await textTo(sale.seller.email)).toContain("on sale again");
  });

  it("tells the seller the listing is back in drafts when it lapsed", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "cancelled", refundedCents: 10_900 });
    await after.notifyCancelled(order.id, "system");
    expect(await textTo(sale.buyer.email)).toContain("we cancelled it for you");
    expect(await textTo(sale.seller.email)).toContain("back in your drafts");

    clearEmails();
    await after.notifyCancelled(order.id, "buyer");
    expect(await textTo(sale.buyer.email)).toContain("You cancelled it");
  });
});

describe("arrival and payout emails", () => {
  it("asks the buyer whether a shipped order arrived", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(9), status: "shipped", shippedAt: daysAgo(7) });
    await after.notifyArrivalCheck(order.id);
    expect(sentEmails).toEqual([{ to: sale.buyer.email, subject: `Did ${title(sale)} arrive?` }]);
    const text = await textTo(sale.buyer.email);
    expect(text).toContain("It's all good");
    expect(text).toContain("Report a problem");
  });

  it("doesn't ask about an order that hasn't shipped", async () => {
    const sale = await createSale();
    const order = await createOrder(sale);
    await after.notifyArrivalCheck(order.id);
    expect(sentEmails).toEqual([]);
  });

  it("tells the seller what they were paid, after fees and refunds", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "completed", refundedCents: 2_500 });

    await after.notifyPaidOut(order.id);

    expect(sentEmails).toEqual([{ to: sale.seller.email, subject: `You've been paid for ${title(sale)}` }]);
    const text = await textTo(sale.seller.email);
    expect(text).toContain("Refunded to the buyer");
    expect(text).toContain("resell.store fee");
    expect(text).toContain("PayPal fee");
    // 9,471 net less the 2,500 refunded
    expect(text).toContain("69.71");
  });
});

describe("problem emails", () => {
  it("tells the seller when the buyer reports a problem, with what they wrote", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "shipped", shippedAt: daysAgo(2) });
    const d = await disputeWith(order.id, [{ side: "buyer", kind: "opened" }], { details: "The lid is cracked" });

    await after.notifyProblemOpened(d.id);

    expect(sentEmails).toEqual([{ to: sale.seller.email, subject: `Jess reported a problem with ${title(sale)}` }]);
    const text = await textTo(sale.seller.email);
    expect(text).toContain("The lid is cracked");
    expect(text).toContain("arrived damaged");
  });

  it("says a PayPal case was opened when it came from PayPal", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "shipped", shippedAt: daysAgo(2) });
    const d = await disputeWith(order.id, [{ side: "buyer", kind: "opened" }], { source: "paypal" });
    await after.notifyProblemOpened(d.id);
    expect(await textTo(sale.seller.email)).toContain("opened a case in PayPal");
  });

  it("sends each update to the other side", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "shipped", shippedAt: daysAgo(2) });
    const cases: [Parameters<typeof disputeWith>[1][number], string, string][] = [
      [{ side: "seller", kind: "message", body: "Can you send a photo?" }, sale.buyer.email, `${sale.shop.name} replied about ${title(sale)}`],
      [{ side: "buyer", kind: "message", body: "Sure" }, sale.seller.email, `Jess replied about ${title(sale)}`],
      [{ side: "seller", kind: "refund_offered", amountCents: 2_500 }, sale.buyer.email, `${sale.shop.name} offered $25 back`],
      [{ side: "buyer", kind: "offer_declined", amountCents: 2_500 }, sale.seller.email, "Jess turned down your offer"],
      [{ side: "buyer", kind: "closed" }, sale.seller.email, `Sorted: ${title(sale)}`],
    ];
    for (const [e, to, subject] of cases) {
      clearEmails();
      await db.delete(dispute);
      const d = await disputeWith(order.id, [{ side: "buyer", kind: "opened" }, e]);
      await after.notifyProblemUpdate(d.id);
      expect(sentEmails, `${e.side} ${e.kind}`).toEqual([{ to, subject }]);
    }
  });

  it("shows the message itself in a reply", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "shipped", shippedAt: daysAgo(2) });
    const d = await disputeWith(order.id, [{ side: "buyer", kind: "opened" }, { side: "seller", kind: "message", body: "Can you send a photo?" }]);
    await after.notifyProblemUpdate(d.id);
    expect(await textTo(sale.buyer.email)).toContain("Can you send a photo?");
  });

  it("tells only the other side when someone escalates, and both when resell.store steps in", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "shipped", shippedAt: daysAgo(2) });
    const subject = `resell.store is looking at ${title(sale)}`;

    const byBuyer = await disputeWith(order.id, [{ side: "buyer", kind: "opened" }, { side: "buyer", kind: "escalated" }], { status: "escalated" });
    await after.notifyProblemUpdate(byBuyer.id);
    expect(sentEmails).toEqual([{ to: sale.seller.email, subject }]);

    clearEmails();
    await db.delete(dispute);
    const bySweep = await disputeWith(order.id, [{ side: "buyer", kind: "opened" }, { side: "platform", kind: "escalated" }], { status: "escalated" });
    await after.notifyProblemUpdate(bySweep.id);
    expect(sentEmails).toEqual([
      { to: sale.buyer.email, subject },
      { to: sale.seller.email, subject },
    ]);
    expect(await textTo(sale.buyer.email)).toContain("wasn't answered in time");
  });

  it("copies resell.store support on an escalation when SUPPORT_EMAIL is set", async () => {
    vi.stubEnv("SUPPORT_EMAIL", "help@test.dev");
    const sale = await createSale();
    const order = await createOrder(sale, { status: "shipped", shippedAt: daysAgo(2) });
    const d = await disputeWith(order.id, [{ side: "buyer", kind: "opened" }, { side: "seller", kind: "escalated" }], { status: "escalated" });

    await after.notifyProblemUpdate(d.id);

    expect(sentEmails).toEqual([
      { to: sale.buyer.email, subject: `resell.store is looking at ${title(sale)}` },
      { to: "help@test.dev", subject: `Escalated: ${title(sale)} (${order.id})` },
    ]);
  });

  it("sends nothing for events that have their own email, or no events at all", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "shipped", shippedAt: daysAgo(2) });
    const opened = await disputeWith(order.id, [{ side: "buyer", kind: "opened" }], { status: "closed" });
    await after.notifyProblemUpdate(opened.id);
    const refunded = await disputeWith(order.id, [{ side: "seller", kind: "refunded" }], { status: "refunded" });
    await after.notifyProblemUpdate(refunded.id);
    const empty = await disputeWith(order.id, []);
    await after.notifyProblemUpdate(empty.id);
    await after.notifyProblemUpdate("missing");
    expect(sentEmails).toEqual([]);
  });
});

describe("notifyRefunded", () => {
  it("tells both sides about a full refund", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "refunded", refundedCents: 10_900 });
    await after.notifyRefunded(order.id);
    expect(sentEmails).toEqual([
      { to: sale.buyer.email, subject: `Refunded $109: ${title(sale)}` },
      { to: sale.seller.email, subject: "Refunded $109 to Jess" },
    ]);
    expect(await textTo(sale.seller.email)).toContain("Refunded in full");
  });

  it("words a part refund as part of it", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { status: "completed", refundedCents: 2_550 });
    await after.notifyRefunded(order.id);
    expect(emailsTo(sale.buyer.email)).toEqual([`Refunded $25.50: ${title(sale)}`]);
    expect(await textTo(sale.buyer.email)).toContain("Part of it, back to you");
    expect(await textTo(sale.seller.email)).toContain("Part refund sent");
  });
});

describe("test accounts and failures", () => {
  it("only logs mail for @example.com people, and still mails the other side", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const sale = await createSale();
    const { user, eq } = await import("@repo/db");
    await db.update(user).set({ email: "jess@example.com" }).where(eq(user.id, sale.buyer.id));
    const order = await createOrder(sale, { status: "refunded", refundedCents: 10_900 });

    await after.notifyRefunded(order.id);

    expect(sentEmails).toEqual([{ to: sale.seller.email, subject: "Refunded $109 to Jess" }]);
    expect(info).toHaveBeenCalledWith(expect.stringContaining("not sent (test address) to jess@example.com: Refunded $109"));
  });

  it("never throws when sending fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("Resend is down"));
    const sale = await createSale();
    const order = await createOrder(sale, { status: "cancelled", refundedCents: 10_900 });

    await expect(after.notifyCancelled(order.id, "seller")).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith("[email] cancelled failed", expect.any(Error));
  });

  it("does nothing for orders, offers or problems that aren't there", async () => {
    await expect(
      Promise.all([
        after.notifyOfferAnswerReminder("x"),
        after.notifyOfferBuyerReminder("x"),
        after.notifyOfferExpired("x", "open"),
        after.notifyShipReminder("x"),
        after.notifyShipLate("x"),
        after.notifyCancelled("x", "system"),
        after.notifyArrivalCheck("x"),
        after.notifyPaidOut("x"),
        after.notifyProblemOpened("x"),
        after.notifyProblemUpdate("x"),
        after.notifyRefunded("x"),
      ]),
    ).resolves.toBeDefined();
    expect(sentEmails).toEqual([]);
  });
});

describe("notify.ts helpers and commerce emails", () => {
  it("uses the first word of a name, or of the email", () => {
    expect(notify.firstName({ name: "  Jess  Buyer ", email: "j@test.dev" })).toBe("Jess");
    expect(notify.firstName({ name: null, email: "maya.k@test.dev" })).toBe("maya.k");
    expect(notify.firstName({ name: "", email: "sam@test.dev" })).toBe("sam");
  });

  it("makes upload links absolute and leaves full links alone", () => {
    expect(notify.absolute("/api/files/1")).toBe("http://localhost:5689/api/files/1");
    expect(notify.absolute("https://cdn.test/x.png")).toBe("https://cdn.test/x.png");
    expect(notify.absolute(null)).toBeNull();
  });

  it("writes dates as weekday and time", () => {
    expect(notify.when(new Date(2026, 9, 3, 14, 11))).toBe("Saturday, 2:11 pm");
  });

  it("safely logs instead of throwing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(notify.safely("thing", async () => Promise.reject(new Error("nope")))).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith("[email] thing failed", expect.any(Error));
  });

  it("sends the sold, shipped and offer emails to the right people", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, trackingNumber: "1Z999AA10123456784" });
    const o = await createOffer(sale, { status: "countered", counterCents: 9_000 });

    await notify.notifySold(order.id);
    await notify.notifyShipped(order.id);
    await notify.notifyOfferReceived(o.id);
    await notify.notifyOfferAnswered(o.id);

    expect(sentEmails).toEqual([
      { to: sale.seller.email, subject: `Sold! ${title(sale)} for $100` },
      { to: sale.buyer.email, subject: `${title(sale)} is on its way` },
      { to: sale.seller.email, subject: `Jess offered $80 for “${title(sale)}”` },
      { to: sale.buyer.email, subject: `${sale.shop.name} came back with $90` },
    ]);
  });

  it("links UPS tracking numbers to UPS", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { trackingNumber: "1Z999AA10123456784" });
    await notify.notifyShipped(order.id);
    const call = vi.mocked(sendEmail).mock.calls.at(-1)![0];
    expect(await render(call.react)).toContain("https://www.ups.com/track?tracknum=1Z999AA10123456784");
  });

  it("doesn't tell the buyer about an offer that's still open", async () => {
    const sale = await createSale();
    const o = await createOffer(sale);
    await notify.notifyOfferAnswered(o.id);
    expect(sentEmails).toEqual([]);
  });
});
