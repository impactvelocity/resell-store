import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/*
 * Turns the seed drawings (seed/art/{store}/{item}.svg) into the PNGs the seed
 * uploads (seed/images/{store}/{item}.png, 1200×1200).
 *
 *   pnpm --filter app seed:art                   every store
 *   pnpm --filter app seed:art holohollow        one store (or several)
 *   pnpm --filter app seed:art --sheet out.png   also a contact sheet, to look them over
 *
 * The drawings follow seed/image-style.ts: a 400×400 viewBox, a flat
 * background in the store's tint, the palette's colours only, and the item
 * inside the middle 70% (listing cards crop the photo a little).
 */

const here = dirname(fileURLToPath(import.meta.url));
const artDir = join(here, "../seed/art");
const imagesDir = join(here, "../seed/images");

const argv = process.argv.slice(2);
const sheetAt = argv.indexOf("--sheet");
const sheet = sheetAt >= 0 ? argv[sheetAt + 1] : undefined;
const only = argv.filter((a, i) => !a.startsWith("--") && (sheetAt < 0 || i !== sheetAt + 1));

const drawings: { store: string; name: string; svg: string }[] = [];
for (const store of readdirSync(artDir).sort()) {
  if (only.length && !only.includes(store)) continue;
  for (const file of readdirSync(join(artDir, store)).sort()) {
    if (!file.endsWith(".svg")) continue;
    drawings.push({ store, name: file.slice(0, -4), svg: readFileSync(join(artDir, store, file), "utf8") });
  }
}

for (const d of drawings) {
  mkdirSync(join(imagesDir, d.store), { recursive: true });
  await sharp(Buffer.from(d.svg), { density: 288 })
    .resize(1200, 1200)
    .png()
    .toFile(join(imagesDir, d.store, `${d.name}.png`));
}
console.log(`Rendered ${drawings.length} drawings into seed/images.`);

if (sheet) {
  // Every drawing in a grid with its name, clipped like a listing card
  const cols = 4, size = 300, gap = 20, label = 28;
  const rows = Math.ceil(drawings.length / cols);
  const tiles = drawings.map((d, i) => {
    const x = gap + (i % cols) * (size + gap);
    const y = gap + Math.floor(i / cols) * (size + label + gap);
    const body = d.svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 400 400"><clipPath id="c${i}"><rect width="400" height="400" rx="24"/></clipPath><g clip-path="url(#c${i})">${body}</g></svg><text x="${x}" y="${y + size + 19}" font-family="Helvetica" font-size="13" fill="#14261d">${d.store}/${d.name}</text>`;
  });
  const width = cols * (size + gap) + gap;
  const height = rows * (size + label + gap) + gap;
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff"/>${tiles.join("")}</svg>`))
    .png()
    .toFile(sheet);
  console.log(`Contact sheet: ${sheet}`);
}
