/**
 * /citation-texts.json — the citation-abbreviation table (src/lib/citations.ts)
 * with every target checked against the built route set, so the peek card can
 * never offer a link to a page that does not exist.
 *
 * It is under 1 KB, fetched once, and only when a reader first taps a citation.
 * Kept out of the shell bundle for the same reason as the link previews: the
 * table is validated against `graph.json`, and graph.json must never reach the
 * client.
 */
import { CITATION_TEXTS } from '../lib/citations.ts';
import { nodes } from '../lib/graph.ts';

export const prerender = true;

const known = new Set(Object.values(nodes).map((n) => n.route));
const kept = CITATION_TEXTS.filter((t) => known.has(t.route));
const dropped = CITATION_TEXTS.filter((t) => !known.has(t.route));
if (dropped.length) {
  console.warn(
    `[citation-texts] dropped ${dropped.length} abbreviation row(s) with no page: ` +
      dropped.map((d) => d.route).join(', '),
  );
}

export const GET = () =>
  new Response(JSON.stringify(kept), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
