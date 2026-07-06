// ── cast.js ── character style sheet for Bhīma and Bakāsura.
'use strict';

// Reuse a character from the shared registry (media/characters/registry.json,
// injected as the global CHARACTERS by build-player.mjs) via Person.of('name'),
// optionally overriding a few fields — or define a story-specific look inline,
// using the same key vocabulary as stories/winning-of-draupadi/cast.js (skin,
// skinShade, hairColor, hairstyle, garb, clothMain, clothAccent, sash/scarf,
// ornaments, build, tilak, beard/moustache, dhotiLen, female, ...).
//
//   const CAST = {
//     krishna: Person.of('krishna'),                                       // registry as-is
//     villager1: Person.of({ archetype: 'villager', skin: '#c9945a' }),    // preset + override
//     narrator: { skin: '#c08a58', hairColor: '#2c2018', garb: 'robe', clothMain: '#b4632a' },
//   };
const CAST = {};
