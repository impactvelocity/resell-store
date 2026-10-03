import { deleteFiles, saveUpload, UploadError } from "../../../../../lib/server/files";
import {
  addPhotoRows,
  getOwnedListing,
  listPhotos,
  listPhotoRows,
  maxPhotos,
} from "../../../../../lib/server/listings";
import { getCurrentUser } from "../../../../../lib/server/session";

/*
 * C5 uploads: multipart POST with one or more `file` parts. Each becomes a
 * `file` row and a listing_photo at the end of the grid. A listing holds up to
 * 12 photos and one video. Answers with the whole grid, in order.
 */

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to add photos.", 401);
  const owned = await getOwnedListing(user.id, (await params).id);
  if (!owned) return fail("We couldn't find that listing.", 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("That upload didn't come through. Try again?");
  }
  const uploads = form.getAll("file").filter((v): v is File => v instanceof File && v.size > 0);
  if (uploads.length === 0) return fail("Pick a photo or a video to add.");

  const existing = await listPhotoRows(owned.listing.id);
  let photos = existing.filter((p) => !p.isVideo).length;
  let videos = existing.filter((p) => p.isVideo).length;
  for (const upload of uploads) {
    if (upload.type.startsWith("video/")) videos++;
    else photos++;
  }
  if (videos > 1) return fail("One video per listing. Remove it to add another.");
  if (photos > maxPhotos) return fail(`That's the most: ${maxPhotos} photos.`);

  const saved: { id: string; isVideo: boolean }[] = [];
  try {
    for (const upload of uploads) saved.push(await saveUpload(upload, user.id));
  } catch (error) {
    // Don't leave half a batch behind
    await deleteFiles(saved.map((s) => s.id));
    if (error instanceof UploadError) return fail(error.message);
    console.error("Photo upload failed", error);
    return fail("Something went wrong saving that. Try again?", 500);
  }

  await addPhotoRows(
    owned.listing.id,
    saved.map((s) => ({ fileId: s.id, isVideo: s.isVideo })),
  );
  return Response.json({ photos: await listPhotos(owned.listing.id) });
}
