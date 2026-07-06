// ── film.js ── Bhīma and Bakāsura: storyboards (in story.json) + two bespoke
// scenes. Grounded in 04-deep-dives/mahabharata/01-adi-parva.md (Baka-vadha,
// Ādi 159–166) and 04-deep-dives/characters/bhima.md.
//   cart  — the loaded cart to the wood; Bhīma eats the demon's dinner (comic).
//   fight — the HERO IMAGE: tiny calm Bhīma eating while the giant rages, then
//           three Pahari freeze-panels (lunge → grapple → back-break silhouette).
'use strict';

// ── style memo: resolve registry/cast looks once, with optional overrides ──
const _styleCache = {};
function styleOf(sel, over) {
  const key = sel + '|' + (over ? JSON.stringify(over) : '');
  if (!_styleCache[key]) _styleCache[key] = Object.assign({}, Person.of(sel).style, over || {});
  return _styleCache[key];
}

// camLayer f=1.0 zoom curve (mirror of stage.js) → cam.z for a target zEff.
const CAM_F1 = 0.72 + 0.5 / 1.3;
function camZFor(zEff) { return 1 + (zEff - 1) / CAM_F1; }
function zEffOf(camZ) { return 1 + (camZ - 1) * CAM_F1; }

// heaped foodstuff on the cart bed — shrinks as k (remaining, 1→0) drops.
function cartFood(ctx, x, y, s, k) {
  if (k <= 0.02) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const bedTopY = -150;
  const n = Math.max(0, Math.round(11 * k));
  for (let i = 0; i < n; i++) {
    const col = i % 3 === 0 ? '#e8b84c' : (i % 3 === 1 ? '#d98a3a' : '#c56a24');
    const px = -120 + (i % 5) * 58 + snoise1(i * 7, 3) * 8;
    const py = bedTopY - Math.floor(i / 5) * 32 - hash1(i * 3) * 6;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(px, py, 14 + hash1(i) * 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#5a2e0e', 0.5); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = rgba('#fff2cc', 0.5);
    ctx.beginPath(); ctx.arc(px - 4, py - 4, 3.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// soft rolling dust — deterministic, additive.
function dustCloud(ctx, x, y, r, k, t, seed) {
  if (k <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + t * 0.4;
    const rr = r * (0.35 + hash1(seed * 5 + i) * 0.5);
    const dx = Math.cos(a) * r * 0.75 + sfbm1(t * 0.8 + i, seed) * 22;
    const dy = -Math.abs(Math.sin(a)) * r * 0.28 - hash1(seed + i) * 18;
    softDisc(ctx, x + dx, y + dy, rr, rgba('#cdac7c', 0.10 * k), 'rgba(0,0,0,0)');
  }
  ctx.restore();
}

// the giant, with a brooding dark presence behind him.
function drawBaka(ctx, x, y, s, facing, style, pose, t) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y - 300 * s, 70 * s, x, y - 260 * s, 660 * s);
  g.addColorStop(0, 'rgba(28,8,6,0.30)'); g.addColorStop(1, 'rgba(28,8,6,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 760 * s, y - 960 * s, 1520 * s, 1060 * s);
  ctx.restore();
  drawFigure(ctx, { x, y, s, facing, style, pose, t, seed: 41 });
}

// ── bespoke scene: the cart of food (comic) ──
function scCart(ctx, tl, dur, t) {
  const bh = styleOf('bhimaHero');
  const bhX = 640, bhY = 1036, bhS = 0.66;
  // camera arc: wide (whole rig) → push-in close-up on Bhīma munching → wide.
  const push = pulse(tl, 4.2, 5.4, 6.8, 8.0);
  const camZ = lerp(1.06, camZFor(2.0), push);
  const zc = zEffOf(camZ);
  const headY = bhY - 300 * bhS;
  const camXwide = -20 + sfbm1(tl * 0.12, 61) * 5;
  const camYwide = sfbm1(tl * 0.1, 62) * 3;
  const camXcu = bhX - W / 2;
  const camYcu = headY - H / 2 - (0.42 * H - H / 2) / zc;
  const cam = { x: lerp(camXwide, camXcu, push), y: lerp(camYwide, camYcu, push), z: camZ };

  SETS.forest(ctx, cam, t, {
    timeOfDay: 'dawn', seed: 5, rays: 0.18, fg: false, particles: false,
    actors: (c) => {
      const gy = 1010;
      // draught bullock ahead, cart, then Bhīma trailing at the rear, snacking.
      drawCow(c, { x: 1258, y: gy - 4, s: 0.72, facing: 1, t, seed: 4, gait: 'walk', coat: '#cdbb9c' });
      drawCart(c, { x: 902, y: gy + 14, s: 0.82, t, seed: 2, load: 'pots', facing: 1 });
      cartFood(c, 902, gy + 14, 0.82, 1 - ramp(tl, 1.4, 7.6));
      const chew = Math.sin(t * 3.6) * 0.5 + 0.5;      // hand-to-mouth cycle
      const toMouth = 0.55 + chew * 0.45;
      drawFigure(c, {
        x: bhX, y: bhY, s: bhS, facing: 1, style: bh,
        pose: {
          lean: 0.05, headTurn: 0.42, headNod: 0.24 + chew * 0.14,
          armF: { sh: lerp(0.78, 1.0, toMouth), el: lerp(1.55, 1.82, toMouth), wr: 0.6, hand: 'hold' },
          armB: { sh: 0.22, el: 0.5, hand: 'relaxed' },
          legF: { hip: 0.12, knee: 0.08 }, legB: { hip: -0.15, knee: 0.12 },
          face: { smile: 0.18, lipsPart: 0.35 + chew * 0.4, eyeOpen: 0.68, lowered: 0.28 },
        },
        t, seed: 21,
      });
    },
  });
  wash(ctx, '#ffdca0', 0.05, 'soft-light');
}

// ── bespoke scene: Baka falls (hero image + freeze-panels) ──
function scFight(ctx, tl, dur, t) {
  const bh = styleOf('bhimaHero');
  const baka = styleOf('bakasura', { build: 1.45, shoulderScale: 1.4, hairstyle: 'mane' });

  // narration (tl 1.2 → 12.8): "roaring... huge as a hill... they fought...
  // until Bhīma seized him and broke his back across his knee." Panels track it.
  const roar = ramp(tl, 0.4, 2.2, easeOut);        // A: hero image settles, giant rages
  const lunge = ramp(tl, 5.8, 7.3, easeIO);        // B: the lunge tableau
  const grapple = ramp(tl, 7.7, 9.4, easeIO);      // C: the grapple tableau
  const brk = ramp(tl, 9.9, 11.6, easeIO);         // D: the back-break silhouette
  const fell = ramp(tl, 12.2, 13.8, easeIO);       // E: the giant falls

  const fwd = Math.max(lunge, grapple);
  const push = Math.max(lunge * 0.5, grapple * 0.72) * (1 - fell * 0.5);
  const shake = (grapple > 0.05 && brk < 0.9) ? sfbm1(t * 9, 71) * 6 * (grapple - brk) : 0;
  const camZ = lerp(1.02, 1.16, push);
  const cam = {
    x: lerp(-10, 110, push) + shake + sfbm1(tl * 0.1, 61) * 4,
    y: lerp(-6, 26, push) + sfbm1(tl * 0.11, 62) * 3,
    z: camZ,
  };

  SETS.forest(ctx, cam, t, {
    timeOfDay: 'dusk', seed: 11, rays: 0.16, fg: false, particles: true,
    actors: (c) => {
      const gy = 1006;
      if (brk < 0.02) {
        // ── Panels A–C: hero image → lunge → grapple ──
        // (drawFigure honours `lean`, not `bend` — the lunge is driven by lean.)
        const bakaX = lerp(1080, 858, lunge);
        const bakaY = 940;
        const bakaS = lerp(1.12, 1.17, grapple);
        drawBaka(c, bakaX, bakaY, bakaS, -1, baka, {
          lean: lerp(0, 0.46, lunge) * (1 - grapple * 0.22),
          headNod: lerp(-0.14, 0.32, fwd),
          armF: { sh: lerp(1.6, 1.12, fwd), el: lerp(0.66, 1.08, grapple), wr: 0.28, hand: 'claw' },
          armB: { sh: lerp(1.46, 0.98, fwd), el: lerp(0.74, 1.12, grapple), wr: -0.28, hand: 'claw' },
          legF: { hip: lerp(0.16, 0.46, fwd), knee: lerp(0.12, 0.32, fwd) },
          legB: { hip: lerp(-0.22, -0.54, fwd), knee: lerp(0.16, 0.48, fwd) },
          face: { brow: 0.72, eyeOpen: 1.12, lipsPart: lerp(0.92, 0.5, grapple), rage: 1 },
        }, t);

        // Bhīma: tiny & calm eating (foreground), then rises to grapple.
        const bhX = lerp(520, 720, grapple);
        const bhY = lerp(1040, gy + 22, grapple);
        const bhS = lerp(0.4, 0.62, grapple);
        const chew = Math.sin(t * 3.4) * 0.5 + 0.5;
        if (grapple < 0.35) drawCart(c, { x: 748, y: 1058, s: 0.54, t, seed: 2, facing: 1 });
        drawFigure(c, {
          x: bhX, y: bhY, s: bhS, facing: 1, style: bh,
          pose: grapple < 0.5 ? {
            lean: 0.03, headTurn: 0.26, headNod: 0.08 + chew * 0.06,
            armF: { sh: 1.02, el: 1.98, wr: 0.4, hand: 'hold' },
            armB: { sh: 0.22, el: 0.5, hand: 'relaxed' },
            legF: { hip: 0.1, knee: 0.06 }, legB: { hip: -0.12, knee: 0.1 },
            face: { smile: 0.22, lipsPart: chew * 0.5, eyeOpen: 0.84, brow: -0.1 },
          } : {
            lean: 0.14, headTurn: 0.3, headNod: -0.08,
            armF: { sh: 1.85, el: 0.44, wr: 0, hand: 'fist' },
            armB: { sh: 1.68, el: 0.56, wr: 0, hand: 'fist' },
            legF: { hip: 0.55, knee: 0.46 }, legB: { hip: -0.6, knee: 0.55 },
            face: { brow: 0.55, eyeOpen: 1, lipsPart: 0.3 },
          },
          t, seed: 21,
        });
        // dust at the giant's feet + rage glow behind his head
        dustCloud(c, bakaX - 8, bakaY + 8, 150 * bakaS, 0.4 + grapple * 0.4, t, 3);
        glowAdd(c, bakaX, bakaY - 540 * bakaS, 230 * bakaS, 'rgba(160,32,20,0.22)', 0.55 + roar * 0.3);
        if (grapple > 0.2) dustCloud(c, 780, gy + 18, 200, grapple * 0.75, t, 8);
      } else {
        // ── Panels D–E: the back-break silhouette, then the fall ──
        backBreak(c, 852, gy + 8, 1.0, bh, baka, brk, fell, t);
      }
    },
  });

  // panel-cut dips to umber (sell the freeze-frame edits)
  const cut = pulse(tl, 5.6, 5.74, 5.86, 6.06) + pulse(tl, 7.5, 7.64, 7.76, 7.96) + pulse(tl, 9.7, 9.84, 9.96, 10.16);
  if (cut > 0.01) { ctx.fillStyle = 'rgba(14,7,3,' + Math.min(cut, 0.85) + ')'; ctx.fillRect(0, 0, W, H); }
  // the flash of the break
  if (brk > 0.02 && fell < 0.7) {
    const fl = pulse(tl, 9.9, 10.4, 10.9, 11.9);
    if (fl > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowAdd(ctx, W * 0.5, H * 0.42, 540, 'rgba(255,238,200,0.5)', fl); ctx.restore(); }
  }
  wash(ctx, '#281630', 0.14 * (1 - fell * 0.4), 'multiply');
}

// the climax: Bhīma crouched with a raised knee; the giant arched backward over
// it (brk), then collapsing to the ground (fell). Rendered toward silhouette
// against a burst of light — the "back-break" panel.
function backBreak(ctx, x, y, s, bhStyle, bakaStyle, brk, fell, t) {
  // backlight burst behind the clash
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glowAdd(ctx, x + 40, y - 320 * s, 380 * s * (0.6 + brk * 0.4), 'rgba(255,232,182,0.30)', (1 - fell * 0.7) * (0.4 + brk * 0.5));
  ctx.restore();

  // Baka: arched backward across the knee (head-right, away from Bhīma), then
  // slumping flat to the ground. Kept horizontal — never swings back upright.
  const arch = lerp(1.3, 1.52, brk) + fell * 0.14;
  const px = x + 46 * s + fell * 90 * s;
  const cy = lerp(y - 150 * s, y - 16 * s, fell);
  ctx.save();
  ctx.translate(px, cy);
  ctx.rotate(arch);
  drawFigure(ctx, {
    x: 0, y: 0, s: 0.92 * s, facing: -1, style: bakaStyle,
    pose: {
      lean: 0.08 * (1 - fell), headNod: 0.45 - fell * 0.2, headTurn: 0.3,
      armF: { sh: lerp(1.9, 2.15, fell), el: 0.42, hand: 'open' },
      armB: { sh: lerp(1.7, 2.0, fell), el: 0.5, hand: 'open' },
      legF: { hip: 0.5, knee: 0.55 }, legB: { hip: 0.24, knee: 0.5 },
      face: { brow: 0.4, eyeOpen: 1 - fell, lipsPart: 0.6 - fell * 0.5 },
    },
    t, seed: 42, shadow: false,
  });
  ctx.restore();
  if (fell > 0.1) contactShadow(ctx, px - 60 * s, y + 6, 360 * s * fell, 0.42 * fell);

  // Bhīma: crouched with front knee driven up (brk) → stands over the body (fell)
  const bhS = 0.66;
  drawFigure(ctx, {
    x: x - 34, y: y + 8, s: bhS, facing: 1, style: bhStyle,
    pose: {
      lean: lerp(-0.05, 0.03, fell), headTurn: 0.32, headNod: lerp(-0.1, 0.14, fell),
      armF: { sh: lerp(1.5, 0.4, fell), el: lerp(0.42, 0.5, fell), wr: 0, hand: 'fist' },
      armB: { sh: lerp(1.34, 0.2, fell), el: lerp(0.52, 0.5, fell), wr: 0, hand: 'fist' },
      legF: { hip: lerp(1.12, 0.12, fell), knee: lerp(1.5, 0.08, fell) },
      legB: { hip: lerp(-0.5, -0.14, fell), knee: lerp(0.62, 0.12, fell) },
      face: { brow: lerp(0.6, 0.3, fell), eyeOpen: 1, lipsPart: 0.35 * (1 - fell) },
    },
    t, seed: 21,
  });

  // push the break toward silhouette against the flash + settle dust
  wash(ctx, '#140a16', 0.28 * brk * (1 - fell * 0.75), 'multiply');
  dustCloud(ctx, x + 10, y + 14, 300, brk * 0.4 + fell * 0.7, t, 12);
}

window.SCENE_FNS = { cart: scCart, fight: scFight };

// storyboards + folios live in story.json (injected as STORY); this file
// supplies the bespoke JS scenes above and boots the film.
if (typeof window !== 'undefined') {
  buildFilmFromStory(STORY, TIMELINE);
}
