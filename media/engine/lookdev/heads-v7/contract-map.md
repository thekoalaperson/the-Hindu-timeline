# drawHead3 → drawHead4 contract map (independent scout, 2026-07-07)

Signature: `drawHead3(ctx, R, style, face, t, seed)` — paints by side effect;
opens with `ctx.save(); ctx.scale(R,R)` so everything inside is head units.

## Coordinate system (BINDING for drawHead4)
- Origin (0,0) on the **eye line** (mid-skull), NOT the crown. y increases down.
- Crown y ≈ −1.10, chin front y ≈ +1.10, chin bottom ≈ +1.14–1.16 (span ≈ 2.26).
- x ∈ [−1.0 back skull, +1.17 profile nose tip]. Faces **+x at turn=1**; turn=0 front.
- R is the pixel scale (figure passes headR = 30·build·(female?0.95:1); tests 82/150/27).
- drawFigure3 places head at translate(chestDx…, headCy), headCy = shoulderY − neck·build − headR·0.9;
  figure mirrors the whole head via ctx.scale when facing=−1. Neck art assumes the
  head occupies down to ~+0.5·headR at the join.

## face fields (defaults at person3.js:14)
turn (0.5, clamped 0..1), smile (0.1; −1..1), eyeOpen (1; 0..1.2),
gaze ({x:0,y:0}; ±1), brow (0; −1 anger..+1 raised), lipsPart (0..1), lowered (0..1).
Additive folds (absent = off): rage → brow−=rage·0.7, lipsPart=max(..,0.25+rage·0.3);
laugh → smile+=laugh·0.6, lipsPart=max(..,laugh·0.45); weep>0.05 → tears, alpha clamp(weep,0,1).

## t & seed — EXACT blink formula (bakeoff-canvas.html depends on it)
cyc = (t·0.29 + hash1(seed)·7) % 4.6; blink = cyc<0.13 ? sin(cyc/0.13·π) : 0;
open = clamp(f.eyeOpen − blink·1.2, 0.06, 1.2).
No positional idle in the head — figure applies headTilt/headNod/breath before the call.
Other t/seed use: sfbm1 noise in wild-mane/braid hair, peacock sway.

## turn semantics — the ×1.6 trap
- drawFigure3 (person3.js:1032): face = Object.assign({turn: clamp(pose.headTurn·1.6,0,1)}, pose.face)
  → pose.face.turn OVERRIDES raw (no remap); pose.headTurn is remapped ×1.6.
- people.js:1004 drawHead wrapper also remaps face.turn·1.6.
- Films' native turn range in practice: **0.08–0.88, clustered 0.3–0.7** (default headTurn 0.3 → 0.48).
  Pure 0 and 1.0 exercised only by test/look3.html. Tune the 0.3–0.7 band hardest.

## style vocabulary drawHead4 must honor
skin (required), skinShade (def shade(skin,−0.28)), hairColor ('#170d08'), female,
heavyBrow (brow weight ×1.5), iris ('#4a2c10'), lip (def female?'#a83a30':'#8a4030'),
earring, tilak ∈ {urdhva, tripundra, else→dot}, bindi, moustache ∈ {1,2},
beard ∈ {white, grey, colored} + beardLen (0.3), fangs/tusks,
crown ∈ {mukut, tiara, turban(+turbanColor)} — unknown (e.g. 'kirita') draws nothing,
peacock, hairFlowers, veil (color; only when hairstyle==='veil'),
hairstyle ∈ {topknot, braid, long, sagebun, bun, mane, veil} + wildHair/mane flags;
unknown ('loose') falls to default cap. noseRing is registry-declared but unread.

## v3 helpers (coupled to the v3 skull; reuse only if envelope kept)
hair3Back(ctx,style,t,seed,tn):375 (drawn BEFORE face fill), hair3Front(...):413
(early-return for turban), eye3:290, brow3:337, tilak3:357, crown3Mukut:508,
crown3Tiara:528, crown3Turban:548, peacock3:572. Inline: ear+earring 99-122,
tears 146-162, nose 164-176, mouth 178-221, fangs 223-235, bindi 239,
moustache 242-254, beard 255-277. Pure helpers from core.js/paint.js are safe.

## Consumers / blast radius of the swap
- Golden frames: media/engine/build/golden.mjs — ANY head pixel change fails all
  5 stories' golden.json → rerun with --update per story after visual sign-off.
- 5 dist bundles embed person3.js verbatim → rebuild via build-player.mjs.
- test/look3.html (turn sweep 0/.25/.5/.75/1), test/bakeoff-canvas.html (blink, seed 25).
- CONTRACTS.md:216 documents drawHead3/drawFigure3 as the approved renderer.
- Wrappers: people.js:1004 (live drawHead in story load order), person.js:1200.

## Integration checklist for the drawHead4 swap
1. Winner passes my personal sweep verification (anchors + 0.3–0.7 band + expressions).
2. Adapt envelope: v7 sheet units (crown −0.605, chin +0.72, eye line ~+0.03,
   face half-width ~0.46) → engine units (crown −1.10, chin +1.16, origin ON eye
   line): scale ≈ 1.70 about the eye line, i.e. y_engine ≈ (y_v7 − 0.03)·1.70,
   x_engine ≈ x_v7·1.70 (verify chin lands ≈ +1.16 and half-width ≈ 0.78–0.9 so
   neck/veil/headgear anchors still line up).
3. Swap call in person3.js:1033 (drawHead3 → drawHead4), keep drawHead3 source
   for test/look3.html comparison.
4. Cast regression: render every registry character (all hairstyles/crowns/beards/
   fangs) via a grid page — zero errors, graceful fallbacks.
5. Rebuild dist bundles; golden --update ×5 after visual approval; motion test MP4.
