// ── cast.js ── character style sheets for the whole film.
'use strict';

const CAST = {
  arjuna: { // brahmin disguise: white cloth, sacred thread, ascetic topknot
    skin: '#c98d5e', skinShade: '#8a5127', hairColor: '#171009',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#efe6cf', clothAccent: '#c9a44a',
    sash: '#b3452c', sacredThread: true, tilak: 'urdhva', dhotiLen: 210,
    ornaments: 0, build: 1.0,
  },
  arjunaGroom: { // revealed / wedding: modest gold, garland
    skin: '#c98d5e', skinShade: '#8a5127', hairColor: '#171009',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#efe0bb', clothAccent: '#c9a44a',
    sash: '#8c1f28', sacredThread: true, tilak: 'urdhva', earring: true,
    ornaments: 2, armlets: true, scarf: '#d8b25a', wearGarland: true, dhotiLen: 210,
  },
  draupadi: { // "Kṛṣṇā, the dark one" — crimson & gold bridal sari
    female: true, skin: '#9a6038', skinShade: '#63381c', hairColor: '#0f0a05',
    hairstyle: 'braid', hairFlowers: true, garb: 'sari',
    clothMain: '#a11e2c', clothAccent: '#e8b64c',
    crown: 'tiara', bindi: true, earring: true, noseRing: false,
    ornaments: 3, bangles: true, anklets: true, lip: '#8e3125',
  },
  kunti: { // widowed queen-mother in ochre, veiled
    female: true, skin: '#c08a5c', skinShade: '#875428', hairColor: '#3a2c22',
    hairstyle: 'veil', garb: 'sari', clothMain: '#c47f2c', clothAccent: '#f0ddb0',
    veil: '#d99a3d', bindi: true, earring: true, ornaments: 1, lip: '#96442f',
    build: 0.94,
  },
  karna: { // sun-touched skin, gilded cuirass, kundala earrings
    skin: '#d9a05e', skinShade: '#9a6426', hairColor: '#1d1207',
    hairstyle: 'topknot', garb: 'armor', clothMain: '#caa54a', clothAccent: '#8c5a12',
    earring: true, crown: 'turban', turbanColor: '#8c2f1d', tilak: 'plain',
    ornaments: 1, armlets: true, build: 1.06, dhotiLen: 210,
  },
  krishna: { // slate-blue skin, pītāmbara yellow silk, peacock feather
    skin: '#5c7ba1', skinShade: '#33507a', hairColor: '#12100c',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#e8bd35', clothAccent: '#a1651c',
    peacock: true, earring: true, ornaments: 2, armlets: true,
    scarf: '#f2d066', tilak: 'urdhva', lip: '#7c3450', dhotiLen: 210,
  },
  bhima: { // massive build, moustache, deep green
    skin: '#b57a45', skinShade: '#7c4a1e', hairColor: '#171009',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#e3d7bd', clothAccent: '#7c8546',
    sash: '#3f5a33', moustache: 2, sacredThread: true, build: 1.16, dhotiLen: 200,
  },
  yudhishthira: { // eldest: calm, cream & pale gold
    skin: '#c69265', skinShade: '#8a5a2c', hairColor: '#241a10',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#efe8d5', clothAccent: '#b3a26a',
    sash: '#7a5c2e', sacredThread: true, tilak: 'plain', build: 1.03, dhotiLen: 215,
  },
  nakula: {
    skin: '#cf9a68', skinShade: '#94602c', hairColor: '#1a1208',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#e7e0cd', clothAccent: '#5c7a8a',
    sash: '#41616e', sacredThread: true, build: 0.96, dhotiLen: 205,
  },
  sahadeva: {
    skin: '#cf9a68', skinShade: '#94602c', hairColor: '#1a1208',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#e7e0cd', clothAccent: '#6e5c8a',
    sash: '#4f4370', sacredThread: true, build: 0.96, dhotiLen: 205,
  },
  drupada: { // king of Pāñcāla: regal purple & gold, grey beard
    skin: '#c08a58', skinShade: '#875428', hairColor: '#4a4038',
    hairstyle: 'topknot', garb: 'royal', clothMain: '#5c2e6e', clothAccent: '#e8b64c',
    crown: 'mukut', beard: 'grey', beardLen: 0.25, moustache: 1,
    ornaments: 3, armlets: true, scarf: '#8c56a1', dhotiLen: 220, build: 1.05,
  },
  dhrishtadyumna: { // fire-born prince
    skin: '#a86a3c', skinShade: '#754419', hairColor: '#140d06',
    hairstyle: 'topknot', garb: 'royal', clothMain: '#8c2f1d', clothAccent: '#e8b64c',
    crown: 'turban', turbanColor: '#a13a1e', ornaments: 2, armlets: true, dhotiLen: 215,
  },
  vyasa: { // the sage: matted bun, rudrākṣa, ochre robe
    skin: '#a97e52', skinShade: '#775027', hairColor: '#5a4a3a',
    hairstyle: 'sagebun', garb: 'robe', clothMain: '#b4632a', clothAccent: '#7c4a1e',
    beard: 'white', beardLen: 0.7, mala: true, tilak: 'tripundra', build: 0.98,
  },
  priest: {
    skin: '#c08a58', skinShade: '#875428', hairColor: '#2c2018',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#efe6cf', clothAccent: '#c9702e',
    sacredThread: true, tilak: 'plain', build: 0.97, dhotiLen: 205,
  },
  shiva: { // flashback vision: ash-pale, tripundra, crescent (drawn in scene)
    skin: '#bcc7d1', skinShade: '#7e8ea1', hairColor: '#3f3428',
    hairstyle: 'sagebun', garb: 'dhoti', clothMain: '#c7a86c', clothAccent: '#8a6a3a',
    tilak: 'tripundra', mala: true, build: 1.08, dhotiLen: 190,
  },
};

// generic assembly king; i varies palette & headgear
function kingStyle(i) {
  const cloths = ['#7a2e2e', '#2e5a7a', '#5a7a2e', '#7a5a2e', '#4a2e7a', '#2e7a6a'];
  const turbs = ['#a13a1e', '#1e5aa1', '#6ea11e', '#a1791e', '#5a1ea1', '#1ea18a'];
  const skins = ['#c98d5e', '#b57a45', '#d9a05e', '#a86a3c', '#c69265'];
  return {
    skin: skins[i % skins.length], skinShade: shade(skins[i % skins.length], -0.35),
    hairColor: '#1d1408', hairstyle: 'topknot', garb: 'royal',
    clothMain: cloths[i % cloths.length], clothAccent: GOLD,
    crown: i % 3 === 0 ? 'mukut' : 'turban', turbanColor: turbs[i % turbs.length],
    moustache: i % 2 ? 1 : 2, ornaments: 2, armlets: true,
    build: 0.98 + (i % 4) * 0.05, dhotiLen: 215,
  };
}
function brahminStyle(i) {
  const skins = ['#c98d5e', '#c08a58', '#b57a45', '#cf9a68'];
  return {
    skin: skins[i % skins.length], skinShade: shade(skins[i % skins.length], -0.35),
    hairColor: '#241a10', hairstyle: i % 3 === 0 ? 'sagebun' : 'topknot', garb: 'dhoti',
    clothMain: '#ede4cb', clothAccent: '#c9a44a', sacredThread: true,
    tilak: i % 2 ? 'plain' : 'urdhva', beard: i % 4 === 3 ? 'white' : null, beardLen: 0.3,
    build: 0.92 + (i % 3) * 0.05, dhotiLen: 200,
  };
}
