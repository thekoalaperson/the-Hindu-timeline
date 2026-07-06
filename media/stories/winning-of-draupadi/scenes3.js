// ── scenes3.js ── scenes: kunti (a mother's word), wedding (five flames, one fate).
'use strict';

// ─────────────── SCENE: a mother's word ───────────────
function scKunti(ctx, tl, dur, t) {
  const arrive = ramp(tl, 0.4, 4.4, easeIO);         // brothers walk up
  const callT = ramp(tl, 4.6, 5.4);                  // "Mother, see..."
  const turnT = ramp(tl, 8.6, 10.4, easeIO);         // Kuntī turns
  const shock = pulse(tl, 9.8, 10.8, 12.6, 14.0);    // hands to lips
  const bless = ramp(tl, 13.8, 16.2, easeIO);        // Draupadī bows, Kuntī blesses
  const cam = {
    x: track([[0, -140], [5, -20], [9, 60], [dur, 80]], tl) + sfbm1(tl * 0.1, 111) * 4,
    y: sfbm1(tl * 0.11, 112) * 3,
    z: track([[0, 1.08], [8.5, 1.12], [11, 1.22], [dur, 1.26]], tl),
  };

  // dusk sky
  vgrad(ctx, 0, 0, W, H, [[0, '#2c1a4a'], [0.4, '#6e3a5a'], [0.72, '#c56a3c'], [1, '#3a1c10']]);
  camLayer(ctx, cam, 0.08, (c) => {
    // evening star + early stars
    for (let i = 0; i < 30; i++) {
      const sx = hash1(i * 3.7) * W, sy = hash1(i * 9.1) * H * 0.35;
      c.fillStyle = `rgba(255,240,220,${0.4 * noise1(t + i, 4)})`;
      c.fillRect(sx, sy, 1.8, 1.8);
    }
    glowAdd(c, 1500, 170, 10, 'rgba(255,255,240,0.9)', 0.9);
    c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(1500, 170, 2.6, 0, TAU); c.fill();
  });
  // distant treeline
  camLayer(ctx, cam, 0.25, (c) => {
    drawSkyline(c, 730, '#241226', 55);
    c.fillStyle = '#1c0e1c';
    for (let i = 0; i < 12; i++) {
      const tx = i * 180 + snoise1(i * 3, 8) * 40;
      const th = 90 + hash1(i * 7) * 70;
      c.beginPath();
      c.ellipse(tx, 730 - th * 0.4, 60 + hash1(i) * 30, th * 0.5, 0, 0, TAU);
      c.fill();
      c.fillRect(tx - 6, 730 - th * 0.15, 12, th * 0.3);
    }
  });
  // ground
  camLayer(ctx, cam, 0.8, (c) => {
    vgrad(c, -100, 720, W + 200, H - 620, [[0, '#4a2a16'], [1, '#200f06']]);
    // path
    c.fillStyle = 'rgba(200,150,90,0.20)';
    c.beginPath();
    c.moveTo(300, 1120); c.quadraticCurveTo(800, 900, 1350, 850);
    c.lineTo(1500, 870); c.quadraticCurveTo(900, 980, 520, 1140);
    c.closePath(); c.fill();
  });

  camLayer(ctx, cam, 1.0, (c) => {
    // ── the potter's hut ──
    const hx = 1430, hy = 900;
    // mud walls
    const wg = c.createLinearGradient(hx - 330, 0, hx + 260, 0);
    wg.addColorStop(0, '#8a5a34'); wg.addColorStop(0.5, '#a8744a'); wg.addColorStop(1, '#6e4424');
    c.fillStyle = wg;
    c.fillRect(hx - 330, hy - 330, 620, 330);
    // thatch roof
    c.fillStyle = '#7c5a28';
    c.beginPath();
    c.moveTo(hx - 400, hy - 320);
    c.quadraticCurveTo(hx - 60, hy - 470, hx + 340, hy - 320);
    c.lineTo(hx + 310, hy - 282); c.quadraticCurveTo(hx - 60, hy - 420, hx - 370, hy - 282);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(40,22,6,0.5)'; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      c.beginPath();
      c.moveTo(lerp(hx - 380, hx + 320, u), hy - 300 - Math.sin(u * Math.PI) * 118);
      c.lineTo(lerp(hx - 366, hx + 306, u), hy - 286 - Math.sin(u * Math.PI) * 96);
      c.stroke();
    }
    // doorway with warm interior
    const doorX = hx - 130, doorW = 150;
    const dg = c.createLinearGradient(doorX, hy - 260, doorX, hy);
    dg.addColorStop(0, '#ffd98a'); dg.addColorStop(1, '#c26a1e');
    c.fillStyle = dg;
    c.beginPath(); archPath(c, doorX, hy - 268, doorW, 250); c.fill();
    c.strokeStyle = '#4a2410'; c.lineWidth = 7;
    c.beginPath(); archPath(c, doorX, hy - 268, doorW, 250); c.stroke();
    glowAdd(c, doorX, hy - 100, 220, 'rgba(255,180,80,0.35)', 0.85);
    // stacked pots by the wall
    for (let i = 0; i < 3; i++) {
      const px = hx + 90 + i * 52, ph = 34 - i * 3;
      c.fillStyle = shade('#a4552a', -i * 0.08);
      c.beginPath(); c.ellipse(px, hy - ph / 2, 24 - i * 2, ph / 2, 0, 0, TAU); c.fill();
      c.fillStyle = '#6e3a1a';
      c.beginPath(); c.ellipse(px, hy - ph, 10, 4, 0, 0, TAU); c.fill();
    }
    // small window with lamp
    c.fillStyle = '#3a1c0a'; c.fillRect(hx + 60, hy - 240, 70, 60);
    c.fillStyle = '#ffca6a'; c.fillRect(hx + 68, hy - 232, 54, 44);
    flame(c, hx + 95, hy - 196, 12, t, 71, 0.9);

    // ── Kuntī: back turned at the doorway, tending a lamp; then turns ──
    const kx = doorX + 8;
    const facing = turnT < 0.5 ? 1 : -1;   // starts facing right (into hut), turns to face left (them)
    drawFigure(c, {
      x: kx, y: hy - 4, s: 0.62, facing,
      style: CAST.kunti,
      pose: {
        headTurn: turnT < 0.5 ? lerp(0.1, 0.55, turnT * 2) : lerp(0.55, 0.3, (turnT - 0.5) * 2),
        headNod: 0.06 - shock * 0.05,
        lean: 0.03 - turnT * 0.02,
        armF: shock > 0.1
          ? { sh: lerp(0.3, 1.05, shock), el: lerp(0.4, 1.45, shock), hand: 'open' }
          : (bless > 0.02 ? { sh: lerp(0.3, 0.85, bless), el: lerp(0.4, 0.35, bless), hand: 'bless' }
            : { sh: 0.3, el: 0.55, hand: 'hold' }),
        armB: shock > 0.1
          ? { sh: lerp(0.2, 0.9, shock), el: lerp(0.3, 1.5, shock), hand: 'open' }
          : { sh: 0.2, el: 0.35 },
        face: {
          smile: -0.05 + bless * 0.3,
          brow: shock * 0.8, lipsPart: shock * 0.7,
          lowered: turnT < 0.5 ? 0.5 : bless * 0.4,
          gaze: { x: turnT > 0.5 ? 0.35 : -0.2, y: 0.1 },
        },
      },
      t, seed: 121,
    });

    // ── the brothers arrive from the left, Draupadī behind ──
    const bx = lerp(-200, 700, arrive);
    const ph = t * 6.4;
    const amp = arrive > 0.01 && arrive < 0.985 ? 0.8 : 0;
    // Bhīma leads, Draupadī prominent behind him, then Arjuna calling, Yudhiṣṭhira
    const callArm = pulse(tl, 4.6, 5.3, 7.4, 8.6); // arm raised only while calling
    const row = [
      [CAST.bhima, 0, 132, 0.72, {}],
      [CAST.draupadi, -150, 126, 0.68, { headNod: 0.08 }],
      [CAST.arjuna, -295, 128, 0.7, callArm > 0.01 ? { armF: { sh: 0.12 + callArm * 1.05, el: 0.25 + callArm * 0.1, hand: callArm > 0.4 ? 'open' : 'relaxed' } } : {}],
      [CAST.yudhishthira, -440, 130, 0.71, {}],
    ];
    for (const [st, off, , sc, extra] of row) {
      const wp = walkPose(ph + off * 0.13, amp);
      const px = bx + off;
      const isDraupadi = st === CAST.draupadi;
      // Draupadī bows to touch Kuntī's feet at the end
      let pose = Object.assign({}, wp, {
        headTurn: 0.3,
        face: { smile: 0.06, lowered: isDraupadi ? 0.4 : 0.1 },
      }, extra);
      let px2 = px, s2 = sc;
      if (isDraupadi && bless > 0.01) {
        px2 = lerp(px, kx - 120, bless);
        pose = {
          headTurn: 0.32, headNod: bless * 0.5,
          lean: bless * 0.42,
          armF: { sh: 0.55 + bless * 0.35, el: 0.3, hand: 'open' },
          armB: { sh: 0.35 + bless * 0.3, el: 0.35, hand: 'open' },
          legF: { hip: bless * 0.35, knee: bless * 0.6 },
          legB: { hip: -bless * 0.4, knee: bless * 0.5 },
          face: { lowered: 0.7, smile: 0.12 },
        };
      }
      drawFigure(c, {
        x: px2, y: hy + 40 - (amp ? wp.bob : 0), s: s2, facing: 1,
        style: st, pose, t, seed: 130 + off,
      });
    }
    // fireflies
    for (let i = 0; i < 14; i++) {
      const fx2 = 200 + hash1(i * 5) * 1400 + sfbm1(t * 0.4 + i, 61) * 60;
      const fy2 = 760 + hash1(i * 11) * 260 + sfbm1(t * 0.5 + i * 2, 62) * 40;
      const tw = Math.max(0, Math.sin(t * (1.2 + hash1(i)) + i * 5));
      glowAdd(c, fx2, fy2, 9, `rgba(220,255,140,${0.55 * tw})`, tw);
    }
  });

  vignette(ctx, 0.4, true);
  wash(ctx, '#c26a9a', 0.05, 'soft-light');
}

// ─────────────── SCENE: five flames, one fate ───────────────
function scWedding(ctx, tl, dur, t) {
  const vyasaBeat = tl < 7.4;                          // Vyāsa reveals the boon
  const outro = ramp(tl, dur - 4.6, dur - 1.2, easeIO); // final tableau pull-back

  if (vyasaBeat) {
    // ── Vyāsa + the Śiva-boon vision ──
    const k = ramp(tl, 0.3, 1.4);
    const cam = { x: sfbm1(tl * 0.09, 131) * 4, y: sfbm1(tl * 0.1, 132) * 3, z: 1 + tl * 0.008 };
    vgrad(ctx, 0, 0, W, H, [[0, '#1c1026'], [0.6, '#3a2030'], [1, '#241408']]);
    camLayer(ctx, cam, 0.2, (c) => {
      // vision mandala backdrop
      c.save();
      c.translate(1260, 420);
      c.rotate(t * 0.03);
      for (let ring = 0; ring < 3; ring++) {
        c.strokeStyle = rgba('#e8b64c', 0.18 - ring * 0.04);
        c.lineWidth = 2.5;
        const rr = 210 + ring * 90;
        c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke();
        for (let i = 0; i < 12 + ring * 6; i++) {
          const a = i / (12 + ring * 6) * TAU;
          c.beginPath();
          c.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, 16, 7, a, 0, TAU);
          c.stroke();
        }
      }
      c.restore();
      glowAdd(c, 1260, 420, 420, 'rgba(160,120,255,0.12)', 1);
    });
    camLayer(ctx, cam, 1.0, (c) => {
      // Vyāsa speaking (left, large)
      drawFigure(c, {
        x: 330, y: 1090, s: 1.28, facing: 1,
        style: CAST.vyasa,
        pose: {
          headTurn: 0.3,
          armF: { sh: 1.0 + Math.sin(t * 0.9) * 0.05, el: 0.5, hand: 'bless' },
          armB: { sh: 0.25, el: 0.6, hand: 'open' },
          face: { smile: 0.1, brow: 0.15 },
        },
        t, seed: 141,
      });
      // ── vision: the ascetic maiden praying to Śiva ──
      const vx = 1260, vy = 700;
      ctx.save();
      // maiden kneeling in prayer (namaste)
      drawFigure(c, {
        x: vx - 210, y: vy, s: 0.62, facing: 1,
        style: {
          female: true, skin: '#a86a3c', skinShade: '#754419', hairColor: '#140d06',
          hairstyle: 'braid', garb: 'sari', clothMain: '#d8d3c0', clothAccent: '#a89a6e',
          ornaments: 0, pallu: true,
        },
        pose: {
          lean: 0.2, headNod: 0.24, headTurn: 0.25,
          armF: { sh: 0.95, el: 1.5, hand: 'open' },
          armB: { sh: 0.9, el: 1.55, hand: 'open' },
          legF: { hip: 0.4, knee: 0.8 }, legB: { hip: -0.4, knee: 0.6 },
          face: { lowered: 0.8, smile: 0.05 },
        },
        t, seed: 143, shadow: false,
      });
      // Śiva: luminous stillness (right of vision)
      glowAdd(c, vx + 170, vy - 260, 220, 'rgba(190,210,255,0.28)', k);
      drawFigure(c, {
        x: vx + 170, y: vy, s: 0.78, facing: -1,
        style: CAST.shiva,
        pose: {
          headTurn: 0.3,
          armF: { sh: 0.75, el: 0.5, hand: 'bless' },
          armB: { sh: 0.1, el: 0.3 },
          face: { smile: 0.12, lowered: 0.25, eyeOpen: 0.7 },
        },
        t, seed: 145, shadow: false,
      });
      // crescent on his crown + trident
      c.save();
      c.translate(vx + 170, vy - 372);
      c.fillStyle = '#f2e3bc';
      c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.fill();
      c.fillStyle = 'rgba(28,16,38,0.99)';
      c.beginPath(); c.arc(-7, -3, 15.5, 0, TAU); c.fill();
      c.restore();
      c.strokeStyle = '#b9c2cc'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(vx + 268, vy - 20); c.lineTo(vx + 268, vy - 420); c.stroke();
      for (const dxT of [-22, 0, 22]) {
        c.beginPath();
        c.moveTo(vx + 268 + dxT, vy - 420);
        c.quadraticCurveTo(vx + 268 + dxT * 1.3, vy - 460, vx + 268 + dxT * 0.5, vy - 478);
        c.stroke();
      }
      // five small flames appear one by one — the five prayers
      const nFl = clamp(Math.floor(ramp(tl, 2.2, 6.4) * 5.99), 0, 5);
      for (let i = 0; i < nFl; i++) {
        const fx = vx - 320 + i * 120, fy = vy + 90;
        flame(c, fx, fy, 24, t, 150 + i, 0.9);
        glowAdd(c, fx, fy - 20, 46, 'rgba(255,190,90,0.5)', 0.9);
      }
      ctx.restore();
    });
    vignette(ctx, 0.5, false);
    wash(ctx, '#8a6aff', 0.05, 'soft-light');
    return;
  }

  // ── the wedding at the mandap ──
  const wt = tl - 7.4;                        // local wedding time
  const cam = {
    x: sfbm1(tl * 0.09, 151) * 4,
    y: sfbm1(tl * 0.1, 152) * 3 + outro * -20,
    z: (1.2 - outro * 0.16) + sfbm1(tl * 0.07, 153) * 0.004,
  };
  vgrad(ctx, 0, 0, W, H, [[0, '#2c1430'], [0.5, '#5c2818'], [1, '#2a1206']]);
  // evening glow sky through mandap
  camLayer(ctx, cam, 0.15, (c) => {
    glowAdd(c, 960, 260, 700, 'rgba(255,150,60,0.14)', 1);
    drawSkyline(c, 560, '#200f22', 77);
  });
  camLayer(ctx, cam, 0.5, (c) => {
    // mandap: four poles + cloth canopy + garlands
    c.fillStyle = '#6e3a14';
    for (const px of [330, 1590]) c.fillRect(px - 14, 300, 28, 660);
    for (const px of [560, 1360]) c.fillRect(px - 11, 240, 22, 500);
    const cg = c.createLinearGradient(0, 180, 0, 330);
    cg.addColorStop(0, '#a11e2c'); cg.addColorStop(1, '#7c1220');
    c.fillStyle = cg;
    c.beginPath();
    c.moveTo(240, 320); c.quadraticCurveTo(960, 170, 1680, 320);
    c.lineTo(1680, 260); c.quadraticCurveTo(960, 120, 240, 260);
    c.closePath(); c.fill();
    goldLine(c, 250, 316, 1670, 316, 5);
    drawTorana(c, 260, 1660, 330, t, 61);
    // fringe lamps
    for (let i = 0; i < 8; i++) {
      const lx = 380 + i * 170;
      glowAdd(c, lx, 356, 26, 'rgba(255,190,80,0.55)', 0.8 + 0.2 * Math.sin(t * 2 + i));
      c.fillStyle = '#e8a825'; c.beginPath(); c.arc(lx, 356, 5, 0, TAU); c.fill();
    }
  });

  camLayer(ctx, cam, 1.0, (c) => {
    // floor
    vgrad(c, -100, 880, W + 200, 320, [[0, '#4a2410'], [1, '#241004']]);
    // rangoli circle around the fire
    c.strokeStyle = rgba('#e8b64c', 0.5); c.lineWidth = 3;
    c.beginPath(); c.ellipse(960, 966, 300, 74, 0, 0, TAU); c.stroke();
    c.strokeStyle = rgba('#d94f2b', 0.5);
    c.beginPath(); c.ellipse(960, 966, 262, 62, 0, 0, TAU); c.stroke();
    // sacred fire
    const fireS = 66 + Math.sin(t * 2.2) * 4;
    c.fillStyle = '#5c2c10';
    c.beginPath(); c.moveTo(884, 966); c.lineTo(902, 928); c.lineTo(1018, 928); c.lineTo(1036, 966);
    c.lineTo(1010, 984); c.lineTo(910, 984); c.closePath(); c.fill();
    flame(c, 960, 936, fireS, t, 171, 1);
    embers(c, 960, 900, 90, t, 173, 16);
    glowAdd(c, 960, 900, 300, 'rgba(255,170,70,0.30)', 1);

    // pheras: Draupadī led by Yudhiṣṭhira circling the fire
    const orbT = wt * 0.30;
    const pair = [[CAST.yudhishthira, 0], [CAST.draupadi, -0.85]];
    for (const [st, off] of pair) {
      const a = orbT + off;
      const px = 960 + Math.cos(a) * 270;
      const py = 966 + Math.sin(a) * 62;
      const depth = (Math.sin(a) + 1) / 2;        // 0 behind fire, 1 in front
      const sc = lerp(0.55, 0.68, depth);
      const facing = -Math.sin(a) >= 0 ? 1 : -1;  // face direction of travel
      const wp = walkPose(wt * 4.6 + off * 3, 0.5);
      c.save();
      if (depth < 0.45) c.globalAlpha = 0.88;
      drawFigure(c, {
        x: px, y: py - wp.bob * 0.5, s: sc, facing,
        style: st === CAST.arjuna ? CAST.arjunaGroom : st,
        pose: Object.assign({}, wp, {
          headTurn: 0.3, headNod: 0.06,
          armF: { sh: 0.5, el: 0.9, hand: 'hold' },
          face: { smile: 0.18, lowered: st === CAST.draupadi ? 0.45 : 0.1 },
        }),
        t, seed: st === CAST.draupadi ? 8 : 161,
      });
      c.restore();
    }
    // knot of cloth between them (gathbandhan) — a saffron sash arc
    const a1 = orbT, a2 = orbT - 0.5;
    const x1 = 960 + Math.cos(a1) * 260, y1 = 966 + Math.sin(a1) * 60 - 150;
    const x2 = 960 + Math.cos(a2) * 260, y2 = 966 + Math.sin(a2) * 60 - 150;
    ctx.save();
    c.strokeStyle = rgba('#e8a03c', 0.9); c.lineWidth = 7;
    c.beginPath(); c.moveTo(x1, y1);
    c.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + 60, x2, y2);
    c.stroke();
    ctx.restore();

    // the other four brothers standing garlanded (left), Kuntī & Drupada (right), Vyāsa behind
    const others = [CAST.bhima, CAST.arjunaGroom, CAST.nakula, CAST.sahadeva];
    others.forEach((st, i) => {
      drawFigure(c, {
        x: 240 + i * 128, y: 1042 + (i % 2) * 8, s: 0.62, facing: 1,
        style: Object.assign({}, st, { wearGarland: true }),
        pose: {
          headTurn: 0.3,
          armF: { sh: 0.14 + 0.04 * Math.sin(t + i), el: 0.3 },
          face: { smile: 0.2, gaze: { x: 0.4, y: 0 } },
        },
        t, seed: 180 + i,
      });
    });
    drawFigure(c, {
      x: 1680, y: 1042, s: 0.62, facing: -1, style: CAST.kunti,
      pose: { headTurn: 0.3, armF: { sh: 0.4, el: 0.9, hand: 'bless' }, face: { smile: 0.25 } },
      t, seed: 185,
    });
    drawFigure(c, {
      x: 1810, y: 1050, s: 0.64, facing: -1, style: CAST.drupada,
      pose: { headTurn: 0.3, face: { smile: 0.15 } }, t, seed: 186,
    });
    drawFigure(c, {
      x: 1540, y: 1036, s: 0.6, facing: -1, style: CAST.vyasa,
      pose: { headTurn: 0.3, armF: { sh: 0.75, el: 0.65, hand: 'bless' }, face: { smile: 0.12 } },
      t, seed: 187,
    });
  });

  petalRain(ctx, t, 17, [-100, -80, W + 200, H + 100], 34, ['#f2a41f', '#e8801a', '#f6e7bf'], 0.7);

  // ── closing card ──
  if (outro > 0.01) {
    ctx.save();
    ctx.globalAlpha = outro;
    ctx.fillStyle = 'rgba(20,8,2,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = outro;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2dfae';
    ctx.font = '600 58px Georgia, serif';
    ctx.shadowColor = 'rgba(255,180,60,0.4)'; ctx.shadowBlur = 22;
    ctx.fillText('And so were the five bound to one fate.', W / 2, H / 2 - 40);
    ctx.font = 'italic 28px Georgia, serif';
    ctx.fillStyle = '#cfa96a'; ctx.shadowBlur = 10;
    ctx.fillText('Mahābhārata · Ādi Parva 166–198', W / 2, H / 2 + 30);
    ctx.font = '22px Georgia, serif';
    ctx.fillStyle = '#9a7c4e';
    ctx.fillText('hand-drawn with code · no AI imagery · the-Hindu-timeline', W / 2, H / 2 + 84);
    ctx.restore();
  }
  vignette(ctx, 0.42, true);
  wash(ctx, '#ff9a4c', 0.08, 'soft-light');
}
