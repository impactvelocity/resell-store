/*
 * Every designed screen, keyed by the artboard code in the Paper file
 * "Resell.Store". The /screens index is built from this list.
 */

import { storeUrl } from "./urls";

export type Screen = {
  code: string;
  name: string;
  href: string;
  note?: string;
};

export type ScreenGroup = { key: string; title: string; screens: Screen[] };

export const screenGroups: ScreenGroup[] = [
  {
    key: "A",
    title: "Account",
    screens: [
      { code: "A1", name: "Sign up", href: "/welcome" },
      { code: "A2", name: "Buying or selling", href: "/welcome/start" },
      { code: "A3", name: "Home, selling", href: "/home?mode=selling" },
      { code: "A4", name: "Home, buying", href: "/home?mode=buying" },
      { code: "A5", name: "Inbox", href: "/inbox" },
      { code: "A6", name: "Me", href: "/me" },
      {
        code: "A7",
        name: "Edit profile",
        href: "/me/edit",
        note: "One page with A6 on desktop",
      },
    ],
  },
  {
    key: "B",
    title: "Shops",
    screens: [
      { code: "B1", name: "Create shop", href: "/shops/new" },
      { code: "B2", name: "Shop listings", href: "/shops/mayas-closet" },
      {
        code: "B3",
        name: "Shop settings",
        href: "/shops/mayas-closet/settings",
      },
      { code: "B4", name: "Stats", href: "/stats" },
      { code: "B5", name: "Sales and payouts", href: "/sales" },
    ],
  },
  {
    key: "C",
    title: "Listing",
    screens: [
      { code: "C1", name: "Start", href: "/list/new" },
      { code: "C2", name: "Research", href: "/list/dutch-oven/research" },
      {
        code: "C3",
        name: "Findings and questions",
        href: "/list/dutch-oven/research?view=findings",
      },
      { code: "C4", name: "Details", href: "/list/dutch-oven/details" },
      { code: "C5", name: "Photos", href: "/list/dutch-oven/photos" },
      { code: "C6", name: "Words", href: "/list/dutch-oven/words" },
      { code: "C7", name: "Publish and share", href: "/list/dutch-oven/publish" },
      {
        code: "C8",
        name: "List elsewhere",
        href: "/list/dutch-oven/publish?view=elsewhere",
      },
      { code: "C9", name: "Manage", href: "/listings/dutch-oven" },
      { code: "C10", name: "Offer", href: "/offers/jess-dutch-oven" },
    ],
  },
  {
    key: "D",
    title: "Tools",
    screens: [
      { code: "D1", name: "Connections", href: "/tools/connections" },
      { code: "D2", name: "Connect your agent", href: "/tools/agent" },
      { code: "D3", name: "API", href: "/tools/api" },
      { code: "D4", name: "Shopping sidekick", href: "/tools/sidekick" },
    ],
  },
  {
    key: "P",
    title: "Public store",
    screens: [
      { code: "P1", name: "Marketplace", href: "/discover" },
      {
        code: "P2",
        name: "Store",
        href: storeUrl("maya"),
        note: "Each store is its own subdomain",
      },
      {
        code: "P3",
        name: "Listing",
        href: storeUrl("secondshutter", "/35mm-film-camera"),
        note: "P9 under 900px",
      },
      {
        code: "P4",
        name: "Checkout",
        href: "/checkout/35mm-film-camera",
        note: "P10 under 900px",
      },
      { code: "P5", name: "Make an offer", href: "/offer/35mm-film-camera" },
      { code: "P6", name: "Messages and agent chat", href: "/messages" },
      { code: "P7", name: "Connect your agent", href: "/agent" },
      { code: "P8", name: "Buyer account", href: "/account" },
    ],
  },
];
