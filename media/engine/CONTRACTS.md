# Engine contracts & style bible

The shared spec for everyone (human or agent) working on the film engine.
Read this before touching `engine/src`. The goal: **any story in the corpus →
a narrated animated film**, authored mostly as data, rendered by one engine.

## Hard rules

1. **Determinism.** Every visual is a pure function of time `t`. No
   `Math.random()` at draw time — use `hash1(n)`, `noise1/fbm1/snoise1/sfbm1`
   (core.js) with explicit integer seeds. Same `t` in, same pixels out — the
   headless renderer depends on it.
2. **Vanilla JS, no deps, no modules in `src/`.** Files are concatenated in
   `story.json → engineFiles/storyFiles` order and must work file:// via plain
   `<script>` tags. Globals are the API; don't wrap in IIFEs; `'use strict'` at
   file top.
3. **Design space is 1920×1080** (`W`, `H`). Figures are ~400 units tall at
   scale 1, ground at `y=0` in figure space. Never read canvas size — the
   player pre-scales the context.
4. **No AI-generated anything.** All art is authored path data / procedural
   drawing. All sound is synthesized or classic rule-based TTS or the user's
   own recordings.
5. **Verify visually.** After any art change, render stills and LOOK at them:
   `node engine/build/shots.mjs --page engine/test/<page>.html --out /tmp/x`
   then Read the PNG. Iterate until it genuinely looks good. A change that is
   not visually verified does not ship.
6. **Back-compat.** `drawFigure(ctx, o)`, `drawSeated(ctx, o)`,
   `drawHead(ctx, R, style, face, t, seed)` and the style-object keys used by
   `stories/winning-of-draupadi/` must keep working unchanged. Run
   `node engine/build/shots.mjs --story winning-of-draupadi --times "24,46,92,104.5"`
   before and after; frames must match (minor antialiasing drift OK).

## Visual style bible

Rajput/Pahari miniature-painting register:
- Warm grounds; kohl ink outlines `rgba('#241005', 0.4-0.85)`; gold ornament
  (`GOLD`/`GOLD_D`/`GOLD_L`); flat color fields modelled with soft gradients.
- Faces: profile-to-¾ dominant, almond kohl-lined eyes, arched tapering brows,
  refined nose, two-tone lips; expression via `face` params, never rubber-hose.
- Light: god rays, oil-lamp glows, contact shadows, per-scene warm grades,
  vignette + grain applied by the film compositor (`film.js`/stage).
- Motion: eased keyframes + noise-driven secondary motion (cloth, hair,
  flames); nothing linear, nothing static; walk cycles for locomotion.

## Layer/depth model

`camLayer(ctx, cam, f, fn)` — parallax factor `f`: 0.06 sky … 0.15 far wall …
0.35 banners … 0.6 mid … 0.85 near-bg … 1.0 subject plane … 1.3 foreground.
Cache static layers with `cached(key, w, h, drawFn)`; drop with `dropCache(prefix)`.

## Person API (person.js — Agent A)

Class hierarchy (globals): `Person` → `Man`/`Woman` → behaviour subclasses
(`Deity`, `Sage`, `Rakshasa`). Palette-level archetypes (king, queen, prince,
princess, warrior, brahmin, priest, villager, hunter…) are **data presets** in
`archetypes.js`, applied by `Person.of(styleOrName)`.

```js
Person.of({ archetype:'king', skin:'#c98d5e', clothMain:'#5c2e6e' }) // preset+overrides
Person.of('arjuna')                    // from characters/registry.json (injected as CHARACTERS)
p.draw(ctx, {x, y, s, facing, pose, t, seed, shadow})
p.drawSeated(ctx, {...same})
// legacy free functions must keep working:
drawFigure(ctx, {style, ...}); drawSeated(ctx, {...}); drawHead(ctx, R, style, face, t, seed)
```

`pose` keys (superset of today): `lean, bend, headTurn(0..1), headNod, headTilt,
armF/armB {sh, el, wr, hand}, legF/legB {hip, knee}, face {turn, smile, eyeOpen,
gaze{x,y}, brow, lipsPart, lowered}, clothSway`. Hands: `relaxed | fist | hold |
open | bless | point | namaste`.

## Acting API (acting.js — Agent A)

`walkPose(ph, amp)`, `posemix(a, b, k)` (exists); add pose presets:
`POSES.stand/kneel/sit/bow/pranam/pray/point/refuse/shoot/carry/bless/shock/grief/dance`
each a function `(k, t, seed) => pose` where `k` is 0..1 intensity, blendable
via `posemix`.

## Sets API (sets.js — Agent B)

`SETS.<name>(ctx, cam, t, opts)` draws a complete parallax environment.
Required names: `palaceHall` (from legacy hallSet, config-driven), `courtyardNight`,
`hutDusk`, `mandap`, `forest`, `village`, `riverBank`, `interior`, `mountain`.
Common opts: `{ timeOfDay: 'dawn|day|dusk|night', palette?, actors(ctx), fg?:bool,
rays?:number, particles?:bool }` plus set-specific extras. Every set: layered
parallax, a lighting pass, an `actors` hook at subject plane f=1.0, optional
foreground at f≥1.2.

## Props & fauna (props.js — Agent B)

Keep every prop from world.js (bow, arrow, yantra, basin, lamp, torana, banner,
arch, pillar, skyline, crowdStrip). Add: `cart`, `well`, `throne`, `treeBanyan`,
`treePalm`, `rock`, `potStack`, `shrine`. Fauna rigs with the same quality bar
as humans: `drawHorse`, `drawElephant`, `drawDeer`, `drawBird`, `drawCow` —
each `(ctx, {x, y, s, facing, t, seed, gait:'idle'|'walk'|'run', pose?})`,
walk cycles included, miniature-painting styling (outline + modelled flat color).

## Storyboard (stage.js — Agent C)

`story.json → scenes[]` entries may carry a `storyboard` object instead of a JS
scene fn. `stage.js` interprets it; `film.js` for a data-driven story reduces to
`buildFilmFromStory()`. Storyboard scene:

```jsonc
{
  "set": "palaceHall", "setOpts": {"timeOfDay": "day"},
  "grade": {"wash": "#ffb45c", "washAlpha": 0.07, "vignette": 0.3},
  "camera": [ {"t": 0, "x": -30, "y": 10, "z": 1.0}, {"t": "60%", "x": 130, "z": 1.22, "ease": "io"} ],
  "actors": [
    {"id": "arjuna", "who": "arjuna", "at": [870, 990], "s": 0.78, "facing": 1,
     "enter": {"type": "walk", "from": [-200, 990], "t0": 0.5, "t1": 4.2}},
    {"id": "draupadi", "who": "draupadi", "at": [1560, 960], "s": 0.72, "facing": -1}
  ],
  "beats": [
    {"at": 2.0, "actor": "arjuna", "pose": "pranam", "over": 1.2},
    {"at": "narr+3", "actor": "draupadi", "face": {"smile": 0.3}, "over": 0.8},
    {"at": 6.0, "fx": "petals", "opts": {"density": 0.8}},
    {"at": 8.0, "actor": "arjuna", "move": {"to": [1200, 990], "gait": "walk", "t1": 11.0}}
  ]
}
```

Times: seconds from scene start, `"NN%"` of scene, or `"narr+X"` (X after
narration start). Beats compile to eased tracks at scene init (cache per scene);
draw order by y unless `z` given. Camera keys interpolate with easing names
`io|in|out|back`. `validate(storyJson)` reports unknown sets/actors/poses/fx —
exposed to node via `engine/build/validate.mjs` (jsdom-free: stage.js must be
loadable in node with a small shim; guard browser-only calls).

## Expressiveness principles

The engine's worth is measured by the *space of characters and moments it can
express*, not by any single film. When adding parameters prefer **orthogonal
dials over hardcoded looks**: a new character should be a point in parameter
space (archetype × palette × age × build × wardrobe × marks × items), not new
drawing code. Target dimensions (grow toward, never regress):
- **Age**: `style.age` 0..1 planned (child head-ratio & proportions ↔ stooped
  elder w/ grey hair, softened jaw, walking staff affinity).
- **Forms**: the same registry character may carry `forms` (e.g. kṛṣṇa: cowherd
  boy / charioteer / Viśvarūpa) — forms are style override sub-objects.
- **Diversity**: complexions, builds, regional garments and headgear should mix
  freely; crowd generators must sample the whole space, not one template.
- **Aesthetic bar**: every addition must sit inside the miniature-painting
  register (kohl line, gold, modelled flats) — if a new asset looks like it
  came from a different show, it does not merge.

## Music hierarchy (music.mjs)

Composition resolves through a hierarchy, most-specific wins:
`BASE (tanpura drone + tala grid) → RAGA (note pool + characteristic phrases +
mood affinities) → MOOD (texture: percussion density, register, pace, dynamics)
→ SCENE (events: bell/boom/swell/silence at beats) → STORY overrides`.
Planned ragas (pools over the existing NOTE table, D-rooted): `yamanish`
(bright — festive/triumphant), `bhairavish` (grave — somber/mystic), `desh-ish`
(lyrical — tender). Every mood must render acceptably under every raga.
`music-demos.mjs` renders short examples per hierarchy node into
`engine/demos/` so choices are auditable by ear.

## Music moods (music.mjs — Agent D)

`script.json` scenes carry `"mood"`: `mystic | festive | tense | tender |
triumphant | somber | suspense`. Music derives per-scene texture from mood
(percussion pattern & tempo, melody register/pace/scale-set, drone intensity)
plus `events` (from storyboard fx or script: `bell`, `boom`, `silence`,
`swell`) at absolute times. Keep the existing synthesis palette (Karplus-Strong
tanpura, additive bansuri, tabla, bells) and the deterministic seed policy.
`--legacy` flag preserves the hand-composed Draupadī score exactly (keep the
current arrangement code behind it).

## Definition of done (every agent)

- `node engine/build/shots.mjs` on your test page(s): stills reviewed by you
  (Read the PNGs), composition/quality issues fixed, then reviewed once more.
- Legacy parity stills unchanged (`--story winning-of-draupadi`).
- No `Math.random`, no new dependencies, no module syntax in `src/`.
- New public APIs documented at top of file + one-line entries appended to this
  file's changelog section.

## Director's addendum (binding, from the fresh-eyes review)

1. **Painting, not puppet.** No visible joint circles; limb chains and torsos
   carry one continuous tapered ink contour; garment masses carry 2-3 interior
   fold strokes. The mannequin look is a merge-blocker.
2. **No twinning.** Any generated group (crowds, armies, brothers) samples
   height/build/skin/garment/headgear/pose-phase with uneven spacing; adjacent
   figures may not share garment color + headgear. Named characters must
   differ in silhouette, not just palette.
3. **Composition grammar.** Storyboards use named shot presets (`wide`,
   `two-shot`, `close-up`, `processional`, `hero-frame`); every film has at
   least one close-up at an emotional peak. The composition linter
   (safe-area / overlap / facing / subtitle-clearance on computed boxes) runs
   in validate before any render.
4. **Manuscript identity.** Films render inside an illuminated Pahari margin
   frame (dark rule + ornament band); title/end cards are calligraphic folios
   with a colophon citing corpus file paths; each story exports a poster
   frame; the player's pause mode ("darshan") exposes actor hitboxes with
   name/epithet/corpus links.
5. **Deferred by decision:** multi-arm/multi-head rigs (no slate film needs
   them), viseme lip-sync (narration will be re-voiced), further coverage
   census beyond the committed audit.
6. **Slate order:** Sāvitrī → Yakṣa Praśna → Bakāsura → Govardhana. Hero
   images: Sāvitrī following Yama's noose-bound spark through darkening
   forest; brothers fallen around a mirror lake, a voice with no body; small
   Bhīma calmly eating before a raging giant; the mountain-as-umbrella over
   lamp-lit cows while blue-black rain slants outside the dry circle.

## Changelog

- v1: initial contracts (restructure commit).
- v1.1: expressiveness principles + music hierarchy.
- v1.2: director's addendum (line pass, anti-twinning, composition grammar,
  manuscript identity, slate order).
