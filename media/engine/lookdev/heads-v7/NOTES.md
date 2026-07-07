# Heads v7 — approved look-dev (owner sign-off 2026-07-07)

`model-sheet.html` is the **canonical geometry source** for the cast's heads:
front / ¾ / profile for Draupadī (female template) and Arjuna (male template),
self-contained canvas-2D, hook-free. `style-lab.html` is the interactive tuning
build published as an Artifact (parameter hooks: eyeScale, irisRatio,
scleraTint, kohlWeight, lineWeight, lineTaper, shadowCoverage, shadowSoftness,
headRatio, browWeight, blush, skinGradient, motifDensity).

The `v7-*.png` files are the sign-off renders, captured through the lab's own
UI buttons.

## How this geometry was reached (keep for future views/characters)

Seven build rounds, three independent fresh-eyes critiques. The rules distilled
from what finally worked:

### Construction rules (all views)
- ONE perspective centerline per head. Every feature (bindi/tilak, nose,
  mouth, chin) sits on the same gentle arc; the feature axis at any row is
  ~0.62 of that row's visible face width for the 20° turn.
- The nose lives INSIDE the face except in profile. A "cheated ¾" with the
  nose escaped onto the silhouette while eyes/mouth stay frontal reads as two
  heads ghosted together — never do it.
- Every bump on the silhouette must carry a feature; every shadow must attach
  to a feature that exists at that turn angle. Bumps without features read as
  tumors.
- Face is widest at the cheekbones and tapers monotonically to the chin.
  Widest-below-the-mouth = jowl = instant character break.

### The ¾ view (v7 recipe)
- Approved-front oval turned ~20°: far side barely narrower, chin drifts
  toward the turn (chin apex x=0.082 in head units).
- Near eye 1.04×, far eye 0.72× crowding the bridge; eye-bridge gap matches
  the front view (~0.10 head units).
- Nose = ONE calligraphic stroke: ridge → tip hook → nostril wrap → tapered
  terminal kicking ~15° UP. No separate nostril dots/dashes.
- Shadow = two shapes only. A: slim crescent born at the temple, pinched out
  at the (fully lit) eye, bowing under the cheekbone, wrapping the chin above
  the chin ink — with a lit skin rim (~0.045 units) between it and the
  silhouette so it never fuses with the hair. B: small detached nose-anchor
  sliver + cast triangle under the far nostril.
- Gold rhythm: sliver of the far jhumka peeks past the far cheek.

### The profile (v7 recipe, from Bundi/Basohli plates)
- Lower face is a recessional staircase from the nose tip: upper lip =
  tip + 0.15·facedepth, lower lip = tip + 0.17·D, chin = tip + 0.19·D.
  Philtrum concavity ≤ 0.02·D. Compact chin, single convex jaw sweep.
- Mouth line RISES toward the corner and ends in a small dot placed slightly
  above the line — the Pahari "suppressed smile". Two-tone lips: mid-red
  upper petal, brighter lower petal with a highlight; only the mouth line is
  dark.
- Eye = lotus petal: flat aperture, iris riding the FRONT third with clean
  white sclera behind it, hair-thin lower rim, long surma tail that droops
  then lifts and dies to nothing.
- Temple carries the finest drawing: tapering sidelock ending in a point at
  mouth-corner level, a real ear (rim + lobe, top hidden by hair) with the
  jewel hanging from the lobe.
- Neck is dressed: two throat arcs, gold choker, pearl string (matches the
  front views' collars). Nath delicate (~30% smaller than instinct).
- Male: mustache roots at the philtrum, hugs the lip, curls UP at the tip
  (the up-curl is his smile); mukut gets a base band riding the hairline so
  the crown wraps the skull instead of perching.

### Process rules
- Verify renders personally through the same UI path the owner uses
  (button-driven Playwright screenshots); agent verification claims are
  hints, not evidence.
- Published artifacts carry a visible build badge; bump it on every deploy.
- When the owner can't articulate what's wrong, spawn fresh-eyes critics with
  zero construction context and implement their measured prescriptions.

## Status: PORTED (2026-07-07)
The port shipped as `drawHead4` (self-contained IIFE at the bottom of
`engine/src/person3.js`; `drawFigure3` calls it). Motion test passed the
owner; all five films re-rendered, goldens re-baselined, dist players
rebuilt. See `contract-map.md` for the API/coordinate contract and
CONTRACTS.md §v3-renderer for the binding turn-model rules (v7 3/4 at
native turn 0.30; hard profile switch at 0.85 — never animate across it).

## Open fronts for the next session (owner's review notes)
1. **Figure rebuild** — the heads now outclass the round-3 bodies; the same
   critique→θ-model discipline applied to drawFigure3 is the biggest
   remaining quality lever.
2. **Close-up detail pass** — extreme close-ups (e.g. Sāvitrī's grief scene)
   read quieter than the drama; consider an R-dependent detail tier.
3. **Style-code bake** — the Style Lab sliders (line weight, shadow, eyes)
   are not yet plumbed into drawHead4; if the owner tunes a style code,
   bake those numbers in as the canonical look.
4. **Workflow lesson** — builder agents must return file PATHS, never inline
   modules (two builders died on the 64k output cap returning code inline).
