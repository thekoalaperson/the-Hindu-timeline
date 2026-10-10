/**
 * CosmicClock.tsx — the one bold element.
 *
 * A concentric instrument, not a chart. Three rings of nested cyclic time, each
 * rotated so that its "now" sits under a single hairline index at twelve o'clock:
 * the current manvantara, the current mahāyuga and the sliver of Kali all line up
 * on one vermilion needle. Zooming is a pure uniform scale of the dial; choosing a
 * different wedge is a pure rotation of its ring. Nothing else moves.
 *
 * React 18/19, TypeScript, SVG. No dependencies.
 * All numbers come from ./clock-model.ts, which cites the corpus file for each.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  COLOUR_NOTE,
  CURRENT,
  LEVELS,
  MAHAYUGA_YEARS,
  OFF_DIAL_PERIODS,
  SANDHYA_NOTE,
  TOTAL_EVENTS,
  YUGA_LABEL,
  YUGA_ORDER,
  YUGA_YEARS,
  describeAddress,
  describeAddressParts,
  describeCentre,
  fractionElapsed,
  isNowPath,
  NOW_STATE,
  parentLevel,
  parseState,
  ringsFor,
  serializeState,
  zoomIn,
  zoomOut,
  goToLevel,
} from './clock-model';
import type { ClockState, Level, PeriodSlug, Ring, Wedge } from './clock-model';
import './clock.css';

/* ── geometry ───────────────────────────────────────────────────────────── */

const VB = 1000;
const C = VB / 2;

/** Ring bands by how many rings are on screen: fewer rings, thicker rings. */
const BANDS: Record<number, [number, number][]> = {
  1: [[340, 452]],
  2: [[384, 452], [316, 368]],
  3: [[392, 452], [328, 376], [280, 312]],
};
const RING_GAP = 16;
const GAUGE_R = 470;
const NEEDLE_TIP = 487;

/* Astro renders this island on the server first; useLayoutEffect there is a no-op
   and React warns about it, so fall back to useEffect when there is no DOM. */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const rad = (frac: number) => (frac * 360 - 90) * (Math.PI / 180);
const px = (r: number, frac: number): [number, number] => {
  const a = rad(frac);
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const f2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Annular sector between two fractions of the turn. Handles the full-circle case. */
function sectorPath(rIn: number, rOut: number, from: number, to: number): string {
  const span = to - from;
  if (span >= 0.99999) {
    // two circles, even-odd: a complete ring
    return (
      `M ${C - rOut} ${C} a ${rOut} ${rOut} 0 1 0 ${rOut * 2} 0 a ${rOut} ${rOut} 0 1 0 ${-rOut * 2} 0 Z ` +
      `M ${C - rIn} ${C} a ${rIn} ${rIn} 0 1 0 ${rIn * 2} 0 a ${rIn} ${rIn} 0 1 0 ${-rIn * 2} 0 Z`
    );
  }
  const large = span > 0.5 ? 1 : 0;
  const [ox1, oy1] = px(rOut, from);
  const [ox2, oy2] = px(rOut, to);
  const [ix2, iy2] = px(rIn, to);
  const [ix1, iy1] = px(rIn, from);
  return (
    `M ${f2(ox1)} ${f2(oy1)} A ${rOut} ${rOut} 0 ${large} 1 ${f2(ox2)} ${f2(oy2)} ` +
    `L ${f2(ix2)} ${f2(iy2)} A ${rIn} ${rIn} 0 ${large} 0 ${f2(ix1)} ${f2(iy1)} Z`
  );
}

/** A stroked arc at radius r, from fraction to fraction (screen space). */
function arcPath(r: number, from: number, to: number): string {
  const span = to - from;
  if (span >= 0.99999) {
    return `M ${C - r} ${C} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  const large = span > 0.5 ? 1 : 0;
  const [x1, y1] = px(r, from);
  const [x2, y2] = px(r, to);
  return `M ${f2(x1)} ${f2(y1)} A ${r} ${r} 0 ${large} 1 ${f2(x2)} ${f2(y2)}`;
}

/* ── tokens ─────────────────────────────────────────────────────────────── */

/* The model names site tokens; clock.css re-declares each as a `--cc-*` alias with a
   fallback, so the clock renders correctly on a page that has not loaded tokens.css. */
const HUE_ALIAS: Record<string, string> = {
  '--yuga-satya': '--cc-satya',
  '--yuga-treta': '--cc-treta',
  '--yuga-dvapara': '--cc-dvapara',
  '--yuga-kali': '--cc-kali',
  '--period-before': '--cc-before',
  '--period-earlier': '--cc-earlier',
  '--period-future': '--cc-future',
  '--period-cross': '--cc-cross',
};
const ON_ALIAS: Record<string, string> = {
  '--yuga-satya': '--cc-satya-on',
  '--yuga-treta': '--cc-treta-on',
  '--yuga-dvapara': '--cc-dvapara-on',
  '--yuga-kali': '--cc-kali-on',
};
const hue = (v?: string) => (v ? `var(${HUE_ALIAS[v] ?? v})` : undefined);
const onHue = (v?: string) => (v ? `var(${ON_ALIAS[v] ?? v})` : undefined);

/**
 * Which of the nine corpus periods the current selection belongs to. Written to the
 * root as `data-period`, which is what the site's tokens.css keys `--period`,
 * `--period-ink`, `--period-fill` and `--period-border-style` off.
 */
function periodSlugFor(s: ClockState): PeriodSlug {
  if (s.manvantara && s.manvantara < CURRENT.manvantara) return 'earlier-manvantaras';
  if (s.manvantara && s.manvantara > CURRENT.manvantara) return 'future-manvantaras';
  if (s.period) return s.period;
  const y = s.yuga ?? CURRENT.yuga;
  return y === 'kali' ? 'kali-yuga-scriptural' : (`${y}-yuga` as PeriodSlug);
}

/** The accent hue itself, so the clock is self-sufficient without tokens.css.
 *  Satya's *accent* is the solid mark grade, never the near-white surface fill. */
const ACCENT_VAR: Record<string, string> = {
  'satya-yuga': 'var(--yuga-satya, #8b7f63)',
  'treta-yuga': 'var(--yuga-treta, #9c4a1c)',
  'dvapara-yuga': 'var(--yuga-dvapara, #3b4a7a)',
  'kali-yuga-scriptural': 'var(--yuga-kali, #8a6a2a)',
  'kali-yuga-history': 'var(--yuga-kali, #8a6a2a)',
  'earlier-manvantaras': 'var(--period-earlier, #8e897b)',
  'future-manvantaras': 'var(--period-future, #2e4066)',
  'before-time': 'var(--period-before, #7a7568)',
  'cross-yuga': 'var(--period-cross, #5b4f3f)',
};

/* ── labels ─────────────────────────────────────────────────────────────── */

interface Label {
  key: string;
  x: number;
  y: number;
  /** One or two lines; the second is the quiet count under a period name. */
  lines: string[];
  size: number;
  cls: string;
  fill?: string;
}

const CHAR_W = 0.53; // EB Garamond runs narrow; good enough for collision work

/**
 * Choose which labels survive at this rendered width. Priority: the current wedge,
 * then the selected one, then the rest in order. Dropped labels stay in the wedge's
 * accessible name, so nothing is lost to a screen reader.
 */
function layOutLabels(
  ring: Ring,
  rMid: number,
  bandPx: number,
  widthPx: number,
  interactive: boolean,
): Label[] {
  const unitsToPx = widthPx / VB;
  // 12.5px is the floor: the dial's numerals are the last thing that may shrink,
  // and below that EB Garamond's lining figures stop being readable on a phone.
  const base = widthPx < 380 ? 12.5 : widthPx < 560 ? 13 : widthPx < 900 ? 13.5 : 15.5;
  const ctxSize = widthPx < 380 ? 11 : widthPx < 900 ? 11.5 : 13;

  type Cand = Label & { frac: number; wPx: number; prio: number };

  const size0 = interactive ? base : ctxSize;
  const circPx = 2 * Math.PI * rMid * unitsToPx;
  const hasLong = ring.wedges.some((w) => w.longLabel);
  /* Names need real headroom in the band, not just arc length. */
  const longFits = hasLong && bandPx >= size0 * 1.9;

  const propose = (useLong: boolean): Cand[] => {
    const out: Cand[] = [];
    for (const w of ring.wedges) {
      const isMarked = w.tone === 'current' || w.selected;
      if (!interactive && !isMarked) continue;
      const size = interactive ? (isMarked ? base + 0.5 : base) : ctxSize;
      // vertical room: cap-height plus a hair, not a whole em box
      if (bandPx < size * 1.25) continue;
      const text = (useLong && w.longLabel) || w.label;
      if (!text) continue;
      const lines = [text];
      // a second line only when the band is deep enough for two
      if (w.subLabel && bandPx >= size * 2.8) lines.push(w.subLabel);
      const wPx = Math.max(...lines.map((l) => l.length * CHAR_W * size));
      const arcPx = (w.to - w.from) * circPx;
      // a numeral may straddle its own tick, but a name may not run over its neighbour
      if (wPx > Math.max(arcPx * (useLong ? 1.25 : 1.7), 26)) continue;
      const frac = (w.from + w.to) / 2;
      const [x, y] = px(rMid, frac);
      out.push({
        key: w.key,
        x,
        y,
        lines,
        size,
        frac,
        wPx,
        prio: w.tone === 'current' ? 2 : w.selected ? 1 : 0,
        cls: 'cc-wedge__label' + (w.tone === 'current' ? ' cc-wedge__label--current' : ''),
        fill: w.hueVar && w.onHueVar ? onHue(w.onHueVar) : undefined,
      });
    }
    return out;
  };

  const prune = (cs: Cand[]): Cand[] => {
    const kept: Cand[] = [];
    for (const c of [...cs].sort((a, b) => b.prio - a.prio || a.frac - b.frac)) {
      const clash = kept.some((k) => {
        let d = Math.abs(k.frac - c.frac);
        if (d > 0.5) d = 1 - d;
        return d * circPx < k.wPx / 2 + c.wPx / 2 + 7;
      });
      if (!clash) kept.push(c);
    }
    return kept;
  };

  /* Try names first; if too many would be dropped, the whole ring goes to numerals
     rather than showing a mix, which reads as a mistake. */
  let kept: Cand[] = [];
  if (longFits) {
    const withNames = prune(propose(true));
    const wanted = ring.wedges.filter((w) => interactive || w.tone === 'current' || w.selected).length;
    if (withNames.length >= wanted * 0.8) kept = withNames;
  }
  if (!kept.length) kept = prune(propose(false));
  return kept.sort((a, b) => a.frac - b.frac);
}

/* ── the component ──────────────────────────────────────────────────────── */

export interface CosmicClockProps {
  /** hero = the home page: the now state and one settling moment per session.
   *  instrument = /clock/: breadcrumb, address, legend, footnotes. */
  mode?: 'hero' | 'instrument';
  /** Initial state as a deep link, e.g. "k1.m7.y28.kali". */
  initial?: string;
  onChange?: (state: ClockState, at: string) => void;
  /** 'fill' (default) fills the container; a number pins the width in px. */
  size?: number | 'fill';
  /** Show the address line under the dial. Defaults to instrument mode. */
  showAddress?: boolean;
  /** Read and write `?at=` on the page URL. Defaults to instrument mode. */
  syncUrl?: boolean;
  /** Override the motion preference (the lab's toggle uses this). */
  reduceMotion?: boolean;
  /** Pin "today" — used by tests and screenshots so numbers do not drift. */
  year?: number;
  className?: string;
  id?: string;
}

export default function CosmicClock({
  mode = 'instrument',
  initial,
  onChange,
  size = 'fill',
  showAddress,
  syncUrl,
  reduceMotion,
  year,
  className,
  id,
}: CosmicClockProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const instrument = mode === 'instrument';
  const withAddress = showAddress ?? instrument;
  const withUrl = syncUrl ?? instrument;

  const [state, setState] = useState<ClockState>(() => parseState(initial));
  const [widthPx, setWidthPx] = useState<number>(typeof size === 'number' ? size : 360);
  const [intro, setIntro] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  /* measure — every px size in the SVG is derived from this */
  useIsoLayoutEffect(() => {
    if (typeof size === 'number') return;
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && Math.abs(w - widthPx) > 0.5) setWidthPx(w);
    });
    ro.observe(el);
    setWidthPx(el.getBoundingClientRect().width || 360);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  /* deep link in */
  useEffect(() => {
    if (!withUrl || typeof window === 'undefined') return;
    const at = new URLSearchParams(window.location.search).get('at');
    if (at) setState(parseState(at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* the one orchestrated moment, once per session (DESIGN-BRIEF §4) */
  useEffect(() => {
    if (mode !== 'hero' || typeof window === 'undefined') return;
    const reduced =
      reduceMotion ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) return;
    let played = false;
    try {
      played = window.sessionStorage.getItem('htl.clock.intro') === '1';
      window.sessionStorage.setItem('htl.clock.intro', '1');
    } catch {
      /* private mode: play it, once per mount */
    }
    if (played) return;
    setIntro(true);
    const t = window.setTimeout(() => setIntro(false), 950);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const at = useMemo(() => serializeState(state), [state]);

  /* deep link out + onChange */
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChange?.(state, at);
    if (withUrl && typeof window !== 'undefined') {
      const u = new URL(window.location.href);
      u.searchParams.set('at', at);
      window.history.replaceState(null, '', u);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  const rings = useMemo(() => ringsFor(state, year), [state, year]);
  const bands = BANDS[Math.min(rings.length, 3)] ?? BANDS[3];
  const coreR = bands[bands.length - 1][0] - RING_GAP;
  const outer = rings[0];

  /* ── zoom: one uniform scale, computed so the moved ring lands where it was ── */
  const prev = useRef<{ level: Level; bands: [number, number][] } | null>(null);
  const [tx, setTx] = useState<{ scale: number; animating: boolean }>({ scale: 1, animating: false });

  useIsoLayoutEffect(() => {
    const p = prev.current;
    prev.current = { level: state.level, bands };
    if (!p || p.level === state.level) return;
    const down = LEVELS.indexOf(state.level) > LEVELS.indexOf(p.level);
    const from = down
      ? (p.bands[1]?.[1] ?? p.bands[0][1]) / bands[0][1]
      : p.bands[0][1] / (bands[1]?.[1] ?? bands[0][1]);
    setTx({ scale: from, animating: false });
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setTx({ scale: 1, animating: true }));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.level]);

  /* ── roving focus over the outer ring ─────────────────────────────────── */
  const [focusIdx, setFocusIdx] = useState(0);
  const wedgeRefs = useRef<Array<SVGElement | null>>([]);

  useEffect(() => {
    const i = outer.wedges.findIndex((w) => w.selected || w.tone === 'current');
    setFocusIdx(i >= 0 ? i : 0);
    wedgeRefs.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.level, outer.division]);

  const moveFocus = useCallback(
    (delta: number) => {
      const n = outer.wedges.length;
      const next = ((focusIdx + delta) % n + n) % n;
      setFocusIdx(next);
      requestAnimationFrame(() => wedgeRefs.current[next]?.focus?.());
    },
    [focusIdx, outer.wedges.length],
  );

  const activate = useCallback((w: Wedge) => {
    if (w.href) return; // the anchor navigates on its own
    setState((s) => zoomIn(s, w));
  }, []);

  const onWedgeKey = useCallback(
    (e: ReactKeyboardEvent, w: Wedge) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          moveFocus(1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          moveFocus(-1);
          break;
        case 'Home':
          e.preventDefault();
          setFocusIdx(0);
          requestAnimationFrame(() => wedgeRefs.current[0]?.focus?.());
          break;
        case 'End': {
          e.preventDefault();
          const last = outer.wedges.length - 1;
          setFocusIdx(last);
          requestAnimationFrame(() => wedgeRefs.current[last]?.focus?.());
          break;
        }
        case 'Enter':
        case ' ':
        case 'Spacebar':
          if (w.href) {
            if (e.key !== 'Enter') {
              e.preventDefault();
              (e.currentTarget as unknown as HTMLElement).click?.();
            }
          } else {
            e.preventDefault();
            activate(w);
          }
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          setState(zoomOut);
          break;
      }
    },
    [moveFocus, activate, outer.wedges.length],
  );

  /* ── derived numbers ──────────────────────────────────────────────────── */

  const unitsToPx = widthPx / VB;
  const u = VB / Math.max(widthPx, 1); // user units per rendered px
  const onNow = isNowPath(state, state.level);
  const gaugeFrac = fractionElapsed(state.level, state, year);
  const centre = describeCentre(state, year);
  const parts = describeAddressParts(state, year);
  const address = describeAddress(state, year);
  const up = parentLevel(state.level);
  const gaugeLen = 2 * Math.PI * GAUGE_R;

  const periodSlug = periodSlugFor(state);
  const rootStyle: CSSProperties = {
    ['--period' as string]: ACCENT_VAR[periodSlug],
    ...(typeof size === 'number' ? { width: `${size}px` } : null),
  };

  return (
    <div
      id={id}
      className={
        'cclock' + (instrument ? ' cclock--instrument' : ' cclock--hero') + (className ? ' ' + className : '')
      }
      style={rootStyle}
      data-intro={intro ? 'true' : undefined}
      data-reduce-motion={reduceMotion ? 'true' : undefined}
      data-level={state.level}
      data-period={periodSlug}
      data-at={at}
    >
      {instrument && (
        <nav className="cclock__crumbs" aria-label="Where you are on the clock">
          {LEVELS.slice(0, LEVELS.indexOf(state.level) + 1).map((lv, i) => (
            <span key={lv}>
              {i > 0 && (
                <span className="cclock__sep" aria-hidden="true">
                  {' › '}
                </span>
              )}
              <button
                type="button"
                className="cclock__crumb"
                aria-current={lv === state.level ? 'true' : undefined}
                onClick={() => setState((s) => goToLevel(s, lv))}
              >
                {crumbLabel(lv, state)}
              </button>
            </span>
          ))}
        </nav>
      )}

      <div className="cclock__stage" ref={stageRef}>
        <svg
          className="cclock__svg"
          viewBox={`0 0 ${VB} ${VB}`}
          role="group"
          aria-label={`The cosmic clock. ${address}.`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* the elapsed roundel — how much of this cycle is written */}
          <g className="cc-gauge" aria-hidden="true">
            <circle className="cc-gauge__track" cx={C} cy={C} r={GAUGE_R} />
            {gaugeFrac > 0.0001 && (
              <path
                className="cc-gauge__ink"
                d={arcPath(GAUGE_R, -gaugeFrac, 0)}
                style={{ ['--cc-ink-len' as string]: `${gaugeLen}` }}
                strokeDasharray={intro ? gaugeLen : undefined}
              />
            )}
          </g>

          <g
            className={'cclock__dial' + (tx.animating ? ' is-animating' : '')}
            style={{ transform: `scale(${tx.scale})`, opacity: tx.animating || tx.scale === 1 ? 1 : 0.35 }}
          >
            {rings.map((ring, idx) => (
              <RingLayer
                key={ring.division}
                ring={ring}
                band={bands[idx]}
                interactive={idx === 0}
                widthPx={widthPx}
                unitsToPx={unitsToPx}
                u={u}
                uid={uid}
                focusIdx={focusIdx}
                onActivate={activate}
                onKey={onWedgeKey}
                onFocusWedge={setFocusIdx}
                registerRef={(i, el) => {
                  if (idx === 0) wedgeRefs.current[i] = el;
                }}
              />
            ))}

            {/* the core: what you are standing inside, and the way out */}
            <g
              className="cc-core"
              data-interactive={up ? 'true' : 'false'}
              role={up ? 'button' : undefined}
              tabIndex={up ? 0 : undefined}
              aria-label={up ? `${centre.line1}. Zoom out to ${levelName(up)}.` : centre.line1}
              onClick={up ? () => setState(zoomOut) : undefined}
              onKeyDown={
                up
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setState(zoomOut);
                      }
                    }
                  : undefined
              }
            >
              <circle className="cc-core__disc" cx={C} cy={C} r={coreR} />
              <circle className="cc-core__rule" cx={C} cy={C} r={coreR - 2.5 * u} />
              {(() => {
                /* The core's type is sized off the disc, not the viewport, so it
                   holds its proportion from a 320px phone to a 1200px desktop. */
                const discPx = ((2 * coreR) / VB) * widthPx;
                const s1 = fitFont(centre.line1, coreR, widthPx, clamp(discPx * 0.085, 15, 30));
                const s2 = fitFont(centre.line2, coreR, widthPx, clamp(discPx * 0.055, 11.5, 18));
                const s3 = fitFont(centre.line3, coreR, widthPx, clamp(discPx * 0.055, 11.5, 18));
                return (
                  <>
                    <text
                      className="cc-core__l1"
                      x={C}
                      y={C - s2 * 1.25 * u}
                      textAnchor="middle"
                      fontSize={f2(s1 * u)}
                    >
                      {centre.line1}
                    </text>
                    <text
                      className="cc-core__l2"
                      x={C}
                      y={C + s2 * 0.55 * u}
                      textAnchor="middle"
                      fontSize={f2(s2 * u)}
                    >
                      {centre.line2}
                    </text>
                    <text
                      className="cc-core__l3"
                      x={C}
                      y={C + s3 * 1.95 * u}
                      textAnchor="middle"
                      fontSize={f2(s3 * u)}
                    >
                      {centre.line3}
                    </text>
                    {up && widthPx >= 420 && (
                      <text
                        className="cc-core__hint"
                        x={C}
                        y={C + s3 * 4 * u}
                        textAnchor="middle"
                        fontSize={f2(clamp(discPx * 0.045, 10, 14) * u)}
                      >
                        {'‹ ' + levelName(up)}
                      </text>
                    )}
                  </>
                );
              })()}
            </g>
          </g>

          {/* The index: vermilion when it is really now, a muted mark when it is not.
              At the period level it stops at the rim — the corpus periods are not
              divisions of time, so the needle must not appear to point into them. */}
          <g className={'cc-needle' + (onNow ? '' : ' cc-needle--off')} aria-hidden="true">
            <line
              className="cc-needle__halo"
              x1={C}
              y1={C - (outer.division === 'periods' ? bands[0][1] + 6 : coreR + 8)}
              x2={C}
              y2={C - NEEDLE_TIP}
            />
            <line
              className="cc-needle__line"
              x1={C}
              y1={C - (outer.division === 'periods' ? bands[0][1] + 6 : coreR + 8)}
              x2={C}
              y2={C - NEEDLE_TIP}
            />
            <circle className="cc-needle__tip" cx={C} cy={C - NEEDLE_TIP} r={3.4 * u} />
          </g>
        </svg>
      </div>

      <p className="cclock__sr" aria-live="polite">
        {address}
      </p>

      {withAddress && (
        <p className="cclock__address">
          {parts.map((p, i) => (
            <span key={p.key}>
              {i > 0 && <i className="cc-tick-rule" aria-hidden="true" />}{' '}
              {p.focus ? <b>{p.text}</b> : p.text}
            </span>
          ))}
        </p>
      )}

      {instrument && (
        <div className="cclock__controls">
          {up && (
            <button type="button" className="cclock__btn" onClick={() => setState(zoomOut)}>
              {'‹'} Out to {levelName(up)}
            </button>
          )}
          {!(onNow && state.level === NOW_STATE.level) && (
            <button type="button" className="cclock__btn" onClick={() => setState(NOW_STATE)}>
              Back to now
            </button>
          )}
        </div>
      )}

      {instrument && <Legend />}

      {instrument && (
        <>
          <p className="cclock__foot">{SANDHYA_NOTE}</p>
          <p className="cclock__foot">
            {COLOUR_NOTE.text}{' '}
            <a href={COLOUR_NOTE.variantHref}>See {COLOUR_NOTE.variantLabel}</a>
            {'; '}
            <a href={COLOUR_NOTE.durationsHref}>{COLOUR_NOTE.durationsLabel}</a>.
          </p>
          <ul className="cclock__offdial">
            <li>Not fixed to one point on the dial:</li>
            {OFF_DIAL_PERIODS.map((p) => (
              <li key={p.slug}>
                <a href={p.route}>
                  {p.title} ({p.events.toLocaleString('en-US')})
                </a>
              </li>
            ))}
            <li>
              {TOTAL_EVENTS.toLocaleString('en-US')} events in all.
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

/* ── one ring ───────────────────────────────────────────────────────────── */

interface RingLayerProps {
  ring: Ring;
  band: [number, number];
  interactive: boolean;
  widthPx: number;
  unitsToPx: number;
  u: number;
  uid: string;
  focusIdx: number;
  onActivate: (w: Wedge) => void;
  onKey: (e: ReactKeyboardEvent, w: Wedge) => void;
  onFocusWedge: (i: number) => void;
  registerRef: (i: number, el: SVGElement | null) => void;
}

function RingLayer({
  ring,
  band,
  interactive,
  widthPx,
  unitsToPx,
  u,
  focusIdx,
  onActivate,
  onKey,
  onFocusWedge,
  registerRef,
}: RingLayerProps) {
  const [rIn, rOut] = band;
  const rMid = (rIn + rOut) / 2;
  const bandPx = (rOut - rIn) * unitsToPx;
  const rot = -ring.align * 360;

  /* A ring of many equal divisions is drawn as two dashed arcs, not N elements. */
  const dense = ring.gauge || ring.count > 20;
  const labels = layOutLabels(ring, rMid, bandPx, widthPx, interactive);

  const hitIn = Math.max(rIn - (interactive ? 26 : 0), 40);
  const hitOut = rOut + (interactive ? 12 : 0);

  return (
    <g
      className="cclock__ring"
      style={{ transform: `rotate(${f2(rot)}deg)` }}
      role={interactive ? 'toolbar' : undefined}
      aria-label={interactive ? ring.aria : undefined}
      aria-hidden={interactive ? undefined : true}
    >
      {dense ? (
        <DenseTicks ring={ring} rIn={rIn} rOut={rOut} u={u} />
      ) : (
        ring.wedges.map((w) => (
          <path
            key={'s' + w.key}
            className={'cc-shape ' + wedgeClass(w)}
            style={w.hueVar ? ({ ['--cc-hue' as string]: hue(w.hueVar) } as CSSProperties) : undefined}
            d={sectorPath(rIn, rOut, w.from + padFor(ring, w), w.to - padFor(ring, w))}
          />
        ))
      )}

      {labels.map((l) => (
        <text
          key={'l' + l.key}
          className={l.cls}
          x={f2(l.x)}
          y={f2(l.y - (l.lines.length > 1 ? l.size * 0.62 * u : 0))}
          fontSize={f2(l.size * u)}
          textAnchor="middle"
          dominantBaseline="central"
          fill={l.fill}
          style={{ transform: `rotate(${f2(-rot)}deg)`, transformOrigin: `${f2(l.x)}px ${f2(l.y)}px` }}
        >
          {l.lines.map((line, i) => (
            <tspan
              key={i}
              x={f2(l.x)}
              dy={i === 0 ? 0 : f2(l.size * 1.3 * u)}
              className={i === 0 ? undefined : 'cc-wedge__sub'}
            >
              {line}
            </tspan>
          ))}
        </text>
      ))}

      {interactive &&
        ring.wedges.map((w, i) => {
          const d = sectorPath(hitIn, hitOut, w.from, w.to);
          const focusD = sectorPath(rIn + 2 * u, rOut - 2 * u, w.from, w.to);
          // SVG <a> and <g> share these; React types them as HTML, hence the cast.
          const common = {
            className: 'cc-wedge' + (w.zoomsTo || w.href ? '' : ' cc-wedge--inert'),
            tabIndex: i === focusIdx ? 0 : -1,
            'aria-label': w.aria,
            'aria-current': w.tone === 'current' ? 'true' : undefined,
            onKeyDown: (e: ReactKeyboardEvent) => onKey(e, w),
            onFocus: () => onFocusWedge(i),
            ref: (el: unknown) => registerRef(i, (el ?? null) as SVGElement | null),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any;
          const inner = (
            <>
              <path className="cc-wedge__hit" d={d} />
              <path className="cc-wedge__focus" d={focusD} />
            </>
          );
          return w.href ? (
            <a key={'h' + w.key} href={w.href} {...common}>
              {inner}
            </a>
          ) : (
            <g key={'h' + w.key} role="button" onClick={() => onActivate(w)} {...common}>
              {inner}
            </g>
          );
        })}
    </g>
  );
}

/**
 * The 71-, 100- and 360-division rings, drawn as two stroked arcs whose dash
 * pattern *is* the tick pattern. Three or four SVG nodes instead of hundreds.
 */
function DenseTicks({
  ring,
  rIn,
  rOut,
  u,
}: {
  ring: Ring;
  rIn: number;
  rOut: number;
  u: number;
}) {
  const rMid = (rIn + rOut) / 2;
  const thickness = rOut - rIn;
  const circ = 2 * Math.PI * rMid;
  const per = circ / ring.count;
  // a true 1.4px hairline at any rendered size, never fatter than a third of its slot
  const tick = Math.min(1.4 * u, per * 0.33);
  const dash = `${f2(tick)} ${f2(per - tick)}`;
  const cur = ring.wedges.find((w) => w.tone === 'current');
  const sel = ring.wedges.find((w) => w.selected && w.tone !== 'current');
  const cutAt = cur ? cur.n - 1 : ring.wedges.length;

  return (
    <>
      {cutAt > 0 && (
        <path
          className="cc-ticks cc-ticks--past"
          d={arcPath(rMid, 0, cutAt / ring.count)}
          strokeWidth={thickness}
          strokeDasharray={dash}
        />
      )}
      {cur && cutAt + 1 < ring.count && (
        <path
          className="cc-ticks cc-ticks--future"
          d={arcPath(rMid, (cutAt + 1) / ring.count, 1)}
          strokeWidth={thickness}
          strokeDasharray={dash}
        />
      )}
      {!cur && (
        <path
          className="cc-ticks cc-ticks--future"
          d={arcPath(rMid, 0, 1)}
          strokeWidth={thickness}
          strokeDasharray={dash}
        />
      )}
      {sel && (
        <path className="cc-shape is-current" d={sectorPath(rIn, rOut, sel.from, sel.to)} />
      )}
      {cur && (
        <path
          className="cc-shape is-current"
          d={sectorPath(rIn - 3 * u, rOut + 3 * u, cur.from, cur.to)}
        />
      )}
    </>
  );
}

/**
 * Angular padding, in fractions of a turn, taken off each side of a wedge.
 * On the manvantara ring the true gap is the 15 sandhyās (0.144° each): too fine
 * to see, so it is opened to a visible hairline. Elsewhere it is a plain hairline gap.
 */
function padFor(ring: Ring, w: Wedge): number {
  if (ring.count <= 1) return 0;
  const minGapDeg = ring.division === 'manvantaras' ? 0.75 : 0.6;
  const span = (w.to - w.from) * 360;
  return Math.min(minGapDeg / 2, span * 0.12) / 360;
}

/** Tone and hue modifiers, applied to the same element as `.cc-shape`.
 *  A data hue (the yugas, the periods) always fills; the tone then adds the
 *  gold index stroke for "current" and the dashed edge for "not yet written". */
function wedgeClass(w: Wedge): string {
  return 'is-' + w.tone + (w.hueVar ? (w.tint ? ' is-tint' : ' is-hue') : '');
}

/** Shrink a centre line until it fits inside the core disc, down to a 10px floor. */
function fitFont(text: string, coreR: number, widthPx: number, want: number): number {
  const maxPx = ((2 * coreR) / VB) * widthPx * 0.84;
  const est = text.length * CHAR_W * want;
  if (est <= maxPx) return want;
  return Math.max(10, (maxPx / (text.length * CHAR_W)));
}

function levelName(l: Level): string {
  switch (l) {
    case 'brahma':
      return "Brahmā's life";
    case 'kalpa':
      return 'the kalpa';
    case 'manvantara':
      return 'the manvantara';
    case 'mahayuga':
      return 'the mahāyuga';
    case 'yuga':
      return 'the yuga';
  }
}

function crumbLabel(l: Level, s: ClockState): string {
  switch (l) {
    case 'brahma':
      return 'Brahmā';
    case 'kalpa':
      return 'Kalpa';
    case 'manvantara':
      return `Manvantara ${s.manvantara ?? CURRENT.manvantara}`;
    case 'mahayuga':
      return `Mahāyuga ${s.mahayuga ?? CURRENT.mahayuga}`;
    case 'yuga':
      return YUGA_LABEL[s.yuga ?? CURRENT.yuga];
  }
}

/** Four rows. The footnote under it carries the source and the variant. */
function Legend() {
  return (
    <ul className="cclock__legend">
      {YUGA_ORDER.map((y) => (
        <li key={y}>
          <i className="cclock__swatch" style={{ ['--cc-sw' as string]: `var(--cc-${y})` }} aria-hidden="true" />
          <span>
            <b>{YUGA_LABEL[y]}</b>{' '}
            {YUGA_YEARS[y].toLocaleString('en-US')} yr{' '}
            {/* Kali is one tenth of the mahāyuga: "1 parts". */}
            <span aria-hidden="true">·</span>{' '}
            {(() => {
              const n = YUGA_YEARS[y] / (MAHAYUGA_YEARS / 10);
              return `${n} ${n === 1 ? 'part' : 'parts'}`;
            })()}
          </span>
        </li>
      ))}
    </ul>
  );
}
