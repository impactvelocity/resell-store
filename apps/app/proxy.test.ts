import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "./proxy";

/*
 * Share images under stores: og:image points at the marketplace host
 * (/store/{store}/…/opengraph-image), and the store host's own
 * /opengraph-image reaches the same route. Crawlers have no cookies, so
 * these are never bounced through the session handoff or served from mock.
 */

function req(url: string, headers: Record<string, string> = {}) {
  const u = new URL(url);
  return new NextRequest(url, { headers: { host: u.host, accept: "text/html", ...headers } });
}

const rewrite = (res: Response | undefined) => res?.headers.get("x-middleware-rewrite");

describe("proxy: share images", () => {
  it("serves /store/{store}/…/opengraph-image on the marketplace host instead of redirecting", () => {
    expect(proxy(req("http://localhost:5689/store/maya/opengraph-image?abc"))).toBeUndefined();
    expect(proxy(req("http://localhost:5689/store/maya/linen-wrap-dress/twitter-image?abc"))).toBeUndefined();
    // Every other /store/ path still goes to the subdomain
    const res = proxy(req("http://localhost:5689/store/maya/linen-wrap-dress"));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe("http://maya.localhost:5689/linen-wrap-dress");
  });

  it("rewrites a store host's share images onto /store/{store}, with no handoff", () => {
    expect(rewrite(proxy(req("http://maya.localhost:5689/opengraph-image")))).toBe(
      "http://maya.localhost:5689/store/maya/opengraph-image",
    );
    expect(rewrite(proxy(req("http://maya.localhost:5689/linen-wrap-dress/twitter-image")))).toBe(
      "http://maya.localhost:5689/store/maya/linen-wrap-dress/twitter-image",
    );
  });

  it("ignores mock mode for share images, not for pages", () => {
    const cookie = { cookie: "rs_view=1" };
    expect(rewrite(proxy(req("http://maya.localhost:5689/opengraph-image", cookie)))).toBe(
      "http://maya.localhost:5689/store/maya/opengraph-image",
    );
    expect(rewrite(proxy(req("http://maya.localhost:5689/linen-wrap-dress", cookie)))).toBe(
      "http://maya.localhost:5689/mock/store/maya/linen-wrap-dress",
    );
  });

  it("still hands off a signed-out page load on a store host", () => {
    const res = proxy(req("http://maya.localhost:5689/linen-wrap-dress"));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toContain("/api/session/handoff");
  });
});
