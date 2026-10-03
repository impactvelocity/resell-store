import "server-only";
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { SiteCard } from "../../components/og/cards";
import { OG_SIZE } from "../og";
import { loadOgFonts } from "./og-fonts";

/*
 * Turns a share card into a 1200×630 PNG. In production the response may be
 * cached for an hour (prices change and things sell), not next/og's default
 * of a year.
 */

export async function renderOg(card: ReactElement, { maxAge = 3600 }: { maxAge?: number } = {}) {
  const fonts = await loadOgFonts();
  return new ImageResponse(card, {
    ...OG_SIZE,
    // An empty list would leave Satori with no font at all; undefined means next/og's default
    fonts: fonts.length ? fonts : undefined,
    headers:
      process.env.NODE_ENV === "production"
        ? { "cache-control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=86400` }
        : undefined,
  });
}

/** The brand image: the landing page, /discover, /stores, and anything not shareable. */
export function siteImage() {
  return renderOg(<SiteCard />, { maxAge: 86400 });
}
