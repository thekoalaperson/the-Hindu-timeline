/**
 * chapters.ts — the middle layer of the one hierarchy: Age → **Chapter** →
 * Story → Event (BRIEF v4 §3.1).
 *
 * `src/data/chapters.json` is authored data (lane R5 writes the full nine
 * periods; L2 shipped a Tretā/Dvāpara stub so the mechanism could be built and
 * measured first). This module is the only place that reads it, and it is
 * deliberately total: **every** function tolerates a period with no chapters,
 * a route that belongs to no chapter, an unknown film slug and a malformed
 * entry, and returns `null` / `[]` rather than throwing. A data file that is
 * half-written must never take the site down.
 *
 * Route matching is two-pass, most specific first:
 *   1. `stories[]` — an exact route the editor put in the chapter by hand.
 *   2. `covers[]`  — route *prefixes* that sweep up the rest of an age's
 *      event-groups. The longest matching prefix wins, so
 *      `/stories/mahabharata/07-drona-parva/` in one chapter's covers beats
 *      `/stories/mahabharata/` in another's.
 */
import media from '../generated/media-manifest.json' with { type: 'json' };
import raw from '../data/chapters.json' with { type: 'json' };
import { getFilm, type Film } from './films.ts';
import { glyphId, type GlyphId } from './glyphs.ts';
import { PERIODS } from './routes.ts';

export interface ChapterSource {
  file: string;
  heading: string;
}

export interface Chapter {
  id: string;
  title: string;
  hi: string | null;
  line: string;
  source: ChapterSource | null;
  stories: string[];
  films: string[];
  hero: { route?: string; film?: string } | null;
  art: { film?: string; still?: number; asset?: string; treatment?: string; alt?: string } | null;
  /** The carved emblem a chapter with no picture wears instead. */
  glyph: GlyphId | null;
  covers: string[];
  dates: string | null;
  /** Filled in here, not in the data: which period this chapter belongs to. */
  period: string;
  /** 1-based position within its period. */
  index: number;
}

interface RawPeriod {
  slug?: string;
  chapters?: unknown[];
}

const PERIOD_ORDER: string[] = PERIODS.map((p) => p.slug);

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];
}

function normalizeChapter(v: unknown, period: string, index: number): Chapter | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = str(o.id).trim();
  const title = str(o.title).trim();
  if (!id || !title) return null;
  const srcRaw = o.source as Record<string, unknown> | undefined;
  return {
    id,
    title,
    hi: strOrNull(o.hi),
    line: str(o.line),
    source:
      srcRaw && typeof srcRaw === 'object' && typeof srcRaw.file === 'string'
        ? { file: srcRaw.file, heading: str(srcRaw.heading) }
        : null,
    stories: strArray(o.stories),
    films: strArray(o.films),
    hero: o.hero && typeof o.hero === 'object' ? (o.hero as Chapter['hero']) : null,
    art: o.art && typeof o.art === 'object' ? (o.art as Chapter['art']) : null,
    glyph: glyphId(o.glyph),
    covers: strArray(o.covers),
    dates: strOrNull(o.dates),
    period,
    index,
  };
}

/** period slug → its ordered chapters. Built once, at module load. */
const BY_PERIOD: Map<string, Chapter[]> = (() => {
  const map = new Map<string, Chapter[]>();
  for (const slug of PERIOD_ORDER) map.set(slug, []);
  const periods = (raw as { periods?: RawPeriod[] })?.periods;
  if (Array.isArray(periods)) {
    for (const p of periods) {
      const slug = str(p?.slug);
      if (!slug) continue;
      const list: Chapter[] = [];
      const src = Array.isArray(p.chapters) ? p.chapters : [];
      for (const c of src) {
        const ch = normalizeChapter(c, slug, list.length + 1);
        if (ch) list.push(ch);
      }
      map.set(slug, list);
    }
  }
  return map;
})();

/** True while the data file is still L2's Tretā/Dvāpara stub. */
export const isStub = Boolean((raw as { stub?: boolean })?.stub);

/** Every chapter of the whole file, in cosmic order — the spine. */
export const spine: Chapter[] = PERIOD_ORDER.flatMap((slug) => BY_PERIOD.get(slug) ?? []);

/** The ordered chapters of one age. `[]` for an age with none (never throws). */
export function chaptersOf(periodSlug: string | null | undefined): Chapter[] {
  if (!periodSlug) return [];
  return BY_PERIOD.get(periodSlug) ?? [];
}

export function chapterById(id: string | null | undefined): Chapter | null {
  if (!id) return null;
  return spine.find((c) => c.id === id) ?? null;
}

/** Total chapters across the file — used to decide whether to show the spine at all. */
export const chapterCount = spine.length;

/* ------------------------------------------------------------------ *
 * Route → chapter
 * ------------------------------------------------------------------ */

function normRoute(route: string): string {
  if (!route) return '';
  let r = route.split('#')[0].split('?')[0];
  if (!r.startsWith('/')) r = `/${r}`;
  if (!r.endsWith('/')) r = `${r}/`;
  return r;
}

/** Exact `stories[]` membership. */
const EXACT = new Map<string, Chapter>();
/** `covers[]` prefixes, longest first so the most specific chapter wins. */
const PREFIXES: { prefix: string; chapter: Chapter }[] = [];
for (const ch of spine) {
  for (const r of ch.stories) {
    const key = normRoute(r);
    if (key && !EXACT.has(key)) EXACT.set(key, ch);
  }
  for (const p of ch.covers) {
    const key = normRoute(p);
    if (key) PREFIXES.push({ prefix: key, chapter: ch });
  }
}
PREFIXES.sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * The chapter a site route belongs to — `stories[]` first, then the longest
 * matching `covers[]` prefix. `null` when the route is in no chapter.
 */
export function chapterOfRoute(route: string | null | undefined): Chapter | null {
  if (!route) return null;
  const key = normRoute(route);
  if (!key) return null;
  const exact = EXACT.get(key);
  if (exact) return exact;
  for (const { prefix, chapter } of PREFIXES) {
    if (key.startsWith(prefix)) return chapter;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Walking the spine in time
 * ------------------------------------------------------------------ */

/**
 * Every `stories[]` route of every chapter, in spine order, de-duplicated —
 * the reading order of the whole site. This is what next/prev walk.
 */
export const storySpine: { route: string; chapter: Chapter }[] = (() => {
  const out: { route: string; chapter: Chapter }[] = [];
  const seen = new Set<string>();
  for (const ch of spine) {
    for (const r of ch.stories) {
      const key = normRoute(r);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ route: key, chapter: ch });
    }
  }
  return out;
})();

const SPINE_INDEX = new Map(storySpine.map((s, i) => [s.route, i]));

function step(route: string | null | undefined, delta: 1 | -1): { route: string; chapter: Chapter } | null {
  if (!route) return null;
  const key = normRoute(route);
  const i = SPINE_INDEX.get(key);
  if (i === undefined) {
    /* Not itself a spine story (a page swept up by `covers`, say). Fall back
       to its chapter: forward = that chapter's first story, back = the last
       story of the chapter before it. */
    const ch = chapterOfRoute(key);
    if (!ch) return null;
    const first = ch.stories.map(normRoute).find((r) => SPINE_INDEX.has(r));
    if (first === undefined) return null;
    const j = SPINE_INDEX.get(first)!;
    const target = delta === 1 ? j : j - 1;
    return storySpine[target] ?? null;
  }
  return storySpine[i + delta] ?? null;
}

/** The next story in time, across chapter and period boundaries. */
export function nextInTime(route: string | null | undefined): { route: string; chapter: Chapter } | null {
  return step(route, 1);
}

/** The previous story in time. */
export function prevInTime(route: string | null | undefined): { route: string; chapter: Chapter } | null {
  return step(route, -1);
}

/* ------------------------------------------------------------------ *
 * Films
 * ------------------------------------------------------------------ */

/** The films a chapter claims, resolved against featured.json; unknown slugs drop. */
export function filmsOfChapter(id: string | null | undefined): Film[] {
  const ch = chapterById(id);
  if (!ch) return [];
  const out: Film[] = [];
  const seen = new Set<string>();
  for (const slug of ch.films) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const film = getFilm(slug);
    if (film) out.push(film);
  }
  /* Public films first, so a watchable one is offered before a promised one. */
  return out.sort((a, b) => Number(b.isPublic) - Number(a.isPublic));
}

/* ------------------------------------------------------------------ *
 * Art
 * ------------------------------------------------------------------ */

/** A resolved plate: the picture a chapter, hub tile or era actually shows. */
export interface Plate {
  src: string;
  srcset: string | null;
  width: number;
  height: number;
  alt: string;
  lqip: string | null;
  /** 'film' — a still already in the film tiers; 'asset' — its own WebP. */
  source: 'film' | 'asset';
}

interface RawPlate {
  src: string;
  srcset?: string;
  w: number;
  h: number;
  alt?: string;
  lqip?: string;
  source?: string;
}

function plateFrom(raw: RawPlate | undefined): Plate | null {
  if (!raw?.src) return null;
  return {
    src: raw.src,
    srcset: raw.srcset ?? null,
    width: raw.w,
    height: raw.h,
    alt: raw.alt ?? '',
    lqip: raw.lqip ?? null,
    source: raw.source === 'asset' ? 'asset' : 'film',
  };
}

const MEDIA = media as unknown as {
  chapters?: Record<string, RawPlate>;
  hub?: Record<string, RawPlate>;
  eras?: Record<string, RawPlate>;
};

/**
 * The chapter's own plate, built by `scripts/media.mjs` from its `art`.
 * `null` when the chapter names no art, or when the asset catalog was absent at
 * build time — the caller then falls back to the glyph.
 */
export function chapterPlate(ch: Chapter | null): Plate | null {
  if (!ch) return null;
  return plateFrom(MEDIA.chapters?.[ch.id]);
}

/** By id, for callers that have no `Chapter` in hand (the road's era markers). */
export function plateById(id: string | null | undefined): Plate | null {
  if (!id) return null;
  return plateFrom(MEDIA.chapters?.[id]);
}

/** A Stories-hub tile's plate (`hub` in `src/data/art-plates.json`). */
export function hubPlate(id: string | null | undefined): Plate | null {
  if (!id) return null;
  return plateFrom(MEDIA.hub?.[id]);
}

/** A Kali-history era's plate — the same entries, keyed by chapter id. */
export function eraPlate(id: string | null | undefined): Plate | null {
  if (!id) return null;
  return plateFrom(MEDIA.eras?.[id]);
}

/** The one picture that stands for a chapter, when the data names a film still. */
export function chapterFilm(ch: Chapter | null): Film | null {
  if (!ch) return null;
  if (ch.art?.film) {
    const f = getFilm(ch.art.film);
    if (f) return f;
  }
  if (ch.hero?.film) {
    const f = getFilm(ch.hero.film);
    if (f) return f;
  }
  return filmsOfChapter(ch.id)[0] ?? null;
}
