import { beforeEach, describe, expect, it } from "vitest";
import { apiKey, apiUsage, db, eq } from "@repo/db";
import { resetDb } from "../../../test/db";
import { createUser } from "../../../test/factories";
import {
  agentScopeChoices,
  allScopes,
  countRequest,
  currentKey,
  currentMonth,
  defaultAgentAskFirst,
  defaultAgentScopes,
  hashToken,
  issueKey,
  maskedKey,
  monthUsage,
  MONTHLY_LIMIT,
  revokeKey,
  setAgentPermissions,
  touchKey,
  verifyToken,
} from "./keys";

/*
 * API keys and agent links: the token is shown once and only its SHA-256 is
 * stored, one live key per kind, scopes and "Ask me first", revoking, and the
 * monthly request counter behind the 10k limit.
 */

beforeEach(async () => {
  await resetDb();
});

describe("issueKey", () => {
  it("returns an rs_live_ token once and stores only its SHA-256 hash", async () => {
    const maya = await createUser();
    const { row, token } = await issueKey({ userId: maya.id, kind: "api", handle: "maya" });

    expect(token).toMatch(/^rs_live_[A-Za-z0-9]{32}$/);
    expect(row.tokenHash).toBe(hashToken(token));
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.start).toBe("rs_live_");
    expect(row.last4).toBe(token.slice(-4));
    expect(row.name).toBe("Secret key");

    // The token itself is nowhere in the stored row
    const [stored] = await db.select().from(apiKey).where(eq(apiKey.id, row.id));
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it("gives a secret key every scope and nothing to ask first", async () => {
    const maya = await createUser();
    const { row } = await issueKey({ userId: maya.id, kind: "api", handle: "maya" });
    expect(row.scopes).toEqual(allScopes);
    expect(row.askFirst).toEqual([]);
  });

  it("makes an agent link from the handle, with the starting scopes and ask-first rules", async () => {
    const maya = await createUser();
    const { row, token } = await issueKey({ userId: maya.id, kind: "agent", handle: "Maya's Closet!" });
    expect(token).toMatch(/^mayascloset-[A-Za-z0-9]{28}$/);
    expect(row.start).toBe("mayascloset-");
    expect(row.name).toBe("Agent link");
    expect(row.scopes).toEqual(defaultAgentScopes);
    expect(row.askFirst).toEqual(defaultAgentAskFirst);
    expect(row.scopes).not.toContain("shops");
    expect(row.scopes).not.toContain("webhooks");
  });

  it("falls back to 'agent' when the handle has no letters or numbers", async () => {
    const maya = await createUser();
    const { token } = await issueKey({ userId: maya.id, kind: "agent", handle: "!!!" });
    expect(token.startsWith("agent-")).toBe(true);
  });

  it("makes different tokens every time", async () => {
    const maya = await createUser();
    const a = await issueKey({ userId: maya.id, kind: "api", handle: "m" });
    const b = await issueKey({ userId: maya.id, kind: "api", handle: "m" });
    expect(a.token).not.toBe(b.token);
  });

  it("revokes the old key of the same kind, and only that kind", async () => {
    const maya = await createUser();
    const first = await issueKey({ userId: maya.id, kind: "api", handle: "m" });
    const agent = await issueKey({ userId: maya.id, kind: "agent", handle: "m" });
    const second = await issueKey({ userId: maya.id, kind: "api", handle: "m" });

    expect(await verifyToken(first.token)).toBeNull();
    expect((await verifyToken(second.token))?.key.id).toBe(second.row.id);
    expect((await verifyToken(agent.token))?.key.id).toBe(agent.row.id);
    expect((await currentKey(maya.id, "api"))?.id).toBe(second.row.id);

    const rows = await db.select().from(apiKey).where(eq(apiKey.userId, maya.id));
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.revokedAt === null)).toHaveLength(2);
  });

  it("keeps the agent link's permissions when it's replaced", async () => {
    const maya = await createUser();
    await issueKey({ userId: maya.id, kind: "agent", handle: "m" });
    await setAgentPermissions(maya.id, ["read", "listings"], ["listings"]);
    const { row } = await issueKey({ userId: maya.id, kind: "agent", handle: "m" });
    expect(row.scopes).toEqual(["read", "listings"]);
    expect(row.askFirst).toEqual(["listings"]);
  });

  it("uses scopes passed in over the old ones", async () => {
    const maya = await createUser();
    const { row } = await issueKey({ userId: maya.id, kind: "api", handle: "m", scopes: ["read"], askFirst: [] });
    expect(row.scopes).toEqual(["read"]);
  });
});

describe("verifyToken", () => {
  it("finds the key and its owner", async () => {
    const maya = await createUser({ name: "Maya Rivera", email: "maya@test.dev" });
    const { token, row } = await issueKey({ userId: maya.id, kind: "api", handle: "m" });
    const found = await verifyToken(token);
    expect(found?.key.id).toBe(row.id);
    expect(found?.user).toEqual({ id: maya.id, name: "Maya Rivera", email: "maya@test.dev" });
  });

  it("rejects unknown, empty and absurdly long tokens", async () => {
    const maya = await createUser();
    const { token } = await issueKey({ userId: maya.id, kind: "api", handle: "m" });
    expect(await verifyToken(token + "x")).toBeNull();
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken("rs_live_" + "a".repeat(300))).toBeNull();
  });

  it("stops working the moment the key is revoked", async () => {
    const maya = await createUser();
    const { token } = await issueKey({ userId: maya.id, kind: "agent", handle: "m" });
    expect(await verifyToken(token)).not.toBeNull();
    await revokeKey(maya.id, "agent");
    expect(await verifyToken(token)).toBeNull();
    expect(await currentKey(maya.id, "agent")).toBeNull();
  });

  it("doesn't let one person's revoke touch another's key", async () => {
    const maya = await createUser();
    const jess = await createUser();
    const { token } = await issueKey({ userId: jess.id, kind: "api", handle: "j" });
    await revokeKey(maya.id, "api");
    expect(await verifyToken(token)).not.toBeNull();
  });
});

describe("setAgentPermissions", () => {
  it("keeps only scopes an agent link may have", async () => {
    const maya = await createUser();
    await issueKey({ userId: maya.id, kind: "agent", handle: "m" });
    const row = await setAgentPermissions(maya.id, ["read", "shops", "webhooks", "offers"], []);
    expect(row?.scopes).toEqual(["read", "offers"]);
    for (const s of row!.scopes) expect(agentScopeChoices).toContain(s);
  });

  it("only asks first about scopes it has, and never about reading", async () => {
    const maya = await createUser();
    await issueKey({ userId: maya.id, kind: "agent", handle: "m" });
    const row = await setAgentPermissions(maya.id, ["read", "offers", "listings"], ["read", "offers", "buying"]);
    expect(row?.askFirst).toEqual(["offers"]);
  });

  it("does nothing to a secret key, and returns null without an agent link", async () => {
    const maya = await createUser();
    const { row: apiRow } = await issueKey({ userId: maya.id, kind: "api", handle: "m" });
    expect(await setAgentPermissions(maya.id, ["read"], [])).toBeNull();
    const [still] = await db.select().from(apiKey).where(eq(apiKey.id, apiRow.id));
    expect(still!.scopes).toEqual(allScopes);
  });
});

describe("monthly usage", () => {
  it("counts each request against this month and returns the running total", async () => {
    const maya = await createUser();
    expect(await monthUsage(maya.id)).toBe(0);
    expect(await countRequest(maya.id)).toBe(1);
    expect(await countRequest(maya.id)).toBe(2);
    expect(await countRequest(maya.id)).toBe(3);
    expect(await monthUsage(maya.id)).toBe(3);

    const rows = await db.select().from(apiUsage).where(eq(apiUsage.userId, maya.id));
    expect(rows).toEqual([{ userId: maya.id, month: currentMonth(), requests: 3 }]);
  });

  it("keeps people's counts apart and starts over each month", async () => {
    const maya = await createUser();
    const jess = await createUser();
    await db.insert(apiUsage).values({ userId: maya.id, month: "2020-01", requests: 9_999 });
    await countRequest(maya.id);
    await countRequest(jess.id);
    expect(await monthUsage(maya.id)).toBe(1);
    expect(await monthUsage(jess.id)).toBe(1);
  });

  it("names the month in UTC as YYYY-MM", () => {
    expect(currentMonth(new Date("2026-10-31T23:59:59Z"))).toBe("2026-10");
    expect(currentMonth(new Date("2026-11-01T00:00:00Z"))).toBe("2026-11");
  });

  it("allows 10,000 requests a month", () => {
    expect(MONTHLY_LIMIT).toBe(10_000);
  });
});

describe("touchKey", () => {
  it("marks the key used, at most once a minute", async () => {
    const maya = await createUser();
    const { row } = await issueKey({ userId: maya.id, kind: "api", handle: "m" });
    expect(row.lastUsedAt).toBeNull();

    await touchKey(row.id);
    const [first] = await db.select().from(apiKey).where(eq(apiKey.id, row.id));
    expect(first!.lastUsedAt).toBeInstanceOf(Date);

    await touchKey(row.id);
    const [second] = await db.select().from(apiKey).where(eq(apiKey.id, row.id));
    expect(second!.lastUsedAt!.getTime()).toBe(first!.lastUsedAt!.getTime());

    await db.update(apiKey).set({ lastUsedAt: new Date(Date.now() - 2 * 60_000) }).where(eq(apiKey.id, row.id));
    await touchKey(row.id);
    const [third] = await db.select().from(apiKey).where(eq(apiKey.id, row.id));
    expect(third!.lastUsedAt!.getTime()).toBeGreaterThan(Date.now() - 10_000);
  });
});

describe("maskedKey", () => {
  it("shows the start and last four, never the secret", () => {
    expect(maskedKey({ start: "rs_live_", last4: "9fQa" })).toBe(`rs_live_${"•".repeat(16)}9fQa`);
    expect(maskedKey({ start: "maya-", last4: "abcd" })).toBe(`maya-${"•".repeat(6)}abcd`);
  });
});
