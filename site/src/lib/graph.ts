/**
 * graph.ts — typed access to the prebuilt corpus graph.
 *
 * `src/generated/graph.json` is written by `scripts/graph.mjs` before every
 * dev/build run. Keys are repo-relative paths, which are also the content
 * collection's entry ids, so `graph.nodes[entry.id]` always resolves.
 */
import graphData from '../generated/graph.json' with { type: 'json' };
import { GITHUB_BLOB, PERIOD_LABEL } from './routes.ts';

export interface GraphNode {
  path: string;
  route: string;
  title: string;
  dek: string;
  section: string;
  sectionSlug: string | null;
  sectionLabel: string;
  isIndex: boolean;
  dir: string;
  parentRoute: string | null;
  parentPath: string | null;
  subdir: string | null;
  order: number;
  prev: string | null;
  next: string | null;
  children: string[];
  backlinks: { routes: string[]; total: number };
  eventCount: number;
  periods: Record<string, number>;
  cosmicAddress: string | null;
  cosmicAddressSource?: 'explicit' | 'events' | 'inherited';
  wordCount: number;
  readingMinutes: number;
}

export interface GraphSection {
  dir: string;
  slug: string;
  label: string;
  route: string;
  title: string;
  dek: string;
  count: number;
}

export interface GraphStats {
  files: number;
  contentFiles: number;
  words: number;
  events: number;
  sections: number;
  periods: number;
  internalLinks: number;
  unresolvedLinks: number;
  generatedAt: string;
}

interface Graph {
  stats: GraphStats;
  sections: GraphSection[];
  byRoute: Record<string, string>;
  nodes: Record<string, GraphNode>;
}

const graph = graphData as unknown as Graph;

export const nodes = graph.nodes;
export const byRoute = graph.byRoute;
export const sections = graph.sections;
export const stats = graph.stats;

export function nodeFor(id: string): GraphNode | undefined {
  return nodes[id];
}

export function nodeForRoute(route: string): GraphNode | undefined {
  const p = byRoute[route];
  return p ? nodes[p] : undefined;
}

export interface Crumb {
  title: string;
  route: string;
  isSection?: boolean;
}

/** Section › parent(s) › current, oldest first. Excludes the node itself. */
export function crumbsFor(node: GraphNode): Crumb[] {
  const out: Crumb[] = [];
  let cur: GraphNode | undefined = node.parentPath ? nodes[node.parentPath] : undefined;
  const guard = new Set<string>();
  while (cur && !guard.has(cur.path)) {
    guard.add(cur.path);
    const isSection = cur.dir === cur.section && cur.isIndex;
    // The section crumb reads as the section itself ("Stories", "The
    // Texts"), not whatever the section README's own H1 happens to say —
    // those are things like "Deep Dives — Index", written for someone
    // already inside the section, not for a trail pointing at it.
    out.unshift({ title: isSection ? cur.sectionLabel : cur.title, route: cur.route, isSection });
    cur = cur.parentPath ? nodes[cur.parentPath] : undefined;
  }
  return out;
}

export function periodLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return PERIOD_LABEL[slug] ?? slug;
}

export function githubUrl(repoRelPath: string): string {
  return GITHUB_BLOB + repoRelPath;
}

/** Children grouped for a section index: top-level items, then subdirectories. */
export function groupedChildren(node: GraphNode): {
  top: GraphNode[];
  groups: { name: string; items: GraphNode[] }[];
} {
  const top: GraphNode[] = [];
  const groups = new Map<string, GraphNode[]>();
  for (const childPath of node.children) {
    const child = nodes[childPath];
    if (!child) continue;
    if (child.subdir) {
      const list = groups.get(child.subdir) ?? [];
      list.push(child);
      groups.set(child.subdir, list);
    } else {
      top.push(child);
    }
  }
  return {
    top,
    groups: [...groups.entries()].map(([name, items]) => ({ name, items })),
  };
}
