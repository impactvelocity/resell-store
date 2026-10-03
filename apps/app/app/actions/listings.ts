"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, listingPhoto } from "@repo/db";
import { saveUpload, UploadError } from "../../lib/server/files";
import {
  createDraft,
  requireOwnedListing,
  setField,
  updateListing,
} from "../../lib/server/listings";
import { runResearch, startResearch } from "../../lib/server/research";
import { requireUser } from "../../lib/server/session";
import { getOwnedShop } from "../../lib/server/shops";
import { toCents } from "../../lib/money";

/** Kicks off research in the background; the research page polls for progress. */
async function research(listingId: string) {
  const run = await startResearch(listingId);
  if (run.started) after(() => runResearch(run.id));
}

/** C1: a photo, some words, or both → a draft, then research. */
export async function startListing(_prev: { error?: string } | null, form: FormData) {
  const user = await requireUser();
  const prompt = String(form.get("prompt") ?? "").trim().slice(0, 500);
  const shopSlug = String(form.get("shop") ?? "");
  const photo = form.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (!prompt && !hasPhoto) return { error: "Add a photo or say what it is." };

  const shop = await getOwnedShop(user.id, shopSlug);
  if (!shop) return { error: "Pick one of your shops first." };

  const draft = await createDraft({ shopId: shop.id, prompt });
  if (hasPhoto) {
    try {
      const saved = await saveUpload(photo, user.id);
      await db.insert(listingPhoto).values({ listingId: draft.id, fileId: saved.id, position: 0 });
    } catch (error) {
      if (error instanceof UploadError) return { error: error.message };
      throw error;
    }
  }
  await research(draft.id);
  redirect(`/list/${draft.id}/research`);
}

export async function rerunResearch(listingId: string) {
  await requireOwnedListing(listingId);
  await research(listingId);
}

const fieldInput = z.object({
  key: z.string().min(1).max(40),
  label: z.string().max(40).optional(),
  value: z.string().trim().min(1).max(200),
});

/** A row edited by hand, or a question answered (C3/C4). */
export async function saveField(listingId: string, input: z.input<typeof fieldInput>) {
  const { listing } = await requireOwnedListing(listingId);
  const { key, label, value } = fieldInput.parse(input);
  await updateListing(listing.id, { fields: setField(listing.fields, key, value, label) });
}

const pricingInput = z.object({
  price: z.number().int().min(1).max(100_000).optional(),
  lowest: z.number().int().min(0).max(100_000).optional(),
  takeOffers: z.boolean().optional(),
});

/** C4 price card: price, the private floor, and whether the agent takes offers. */
export async function savePricing(listingId: string, input: z.input<typeof pricingInput>) {
  const { listing } = await requireOwnedListing(listingId);
  const { price, lowest, takeOffers } = pricingInput.parse(input);
  const priceCents = price != null ? toCents(price) : listing.priceCents;
  let lowestCents = lowest != null ? toCents(lowest) : listing.lowestCents;
  // The floor can't sit above the price
  if (priceCents != null && lowestCents != null) lowestCents = Math.min(lowestCents, priceCents);
  await updateListing(listing.id, {
    priceCents,
    lowestCents,
    ...(takeOffers != null ? { takeOffers } : {}),
  });
}
