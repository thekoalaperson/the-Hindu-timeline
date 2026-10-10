/**
 * /search/pins.json — the resolved pin table the search client fetches on
 * demand (first keystroke), once per visit.
 *
 * `src/data/search-pins.json` is written by hand as query → route. Turning a
 * route into something a result card can render needs the corpus graph (title,
 * section, dek) and the films layer (a still to show when the page is filmed) —
 * both far too large to bundle into a script that ships on every page. So the
 * join happens here, at build time, and is served as one small prerendered
 * static file (~30 KB raw, well under 10 KB over the wire).
 *
 * Shape, deliberately terse because every byte is on the wire:
 *
 *   { "cards": [ { r, t, p, s, c, th? } ],
 *     "q":     { "<query>": [cardIndex, …] },
 *     "films": { "<route>": "<poster src>" } }
 *
 *     r  route            t  title as stored (IAST)
 *     p  plain spelling   s  section label
 *     c  one-line context (the page's dek, clipped)
 *     th thumbnail src — present only when the page is filmed
 *
 * `films` is the same poster lookup for *every* filmed page (50 of them), so a
 * ranked Pagefind result can show art too without the client ever loading the
 * films layer.
 *
 * Queries are already in the client's folded form (lowercase, no diacritics),
 * so a lookup is one plain object hit. `scripts/check-pins.mjs` (run by
 * `npm test`) proves every route resolves and no query is claimed twice.
 */
import pinsData from '../../data/search-pins.json';
import { cardPoster, filmsForRoute, getFilms } from '../../lib/films.ts';
import { nodeForRoute } from '../../lib/graph.ts';
import { plainSpelling } from '../../lib/plain-english.ts';

export const prerender = true;

interface PinEntry {
  q: string[];
  routes: string[];
}

interface PinCard {
  r: string;
  t: string;
  p: string;
  s: string;
  c: string;
  th?: string;
}

/** The first sentence-ish of a dek, short enough to sit under a title. */
function oneLine(text: string | undefined | null, max = 130): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  if (stop > max * 0.5) return cut.slice(0, stop + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—-]$/, '') + '…';
}

/** Titles in the corpus are often "Name — gloss"; the head is the answer. */
function head(title: string): string {
  return title.split(' — ')[0].trim() || title;
}

/* Labels for the handful of app-owned routes the pins point at, which have no
   corpus node of their own (the cosmic-clock period pages do have one, so they
   are not listed here). */
const APP_CARDS: Record<string, { t: string; s: string; c: string }> = {
  '/': {
    t: 'The Hindu Timeline',
    s: 'The Hindu Timeline',
    c: 'Travel the whole of Hindu mythology and history in time order.',
  },
  '/clock/': {
    t: 'The Cosmic Clock',
    s: 'The Cosmic Clock',
    c: 'The nine ages of the road, from before time to the next dawn.',
  },
  '/films/': { t: 'The films', s: 'Films', c: 'Every animated story, newest first.' },
};

const cards: PinCard[] = [];
const index = new Map<string, number>();
const queries: Record<string, number[]> = {};

function cardFor(route: string): number | null {
  const already = index.get(route);
  if (already !== undefined) return already;

  const node = nodeForRoute(route);
  const app = APP_CARDS[route];
  if (!node && !app) return null;

  const title = node ? head(node.title) : app!.t;
  const card: PinCard = {
    r: route,
    t: title,
    p: plainSpelling(title),
    s: node ? node.sectionLabel : app!.s,
    c: oneLine(node ? node.dek : app!.c),
  };
  const film = node ? filmsForRoute(route)[0] : undefined;
  if (film) {
    const poster = cardPoster(film);
    if (poster && poster.kind === 'still') card.th = poster.src;
  }
  const i = cards.push(card) - 1;
  index.set(route, i);
  return i;
}

for (const entry of (pinsData as { pins: PinEntry[] }).pins) {
  const ids = entry.routes.map(cardFor).filter((i): i is number => i !== null);
  if (!ids.length) continue;
  for (const q of entry.q) if (!(q in queries)) queries[q] = ids;
}

/* Art and titles for the films layer.
   `films`  — corpus route → still, so a ranked corpus result wears art too.
   `pages`  — film route → { title, plain title, still }. A film page's own H1
              is its Devanagari/YouTube title, which Pagefind indexes as the
              page title; in a list of search results that reads as noise next
              to 900 English titles. These are the same English titles the film
              page's own breadcrumb shows, so nothing is misrepresented.

   Only a real painted still is used, never the YouTube thumbnail fallback:
   those carry Hinglish text baked into the picture (films.ts, cardPoster), and
   at 112 px in a result row that is illegible mush rather than art. */
const films: Record<string, string> = {};
const pages: Record<string, { t: string; p?: string; th?: string }> = {};
for (const film of getFilms()) {
  const poster = cardPoster(film);
  const still = poster && poster.kind === 'still' ? poster.src : undefined;
  const t = head(film.title.en);
  const p = plainSpelling(t);
  pages[film.route] = { t, ...(p !== t ? { p } : {}), ...(still ? { th: still } : {}) };
  if (!still) continue;
  for (const ref of film.corpus) {
    if (ref.route && !films[ref.route]) films[ref.route] = still;
  }
}

const body = JSON.stringify({ cards, q: queries, films, pages });

export const GET = () =>
  new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
