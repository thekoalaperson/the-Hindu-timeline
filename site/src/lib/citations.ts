/**
 * citations.ts — the abbreviations the corpus uses inside a `(…)` citation,
 * mapped to the page that holds that text.
 *
 * Tapping a citation opens the peek card; the card offers a way into the text
 * itself when it can work out which text is meant. The card's first attempt is
 * an exact match against the *titles* of the pages under `/texts/`, which only
 * ever fires for a citation written out in full. The corpus almost never does:
 * it writes `(BhP 8.5)`, `(Mbh, Ādi Parva)`, `(VP 1.9)`, `(RV 10.129)`. This
 * table is the second attempt.
 *
 * Rules that keep it honest:
 *   · Order is most-specific-first — the first row that matches wins, so
 *     `Devī Bhāgavata` is tested before `Bhāgavata`.
 *   · An abbreviation matches only as a whole word, on the diacritic-folded
 *     text (`Bhāgavata` → `bhagavata`). A leading `^` anchors it to the start
 *     of the citation, which is how a bare `Gītā` is kept from claiming
 *     `Devī Gītā` and the dozen other gītās that have their own pages.
 *   · Every `route` is checked against `graph.json` when
 *     `/citation-texts.json` is built. A row whose page does not exist is
 *     dropped there rather than shipping a dead link.
 *   · `label` completes the sentence "Open …" on the card, so the reader knows
 *     where the link goes before tapping it.
 */
export interface CitationText {
  /** Site route of the page that holds this text. */
  route: string;
  /** Completes "Open …" on the peek card. */
  label: string;
  /** Folded, whole-word forms; `^form` must start the citation. */
  abbr: string[];
}

export const CITATION_TEXTS: CitationText[] = [
  {
    route: '/texts/puranas/devi-bhagavata-upapurana/',
    label: 'the Devī Bhāgavata',
    abbr: ['devi bhagavata', 'devi-bhagavata', 'devibhagavata'],
  },
  {
    route: '/deities/devi-mahatmya-and-the-great-goddess/',
    label: 'the Devī Māhātmya',
    abbr: ['devi mahatmya', 'devimahatmya', 'durga saptashati', 'saptashati', 'chandi'],
  },
  {
    route: '/texts/bhagavata-purana-skandha-map/',
    label: 'the Bhāgavata Purāṇa',
    abbr: ['bhagavata purana', 'srimad bhagavatam', 'bhagavatam', 'bhagavata', 'bhp', 'sb'],
  },
  {
    route: '/texts/puranas/vishnu-purana/',
    label: 'the Viṣṇu Purāṇa',
    abbr: ['vishnu purana', 'visnu purana', 'vp'],
  },
  {
    route: '/stories/mahabharata/',
    label: 'the Mahābhārata',
    abbr: ['mahabharata', 'mahabharatam', 'mbh'],
  },
  {
    route: '/stories/ramayana/',
    label: 'the Rāmāyaṇa',
    abbr: ['valmiki ramayana', 'ramayana', 'ramayanam', 'ram', 'vr'],
  },
  {
    route: '/texts/vedas/rigveda/',
    label: 'the Ṛgveda',
    abbr: ['rigveda', 'rig veda', 'rg veda', 'rv'],
  },
  {
    route: '/texts/puranas/shiva-purana/',
    label: 'the Śiva Purāṇa',
    abbr: ['shiva purana', 'siva purana', 'shivapurana', 'sivapurana'],
  },
  {
    route: '/texts/puranas/skanda-purana/',
    label: 'the Skanda Purāṇa',
    abbr: ['skanda purana', 'skanda'],
  },
  {
    route: '/texts/puranas/padma-purana/',
    label: 'the Padma Purāṇa',
    abbr: ['padma purana', 'padma'],
  },
  {
    route: '/texts/puranas/matsya-purana/',
    label: 'the Matsya Purāṇa',
    abbr: ['matsya purana', 'matsya'],
  },
  {
    route: '/stories/bhagavad-gita/',
    label: 'the Bhagavad Gītā',
    abbr: ['bhagavad gita', 'bhagavadgita', 'bg', '^gita'],
  },
];
