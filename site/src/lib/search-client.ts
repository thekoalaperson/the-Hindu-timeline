/**
 * search-client.ts — one search engine for the whole site.
 *
 * Before this module there were two: the road's own waypoint finder on `/`
 * (which could not find the Rāmāyaṇa by name) and a Pagefind panel on
 * `/search/` and in the search sheet (which ranked "Rāma-tāpanīya Upaniṣad"
 * above the Rāmāyaṇa for the query "rama"). R6's audit called search "the
 * front door" and both doors were stuck. This module is the single door:
 *
 *   searchCorpus(q, { limit })  →  { pinned, results }
 *
 * `pinned` is the direct answer — the hand-curated canonical page(s) for the
 * proper nouns people actually type (src/data/search-pins.json, joined to the
 * corpus graph and the films layer at build time and served as the small
 * static file /search/pins.json). `results` is Pagefind's ranked list with the
 * pinned routes removed, so nothing is said twice.
 *
 * Two things this module owns that Pagefind cannot do on its own:
 *
 *   1. **Folding both ways.** Pagefind folds diacritics, so "Ramayana" already
 *      finds "Rāmāyaṇa". It does not bridge the *digraphs* popular English
 *      spelling uses for retroflex/palatal consonants — "krishna" never
 *      reaches the "krsna" token indexed for "Kṛṣṇa" — nor the missing final
 *      vowel in "Ramayan"/"Mahabharat". queryVariants() produces up to five
 *      strings for one typed query, covering the plain→IAST direction
 *      (sh→s, ri→r, ch→c, ee→i, w→v …), the IAST→plain direction (via the
 *      shared plainSpelling converter), and the dropped final "a".
 *   2. **Ranking that suits a corpus of 898 pages of overlapping proper
 *      nouns.** Pagefind's ranking weights are tuned per index; ours favour a
 *      close word match over sheer term density (RANKING below).
 *
 * Everything is loaded on demand: Pagefind's WASM and the pin table are both
 * fetched at the first keystroke, never on page load, and every failure path
 * degrades to "no results" rather than throwing. With JavaScript off the panel
 * never mounts and the server-rendered doors and section list stand alone.
 *
 * mountSearch() is the UI half — the panel markup in
 * src/pages/search/_Panel.astro is inert until it runs.
 */
import { plainSpelling } from './plain-english.ts';

/* ------------------------------------------------------------------ types - */

export interface SearchResult {
  /** Site route, always with a trailing slash. */
  route: string;
  /** The title as the corpus stores it (IAST, diacritics and all). */
  title: string;
  /** The same title in popular English spelling. */
  plainTitle: string;
  /** Section label — "Stories", "Deities", "Sacred Geography"… */
  section: string;
  /** One line of context. May contain `<mark>` and nothing else. */
  context: string;
  /** Poster of the film that animates this page, if it is filmed. */
  thumb?: string;
  /** True on the hand-pinned direct answers. */
  pinned?: boolean;
}

export interface SearchOptions {
  /** Max ranked results (pinned answers are extra). Default 20. */
  limit?: number;
}

export interface CorpusSearch {
  pinned: SearchResult[];
  results: SearchResult[];
}

/* -------------------------------------------------------------- pagefind - */

interface PFData {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
  filters?: Record<string, string[]>;
}
interface PFResult {
  id: string;
  data: () => Promise<PFData>;
}
interface PFModule {
  search: (q: string) => Promise<{ results: PFResult[] }>;
  options?: (o: unknown) => Promise<void>;
  init?: () => Promise<void>;
}

/**
 * Ranking weights for this index (Pagefind 1.5's `options({ ranking })`).
 *
 *   termSimilarity 3 — up from Pagefind's 1.0. A high value rewards a page
 *     whose matched word is close in length to what was typed, which is what
 *     pushes "Śītalā" and "Durgamāsura" back down for the queries "sita" and
 *     "durga". Pushed higher (5, 9, 40 were all measured) it starts costing
 *     more than it wins: at 5 the Bhagavad Gītā itself falls out of the top
 *     three for "gita", beaten by variant Gītās whose titles are shorter.
 *   pageLength 0.1 — well below the 0.75 default, i.e. length nearly ignored.
 *     The corpus's short pages are mostly one-episode footnotes and film
 *     pages; its canonical pages are long. Normalising by length as hard as
 *     the default actively promotes the footnotes.
 *   termFrequency 0.2 — presence matters far more than density, for the same
 *     reason: a 200-word film page that says "Kṛṣṇa" six times should not
 *     beat the Kṛṣṇa-līlā.
 *   termSaturation 1.2 — slightly earlier saturation, so the tenth mention of
 *     a name adds almost nothing.
 *
 * Swept against the raw index on the built site (four configs × 14 queries)
 * and then measured end to end against the 25 first-time-visitor queries in
 * S1-report.md. Honest limit: on a bare one-word proper noun the weights move
 * the ranked list by one or two places, not from wrong to right — the pins are
 * what make those queries land. See the report for the one-line
 * `data-pagefind-weight` change to Article.astro (lane L2's file) that would
 * fix the ranked list itself.
 */
const RANKING = {
  termSimilarity: 3,
  pageLength: 0.1,
  termFrequency: 0.2,
  termSaturation: 1.2,
};

let pagefindLoad: Promise<PFModule | null> | null = null;

/** Load Pagefind's on-demand bundle once. Resolves to null if it is absent
    (the dev server has no index) or fails, and never throws. */
export function loadPagefind(): Promise<PFModule | null> {
  if (pagefindLoad) return pagefindLoad;
  pagefindLoad = (async () => {
    try {
      /* Held in a variable so Rollup cannot statically resolve it: the file is
         written by `pagefind --site dist` *after* astro build, and does not
         exist on the dev server at all. */
      const src = '/pagefind/pagefind.js';
      const mod = (await import(/* @vite-ignore */ src)) as PFModule;
      await mod.options?.({ excerptLength: 22, ranking: RANKING });
      await mod.init?.();
      return mod;
    } catch {
      return null;
    }
  })();
  return pagefindLoad;
}

/* ------------------------------------------------------------------ pins - */

interface PinCard {
  r: string;
  t: string;
  p: string;
  s: string;
  c: string;
  th?: string;
}
interface PinTable {
  cards: PinCard[];
  q: Record<string, number[]>;
  /** corpus route → film still, for every filmed page (ranked results use it too). */
  films: Record<string, string>;
  /** film route → its English title and still, overriding the indexed H1.
      `p` is omitted when the plain spelling is identical to `t`. */
  pages: Record<string, { t: string; p?: string; th?: string }>;
}

let pinLoad: Promise<PinTable | null> | null = null;

/** Fetch the build-time pin table once. Never throws. */
export function loadPins(): Promise<PinTable | null> {
  if (pinLoad) return pinLoad;
  pinLoad = (async () => {
    try {
      const res = await fetch('/search/pins.json');
      if (!res.ok) return null;
      return (await res.json()) as PinTable;
    } catch {
      return null;
    }
  })();
  return pinLoad;
}

/* --------------------------------------------------------------- folding - */

/** Lowercase, strip combining marks, drop punctuation, squeeze whitespace —
    the exact normalisation the pin table's query keys are written in. */
export function fold(q: string): string {
  return q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Popular English respellings → the diacritic-stripped IAST token Pagefind
   actually indexes. Applied to a folded query, longest digraph first. "ksh"
   before "sh" so "lakshmi" → "laksmi" rather than "laksmi"→… ; "ri" is only
   reduced when it is not the whole word, so "rishi" folds but "ri" does not
   vanish. */
const DIGRAPHS: Array<[RegExp, string]> = [
  [/ksh/g, 'ks'],
  [/chh/g, 'ch'],
  [/sh/g, 's'],
  [/ch/g, 'c'],
  [/ee/g, 'i'],
  [/oo/g, 'u'],
  [/aa/g, 'a'],
  [/ph/g, 'p'],
  [/w/g, 'v'],
];

/* Words that carry no name and only get between a reader and their answer:
   "who is rama", "the story of the samudra manthan", "tell me about kali yuga".
   Used *only* to find a pinned direct answer — the ranked Pagefind search
   always runs on the query exactly as typed. */
const FILLER = new Set([
  'a', 'about', 'all', 'an', 'and', 'are', 'me', 'my', 'of', 'story', 'stories', 'tell',
  'that', 'the', 'was', 'were', 'what', 'whats', 'when', 'where', 'which', 'who', 'whos',
  'why', 'how', 'is', 'in', 'on', 'god', 'goddess', 'lord', 'shri', 'sri', 'shree', 'mean',
  'meaning', 'explain', 'show', 'find', 'read', 'did', 'do', 'does',
]);

/**
 * Every phrase in a typed query that could name a pinned page, longest first:
 * the query itself, then the query with filler words stripped from both ends,
 * then each contiguous run of the remaining words. So "who is rama" and
 * "tell me the story of samudra manthan" both reach their pin, while a real
 * multi-word phrase search still tries itself first.
 *
 * Capped at 8 words in and 24 candidates out — past that the reader is
 * searching a sentence, not looking up a name.
 */
export function pinCandidates(folded: string): string[] {
  if (!folded) return [];
  const words = folded.split(' ');
  if (words.length > 8) return [folded];
  const out: string[] = [folded];
  const seen = new Set(out);
  const push = (s: string) => {
    if (s.length >= 3 && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };

  /* Filler off both ends first — the commonest shape by far. */
  let lo = 0;
  let hi = words.length;
  while (lo < hi && FILLER.has(words[lo])) lo += 1;
  while (hi > lo && FILLER.has(words[hi - 1])) hi -= 1;
  const core = words.slice(lo, hi);
  if (core.length) push(core.join(' '));

  /* Then every contiguous run of the core, longest first. */
  for (let len = core.length; len >= 1 && out.length < 24; len -= 1) {
    for (let i = 0; i + len <= core.length && out.length < 24; i += 1) {
      push(core.slice(i, i + len).join(' '));
    }
  }
  return out;
}

/** "krishna" → "krsna", "shiva" → "siva", "lakshmi" → "laksmi". */
export function toIastAscii(folded: string): string {
  let s = folded;
  for (const [re, to] of DIGRAPHS) s = s.replace(re, to);
  /* ṛ romanises as "ri" in popular spelling ("Kṛṣṇa" → "Krishna"), so a "ri"
     that is not the whole word collapses to "r". Guarded to words of 4+
     letters so "rishi"→"rsi" happens but "ripu" is left alone-ish; the extra
     variant only ever adds results below the ones already found. */
  s = s.replace(/\b([a-z]*?)ri([a-z]{2,})\b/g, (m, a, b) => (m.length >= 5 ? `${a}r${b}` : m));
  return s;
}

/**
 * Up to five query strings worth trying for one typed query, in the order
 * their results should appear. Every extra variant can only append results
 * below the ones the earlier variants already found, so a wrong guess costs
 * nothing but a little latency.
 */
export function queryVariants(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const out: string[] = [trimmed];
  const push = (s: string) => {
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  };

  const folded = fold(trimmed);
  push(folded);
  push(toIastAscii(folded));

  /* The reverse direction: a query typed with diacritics, respelled the way
     the prose sometimes spells it ("Kṛṣṇa" → "Krishna"). */
  try {
    push(plainSpelling(trimmed));
  } catch {
    /* best effort only — a bad transliteration guess must never break search */
  }

  /* "Ramayan" / "Mahabharat" / "Ravan": popular spelling drops the final "a"
     that IAST keeps. Pagefind treats the last word of a query as a prefix, so
     this is belt-and-braces for the many-word case. */
  const words = folded.split(' ');
  const last = words[words.length - 1];
  if (last && last.length >= 5 && !/[aeiou]$/.test(last)) {
    push([...words.slice(0, -1), last + 'a'].join(' '));
  }

  return out;
}

/* ------------------------------------------------------------- searching - */

function tidyRoute(url: string): string {
  const r = url.replace(/\/index\.html$/, '/').replace(/\.html$/, '/');
  return r.endsWith('/') ? r : `${r}/`;
}

/** Pagefind excerpts carry `<mark>`; nothing else is allowed through. */
function safeExcerpt(d: PFData): string {
  let e = (d.excerpt || '').replace(/<(?!\/?mark>)[^>]*>/g, '');
  const folded = d.meta?.title_folded;
  if (folded) {
    /* `title_folded` is indexed on purpose so a folded query can match it, but
       it is not prose — never print it as if it were. */
    const re = new RegExp(`(?:<mark>)?${folded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:</mark>)?`, 'gi');
    e = e.replace(re, '').trim();
  }
  return e.replace(/^[\s.,;:—-]+/, '');
}

/**
 * Article.astro writes its metadata in Pagefind's inline form,
 * `data-pagefind-meta="section:Stories, period:Tretā Yuga, period_slug:treta-yuga"`.
 * Pagefind 1.5.2 does **not** split that attribute on commas: it stores the
 * whole tail as the value of the first key, so `meta.section` comes back as
 * "Stories, period:Tretā Yuga, period_slug:treta-yuga" and every result on the
 * site prints its section label with the raw `period:`/`period_slug:` pairs
 * trailing it. (Visible in the pre-change build too — see S1-report.md, which
 * carries the one-line fix for Article.astro; that file belongs to lane L2.)
 * Until that lands, cut the label back at the first `, key:` boundary.
 */
function firstMetaValue(raw: string | undefined): string {
  if (!raw) return '';
  return raw.split(/,\s*[a-z][a-z0-9_]*:/)[0].trim();
}

function cardToResult(c: PinCard): SearchResult {
  return { route: c.r, title: c.t, plainTitle: c.p, section: c.s, context: c.c, thumb: c.th, pinned: true };
}

function dataToResult(d: PFData, table: PinTable | null): SearchResult {
  const route = tidyRoute(d.url);
  const override = table?.pages?.[route];
  const title = override ? override.t : (d.meta?.title || 'Untitled').split(' — ')[0].trim() || 'Untitled';
  let plain = override ? (override.p ?? override.t) : title;
  if (!override) {
    try {
      plain = plainSpelling(title);
    } catch {
      /* leave the IAST title standing */
    }
  }
  return {
    route,
    title,
    plainTitle: plain,
    section: firstMetaValue(d.meta?.section) || d.filters?.section?.[0] || '',
    context: safeExcerpt(d),
    thumb: override?.th ?? table?.films?.[route],
  };
}

/**
 * The one search everything on the site goes through.
 *
 * @param q      what the reader typed, raw
 * @param opts   `limit` caps the ranked list (default 20); pinned answers are
 *               additional and never more than three.
 */
export async function searchCorpus(q: string, opts: SearchOptions = {}): Promise<CorpusSearch> {
  const limit = opts.limit ?? 20;
  const variants = queryVariants(q);
  if (!variants.length) return { pinned: [], results: [] };

  const [table, pf] = await Promise.all([loadPins(), loadPagefind()]);

  const pinned: SearchResult[] = [];
  if (table?.q) {
    /* Longest phrase first, so "kali yuga" is not answered by the pin for
       "kali", and "who is rama" still reaches Rāma. */
    for (const candidate of pinCandidates(fold(q))) {
      const ids = table.q[candidate];
      if (!ids) continue;
      for (const i of ids) {
        const c = table.cards[i];
        if (c) pinned.push(cardToResult(c));
      }
      break;
    }
  }
  if (!pf) return { pinned, results: [] };

  let lists: Array<{ results: PFResult[] }>;
  try {
    lists = await Promise.all(variants.map((v) => pf.search(v)));
  } catch {
    return { pinned, results: [] };
  }

  const seen = new Set<string>();
  const merged: PFResult[] = [];
  for (const list of lists) {
    for (const r of list.results) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      merged.push(r);
    }
  }

  const pinnedRoutes = new Set(pinned.map((p) => p.route));
  /* Over-fetch a little so dropping the pinned duplicates cannot short the list. */
  const top = await Promise.all(merged.slice(0, limit + pinnedRoutes.size + 4).map((r) => r.data()));
  const results = top
    .map((d) => dataToResult(d, table))
    .filter((r) => !pinnedRoutes.has(r.route))
    .slice(0, limit);

  return { pinned, results };
}

/** How many pages matched, for the status line — cheap, no `data()` calls. */
export async function countMatches(q: string): Promise<number> {
  const pf = await loadPagefind();
  if (!pf) return 0;
  try {
    const lists = await Promise.all(queryVariants(q).map((v) => pf.search(v)));
    const ids = new Set<string>();
    for (const l of lists) for (const r of l.results) ids.add(r.id);
    return ids.size;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------- recent searches - */

const RECENT_KEY = 'ht:recent';
const RECENT_MAX = 8;

export function recentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s.trim()).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(q: string): void {
  const t = q.trim();
  if (t.length < 2) return;
  try {
    const list = [t, ...recentSearches().filter((s) => s.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* private mode, quota, blocked storage — a convenience, never a dependency */
  }
}

export function forgetSearches(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* nothing to do */
  }
}

/* ---------------------------------------------------------------- the UI - */

const esc = (s: string) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

/** Titles are shown in plain spelling when the reader has plain mode on
    (`<html data-plain>`), and as the corpus stores them otherwise. */
function displayTitle(r: SearchResult): string {
  return document.documentElement.hasAttribute('data-plain') ? r.plainTitle : r.title;
}

function pinCardHtml(r: SearchResult): string {
  const t = displayTitle(r);
  return (
    `<a class="pin-card" href="${esc(r.route)}" data-search-hit>` +
    (r.thumb
      ? `<span class="pin-art"><img src="${esc(r.thumb)}" alt="" loading="lazy" decoding="async" width="112" height="63"></span>`
      : '') +
    `<span class="pin-text">` +
    `<span class="pin-title">${esc(t)}</span>` +
    (r.context ? `<span class="pin-line">${esc(r.context)}</span>` : '') +
    `<span class="pin-section">${esc(r.section)}</span>` +
    `</span></a>`
  );
}

function resultHtml(r: SearchResult): string {
  const t = displayTitle(r);
  return (
    `<li class="search-result">` +
    `<a href="${esc(r.route)}" data-search-hit>` +
    (r.thumb
      ? `<span class="sr-thumb"><img src="${esc(r.thumb)}" alt="" loading="lazy" decoding="async" width="120" height="68"></span>`
      : '') +
    `<span class="sr-text">` +
    `<span class="sr-title">${esc(t)}</span>` +
    (r.context ? `<span class="sr-excerpt">${r.context}</span>` : '') +
    (r.section ? `<span class="sr-meta"><span class="sr-section">${esc(r.section)}</span></span>` : '') +
    `</span></a></li>`
  );
}

/**
 * Wire one search panel (the markup in src/pages/search/_Panel.astro).
 * Safe to call twice on the same element; the second call is a no-op.
 */
export function mountSearch(panel: HTMLElement): void {
  if (panel.dataset.searchMounted) return;
  panel.dataset.searchMounted = '1';

  const input = panel.querySelector<HTMLInputElement>('[data-search-input]');
  const live = panel.querySelector<HTMLElement>('[data-search-live]');
  const status = panel.querySelector<HTMLElement>('[data-search-status]');
  const pinsOut = panel.querySelector<HTMLElement>('[data-search-pins]');
  const out = panel.querySelector<HTMLElement>('[data-search-results]');
  const empty = panel.querySelector<HTMLElement>('[data-search-empty]');
  const recentBox = panel.querySelector<HTMLElement>('[data-search-recent]');
  const clearBtn = panel.querySelector<HTMLButtonElement>('[data-search-clear]');
  if (!input || !live || !status || !pinsOut || !out || !empty) return;

  let seq = 0;
  let timer = 0;
  let active = -1;

  function hits(): HTMLAnchorElement[] {
    return [...panel.querySelectorAll<HTMLAnchorElement>('[data-search-hit]')];
  }

  function setActive(i: number) {
    const list = hits();
    if (!list.length) {
      active = -1;
      return;
    }
    const n = ((i % list.length) + list.length) % list.length;
    list.forEach((a, j) => a.classList.toggle('is-active', j === n));
    active = n;
    list[n].scrollIntoView({ block: 'nearest' });
    input!.setAttribute('aria-activedescendant', list[n].id || '');
  }

  function drawRecent() {
    if (!recentBox) return;
    const list = recentSearches();
    recentBox.hidden = list.length === 0;
    if (!list.length) return;
    const ul = recentBox.querySelector('[data-search-recent-list]');
    if (ul)
      ul.innerHTML = list
        .map((s) => `<li><button type="button" class="pill" data-search-again="${esc(s)}">${esc(s)}</button></li>`)
        .join('');
  }

  function showEmpty() {
    live!.hidden = true;
    empty!.hidden = false;
    pinsOut!.innerHTML = '';
    out!.innerHTML = '';
    status!.textContent = '';
    active = -1;
    drawRecent();
  }

  async function run(q: string) {
    const mine = ++seq;
    if (!q.trim()) {
      showEmpty();
      return;
    }
    empty!.hidden = true;
    live!.hidden = false;
    status!.textContent = 'Searching…';
    const { pinned, results } = await searchCorpus(q, { limit: 20 });
    if (mine !== seq) return;

    pinsOut!.innerHTML = pinned.length
      ? `<div class="pin-block" data-pinned><p class="pin-kicker">Straight to it</p>${pinned.map(pinCardHtml).join('')}</div>`
      : '';
    out!.innerHTML = results.length
      ? (pinned.length ? '<p class="search-more-kicker">More in the manuscript</p>' : '') +
        `<ul class="search-results">${results.map(resultHtml).join('')}</ul>`
      : '';

    hits().forEach((a, i) => {
      a.id = a.id || `${panel.dataset.searchId || 'search'}-hit-${i}`;
    });

    if (!pinned.length && !results.length) {
      const ready = await loadPagefind();
      if (mine !== seq) return;
      status!.textContent = ready
        ? `Nothing for “${q}”.`
        : 'The search index is written when the site is built, so it is not available on the dev server.';
      return;
    }
    const n = pinned.length + results.length;
    status!.textContent = pinned.length
      ? `${pinned.length} direct answer${pinned.length === 1 ? '' : 's'}, ${results.length} more page${results.length === 1 ? '' : 's'}`
      : `${n} page${n === 1 ? '' : 's'}`;
    active = -1;
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => run(input.value), 140);
  });
  input.addEventListener('search', () => run(input.value));
  /* Warm both halves the moment the field is touched, so the first keystroke
     is not also the first network round-trip. */
  input.addEventListener(
    'focus',
    () => {
      loadPagefind();
      loadPins();
    },
    { once: true },
  );

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Enter') {
      const list = hits();
      if (active >= 0 && list[active]) {
        e.preventDefault();
        rememberSearch(input.value);
        list[active].click();
      } else if (list.length) {
        e.preventDefault();
        rememberSearch(input.value);
        list[0].click();
      }
    } else if (e.key === 'Escape') {
      if (input.value) {
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        showEmpty();
      }
      /* an empty field lets Escape bubble, so the sheet closes as before */
    }
  });

  panel.addEventListener('click', (e) => {
    const again = (e.target as HTMLElement).closest<HTMLElement>('[data-search-again]');
    if (again) {
      input.value = again.dataset.searchAgain || '';
      input.focus();
      run(input.value);
      return;
    }
    const hit = (e.target as HTMLElement).closest('[data-search-hit]');
    if (hit) rememberSearch(input.value);
  });

  clearBtn?.addEventListener('click', () => {
    forgetSearches();
    drawRecent();
  });

  drawRecent();

  /* `/search/?q=…` is a shareable search; the sheet has no query of its own. */
  const q = new URLSearchParams(location.search).get('q');
  if (q && panel.dataset.searchUrlQuery === 'yes') {
    input.value = q;
    run(q);
  }
}

/** Mount every panel on the page. Called by _Panel.astro's own script. */
export function mountAllSearch(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-search2]').forEach(mountSearch);
}
