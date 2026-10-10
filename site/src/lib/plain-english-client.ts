/**
 * plain-english-client.ts — browser-only DOM wiring for "plain English
 * reading mode". Pairs with the pure converter in plain-english.ts; this
 * file owns no conversion logic of its own, only: finding the right text
 * nodes, remembering their original IAST text, and persisting the reader's
 * choice. No framework dependency — plain DOM APIs only, safe to load as a
 * bare `<script type="module">` on any page (Astro island, plain script
 * tag, whatever a later lane picks).
 *
 * ---------------------------------------------------------------------
 * INTEGRATION NOTES FOR THE LANE THAT BUILDS THE VISIBLE TOGGLE
 * ---------------------------------------------------------------------
 *
 * 1. Avoiding a flash of IAST-diacritic text on load:
 *
 *      Call `initPlainEnglish()` as early as possible — ideally an inline
 *      `<script type="module">` in <head>, before the page's own content
 *      streams in. It only reads localStorage and toggles the `data-plain`
 *      attribute on `<html>`; it deliberately does NOT touch `document.body`
 *      (which may not exist yet at that point in <head> parsing). Combined
 *      with the CSS below, that's enough to keep `.cit`/`.tag` out of the
 *      first paint without any FOUC.
 *
 *      Then, once the DOM is actually ready (e.g. on `DOMContentLoaded`, or
 *      an Astro `astro:page-load` handler for view-transitions pages), call
 *
 *          applyPlainEnglish(document.body, initPlainEnglish())
 *
 *      to do the real text-node rewrite. Calling `initPlainEnglish()` again
 *      here is intentional and cheap — it just re-reads the same stored
 *      choice and re-applies the same attribute.
 *
 * 2. Wiring an actual toggle control (e.g. a header button/switch):
 *
 *          let plainOn = initPlainEnglish();
 *          toggleButton.setAttribute('aria-pressed', String(plainOn));
 *          toggleButton.addEventListener('click', () => {
 *            plainOn = !plainOn;
 *            applyPlainEnglish(document.body, plainOn);
 *            toggleButton.setAttribute('aria-pressed', String(plainOn));
 *          });
 *
 *    `applyPlainEnglish` already persists the new choice to localStorage and
 *    flips the `data-plain` attribute, so the click handler doesn't need to
 *    do either itself.
 *
 * 3. Dynamically-inserted content (search results, view-transition swaps,
 *    infinite-scroll, etc.): this module has no MutationObserver of its own
 *    (kept dependency-free and predictable on purpose). Whenever a later
 *    lane injects new DOM under a container, it should call
 *    `applyPlainEnglish(newContainer, plainOn)` on that container once,
 *    right after inserting it — the WeakMap-based bookkeeping means calling
 *    it on overlapping roots repeatedly is always safe (idempotent).
 *
 * 4. CSS for the scholarly apparatus (put this in the site's global
 *    stylesheet, gated on the `data-plain` attribute this module owns):
 *
 *        html[data-plain] .cit,
 *        html[data-plain] .tag {
 *          display: none;
 *        }
 *
 *      `.tellings` (the `<details class="tellings">` "Other tellings (n)"
 *      disclosure) renders closed by default already (no `open` attribute
 *      in the corpus's rehype output), so in the common case there is
 *      nothing left to "collapse" — CSS alone can't force a `<details>`
 *      closed if a reader had already expanded it before switching into
 *      Plain English mode (there's no CSS property for that). If the later
 *      lane wants entering plain mode to also snap open ones shut, add a
 *      couple of lines next to its `applyPlainEnglish(...)` call:
 *
 *          if (plainOn) {
 *            document.querySelectorAll('details.tellings[open]')
 *              .forEach((d) => { (d as HTMLDetailsElement).open = false; });
 *          }
 *
 *      That one-liner is deliberately left to whoever builds the toggle,
 *      rather than baked into applyPlainEnglish() here, since collapsing a
 *      widget the reader may have deliberately opened is a UX call outside
 *      this module's job of converting text and remembering the choice.
 */

import { plainSpelling } from './plain-english';

/** localStorage key the reader's plain-English choice is persisted under. */
const STORAGE_KEY = 'ht:plain';

/**
 * Elements whose text must never be rewritten: code/URLs (`code`, `pre`),
 * script/style payloads, Devanagari spans (`[lang="hi"]`, `.dv` — hooks for
 * markup a later lane may add; harmless no-ops today if nothing uses them
 * yet), the citation apparatus (`.cit`), reliability tags (`.tag`), and an
 * explicit escape hatch (`[data-plain-skip]`) for any future one-off case.
 */
const SKIP_SELECTOR =
  'code, pre, script, style, [lang="hi"], .dv, .cit, .tag, [data-plain-skip], [data-iast]';

/**
 * Corpus prose is converted at *build* time now (`rehype-corpus` (l)): every
 * run whose popular spelling differs ships as
 * `<span data-iast="Kṛṣṇa">Krishna</span>` — plain in the content, scholarly
 * in the attribute — so a reader with no JavaScript gets the default the site
 * actually chose. Those spans are excluded from the text walk above and
 * handled here instead, and the traffic runs the other way: entering the
 * *scholarly* text swaps the attribute in, leaving it swaps the plain
 * spelling back. The plain text is parked on `data-plain-text` at the moment
 * of the first swap — a live-DOM attribute, so it costs the served page
 * nothing.
 */
const IAST_PLAIN_ATTR = 'data-plain-text';

function iastSpans(root: Node): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (root instanceof Element) {
    if (root.hasAttribute('data-iast')) out.push(root as HTMLElement);
    root.querySelectorAll<HTMLElement>('[data-iast]').forEach((el) => out.push(el));
  } else if (root instanceof Document || root instanceof DocumentFragment) {
    root.querySelectorAll<HTMLElement>('[data-iast]').forEach((el) => out.push(el));
  }
  return out;
}

function applyIastSpans(root: Node, on: boolean): void {
  for (const el of iastSpans(root)) {
    if (on) {
      const plain = el.getAttribute(IAST_PLAIN_ATTR);
      if (plain !== null && el.textContent !== plain) el.textContent = plain;
    } else {
      const iast = el.getAttribute('data-iast') ?? '';
      if (!iast) continue;
      if (!el.hasAttribute(IAST_PLAIN_ATTR)) el.setAttribute(IAST_PLAIN_ATTR, el.textContent ?? '');
      if (el.textContent !== iast) el.textContent = iast;
    }
  }
}

/** Text node -> its original (IAST) content, so disabling can restore it exactly. */
const originals = new WeakMap<Text, string>();

function isInsideSkippedElement(node: Node): boolean {
  let el = node.parentElement;
  while (el) {
    if (el.matches(SKIP_SELECTOR)) return true;
    el = el.parentElement;
  }
  return false;
}

/** Visit every text node under `root` that isn't inside a skipped element. */
function walkTextNodes(root: Node, visit: (node: Text) => void): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return isInsideSkippedElement(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  let current: Node | null;
  // eslint-disable-next-line no-cond-assign
  while ((current = walker.nextNode())) {
    visit(current as Text);
  }
}

/**
 * D-plain-default (BRIEF v4 §4 W3e, 2026-09-06, reversible): plain English is
 * **on** for anyone who has not said otherwise. Only an explicit stored "0"
 * — the reader having turned it off — selects the scholarly text. The same
 * rule is duplicated, deliberately, in the pre-paint inline script in
 * `Base.astro`; the two must agree or the mode flashes on load.
 */
function readStoredChoice(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    // Storage blocked (private browsing, disabled cookies, sandboxed iframe, ...).
    return true;
  }
}

function persistChoice(on: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    // Storage blocked: the toggle still works for this page load, it just won't stick.
  }
}

/**
 * Enable or disable plain-English reading mode under `root`.
 *
 * - `on: true` — for every eligible text node not already converted, store
 *   its original text in a WeakMap and replace its content with
 *   `plainSpelling(text)`. A node whose original is already stored (e.g.
 *   a second call on an overlapping root) is left alone — idempotent.
 * - `on: false` — for every eligible text node with a stored original,
 *   restore it verbatim and forget it.
 *
 * Either way: toggles the `data-plain` attribute on `<html>` and persists
 * the choice to `localStorage["ht:plain"]` (best-effort; failures are
 * swallowed, see persistChoice()).
 */
export function applyPlainEnglish(root: Node, on: boolean): void {
  if (typeof document === 'undefined') return; // no-op outside a browser (e.g. accidental SSR/test import)

  /* Build-time spans first (corpus prose), then the walk for everything the
     markdown pipeline never saw: titles, breadcrumbs, cards, search results
     and the link peek, all of which come from JSON rather than markdown. */
  applyIastSpans(root, on);

  walkTextNodes(root, (node) => {
    if (on) {
      if (originals.has(node)) return; // already converted
      const converted = plainSpelling(node.data);
      if (converted !== node.data) {
        originals.set(node, node.data);
        node.data = converted;
      }
    } else {
      const original = originals.get(node);
      if (original !== undefined) {
        node.data = original;
        originals.delete(node);
      }
    }
  });

  document.documentElement.toggleAttribute('data-plain', on);
  persistChoice(on);
}

/**
 * Read the reader's previously-saved choice and stamp the `data-plain`
 * attribute onto `<html>` immediately — safe to call inline in `<head>`
 * before `document.body` exists, so the scholarly apparatus this attribute
 * gates (via CSS, see the module doc comment above) never flashes on
 * screen for a reader who chose plain English on a previous visit.
 *
 * This does NOT walk text nodes (there may be no body yet); call
 * `applyPlainEnglish(document.body, initPlainEnglish())` once the DOM is
 * ready to do the actual conversion.
 */
export function initPlainEnglish(): boolean {
  const on = readStoredChoice();
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.toggleAttribute('data-plain', on);
  }
  return on;
}
