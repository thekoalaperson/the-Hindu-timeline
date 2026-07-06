// ── stage-demo.js ── minimal four-scene film proving stage.js's storyboard
// interpreter end-to-end:
//   1. 'garland'  data-driven scene with an EXPLICIT camera track: palaceHall
//      set via the SETS adapter, actor `enter` walk, `move` beat, pose/face
//      beats, a `petals` fx beat.
//   2. 'closeup'  the same set framed by the shot:'close-up' COMPOSITION
//      PRESET — no camera keys at all; stage.js solves cam x/y/z so
//      Draupadī's head fills ~55% of frame height.
//   3. 'twoshot'  shot:'two-shot' preset (golden-section framing of two
//      actor slots) + a `dressing` passthrough (hallSet's drupadaSmile /
//      raysAlpha extras) merged into setOpts.
//   4. 'hush'     a hand-written JS fn (the SCENE_FNS escape hatch).
// No narration audio: TIMELINE is fabricated by hand (~28s total), matching
// the shape narrate.mjs normally generates. Also node-loadable (exports the
// story + timeline) so the composition linter can run over this exact demo.
'use strict';

// ── escape hatch: a plain JS scene fn, exactly like legacy film.js scenes.
const SCENE_FNS = {
  hush(ctx, tl, dur, t) {
    const k = ramp(tl, 0, 2.5);
    vgrad(ctx, 0, 0, W, H, [[0, '#2a1a3a'], [0.5, '#6e3a2c'], [1, '#1c0e08']]);
    camLayer(ctx, { x: sfbm1(tl * 0.08, 201) * 6, y: sfbm1(tl * 0.09, 202) * 4, z: 1 + k * 0.05 }, 0.2, (c) => {
      glowAdd(c, W * 0.5, H * 0.42, 260 + k * 60, 'rgba(255,190,120,0.5)', 0.7);
      motes(c, 200, 100, W - 400, H * 0.6, t, 41, 30, '#ffe0b0');
    });
    camLayer(ctx, { x: 0, y: 0, z: 1 }, 1.0, (c) => {
      drawSkyline(c, H * 0.72, '#241407', 71);
      drawSkyline(c, H * 0.78, '#170d05', 133);
    });
    wash(ctx, '#ffb45c', 0.08 * k, 'soft-light');
  },
};

// ── the story ──
const STAGE_DEMO_STORY = {
  slug: 'stage-demo',
  scenes: [
    {
      id: 'garland', // explicit camera keys (presets must NOT override these)
      storyboard: {
        set: 'palaceHall',
        setOpts: {
          timeOfDay: 'day', brahmins: false, draupadiOnDais: false,
          showBow: false, yantraOpts: { speed: 0.12, noFish: true }, drupadaSmile: 0.25,
        },
        grade: { wash: '#ffb45c', washAlpha: 0.09, vignette: 0.22 },
        camera: [
          { t: 0, x: -150, y: 10, z: 1.05 },
          { t: '55%', x: -20, y: -10, z: 1.2, ease: 'io' },
          { t: 9.3, x: -90, y: -16, z: 1.3, ease: 'io' },
        ],
        actors: [
          { id: 'arjuna', who: 'arjuna', at: [870, 990], s: 0.78, facing: 1,
            enter: { type: 'walk', from: [-200, 990], t0: 0.3, t1: 3.6 } },
          { id: 'draupadi', who: 'draupadi', at: [1560, 990], s: 0.72, facing: -1 },
        ],
        beats: [
          { at: 2.6, actor: 'draupadi', move: { to: [1010, 990], gait: 'walk', t1: 'narr+5.7' } },
          { at: 6.3, actor: 'arjuna', pose: 'pranam', over: 1.0 },
          { at: 6.5, actor: 'draupadi', pose: 'carry', over: 1.2 },
          { at: '80%', actor: 'draupadi', face: { smile: 0.32 }, over: 0.7 },
          { at: 7.7, actor: 'arjuna', face: { smile: 0.3, lowered: 0.12 }, over: 0.8 },
          { at: 1.2, fx: 'petals', opts: { density: 0.55, seed: 9 } },
        ],
      },
    },
    {
      id: 'closeup', // COMPOSITION PRESET: emotional close-up, zero camera keys
      storyboard: {
        set: 'palaceHall',
        setOpts: {
          brahmins: false, draupadiOnDais: false, showBow: false,
          nearCrowd: false, yantraOpts: { speed: 0.12, noFish: true },
        },
        dressing: { raysAlpha: 0.10 },
        shot: { type: 'close-up', actor: 'draupadi' },
        grade: { wash: '#ffb45c', washAlpha: 0.10, vignette: 0.30 },
        actors: [
          { id: 'draupadi', who: 'draupadi', at: [1180, 975], s: 0.72, facing: -1, featured: true },
        ],
        beats: [
          { at: 0.6, actor: 'draupadi', face: { smile: 0.05, lowered: 0.55, gaze: { x: 0.15, y: 0.15 } }, over: 0.9 },
          { at: 'narr+1.6', actor: 'draupadi', face: { smile: 0.34, lowered: 0.05, brow: 0.12, gaze: { x: 0.3, y: -0.05 } }, over: 1.5 },
        ],
      },
    },
    {
      id: 'twoshot', // COMPOSITION PRESET: golden-section two-shot + dressing
      storyboard: {
        set: 'palaceHall',
        setOpts: {
          brahmins: false, draupadiOnDais: false, showBow: false,
          yantraOpts: { speed: 0.12, noFish: true },
        },
        dressing: { drupadaSmile: 0.45, raysAlpha: 0.20 }, // hallSet extras via passthrough
        shot: { type: 'two-shot', actors: ['arjuna', 'draupadi'] },
        grade: { wash: '#ffb45c', washAlpha: 0.09 },
        actors: [
          { id: 'arjuna', who: 'arjuna', at: [880, 990], s: 0.76, facing: 1 },
          { id: 'draupadi', who: 'draupadi', at: [1145, 990], s: 0.73, facing: -1 },
        ],
        beats: [
          { at: 0.9, actor: 'arjuna', pose: 'pranam', over: 1.2 },
          { at: 1.4, actor: 'draupadi', pose: 'carry', over: 1.1 },
          { at: 'narr+2.2', actor: 'draupadi', face: { smile: 0.3, lowered: 0.1 }, over: 0.9 },
          { at: 'narr+2.6', actor: 'arjuna', face: { smile: 0.26 }, over: 0.9 },
          { at: 0.4, fx: 'petals', opts: { density: 0.4, seed: 13 } },
        ],
      },
    },
    { id: 'hush' }, // no storyboard -> stage.js calls SCENE_FNS.hush(ctx,tl,dur,t)
  ],
};

// ── fabricated timeline (no narration audio): same shape narrate.mjs writes.
const STAGE_DEMO_TIMELINE = {
  total: 28.0,
  scenes: [
    {
      id: 'garland', name: 'The Garland',
      display: "Across the crowded hall she came, the garland raised in trembling hands. She laid the flowers upon the stranger's shoulders, and for a moment the whole hall fell silent.",
      start: 0, narrAt: 0.6, narrDur: 7.5, dur: 9.5, end: 9.5,
    },
    {
      id: 'closeup', name: 'Her Eyes',
      display: 'She had chosen — and knew what the choosing would cost. Slowly, she raised her eyes.',
      start: 9.5, narrAt: 10.1, narrDur: 4.4, dur: 5.7, end: 15.2,
    },
    {
      id: 'twoshot', name: 'Two Fates',
      display: 'They stood together before the court: the fire-born bride and the stranger in white.',
      start: 15.2, narrAt: 15.8, narrDur: 4.6, dur: 6.2, end: 21.4,
    },
    {
      id: 'hush', name: 'After',
      display: 'For a heartbeat, no one in the hall spoke. Then it seemed to exhale as one — and the story of five brothers quietly began.',
      start: 21.4, narrAt: 22.0, narrDur: 5.0, dur: 6.6, end: 28.0,
    },
  ],
};

// browser: build the film. node: just export the data so validate/linter
// tooling can chew on this exact demo (buildFilmFromStory needs a canvas).
if (typeof buildFilmFromStory === 'function' && typeof window !== 'undefined') {
  buildFilmFromStory(STAGE_DEMO_STORY, STAGE_DEMO_TIMELINE);
}
if (typeof module !== 'undefined') {
  module.exports = { STAGE_DEMO_STORY, STAGE_DEMO_TIMELINE };
}
