// ── film.js ── Sāvitrī & Satyavān: storyboards + three bespoke scenes.
// Grounded in 04-deep-dives/savitri-satyavan.md (Vana Parva 291–297).
'use strict';

// ── helpers for the bespoke scenes ──
function svPerson(name) { return Person.of(name); }

// the noose-bound soul: a thumb-sized spark
function svSpark(ctx, x, y, k, t) {
  if (k <= 0.01) return;
  glowAdd(ctx, x, y, 46 * k, 'rgba(255,214,140,0.85)', k);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = '#fff3d0';
  ctx.beginPath(); ctx.arc(x, y, 5.5 + Math.sin(t * 7) * 0.8, 0, TAU); ctx.fill();
  ctx.restore();
}
// Yama's noose: a hanging rope loop from his hand, holding the spark
function svNoose(ctx, hx, hy, t, spark, k) {
  ctx.save();
  ctx.strokeStyle = rgba('#d9c9a0', 0.9);
  ctx.lineWidth = 3;
  const sway = sfbm1(t * 0.8, 31) * 6;
  const lx = hx + 26 + sway, ly = hy + 66;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(hx + 18, hy + 30, lx, ly - 24);
  ctx.stroke();
  ctx.beginPath(); ctx.ellipse(lx, ly, 20, 26, 0.1, 0, TAU); ctx.stroke();
  if (spark > 0.01) svSpark(ctx, lx, ly, spark, t);
  ctx.restore();
}
// Yama himself — registry style + presence: heavier build, dark aura, daṇḍa
function svDrawYama(ctx, x, y, s, facing, pose, t, seed) {
  // smothered light around the Lord of Death
  ctx.save();
  const g = ctx.createRadialGradient(x, y - 170 * s, 40 * s, x, y - 150 * s, 420 * s);
  g.addColorStop(0, 'rgba(10,6,14,0.34)'); g.addColorStop(1, 'rgba(10,6,14,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 460 * s, y - 620 * s, 920 * s, 760 * s);
  ctx.restore();
  const st = Object.assign({}, Person.of('yama').style, { build: 1.16, crown: 'mukut' });
  drawFigure(ctx, { x, y, s, facing, style: st, pose, t, seed });
  // the daṇḍa (staff of Death) in the far hand
  ctx.save();
  ctx.strokeStyle = '#2c1a10'; ctx.lineWidth = 7 * s;
  ctx.beginPath(); ctx.moveTo(x - 60 * s * facing, y - 6); ctx.lineTo(x - 78 * s * facing, y - 320 * s); ctx.stroke();
  const tg = ctx.createRadialGradient(x - 80 * s * facing, y - 330 * s, 1, x - 80 * s * facing, y - 330 * s, 16 * s);
  tg.addColorStop(0, '#ffca6a'); tg.addColorStop(1, '#8a2f1d');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.arc(x - 80 * s * facing, y - 330 * s, 12 * s, 0, TAU); ctx.fill();
  ctx.restore();
}

// Satyavān lying with his head in Sāvitrī's lap (the tableau of the fated day)
function svLapTableau(ctx, x, y, s, t, lifeK) {
  // lifeK: 1 = awake/waking, 0 = lifeless
  // Sāvitrī seated
  drawSeated(ctx, {
    x: x, y: y, s: s, facing: -1, style: Person.of('savitri:vrata').style, t, seed: 21,
    face: { turn: 0.35, lowered: 0.8, smile: -0.05 + lifeK * 0.25, brow: 0.25 * (1 - lifeK) },
  });
  // Satyavān: torso across her lap, drawn reclined
  ctx.save();
  ctx.translate(x - 68 * s, y - 66 * s);
  ctx.rotate(-1.42);
  drawFigure(ctx, {
    x: 0, y: 0, s: s * 0.94, facing: 1,
    style: Person.of('satyavan').style,
    pose: {
      headTurn: 0.45, headNod: 0.22 - lifeK * 0.1,
      armF: { sh: 0.25, el: 0.3, hand: 'relaxed' },
      armB: { sh: -0.1, el: 0.2 },
      legF: { hip: 0.28, knee: 0.34 }, legB: { hip: 0.16, knee: 0.2 },
      face: { eyeOpen: lifeK * 0.9, lowered: 1 - lifeK, smile: lifeK * 0.15, lipsPart: 0.2 },
    },
    t, seed: 22, shadow: false,
  });
  ctx.restore();
  contactShadow(ctx, x - 60 * s, y + 4, 150 * s, 0.3);
}

// ── bespoke scene: the fated day ──
function scAxe(ctx, tl, dur, t) {
  const chopA = pulse(tl, 0.4, 1.1, 5.2, 5.6);            // chopping window
  const drop = ramp(tl, 5.6, 6.3, easeIn);                // the axe falls
  const sink = ramp(tl, 7.2, 10.6, easeIO);               // he sinks to her lap
  const still = ramp(tl, 12.4, 14.4);                     // stillness
  const cam = {
    x: 40 + sfbm1(tl * 0.1, 61) * 4,
    y: sfbm1(tl * 0.11, 62) * 3,
    z: 1.12 + ramp(tl, 6.0, 12.0) * 0.16,
  };
  SETS.forest(ctx, cam, t, {
    timeOfDay: 'day', seed: 7, rays: 0.6,
    actors: (c) => {
      const gx = 900, gy = 1000;
      if (sink < 0.98) {
        // Satyavān chopping at a fallen log, Sāvitrī watching
        const swing = Math.sin(t * 3.2) * chopA;
        drawFigure(c, {
          x: gx, y: gy, s: 0.72, facing: 1,
          style: Person.of('satyavan').style,
          pose: {
            lean: 0.1 + swing * 0.08 - sink * 0.2,
            headNod: 0.15 + sink * 0.3,
            armF: { sh: (1.5 + swing * 0.55) * (1 - drop), el: 0.35 + drop * 0.4, hand: drop > 0.5 ? 'open' : 'hold' },
            armB: { sh: (1.25 + swing * 0.5) * (1 - drop), el: 0.4, hand: drop > 0.5 ? 'open' : 'hold' },
            legF: { hip: 0.14, knee: 0.1 }, legB: { hip: -0.2, knee: 0.16 },
            face: { brow: -0.2 + drop * 0.9, lipsPart: drop * 0.6, eyeOpen: 1 - sink * 0.4, lowered: sink * 0.5 },
          },
          t, seed: 22,
        });
        // the axe: in-hand while chopping, falling after
        c.save();
        if (drop < 0.02) {
          c.translate(gx + 66, gy - 250 + swing * -40);
          c.rotate(-0.9 + swing * 0.5);
        } else {
          c.translate(gx + 66 + drop * 60, gy - 250 + drop * drop * 236);
          c.rotate(-0.9 + drop * 2.6);
        }
        c.strokeStyle = '#5c4226'; c.lineWidth = 9;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 84); c.stroke();
        c.fillStyle = '#b9bec6';
        c.beginPath();
        c.moveTo(-6, -2); c.quadraticCurveTo(-34, 6, -30, 30);
        c.lineTo(-8, 22); c.closePath(); c.fill();
        c.restore();
        // log
        c.fillStyle = '#6e4a26';
        c.beginPath(); c.ellipse(gx + 150, gy - 20, 90, 26, 0.06, 0, TAU); c.fill();
        c.strokeStyle = rgba('#2c1a0c', 0.5); c.lineWidth = 2;
        c.beginPath(); c.ellipse(gx + 150, gy - 20, 90, 26, 0.06, 0, TAU); c.stroke();
        // Sāvitrī nearby
        drawFigure(c, {
          x: gx - 300 + sink * 120, y: gy + 6, s: 0.7, facing: 1,
          style: Person.of('savitri:vrata').style,
          pose: Object.assign({}, sink > 0.02 && sink < 0.96 ? walkPose(t * 6, 0.5) : {}, {
            headTurn: 0.32,
            face: { brow: drop * 0.7, lipsPart: drop * 0.5, smile: -drop * 0.2 },
          }),
          t, seed: 21,
        });
      } else {
        svLapTableau(c, gx - 40, gy + 4, 0.74, t, 1 - still);
      }
    },
  });
  // the light dims as the moment comes
  wash(ctx, '#2c2036', 0.10 * ramp(tl, 6, 12), 'multiply');
}

// ── bespoke scene: Yama comes ──
function scYama(ctx, tl, dur, t) {
  const appear = ramp(tl, 1.6, 4.0, easeIO);      // Yama fades in
  const draw = ramp(tl, 6.2, 8.4, easeIO);        // draws the soul
  const turn = ramp(tl, 10.2, 11.6, easeIO);      // turns south
  const walk = ramp(tl, 11.6, dur - 2.2, easeIO); // walks away, she rises
  const cuK = pulse(tl, dur - 3.4, dur - 2.6, dur - 0.4, dur + 0.4); // her close-up
  const cam = {
    x: -60 + sfbm1(tl * 0.09, 71) * 4,
    y: sfbm1(tl * 0.1, 72) * 3,
    z: 1.18 + draw * 0.06,
  };
  SETS.forest(ctx, cam, t, {
    timeOfDay: 'dusk', seed: 11, rays: 0.25,
    actors: (c) => {
      const gx = 780, gy = 1000;
      svLapTableau(c, gx, gy, 0.72, t, 0);
      // Yama: manifests at right, draws the spark from Satyavān's breast
      if (appear > 0.01) {
        const yx = 1430 - walk * 900, yy = gy + 10;
        c.save();
        c.globalAlpha = appear;
        const wp = walk > 0.02 && walk < 0.98 ? walkPose(t * 5.2, 0.55) : {};
        svDrawYama(c, yx, yy, 0.8, -1, Object.assign({}, wp, {
          headTurn: 0.3,
          headNod: 0.06,
          armF: walk > 0.02
            ? { sh: 0.55, el: 0.7, hand: 'hold' }
            : { sh: lerp(0.25, 0.95, draw), el: lerp(0.4, 0.5, draw), hand: 'hold' },
          face: { smile: -0.1, brow: -0.2, lowered: 0.25 },
        }), t, 41);
        // noose + spark: spark leaves Satyavān's chest into the loop
        const hx = yx - 96 * (1), hy = yy - 246;
        const sx0 = gx - 88, sy0 = gy - 130;      // his breast
        const k = draw;
        if (k > 0.01 && walk < 0.02) {
          const px = lerp(sx0, hx + 26, easeIO(k));
          const py = lerp(sy0, hy + 66, easeIO(k)) - Math.sin(k * Math.PI) * 90;
          svNoose(c, hx, hy, t, 0, 1);
          svSpark(c, px, py, appear, t);
        } else {
          svNoose(c, hx, hy, t, draw, 1);
        }
        c.restore();
      }
      // Sāvitrī rises and follows once he walks
      if (walk > 0.05) {
        const sx = gx - 40 + walk * -560;
        const wp2 = walk < 0.96 ? walkPose(t * 6.1, 0.6) : {};
        drawFigure(c, {
          x: Math.max(sx, 1430 - walk * 900 + 260), y: gy + 8, s: 0.7, facing: -1,
          style: Person.of('savitri:vrata').style,
          pose: Object.assign({}, wp2, {
            headTurn: 0.3, face: { brow: 0.3, smile: -0.05, lowered: 0.1 },
          }),
          t, seed: 21,
        });
      }
    },
  });
  wash(ctx, '#1a1430', 0.16 * appear, 'multiply');
  // her resolve, close: the film's emotional close-up
  if (cuK > 0.01) {
    ctx.save();
    ctx.globalAlpha = cuK;
    ctx.fillStyle = 'rgba(10,6,16,0.55)'; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.5;
    glowAdd(ctx, cx, cy, 420, 'rgba(120,90,160,0.18)', 1);
    ctx.translate(cx, cy + 110);
    ctx.scale(7.4, 7.4);
    drawHead(ctx, 27, Person.of('savitri:vrata').style,
      { turn: 0.3, smile: -0.04, eyeOpen: 1, gaze: { x: -0.55, y: 0.05 }, brow: 0.32, lowered: 0 }, t, 21);
    ctx.restore();
  }
}

// ── bespoke scene: walking with Death / the boons ──
function scBoons(ctx, tl, dur, t) {
  const stopT = ramp(tl, 13.2, 14.4, easeIO);     // Yama stops walking
  const boonAt = [5.2, 7.6, 10.0];                // three grants (glow pulses)
  const cam = {
    x: sfbm1(tl * 0.08, 81) * 4,
    y: sfbm1(tl * 0.09, 82) * 3,
    z: 1.14 + stopT * 0.1,
  };
  SETS.forest(ctx, cam, t, {
    timeOfDay: 'night', seed: 23, rays: 0, particles: true,
    actors: (c) => {
      const gy = 1000;
      const drift0 = (1 - stopT) * ((tl * 26) % 90);  // treadmill: world slides as they walk
      // Yama ahead, spark in noose; Sāvitrī seven steps behind
      const yx = 700 - stopT * 40, sx = yx + 330;
      const wpY = stopT < 0.98 ? walkPose(t * 5.0, 0.5 * (1 - stopT)) : {};
      const wpS = stopT < 0.98 ? walkPose(t * 5.0 + 2.1, 0.58 * (1 - stopT)) : {};
      svDrawYama(c, yx, gy + 8, 0.82, -1, Object.assign({}, wpY, {
        headTurn: stopT > 0.5 ? 0.55 : 0.3,
        armF: { sh: 0.55, el: 0.7, hand: 'hold' },
        face: { smile: -0.05 + stopT * 0.28, brow: -0.15 + stopT * 0.3, lowered: 0.2 },
      }), t, 41);
      svNoose(c, yx + 96, gy - 240, t, 1, 1);
      drawFigure(c, {
        x: sx, y: gy + 10, s: 0.7, facing: -1,
        style: Person.of('savitri:vrata').style,
        pose: Object.assign({}, wpS, {
          headTurn: 0.32,
          armF: { sh: 0.5, el: 1.1, hand: 'open' },
          face: { smile: 0.05, brow: 0.2, lipsPart: 0.4 * (1 - stopT), lowered: 0.1 },
        }),
        t, seed: 21,
      });
      // boon grants: three soft golden blooms between them
      for (let i = 0; i < 3; i++) {
        const k = pulse(tl, boonAt[i], boonAt[i] + 0.5, boonAt[i] + 1.6, boonAt[i] + 2.4);
        if (k > 0.01) {
          const bx = lerp(yx + 120, sx - 90, 0.5), by = gy - 300 - i * 26;
          glowAdd(c, bx, by, 90 * k, 'rgba(255,206,110,0.65)', k);
          c.save(); c.globalAlpha = k * 0.9;
          c.fillStyle = '#ffe9b0';
          for (let p = 0; p < 6; p++) {
            const a = p / 6 * TAU + i;
            c.beginPath();
            c.ellipse(bx + Math.cos(a) * 26 * k, by + Math.sin(a) * 26 * k, 8, 3.4, a, 0, TAU);
            c.fill();
          }
          c.restore();
        }
      }
    },
  });
  wash(ctx, '#141230', 0.2, 'multiply');
  wash(ctx, '#ffca7a', 0.05 * stopT, 'soft-light');
}

window.SCENE_FNS = { axe: scAxe, yama: scYama, boons: scBoons };

// ── storyboarded scenes ──
// storyboards + folios live in story.json (injected as the STORY global);
// this file supplies only the bespoke JS scenes and boots the film.
if (typeof window !== 'undefined') {
  buildFilmFromStory(STORY, TIMELINE);
}
