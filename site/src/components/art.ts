/**
 * art.ts — "which picture stands over this page?"
 *
 * The mandate (EXPERIENCE-BRIEF v3 §2) is art on *every* page. Two kinds:
 *
 *   hero  — the page has a film of its own. Its first hero still runs
 *           full-bleed above the title and carries the play affordance.
 *   plate — the page has no film. A curated still stands for its age (a
 *           period plate) or its section (a section plate), darkened,
 *           slightly blurred and tinted with the period hue, so the picture
 *           is atmosphere rather than illustration: it must never claim to
 *           depict the page it heads. A plate is therefore anonymous — no
 *           alt text, no credit line — because every name it could carry
 *           would be the name of a different story.
 *
 * The curation lives in `src/data/art-plates.json` — a small committed map
 * of period/section slug → {film, still, alt}. This module only resolves it
 * against the media manifest; it makes no editorial choices of its own.
 *
 * Resolution order, most specific first:
 *   1. a film for this exact route                        → hero
 *   2. an index page             → its section's plate
 *   3. a leaf with a cosmic address → that period's plate
 *   4. its section's plate
 *   5. the root plate            (nothing is ever left bare)
 */
import plates from '../data/art-plates.json' with { type: 'json' };
import { hubPlate } from '../lib/chapters.ts';
import { type Film, cardPoster, filmsForRoute, getFilm } from '../lib/films.ts';
import type { GraphNode } from '../lib/graph.ts';
import { splitTitle } from '../lib/routes.ts';

interface PlateSpec {
  film: string;
  still: number;
  alt: string;
}

const PERIOD_PLATES = plates.periods as Record<string, PlateSpec>;
const SECTION_PLATES = plates.sections as Record<string, PlateSpec>;

export interface PageArt {
  kind: 'hero' | 'plate';
  /** Why this picture is here — 'film' | 'period' | 'section' | 'root'. */
  reason: 'film' | 'period' | 'section' | 'root';
  src: string;
  srcset: string | null;
  width: number;
  height: number;
  lqip: string | null;
  alt: string;
  /** Present on a hero: the film the still is from, so the play mark can link. */
  film: Film | null;
  /** Present on a hero only: the page's own film, named under the picture. */
  creditTitle: string | null;
  creditRoute: string | null;
}

function fromSpec(spec: PlateSpec | undefined, reason: PageArt['reason']): PageArt | null {
  if (!spec) return null;
  const film = getFilm(spec.film);
  const still = film?.stills[spec.still];
  if (!film || !still) return null;
  return {
    kind: 'plate',
    reason,
    src: still.sizes[1600],
    srcset: `${still.sizes[400]} 400w, ${still.sizes[800]} 800w, ${still.sizes[1600]} 1600w`,
    width: still.width,
    height: still.height,
    lqip: still.lqip,
    /* A borrowed plate is decoration, not illustration: it depicts another
       story, so it carries no alternative text. A screen reader on the
       Rāmāyaṇa's own page must not hear "the pillar splits and Narasiṃha
       bursts from the stone" announced as this page's lead image. */
    alt: '',
    film: null,
    /* And it carries no name either. Trimming the subtitle was not enough —
       "Vāmana & Bali" is still a whole story, set in the position and
       typography of a caption, over a page about Hanumān. The blur is the
       whole statement: atmosphere, unattributed. Only a page's *own* film
       earns a name under the picture (see `heroForFilm`). */
    creditTitle: null,
    creditRoute: null,
  };
}

/** The hero for a page that has its own film. */
export function heroForFilm(film: Film): PageArt | null {
  const poster = cardPoster(film);
  if (!poster) return null;
  const still = film.stills[0];
  return {
    kind: 'hero',
    reason: 'film',
    /* The hero is the widest picture on the page — ask for the 1600 tier
       directly rather than letting the 800 default stand as `src`. */
    src: still ? still.sizes[1600] : poster.src,
    srcset: poster.srcset,
    width: poster.width,
    height: poster.height,
    lqip: poster.lqip,
    alt: still?.alt ?? '',
    film,
    /* A hero *is* of this page, so it can say whose it is. One rule with no
       exceptions: every credit on the site names the page's own film, and
       nothing else is ever named. */
    creditTitle: splitTitle(film.title.en)[0],
    creditRoute: film.route,
  };
}

/** The plate for a bare period slug (the clock's own period pages). */
export function plateForPeriod(period: string | null | undefined): PageArt | null {
  if (!period) return null;
  return fromSpec(PERIOD_PLATES[period], 'period');
}

/** The plate for a bare section slug (a films index, a bespoke page). */
export function plateForSection(sectionSlug: string | null | undefined): PageArt | null {
  if (!sectionSlug) return null;
  return fromSpec(SECTION_PLATES[sectionSlug], 'section');
}

/**
 * The plate for a Stories-hub tile (W4). Curated in `art-plates.json`'s `hub`
 * and resolved through the media manifest, so a hub tile can wear a picture
 * chosen *for that door* rather than borrowing its section's. Falls back to
 * the section plate, so a tile is never bare.
 */
export function plateForHub(
  hubId: string | null | undefined,
  sectionSlug?: string | null,
): PageArt | null {
  const p = hubId ? hubPlate(hubId) : null;
  if (p) {
    return {
      kind: 'plate',
      reason: 'section',
      src: p.src,
      srcset: p.srcset,
      width: p.width,
      height: p.height,
      lqip: p.lqip,
      /* Decorative, like every other plate: the tile's own title is the label. */
      alt: '',
      film: null,
      creditTitle: null,
      creditRoute: null,
    };
  }
  return plateForSection(sectionSlug);
}

/** The last resort, so no page is ever bare. */
export function rootPlate(): PageArt | null {
  return fromSpec(SECTION_PLATES['(root)'], 'root');
}

/**
 * The picture for a corpus page. `film` is passed in rather than looked up
 * again so Article.astro and this module cannot disagree about which film
 * (if any) a route owns.
 */
export function artForNode(node: GraphNode, film?: Film): PageArt | null {
  const own = film ?? (node.isIndex ? undefined : filmsForRoute(node.route)[0]);
  if (own) {
    const hero = heroForFilm(own);
    if (hero) return hero;
  }
  /* An index is a doorway into a section, so it wears the section's colours;
     a leaf is an event in time, so it wears its age's. */
  const bySection = plateForSection(node.sectionSlug);
  if (node.isIndex && bySection) return bySection;
  return plateForPeriod(node.cosmicAddress) ?? bySection ?? rootPlate();
}
