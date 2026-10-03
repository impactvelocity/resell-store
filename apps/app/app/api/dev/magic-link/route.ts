import { NextResponse } from "next/server";
import { takeDevLink } from "../../../../lib/server/dev-links";

/** Local dev only: the sign-in link that would have been emailed. */
export function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email") ?? "";
  return NextResponse.json({ url: takeDevLink(email) });
}
