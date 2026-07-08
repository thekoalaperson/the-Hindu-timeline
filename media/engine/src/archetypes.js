// ── archetypes.js ── palette-level character presets (character system v2).
// Data only. `Person.of(nameOrStyle)` merges these with overrides and picks the
// behaviour class. NB: cast.js owns the names `CAST`, `kingStyle`, `brahminStyle`
// — to allow both files to load together WITHOUT redeclaration conflicts, this
// file exposes `ARCH`, `archKing(i)`, `archBrahmin(i)` instead.
//
// API (globals): ARCH, archKing(i), archBrahmin(i)
'use strict';

const ARCH = {
  king: {
    archetype: 'king', skin: '#c98d5e', skinShade: '#8a5127', hairColor: '#1d1408',
    hairstyle: 'topknot', garb: 'royal', clothMain: '#5c2e6e', clothAccent: GOLD,
    crown: 'mukut', moustache: 1, ornaments: 3, armlets: true, scarf: '#8c56a1',
    build: 1.04, dhotiLen: 218,
  },
  queen: {
    archetype: 'queen', female: true, skin: '#b98453', skinShade: '#7f4c22', hairColor: '#140d06',
    hairstyle: 'braid', hairFlowers: true, garb: 'sari', clothMain: '#8c1f4a', clothAccent: GOLD,
    crown: 'tiara', bindi: true, earring: true, noseRing: true, ornaments: 3, bangles: true, anklets: true,
    lip: '#8e2f2a', build: 0.95,
  },
  prince: {
    archetype: 'prince', skin: '#c98d5e', skinShade: '#8a5127', hairColor: '#171009',
    hairstyle: 'topknot', garb: 'royal', clothMain: '#2e5a7a', clothAccent: GOLD,
    crown: 'turban', turbanColor: '#1e5aa1', ornaments: 2, armlets: true, earring: true,
    build: 1.0, dhotiLen: 214,
  },
  princess: {
    archetype: 'princess', female: true, skin: '#c08a5c', skinShade: '#875428', hairColor: '#160e07',
    hairstyle: 'braid', hairFlowers: true, garb: 'sari', clothMain: '#c23a6a', clothAccent: '#f0d68a',
    crown: 'tiara', bindi: true, earring: true, ornaments: 2, bangles: true, anklets: true,
    lip: '#a3402e', build: 0.9,
  },
  warrior: {
    archetype: 'warrior', skin: '#b57a45', skinShade: '#7c4a1e', hairColor: '#171009',
    hairstyle: 'topknot', garb: 'armor', clothMain: '#9a7a2e', clothAccent: '#8c5a12',
    crown: 'turban', turbanColor: '#8c2f1d', moustache: 2, ornaments: 1, armlets: true,
    build: 1.14, shoulderScale: 1.16, dhotiLen: 200,
  },
  brahmin: {
    archetype: 'brahmin', skin: '#c98d5e', skinShade: '#8a5127', hairColor: '#241a10',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#efe6cf', clothAccent: '#c9a44a',
    sacredThread: true, tilak: 'urdhva', build: 0.97, dhotiLen: 205,
  },
  priest: {
    archetype: 'priest', skin: '#c08a58', skinShade: '#875428', hairColor: '#2c2018',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#efe6cf', clothAccent: '#c9702e',
    sacredThread: true, tilak: 'plain', mala: true, build: 0.97, dhotiLen: 205,
  },
  sage: {
    archetype: 'sage', skin: '#a97e52', skinShade: '#775027', hairColor: '#5a4a3a',
    hairstyle: 'sagebun', garb: 'robe', clothMain: '#b4632a', clothAccent: '#7c4a1e',
    beard: 'white', beardLen: 0.68, mala: true, tilak: 'tripundra', build: 0.98,
  },
  villager: {
    archetype: 'villager', skin: '#b07a48', skinShade: '#764a20', hairColor: '#1c130a',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#d9cbb0', clothAccent: null,
    sash: '#8a5a34', build: 0.99, dhotiLen: 150,
  },
  hunter: {
    archetype: 'hunter', skin: '#9c6636', skinShade: '#663f18', hairColor: '#140d06',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#6e5a34', clothAccent: '#3f5a33',
    sash: '#3f2a16', moustache: 1, build: 1.06, dhotiLen: 140,
  },
  boy: {
    archetype: 'boy', skin: '#c98d5e', skinShade: '#8a5127', hairColor: '#171009',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#e6dcc2', clothAccent: '#c9a44a',
    build: 0.7, dhotiLen: 120,
  },
  girl: {
    archetype: 'girl', female: true, skin: '#c08a5c', skinShade: '#875428', hairColor: '#160e07',
    hairstyle: 'braid', garb: 'sari', clothMain: '#d06a2c', clothAccent: '#f0d68a',
    bindi: true, bangles: true, anklets: true, build: 0.66,
  },
  rakshasa: {
    archetype: 'rakshasa', skin: '#6f5140', skinShade: '#382519', hairColor: '#1c0f08',
    hairstyle: 'mane', garb: 'dhoti', clothMain: '#563021', clothAccent: '#8a5a2c',
    tusks: true, mane: true, heavyBrow: true, claws: true, sash: '#33190f',
    lip: '#57271f', iris: '#7a1e12', ornaments: 1, build: 1.32, shoulderScale: 1.3, dhotiLen: 150,
  },
  deity: {
    archetype: 'deity', skin: '#d3a860', skinShade: '#9a6b28', hairColor: '#160f09',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#e8bd35', clothAccent: '#a1651c',
    crown: 'mukut', halo: true, haloColor: '#ffe9a8', ornaments: 3, armlets: true, earring: true,
    tilak: 'urdhva', scarf: '#f2d066', clothSim: true, lip: '#8a3a44', build: 1.04, dhotiLen: 210,
  },
};

// Variety is contract: each index varies skin tone + age tint, garment palette,
// build, HEIGHT (±~6%), shoulder breadth, and carries a `phase` so callers can
// jitter pose timing (t: T + style.phase*2, seed: base + i) — no two clones.
function archKing(i) {
  const cloths = ['#7a2e2e', '#2e5a7a', '#5a7a2e', '#7a5a2e', '#4a2e7a', '#2e7a6a'];
  const turbs = ['#a13a1e', '#1e5aa1', '#6ea11e', '#a1791e', '#5a1ea1', '#1ea18a'];
  const skins = ['#c98d5e', '#b57a45', '#d9a05e', '#a86a3c', '#c69265', '#bd8850'];
  let sk = skins[i % skins.length];
  const old = (i % 5 === 4);
  if (old) sk = mixC(sk, '#b7a894', 0.28);   // elder: desaturated skin
  return {
    archetype: 'king', skin: sk, skinShade: shade(sk, -0.35),
    hairColor: old ? '#6b6154' : '#1d1408', hairstyle: 'topknot', garb: 'royal',
    clothMain: cloths[i % cloths.length], clothAccent: GOLD,
    crown: i % 3 === 0 ? 'mukut' : 'turban', turbanColor: turbs[i % turbs.length],
    moustache: i % 2 ? 1 : 2, beard: old ? 'grey' : null, beardLen: 0.25,
    ornaments: 2, armlets: true,
    build: 0.98 + (i % 4) * 0.05,
    heightScale: 0.95 + ((i * 37) % 13) / 13 * 0.11,
    shoulderScale: 1.0 + ((i * 5) % 4) * 0.05,
    phase: (i * 0.61803) % 1,
    dhotiLen: 215,
  };
}

function archBrahmin(i) {
  const skins = ['#c98d5e', '#c08a58', '#b57a45', '#cf9a68', '#bb8752'];
  let sk = skins[i % skins.length];
  const old = (i % 4 === 3);
  if (old) sk = mixC(sk, '#b7a894', 0.25);
  return {
    archetype: 'brahmin', skin: sk, skinShade: shade(sk, -0.35),
    hairColor: old ? '#7a7064' : '#241a10', hairstyle: i % 3 === 0 ? 'sagebun' : 'topknot', garb: 'dhoti',
    clothMain: '#ede4cb', clothAccent: '#c9a44a', sacredThread: true,
    tilak: i % 2 ? 'plain' : 'urdhva', beard: old ? 'white' : null, beardLen: 0.32,
    build: 0.92 + (i % 3) * 0.05,
    heightScale: 0.95 + ((i * 29) % 11) / 11 * 0.1,
    shoulderScale: 0.96 + ((i * 7) % 3) * 0.03,
    phase: (i * 0.61803) % 1,
    dhotiLen: 200,
  };
}
