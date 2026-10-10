#!/usr/bin/env node
/**
 * check-pins.mjs — guards src/data/search-pins.json.
 *
 * The pins file is the one place in the app where a route is written by hand
 * rather than derived from the corpus graph, so a corpus rename would silently
 * turn a pinned "direct answer" into a 404. This asserts, over the whole file:
 *
 *   1. every route resolves in src/generated/graph.json (or is one of the
 *      handful of app-owned routes listed in APP_ROUTES);
 *   2. no query string is claimed by two entries (the first would always win,
 *      so the second is dead data);
 *   3. queries are already in the normalised form the client matches against
 *      (lowercase, NFC, single-spaced, no diacritics, no punctuation) — the
 *      client folds the *user's* query, not the pin table, so a pin written
 *      with a capital or a diacritic could never be hit;
 *   4. entries are non-empty and at most 3 routes deep (the UI shows at most
 *      three direct answers).
 *
 * Run by `npm test` via test/pins.test.mjs, and standalone:
 *     node scripts/check-pins.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, '..');

/** Routes the app owns that are not corpus pages, so are absent from the graph. */
const APP_ROUTES = new Set(['/', '/clock/', '/films/', '/search/', '/about/structure/']);

const MAX_ROUTES = 3;

export function checkPins() {
  const pinsPath = resolve(siteRoot, 'src/data/search-pins.json');
  const graphPath = resolve(siteRoot, 'src/generated/graph.json');
  const pins = JSON.parse(readFileSync(pinsPath, 'utf8'));
  const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
  const known = new Set(Object.keys(graph.byRoute ?? {}));
  const errors = [];

  if (!Array.isArray(pins.pins) || pins.pins.length === 0) {
    errors.push('search-pins.json has no "pins" array');
    return { errors, entries: 0, queries: 0, routes: 0 };
  }

  const seen = new Map(); // query -> index of the entry that claimed it
  let queries = 0;
  const routes = new Set();

  pins.pins.forEach((entry, i) => {
    const where = `pins[${i}]`;
    if (!Array.isArray(entry.q) || entry.q.length === 0) {
      errors.push(`${where}: "q" must be a non-empty array`);
      return;
    }
    if (!Array.isArray(entry.routes) || entry.routes.length === 0) {
      errors.push(`${where} (${entry.q[0]}): "routes" must be a non-empty array`);
      return;
    }
    if (entry.routes.length > MAX_ROUTES) {
      errors.push(`${where} (${entry.q[0]}): ${entry.routes.length} routes, max ${MAX_ROUTES}`);
    }
    for (const q of entry.q) {
      queries += 1;
      if (typeof q !== 'string' || !q.trim()) {
        errors.push(`${where}: empty query string`);
        continue;
      }
      const normal = q.normalize('NFC');
      if (q !== normal || q !== q.toLowerCase() || q !== q.trim() || /\s{2,}/.test(q)) {
        errors.push(`${where}: query ${JSON.stringify(q)} is not normalised (lowercase, NFC, single-spaced, trimmed)`);
      }
      if (/[^a-z0-9' ]/.test(q)) {
        errors.push(`${where}: query ${JSON.stringify(q)} has characters the client's fold would strip`);
      }
      if (seen.has(q)) {
        errors.push(`duplicate query ${JSON.stringify(q)}: ${where} and pins[${seen.get(q)}]`);
      } else {
        seen.set(q, i);
      }
    }
    for (const r of entry.routes) {
      routes.add(r);
      if (!r.startsWith('/') || !r.endsWith('/')) {
        errors.push(`${where} (${entry.q[0]}): route ${JSON.stringify(r)} must start and end with "/"`);
        continue;
      }
      if (!known.has(r) && !APP_ROUTES.has(r)) {
        errors.push(`${where} (${entry.q[0]}): route ${r} is not in graph.json`);
      }
    }
  });

  return { errors, entries: pins.pins.length, queries, routes: routes.size };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, entries, queries, routes } = checkPins();
  if (errors.length) {
    console.error(`check-pins: ${errors.length} problem(s)`);
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  console.log(`check-pins: ${entries} entries, ${queries} queries, ${routes} distinct routes — all resolve`);
}
