#!/usr/bin/env node
/**
 * check-dist.mjs — post-build link check over dist/.
 *
 * Collects every internal href in every generated page and verifies it
 * resolves to a file in dist (directory routes → index.html). Anchor fragments
 * on linked pages are checked too. State fragments such as #at=period are
 * navigation state rather than element identifiers.
 *
 * Exit code is 1 when a linked file or checked anchor does not resolve.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(SITE, 'dist');

if (!fs.existsSync(DIST)) {
  console.error('dist/ does not exist — run `npm run build` first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

const allFiles = walk(DIST);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
const distSet = new Set(allFiles.map((f) => path.relative(DIST, f).split(path.sep).join('/')));

const HREF_RE = /(?:href|src)="([^"]*)"/g;
const ID_RE = /\sid="([^"]*)"/g;

/** id sets, lazily parsed per page. */
const idCache = new Map();
function idsOf(relFile) {
  if (idCache.has(relFile)) return idCache.get(relFile);
  const abs = path.join(DIST, relFile);
  const set = new Set();
  if (fs.existsSync(abs)) {
    const html = fs.readFileSync(abs, 'utf8');
    let m;
    ID_RE.lastIndex = 0;
    while ((m = ID_RE.exec(html)) !== null) set.add(m[1].normalize('NFC'));
  }
  idCache.set(relFile, set);
  return set;
}

const broken = [];
const staleAnchors = [];
let internal = 0;
let external = 0;
const pageSizes = [];

for (const file of htmlFiles) {
  const relFile = path.relative(DIST, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  pageSizes.push({ page: relFile, bytes: Buffer.byteLength(html) });

  let m;
  HREF_RE.lastIndex = 0;
  while ((m = HREF_RE.exec(html)) !== null) {
    const href = m[1];
    if (!href || href.startsWith('#') || href.startsWith('data:')) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) {
      external++;
      continue;
    }
    if (!href.startsWith('/')) continue; // no relative hrefs are emitted
    internal++;

    const [rawPath, rawFrag = ''] = href.split('#');
    const clean = rawPath.split('?')[0];
    let target = clean.replace(/^\//, '');
    if (target === '' || target.endsWith('/')) target += 'index.html';

    if (!distSet.has(target)) {
      broken.push({ from: relFile, href, resolved: target });
      continue;
    }
    /* `#key=value` is a *state* fragment, not an element id — the road reads
       `/#at=<period-slug>` to open at an age (BRIEF v4 §4 W3d). Checking it
       against the page's ids would report every one of them as stale and bury
       the real ones. Only bare fragments are element references. */
    const isStateFragment = rawFrag.includes('=');

    if (rawFrag && !isStateFragment && target.endsWith('.html')) {
      let frag = rawFrag;
      try {
        frag = decodeURIComponent(rawFrag);
      } catch {
        /* keep raw */
      }
      const ids = idsOf(target);
      if (!ids.has(frag.normalize('NFC')) && !ids.has(rawFrag.normalize('NFC'))) {
        staleAnchors.push({ from: relFile, href });
      }
    }
  }
}

const totalBytes = allFiles.reduce((a, f) => a + fs.statSync(f).size, 0);
const htmlBytes = pageSizes.reduce((a, p) => a + p.bytes, 0);
pageSizes.sort((a, b) => b.bytes - a.bytes);

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

console.log('--- dist ---');
console.log(`pages          ${htmlFiles.length}`);
console.log(`files          ${allFiles.length}`);
console.log(`dist size      ${mb(totalBytes)} (html ${mb(htmlBytes)})`);
console.log(`internal hrefs ${internal.toLocaleString('en')}`);
console.log(`external hrefs ${external.toLocaleString('en')}`);
console.log(`broken hrefs   ${broken.length}`);
console.log(`stale anchors  ${staleAnchors.length}`);
console.log('--- largest pages ---');
for (const p of pageSizes.slice(0, 10)) console.log(`  ${kb(p.bytes).padStart(8)}  ${p.page}`);

if (broken.length) {
  console.log('--- broken ---');
  for (const b of broken.slice(0, 60)) console.log(`  ${b.from} -> ${b.href}`);
  if (broken.length > 60) console.log(`  … and ${broken.length - 60} more`);
}
if (staleAnchors.length) {
  const shown = staleAnchors.slice(0, 30);
  console.log('--- stale anchor fragments ---');
  for (const s of shown) console.log(`  ${s.from} -> ${s.href}`);
  if (staleAnchors.length > shown.length) console.log(`  … and ${staleAnchors.length - shown.length} more`);
}

process.exit(broken.length || staleAnchors.length ? 1 : 0);
