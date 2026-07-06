#!/usr/bin/env node
// Assemble the self-contained interactive player: dist/index.html
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = f => readFileSync(join(root, 'src', f), 'utf8');

const js = ['core.js', 'paint.js', 'people.js', 'cast.js', 'world.js', 'timeline.js',
  'scenes1.js', 'scenes2.js', 'scenes3.js', 'main.js']
  .map(f => `// ===== ${f} =====\n` + src(f)).join('\n');

const mp3 = readFileSync(join(root, 'audio', 'mix.mp3')).toString('base64');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Winning of Draupadī — an animated retelling</title>
<style>
  :root { --gold:#e8b64c; --gold-dim:#9a7c4e; --ink:#f2dfae; }
  * { box-sizing: border-box; }
  html, body { margin:0; height:100%; }
  body {
    background: radial-gradient(120% 90% at 50% 0%, #241736 0%, #120b1e 55%, #0a0612 100%);
    color: var(--ink); font: 16px/1.5 Georgia, 'Times New Roman', serif;
    display:flex; flex-direction:column; align-items:center; min-height:100%;
  }
  header { text-align:center; padding:26px 16px 10px; }
  header h1 { font-size: clamp(22px, 3.4vw, 38px); font-weight:600; margin:0; letter-spacing:0.06em; color:var(--ink); }
  header h1 .d { color:var(--gold); }
  header p { margin:6px 0 0; color:var(--gold-dim); font-style:italic; font-size:clamp(12px,1.6vw,16px); }
  #stage { position:relative; width:min(96vw, 172vh); max-width:1500px; }
  #stage .frame {
    position:relative; border:1px solid #3a2c50; border-radius:10px; overflow:hidden;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 6px rgba(232,182,76,0.05);
    background:#000; aspect-ratio:16/9;
  }
  canvas { display:block; width:100%; height:100%; }
  #poster {
    position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;
    justify-content:center; gap:18px; background:rgba(8,4,14,0.35); cursor:pointer;
    transition: opacity 0.5s; z-index:3;
  }
  #poster.hide { opacity:0; pointer-events:none; }
  #playbtn {
    width:92px; height:92px; border-radius:50%; border:2px solid var(--gold);
    background: rgba(20,12,30,0.65); display:flex; align-items:center; justify-content:center;
    transition: transform .2s, background .2s;
  }
  #poster:hover #playbtn { transform:scale(1.08); background:rgba(60,36,80,0.7); }
  #playbtn svg { margin-left:8px; }
  #poster .hint { color:var(--ink); letter-spacing:0.2em; font-size:13px; text-transform:uppercase; }
  #controls {
    display:flex; align-items:center; gap:14px; padding:12px 6px 4px; width:100%;
    user-select:none;
  }
  button.ctl {
    background:none; border:1px solid #4a3a66; color:var(--ink); border-radius:6px;
    width:40px; height:34px; cursor:pointer; font-size:15px; line-height:1;
  }
  button.ctl:hover { border-color: var(--gold); }
  button.ctl.active { background:#3a2c50; border-color:var(--gold); }
  #bar { position:relative; flex:1; height:22px; cursor:pointer; }
  #bar .rail { position:absolute; left:0; right:0; top:9px; height:4px; background:#3a2c50; border-radius:2px; }
  #bar .fill { position:absolute; left:0; top:9px; height:4px; background:var(--gold); border-radius:2px; width:0; }
  #bar .tick { position:absolute; top:7px; width:2px; height:8px; background:#7c5aa0; }
  #bar .knob { position:absolute; top:4px; width:14px; height:14px; border-radius:50%; background:var(--gold); margin-left:-7px; box-shadow:0 0 8px rgba(232,182,76,0.8); }
  #clock { font-variant-numeric: tabular-nums; color:var(--gold-dim); font-size:14px; min-width:86px; text-align:right; }
  #chapters { display:flex; flex-wrap:wrap; gap:6px 4px; justify-content:center; padding:10px 8px 8px; }
  #chapters button {
    background:none; border:none; color:var(--gold-dim); font:inherit; font-size:13px;
    cursor:pointer; padding:3px 10px; border-radius:12px; font-style:italic;
  }
  #chapters button:hover { color:var(--ink); }
  #chapters button.now { color:var(--gold); background:rgba(232,182,76,0.10); }
  #chapters .sep { color:#4a3a66; align-self:center; }
  footer { padding: 4px 18px 30px; color:#66517c; font-size:12.5px; text-align:center; font-style:italic; }
  footer a { color:#9a7c4e; }
</style>
</head>
<body>
<header>
  <h1>The Winning of <span class="d">Draupadī</span></h1>
  <p>an animated retelling · Mahābhārata, Ādi Parva 166–198</p>
</header>
<div id="stage">
  <div class="frame">
    <canvas id="cv" width="1920" height="1080"></canvas>
    <div id="poster">
      <div id="playbtn">
        <svg width="34" height="38" viewBox="0 0 34 38"><path d="M2 2 L32 19 L2 36 Z" fill="#e8b64c"/></svg>
      </div>
      <div class="hint">watch · 2 min 15 s</div>
    </div>
  </div>
  <div id="controls">
    <button class="ctl" id="pp" title="play/pause (space)">▶</button>
    <div id="bar"><div class="rail"></div><div class="fill"></div><div class="knob"></div></div>
    <span id="clock">0:00 / 2:15</span>
    <button class="ctl active" id="cc" title="subtitles">cc</button>
    <button class="ctl" id="fs" title="fullscreen">⛶</button>
  </div>
  <div id="chapters"></div>
</div>
<footer>
  Every frame is drawn live by hand-written canvas code — no AI-generated imagery, no stock assets.
  Score synthesized note by note; narration by classic diphone TTS. ·
  From the <em>the-Hindu-timeline</em> repository, Ādi Parva deep-dive.
</footer>
<script>
${js}
</script>
<script>
// ── player ──
const AUDIO_SRC = 'data:audio/mpeg;base64,${mp3}';
const cv = document.getElementById('cv');
let ctx = cv.getContext('2d');
const audio = new Audio(AUDIO_SRC);
audio.preload = 'auto';
const DURN = __film.duration;

const poster = document.getElementById('poster');
const ppBtn = document.getElementById('pp');
const ccBtn = document.getElementById('cc');
const fsBtn = document.getElementById('fs');
const bar = document.getElementById('bar');
const fill = bar.querySelector('.fill');
const knob = bar.querySelector('.knob');
const clock = document.getElementById('clock');
const chaps = document.getElementById('chapters');

let subs = true, started = false;
let quality = 1;               // adaptive resolution factor
let slowFrames = 0;

// chapter buttons + ticks
TIMELINE.scenes.forEach((s, i) => {
  if (i > 0) {
    const sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = '·';
    chaps.appendChild(sep);
    const tick = document.createElement('div');
    tick.className = 'tick'; tick.style.left = (s.start / DURN * 100) + '%';
    bar.appendChild(tick);
  }
  const b = document.createElement('button');
  b.textContent = s.name; b.dataset.at = s.start;
  b.onclick = () => { seekTo(s.start + 0.02); play(); };
  chaps.appendChild(b);
});

function fmt(t) { t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + String(s).padStart(2, '0'); }

function setQuality(k) {
  quality = k;
  cv.width = Math.round(1920 * k); cv.height = Math.round(1080 * k);
  ctx = cv.getContext('2d');
}
function drawAt(T) {
  const t0 = performance.now();
  ctx.setTransform(quality, 0, 0, quality, 0, 0);
  __film.draw(ctx, T, { subs });
  const dt = performance.now() - t0;
  // adaptive: drop resolution if consistently slow, restore if fast
  if (dt > 40) { if (++slowFrames > 24 && quality > 0.66) { setQuality(quality > 0.85 ? 0.8 : 0.66); slowFrames = 0; } }
  else if (dt < 18 && quality < 1) { if (--slowFrames < -240) { setQuality(1); slowFrames = 0; } }
}
function refreshUI(T) {
  fill.style.width = knob.style.left = (T / DURN * 100) + '%';
  clock.textContent = fmt(T) + ' / ' + fmt(DURN);
  let cur = null;
  chaps.querySelectorAll('button').forEach(b => {
    const at = parseFloat(b.dataset.at);
    if (T >= at) cur = b;
    b.classList.remove('now');
  });
  if (cur) cur.classList.add('now');
}

let raf = null;
function loop() {
  const T = Math.min(audio.currentTime, DURN - 0.001);
  drawAt(T); refreshUI(T);
  if (audio.currentTime >= DURN) { pause(); }
  raf = requestAnimationFrame(loop);
}
function play() {
  if (!started) { started = true; poster.classList.add('hide'); }
  audio.play();
  ppBtn.textContent = '❚❚';
  if (!raf) loop();
}
function pause() {
  audio.pause();
  ppBtn.textContent = '▶';
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  drawAt(Math.min(audio.currentTime, DURN - 0.001));
  refreshUI(audio.currentTime);
}
function toggle() { audio.paused ? play() : pause(); }
function seekTo(T) {
  T = Math.max(0, Math.min(T, DURN - 0.05));
  audio.currentTime = T;
  drawAt(T); refreshUI(T);
}

poster.onclick = play;
ppBtn.onclick = toggle;
ccBtn.onclick = () => { subs = !subs; ccBtn.classList.toggle('active', subs); drawAt(audio.currentTime); };
fsBtn.onclick = () => {
  const el = document.querySelector('#stage .frame');
  document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
};
let scrubbing = false;
const barSeek = (e) => {
  const r = bar.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  seekTo(x / r.width * DURN);
};
bar.addEventListener('pointerdown', e => { scrubbing = true; bar.setPointerCapture(e.pointerId); barSeek(e); });
bar.addEventListener('pointermove', e => scrubbing && barSeek(e));
bar.addEventListener('pointerup', () => scrubbing = false);
document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.code === 'ArrowRight') seekTo(audio.currentTime + 5);
  if (e.code === 'ArrowLeft') seekTo(audio.currentTime - 5);
  if (e.key === 'c') ccBtn.onclick();
});
// paint the opening frame behind the poster
drawAt(0.02); refreshUI(0);
</script>
</body>
</html>`;

writeFileSync(join(root, 'dist', 'index.html'), html);
console.log('dist/index.html', (html.length / 1048576).toFixed(2), 'MB');

// artifact variant: same page without the outer document skeleton
// (the hosting wrapper supplies <!doctype>/<html>/<head>/<body>)
const inner = html
  .replace(/^<!doctype html>\s*<html lang="en">\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/, '')
  .replace(/<\/head>\s*<body>/, '')
  .replace(/<\/body>\s*<\/html>\s*$/, '');
writeFileSync(join(root, 'dist', 'artifact.html'), inner);
console.log('dist/artifact.html', (inner.length / 1048576).toFixed(2), 'MB');
