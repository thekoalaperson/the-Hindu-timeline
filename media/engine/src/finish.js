// ── finish.js ── manuscript identity: illuminated margin frame, calligraphic
// title/end folios with corpus colophon, poster titling. Part of the film
// compositor; stage.js calls these when the story enables them.
// API: drawMarginFrame(ctx, opts?), drawTitleFolio(ctx, meta, k),
//      drawEndFolio(ctx, meta, k), drawPosterTitle(ctx, meta)
'use strict';

// The frame is static — cache it once per style key.
function drawMarginFrame(ctx, o) {
  o = o || {};
  const key = 'finish-frame-' + (o.tone || 'default');
  const tile = cached(key, W, H, (g) => {
    const m = 24;                     // band width
    const inner = 8;                  // inner gold rule inset from band
    // outer band: deep lacquer with subtle gradient
    g.save();
    const band = g.createLinearGradient(0, 0, 0, H);
    band.addColorStop(0, '#241206'); band.addColorStop(0.5, '#170b04'); band.addColorStop(1, '#241206');
    g.fillStyle = band;
    g.fillRect(0, 0, W, m); g.fillRect(0, H - m, W, m);
    g.fillRect(0, 0, m, H); g.fillRect(W - m, 0, m, H);
    // fine double gold rule
    g.strokeStyle = rgba('#e8b64c', 0.85); g.lineWidth = 2;
    g.strokeRect(m - 2, m - 2, W - 2 * m + 4, H - 2 * m + 4);
    g.strokeStyle = rgba('#9a7c4e', 0.65); g.lineWidth = 1;
    g.strokeRect(m + inner, m + inner, W - 2 * (m + inner), H - 2 * (m + inner));
    // ornament ticks along the band (tiny lotus-bud dashes)
    g.fillStyle = rgba('#e8b64c', 0.5);
    const step = 46;
    for (let x = m + 20; x < W - m - 20; x += step) {
      g.beginPath(); g.arc(x, m / 2 + 1, 2.2, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + step / 2, H - m / 2 - 1, 2.2, 0, TAU); g.fill();
    }
    for (let y = m + 20; y < H - m - 20; y += step) {
      g.beginPath(); g.arc(m / 2 + 1, y, 2.2, 0, TAU); g.fill();
      g.beginPath(); g.arc(W - m / 2 - 1, y + step / 2, 2.2, 0, TAU); g.fill();
    }
    // corner medallions: eight-petal lotus rosettes
    const corner = (cx, cy) => {
      g.save(); g.translate(cx, cy);
      g.fillStyle = '#1d0e05';
      g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fill();
      g.strokeStyle = rgba('#e8b64c', 0.9); g.lineWidth = 1.6;
      g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.stroke();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        g.save(); g.rotate(a);
        g.fillStyle = rgba('#e8b64c', 0.75);
        g.beginPath(); g.ellipse(8.5, 0, 5.5, 2.6, 0, 0, TAU); g.fill();
        g.restore();
      }
      g.fillStyle = '#c9302a';
      g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill();
      g.restore();
    };
    corner(m, m); corner(W - m, m); corner(m, H - m); corner(W - m, H - m);
    g.restore();
  });
  ctx.drawImage(tile, 0, 0);
}

// shared folio ground: deep night-lacquer with a faint gold aura and rules
function _folioGround(ctx, k) {
  ctx.save();
  ctx.globalAlpha = k;
  vgrad(ctx, 0, 0, W, H, [[0, '#160b1e'], [0.55, '#20101a'], [1, '#120804']]);
  glowAdd(ctx, W / 2, H * 0.42, 620, 'rgba(232,182,76,0.10)', 1);
  // ornamental rules
  ctx.strokeStyle = rgba('#e8b64c', 0.55); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(W * 0.3, H * 0.30); ctx.lineTo(W * 0.7, H * 0.30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.3, H * 0.615); ctx.lineTo(W * 0.7, H * 0.615); ctx.stroke();
  // lotus bud centered on each rule
  for (const yy of [H * 0.30, H * 0.615]) {
    ctx.fillStyle = rgba('#e8b64c', 0.8);
    ctx.beginPath(); ctx.ellipse(W / 2, yy, 5, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#c9302a', 0.8);
    ctx.beginPath(); ctx.arc(W / 2, yy, 2.2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawTitleFolio(ctx, meta, k) {
  if (k <= 0.005) return;
  _folioGround(ctx, k);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.textAlign = 'center';
  // small invocation mark
  ctx.fillStyle = rgba('#cfa96a', 0.9);
  ctx.font = '30px Georgia, serif';
  ctx.fillText('॥', W / 2, H * 0.265);
  // title
  ctx.fillStyle = '#f2dfae';
  ctx.font = '600 78px Georgia, serif';
  ctx.shadowColor = 'rgba(232,182,76,0.45)'; ctx.shadowBlur = 26;
  ctx.fillText(meta.title || '', W / 2, H * 0.435);
  // subtitle
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#cfa96a';
  ctx.font = 'italic 30px Georgia, serif';
  ctx.fillText(meta.subtitle || '', W / 2, H * 0.51);
  ctx.restore();
}

function drawEndFolio(ctx, meta, k) {
  if (k <= 0.005) return;
  _folioGround(ctx, k);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2dfae';
  ctx.font = '600 46px Georgia, serif';
  ctx.shadowColor = 'rgba(232,182,76,0.4)'; ctx.shadowBlur = 18;
  ctx.fillText(meta.endLine || '॥ śubham ॥', W / 2, H * 0.40);
  ctx.shadowBlur = 8;
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillStyle = '#cfa96a';
  ctx.fillText(meta.subtitle || '', W / 2, H * 0.465);
  // colophon: cite the corpus sources
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = '#9a7c4e';
  const src = (meta.sources || []).slice(0, 3);
  ctx.fillText('drawn from the corpus:', W / 2, H * 0.565);
  src.forEach((s, i) => ctx.fillText(s, W / 2, H * 0.565 + 30 + i * 28));
  ctx.font = '18px Georgia, serif';
  ctx.fillStyle = '#66517c';
  ctx.fillText('hand-drawn with code · no AI imagery · the-Hindu-timeline', W / 2, H * 0.72 + src.length * 8);
  ctx.restore();
}

function drawPosterTitle(ctx, meta) {
  ctx.save();
  ctx.textAlign = 'center';
  const g = ctx.createLinearGradient(0, H - 300, 0, H);
  g.addColorStop(0, 'rgba(10,5,2,0)'); g.addColorStop(1, 'rgba(10,5,2,0.82)');
  ctx.fillStyle = g; ctx.fillRect(0, H - 300, W, 300);
  ctx.fillStyle = '#f2dfae';
  ctx.font = '600 64px Georgia, serif';
  ctx.shadowColor = 'rgba(232,182,76,0.5)'; ctx.shadowBlur = 22;
  ctx.fillText(meta.title || '', W / 2, H - 120);
  ctx.shadowBlur = 8;
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillStyle = '#cfa96a';
  ctx.fillText(meta.subtitle || '', W / 2, H - 70);
  ctx.restore();
}
