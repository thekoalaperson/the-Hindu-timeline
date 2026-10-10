import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPins } from '../scripts/check-pins.mjs';
import pinsData from '../src/data/search-pins.json' with { type: 'json' };
import { fold, pinCandidates, queryVariants, toIastAscii } from '../src/lib/search-client.ts';

/* --------------------------------------------------------------- the pins - */

test('every pinned route resolves and no query is claimed twice', () => {
  const { errors, entries, queries } = checkPins();
  assert.deepEqual(errors, [], errors.join('\n'));
  assert.ok(entries >= 80, `expected at least 80 pin entries, got ${entries}`);
  assert.ok(queries >= 200, `expected at least 200 pinned queries, got ${queries}`);
});

test('the words a first-time visitor types are all pinned', () => {
  const claimed = new Set(pinsData.pins.flatMap((p) => p.q));
  /* The 25 queries S1's report measures, plus the handful of one-word names
     R6's audit found mis-ranked. If a pin entry is ever renamed away from one
     of these, this fails rather than the search quietly regressing. */
  const mustHave = [
    'rama', 'ram', 'ramayana', 'ramayan', 'krishna', 'shiva', 'gita', 'mahabharat', 'hanuman',
    'durga', 'ganesh', 'kali yuga', 'yuga', 'brahma', 'vishnu avatar', 'samudra manthan', 'sita',
    'arjun', 'karna', 'bali', 'ganga', 'kailash', 'ravan', 'draupadi', 'kalki',
  ];
  const missing = mustHave.filter((q) => !claimed.has(q));
  assert.deepEqual(missing, [], `unpinned: ${missing.join(', ')}`);
});

test('pin queries survive the client fold unchanged', () => {
  /* The client folds what the reader typed and looks it up verbatim, so a pin
     written in a form the fold would alter could never be hit. */
  for (const entry of pinsData.pins) {
    for (const q of entry.q) assert.equal(fold(q), q, `pin query ${JSON.stringify(q)} does not survive fold()`);
  }
});

/* ------------------------------------------------------------- the folding - */

test('fold strips diacritics, case and punctuation', () => {
  assert.equal(fold('Kṛṣṇa'), 'krsna');
  assert.equal(fold('  Rāmāyaṇa  '), 'ramayana');
  assert.equal(fold('Bhagavad-Gītā!'), 'bhagavad gita');
  assert.equal(fold('Śiva'), 'siva');
});

test('plain English spellings reach the tokens Pagefind indexes', () => {
  assert.equal(toIastAscii('krishna'), 'krsna');
  assert.equal(toIastAscii('shiva'), 'siva');
  assert.equal(toIastAscii('vishnu'), 'visnu');
  assert.equal(toIastAscii('lakshmi'), 'laksmi');
  assert.equal(toIastAscii('ganesha'), 'ganesa');
  assert.equal(toIastAscii('bhishma'), 'bhisma');
});

test('a dropped final vowel is tried with the vowel back on', () => {
  assert.ok(queryVariants('ramayan').includes('ramayana'), 'ramayan → ramayana');
  assert.ok(queryVariants('mahabharat').includes('mahabharata'), 'mahabharat → mahabharata');
  /* Short words are left alone — "ram" must not become "rama" and drag the
     whole Rāmdev/Rāmānuja cloud in with it; the pin answers that query. */
  assert.ok(!queryVariants('ram').includes('rama'), 'ram is too short to extend');
});

test('a query typed with diacritics still produces an ASCII variant', () => {
  const v = queryVariants('Kṛṣṇa');
  assert.ok(v.includes('Kṛṣṇa'), 'the query as typed comes first');
  assert.ok(
    v.some((s) => s.toLowerCase() === 'krishna'),
    `expected a "krishna" variant, got ${JSON.stringify(v)}`,
  );
});

/* ------------------------------------------------- question-shaped queries - */

test('a question reaches the same pin as the bare name', () => {
  const claimed = new Set(pinsData.pins.flatMap((p) => p.q));
  /** The first candidate that is actually a pinned query — what searchCorpus picks. */
  const hit = (q) => pinCandidates(fold(q)).find((c) => claimed.has(c));
  assert.equal(hit('who is rama'), 'rama');
  assert.equal(hit('who was ravana?'), 'ravana');
  assert.equal(hit('what is the kali yuga'), 'kali yuga');
  assert.equal(hit('tell me about samudra manthan'), 'samudra manthan');
  assert.equal(hit('the story of Dhruva'), 'dhruva');
  assert.equal(hit('lord shiva'), 'lord shiva');
});

test('the longest phrase wins, so a two-word pin is not answered by its first word', () => {
  const claimed = new Set(pinsData.pins.flatMap((p) => p.q));
  const hit = (q) => pinCandidates(fold(q)).find((c) => claimed.has(c));
  assert.equal(hit('kali yuga'), 'kali yuga', 'not the "kali" pin');
  assert.equal(hit('vishnu avatar'), 'vishnu avatar', 'not the "vishnu" pin');
  assert.equal(hit('samudra manthan'), 'samudra manthan');
});

test('pinCandidates puts the query first, is capped, and never repeats', () => {
  assert.equal(pinCandidates('rama')[0], 'rama');
  assert.equal(pinCandidates("").length, 0);
  const long = 'why did rama send sita away into the forest after the war';
  assert.deepEqual(pinCandidates(fold(long)), [fold(long)], 'over 8 words: no sub-phrase guessing');
  const c = pinCandidates('who is the great goddess durga');
  assert.equal(c[0], 'who is the great goddess durga');
  assert.ok(c.length <= 24, `${c.length} candidates`);
  assert.equal(new Set(c).size, c.length);
  /* candidates after the first are non-increasing in word count */
  const lens = c.slice(1).map((s) => s.split(' ').length);
  for (let i = 1; i < lens.length; i += 1) assert.ok(lens[i] <= lens[i - 1], `not longest-first: ${c.join(' | ')}`);
});

test('queryVariants never repeats itself and is empty for an empty query', () => {
  assert.deepEqual(queryVariants('   '), []);
  for (const q of ['rama', 'krishna', 'samudra manthan', 'Rāmāyaṇa']) {
    const v = queryVariants(q).map((s) => s.toLowerCase());
    assert.equal(new Set(v).size, v.length, `duplicate variant for ${q}: ${JSON.stringify(v)}`);
    assert.ok(v.length <= 5, `${q} produced ${v.length} variants`);
  }
});
