"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  CONNECTING_COOKIE,
  connectLink,
  linkDemoPayPal,
  syncPayPalAccount,
  unlinkPayPalAccount,
} from "../../lib/server/paypal-sellers";
import { paypalEnabled } from "../../lib/server/paypal";
import { getCurrentUser } from "../../lib/server/session";

/* D1: a seller connecting their PayPal to get paid. */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<Result<T>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!paypalEnabled()) return { ok: false, error: "PayPal isn't set up on this server yet." };
  try {
    const out = await fn(user.id);
    revalidatePath("/tools/connections");
    return { ok: true, ...out };
  } catch (error) {
    console.error("PayPal action failed", error);
    return { ok: false, error: "PayPal didn't answer. Try again in a minute?" };
  }
}

/** A fresh PayPal sign-up link to send the seller to. */
export async function connectPayPal() {
  return run(async (userId) => {
    const url = await connectLink(userId);
    (await cookies()).set(CONNECTING_COOKIE, "1", { maxAge: 60 * 60, httpOnly: true, sameSite: "lax", path: "/" });
    return { url };
  });
}

/** Re-reads the account from PayPal, e.g. after the seller confirms their email. */
export async function refreshPayPal() {
  return run(async (userId) => ({ connected: !!(await syncPayPalAccount(userId)) }));
}

/** Sandbox: links the shared demo seller instead of connecting their own PayPal. */
export async function linkDemoSeller() {
  return run(async (userId) => {
    // Not off connecting their own any more, so Connections stops checking for it
    (await cookies()).delete(CONNECTING_COOKIE);
    return { linked: !!(await linkDemoPayPal(userId)) };
  });
}

export async function unlinkPayPal() {
  return run(async (userId) => {
    // Otherwise Connections finds them at PayPal and links them straight back
    (await cookies()).delete(CONNECTING_COOKIE);
    await unlinkPayPalAccount(userId);
    return {};
  });
}
