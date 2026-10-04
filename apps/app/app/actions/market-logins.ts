"use server";

import { revalidatePath } from "next/cache";
import type { CompSite, MarketLoginStatus } from "@repo/db";
import {
  loginSites,
  MarketLoginError,
  marketLoginsEnabled,
  removeMarketLogin,
  startMarketLogin,
  syncMarketLogin,
} from "../../lib/server/market-logins";
import { demoBlocked } from "../../lib/server/demo";
import { getCurrentUser } from "../../lib/server/session";

/* D1: a seller signing in to eBay, Facebook and the rest through Kernel's hosted page. */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function run<T extends object>(site: CompSite, fn: (userId: string) => Promise<T>): Promise<Result<T>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first." };
  const blocked = demoBlocked(user, "connect");
  if (blocked) return { ok: false, error: blocked };
  if (!marketLoginsEnabled) return { ok: false, error: "Signing in to other sites isn't set up on this server yet." };
  if (!loginSites[site]) return { ok: false, error: "We can't sign in to that site." };
  try {
    const out = await fn(user.id);
    revalidatePath("/tools/connections");
    return { ok: true, ...out };
  } catch (error) {
    if (error instanceof MarketLoginError) return { ok: false, error: error.message };
    console.error("Market login action failed", error);
    return { ok: false, error: "Kernel didn't answer. Try again in a minute?" };
  }
}

/** Kernel's hosted sign-in page for this site. */
export async function connectMarketLogin(site: CompSite) {
  return run(site, async (userId) => ({ url: (await startMarketLogin(userId, site)).url }));
}

/** Asks Kernel where the sign-in stands. */
export async function refreshMarketLogin(site: CompSite) {
  return run(site, async (userId) => {
    const row = await syncMarketLogin(userId, site);
    return { status: (row?.status ?? null) as MarketLoginStatus | null, lastError: row?.lastError ?? null };
  });
}

export async function disconnectMarketLogin(site: CompSite) {
  return run(site, async (userId) => {
    await removeMarketLogin(userId, site);
    return {};
  });
}
