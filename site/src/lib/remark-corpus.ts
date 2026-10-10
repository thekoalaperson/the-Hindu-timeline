/**
 * remark-corpus — mdast-level transforms for the corpus markdown.
 *
 *  (a) rewrite every relative link to its site route (fragments preserved);
 *      links into the tooling layer (`data/*.jsonl`, `tools/*.py`) and anything
 *      that has no page go to GitHub instead, so no dead internal href ships.
 *  (b) drop the H1 (the layout renders the title)
 *  (c) mark the leading blockquote as `.lede`
 *  (e) drop the auto-generated `## 📑 Full Contents` block from section READMEs
 *
 * Driven by `file.path`, which Astro sets to the source file for every entry.
 */
import path from 'node:path';
import { visit } from 'unist-util-visit';
import { GITHUB_BLOB, resolveLink } from './routes.ts';

const FULL_CONTENTS = 'Full Contents';

function plainText(node: any): string {
  let out = '';
  const walk = (n: any) => {
    if (!n) return;
    if (typeof n.value === 'string' && (n.type === 'text' || n.type === 'inlineCode')) out += n.value;
    if (Array.isArray(n.children)) n.children.forEach(walk);
  };
  walk(node);
  return out.trim();
}

export interface RemarkCorpusOptions {
  /** Absolute path of the corpus repo root (the parent of `site/`). */
  repoRoot: string;
}

export default function remarkCorpus(options: RemarkCorpusOptions) {
  const repoRoot = options?.repoRoot ?? path.resolve(process.cwd(), '..');

  return function transformer(tree: any, file: any) {
    const abs: string | undefined = file?.path ? String(file.path) : undefined;
    const rel = abs ? path.relative(repoRoot, abs).split(path.sep).join('/') : '';

    // (a) links -------------------------------------------------------------
    if (rel && !rel.startsWith('..')) {
      visit(tree, ['link', 'definition'], (node: any) => {
        const resolved = resolveLink(rel, node.url ?? '');
        node.data = node.data ?? {};
        const props = (node.data.hProperties = node.data.hProperties ?? {});
        if (resolved.kind === 'internal') {
          node.url = resolved.href;
          props.className = ['xref'];
          props['data-route'] = resolved.href.split('#')[0];
        } else if (resolved.kind === 'external') {
          node.url = resolved.href;
          props.className = ['ext'];
          props.rel = 'noopener';
        } else if (resolved.kind === 'unresolved') {
          // Nothing on the site answers this path — point at the repo instead.
          const target = (node.url ?? '').replace(/^\.\//, '');
          node.url = GITHUB_BLOB + target.replace(/^(\.\.\/)+/, '');
          props.className = ['ext'];
          props.rel = 'noopener';
        }
      });
    }

    const children: any[] = tree.children ?? [];

    // (e) strip the auto-index block ---------------------------------------
    const fcIndex = children.findIndex(
      (n) => n.type === 'heading' && n.depth === 2 && plainText(n).endsWith(FULL_CONTENTS),
    );
    if (fcIndex !== -1) {
      let end = children.length;
      for (let i = fcIndex + 1; i < children.length; i++) {
        if (children[i].type === 'heading' && children[i].depth <= 2) {
          end = i;
          break;
        }
      }
      children.splice(fcIndex, end - fcIndex);
      // A lone `---` thematic break usually precedes the block; drop a trailing one.
      while (children.length && children[children.length - 1].type === 'thematicBreak') children.pop();
    }

    // (b) drop the H1 -------------------------------------------------------
    const h1 = children.findIndex((n) => n.type === 'heading' && n.depth === 1);
    if (h1 !== -1) children.splice(h1, 1);

    // (c) the leading blockquote is the lede --------------------------------
    for (const node of children) {
      if (node.type === 'heading' || node.type === 'thematicBreak') break;
      if (node.type === 'blockquote') {
        node.data = node.data ?? {};
        node.data.hProperties = { ...(node.data.hProperties ?? {}), className: ['lede'] };
        break;
      }
    }
  };
}
