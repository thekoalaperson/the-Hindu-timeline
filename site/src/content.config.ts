import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { PUBLIC_CORPUS_PATTERNS } from './lib/routes.ts';

/**
 * The whole mythology corpus, loaded straight out of the repo root one level up.
 *
 * There is no front matter anywhere in the corpus (R1 §2), so this collection
 * carries no schema: every derived field (title, dek, section, order, backlinks,
 * cosmic address, event counts) lives in `src/generated/graph.json`, written by
 * `scripts/graph.mjs` at prebuild. Entry ids are repo-relative paths, e.g.
 * `04-deep-dives/mahabharata/01-adi-parva.md`, so they key straight into it.
 *
 * Only named root pages and the eleven research sections are included.
 * Excluded: private production, tooling/session dirs,
 * `timeline/` (rendered from `data/events.jsonl` as the clock, not as pages),
 * and the `bhagavad-gita.md` redirect stub whose URL the real directory wins.
 */
const corpus = defineCollection({
  loader: glob({
    base: '../',
    pattern: PUBLIC_CORPUS_PATTERNS,
    // The entry id IS the repo-relative path.
    generateId: ({ entry }) => entry,
    // Metadata comes from graph.json; the raw markdown would only bloat the store.
    retainBody: false,
  }),
});

export const collections = { corpus };
