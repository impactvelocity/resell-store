import "server-only";
import { AwsClient } from "aws4fetch";
import { db, eq, file, inArray } from "@repo/db";

/*
 * Uploads. With R2 configured the bytes go to the bucket and the `file` row
 * keeps the key; without it (local dev) they stay in the row. Either way the
 * rest of the app only sees ids and /api/files/{id} URLs.
 *
 *   R2_URL                 the account's S3 endpoint, https://{account}.r2.cloudflarestorage.com
 *   R2_ACCESS_KEY / R2_SECRET_ACCESS_KEY
 *   R2_BUCKET              defaults to resell-store
 *   R2_PUBLIC_URL          optional public bucket domain; files are then served straight from it
 */

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;

export class UploadError extends Error {}

const r2 =
  process.env.R2_URL && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_ACCESS_KEY
    ? {
        client: new AwsClient({
          accessKeyId: process.env.R2_ACCESS_KEY,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          service: "s3",
          region: "auto",
        }),
        base: `${process.env.R2_URL.replace(/\/+$/, "")}/${process.env.R2_BUCKET ?? "resell-store"}`,
        publicUrl: process.env.R2_PUBLIC_URL?.replace(/\/+$/, ""),
      }
    : null;

export const r2Configured = r2 !== null;

const objectUrl = (key: string) =>
  `${r2!.base}/${key.split("/").map(encodeURIComponent).join("/")}`;

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export async function saveUpload(upload: File, ownerId: string) {
  const isImage = upload.type.startsWith("image/");
  const isVideo = upload.type.startsWith("video/");
  if (!isImage && !isVideo) throw new UploadError("That isn't a photo or a video.");
  if (upload.size > (isVideo ? MAX_VIDEO : MAX_IMAGE))
    throw new UploadError(isVideo ? "Videos can be up to 40 MB." : "Photos can be up to 10 MB.");

  const id = crypto.randomUUID();
  const bytes = Buffer.from(await upload.arrayBuffer());
  let storageKey: string | null = null;

  if (r2) {
    const ext = extensions[upload.type] ?? upload.type.split("/")[1]?.replace(/[^a-z0-9]/g, "") ?? "bin";
    storageKey = `uploads/${ownerId}/${id}.${ext}`;
    // Sign, then send the bytes ourselves: aws4fetch's own fetch passes a Request,
    // which Next's patched fetch rebuilds from its body stream, so it goes out
    // chunked without Content-Length and R2 rejects it (411).
    const signed = await r2.client.sign(objectUrl(storageKey), {
      method: "PUT",
      body: bytes,
      headers: { "Content-Type": upload.type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
    const res = await fetch(signed.url, { method: "PUT", headers: signed.headers, body: bytes });
    if (!res.ok) throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
  }

  await db.insert(file).values({
    id,
    ownerId,
    contentType: upload.type,
    size: upload.size,
    storageKey,
    data: storageKey ? null : bytes,
  });
  return { id, url: fileUrl(id), isVideo };
}

/** The row only (type, size, where it lives). */
export async function readFile(id: string) {
  const [row] = await db.select().from(file).where(eq(file.id, id));
  return row ?? null;
}

/** The bytes, wherever they live. For server-side use (e.g. sending a photo to the model). */
export async function readFileBytes(id: string) {
  const row = await readFile(id);
  if (!row) return null;
  if (row.data) return { data: row.data, contentType: row.contentType };
  if (!row.storageKey || !r2) return null;
  const res = await r2.client.fetch(objectUrl(row.storageKey));
  if (!res.ok) return null;
  return { data: Buffer.from(await res.arrayBuffer()), contentType: row.contentType };
}

/** For /api/files/{id}: a redirect to the public bucket, a stream from R2, or the stored bytes. */
export async function openFile(id: string) {
  const row = await readFile(id);
  if (!row) return null;
  if (row.data) return { kind: "bytes" as const, row, body: new Uint8Array(row.data) };
  if (!row.storageKey || !r2) return null;
  if (r2.publicUrl) return { kind: "redirect" as const, row, url: `${r2.publicUrl}/${row.storageKey}` };
  const res = await r2.client.fetch(objectUrl(row.storageKey));
  if (!res.ok || !res.body) return null;
  return { kind: "stream" as const, row, body: res.body };
}

/** Removes the rows and their objects in R2. */
export async function deleteFiles(ids: string[]) {
  if (ids.length === 0) return;
  const rows = await db
    .delete(file)
    .where(inArray(file.id, ids))
    .returning({ storageKey: file.storageKey });
  if (!r2) return;
  await Promise.all(
    rows
      .filter((r) => r.storageKey)
      .map((r) =>
        r2.client
          .fetch(objectUrl(r.storageKey!), { method: "DELETE" })
          .catch((error) => console.error("R2 delete failed", r.storageKey, error)),
      ),
  );
}

/** Relative on purpose: /api is served on the marketplace and every store host. */
export function fileUrl(id: string) {
  return `/api/files/${id}`;
}

/** Every file someone uploaded, so deleting an account can clear the bucket too. */
export async function fileIdsOwnedBy(ownerId: string) {
  const rows = await db.select({ id: file.id }).from(file).where(eq(file.ownerId, ownerId));
  return rows.map((r) => r.id);
}
