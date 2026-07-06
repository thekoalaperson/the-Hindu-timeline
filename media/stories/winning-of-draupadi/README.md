# The Winning of Draupadī — animated retelling

A ~2¼-minute narrated animation of the *Svayaṃvara* and *Vaivāhika* episodes of the
[Ādi Parva](../../04-deep-dives/mahabharata/01-adi-parva.md) (Ādi 166–198): Draupadī's
birth from the fire-altar, the matsya-yantra test, the kings' failure and Karṇa's rebuff,
Arjuna's five arrows, the garland, Kuntī's irrevocable word, and the five-fold wedding
sanctioned by Vyāsa's revelation of the Śiva-boon (Ādi 189/197).

**Everything is hand-coded — no generative AI, no image models, no stock assets, no paid APIs.**

- **Art**: every frame is drawn live by vector-drawing code on a 2D canvas, in a style
  inspired by Rajput/Pahari miniature painting (profile faces, kohl-lined eyes, gold
  ornament, flat grounds with modelled forms). Characters are articulated rigs
  (forward-kinematic limbs, face parameters for gaze/blink/brow/lips) — see `src/people.js`.
- **Animation**: keyframed choreography per scene with eased tracks, walk cycles,
  cloth/hair secondary motion driven by deterministic value noise, multi-plane parallax
  camera, god rays, particles (embers, petals, dust, fireflies), per-scene colour grades.
  Deterministic `draw(t)` — the same `t` always yields the same frame.
- **Narration**: SVOX Pico (`pico2wave`), a classic *rule-based diphone* synthesizer
  (no neural TTS), pitched/EQ'd for a storyteller register. Sanskrit names are fed as
  phonetic respellings (see `build/script.json`).
- **Score**: synthesized from scratch in `build/music.mjs` — Karplus–Strong tanpura
  (pa–SA–SA–sa), an additive-synthesis bansuri with vibrato/breath and hand-composed
  phrases, tabla-like percussion, temple bells, and a climax boom; ducked under the
  narration with a sidechain compressor.
- **Video**: frames rendered headlessly (Playwright + Chromium) at 1920×1080/24 fps and
  encoded to H.264 + AAC with ffmpeg.

## Files

| path | what |
|---|---|
| `dist/index.html` | self-contained interactive player (audio embedded as data URI) |
| `dist/winning-of-draupadi.mp4` | the rendered film (1080p, ~2:15) |
| `src/` | engine + art + scenes (loaded by `src/index-dev.html` for development) |
| `build/script.json` | narration script (display text + TTS respellings + pacing) |
| `build/narrate.mjs` | TTS → per-scene WAV → `build/timeline.json` (master timing) |
| `build/music.mjs` | procedural score → `audio/music.wav` |
| `build/mix.sh` | narration placement + ducking + mastering → `audio/mix.wav/.mp3` |
| `build/render.mjs` | headless frame render + MP4 encode |
| `build/build.mjs` | assembles `dist/index.html` |

## Rebuild from scratch

```bash
# deps: node ≥ 20, ffmpeg, pico2wave (libttspico-utils), Playwright Chromium
npm install                 # playwright-core only
node build/narrate.mjs      # narration + timeline
node build/music.mjs        # score
bash build/mix.sh           # final soundtrack
node build/build.mjs        # interactive player
node build/render.mjs       # 1080p MP4 (≈ 5–10 min)
```

Timing is data-driven: edit `build/script.json`, re-run `narrate.mjs`, regenerate
`src/timeline.js` (`node -e` one-liner in the repo history) and every scene, subtitle,
and musical cue re-aligns to the new narration automatically.
