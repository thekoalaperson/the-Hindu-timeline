/**
 * /link-previews.json — the hover/long-press preview cards' data source.
 *
 * `src/generated/link-previews.json` is 290 KB, far too large to inline into
 * every page or to bundle into the shell script. Serving it as one prerendered
 * static file means the browser fetches it at most once per visit (and then
 * from cache), only when a reader actually hovers a cross-reference.
 *
 * Added by lane I2. Reads generated data; writes nothing.
 */
import previews from '../generated/link-previews.json';

export const prerender = true;

export const GET = () =>
  new Response(JSON.stringify(previews), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
