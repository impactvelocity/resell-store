import type { Metadata } from "next";
import type { StoreTone } from "./mock-market";
import { formatCents } from "./money";
import { siteUrl, storeDomain, storeUrl } from "./urls";

/*
 * Share previews: the Open Graph / Twitter tags each public page sends, and
 * the bits the share images (components/og/cards.tsx) are drawn from.
 * Pure on purpose, so tests can check exactly what a link unfurls to.
 */

export const SITE_NAME = "resell.store";
export const SITE_HEADLINE = "Sell your stuff without doing the selling";
export const SITE_LINE = "An AI helper prices it, lists it and haggles for you. PayPal holds the money until it arrives.";
export const SITE_DESCRIPTION =
  "Snap a photo and an AI helper prices it, writes the listing and haggles for you. Buyers pay through PayPal, which holds the money until it arrives.";
export const TRUST_LINE = "PayPal holds your money until it arrives";

/** Share images are 1200×630 PNGs, the size every network crops well. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Brand colours, mirrored from packages/ui/src/styles.css (Satori can't read CSS variables). */
export const og = {
  background: "#fffdf2",
  surface: "#ffffff",
  surfaceMuted: "#f7f3df",
  border: "#e8e3cc",
  text: "#14261d",
  muted: "#56675e",
  lemon100: "#fff6c2",
  lemon300: "#ffe873",
  lemon400: "#ffd934",
  leaf100: "#ddf0e3",
  leaf300: "#8cc9a4",
  leaf600: "#256b4c",
  pink100: "#ffdceb",
  pink400: "#ff5fa8",
  pink600: "#c9246f",
} as const;

/** A store's tone as tile colours, matching StoreAvatar in components/market/parts.tsx. */
export function toneColors(tone: StoreTone): { background: string; color: string } {
  switch (tone) {
    case "lemon":
      return { background: og.lemon400, color: og.text };
    case "mint":
      return { background: og.leaf300, color: og.text };
    case "pink":
      return { background: og.pink100, color: og.text };
    case "leaf":
      return { background: og.leaf100, color: og.text };
    case "forest":
      return { background: og.leaf600, color: "#ffffff" };
    case "ink":
      return { background: og.text, color: "#ffffff" };
  }
}

/** First letter, uppercased, for initial tiles. "?" when there's nothing to go on. */
export function initialOf(text: string | null | undefined) {
  const first = text?.trim().match(/\p{L}|\p{N}/u)?.[0];
  return first ? first.toUpperCase() : "?";
}

/** At most `max` characters, cut at a word where possible, with an ellipsis. */
export function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  // Already at the end of a word, or back to the last space if that isn't too far
  const space = clean[max - 1] === " " ? cut.length : cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

/** The first sentence or paragraph of free text, for descriptions. */
export function firstSentence(text: string | null | undefined) {
  const clean = text?.trim();
  if (!clean) return "";
  return clean.split(/\n\s*\n|(?<=[.!?])\s/)[0]!.trim();
}

/** "8 for sale", "1 for sale", or "" for an empty shelf. */
export function forSaleLabel(n: number) {
  return n > 0 ? `${n.toLocaleString("en-US")} for sale` : "";
}

/* Metadata */

/** The brand image (app/opengraph-image.tsx, app/twitter-image.tsx), relative to metadataBase. */
export const SITE_IMAGE_ALT = "resell.store: sell your stuff without doing the selling";
const siteImages = (file: "opengraph-image" | "twitter-image") => [
  { url: `/${file}`, width: OG_SIZE.width, height: OG_SIZE.height, type: "image/png", alt: SITE_IMAGE_ALT },
];

type ShareInput = {
  /** <title> */
  title: string;
  /** og:title / twitter:title, when it should differ from <title>. */
  shareTitle?: string;
  description: string;
  /** Absolute canonical URL; also og:url. */
  url: string;
  other?: Metadata["other"];
  /** Use the brand image. Pages whose segment has no image file of its own need this: a page's openGraph replaces its layouts' whole, images included. */
  siteImage?: boolean;
};

/**
 * Title, description, canonical, Open Graph and Twitter tags for one page.
 * Store and listing images come from the opengraph-image / twitter-image files
 * next to those pages (file-based metadata wins over these fields anyway).
 */
export function shareMetadata({ title, shareTitle, description, url, other, siteImage }: ShareInput): Metadata {
  const t = shareTitle ?? title;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      title: t,
      description,
      ...(siteImage ? { images: siteImages("opengraph-image") } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: t,
      description,
      ...(siteImage ? { images: siteImages("twitter-image") } : {}),
    },
    ...(other ? { other } : {}),
  };
}

/** The defaults in the root layout: brand title, description and summary_large_image. */
export function rootMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl("/")),
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", title: SITE_NAME, description: SITE_DESCRIPTION },
    twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  };
}

/** A marketplace page (/, /discover, /stores). */
export function siteShare(path: string, title: string, description = SITE_DESCRIPTION) {
  return shareMetadata({ title, description, url: siteUrl(path), siteImage: true });
}

export type ShareStore = {
  slug: string;
  name: string;
  tagline?: string;
  bio?: string;
  location?: string;
  forSale: number;
};

/** A store's home page, canonical on its subdomain. */
export function storeShare(store: ShareStore): Metadata {
  const about = firstSentence(store.bio) || store.tagline || `A store on ${SITE_NAME}`;
  const facts = [store.location, forSaleLabel(store.forSale)].filter(Boolean).join(" · ");
  const description = truncate(
    [about.replace(/[.!]?$/, "."), facts ? `${facts}.` : "", `Shop it at ${storeDomain(store.slug)}.`]
      .filter(Boolean)
      .join(" "),
    200,
  );
  return shareMetadata({
    title: `${store.name} · ${SITE_NAME}`,
    shareTitle: store.name,
    description,
    url: storeUrl(store.slug),
  });
}

export type ShareListing = {
  slug: string;
  title: string;
  /** The longer title, for <title> */
  fullTitle?: string | null;
  oneLiner?: string | null;
  description?: string | null;
  priceCents: number | null;
  sold: boolean;
};

/** A listing page: price in the share title, the one-liner (or description) as the description. */
export function listingShare(listing: ShareListing, store: { slug: string; name: string }): Metadata {
  const price = formatCents(listing.priceCents);
  const blurb = listing.oneLiner?.trim() || firstSentence(listing.description);
  const lead = blurb ? `${blurb.replace(/[.!]?$/, ".")} ` : "";
  const description = truncate(
    listing.sold
      ? `${price ? `Sold for ${price}. ` : "Sold. "}${lead}More from ${store.name} on ${SITE_NAME}.`
      : `${price ? `${price}. ` : ""}${lead}From ${store.name} on ${SITE_NAME}. ${TRUST_LINE}.`,
    220,
  );
  return shareMetadata({
    title: `${listing.fullTitle ?? listing.title} · ${store.name}`,
    shareTitle: listing.sold ? `${listing.title} · Sold` : price ? `${listing.title} · ${price}` : listing.title,
    description,
    url: storeUrl(store.slug, `/${listing.slug}`),
    other:
      !listing.sold && listing.priceCents != null
        ? {
            "product:price:amount": (listing.priceCents / 100).toFixed(2),
            "product:price:currency": "USD",
          }
        : undefined,
  });
}

/* Who may appear in a share image or preview */

/** Private shops never do; public and link-only shops can be shared by their URL. */
export function isShareableShop(shop: { visibility: string }) {
  return shop.visibility !== "private";
}

/** Live or sold, listed for everyone (not link-only), with a path. Drafts never. */
export function isShareableListing(row: { status: string; visibility: string; slug: string | null }) {
  return row.visibility === "everyone" && !!row.slug && (row.status === "live" || row.status === "sold");
}
