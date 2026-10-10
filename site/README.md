# The Hindu Timeline website

A static Astro website for the research corpus in the parent directory. It includes
source citations, the cosmic timeline, film pages, search, and the terrain and
cosmos views. Research stays in the numbered corpus sections; the website reads
it in place.

## Run locally

Use Node 22.18 or newer and npm.

```sh
npm ci
npm run dev
npm run build
npm run check-dist
```

`npm run build` generates navigation, events, optional artwork and identity images,
then builds static pages and the Pagefind search index. The output is `dist/`.
`npm run check` checks Astro/TypeScript; `npm test` runs the existing tests.

## Optional private artwork

The site builds without any private files. Film posters fall back to YouTube;
local stills and interactive editions appear only when their assets are supplied.
No sibling studio checkout is needed.

To supply artwork, set both variables before building:

```sh
export HT_ASSET_ROOT=/path/to/private-assets
export HT_ASSET_CATALOG=/path/to/private-catalog.json
npm run build
node scripts/media.mjs --check
```

The catalog is an explicit selection of files intended for this website. Paths
are relative to `HT_ASSET_ROOT`; absolute paths and escapes outside that root are
rejected. Keep the catalog and production assets outside this public repository.

```json
{
  "version": 1,
  "films": {
    "film-slug": {
      "thumbnail": "art/film-slug/thumbnail.jpg",
      "stillsRoot": "art/film-slug/stills",
      "vector": "interactive-slug"
    }
  },
  "plates": { "chapter-art-id": "art/chapter-art.jpg" },
  "vectors": { "interactive-slug": "players/interactive-slug" }
}
```

The `films` keys match `src/data/featured.json`; still filenames come from its
`stills` array. An optional `stills` object on a catalog film maps individual
filenames to relative paths, for example when selected website derivatives are
available instead of archived originals. Keep that provenance in private records.
A plate identifier matches `art.asset` in `chapters.json`.
Interactive export directories contain a self-contained `index.html` and an
optional `poster.png`. Only the explicitly catalogued exports are copied.

`--check` reports missing inputs without generating media. Missing images are
omitted during a normal build; unavailable interactive editions never get a
watch link. An asset-free build clears old generated media so it cannot silently
reuse a previous private catalog's outputs.

## Content and boundaries

- `src/data/featured.json`: public film titles, descriptions, published URLs,
  artwork descriptions and links to research. No private source paths.
- `src/data/chapters.json`: public chapter order, citations and artwork identifiers.
- `src/lib/routes.ts`: public corpus allowlist and corpus-path-to-URL mapping.
- `scripts/graph.mjs` and `scripts/events.mjs`: derived navigation and timeline.
- `scripts/media.mjs`: the entire optional artwork build.
- `src/generated/` and `public/media/`: ignored, disposable build outputs.

Only the eleven named research sections and the named root apparatus pages enter
the content collection. Episode scripts, continuity bibles, generation records,
credentials and asset catalogs belong in private production storage. Do not add
them to research directories.

To add a public film, add its editorial entry to `featured.json`, supply its
optional artwork through the private catalog, and run the build and checks.
The existing interactive edition sources are preserved privately; this repository
no longer contains a second animation engine.

## Verification and deployment

```sh
npm run generate
npm test
npm run check
npm run build
npm run check-dist
```

From the repository root, `python3 tools/repo_tools.py linkcheck` checks research
links and `python3 tools/repo_tools.py timeline-check` verifies timeline counts.

Set `HT_SITE_URL` to the site's public origin before deployment. The default
`https://example.invalid` is for local builds. Publish only `dist/` to a static
host with directory-style URLs. A build with artwork publishes those selected
derivatives, so review the supplied catalog before deploying.

The optional `/lab/cosmos/` view uses WebGL with an illustrated fallback.
`/lab/web/` is an unpromoted prototype and retains a continuous animation loop.
Neither view is changed by the repository cleanup.
