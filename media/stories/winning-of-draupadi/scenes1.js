// ── scenes1.js ── the svayaṃvara hall set + scenes: fire, hall, kings.
'use strict';

const FLOOR = 920;             // main hall floor line
const YANTRA_X = 1210;         // fish-pole position
const BOW_X = 870;             // bow pedestal position

// ── the great hall of Kāmpilya ──
// o: {actors(ctx), nearCrowd, brahmins, draupadiOnDais, draupadiFace, drupada,
//     yantraOpts, showBow, bowState:{flex,strung}, raysAlpha}
function hallSet(ctx, cam, t, o) {
  o = o || {};
  // ambient ground wash
  vgrad(ctx, 0, 0, W, H, [[0, '#3a2410'], [0.45, '#6e4520'], [1, '#2e1a0a']]);

  // L0: far wall with arches + high windows
  camLayer(ctx, cam, 0.15, (c) => {
    const wall = cached('hall-wall', W, H, (g) => {
      vgrad(g, 0, 0, W, H, [[0, '#8a5c30'], [0.5, '#a87c46'], [1, '#7c5228']]);
      // high clerestory windows
      for (let i = 0; i < 6; i++) {
        const wx = 210 + i * 300;
        g.fillStyle = '#f7d98c';
        g.beginPath(); archPath(g, wx, 60, 110, 150); g.fill();
        g.fillStyle = 'rgba(140,90,40,0.55)';
        g.fillRect(wx - 55, 130, 110, 6);
        g.fillRect(wx - 3, 74, 6, 136);
      }
      // arcade of cusped arches
      for (let i = 0; i < 8; i++) {
        const ax = 120 + i * 240;
        g.fillStyle = 'rgba(58,32,10,0.85)';
        g.beginPath(); archPath(g, ax, 330, 170, 300); g.fill();
        g.fillStyle = 'rgba(255,220,150,0.10)';
        g.beginPath(); archPath(g, ax, 336, 158, 288); g.fill();
        // arch trim
        g.strokeStyle = rgba('#e8b64c', 0.5); g.lineWidth = 3;
        g.beginPath(); archPath(g, ax, 330, 170, 300); g.stroke();
      }
      // frieze band
      g.fillStyle = 'rgba(90,50,16,0.9)'; g.fillRect(0, 640, W, 26);
      for (let x = 20; x < W; x += 46) {
        g.fillStyle = '#e8b64c';
        g.beginPath(); g.arc(x, 653, 6, 0, TAU); g.fill();
      }
      vgrad(g, 0, 660, W, 200, [[0, 'rgba(40,20,6,0.35)'], [1, 'rgba(40,20,6,0)']]);
    });
    c.drawImage(wall, 0, 0);
  });

  // god rays from upper-left windows
  camLayer(ctx, cam, 0.3, (c) => {
    godRays(c, 260, 60, 0.92, 0.34, 1500, '#ffd98a', (o.raysAlpha === undefined ? 0.16 : o.raysAlpha), t, 4);
    godRays(c, 900, 40, 1.05, 0.28, 1400, '#ffd98a', (o.raysAlpha === undefined ? 0.12 : o.raysAlpha) * 0.8, t, 9);
    motes(c, 200, 200, 1100, 640, t, 11, 26, '#ffe9b0');
  });

  // L1: banners + high torana
  camLayer(ctx, cam, 0.38, (c) => {
    const cols = ['#8c1f28', '#1f4d8c', '#8c6a1f', '#3f6e2e', '#5c2e6e'];
    for (let i = 0; i < 5; i++) drawBanner(c, 260 + i * 360, 96, 96, 210, cols[i % cols.length], t, i * 3);
    drawTorana(c, -40, W + 40, 250, t, 5);
  });

  // L2: dais, canopy, Drupada, far crowd tier
  camLayer(ctx, cam, 0.62, (c) => {
    // dais platform right
    const dx = 1560, dw = 560, dtop = 806;
    c.fillStyle = '#7c3a14';
    c.fillRect(dx - dw / 2, dtop, dw, 130);
    vgrad(c, dx - dw / 2, dtop, dw, 130, [[0, 'rgba(255,220,150,0.22)'], [0.2, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
    // steps
    c.fillStyle = '#6e3210'; c.fillRect(dx - dw / 2 - 70, dtop + 60, 90, 70);
    c.fillStyle = '#82401a'; c.fillRect(dx - dw / 2 - 40, dtop + 30, 60, 100);
    // carpet on dais
    c.fillStyle = '#a11e2c'; c.fillRect(dx - dw / 2 + 20, dtop + 2, dw - 40, 16);
    goldLine(c, dx - dw / 2 + 20, dtop + 18, dx + dw / 2 - 20, dtop + 18, 3);
    // canopy
    c.fillStyle = '#8c1f28';
    c.beginPath();
    c.moveTo(dx - dw / 2 - 30, 330);
    c.quadraticCurveTo(dx, 260, dx + dw / 2 + 30, 330);
    c.lineTo(dx + dw / 2 + 10, 384); c.quadraticCurveTo(dx, 320, dx - dw / 2 - 10, 384);
    c.closePath(); c.fill();
    goldLine(c, dx - dw / 2 - 24, 344, dx + dw / 2 + 24, 344, 4);
    // fringe
    c.strokeStyle = '#e8b64c'; c.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const fx = dx - dw / 2 + 10 + i * (dw - 20) / 17;
      c.beginPath(); c.moveTo(fx, 352 + Math.sin(i) * 2); c.lineTo(fx, 380 + sfbm1(t + i, 3) * 5); c.stroke();
    }
    // canopy poles
    c.fillStyle = '#5c3a1a';
    c.fillRect(dx - dw / 2 - 16, 340, 12, dtop - 330);
    c.fillRect(dx + dw / 2 + 4, 340, 12, dtop - 330);
    // Drupada enthroned at back of dais
    if (o.drupada !== false) {
      // throne back
      c.fillStyle = '#4a2410';
      c.beginPath(); c.moveTo(dx + 150, dtop - 240); c.quadraticCurveTo(dx + 190, dtop - 300, dx + 235, dtop - 238);
      c.lineTo(dx + 240, dtop + 4); c.lineTo(dx + 148, dtop + 4); c.closePath(); c.fill();
      goldLine(c, dx + 150, dtop - 236, dx + 232, dtop - 236, 3);
      drawSeated(c, {
        x: dx + 192, y: dtop + 2, s: 0.62, facing: -1, style: CAST.drupada, t, seed: 41,
        face: { turn: 0.35, smile: o.drupadaSmile || 0, gaze: { x: 0.4, y: 0.15 } },
      });
    }
    // Draupadī standing on dais with the garland (unless she's acting on the floor)
    if (o.draupadiOnDais !== false) {
      drawFigure(c, {
        x: dx - 130, y: dtop + 4, s: 0.60, facing: -1,
        style: CAST.draupadi,
        pose: {
          headTurn: 0.3, armF: { sh: 0.55, el: 1.35, hand: 'hold' }, armB: { sh: 0.42, el: 1.5, hand: 'hold' },
          face: Object.assign({ smile: 0.05, lowered: 0.4 }, o.draupadiFace),
        },
        t, seed: 8,
      });
      // garland held between hands
      garlandStrand(c, dx - 130 - 48, dtop - 148, dx - 130 - 6, dtop - 156, 40, t, 77, 0.6);
      // Dhṛṣṭadyumna beside her
      drawFigure(c, {
        x: dx + 40, y: dtop + 4, s: 0.62, facing: -1,
        style: CAST.dhrishtadyumna,
        pose: { headTurn: 0.3, armF: { sh: 0.2, el: 0.4 }, face: { smile: 0 } },
        t, seed: 9,
      });
    }
    // far crowd tier (left)
    const far = crowdStrip('crowd-far', 7, kingStyle, 0.5);
    c.drawImage(far, 30, 700 - far.height);
    // platform edge under them
    c.fillStyle = '#5c3014'; c.fillRect(0, 696, 900, 18);
    goldLine(c, 0, 700, 900, 700, 2);
  });

  // L3: near crowd tier + brahmin row
  camLayer(ctx, cam, 0.85, (c) => {
    if (o.nearCrowd !== false) {
      const near = crowdStrip('crowd-near', 6, i => kingStyle(i + 7), 0.72);
      c.drawImage(near, -30, 866 - near.height);
      c.fillStyle = '#3f2008'; c.fillRect(-40, 860, 880, 26);
      goldLine(c, -40, 864, 840, 864, 2.4);
    }
    if (o.brahmins) {
      const br = crowdStrip('crowd-brahmin', 5, brahminStyle, 0.62);
      c.drawImage(br, -20, 1074 - br.height);
    }
  });

  // L4: subject plane — floor furniture + scene actors
  camLayer(ctx, cam, 1.0, (c) => {
    // carpet
    const cg = c.createLinearGradient(0, FLOOR - 40, 0, H);
    cg.addColorStop(0, '#8f2230'); cg.addColorStop(1, '#5c1420');
    c.fillStyle = cg;
    c.beginPath();
    c.moveTo(560, FLOOR - 30); c.lineTo(1520, FLOOR - 30);
    c.lineTo(1780, H + 40); c.lineTo(300, H + 40);
    c.closePath(); c.fill();
    c.strokeStyle = '#e8b64c'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(560, FLOOR - 30); c.lineTo(300, H + 40); c.stroke();
    c.beginPath(); c.moveTo(1520, FLOOR - 30); c.lineTo(1780, H + 40); c.stroke();
    // lamp stands
    drawLampStand(c, 430, FLOOR + 60, 1.0, t, 3);
    drawLampStand(c, 1680, FLOOR + 40, 0.95, t, 8);
    // the yantra pole + basin
    if (o.yantra !== false) {
      drawYantra(c, YANTRA_X, FLOOR - 130, 1.06, t, o.yantraOpts);
      drawBasin(c, YANTRA_X, FLOOR + 6, 0.9, t, o.reflFn);
    }
    // bow pedestal
    if (o.showBow !== false) {
      c.fillStyle = '#6e3a12';
      c.fillRect(BOW_X - 120, FLOOR - 64, 240, 26);
      c.fillStyle = '#82461a';
      c.fillRect(BOW_X - 100, FLOOR - 40, 200, 44);
      goldLine(c, BOW_X - 120, FLOOR - 62, BOW_X + 120, FLOOR - 62, 3);
      const bs = o.bowState || {};
      if (!bs.held) {
        ctxSaveBow(c, t, bs);
      }
    }
    if (o.actors) o.actors(c);
  });

  // L5: foreground pillars + fg garland
  camLayer(ctx, cam, 1.3, (c) => {
    drawPillar(c, 110, H + 80, 120, 1300, '#7c4a22');
    drawPillar(c, 1810, H + 80, 120, 1300, '#7c4a22');
    garlandStrand(c, 60, 130, 420, 96, 70, t, 21, 1.35);
    garlandStrand(c, 1500, 96, 1860, 130, 70, t, 22, 1.35);
  });
}
function ctxSaveBow(c, t, bs) {
  // bow lying across the pedestal, tips curving skyward, slight gleam
  c.save();
  c.translate(BOW_X, FLOOR - 92);
  c.rotate(-1.42);
  drawGreatBow(c, 0, 0, 0.86, bs.flex || 0, !!bs.strung, null);
  c.restore();
  glowAdd(c, BOW_X, FLOOR - 110, 130, 'rgba(255,190,90,0.16)', 0.5 + 0.2 * Math.sin(t * 1.2));
}

// ─────────────── SCENE: fire (birth of Draupadī) ───────────────
function scFire(ctx, tl, dur, t) {
  const cam = { x: sfbm1(tl * 0.1, 51) * 6, y: sfbm1(tl * 0.09, 52) * 4, z: 1 + ramp(tl, 0, dur) * 0.10 };
  // night sky
  vgrad(ctx, 0, 0, W, H, [[0, '#0a0f26'], [0.55, '#1c1430'], [1, '#3a1c14']]);
  // stars
  camLayer(ctx, cam, 0.06, (c) => {
    for (let i = 0; i < 90; i++) {
      const sx = hash1(i * 3.1) * W, sy = hash1(i * 7.7) * H * 0.55;
      const tw = 0.3 + 0.7 * noise1(t * 1.2 + i * 5, 3);
      c.fillStyle = `rgba(255,240,220,${0.5 * tw})`;
      c.fillRect(sx, sy, 1.6 + hash1(i) * 1.2, 1.6 + hash1(i) * 1.2);
    }
    // crescent moon
    c.save(); c.translate(1650, 150); c.rotate(-0.35);
    c.fillStyle = '#f2e3bc';
    c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.fill();
    c.fillStyle = '#141530f0';
    c.beginPath(); c.arc(-18, -8, 40, 0, TAU); c.fill();
    c.restore();
  });
  // palace skyline
  camLayer(ctx, cam, 0.18, (c) => {
    drawSkyline(c, 640, '#171028', 42);
    drawSkyline(c, 700, '#241636', 87);
  });
  // courtyard ground
  camLayer(ctx, cam, 0.7, (c) => {
    vgrad(c, -100, 700, W + 200, H - 700 + 100, [[0, '#3f2412'], [1, '#1c0e06']]);
  });

  const fireX = 960, fireY = 880;
  const ignite = ramp(tl, 2.0, 5.0);           // fire grows
  const rise = ramp(tl, 6.5, 11.5, easeIO);    // Draupadī rises
  const reveal = ramp(tl, 10.5, 13.5);         // full reveal glow

  camLayer(ctx, cam, 1.0, (c) => {
    // brick fire-altar (yajña-kuṇḍa)
    c.save();
    const aw = 300, ah = 120;
    const bg = c.createLinearGradient(0, fireY - ah, 0, fireY + 30);
    bg.addColorStop(0, '#8a4a26'); bg.addColorStop(1, '#4a2410');
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(fireX - aw / 2, fireY - ah * 0.4);
    c.lineTo(fireX - aw / 2 + 34, fireY - ah);
    c.lineTo(fireX + aw / 2 - 34, fireY - ah);
    c.lineTo(fireX + aw / 2, fireY - ah * 0.4);
    c.lineTo(fireX + aw / 2 - 20, fireY + 26);
    c.lineTo(fireX - aw / 2 + 20, fireY + 26);
    c.closePath(); c.fill();
    // brick lines
    c.strokeStyle = 'rgba(30,12,4,0.6)'; c.lineWidth = 2.4;
    for (let r = 0; r < 3; r++) {
      const yy = fireY - ah + 18 + r * 34;
      c.beginPath(); c.moveTo(fireX - aw / 2 + 26 - r * 5, yy); c.lineTo(fireX + aw / 2 - 26 + r * 5, yy); c.stroke();
      for (let b = 0; b < 6 + r; b++) {
        const bx = lerp(fireX - aw / 2 + 30, fireX + aw / 2 - 30, b / (5 + r)) + (r % 2 ? 12 : 0);
        c.beginPath(); c.moveTo(bx, yy - 34); c.lineTo(bx, yy); c.stroke();
      }
    }
    c.restore();

    // Draupadī rising from the flames
    if (rise > 0.01) {
      const dy = lerp(fireY + 150, fireY - 8, rise);
      c.save();
      // emerge mask: nothing of her shows below the altar rim
      const clipBottom = fireY - ah * 0.4 + 12;
      c.beginPath(); c.rect(fireX - 420, clipBottom - 1300, 840, 1300); c.clip();
      // aura
      glowAdd(c, fireX, dy - 240, 260 + reveal * 120, 'rgba(255,170,70,0.55)', 0.8);
      drawFigure(c, {
        x: fireX, y: dy, s: 0.86, facing: -1,
        style: CAST.draupadi,
        pose: {
          headTurn: 0.42, headNod: lerp(0.16, -0.03, reveal),
          armF: { sh: lerp(0.15, 0.5, reveal), el: lerp(0.2, 0.55, reveal), hand: 'open', wr: -0.4 },
          armB: { sh: lerp(0.1, 0.42, reveal), el: lerp(0.2, 0.5, reveal), hand: 'open', wr: 0.4 },
          face: { smile: 0.08, lowered: lerp(0.9, 0.15, reveal), brow: 0.1 },
        },
        t, seed: 4, shadow: false,
      });
      c.restore();
    }

    // the fire itself (in front of her skirt)
    c.save();
    c.translate(fireX, fireY - ah * 0.4 + 6);
    c.scale(1.55, 1); // broad ceremonial blaze
    flame(c, 0, 0, 118 * (0.25 + ignite * 0.75 + rise * 0.15), t, 17, 0.4 + ignite * 0.6);
    c.restore();
    if (rise > 0.05) glowAdd(c, fireX, fireY - 300, 320 + rise * 160, 'rgba(255,180,80,0.35)', rise);
    embers(c, fireX, fireY - 140, 150 + rise * 90, t, 23, 26, '#ffca6a');
    smoke(c, fireX + 30, fireY - 260, 120, t, 31, 0.5);

    // King Drupada & Dhṛṣṭadyumna watching (left), priests chanting (right)
    drawFigure(c, {
      x: 350, y: 1010, s: 0.92, facing: 1, style: CAST.drupada,
      pose: {
        headTurn: 0.22, headNod: lerp(0.05, -0.08, rise),
        armF: rise > 0.4 ? { sh: 0.9, el: 0.5, hand: 'open' } : { sh: 0.2, el: 0.3 },
        armB: { sh: -0.1, el: 0.15 },
        face: { brow: rise * 0.7, lipsPart: rise * 0.5, smile: 0.05 },
      },
      t, seed: 3,
    });
    drawFigure(c, {
      x: 215, y: 1020, s: 0.9, facing: 1, style: CAST.dhrishtadyumna,
      pose: { headTurn: 0.3, face: { brow: rise * 0.5, smile: 0.1 } }, t, seed: 5,
    });
    // priests: one chanting with both arms high, one bowed pouring ghee
    drawFigure(c, {
      x: 1560, y: 1006, s: 0.88, facing: -1, style: CAST.priest,
      pose: {
        headTurn: 0.25, headNod: -0.1,
        armF: { sh: 1.5 + Math.sin(t * 1.1) * 0.07, el: 0.5, hand: 'open' },
        armB: { sh: 1.35 + Math.cos(t * 1.3) * 0.07, el: 0.55, hand: 'open' },
        face: { lowered: 0.2, lipsPart: 0.5 + 0.3 * Math.sin(t * 2.4) },
      },
      t, seed: 11,
    });
    drawFigure(c, {
      x: 1740, y: 1022, s: 0.88, facing: -1, style: CAST.priest,
      pose: {
        headTurn: 0.28, headNod: 0.3, lean: 0.14,
        armF: { sh: 0.85, el: 0.65, hand: 'hold' },
        armB: { sh: 0.3, el: 0.55, hand: 'hold' },
        face: { lowered: 0.7 },
      },
      t, seed: 12,
    });
  });

  // title card (first seconds)
  const titleA = pulse(tl, 0.4, 1.6, 4.4, 6.0);
  if (titleA > 0.01) {
    ctx.save();
    ctx.globalAlpha = titleA;
    ctx.fillStyle = '#f2dfae';
    ctx.font = '600 84px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,180,60,0.55)'; ctx.shadowBlur = 30;
    ctx.fillText('The Winning of Draupadī', W / 2, 300);
    ctx.font = 'italic 30px Georgia, serif';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#cfa96a';
    ctx.fillText('Mahābhārata · Ādi Parva', W / 2, 360);
    ctx.restore();
  }
  wash(ctx, '#ff9a3c', 0.10 * (ignite + rise), 'soft-light');
}

// ─────────────── SCENE: hall (establishing) ───────────────
function scHall(ctx, tl, dur, t) {
  const push = ramp(tl, 1.0, dur - 1.5, easeIO);
  const cam = {
    x: lerp(-30, 130, push) + sfbm1(tl * 0.11, 61) * 5,
    y: lerp(10, -40, push) + sfbm1(tl * 0.1, 62) * 4,
    z: lerp(1.0, 1.22, push),
  };
  hallSet(ctx, cam, t, {
    brahmins: true,
    draupadiFace: { lowered: 0.5, smile: 0.06 },
    actors: (c) => {
      // a herald gesturing toward the yantra
      drawFigure(c, {
        x: 640, y: FLOOR + 74, s: 0.7, facing: 1, style: CAST.dhrishtadyumna,
        pose: {
          headTurn: 0.3, lean: 0.03,
          armF: { sh: 1.35 + Math.sin(t * 0.8) * 0.05, el: 0.15, hand: 'open' },
          armB: { sh: 0.25, el: 0.4 },
          face: { smile: 0.1, lipsPart: 0.35 },
        },
        t, seed: 19,
      });
    },
  });
  wash(ctx, '#ffb45c', 0.07, 'soft-light');
}

// ─────────────── SCENE: kings fail; Karṇa turned away ───────────────
function scKings(ctx, tl, dur, t) {
  // beats: king strains 0–4.2; falls; Karṇa rises 4.6–8; Draupadī refuses 8–11.5; Karṇa turns away
  const cam = {
    x: 90 + sfbm1(tl * 0.13, 71) * 6 + track([[0, 0], [4.6, 0], [6.4, 210], [dur, 230]], tl),
    y: -10 + sfbm1(tl * 0.12, 72) * 4,
    z: track([[0, 1.28], [4.4, 1.28], [6.4, 1.2], [dur, 1.24]], tl),
  };
  const strain = pulse(tl, 0.3, 2.2, 3.0, 4.0);       // effort
  const collapse = ramp(tl, 3.0, 4.0, easeIn);        // stagger back
  const karnaIn = ramp(tl, 4.6, 7.4, easeIO);         // walks in
  const refuse = ramp(tl, 7.8, 9.2, easeIO);          // Draupadī's palm
  const turn = ramp(tl, 10.0, 12.0, easeIO);          // Karṇa turns away

  hallSet(ctx, cam, t, {
    brahmins: false,
    draupadiOnDais: false,
    yantraOpts: { speed: 1.9 },
    bowState: {},
    actors: (c) => {
      // struggling king heaving at the bow on its pedestal
      const kx = BOW_X - 165 + collapse * -130;
      drawFigure(c, {
        x: kx, y: FLOOR + 66, s: 0.74, facing: 1, style: kingStyle(2),
        pose: {
          lean: 0.22 - strain * 0.34 - collapse * 0.18,   // heave: bends in, then hauls back
          headTurn: 0.3, headNod: 0.24 - strain * 0.1,
          armF: { sh: 0.72 - strain * 0.12, el: 0.55 + strain * 0.2, hand: 'fist' },
          armB: { sh: 0.55 - strain * 0.1, el: 0.6 + strain * 0.15, hand: 'fist' },
          legF: { hip: 0.28 * strain - 0.12 * collapse, knee: 0.3 * strain },
          legB: { hip: -0.3 * strain + 0.34 * collapse, knee: 0.12 },
          face: { brow: -0.8 * strain + 0.5 * collapse, lipsPart: 0.6 * strain, smile: -0.4 },
        },
        t, seed: 33,
      });
      // effort tremor on the bow while gripped
      if (tl < 3.4) {
        c.save();
        c.translate(BOW_X + snoise1(t * 22, 5) * 2.6 * strain, FLOOR - 92 + snoise1(t * 19, 7) * 2 * strain);
        c.rotate(-1.42 + strain * 0.05);
        drawGreatBow(c, 0, 0, 0.86, strain * 0.08, false, null);
        c.restore();
      } else {
        ctxSaveBow(c, t, {});
      }
      // dejected king slumped at left
      drawSeated(c, {
        x: 320, y: FLOOR + 88, s: 0.72, facing: 1, style: kingStyle(4), t, seed: 35,
        face: { turn: 0.3, smile: -0.4, lowered: 0.8, brow: 0.4 },
      });
      // Karṇa strides in from the right
      if (karnaIn > 0.01 && turn < 1) {
        const wx = lerp(1780, 1090, karnaIn);
        const ph = t * 7.2;
        const wp = walkPose(ph, karnaIn < 0.97 ? 0.85 : 0.06);
        const face = {
          brow: -0.25 + refuse * 0.65, smile: -0.15 - refuse * 0.3,
          lowered: turn * 0.8, lipsPart: refuse * 0.3,
        };
        drawFigure(c, {
          x: wx + turn * 130, y: FLOOR + 70, s: 0.78, facing: turn > 0.5 ? 1 : -1,
          style: CAST.karna,
          pose: Object.assign({}, wp, {
            headTurn: 0.32, headNod: turn * 0.22,
            lean: -turn * 0.03,
            armF: turn > 0.5 ? { sh: 0.1, el: 0.35, hand: 'fist' } : wp.armF,
            face,
          }),
          t, seed: 37,
        });
      }
      // Draupadī on the floor dais edge, refusing
      const dxp = 1560;
      drawFigure(c, {
        x: dxp, y: FLOOR + 40, s: 0.72, facing: -1, style: CAST.draupadi,
        pose: {
          headTurn: 0.34,
          headNod: -0.02,
          armF: refuse > 0.02
            ? { sh: lerp(0.2, 1.05, refuse), el: lerp(0.4, 0.55, refuse), wr: -0.9 * refuse, hand: 'open' }
            : { sh: 0.2, el: 0.4 },
          armB: { sh: 0.3, el: 1.3, hand: 'hold' },
          lean: -0.02 * refuse,
          face: { smile: -0.1, brow: 0.35 * refuse, lowered: 0.15, gaze: { x: -0.4, y: 0 } },
        },
        t, seed: 39,
      });
      contactShadow(c, dxp, FLOOR + 44, 70, 0.3);
    },
  });
  wash(ctx, '#f2a04c', 0.06, 'soft-light');
}
