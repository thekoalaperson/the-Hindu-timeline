// ── person3.js ── figure renderer v3: LOOK-DEV SPIKE (iteration 2).
// Drawing-construction approach: round cranium + short jaw, features on the
// eye line at mid-skull, large almond kohl eyes, profile built from feature
// steps that blend in with turn, FK limbs (same sh/el angle semantics as v2)
// rendered as ONE tapered ribbon each — no capsule joints.
// Exposes drawHead3 / drawFigure3 for side-by-side comparison; the port
// swaps these in as drawHead / drawFigure once approved.
'use strict';

// ───────────────────────── HEAD v3 ─────────────────────────
// face: {turn 0(front)..1(profile), smile -1..1, eyeOpen 0..1.2, gaze{x,y},
//        brow -1(anger)..1(raised), lipsPart 0..1, lowered 0..1}
function drawHead3(ctx, R, style, face, t, seed) {
  const f = Object.assign({ turn: 0.5, smile: 0.1, eyeOpen: 1, gaze: { x: 0, y: 0 }, brow: 0, lipsPart: 0, lowered: 0 }, face);
  // v2 expression compat: rage/laugh fold into the base face params (additive;
  // absent by default, so the approved look-dev cases are unchanged). weep is
  // handled by the tears block below.
  if (f.rage) { f.brow = (f.brow || 0) - f.rage * 0.7; f.lipsPart = Math.max(f.lipsPart || 0, 0.25 + f.rage * 0.3); }
  if (f.laugh) { f.smile = (f.smile || 0) + f.laugh * 0.6; f.lipsPart = Math.max(f.lipsPart || 0, f.laugh * 0.45); }
  const heavy = style.heavyBrow ? 1.5 : 1;
  const tn = clamp(f.turn, 0, 1);
  const skin = style.skin, dark = style.skinShade || shade(skin, -0.28);
  const hairC = style.hairColor || '#170d08';
  const INKA = rgba('#26130a', 0.9);
  const female = !!style.female;

  ctx.save();
  ctx.scale(R, R);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // blink — KEEP IN SYNC with the drawHead4 copy (see IIFE below)
  const cyc = (t * 0.29 + hash1(seed) * 7) % 4.6;
  const blink = cyc < 0.13 ? Math.sin(cyc / 0.13 * Math.PI) : 0;
  const open = clamp(f.eyeOpen - blink * 1.2, 0.06, 1.2);

  // ── construction ──
  // facing +x. P() interpolates front(0)→profile(1); d blends profile
  // feature steps (brow ridge / nose / lips) into the face edge.
  const P = (front, prof) => lerp(front, prof, tn);
  const d = smooth(norm(tn, 0.25, 0.92));

  const E = (fx, px) => lerp(fx, px, d);   // face-edge blend front→profile depth
  const chin = [P(0.14, 0.36), 1.10];
  const chinB = [P(-0.12, 0.10), 1.14];

  const headPath = () => {
    ctx.beginPath();
    ctx.moveTo(P(0.0, 0.06), -1.10);                              // crown
    ctx.quadraticCurveTo(P(0.52, 0.62), -1.04, P(0.66, 0.76), -0.76); // forehead
    ctx.quadraticCurveTo(P(0.86, 0.96), -0.58, E(0.84, 0.94), -0.30); // to brow
    // face edge: smooth curve segments through feature landmarks;
    // sharp only at the nose tip and the lip notch
    ctx.quadraticCurveTo(E(0.86, 0.89), -0.18, E(0.86, 0.91), -0.04); // brow ridge → bridge root
    ctx.quadraticCurveTo(E(0.87, 0.97), 0.12, E(0.86, 1.12), 0.30);   // bridge slope
    ctx.lineTo(E(0.855, 1.17), 0.345);                                // NOSE TIP
    ctx.quadraticCurveTo(E(0.845, 1.00), 0.42, E(0.83, 0.92), 0.455); // under-nose
    ctx.quadraticCurveTo(E(0.815, 0.91), 0.50, E(0.80, 0.97), 0.575); // philtrum → upper lip
    ctx.quadraticCurveTo(E(0.78, 0.98), 0.635, E(0.765, 0.88), 0.695);// lip notch
    ctx.quadraticCurveTo(E(0.74, 0.97), 0.755, E(0.71, 0.93), 0.83);  // lower lip
    ctx.quadraticCurveTo(E(0.67, 0.82), 0.895, E(0.60, 0.90), 0.99);  // chin crease → chin ball back out
    ctx.quadraticCurveTo(E(0.45, 0.74), 1.12, chin[0], chin[1]);  // under the chin ball → chin front
    ctx.quadraticCurveTo(P(0.02, 0.24), 1.16, chinB[0], chinB[1]);// chin round
    ctx.quadraticCurveTo(P(-0.44, -0.24), 1.04, P(-0.64, -0.44), 0.64); // jaw
    ctx.quadraticCurveTo(-0.84, 0.40, -0.88, 0.05);               // ear-side cheek
    ctx.quadraticCurveTo(-0.99, -0.22, -0.94, -0.48);             // skull back
    ctx.quadraticCurveTo(-0.90, -0.88, -0.56, -0.96);             // back-top
    ctx.quadraticCurveTo(-0.22, -1.12, P(0.0, 0.06), -1.10);      // close crown
    ctx.closePath();
  };

  // back hair silhouette behind skull
  hair3Back(ctx, style, t, seed, tn);

  headPath(); ctx.fillStyle = skin; ctx.fill();

  // modelling: narrow core-shadow band along the back edge + cheek blush
  ctx.save(); headPath(); ctx.clip();
  ctx.fillStyle = rgba(dark, 0.20);
  ctx.beginPath();
  ctx.moveTo(-0.95, -0.70);
  ctx.quadraticCurveTo(-0.52, -0.30, -0.52, 0.30);
  ctx.quadraticCurveTo(-0.50, 0.85, -0.05, 1.16);
  ctx.quadraticCurveTo(-0.70, 1.10, -1.0, 0.35);
  ctx.closePath(); ctx.fill();
  // cheek blush
  ctx.fillStyle = rgba('#d96a4a', female ? 0.15 : 0.09);
  ctx.beginPath(); ctx.ellipse(P(0.42, 0.62), 0.44, 0.24, 0.15, -0.1, 0, TAU); ctx.fill();
  // forehead light
  ctx.fillStyle = 'rgba(255,244,214,0.13)';
  ctx.beginPath(); ctx.ellipse(P(0.16, 0.36), -0.52, 0.50, 0.32, 0.15, 0, TAU); ctx.fill();
  // chin/lower-lip shadow
  ctx.fillStyle = rgba(dark, 0.16);
  ctx.beginPath(); ctx.ellipse(P(0.05, 0.45), 0.90, 0.17, 0.06, 0, 0, TAU); ctx.fill();
  ctx.restore();

  headPath(); ctx.strokeStyle = INKA; ctx.lineWidth = 0.055; ctx.stroke();

  // ── ear: rides the back silhouette edge near-front, drifts to mid-skull in profile ──
  if (tn > 0.12) {
    const ea = Math.min(1, norm(tn, 0.12, 0.32));
    const ex = P(-0.84, -0.38), ey = 0.10;
    ctx.save(); ctx.globalAlpha = ea;
    ctx.fillStyle = skin;
    const earOuter = () => {
      ctx.beginPath();
      ctx.moveTo(ex + 0.10, ey - 0.14);                                  // attach, top
      ctx.quadraticCurveTo(ex - 0.06, ey - 0.32, ex - 0.19, ey - 0.18);  // helix top-back
      ctx.quadraticCurveTo(ex - 0.27, ey + 0.02, ex - 0.13, ey + 0.20);  // back curve
      ctx.quadraticCurveTo(ex - 0.03, ey + 0.29, ex + 0.08, ey + 0.20);  // lobe → attach
    };
    earOuter(); ctx.closePath(); ctx.fill();
    earOuter(); ctx.strokeStyle = INKA; ctx.lineWidth = 0.042; ctx.stroke(); // outer edge only — no seam at the attach side
    ctx.strokeStyle = rgba(dark, 0.6); ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.arc(ex - 0.07, ey - 0.02, 0.09, -2.5, 0.7); ctx.stroke();
    if (style.earring) {
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(ex - 0.03, ey + 0.32, 0.05, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fdf6ec';
      ctx.beginPath(); ctx.arc(ex - 0.045, ey + 0.305, 0.015, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ── eyes on the mid-skull line: large almond, kohl-lined ──
  const eyeY = 0.06 + f.lowered * 0.05;
  const nearX = P(0.36, 0.56);
  const farX = P(-0.36, -0.06);
  const eyeW = 0.30 * P(1, 0.78), eyeH = 0.155;
  eye3(ctx, nearX, eyeY, eyeW, eyeH, open, f, style, 1, tn);
  if (tn < 0.72) {
    ctx.save();
    if (tn > 0.5) ctx.globalAlpha = norm(0.72, tn, 0.5) ? 1 - norm(tn, 0.5, 0.72) : 1;
    eye3(ctx, farX, eyeY, eyeW * P(1, 0.7), eyeH, open, f, style, -1, tn);
    ctx.restore();
  }
  // brows: the expression carriers
  brow3(ctx, nearX, eyeY - 0.20, 0.36, f.brow, f.smile, 1, heavy);
  if (tn < 0.72) {
    ctx.save();
    if (tn > 0.5) ctx.globalAlpha = 1 - norm(tn, 0.5, 0.72);
    brow3(ctx, farX, eyeY - 0.20, 0.32, f.brow * 0.9, f.smile, -1, heavy);
    ctx.restore();
  }

  // ── tears (weep) — additive, absent by default ──
  if (f.weep > 0.05) {
    ctx.save();
    ctx.globalAlpha = clamp(f.weep, 0, 1);
    const tear = (tx) => {
      ctx.fillStyle = 'rgba(200,224,242,0.75)';
      ctx.beginPath();
      ctx.moveTo(tx, eyeY + 0.16);
      ctx.quadraticCurveTo(tx + 0.05, eyeY + 0.30, tx, eyeY + 0.42);
      ctx.quadraticCurveTo(tx - 0.05, eyeY + 0.30, tx, eyeY + 0.16);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(tx - 0.015, eyeY + 0.28, 0.02, 0, TAU); ctx.fill();
    };
    tear(nearX + 0.03);
    if (tn < 0.5) tear(farX + 0.03);
    ctx.restore();
  }

  // ── nose: inside-silhouette bracket, fading as the silhouette takes over ──
  const nA = 1 - norm(d, 0.35, 0.7);
  if (nA > 0.02) {
    ctx.strokeStyle = rgba('#26130a', 0.55 * nA); ctx.lineWidth = 0.042;
    const nx0 = P(0.08, 0.34);
    ctx.beginPath();
    ctx.moveTo(nx0, 0.14);
    ctx.quadraticCurveTo(nx0 + 0.08, 0.32, nx0 + 0.045, 0.42);
    ctx.stroke();
    // nostril flicks
    ctx.beginPath(); ctx.arc(nx0 - 0.09, 0.415, 0.05, 0.5, 2.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx0 + 0.075, 0.43, 0.045, 0.9, 2.5); ctx.stroke();
  }

  // ── mouth (in profile it slides back to meet the lip step in the silhouette) ──
  const mx = P(0.05, 0.62), mw = 0.34 * P(1, 0.72);
  const my = 0.68, sm = f.smile;
  const lipC = style.lip || (female ? '#a83a30' : '#8a4030');
  if (f.lipsPart > 0.08) {
    // open mouth
    const oh = 0.07 + f.lipsPart * 0.14;
    ctx.fillStyle = '#5c201a';
    ctx.beginPath();
    ctx.moveTo(mx - mw * 0.62, my - sm * 0.06);
    ctx.quadraticCurveTo(mx, my - 0.05 - sm * 0.07, mx + mw * 0.62, my - sm * 0.055);
    ctx.quadraticCurveTo(mx + mw * 0.42, my + oh, mx, my + oh + 0.02);
    ctx.quadraticCurveTo(mx - mw * 0.42, my + oh, mx - mw * 0.62, my - sm * 0.06);
    ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.75); ctx.lineWidth = 0.038; ctx.stroke();
    if (f.lipsPart > 0.3) { // upper teeth
      ctx.fillStyle = '#f4ead8';
      ctx.beginPath();
      ctx.moveTo(mx - mw * 0.48, my - sm * 0.05 + 0.005);
      ctx.quadraticCurveTo(mx, my - 0.03 - sm * 0.06, mx + mw * 0.48, my - sm * 0.045 + 0.005);
      ctx.quadraticCurveTo(mx + mw * 0.36, my + 0.045, mx, my + 0.05);
      ctx.quadraticCurveTo(mx - mw * 0.36, my + 0.045, mx - mw * 0.48, my - sm * 0.05 + 0.005);
      ctx.closePath(); ctx.fill();
    }
  } else {
    // closed: one expressive line, upper-lip hint, fuller colored lower lip
    ctx.strokeStyle = rgba(lipC, female ? 0.9 : 0.55);
    ctx.lineWidth = female ? 0.10 : 0.075;
    ctx.beginPath();
    ctx.moveTo(mx - mw * 0.48, my - sm * 0.055 + 0.02);
    ctx.quadraticCurveTo(mx, my + sm * 0.055 + 0.05, mx + mw * 0.48, my - sm * 0.05 + 0.02);
    ctx.stroke();
    ctx.strokeStyle = rgba('#26130a', 0.8); ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(mx - mw * 0.58, my - sm * 0.07);
    ctx.quadraticCurveTo(mx, my + sm * 0.09, mx + mw * 0.58, my - sm * 0.06);
    ctx.stroke();
    // corner dimples when smiling
    if (sm > 0.3) {
      ctx.lineWidth = 0.032;
      ctx.beginPath(); ctx.arc(mx - mw * 0.66, my - sm * 0.075 + 0.02, 0.035, -1.7, -0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx + mw * 0.64, my - sm * 0.06 + 0.02, 0.035, -2.9, -1.5); ctx.stroke();
    }
  }

  // fangs (rakshasa): two small down-pointing teeth at the mouth corners
  if (style.fangs || style.tusks) {
    ctx.fillStyle = '#efe7d2'; ctx.strokeStyle = rgba('#26130a', 0.5); ctx.lineWidth = 0.028;
    const fang = (fx, w) => {
      ctx.beginPath();
      ctx.moveTo(fx - w, my - 0.02);
      ctx.lineTo(fx + w, my - 0.02);
      ctx.lineTo(fx, my + 0.15);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    fang(mx - mw * 0.5 * P(1, 0.72), 0.05);
    fang(mx + mw * 0.44 * P(1, 0.72), 0.05);
  }

  // marks
  if (style.tilak) tilak3(ctx, P(0.02, 0.42), -0.44, style.tilak);
  if (style.bindi) { ctx.fillStyle = '#c92f1d'; ctx.beginPath(); ctx.arc(P(0.01, 0.40), -0.42, 0.055, 0, TAU); ctx.fill(); }

  // facial hair
  if (style.moustache) {
    const mc = style.beard === 'white' ? '#ddd4c4' : (style.beard === 'grey' ? '#9a9084' : hairC);
    const lift = style.moustache === 2 ? 0.07 : 0;
    const backR = P(1, 0.45), frontR = P(1, 0.8); // far lobe shrinks toward profile
    ctx.fillStyle = mc;
    ctx.beginPath();
    ctx.moveTo(mx, my - 0.085);
    ctx.quadraticCurveTo(mx - mw * 0.55 * backR, my - 0.22, mx - mw * 0.95 * backR, my - 0.13 - lift);
    ctx.quadraticCurveTo(mx - mw * 0.5 * backR, my - 0.085, mx, my - 0.02);
    ctx.quadraticCurveTo(mx + mw * 0.5 * frontR, my - 0.085, mx + mw * 0.9 * frontR, my - 0.125 - lift * 0.6);
    ctx.quadraticCurveTo(mx + mw * 0.5 * frontR, my - 0.21, mx, my - 0.085);
    ctx.closePath(); ctx.fill();
  }
  if (style.beard) {
    const bc = style.beard === 'white' ? '#e8e0d2' : (style.beard === 'grey' ? '#9a9084' : hairC);
    const len = (style.beardLen || 0.3) * 0.9;
    ctx.fillStyle = bc;
    ctx.beginPath();
    ctx.moveTo(P(-0.62, -0.42), 0.52);
    ctx.quadraticCurveTo(P(-0.5, -0.28), 1.05, P(-0.16, 0.04), 1.20 + len * 0.55);
    ctx.quadraticCurveTo(P(0.10, 0.30), 1.28 + len, P(0.34, 0.52), 1.16 + len * 0.5);
    ctx.quadraticCurveTo(P(0.52, 0.72), 0.98, P(0.56, 0.80), 0.72);
    ctx.quadraticCurveTo(P(0.34, 0.56), 0.86, P(0.05, 0.40), 0.86);
    ctx.quadraticCurveTo(P(-0.36, -0.16), 0.82, P(-0.62, -0.42), 0.52);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.4); ctx.lineWidth = 0.035; ctx.stroke();
    // a few comb strokes
    ctx.strokeStyle = rgba(shade(bc, -0.25), 0.5); ctx.lineWidth = 0.028;
    for (let i = 0; i < 3; i++) {
      const u = (i + 1) / 4;
      ctx.beginPath();
      ctx.moveTo(P(lerp(-0.4, 0.4, u), lerp(-0.2, 0.6, u)), 0.9);
      ctx.quadraticCurveTo(P(lerp(-0.35, 0.42, u), lerp(-0.14, 0.62, u)), 1.05, P(lerp(-0.2, 0.35, u), lerp(0.0, 0.55, u)), 1.14 + len * 0.6);
      ctx.stroke();
    }
  }

  // front hair + headgear
  hair3Front(ctx, style, t, seed, tn);
  if (style.crown === 'mukut') crown3Mukut(ctx, tn);
  else if (style.crown === 'tiara') crown3Tiara(ctx, tn);
  else if (style.crown === 'turban') crown3Turban(ctx, style, tn);
  if (style.peacock) peacock3(ctx, tn, t, seed);

  ctx.restore();
}

// almond eye with kohl wing. side: +1 near (face side), -1 far.
function eye3(ctx, x, y, w, h, open, f, style, side, tn) {
  const o = clamp(open, 0.06, 1.2);
  const inX = -side * w * 0.5, outX = side * w * 0.55; // inner corner toward nose
  ctx.save(); ctx.translate(x, y);
  // white
  ctx.beginPath();
  ctx.moveTo(inX, 0.015);
  ctx.quadraticCurveTo(side * w * 0.08, -h * o, outX, -h * 0.12);
  ctx.quadraticCurveTo(side * w * 0.10, h * (0.45 + 0.5 * o), inX, 0.015);
  ctx.closePath();
  ctx.fillStyle = '#f8f0e2'; ctx.fill();
  ctx.save(); ctx.clip();
  // iris: large, warm
  const ix = clamp(f.gaze.x + tn * 0.35, -1, 1) * w * 0.22 * (side === 1 ? 1 : 0.8);
  const iy = clamp(f.gaze.y + f.lowered * 0.8, -1, 1) * h * 0.5;
  ctx.fillStyle = style.iris || '#4a2c10';
  ctx.beginPath(); ctx.arc(ix, iy + h * 0.08, w * 0.30, 0, TAU); ctx.fill();
  ctx.fillStyle = '#150b04';
  ctx.beginPath(); ctx.arc(ix, iy + h * 0.08, w * 0.155, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath(); ctx.arc(ix - w * 0.09, iy - h * 0.08, w * 0.06, 0, TAU); ctx.fill();
  // upper-lid soft shadow
  ctx.fillStyle = 'rgba(90,50,25,0.20)';
  ctx.fillRect(-w * 0.6, -h * 1.3, w * 1.25, h * (1.3 - o * 0.72));
  ctx.restore();
  // kohl lash line + wing
  ctx.strokeStyle = '#1b0d05'; ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.40;
  ctx.beginPath();
  ctx.moveTo(inX, 0.01);
  ctx.quadraticCurveTo(side * w * 0.08, -h * (o + 0.18), outX, -h * 0.14);
  ctx.stroke();
  ctx.lineWidth = h * 0.30;
  ctx.beginPath();
  ctx.moveTo(outX, -h * 0.14);
  ctx.lineTo(outX + side * w * 0.18, -h * 0.34);
  ctx.stroke();
  // lower lid: faint
  ctx.strokeStyle = rgba('#1b0d05', 0.25); ctx.lineWidth = h * 0.13;
  ctx.beginPath();
  ctx.moveTo(inX * 0.85, h * 0.28);
  ctx.quadraticCurveTo(side * w * 0.08, h * (0.42 + 0.3 * o), outX * 0.85, h * 0.22);
  ctx.stroke();
  ctx.restore();
}

// brow: arched, tapered toward the inner end; raise>0 lifts, <0 knits (anger)
function brow3(ctx, x, y, len, raise, smile, side, heavy) {
  heavy = heavy || 1;
  const inX = x - side * len * 0.45;   // toward nose
  const outX = x + side * len * 0.55;  // toward face edge / temple
  const inY = y + (raise < 0 ? 0.11 * -raise : -raise * 0.09);
  const peakX = x + side * len * 0.12;
  const peakY = y - 0.075 - Math.max(raise, 0) * 0.07 - smile * 0.012;
  ctx.strokeStyle = '#20100a'; ctx.lineCap = 'round';
  ctx.lineWidth = 0.085 * heavy;
  ctx.beginPath();
  ctx.moveTo(outX, y + 0.015);
  ctx.quadraticCurveTo(peakX, peakY, lerp(peakX, inX, 0.6), lerp(peakY, inY, 0.65));
  ctx.stroke();
  ctx.lineWidth = 0.05 * heavy;
  ctx.beginPath();
  ctx.moveTo(lerp(peakX, inX, 0.55), lerp(peakY, inY, 0.6));
  ctx.lineTo(inX, inY);
  ctx.stroke();
}

function tilak3(ctx, x, y, kind) {
  if (kind === 'urdhva') {
    ctx.strokeStyle = '#e8dfc8'; ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.moveTo(x - 0.08, y - 0.12); ctx.quadraticCurveTo(x - 0.01, y + 0.14, x, y + 0.09); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 0.09, y - 0.12); ctx.quadraticCurveTo(x + 0.03, y + 0.12, x, y + 0.09); ctx.stroke();
    ctx.strokeStyle = '#c92f1d';
    ctx.beginPath(); ctx.moveTo(x + 0.005, y - 0.10); ctx.lineTo(x + 0.005, y + 0.06); ctx.stroke();
  } else if (kind === 'tripundra') {
    ctx.strokeStyle = '#e0d6bd'; ctx.lineWidth = 0.04;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x - 0.2, y + i * 0.08); ctx.quadraticCurveTo(x, y + i * 0.08 + 0.025, x + 0.21, y + i * 0.08); ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#c92f1d';
    ctx.beginPath(); ctx.ellipse(x, y, 0.04, 0.09, 0, 0, TAU); ctx.fill();
  }
}

function hair3Back(ctx, style, t, seed, tn) {
  const c = style.hairColor || '#170d08';
  const mode = style.hairstyle;
  ctx.fillStyle = c;
  // wild rakshasa mane — jagged mass behind the skull
  if (style.wildHair || style.mane || mode === 'mane') {
    ctx.beginPath(); ctx.moveTo(0.15, -1.02);
    for (let i = 0; i <= 13; i++) {
      const a = Math.PI * (0.5 + i / 13 * 1.16);
      const r = 1.16 + sfbm1(i * 1.7 + t * 0.4, seed) * 0.5;
      ctx.lineTo(Math.cos(a) * r - 0.16, Math.sin(a) * r * 1.28 + 0.2);
    }
    ctx.closePath(); ctx.fill();
    return;
  }
  if (mode === 'braid' || mode === 'long') {
    ctx.beginPath();
    ctx.moveTo(-0.1, -1.06);
    ctx.quadraticCurveTo(-1.12, -0.76, -1.06, 0.3);
    ctx.quadraticCurveTo(-1.02, 1.4, -0.74, 2.5 + sfbm1(t * 0.5, seed) * 0.08);
    ctx.quadraticCurveTo(-0.52, 2.72, -0.44, 2.3);
    ctx.quadraticCurveTo(-0.54, 1.2, -0.58, 0.3);
    ctx.quadraticCurveTo(-0.64, -0.5, 0.05, -0.94);
    ctx.closePath(); ctx.fill();
    if (mode === 'braid') {
      ctx.strokeStyle = 'rgba(255,235,200,0.11)'; ctx.lineWidth = 0.045;
      for (let i = 0; i < 6; i++) {
        const u = i / 6, yy = 0.5 + u * 1.7;
        ctx.beginPath();
        ctx.arc(-0.70 + sfbm1(u * 4, seed) * 0.03, yy, 0.13, -0.9, 1.6);
        ctx.stroke();
      }
    }
  } else if (mode === 'sagebun' || mode === 'bun') {
    ctx.beginPath(); ctx.ellipse(-0.55, -0.85, 0.4, 0.34, -0.45, 0, TAU); ctx.fill();
  }
}

function hair3Front(ctx, style, t, seed, tn) {
  const c = style.hairColor || '#170d08';
  const cHi = shade(c, 0.16);
  const mode = style.hairstyle;
  const P = (front, prof) => lerp(front, prof, tn);
  // wild rakshasa mane — spiky-topped mass low over the forehead
  if (style.wildHair || style.mane || mode === 'mane') {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(P(0.82, 0.92), -0.34);          // temple (face side)
    ctx.lineTo(P(0.70, 0.80), -0.80);
    ctx.lineTo(P(0.92, 1.02), -0.70);          // forward spike
    ctx.lineTo(P(0.50, 0.62), -0.96);
    ctx.lineTo(P(0.56, 0.68), -1.32);          // spike
    ctx.lineTo(P(0.18, 0.28), -1.00);
    ctx.lineTo(P(0.12, 0.22), -1.46);          // tall crown spike
    ctx.lineTo(-0.20, -1.04);
    ctx.lineTo(-0.34, -1.48);                  // spike
    ctx.lineTo(-0.64, -1.02);
    ctx.lineTo(-0.88, -1.30);                  // back spike
    ctx.lineTo(-1.02, -0.70);
    ctx.quadraticCurveTo(-1.06, -0.40, -0.90, -0.30);
    ctx.quadraticCurveTo(-0.5, -0.60, P(0.10, 0.30), -0.64);   // low forehead hairline
    ctx.quadraticCurveTo(P(0.55, 0.72), -0.58, P(0.82, 0.92), -0.34);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.4); ctx.lineWidth = 0.04; ctx.stroke();
    return;
  }
  if (mode === 'veil') {
    if (style.veil) {
      ctx.fillStyle = style.veil;
      ctx.beginPath();
      ctx.moveTo(P(0.66, 0.82), -0.56);
      ctx.quadraticCurveTo(0.1, -1.30, -0.72, -1.0);
      ctx.quadraticCurveTo(-1.24, -0.5, -1.14, 0.5);
      ctx.quadraticCurveTo(-1.09, 1.1, -0.94, 1.5);
      ctx.lineTo(-0.70, 1.4);
      ctx.quadraticCurveTo(-0.90, 0.5, -0.85, -0.2);
      ctx.quadraticCurveTo(-0.72, -0.90, -0.02, -0.94);
      ctx.quadraticCurveTo(0.4, -0.90, P(0.58, 0.74), -0.48);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#26130a', 0.5); ctx.lineWidth = 0.04; ctx.stroke();
    }
    // hair peek: smooth arc under the veil
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(P(0.56, 0.72), -0.44);
    ctx.quadraticCurveTo(0.0, -0.84, -0.60, -0.62);
    ctx.quadraticCurveTo(0.0, -0.66, P(0.50, 0.66), -0.36);
    ctx.closePath(); ctx.fill();
    return;
  }
  if (style.crown === 'turban') return; // turban replaces hair entirely
  // one solid cap: outer edge rides just above the skull, inner edge = hairline
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(P(0.80, 0.92), -0.30);                                // temple, face side
  ctx.quadraticCurveTo(P(0.55, 0.72), -0.62, P(0.08, 0.28), -0.70); // hairline low over the forehead (a tall bare brow reads balloon-like in close-up)
  ctx.quadraticCurveTo(-0.56, -0.80, -0.86, -0.48);                // hairline to back
  ctx.lineTo(-0.97, -0.44);                                        // out past silhouette
  ctx.quadraticCurveTo(-1.02, -0.98, -0.34, -1.18);                // back crown, proud of skull
  ctx.quadraticCurveTo(P(0.40, 0.62), -1.14, P(0.72, 0.86), -0.66);// over the top
  ctx.quadraticCurveTo(P(0.82, 0.94), -0.50, P(0.80, 0.92), -0.36);// down to temple
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#26130a', 0.45); ctx.lineWidth = 0.04; ctx.stroke();
  // single sheen band
  ctx.strokeStyle = rgba(cHi, 0.45); ctx.lineWidth = 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-0.10, -0.20, 0.80, -2.15, -1.45); ctx.stroke();
  if (mode === 'topknot') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-0.16, -1.24, 0.27, 0.21, -0.18, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(cHi, 0.5); ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.arc(-0.18, -1.24, 0.16, -2.6, -1.0); ctx.stroke();
    ctx.strokeStyle = '#8a2f1d'; ctx.lineWidth = 0.055;
    ctx.beginPath(); ctx.arc(-0.16, -1.09, 0.15, -0.5, 0.8); ctx.stroke();
  } else if (mode === 'sagebun') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-0.06, -1.20, 0.34, 0.26, -0.12, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(cHi, 0.4); ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.arc(-0.06, -1.20, 0.24, 2.6, 5.6); ctx.stroke();
  } else if (mode === 'braid' || mode === 'long') {
    ctx.strokeStyle = rgba('#000', 0.35); ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.moveTo(P(0.3, 0.44), -0.86); ctx.quadraticCurveTo(-0.1, -1.06, -0.48, -0.90); ctx.stroke();
    if (style.hairFlowers) {
      ctx.fillStyle = '#fdf4e0';
      for (let i = 0; i < 4; i++) {
        const u = i / 3;
        ctx.beginPath();
        ctx.arc(lerp(-0.76, -0.42, u), lerp(-0.05, -0.88, u), 0.05, 0, TAU);
        ctx.fill();
      }
    }
  }
}

function crown3Mukut(ctx, tn) {
  const P = (front, prof) => lerp(front, prof, tn);
  const g = ctx.createLinearGradient(-0.5, -1.6, 0.5, -0.6);
  g.addColorStop(0, GOLD_D); g.addColorStop(0.5, GOLD_L); g.addColorStop(1, GOLD_D);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(P(0.72, 0.86), -0.52);
  ctx.quadraticCurveTo(P(0.55, 0.68), -1.14, P(0.16, 0.24), -1.26);
  ctx.lineTo(P(0.0, 0.08), -1.66);
  ctx.lineTo(-0.32, -1.28);
  ctx.quadraticCurveTo(-0.85, -1.14, -0.94, -0.52);
  ctx.quadraticCurveTo(-0.1, -0.94, P(0.72, 0.86), -0.52);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#5c3a08', 0.9); ctx.lineWidth = 0.04; ctx.stroke();
  // band hugging the hairline
  ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(P(0.74, 0.88), -0.48); ctx.quadraticCurveTo(-0.1, -0.92, -0.92, -0.48); ctx.stroke();
  ctx.fillStyle = '#b41f2e'; ctx.beginPath(); ctx.arc(P(-0.06, 0.14), -1.22, 0.085, 0, TAU); ctx.fill();
  ctx.fillStyle = GOLD_L; ctx.beginPath(); ctx.arc(P(0.0, 0.08), -1.70, 0.05, 0, TAU); ctx.fill();
}
function crown3Tiara(ctx, tn) {
  const P = (front, prof) => lerp(front, prof, tn);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.055; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(P(0.62, 0.78), -0.50);
  ctx.quadraticCurveTo(-0.05, -1.02, -0.74, -0.60);
  ctx.stroke();
  ctx.fillStyle = '#f6ecd8';
  for (let i = 1; i < 5; i++) {
    const u = i / 5;
    ctx.beginPath();
    ctx.arc(lerp(P(0.62, 0.78), -0.74, u), -0.52 + Math.sin(u * Math.PI) * -0.26, 0.028, 0, TAU);
    ctx.fill();
  }
  // maang tikka on the hair parting
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.028;
  ctx.beginPath(); ctx.moveTo(P(0.02, 0.30), -0.90); ctx.quadraticCurveTo(P(0.01, 0.36), -0.64, P(0.01, 0.40), -0.52); ctx.stroke();
  ctx.fillStyle = GOLD_L; ctx.beginPath(); ctx.arc(P(0.01, 0.40), -0.48, 0.052, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b41f2e'; ctx.beginPath(); ctx.arc(P(0.01, 0.40), -0.48, 0.025, 0, TAU); ctx.fill();
}
function crown3Turban(ctx, style, tn) {
  const P = (front, prof) => lerp(front, prof, tn);
  const c1 = style.turbanColor || '#b3452c';
  // dome covering the whole crown
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(P(0.86, 0.98), -0.30);
  ctx.quadraticCurveTo(P(0.80, 0.92), -0.98, P(0.10, 0.24), -1.24);
  ctx.quadraticCurveTo(-0.70, -1.30, -0.96, -0.66);
  ctx.quadraticCurveTo(-1.06, -0.34, -0.94, -0.16);
  ctx.quadraticCurveTo(-0.4, -0.52, P(0.30, 0.44), -0.52);
  ctx.quadraticCurveTo(P(0.66, 0.80), -0.44, P(0.86, 0.98), -0.30);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#26130a', 0.7); ctx.lineWidth = 0.045; ctx.stroke();
  // wrap bands
  ctx.strokeStyle = rgba('#000', 0.20); ctx.lineWidth = 0.05;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-0.10 + i * 0.05, -0.42, 0.80 - i * 0.15, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  }
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(P(0.36, 0.52), -0.94, 0.075, 0, TAU); ctx.fill();
}
function peacock3(ctx, tn, t, seed) {
  ctx.save();
  ctx.translate(-0.18, -1.12); ctx.rotate(-0.45 + sfbm1(t * 0.7, seed) * 0.05);
  ctx.strokeStyle = '#2e6b2e'; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.08, -0.3, 0.04, -0.54); ctx.stroke();
  const g = ctx.createRadialGradient(0.04, -0.64, 0.01, 0.04, -0.64, 0.26);
  g.addColorStop(0, '#0d2c6e'); g.addColorStop(0.5, '#1f7a4d'); g.addColorStop(1, 'rgba(46,168,106,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0.04, -0.64, 0.18, 0.28, 0.08, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0d2c6e'; ctx.beginPath(); ctx.ellipse(0.04, -0.62, 0.06, 0.1, 0.08, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c98f1e'; ctx.beginPath(); ctx.ellipse(0.04, -0.58, 0.028, 0.04, 0.08, 0, TAU); ctx.fill();
  ctx.restore();
}

// ───────────────────────── FIGURE v3 ─────────────────────────
// Same pose semantics as v2 (sh/el/hip/knee are FK joint angles), but each
// limb renders as ONE smooth tapered ribbon through the implied joint.
const FIG3 = {
  H: 400, headR: 30, neck: 15,
  shoulderW: 47, waistW: 29, hipW: 35,
  upperArm: 56, foreArm: 50,   // comic canon: fingertips end at upper thigh, never gibbon-long
  thigh: 97, shin: 93, footL: 30,
};

function armChain3(shx, shy, a, build) {
  const ua = FIG3.upperArm * build, fa = FIG3.foreArm * build;
  const a1 = a.sh || 0;
  const ex = shx + Math.sin(a1) * ua, ey = shy + Math.cos(a1) * ua;
  const a2 = a1 + (a.el || 0);
  const wx = ex + Math.sin(a2) * fa, wy = ey + Math.cos(a2) * fa;
  return { sh: [shx, shy], el: [ex, ey], wr: [wx, wy], a1, a2 };
}

// one ribbon through sh→el→wr (or hip→knee→ankle); rounded elbow, no seams
function limbRibbon3(ctx, ch, w0, w1, w2, col, dark, noStroke) {
  const spine = [
    ch.sh,
    [lerp(ch.sh[0], ch.el[0], 0.82), lerp(ch.sh[1], ch.el[1], 0.82)],
    ch.el, ch.el,   // doubled: midpoint smoothing is forced THROUGH the joint — elbow/knee reads as an angle, not a hose-curve
    [lerp(ch.el[0], ch.wr[0], 0.18), lerp(ch.el[1], ch.wr[1], 0.18)],
    ch.wr,
  ];
  ribbon(ctx, spine, u => u < 0.5 ? lerp(w0, w1, smooth(u * 2)) : lerp(w1, w2, smooth((u - 0.5) * 2)));
  ctx.fillStyle = col; ctx.fill();
  ctx.save(); ctx.clip();
  const dx = ch.wr[0] - ch.sh[0], dy = ch.wr[1] - ch.sh[1];
  const L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const g = ctx.createLinearGradient(ch.el[0] + nx * w1 * 1.4, ch.el[1] + ny * w1 * 1.4, ch.el[0] - nx * w1 * 1.4, ch.el[1] - ny * w1 * 1.4);
  g.addColorStop(0, 'rgba(255,240,210,0.10)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(dark, 0.32));
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  if (!noStroke) { ctx.strokeStyle = rgba('#26130a', 0.55); ctx.lineWidth = 2.6; ctx.stroke(); }
}

// shaped hand library (unit ≈ 20px at s=1)
function hand3(ctx, x, y, ang, s, skin, kind, dark, claw) {
  claw = claw || kind === 'claw';
  if (kind === 'claw') kind = 'open';
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.fillStyle = skin;
  ctx.strokeStyle = rgba('#26130a', 0.62); ctx.lineWidth = 2.0 / s;
  ctx.beginPath();
  if (kind === 'fist' || kind === 'hold') {
    ctx.moveTo(-6, -1);
    ctx.quadraticCurveTo(-8, 6, -4, 10.5);
    ctx.quadraticCurveTo(1, 14, 6, 10);
    ctx.quadraticCurveTo(8.5, 5, 6, 0);
    ctx.quadraticCurveTo(0, -3.5, -6, -1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 1.1 / s;
    ctx.beginPath(); ctx.moveTo(-3.5, 3); ctx.quadraticCurveTo(0.5, 5, 4.5, 3.4); ctx.stroke();
    // thumb across
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-5.5, 2); ctx.quadraticCurveTo(-2, 7.5, 2.5, 6.5);
    ctx.quadraticCurveTo(-1, 9.5, -4.5, 7);
    ctx.quadraticCurveTo(-6.5, 5, -5.5, 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.5); ctx.stroke();
  } else if (kind === 'open' || kind === 'bless') {
    ctx.moveTo(-5.5, -1);
    ctx.quadraticCurveTo(-7.5, 7, -4, 14);
    ctx.quadraticCurveTo(-1, 17.5, 2.5, 16);
    ctx.quadraticCurveTo(7, 13, 6.5, 5);
    ctx.quadraticCurveTo(6, -1, 3, -2);
    ctx.quadraticCurveTo(-2, -3.5, -5.5, -1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // finger cuts (two)
    ctx.strokeStyle = rgba(dark, 0.55); ctx.lineWidth = 1.0 / s;
    ctx.beginPath(); ctx.moveTo(-1.4, 4); ctx.lineTo(-1.8, 13.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2.2, 3.5); ctx.lineTo(2.4, 12.5); ctx.stroke();
    // thumb
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-9.5, 3.5, -8.5, 8);
    ctx.quadraticCurveTo(-6.5, 8.5, -5, 6);
    ctx.quadraticCurveTo(-4.2, 3, -5, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.55); ctx.stroke();
  } else if (kind === 'point') {
    ctx.moveTo(-5.5, -1);
    ctx.quadraticCurveTo(-7, 5, -3.5, 9.5);
    ctx.quadraticCurveTo(1, 12.5, 5, 9);
    ctx.quadraticCurveTo(7, 5.5, 5.5, 1.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // index finger
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(1, 8); ctx.quadraticCurveTo(2.8, 15.5, 2.2, 18.5);
    ctx.quadraticCurveTo(0.4, 19.6, -0.6, 18);
    ctx.quadraticCurveTo(-1.5, 12, -2.2, 8.6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.55); ctx.stroke();
  } else if (kind === 'namaste') {
    ctx.moveTo(-3.5, -2);
    ctx.quadraticCurveTo(-5.5, 6, -3, 16);
    ctx.quadraticCurveTo(0, 19.5, 3, 16);
    ctx.quadraticCurveTo(5.5, 6, 3.5, -2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 1.0 / s;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.stroke();
  } else { // relaxed: soft mitt, slight curl
    ctx.moveTo(-5.5, -1.5);
    ctx.quadraticCurveTo(-7, 6, -3.5, 12.5);
    ctx.quadraticCurveTo(-0.5, 16, 3, 13.5);
    ctx.quadraticCurveTo(6.5, 9.5, 5, 2.5);
    ctx.quadraticCurveTo(3.5, -2.5, -5.5, -1.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 1.0 / s;
    ctx.beginPath(); ctx.moveTo(-0.6, 4.5); ctx.quadraticCurveTo(0.2, 9, -0.4, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2.6, 3.6); ctx.quadraticCurveTo(3.4, 7.5, 2.6, 10.6); ctx.stroke();
  }
  // claws: 3 short dark nail wedges at the fingertips (rakshasa)
  if (claw) {
    ctx.fillStyle = '#2a1a10'; ctx.strokeStyle = rgba('#26130a', 0.6); ctx.lineWidth = 0.9 / s;
    const nailY = (kind === 'open' || kind === 'bless') ? 15.5 : (kind === 'point' ? 18.5 : 12);
    const tips = [[-3.0, nailY], [0.2, nailY + 1.0], [3.4, nailY - 0.4]];
    for (let i = 0; i < 3; i++) {
      const nx = tips[i][0], ny = tips[i][1];
      ctx.beginPath();
      ctx.moveTo(nx - 1.7, ny - 1.4);
      ctx.lineTo(nx + 1.7, ny - 1.4);
      ctx.lineTo(nx + 0.2, ny + 5.2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

function foot3(ctx, x, y, s, facing, skin, dark) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * facing, s);
  ctx.fillStyle = skin;
  ctx.strokeStyle = rgba('#26130a', 0.62); ctx.lineWidth = 2.0 / s;
  ctx.beginPath();
  ctx.moveTo(-7, -13);                       // ankle back
  ctx.quadraticCurveTo(-9.5, -4, -7.5, -1);  // heel
  ctx.quadraticCurveTo(-2, 1.5, 10, 0.8);    // sole → toes
  ctx.quadraticCurveTo(15.5, 0.2, 15, -2.6); // toe tip
  ctx.quadraticCurveTo(9, -6.5, 2, -8.5);    // instep
  ctx.quadraticCurveTo(-2, -10, -2.5, -13);  // ankle front
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba(dark, 0.45); ctx.lineWidth = 1.0 / s;
  ctx.beginPath(); ctx.moveTo(8.5, -1.2); ctx.lineTo(8.2, -3.4); ctx.stroke();
  ctx.restore();
}

// main figure: same opts contract as drawFigure
function drawFigure3(ctx, o) {
  const st = o.style, pose = Object.assign(typeof defaultPose === 'function' ? defaultPose() : {}, o.pose);
  // idle life: no two figures ever stand identically, and nobody stands
  // rigid — tiny seed-fixed asymmetries + a slow breathing sway. Clone the
  // arm objects before nudging (callers may share/cache pose objects).
  if (!pose.noIdle) {
    const jA = hash1((o.seed || 1) * 7.31) - 0.5, jB = hash1((o.seed || 1) * 3.77) - 0.5;
    const sway = Math.sin((o.t || 0) * 0.9 + (o.seed || 1) * 5) * 0.02;
    pose.lean = (pose.lean || 0) + jA * 0.05;
    pose.headTilt = (pose.headTilt || 0) + jA * 0.04;
    pose.armF = Object.assign({}, pose.armF);
    pose.armB = Object.assign({}, pose.armB);
    pose.armF.el = (pose.armF.el || 0) + jB * 0.10 + sway;
    pose.armB.el = (pose.armB.el || 0) - jB * 0.08 + sway * 0.7;
  }
  const build = st.build || 1;
  const vS = st.heightScale || 1;
  const shMul = st.shoulderScale || 1;
  const female = !!st.female;
  const t = o.t || 0, seed = o.seed || 1;
  const skin = st.skin, dark = st.skinShade || shade(skin, -0.3);
  const OUT = rgba('#26130a', 0.55);

  if (o.shadow !== false) contactShadow(ctx, o.x, o.y + 4, 92 * o.s * build, 0.32);

  ctx.save();
  ctx.translate(o.x, o.y - (pose.bob || 0));
  ctx.scale(o.s * (o.facing || 1), o.s);
  ctx.scale(1, vS);

  const br = Math.sin(t * 1.5 + seed * 3) * 0.5 + 0.5;   // breath
  const headR = FIG3.headR * build * (female ? 0.95 : 1);
  const shW = FIG3.shoulderW * build * (female ? 0.8 : 1) * shMul;
  const hipW = FIG3.hipW * build * (female ? 1.1 : 1);
  const lean = pose.lean || 0;
  const chestDx = Math.sin(lean) * 95;                   // line of action: chest leads
  const hipDx = -chestDx * 0.25;                         // hips counter

  const hipY = -(FIG3.thigh + FIG3.shin) * build - 14;
  const shoulderY = hipY - 122 * build - br * 1.4;
  const waistY = lerp(shoulderY, hipY, 0.62);

  const shC = [chestDx, shoulderY + 6];                  // shoulder centre
  const hipC = [hipDx, hipY];

  // normalize proposed garb vocabulary to nearest implemented value
  let garb = st.garb;
  if (garb === 'forest') garb = female ? 'sari' : 'dhoti';
  else if (garb === 'hide') garb = 'dhoti';
  const skirted = garb === 'sari' || garb === 'robe';
  const bare = !female && (garb === 'dhoti' || garb === 'royal');
  const armW = 13.5 * build * (female ? 0.8 : 1);  // arms carry mass — noodle arms read mannequin
  const cm = st.clothMain || (female ? '#8c1f28' : '#ece2c8');

  // draws one full arm (ribbon + sleeve + ornaments + hand)
  function arm3(a, side) {  // side +1 near, -1 far
    const shx = shC[0] + shW * (side > 0 ? 0.60 : -0.58);
    const shy = shC[1] + (side > 0 ? 9 : 7);
    const col = side > 0 ? skin : shade(skin, -0.14);
    const ch = armChain3(shx, shy, a, build);
    limbRibbon3(ctx, ch, armW * 1.08, armW * 0.86, armW * 0.62, col, dark);
    // deltoid cap: hides the ribbon/torso seam, adds painterly form
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(shx, shy + 1, armW * 1.12, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(dark, side > 0 ? 0.20 : 0.28);
    ctx.beginPath(); ctx.arc(shx + 2, shy + 4, armW * 1.0, -0.3, 1.9); ctx.fill();
    // sari blouse sleeve over the upper arm
    if (female && garb === 'sari') {
      const sc = side > 0 ? cm : shade(cm, -0.16);
      const sl = { sh: ch.sh, el: [lerp(ch.sh[0], ch.el[0], 0.62), lerp(ch.sh[1], ch.el[1], 0.62)] };
      ribbon(ctx, [sl.sh, [lerp(sl.sh[0], sl.el[0], 0.5), lerp(sl.sh[1], sl.el[1], 0.5)], sl.el],
        u => lerp(armW * 1.3, armW * 0.95, u));
      ctx.fillStyle = sc; ctx.fill();
      ctx.strokeStyle = rgba('#26130a', 0.45); ctx.lineWidth = 1.8; ctx.stroke();
      if (st.clothAccent) {
        ctx.strokeStyle = st.clothAccent; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(sl.el[0], sl.el[1], armW * 0.9, ch.a1 + Math.PI / 2 - 1.1, ch.a1 + Math.PI / 2 + 1.1);
        ctx.stroke();
      }
    }
    if (st.armlets) {
      ctx.fillStyle = side > 0 ? GOLD : GOLD_D;
      ctx.beginPath();
      ctx.ellipse(lerp(ch.sh[0], ch.el[0], 0.48), lerp(ch.sh[1], ch.el[1], 0.48), armW * 1.0, 4.4, ch.a1, 0, TAU);
      ctx.fill();
    }
    if (female && st.bangles) {
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const u = 0.76 + i * 0.075;
        ctx.beginPath();
        ctx.ellipse(lerp(ch.el[0], ch.wr[0], u), lerp(ch.el[1], ch.wr[1], u), armW * 0.66, 2.8, ch.a2 + Math.PI / 2, 0, TAU);
        ctx.stroke();
      }
    }
    hand3(ctx, ch.wr[0], ch.wr[1], -ch.a2 + (a.wr || 0), build * (female ? 0.92 : 1.08), col, a.hand || 'relaxed', dark, st.claws);
    return ch;
  }

  // one extra (deity) arm as a single desaturated ribbon behind the mains
  function extraArm3(a, side) {
    const shx = shC[0] + shW * (side > 0 ? 0.86 : -0.82);
    const shy = shC[1] + 20;
    const col = shade(skin, -0.12);
    const ch = armChain3(shx, shy, a, build);
    limbRibbon3(ctx, ch, armW * 0.95, armW * 0.78, armW * 0.58, col, dark);
    hand3(ctx, ch.wr[0], ch.wr[1], -ch.a2 + (a.wr || 0), build * (female ? 0.88 : 1.0), col, a.hand || 'open', dark, st.claws);
    return ch;
  }

  // one full leg as a single ribbon + foot
  function leg3(Lg, front) {
    const L = Lg || { hip: 0, knee: 0 };
    const hx = hipC[0] + (front ? 7 : -8), hy = hipC[1] + 8;
    const th = FIG3.thigh * build, sh2 = FIG3.shin * build;
    const kx = hx + Math.sin(L.hip || 0) * th;
    const ky = hy + Math.cos(L.hip || 0) * th;
    const ax = kx + Math.sin((L.hip || 0) - (L.knee || 0)) * sh2;
    const ay = Math.min(ky + Math.cos((L.hip || 0) - (L.knee || 0)) * sh2, -13);
    const col = front ? skin : shade(skin, -0.12);
    const wTh = 15.5 * build * (female ? 1.02 : 1), wAn = 6.8 * build;
    if (!skirted) {
      limbRibbon3(ctx, { sh: [hx, hy], el: [kx, ky], wr: [ax, ay] }, wTh, wTh * 0.62, wAn, col, dark);
      if (female && st.anklets) {
        ctx.strokeStyle = GOLD; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(ax - 7, ay - 1); ctx.lineTo(ax + 7, ay - 1); ctx.stroke();
      }
      foot3(ctx, ax + 2, ay + 13, build, 1, col, dark);
    } else {
      foot3(ctx, ax + 2, Math.min(ay + 13, -1), build, 1, col, dark);
    }
    return [ax, ay];
  }

  // ── aura (deity halo / prabhāvalī) behind everything, via the class rig hook.
  //    Base Person.aura is a no-op; Deity.aura draws the halo. Storyboard/direct
  //    draws pass no rig, so no halo — matching the v2 behaviour exactly. ──
  if (o.rig && typeof o.rig.aura === 'function') {
    o.rig.aura(ctx, {
      build: build, leanDx: chestDx, shoulderY: shoulderY, hipY: hipY,
      waistY: waistY, shW: shW, hipW: hipW, t: t, seed: seed,
    });
  }

  // ── extra deity arms (st.arms >= 4): one single-ribbon pair behind the mains ──
  if (st.arms >= 4) {
    extraArm3(pose.armB2 || { sh: -0.85, el: 0.55, hand: 'open' }, -1);
    extraArm3(pose.armF2 || { sh: 0.95, el: 0.55, hand: 'bless' }, +1);
  }

  // ── far arm, far leg (behind) ──
  arm3(pose.armB || { sh: -0.12, el: 0.26 }, -1);
  leg3(pose.legB, false);

  // ── torso: one vase silhouette shoulders→waist→hips ──
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(shC[0] - shW, shC[1] + 2);
    ctx.quadraticCurveTo(chestDx - shW * 1.0, lerp(shoulderY, waistY, 0.45), lerp(chestDx, hipDx, 0.6) - FIG3.waistW * build, waistY);
    ctx.quadraticCurveTo(hipDx - hipW * 1.04, lerp(waistY, hipY, 0.6), hipDx - hipW, hipY + 8);
    ctx.quadraticCurveTo(hipDx, hipY + 15, hipDx + hipW, hipY + 8);
    ctx.quadraticCurveTo(hipDx + hipW * 1.04, lerp(waistY, hipY, 0.6), lerp(chestDx, hipDx, 0.6) + FIG3.waistW * build, waistY);
    ctx.quadraticCurveTo(chestDx + shW * 1.0, lerp(shoulderY, waistY, 0.45), shC[0] + shW, shC[1] + 2);
    // shoulder top: gentle trapezius into the neck
    ctx.quadraticCurveTo(chestDx + shW * 0.6, shC[1] - 13, chestDx + 11 * build, shC[1] - 15);
    ctx.lineTo(chestDx - 11 * build, shC[1] - 15);
    ctx.quadraticCurveTo(chestDx - shW * 0.6, shC[1] - 13, shC[0] - shW, shC[1] + 2);
    ctx.closePath();
  };
  torsoPath();
  const torsoCol = bare ? skin : cm;
  ctx.fillStyle = torsoCol; ctx.fill();
  ctx.save(); ctx.clip();
  const tg = ctx.createLinearGradient(chestDx - shW, 0, chestDx + shW, 0);
  tg.addColorStop(0, rgba(bare ? dark : shade(torsoCol, -0.4), 0.38));
  tg.addColorStop(0.42, 'rgba(0,0,0,0)');
  tg.addColorStop(1, 'rgba(255,240,205,0.10)');
  ctx.fillStyle = tg; ctx.fillRect(chestDx - shW * 1.6, shC[1] - 16, shW * 3.2, hipY - shC[1] + 40);
  if (bare) {
    ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(chestDx - shW * 0.42, shC[1] + 24); ctx.quadraticCurveTo(chestDx, shC[1] + 30, chestDx + shW * 0.42, shC[1] + 23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(chestDx + 2, shC[1] + 36); ctx.quadraticCurveTo(lerp(chestDx, hipDx, 0.5), waistY - 12, hipDx + 1, waistY + 6); ctx.stroke();
    if (st.sacredThread) {
      ctx.strokeStyle = '#f5ead2'; ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(chestDx - shW * 0.6, shC[1] + 10);
      ctx.quadraticCurveTo(lerp(chestDx, hipDx, 0.5) + 8, waistY - 26, hipDx + FIG3.waistW * build * 0.75, waistY + 4);
      ctx.stroke();
    }
  }
  ctx.restore();
  torsoPath(); ctx.strokeStyle = rgba('#26130a', 0.6); ctx.lineWidth = 2.6; ctx.stroke();

  // ── armor cuirass: horizontal plate courses + a gold breast-medallion ──
  if (garb === 'armor') {
    ctx.save(); torsoPath(); ctx.clip();
    ctx.strokeStyle = rgba('#5c3a08', 0.5); ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const yy = shC[1] + 22 + i * 22;
      ctx.beginPath(); ctx.moveTo(chestDx - shW, yy); ctx.quadraticCurveTo(chestDx, yy + 10, chestDx + shW, yy); ctx.stroke();
    }
    ctx.restore();
    const mx = chestDx, myy = shC[1] + 42;
    const mg = ctx.createRadialGradient(mx, myy, 1, mx, myy, 12);
    mg.addColorStop(0, GOLD_L); mg.addColorStop(1, GOLD_D);
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, myy, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * 11, myy + Math.sin(a) * 11); ctx.lineTo(mx + Math.cos(a) * 15, myy + Math.sin(a) * 15); ctx.stroke(); }
  }

  // ── lower garment (defines the figure's lower silhouette) ──
  garment3(ctx, st, hipC, hipY, hipW, build, t, seed, female, pose, garb);

  // ── near leg (over the dhoti wrap edge) ──
  leg3(pose.legF, true);

  // ── ornaments ──
  const lv = st.ornaments || 0;
  if (lv >= 1) {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(chestDx - 17, shC[1] + 5); ctx.quadraticCurveTo(chestDx, shC[1] + 23, chestDx + 17, shC[1] + 5); ctx.stroke();
  }
  if (lv >= 2) {
    beadArc(ctx, chestDx, shC[1] + 1, 27, Math.PI * 0.25, Math.PI * 0.75, 7, 2.2, '#f6e7bf');
  }
  if (st.mala) {
    ctx.strokeStyle = '#6d4423'; ctx.lineWidth = 2.8; ctx.setLineDash([3.2, 3]);
    ctx.beginPath(); ctx.moveTo(chestDx - 16, shC[1] + 7); ctx.quadraticCurveTo(chestDx, waistY - 14, chestDx + 16, shC[1] + 7); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── uttariya / scarf sash across the torso (behind the near arm) ──
  if (st.scarf) {
    const sc = st.scarf, fl = sfbm1(t * 0.9, seed + 7);
    ctx.save();
    ctx.fillStyle = rgba(sc, 0.94);
    ctx.beginPath();
    ctx.moveTo(chestDx - shW * 0.95, shC[1] - 2);
    ctx.quadraticCurveTo(chestDx - shW * 0.4, shC[1] + 40, chestDx + shW * 0.55, waistY - 10);
    ctx.lineTo(chestDx + shW * 0.85, waistY + 6);
    ctx.quadraticCurveTo(chestDx - shW * 0.2, shC[1] + 58, chestDx - shW * 0.78, shC[1] + 16 + fl * 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.4); ctx.lineWidth = 1.3; ctx.stroke();
    // hanging tail behind the far shoulder
    ctx.fillStyle = rgba(sc, 0.85);
    ctx.beginPath();
    ctx.moveTo(chestDx - shW * 0.95, shC[1] - 6);
    ctx.quadraticCurveTo(chestDx - shW * 1.3, shC[1] + 60 + fl * 10, chestDx - shW * 1.2 + fl * 10, shC[1] + 150 + fl * 14);
    ctx.quadraticCurveTo(chestDx - shW * 1.24 + fl * 12, shC[1] + 168, chestDx - shW * 1.02 + fl * 8, shC[1] + 158);
    ctx.quadraticCurveTo(chestDx - shW * 0.94, shC[1] + 70, chestDx - shW * 0.78, shC[1] + 16);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ── veil shoulder-drape (veiled women whose hairstyle isn't 'veil'; the
  //    'veil' hairstyle already draws a head-veil in drawHead3) ──
  if (st.veil && st.hairstyle !== 'veil') {
    const vc = st.veil;
    const vHeadCy = shoulderY - FIG3.neck * build - headR * 1.15;
    ctx.save();
    ctx.fillStyle = rgba(vc, 0.95);
    ctx.beginPath();
    ctx.moveTo(chestDx + headR * 0.9, vHeadCy + 6);
    ctx.quadraticCurveTo(chestDx + headR * 0.6, vHeadCy - headR * 1.1, chestDx - headR * 0.75, vHeadCy - headR * 0.92);
    ctx.quadraticCurveTo(chestDx - headR * 1.85, vHeadCy - headR * 0.1, chestDx - headR * 1.65, shoulderY + 66);
    ctx.quadraticCurveTo(chestDx - headR * 1.45, shoulderY + 120, chestDx - headR * 1.15, shoulderY + 142);
    ctx.lineTo(chestDx - headR * 0.4, shoulderY + 36);
    ctx.quadraticCurveTo(chestDx - headR * 0.9, vHeadCy + headR, chestDx + headR * 0.55, vHeadCy + headR * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.4); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
  }

  // ── near arm ──
  arm3(pose.armF || { sh: 0.14, el: 0.30 }, +1);

  // ── neck + head ──
  const headCy = shoulderY - FIG3.neck * build - headR * 0.9;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(chestDx - 10 * build, shoulderY - 12);
  ctx.quadraticCurveTo(chestDx - 9 * build, headCy + headR * 0.7, chestDx - 8 * build, headCy + headR * 0.5);
  ctx.lineTo(chestDx + 9 * build, headCy + headR * 0.5);
  ctx.quadraticCurveTo(chestDx + 10 * build, headCy + headR * 0.7, chestDx + 11 * build, shoulderY - 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#26130a', 0.4); ctx.lineWidth = 1.9; ctx.stroke();
  ctx.fillStyle = rgba(dark, 0.3);
  ctx.beginPath(); ctx.ellipse(chestDx + 0.5, headCy + headR * 0.62, 9.5 * build, 4, 0, 0, TAU); ctx.fill();

  ctx.save();
  ctx.translate(chestDx + Math.sin(pose.headTilt || 0) * 4, headCy);
  ctx.rotate((pose.headNod || 0) * 0.8 + (pose.headTilt || 0) * 0.4);
  const face = Object.assign({ turn: pose.headTurn == null ? 0.5 : clamp(pose.headTurn * 1.6, 0, 1) }, pose.face);
  drawHead4(ctx, headR, st, face, t, seed); // v4: approved heads-v7 port (lookdev/heads-v7)
  ctx.restore();

  if (st.wearGarland) {
    garlandStrand(ctx, chestDx - 24, shC[1] + 10, chestDx + 24, shC[1] + 10, 66, t, seed + 4, 0.72);
  }

  ctx.restore();
}

// lower garments v3: garment shapes ARE the silhouette
function garment3(ctx, st, hipC, hipY, hipW, build, t, seed, female, pose, garb) {
  garb = garb || st.garb;
  const sway = sfbm1(t * 0.65, seed + 2) * 5 + (pose.clothSway || 0);
  const spread = Math.abs(((pose.legF && pose.legF.hip) || 0) - ((pose.legB && pose.legB.hip) || 0));
  if (garb === 'sari' || garb === 'robe') {
    const cm = st.clothMain || '#8c1f28';
    // A-line skirt with drape S-curves
    ctx.beginPath();
    ctx.moveTo(hipC[0] - hipW - 1, hipY + 6);
    ctx.quadraticCurveTo(hipC[0] - hipW - 14, hipY + 90, hipC[0] - hipW - 22 + sway, -8);
    ctx.quadraticCurveTo(hipC[0] - hipW * 0.3, 4 + Math.abs(sway) * 0.4, hipC[0] + hipW * 0.6 + sway * 0.5, 2);
    ctx.quadraticCurveTo(hipC[0] + hipW + 20 + sway, -2, hipC[0] + hipW + 24 + sway, -10);
    ctx.quadraticCurveTo(hipC[0] + hipW + 13, hipY + 92, hipC[0] + hipW + 1, hipY + 6);
    ctx.quadraticCurveTo(hipC[0], hipY + 13, hipC[0] - hipW - 1, hipY + 6);
    ctx.closePath();
    const g = ctx.createLinearGradient(hipC[0] - hipW - 18, 0, hipC[0] + hipW + 20, 0);
    g.addColorStop(0, shade(cm, -0.3)); g.addColorStop(0.48, cm); g.addColorStop(1, shade(cm, -0.16));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.62); ctx.lineWidth = 2.4; ctx.stroke();
    // drape folds: 3 S-curves
    ctx.strokeStyle = rgba('#000', 0.16); ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const u = (i + 0.6) / 3.4, x0 = lerp(hipC[0] - hipW * 0.7, hipC[0] + hipW * 0.7, u);
      ctx.beginPath();
      ctx.moveTo(x0, hipY + 16);
      ctx.quadraticCurveTo(x0 - 8 + sway * 0.4, hipY * 0.5, x0 + 10 * (u - 0.5) * 4 + sway, -12);
      ctx.stroke();
    }
    // hem
    ctx.strokeStyle = st.clothAccent || GOLD; ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(hipC[0] - hipW - 21 + sway, -10);
    ctx.quadraticCurveTo(hipC[0], 3 + Math.abs(sway) * 0.4, hipC[0] + hipW + 23 + sway, -12);
    ctx.stroke();
    // pallu (sari only): diagonal drape from shoulder, falling behind the hip
    if (female && garb === 'sari' && st.pallu !== false) {
      const shY = hipY - 150 * build; // approx chest
      const fl = sfbm1(t * 0.7, seed + 9);
      ctx.fillStyle = shade(cm, 0.07);
      ctx.beginPath();
      ctx.moveTo(hipC[0] + hipW * 0.7, hipY - 6);
      ctx.quadraticCurveTo(hipC[0] + 6, shY + 60, hipC[0] - hipW * 0.62, shY + 4);
      ctx.quadraticCurveTo(hipC[0] - hipW * 1.05, shY + 44 + fl * 6, hipC[0] - hipW * 1.02 + fl * 8, shY + 150);
      ctx.quadraticCurveTo(hipC[0] - hipW * 0.96 + fl * 10, shY + 208, hipC[0] - hipW * 0.7 + fl * 8, hipY + 40);
      ctx.quadraticCurveTo(hipC[0] - hipW * 0.2, hipY - 16, hipC[0] + hipW * 0.55, hipY - 18);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#26130a', 0.4); ctx.lineWidth = 1.9; ctx.stroke();
      ctx.strokeStyle = st.clothAccent || GOLD; ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(hipC[0] + hipW * 0.68, hipY - 8);
      ctx.quadraticCurveTo(hipC[0] + 4, shY + 58, hipC[0] - hipW * 0.60, shY + 3);
      ctx.stroke();
    }
  } else {
    // dhoti v3: one wrap around both legs; slit + pleat; hem responds to stance
    const cm = st.clothMain || '#ece2c8';
    const len = st.dhotiLen || 205;
    const hem = Math.min(-10, hipY + len);
    const spreadW = 10 + spread * 46;
    ctx.beginPath();
    ctx.moveTo(hipC[0] - hipW - 2, hipY + 4);
    ctx.quadraticCurveTo(hipC[0] - hipW - 8, hipY + len * 0.6, hipC[0] - hipW * 0.9 - spreadW * 0.4 + sway * 0.5, hem);
    ctx.quadraticCurveTo(hipC[0] - hipW * 0.2, hem + 7, hipC[0] + 4, hem + 2);        // hem valley between legs
    ctx.quadraticCurveTo(hipC[0] + hipW * 0.5, hem + 6, hipC[0] + hipW * 0.9 + spreadW * 0.5 + sway, hem - 2);
    ctx.quadraticCurveTo(hipC[0] + hipW + 9, hipY + len * 0.55, hipC[0] + hipW + 2, hipY + 4);
    ctx.quadraticCurveTo(hipC[0], hipY + 11, hipC[0] - hipW - 2, hipY + 4);
    ctx.closePath();
    const g = ctx.createLinearGradient(hipC[0] - hipW, 0, hipC[0] + hipW + 8, 0);
    g.addColorStop(0, shade(cm, -0.26)); g.addColorStop(0.45, cm); g.addColorStop(1, shade(cm, -0.12));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.62); ctx.lineWidth = 2.4; ctx.stroke();
    // centre pleat fan (3 lines)
    ctx.strokeStyle = rgba('#000', 0.14); ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(hipC[0] + i * 4, hipY + 12);
      ctx.quadraticCurveTo(hipC[0] + i * 9 + sway * 0.4, hipY + len * 0.6, hipC[0] + i * 13 + sway * 0.7, hem + 2);
      ctx.stroke();
    }
    if (st.clothAccent) {
      ctx.strokeStyle = st.clothAccent; ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(hipC[0] - hipW * 0.9 - spreadW * 0.4 + sway * 0.5, hem + 1);
      ctx.quadraticCurveTo(hipC[0], hem + 8, hipC[0] + hipW * 0.9 + spreadW * 0.5 + sway, hem - 1);
      ctx.stroke();
    }
    // kamarband
    ctx.fillStyle = st.sash || shade(cm, -0.38);
    ctx.beginPath();
    ctx.moveTo(hipC[0] - hipW - 2, hipY + 2);
    ctx.quadraticCurveTo(hipC[0], hipY + 10, hipC[0] + hipW + 2, hipY + 2);
    ctx.lineTo(hipC[0] + hipW + 1, hipY + 11);
    ctx.quadraticCurveTo(hipC[0], hipY + 19, hipC[0] - hipW - 1, hipY + 11);
    ctx.closePath(); ctx.fill();
  }
}

// ============================================================================
// drawHead4 — approved heads-v7 port (see engine/lookdev/heads-v7/NOTES.md).
// Self-contained IIFE; exports the single global drawHead4. drawHead3 above is
// kept for test/look3.html comparison.
// ============================================================================
// head4.js — candidate 1 (FIDELITY-FIRST port of the approved heads-v7 look
// into the film engine's drawHead contract).
//
// drawHead4(ctx, R, style, face, t, seed)
//   - facing +x, turn 0(front)..1(profile); left-facing is the caller's x-flip.
//   - all v7 geometry is drawn verbatim in v7 units under ctx.scale(R*VS, R*VS)
//     with VS = 1.10/0.726 so the v7 chin (y=0.726) lands on the engine chin
//     (y=1.10) and the v7 eye line (0.03) lands near the engine eye line.
//   - turn model: tn<0.72 -> "family" construction where every coordinate is
//     lerp(front, threequarter, u) with u = tn/0.45 (damped extrapolation past
//     the approved 3/4); tn >= 0.95 -> pure v7 profile via a hard
//     staircase grows out of the smooth oval while interior nose ink fades and
//     the far eye slides behind the bridge.
// Self-contained: private copies of the v7 ink engine + core.js math live in
// this IIFE; only drawHead4 is exported.
(function () {
  'use strict';
  var TAU = Math.PI * 2;

  // ---------- core.js math (private copies, bit-identical) ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function norm(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function hash1(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function hexRGB(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shadeC(hex, amt) {
    var c = hexRGB(hex), f = amt < 0 ? 0 : 255, t = Math.abs(amt);
    return 'rgb(' + Math.round(lerp(c[0], f, t)) + ',' + Math.round(lerp(c[1], f, t)) + ',' + Math.round(lerp(c[2], f, t)) + ')';
  }

  // ---------- v7 palette ----------
  var INK = '#2a1608', INK2 = '#42260f', KOHL = '#180c05';
  // NOTE: pinned copies of paint.js GOLD/GOLD_D/GOLD_L — a paint.js palette
  // tune must be mirrored here or head vs body gold will fork.
  var GOLD = '#e8b64c', GOLD_D = '#a5741f', GOLD_L = '#ffe9a8';
  var CRIM = '#8c1f28', CRIM_L = '#a83a41';
  var TEAL = '#1f6f5c', MARI = '#e08a1e', WHT = '#f6efdd', LIP = '#8f2a24';

  // ---------- ctx threading ----------
  var ctx = null;

  // ---------- v7 ribbon ink engine (verbatim) ----------
  function cr(pts, samples) {
    samples = samples || 18; var P = pts, n = P.length, out = [];
    if (n < 3) { return P.map(function (p) { return { x: p.x, y: p.y, w: p.w }; }); }
    for (var i = 0; i < n - 1; i++) {
      var p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      for (var s = 0; s < samples; s++) {
        var t = s / samples, t2 = t * t, t3 = t2 * t;
        var x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        var y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
        var w = p1.w + (p2.w - p1.w) * t;
        out.push({ x: x, y: y, w: w });
      }
    }
    out.push({ x: P[n - 1].x, y: P[n - 1].y, w: P[n - 1].w });
    return out;
  }
  function ribbon(dense, color) {
    color = color || INK; var N = dense.length; if (N < 2) return;
    var L = [], R = [];
    for (var i = 0; i < N; i++) {
      var p = dense[i], dx, dy;
      if (i === 0) { dx = dense[1].x - p.x; dy = dense[1].y - p.y; }
      else if (i === N - 1) { dx = p.x - dense[N - 2].x; dy = p.y - dense[N - 2].y; }
      else { dx = dense[i + 1].x - dense[i - 1].x; dy = dense[i + 1].y - dense[i - 1].y; }
      var len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, hw = Math.max(p.w, 0.0005) / 2;
      L.push({ x: p.x + nx * hw, y: p.y + ny * hw }); R.push({ x: p.x - nx * hw, y: p.y - ny * hw });
    }
    ctx.beginPath();
    ctx.moveTo(L[0].x, L[0].y);
    for (i = 1; i < N; i++) ctx.lineTo(L[i].x, L[i].y);
    for (i = N - 1; i >= 0; i--) ctx.lineTo(R[i].x, R[i].y);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(dense[0].x, dense[0].y, Math.max(dense[0].w, 0.0005) / 2, 0, TAU); ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(dense[N - 1].x, dense[N - 1].y, Math.max(dense[N - 1].w, 0.0005) / 2, 0, TAU); ctx.fill();
  }
  function ink(pts, color, samples) { ribbon(cr(pts, samples), color); }
  function crClosed(pts, samples) {
    samples = samples || 18; var P = pts, n = P.length, out = [];
    for (var i = 0; i < n; i++) {
      var p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (var s = 0; s < samples; s++) {
        var t = s / samples, t2 = t * t, t3 = t2 * t;
        var x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        var y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
        out.push({ x: x, y: y });
      }
    }
    return out;
  }
  function blob(pts, color) { var d = crClosed(pts, 18); ctx.beginPath(); ctx.moveTo(d[0].x, d[0].y); for (var i = 1; i < d.length; i++) ctx.lineTo(d[i].x, d[i].y); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); }
  function pathClosed(pts) { var d = crClosed(pts, 18); ctx.beginPath(); ctx.moveTo(d[0].x, d[0].y); for (var i = 1; i < d.length; i++) ctx.lineTo(d[i].x, d[i].y); ctx.closePath(); }
  function dot(cx, cy, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); }
  function ring(cx, cy, r, lw, col) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }
  function petalFlower(cx, cy, r, petals, col, coreCol, rot, petalLen) {
    rot = rot || 0; petalLen = petalLen || 1;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.fillStyle = col;
    for (var i = 0; i < petals; i++) {
      var a = i / petals * TAU; ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.42, -r * 0.30 * petalLen, 0, -r * petalLen); ctx.quadraticCurveTo(-r * 0.42, -r * 0.30 * petalLen, 0, 0); ctx.fill(); ctx.restore();
    }
    if (coreCol) { ctx.fillStyle = coreCol; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // alpha-scoped draw
  function withA(a, fn) { if (a <= 0.004) return; ctx.save(); ctx.globalAlpha *= Math.min(a, 1); fn(); ctx.restore(); }
  function mirrored(fn) { ctx.save(); ctx.scale(-1, 1); fn(); ctx.restore(); }

  // =====================================================================
  // shared feature functions (v7 verbatim; ex carries the mapped face)
  // ex: {open, lowRaise, browMood, browY, mouth, part, gaze, gazeY, drop}
  // =====================================================================
  function eyeFront(x, y, flip, C, ex, gz) {
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    var op = ex.open, lr = ex.lowRaise || 0;
    var topA = -0.088 * op, topB = -0.100 * op;
    ctx.beginPath();
    ctx.moveTo(-0.175, -0.010);
    ctx.quadraticCurveTo(-0.02, topA, 0.135, 0.010);
    ctx.quadraticCurveTo(0.175, 0.028, 0.135, 0.045 - lr * 0.6);
    ctx.quadraticCurveTo(-0.02, 0.070 - lr, -0.175, -0.010);
    ctx.closePath(); ctx.fillStyle = '#f4e9d6'; ctx.fill();
    ctx.save(); ctx.clip();
    var iy = -0.008 + (1 - op) * 0.02 + (ex.gazeY || 0);
    dot(gz * 0.05 - 0.010, iy, 0.074, C.iris);
    dot(gz * 0.05 - 0.010, iy, 0.056, C.irisMid);
    dot(gz * 0.05 - 0.010, iy, 0.034, KOHL);
    dot(gz * 0.05 - 0.032, iy - 0.024, 0.017, 'rgba(255,241,220,0.92)');
    ctx.fillStyle = 'rgba(20,10,4,0.22)'; ctx.fillRect(-0.20, -0.09, 0.4, 0.05);
    ctx.restore();
    ink([
      { x: -0.178, y: -0.006, w: 0.006 },
      { x: -0.075, y: topB * 0.62 - 0.006, w: 0.032 },
      { x: 0.02, y: topB * 0.58 - 0.004, w: 0.026 },
      { x: 0.112, y: 0.002, w: 0.013 },
      { x: 0.136, y: 0.014, w: 0.006 }
    ], KOHL);
    ink([{ x: -0.158, y: -0.012, w: 0.020 }, { x: -0.238, y: -0.046, w: 0.012 }, { x: -0.312, y: -0.03, w: 0.002 }], KOHL);
    ink([{ x: -0.148, y: 0.010, w: 0.004 }, { x: -0.02, y: 0.064 - lr, w: 0.011 }, { x: 0.115, y: 0.040 - lr * 0.6, w: 0.005 }], KOHL);
    ctx.restore();
  }

  function brow34(x, y, flip, C, ex, sx) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -sx : sx, 1);
    var w0 = (C.female ? 0.018 : 0.028) * C.browMul;
    var innerY = C.female ? 0.004 : -0.004, peakY = C.female ? -0.078 : -0.086;
    var m = ex.browMood || 0;
    ink([
      { x: 0.155, y: innerY - m * 0.05, w: w0 * 0.9 },
      { x: 0.02, y: peakY + m * 0.03, w: w0 },
      { x: -0.145, y: -0.034, w: w0 * 0.72 },
      { x: -0.255, y: 0.028, w: w0 * 0.28 }
    ], KOHL);
    ctx.restore();
  }

  // front/family mouth with lipsPart support; v7 drawMouthFront verbatim when closed
  function mouthFront(C, ex) {
    var y = 0.46, w = C.female ? 0.098 : 0.088;
    var t = ex.mouth || 0, part = ex.part || 0;
    ctx.save(); ctx.translate(0, y);
    var cx = t * 0.050;
    if (part <= 0.08) {
      ctx.fillStyle = C.lip;
      ctx.beginPath();
      ctx.moveTo(-w, 0.0 - cx);
      ctx.quadraticCurveTo(-w * 0.5, -0.030 - cx * 0.3, 0, -0.006);
      ctx.quadraticCurveTo(w * 0.5, -0.030 - cx * 0.3, w, 0.0 - cx);
      ctx.quadraticCurveTo(w * 0.5, 0.052 + cx * 0.4, 0, 0.056 + (t < 0 ? 0.014 : 0));
      ctx.quadraticCurveTo(-w * 0.5, 0.052 + cx * 0.4, -w, 0.0 - cx);
      ctx.closePath(); ctx.fill();
      ink([{ x: -w * 0.96, y: 0.004 - cx, w: 0.005 }, { x: -w * 0.4, y: 0.012 - cx * 0.5, w: 0.012 }, { x: 0, y: 0.018 - cx * 0.2, w: 0.013 }, { x: w * 0.4, y: 0.012 - cx * 0.5, w: 0.012 }, { x: w * 0.96, y: 0.004 - cx, w: 0.005 }], INK2);
      ctx.fillStyle = 'rgba(255,214,196,0.20)';
      ctx.beginPath(); ctx.moveTo(-w * 0.6, 0.030); ctx.quadraticCurveTo(0, 0.05, w * 0.6, 0.030); ctx.quadraticCurveTo(0, 0.040, -w * 0.6, 0.030); ctx.fill();
    } else {
      // open mouth: dark interior between the v7 lip petals
      var oh = 0.045 + part * 0.105;
      ctx.fillStyle = '#4a1a12';
      ctx.beginPath();
      ctx.moveTo(-w, 0.0 - cx);
      ctx.quadraticCurveTo(-w * 0.5, -0.030 - cx * 0.3, 0, -0.006);
      ctx.quadraticCurveTo(w * 0.5, -0.030 - cx * 0.3, w, 0.0 - cx);
      ctx.quadraticCurveTo(w * 0.55, oh * 0.85 + cx * 0.3, 0, oh);
      ctx.quadraticCurveTo(-w * 0.55, oh * 0.85 + cx * 0.3, -w, 0.0 - cx);
      ctx.closePath(); ctx.fill();
      if (part > 0.3) { // upper teeth
        ctx.fillStyle = '#f4ead8';
        ctx.beginPath();
        ctx.moveTo(-w * 0.72, 0.002 - cx * 0.8);
        ctx.quadraticCurveTo(0, -0.012, w * 0.72, 0.002 - cx * 0.8);
        ctx.quadraticCurveTo(w * 0.4, 0.030, 0, 0.034);
        ctx.quadraticCurveTo(-w * 0.4, 0.030, -w * 0.72, 0.002 - cx * 0.8);
        ctx.closePath(); ctx.fill();
      }
      // upper lip line
      ink([{ x: -w * 0.98, y: -0.002 - cx, w: 0.006 }, { x: 0, y: -0.014, w: 0.012 }, { x: w * 0.98, y: -0.002 - cx, w: 0.006 }], INK2);
      // lower lip petal pushed down with the jaw
      ctx.fillStyle = C.lip;
      ctx.beginPath();
      ctx.moveTo(-w * 0.86, oh - 0.008);
      ctx.quadraticCurveTo(0, oh + 0.012, w * 0.86, oh - 0.008);
      ctx.quadraticCurveTo(w * 0.5, oh + 0.055, 0, 0.060 + oh);
      ctx.quadraticCurveTo(-w * 0.5, oh + 0.055, -w * 0.86, oh - 0.008);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,196,0.20)';
      ctx.beginPath(); ctx.moveTo(-w * 0.5, oh + 0.026); ctx.quadraticCurveTo(0, oh + 0.048, w * 0.5, oh + 0.026); ctx.quadraticCurveTo(0, oh + 0.036, -w * 0.5, oh + 0.026); ctx.fill();
    }
    ctx.restore();
  }

  function mustacheFront(mc) {
    ctx.save(); ctx.translate(0, 0.415); ctx.fillStyle = mc;
    for (var k = 0; k < 2; k++) {
      var s = k === 0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(s * 0.006, 0.006);
      ctx.quadraticCurveTo(s * 0.06, 0.030, s * 0.118, 0.020);
      ctx.quadraticCurveTo(s * 0.145, 0.010, s * 0.130, -0.014);
      ctx.quadraticCurveTo(s * 0.10, 0.005, s * 0.06, 0.004);
      ctx.quadraticCurveTo(s * 0.03, 0.0, s * 0.006, 0.006);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function earFront(x, y, C) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = C.skin;
    ctx.beginPath(); ctx.ellipse(0, 0, 0.055, 0.085, 0, 0, TAU); ctx.fill();
    ink([{ x: 0.02, y: -0.055, w: 0.006 }, { x: 0.03, y: 0, w: 0.009 }, { x: 0.012, y: 0.055, w: 0.006 }], INK);
    ctx.translate(0, 0.09);
    if (C.female) {
      dot(0, 0, 0.028, GOLD); ring(0, 0, 0.028, 0.01, GOLD_D);
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-0.05, 0.02); ctx.quadraticCurveTo(0, 0.14, 0.05, 0.02); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.008; ctx.stroke();
      for (var i = -2; i <= 2; i++) dot(i * 0.022, 0.055, 0.012, GOLD_L);
    } else { ring(0, 0.03, 0.045, 0.02, GOLD); ring(0, 0.03, 0.045, 0.008, GOLD_L); }
    ctx.restore();
  }

  function tearDrop(tx, ty) {
    ctx.fillStyle = 'rgba(200,224,242,0.75)';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + 0.033, ty + 0.09, tx, ty + 0.17);
    ctx.quadraticCurveTo(tx - 0.033, ty + 0.09, tx, ty);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(tx - 0.008, ty + 0.08, 0.012, 0, TAU); ctx.fill();
  }

  // =====================================================================
  // FAMILY construction (front -> three-quarter -> extrapolated), u=tn/0.45
  // every coordinate is L(front, threequarter)
  // =====================================================================
  // two-leg family interpolation: u = front->tq leg (theta 0..20deg, tn 0..0.30),
  // w = tq->deep leg (theta 20..42deg, tn 0.30..0.72). Deep set authored per
  // the v7 construction rules (far side in, near side out, chin with the turn).
  function LL(a, b, c, u, w) { return w > 0 ? b + (c - b) * w : a + (b - a) * u; }
  function famSil(u, w) {
    var T = function (a, b, c) { return LL(a, b, c, u, w); };
    return [
      { x: T(0.000, 0.030, 0.052), y: -0.602 },                      // 0 crown top
      { x: T(0.305, 0.300, 0.285), y: -0.512 },                      // 1 crown far
      { x: T(0.432, 0.420, 0.398), y: -0.225 },                      // 2 far temple
      { x: T(0.452, 0.442, 0.408), y: 0.075 },                       // 3 far cheekbone
      { x: T(0.370, 0.365, 0.342), y: T(0.335, 0.320, 0.315) },      // 4 far cheek
      { x: T(0.235, 0.240, 0.228), y: T(0.545, 0.535, 0.528) },      // 5 far jaw
      { x: T(0.078, 0.082, 0.148), y: T(0.712, 0.700, 0.692) },      // 6 chin
      { x: T(-0.078, -0.075, -0.005), y: T(0.712, 0.705, 0.702) },   // 7 chin near
      { x: T(-0.235, -0.230, -0.205), y: T(0.545, 0.600, 0.608) },   // 8 near jaw
      { x: T(-0.370, -0.375, -0.372), y: T(0.335, 0.375, 0.385) },   // 9 near cheek
      { x: T(-0.452, -0.462, -0.474), y: 0.075 },                    // 10 near cheekbone
      { x: T(-0.432, -0.442, -0.452), y: -0.225 },                   // 11 near temple
      { x: T(-0.305, -0.310, -0.318), y: -0.512 }                    // 12 crown near
    ];
  }

  function famBackHair(u, hairC) {
    var L = function (a, b) { return a + (b - a) * u; };
    ctx.fillStyle = hairC; ctx.beginPath();
    ctx.moveTo(L(-0.52, -0.50), -0.30);
    ctx.quadraticCurveTo(L(-0.60, -0.58), L(-0.86, -0.87), L(0, 0.03), -0.94);
    ctx.quadraticCurveTo(L(0.60, 0.62), -0.86, 0.52, -0.30);
    ctx.quadraticCurveTo(L(0.66, 0.63), 0.10, L(0.50, 0.46), 0.55);
    ctx.lineTo(L(0.30, 0.28), 0.55);
    ctx.quadraticCurveTo(L(0.46, 0.42), 0.0, L(0.40, 0.38), -0.30);
    ctx.lineTo(L(-0.40, -0.38), -0.30);
    ctx.quadraticCurveTo(L(-0.46, -0.45), 0.0, L(-0.30, -0.32), 0.55);
    ctx.lineTo(L(-0.50, -0.54), 0.55);
    ctx.quadraticCurveTo(-0.66, 0.10, L(-0.52, -0.50), -0.30);
    ctx.closePath(); ctx.fill();
  }

  function famJhumka(C) { // far jhumka sliver peeking past the far cheek (tq recipe)
    if (!C.female) return;
    dot(0.408, 0.205, 0.016, GOLD);
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(0.374, 0.228); ctx.quadraticCurveTo(0.408, 0.310, 0.442, 0.228); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.006; ctx.stroke();
    dot(0.394, 0.262, 0.007, GOLD_L); dot(0.410, 0.268, 0.007, GOLD_L); dot(0.426, 0.262, 0.007, GOLD_L);
  }

  function famNeck(C, u) {
    var L = function (a, b) { return a + (b - a) * u; };
    ctx.fillStyle = C.skin; ctx.beginPath();
    ctx.moveTo(L(-0.15, -0.13), L(0.66, 0.64)); ctx.lineTo(L(-0.17, -0.15), 0.98);
    ctx.lineTo(L(0.17, 0.19), 0.98); ctx.lineTo(L(0.15, 0.17), L(0.66, 0.64)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.shade; ctx.beginPath();
    ctx.moveTo(L(0.15, 0.17), L(0.66, 0.64)); ctx.lineTo(L(0.17, 0.19), 0.98); ctx.lineTo(L(-0.02, 0.0), 0.98);
    ctx.quadraticCurveTo(L(0.03, 0.05), L(0.80, 0.78), L(0.10, 0.12), L(0.68, 0.66)); ctx.closePath(); ctx.fill();
    withA(1 - smooth(norm(u, 0.4, 0.9)), function () { // front-only under-jaw cast
      ctx.fillStyle = C.shade; ctx.beginPath();
      ctx.moveTo(-0.13, 0.68); ctx.quadraticCurveTo(0, 0.78, 0.13, 0.68);
      ctx.lineTo(0.12, 0.74); ctx.quadraticCurveTo(0, 0.84, -0.12, 0.74); ctx.closePath(); ctx.fill();
    });
  }

  // FRONT shadow system (v7 front recipe, sliding right with the centerline)
  function famShadowFront(C, dx) {
    var shade = C.shade;
    blob([{ x: 0.014 + dx, y: -0.05 }, { x: 0.04 + dx, y: 0.06 }, { x: 0.058 + dx, y: 0.20 }, { x: 0.082 + dx, y: 0.252 }, { x: 0.046 + dx, y: 0.25 }, { x: 0.028 + dx, y: 0.10 }, { x: 0.004 + dx, y: -0.045 }], shade);
    blob([{ x: 0.50, y: -0.42 }, { x: 0.30, y: -0.30 }, { x: 0.235, y: -0.04 }, { x: 0.205, y: 0.20 }, { x: 0.265, y: 0.42 }, { x: 0.175, y: 0.55 }, { x: 0.50, y: 0.62 }], shade);
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.moveTo(-0.055 + dx, 0.302); ctx.quadraticCurveTo(dx, 0.335, 0.075 + dx, 0.305); ctx.quadraticCurveTo(0.015 + dx, 0.312, -0.055 + dx, 0.302); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.012 + dx, 0.522, 0.045, 0.014, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.12 + dx * 0.5, 0.60); ctx.quadraticCurveTo(0.05 + dx * 0.5, 0.70, 0.22 + dx * 0.5, 0.58); ctx.quadraticCurveTo(0.05 + dx * 0.5, 0.63, -0.12 + dx * 0.5, 0.60); ctx.fill();
  }

  // THREE-QUARTER shadow system (v7 tq recipe verbatim; dxe = extrapolation slide)
  function famShadowTq(C, dxe) {
    var shade = C.shade;
    ctx.save(); ctx.translate(dxe, 0);
    blob([{ x: 0.300, y: -0.235 }, { x: 0.352, y: -0.130 }, { x: 0.374, y: -0.030 }, { x: 0.344, y: -0.048 }, { x: 0.316, y: -0.140 }], shade);
    blob([{ x: 0.392, y: 0.100 }, { x: 0.376, y: 0.220 }, { x: 0.338, y: 0.330 }, { x: 0.290, y: 0.430 }, { x: 0.235, y: 0.505 }, { x: 0.155, y: 0.585 }, { x: 0.078, y: 0.642 }, { x: 0.046, y: 0.630 }, { x: 0.115, y: 0.585 }, { x: 0.188, y: 0.515 }, { x: 0.245, y: 0.432 }, { x: 0.285, y: 0.330 }, { x: 0.303, y: 0.220 }, { x: 0.318, y: 0.115 }, { x: 0.354, y: 0.078 }], shade);
    blob([{ x: 0.148, y: 0.150 }, { x: 0.162, y: 0.205 }, { x: 0.156, y: 0.248 }, { x: 0.142, y: 0.246 }, { x: 0.138, y: 0.198 }], shade);
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.moveTo(0.090, 0.296); ctx.lineTo(0.152, 0.296); ctx.lineTo(0.134, 0.322); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function famHairFraming(u, hairC) {
    var L = function (a, b) { return a + (b - a) * u; };
    ctx.fillStyle = hairC;
    ctx.beginPath();
    ctx.moveTo(L(-0.02, 0.045), -0.60);
    ctx.quadraticCurveTo(L(-0.30, -0.26), -0.66, L(-0.42, -0.425), L(-0.42, -0.41));
    ctx.quadraticCurveTo(-0.50, L(-0.20, -0.19), L(-0.45, -0.462), L(0.04, 0.05));
    ctx.quadraticCurveTo(L(-0.40, -0.415), -0.28, -0.20, L(-0.44, -0.445));
    ctx.quadraticCurveTo(L(-0.10, -0.09), L(-0.50, -0.505), L(-0.02, 0.045), L(-0.50, -0.505));
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(L(0.02, 0.105), -0.60);
    ctx.quadraticCurveTo(L(0.30, 0.31), L(-0.66, -0.65), L(0.42, 0.418), L(-0.42, -0.39));
    ctx.quadraticCurveTo(L(0.50, 0.468), L(-0.20, -0.19), L(0.45, 0.44), L(0.04, 0.03));
    ctx.quadraticCurveTo(0.40, L(-0.28, -0.27), L(0.20, 0.235), -0.44);
    ctx.quadraticCurveTo(L(0.10, 0.15), -0.50, L(0.02, 0.105), -0.50);
    ctx.closePath(); ctx.fill();
    ink([{ x: L(0, 0.05), y: -0.90, w: 0.004 }, { x: L(-0.005, 0.042), y: -0.66, w: 0.010 }, { x: L(0, 0.05), y: -0.58, w: 0.004 }], 'rgba(120,96,70,0.55)');
    ink([{ x: L(-0.30, -0.29), y: -0.62, w: 0.003 }, { x: L(-0.40, -0.395), y: -0.44, w: 0.007 }, { x: -0.44, y: -0.16, w: 0.003 }], 'rgba(110,88,62,0.40)');
    ink([{ x: L(0.31, 0.315), y: L(-0.62, -0.61), w: 0.003 }, { x: L(0.41, 0.405), y: L(-0.44, -0.43), w: 0.007 }, { x: L(0.45, 0.44), y: -0.16, w: 0.003 }], 'rgba(110,88,62,0.40)');
  }

  function famRibbons(S) {
    var tk = 0.028, md = 0.016, tn = 0.008;
    ink([
      { x: S[6].x, y: S[6].y, w: tk }, { x: S[5].x, y: S[5].y, w: tk },
      { x: S[4].x, y: S[4].y, w: tk * 0.95 }, { x: S[3].x, y: S[3].y, w: md },
      { x: S[2].x, y: S[2].y, w: tn }
    ], INK);
    ink([
      { x: S[6].x, y: S[6].y, w: tk * 0.66 }, { x: S[7].x, y: S[7].y, w: md },
      { x: S[8].x, y: S[8].y, w: md * 0.85 }, { x: S[9].x, y: S[9].y, w: tn },
      { x: S[10].x, y: S[10].y, w: tn * 0.8 }, { x: S[11].x, y: S[11].y, w: tn * 0.7 }
    ], INK);
  }

  // v7 nose strokes merged to one 5-point path (the family lerp needs equal
  // point counts) with widths x1.35 vs the sign-off sheet — approved film-scale
  // drift, not a transcription bug.
  function famNose(C, ex, u) {
    var L = function (a, b) { return a + (b - a) * u; };
    ink([
      { x: L(0.028, 0.112), y: L(0.050, 0.115), w: L(0.008, 0.004) },
      { x: L(0.050, 0.135), y: L(0.160, 0.205), w: L(0.0135, 0.008) },
      { x: L(0.030, 0.124), y: L(0.255, 0.252), w: L(0.016, 0.0135) },
      { x: L(-0.006, 0.082), y: L(0.295, 0.285), w: L(0.0135, 0.011) },
      { x: L(-0.050, 0.058), y: L(0.278, 0.272), w: L(0.007, 0.004) }
    ], 'rgba(60,30,12,0.62)');
    withA(1 - smooth(norm(u, 0.35, 0.85)), function () { // front nostril shading only near front
      ctx.fillStyle = 'rgba(45,22,8,0.5)';
      ctx.beginPath(); ctx.ellipse(-0.05 + u * 0.1, 0.285, 0.016, 0.011, 0.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.056 + u * 0.1, 0.285, 0.016, 0.011, -0.3, 0, TAU); ctx.fill();
    });
    if (C.female) {
      var nx = L(-0.078, 0.028), ny = L(0.276, 0.262), nr = L(0.017, 0.019);
      dot(nx, ny, nr, GOLD);
      if (u < 0.5) dot(nx, ny, 0.007, GOLD_L); else ring(nx, ny, nr, 0.004, GOLD_L);
    }
  }

  function famOrnament(C, u) {
    var L = function (a, b) { return a + (b - a) * u; };
    if (C.female) { dot(L(0, 0.096), -0.24, 0.028, '#c92f1d'); dot(L(0, 0.096), -0.24, 0.012, GOLD_L); }
    else {
      ctx.fillStyle = 'rgba(232,182,76,0.92)'; ctx.beginPath();
      ctx.moveTo(L(-0.022, 0.076), -0.34); ctx.lineTo(L(0.022, 0.120), -0.34);
      ctx.lineTo(L(0.012, 0.110), -0.14); ctx.lineTo(L(-0.012, 0.086), -0.14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b23016'; ctx.beginPath();
      ctx.moveTo(L(-0.008, 0.090), -0.30); ctx.lineTo(L(0.008, 0.106), -0.30);
      ctx.lineTo(L(0.006, 0.104), -0.16); ctx.lineTo(L(-0.006, 0.092), -0.16); ctx.closePath(); ctx.fill();
    }
  }

  function tiaraBandFront() { // v7 front tiara band (no tikka stem — handled by caller)
    ctx.beginPath(); ctx.moveTo(-0.44, -0.30); ctx.quadraticCurveTo(-0.30, -0.60, 0, -0.60); ctx.quadraticCurveTo(0.30, -0.60, 0.44, -0.30);
    ctx.lineWidth = 0.075; ctx.strokeStyle = GOLD; ctx.stroke();
    var pts = 7;
    for (var i = 0; i < pts; i++) {
      var uu = i / (pts - 1), bx = (uu - 0.5) * 0.88, by = -0.60 + Math.abs(uu - 0.5) * 0.62;
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(bx - 0.028, by + 0.01); ctx.lineTo(bx, by - 0.06); ctx.lineTo(bx + 0.028, by + 0.01); ctx.closePath(); ctx.fill();
      dot(bx, by - 0.02, 0.014, i % 2 ? CRIM : TEAL);
    }
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.010;
    ctx.beginPath(); ctx.moveTo(-0.44, -0.30); ctx.quadraticCurveTo(-0.30, -0.62, 0, -0.62); ctx.quadraticCurveTo(0.30, -0.62, 0.44, -0.30); ctx.stroke();
  }
  function famTiara(u) {
    var L = function (a, b) { return a + (b - a) * u; };
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.014;
    ctx.beginPath(); ctx.moveTo(L(0, 0.065), L(-0.58, -0.575)); ctx.lineTo(L(0, 0.092), L(-0.34, -0.335)); ctx.stroke();
    dot(L(0, 0.094), L(-0.33, -0.325), 0.03, GOLD); ring(L(0, 0.094), L(-0.33, -0.325), 0.03, 0.008, GOLD_D); dot(L(0, 0.094), L(-0.33, -0.325), 0.012, CRIM);
    ctx.save(); ctx.translate(L(0, 0.030), 0); ctx.scale(L(1, 0.985), 1);
    tiaraBandFront();
    ctx.restore();
  }
  function mukutFront() { // v7 drawMukutFront, EXCEPT alpha is composed (*=/÷) not assigned — do not 're-sync' to the sheet
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-0.42, -0.32); ctx.quadraticCurveTo(-0.30, -0.50, 0, -0.50); ctx.quadraticCurveTo(0.30, -0.50, 0.42, -0.32); ctx.quadraticCurveTo(0.30, -0.40, 0, -0.40); ctx.quadraticCurveTo(-0.30, -0.40, -0.42, -0.32); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.010; ctx.stroke();
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-0.30, -0.47); ctx.bezierCurveTo(-0.46, -0.62, -0.40, -0.80, -0.10, -0.86); ctx.quadraticCurveTo(0, -0.875, 0.10, -0.86); ctx.bezierCurveTo(0.40, -0.80, 0.46, -0.62, 0.30, -0.47); ctx.quadraticCurveTo(0, -0.56, -0.30, -0.47); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.012; ctx.stroke();
    ctx.fillStyle = GOLD_L; ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.moveTo(-0.16, -0.55); ctx.bezierCurveTo(-0.26, -0.66, -0.20, -0.80, -0.04, -0.84); ctx.bezierCurveTo(-0.10, -0.72, -0.10, -0.62, -0.08, -0.55); ctx.closePath(); ctx.fill(); ctx.globalAlpha /= 0.55;
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.008; ctx.beginPath(); ctx.moveTo(0, -0.52); ctx.lineTo(0, -0.85); ctx.stroke();
    dot(0, -0.42, 0.032, CRIM); ring(0, -0.42, 0.032, 0.008, GOLD_D); dot(-0.20, -0.40, 0.02, TEAL); dot(0.20, -0.40, 0.02, TEAL); dot(-0.32, -0.35, 0.016, CRIM); dot(0.32, -0.35, 0.016, CRIM);
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(0, -0.885, 0.028, 0.045, 0, 0, TAU); ctx.fill(); dot(0, -0.945, 0.02, CRIM);
  }
  function famMukut(u) {
    var L = function (a, b) { return a + (b - a) * u; };
    ctx.save(); ctx.translate(L(0, 0.030), 0); ctx.scale(L(1, 0.985), 1); mukutFront(); ctx.restore();
  }
  function simpleTurban(tc) {
    ctx.fillStyle = tc;
    ctx.beginPath();
    ctx.moveTo(-0.48, -0.20);
    ctx.quadraticCurveTo(-0.56, -0.72, 0, -0.80);
    ctx.quadraticCurveTo(0.56, -0.72, 0.48, -0.20);
    ctx.quadraticCurveTo(0.30, -0.34, 0, -0.36);
    ctx.quadraticCurveTo(-0.30, -0.34, -0.48, -0.20);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(42,22,8,0.55)'; ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.moveTo(-0.44, -0.34); ctx.quadraticCurveTo(0, -0.60, 0.44, -0.34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.36, -0.50); ctx.quadraticCurveTo(0, -0.72, 0.36, -0.50); ctx.stroke();
    dot(0, -0.44, 0.03, GOLD); dot(0, -0.44, 0.013, CRIM);
  }

  function famFangs(C, u) {
    var L = function (a, b) { return a + (b - a) * u; };
    var mx = L(0, 0.107), w = (C.female ? 0.098 : 0.088) * L(1, 0.97), my = 0.46;
    ctx.fillStyle = '#efe7d2'; ctx.strokeStyle = 'rgba(38,19,10,0.5)'; ctx.lineWidth = 0.012;
    var fang = function (fx) {
      ctx.beginPath(); ctx.moveTo(fx - 0.018, my + 0.008); ctx.lineTo(fx + 0.018, my + 0.008); ctx.lineTo(fx, my + 0.085); ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    fang(mx - w * 0.82); fang(mx + w * 0.82);
  }

  // the whole family head at parameter u (0=front, 1=approved 3/4, >1 extrapolated)
  function famHead(C, ex, u, w, tn) {
    var S = famSil(u, w);
    var L = function (a, b) { return a + (b - a) * u; };
    var T = function (a, b, c) { return LL(a, b, c, u, w); };
    var ue = u + w * 0.9; // linear extension for soft secondary elements
    // behind: back hair, far jhumka sliver, neck
    famBackHair(ue, C.hairC);
    withA(smooth(norm(u, 0.55, 0.95)) * (1 - smooth(norm(w, 0.35, 0.75))), function () { famJhumka(C); });
    famNeck(C, Math.min(ue, 1.4));
    // face fill + clipped shadows share one densified path
    ctx.save(); pathClosed(S); ctx.fillStyle = C.skin; ctx.fill(); ctx.clip();
    withA(1 - smooth(norm(u, 0.35, 0.85)), function () { famShadowFront(C, u * 0.10); });
    withA(smooth(norm(u, 0.40, 0.95)), function () { famShadowTq(C, Math.max(0, ue - 1) * 0.06); });
    ctx.restore();
    // hair framing (suppressed under a turban)
    if (!C.turban) famHairFraming(ue, C.hairC);
    // ears: near stays, far fades behind the turning cheek
    withA(1 - smooth(norm(u, 0.35, 0.80)), function () { earFront(L(0.455, 0.41), 0.06, C); });
    earFront(-0.455, 0.06, C);
    // silhouette ribbons on the same sil points
    famRibbons(S);
    // features on the single perspective centerline
    var bY = ex.browY || 0, drop = ex.drop || 0;
    brow34(T(-0.195, -0.085, -0.165), L(-0.155, -0.155) + bY + drop, false, C, ex, T(1, 1.04, 1.07));
    brow34(T(0.195, 0.273, 0.328), L(-0.155, -0.152) + bY + drop, true, C, ex, T(1, 0.74, 0.52));
    ctx.save(); ctx.translate(T(-0.195, -0.075, -0.155), 0.030 + drop); ctx.scale(T(1, 1.04, 1.07), 1); eyeFront(0, 0, false, C, ex, ex.gaze); ctx.restore();
    ctx.save(); ctx.translate(T(0.195, 0.263, 0.318), 0.030 + drop); ctx.scale(T(1, 0.72, 0.44), 1); eyeFront(0, 0, true, C, ex, -ex.gaze); ctx.restore();
    if (ex.weep > 0.05) {
      withA(clamp(ex.weep, 0, 1), function () {
        tearDrop(T(-0.195, -0.075, -0.155) + 0.02, 0.030 + drop + 0.10);
        if (tn < 0.5) tearDrop(T(0.195, 0.263, 0.318) + 0.02, 0.030 + drop + 0.10);
      });
    }
    ctx.save(); ctx.translate(0.055 * w, 0); famNose(C, ex, u); ctx.restore();
    ctx.save(); ctx.translate(T(0, 0.107, 0.178), 0); ctx.scale(T(1, 0.97, 0.94), 1); mouthFront(C, ex); ctx.restore();
    if (C.fangs) famFangs(C, u);
    if (C.moustache) {
      ctx.save(); ctx.translate(T(0, 0.105, 0.168), T(0, 0.158, 0.166)); ctx.scale(T(1, 0.84, 0.80), T(1, 0.62, 0.60)); mustacheFront(C.mouC); ctx.restore();
    }
    ctx.save(); ctx.translate(0.052 * w, 0); famOrnament(C, u); ctx.restore();
    // headgear
    if (C.crown === 'tiara') famTiara(Math.min(ue, 1.9));
    else if (C.crown === 'mukut') famMukut(Math.min(ue, 1.9));
    else if (C.crown === 'turban') simpleTurban(C.turbanC);
  }

  // =====================================================================
  // PROFILE pieces (v7 verbatim, authored facing -x; callers mirror)
  // =====================================================================
  function profSilPts(C) {
    var nd = C.female ? 0 : 0.020, jw = C.female ? 0 : 0.028, tp = C.female ? 0 : 0.014;
    return [
      { x: -0.055, y: -0.600 },
      { x: -0.275, y: -0.492 },
      { x: -0.402, y: -0.288 },
      { x: -0.424 - (C.female ? 0 : 0.024), y: -0.128 },
      { x: -0.432 + nd, y: -0.028 },
      { x: -0.462, y: 0.118 },
      { x: -0.500 + tp, y: 0.252 },
      { x: -0.458 + tp * 0.6, y: 0.298 },
      { x: -0.408, y: 0.322 },
      { x: -0.390, y: 0.372 },
      { x: -0.400, y: 0.408 },
      { x: -0.396, y: 0.450 },
      { x: -0.386, y: 0.492 },
      { x: -0.363, y: 0.528 },
      { x: -0.373, y: 0.582 },
      { x: -0.310 + jw * 0.4, y: 0.610 + jw * 0.2 },
      { x: -0.150 + jw, y: 0.618 + jw * 0.3 },
      { x: 0.055 + jw, y: 0.535 },
      { x: 0.205, y: 0.140 },
      { x: 0.270, y: -0.235 },
      { x: 0.130, y: -0.548 }
    ];
  }
  var PROF_WDS = [0.006, 0.010, 0.012, 0.012, 0.011, 0.013, 0.012, 0.010, 0.009, 0.009, 0.010, 0.009, 0.010, 0.009, 0.011, 0.013, 0.014, 0.011, 0.005];

  function profBackHair(hairC) {
    ctx.fillStyle = hairC; ctx.beginPath();
    ctx.moveTo(0.02, -0.62); ctx.quadraticCurveTo(0.42, -0.56, 0.43, -0.05); ctx.quadraticCurveTo(0.44, 0.34, 0.23, 0.60); ctx.lineTo(0.06, 0.60); ctx.quadraticCurveTo(0.27, 0.30, 0.245, -0.05); ctx.quadraticCurveTo(0.23, -0.44, -0.01, -0.52); ctx.closePath(); ctx.fill();
  }
  function profShadows(C) {
    var shade = C.shade;
    blob([{ x: -0.424, y: -0.030 }, { x: -0.448, y: 0.110 }, { x: -0.464, y: 0.230 }, { x: -0.420, y: 0.296 }, { x: -0.388, y: 0.296 }, { x: -0.392, y: 0.150 }, { x: -0.390, y: 0.010 }], shade);
    blob([{ x: -0.330, y: -0.320 }, { x: -0.180, y: -0.385 }, { x: -0.030, y: -0.428 }, { x: 0.010, y: -0.386 }, { x: -0.120, y: -0.345 }, { x: -0.270, y: -0.278 }], shade);
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.moveTo(-0.400, 0.326); ctx.quadraticCurveTo(-0.360, 0.354, -0.312, 0.330); ctx.quadraticCurveTo(-0.360, 0.338, -0.400, 0.326); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.386, 0.500); ctx.quadraticCurveTo(-0.350, 0.522, -0.314, 0.506); ctx.quadraticCurveTo(-0.352, 0.508, -0.386, 0.500); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.300, 0.585); ctx.quadraticCurveTo(-0.150, 0.655, 0.010, 0.582); ctx.quadraticCurveTo(-0.150, 0.618, -0.300, 0.585); ctx.fill();
  }
  function profHairCap(C) {
    blob([
      { x: -0.362, y: -0.308 }, { x: -0.285, y: -0.515 }, { x: -0.05, y: -0.63 }, { x: 0.17, y: -0.565 },
      { x: 0.305, y: -0.23 }, { x: 0.295, y: 0.10 }, { x: 0.235, y: 0.42 }, { x: 0.12, y: 0.56 },
      { x: 0.075, y: 0.44 }, { x: 0.13, y: 0.20 }, { x: 0.125, y: -0.02 }, { x: 0.075, y: -0.24 },
      { x: -0.025, y: -0.408 }, { x: -0.20, y: -0.40 }
    ], C.hairC);
    ink([{ x: -0.30, y: -0.42, w: 0.003 }, { x: -0.10, y: -0.50, w: 0.008 }, { x: 0.06, y: -0.475, w: 0.003 }], 'rgba(120,96,70,0.5)');
    ink([{ x: -0.20, y: -0.345, w: 0.002 }, { x: 0.00, y: -0.415, w: 0.006 }, { x: 0.10, y: -0.345, w: 0.002 }], 'rgba(120,96,70,0.35)');
    ink([{ x: 0.16, y: -0.10, w: 0.002 }, { x: 0.205, y: 0.16, w: 0.006 }, { x: 0.185, y: 0.38, w: 0.002 }], 'rgba(120,96,70,0.30)');
    if (C.female) ink([{ x: 0.048, y: -0.14, w: 0.003 }, { x: 0.070, y: 0.02, w: 0.030 }, { x: 0.058, y: 0.16, w: 0.018 }, { x: 0.030, y: 0.29, w: 0.002 }], C.hairC);
    else ink([{ x: 0.048, y: -0.14, w: 0.003 }, { x: 0.066, y: 0.00, w: 0.024 }, { x: 0.052, y: 0.13, w: 0.002 }], C.hairC);
  }
  function profEar(C) { // ear + hanging jewel, at natural profile position
    ctx.save(); ctx.translate(0.108, 0.128); ctx.fillStyle = C.skin;
    ctx.beginPath(); ctx.ellipse(0, 0, 0.040, 0.062, 0, 0, TAU); ctx.fill();
    ink([{ x: -0.008, y: -0.044, w: 0.005 }, { x: 0.024, y: -0.004, w: 0.008 }, { x: 0.002, y: 0.040, w: 0.005 }], INK);
    ctx.fillStyle = C.skin; ctx.beginPath(); ctx.ellipse(-0.010, 0.058, 0.020, 0.016, 0.2, 0, TAU); ctx.fill();
    ink([{ x: -0.024, y: 0.052, w: 0.003 }, { x: -0.004, y: 0.070, w: 0.005 }, { x: 0.014, y: 0.058, w: 0.003 }], INK);
    ctx.restore();
    if (C.female) {
      ctx.save(); ctx.translate(0.098, 0.214); dot(0, 0, 0.024, GOLD);
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-0.044, 0.016); ctx.quadraticCurveTo(0, 0.128, 0.044, 0.016); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.007; ctx.stroke();
      for (var i = -2; i <= 2; i++) dot(i * 0.019, 0.050, 0.010, GOLD_L);
      ctx.restore();
    } else {
      ring(0.098, 0.226, 0.042, 0.018, GOLD); ring(0.098, 0.226, 0.042, 0.007, GOLD_L);
      ctx.fillStyle = C.skin; ctx.beginPath(); ctx.ellipse(0.096, 0.186, 0.016, 0.012, 0.2, 0, TAU); ctx.fill();
    }
  }
  function profBrow(C, ex) {
    var bw = (C.female ? 0.013 : 0.022) * C.browMul, m = ex.browMood || 0, bY = (ex.browY || 0) + (ex.drop || 0);
    ink([{ x: -0.398, y: -0.058 + bY, w: bw * 0.4 }, { x: -0.310, y: -0.152 + bY - m * 0.03, w: bw }, { x: -0.212, y: -0.146 + bY, w: bw * 0.75 }, { x: -0.132, y: -0.096 + bY, w: bw * 0.15 }], KOHL);
  }
  function profEye(C, ex, gz) {
    ctx.save(); ctx.translate(-0.298, 0.028 + (ex.drop || 0));
    var op = ex.open, lr = ex.lowRaise || 0;
    ctx.beginPath();
    ctx.moveTo(-0.152, 0.008);
    ctx.quadraticCurveTo(-0.04, -0.066 * op, 0.10, -0.008);
    ctx.quadraticCurveTo(0.176, 0.016, 0.150, 0.032 - lr * 0.5);
    ctx.quadraticCurveTo(-0.03, 0.048 - lr, -0.152, 0.008);
    ctx.closePath(); ctx.fillStyle = '#f7eedd'; ctx.fill();
    ctx.save(); ctx.clip();
    var ix = -0.072 + gz * 0.03, iy = -0.004 + (1 - op) * 0.02 + (ex.gazeY || 0);
    dot(ix, iy, 0.058, C.iris); dot(ix, iy, 0.044, C.irisMid); dot(ix, iy, 0.027, KOHL);
    dot(ix - 0.016, iy - 0.018, 0.012, 'rgba(255,241,220,0.92)'); dot(ix + 0.012, iy + 0.014, 0.006, 'rgba(255,241,220,0.6)');
    ctx.fillStyle = 'rgba(20,10,4,0.16)'; ctx.fillRect(-0.16, -0.075, 0.36, 0.036); ctx.restore();
    ink([{ x: -0.152, y: 0.008, w: 0.006 }, { x: -0.052, y: -0.054 * op, w: 0.024 }, { x: 0.06, y: -0.026 * op, w: 0.017 }, { x: 0.148, y: 0.014, w: 0.009 }], KOHL);
    ink([{ x: 0.132, y: 0.006, w: 0.009 }, { x: 0.208, y: -0.020, w: 0.005 }, { x: 0.264, y: -0.018, w: 0.003 }, { x: 0.296, y: -0.032, w: 0.001 }], KOHL);
    ink([{ x: -0.128, y: 0.014, w: 0.003 }, { x: -0.01, y: 0.044 - lr, w: 0.005 }, { x: 0.120, y: 0.028 - lr * 0.5, w: 0.003 }], KOHL);
    ctx.restore();
  }
  function profNostril() {
    ink([{ x: -0.408, y: 0.318, w: 0.003 }, { x: -0.396, y: 0.332, w: 0.007 }, { x: -0.382, y: 0.336, w: 0.003 }], 'rgba(60,30,12,0.55)');
  }
  function profLips(C, ex) {
    var t = ex.mouth || 0, lc = t * 0.014, part = ex.part || 0;
    var dy = part > 0.08 ? 0.03 + part * 0.06 : 0; // jaw drop for talk
    ctx.fillStyle = C.lip;
    ctx.beginPath(); ctx.moveTo(-0.392, 0.402); ctx.quadraticCurveTo(-0.414, 0.414, -0.408, 0.436);
    ctx.lineTo(-0.396, 0.446); ctx.quadraticCurveTo(-0.366, 0.438, -0.356, 0.430);
    ctx.quadraticCurveTo(-0.372, 0.412, -0.392, 0.402); ctx.closePath(); ctx.fill();
    if (part > 0.08) { // open gap
      ctx.fillStyle = '#4a1a12';
      ctx.beginPath(); ctx.ellipse(-0.384, 0.452 + dy * 0.4, 0.036, 0.010 + part * 0.034, -0.18, 0, TAU); ctx.fill();
    }
    ctx.save(); ctx.translate(0, dy);
    ctx.fillStyle = C.female ? CRIM_L : '#8f3a2c';
    ctx.beginPath(); ctx.moveTo(-0.400, 0.454); ctx.quadraticCurveTo(-0.412, 0.470, -0.396, 0.490);
    ctx.quadraticCurveTo(-0.372, 0.496, -0.356, 0.484); ctx.quadraticCurveTo(-0.352, 0.462, -0.362, 0.452);
    ctx.quadraticCurveTo(-0.382, 0.458, -0.400, 0.454); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,196,0.22)'; ctx.beginPath(); ctx.ellipse(-0.384, 0.476, 0.014, 0.007, 0.15, 0, TAU); ctx.fill();
    ctx.restore();
    if (part <= 0.08) {
      ink([{ x: -0.414, y: 0.450 - lc, w: 0.005 }, { x: -0.386, y: 0.448 - lc * 0.6, w: 0.009 }, { x: -0.356, y: 0.436 - lc * 0.3, w: 0.004 }], INK2);
      dot(-0.350, 0.430 - lc * 0.3, 0.006, INK2);
    }
    ink([{ x: -0.384, y: 0.520 + dy, w: 0.003 }, { x: -0.366, y: 0.527 + dy, w: 0.005 }, { x: -0.350, y: 0.522 + dy, w: 0.003 }], 'rgba(60,30,12,0.38)');
  }
  function profNath(C) {
    if (C.female) { ring(-0.436, 0.344, 0.021, 0.007, GOLD); dot(-0.457, 0.344, 0.007, GOLD_L); }
  }
  function profMustache(mc) {
    ink([{ x: -0.396, y: 0.386, w: 0.006 }, { x: -0.330, y: 0.404, w: 0.026 }, { x: -0.252, y: 0.396, w: 0.020 }, { x: -0.192, y: 0.346, w: 0.007 }, { x: -0.176, y: 0.320, w: 0.003 }], mc);
  }
  function profThroat() {
    ink([{ x: -0.128, y: 0.760, w: 0.003 }, { x: -0.020, y: 0.788, w: 0.006 }, { x: 0.082, y: 0.762, w: 0.003 }], 'rgba(90,50,25,0.45)');
    ink([{ x: -0.140, y: 0.828, w: 0.003 }, { x: -0.020, y: 0.856, w: 0.006 }, { x: 0.092, y: 0.830, w: 0.003 }], 'rgba(90,50,25,0.45)');
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-0.180, 0.878); ctx.quadraticCurveTo(-0.020, 0.938, 0.128, 0.876);
    ctx.lineTo(0.124, 0.922); ctx.quadraticCurveTo(-0.020, 0.984, -0.184, 0.924); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.007; ctx.stroke();
    for (var i = 0; i < 7; i++) { var u = i / 6; dot(-0.168 + u * 0.285, 0.940 + Math.sin(u * Math.PI) * 0.026, 0.011, GOLD_L); }
  }
  function profOrnament(C) {
    if (C.female) { dot(-0.348, -0.190, 0.022, '#c92f1d'); dot(-0.348, -0.190, 0.009, GOLD_L); }
    else { ctx.fillStyle = 'rgba(232,182,76,0.9)'; ctx.beginPath(); ctx.moveTo(-0.352, -0.300); ctx.lineTo(-0.324, -0.300); ctx.lineTo(-0.338, -0.150); ctx.lineTo(-0.360, -0.150); ctx.closePath(); ctx.fill(); }
  }
  function profTiara() {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.070; ctx.beginPath(); ctx.moveTo(-0.315, -0.295); ctx.quadraticCurveTo(-0.06, -0.51, 0.235, -0.475); ctx.stroke();
    var pts = 5;
    for (var i = 0; i < pts; i++) {
      var u = i / (pts - 1), bx = -0.315 + u * 0.55, by = -0.295 - Math.sin(u * Math.PI) * 0.19;
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(bx - 0.026, by + 0.01); ctx.lineTo(bx, by - 0.055); ctx.lineTo(bx + 0.026, by + 0.01); ctx.closePath(); ctx.fill();
      dot(bx, by - 0.015, 0.012, i % 2 ? CRIM : TEAL);
    }
    dot(-0.298, -0.352, 0.022, GOLD); dot(-0.298, -0.352, 0.009, CRIM);
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.008; ctx.beginPath(); ctx.moveTo(-0.302, -0.336); ctx.lineTo(-0.325, -0.262); ctx.stroke();
    dot(-0.327, -0.250, 0.013, GOLD); dot(-0.327, -0.250, 0.006, CRIM);
  }
  function profMukut() {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.055; ctx.beginPath(); ctx.moveTo(-0.350, -0.252); ctx.quadraticCurveTo(-0.06, -0.470, 0.255, -0.405); ctx.stroke();
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.008; ctx.beginPath(); ctx.moveTo(-0.350, -0.228); ctx.quadraticCurveTo(-0.06, -0.446, 0.252, -0.382); ctx.stroke();
    dot(-0.312, -0.286, 0.018, CRIM); ring(-0.312, -0.286, 0.018, 0.007, GOLD_D);
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-0.30, -0.30); ctx.quadraticCurveTo(-0.12, -0.55, 0.22, -0.53); ctx.quadraticCurveTo(0.30, -0.50, 0.30, -0.44); ctx.quadraticCurveTo(0.05, -0.45, -0.24, -0.24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.010; ctx.stroke();
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-0.22, -0.44); ctx.bezierCurveTo(-0.34, -0.60, -0.24, -0.80, 0.02, -0.85); ctx.quadraticCurveTo(0.12, -0.86, 0.20, -0.83); ctx.bezierCurveTo(0.40, -0.74, 0.38, -0.58, 0.28, -0.46); ctx.quadraticCurveTo(0.04, -0.55, -0.22, -0.44); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.012; ctx.stroke();
    ctx.fillStyle = GOLD_L; ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.moveTo(-0.08, -0.52); ctx.bezierCurveTo(-0.16, -0.64, -0.06, -0.78, 0.06, -0.82); ctx.bezierCurveTo(-0.02, -0.70, -0.02, -0.60, -0.0, -0.52); ctx.closePath(); ctx.fill(); ctx.globalAlpha /= 0.5;
    dot(-0.02, -0.40, 0.028, CRIM); ring(-0.02, -0.40, 0.028, 0.008, GOLD_D);
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(0.09, -0.865, 0.026, 0.042, 0.08, 0, TAU); ctx.fill(); dot(0.10, -0.925, 0.018, CRIM);
  }
  function profBraid(C, flowers) {
    ctx.fillStyle = C.hairC; ctx.beginPath(); ctx.moveTo(0.28, 0.10); ctx.quadraticCurveTo(0.50, 0.35, 0.42, 0.75); ctx.quadraticCurveTo(0.38, 1.05, 0.26, 1.20); ctx.quadraticCurveTo(0.20, 1.05, 0.28, 0.75); ctx.quadraticCurveTo(0.32, 0.40, 0.18, 0.20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.012;
    for (var i = 0; i < 6; i++) { var t = i / 5, cy2 = 0.40 + t * 0.72; ctx.beginPath(); ctx.moveTo(0.22 + t * 0.06, cy2 - 0.03); ctx.quadraticCurveTo(0.32, cy2, 0.40 - t * 0.05, cy2 - 0.03); ctx.stroke(); }
    if (flowers) for (var j = 0; j < 4; j++) { var tt = j / 3, fx = 0.32 - tt * 0.05, fy = 0.40 + tt * 0.72; petalFlower(fx, fy, 0.045, 6, WHT, MARI, j * 0.5, 1); }
  }
  function profNeck(C) {
    ctx.fillStyle = C.skin; ctx.beginPath(); ctx.moveTo(-0.15, 0.58); ctx.lineTo(-0.21, 0.98); ctx.lineTo(0.12, 0.98); ctx.lineTo(0.15, 0.56); ctx.closePath(); ctx.fill();
  }
  function profNeckShade(C) {
    ctx.fillStyle = C.shade; ctx.beginPath(); ctx.moveTo(0.15, 0.56); ctx.lineTo(0.12, 0.98); ctx.lineTo(0.00, 0.98); ctx.quadraticCurveTo(0.06, 0.74, 0.08, 0.56); ctx.closePath(); ctx.fill();
  }

  // =====================================================================
  // PROFILE (tn >= 0.95): the pure v7 profile pieces, mirrored to face +x
  // =====================================================================
  function profileHead(C, ex) {
    var prof = profSilPts(C).map(function (p) { return { x: -p.x, y: p.y }; }); // mirrored to face +x

    // behind: hair mass, braid
    mirrored(function () { profBackHair(C.hairC); });
    if (C.female && C.braid) mirrored(function () { profBraid(C, C.flowers); });

    // neck + shade
    ctx.fillStyle = C.skin; ctx.beginPath();
    ctx.moveTo(-0.15, 0.56); ctx.lineTo(-0.12, 0.98); ctx.lineTo(0.21, 0.98); ctx.lineTo(0.15, 0.58); ctx.closePath(); ctx.fill();
    mirrored(function () { profNeckShade(C); });

    // face fill + shadows on one densification (fill then clip share the path)
    ctx.save(); pathClosed(prof); ctx.fillStyle = C.skin; ctx.fill(); ctx.clip();
    mirrored(function () { profShadows(C); });
    ctx.restore();

    // hair cap + sidelock, ear
    if (!C.turban) mirrored(function () { profHairCap(C); });
    mirrored(function () { profEar(C); });

    // silhouette ink
    var pts = [];
    for (var i = 0; i < 19; i++) pts.push({ x: prof[i].x, y: prof[i].y, w: PROF_WDS[i] });
    ink(pts, INK);

    // features
    mirrored(function () { profBrow(C, ex); });
    mirrored(function () { profEye(C, ex, -ex.gaze); });
    if (ex.weep > 0.05) withA(clamp(ex.weep, 0, 1), function () { tearDrop(0.298 + 0.02, 0.028 + (ex.drop || 0) + 0.10); });
    mirrored(function () { profNostril(); });
    if (C.female) { ring(0.436, 0.344, 0.021, 0.006, GOLD); dot(0.436 + 0.021, 0.344, 0.007, GOLD_L); }
    mirrored(function () { profLips(C, ex); });
    if (C.moustache) mirrored(function () { profMustache(C.mouC); });
    if (C.female) { dot(0.348, -0.190, 0.022, '#c92f1d'); dot(0.348, -0.190, 0.009, GOLD_L); }
    else {
      ctx.fillStyle = 'rgba(232,182,76,0.92)'; ctx.beginPath();
      ctx.moveTo(0.324, -0.30); ctx.lineTo(0.352, -0.30); ctx.lineTo(0.360, -0.15); ctx.lineTo(0.338, -0.15); ctx.closePath(); ctx.fill();
    }
    mirrored(function () { profThroat(); });

    // headgear
    if (C.crown === 'tiara') mirrored(function () { profTiara(); });
    else if (C.crown === 'mukut') mirrored(function () { profMukut(); });
    else if (C.crown === 'turban') simpleTurban(C.turbanC);
  }

  // =====================================================================
  // PUBLIC ENTRY — drawHead3-compatible
  // =====================================================================
  var VS = 1.10 / 0.726; // v7 unit -> engine head unit

  function drawHead4(c, R, style, face, t, seed) {
    style = style || {};
    var f = Object.assign({ turn: 0.5, smile: 0.1, eyeOpen: 1, gaze: { x: 0, y: 0 }, brow: 0, lipsPart: 0, lowered: 0 }, face);
    if (f.rage) { f.brow = (f.brow || 0) - f.rage * 0.7; f.lipsPart = Math.max(f.lipsPart || 0, 0.25 + f.rage * 0.3); }
    if (f.laugh) { f.smile = (f.smile || 0) + f.laugh * 0.6; f.lipsPart = Math.max(f.lipsPart || 0, f.laugh * 0.45); }
    var tn = clamp(f.turn, 0, 1);
    var gz = f.gaze || { x: 0, y: 0 };

    // blink — exactly the drawHead3 recipe. KEEP IN SYNC with drawHead3:32-34
    // (bakeoff-canvas.html pins this cadence; seated v3 heads must blink in
    // step with standing v4 heads in the same shot).
    var cyc = (t * 0.29 + hash1(seed) * 7) % 4.6;
    var blink = cyc < 0.13 ? Math.sin(cyc / 0.13 * Math.PI) : 0;
    var open = clamp((f.eyeOpen == null ? 1 : f.eyeOpen) - blink * 1.2, 0.06, 1.2);

    var female = !!style.female;
    var skin = style.skin || (female ? '#8a5330' : '#c08652');
    var crown = style.crown || style.headgear || null; // headgear: harness alias
    // TODO(next session): normalize crown vocabulary at the registry layer, not per-renderer
    if (crown === 'kirita') crown = 'mukut';
    if (crown !== 'mukut' && crown !== 'tiara' && crown !== 'turban') crown = null;
    var hairMode = style.hairstyle || style.mane || style.wildHair || null;
    var C = {
      female: female,
      skin: skin,
      shade: style.skinShade || shadeC(skin, -0.28),
      hairC: style.hairColor || '#170d08',
      iris: style.iris || (female ? '#251405' : '#2c1a09'),
      irisMid: style.iris ? shadeC(style.iris, 0.22) : (female ? '#3a2410' : '#43301a'),
      lip: style.lip || (female ? LIP : '#7c2c22'),
      browMul: style.heavyBrow ? 1.3 : 1,
      moustache: style.moustache !== undefined ? !!style.moustache : !female,
      mouC: style.beard === 'white' ? '#ddd4c4' : (style.beard === 'grey' ? '#9a9084' : '#241305'),
      fangs: !!(style.fangs || style.tusks),
      crown: crown,
      turban: crown === 'turban',
      turbanC: style.turbanColor || '#b3452c',
      braid: hairMode === 'braid' || hairMode === 'long', // positive map — 'veil'/'loose'/unknown must NOT grow a braid
      flowers: style.hairFlowers !== undefined ? !!style.hairFlowers : female
    };

    var sm = clamp(f.smile || 0, -1, 1);
    var ex = {
      open: open,
      lowRaise: Math.max(0, sm) * 0.03,
      browMood: clamp(f.brow || 0, -1, 1),
      browY: (f.brow || 0) > 0 ? f.brow * 0.018 : (f.brow || 0) * 0.008,
      mouth: sm,
      part: clamp(f.lipsPart || 0, 0, 1),
      gaze: clamp(gz.x || 0, -1, 1),
      gazeY: clamp((gz.y || 0) + (f.lowered || 0) * 0.8, -1.5, 1.5) * 0.02,
      drop: (f.lowered || 0) * 0.033,
      weep: f.weep || 0
    };

    var prev = ctx;
    ctx = c;
    c.save();
    c.scale(R * VS, R * VS);
    c.lineJoin = 'round'; c.lineCap = 'round';
    try {
      if (tn < 0.95) {
        var u = Math.min(tn / 0.30, 1);       // v7 three-quarter anchors at tn=0.30
        var w = tn <= 0.30 ? 0 : smooth(Math.min((tn - 0.30) / 0.42, 1)); // deep-3/4 by 0.72, held to the switch
        famHead(C, ex, u, w, tn);
      } else {
        // hard construction switch to the pure v7 profile. 0.95, not lower:
        // films DO animate headTurn up to ~0.88 mid-shot (winning-of-draupadi
        // scenes3), and crossing the switch mid-animation pops — keep every
        // animated turn inside the family band; only true-profile staging
        // (tests, tn~1) takes this branch.
        profileHead(C, ex);
      }
    } finally {
      c.restore();
      ctx = prev;
    }
  }

  // export
  if (typeof globalThis !== 'undefined') globalThis.drawHead4 = drawHead4;
  else if (typeof window !== 'undefined') window.drawHead4 = drawHead4;
})();

