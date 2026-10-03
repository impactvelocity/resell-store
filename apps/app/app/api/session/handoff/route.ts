import { NextResponse, type NextRequest } from "next/server";
import { auth } from "../../../../lib/server/auth";
import {
  needsSessionHandoff,
  siteUrl,
  storeFromHost,
  storeUrl,
  zoneUrl,
} from "../../../../lib/urls";

/*
 * Dev only (needsSessionHandoff): hands the marketplace session to a store subdomain.
 * GET /api/session/handoff?to=<absolute store URL>, on the marketplace host. Signed in:
 * mint a one-time token and bounce to that store's /api/session/accept, which sets the
 * session cookie there. Signed out (or anywhere the cookie is shared): straight back.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("to");
  const to = raw ? zoneUrl(raw) : null;
  const store = to ? storeFromHost(to.host) : null;
  // Only ever redirect to one of our own stores
  if (!to || !store) return noStore(NextResponse.redirect(siteUrl("/")));

  const back = noStore(NextResponse.redirect(to.href));
  if (!needsSessionHandoff) return back;
  // On a store host (proxy.ts sends a store's first page load here): over to the
  // marketplace, where the session cookie is
  if (storeFromHost(req.headers.get("host"))) {
    return noStore(NextResponse.redirect(siteUrl(`/api/session/handoff?to=${encodeURIComponent(to.href)}`)));
  }

  let token: string;
  try {
    ({ token } = await auth.api.generateOneTimeToken({ headers: req.headers }));
  } catch {
    return back; // no session here
  }
  const accept = new URL(storeUrl(store, "/api/session/accept"));
  accept.searchParams.set("token", token);
  accept.searchParams.set("next", to.pathname + to.search);
  return noStore(NextResponse.redirect(accept));
}

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store");
  return res;
}
