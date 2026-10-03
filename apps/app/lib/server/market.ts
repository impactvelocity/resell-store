import "server-only";
import { cache } from "react";
import {
  and,
  asc,
  db,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  listing,
  ne,
  or,
  shop,
  sql,
  user,
  type SQL,
} from "@repo/db";
import type { ListingDetail, PhotoView } from "../mock-listing-detail";
import { categories, type Category, type PublicListing, type PublicStore, type SoldItem } from "../mock-market";
import { toDollars } from "../money";
import { embeddingsConfigured, embedQuery } from "./embeddings";
import { isFollowing } from "./follows";
import { coverPhotos, listPhotos } from "./listings";
import { getCurrentUser } from "./session";
import { storeToneFor, shopPicture } from "./shops";

/*
 * The public side of the marketplace: what buyers can see on resell.store and
 * on each {store}.resell.store. Rows come back in the shapes the P-series
 * components were built around (lib/mock-market.ts), so pages swap data, not UI.
 *
 * Who sees what:
 *   shop.visibility "public" (and not paused)  listed on /discover and /stores
 *   shop.visibility "link"                     reachable by URL, never listed
 *   shop.visibility "private"                  404 for everyone but the owner
 *   listing "live" + "everyone"                in discovery and on the store page
 *   listing "live" + "link"                    by URL only
 *   listing "sold"                             only on the store's Sold tab
 */

type ShopRow = typeof shop.$inferSelect;
type ListingRow = typeof listing.$inferSelect;

/** Who's looking at a public page: enough for the header and "Hi Maya." */
export async function publicViewer() {
  const u = await getCurrentUser();
  if (!u) return null;
  const first = firstName(u.name, u.email);
  return { id: u.id, firstName: first, initial: first[0]!.toUpperCase() };
}

/* Filters */

/** Shops that show up in discovery. */
const discoverableShop = and(eq(shop.visibility, "public"), eq(shop.paused, false));

/** Listings that show up in discovery and on store shelves. */
const listedListing = and(
  eq(listing.status, "live"),
  eq(listing.visibility, "everyone"),
  isNotNull(listing.slug),
  isNotNull(listing.priceCents),
);

/**
 * The research step writes free-text categories ("Clothes", "Kitchenware"), so
 * each marketplace chip matches a few words rather than one exact value.
 */
const categoryWords: Record<Category, string[]> = {
  Clothing: ["cloth", "apparel", "fashion", "dress", "shirt", "jacket", "coat", "knit", "sweater", "wear"],
  Shoes: ["shoe", "boot", "sneaker", "trainer", "footwear", "sandal"],
  Bags: ["bag", "tote", "purse", "backpack", "luggage", "wallet"],
  Home: ["home", "house", "kitchen", "cook", "furniture", "decor", "lamp", "lighting", "ceramic", "dining"],
  Collectibles: ["collect", "card", "vintage", "antique", "record", "vinyl", "memorabilia", "coin", "stamp"],
  Books: ["book", "magazine", "comic"],
  Tech: ["tech", "electronic", "camera", "computer", "phone", "audio", "gaming", "console", "photo"],
  Kids: ["kid", "child", "baby", "toy", "nursery"],
  Garden: ["garden", "plant", "outdoor", "patio"],
};

export function parseCategory(raw: string | null | undefined): Category | null {
  return categories.find((c) => c.toLowerCase() === raw?.toLowerCase()) ?? null;
}

function categoryFilter(category: Category) {
  return or(...categoryWords[category].map((w) => ilike(listing.category, `%${w}%`)));
}

/** A listing's category as a chip name, for breadcrumbs and store sections. */
function chipFor(category: string | null): string {
  if (!category) return "Everything else";
  const exact = parseCategory(category);
  if (exact) return exact;
  const lower = category.toLowerCase();
  return (
    categories.find((c) => categoryWords[c].some((w) => lower.includes(w))) ?? category
  );
}

export const priceBuckets = ["any", "under-25", "25-100", "over-100"] as const;
export type PriceBucket = (typeof priceBuckets)[number];
export const sortOrders = ["best", "newest", "price-asc", "price-desc"] as const;
export type SortOrder = (typeof sortOrders)[number];

function priceFilter(price: PriceBucket): SQL | undefined {
  if (price === "under-25") return sql`${listing.priceCents} < 2500`;
  if (price === "25-100") return sql`${listing.priceCents} between 2500 and 10000`;
  if (price === "over-100") return sql`${listing.priceCents} > 10000`;
  return undefined;
}

/* Mapping rows onto the public shapes */

const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

function firstName(name: string | null | undefined, email: string) {
  const n = name?.trim() || email.split("@")[0]!;
  return n.split(/\s+/)[0]!;
}

/** One line under the store name in lists: the start of its about, or its category. */
function tagline(s: ShopRow) {
  const about = s.about?.trim();
  if (about) {
    const first = about.split(/(?<=[.!?])\s|\n/)[0]!.replace(/[.!]$/, "");
    return first.length > 70 ? `${first.slice(0, 67).trimEnd()}…` : first;
  }
  return s.category ?? "New on resell.store";
}

export function toPublicStore(
  s: ShopRow,
  owner: { name: string | null; email: string },
  counts: { forSale: number; sold: number },
): PublicStore {
  return {
    slug: s.slug,
    name: s.name,
    owner: firstName(owner.name, owner.email),
    initial: (s.name.trim()[0] ?? "?").toUpperCase(),
    tone: storeToneFor[s.tone],
    tagline: tagline(s),
    location: s.location?.trim() || undefined,
    since: monthYear.format(s.createdAt),
    bio: s.about?.trim() || undefined,
    forSale: counts.forSale,
    sold: counts.sold,
    live: true,
    paused: s.paused,
    picture: shopPicture(s) ?? undefined,
  };
}

const JUST_LISTED_MS = 2 * 24 * 60 * 60 * 1000;

export function toPublicListing(
  l: ListingRow,
  s: Pick<ShopRow, "slug" | "name" | "tone" | "pictureFileId">,
  photo?: string,
): PublicListing {
  return {
    id: l.id,
    slug: l.slug ?? l.id,
    store: s.slug,
    title: l.title ?? l.name ?? "Untitled",
    short: l.oneLiner ?? "",
    price: toDollars(l.priceCents) ?? 0,
    shipping: toDollars(l.shippingCents) ?? null,
    photo,
    category: chipFor(l.category),
    section: chipFor(l.category),
    openToOffers: l.takeOffers && l.status === "live",
    sold: l.status === "sold",
    justListed:
      l.status === "live" &&
      !!l.publishedAt &&
      Date.now() - l.publishedAt.getTime() < JUST_LISTED_MS,
    seller: {
      name: s.name,
      initial: (s.name.trim()[0] ?? "?").toUpperCase(),
      tone: storeToneFor[s.tone],
      picture: shopPicture(s) ?? undefined,
    },
  };
}

/** Listing rows + their shops → cards, with cover photos in one query. */
async function toCards(
  rows: { listing: ListingRow; shop: Pick<ShopRow, "slug" | "name" | "tone" | "pictureFileId"> }[],
) {
  const covers = await coverPhotos(rows.map((r) => r.listing.id));
  return rows.map((r) => toPublicListing(r.listing, r.shop, covers.get(r.listing.id)));
}

/* Counts */

const forSaleCount = sql<number>`count(*) filter (where ${listing.status} = 'live' and ${listing.visibility} = 'everyone' and ${listing.slug} is not null and ${listing.priceCents} is not null)`.mapWith(Number);
const soldCount = sql<number>`count(*) filter (where ${listing.status} = 'sold')`.mapWith(Number);

/** "12,480 things from 1,932 stores": everything listed right now. */
export async function marketCounts() {
  const [row] = await db
    .select({
      things: sql<number>`count(*)`.mapWith(Number),
      stores: sql<number>`count(distinct ${shop.id})`.mapWith(Number),
    })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(and(listedListing, discoverableShop));
  return { things: row?.things ?? 0, stores: row?.stores ?? 0 };
}

/* Stores */

/** Every listed store, busiest first. */
export async function listStores({ limit }: { limit?: number } = {}) {
  const query = db
    .select({ shop, ownerName: user.name, ownerEmail: user.email, forSale: forSaleCount, sold: soldCount })
    .from(shop)
    .innerJoin(user, eq(user.id, shop.ownerId))
    .leftJoin(listing, eq(listing.shopId, shop.id))
    .where(discoverableShop)
    .groupBy(shop.id, user.id)
    .orderBy(desc(forSaleCount), desc(soldCount), asc(shop.createdAt));
  const rows = limit ? await query.limit(limit) : await query;
  return rows.map((r) =>
    toPublicStore(r.shop, { name: r.ownerName, email: r.ownerEmail }, r),
  );
}

/**
 * A store by subdomain, as a visitor may see it: public and link shops for
 * everyone, private ones only for their owner. Null means 404. `following`
 * is whether the viewer follows it.
 */
export const getPublicStore = cache(async (slug: string, viewerId?: string | null) => {
  const [row] = await db
    .select({ shop, ownerName: user.name, ownerEmail: user.email, forSale: forSaleCount, sold: soldCount })
    .from(shop)
    .innerJoin(user, eq(user.id, shop.ownerId))
    .leftJoin(listing, eq(listing.shopId, shop.id))
    .where(eq(shop.slug, slug.toLowerCase()))
    .groupBy(shop.id, user.id);
  if (!row) return null;
  const isOwner = !!viewerId && row.shop.ownerId === viewerId;
  if (row.shop.visibility === "private" && !isOwner) return null;
  // Owners don't follow their own shop; signed out, nobody follows anything
  const following = !!viewerId && !isOwner && (await isFollowing(viewerId, row.shop.id));
  return {
    shop: row.shop,
    isOwner,
    following,
    store: toPublicStore(row.shop, { name: row.ownerName, email: row.ownerEmail }, row),
  };
});

/** What's on a store's shelves (everything listed), newest first. */
export async function storeShelf(s: ShopRow, { exclude, limit = 200 }: { exclude?: string; limit?: number } = {}) {
  const rows = await db
    .select({ listing, shop: { slug: shop.slug, name: shop.name, tone: shop.tone, pictureFileId: shop.pictureFileId } })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(and(eq(listing.shopId, s.id), listedListing, exclude ? ne(listing.id, exclude) : undefined))
    .orderBy(desc(listing.publishedAt), desc(listing.createdAt))
    .limit(limit);
  return toCards(rows);
}

const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "today", "yesterday", "last week", "3 months ago". */
function ago(date: Date) {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return relative.format(-days, "day");
  if (days < 30) return relative.format(-Math.floor(days / 7), "week");
  if (days < 365) return relative.format(-Math.floor(days / 30), "month");
  return relative.format(-Math.floor(days / 365), "year");
}

/** "Went to new homes": what a store sold, newest first. */
export async function storeSold(s: ShopRow, limit = 10): Promise<SoldItem[]> {
  const rows = await db
    .select()
    .from(listing)
    .where(and(eq(listing.shopId, s.id), eq(listing.status, "sold")))
    .orderBy(desc(listing.soldAt), desc(listing.updatedAt))
    .limit(limit);
  const covers = await coverPhotos(rows.map((r) => r.id));
  return rows.map((l) => ({
    title: l.title ?? l.name ?? "Untitled",
    price: toDollars(l.priceCents) ?? 0,
    when: ago(l.soldAt ?? l.updatedAt),
    photo: covers.get(l.id),
  }));
}

/* Listings */

/**
 * One listing on its store: live ones for everyone (listed or link-only), any
 * status with a path for the store's owner, who may be checking a draft.
 */
export async function getPublicListing(storeSlug: string, slug: string, viewerId?: string | null) {
  const found = await getPublicStore(storeSlug, viewerId);
  if (!found) return null;
  const [row] = await db
    .select()
    .from(listing)
    .where(and(eq(listing.shopId, found.shop.id), eq(listing.slug, slug)));
  // Sold listings stay up read-only (buyers come back to them); drafts are the owner's alone
  if (!row || (row.status === "draft" && !found.isOwner)) return null;
  return { ...found, row, listing: toPublicListing(row, found.shop) };
}

/**
 * Checkout and offers link by listing id (slugs repeat across stores), or by
 * slug when only one live listing has it. Only live listings can be bought.
 */
export async function findBuyableListing(key: string) {
  const rows = await db
    .select({ listing, shop, ownerName: user.name, ownerEmail: user.email })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .innerJoin(user, eq(user.id, shop.ownerId))
    .where(
      and(
        or(eq(listing.id, key), eq(listing.slug, key)),
        eq(listing.status, "live"),
        ne(shop.visibility, "private"),
        // A paused store says "things here can't be bought for now"
        eq(shop.paused, false),
      ),
    )
    .limit(2);
  const row = rows.find((r) => r.listing.id === key) ?? (rows.length === 1 ? rows[0] : undefined);
  if (!row) return null;
  const covers = await coverPhotos([row.listing.id]);
  return {
    listing: toPublicListing(row.listing, row.shop, covers.get(row.listing.id)),
    store: toPublicStore(row.shop, { name: row.ownerName, email: row.ownerEmail }, { forSale: 0, sold: 0 }),
  };
}

const longDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

/** The long-form side of a live listing for P3/P9, built from what the seller wrote. */
export async function listingDetail(row: ListingRow, store: PublicStore): Promise<ListingDetail> {
  const photos: PhotoView[] = (await listPhotos(row.id))
    .filter((p) => p.url)
    .map((p) => ({ url: p.url, video: p.isVideo, caption: p.alt ?? "" }));
  const description = (row.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const facts = row.fields
    .filter((f) => f.value?.trim())
    .map((f) => ({ label: f.label, value: f.value!.trim() }));
  const category = chipFor(row.category);
  const shipping = toDollars(row.shippingCents);
  const pickup = shipping === 0;

  return {
    noun: "item",
    subtitle: row.oneLiner ?? "",
    // The gallery always shows something: a quiet placeholder until there's a photo
    photos: photos.length ? photos : [{ caption: "" }],
    description: description.length
      ? description
      : [`${store.owner} hasn't written about this one yet. Ask if you'd like to know more.`],
    details: [
      ...facts.map((f, i) => ({ ...f, essential: i < 5 })),
      ...(facts.some((f) => /categor/i.test(f.label))
        ? []
        : [{ label: "Category", value: row.category ?? category }]),
      ...(store.location ? [{ label: pickup ? "Pickup in" : "Ships from", value: store.location }] : []),
      { label: "Offers", value: row.takeOffers ? "Welcome" : "Price is firm" },
    ],
    listedNote: row.publishedAt
      ? `Listed ${ago(row.publishedAt) === "today" ? "today" : `on ${longDate.format(row.publishedAt)}`}.`
      : "Not listed yet. Only you can see this.",
    arrives: null,
    pickup,
  };
}

/* Search */

export type SearchInput = {
  q?: string;
  category?: Category | null;
  price?: PriceBucket;
  offers?: boolean;
  sort?: SortOrder;
  offset?: number;
  limit?: number;
};

export type SearchResult = {
  listings: PublicListing[];
  /** Everything that matched, across pages. */
  total: number;
  /** How many stores those matches come from. */
  stores: number;
  /** Semantic search ran (false when the query wasn't embedded). */
  semantic: boolean;
};

/** Each ranker contributes 1 / (K + rank). 60 is the usual constant from the RRF paper. */
const RRF_K = 60;
/** How far down each ranker looks. Enough for a few pages of results. */
const CANDIDATES = 200;
/**
 * Below this cosine similarity a semantic match is noise: every listing is
 * *somewhat* near every query, so without a floor "boots" would return mugs.
 */
const MIN_SIMILARITY = 0.3;

/**
 * P1 search: Postgres full-text on `listing.search` and pgvector cosine
 * similarity on `listing.embedding` (Jina), merged with reciprocal rank fusion.
 * Without a query it's a plain filtered browse. If embedding the query fails
 * (or there's no key), it quietly falls back to text alone.
 */
export async function searchListings(input: SearchInput): Promise<SearchResult> {
  const q = input.q?.trim() ?? "";
  const offset = Math.max(0, input.offset ?? 0);
  const limit = Math.min(Math.max(1, input.limit ?? 16), 60);
  const sort = input.sort ?? (q ? "best" : "newest");

  const filters = and(
    listedListing,
    discoverableShop,
    input.category ? categoryFilter(input.category) : undefined,
    priceFilter(input.price ?? "any"),
    input.offers ? eq(listing.takeOffers, true) : undefined,
  );

  if (!q) return browse(filters, sort, offset, limit);

  const [text, semantic] = await Promise.all([textRanks(q, filters), semanticRanks(q, filters)]);

  const scores = new Map<string, { score: number; shopId: string }>();
  for (const ranked of [text, semantic ?? []]) {
    ranked.forEach((r, i) => {
      const prev = scores.get(r.id);
      scores.set(r.id, { score: (prev?.score ?? 0) + 1 / (RRF_K + i + 1), shopId: r.shopId });
    });
  }
  const merged = [...scores.entries()].sort((a, b) => b[1].score - a[1].score).map(([id]) => id);
  const stores = new Set([...scores.values()].map((v) => v.shopId)).size;
  if (merged.length === 0) return { listings: [], total: 0, stores: 0, semantic: semantic !== null };

  let pageIds: string[];
  if (sort === "best") {
    pageIds = merged.slice(offset, offset + limit);
  } else {
    // Re-order the matches by price or date, then page
    const ordered = await db
      .select({ id: listing.id })
      .from(listing)
      .where(inArray(listing.id, merged))
      .orderBy(...orderFor(sort));
    pageIds = ordered.slice(offset, offset + limit).map((r) => r.id);
  }

  const rows = pageIds.length
    ? await db
        .select({ listing, shop: { slug: shop.slug, name: shop.name, tone: shop.tone, pictureFileId: shop.pictureFileId } })
        .from(listing)
        .innerJoin(shop, eq(shop.id, listing.shopId))
        .where(inArray(listing.id, pageIds))
    : [];
  const byId = new Map(rows.map((r) => [r.listing.id, r]));
  const cards = await toCards(pageIds.flatMap((id) => byId.get(id) ?? []));
  return { listings: cards, total: merged.length, stores, semantic: semantic !== null };
}

function orderFor(sort: SortOrder) {
  if (sort === "price-asc") return [asc(listing.priceCents), desc(listing.publishedAt), asc(listing.id)];
  if (sort === "price-desc") return [desc(listing.priceCents), desc(listing.publishedAt), asc(listing.id)];
  return [sql`${listing.publishedAt} desc nulls last`, desc(listing.createdAt), asc(listing.id)];
}

async function browse(filters: SQL | undefined, sort: SortOrder, offset: number, limit: number): Promise<SearchResult> {
  const [rows, [counts]] = await Promise.all([
    db
      .select({ listing, shop: { slug: shop.slug, name: shop.name, tone: shop.tone, pictureFileId: shop.pictureFileId } })
      .from(listing)
      .innerJoin(shop, eq(shop.id, listing.shopId))
      .where(filters)
      .orderBy(...orderFor(sort))
      .offset(offset)
      .limit(limit),
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        stores: sql<number>`count(distinct ${shop.id})`.mapWith(Number),
      })
      .from(listing)
      .innerJoin(shop, eq(shop.id, listing.shopId))
      .where(filters),
  ]);
  return {
    listings: await toCards(rows),
    total: counts?.total ?? 0,
    stores: counts?.stores ?? 0,
    semantic: false,
  };
}

/** Full-text matches, best first. A store's name counts too ("Second Shutter"). */
async function textRanks(q: string, filters: SQL | undefined) {
  const tsq = sql`websearch_to_tsquery('english', ${q})`;
  const nameMatch = ilike(shop.name, `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  return db
    .select({ id: listing.id, shopId: listing.shopId })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(and(filters, or(sql`${listing.search} @@ ${tsq}`, nameMatch)))
    .orderBy(
      desc(sql`ts_rank_cd(${listing.search}, ${tsq}) + case when ${nameMatch} then 0.5 else 0 end`),
      desc(listing.publishedAt),
    )
    .limit(CANDIDATES);
}

/** Nearest neighbours by meaning, or null when the query couldn't be embedded. */
async function semanticRanks(q: string, filters: SQL | undefined) {
  if (!embeddingsConfigured) return null;
  let vector: number[];
  try {
    vector = await embedQuery(q);
  } catch (error) {
    console.error("Search embedding failed; using text only.", error);
    return null;
  }
  const distance = sql`${listing.embedding} <=> ${JSON.stringify(vector)}::vector`;
  return db
    .select({ id: listing.id, shopId: listing.shopId })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(and(filters, isNotNull(listing.embedding), sql`${distance} < ${1 - MIN_SIMILARITY}`))
    .orderBy(distance)
    .limit(CANDIDATES);
}
