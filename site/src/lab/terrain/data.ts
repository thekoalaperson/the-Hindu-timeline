/**
 * data.ts — everything the runtime needs about a *place*, computed at build time.
 *
 * The panels are one JSON table and `road.ts` builds the markup of the one you
 * opened; nothing is lost to a crawler or to a browser with no JavaScript,
 * because the world's real links live in the index (`.tr-index`), which stays
 * server-rendered HTML.
 *
 * Four derived things live here:
 *
 *  1. **The panel table** — one row per touchable place. A *chapter* landmark's
 *     panel is the new shape: the chapter's line, then its stories **in order**
 *     with a thumbnail where one of them is filmed, then its films, then the
 *     corpus file and heading it was taken from.
 *  2. **The finder index** — a folded (diacritic-insensitive) search blob per
 *     place, so typing "manthan" finds `Samudra Manthan`.
 *  3. **"Nearby"** — for a chapter, the chapters either side of it *in time*;
 *     for a film, the real graph relations it had before.
 *  4. **Gate art** — one hero still per age, so a fling never lands on an empty
 *     arch.
 */
import graph from '../../generated/graph.json';
import type { Film } from '../../lib/films.ts';
import { getFilms } from '../../lib/films.ts';
import { KALKI, NIGHT, TWO_CLOCKS } from './future.ts';
import {
  ALL_ERAS,
  ALL_GATES,
  ALL_LANDMARKS,
  type EraMarker,
  FAR_FACTOR,
  type FilmPlace,
  type Landmark,
  type RecedingGate,
  REGIONS,
  SKY,
  SKY_FACTOR,
  SKY_PLACES,
  type SkyPlace,
} from './places.ts';

/* ------------------------------------------------------------------ types - */

export interface PanelImg {
  src: string;
  srcset: string | null;
  w: number;
  h: number;
}

export interface PanelLink {
  href: string;
  label: string;
  /** 1 = the age's accent-lit button. */
  primary?: 1;
}

/** A story inside a chapter panel — in order, with art where it is filmed. */
export interface PanelRow {
  href: string;
  label: string;
  /** A 400-wide still, when a film covers this story. */
  img: string | null;
  /** "6:19", or null. */
  note: string | null;
}

export interface Panel {
  id: string;
  /** 'f' film · 'c' chapter · 'g' event-group · 'e' era marker · 'm' manvantara gate. */
  k: 'f' | 'c' | 'g' | 'e' | 'm';
  /** Road x to travel to (world px, before any centring). */
  wx: number;
  /** Index into the regions table, or -1 for the sky (Cross-Yuga). */
  ri: number;
  /** `AGE · 6:19`, or `AGE · CHAPTER 3`, or `KALI YUGA — HISTORY · IV`. */
  meta: string;
  title: string;
  hi: string | null;
  sum: string;
  /** The italic line under the summary — a cosmic address, or a citation. */
  place: string | null;
  img: PanelImg | null;
  /** The still's own caption, when it has one. */
  cap: string | null;
  vid: string | null;
  soon: 0 | 1;
  links: PanelLink[];
  rows: PanelRow[];
  near: string[];
  /** The label as painted on the place, for the peek card and the chips. */
  l: string;
}

/* --------------------------------------------------------------- folding - */

/** "Kṛṣṇa’s" → "krsnas". Diacritics dropped, apostrophes dropped, lowercase. */
export function fold(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`ʼ]/g, '')
    .replace(/[·—–-]/g, ' ')
    .toLowerCase();
}

/* ------------------------------------------------------------ the corpus - */

type GraphNode = {
  route: string;
  title: string;
  section?: string;
  backlinks?: { routes?: string[] };
  children?: string[];
  prev?: string | null;
  next?: string | null;
  parentRoute?: string | null;
};
const NODES = graph.nodes as unknown as Record<string, GraphNode>;
const BY_ROUTE = graph.byRoute as unknown as Record<string, string>;

function nodeAt(route: string): GraphNode | null {
  const path = BY_ROUTE[route] ?? BY_ROUTE[route.endsWith('/') ? route : `${route}/`];
  return path ? (NODES[path] ?? null) : null;
}
function routeOfPath(path: string): string | null {
  return NODES[path]?.route ?? null;
}

/* ------------------------------------------------------- the films layer - */

const ALL_FILMS = getFilms();
const FILM_BY_SLUG = new Map(ALL_FILMS.map((f) => [f.slug, f]));
/** A corpus route → the film that animates it, so a chapter's story list can
 *  show a thumbnail on the rows that have been filmed. */
const FILM_BY_ROUTE = new Map<string, Film>();
for (const f of ALL_FILMS) {
  for (const c of f.corpus) {
    const key = c.route.endsWith('/') ? c.route : `${c.route}/`;
    if (!FILM_BY_ROUTE.has(key)) FILM_BY_ROUTE.set(key, f);
  }
}

function imgOf(f: Film): PanelImg | null {
  const s = f.stills[0];
  if (s) {
    return {
      src: s.sizes[800],
      srcset: `${s.sizes[400]} 400w, ${s.sizes[800]} 800w, ${s.sizes[1600]} 1600w`,
      w: s.width,
      h: s.height,
    };
  }
  const t = f.thumb;
  return t
    ? { src: t[800], srcset: `${t[400]} 400w, ${t[800]} 800w`, w: t.width, h: t.height }
    : null;
}

function thumb400(f: Film | undefined): string | null {
  if (!f) return null;
  return f.stills[0]?.sizes[400] ?? f.thumb?.[400] ?? null;
}

/* ------------------------------------------------------- place bookkeeping */

const WX = new Map<string, number>();
const BY_CORPUS = new Map<string, string[]>();
const BY_REGION = new Map<number, string[]>();

function claim(route: string, id: string) {
  const key = route.endsWith('/') ? route : `${route}/`;
  const list = BY_CORPUS.get(key);
  if (list) list.push(id);
  else BY_CORPUS.set(key, [id]);
}
function inRegion(ri: number, id: string) {
  const list = BY_REGION.get(ri);
  if (list) list.push(id);
  else BY_REGION.set(ri, [id]);
}

REGIONS.forEach((r, ri) => {
  for (const p of r.films) {
    WX.set(p.id, p.x);
    inRegion(ri, p.id);
    for (const c of p.film.corpus) claim(c.route, p.id);
  }
  for (const lm of r.landmarks) {
    WX.set(lm.id, lm.wx);
    inRegion(ri, lm.id);
    for (const s of lm.stories) claim(s.route, lm.id);
  }
  for (const e of r.eras) {
    WX.set(e.id, e.wx);
    inRegion(ri, e.id);
  }
  for (const g of r.gates) {
    WX.set(g.id, g.wx);
    inRegion(ri, g.id);
  }
});
for (const p of SKY_PLACES) {
  WX.set(p.id, Math.round(p.x / SKY_FACTOR));
  inRegion(-1, p.id);
  for (const c of p.film.corpus) claim(c.route, p.id);
}

/* --------------------------------------------------------------- "Nearby" */

function nearbyFilm(id: string, ri: number, routes: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>([id]);
  const push = (cand: string | null | undefined) => {
    if (!cand || seen.has(cand) || out.length >= 6) return;
    seen.add(cand);
    out.push(cand);
  };
  const pushRoute = (route: string | null | undefined) => {
    if (!route) return;
    for (const cand of BY_CORPUS.get(route.endsWith('/') ? route : `${route}/`) ?? []) push(cand);
  };
  for (const r of routes) pushRoute(r);
  for (const r of routes) {
    const n = nodeAt(r);
    if (!n) continue;
    for (const b of (n.backlinks?.routes ?? []).slice(0, 24)) pushRoute(b);
    pushRoute(n.next);
    pushRoute(n.prev);
    for (const c of (n.children ?? []).slice(0, 12)) pushRoute(routeOfPath(c));
  }
  const home = WX.get(id) ?? 0;
  const siblings = [...(BY_REGION.get(ri) ?? [])].sort(
    (a, b) => Math.abs((WX.get(a) ?? 0) - home) - Math.abs((WX.get(b) ?? 0) - home),
  );
  for (const s of siblings) push(s);
  return out.slice(0, 6);
}

/* ------------------------------------------------------------ the panels - */

const PANELS: (Panel & { q: string })[] = [];

function filmPanel(p: FilmPlace | SkyPlace, ri: number, age: string, ageRoute: string) {
  const f = p.film;
  const still = f.stills[0];
  const metaBits = [age.toUpperCase()];
  if (f.isPublic && f.duration) metaBits.push(f.duration);
  else if (!f.isPublic) metaBits.push('COMING SOON');
  const links: PanelLink[] = [];
  const read = f.corpus[0];
  if (read) links.push({ href: read.route, label: 'Read the story', primary: 1 });
  links.push({ href: f.route, label: 'Film page' });
  links.push({ href: ageRoute, label: age });
  PANELS.push({
    id: p.id,
    k: 'f',
    wx: WX.get(p.id) ?? 0,
    ri,
    meta: metaBits.join(' · '),
    title: f.title.en,
    hi: f.title.hi,
    sum: f.summary,
    place: f.cosmicAddressLabel ?? null,
    img: imgOf(f),
    cap: still?.caption ?? null,
    vid: f.isPublic ? f.yt.videoId : null,
    soon: f.isPublic ? 0 : 1,
    links,
    rows: [],
    near: [],
    l: p.label,
    q: fold(`${p.label} ${f.title.en} ${f.title.hi ?? ''} ${f.ytTitle} ${age} ${f.periodName}`),
  });
}

/**
 * A chapter's panel: the line, then its stories in order (thumbnail where one
 * of them is filmed), then its films, then the corpus file it came from. This
 * is the panel the brief asks for — the same mechanics as a film's, a
 * different body.
 */
function landmarkPanel(lm: Landmark, ri: number, age: string, ageRoute: string, n: number) {
  const rows: PanelRow[] = lm.stories.slice(0, 12).map((s) => {
    const f = FILM_BY_ROUTE.get(s.route.endsWith('/') ? s.route : `${s.route}/`);
    return {
      href: s.route,
      label: s.title,
      img: thumb400(f),
      note: f?.isPublic ? (f.duration ?? null) : f ? 'coming soon' : null,
    };
  });
  for (const slug of lm.films) {
    const f = FILM_BY_SLUG.get(slug);
    if (!f) continue;
    if (rows.some((r) => r.href === f.route)) continue;
    rows.push({
      href: f.route,
      label: f.title.en,
      img: thumb400(f),
      note: f.isPublic ? (f.duration ?? 'film') : 'coming soon',
    });
  }
  const meta =
    lm.kind === 'chapter'
      ? `${age.toUpperCase()} · CHAPTER ${n}${lm.dates ? ` · ${lm.dates.toUpperCase()}` : ''}`
      : `${age.toUpperCase()} · ${lm.count} ${lm.count === 1 ? 'EVENT' : 'EVENTS'}`;
  PANELS.push({
    id: lm.id,
    k: lm.kind === 'chapter' ? 'c' : 'g',
    wx: lm.wx,
    ri,
    meta,
    title: lm.title,
    hi: lm.hi,
    sum: lm.line,
    place: lm.source,
    img: lm.art ? { src: lm.art.src, srcset: lm.art.srcset, w: lm.art.w, h: lm.art.h } : null,
    cap: null,
    vid: null,
    soon: 0,
    links: [
      { href: lm.route, label: lm.kind === 'chapter' ? 'Read this chapter' : 'Read the story', primary: 1 },
      { href: ageRoute, label: age },
    ],
    rows,
    near: [],
    l: lm.title,
    /* The work this chapter belongs to, taken from its routes. R6: a newcomer
       typing "Ramayana" means the epic, and the road knew this chapter only as
       "Bāla Kāṇḍa" — the parent work is in the route (`/stories/ramayana/…`)
       and nowhere else. Only the *distinct* segments go in, and only the ones
       that are not already in the title: the find index is shipped inside the
       home's HTML, so every repeated word is bytes on the wire. */
    q: '',
  });
  const panel = PANELS[PANELS.length - 1]!;
  const base = fold(
    `${lm.title} ${lm.hi ?? ''} ${lm.line} ${lm.stories.map((s) => s.title).join(' ')} ${age}`,
  );
  const extra = routeWords([lm.route, ...lm.stories.map((st) => st.route)], base);
  panel.q = extra ? `${base} ${extra}` : base;
}

/**
 * The distinct route segments of a chapter that its own text does not already
 * carry — "ramayana", "mahabharata", "puranas". Deduped and filtered, because
 * this index travels inside the home page's HTML.
 */
const ROUTE_STOP = new Set(['stories', 'clock', 'characters', 'index', '']);
function routeWords(routes: string[], have: string): string {
  const seen = new Set<string>();
  for (const r of routes) {
    for (const seg of r.split('/')) {
      const w = fold(seg.replace(/^\d+-/, '').replace(/-/g, ' ')).trim();
      if (!w || w.length < 4 || ROUTE_STOP.has(w) || seen.has(w) || have.includes(w)) continue;
      seen.add(w);
    }
  }
  return [...seen].join(' ');
}

function eraPanel(e: EraMarker, ri: number, age: string, ageRoute: string) {
  PANELS.push({
    id: e.id,
    k: 'e',
    wx: e.wx,
    ri,
    meta: `${age.toUpperCase()} · ${e.numeral} · ${e.dates.toUpperCase()}`,
    title: e.name,
    hi: null,
    sum: e.line,
    place: TWO_CLOCKS.cite,
    img: null,
    cap: null,
    vid: null,
    soon: 0,
    links: [
      { href: e.route, label: 'The documented history', primary: 1 },
      { href: ageRoute, label: age },
    ],
    rows: [],
    near: [],
    l: e.name,
    q: fold(`${e.numeral} ${e.name} ${e.dates} ${e.line} ${age}`),
  });
}

function gatePanel(g: RecedingGate, ri: number, age: string, ageRoute: string) {
  PANELS.push({
    id: g.id,
    k: 'm',
    wx: g.wx,
    ri,
    meta: `${age.toUpperCase()} · MANVANTARA ${g.n} OF 14`,
    title: g.name,
    hi: null,
    sum: g.line,
    place: '≈ 306,720,000 years — 71 mahāyugas and a sandhyā (00-time-and-cosmology/manvantara-system.md)',
    img: null,
    cap: null,
    vid: null,
    soon: 0,
    links: [
      { href: g.route, label: `Manvantara ${g.n}`, primary: 1 },
      { href: ageRoute, label: age },
    ],
    rows: [],
    near: [],
    l: g.name,
    q: fold(`${g.name} manvantara ${g.n} future manu ${age}`),
  });
}

REGIONS.forEach((r, ri) => {
  for (const p of r.films) filmPanel(p, ri, r.def.gate, r.route);
  r.landmarks.forEach((lm, i) => landmarkPanel(lm, ri, r.def.gate, r.route, i + 1));
  for (const e of r.eras) eraPanel(e, ri, r.def.gate, r.route);
  for (const g of r.gates) gatePanel(g, ri, r.def.gate, r.route);
});
for (const p of SKY_PLACES) filmPanel(p, -1, SKY.gate, SKY.route);

/* The Night of Brahmā is a place too — it is the last one. */
const lastRi = REGIONS.length - 1;
PANELS.push({
  id: 'night-of-brahma',
  k: 'm',
  wx: (REGIONS[lastRi]?.x0 ?? 0) + (REGIONS[lastRi]?.width ?? 0) - 200,
  ri: lastRi,
  meta: 'THE END OF THE DAY · 4,320,000,000 YEARS',
  title: NIGHT.title,
  hi: NIGHT.hi,
  sum: NIGHT.line,
  place: NIGHT.cites.map((c) => c.label).join(' · '),
  img: null,
  cap: null,
  vid: null,
  soon: 0,
  links: [
    { href: NIGHT.cites[0]!.route, label: 'Kalpa and pralaya', primary: 1 },
    { href: NIGHT.cites[1]!.route, label: "Brahmā's lifetime" },
  ],
  rows: [],
  near: [],
  l: NIGHT.title,
  q: fold(`night of brahma pralaya samvartaka dissolution ${NIGHT.line}`),
});

/* Relations: a chapter's neighbours are its neighbours in time; everything
   else keeps the graph-derived relations it had. */
const ROUTES_OF = new Map<string, string[]>();
REGIONS.forEach((r) => {
  for (const p of r.films) ROUTES_OF.set(p.id, p.film.corpus.map((c) => c.route));
});
for (const p of SKY_PLACES) ROUTES_OF.set(p.id, p.film.corpus.map((c) => c.route));
const LM_BY_ID = new Map(ALL_LANDMARKS.map((l) => [l.id, l]));

for (const p of PANELS) {
  if (p.k === 'c' || p.k === 'g') {
    const lm = LM_BY_ID.get(p.id);
    p.near = lm?.neighbours ?? [];
  } else if (p.k === 'e' || p.k === 'm') {
    const home = WX.get(p.id) ?? p.wx;
    p.near = [...(BY_REGION.get(p.ri) ?? [])]
      .filter((id) => id !== p.id)
      .sort((a, b) => Math.abs((WX.get(a) ?? 0) - home) - Math.abs((WX.get(b) ?? 0) - home))
      .slice(0, 4);
  } else {
    p.near = nearbyFilm(p.id, p.ri, ROUTES_OF.get(p.id) ?? []);
  }
}

export const PANEL_TABLE = PANELS;

export const PANEL_MAP: Record<string, Omit<Panel, 'q'>> = Object.fromEntries(
  PANELS.map(({ q: _q, ...rest }) => [rest.id, rest]),
);

export const FIND_INDEX: [string, string, Panel['k']][] = PANELS.map((p) => [p.id, p.q, p.k]);

/**
 * "Today's story" — the pool it is drawn from. Public films only, each with a
 * picture and a place on the road, so the home can show one line and a
 * thumbnail and open its panel. The *choice* is made in the browser from the
 * viewer's own date; only the pool is built here.
 */
export const TODAY_POOL: string[] = REGIONS.flatMap((r) =>
  r.films.filter((p) => p.film.isPublic && p.poster).map((p) => p.id),
).concat(SKY_PLACES.filter((p) => p.film.isPublic && p.poster).map((p) => p.id));

/* ------------------------------------------------------ art behind a gate - */

export const GATE_ART: (PanelImg | null)[] = REGIONS.map((r) => {
  const own = r.films.find((p) => p.film.isPublic && p.film.stills.length) ?? r.films[0];
  if (own) return imgOf(own.film);
  // No film of its own — the Future has none, and never will have one of the
  // seven Manus who have not come. Before borrowing a neighbour's still (which
  // put a Kali-history frame over the Night), use this age's *own* chapters:
  // W4's plates give the Future its own faces.
  const plated = r.landmarks.find((lm) => lm.art);
  if (plated?.art) {
    return { src: plated.art.src, srcset: plated.art.srcset, w: plated.art.w, h: plated.art.h };
  }
  // Still nothing of its own — and the Future never will have: its chapters
  // are carved glyphs, because there is no still of an age that has not
  // happened. Borrowing a neighbour's frame put a Kali-history photograph
  // behind the Night of Brahmā. `null` here, and the gate carves its own
  // chapters' emblem instead (`GATE_GLYPH`).
  return null;
});

/**
 * The emblem a gate carves when it has no picture of its own — the age's own
 * chapters' glyph, in the age's accent. One per region, null where the gate
 * has art.
 */
export const GATE_GLYPH: (string | null)[] = REGIONS.map((r, ri) =>
  GATE_ART[ri] ? null : (r.landmarks.find((lm) => lm.glyph)?.glyph ?? 'gate'),
);

/** Re-exported so index.astro does not have to import two modules for one lane. */
export { ALL_ERAS, ALL_GATES, ALL_LANDMARKS, FAR_FACTOR, KALKI, NIGHT, TWO_CLOCKS };
