/**
 * future.ts — the two stretches of road the first build left as fog.
 *
 * Everything here is taken from the corpus and cited on the object that shows
 * it, so nothing on the road is written in our own voice:
 *
 *   `01-manvantaras/manvantara-07-vaivasvata/mahayuga-28-current/04-kali-yuga/recorded-history.md`
 *     — the ten eras I–X and their dates, and the "two clocks" orientation
 *       (traditional 3102 BCE reckoning vs mainstream scholarly dating).
 *   `01-manvantaras/manvantara-08-savarni.md` … `manvantara-14-indra-savarni.md`
 *     — the names of the seven Manus still to come, and that the Night of
 *       Brahmā follows the fourteenth.
 *   `00-time-and-cosmology/kalpa-and-pralaya.md`, `brahma-lifetime.md`
 *     — the Night itself: the Saṃvartaka fire and the Saṃvartaka rain-clouds,
 *       the withdrawal into Brahmā as he sleeps, and the next dawn.
 */

export interface EraDef {
  numeral: string;
  name: string;
  /** As the corpus dates it. Scholarly unless the line says otherwise. */
  dates: string;
  line: string;
  route: string;
}

const HISTORY_ROUTE =
  '/manvantaras/manvantara-07-vaivasvata/mahayuga-28-current/04-kali-yuga/recorded-history/';

/**
 * The ten eras of `recorded-history.md`, in its own order, with the dates it
 * gives them. Every date here is the file's `[scholarly]` figure; the two
 * clocks are stated once, at the gate (see `TWO_CLOCKS`).
 */
export const ERAS: EraDef[] = [
  {
    numeral: 'I',
    name: 'Proto-history and the Indus link',
    dates: 'c. 2600–1900 BCE',
    line: 'The mature Harappan cities — planned streets, standard weights, a script still undeciphered. Whether they are Vedic is disputed.',
    route: HISTORY_ROUTE,
  },
  {
    numeral: 'II',
    name: 'The Vedic period',
    dates: 'c. 1500–500 BCE',
    line: 'The Rigveda is composed, then the later Vedas, the Brāhmaṇas and the first Upaniṣads. Tradition holds the Vedas are authorless and beginningless.',
    route: HISTORY_ROUTE,
  },
  {
    numeral: 'III',
    name: 'Cities, kingdoms and the śramaṇas',
    dates: 'c. 600–321 BCE',
    line: 'Sixteen mahājanapadas, coinage, and the Buddha and Mahāvīra — the challenge the older ritual world had to answer.',
    route: HISTORY_ROUTE,
  },
  {
    numeral: 'IV',
    name: 'Empires and classical Hinduism',
    dates: 'c. 322 BCE – 550 CE',
    line: 'Maurya and Gupta; Aśoka; the Purāṇas written down; Āryabhaṭa fixes the 3102 BCE epoch by astronomy in 499 CE.',
    route: HISTORY_ROUTE,
  },
  {
    numeral: 'V',
    name: 'Temples, dynasties and Tamil bhakti',
    dates: 'c. 500–1200 CE',
    line: 'The Ālvārs and Nāyanārs sing in Tamil; the Pallavas, Cholas and Chalukyas build the temple towns.',
    route: HISTORY_ROUTE,
  },
  {
    numeral: 'VI',
    name: 'The Ācāryas',
    dates: 'c. 700–1317 CE',
    line: 'Śaṅkara, Rāmānuja, Madhva — the three readings of the same verses. Tradition dates Śaṅkara a millennium earlier than scholarship does.',
    route: HISTORY_ROUTE,
  },
  {
    numeral: 'VII',
    name: 'The bhakti and sant movement',
    dates: '14th–17th century',
    line: 'Kabīr, Mīrā, Tulsīdās, Caitanya — God addressed in the languages people actually spoke.',
    route: HISTORY_ROUTE,
  },
  {
    numeral: 'VIII',
    name: 'Late medieval and early modern',
    dates: '16th–18th century',
    line: 'Empires meet, temples are rebuilt and destroyed, and the vernacular retellings become the versions most people know.',
    route: HISTORY_ROUTE,
  },
  {
    numeral: 'IX',
    name: 'Reform and the Hindu renaissance',
    dates: '19th–early 20th century',
    line: 'Rammohan Roy, Dayānanda, Ramakrishna and Vivekānanda — the tradition arguing with itself in print.',
    route: HISTORY_ROUTE,
  },
  {
    numeral: 'X',
    name: 'Modern and contemporary',
    dates: '20th–21st century',
    line: 'Diaspora, mass media, new temples on every continent — and this page.',
    route: HISTORY_ROUTE,
  },
];

/**
 * Stated once, at the Kali-history gate, and nowhere else on the road.
 * `recorded-history.md`, "Orientation: two clocks running at once".
 */
export const TWO_CLOCKS = {
  head: 'Two clocks run here',
  body: 'The traditional clock starts Kali Yuga at 3102 BCE, which makes 2026 CE the year 5,127. The scholarly clock rebuilds the same span from archaeology and text-criticism, and often disagrees. The dates on these markers are the scholarly ones; where the two part company the corpus says so.',
  cite: '04-kali-yuga/recorded-history.md — “Orientation: two clocks running at once”',
  route: HISTORY_ROUTE,
};

export interface ManuDef {
  n: number;
  name: string;
  line: string;
  route: string;
}

/** The seven Manus still to come, from their own corpus files. */
export const FUTURE_MANUS: ManuDef[] = [
  {
    n: 8,
    name: 'Sāvarṇi',
    line: 'The first of the future Manus — the age that opens when ours closes.',
    route: '/manvantaras/manvantara-08-savarni/',
  },
  {
    n: 9,
    name: 'Dakṣa-Sāvarṇi',
    line: 'The second of the six Sāvarṇi Manus.',
    route: '/manvantaras/manvantara-09-daksha-savarni/',
  },
  {
    n: 10,
    name: 'Brahma-Sāvarṇi',
    line: 'Three manvantaras after ours.',
    route: '/manvantaras/manvantara-10-brahma-savarni/',
  },
  {
    n: 11,
    name: 'Dharma-Sāvarṇi',
    line: 'The latter half of this Day of Brahmā.',
    route: '/manvantaras/manvantara-11-dharma-savarni/',
  },
  {
    n: 12,
    name: 'Rudra-Sāvarṇi',
    line: 'Two manvantaras still lie ahead after it.',
    route: '/manvantaras/manvantara-12-rudra-savarni/',
  },
  {
    n: 13,
    name: 'Deva-Sāvarṇi',
    line: 'Also called Raucya. Far ahead of anything the texts narrate.',
    route: '/manvantaras/manvantara-13-deva-savarni/',
  },
  {
    n: 14,
    name: 'Indra-Sāvarṇi',
    line: 'Also called Bhautya — the fourteenth and last. At its close comes the Night.',
    route: '/manvantaras/manvantara-14-indra-savarni/',
  },
];

/**
 * The end of the road. Every clause is in the two cited files; the citations
 * are printed on the gate exactly as the age gates print theirs.
 */
export const NIGHT = {
  title: 'The Night of Brahmā',
  hi: 'ब्राह्म प्रलय',
  line: 'At the end of the Day, the three worlds burn in the Saṃvartaka fire and then drown under the Saṃvartaka rain. Creation is withdrawn into Brahmā while he sleeps — a Night as long as the Day, 4,320,000,000 years.',
  facts: [
    'One Day of Brahmā = 4,320,000,000 years; the Night is as long',
    'Naimittika pralaya — fire, then rain, then the shoreless water',
    'This is his 51st year, and this Day is its first',
  ],
  cites: [
    { label: '00-time-and-cosmology/kalpa-and-pralaya.md', route: '/cosmology/kalpa-and-pralaya/' },
    { label: '00-time-and-cosmology/brahma-lifetime.md', route: '/cosmology/brahma-lifetime/' },
  ],
  /** The one action at the end of the world. */
  cta: 'and the morning comes again',
  ctaLine:
    'At the next dawn Brahmā wakes and emits the worlds again. The road you have just travelled starts over, at the waters.',
};

/** Kalki closes Kali Yuga — the last thing on the scriptural stretch. */
export const KALKI = {
  title: 'Kalki',
  line: 'The tenth avatāra rides out at the end of Kali Yuga, ends the age, and the Satya Yuga of the next mahāyuga begins.',
  route: '/manvantaras/manvantara-07-vaivasvata/mahayuga-28-current/04-kali-yuga/',
};
