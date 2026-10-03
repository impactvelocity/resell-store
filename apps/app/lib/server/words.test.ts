import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, listing, listingCopy } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser } from "../../test/factories";

/*
 * C6 words: the brief the writing agent gets, clipping to the title and
 * one-liner limits, keeping every take, and putting the chosen one on the
 * listing (re-embedding only when it's live). Claude and Jina are mocked.
 */

const state = vi.hoisted(() => ({ ai: false }));

vi.mock("ai", async (orig) => ({ ...(await orig<typeof import("ai")>()), generateText: vi.fn() }));
vi.mock("./ai", async (orig) => ({
  ...(await orig<typeof import("./ai")>()),
  get aiConfigured() {
    return state.ai;
  },
  aiModel: vi.fn(() => "test-model"),
}));
vi.mock("./listings", async (orig) => ({
  ...(await orig<typeof import("./listings")>()),
  refreshEmbedding: vi.fn(async () => {}),
}));

const { generateText } = await import("ai");
const listings = await import("./listings");
const W = await import("./words");

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  state.ai = false;
});

async function setup(overrides: Parameters<typeof createListing>[1] = {}) {
  const me = await createUser();
  const s = await createShop(me.id);
  return createListing(s.id, {
    status: "draft",
    title: null,
    oneLiner: null,
    description: null,
    name: "Yellow dutch oven",
    prompt: "Le Creuset dutch oven, used a few times",
    category: "Home",
    priceCents: 12_000,
    fields: [
      { key: "brand", label: "Brand", value: "Le Creuset", source: "agent" },
      { key: "condition", label: "Condition", value: "Minor wear", source: "you" },
      { key: "size", label: "Size", source: "agent" },
    ],
    ...overrides,
  });
}

const take = {
  title: "Le Creuset round dutch oven in Soleil yellow, 5.5 qt, minor wear on the base, lid included",
  oneLiner: "  A cheerful   pot that cooks evenly.  ",
  description: "  Used a handful of times. Minor wear on the base.  ",
  teaser: "Sunshine for your stovetop.",
};

function promptOf(call = 0) {
  return vi.mocked(generateText).mock.calls[call]![0] as unknown as { prompt: string; instructions: string };
}

describe("clip", () => {
  it("leaves short text alone but tidies spaces", () => {
    expect(W.clip("  Short   title ", 80)).toBe("Short title");
  });

  it("cuts at a word and drops trailing punctuation", () => {
    const out = W.clip("Le Creuset round dutch oven, Soleil yellow, five and a half quarts", 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out).toBe("Le Creuset round dutch oven, Soleil");
  });

  it("cuts mid-word rather than losing more than 12 characters", () => {
    const out = W.clip(`Pot ${"x".repeat(60)}`, 40);
    expect(out.length).toBe(28);
  });
});

describe("generateWords", () => {
  it("says it needs a key when there's no Anthropic key", async () => {
    const row = await setup();
    const result = await W.generateWords(row, null, { tone: "Friendly" });
    expect(result).toMatchObject({ ok: false, reason: "no-key" });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("refuses a tone it doesn't know", async () => {
    const row = await setup();
    await expect(W.generateWords(row, null, { tone: "Shouty" })).rejects.toThrow();
  });

  it("writes a first take, keeps it, and puts it on the listing", async () => {
    state.ai = true;
    vi.mocked(generateText).mockResolvedValue({ output: take } as never);
    const row = await setup();
    const result = await W.generateWords(row, "Short and dry.", { tone: "Playful" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.copy.title.length).toBeLessThanOrEqual(W.titleMax);
    expect(result.copy.oneLiner).toBe("A cheerful pot that cooks evenly.");
    expect(result.copy.description).toBe("Used a handful of times. Minor wear on the base.");
    expect(result.copy.teaser).toBe("Sunshine for your stovetop");
    expect(result.copy.tone).toBe("Playful");

    const [saved] = await db.select().from(listing).where(eq(listing.id, row.id));
    expect(saved).toMatchObject({ title: result.copy.title, oneLiner: result.copy.oneLiner, tone: "Playful" });
    expect(await db.select().from(listingCopy)).toHaveLength(1);
    // A draft isn't searchable yet
    expect(listings.refreshEmbedding).not.toHaveBeenCalled();

    const { prompt, instructions } = promptOf();
    expect(instructions).toContain("Tone: Playful. Light and a little cheeky.");
    expect(prompt).toContain("Item: Yellow dutch oven");
    expect(prompt).toContain("- Condition: Minor wear (seller said)");
    expect(prompt).toContain("- Brand: Le Creuset\n");
    expect(prompt).not.toContain("Size");
    expect(prompt).toContain("Price: $120");
    expect(prompt).toContain("The seller's usual style: Short and dry.");
    expect(prompt).toContain("Task: Write the first version.");
  });

  it("re-embeds a live listing after its words change", async () => {
    state.ai = true;
    vi.mocked(generateText).mockResolvedValue({ output: take } as never);
    const row = await setup({ status: "live" });
    await W.generateWords(row, null, { tone: "Friendly" });
    expect(listings.refreshEmbedding).toHaveBeenCalledTimes(1);
  });

  it("starts from the take on screen with the seller's hand edits, and halves it for 'shorter'", async () => {
    state.ai = true;
    vi.mocked(generateText).mockResolvedValue({ output: take } as never);
    const row = await setup({ title: "My edited title" });
    const [prev] = await db
      .insert(listingCopy)
      .values({ listingId: row.id, tone: "Friendly", title: "Old title", oneLiner: "Old line", description: "one two three four five six seven eight nine ten", teaser: "t" })
      .returning();

    await W.generateWords(row, null, { tone: "Friendly", instruction: "shorter", fromCopyId: prev!.id });
    const { prompt } = promptOf();
    expect(prompt).toContain("Title: My edited title");
    expect(prompt).toContain("One-liner: Old line");
    expect(prompt).toContain("The description is 10 words now; the new one must be 15 words or fewer.");
  });

  it("passes on the seller's own request, and ignores a take from another listing", async () => {
    state.ai = true;
    vi.mocked(generateText).mockResolvedValue({ output: take } as never);
    const row = await setup();
    const other = await setup();
    const [foreign] = await db
      .insert(listingCopy)
      .values({ listingId: other.id, tone: "Friendly", title: "Secret", oneLiner: "x", description: "x", teaser: "x" })
      .returning();

    await W.generateWords(row, null, { tone: "A bit luxe", instruction: "mention the lid", fromCopyId: foreign!.id });
    const { prompt } = promptOf();
    expect(prompt).not.toContain("Secret");
    expect(prompt).toContain('Task: The seller asked: "mention the lid". Rewrite to do that');

    await W.generateWords(row, null, { tone: "Friendly", instruction: "longer" });
    expect(promptOf(1).prompt).toContain("Add more useful detail");
  });

  it("says it couldn't write it when Claude fails, and changes nothing", async () => {
    state.ai = true;
    vi.mocked(generateText).mockRejectedValue(new Error("overloaded"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const row = await setup();
    expect(await W.generateWords(row, null, { tone: "Friendly" })).toMatchObject({ ok: false, reason: "failed" });
    expect(await db.select().from(listingCopy)).toHaveLength(0);
    expect((await db.select().from(listing).where(eq(listing.id, row.id)))[0]!.title).toBeNull();
    spy.mockRestore();
  });
});

describe("tones", () => {
  it("has a guide line for every tone", () => {
    for (const t of W.tones) expect(W.toneGuide[t]).toBeTruthy();
  });
});
