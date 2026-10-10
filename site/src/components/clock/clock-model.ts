/**
 * clock-model.ts — the nested cyclic time of the Hindu Timeline corpus, as data.
 *
 * Pure TypeScript. No React, no DOM, no I/O. Every number below is carried from a
 * corpus file and cited in a comment on the line that declares it. The corpus
 * deliberately records variants; this model encodes only the **standard Purāṇic
 * scheme** and points at the corpus page where the variants live
 * (see COLOUR_NOTE and SANDHYA_NOTE at the foot of this file).
 *
 * Corpus files used:
 *   00-time-and-cosmology/units-of-time.md        — the deva ratio, the yuga table
 *   00-time-and-cosmology/yugas-and-mahayuga.md   — yuga lengths, sandhyā, Kali epoch
 *   00-time-and-cosmology/manvantara-system.md    — 71 mahāyugas, the 14 Manus, "where we are now"
 *   00-time-and-cosmology/kalpa-and-pralaya.md    — the kalpa arithmetic, Śveta-Vārāha
 *   00-time-and-cosmology/brahma-lifetime.md      — 100 Brahmā-years, the 51st year
 *   README.md §"You Are Here"                     — the current cosmic address
 *   TIMELINE.md                                   — the 9 periods and their event counts
 *   04-deep-dives/nimi-nava-yogendra-samvada.md   — Bhāg. 11.5 yuga colours + the Garga variant
 */

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Durations
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * The four yugas in human years, ratio 4 : 3 : 2 : 1 — each figure is the yuga's
 * main period plus its sandhyā (dawn) and sandhyāṃśa (dusk), each twilight 1/10
 * of the main period, converted at 1 divine year = 360 human years.
 * Source: 00-time-and-cosmology/yugas-and-mahayuga.md, "The Mahāyuga at a glance"
 * (Viṣṇu Purāṇa 1.3; Bhāgavata Purāṇa 3.11; Sūrya Siddhānta 1.15–21);
 * same table in 00-time-and-cosmology/units-of-time.md §4.
 */
export const YUGA_YEARS = {
  satya: 1_728_000,
  treta: 1_296_000,
  dvapara: 864_000,
  kali: 432_000,
} as const;

export type YugaKey = keyof typeof YUGA_YEARS;
export const YUGA_ORDER: YugaKey[] = ['satya', 'treta', 'dvapara', 'kali'];

/** 1 Mahāyuga (Chaturyuga) = 4,320,000 human years. Source: yugas-and-mahayuga.md. */
export const MAHAYUGA_YEARS = 4_320_000;

/** 71 Mahāyugas to a Manvantara. Source: manvantara-system.md §1 (Viṣṇu Purāṇa 1.3; Manusmṛti 1.64–80). */
export const MAHAYUGAS_PER_MANVANTARA = 71;

/** 1 Manvantara = 71 × 4,320,000 = 306,720,000 years. Source: manvantara-system.md §1. */
export const MANVANTARA_YEARS = MAHAYUGAS_PER_MANVANTARA * MAHAYUGA_YEARS; // 306,720,000

/**
 * Each inter-manvantara sandhyā (juncture) = one Satya Yuga = 1,728,000 years.
 * 15 of them bracket the 14 manvantaras — one before each, one after the last.
 * Source: 00-time-and-cosmology/kalpa-and-pralaya.md §1 ("Arithmetic check": 14 × 71 = 994,
 * + 15 × 0.4 mahāyuga = 6, total 1000 mahāyugas).
 */
export const SANDHYA_YEARS = YUGA_YEARS.satya; // 1,728,000
export const MANVANTARAS_PER_KALPA = 14;
export const SANDHYAS_PER_KALPA = 15;

/** 1 Kalpa (a Day of Brahmā) = 1000 mahāyugas = 4.32 billion years. Source: kalpa-and-pralaya.md §1. */
export const KALPA_YEARS = 4_320_000_000;

/** Brahmā's Night equals his Day; one ahorātra of Brahmā = 8.64 billion years. Source: brahma-lifetime.md §1. */
export const BRAHMA_DAY_NIGHT_YEARS = 2 * KALPA_YEARS; // 8,640,000,000

/** 360 day+night pairs make a Brahmā-year (≈3.1104 trillion years). Source: brahma-lifetime.md §1. */
export const DAYS_PER_BRAHMA_YEAR = 360;
export const BRAHMA_YEAR_YEARS = DAYS_PER_BRAHMA_YEAR * BRAHMA_DAY_NIGHT_YEARS; // 3,110,400,000,000

/** 100 Brahmā-years = the Mahākalpa = 311.04 trillion human years. Source: brahma-lifetime.md §1. */
export const BRAHMA_LIFE_YEARS_COUNT = 100;
export const MAHAKALPA_YEARS = BRAHMA_LIFE_YEARS_COUNT * BRAHMA_YEAR_YEARS; // 311,040,000,000,000

/**
 * Kali Yuga's traditional epoch: 3102 BCE (17/18 February, midnight).
 * Source: yugas-and-mahayuga.md, "Kali Yuga — Start epoch" (Sūrya Siddhānta; Āryabhaṭīya).
 */
export const KALI_EPOCH_BCE = 3102;

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Where we are — the current cosmic address
 * Source: README.md §"📍 You Are Here"; brahma-lifetime.md §2; manvantara-system.md §6.
 * ────────────────────────────────────────────────────────────────────────── */

export const CURRENT = {
  /** 1st day of the 51st year of 100 (the first half, the Pūrva-Parārdha, is complete). brahma-lifetime.md §2. */
  brahmaYear: 51,
  brahmaDay: 1,
  /** The Śveta-Vārāha ("White Boar") Kalpa. kalpa-and-pralaya.md §4 (Viṣṇu Purāṇa 1.4). */
  kalpaName: 'Śveta-Vārāha',
  /** 7th Manvantara, ruled by Vaivasvata Manu. manvantara-system.md §2. */
  manvantara: 7,
  /** 28th Mahāyuga of that manvantara's 71. manvantara-system.md §6. */
  mahayuga: 28,
  /** Kali Yuga. README.md §"You Are Here". */
  yuga: 'kali' as YugaKey,
} as const;

/**
 * The ORDINAL of the Kali year we stand in: 2026 CE is the **5,128th** year.
 * `year + 3102` counts the current year inclusively, which is what an ordinal is.
 * The corpus gives "≈ 5,127–5,128 years elapsed as of 2026 CE" (manvantara-system.md §6;
 * yugas-and-mahayuga.md, "Kali Yuga"); the ±1 there is exactly this distinction,
 * plus the no-year-zero / February-epoch slack.
 */
export function kaliYearOrdinal(gregorianYear: number = new Date().getUTCFullYear()): number {
  return gregorianYear + KALI_EPOCH_BCE;
}

/**
 * Whole Kali years COMPLETED: **5,127** by 2026 CE. This is the number the site
 * says out loud — "5,127 years into 432,000 — the 5,128th year" — because
 * calling the 5,128th year "elapsed" claims a year that has not finished.
 */
export function kaliYearsCompleted(gregorianYear?: number): number {
  return kaliYearOrdinal(gregorianYear) - 1;
}

/**
 * The figure the arithmetic uses. Identical to the ordinal (the fraction of a
 * 432,000-year cycle is unmoved by a single year either way, and rounding up
 * keeps every cycle above it — mahāyuga, manvantara, kalpa — on one convention).
 * Prefer `kaliYearsCompleted` / `kaliYearOrdinal` for anything a reader sees.
 */
export function kaliYearsElapsed(gregorianYear?: number): number {
  return kaliYearOrdinal(gregorianYear);
}

/** Years elapsed inside the 28th Mahāyuga: Satya + Tretā + Dvāpara complete, plus Kali so far. */
export function mahayugaYearsElapsed(gregorianYear?: number): number {
  return (
    YUGA_YEARS.satya + YUGA_YEARS.treta + YUGA_YEARS.dvapara + kaliYearsElapsed(gregorianYear)
  ); // 3,888,000 + 5,128 = 3,893,128 for 2026 CE
}

/** Years elapsed inside the 7th Manvantara: 27 whole mahāyugas plus the 28th so far. */
export function manvantaraYearsElapsed(gregorianYear?: number): number {
  return (CURRENT.mahayuga - 1) * MAHAYUGA_YEARS + mahayugaYearsElapsed(gregorianYear);
} // 116,640,000 + 3,893,128 = 120,533,128

/**
 * Years elapsed inside the Śveta-Vārāha Kalpa:
 *   6 complete manvantaras          6 × 306,720,000 = 1,840,320,000
 * + 7 sandhyās (one before each mv) 7 ×   1,728,000 =    12,096,000
 * + 27 complete mahāyugas of mv 7  27 ×   4,320,000 =   116,640,000
 * + Satya + Tretā + Dvāpara of #28                  =     3,888,000
 * + Kali so far                                     =         5,128
 *                                                     ---------------
 *                                                     1,972,949,128  (45.67% of the day)
 * Derived here from the corpus figures above (kalpa-and-pralaya.md §1 supplies the
 * 14-manvantaras-plus-15-sandhyās structure); it is not itself a quoted scriptural number.
 */
export function kalpaYearsElapsed(gregorianYear?: number): number {
  return (
    (CURRENT.manvantara - 1) * MANVANTARA_YEARS +
    CURRENT.manvantara * SANDHYA_YEARS +
    manvantaraYearsElapsed(gregorianYear)
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. The 14 Manus
 * Names as the corpus sets them: README.md §01 (IAST) cross-checked against the
 * roster table in 00-time-and-cosmology/manvantara-system.md §2
 * (Viṣṇu Purāṇa 3.1–2; Bhāgavata Purāṇa 8.1, 8.13).
 * ────────────────────────────────────────────────────────────────────────── */

export interface Manu {
  n: number;
  name: string;
  /** Variant naming recorded in manvantara-system.md §2, shown in the tooltip/aria text. */
  alsoKnownAs?: string;
}

export const MANUS: Manu[] = [
  { n: 1, name: 'Svāyambhuva' },
  { n: 2, name: 'Svārociṣa' },
  { n: 3, name: 'Uttama', alsoKnownAs: 'Auttami' },
  { n: 4, name: 'Tāmasa', alsoKnownAs: 'Tapasa' }, // variant spelling, manvantara-system.md §2
  { n: 5, name: 'Raivata' },
  { n: 6, name: 'Cākṣuṣa' },
  { n: 7, name: 'Vaivasvata', alsoKnownAs: 'Śrāddhadeva' }, // current; son of Vivasvat (Sūrya)
  { n: 8, name: 'Sāvarṇi' },
  { n: 9, name: 'Dakṣa-Sāvarṇi' },
  { n: 10, name: 'Brahma-Sāvarṇi' },
  { n: 11, name: 'Dharma-Sāvarṇi' },
  { n: 12, name: 'Rudra-Sāvarṇi' },
  { n: 13, name: 'Deva-Sāvarṇi', alsoKnownAs: 'Raucya' }, // Mārkaṇḍeya Purāṇa variant
  { n: 14, name: 'Indra-Sāvarṇi', alsoKnownAs: 'Bhautya' }, // Mārkaṇḍeya Purāṇa variant
];

/* ────────────────────────────────────────────────────────────────────────────
 * 4. The nine corpus periods
 * Titles, event counts and order from TIMELINE.md ("7919 distinct events across
 * 9 periods"); routes from the product spec (`/clock/<period-slug>/`).
 * ────────────────────────────────────────────────────────────────────────── */

export type PeriodSlug =
  | 'before-time'
  | 'earlier-manvantaras'
  | 'satya-yuga'
  | 'treta-yuga'
  | 'dvapara-yuga'
  | 'kali-yuga-scriptural'
  | 'kali-yuga-history'
  | 'future-manvantaras'
  | 'cross-yuga';

export interface Period {
  slug: PeriodSlug;
  /** Full title, used in prose and accessible names. */
  title: string;
  /** Short title for the dial, where a wedge has one line to say it in. */
  dialTitle: string;
  /** One line, used under the dial and in the accessible name. */
  dek: string;
  route: string;
  /** Event count from TIMELINE.md (sums to 7,919). */
  events: number;
  /** CSS custom property carrying this period's hue (DESIGN-BRIEF §2). */
  hueVar: string;
  /** Where it hangs on the dial. 'unfixed' periods are listed off-dial. */
  placement:
    | { kind: 'kalpa-dawn' }
    | { kind: 'manvantaras'; from: number; to: number }
    | { kind: 'yuga'; yuga: YugaKey }
    | { kind: 'unfixed' };
}

export const PERIODS: Period[] = [
  {
    slug: 'before-time',
    title: 'Before time',
    dialTitle: 'Before time',
    dek: 'Cosmogony and the first creation',
    route: '/clock/before-time/',
    events: 473,
    hueVar: '--period-before',
    placement: { kind: 'kalpa-dawn' },
  },
  {
    slug: 'earlier-manvantaras',
    title: 'Earlier manvantaras',
    dialTitle: 'Earlier manvantaras',
    dek: 'The six manvantaras before ours, and the primordial reigns',
    route: '/clock/earlier-manvantaras/',
    events: 539,
    hueVar: '--period-earlier',
    placement: { kind: 'manvantaras', from: 1, to: 6 },
  },
  {
    slug: 'satya-yuga',
    title: 'Satya Yuga',
    dialTitle: 'Satya Yuga',
    dek: 'Dharma on four legs — the early avatāras and the churning of the ocean',
    route: '/clock/satya-yuga/',
    events: 307,
    hueVar: '--yuga-satya',
    placement: { kind: 'yuga', yuga: 'satya' },
  },
  {
    slug: 'treta-yuga',
    title: 'Tretā Yuga',
    dialTitle: 'Tretā Yuga',
    dek: 'Dharma on three legs — Vāmana, Paraśurāma and the Rāmāyaṇa',
    route: '/clock/treta-yuga/',
    events: 1167,
    hueVar: '--yuga-treta',
    placement: { kind: 'yuga', yuga: 'treta' },
  },
  {
    slug: 'dvapara-yuga',
    title: 'Dvāpara Yuga',
    dialTitle: 'Dvāpara Yuga',
    dek: 'Dharma on two legs — Kṛṣṇa and the Mahābhārata',
    route: '/clock/dvapara-yuga/',
    events: 1720,
    hueVar: '--yuga-dvapara',
    placement: { kind: 'yuga', yuga: 'dvapara' },
  },
  {
    slug: 'kali-yuga-scriptural',
    title: 'Kali Yuga — scriptural',
    dialTitle: 'Scriptural',
    dek: 'The current age as the texts tell it, to its prophesied end with Kalki',
    route: '/clock/kali-yuga-scriptural/',
    events: 492,
    hueVar: '--yuga-kali',
    placement: { kind: 'yuga', yuga: 'kali' },
  },
  {
    slug: 'kali-yuga-history',
    title: 'Kali Yuga — documented history',
    dialTitle: 'Documented history',
    dek: 'The academic timeline, kept distinct from scripture',
    route: '/clock/kali-yuga-history/',
    events: 1539,
    hueVar: '--yuga-kali',
    placement: { kind: 'yuga', yuga: 'kali' },
  },
  {
    slug: 'future-manvantaras',
    title: 'Future manvantaras',
    dialTitle: 'Future manvantaras',
    dek: 'What the texts foretell after our age, up to the Night of Brahmā',
    route: '/clock/future-manvantaras/',
    events: 55,
    hueVar: '--period-future',
    placement: { kind: 'manvantaras', from: 8, to: 14 },
  },
  {
    slug: 'cross-yuga',
    title: 'Cross-yuga',
    dialTitle: 'Cross-yuga',
    dek: 'Episodes the texts do not pin to one age',
    route: '/clock/cross-yuga/',
    events: 1627,
    hueVar: '--period-cross',
    placement: { kind: 'unfixed' },
  },
];

export const TOTAL_EVENTS = PERIODS.reduce((s, p) => s + p.events, 0); // 7,919 — TIMELINE.md

export function periodBySlug(slug: PeriodSlug): Period {
  const p = PERIODS.find((x) => x.slug === slug);
  if (!p) throw new Error(`unknown period ${slug}`);
  return p;
}

export function periodsForYuga(y: YugaKey): Period[] {
  return PERIODS.filter((p) => p.placement.kind === 'yuga' && p.placement.yuga === y);
}

export function periodForManvantara(n: number): Period | undefined {
  return PERIODS.find(
    (p) => p.placement.kind === 'manvantaras' && n >= p.placement.from && n <= p.placement.to,
  );
}

/** Periods that hang off no single point on the dial; surfaced in the footnote row. */
export const OFF_DIAL_PERIODS: Period[] = PERIODS.filter(
  (p) => p.placement.kind === 'unfixed' || p.placement.kind === 'kalpa-dawn',
);

/* ────────────────────────────────────────────────────────────────────────────
 * 5. Levels, divisions and state
 * ────────────────────────────────────────────────────────────────────────── */

/** The five levels you can stand inside. `brahma-year` is a division, not a stop. */
export type Level = 'brahma' | 'kalpa' | 'manvantara' | 'mahayuga' | 'yuga';
export const LEVELS: Level[] = ['brahma', 'kalpa', 'manvantara', 'mahayuga', 'yuga'];

/** The six divisions of the dial stack, outermost cycle first. */
export type DivisionKey =
  | 'brahma-years' // 100 years of Brahmā's life
  | 'brahma-days' //  360 day+night pairs in a Brahmā-year
  | 'manvantaras' //   14 manvantaras (+15 sandhyās) in a kalpa
  | 'mahayugas' //     71 mahāyugas in a manvantara
  | 'yugas' //          4 yugas in a mahāyuga
  | 'periods'; //       the corpus periods inside a yuga

const DIVISION_ORDER: DivisionKey[] = [
  'brahma-years',
  'brahma-days',
  'manvantaras',
  'mahayugas',
  'yugas',
  'periods',
];

/** Depth of each level in DIVISION_ORDER — i.e. which division its children are. */
const LEVEL_DEPTH: Record<Level, number> = {
  brahma: 0,
  kalpa: 2,
  manvantara: 3,
  mahayuga: 4,
  yuga: 5,
};

export interface ClockState {
  /** 1–100. The corpus only ever names the 51st. */
  brahmaYear: number;
  /** Day of Brahmā within that year, 1–360. The corpus only names day 1 (Śveta-Vārāha). */
  kalpa: number;
  manvantara?: number;
  mahayuga?: number;
  yuga?: YugaKey;
  /** Optional leaf selection: a corpus period. Never a focus level; it is a link. */
  period?: PeriodSlug;
  /** The node you are standing inside; its children are the outer ring. */
  level: Level;
}

/** The "you are here" state, focused at the kalpa (outer ring = the 14 manvantaras). */
export const NOW_STATE: ClockState = {
  brahmaYear: CURRENT.brahmaYear,
  kalpa: CURRENT.brahmaDay,
  manvantara: CURRENT.manvantara,
  mahayuga: CURRENT.mahayuga,
  yuga: CURRENT.yuga,
  level: 'kalpa',
};

/** True when the path down to `level` is the path time actually took. */
export function isNowPath(s: ClockState, level: Level): boolean {
  if (s.brahmaYear !== CURRENT.brahmaYear || s.kalpa !== CURRENT.brahmaDay) return false;
  if (level === 'brahma' || level === 'kalpa') return true;
  if (s.manvantara !== CURRENT.manvantara) return false;
  if (level === 'manvantara') return true;
  if (s.mahayuga !== CURRENT.mahayuga) return false;
  if (level === 'mahayuga') return true;
  return s.yuga === CURRENT.yuga;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 6. Elapsed fractions
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * How far through `level`'s own cycle "now" is, in [0,1].
 *   brahma     0.500006  — half of Brahmā's life, to six places
 *   kalpa      0.456701  — 1,972,949,128 of 4,320,000,000 years
 *   manvantara 0.392974  — 27.9012 of 71 mahāyugas
 *   mahayuga   0.901187  — 3,893,128 of 4,320,000 years
 *   yuga       0.011870  — 5,128 of 432,000 years: the sliver
 * Returns 0 (not yet begun) or 1 (complete) when `state` is off the now-path.
 */
export function fractionElapsed(
  level: Level,
  state: ClockState = NOW_STATE,
  gregorianYear?: number,
): number {
  if (!isNowPath(state, level)) return offPathFraction(level, state);
  switch (level) {
    case 'brahma': {
      // (51st year − 1) whole years, plus the part of the current ahorātra elapsed.
      const withinYear = (CURRENT.brahmaDay - 1 + kalpaFraction(gregorianYear) / 2) / DAYS_PER_BRAHMA_YEAR;
      return (CURRENT.brahmaYear - 1 + withinYear) / BRAHMA_LIFE_YEARS_COUNT;
    }
    case 'kalpa':
      return kalpaFraction(gregorianYear);
    case 'manvantara':
      return manvantaraYearsElapsed(gregorianYear) / MANVANTARA_YEARS;
    case 'mahayuga':
      return mahayugaYearsElapsed(gregorianYear) / MAHAYUGA_YEARS;
    case 'yuga':
      return kaliYearsElapsed(gregorianYear) / YUGA_YEARS.kali;
  }
}

function kalpaFraction(gregorianYear?: number): number {
  return kalpaYearsElapsed(gregorianYear) / KALPA_YEARS;
}

/** For a selection off the now-path: 1 if that branch is wholly past, 0 if wholly future. */
function offPathFraction(level: Level, s: ClockState): number {
  const cmp = (a?: number, b?: number) => (a ?? 0) - (b ?? 0);
  let d = cmp(s.brahmaYear, CURRENT.brahmaYear) || cmp(s.kalpa, CURRENT.brahmaDay);
  if (!d && level !== 'brahma' && level !== 'kalpa') d = cmp(s.manvantara, CURRENT.manvantara);
  if (!d && (level === 'mahayuga' || level === 'yuga')) d = cmp(s.mahayuga, CURRENT.mahayuga);
  if (!d && level === 'yuga') d = YUGA_ORDER.indexOf(s.yuga ?? 'satya') - YUGA_ORDER.indexOf(CURRENT.yuga);
  return d < 0 ? 1 : 0;
}

/** Human years elapsed in `level`'s cycle, and the cycle's total length. */
export function elapsedYears(level: Level, gregorianYear?: number): { elapsed: number; total: number } {
  switch (level) {
    case 'brahma':
      return { elapsed: fractionElapsed('brahma', NOW_STATE, gregorianYear) * MAHAKALPA_YEARS, total: MAHAKALPA_YEARS };
    case 'kalpa':
      return { elapsed: kalpaYearsElapsed(gregorianYear), total: KALPA_YEARS };
    case 'manvantara':
      return { elapsed: manvantaraYearsElapsed(gregorianYear), total: MANVANTARA_YEARS };
    case 'mahayuga':
      return { elapsed: mahayugaYearsElapsed(gregorianYear), total: MAHAYUGA_YEARS };
    case 'yuga':
      return { elapsed: kaliYearsElapsed(gregorianYear), total: YUGA_YEARS.kali };
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 7. Ring contents — what a division's wedges are
 * ────────────────────────────────────────────────────────────────────────── */

export type Tone = 'past' | 'current' | 'future' | 'neutral';

export interface Wedge {
  key: string;
  /** 1-based index within the division. */
  n: number;
  /** Start and end as fractions of the full turn, before rotation. */
  from: number;
  to: number;
  tone: Tone;
  /** Short label drawn in the band when there is room (numeral or name). */
  label?: string;
  /** Longer label drawn when the ring is the interactive one and there is room. */
  longLabel?: string;
  /** A quiet second line under the label — the event count, when there is room. */
  subLabel?: string;
  /** Fill with a wash of `hueVar` rather than the hue itself (the period ring). */
  tint?: boolean;
  /** Accessible name — always complete, even when every label is dropped. */
  aria: string;
  /** Fill hue, as a CSS custom-property name; undefined = the default tone fills. */
  hueVar?: string;
  /** Text colour over `hueVar`, as a custom-property name. */
  onHueVar?: string;
  /** True when activating this wedge zooms one level in. */
  zoomsTo?: Level;
  /** Set instead of `zoomsTo` when the wedge is a link out to a corpus period page. */
  href?: string;
  eventCount?: number;
  /** Selected child of this division, for the context rings. */
  selected?: boolean;
}

export interface Ring {
  division: DivisionKey;
  wedges: Wedge[];
  /** Number of wedges; used to decide label density and hit-area strategy. */
  count: number;
  /** Fraction of the cycle that must sit under the index mark at 12 o'clock. */
  align: number;
  /** A ring drawn as a continuous fine gauge rather than individually stroked ticks. */
  gauge: boolean;
  /** Accessible name for the ring group. */
  aria: string;
}

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
export const ordinal = ord;

export const YUGA_LABEL: Record<YugaKey, string> = {
  satya: 'Satya',
  treta: 'Tretā',
  dvapara: 'Dvāpara',
  kali: 'Kali',
};

export function formatYears(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toLocaleString('en-US', { maximumFractionDigits: 2 })} trillion`;
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })} billion`;
  return Math.round(n).toLocaleString('en-US');
}

/**
 * The manvantara ring is not evenly divided: 14 manvantaras of 71 mahāyugas each,
 * separated by 15 sandhyās of 0.4 mahāyuga each, totalling 1000 mahāyugas.
 * (kalpa-and-pralaya.md §1.) Each sandhyā is 0.04% of the turn — 0.144° — so the
 * renderer widens the gaps to a visible hairline; the wedge *spans* stay true.
 */
export const KALPA_UNITS = 1000; // mahāyugas in a kalpa
export function manvantaraSpan(n: number): { from: number; to: number } {
  const sandhya = SANDHYA_YEARS / MAHAYUGA_YEARS; // 0.4 mahāyuga
  const start = sandhya + (n - 1) * (MAHAYUGAS_PER_MANVANTARA + sandhya);
  return { from: start / KALPA_UNITS, to: (start + MAHAYUGAS_PER_MANVANTARA) / KALPA_UNITS };
}

function toneFor(n: number, current: number | undefined): Tone {
  if (current === undefined) return 'neutral';
  return n === current ? 'current' : n < current ? 'past' : 'future';
}

/** Build the wedges of one division, given the state that supplies its parents. */
export function ringFor(division: DivisionKey, s: ClockState, gregorianYear?: number): Ring {
  switch (division) {
    case 'brahma-years': {
      const wedges: Wedge[] = [];
      for (let n = 1; n <= BRAHMA_LIFE_YEARS_COUNT; n++) {
        const tone = toneFor(n, CURRENT.brahmaYear);
        const marked = n === 1 || n === 50 || n === CURRENT.brahmaYear || n === 100;
        wedges.push({
          key: `by${n}`,
          n,
          from: (n - 1) / 100,
          to: n / 100,
          tone,
          label: marked ? String(n) : undefined,
          aria:
            `Year ${n} of Brahmā's 100` +
            (tone === 'current' ? ' — the current year, its first day' : tone === 'past' ? ' — elapsed' : ' — to come'),
          zoomsTo: 'kalpa',
          selected: n === s.brahmaYear,
        });
      }
      return {
        division,
        wedges,
        count: 100,
        align: fractionElapsed('brahma', s, gregorianYear),
        gauge: false,
        aria: "Brahmā's life — 100 years",
      };
    }

    case 'brahma-days': {
      // 360 day+night pairs. Drawn as a fine gauge; only day 1 is a named kalpa.
      const wedges: Wedge[] = [];
      for (let n = 1; n <= DAYS_PER_BRAHMA_YEAR; n++) {
        wedges.push({
          key: `bd${n}`,
          n,
          from: (n - 1) / DAYS_PER_BRAHMA_YEAR,
          to: n / DAYS_PER_BRAHMA_YEAR,
          tone: toneFor(n, CURRENT.brahmaDay),
          aria: `Day ${n} of 360 in Brahmā's ${ord(s.brahmaYear)} year`,
          selected: n === s.kalpa,
        });
      }
      return {
        division,
        wedges,
        count: 360,
        align: (s.kalpa - 1 + fractionElapsed('kalpa', s, gregorianYear)) / DAYS_PER_BRAHMA_YEAR,
        gauge: true,
        aria: `360 days of Brahmā's ${ord(s.brahmaYear)} year`,
      };
    }

    case 'manvantaras': {
      const wedges: Wedge[] = MANUS.map((m) => {
        const span = manvantaraSpan(m.n);
        const tone = toneFor(m.n, CURRENT.manvantara);
        const period = periodForManvantara(m.n);
        return {
          key: `mv${m.n}`,
          n: m.n,
          ...span,
          tone,
          label: String(m.n),
          longLabel: m.name,
          aria:
            `${ord(m.n)} manvantara of 14 — ${m.name} Manu` +
            (m.alsoKnownAs ? ` (also ${m.alsoKnownAs})` : '') +
            (tone === 'current'
              ? ', the current age'
              : period
                ? `, ${period.title.toLowerCase()}, ${period.events.toLocaleString('en-US')} events`
                : ''),
          // Past and future manvantaras are *tinted* by their tone, not filled with a
          // period colour (DESIGN-BRIEF §2: recessed grey for past, indigo tint + dashed
          // for future). Only the current wedge takes the page's --period hue.
          hueVar: undefined,
          zoomsTo: tone === 'current' ? 'manvantara' : undefined,
          href: tone === 'current' ? undefined : period?.route,
          eventCount: tone === 'current' ? undefined : period?.events,
          selected: m.n === s.manvantara,
        };
      });
      return {
        division,
        wedges,
        count: 14,
        align: fractionElapsed('kalpa', s, gregorianYear),
        gauge: false,
        aria: `${CURRENT.kalpaName} Kalpa — 14 manvantaras`,
      };
    }

    case 'mahayugas': {
      const isNow = s.manvantara === CURRENT.manvantara;
      const wedges: Wedge[] = [];
      for (let n = 1; n <= MAHAYUGAS_PER_MANVANTARA; n++) {
        const tone = isNow ? toneFor(n, CURRENT.mahayuga) : 'neutral';
        wedges.push({
          key: `my${n}`,
          n,
          from: (n - 1) / MAHAYUGAS_PER_MANVANTARA,
          to: n / MAHAYUGAS_PER_MANVANTARA,
          tone,
          label: tone === 'current' ? String(n) : undefined,
          aria:
            `${ord(n)} mahāyuga of 71` +
            (tone === 'current'
              ? ' — the current one; its Satya, Tretā and Dvāpara yugas are complete'
              : ' — no events recorded'),
          zoomsTo: tone === 'current' ? 'mahayuga' : undefined,
          selected: n === s.mahayuga,
        });
      }
      return {
        division,
        wedges,
        count: 71,
        align: isNow ? fractionElapsed('manvantara', s, gregorianYear) : ((s.mahayuga ?? 1) - 0.5) / 71,
        gauge: false,
        aria: `${ord(s.manvantara ?? 1)} manvantara — 71 mahāyugas`,
      };
    }

    case 'yugas': {
      const isNow = s.manvantara === CURRENT.manvantara && s.mahayuga === CURRENT.mahayuga;
      let acc = 0;
      const wedges: Wedge[] = YUGA_ORDER.map((y, i) => {
        const frac = YUGA_YEARS[y] / MAHAYUGA_YEARS;
        const from = acc;
        acc += frac;
        const tone: Tone = !isNow
          ? 'neutral'
          : i === YUGA_ORDER.indexOf(CURRENT.yuga)
            ? 'current'
            : i < YUGA_ORDER.indexOf(CURRENT.yuga)
              ? 'past'
              : 'future';
        const ps = periodsForYuga(y);
        const events = ps.reduce((t, p) => t + p.events, 0);
        return {
          key: `yg${y}`,
          n: i + 1,
          from,
          to: acc,
          tone,
          label: YUGA_LABEL[y],
          longLabel: `${YUGA_LABEL[y]} Yuga`,
          aria:
            `${YUGA_LABEL[y]} Yuga — ${formatYears(YUGA_YEARS[y])} years` +
            (tone === 'current'
              ? `, the current age, year ${kaliYearsElapsed(gregorianYear).toLocaleString('en-US')}`
              : '') +
            `, ${events.toLocaleString('en-US')} events`,
          hueVar: `--yuga-${y}`,
          onHueVar: `--yuga-${y}`,
          zoomsTo: 'yuga',
          eventCount: events,
          selected: y === s.yuga,
        };
      });
      return {
        division,
        wedges,
        count: 4,
        align: isNow
          ? fractionElapsed('mahayuga', s, gregorianYear)
          : (() => {
              const i = YUGA_ORDER.indexOf(s.yuga ?? 'satya');
              const before = YUGA_ORDER.slice(0, i).reduce((t, y) => t + YUGA_YEARS[y], 0);
              return (before + YUGA_YEARS[s.yuga ?? 'satya'] / 2) / MAHAYUGA_YEARS;
            })(),
        gauge: false,
        aria: `${ord(s.mahayuga ?? 1)} mahāyuga — the four yugas in 4 : 3 : 2 : 1`,
      };
    }

    case 'periods': {
      const y = s.yuga ?? CURRENT.yuga;
      const ps = periodsForYuga(y);
      const wedges: Wedge[] = ps.map((p, i) => ({
        key: `pd${p.slug}`,
        n: i + 1,
        from: i / ps.length,
        to: (i + 1) / ps.length,
        tone: 'neutral',
        label: p.dialTitle,
        subLabel: `${p.events.toLocaleString('en-US')} events`,
        aria: `${p.title} — ${p.dek}. ${p.events.toLocaleString('en-US')} events. Opens the period page.`,
        hueVar: p.hueVar,
        tint: true,
        href: p.route,
        eventCount: p.events,
        selected: p.slug === s.period,
      }));
      return {
        division,
        wedges,
        count: ps.length,
        align: 0.5 / Math.max(ps.length, 1),
        gauge: false,
        aria: `${YUGA_LABEL[y]} Yuga — ${ps.length === 1 ? 'one period' : `${ps.length} periods`} of the corpus`,
      };
    }
  }
}

/** The up-to-three rings drawn for a focus level: children, grandchildren, great-grandchildren. */
export function ringsFor(s: ClockState, gregorianYear?: number): Ring[] {
  const d = LEVEL_DEPTH[s.level];
  return DIVISION_ORDER.slice(d, d + 3).map((div) => ringFor(div, s, gregorianYear));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 8. Moving around
 * ────────────────────────────────────────────────────────────────────────── */

/** The level you land in when you zoom out of `level`; null at the top. */
export function parentLevel(level: Level): Level | null {
  const i = LEVELS.indexOf(level);
  return i <= 0 ? null : LEVELS[i - 1];
}

/** Choose a wedge on the outer ring. Deeper selections are cleared, or restored when back on the now-path. */
export function selectWedge(s: ClockState, w: Wedge): ClockState {
  const div = DIVISION_ORDER[LEVEL_DEPTH[s.level]];
  const next: ClockState = { ...s };
  switch (div) {
    case 'brahma-years':
      next.brahmaYear = w.n;
      next.kalpa = 1;
      break;
    case 'manvantaras':
      next.manvantara = w.n;
      break;
    case 'mahayugas':
      next.mahayuga = w.n;
      break;
    case 'yugas':
      next.yuga = YUGA_ORDER[w.n - 1];
      break;
    case 'periods':
      next.period = w.key.slice(2) as PeriodSlug;
      break;
  }
  return reconcile(next);
}

/**
 * Keep the deeper fields honest: on the now-path they follow time, off it they are cleared
 * (so an unrecorded manvantara does not pretend to have a current mahāyuga).
 */
function reconcile(s: ClockState): ClockState {
  const out = { ...s };
  const onLine =
    out.brahmaYear === CURRENT.brahmaYear && out.kalpa === CURRENT.brahmaDay;
  if (!onLine) {
    out.manvantara = out.manvantara ?? 1;
    out.mahayuga = 1;
    out.yuga = 'satya';
    return out;
  }
  if (out.manvantara === CURRENT.manvantara) {
    out.mahayuga = out.mahayuga ?? CURRENT.mahayuga;
    if (out.mahayuga === CURRENT.mahayuga) out.yuga = out.yuga ?? CURRENT.yuga;
    else out.yuga = 'satya';
  } else {
    out.mahayuga = 1;
    out.yuga = 'satya';
  }
  return out;
}

export function zoomIn(s: ClockState, w: Wedge): ClockState {
  const picked = selectWedge(s, w);
  return w.zoomsTo ? { ...picked, level: w.zoomsTo } : picked;
}

export function zoomOut(s: ClockState): ClockState {
  const p = parentLevel(s.level);
  return p ? { ...s, level: p } : s;
}

export function goToLevel(s: ClockState, level: Level): ClockState {
  return reconcile({ ...s, level });
}

/* ────────────────────────────────────────────────────────────────────────────
 * 9. Deep links —  ?at=k1.m7.y28.kali
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Segments, in order, each optional after the first:
 *   b<1-100>   Brahmā-year   (omitted when it is the current 51st)
 *   k<1-360>   day of Brahmā (the kalpa; only day 1 is named in the corpus)
 *   m<1-14>    manvantara
 *   y<1-71>    mahāyuga
 *   satya|treta|dvapara|kali
 *   p:<slug>   a corpus period
 * The deepest segment present is the node you are standing inside.
 */
export function serializeState(s: ClockState): string {
  const out: string[] = [];
  if (s.brahmaYear !== CURRENT.brahmaYear) out.push(`b${s.brahmaYear}`);
  out.push(`k${s.kalpa}`);
  const depth = LEVELS.indexOf(s.level);
  if (depth >= 2 && s.manvantara) out.push(`m${s.manvantara}`);
  if (depth >= 3 && s.mahayuga) out.push(`y${s.mahayuga}`);
  if (depth >= 4 && s.yuga) out.push(s.yuga);
  if (s.period) out.push(`p:${s.period}`);
  return out.join('.');
}

const clamp = (n: number, lo: number, hi: number) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo);

/** Tolerant of junk: unknown segments are ignored, ranges clamped, and NOW_STATE is the floor. */
export function parseState(input: string | null | undefined): ClockState {
  if (!input) return NOW_STATE;
  const s: ClockState = { ...NOW_STATE };
  let deepest: Level = 'brahma';
  let sawManvantara = false;
  let sawMahayuga = false;
  let sawYuga = false;
  let sawBrahmaYear = false;
  for (const raw of input.split('.')) {
    const seg = raw.trim().toLowerCase();
    if (!seg) continue;
    if (/^b\d+$/.test(seg)) {
      s.brahmaYear = clamp(parseInt(seg.slice(1), 10), 1, BRAHMA_LIFE_YEARS_COUNT);
      sawBrahmaYear = true;
    } else if (/^k\d+$/.test(seg)) {
      s.kalpa = clamp(parseInt(seg.slice(1), 10), 1, DAYS_PER_BRAHMA_YEAR);
      deepest = 'kalpa';
    } else if (/^m\d+$/.test(seg)) {
      s.manvantara = clamp(parseInt(seg.slice(1), 10), 1, MANVANTARAS_PER_KALPA);
      deepest = 'manvantara';
      sawManvantara = true;
    } else if (/^y\d+$/.test(seg)) {
      s.mahayuga = clamp(parseInt(seg.slice(1), 10), 1, MAHAYUGAS_PER_MANVANTARA);
      deepest = 'mahayuga';
      sawMahayuga = true;
    } else if ((YUGA_ORDER as string[]).includes(seg)) {
      s.yuga = seg as YugaKey;
      deepest = 'yuga';
      sawYuga = true;
    } else if (seg.startsWith('p:')) {
      const slug = seg.slice(2) as PeriodSlug;
      if (PERIODS.some((p) => p.slug === slug)) s.period = slug;
    }
  }
  if (sawBrahmaYear && deepest === 'brahma') deepest = 'brahma';
  // A path that names a Brahmā-year but no day still stands inside Brahmā's life.
  s.level = deepest;
  // Fill in anything the string left unspecified along the now-path, then clean up.
  if (!sawManvantara && s.brahmaYear === CURRENT.brahmaYear) s.manvantara = CURRENT.manvantara;
  if (!sawMahayuga && s.manvantara === CURRENT.manvantara) s.mahayuga = CURRENT.mahayuga;
  if (!sawYuga && s.mahayuga === CURRENT.mahayuga && s.manvantara === CURRENT.manvantara)
    s.yuga = CURRENT.yuga;
  return reconcile(s);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 10. Saying where you are
 * ────────────────────────────────────────────────────────────────────────── */

export interface AddressPart {
  key: string;
  text: string;
  /** True for the segment naming the level currently in focus. */
  focus: boolean;
}

/**
 * The address as parts, so the UI can set them with thin rules instead of middle dots
 * (DESIGN-BRIEF §5). `describeAddress` joins them with " · " for aria-labels, titles,
 * share text and the one-line form the spec asks for.
 */
export function describeAddressParts(s: ClockState, gregorianYear?: number): AddressPart[] {
  const parts: AddressPart[] = [];
  const depth = LEVELS.indexOf(s.level);
  /* The address is where you are in *time*, not how far you have zoomed: while you
     stand on the path time actually took, it reads all the way down to the yuga.
     Step off that path and it stops at the last level you actually chose. */
  const include = (lv: Level) => LEVELS.indexOf(lv) <= depth || isNowPath(s, lv);
  if (s.brahmaYear !== CURRENT.brahmaYear || s.level === 'brahma') {
    parts.push({
      key: 'brahma',
      text: `Brahmā's ${ord(s.brahmaYear)} year of 100`,
      focus: s.level === 'brahma',
    });
  }
  const kalpaName = s.brahmaYear === CURRENT.brahmaYear && s.kalpa === CURRENT.brahmaDay
    ? `${CURRENT.kalpaName} Kalpa`
    : `${ord(s.kalpa)} day of Brahmā`;
  parts.push({ key: 'kalpa', text: kalpaName, focus: s.level === 'kalpa' });
  if (include('manvantara') && s.manvantara) {
    const manu = MANUS[s.manvantara - 1];
    parts.push({
      key: 'manvantara',
      text: `${ord(s.manvantara)} Manvantara (${manu.name})`,
      focus: s.level === 'manvantara',
    });
  }
  if (include('mahayuga') && s.mahayuga) {
    parts.push({
      key: 'mahayuga',
      text: `${ord(s.mahayuga)} Mahāyuga`,
      focus: s.level === 'mahayuga',
    });
  }
  if (include('yuga') && s.yuga) {
    const label = `${YUGA_LABEL[s.yuga]} Yuga`;
    const now = isNowPath(s, 'yuga');
    parts.push({
      key: 'yuga',
      text: now
        ? `${label}, ${kaliYearsCompleted(gregorianYear).toLocaleString('en-US')} years into ${YUGA_YEARS[s.yuga].toLocaleString('en-US')}`
        : `${label}, ${YUGA_YEARS[s.yuga].toLocaleString('en-US')} years`,
      focus: s.level === 'yuga',
    });
  }
  if (s.period) {
    const p = periodBySlug(s.period);
    parts.push({ key: 'period', text: `${p.title} (${p.events.toLocaleString('en-US')} events)`, focus: false });
  }
  return parts;
}

/**
 * One line. For NOW_STATE zoomed to the yuga this reads exactly:
 *   "Śveta-Vārāha Kalpa · 7th Manvantara (Vaivasvata) · 28th Mahāyuga ·
 *    Kali Yuga, 5,127 years into 432,000"
 */
export function describeAddress(s: ClockState = NOW_STATE, gregorianYear?: number): string {
  return describeAddressParts(s, gregorianYear)
    .map((p) => p.text)
    .join(' · ');
}

/**
 * The label that sits in the middle of the dial: what you are standing inside.
 * Three short lines — the core disc is small on a phone, so nothing here runs long.
 */
export function describeCentre(
  s: ClockState,
  gregorianYear?: number,
): { line1: string; line2: string; line3: string } {
  const pct = (level: Level) => {
    const f = fractionElapsed(level, s, gregorianYear);
    if (f >= 0.9999) return 'complete';
    if (f <= 0) return 'not yet begun';
    return `${(f * 100).toFixed(f < 0.1 ? 2 : 1)}% elapsed`;
  };
  switch (s.level) {
    case 'brahma':
      return {
        line1: "Brahmā's life",
        line2: `year ${s.brahmaYear} of 100`,
        line3: pct('brahma'),
      };
    case 'kalpa':
      return {
        line1: `${s.brahmaYear === CURRENT.brahmaYear && s.kalpa === CURRENT.brahmaDay ? CURRENT.kalpaName : ord(s.kalpa) + ' day'}`,
        line2: `a day of Brahmā`,
        line3: pct('kalpa'),
      };
    case 'manvantara': {
      const manu = MANUS[(s.manvantara ?? 1) - 1];
      return {
        line1: manu.name,
        line2: `manvantara ${s.manvantara} of 14`,
        line3: pct('manvantara'),
      };
    }
    case 'mahayuga':
      return {
        line1: `${ord(s.mahayuga ?? 1)} Mahāyuga`,
        line2: `of 71 · 4 : 3 : 2 : 1`,
        line3: pct('mahayuga'),
      };
    case 'yuga': {
      const y = s.yuga ?? CURRENT.yuga;
      const now = isNowPath(s, 'yuga');
      return {
        line1: `${YUGA_LABEL[y]} Yuga`,
        line2: now
          ? `the ${kaliYearOrdinal(gregorianYear).toLocaleString('en-US')}th of ${YUGA_YEARS[y].toLocaleString('en-US')}`
          : `${YUGA_YEARS[y].toLocaleString('en-US')} years`,
        line3: `${periodsForYuga(y).reduce((t, p) => t + p.events, 0).toLocaleString('en-US')} events`,
      };
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 11. The colour footnote
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * The four hues are the yuga-avatāra complexions of Karabhājana's answer,
 * Bhāgavata Purāṇa 11.5.21–32 — Satya white (śukla), Tretā red (rakta),
 * Dvāpara dark (śyāma), and for Kali the *kṛṣṇa-varṇaṁ tviṣākṛṣṇam* of 11.5.32
 * ("of Kṛṣṇa, yet not black in lustre"), which the Gauḍīya reading takes as gold.
 * The variant is Garga's list at Bhāg. 10.8.13 — white, red, yellow (pīta), black.
 * Source: 04-deep-dives/nimi-nava-yogendra-samvada.md §IV.
 */
export const COLOUR_NOTE = {
  text:
    'The four hues follow the yuga-avatāra complexions of Bhāgavata Purāṇa 11.5.21–32 — white, red, dark, and for Kali kṛṣṇa-varṇaṁ tviṣākṛṣṇam, "of Kṛṣṇa yet not black in lustre", read as gold. Garga\'s list (Bhāg. 10.8.13) gives white, red, yellow, black instead.',
  variantHref: '/stories/nimi-nava-yogendra-samvada/',
  variantLabel: 'the two colour lists',
  durationsHref: '/cosmology/yugas-and-mahayuga/',
  durationsLabel: 'the yuga durations and their variants',
} as const;

/** The dial widens the 15 sandhyās so they can be seen; say so where it shows. */
export const SANDHYA_NOTE =
  `The hairline gaps between the manvantaras are the 15 sandhyās, ${SANDHYA_YEARS.toLocaleString('en-US')} years each ` +
  '(one Satya Yuga). At true scale each is 0.14° of the dial, so they are drawn wider than they are.';
