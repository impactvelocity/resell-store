"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db, eq, user as userTable } from "@repo/db";
import { auth } from "../../lib/server/auth";
import { deleteFiles, fileIdsOwnedBy, saveUpload, UploadError } from "../../lib/server/files";
import { assertNotDemo, demoBlocked } from "../../lib/server/demo";
import { requireUser } from "../../lib/server/session";

/* A6 Me and A7 Edit profile. */

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Add your name first.")
    .max(80, "Keep your name under 80 characters."),
  about: z.string().trim().max(200, "About you fits in 200 characters."),
  location: z.string().trim().max(80, "Keep the location short, just the city."),
  interests: z.array(z.string().trim().min(1).max(40)).max(20),
  notify: z.record(z.string(), z.boolean()),
  reach: z.array(z.string().max(20)).max(5),
});

export type ProfileInput = z.input<typeof profileSchema>;

/**
 * Saves the profile. "How to reach me" has no column of its own, so it rides
 * along in notifyPrefs as `reach:{channel}` keys.
 */
export async function saveProfile(input: ProfileInput): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser();
  const demo = demoBlocked(user, "account");
  if (demo) return { error: demo };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const p = parsed.data;

  const notifyPrefs: Record<string, boolean> = {};
  for (const [key, on] of Object.entries(p.notify)) {
    if (!key.startsWith("reach:")) notifyPrefs[key] = on;
  }
  for (const channel of p.reach) notifyPrefs[`reach:${channel}`] = true;

  await db
    .update(userTable)
    .set({
      name: p.name,
      about: p.about || null,
      location: p.location || null,
      interests: [...new Set(p.interests)],
      notifyPrefs,
    })
    .where(eq(userTable.id, user.id));

  revalidatePath("/", "layout");
  return { ok: true };
}

/** A new profile photo. Saved straight away; returns its URL. */
export async function uploadAvatar(form: FormData): Promise<{ error: string } | { url: string }> {
  const user = await requireUser();
  const demo = demoBlocked(user, "account");
  if (demo) return { error: demo };
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Pick a photo first." };
  if (!photo.type.startsWith("image/")) return { error: "That isn't a photo." };
  try {
    const { url } = await saveUpload(photo, user.id);
    await db.update(userTable).set({ image: url }).where(eq(userTable.id, user.id));
    revalidatePath("/", "layout");
    return { url };
  } catch (error) {
    if (error instanceof UploadError) return { error: error.message };
    throw error;
  }
}

/** Deletes the person and everything they own (shops, listings, files cascade). */
export async function deleteAccount(): Promise<{ ok: true }> {
  const user = await requireUser({ onboarded: false });
  assertNotDemo(user, "account");
  // End the session first so the cookies are cleared on this response
  await auth.api.signOut({ headers: await headers() }).catch(() => {});
  // Clear their uploads from object storage too; the rows would only cascade
  await deleteFiles(await fileIdsOwnedBy(user.id));
  await db.delete(userTable).where(eq(userTable.id, user.id));
  return { ok: true };
}
