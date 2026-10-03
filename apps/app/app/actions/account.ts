"use server";

import { redirect } from "next/navigation";
import { db, eq, user as userTable } from "@repo/db";
import { requireUser } from "../../lib/server/session";
import { countOwnedShops } from "../../lib/server/shops";

/** A2: remember the mode, then open a first shop or go shopping. */
export async function completeOnboarding(mode: "selling" | "buying") {
  const user = await requireUser({ onboarded: false });
  await db
    .update(userTable)
    .set({ preferredMode: mode, onboardedAt: user.onboardedAt ?? new Date() })
    .where(eq(userTable.id, user.id));
  if (mode === "selling" && (await countOwnedShops(user.id)) === 0) redirect("/shops/new");
  redirect(`/home?mode=${mode}`);
}
