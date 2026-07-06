// ── film.js ── Govardhana (Govardhana-dhāraṇa): four bespoke scenes + two
// storyboards. Grounded in 04-deep-dives/krishna-lila.md (Bhāgavata X.24–27).
// Storyboards (counsel, govinda) live in story.json (injected as STORY); this
// file supplies the bespoke fauna/weather/mountain scenes the storyboard schema
// can't express (drawCow cattle, drawRain, the umbrella-massif) and boots the film.
'use strict';

// ════════════════════════════════════════════════════════════════════
//  shared helpers
// ════════════════════════════════════════════════════════════════════
function gStyle(name) { return Person.of(name).style; }

// Vraja folk, varied so no two twin (director's addendum #2). Deterministic.
const VILLAGER_SKINS = ['#b07a48', '#9c6636', '#c08a58', '#a86a3c', '#bd8850', '#946037'];
const VILLAGER_CLOTHS = ['#c9702e', '#8ea24a', '#b23a5a', '#5f7bb0', '#d9b24a', '#a1554a'];
function shelterStyle(kind, i) {
  if (kind === 'nanda' || kind === 'gopi') return gStyle(kind);
  if (kind === 'priest') return Person.of({
    archetype: 'priest', skin: VILLAGER_SKINS[(i + 1) % VILLAGER_SKINS.length],
    hairColor: '#6f665a', beard: 'grey', beardLen: 0.34, clothMain: '#e6dcc2',
    build: 0.96, heightScale: 0.98,
  }).style;
  if (kind === 'boy') return Person.of({
    archetype: 'boy', skin: VILLAGER_SKINS[(i + 3) % VILLAGER_SKINS.length],
    clothMain: VILLAGER_CLOTHS[(i + 4) % VILLAGER_CLOTHS.length],
  }).style;
  const sk = VILLAGER_SKINS[i % VILLAGER_SKINS.length];
  return Person.of({
    archetype: 'villager', skin: sk, skinShade: shade(sk, -0.34),
    hairColor: (i % 4 === 3) ? '#6f665a' : '#1c130a',
    clothMain: VILLAGER_CLOTHS[i % VILLAGER_CLOTHS.length], sash: '#7a4a2c',
    moustache: i % 2, build: 0.95 + (i % 4) * 0.04,
    heightScale: 0.93 + ((i * 29) % 13) / 13 * 0.12, dhotiLen: 150,
  }).style;
}

// a small oil lamp (diyā): warm pool + clay bowl + flame
function drawDiya(ctx, x, y, s, t, seed) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  glowAdd(ctx, 0, -8, 60, 'rgba(255,168,72,0.75)', 0.95);
  ctx.fillStyle = '#4a2814'; ctx.strokeStyle = rgba('#241005', 0.6); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 6.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2e180c'; ctx.beginPath(); ctx.ellipse(0, -1.5, 12, 3.6, 0, 0, TAU); ctx.fill();
  flame(ctx, 0, -3, 13, t, seed, 1);
  ctx.restore();
}

// ── the Govardhana massif — muted-green foliage lobes over a rock body ──
// shared dome-of-foliage painter, in already-translated/scaled local coords.
function _govDome(ctx, HW, rimY, topY, pal, dim, t, seed) {
  const domeH = rimY - topY;
  const tone = [
    mixC(pal.dark, '#20261a', dim), mixC(pal.mid, '#28311f', dim), mixC(pal.lite, '#35402a', dim),
  ];
  // rock body behind lobes (so inter-lobe gaps read as stone, not sky)
  ctx.beginPath();
  ctx.moveTo(-HW, rimY);
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, x = -HW + u * 2 * HW, env = Math.sin(u * Math.PI);
    ctx.lineTo(x, rimY - env * domeH - sfbm1(u * 4 + seed, seed) * 30 * env);
  }
  ctx.lineTo(HW, rimY); ctx.closePath();
  const rg = ctx.createLinearGradient(0, topY, 0, rimY);
  rg.addColorStop(0, mixC('#6a6f5a', '#20241a', dim));
  rg.addColorStop(1, mixC('#43483a', '#161a12', dim));
  ctx.fillStyle = rg; ctx.fill();
  // foliage lobes: [cxFrac, yFrac(0 rim..1 top), rxFrac, ryFrac, toneIdx]
  const L = [
    [-0.74, 0.10, 0.42, 0.30, 0], [-0.30, 0.08, 0.52, 0.34, 0], [0.30, 0.08, 0.52, 0.34, 0], [0.74, 0.10, 0.42, 0.30, 0],
    [-0.52, 0.40, 0.46, 0.34, 1], [0.0, 0.36, 0.60, 0.42, 1], [0.52, 0.40, 0.46, 0.34, 1],
    [-0.26, 0.70, 0.42, 0.34, 2], [0.26, 0.70, 0.42, 0.34, 2], [0.0, 0.92, 0.36, 0.30, 2],
  ];
  for (let i = 0; i < L.length; i++) {
    const d = L[i];
    const cx = d[0] * HW * 0.92, cy = rimY - d[1] * domeH;
    const wob = sfbm1(t * 0.4 + i * 2, seed + i) * 7;
    _foliageLobe(ctx, cx + wob, cy, d[2] * HW, d[3] * domeH, seed + i * 4, tone[d[4]], pal.ink);
  }
  _leafTicks(ctx, 0, rimY - domeH * 0.55, HW * 0.86, domeH * 0.5, 40, seed + 7, pal.tick, t);
}

// hill mode — Govardhana sitting on the horizon at (cx, baseY)
function drawGovardhana(ctx, cx, baseY, sc, tod, t, seed, dim) {
  const pal = _foliage(tod);
  ctx.save(); ctx.translate(cx, baseY); ctx.scale(sc, sc);
  contactShadow(ctx, 0, 6, 620, 0.28);
  _govDome(ctx, 620, 0, -560, pal, dim || 0, t, seed);
  ctx.restore();
}

// umbrella mode — Govardhana held aloft: broad canopy tapering to the rocky
// peak that rests on the finger, warm-lit belly, green dome above.
function drawUmbrella(ctx, cx, cy, sc, tod, t, seed, opts) {
  opts = opts || {};
  const pal = _foliage(tod);
  ctx.save(); ctx.translate(cx, cy + (opts.bob || 0)); ctx.scale(sc, sc);
  const HW = 1090, rimY = 92, topY = -470, peakY = opts.peakY == null ? 286 : opts.peakY;
  // rocky underbelly: broad at the rim, tapering to a central point (the peak
  // the little finger holds up)
  ctx.beginPath();
  ctx.moveTo(-HW, rimY);
  ctx.lineTo(-HW * 0.6, rimY + 44);
  ctx.quadraticCurveTo(-HW * 0.3, rimY + 118, -84, peakY - 42);
  ctx.quadraticCurveTo(-26, peakY, 0, peakY);
  ctx.quadraticCurveTo(26, peakY, 84, peakY - 42);
  ctx.quadraticCurveTo(HW * 0.3, rimY + 118, HW * 0.6, rimY + 44);
  ctx.lineTo(HW, rimY);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, rimY - 30, 0, peakY);
  bg.addColorStop(0, '#41463a'); bg.addColorStop(0.55, '#2e3326'); bg.addColorStop(1, '#181c14');
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 3; ctx.stroke();
  // strata lines following the taper
  ctx.strokeStyle = 'rgba(20,24,16,0.45)'; ctx.lineWidth = 2.2;
  for (let i = 1; i <= 3; i++) {
    const yy = rimY + 60 + i * 34, spread = HW * (0.62 - i * 0.14);
    ctx.beginPath(); ctx.moveTo(-spread, yy - 18); ctx.quadraticCurveTo(0, yy + 30, spread, yy - 18); ctx.stroke();
  }
  // warm underlight — the sheltered crowd's lamps wash the stone belly
  if (opts.underlight) {
    glowAdd(ctx, 0, rimY + 140, HW * 0.72, 'rgba(255,176,84,0.5)', opts.underlight);
    glowAdd(ctx, 0, peakY - 60, HW * 0.34, 'rgba(255,150,60,0.4)', opts.underlight * 0.85);
  }
  // green canopy on top
  _govDome(ctx, HW, rimY, topY, pal, opts.dim || 0, t, seed);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════
//  Braj backdrop shared by the pastoral + fury scenes (storm 0..1)
// ════════════════════════════════════════════════════════════════════
function brajBackdrop(ctx, T, storm) {
  const s = storm;
  vgrad(ctx, 0, 0, W, H, [
    [0, mixC('#5b86bf', '#151d2c', s)], [0.5, mixC('#a6c4de', '#242c3a', s)], [1, mixC('#e2efdc', '#39424e', s)],
  ]);
  // sun (fades as the storm gathers)
  if (s < 0.7) {
    const sa = 1 - s / 0.7;
    glowAdd(ctx, 430, 214, 340, 'rgba(255,240,196,0.5)', 0.55 * sa);
    ctx.save(); ctx.globalAlpha = sa; ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.arc(430, 214, 54, 0, TAU); ctx.fill(); ctx.restore();
    if (sa > 0.3) godRays(ctx, 430, 214, 1.15, 0.5, 1200, '#ffe6a8', 0.10 * sa, T, 4);
  }
  // clouds — white and high in fair weather, dark and massing in storm
  const nC = 3 + Math.round(s * 3);
  for (let i = 0; i < nC; i++) {
    const cx = ((T * 7 + i * 430) % (W + 940)) - 470;
    const cy = 132 + (i % 3) * 58 - s * 26;
    _cloud(ctx, cx, cy, 500 + s * 190, 58 + s * 46, mixC('#fff4e6', '#141a24', s), 0.5 + 0.36 * s);
  }
  // Govardhana on the horizon
  drawGovardhana(ctx, 1310, 806, 0.72, s > 0.4 ? 'dusk' : 'day', T, 3, s * 0.9);
  // distant treeline + fields
  vgrad(ctx, -100, 700, W + 200, 150, [[0, mixC('#6f8a3a', '#232c1c', s)], [1, mixC('#587028', '#1a2214', s)]]);
  ctx.fillStyle = mixC('#3f5320', '#141c10', s);
  for (let i = 0; i < 11; i++) { const tx = i * 190 + snoise1(i * 3, 5) * 40; ctx.beginPath(); ctx.ellipse(tx, 706, 62, 42, 0, 0, TAU); ctx.fill(); }
  // green pasture ground
  vgrad(ctx, 0, 748, W, H - 748, [[0, mixC('#728e3c', '#242e1a', s)], [1, mixC('#43581f', '#12160d', s)]]);
  // a hut at the edge of the village
  drawHut(ctx, { x: 322, y: 902, s: 0.6, t: T, seed: 12, lamp: s > 0.45, smoke: s < 0.4 });
}

// look-up-in-wonder / relief pose for a sheltering figure
function lookUpPose(k, up, t, seed) {
  return posemix(POSES.stand(1, t, seed), {
    headNod: -0.12 * up, lean: -0.03 * up,
    armF: { sh: 0.4 + 0.5 * up, el: 0.9, wr: 0.1, hand: 'open' },
    face: { eyeOpen: 1, brow: 0.24 * up, gaze: { x: 0, y: -0.5 * up }, smile: 0.12, lipsPart: 0.2 * up },
  }, clamp(k, 0, 1));
}

// ════════════════════════════════════════════════════════════════════
//  the sheltered congregation (shared by lift + vigil for continuity)
// ════════════════════════════════════════════════════════════════════
const SHELTER = [
  { x: 470, y: 1016, s: 0.62, f: 1, kind: 'priest', seed: 31 },
  { x: 648, y: 1010, s: 0.66, f: 1, kind: 'villager', seed: 32 },
  { x: 806, y: 1004, s: 0.64, f: 1, kind: 'nanda', seed: 33 },
  { x: 1156, y: 1006, s: 0.44, f: -1, kind: 'boy', seed: 34 },
  { x: 1276, y: 1012, s: 0.66, f: -1, kind: 'gopi', seed: 35 },
  { x: 1446, y: 1016, s: 0.6, f: -1, kind: 'villager', seed: 36 },
];
const CATTLE = [
  { x: 560, y: 1034, s: 0.50, f: 1, coat: '#d8ccb4', seed: 41 },
  { x: 1352, y: 1036, s: 0.52, f: -1, coat: '#b98a52', seed: 42 },
  { x: 1176, y: 1048, s: 0.34, f: -1, coat: '#e6d6b4', calf: true, seed: 43 },
  { x: 726, y: 1050, s: 0.46, f: 1, coat: '#c9a878', seed: 44 },
];
function drawShelterGround(ctx, cx, groundY, warmK) {
  // warm dry-circle pool of light on the ground
  ctx.save();
  const g = ctx.createRadialGradient(cx, groundY - 40, 40, cx, groundY - 20, 720);
  g.addColorStop(0, `rgba(255,196,110,${0.34 * warmK})`);
  g.addColorStop(0.6, `rgba(230,150,70,${0.16 * warmK})`);
  g.addColorStop(1, 'rgba(120,70,30,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, groundY + 6, 740, 150, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawCongregation(ctx, T, up, warmK) {
  // cattle first (behind the people)
  for (const c of CATTLE) drawCow(ctx, { x: c.x, y: c.y, s: c.s, facing: c.f, t: T, seed: c.seed, gait: 'idle', coat: c.coat, calf: c.calf });
  // diyās nestled among them
  drawDiya(ctx, 640, 1040, 0.9, T, 61);
  drawDiya(ctx, 1240, 1044, 0.95, T, 62);
  drawDiya(ctx, 900, 1052, 0.8, T, 63);
  // the people
  for (let i = 0; i < SHELTER.length; i++) {
    const p = SHELTER[i];
    const st = shelterStyle(p.kind, p.seed);
    let pose;
    if (p.kind === 'nanda') pose = posemix(POSES.namaste(1, T, p.seed), { headNod: -0.1, face: { gaze: { x: 0, y: -0.4 }, smile: 0.18 } }, 0.5 * up);
    else if (p.kind === 'boy') pose = posemix(POSES.stand(1, T, p.seed), { headNod: -0.16, armF: { sh: 0.9, el: 0.6, hand: 'open' }, face: { eyeOpen: 1.1, brow: 0.3, gaze: { x: 0, y: -0.55 }, lipsPart: 0.3 } }, up);
    else pose = lookUpPose(1, up, T + i * 0.3, p.seed);
    drawFigure(ctx, { x: p.x, y: p.y, s: p.s, facing: p.f, style: st, pose, t: T + i * 0.4, seed: p.seed });
  }
  // gentle warm bloom over the sheltered group
  glowAdd(ctx, 960, 980, 640, 'rgba(255,180,96,0.14)', warmK);
}

// blue-black rain in the two side bands only, diverging away from the dry circle
function drawSideRain(ctx, T, cx, half, groundY, intensity) {
  const RC = '176,196,224';
  drawRain(ctx, { t: T, seed: 71, intensity, angle: 0.34, region: [-140, -110, cx - half + 140, H + 200], groundY: groundY + 22, color: RC });
  drawRain(ctx, { t: T, seed: 83, intensity, angle: -0.34, region: [cx + half, -110, W - (cx + half) + 180, H + 200], groundY: groundY + 22, color: RC });
  // cold wash on the two outside bands
  ctx.save();
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.32 * intensity; ctx.fillStyle = '#0e1830';
  ctx.fillRect(0, 0, cx - half, H); ctx.fillRect(cx + half, 0, W - (cx + half), H);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════
//  bespoke scene 1 — pastoral: the herders' festival, Govardhana grazed
// ════════════════════════════════════════════════════════════════════
function scPastoral(ctx, tl, dur, T) {
  brajBackdrop(ctx, T, 0);
  // cattle grazing on the slopes
  drawCow(ctx, { x: 1120, y: 940, s: 0.52, facing: -1, t: T, seed: 41, gait: 'idle', coat: '#d8ccb4' });
  drawCow(ctx, { x: 1420, y: 980, s: 0.56, facing: -1, t: T, seed: 42, gait: 'idle', coat: '#b98a52' });
  drawCow(ctx, { x: 1560, y: 1010, s: 0.5, facing: 1, t: T, seed: 44, gait: 'idle', coat: '#c9a878' });
  drawCow(ctx, { x: 1290, y: 1006, s: 0.34, facing: -1, t: T, seed: 43, gait: 'idle', coat: '#e6d6b4', calf: true });
  // two herders tending the festival near the hut
  drawFigure(ctx, { x: 470, y: 1002, s: 0.66, facing: 1, style: shelterStyle('villager', 32), pose: POSES.carry(1, T, 32), t: T, seed: 32 });
  drawFigure(ctx, { x: 640, y: 1010, s: 0.64, facing: -1, style: gStyle('nanda'), pose: posemix(POSES.stand(1, T, 33), { armF: { sh: 0.9, el: 1.1, hand: 'open' } }, 0.6), t: T, seed: 33 });
  // a garland strung for the Indra-festival between hut and pole
  garlandStrand(ctx, 300, 620, 700, 660, 70, T, 7, 1.0);
  // Kṛṣṇa apart, gazing up at the mountain that feeds them
  const look = ramp(tl, 1.0, 3.0, easeIO);
  drawFigure(ctx, {
    x: 980, y: 1016, s: 0.82, facing: 1, style: gStyle('krishna'),
    pose: posemix(POSES.stand(1, T, 7), {
      headTurn: 0.24, headNod: -0.08 * look,
      armF: { sh: lerp(0.2, 1.3, look), el: 0.16, wr: 0, hand: 'point' }, armB: { sh: -0.12, el: 0.14 },
      face: { gaze: { x: 0.5, y: -0.4 * look }, smile: 0.16, brow: 0.1 },
    }, 1),
    t: T, seed: 7,
  });
  // festive dust motes in the sun
  motes(ctx, 200, 200, 1200, 700, T, 11, 26, '#ffe9b0');
  wash(ctx, '#ffdca0', 0.06, 'soft-light');
  vignette(ctx, 0.3, true);
}

// ════════════════════════════════════════════════════════════════════
//  bespoke scene 2 — fury: Indra blackens the sky, the rain begins
// ════════════════════════════════════════════════════════════════════
function scFury(ctx, tl, dur, T) {
  const storm = ramp(tl, 0.4, dur - 1.0, easeIn);       // sky blackens over the scene
  const rainI = ramp(tl, 2.6, dur - 0.4, easeIO) * 0.9; // rain swells in
  brajBackdrop(ctx, T, 0.35 + storm * 0.6);
  // cattle bunched and uneasy
  drawCow(ctx, { x: 1180, y: 1010, s: 0.5, facing: -1, t: T, seed: 41, gait: 'idle', coat: '#d8ccb4' });
  drawCow(ctx, { x: 1330, y: 1024, s: 0.52, facing: -1, t: T, seed: 42, gait: 'idle', coat: '#b98a52' });
  drawCow(ctx, { x: 1258, y: 1030, s: 0.34, facing: -1, t: T, seed: 43, gait: 'idle', coat: '#e6d6b4', calf: true });
  // herders cowering, shielding their heads
  const cower = ramp(tl, 1.2, 3.4, easeIO);
  for (const p of [{ x: 520, y: 1012, s: 0.66, f: 1, k: 'priest', sd: 31 }, { x: 700, y: 1016, s: 0.64, f: 1, k: 'villager', sd: 32 }, { x: 1470, y: 1016, s: 0.6, f: -1, k: 'gopi', sd: 35 }]) {
    drawFigure(ctx, {
      x: p.x, y: p.y, s: p.s, facing: p.f, style: shelterStyle(p.k, p.sd),
      pose: posemix(POSES.stand(1, T, p.sd), { bend: 0.2, headNod: 0.24, armF: { sh: 1.5, el: 1.5, wr: 0.2, hand: 'open' }, armB: { sh: 1.2, el: 1.5, hand: 'open' }, face: { brow: 0.6, eyeOpen: 1.1, lowered: 0.3 } }, cower),
      t: T, seed: p.sd,
    });
  }
  // Kṛṣṇa alone unafraid, beginning to set his stance
  drawFigure(ctx, {
    x: 940, y: 1016, s: 0.82, facing: 1, style: gStyle('krishna'),
    pose: posemix(POSES.stand(1, T, 7), { lean: 0.04, headTurn: 0.28, armF: { sh: 0.5 + 0.5 * ramp(tl, dur - 3, dur), el: 0.5, hand: 'open' }, face: { brow: 0.2, smile: 0.06 } }, 1),
    t: T, seed: 7,
  });
  // the doomsday downpour, full-frame and cold
  if (rainI > 0.02) drawRain(ctx, { t: T, seed: 91, intensity: rainI, angle: 0.28, region: [-160, -120, W + 320, H + 220], groundY: 1030, color: '168,190,220' });
  wash(ctx, '#0c1428', 0.14 + 0.24 * storm, 'multiply');
  wash(ctx, '#20406a', 0.10 * rainI, 'soft-light');
  vignette(ctx, 0.42, false);
}

// ════════════════════════════════════════════════════════════════════
//  bespoke scene 3 — THE LIFT: Govardhana raised as an umbrella (hero image)
// ════════════════════════════════════════════════════════════════════
const UMB = { cx: 960, cy: 366, sc: 0.94, half: 560, groundY: 1016, peakY: 286, kx: 940, ks: 0.94 };
function scLift(ctx, tl, dur, T) {
  const rise = ramp(tl, 1.6, 5.0, easeOut);      // mountain climbs to the held umbrella
  const settle = ramp(tl, 4.6, 6.4, easeIO);     // it steadies; the dry circle forms
  const bob = sfbm1(T * 0.6, 51) * 7 * settle;   // subtle held bob (sfbm1)
  // cold storm behind everything
  vgrad(ctx, 0, 0, W, H, [[0, '#0f1624'], [0.5, '#182234'], [1, '#28303e']]);
  for (let i = 0; i < 6; i++) { const cx = ((T * 8 + i * 380) % (W + 940)) - 470; _cloud(ctx, cx, 96 + (i % 3) * 58, 560, 78, '#12151f', 0.5); }
  // the massif rises from behind the herders to full umbrella height
  const my = lerp(UMB.cy + 470, UMB.cy, rise);
  drawUmbrella(ctx, UMB.cx, my, UMB.sc, 'dusk', T, 5, { bob, underlight: settle, dim: 0.12, peakY: UMB.peakY });
  // dry-circle warm ground + the sheltered congregation
  drawShelterGround(ctx, UMB.cx, UMB.groundY, settle);
  drawCongregation(ctx, T, ramp(tl, 3.0, 6.0, easeIO), settle);
  // Kṛṣṇa at centre, near arm raised straight up to the peak (sh≈2.9 = overhead)
  const arm = lerp(1.0, 2.9, rise);
  drawFigure(ctx, {
    x: UMB.kx, y: UMB.groundY, s: UMB.ks, facing: 1, style: gStyle('krishna'),
    pose: posemix(POSES.stand(1, T, 7), {
      lean: -0.06 * settle, headTurn: 0.26, headNod: -0.12,
      armF: { sh: arm, el: lerp(0.4, 0.06, rise), wr: 0.04, hand: 'point' },
      armB: { sh: -0.16, el: 0.18 },
      legF: { hip: 0.18, knee: 0.06 }, legB: { hip: -0.22, knee: 0.16 },
      face: { gaze: { x: 0.05, y: -0.55 }, smile: 0.12 + 0.12 * settle, brow: 0.18 },
    }, 1),
    t: T, seed: 7,
  });
  // the fingertip contact glows softly where hand meets the peak
  const cy2 = my + bob + UMB.peakY * UMB.sc;
  if (rise > 0.3) {
    const g = clamp((rise - 0.3) / 0.5, 0, 1) * Math.max(settle, 0.35);
    glowAdd(ctx, UMB.cx, cy2, 68 * g, 'rgba(255,226,150,0.9)', g);
    glowAdd(ctx, UMB.cx, cy2, 22, 'rgba(255,248,220,0.95)', g);
  }
  // rain only outside the umbrella; inside stays dry and warm
  drawSideRain(ctx, T, UMB.cx, UMB.half, UMB.groundY, 0.5 + 0.45 * rise);
  wash(ctx, '#12305a', 0.06, 'soft-light');
  vignette(ctx, 0.36, true);
}

// ════════════════════════════════════════════════════════════════════
//  bespoke scene 4 — the vigil: seven days and nights, the dry circle holds
// ════════════════════════════════════════════════════════════════════
function scVigil(ctx, tl, dur, T) {
  // time-lapse of the storm's days & nights passing outside
  const cycle = 0.5 + 0.5 * Math.sin(tl * 1.15 - 1.3);   // 1 = day, 0 = night
  const dark = 1 - cycle;
  const bob = sfbm1(T * 0.6, 51) * 8;
  // storm sky, cycling light
  vgrad(ctx, 0, 0, W, H, [
    [0, mixC('#26364e', '#0a0f1a', dark)], [0.5, mixC('#33445c', '#121826', dark)], [1, mixC('#43506a', '#202632', dark)],
  ]);
  if (dark > 0.55) _stars(ctx, T, (dark - 0.55) * 1.6, 46);
  for (let i = 0; i < 6; i++) { const cx = ((T * 9 + i * 400) % (W + 940)) - 470; _cloud(ctx, cx, 96 + (i % 3) * 56, 560, 76, mixC('#2c3648', '#0e121b', dark), 0.5); }
  // the held mountain, its warm underlight steady through every night
  drawUmbrella(ctx, UMB.cx, UMB.cy, UMB.sc, 'night', T, 5, { bob, underlight: 0.92, dim: 0.2 + dark * 0.3, peakY: UMB.peakY });
  // dry circle + congregation, calm now
  drawShelterGround(ctx, UMB.cx, UMB.groundY, 1);
  drawCongregation(ctx, T, 0.55 + 0.2 * Math.sin(T * 0.5), 1);
  // Kṛṣṇa holding it effortlessly, smiling
  drawFigure(ctx, {
    x: UMB.kx, y: UMB.groundY, s: UMB.ks, facing: 1, style: gStyle('krishna'),
    pose: posemix(POSES.stand(1, T, 7), {
      lean: -0.06, headTurn: 0.26, headNod: -0.12,
      armF: { sh: 2.9, el: 0.06, wr: 0.04, hand: 'point' }, armB: { sh: -0.16, el: 0.18 },
      legF: { hip: 0.18, knee: 0.06 }, legB: { hip: -0.22, knee: 0.16 },
      face: { gaze: { x: 0.05, y: -0.55 }, smile: 0.3, brow: 0.14 },
    }, 1),
    t: T, seed: 7,
  });
  const cy2 = UMB.cy + bob + UMB.peakY * UMB.sc;
  glowAdd(ctx, UMB.cx, cy2, 66, 'rgba(255,226,150,0.9)', 1); glowAdd(ctx, UMB.cx, cy2, 22, 'rgba(255,248,220,0.95)', 1);
  // lamp-sparks drifting up inside the dry circle
  embers(ctx, UMB.cx, 1010, 520, T, 63, 22, '#ffcf7a');
  // the storm, unrelenting, only at the sides
  drawSideRain(ctx, T, UMB.cx, UMB.half, UMB.groundY, 0.9);
  wash(ctx, mixC('#14346a', '#0a1224', dark), 0.08, 'soft-light');
  vignette(ctx, 0.4, true);
}

// ════════════════════════════════════════════════════════════════════
window.SCENE_FNS = { pastoral: scPastoral, fury: scFury, lift: scLift, vigil: scVigil };

// storyboards (counsel, govinda) + folios live in story.json (STORY global);
// this file supplies the bespoke JS scenes and boots the film.
if (typeof window !== 'undefined') {
  buildFilmFromStory(STORY, TIMELINE);
}
