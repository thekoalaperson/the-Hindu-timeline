/**
 * data.ts — build-time composition for the "Layered scenes" concept.
 *
 * Nine scenes, one per cosmic period (periods.json order), each built from:
 *   · a SKY still   — darkened + blurred, the age's atmosphere
 *   · a MID still   — the age's signature image, Ken-Burns drifting
 *   · FORE hotspots — the age's films (painted frames, real art) followed by
 *                     curated corpus places (inked plaques)
 *
 * Nothing here reaches the client bundle: it is imported only from .astro
 * frontmatter. The client script reads everything it needs off the DOM.
 *
 * Sources for the structure drawn (nine ages, the yuga lines on the chapter
 * cards): 00-time-and-cosmology/yugas-and-mahayuga.md,
 * 00-time-and-cosmology/manvantara-system.md,
 * 00-time-and-cosmology/kalpa-and-pralaya.md.
 */
import periodsData from '../../generated/periods.json';
import evBefore from '../../generated/events/before-time.json';
import evCross from '../../generated/events/cross-yuga.json';
import evDvapara from '../../generated/events/dvapara-yuga.json';
import evEarlier from '../../generated/events/earlier-manvantaras.json';
import evFuture from '../../generated/events/future-manvantaras.json';
import evKaliH from '../../generated/events/kali-yuga-history.json';
import evKaliS from '../../generated/events/kali-yuga-scriptural.json';
import evSatya from '../../generated/events/satya-yuga.json';
import evTreta from '../../generated/events/treta-yuga.json';
import { nodeForRoute } from '../../lib/graph.ts';
import { type Film, embedSrc, getFilms } from '../../lib/films.ts';

/* ------------------------------------------------------------------ types - */

export interface SceneImage {
  s400: string;
  s800: string;
  s1600: string;
  width: number;
  height: number;
  lqip: string;
  alt: string;
  caption: string | null;
  /** The film the pixels come from — shown as provenance on borrowed art. */
  from: string;
}

export interface Hotspot {
  kind: 'film' | 'place';
  /** DOM id stem, unique across the page. */
  id: string;
  /** Where a JS-less tap goes. */
  href: string;
  title: string;
  titleHi: string | null;
  /** One short line under the title. */
  meta: string;
  image: SceneImage | null;
  coming: boolean;
  /* --- panel payload --- */
  summary: string;
  poster: { src: string; width: number; height: number; lqip: string } | null;
  embed: string | null;
  links: { label: string; href: string }[];
  bullets: string[];
}

export interface Scene {
  slug: string;
  short: string;
  name: string;
  intro: string;
  route: string;
  count: number;
  groupCount: number;
  /** One true, cited line about the age. */
  line: string;
  cite: string;
  sky: SceneImage;
  mid: SceneImage;
  hotspots: Hotspot[];
  /** Hotspots chunked into panels of three. */
  panels: Hotspot[][];
  /** Index of this scene's first panel in the global ribbon (filled below). */
  firstPanel: number;
  panelCount: number;
}

/* --------------------------------------------------------- editorial data - */

/** film slug + still index for each scene's two painted layers. */
const ART: Record<string, { sky: [string, number]; mid: [string, number] }> = {
  'before-time': { sky: ['varaha', 0], mid: ['lingodbhava', 1] },
  'earlier-manvantaras': { sky: ['dhruva', 3], mid: ['tripura', 0] },
  'satya-yuga': { sky: ['manthan', 3], mid: ['manthan', 0] },
  'treta-yuga': { sky: ['parashurama', 0], mid: ['vamana', 1] },
  'dvapara-yuga': { sky: ['govardhan', 1], mid: ['bhagavad-gita-vishvarupa', 3] },
  'kali-yuga-scriptural': { sky: ['origin-of-jagannath', 0], mid: ['origin-of-jagannath', 1] },
  'kali-yuga-history': { sky: ['vaishno-devi-bhairavnath', 1], mid: ['vaishno-devi-bhairavnath', 0] },
  'future-manvantaras': { sky: ['matsya', 3], mid: ['matsya', 2] },
  'cross-yuga': { sky: ['savitri', 0], mid: ['mahishasura', 0] },
};

/** One line per age, drawn from the corpus and cited on the chapter card. */
const LINE: Record<string, { line: string; cite: string }> = {
  'before-time': {
    line: 'No single creation at t=0. The cosmos is breathed out and dissolved in nested, repeating wheels.',
    cite: '00-time-and-cosmology/cosmogony-creation-accounts.md',
  },
  'earlier-manvantaras': {
    line: 'One Manu to each manvantara, seventy-one mahāyugas long; six have already closed before ours.',
    cite: '00-time-and-cosmology/manvantara-system.md',
  },
  'satya-yuga': {
    line: 'Dharma on four legs. Humans live a hundred thousand years, and meditation is the path.',
    cite: '00-time-and-cosmology/yugas-and-mahayuga.md',
  },
  'treta-yuga': {
    line: 'Dharma on three legs. Sacrifice becomes the path, and kingship rises to defend it.',
    cite: '00-time-and-cosmology/yugas-and-mahayuga.md',
  },
  'dvapara-yuga': {
    line: 'Dharma on two legs — compassion and truth. The Vedas are divided, because memory has weakened.',
    cite: '00-time-and-cosmology/yugas-and-mahayuga.md',
  },
  'kali-yuga-scriptural': {
    line: 'Dharma on one leg. Only truth is left standing, and even that is assailed.',
    cite: '00-time-and-cosmology/yugas-and-mahayuga.md',
  },
  'kali-yuga-history': {
    line: 'The same age, told by dated evidence: temples, teachers, manuscripts, reform.',
    cite: '00-time-and-cosmology/yugas-and-mahayuga.md',
  },
  'future-manvantaras': {
    line: 'Seven Manus still to come. When the fourteenth closes, the Day of Brahmā ends and the worlds rest.',
    cite: '00-time-and-cosmology/kalpa-and-pralaya.md',
  },
  'cross-yuga': {
    line: 'Episodes the texts do not pin to one age — the wars and cycles that recur whenever they are needed.',
    cite: '00-time-and-cosmology/kalachakra-wheel-of-time.md',
  },
};

/** Curated corpus places per age — routes taken from events/<period>.json. */
const PLACES: Record<string, string[]> = {
  'before-time': [
    '/cosmology/cosmogony-creation-accounts/',
    '/cosmology/bila-svarga-and-the-patalas/',
    '/beings/the-prajapatis/',
    '/stories/kashyapa/',
  ],
  'earlier-manvantaras': [
    '/manvantaras/manvantara-01-svayambhuva/',
    '/stories/prithu-prithvi/',
    '/stories/rishabha-bharata-jada/',
    '/stories/cyavana-sukanya/',
  ],
  'satya-yuga': [
    '/beings/asura-wars-and-roster/',
    '/lineages/sagara/',
    '/places/gangasagar-sagara-dvipa-kapila-ashram/',
    '/lineages/suryavamsha-and-chandravamsha/',
  ],
  'treta-yuga': [
    '/stories/ramayana/1-bala-kanda/',
    '/stories/ramayana/2-ayodhya-kanda/',
    '/stories/ramayana/3-aranya-kanda/',
    '/stories/ramayana/5-sundara-kanda/',
    '/stories/ramayana/6-yuddha-kanda/',
    '/stories/vishwamitra-vasishtha/',
  ],
  'dvapara-yuga': ['/stories/krishna-lila/', '/stories/karna/', '/stories/nala-damayanti/'],
  'kali-yuga-scriptural': [
    '/deities/shiva-tiruvilaiyadal-64-lilas/',
    '/stories/astika-sarpa-satra/',
    '/places/naimisharanya-chakra-tirtha/',
    '/deities/devi-meenakshi/',
    '/stories/nachiketa-katha-upanishad/',
    '/stories/citraketu/',
  ],
  'kali-yuga-history': [
    '/teachers/nimbarka-vallabha-chaitanya/',
    '/teachers/the-nalvar-tamil-shaiva-saints/',
    '/teachers/lingayat-vachana-poets/',
    '/deities/gramadevatas-village-deities/',
    '/cosmology/siddhantic-astronomy-and-astronomers/',
    '/teachers/modern-teachers-and-reform/',
  ],
  'future-manvantaras': [
    '/stories/kalki/',
    '/manvantaras/manvantara-08-savarni/',
    '/manvantaras/manvantara-13-deva-savarni/',
    '/manvantaras/manvantara-14-indra-savarni/',
    '/cosmology/brahma-lifetime/',
    '/cosmology/manvantara-system/',
  ],
  'cross-yuga': [
    '/deities/devi-mahatmya-and-the-great-goddess/',
    '/deities/shiva-myth-cycle/',
    '/places/sthala-puranas-major-temples/',
    '/deities/lalita-bhandasura/',
  ],
};

/* ------------------------------------------------------------- assembling - */

const FILMS = getFilms();
const filmBySlug = new Map(FILMS.map((f) => [f.slug, f]));

interface RawGroup {
  route: string;
  title: string;
  section: string;
  count: number;
  events: { title: string; description?: string }[];
}
const EVENTS: Record<string, RawGroup[]> = {
  'before-time': evBefore.groups as RawGroup[],
  'earlier-manvantaras': evEarlier.groups as RawGroup[],
  'satya-yuga': evSatya.groups as RawGroup[],
  'treta-yuga': evTreta.groups as RawGroup[],
  'dvapara-yuga': evDvapara.groups as RawGroup[],
  'kali-yuga-scriptural': evKaliS.groups as RawGroup[],
  'kali-yuga-history': evKaliH.groups as RawGroup[],
  'future-manvantaras': evFuture.groups as RawGroup[],
  'cross-yuga': evCross.groups as RawGroup[],
};

function stillOf(slug: string, index: number): SceneImage {
  const film = filmBySlug.get(slug);
  const st = film?.stills[index];
  if (!film || !st) throw new Error(`scenes: no still ${slug}[${index}]`);
  return {
    s400: st.sizes[400],
    s800: st.sizes[800],
    s1600: st.sizes[1600],
    width: st.width,
    height: st.height,
    lqip: st.lqip,
    alt: st.alt,
    caption: st.caption ?? null,
    from: film.title.en,
  };
}

function filmHotspot(film: Film, i: number): Hotspot {
  const still = film.stills[i % Math.max(film.stills.length, 1)] ?? film.stills[0];
  const hero = film.stills[0];
  const corpus = film.corpus[0];
  const links: { label: string; href: string }[] = [];
  if (corpus) links.push({ label: 'Read the story', href: corpus.route });
  links.push({ label: 'Film page', href: film.route });
  return {
    kind: 'film',
    id: `f-${film.slug}`,
    href: film.route,
    title: film.title.en.split('—')[0]!.trim(),
    titleHi: film.title.hi,
    meta: film.isPublic ? (film.duration ?? 'Film') : 'Coming soon',
    image: still
      ? {
          s400: still.sizes[400],
          s800: still.sizes[800],
          s1600: still.sizes[1600],
          width: still.width,
          height: still.height,
          lqip: still.lqip,
          alt: still.alt,
          caption: still.caption ?? null,
          from: film.title.en,
        }
      : null,
    coming: !film.isPublic,
    summary: film.summary,
    poster:
      film.isPublic && hero
        ? { src: hero.sizes[800], width: hero.width, height: hero.height, lqip: hero.lqip }
        : null,
    embed: film.isPublic && film.yt.videoId ? embedSrc(film.yt.videoId) : null,
    links,
    bullets: [],
  };
}

function placeHotspot(slug: string, route: string, group: RawGroup | undefined): Hotspot | null {
  const node = nodeForRoute(route);
  if (!node && !group) return null;
  const title = group?.title ?? node?.title ?? route;
  const section = group?.section ?? node?.sectionLabel ?? '';
  const count = group?.count ?? node?.eventCount ?? 0;
  const dek = node?.dek ?? '';
  const bullets = (group?.events ?? [])
    .slice(0, 3)
    .map((e) => e.title)
    .filter(Boolean);
  return {
    kind: 'place',
    id: `p-${slug}-${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`,
    href: route,
    title: title.split('—')[0]!.trim(),
    titleHi: null,
    meta: count ? `${section} · ${count} events` : section,
    image: null,
    coming: false,
    summary: dek,
    poster: null,
    embed: null,
    links: [{ label: 'Read the page', href: route }],
    bullets,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface RawPeriod {
  slug: string;
  name: string;
  short: string;
  intro: string;
  route: string;
  count: number;
  groupCount: number;
}

export const scenes: Scene[] = [];
let cursor = 0;

for (const p of periodsData as RawPeriod[]) {
  const art = ART[p.slug]!;
  const meta = LINE[p.slug]!;
  const films = FILMS.filter((f) => f.periodSlug === p.slug);
  const filmRoutes = new Set(films.flatMap((f) => f.corpus.map((c) => c.route)));
  const groups = EVENTS[p.slug] ?? [];
  const byRoute = new Map(groups.map((g) => [g.route, g]));

  const hotspots: Hotspot[] = films.map(filmHotspot);
  for (const route of PLACES[p.slug] ?? []) {
    if (filmRoutes.has(route)) continue;
    const hs = placeHotspot(p.slug, route, byRoute.get(route));
    if (hs) hotspots.push(hs);
  }

  const panels = chunk(hotspots, 3);
  // +1 for the chapter card that opens every scene.
  const panelCount = panels.length + 1;
  scenes.push({
    slug: p.slug,
    short: p.short,
    name: p.name,
    intro: p.intro,
    route: p.route,
    count: p.count,
    groupCount: p.groupCount,
    line: meta.line,
    cite: meta.cite,
    sky: stillOf(art.sky[0], art.sky[1]),
    mid: stillOf(art.mid[0], art.mid[1]),
    hotspots,
    panels,
    firstPanel: cursor,
    panelCount,
  });
  cursor += panelCount;
}

export const totalPanels = cursor;
export const totalPlaced = scenes.reduce((a, s) => a + s.hotspots.length, 0);
export const totalFilms = scenes.reduce(
  (a, s) => a + s.hotspots.filter((h) => h.kind === 'film').length,
  0,
);

/**
 * Three composition templates, cycled per panel. Values are the CENTRE of each
 * frame in percent of the panel box, plus a size class and a paint-pin tilt.
 * Centres stay inside 24–76% × 22–74% so no frame can clip at either 390×844
 * or 1280×800; landscape spreads x outward in CSS.
 */
export const TEMPLATES: { x: number; y: number; size: 'l' | 'm' | 's'; tilt: number }[][] = [
  [
    { x: 32, y: 28, size: 'l', tilt: -1.6 },
    { x: 68, y: 54, size: 'm', tilt: 1.4 },
    { x: 36, y: 74, size: 's', tilt: -0.8 },
  ],
  [
    { x: 66, y: 26, size: 'm', tilt: 1.2 },
    { x: 34, y: 52, size: 'l', tilt: -1.1 },
    { x: 68, y: 74, size: 's', tilt: 1.7 },
  ],
  [
    { x: 34, y: 24, size: 's', tilt: 1.5 },
    { x: 60, y: 48, size: 'l', tilt: -1.3 },
    { x: 33, y: 72, size: 'm', tilt: 0.9 },
  ],
];
