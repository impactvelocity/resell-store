"use server";

import { z } from "zod";
import {
  publishListing,
  requireOwnedListing,
  updateListing,
} from "../../lib/server/listings";
import { demoBlocked, demoListingBlocked } from "../../lib/server/demo";
import { storeUrl } from "../../lib/urls";

/*
 * C7 Publish and C9 Manage: who can see it, going live, sold, back up, and
 * back to a draft. Each answers with the listing's new state or a line to show.
 */

const id = z.string().min(1).max(64);
const visibility = z.enum(["everyone", "link"]);

/** What's missing before it can go live, as a friendly line, or null. */
function missing(row: { title: string | null; priceCents: number | null }) {
  if (!row.title?.trim() && row.priceCents == null)
    return "It needs a title and a price first. Add the words, then set a price in Details.";
  if (!row.title?.trim()) return "It needs a title first. Pick one in the words step.";
  if (row.priceCents == null) return "It needs a price first. Set one in Details.";
  return null;
}

export async function setListingVisibility(listingId: string, value: "everyone" | "link") {
  const { user, listing } = await requireOwnedListing(id.parse(listingId));
  const demo = await demoListingBlocked(user, listing);
  if (demo) return { ok: false as const, message: demo };
  await updateListing(listing.id, { visibility: visibility.parse(value) });
  return { ok: true as const };
}

export async function publish(listingId: string, value: "everyone" | "link") {
  const { user, listing, shop } = await requireOwnedListing(id.parse(listingId));
  const demo = demoBlocked(user, "publish");
  if (demo) return { ok: false as const, message: demo };
  const problem = missing(listing);
  if (problem) return { ok: false as const, message: problem };
  const row = await updateListing(listing.id, { visibility: visibility.parse(value) });
  const live = await publishListing(row);
  return { ok: true as const, url: storeUrl(shop.slug, `/${live.slug}`) };
}

export async function markSold(listingId: string) {
  const { user, listing } = await requireOwnedListing(id.parse(listingId));
  const demo = await demoListingBlocked(user, listing);
  if (demo) return { ok: false as const, message: demo };
  if (listing.status !== "live") return { ok: false as const, message: "Only a live listing can be sold." };
  await updateListing(listing.id, { status: "sold", soldAt: new Date() });
  return { ok: true as const };
}

/** Sold, or back from a draft: live again at the same link. */
export async function relist(listingId: string) {
  const { user, listing } = await requireOwnedListing(id.parse(listingId));
  const demo = demoBlocked(user, "publish");
  if (demo) return { ok: false as const, message: demo };
  const problem = missing(listing);
  if (problem) return { ok: false as const, message: problem };
  const row =
    listing.status === "sold" ? await updateListing(listing.id, { soldAt: null }) : listing;
  await publishListing(row);
  return { ok: true as const };
}

/** Takes it down. It keeps its link for when it goes back up. */
export async function unpublish(listingId: string) {
  const { user, listing } = await requireOwnedListing(id.parse(listingId));
  const demo = await demoListingBlocked(user, listing);
  if (demo) return { ok: false as const, message: demo };
  await updateListing(listing.id, { status: "draft", soldAt: null, publishedAt: null });
  return { ok: true as const };
}
