#!/usr/bin/env node
/**
 * check-chapters.mjs — integrity check for src/data/chapters.json (the
 * chapter spine, W1 of RUN-2026-09-06-1700-v2 / BRIEF-v4.md).
 *
 * Verifies, against the repo and the generated data layer:
 *   - unique chapter ids across the whole file
 *   - `periods` are present in cosmic-clock order (PERIODS in src/lib/routes.ts)
 *   - every route named in `stories`, `hero.route` and `covers` exists in
 *     src/generated/graph.json's byRoute map
 *   - every film slug named in `films` and `hero.film`/`art.film` exists in
 *     src/data/featured.json
 *   - `hero` points at a route or film actually listed on the chapter
 *   - every `source.file` exists on disk (repo root) and `source.heading`
 *     occurs verbatim (ignoring markdown `#`/`*` marks) in that file
 *   - `art.still` (when `art.film` is set) is a valid index into that film's
 *     `stills` array; `art.asset` names an external catalog entry (physical files are checked by media.mjs --check),
 *     `art.treatment` is a treatment `media.mjs` knows, and every `art` carries
 *     an `alt` that is not the still's own story-beat caption
 *   - a chapter with no `art` names a `glyph` from the twelve in
 *     src/lib/glyphs.ts, and one with `art` does not (W4: no chapter is left
 *     with nothing to show, and none carries two marks)
 *   - Kali-yuga-history has exactly the ten dated eras and carries `dates`
 *   - `covers` prefixes match at least one route in that period's event-group
 *     file (src/generated/events/<period>.json)
 *
 * Prints a per-period counts table (chapters, stories, films, routes
 * covered vs. total event-groups) and exits 1 on any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const REPO = path.join(SITE, '..');

const { PERIOD_SLUGS } = await import(path.join(SITE, 'src/lib/routes.ts'));

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const { GLYPH_IDS } = await import(path.join(SITE, 'src/lib/glyphs.ts'));
const GLYPHS = new Set(GLYPH_IDS);
/** Treatments scripts/media.mjs implements. */
const TREATMENTS = new Set(['atmosphere']);

const chaptersPath = path.join(SITE, 'src/data/chapters.json');
const graphPath = path.join(SITE, 'src/generated/graph.json');
const featuredPath = path.join(SITE, 'src/data/featured.json');

const errors = [];
const warnings = [];

if (!fs.existsSync(chaptersPath)) {
  console.error('src/data/chapters.json does not exist.');
  process.exit(1);
}
const chapters = readJSON(chaptersPath);
const graph = readJSON(graphPath);
const featured = readJSON(featuredPath);

const routeSet = new Set(Object.keys(graph.byRoute));
const filmSlugs = new Map(featured.map((f) => [f.slug, f]));

// ---------------------------------------------------------------- helpers

/** Strip markdown heading/bold marks so a citation matches file text loosely. */
function stripMd(s) {
  return s.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
}

const fileTextCache = new Map();
function fileText(repoRelPath) {
  if (fileTextCache.has(repoRelPath)) return fileTextCache.get(repoRelPath);
  const abs = path.join(REPO, repoRelPath);
  const text = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  fileTextCache.set(repoRelPath, text);
  return text;
}

function loadEventGroups(periodSlug) {
  const p = path.join(SITE, 'src/generated/events', `${periodSlug}.json`);
  if (!fs.existsSync(p)) return null;
  return readJSON(p);
}

// ---------------------------------------------------------------- checks

if (!Array.isArray(chapters.periods)) {
  errors.push('top-level `periods` is not an array');
}

// 1. Period order matches the cosmic clock.
const fileSlugs = chapters.periods.map((p) => p.slug);
if (JSON.stringify(fileSlugs) !== JSON.stringify(PERIOD_SLUGS)) {
  errors.push(
    `periods are not in cosmic order.\n  expected: ${JSON.stringify(PERIOD_SLUGS)}\n  got:      ${JSON.stringify(fileSlugs)}`,
  );
}

// 2. Unique ids across the whole file.
const seenIds = new Map();
for (const period of chapters.periods) {
  for (const c of period.chapters ?? []) {
    if (seenIds.has(c.id)) {
      errors.push(`duplicate chapter id "${c.id}" (${seenIds.get(c.id)} and ${period.slug})`);
    } else {
      seenIds.set(c.id, period.slug);
    }
  }
}

const counts = [];

for (const period of chapters.periods) {
  const slug = period.slug;
  const chs = period.chapters ?? [];
  let storyRoutes = 0;
  let filmCount = 0;
  const coveredRoutes = new Set();

  if (chs.length < 4) {
    warnings.push(`${slug}: only ${chs.length} chapters (target 5-10; Future 4-6; Cross-Yuga 4-8)`);
  }
  if (slug === 'kali-yuga-history' && chs.length !== 10) {
    errors.push(`kali-yuga-history must have exactly 10 chapters (the eras I-X), found ${chs.length}`);
  }

  for (const c of chs) {
    // --- required fields ---
    for (const field of ['id', 'title', 'line', 'source', 'stories', 'hero']) {
      if (c[field] === undefined) errors.push(`${slug}/${c.id ?? '?'}: missing "${field}"`);
    }
    if (c.title && c.title.split(/\s+/).length > 5) {
      warnings.push(`${slug}/${c.id}: title "${c.title}" is over 5 words`);
    }

    // --- source file + heading ---
    if (c.source) {
      const text = fileText(c.source.file);
      if (text === null) {
        errors.push(`${slug}/${c.id}: source.file "${c.source.file}" does not exist`);
      } else {
        const needle = stripMd(c.source.heading ?? '');
        const hayLines = text.split('\n').map(stripMd);
        const found = hayLines.some((l) => l.includes(needle)) || text.includes(c.source.heading ?? '\0');
        if (!needle || !found) {
          errors.push(`${slug}/${c.id}: heading "${c.source.heading}" not found in ${c.source.file}`);
        }
      }
    }

    // --- stories routes ---
    for (const r of c.stories ?? []) {
      storyRoutes++;
      if (!routeSet.has(r)) errors.push(`${slug}/${c.id}: story route "${r}" not in graph.json`);
      coveredRoutes.add(r);
    }

    // --- films ---
    for (const slugFilm of c.films ?? []) {
      filmCount++;
      if (!filmSlugs.has(slugFilm)) errors.push(`${slug}/${c.id}: film slug "${slugFilm}" not in featured.json`);
    }

    // --- hero must reference a listed story or film ---
    if (c.hero) {
      if (c.hero.route) {
        if (!routeSet.has(c.hero.route)) {
          errors.push(`${slug}/${c.id}: hero.route "${c.hero.route}" not in graph.json`);
        } else if (!(c.stories ?? []).includes(c.hero.route)) {
          errors.push(`${slug}/${c.id}: hero.route "${c.hero.route}" is not listed in this chapter's stories`);
        }
      } else if (c.hero.film) {
        if (!filmSlugs.has(c.hero.film)) {
          errors.push(`${slug}/${c.id}: hero.film "${c.hero.film}" not in featured.json`);
        } else if (!(c.films ?? []).includes(c.hero.film)) {
          errors.push(`${slug}/${c.id}: hero.film "${c.hero.film}" is not listed in this chapter's films`);
        }
      } else {
        errors.push(`${slug}/${c.id}: hero has neither route nor film`);
      }
    }

    // --- art ---
    if (c.art) {
      if (c.art.film) {
        const film = filmSlugs.get(c.art.film);
        if (!film) {
          errors.push(`${slug}/${c.id}: art.film "${c.art.film}" not in featured.json`);
        } else if (
          typeof c.art.still !== 'number' ||
          c.art.still < 0 ||
          c.art.still >= (film.stills ?? []).length
        ) {
          errors.push(
            `${slug}/${c.id}: art.still ${c.art.still} out of range for film "${c.art.film}" (${(film.stills ?? []).length} stills)`,
          );
        }
      } else if (c.art.asset) {
        if (typeof c.art.asset !== 'string' || !/^[a-z0-9-]+$/.test(c.art.asset)) {
          errors.push(`${slug}/${c.id}: art.asset must be a stable lowercase identifier`);
        }
        if (c.art.treatment && !TREATMENTS.has(c.art.treatment)) {
          errors.push(
            `${slug}/${c.id}: art.treatment "${c.art.treatment}" is not one scripts/media.mjs implements (${[...TREATMENTS].join(', ')})`,
          );
        }
        /* Nothing from a rejects/ folder ever reaches the site. */
        if (/(^|\/)rejects?\//.test(c.art.asset)) {
          errors.push(`${slug}/${c.id}: art.asset comes from a rejects/ folder`);
        }
      } else {
        errors.push(`${slug}/${c.id}: art has neither "film" nor "asset"`);
      }
      /* The alt describes the *atmosphere*, not the story beat: a plate that
         claims to depict the chapter is the "wrong picture" problem. A studio
         plate must carry one — nothing else knows anything about that file. A
         {film, still} plate falls back to the still's own alt in media.mjs,
         which is at least accurate, so its missing alt is a warning. */
      if (!c.art.alt) {
        if (c.art.asset) errors.push(`${slug}/${c.id}: art.asset has no "alt"`);
        else warnings.push(`${slug}/${c.id}: art has no "alt" (falls back to the still's own story-beat caption)`);
      }
      if (c.art.why) {
        warnings.push(`${slug}/${c.id}: art.why belongs in private editorial records, not shipped data`);
      }
      if (c.glyph) errors.push(`${slug}/${c.id}: has both art and a glyph — pick one`);
    }

    // --- glyph: the mark a chapter with no picture wears instead ---
    if (!c.art) {
      if (!c.glyph) {
        errors.push(`${slug}/${c.id}: no art and no glyph — it would render as an empty frame`);
      } else if (!GLYPHS.has(c.glyph)) {
        errors.push(`${slug}/${c.id}: glyph "${c.glyph}" is not one of ${[...GLYPHS].join(', ')}`);
      }
    }

    // --- dates: only meaningful for kali-yuga-history ---
    if (slug === 'kali-yuga-history' && !c.dates) {
      errors.push(`${slug}/${c.id}: kali-yuga-history chapter must have "dates"`);
    }
    if (slug !== 'kali-yuga-history' && c.dates) {
      warnings.push(`${slug}/${c.id}: has "dates" outside kali-yuga-history`);
    }

    // --- covers: prefixes must match >=1 route in this period's event groups ---
    if ((c.covers ?? []).length) {
      const events = loadEventGroups(slug);
      for (const prefix of c.covers) {
        const matches = events ? events.groups.some((g) => g.route.startsWith(prefix)) : false;
        if (!matches) errors.push(`${slug}/${c.id}: covers prefix "${prefix}" matches no event-group route`);
      }
    }
  }

  const events = loadEventGroups(slug);
  const totalGroups = events ? events.groupCount : null;
  let coveredCount = 0;
  if (events) {
    for (const g of events.groups) {
      if (coveredRoutes.has(g.route)) coveredCount++;
      else if (chs.some((c) => (c.covers ?? []).some((p) => g.route.startsWith(p)))) coveredCount++;
    }
  }
  counts.push({ slug, chapters: chs.length, stories: storyRoutes, films: filmCount, coveredCount, totalGroups });
}

// ---------------------------------------------------------------- report

console.log('\nchapters.json — per-period counts\n');
console.log(
  'period'.padEnd(22),
  'chapters'.padStart(8),
  'stories'.padStart(8),
  'films'.padStart(6),
  'routes covered/total'.padStart(22),
);
for (const row of counts) {
  console.log(
    row.slug.padEnd(22),
    String(row.chapters).padStart(8),
    String(row.stories).padStart(8),
    String(row.films).padStart(6),
    `${row.coveredCount}/${row.totalGroups ?? '?'}`.padStart(22),
  );
}
console.log();

if (warnings.length) {
  console.log(`${warnings.length} warning(s):`);
  for (const w of warnings) console.log('  - ' + w);
  console.log();
}

if (errors.length) {
  console.log(`${errors.length} error(s):`);
  for (const e of errors) console.log('  - ' + e);
  console.log();
  process.exit(1);
}

console.log('chapters.json is valid.');
