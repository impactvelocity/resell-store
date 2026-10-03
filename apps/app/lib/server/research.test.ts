import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, listing, researchRun, sql } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser } from "../../test/factories";
import { createFile, createPhoto } from "../../test/factories-market";
import type { C3Product } from "./channel3";

/*
 * C2 research: the run's step rows, the price it lands on, and how the
 * findings merge into the listing. Claude (the `ai` package) and Channel3
 * are mocked; each test switches them on or leaves them off like the
 * missing keys would.
 */

const state = vi.hoisted(() => ({ ai: false, channel3: false }));

vi.mock("ai", async (orig) => ({ ...(await orig<typeof import("ai")>()), generateText: vi.fn() }));
vi.mock("./ai", async (orig) => ({
  ...(await orig<typeof import("./ai")>()),
  get aiConfigured() {
    return state.ai;
  },
  aiModel: vi.fn(() => "test-model"),
}));
vi.mock("./channel3", async (orig) => ({
  ...(await orig<typeof import("./channel3")>()),
  get channel3Configured() {
    return state.channel3;
  },
  searchProducts: vi.fn(),
}));

const { generateText } = await import("ai");
const channel3 = await import("./channel3");
const R = await import("./research");

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  state.ai = false;
  state.channel3 = false;
});

async function draft(overrides: Parameters<typeof createListing>[1] = {}) {
  const me = await createUser();
  const s = await createShop(me.id);
  const l = await createListing(s.id, {
    status: "draft",
    slug: null,
    prompt: "Yellow Le Creuset dutch oven",
    name: "Yellow Le Creuset dutch oven",
    priceCents: null,
    ...overrides,
  });
  return { me, shop: s, listing: l };
}

async function research(listingId: string) {
  const { id } = await R.startResearch(listingId);
  await R.runResearch(id);
  const [row] = await db.select().from(researchRun).where(eq(researchRun.id, id));
  const [l] = await db.select().from(listing).where(eq(listing.id, listingId));
  return { run: row!, listing: l! };
}

const offer = (domain: string, price: number, condition: "new" | "used") => ({
  url: `https://${domain}/p`,
  domain,
  price: { price, compare_at_price: null, currency: "USD" },
  availability: "InStock",
  condition,
});

const products: C3Product[] = [
  {
    id: "p1",
    title: "Le Creuset Signature Round Dutch Oven",
    brands: [{ id: "b", name: "Le Creuset" }],
    images: [{ url: "https://cdn.lecreuset.com/1.jpg", alt_text: "Front" }, { url: "https://cdn.lecreuset.com/2.jpg" }],
    offers: [offer("lecreuset.com", 420, "new"), offer("therealreal.com", 150, "used"), offer("ebay.com", 210, "used")],
  },
  { id: "p2", title: "Le Creuset oval", offers: [offer("thredup.com", 180, "used"), offer("macys.com", 380, "new")] },
];

describe("startResearch", () => {
  it("opens a run with four queued steps, reading words when there's no photo", async () => {
    const { listing } = await draft();
    const started = await R.startResearch(listing.id);
    expect(started.started).toBe(true);
    const run = await R.latestRun(listing.id);
    expect(run).toMatchObject({ id: started.id, status: "running" });
    expect(run!.steps.map((s) => [s.key, s.state])).toEqual([
      ["identify", "queued"],
      ["catalog", "queued"],
      ["resale", "queued"],
      ["price", "queued"],
    ]);
    expect(run!.steps[0]).toMatchObject({ tag: "Words", title: "Work out what it is" });
  });

  it("looks at the photo when there is one", async () => {
    const { me, listing } = await draft();
    const f = await createFile(me.id);
    await createPhoto(listing.id, { fileId: f.id });
    await R.startResearch(listing.id);
    expect((await R.latestRun(listing.id))!.steps[0]).toMatchObject({ tag: "Photo", title: "Look at your photo" });
  });

  it("doesn't start twice while a run is going, but replaces a stuck one", async () => {
    const { listing } = await draft();
    const first = await R.startResearch(listing.id);
    expect(await R.startResearch(listing.id)).toEqual({ id: first.id, started: false });

    await db.execute(sql`update research_run set updated_at = now() - interval '4 minutes' where id = ${first.id}`);
    const second = await R.startResearch(listing.id);
    expect(second.started).toBe(true);
    expect(second.id).not.toBe(first.id);
  });

  it("has no latest run before research", async () => {
    const { listing } = await draft();
    expect(await R.latestRun(listing.id)).toBeNull();
  });
});

describe("runResearch with no keys", () => {
  it("finishes with a rough guess from what the seller typed", async () => {
    const { listing: l } = await draft();
    const { run, listing } = await research(l.id);

    expect(generateText).not.toHaveBeenCalled();
    expect(channel3.searchProducts).not.toHaveBeenCalled();
    expect(run.status).toBe("done");
    expect(run.steps.map((s) => s.state)).toEqual(["done", "failed", "done", "done"]);
    expect(run.steps[1]!.detail).toBe("Add CHANNEL3_API_KEY to search the catalog");
    expect(run.steps[2]!.title).toBe("None for sale second hand right now");
    expect(run.steps[3]).toMatchObject({ title: "About $40", detail: "Most go for $34 to $46" });

    expect(listing.findings).toMatchObject({
      identified: "Yellow Le Creuset dutch oven",
      category: "Other",
      confidence: "low",
      price: { min: 24, max: 56, bandLow: 34, bandHigh: 46, suggested: 40 },
      sources: [],
      images: [],
    });
    expect(listing.priceCents).toBe(4_000);
    expect(listing.lowestCents).toBe(3_400);
    expect(listing.category).toBe("Other");
    expect(listing.fields.map((f) => [f.key, f.source])).toEqual([
      ["item", "agent"],
      ["condition", "agent"],
      ["bought", "agent"],
    ]);
  });

  it("keeps the seller's own price, floor and answers", async () => {
    const { listing: l } = await draft({
      priceCents: 5_500,
      lowestCents: 4_000,
      fields: [
        { key: "condition", label: "Condition", value: "Minor wear", source: "you" },
        { key: "lid", label: "Lid", value: "Included", source: "you" },
        { key: "colour", label: "Colour", value: "Guess", source: "agent" },
      ],
    });
    const { listing } = await research(l.id);
    expect(listing.priceCents).toBe(5_500);
    expect(listing.lowestCents).toBe(4_000);
    expect(listing.fields).toEqual([
      { key: "item", label: "Item", value: "Yellow Le Creuset dutch oven", source: "agent" },
      { key: "condition", label: "Condition", value: "Minor wear", source: "you" },
      { key: "bought", label: "Bought", source: "agent" },
      { key: "lid", label: "Lid", value: "Included", source: "you" },
    ]);
  });

  it("does nothing for an unknown run", async () => {
    await expect(R.runResearch("nope")).resolves.toBeUndefined();
  });
});

describe("runResearch with Channel3", () => {
  it("prices from second-hand offers and keeps the sources and maker photos", async () => {
    state.channel3 = true;
    vi.mocked(channel3.searchProducts).mockResolvedValue(products);
    const { listing: l } = await draft();
    const { run, listing } = await research(l.id);

    expect(channel3.searchProducts).toHaveBeenCalledWith({ query: "Yellow Le Creuset dutch oven", base64Image: undefined, limit: 10 });
    expect(run.steps[1]).toMatchObject({
      state: "done",
      title: "Matched Le Creuset Signature Round Dutch Oven",
      detail: "New from $380 at lecreuset.com, macys.com",
    });
    expect(run.steps[2]).toMatchObject({ title: "3 for sale second hand", detail: "$150 to $210 on therealreal.com, ebay.com, thredup.com" });
    // Median of 150, 180, 210
    expect(listing.findings!.price.suggested).toBe(180);
    expect(listing.findings!.facts).toEqual([
      { label: "New price", value: "From $380" },
      { label: "Second hand", value: "3 for sale now" },
    ]);
    expect(listing.findings!.sources.map((s) => [s.key, s.items.length])).toEqual([
      ["resale", 3],
      ["new", 2],
    ]);
    expect(listing.findings!.images).toEqual([
      { url: "https://cdn.lecreuset.com/1.jpg", source: "lecreuset.com", alt: "Front" },
      { url: "https://cdn.lecreuset.com/2.jpg", source: "lecreuset.com", alt: undefined },
    ]);
  });

  it("sends the photo to the catalog search", async () => {
    state.channel3 = true;
    vi.mocked(channel3.searchProducts).mockResolvedValue([]);
    const { me, listing: l } = await draft();
    const f = await createFile(me.id, { data: Buffer.from("photo!") });
    await createPhoto(l.id, { fileId: f.id });
    await research(l.id);
    expect(vi.mocked(channel3.searchProducts).mock.calls[0]![0].base64Image).toBe(Buffer.from("photo!").toString("base64"));
  });

  it("carries on when the catalog search fails", async () => {
    state.channel3 = true;
    vi.mocked(channel3.searchProducts).mockRejectedValue(new Error("Channel3 down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { listing: l } = await draft();
    const { run } = await research(l.id);
    expect(run.status).toBe("done");
    expect(run.steps[1]).toMatchObject({ state: "failed", detail: "I'll price it from what you tell me" });
    spy.mockRestore();
  });
});

describe("runResearch with Claude", () => {
  const identity = {
    name: "Le Creuset round dutch oven",
    brand: "Le Creuset",
    category: "Home",
    colour: "Soleil yellow",
    size: "5.5 qt",
    searchQuery: "Le Creuset round dutch oven 5.5 qt soleil",
    fields: [
      { key: "Brand", label: "Brand", value: "Le Creuset" },
      { key: "brand", label: "Brand", value: "duplicate" },
      { key: "size", label: "Size", value: "5.5 qt" },
    ],
  };
  const verdict = {
    min: 200,
    max: 150, // below the band: widened to fit
    bandLow: 160,
    bandHigh: 120, // below bandLow: lifted to it
    suggested: 400, // above the band: pulled down into it
    confidence: "medium" as const,
    facts: [1, 2, 3, 4, 5].map((i) => ({ label: `Fact ${i}`, value: "x" })),
    questions: [{ field: "condition", label: "Condition", ask: "How is it?", options: [{ label: "Good", value: "Good" }, { label: "Worn", value: "Worn" }] }],
    summary: "Most go for about $160.",
  };

  it("identifies the item, then prices it inside a sane band", async () => {
    state.ai = true;
    vi.mocked(generateText)
      .mockResolvedValueOnce({ output: identity } as never)
      .mockResolvedValueOnce({ output: verdict } as never);
    const { listing: l } = await draft();
    const { run, listing } = await research(l.id);

    expect(run.status).toBe("done");
    expect(run.steps[0]).toMatchObject({ state: "done", title: "Le Creuset round dutch oven", detail: "Le Creuset, Soleil yellow, 5.5 qt" });
    expect(run.steps[1]!.detail).toBe("Add CHANNEL3_API_KEY to search the catalog");
    expect(listing.findings!.price).toEqual({ min: 160, max: 160, bandLow: 160, bandHigh: 160, suggested: 160 });
    expect(listing.findings!.facts).toHaveLength(4);
    expect(listing.findings!.confidence).toBe("medium");
    expect(listing.name).toBe("Le Creuset round dutch oven");
    expect(listing.category).toBe("Home");
    // Keys are lowercased and deduped; the condition question adds a row
    expect(listing.fields.map((f) => f.key)).toEqual(["brand", "size", "condition"]);

    const pricePrompt = vi.mocked(generateText).mock.calls[1]![0] as { prompt: string };
    expect(pricePrompt.prompt).toContain("Item: Le Creuset round dutch oven by Le Creuset. Category: Home.");
    expect(pricePrompt.prompt).toContain("New prices: none found");
  });

  it("shows Claude the photo with the seller's words", async () => {
    state.ai = true;
    vi.mocked(generateText)
      .mockResolvedValueOnce({ output: identity } as never)
      .mockResolvedValueOnce({ output: verdict } as never);
    const { me, listing: l } = await draft({ prompt: "" });
    const f = await createFile(me.id, { contentType: "image/png" });
    await createPhoto(l.id, { fileId: f.id });
    const { run } = await research(l.id);

    const call = vi.mocked(generateText).mock.calls[0]![0] as { messages: { content: { type: string; mediaType?: string; text?: string }[] }[] };
    const parts = call.messages[0]!.content;
    expect(parts[0]).toMatchObject({ type: "file", mediaType: "image/png" });
    expect(parts[1]!.text).toContain("(nothing, just the photo)");
    expect(run.steps[0]!.tag).toBe("Photo");
  });

  it("marks the run failed, never throws, when Claude errors", async () => {
    state.ai = true;
    vi.mocked(generateText).mockRejectedValue(new Error("overloaded"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { listing: l } = await draft();
    const { run, listing } = await research(l.id);

    expect(run.status).toBe("failed");
    expect(run.error).toBe("overloaded");
    expect(run.steps.every((s) => s.state === "failed" && s.detail === "Didn't finish")).toBe(true);
    expect(listing.findings).toBeNull();
    spy.mockRestore();
  });
});
