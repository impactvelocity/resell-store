import "server-only";
import {
  activity,
  and,
  db,
  eq,
  favourite,
  follow,
  gte,
  inArray,
  listing,
  notInArray,
  offer,
  orders,
  shop,
  sql,
  type ActivitySource,
  type SQL,
} from "@repo/db";
import type { ShopStats, StatsPeriod } from "../mock-shops";

/*
 * B4 Stats, plus the mini stats on a shop (B2) and a listing (C9). Views and
 * shares come from `activity`, likes from `favourite`, followers from
 * `follow`, offers and sales from their own tables. Each metric is one
 * aggregate query with a count per period and for the same length before it.
 */

const DAY = 24 * 60 * 60 * 1000;

export const PERIODS: StatsPeriod[] = ["7d", "30d", "90d", "year"];

type Window = { start: Date; prevStart: Date };

function windows(now = new Date()): Record<StatsPeriod, Window> {
  const back = (days: number) => new Date(now.getTime() - days * DAY);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const span = (start: Date): Window => ({ start, prevStart: new Date(start.getTime() - (now.getTime() - start.getTime())) });
  return { "7d": span(back(7)), "30d": span(back(30)), "90d": span(back(90)), year: span(yearStart) };
}

type Pair = { cur: number; prev: number };

/** For one table: per period, the count (or sum of `value`) in the period and in the one before. */
async function perPeriod(
  from: (q: ReturnType<typeof db.select<Record<string, SQL<number>>>>) => PromiseLike<unknown>,
  createdAt: SQL | Parameters<typeof sql>[1],
  w: Record<StatsPeriod, Window>,
  value?: SQL,
): Promise<Record<StatsPeriod, Pair>> {
  const columns: Record<string, SQL<number>> = {};
  for (const p of PERIODS) {
    const v = value ?? sql`1`;
    columns[`${p}_cur`] = sql<number>`coalesce(sum(${v}) filter (where ${createdAt} >= ${w[p].start}), 0)`.mapWith(Number);
    columns[`${p}_prev`] = sql<number>`coalesce(sum(${v}) filter (where ${createdAt} >= ${w[p].prevStart} and ${createdAt} < ${w[p].start}), 0)`.mapWith(Number);
  }
  const [row] = (await from(db.select(columns))) as Record<string, number>[];
  return Object.fromEntries(PERIODS.map((p) => [p, { cur: row?.[`${p}_cur`] ?? 0, prev: row?.[`${p}_prev`] ?? 0 }])) as Record<
    StatsPeriod,
    Pair
  >;
}

const sourceLabels: Record<ActivitySource, string> = {
  direct: "Your link",
  marketplace: "Marketplace",
  store: "Your store page",
  search: "Search",
  social: "Social",
  qr: "QR code",
  other: "Other sites",
};

/** "12 more than before", "3 fewer than before", "Same as before". */
function versus(pair: Pair, noun = "") {
  const d = pair.cur - pair.prev;
  if (d === 0) return pair.cur ? "Same as before" : "None yet";
  return `${Math.abs(d).toLocaleString("en-US")} ${d > 0 ? "more" : "fewer"}${noun} than before`;
}

const n = (x: number) => x.toLocaleString("en-US");
const dollars = (cents: number) => Math.round(cents / 100);
const shortDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** The earnings chart's bars for a period: days for a week, chunks for a month or quarter, months for the year. */
function buckets(p: StatsPeriod, w: Window, now: Date) {
  if (p === "year") {
    return Array.from({ length: now.getMonth() + 1 }, (_, m) => {
      const start = new Date(now.getFullYear(), m, 1);
      const end = new Date(now.getFullYear(), m + 1, 1);
      const name = start.toLocaleDateString("en-US", { month: "short" });
      return { start, end, label: name, short: name, dates: start.toLocaleDateString("en-US", { month: "long" }) };
    });
  }
  const count = p === "7d" ? 7 : p === "30d" ? 5 : 6;
  const size = (now.getTime() - w.start.getTime()) / count;
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(w.start.getTime() + i * size);
    const end = new Date(w.start.getTime() + (i + 1) * size);
    const label =
      p === "7d" ? start.toLocaleDateString("en-US", { weekday: "short" }) : shortDay(start);
    const last = new Date(end.getTime() - 1);
    return {
      start,
      end,
      label,
      short: label,
      dates: p === "7d" ? shortDay(start) : `${shortDay(start)} to ${shortDay(last)}`,
    };
  });
}

export type LiveStats = ShopStats & { chartTitle: string };

/**
 * Everything on B4 for one seller, every period at once (the period picker is
 * instant). `shopSlug` narrows it to one shop; "all" or nothing is every shop.
 */
export async function sellerStats(sellerId: string, shopSlug?: string | null): Promise<Record<StatsPeriod, LiveStats>> {
  const now = new Date();
  const w = windows(now);
  const shops = await db
    .select({ id: shop.id, slug: shop.slug })
    .from(shop)
    .where(eq(shop.ownerId, sellerId));
  const ids = (shopSlug && shopSlug !== "all" ? shops.filter((s) => s.slug === shopSlug) : shops).map((s) => s.id);
  // Nothing to count: zeroes all round (inArray with no ids is invalid SQL)
  const scope = ids.length ? ids : ["-"];
  const liveOrder = notInArray(orders.status, ["refunded", "cancelled"]);
  const net = sql`coalesce(${orders.sellerNetCents}, ${orders.totalCents})`;

  const [views, shares, likes, follows, offers, offersPaid, sold, made, sources, looked, totals, sales] = await Promise.all([
    perPeriod((q) => q.from(activity).where(and(inArray(activity.shopId, scope), eq(activity.kind, "view"))), activity.createdAt, w),
    perPeriod((q) => q.from(activity).where(and(inArray(activity.shopId, scope), eq(activity.kind, "share"))), activity.createdAt, w),
    perPeriod(
      (q) => q.from(favourite).innerJoin(listing, eq(listing.id, favourite.listingId)).where(inArray(listing.shopId, scope)),
      favourite.createdAt,
      w,
    ),
    perPeriod((q) => q.from(follow).where(inArray(follow.shopId, scope)), follow.createdAt, w),
    perPeriod((q) => q.from(offer).where(inArray(offer.shopId, scope)), offer.createdAt, w),
    perPeriod((q) => q.from(offer).where(and(inArray(offer.shopId, scope), eq(offer.status, "paid"))), offer.createdAt, w),
    perPeriod((q) => q.from(orders).where(and(inArray(orders.shopId, scope), liveOrder)), orders.createdAt, w),
    perPeriod((q) => q.from(orders).where(and(inArray(orders.shopId, scope), liveOrder)), orders.createdAt, w, net),
    // Views by source, per period
    db
      .select({
        source: activity.source,
        ...Object.fromEntries(
          PERIODS.map((p) => [p, sql<number>`count(*) filter (where ${activity.createdAt} >= ${w[p].start})`.mapWith(Number)]),
        ),
      })
      .from(activity)
      .where(and(inArray(activity.shopId, scope), eq(activity.kind, "view"), gte(activity.createdAt, w.year.start < w["90d"].start ? w.year.start : w["90d"].start)))
      .groupBy(activity.source),
    // Views by listing, per period
    db
      .select({
        listingId: activity.listingId,
        ...Object.fromEntries(
          PERIODS.map((p) => [p, sql<number>`count(*) filter (where ${activity.createdAt} >= ${w[p].start})`.mapWith(Number)]),
        ),
      })
      .from(activity)
      .where(and(inArray(activity.shopId, scope), eq(activity.kind, "view"), sql`${activity.listingId} is not null`))
      .groupBy(activity.listingId),
    // All-time followers and likes
    Promise.all([
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(follow).where(inArray(follow.shopId, scope)),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(favourite)
        .innerJoin(listing, eq(listing.id, favourite.listingId))
        .where(inArray(listing.shopId, scope)),
    ]),
    // Sales this year and in the window before the longest period, for the chart and time to sell
    db
      .select({ at: orders.createdAt, cents: net, publishedAt: listing.publishedAt })
      .from(orders)
      .innerJoin(listing, eq(listing.id, orders.listingId))
      .where(
        and(
          inArray(orders.shopId, scope),
          liveOrder,
          gte(orders.createdAt, w.year.start < w["90d"].start ? w.year.start : w["90d"].start),
        ),
      ),
  ]);
  const [[followersTotal], [likesTotal]] = totals;

  // Titles, likes and waiting offers for anything that made a "most looked at" list
  const topIds = new Set<string>();
  for (const p of PERIODS)
    [...looked]
      .filter((r) => at(r, p))
      .sort((a, b) => at(b, p) - at(a, p))
      .slice(0, 3)
      .forEach((r) => r.listingId && topIds.add(r.listingId));
  const minis = await listingStats([...topIds]);
  const titles = topIds.size
    ? await db
        .select({ id: listing.id, title: sql<string>`coalesce(${listing.title}, ${listing.name}, 'Untitled')` })
        .from(listing)
        .where(inArray(listing.id, [...topIds]))
    : [];
  const titleOf = new Map(titles.map((t) => [t.id, t.title]));

  const out = {} as Record<StatsPeriod, LiveStats>;
  for (const p of PERIODS) {
    const inPeriod = sales.filter((s) => s.at >= w[p].start);
    const days = inPeriod
      .filter((s) => s.publishedAt)
      .map((s) => (s.at.getTime() - s.publishedAt!.getTime()) / DAY)
      .sort((a, b) => a - b);
    const median = days.length ? days[Math.floor(days.length / 2)]! : 0;
    const sourceTotal = sources.reduce((sum, s) => sum + at(s, p), 0);
    out[p] = {
      chartTitle: p === "7d" ? "Earned each day" : p === "year" ? "Earned each month" : "Earned over time",
      made: dollars(made[p].cur),
      change: dollars(made[p].cur - made[p].prev),
      weeks: buckets(p, w[p], now).map((b) => ({
        label: b.label,
        short: b.short,
        dates: b.dates,
        value: dollars(sales.filter((s) => s.at >= b.start && s.at < b.end).reduce((sum, s) => sum + Number(s.cents), 0)),
      })),
      thingsSold: sold[p].cur,
      averageSale: sold[p].cur ? dollars(made[p].cur / sold[p].cur) : 0,
      daysToSell: Math.max(Math.round(median), days.length ? 1 : 0),
      tiles: [
        { label: "Views", value: n(views[p].cur), note: versus(views[p]) },
        { label: "Likes", value: n(likes[p].cur), note: `${n(likesTotal?.n ?? 0)} saved right now` },
        { label: "Shares", value: n(shares[p].cur), note: versus(shares[p]) },
        { label: "Shop followers", value: n(followersTotal?.n ?? 0), note: `${n(follows[p].cur)} new` },
        { label: "Offers", value: n(offers[p].cur), note: `${n(offersPaid[p].cur)} turned into sales` },
        { label: "Sold", value: n(sold[p].cur), note: versus(sold[p]) },
      ],
      sources: sources
        .filter((s) => s.source && at(s, p) > 0)
        .map((s) => ({
          label: sourceLabels[s.source as ActivitySource] ?? "Other sites",
          percent: Math.round((at(s, p) / sourceTotal) * 100),
        }))
        .sort((a, b) => b.percent - a.percent),
      mostLooked: [...looked]
        .filter((r) => r.listingId && at(r, p) > 0)
        .sort((a, b) => at(b, p) - at(a, p))
        .slice(0, 3)
        .map((r) => {
          const m = minis.get(r.listingId!);
          const waiting = m?.offersWaiting ?? 0;
          return {
            title: titleOf.get(r.listingId!) ?? "Untitled",
            note: `${plural(m?.likes ?? 0, "like")}, ${waiting ? `${plural(waiting, "offer")} waiting` : "no offers waiting"}`,
            views: at(r, p),
            href: `/listings/${r.listingId}`,
          };
        }),
      agent: { questions: 0, offers: 0, hours: "0" },
    };
  }
  return out;
}

/** A per-period count off a grouped row ({ "7d": 3, "30d": 9, … }). */
function at(row: object, p: StatsPeriod) {
  return (row as unknown as Record<string, number>)[p] ?? 0;
}

function plural(count: number, word: string) {
  return `${n(count)} ${word}${count === 1 ? "" : "s"}`;
}

export type ListingMini = {
  views: number;
  views7d: number;
  likes: number;
  shares: number;
  offers: number;
  offersWaiting: number;
};

/** Per listing: views (all time and this week), likes, shares and offers. For B2 rows, C9 and "most looked at". */
export async function listingStats(listingIds: string[]): Promise<Map<string, ListingMini>> {
  const out = new Map<string, ListingMini>();
  if (!listingIds.length) return out;
  for (const id of listingIds) out.set(id, { views: 0, views7d: 0, likes: 0, shares: 0, offers: 0, offersWaiting: 0 });
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const [acts, likes, offs] = await Promise.all([
    db
      .select({
        id: activity.listingId,
        views: sql<number>`count(*) filter (where ${activity.kind} = 'view')`.mapWith(Number),
        views7d: sql<number>`count(*) filter (where ${activity.kind} = 'view' and ${activity.createdAt} >= ${weekAgo})`.mapWith(Number),
        shares: sql<number>`count(*) filter (where ${activity.kind} = 'share')`.mapWith(Number),
      })
      .from(activity)
      .where(inArray(activity.listingId, listingIds))
      .groupBy(activity.listingId),
    db
      .select({ id: favourite.listingId, n: sql<number>`count(*)`.mapWith(Number) })
      .from(favourite)
      .where(inArray(favourite.listingId, listingIds))
      .groupBy(favourite.listingId),
    db
      .select({
        id: offer.listingId,
        n: sql<number>`count(*)`.mapWith(Number),
        waiting: sql<number>`count(*) filter (where ${offer.status} = 'open' and ${offer.expiresAt} > now())`.mapWith(Number),
      })
      .from(offer)
      .where(inArray(offer.listingId, listingIds))
      .groupBy(offer.listingId),
  ]);
  for (const a of acts) if (a.id) Object.assign(out.get(a.id)!, { views: a.views, views7d: a.views7d, shares: a.shares });
  for (const l of likes) out.get(l.id)!.likes = l.n;
  for (const o of offs) Object.assign(out.get(o.id)!, { offers: o.n, offersWaiting: o.waiting });
  return out;
}

export type ShopMini = {
  views7d: number;
  views: number;
  followers: number;
  likes: number;
  shares: number;
  offersWaiting: number;
  /** What the seller gets from sales in the last 7 days, after fees. */
  madeWeekCents: number;
};

/** One shop at a glance: store and listing views, followers, likes, shares, offers waiting. */
export async function shopMiniStats(shopId: string): Promise<ShopMini> {
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const count = sql<number>`count(*)`.mapWith(Number);
  const [[acts], [followers], [likes], [waiting], [made]] = await Promise.all([
    db
      .select({
        views: sql<number>`count(*) filter (where ${activity.kind} = 'view')`.mapWith(Number),
        views7d: sql<number>`count(*) filter (where ${activity.kind} = 'view' and ${activity.createdAt} >= ${weekAgo})`.mapWith(Number),
        shares: sql<number>`count(*) filter (where ${activity.kind} = 'share')`.mapWith(Number),
      })
      .from(activity)
      .where(eq(activity.shopId, shopId)),
    db.select({ n: count }).from(follow).where(eq(follow.shopId, shopId)),
    db
      .select({ n: count })
      .from(favourite)
      .innerJoin(listing, eq(listing.id, favourite.listingId))
      .where(eq(listing.shopId, shopId)),
    db
      .select({ n: count })
      .from(offer)
      .where(and(eq(offer.shopId, shopId), eq(offer.status, "open"), sql`${offer.expiresAt} > now()`)),
    db
      .select({ cents: sql<number>`coalesce(sum(coalesce(${orders.sellerNetCents}, ${orders.totalCents})), 0)`.mapWith(Number) })
      .from(orders)
      .where(
        and(
          eq(orders.shopId, shopId),
          notInArray(orders.status, ["refunded", "cancelled"]),
          gte(orders.createdAt, weekAgo),
        ),
      ),
  ]);
  return {
    views: acts?.views ?? 0,
    views7d: acts?.views7d ?? 0,
    shares: acts?.shares ?? 0,
    followers: followers?.n ?? 0,
    likes: likes?.n ?? 0,
    offersWaiting: waiting?.n ?? 0,
    madeWeekCents: made?.cents ?? 0,
  };
}

