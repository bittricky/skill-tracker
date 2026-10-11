#!/usr/bin/env node
// Regenerate the app icon set from a pixelarticons glyph.
import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public");
const CANVAS = 512;
const BG = "#1c2030"; // --color-surface-bg / manifest background_color
const FG = "#e8b04a"; // --color-accent-mustard / manifest theme_color

// pixelarticons "sparkle", 24x24 grid
const GLYPH =
  "M11 1h2v4h-2zm0 22h2v-4h-2zM9 5h2v4H9zm0 14h2v-4H9zm4-14h2v4h-2zm0 14h2v4h-2zM5 9h4v2H5zm14 0h-4v2h4zM1 11h4v2H1zm22 0h-4v2h4zM5 13h4v2H5zm14 0h-4v2h4z";

// px must be a multiple of 24 so each art "pixel" stays a whole square.
const glyph = (px) => {
  const offset = (CANVAS - px) / 2;
  return `<g transform="translate(${offset} ${offset}) scale(${px / 24})" fill="${FG}" shape-rendering="crispEdges"><path d="${GLYPH}"/></g>`;
};
const svg = (bg, px) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}">\n  ${bg}\n  ${glyph(px)}\n</svg>\n`;

const iconSvg = svg(
  `<rect width="${CANVAS}" height="${CANVAS}" rx="96" fill="${BG}"/>`,
  288, // 12x grid scale
);
const maskableSvg = svg(
  `<rect width="${CANVAS}" height="${CANVAS}" fill="${BG}"/>`,
  240, // 10x — keeps the glyph inside the ~80% maskable safe zone
);
const fullbleed = svg(
  `<rect width="${CANVAS}" height="${CANVAS}" fill="${BG}"/>`,
  288, // raster only: apple-touch-icon (iOS applies its own rounding)
);

const raster = (s, size) =>
  sharp(Buffer.from(s), { density: 384 }).resize(size, size).png().toBuffer();

await writeFile(join(ROOT, "icon.svg"), iconSvg);
await writeFile(join(ROOT, "icon-maskable.svg"), maskableSvg);
await writeFile(join(ROOT, "icon-180.png"), await raster(fullbleed, 180));
await writeFile(join(ROOT, "icon-192.png"), await raster(iconSvg, 192));
await writeFile(join(ROOT, "icon-512.png"), await raster(iconSvg, 512));
await writeFile(
  join(ROOT, "favicon.ico"),
  await pngToIco(
    await Promise.all([16, 32, 48].map((s) => raster(iconSvg, s))),
  ),
);
console.log(
  "icons → public/: icon.svg, icon-maskable.svg, icon-180/192/512.png, favicon.ico",
);
