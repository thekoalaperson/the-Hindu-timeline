// ── stage.js ── storyboard interpreter (Agent C). Turns a data-driven
// storyboard (CONTRACTS.md § "Storyboard (stage.js)") into a playable film,
// generalizing film.js's compositor (subtitle chunking/drawing, dip-to-umber
// scene transitions, start/end fades, global vignette+grain) so a story can
// be authored mostly as JSON instead of hand-written scene functions.
//
// ── Public API ──────────────────────────────────────────────────────────
//
//   buildFilmFromStory(storyDef, TIMELINE)
//     Installs window.__film = {W,H,duration,timeline,draw(ctx,T,opts)} (and
//     also returns it, so it works even without a `window`). TIMELINE is the
//     familiar {total, scenes:[{id,name,display,start,narrAt,narrDur,dur,end}]}
//     shape already produced by narrate.mjs / timeline.json. storyDef carries
//     the *staging* data: storyDef.scenes is either an array of
//     `{id, storyboard?}` objects or a plain object map `{id: {storyboard?}}`.
//
//     Dispatch, per TIMELINE scene id:
//       1. storyDef.scenes[id].storyboard, if present, is interpreted:
//          - set/setOpts: resolved through the global SETS registry
//            (SETS.<name>(ctx,cam,t,opts) per CONTRACTS "Sets API"); an
//            unknown/missing set draws a small labelled flat backdrop
//            instead of crashing, so a story can be authored and validated
//            before every set exists.
//          - grade: {wash, washAlpha, washMode, vignette, vignetteWarm} —
//            an extra per-scene colour pass (film.js's own global
//            vignette+grain still runs afterwards for every scene).
//          - camera: keyframe list ({t,x,y,z,ease}) eased with the same
//            lerp/easing primitives as core.js's track(); t accepts seconds,
//            "NN%" (of scene dur) or "narr+X" (X seconds after narration
//            start).
//          - actors: {id, who, at:[x,y], s, facing, z?, enter?} — who is
//            resolved to a style via Person.of (if that future API exists),
//            else the global CAST[who], else a deterministic archetype
//            fallback so an unknown character still renders as *someone*.
//          - beats: {at, actor, pose?|face?|move?} | {at, fx, opts} —
//            compiled once per scene (cached by id) into per-actor eased
//            pose/face/position tracks; move/enter use the shared walkPose
//            gait. fx beats dispatch to paint.js primitives (petalRain,
//            glowAdd, motes, flame, embers, smoke, godRays).
//          - draw order: by each actor's current-frame y, unless the actor
//            (or the beat authoring it) sets an explicit z.
//       2. Otherwise, if the story registered a JS fn under the global
//          SCENE_FNS[id] (the escape hatch — exactly the legacy film.js
//          convention), it is called as (ctx, tl, dur, t).
//       3. Otherwise a small "[missing scene]" placeholder card is drawn so
//          nothing throws.
//
//   validateStory(storyJson, opts?) -> {errors:[], warnings:[]}
//     Pure, Node-safe validation of the same storyDef shape — no canvas/DOM
//     required, so it runs headless via engine/build/validate.mjs. Reports:
//     unknown set names, actors with an unrecognised `who`, beats/moves that
//     reference an actor id the scene never declared (error), malformed time
//     specs (error), pose/fx names outside the known lists (warn), scenes
//     with neither a storyboard nor a confirmed JS fn (warn — this can't be
//     verified statically, so it is always a warning, never fatal), shot
//     preset problems (unknown type: warn; missing/unknown slots: error),
//     plus the COMPOSITION LINTER below. opts.timeline (the narrate.mjs
//     timeline object) supplies real scene durations/narration windows;
//     without it a nominal clock is assumed (dur 10s, narration 1..9s).
//
// ── Composition presets (scene-level "shot" field) ──────────────────────
//   "shot": "wide" | {type, actor?|actors?} — generates the camera when the
//   storyboard has no explicit "camera" keys (explicit camera always wins).
//   Presets solve cam.x/y/z from the compiled actor position tracks through
//   the exact camLayer f=1.0 projection (see stgProject), plus a small
//   deterministic drift from a local hash-noise — the SAME function the
//   linter evaluates, so runtime and validation see identical cameras.
//     wide          slot (or featured) centroid centered, z_eff 1.05, feet
//                   just inside the bottom safe margin.
//     two-shot      {actors:[a,b]} — centered on the pair midpoint, z_eff
//                   solved so both land on the golden sections (0.382/0.618
//                   of frame width), clamped to [1.25, 2.2].
//     close-up      {actor} — the actor's head region (top quarter of the
//                   400·s figure box) fills ~55% of frame height, centered,
//                   head at 45% vertical. The emotional close-up.
//     processional  {actor} — tracks the moving actor with lead room in the
//                   facing direction, z_eff 1.25.
//     hero-frame    low-center symmetric: subject centered, z_eff 1.5,
//                   grounded low in frame.
//
// ── Composition linter (inside validateStory; pure math, no rendering) ──
//   Samples every storyboard scene at each beat time, each move/enter
//   arrival, scene start/mid/end, and three points inside the narration
//   window; projects each FEATURED actor's bounding box (±85·s wide, 400·s
//   tall above the ground point) through the same camera the runtime uses,
//   then checks:
//     (a) [safe-area, ERROR]  the actor's head region (top 25% of the box)
//         fully inside the 5% safe area. Deliberate deviation from the
//         literal "whole box inside safe area": the house style crops feet
//         and waists constantly (see scGarland/scRises framing), so the
//         literal rule would flag every good frame; edge crops only ruin a
//         composition when they take the head. Actors mid-entrance from an
//         offscreen point, or moving toward one (deliberate exits), are
//         skipped for this rule.
//     (b) [overlap, WARN]     no two featured actors' boxes overlap more
//         than 70% of the smaller box's area.
//     (c) [facing, WARN]      facing sign agrees with the horizontal
//         direction of each enter/move at its start (|dx| > 50 units).
//     (d) [subtitle-band, ERROR] during the narration window, no featured
//         actor's head region intersects the subtitle band (bottom 12%).
//   Featured: "featured": true, or by default any actor that has beats
//   targeting it or an enter ("featured": false opts out). Violations
//   report scene id + time + actor id + rule tag, deduped per rule/actor.
//
// ── Dressing ────────────────────────────────────────────────────────────
//   Scene-level "dressing" object: passthrough options merged into setOpts
//   (dressing wins key collisions) — for set-specific extras (e.g. the
//   legacy hallSet's drupadaSmile/raysAlpha) without growing the core
//   setOpts contract.
//
// ── Node-loadable ──────────────────────────────────────────────────────
// No top-level window/document access. Every browser/engine-global use
// (canvas, core.js/paint.js/people.js/world.js helpers, and the SETS/CAST/
// POSES/CHARACTERS/Person registries) is guarded with `typeof` checks and
// lives inside functions that only ever execute in a real page — validate.mjs
// only ever calls validateStory(), which touches none of them.
'use strict';

// ── static "known" lists, used by both validateStory and the runtime
//    fallbacks below; if the real registry (SETS/CAST/POSES/...) is loaded
//    in the browser, it is consulted too, so this list only has to cover the
//    baseline from CONTRACTS.md. ──
var STG_KNOWN_SETS = ['palaceHall', 'courtyardNight', 'hutDusk', 'mandap', 'forest', 'village', 'riverBank', 'interior', 'mountain'];
var STG_KNOWN_POSES = ['namaste', 'dance', 'grief', 'shock', 'stand', 'kneel', 'sit', 'bow', 'pranam', 'pray', 'point', 'refuse', 'shoot', 'carry', 'bless', 'shock', 'grief', 'dance'];
var STG_KNOWN_ARCHETYPES = ['king', 'queen', 'prince', 'princess', 'warrior', 'brahmin', 'priest', 'villager', 'hunter'];
var STG_KNOWN_FX = ['petals', 'glow', 'motes', 'flame', 'embers', 'smoke', 'godrays'];
var STG_KNOWN_SHOTS = ['wide', 'two-shot', 'close-up', 'processional', 'hero-frame'];

// ── shared camera math (used by shot presets AND the composition linter,
//    in browser and node alike — so no engine globals here, only literals
//    mirroring core.js's design space and camLayer()'s f=1.0 zoom curve). ──
var STG_W = 1920, STG_H = 1080;
// camLayer: z_eff = 1 + (cam.z - 1) * lerp(0.72, 1.22, min(f,1.3)/1.3); at
// the subject plane f=1.0 the lerp factor is 0.72 + 0.5/1.3:
var STG_CAM_F1 = 0.72 + 0.5 / 1.3;
function stgZEff(camZ) { return 1 + (camZ - 1) * STG_CAM_F1; }
function stgCamZFor(zEff) { return 1 + (zEff - 1) / STG_CAM_F1; }
// world point -> screen point at subject plane f=1.0 (mirrors camLayer's
// translate(W/2,H/2); scale(z_eff); translate(-W/2-cam.x, -H/2-cam.y)).
function stgProject(cam, wx, wy) {
  var z = stgZEff(cam.z);
  return { x: STG_W / 2 + z * (wx - STG_W / 2 - cam.x), y: STG_H / 2 + z * (wy - STG_H / 2 - cam.y) };
}
// cam.y that puts world ground line gy at the screen height frac*H.
function stgCamYForGround(gy, zEff, frac) {
  return gy - STG_H / 2 - (frac * STG_H - STG_H / 2) / zEff;
}
// local deterministic noise (pure copies of core.js's hash1/noise1 recipe)
// for preset camera drift — local so the node-side linter computes the
// EXACT same camera as the browser runtime. No Math.random anywhere.
function stgHash1(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function stgSmoothT(t) { return t * t * (3 - 2 * t); }
function stgNoise1(x, seed) {
  var i = Math.floor(x), f = x - i;
  return stgLerp(stgHash1(i + seed * 57.31), stgHash1(i + 1 + seed * 57.31), stgSmoothT(f));
}
function stgSfbm1(x, seed) {
  var v = 0, amp = 0.5, xx = x;
  for (var o = 0; o < 3; o++) { v += amp * stgNoise1(xx, seed + o * 13); xx *= 2.03; amp *= 0.5; }
  return v * 2 - 1;
}

// ── time-spec grammar: number (seconds) | "NN%" (of scene dur) | "narr+X" /
//    "narr-X" (X seconds relative to narration start). Shared by the
//    validator (syntax only) and the runtime resolver (actual value). ──
var STG_RE_PCT = /^-?\d+(?:\.\d+)?%$/;
var STG_RE_NARR = /^narr\s*([+-])\s*(-?\d+(?:\.\d+)?)$/i;
var STG_RE_NUM = /^-?\d+(?:\.\d+)?$/;

function stgIsValidTime(spec) {
  if (typeof spec === 'number') return isFinite(spec);
  if (typeof spec === 'string') {
    var s = spec.trim();
    return STG_RE_PCT.test(s) || STG_RE_NARR.test(s) || STG_RE_NUM.test(s);
  }
  return false;
}
function stgResolveTime(spec, dur, narrLocal) {
  if (typeof spec === 'number') return spec;
  if (typeof spec !== 'string') return 0;
  var s = spec.trim();
  if (STG_RE_PCT.test(s)) return (parseFloat(s) / 100) * dur;
  var m = STG_RE_NARR.exec(s);
  if (m) return narrLocal + (m[1] === '-' ? -1 : 1) * parseFloat(m[2]);
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ── scenes[] normalization: accept either an array of {id,...} objects
//    (the shape shown in CONTRACTS.md) or a plain object map id -> {...}. ──
function stgNormalizeScenes(storyJson) {
  var scenes = storyJson && storyJson.scenes;
  if (!scenes) return [];
  if (Array.isArray(scenes)) return scenes.filter(Boolean);
  return Object.keys(scenes).map(function (k) { return Object.assign({ id: k }, scenes[k]); });
}

// subtitle text -> chunks (~<=88 chars, at sentence/clause breaks). Ported
// verbatim from film.js's subChunks so the two compositors read identically.
function stgSubChunks(text) {
  var parts = text.match(/[^.!?—]+[.!?…]*(\s*—\s*)?/g) || [text];
  var chunks = [];
  var cur = '';
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if ((cur + p).length > 88 && cur) { chunks.push(cur.trim()); cur = p; }
    else cur += p;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

// ── tiny numeric helpers that prefer core.js's real implementations but
//    fall back inline, so this file never throws if ever evaluated before
//    core.js (it is only ever *called* after, in every real page). ──
function stgLerp(a, b, k) { return typeof lerp === 'function' ? lerp(a, b, k) : a + (b - a) * k; }
function stgClamp(v, a, b) {
  a = a === undefined ? 0 : a; b = b === undefined ? 1 : b;
  return typeof clamp === 'function' ? clamp(v, a, b) : (v < a ? a : v > b ? b : v);
}
function stgNorm(t, a, b) { return typeof norm === 'function' ? norm(t, a, b) : stgClamp((t - a) / (b - a), 0, 1); }
function stgEaseByName(name) {
  if (name === 'in') return typeof easeIn === 'function' ? easeIn : function (t) { return t * t * t; };
  if (name === 'out') return typeof easeOut === 'function' ? easeOut : function (t) { return 1 - Math.pow(1 - t, 3); };
  if (name === 'back') return typeof easeOutBack === 'function' ? easeOutBack : function (t) { return t; };
  return typeof easeIO === 'function' ? easeIO : function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
}

// camera keyframe list -> {x,y,z} at scene-local time tl. Per-key `ease`
// applies to the segment ENDING at that key (matches CONTRACTS.md's example).
function stgCamTrack(keys, tl) {
  if (!keys || !keys.length) return { x: 0, y: 0, z: 1 };
  if (tl <= keys[0].t) return { x: keys[0].x, y: keys[0].y, z: keys[0].z };
  for (var i = 1; i < keys.length; i++) {
    if (tl <= keys[i].t || i === keys.length - 1) {
      var a = keys[i - 1], b = keys[i];
      var k = stgEaseByName(b.ease)(stgNorm(tl, a.t, Math.max(b.t, a.t + 1e-6)));
      return { x: stgLerp(a.x, b.x, k), y: stgLerp(a.y, b.y, k), z: stgLerp(a.z, b.z, k) };
    }
  }
  var last = keys[keys.length - 1];
  return { x: last.x, y: last.y, z: last.z };
}

// ── "known name" checks: static list first, then whatever registry the
//    page has actually loaded (only ever true in the browser). ──
function stgIsKnownSet(name) {
  if (STG_KNOWN_SETS.indexOf(name) !== -1) return true;
  if (typeof SETS !== 'undefined' && SETS && Object.prototype.hasOwnProperty.call(SETS, name)) return true;
  return false;
}
function stgIsKnownWho(who) {
  if (STG_KNOWN_ARCHETYPES.indexOf(who) !== -1) return true;
  if (typeof CAST !== 'undefined' && CAST && Object.prototype.hasOwnProperty.call(CAST, who)) return true;
  if (typeof CHARACTERS !== 'undefined' && CHARACTERS && Object.prototype.hasOwnProperty.call(CHARACTERS, who)) return true;
  // a full Person registry resolves almost anything via its own archetype
  // fallback, so its mere presence makes static "unknown who" checks moot.
  if (typeof Person !== 'undefined' && Person && typeof Person.of === 'function') return true;
  return false;
}
function stgIsKnownPose(pose) {
  if (STG_KNOWN_POSES.indexOf(pose) !== -1) return true;
  if (typeof POSES !== 'undefined' && POSES && Object.prototype.hasOwnProperty.call(POSES, pose)) return true;
  return false;
}
function stgIsKnownFx(fx) { return STG_KNOWN_FX.indexOf(fx) !== -1; }

// ── actor style resolution: Person.of (future API) > CAST[who] (today's
//    per-story registry, e.g. stories/*/cast.js) > CHARACTERS[who] (future
//    registry.json injection) > deterministic archetype fallback, so an
//    unrecognised `who` still renders as *someone* instead of crashing. ──
function stgStrSeed(s) {
  var h = 0;
  s = String(s);
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function stgArchetypeFallbackStyle(who) {
  var seed = stgStrSeed(who || 'unknown');
  var skins = ['#c98d5e', '#b57a45', '#d9a05e', '#a86a3c', '#c69265'];
  var skin = skins[seed % skins.length];
  return {
    skin: skin,
    skinShade: typeof shade === 'function' ? shade(skin, -0.3) : skin,
    hairColor: '#1d1408', hairstyle: 'topknot', garb: 'dhoti',
    clothMain: '#8a6a3a', clothAccent: (typeof GOLD !== 'undefined' ? GOLD : '#e8b64c'),
    build: 0.95 + (seed % 5) * 0.03,
    _stgFallback: true,
  };
}
function stgResolveActorStyle(who) {
  if (!who) return stgArchetypeFallbackStyle('unknown');
  if (typeof Person !== 'undefined' && Person && typeof Person.of === 'function') {
    // Person.of returns a rig instance; drawFigure consumes its resolved .style
    try { var p = Person.of(who); if (p) return (p && p.style) ? p.style : p; } catch (e) { /* fall through */ }
  }
  if (typeof CAST !== 'undefined' && CAST && CAST[who]) return CAST[who];
  if (typeof CHARACTERS !== 'undefined' && CHARACTERS && CHARACTERS[who]) return CHARACTERS[who];
  return stgArchetypeFallbackStyle(who);
}

// ── pose presets: prefer the future global POSES table (acting.js) so this
//    file upgrades for free once that lands; otherwise use these small
//    built-in fallbacks so beats work today. Each is (k, t, seed) -> a
//    partial pose object at intensity k (0..1), mergeable via posemix. ──
var STG_POSE_FALLBACK = {
  stand: function (k) { return { headNod: 0.02 * k }; },
  kneel: function (k) { return { legF: { hip: 1.3 * k, knee: 1.6 * k }, legB: { hip: -0.25 * k, knee: 0.85 * k }, lean: 0.10 * k, headNod: 0.15 * k }; },
  sit: function (k) { return { legF: { hip: 1.5 * k, knee: 1.7 * k }, legB: { hip: 1.5 * k, knee: 1.7 * k }, lean: 0.05 * k }; },
  bow: function (k) { return { lean: 0.55 * k, headNod: 0.55 * k, face: { lowered: 0.6 * k } }; },
  pranam: function (k) {
    return {
      lean: 0.22 * k, headNod: 0.4 * k,
      armF: { sh: 1.05 * k, el: 1.5 * k, hand: 'namaste' },
      armB: { sh: 1.0 * k, el: 1.5 * k, hand: 'namaste' },
      face: { lowered: 0.45 * k, smile: 0.05 * k },
    };
  },
  pray: function (k) {
    return {
      headNod: 0.2 * k,
      armF: { sh: 1.2 * k, el: 1.55 * k, hand: 'namaste' },
      armB: { sh: 1.15 * k, el: 1.55 * k, hand: 'namaste' },
      face: { lowered: 0.5 * k, eyeOpen: 1 - 0.3 * k },
    };
  },
  point: function (k) { return { armF: { sh: 1.3 * k, el: 0.1 * k, hand: 'point' }, headTurn: 0.35 }; },
  refuse: function (k) { return { armF: { sh: 0.9 * k, el: 0.5 * k, wr: -0.7 * k, hand: 'open' }, face: { brow: 0.35 * k, smile: -0.15 * k } }; },
  shoot: function (k) { return { armF: { sh: 1.3 * k, el: 0.12 * k, hand: 'hold' }, armB: { sh: 1.0 * k, el: 0.85 * k, hand: 'fist' }, lean: 0.05 * k }; },
  carry: function (k) {
    return {
      headNod: 0.06 * k,
      armF: { sh: 0.15 + 0.75 * k, el: 0.3 + 1.05 * k, hand: 'hold' },
      armB: { sh: 0.10 + 0.65 * k, el: 0.3 + 1.15 * k, hand: 'hold' },
      face: { lowered: 0.15 * k },
    };
  },
  bless: function (k) { return { armF: { sh: 1.15 * k, el: 0.3 * k, hand: 'bless' }, armB: { sh: 0.3 * k, el: 0.3 * k, hand: 'open' }, face: { smile: 0.2 * k } }; },
  shock: function (k) { return { face: { brow: 0.7 * k, eyeOpen: 1 + 0.25 * k, lipsPart: 0.6 * k }, lean: -0.1 * k }; },
  grief: function (k) { return { headNod: 0.3 * k, face: { lowered: 0.7 * k, brow: 0.4 * k, smile: -0.2 * k } }; },
  dance: function (k, t) {
    var tt = t || 0;
    return {
      lean: Math.sin(tt * 3) * 0.12 * k, headTilt: Math.sin(tt * 2.4) * 0.15 * k,
      armF: { sh: 0.3 + 0.25 * Math.sin(tt * 3) * k }, armB: { sh: -0.2 + 0.25 * Math.cos(tt * 3) * k },
    };
  },
};
function stgPoseFromPreset(name, k, t, seed) {
  if (typeof POSES !== 'undefined' && POSES && typeof POSES[name] === 'function') {
    try { var r = POSES[name](k, t, seed); if (r) return r; } catch (e) { /* fall through */ }
  }
  var fn = STG_POSE_FALLBACK[name];
  return fn ? fn(k, t, seed) : {};
}
// deep-ish blend of two (possibly nested) pose/face objects; prefers
// world.js's posemix (already handles this shape generically) with a crude
// shallow fallback so this file degrades gracefully if it is ever missing.
function stgMixPose(a, b, k) {
  if (typeof posemix === 'function') return posemix(a || {}, b || {}, k);
  var out = Object.assign({}, a);
  var keys = Object.keys(b || {});
  for (var i = 0; i < keys.length; i++) { var key = keys[i]; out[key] = k < 0.5 && a && a[key] !== undefined ? a[key] : b[key]; }
  return out;
}

// ── beat compilation: turn one storyboard scene's actors[]/beats[]/camera[]
//    into eased tracks, once, deterministically. Cached by scene id by the
//    caller (buildFilmFromStory). ──
function stgCompileStoryboard(id, sb, sceneMeta) {
  var dur = sceneMeta.dur || 1;
  var narrLocal = (sceneMeta.narrAt === undefined ? sceneMeta.start : sceneMeta.narrAt) - sceneMeta.start;
  var T = function (spec) { return stgResolveTime(spec, dur, narrLocal); };

  var actors = {};
  var actorList = Array.isArray(sb.actors) ? sb.actors : [];
  for (var ai = 0; ai < actorList.length; ai++) {
    var a = actorList[ai];
    if (!a || !a.id) continue;
    var at = a.at || [960, 960];
    var actor = {
      id: a.id, who: a.who, s: a.s === undefined ? 0.75 : a.s,
      facing: a.facing === undefined ? 1 : a.facing, z: a.z,
      gaitAmp: a.gaitAmp, style: stgResolveActorStyle(a.who),
      seed: (stgStrSeed(a.id) % 89) + 2,
      featuredExplicit: a.featured, hasEnter: !!a.enter, hasBeat: false,
      posSegments: [], poseBeats: [], faceBeats: [],
    };
    if (a.enter) {
      var t0 = T(a.enter.t0 === undefined ? 0 : a.enter.t0);
      var t1 = T(a.enter.t1 === undefined ? Math.min(dur, t0 + dur * 0.3) : a.enter.t1);
      actor.posSegments.push({ t0: t0, t1: t1, from: a.enter.from || at, to: at, gait: a.enter.type === 'none' ? 'idle' : 'walk', ease: a.enter.ease || 'io' });
    } else {
      actor.posSegments.push({ t0: -Infinity, t1: -Infinity, from: at, to: at, gait: 'idle', ease: 'io' });
    }
    actors[a.id] = actor;
  }

  var fxBeats = [];
  var beatList = Array.isArray(sb.beats) ? sb.beats : [];
  for (var bi = 0; bi < beatList.length; bi++) {
    var b = beatList[bi];
    if (!b) continue;
    var at2 = T(b.at);
    if (b.fx) fxBeats.push({ t: at2, fx: b.fx, opts: b.opts || {} });
    var actor2 = b.actor && actors[b.actor];
    if (!actor2) continue;
    actor2.hasBeat = true;
    if (b.pose) actor2.poseBeats.push({ t: at2, pose: b.pose, over: b.over === undefined ? 1 : b.over, ease: b.ease || 'io' });
    if (b.face) actor2.faceBeats.push({ t: at2, face: b.face, over: b.over === undefined ? 1 : b.over, ease: b.ease || 'io' });
    if (b.move) {
      var prevTo = actor2.posSegments[actor2.posSegments.length - 1].to;
      var mt1 = T(b.move.t1 === undefined ? at2 + 2 : b.move.t1);
      actor2.posSegments.push({ t0: at2, t1: mt1, from: prevTo, to: b.move.to, gait: b.move.gait || 'walk', amp: b.move.amp, ease: b.move.ease || 'io' });
    }
  }

  var actorIds = Object.keys(actors);
  for (var ki = 0; ki < actorIds.length; ki++) {
    var ac = actors[actorIds[ki]];
    ac.poseBeats.sort(function (x, y) { return x.t - y.t; });
    ac.faceBeats.sort(function (x, y) { return x.t - y.t; });
    ac.posSegments.sort(function (x, y) { return x.t0 - y.t0; });
    // featured: explicit flag wins; else any beat target or an enter.
    ac.featured = ac.featuredExplicit !== undefined ? !!ac.featuredExplicit : !!(ac.hasBeat || ac.hasEnter);
  }
  fxBeats.sort(function (x, y) { return x.t - y.t; });

  var camera = (Array.isArray(sb.camera) ? sb.camera : []).map(function (kf) {
    return { t: T(kf.t === undefined ? 0 : kf.t), x: kf.x === undefined ? 0 : kf.x, y: kf.y === undefined ? 0 : kf.y, z: kf.z === undefined ? 1 : kf.z, ease: kf.ease || 'io' };
  }).sort(function (x, y) { return x.t - y.t; });

  var shot = sb.shot;
  if (typeof shot === 'string') shot = { type: shot };
  if (!shot || typeof shot !== 'object' || Array.isArray(shot)) shot = null;

  return {
    id: id, sb: sb, actors: actors, fxBeats: fxBeats, camera: camera, dur: dur,
    narrLocal: narrLocal, narrDur: sceneMeta.narrDur || 0,
    shot: shot, camSeed: (stgStrSeed(id) % 977) + 3,
  };
}

// ── per-frame evaluation of one actor's position/pose/face from the
//    compiled tracks. tl = scene-local time (drives ramps/beats), t =
//    absolute film time (drives continuous phases: walk cycle, breathing,
//    noise) — same split every hand-written scene function already uses. ──
function stgEvalPosition(actor, tl, t) {
  var segs = actor.posSegments;
  var seg = segs[0];
  for (var i = 0; i < segs.length; i++) if (tl >= segs[i].t0) seg = segs[i];
  if (tl <= seg.t0 || seg.t1 <= seg.t0) {
    return { x: seg.from[0], y: seg.from[1], walking: false, ph: t * 6.4 };
  }
  var k = stgEaseByName(seg.ease)(stgNorm(tl, seg.t0, seg.t1));
  var walking = seg.gait === 'walk' && k > 0.015 && k < 0.985;
  return { x: stgLerp(seg.from[0], seg.to[0], k), y: stgLerp(seg.from[1], seg.to[1], k), walking: walking, ph: t * 6.4 };
}
function stgEvalPose(actor, tl, t) {
  var result = {};
  for (var i = 0; i < actor.poseBeats.length; i++) {
    var b = actor.poseBeats[i];
    if (tl < b.t) break;
    var k = stgEaseByName(b.ease)(stgNorm(tl, b.t, b.t + Math.max(b.over, 0.001)));
    result = stgMixPose(result, stgPoseFromPreset(b.pose, 1, t, actor.seed), k);
  }
  return result;
}
function stgEvalFace(actor, tl) {
  var result = {};
  for (var i = 0; i < actor.faceBeats.length; i++) {
    var b = actor.faceBeats[i];
    if (tl < b.t) break;
    var k = stgEaseByName(b.ease)(stgNorm(tl, b.t, b.t + Math.max(b.over, 0.001)));
    result = stgMixPose(result, b.face, k);
  }
  return result;
}
// ── shot-preset cameras: pure functions of the compiled scene + tl, shared
//    verbatim by the runtime draw path and the node-side linter. ──
function stgShotSlots(compiled, spec) {
  var ids = [];
  if (spec.actor) ids = [spec.actor];
  else if (Array.isArray(spec.actors)) ids = spec.actors.slice();
  var out = [];
  for (var i = 0; i < ids.length; i++) if (compiled.actors[ids[i]]) out.push(compiled.actors[ids[i]]);
  if (!out.length) { // no/unknown slots: fall back to featured actors, else all
    var all = Object.keys(compiled.actors);
    for (var j = 0; j < all.length; j++) if (compiled.actors[all[j]].featured) out.push(compiled.actors[all[j]]);
    if (!out.length) for (var k = 0; k < all.length; k++) out.push(compiled.actors[all[k]]);
  }
  return out;
}
function stgShotCamera(compiled, spec, tl) {
  var slots = stgShotSlots(compiled, spec);
  if (!slots.length) return null;
  var pos = [], cx = 0, gy = -Infinity, i;
  for (i = 0; i < slots.length; i++) {
    var p = stgEvalPosition(slots[i], tl, tl);
    pos.push(p); cx += p.x; if (p.y > gy) gy = p.y;
  }
  cx /= slots.length;
  var type = spec.type, zEff, camX, camY, s;
  if (type === 'two-shot') {
    var a = pos[0], b = pos[1] || pos[0];
    var sep = Math.abs(b.x - a.x);
    // z_eff putting the pair on the golden sections (0.618-0.382 = 0.236 of W)
    zEff = stgClamp(0.236 * STG_W / Math.max(sep, 1), 1.25, 2.2);
    camX = (a.x + b.x) / 2 - STG_W / 2;
    camY = stgCamYForGround(gy, zEff, 0.945);
  } else if (type === 'close-up') {
    s = slots[0].s;
    zEff = 0.55 * STG_H / (100 * s);      // head region (top quarter of 400·s) -> 55% of H
    camX = pos[0].x - STG_W / 2;
    // head-region centre (gy - 350·s) parked at 45% frame height
    camY = (pos[0].y - 350 * s) - STG_H / 2 - (0.45 * STG_H - STG_H / 2) / zEff;
  } else if (type === 'processional') {
    zEff = 1.25;
    // subject trails centre by 90px: lead room in the walking direction
    camX = pos[0].x - STG_W / 2 + (slots[0].facing || 1) * 90 / zEff;
    camY = stgCamYForGround(gy, zEff, 0.945);
  } else if (type === 'hero-frame') {
    zEff = 1.5;
    camX = cx - STG_W / 2;
    camY = stgCamYForGround(gy, zEff, 0.97);
  } else { // 'wide' (and, at runtime, any unknown type the validator warned about)
    zEff = 1.05;
    camX = stgClamp(cx - STG_W / 2, -280, 280);
    camY = stgCamYForGround(gy, zEff, 0.945);
  }
  // gentle deterministic handheld drift — identical in runtime and linter.
  camX += stgSfbm1(tl * 0.12, compiled.camSeed) * 4;
  camY += stgSfbm1(tl * 0.11, compiled.camSeed + 5) * 2.5;
  return { x: camX, y: camY, z: stgCamZFor(zEff) };
}
// the ONE camera evaluator: explicit keys > shot preset > identity.
function stgCameraAt(compiled, tl) {
  if (compiled.camera.length) return stgCamTrack(compiled.camera, tl);
  if (compiled.shot) {
    var c = stgShotCamera(compiled, compiled.shot, tl);
    if (c) return c;
  }
  return { x: 0, y: 0, z: 1 };
}

function stgSafeWalkPose(ph, amp) { return typeof walkPose === 'function' ? walkPose(ph, amp) : {}; }
function stgSafeDrawFigure(c, o) { if (typeof drawFigure === 'function') drawFigure(c, o); }

// draws every compiled actor at scene-local time tl, sorted by y (or z if
// the actor specifies one) so nearer figures correctly occlude farther ones.
function stgDrawActors(c, compiled, tl, t) {
  var ids = Object.keys(compiled.actors);
  var items = [];
  for (var i = 0; i < ids.length; i++) {
    var a = compiled.actors[ids[i]];
    var pos = stgEvalPosition(a, tl, t);
    var wp = pos.walking ? stgSafeWalkPose(pos.ph, a.gaitAmp === undefined ? 0.85 : a.gaitAmp) : {};
    var beatPose = stgEvalPose(a, tl, t);
    var faceOverride = stgEvalFace(a, tl);
    var pose = Object.assign({}, wp, beatPose);
    pose.face = Object.assign({}, wp.face, beatPose.face, faceOverride);
    var y = pos.y - (wp.bob || 0);
    items.push({ a: a, x: pos.x, y: y, pose: pose, sortKey: a.z !== undefined ? a.z : y });
  }
  items.sort(function (p, q) { return p.sortKey - q.sortKey; });
  for (var j = 0; j < items.length; j++) {
    var it = items[j];
    stgSafeDrawFigure(c, { x: it.x, y: it.y, s: it.a.s, facing: it.a.facing, style: it.a.style, pose: it.pose, t: t, seed: it.a.seed });
  }
}

// ── fx beats: dispatch by name to paint.js primitives, screen-space (no
//    camera transform), matching how existing scenes already call them
//    (e.g. scGarland's petalRain) directly on the outer ctx. ──
function stgDrawFxOne(ctx, name, o, k, t) {
  if (name === 'petals') {
    if (typeof petalRain !== 'function') return;
    var region = o.region || [-100, -80, (typeof W !== 'undefined' ? W : 1920) + 200, (typeof H !== 'undefined' ? H : 1080) + 100];
    var colors = o.colors || ['#f2a41f', '#e8801a', '#d94f2b', '#f6e7bf'];
    petalRain(ctx, t, o.seed === undefined ? 7 : o.seed, region, o.n === undefined ? 40 : o.n, colors, (o.density === undefined ? 1 : o.density) * k);
  } else if (name === 'glow') {
    if (typeof glowAdd !== 'function') return;
    glowAdd(ctx, o.x === undefined ? W / 2 : o.x, o.y === undefined ? H / 2 : o.y, o.r === undefined ? 300 : o.r, o.color || 'rgba(255,200,120,0.16)', (o.alpha === undefined ? 0.8 : o.alpha) * k);
  } else if (name === 'motes') {
    if (typeof motes !== 'function') return;
    motes(ctx, o.x || 0, o.y || 0, o.w === undefined ? W : o.w, o.h === undefined ? H : o.h, t, o.seed === undefined ? 11 : o.seed, o.n === undefined ? 24 : o.n, o.color);
  } else if (name === 'flame') {
    if (typeof flame !== 'function') return;
    flame(ctx, o.x === undefined ? W / 2 : o.x, o.y === undefined ? H * 0.8 : o.y, o.s === undefined ? 100 : o.s, t, o.seed === undefined ? 17 : o.seed, (o.intensity === undefined ? 1 : o.intensity) * k);
  } else if (name === 'embers') {
    if (typeof embers !== 'function') return;
    embers(ctx, o.x === undefined ? W / 2 : o.x, o.y === undefined ? H * 0.8 : o.y, o.r === undefined ? 150 : o.r, t, o.seed === undefined ? 23 : o.seed, o.n === undefined ? 26 : o.n, o.color);
  } else if (name === 'smoke') {
    if (typeof smoke !== 'function') return;
    smoke(ctx, o.x === undefined ? W / 2 : o.x, o.y === undefined ? H * 0.6 : o.y, o.s === undefined ? 120 : o.s, t, o.seed === undefined ? 31 : o.seed, (o.alpha === undefined ? 0.5 : o.alpha) * k);
  } else if (name === 'godrays') {
    if (typeof godRays !== 'function') return;
    godRays(ctx, o.x === undefined ? 400 : o.x, o.y === undefined ? 0 : o.y, o.angle === undefined ? 1 : o.angle, o.spread === undefined ? 0.3 : o.spread, o.len === undefined ? 1400 : o.len, o.color || '#ffd98a', (o.alpha === undefined ? 0.14 : o.alpha) * k, t, o.seed === undefined ? 4 : o.seed);
  }
  // unknown fx name: no-op at runtime (validateStory already warns authors).
}
function stgDrawFx(ctx, compiled, tl, t) {
  for (var i = 0; i < compiled.fxBeats.length; i++) {
    var fx = compiled.fxBeats[i];
    if (tl < fx.t) continue;
    var o = fx.opts || {};
    var fadeIn = o.fadeIn === undefined ? 1.0 : o.fadeIn;
    var k = stgClamp(fadeIn > 0 ? (tl - fx.t) / fadeIn : 1, 0, 1);
    stgDrawFxOne(ctx, fx.fx, o, k, t);
  }
}

// unknown/missing SETS[name]: a small labelled flat backdrop so a story can
// still be authored, staged and *rendered* before every set exists.
function stgDrawFallbackBackdrop(ctx, setName, sceneId) {
  ctx.save();
  if (typeof vgrad === 'function') vgrad(ctx, 0, 0, W, H, [[0, '#3a2a1a'], [0.5, '#4a3524'], [1, '#1a1008']]);
  else { ctx.fillStyle = '#241a10'; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = 'rgba(255,230,190,0.55)';
  ctx.font = '30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('[missing set "' + (setName || '(none)') + '" for scene "' + sceneId + '"]', W / 2, 70);
  ctx.restore();
}
function stgDrawMissingScene(ctx, sceneId) {
  ctx.save();
  ctx.fillStyle = '#150d08'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,220,180,0.6)';
  ctx.font = '32px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('[scene "' + sceneId + '" has no storyboard or fn]', W / 2, H / 2);
  ctx.restore();
}

// escape-hatch lookup: a classic top-level `const/var SCENE_FNS = {...}` in
// any earlier <script> is visible here as a bare identifier (all classic
// scripts on a page share one global scope); also check window.SCENE_FNS in
// case a story attaches it that way instead.
function stgGetSceneFn(id) {
  if (typeof window !== 'undefined' && window.SCENE_FNS && typeof window.SCENE_FNS[id] === 'function') return window.SCENE_FNS[id];
  if (typeof SCENE_FNS !== 'undefined' && SCENE_FNS && typeof SCENE_FNS[id] === 'function') return SCENE_FNS[id];
  return null;
}

// draws one already-compiled storyboard scene at scene-local time tl.
function stgDrawStoryboardScene(ctx, compiled, tl, t) {
  var sb = compiled.sb;
  var cam = stgCameraAt(compiled, tl);
  var actorsHook = function (c) { stgDrawActors(c, compiled, tl, t); };
  var setName = sb.set;
  var dressing = (sb.dressing && typeof sb.dressing === 'object' && !Array.isArray(sb.dressing)) ? sb.dressing : null;
  if (setName && typeof SETS !== 'undefined' && SETS && typeof SETS[setName] === 'function') {
    var setOpts = Object.assign({}, sb.setOpts, dressing, { actors: actorsHook });
    SETS[setName](ctx, cam, t, setOpts);
  } else {
    stgDrawFallbackBackdrop(ctx, setName, compiled.id);
    if (typeof camLayer === 'function') camLayer(ctx, cam, 1.0, actorsHook);
    else actorsHook(ctx);
  }
  // fx (petals etc.) sit over the set+actors; grade (wash/vignette) is the
  // very last per-scene step — matches the existing hand-written scenes'
  // own ordering (e.g. scGarland: hallSet -> petalRain -> wash).
  stgDrawFx(ctx, compiled, tl, t);
  var grade = sb.grade || {};
  if (grade.wash && typeof wash === 'function') wash(ctx, grade.wash, grade.washAlpha === undefined ? 0.08 : grade.washAlpha, grade.washMode);
  if (grade.vignette && typeof vignette === 'function') vignette(ctx, grade.vignette, grade.vignetteWarm !== false);
}

// ── buildFilmFromStory: the public entry point ──────────────────────────
function buildFilmFromStory(storyDef, TIMELINE) {
  storyDef = storyDef || {};
  TIMELINE = TIMELINE || { total: 0, scenes: [] };

  var sceneById = {};
  var scenesList = stgNormalizeScenes(storyDef);
  for (var i = 0; i < scenesList.length; i++) {
    var s = scenesList[i];
    if (s && s.id) sceneById[s.id] = s;
  }
  var compiledCache = {}; // keyed by scene id; compiled once, evaluated by local time.

  // ── subtitles: ported from film.js, generalized to the TIMELINE param ──
  var SUBS = [];
  var tlScenes = TIMELINE.scenes || [];
  for (var si = 0; si < tlScenes.length; si++) {
    var sc = tlScenes[si];
    var chunks = stgSubChunks(sc.display || '');
    var totalChars = 0;
    for (var ci = 0; ci < chunks.length; ci++) totalChars += chunks[ci].length;
    if (!totalChars) totalChars = 1;
    var at = sc.narrAt === undefined ? sc.start : sc.narrAt;
    for (var cj = 0; cj < chunks.length; cj++) {
      var c = chunks[cj];
      var d = (sc.narrDur || 0) * (c.length / totalChars);
      SUBS.push({ from: at, to: at + d, text: c });
      at += d;
    }
  }
  function drawSubtitle(ctx, T, dimK) {
    var s = null;
    for (var k = 0; k < SUBS.length; k++) { var cand = SUBS[k]; if (T >= cand.from - 0.15 && T <= cand.to + 0.1) { s = cand; break; } }
    if (!s) return;
    var a = Math.min(ramp(T, s.from - 0.15, s.from + 0.15), 1 - ramp(T, s.to - 0.1, s.to + 0.1));
    a *= (1 - (dimK || 0)); // suppressed while a folio plate is up
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'italic 31px Georgia, serif';
    // wrap into up to two centred lines inside the margin-frame safe width
    var maxW = W - 420;
    var lines = [s.text];
    if (ctx.measureText(s.text).width > maxW) {
      var words = s.text.split(' ');
      var best = Math.ceil(words.length / 2), l1 = null, l2 = null;
      for (var off = 0; off < words.length / 2; off++) {
        var done = false;
        for (var dir = -1; dir <= 1; dir += 2) {
          var cut = best + dir * off;
          if (cut <= 0 || cut >= words.length) continue;
          var c1 = words.slice(0, cut).join(' '), c2 = words.slice(cut).join(' ');
          if (ctx.measureText(c1).width <= maxW && ctx.measureText(c2).width <= maxW) { l1 = c1; l2 = c2; done = true; break; }
        }
        if (done) break;
      }
      if (!l1) { l1 = words.slice(0, best).join(' '); l2 = words.slice(best).join(' '); }
      lines = [l1, l2];
    }
    var lh = 40;
    var y0 = H - 64 - (lines.length - 1) * lh;
    var wMax = 0;
    for (var li = 0; li < lines.length; li++) wMax = Math.max(wMax, ctx.measureText(lines[li]).width);
    var g = ctx.createLinearGradient(W / 2 - wMax / 2 - 60, 0, W / 2 + wMax / 2 + 60, 0);
    g.addColorStop(0, 'rgba(12,6,2,0)'); g.addColorStop(0.12, 'rgba(12,6,2,0.55)');
    g.addColorStop(0.88, 'rgba(12,6,2,0.55)'); g.addColorStop(1, 'rgba(12,6,2,0)');
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 - wMax / 2 - 60, y0 - 36, wMax + 120, 50 + (lines.length - 1) * lh);
    ctx.fillStyle = '#f4e6c4';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
    for (var li2 = 0; li2 < lines.length; li2++) ctx.fillText(lines[li2], W / 2, y0 + li2 * lh);
    ctx.restore();
  }

  // ── dip-to-umber transitions at scene boundaries + start/end fades ──
  function transitionOverlay(ctx, T) {
    var scenes = TIMELINE.scenes || [];
    for (var i2 = 1; i2 < scenes.length; i2++) {
      var b = scenes[i2].start;
      var a = 1 - Math.abs(T - b) / 0.4;
      if (a > 0) { ctx.fillStyle = 'rgba(16,8,3,' + smooth(stgClamp(a, 0, 1)) + ')'; ctx.fillRect(0, 0, W, H); }
    }
    var inA = 1 - ramp(T, 0, 1.4);
    var outA = ramp(T, TIMELINE.total - 1.6, TIMELINE.total - 0.1);
    if (inA > 0) { ctx.fillStyle = 'rgba(8,4,2,' + inA + ')'; ctx.fillRect(0, 0, W, H); }
    if (outA > 0) { ctx.fillStyle = 'rgba(8,4,2,' + outA + ')'; ctx.fillRect(0, 0, W, H); }
  }

  function drawSceneById(ctx, sceneMeta, tl, T) {
    var id = sceneMeta.id;
    var def = sceneById[id];
    if (def && def.storyboard) {
      var compiled = compiledCache[id];
      if (!compiled) { compiled = stgCompileStoryboard(id, def.storyboard, sceneMeta); compiledCache[id] = compiled; }
      stgDrawStoryboardScene(ctx, compiled, tl, T);
      return;
    }
    var fn = stgGetSceneFn(id);
    if (fn) { fn(ctx, tl, sceneMeta.dur, T); return; }
    stgDrawMissingScene(ctx, id);
  }

  function drawFrame(ctx, T, opts) {
    opts = opts || {};
    var scenes = TIMELINE.scenes || [];
    if (!scenes.length) { ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); return; }
    T = stgClamp(T, 0, TIMELINE.total - 0.001);
    var scene = scenes[0];
    for (var i3 = 0; i3 < scenes.length; i3++) if (T >= scenes[i3].start) scene = scenes[i3];
    var tl = T - scene.start;
    ctx.save();
    drawSceneById(ctx, scene, tl, T);
    ctx.restore();
    // global finish: vignette + grain (every scene, storyboard or js-fn alike)
    vignette(ctx, 0.30, true);
    grain(ctx, 0.038, T);
    // folio alphas first — subtitles dim to zero underneath a plate
    var kT = 0, kE = 0, folMeta = null;
    if (storyDef.folios !== false && typeof drawTitleFolio === 'function') {
      var fol = storyDef.folios || {};
      folMeta = {
        title: TIMELINE.title, subtitle: TIMELINE.subtitle,
        sources: fol.sources || storyDef.sources || [],
        endLine: fol.endLine,
      };
      var tDur = fol.titleDur == null ? 3.4 : fol.titleDur;
      var eDur = fol.endDur == null ? 4.2 : fol.endDur;
      if (tDur > 0 && T < tDur + 0.8) kT = (1 - ramp(T, tDur - 0.8, tDur + 0.6)) * ramp(T, 0.0, 0.7);
      if (eDur > 0 && T > TIMELINE.total - eDur - 0.8) kE = ramp(T, TIMELINE.total - eDur, TIMELINE.total - eDur + 0.9);
    }
    if (opts.subs !== false) drawSubtitle(ctx, T, Math.min(1, (kT + kE) * 1.6));
    transitionOverlay(ctx, T);
    if (folMeta) {
      if (kT > 0) drawTitleFolio(ctx, folMeta, kT);
      if (kE > 0) drawEndFolio(ctx, folMeta, kE);
    }
    // illuminated margin frame — the studio's manuscript signature
    if (storyDef.frame !== false && typeof drawMarginFrame === 'function') {
      drawMarginFrame(ctx, storyDef.frame || {});
    }
  }

  // darshan support: screen-space positions of storyboard actors at time T
  function actorsAt(T) {
    var scenes = TIMELINE.scenes || [];
    if (!scenes.length) return [];
    T = stgClamp(T, 0, TIMELINE.total - 0.001);
    var scene = scenes[0];
    for (var i = 0; i < scenes.length; i++) if (T >= scenes[i].start) scene = scenes[i];
    var def = storyDef.scenes ? storyDef.scenes[scene.id] : null;
    if (!def || !def.storyboard) return [];
    var compiled = compiledCache[scene.id];
    if (!compiled) { compiled = stgCompileStoryboard(scene.id, def.storyboard, scene); compiledCache[scene.id] = compiled; }
    var tl = T - scene.start;
    var cam = stgCameraAt(compiled, tl);
    var out = [];
    var raw = (def.storyboard.actors || []);
    for (var j = 0; j < raw.length; j++) {
      var a = compiled.actors[raw[j].id];
      if (!a) continue;
      var box = stgProjectBox(cam, stgActorWorldBox(a, tl));
      if (box.x1 < 0 || box.x0 > W || box.y1 < 0 || box.y0 > H) continue;
      out.push({
        id: raw[j].id,
        who: typeof raw[j].who === 'string' ? raw[j].who : null,
        label: raw[j].label || (typeof raw[j].who === 'string' ? raw[j].who : raw[j].id),
        box: box,
      });
    }
    return out;
  }

  var film = {
    W: W, H: H,
    duration: TIMELINE.total,
    timeline: TIMELINE,
    draw: function (canvasCtx, T, opts) { drawFrame(canvasCtx, T, opts); },
    actorsAt: actorsAt,
  };
  if (typeof window !== 'undefined') window.__film = film;
  return film;
}

// ── composition linter: pure geometry over the compiled scene ───────────
var STG_SAFE = 0.05;          // 5% safe-area margin
var STG_SUB_BAND = 0.88;      // subtitle band = bottom 12% of frame
var STG_HEAD_FRAC = 0.25;     // head region = top quarter of the actor box

function stgActorWorldBox(actor, tt) {
  var p = stgEvalPosition(actor, tt, tt);
  var s = actor.s;
  return { x0: p.x - 85 * s, x1: p.x + 85 * s, y0: p.y - 400 * s, y1: p.y };
}
function stgProjectBox(cam, box) {
  var a = stgProject(cam, box.x0, box.y0), b = stgProject(cam, box.x1, box.y1);
  return {
    x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x),
    y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y),
  };
}
function stgHeadRegion(pbox) {
  return { x0: pbox.x0, x1: pbox.x1, y0: pbox.y0, y1: pbox.y0 + (pbox.y1 - pbox.y0) * STG_HEAD_FRAC };
}
function stgActiveSegment(actor, tt) {
  var segs = actor.posSegments, seg = segs[0];
  for (var i = 0; i < segs.length; i++) if (tt >= segs[i].t0) seg = segs[i];
  return seg;
}
function stgPtOffFrame(cam, wx, wy) {
  var p = stgProject(cam, wx, wy);
  return p.x < 0 || p.x > STG_W || p.y < 0 || p.y > STG_H;
}
// true while the actor is intentionally out of/entering frame: mid-entrance
// from an offscreen point, or moving toward an offscreen point (an exit).
function stgIntentionallyOut(actor, cam, tt) {
  var seg = stgActiveSegment(actor, tt);
  if (!isFinite(seg.t0)) return false; // static placement
  var hy = 350 * actor.s;
  if (tt <= seg.t1 && stgPtOffFrame(cam, seg.from[0], seg.from[1] - hy)) return true;
  if (stgPtOffFrame(cam, seg.to[0], seg.to[1] - hy)) return true;
  return false;
}
function stgFmtT(t) { return (Math.round(t * 100) / 100).toString(); }

function stgLintScene(compiled, out) {
  var id = compiled.id, dur = compiled.dur;
  var narr0 = compiled.narrLocal, narr1 = narr0 + compiled.narrDur;
  var safeX0 = STG_W * STG_SAFE, safeX1 = STG_W * (1 - STG_SAFE);
  var safeY0 = STG_H * STG_SAFE, safeY1 = STG_H * (1 - STG_SAFE);
  var bandY = STG_H * STG_SUB_BAND;
  var ids = Object.keys(compiled.actors);
  var seen = {}; // dedupe: one report per rule+actor(+pair)
  function report(kind, key, msg) {
    if (seen[key]) return;
    seen[key] = true;
    (kind === 'error' ? out.errors : out.warnings).push(msg);
  }

  // sample times: beats, segment starts/arrivals, start/mid/end, narration edges
  var times = [0, dur / 2, Math.max(dur - 0.05, 0)];
  if (compiled.narrDur > 0) times.push(narr0 + 0.1, (narr0 + narr1) / 2, narr1 - 0.1);
  for (var ti = 0; ti < compiled.fxBeats.length; ti++) times.push(compiled.fxBeats[ti].t);
  for (var ai = 0; ai < ids.length; ai++) {
    var ac = compiled.actors[ids[ai]];
    for (var pi = 0; pi < ac.poseBeats.length; pi++) times.push(ac.poseBeats[pi].t);
    for (var fi = 0; fi < ac.faceBeats.length; fi++) times.push(ac.faceBeats[fi].t);
    for (var si = 0; si < ac.posSegments.length; si++) {
      var sg = ac.posSegments[si];
      if (isFinite(sg.t0)) times.push(sg.t0, sg.t1);
    }
  }
  var samples = [];
  var seenT = {};
  for (var i = 0; i < times.length; i++) {
    var tt = stgClamp(times[i], 0, Math.max(dur - 0.001, 0));
    var tk = Math.round(tt * 1000);
    if (!seenT[tk]) { seenT[tk] = true; samples.push(tt); }
  }
  samples.sort(function (a, b) { return a - b; });

  // rule (c): facing vs movement direction — per segment, sample-independent
  for (var ci = 0; ci < ids.length; ci++) {
    var a3 = compiled.actors[ids[ci]];
    if (!a3.featured) continue;
    for (var s3 = 0; s3 < a3.posSegments.length; s3++) {
      var seg = a3.posSegments[s3];
      if (!isFinite(seg.t0)) continue;
      var dx = seg.to[0] - seg.from[0];
      if (Math.abs(dx) > 50 && dx * a3.facing < 0) {
        report('warn', 'c|' + a3.id + '|' + s3,
          'scene "' + id + '": [facing] actor "' + a3.id + '" moves ' + (dx > 0 ? 'right' : 'left') +
          ' (dx=' + Math.round(dx) + ') from t=' + stgFmtT(Math.max(seg.t0, 0)) + ' while facing ' + a3.facing + '.');
      }
    }
  }

  // rules (a), (b), (d) at each sample time
  for (var s4 = 0; s4 < samples.length; s4++) {
    var t4 = samples[s4];
    var cam = stgCameraAt(compiled, t4);
    var boxes = [];
    for (var a4 = 0; a4 < ids.length; a4++) {
      var actor = compiled.actors[ids[a4]];
      if (!actor.featured) continue;
      if (stgIntentionallyOut(actor, cam, t4)) continue;
      var pbox = stgProjectBox(cam, stgActorWorldBox(actor, t4));
      var head = stgHeadRegion(pbox);
      boxes.push({ id: actor.id, box: pbox });
      // (a) head region inside the 5% safe area
      if (head.x0 < safeX0 || head.x1 > safeX1 || head.y0 < safeY0 || head.y1 > safeY1) {
        report('error', 'a|' + actor.id,
          'scene "' + id + '": [safe-area] t=' + stgFmtT(t4) + ' actor "' + actor.id +
          '" head region outside 5% safe area (head x ' + Math.round(head.x0) + '..' + Math.round(head.x1) +
          ', y ' + Math.round(head.y0) + '..' + Math.round(head.y1) + '; safe x ' + Math.round(safeX0) + '..' + Math.round(safeX1) +
          ', y ' + Math.round(safeY0) + '..' + Math.round(safeY1) + ').');
      }
      // (d) head region vs subtitle band during narration
      if (compiled.narrDur > 0 && t4 >= narr0 && t4 <= narr1 && head.y1 >= bandY && head.y0 <= STG_H) {
        report('error', 'd|' + actor.id,
          'scene "' + id + '": [subtitle-band] t=' + stgFmtT(t4) + ' actor "' + actor.id +
          '" head region intersects subtitle band during narration (head y ' + Math.round(head.y0) + '..' + Math.round(head.y1) +
          ', band y>=' + Math.round(bandY) + ').');
      }
    }
    // (b) featured-actor overlap > 70% of the smaller box
    for (var p1 = 0; p1 < boxes.length; p1++) {
      for (var p2 = p1 + 1; p2 < boxes.length; p2++) {
        var A = boxes[p1].box, B = boxes[p2].box;
        var ix = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0);
        var iy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
        if (ix <= 0 || iy <= 0) continue;
        var inter = ix * iy;
        var minArea = Math.min((A.x1 - A.x0) * (A.y1 - A.y0), (B.x1 - B.x0) * (B.y1 - B.y0));
        if (minArea > 0 && inter / minArea > 0.7) {
          report('warn', 'b|' + boxes[p1].id + '|' + boxes[p2].id,
            'scene "' + id + '": [overlap] t=' + stgFmtT(t4) + ' actors "' + boxes[p1].id + '"+"' + boxes[p2].id +
            '" overlap ' + Math.round(inter / minArea * 100) + '% of the smaller box.');
        }
      }
    }
  }
}

// ── validateStory: static, Node-safe validation ─────────────────────────
function validateStory(storyJson, opts) {
  var errors = [];
  var warnings = [];
  var timeline = opts && opts.timeline;
  function metaFor(id) {
    var scs = timeline && timeline.scenes;
    if (scs) for (var mi = 0; mi < scs.length; mi++) if (scs[mi].id === id) return scs[mi];
    // nominal clock when no timeline exists yet (pre-narration authoring)
    return { start: 0, dur: 10, narrAt: 1, narrDur: 8 };
  }
  var scenes = stgNormalizeScenes(storyJson);
  if (!scenes.length) {
    warnings.push('story has no scenes[] to validate.');
    return { errors: errors, warnings: warnings };
  }
  for (var i = 0; i < scenes.length; i++) {
    var scene = scenes[i];
    var id = scene.id || '(no id)';
    if (!scene.storyboard) {
      if (!scene.fn && !scene.hasJsFn) {
        warnings.push('scene "' + id + '": no storyboard and no confirmed JS fn — assuming SCENE_FNS[\'' + id + '\'] escape hatch (unverifiable statically).');
      }
      continue;
    }
    var sb = scene.storyboard;

    if (!sb.set) {
      warnings.push('scene "' + id + '": storyboard has no "set" — will render a flat fallback backdrop.');
    } else if (!stgIsKnownSet(sb.set)) {
      warnings.push('scene "' + id + '": unknown set "' + sb.set + '" — will fall back to a flat backdrop.');
    }

    var camera = Array.isArray(sb.camera) ? sb.camera : [];
    for (var ci = 0; ci < camera.length; ci++) {
      if (camera[ci].t !== undefined && !stgIsValidTime(camera[ci].t)) {
        errors.push('scene "' + id + '": camera keyframe has malformed time ' + JSON.stringify(camera[ci].t) + '.');
      }
    }

    var actorIds = {};
    var actorList = Array.isArray(sb.actors) ? sb.actors : [];
    for (var ai = 0; ai < actorList.length; ai++) {
      var a = actorList[ai];
      if (!a) continue;
      if (!a.id) { warnings.push('scene "' + id + '": an actor entry has no "id" — beats cannot target it.'); }
      else { actorIds[a.id] = true; }
      if (!a.who) { warnings.push('scene "' + id + '": actor "' + (a.id || '?') + '" has no "who".'); }
      else if (!stgIsKnownWho(a.who)) { warnings.push('scene "' + id + '": actor "' + (a.id || '?') + '" references unknown who "' + a.who + '".'); }
      if (a.enter) {
        if (a.enter.t0 !== undefined && !stgIsValidTime(a.enter.t0)) errors.push('scene "' + id + '": actor "' + a.id + '" enter.t0 malformed time ' + JSON.stringify(a.enter.t0) + '.');
        if (a.enter.t1 !== undefined && !stgIsValidTime(a.enter.t1)) errors.push('scene "' + id + '": actor "' + a.id + '" enter.t1 malformed time ' + JSON.stringify(a.enter.t1) + '.');
      }
    }

    var beatList = Array.isArray(sb.beats) ? sb.beats : [];
    for (var bi = 0; bi < beatList.length; bi++) {
      var b = beatList[bi];
      if (!b) continue;
      if (!stgIsValidTime(b.at)) errors.push('scene "' + id + '": beat has malformed time ' + JSON.stringify(b.at) + '.');
      if (b.actor && !actorIds[b.actor]) errors.push('scene "' + id + '": beat at ' + JSON.stringify(b.at) + ' references unknown actor id "' + b.actor + '".');
      if (b.pose && !stgIsKnownPose(b.pose)) warnings.push('scene "' + id + '": beat pose "' + b.pose + '" not in known pose list.');
      if (b.fx && !stgIsKnownFx(b.fx)) warnings.push('scene "' + id + '": beat fx "' + b.fx + '" not in known fx list.');
      if (b.move && b.move.t1 !== undefined && !stgIsValidTime(b.move.t1)) errors.push('scene "' + id + '": move beat t1 malformed time ' + JSON.stringify(b.move.t1) + '.');
      if (!b.actor && !b.fx) warnings.push('scene "' + id + '": beat at ' + JSON.stringify(b.at) + ' has neither actor nor fx — no effect.');
    }

    // ── shot preset checks ──
    var shot = sb.shot;
    if (shot !== undefined) {
      if (typeof shot === 'string') shot = { type: shot };
      if (!shot || typeof shot !== 'object' || Array.isArray(shot)) {
        warnings.push('scene "' + id + '": malformed "shot" (expected string or {type,...}) — ignored.');
        shot = null;
      }
      if (shot) {
        if (STG_KNOWN_SHOTS.indexOf(shot.type) === -1) {
          warnings.push('scene "' + id + '": unknown shot type ' + JSON.stringify(shot.type) + ' — camera falls back to default framing.');
        }
        var slotIds = shot.actor !== undefined ? [shot.actor] : (Array.isArray(shot.actors) ? shot.actors : []);
        for (var sli = 0; sli < slotIds.length; sli++) {
          if (!actorIds[slotIds[sli]]) errors.push('scene "' + id + '": shot references unknown actor id "' + slotIds[sli] + '".');
        }
        if ((shot.type === 'close-up' || shot.type === 'processional') && shot.actor === undefined) {
          errors.push('scene "' + id + '": shot type "' + shot.type + '" requires an "actor" slot.');
        }
        if (shot.type === 'two-shot' && (!Array.isArray(shot.actors) || shot.actors.length !== 2)) {
          errors.push('scene "' + id + '": shot type "two-shot" requires exactly two ids in "actors".');
        }
      }
    }

    // ── dressing shape check ──
    if (sb.dressing !== undefined && (typeof sb.dressing !== 'object' || sb.dressing === null || Array.isArray(sb.dressing))) {
      warnings.push('scene "' + id + '": "dressing" should be a plain object of setOpts overrides — ignored.');
    }

    // ── composition linter (pure math over the compiled scene) ──
    try {
      var compiled = stgCompileStoryboard(id, sb, metaFor(id));
      stgLintScene(compiled, { errors: errors, warnings: warnings });
    } catch (e) {
      errors.push('scene "' + id + '": storyboard failed to compile: ' + (e && e.message ? e.message : String(e)));
    }
  }
  return { errors: errors, warnings: warnings };
}

if (typeof module !== 'undefined') module.exports = { validateStory: validateStory };
