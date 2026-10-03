import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { syncPayPalAccount } from "../../../../../lib/server/paypal-sellers";
import { getCurrentUser } from "../../../../../lib/server/session";
import { siteUrl } from "../../../../../lib/urls";

/*
 * Where PayPal sends a seller after connecting. PayPal also adds their
 * merchant id to the URL, but it's unsigned, so we look them up by tracking id.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(siteUrl("/welcome"));
  let result = "connected";
  try {
    // Back from connecting their own PayPal, even if they had the demo one
    const row = await syncPayPalAccount(user.id, { demo: false });
    if (!row) result = "incomplete";
  } catch (error) {
    console.error("Checking the PayPal connection failed", error);
    result = "error";
  }
  revalidatePath("/tools/connections");
  return NextResponse.redirect(siteUrl(`/tools/connections?paypal=${result}`));
}
