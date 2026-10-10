/**
 * rehype-corpus — hast-level transforms for the corpus markdown.
 *
 *  (d) cut the `## Sources` section into `<section class="sources" data-sources>`
 *      and hoist it to the end of the body (exact heading match — ~19 other
 *      headings merely contain the word "source")
 *  (f) wrap allowlisted reliability tags as `<span class="tag" data-tag="…">`
 *  (g) `- **Name** — text` bullets become `<li class="entry">` with
 *      `<strong class="lead">`
 *  (h) the trailing citation parenthetical becomes `<cite class="cit">`
 *  (i) a nested list of `*Variant (…):*` notes folds into
 *      `<details class="tellings"><summary>Other tellings (n)</summary>`
 *  (j) an internal link's visible text that is just the corpus's raw
 *      filename or directory path — bare or inside a `<code>` — is replaced
 *      with the target page's real title
 *  (l) every run whose popular English spelling differs is wrapped as
 *      `<span data-iast="Kṛṣṇa">Krishna</span>` — the plain spelling is the
 *      text the page ships, so a visitor with no JavaScript reads Krishna
 */
import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';
import linkPreviews from '../generated/link-previews.json' with { type: 'json' };
import { plainSpans } from './plain-english.ts';
import { TAG_RE, tagKind } from './tags.ts';

type Node = any;

const isEl = (n: Node, tag?: string) => n && n.type === 'element' && (!tag || n.tagName === tag);
const isWs = (n: Node) => n && n.type === 'text' && !n.value.trim();
const LEAD_DASH = /^\s*[—–-]\s+/;
/* `**Name** (gloss) — text`: a short parenthetical gloss sits between the
   lead and the dash. Single-level parens only (no nested `(`), matching the
   corpus's actual usage — a gloss with its own parenthetical is rare enough
   that leaving it as prose is the safer default. */
const GLOSS_DASH = /^(\s*)(\([^()]{1,160}\))(\s*[—–-]\s+)/;
const DASH_LEAD = /^(\s*)([—–-])(\s+)/;
/** Typewriter `-` before an entry's own text reads as an em dash; promote it,
    leave an already-correct em/en dash untouched. */
function promoteDash(s: string): string {
  const m = DASH_LEAD.exec(s);
  if (!m || m[2] !== '-') return s;
  return m[1] + '—' + m[3] + s.slice(m[0].length);
}
/* `(…)` at the end of the run. Three things are allowed to trail it and still
   leave it the citation, because the corpus writes all three routinely:
     · a full stop or semicolon;
     · any number of `[…]` editorial brackets — the short allowlisted
       reliability tags, but also long notes like `[scholarly: modern
       historical linguistics derives "asura" from …]`, which is why the bound
       is 200 and not 40;
     · one `— see <cross-reference>` clause (the markdown link inside it has
       already become an `<a>`, so only its text is in the flattened run).
   Anything else after the bracket — a further sentence, a dash clause that is
   not a cross-reference — means the parenthetical was an aside, not the
   entry's citation, and it is left as prose. */
const CITATION =
  /\(([^()]{2,220})\)([.;,]?(?:\s*\[[^\][\n]{1,200}\])*(?:\s*[—–-]\s*see\b[^()\n]{0,140})?)\s*$/;

function addClass(node: Node, cls: string) {
  node.properties = node.properties ?? {};
  const existing = node.properties.className;
  const list = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
  if (!list.includes(cls)) list.push(cls);
  node.properties.className = list;
}

function el(tagName: string, properties: Record<string, unknown>, children: Node[]): Node {
  return { type: 'element', tagName, properties, children };
}

/** The inline run that carries a list item's own text (loose `p` or tight `li`). */
function leadHost(li: Node): Node | null {
  const kids = (li.children ?? []).filter((c: Node) => !isWs(c));
  if (!kids.length) return null;
  if (isEl(kids[0], 'p')) return kids[0];
  return li;
}

/** (d) — pull `## Sources` out of the flow and hoist it to the end. */
function extractSources(tree: Node) {
  const kids: Node[] = tree.children ?? [];
  const start = kids.findIndex(
    (n) => isEl(n) && n.tagName === 'h2' && toString(n).trim() === 'Sources',
  );
  if (start === -1) return;
  let end = kids.length;
  for (let i = start + 1; i < kids.length; i++) {
    if (isEl(kids[i]) && (kids[i].tagName === 'h2' || kids[i].tagName === 'h1')) {
      end = i;
      break;
    }
  }
  const body = kids.splice(start, end - start);
  addClass(body[0], 'sources-title');
  // A `---` immediately before the Sources block is scaffolding, not content.
  let t = kids.length - 1;
  while (t >= 0 && isWs(kids[t])) t--;
  if (t >= 0 && isEl(kids[t], 'hr')) kids.splice(t, 1);
  kids.push(
    { type: 'text', value: '\n' },
    el('section', { className: ['sources'], 'data-sources': '' }, body),
    { type: 'text', value: '\n' },
  );
}

/**
 * (h) — the last parenthetical of an entry's own paragraph is its citation.
 *
 * The parenthetical is very often not one text node. The corpus italicises text
 * names inside it, so `(*Bhagavata Purana* 8.5; *Vishnu Purana* 1.9)` reaches
 * hast as five siblings — `"("`, `<em>`, `" 8.5; "`, `<em>`, `" 1.9)"` — and a
 * regex over the last node alone never sees the opening bracket. (That is why
 * `samudra-manthana` shipped 0 of its 32 citations.)
 *
 * So: flatten the inline tail to a string, remembering where every child's text
 * begins, match on that, then wrap the run of nodes from the one holding "(" to
 * the one holding ")" — carrying the `<em>`s across whole.
 */
function markCitation(host: Node) {
  const kids: Node[] = host.children ?? [];
  // A nested list, a folded <details> or trailing whitespace may sit after the
  // citation; the citation is the end of the entry's own *inline* run.
  const SKIP = new Set(['ul', 'ol', 'details', 'blockquote', 'br', 'table']);
  let last = kids.length - 1;
  while (last >= 0 && (isWs(kids[last]) || (isEl(kids[last]) && SKIP.has(kids[last].tagName)))) last--;
  if (last < 0) return;

  /* Flatten. An element counts for the width of its own text and is opaque —
     we never split one, we only move it. */
  const starts: number[] = [];
  let flat = '';
  for (let i = 0; i <= last; i++) {
    const n = kids[i];
    starts.push(flat.length);
    flat += n.type === 'text' ? n.value : isEl(n) ? toString(n) : '';
  }

  const m = CITATION.exec(flat);
  if (!m) return;
  const inner = m[1];
  if (!/\d/.test(inner) && !/^\p{Lu}/u.test(inner.trim())) return;

  const open = m.index; // offset of "("
  const close = open + 1 + inner.length; // offset of ")"

  const nodeAt = (offset: number) => {
    for (let i = last; i >= 0; i--) if (starts[i]! <= offset) return i;
    return -1;
  };
  const a = nodeAt(open);
  const b = nodeAt(close);
  // Both brackets must be plain text for the split to be exact. A parenthetical
  // wholly inside an <em> is left alone rather than guessed at.
  if (a < 0 || b < 0 || kids[a].type !== 'text' || kids[b].type !== 'text') return;

  const o = open - starts[a]!;
  const c = close - starts[b]! + 1; // exclusive end, just past ")"
  const before = (kids[a].value as string).slice(0, o);
  const after = (kids[b].value as string).slice(c);

  const citeKids: Node[] = [];
  if (a === b) {
    citeKids.push({ type: 'text', value: (kids[a].value as string).slice(o, c) });
  } else {
    const head = (kids[a].value as string).slice(o);
    if (head) citeKids.push({ type: 'text', value: head });
    for (let i = a + 1; i < b; i++) citeKids.push(kids[i]);
    const tail = (kids[b].value as string).slice(0, c);
    if (tail) citeKids.push({ type: 'text', value: tail });
  }

  const replacement: Node[] = [];
  if (before) replacement.push({ type: 'text', value: before });
  replacement.push(el('cite', { className: ['cit'] }, citeKids));
  if (after) replacement.push({ type: 'text', value: after });
  kids.splice(a, b - a + 1, ...replacement);
}

/** Does this `<li>` open with `<em>Variant (…):</em>`? */
function isTelling(li: Node): boolean {
  const host = leadHost(li);
  if (!host) return false;
  const kids = (host.children ?? []).filter((c: Node) => !isWs(c));
  if (!kids.length) return false;
  const first = kids[0];
  if (!isEl(first, 'em') && !isEl(first, 'strong')) return false;
  const text = toString(first).trim();
  if (!text) return false;
  if (text.endsWith(':')) return true;
  const next = kids[1];
  return !!(next && next.type === 'text' && next.value.trimStart().startsWith(':'));
}

/** (i) — fold a run of variant notes into `<details class="tellings">`. */
function foldTellings(li: Node) {
  const kids: Node[] = li.children ?? [];
  for (let i = 0; i < kids.length; i++) {
    const list = kids[i];
    if (!isEl(list, 'ul')) continue;
    const items: Node[] = (list.children ?? []).filter((c: Node) => isEl(c, 'li'));
    if (items.length === 0) continue;
    const flags = items.map(isTelling);
    if (!flags.some(Boolean)) continue;

    const runs: { match: boolean; items: Node[] }[] = [];
    for (let k = 0; k < items.length; k++) {
      const last = runs[runs.length - 1];
      if (last && last.match === flags[k]) last.items.push(items[k]);
      else runs.push({ match: flags[k], items: [items[k]] });
    }

    const out: Node[] = [];
    for (const run of runs) {
      const ul = el(
        'ul',
        { ...(list.properties ?? {}) },
        run.items.flatMap((it) => [{ type: 'text', value: '\n' }, it]).concat([{ type: 'text', value: '\n' }]),
      );
      if (!run.match) {
        out.push(ul);
        continue;
      }
      const n = run.items.length;
      out.push(
        el('details', { className: ['tellings'] }, [
          el('summary', {}, [{ type: 'text', value: `Other tellings (${n})` }]),
          { type: 'text', value: '\n' },
          ul,
        ]),
      );
    }
    kids.splice(i, 1, ...out);
    i += out.length - 1;
  }
}

/** (f) — badge the allowlisted reliability tags wherever they occur. */
function markTags(tree: Node) {
  visit(tree, 'text', (node: Node, index: number | undefined, parent: Node) => {
    if (!parent || index === undefined) return;
    if (isEl(parent) && (parent.tagName === 'code' || parent.tagName === 'pre')) return;
    const value: string = node.value;
    if (!value.includes('[')) return;
    TAG_RE.lastIndex = 0;
    if (!TAG_RE.test(value)) return;
    TAG_RE.lastIndex = 0;

    const out: Node[] = [];
    let cursor = 0;
    let m: RegExpExecArray | null;
    while ((m = TAG_RE.exec(value)) !== null) {
      if (m.index > cursor) out.push({ type: 'text', value: value.slice(cursor, m.index) });
      const tag = m[1];
      const note = m[2];
      out.push(
        el('span', { className: ['tag'], 'data-tag': tag, 'data-tag-kind': tagKind(tag) }, [
          { type: 'text', value: tag },
        ]),
      );
      if (note) {
        out.push(el('span', { className: ['tag-note'] }, [{ type: 'text', value: note.trim() }]));
      }
      cursor = m.index + m[0].length;
    }
    if (cursor < value.length) out.push({ type: 'text', value: value.slice(cursor) });
    parent.children.splice(index, 1, ...out);
    return index + out.length;
  });
}

/* A bare corpus path, relative-prefixed or not, ending in `.md` or `/` — the
   exact shape a link's own `url` takes when the author wrote
   `[TIMELINE.md](TIMELINE.md)` or a reference page listed `[foo.md](foo.md)`
   instead of a human title. */
const RAW_PATH_RE = /^(?:\.{1,2}\/)*[A-Za-z0-9][A-Za-z0-9_.\-/]*(?:\.md|\/)$/;

function flattenText(nodes: Node[]): string {
  return nodes.map((n: Node) => (n.type === 'text' ? n.value : isEl(n) ? toString(n) : '')).join('');
}

/** (j) — an internal link labelled with its own raw path gets the target's title instead. */
function unwrapRawPathLinks(tree: Node) {
  const previews = linkPreviews as Record<string, { title?: string }>;
  visit(tree, 'element', (node: Node) => {
    if (node.tagName !== 'a') return;
    const props = node.properties ?? {};
    const cls = Array.isArray(props.className) ? props.className : [];
    if (!cls.includes('xref')) return; // internal links only
    const route = props['data-route'];
    if (typeof route !== 'string') return;

    // The link text is either bare, or wrapped in a single <code> span —
    // either way, unwrap it to compare against the raw-path shape.
    let kids: Node[] = node.children ?? [];
    const wrapped = kids.length === 1 && isEl(kids[0], 'code');
    if (wrapped) kids = kids[0].children ?? [];
    const text = flattenText(kids).trim();
    if (!text || !RAW_PATH_RE.test(text)) return;

    const title = previews[route]?.title;
    if (!title) return; // no better text to offer — leave it exactly as authored
    node.children = [{ type: 'text', value: title }];
  });
}

/**
 * The same filing notes `scripts/graph.mjs` strips from a title — "(folder
 * hub)", "(stub)" — also travel inside cross-reference link *labels*, because
 * the corpus links to a file by quoting its heading. The title is fixed at the
 * pipeline; this is the other place the reader meets it. Only the trailing
 * note goes, and only inside an internal link.
 */
const FILING_NOTES =
  /\s*\((?:folder\s+hub|folder|hub|index|index\s+only|stub|placeholder|draft|wip|todo|tbd)\)\s*$/i;

function stripFilingNotes(tree: Node) {
  visit(tree, 'element', (node: Node) => {
    if (node.tagName !== 'a') return;
    /* `className` reaches this pass as an array or as a plain string depending
       on who set it; both have to be read or the pass silently does nothing. */
    const raw = node.properties?.className;
    const cls = Array.isArray(raw) ? raw.map(String) : raw ? String(raw).split(/\s+/) : [];
    if (!cls.includes('xref')) return;
    /* The note is always at the very end, and the label often ends on a
       transliteration span, so walk to the last text node rather than
       flattening and rebuilding (which would throw the markup away). */
    let kids: Node[] | undefined = node.children;
    let leaf: Node | null = null;
    while (kids && kids.length) {
      const lastNode: Node | undefined = kids[kids.length - 1];
      if (!lastNode) break;
      if (lastNode.type === 'text') {
        leaf = lastNode;
        break;
      }
      if (!isEl(lastNode)) break;
      kids = lastNode.children;
    }
    if (!leaf || typeof leaf.value !== 'string') return;
    const cut = leaf.value.replace(FILING_NOTES, '');
    if (cut !== leaf.value) leaf.value = cut;
  });
}

/** True for elements whose text must stay byte-faithful: code, pre, and the
    citation mark (`.cit` — IAST verse references and page/century notation
    routinely carry a bare `'`/`"` that curling would misrender). */
function isTypographyExempt(node: Node): boolean {
  if (!isEl(node)) return false;
  if (node.tagName === 'code' || node.tagName === 'pre') return true;
  const cls = Array.isArray(node.properties?.className) ? node.properties.className : [];
  return cls.includes('cit');
}

/** Curl a straight `'`/`"` to its typographic form. Per-text-node only (no
    state carried across element boundaries) — deliberately simple, since the
    corpus's straight quotes are overwhelmingly single words or short phrases
    that never split across inline markup. */
function curlQuotes(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== "'" && ch !== '"') {
      out += ch;
      continue;
    }
    const prev = i > 0 ? s[i - 1] : '';
    const opening = i === 0 || /[\s([{—–-]/.test(prev);
    if (ch === "'") out += opening ? '‘' : '’';
    else out += opening ? '“' : '”';
  }
  return out;
}

/** (k) — smart quotes over prose text nodes, skipping code/pre/.cit. Astro's
    own `smartypants` is left off (astro.config.mjs) because it runs before
    this pipeline sees the tree and has no way to exempt those nodes — it
    would just as happily curl a citation's page-range quote or an IAST
    apostrophe used for a Vedic elision (avagraha). */
function smartTypography(node: Node) {
  if (isTypographyExempt(node)) return;
  const kids: Node[] = node.children ?? [];
  for (const k of kids) {
    if (k.type === 'text') {
      if (k.value.includes("'") || k.value.includes('"')) k.value = curlQuotes(k.value);
    } else if (isEl(k)) {
      smartTypography(k);
    }
  }
}

/* ------------------------------------------------------- plain spellings -- *
 * (l) — the popular spelling is what the page *ships*; the scholarly one
 * rides along in an attribute.
 *
 * Plain English is the default for a first-time visitor (D-plain-default,
 * BRIEF v4 §4 W3e), but until now it was produced by a DOM walk in the
 * browser: a reader with JavaScript off — or on a page whose script had not
 * run yet — met Kṛṣṇa, Śiva and Viṣṇu, i.e. exactly the audience the decision
 * was made for (L2-report §7, FIXLIST L2b-3). So the conversion moves to
 * build time and runs the *other* way round: every run `plainSpelling()`
 * would rewrite becomes
 *
 *     <span data-iast="Kṛṣṇa">Krishna</span>
 *
 * — plain as content, scholarly in the attribute. With no JavaScript that is
 * the finished page. With JavaScript, `plain-english-client.ts` converts *up*
 * (content ⇄ attribute) for a reader who asked for the scholarly text, and
 * `Base.astro` stamps `data-plain` server-side so the apparatus is quiet from
 * the first byte rather than from the first script.
 *
 * `plainSpans()` in `lib/plain-english.ts` decides what to wrap, so the build
 * and the client cannot disagree about a single word: it is the same module,
 * the same dictionary and the same rules that the runtime converter uses.
 */
const PLAIN_SKIP_TAGS = new Set(['code', 'pre', 'script', 'style']);

/** Mirrors `plain-english-client.ts`'s SKIP_SELECTOR: code, Devanagari, apparatus. */
function isPlainExempt(node: Node): boolean {
  if (!isEl(node)) return false;
  if (PLAIN_SKIP_TAGS.has(node.tagName)) return true;
  const props = node.properties ?? {};
  if (props.dataPlainSkip !== undefined || props['data-plain-skip'] !== undefined) return true;
  if (props.lang === 'hi') return true;
  const cls = Array.isArray(props.className) ? props.className : [];
  return cls.includes('dv') || cls.includes('cit') || cls.includes('tag');
}

function plainSpellings(node: Node): void {
  if (isPlainExempt(node)) return;
  const kids: Node[] = node.children ?? [];
  if (!kids.length) return;
  const out: Node[] = [];
  let touched = false;
  for (const k of kids) {
    if (k.type === 'text') {
      const spans = plainSpans(k.value);
      if (!spans.length) {
        out.push(k);
        continue;
      }
      touched = true;
      let at = 0;
      for (const s of spans) {
        if (s.start > at) out.push({ type: 'text', value: k.value.slice(at, s.start) });
        out.push(el('span', { 'data-iast': s.iast }, [{ type: 'text', value: s.plain }]));
        at = s.end;
      }
      if (at < k.value.length) out.push({ type: 'text', value: k.value.slice(at) });
    } else {
      if (isEl(k)) plainSpellings(k);
      out.push(k);
    }
  }
  if (touched) node.children = out;
}

export default function rehypeCorpus() {
  return function transformer(tree: Node) {
    extractSources(tree);
    unwrapRawPathLinks(tree);
    stripFilingNotes(tree);

    // (g)(h)(i) — entries
    visit(tree, 'element', (node: Node) => {
      if (node.tagName !== 'li') return;
      const host = leadHost(node);
      if (!host) return;
      const kids = (host.children ?? []).filter((c: Node) => !isWs(c));
      const first = kids[0];
      if (isEl(first, 'strong')) {
        const next = kids[1];
        const isDirect = !!(next && next.type === 'text' && LEAD_DASH.test(next.value));
        const glossMatch = !isDirect && next && next.type === 'text' ? GLOSS_DASH.exec(next.value) : null;
        if (isDirect || glossMatch) {
          addClass(first, 'lead');
          addClass(node, 'entry');
          if (glossMatch) {
            // Split "(gloss) — text" into a leading-whitespace text node, a
            // muted `.gloss` span for the parenthetical, and the remainder
            // (the dash and the entry's own text) unchanged.
            const [, before, paren] = glossMatch;
            const value = next.value as string;
            const replacement: Node[] = [];
            if (before) replacement.push({ type: 'text', value: before });
            replacement.push(el('span', { className: ['gloss'] }, [{ type: 'text', value: paren }]));
            const after = promoteDash(value.slice(before.length + paren.length));
            if (after) replacement.push({ type: 'text', value: after });
            const at = host.children.indexOf(next);
            if (at !== -1) host.children.splice(at, 1, ...replacement);
          } else if (isDirect) {
            next.value = promoteDash(next.value);
          }
          markCitation(host);
          foldTellings(node);
        }
      }
    });

    markTags(tree);
    smartTypography(tree);
    plainSpellings(tree);
  };
}
