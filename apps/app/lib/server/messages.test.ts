import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, message, thread } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser } from "../../test/factories";
import { createPhoto } from "../../test/factories-market";

/*
 * Buyer and seller conversations: threads, who can write, and the unread
 * maths for each side (including the shop's agent writing on the seller's
 * side and handing a thread over). The agent itself (store-agent.ts),
 * webhooks and after-response work are mocked, so nothing calls a model.
 * The clock is faked (Date only) so every message lands at a distinct time.
 */

const scheduled = vi.hoisted(() => [] as (() => Promise<unknown>)[]);

vi.mock("./store-agent", () => ({ answerBuyer: vi.fn(async () => {}) }));
vi.mock("./later", () => ({ runAfterResponse: vi.fn((fn: () => Promise<unknown>) => void scheduled.push(fn)) }));
vi.mock("./api/webhooks", async (orig) => ({
  ...(await orig<typeof import("./api/webhooks")>()),
  emitQuestion: vi.fn(),
}));

const agent = await import("./store-agent");
const webhooks = await import("./api/webhooks");
const later = await import("./later");
const M = await import("./messages");

let clock = new Date("2026-10-03T10:00:00Z").getTime();
const tick = (minutes = 1) => {
  clock += minutes * 60_000;
  vi.setSystemTime(clock);
};

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  tick();
  await resetDb();
  vi.clearAllMocks();
  scheduled.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

async function setup(shopOverrides: Parameters<typeof createShop>[1] = {}) {
  const seller = await createUser({ name: "Maya Lopez" });
  const buyer = await createUser({ name: "Jess Buyer" });
  const s = await createShop(seller.id, { slug: "maya", name: "Maya's Things", ...shopOverrides });
  const l = await createListing(s.id, { title: "Yellow dutch oven" });
  return { seller, buyer, shop: s, listing: l };
}

async function ask(c: Awaited<ReturnType<typeof setup>>, body = "Is it still available?") {
  tick();
  return M.startConversation({ buyerId: c.buyer.id, shopSlug: "maya", listingId: c.listing.id, body });
}

async function threadRow(id: string) {
  const [row] = await db.select().from(thread).where(eq(thread.id, id));
  return row!;
}

describe("startConversation", () => {
  it("opens a thread about the listing with the buyer's message", async () => {
    const c = await setup();
    const t = await ask(c);
    expect(t).toMatchObject({ buyerId: c.buyer.id, shopId: c.shop.id, listingId: c.listing.id });
    const rows = await db.select().from(message).where(eq(message.threadId, t.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ side: "buyer", authorId: c.buyer.id, byAgent: false, body: "Is it still available?" });
  });

  it("reuses the thread for the same listing, and keeps general questions separate", async () => {
    const c = await setup();
    const first = await ask(c);
    const again = await ask(c, "Also, does it have a lid?");
    expect(again.id).toBe(first.id);

    tick();
    const general = await M.startConversation({ buyerId: c.buyer.id, shopSlug: "maya", body: "Do you ship abroad?" });
    expect(general.id).not.toBe(first.id);
    expect(general.listingId).toBeNull();
    expect(await db.select().from(message).where(eq(message.threadId, first.id))).toHaveLength(2);
  });

  it("drops a listing that belongs to another shop and writes generally", async () => {
    const c = await setup();
    const other = await createShop(c.seller.id, { slug: "other" });
    const theirs = await createListing(other.id);
    const t = await M.startConversation({ buyerId: c.buyer.id, shopSlug: "maya", listingId: theirs.id, body: "Hi" });
    expect(t.listingId).toBeNull();
  });

  it("can't message your own shop, a private one, or one that doesn't exist", async () => {
    const c = await setup();
    await expect(M.startConversation({ buyerId: c.seller.id, shopSlug: "maya", body: "Hi" })).rejects.toThrow("You can't message that shop.");
    await expect(M.startConversation({ buyerId: c.buyer.id, shopSlug: "nope", body: "Hi" })).rejects.toThrow(M.MessageError);
    await createShop(c.seller.id, { slug: "secret", visibility: "private" });
    await expect(M.startConversation({ buyerId: c.buyer.id, shopSlug: "secret", body: "Hi" })).rejects.toThrow("You can't message that shop.");
    expect(await db.select().from(thread)).toHaveLength(0);
  });

  it("checks the message: not empty, not over 2,000 characters, tidied", async () => {
    const c = await setup();
    await expect(ask(c, "   \n ")).rejects.toThrow("Write something first.");
    await expect(ask(c, "x".repeat(M.MAX_MESSAGE + 1))).rejects.toThrow("Keep it under 2,000 characters.");
    expect(await db.select().from(thread)).toHaveLength(0);

    const t = await ask(c, "  Line one\r\nLine two  ");
    const [row] = await db.select().from(message).where(eq(message.threadId, t.id));
    expect(row!.body).toBe("Line one\nLine two");
  });

  it("resolveRecipient names the owner and the listing being asked about", async () => {
    const c = await setup();
    await createPhoto(c.listing.id, { url: "https://x.com/oven.jpg" });
    const to = await M.resolveRecipient({ buyerId: c.buyer.id, shopSlug: "maya", listingId: c.listing.id });
    expect(to).toMatchObject({
      owner: "Maya",
      about: { id: c.listing.id, title: "Yellow dutch oven", photo: "https://x.com/oven.jpg" },
    });
    expect(await M.resolveRecipient({ buyerId: c.seller.id, shopSlug: "maya" })).toBeNull();
  });
});

describe("after a buyer writes", () => {
  it("emits the question webhook and asks the shop's agent to answer, after the response", async () => {
    const c = await setup();
    const t = await ask(c);
    const [row] = await db.select().from(message).where(eq(message.threadId, t.id));
    expect(webhooks.emitQuestion).toHaveBeenCalledWith(row!.id);
    expect(later.runAfterResponse).toHaveBeenCalledTimes(1);
    expect(agent.answerBuyer).not.toHaveBeenCalled();

    await scheduled[0]!();
    expect(agent.answerBuyer).toHaveBeenCalledWith(row!.id);
  });

  it("does neither when the seller or the agent writes", async () => {
    const c = await setup();
    const t = await ask(c);
    vi.clearAllMocks();
    tick();
    await M.sendMessage({ threadId: t.id, userId: c.seller.id, body: "Yes!" });
    tick();
    await M.postAgentMessage(t.id, "It is.", { needsSeller: false });
    expect(webhooks.emitQuestion).not.toHaveBeenCalled();
    expect(later.runAfterResponse).not.toHaveBeenCalled();
  });
});

describe("unread", () => {
  it("is unread for the side that didn't write last, until they read it", async () => {
    const c = await setup();
    const t = await ask(c);
    expect(await M.countUnread(c.seller.id, "seller")).toBe(1);
    expect(await M.countUnread(c.buyer.id, "buyer")).toBe(0);
    expect((await M.listSellerThreads(c.seller.id))[0]).toMatchObject({ unread: true, lastMine: false, withName: "Jess" });
    expect((await M.listBuyerThreads(c.buyer.id))[0]).toMatchObject({ unread: false, lastMine: true, withName: "Maya's Things" });

    tick();
    await M.markRead({ threadId: t.id, userId: c.seller.id });
    expect(await M.countUnread(c.seller.id, "seller")).toBe(0);

    tick();
    await M.sendMessage({ threadId: t.id, userId: c.seller.id, body: "Yes, still here." });
    expect(await M.countUnread(c.buyer.id, "buyer")).toBe(1);
    expect(await M.countUnread(c.seller.id, "seller")).toBe(0);

    tick();
    await M.markRead({ threadId: t.id, userId: c.buyer.id });
    expect(await M.countUnread(c.buyer.id, "buyer")).toBe(0);
    expect((await M.listBuyerThreads(c.buyer.id))[0]!.unread).toBe(false);
  });

  it("comes back when the other side writes again after the read", async () => {
    const c = await setup();
    const t = await ask(c);
    tick();
    await M.markRead({ threadId: t.id, userId: c.seller.id });
    await ask(c, "Hello?");
    expect(await M.countUnread(c.seller.id, "seller")).toBe(1);
  });

  it("counts threads, not messages, across all the seller's shops", async () => {
    const c = await setup();
    await ask(c);
    await ask(c, "And another thing");
    const second = await createShop(c.seller.id, { slug: "second" });
    tick();
    await M.startConversation({ buyerId: c.buyer.id, shopSlug: "second", body: "Hi" });
    expect(await M.countUnread(c.seller.id, "seller")).toBe(2);
    const threads = await M.listSellerThreads(c.seller.id);
    expect(threads.map((t) => t.shop.slug)).toEqual(["second", "maya"]);
    expect(second.id).toBeTruthy();
  });

  it("ignores read marks from people outside the thread", async () => {
    const c = await setup();
    const t = await ask(c);
    const stranger = await createUser();
    await M.markRead({ threadId: t.id, userId: stranger.id });
    expect(await M.countUnread(c.seller.id, "seller")).toBe(1);
  });
});

describe("the shop's agent", () => {
  it("answers on the seller's side: unread for the buyer, and for the seller who hasn't seen it", async () => {
    const c = await setup();
    const t = await ask(c);
    tick();
    const reply = await M.postAgentMessage(t.id, "It's still available.", { needsSeller: false });
    expect(reply).toMatchObject({ side: "seller", authorId: null, byAgent: true });

    expect(await M.countUnread(c.buyer.id, "buyer")).toBe(1);
    expect(await M.countUnread(c.seller.id, "seller")).toBe(1);
    expect((await M.listSellerThreads(c.seller.id))[0]).toMatchObject({ lastByAgent: true, needsYou: false, unread: true, lastMine: true });

    tick();
    await M.markRead({ threadId: t.id, userId: c.seller.id });
    expect(await M.countUnread(c.seller.id, "seller")).toBe(0);
  });

  it("doesn't count as anyone reading", async () => {
    const c = await setup();
    const t = await ask(c);
    const before = await threadRow(t.id);
    tick();
    await M.postAgentMessage(t.id, "Answer", { needsSeller: false });
    const after = await threadRow(t.id);
    expect(after.buyerReadAt).toEqual(before.buyerReadAt);
    expect(after.sellerReadAt).toEqual(before.sellerReadAt);
  });

  it("hands a thread to the seller, who sees it waiting until they write themselves", async () => {
    const c = await setup();
    const t = await ask(c, "Would you take $50?");
    tick();
    await M.postAgentMessage(t.id, "I'll ask Maya.", { needsSeller: true });
    expect((await M.listSellerThreads(c.seller.id))[0]!.needsYou).toBe(true);
    expect((await M.listBuyerThreads(c.buyer.id))[0]!.needsYou).toBe(false);

    // Reading isn't answering
    tick();
    await M.markRead({ threadId: t.id, userId: c.seller.id });
    expect(await M.countUnread(c.seller.id, "seller")).toBe(1);

    // Neither the buyer writing nor another agent answer clears it
    await ask(c, "Any news?");
    tick();
    await M.postAgentMessage(t.id, "Still waiting on Maya.", { needsSeller: false });
    expect((await threadRow(t.id)).needsSeller).toBe(true);

    tick();
    await M.sendMessage({ threadId: t.id, userId: c.seller.id, body: "I can do $55." });
    expect((await threadRow(t.id)).needsSeller).toBe(false);
    expect(await M.countUnread(c.seller.id, "seller")).toBe(0);
  });

  it("refuses an empty agent message", async () => {
    const c = await setup();
    const t = await ask(c);
    await expect(M.postAgentMessage(t.id, "  ", { needsSeller: false })).rejects.toThrow("Write something first.");
  });
});

describe("sendMessage and loadThread", () => {
  it("only lets the buyer and the shop's owner write or read", async () => {
    const c = await setup();
    const t = await ask(c);
    const stranger = await createUser();
    await expect(M.sendMessage({ threadId: t.id, userId: stranger.id, body: "Hi" })).rejects.toThrow("That conversation isn't yours.");
    await expect(M.sendMessage({ threadId: "nope", userId: c.buyer.id, body: "Hi" })).rejects.toThrow(M.MessageError);
    expect(await M.loadThread(t.id, stranger.id)).toBeNull();
  });

  it("shows each side its own messages as mine, oldest first", async () => {
    const c = await setup();
    const t = await ask(c);
    tick();
    await M.postAgentMessage(t.id, "Yes it is.", { needsSeller: false });
    tick();
    await M.sendMessage({ threadId: t.id, userId: c.seller.id, body: "Maya here, happy to help." });

    const buyerView = await M.loadThread(t.id, c.buyer.id);
    expect(buyerView).toMatchObject({ side: "buyer", owner: "Maya", agentOn: false });
    expect(buyerView!.summary).toMatchObject({ id: t.id, withName: "Maya's Things", listing: { id: c.listing.id, title: "Yellow dutch oven" } });
    expect(buyerView!.messages.map((m) => [m.mine, m.byAgent])).toEqual([
      [true, false],
      [false, true],
      [false, false],
    ]);

    const sellerView = await M.loadThread(t.id, c.seller.id);
    expect(sellerView!.side).toBe("seller");
    expect(sellerView!.summary.withName).toBe("Jess");
    expect(sellerView!.messages.map((m) => m.mine)).toEqual([false, true, true]);
  });

  it("keeps the agent off without an Anthropic key, even when the shop wants it", async () => {
    const c = await setup({ answerQuestions: true });
    const t = await ask(c);
    expect((await M.loadThread(t.id, c.buyer.id))!.agentOn).toBe(false);
  });
});

describe("thread previews", () => {
  it("previews the first non-empty line, cut at 140 characters", async () => {
    const c = await setup();
    await ask(c, `\n\n${"word ".repeat(40)}\nsecond line`);
    const [summary] = await M.listBuyerThreads(c.buyer.id);
    expect(summary!.preview).toHaveLength(140);
    expect(summary!.preview.endsWith("…")).toBe(true);

    await ask(c, "Short one\nand more");
    expect((await M.listBuyerThreads(c.buyer.id))[0]!.preview).toBe("Short one");
  });

  it("lists the buyer's threads newest first with the listing's photo", async () => {
    const c = await setup();
    await createPhoto(c.listing.id, { url: "https://x.com/oven.jpg" });
    await ask(c);
    tick();
    const general = await M.startConversation({ buyerId: c.buyer.id, shopSlug: "maya", body: "Hello" });
    const threads = await M.listBuyerThreads(c.buyer.id);
    expect(threads.map((t) => t.id)[0]).toBe(general.id);
    expect(threads[0]!.listing).toBeNull();
    expect(threads[1]!.listing).toMatchObject({ photo: "https://x.com/oven.jpg", slug: c.listing.slug });
    expect(threads[1]!.initial).toBe("M");
  });
});
