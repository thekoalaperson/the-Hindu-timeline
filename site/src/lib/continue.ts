/**
 * continue.ts — "pick up where you left off".
 *
 * One localStorage key, `ht:last`, holding the last *story* a reader opened
 * (route + title + timestamp). Browser-only, and every access is wrapped:
 * private mode, blocked storage and corrupted JSON all degrade to "no last
 * place", never to an exception. Nothing here runs at build time.
 *
 * Two halves:
 *   · `remember()` — called on every story/film page as it loads.
 *   · `readLast()` / `fillContinue()` — called by whatever wants to offer the
 *     way back (the Stories hub, and the home page, which lane L1 owns; it can
 *     import `ContinueCard.astro`, which is this module's ready-made mount).
 */

export const LAST_KEY = 'ht:last';

export interface LastPlace {
  route: string;
  title: string;
  /** Epoch ms. Used only to decide "yesterday" vs "just now" wording. */
  at: number;
  /** Optional: the age it sits in, so the card can say where you were. */
  where?: string;
}

/** The reader's last story, or null. Never throws. */
export function readLast(): LastPlace | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return null;
    const o = v as Record<string, unknown>;
    if (typeof o.route !== 'string' || !o.route.startsWith('/')) return null;
    if (typeof o.title !== 'string' || !o.title) return null;
    return {
      route: o.route,
      title: o.title,
      at: typeof o.at === 'number' ? o.at : 0,
      where: typeof o.where === 'string' ? o.where : undefined,
    };
  } catch {
    return null;
  }
}

/** Record a place. Silent on any storage failure. */
export function writeLast(place: { route: string; title: string; where?: string }): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!place?.route || !place?.title) return;
    localStorage.setItem(
      LAST_KEY,
      JSON.stringify({ route: place.route, title: place.title, where: place.where, at: Date.now() }),
    );
  } catch {
    /* Storage blocked — the visit simply is not remembered. */
  }
}

/** Forget it (the card's own "no thanks"). */
export function forgetLast(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(LAST_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * How long you have been travelling
 * ------------------------------------------------------------------ */

/** localStorage key: the distinct ISO dates on which this browser visited. */
export const DAYS_KEY = 'ht:days';

/** Keep the list bounded; a year of travel is more than enough to count. */
const MAX_DAYS = 400;

function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function readDays(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(DAYS_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x));
  } catch {
    return [];
  }
}

/**
 * Record today and return how many **distinct days** this browser has opened
 * the site (R6 Part C #5 — "a login-free return signal, Duolingo without the
 * guilt"). A set of ISO dates, not a streak: a streak punishes a missed day,
 * and this is a journey, not a habit tracker. localStorage only — nothing
 * leaves the device, and a browser that blocks storage simply counts 1.
 */
export function markVisit(): number {
  const day = today();
  const days = readDays();
  if (!days.includes(day)) {
    days.push(day);
    days.sort();
    if (days.length > MAX_DAYS) days.splice(0, days.length - MAX_DAYS);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(DAYS_KEY, JSON.stringify(days));
    } catch {
      /* Storage blocked — this visit is simply not counted. */
    }
  }
  return days.length;
}

/** "Day 4 of your journey" — or '' on the very first day, which needs no badge. */
export function dayLabel(n: number): string {
  return n > 1 ? `Day ${n.toLocaleString('en')} of your journey` : '';
}

/** "just now" / "earlier today" / "yesterday" / "a while back". */
export function whenLabel(at: number): string {
  if (!at) return '';
  const mins = (Date.now() - at) / 60000;
  if (mins < 0) return '';
  if (mins < 10) return 'just now';
  if (mins < 60 * 12) return 'earlier today';
  if (mins < 60 * 48) return 'yesterday';
  return 'a while back';
}

/**
 * Fill and reveal a `[data-continue]` mount (see `ContinueCard.astro`).
 * A no-op — leaving the card hidden — when there is nothing to continue,
 * or when the reader is already on that page.
 */
export function fillContinue(root: ParentNode = document): void {
  try {
    const el = root.querySelector<HTMLElement>('[data-continue]');
    if (!el) return;
    const last = readLast();
    if (!last) return;
    const here = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
    if (last.route === here) return;
    const link = el.querySelector<HTMLAnchorElement>('[data-continue-link]');
    const title = el.querySelector<HTMLElement>('[data-continue-title]');
    const meta = el.querySelector<HTMLElement>('[data-continue-when]');
    if (!link || !title) return;
    link.href = last.route;
    title.textContent = last.title;
    if (meta) {
      const when = whenLabel(last.at);
      meta.textContent = [last.where, when].filter(Boolean).join(' · ');
    }
    /* "Day N of your journey" — the quiet return signal, and the only place it
       appears. Counted here rather than on every page load so it says how many
       days you have *read* on, not how many you have loaded a script on. */
    const dayEl = el.querySelector<HTMLElement>('[data-continue-day]');
    if (dayEl) {
      const label = dayLabel(markVisit());
      dayEl.textContent = label;
      dayEl.hidden = !label;
    }
    el.hidden = false;
    const dismiss = el.querySelector<HTMLButtonElement>('[data-continue-dismiss]');
    if (dismiss) {
      dismiss.addEventListener('click', () => {
        forgetLast();
        el.hidden = true;
      });
    }
  } catch {
    /* A return hook must never break the page it decorates. */
  }
}

/** Called by every story page: "I was here." */
export function remember(place: { route: string; title: string; where?: string }): void {
  writeLast(place);
}
