/*
 * Every designed screen, keyed by the artboard code in the Paper file
 * "Resell.Store". The /screens index is built from this list.
 *
 * `href` is the screen as designed (the mock data's slugs). `live` points the
 * Live link at the signed-in person's own shop or listing when the route needs
 * one; without it (or signed out) Live uses `href` too.
 */

import { storeUrl } from "./urls";

/** "live" is wired to real data, "empty" is a real page with nothing behind it yet, "soon" is next phase. */
export type ScreenStatus = "live" | "empty" | "soon";

/** What the Live links can point at for the signed-in person. */
export type LiveContext = {
  /** Their first shop's slug. */
  shop: string | null;
  /** Their most recently touched listing, any status. */
  listing: { id: string } | null;
  /** Their most recent published listing, for the store page. */
  published: { shop: string; slug: string } | null;
};

export type Screen = {
  code: string;
  name: string;
  href: string;
  status: ScreenStatus;
  note?: string;
  live?: (ctx: LiveContext) => string | null;
};

export type ScreenGroup = { key: string; title: string; screens: Screen[] };

const listingStep =
  (step: string, query = "") =>
  ({ listing }: LiveContext) =>
    listing ? `/list/${listing.id}/${step}${query}` : "/list/new";

export const screenGroups: ScreenGroup[] = [
  {
    key: "A",
    title: "Account",
    screens: [
      { code: "A1", name: "Sign up", href: "/welcome", status: "live" },
      { code: "A2", name: "Buying or selling", href: "/welcome/start", status: "live" },
      { code: "A3", name: "Home, selling", href: "/home?mode=selling", status: "live" },
      { code: "A4", name: "Home, buying", href: "/home?mode=buying", status: "live" },
      { code: "A5", name: "Inbox", href: "/inbox", status: "live" },
      { code: "A6", name: "Me", href: "/me", status: "live" },
      {
        code: "A7",
        name: "Edit profile",
        href: "/me/edit",
        status: "live",
        note: "One page with A6 on desktop",
      },
    ],
  },
  {
    key: "B",
    title: "Shops",
    screens: [
      { code: "B1", name: "Create shop", href: "/shops/new", status: "live" },
      {
        code: "B2",
        name: "Shop listings",
        href: "/shops/mayas-closet",
        status: "live",
        live: ({ shop }) => (shop ? `/shops/${shop}` : "/shops/new"),
      },
      {
        code: "B3",
        name: "Shop settings",
        href: "/shops/mayas-closet/settings",
        status: "live",
        live: ({ shop }) => (shop ? `/shops/${shop}/settings` : "/shops/new"),
      },
      { code: "B4", name: "Stats", href: "/stats", status: "live" },
      { code: "B5", name: "Sales and payouts", href: "/sales", status: "live" },
    ],
  },
  {
    key: "C",
    title: "Listing",
    screens: [
      { code: "C1", name: "Start", href: "/list/new", status: "live" },
      {
        code: "C2",
        name: "Research",
        href: "/list/dutch-oven/research",
        status: "live",
        live: listingStep("research"),
      },
      {
        code: "C3",
        name: "Findings and questions",
        href: "/list/dutch-oven/research?view=findings",
        status: "live",
        live: listingStep("research", "?view=findings"),
      },
      {
        code: "C4",
        name: "Details",
        href: "/list/dutch-oven/details",
        status: "live",
        live: listingStep("details"),
      },
      {
        code: "C5",
        name: "Photos",
        href: "/list/dutch-oven/photos",
        status: "live",
        live: listingStep("photos"),
      },
      {
        code: "C6",
        name: "Words",
        href: "/list/dutch-oven/words",
        status: "live",
        live: listingStep("words"),
      },
      {
        code: "C7",
        name: "Publish and share",
        href: "/list/dutch-oven/publish",
        status: "live",
        live: listingStep("publish"),
      },
      {
        code: "C8",
        name: "List elsewhere",
        href: "/list/dutch-oven/publish?view=elsewhere",
        status: "soon",
        live: listingStep("publish", "?view=elsewhere"),
      },
      {
        code: "C9",
        name: "Manage",
        href: "/listings/dutch-oven",
        status: "live",
        live: ({ listing }) => (listing ? `/listings/${listing.id}` : null),
      },
      { code: "C10", name: "Offer", href: "/offers/jess-dutch-oven", status: "live" },
    ],
  },
  {
    key: "D",
    title: "Tools",
    screens: [
      {
        code: "D1",
        name: "Connections",
        href: "/tools/connections",
        status: "live",
        note: "PayPal and your own AI/API; other sites left off for now",
      },
      { code: "D2", name: "Connect your agent", href: "/tools/agent", status: "live" },
      { code: "D3", name: "API", href: "/tools/api", status: "live" },
      { code: "D4", name: "Shopping sidekick", href: "/tools/sidekick", status: "soon" },
    ],
  },
  {
    key: "P",
    title: "Public store",
    screens: [
      { code: "P1", name: "Marketplace", href: "/discover", status: "live" },
      {
        code: "P2",
        name: "Store",
        href: storeUrl("maya"),
        status: "live",
        note: "Each store is its own subdomain",
        live: ({ shop }) => (shop ? storeUrl(shop) : null),
      },
      {
        code: "P3",
        name: "Listing",
        href: storeUrl("secondshutter", "/35mm-film-camera"),
        status: "live",
        note: "P9 under 900px",
        live: ({ published }) =>
          published ? storeUrl(published.shop, `/${published.slug}`) : null,
      },
      {
        code: "P4",
        name: "Checkout",
        href: "/checkout/35mm-film-camera",
        status: "live",
        note: "P10 under 900px",
      },
      { code: "P5", name: "Make an offer", href: "/offer/35mm-film-camera", status: "live" },
      { code: "P6", name: "Messages and agent chat", href: "/messages", status: "live" },
      { code: "P7", name: "Connect your agent", href: "/agent", status: "live" },
      { code: "P8", name: "Buyer account", href: "/account", status: "live" },
    ],
  },
];

export const screenStatuses: Record<ScreenStatus, { label: string; description: string }> = {
  live: { label: "Live", description: "Wired to real data" },
  empty: { label: "Empty", description: "Real page, nothing behind it yet, so an empty state" },
  soon: { label: "Soon", description: "Next phase, a preview of what it will do" },
};
