import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { activity, db } from "@repo/db";
import { resetDb } from "../../../test/db";
import { createListing, createShop, createUser } from "../../../test/factories";

/*
 * The /api/track beacon: always 204, bots and junk ignored, anonymous
 * visitors get an id cookie so their repeat views count once, and the
 * signed-in owner's views don't count. Sign-in is mocked.
 */

const state = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("../../../lib/server/session", () => ({
  getSession: vi.fn(async () => (state.userId ? { user: { id: state.userId } } : null)),
}));

const { POST } = await import("./route");

beforeEach(async () => {
  await resetDb();
  state.userId = null;
});

const browser = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15";

function beacon(body: unknown, opts: { ua?: string; cookie?: string } = {}) {
  return new NextRequest("http://localhost:5689/api/track", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "user-agent": opts.ua ?? browser,
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
  });
}

async function setup() {
  const owner = await createUser();
  const s = await createShop(owner.id, { slug: "maya" });
  const l = await createListing(s.id);
  return { owner, shop: s, listing: l };
}

describe("POST /api/track", () => {
  it("records a view and gives a new visitor an id cookie", async () => {
    const { listing } = await setup();
    const res = await POST(beacon({ kind: "view", listing: listing.id, referrer: "https://www.google.com/" }));
    expect(res.status).toBe(204);
    const vid = res.cookies.get("rs_vid");
    expect(vid?.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(vid).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });

    const [row] = await db.select().from(activity);
    expect(row).toMatchObject({ visitorId: vid!.value, source: "search", listingId: listing.id });
  });

  it("counts a returning visitor's repeat view once, and doesn't reset their cookie", async () => {
    const { listing } = await setup();
    const first = await POST(beacon({ kind: "view", listing: listing.id }, { cookie: "rs_vid=visitor-1" }));
    expect(first.cookies.get("rs_vid")).toBeUndefined();
    await POST(beacon({ kind: "view", listing: listing.id }, { cookie: "rs_vid=visitor-1" }));
    const rows = await db.select().from(activity);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.visitorId).toBe("visitor-1");
  });

  it("ignores bots and link previewers", async () => {
    const { listing } = await setup();
    for (const ua of ["Googlebot/2.1 (+http://www.google.com/bot.html)", "facebookexternalhit/1.1", "curl/8.4.0"]) {
      const res = await POST(beacon({ kind: "view", listing: listing.id }, { ua }));
      expect(res.status).toBe(204);
      expect(res.cookies.get("rs_vid")).toBeUndefined();
    }
    expect(await db.select().from(activity)).toHaveLength(0);
  });

  it("doesn't count the signed-in owner looking at their own listing", async () => {
    const { owner, listing } = await setup();
    state.userId = owner.id;
    expect((await POST(beacon({ kind: "view", listing: listing.id }))).status).toBe(204);
    expect(await db.select().from(activity)).toHaveLength(0);
  });

  it("answers 204 and records nothing for junk", async () => {
    await setup();
    for (const body of ["not json", { kind: "click", shop: "maya" }, { kind: "view" }, { kind: "view", shop: "x".repeat(81) }]) {
      expect((await POST(beacon(body))).status).toBe(204);
    }
    expect(await db.select().from(activity)).toHaveLength(0);
  });

  it("replaces an over-long visitor cookie", async () => {
    await setup();
    const res = await POST(beacon({ kind: "share", shop: "maya" }, { cookie: `rs_vid=${"x".repeat(65)}` }));
    expect(res.cookies.get("rs_vid")?.value).toHaveLength(36);
    expect((await db.select().from(activity))[0]!.kind).toBe("share");
  });
});
