/*
 * Prototype data for the B screens: a shop's listings, its stats and the
 * sales and payouts page. Nothing here is real. Shops themselves live in
 * ./mock.ts; this file only adds what those screens need.
 */

import { shops, type Shop } from "./mock";

/* ---------- Listings (B2) ---------- */

export type ThumbKind =
  | "dress"
  | "sweater"
  | "tote"
  | "jacket"
  | "vase"
  | "pot"
  | "record"
  | "mug";

export type ThumbTone = "pink" | "leaf" | "muted" | "lemon";

export type ShopListing = {
  id: string;
  title: string;
  /** Second line on desktop, e.g. "Size M, worn twice". */
  detail: string;
  price: number;
  views: number;
  saves: number;
  listed: string;
  offers: number;
  isNew?: boolean;
  thumb: ThumbKind;
  tone: ThumbTone;
  status: "live" | "draft" | "sold";
};

export type ShopData = {
  slug: string;
  counts: { live: number; drafts: number; sold: number };
  madeThisWeek: number;
  offersWaiting: number;
  viewsThisWeek: number;
  listings: ShopListing[];
};

const shopData: Record<string, Omit<ShopData, "slug">> = {
  "mayas-closet": {
    counts: { live: 38, drafts: 2, sold: 112 },
    madeThisWeek: 182,
    offersWaiting: 3,
    viewsThisWeek: 412,
    listings: [
      { id: "linen-dress", title: "Linen wrap dress", detail: "Size M, worn twice", price: 24, views: 86, saves: 9, listed: "2 days ago", offers: 1, thumb: "dress", tone: "pink", status: "live" },
      { id: "knit-sweater", title: "Chunky knit sweater", detail: "Size S, like new", price: 38, views: 212, saves: 31, listed: "5 days ago", offers: 2, thumb: "sweater", tone: "leaf", status: "live" },
      { id: "market-tote", title: "Canvas market tote", detail: "Barely used", price: 16, views: 41, saves: 3, listed: "1 week ago", offers: 0, thumb: "tote", tone: "muted", status: "live" },
      { id: "rain-jacket", title: "Green rain jacket", detail: "Size M, waterproof", price: 45, views: 9, saves: 1, listed: "Today", offers: 0, isNew: true, thumb: "jacket", tone: "lemon", status: "live" },
      { id: "summer-dress", title: "Striped summer dress", detail: "Size S, worn once", price: 28, views: 64, saves: 7, listed: "2 weeks ago", offers: 0, thumb: "dress", tone: "leaf", status: "live" },
      { id: "wool-cardigan", title: "Wool cardigan", detail: "Size M, a bit loved", price: 22, views: 38, saves: 4, listed: "3 weeks ago", offers: 0, thumb: "sweater", tone: "pink", status: "live" },
      { id: "draft-tote", title: "Leather shoulder bag", detail: "Needs photos", price: 40, views: 0, saves: 0, listed: "Started yesterday", offers: 0, thumb: "tote", tone: "lemon", status: "draft" },
      { id: "draft-jacket", title: "Denim jacket", detail: "Needs a price", price: 35, views: 0, saves: 0, listed: "Started 3 days ago", offers: 0, thumb: "jacket", tone: "muted", status: "draft" },
      { id: "sold-sweater", title: "Chunky knit sweater", detail: "Sold to Dana W.", price: 38, views: 212, saves: 31, listed: "Sold Sep 27", offers: 0, thumb: "sweater", tone: "leaf", status: "sold" },
      { id: "sold-towel", title: "Striped beach towel", detail: "Sold to Sam O.", price: 40, views: 77, saves: 6, listed: "Sold Sep 25", offers: 0, thumb: "tote", tone: "lemon", status: "sold" },
      { id: "sold-boots", title: "Leather ankle boots", detail: "Sold to Ana R.", price: 68, views: 140, saves: 18, listed: "Sold Sep 17", offers: 0, thumb: "jacket", tone: "muted", status: "sold" },
    ],
  },
  "home-and-kitchen": {
    counts: { live: 12, drafts: 1, sold: 23 },
    madeThisWeek: 64,
    offersWaiting: 0,
    viewsThisWeek: 96,
    listings: [
      { id: "glass-carafe", title: "Glass carafe set", detail: "Two glasses, no chips", price: 22, views: 54, saves: 6, listed: "3 days ago", offers: 0, thumb: "vase", tone: "leaf", status: "live" },
      { id: "stoneware-mugs", title: "Stoneware mugs, set of 4", detail: "Hand thrown", price: 30, views: 41, saves: 5, listed: "1 week ago", offers: 0, thumb: "mug", tone: "lemon", status: "live" },
      { id: "cast-iron", title: "Cast iron skillet", detail: "10 inch, seasoned", price: 26, views: 33, saves: 2, listed: "Today", offers: 0, isNew: true, thumb: "pot", tone: "muted", status: "live" },
      { id: "dutch-oven", title: "Sunny yellow Le Creuset dutch oven, 5.5 qt", detail: "Still a draft", price: 185, views: 0, saves: 0, listed: "Started today", offers: 0, thumb: "pot", tone: "lemon", status: "draft" },
      { id: "bud-vase", title: "Ceramic bud vase", detail: "Sold to Priya K.", price: 18, views: 48, saves: 4, listed: "Sold Sep 29", offers: 0, thumb: "vase", tone: "lemon", status: "sold" },
    ],
  },
  "toms-old-records": {
    counts: { live: 0, drafts: 4, sold: 0 },
    madeThisWeek: 0,
    offersWaiting: 0,
    viewsThisWeek: 0,
    listings: [
      { id: "blue-train", title: "John Coltrane, Blue Train", detail: "1970s pressing", price: 45, views: 0, saves: 0, listed: "Started last week", offers: 0, thumb: "record", tone: "muted", status: "draft" },
      { id: "rumours", title: "Fleetwood Mac, Rumours", detail: "Sleeve a bit worn", price: 30, views: 0, saves: 0, listed: "Started last week", offers: 0, thumb: "record", tone: "lemon", status: "draft" },
      { id: "kind-of-blue", title: "Miles Davis, Kind of Blue", detail: "Needs photos", price: 38, views: 0, saves: 0, listed: "Started 2 weeks ago", offers: 0, thumb: "record", tone: "leaf", status: "draft" },
      { id: "abbey-road", title: "The Beatles, Abbey Road", detail: "Needs a price", price: 0, views: 0, saves: 0, listed: "Started 2 weeks ago", offers: 0, thumb: "record", tone: "pink", status: "draft" },
    ],
  },
};

export function getShopData(slug: string): ShopData | undefined {
  const data = shopData[slug];
  return data ? { slug, ...data } : undefined;
}

export function findShop(slug: string): Shop | undefined {
  return shops.find((shop) => shop.slug === slug);
}

/** Links that are already taken, for the "Shop link" check on B1. */
export const takenLinks = ["maya", "maya-home", "toms-records", "shop", "store"];

/* ---------- Stats (B4) ---------- */

export type StatsPeriod = "7d" | "30d" | "90d" | "year";

export const periods: { value: StatsPeriod; label: string; short: string; before: string }[] = [
  { value: "7d", label: "Last 7 days", short: "7 days", before: "on the 7 days before" },
  { value: "30d", label: "Last 30 days", short: "30 days", before: "on the 30 days before" },
  { value: "90d", label: "Last 90 days", short: "90 days", before: "on the 90 days before" },
  { value: "year", label: "This year", short: "This year", before: "on last year" },
];

export type ShopStats = {
  made: number;
  change: number;
  weeks: { label: string; short: string; dates: string; value: number }[];
  thingsSold: number;
  averageSale: number;
  daysToSell: number;
  tiles: { label: string; value: string; note: string }[];
  sources: { label: string; percent: number }[];
  mostLooked: { title: string; note: string; views: number }[];
  agent: { questions: number; offers: number; hours: string };
};

const weekLabels = [
  { label: "Week of Sep 2", short: "Sep 2", dates: "Sep 2 to Sep 8" },
  { label: "Sep 9", short: "Sep 9", dates: "Sep 9 to Sep 15" },
  { label: "Sep 16", short: "Sep 16", dates: "Sep 16 to Sep 22" },
  { label: "Sep 23", short: "Sep 23", dates: "Sep 23 to Sep 29" },
];

function weeks(values: number[]) {
  return weekLabels.map((week, i) => ({ ...week, value: values[i] ?? 0 }));
}

export const statsByShop: Record<string, ShopStats> = {
  all: {
    made: 856,
    change: 158,
    weeks: weeks([168, 126, 316, 246]),
    thingsSold: 20,
    averageSale: 43,
    daysToSell: 7,
    tiles: [
      { label: "Views", value: "1,606", note: "398 more than before" },
      { label: "Sold", value: "20", note: "5 more than before" },
      { label: "Offers", value: "28", note: "12 turned into sales" },
      { label: "Shop followers", value: "105", note: "16 new" },
    ],
    sources: [
      { label: "Your link", percent: 44 },
      { label: "Marketplace", percent: 29 },
      { label: "Instagram", percent: 19 },
      { label: "QR code", percent: 8 },
    ],
    mostLooked: [
      { title: "Chunky knit sweater", note: "31 saves, 2 offers waiting", views: 212 },
      { title: "Linen wrap dress", note: "9 saves, 1 offer waiting", views: 86 },
      { title: "Glass carafe set", note: "6 saves, no offers yet", views: 54 },
    ],
    agent: { questions: 39, offers: 28, hours: "4 hrs" },
  },
  "mayas-closet": {
    made: 642,
    change: 118,
    weeks: weeks([120, 96, 244, 182]),
    thingsSold: 14,
    averageSale: 46,
    daysToSell: 6,
    tiles: [
      { label: "Views", value: "1,204", note: "310 more than before" },
      { label: "Sold", value: "14", note: "3 more than before" },
      { label: "Offers", value: "23", note: "9 turned into sales" },
      { label: "Shop followers", value: "86", note: "12 new" },
    ],
    sources: [
      { label: "Your link", percent: 46 },
      { label: "Marketplace", percent: 31 },
      { label: "Instagram", percent: 15 },
      { label: "QR code", percent: 8 },
    ],
    mostLooked: [
      { title: "Chunky knit sweater", note: "31 saves, 2 offers waiting", views: 212 },
      { title: "Linen wrap dress", note: "9 saves, 1 offer waiting", views: 86 },
      { title: "Canvas market tote", note: "3 saves, no offers yet", views: 41 },
    ],
    agent: { questions: 31, offers: 23, hours: "3 hrs" },
  },
  "home-and-kitchen": {
    made: 214,
    change: 40,
    weeks: weeks([48, 30, 72, 64]),
    thingsSold: 6,
    averageSale: 36,
    daysToSell: 9,
    tiles: [
      { label: "Views", value: "402", note: "88 more than before" },
      { label: "Sold", value: "6", note: "2 more than before" },
      { label: "Offers", value: "5", note: "3 turned into sales" },
      { label: "Shop followers", value: "19", note: "4 new" },
    ],
    sources: [
      { label: "Your link", percent: 52 },
      { label: "Instagram", percent: 30 },
      { label: "QR code", percent: 12 },
      { label: "Marketplace", percent: 6 },
    ],
    mostLooked: [
      { title: "Glass carafe set", note: "6 saves, no offers yet", views: 54 },
      { title: "Stoneware mugs, set of 4", note: "5 saves, no offers yet", views: 41 },
      { title: "Cast iron skillet", note: "2 saves, no offers yet", views: 33 },
    ],
    agent: { questions: 8, offers: 5, hours: "1 hr" },
  },
  "toms-old-records": {
    made: 0,
    change: 0,
    weeks: weeks([0, 0, 0, 0]),
    thingsSold: 0,
    averageSale: 0,
    daysToSell: 0,
    tiles: [
      { label: "Views", value: "0", note: "The shop isn't open yet" },
      { label: "Sold", value: "0", note: "Nothing yet" },
      { label: "Offers", value: "0", note: "Nothing yet" },
      { label: "Shop followers", value: "0", note: "Nothing yet" },
    ],
    sources: [],
    mostLooked: [],
    agent: { questions: 0, offers: 0, hours: "0 hrs" },
  },
};

/** Shorter chip labels for the phone's shop filter. */
export const phoneShopLabel: Record<string, string> = {
  "mayas-closet": "Maya's closet",
  "home-and-kitchen": "Home finds",
  "toms-old-records": "Tom's records",
};

/* ---------- Sales and payouts (B5) ---------- */

export type SaleStatus = "ready" | "shipped" | "delivered" | "paid";

export type Sale = {
  id: string;
  title: string;
  soldOn: string;
  buyer: string;
  status: SaleStatus;
  /** Badge or text in the "Where it's at" column. */
  where: string;
  /** Phone second line. */
  phoneNote: string;
  amount: number;
};

export const payout = {
  amount: 96,
  note: "Lands in your PayPal on Thursday. You get paid when the buyer gets their thing.",
  account: "maya@example.com",
};

export const readyToShip = {
  saleId: "bud-vase",
  title: "Ceramic bud vase",
  to: "To Priya K. in Seattle",
  due: "By Friday",
};

export const sales: Sale[] = [
  { id: "bud-vase", title: "Ceramic bud vase", soldOn: "Sold September 29", buyer: "Priya K.", status: "ready", where: "Ready to ship", phoneNote: "Ready to ship to Priya, by Friday", amount: 18 },
  { id: "knit-sweater", title: "Chunky knit sweater", soldOn: "Sold September 27", buyer: "Dana W.", status: "shipped", where: "Arriving tomorrow", phoneNote: "On its way to Dana, arriving tomorrow", amount: 38 },
  { id: "beach-towel", title: "Striped beach towel", soldOn: "Sold September 25", buyer: "Sam O.", status: "delivered", where: "Delivered", phoneNote: "Delivered, payout on Thursday", amount: 40 },
  { id: "denim-jacket", title: "Denim jacket", soldOn: "Sold September 19", buyer: "Lee T.", status: "paid", where: "Paid out September 24", phoneNote: "Paid out on September 24", amount: 54 },
  { id: "ankle-boots", title: "Leather ankle boots", soldOn: "Sold September 17", buyer: "Ana R.", status: "paid", where: "Paid out September 22", phoneNote: "Paid out on September 22", amount: 68 },
  { id: "rattan-basket", title: "Rattan bread basket", soldOn: "Sold September 14", buyer: "Jo P.", status: "paid", where: "Paid out September 18", phoneNote: "Paid out on September 18", amount: 12 },
  { id: "silk-scarf", title: "Silk scarf", soldOn: "Sold September 11", buyer: "Mia L.", status: "paid", where: "Paid out September 15", phoneNote: "Paid out on September 15", amount: 20 },
  { id: "linen-napkins", title: "Linen napkins, set of 6", soldOn: "Sold September 8", buyer: "Ben C.", status: "paid", where: "Paid out September 12", phoneNote: "Paid out on September 12", amount: 14 },
];

export const totalSales = 112;
