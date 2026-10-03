"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LikeError, setLiked } from "../../lib/server/likes";
import { getCurrentUser } from "../../lib/server/session";

type Result = { ok: true; liked: boolean } | { ok: false; error: string; signin?: true };

const input = z.object({ listingId: z.string().min(1).max(64), liked: z.boolean() });

/** Like or unlike a listing. Signed out, `signin` means send them to sign in. */
export async function setLike(raw: z.input<typeof input>): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save things you like.", signin: true };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Something in there doesn't look right." };
  try {
    await setLiked(user.id, parsed.data.listingId, parsed.data.liked);
    // Hearts everywhere and the account's Saved list read this
    revalidatePath("/", "layout");
    return { ok: true, liked: parsed.data.liked };
  } catch (error) {
    if (error instanceof LikeError) return { ok: false, error: error.message };
    console.error("Like failed", error);
    return { ok: false, error: "Something went wrong. Try again?" };
  }
}
