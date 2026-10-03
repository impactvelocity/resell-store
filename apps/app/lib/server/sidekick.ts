import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { and, db, desc, eq, priceCheck } from "@repo/db";
import { aiConfigured, aiModel } from "./ai";
import { channel3Configured, newOffers, searchProducts } from "./channel3";
import { compsConfigured, findComps, resaleRatio, resaleVerdict } from "./comps";
import { readProductPage } from "./kernel";
import { runAfterResponse } from "./later";

/*
 * D4 Shopping sidekick: "is this worth buying to resell?" Someone types what
 * they're eyeing ("black Reformation wrap dress, $120") or pastes a link, and
 * a check runs in the background:
 *
 *   read     what it is and what it costs them (the link's page, or what they said)
 *   new      what it costs new (Channel3), when they didn't say a price
 *   comps    what the same thing is listed for second hand (comps.ts)
 *
 * The score is what it likely sells for over what it costs. Two dresses at
 * the same price: one keeps 80% of it, the other 50%; buy the first.
 */

export class SidekickError extends Error {}

export type CheckRow = typeof priceCheck.$inferSelect;

export const sidekickReady = compsConfigured;

/** Starts a check; it finishes in the background (about a minute). */
export async function startCheck(userId: string, query: string) {
  const text = query.trim().slice(0, 500);
  if (!text) throw new SidekickError("Paste a link or say what you're eyeing first.");
  if (!sidekickReady) throw new SidekickError("The sidekick needs KERNEL_API_KEY and ANTHROPIC_API_KEY to check prices.");
  const [row] = await db.insert(priceCheck).values({ userId, query: text }).returning();
  runAfterResponse(() => runCheck(row!.id));
  return row!;
}

export async function listChecks(userId: string) {
  return db.select().from(priceCheck).where(eq(priceCheck.userId, userId)).orderBy(desc(priceCheck.createdAt)).limit(30);
}

export async function getCheck(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(priceCheck)
    .where(and(eq(priceCheck.id, id), eq(priceCheck.userId, userId)));
  return row ?? null;
}

export async function setBought(userId: string, id: string, bought: boolean) {
  const [row] = await db
    .update(priceCheck)
    .set({ bought })
    .where(and(eq(priceCheck.id, id), eq(priceCheck.userId, userId)))
    .returning();
  if (!row) throw new SidekickError("That check isn't yours.");
  return row;
}

export async function removeCheck(userId: string, id: string) {
  await db.delete(priceCheck).where(and(eq(priceCheck.id, id), eq(priceCheck.userId, userId)));
}

/** The numbers a check shows, worked out from its row. */
export function checkScore(row: Pick<CheckRow, "retailCents" | "comps">) {
  const sellsFor = row.comps?.sellsForCents ?? null;
  const ratio = resaleRatio(sellsFor, row.retailCents);
  return {
    sellsForCents: sellsFor,
    ratio,
    verdict: resaleVerdict(ratio),
    /** What it really costs you if you sell it on later. */
    netCostCents: row.retailCents != null && sellsFor != null ? Math.max(0, row.retailCents - sellsFor) : null,
  };
}

/* The check itself */

const readSchema = z.object({
  name: z.string().describe("Short plain name with brand and the detail that matters, e.g. 'Reformation black wrap midi dress'"),
  searchQuery: z.string().describe("Marketplace search query: brand, model or style name, key attribute. 2 to 6 words"),
  details: z.string().nullable().describe("Colour, size, material, model year, if known"),
  price: z.number().nullable().describe("What it costs them in US dollars (the shop's current price), if given. Null if not"),
});

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

async function readItem(query: string) {
  let source = "";
  let image: string | null = null;
  if (isUrl(query)) {
    const page = await readProductPage(query.trim());
    image = page.image;
    source = [
      `Link: ${query}`,
      `Page title: ${page.ogTitle ?? page.title}`,
      page.price ? `Listed price: ${page.price} ${page.currency ?? ""}` : "",
      page.ld ? `Structured data: ${page.ld}` : "",
      `Page text: ${page.text}`,
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    source = `They wrote: "${query}"`;
  }
  const { output } = await generateText({
    model: aiModel("fast"),
    output: Output.object({ schema: readSchema }),
    instructions:
      "Someone is out shopping and wants to know if an item holds its resale value. Work out exactly what the item is and what it costs them. Never invent a price; null if none is given or shown.",
    prompt: source,
  });
  return { ...output, fromLink: isUrl(query), image };
}

/** What it costs new: the top catalog match's new offers, middle price. */
async function newPrice(query: string) {
  if (!channel3Configured) return null;
  try {
    const products = await searchProducts({ query, limit: 5 });
    const offers = newOffers(products.slice(0, 1).length ? products.slice(0, 1) : products);
    if (!offers.length) return null;
    const sorted = offers.sort((a, b) => a.offer.price.price - b.offer.price.price);
    const mid = sorted[Math.floor(sorted.length / 2)]!;
    return { cents: Math.round(mid.offer.price.price * 100), source: `new at ${mid.offer.domain}` };
  } catch (error) {
    console.error("[sidekick] new price failed", error);
    return null;
  }
}

/** Runs a check to the end and saves it. Never throws. */
export async function runCheck(id: string) {
  const [row] = await db.select().from(priceCheck).where(eq(priceCheck.id, id));
  if (!row || row.status !== "running") return;
  try {
    if (!aiConfigured) throw new SidekickError("The sidekick needs ANTHROPIC_API_KEY.");
    const item = await readItem(row.query);
    await db.update(priceCheck).set({ name: item.name }).where(eq(priceCheck.id, id));

    const [comps, fresh] = await Promise.all([
      findComps({ item: item.searchQuery || item.name, details: item.details ?? undefined }),
      item.price == null ? newPrice(item.searchQuery || item.name) : Promise.resolve(null),
    ]);
    const cost =
      item.price != null
        ? { cents: Math.round(item.price * 100), source: item.fromLink ? "the link" : "you said" }
        : fresh;

    await db
      .update(priceCheck)
      .set({
        status: "done",
        name: item.name,
        retailCents: cost?.cents ?? null,
        retailSource: cost?.source ?? null,
        comps,
      })
      .where(eq(priceCheck.id, id));
  } catch (error) {
    console.error("[sidekick] check failed", id, error);
    await db
      .update(priceCheck)
      .set({
        status: "failed",
        error: error instanceof SidekickError ? error.message : "Couldn't finish that one. Try again?",
      })
      .where(eq(priceCheck.id, id));
  }
}
