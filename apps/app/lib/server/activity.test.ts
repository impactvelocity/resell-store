import { beforeEach, describe, expect, it } from "vitest";
import { activity, db } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser } from "../../test/factories";
import { createActivity } from "../../test/factories-market";
import { botAgent, classifySource, recordActivity } from "./activity";

/*
 * Recording views and shares for Stats: where a visit came from, one view
 * per visitor per page per 30 minutes, never the owner's own views, nothing
 * for drafts. (Bots are turned away by /api/track, tested next to it.)
 */

beforeEach(async () => {
  await resetDb();
});

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

describe("classifySource", () => {
  const from = (referrer: string | null, tag?: string) => classifySource({ referrer, tag, shopSlug: "maya" });

  it("trusts a ?ref= tag for QR codes and social links", () => {
    expect(from("https://google.com/", "qr")).toBe("qr");
    expect(from(null, " IG ")).toBe("social");
    expect(from(null, "tiktok")).toBe("social");
    // An unknown tag falls through to the referrer
    expect(from("https://www.google.com/", "newsletter")).toBe("search");
  });

  it("is direct without a usable referrer", () => {
    expect(from(null)).toBe("direct");
    expect(from("")).toBe("direct");
    expect(from("not a url")).toBe("direct");
  });

  it("tells this store, the marketplace and other stores apart", () => {
    expect(from("http://maya.localhost:5689/boots")).toBe("store");
    expect(from("http://sam.localhost:5689/")).toBe("marketplace");
    expect(from("http://localhost:5689/discover")).toBe("marketplace");
    expect(from("http://www.localhost:5689/")).toBe("marketplace");
  });

  it("knows search engines and social sites", () => {
    expect(from("https://www.google.com/search?q=boots")).toBe("search");
    expect(from("https://duckduckgo.com/")).toBe("search");
    expect(from("https://l.instagram.com/?u=x")).toBe("social");
    expect(from("https://www.facebook.com/")).toBe("social");
    expect(from("https://t.co/abc")).toBe("social");
    expect(from("https://old.reddit.com/r/x")).toBe("social");
    expect(from("https://someblog.net/post")).toBe("other");
  });
});

describe("botAgent", () => {
  it("spots crawlers and link previewers, not browsers", () => {
    for (const ua of ["Googlebot/2.1", "facebookexternalhit/1.1", "Slackbot-LinkExpanding", "curl/8.0", "python-requests/2", "HeadlessChrome/120", "WhatsApp/2.23"])
      expect(botAgent.test(ua)).toBe(true);
    expect(botAgent.test("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15")).toBe(false);
  });
});

describe("recordActivity", () => {
  async function setup() {
    const owner = await createUser();
    const s = await createShop(owner.id, { slug: "maya" });
    const l = await createListing(s.id);
    return { owner, shop: s, listing: l };
  }
  const view = (over: Partial<Parameters<typeof recordActivity>[0]>) =>
    recordActivity({ kind: "view", visitorId: "v1", userId: null, ...over });

  it("records a listing view with its shop and where it came from", async () => {
    const { shop, listing } = await setup();
    expect(await view({ listingId: listing.id, referrer: "https://www.google.com/" })).toEqual({ recorded: true });
    const [row] = await db.select().from(activity);
    expect(row).toMatchObject({ kind: "view", shopId: shop.id, listingId: listing.id, visitorId: "v1", source: "search" });
  });

  it("records a store page view by slug, with no listing", async () => {
    const { shop } = await setup();
    expect(await view({ shopSlug: "maya" })).toEqual({ recorded: true });
    const [row] = await db.select().from(activity);
    expect(row).toMatchObject({ shopId: shop.id, listingId: null, source: "direct" });
  });

  it("counts one view per visitor per page for 30 minutes", async () => {
    const { listing } = await setup();
    expect((await view({ listingId: listing.id })).recorded).toBe(true);
    expect((await view({ listingId: listing.id })).recorded).toBe(false);
    // Someone else, and the same person on the store page, still count
    expect((await view({ listingId: listing.id, visitorId: "v2" })).recorded).toBe(true);
    expect((await view({ shopSlug: "maya" })).recorded).toBe(true);
    expect((await view({ shopSlug: "maya" })).recorded).toBe(false);
    expect(await db.select().from(activity)).toHaveLength(3);
  });

  it("counts the same visitor again once 30 minutes have passed", async () => {
    const { shop, listing } = await setup();
    await createActivity({ shopId: shop.id, listingId: listing.id, visitorId: "v1", createdAt: minutesAgo(29) });
    expect((await view({ listingId: listing.id })).recorded).toBe(false);

    await resetDb();
    const again = await setup();
    await createActivity({ shopId: again.shop.id, listingId: again.listing.id, visitorId: "v1", createdAt: minutesAgo(31) });
    expect((await view({ listingId: again.listing.id })).recorded).toBe(true);
  });

  it("never counts the owner's own views, but does count their shares", async () => {
    const { owner, listing } = await setup();
    expect((await view({ listingId: listing.id, userId: owner.id })).recorded).toBe(false);
    expect((await view({ shopSlug: "maya", userId: owner.id })).recorded).toBe(false);
    const share = await recordActivity({ kind: "share", listingId: listing.id, visitorId: "v1", userId: owner.id });
    expect(share.recorded).toBe(true);
    const rows = await db.select().from(activity);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "share", source: null });
  });

  it("doesn't dedupe shares", async () => {
    const { listing } = await setup();
    for (let i = 0; i < 3; i++) await recordActivity({ kind: "share", listingId: listing.id, visitorId: "v1", userId: null });
    expect(await db.select().from(activity)).toHaveLength(3);
  });

  it("ignores drafts, unknown listings and shops, and events with no target", async () => {
    const { shop } = await setup();
    const draft = await createListing(shop.id, { status: "draft" });
    expect((await view({ listingId: draft.id })).recorded).toBe(false);
    expect((await view({ listingId: "nope" })).recorded).toBe(false);
    expect((await view({ shopSlug: "nope" })).recorded).toBe(false);
    expect((await view({})).recorded).toBe(false);
    expect(await db.select().from(activity)).toHaveLength(0);
  });

  it("still counts views of a sold listing", async () => {
    const { shop } = await setup();
    const sold = await createListing(shop.id, { status: "sold" });
    expect((await view({ listingId: sold.id })).recorded).toBe(true);
  });
});
