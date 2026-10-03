import { notFound } from "next/navigation";
import { ShopListings } from "../../../../components/shops/shop-listings";
import type { ShopData, ShopListing } from "../../../../lib/mock-shops";
import { toDollars } from "../../../../lib/money";
import { coverPhotos, listShopListings, type ListingRow } from "../../../../lib/server/listings";
import { requireUser } from "../../../../lib/server/session";
import { listingStats, shopMiniStats, type ListingMini } from "../../../../lib/server/stats";
import {
  draftStepLabel,
  listOwnedShops,
  shopPicture,
  toShopCard,
} from "../../../../lib/server/shops";
import { storeUrl } from "../../../../lib/urls";

/* B2 Shop listings: the signed-in owner's shop, or 404. */

const DAY = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday", "3 days ago", "2 weeks ago", then "Sep 4". */
function ago(date: Date, now: Date) {
  const days = Math.floor((now.getTime() - date.getTime()) / DAY);
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 28) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  return shortDate(date);
}

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toRow(l: ListingRow, cover: string | undefined, now: Date, mini?: ListingMini): ShopListing {
  const title = l.title ?? l.name ?? "Untitled draft";
  const price = toDollars(l.priceCents) ?? 0;
  const base = {
    id: l.id,
    title,
    price,
    views: mini?.views ?? 0,
    saves: mini?.likes ?? 0,
    offers: mini?.offersWaiting ?? 0,
    thumb: "vase" as const,
    tone: "muted" as const,
    status: l.status,
    photo: cover ?? null,
  };
  if (l.status === "draft") {
    return {
      ...base,
      detail: draftStepLabel[l.step],
      listed: `Started ${ago(l.createdAt, now).toLowerCase()}`,
      href: `/list/${l.id}/${l.step}`,
    };
  }
  if (l.status === "sold") {
    const soldAt = l.soldAt ?? l.updatedAt;
    return {
      ...base,
      detail: l.oneLiner ?? l.category ?? "",
      listed: `Sold ${shortDate(soldAt)}`,
      href: `/listings/${l.id}`,
    };
  }
  const publishedAt = l.publishedAt ?? l.createdAt;
  return {
    ...base,
    detail: l.oneLiner ?? l.category ?? "",
    listed: ago(publishedAt, now),
    isNew: now.getTime() - publishedAt.getTime() < 2 * DAY,
    href: `/listings/${l.id}`,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const shops = await listOwnedShops(user.id);
  const row = shops.find((s) => s.slug === slug);
  if (!row) notFound();

  const listings = await listShopListings(row.id);
  const [covers, minis, mini] = await Promise.all([
    coverPhotos(listings.map((l) => l.id)),
    listingStats(listings.map((l) => l.id)),
    shopMiniStats(row.id),
  ]);
  const now = new Date();

  const data: ShopData = {
    slug: row.slug,
    counts: { live: row.live, drafts: row.drafts, sold: row.sold },
    madeThisWeek: Math.round(mini.madeWeekCents / 100),
    offersWaiting: mini.offersWaiting,
    viewsThisWeek: mini.views7d,
    followers: mini.followers,
    likes: mini.likes,
    shares: mini.shares,
    listings: listings.map((l) => toRow(l, covers.get(l.id), now, minis.get(l.id))),
  };

  return (
    <ShopListings
      key={row.slug}
      shop={toShopCard(row)}
      data={data}
      live={{ storeUrl: storeUrl(row.slug), picture: shopPicture(row), paused: row.paused }}
    />
  );
}
