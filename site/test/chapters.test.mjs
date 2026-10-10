import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PERIOD_SLUGS } from '../src/lib/routes.ts';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const chapters = JSON.parse(readFileSync(new URL('../src/data/chapters.json', import.meta.url), 'utf8'));

test('chapters.json periods are present, in cosmic order, with no empty period', () => {
  assert.deepEqual(
    chapters.periods.map((p) => p.slug),
    PERIOD_SLUGS,
  );
  for (const period of chapters.periods) {
    assert.ok(period.chapters.length >= 4, `${period.slug} has too few chapters`);
  }
});

test('chapters.json ids are unique', () => {
  const ids = chapters.periods.flatMap((p) => p.chapters.map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('kali-yuga-history has exactly the ten dated eras', () => {
  const era = chapters.periods.find((p) => p.slug === 'kali-yuga-history');
  assert.equal(era.chapters.length, 10);
  for (const c of era.chapters) assert.ok(c.dates, `${c.id} is missing dates`);
});

// The full cross-file integrity check (routes, film slugs, source headings,
// art indices, covers prefixes) is heavier than a unit test belongs to be —
// scripts/check-chapters.mjs runs it and prints the per-period counts table.
test('scripts/check-chapters.mjs passes', () => {
  execFileSync(process.execPath, ['scripts/check-chapters.mjs'], { cwd: SITE, stdio: 'pipe' });
});
