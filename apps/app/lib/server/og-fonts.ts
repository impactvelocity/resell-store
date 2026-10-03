import "server-only";

/*
 * Fonts for the share images (next/og, which is Satori underneath):
 * Bricolage Grotesque and Figtree as TTF, from Google Fonts' CSS API. A
 * server fetch gets TrueType (browsers get woff2, which Satori can't read).
 * Kept in memory per process and in Next's data cache for a week. If Google
 * can't be reached the images use next/og's built-in font instead of failing.
 */

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700 | 800;
  style: "normal";
};

export const OG_FONT_DISPLAY = "Bricolage Grotesque";
export const OG_FONT_BODY = "Figtree";

/** Optical size 96 for the big display type, like the site's headlines. */
const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@96,800&family=Figtree:wght@500;700";

const WEEK = 60 * 60 * 24 * 7;
const FONT_TIMEOUT_MS = 5000;

/** The TrueType/OpenType faces in a Google Fonts stylesheet: family, weight and URL. */
export function parseFontCss(css: string) {
  const faces: { family: string; weight: number; url: string }[] = [];
  for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
    const family = block.match(/font-family:\s*['"]?([^;'"]+)['"]?\s*;/)?.[1]?.trim();
    const weight = Number(block.match(/font-weight:\s*(\d+)/)?.[1] ?? 400);
    const src = block.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(truetype|opentype)['"]?\)/);
    if (family && src) faces.push({ family, weight, url: src[1]!.replace(/^['"]|['"]$/g, "") });
  }
  return faces;
}

async function fetchFonts(): Promise<OgFont[]> {
  const res = await fetch(FONT_CSS, {
    next: { revalidate: WEEK },
    signal: AbortSignal.timeout(FONT_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Google Fonts CSS ${res.status}`);
  const faces = parseFontCss(await res.text());
  if (faces.length === 0) throw new Error("Google Fonts CSS had no TrueType faces");
  return Promise.all(
    faces.map(async (f) => {
      const font = await fetch(f.url, { next: { revalidate: WEEK }, signal: AbortSignal.timeout(FONT_TIMEOUT_MS) });
      if (!font.ok) throw new Error(`Font ${f.family} ${f.weight}: ${font.status}`);
      return {
        name: f.family,
        data: await font.arrayBuffer(),
        weight: f.weight as OgFont["weight"],
        style: "normal" as const,
      };
    }),
  );
}

let fonts: Promise<OgFont[]> | null = null;

/** The brand fonts for ImageResponse, or [] (use the default font) when they can't be loaded. */
export function loadOgFonts(): Promise<OgFont[]> {
  fonts ??= fetchFonts().catch((error) => {
    console.error("Share image fonts unavailable; using the default font.", error);
    // Try again on a later image rather than remembering the failure
    fonts = null;
    return [];
  });
  return fonts;
}

/** For tests: forget the cached fonts. */
export function resetOgFonts() {
  fonts = null;
}
