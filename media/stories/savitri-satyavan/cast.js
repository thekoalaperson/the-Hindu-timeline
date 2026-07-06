// ── cast.js ── Sāvitrī & Satyavān: story-local cast.
// savitri / yama come from the shared CHARACTERS registry; these are the
// story-specific people (resolved via Person.of → CAST fallback).
'use strict';

const CAST = {
  satyavan: { // prince living as forest ascetic — bark-cloth, axe-bearer
    archetype: 'prince',
    skin: '#c08a58', skinShade: '#875428', hairColor: '#171009',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#c9b189', clothAccent: '#8a6a3a',
    sash: '#6e5230', sacredThread: true, ornaments: 0, crown: null,
    build: 1.02, dhotiLen: 195,
  },
  narada: { // the wandering sage
    archetype: 'sage',
    skin: '#c69265', skinShade: '#8a5a2c', hairColor: '#e8e0d2',
    hairstyle: 'sagebun', garb: 'robe', clothMain: '#e8c25a', clothAccent: '#a1651c',
    beard: 'white', beardLen: 0.5, mala: true, tilak: 'urdhva', build: 0.97,
  },
  dyumatsena: { // blind exiled king in hermit's cloth
    archetype: 'sage',
    skin: '#b07a48', skinShade: '#764a20', hairColor: '#8f8478',
    hairstyle: 'sagebun', garb: 'robe', clothMain: '#b59a6e', clothAccent: '#8a6a3a',
    beard: 'grey', beardLen: 0.55, mala: true, build: 0.96,
  },
  asvapati: { // Sāvitrī's father, king of Madra
    archetype: 'king',
    skin: '#c98d5e', skinShade: '#8a5127', hairColor: '#3a2c22',
    hairstyle: 'topknot', garb: 'royal', clothMain: '#4a2e7a', clothAccent: '#e8b64c',
    crown: 'mukut', beard: 'grey', beardLen: 0.25, moustache: 1,
    ornaments: 3, armlets: true, scarf: '#8c56a1', dhotiLen: 220, build: 1.04,
  },
};
