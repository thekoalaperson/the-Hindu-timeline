/**
 * glyphs.ts — the carved emblems (W4, BRIEF v4 §4).
 *
 * Twenty-nine chapters of the spine have no picture and, honestly, cannot get
 * one: an abstract doctrine (Kali's symptoms, the Night of Brahmā), a period of
 * recorded history, a future age. The 50-film library is a catalogue of
 * Puranic narrative scenes and has no image of any of them (lane R7 searched
 * and said so). Forcing a mood-only still onto those chapters would be the
 * wrong picture, which is worse than none.
 *
 * So they get a *designed* mark instead of a hole: one of twelve emblems,
 * chosen for what the chapter is about, drawn in the age's own accent. A
 * landmark on the road and a band on a period page then always carry
 * something made — never an empty arch.
 *
 * The drawings live here as bare path data so the sprite (`GlyphSprite.astro`)
 * is emitted once per page and every use is a 60-byte `<use>`; nothing about
 * glyphs reaches the road's route JavaScript.
 *
 * The chosen glyph per chapter is authored in `src/data/chapters.json`
 * (`glyph`), beside the `art` it stands in for.
 */

/** The whole vocabulary. A chapter may name one of these and nothing else. */
export const GLYPH_IDS = [
  'conch',
  'lotus',
  'wheel',
  'flame',
  'wave',
  'mountain',
  'manuscript',
  'spire',
  'sun',
  'crescent',
  'gate',
  'footprint',
] as const;

export type GlyphId = (typeof GLYPH_IDS)[number];

/**
 * Inner markup of each 24×24 symbol. Stroked in `currentColor` (the age's
 * accent) by the sprite, so a glyph is one colour and one weight everywhere.
 */
export const GLYPHS: Record<GlyphId, string> = {
  conch:
    '<path d="M16.8 4.6c2.5 2.6 3 6.7 1.1 9.9-2 3.4-6.1 5-9.7 3.7-2.6-1-3.9-3.7-3-6.1.8-2.1 3.1-3 5-2 1.5.8 2 2.6 1.1 4"/>' +
    '<path d="M16.8 4.6 12 8"/>',
  lotus:
    '<path d="M12 19.6c-2.5-2.6-2.5-8 0-11.5 2.5 3.5 2.5 8.9 0 11.5Z"/>' +
    '<path d="M12 19.6C8.1 19 4.7 16.1 4 12.1c4 .3 7.2 3.3 8 7.5Z"/>' +
    '<path d="M12 19.6c3.9-.6 7.3-3.5 8-7.5-4 .3-7.2 3.3-8 7.5Z"/>',
  wheel:
    '<circle cx="12" cy="12" r="7.6"/><circle cx="12" cy="12" r="2.2"/>' +
    '<path d="M12 4.4v15.2M4.4 12h15.2M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4"/>',
  flame:
    '<path d="M12 20.2c-3 0-5.3-2.2-5.3-5.1 0-3.6 3.5-5.5 4.3-11.1 3 3 6.3 6.3 6.3 11.1 0 2.9-2.3 5.1-5.3 5.1Z"/>' +
    '<path d="M12 20.2c-1.4 0-2.5-1.2-2.5-2.7 0-1.8 1.4-2.6 2.5-4.4 1.1 1.8 2.5 2.6 2.5 4.4 0 1.5-1.1 2.7-2.5 2.7Z"/>',
  wave:
    '<path d="M2.8 9.6c2-2.3 4.1-2.3 6.1 0s4.1 2.3 6.1 0 4.1-2.3 6.1 0"/>' +
    '<path d="M2.8 15.2c2-2.3 4.1-2.3 6.1 0s4.1 2.3 6.1 0 4.1-2.3 6.1 0"/>',
  mountain:
    '<path d="M2.4 19.4 9 7.2l4 6.5 2.6-3.9 6.1 9.6Z"/><path d="M6.6 12h4.8"/>',
  manuscript:
    '<path d="M3.2 8.4h17.6a1.6 1.6 0 0 1 0 7.2H3.2a1.6 1.6 0 0 1 0-7.2Z"/>' +
    '<path d="M6.6 11h10.8M6.6 13.4h6.6"/>',
  spire:
    '<path d="M12 4.6c2.6 3.7 4.1 7.7 4.1 11.2H7.9c0-3.5 1.5-7.5 4.1-11.2Z"/>' +
    '<path d="M5.8 19.6h12.4M8.4 12.2h7.2M12 4.6V2.6"/>',
  sun:
    '<circle cx="12" cy="12" r="4.3"/>' +
    '<path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4 7.2 7.2M16.8 16.8l1.8 1.8M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8"/>',
  crescent: '<path d="M18.7 15.8A8.1 8.1 0 0 1 9.3 4.5a8.1 8.1 0 1 0 9.4 11.3Z"/>',
  gate:
    '<path d="M5 20v-8.6a7 7 0 0 1 14 0V20"/><path d="M2.6 9.4h18.8M12 4.4V2.4"/>',
  footprint:
    '<path d="M12 20.4c-2.4 0-4-1.8-4-4.2 0-2.6 1.3-4.1 1.3-6.4 0-1.6 1-2.7 2.7-2.7s2.7 1.1 2.7 2.7c0 2.3 1.3 3.8 1.3 6.4 0 2.4-1.6 4.2-4 4.2Z"/>' +
    '<circle cx="8.7" cy="6.2" r="1"/><circle cx="10.9" cy="4.8" r=".9"/>' +
    '<circle cx="13.1" cy="4.8" r=".9"/><circle cx="15.2" cy="6.1" r=".85"/>',
};

const VALID = new Set<string>(GLYPH_IDS);

/** A `glyph` field from the data, or null when it names nothing we can draw. */
export function glyphId(v: unknown): GlyphId | null {
  return typeof v === 'string' && VALID.has(v) ? (v as GlyphId) : null;
}
