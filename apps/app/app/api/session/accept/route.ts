import { NextResponse, type NextRequest } from "next/server";
import { auth } from "../../../../lib/server/auth";
import { safePath } from "../../../../lib/safe-next";
import { needsSessionHandoff, siteUrl, storeFromHost, storeUrl } from "../../../../lib/urls";

/*
 * Dev only (needsSessionHandoff): the store half of /api/session/handoff.
 * GET /api/session/accept?token=…&next=/path on a store host. Verifying the one-time
 * token sets this host's session cookie to the marketplace's session (the same DB row,
 * so signing out anywhere ends both). Any failure just carries on to `next`, signed out.
 */
export async function GET(req: NextRequest) {
  const store = storeFromHost(req.headers.get("host"));
  const next = safePath(req.nextUrl.searchParams.get("next")) ?? "/";
  const res = NextResponse.redirect(store ? storeUrl(store, next) : siteUrl(next));
  res.headers.set("Cache-Control", "no-store");

  const token = req.nextUrl.searchParams.get("token");
  if (!store || !token || !needsSessionHandoff) return res;
  try {
    const { headers } = await auth.api.verifyOneTimeToken({
      body: { token },
      headers: req.headers,
      returnHeaders: true,
    });
    for (const cookie of headers.getSetCookie()) res.headers.append("Set-Cookie", cookie);
  } catch {
    // Used, expired, or the session is gone: arrive signed out
  }
  return res;
}
