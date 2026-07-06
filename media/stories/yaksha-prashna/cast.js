// ── cast.js ── The Yakṣa's Questions: story-local cast.
// The five Pāṇḍavas (yudhishthira / bhima / arjuna / nakula / sahadeva) come
// straight from the shared CHARACTERS registry via Person.of('name') in film.js
// — their svayaṃvara/forest brahmin-disguise register (cream dhoti, topknot,
// sacred thread) is exactly right for the exile. Only Dharma is story-local:
// the yakṣa's true form, drawn as a dignified sage-like deity (halo, white
// beard, NO crown, NO multi-arm) per the revelation in yaksha-prashna.md.
'use strict';

const CAST = {
  dharma: { // the god of righteousness — Yudhiṣṭhira's divine father, revealed
    archetype: 'deity',
    skin: '#cbae72', skinShade: '#8a6a2c', hairColor: '#efe8d6',
    hairstyle: 'sagebun', garb: 'robe', clothMain: '#e8c25a', clothAccent: '#a1651c',
    beard: 'white', beardLen: 0.5, mala: true, tilak: 'urdhva',
    crown: null, halo: true, haloColor: '#ffe9a8',
    ornaments: 2, armlets: true, earring: true, scarf: '#d8b25a',
    build: 1.06, dhotiLen: 205,
  },
};
