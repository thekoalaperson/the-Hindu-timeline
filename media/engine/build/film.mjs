#!/usr/bin/env node
// One-command film orchestrator — the single entry point for turning a
// story package (story.json/script.json + engine) into stills/player/film.
//
//   node engine/build/film.mjs <subcommand> --story <slug> [options]
//
// Subcommands:
//   validate   engine/build/validate.mjs, if it exists yet (else notes it's
//              not installed and continues — non-fatal).
//   audio      narrate.mjs -> music.mjs -> mix.sh, in sequence.
//              Forwards --provider <p> to narrate.mjs, --legacy to music.mjs.
//   stills     shots.mjs --story --times <scene starts + midpoints, read
//              from timeline.json> --out /tmp/film-<slug>.
//   player     build-player.mjs (dev.html + dist/index.html + artifact.html).
//   render     render.mjs (headless-Chromium frame render -> MP4). Slow —
//              not part of `all`; run it on its own.
//   all        validate -> audio -> player -> stills, then a checklist.
//
// Options:
//   --story <slug|path>   required (forwarded to every step; see lib.mjs)
//   --provider <name>     forwarded to narrate.mjs (audio/all steps only)
//   --legacy              forwarded to music.mjs (audio/all steps only)
//   --raga <name>         forwarded to music.mjs (audio/all steps only):
//                          whole-film raga pin (yamanish|bhairavish|deshish)
//   --dry                 print the plan (every command it would run) and
//                          exit without executing or touching disk.
//
// Fails fast: the first step that exits non-zero stops the run and names
// itself in the error output.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { engineDir, storyDir, loadTimeline, arg } from './lib.mjs';

const SUBCOMMANDS = ['validate', 'audio', 'stills', 'player', 'render', 'all'];
const sub = process.argv[2];
if (!SUBCOMMANDS.includes(sub)) {
  console.error(`usage: film.mjs <${SUBCOMMANDS.join('|')}> --story <slug> [--provider p] [--legacy] [--raga r] [--dry]`);
  process.exit(2);
}

const story = storyDir(process.argv);
const slug = basename(story);
const dry = process.argv.includes('--dry');
const providerFlag = arg(process.argv, '--provider', null);
const legacyFlag = process.argv.includes('--legacy');
const ragaFlag = arg(process.argv, '--raga', null);
const build = f => join(engineDir, 'build', f);

function run(cmd, args) {
  console.log(`  ${dry ? '[dry]' : '$'} ${cmd} ${args.join(' ')}`);
  if (dry) return;
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function step(name, fn) {
  console.log(`\n▶ ${name}`);
  const t0 = Date.now();
  try {
    fn();
  } catch (e) {
    console.error(`\n✖ FAILED at step: ${name}`);
    console.error(e.message || e);
    process.exit(1);
  }
  if (!dry) console.log(`✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

function doValidate() {
  const validator = build('validate.mjs');
  if (!existsSync(validator)) {
    console.log('  validator not installed — skipping (engine/build/validate.mjs not found yet)');
    return;
  }
  run('node', [validator, '--story', story]);
}

function doAudio() {
  const narrArgs = ['--story', story, ...(providerFlag ? ['--provider', providerFlag] : [])];
  run('node', [build('narrate.mjs'), ...narrArgs]);
  const musicArgs = ['--story', story,
    ...(legacyFlag ? ['--legacy'] : []),
    ...(ragaFlag ? ['--raga', ragaFlag] : [])];
  run('node', [build('music.mjs'), ...musicArgs]);
  run('bash', [build('mix.sh'), story]);
}

function sceneTimes() {
  const TL = loadTimeline(story);
  const times = new Set();
  for (const sc of TL.scenes) {
    times.add(+sc.start.toFixed(2));
    times.add(+((sc.start + sc.end) / 2).toFixed(2));
  }
  return [...times].sort((a, b) => a - b);
}

function doStills() {
  const outDir = `/tmp/film-${slug}`;
  if (!dry) mkdirSync(outDir, { recursive: true });
  let timesArg;
  try {
    timesArg = sceneTimes().join(',');
  } catch (e) {
    if (!dry) throw new Error(`could not read timeline.json to compute --times (${e.message}); run the 'audio' step first`);
    timesArg = '<scene starts + midpoints, from timeline.json>';
  }
  run('node', [build('shots.mjs'), '--story', story, '--out', outDir, '--times', timesArg]);
}

function doPlayer() { run('node', [build('build-player.mjs'), '--story', story]); }
function doRender() { run('node', [build('render.mjs'), '--story', story]); }

switch (sub) {
  case 'validate': step('validate', doValidate); break;
  case 'audio': step('audio', doAudio); break;
  case 'stills': step('stills', doStills); break;
  case 'player': step('player', doPlayer); break;
  case 'render': step('render', doRender); break;
  case 'all': {
    step('validate', doValidate);
    step('audio', doAudio);
    step('player', doPlayer);
    step('stills', doStills);
    console.log(`
── checklist ────────────────────────────────────────────────────
[x] validate  schema/reference check (if validate.mjs is installed)
[x] audio     narration -> music -> mix  (audio/mix.wav, audio/mix.mp3)
[x] player    dev.html, dist/index.html, dist/artifact.html
[x] stills    ${dry ? `/tmp/film-${slug} (dry run — not written)` : `/tmp/film-${slug}`}
[ ] render    NOT run here — it's slow (headless Chromium, frame-by-frame).
              run it on its own:
                node engine/build/film.mjs render --story ${slug}
──────────────────────────────────────────────────────`);
    break;
  }
}
