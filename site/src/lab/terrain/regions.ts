/**
 * regions.ts — the nine ages as *places*, each with its own light.
 *
 * Concept B, "Time as terrain": the cosmic clock is unrolled into one
 * continuous landscape. Eight of the nine periods are stretches of road, in
 * cosmic order; the ninth (Cross-Yuga) is not a stretch at all — the corpus
 * defines it as "episodes the texts place in more than one age", so it is the
 * sky above the whole road.
 *
 * Every fact written on a region gate comes from the corpus, cited here:
 *   `00-time-and-cosmology/yugas-and-mahayuga.md`
 *     — yuga durations (1,728,000 / 1,296,000 / 864,000 / 432,000 human years)
 *     — dharma's legs 4 → 3 → 2 → 1 (Bhagavata Purana 1.16–17;
 *       Mahabharata Vana Parva 149) and the four legs themselves
 *       (tapas, śauca, dayā, satya — Bhagavata Purana 1.17.24)
 *     — the varṇa associated with each yuga (Brāhmaṇa / Kṣatriya / Vaiśya /
 *       Śūdra) and the yuga-dharma (dhyāna / yajña / arcana / nāma-saṅkīrtana,
 *       Manusmriti 1.85–86; Bhagavata Purana 12.3.51–52)
 *     — Kali's epoch, 3102 BCE, and ≈5,127 years elapsed
 *     — 1 manvantara = 71 mahāyugas + a sandhyā ≈ 306,720,000 years
 *   `00-time-and-cosmology/kalpa-and-pralaya.md` / `brahma-lifetime.md`
 *     — the Night of Brahmā that closes the fourteen manvantaras
 * The prose intro of each period is taken verbatim from the generated
 * `periods.json` (which is itself generated from `timeline/*.md`), so nothing
 * here restates the corpus in my own words.
 *
 * The palette is this concept's own (the brief allows it): the journey's light
 * curve runs dark water → old bronze → DAWN GOLD → fire → blue evening →
 * lamp-lit night → colder night → mist. Satya is the brightest thing in the
 * world and it sits in the middle of the road, so travelling toward it and
 * away from it is the whole feeling of the piece.
 */
import { TWO_CLOCKS } from './future.ts';

export interface Palette {
  /** Sky, top → horizon. Three stops. */
  sky: [string, string, string];
  /** A single light source in the sky (sun / moon / fire-glow / void-disc). */
  glow: string;
  /** Where the glow sits, as `x% y%` of the sky band. */
  glowAt: string;
  /** Far hills, near hills. */
  hillFar: string;
  hillNear: string;
  /** The ground band and the road running through it. */
  ground: string;
  road: string;
  /** Text that sits on this region's ground. */
  ink: string;
  inkSoft: string;
  /** The region's one bright colour — lamps, labels, the gate's carving. */
  accent: string;
  /** Ambient particle colour and kind. */
  motes: string;
  moteKind: 'phosphor' | 'pollen' | 'dust' | 'ember' | 'firefly' | 'lamp' | 'ash' | 'mist';
  /** Silhouette profile generator key. */
  profile: 'water' | 'forest' | 'peaks' | 'flames' | 'banks' | 'shrines' | 'city' | 'dissolve';
  /** Is this a bright region? Used for label/scrim contrast. */
  light: boolean;
  /** Lit windows in the `city` silhouette. Kali-history only. */
  lamp?: string;
}

export interface RegionDef {
  slug: string;
  /** The name carved on the gate. Short enough for a phone. */
  gate: string;
  /** Sanskrit / Devanagari for the gate, where the corpus has one. */
  gateHi: string | null;
  /** One plain line — what this stretch of road is. */
  line: string;
  /** The measured facts, each already cited in this file's header. */
  facts: string[];
  /** Dharma's remaining legs — drawn as standing pillars at the gate. 0 = n/a. */
  legs: number;
  /** A caveat printed once, on this gate only (Kali-history's two clocks). */
  note?: { head: string; body: string; cite: string } | null;
  palette: Palette;
}

/** The eight stretches of road, in cosmic order. */
export const ROAD_REGIONS: RegionDef[] = [
  {
    slug: 'before-time',
    gate: 'Before Time',
    gateHi: 'सृष्टि से पूर्व',
    line: 'No sun yet, and nothing to measure. The waters, and the first stirring in them.',
    facts: ['Cosmogony — the parallel accounts', 'Vedic · Upaniṣadic · Vaiṣṇava · Śaiva · Śākta'],
    legs: 0,
    palette: {
      sky: ['#05182c', '#0c3a52', '#1d6f77'],
      glow: 'rgba(94,214,196,0.5)',
      glowAt: '66% 80%',
      hillFar: '#14495a',
      hillNear: '#061a26',
      ground: '#0a2733',
      road: 'rgba(130,222,208,0.17)',
      ink: '#d3e6e2',
      inkSoft: 'rgba(211,230,226,0.62)',
      accent: '#5cc3b4',
      motes: '#59d6c4',
      moteKind: 'phosphor',
      profile: 'water',
      light: false,
    },
  },
  {
    slug: 'earlier-manvantaras',
    gate: 'Earlier Manvantaras',
    gateHi: 'पूर्व मन्वन्तर',
    line: 'Six ages of the world before ours, each with its own Manu, its own gods, its own dawn.',
    facts: ['One manvantara ≈ 306,720,000 years', '71 mahāyugas and a twilight, ruled by one Manu'],
    legs: 0,
    palette: {
      sky: ['#101710', '#23301c', '#4a4a2a'],
      glow: 'rgba(206,182,84,0.42)',
      glowAt: '30% 78%',
      hillFar: '#33351f',
      hillNear: '#0e1410',
      ground: '#1a2416',
      road: 'rgba(232,214,140,0.17)',
      ink: '#e6e2c6',
      inkSoft: 'rgba(230,226,198,0.62)',
      accent: '#c8a94f',
      motes: '#cdb35c',
      moteKind: 'pollen',
      profile: 'forest',
      light: false,
    },
  },
  {
    slug: 'satya-yuga',
    gate: 'Satya Yuga',
    gateHi: 'सत्ययुग',
    line: 'Dharma standing on all four legs. Nobody needs to be told what is right.',
    facts: [
      '1,728,000 human years',
      'Dharma on 4 legs · tapas, śauca, dayā, satya',
      'varṇa: Brāhmaṇa · the way is dhyāna, meditation',
    ],
    legs: 4,
    palette: {
      sky: ['#dfeaf1', '#f8e6c2', '#f2cf95'],
      glow: 'rgba(255,239,196,0.95)',
      glowAt: '74% 74%',
      hillFar: '#e0c79c',
      hillNear: '#b09367',
      ground: '#e7d6ac',
      road: 'rgba(255,250,232,0.55)',
      ink: '#3a2c17',
      inkSoft: 'rgba(58,44,23,0.66)',
      accent: '#a8761f',
      motes: '#fff3cf',
      moteKind: 'dust',
      profile: 'peaks',
      light: true,
    },
  },
  {
    slug: 'treta-yuga',
    gate: 'Tretā Yuga',
    gateHi: 'त्रेतायुग',
    line: 'A leg gone. Fire is lit to hold the rest in place — sacrifice, kingship, the first wars.',
    facts: [
      '1,296,000 human years',
      'Dharma on 3 legs · tapas lost',
      'varṇa: Kṣatriya · the way is yajña, sacrifice',
    ],
    legs: 3,
    palette: {
      sky: ['#280d09', '#782712', '#c85c24'],
      glow: 'rgba(255,150,60,0.55)',
      glowAt: '38% 78%',
      hillFar: '#8a3616',
      hillNear: '#2a0f08',
      ground: '#421a10',
      road: 'rgba(255,164,86,0.26)',
      ink: '#ffe3c6',
      inkSoft: 'rgba(255,227,198,0.66)',
      accent: '#ff8f42',
      motes: '#ff9a44',
      moteKind: 'ember',
      profile: 'flames',
      light: false,
    },
  },
  {
    slug: 'dvapara-yuga',
    gate: 'Dvāpara Yuga',
    gateHi: 'द्वापरयुग',
    line: 'Half and half. Compassion and truth still stand; the river is wide and the evening is long.',
    facts: [
      '864,000 human years',
      'Dharma on 2 legs · dayā and satya remain',
      'varṇa: Vaiśya · the way is arcana, worship',
    ],
    legs: 2,
    palette: {
      sky: ['#091430', '#1a3a63', '#457499'],
      glow: 'rgba(190,220,255,0.42)',
      glowAt: '24% 40%',
      hillFar: '#2b4d75',
      hillNear: '#0a1526',
      ground: '#12233d',
      road: 'rgba(178,216,255,0.22)',
      ink: '#dfebf7',
      inkSoft: 'rgba(223,235,247,0.64)',
      accent: '#86bde6',
      motes: '#bfe0ff',
      moteKind: 'firefly',
      profile: 'banks',
      light: false,
    },
  },
  {
    slug: 'kali-yuga-scriptural',
    gate: 'Kali Yuga',
    gateHi: 'कलियुग',
    line: 'One leg left, and it is truth. The road goes dark and people carry their own lamps.',
    facts: [
      '432,000 human years · from 3102 BCE',
      'Dharma on 1 leg · satya alone',
      'varṇa: Śūdra · the way is nāma-saṅkīrtana',
    ],
    legs: 1,
    palette: {
      sky: ['#070b22', '#161e44', '#2b3468'],
      glow: 'rgba(255,190,96,0.4)',
      glowAt: '82% 84%',
      hillFar: '#1e2757',
      hillNear: '#05081a',
      ground: '#0b1128',
      road: 'rgba(255,208,128,0.2)',
      ink: '#efe7d2',
      inkSoft: 'rgba(239,231,210,0.62)',
      accent: '#f3b551',
      motes: '#ffcd72',
      moteKind: 'lamp',
      profile: 'shrines',
      light: false,
    },
  },
  {
    slug: 'kali-yuga-history',
    gate: 'Kali Yuga — history',
    gateHi: 'इतिहास',
    line: 'The same age, told with dates. Roughly 5,127 years of it are behind us — a city that never puts its lamps out.',
    facts: [
      '≈5,127 years elapsed of 432,000',
      'Ten eras, I to X, with the dates the record gives them',
      'Almost all of it inside the first 1.2% of the yuga',
    ],
    legs: 1,
    note: TWO_CLOCKS,
    palette: {
      sky: ['#060915', '#131c31', '#38405c'],
      glow: 'rgba(240,186,112,0.42)',
      glowAt: '50% 92%',
      hillFar: '#1c2639',
      hillNear: '#05080e',
      ground: '#0a0f18',
      road: 'rgba(240,198,140,0.22)',
      ink: '#e8ecf2',
      inkSoft: 'rgba(232,236,242,0.62)',
      accent: '#f0b978',
      motes: '#ffcf92',
      moteKind: 'lamp',
      profile: 'city',
      light: false,
      lamp: '#ffcf92',
    },
  },
  {
    slug: 'future-manvantaras',
    gate: 'The Future',
    gateHi: 'भविष्य',
    line: 'The twilight, then seven more Manus receding into it, then the Night of Brahmā — and the morning after it.',
    facts: [
      'Manvantaras 8–14, each ≈ 306,720,000 years',
      'A Day of Brahmā is 4,320,000,000 years; the Night is as long',
      'Kalki closes Kali; the Night closes the Day; the Day comes again',
    ],
    legs: 0,
    palette: {
      /* Not fog. The last stretch is a violet twilight going out — so the fire
         of the dissolution has something to burn against and the dawn at the
         end has somewhere to rise from. */
      sky: ['#0a0716', '#241436', '#5b2a4c'],
      glow: 'rgba(255,168,120,0.36)',
      glowAt: '86% 88%',
      hillFar: '#2c1a3d',
      hillNear: '#0a0713',
      ground: '#120b1f',
      road: 'rgba(232,190,224,0.18)',
      ink: '#efe3f2',
      inkSoft: 'rgba(239,227,242,0.62)',
      accent: '#d79ae0',
      motes: '#e7c7ff',
      moteKind: 'ash',
      profile: 'dissolve',
      light: false,
    },
  },
];

/** The ninth period. Not a stretch of road — the sky over all of them. */
export const SKY_REGION = {
  slug: 'cross-yuga',
  gate: 'Cross-Yuga',
  gateHi: 'सर्वयुग',
  line: 'Stories the texts place in more than one age. They hang above the whole road.',
  accent: '#f7cd77',
};

export const REGION_BY_SLUG: Record<string, RegionDef> = Object.fromEntries(
  ROAD_REGIONS.map((r) => [r.slug, r]),
);

/* ------------------------------------------------------- silhouette art - */

/**
 * A tiny seeded RNG so the hills are the same on every build (the HTML is
 * static; a random skyline per deploy would churn the diff for no reason).
 */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TILE_W = 640;
const TILE_H = 220;

/**
 * One horizon tile per region per depth, as an SVG data URI that repeats
 * seamlessly (first and last vertex share a y). Repeating a background image
 * costs the compositor nothing, and gives each age a genuinely different
 * skyline: peaks for Satya, flames for Tretā, river banks for Dvāpara, a
 * temple-town for Kali, a dissolving edge for the Future.
 */
export function horizonTile(
  profile: Palette['profile'],
  fill: string,
  depth: 0 | 1,
  /** Kali-history only: the colour of a lit window. A city at night. */
  lamp?: string,
): string {
  const r = rng(profile.length * 7919 + depth * 104729 + 17);
  const h = TILE_H;
  /** Lit windows, drawn over the silhouette after it. */
  const lights: string[] = [];
  const base = depth === 0 ? 0.52 : 0.36; // far hills sit lower in their band
  const amp = depth === 0 ? 0.3 : 0.5;
  const pts: [number, number][] = [];
  const push = (x: number, y: number) => pts.push([Math.round(x), Math.round(y)]);

  const y0 = h * base;
  push(0, y0);

  if (profile === 'water') {
    for (let x = 40; x < TILE_W; x += 40) push(x, y0 + Math.sin(x / 60) * 3 * (depth + 1));
  } else if (profile === 'forest') {
    for (let x = 16; x < TILE_W; x += 16) {
      const t = h * base - r() * h * amp * 0.42 - h * 0.06;
      push(x - 5, y0 - h * 0.01);
      push(x, t);
      push(x + 5, y0 - h * 0.01);
    }
  } else if (profile === 'peaks') {
    let x = 0;
    while (x < TILE_W) {
      const w = 70 + r() * 90;
      const pk = y0 - h * amp * (0.45 + r() * 0.55);
      push(x + w * 0.5, pk);
      push(x + w, y0 - h * 0.02 * r());
      x += w;
    }
  } else if (profile === 'flames') {
    let x = 0;
    while (x < TILE_W) {
      const w = 30 + r() * 46;
      const pk = y0 - h * amp * (0.35 + r() * 0.85);
      push(x + w * 0.28, y0 - h * amp * 0.12);
      push(x + w * 0.52, pk);
      push(x + w * 0.74, y0 - h * amp * 0.2);
      push(x + w, y0);
      x += w;
    }
  } else if (profile === 'banks') {
    for (let x = 30; x < TILE_W; x += 30) {
      push(x, y0 - h * amp * (0.1 + 0.14 * Math.sin(x / 110) + r() * 0.08));
    }
  } else if (profile === 'shrines') {
    let x = 0;
    while (x < TILE_W) {
      const w = 56 + r() * 74;
      const t = y0 - h * amp * (0.3 + r() * 0.5);
      push(x + w * 0.2, y0 - h * amp * 0.1);
      push(x + w * 0.32, t + h * 0.05);
      push(x + w * 0.5, t - h * 0.09); // the śikhara's finial
      push(x + w * 0.68, t + h * 0.05);
      push(x + w * 0.8, y0 - h * amp * 0.1);
      push(x + w, y0);
      x += w;
    }
  } else if (profile === 'city') {
    let x = 0;
    while (x < TILE_W) {
      const w = 26 + r() * 44;
      const t = y0 - h * amp * (0.18 + r() * 0.8);
      push(x, t);
      push(x + w, t);
      push(x + w, y0 - h * amp * (0.18 + r() * 0.8));
      // A city at night is a city with its lights on. Two or three windows a
      // block, on a deterministic grid, so Kali-history reads as *lit* rather
      // than as another grey skyline.
      if (lamp) {
        const rows = Math.max(1, Math.floor((y0 - t) / 13));
        for (let ry = 0; ry < rows; ry++) {
          for (let cx = 0; cx < 2; cx++) {
            if (r() > 0.52) continue;
            const wx = x + 5 + cx * (w * 0.46);
            const wy = t + 6 + ry * 13;
            if (wy > y0 - 5) continue;
            lights.push(
              `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="3" height="4" fill="${lamp}" opacity="${(0.35 + r() * 0.55).toFixed(2)}"/>`,
            );
          }
        }
      }
      x += w;
    }
  } else {
    // dissolve — the horizon breaks into fragments and stops
    let x = 0;
    while (x < TILE_W) {
      const w = 40 + r() * 70;
      const on = r() > 0.34;
      const t = y0 - h * amp * (on ? 0.16 + r() * 0.3 : 0);
      push(x, on ? t : y0);
      push(x + w, on ? t : y0);
      x += w;
    }
  }
  push(TILE_W, y0);

  const d = `M0,${h} L${pts.map(([x, y]) => `${x},${y}`).join(' L')} L${TILE_W},${h} Z`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${h}" viewBox="0 0 ${TILE_W} ${h}" preserveAspectRatio="none">` +
    `<path d="${d}" fill="${fill}"/>${lights.join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** The very front of the picture: grass, stones, reeds. Moves fastest. */
export function vergeTile(profile: Palette['profile'], fill: string): string {
  const r = rng(profile.length * 31337 + 5);
  const w = 420;
  const h = 120;
  const parts: string[] = [`<rect x="0" y="${h - 14}" width="${w}" height="14" fill="${fill}"/>`];
  for (let i = 0; i < 30; i++) {
    const x = (i / 30) * w + r() * 8;
    const s = 8 + r() * 26;
    if (profile === 'city' || profile === 'shrines') {
      parts.push(`<rect x="${x.toFixed(1)}" y="${(h - 14 - s * 0.5).toFixed(1)}" width="${(3 + r() * 5).toFixed(1)}" height="${(s * 0.5).toFixed(1)}" fill="${fill}"/>`);
    } else if (profile === 'water' || profile === 'banks') {
      parts.push(`<path d="M${x.toFixed(1)},${h - 12} q${(r() * 8 - 4).toFixed(1)},${(-s).toFixed(1)} ${(r() * 10 - 5).toFixed(1)},${(-s * 1.3).toFixed(1)}" stroke="${fill}" stroke-width="2" fill="none"/>`);
    } else if (profile === 'dissolve') {
      if (r() > 0.6) parts.push(`<circle cx="${x.toFixed(1)}" cy="${(h - 16 - r() * 10).toFixed(1)}" r="${(1 + r() * 2).toFixed(1)}" fill="${fill}"/>`);
    } else {
      parts.push(`<path d="M${x.toFixed(1)},${h - 12} q${(r() * 6 - 3).toFixed(1)},${(-s * 0.6).toFixed(1)} ${(r() * 12 - 6).toFixed(1)},${(-s).toFixed(1)}" stroke="${fill}" stroke-width="${(1.4 + r()).toFixed(1)}" fill="none"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
