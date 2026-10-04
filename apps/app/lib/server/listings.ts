import "server-only";
import { notFound } from "next/navigation";
import {
  and,
  asc,
  db,
  desc,
  eq,
  listing,
  listingCopy,
  listingPhoto,
  ne,
  shop,
  sql,
  type ListingField,
  type ListingStep,
} from "@repo/db";
import { DemoBlockedError, demoListingBlocked } from "./demo";
import { embed, embeddingsConfigured, listingPassage } from "./embeddings";
import { fileUrl } from "./files";
import { requireUser } from "./session";
import { storeUrl } from "../urls";

export type ListingRow = typeof listing.$inferSelect;
export type PhotoRow = typeof listingPhoto.$inferSelect;
export type CopyRow = typeof listingCopy.$inferSelect;

const stepOrder: ListingStep[] = ["research", "details", "photos", "words", "publish"];

/** The later of two steps, so `listing.step` only moves forward. */
export function furthestStep(a: ListingStep, b: ListingStep) {
  return stepOrder.indexOf(a) >= stepOrder.indexOf(b) ? a : b;
}

/** A short name for a draft from what the seller typed: "Le Creuset dutch oven". */
export function draftName(prompt: string) {
  const first = prompt.split(/[.!?\n]/)[0]!.trim();
  return first.length > 60 ? `${first.slice(0, 57).trimEnd()}…` : first;
}

export async function createDraft({
  shopId,
  prompt,
}: {
  shopId: string;
  prompt: string;
}) {
  const [row] = await db
    .insert(listing)
    .values({ shopId, prompt, name: draftName(prompt) || "New listing" })
    .returning();
  return row!;
}

/** A listing and its shop, if the person owns it. */
export async function getOwnedListing(ownerId: string, id: string) {
  const [row] = await db
    .select({ listing, shop })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(and(eq(listing.id, id), eq(shop.ownerId, ownerId)));
  return row ?? null;
}

/** For workspace pages and actions: the signed-in owner's listing, or 404. */
export async function requireOwnedListing(id: string) {
  const user = await requireUser();
  const row = await getOwnedListing(user.id, id);
  if (!row) notFound();
  return { user, ...row };
}

/** For actions that change a listing: the owner's, and not locked for the demo (lib/server/demo.ts). */
export async function requireEditableListing(id: string) {
  const owned = await requireOwnedListing(id);
  if (await demoListingBlocked(owned.user, owned.listing)) throw new DemoBlockedError("listing");
  return owned;
}

export async function updateListing(id: string, patch: Partial<typeof listing.$inferInsert>) {
  const [row] = await db.update(listing).set(patch).where(eq(listing.id, id)).returning();
  return row!;
}

/** Records how far the seller got, so "Save and close" can bring them back there. */
export async function reachStep(row: ListingRow, step: ListingStep) {
  const next = furthestStep(row.step, step);
  if (next !== row.step) await updateListing(row.id, { step: next });
}

export type PhotoView = {
  id: string;
  url: string;
  source: string | null;
  alt: string | null;
  isVideo: boolean;
};

export function toPhotoView(p: PhotoRow): PhotoView {
  return {
    id: p.id,
    url: p.fileId ? fileUrl(p.fileId) : (p.url ?? ""),
    source: p.source,
    alt: p.alt,
    isVideo: p.isVideo,
  };
}

export async function listPhotos(listingId: string) {
  const rows = await db
    .select()
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, listingId))
    .orderBy(asc(listingPhoto.position), asc(listingPhoto.createdAt));
  return rows.map(toPhotoView);
}

/** The first photo of each listing, for cards. */
export async function coverPhotos(listingIds: string[]) {
  if (listingIds.length === 0) return new Map<string, string>();
  const rows = await db
    .selectDistinctOn([listingPhoto.listingId])
    .from(listingPhoto)
    .where(
      and(
        sql`${listingPhoto.listingId} in ${listingIds}`,
        eq(listingPhoto.isVideo, false),
      ),
    )
    .orderBy(listingPhoto.listingId, asc(listingPhoto.position), asc(listingPhoto.createdAt));
  return new Map(rows.map((p) => [p.listingId, toPhotoView(p).url]));
}

export async function listCopies(listingId: string) {
  return db
    .select()
    .from(listingCopy)
    .where(eq(listingCopy.listingId, listingId))
    .orderBy(asc(listingCopy.createdAt));
}

/** Count of the things that make a listing complete, for "7 of 12 filled". */
export function filledCount(row: ListingRow, photoCount: number) {
  const fields = row.fields.filter((f) => f.value).length;
  const extras = [row.priceCents, row.title, row.description, photoCount > 0 ? 1 : null];
  return {
    filled: fields + extras.filter((v) => v != null).length,
    total: Math.max(row.fields.length, 6) + extras.length,
  };
}

export function setField(fields: ListingField[], key: string, value: string, label?: string) {
  // Match the key, or failing that the label, so a near-miss key edits the line rather than adding one
  const norm = (x: string) => x.trim().toLowerCase();
  const existing =
    fields.find((f) => f.key === key) ??
    (label ? fields.find((f) => norm(f.label) === norm(label)) : undefined);
  if (existing)
    return fields.map((f) => (f === existing ? { ...f, value, source: "you" as const } : f));
  return [...fields, { key, label: label ?? key, value, source: "you" as const }];
}

/** "Sunny yellow Le Creuset dutch oven, 5.5 qt" → "sunny-yellow-le-creuset-dutch-oven-5-5-qt", cut at a word. */
function listingSlug(title: string) {
  const full = title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (full.length <= 60) return full;
  const cut = full.slice(0, 61);
  return cut.slice(0, cut.lastIndexOf("-") > 20 ? cut.lastIndexOf("-") : 60);
}

/** A unique path inside the shop from the title: "sunny-yellow-le-creuset-dutch-oven". */
async function uniqueSlug(shopId: string, listingId: string, base: string) {
  const root = listingSlug(base) || "listing";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [clash] = await db
      .select({ id: listing.id })
      .from(listing)
      .where(and(eq(listing.shopId, shopId), eq(listing.slug, candidate), ne(listing.id, listingId)));
    if (!clash) return candidate;
  }
  return `${root}-${listingId.slice(0, 6)}`;
}

/** C7: live on the shop, with a path and a search embedding. */
export async function publishListing(row: ListingRow) {
  const slug = row.slug ?? (await uniqueSlug(row.shopId, row.id, row.title ?? row.name ?? "listing"));
  const published = await updateListing(row.id, {
    slug,
    status: "live",
    step: "publish",
    publishedAt: row.publishedAt ?? new Date(),
  });
  await refreshEmbedding(published);
  return published;
}

/** Re-embed after the public words change. Search still works on text if this fails. */
export async function refreshEmbedding(row: ListingRow) {
  if (!embeddingsConfigured) return;
  try {
    const [vector] = await embed([listingPassage(row)], "retrieval.passage");
    await db.update(listing).set({ embedding: vector }).where(eq(listing.id, row.id));
  } catch (error) {
    console.error("Embedding failed for listing", row.id, error);
  }
}

/** A shop's listings for the seller (B2), newest first. */
export async function listShopListings(shopId: string) {
  return db
    .select()
    .from(listing)
    .where(eq(listing.shopId, shopId))
    .orderBy(desc(listing.updatedAt));
}

/* Photos (C5) ------------------------------------------------------------- */

export const maxPhotos = 12;

/** The seller's own picture (an upload, not a video, not from the web). */
export function isOwnPhoto(p: PhotoRow) {
  return Boolean(p.fileId) && !p.isVideo;
}

export async function listPhotoRows(listingId: string) {
  return db
    .select()
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, listingId))
    .orderBy(asc(listingPhoto.position), asc(listingPhoto.createdAt));
}

/**
 * Writes positions 0..n in the given order. The cover must be one of the
 * seller's own photos, so if one exists and isn't first, it moves to the front.
 */
export async function savePhotoOrder(rows: PhotoRow[]) {
  const ordered = [...rows];
  if (ordered[0] && !isOwnPhoto(ordered[0])) {
    const ownIndex = ordered.findIndex(isOwnPhoto);
    if (ownIndex > 0) ordered.unshift(...ordered.splice(ownIndex, 1));
  }
  await Promise.all(
    ordered.map((p, position) =>
      p.position === position
        ? null
        : db.update(listingPhoto).set({ position }).where(eq(listingPhoto.id, p.id)),
    ),
  );
  return ordered.map((p, position) => ({ ...p, position }));
}

/** Adds photos at the end (an own photo jumps to cover if there isn't one yet). */
export async function addPhotoRows(
  listingId: string,
  items: Omit<typeof listingPhoto.$inferInsert, "listingId" | "position">[],
) {
  const existing = await listPhotoRows(listingId);
  const start = existing.reduce((max, p) => Math.max(max, p.position + 1), 0);
  const added = await db
    .insert(listingPhoto)
    .values(items.map((item, i) => ({ ...item, listingId, position: start + i })))
    .returning();
  await savePhotoOrder([...existing, ...added]);
  return added;
}

/** "jaxdomain.com" from a URL or a bare domain; null if it can't tell. */
export function sourceDomain(value: string | null | undefined) {
  if (!value) return null;
  try {
    const host = new URL(value.includes("://") ? value : `https://${value}`).hostname;
    // "Amazon" isn't a domain; fall back to the picture's own URL
    return host.includes(".") ? host.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/** C5: the maker and retail pictures research found, credited to their site. */
export function webSuggestions(row: ListingRow) {
  return (row.findings?.images ?? [])
    .filter((img) => /^https?:\/\//.test(img.url))
    .map((img) => ({
      url: img.url,
      source: sourceDomain(img.source) ?? sourceDomain(img.url) ?? "the web",
      alt: img.alt ?? null,
    }));
}

/* The later workspace steps (C5 to C8) and Manage (C9) -------------------- */

/** Plain, serializable listing for the client screens from Photos on. */
export type WorkspaceListing = {
  id: string;
  /** The title, or the draft's short name until there is one. */
  title: string;
  hasTitle: boolean;
  oneLiner: string | null;
  description: string | null;
  tone: string | null;
  status: ListingRow["status"];
  visibility: ListingRow["visibility"];
  step: ListingStep;
  fields: ListingField[];
  priceCents: number | null;
  lowestCents: number | null;
  takeOffers: boolean;
  publishedAt: string | null;
  soldAt: string | null;
  /** Full link to the listing in its store, once it has a path. */
  shareUrl: string | null;
  shop: {
    name: string;
    slug: string;
    answerQuestions: boolean;
    haggle: boolean;
    lowestPercent: number;
    askHold: boolean;
  };
  /** Where "Save and close" goes. */
  closeHref: string;
};

export function toWorkspaceListing(
  row: ListingRow,
  shopRow: typeof shop.$inferSelect,
): WorkspaceListing {
  return {
    id: row.id,
    title: row.title ?? row.name ?? "New listing",
    hasTitle: Boolean(row.title?.trim()),
    oneLiner: row.oneLiner,
    description: row.description,
    tone: row.tone,
    status: row.status,
    visibility: row.visibility,
    step: row.step,
    fields: row.fields,
    priceCents: row.priceCents,
    lowestCents: row.lowestCents,
    takeOffers: row.takeOffers,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    soldAt: row.soldAt?.toISOString() ?? null,
    shareUrl: row.slug ? storeUrl(shopRow.slug, `/${row.slug}`) : null,
    shop: {
      name: shopRow.name,
      slug: shopRow.slug,
      answerQuestions: shopRow.answerQuestions,
      haggle: shopRow.haggle,
      lowestPercent: shopRow.lowestPercent,
      askHold: shopRow.askHold,
    },
    closeHref: `/shops/${shopRow.slug}`,
  };
}
