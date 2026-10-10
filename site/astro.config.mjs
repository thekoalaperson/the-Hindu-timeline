// @ts-check
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeSlug from 'rehype-slug';
import rehypeCorpus from './src/lib/rehype-corpus.ts';
import remarkCorpus from './src/lib/remark-corpus.ts';

/** The corpus lives one level above the Astro project. */
const repoRoot = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');

export default defineConfig({
  site: process.env.HT_SITE_URL ?? 'https://example.invalid',
  output: 'static',
  compressHTML: true,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  // Three corpus directories hold files but no README.md, so they have no index
  // page of their own; links written at them land on the nearest one that does.
  // (`04-deep-dives/bhagavad-gita.md` needs no redirect: the stub is excluded
  // from the collection and every link to it already resolves to the folder.)
  redirects: {
    '/texts/vedas/brahmanas/': '/texts/vedas/',
    '/stories/stotras/': '/stories/',
  },
  integrations: [react()],
  markdown: {
    syntaxHighlight: false,
    processor: unified({
      gfm: true,
      // Preserve the corpus typography and existing remark/rehype transforms.
      smartypants: false,
      remarkPlugins: [[remarkCorpus, { repoRoot }]],
      // Explicit heading IDs preserve existing research cross-references.
      rehypePlugins: [rehypeSlug, rehypeCorpus],
    }),
  },
  vite: {
    build: {
      // The corpus is 899 files of long-form prose; give rollup some room.
      chunkSizeWarningLimit: 2000,
    },
  },
});
