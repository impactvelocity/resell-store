import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { loginSites, syncMarketLogin } from "../../../../lib/server/market-logins";
import { getCurrentUser } from "../../../../lib/server/session";
import { siteUrl } from "../../../../lib/urls";
import type { CompSite } from "@repo/db";

/*
 * Where Kernel's hosted sign-in page sends a seller when they're done. The
 * ok flag is just the URL, so Kernel is asked where the sign-in really stands.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(siteUrl("/welcome"));
  const site = request.nextUrl.searchParams.get("site") as CompSite | null;
  if (!site || !loginSites[site]) return NextResponse.redirect(siteUrl("/tools/connections"));
  let result = "error";
  try {
    const row = await syncMarketLogin(user.id, site);
    result = row?.status ?? "error";
  } catch (error) {
    console.error("Checking the market login failed", error);
  }
  revalidatePath("/tools/connections");
  return NextResponse.redirect(siteUrl(`/tools/connections?login=${site}&result=${result}`));
}
