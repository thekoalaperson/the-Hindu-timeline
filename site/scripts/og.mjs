#!/usr/bin/env node
/**
 * og.mjs — the site's raster identity, drawn from the one vector mark.
 *
 * Every file it writes is derived, never hand-edited, and gitignored:
 *
 *   public/favicon.svg        copied verbatim from the mark's source
 *                             (src/components/clock/favicon.svg — I3 owns it)
 *   public/apple-touch-icon.png   180×180
 *   public/icon-192.png           192×192   } the two manifest icons
 *   public/icon-512.png           512×512   }
 *   public/og-default.png     1200×630, the default og:image for every page
 *
 * Run by `npm run generate`, so a clean checkout produces them before the
 * build reads `public/`.
 *
 * Usage: node scripts/og.mjs [--out <dir>] [--quiet]
 *
 * On the wordmark's face. sharp renders SVG through librsvg + fontconfig,
 * which sees only fonts installed on the machine — EB Garamond ships with the
 * site as woff2 and is invisible to it (verified: "EB Garamond" rasterises
 * byte-identically to a nonexistent family). Rather than embed a face we do not
 * have, the card is set in the site's OWN declared fallback chain —
 * `local('Georgia'), local('Times New Roman'), local('Times'),
 * local('Liberation Serif')` from styles/typography.css. It is the face a
 * reader sees for the instant before EB Garamond loads, so the card is
 * consistent with the site rather than with an arbitrary substitute.
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');

function parseArgs(argv) {
  const o = { quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quiet') o.quiet = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else throw new Error(`unexpected argument: ${a}`);
  }
  return o;
}
const args = parseArgs(process.argv.slice(2));
const OUT = path.resolve(SITE, args.out ?? 'public');
const MARK_SRC = path.join(SITE, 'src/components/clock/favicon.svg');
const log = (...m) => { if (!args.quiet) console.log(...m); };

/* -- tokens (styles/tokens.css, light theme) ------------------------------ */
const PAPER = '#F4EEDD';
const PAPER_MARGIN = '#EAE1C8';
const INK = '#241C15';
const INK_2 = '#5B4F3F';
const RUBRIC = '#A8342A';
const GOLD = '#96742E';
const GOLD_DEEP = '#6E541E';
const RULE_STRONG = '#9A8A67'; // color-mix(--rule 62%, --ink), flattened

/** The site's own fallback chain — see the note at the top of this file. */
const FACE = 'Georgia, &quot;Times New Roman&quot;, Times, &quot;Liberation Serif&quot;, serif';

/**
 * The mark, drawn at OG scale. This is not `clockMarkSvg({ size: 320 })`:
 * that helper keeps a *rendered hairline* by thinning the stroke as the mark
 * grows, and it bottoms out at 0.9 user units — nine rendered pixels at 320px,
 * which is a band, not a hairline. Here the geometry is the same (rings at
 * 14 / 10.5 / 7 in a 32-unit box, the Kali arc lit, the vermilion needle at
 * twelve o'clock) with strokes chosen for this size.
 */
function markSvg(size, hairPx = 3.1) {
  const s = 32;
  const k = size / s;
  const hair = hairPx / k; // `hairPx` rendered pixels, whatever the size
  const rings = [14, 10.5, 7]
    .map(
      (r, i) =>
        `<circle cx="16" cy="16" r="${r}" fill="none" stroke="${GOLD}" ` +
        `stroke-width="${(i === 0 ? hair * 1.15 : hair * 0.85).toFixed(3)}"` +
        `${i === 0 ? '' : ' opacity=".62"'}/>`,
    )
    .join('');
  // Kali's true 36° share of the mahāyuga, clockwise from twelve.
  const a0 = ((324 - 90) * Math.PI) / 180;
  const a1 = ((360 - 90) * Math.PI) / 180;
  const p = (t, r) => `${(16 + r * Math.cos(t)).toFixed(3)} ${(16 + r * Math.sin(t)).toFixed(3)}`;
  return (
    `<g transform="scale(${k})">` +
    rings +
    `<path d="M ${p(a0, 14)} A 14 14 0 0 1 ${p(a1, 14)}" fill="none" ` +
    `stroke="${GOLD_DEEP}" stroke-width="${(hair * 2.4).toFixed(3)}"/>` +
    `<line x1="16" y1="12.6" x2="16" y2="1.4" stroke="${RUBRIC}" ` +
    `stroke-width="${(hair * 1.35).toFixed(3)}"/>` +
    `<circle cx="16" cy="16" r="${(hair * 1.5).toFixed(3)}" fill="${RUBRIC}"/>` +
    `</g>`
  );
}

/**
 * 1200×630. Paper, the hashiya margin band, the double rule (ink hairline +
 * vermilion hairline 2px apart — DESIGN-BRIEF §1.4), the mark on the left and
 * the wordmark with one line of the proposition on the right. No gradient, no
 * shadow, nothing figurative.
 */
function ogSvg() {
  const W = 1200;
  const H = 630;
  const M = 34; // the margin band
  const markSize = 236;
  const markX = 104;
  const markY = (H - markSize) / 2;
  const textX = markX + markSize + 86;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${PAPER_MARGIN}"/>` +
    `<rect x="${M}" y="${M}" width="${W - M * 2}" height="${H - M * 2}" fill="${PAPER}"/>` +
    // the double rule, just inside the well
    `<rect x="${M + 14}" y="${M + 14}" width="${W - (M + 14) * 2}" height="${H - (M + 14) * 2}" ` +
    `fill="none" stroke="${RULE_STRONG}" stroke-width="1.5"/>` +
    `<rect x="${M + 18}" y="${M + 18}" width="${W - (M + 18) * 2}" height="${H - (M + 18) * 2}" ` +
    `fill="none" stroke="${RUBRIC}" stroke-width="1.5"/>` +
    `<g transform="translate(${markX} ${markY})">${markSvg(markSize)}</g>` +
    `<text x="${textX}" y="292" font-family="${FACE}" font-size="76" fill="${INK}">` +
    `The Hindu Timeline</text>` +
    `<rect x="${textX}" y="322" width="112" height="1.6" fill="${RUBRIC}"/>` +
    `<text x="${textX}" y="382" font-family="${FACE}" font-size="33" fill="${INK_2}">` +
    `A manuscript you can walk through</text>` +
    `<text x="${textX}" y="428" font-family="${FACE}" font-size="26" fill="${INK_2}">` +
    `The whole Hindu chronology on the cosmic clock,</text>` +
    `<text x="${textX}" y="466" font-family="${FACE}" font-size="26" fill="${INK_2}">` +
    `cited line by line.</text>` +
    `</svg>`
  );
}

/**
 * An app icon at 180–512 px: the mark on a square paper ground, inset by a
 * margin so nothing touches an OS mask.
 *
 * It is deliberately NOT a scaled `favicon.svg`. That drawing carries 1.3–3.0
 * unit strokes in a 32-unit box because it has to survive a 16px browser tab;
 * blown up to 192px those become 8–18px bands and the mark reads as a bullseye.
 * Here the stroke is a constant ~3.4% of the icon, so the rings stay rings.
 */
function iconSvg(size) {
  const inner = Math.round(size * 0.86);
  const inset = Math.round((size - inner) / 2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" fill="${PAPER}"/>` +
    `<g transform="translate(${inset} ${inset})">${markSvg(inner, size * 0.034)}</g>` +
    `</svg>`
  );
}

async function icon(size, file) {
  const info = await sharp(Buffer.from(iconSvg(size)))
    .flatten({ background: PAPER })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(OUT, file));
  log(`  ${file.padEnd(22)} ${size}×${size}  ${(info.size / 1024).toFixed(1)} KB`);
  return info.size;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  // favicon.svg is I3's drawing; this copy is what the site actually serves.
  const mark = await fs.readFile(MARK_SRC, 'utf8');
  await fs.writeFile(path.join(OUT, 'favicon.svg'), mark);
  log(`  favicon.svg            copied from src/components/clock/favicon.svg`);

  let bytes = 0;
  bytes += await icon(180, 'apple-touch-icon.png');
  bytes += await icon(192, 'icon-192.png');
  bytes += await icon(512, 'icon-512.png');

  const og = await sharp(Buffer.from(ogSvg()))
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'og-default.png'));
  bytes += og.size;
  log(`  og-default.png         1200×630  ${(og.size / 1024).toFixed(1)} KB`);

  log(`identity: 5 files, ${(bytes / 1024).toFixed(0)} KB in ${path.relative(SITE, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
