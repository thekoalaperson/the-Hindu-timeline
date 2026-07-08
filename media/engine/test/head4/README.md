# head4 verification tooling

The harnesses used to build, judge, and verify `drawHead4` (the approved
heads-v7 port in `engine/src/person3.js`). Keep using these for ANY head
change — the project's hard-won rule is that head geometry is verified by
rendering and looking, never by reading code.

All commands run from `media/` (node_modules lives there).

- **harness.html + render-sweep.js** — the judge grid: 7 turn columns ×
  5 expression rows × both templates. Any file defining a global
  `drawHead4(ctx, R, style, face, t, seed)` can be a candidate:
  `node engine/test/head4/render-sweep.js /abs/path/to/engine/src/person3.js /tmp/sweep.png`
  Cells that throw paint red and list their error.
- **strip.html** — 21-step turn strip (0..1 by 0.05), both characters,
  loads `../../src/person3.js` directly. Open under the sweep runner's
  playwright pattern or a browser; eyeball ADJACENT pairs for pops.
  The hard construction switch lives at turn 0.85 (see CONTRACTS.md) —
  a visible step there is by design; anywhere else it is a regression.
- **motion.html + render-motion.js** — the 10s choreography (front hold →
  ease to 3/4 with overshoot → gaze → joy → return → slow blink):
  `node engine/test/head4/render-motion.js /abs/path/to/engine/src/person3.js /tmp/motion.mp4`

Reference renders to compare against: `engine/lookdev/heads-v7/v7-*.png`
(the owner's sign-off images).
