import "server-only";
import { activity, and, db, eq, gt, isNull, listing, shop, type ActivityKind, type ActivitySource } from "@repo/db";
import { rootDomain, storeFromHost } from "../urls";

/*
 * Recording what people do on stores and listings, for Stats. Views are
 * deduped per visitor per page for 30 minutes and never count the owner.
 */

const DEDUPE_MS = 30 * 60 * 1000;

const searchHosts = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|brave)\./;
const socialHosts = /(^|\.)(instagram|facebook|fb|messenger|tiktok|pinterest|pin|twitter|x|t|threads|reddit|whatsapp|snapchat|youtube|linkedin)\.(com|co|net|it|me)$/;
const socialTags = /^(ig|instagram|fb|facebook|tiktok|tt|pinterest|pin|twitter|x|threads|reddit|whatsapp|snap|youtube)$/i;
/** Crawlers and link previewers shouldn't count as people looking. */
export const botAgent = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora|whatsapp|telegram|discord|curl|wget|python|headless/i;

/** Where a visit came from, from the referrer and any ?ref= / utm_source tag. */
export function classifySource(input: { referrer?: string | null; tag?: string | null; shopSlug: string }): ActivitySource {
  const tag = input.tag?.trim().toLowerCase();
  if (tag) {
    if (tag === "qr") return "qr";
    if (socialTags.test(tag)) return "social";
  }
  if (!input.referrer) return "direct";
  let host: string;
  try {
    host = new URL(input.referrer).host.toLowerCase();
  } catch {
    return "direct";
  }
  const store = storeFromHost(host);
  if (store === input.shopSlug) return "store";
  if (store || host === rootDomain || host === `www.${rootDomain}`) return "marketplace";
  const bare = host.split(":")[0]!;
  if (searchHosts.test(bare)) return "search";
  if (socialHosts.test(bare) || bare === "l.instagram.com" || bare === "lm.facebook.com") return "social";
  return "other";
}

/** The shop (and listing) an event is about: by listing id, else by shop slug. */
async function target(input: { shopSlug?: string | null; listingId?: string | null }) {
  if (input.listingId) {
    const [row] = await db
      .select({ shopId: listing.shopId, listingId: listing.id, slug: shop.slug, ownerId: shop.ownerId, status: listing.status })
      .from(listing)
      .innerJoin(shop, eq(shop.id, listing.shopId))
      .where(eq(listing.id, input.listingId));
    if (!row || row.status === "draft") return null;
    return row;
  }
  if (!input.shopSlug) return null;
  const [row] = await db
    .select({ shopId: shop.id, slug: shop.slug, ownerId: shop.ownerId })
    .from(shop)
    .where(eq(shop.slug, input.shopSlug));
  return row ? { ...row, listingId: null } : null;
}

export async function recordActivity(input: {
  kind: ActivityKind;
  shopSlug?: string | null;
  listingId?: string | null;
  visitorId: string;
  userId: string | null;
  referrer?: string | null;
  tag?: string | null;
}) {
  const t = await target(input);
  if (!t) return { recorded: false };
  // The seller looking at (or sharing) their own stuff isn't a visitor; their shares still count
  if (input.kind === "view" && input.userId && input.userId === t.ownerId) return { recorded: false };

  if (input.kind === "view") {
    const [recent] = await db
      .select({ id: activity.id })
      .from(activity)
      .where(
        and(
          eq(activity.kind, "view"),
          eq(activity.visitorId, input.visitorId),
          eq(activity.shopId, t.shopId),
          t.listingId ? eq(activity.listingId, t.listingId) : isNull(activity.listingId),
          gt(activity.createdAt, new Date(Date.now() - DEDUPE_MS)),
        ),
      )
      .limit(1);
    if (recent) return { recorded: false };
  }

  await db.insert(activity).values({
    kind: input.kind,
    shopId: t.shopId,
    listingId: t.listingId,
    visitorId: input.visitorId,
    userId: input.userId,
    source: input.kind === "view" ? classifySource({ referrer: input.referrer, tag: input.tag, shopSlug: t.slug }) : null,
  });
  return { recorded: true };
}
