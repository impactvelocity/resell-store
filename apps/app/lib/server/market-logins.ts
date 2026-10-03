import "server-only";
import Kernel from "@onkernel/sdk";
import { and, db, eq, marketLogin, type CompSite, type MarketLoginStatus } from "@repo/db";
import { siteUrl } from "../urls";
import { kernelConfigured } from "./kernel";

/*
 * Marketplace logins (D1 Connections): a seller signs in to their own eBay,
 * Facebook, Mercari, Poshmark or Depop account on Kernel's hosted page
 * (managed auth). We never see the password; Kernel keeps the signed-in
 * session in a browser profile and checks it's still good every few hours.
 *
 * comps.ts then searches from that profile: eBay sold listings (behind a
 * login since 2026) and Facebook Marketplace (login only) open up.
 *
 * MARKET_LOGINS_USER_ID names an account whose logins stand in for anyone
 * who hasn't connected their own, so a demo shows sold prices to everyone.
 */

export class MarketLoginError extends Error {}

export const loginSites: Record<
  CompSite,
  { label: string; domain: string; letter: string; unlocks: string }
> = {
  ebay: { label: "eBay", domain: "ebay.com", letter: "e", unlocks: "Sold prices from the last 90 days, not just asking prices." },
  facebook: { label: "Facebook Marketplace", domain: "facebook.com", letter: "f", unlocks: "Local Marketplace listings, which only show when you're signed in." },
  mercari: { label: "Mercari", domain: "mercari.com", letter: "m", unlocks: "Mercari listings, searched as you." },
  poshmark: { label: "Poshmark", domain: "poshmark.com", letter: "p", unlocks: "Poshmark listings, searched as you." },
  depop: { label: "Depop", domain: "depop.com", letter: "d", unlocks: "Depop listings, searched as you." },
};

export const loginSiteKeys = Object.keys(loginSites) as CompSite[];

export const marketLoginsEnabled = kernelConfigured;

let client: Kernel | null = null;
const kernel = () => (client ??= new Kernel({ apiKey: process.env.KERNEL_API_KEY }));

/** One Kernel profile per person per site. Letters, numbers, dots, dashes only. */
const profileName = (userId: string, site: CompSite) => `rs-${userId.replace(/[^A-Za-z0-9]/g, "")}-${site}`;

export type MarketLoginRow = typeof marketLogin.$inferSelect;

export async function listMarketLogins(userId: string) {
  return db.select().from(marketLogin).where(eq(marketLogin.userId, userId));
}

async function getRow(userId: string, site: CompSite) {
  const [row] = await db
    .select()
    .from(marketLogin)
    .where(and(eq(marketLogin.userId, userId), eq(marketLogin.site, site)));
  return row ?? null;
}

/**
 * Starts (or restarts) signing in to a site. Returns Kernel's hosted page;
 * it sends the person back to /api/market-logins/return when they're done.
 */
export async function startMarketLogin(userId: string, site: CompSite) {
  if (!marketLoginsEnabled) throw new MarketLoginError("Signing in to other sites needs KERNEL_API_KEY on the server.");
  const info = loginSites[site];
  if (!info) throw new MarketLoginError("We can't sign in to that site.");
  const profile = profileName(userId, site);

  let row = await getRow(userId, site);
  let connectionId = row?.connectionId ?? null;
  if (connectionId) {
    // Still there on Kernel's side? (It may have been deleted there.)
    connectionId = await kernel()
      .auth.connections.retrieve(connectionId)
      .then((c) => c.id)
      .catch(() => null);
  }
  if (!connectionId) {
    try {
      const created = await kernel().auth.connections.create({
        domain: info.domain,
        profile_name: profile,
        health_checks: true,
        auto_reauth: true,
        save_credentials: true,
      });
      connectionId = created.id;
    } catch (error) {
      // Made before but our row was lost: find it
      if ((error as { status?: number }).status !== 409) throw error;
      for await (const c of kernel().auth.connections.list({ profile_name: profile, domain: info.domain })) {
        connectionId = c.id;
        break;
      }
      if (!connectionId) throw error;
    }
  }

  const login = await kernel().auth.connections.login(connectionId);
  const back = (ok: boolean) => siteUrl(`/api/market-logins/return?site=${site}&ok=${ok ? 1 : 0}`);
  const url = new URL(login.hosted_url);
  url.searchParams.set("success_url", back(true));
  url.searchParams.set("error_url", back(false));

  await db
    .insert(marketLogin)
    .values({ userId, site, connectionId, profileName: profile, status: "pending" })
    .onConflictDoUpdate({
      target: [marketLogin.userId, marketLogin.site],
      set: { connectionId, profileName: profile, status: row?.status === "connected" ? "connected" : "pending", lastError: null },
    });
  row = await getRow(userId, site);
  return { url: url.toString(), row };
}

/** Asks Kernel where a login stands and saves it. */
export async function syncMarketLogin(userId: string, site: CompSite) {
  const row = await getRow(userId, site);
  if (!row) return null;
  let status: MarketLoginStatus = row.status;
  let lastError: string | null = null;
  try {
    const c = await kernel().auth.connections.retrieve(row.connectionId);
    if (c.status === "AUTHENTICATED") status = "connected";
    else if (c.flow_status === "IN_PROGRESS") status = row.status === "connected" ? "connected" : "pending";
    else if (c.flow_status === "FAILED" || c.flow_status === "EXPIRED" || c.flow_status === "CANCELED") {
      status = row.connectedAt ? "needs_auth" : "failed";
      lastError = c.error_message ?? (c.flow_status === "EXPIRED" ? "The sign-in timed out." : "The sign-in didn't finish.");
    } else status = row.connectedAt ? "needs_auth" : "pending";
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      status = "failed";
      lastError = "That sign-in is gone. Connect again.";
    } else throw error;
  }
  const now = new Date();
  const [updated] = await db
    .update(marketLogin)
    .set({
      status,
      lastError,
      checkedAt: now,
      ...(status === "connected" && !row.connectedAt ? { connectedAt: now } : {}),
    })
    .where(and(eq(marketLogin.userId, userId), eq(marketLogin.site, site)))
    .returning();
  return updated ?? null;
}

/** A search hit a sign-in page: the session ran out. Kernel re-signs-in where it can. */
export async function markNeedsAuth(userId: string, site: CompSite) {
  await db
    .update(marketLogin)
    .set({ status: "needs_auth", lastError: "Signed out. Connect again.", checkedAt: new Date() })
    .where(and(eq(marketLogin.userId, userId), eq(marketLogin.site, site)));
}

/** Signs out: deletes the connection and the profile holding the session. */
export async function removeMarketLogin(userId: string, site: CompSite) {
  const row = await getRow(userId, site);
  if (!row) return;
  await kernel().auth.connections.delete(row.connectionId).catch(() => {});
  await kernel().profiles.delete(row.profileName).catch(() => {});
  await db.delete(marketLogin).where(and(eq(marketLogin.userId, userId), eq(marketLogin.site, site)));
}

/**
 * Signed-in profiles to search with, by site: this person's own, else the
 * demo account's (MARKET_LOGINS_USER_ID). Each says whose it is, so a
 * session that's run out is marked on the right account.
 */
export async function loginProfiles(userId: string | null | undefined) {
  const out = new Map<CompSite, { profileName: string; userId: string }>();
  const fallback = process.env.MARKET_LOGINS_USER_ID;
  for (const owner of [userId, fallback]) {
    if (!owner) continue;
    for (const row of await listMarketLogins(owner))
      if (row.status === "connected" && !out.has(row.site)) out.set(row.site, { profileName: row.profileName, userId: owner });
  }
  return out;
}
