import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  and,
  db,
  desc,
  eq,
  gt,
  listing,
  listingPhoto,
  researchRun,
  type ListingField,
  type ResearchFindings,
  type ResearchQuestion,
  type ResearchSource,
  type ResearchStepRow,
} from "@repo/db";
import { aiConfigured, aiModel } from "./ai";
import {
  channel3Configured,
  newOffers,
  searchProducts,
  usedOffers,
  type C3Product,
} from "./channel3";
import { compsConfigured, findComps, type Comps } from "./comps";
import { readFileBytes } from "./files";

/*
 * C2 Research. Runs after the start screen answers, off the request: each step
 * writes its row to research_run so the page can poll and show the tool card
 * filling in. The same function becomes a Render Workflow task later; the page
 * only ever reads research_run and listing.findings.
 *
 *   identify  what is it? (Claude, with the photo when there is one)
 *   catalog   Channel3: the product, its maker photos, what it costs new
 *   resale    Channel3: second-hand offers for it
 *   listings  Kernel: the same thing listed on eBay, Poshmark and Depop now
 *             (comps.ts), run beside catalog and resale since it's the slow one
 *   price     a fair range, a suggestion, and what to ask the seller
 */

type Step = "identify" | "catalog" | "resale" | "listings" | "price";

function initialSteps(hasPhoto: boolean): ResearchStepRow[] {
  return [
    {
      key: "identify",
      tag: hasPhoto ? "Photo" : "Words",
      state: "queued",
      title: hasPhoto ? "Look at your photo" : "Work out what it is",
      detail: "Up next",
    },
    { key: "catalog", tag: "Catalog", state: "queued", title: "Find it in 100M products", detail: "Up next" },
    { key: "resale", tag: "Resale", state: "queued", title: "Find second-hand prices", detail: "Up next" },
    ...(compsConfigured
      ? [{ key: "listings", tag: "Listings", state: "queued" as const, title: "Check eBay, Poshmark and Depop", detail: "Up next" }]
      : []),
    { key: "price", tag: "Price", state: "queued", title: "Work out a fair price", detail: "Up next" },
  ];
}

/** Starts a run unless one is already going. Returns the run id. */
export async function startResearch(listingId: string) {
  const [running] = await db
    .select({ id: researchRun.id })
    .from(researchRun)
    .where(
      and(
        eq(researchRun.listingId, listingId),
        eq(researchRun.status, "running"),
        gt(researchRun.updatedAt, new Date(Date.now() - 3 * 60_000)),
      ),
    );
  if (running) return { id: running.id, started: false };

  const photo = await firstPhoto(listingId);
  const [run] = await db
    .insert(researchRun)
    .values({ listingId, steps: initialSteps(Boolean(photo)) })
    .returning({ id: researchRun.id });
  return { id: run!.id, started: true };
}

export async function latestRun(listingId: string) {
  const [run] = await db
    .select()
    .from(researchRun)
    .where(eq(researchRun.listingId, listingId))
    .orderBy(desc(researchRun.createdAt))
    .limit(1);
  return run ?? null;
}

async function firstPhoto(listingId: string) {
  const [p] = await db
    .select()
    .from(listingPhoto)
    .where(and(eq(listingPhoto.listingId, listingId), eq(listingPhoto.isVideo, false)))
    .orderBy(listingPhoto.position)
    .limit(1);
  if (!p?.fileId) return null;
  return readFileBytes(p.fileId);
}

/** Runs every step, writing progress as it goes. Never throws. */
export async function runResearch(runId: string) {
  const [run] = await db.select().from(researchRun).where(eq(researchRun.id, runId));
  if (!run) return;
  const [row] = await db.select().from(listing).where(eq(listing.id, run.listingId));
  if (!row) return;

  let steps = run.steps;
  const set = async (key: Step, patch: Partial<ResearchStepRow>) => {
    steps = steps.map((s) => (s.key === key ? { ...s, ...patch } : s));
    await db.update(researchRun).set({ steps }).where(eq(researchRun.id, runId));
  };

  try {
    const prompt = row.prompt ?? row.name ?? "";
    const photo = await firstPhoto(row.id);

    /* identify */
    await set("identify", {
      state: "running",
      title: photo ? "Looking at your photo" : "Reading what you wrote",
      detail: "Brand, model, colour and size",
    });
    const identity = await identify(prompt, photo);
    await set("identify", {
      state: "done",
      title: identity.name,
      detail: [identity.brand, identity.colour, identity.size].filter(Boolean).join(", ") || "Got it",
    });

    /* listings: slow (browsers), so it starts now and is collected before pricing */
    const listingsRun = compsConfigured
      ? (async () => {
          await set("listings", { state: "running", title: "Checking eBay, Poshmark and Depop", detail: "Live listings of the same thing" });
          try {
            return await findComps({ item: identity.searchQuery || identity.name, details: identityDetails(identity) });
          } catch (error) {
            console.error("Comps failed", error);
            return null;
          }
        })()
      : Promise.resolve(null);

    /* catalog */
    await set("catalog", { state: "running", title: "Searching 100M products", detail: identity.searchQuery });
    let products: C3Product[] = [];
    if (channel3Configured) {
      try {
        products = await searchProducts({
          query: identity.searchQuery,
          base64Image: photo ? photo.data.toString("base64") : undefined,
          limit: 10,
        });
      } catch (error) {
        console.error("Channel3 search failed", error);
      }
    }
    const newOnes = newOffers(products);
    const match = products[0];
    await set("catalog", {
      state: products.length ? "done" : "failed",
      title: match ? `Matched ${match.title}` : "No exact match in the catalog",
      detail: newOnes.length
        ? `New from ${dollars(Math.min(...newOnes.map((o) => o.offer.price.price)))} at ${unique(newOnes.map((o) => o.offer.domain)).slice(0, 2).join(", ")}`
        : channel3Configured
          ? "I'll price it from what you tell me"
          : "Add CHANNEL3_API_KEY to search the catalog",
    });

    /* resale */
    await set("resale", { state: "running", title: "Finding second-hand prices", detail: "Resale shops and marketplaces" });
    const used = usedOffers(products);
    const usedPrices = used.map((u) => u.offer.price.price);
    await set("resale", {
      state: "done",
      title: used.length ? `${used.length} for sale second hand` : "None for sale second hand right now",
      detail: used.length
        ? `${dollars(Math.min(...usedPrices))} to ${dollars(Math.max(...usedPrices))} on ${unique(used.map((u) => u.offer.domain)).slice(0, 3).join(", ")}`
        : "I'll lean on the new price instead",
    });

    const comps = await listingsRun;
    if (compsConfigured) {
      const n = comps?.listings.length ?? 0;
      await set("listings", {
        state: comps ? "done" : "failed",
        title: n ? `${n} like it listed now` : "No exact matches listed right now",
        detail:
          n && comps?.listedMedianCents != null
            ? `Listed around ${dollars(comps.listedMedianCents / 100)}, so likely sells for ${dollars(comps.sellsForLowCents! / 100)} to ${dollars(comps.sellsForHighCents! / 100)}`
            : `Looked at ${comps?.looked ?? 0} listings`,
      });
    }

    /* price */
    await set("price", { state: "running", title: "Working out a fair price", detail: "Weighing new and used prices" });
    const verdict = await priceIt({ prompt, identity, products, comps });
    const findings: ResearchFindings = {
      identified: identity.name,
      category: identity.category,
      price: verdict.price,
      confidence: verdict.confidence,
      facts: verdict.facts,
      sources: [...compsSource(comps), ...buildSources(products)],
      questions: verdict.questions,
      images: catalogImages(match),
      summary: verdict.summary,
      comps,
    };
    await set("price", {
      state: "done",
      title: `About $${findings.price.suggested}`,
      detail: `Most go for $${findings.price.bandLow} to $${findings.price.bandHigh}`,
    });

    // Merge into the listing. Anything the seller said wins over research.
    const [fresh] = await db.select().from(listing).where(eq(listing.id, row.id));
    const fields = mergeFields(fresh?.fields ?? [], identity.fields, findings.questions);
    await db
      .update(listing)
      .set({
        name: identity.name,
        category: identity.category,
        findings,
        fields,
        priceCents: fresh?.priceCents ?? findings.price.suggested * 100,
        lowestCents: fresh?.lowestCents ?? findings.price.bandLow * 100,
      })
      .where(eq(listing.id, row.id));
    await db.update(researchRun).set({ status: "done" }).where(eq(researchRun.id, runId));
  } catch (error) {
    console.error("Research failed", error);
    steps = steps.map((s) =>
      s.state === "running" || s.state === "queued" ? { ...s, state: "failed", detail: "Didn't finish" } : s,
    );
    await db
      .update(researchRun)
      .set({ status: "failed", steps, error: error instanceof Error ? error.message : String(error) })
      .where(eq(researchRun.id, runId));
  }
}

/* identify */

const identitySchema = z.object({
  name: z.string().describe("Short plain name a seller would use, e.g. 'Le Creuset round dutch oven'"),
  brand: z.string().nullable(),
  category: z.string().describe("One of: Clothing, Shoes, Bags, Home, Collectibles, Books, Tech, Kids, Garden, Other"),
  colour: z.string().nullable(),
  size: z.string().nullable(),
  searchQuery: z.string().describe("Best product search query: brand, model, key attributes"),
  fields: z
    .array(z.object({ key: z.string(), label: z.string(), value: z.string() }))
    .describe(
      "3 to 6 facts a buyer needs, e.g. Item, Brand, Model, Colour, Size, Material. Labels one or two words. Only what you can tell.",
    ),
});

type Identity = z.infer<typeof identitySchema>;

async function identify(prompt: string, photo: { data: Buffer; contentType: string } | null): Promise<Identity> {
  if (!aiConfigured) {
    const name = prompt.trim() || "Your item";
    return {
      name,
      brand: null,
      category: "Other",
      colour: null,
      size: null,
      searchQuery: name,
      fields: [{ key: "item", label: "Item", value: name }],
    };
  }
  const { output } = await generateText({
    model: aiModel("main"),
    output: Output.object({ schema: identitySchema }),
    instructions:
      "You identify second-hand items people want to sell. Be specific when you can see or read it (brand, model, size), and never invent details you can't tell. Labels are short and plain, in sentence case.",
    messages: [
      {
        role: "user",
        content: [
          ...(photo ? [{ type: "file" as const, mediaType: photo.contentType, data: photo.data }] : []),
          {
            type: "text" as const,
            text: `The seller says: "${prompt || "(nothing, just the photo)"}". What is it?`,
          },
        ],
      },
    ],
  });
  return output;
}

/* price */

const verdictSchema = z.object({
  min: z.number().describe("Lowest plausible resale price, whole dollars"),
  max: z.number().describe("Highest plausible resale price, whole dollars"),
  bandLow: z.number().describe("Where most sell, low end"),
  bandHigh: z.number().describe("Where most sell, high end"),
  suggested: z.number().describe("Suggested list price, whole dollars"),
  confidence: z.enum(["low", "medium", "high"]),
  facts: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("3 or 4 short facts that back the price, e.g. 'New price' '$285 at lecreuset.com'"),
  questions: z
    .array(
      z.object({
        field: z.string().describe("lowercase key, e.g. condition, box, bought, size"),
        label: z.string().describe("One or two words, e.g. Condition, Box, Bought"),
        ask: z.string().describe("One friendly question to the seller"),
        options: z
          .array(
            z.object({
              label: z.string().describe("Short answer as the seller would say it, e.g. Minor wear"),
              value: z.string().describe("How it reads in the listing, in plain words, e.g. Minor wear"),
            }),
          )
          .min(2)
          .max(4),
      }),
    )
    .min(1)
    .max(4)
    .describe("What only the seller knows that changes the price. Always include condition first."),
  summary: z.string().describe("One or two sentences to the seller about the price, warm and plain"),
});

async function priceIt({
  prompt,
  identity,
  products,
  comps,
}: {
  prompt: string;
  identity: Identity;
  products: C3Product[];
  comps: Comps | null;
}): Promise<Pick<ResearchFindings, "price" | "confidence" | "facts" | "questions" | "summary">> {
  const used = usedOffers(products).slice(0, 12);
  const fresh = newOffers(products).slice(0, 8);
  const live = comps?.listings ?? [];

  if (!aiConfigured)
    return fallbackVerdict(
      [...used.map((u) => u.offer.price.price), ...live.map((l) => l.priceCents / 100)],
      fresh.map((n) => n.offer.price.price),
    );

  const { output } = await generateText({
    model: aiModel("main"),
    output: Output.object({ schema: verdictSchema }),
    instructions:
      "You price second-hand items for a resale marketplace. Used items usually sell for 30 to 70 percent of new, less for worn or common things, more for sought-after brands. Live listings of the same item are the best evidence: things usually sell for 0 to 15 percent under their listed price, so with 3 or more of them, put the band there and price to sell within it. Base numbers on the evidence given; when it's thin, say so with low confidence. Whole dollars only.",
    prompt: [
      `Item: ${identity.name}${identity.brand ? ` by ${identity.brand}` : ""}. Category: ${identity.category}.`,
      `Seller said: "${prompt}"`,
      `New prices: ${fresh.map((n) => `${dollars(n.offer.price.price)} at ${n.offer.domain} (${n.product.title})`).join("; ") || "none found"}`,
      `Second-hand listings: ${used.map((u) => `${dollars(u.offer.price.price)} at ${u.offer.domain} (${u.product.title})`).join("; ") || "none found"}`,
      live.length
        ? `Live listings of the same item on eBay, Poshmark and Depop (checked against it one by one): ${live
            .map((l) => `${dollars(l.priceCents / 100)} on ${l.siteLabel}, ${l.condition} (${l.title}; ${l.note})`)
            .join("; ")}. Median listed ${dollars((comps!.listedMedianCents ?? 0) / 100)}. Notes: ${comps!.notes}`
        : "Live listings of the same item: none found",
    ].join("\n"),
  });

  const round = (n: number) => Math.max(1, Math.round(n));
  const [bandLow, bandHigh] = [round(output.bandLow), round(Math.max(output.bandHigh, output.bandLow))];
  return {
    price: {
      min: round(Math.min(output.min, bandLow)),
      max: round(Math.max(output.max, bandHigh)),
      bandLow,
      bandHigh,
      suggested: round(Math.min(Math.max(output.suggested, bandLow), bandHigh)),
    },
    confidence: output.confidence,
    facts: output.facts.slice(0, 4),
    questions: output.questions,
    summary: output.summary,
  };
}

const defaultQuestions: ResearchQuestion[] = [
  {
    field: "condition",
    label: "Condition",
    ask: "How's it holding up?",
    options: [
      { label: "Like new", value: "Like new" },
      { label: "Gently used", value: "Gently used" },
      { label: "Well loved", value: "Well loved" },
      { label: "Has a flaw", value: "Has a flaw" },
    ],
  },
  {
    field: "bought",
    label: "Bought",
    ask: "Roughly when did you get it?",
    options: [
      { label: "This year", value: "This year" },
      { label: "1 to 3 years ago", value: "1 to 3 years ago" },
      { label: "Longer ago", value: "Longer ago" },
      { label: "Not sure", value: "Not sure" },
    ],
  },
];

/** Without a model: a range from the numbers alone. */
function fallbackVerdict(usedPrices: number[], newPrices: number[]) {
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)]! : 0;
  };
  const base = usedPrices.length ? median(usedPrices) : newPrices.length ? median(newPrices) * 0.5 : 40;
  const r = (n: number) => Math.max(1, Math.round(n));
  return {
    price: {
      min: r(base * 0.6),
      max: r(base * 1.4),
      bandLow: r(base * 0.85),
      bandHigh: r(base * 1.15),
      suggested: r(base),
    },
    confidence: (usedPrices.length >= 5 ? "medium" : "low") as ResearchFindings["confidence"],
    facts: [
      ...(newPrices.length ? [{ label: "New price", value: `From ${dollars(Math.min(...newPrices))}` }] : []),
      { label: "Second hand", value: usedPrices.length ? `${usedPrices.length} for sale now` : "None found" },
    ],
    questions: defaultQuestions,
    summary: usedPrices.length
      ? `Second-hand ones are going for about ${dollars(base)}.`
      : "I couldn't find many sold lately, so this is a rough guess. Tell me more and I'll sharpen it.",
  };
}

/* findings helpers */

/** What the seller told us about it, for matching listings: brand, colour, size and the like. */
function identityDetails(identity: Identity) {
  return identity.fields.map((f) => `${f.label}: ${f.value}`).join("; ") || undefined;
}

/** The live listings, first in the findings sheet: they're the closest thing to what it'll sell for. */
function compsSource(comps: Comps | null): ResearchSource[] {
  if (!comps?.listings.length) return [];
  return [
    {
      key: "listings",
      label: `${comps.listings.length} listed now`,
      title: "Listed now on eBay, Poshmark and Depop",
      description: `The same thing for sale second hand, checked one by one. Things usually sell a little under their price. ${comps.notes}`,
      items: comps.listings.map((l) => ({
        title: l.title,
        detail: `${l.siteLabel}${l.condition !== "unknown" ? `, ${l.condition}` : ""}`,
        value: dollars(l.priceCents / 100),
        url: l.url,
        image: l.image ?? undefined,
      })),
    },
  ];
}

function buildSources(products: C3Product[]): ResearchSource[] {
  const used = usedOffers(products).slice(0, 8);
  const fresh = newOffers(products).slice(0, 8);
  const sources: ResearchSource[] = [];
  if (used.length)
    sources.push({
      key: "resale",
      label: `${used.length} second hand`,
      title: "For sale second hand",
      description: "Listings on resale shops right now.",
      items: used.map(({ product, offer }) => ({
        title: product.title,
        detail: offer.domain,
        value: dollars(offer.price.price),
        url: offer.url,
        image: product.images?.[0]?.url,
      })),
    });
  if (fresh.length)
    sources.push({
      key: "new",
      label: "New price",
      title: "What it costs new",
      description: "From the maker and big retailers.",
      items: fresh.map(({ product, offer }) => ({
        title: product.title,
        detail: offer.domain,
        value: dollars(offer.price.price),
        url: offer.url,
        image: product.images?.[0]?.url,
      })),
    });
  return sources;
}

function catalogImages(match: C3Product | undefined) {
  if (!match?.images) return [];
  const source = match.offers?.find((o) => o.condition !== "used")?.domain ?? match.brands?.[0]?.name ?? "the web";
  return match.images.slice(0, 6).map((img) => ({ url: img.url, source, alt: img.alt_text ?? undefined }));
}

/** Research fields plus a row for each question, keeping anything the seller set. */
function mergeFields(
  existing: ListingField[],
  found: Identity["fields"],
  questions: ResearchQuestion[],
): ListingField[] {
  const mine = new Map(existing.filter((f) => f.source === "you").map((f) => [f.key, f]));
  const out: ListingField[] = [];
  const seen = new Set<string>();
  for (const f of found) {
    const key = f.key.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(mine.get(key) ?? { key, label: f.label, value: f.value, source: "agent" });
  }
  for (const q of questions) {
    if (seen.has(q.field)) continue;
    seen.add(q.field);
    out.push(mine.get(q.field) ?? { key: q.field, label: q.label, source: "agent" });
  }
  for (const f of mine.values()) if (!seen.has(f.key)) out.push(f);
  return out;
}

function dollars(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function unique<T>(xs: T[]) {
  return [...new Set(xs)];
}
