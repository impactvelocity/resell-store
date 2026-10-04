"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, asc, db, eq, ne, shop } from "@repo/db";
import { deleteFiles, saveUpload, UploadError } from "../../lib/server/files";
import { demoBlocked, demoPublicBlocked } from "../../lib/server/demo";
import { requireUser } from "../../lib/server/session";
import { checkSlug, getOwnedShop, shopFileIds, shopPicture } from "../../lib/server/shops";

/* B1 Create shop and B3 Shop settings. */

export type LinkState = "free" | "taken" | "invalid";

const tones = ["lemon", "mint", "pink", "leaf", "blush"] as const;
const visibilities = ["public", "link", "private"] as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Give your shop a name first.")
  .max(60, "Keep the name under 60 characters.");
const slugSchema = z.string().trim().toLowerCase().min(1, "Pick a link for your shop.");

/** Live check under the "Shop link" field. `currentSlug` is the shop being edited. */
export async function checkShopLink(slug: string, currentSlug?: string): Promise<LinkState> {
  const user = await requireUser();
  const value = slug.trim().toLowerCase();
  if (currentSlug && value === currentSlug) return "free";
  const current = currentSlug ? await getOwnedShop(user.id, currentSlug) : null;
  return checkSlug(value, current?.id);
}

const linkError: Record<Exclude<LinkState, "free">, string> = {
  taken: "Someone has that link. Try another.",
  invalid: "Links use letters, numbers and dashes, and can't start or end with a dash.",
};

/** An optional picture from the form, saved as an upload. */
async function savePicture(form: FormData, ownerId: string) {
  const picture = form.get("picture");
  if (!(picture instanceof File) || picture.size === 0) return null;
  if (!picture.type.startsWith("image/"))
    throw new UploadError("The shop picture needs to be a photo.");
  return saveUpload(picture, ownerId);
}

const createSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  tone: z.enum(tones).catch("mint"),
  category: z.string().trim().max(40).optional(),
  visibility: z.enum(visibilities).catch("link"),
});

/** B1: open the shop and go to it. Returns an error to show, or redirects. */
export async function createShop(form: FormData): Promise<{ error: string }> {
  const user = await requireUser();
  const demo = demoBlocked(user, "shop");
  if (demo) return { error: demo };
  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const input = parsed.data;
  const closed = demoPublicBlocked(input.visibility);
  if (closed) return { error: closed };

  const link = await checkSlug(input.slug);
  if (link !== "free") return { error: linkError[link] };

  let pictureFileId: string | null = null;
  try {
    pictureFileId = (await savePicture(form, user.id))?.id ?? null;
  } catch (error) {
    if (error instanceof UploadError) return { error: error.message };
    throw error;
  }

  try {
    await db.insert(shop).values({
      ownerId: user.id,
      slug: input.slug,
      name: input.name,
      tone: input.tone,
      category: input.category || null,
      visibility: input.visibility,
      pictureFileId,
    });
  } catch (error) {
    // Someone took the link between the check and the insert
    if (isUniqueViolation(error)) return { error: linkError.taken };
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(`/shops/${input.slug}`);
}

const settingsSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  about: z.string().trim().max(300, "Keep the about under 300 characters.").default(""),
  visibility: z.enum(visibilities),
  answerQuestions: z.stringbool(),
  haggle: z.stringbool(),
  lowestPercent: z.coerce.number().int().min(0).max(90),
  askHold: z.stringbool(),
  removePicture: z.stringbool().optional(),
});

export type SavedShop = { slug: string; picture: string | null };

/** B3: save everything on the settings page. A new link moves the shop (and redirects). */
export async function updateShop(
  currentSlug: string,
  form: FormData,
): Promise<{ error: string } | { ok: true; shop: SavedShop }> {
  const user = await requireUser();
  const demo = demoBlocked(user, "shop");
  if (demo) return { error: demo };
  const row = await getOwnedShop(user.id, currentSlug);
  if (!row) return { error: "That shop isn't yours, or it's gone." };

  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const input = parsed.data;
  const closed = demoPublicBlocked(input.visibility, row.visibility);
  if (closed) return { error: closed };

  if (input.slug !== row.slug) {
    const link = await checkSlug(input.slug, row.id);
    if (link !== "free") return { error: linkError[link] };
  }

  let pictureFileId = input.removePicture ? null : row.pictureFileId;
  try {
    const upload = await savePicture(form, user.id);
    if (upload) pictureFileId = upload.id;
  } catch (error) {
    if (error instanceof UploadError) return { error: error.message };
    throw error;
  }

  let saved;
  try {
    [saved] = await db
      .update(shop)
      .set({
        name: input.name,
        slug: input.slug,
        about: input.about || null,
        visibility: input.visibility,
        answerQuestions: input.answerQuestions,
        haggle: input.haggle,
        lowestPercent: input.lowestPercent,
        askHold: input.askHold,
        pictureFileId,
      })
      .where(and(eq(shop.id, row.id), eq(shop.ownerId, user.id)))
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) return { error: linkError.taken };
    throw error;
  }

  revalidatePath("/", "layout");
  // A new link moves the page too; redirecting here skips rendering the old (now 404) one
  if (saved!.slug !== currentSlug) redirect(`/shops/${saved!.slug}/settings`);
  return { ok: true, shop: { slug: saved!.slug, picture: shopPicture(saved!) } };
}

/** B3: pause hides the shop and keeps everything. */
export async function setShopPaused(slug: string, paused: boolean) {
  const user = await requireUser();
  const demo = demoBlocked(user, "shop");
  if (demo) return { error: demo };
  const [row] = await db
    .update(shop)
    .set({ paused })
    .where(and(eq(shop.ownerId, user.id), eq(shop.slug, slug)))
    .returning({ paused: shop.paused });
  if (!row) return { error: "That shop isn't yours, or it's gone." };
  revalidatePath("/", "layout");
  return { ok: true as const, paused: row.paused };
}

/** B3: delete the shop and its listings. Returns where to go next. */
export async function deleteShop(slug: string): Promise<{ error: string } | { next: string }> {
  const user = await requireUser();
  const demo = demoBlocked(user, "shop");
  if (demo) return { error: demo };
  const owned = await getOwnedShop(user.id, slug);
  // Photos and the picture outlive the rows in object storage unless cleared
  const files = owned ? await shopFileIds(owned.id) : [];
  const [gone] = await db
    .delete(shop)
    .where(and(eq(shop.ownerId, user.id), eq(shop.slug, slug)))
    .returning({ id: shop.id });
  if (!gone) return { error: "That shop isn't yours, or it's gone." };
  await deleteFiles(files);

  const [next] = await db
    .select({ slug: shop.slug })
    .from(shop)
    .where(and(eq(shop.ownerId, user.id), ne(shop.id, gone.id)))
    .orderBy(asc(shop.createdAt))
    .limit(1);
  revalidatePath("/", "layout");
  return { next: next ? `/shops/${next.slug}` : "/home?mode=selling" };
}

function isUniqueViolation(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}
