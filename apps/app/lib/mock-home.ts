/*
 * Prototype data for Home (A3/A4), Search and the welcome flow (A1/A2).
 * Same cast as lib/mock.ts. Nothing here is real.
 */

export type HomeMode = "selling" | "buying";

/** "You made this week" on the selling Home. */
export const earnings = {
  thisWeek: 182,
  sales: 5,
  payout: 96,
  payoutDay: "Thursday",
};

/** The offer the agent flags on the selling Home. Opens C10. */
export const jessOffer = {
  id: "jess-linen-dress",
  buyer: "Jess",
  amount: 20,
  hold: 5,
  item: "the linen dress",
  meta: "Your agent, 10 min ago",
  note: "That's right at your lowest price, and she put money down. I'd take it.",
};

/** A sale waiting to ship (desktop "needs you" card). */
export const shipTask = {
  title: "Ship the bud vase by Friday",
  detail: "Sold to Priya for $18. The label is ready.",
};

export type FollowedShop = {
  name: string;
  initial: string;
  /** Avatar fill. */
  tone: "primary" | "leaf" | "pink" | "secondary";
  /** Pink dot: something new since you last looked. */
  hasNew: boolean;
};

export const followedShops: FollowedShop[] = [
  { name: "Nina", initial: "N", tone: "primary", hasNew: true },
  { name: "Billy", initial: "B", tone: "leaf", hasNew: true },
  { name: "June", initial: "J", tone: "pink", hasNew: false },
  { name: "Tom", initial: "T", tone: "secondary", hasNew: false },
];

export const followedCount = 9;

export type BuyerOffer = {
  id: string;
  item: string;
  detail: string;
  status: "accepted" | "waiting";
  /** Amount to pay when accepted. */
  amount: number;
  seller: string;
  icon: "lamp" | "blanket";
  tone: "lemon" | "leaf";
};

export const buyerOffers: BuyerOffer[] = [
  {
    id: "brass-desk-lamp",
    item: "Brass desk lamp",
    detail: "June said yes to $32",
    status: "accepted",
    amount: 32,
    seller: "June",
    icon: "lamp",
    tone: "lemon",
  },
  {
    id: "wool-picnic-blanket",
    item: "Wool picnic blanket",
    detail: "You offered $40, $5 hold",
    status: "waiting",
    amount: 40,
    seller: "Billy",
    icon: "blanket",
    tone: "leaf",
  },
];

export type ItemIllustration =
  | "sweater"
  | "tote"
  | "vase"
  | "dress"
  | "lamp"
  | "blanket"
  | "record"
  | "dutch-oven";

export type ShopItem = {
  id: string;
  title: string;
  meta: string;
  price: number;
  shop: string;
  category: "Clothes" | "Home" | "Records";
  illustration: ItemIllustration;
  tone: "pink" | "leaf" | "lemon" | "muted";
  liked?: boolean;
};

/** Things for sale in shops Maya follows. The first three show on the buying Home. */
export const shopItems: ShopItem[] = [
  {
    id: "chunky-knit-sweater",
    title: "Chunky knit sweater",
    meta: "Size S, like new",
    price: 38,
    shop: "Nina",
    category: "Clothes",
    illustration: "sweater",
    tone: "leaf",
    liked: true,
  },
  {
    id: "canvas-market-tote",
    title: "Canvas market tote",
    meta: "Barely used",
    price: 16,
    shop: "Billy",
    category: "Clothes",
    illustration: "tote",
    tone: "muted",
  },
  {
    id: "ceramic-bud-vase",
    title: "Ceramic bud vase",
    meta: "Handmade, no chips",
    price: 22,
    shop: "June",
    category: "Home",
    illustration: "vase",
    tone: "lemon",
  },
  {
    id: "linen-wrap-dress",
    title: "Linen wrap dress",
    meta: "Size M, worn twice",
    price: 24,
    shop: "Nina",
    category: "Clothes",
    illustration: "dress",
    tone: "pink",
  },
  {
    id: "brass-desk-lamp",
    title: "Brass desk lamp",
    meta: "Works, new cord",
    price: 32,
    shop: "June",
    category: "Home",
    illustration: "lamp",
    tone: "lemon",
  },
  {
    id: "wool-picnic-blanket",
    title: "Wool picnic blanket",
    meta: "Big enough for four",
    price: 45,
    shop: "Billy",
    category: "Home",
    illustration: "blanket",
    tone: "leaf",
  },
  {
    id: "blue-note-lp",
    title: "Jazz LP, 1960s pressing",
    meta: "Sleeve worn, vinyl clean",
    price: 28,
    shop: "Tom",
    category: "Records",
    illustration: "record",
    tone: "muted",
  },
  {
    id: "orange-dutch-oven",
    title: "Orange cast iron pot",
    meta: "3.5 qt, light marks",
    price: 60,
    shop: "June",
    category: "Home",
    illustration: "dutch-oven",
    tone: "pink",
  },
];
