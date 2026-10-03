import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { botAgent, recordActivity } from "../../../lib/server/activity";
import { getSession } from "../../../lib/server/session";
import { needsSessionHandoff, rootDomain } from "../../../lib/urls";

/*
 * Beacons from store and listing pages (views) and share buttons (shares).
 * Anonymous visitors get a long-lived random id cookie so their repeat views
 * count once. Always answers 204: tracking never breaks a page.
 */

const VISITOR_COOKIE = "rs_vid";

const body = z.object({
  kind: z.enum(["view", "share"]),
  shop: z.string().max(80).nullish(),
  listing: z.string().max(64).nullish(),
  referrer: z.string().max(2000).nullish(),
  tag: z.string().max(60).nullish(),
});

export async function POST(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  if (botAgent.test(req.headers.get("user-agent") ?? "")) return res;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.shop && !parsed.data.listing)) return res;

  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  if (!visitorId || visitorId.length > 64) {
    visitorId = crypto.randomUUID();
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // Shared across the marketplace and every store, where the browser allows it
      ...(!needsSessionHandoff && { domain: `.${rootDomain.split(":")[0]}`, secure: true }),
    });
  }

  try {
    const session = await getSession();
    await recordActivity({
      kind: parsed.data.kind,
      shopSlug: parsed.data.shop,
      listingId: parsed.data.listing,
      visitorId,
      userId: session?.user.id ?? null,
      referrer: parsed.data.referrer,
      tag: parsed.data.tag,
    });
  } catch (error) {
    console.error("Tracking failed", error);
  }
  return res;
}
