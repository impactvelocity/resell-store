import "server-only";
import { generateText } from "ai";
import { and, db, desc, eq, gt, isNotNull, listing, ne, offer, shop, thread, user } from "@repo/db";
import { aiConfigured, aiModel } from "./ai";
import { OFFER_HOURS } from "./commerce";
import { findThread, postAgentMessage } from "./messages";
import { tidy } from "./store-agent";
import { notifyOfferAnswered } from "./notify";

/*
 * The shop's agent haggling on offers (B3 "Haggle on offers"). It runs once
 * per new offer, right after it's made:
 *
 *   at or above the lowest  leave it for the owner, with a note saying so
 *                           (the owner still says yes to the sale)
 *   under the lowest        counter, halfway between the offer and the
 *                           price (or the last counter), never under the
 *                           lowest, and tell the buyer in their messages
 *   lowest is the price     leave it for the owner
 *
 * The maths is plain code; the model only words the message to the buyer,
 * and that message must carry the exact counter or a template is used. The
 * lowest price is never told to the buyer.
 */

const HOUR = 60 * 60 * 1000;

/** The lowest the agent may go: the listing's own, else the shop's % off the price (whole dollars). */
export function lowestFor(priceCents: number, listingLowestCents: number | null, shopPercent: number) {
  if (listingLowestCents != null) return Math.min(listingLowestCents, priceCents);
  return Math.round((priceCents * (100 - shopPercent)) / 100 / 100) * 100;
}

export type Move =
  | { kind: "counter"; counterCents: number }
  /** At or above the lowest: the owner's yes. */
  | { kind: "take-it" }
  /** No room under the price. */
  | { kind: "firm" };

/**
 * What to do with an offer. Counters land on round numbers ($5 steps from
 * $100, else $1), above the offer and under the price. A buyer who was
 * countered before and comes back lower meets the agent halfway from that
 * counter, so each round gives a little, never more.
 */
export function planMove(p: {
  amountCents: number;
  priceCents: number;
  lowestCents: number;
  previousCounterCents?: number | null;
}): Move {
  const { amountCents, priceCents, lowestCents } = p;
  if (amountCents >= lowestCents) return { kind: "take-it" };
  const step = priceCents >= 10_000 ? 500 : 100;
  const anchor = Math.min(p.previousCounterCents ?? priceCents, priceCents);
  const ceiling = Math.min(anchor, priceCents - 100);
  const roundUp = (cents: number) => Math.ceil(cents / step) * step;
  const halfway = roundUp((amountCents + anchor) / 2);
  // A round number at or over the lowest, so a counter doesn't give the exact lowest away
  let counter = Math.max(roundUp(lowestCents), halfway);
  if (counter > ceiling) counter = Math.max(lowestCents, ceiling);
  if (counter >= priceCents || counter <= amountCents) return { kind: "firm" };
  return { kind: "counter", counterCents: counter };
}

const money = (cents: number) => {
  const d = cents / 100;
  return `$${Number.isInteger(d) ? d : d.toFixed(2)}`;
};

function firstName(p: { name: string | null; email: string } | undefined) {
  return (p?.name?.trim() || p?.email.split("@")[0] || "the owner").split(/\s+/)[0]!;
}

/** Answers a new offer if the shop lets its agent haggle. Never throws. */
export async function negotiate(offerId: string) {
  try {
    await turn(offerId);
  } catch (error) {
    console.error("[negotiator] turn failed", offerId, error);
  }
}

async function turn(offerId: string) {
  const [row] = await db
    .select({ offer, listing, shop })
    .from(offer)
    .innerJoin(listing, eq(listing.id, offer.listingId))
    .innerJoin(shop, eq(shop.id, offer.shopId))
    .where(eq(offer.id, offerId));
  if (!row || !row.shop.haggle || row.offer.status !== "open" || row.listing.status !== "live") return;
  const price = row.listing.priceCents;
  if (price == null) return;

  const lowest = lowestFor(price, row.listing.lowestCents, row.shop.lowestPercent);
  // Their last round on this listing, if the agent or owner countered it
  const [previous] = await db
    .select({ counterCents: offer.counterCents })
    .from(offer)
    .where(
      and(
        eq(offer.listingId, row.listing.id),
        eq(offer.buyerId, row.offer.buyerId),
        ne(offer.id, row.offer.id),
        isNotNull(offer.counterCents),
      ),
    )
    .orderBy(desc(offer.createdAt))
    .limit(1);
  const move = planMove({
    amountCents: row.offer.amountCents,
    priceCents: price,
    lowestCents: lowest,
    previousCounterCents: previous?.counterCents,
  });

  if (move.kind !== "counter") {
    const note =
      move.kind === "firm"
        ? `Your lowest is your price on this one, so I didn't counter. It's your call.`
        : row.offer.amountCents === lowest
          ? `That's right at your lowest (${money(lowest)}). Say yes and it's a sale.`
          : `That's above your lowest (${money(lowest)}). I'd take it.`;
    await db
      .update(offer)
      .set({ agentNote: note })
      .where(and(eq(offer.id, row.offer.id), eq(offer.status, "open")));
    return;
  }

  // Counter, unless the owner answered or it ran out in the meantime
  const now = new Date();
  const counter = move.counterCents;
  const [countered] = await db
    .update(offer)
    .set({
      status: "countered",
      counterCents: counter,
      counteredBy: "agent",
      agentNote:
        counter === lowest
          ? `I countered at your lowest, ${money(counter)}.`
          : `I countered at ${money(counter)}. Your lowest is ${money(lowest)}, so there's still room if they come back.`,
      respondedAt: now,
      expiresAt: new Date(now.getTime() + OFFER_HOURS * HOUR),
    })
    .where(and(eq(offer.id, row.offer.id), eq(offer.status, "open"), gt(offer.expiresAt, now)))
    .returning();
  if (!countered) return;

  await Promise.all([notifyOfferAnswered(countered.id), tellBuyer(row, counter)]);
}

/** The counter, in the buyer's messages with the shop about this listing. */
async function tellBuyer(
  row: { offer: typeof offer.$inferSelect; listing: typeof listing.$inferSelect; shop: typeof shop.$inferSelect },
  counterCents: number,
) {
  const [buyer] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.offer.buyerId));
  const [owner] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.shop.ownerId));
  const title = row.listing.title ?? row.listing.name ?? "it";
  const facts = {
    buyer: firstName(buyer),
    owner: firstName(owner),
    title,
    offer: money(row.offer.amountCents),
    price: money(row.listing.priceCents ?? counterCents),
    counter: money(counterCents),
    note: row.offer.note,
  };

  let body = template(facts);
  if (aiConfigured) {
    try {
      const { text } = await generateText({
        model: aiModel("fast"),
        instructions: [
          `You write one short, warm message from ${facts.owner}'s shop assistant to a buyer, on resell.store.`,
          "Two or three sentences, plain text, no markdown, emoji, em dashes or sign-off.",
          `Refer to the owner as ${facts.owner} or "they", never "he" or "she".`,
          `Say thanks for the offer, that ${facts.owner} can't go as low as ${facts.offer}, but can do ${facts.counter}. Write the counter exactly as ${facts.counter}.`,
          `Say it's waiting under Offers in their account for ${OFFER_HOURS} hours if they'd like to take it.`,
          "If the buyer left a note, nod to it briefly. Never mention any other price, discount or lowest price.",
        ].join("\n"),
        prompt: `Buyer: ${facts.buyer}\nItem: ${facts.title}\nAsking price: ${facts.price}\nTheir offer: ${facts.offer}\nCounter: ${facts.counter}${facts.note ? `\nTheir note: "${facts.note}"` : ""}`,
      });
      const written = tidy(text);
      // Only the counter, their offer and the asking price may appear; anything else and the template goes instead
      const prices = written.match(/\$\d[\d,]*(\.\d{2})?/g) ?? [];
      if (written && written.includes(facts.counter) && prices.every((p) => [facts.counter, facts.offer, facts.price].includes(p)))
        body = written;
    } catch (error) {
      console.error("[negotiator] wording the counter failed, using the template", error);
    }
  }

  await db
    .insert(thread)
    .values({ shopId: row.shop.id, buyerId: row.offer.buyerId, listingId: row.listing.id })
    .onConflictDoNothing();
  const t = await findThread({ buyerId: row.offer.buyerId, shopId: row.shop.id, listingId: row.listing.id });
  if (t) await postAgentMessage(t.id, body, { needsSeller: false });
}

function template(f: { buyer: string; owner: string; title: string; offer: string; counter: string }) {
  return `Hi ${f.buyer}, thanks for your ${f.offer} offer on the ${f.title}. ${f.owner} can't go quite that low, but can do ${f.counter}. It's waiting under Offers in your account for the next ${OFFER_HOURS} hours if you'd like it.`;
}
