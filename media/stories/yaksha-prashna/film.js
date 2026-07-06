// ── film.js ── The Yakṣa's Questions: two storyboards (reach, wonder) in
// story.json + five bespoke JS scenes here. Grounded in
// 04-deep-dives/yaksha-prashna.md (Mahābhārata, Vana Parva 311–315).
//
//  chase   — a deer bolts off with the Brāhmaṇa's fire-sticks; brothers chase
//  fall    — one by one the four brothers drink against the voice and fall
//  voice   — Yudhiṣṭhira finds them; a bodiless voice shimmers over the lake
//  riddles — the questions, each answer a brief luminous emblem on the water
//  reveal  — the crane is Dharma; the four are raised as if from sleep
//
// The lake IS SETS.riverBank (ghat off, reeds on). The disembodied voice is a
// shimmer/ripple-glow (glowAdd+motes), never a figure, until the revelation.
'use strict';

// ── shore layout (world coords; near-bank of riverBank runs x<~980) ──
// Each fallen brother: px,py = translate pivot; rot rotates the upright figure
// nearly flat. dir=1 lays the body toward -x (head to the left); dir=-1 toward
// +x (head to the right). Varied angle/depth/scale — no twinning.
const YP = {
  fallen: [
    { who: 'nakula',   px: 660, py: 934, rot: -1.52, s: 0.60, dir: 1,  seed: 61 },
    { who: 'sahadeva', px: 360, py: 968, rot: -1.35, s: 0.62, dir: 1,  seed: 62 },
    { who: 'arjuna',   px: 500, py: 988, rot: 1.49, s: 0.64, dir: -1, seed: 63 },
    { who: 'bhima',    px: 740, py: 960, rot: 1.31, s: 0.72, dir: -1, seed: 64 },
  ],
  stand: { nakula: [540, 986], sahadeva: [300, 1000], arjuna: [720, 1004], bhima: [920, 1000] },
  yudh: [1030, 984],
  crane: [1500, 900],
  voiceX: 1250, voiceY: 690,
};

function sty(n) { return Person.of(n).style; }

// gentle lifted camera so the reclined bodies read above the subtitle band
function ypCam(tl, seed, z, yLift, xE) {
  return {
    x: (xE || 0) + sfbm1(tl * 0.09, seed) * 4,
    y: (yLift == null ? 90 : yLift) + sfbm1(tl * 0.1, seed + 5) * 3,
    z: z || 1.05,
  };
}

// ── one reclined (fallen) brother, drawn via translate+rotate like svLapTableau ──
function ypReclined(c, style, o) {
  const a = o.alpha == null ? 1 : o.alpha;
  if (a <= 0.01) return;
  const lifeK = o.lifeK == null ? 0 : o.lifeK;
  // elongated contact shadow first, on the ground under the body
  c.save();
  c.globalAlpha = a * 0.75;
  contactShadow(c, o.px - 130 * o.s * o.dir, o.py + 6, 150 * o.s, 0.32);
  c.restore();
  c.save();
  c.globalAlpha = a;
  c.translate(o.px, o.py);
  c.rotate(o.rot);
  drawFigure(c, {
    x: 0, y: 0, s: o.s, facing: o.dir,
    style: style,
    pose: {
      headTurn: 0.42, headNod: 0.2 - lifeK * 0.12,
      armF: { sh: 0.2 + hash1(o.seed) * 0.1, el: 0.32, hand: 'relaxed' },
      armB: { sh: -0.12, el: 0.2 },
      legF: { hip: 0.22 + hash1(o.seed + 1) * 0.08, knee: 0.34 }, legB: { hip: 0.13, knee: 0.2 },
      face: { eyeOpen: lifeK * 0.9, lowered: 1 - lifeK, smile: lifeK * 0.12, lipsPart: 0.15 },
    },
    t: o.t, seed: o.seed, shadow: false,
  });
  c.restore();
}

function ypDrawFallen(c, t) {
  for (const b of YP.fallen) {
    ypReclined(c, sty(b.who), { px: b.px, py: b.py, rot: b.rot, s: b.s, dir: b.dir, t, seed: b.seed, lifeK: 0, alpha: 1 });
  }
}

// ── the crane (yakṣa's baka form) — a heron watching at the water's edge ──
function ypCrane(c, x, y, t, s, blazeK) {
  if (blazeK < 0.9) drawBird(c, { x, y, s: s || 1.15, facing: -1, t, seed: 7, gait: 'idle', coat: '#e8e4d6' });
  if (blazeK > 0.01) glowAdd(c, x, y - 200 * (s || 1.15), 240 * blazeK, 'rgba(255,244,210,0.85)', blazeK);
}

// ── the disembodied voice — a shimmer/ripple-glow over the water (NOT a figure) ──
function ypVoice(c, x, y, t, k) {
  if (k <= 0.01) return;
  const pz = 0.5 + 0.5 * Math.sin(t * 1.3);
  // a soft column of presence rising from the water
  c.save(); c.globalCompositeOperation = 'lighter';
  const cg = c.createLinearGradient(x, y - 150 * k, x, y + 120);
  cg.addColorStop(0, 'rgba(190,215,255,0)');
  cg.addColorStop(0.5, 'rgba(202,226,255,' + (0.17 * k) + ')');
  cg.addColorStop(1, 'rgba(190,215,255,0)');
  c.fillStyle = cg; c.fillRect(x - 62 * k, y - 150 * k, 124 * k, 272);
  c.restore();
  glowAdd(c, x, y, 250 * k, 'rgba(150,190,240,0.19)', 0.6 + 0.25 * pz);
  glowAdd(c, x, y - 14, 140 * k, 'rgba(212,232,255,0.26)', 0.55 + 0.3 * pz);
  glowAdd(c, x, y - 8, 60 * k, 'rgba(244,250,255,0.6)', 0.72 * k);
  motes(c, x - 190, y - 165, 380, 275, t, 55, 26, '#d8eeff');
  // ripple rings spreading on the water beneath the glow
  c.save();
  c.strokeStyle = 'rgba(205,228,255,0.34)'; c.lineWidth = 2.6;
  for (let i = 0; i < 4; i++) {
    const rp = (t * 0.45 + i / 4) % 1;
    const rr = 26 + rp * 178 * k;
    c.globalAlpha = (1 - rp) * 0.55 * k;
    c.beginPath(); c.ellipse(x, y + 86, rr, rr * 0.28, 0, 0, TAU); c.stroke();
  }
  c.restore();
}

// ── riddle emblems (brief luminous symbols over the water) ──
// swifter than wind = THOUGHT: a streak of light crossing the sky faster than
// the slow leaves drifting for contrast.
function ypThought(c, t, prog) {
  const p = clamp(prog, 0, 1);
  const a = Math.sin(p * Math.PI);
  // slow drifting leaves (the contrast — the wind's own pace)
  for (let i = 0; i < 3; i++) {
    const lx = 540 + i * 230 + sfbm1(t * 0.3 + i, i) * 24;
    const ly = 470 + i * 22 + ((t * 10 + i * 45) % 130);
    c.save();
    c.globalAlpha = 0.45 * a;
    c.translate(lx, ly); c.rotate(t * 0.5 + i);
    c.fillStyle = '#8a944e';
    c.beginPath(); c.ellipse(0, 0, 11, 4.6, 0, 0, TAU); c.fill();
    c.restore();
  }
  if (a <= 0.02) return;
  // the streak — a bright head with a comet tail, crossing left→right fast
  const sweep = easeIO(clamp(p * 1.5, 0, 1));
  const hx = lerp(340, 1580, sweep), hy = 424 - Math.sin(sweep * Math.PI) * 44;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 11; i++) {
    const u = i / 11;
    c.globalAlpha = a * (1 - u) * 0.6;
    c.fillStyle = '#dcecff';
    c.beginPath(); c.arc(hx - u * 300, hy + u * 6, 8 * (1 - u * 0.7), 0, TAU); c.fill();
  }
  c.restore();
  glowAdd(c, hx, hy, 50, 'rgba(215,232,255,0.9)', a);
}

// heavier than earth = A MOTHER: a warm glow cradling a small flame.
function ypMother(c, t, prog) {
  const p = clamp(prog, 0, 1);
  const a = Math.sin(p * Math.PI);
  if (a <= 0.02) return;
  const x = 980, y = 556;
  glowAdd(c, x, y + 10, 160 * a, 'rgba(255,196,110,0.3)', 0.7 * a);
  c.save();
  c.globalAlpha = a * 0.85;
  c.strokeStyle = 'rgba(255,214,150,0.85)'; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y + 26, 74, Math.PI * 0.12, Math.PI * 0.88); c.stroke();   // cradling arm below
  c.beginPath(); c.arc(x, y - 16, 60, Math.PI * 1.16, Math.PI * 1.84); c.stroke();   // arm above
  c.restore();
  flame(c, x, y + 40, 34 * (0.7 + 0.3 * a), t, 91, a);
  glowAdd(c, x, y + 26, 42, 'rgba(255,236,180,0.6)', a);
}

// the greatest wonder = a line of tiny lamp-lit figures walking into the dark
// one by one, while a few on the left stand and watch.
function ypProcession(c, t, prog) {
  const p = clamp(prog, 0, 1);
  const a = clamp(p * 3, 0, 1) * (1 - clamp((p - 0.92) / 0.08, 0, 1));
  if (a <= 0.02) return;
  const baseY = 672, xL = 440, endX = 1150, span = endX - xL + 130;
  // a soft feathered pool of darkness they file into (no hard edge)
  c.save();
  const dg = c.createRadialGradient(endX, baseY - 26, 12, endX, baseY - 26, 250);
  dg.addColorStop(0, 'rgba(3,3,9,' + (0.55 * a) + ')'); dg.addColorStop(1, 'rgba(3,3,9,0)');
  c.fillStyle = dg;
  c.beginPath(); c.ellipse(endX, baseY - 26, 250, 155, 0, 0, TAU); c.fill();
  c.restore();
  const fig = (px, py, fa) => {
    if (fa <= 0.02) return;
    glowAdd(c, px + 7, py - 34, 20, 'rgba(255,198,92,0.85)', fa);
    c.save(); c.globalAlpha = fa;
    c.fillStyle = 'rgba(16,12,20,0.94)';
    c.beginPath(); c.ellipse(px, py - 16, 8.5, 24, 0, 0, TAU); c.fill();   // body
    c.beginPath(); c.arc(px, py - 45, 7.5, 0, TAU); c.fill();              // head
    c.fillStyle = '#ffda7a';
    c.beginPath(); c.arc(px + 9, py - 30, 3.6, 0, TAU); c.fill();          // the lamp
    c.restore();
  };
  // two who stay behind and watch, still and lit
  fig(xL - 72, baseY, a);
  fig(xL - 20, baseY + 6, a);
  // the file of the living, walking right and guttering out into the dark one by one
  const n = 6;
  for (let i = 0; i < n; i++) {
    const px = xL + ((i * (span / n) + t * 26) % span);
    const fin = clamp((px - xL) / 70, 0, 1);          // fade in at the near edge
    const fout = clamp((endX - px) / 135, 0, 1);      // gutter out at the dark
    const bob = Math.abs(Math.sin(t * 4 + i * 1.7)) * 4;
    fig(px, baseY - bob, a * fin * fout);
  }
}

// ════════════════════════════ SCENES ════════════════════════════

// chase — the deer bolts off with the fire-sticks; the brothers give chase
function scChase(c0, tl, dur, t) {
  const runK = easeIO(clamp(tl / 12, 0, 1));
  const fade = ramp(tl, 10.5, 14.5, easeIO);      // deer melts into shadow
  const cam = { x: -20 + sfbm1(tl * 0.09, 14) * 4, y: sfbm1(tl * 0.1, 15) * 3, z: 1.08 };
  SETS.forest(c0, cam, t, {
    timeOfDay: 'day', seed: 14, rays: 0.26,
    actors: (c) => {
      const gy = 1010;
      // the deer, fleeing left
      const dx = lerp(1200, 300, runK), ds = 0.9;
      c.save(); c.globalAlpha = 1 - fade;
      drawDeer(c, { x: dx, y: gy - 4, s: ds, facing: -1, t, seed: 3, gait: 'run', coat: '#b5793c' });
      // the stolen fire-sticks caught in the antlers + the sacred flame
      const hxF = dx - 150 * ds, hyF = gy - 250 * ds;
      c.strokeStyle = '#6e4a26'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(hxF - 30, hyF - 4); c.lineTo(hxF + 26, hyF - 22); c.stroke();
      c.beginPath(); c.moveTo(hxF - 26, hyF - 22); c.lineTo(hxF + 24, hyF - 2); c.stroke();
      flame(c, hxF, hyF - 14, 19, t, 33, 0.9);
      glowAdd(c, hxF, hyF - 16, 58, 'rgba(255,150,50,0.4)', 0.7);
      c.restore();
      // three brothers chasing (varied build/skin/phase — no twinning)
      const runners = [
        { who: 'arjuna', x: 1340, s: 0.66, ph: 0.0, seed: 71 },
        { who: 'bhima', x: 1540, s: 0.74, ph: 1.2, seed: 72 },
        { who: 'yudhishthira', x: 1720, s: 0.68, ph: 2.3, seed: 73 },
      ];
      const shift = -runK * 240;
      for (const r of runners) {
        const wp = walkPose(t * 7.6 + r.ph, 0.98);
        drawFigure(c, {
          x: r.x + shift, y: gy, s: r.s, facing: -1, style: sty(r.who),
          pose: Object.assign({}, wp, {
            lean: 0.24, headTurn: 0.2,
            armF: Object.assign({}, wp.armF, { hand: 'fist' }),
            armB: Object.assign({}, wp.armB, { hand: 'fist' }),
            face: { brow: 0.3, lipsPart: 0.3, eyeOpen: 1 },
          }),
          t, seed: r.seed,
        });
      }
    },
  });
  wash(c0, '#2a2438', 0.06, 'multiply');
}

// fall — one by one, the four brothers drink and fall
function scFall(c0, tl, dur, t) {
  const dusk = ramp(tl, 8, 16, easeIO);
  const cam = ypCam(tl, 21, 1.05, 96, 20);
  SETS.riverBank(c0, cam, t, {
    timeOfDay: 'day', seed: 12, fg: false,
    actors: (c) => {
      const craneK = ramp(tl, 3, 6, easeIO);
      if (craneK > 0.02) { c.save(); c.globalAlpha = craneK; ypCrane(c, YP.crane[0], YP.crane[1], t, 1.15, 0); c.restore(); }
      const starts = [1.2, 4.6, 7.6, 10.6];       // Nakula, Sahadeva, Arjuna, Bhīma
      YP.fallen.forEach((b, i) => {
        const k = ramp(tl, starts[i], starts[i] + 1.4, easeOut);
        if (k <= 0.01) return;
        ypReclined(c, sty(b.who), {
          px: b.px, py: b.py - (1 - k) * 26, rot: b.rot, s: b.s, dir: b.dir,
          t, seed: b.seed, lifeK: 0, alpha: clamp(k * 1.25, 0, 1),
        });
        const rip = pulse(tl, starts[i] - 0.1, starts[i] + 0.3, starts[i] + 0.7, starts[i] + 1.7);
        if (rip > 0.01) {
          c.save();
          c.strokeStyle = 'rgba(200,220,244,0.45)'; c.lineWidth = 2.6;
          const rr = 20 + rip * 96;
          c.globalAlpha = (1 - rip) * 0.6;
          c.beginPath(); c.ellipse(b.px + 24 * b.dir, b.py - 24, rr, rr * 0.3, 0, 0, TAU); c.stroke();
          c.restore();
        }
      });
    },
  });
  wash(c0, '#241a30', 0.16 * dusk, 'multiply');
}

// voice — Yudhiṣṭhira arrives, grieves, and answers the shimmer over the water
function scVoice(c0, tl, dur, t) {
  const enter = ramp(tl, 0.4, 3.6, easeIO);
  const grief = pulse(tl, 3.6, 5.2, 7.6, 9.2);
  const voiceK = ramp(tl, 6.5, 9.8, easeIO);
  const bow = ramp(tl, 11.0, 13.6, easeIO);
  const cam = ypCam(tl, 22, 1.05, 96, 26);
  SETS.riverBank(c0, cam, t, {
    timeOfDay: 'dusk', seed: 12, fg: false,
    actors: (c) => {
      ypDrawFallen(c, t);
      ypCrane(c, YP.crane[0], YP.crane[1], t, 1.15, 0);
      ypVoice(c, YP.voiceX, YP.voiceY, t, 0.4 + 0.6 * voiceK);
      const yx = lerp(-150, YP.yudh[0], enter);
      const walking = enter > 0.02 && enter < 0.98;
      const wp = walking ? walkPose(t * 5.6, 0.62) : {};
      drawFigure(c, {
        x: yx, y: 990, s: 0.76, facing: 1, style: sty('yudhishthira'),
        pose: Object.assign({}, wp, {
          lean: 0.04,
          bend: 0.16 * grief + 0.1 * bow,
          headTurn: 0.34,
          headNod: 0.26 * grief + 0.28 * bow,
          armF: grief > 0.08 ? { sh: 0.66 * grief, el: 1.08 * grief, wr: 0.2, hand: 'open' } : (wp.armF || { sh: 0.14, el: 0.2 }),
          face: { brow: 0.2 + 0.3 * grief, lowered: 0.35 * grief + 0.35 * bow, weep: 0.4 * grief, smile: -0.08 * grief },
        }),
        t, seed: 51,
      });
    },
  });
  wash(c0, '#161230', 0.12 + 0.06 * voiceK, 'multiply');
}

// riddles — the questions, each answer a brief luminous emblem
function scRiddles(c0, tl, dur, t) {
  const cam = ypCam(tl, 23, 1.05, 96, 26);
  SETS.riverBank(c0, cam, t, {
    timeOfDay: 'dusk', seed: 12, fg: false,
    actors: (c) => {
      ypDrawFallen(c, t);
      ypCrane(c, YP.crane[0], YP.crane[1], t, 1.15, 0);
      drawFigure(c, {
        x: YP.yudh[0], y: 990, s: 0.76, facing: 1, style: sty('yudhishthira'),
        pose: {
          headTurn: 0.34, lean: 0.03,
          armF: { sh: 0.32, el: 0.5, wr: 0.1, hand: 'open' }, armB: { sh: -0.06, el: 0.16 },
          face: { brow: 0.18, eyeOpen: 1, lowered: 0.08 },
        }, t, seed: 51,
      });
      ypVoice(c, YP.voiceX, YP.voiceY, t, 0.5);
      // emblems timed to narration (narrLocal ≈ 0.8)
      if (tl >= 1.2 && tl <= 4.6) ypThought(c, t, norm(tl, 1.4, 4.2));
      if (tl >= 4.4 && tl <= 8.3) ypMother(c, t, norm(tl, 4.7, 8.0));
      if (tl >= 8.6) ypProcession(c, t, norm(tl, 8.9, 14.2));
    },
  });
  wash(c0, '#161232', 0.16, 'multiply');
}

// reveal — the crane is Dharma; the four brothers are raised
function scReveal(c0, tl, dur, t) {
  const blaze = pulse(tl, 1.8, 2.6, 3.0, 4.4);
  const dharmaK = ramp(tl, 2.8, 4.8, easeIO);
  const gold = ramp(tl, 3.0, 8.5, easeIO);
  const riseStarts = [8.8, 9.7, 10.6, 11.5];
  const cam = ypCam(tl, 24, 1.05, 96, 26);
  SETS.riverBank(c0, cam, t, {
    timeOfDay: 'dusk', seed: 12, fg: false,
    actors: (c) => {
      YP.fallen.forEach((b, i) => {
        const rk = ramp(tl, riseStarts[i], riseStarts[i] + 1.7, easeIO);
        if (rk < 0.96) ypReclined(c, sty(b.who), { px: b.px, py: b.py, rot: b.rot, s: b.s, dir: b.dir, t, seed: b.seed, lifeK: rk * 0.4, alpha: 1 - rk * 0.9 });
        if (rk > 0.05) {
          const sp = YP.stand[b.who];
          c.save(); c.globalAlpha = clamp(rk * 1.15, 0, 1);
          drawFigure(c, {
            x: sp[0], y: sp[1], s: b.s + 0.06, facing: b.dir > 0 ? 1 : -1, style: sty(b.who),
            pose: { headTurn: 0.34, headNod: 0.06, lean: 0.02, armF: { sh: 0.2, el: 0.3 }, armB: { sh: -0.08, el: 0.16 }, face: { eyeOpen: rk, lowered: 1 - rk, smile: 0.1 * rk } },
            t, seed: b.seed,
          });
          c.restore();
          const bloom = pulse(tl, riseStarts[i] - 0.1, riseStarts[i] + 0.5, riseStarts[i] + 1.1, riseStarts[i] + 2.0);
          if (bloom > 0.01) glowAdd(c, sp[0], sp[1] - 150 * b.s, 150 * bloom, 'rgba(255,226,150,0.62)', bloom);
        }
      });
      if (dharmaK < 0.55) ypCrane(c, YP.crane[0], YP.crane[1], t, 1.15, blaze);
      const flareK = Math.max(blaze, dharmaK * 0.5);
      if (flareK > 0.02) glowAdd(c, YP.crane[0] - 60, 720, 260 * flareK, 'rgba(255,244,210,0.8)', flareK);
      if (dharmaK > 0.05) {
        c.save(); c.globalAlpha = clamp(dharmaK * 1.2, 0, 1);
        Person.of('dharma').draw(c, { x: 1330, y: 984, s: 0.82, facing: -1, pose: 'bless', t, seed: 41 });
        c.restore();
      }
      // Yudhiṣṭhira, reverent
      drawFigure(c, {
        x: YP.yudh[0], y: 990, s: 0.76, facing: 1, style: sty('yudhishthira'),
        pose: {
          headTurn: 0.4, headNod: 0.08 + 0.12 * gold, bend: 0.05 * gold,
          armF: { sh: 0.9 * gold + 0.15, el: 1.4 * gold + 0.2, hand: gold > 0.4 ? 'namaste' : 'open' },
          armB: { sh: 0.8 * gold, el: 1.4 * gold + 0.15, hand: gold > 0.4 ? 'namaste' : 'relaxed' },
          face: { smile: 0.15 * gold, lowered: 0.3 * gold, brow: 0.1 },
        }, t, seed: 51,
      });
    },
  });
  wash(c0, '#141230', 0.14 * (1 - gold * 0.5), 'multiply');
  wash(c0, '#ffca7a', 0.06 * gold, 'soft-light');
}

window.SCENE_FNS = { chase: scChase, fall: scFall, voice: scVoice, riddles: scRiddles, reveal: scReveal };

// storyboards (reach, wonder) + folios live in story.json (the injected STORY
// global); this file supplies the bespoke scenes and boots the film.
if (typeof window !== 'undefined') {
  window.__film = buildFilmFromStory(STORY, TIMELINE);
}
