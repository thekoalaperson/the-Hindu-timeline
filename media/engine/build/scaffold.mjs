#!/usr/bin/env node
// Scaffold a new story package under media/stories/<slug>/, wired for the
// data-driven engine described in CONTRACTS.md (person.js/archetypes.js/stage.js
// storyboards) rather than the legacy hand-coded scenes*.js of
// stories/winning-of-draupadi. Refuses to touch an existing story directory.
//
//   node engine/build/scaffold.mjs --slug <slug> --title "Display Title"
//
// Writes:
//   <story>/story.json   engineFiles/storyFiles + narration/music/video defaults
//   <story>/script.json  2 example scenes (display/tts/pads/mood) + a note on
//                        phonetic TTS respelling
//   <story>/cast.js      const CAST = {}; with guidance on Person.of(...) / CHARACTERS
//   <story>/film.js      buildFilmFromStory(STORY_DEF, TIMELINE) with a commented
//                        storyboard-scene example and a JS-fn escape-hatch example
//
// After scaffolding: fill in sources/script.json, run narrate.mjs (+ music.mjs /
// mix.sh, or the film.mjs wrapper if present), author film.js, then
// engine/build/shots.mjs to visually check frames before rendering. See
// .claude/skills/make-film/SKILL.md for the full procedure.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mediaDir, arg } from './lib.mjs';

const slug = arg(process.argv, '--slug', null);
const titleArg = arg(process.argv, '--title', null);

if (!slug) {
  console.error('usage: node engine/build/scaffold.mjs --slug <slug> --title "Display Title"');
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`bad --slug "${slug}": use lowercase kebab-case (letters, digits, hyphens), e.g. "nala-damayanti"`);
  process.exit(2);
}
const title = titleArg || slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
if (!titleArg) console.warn(`no --title given; defaulting to "${title}"`);

const storyPath = join(mediaDir, 'stories', slug);
if (existsSync(storyPath)) {
  console.error(`refusing to overwrite existing story dir: ${storyPath}`);
  process.exit(1);
}

// ── story.json ──────────────────────────────────────────────────────────────
const storyJson = {
  slug,
  title,
  subtitle: '',
  watchHint: 'watch',
  sources: [],
  engineFiles: [
    'core.js', 'paint.js', 'acting.js', 'wardrobe.js',
    'person.js', 'archetypes.js', 'props.js', 'sets.js', 'stage.js',
  ],
  storyFiles: ['cast.js', 'timeline.js', 'film.js'],
  narration: { provider: 'pico', voice: 'en-GB', pitch: 0.95, tempo: 1.12 },
  // 'auto' = derive per-scene texture from each script.json scene's "mood" field
  // (see CONTRACTS.md "Music moods"); winning-of-draupadi is the one story that
  // keeps { mode: 'legacy' } to preserve its hand-composed score exactly.
  music: { mode: 'auto' },
  video: { fps: 24, crf: 22 },
  titleHtml: title,
};

// ── script.json ──────────────────────────────────────────────────────────────
const scriptJson = {
  '_comment': "tts respells Sanskrit/proper names phonetically for offline TTS " +
    "(pico2wave/espeak) — e.g. Draupadī → 'Drow-pa-dee', Kṛṣṇa → 'Krish-na', " +
    "Yudhiṣṭhira → 'You-dish-teer'. display keeps full IAST diacritics for the " +
    "on-screen subtitle track; tts is what's actually spoken. Aim for ~30-45 spoken " +
    "words per scene. mood must be one of: mystic | festive | tense | tender | " +
    "triumphant | somber | suspense (CONTRACTS.md 'Music moods'). See " +
    "stories/winning-of-draupadi/script.json for the reference pattern this was scaffolded from.",
  title,
  subtitle: '',
  scenes: [
    {
      id: 'opening',
      name: 'Opening',
      pad_before: 1.5,
      pad_after: 1.2,
      mood: 'mystic',
      display: 'REPLACE ME: the scene’s on-screen text, IAST diacritics welcome (~30-45 spoken words).',
      tts: 'REPLACE ME: the same text, with proper names phonetically respelled for the TTS engine.',
    },
    {
      id: 'turn',
      name: 'Turning Point',
      pad_before: 1.0,
      pad_after: 1.4,
      mood: 'tense',
      display: 'REPLACE ME: the scene’s on-screen text, IAST diacritics welcome (~30-45 spoken words).',
      tts: 'REPLACE ME: the same text, with proper names phonetically respelled for the TTS engine.',
    },
  ],
};

// ── cast.js ──────────────────────────────────────────────────────────────────
const castJs = `// ── cast.js ── character style sheet for ${title}.
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
`;

// ── film.js ──────────────────────────────────────────────────────────────────
const filmJs = `// ── film.js ── assembles ${title}'s scenes via the shared storyboard
// interpreter (stage.js → buildFilmFromStory). See CONTRACTS.md "Storyboard" for
// the full schema (set/setOpts/grade/camera/actors/beats) and "Sets API" /
// "Acting API" for the SETS/POSES names available.
'use strict';

const STORY_DEF = {
  // Each key below must match a script.json scene id. TIMELINE (written by
  // narrate.mjs from script.json's pacing) supplies start/dur/mood; this file
  // supplies what's drawn. Two ways to define a scene — prefer (a), drop to (b)
  // only for choreography the storyboard can't express:
  //
  // (a) storyboard JSON — stage.js interprets it, engine/build/validate.mjs checks
  //     it for unknown sets/actors/poses/fx before you spend render time on it:
  //
  // opening: {
  //   set: 'palaceHall', setOpts: { timeOfDay: 'day' },
  //   grade: { wash: '#ffb45c', washAlpha: 0.07, vignette: 0.3 },
  //   camera: [
  //     { t: 0, x: -30, y: 10, z: 1.0 },
  //     { t: '60%', x: 130, z: 1.22, ease: 'io' },
  //   ],
  //   actors: [
  //     { id: 'hero', who: 'arjuna', at: [960, 980], s: 0.78, facing: 1,
  //       enter: { type: 'walk', from: [-200, 980], t0: 0.5, t1: 4.2 } },
  //   ],
  //   beats: [
  //     { at: 2.0, actor: 'hero', pose: 'pranam', over: 1.2 },
  //     { at: 'narr+1', fx: 'petals', opts: { density: 0.6 } },
  //   ],
  // },
  //
  // (b) JS-fn escape hatch — same (ctx, tl, dur, T) signature as the legacy
  //     SCENE_FNS in stories/winning-of-draupadi/{scenes1,scenes2,scenes3}.js:
  //
  // turn(ctx, tl, dur, T) {
  //   // tl = seconds since this scene started, dur = this scene's total length,
  //   // T = absolute film time (handy for cross-scene fx/continuity).
  // },
  scenes: {},
};

// Reduces STORY_DEF + the generated TIMELINE to the same
// window.__film = { W, H, duration, timeline, draw(ctx, T, opts) } surface that
// dev.html, shots.mjs and render.mjs all expect.
window.__film = buildFilmFromStory(STORY_DEF, TIMELINE);
`;

mkdirSync(storyPath, { recursive: true });
writeFileSync(join(storyPath, 'story.json'), JSON.stringify(storyJson, null, 2) + '\n');
writeFileSync(join(storyPath, 'script.json'), JSON.stringify(scriptJson, null, 2) + '\n');
writeFileSync(join(storyPath, 'cast.js'), castJs);
writeFileSync(join(storyPath, 'film.js'), filmJs);

console.log(`scaffolded ${storyPath}`);
for (const f of ['story.json', 'script.json', 'cast.js', 'film.js']) console.log(`  ${f}`);
console.log('\nnext: ground the story in the corpus, fill in sources[] + script.json scenes,');
console.log('define cast.js, run narrate.mjs (+ music.mjs/mix.sh) to build the timeline,');
console.log('author film.js’s STORY_DEF.scenes, then engine/build/shots.mjs to check frames.');
