import "server-only";
import type { listing as listingTable, offer as offerTable, orders as ordersTable } from "@repo/db";
import type { PublicListing, PublicStore } from "../../mock-market";
import { toDollars } from "../../money";
import { siteUrl, storeUrl } from "../../urls";
import type { ListingMini } from "../stats";
import type { ThreadMessage, ThreadSummary } from "../messages";
import type { PhotoView } from "../listings";
import { shopPicture, type ShopRow, type ShopWithCounts } from "../shops";

/*
 * What the API hands back. snake_case, money in dollars (two decimals), dates
 * as ISO strings, and an `object` field naming the type, Stripe style.
 */

type ListingRow = typeof listingTable.$inferSelect;
type OfferRow = typeof offerTable.$inferSelect;
type OrderRow = typeof ordersTable.$inferSelect;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
/** Uploads are served from /api/files/{id}; API callers need the whole URL. */
export const abs = (url: string | null | undefined) => (!url ? null : url.startsWith("/") ? siteUrl(url) : url);
const usd = (cents: number | null | undefined) => toDollars(cents) ?? null;

export function apiShop(s: ShopRow | ShopWithCounts) {
  return {
    object: "shop" as const,
    id: s.id,
    slug: s.slug,
    name: s.name,
    about: s.about,
    category: s.category,
    location: s.location,
    tone: s.tone,
    visibility: s.visibility,
    paused: s.paused,
    url: storeUrl(s.slug),
    picture_url: abs(shopPicture(s)),
    agent: {
      answer_questions: s.answerQuestions,
      haggle: s.haggle,
      lowest_percent: s.lowestPercent,
      ask_hold: s.askHold,
    },
    ...("live" in s ? { counts: { live: s.live, drafts: s.drafts, sold: s.sold } } : {}),
    created_at: iso(s.createdAt),
  };
}

export function apiPhoto(p: PhotoView) {
  return { id: p.id, url: abs(p.url), alt: p.alt, source: p.source, is_video: p.isVideo };
}

export function apiStats(m: ListingMini | undefined) {
  return {
    views: m?.views ?? 0,
    views_7d: m?.views7d ?? 0,
    likes: m?.likes ?? 0,
    shares: m?.shares ?? 0,
    offers: m?.offers ?? 0,
    offers_waiting: m?.offersWaiting ?? 0,
  };
}

/** A listing as its owner sees it. */
export function apiListing(
  l: ListingRow,
  s: Pick<ShopRow, "slug">,
  extra: { photos?: PhotoView[]; stats?: ListingMini; cover?: string | null } = {},
) {
  return {
    object: "listing" as const,
    id: l.id,
    shop: s.slug,
    status: l.status,
    visibility: l.visibility,
    step: l.step,
    name: l.name,
    title: l.title,
    one_liner: l.oneLiner,
    description: l.description,
    category: l.category,
    price: usd(l.priceCents),
    lowest_price: usd(l.lowestCents),
    shipping: usd(l.shippingCents),
    take_offers: l.takeOffers,
    fields: l.fields.map((f) => ({ key: f.key, label: f.label, value: f.value ?? null, source: f.source })),
    ...(extra.photos ? { photos: extra.photos.map(apiPhoto) } : {}),
    ...(extra.cover !== undefined ? { cover_photo: abs(extra.cover) } : {}),
    url: l.slug ? storeUrl(s.slug, `/${l.slug}`) : null,
    edit_url: siteUrl(`/listings/${l.id}`),
    ...(extra.stats ? { stats: apiStats(extra.stats) } : {}),
    research: l.findings
      ? {
          identified: l.findings.identified,
          category: l.findings.category,
          confidence: l.findings.confidence,
          suggested_price: l.findings.price.suggested,
          price_range: { low: l.findings.price.bandLow, high: l.findings.price.bandHigh },
          summary: l.findings.summary,
        }
      : null,
    published_at: iso(l.publishedAt),
    sold_at: iso(l.soldAt),
    created_at: iso(l.createdAt),
    updated_at: iso(l.updatedAt),
  };
}

/** A listing card on the marketplace. */
export function apiPublicListing(l: PublicListing, liked?: boolean) {
  return {
    object: "public_listing" as const,
    id: l.id,
    slug: l.slug,
    store: l.store,
    title: l.title,
    one_liner: l.short || null,
    price: l.price,
    shipping: l.shipping ?? null,
    photo: abs(l.photo),
    category: l.category,
    open_to_offers: l.openToOffers,
    sold: l.sold,
    just_listed: l.justListed,
    url: storeUrl(l.store, `/${l.slug}`),
    seller: l.seller ? { name: l.seller.name } : null,
    ...(liked !== undefined ? { liked } : {}),
  };
}

export function apiStore(s: PublicStore, extra: { following?: boolean; followers?: number } = {}) {
  return {
    object: "store" as const,
    slug: s.slug,
    name: s.name,
    owner: s.owner,
    tagline: s.tagline,
    about: s.bio ?? null,
    location: s.location ?? null,
    since: s.since,
    for_sale: s.forSale,
    sold: s.sold,
    paused: s.paused ?? false,
    picture_url: abs(s.picture),
    url: storeUrl(s.slug),
    ...extra,
  };
}

type ListingCard = { id: string; title: string; slug: string | null; priceCents: number | null; status: string };
type ShopCard = { slug: string; name: string };
type Person = { name: string | null; email: string };

function firstName(p: Person) {
  return (p.name?.trim() || p.email.split("@")[0]!).split(/\s+/)[0]!;
}

function apiListingRef(l: ListingCard, s: ShopCard, photo: string | null) {
  return {
    id: l.id,
    title: l.title,
    price: usd(l.priceCents),
    status: l.status,
    photo: abs(photo),
    url: l.slug ? storeUrl(s.slug, `/${l.slug}`) : null,
  };
}

export function apiOffer(r: {
  offer: OfferRow;
  status: string;
  listing: ListingCard;
  shop: ShopCard;
  photo: string | null;
  buyer?: Person;
}) {
  const o = r.offer;
  return {
    object: "offer" as const,
    id: o.id,
    status: r.status,
    amount: usd(o.amountCents),
    counter: usd(o.counterCents),
    /** Who countered: "seller", or "agent" when the shop's agent haggled. */
    countered_by: o.counteredBy,
    /** What the buyer pays for the item if it goes ahead. */
    agreed: usd(o.counterCents ?? o.amountCents),
    note: o.note,
    deposit: usd(o.depositCents),
    expires_at: iso(o.expiresAt),
    responded_at: iso(o.respondedAt),
    created_at: iso(o.createdAt),
    listing: apiListingRef(r.listing, r.shop, r.photo),
    shop: { slug: r.shop.slug, name: r.shop.name },
    ...(r.buyer ? { buyer: { name: firstName(r.buyer) } } : {}),
  };
}

export function apiOrder(
  r: { order: OrderRow; listing: ListingCard; shop: ShopCard; photo: string | null; buyer?: Person },
  side: "seller" | "buyer",
) {
  const o = r.order;
  return {
    object: "order" as const,
    id: o.id,
    status: o.status,
    item: usd(o.itemCents),
    shipping: usd(o.shippingCents),
    total: usd(o.totalCents),
    delivery: o.delivery,
    tracking_number: o.trackingNumber,
    offer: o.offerId,
    listing: apiListingRef(r.listing, r.shop, r.photo),
    shop: { slug: r.shop.slug, name: r.shop.name },
    ...(side === "seller"
      ? {
          buyer: r.buyer ? { name: firstName(r.buyer) } : null,
          ship_to: o.shipTo,
          payout: {
            provider: o.paymentProvider,
            platform_fee: usd(o.platformFeeCents),
            paypal_fee: usd(o.paypalFeeCents),
            seller_net: usd(o.sellerNetCents),
            released_at: iso(o.releasedAt),
          },
        }
      : { ship_to: o.shipTo }),
    paid_at: iso(o.createdAt),
    shipped_at: iso(o.shippedAt),
    delivered_at: iso(o.deliveredAt),
    completed_at: iso(o.completedAt),
  };
}

export function apiThread(t: ThreadSummary) {
  return {
    object: "thread" as const,
    id: t.id,
    with: t.withName,
    shop: { slug: t.shop.slug, name: t.shop.name },
    listing: t.listing
      ? {
          id: t.listing.id,
          title: t.listing.title,
          photo: abs(t.listing.photo),
          url: t.listing.slug ? storeUrl(t.shop.slug, `/${t.listing.slug}`) : null,
        }
      : null,
    preview: t.preview,
    last_from: t.lastMine ? "you" : "them",
    unread: t.unread,
    /** Seller side: the shop's agent couldn't answer and handed it to you. */
    needs_you: t.needsYou,
    last_message_at: iso(t.lastMessageAt),
  };
}

export function apiMessage(m: ThreadMessage) {
  return {
    id: m.id,
    from: m.mine ? "you" : "them",
    /** Written by the shop's agent rather than the owner. */
    by_agent: m.byAgent,
    body: m.body,
    created_at: m.createdAt,
  };
}
