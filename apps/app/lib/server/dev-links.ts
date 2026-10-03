import "server-only";

/*
 * Development only. The latest sign-in link per address is kept here so the
 * welcome page can offer it: for every address when there's no email provider,
 * and always for @example.com test accounts, which never get real email.
 */

const globalForLinks = globalThis as unknown as { devLinks?: Map<string, string> };
const links = (globalForLinks.devLinks ??= new Map());

const isDev = process.env.NODE_ENV !== "production";

export const devLinksEnabled = isDev;

/** Test accounts that sign in from the page instead of an inbox. */
export function isDevTestAddress(email: string) {
  return isDev && email.toLowerCase().endsWith("@example.com");
}

/** True when the link should stay on the page rather than go by email. */
export function keepLinkOnPage(email: string) {
  return isDev && (!process.env.RESEND_API_KEY || isDevTestAddress(email));
}

export function rememberDevLink(email: string, url: string) {
  if (keepLinkOnPage(email)) links.set(email.toLowerCase(), url);
}

export function takeDevLink(email: string) {
  if (!isDev) return null;
  const url = links.get(email.toLowerCase()) ?? null;
  links.delete(email.toLowerCase());
  return url;
}
