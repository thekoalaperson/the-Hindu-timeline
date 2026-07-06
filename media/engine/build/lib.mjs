// shared helpers for the build tools: story resolution, paths, exec
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const engineDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const mediaDir = resolve(engineDir, '..');

export function storyDir(argv) {
  const i = argv.indexOf('--story');
  const named = i >= 0 ? argv[i + 1] : (process.env.STORY || null);
  if (!named) {
    console.error('usage: --story <slug|path>  (or STORY env var)');
    process.exit(2);
  }
  const p = existsSync(named) ? resolve(named) : join(mediaDir, 'stories', named);
  if (!existsSync(join(p, 'story.json'))) {
    console.error(`no story.json in ${p}`);
    process.exit(2);
  }
  return p;
}
export const loadStory = dir => JSON.parse(readFileSync(join(dir, 'story.json'), 'utf8'));
export const loadTimeline = dir => JSON.parse(readFileSync(join(dir, 'timeline.json'), 'utf8'));
export function arg(argv, name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
}
export const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
