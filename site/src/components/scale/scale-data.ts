/**
 * scale-data.ts — "How big is this?", as six numbers and their citations.
 *
 * Every figure below was read out of the corpus before it was written here:
 *
 *   `00-time-and-cosmology/yugas-and-mahayuga.md`
 *     — Satya 1,728,000 · Tretā 1,296,000 · Dvāpara 864,000 · **Kali 432,000**
 *     — 1 Mahāyuga = **4,320,000** years (Surya Siddhanta 1.15–21)
 *     — 1 Manvantara = 71 Mahāyugas + 1 sandhyā ≈ **306,720,000** years
 *     — 1 Kalpa = 1000 Mahāyugas = 14 Manvantaras + 15 sandhyās =
 *       **4,320,000,000** years
 *     — we sit in the Kali Yuga of the 28th Mahāyuga of the 7th (Vaivasvata)
 *       Manvantara
 *   `00-time-and-cosmology/manvantara-system.md`
 *     — the same 306,720,000, and 14 manvantaras + 15 sandhis = one Kalpa
 *   `00-time-and-cosmology/brahma-lifetime.md`
 *     — 100 Brahmā-years = **311,040,000,000,000** (311.04 trillion) years
 *     — we are in his **51st year**, its **1st day**, the Śveta-Vārāha Kalpa
 *     — 6 manvantaras elapsed; ~5,127 years into Kali as of 2026 CE
 *
 * Nothing here is derived arithmetic of our own: each number is printed in at
 * least one of those three files exactly as it appears here.
 */

export interface ScaleLevel {
  /** Stable id, also the anchor at `/clock/#scale`. */
  id: string;
  /** What this span is called. */
  name: string;
  /** Devanagari, where the corpus gives one. */
  hi: string | null;
  /** Human years, as a number — the bars are drawn from this. */
  years: number;
  /** The same figure written for a reader. */
  yearsLabel: string;
  /** Where we stand inside it, 0..1. Used to place the "you are here" mark. */
  at: number;
  /** One plain sentence: what this level *is*. */
  line: string;
  /** The corpus file the number comes from, and its route on this site. */
  cite: { file: string; route: string };
  /** The "you are here" caption for this level. */
  here: string;
}

/**
 * ~5,127 of Kali's 432,000 years have run (as of 2026 CE), so "now" is at
 * 1.19 % of the shortest bar. Every deeper level inherits that position:
 * Kali is the last quarter of the mahāyuga, the 28th of 71 mahāyugas is
 * done, the 7th of 14 manvantaras is running, and the day is the 1st of the
 * 51st year.
 */
const KALI_ELAPSED = 5127;

export const LEVELS: ScaleLevel[] = [
  {
    id: 'life',
    name: 'A human life',
    hi: null,
    years: 100,
    yearsLabel: '100 years',
    at: 0.5,
    line: 'The span you can imagine without help. Everything below is drawn against it.',
    cite: { file: '00-time-and-cosmology/yugas-and-mahayuga.md', route: '/cosmology/yugas-and-mahayuga/' },
    here: 'one lifetime',
  },
  {
    id: 'kali',
    name: 'Kali Yuga',
    hi: 'कलियुग',
    years: 432000,
    yearsLabel: '432,000 years',
    at: KALI_ELAPSED / 432000,
    line: 'The age we are in. It began in 3102 BCE, and about 5,127 of its years have run.',
    cite: { file: '00-time-and-cosmology/yugas-and-mahayuga.md', route: '/cosmology/yugas-and-mahayuga/' },
    here: '5,127 years in — 1.2% of it',
  },
  {
    id: 'mahayuga',
    name: 'This Mahāyuga',
    hi: 'महायुग',
    years: 4320000,
    yearsLabel: '4,320,000 years',
    at: (4320000 - 432000 + KALI_ELAPSED) / 4320000,
    line: 'Satya, Tretā, Dvāpara and Kali together — 4 : 3 : 2 : 1. Kali is its last tenth.',
    cite: { file: '00-time-and-cosmology/yugas-and-mahayuga.md', route: '/cosmology/yugas-and-mahayuga/' },
    here: 'the last tenth of it',
  },
  {
    id: 'manvantara',
    name: 'The Vaivasvata Manvantara',
    hi: 'मन्वन्तर',
    years: 306720000,
    yearsLabel: '306,720,000 years',
    at: (27 * 4320000 + (4320000 - 432000 + KALI_ELAPSED)) / 306720000,
    line: '71 mahāyugas and a twilight, ruled by one Manu. We are in the 28th of the 71.',
    cite: { file: '00-time-and-cosmology/manvantara-system.md', route: '/cosmology/manvantara-system/' },
    here: 'mahāyuga 28 of 71',
  },
  {
    id: 'kalpa',
    name: 'This Day of Brahmā',
    hi: 'कल्प',
    years: 4320000000,
    yearsLabel: '4,320,000,000 years',
    at: (6 * 306720000 + 27 * 4320000) / 4320000000,
    line: 'The Śveta-Vārāha Kalpa: 14 manvantaras and 15 twilights. Six are over; ours is the 7th.',
    cite: { file: '00-time-and-cosmology/kalpa-and-pralaya.md', route: '/cosmology/kalpa-and-pralaya/' },
    here: 'manvantara 7 of 14',
  },
  {
    id: 'brahma',
    name: "Brahmā's life",
    hi: 'महाकल्प',
    years: 311040000000000,
    yearsLabel: '311,040,000,000,000 years',
    at: 0.505,
    line: '100 Brahmā-years. He is in his 51st, and this Day is its first — so a little over half of it is gone.',
    cite: { file: '00-time-and-cosmology/brahma-lifetime.md', route: '/cosmology/brahma-lifetime/' },
    here: 'year 51 of 100, day 1',
  },
];

/* ------------------------------------------------------- the analogy ---- */
/**
 * Six numbers with eleven zeroes between the smallest and the largest cannot
 * be *felt*, only read. So the whole ladder is laid on the one span everybody
 * already has a body for: **one calendar year**.
 *
 * Brahmā's life (311,040,000,000,000 years — `brahma-lifetime.md`) is that
 * year. Nothing else is chosen: every other line below is that one mapping
 * divided into, and every figure that goes in is one of the cited numbers
 * above. The arithmetic is printed under the bars (`ANALOGY_FOOT`) so the
 * reader can check it rather than take it.
 */
export const YEAR_SECONDS = 365.2425 * 86400; // 31,556,952 — the Gregorian mean
export const YEARS_PER_SECOND = LEVELS[LEVELS.length - 1]!.years / YEAR_SECONDS;

/** A span of human years, said as a duration on that calendar year. */
export function onTheCalendar(years: number): string {
  const s = years / YEARS_PER_SECOND;
  if (s >= YEAR_SECONDS * 0.999) return 'the whole year';
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.round((s - h * 3600) / 60);
    return `${h} hour${h === 1 ? '' : 's'} ${m} minute${m === 1 ? '' : 's'}`;
  }
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const sec = Math.round(s - m * 60);
    return `${m} minute${m === 1 ? '' : 's'} ${sec} second${sec === 1 ? '' : 's'}`;
  }
  if (s >= 1) return `${s.toFixed(s < 10 ? 1 : 0)} seconds`;
  if (s >= 0.01) return `${Math.round(s * 1000)} thousandths of a second`;
  if (s >= 0.001) return `${(s * 1000).toFixed(1)} thousandths of a second`;
  if (s >= 0.000001) return `${Math.round(s * 1e6)} millionths of a second`;
  return `${(s * 1e9).toFixed(1)} billionths of a second`;
}

/**
 * The one human-scale line each bar carries, computed — never typed — from
 * that bar's own cited figure. The clause after the em dash is the only thing
 * written by hand, and it says nothing the number does not.
 */
const ANALOGY_TAIL: Record<string, string> = {
  life: 'less time than it takes a camera flash to fire',
  kali: 'about a third of one blink',
  mahayuga: 'the beat between two heartbeats',
  manvantara: 'half a minute',
  kalpa: 'one tea break',
  brahma: 'January the 1st to December the 31st',
};

export function analogyFor(l: ScaleLevel): string {
  const d = onTheCalendar(l.years);
  const tail = ANALOGY_TAIL[l.id];
  return `If Brahmā's life were one year: ${d}${tail ? ` — ${tail}` : ''}.`;
}

/** Where all of recorded history falls on the same calendar. */
export const ANALOGY_HISTORY = `On that calendar the whole of recorded human history — the ${KALI_ELAPSED.toLocaleString(
  'en-US',
)} years of Kali that have run — is ${onTheCalendar(
  KALI_ELAPSED,
)}, at the very end of the 31st of December.`;

/** The arithmetic, printed so it can be checked. */
export const ANALOGY_FOOT = `The arithmetic: one calendar year is ${Math.round(
  YEAR_SECONDS,
).toLocaleString('en-US')} seconds and Brahmā's life is 311,040,000,000,000 years, so one second of that year is ${Math.round(
  YEARS_PER_SECOND,
).toLocaleString(
  'en-US',
)} years. Every line above is that age's own cited figure divided by that.`;

/** The line printed under the last bar. */
export const CODA = {
  line: 'And when the hundred years are complete, everything — Brahmā included — is reabsorbed into Prakṛti, and a new Brahmā begins the whole of it again.',
  cite: { file: '00-time-and-cosmology/brahma-lifetime.md', route: '/cosmology/brahma-lifetime/' },
};

/**
 * How thin the previous bar is inside this one, as a percentage string. Below
 * a tenth of a percent no bar can be drawn honestly, so the view says the
 * number instead of pretending to a sliver you could see.
 */
export function sliverPct(inner: number, outer: number): number {
  return (inner / outer) * 100;
}

export function sliverLabel(inner: number, outer: number): string {
  const p = sliverPct(inner, outer);
  if (p >= 1) return `${p.toFixed(1)}% of this bar`;
  if (p >= 0.01) return `${p.toFixed(3)}% of this bar`;
  return `${p.toExponential(1)}% of this bar — thinner than the line drawing it`;
}
