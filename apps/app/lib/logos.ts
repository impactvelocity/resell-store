/*
 * Company logos from logo.dev. Needs NEXT_PUBLIC_LOGO_DEV_TOKEN (a publishable
 * pk_ key, safe in page code). Without it this returns null and callers show
 * the name as text instead.
 */

const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

export function logoUrl(domain: string, size = 64) {
  if (!token) return null;
  return `https://img.logo.dev/${domain}?token=${token}&size=${size}&format=png&retina=true`;
}
