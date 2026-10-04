import "server-only";
import { db, eq, paypalAccount } from "@repo/db";
import { siteUrl } from "../urls";
import {
  createSellerSignupLink,
  demoSellerId,
  paypalEnabled,
  paypalLoginProfile,
  sellerByMerchantId,
  sellerByTrackingId,
  type SellerStatus,
} from "./paypal";

/*
 * Sellers connecting PayPal (D1 Connections). PayPal knows each seller by a
 * tracking id, which is our user id, so what we store always comes from
 * PayPal itself, never from the return URL's query string.
 */

/**
 * Set while a seller is off connecting. PayPal doesn't always send them back
 * (an account connected before lands on its PayPal dashboard), so Connections
 * checks with PayPal on its own while this is set.
 */
export const CONNECTING_COOKIE = "rs_paypal_connecting";

export type PayPalAccountRow = typeof paypalAccount.$inferSelect;

export async function getPayPalAccount(userId: string) {
  const [row] = await db.select().from(paypalAccount).where(eq(paypalAccount.userId, userId));
  return row ?? null;
}

/**
 * The PayPal page where the seller signs in (or signs up) and connects, with
 * their email already filled in.
 */
export function connectLink(userId: string, email?: string | null) {
  return createSellerSignupLink({ trackingId: userId, returnUrl: siteUrl("/api/paypal/connect/return"), email });
}

/**
 * Asks PayPal how this seller's account stands and saves it. Null if they
 * never finished. A demo link is checked against the demo seller; `demo`
 * says which to check (by default, whatever they're linked to now).
 */
export async function syncPayPalAccount(userId: string, opts: { demo?: boolean } = {}) {
  const row = await getPayPalAccount(userId);
  const demo = opts.demo ?? row?.demo ?? false;
  const demoId = demoSellerId();
  if (demo && !demoId) return null;
  const status = demo
    ? await sellerByMerchantId(demoId!)
    : // Linked from their PayPal sign-in, they may have connected under another tracking id
      ((await sellerByTrackingId(userId)) ?? (row && !row.demo ? await sellerByMerchantId(row.merchantId) : null));
  if (!status) return null;
  return save(userId, status, demo);
}

/**
 * After "Log in with PayPal": if that PayPal account is already connected to
 * us (they connected before, or under another of our accounts), link it now so
 * there's nothing to do on Connections. Null when there's nothing to link:
 * already linked, PayPal didn't share the payer id, or they never connected.
 */
export async function linkFromPayPalLogin(userId: string, userAccessToken: string) {
  if (!paypalEnabled() || (await getPayPalAccount(userId))) return null;
  const { payerId } = await paypalLoginProfile(userAccessToken);
  if (!payerId) return null;
  const status = await sellerByMerchantId(payerId);
  return status ? save(userId, status, false) : null;
}

/**
 * Sandbox: links this user to the shared demo seller instead of their own
 * PayPal, so trying the demo skips signing up. Null if there's no demo seller
 * or it never connected to us.
 */
export async function linkDemoPayPal(userId: string) {
  return syncPayPalAccount(userId, { demo: true });
}

async function save(userId: string, status: SellerStatus, demo: boolean) {
  const values = {
    merchantId: status.merchantId,
    paymentsReceivable: status.paymentsReceivable,
    emailConfirmed: status.emailConfirmed,
    permissions: status.permissions,
    demo,
  };
  const [row] = await db
    .insert(paypalAccount)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: paypalAccount.userId, set: values })
    .returning();
  return row!;
}

/** Forgets the account here. Revoking our access is done on PayPal's side. */
export async function unlinkPayPalAccount(userId: string) {
  await db.delete(paypalAccount).where(eq(paypalAccount.userId, userId));
}

/** Whether a connected account can do everything a sale needs. */
export function readiness(row: PayPalAccountRow | null) {
  if (!row) return "none" as const;
  if (!row.emailConfirmed) return "confirm-email" as const;
  if (!row.paymentsReceivable) return "not-receivable" as const;
  const needs = ["partnerfee", "delay-funds-disbursement"];
  if (!needs.every((p) => row.permissions.includes(p))) return "missing-permissions" as const;
  return "ready" as const;
}

export { paypalEnabled };
export { paypalSandbox, sandboxLogin } from "./paypal";
