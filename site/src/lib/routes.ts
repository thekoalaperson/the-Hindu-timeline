/**
 * routes.ts — the single source of truth for corpus-path → site-route mapping.
 *
 * Pure functions only: no filesystem, no Astro imports. Used by the content
 * collection, the remark link rewriter, the prebuild scripts and the tests.
 *
 * Rules (PRODUCT-SPEC §2):
 *   - numbered section dirs map to clean segments (`04-deep-dives` → `stories`)
 *   - deeper path segments are preserved verbatim (numeric prefixes inside a
 *     section are ordinal and meaningful — keep them)
 *   - `README.md` maps to its directory's route
 *   - every route ends with `/`
 */

export const GITHUB_BLOB = 'https://github.com/thekoalaperson/the-Hindu-timeline/blob/main/';

/** Numbered corpus directory → clean URL segment. */
export const SECTION_SLUGS: Record<string, string> = {
  '00-time-and-cosmology': 'cosmology',
  '01-manvantaras': 'manvantaras',
  '02-deities-and-cosmic-hierarchy': 'deities',
  '03-lineages-vamsha': 'lineages',
  '04-deep-dives': 'stories',
  '05-concepts-and-dharma': 'dharma',
  '06-sacred-geography': 'places',
  '07-acharyas-and-sampradayas': 'teachers',
  '08-beings-and-bestiary': 'beings',
  '09-artifacts-symbols-and-arts': 'symbols',
  '90-literature-corpus': 'texts',
};

/** Clean URL segment → numbered corpus directory (inverse of SECTION_SLUGS). */
export const SLUG_SECTIONS: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_SLUGS).map(([dir, slug]) => [slug, dir]),
);

/** Human labels for the 11 sections, plus the pseudo-sections. */
export const SECTION_LABELS: Record<string, string> = {
  '00-time-and-cosmology': 'Time & Cosmology',
  '01-manvantaras': 'The Spine (Manvantaras)',
  '02-deities-and-cosmic-hierarchy': 'Deities',
  '03-lineages-vamsha': 'Lineages',
  '04-deep-dives': 'Stories',
  '05-concepts-and-dharma': 'Concepts & Dharma',
  '06-sacred-geography': 'Sacred Geography',
  '07-acharyas-and-sampradayas': 'Teachers',
  '08-beings-and-bestiary': 'Beings',
  '09-artifacts-symbols-and-arts': 'Objects, Symbols & Arts',
  '90-literature-corpus': 'The Texts',
  '(root)': 'The Hindu Timeline',
  timeline: 'The Cosmic Clock',
};

/** Reading order of the 11 sections (the numeric prefixes are the order). */
export const SECTION_ORDER: string[] = Object.keys(SECTION_SLUGS);

/** The 9 cosmic periods, in clock order. */
export const PERIODS: { slug: string; file: string; name: string; short: string }[] = [
  { slug: 'before-time', file: 'timeline/00-before-time.md', name: 'Before Time — Cosmogony & the First Creation', short: 'Before Time' },
  { slug: 'earlier-manvantaras', file: 'timeline/01-earlier-manvantaras.md', name: 'The Earlier Manvantaras (1–6) & Primordial Reigns', short: 'Earlier Manvantaras' },
  { slug: 'satya-yuga', file: 'timeline/02-satya-yuga.md', name: 'Satya (Kṛta) Yuga — current 28th Mahāyuga', short: 'Satya Yuga' },
  { slug: 'treta-yuga', file: 'timeline/03-treta-yuga.md', name: 'Tretā Yuga', short: 'Tretā Yuga' },
  { slug: 'dvapara-yuga', file: 'timeline/04-dvapara-yuga.md', name: 'Dvāpara Yuga', short: 'Dvāpara Yuga' },
  { slug: 'kali-yuga-scriptural', file: 'timeline/05-kali-yuga-scriptural.md', name: 'Kali Yuga — Scriptural & Prophetic', short: 'Kali Yuga (scriptural)' },
  { slug: 'kali-yuga-history', file: 'timeline/06-kali-yuga-history.md', name: 'Kali Yuga — Documented History', short: 'Kali Yuga (history)' },
  { slug: 'future-manvantaras', file: 'timeline/07-future-manvantaras.md', name: 'The Future Manvantaras (8–14) & the End', short: 'Future Manvantaras' },
  { slug: 'cross-yuga', file: 'timeline/08-cross-yuga.md', name: 'Cross-Yuga & Recurring Myths', short: 'Cross-Yuga' },
];

export const PERIOD_SLUGS: string[] = PERIODS.map((p) => p.slug);
export const PERIOD_BY_NAME: Record<string, string> = Object.fromEntries(PERIODS.map((p) => [p.name, p.slug]));
export const PERIOD_BY_FILE: Record<string, string> = Object.fromEntries(PERIODS.map((p) => [p.file, p.slug]));
export const PERIOD_LABEL: Record<string, string> = Object.fromEntries(PERIODS.map((p) => [p.slug, p.short]));

/** Root apparatus files that get bespoke routes. */
export const ROOT_ROUTES: Record<string, string> = {
  'README.md': '/',
  'AGENTS.md': '/about/',
  'SOURCES.md': '/sources/',
  'STRUCTURE.md': '/about/structure/',
  'TIMELINE.md': '/clock/',
};

/**
 * Paths that exist in the corpus but are NOT rendered as their own page.
 * `04-deep-dives/bhagavad-gita.md` is a 62-word redirect stub that collides
 * with the real `04-deep-dives/bhagavad-gita/` directory (R1 §8) — the
 * directory wins the clean URL and links to the stub resolve there too.
 */
export const EXCLUDED_PATHS = new Set(['04-deep-dives/bhagavad-gita.md']);

/** Only these paths belong to the public research corpus. */
export const PUBLIC_CORPUS_PATTERNS = [
  ...Object.keys(ROOT_ROUTES),
  ...SECTION_ORDER.map((section) => `${section}/**/*.md`),
  ...[...EXCLUDED_PATHS].map((file) => `!${file}`),
];

/** Corpus paths that are answered by a different file's page. */
export const PATH_ALIASES: Record<string, string> = {
  '04-deep-dives/bhagavad-gita.md': '04-deep-dives/bhagavad-gita/README.md',
};

/** Non-corpus top-level directories: no pages, links go to GitHub. */
export const NON_CORPUS_DIRS = new Set(['media', 'data', 'tools', 'site', 'autopilot']);

/** Normalise a possibly-messy relative path to a clean posix repo-relative path. */
export function normalizePath(p: string): string {
  const parts: string[] = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length && parts[parts.length - 1] !== '..') parts.pop();
      else parts.push('..');
    } else parts.push(seg);
  }
  return parts.join('/');
}

function posixDirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i === -1 ? '' : p.slice(0, i);
}

/** The top-level corpus directory a path belongs to (`(root)` for root files). */
export function sectionOf(repoRelPath: string): string {
  const p = normalizePath(repoRelPath);
  return p.includes('/') ? p.split('/')[0] : '(root)';
}

export function sectionLabel(section: string): string {
  return SECTION_LABELS[section] ?? section;
}

/**
 * Map a repo-relative markdown path to its site route (always trailing-slashed),
 * or `null` when the path is not part of the routed corpus.
 */
export function canonicalPath(repoRelPath: string): string {
  const p = normalizePath(repoRelPath);
  return PATH_ALIASES[p] ?? p;
}

export function pathToRoute(repoRelPath: string): string | null {
  const p = canonicalPath(repoRelPath);
  if (!p) return null;

  if (Object.hasOwn(ROOT_ROUTES, p)) return ROOT_ROUTES[p];
  if (Object.hasOwn(PERIOD_BY_FILE, p)) return `/clock/${PERIOD_BY_FILE[p]}/`;

  const segs = p.split('/');
  const sectionDir = segs[0];
  const slug = SECTION_SLUGS[sectionDir];
  if (!slug) return null;

  const rest = segs.slice(1);
  if (rest.length && rest[rest.length - 1] === 'README.md') rest.pop();
  else if (rest.length) {
    const last = rest[rest.length - 1];
    if (!last.endsWith('.md')) return null;
    rest[rest.length - 1] = last.slice(0, -3);
  }
  return `/${[slug, ...rest].join('/')}/`;
}

/** Route for a corpus *directory* (its README.md page). */
export function dirToRoute(repoRelDir: string): string | null {
  const d = normalizePath(repoRelDir);
  if (!d) return '/';
  return pathToRoute(`${d}/README.md`);
}

export type ResolvedLink =
  | { kind: 'internal'; href: string; target: string }
  | { kind: 'external'; href: string }
  | { kind: 'anchor'; href: string }
  | { kind: 'unresolved'; href: string };

export function isExternalHref(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^(?:mailto|tel):/i.test(href);
}

/**
 * Resolve a markdown link written inside `fromPath` (a repo-relative .md path)
 * to a site URL. Handles `../x.md`, `./x.md`, `x.md`, directory links with or
 * without a trailing slash, and `file.md#frag` (fragment preserved).
 */
export function resolveLink(fromPath: string, target: string): ResolvedLink {
  if (!target) return { kind: 'unresolved', href: target };
  if (isExternalHref(target)) return { kind: 'external', href: target };
  if (target.startsWith('#')) return { kind: 'anchor', href: target };

  const hashAt = target.indexOf('#');
  const rawPath = hashAt === -1 ? target : target.slice(0, hashAt);
  const frag = hashAt === -1 ? '' : target.slice(hashAt);
  if (!rawPath) return { kind: 'anchor', href: frag || target };

  const decoded = rawPath.replace(/%20/g, ' ');
  const base = posixDirname(normalizePath(fromPath));
  const resolved = normalizePath(base ? `${base}/${decoded}` : decoded);

  // `../` from a section file lands on the repo root — that is the home page.
  if (!resolved) return { kind: 'internal', href: `/${frag}`, target: 'README.md' };
  // `timeline/` as a directory link is the clock hub.
  if (resolved === 'timeline') return { kind: 'internal', href: `/clock/${frag}`, target: 'TIMELINE.md' };

  // The film engine and the machine-readable / tooling layer have no pages.
  if (NON_CORPUS_DIRS.has(resolved.split('/')[0])) {
    return { kind: 'external', href: GITHUB_BLOB + resolved.replace(/\/$/, '') };
  }
  if (!resolved.endsWith('.md') && /\.[a-z0-9]+$/i.test(resolved)) {
    return { kind: 'external', href: GITHUB_BLOB + resolved };
  }

  const canonical = canonicalPath(resolved);
  const route = canonical.endsWith('.md')
    ? pathToRoute(canonical)
    : dirToRoute(canonical.replace(/\/$/, ''));

  if (!route) return { kind: 'unresolved', href: target };
  return { kind: 'internal', href: route + frag, target: canonical.endsWith('.md') ? canonical : `${canonical.replace(/\/$/, '')}/README.md` };
}

/** Fold diacritics (NFD, strip combining marks) for search/sort keys. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();
}

/**
 * A handful of common names romanize their retroflex/palatal consonants as
 * digraphs in plain English (ś/ṣ → "sh", ṛ → "ri") rather than as the single
 * base letter a diacritic strip produces, so `fold()` alone leaves e.g.
 * "Krishna" (→ "krishna") and "Kṛṣṇa" (→ "krsna") as two different keys.
 * This maps the ASCII spelling's fold to the IAST spelling's fold so callers
 * that need the two to collapse (the period-page actor filter, search) can.
 * Pairs that already collapse under plain NFD-stripping (rama/rāma,
 * sita/sītā, ravana/rāvaṇa, hanuman/hanumān, arjuna, draupadi/draupadī,
 * karna/karṇa, parvati/pārvatī, durga/durgā, kali/kālī, brahma/brahmā, indra,
 * surya/sūrya) need no entry here — they are listed in the design note only.
 */
const NAME_ALIASES: Record<string, string> = {
  krishna: 'krsna',
  shiva: 'siva',
  vishnu: 'visnu',
  ganesha: 'ganesa',
  lakshmi: 'laksmi',
  bhishma: 'bhisma',
};

/** `fold()`, then merge the common transliteration aliases above. */
export function foldName(s: string): string {
  const base = fold(s);
  return NAME_ALIASES[base] ?? base;
}

/**
 * Split a corpus `Title — Subtitle` heading on its first em/en dash so a
 * template can render the title and subtitle as two separate lines instead
 * of letting the H1 wrap with a dash opening the second line. Titles with no
 * dash return `[title, null]` unchanged.
 */
export function splitTitle(title: string): [string, string | null] {
  const m = /^(.*?)\s+[—–]\s+(.+)$/.exec(title);
  return m ? [m[1], m[2]] : [title, null];
}
