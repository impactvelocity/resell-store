import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { storeFromHost, storeUrl } from "./lib/urls";

// Auth state only — each protected page/layout calls `auth.protect()` itself.
// Store subdomains are rewritten onto /store/{store}, so maya.resell.store/linen-wrap-dress
// renders app/store/[store]/[listing].
export default clerkMiddleware((_auth, req) => {
  const store = storeFromHost(req.headers.get("host"));
  const url = req.nextUrl.clone();

  if (!store) {
    // /store/maya/x on the marketplace host → maya.resell.store/x, so store links stay relative
    const match = url.pathname.match(/^\/store\/([^/]+)(\/.*)?$/);
    if (match) return NextResponse.redirect(storeUrl(match[1]!, (match[2] ?? "/") + url.search));
    return;
  }

  url.pathname = `/store/${store}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
