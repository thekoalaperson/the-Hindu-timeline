// ── stage-demo.js ── minimal two-scene film proving stage.js's storyboard
// interpreter end-to-end: a data-driven "garland" scene (palaceHall set via
// the SETS adapter, an actor `enter` walk, a `move` beat, `pose`/`face`
// beats, a `petals` fx beat, an eased multi-key camera) followed by a
// trivial hand-written JS-fn scene (the escape hatch), so both storyboard
// dispatch paths, subtitles, and the scene-boundary dip transition are all
// exercised by one small film. No narration audio: TIMELINE is fabricated
// by hand (~20s total), matching the shape narrate.mjs normally generates.
'use strict';

// ── escape hatch: a plain JS scene fn, exactly like legacy film.js scenes.
// Proves stage.js's dispatch falls back to SCENE_FNS[id] when a TIMELINE
// scene has no matching storyboard.
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

// ── the story: scene 1 is fully data-driven (storyboard); scene 2 has no
// storyboard, so stage.js falls back to SCENE_FNS.hush above. ──
const STAGE_DEMO_STORY = {
  slug: 'stage-demo',
  scenes: [
    {
      id: 'garland',
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
    { id: 'hush' }, // no storyboard -> stage.js calls SCENE_FNS.hush(ctx,tl,dur,t)
  ],
};

// ── fabricated timeline (no narration audio): same shape narrate.mjs writes
// to timeline.json/timeline.js -- {total, scenes:[{id,name,display,start,
// narrAt,narrDur,dur,end}]}. ──
const STAGE_DEMO_TIMELINE = {
  total: 20.0,
  scenes: [
    {
      id: 'garland', name: 'The Garland',
      display: "Across the crowded hall she came, the garland raised in trembling hands. She laid the flowers upon the stranger's shoulders, and for a moment the whole hall fell silent.",
      start: 0, narrAt: 0.6, narrDur: 7.5, dur: 9.5, end: 9.5,
    },
    {
      id: 'hush', name: 'After',
      display: 'For a heartbeat, no one in the hall spoke. Then it seemed to exhale as one — and the story of five brothers quietly began.',
      start: 9.5, narrAt: 10.1, narrDur: 8.0, dur: 10.5, end: 20.0,
    },
  ],
};

buildFilmFromStory(STAGE_DEMO_STORY, STAGE_DEMO_TIMELINE);
