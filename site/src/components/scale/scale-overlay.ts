/**
 * scale-overlay.ts — "How big is this?", as a full-screen overlay on the road.
 *
 * Six bars, each holding the one above it as a sliver you zoom out from, with
 * *you are here* marked on every one. Plain DOM and CSS — no three.js, no
 * canvas, no library — because the whole point is that it is loaded on demand
 * and the road's own bundle never carries it (`road.ts` does a dynamic
 * `import()`; this module and its stylesheet are their own chunk).
 *
 * The static form of exactly the same content is `/clock/#scale`, built from
 * the same `scale-data.ts`, so a browser with no JavaScript sees the same six
 * numbers with the same citations.
 *
 * Reduced motion: every bar is drawn at once, nothing transitions, and the
 * "zoom out" is simply the reading order.
 */
import '../../styles/scale.css';
import {
  ANALOGY_FOOT,
  ANALOGY_HISTORY,
  analogyFor,
  CODA,
  LEVELS,
  type ScaleLevel,
  sliverLabel,
  sliverPct,
} from './scale-data.ts';

export interface ScaleOpts {
  reduced: boolean;
  /** The age the traveller is standing in, so the overlay is lit like the road. */
  accent: string;
  onClose?: () => void;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  );

/**
 * A bar's inner sliver, as a width. Below 0.35% nothing legible can be drawn,
 * so the sliver becomes a hairline and the caption carries the truth.
 */
function sliverWidth(inner: number, outer: number): string {
  const p = sliverPct(inner, outer);
  return p < 0.35 ? '1.5px' : `${p.toFixed(3)}%`;
}

function levelHTML(l: ScaleLevel, i: number, prev: ScaleLevel | null): string {
  const inner = prev
    ? `<span class="sc-sliver" style="left:${(l.at * 100).toFixed(3)}%;width:${sliverWidth(prev.years, l.years)}"><i></i></span>`
    : '';
  const innerNote = prev
    ? `<p class="sc-inner-note"><b>${esc(prev.name)}</b> — ${esc(sliverLabel(prev.years, l.years))}</p>`
    : '<p class="sc-inner-note">The whole bar. Everything below zooms out from it.</p>';
  return `<li class="sc-level" data-i="${i}" id="scale-${esc(l.id)}">
    <div class="sc-head">
      <h3>${esc(l.name)}${l.hi ? ` <span class="dv" lang="hi">${esc(l.hi)}</span>` : ''}</h3>
      <p class="sc-years">${esc(l.yearsLabel)}</p>
    </div>
    <div class="sc-bar">
      ${inner}
      <span class="sc-here" style="left:${(l.at * 100).toFixed(3)}%"><i></i><em>you are here</em></span>
    </div>
    ${innerNote}
    <p class="sc-line">${esc(l.line)}</p>
    <p class="sc-analogy">${esc(analogyFor(l))}</p>
    <p class="sc-cite"><span>${esc(l.here)}</span><a href="${esc(l.cite.route)}">${esc(l.cite.file)}</a></p>
  </li>`;
}

let open: HTMLElement | null = null;
let lastFocus: HTMLElement | null = null;

export function openScale(host: HTMLElement, opts: ScaleOpts): void {
  if (open) return;
  lastFocus = (document.activeElement as HTMLElement) ?? null;
  host.hidden = false;
  host.innerHTML = `
    <div class="sc-scrim" data-sc-close="1"></div>
    <section class="sc-sheet" role="dialog" aria-modal="true" aria-labelledby="sc-h" tabindex="-1">
      <div class="sc-bar-top">
        <div>
          <h2 id="sc-h">How big is this?</h2>
          <p>Six nested spans. Each bar holds the one before it as a sliver.</p>
        </div>
        <button type="button" class="sc-close" data-sc-close="1" aria-label="Back to the road">✕</button>
      </div>
      <ol class="sc-levels">
        ${LEVELS.map((l, i) => levelHTML(l, i, i > 0 ? LEVELS[i - 1]! : null)).join('')}
      </ol>
      <p class="sc-analogy sc-analogy-now">${esc(ANALOGY_HISTORY)}</p>
      <p class="sc-foot-sum">${esc(ANALOGY_FOOT)}</p>
      <p class="sc-coda">${esc(CODA.line)}
        <a href="${esc(CODA.cite.route)}">${esc(CODA.cite.file)}</a></p>
      <p class="sc-foot"><a href="/clock/#scale">The same thing as a page you can link to →</a></p>
    </section>`;
  host.style.setProperty('--sc-accent', opts.accent);
  host.dataset.reduced = opts.reduced ? '1' : '0';

  const sheet = host.querySelector<HTMLElement>('.sc-sheet')!;

  const close = () => {
    if (!open) return;
    open = null;
    host.classList.remove('is-open');
    document.removeEventListener('keydown', onKey, true);
    const put = () => {
      host.hidden = true;
      host.innerHTML = '';
    };
    if (opts.reduced) put();
    else window.setTimeout(put, 220);
    lastFocus?.focus?.({ preventScroll: true });
    opts.onClose?.();
  };

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    // A modal has to keep the focus it took.
    const items = Array.from(
      sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    ).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  host.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-sc-close]')) close();
  });
  document.addEventListener('keydown', onKey, true);

  open = host;
  requestAnimationFrame(() => {
    host.classList.add('is-open');
    sheet.focus({ preventScroll: true });
    if (opts.reduced) return;
    // The zoom out: each bar arrives a beat after the one it sits inside.
    const rows = Array.from(host.querySelectorAll<HTMLElement>('.sc-level'));
    rows.forEach((row, i) => {
      window.setTimeout(() => row.classList.add('is-in'), 90 + i * 110);
    });
  });
}
