#!/usr/bin/env node
// Static storyboard validation — no browser, no canvas.
//   node validate.mjs --story <slug>
// Loads <story>/story.json (+ script.json, if present) and runs stage.js's
// validateStory() against the merged scene list. Prints warnings/errors and
// exits 1 if there were any errors (warnings alone exit 0).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { storyDir, loadStory, loadTimeline, engineDir } from './lib.mjs';

const dir = storyDir(process.argv);
const story = loadStory(dir); // story.json

let script = null;
const scriptPath = join(dir, 'script.json');
if (existsSync(scriptPath)) script = JSON.parse(readFileSync(scriptPath, 'utf8'));

// timeline.json (present once narrate.mjs has run) gives the composition
// linter real scene durations + narration windows; without it stage.js
// assumes a nominal per-scene clock (dur 10s, narration 1..9s).
let timeline = null;
if (existsSync(join(dir, 'timeline.json'))) timeline = loadTimeline(dir);

// Normalize into the {scenes:[{id, storyboard?}, ...]} shape validateStory
// expects. A future data-driven story carries its own `scenes[]` (array or
// id-keyed map) with storyboard objects right on story.json; today's
// all-JS-fn stories (e.g. winning-of-draupadi) have no such field at all, so
// fall back to script.json's scene list (id/name only -> assumed js-fn).
function mergedScenes() {
  if (Array.isArray(story.scenes) && story.scenes.length) return story.scenes;
  if (story.scenes && typeof story.scenes === 'object' && Object.keys(story.scenes).length) return story.scenes;
  if (script && Array.isArray(script.scenes)) {
    return script.scenes.map(s => ({ id: s.id, name: s.name }));
  }
  return [];
}

const storyJson = Object.assign({}, story, { scenes: mergedScenes() });
const sceneCount = Array.isArray(storyJson.scenes) ? storyJson.scenes.length : Object.keys(storyJson.scenes).length;

const require = createRequire(import.meta.url);
const { validateStory } = require(join(engineDir, 'src', 'stage.js'));

const { errors, warnings } = validateStory(storyJson, { timeline });

console.log(`validating "${story.slug || dir}" (${sceneCount} scene${sceneCount === 1 ? '' : 's'}${timeline ? ', timeline.json clock' : ', nominal clock'})`);
for (const w of warnings) console.warn('WARN:  ' + w);
for (const e of errors) console.error('ERROR: ' + e);
console.log(`${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length) process.exit(1);
