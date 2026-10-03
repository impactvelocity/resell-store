import { redirect } from "next/navigation";
import { db, eq, user as userTable } from "@repo/db";
import { SignUpScreen } from "../../../components/welcome/sign-up";
import { devLinksEnabled } from "../../../lib/server/dev-links";
import { getCurrentUser } from "../../../lib/server/session";
import { afterSignIn, safeNext } from "../../../lib/safe-next";

/** Better Auth sends people back with ?error= when a sign-in link fails. */
const notices: Record<string, string> = {
  INVALID_TOKEN: "That sign-in link has already been used or ran out. Send yourself a new one.",
  EXPIRED_TOKEN: "That sign-in link ran out. Send yourself a new one.",
};

// A1. Signed in already: on to A2, or Home once that's done. With ?next= (signing
// in to buy or make an offer) they go straight back there, counted as a buyer.
// `next` may be a store URL (signing in from maya.localhost); afterSignIn routes
// that through the session handoff in dev so the store sees them signed in.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  const user = await getCurrentUser();
  if (user) {
    if (next) {
      if (!user.onboardedAt)
        await db
          .update(userTable)
          .set({ onboardedAt: new Date(), preferredMode: "buying" })
          .where(eq(userTable.id, user.id));
      redirect(afterSignIn(next));
    }
    redirect(user.onboardedAt ? "/home" : "/welcome/start");
  }
  const notice = error
    ? (notices[error] ?? "That didn't work. Try signing in again.")
    : next
      ? "Sign in to carry on. We'll bring you right back."
      : undefined;
  return <SignUpScreen auth={{ devLinks: devLinksEnabled, notice, next }} />;
}
