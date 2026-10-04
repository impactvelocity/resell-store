import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, listing, listingCopy, type ListingField } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser } from "../../test/factories";
import { axis, createFile, createPhoto } from "../../test/factories-market";

/*
 * Listings on the seller side: drafts, ownership, steps, photos (cover
 * rules), fields, and publishing (a unique path inside the shop, and a
 * search embedding when Jina is on). Sign-in and Jina are mocked.
 */

const state = vi.hoisted(() => ({ embeddings: false, user: null as null | { id: string } }));

vi.mock("./session", () => ({
  getSession: vi.fn(async () => null),
  getCurrentUser: vi.fn(async () => state.user),
  requireUser: vi.fn(async () => {
    if (!state.user) throw new Error("redirect /welcome");
    return state.user;
  }),
}));

vi.mock("./embeddings", async (orig) => ({
  ...(await orig<typeof import("./embeddings")>()),
  get embeddingsConfigured() {
    return state.embeddings;
  },
  embed: vi.fn(async (inputs: string[]) => inputs.map(() => axis(0))),
}));

const embeddings = await import("./embeddings");
const L = await import("./listings");

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  state.embeddings = false;
  state.user = null;
});

async function seller() {
  const me = await createUser();
  const s = await createShop(me.id, { slug: "maya", name: "Maya's" });
  return { me, shop: s };
}

describe("furthestStep and reachStep", () => {
  it("only ever moves forward", async () => {
    expect(L.furthestStep("details", "photos")).toBe("photos");
    expect(L.furthestStep("words", "details")).toBe("words");
    expect(L.furthestStep("publish", "publish")).toBe("publish");

    const { shop } = await seller();
    const row = await createListing(shop.id, { status: "draft", step: "photos" });
    await L.reachStep(row, "details");
    expect((await db.select().from(listing).where(eq(listing.id, row.id)))[0]!.step).toBe("photos");
    await L.reachStep(row, "words");
    expect((await db.select().from(listing).where(eq(listing.id, row.id)))[0]!.step).toBe("words");
  });
});

describe("draftName and createDraft", () => {
  it("names a draft from the first sentence of what the seller typed", () => {
    expect(L.draftName("Le Creuset dutch oven. Barely used!")).toBe("Le Creuset dutch oven");
    expect(L.draftName("  Boots\nsize 9")).toBe("Boots");
    expect(L.draftName("Yellow dutch oven, 5.5 qt")).toBe("Yellow dutch oven, 5.5 qt");
    const long = L.draftName("a ".repeat(50));
    expect(long.length).toBeLessThanOrEqual(58);
    expect(long.endsWith("…")).toBe(true);
  });

  it("creates a draft at the research step", async () => {
    const { shop } = await seller();
    const row = await L.createDraft({ shopId: shop.id, prompt: "Yellow dutch oven, 5.5 qt. Used twice." });
    expect(row).toMatchObject({ status: "draft", step: "research", name: "Yellow dutch oven, 5.5 qt", slug: null, visibility: "everyone" });
    expect((await L.createDraft({ shopId: shop.id, prompt: "  " })).name).toBe("New listing");
  });
});

describe("ownership", () => {
  it("finds a listing only for its shop's owner", async () => {
    const { me, shop } = await seller();
    const stranger = await createUser();
    const row = await createListing(shop.id);
    expect((await L.getOwnedListing(me.id, row.id))!.shop.id).toBe(shop.id);
    expect(await L.getOwnedListing(stranger.id, row.id)).toBeNull();
    expect(await L.getOwnedListing(me.id, "nope")).toBeNull();
  });

  it("requireOwnedListing returns the owner's listing and 404s anyone else", async () => {
    const { me, shop } = await seller();
    const row = await createListing(shop.id);

    state.user = me;
    expect((await L.requireOwnedListing(row.id)).listing.id).toBe(row.id);

    state.user = await createUser();
    const error = await L.requireOwnedListing(row.id).catch((e: unknown) => e);
    expect(String((error as { digest?: string }).digest)).toContain("404");
  });
});

describe("photos", () => {
  it("shows uploads by their file URL and web pictures by theirs, in position order", async () => {
    const { me, shop } = await seller();
    const row = await createListing(shop.id);
    const f = await createFile(me.id);
    await createPhoto(row.id, { url: "https://maker.com/b.jpg", source: "maker.com", position: 1 });
    await createPhoto(row.id, { fileId: f.id, alt: "Front", position: 0 });

    const photos = await L.listPhotos(row.id);
    expect(photos.map((p) => p.url)).toEqual([`/api/files/${f.id}`, "https://maker.com/b.jpg"]);
    expect(photos[0]).toMatchObject({ alt: "Front", isVideo: false });
  });

  it("picks each listing's first photo as its cover, skipping videos", async () => {
    const { me, shop } = await seller();
    const a = await createListing(shop.id);
    const b = await createListing(shop.id);
    const c = await createListing(shop.id);
    const video = await createFile(me.id, { contentType: "video/mp4" });
    const pic = await createFile(me.id);
    await createPhoto(a.id, { fileId: video.id, isVideo: true, position: 0 });
    await createPhoto(a.id, { fileId: pic.id, position: 1 });
    await createPhoto(b.id, { url: "https://x.com/2.jpg", position: 2 });
    await createPhoto(b.id, { url: "https://x.com/1.jpg", position: 1 });

    const covers = await L.coverPhotos([a.id, b.id, c.id]);
    expect(covers.get(a.id)).toBe(`/api/files/${pic.id}`);
    expect(covers.get(b.id)).toBe("https://x.com/1.jpg");
    expect(covers.has(c.id)).toBe(false);
    expect((await L.coverPhotos([])).size).toBe(0);
  });

  it("keeps one of the seller's own photos as the cover when adding web pictures first", async () => {
    const { me, shop } = await seller();
    const row = await createListing(shop.id);
    await L.addPhotoRows(row.id, [{ url: "https://maker.com/a.jpg" }, { url: "https://maker.com/b.jpg" }]);
    const own = await createFile(me.id);
    const [added] = await L.addPhotoRows(row.id, [{ fileId: own.id }]);

    const rows = await L.listPhotoRows(row.id);
    expect(rows.map((p) => p.id)[0]).toBe(added!.id);
    expect(rows.map((p) => p.position)).toEqual([0, 1, 2]);
    expect(L.isOwnPhoto(rows[0]!)).toBe(true);
    expect(L.isOwnPhoto(rows[1]!)).toBe(false);
  });

  it("savePhotoOrder leaves web-only galleries in the order given", async () => {
    const { shop } = await seller();
    const row = await createListing(shop.id);
    const a = await createPhoto(row.id, { url: "https://x.com/a.jpg", position: 0 });
    const b = await createPhoto(row.id, { url: "https://x.com/b.jpg", position: 1 });
    const saved = await L.savePhotoOrder([b, a]);
    expect(saved.map((p) => [p.id, p.position])).toEqual([
      [b.id, 0],
      [a.id, 1],
    ]);
    expect((await L.listPhotoRows(row.id)).map((p) => p.id)).toEqual([b.id, a.id]);
  });
});

describe("fields", () => {
  const fields: ListingField[] = [
    { key: "brand", label: "Brand", value: "Le Creuset", source: "agent" },
    { key: "size", label: "Size", source: "agent" },
  ];

  it("setField edits by key, else by label, else adds a line, always as the seller's", () => {
    expect(L.setField(fields, "size", "5.5 qt")[1]).toEqual({ key: "size", label: "Size", value: "5.5 qt", source: "you" });
    const byLabel = L.setField(fields, "maker", "Staub", " brand ");
    expect(byLabel).toHaveLength(2);
    expect(byLabel[0]).toMatchObject({ key: "brand", value: "Staub", source: "you" });
    const added = L.setField(fields, "colour", "Soleil", "Colour");
    expect(added).toHaveLength(3);
    expect(added[2]).toEqual({ key: "colour", label: "Colour", value: "Soleil", source: "you" });
  });

  it("filledCount counts filled fields plus price, title, description and a photo", async () => {
    const { shop } = await seller();
    const row = await createListing(shop.id, { fields, description: null });
    // brand + price + title, out of max(2, 6) + 4
    expect(L.filledCount(row, 0)).toEqual({ filled: 3, total: 10 });
    expect(L.filledCount(row, 2)).toEqual({ filled: 4, total: 10 });
  });
});

describe("publishListing", () => {
  it("puts a draft live with a path from its title", async () => {
    const { shop } = await seller();
    const draft = await createListing(shop.id, {
      status: "draft",
      slug: null,
      publishedAt: null,
      title: "Sunny yellow Le Creuset dutch oven, 5.5 qt",
    });
    const live = await L.publishListing(draft);
    expect(live).toMatchObject({ status: "live", step: "publish", slug: "sunny-yellow-le-creuset-dutch-oven-5-5-qt" });
    expect(live.publishedAt).toBeInstanceOf(Date);
    expect(embeddings.embed).not.toHaveBeenCalled();
  });

  it("numbers the path when the shop already uses it, but not across shops", async () => {
    const { me, shop } = await seller();
    await createListing(shop.id, { slug: "boots" });
    const other = await createShop(me.id);
    await createListing(other.id, { slug: "boots-2" });

    const a = await L.publishListing(await createListing(shop.id, { status: "draft", slug: null, title: "Boots" }));
    const b = await L.publishListing(await createListing(shop.id, { status: "draft", slug: null, title: "Boots!" }));
    expect([a.slug, b.slug]).toEqual(["boots-2", "boots-3"]);
    const elsewhere = await L.publishListing(await createListing(other.id, { status: "draft", slug: null, title: "Boots" }));
    expect(elsewhere.slug).toBe("boots");
  });

  it("keeps an existing path and first-published date on republish", async () => {
    const { shop } = await seller();
    const first = new Date("2026-09-01T10:00:00Z");
    const row = await createListing(shop.id, { status: "draft", slug: "kept", publishedAt: first, title: "New title" });
    const live = await L.publishListing(row);
    expect(live.slug).toBe("kept");
    expect(live.publishedAt).toEqual(first);
  });

  it("cuts long titles at a word, and falls back to the name or 'listing'", async () => {
    const { shop } = await seller();
    const long = await L.publishListing(
      await createListing(shop.id, {
        status: "draft",
        slug: null,
        title: "Mid century modern teak sideboard with sliding doors and three drawers in great shape",
      }),
    );
    expect(long.slug!.length).toBeLessThanOrEqual(60);
    expect(long.slug!.endsWith("-")).toBe(false);
    expect("mid-century-modern-teak-sideboard-with-sliding-doors-and-three-drawers").toContain(long.slug!);

    const named = await L.publishListing(await createListing(shop.id, { status: "draft", slug: null, title: null, name: "Old lamp" }));
    expect(named.slug).toBe("old-lamp");
    const symbols = await L.publishListing(await createListing(shop.id, { status: "draft", slug: null, title: "!!!" }));
    expect(symbols.slug).toBe("listing");
  });

  it("stores a search embedding when Jina is on", async () => {
    state.embeddings = true;
    const { shop } = await seller();
    const row = await createListing(shop.id, { status: "draft", slug: null, title: "Boots", oneLiner: "Comfy" });
    await L.publishListing(row);
    expect(embeddings.embed).toHaveBeenCalledWith([expect.stringContaining("Boots\nComfy")], "retrieval.passage");
    const [saved] = await db.select({ embedding: listing.embedding }).from(listing).where(eq(listing.id, row.id));
    expect(saved!.embedding![0]).toBe(1);
  });

  it("still publishes when the embedding fails", async () => {
    state.embeddings = true;
    vi.mocked(embeddings.embed).mockRejectedValueOnce(new Error("Jina down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { shop } = await seller();
    const live = await L.publishListing(await createListing(shop.id, { status: "draft", slug: null, title: "Boots" }));
    expect(live.status).toBe("live");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("listShopListings and listCopies", () => {
  it("lists a shop's listings newest first and a listing's takes oldest first", async () => {
    const { shop } = await seller();
    const a = await createListing(shop.id);
    const b = await createListing(shop.id);
    await L.updateListing(a.id, { title: "touched" });
    expect((await L.listShopListings(shop.id)).map((l) => l.id)).toEqual([a.id, b.id]);

    await db.insert(listingCopy).values([
      { listingId: a.id, tone: "Friendly", title: "One", oneLiner: "o", description: "d", teaser: "t", createdAt: new Date(Date.now() - 1000) },
      { listingId: a.id, tone: "Playful", title: "Two", oneLiner: "o", description: "d", teaser: "t" },
    ]);
    expect((await L.listCopies(a.id)).map((c) => c.title)).toEqual(["One", "Two"]);
  });
});

describe("web pictures", () => {
  it("sourceDomain reads a domain from a URL or a bare domain", () => {
    expect(L.sourceDomain("https://www.lecreuset.com/p/1")).toBe("lecreuset.com");
    expect(L.sourceDomain("jaxdomain.com")).toBe("jaxdomain.com");
    expect(L.sourceDomain("Amazon")).toBeNull();
    expect(L.sourceDomain(null)).toBeNull();
    expect(L.sourceDomain("http://")).toBeNull();
  });

  it("webSuggestions keeps http(s) images and credits their site", async () => {
    const { shop } = await seller();
    const row = await createListing(shop.id, {
      findings: {
        images: [
          { url: "https://cdn.shop.com/a.jpg", source: "lecreuset.com", alt: "Front" },
          { url: "https://cdn.shop.com/b.jpg", source: "Le Creuset" },
          { url: "data:image/png;base64,xx", source: "x.com" },
        ],
      } as never,
    });
    expect(L.webSuggestions(row)).toEqual([
      { url: "https://cdn.shop.com/a.jpg", source: "lecreuset.com", alt: "Front" },
      { url: "https://cdn.shop.com/b.jpg", source: "cdn.shop.com", alt: null },
    ]);
    expect(L.webSuggestions({ ...row, findings: null })).toEqual([]);
  });
});

describe("toWorkspaceListing", () => {
  it("gives the client a plain listing with its share link once it has a path", async () => {
    const { shop } = await seller();
    const row = await createListing(shop.id, { slug: "boots", title: "Boots" });
    const w = L.toWorkspaceListing(row, shop);
    expect(w).toMatchObject({
      id: row.id,
      title: "Boots",
      hasTitle: true,
      shareUrl: "http://maya.localhost:5689/boots",
      closeHref: "/shops/maya",
      shop: { slug: "maya", lowestPercent: 15, haggle: true },
    });
    expect(w.publishedAt).toBe(row.publishedAt!.toISOString());

    const draft = L.toWorkspaceListing({ ...row, slug: null, title: null, name: "boots draft" }, shop);
    expect(draft).toMatchObject({ title: "boots draft", hasTitle: false, shareUrl: null });
  });
});
