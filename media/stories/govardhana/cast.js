// ── cast.js ── Govardhana: story-local cast (the cowherds of Vraja).
// Kṛṣṇa comes from the shared CHARACTERS registry (Person.of('krishna') — the
// blue-skinned Yādava prince: peacock feather, pītāmbara gold cloth). These are
// the story-specific cowherds, resolved via Person.of → CAST fallback and reused
// by both the storyboard scenes (as `who`) and the bespoke JS scenes (film.js).
'use strict';

const CAST = {
  nanda: { // cowherd chieftain, Kṛṣṇa's foster-father — an elder gopa, broad build
    displayName: 'Nanda',
    archetype: 'villager',
    skin: '#a86a3c', skinShade: '#6e4420', hairColor: '#6f665a',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#c98a3a', clothAccent: '#8a5a2c',
    sash: '#7a3a1e', moustache: 2, beard: 'grey', beardLen: 0.3,
    ornaments: 1, armlets: true, build: 1.06, heightScale: 1.04, shoulderScale: 1.06,
    dhotiLen: 172,
  },
  gopa: { // a younger herdsman — leaner, plainer cloth, no beard
    displayName: 'A Young Cowherd',
    archetype: 'villager',
    skin: '#bd8850', skinShade: '#7c4a1e', hairColor: '#1c130a',
    hairstyle: 'topknot', garb: 'dhoti', clothMain: '#8ea24a', clothAccent: null,
    sash: '#5a6e2c', moustache: 1, build: 0.98, heightScale: 0.97,
    dhotiLen: 150,
  },
  gopi: { // a cowherd woman of Vraja — for the sheltering crowd
    displayName: 'A Cowherd Woman',
    archetype: 'villager', female: true,
    skin: '#c08a5c', skinShade: '#875428', hairColor: '#160e07',
    hairstyle: 'braid', garb: 'sari', clothMain: '#b23a5a', clothAccent: '#f0d68a',
    bindi: true, earring: true, bangles: true, ornaments: 1, lip: '#9a3730',
    build: 0.94, heightScale: 0.96, dhotiLen: 150,
  },
};
