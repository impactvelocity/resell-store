import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, listing } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser, daysAgo } from "../../test/factories";
import { axis, createFollow, createPhoto } from "../../test/factories-market";

/*
 * The public marketplace: who can see which shops and listings, the store
 * pages, buying by id or slug, and search. Search is text-only in tests
 * (no Jina key); one block switches a mocked Jina on to check the hybrid
 * path and its quiet fallback.
 */

const state = vi.hoisted(() => ({
  embeddings: false,
  user: null as null | { id: string; name: string; email: string },
}));

vi.mock("./session", () => ({
  getSession: vi.fn(async () => null),
  getCurrentUser: vi.fn(async () => state.user),
  requireUser: vi.fn(async () => state.user),
}));

vi.mock("./embeddings", async (orig) => ({
  ...(await orig<typeof import("./embeddings")>()),
  get embeddingsConfigured() {
    return state.embeddings;
  },
  embed: vi.fn(),
  embedQuery: vi.fn(),
}));

const embeddings = await import("./embeddings");
const M = await import("./market");

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  state.embeddings = false;
  state.user = null;
});

async function seller(shop: Parameters<typeof createShop>[1] = {}, name = "Maya Lopez") {
  const owner = await createUser({ name });
  const s = await createShop(owner.id, shop);
  return { owner, shop: s };
}

describe("publicViewer", () => {
  it("is null signed out, else a first name and initial", async () => {
    expect(await M.publicViewer()).toBeNull();
    state.user = { id: "u1", name: "maya lopez", email: "m@test.dev" };
    expect(await M.publicViewer()).toEqual({ id: "u1", firstName: "maya", initial: "M" });
    state.user = { id: "u2", name: " ", email: "sam.k@test.dev" };
    expect(await M.publicViewer()).toEqual({ id: "u2", firstName: "sam.k", initial: "S" });
  });
});

describe("parseCategory", () => {
  it("matches a chip name in any case", () => {
    expect(M.parseCategory("shoes")).toBe("Shoes");
    expect(M.parseCategory("HOME")).toBe("Home");
    expect(M.parseCategory("Hats")).toBeNull();
    expect(M.parseCategory(null)).toBeNull();
  });
});

describe("toPublicListing and toPublicStore", () => {
  it("maps a listing onto a card", async () => {
    const { shop } = await seller({ name: "maya's", tone: "leaf" });
    const row = await createListing(shop.id, { category: "Kitchenware", priceCents: 4_550, shippingCents: 0, oneLiner: "Cooks well" });
    const card = M.toPublicListing(row, shop, "/api/files/p");
    expect(card).toMatchObject({
      id: row.id,
      store: shop.slug,
      price: 45.5,
      shipping: 0,
      photo: "/api/files/p",
      short: "Cooks well",
      category: "Home",
      openToOffers: true,
      sold: false,
      justListed: true,
      seller: { name: "maya's", initial: "M", tone: "forest" },
    });
  });

  it("isn't just listed after two days, or open to offers once sold", async () => {
    const { shop } = await seller();
    const old = await createListing(shop.id, { publishedAt: daysAgo(3) });
    expect(M.toPublicListing(old, shop).justListed).toBe(false);
    const sold = await createListing(shop.id, { status: "sold" });
    expect(M.toPublicListing(sold, shop)).toMatchObject({ sold: true, openToOffers: false, justListed: false });
    const noCategory = await createListing(shop.id, { category: null });
    expect(M.toPublicListing(noCategory, shop).category).toBe("Everything else");
    const odd = await createListing(shop.id, { category: "Musical instruments" });
    expect(M.toPublicListing(odd, shop).category).toBe("Musical instruments");
  });

  it("gives a store a one-line tagline from its about", async () => {
    const { shop } = await seller({
      about: "Vintage cookware from my grandmother's kitchen and beyond, all tested and cleaned with care! More soon.",
      location: " Portland ",
    });
    const store = M.toPublicStore(shop, { name: "Maya Lopez", email: "m@test.dev" }, { forSale: 3, sold: 1 });
    expect(store.tagline.endsWith("…")).toBe(true);
    expect(store.tagline.length).toBeLessThanOrEqual(68);
    expect(store).toMatchObject({ owner: "Maya", location: "Portland", forSale: 3, sold: 1, live: true, paused: false });

    const short = M.toPublicStore({ ...shop, about: "Old records. Lots of them." }, { name: "", email: "dj@x.dev" }, { forSale: 0, sold: 0 });
    expect(short).toMatchObject({ tagline: "Old records", owner: "dj" });
    const empty = M.toPublicStore({ ...shop, about: null, category: null }, { name: "M", email: "m@x" }, { forSale: 0, sold: 0 });
    expect(empty.tagline).toBe("New on resell.store");
  });
});

describe("who sees what in discovery", () => {
  async function world() {
    const pub = await seller({ slug: "pub" });
    const link = await seller({ slug: "link", visibility: "link" });
    const priv = await seller({ slug: "priv", visibility: "private" });
    const paused = await seller({ slug: "paused", paused: true });
    for (const s of [pub, link, priv, paused]) await createListing(s.shop.id, { title: `${s.shop.slug} lamp` });
    // Only these are listed on the public shop
    await createListing(pub.shop.id, { title: "pub second lamp" });
    await createListing(pub.shop.id, { title: "pub link-only lamp", visibility: "link" });
    await createListing(pub.shop.id, { title: "pub draft lamp", status: "draft", slug: null });
    await createListing(pub.shop.id, { title: "pub sold lamp", status: "sold" });
    await createListing(pub.shop.id, { title: "pub unpriced lamp", priceCents: null });
    return { pub, link, priv, paused };
  }

  it("counts only live, listed things in public, open shops", async () => {
    await world();
    expect(await M.marketCounts()).toEqual({ things: 2, stores: 1 });
  });

  it("lists only public, unpaused stores", async () => {
    await world();
    const busy = await seller({ slug: "busy" });
    for (let i = 0; i < 3; i++) await createListing(busy.shop.id);
    const stores = await M.listStores();
    expect(stores.map((s) => s.slug)).toEqual(["busy", "pub"]);
    expect((await M.listStores({ limit: 1 })).map((s) => s.slug)).toEqual(["busy"]);
  });

  it("counts a store's for sale as what's on its shelf (no unpriced listings)", async () => {
    const { pub } = await world();
    const [store] = await M.listStores();
    expect(store).toMatchObject({ slug: "pub", forSale: 2, sold: 1 });
    expect(await M.storeShelf(pub.shop)).toHaveLength(2);
    expect((await M.getPublicStore("pub"))!.store.forSale).toBe(2);
  });

  it("browses only what's listed, newest first", async () => {
    await world();
    const result = await M.searchListings({});
    expect(result.listings.map((l) => l.title)).toEqual(["pub second lamp", "pub lamp"]);
    expect(result).toMatchObject({ total: 2, stores: 1, semantic: false });
  });
});

describe("getPublicStore", () => {
  it("shows public and link shops to everyone, private ones only to the owner", async () => {
    const pub = await seller({ slug: "pub" });
    await seller({ slug: "link", visibility: "link" });
    const priv = await seller({ slug: "priv", visibility: "private" });
    const paused = await seller({ slug: "paused", paused: true });

    expect((await M.getPublicStore("pub"))!.store.slug).toBe("pub");
    expect(await M.getPublicStore("link")).not.toBeNull();
    expect(await M.getPublicStore("priv")).toBeNull();
    expect(await M.getPublicStore("priv", pub.owner.id)).toBeNull();
    expect((await M.getPublicStore("priv", priv.owner.id))!.isOwner).toBe(true);
    expect(await M.getPublicStore("nope")).toBeNull();
    // A paused shop's page stays up and says it's paused
    expect((await M.getPublicStore("paused"))!.store.paused).toBe(true);
    expect(paused.shop.paused).toBe(true);
  });

  it("reads the slug case-insensitively and counts for sale and sold", async () => {
    const { shop } = await seller({ slug: "maya" });
    await createListing(shop.id);
    await createListing(shop.id, { visibility: "link" });
    await createListing(shop.id, { status: "sold" });
    const found = await M.getPublicStore("MAYA");
    expect(found!.store).toMatchObject({ forSale: 1, sold: 1 });
  });

  it("knows whether the viewer follows it; owners and signed-out never do", async () => {
    const { owner, shop } = await seller({ slug: "maya" });
    const fan = await createUser();
    await createFollow(fan.id, shop.id);
    expect((await M.getPublicStore("maya", fan.id))!.following).toBe(true);
    expect((await M.getPublicStore("maya", (await createUser()).id))!.following).toBe(false);
    expect((await M.getPublicStore("maya"))!.following).toBe(false);
    expect((await M.getPublicStore("maya", owner.id))!).toMatchObject({ following: false, isOwner: true });
  });
});

describe("storeShelf and storeSold", () => {
  it("puts listed things on the shelf, newest first, with covers", async () => {
    const { shop } = await seller();
    const old = await createListing(shop.id, { title: "Old", publishedAt: daysAgo(5) });
    const fresh = await createListing(shop.id, { title: "Fresh", publishedAt: daysAgo(1) });
    await createListing(shop.id, { title: "Link only", visibility: "link" });
    await createListing(shop.id, { title: "Sold", status: "sold" });
    await createPhoto(fresh.id, { url: "https://x.com/f.jpg" });

    const shelf = await M.storeShelf(shop);
    expect(shelf.map((l) => l.title)).toEqual(["Fresh", "Old"]);
    expect(shelf[0]!.photo).toBe("https://x.com/f.jpg");
    expect((await M.storeShelf(shop, { exclude: fresh.id })).map((l) => l.id)).toEqual([old.id]);
    expect(await M.storeShelf(shop, { limit: 1 })).toHaveLength(1);
  });

  it("lists what sold, newest first, with when", async () => {
    const { shop } = await seller();
    await createListing(shop.id, { title: "Earlier", status: "sold", soldAt: daysAgo(10) });
    await createListing(shop.id, { title: "Today", status: "sold", soldAt: new Date(), priceCents: 2_500 });
    await createListing(shop.id, { title: "Still live" });
    const sold = await M.storeSold(shop);
    expect(sold.map((s) => [s.title, s.when])).toEqual([
      ["Today", "today"],
      ["Earlier", "last week"],
    ]);
    expect(sold[0]!.price).toBe(25);
  });
});

describe("getPublicListing", () => {
  it("shows live listings, listed or link-only, and sold ones read-only", async () => {
    const { shop } = await seller({ slug: "maya" });
    await createListing(shop.id, { slug: "listed" });
    await createListing(shop.id, { slug: "by-link", visibility: "link" });
    await createListing(shop.id, { slug: "gone", status: "sold" });

    expect((await M.getPublicListing("maya", "listed"))!.listing.slug).toBe("listed");
    expect(await M.getPublicListing("maya", "by-link")).not.toBeNull();
    expect((await M.getPublicListing("maya", "gone"))!.listing.sold).toBe(true);
    expect(await M.getPublicListing("maya", "nope")).toBeNull();
    expect(await M.getPublicListing("other", "listed")).toBeNull();
  });

  it("shows a draft with a path only to its owner", async () => {
    const { owner, shop } = await seller({ slug: "maya" });
    await createListing(shop.id, { slug: "draft", status: "draft" });
    expect(await M.getPublicListing("maya", "draft")).toBeNull();
    expect(await M.getPublicListing("maya", "draft", (await createUser()).id)).toBeNull();
    expect(await M.getPublicListing("maya", "draft", owner.id)).not.toBeNull();
  });

  it("hides everything in a private shop from visitors", async () => {
    const { owner, shop } = await seller({ slug: "secret", visibility: "private" });
    await createListing(shop.id, { slug: "lamp" });
    expect(await M.getPublicListing("secret", "lamp")).toBeNull();
    expect(await M.getPublicListing("secret", "lamp", owner.id)).not.toBeNull();
  });
});

describe("findBuyableListing", () => {
  it("finds a live listing by id, or by a slug only one live listing has", async () => {
    const a = await seller({ slug: "a" });
    const b = await seller({ slug: "b" });
    const lamp = await createListing(a.shop.id, { slug: "lamp" });
    await createListing(a.shop.id, { slug: "chair" });
    await createListing(b.shop.id, { slug: "chair" });

    expect((await M.findBuyableListing(lamp.id))!.listing.id).toBe(lamp.id);
    expect((await M.findBuyableListing("lamp"))!.store.slug).toBe("a");
    // Two stores use "chair": ambiguous, so nothing
    expect(await M.findBuyableListing("chair")).toBeNull();
    expect(await M.findBuyableListing("nope")).toBeNull();
  });

  it("can't buy sold, draft or private-shop listings; link shops are fine", async () => {
    const { shop } = await seller({ slug: "a" });
    const sold = await createListing(shop.id, { status: "sold" });
    const draft = await createListing(shop.id, { status: "draft" });
    const priv = await seller({ slug: "p", visibility: "private" });
    const hidden = await createListing(priv.shop.id);
    const link = await seller({ slug: "l", visibility: "link" });
    const byLink = await createListing(link.shop.id);

    expect(await M.findBuyableListing(sold.id)).toBeNull();
    expect(await M.findBuyableListing(draft.id)).toBeNull();
    expect(await M.findBuyableListing(hidden.id)).toBeNull();
    expect(await M.findBuyableListing(byLink.id)).not.toBeNull();
  });

  it("can't buy from a paused shop (its page says things can't be bought for now)", async () => {
    const { shop } = await seller({ slug: "resting", paused: true });
    const l = await createListing(shop.id, { slug: "lamp" });
    expect(await M.findBuyableListing(l.id)).toBeNull();
    expect(await M.findBuyableListing("lamp")).toBeNull();
  });

  it("buys by id even when the id is also another listing's slug", async () => {
    const { shop } = await seller({ slug: "a" });
    const target = await createListing(shop.id);
    await createListing(shop.id, { slug: target.id });
    expect((await M.findBuyableListing(target.id))!.listing.id).toBe(target.id);
  });
});

describe("listingDetail", () => {
  it("builds the long-form page from what the seller wrote", async () => {
    const { shop } = await seller({ location: "Portland" });
    const row = await createListing(shop.id, {
      oneLiner: "Cooks like a dream",
      description: "First paragraph.\n\n  Second paragraph.  \n\n",
      category: "Kitchenware",
      fields: [
        { key: "brand", label: "Brand", value: " Le Creuset ", source: "agent" },
        { key: "size", label: "Size", value: "  ", source: "agent" },
      ],
      takeOffers: false,
    });
    const store = M.toPublicStore(shop, { name: "Maya", email: "m@x" }, { forSale: 1, sold: 0 });
    const detail = await M.listingDetail(row, store);
    expect(detail.subtitle).toBe("Cooks like a dream");
    expect(detail.description).toEqual(["First paragraph.", "Second paragraph."]);
    expect(detail.photos).toEqual([{ caption: "" }]);
    expect(detail.details).toEqual([
      { label: "Brand", value: "Le Creuset", essential: true },
      { label: "Category", value: "Kitchenware" },
      { label: "Ships from", value: "Portland" },
      { label: "Offers", value: "Price is firm" },
    ]);
    expect(detail.listedNote).toBe("Listed today.");
    expect(detail.pickup).toBe(false);
  });

  it("fills the gaps for a bare draft with free shipping", async () => {
    const { shop } = await seller({ location: "Portland" });
    const row = await createListing(shop.id, { description: null, publishedAt: null, shippingCents: 0, status: "draft" });
    await createPhoto(row.id, { url: "https://x.com/a.jpg", alt: "Front" });
    const store = M.toPublicStore(shop, { name: "Maya", email: "m@x" }, { forSale: 0, sold: 0 });
    const detail = await M.listingDetail(row, store);
    expect(detail.description[0]).toContain("Maya hasn't written about this one yet");
    expect(detail.photos).toEqual([{ url: "https://x.com/a.jpg", video: false, caption: "Front" }]);
    expect(detail.listedNote).toBe("Not listed yet. Only you can see this.");
    expect(detail.pickup).toBe(true);
    expect(detail.details).toContainEqual({ label: "Pickup in", value: "Portland" });
    expect(detail.details).toContainEqual({ label: "Offers", value: "Welcome" });
  });

  it("dates an older listing", async () => {
    const { shop } = await seller();
    const row = await createListing(shop.id, { publishedAt: new Date(2026, 6, 4, 12) });
    const store = M.toPublicStore(shop, { name: "Maya", email: "m@x" }, { forSale: 0, sold: 0 });
    expect((await M.listingDetail(row, store)).listedNote).toBe("Listed on July 4.");
  });
});

describe("searchListings without Jina", () => {
  async function catalogue() {
    const maya = await seller({ slug: "maya", name: "Second Shutter" });
    const sam = await seller({ slug: "sam", name: "Sam's Kitchen" });
    const oven = await createListing(sam.shop.id, {
      title: "Yellow Le Creuset dutch oven",
      category: "Kitchenware",
      priceCents: 18_000,
      publishedAt: daysAgo(2),
    });
    const boots = await createListing(maya.shop.id, {
      title: "Leather ankle boots",
      category: "Shoes",
      priceCents: 2_000,
      takeOffers: false,
      publishedAt: daysAgo(1),
    });
    const camera = await createListing(maya.shop.id, {
      title: "Film camera",
      description: "A lovely old camera, tested with a roll of film.",
      category: "Cameras",
      priceCents: 6_000,
      publishedAt: daysAgo(3),
    });
    return { maya, sam, oven, boots, camera };
  }

  it("finds things by their words and never asks Jina", async () => {
    const { oven } = await catalogue();
    const result = await M.searchListings({ q: "dutch ovens" });
    expect(result.listings.map((l) => l.id)).toEqual([oven.id]);
    expect(result).toMatchObject({ total: 1, stores: 1, semantic: false });
    expect(embeddings.embedQuery).not.toHaveBeenCalled();
  });

  it("matches a store's name too", async () => {
    const { boots, camera } = await catalogue();
    const result = await M.searchListings({ q: "second shutter" });
    expect(result.listings.map((l) => l.id).sort()).toEqual([boots.id, camera.id].sort());
  });

  it("returns nothing for no match, and copes with search syntax and wildcards", async () => {
    const { oven } = await catalogue();
    expect(await M.searchListings({ q: "submarine" })).toEqual({ listings: [], total: 0, stores: 0, semantic: false });
    expect((await M.searchListings({ q: '"dutch oven" -cast' })).listings.map((l) => l.id)).toEqual([oven.id]);
    // A bare % is a literal, not "match every store name"
    expect((await M.searchListings({ q: "%" })).total).toBe(0);
    expect((await M.searchListings({ q: "_" })).total).toBe(0);
  });

  it("filters by category words, price bucket and offers", async () => {
    const { oven, boots, camera } = await catalogue();
    expect((await M.searchListings({ category: "Home" })).listings.map((l) => l.id)).toEqual([oven.id]);
    expect((await M.searchListings({ category: "Tech" })).listings.map((l) => l.id)).toEqual([camera.id]);
    expect((await M.searchListings({ price: "under-25" })).listings.map((l) => l.id)).toEqual([boots.id]);
    expect((await M.searchListings({ price: "25-100" })).listings.map((l) => l.id)).toEqual([camera.id]);
    expect((await M.searchListings({ price: "over-100" })).listings.map((l) => l.id)).toEqual([oven.id]);
    expect((await M.searchListings({ offers: true })).total).toBe(2);
  });

  it("sorts by price or date and pages", async () => {
    const { oven, boots, camera } = await catalogue();
    expect((await M.searchListings({ sort: "price-asc" })).listings.map((l) => l.id)).toEqual([boots.id, camera.id, oven.id]);
    expect((await M.searchListings({ sort: "price-desc" })).listings.map((l) => l.id)).toEqual([oven.id, camera.id, boots.id]);
    const page = await M.searchListings({ sort: "newest", offset: 1, limit: 1 });
    expect(page.listings.map((l) => l.id)).toEqual([oven.id]);
    expect(page.total).toBe(3);
  });

  it("re-sorts text matches by price when asked", async () => {
    const { boots, camera } = await catalogue();
    const result = await M.searchListings({ q: "second shutter", sort: "price-desc" });
    expect(result.listings.map((l) => l.id)).toEqual([camera.id, boots.id]);
    const paged = await M.searchListings({ q: "second shutter", sort: "price-desc", offset: 1, limit: 1 });
    expect(paged.listings.map((l) => l.id)).toEqual([boots.id]);
    expect(paged.total).toBe(2);
  });

  it("leaves out hidden shops and listings from search too", async () => {
    const priv = await seller({ slug: "priv", visibility: "private" });
    const paused = await seller({ slug: "paused", paused: true });
    const link = await seller({ slug: "link", visibility: "link" });
    for (const s of [priv, paused, link]) await createListing(s.shop.id, { title: "Teapot" });
    const pub = await seller({ slug: "pub" });
    await createListing(pub.shop.id, { title: "Teapot", visibility: "link" });
    await createListing(pub.shop.id, { title: "Teapot", status: "sold" });
    await createListing(pub.shop.id, { title: "Teapot", status: "draft", slug: null });
    const shown = await createListing(pub.shop.id, { title: "Teapot" });
    expect((await M.searchListings({ q: "teapot" })).listings.map((l) => l.id)).toEqual([shown.id]);
  });
});

describe("searchListings with Jina on", () => {
  it("merges meaning matches with word matches", async () => {
    state.embeddings = true;
    const { shop } = await seller();
    const wordMatch = await createListing(shop.id, { title: "Wellington boots" });
    const meaningMatch = await createListing(shop.id, { title: "Rain wellies" });
    const unrelated = await createListing(shop.id, { title: "Teapot" });
    await db.update(listing).set({ embedding: axis(0) }).where(eq(listing.id, meaningMatch.id));
    await db.update(listing).set({ embedding: axis(1) }).where(eq(listing.id, unrelated.id));
    vi.mocked(embeddings.embedQuery).mockResolvedValue(axis(0));

    const result = await M.searchListings({ q: "boots" });
    expect(embeddings.embedQuery).toHaveBeenCalledWith("boots");
    expect(result.semantic).toBe(true);
    expect(result.listings.map((l) => l.id).sort()).toEqual([wordMatch.id, meaningMatch.id].sort());
  });

  it("ranks a listing both rankers found above one only one found", async () => {
    state.embeddings = true;
    const { shop } = await seller();
    const both = await createListing(shop.id, { title: "Rubber boots" });
    const wordOnly = await createListing(shop.id, { title: "Boots boots boots" });
    await db.update(listing).set({ embedding: axis(0) }).where(eq(listing.id, both.id));
    vi.mocked(embeddings.embedQuery).mockResolvedValue(axis(0));
    expect((await M.searchListings({ q: "boots" })).listings.map((l) => l.id)).toEqual([both.id, wordOnly.id]);
  });

  it("falls back to words alone when embedding the query fails", async () => {
    state.embeddings = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { shop } = await seller();
    const boots = await createListing(shop.id, { title: "Boots" });
    vi.mocked(embeddings.embedQuery).mockRejectedValue(new Error("Jina down"));

    const result = await M.searchListings({ q: "boots" });
    expect(result).toMatchObject({ semantic: false, total: 1 });
    expect(result.listings[0]!.id).toBe(boots.id);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
