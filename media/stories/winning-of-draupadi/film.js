// ── main.js ── timeline assembly, subtitles, transitions, film API.
'use strict';

const SCENE_FNS = {
  fire: scFire, hall: scHall, kings: scKings, rises: scRises,
  shot: scShot, garland: scGarland, kunti: scKunti, wedding: scWedding,
};

// split display text into subtitle chunks (~<=88 chars, at sentence/clause breaks)
function subChunks(text) {
  const parts = text.match(/[^.!?—]+[.!?…]*(\s*—\s*)?/g) || [text];
  const chunks = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > 88 && cur) { chunks.push(cur.trim()); cur = p; }
    else cur += p;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}
const SUBS = [];
for (const sc of TIMELINE.scenes) {
  const chunks = subChunks(sc.display);
  const totalChars = chunks.reduce((a, c) => a + c.length, 0);
  let at = sc.narrAt;
  for (const c of chunks) {
    const d = sc.narrDur * (c.length / totalChars);
    SUBS.push({ from: at, to: at + d, text: c });
    at += d;
  }
}

function drawSubtitle(ctx, T) {
  const s = SUBS.find(s => T >= s.from - 0.15 && T <= s.to + 0.1);
  if (!s) return;
  const a = Math.min(ramp(T, s.from - 0.15, s.from + 0.15), 1 - ramp(T, s.to - 0.1, s.to + 0.1));
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.font = 'italic 34px Georgia, serif';
  const y = H - 54;
  const w = ctx.measureText(s.text).width;
  const g = ctx.createLinearGradient(W / 2 - w / 2 - 60, 0, W / 2 + w / 2 + 60, 0);
  g.addColorStop(0, 'rgba(12,6,2,0)'); g.addColorStop(0.12, 'rgba(12,6,2,0.55)');
  g.addColorStop(0.88, 'rgba(12,6,2,0.55)'); g.addColorStop(1, 'rgba(12,6,2,0)');
  ctx.fillStyle = g;
  ctx.fillRect(W / 2 - w / 2 - 60, y - 40, w + 120, 58);
  ctx.fillStyle = '#f4e6c4';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
  ctx.fillText(s.text, W / 2, y);
  ctx.restore();
}

// dip-to-umber transitions at scene boundaries
function transitionOverlay(ctx, T) {
  for (let i = 1; i < TIMELINE.scenes.length; i++) {
    const b = TIMELINE.scenes[i].start;
    const a = 1 - Math.abs(T - b) / 0.4;
    if (a > 0) {
      ctx.fillStyle = `rgba(16,8,3,${smooth(clamp(a, 0, 1))})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
  // fade in from black at the very start; fade out at the very end
  const inA = 1 - ramp(T, 0, 1.4);
  const outA = ramp(T, TIMELINE.total - 1.6, TIMELINE.total - 0.1);
  if (inA > 0) { ctx.fillStyle = `rgba(8,4,2,${inA})`; ctx.fillRect(0, 0, W, H); }
  if (outA > 0) { ctx.fillStyle = `rgba(8,4,2,${outA})`; ctx.fillRect(0, 0, W, H); }
}

// master frame renderer: T in seconds, opts {subs}
function drawFrame(ctx, T, opts) {
  opts = opts || {};
  T = clamp(T, 0, TIMELINE.total - 0.001);
  let scene = TIMELINE.scenes[0];
  for (const s of TIMELINE.scenes) if (T >= s.start) scene = s;
  const tl = T - scene.start;
  ctx.save();
  SCENE_FNS[scene.id](ctx, tl, scene.dur, T);
  ctx.restore();
  // global finish: vignette + grain
  vignette(ctx, 0.30, true);
  grain(ctx, 0.038, T);
  if (opts.subs !== false) drawSubtitle(ctx, T);
  transitionOverlay(ctx, T);
}

// public film API (used by dev page, player, and the headless renderer)
window.__film = {
  W, H,
  duration: TIMELINE.total,
  timeline: TIMELINE,
  draw(canvasCtx, T, opts) { drawFrame(canvasCtx, T, opts); },
};
