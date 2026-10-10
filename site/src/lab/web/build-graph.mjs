/**
 * build-graph.mjs — the web of stories, precomputed.
 *
 * Concept C ("The web of stories") renders a constellation of ~170 illustrated
 * nodes on a phone. A phone must never run a cold force simulation, so the
 * whole layout is solved here, at authoring time, and shipped as positions.
 *
 *   node ../src/lab/web/build-graph.mjs        (from site/)
 *   → src/lab/web/data/web-graph.json
 *
 * Everything in the output is derived from data already in the repo:
 *   src/generated/graph.json          routes, titles, deks, backlinks, periods
 *   src/generated/events/<period>.json  story groups and their actors
 *   src/generated/periods.json        the nine ages in cosmic order
 *   src/data/featured.json            the 50 films
 *   src/generated/media-manifest.json the still tiers actually on disk
 *
 * No relation here is invented. Edges are: a film to the corpus page it
 * animates; a corpus page to a corpus page it actually links to; two pages
 * that share three or more named actors across their timeline events; and
 * consecutive films inside one YouTube playlist.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(HERE, '../../..');
const read = (p) => JSON.parse(readFileSync(resolve(SITE, p), 'utf8'));

const graph = read('src/generated/graph.json');
const periods = read('src/generated/periods.json');
const featured = read('src/data/featured.json');
const media = read('src/generated/media-manifest.json');

const PERIOD_SLUGS = periods.map((p) => p.slug);
const PERIOD_INDEX = new Map(PERIOD_SLUGS.map((s, i) => [s, i]));

/* ------------------------------------------------------------- actors --- */
/** path → Set(actor). Built from every event of every period. */
const actorsByPath = new Map();
/** actor → number of paths it appears in (rare actors are the strong signal) */
const actorFreq = new Map();
for (const slug of PERIOD_SLUGS) {
  const file = read(`src/generated/events/${slug}.json`);
  for (const group of file.groups ?? []) {
    let set = actorsByPath.get(group.path);
    if (!set) actorsByPath.set(group.path, (set = new Set()));
    for (const ev of group.events ?? []) for (const a of ev.actors ?? []) set.add(a);
  }
}
for (const set of actorsByPath.values()) {
  for (const a of set) actorFreq.set(a, (actorFreq.get(a) ?? 0) + 1);
}

/* ------------------------------------------------------ period mapping --- */
const PERIOD_EXACT = {
  'before time': 'before-time',
  'earlier manvantaras': 'earlier-manvantaras',
  'satya yuga': 'satya-yuga',
  'krta yuga': 'satya-yuga',
  'treta yuga': 'treta-yuga',
  'dvapara yuga': 'dvapara-yuga',
  'future manvantaras': 'future-manvantaras',
  'cross yuga': 'cross-yuga',
};
const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function periodSlugFor(label) {
  if (!label) return null;
  const full = fold(label);
  if (full.includes('kali')) {
    return /\b(history|historical|documented)\b/.test(full) ? 'kali-yuga-history' : 'kali-yuga-scriptural';
  }
  if (full.startsWith('cross yuga')) return 'cross-yuga';
  const primary = fold(label.replace(/\([^)]*\)/g, '').split('/')[0] ?? '');
  return PERIOD_EXACT[primary] ?? PERIOD_EXACT[full] ?? (PERIOD_SLUGS.includes(full.replace(/ /g, '-')) ? full.replace(/ /g, '-') : null);
}

/** A corpus page's age: its stated cosmic address, else where most of its events fall. */
function periodForNode(n) {
  if (n.cosmicAddress && PERIOD_INDEX.has(n.cosmicAddress)) return n.cosmicAddress;
  const entries = Object.entries(n.periods ?? {});
  if (entries.length === 0) return 'cross-yuga';
  entries.sort((a, b) => b[1] - a[1]);
  return PERIOD_INDEX.has(entries[0][0]) ? entries[0][0] : 'cross-yuga';
}

/* ---------------------------------------------------------- selection --- */
const SECTION_ROOTS = new Set(graph.sections.map((s) => s.route));
const norm = (r) => (r.endsWith('/') ? r : `${r}/`);

/** Section → how many of its best-linked pages join the web. */
const QUOTA = {
  '02-deities-and-cosmic-hierarchy': 20,
  '04-deep-dives': 30,
  '06-sacred-geography': 14,
  '08-beings-and-bestiary': 10,
  '90-literature-corpus': 8,
  '00-time-and-cosmology': 7,
  '03-lineages-vamsha': 5,
  '05-concepts-and-dharma': 5,
  '09-artifacts-symbols-and-arts': 4,
  '07-acharyas-and-sampradayas': 4,
};

/** Pages the web should never be without, whatever the backlink count says. */
const ALWAYS = [
  '/deities/dashavatara/',
  '/deities/shiva-myth-cycle/',
  '/deities/trimurti-and-tridevi/',
  '/deities/devi-mahatmya-and-the-great-goddess/',
  '/deities/ganesha-and-kartikeya/',
  '/deities/hanuman/',
  '/stories/krishna-lila/',
  '/stories/ramayana/',
  '/stories/mahabharata/',
  '/stories/samudra-manthana/',
  '/stories/bhagavad-gita/',
  '/places/meru-kailash-and-cosmic-mountains/',
  '/places/ayodhya/',
  '/places/mathura-vrindavan-braj/',
  '/places/kurukshetra-dharmakshetra/',
  '/places/dwarka-bet-dwarka-saurashtra/',
  '/places/kashi-varanasi/',
  '/places/lanka-ramayana-trail-ashoka-vatika/',
  '/cosmology/yugas-and-mahayuga/',
  '/cosmology/kalpa-and-pralaya/',
  '/beings/garuda/',
  '/beings/nagas-and-serpents/',
  '/beings/asura-wars-and-roster/',
];

const nodeByRoute = new Map();
for (const n of Object.values(graph.nodes)) nodeByRoute.set(n.route, n);

const chosen = new Map(); // route → { n, why }
function take(route, why) {
  const r = norm(route);
  if (chosen.has(r)) return true;
  const n = nodeByRoute.get(r);
  if (!n) return false;
  if (SECTION_ROOTS.has(r) || r === '/' || r.startsWith('/clock/') || r.startsWith('/about/') || r === '/sources/') return false;
  if (r.startsWith('/manvantaras/')) return false; // the ages themselves are the rail, not nodes
  chosen.set(r, { n, why });
  return true;
}

// 1. every corpus page a film animates
for (const f of featured) for (const c of f.corpus ?? []) take(c.route, 'film');
// 2. the named greats
for (const r of ALWAYS) take(r, 'always');
// 3. the best-linked of each section, to quota
const bySection = new Map();
for (const n of Object.values(graph.nodes)) {
  if (!QUOTA[n.section]) continue;
  const list = bySection.get(n.section) ?? [];
  list.push(n);
  bySection.set(n.section, list);
}
for (const [section, list] of bySection) {
  list.sort((a, b) => (b.backlinks?.total ?? 0) - (a.backlinks?.total ?? 0));
  let added = [...chosen.values()].filter((c) => c.n.section === section).length;
  for (const n of list) {
    if (added >= QUOTA[section]) break;
    if (take(n.route, 'rank')) added += 1;
  }
}

/* ------------------------------------------------------------- labels --- */
const DROP_TAIL = /\s+—\s+(index|overview.*|.*index)$/i;
function shortLabel(title) {
  let t = title.replace(DROP_TAIL, '');
  t = t.split(' — ')[0].split(' / ')[0];
  t = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (t.length > 30) {
    const cut = t.slice(0, 30);
    const sp = cut.lastIndexOf(' ');
    t = `${(sp > 14 ? cut.slice(0, sp) : cut).replace(/[,:;·]$/, '')}…`;
  }
  return t;
}

/* -------------------------------------------------------------- nodes --- */
const nodes = [];
const indexById = new Map();

function push(node) {
  indexById.set(node.id, nodes.length);
  nodes.push(node);
  return node;
}

// films first — they are the anchors of the web
const filmMedia = media.films ?? {};
for (const f of featured) {
  const m = filmMedia[f.slug] ?? {};
  const still = (m.stills ?? [])[0] ?? null;
  const pslug = periodSlugFor(f.period) ?? 'cross-yuga';
  const corpusRoutes = (f.corpus ?? []).map((c) => norm(c.route)).filter((r) => chosen.has(r));
  push({
    id: `f:${f.slug}`,
    kind: 'film',
    slug: f.slug,
    title: f.title.en,
    hi: f.title.hi ?? null,
    label: shortLabel(f.title.en),
    period: pslug,
    p: PERIOD_INDEX.get(pslug) ?? 8,
    live: f.yt.status === 'public',
    video: f.yt.videoId ?? null,
    route: `/films/${f.slug}/`,
    read: corpusRoutes[0] ?? (f.corpus?.[0] ? norm(f.corpus[0].route) : null),
    summary: f.summary ?? '',
    img: still ? still.sizes['400'] : m.thumb ? m.thumb['400'] : null,
    img8: still ? still.sizes['800'] : m.thumb ? m.thumb['800'] : null,
    lq: still ? still.lqip : (m.thumb?.lqip ?? null),
    alt: still?.alt ?? f.title.en,
    caption: still?.caption ?? null,
    corpus: corpusRoutes,
    paths: (f.corpus ?? []).map((c) => c.path),
    weight: 3,
  });
}

for (const [route, { n }] of chosen) {
  const pslug = periodForNode(n);
  push({
    id: `p:${route}`,
    kind: 'page',
    section: n.sectionSlug ?? 'corpus',
    sectionLabel: n.sectionLabel,
    title: n.title,
    label: shortLabel(n.title),
    period: pslug,
    p: PERIOD_INDEX.get(pslug) ?? 8,
    route,
    read: route,
    summary: (n.dek ?? '').replace(/\s+/g, ' ').trim(),
    backlinks: n.backlinks?.total ?? 0,
    events: n.eventCount ?? 0,
    minutes: n.readingMinutes ?? 0,
    path: n.path,
    img: null,
    img8: null,
    lq: null,
    weight: 1,
  });
}

/* --------------------------------------- art for the corpus-page nodes --- */
/* A page only ever borrows a still from a film that actually animates it, or
   from a film whose pages share at least three named actors with it. Every
   borrowed still is credited to its film in the panel. */
const filmsForRoute = new Map();
for (const f of featured) for (const c of f.corpus ?? []) {
  const r = norm(c.route);
  const list = filmsForRoute.get(r) ?? [];
  list.push(f.slug);
  filmsForRoute.set(r, list);
}
const filmBySlug = new Map(featured.map((f) => [f.slug, f]));
const filmNodeBySlug = new Map(nodes.filter((n) => n.kind === 'film').map((n) => [n.slug, n]));

/** Rare actors carry the signal; "Viṣṇu" in 300 pages does not. */
function strongActors(paths) {
  const out = new Set();
  for (const p of paths) {
    for (const a of actorsByPath.get(p) ?? []) if ((actorFreq.get(a) ?? 0) <= 40) out.add(a);
  }
  return out;
}
const filmActors = new Map(featured.map((f) => [f.slug, strongActors(f.corpus?.map((c) => c.path) ?? [])]));

function overlap(a, b) {
  let k = 0;
  for (const x of a) if (b.has(x)) k += 1;
  return k;
}

let borrowed = 0;
for (const node of nodes) {
  if (node.kind !== 'page') continue;
  let pick = (filmsForRoute.get(node.route) ?? [])[0] ?? null;
  let via = 'animates';
  if (!pick) {
    const mine = strongActors([node.path]);
    if (mine.size >= 3) {
      let best = null;
      let bestK = 2;
      for (const [slug, set] of filmActors) {
        const k = overlap(mine, set);
        if (k > bestK) {
          bestK = k;
          best = slug;
        }
      }
      if (best) {
        pick = best;
        via = 'actors';
      }
    }
  }
  if (!pick) continue;
  const fm = filmMedia[pick];
  const stills = fm?.stills ?? [];
  if (stills.length === 0) continue;
  // deterministic, spread across a film's stills so neighbours differ
  let h = 0;
  for (let i = 0; i < node.route.length; i += 1) h = (h * 31 + node.route.charCodeAt(i)) >>> 0;
  const st = stills[h % stills.length];
  node.img = st.sizes['400'];
  node.img8 = st.sizes['800'];
  node.lq = st.lqip;
  node.alt = st.alt;
  node.artFilm = pick;
  node.artFilmTitle = filmBySlug.get(pick).title.en;
  node.artVia = via;
  borrowed += 1;
}

/* -------------------------------------------------------------- radii --- */
const maxBack = Math.max(...nodes.filter((n) => n.kind === 'page').map((n) => n.backlinks ?? 0), 1);
for (const n of nodes) {
  if (n.kind === 'film') {
    const reach = n.corpus.length;
    n.r = Math.round(31 + Math.min(reach, 4) * 2.6);
  } else {
    const t = Math.sqrt((n.backlinks ?? 0) / maxBack);
    n.r = Math.round(11 + t * 21);
  }
}

/* -------------------------------------------------------------- edges --- */
const edgeMap = new Map();
function link(a, b, w, kind) {
  if (a === b) return;
  const i = indexById.get(a);
  const j = indexById.get(b);
  if (i === undefined || j === undefined) return;
  const key = i < j ? `${i}|${j}` : `${j}|${i}`;
  const prev = edgeMap.get(key);
  if (prev) {
    prev.w = Math.max(prev.w, w);
    if (!prev.kinds.includes(kind)) prev.kinds.push(kind);
    return;
  }
  edgeMap.set(key, { i: Math.min(i, j), j: Math.max(i, j), w, kinds: [kind] });
}

// a) a film and the page it animates
for (const n of nodes) {
  if (n.kind !== 'film') continue;
  for (const r of n.corpus) link(n.id, `p:${r}`, 3, 'animates');
}
// b) a page and a page it actually links to (graph backlinks, both ends placed)
const placedRoutes = new Set(nodes.filter((n) => n.kind === 'page').map((n) => n.route));
const linkCandidates = [];
for (const n of nodes) {
  if (n.kind !== 'page') continue;
  const src = graph.nodes[n.path];
  for (const from of src.backlinks?.routes ?? []) {
    const fr = norm(from);
    if (!placedRoutes.has(fr) || fr === n.route) continue;
    const other = nodes[indexById.get(`p:${fr}`)];
    linkCandidates.push({ a: n.id, b: `p:${fr}`, score: Math.min(n.r, other.r) + (n.backlinks + other.backlinks) / 400 });
  }
}
linkCandidates.sort((x, y) => y.score - x.score);
const degree = new Map();
const deg = (id) => degree.get(id) ?? 0;
for (const c of linkCandidates) {
  if (deg(c.a) >= 7 || deg(c.b) >= 7) continue;
  const before = edgeMap.size;
  link(c.a, c.b, 1, 'links');
  if (edgeMap.size > before) {
    degree.set(c.a, deg(c.a) + 1);
    degree.set(c.b, deg(c.b) + 1);
  }
}
// c) shared named actors across timeline events
const actorSets = nodes.map((n) => (n.kind === 'film' ? filmActors.get(n.slug) : strongActors([n.path])));
const shareCandidates = [];
for (let i = 0; i < nodes.length; i += 1) {
  const A = actorSets[i];
  if (!A || A.size < 3) continue;
  for (let j = i + 1; j < nodes.length; j += 1) {
    const B = actorSets[j];
    if (!B || B.size < 3) continue;
    const k = overlap(A, B);
    if (k >= 3) shareCandidates.push({ a: nodes[i].id, b: nodes[j].id, k });
  }
}
shareCandidates.sort((x, y) => y.k - x.k);
const shareDeg = new Map();
for (const c of shareCandidates.slice(0, 4000)) {
  const da = shareDeg.get(c.a) ?? 0;
  const db = shareDeg.get(c.b) ?? 0;
  if (da >= 4 || db >= 4) continue;
  const before = edgeMap.size;
  link(c.a, c.b, 1 + Math.min(2, c.k / 4), 'actors');
  if (edgeMap.size > before) {
    shareDeg.set(c.a, da + 1);
    shareDeg.set(c.b, db + 1);
  }
}
// d) consecutive films inside one playlist — a visible strand of one series
const playlists = new Map();
for (const f of featured) for (const pl of f.playlists ?? []) {
  if (!pl.name) continue;
  const list = playlists.get(pl.name) ?? [];
  list.push(f);
  playlists.set(pl.name, list);
}
for (const [, list] of playlists) {
  list.sort((a, b) => a.ep - b.ep);
  for (let i = 1; i < list.length; i += 1) link(`f:${list[i - 1].slug}`, `f:${list[i].slug}`, 1.4, 'series');
}

// e) nothing may float: an unlinked node joins the best-linked node of its age
{
  const degSoFar = new Map();
  for (const e of edgeMap.values()) {
    const a = nodes[e.i].id;
    const b = nodes[e.j].id;
    degSoFar.set(a, (degSoFar.get(a) ?? 0) + 1);
    degSoFar.set(b, (degSoFar.get(b) ?? 0) + 1);
  }
  for (const n of nodes) {
    if ((degSoFar.get(n.id) ?? 0) > 0) continue;
    const host = nodes
      .filter((o) => o.id !== n.id && o.p === n.p && (degSoFar.get(o.id) ?? 0) > 0)
      .sort((a, b) => b.r - a.r)[0];
    if (host) link(n.id, host.id, 0.8, 'age');
  }
}

const edges = [...edgeMap.values()];

/* ------------------------------------------------------------- layout --- */
/* Force-directed, annealed, with a horizontal age field. Ages run left to
   right in cosmic order (periods.json), each band widened by the square root
   of its population so the crowded ages get room. */
const bandW = PERIOD_SLUGS.map((slug) => {
  const k = nodes.filter((n) => n.period === slug).length;
  return 150 + Math.sqrt(k) * 220;
});
const bandX = [];
let acc = 0;
for (let i = 0; i < bandW.length; i += 1) {
  bandX.push(acc + bandW[i] / 2);
  acc += bandW[i];
}
const WORLD_W = acc;
const WORLD_H = 2350;

let seed = 20260906;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

for (const n of nodes) {
  n.x = bandX[n.p] + (rnd() - 0.5) * bandW[n.p] * 0.7;
  n.y = (rnd() - 0.5) * WORLD_H * 0.8;
  n.vx = 0;
  n.vy = 0;
}

const adj = nodes.map(() => []);
for (const e of edges) {
  adj[e.i].push(e);
  adj[e.j].push(e);
}

const ITER = 900;
for (let it = 0; it < ITER; it += 1) {
  const alpha = 0.9 * (1 - it / ITER) ** 1.4 + 0.02;

  // repulsion (n is ~170; the full pair loop is cheap and exact)
  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d2 = dx * dx + dy * dy;
      if (d2 > 780 * 780) continue;
      if (d2 < 1) {
        dx = rnd() - 0.5;
        dy = rnd() - 0.5;
        d2 = 1;
      }
      const d = Math.sqrt(d2);
      const f = (2600 * (a.r + b.r)) / d2;
      const ux = (dx / d) * f;
      const uy = (dy / d) * f;
      a.vx -= ux;
      a.vy -= uy;
      b.vx += ux;
      b.vy += uy;
    }
  }

  // springs
  for (const e of edges) {
    const a = nodes[e.i];
    const b = nodes[e.j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const rest = (a.r + b.r) * 1.85 + 130 / e.w;
    /* A link inside an age shapes its cluster; a link across ages is only a
       thread between them. If cross-age links pull horizontally they drag every
       thinly populated age into the crowded middle and pile it against its lane
       wall — so across ages the spring acts on height only: connected things
       come level with each other, and nobody leaves their century. */
    const cross = a.p !== b.p;
    const f = (d - rest) * 0.028 * e.w * (cross ? 0.5 : 1);
    const ux = cross ? 0 : (dx / d) * f;
    const uy = (dy / d) * f;
    a.vx += ux;
    a.vy += uy;
    b.vx -= ux;
    b.vy -= uy;
  }

  // the age field: a gentle pull to the band, and a weak pull to the mid-line.
  // Time is the one thing the layout may not compromise on, so an age is also
  // a hard lane: a node may lean into its neighbour's band by 60 units (so the
  // ages read as continuous) but never wander out of its own century.
  for (const n of nodes) {
    /* An age is a room, not a line. Inside the free width of its band a node
       feels nothing horizontally and the repulsion spreads it out; past that
       it is pulled back. Pulling everything to the band's centre instead
       collapses the thin ages into vertical stacks. */
    const freeHalf = bandW[n.p] * 0.36;
    const dxb = n.x - bandX[n.p];
    if (Math.abs(dxb) > freeHalf) n.vx += (Math.sign(dxb) * freeHalf - dxb) * 0.05;
    n.vy += -n.y * 0.0032;
    n.x += n.vx * alpha;
    n.y += n.vy * alpha;
    n.vx *= 0.72;
    n.vy *= 0.72;
    const lim = WORLD_H / 2 - n.r - 12;
    if (n.y > lim) n.y = lim;
    if (n.y < -lim) n.y = -lim;
    /* a soft wall, not a hard one: past 0.8 of its half-width a node feels a
       rising restoring force, so ages stay in order without any node ever
       being pinned flat against a line. The hard clamp is a distant backstop. */
    const half = bandW[n.p] / 2;
    const off = n.x - bandX[n.p];
    const over = Math.abs(off) - half * 0.92;
    if (over > 0) n.x -= Math.sign(off) * over * 0.18;
    const hard = half * 1.12;
    if (off > hard) n.x = bandX[n.p] + hard;
    if (off < -hard) n.x = bandX[n.p] - hard;
  }

  // collision relaxation
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r + 20;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const ux = (dx / d) * push;
        const uy = (dy / d) * push;
        a.x -= ux;
        a.y -= uy;
        b.x += ux;
        b.y += uy;
      }
    }
  }
}

// normalise to a 0-based world with a margin
const M = 140;
let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
for (const n of nodes) {
  minX = Math.min(minX, n.x - n.r);
  minY = Math.min(minY, n.y - n.r);
  maxX = Math.max(maxX, n.x + n.r);
  maxY = Math.max(maxY, n.y + n.r);
}
for (const n of nodes) {
  n.x = Math.round((n.x - minX + M) * 10) / 10;
  n.y = Math.round((n.y - minY + M) * 10) / 10;
}
const world = { w: Math.round(maxX - minX + M * 2), h: Math.round(maxY - minY + M * 2) };
/* Where an age *ended up*, not where its band started: the anneal moves
   nodes, so the rail and the age labels are placed on the real centre of
   mass of each age's nodes, and its width is the real span they occupy. */
const bandCentres = [];
const bandSpans = [];
for (let i = 0; i < PERIOD_SLUGS.length; i += 1) {
  const xs = nodes.filter((n) => n.p === i).map((n) => n.x);
  if (xs.length) {
    bandCentres.push(Math.round(xs.reduce((a, b) => a + b, 0) / xs.length));
    bandSpans.push(Math.max(320, Math.round(Math.max(...xs) - Math.min(...xs) + 240)));
  } else {
    bandCentres.push(Math.round(bandX[i] - minX + M));
    bandSpans.push(Math.round(bandW[i]));
  }
}
/* keep the ages monotonic left to right even if an age has a single node */
for (let i = 1; i < bandCentres.length; i += 1)
  if (bandCentres[i] <= bandCentres[i - 1]) bandCentres[i] = bandCentres[i - 1] + 200;

/* ------------------------------------------------------------- output --- */
const out = {
  generatedAt: new Date().toISOString(),
  world,
  periods: periods.map((p, i) => ({
    slug: p.slug,
    short: p.short,
    name: p.name,
    intro: p.intro,
    route: p.route,
    x: bandCentres[i],
    w: bandSpans[i],
    count: nodes.filter((n) => n.p === i).length,
  })),
  nodes: nodes.map((n) => ({
    id: n.id,
    k: n.kind === 'film' ? (n.live ? 'film' : 'soon') : 'page',
    sec: n.kind === 'film' ? 'films' : n.section,
    t: n.title,
    hi: n.hi ?? null,
    l: n.label,
    p: n.p,
    x: n.x,
    y: n.y,
    r: n.r,
    img: n.img,
    lq: n.lq ?? null,
    href: n.route,
    read: n.read ?? null,
    v: n.video ?? null,
  })),
  edges: edges.map((e) => [e.i, e.j, Math.round(e.w * 10) / 10, e.kinds[0]]),
  // kept out of the client payload; the page renders panels from this
  panels: nodes.map((n) => ({
    id: n.id,
    kind: n.kind === 'film' ? (n.live ? 'film' : 'soon') : 'page',
    title: n.title,
    hi: n.hi ?? null,
    label: n.label,
    period: n.period,
    section: n.kind === 'film' ? 'Film' : n.sectionLabel,
    summary: n.summary,
    href: n.route,
    read: n.read ?? null,
    video: n.video ?? null,
    img8: n.img8,
    lq: n.lq ?? null,
    alt: n.alt ?? n.title,
    caption: n.caption ?? null,
    artFilm: n.artFilm ?? null,
    artFilmTitle: n.artFilmTitle ?? null,
    minutes: n.minutes ?? null,
    events: n.events ?? null,
    neighbours: adj[indexById.get(n.id)].map((e) => (e.i === indexById.get(n.id) ? e.j : e.i)),
  })),
};

mkdirSync(resolve(HERE, 'data'), { recursive: true });
writeFileSync(resolve(HERE, 'data/web-graph.json'), `${JSON.stringify(out)}\n`);

/* --------------------------------------------------------------- audit --- */
const degrees = nodes.map((_, i) => 0);
for (const e of edges) {
  degrees[e.i] += 1;
  degrees[e.j] += 1;
}
const isolated = degrees.filter((d) => d === 0).length;
const kinds = {};
for (const e of edges) kinds[e.kinds[0]] = (kinds[e.kinds[0]] ?? 0) + 1;
console.log(
  [
    `nodes ${nodes.length} (films ${nodes.filter((n) => n.kind === 'film').length}, pages ${nodes.filter((n) => n.kind === 'page').length})`,
    `with art ${nodes.filter((n) => n.img).length} (borrowed ${borrowed})`,
    `edges ${edges.length} ${JSON.stringify(kinds)}`,
    `degree max ${Math.max(...degrees)} mean ${(degrees.reduce((a, b) => a + b, 0) / nodes.length).toFixed(2)} isolated ${isolated}`,
    `world ${world.w}×${world.h}`,
    `payload ${(JSON.stringify({ world: out.world, periods: out.periods, nodes: out.nodes, edges: out.edges }).length / 1024).toFixed(1)} kB (client) / ${(JSON.stringify(out).length / 1024).toFixed(1)} kB (all)`,
  ].join('\n'),
);
for (const p of out.periods) console.log(`  ${p.slug.padEnd(24)} ${String(p.count).padStart(3)}  x=${p.x}`);
