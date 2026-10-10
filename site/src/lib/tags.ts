/**
 * The reliability / provenance tag allowlist (R1 §4).
 *
 * The corpus writes these as bare `[tag]` spans that are *not* markdown links.
 * An allowlist is mandatory: a blanket `[lowercase words]` rule would also badge
 * translator credits like `[Ganguli]` and `[Shastri]`.
 */
export const TAG_ALLOWLIST: string[] = [
  'scholarly',
  'folk',
  'regional',
  'disputed',
  'late text',
  'oral tradition',
  'traditional',
  'scripture',
  'scriptural',
  'variant',
  'folk tradition',
  'interpolation',
  'open-ended',
  'open-ended roster',
  'devotional',
  'tantra',
  'historical',
  'modern',
  'textual',
  'classical',
  'iconographic',
  'hagiographic',
  'disputed identity',
  'living tradition',
  'legend',
  'folk etymology',
  'cross-yuga',
];

/** Rough semantic bucket, exposed as `data-tag-kind` for I2 to colour. */
export const TAG_KIND: Record<string, string> = {
  scholarly: 'scholarly',
  historical: 'scholarly',
  textual: 'scholarly',
  classical: 'scholarly',
  scripture: 'scripture',
  scriptural: 'scripture',
  devotional: 'scripture',
  tantra: 'scripture',
  folk: 'folk',
  'folk tradition': 'folk',
  'folk etymology': 'folk',
  'oral tradition': 'folk',
  legend: 'folk',
  traditional: 'folk',
  'living tradition': 'folk',
  hagiographic: 'folk',
  regional: 'regional',
  iconographic: 'regional',
  disputed: 'disputed',
  'disputed identity': 'disputed',
  variant: 'disputed',
  'open-ended': 'disputed',
  'open-ended roster': 'disputed',
  'cross-yuga': 'disputed',
  'late text': 'late',
  interpolation: 'late',
  modern: 'late',
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Matches an allowlisted `[tag]`, optionally followed by a note the corpus
 * appends inline — `[scholarly: modern linguistics derives …]`,
 * `[disputed — some texts say …]`, `[late text; likely 16th c.]` — that is
 * not the label part of a markdown link. Longest tag first, so
 * `[open-ended roster]` wins over `[open-ended]`. Group 1 is the tag, group 2
 * the note (undefined when there is none).
 */
export const TAG_RE = new RegExp(
  `\\[(${[...TAG_ALLOWLIST]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|')})(?:\\s*[:;—–,]\\s*([^\\]\\n]{1,200}))?\\]`,
  'g',
);

export function tagKind(tag: string): string {
  return TAG_KIND[tag] ?? 'other';
}
