"use server";

import { z } from "zod";
import { and, db, eq, listingPhoto } from "@repo/db";
import { deleteFiles } from "../../lib/server/files";
import {
  addPhotoRows,
  isOwnPhoto,
  listPhotoRows,
  listPhotos,
  maxPhotos,
  requireEditableListing,
  savePhotoOrder,
  webSuggestions,
} from "../../lib/server/listings";

/*
 * C5 Photos. Uploads go through /api/listings/[id]/photos (multipart); these
 * cover the rest: remove, reorder, and adding a picture research found.
 * Each answers with the whole grid, in order, or a line to show the person.
 */

const id = z.string().min(1).max(64);

export async function removePhoto(listingId: string, photoId: string) {
  const { listing } = await requireEditableListing(id.parse(listingId));
  const [photo] = await db
    .select()
    .from(listingPhoto)
    .where(and(eq(listingPhoto.id, id.parse(photoId)), eq(listingPhoto.listingId, listing.id)));
  if (photo) {
    // An upload's file goes with it (and takes the photo row along by cascade)
    if (photo.fileId) await deleteFiles([photo.fileId]);
    else await db.delete(listingPhoto).where(eq(listingPhoto.id, photo.id));
    await savePhotoOrder(await listPhotoRows(listing.id));
  }
  return { photos: await listPhotos(listing.id) };
}

export async function reorderPhotos(listingId: string, photoIds: string[]) {
  const { listing } = await requireEditableListing(id.parse(listingId));
  const ids = z.array(id).max(20).parse(photoIds);
  const rows = await listPhotoRows(listing.id);
  const byId = new Map(rows.map((p) => [p.id, p]));
  if (ids.length !== rows.length || ids.some((pid) => !byId.has(pid))) {
    // Out of date (another tab, a slow upload); show what's saved
    return { photos: await listPhotos(listing.id), error: "Those photos changed. Here's the latest." };
  }
  const ordered = ids.map((pid) => byId.get(pid)!);
  if (!isOwnPhoto(ordered[0]!) && rows.some(isOwnPhoto)) {
    return {
      photos: await listPhotos(listing.id),
      error: "The cover has to be one of your own photos.",
    };
  }
  await savePhotoOrder(ordered);
  return { photos: await listPhotos(listing.id) };
}

/** Adds one of the maker or retail pictures research found, credited to its site. */
export async function addWebPhoto(listingId: string, url: string) {
  const { listing } = await requireEditableListing(id.parse(listingId));
  const pick = webSuggestions(listing).find((s) => s.url === url);
  if (!pick) return { photos: await listPhotos(listing.id), error: "That picture isn't available any more." };
  const rows = await listPhotoRows(listing.id);
  if (rows.some((p) => p.url === pick.url)) return { photos: await listPhotos(listing.id) };
  if (rows.filter((p) => !p.isVideo).length >= maxPhotos) {
    return { photos: await listPhotos(listing.id), error: `That's the most: ${maxPhotos} photos.` };
  }
  await addPhotoRows(listing.id, [{ url: pick.url, source: pick.source, alt: pick.alt }]);
  return { photos: await listPhotos(listing.id) };
}
