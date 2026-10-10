#!/usr/bin/env node
/**
 * graph.mjs — prebuild pass over the corpus.
 *
 * Writes (all gitignored, all rebuilt by `npm run generate`):
 *   src/generated/graph.json          the whole navigation/metadata graph
 *   src/generated/link-previews.json  {route: {title, dek, period}} for hover cards
 *   src/generated/stats.json          live file/word/event totals (R1 §9.9)
 *
 * Nothing here reads data/catalog.json: its counts are stale and it includes
 * media/ (R1 §1, §9.9). Everything is recomputed from the filesystem.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXCLUDED_PATHS,
  PERIOD_BY_NAME,
  PERIOD_LABEL,
  SECTION_LABELS,
  SECTION_ORDER,
  ROOT_ROUTES,
  SECTION_SLUGS,
  canonicalPath,
  dirToRoute,
  pathToRoute,
  resolveLink,
  sectionOf,
} from '../src/lib/routes.ts';
import { TAG_RE } from '../src/lib/tags.ts';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const ROOT = path.resolve(SITE, '..');
const OUT = path.join(SITE, 'src', 'generated');

const PUBLIC_DIRS = new Set([...SECTION_ORDER, 'timeline']);
const WORDS_PER_MINUTE = 220;

// ---------------------------------------------------------------- filesystem

function walk(dir = '', out = []) {
  const abs = path.join(ROOT, dir);
  for (const ent of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (ent.name.startsWith('.')) continue;
    const rel = dir ? `${dir}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (!dir && !PUBLIC_DIRS.has(rel)) continue;
      walk(rel, out);
    } else if (ent.name.endsWith('.md') && (dir || Object.hasOwn(ROOT_ROUTES, rel))) {
      out.push(rel);
    }
  }
  return out;
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---------------------------------------------------------------- extraction

/**
 * Trailing parentheticals that describe the *file* rather than the subject.
 * The corpus is authored as a repository, and a handful of its H1s end on a
 * note to whoever is filing it — "(folder hub)", "(index)", "(stub)". Those
 * become the page's visible subtitle under the H1, where they read as a CMS
 * label that leaked into the copy. Almost every other parenthetical on a title
 * is real content ("(Mahākalpa)", "(The Subterranean Paradises)"), so this is
 * an explicit list, not a rule about brackets.
 */
const FILING_NOTES =
  /\s*\((?:folder\s+hub|folder|hub|index|index\s+only|stub|placeholder|draft|wip|todo|tbd)\)\s*$/i;

/** Mirrors `h1()` in tools/repo_tools.py: strip bold and reduce links to text. */
function h1(text, fallback) {
  for (const line of text.split('\n')) {
    if (line.startsWith('# ')) {
      return line
        .slice(2)
        .trim()
        .replace(/\*\*?/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(FILING_NOTES, '')
        .trim();
    }
  }
  return fallback;
}

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function stripInline(s) {
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/__([^_]*)__/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateDek(s) {
  if (s.length <= 280) return s;
  const cut = s.slice(0, 280);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 200 ? cut.slice(0, sp) : cut).replace(/[,;:—–-]$/, '').trim()}…`;
}

/** A dek should never carry a raw reliability-tag bracket or end on a bare
    path — those are apparatus, not prose. dekOf's output is a plain string
    (used for `<meta description>`, the section-index line and the
    link-preview card), never passed through rehype-corpus's markTags, so an
    allowlisted `[scholarly]` etc. left in place would just print as a
    literal bracket wherever the dek is shown. Reuses rehype-corpus's own
    TAG_RE so the two never drift on what counts as a tag. */
function tidyDek(s) {
  return s
    .replace(new RegExp(TAG_RE.source, 'g'), '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*\[[^[\]]{1,60}\]\s*$/, '')
    .replace(/\s*\([^()]*\.md\)\s*$/, '')
    .trim();
}

/** Fallback 1: the leading blockquote's own prose, links resolved to their
    text and bare corpus paths dropped — used when the file opens straight
    into a blockquote apparatus block with no ordinary paragraph after it. */
function blockquoteDek(text) {
  const lines = text.split('\n');
  const buf = [];
  let started = false;
  for (const line of lines) {
    if (line.startsWith('>')) {
      started = true;
      buf.push(line.slice(1).trim());
    } else if (started) break;
  }
  if (!buf.length) return '';
  const joined = buf
    .join(' ')
    .replace(/`[^`]*\.md[^`]*`/g, '')
    .replace(/`([^`]*)`/g, '$1');
  return stripInline(joined);
}

/** Fallback 2: the first `**Name** — text` entry bullet in the file. */
function firstLeadBulletDek(text) {
  const m = /^\s*[-*+]\s+\*\*([^*]+)\*\*\s*[—–-]\s+(.+)$/m.exec(text);
  return m ? stripInline(`${m[1]} — ${m[2]}`) : '';
}

/** First non-blockquote paragraph, as plain text, ≤ 280 chars. Falls back to
    the leading blockquote's prose, then the first lead-bullet entry, then
    (at the call site, where the section is known) the section label — 29%
    of the corpus has no ordinary opening paragraph at all, and used to ship
    with no dek, no meta description and no og:description as a result. */
function dekOf(text) {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].startsWith('# ')) i++;
  i++;
  const buf = [];
  for (; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!buf.length) {
      if (!t) continue;
      // A list bullet (`- `, `* `, `+ `) is skipped, but `**Bold** …` prose
      // starting a paragraph is not — the old `-|\*` test caught both.
      if (/^([>#|]|[-*+]\s|<!--|---|===)/.test(t)) continue;
      if (t.startsWith('[')) continue; // plain link-line breadcrumb (5 files)
      buf.push(t);
    } else {
      if (!t) break;
      buf.push(t);
    }
  }
  let out = stripInline(buf.join(' '));
  if (!out) out = blockquoteDek(text);
  if (!out) out = firstLeadBulletDek(text);
  return truncateDek(tidyDek(out));
}

/** The links inside the file's first blockquote block. */
function firstBlockquoteLinks(text) {
  const lines = text.split('\n');
  const out = [];
  let started = false;
  for (const line of lines) {
    if (line.startsWith('>')) {
      started = true;
      let m;
      LINK_RE.lastIndex = 0;
      while ((m = LINK_RE.exec(line)) !== null) out.push(m[1]);
    } else if (started && line.trim() === '') {
      break;
    } else if (started) {
      break;
    }
  }
  return out;
}

/** `01-manvantaras/...` path → the cosmic period it stands for. */
function manvantaraPeriod(p) {
  if (!p.startsWith('01-manvantaras/')) return null;
  if (p.includes('04-kali-yuga')) return p.includes('recorded-history') ? 'kali-yuga-history' : 'kali-yuga-scriptural';
  if (p.includes('03-dvapara-yuga')) return 'dvapara-yuga';
  if (p.includes('02-treta-yuga')) return 'treta-yuga';
  if (p.includes('01-satya-yuga')) return 'satya-yuga';
  if (/manvantara-0[1-6]/.test(p)) return 'earlier-manvantaras';
  if (/manvantara-(0[89]|1[0-4])/.test(p)) return 'future-manvantaras';
  return null;
}

/**
 * The root apparatus files' own H1s are written for an agent reading the
 * repo, not a site visitor — AGENTS.md opens "AGENTS.md — How to Query *The
 * Hindu Timeline*", which is meaningless as a page title, an H1, or (worse)
 * the link text every other page uses to point at it. routes.ts already
 * gives these files bespoke routes for the same reason; this gives the ones
 * that need it a bespoke title to go with the route.
 */
const TITLE_OVERRIDES = {
  'AGENTS.md': 'About the manuscript',
};

// ---------------------------------------------------------------------- main

const files = walk();
const routed = files.filter((f) => pathToRoute(f) !== null && !EXCLUDED_PATHS.has(f));

const texts = new Map();
for (const f of routed) texts.set(f, read(f));

const nodes = {};
let totalWords = 0;

for (const f of routed) {
  const text = texts.get(f);
  const words = text.split(/\s+/).filter(Boolean).length;
  totalWords += words;
  const section = sectionOf(f);
  const sectionLabel = SECTION_LABELS[section] ?? section;
  const isIndex = path.basename(f) === 'README.md';
  nodes[f] = {
    path: f,
    route: pathToRoute(f),
    title: TITLE_OVERRIDES[f] ?? h1(text, path.basename(f, '.md')),
    // Fallback 3 (section label) lives here, not in dekOf, because dekOf has
    // no notion of section — see its own doc comment for fallbacks 1 and 2.
    dek: dekOf(text) || sectionLabel,
    section,
    sectionSlug: SECTION_SLUGS[section] ?? null,
    sectionLabel,
    isIndex,
    dir: f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '',
    parentRoute: null,
    parentPath: null,
    order: 0,
    prev: null,
    next: null,
    children: [],
    backlinks: { routes: [], total: 0 },
    eventCount: 0,
    periods: {},
    cosmicAddress: null,
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  };
}

// --- parents -----------------------------------------------------------------
for (const f of routed) {
  const n = nodes[f];
  if (f === 'README.md') continue;
  if (!f.includes('/')) {
    n.parentPath = 'README.md';
    n.parentRoute = '/';
    continue;
  }
  // The nine period files hang off the clock hub, not off the repo root.
  if (n.section === 'timeline') {
    n.parentPath = 'TIMELINE.md';
    n.parentRoute = '/clock/';
    continue;
  }
  const dir = n.dir;
  if (n.isIndex) {
    const up = dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : '';
    n.parentPath = up ? `${up}/README.md` : 'README.md';
  } else {
    n.parentPath = `${dir}/README.md`;
  }
  // `timeline/`, `04-deep-dives/stotras/` and `90-literature-corpus/vedas/brahmanas/`
  // have no README — climb to the nearest directory that does.
  let climb = n.parentPath;
  while (climb && !nodes[climb]) {
    const d = climb.slice(0, climb.lastIndexOf('/README.md'));
    const up = d.includes('/') ? d.slice(0, d.lastIndexOf('/')) : '';
    climb = up ? `${up}/README.md` : 'README.md';
  }
  n.parentPath = climb ?? 'README.md';
  n.parentRoute = nodes[n.parentPath]?.route ?? '/';
}

// A child that sits in a README-less subdirectory keeps that folder as a group.
for (const f of routed) {
  const n = nodes[f];
  n.subdir = null;
  if (n.isIndex || !n.parentPath) continue;
  const parentDir = n.parentPath === 'README.md' ? '' : n.parentPath.slice(0, n.parentPath.lastIndexOf('/'));
  if (n.dir !== parentDir) n.subdir = parentDir ? n.dir.slice(parentDir.length + 1) : n.dir;
}

// --- children, in each README's own link order -------------------------------
const childrenOf = new Map(); // dir -> [paths]
for (const f of routed) {
  const n = nodes[f];
  if (f === 'README.md') continue;
  const parent = n.parentPath;
  if (!parent) continue;
  const list = childrenOf.get(parent) ?? [];
  list.push(f);
  childrenOf.set(parent, list);
}

/** Order children by first appearance in the parent README's links. */
function orderChildren(parentPath, kids) {
  const text = texts.get(parentPath) ?? '';
  const seen = new Map();
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    const r = resolveLink(parentPath, m[1]);
    if (r.kind !== 'internal') continue;
    if (!seen.has(r.target)) seen.set(r.target, seen.size);
  }
  const pathIndex = new Map(kids.map((k, i) => [k, i]));
  return [...kids].sort((a, b) => {
    const oa = seen.has(a) ? seen.get(a) : 100000 + pathIndex.get(a);
    const ob = seen.has(b) ? seen.get(b) : 100000 + pathIndex.get(b);
    if (oa !== ob) return oa - ob;
    return a < b ? -1 : 1;
  });
}

for (const [parentPath, kids] of childrenOf) {
  const ordered = orderChildren(parentPath, kids);
  nodes[parentPath].children = ordered;
  ordered.forEach((child, i) => {
    nodes[child].order = i;
    nodes[child].prev = i > 0 ? nodes[ordered[i - 1]].route : null;
    nodes[child].next = i < ordered.length - 1 ? nodes[ordered[i + 1]].route : null;
  });
}

// --- links & backlinks -------------------------------------------------------
const backlinks = new Map(); // targetPath -> Set(fromPath)
let internalLinks = 0;
let unresolvedLinks = 0;
for (const f of routed) {
  const text = texts.get(f);
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    const r = resolveLink(f, m[1]);
    if (r.kind === 'unresolved') unresolvedLinks++;
    if (r.kind !== 'internal') continue;
    internalLinks++;
    if (r.target === f) continue;
    if (!backlinks.has(r.target)) backlinks.set(r.target, new Set());
    backlinks.get(r.target).add(f);
  }
}
for (const [target, sources] of backlinks) {
  if (!nodes[target]) continue;
  const list = [...sources]
    .filter((s) => nodes[s])
    .sort((a, b) => (nodes[a].title < nodes[b].title ? -1 : 1));
  nodes[target].backlinks = {
    routes: list.slice(0, 40).map((s) => nodes[s].route),
    total: list.length,
  };
}

// --- events ------------------------------------------------------------------
let events = [];
const eventsPath = path.join(ROOT, 'data', 'events.jsonl');
if (fs.existsSync(eventsPath)) {
  events = fs
    .readFileSync(eventsPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}
for (const ev of events) {
  const target = ev.detail_file ? canonicalPath(ev.detail_file) : null;
  if (!target) continue;
  const node = nodes[target] ?? nodes[`${target.replace(/\/$/, '')}/README.md`];
  if (!node) continue;
  node.eventCount += 1;
  const slug = PERIOD_BY_NAME[ev.period];
  if (slug) node.periods[slug] = (node.periods[slug] ?? 0) + 1;
}

// --- cosmic address ----------------------------------------------------------
/*
 * 0. **authored**: a route named in a chapter's `stories` takes that
 *    chapter's period. `src/data/chapters.json` is written by hand against
 *    the corpus's own chronological files (`…/mahayuga-28-current/02-treta-yuga.md`
 *    and friends); every rule below it is an *inference* from links or from
 *    the events a page happens to cite, and the inference is wrong in places
 *    — the first four kāṇḍas of the Rāmāyaṇa came out as "Kali Yuga
 *    (scriptural)" because the Kali-yuga file is where the events that cite
 *    them live. Authored data beats inferred data, so this runs first and
 *    `WhereInTime` no longer has to override the graph at render time.
 *    Only `stories` counts: `covers` is a *sweep* prefix for the period
 *    page's leftovers, not a claim about where a page sits in time.
 */
const routeToPath = new Map();
for (const f of routed) routeToPath.set(nodes[f].route, f);
const normRoute = (r) => (!r ? '' : r.endsWith('/') ? r : `${r}/`);
let authoredAddresses = 0;
let authoredChanges = 0;
try {
  const chaptersFile = path.join(SITE, 'src', 'data', 'chapters.json');
  if (fs.existsSync(chaptersFile)) {
    const chapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf8'));
    for (const p of chapters?.periods ?? []) {
      const slug = typeof p?.slug === 'string' ? p.slug : '';
      if (!slug || !PERIOD_LABEL[slug]) continue;
      for (const ch of p?.chapters ?? []) {
        for (const route of ch?.stories ?? []) {
          const file = routeToPath.get(normRoute(route));
          if (!file) continue;
          const n = nodes[file];
          /* A route may be listed by several chapters — /cosmology/cosmogony-
             creation-accounts/ is in nine Before-Time chapters and one in
             Satya. `chapterOfRoute` (lib/chapters.ts) resolves that with
             "first in spine order wins", and it is the chapter the page
             actually *shows*. Letting the last writer win here made the strip
             read "Satya Yuga › A hymn asks a question" — a Before-Time
             chapter under a Satya pill. Same rule, so they cannot disagree. */
          if (n.cosmicAddressSource === 'chapter') continue;
          if (n.cosmicAddress && n.cosmicAddress !== slug) authoredChanges += 1;
          n.cosmicAddress = slug;
          n.cosmicAddressSource = 'chapter';
          authoredAddresses += 1;
        }
      }
    }
  }
} catch (err) {
  // A half-written chapters.json must never take the build down: fall back to
  // the inferred addresses, exactly as before.
  console.warn(`chapters.json unreadable — cosmic addresses left to inference (${err.message})`);
}

for (const f of routed) {
  const n = nodes[f];
  if (n.cosmicAddressSource === 'chapter') continue;
  // 1. explicit: a manvantara/yuga link in the file's opening blockquote
  for (const raw of firstBlockquoteLinks(texts.get(f))) {
    const r = resolveLink(f, raw);
    if (r.kind !== 'internal') continue;
    const period = manvantaraPeriod(r.target);
    if (period) {
      n.cosmicAddress = period;
      n.cosmicAddressSource = 'explicit';
      break;
    }
  }
  if (n.cosmicAddress) continue;
  // 2. the majority period of the events that point here
  const entries = Object.entries(n.periods);
  if (entries.length) {
    entries.sort((a, b) => b[1] - a[1]);
    if (entries[0][1] >= 2 || entries.length === 1) {
      n.cosmicAddress = entries[0][0];
      n.cosmicAddressSource = 'events';
    }
  }
}
// 3. inherited from the nearest ancestor that has one
for (const f of routed) {
  const n = nodes[f];
  if (n.cosmicAddress) continue;
  let cur = n.parentPath;
  const guard = new Set();
  while (cur && nodes[cur] && !guard.has(cur)) {
    guard.add(cur);
    if (nodes[cur].cosmicAddress) {
      n.cosmicAddress = nodes[cur].cosmicAddress;
      n.cosmicAddressSource = 'inherited';
      break;
    }
    cur = nodes[cur].parentPath;
  }
}

// --- sections ----------------------------------------------------------------
const sections = SECTION_ORDER.map((dir) => {
  const readme = `${dir}/README.md`;
  const count = routed.filter((f) => f.startsWith(`${dir}/`) && path.basename(f) !== 'README.md').length;
  return {
    dir,
    slug: SECTION_SLUGS[dir],
    label: SECTION_LABELS[dir],
    route: dirToRoute(dir),
    title: nodes[readme]?.title ?? SECTION_LABELS[dir],
    dek: nodes[readme]?.dek ?? '',
    count,
  };
});

// --- byRoute -----------------------------------------------------------------
const byRoute = {};
for (const f of routed) byRoute[nodes[f].route] = f;

const stats = {
  files: routed.length,
  contentFiles: routed.filter((f) => path.basename(f) !== 'README.md').length,
  words: totalWords,
  events: events.length,
  sections: sections.length,
  periods: Object.keys(PERIOD_LABEL).length,
  internalLinks,
  unresolvedLinks,
  generatedAt: new Date().toISOString(),
};

const linkPreviews = {};
for (const f of routed) {
  const n = nodes[f];
  linkPreviews[n.route] = { title: n.title, dek: n.dek, period: n.cosmicAddress };
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, 'graph.json'),
  `${JSON.stringify({ stats, sections, byRoute, nodes }, null, 0)}\n`,
);
fs.writeFileSync(path.join(OUT, 'link-previews.json'), `${JSON.stringify(linkPreviews)}\n`);
fs.writeFileSync(path.join(OUT, 'stats.json'), `${JSON.stringify(stats, null, 1)}\n`);

// Astro's content store caches rendered HTML keyed on the *file* digest only,
// so a change to the markdown pipeline would otherwise be invisible. Drop the
// store whenever a pipeline source is newer than it.
const pipeline = [
  'astro.config.mjs',
  'src/lib/remark-corpus.ts',
  'src/lib/rehype-corpus.ts',
  'src/lib/routes.ts',
  'src/lib/tags.ts',
  'src/content.config.ts',
]
  .map((p) => path.join(SITE, p))
  .filter((p) => fs.existsSync(p));
const newest = Math.max(...pipeline.map((p) => fs.statSync(p).mtimeMs));
for (const store of [
  path.join(SITE, 'node_modules', '.astro', 'data-store.json'),
  path.join(SITE, '.astro', 'data-store.json'),
]) {
  if (fs.existsSync(store) && fs.statSync(store).mtimeMs < newest) {
    fs.rmSync(store);
    console.log(`markdown pipeline changed — cleared ${path.relative(SITE, store)}`);
  }
}

const withAddress = routed.filter((f) => nodes[f].cosmicAddress).length;
console.log(
  `graph.json: ${routed.length} nodes · ${totalWords.toLocaleString()} words · ` +
    `${internalLinks.toLocaleString()} internal links · ${unresolvedLinks} unresolved · ` +
    `${withAddress} with a cosmic address · ${events.length} events`,
);
console.log(
  `  cosmic address from chapters.json: ${authoredAddresses} routes ` +
    `(${authoredChanges} of them corrected an inferred period)`,
);
