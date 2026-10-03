"use server";

import { z } from "zod";
import { and, db, desc, eq, listingCopy, user as userTable } from "@repo/db";
import { refreshEmbedding, requireOwnedListing, updateListing } from "../../lib/server/listings";
import {
  applyCopy,
  clip,
  generateWords,
  oneLinerMax,
  titleMax,
  toneGuide,
  tones,
  type WordsResult,
} from "../../lib/server/words";

export type { WordsCopy, WordsResult, WordsTone } from "../../lib/server/words";

/* C6 Words: the writing itself lives in lib/server/words.ts. */

/**
 * Writes a new take. `instruction` is "take", "shorter", "longer", free text
 * from the composer, or nothing for a first draft or a tone change.
 */
export async function writeWords(
  listingId: string,
  input: { tone: string; instruction?: string; fromCopyId?: string | null },
): Promise<WordsResult> {
  const { user, listing } = await requireOwnedListing(z.string().min(1).max(64).parse(listingId));
  return generateWords(listing, user.writingStyle, input);
}

/** Stepping between versions: the one on screen becomes the listing's words. */
export async function chooseWords(listingId: string, copyId: string) {
  const { listing } = await requireOwnedListing(z.string().min(1).max(64).parse(listingId));
  const [row] = await db
    .select()
    .from(listingCopy)
    .where(and(eq(listingCopy.id, z.string().max(64).parse(copyId)), eq(listingCopy.listingId, listing.id)));
  if (!row) return { ok: false as const };
  await applyCopy(listing, row);
  return { ok: true as const };
}

/** An edit by hand to one part. Saved on the listing and on the version it came from. */
export async function editWords(
  listingId: string,
  input: { part: "title" | "oneLiner" | "description"; value: string; copyId?: string | null },
) {
  const { listing } = await requireOwnedListing(z.string().min(1).max(64).parse(listingId));
  const { part, value, copyId } = z
    .object({
      part: z.enum(["title", "oneLiner", "description"]),
      value: z.string().trim().min(1).max(5000),
      copyId: z.string().max(64).nullish(),
    })
    .parse(input);
  const text = part === "title" ? clip(value, titleMax) : part === "oneLiner" ? clip(value, oneLinerMax) : value;
  const updated = await updateListing(listing.id, { [part]: text });
  if (copyId) {
    await db
      .update(listingCopy)
      .set({ [part]: text })
      .where(and(eq(listingCopy.id, copyId), eq(listingCopy.listingId, listing.id)));
  }
  if (updated.status === "live") await refreshEmbedding(updated);
  return { ok: true as const, value: text };
}

/** "Save as my usual style": a short note the agent reads next time. */
export async function saveWritingStyle(listingId: string, tone: string) {
  const { user, listing } = await requireOwnedListing(z.string().min(1).max(64).parse(listingId));
  const picked = z.enum(tones).parse(tone);
  // Note how long the descriptions they kept tend to be
  const [latest] = await db
    .select({ description: listingCopy.description })
    .from(listingCopy)
    .where(eq(listingCopy.listingId, listing.id))
    .orderBy(desc(listingCopy.createdAt))
    .limit(1);
  const words = (listing.description ?? latest?.description ?? "").split(/\s+/).filter(Boolean).length;
  const length = words === 0 ? "" : words < 45 ? " Keeps descriptions short." : words > 100 ? " Likes plenty of detail." : "";
  const style = `${picked}: ${toneGuide[picked]}${length}`;
  await db.update(userTable).set({ writingStyle: style }).where(eq(userTable.id, user.id));
  return { ok: true as const, style };
}
