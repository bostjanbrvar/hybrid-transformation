// scripts/gen-app-assets.mjs
// =============================================================
// HYBRID TRANSFORMATION — generira source ikono + splash za Capacitor assets.
//
// Izpiše:
//   resources/icon.png             1024x1024  — vijolično #9333EA ozadje + bel bold "H"
//   resources/icon-foreground.png  1024x1024  — prosojno ozadje + bel "H" (adaptivni foreground)
//   resources/icon-background.png  1024x1024  — polno vijolično #9333EA (adaptivni background)
//   resources/splash.png           2732x2732  — temno #14101F ozadje + centriran vijolični "H"
//
// icon-foreground/-background sta ločena, da je adaptivna (Android 8+) ikona
// PO maskiranju (krog/squircle) polno vijolična z belim H — brez prosojnih
// robov, ki nastanejo, če se uporabi samo icon.png (background bi bil bel in
// obrezan na safe-zono).
//
// "H" je narisan kot vektorski pravokotniki (brez odvisnosti od pisave), da je
// izris deterministicen. Zaženi:  node scripts/gen-app-assets.mjs
// Nato:  npx @capacitor/assets generate --android
//
// POMEMBNO (ročni korak PO generiranju): @capacitor/assets adaptivni background
// zavije v <inset 16.7%>, kar obreže vijolico → prosojni robovi po maskiranju.
// Zato je adaptivni background nastavljen na polno barvo:
//   res/values/ic_launcher_background.xml  → #9333EA
//   res/mipmap-anydpi-v26/ic_launcher(.|_round.)xml
//       → <background android:drawable="@color/ic_launcher_background" />
// Če ponovno poženeš assets, ta dva popravka ponovi.
// =============================================================

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "resources");

const PURPLE = "#9333EA";
const DARK = "#14101F";
const WHITE = "#FFFFFF";

/**
 * Vrne SVG string s centriranim "H" na danem platnu.
 * @param {number} size      stranica platna (px, kvadrat)
 * @param {string} bg        barva ozadja
 * @param {string} fg        barva črke H
 * @param {number} heightFrac delež višine platna, ki ga zavzame H (0..1)
 */
function hSvg(size, bg, fg, heightFrac) {
  const h = size * heightFrac;        // višina H
  const ratio = 460 / 580;            // razmerje širina:višina (bold H)
  const w = h * ratio;                // širina H
  const t = h * (120 / 580);          // debelina prečke/nog
  const x0 = (size - w) / 2;
  const y0 = (size - h) / 2;
  const barR = t / 2;                 // rahlo zaobljeni robovi

  const xRight = x0 + w - t;
  const yCross = size / 2 - t / 2;

  // bg === null → prosojno ozadje (samo H) za adaptivni foreground.
  const bgRect = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bgRect}
  <g fill="${fg}">
    <rect x="${x0}" y="${y0}" width="${t}" height="${h}" rx="${barR}"/>
    <rect x="${xRight}" y="${y0}" width="${t}" height="${h}" rx="${barR}"/>
    <rect x="${x0}" y="${yCross}" width="${w}" height="${t}" rx="${barR}"/>
  </g>
</svg>`;
}

/** Polno enobarvno platno (za adaptivni background). */
function solidSvg(size, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${color}"/></svg>`;
}

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log(`✓ ${outPath} (${size}x${size})`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Ikona (flat/legacy + iOS): vijolično ozadje, bel bold H (~55 % višine).
  await render(hSvg(1024, PURPLE, WHITE, 0.55), 1024, join(OUT_DIR, "icon.png"));

  // Adaptivni foreground: samo bel H na prosojnem (~62 %, da po 16.7 % insetu
  // ostane znotraj safe-zone).
  await render(hSvg(1024, null, WHITE, 0.62), 1024, join(OUT_DIR, "icon-foreground.png"));

  // Adaptivni background: polno vijolično (napolni celotno masko, brez robov).
  await render(solidSvg(1024, PURPLE), 1024, join(OUT_DIR, "icon-background.png"));

  // Splash: temno ozadje, centriran vijolični H (manjši logo ~28 % višine).
  await render(hSvg(2732, DARK, PURPLE, 0.28), 2732, join(OUT_DIR, "splash.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
