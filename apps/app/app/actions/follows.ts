"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FollowError, setFollowing } from "../../lib/server/follows";
import { getCurrentUser } from "../../lib/server/session";

type Result = { ok: true; following: boolean } | { ok: false; error: string; signin?: true };

const input = z.object({ shopId: z.string().min(1).max(64), following: z.boolean() });

/** Follow or unfollow a shop. Signed out, `signin` means send them to sign in. */
export async function setFollow(raw: z.input<typeof input>): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to follow shops.", signin: true };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Something in there doesn't look right." };
  try {
    await setFollowing(user.id, parsed.data.shopId, parsed.data.following);
    // Follow buttons, the account's Following list and Home all read this
    revalidatePath("/", "layout");
    return { ok: true, following: parsed.data.following };
  } catch (error) {
    if (error instanceof FollowError) return { ok: false, error: error.message };
    console.error("Follow failed", error);
    return { ok: false, error: "Something went wrong. Try again?" };
  }
}
