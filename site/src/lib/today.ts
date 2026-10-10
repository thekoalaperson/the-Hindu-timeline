/**
 * today.ts — "Today's story".
 *
 * One story a day, the same one for everybody, chosen by the date alone: no
 * randomness, no server, no storage. The pool is the *public* films that point
 * at a corpus page — the stories a first-time visitor can both watch and read.
 *
 * Both halves of the site use this one picker: the Stories hub (L2) and the
 * home intro (lane L1) import `todaysStory()`, so they can never disagree.
 *
 * Static site, so the build bakes in the pick for the build date; the tiny
 * script in `TodayCard.astro` re-picks on the client when the reader's own
 * date has moved on. `dayNumber` and `pickIndex` are pure and unit-tested.
 */
import { dayNumber, pickIndex } from './day.ts';
import { getFilms, type Film } from './films.ts';

/* The date arithmetic lives in `day.ts` so the browser can import it without
   pulling `featured.json` (1.4 MB) into the bundle. Re-exported here so a
   caller that already has `today.ts` need not know about the split. */
export { dayNumber, pickIndex };

export interface TodayStory {
  film: Film;
  /** The corpus page the film animates — where "read it" goes. */
  route: string | null;
}

/**
 * The pool, in a stable order (by slug, so adding a film never reshuffles the
 * whole calendar). Public films only, and only those with a corpus route.
 */
export function todayPool(): Film[] {
  return getFilms()
    .filter((f) => f.isPublic && f.corpus.length > 0)
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Today's story, or null when the pool is empty. Never throws. */
export function todaysStory(d: Date = new Date()): TodayStory | null {
  const pool = todayPool();
  if (pool.length === 0) return null;
  const film = pool[pickIndex(dayNumber(d), pool.length)];
  if (!film) return null;
  return { film, route: film.corpus[0]?.route ?? null };
}
