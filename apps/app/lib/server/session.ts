import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, eq, user as userTable } from "@repo/db";
import { auth } from "./auth";

/** The signed-in session, or null. Deduped per request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** The full user row (profile fields included), or null when signed out. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const [row] = await db.select().from(userTable).where(eq(userTable.id, session.user.id));
  return row ?? null;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For pages behind sign-in: back to /welcome when signed out, to A2 until onboarded. */
export async function requireUser({ onboarded = true } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/welcome");
  if (onboarded && !user.onboardedAt) redirect("/welcome/start");
  return user;
}
