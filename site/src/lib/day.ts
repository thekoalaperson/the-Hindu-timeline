/**
 * day.ts — the date arithmetic behind "Today's story", and nothing else.
 *
 * Deliberately dependency-free. It is split out of `today.ts` because the
 * *client* half of `TodayCard.astro` needs only these two functions, and
 * importing them from `today.ts` dragged `films.ts` — and with it the whole
 * 1.4 MB `featured.json` — into the browser bundle. Keep it importing nothing.
 */

/** Days since 1970-01-01 in the *local* calendar of the given date. */
export function dayNumber(d: Date = new Date()): number {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(local.getTime() / 86400000 - local.getTimezoneOffset() / 1440);
}

/**
 * Which item of `n` today points at. A stride co-prime with most pool sizes
 * keeps consecutive days far apart in the list, so a week of visits does not
 * walk the same corner of the corpus.
 */
export function pickIndex(day: number, n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  const stride = 7;
  return (((day * stride) % n) + n) % n;
}
