import { SITE_IMAGE_ALT } from "../lib/og";
import { siteImage } from "../lib/server/og-render";

/* The brand share image for every page without its own (landing, /discover, /stores…). */

export const alt = SITE_IMAGE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rebuilt daily, so a build that couldn't reach Google Fonts doesn't stick
export const revalidate = 86400;

export default function Image() {
  return siteImage();
}
