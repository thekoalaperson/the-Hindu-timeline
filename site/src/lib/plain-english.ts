/**
 * plain-english.ts — deterministic IAST/scholarly-transliteration → popular
 * English spelling converter for "plain English reading mode".
 *
 * Pure, dependency-free, side-effect-free. Operates token-by-token on plain
 * text. Every Latin-script token is split on hyphens/apostrophes and each
 * resulting run is first checked against the exceptions dictionary
 * (unconditionally — a few required entries, e.g. "Caitanya" → "Chaitanya"
 * and "Svarga" → "Swarga", carry no diacritic at all, so they must not be
 * gated out before the lookup runs). Only a run with no exception hit AND
 * at least one diacritic character from the corpus's IAST/Tamil inventory
 * (DIACRITIC_CHARS below) goes through the character-rule pipeline; plain
 * English words ("The", "cause", "and") match neither path and pass through
 * untouched.
 *
 * Pipeline per touched token:
 *   1. Split the token on hyphens and apostrophes, preserving the separators
 *      verbatim (this is what makes "Kṛṣṇa-līlā" → "Krishna-lila" and
 *      "Kṛṣṇa's" → "Krishna's" fall out for free — the "s" after an
 *      apostrophe has no diacritics and is left alone by the gate).
 *   2. For each letter-run: look it up (case-insensitively) in the
 *      exceptions dictionary (plain-english-exceptions.json); if present,
 *      use that popular spelling with the run's case pattern re-applied.
 *   3. Otherwise, if the run has a diacritic, run the deterministic rule
 *      pipeline (a run with neither an exception hit nor a diacritic is
 *      returned unchanged):
 *        a. lone `c` (not already followed by `h`) → `ch`, decided against
 *           the *original* run so a same-pass `ḥ`/`ś` → h/sh substitution
 *           can never retroactively hide a real `c`. A geminate `cc` (IAST
 *           doubled affricate) → `cch`, not `chch` (e.g. `Uccaiḥśravas` →
 *           `Ucchaihshravas`): the first `c` is left literal and only the
 *           second one triggers the ch-expansion.
 *        b. every remaining diacritic character is replaced by its ASCII
 *           equivalent (case-preserving); see CHAR_MAP and the Tamil-vs-
 *           Sanskrit `ḷ` decision in mapChar().
 *
 * Because every diacritic character maps to a plain-ASCII-only replacement,
 * and the exceptions dictionary's values are plain ASCII too, a run that has
 * already been converted contains no diacritic and has no further exception
 * hit — *provided* no exception's output string is itself a different
 * exception's key (a rule enforced by convention when curating
 * plain-english-exceptions.json, and checked by the test suite). Given that,
 * plainSpelling is idempotent by construction, not by a special-cased check.
 *
 * Sanity guards: fenced/inline code spans and http(s)/www URLs are located
 * first and copied through verbatim (never tokenized). Devanagari text is
 * never matched by the tokenizer at all (it only matches the Latin Unicode
 * script), so it needs no separate guard.
 */

import exceptionsData from './plain-english-exceptions.json' with { type: 'json' };

/**
 * word (lowercase, NFC) → popular English spelling (canonical case, usually
 * Title Case). A key containing a literal space (e.g. "bhagavad gītā") is a
 * *phrase* entry, matched by applyPhraseExceptions() before per-word
 * tokenization runs — see that function for why this exists.
 */
const EXCEPTIONS: Readonly<Record<string, string>> = exceptionsData as Record<string, string>;

/**
 * Single-character IAST/Tamil diacritic → plain-ASCII replacement, keyed by
 * the lowercase source character. `ḷ`/`ḹ` are deliberately absent here — they
 * are context-dependent (Sanskrit vocalic l vs. Tamil retroflex l) and are
 * resolved in mapChar() instead.
 */
const CHAR_MAP: Readonly<Record<string, string>> = {
  ā: 'a',
  ī: 'i',
  ū: 'u',
  ē: 'e',
  ō: 'o',
  ṛ: 'ri',
  ṝ: 'ri',
  ṃ: 'm',
  ṁ: 'm',
  ḥ: 'h',
  ṇ: 'n',
  ṭ: 't',
  ḍ: 'd',
  ñ: 'n', // jñ → jn falls out of this + the untouched ascii "j" — no cluster rule needed.
  ṅ: 'n',
  ś: 'sh',
  ṣ: 'sh', // kṣ → ksh falls out of this + the untouched ascii "k" — no cluster rule needed.
  ṉ: 'n', // Tamil dental n
  ṟ: 'r', // Tamil hard r
  ḻ: 'l', // Tamil retroflex l (zh)
};

/** Every diacritic character this module knows how to touch (lowercase forms). */
const DIACRITIC_CHARS = new Set([...Object.keys(CHAR_MAP), 'ḷ', 'ḹ']);

/** Tamil markers: a token carrying any of these treats `ḷ`/`ḹ` as plain Tamil `l`, not Sanskrit vocalic l→"li". */
const TAMIL_MARKERS = new Set(['ṉ', 'ṟ', 'ḻ']);

/** Gate: does this token contain at least one character plainSpelling knows how to convert? */
const DIACRITIC_RE = new RegExp(`[${[...DIACRITIC_CHARS].join('')}${[...DIACRITIC_CHARS].map((c) => c.toUpperCase()).join('')}]`);

function hasDiacritic(token: string): boolean {
  return DIACRITIC_RE.test(token);
}

function hasTamilMarker(word: string): boolean {
  const lower = word.toLowerCase();
  for (const ch of lower) {
    if (TAMIL_MARKERS.has(ch)) return true;
  }
  return false;
}

/** Step 3a: lone `c` (not already followed by `h`) → `ch`, case-preserving. Scans the original run only. */
function applyChRule(word: string): string {
  let out = '';
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (ch === 'c' || ch === 'C') {
      const next = word[i + 1];
      if (next === 'c' || next === 'C') {
        // Geminate "cc" → "cch": the first c is emitted literally, and the
        // second c (next loop iteration) is evaluated against *its own*
        // following character, so it alone triggers the ch-expansion below.
        // Net effect: "cc" + (non-h) → "c" + "ch" = "cch", not "chch".
        out += ch;
        continue;
      }
      if (next !== 'h' && next !== 'H') {
        out += ch === 'c' ? 'ch' : 'Ch';
        continue;
      }
    }
    out += ch;
  }
  return out;
}

/** Map one character (post ch-rule) to its ASCII replacement, or null if untouched. */
function mapChar(ch: string, tamil: boolean): string | null {
  const lower = ch.toLowerCase();
  let repl: string | undefined;
  if (lower === 'ḷ' || lower === 'ḹ') {
    repl = tamil ? 'l' : 'li';
  } else {
    repl = CHAR_MAP[lower];
  }
  if (repl === undefined) return null;
  if (ch === lower) return repl;
  // Uppercase source character: capitalize the first letter of the (possibly
  // multi-letter) replacement, e.g. Ś → "Sh", Ṛ → "Ri".
  return repl.charAt(0).toUpperCase() + repl.slice(1);
}

/** Step 3b: replace every remaining diacritic character in a (post ch-rule) run. */
function applyCharMap(word: string): string {
  const tamil = hasTamilMarker(word);
  let out = '';
  for (const ch of word) {
    const mapped = mapChar(ch, tamil);
    out += mapped === null ? ch : mapped;
  }
  return out;
}

type CasePattern = 'lower' | 'upper' | 'title' | 'mixed';

function detectCase(word: string): CasePattern {
  if (!word) return 'mixed';
  const lower = word.toLowerCase();
  const upper = word.toUpperCase();
  if (word === lower) return 'lower';
  if (word === upper && lower !== upper) return 'upper';
  if (word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) return 'title';
  return 'mixed';
}

function applyCase(value: string, pattern: CasePattern): string {
  switch (pattern) {
    case 'lower':
      return value.toLowerCase();
    case 'upper':
      return value.toUpperCase();
    case 'title':
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    default:
      return value;
  }
}

/** Look up a single letter-run in the exceptions dictionary, case-preserving. Null if no entry. */
function lookupException(word: string): string | null {
  const key = word.toLowerCase();
  const val = EXCEPTIONS[key];
  if (val === undefined) return null;
  return applyCase(val, detectCase(word));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Multi-word exception entries (a dictionary key containing a literal
 * space, e.g. "bhagavad gītā"). These exist because plainSpelling otherwise
 * only ever sees one hyphen/apostrophe-free Latin run at a time — a phrase
 * whose popular spelling isn't just the concatenation of its independently-
 * converted words needs to be matched *before* per-word tokenization runs.
 * (In practice "Bhagavad Gītā" → "Bhagavad Gita" already falls out of the
 * per-word rules with no override needed; this mechanism exists so the
 * dictionary can still carry that entry literally, and so a future phrase
 * that genuinely needs whole-phrase handling has somewhere to go.)
 */
const PHRASE_ENTRIES: ReadonlyArray<{ re: RegExp; value: string }> = Object.entries(EXCEPTIONS)
  .filter(([key]) => key.includes(' '))
  .sort((a, b) => b[0].length - a[0].length)
  .map(([key, value]) => {
    const pattern = key.split(/\s+/).map(escapeRegExp).join('\\s+');
    return { re: new RegExp(`(?<![\\p{L}])(?:${pattern})(?![\\p{L}])`, 'giu'), value };
  });

/** Case pattern for a whole matched phrase: every word lowercase, every word uppercase, or "use the canonical stored casing". */
function applyPhraseCase(value: string, match: string): string {
  const lower = match.toLowerCase();
  const upper = match.toUpperCase();
  if (match === lower) return value.toLowerCase();
  if (match === upper && lower !== upper) return value.toUpperCase();
  return value;
}

/** Replace whole-phrase exception matches in a (skip-guarded) text segment before word-level tokenization runs. */
function applyPhraseExceptions(segment: string): string {
  if (PHRASE_ENTRIES.length === 0) return segment;
  let out = segment;
  for (const { re, value } of PHRASE_ENTRIES) {
    out = out.replace(re, (match) => applyPhraseCase(value, match));
  }
  return out;
}

/**
 * Convert one letter-run (no hyphens/apostrophes inside it) to its popular
 * spelling. The exceptions dictionary is checked *unconditionally* — a
 * handful of required entries (e.g. "Caitanya" → "Chaitanya", "Svarga" →
 * "Swarga") carry no diacritic at all, so they'd never reach a
 * diacritic-gated lookup. The character-rule pipeline, by contrast, only
 * ever runs on a run that actually contains a diacritic.
 */
function transformWord(word: string): string {
  if (!word) return word;
  const exceptionHit = lookupException(word);
  if (exceptionHit !== null) return exceptionHit;
  if (!hasDiacritic(word)) return word;
  return applyCharMap(applyChRule(word));
}

/** Split a token on hyphens/apostrophes (keeping the separators) and transform each run. */
function transformToken(token: string): string {
  const parts = token.split(/([-'’])/);
  return parts.map((part) => (part === '-' || part === "'" || part === '’' ? part : transformWord(part))).join('');
}

/** Maximal runs of Latin-script letters, allowing internal hyphens/apostrophes (never crosses whitespace/punctuation/Devanagari). */
const WORD_RE = /\p{Script=Latin}(?:[\p{Script=Latin}'’-]*\p{Script=Latin})?/gu;

/** Fenced code blocks, inline code spans, and bare URLs — copied through untouched. */
const SKIP_RE = /```[\s\S]*?```|`[^`\n]*`|https?:\/\/[^\s)\]}>"']+|www\.[^\s)\]}>"']+/g;

export interface PlainSpellingStats {
  /** The converted text. */
  text: string;
  /** Total Latin-script word tokens scanned (outside skipped code/URL spans). */
  tokensScanned: number;
  /** Tokens that were actually rewritten (via an exception hit and/or the diacritic rule pipeline). */
  tokensTransformed: number;
  /** Of the transformed tokens, how many were resolved via the exceptions dictionary rather than the rules alone. */
  exceptionsApplied: number;
}

function convert(text: string, stats: { scanned: number; transformed: number; exceptions: number } | null): string {
  if (!text) return text;

  const rewriteSegment = (segment: string): string => {
    // Phrase entries (dictionary keys with a literal space) must be matched
    // against the raw segment before word-level tokenization breaks it up.
    let withPhrases = segment;
    if (stats) {
      for (const { re } of PHRASE_ENTRIES) {
        const matches = segment.match(re);
        if (!matches) continue;
        for (const match of matches) {
          const wordCount = match.trim().split(/\s+/).length;
          stats.scanned += wordCount;
          stats.transformed += wordCount;
          stats.exceptions += wordCount;
        }
      }
    }
    withPhrases = applyPhraseExceptions(withPhrases);

    return withPhrases.replace(WORD_RE, (token) => {
      if (stats) stats.scanned++;
      const transformed = transformToken(token);
      if (transformed === token) return token;
      if (stats) {
        stats.transformed++;
        // Re-run the exception check at the run level (post hyphen/apostrophe
        // split) purely to count it; transformToken already did the real work.
        const parts = token.split(/([-'’])/);
        for (const part of parts) {
          if (part === '-' || part === "'" || part === '’' || !part) continue;
          if (lookupException(part) !== null) stats.exceptions++;
        }
      }
      return transformed;
    });
  };

  let result = '';
  let lastIndex = 0;
  SKIP_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SKIP_RE.exec(text))) {
    result += rewriteSegment(text.slice(lastIndex, m.index));
    result += m[0];
    lastIndex = m.index + m[0].length;
  }
  result += rewriteSegment(text.slice(lastIndex));
  return result;
}

/**
 * Convert IAST/scholarly Sanskrit(-adjacent) transliteration in `text` to the
 * popular English spellings a general reader knows. Pure function; leaves
 * fenced/inline code, URLs, Devanagari, and ordinary English words untouched.
 * Idempotent: `plainSpelling(plainSpelling(x)) === plainSpelling(x)`.
 */
export function plainSpelling(text: string): string {
  return convert(text, null);
}

/** Same conversion as plainSpelling(), plus counters useful for tests/telemetry. */
export function plainSpellingWithStats(text: string): PlainSpellingStats {
  const stats = { scanned: 0, transformed: 0, exceptions: 0 };
  const converted = convert(text, stats);
  return {
    text: converted,
    tokensScanned: stats.scanned,
    tokensTransformed: stats.transformed,
    exceptionsApplied: stats.exceptions,
  };
}

/* ------------------------------------------------------------------ *
 * Where the conversion touches — for the build-time pass
 * ------------------------------------------------------------------ */

/** One stretch of `text` whose popular spelling differs from what is written. */
export interface PlainSpan {
  /** Index of the first character of the run in the source string. */
  start: number;
  /** Index one past its last character. */
  end: number;
  /** The scholarly spelling, verbatim (`text.slice(start, end)`). */
  iast: string;
  /** What plainSpelling() turns it into. */
  plain: string;
}

/**
 * The runs plainSpelling() would rewrite, with their offsets — the same
 * decisions, reported instead of applied.
 *
 * This exists so the *build* can ship the popular spelling as the page's own
 * text (wrapping each run as `<span data-iast="Kṛṣṇa">Krishna</span>`) and
 * leave the client with nothing to do unless a reader asks for the scholarly
 * text. A visitor with JavaScript off then reads Krishna and Shiva rather
 * than Kṛṣṇa and Śiva — which is the point of D-plain-default, and exactly
 * what a DOM-walking converter could not deliver.
 *
 * Reassembling the spans reproduces plainSpelling() byte for byte:
 *
 *     spans.reduceRight((s, m) => s.slice(0, m.start) + m.plain + s.slice(m.end), text)
 *       === plainSpelling(text)
 *
 * (asserted over the corpus's own vocabulary in `test/plain-english.test.mjs`).
 * The two agree because this walks the same three passes in the same order:
 * the skip guard (code spans, URLs), then whole-phrase entries, then the
 * per-token rules on whatever the phrases did not claim.
 */
export function plainSpans(text: string): PlainSpan[] {
  if (!text) return [];
  const spans: PlainSpan[] = [];

  const scanSegment = (segment: string, base: number): void => {
    /* Phrase entries first, exactly as convert() applies them; their ranges
       are then closed to the word pass so a phrase is never rewritten twice. */
    const taken: [number, number][] = [];
    for (const { re, value } of PHRASE_ENTRIES) {
      re.lastIndex = 0;
      let pm: RegExpExecArray | null;
      while ((pm = re.exec(segment))) {
        const start = pm.index;
        const end = start + pm[0].length;
        if (taken.some(([a, b]) => start < b && end > a)) continue;
        taken.push([start, end]);
        const plain = applyPhraseCase(value, pm[0]);
        if (plain !== pm[0]) spans.push({ start: base + start, end: base + end, iast: pm[0], plain });
      }
    }

    WORD_RE.lastIndex = 0;
    let wm: RegExpExecArray | null;
    while ((wm = WORD_RE.exec(segment))) {
      const start = wm.index;
      const end = start + wm[0].length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      const plain = transformToken(wm[0]);
      if (plain !== wm[0]) spans.push({ start: base + start, end: base + end, iast: wm[0], plain });
    }
  };

  let lastIndex = 0;
  SKIP_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SKIP_RE.exec(text))) {
    scanSegment(text.slice(lastIndex, m.index), lastIndex);
    lastIndex = m.index + m[0].length;
  }
  scanSegment(text.slice(lastIndex), lastIndex);

  spans.sort((a, b) => a.start - b.start);
  return spans;
}

/** Exposed for tests/tools: the exact set of characters that mark a token as convertible. */
export const DIACRITIC_INVENTORY: ReadonlyArray<string> = [...DIACRITIC_CHARS];
