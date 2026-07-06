// ── scenes2.js ── scenes: rises (Arjuna stands), shot (the eye of the fish), garland.
'use strict';

// ─────────────── SCENE: a stranger in white ───────────────
function scRises(ctx, tl, dur, t) {
  const standT = ramp(tl, 1.2, 3.0, easeIO);           // Arjuna rises
  const walkT = ramp(tl, 3.6, 8.2, easeIO);            // walks toward the bow
  const krishnaCut = tl > dur * 0.62;                  // cut to Kṛṣṇa & Balarāma

  if (!krishnaCut) {
    const cam = {
      x: -260 + walkT * 340 + sfbm1(tl * 0.12, 81) * 5,
      y: 30 + sfbm1(tl * 0.11, 82) * 4,
      z: 1.3 - walkT * 0.06,
    };
    hallSet(ctx, cam, t, {
      brahmins: false, nearCrowd: false,
      draupadiFace: { lowered: 0.2, smile: 0.02, gaze: { x: -0.5, y: 0.2 } },
      actors: (c) => {
        // brahmin row seated on the floor, left
        for (let i = 0; i < 4; i++) {
          if (i === 2) continue; // Arjuna's spot
          drawSeated(c, {
            x: 230 + i * 200, y: FLOOR + 92, s: 0.74, facing: 1,
            style: brahminStyle(i), t, seed: 51 + i,
            face: {
              turn: 0.3, smile: 0.02,
              // heads turn to follow him as he passes
              gaze: { x: clamp(walkT * 2 - i * 0.2, -0.2, 0.8), y: -0.1 },
              brow: 0.3 * pulse(tl, 2 + i * 0.4, 3 + i * 0.4, 6, 8),
            },
          });
        }
        // other Pāṇḍavas seated beyond (Yudhiṣṭhira, Bhīma watching)
        drawSeated(c, {
          x: 30, y: FLOOR + 96, s: 0.74, facing: 1, style: CAST.yudhishthira, t, seed: 56,
          face: { turn: 0.3, smile: 0.06, gaze: { x: 0.6, y: -0.1 } },
        });
        // Arjuna: sits → stands → walks
        const ax = 230 + 2 * 200 + walkT * 620;
        if (standT < 0.02) {
          drawSeated(c, {
            x: 630, y: FLOOR + 92, s: 0.74, facing: 1, style: CAST.arjuna, t, seed: 55,
            face: { turn: 0.3, smile: 0.03, lowered: 0.5 },
          });
        } else {
          const ph = t * 6.6;
          const wamp = walkT > 0.02 && walkT < 0.985 ? 0.9 : 0;
          const wp = walkPose(ph, wamp);
          // unfold from kneel: legs straighten with standT
          drawFigure(c, {
            x: ax, y: FLOOR + 92 - wp.bob, s: 0.74 * lerp(0.9, 1, standT), facing: 1,
            style: CAST.arjuna,
            pose: Object.assign({}, wp, {
              lean: lerp(0.34, 0.015, standT),
              headTurn: 0.3, headNod: lerp(0.3, 0.02, standT),
              legF: standT < 1 ? { hip: lerp(1.5, wp.legF.hip, standT), knee: lerp(1.7, wp.legF.knee, standT) } : wp.legF,
              legB: standT < 1 ? { hip: lerp(-0.4, wp.legB.hip, standT), knee: lerp(0.9, wp.legB.knee, standT) } : wp.legB,
              face: { smile: 0.04, lowered: lerp(0.6, 0.1, standT), brow: 0.05 },
            }),
            t, seed: 55,
          });
        }
      },
    });
  } else {
    // ── Kṛṣṇa recognizes him ──
    const k = ramp(tl, dur * 0.62, dur * 0.62 + 1.2);
    const cam = { x: sfbm1(tl * 0.1, 83) * 4, y: sfbm1(tl * 0.12, 84) * 3, z: 1 + k * 0.03 };
    vgrad(ctx, 0, 0, W, H, [[0, '#553317'], [0.6, '#7c5228'], [1, '#3f2410']]);
    camLayer(ctx, cam, 0.3, (c) => {
      // soft arch backdrop
      c.fillStyle = 'rgba(58,32,10,0.7)';
      c.beginPath(); archPath(c, 960, 120, 900, 620); c.fill();
      c.strokeStyle = rgba('#e8b64c', 0.4); c.lineWidth = 5;
      c.beginPath(); archPath(c, 960, 120, 900, 620); c.stroke();
      godRays(c, 500, 0, 1.1, 0.3, 1300, '#ffd98a', 0.14, t, 21);
      motes(c, 300, 100, 1300, 800, t, 31, 20);
    });
    camLayer(ctx, cam, 1.0, (c) => {
      // Balarāma (fair, pale-blue silk) beside Kṛṣṇa — seated among the kings
      drawSeated(c, {
        x: 1250, y: 1010, s: 1.6, facing: -1,
        style: {
          skin: '#e8cba0', skinShade: '#b3926a', hairColor: '#1d1408',
          hairstyle: 'topknot', garb: 'robe', clothMain: '#3f5a8c', clothAccent: GOLD,
          earring: true, ornaments: 2,
        },
        t, seed: 61,
        face: { turn: 0.42, smile: 0.18, gaze: { x: 0.35, y: 0 }, brow: 0.25 * k },
      });
      // Kṛṣṇa, gentle knowing smile
      drawSeated(c, {
        x: 640, y: 1030, s: 1.68, facing: 1,
        style: CAST.krishna, t, seed: 62,
        face: { turn: 0.4, smile: 0.28 + 0.3 * k, gaze: { x: 0.5 - k * 0.9, y: -0.1 }, lowered: 0 },
      });
      // a lotus lying before Kṛṣṇa — quiet emblem of recognition
      c.save();
      c.translate(950, 1005); c.scale(1.5, 1.5);
      c.fillStyle = '#e8a0b4';
      for (let p = -2; p <= 2; p++) {
        c.beginPath();
        c.ellipse(p * 9, -6 - Math.abs(p) * -4, 7, 16, p * 0.4, 0, TAU);
        c.fill();
      }
      c.fillStyle = '#f6d06e';
      c.beginPath(); c.arc(0, 2, 5, 0, TAU); c.fill();
      c.restore();
    });
    wash(ctx, '#ffca7a', 0.08 * k, 'soft-light');
  }
}

// ─────────────── SCENE: the eye of the fish ───────────────
function scShot(ctx, tl, dur, t) {
  // beats
  const pranam = pulse(tl, 0.2, 1.4, 2.2, 3.2);        // bows to the bow
  const lift = ramp(tl, 3.0, 4.2, easeIO);             // lifts bow
  const stringT = ramp(tl, 4.4, 5.6, easeOut);         // strings it
  const aimT = ramp(tl, 6.2, 8.0, easeIO);             // kneels & aims down
  const reflCU = tl > 8.2 && tl < 11.0;                // reflection close-up window
  const release = ramp(tl, 11.2, 11.5, easeIn);        // arrows loosed
  const flight = ramp(tl, 11.35, 12.1);                // arrows rise
  const hit = tl >= 12.1;
  const fallT = ramp(tl, 12.3, 14.2, easeIn);          // fish falls
  const shake = pulse(tl, 12.05, 12.15, 12.6, 13.0) * 7 + release * 3 * (1 - flight);

  if (reflCU) {
    // ══ full-frame close-up: the basin reflection ══
    const k = ramp(tl, 8.2, 8.7);
    vgrad(ctx, 0, 0, W, H, [[0, '#241608'], [0.5, '#171d26'], [1, '#0c1016']]);
    // giant basin filling frame
    const cx = W / 2, cy = H * 0.56;
    ctx.save();
    ctx.translate(cx, cy);
    const s = 5.4;
    ctx.scale(s, s);
    drawBasin(ctx, 0, 0, 1, t, (c) => {
      // reflected: spinning wheel + fish (inverted world)
      c.save();
      c.scale(1, -1);
      c.translate(0, 60);
      const wob = sfbm1(t * 2.3, 44) * 3;
      c.translate(wob, 0);
      // wheel
      c.strokeStyle = 'rgba(200,170,110,0.9)'; c.lineWidth = 6;
      c.beginPath(); c.ellipse(0, -40, 80, 19, 0, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(160,120,70,0.8)'; c.lineWidth = 3.4;
      for (let i = 0; i < 8; i++) {
        const a = t * 1.9 + i * TAU / 8;
        c.beginPath(); c.moveTo(0, -40); c.lineTo(Math.cos(a) * 80, -40 + Math.sin(a) * 19); c.stroke();
      }
      const fa = t * 1.9 * 0.7;
      drawGoldFish(c, Math.cos(fa) * 55, -78, 1.05, Math.cos(fa) >= 0 ? 1 : -1, t, false);
      c.restore();
    });
    ctx.restore();
    // Arjuna's aiming eye vignette (upper-left inset ring, tight on the eye)
    const ex = 320, ey = 230;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(20,12,6,0.82)';
    ctx.beginPath(); ctx.arc(ex, ey, 172, 0, TAU); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(ex, ey, 172, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, 160, 0, TAU); ctx.clip();
    ctx.translate(ex - 250, ey + 110);   // centre the near eye in the ring
    ctx.scale(6.2, 6.2);
    drawHead(ctx, 27, CAST.arjuna, { turn: 0.05, smile: 0, eyeOpen: 0.74, gaze: { x: 0.3, y: 0.6 }, brow: -0.4 }, t, 55);
    ctx.restore();
    // focus narration glow
    glowAdd(ctx, cx, cy, 380, 'rgba(120,170,220,0.14)', 0.8);
    vignette(ctx, 0.62, false);
    grain(ctx, 0.05, t);
    return;
  }

  const cam = {
    x: 60 + sfbm1(tl * 0.14, 91) * 4 + snoise1(t * 31, 5) * shake,
    y: -20 + sfbm1(tl * 0.13, 92) * 3 + snoise1(t * 37, 8) * shake
      + track([[0, 0], [11.2, 0], [12.0, -170], [14.4, -40], [dur, 0]], tl), // whip up to fish, settle
    z: track([[0, 1.32], [3, 1.34], [6.2, 1.3], [11.2, 1.36], [12.2, 1.18], [dur, 1.12]], tl),
  };

  hallSet(ctx, cam, t, {
    brahmins: false,
    yantraOpts: { speed: hit ? 0.5 : 1.9, noFish: hit },
    showBow: false,
    draupadiFace: { lowered: 0, smile: ramp(tl, 12.4, 13.6) * 0.4, brow: 0.3, gaze: { x: -0.6, y: -0.3 } },
    reflFn: (c) => { // live reflection in the basin (wide shots)
      c.save(); c.scale(1, -1); c.translate(0, 40);
      const fa = t * 1.9 * 0.7;
      drawGoldFish(c, Math.cos(fa) * 40, -60, 0.7, Math.cos(fa) >= 0 ? 1 : -1, t, false);
      c.restore();
    },
    actors: (c) => {
      // pedestal (bow gets taken)
      c.fillStyle = '#6e3a12'; c.fillRect(BOW_X - 120, FLOOR - 64, 240, 26);
      c.fillStyle = '#82461a'; c.fillRect(BOW_X - 100, FLOOR - 40, 200, 44);
      goldLine(c, BOW_X - 120, FLOOR - 62, BOW_X + 120, FLOOR - 62, 3);

      const ax = BOW_X + 40;
      // Arjuna
      const kneel = aimT;
      const drawArm = release > 0 ? 0 : ramp(tl, 9.0, 10.6, easeIO); // (draw happens off-CU, resumes)
      const armR = { // right arm holds bow forward
        sh: lerp(0.15 + pranam * 0.3, 1.35, lift) - kneel * 0.55,
        el: lerp(0.3, 0.12, lift),
        hand: lift > 0.3 ? 'hold' : 'open',
      };
      const armL = { // left arm draws string
        sh: lerp(0.1, 1.05, lift) - kneel * 0.5,
        el: lerp(0.25, 0.8, stringT) + drawArm * 0.55 - release * 0.75,
        hand: lift > 0.5 ? 'fist' : 'relaxed',
      };
      drawFigure(c, {
        x: ax, y: FLOOR + 70, s: 0.78, facing: 1,
        style: CAST.arjuna,
        pose: {
          lean: pranam * 0.22 + kneel * 0.1 - release * 0.03,
          headTurn: 0.24,
          headNod: pranam * 0.5 + kneel * 0.42 - release * 0.2,
          armF: armR, armB: armL,
          legF: { hip: kneel * 0.5, knee: kneel * 0.9 },
          legB: { hip: -kneel * 0.75, knee: kneel * 1.1 },
          face: {
            lowered: pranam * 0.8 + kneel * 0.55 - release * 0.4,
            smile: 0.02, brow: -0.2 - kneel * 0.25,
            eyeOpen: 1 - kneel * 0.3,
          },
        },
        t, seed: 55,
      });
      // the bow in his grip
      if (lift > 0.02) {
        const bowX = ax + 60 + lift * 30, bowY = FLOOR + 70 - 210 - lift * 40 + kneel * 90;
        const ang = lerp(-0.1, 0.15, lift) + kneel * 0.9 - release * 0.06;
        c.save();
        c.translate(bowX, bowY); c.rotate(ang);
        const px = -34 - drawArm * 40 + release * 46;
        drawGreatBow(c, 0, 0, 0.8, 0.12 + drawArm * 0.5 - release * 0.5, stringT > 0.6, stringT > 0.6 ? [px, 0] : null);
        // nocked arrows fan (five)
        if (drawArm > 0.15 && release < 1) {
          for (let i = 0; i < 5; i++) {
            drawArrow(c, px + 30, (i - 2) * 5 * drawArm, (i - 2) * 0.035, 0.72, false);
          }
        }
        c.restore();
        // string vibration after release
        if (release >= 1 && tl < 12.6) {
          c.save(); c.translate(bowX, bowY); c.rotate(ang);
          c.strokeStyle = 'rgba(240,230,205,0.4)'; c.lineWidth = 1.6;
          for (let i = 0; i < 3; i++) {
            c.beginPath(); c.moveTo(-8, -132);
            c.quadraticCurveTo(-8 + snoise1(t * 60 + i * 3, 9) * 10, 0, -8, 132);
            c.stroke();
          }
          c.restore();
        }
      } else {
        // bow still on pedestal, Arjuna circling/pranam
        ctxSaveBow(c, t, {});
      }
      // arrows in flight: streaks toward the fish
      if (flight > 0 && !hit) {
        const x0 = ax + 60, y0 = FLOOR - 260;
        const x1 = YANTRA_X + 8, y1 = FLOOR - 130 - 560 * 1.06 + 10;
        for (let i = 0; i < 5; i++) {
          const u = clamp(flight * 1.25 - i * 0.05, 0, 1);
          const px = lerp(x0, x1, u), py = lerp(y0, y1, u) - Math.sin(u * Math.PI) * 60;
          const angA = Math.atan2(y1 - y0 - Math.cos(u * Math.PI) * 120, x1 - x0);
          drawArrow(c, px + (i - 2) * 6, py + (i - 2) * 5, angA, 0.8, true);
        }
      }
      // impact burst + splinters
      if (hit && tl < 13.4) {
        const ix = YANTRA_X + 40, iy = FLOOR - 130 - 560 * 1.06 - 18;
        const kf = ramp(tl, 12.1, 13.2);
        glowAdd(c, ix, iy, 150 * (1 - kf), 'rgba(255,220,120,0.9)', 1 - kf);
        c.save(); c.strokeStyle = `rgba(255,225,150,${0.9 * (1 - kf)})`; c.lineWidth = 3;
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * TAU + 0.3;
          const r0 = 18 + kf * 120, r1 = r0 + 26;
          c.beginPath();
          c.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0 * 0.7);
          c.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1 * 0.7);
          c.stroke();
        }
        c.restore();
      }
      // the pierced fish falls
      if (hit) {
        const fy0 = FLOOR - 130 - 560 * 1.06 - 40;
        const fy = fy0 + fallT * fallT * (FLOOR - 60 - fy0);
        const fx = YANTRA_X + 46 + fallT * 60;
        c.save();
        c.translate(fx, Math.min(fy, FLOOR - 56));
        c.rotate(0.6 + fallT * 2.1);
        drawGoldFish(c, 0, 0, 1.15, 1, t, true);
        c.restore();
        if (fallT >= 0.999) {
          contactShadow(c, fx, FLOOR - 40, 60, 0.4);
        }
      }
    },
  });

  // crowd astonishment flash on impact
  if (hit && tl < 13.0) wash(ctx, '#ffdf9a', 0.22 * (1 - ramp(tl, 12.1, 13.0)), 'screen');
  wash(ctx, '#f2a04c', 0.06, 'soft-light');
}

// ─────────────── SCENE: the garland ───────────────
function scGarland(ctx, tl, dur, t) {
  const petals = ramp(tl, 0.0, 1.2);
  const walkT = ramp(tl, 1.4, 6.2, easeIO);           // Draupadī crosses to him
  const liftT = ramp(tl, 6.8, 8.6, easeIO);           // raises garland
  const placed = ramp(tl, 8.6, 9.4, easeIO);          // it rests on him
  const cam = {
    x: lerp(180, -110, walkT) + sfbm1(tl * 0.1, 101) * 4,
    y: -6 + sfbm1(tl * 0.11, 102) * 3,
    z: 1.22 + ramp(tl, 5.6, 9.8) * 0.14,
  };
  hallSet(ctx, cam, t, {
    brahmins: false,
    draupadiOnDais: false,
    drupadaSmile: 0.3,
    yantraOpts: { speed: 0.12, noFish: true },
    showBow: false,
    actors: (c) => {
      // the fallen fish lies beside the basin, arrow through its eye
      c.save();
      c.translate(YANTRA_X + 165, FLOOR + 8);
      c.rotate(0.12);
      drawGoldFish(c, 0, 0, 1.0, 1, 0, true);
      c.restore();
      contactShadow(c, YANTRA_X + 165, FLOOR + 18, 55, 0.35);
      // Arjuna standing, humbled, left of the pedestal
      const ax = BOW_X - 130;
      drawFigure(c, {
        x: ax, y: FLOOR + 70, s: 0.78, facing: -1,
        style: CAST.arjuna,
        pose: {
          headTurn: 0.3,
          headNod: liftT * 0.34 - placed * 0.1,
          lean: liftT * 0.04,
          armF: { sh: 0.12, el: 0.4 + placed * 0.3 }, armB: { sh: -0.06, el: 0.3 },
          face: { smile: 0.1 + placed * 0.22, lowered: 0.35 + liftT * 0.3 },
        },
        t, seed: 55,
      });
      if (placed > 0.5) {
        garlandStrand(c, ax - 44, FLOOR + 70 - 238, ax + 38, FLOOR + 70 - 242, 78, t, 78, 0.78);
      }
      // Draupadī walks to him bearing the garland; arms settle after placing it
      const dx = lerp(1560, ax + 118, walkT);
      const ph = t * 6.2;
      const amp = walkT > 0.01 && walkT < 0.985 ? 0.62 : 0;
      const wp = walkPose(ph, amp);
      const gLift = liftT * 1.1 * (1 - placed * 0.75);
      drawFigure(c, {
        x: dx, y: FLOOR + 72 - wp.bob, s: 0.76, facing: -1,
        style: CAST.draupadi,
        pose: Object.assign({}, wp, {
          headTurn: 0.34,
          headNod: 0.04 - liftT * 0.1 + placed * 0.12,
          armF: { sh: 0.5 + gLift * 0.9 - placed * 0.25, el: 1.25 - gLift * 0.45 - placed * 0.5, hand: placed > 0.6 ? 'relaxed' : 'hold' },
          armB: { sh: 0.38 + gLift * 0.95 - placed * 0.2, el: 1.42 - gLift * 0.5 - placed * 0.6, hand: placed > 0.6 ? 'relaxed' : 'hold' },
          face: { smile: 0.14 + placed * 0.2, lowered: 0.5 - liftT * 0.4 + placed * 0.3, gaze: { x: 0.2, y: 0.1 } },
        }),
        t, seed: 8,
      });
      // the garland in her hands (until placed)
      if (placed < 0.5) {
        const gy = FLOOR + 72 - 250 - gLift * 96;
        garlandStrand(c, dx - 96 - gLift * 16, gy, dx - 18, gy - 6, 52 - gLift * 10, t, 77, 0.7);
      }
      // gentle radiance between them
      glowAdd(c, (ax + dx) / 2, FLOOR - 220, 300, 'rgba(255,190,110,0.16)', 0.8 * liftT);
    },
  });
  // petal rain over all
  petalRain(ctx, t, 7, [-100, -80, W + 200, H + 100], 40, ['#f2a41f', '#e8801a', '#d94f2b', '#f6e7bf'], petals * 0.9);
  wash(ctx, '#ffb45c', 0.09, 'soft-light');
}
