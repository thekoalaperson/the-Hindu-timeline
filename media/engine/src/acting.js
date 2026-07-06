// ── acting.js ── pose vocabulary for the cast (character system v2).
// Pure data: a pose is a plain object of joint angles + a face sub-object.
// Every helper here is deterministic (t only feeds noise via sfbm1).
//
// API (globals):
//   defaultPose()            → the canonical neutral standing pose
//   walkPose(ph, amp)        → locomotion cycle at phase ph (from world.js)
//   posemix(a, b, k)         → shallow-recursive blend of two poses (from world.js)
//   POSES.<name>(k, t, seed) → preset pose at intensity k∈0..1, blendable
//     names: stand kneel sit bow pranam pray point refuse shoot carry
//            bless shock grief dance namaste
//
// Pose keys: lean, bend, headTurn(0..1), headNod, headTilt,
//   armF/armB {sh, el, wr, hand}, legF/legB {hip, knee},
//   face {turn, smile, eyeOpen, gaze{x,y}, brow, lipsPart, lowered, rage, laugh, weep},
//   clothSway, bob, and (multi-arm deities) armF2/armB2.
// Hands: relaxed | fist | hold | open | bless | point | namaste | claw.
'use strict';

// canonical neutral pose (ported verbatim from people.js defaultPose)
function defaultPose() {
  return {
    lean: 0, bend: 0, headTurn: 0.3, headNod: 0, headTilt: 0,
    armF: { sh: 0.12, el: 0.15, wr: 0 },   // near/front arm
    armB: { sh: -0.10, el: 0.12, wr: 0 },  // far/back arm
    legF: { hip: 0.03, knee: 0.02 }, legB: { hip: -0.05, knee: 0.04 },
    face: {}, grounded: true,
  };
}

// walking pose at phase ph (radians-ish), amp 0..1 (ported from world.js)
function walkPose(ph, amp) {
  const a = amp === undefined ? 1 : amp;
  const s = Math.sin(ph), c = Math.sin(ph + Math.PI);
  return {
    legF: { hip: s * 0.4 * a, knee: Math.max(0, -s) * 0.5 * a + 0.05 },
    legB: { hip: c * 0.4 * a, knee: Math.max(0, -c) * 0.5 * a + 0.05 },
    armF: { sh: c * 0.22 * a + 0.08, el: 0.18 + Math.max(0, c) * 0.12 * a },
    armB: { sh: s * 0.22 * a - 0.05, el: 0.15 + Math.max(0, s) * 0.12 * a },
    bob: Math.abs(Math.cos(ph)) * 4 * a,
  };
}

// blend two poses (shallow per key, recursive on nested joint objects; ported)
function posemix(p1, p2, k) {
  const out = {};
  const keys = new Set([...Object.keys(p1), ...Object.keys(p2)]);
  for (const key of keys) {
    const a = p1[key], b = p2[key];
    if (a === undefined) { out[key] = b; continue; }
    if (b === undefined) { out[key] = a; continue; }
    if (typeof a === 'number') out[key] = lerp(a, b, k);
    else if (typeof a === 'object') out[key] = posemix(a, b, k);
    else out[key] = k < 0.5 ? a : b;
  }
  return out;
}

// blend a partial target onto the neutral pose at intensity k, with a little
// deterministic idle life (breath sway) mixed in from t.
function _pose(target, k, t, seed) {
  const kk = clamp(k == null ? 1 : k, 0, 1);
  const base = defaultPose();
  const p = posemix(base, target, kk);
  // idle secondary motion — tiny, so k=0 → neutral, never mechanical
  t = t || 0; seed = seed || 1;
  p.lean = (p.lean || 0) + sfbm1(t * 0.19, seed) * 0.015;
  p.headTilt = (p.headTilt || 0) + sfbm1(t * 0.16 + 4, seed + 2) * 0.02;
  p.headNod = (p.headNod || 0) + sfbm1(t * 0.14 + 8, seed + 5) * 0.012;
  return p;
}

const POSES = {
  stand(k, t, seed) { return _pose({ headTurn: 0.3 }, k, t, seed); },

  kneel(k, t, seed) {
    return _pose({
      bend: 0.14, lean: 0.05, headNod: 0.12, headTurn: 0.35,
      legF: { hip: 0.55, knee: 1.15 }, legB: { hip: -0.75, knee: 1.5 },
      armF: { sh: 0.35, el: 0.5 }, armB: { sh: 0.1, el: 0.35 },
    }, k, t, seed);
  },

  sit(k, t, seed) {
    return _pose({
      bend: 0.2, headNod: 0.05, headTurn: 0.4,
      legF: { hip: 0.95, knee: 1.6 }, legB: { hip: -0.95, knee: 1.6 },
      armF: { sh: 0.5, el: 0.9, hand: 'relaxed' }, armB: { sh: 0.3, el: 0.8 },
    }, k, t, seed);
  },

  bow(k, t, seed) {
    return _pose({
      bend: 0.5, lean: 0.12, headNod: 0.34, headTurn: 0.32,
      armF: { sh: 0.28, el: 0.32 }, armB: { sh: 0.05, el: 0.26 },
    }, k, t, seed);
  },

  pranam(k, t, seed) {
    return _pose({
      bend: 0.12, lean: 0.03, headNod: 0.16, headTurn: 0.5,
      armF: { sh: 0.98, el: 1.5, wr: 0.15, hand: 'namaste' },
      armB: { sh: 0.82, el: 1.5, wr: -0.15, hand: 'namaste' },
    }, k, t, seed);
  },

  namaste(k, t, seed) {
    return _pose({
      bend: 0, headNod: 0.05, headTurn: 0.55,
      armF: { sh: 1.02, el: 1.42, wr: 0.12, hand: 'namaste' },
      armB: { sh: 0.88, el: 1.42, wr: -0.12, hand: 'namaste' },
    }, k, t, seed);
  },

  pray(k, t, seed) {
    return _pose({
      headNod: -0.08, headTurn: 0.5,
      armF: { sh: 1.18, el: 1.28, wr: 0.1, hand: 'namaste' },
      armB: { sh: 1.02, el: 1.28, wr: -0.1, hand: 'namaste' },
    }, k, t, seed);
  },

  point(k, t, seed) {
    return _pose({
      lean: 0.03, headTurn: 0.32,
      armF: { sh: 1.42, el: 0.12, wr: 0, hand: 'point' },
      armB: { sh: -0.12, el: 0.14 },
    }, k, t, seed);
  },

  refuse(k, t, seed) {
    return _pose({
      lean: -0.09, headTurn: 0.22, headTilt: -0.06,
      armF: { sh: 1.28, el: 0.5, wr: 0.3, hand: 'open' },
      armB: { sh: -0.1, el: 0.16 },
      face: { brow: 0.35, lipsPart: 0.15 },
    }, k, t, seed);
  },

  shoot(k, t, seed) {
    return _pose({
      lean: 0.05, headTurn: 0.2, headNod: 0.02,
      armF: { sh: 1.55, el: 0.02, wr: 0, hand: 'hold' },
      armB: { sh: 1.18, el: 1.95, wr: -0.2, hand: 'fist' },
      legF: { hip: 0.4, knee: 0.14 }, legB: { hip: -0.45, knee: 0.5 },
      face: { brow: 0.2 },
    }, k, t, seed);
  },

  carry(k, t, seed) {
    return _pose({
      lean: -0.06, headTurn: 0.35,
      armF: { sh: 0.92, el: 1.12, wr: 0.05, hand: 'hold' },
      armB: { sh: 0.76, el: 1.12, wr: -0.05, hand: 'hold' },
    }, k, t, seed);
  },

  bless(k, t, seed) {
    return _pose({
      headNod: -0.02, headTurn: 0.4,
      armF: { sh: 1.0, el: 1.42, wr: 0.12, hand: 'bless' },
      armB: { sh: -0.05, el: 0.15 },
      face: { smile: 0.18 },
    }, k, t, seed);
  },

  shock(k, t, seed) {
    return _pose({
      lean: -0.1, headNod: -0.14, headTurn: 0.4,
      armF: { sh: 1.5, el: 0.9, wr: 0.1, hand: 'open' },
      armB: { sh: 1.2, el: 0.9, wr: -0.1, hand: 'open' },
      face: { brow: 0.75, eyeOpen: 1.2, lipsPart: 0.7 },
    }, k, t, seed);
  },

  grief(k, t, seed) {
    return _pose({
      bend: 0.34, lean: 0.06, headNod: 0.4, headTilt: 0.1, headTurn: 0.3,
      armF: { sh: 1.3, el: 1.72, wr: 0.25, hand: 'open' },
      armB: { sh: 0.2, el: 0.4 },
      face: { weep: 0.75, brow: 0.4, lowered: 0.5, smile: -0.2 },
    }, k, t, seed);
  },

  dance(k, t, seed) {
    return _pose({
      lean: 0.08, headTilt: 0.13, headTurn: 0.45,
      armF: { sh: 1.42, el: 0.85, wr: 0.35, hand: 'open' },
      armB: { sh: -0.62, el: 0.9, wr: -0.35, hand: 'point' },
      legF: { hip: 0.28, knee: 0.42 }, legB: { hip: -0.16, knee: 0.1 },
      face: { smile: 0.3 },
    }, k, t, seed);
  },
};
