/*
 * Where links and images point. In the app NEXT_PUBLIC_ROOT_DOMAIN is set, so
 * images come from the app's public/email folder. The preview server has no env
 * and serves emails/static at /static.
 */

const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
const protocol = root?.split(":")[0] === "localhost" ? "http" : "https";

export const siteUrl = root ? `${protocol}://${root}` : "https://resell.store";

const assetsBase = root ? `${siteUrl}/email` : "/static";

export function asset(file: string) {
  return `${assetsBase}/${file}`;
}

/** "$20", "$20.50" */
export function money(dollars: number) {
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}
