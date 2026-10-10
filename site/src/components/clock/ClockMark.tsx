/**
 * ClockMark — the clock reduced to a mark: three hairline rings and the index at
 * twelve o'clock. It is the site's sigil (DESIGN-BRIEF §1.1, §8: "the clock ring
 * is the mark and favicon"), the header "you are here" glyph, and the chip glyph
 * in front of a period name.
 *
 * Two forms of the same drawing:
 *   <ClockMark />          — React, for islands and the header
 *   clockMarkSvg({...})    — an SVG string, for Astro/HTML to inline with no island
 *
 * At 16px only three circles, an arc and a needle survive; that is the whole point.
 */

import type { CSSProperties } from 'react';
import type { PeriodSlug, YugaKey } from './clock-model';

export type MarkAccent = YugaKey | PeriodSlug;

/**
 * The arc each accent lights on the outer ring, as [fromDeg, toDeg] clockwise from 12.
 * These are true proportions, so Kali is 36° — about two pixels of arc at 16px. They
 * are therefore only drawn at 28px and up; below that the accent is the whole inner
 * ring, which is a hue cue rather than a measurement. The measurement is the clock's job.
 */
const ACCENT_ARC: Record<string, [number, number]> = {
  // the four yugas at their true 4 : 3 : 2 : 1 share of the mahāyuga
  satya: [0, 144],
  treta: [144, 252],
  dvapara: [252, 324],
  kali: [324, 360],
  'satya-yuga': [0, 144],
  'treta-yuga': [144, 252],
  'dvapara-yuga': [252, 324],
  'kali-yuga-scriptural': [324, 360],
  'kali-yuga-history': [324, 360],
  // the manvantara-scale periods, at their share of the 14
  'earlier-manvantaras': [10, 165],
  'future-manvantaras': [190, 350],
  'before-time': [350, 370],
  'cross-yuga': [0, 360],
};

/**
 * Accent colours at mark scale. Small marks need the *text* grade of a hue, not the
 * large-area grade: at 16px, --yuga-kali (#8A6A2A) is indistinguishable from the gold
 * rings, and the near-white Satya *surface* is invisible on paper. The site already
 * publishes both grades: --yuga-satya is the solid mark grade (--yuga-satya-fill is
 * the surface), and --yuga-kali-ink is Kali's text grade.
 */
const HUE: Record<string, string> = {
  satya: '--yuga-satya',
  treta: '--yuga-treta',
  dvapara: '--yuga-dvapara',
  kali: '--yuga-kali-ink',
  'satya-yuga': '--yuga-satya',
  'treta-yuga': '--yuga-treta',
  'dvapara-yuga': '--yuga-dvapara',
  'kali-yuga-scriptural': '--yuga-kali-ink',
  'kali-yuga-history': '--yuga-kali-ink',
  'earlier-manvantaras': '--period-earlier',
  'future-manvantaras': '--period-future',
  'before-time': '--period-before',
  'cross-yuga': '--period-cross',
};

const FALLBACK: Record<string, string> = {
  '--yuga-satya': '#8b7f63',
  '--yuga-treta': '#9c4a1c',
  '--yuga-dvapara': '#3b4a7a',
  '--yuga-kali-ink': '#6e541e',
  '--period-earlier': '#8e897b',
  '--period-future': '#2e4066',
  '--period-before': '#7a7568',
  '--period-cross': '#5b4f3f',
};

/* Geometry in a 32×32 box: rings at 14, 10.5, 7; the needle from the centre to 15.5. */
const S = 32;
const CC = 16;
const R = [14, 10.5, 7];

function arc(r: number, a0: number, a1: number): string {
  const p = (deg: number) => {
    const t = ((deg - 90) * Math.PI) / 180;
    return [CC + r * Math.cos(t), CC + r * Math.sin(t)];
  };
  const span = a1 - a0;
  if (span >= 359.9) {
    return `M ${CC - r} ${CC} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = span > 180 ? 1 : 0;
  const r2 = (n: number) => Math.round(n * 1000) / 1000;
  return `M ${r2(x0)} ${r2(y0)} A ${r} ${r} 0 ${large} 1 ${r2(x1)} ${r2(y1)}`;
}

export interface ClockMarkProps {
  /** Rendered size in CSS px. 16–24 in chrome; anything up to ~64 still reads. */
  size?: number;
  /** Light one arc of the outer ring in that period's hue. */
  period?: MarkAccent;
  /** Accessible name; omit for a purely decorative mark next to visible text. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function ClockMark({ size = 20, period, title, className, style }: ClockMarkProps) {
  const accent = period ? ACCENT_ARC[period] : undefined;
  const hueVar = period ? HUE[period] : undefined;
  const sw = strokeFor(size);
  return (
    <svg
      className={'clockmark' + (className ? ' ' + className : '')}
      width={size}
      height={size}
      viewBox={`0 0 ${S} ${S}`}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={style}
    >
      {title ? <title>{title}</title> : null}
      {ringsFor(size).map((r, i) => (
        <circle
          key={r}
          className="clockmark__ring"
          cx={CC}
          cy={CC}
          r={r}
          strokeWidth={i === 0 ? sw : sw * 0.8}
          opacity={i === 0 ? 1 : 0.55}
        />
      ))}
      {hueVar && (
        <circle
          className="clockmark__accent"
          cx={CC}
          cy={CC}
          r={R[1]}
          fill="none"
          strokeWidth={sw * 2}
          style={{ stroke: `var(${hueVar}, ${FALLBACK[hueVar]})` }}
        />
      )}
      {accent && hueVar && size >= 28 && (
        <path
          className="clockmark__arc"
          d={arc(R[0], accent[0], accent[1])}
          strokeWidth={sw * 2.6}
          strokeLinecap="butt"
          style={{ stroke: `var(${hueVar}, ${FALLBACK[hueVar]})` }}
        />
      )}
      <circle
        className="clockmark__shimmer"
        cx={CC}
        cy={CC}
        r={R[0]}
        fill="none"
        pathLength={100}
        strokeDasharray="13 87"
        strokeWidth={sw * 1.7}
      />
      <line
        className="clockmark__needle"
        x1={CC}
        y1={CC - 4}
        x2={CC}
        y2={CC - 15.5}
        strokeWidth={sw * 1.15}
      />
      <circle className="clockmark__boss" cx={CC} cy={CC} r={sw * 1.35} />
    </svg>
  );
}

/** Hairlines must stay hairlines: thinner strokes as the mark grows. */
function strokeFor(size: number): number {
  return Math.max(0.9, Math.min(1.6, (S / size) * 1.05));
}

/** Below 18px the innermost ring closes up into the boss; two rings still read. */
function ringsFor(size: number): number[] {
  return size < 18 ? R.slice(0, 2) : R;
}

export default ClockMark;

/* ── the same drawing as a string, for Astro/HTML to inline ─────────────── */

export interface ClockMarkSvgOptions {
  size?: number;
  /**
   * The Astro callers pass a period slug straight off a graph node or a route
   * param, which is only ever a `string` to the type checker. `ACCENT_ARC` and
   * `HUE` are both keyed loosely and return `undefined` for anything they do
   * not know, so an unrecognised value draws the plain mark rather than
   * throwing; the union is kept in the type for editor completion.
   */
  period?: MarkAccent | (string & {});
  title?: string;
  className?: string;
  /** Bake colours in instead of reading CSS custom properties (the favicon needs this). */
  standalone?: boolean;
}

export function clockMarkSvg({
  size = 20,
  period,
  title,
  className = 'clockmark',
  standalone = false,
}: ClockMarkSvgOptions = {}): string {
  const sw = strokeFor(size);
  const accent = period ? ACCENT_ARC[period] : undefined;
  const hueVar = period ? HUE[period] : undefined;
  const ring = standalone ? '#96742e' : 'var(--gold, #96742e)';
  const verm = standalone ? '#a8342a' : 'var(--rubric, #a8342a)';
  const accentColour = hueVar
    ? standalone
      ? FALLBACK[hueVar]
      : `var(${hueVar}, ${FALLBACK[hueVar]})`
    : undefined;

  const rings = ringsFor(size)
    .map(
      (r, i) =>
        `<circle cx="${CC}" cy="${CC}" r="${r}" fill="none" stroke="${ring}" stroke-width="${
          i === 0 ? sw : +(sw * 0.8).toFixed(2)
        }"${i === 0 ? '' : ' opacity=".55"'}/>`,
    )
    .join('');
  const accentEl = accentColour
    ? `<circle cx="${CC}" cy="${CC}" r="${R[1]}" fill="none" stroke="${accentColour}" stroke-width="${(
        sw * 2
      ).toFixed(2)}"/>`
    : '';
  const arcEl =
    accent && accentColour && size >= 28
      ? `<path d="${arc(R[0], accent[0], accent[1])}" fill="none" stroke="${accentColour}" stroke-width="${(
          sw * 2.6
        ).toFixed(2)}"/>`
      : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${S} ${S}" ${title ? `role="img" aria-label="${esc(title)}"` : 'aria-hidden="true"'} focusable="false">` +
    (title ? `<title>${esc(title)}</title>` : '') +
    rings +
    accentEl +
    arcEl +
    `<circle class="clockmark__shimmer" cx="${CC}" cy="${CC}" r="${R[0]}" fill="none" pathLength="100" ` +
    `stroke-dasharray="13 87" stroke-width="${(sw * 1.7).toFixed(2)}"/>` +
    `<line x1="${CC}" y1="${CC - 4}" x2="${CC}" y2="${CC - 15.5}" stroke="${verm}" stroke-width="${(
      sw * 1.15
    ).toFixed(2)}"/>` +
    `<circle cx="${CC}" cy="${CC}" r="${(sw * 1.35).toFixed(2)}" fill="${verm}"/>` +
    `</svg>`
  );
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The favicon: the same mark, drawn a touch heavier so it survives 16px, with the
 * Kali arc lit because that is where the reader is. Colours are baked (a favicon
 * has no page to inherit tokens from) and it carries its own paper ground so it
 * reads on a browser's dark tab strip as well as a light one.
 */
export function faviconSvg(): string {
  const sw = 1.6;
  const [a0, a1] = ACCENT_ARC.kali;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">` +
    `<rect width="${S}" height="${S}" rx="4" fill="#F4EEDD"/>` +
    R.map(
      (r, i) =>
        `<circle cx="${CC}" cy="${CC}" r="${r - 1}" fill="none" stroke="#96742E" stroke-width="${
          i === 0 ? sw : 1.3
        }"${i === 0 ? '' : ' opacity=".7"'}/>`,
    ).join('') +
    `<circle cx="${CC}" cy="${CC}" r="${R[1] - 1}" fill="none" stroke="#6E541E" stroke-width="2.6"/>` +
    `<path d="${arc(R[0] - 1, a0, a1)}" fill="none" stroke="#6E541E" stroke-width="3"/>` +
    `<line x1="${CC}" y1="${CC - 3.5}" x2="${CC}" y2="${CC - 15}" stroke="#A8342A" stroke-width="2"/>` +
    `<circle cx="${CC}" cy="${CC}" r="2.1" fill="#A8342A"/>` +
    `</svg>`
  );
}
