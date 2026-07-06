// ── cast.js ── Bhīma and Bakāsura: story-local cast.
// kunti / yudhishthira / bakasura come straight from the shared CHARACTERS
// registry (used by `who` as-is). Person.of resolves CHARACTERS before CAST,
// so the beefed-up hero look of Bhīma is given a *local* id ('bhimaHero') that
// mirrors the registry's Ādi-Parva brahmin-disguise palette with a bigger
// build + broad shoulders — his silhouette must dwarf the villagers.
// Grounded in 04-deep-dives/characters/bhima.md (Vāyu's son, strength of ten
// thousand elephants) and 01-adi-parva.md (Ekacakrā, Baka-vadha, Ādi 159–166).
'use strict';

const CAST = {
  // Bhīma — the brahmin-disguise register all five Pāṇḍavas wear at Ekacakrā,
  // built up so he reads as the strongman of the epic (registry 'bhima' is the
  // baseline build 1.16; this raises it and adds shoulderScale for presence).
  bhimaHero: {
    archetype: 'brahmin',
    skin: '#b57a45', skinShade: '#7c4a1e', hairColor: '#171009',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#e3d7bd', clothAccent: '#7c8546',
    sash: '#3f5a33', moustache: 2, sacredThread: true,
    build: 1.24, shoulderScale: 1.2, dhotiLen: 198,
  },

  // the brahmin householder whose turn has come — modest, greying, guest-host
  brahminHost: {
    archetype: 'brahmin',
    skin: '#c08a58', skinShade: '#875428', hairColor: '#3a3028',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#e8dcc0', clothAccent: '#b0894a',
    sacredThread: true, tilak: 'plain', beard: 'grey', beardLen: 0.32,
    build: 0.95, dhotiLen: 206,
  },
  // his wife (also reused as a townswoman in the closing scene)
  brahminWife: {
    archetype: 'villager', female: true,
    skin: '#c08a5c', skinShade: '#875428', hairColor: '#241a10',
    hairstyle: 'braid', garb: 'sari', clothMain: '#9a563a', clothAccent: '#d9b06a',
    veil: '#a86a44', bindi: true, earring: true, ornaments: 1, lip: '#96442f',
    build: 0.9,
  },
  // their small daughter — clinging, weeping in the grief scene
  brahminChild: {
    archetype: 'girl',
    skin: '#c8926a', skinShade: '#8a5f2c', hairColor: '#1a1208',
    hairstyle: 'braid', garb: 'sari', clothMain: '#c77a34', clothAccent: '#e8cf8a',
    bindi: true, build: 0.6,
  },

  // townsfolk — deliberately varied (skin, palette, age) so no two twin
  villagerElder: {
    archetype: 'villager',
    skin: '#a86a3c', skinShade: '#6f4318', hairColor: '#8a8078',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#c9b79a', clothAccent: null,
    sash: '#7a5a34', beard: 'grey', beardLen: 0.4, build: 0.96, dhotiLen: 150,
  },
  villagerYoung: {
    archetype: 'villager',
    skin: '#bd8850', skinShade: '#7c4a1e', hairColor: '#1c130a',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#b6552f', clothAccent: '#3c5476',
    sash: '#3c5476', moustache: 1, build: 1.0, dhotiLen: 150,
  },
};
