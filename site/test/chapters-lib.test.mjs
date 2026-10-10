/**
 * chapters.test.mjs — the chapter spine (lane L2, BRIEF v4 §4 W3).
 *
 * Two things are being defended here:
 *
 *  1. **Totality.** `src/data/chapters.json` is authored by hand and will be
 *     replaced wholesale by lane R5's nine-period file. Every function must
 *     survive a period with no chapters, a route in no chapter, a nonsense
 *     route and an unknown film slug — returning null/[] rather than throwing.
 *     A half-written data file must never take the site down.
 *  2. **Integrity.** Every `stories[]` route resolves in the graph, every
 *     chapter id is unique, and the spine walk is a total order with no gaps.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chapterById,
  chapterOfRoute,
  chaptersOf,
  filmsOfChapter,
  nextInTime,
  prevInTime,
  spine,
  storySpine,
} from '../src/lib/chapters.ts';
import graph from '../src/generated/graph.json' with { type: 'json' };
import featured from '../src/data/featured.json' with { type: 'json' };
import { PERIOD_SLUGS } from '../src/lib/routes.ts';
import { dayNumber, pickIndex } from '../src/lib/day.ts';

/* ------------------------------------------------------------ integrity -- */

test('every chapter route resolves in the graph', () => {
  const missing = [];
  for (const ch of spine) {
    for (const r of ch.stories) if (!graph.byRoute[r]) missing.push(`${ch.id} → ${r}`);
    if (ch.hero?.route && !graph.byRoute[ch.hero.route]) missing.push(`${ch.id} hero → ${ch.hero.route}`);
  }
  assert.deepEqual(missing, []);
});

test('every chapter film slug exists in featured.json', () => {
  const slugs = new Set(featured.map((f) => f.slug));
  const missing = [];
  for (const ch of spine) {
    for (const s of ch.films) if (!slugs.has(s)) missing.push(`${ch.id} → ${s}`);
    if (ch.art?.film && !slugs.has(ch.art.film)) missing.push(`${ch.id} art → ${ch.art.film}`);
  }
  assert.deepEqual(missing, []);
});

test('chapter ids are unique and periods are known', () => {
  const seen = new Set();
  for (const ch of spine) {
    assert.ok(!seen.has(ch.id), `duplicate chapter id ${ch.id}`);
    seen.add(ch.id);
    assert.ok(PERIOD_SLUGS.includes(ch.period), `unknown period ${ch.period}`);
  }
});

test('chapters of a period are numbered 1..n in file order', () => {
  for (const slug of PERIOD_SLUGS) {
    const list = chaptersOf(slug);
    list.forEach((ch, i) => assert.equal(ch.index, i + 1));
  }
});

/* ------------------------------------------------------------- totality -- */

test('an unknown or empty period returns [] rather than throwing', () => {
  assert.deepEqual(chaptersOf('no-such-age'), []);
  assert.deepEqual(chaptersOf(null), []);
  assert.deepEqual(chaptersOf(undefined), []);
  assert.deepEqual(chaptersOf(''), []);
});

test('a route in no chapter returns null', () => {
  assert.equal(chapterOfRoute('/places/somewhere-nobody-wrote/'), null);
  assert.equal(chapterOfRoute(null), null);
  assert.equal(chapterOfRoute(''), null);
  assert.equal(chapterOfRoute('not even a route'), null);
});

test('chapterOfRoute tolerates a missing trailing slash and a fragment', () => {
  const first = storySpine[0];
  assert.ok(first, 'the stub must have at least one story');
  const bare = first.route.replace(/\/$/, '');
  assert.equal(chapterOfRoute(bare)?.id, first.chapter.id);
  assert.equal(chapterOfRoute(`${first.route}#somewhere`)?.id, first.chapter.id);
});

test('covers[] attaches a route by its longest matching prefix', () => {
  /* `/stories/mahabharata/07-drona-parva/` is covered by the war chapter,
     while the bare `/stories/mahabharata/` prefix belongs to the closing one.
     The more specific prefix has to win or every parva lands in the wrong
     chapter. */
  const drona = chapterOfRoute('/stories/mahabharata/07-drona-parva/');
  const closing = chapterOfRoute('/stories/mahabharata/12-shanti-parva/');
  if (drona && closing) assert.notEqual(drona.id, closing.id);
});

test('next/prev walk the spine and stop cleanly at both ends', () => {
  assert.equal(prevInTime(storySpine[0].route), null);
  assert.equal(nextInTime(storySpine.at(-1).route), null);
  for (let i = 0; i < storySpine.length - 1; i++) {
    assert.equal(nextInTime(storySpine[i].route)?.route, storySpine[i + 1].route);
    assert.equal(prevInTime(storySpine[i + 1].route)?.route, storySpine[i].route);
  }
});

test('next/prev cross chapter and period boundaries', () => {
  /* Somewhere in the spine the next story belongs to a different chapter —
     that crossing is the whole point of "next in time". */
  const crossings = storySpine.filter(
    (s, i) => i > 0 && storySpine[i - 1].chapter.id !== s.chapter.id,
  );
  assert.ok(crossings.length > 0, 'the spine must cross at least one chapter boundary');
  const periodCrossings = storySpine.filter(
    (s, i) => i > 0 && storySpine[i - 1].chapter.period !== s.chapter.period,
  );
  assert.ok(periodCrossings.length > 0, 'the spine must cross at least one period boundary');
});

test('next/prev of an unknown route is null, not an exception', () => {
  assert.equal(nextInTime('/nowhere/'), null);
  assert.equal(prevInTime('/nowhere/'), null);
  assert.equal(nextInTime(null), null);
  assert.equal(prevInTime(undefined), null);
});

test('filmsOfChapter drops unknown slugs and tolerates a bad id', () => {
  assert.deepEqual(filmsOfChapter('no-such-chapter'), []);
  assert.deepEqual(filmsOfChapter(null), []);
  assert.equal(chapterById('no-such-chapter'), null);
  for (const ch of spine) {
    for (const f of filmsOfChapter(ch.id)) assert.ok(f.slug && f.route);
  }
});

/* ------------------------------------------------- today's story picker -- */

test('pickIndex stays in range for any pool size, including zero', () => {
  for (const n of [0, 1, 2, 7, 43, 50]) {
    for (let d = -5; d < 400; d++) {
      const i = pickIndex(d, n);
      assert.ok(Number.isInteger(i) && i >= 0 && (n === 0 ? i === 0 : i < n), `n=${n} d=${d} → ${i}`);
    }
  }
  assert.equal(pickIndex(1, Number.NaN), 0);
});

test("today's pick is stable within a day and moves between days", () => {
  const a = new Date(2026, 8, 6, 3, 0, 0);
  const b = new Date(2026, 8, 6, 23, 0, 0);
  const c = new Date(2026, 8, 7, 3, 0, 0);
  assert.equal(dayNumber(a), dayNumber(b));
  assert.equal(dayNumber(c), dayNumber(a) + 1);
  assert.notEqual(pickIndex(dayNumber(a), 43), pickIndex(dayNumber(c), 43));
});
