import "server-only";
import { and, asc, count, db, desc, eq, listing, shop, sql, type ListingStep, type ShopTone, listingPhoto } from "@repo/db";
import type { Shop } from "../mock";
import type { StoreTone } from "../mock-market";
import { rootDomain } from "../urls";
import { fileUrl } from "./files";

export type ShopRow = typeof shop.$inferSelect;

/** Subdomains that can never be a shop. */
const reservedSlugs = new Set([
  "www",
  "app",
  "api",
  "mcp",
  "sidekick",
  "admin",
  "mail",
  "help",
  "docs",
  "blog",
  "store",
  "shop",
  "shops",
  "static",
  "assets",
  "cdn",
  "status",
  "dev",
  "staging",
]);

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug) && !reservedSlugs.has(slug);
}

/** Why a link can't be used, or "free". Reserved words read as taken. */
export async function checkSlug(
  slug: string,
  exceptShopId?: string,
): Promise<"free" | "taken" | "invalid"> {
  if (!slug) return "invalid";
  if (reservedSlugs.has(slug)) return "taken";
  if (!isValidSlug(slug)) return "invalid";
  return (await isSlugFree(slug, exceptShopId)) ? "free" : "taken";
}

export async function isSlugFree(slug: string, exceptShopId?: string) {
  if (!isValidSlug(slug)) return false;
  const [row] = await db.select({ id: shop.id }).from(shop).where(eq(shop.slug, slug));
  return !row || row.id === exceptShopId;
}

/** The shop's address as people read it. */
export function shopDomain(slug: string) {
  const host = rootDomain.startsWith("localhost") ? "resell.store" : rootDomain;
  return `${slug}.${host}`;
}

/** B1 colours onto the marketplace avatar tones. */
export const storeToneFor: Record<ShopTone, StoreTone> = {
  lemon: "lemon",
  mint: "mint",
  pink: "pink",
  leaf: "forest",
  blush: "pink",
};

const tileTone: Record<ShopTone, Shop["tone"]> = {
  lemon: "muted",
  mint: "leaf",
  leaf: "leaf",
  pink: "pink",
  blush: "pink",
};

function iconFor(category: string | null): Shop["icon"] {
  if (category === "Clothes") return "dress";
  if (category === "Collectibles" || category === "Books and records") return "record";
  return "vase";
}

export type ShopWithCounts = ShopRow & { live: number; drafts: number; sold: number };

/** The person's shops, oldest first, with listing counts. */
export async function listOwnedShops(ownerId: string): Promise<ShopWithCounts[]> {
  const rows = await db
    .select({
      shop,
      live: sql<number>`count(*) filter (where ${listing.status} = 'live')`.mapWith(Number),
      drafts: sql<number>`count(*) filter (where ${listing.status} = 'draft')`.mapWith(Number),
      sold: sql<number>`count(*) filter (where ${listing.status} = 'sold')`.mapWith(Number),
    })
    .from(shop)
    .leftJoin(listing, eq(listing.shopId, shop.id))
    .where(eq(shop.ownerId, ownerId))
    .groupBy(shop.id)
    .orderBy(asc(shop.createdAt));
  return rows.map(({ shop, ...counts }) => ({ ...shop, ...counts }));
}

/** A shop the person owns, by slug. */
export async function getOwnedShop(ownerId: string, slug: string) {
  const [row] = await db
    .select()
    .from(shop)
    .where(and(eq(shop.ownerId, ownerId), eq(shop.slug, slug)));
  return row ?? null;
}

export async function countOwnedShops(ownerId: string) {
  const [row] = await db.select({ n: count() }).from(shop).where(eq(shop.ownerId, ownerId));
  return row?.n ?? 0;
}

/** A DB shop in the shape the seller screens were built around (lib/mock Shop). */
export function toShopCard(s: ShopWithCounts): Shop {
  return {
    slug: s.slug,
    name: s.name,
    shortName: s.name,
    domain: shopDomain(s.slug),
    visibility: s.visibility,
    tone: tileTone[s.tone],
    icon: iconFor(s.category),
    live: s.live,
    drafts: s.drafts,
    offers: 0,
    thisWeek: 0,
  };
}

/** The uploaded shop picture, if there is one. */
export function shopPicture(s: Pick<ShopRow, "pictureFileId">) {
  return s.pictureFileId ? fileUrl(s.pictureFileId) : null;
}

/** The person's most recently touched draft, for "pick up where you left off". */
export async function latestDraft(ownerId: string) {
  const [row] = await db
    .select({
      id: listing.id,
      name: listing.name,
      title: listing.title,
      step: listing.step,
      shopName: shop.name,
      shopSlug: shop.slug,
    })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(and(eq(shop.ownerId, ownerId), eq(listing.status, "draft")))
    .orderBy(desc(listing.updatedAt))
    .limit(1);
  return row ?? null;
}

/** What's next for a draft, by the furthest step it reached. */
export const draftStepLabel: Record<ListingStep, string> = {
  research: "Being looked up",
  details: "Next: the details",
  photos: "Next: photos",
  words: "Next: the words",
  publish: "Ready to put live",
};

/** The shop's picture and every listing photo upload in it. */
export async function shopFileIds(shopId: string) {
  const [s] = await db.select({ pictureFileId: shop.pictureFileId }).from(shop).where(eq(shop.id, shopId));
  const photos = await db
    .select({ fileId: listingPhoto.fileId })
    .from(listingPhoto)
    .innerJoin(listing, eq(listing.id, listingPhoto.listingId))
    .where(eq(listing.shopId, shopId));
  return [s?.pictureFileId, ...photos.map((p) => p.fileId)].filter((id): id is string => !!id);
}
