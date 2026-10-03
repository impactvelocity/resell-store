import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiActivity, apiClient, db, eq } from "@repo/db";
import { resetDb } from "../../../test/db";
import { api, createKey } from "../../../test/factories-api";
import { createSale, createUser } from "../../../test/factories";

/*
 * The owner's view of what keys did (D2): plain-words lines for changes,
 * never for reads, the app's name from the MCP server or the user agent,
 * "asked you first", refused attempts, which apps use the link, and the
 * per-key spending ceiling an agent link can't go past (P7).
 */

// Run after-response work straight away so the log is written before we look
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const log = await import("./log");

const settle = () => new Promise((r) => setTimeout(r, 100));
const activityOf = (userId: string) => db.select().from(apiActivity).where(eq(apiActivity.userId, userId));

beforeEach(async () => {
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("clientLabel", () => {
  const label = (h: Record<string, string>) => log.clientLabel(new Headers(h));

  it("names apps from what the MCP server passes on", () => {
    expect(label({ "resell-client": "claude-ai" })).toBe("Claude");
    expect(label({ "resell-client": "claude-code" })).toBe("Claude Code");
    expect(label({ "resell-client": "openai-mcp" })).toBe("ChatGPT");
    expect(label({ "resell-client": "cursor-vscode" })).toBe("Cursor");
  });

  it("falls back to the connecting app's user agent, then the caller's", () => {
    expect(label({ "user-agent": "resell-mcp-hosted", "resell-client-agent": "Claude-User" })).toBe("Claude");
    expect(label({ "user-agent": "openai-mcp/1.0" })).toBe("ChatGPT");
    expect(label({ "user-agent": "curl/8.7.1" })).toBe("A script");
  });

  it("keeps an unknown app's own name, and says nothing when there's nothing to go on", () => {
    expect(label({ "resell-client": "Shopping Pal" })).toBe("Shopping Pal");
    expect(label({ "user-agent": "resell-mcp-hosted" })).toBeNull();
    expect(label({})).toBeNull();
  });
});

describe("activity", () => {
  it("writes a line for an offer made with an agent link, naming the app and that it asked first", async () => {
    const sale = await createSale();
    const { token } = await createKey(sale.buyer.id, { kind: "agent" });
    const res = await api("POST", "/offers", {
      token,
      json: { listing: sale.listing.id, amount: 80 },
      headers: { "resell-client": "claude-ai", "resell-tool": "make_offer", "resell-asked-first": "1" },
    });
    expect(res.status).toBe(201);
    await settle();
    const [row] = await activityOf(sale.buyer.id);
    expect(row).toMatchObject({
      keyKind: "agent",
      client: "Claude",
      action: "POST /offers",
      askedFirst: true,
      ok: true,
    });
    expect(row!.text).toMatch(/^Offered \$80 on "/);
  });

  it("doesn't keep reads", async () => {
    const user = await createUser();
    const { token } = await createKey(user.id, { kind: "agent" });
    await api("GET", "/me", { token });
    await api("GET", "/offers?role=buyer", { token });
    await settle();
    expect(await activityOf(user.id)).toHaveLength(0);
  });

  it("writes what it tried when the link isn't allowed to", async () => {
    const sale = await createSale();
    const { token } = await createKey(sale.seller.id, { kind: "agent", scopes: ["read"] });
    const res = await api("POST", `/listings/${sale.listing.id}/unpublish`, { token });
    expect(res.status).toBe(403);
    await settle();
    const [row] = await activityOf(sale.seller.id);
    expect(row).toMatchObject({ ok: false, text: "Tried to take a listing down" });
  });

  it("describes the change from what the API returned, and links to it", async () => {
    const sale = await createSale({ listing: { title: "Yellow dutch oven" } });
    const { token } = await createKey(sale.seller.id, { kind: "agent" });
    await api("POST", `/listings/${sale.listing.id}/unpublish`, { token });
    await settle();
    const [row] = await activityOf(sale.seller.id);
    expect(row).toMatchObject({ text: 'Took down "Yellow dutch oven"', href: `/listings/${sale.listing.id}` });
  });

  it("lists recent lines newest first, per kind of key", async () => {
    const sale = await createSale();
    const agent = await createKey(sale.seller.id, { kind: "agent" });
    const script = await createKey(sale.seller.id, { kind: "api" });
    await api("POST", `/listings/${sale.listing.id}/unpublish`, { token: agent.token });
    await api("POST", `/listings/${sale.listing.id}/publish`, { token: script.token });
    await settle();
    const lines = await log.recentActivity(sale.seller.id, "agent");
    expect(lines).toHaveLength(1);
    expect(lines[0]!.action).toBe("POST /listings/:id/unpublish");
  });

  it("drops lines older than 90 days", async () => {
    const sale = await createSale();
    const { token } = await createKey(sale.seller.id, { kind: "agent" });
    await api("POST", `/listings/${sale.listing.id}/unpublish`, { token });
    await settle();
    expect(await log.pruneActivity(new Date(Date.now() + 91 * 86_400_000))).toBe(1);
    expect(await activityOf(sale.seller.id)).toHaveLength(0);
  });
});

describe("apps using a link", () => {
  it("notes each app once, with when it was last seen", async () => {
    const user = await createUser();
    const { token, row } = await createKey(user.id, { kind: "agent" });
    await api("GET", "/me", { token, headers: { "resell-client": "claude-ai" } });
    await api("GET", "/me", { token, headers: { "resell-client": "claude-ai" } });
    await api("GET", "/me", { token, headers: { "user-agent": "openai-mcp/1.0" } });
    await api("GET", "/me", { token, headers: { "user-agent": "resell-mcp-hosted" } });
    await settle();
    const apps = await db.select().from(apiClient).where(eq(apiClient.keyId, row.id));
    expect(apps.map((a) => a.client).sort()).toEqual(["An AI app", "ChatGPT", "Claude"]);
    expect((await log.keyClients(row.id)).length).toBe(3);
  });
});

describe("the spending ceiling (P7)", () => {
  it("stops an agent link offering more than its ceiling, and says why", async () => {
    const sale = await createSale();
    const { token, row } = await createKey(sale.buyer.id, { kind: "agent" });
    expect(row.maxOfferCents).toBe(20_000);
    const { setShoppingRules } = await import("./keys");
    await setShoppingRules(sale.buyer.id, { maxOfferCents: 5_000, offersOnOwn: true });
    const over = await api("POST", "/offers", { token, json: { listing: sale.listing.id, amount: 80 } });
    expect(over.status).toBe(403);
    expect(over.body.error.message).toMatch(/\$50/);
    const under = await api("POST", "/offers", { token, json: { listing: sale.listing.id, amount: 45 } });
    expect(under.status).toBe(201);
  });

  it("doesn't apply to secret keys", async () => {
    const sale = await createSale();
    const { token, row } = await createKey(sale.buyer.id, { kind: "api" });
    expect(row.maxOfferCents).toBeNull();
    const res = await api("POST", "/offers", { token, json: { listing: sale.listing.id, amount: 95 } });
    expect(res.status).toBe(201);
  });

  it("switches offers between on its own and ask first, keeping shopping on", async () => {
    const user = await createUser();
    await createKey(user.id, { kind: "agent", scopes: ["read"], askFirst: [] });
    const { setShoppingRules } = await import("./keys");
    const asks = await setShoppingRules(user.id, { maxOfferCents: null, offersOnOwn: false });
    expect(asks).toMatchObject({ maxOfferCents: null });
    expect(asks!.scopes).toContain("buying");
    expect(asks!.askFirst).toContain("buying");
    const own = await setShoppingRules(user.id, { maxOfferCents: 10_000, offersOnOwn: true });
    expect(own!.askFirst).not.toContain("buying");
  });

  it("is kept when a new link replaces the old one", async () => {
    const user = await createUser();
    await createKey(user.id, { kind: "agent" });
    const { setShoppingRules } = await import("./keys");
    await setShoppingRules(user.id, { maxOfferCents: null, offersOnOwn: true });
    const { row } = await createKey(user.id, { kind: "agent" });
    expect(row.maxOfferCents).toBeNull();
  });
});
