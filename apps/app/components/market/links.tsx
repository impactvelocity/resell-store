"use client";

import Link from "next/link";
import { createContext, useContext, type ComponentProps } from "react";
import { siteUrl, storeUrl } from "../../lib/urls";

/*
 * Links that know which zone they're in. Inside a store subdomain, a link to the
 * marketplace has to leave the origin (and the other way round), so it becomes a
 * plain absolute <a>. Within the same zone it stays a client-side next/link.
 */

const ZoneContext = createContext<string | null>(null);

/** Wraps a store's pages so links know they're on that store's subdomain. */
export function StoreZone({
  store,
  children,
}: {
  store: string;
  children: React.ReactNode;
}) {
  return <ZoneContext value={store}>{children}</ZoneContext>;
}

/** The store subdomain we're on, or null on the marketplace. */
export function useCurrentStore() {
  return useContext(ZoneContext);
}

type LinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** A link to a marketplace path, e.g. `/discover` or `/checkout/35mm-film-camera`. */
export function SiteLink({ href, ...props }: LinkProps) {
  const current = useCurrentStore();
  if (current) return <a href={siteUrl(href)} {...props} />;
  return <Link href={href} {...props} />;
}

/** A link into a store, e.g. `store="maya" href="/linen-wrap-dress"`. */
export function StoreLink({
  store,
  href = "/",
  ...props
}: Omit<LinkProps, "href"> & { store: string; href?: string }) {
  const current = useCurrentStore();
  if (current === store) return <Link href={href} {...props} />;
  return <a href={storeUrl(store, href)} {...props} />;
}
