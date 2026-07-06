// ── film.js ── assembles Bhīma and Bakāsura's scenes via the shared storyboard
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
