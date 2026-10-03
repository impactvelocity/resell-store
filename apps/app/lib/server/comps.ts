import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { aiConfigured, aiModel } from "./ai";
import type { Comp, Comps } from "@repo/db";
import { kernelConfigured, searchSite, sites, type RawCard, type SiteKey } from "./kernel";

/*
 * Comps: what the same thing is listed for second hand right now. Sold
 * prices are out of reach (eBay put them behind a login in 2026), so this
 * reads live listings instead and assumes things sell a little under what
 * they're listed at.
 *
 *   1. a few ways a seller might name it ("polaroid now+ gen 2", "polaroid
 *      now plus generation 2 instant camera")
 *   2. those searched on eBay, Poshmark and Depop in Kernel browsers
 *   3. the model checks each listing card: the same item (any colour), a
 *      bundle with extras, or something else, and reads its price
 *   4. up to 10 matches are kept; the listed median, a sells-for range
 *      (85–100% of it) and notes come from those
 *
 * Used by the research step (C2) and the shopping sidekick (D4).
 */

export const compsConfigured = kernelConfigured && aiConfigured;

const SEARCH_SITES: SiteKey[] = ["ebay", "poshmark", "depop"];
/** Fewer exact matches than this and bundles fill in. */
const ENOUGH = 5;
const KEEP = 10;
/** Things sell for a bit under where they're listed. */
const SELLS_LOW = 0.85;
const SELLS_MID = 0.92;

export type { Comp, Comps };

const queriesSchema = z.object({
  queries: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("Search box queries a reseller would type, short and specific, most specific first"),
});

/** Two or three ways people list it, so a site's search finds it whatever they called it. */
async function searchQueries(item: string, details: string | undefined) {
  try {
    const { output } = await generateText({
      model: aiModel("fast"),
      output: Output.object({ schema: queriesSchema }),
      instructions:
        "You write marketplace search queries (eBay, Poshmark, Depop) for second-hand items. 2 to 6 words each. Brand and model first; include the variant that changes the price (generation, size, colour) in the first query only. No quotes or operators.",
      prompt: `Item: ${item}${details ? `\nDetails: ${details}` : ""}`,
    });
    const qs = output.queries.map((q) => q.trim()).filter(Boolean);
    return qs.length ? [...new Set(qs)].slice(0, 3) : [item];
  } catch {
    return [item];
  }
}

const matchSchema = z.object({
  listings: z.array(
    z.object({
      i: z.number().describe("The listing's number"),
      match: z
        .enum(["same", "bundle", "different"])
        .describe(
          "same: the same model/size/edition (any colour), alone or with small extras like a strap or box. bundle: the same model with extras that add real value (film packs, lenses, a second item). different: another model, generation, size or edition, a part or accessory on its own, a lot, or broken / for parts",
        ),
      price: z.number().describe("The current asking price in dollars (the sale price if two are shown, not the crossed-out one). 0 if none"),
      condition: z.enum(["new", "used", "unknown"]),
      title: z.string().describe("The listing's own title, tidied, under 80 characters. Don't add the site name; if the card has no real title, describe it from what's shown"),
      note: z.string().describe("A few words on why, e.g. 'Same, camera only' or 'Bundle with 2 packs of film'"),
    }),
  ),
  notes: z
    .string()
    .describe(
      "Two or three short plain sentences (under 60 words) to a reseller, never citing listing numbers, about the market for this item: where matching listings cluster, what pushes some higher or lower (bundles, condition, colour), and look-alikes to watch for. Don't describe your own process (never 'I excluded' or 'marked as'). Only numbers that are in the listings.",
    ),
});

/** Reads live listings for an item and prices it from them. Null when Kernel or the model isn't set up. */
export async function findComps(input: { item: string; details?: string }): Promise<Comps | null> {
  if (!compsConfigured) return null;
  const t0 = Date.now();
  const queries = await searchQueries(input.item, input.details);
  const t1 = Date.now();
  const results = await Promise.all(
    SEARCH_SITES.map(async (s) => {
      const r = await searchSite(s, queries);
      console.info(`[comps] ${s}: ${r.cards.length} cards in ${((Date.now() - t1) / 1000).toFixed(0)}s`);
      return r;
    }),
  );
  const t2 = Date.now();
  for (const r of results) if (r.error) console.warn(`[comps] ${r.site} failed: ${r.error.slice(0, 300)}`);

  // Take a fair share from each site so one big site doesn't crowd the rest out
  const cards: RawCard[] = results.flatMap((r) => r.cards.slice(0, 16));
  const base = {
    item: input.item,
    queries,
    checkedAt: new Date().toISOString(),
    looked: cards.length,
  };
  if (!cards.length)
    return summarize({ ...base, sites: siteRows(results, []), listings: [], notes: "No listings came back from the marketplaces just now." });

  const { output } = await generateText({
    // The fast model let look-alikes through in testing, so matching uses the main one
    model: aiModel("main"),
    output: Output.object({ schema: matchSchema }),
    instructions:
      "You check second-hand marketplace listings against one item, for a pricing tool. Be strict: a different generation, size, capacity or edition is 'different', and so are parts, accessories, empty boxes, lots and anything broken. Read prices exactly as shown.",
    prompt: [
      `The item: ${input.item}${input.details ? `\nDetails: ${input.details}` : ""}`,
      "Listings (site, then the card's text):",
      ...cards.map((c, i) => `${i}. [${sites[c.site].label}] ${c.text} | link: ${slug(c.url)}`),
    ].join("\n"),
  });

  console.info(`[comps] queries ${((t1 - t0) / 1000).toFixed(0)}s, sites ${((t2 - t1) / 1000).toFixed(0)}s, matching ${((Date.now() - t2) / 1000).toFixed(0)}s`);
  const judged = output.listings
    .map((l) => ({ l, card: cards[l.i] }))
    .filter((x): x is { l: (typeof output.listings)[number]; card: RawCard } => !!x.card && x.l.price > 0);
  const toComp = ({ l, card }: (typeof judged)[number]): Comp => ({
    site: card.site,
    siteLabel: sites[card.site].label,
    title: l.title,
    priceCents: Math.round(l.price * 100),
    url: card.url,
    image: card.image,
    condition: l.condition,
    note: l.note,
  });
  const same = judged.filter((x) => x.l.match === "same").map(toComp);
  const bundles = judged.filter((x) => x.l.match === "bundle").map(toComp);
  // Thin on exact matches: bundles fill in, and their note says so
  const kept = same.length >= ENOUGH ? same : [...same, ...spread(bundles, ENOUGH - same.length)];
  // Used ones first: they're what a second-hand price comes from
  const ordered = [...kept.filter((c) => c.condition !== "new"), ...kept.filter((c) => c.condition === "new")];
  const listings = spread(withoutOutliers(ordered), KEEP).sort((a, b) => a.priceCents - b.priceCents);
  return summarize({ ...base, sites: siteRows(results, listings), listings, notes: output.notes.trim() });
}

/** Drops asks far from the rest (a typo, a "don't sell" price): under 40% or over 250% of the median. */
function withoutOutliers(comps: Comp[]) {
  if (comps.length < 4) return comps;
  const median = quantile(comps.map((c) => c.priceCents).sort((a, b) => a - b), 0.5)!;
  return comps.filter((c) => c.priceCents >= median * 0.4 && c.priceCents <= median * 2.5);
}

/** The readable part of a listing link: "im_overheated-polaroidnow-gen-1-black-camera-f891". */
function slug(url: string) {
  return decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "").slice(0, 100);
}

/** Up to `n`, taking from each site in turn so the picture isn't one site's. */
function spread(comps: Comp[], n: number) {
  const bySite = new Map<SiteKey, Comp[]>();
  for (const c of comps) bySite.set(c.site, [...(bySite.get(c.site) ?? []), c]);
  const out: Comp[] = [];
  while (out.length < n && [...bySite.values()].some((l) => l.length)) {
    for (const list of bySite.values()) {
      const next = list.shift();
      if (next && out.length < n) out.push(next);
    }
  }
  return out;
}

function siteRows(results: Awaited<ReturnType<typeof searchSite>>[], kept: Comp[]) {
  return results.map((r) => ({
    site: r.site,
    label: sites[r.site].label,
    found: kept.filter((c) => c.site === r.site).length,
    ok: !r.error || r.cards.length > 0,
  }));
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo));
}

const roundDollar = (cents: number | null) => (cents == null ? null : Math.round(cents / 100) * 100);

/**
 * The numbers. Second-hand prices come from used listings (and ones that
 * don't say); new-in-box asks only stand in when there are no used ones,
 * and then confidence stays low.
 */
function summarize(c: Omit<Comps, "listedLowCents" | "listedMedianCents" | "listedHighCents" | "sellsForCents" | "sellsForLowCents" | "sellsForHighCents" | "confidence">): Comps {
  const used = c.listings.filter((l) => l.condition !== "new");
  const basis = (used.length >= 2 ? used : c.listings).map((l) => l.priceCents).sort((a, b) => a - b);
  const median = quantile(basis, 0.5);
  const low = quantile(basis, 0.25);
  const high = quantile(basis, 0.75);
  // Tight cluster and plenty of used matches: trust it more
  const spreadRatio = median && low != null && high != null ? (high - low) / median : 1;
  const confidence =
    used.length < 2 ? "low" : basis.length >= 6 && spreadRatio < 0.5 ? "high" : basis.length >= 3 ? "medium" : "low";
  return {
    ...c,
    listedLowCents: low,
    listedMedianCents: median,
    listedHighCents: high,
    sellsForCents: roundDollar(median != null ? median * SELLS_MID : null),
    sellsForLowCents: roundDollar(median != null ? median * SELLS_LOW : null),
    sellsForHighCents: roundDollar(median),
    confidence,
  };
}

/**
 * How well it holds value: likely resale over what it costs new. 0.8 means
 * you'd get about 80% back.
 */
export function resaleRatio(sellsForCents: number | null, retailCents: number | null) {
  if (!sellsForCents || !retailCents) return null;
  return Math.round((sellsForCents / retailCents) * 100) / 100;
}

export function resaleVerdict(ratio: number | null) {
  if (ratio == null) return { key: "unknown" as const, label: "Not sure yet" };
  if (ratio >= 0.6) return { key: "holds" as const, label: "Holds its value" };
  if (ratio >= 0.35) return { key: "some" as const, label: "Keeps some of it" };
  return { key: "loses" as const, label: "Loses most of it" };
}
