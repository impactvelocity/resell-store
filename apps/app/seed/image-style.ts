import type { ShopTone } from "@repo/db";

/*
 * The house style for seed pictures: the flat product drawings in
 * components/market/art.tsx. The seed's own pictures are hand-drawn SVGs in
 * seed/art that follow these rules (400×400, background in the store's tint,
 * the item inside the middle 70% because listing cards crop the edges). The
 * same rules as words, for an image model, come out of `seed --prompts`.
 * Colours are the tokens in packages/ui/src/styles.css.
 */

export const palette = {
  lemon: "#ffd934",
  "pale lemon": "#fff6c2",
  amber: "#f5be0b",
  "leaf green": "#256b4c",
  mint: "#8cc9a4",
  "pale mint": "#ddf0e3",
  pink: "#ff5fa8",
  "deep pink": "#c9246f",
  blush: "#ffdceb",
  "berry red": "#d9391b",
  ink: "#14261d",
  white: "#ffffff",
} as const;

/** One flat background per store colour, so a store's pictures sit together. */
export const background: Record<ShopTone, { name: string; hex: string }> = {
  lemon: { name: "pale lemon", hex: palette["pale lemon"] },
  mint: { name: "pale mint", hex: palette["pale mint"] },
  leaf: { name: "pale mint", hex: palette["pale mint"] },
  pink: { name: "blush", hex: palette.blush },
  blush: { name: "blush", hex: palette.blush },
};

const paletteLine = Object.entries(palette)
  .map(([name, hex]) => `${name} ${hex}`)
  .join(", ");

export const STYLE = `Flat vector illustration of one object, in the style of a consistent set of product icons for a friendly second-hand marketplace.

Drawing: simple geometric shapes with solid colour fills and softly rounded corners. No outlines around shapes; small details (seams, stitching, straps, handles, text lines) are thick strokes with rounded ends. No gradients, textures, noise, shadows, glows, reflections or highlights, and no 3D rendering. Straight-on or a gentle three-quarter view, with simplified, slightly chunky proportions. Surface patterns (weave, marble, plaid, flowers) are made of a few flat repeated shapes, never detailed.

Colour: only these flat colours: ${paletteLine}. Map the object's real colours to the nearest of them (brown and tan become amber, navy and black become ink, grey becomes pale lemon or white, blue becomes mint). Use at most four colours on the object.

Composition: the object alone, centred, filling about 70% of a square frame with even empty space around it, on a plain flat background. Nothing else: no table, floor, scenery, hands, people or props unless named below.

Never draw text, letters, numbers, logos or brand marks. Where a label or title would be, use short plain bars instead.`;

/** The full prompt for one item's picture. */
export function itemPrompt(subject: string, tone: ShopTone) {
  const bg = background[tone];
  return `${STYLE}\n\nBackground: solid ${bg.name} (${bg.hex}).\n\nSubject: ${subject}`;
}

/** The full prompt for a store's round picture (cropped to a circle). */
export function storePicturePrompt(subject: string, tone: ShopTone) {
  const bg = background[tone];
  return `${STYLE}\n\nThis one is a store's profile picture and will be cropped to a circle: keep the object inside the central circle, filling about 60% of it.\n\nBackground: solid ${bg.name} (${bg.hex}).\n\nSubject: ${subject}`;
}
