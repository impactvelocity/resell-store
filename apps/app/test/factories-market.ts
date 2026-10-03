import { activity, db, file, follow, favourite, listingPhoto, type ActivityKind, type ActivitySource } from "@repo/db";

/*
 * Extra rows for the marketplace tests: uploads, photos, follows, likes and
 * Stats activity. Same idea as test/factories.ts: sensible defaults, overrides.
 */

/** An upload kept in Postgres (no R2), a few bytes of "image". */
export async function createFile(ownerId: string | null, overrides: Partial<typeof file.$inferInsert> = {}) {
  const data = Buffer.from("fake-image-bytes");
  const [row] = await db
    .insert(file)
    .values({ ownerId, contentType: "image/jpeg", size: data.length, data, ...overrides })
    .returning();
  return row!;
}

/** A photo on a listing: an upload by default, or pass `url` for a web picture. */
export async function createPhoto(listingId: string, overrides: Partial<typeof listingPhoto.$inferInsert> = {}) {
  const [row] = await db
    .insert(listingPhoto)
    .values({ listingId, position: 0, ...overrides })
    .returning();
  return row!;
}

export async function createFollow(userId: string, shopId: string, createdAt = new Date()) {
  await db.insert(follow).values({ userId, shopId, createdAt });
}

export async function createLike(userId: string, listingId: string, createdAt = new Date()) {
  await db.insert(favourite).values({ userId, listingId, createdAt });
}

/** A Stats event written directly, at any time. */
export async function createActivity(input: {
  shopId: string;
  listingId?: string | null;
  kind?: ActivityKind;
  source?: ActivitySource | null;
  visitorId?: string;
  createdAt?: Date;
}) {
  await db.insert(activity).values({
    kind: input.kind ?? "view",
    shopId: input.shopId,
    listingId: input.listingId ?? null,
    visitorId: input.visitorId ?? crypto.randomUUID(),
    source: input.source ?? ((input.kind ?? "view") === "view" ? "direct" : null),
    createdAt: input.createdAt ?? new Date(),
  });
}

/** A unit vector along one axis, for pgvector tests (1024 dims like listing.embedding). */
export function axis(i: number, dims = 1024) {
  const v = new Array<number>(dims).fill(0);
  v[i] = 1;
  return v;
}
