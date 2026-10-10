/**
 * films.ts — typed access to the films layer.
 *
 * Two committed/generated sources are joined here and nowhere else:
 *   src/data/featured.json          (committed, 50 films, sorted by `ep`)
 *   src/generated/media-manifest.json  (written by scripts/media.mjs)
 *
 * Plus the corpus graph, so a film knows the title/dek/period of the page it
 * animates.
 *
 * Two rules this module enforces for every consumer:
 *   1. `ep` never leaves this file. It is an internal sort key; the standing
 *      2026-07-22 ruling is that no episode numbers appear publicly ("a
 *      connected web, not an ordered sequence").
 *   2. Private asset paths are read only by the build step, never this module.
 */
import featuredData from '../data/featured.json' with { type: 'json' };
import mediaData from '../generated/media-manifest.json' with { type: 'json' };
import { type GraphNode, nodeForRoute } from './graph.ts';
import { PERIOD_LABEL, PERIOD_SLUGS } from './routes.ts';

/* ------------------------------------------------------------------ types - */

export type FilmStatus = 'public' | 'coming-soon';

export interface FilmTitle {
  en: string;
  hi: string | null;
}

export interface FilmYouTube {
  videoId: string | null;
  url: string | null;
  published: string | null;
  status: FilmStatus;
}

export interface FilmPlaylist {
  name: string;
  id: string | null;
}

export interface FilmCorpusRef {
  path: string;
  route: string;
  inferred: boolean;
  /** Resolved from the corpus graph — undefined only if the graph is stale. */
  node?: GraphNode;
  title: string;
  dek: string;
}

export interface FilmThumb {
  400: string;
  800: string;
  1280: string;
  lqip: string;
  width: number;
  height: number;
}

export interface FilmStill {
  sizes: { 400: string; 800: string; 1600: string };
  width: number;
  height: number;
  lqip: string;
  alt: string;
  caption?: string;
}

export interface Film {
  slug: string;
  route: string;
  title: FilmTitle;
  /** The live Hindi YouTube title, Latin script. A search string, not a display title. */
  ytTitle: string;
  yt: FilmYouTube;
  shorts: string[];
  playlists: FilmPlaylist[];
  corpus: FilmCorpusRef[];
  /** The editorial period label as written in featured.json. */
  periodLabel: string;
  /** One of the nine canonical period slugs, or null when unmappable. */
  periodSlug: string | null;
  /** The site's own short name for that slug ("Tretā Yuga"). Falls back to the label. */
  periodName: string;
  /** The multi-valued truth from the corpus timeline — a soft tag, not a fact. */
  periodCandidates: { label: string; slug: string | null; name: string }[];
  cosmicAddressLabel: string | null;
  summary: string;
  /** Working titles (EP44–50) are unverified; hedge them in <title>/og. */
  titleDraft: boolean;
  isPublic: boolean;
  durationSec: number | null;
  /** "4:22", or null when nothing has been rendered yet. */
  duration: string | null;
  /** "20 July 2026", or null. */
  publishedLabel: string | null;
  thumb: FilmThumb | null;
  stills: FilmStill[];
  /** `/media/vector/<name>/index.html` — the self-contained interactive edition. */
  vectorFilm: string | null;
}

/* ------------------------------------------------------------ raw shapes - */

interface RawFilm {
  slug: string;
  ep: number;
  title: { en: string; hi: string | null };
  ytTitle: string;
  yt: { videoId: string | null; url: string | null; published: string | null; status: string };
  shorts?: string[];
  playlists?: { name: string; id: string | null }[];
  corpus?: { path: string; route: string; inferred?: boolean }[];
  period: string;
  periodCandidates?: string[];
  cosmicAddressLabel?: string;
  summary: string;
  titleDraft?: boolean;
  durationSec: number | null;
  vectorFilm?: string | null;
}

interface RawManifest {
  films: Record<
    string,
    {
      thumb: FilmThumb | null;
      stills: FilmStill[];
      vector: string | null;
    }
  >;
  vector: Record<string, { index: string; poster: string }>;
}

const raw = featuredData as unknown as RawFilm[];
const manifest = mediaData as unknown as RawManifest;

/* --------------------------------------------------- the period-label map - */

/**
 * featured.json carries editorial *display* labels ("Kali Yuga (History)",
 * "Before Time / Earlier Manvantaras"); the site keys everything off the nine
 * canonical slugs. This is deliberately tolerant: diacritics are folded, the
 * parenthetical is read before it is dropped, and a compound "A / B" label
 * resolves to its first (primary) half.
 */
const PERIOD_EXACT: Record<string, string> = {
  'before time': 'before-time',
  'earlier manvantaras': 'earlier-manvantaras',
  'satya yuga': 'satya-yuga',
  'krta yuga': 'satya-yuga',
  'satya krta yuga': 'satya-yuga',
  'treta yuga': 'treta-yuga',
  'dvapara yuga': 'dvapara-yuga',
  'future manvantaras': 'future-manvantaras',
  'cross yuga': 'cross-yuga',
};

function foldLabel(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** The set of labels that reached `periodSlugFor` but did not map. */
const unmappedPeriods = new Set<string>();

export function periodSlugFor(label: string | null | undefined): string | null {
  if (!label) return null;
  const full = foldLabel(label);

  // Kali is the one period the corpus splits in two; the qualifier is what
  // separates them, so it must be read before the parenthetical is dropped.
  if (full.includes('kali')) {
    if (/\b(history|historical|documented)\b/.test(full)) return 'kali-yuga-history';
    return 'kali-yuga-scriptural';
  }
  if (full.startsWith('cross yuga')) return 'cross-yuga';

  // "Cross-Yuga (recurs Satya/Treta/Dvapara)" — drop the gloss, then take the
  // primary half of a compound like "Before Time / Earlier Manvantaras".
  const primary = foldLabel(label.replace(/\([^)]*\)/g, '').split('/')[0] ?? '');
  const hit = PERIOD_EXACT[primary] ?? PERIOD_EXACT[full];
  if (hit) return hit;

  // Last resort: the slug itself, in case a slug was written where a label
  // was expected.
  const slugged = full.replace(/ /g, '-');
  if (PERIOD_SLUGS.includes(slugged)) return slugged;

  unmappedPeriods.add(label);
  return null;
}

/** Editorial labels that no rule could place. Empty on the current data. */
export function unmappedPeriodLabels(): string[] {
  return [...unmappedPeriods];
}

export function periodNameFor(slug: string | null, fallback: string): string {
  return (slug && PERIOD_LABEL[slug]) || fallback;
}

/** The nine periods in cosmic order, for grouping. */
export const PERIOD_ORDER: readonly string[] = PERIOD_SLUGS;

/* ----------------------------------------------------------- formatting - */

/** 262 → "4:22". Hours only appear if a film ever runs past one. */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-07-20" → "20 July 2026". Parsed as a plain date, never as a UTC instant. */
export function formatPublished(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1];
  if (!month) return null;
  return `${Number(d)} ${month} ${y}`;
}

/** A film's own route. The one place the URL shape is decided. */
export function filmRoute(slug: string): string {
  return `/films/${slug}/`;
}

/* --------------------------------------------------------------- posters - */

export interface Poster {
  /** Where the pixels come from — useful for `data-` hooks and for tests. */
  kind: 'still' | 'thumb' | 'youtube';
  src: string;
  /** `null` for the single-file YouTube fallback. */
  srcset: string | null;
  width: number;
  height: number;
  /** The inline blur placeholder, `null` when we hold no local copy. */
  lqip: string | null;
}

/**
 * YouTube's own poster. The last resort, used only when `scripts/media.mjs`
 * had no studio repo to render from — see its fail-soft path.
 */
function youtubePoster(film: Film): Poster | null {
  if (!film.yt.videoId) return null;
  return {
    kind: 'youtube',
    src: `https://i.ytimg.com/vi/${film.yt.videoId}/hqdefault.jpg`,
    srcset: null,
    width: 480,
    height: 360,
    lqip: null,
  };
}

function thumbPoster(film: Film): Poster | null {
  const t = film.thumb;
  if (!t) return null;
  return {
    kind: 'thumb',
    src: t[800],
    srcset: `${t[400]} 400w, ${t[800]} 800w, ${t[1280]} 1280w`,
    width: t.width,
    height: t.height,
    lqip: t.lqip,
  };
}

/**
 * The image a rail, an index row or an article card shows: the film's **first
 * hero still**, which is textless painted artwork.
 *
 * The YouTube thumbnail is *not* used here. Those carry Hinglish text overlays
 * baked into the picture — legible as a YouTube tile, but they break the
 * manuscript register the moment they are set beside body copy (orchestrator's
 * design call, FIXLIST 2026-09-06). It stays the video poster on the film page
 * and nothing else. When a film has no still we fall back to the thumbnail and
 * then to i.ytimg, because a missing picture is worse than an overlaid one.
 */
export function cardPoster(film: Film, index = 0): Poster | null {
  /* `index` lets a caller ask for a *different* frame of the same film when
     several cards on one screen would otherwise be identical. It wraps, so a
     caller never has to know how many stills a film has. */
  const n = film.stills.length;
  const still = n > 0 ? film.stills[((index % n) + n) % n] : undefined;
  if (still) {
    return {
      kind: 'still',
      src: still.sizes[800],
      srcset: `${still.sizes[400]} 400w, ${still.sizes[800]} 800w, ${still.sizes[1600]} 1600w`,
      width: still.width,
      height: still.height,
      lqip: still.lqip,
    };
  }
  return thumbPoster(film) ?? youtubePoster(film);
}

/**
 * The poster behind the play mark on the film page: our own WebP render of the
 * YouTube thumbnail (no Google request before a tap), falling back to i.ytimg
 * when the studio repo was absent at build time.
 */
export function videoPoster(film: Film): Poster | null {
  return thumbPoster(film) ?? youtubePoster(film);
}

/** Trailing-slash-tolerant route key. */
function normRoute(route: string): string {
  if (!route) return route;
  return route.endsWith('/') ? route : `${route}/`;
}

/* -------------------------------------------------------------- the join - */

function build(rawFilm: RawFilm): Film {
  const media = manifest.films[rawFilm.slug];
  const periodSlug = periodSlugFor(rawFilm.period);
  const status: FilmStatus = rawFilm.yt.status === 'public' ? 'public' : 'coming-soon';

  const corpus: FilmCorpusRef[] = (rawFilm.corpus ?? []).map((c) => {
    const route = normRoute(c.route);
    const node = nodeForRoute(route);
    return {
      path: c.path,
      route,
      inferred: c.inferred === true,
      node,
      title: node?.title ?? c.path.replace(/\.md$/, ''),
      dek: node?.dek ?? '',
    };
  });

  return {
    slug: rawFilm.slug,
    route: filmRoute(rawFilm.slug),
    title: { en: rawFilm.title.en, hi: rawFilm.title.hi ?? null },
    ytTitle: rawFilm.ytTitle,
    yt: {
      videoId: rawFilm.yt.videoId ?? null,
      url: rawFilm.yt.url ?? null,
      published: rawFilm.yt.published ?? null,
      status,
    },
    shorts: rawFilm.shorts ?? [],
    playlists: rawFilm.playlists ?? [],
    corpus,
    periodLabel: rawFilm.period,
    periodSlug,
    periodName: periodNameFor(periodSlug, rawFilm.period),
    periodCandidates: (rawFilm.periodCandidates ?? []).map((label) => {
      const slug = periodSlugFor(label);
      return { label, slug, name: periodNameFor(slug, label) };
    }),
    cosmicAddressLabel: rawFilm.cosmicAddressLabel ?? null,
    summary: rawFilm.summary,
    titleDraft: rawFilm.titleDraft === true,
    isPublic: status === 'public',
    durationSec: rawFilm.durationSec ?? null,
    duration: formatDuration(rawFilm.durationSec),
    publishedLabel: formatPublished(rawFilm.yt.published),
    thumb: media?.thumb ?? null,
    stills: media?.stills ?? [],
    vectorFilm: media?.vector ?? null,
  };
}

/** Built once per build; `ep` order is preserved as the internal sort. */
const FILMS: Film[] = raw.map(build);
const BY_SLUG = new Map(FILMS.map((f) => [f.slug, f]));

const BY_ROUTE = new Map<string, Film[]>();
for (const film of FILMS) {
  for (const c of film.corpus) {
    const list = BY_ROUTE.get(c.route);
    if (list) list.push(film);
    else BY_ROUTE.set(c.route, [film]);
  }
}

/* --------------------------------------------------------------- readers - */

export function getFilms(): Film[] {
  return FILMS;
}

export function getFilm(slug: string): Film | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Every film that animates a corpus page. Exported for I5: the "Watch the
 * film" card on a content page is `filmsForRoute(node.route)[0]`.
 * Public films come first — an article should offer a watchable film before a
 * promised one.
 */
export function filmsForRoute(corpusRoute: string): Film[] {
  const list = BY_ROUTE.get(normRoute(corpusRoute));
  if (!list) return [];
  return [...list].sort((a, b) => Number(b.isPublic) - Number(a.isPublic));
}

/** True when a corpus page has a film — cheaper than building the array. */
export function hasFilmForRoute(corpusRoute: string): boolean {
  return BY_ROUTE.has(normRoute(corpusRoute));
}

export interface PeriodGroup {
  slug: string | null;
  name: string;
  route: string | null;
  films: Film[];
}

/**
 * The nine periods in cosmic order, empty ones dropped. Within a group,
 * published films keep their internal order and unreleased ones fall to the
 * end. A tenth group ("Elsewhere in time") collects anything unmappable; it is
 * empty on the current data and exists so a new label never disappears.
 */
export function filmsByPeriod(films: Film[] = FILMS): PeriodGroup[] {
  const buckets = new Map<string, Film[]>();
  const orphans: Film[] = [];
  for (const film of films) {
    if (!film.periodSlug) {
      orphans.push(film);
      continue;
    }
    const list = buckets.get(film.periodSlug);
    if (list) list.push(film);
    else buckets.set(film.periodSlug, [film]);
  }

  const byRelease = (a: Film, b: Film) => Number(b.isPublic) - Number(a.isPublic);
  const out: PeriodGroup[] = [];
  for (const slug of PERIOD_SLUGS) {
    const list = buckets.get(slug);
    if (!list || list.length === 0) continue;
    out.push({
      slug,
      name: PERIOD_LABEL[slug] ?? slug,
      route: `/clock/${slug}/`,
      films: [...list].sort(byRelease),
    });
  }
  if (orphans.length > 0) {
    out.push({ slug: null, name: 'Elsewhere in time', route: null, films: [...orphans].sort(byRelease) });
  }
  return out;
}

export interface PlaylistGroup {
  name: string;
  films: Film[];
}

/**
 * Playlists by name, largest first. Every `id` on file is truncated (I4a §6),
 * so nothing here links to a `?list=` URL — see CHANNEL_PLAYLISTS.
 */
export function filmsByPlaylist(films: Film[] = FILMS): PlaylistGroup[] {
  const buckets = new Map<string, Film[]>();
  for (const film of films) {
    for (const p of film.playlists) {
      if (!p.name) continue;
      const list = buckets.get(p.name);
      if (list) list.push(film);
      else buckets.set(p.name, [film]);
    }
  }
  return [...buckets.entries()]
    .map(([name, list]) => ({ name, films: list }))
    .sort((a, b) => b.films.length - a.films.length || a.name.localeCompare(b.name));
}

/** Other films sharing a period, nearest first, the film itself excluded. */
export function siblingFilms(film: Film, limit = 6): Film[] {
  if (!film.periodSlug) return [];
  return FILMS.filter((f) => f.slug !== film.slug && f.periodSlug === film.periodSlug)
    .sort((a, b) => Number(b.isPublic) - Number(a.isPublic))
    .slice(0, limit);
}

/**
 * The home rail: the most recently published public films, newest first.
 * Anything unreleased or undated is left out — the rail is for watching.
 */
export function recentFilms(limit = 10): Film[] {
  // No `thumb` requirement: the rail draws the first hero still, and falls back
  // to i.ytimg when the build had no studio repo. Filtering on local media here
  // would empty the rail on a clean checkout.
  return FILMS.filter((f) => f.isPublic && f.yt.published)
    .sort((a, b) => (b.yt.published ?? '').localeCompare(a.yt.published ?? ''))
    .slice(0, limit);
}

/* ---------------------------------------------------------- the channel - */

export const CHANNEL_URL = 'https://www.youtube.com/@thehindutimelinehindi';
export const CHANNEL_PLAYLISTS_URL = `${CHANNEL_URL}/playlists`;

/** `youtube-nocookie.com` — the privacy-enhanced host, used for every embed. */
export function embedSrc(videoId: string, autoplay = true): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    cc_load_policy: '1',
    cc_lang_pref: 'en',
  });
  if (autoplay) params.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export const counts = {
  total: FILMS.length,
  published: FILMS.filter((f) => f.isPublic).length,
  upcoming: FILMS.filter((f) => !f.isPublic).length,
  stills: FILMS.reduce((a, f) => a + f.stills.length, 0),
  corpusPages: new Set(FILMS.flatMap((f) => f.corpus.map((c) => c.route))).size,
};
