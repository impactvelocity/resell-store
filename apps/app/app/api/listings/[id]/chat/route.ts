import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, db, eq, listingMessage, type ListingStep } from "@repo/db";
import { aiConfigured, aiModel } from "../../../../../lib/server/ai";
import { getOwnedListing, setField, updateListing, type ListingRow } from "../../../../../lib/server/listings";
import { getSession } from "../../../../../lib/server/session";

/*
 * The agent beside the listing (C3 findings and C4 details). It can change what
 * the canvas shows through tools; the page refreshes from the database when a
 * reply ends. Messages are kept per step in listing_message.
 */

export const maxDuration = 60;

const steps = ["research", "details"] as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const owned = await getOwnedListing(session.user.id, (await params).id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!aiConfigured)
    return NextResponse.json(
      { error: "The agent needs ANTHROPIC_API_KEY in apps/app/.env.local." },
      { status: 503 },
    );

  const body = (await req.json()) as { messages: UIMessage[]; step?: string };
  const step: ListingStep = steps.includes(body.step as (typeof steps)[number])
    ? (body.step as ListingStep)
    : "details";
  const listingId = owned.listing.id;

  // Each tool re-reads the row so several changes in one reply build on each other
  const current = async () => (await getOwnedListing(session.user.id, listingId))!.listing;

  const result = streamText({
    model: aiModel("main"),
    instructions: instructionsFor(owned.listing, owned.shop.name, step),
    messages: await convertToModelMessages(body.messages),
    stopWhen: isStepCount(5),
    tools: {
      set_field: tool({
        description:
          "Change or add one line in 'The item' card, e.g. condition, size, colour. To change an existing line, pass its exact [key] from the list in your instructions.",
        inputSchema: z.object({
          key: z.string().describe("lowercase key, e.g. condition"),
          label: z.string().describe("Short label, e.g. Condition"),
          value: z.string().describe("The new value, short and plain"),
        }),
        execute: async ({ key, label, value }) => {
          const row = await current();
          await updateListing(listingId, { fields: setField(row.fields, key, value, label) });
          return { changed: label, to: value };
        },
      }),
      set_price: tool({
        description: "Set the asking price in whole dollars. Keeps the lowest price at or below it.",
        inputSchema: z.object({ price: z.number().int().min(1) }),
        execute: async ({ price }) => {
          const row = await current();
          const priceCents = price * 100;
          await updateListing(listingId, {
            priceCents,
            lowestCents: row.lowestCents != null ? Math.min(row.lowestCents, priceCents) : null,
          });
          return { changed: "Price", to: `$${price}` };
        },
      }),
      set_lowest: tool({
        description:
          "Set the private lowest price the agent may accept from buyers, whole dollars. Never above the price.",
        inputSchema: z.object({ lowest: z.number().int().min(0) }),
        execute: async ({ lowest }) => {
          const row = await current();
          const cents = Math.min(lowest * 100, row.priceCents ?? lowest * 100);
          await updateListing(listingId, { lowestCents: cents });
          return { changed: "Lowest you'd take", to: `$${cents / 100}` };
        },
      }),
      set_take_offers: tool({
        description: "Turn offers from buyers on or off.",
        inputSchema: z.object({ takeOffers: z.boolean() }),
        execute: async ({ takeOffers }) => {
          await updateListing(listingId, { takeOffers });
          return { changed: "Offers", to: takeOffers ? "On" : "Off" };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: body.messages,
      onEnd: async ({ messages }) => {
        await saveMessages(listingId, step, messages);
      },
    }),
  });
}

function instructionsFor(row: ListingRow, shopName: string, step: ListingStep) {
  const f = row.findings;
  const facts = row.fields
    .map((x) => `- ${x.label} [key: ${x.key}]: ${x.value ?? "(not known yet)"}`)
    .join("\n");
  return [
    `You are the seller's listing agent on resell.store, helping list one item in their shop "${shopName}".`,
    `Voice: warm, brief, plain. One to three short sentences. No lists, no emoji, no markdown.`,
    `When the seller asks for a change, make it with the tools, then confirm in a few words. Say if a price is above or below what these usually sell for.`,
    `Never invent facts about the item. If something's unclear, ask one question.`,
    step === "research"
      ? `They're looking at what your research found (step 1 of 5). Next step is checking the details and price.`
      : `They're checking the details and setting the price (step 2 of 5). Next is photos.`,
    ``,
    `Item: ${row.name ?? row.prompt ?? "unknown"}`,
    `What they first said: "${row.prompt ?? ""}"`,
    `Lines in the listing:\n${facts || "- none yet"}`,
    `Price: ${row.priceCents != null ? `$${row.priceCents / 100}` : "not set"}. Lowest they'd take: ${row.lowestCents != null ? `$${row.lowestCents / 100}` : "not set"}. Offers: ${row.takeOffers ? "on" : "off"}.`,
    f
      ? `Research: most sell for $${f.price.bandLow}–$${f.price.bandHigh} (range $${f.price.min}–$${f.price.max}), suggested $${f.price.suggested}, ${f.confidence} confidence. ${f.summary}`
      : `Research hasn't finished.`,
  ].join("\n");
}

async function saveMessages(listingId: string, step: ListingStep, messages: UIMessage[]) {
  await db.transaction(async (tx) => {
    await tx
      .delete(listingMessage)
      .where(and(eq(listingMessage.listingId, listingId), eq(listingMessage.step, step)));
    if (messages.length === 0) return;
    await tx.insert(listingMessage).values(
      messages.map((m, i) => ({
        id: `${listingId}:${step}:${m.id}`,
        listingId,
        step,
        role: m.role,
        parts: m.parts as unknown[],
        // Keep order stable when several land in the same millisecond
        createdAt: new Date(Date.now() - (messages.length - i)),
      })),
    );
  });
}
