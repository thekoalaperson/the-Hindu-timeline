#!/usr/bin/env node
/**
 * events.mjs — turns data/events.jsonl into the per-period payloads the
 * /clock/<period>/ pages render.
 *
 * Writes:
 *   src/generated/events/<period-slug>.json  story groups + their events
 *   src/generated/periods.json               the 9 periods with counts & intros
 *
 * Grouping: events are grouped by `detail_file` (one group = one story), and
 * the groups keep the order in which they first appear in the period's timeline
 * file — that file *is* the corpus's approximate chronology for the period.
 * events.jsonl is written in timeline-file order (repo_tools.build_data), so
 * reading it top-to-bottom preserves that.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERIODS, PERIOD_BY_NAME, canonicalPath, pathToRoute } from '../src/lib/routes.ts';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const ROOT = path.resolve(SITE, '..');
const OUT = path.join(SITE, 'src', 'generated');
const EVENTS_DIR = path.join(OUT, 'events');

const graph = JSON.parse(fs.readFileSync(path.join(OUT, 'graph.json'), 'utf8'));

const raw = fs
  .readFileSync(path.join(ROOT, 'data', 'events.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

/** Header prose of a period file: its H1, its lede blockquote and its one-line summary. */
function periodHeader(file) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return { title: '', intro: '', stated: 0 };
  const head = fs.readFileSync(abs, 'utf8').split('\n').slice(0, 20);
  let title = '';
  let intro = '';
  let stated = 0;
  for (const line of head) {
    const t = line.trim();
    if (!title && t.startsWith('# ')) title = t.slice(2).replace(/^TIMELINE\s*·\s*/, '').trim();
    const c = /\*\*(\d+) events\.\*\*/.exec(t);
    if (c) stated = Number(c[1]);
    if (!intro && /^\*[^*].*\*$/.test(t)) intro = t.slice(1, -1).trim();
  }
  return { title, intro, stated };
}

fs.mkdirSync(EVENTS_DIR, { recursive: true });

const periods = [];
for (const period of PERIODS) {
  const mine = raw.filter((e) => PERIOD_BY_NAME[e.period] === period.slug);
  const groups = [];
  const byFile = new Map();
  for (const ev of mine) {
    const target = ev.detail_file ? canonicalPath(ev.detail_file) : null;
    const key = target ?? '(unlinked)';
    let group = byFile.get(key);
    if (!group) {
      const node = target ? graph.nodes[target] : null;
      group = {
        path: target,
        route: node?.route ?? (target ? pathToRoute(target) : null),
        title: node?.title ?? (target ? path.basename(target, '.md') : 'Unlinked events'),
        section: node?.sectionLabel ?? null,
        count: 0,
        events: [],
      };
      byFile.set(key, group);
      groups.push(group);
    }
    group.count += 1;
    group.events.push({
      title: ev.title,
      description: ev.description ?? '',
      actors: ev.actors ?? [],
      source: ev.source ?? null,
    });
  }

  const header = periodHeader(period.file);
  const payload = {
    slug: period.slug,
    name: period.name,
    short: period.short,
    title: header.title || period.name,
    intro: header.intro,
    route: `/clock/${period.slug}/`,
    sourceFile: period.file,
    count: mine.length,
    groupCount: groups.length,
    groups,
  };
  fs.writeFileSync(path.join(EVENTS_DIR, `${period.slug}.json`), JSON.stringify(payload));
  periods.push({
    slug: period.slug,
    name: period.name,
    short: period.short,
    title: payload.title,
    intro: payload.intro,
    route: payload.route,
    count: mine.length,
    groupCount: groups.length,
    stated: header.stated,
  });
}

fs.writeFileSync(path.join(OUT, 'periods.json'), `${JSON.stringify(periods, null, 1)}\n`);

const total = periods.reduce((a, p) => a + p.count, 0);
console.log(
  `events: ${total} across ${periods.length} periods · ` +
    periods.map((p) => `${p.slug}:${p.count}/${p.groupCount}g`).join(' '),
);
