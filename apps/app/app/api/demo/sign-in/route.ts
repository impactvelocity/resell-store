import { NextResponse, type NextRequest } from "next/server";
import { db, eq, user } from "@repo/db";
import { auth } from "../../../../lib/server/auth";
import { demoEmail, demoEnabled, resetDemoIfDue, withCapturedLink, type DemoRole } from "../../../../lib/server/demo";
import { safeNext, welcomeReturnTo } from "../../../../lib/safe-next";
import { siteUrl } from "../../../../lib/urls";

/*
 * POST /api/demo/sign-in (the welcome page's "Sell as" / "Shop as" buttons,
 * DEMO=true only): signs in as the shared demo seller or buyer with no email.
 * It makes a magic link for the demo address, keeps the token instead of
 * sending it, and verifies it here, so Better Auth sets the session cookie as
 * usual. The demo is put back first if its last reset is old enough.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const role = form.get("as");
  const next = safeNext(String(form.get("next") ?? "") || null);
  const back = (error: string) => NextResponse.redirect(siteUrl(`/welcome?error=${error}`), 303);
  if (!demoEnabled || (role !== "seller" && role !== "buyer")) return back("demo_off");

  const email = demoEmail(role as DemoRole);
  // Signing in would make a new, empty account for an address that isn't there
  const [found] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (!found) return back("demo_missing");

  await resetDemoIfDue();
  const callbackURL = welcomeReturnTo(next);
  let token: string | null = null;
  try {
    token = await withCapturedLink(() => auth.api.signInMagicLink({ body: { email, callbackURL }, headers: req.headers }));
  } catch {
    // falls through to the error below
  }
  if (!token) return back("demo_missing");

  // Verifying answers with a redirect to callbackURL that sets the session cookie
  const verified = await auth.api.magicLinkVerify({
    query: { token, callbackURL },
    headers: req.headers,
    asResponse: true,
  });
  const res = NextResponse.redirect(siteUrl(callbackURL), 303);
  for (const cookie of verified.headers.getSetCookie()) res.headers.append("Set-Cookie", cookie);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
