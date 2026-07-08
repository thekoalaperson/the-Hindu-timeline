---
name: make-film
description: Produce a narrated animated film (interactive player + MP4) of a story from this repo's corpus using the media/ engine. Use when asked to make/animate/film a story.
---

# make-film

Turns "make a film of `<story>`" into an end-to-end pipeline: ground the story in
the corpus, scaffold a story package, cast it, generate audio, choreograph scenes,
review stills until they're actually good, render, and deliver. Read
`media/engine/CONTRACTS.md` in full before step 5 — it is the binding spec for
everything the engine exposes (Person API, Sets API, Acting API, storyboard
schema, music moods) and this skill assumes it, rather than re-deriving it.

All commands below assume your shell's cwd is `media/` (i.e. `cd media` first) —
that matches how CONTRACTS.md and the build scripts write their own examples
(`node engine/build/shots.mjs --story ...`). `<slug>` is the story's directory
name under `stories/` (lowercase-kebab-case); `<Title>` is its display title.

**On tool names that may not exist yet:** this skill was authored before
`engine/build/film.mjs` (a proposed unified wrapper) and `engine/build/validate.mjs`
(storyboard validator, CONTRACTS §Storyboard) necessarily existed. Try them first;
if `node engine/build/film.mjs ...` or `node engine/build/validate.mjs ...` errors
with "no such file", use the individual-script fallback given at each step instead
— those scripts (`narrate.mjs`, `music.mjs`, `mix.sh`, `build-player.mjs`,
`render.mjs`, `shots.mjs`) are confirmed working today and are what `film.mjs`
would wrap anyway. Likewise `person.js`/`archetypes.js`/`sets.js`/`stage.js` are
CONTRACTS-specified engine files this skill's cast/scene steps depend on — if
`stories/<slug>/dev.html` throws on a missing global (e.g. `Person is not
defined`, `buildFilmFromStory is not defined`), the engine build isn't finished
yet; check `media/engine/COVERAGE.md` if present, or fall back to the legacy
hand-coded-scene-function style used by `stories/winning-of-draupadi/` (see its
`film.js` + `scenes1.js`/`scenes2.js`/`scenes3.js`) until it is.

## Step 0 — Prerequisites check

Run these before touching a story; fix anything missing before proceeding:

- `ffmpeg -version` and `ffprobe -version` — used by narration, mixing, and
  rendering. Both must be on `PATH`.
- `pico2wave --help` (default narration provider) — or `espeak-ng --version` as a
  fallback provider (`--provider espeak` on `narrate.mjs`).
- `node --version` (any recent Node with ES modules; the build scripts are
  `.mjs`). From `media/`: `test -d node_modules/playwright-core || npm install`
  — `shots.mjs`/`render.mjs`/`build-player.mjs` all import `playwright-core`.
- A headless Chromium binary at the path exported as `CHROMIUM` in
  `engine/build/lib.mjs` (currently `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  in this environment — sandbox-provisioned, not installed via `npm`/`npx
  playwright install`). If that path is empty in a new environment, look for
  another `chromium*` under `/opt/pw-browsers/` and update expectations
  accordingly; `shots.mjs`/`render.mjs` will fail immediately without it.

## Step 1 — GROUND the story in the corpus

Don't paraphrase from memory — this repo is the source of truth and every claim
elsewhere in it is cited, so yours should be too.

1. `Grep` across `04-deep-dives/`, `timeline/`, and `90-literature-corpus/` for the
   requested story/character names (try Sanskrit *and* common English spellings).
   `04-deep-dives/` is the canonical home for a fully-told story; `timeline/` gives
   you the beat-by-beat chronological skeleton with source citations; per-Purāṇa
   maps live under `90-literature-corpus/puranas/`. `data/events.jsonl` is a
   faster programmatic scan if you just need actors/period for a name.
2. Read the best 2-4 files in full (the deep-dive is almost always one of them).
   Extract: the beat sequence, every named character and their epithets, and any
   *variant* tellings (this corpus catalogs disagreement rather than resolving
   it — carry that nuance into the script rather than flattening it).
3. Note the file paths you actually used — you'll cite them in `story.json`'s
   `sources[]` and in the corpus cross-link at step 8.
4. If the story genuinely isn't in the corpus, say so plainly and suggest the
   closest covered stories/characters instead of inventing content — this corpus
   explicitly tags scholarly/disputed/late/folk material rather than presenting
   everything as settled fact, and a film script shouldn't quietly do the opposite.

## Step 2 — SCAFFOLD the story package

```
node engine/build/scaffold.mjs --slug <slug> --title "<Title>"
```

This refuses to run if `stories/<slug>/` already exists. It writes `story.json`,
a 2-scene `script.json` skeleton, a stub `cast.js`, and a stub `film.js`. Now:

- Fill `story.json`'s `sources[]` with the file paths from step 1.
- Replace `script.json`'s scenes with **6-9 scenes**, each **~30-45 spoken
  words**. Use `stories/winning-of-draupadi/script.json` as your reference for
  shape and register (it's the shipped example this whole pipeline was proven
  against). Per scene:
  - `display`: on-screen subtitle text, full IAST diacritics welcome (e.g.
    "Draupadī", "Kṛṣṇa").
  - `tts`: the *same* text with proper names phonetically respelled for the
    offline TTS engine (Draupadī → "Drow-pa-dee", Kṛṣṇa → "Krish-na",
    Yudhiṣṭhira → "You-dish-teer" — see the reference file's `tts` fields for
    the pattern; commas/periods where you want the synthesizer to breathe).
  - `pad_before`/`pad_after`: seconds of scene visible before/after the narration
    audio — size these to the action, not a fixed constant (the reference
    file's climactic beats run `pad_after: 3.2`-`3.6`s so the visual can land
    after the line finishes; quieter transitional scenes run closer to `1.0-1.4`).
  - `mood`: exactly one of `mystic | festive | tense | tender | triumphant |
    somber | suspense` (CONTRACTS.md "Music moods") — this drives the score.

## Step 3 — CAST

Prefer reusing `media/characters/registry.json` over inventing a character from
scratch — it already covers the Draupadī cast plus ~17 forward-looking
characters (Rāma, Sītā, Hanumān, Rāvaṇa, Durgā, Yama, …), each with a `grounding`
citation and, where relevant, a `notes` field flagging what the engine can't draw
yet (extra arms/heads, non-human anatomy, unsupported vāhana rigs — read those
notes; they tell you which scenes need a workaround). In `cast.js`:

```js
const CAST = {
  krishna: Person.of('krishna'),                                    // registry as-is
  someKing: Person.of({ archetype: 'king', clothMain: '#2e5a7a' }),  // preset + override
  narrator: { skin: '#c08a58', hairColor: '#2c2018', garb: 'robe', clothMain: '#b4632a' },
};
```

For a character not in the registry, define them inline with an `archetype`
(closest of: `king, queen, prince, princess, warrior, brahmin, priest, villager,
hunter` from `archetypes.js`, or `deity, sage, rakshasa` if their nature is
superhuman — see `person.js`'s class hierarchy) plus palette overrides using the
same key vocabulary (`skin, skinShade, hairColor, hairstyle, garb, clothMain,
clothAccent, ornaments, build, tilak, …` — grep `cast.js` files for the full
vocabulary in practice). Consider adding genuinely reusable new characters back
to `media/characters/registry.json` for the next story, grounded the same way.

## Step 4 — AUDIO + TIMELINE

```
node engine/build/film.mjs audio --story <slug>
```

If that command doesn't exist yet, run what it wraps, in order:

```
node engine/build/narrate.mjs --story <slug>          # TTS -> audio/narr-*.wav + timeline.json/.js
node engine/build/music.mjs --story <slug>             # synthesized score -> audio/music.wav
bash  engine/build/mix.sh   stories/<slug>              # NOTE: positional story-dir arg, not --story
```

(`mix.sh` is the one script here with a different CLI convention — a bare
positional path, e.g. `stories/winning-of-draupadi`, not a `--story` flag.)

This produces `timeline.json`/`timeline.js` — **never hand-edit these** (the
generated `timeline.js` literally starts `// generated by narrate.mjs — do not
edit`). If timing is wrong, fix `pad_before`/`pad_after`/the `tts` text in
`script.json` and re-run `narrate.mjs`; everything downstream (music, mix,
render) derives its timing from this file.

## Step 5 — SCENES

Author `film.js`'s `STORY_DEF.scenes`. Prefer a storyboard object per scene over
a hand-written JS function — it's declarative, `validate.mjs` can check it, and
it's what the engine is standardizing on (CONTRACTS.md "Storyboard"):

- `set`: one of the `SETS` registry names — `palaceHall, courtyardNight,
  hutDusk, mandap, forest, village, riverBank, interior, mountain` (`sets.js`).
- `actors[].pose` / storyboard `beats[].pose`: one of the `POSES` presets —
  `stand, kneel, sit, bow, pranam, pray, point, refuse, shoot, carry, bless,
  shock, grief, dance` (`acting.js`), each blendable via `posemix`.
- `beats[].fx`: particle/effect names such as `petals` (see CONTRACTS.md's
  example and `stage.js`'s fx registry for the full current list — grep it
  directly since new fx get added over time).
- Camera keys interpolate with easing `io | in | out | back`; beat times are
  seconds-from-scene-start, `"NN%"` of the scene, or `"narr+X"` (X seconds after
  narration starts) — see the CONTRACTS example block verbatim.

Drop to a JS-fn scene (`sceneId(ctx, tl, dur, T) { ... }`, matching the legacy
`stories/winning-of-draupadi/scenes*.js` signature) only for choreography the
storyboard genuinely can't express yet — a walk-and-turn combo, a bespoke camera
move, particle timing tied to an exact narration word. Then:

```
node engine/build/validate.mjs --story <slug>
```

if present — it reports unknown sets/actors/poses/fx before you spend render
time on a typo. If it doesn't exist yet, the QA loop below (step 6) will surface
the same class of mistakes, just later and as a blank canvas or a thrown error
instead of a clean message.

## Step 6 — QA LOOP (the craft step; do not skip or shortcut)

This is where a film goes from "technically renders" to "genuinely good." Budget
real time for it.

1. Get each scene's `start` and `start + dur/2` from `timeline.json` (a quick
   `node -e` one-liner over the JSON is fine) to build a `--times` list that hits
   every scene's opening beat and its midpoint.
2. `node engine/build/shots.mjs --story <slug> --times "<t0,t1,t2,...>" --out
   /tmp/shots-<slug>`
3. **Read every PNG** (the image tool, not a description of it). Check, per
   frame: composition (is anything cut off, overlapping badly, or off-canvas?),
   scale (do actors' `s` values look consistent with the set and each other?),
   continuity (does an actor's position/facing make sense against the previous
   beat?), and whether the pose/expression matches what the line being narrated
   at that timestamp actually says.
4. Fix what's wrong in `film.js`/`cast.js`/`script.json`, regenerate, and look
   again. **Iterate at least twice.** The bar is "would I ship this," not "did it
   render without an exception."

## Step 7 — RENDER + PACKAGE

```
node engine/build/build-player.mjs --story <slug>
```

(or `film.mjs player` if that wrapper exists) builds `dev.html`, `dist/index.html`,
and `dist/artifact.html`. Verify the player itself, not just scene content:

```
node engine/build/shots.mjs --page stories/<slug>/dist/index.html --out /tmp/player-<slug>
```

Read that screenshot — check title, subtitle, and layout render correctly. Then:

```
node engine/build/render.mjs --story <slug>
```

(or `film.mjs render`) — this is slow (roughly 5-10 minutes for a ~2-minute
film); run it with `run_in_background` and don't poll. When it finishes, pull 2-3
stills straight from the encoded MP4 (not the frame cache) to confirm the mux is
correct end to end:

```
ffmpeg -y -ss <T> -i stories/<slug>/dist/<slug>.mp4 -frames:v 1 /tmp/still-<T>.png
```

at a couple of timestamps (e.g. ~10%, ~50%, ~90% of the duration) and Read them.

## Step 8 — DELIVER

1. Send the rendered MP4 to the user (a `SendUserFile`-style tool if the session
   has one; otherwise report its absolute path,
   `media/stories/<slug>/dist/<slug>.mp4`).
2. Publish the interactive player as an Artifact: call the `Artifact` tool with
   `file_path` pointing at `media/stories/<slug>/dist/artifact.html` —
   **not** `dist/index.html`. `build-player.mjs` already strips
   `dist/artifact.html`'s outer `<!doctype html><html><head>...</head><body>`
   skeleton specifically so the Artifact tool's own skeleton doesn't double-wrap
   it; give it a title and an emoji favicon.
3. Commit the new `stories/<slug>/` directory (plus any registry additions from
   step 3).
4. Cross-link it from the corpus source doc(s) you cited in step 1, as a
   blockquote right under the relevant heading. Pattern (from
   `04-deep-dives/mahabharata/01-adi-parva.md`, just above "Draupadī's
   Svayaṃvara"):

   ```
   > 🎬 *Watch:* this episode (<parva/citation range>) has a ~<N>-minute
   > hand-coded animated retelling in [`media/stories/<slug>/`](../../media/stories/<slug>/)
   > — interactive player + MP4.
   ```

   **Do not copy that existing line's literal path** — it reads
   `media/winning-of-draupadi/README.md`, which predates the engine's restructure
   into `media/stories/<slug>/` and is now a broken link (confirmed: no
   `media/winning-of-draupadi/` directory exists). Copy the *callout pattern*,
   point it at the correct current location, `media/stories/<slug>/`.

## Constraints

- **No AI-generated imagery, ever.** All art is authored path/vector data drawn
  live by engine code; all audio is synthesized or rule-based/offline TTS or the
  user's own recordings (CONTRACTS.md rule 4).
- **Determinism.** Every visual is a pure function of time `t`. Never call
  `Math.random()` at draw time — use the engine's seeded `hash1`/`noise1`/`fbm1`
  helpers with explicit integer seeds, so the same `t` always yields the same
  frame (CONTRACTS.md rule 1); the headless renderer depends on this.
- **Visual verification is mandatory, not optional.** A scene or a change that
  hasn't been rendered to stills and actually looked at (step 6) does not ship,
  per CONTRACTS.md rule 5 — this applies to this skill's output exactly as much
  as it applies to engine code changes.
- Never hand-edit `timeline.json`/`timeline.js` (step 4) or modify
  `media/engine/CONTRACTS.md` or another story's files while making this one.

## Troubleshooting

- **`PAGE ERROR: ...` in `shots.mjs`/`render.mjs` output** — a JS exception in
  your scene code (`film.js`/`cast.js`), not an engine bug by default. The
  message includes the thrown error; check it against the actual script/browser
  error first (undefined `CAST`/`SETS`/`POSES` key is the usual culprit) before
  assuming the engine is missing something.
- **`ffprobe`/players report "moov atom not found"** on the output MP4 — the
  encode in `render.mjs` is still running (or was killed mid-write); `ffmpeg -movflags
  +faststart` finalizes that atom at the very end, so a partially-written file is
  briefly unplayable/unprobeable. Wait for the `encoded ...` log line, don't
  inspect the file while the background render job is still active.
- **Artifact looks broken / has a nested `<html>` or duplicate `<head>`** — you
  pointed the `Artifact` tool at `dist/index.html` instead of `dist/artifact.html`.
  Only `artifact.html` has the outer document skeleton already stripped.
- **`Person is not defined` / `buildFilmFromStory is not defined` / similar in
  `dev.html`** — the CONTRACTS-specified engine file that defines it
  (`person.js`, `stage.js`, …) isn't landed in `engine/src/` yet in this
  checkout. See the note at the top of this file for the fallback.
