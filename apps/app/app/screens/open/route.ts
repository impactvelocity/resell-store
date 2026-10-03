import { NextResponse, type NextRequest } from "next/server";
import { MOCK_COOKIE } from "../../../lib/mock-mode";

/*
 * /screens/open?to=/path&as=mock|live. For the few screens whose own URL already
 * uses ?view= (C3 ?view=findings, C8 ?view=elsewhere), where the proxy's
 * ?view=mock switch would clash: set the cookie here, then go to the screen.
 */
export function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") ?? "";
  const as = req.nextUrl.searchParams.get("as");
  // Same-site paths only
  const target = /^\/(?![/\\])/.test(to) ? to : "/screens";
  const res = NextResponse.redirect(new URL(target, req.url));
  if (as === "mock") res.cookies.set(MOCK_COOKIE, "1", { path: "/", sameSite: "lax" });
  else if (as === "live") res.cookies.delete(MOCK_COOKIE);
  return res;
}
