/**
 * places.ts — the world laid out, at build time.
 *
 * The road lays the nine periods end to end. Everything a traveller can touch
 * is a *place* standing beside it:
 *
 *   • a **landmark** — one **chapter** of an age (`src/data/chapters.json`),
 *     standing in the far lane. This is the middle layer the first build was
 *     missing: an age is not 300 story-groups, it is six to ten chapters, in
 *     the order the corpus itself tells them. Where an age has no chapters yet
 *     the landmarks fall back to its biggest event-groups — *sorted by event
 *     count, never sampled at random*.
 *   • a **stele** — one of the 50 films, its painted still in an arched frame.
 *     The near lane; the reason to travel.
 *   • an **era marker** — Kali-history only. The ten dated eras I–X of
 *     `04-kali-yuga/recorded-history.md`, standing at the roadside of a lit
 *     city at night.
 *   • a **receding gate** — the Future only. Manvantaras 8–14 drawn in
 *     perspective, then the Night of Brahmā, where the road dissolves.
 *   • a **sky place** — the Cross-Yuga films. The corpus defines that period as
 *     "episodes the texts do not pin to one fixed age", so they are not a
 *     stretch of road at all: they hang over the whole journey.
 *
 * **Width by content.** A region's body used to be `films × 212`, which gave
 * Kali-history (1 film, 1,539 events) a screen of grey and Dvāpara (21 films)
 * five. It is now driven by how much there is to *see* — chapters, films and
 * log(events) — and clamped between one and five phone screens, so no age is a
 * fog and none is a trek.
 *
 * Coordinates are "world px" at scale 1. The far lane and the sky lane are laid
 * out pre-multiplied by their parallax factor, because the runtime pulls those
 * lanes back by `scrollLeft × (1 − factor)` (see road.ts) — laying them out at
 * `x × factor` is what keeps a far landmark beside the road it belongs to.
 */
import chaptersData from '../../data/chapters.json';
import mediaData from '../../generated/media-manifest.json';
import beforeTime from '../../generated/events/before-time.json';
import crossYuga from '../../generated/events/cross-yuga.json';
import dvapara from '../../generated/events/dvapara-yuga.json';
import earlier from '../../generated/events/earlier-manvantaras.json';
import future from '../../generated/events/future-manvantaras.json';
import kaliHistory from '../../generated/events/kali-yuga-history.json';
import kaliScriptural from '../../generated/events/kali-yuga-scriptural.json';
import satya from '../../generated/events/satya-yuga.json';
import treta from '../../generated/events/treta-yuga.json';
import graph from '../../generated/graph.json';
import { type Film, cardPoster, getFilms } from '../../lib/films.ts';
import { ERAS, FUTURE_MANUS, NIGHT } from './future.ts';
import { ROAD_REGIONS, type RegionDef, SKY_REGION } from './regions.ts';

/* ---------------------------------------------------------------- events - */

interface RawEvent {
  title: string;
  description: string;
  actors?: string[];
  source?: string;
}
interface RawGroup {
  path: string;
  route: string;
  title: string;
  section: string;
  count: number;
  events: RawEvent[];
}
interface RawPeriodEvents {
  slug: string;
  groups: RawGroup[];
}

const EVENTS: Record<string, RawPeriodEvents> = {
  'before-time': beforeTime as unknown as RawPeriodEvents,
  'earlier-manvantaras': earlier as unknown as RawPeriodEvents,
  'satya-yuga': satya as unknown as RawPeriodEvents,
  'treta-yuga': treta as unknown as RawPeriodEvents,
  'dvapara-yuga': dvapara as unknown as RawPeriodEvents,
  'kali-yuga-scriptural': kaliScriptural as unknown as RawPeriodEvents,
  'kali-yuga-history': kaliHistory as unknown as RawPeriodEvents,
  'future-manvantaras': future as unknown as RawPeriodEvents,
  'cross-yuga': crossYuga as unknown as RawPeriodEvents,
};

/* -------------------------------------------------------------- chapters - */

/**
 * The chapter spine. Read straight from the JSON (the shared schema in
 * LANE-COMMON) so nothing else has to exist for the road to build: an absent
 * period simply falls back to its event-groups, and a period with fifty
 * chapters is spaced like a period with five.
 */
export interface ChapterSource {
  file: string;
  heading?: string;
}
export interface Chapter {
  id: string;
  title: string;
  hi?: string | null;
  line?: string;
  source?: ChapterSource | null;
  stories?: string[];
  films?: string[];
  hero?: { route?: string; film?: string } | null;
  art?: { film?: string; still?: number; asset?: string; treatment?: string; alt?: string } | null;
  /** One of the twelve carved emblems (src/lib/glyphs.ts), for a chapter with no art. */
  glyph?: string | null;
  covers?: string[];
  dates?: string | null;
}
interface ChaptersFile {
  stub?: boolean;
  periods?: { slug: string; chapters?: Chapter[] }[];
}

const CHAPTERS_FILE = chaptersData as unknown as ChaptersFile;
export const CHAPTERS_ARE_STUB = CHAPTERS_FILE.stub === true;

const CHAPTERS_BY_PERIOD: Record<string, Chapter[]> = {};
for (const p of CHAPTERS_FILE.periods ?? []) {
  if (p?.slug && Array.isArray(p.chapters) && p.chapters.length) {
    CHAPTERS_BY_PERIOD[p.slug] = p.chapters;
  }
}

/** Every route the corpus actually publishes — a chapter may not invent one. */
const GRAPH_ROUTES: Record<string, string> = (graph as { byRoute: Record<string, string> }).byRoute;
const GRAPH_NODES = (graph as { nodes: Record<string, { route: string; title: string }> }).nodes;

function routeExists(route: string): boolean {
  const r = route.endsWith('/') ? route : `${route}/`;
  return Boolean(GRAPH_ROUTES[r] ?? GRAPH_ROUTES[route]);
}
function titleOfRoute(route: string): string {
  const r = route.endsWith('/') ? route : `${route}/`;
  const path = GRAPH_ROUTES[r] ?? GRAPH_ROUTES[route];
  return (path && GRAPH_NODES[path]?.title) || route;
}

/* ---------------------------------------------------------------- helpers - */

/** "Pṛthu — the First King & the Milking of the Earth" → "Pṛthu". */
function shortTitle(t: string): string {
  const head = t.split(/\s+[—–]\s+/)[0] ?? t;
  const cut = head.split(/\s+\(/)[0] ?? head;
  return cut;
}

function clip(s: string, n: number): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).trimEnd()}…`;
}

/**
 * Labels are never truncated with an ellipsis any more (brief §4e): a label
 * that is too long for one line wraps to two, and one that would need three
 * loses its trailing clause instead. Two lines of 22 characters is what a
 * landmark plate holds at 390 px.
 */
function labelFor(t: string, maxChars = 44): string {
  const head = shortTitle(t).trim();
  if (head.length <= maxChars) return head;
  const words = head.split(/\s+/);
  const out: string[] = [];
  let n = 0;
  for (const w of words) {
    if (n + w.length + (out.length ? 1 : 0) > maxChars) break;
    out.push(w);
    n += w.length + (out.length > 1 ? 1 : 0);
  }
  return out.length ? out.join(' ') : head.slice(0, maxChars);
}

/* ---------------------------------------------------------------- types - */

export interface FilmPlace {
  id: string;
  slug: string;
  x: number;
  /** 0 = right at the verge (biggest), 1 = a step back, 2 = further back. */
  lane: 0 | 1 | 2;
  scale: number;
  /** Vertical offset from the road line, world px (negative = further up). */
  lift: number;
  /** A little rotation so the row never reads as a shelf. */
  tilt: number;
  film: Film;
  poster: ReturnType<typeof cardPoster>;
  label: string;
  labelHi: string | null;
}

export interface LandmarkStory {
  route: string;
  title: string;
}

/** One chapter of an age, standing on the far lane. The road's middle layer. */
export interface Landmark {
  id: string;
  /** World x (not multiplied). */
  wx: number;
  /** Laid-out x inside the far lane — `wx × FAR_FACTOR`. */
  x: number;
  /** Alternating so two neighbours never share a baseline. */
  ridge: 0 | 1;
  title: string;
  hi: string | null;
  line: string;
  stories: LandmarkStory[];
  /** Featured film slugs that belong to this chapter. */
  films: string[];
  /** Where "read this chapter" goes. */
  route: string;
  /** The illustrated face, when the chapter has art; else a carved glyph. */
  art: { src: string; srcset: string | null; w: number; h: number } | null;
  /** The emblem to carve when `art` is null. Never both, never neither. */
  glyph: string | null;
  /** `file — heading`, or the first event's citation. */
  source: string | null;
  /** Kali-history only: "c. 322–185 BCE". */
  dates: string | null;
  /** How many events sit under it (for the panel's meta line). */
  count: number;
  kind: 'chapter' | 'group';
  /** The neighbouring chapters, for the panel's "nearby" chips. */
  neighbours: string[];
}

/** Kali-history: one of the ten dated eras, standing at the roadside. */
export interface EraMarker {
  id: string;
  wx: number;
  /** Alternating heights, so ten markers fit the stretch without touching. */
  row: 0 | 1;
  numeral: string;
  name: string;
  dates: string;
  line: string;
  route: string;
  /** The era's plate, when the matching Kali-history chapter has one. */
  art: { src: string; srcset: string | null; w: number; h: number } | null;
  /** Else its carved emblem — an era marker is never a bare plate. */
  glyph: string | null;
}

/** The Future: manvantaras 8–14 drawn receding, then the Night. */
export interface RecedingGate {
  id: string;
  wx: number;
  n: number;
  name: string;
  line: string;
  route: string;
  /** 0 = nearest and largest, 1 = furthest and smallest. */
  depth: number;
}

export interface SkyPlace {
  id: string;
  /** Already multiplied by SKY_FACTOR. */
  x: number;
  /** 0..1 down the sky band. */
  y: number;
  scale: number;
  slug: string;
  film: Film;
  poster: ReturnType<typeof cardPoster>;
  label: string;
  labelHi: string | null;
}

export interface RegionLayout {
  def: RegionDef;
  index: number;
  x0: number;
  width: number;
  /** Where the gate's carved arch stands. */
  gateX: number;
  films: FilmPlace[];
  landmarks: Landmark[];
  eras: EraMarker[];
  gates: RecedingGate[];
  /** How many corpus events the whole period holds. */
  eventCount: number;
  groupCount: number;
  intro: string;
  route: string;
  /** True when the landmarks came from chapters.json rather than the fallback. */
  fromSpine: boolean;
}

/* ------------------------------------------------------------- constants - */

/** The two lanes that are not the road itself, and how fast they travel. */
export const FAR_FACTOR = 0.58;
export const SKY_FACTOR = 0.3;

/** A phone. Every width in this file is stated in screens of one. */
const SCREEN = 390;
const GATE_ZONE = 260; // clear road before the first place of an age
const TAIL = 180; // clear road after the last one
/** The brief's rule: no age shorter than one screen, none longer than ~5 —
 *  and that is the *whole* stretch, gate and tail included, not just its body. */
const MIN_BODY = Math.round(SCREEN * 0.9);
const MAX_BODY = Math.round(SCREEN * 4.2);

/**
 * ≤ 4 landmark labels on a phone screen. The far lane travels at FAR_FACTOR,
 * so two landmarks `d` world px apart are `d × FAR_FACTOR` apart on screen;
 * 104 px of screen between them is four labels across a 390 px phone.
 */
const LM_SCREEN_GAP = 116;
const LM_MIN_GAP = Math.round(LM_SCREEN_GAP / FAR_FACTOR); // ≈ 180 world px
/** Clear road after a gate before the first landmark may stand on a hill. */
const LM_START = 200;
/**
 * Era markers stand *on the road line* at 1 : 1 with the screen and are 138 px
 * wide, so ten of them in one row would need 1,700 px of road. They alternate
 * between two heights instead, which halves the pitch they need and reads as a
 * street of milestones rather than a picket fence.
 */
const ERA_PITCH = 132;

/** Deterministic jitter — the HTML is static, so the world must be too. */
function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/* --------------------------------------------------------------- the map - */

const ALL_FILMS = getFilms();
const FILM_BY_SLUG = new Map(ALL_FILMS.map((f) => [f.slug, f]));

/** Films of one period, published first — a road should offer a watchable
 *  place before a promised one. */
function filmsOf(slug: string): Film[] {
  return ALL_FILMS.filter((f) => f.periodSlug === slug).sort(
    (a, b) => Number(b.isPublic) - Number(a.isPublic),
  );
}

/** The film's short name for a label plate: the part before the em-dash. */
function filmLabel(f: Film): string {
  return labelFor(f.title.en, 34);
}

/**
 * The plates `scripts/media.mjs` built from `chapters.json`'s `art` (W4).
 * A chapter whose art is `{film, still}` points at the film's own tiers; one
 * whose art is `{asset: …}` has its own WebP under /media/chapters/. Either
 * way the road asks for the 400 tier and lets srcset take it to 800.
 */
const PLATES: Record<string, { src: string; srcset?: string; w: number; h: number }> =
  (mediaData as { chapters?: Record<string, { src: string; srcset?: string; w: number; h: number }> })
    .chapters ?? {};

function artOfPlate(id: string): Landmark['art'] {
  const p = PLATES[id];
  if (!p) return null;
  /* The frame is 54–68 px wide: the 400 tier is already generous, and asking
     for 800 on a phone would download 29 pictures nobody can see the detail
     of. srcset keeps the 2× screens honest. */
  const four = p.src.replace(/-800\.webp$/, '-400.webp');
  return { src: four, srcset: `${four} 400w, ${p.src} 800w`, w: p.w, h: p.h };
}

function artOfFilm(f: Film | undefined, stillIndex = 0): Landmark['art'] {
  if (!f) return null;
  const s = f.stills[stillIndex] ?? f.stills[0];
  if (s) {
    return {
      src: s.sizes[400],
      srcset: `${s.sizes[400]} 400w, ${s.sizes[800]} 800w`,
      w: s.width,
      h: s.height,
    };
  }
  const t = f.thumb;
  return t ? { src: t[400], srcset: `${t[400]} 400w, ${t[800]} 800w`, w: t.width, h: t.height } : null;
}

/* --------------------------------------------------------- the landmarks - */

/**
 * A period's chapters, if `chapters.json` names any; otherwise its biggest
 * event-groups. The fallback is deterministic and ordered — the biggest N by
 * event count, then put back into the corpus's own order — because the thing
 * K complained about ("stories spread everywhere") was an RNG sample.
 */
function landmarksOf(slug: string, x0: number, body: number): { list: Landmark[]; spine: boolean } {
  const span = Math.max(240, body - LM_START);
  /** How many will fit at four-labels-a-screen spacing. */
  const room = Math.max(3, Math.floor(span / LM_MIN_GAP) + 1);

  const chapters = CHAPTERS_BY_PERIOD[slug];
  const raw: Omit<Landmark, 'wx' | 'x' | 'ridge' | 'neighbours'>[] = [];

  if (chapters?.length) {
    for (const c of chapters) {
      const stories = (c.stories ?? [])
        .filter((r) => typeof r === 'string' && routeExists(r))
        .map((r) => ({ route: r, title: titleOfRoute(r) }));
      const films = (c.films ?? []).filter((s) => FILM_BY_SLUG.has(s));
      const heroRoute =
        (c.hero?.route && routeExists(c.hero.route) ? c.hero.route : null) ??
        stories[0]?.route ??
        (c.hero?.film ? FILM_BY_SLUG.get(c.hero.film)?.route : null) ??
        (films[0] ? FILM_BY_SLUG.get(films[0])!.route : null) ??
        `/clock/${slug}/`;
      /* The chapter's own plate first (W4) — it is the picture the period
         page shows too, so the road and the page never disagree. Then a film
         of the chapter's. Then the carved glyph the data names. */
      const plate = artOfPlate(c.id);
      const artFilm = plate
        ? undefined
        : (c.hero?.film && FILM_BY_SLUG.get(c.hero.film)) ||
          (films[0] && FILM_BY_SLUG.get(films[0])) ||
          undefined;
      const art = plate ?? artOfFilm(artFilm, c.art?.still ?? 0);
      raw.push({
        id: `ch-${c.id}`,
        title: labelFor(c.title, 44),
        hi: c.hi ?? null,
        line: c.line ?? '',
        stories,
        films,
        route: heroRoute,
        art,
        glyph: art ? null : (c.glyph ?? null),
        source: c.source?.file
          ? c.source.heading
            ? `${c.source.file} — ${c.source.heading.replace(/^#+\s*/, '')}`
            : c.source.file
          : null,
        dates: c.dates ?? null,
        count: stories.length,
        kind: 'chapter',
      });
    }
  } else {
    const groups = EVENTS[slug]?.groups ?? [];
    const picked = [...groups]
      .map((g, i) => ({ g, i }))
      .sort((a, b) => b.g.count - a.g.count || a.i - b.i)
      .slice(0, room)
      .sort((a, b) => a.i - b.i)
      .map((x) => x.g);
    for (const [i, g] of picked.entries()) {
      const first = g.events[0];
      raw.push({
        id: `wp-${slug}-${i}`,
        title: labelFor(g.title, 44),
        hi: null,
        line: first ? clip(first.description, 170) : '',
        stories: [{ route: g.route, title: g.title }],
        films: [],
        route: g.route,
        art: null,
        glyph: 'manuscript',
        source: first?.source ?? g.path,
        dates: null,
        count: g.count,
        kind: 'group',
      });
    }
  }

  if (!raw.length) return { list: [], spine: false };

  // Space them evenly across the body, then push apart anything that would put
  // a fifth label on a phone screen. A chapter list longer than the stretch
  // simply makes the stretch feel dense — never overlapping.
  const step = raw.length > 1 ? span / raw.length : 0;
  const list: Landmark[] = raw.map((r, i) => ({
    ...r,
    wx: Math.round(x0 + LM_START + step * (i + 0.5)),
    x: 0,
    ridge: (i % 2) as 0 | 1,
    neighbours: [],
  }));
  let lastX = -1e9;
  for (const lm of list) {
    if (lm.wx < lastX + LM_MIN_GAP) lm.wx = Math.round(lastX + LM_MIN_GAP);
    lastX = lm.wx;
  }
  for (const lm of list) lm.x = Math.round(lm.wx * FAR_FACTOR);
  // "Nearby" on a chapter panel means the chapters either side of it in time.
  list.forEach((lm, i) => {
    lm.neighbours = [list[i - 1]?.id, list[i + 1]?.id].filter(Boolean) as string[];
  });
  return { list, spine: Boolean(chapters?.length) };
}

/* ------------------------------------------------------------ the widths - */

/**
 * Width by content, in phone screens. The three terms are the three reasons to
 * slow down: a chapter to open, a film to watch, and the sheer mass of the
 * corpus behind the age (logged, or Kali-history's 1,539 events would swamp
 * Satya's 307).
 */
function bodyWidth(chapters: number, films: number, events: number): number {
  const raw = 0.3 * SCREEN + 80 * chapters + 46 * films + 150 * Math.log10(1 + events);
  return Math.round(Math.min(MAX_BODY, Math.max(MIN_BODY, raw)));
}

/** How many landmarks an age will end up with, before it is laid out. */
function landmarkCount(slug: string): number {
  const n = CHAPTERS_BY_PERIOD[slug]?.length;
  if (n) return n;
  const groups = EVENTS[slug]?.groups?.length ?? 0;
  return groups ? Math.max(3, Math.min(7, Math.round(Math.log10(1 + groups) * 3))) : 0;
}

/* --------------------------------------------------------- build a region - */

function buildRegion(def: RegionDef, index: number, x0: number): RegionLayout {
  const films = filmsOf(def.slug);
  const ev = EVENTS[def.slug];
  const eventCount = (ev?.groups ?? []).reduce((a, g) => a + g.count, 0);

  let body = bodyWidth(landmarkCount(def.slug), films.length, eventCount);

  // Kali-history is not a fog: it is a lit, dated stretch with ten era markers
  // standing at its roadside, and they need room to be read one at a time.
  const eras = def.slug === 'kali-yuga-history' ? ERAS : [];
  if (eras.length) body = Math.max(body, LM_START + eras.length * ERA_PITCH + 200);

  // The Future is one dramatic screen of receding gates, plus the Night. Not
  // four thousand pixels of mist.
  const manus = def.slug === 'future-manvantaras' ? FUTURE_MANUS : [];
  if (manus.length) body = Math.max(body, Math.round(SCREEN * 1.9));

  const width = GATE_ZONE + body + TAIL;
  const r = rng(index * 7919 + 3);

  /* ---- films: spread across the *whole* stretch, on three lanes ---------- */
  /**
   * The first cut packed them at a fixed pitch from the head of the age, which
   * left the back half of a long stretch with nothing standing on the road
   * line — the bottom half of the screen went bare. They now run edge to edge,
   * so wherever you stop there is a stele within a screen of you, and the three
   * lanes keep a crowded age (Dvāpara's 21) from becoming a wall.
   */
  const filmSpan = Math.max(0, body - 200);
  const placed: FilmPlace[] = films.map((f, i) => {
    /**
     * The public films lead. An unreleased one is a promise, not a place to
     * go — three "COMING SOON" seals in a row dominated a Dvāpara screen and
     * made the age look shut. So they take the back lane: smaller, further
     * from the road, dimmer (`[data-soon]` in terrain.css) — still standing,
     * still touchable, no longer the loudest thing on the screen.
     */
    const lane: 0 | 1 | 2 = f.isPublic ? ((i % 2 === 0 ? 0 : 1) as 0 | 1) : 2;
    const t = films.length > 1 ? i / (films.length - 1) : 0.42;
    const x = x0 + GATE_ZONE + 100 + filmSpan * t + (r() - 0.5) * 34;
    return {
      id: `film-${f.slug}`,
      slug: f.slug,
      x: Math.round(x),
      lane,
      scale: lane === 0 ? 1 : lane === 1 ? 0.78 : 0.6,
      lift: lane === 0 ? 0 : lane === 1 ? -46 : -86,
      tilt: (r() - 0.5) * 1.6,
      film: f,
      poster: cardPoster(f),
      label: filmLabel(f),
      labelHi: f.title.hi,
    };
  });

  /* -------------------------------------------------- era markers (Kali) -- */
  const eraSpan = Math.max(240, body - 260);
  /* The ten eras are 1:1 with Kali-history's ten chapters, in the same order,
     so era i wears chapter i's picture (or its glyph). */
  const eraChapters = CHAPTERS_BY_PERIOD['kali-yuga-history'] ?? [];
  const eraList: EraMarker[] = eras.map((e, i) => {
    const c = eraChapters[i];
    const art = c ? artOfPlate(c.id) : null;
    return {
      id: `era-${def.slug}-${i + 1}`,
      wx: Math.round(x0 + GATE_ZONE + 130 + (eraSpan / eras.length) * (i + 0.5)),
      row: (i % 2) as 0 | 1,
      numeral: e.numeral,
      name: e.name,
      dates: e.dates,
      line: e.line,
      route: e.route,
      art,
      glyph: art ? null : (c?.glyph ?? null),
    };
  });

  /* ------------------------------------------- receding gates (the Future) */
  const gateSpan = Math.round(SCREEN * 1.05);
  const gateList: RecedingGate[] = manus.map((m, i) => ({
    id: `manu-${m.n}`,
    // Perspective: the gap between gates shrinks as they recede, so seven of
    // them read as one avenue running away from you rather than seven posts.
    wx: Math.round(
      x0 + GATE_ZONE + 150 + gateSpan * (1 - (1 - i / manus.length) ** 1.7),
    ),
    n: m.n,
    name: m.name,
    line: m.line,
    route: m.route,
    depth: i / Math.max(1, manus.length - 1),
  }));

  const { list: landmarks, spine } = landmarksOf(def.slug, x0 + GATE_ZONE, body);

  return {
    def,
    index,
    x0,
    width,
    gateX: x0 + 150,
    films: placed,
    landmarks,
    eras: eraList,
    gates: gateList,
    eventCount,
    groupCount: (ev?.groups ?? []).length,
    intro: PERIOD_INTRO[def.slug] ?? '',
    route: `/clock/${def.slug}/`,
    fromSpine: spine,
  };
}

/** The prose line the corpus itself writes for each period (periods.json). */
const PERIOD_INTRO: Record<string, string> = {
  'before-time':
    'The creation accounts (Vedic, Upaniṣadic, Vaiṣṇava, Śaiva, Śākta) and the first emanations — catalogued as parallel variants, not a single sequence.',
  'earlier-manvantaras':
    'Events of the six manvantaras before ours, and the primordial kings/sages (Dhruva, Pṛthu, Vena, Daksha).',
  'satya-yuga': 'Dharma on four legs. The early avatars and the churning of the ocean.',
  'treta-yuga': 'Dharma on three legs. Vāmana, Paraśurāma, and the Rāmāyaṇa.',
  'dvapara-yuga': 'Dharma on two legs. Kṛṣṇa and the Mahābhārata.',
  'kali-yuga-scriptural':
    'Dharma on one leg. The current age (from 3102 BCE) and its prophesied end with Kalki.',
  'kali-yuga-history': 'The academic/historical timeline (flagged distinct from scripture).',
  'future-manvantaras': 'What the texts foretell after our age, up to the Night of Brahmā.',
  'cross-yuga':
    'Episodes the texts do not pin to one fixed age (recurring deva–asura wars, Śaiva/Śākta cycles).',
};

/* ------------------------------------------------------------ the world - */

const regions: RegionLayout[] = [];
let cursor = 0;
ROAD_REGIONS.forEach((def, i) => {
  const r = buildRegion(def, i, cursor);
  regions.push(r);
  cursor += r.width;
});

/**
 * The Night of Brahmā closes the road. It is the last screen and a half: the
 * Saṃvartaka fire, the rain, and the waters the journey began in.
 */
const lastRegion = regions[regions.length - 1]!;
export const NIGHT_X = lastRegion.x0 + lastRegion.width - Math.round(SCREEN * 0.55);
/** How much road the dissolution owns — the finale fades in across it. */
export const FINALE_SPAN = Math.round(SCREEN * 1.25);

export const WORLD_WIDTH = cursor;
export const NIGHT_GATE = NIGHT;

/** Cross-Yuga: the sky over the whole road, films spread across all of it. */
const skyFilms = ALL_FILMS.filter((f) => f.periodSlug === 'cross-yuga').sort(
  (a, b) => Number(b.isPublic) - Number(a.isPublic),
);
const skyRng = rng(4242);
export const SKY_PLACES: SkyPlace[] = skyFilms.map((f, i) => {
  const t = (i + 0.6) / (skyFilms.length + 0.2);
  return {
    id: `sky-${f.slug}`,
    x: Math.round(WORLD_WIDTH * t * SKY_FACTOR),
    y: 0.16 + (i % 3) * 0.13 + skyRng() * 0.05,
    scale: 0.78 + skyRng() * 0.2,
    slug: f.slug,
    film: f,
    poster: cardPoster(f),
    label: filmLabel(f),
    labelHi: f.title.hi,
  };
});

export const REGIONS = regions;
export const SKY = {
  ...SKY_REGION,
  intro: PERIOD_INTRO['cross-yuga'] ?? '',
  route: '/clock/cross-yuga/',
};

/** Every film that got placed, for the panel table and the index. */
export const PLACED_FILMS: { place: FilmPlace | SkyPlace; region: string }[] = [
  ...regions.flatMap((r) =>
    r.films.map((p) => ({ place: p as FilmPlace | SkyPlace, region: r.def.gate })),
  ),
  ...SKY_PLACES.map((p) => ({ place: p as FilmPlace | SkyPlace, region: 'Cross-Yuga' })),
];

export const ALL_LANDMARKS: Landmark[] = regions.flatMap((r) => r.landmarks);
export const ALL_ERAS: EraMarker[] = regions.flatMap((r) => r.eras);
export const ALL_GATES: RecedingGate[] = regions.flatMap((r) => r.gates);

export const WORLD_STATS = {
  films: PLACED_FILMS.length,
  published: PLACED_FILMS.filter((p) => p.place.film.isPublic).length,
  landmarks: ALL_LANDMARKS.length,
  chapters: ALL_LANDMARKS.filter((l) => l.kind === 'chapter').length,
  width: WORLD_WIDTH,
  screens: Math.round(WORLD_WIDTH / SCREEN),
};
