#!/usr/bin/env node
// Assemble a story's pages:
//   <story>/dev.html            script-tag dev page (for shots.mjs / render.mjs / hacking)
//   <story>/dist/index.html     self-contained interactive player (audio inlined)
//   <story>/dist/artifact.html  same, minus outer document skeleton (for claude.ai Artifacts)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { engineDir, mediaDir, storyDir, loadStory } from './lib.mjs';

const story = storyDir(process.argv);
const cfg = loadStory(story);
mkdirSync(join(story, 'dist'), { recursive: true });

const engineFiles = cfg.engineFiles || ['core.js', 'paint.js', 'people.js', 'world.js'];
const storyFiles = cfg.storyFiles || ['timeline.js', 'film.js'];
const readEngine = f => readFileSync(join(engineDir, 'src', f), 'utf8');
const readStory = f => readFileSync(join(story, f), 'utf8');

// character registry + story config, exposed as globals on every page
const regPath = join(mediaDir, 'characters', 'registry.json');
const registryJs = (existsSync(regPath)
  ? 'const CHARACTERS = ' + JSON.stringify(JSON.parse(readFileSync(regPath, 'utf8')).characters || {}) + ';\n'
  : 'const CHARACTERS = {};\n')
  + 'const STORY = ' + JSON.stringify(cfg) + ';\n';

// ── dev page: plain script tags, relative paths ──
const devTags = [
  `<script>${registryJs}</script>`,
  ...engineFiles.map(f => `<script src="../../engine/src/${f}"></script>`),
  ...storyFiles.map(f => `<script src="${f}"></script>`),
].join('\n');
writeFileSync(join(story, 'dev.html'), `<!doctype html>
<meta charset="utf-8">
<title>dev — ${cfg.title}</title>
<style>body{margin:0;background:#0d0906;color:#cfa96a;font:14px Georgia}canvas{display:block;width:100%;max-width:1920px}#bar{padding:8px}input[type=range]{width:70%}</style>
<canvas id="cv" width="1920" height="1080"></canvas>
<div id="bar"><button id="play">▶</button><input type="range" id="seek" min="0" max="1" step="0.05" value="0"><span id="tt">0.0</span></div>
${devTags}
<script>
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const seek = document.getElementById('seek'), tt = document.getElementById('tt');
seek.max = __film.duration;
const q = new URLSearchParams(location.search);
let T = parseFloat(q.get('t') || '0'), playing = false, last = 0;
function frame(ts) {
  if (playing) { T += (ts - last) / 1000; if (T > __film.duration) T = 0; }
  last = ts;
  seek.value = T; tt.textContent = T.toFixed(1);
  __film.draw(ctx, T, {});
  requestAnimationFrame(frame);
}
if (!q.get('render')) requestAnimationFrame(frame);
seek.oninput = () => { T = parseFloat(seek.value); };
document.getElementById('play').onclick = () => playing = !playing;
window.__renderFrame = (i, fps, q2) => {
  __film.draw(ctx, i / fps, {});
  return cv.toDataURL('image/jpeg', q2 || 0.93);
};
</script>`);

// ── player page ──
const js = [
  '// ===== characters/registry =====\n' + registryJs,
  ...engineFiles.map(f => `// ===== engine/${f} =====\n` + readEngine(f)),
  ...storyFiles.map(f => `// ===== ${f} =====\n` + readStory(f)),
].join('\n');
const mp3Path = join(story, 'audio', 'mix.mp3');
if (!existsSync(mp3Path)) { console.error('audio/mix.mp3 missing — run music + mix first'); process.exit(2); }
const mp3 = readFileSync(mp3Path).toString('base64');
const tpl = readFileSync(join(engineDir, 'src', 'player.template.html'), 'utf8');
const html = tpl
  .replaceAll('{{TITLE}}', cfg.title)
  .replaceAll('{{TITLE_HTML}}', cfg.titleHtml || cfg.title)
  .replaceAll('{{SUBTITLE}}', cfg.subtitle || '')
  .replaceAll('{{WATCH_HINT}}', cfg.watchHint || 'watch')
  .replace('/*{{FILM_JS}}*/', () => js)
  .replace('{{MP3_BASE64}}', () => mp3);
writeFileSync(join(story, 'dist', 'index.html'), html);

const inner = html
  .replace(/^<!doctype html>\s*<html lang="en">\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/, '')
  .replace(/<\/head>\s*<body>/, '')
  .replace(/<\/body>\s*<\/html>\s*$/, '');
writeFileSync(join(story, 'dist', 'artifact.html'), inner);
console.log('built dev.html, dist/index.html (%s MB), dist/artifact.html',
  (html.length / 1048576).toFixed(2));
