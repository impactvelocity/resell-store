import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { and, db, eq, listingCopy } from "@repo/db";
import { aiConfigured, aiModel } from "./ai";
import { refreshEmbedding, updateListing, type CopyRow, type ListingRow } from "./listings";
import { toDollars } from "../money";

/*
 * C6 Words. The agent writes a take (title, one-liner, description, teaser) in
 * the chosen tone; every take is kept as a listing_copy row so the person can
 * step back through them, and the one on screen is copied onto the listing.
 * Used by the words step (app/actions/listing-words.ts) and the API.
 */

export const tones = ["Friendly", "Playful", "Straight to the point", "A bit luxe"] as const;
export type WordsTone = (typeof tones)[number];

export const toneGuide: Record<WordsTone, string> = {
  Friendly: "Warm and chatty, first person, like telling a friend about it. Plain words.",
  Playful: "Light and a little cheeky. One small joke at most. Still clear about the facts.",
  "Straight to the point": "Short factual sentences. No adjectives that don't carry information. No fluff.",
  "A bit luxe": "Polished and quietly elegant. Sensory where it's earned, never over the top.",
};

export type WordsCopy = {
  id: string;
  tone: string;
  title: string;
  oneLiner: string;
  description: string;
  teaser: string;
};

export type WordsResult =
  | { ok: true; copy: WordsCopy }
  | { ok: false; reason: "no-key" | "failed"; message: string };

export const titleMax = 80;
export const oneLinerMax = 120;

export function toCopy(row: CopyRow): WordsCopy {
  return {
    id: row.id,
    tone: row.tone,
    title: row.title,
    oneLiner: row.oneLiner,
    description: row.description,
    teaser: row.teaser,
  };
}

/** Cuts at a word boundary so a long line never breaks the 80/120 limits. */
export function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 12)).replace(/[\s,;:.-]+$/, "");
}

const copySchema = z.object({
  title: z.string().describe(`The listing title, ${titleMax} characters at most. What it is first: brand, item, key detail like size or colour.`),
  oneLiner: z.string().describe(`One line under the title, ${oneLinerMax} characters at most. Why someone would want it.`),
  description: z.string().describe("The description: 2 to 5 short sentences, one paragraph, about 40 to 110 words. Condition stated honestly."),
  teaser: z.string().describe("A 3 to 7 word hook shown under the title on the shop card. No full stop."),
});

const instructionFor: Record<"take" | "shorter" | "longer", string> = {
  take: "Write a fresh take that reads differently from the current one. Same facts.",
  shorter: "Make the description noticeably shorter (about half). Keep the title, one-liner and teaser as they are unless they break the rules.",
  longer: "Add more useful detail to the description from the facts below (condition, size, what it's good for, care, shipping). Keep the title, one-liner and teaser unless they break the rules.",
};

function brief(row: ListingRow, writingStyle: string | null, current: WordsCopy | null) {
  const lines: string[] = [];
  lines.push(`Item: ${row.title ?? row.name ?? "an item"}`);
  if (row.prompt) lines.push(`What the seller first said: ${row.prompt}`);
  if (row.category) lines.push(`Category: ${row.category}`);
  const fields = row.fields.filter((f) => f.value);
  if (fields.length)
    lines.push(
      `Details (lines marked "seller said" are the seller's own answers and win over anything else here, including what they first said):\n${fields
        .map((f) => `- ${f.label}: ${f.value}${f.source === "you" ? " (seller said)" : ""}`)
        .join("\n")}`,
    );
  if (row.priceCents != null) lines.push(`Price: $${toDollars(row.priceCents)}`);
  const f = row.findings;
  if (f) {
    if (f.identified) lines.push(`Research identified it as: ${f.identified}`);
    if (f.summary) lines.push(`Research summary: ${f.summary}`);
    if (f.facts?.length) lines.push(`Facts from research:\n${f.facts.map((x) => `- ${x.label}: ${x.value}`).join("\n")}`);
  }
  if (writingStyle) lines.push(`The seller's usual style: ${writingStyle}`);
  if (current) {
    lines.push(
      `Current version:\nTitle: ${current.title}\nOne-liner: ${current.oneLiner}\nDescription: ${current.description}\nTeaser: ${current.teaser}`,
    );
  }
  return lines.join("\n\n");
}

/**
 * Writes a new take and puts it on the listing. `instruction` is "take", "shorter", "longer", free text
 * from the composer, or nothing for a first draft or a tone change.
 */
export async function generateWords(
  listing: ListingRow,
  writingStyle: string | null,
  input: { tone: string; instruction?: string; fromCopyId?: string | null },
): Promise<WordsResult> {
  const parsed = z
    .object({
      tone: z.enum(tones),
      instruction: z.string().trim().max(500).optional(),
      fromCopyId: z.string().max(64).nullish(),
    })
    .parse(input);

  if (!aiConfigured) {
    return {
      ok: false,
      reason: "no-key",
      message: "The writing agent needs an Anthropic key. Add ANTHROPIC_API_KEY to apps/app/.env.local and restart the dev server.",
    };
  }

  let current: WordsCopy | null = null;
  if (parsed.fromCopyId) {
    const [row] = await db
      .select()
      .from(listingCopy)
      .where(and(eq(listingCopy.id, parsed.fromCopyId), eq(listingCopy.listingId, listing.id)));
    if (row) current = toCopy(row);
  }
  // Edits by hand live on the listing, so start from those
  if (current) {
    current = {
      ...current,
      title: listing.title ?? current.title,
      oneLiner: listing.oneLiner ?? current.oneLiner,
      description: listing.description ?? current.description,
    };
  }

  const words = (current?.description ?? "").split(/\s+/).filter(Boolean).length;
  const ask = parsed.instruction
    ? parsed.instruction === "shorter" && words > 0
      ? `${instructionFor.shorter} The description is ${words} words now; the new one must be ${Math.max(15, Math.round(words / 2))} words or fewer.`
      : (instructionFor[parsed.instruction as keyof typeof instructionFor] ??
      `The seller asked: "${parsed.instruction}". Rewrite to do that, keeping everything else true.`)
    : current
      ? `Rewrite it in the new tone. Same facts.`
      : "Write the first version.";

  try {
    const { output } = await generateText({
      model: aiModel("main"),
      instructions: [
        "You write listings for resell.store, where people sell their own secondhand things.",
        "Write as the seller, in first person where it fits. Plain, specific, honest. Never invent facts, measurements, history or condition that aren't given; leave out what you don't know.",
        "Condition must match the Condition line in every part (title, one-liner, description, teaser). If it says 'Minor wear', don't call it 'barely used' or 'like new' anywhere.",
        "No em dashes, no exclamation marks in the title, no emoji, no hashtags, no ALL CAPS, no 'must-have', 'stunning', 'gorgeous' or similar filler.",
        `Tone: ${parsed.tone}. ${toneGuide[parsed.tone]}`,
      ].join("\n"),
      prompt: `${brief(listing, writingStyle, current)}\n\nTask: ${ask}`,
      output: Output.object({ schema: copySchema }),
    });

    const [row] = await db
      .insert(listingCopy)
      .values({
        listingId: listing.id,
        tone: parsed.tone,
        title: clip(output.title, titleMax),
        oneLiner: clip(output.oneLiner, oneLinerMax),
        description: output.description.trim(),
        teaser: clip(output.teaser, 60).replace(/\.$/, ""),
      })
      .returning();
    await applyCopy(listing, row!);
    return { ok: true, copy: toCopy(row!) };
  } catch (error) {
    console.error("Writing the words failed", listing.id, error);
    return { ok: false, reason: "failed", message: "I couldn't write that one. Try again in a moment?" };
  }
}

export async function applyCopy(listing: ListingRow, copy: CopyRow) {
  const updated = await updateListing(listing.id, {
    title: copy.title,
    oneLiner: copy.oneLiner,
    description: copy.description,
    tone: copy.tone,
  });
  if (updated.status === "live") await refreshEmbedding(updated);
}

