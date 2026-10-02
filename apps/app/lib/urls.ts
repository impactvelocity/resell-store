/*
 * Two zones share one Next app:
 *   resell.store/*          the marketplace (discover, checkout, account…)
 *   {store}.resell.store/*  one seller's store, rewritten by proxy.ts to /store/{store}/*
 *
 * In dev the root is localhost:5689, so stores live at maya.localhost:5689.
 */

export const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:5689";

const rootHostname = rootDomain.split(":")[0]!;
const protocol = rootHostname === "localhost" ? "http" : "https";

/** Subdomains that are never stores. */
const reserved = new Set(["www", "app", "api"]);

/** The store a request's Host header points at, or null for the marketplace. */
export function storeFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0]!.toLowerCase();
  if (!hostname.endsWith(`.${rootHostname}`)) return null;
  const sub = hostname.slice(0, -(rootHostname.length + 1));
  if (!sub || sub.includes(".") || reserved.has(sub)) return null;
  return sub;
}

/** Absolute URL on the marketplace. */
export function siteUrl(path = "/") {
  return `${protocol}://${rootDomain}${path}`;
}

/** Absolute URL inside a store. */
export function storeUrl(store: string, path = "/") {
  return `${protocol}://${store}.${rootDomain}${path}`;
}

/** How a store's address reads on the page. Always the production domain. */
export function storeDomain(store: string) {
  return `${store}.resell.store`;
}
