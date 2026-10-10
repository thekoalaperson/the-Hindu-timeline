import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  SECTION_ORDER,
  canonicalPath,
  dirToRoute,
  fold,
  normalizePath,
  pathToRoute,
  resolveLink,
  sectionLabel,
  sectionOf,
} from '../src/lib/routes.ts';

test('section prefixes map to clean segments', () => {
  assert.equal(pathToRoute('00-time-and-cosmology/units-of-time.md'), '/cosmology/units-of-time/');
  assert.equal(pathToRoute('02-deities-and-cosmic-hierarchy/dashavatara.md'), '/deities/dashavatara/');
  assert.equal(pathToRoute('04-deep-dives/krishna-lila.md'), '/stories/krishna-lila/');
  assert.equal(pathToRoute('90-literature-corpus/README.md'), '/texts/');
});

test('deeper segments keep their ordinal numeric prefixes', () => {
  // R1 §8: mahabharata zero-pads, ramayana does not — both keep the prefix.
  assert.equal(pathToRoute('04-deep-dives/mahabharata/01-adi-parva.md'), '/stories/mahabharata/01-adi-parva/');
  assert.equal(pathToRoute('04-deep-dives/ramayana/1-bala-kanda.md'), '/stories/ramayana/1-bala-kanda/');
  assert.equal(
    pathToRoute('90-literature-corpus/vedas/brahmanas/aitareya-brahmana.md'),
    '/texts/vedas/brahmanas/aitareya-brahmana/',
  );
});

test('the depth-5 kali-yuga files route in full', () => {
  assert.equal(
    pathToRoute('01-manvantaras/manvantara-07-vaivasvata/mahayuga-28-current/04-kali-yuga/README.md'),
    '/manvantaras/manvantara-07-vaivasvata/mahayuga-28-current/04-kali-yuga/',
  );
  assert.equal(
    pathToRoute('01-manvantaras/manvantara-07-vaivasvata/mahayuga-28-current/04-kali-yuga/recorded-history.md'),
    '/manvantaras/manvantara-07-vaivasvata/mahayuga-28-current/04-kali-yuga/recorded-history/',
  );
});

test('README.md maps to its directory route', () => {
  assert.equal(pathToRoute('08-beings-and-bestiary/README.md'), '/beings/');
  assert.equal(pathToRoute('04-deep-dives/mahabharata/README.md'), '/stories/mahabharata/');
  assert.equal(dirToRoute('04-deep-dives/ramayana'), '/stories/ramayana/');
});

test('the root apparatus files get bespoke routes', () => {
  assert.equal(pathToRoute('README.md'), '/');
  assert.equal(pathToRoute('AGENTS.md'), '/about/');
  assert.equal(pathToRoute('SOURCES.md'), '/sources/');
  assert.equal(pathToRoute('STRUCTURE.md'), '/about/structure/');
  assert.equal(pathToRoute('TIMELINE.md'), '/clock/');
});

test('the nine timeline files become clock periods', () => {
  assert.equal(pathToRoute('timeline/00-before-time.md'), '/clock/before-time/');
  assert.equal(pathToRoute('timeline/04-dvapara-yuga.md'), '/clock/dvapara-yuga/');
  assert.equal(pathToRoute('timeline/05-kali-yuga-scriptural.md'), '/clock/kali-yuga-scriptural/');
  assert.equal(pathToRoute('timeline/08-cross-yuga.md'), '/clock/cross-yuga/');
});

test('the one file/directory collision resolves to the directory (R1 §8)', () => {
  assert.equal(canonicalPath('04-deep-dives/bhagavad-gita.md'), '04-deep-dives/bhagavad-gita/README.md');
  assert.equal(pathToRoute('04-deep-dives/bhagavad-gita.md'), '/stories/bhagavad-gita/');
  assert.equal(pathToRoute('04-deep-dives/bhagavad-gita/README.md'), '/stories/bhagavad-gita/');
});

test('non-corpus paths have no route', () => {
  assert.equal(pathToRoute('media/README.md'), null);
  assert.equal(pathToRoute('tools/repo_tools.py'), null);
});

test('normalizePath and sectionOf', () => {
  assert.equal(normalizePath('a/./b/../c.md'), 'a/c.md');
  assert.equal(sectionOf('04-deep-dives/x.md'), '04-deep-dives');
  assert.equal(sectionOf('README.md'), '(root)');
});

test('resolveLink handles every relative shape in the corpus', () => {
  const from = '04-deep-dives/mahabharata/01-adi-parva.md';
  assert.deepEqual(resolveLink(from, 'README.md'), {
    kind: 'internal',
    href: '/stories/mahabharata/',
    target: '04-deep-dives/mahabharata/README.md',
  });
  assert.equal(resolveLink(from, './02-sabha-parva.md').href, '/stories/mahabharata/02-sabha-parva/');
  assert.equal(resolveLink(from, '../README.md').href, '/stories/');
  assert.equal(resolveLink(from, '../../02-deities-and-cosmic-hierarchy/dashavatara.md').href, '/deities/dashavatara/');
  // a directory link, with and without a trailing slash
  assert.equal(resolveLink(from, '../../01-manvantaras/').href, '/manvantaras/');
  assert.equal(resolveLink('08-beings-and-bestiary/garuda.md', '../08-beings-and-bestiary').href, '/beings/');
  // `../` from a section file is the repo root, i.e. home
  assert.equal(resolveLink('01-manvantaras/manvantara-06-chakshusha.md', '../').href, '/');
});

test('resolveLink keeps fragments', () => {
  const r = resolveLink('90-literature-corpus/vedas/pratishakhyas.md', '../upavedas-vedangas-darshanas.md#2-the-six');
  assert.equal(r.kind, 'internal');
  assert.equal(r.href, '/texts/upavedas-vedangas-darshanas/#2-the-six');
});

test('resolveLink sends the tooling layer to GitHub and leaves externals alone', () => {
  const jsonl = resolveLink('TIMELINE.md', 'data/events.jsonl');
  assert.equal(jsonl.kind, 'external');
  assert.match(jsonl.href, /github\.com\/.*\/blob\/main\/data\/events\.jsonl$/);

  const py = resolveLink('AGENTS.md', 'tools/repo_tools.py');
  assert.equal(py.kind, 'external');
  assert.match(py.href, /tools\/repo_tools\.py$/);

  const media = resolveLink('04-deep-dives/krishna-lila.md', '../media/stories/govardhana/');
  assert.equal(media.kind, 'external');

  const ext = resolveLink('08-beings-and-bestiary/garuda.md', 'https://en.wikipedia.org/wiki/Garuda');
  assert.deepEqual(ext, { kind: 'external', href: 'https://en.wikipedia.org/wiki/Garuda' });

  assert.deepEqual(resolveLink('README.md', '#anchor'), { kind: 'anchor', href: '#anchor' });
});

test('timeline/ as a directory link is the clock hub', () => {
  assert.equal(resolveLink('README.md', 'timeline/').href, '/clock/');
  assert.equal(resolveLink('timeline/02-satya-yuga.md', '03-treta-yuga.md').href, '/clock/treta-yuga/');
  assert.equal(resolveLink('timeline/02-satya-yuga.md', '../TIMELINE.md').href, '/clock/');
  assert.equal(resolveLink('timeline/02-satya-yuga.md', '../04-deep-dives/nara-narayana.md').href, '/stories/nara-narayana/');
});

test('fold strips IAST diacritics for search keys', () => {
  assert.equal(fold('Kṛṣṇa-līlā'), 'krsna-lila');
  assert.equal(fold('Śiva'), 'siva');
  assert.equal(fold('Mahābhārata'), 'mahabharata');
  assert.equal(fold('Tiruvāymoḻi'), 'tiruvaymoli');
});

test('every route ends with a slash', () => {
  const samples = [
    '00-time-and-cosmology/README.md',
    '04-deep-dives/ramayana/recensions/README.md',
    'timeline/07-future-manvantaras.md',
    'STRUCTURE.md',
  ];
  for (const s of samples) assert.match(pathToRoute(s), /\/$/, s);
});

/*
 * Pagefind 1.5.2 does NOT split `data-pagefind-meta` on commas: it stores the
 * whole tail as the value of the first key. The comma-joined form shipped
 * `section: "Stories, period:Tretā Yuga, period_slug:treta-yuga"` into 862 of
 * 947 index fragments, and every search card on the site printed it
 * (S1-report §5). One element per key is the only correct form, so no
 * template may emit a `data-pagefind-meta`/`-filter` value with more than one
 * `key:` in it. (This test replaces the old SECTION_ORDER guard: the search
 * sheet's own copy of that list went with the dead search block in
 * ShellScript.astro — the sheet now runs on `lib/search-client.ts`, which
 * reads the section label straight from this metadata.)
 */
test('every pagefind meta/filter value carries exactly one key', async () => {
  const files = [
    '../src/layouts/Article.astro',
    '../src/pages/clock/[period].astro',
    '../src/pages/films/[slug].astro',
  ];
  for (const rel of files) {
    const src = await readFile(new URL(rel, import.meta.url), 'utf8');
    for (const m of src.matchAll(/data-pagefind-(?:meta|filter)=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const raw = m[1] ?? m[2] ?? '';
      // An `${…}` interpolation is one opaque token; a label may legitimately
      // contain a comma ("Objects, Symbols & Arts") — what must never appear
      // is a *second* `key:` pair.
      const value = raw.replace(/\$\{[^}]*\}/g, 'X');
      if (!value.includes(':')) continue; // `data-pagefind-meta="title_folded"` — content form
      const colons = (value.match(/:/g) ?? []).length;
      assert.equal(colons, 1, `${rel}: "${raw}" declares ${colons} keys, must declare 1`);
    }
  }
});

/* The dead search engine in the shell (S1-report §9) stays deleted: it bound
   to `[data-search-panel]`, which no element carries since the sheet moved to
   `lib/search-client.ts`, and it cost ~4 KB of the every-page bundle. */
test('the shell no longer ships a second search engine', async () => {
  const src = await readFile(new URL('../src/components/ShellScript.astro', import.meta.url), 'utf8');
  assert.equal(src.includes('data-search-panel'), false);
  assert.equal(src.includes('/pagefind/pagefind.js'), false);
});
