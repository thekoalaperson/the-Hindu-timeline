import assert from 'node:assert/strict';
import test from 'node:test';
import { DIACRITIC_INVENTORY, plainSpans, plainSpelling, plainSpellingWithStats } from '../src/lib/plain-english.ts';
import exceptions from '../src/lib/plain-english-exceptions.json' with { type: 'json' };

// --- Core rule pipeline -----------------------------------------------

test('kṣ -> ksh', () => {
  assert.equal(plainSpelling('Kṛṣṇa'), 'Krishna');
  assert.equal(plainSpelling('Lakṣmī'), 'Lakshmi');
});

test('jñ -> jn', () => {
  assert.equal(plainSpelling('jñāna'), 'jnana');
  assert.equal(plainSpelling('Yajña'), 'Yajna');
});

test('bare c -> ch when not already followed by h', () => {
  assert.equal(plainSpelling('Rāmacandra'), 'Ramachandra');
  assert.equal(plainSpelling('Vāc'), 'Vach');
});

test('c already followed by h is left alone, not doubled into "chh"', () => {
  assert.equal(plainSpelling('Chāndogya'), 'Chandogya'); // leading "Ch" stays "Ch", not "Chh"
});

test('geminate cc -> cch, not chch', () => {
  // Brief-required: Uccaiḥśravas -> Ucchaihshravas (the horse), via rules alone.
  assert.equal(plainSpelling('Uccaiḥśravas'), 'Ucchaihshravas');
});

test('ś and ṣ both -> sh', () => {
  assert.equal(plainSpelling('Śiva'), 'Shiva');
  assert.equal(plainSpelling('Viṣṇu'), 'Vishnu');
});

test('ṛ and ṝ -> ri', () => {
  assert.equal(plainSpelling('Kṛṣṇa'), 'Krishna');
  assert.equal(plainSpelling('Ṛṣi'), 'Rishi');
});

test('ḷ -> li for a plain Sanskrit context (no Tamil markers)', () => {
  assert.equal(plainSpelling('kḷpta'), 'klipta');
});

test('ḷ -> l for a word carrying a Tamil marker (ṉ, ṟ, or ḻ)', () => {
  // "Āḻvār" carries ḻ, an unambiguous Tamil marker, alongside the diacritic ā.
  assert.equal(plainSpelling('Āḻvār'), 'Alvar');
});

test('ṃ/ṁ -> m, ḥ -> h', () => {
  assert.equal(plainSpelling('Saṃsāra'), 'Samsara');
  assert.equal(plainSpelling('Aṁśa'), 'Amsha');
  assert.equal(plainSpelling('Duḥkha'), 'Duhkha');
});

test('retroflex consonants ṇ/ṭ/ḍ -> n/t/d', () => {
  assert.equal(plainSpelling('Kṛṣṇa'), 'Krishna');
  assert.equal(plainSpelling('Kāṇḍa'), 'Kanda');
});

test('ñ and ṅ -> n', () => {
  assert.equal(plainSpelling('jñāna'), 'jnana');
  assert.equal(plainSpelling('Gaṅgā'), 'Ganga');
});

test('Tamil ṉ, ḻ, ṟ -> n, l, r', () => {
  assert.equal(plainSpelling('Nāyaṉār'), 'Nayanar');
  assert.equal(plainSpelling('Tirumoḻi'), 'Tirumoli');
  assert.equal(plainSpelling('Tirumaṅgai'), 'Tirumangai'); // ṅ, not a Tamil marker itself, still -> n
});

test('long vowels ā/ī/ū/ē/ō -> a/i/u/e/o', () => {
  assert.equal(plainSpelling('Rāmāyaṇa'), 'Ramayana');
  assert.equal(plainSpelling('Gītā'), 'Gita');
  assert.equal(plainSpelling('Sūrya'), 'Surya');
  assert.equal(plainSpelling('nēti'), 'neti'); // Dravidian long ē
  assert.equal(plainSpelling('kōṭi'), 'koti'); // Dravidian long ō
});

// --- Case preservation ---------------------------------------------------

test('case is preserved: Title, UPPER, lower', () => {
  assert.equal(plainSpelling('Śiva'), 'Shiva');
  assert.equal(plainSpelling('ŚIVA'), 'SHIVA');
  assert.equal(plainSpelling('śiva'), 'shiva');
});

test('an uppercase diacritic maps to a capitalized (not all-caps) multi-letter replacement', () => {
  assert.equal(plainSpelling('Ṛṣi'), 'Rishi'); // Ṛ -> "Ri", not "RI"
});

// --- Hyphens and possessives ---------------------------------------------

test('hyphens are preserved and both sides converted independently', () => {
  assert.equal(plainSpelling('Kṛṣṇa-līlā'), 'Krishna-lila');
  assert.equal(plainSpelling('Rāsa-līlā'), 'Rasa-lila');
});

test('possessives: apostrophe-s passes through untouched, root word converts', () => {
  assert.equal(plainSpelling("Kṛṣṇa's"), "Krishna's");
  assert.equal(plainSpelling("Śiva's"), "Shiva's");
  assert.equal(plainSpelling("Rāma’s"), 'Rama’s'); // curly apostrophe variant
});

// --- Exceptions dictionary (whole word, case-preserving) -----------------

test('exceptions dictionary overrides the rule output for Hindi-dominant place names', () => {
  assert.equal(plainSpelling('Vṛndāvana'), 'Vrindavan');
  assert.equal(plainSpelling('Dvārakā'), 'Dwarka');
  assert.equal(plainSpelling('Hastināpura'), 'Hastinapur');
  assert.equal(plainSpelling('Kailāsa'), 'Kailash');
});

test('exceptions dictionary applies even with zero diacritics present (ungated lookup)', () => {
  // "Caitanya" and "Svarga" carry no IAST diacritic at all, so they'd never
  // reach a diacritic-gated exceptions check — this is why the lookup in
  // plain-english.ts runs unconditionally rather than behind hasDiacritic().
  assert.equal(plainSpelling('Caitanya'), 'Chaitanya');
  assert.equal(plainSpelling('Svarga'), 'Swarga');
});

test('exceptions dictionary is case-preserving like the rule pipeline', () => {
  assert.equal(plainSpelling('caitanya'), 'chaitanya');
  assert.equal(plainSpelling('CAITANYA'), 'CHAITANYA');
});

test('the sv-/śv-/dv- cluster popularly spells with w, but plain-syllable v does not', () => {
  assert.equal(plainSpelling('Svāmī'), 'Swami');
  assert.equal(plainSpelling('Viśvāmitra'), 'Vishwamitra');
  assert.equal(plainSpelling('Aśvin'), 'Ashwin');
  // Contrast: Vishnu/Varuna/Vasishtha are plain-syllable "va-"/"vi-", not a
  // consonant-cluster "v" — they keep v, confirming this isn't a blanket rule.
  assert.equal(plainSpelling('Viṣṇu'), 'Vishnu');
  assert.equal(plainSpelling('Varuṇa'), 'Varuna');
  assert.equal(plainSpelling('Vasiṣṭha'), 'Vasishtha');
});

test('the "-ic" English suffix on a diacritic stem is not mistaken for a bare Sanskrit c', () => {
  assert.equal(plainSpelling('Purāṇic'), 'Puranic');
  assert.equal(plainSpelling('Vedāntic'), 'Vedantic');
});

test('ambiguous ḷ resolves per-word via the exceptions dictionary when the Tamil-marker heuristic alone is not enough', () => {
  // These carry ḷ but no ṉ/ṟ/ḻ, so the general heuristic would default to
  // Sanskrit "li" — wrong for these Tamil/Marathi names, hence exceptions.
  assert.equal(plainSpelling('Perumāḷ'), 'Perumal');
  assert.equal(plainSpelling('Tuḷu'), 'Tulu');
  assert.equal(plainSpelling('Āḷandī'), 'Alandi');
});

test('the documented Kālī / Kali collision: both spell "Kali"', () => {
  assert.equal(plainSpelling('Kālī'), 'Kali'); // the goddess
  assert.equal(plainSpelling('Kali'), 'Kali'); // the yuga — already plain, untouched
});

test('a phrase-level exception entry ("bhagavad gītā") is matched across word boundaries', () => {
  assert.equal(plainSpelling('Bhagavad Gītā'), 'Bhagavad Gita');
  assert.equal(plainSpelling('bhagavad gītā'), 'bhagavad gita');
});

test('every exceptions.json value is plain ASCII (so it can never re-trigger the rule pipeline)', () => {
  for (const [key, value] of Object.entries(exceptions)) {
    assert.ok(/^[\x00-\x7F]*$/.test(value), `value for "${key}" ("${value}") is not plain ASCII`);
  }
});

test('exceptions.json has at least 250 entries', () => {
  assert.ok(Object.keys(exceptions).length >= 250, `expected >= 250 entries, got ${Object.keys(exceptions).length}`);
});

// --- Idempotence -----------------------------------------------------------

test('plainSpelling is idempotent on individual words', () => {
  for (const word of ['Kṛṣṇa', 'Śiva', 'Vṛndāvana', 'Caitanya', 'Viśvāmitra', 'Uccaiḥśravas']) {
    const once = plainSpelling(word);
    assert.equal(plainSpelling(once), once, `not idempotent for "${word}"`);
  }
});

test('plainSpelling is idempotent on every exceptions.json value', () => {
  for (const value of Object.values(exceptions)) {
    assert.equal(plainSpelling(value), value);
  }
});

test('plainSpelling is idempotent on a full mixed-content passage', () => {
  const text =
    'Kṛṣṇa and Rādhā met in Vṛndāvana; the Bhāgavata Purāṇa calls this the Rāsa-līlā. ' +
    'Śrī Kṛṣṇa\'s flute, per the Gītā, drew the gopīs from Ayodhyā to Dvārakā.';
  const once = plainSpelling(text);
  assert.equal(plainSpelling(once), once);
});

// --- Untouched content -----------------------------------------------------

test('ordinary English words pass through untouched', () => {
  const text = 'The cause and effect of ancient chronicles remain a scholarly curiosity.';
  assert.equal(plainSpelling(text), text);
});

test('fenced and inline code spans are never touched', () => {
  assert.equal(plainSpelling('See `Kṛṣṇa` in code.'), 'See `Kṛṣṇa` in code.');
  const fenced = 'before\n```\nconst x = "Śiva";\n```\nafter Śiva';
  assert.equal(plainSpelling(fenced), 'before\n```\nconst x = "Śiva";\n```\nafter Shiva');
});

test('URLs are never touched even when they contain diacritic-looking paths', () => {
  const text = 'Visit https://example.com/Kṛṣṇa-page or www.example.com/Śiva for more.';
  assert.equal(plainSpelling(text), text);
});

test('Devanagari text is left completely untouched (never matched by the Latin tokenizer)', () => {
  const text = 'कृष्ण and Kṛṣṇa appear together.';
  assert.equal(plainSpelling(text), 'कृष्ण and Krishna appear together.');
});

test('empty and whitespace-only input round-trips safely', () => {
  assert.equal(plainSpelling(''), '');
  assert.equal(plainSpelling('   \n\t  '), '   \n\t  ');
});

// --- Mixed sentences ---------------------------------------------------

test('a realistic mixed sentence converts every diacritic word and leaves the rest alone', () => {
  const input = 'In the Rāmāyaṇa, Rāma and Sītā journey from Ayodhyā through the forest with Lakṣmaṇa.';
  const expected = 'In the Ramayana, Rama and Sita journey from Ayodhya through the forest with Lakshmana.';
  assert.equal(plainSpelling(input), expected);
});

test('a sentence mixing scripture titles, place names, and punctuation', () => {
  const input = 'The Bhāgavata Purāṇa (10.1) places Kṛṣṇa\'s birth at Mathurā, near Vṛndāvana.';
  const expected = 'The Bhagavata Purana (10.1) places Krishna\'s birth at Mathura, near Vrindavan.';
  assert.equal(plainSpelling(input), expected);
});

// --- Stats API ---------------------------------------------------------

test('plainSpellingWithStats reports scanned/transformed/exceptions counts', () => {
  const stats = plainSpellingWithStats("Kṛṣṇa and Śiva visited Vṛndāvana, but Rama stayed home.");
  assert.equal(stats.text, "Krishna and Shiva visited Vrindavan, but Rama stayed home.");
  assert.ok(stats.tokensScanned >= 9); // every Latin word token, including "and", "but", "Rama", "home"
  assert.equal(stats.tokensTransformed, 3); // Kṛṣṇa, Śiva, Vṛndāvana
  assert.ok(stats.exceptionsApplied >= 1); // Vṛndāvana resolves via the exceptions dictionary
});

test('plainSpellingWithStats.text matches plainSpelling on the same input', () => {
  const input = 'Śrīmad Bhāgavatam and the Yoga-Vāsiṣṭha are both cited here.';
  assert.equal(plainSpellingWithStats(input).text, plainSpelling(input));
});

// --- Diacritic inventory sanity ---------------------------------------------

test('DIACRITIC_INVENTORY exposes the full character set used to gate rule conversion', () => {
  assert.ok(DIACRITIC_INVENTORY.includes('ā'));
  assert.ok(DIACRITIC_INVENTORY.includes('ś'));
  assert.ok(DIACRITIC_INVENTORY.includes('ḷ'));
  assert.ok(DIACRITIC_INVENTORY.includes('ṉ'));
});

// --- plainSpans: the build-time form of the same decisions -------------

/*
 * The markdown pipeline ships the popular spelling as the page's own text and
 * carries the scholarly one in `data-iast` (rehype-corpus (l)), so a visitor
 * with JavaScript off reads Krishna rather than Kṛṣṇa. It gets the runs to
 * wrap from plainSpans(). Build and runtime must never disagree about a single
 * word, so: reassembling the spans has to reproduce plainSpelling() exactly.
 */
test('plainSpans reassembles to exactly plainSpelling', () => {
  const samples = [
    'Kṛṣṇa tells Arjuna that Śiva and Viṣṇu are one.',
    'The Bhagavad Gītā is spoken on the field of Kurukṣetra.',
    'Kṛṣṇa-līlā, Kṛṣṇa’s childhood, and Rāmacandra.',
    'Code stays put: `Kṛṣṇa` and https://example.com/Śiva and www.x.org/Kālī.',
    'Uccaiḥśravas, Lakṣmī, jñāna, Yajña, Caitanya, Svarga.',
    'Tiruvaḷḷuvar wrote the Tirukkuṟaḷ; Āḻvār hymns follow.',
    'देवनागरी stays Devanagari, and ordinary English is untouched.',
    '',
    'No diacritics at all here.',
  ];
  for (const text of samples) {
    const spans = plainSpans(text);
    const rebuilt = spans.reduceRight((s, m) => s.slice(0, m.start) + m.plain + s.slice(m.end), text);
    assert.equal(rebuilt, plainSpelling(text), text);
    for (const m of spans) {
      assert.equal(text.slice(m.start, m.end), m.iast, `${text} :: ${m.iast}`);
      assert.notEqual(m.plain, m.iast);
    }
  }
});

test('plainSpans covers the whole exceptions dictionary', () => {
  for (const key of Object.keys(exceptions)) {
    const text = `A ${key} B`;
    const rebuilt = plainSpans(text).reduceRight((s, m) => s.slice(0, m.start) + m.plain + s.slice(m.end), text);
    assert.equal(rebuilt, plainSpelling(text), key);
  }
});
