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
//   validateStory(storyJson) -> {errors:[], warnings:[]}
//     Pure, Node-safe validation of the same storyDef shape — no canvas/DOM
//     required, so it runs headless via engine/build/validate.mjs. Reports:
//     unknown set names, actors with an unrecognised `who`, beats/moves that
//     reference an actor id the scene never declared (error), malformed time
//     specs (error), pose/fx names outside the known lists (warn), and
//     scenes with neither a storyboard nor a confirmed JS fn (warn — this
//     can't be verified statically, so it is always a warning, never fatal).
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
var STG_KNOWN_POSES = ['stand', 'kneel', 'sit', 'bow', 'pranam', 'pray', 'point', 'refuse', 'shoot', 'carry', 'bless', 'shock', 'grief', 'dance'];
var STG_KNOWN_ARCHETYPES = ['king', 'queen', 'prince', 'princess', 'warrior', 'brahmin', 'priest', 'villager', 'hunter'];
var STG_KNOWN_FX = ['petals', 'glow', 'motes', 'flame', 'embers', 'smoke', 'godrays'];

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
    try { var p = Person.of(who); if (p) return p; } catch (e) { /* fall through */ }
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
  }
  fxBeats.sort(function (x, y) { return x.t - y.t; });

  var camera = (Array.isArray(sb.camera) ? sb.camera : []).map(function (kf) {
    return { t: T(kf.t === undefined ? 0 : kf.t), x: kf.x === undefined ? 0 : kf.x, y: kf.y === undefined ? 0 : kf.y, z: kf.z === undefined ? 1 : kf.z, ease: kf.ease || 'io' };
  }).sort(function (x, y) { return x.t - y.t; });

  return { id: id, sb: sb, actors: actors, fxBeats: fxBeats, camera: camera, dur: dur };
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
  var cam = compiled.camera.length ? stgCamTrack(compiled.camera, tl) : { x: 0, y: 0, z: 1 };
  var actorsHook = function (c) { stgDrawActors(c, compiled, tl, t); };
  var setName = sb.set;
  if (setName && typeof SETS !== 'undefined' && SETS && typeof SETS[setName] === 'function') {
    var setOpts = Object.assign({}, sb.setOpts, { actors: actorsHook });
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
  function drawSubtitle(ctx, T) {
    var s = null;
    for (var k = 0; k < SUBS.length; k++) { var cand = SUBS[k]; if (T >= cand.from - 0.15 && T <= cand.to + 0.1) { s = cand; break; } }
    if (!s) return;
    var a = Math.min(ramp(T, s.from - 0.15, s.from + 0.15), 1 - ramp(T, s.to - 0.1, s.to + 0.1));
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'italic 34px Georgia, serif';
    var y = H - 54;
    var w = ctx.measureText(s.text).width;
    var g = ctx.createLinearGradient(W / 2 - w / 2 - 60, 0, W / 2 + w / 2 + 60, 0);
    g.addColorStop(0, 'rgba(12,6,2,0)'); g.addColorStop(0.12, 'rgba(12,6,2,0.55)');
    g.addColorStop(0.88, 'rgba(12,6,2,0.55)'); g.addColorStop(1, 'rgba(12,6,2,0)');
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 - w / 2 - 60, y - 40, w + 120, 58);
    ctx.fillStyle = '#f4e6c4';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
    ctx.fillText(s.text, W / 2, y);
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
    if (opts.subs !== false) drawSubtitle(ctx, T);
    transitionOverlay(ctx, T);
  }

  var film = {
    W: W, H: H,
    duration: TIMELINE.total,
    timeline: TIMELINE,
    draw: function (canvasCtx, T, opts) { drawFrame(canvasCtx, T, opts); },
  };
  if (typeof window !== 'undefined') window.__film = film;
  return film;
}

// ── validateStory: static, Node-safe validation ─────────────────────────
function validateStory(storyJson) {
  var errors = [];
  var warnings = [];
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
  }
  return { errors: errors, warnings: warnings };
}

if (typeof module !== 'undefined') module.exports = { validateStory: validateStory };
