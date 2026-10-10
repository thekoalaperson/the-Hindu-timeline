#!/usr/bin/env node
/**
 * Build the website's explicitly selected artwork from an external asset catalog.
 * No source repository, cloud account, or private directory is assumed.
 * Without HT_ASSET_ROOT and HT_ASSET_CATALOG the website uses remote film posters.
 *
 * node scripts/media.mjs [--assets <root>] [--catalog <json>] [--check] [--quiet]
 * The catalog contains films[slug] {thumbnail, stillsRoot, stills, vector}, plates[id]
 * paths, and vectors[slug] export-directory paths. All paths are relative to
 * the asset root. Only referenced inputs are read; source files are never edited.
 * public/media/ and src/generated/media-manifest.json are disposable outputs.
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { existsSync, statSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');           // scripts/ -> site/

// ---------------------------------------------------------------- arguments
function parseArgs(argv) {
  const o = { force: false, check: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
    else if (a === '--check') o.check = true;
    else if (a === '--quiet') o.quiet = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else throw new Error(`unexpected argument: ${a}`);
  }
  return o;
}
const args = parseArgs(process.argv.slice(2));

const SRC = path.resolve(SITE, args.src ?? 'src/data/featured.json');
const OUT = path.resolve(SITE, args.out ?? 'public/media');
const assetRoot = args.assets ?? process.env.HT_ASSET_ROOT;
const catalogFile = args.catalog ?? process.env.HT_ASSET_CATALOG;
if (Boolean(assetRoot) !== Boolean(catalogFile))
  throw new Error('Set both HT_ASSET_ROOT and HT_ASSET_CATALOG, or neither.');
const ASSETS = assetRoot ? path.resolve(assetRoot) : null;
const catalog = catalogFile ? JSON.parse(await fs.readFile(path.resolve(catalogFile), 'utf8')) : {};
if (catalogFile && (!catalog.films || typeof catalog.films !== 'object'))
  throw new Error('Asset catalog must contain a films object.');

/** Contain both lexical paths and existing symlinks within the supplied root. */
function assetPath(relative) {
  if (!ASSETS || typeof relative !== 'string' || !relative || path.isAbsolute(relative))
    throw new Error('Catalog asset paths must be nonempty relative paths.');
  const result = path.resolve(ASSETS, relative);
  const inside = (base, target) => target.startsWith(base + path.sep);
  if (!inside(ASSETS, result)) throw new Error('Catalog path escapes the asset root.');
  if (existsSync(result) && !inside(realpathSync(ASSETS), realpathSync(result)))
    throw new Error('Catalog symlink escapes the asset root.');
  return result;
}
const MANIFEST = path.resolve(SITE, args.manifest ?? 'src/generated/media-manifest.json');

// ------------------------------------------------------------------ tiers
const THUMB_TIERS = [400, 800, 1280];
const STILL_TIERS = [400, 800, 1600];
// WebP quality per tier. The 1600 tier carries most of the weight, so it is
// tuned down to hold the whole output under the ~60 MB budget; at that size
// painterly artwork shows no visible difference between q72 and q80.
const STILL_Q = { 400: 80, 800: 78, 1600: 72 };
const THUMB_Q = { 400: 75, 800: 80, 1280: 75 };
const Q = 80;              // vector-film posters
const LQIP_WIDTH = 24;

const log = (...m) => { if (!args.quiet) console.log(...m); };

let written = 0, skipped = 0, bytes = 0;

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }

/** True when dst exists and is at least as new as src (unless --force). */
function fresh(src, dst) {
  if (args.force || !existsSync(dst)) return false;
  try { return statSync(dst).mtimeMs >= statSync(src).mtimeMs; }
  catch { return false; }
}

/**
 * Resize `src` to `width` (never upscaling) and write WebP to `dst`.
 * Returns the actual pixel width written.
 */
async function tier(src, dst, width, quality, srcWidth) {
  const target = Math.min(width, srcWidth);
  if (fresh(src, dst)) {
    skipped++;
    bytes += statSync(dst).size;
    return target;
  }
  await ensureDir(path.dirname(dst));
  // sharp drops metadata unless withMetadata() is called — we never call it.
  const info = await sharp(src)
    .resize({ width: target, withoutEnlargement: true })
    .webp({ quality })
    .toFile(dst);
  written++;
  bytes += info.size;
  return info.width;
}

/** A tiny blurred base64 WebP used as an inline placeholder. */
async function lqip(src) {
  const buf = await sharp(src)
    .resize({ width: LQIP_WIDTH, withoutEnlargement: true })
    .blur(1.4)
    .webp({ quality: 40 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

// --------------------------------------------------------------- vector films
const HTTP_REF = /\b(?:src|href)\s*=\s*["'](?:https?:)?\/\//i;

async function copyVectorFilms(manifest) {
  for (const [slug, relative] of Object.entries(catalog.vectors ?? {})) {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid vector film identifier.');
    const srcHtml = assetPath(path.join(relative, 'index.html'));
    if (!existsSync(srcHtml)) { console.warn(`  ! vector export missing: ${slug}`); continue; }
    const html = await fs.readFile(srcHtml, 'utf8');
    if (HTTP_REF.test(html)) {
      console.warn(`  ! vector export has external references: ${slug}`);
      continue;
    }
    const dstDir = path.join(OUT, 'vector', slug);
    await ensureDir(dstDir);
    await fs.copyFile(srcHtml, path.join(dstDir, 'index.html'));
    written++; bytes += statSync(srcHtml).size;
    const entry = { index: `/media/vector/${slug}/index.html` };
    const poster = assetPath(path.join(relative, 'poster.png'));
    if (existsSync(poster)) {
      const meta = await sharp(poster).metadata();
      await tier(poster, path.join(dstDir, 'poster.webp'), 1280, Q, meta.width);
      entry.poster = `/media/vector/${slug}/poster.webp`;
    }
    manifest.vector[slug] = entry;
  }
  for (const [slug, film] of Object.entries(manifest.films))
    film.vector = manifest.vector[catalog.films?.[slug]?.vector]?.index ?? null;
  log(`  vector films: ${Object.keys(manifest.vector).length}`);
}

// ------------------------------------------------------------------- plates
/**
 * A plate is the one picture that stands over a chapter, a hub tile or an era.
 * Same tiers as a still — it is used at exactly the same sizes.
 */
const PLATE_TIERS = STILL_TIERS;
const PLATE_Q = STILL_Q;

/**
 * Darken, desaturate and vignette. The Rāmāyaṇa series' approved renders are a
 * photoreal register next to the channel's painted films; left alone they read
 * as an illustration of the chapter and fight the label sitting on them. This
 * is the whole treatment, applied once at build time.
 */
function atmosphere(pipeline, w, h) {
  const vignette = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<defs><radialGradient id="v" cx="50%" cy="42%" r="76%">` +
      `<stop offset="25%" stop-color="#ffffff"/>` +
      `<stop offset="70%" stop-color="#9a94a8"/>` +
      `<stop offset="100%" stop-color="#3a3746"/>` +
      `</radialGradient></defs>` +
      `<rect width="${w}" height="${h}" fill="url(#v)"/></svg>`,
  );
  /* Blur scales with the tier so the 400 px road thumbnail and the 1600 px
     band get the same *apparent* softness rather than the same pixel radius. */
  const sigma = Math.max(0.3, (w / 1600) * 1.6);
  return pipeline
    .modulate({ brightness: 0.56, saturation: 0.34 })
    .blur(sigma)
    .composite([{ input: vignette, blend: 'multiply' }]);
}

/**
 * Write one studio image into `<OUT>/<kind>/<id>-<tier>.webp`.
 * Returns the manifest entry, or null when the source is missing.
 */
async function assetPlate(kind, id, relPath, treatment, alt) {
  const src = assetPath(relPath);
  if (!existsSync(src)) {
    console.warn(`  ! plate ${kind}/${id}: missing ${relPath}`);
    return null;
  }
  const meta = await sharp(src).metadata();
  const dir = path.join(OUT, kind);
  const sizes = {};
  for (const w of PLATE_TIERS) {
    const dst = path.join(dir, `${id}-${w}.webp`);
    const target = Math.min(w, meta.width);
    if (fresh(src, dst)) {
      skipped++;
      bytes += statSync(dst).size;
    } else {
      await ensureDir(dir);
      let pipe = sharp(src).resize({ width: target, withoutEnlargement: true });
      if (treatment === 'atmosphere') {
        const h = Math.round((meta.height * target) / meta.width);
        pipe = atmosphere(pipe, target, h);
      }
      const info = await pipe.webp({ quality: PLATE_Q[w] ?? Q }).toFile(dst);
      written++;
      bytes += info.size;
    }
    sizes[w] = `/media/${kind}/${id}-${w}.webp`;
  }
  const cap = PLATE_TIERS[PLATE_TIERS.length - 1];
  const width = Math.min(cap, meta.width);
  return {
    src: sizes[800] ?? sizes[cap],
    srcset: PLATE_TIERS.map((w) => `${sizes[w]} ${w}w`).join(', '),
    w: width,
    h: Math.round(meta.height * (width / meta.width)),
    alt: alt ?? '',
    lqip: await lqip(src),
    source: 'asset',
  };
}

/** Point a plate at a film still that the film tiers already carry. */
function filmPlate(manifest, slug, index, alt) {
  const entry = manifest.films[slug];
  const still = entry?.stills?.find((item) => item.sourceIndex === (index ?? 0));
  if (!still) return null;
  return {
    src: still.sizes[800],
    srcset: PLATE_TIERS.map((w) => `${still.sizes[w]} ${w}w`).join(', '),
    w: still.width,
    h: still.height,
    alt: alt ?? still.alt ?? '',
    lqip: still.lqip,
    source: 'film',
  };
}

/** One `art`-shaped spec → a manifest entry (or null). */
async function buildPlate(manifest, kind, id, spec) {
  if (!spec || typeof spec !== 'object') return null;
  if (spec.film) return filmPlate(manifest, spec.film, spec.still ?? 0, spec.alt);
  if (spec.asset && catalog.plates?.[spec.asset]) {
    return assetPlate(kind, id, catalog.plates[spec.asset], spec.treatment, spec.alt);
  }
  return null;
}

/**
 * chapters.json `art` + art-plates.json `hub` → manifest.chapters / .hub /
 * .eras. `eras` is the Kali-history slice of `chapters`, keyed the same way,
 * so the road's era markers do not have to know about the chapter spine.
 */
async function buildPlates(manifest) {
  manifest.chapters = {};
  manifest.hub = {};
  manifest.eras = {};

  const chaptersFile = path.resolve(SITE, 'src/data/chapters.json');
  if (existsSync(chaptersFile)) {
    const data = JSON.parse(await fs.readFile(chaptersFile, 'utf8'));
    for (const period of data.periods ?? []) {
      for (const c of period.chapters ?? []) {
        const entry = await buildPlate(manifest, 'chapters', c.id, c.art);
        if (!entry) continue;
        manifest.chapters[c.id] = entry;
        if (period.slug === 'kali-yuga-history') manifest.eras[c.id] = entry;
      }
    }
  }

  const platesFile = path.resolve(SITE, 'src/data/art-plates.json');
  if (existsSync(platesFile)) {
    const data = JSON.parse(await fs.readFile(platesFile, 'utf8'));
    for (const [id, spec] of Object.entries(data.hub ?? {})) {
      const entry = await buildPlate(manifest, 'hub', id, spec);
      if (entry) manifest.hub[id] = entry;
    }
  }

  log(`  plates: ${Object.keys(manifest.chapters).length} chapters, ` +
      `${Object.keys(manifest.hub).length} hub, ${Object.keys(manifest.eras).length} eras`);
}

// ------------------------------------------------------------------- checks
async function runCheck(films) {
  if (!ASSETS) throw new Error('--check requires an asset root and catalog.');
  const missing = [];
  const check = (label, relative) => {
    if (!relative || !existsSync(assetPath(relative))) missing.push(label);
  };
  for (const film of films) {
    const src = catalog.films?.[film.slug] ?? {};
    if (film.thumbnail) check(`${film.slug}: thumbnail`, src.thumbnail);
    for (const still of film.stills ?? [])
      check(`${film.slug}: still ${still.file}`, src.stills?.[still.file] ?? (src.stillsRoot ? path.join(src.stillsRoot, still.file) : null));
  }
  const chapters = JSON.parse(await fs.readFile(path.join(SITE, 'src/data/chapters.json'), 'utf8'));
  for (const period of chapters.periods ?? [])
    for (const chapter of period.chapters ?? [])
      if (chapter.art?.asset) check(`plate: ${chapter.art.asset}`, catalog.plates?.[chapter.art.asset]);
  for (const [slug, relative] of Object.entries(catalog.vectors ?? {}))
    check(`vector: ${slug}`, path.join(relative, 'index.html'));
  console.log(`checked ${films.length} films, ${Object.keys(catalog.plates ?? {}).length} plates, ` +
              `${Object.keys(catalog.vectors ?? {}).length} vector exports`);
  if (missing.length) {
    console.error(`MISSING (${missing.length}):\n` + missing.map((m) => '  ' + m).join('\n'));
    process.exitCode = 1;
  } else console.log('all catalogued source files present.');
}

// --------------------------------------------------------------------- main
async function main() {
  if (!existsSync(SRC)) {
    console.error(`featured.json not found at ${SRC}`);
    process.exit(1);
  }
  const films = JSON.parse(await fs.readFile(SRC, 'utf8'));

  if (args.check) { await runCheck(films); return; }

  // Rebuild the owned output directory: an asset-free build must not retain
  // pictures or players from a previous private-catalog build.
  const publicRoot = path.resolve(SITE, 'public');
  if (!OUT.startsWith(publicRoot + path.sep)) throw new Error('--out must be inside site/public/.');
  await fs.rm(OUT, { recursive: true, force: true });
  if (!ASSETS) log('No asset catalog: using film poster fallbacks.');

  const manifest = { films: {}, vector: {} };
  const t0 = Date.now();

  for (const f of films) {
    const s = catalog.films?.[f.slug] ?? {};
    const dir = path.join(OUT, 'films', f.slug);
    const entry = { thumb: null, stills: [], vector: null };

    // -- thumbnail (YouTube 1280x720 JPEG)
    if (s.thumbnail) {
      const src = assetPath(s.thumbnail);
      if (existsSync(src)) {
        const meta = await sharp(src).metadata();
        const t = {};
        for (const w of THUMB_TIERS) {
          const dst = path.join(dir, `thumb-${w}.webp`);
          await tier(src, dst, w, THUMB_Q[w] ?? Q, meta.width);
          t[w] = `/media/films/${f.slug}/thumb-${w}.webp`;
        }
        t.lqip = await lqip(src);
        t.width = meta.width; t.height = meta.height;
        entry.thumb = t;
      } else {
        console.warn(`  ! ${f.slug}: thumbnail missing ${s.thumbnail}`);
      }
    }

    // -- hero stills
    let n = 0;
    for (const [sourceIndex, st] of ((s.stillsRoot || s.stills) ? f.stills ?? [] : []).entries()) {
      const src = assetPath(s.stills?.[st.file] ?? path.join(s.stillsRoot, st.file));
      if (!existsSync(src)) {
        console.warn(`  ! ${f.slug}: still missing ${st.file}`);
        continue;
      }
      n++;
      const meta = await sharp(src).metadata();
      const sizes = {};
      let outW = meta.width;
      for (const w of STILL_TIERS) {
        const dst = path.join(dir, `${n}-${w}.webp`);
        outW = await tier(src, dst, w, STILL_Q[w] ?? Q, meta.width);
        sizes[w] = `/media/films/${f.slug}/${n}-${w}.webp`;
      }
      entry.stills.push({
        sourceIndex,
        sizes,
        // the largest tier is capped at the source width — no upscaling
        width: Math.min(STILL_TIERS[STILL_TIERS.length - 1], meta.width),
        height: Math.round(meta.height *
          Math.min(1, STILL_TIERS[STILL_TIERS.length - 1] / meta.width)),
        lqip: await lqip(src),
        alt: st.alt,
        ...(st.caption ? { caption: st.caption } : {}),
      });
    }
    manifest.films[f.slug] = entry;
  }

  await copyVectorFilms(manifest);
  await buildPlates(manifest);

  await ensureDir(path.dirname(MANIFEST));
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');

  const mb = bytes / (1024 * 1024);
  log(`\nmedia: ${written} written, ${skipped} up-to-date, ` +
      `${mb.toFixed(1)} MB total in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  log(`  out:      ${path.relative(SITE, OUT)}`);
  log(`  manifest: ${path.relative(SITE, MANIFEST)} ` +
      `(${(statSync(MANIFEST).size / 1024).toFixed(0)} KB)`);
  if (mb > 60) console.warn(`  ! output exceeds the ~60 MB budget (${mb.toFixed(1)} MB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
