/**
 * road.ts — the runtime for the home, "Time as terrain".
 *
 * Design rules this file keeps to, because the owner's complaint about the old
 * build was that touching it felt clunky:
 *
 *  1. **The road is a native horizontal scroller.** Not a gesture engine. iOS
 *     and Android give us their own momentum, rubber-band and fling curves for
 *     free, which is the only way to be sure the drag feels native. We never
 *     call `preventDefault` on a touch that is scrolling.
 *  2. **One rAF loop, transforms only.** Per frame we write `translate3d` to
 *     five elements and `opacity` to five more. No layout is read except
 *     `scrollLeft` (a cheap, non-invalidating read on a scroller we do not
 *     mutate) and it is read once.
 *  3. **The parallax lanes live inside the scroller.** A lane is laid out at
 *     `x × factor` and pulled back by `scrollLeft × (1 − factor)`, so it ends
 *     up travelling at `factor` speed while still being a child of the element
 *     the browser is scrolling — which means a drag that starts on a distant
 *     waypoint scrolls the road exactly like a drag on empty ground.
 *  4. **Each age is a cross-fade pair.** Sky, both hill depths, the ground and
 *     the verge each exist twice; even-numbered ages own slot A and odd ones
 *     slot B, so a transition is always "fade the other slot in". Nothing is
 *     re-rasterised mid-scroll except at a gate.
 *
 * Four things were added when the prototype became the home page:
 *
 *  5. **The road is virtualised.** Every place carries its world x; only the
 *     ones whose *screen* position falls inside ±2 screens are in the document.
 *     Places outside it are detached (not hidden — detached, so they cost no
 *     nodes, no style recalc and no image). Same trick for the overlays: the
 *     atlas, the index and the menu are server-rendered for a browser with no
 *     JavaScript, then lifted out of the document at boot and put back when
 *     they are opened.
 *  6. **A story lands on a peek card first.** Tapping a stele FLIPs that
 *     stele's own picture into a small card at the foot of the screen — the
 *     road stays visible above it. The card expands into the full panel, and
 *     closing reverses the same flight back into the stele you touched.
 *  7. **A finder.** Diacritic-insensitive, over labels, titles, sections and
 *     the actors named in the corpus events; choosing a result travels there
 *     and opens it.
 *  8. **It remembers where you were**, and the Devanagari webfont is not
 *     fetched until you have touched something.
 */

/* ------------------------------------------------------------------ types - */

interface RegionData {
  slug: string;
  gate: string;
  gateHi: string | null;
  short: string;
  x0: number;
  width: number;
  /** Where this age's gate stands, in road px — the ribbon chip's real target. */
  gateX: number;
  accent: string;
  ink: string;
  inkSoft: string;
  sky: [string, string, string];
  glow: string;
  glowAt: string;
  ground: string;
  hillNear: string;
  road: string;
  tileFar: string;
  tileNear: string;
  tileVerge: string;
  motes: string;
  moteKind: string;
  light: boolean;
}

interface WorldData {
  width: number;
  skyX: number[];
  nowX: number;
  /** Where the road starts dissolving, and over how much of it. */
  nightX: number;
  finale: number;
  font: string;
  regions: RegionData[];
}

interface PanelImg {
  src: string;
  srcset: string | null;
  w: number;
  h: number;
}

interface PanelRow {
  href: string;
  label: string;
  img: string | null;
  note: string | null;
}

interface Panel {
  id: string;
  /** 'f' film · 'c' chapter · 'g' event-group · 'e' era · 'm' manvantara/Night. */
  k: 'f' | 'c' | 'g' | 'e' | 'm';
  wx: number;
  ri: number;
  meta: string;
  title: string;
  hi: string | null;
  sum: string;
  place: string | null;
  img: PanelImg | null;
  cap: string | null;
  vid: string | null;
  soon: 0 | 1;
  links: { href: string; label: string; primary?: 1 }[];
  /** A chapter's stories, in order, with a thumbnail where one is filmed. */
  rows: PanelRow[];
  near: string[];
  l: string;
}

const FAR_FACTOR = 0.58;
const SKY_FACTOR = 0.3;
const HILL_FAR_FACTOR = 0.24;
const HILL_NEAR_FACTOR = 0.46;
const VERGE_FACTOR = 1.32;
const TILE_W = 640;
const VERGE_W = 420;
/** How much of the tail of an age is spent turning into the next one. */
const FADE_PX = 620;
/** The FLIP: short enough to read as one movement, long enough to be seen. */
const FLIP_MS = 320;
const FLIP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** The shared "where was I" record — story pages read the same key. */
const ROAD_KEY = 'ht:road';
/** The key the first build wrote. Read once, for anyone coming back. */
const LEGACY_POS_KEY = 'terrain.pos.v2';
const HINT_KEY = 'terrain.hint.v1';

const root = document.querySelector<HTMLElement>('.terrain');
const dataEl = document.getElementById('tr-world');
if (root && dataEl?.textContent) {
  boot(root, JSON.parse(dataEl.textContent) as WorldData);
}

function boot(scene: HTMLElement, world: WorldData) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('tr-js');

  const PANELS: Record<string, Panel> = readJson('tr-panels') ?? {};
  const FIND: [string, string, string][] = readJson('tr-find') ?? [];

  const road = scene.querySelector<HTMLElement>('.tr-road')!;
  const laneFar = scene.querySelector<HTMLElement>('.tr-lane-far')!;
  const laneSky = scene.querySelector<HTMLElement>('.tr-lane-sky')!;
  const laneNear = scene.querySelector<HTMLElement>('.tr-lane-near')!;
  const wrapFar = scene.querySelector<HTMLElement>('[data-wrap="far"]')!;
  const wrapNear = scene.querySelector<HTMLElement>('[data-wrap="near"]')!;
  const wrapVerge = scene.querySelector<HTMLElement>('[data-wrap="verge"]')!;
  const live = scene.querySelector<HTMLElement>('.tr-live')!;

  const pair = (sel: string) => Array.from(scene.querySelectorAll<HTMLElement>(sel));
  const skies = pair('.tr-sky');
  const hillsFar = pair('.tr-hill-far');
  const hillsNear = pair('.tr-hill-near');
  const grounds = pair('.tr-ground');
  const verges = pair('.tr-verge');

  const hereEl = scene.querySelector<HTMLElement>('.tr-here')!;
  const hereSub = scene.querySelector<HTMLElement>('.tr-here-sub')!;
  const thumb = scene.querySelector<HTMLElement>('.tr-thumb')!;
  const track = scene.querySelector<HTMLElement>('.tr-track')!;
  const segs = Array.from(scene.querySelectorAll<HTMLElement>('.tr-seg'));

  const regions = world.regions;
  const last = regions.length - 1;

  /* ------------------------------------------------ the intro's lifecycle - */
  /**
   * The intro card is the *first* thing on this page and must be the *first*
   * thing to go. The audit (R6 P0) found it painting through search, the menu,
   * the atlas and deep road positions at low opacity — a ghost over every
   * other screen state. So: one function, assigned by the intro block below
   * and called by everything that supersedes it (any overlay, any panel, the
   * scale view, or the road itself moving half a screen under a human thumb).
   * It sets `hidden`, which `.tr-hint[hidden]{display:none!important}` makes
   * a real unmount — not an opacity the compositor keeps painting.
   *
   * `let`, not a hoisted declaration: `frame()` starts running long before the
   * intro block executes, and a TDZ throw inside the rAF loop would take the
   * whole road down.
   */
  let retireIntro: () => void = () => {};
  /** Where the road stood when the entrance finished; the "moved" test is from here. */
  let introBase = 0;
  /** The entrance glide drives `scrollLeft` itself; it is not a human moving. */
  let introArmed = false;

  /* ------------------------------------------- what "where I was" means - */
  /**
   * `ht:road` is the record of where a *person* stood. Two things have to be
   * true of a position before it is worth writing down, and neither was being
   * checked:
   *
   *   `stable` — the road has finished assembling itself. A scroller handed a
   *              `scrollLeft` before it has its full width silently clamps to
   *              0, and the unload save then wrote that 0 over a real record.
   *              That is the whole of the bug where Continue offered *Before
   *              Time* to a traveller who left in Dvāpara: nothing about the
   *              read was wrong, the write had already destroyed the answer.
   *   `owned`  — a human put it there. The entrance glide moves the road 345
   *              px on its own; that is the page introducing itself, not a
   *              journey, and it has no business becoming "continue".
   *
   * Both are one-way. Between them, boot, the glide and a late reflow can no
   * longer write, and a visitor who never touched the road is not offered a
   * place they have not been.
   */
  let stable = false;
  let owned = false;
  /** Where boot asked the road to stand — re-applied once layout is real. */
  let wantX = 0;

  /* ------------------------------------------------ material per age slot - */

  const held: (number | null)[] = [null, null];

  function dress(slot: 0 | 1, i: number) {
    if (held[slot] === i) return;
    held[slot] = i;
    const r = regions[i];
    if (!r) return;
    const sky = skies[slot];
    if (sky) {
      sky.style.setProperty('--s0', r.sky[0]);
      sky.style.setProperty('--s1', r.sky[1]);
      sky.style.setProperty('--s2', r.sky[2]);
      sky.style.setProperty('--glow', r.glow);
      sky.style.setProperty('--glow-at', r.glowAt);
    }
    const hf = hillsFar[slot];
    if (hf) hf.style.backgroundImage = r.tileFar;
    const hn = hillsNear[slot];
    if (hn) hn.style.backgroundImage = r.tileNear;
    const g = grounds[slot];
    if (g) {
      g.style.setProperty('--g-top', r.hillNear);
      g.style.setProperty('--g-mid', r.ground);
      g.style.setProperty('--g-bot', r.ground);
      g.style.setProperty('--road', r.road);
    }
    const v = verges[slot];
    if (v) v.style.backgroundImage = r.tileVerge;
  }

  function setLayer(list: HTMLElement[], slot: number, op: number, z: number) {
    const el = list[slot];
    if (!el) return;
    el.style.opacity = String(op);
    el.style.zIndex = String(z);
  }

  /* ------------------------------------------------------- where are we - */

  let current = -1;

  function regionAt(x: number): number {
    for (let i = last; i >= 0; i--) {
      const r = regions[i];
      if (r && x >= r.x0) return i;
    }
    return 0;
  }

  /**
   * Entering an age re-lights the *whole* chrome, not just the ground: the
   * finder's ring, the ribbon's thumb, the peek card's rule, the panel's
   * buttons and the "nearby" chips all read `--accent` and `--ink`. (Grafted
   * from the cosmos prototype, which relit its sky, fog and chrome together.)
   */
  function enter(i: number) {
    if (i === current) return;
    current = i;
    const r = regions[i];
    if (!r) return;
    scene.style.setProperty('--ink', r.ink);
    scene.style.setProperty('--ink-soft', r.inkSoft);
    scene.style.setProperty('--accent', r.accent);
    scene.style.setProperty('--age-ground', r.ground);
    hereEl.textContent = r.gate;
    hereSub.textContent = r.gateHi ?? '';
    hereEl.setAttribute('lang', 'en');
    for (const s of segs) {
      s.setAttribute('aria-current', s.dataset.i === String(i) ? 'true' : 'false');
    }
    dress((i % 2) as 0 | 1, i);
    dress(((i + 1) % 2) as 0 | 1, Math.min(i + 1, last));
    scene.dataset.region = r.slug;
    scene.dataset.light = r.light ? '1' : '0';
    if (motes) motes.recolour(r);
  }

  /* -------------------------------------------------------- virtualisation */
  /**
   * Every place is parked in this table and lives in the document only while it
   * is within ±2 screens. `f` is the lane's parallax factor, so the screen
   * position of a place is `f × (wx − scrollLeft)` and one window rule covers
   * all three lanes exactly.
   */
  interface Parked {
    el: HTMLElement;
    parent: HTMLElement;
    wx: number;
    f: number;
    on: boolean;
  }
  const parked: Parked[] = [];

  function park(sel: string, parent: HTMLElement, f: number) {
    for (const el of Array.from(parent.querySelectorAll<HTMLElement>(sel))) {
      // Only ±2 screens of road are ever mounted, so tabbing through the road
      // itself would be a lottery. The hidden hotspot list is the keyboard path
      // and it holds all 147 places in road order; these stay clickable.
      el.tabIndex = -1;
      parked.push({ el, parent, wx: Number(el.dataset.wx ?? 0), f, on: true });
    }
  }
  park('.tr-stele, .tr-gate, .tr-era, .tr-manu, .tr-night', laneNear, 1);
  park('.tr-lm', laneFar, FAR_FACTOR);
  park('.tr-sky-place', laneSky, SKY_FACTOR);
  parked.sort((a, b) => a.wx - b.wx);
  // Empty the road in one synchronous pass, so the first `sweep()` is the sole
  // authority on what is mounted and every place it mounts also gets its
  // picture. (Leaving them marked `on` meant the boot sweep skipped them, and
  // the whole first screen beyond the eagerly-served ones stayed pictureless.)
  for (const p of parked) {
    p.el.remove();
    p.on = false;
  }

  const byPlace = new Map<string, Parked>();
  for (const p of parked) {
    const id = p.el.dataset.place;
    if (id) byPlace.set(id, p);
  }

  /** Give a mounted image its real source, once. */
  function hydrate(el: HTMLElement) {
    for (const img of Array.from(el.querySelectorAll<HTMLImageElement>('img[data-src]'))) {
      const set = img.dataset.srcset;
      if (set) img.srcset = set;
      img.src = img.dataset.src!;
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
    }
  }

  /**
   * Mounting an element is cheap; giving it a picture is not — the fetch and
   * the decode land in whichever frame they land in, and during a 6,000 px
   * fling that was the difference between a 17 ms frame and a 50 ms one. So
   * the two are separated: the node goes in during the sweep, the picture is
   * handed over a few at a time whenever the main thread is idle.
   */
  const thirsty = new Set<HTMLElement>();

  /**
   * Drained from the rAF loop, a couple at a time — *not* from
   * `requestIdleCallback`, which never fires while the loop itself is running
   * every frame (measured: thirteen steles were still pictureless five seconds
   * after load on a 1280 px viewport).
   */
  function pour(n: number) {
    for (const el of thirsty) {
      thirsty.delete(el);
      hydrate(el);
      if (--n <= 0) break;
    }
  }

  function thirstFor(el: HTMLElement, now = false) {
    if (!el.querySelector('img[data-src]')) return;
    if (now) hydrate(el);
    else thirsty.add(el);
  }

  /** The one element we must never unmount: the panel flew out of it. */
  let pinned: HTMLElement | null = null;

  let vw = window.innerWidth;
  /** One fragment per lane, so a sweep is three insertions, not thirty. */
  const arriving = new Map<HTMLElement, DocumentFragment>();

  function sweep(x: number, urgent = false) {
    const lo = -2.2 * vw;
    const hi = 3.2 * vw;
    for (const p of parked) {
      const sx = p.f * (p.wx - x);
      const want = sx > lo && sx < hi;
      if (want === p.on) continue;
      if (want) {
        let frag = arriving.get(p.parent);
        if (!frag) {
          frag = document.createDocumentFragment();
          arriving.set(p.parent, frag);
        }
        frag.appendChild(p.el);
        // Anything already on screen gets its picture at once; the rest wait
        // for an idle moment so a fling never pays for a decode mid-gesture.
        thirstFor(p.el, urgent || (sx > -vw * 0.2 && sx < vw * 1.2));
        p.on = true;
      } else if (p.el !== pinned) {
        p.el.remove();
        p.on = false;
      }
    }
    for (const [parent, frag] of arriving) parent.appendChild(frag);
    arriving.clear();
  }

  /* ------------------------------------------------------- the gate zone - */
  /**
   * A gate is the one place on the road that is *reading matter*: the age's
   * name, its line, its facts, the two clocks and "How big is this?". It
   * stands in the near lane at factor 1; the chapters travel at 0.58 and the
   * Cross-Yuga discs at 0.30 — so anything behind a gate slides *through* its
   * text at a different speed, and no static layout can keep them apart (the
   * offset between a gate and its first chapter sweeps from +16 px to +314 px
   * while the gate is on screen; the text block is 300 px wide).
   *
   * So the gate carries a zone with it. While its text is on screen, whatever
   * else would fall inside that zone steps out of the way — it fades to a
   * ghost of itself, drops its label and stops taking taps, and comes back the
   * moment the gate has passed. Nothing is removed and nothing moves: the
   * chapter is still there, a screen either side of the gate, where it can be
   * read. This is cheap (a handful of elements, only while a gate is near) and
   * it is the only thing that can be *proved* not to overlap.
   */
  /**
   * Everything that is not a gate, built from `parked` rather than from the
   * DOM: by this point every place has been lifted out of the document and
   * only the sweep puts it back.
   */
  const shy = parked
    .filter((p) => !p.el.classList.contains('tr-gate'))
    .map((p) => ({ el: p.el, wx: p.wx, f: p.f, half: 0, on: false }));
  let lastGuard = Number.NaN;
  /** Half the gate's own width, measured — it is 300 px on a phone, 420 wide. */
  let gateHalf = 0;

  /**
   * The widths are CSS, and CSS changes with the viewport (and with a stele's
   * own `scale()`), so they are read from the live layout once per size rather
   * than guessed. One forced layout per resize; none per frame.
   */
  function measureZone() {
    const g = laneNear.querySelector<HTMLElement>('.tr-gate');
    gateHalf = (g?.getBoundingClientRect().width || 300) / 2;
    for (const s of shy) {
      if (!s.el.isConnected) continue;
      const w = s.el.getBoundingClientRect().width;
      if (w > 2) s.half = w / 2;
    }
    // Anything not mounted yet inherits its lane's typical half-width.
    const byLane = new Map<number, number>();
    for (const s of shy) if (s.half) byLane.set(s.f, Math.max(byLane.get(s.f) ?? 0, s.half));
    for (const s of shy) if (!s.half) s.half = byLane.get(s.f) ?? 60;
  }

  function guardGate(x: number) {
    if (Math.abs(x - lastGuard) < 6) return;
    lastGuard = x;
    if (!gateHalf) measureZone();
    for (const s of shy) {
      const sx = s.f * (s.wx - x);
      // Off screen entirely: never pay for it.
      if (sx < -vw || sx > vw * 1.4) {
        if (s.on) {
          s.on = false;
          s.el.removeAttribute('data-shy');
        }
        continue;
      }
      let hit = false;
      for (const r of regions) {
        const gx = r.gateX - x;
        if (gx < -vw || gx > vw * 1.4) continue;
        // +6 px of daylight, so "not overlapping" is not a rounding argument.
        if (Math.abs(sx - gx) < gateHalf + s.half + 6) {
          hit = true;
          break;
        }
      }
      if (hit !== s.on) {
        s.on = hit;
        if (hit) s.el.setAttribute('data-shy', '1');
        else s.el.removeAttribute('data-shy');
      }
    }
  }

  /* --------------------------------------------------------- the ambient - */

  const motes = reduced ? null : makeMotes(scene);

  /* ------------------------------------------------------------ the loop - */

  let raf = 0;
  let lastX = -1;
  let running = true;
  let lastSweep = -1e9;
  let stillTimer = 0;

  /* ------------------------------------------------- the end of the road - */

  const finale = scene.querySelector<HTMLElement>('.tr-finale');
  const morning = scene.querySelector<HTMLElement>('.tr-morning');
  const dawn = scene.querySelector<HTMLElement>('.tr-dawn');
  let lastEndT = -1;
  let finaleOn = false;
  let morningOn = false;

  function setFinale(on: boolean, showMorning: boolean) {
    if (finale && on !== finaleOn) {
      finaleOn = on;
      finale.hidden = !on;
    }
    if (morning && showMorning !== morningOn) {
      morningOn = showMorning;
      morning.hidden = !showMorning;
      if (showMorning) live.textContent = 'The Night of Brahmā. The road dissolves here.';
    }
  }

  /**
   * "…and the morning comes again." The road loops: a light sweeps across the
   * world, the traveller is set back down at the waters, and the sweep clears.
   * Under reduced motion it is a plain jump — the loop is the point, not the
   * transition.
   */
  function toTheMorning() {
    closePanel();
    if (reduced || !dawn) {
      road.scrollLeft = 0;
      lastX = -1;
      lastSweep = -1e9;
      sweep(0, true);
      schedule();
      live.textContent = 'Before Time. The waters again.';
      return;
    }
    dawn.hidden = false;
    requestAnimationFrame(() => dawn.classList.add('is-on'));
    window.setTimeout(() => {
      road.scrollLeft = 0;
      lastX = -1;
      lastSweep = -1e9;
      sweep(0, true);
      schedule();
      dawn.classList.remove('is-on');
      live.textContent = 'Before Time. The waters again.';
      window.setTimeout(() => {
        dawn.hidden = true;
      }, 620);
    }, 460);
  }

  function frame() {
    raf = 0;
    if (!running) return;
    const x = road.scrollLeft;
    /* `|| motes` keeps the canvas breathing on a still road — but it also made
       the body below run every frame, which re-armed the 700 ms "come to rest"
       timer every 16 ms so it never once fired. Rest is a change in `x`, not a
       tick of the loop. */
    const moved = x !== lastX;
    if (moved || motes) {
      const dx = lastX < 0 ? 0 : x - lastX;
      lastX = x;

      laneFar.style.transform = `translate3d(${(x * (1 - FAR_FACTOR)).toFixed(1)}px,0,0)`;
      laneSky.style.transform = `translate3d(${(x * (1 - SKY_FACTOR)).toFixed(1)}px,0,0)`;
      wrapFar.style.transform = `translate3d(${(-((x * HILL_FAR_FACTOR) % TILE_W)).toFixed(1)}px,0,0)`;
      wrapNear.style.transform = `translate3d(${(-((x * HILL_NEAR_FACTOR) % TILE_W)).toFixed(1)}px,0,0)`;
      wrapVerge.style.transform = `translate3d(${(-((x * VERGE_FACTOR) % VERGE_W)).toFixed(1)}px,0,0)`;

      const centre = x + vw * 0.36;
      const i = regionAt(centre);
      if (i !== current) enter(i);
      const r = regions[i]!;
      const end = r.x0 + r.width;
      const t = i < last ? clamp((centre - (end - FADE_PX)) / FADE_PX, 0, 1) : 0;
      const base = (i % 2) as 0 | 1;
      const inc = ((i + 1) % 2) as 0 | 1;
      setLayer(skies, base, 1, 0);
      setLayer(skies, inc, t, 1);
      setLayer(hillsFar, base, 1, 0);
      setLayer(hillsFar, inc, t, 1);
      setLayer(hillsNear, base, 1, 0);
      setLayer(hillsNear, inc, t, 1);
      setLayer(grounds, base, 1, 0);
      setLayer(grounds, inc, t, 1);
      setLayer(verges, base, 0.85, 0);
      setLayer(verges, inc, t * 0.85, 1);

      const p = world.width > vw ? x / (world.width - vw) : 0;
      const w = track.clientWidth;
      thumb.style.transform = `translate3d(${(clamp(p, 0, 1) * w).toFixed(1)}px,0,0)`;

      // The end of the road. One number, `--end-t`, runs 0 → 1 across the last
      // screen and a quarter; the Saṃvartaka fire, the rain, the rising water
      // and the Night's own card all read it, so the whole dissolution is one
      // scroll-driven state and nothing is "played" at the traveller.
      const et = clamp((x - (world.nightX - world.finale)) / world.finale, 0, 1);
      if (Math.abs(et - lastEndT) > 0.002) {
        lastEndT = et;
        scene.style.setProperty('--end-t', et.toFixed(3));
        setFinale(et > 0.002, et > 0.5);
      }

      // The road has moved half a screen under a human thumb: the intro has
      // been answered, whether or not anyone touched its button.
      if (introArmed && Math.abs(x - introBase) > vw * 0.5) retireIntro();

      // Keep the gate's text block clear of everything travelling behind it.
      guardGate(x);

      // Mount/unmount only when we have actually moved a third of a screen —
      // sweeping is O(places) and there is no reason to pay it every frame.
      if (Math.abs(x - lastSweep) > vw * 0.55) {
        lastSweep = x;
        sweep(x);
      }
      // localStorage is a synchronous write; it has no business inside a
      // gesture. Remember where we are once the road has come to rest.
      if (moved) {
        if (stillTimer) window.clearTimeout(stillTimer);
        stillTimer = window.setTimeout(() => {
          stillTimer = 0;
          save(road.scrollLeft);
        }, 700);
      }

      // One or three pictures a frame: enough to fill a screen in a few
      // frames, small enough that a fling never waits on a decode.
      if (thirsty.size) pour(Math.abs(dx) > 60 ? 1 : 3);

      if (motes) motes.step(dx);
    }
    schedule();
  }

  function schedule() {
    if (!raf && running) raf = requestAnimationFrame(frame);
  }

  road.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    vw = window.innerWidth;
    lastX = -1;
    lastSweep = -1e9;
    gateHalf = 0;
    lastGuard = Number.NaN;
    motes?.resize();
    schedule();
  });
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) {
      lastX = -1;
      schedule();
    } else {
      save(road.scrollLeft);
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }
  });
  window.addEventListener('pagehide', () => save(road.scrollLeft));

  /**
   * "Where was I." One record, shared with the rest of the site (the story
   * pages read `ht:road` too), written only when the road has come to rest —
   * `localStorage` is a synchronous write and has no business inside a gesture.
   */
  function save(x: number) {
    /* The one gate. Boot, the entrance glide and any reflow that moves the
       scroller are all `!owned` or `!stable`, so none of them can overwrite a
       place a person actually walked to. */
    if (!stable || !owned) return;
    try {
      const r = regions[current];
      localStorage.setItem(
        ROAD_KEY,
        JSON.stringify({
          x: Math.round(x),
          age: r?.slug ?? null,
          label: r?.gate ?? null,
          at: Date.now(),
        }),
      );
    } catch {
      /* private mode */
    }
  }

  /** When the reader last opened a *story* (`ht:last`, written by L2's pages). */
  function lastStoryAt(): number {
    try {
      const raw = localStorage.getItem('ht:last');
      if (!raw) return 0;
      const v = JSON.parse(raw) as { at?: number };
      return typeof v?.at === 'number' ? v.at : 0;
    } catch {
      return 0;
    }
  }

  /** The last place, from this build's key or the first build's. */
  function lastPlace(): { x: number; label: string | null; at: number } | null {
    try {
      const raw = localStorage.getItem(ROAD_KEY);
      if (raw) {
        const v = JSON.parse(raw) as { x?: number; label?: string; at?: number };
        if (typeof v?.x === 'number') {
          return { x: v.x, label: v.label ?? null, at: typeof v.at === 'number' ? v.at : 0 };
        }
      }
      const legacy = localStorage.getItem(LEGACY_POS_KEY);
      if (legacy != null) return { x: Number(legacy) || 0, label: null, at: 0 };
    } catch {
      /* private mode, or a record from another build */
    }
    return null;
  }

  /* ------------------------------------------- where the journey resumes - */

  let seenHint = false;
  try {
    seenHint = localStorage.getItem(HINT_KEY) === '1';
  } catch {
    seenHint = false;
  }
  const remembered = lastPlace();
  const resumeAt = remembered
    ? clamp(remembered.x || 0, 0, Math.max(0, world.width - vw))
    : 0;
  if (resumeAt > 40) {
    road.scrollLeft = resumeAt;
    wantX = resumeAt;
  }

  enter(regionAt(road.scrollLeft + vw * 0.36));
  sweep(road.scrollLeft);
  schedule();
  // The first measurement has to wait for the first layout of the places the
  // boot sweep just mounted.
  requestAnimationFrame(() => {
    // Whatever boot asked for — a resume, or a `#at=` landing further down —
    // re-applied: `scrollLeft` set before the scroller has its full width
    // silently clamps to 0. The write side is now gated too (`stable`), so a
    // clamp can no longer be *recorded*; this is the other half, so it is not
    // even *seen*.
    if (wantX > 40 && road.scrollLeft < wantX - 8) {
      road.scrollLeft = wantX;
      lastX = -1;
      sweep(road.scrollLeft, true);
    }
    gateHalf = 0;
    lastGuard = Number.NaN;
    guardGate(road.scrollLeft);
    /* One more frame. Fonts and the first stills land between these two, and a
       late reflow can still move a scroller; only past it is a position the
       road's own rather than the layout's. */
    requestAnimationFrame(() => {
      stable = true;
    });
  });

  /**
   * A human has taken the road: a drag, a flick, an arrow key, a chip, a gate.
   * Everything the page does to itself — the entrance, a resume, a reflow —
   * happens without any of these, which is exactly the distinction `save()`
   * needs and could not previously make.
   */
  function takeTheWheel() {
    owned = true;
  }
  for (const ev of ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const) {
    scene.addEventListener(ev, takeTheWheel, { passive: true });
  }

  /* -------------------------------------------------- travelling on demand */

  function travel(x: number, smooth = true) {
    const left = clamp(x, 0, Math.max(0, world.width - vw));
    road.scrollTo({ left, behavior: smooth && !reduced ? 'smooth' : 'auto' });
    // The sweep is driven by the loop, but a jump of ten screens should mount
    // its destination now rather than after the smooth scroll has arrived.
    sweep(left);
    schedule();
  }

  /** Put a place on screen at the spot the eye reads first (centre-left). */
  function travelTo(id: string, smooth = true): number {
    const p = PANELS[id];
    if (!p) return road.scrollLeft;
    const target = Math.round(p.wx - vw * 0.42);
    travel(target, smooth);
    return clamp(target, 0, Math.max(0, world.width - vw));
  }

  /**
   * A ribbon chip must land on its own gate — the `here` label after the jump
   * has to read the same word as the chip. `x0 − 24` did not do that: the
   * label is read at `scrollLeft + 0.36·vw`, so the last age (whose stretch is
   * shorter than a screen plus the probe) clamped against `width − vw` and the
   * probe fell back inside the age *before* it. Aiming at the gate itself and
   * pulling it to a fifth of the way in leaves the probe inside the age at
   * every viewport, and puts the gate where the eye reads first.
   */
  function gateTarget(i: number): number {
    const r = regions[i];
    if (!r) return 0;
    const want = r.gateX - vw * 0.42;
    const maxScroll = Math.max(0, world.width - vw);
    // If the age is too near the end of the world to hold the probe, back off
    // until the probe (scroll + 0.36·vw) is inside this age's stretch again.
    const need = r.x0 + 8 - vw * 0.36;
    return clamp(Math.min(want, maxScroll) < need ? need : want, 0, maxScroll);
  }
  for (const s of segs) {
    s.addEventListener('click', () => {
      const i = Number(s.dataset.i);
      if (regions[i]) travel(gateTarget(i));
    });
  }
  scene.querySelector('[data-act="now"]')?.addEventListener('click', () => {
    closePanel();
    const i = regions.findIndex((r) => r.slug === 'kali-yuga-history');
    travel(i >= 0 ? gateTarget(i) : world.nowX);
  });
  scene.querySelector('[data-act="home"]')?.addEventListener('click', (e) => {
    // The wordmark is a real link to `/` so it works with no JS; with JS it is
    // the "take me back to the beginning" control.
    e.preventDefault();
    closePanel();
    travel(0);
  });
  // The ribbon's loop chip and the atlas's loop band are the same idea as the
  // Night's own button: the last age joins the first.
  for (const el of Array.from(scene.querySelectorAll<HTMLElement>('[data-act="loop"]'))) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      show(atlas, false);
      toTheMorning();
    });
  }
  scene.querySelector('[data-act="morning"]')?.addEventListener('click', () => toTheMorning());

  /* --------------------------------------------- "How big is this?" ------ */
  /**
   * The nested-scale overlay is the one heavy thing on this page, and almost
   * nobody opens it on the first screen — so it is a dynamic import. The road's
   * own bundle never carries it.
   */
  const scaleHost = scene.querySelector<HTMLElement>('.tr-scale-host');
  let scaleLoading = false;
  function openScale(opener?: HTMLElement | null) {
    if (!scaleHost || scaleLoading) return;
    scaleLoading = true;
    retireIntro();
    closePanel();
    show(menu, false);
    show(atlas, false);
    import('../../components/scale/scale-overlay.ts')
      .then((m) => {
        scaleLoading = false;
        m.openScale(scaleHost!, {
          reduced,
          accent: regions[current]?.accent ?? '#f3b551',
          /* Back to the button that opened it. Sending focus to `.tr-road`
             instead dropped a keyboard reader onto a region with no visible
             ring — they closed a dialog and lost their place. */
          onClose: () => {
            const back = opener?.isConnected ? opener : road;
            back.focus({ preventScroll: true });
          },
        });
      })
      .catch(() => {
        scaleLoading = false;
        // A network failure must not strand the traveller: the static form of
        // the same view is a real page.
        location.href = '/clock/#scale';
      });
  }
  scene.addEventListener('click', (e) => {
    const opener = (e.target as HTMLElement).closest<HTMLElement>('[data-act="scale"]');
    if (opener) openScale(opener);
  });

  // Scrub along the ribbon.
  let scrubbing = false;
  const scrubTo = (clientX: number) => {
    const box = track.getBoundingClientRect();
    const p = clamp((clientX - box.left) / box.width, 0, 1);
    travel(p * (world.width - vw), false);
  };
  track.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('.tr-seg') && e.pointerType !== 'touch') return;
    scrubbing = true;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!scrubbing) return;
    e.preventDefault();
    scrubTo(e.clientX);
  });
  const endScrub = () => {
    scrubbing = false;
  };
  track.addEventListener('pointerup', endScrub);
  track.addEventListener('pointercancel', endScrub);

  /* --------------------------------------------------------------- panels */

  const scrim = scene.querySelector<HTMLElement>('.tr-scrim')!;
  const sheet = scene.querySelector<HTMLElement>('.tr-sheet')!;
  const sheetIn = scene.querySelector<HTMLElement>('.tr-sheet-in')!;
  const sheetClose = scene.querySelector<HTMLElement>('.tr-sheet-close')!;
  const peek = scene.querySelector<HTMLElement>('.tr-peek')!;
  const peekArt = scene.querySelector<HTMLElement>('.tr-peek-art')!;
  const peekMeta = scene.querySelector<HTMLElement>('.tr-peek-meta')!;
  const peekTitle = scene.querySelector<HTMLElement>('.tr-peek-title')!;
  const peekHi = scene.querySelector<HTMLElement>('.tr-peek-hi')!;
  const peekActs = scene.querySelector<HTMLElement>('.tr-peek-acts')!;
  const flipLayer = scene.querySelector<HTMLElement>('.tr-flip')!;

  let openId: string | null = null;
  let mode: 'none' | 'peek' | 'full' = 'none';
  let opener: HTMLElement | null = null;

  const esc = (s: unknown) =>
    String(s ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
    );

  /** The 400-wide entry of a srcset, for a 34 px chip. */
  function small(img: PanelImg | null): string | null {
    if (!img) return null;
    const first = img.srcset?.split(',')[0]?.trim().split(/\s+/)[0];
    return first || img.src;
  }

  /**
   * The panel's shape is the cosmos prototype's: the art with its play badge,
   * a letterspaced `AGE · duration` line, English then Devanagari, the corpus's
   * own summary, the italic place line, then the actions and "Nearby".
   */
  function fullHTML(p: Panel): string {
    // The hero's own 800-tier file is a fresh request; the 400 the stele already
    // fetched goes behind it as a background so the frame is never a black hole
    // while the sharper one arrives.
    const back = small(p.img);
    const art = p.img
      ? `<figure class="tr-panel-hero"${back ? ` style="background-image:url(${esc(back)})"` : ''}>
          <img src="${esc(p.img.src)}"${p.img.srcset ? ` srcset="${esc(p.img.srcset)}"` : ''}
            sizes="(max-width: 900px) 100vw, 430px" width="${p.img.w}" height="${p.img.h}"
            alt="" decoding="async" />
          ${
            p.vid
              ? `<button type="button" class="tr-watch" data-video="${esc(p.vid)}"
                   aria-label="Watch: ${esc(p.title)}"><span class="tr-watch-play" aria-hidden="true"><i></i></span></button>`
              : ''
          }
          ${p.soon ? '<span class="tr-soon-seal tr-soon-big">Coming soon</span>' : ''}
        </figure>`
      : `<figure class="tr-panel-hero is-bud"><span class="tr-bud" aria-hidden="true"></span></figure>`;
    /**
     * A chapter's stories, in the order the corpus tells them, each with the
     * film still where one of them has been filmed. This is the difference
     * between "a chapter" and "a link": you can see what is inside it.
     */
    const rows = p.rows?.length
      ? `<ol class="tr-rows">${p.rows
          .map(
            (r) => `<li><a href="${esc(r.href)}">
              <span class="tr-row-art"${r.img ? ` style="background-image:url(${esc(r.img)})"` : ' data-bud="1"'}></span>
              <span class="tr-row-txt"><span class="tr-row-name">${esc(r.label)}</span>${
                r.note ? `<span class="tr-row-note">${esc(r.note)}</span>` : ''
              }</span>
            </a></li>`,
          )
          .join('')}</ol>`
      : '';
    const chips = p.near
      .map((id) => {
        const n = PANELS[id];
        if (!n) return '';
        const t = small(n.img);
        return `<button type="button" class="tr-chip" data-go="${esc(id)}">
          <span class="tr-chip-art"${t ? ` style="background-image:url(${esc(t)})"` : ' data-bud="1"'}></span>
          <span>${esc(n.l)}</span>
        </button>`;
      })
      .join('');
    return `${art}
      <div class="tr-panel-body">
        <p class="tr-panel-meta">${esc(p.meta)}</p>
        <h2 class="tr-panel-title" id="tr-panel-title">${esc(p.title)}</h2>
        ${p.hi ? `<p class="tr-panel-hi dv" lang="hi">${esc(p.hi)}</p>` : ''}
        ${p.sum ? `<p class="tr-panel-sum">${esc(p.sum)}</p>` : ''}
        ${p.place ? `<p class="tr-panel-place">${esc(p.place)}</p>` : ''}
        ${p.cap ? `<p class="tr-caption">${esc(p.cap)}</p>` : ''}
        ${rows}
        <div class="tr-links">
          ${p.links
            .map(
              (l) =>
                `<a class="tr-link${l.primary ? ' tr-link-primary' : ''}" href="${esc(l.href)}">${esc(l.label)}</a>`,
            )
            .join('')}
        </div>
        ${chips ? `<div class="tr-near"><h3>Nearby on the road</h3><div class="tr-near-row">${chips}</div></div>` : ''}
      </div>`;
  }

  /* ------------------------------------------------------------- the FLIP */
  /**
   * The panel has to *grow out of the thing you touched*, or it reads as a page
   * you navigated to — which is the one thing the brief forbids. So the picture
   * flies: a clone is laid on the destination rect and given the transform that
   * maps it back onto the source, then animated to none. Two elements, because
   * a frame that changes aspect would squash the picture inside it: the box
   * takes the non-uniform scale and the image takes its inverse.
   */
  function flip(fromRect: DOMRect | null, toEl: HTMLElement, src: string | null, after?: () => void) {
    if (reduced || !fromRect || !src || typeof toEl.animate !== 'function') {
      after?.();
      return;
    }
    const b = toEl.getBoundingClientRect();
    if (b.width < 4 || b.height < 4 || fromRect.width < 4) {
      after?.();
      return;
    }
    const box = document.createElement('div');
    box.className = 'tr-flip-box';
    box.style.cssText = `left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px`;
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    box.appendChild(img);
    flipLayer.hidden = false;
    flipLayer.appendChild(box);

    const sx = fromRect.width / b.width;
    const sy = fromRect.height / b.height;
    const dx = fromRect.left - b.left;
    const dy = fromRect.top - b.top;
    toEl.style.opacity = '0';
    const opts = { duration: FLIP_MS, easing: FLIP_EASE, fill: 'both' as const };
    const a1 = box.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: 'translate(0px, 0px) scale(1, 1)' },
      ],
      opts,
    );
    img.animate(
      [{ transform: `scale(${1 / sx}, ${1 / sy})` }, { transform: 'scale(1, 1)' }],
      opts,
    );
    a1.onfinish = () => {
      box.remove();
      if (!flipLayer.firstChild) flipLayer.hidden = true;
      toEl.style.opacity = '';
      after?.();
    };
    a1.oncancel = a1.onfinish;
  }

  /** The rect of the picture inside a place, which is what actually flies. */
  function artRect(el: HTMLElement | null): DOMRect | null {
    if (!el) return null;
    const target =
      el.querySelector<HTMLElement>('.tr-stele-frame') ??
      el.querySelector<HTMLElement>('.tr-lm-frame') ??
      el.querySelector<HTMLElement>('.tr-sky-disc') ??
      el;
    const r = target.getBoundingClientRect();
    return r.width > 2 ? r : null;
  }

  /* -------------------------------------------------------- open and close */

  /** Cross-Yuga hangs over every age, so it gets the sky's own gold. */
  const SKY_ACCENT = '#f0c98a';
  function accentOf(p: Panel): string {
    return regions[p.ri]?.accent ?? SKY_ACCENT;
  }

  function fillPeek(p: Panel) {
    const t = small(p.img);
    // The panel belongs to the age of the story, not to the age under your feet.
    const a = accentOf(p);
    peek.style.setProperty('--accent', a);
    sheet.style.setProperty('--accent', a);
    peekArt.innerHTML = t ? `<img src="${esc(t)}" alt="" decoding="async" />` : '';
    peekArt.dataset.bud = t ? '0' : '1';
    peekMeta.textContent = p.meta;
    peekTitle.textContent = p.l.endsWith('…') ? p.title : p.l;
    peekHi.textContent = p.hi ?? '';
    peekHi.hidden = !p.hi;
    const acts: string[] = [];
    if (p.vid) acts.push(`<button type="button" class="tr-act tr-act-go" data-watch="1">Watch</button>`);
    const read = p.links.find((l) => l.primary) ?? p.links[0];
    if (read) {
      acts.push(
        `<a class="tr-act${p.vid ? '' : ' tr-act-go'}" href="${esc(read.href)}">${esc(read.label.replace('Read the story', 'Read'))}</a>`,
      );
    }
    peekActs.innerHTML = acts.join('');
  }

  function openPeek(id: string, from: HTMLElement | null, flying = true) {
    const p = PANELS[id];
    if (!p) return;
    retireIntro();
    const wasFrom = from ? artRect(from) : null;
    openId = id;
    opener = from;
    pinned = from;
    fillPeek(p);
    peek.hidden = false;
    mode = 'peek';
    scene.dataset.mode = 'peek';
    sheet.hidden = true;
    scrim.hidden = true;
    scrim.classList.remove('is-open');
    if (from) from.setAttribute('aria-expanded', 'true');
    live.textContent = `${p.title}. ${p.meta}. Open it for the whole story.`;
    if (!reduced) {
      peek.classList.remove('is-in');
      requestAnimationFrame(() => peek.classList.add('is-in'));
    }
    if (flying) flip(wasFrom, peekArt, small(p.img));
    try {
      // One history entry for "a story is open", not one per story: Android's
      // back button should return you to the road, not walk your last six taps.
      if (history.state?.trPanel) history.replaceState({ trPanel: id }, '');
      else history.pushState({ trPanel: id }, '');
    } catch {
      /* file:// and friends */
    }
  }

  function expand() {
    if (!openId) return;
    const p = PANELS[openId];
    if (!p) return;
    const fromRect = artRect(peekArt) ?? peekArt.getBoundingClientRect();
    sheetIn.innerHTML = fullHTML(p);
    sheet.hidden = false;
    scrim.hidden = false;
    sheet.scrollTop = 0;
    mode = 'full';
    scene.dataset.mode = 'full';
    peek.hidden = true;
    requestAnimationFrame(() => scrim.classList.add('is-open'));
    const hero = sheetIn.querySelector<HTMLElement>('.tr-panel-hero');
    if (hero) flip(fromRect, hero, small(p.img) ?? p.img?.src ?? null);
    sheetClose.focus({ preventScroll: true });
    live.textContent = `${p.title}. ${p.sum}`;
  }

  function collapse() {
    if (mode !== 'full' || !openId) return;
    stopEmbeds();
    const p = PANELS[openId]!;
    const hero = sheetIn.querySelector<HTMLElement>('.tr-panel-hero');
    const fromRect = hero ? hero.getBoundingClientRect() : null;
    sheet.hidden = true;
    scrim.classList.remove('is-open');
    window.setTimeout(() => {
      if (mode !== 'full') scrim.hidden = true;
    }, reduced ? 0 : 220);
    peek.hidden = false;
    mode = 'peek';
    scene.dataset.mode = 'peek';
    flip(fromRect, peekArt, small(p.img));
    sheetIn.innerHTML = '';
  }

  function stopEmbeds() {
    for (const w of Array.from(sheetIn.querySelectorAll<HTMLElement>('.tr-watch[data-playing]'))) {
      w.removeAttribute('data-playing');
      w.querySelector('iframe')?.remove();
      const play = w.querySelector<HTMLElement>('.tr-watch-play');
      if (play) play.hidden = false;
    }
  }

  function closePanel(pop = false) {
    if (mode === 'none') return;
    stopEmbeds();
    const id = openId;
    const back = opener;
    const p = id ? PANELS[id] : null;
    const fromEl =
      mode === 'full' ? sheetIn.querySelector<HTMLElement>('.tr-panel-hero') : peekArt;
    const fromRect = fromEl ? fromEl.getBoundingClientRect() : null;
    const toRect = artRect(back);

    mode = 'none';
    openId = null;
    opener = null;
    scene.dataset.mode = '';
    peek.hidden = true;
    peek.classList.remove('is-in');
    sheet.hidden = true;
    scrim.classList.remove('is-open');
    window.setTimeout(() => {
      if (mode === 'none') scrim.hidden = true;
    }, reduced ? 0 : 220);
    sheetIn.innerHTML = '';
    back?.setAttribute('aria-expanded', 'false');

    // The reverse flight: the picture goes home to the stele you touched.
    if (!reduced && fromRect && toRect && p?.img) {
      const box = document.createElement('div');
      box.className = 'tr-flip-box';
      box.style.cssText = `left:${fromRect.left}px;top:${fromRect.top}px;width:${fromRect.width}px;height:${fromRect.height}px`;
      const img = document.createElement('img');
      img.src = small(p.img)!;
      img.alt = '';
      box.appendChild(img);
      flipLayer.hidden = false;
      flipLayer.appendChild(box);
      const sx = toRect.width / fromRect.width;
      const sy = toRect.height / fromRect.height;
      const a = box.animate(
        [
          { transform: 'translate(0px,0px) scale(1,1)', opacity: 1 },
          {
            transform: `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px) scale(${sx}, ${sy})`,
            opacity: 0.15,
          },
        ],
        { duration: FLIP_MS - 60, easing: FLIP_EASE, fill: 'both' },
      );
      const done = () => {
        box.remove();
        if (!flipLayer.firstChild) flipLayer.hidden = true;
      };
      a.onfinish = done;
      a.oncancel = done;
    }

    pinned = null;
    if (back?.isConnected) back.focus({ preventScroll: true });
    else road.focus({ preventScroll: true });
    if (!pop && history.state?.trPanel) {
      try {
        history.back();
      } catch {
        /* no-op */
      }
    }
  }

  /** Open a place by id, travelling there first if it is off screen. */
  /** Returns where the road is headed, so a boot-time `#place=` can survive a clamp. */
  function goto(id: string, opts: { open?: boolean } = {}): number {
    const p = PANELS[id];
    if (!p) return 0;
    const wasOpen = mode !== 'none';
    if (wasOpen) closePanel();
    const target = travelTo(id, !reduced);
    // Mount the destination now, picture and all, so there is something real
    // for the panel to fly out of when we land.
    sweep(target);
    const dest = byPlace.get(id)?.el;
    if (dest?.isConnected) thirstFor(dest, true);
    const land = () => {
      const el = byPlace.get(id)?.el ?? null;
      if (opts.open !== false) openPeek(id, el && el.isConnected ? el : null, Boolean(el));
    };
    if (reduced) land();
    else window.setTimeout(land, 420);
    return target;
  }

  // Every place is a real <a> so that the page still works with no JS at all;
  // with JS the link is suppressed and the story opens in-world instead.
  road.addEventListener('click', (e) => {
    const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-place]');
    if (!hit) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || (e as MouseEvent).button > 0) return;
    e.preventDefault();
    openPeek(hit.dataset.place!, hit);
  });
  scrim.addEventListener('click', () => closePanel());
  sheetClose.addEventListener('click', () => closePanel());
  scene.querySelector('[data-act="peek-close"]')?.addEventListener('click', () => closePanel());
  scene.querySelector('[data-act="expand"]')?.addEventListener('click', () => expand());
  scene.querySelector('[data-act="collapse"]')?.addEventListener('click', () => collapse());
  peekActs.addEventListener('click', (e) => {
    const w = (e.target as HTMLElement).closest<HTMLElement>('[data-watch]');
    if (!w) return;
    expand();
    window.setTimeout(() => sheetIn.querySelector<HTMLElement>('.tr-watch')?.click(), reduced ? 0 : 360);
  });
  window.addEventListener('popstate', () => {
    if (mode !== 'none') closePanel(true);
  });

  // "Nearby" and the YouTube facade both live inside the built panel.
  sheetIn.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const chip = t.closest<HTMLElement>('[data-go]');
    if (chip) {
      e.preventDefault();
      goto(chip.dataset.go!);
      return;
    }
    const btn = t.closest<HTMLElement>('.tr-watch');
    if (!btn || btn.dataset.playing) return;
    const id = btn.dataset.video;
    if (!id) return;
    btn.dataset.playing = '1';
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&cc_load_policy=1&cc_lang_pref=en`;
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
    f.allowFullscreen = true;
    f.title = btn.getAttribute('aria-label') ?? 'Film';
    btn.appendChild(f);
    const play = btn.querySelector<HTMLElement>('.tr-watch-play');
    if (play) play.hidden = true;
  });

  /* --------------------------------------------------------- a bud of light */
  /**
   * Grafted from the cosmos prototype: a place whose art has not arrived — or
   * whose still 404s — is not a broken picture, it is a bud that has not opened.
   */
  scene.addEventListener(
    'error',
    (e) => {
      const img = e.target as HTMLElement;
      if (!(img instanceof HTMLImageElement)) return;
      const frame = img.closest<HTMLElement>('.tr-stele-frame, .tr-sky-disc, .tr-panel-hero, .tr-peek-art');
      if (frame) {
        frame.dataset.bud = '1';
        img.remove();
      }
    },
    true,
  );

  /* ------------------------------------------------------------- overlays - */
  /**
   * The atlas, the index and the menu are server-rendered (they are the whole
   * of the no-JS page and they carry every real link a crawler needs), and then
   * lifted straight back out of the document here. A detached node costs
   * nothing: no nodes in the tree, no style recalculation, no lazy images.
   */
  interface Overlay {
    el: HTMLElement;
    anchor: Comment;
    open: boolean;
  }
  function detach(sel: string): Overlay | null {
    const el = scene.querySelector<HTMLElement>(sel);
    if (!el) return null;
    const anchor = document.createComment(sel);
    el.replaceWith(anchor);
    return { el, anchor, open: false };
  }
  const atlas = detach('.tr-atlas')!;
  const index = detach('.tr-index')!;
  const menu = detach('.tr-menu')!;

  function show(o: Overlay | null, on: boolean, focusSel?: string) {
    if (!o) return;
    if (on === o.open) return;
    o.open = on;
    if (on) {
      retireIntro();
      o.anchor.replaceWith(o.el);
      o.el.hidden = false;
      hydrate(o.el);
      if (o.el === atlas.el) {
        for (const b of Array.from(o.el.querySelectorAll<HTMLElement>('.tr-atlas-band'))) {
          b.setAttribute('aria-current', b.dataset.i === String(current) ? 'true' : 'false');
        }
      }
      requestAnimationFrame(() => o.el.classList.add('is-open'));
      o.el.querySelector<HTMLElement>(focusSel ?? '.tr-tool')?.focus({ preventScroll: true });
    } else {
      o.el.classList.remove('is-open');
      const put = () => {
        if (o.open) return;
        o.el.hidden = true;
        o.el.replaceWith(o.anchor);
      };
      if (reduced) put();
      else window.setTimeout(put, 240);
    }
  }

  scene.querySelector('[data-act="atlas"]')?.addEventListener('click', () => show(atlas, true));
  scene.querySelector('[data-act="menu"]')?.addEventListener('click', () => show(menu, true));
  scene.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'index-close') show(index, false);
    else if (act === 'menu-close') show(menu, false);
    else if (act === 'index') {
      show(menu, false);
      show(index, true);
    }
  });
  // The skip link points at a heading that is no longer in the document until
  // the index is opened, so opening it *is* the skip.
  document.querySelector('.tr-skip')?.addEventListener('click', (e) => {
    e.preventDefault();
    show(index, true, '#tr-index-h');
  });
  atlas.el.querySelector('.tr-atlas-close')?.addEventListener('click', () => show(atlas, false));
  atlas.el.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || (e as MouseEvent).button > 0) return;
    // The atlas is the chapter list now: a chapter row travels to that chapter
    // and opens it; a band travels to the head of its age.
    const chap = (e.target as HTMLElement).closest<HTMLElement>('[data-go]');
    if (chap) {
      e.preventDefault();
      show(atlas, false);
      goto(chap.dataset.go!);
      return;
    }
    const band = (e.target as HTMLElement).closest<HTMLElement>('.tr-atlas-band');
    if (!band) return;
    e.preventDefault();
    show(atlas, false);
    // Same rule as the ribbon: a band lands on its own gate, never a screen
    // short of it. (The Cross-Yuga band is the sky, which has no gate.)
    const bi = Number(band.dataset.i);
    travel(band.dataset.sky ? Number(band.dataset.x ?? 0) : gateTarget(bi), false);
  });

  /* ------------------------------------------------------------- the finder */
  /**
   * Grafted from the web-of-stories prototype, over terrain's own places. The
   * blob each place is matched against was folded at build time (`data.ts`), so
   * "manthan" finds *Samudra Manthan* and "krishna" finds *Kṛṣṇa*.
   */
  const find = scene.querySelector<HTMLElement>('.tr-find')!;
  const q = scene.querySelector<HTMLInputElement>('#tr-q')!;
  const results = scene.querySelector<HTMLElement>('.tr-results')!;
  const noneMsg = scene.querySelector<HTMLElement>('.tr-find-none')!;
  let rIdx = -1;

  const foldQ = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’'`ʼ]/g, '')
      .replace(/[·—–-]/g, ' ')
      .toLowerCase();

  function showFind(on: boolean) {
    find.hidden = !on;
    scene.dataset.finding = on ? '1' : '';
    if (on) {
      retireIntro();
      closePanel();
      q.value = '';
      hideResults();
      q.focus({ preventScroll: true });
    } else {
      hideResults();
      q.blur();
    }
  }

  function hideResults() {
    results.hidden = true;
    results.innerHTML = '';
    noneMsg.hidden = true;
    q.setAttribute('aria-expanded', 'false');
    rIdx = -1;
    more.hidden = true;
    more.innerHTML = '';
  }

  /* ------------------------------- and, under it, the manuscript itself --- */
  /**
   * The road knows about 150 places. The manuscript underneath it is 900
   * pages, and a first-time visitor typing "Ramayana" or "Buddha" means the
   * *book*, not a waypoint — R6 found the finder failing "Ramayana" outright
   * while `/search/` answered it correctly, with the broken one on every
   * screen. So when the road has little or nothing to say, S1's Pagefind
   * client answers under a second heading, *In the manuscript*.
   *
   * It is a dynamic `import()`: the road's own route bundle must stay under
   * 12 kB gzipped, and this engine is 3.4 kB of it that nobody who does not
   * open the finder should pay for.
   */
  const more = scene.querySelector<HTMLElement>('.tr-find-more')!;
  let corpusToken = 0;

  async function appendCorpusMatches(query: string, roadCount: number) {
    const token = ++corpusToken;
    // S1's own rule was "only when the road found fewer than three". On this
    // page the manuscript is the *other half of the answer*, not a fallback —
    // "Ramayana" should show the road's seven Tretā chapters **and** the
    // Rāmāyaṇa's own pages — so it is always offered, under its own heading,
    // below the road's.
    if (query.trim().length < 2) return;
    void roadCount;
    try {
      const { searchCorpus } = await import('../../lib/search-client.ts');
      const { pinned, results: found } = await searchCorpus(query, { limit: 6 });
      if (token !== corpusToken || find.hidden) return;
      const rows = [...pinned, ...found].slice(0, 6);
      if (!rows.length) return;
      more.innerHTML =
        '<h3 class="tr-find-kicker">In the manuscript</h3><ul class="tr-find-list">' +
        rows
          .map(
            (r) =>
              `<li><a href="${esc(r.route)}"><span>${esc(r.plainTitle)}</span><em>${esc(r.section)}</em></a></li>`,
          )
          .join('') +
        '</ul>';
      more.hidden = false;
      // The road found nothing, but the manuscript did: that is an answer, not
      // a dead end.
      noneMsg.hidden = true;
    } catch {
      /* no index (dev server), or the network went away — the road's own
         matches stand on their own. */
    }
  }

  function runSearch() {
    const raw = q.value.trim();
    const v = foldQ(raw);
    if (v.length < 2) return hideResults();
    more.hidden = true;
    more.innerHTML = '';
    const hits: { id: string; score: number }[] = [];
    for (const [id, blob, kind] of FIND) {
      const at = blob.indexOf(v);
      if (at < 0) continue;
      const word = at === 0 || blob[at - 1] === ' ';
      hits.push({ id, score: (word ? 0 : 4) + at * 0.01 + (kind === 'f' ? 0 : 0.4) });
      if (hits.length > 120) break;
    }
    if (!hits.length) {
      results.hidden = true;
      results.innerHTML = '';
      noneMsg.hidden = false;
      void appendCorpusMatches(raw, 0);
      return;
    }
    hits.sort((a, b) => a.score - b.score);
    results.innerHTML = hits
      .slice(0, 8)
      .map((h) => {
        const p = PANELS[h.id]!;
        const t = small(p.img);
        return `<li role="option" aria-selected="false"><button type="button" data-go="${esc(h.id)}">
          <span class="tr-res-art"${t ? ` style="background-image:url(${esc(t)})"` : ' data-bud="1"'}></span>
          <span class="tr-res-txt"><span class="tr-res-name">${esc(p.l)}</span><span class="tr-res-meta">${esc(p.meta)}</span></span>
        </button></li>`;
      })
      .join('');
    results.hidden = false;
    noneMsg.hidden = true;
    q.setAttribute('aria-expanded', 'true');
    rIdx = -1;
    void appendCorpusMatches(raw, hits.length);
  }

  scene.querySelector('[data-act="find"]')?.addEventListener('click', () => showFind(find.hidden));
  scene.querySelector('[data-act="find-close"]')?.addEventListener('click', () => showFind(false));
  q.addEventListener('input', runSearch);
  q.addEventListener('keydown', (e) => {
    const items = Array.from(results.querySelectorAll<HTMLElement>('button'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault();
      rIdx = clamp(rIdx + (e.key === 'ArrowDown' ? 1 : -1), 0, items.length - 1);
      items.forEach((b, k) => b.parentElement?.setAttribute('aria-selected', String(k === rIdx)));
      items[rIdx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const b = items[rIdx >= 0 ? rIdx : 0];
      if (b) {
        showFind(false);
        goto(b.dataset.go!);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      showFind(false);
    }
  });
  results.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-go]');
    if (!b) return;
    showFind(false);
    goto(b.dataset.go!);
  });

  /* -------------------------------------------------------- hidden hotspots */
  /**
   * Grafted from the cosmos prototype. One visually-hidden button per place;
   * focusing it travels the road there and shows the name as a pill, so the
   * whole world is reachable from the keyboard even though only the places
   * near you are in the document.
   */
  const hotspots = scene.querySelector<HTMLElement>('.tr-hotspots');
  hotspots?.addEventListener('focusin', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-hot]');
    if (!b || mode !== 'none') return;
    travelTo(b.dataset.hot!, !reduced);
  });
  hotspots?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-hot]');
    if (!b) return;
    goto(b.dataset.hot!);
  });

  /* ------------------------------------------------------------- keyboard - */

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q && mode === 'none') {
      e.preventDefault();
      showFind(true);
      return;
    }
    if (e.key !== 'Escape') return;
    if (!find.hidden) showFind(false);
    else if (mode === 'full') collapse();
    else if (mode === 'peek') closePanel();
    else if (index.open) show(index, false);
    else if (menu.open) show(menu, false);
    else if (atlas.open) show(atlas, false);
  });

  // Pinch in on the road → the whole clock.
  let pinchStart = 0;
  road.addEventListener(
    'touchstart',
    (e) => {
      pinchStart = e.touches.length === 2 ? touchGap(e) : 0;
    },
    { passive: true },
  );
  road.addEventListener(
    'touchmove',
    (e) => {
      if (!pinchStart || e.touches.length !== 2) return;
      const gap = touchGap(e);
      if (gap < pinchStart * 0.7) {
        pinchStart = 0;
        show(atlas, true);
      }
    },
    { passive: true },
  );

  /* ------------------------------------------------------------- the hint - */

  /**
   * The intro: one line, one primary action, three quiet doors, and — when
   * this browser remembers a place — the two return hooks. Everything in it
   * fits above the fold on a 390 × 844 phone; the whole card is dismissed by
   * touching anywhere on it that is not a link.
   */
  const hint = scene.querySelector<HTMLElement>('.tr-hint');
  if (hint) {
    /**
     * `instant` is the difference between the traveller answering the intro
     * (a 420 ms fade out of the way, which reads as a door opening) and the
     * intro being *superseded* — search, the menu, the atlas, a panel, the
     * scale view, or the road itself moving. Superseded means gone this frame:
     * a fading card over an open overlay is the ghost R6 found on every
     * screen.
     */
    const dismiss = (instant = false) => {
      if (hint.hidden) return;
      /* The road gets its voice back the moment the card starts leaving, so
         the labels fading up *is* the door opening. See `.tr-introing`. */
      scene.classList.remove('tr-introing');
      hint.classList.add('is-out');
      if (instant || reduced) hint.hidden = true;
      else window.setTimeout(() => { hint.hidden = true; }, 420);
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch {
        /* private mode */
      }
    };
    retireIntro = () => dismiss(true);

    /**
     * "Continue" is L2's `ContinueCard`, which fills itself from `ht:last`
     * (the last *story* read). The road is the other half of the same
     * question: `ht:road` is where the traveller last stood. Whichever record
     * is newer wins — so a reader who left mid-story is offered the story, and
     * one who left mid-journey is offered the road, and the home never argues
     * with the hub about it.
     */
    const cont = hint.querySelector<HTMLElement>('[data-continue]');
    if (cont && remembered && remembered.x > 200 && remembered.at >= lastStoryAt()) {
      const link = cont.querySelector<HTMLAnchorElement>('[data-continue-link]');
      const title = cont.querySelector<HTMLElement>('[data-continue-title]');
      const when = cont.querySelector<HTMLElement>('[data-continue-when]');
      const ri = regionAt(remembered.x + vw * 0.36);
      const where = remembered.label ?? regions[ri]?.gate ?? 'where you were';
      if (title) title.textContent = where;
      if (when) when.textContent = 'on the road';
      if (link) link.href = `/#at=${regions[ri]?.slug ?? ''}`;
      cont.hidden = false;
      cont.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-continue-dismiss]')) return;
        e.preventDefault();
        e.stopPropagation();
        dismiss(true);
        travel(remembered.x, false);
      });
    }

    // "Today's story" fills itself (TodayCard + `lib/today.ts`, the same
    // picker the Stories hub uses) and is an ordinary link to the story. The
    // card must not be swallowed by the intro's own tap-anywhere dismiss.
    hint
      .querySelector<HTMLElement>('[data-today]')
      ?.addEventListener('click', (e) => e.stopPropagation());

    for (const b of Array.from(hint.querySelectorAll<HTMLElement>('[data-act="begin"]'))) {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });
    }
    // The three doors that leave the page are ordinary links; touching one
    // must not be swallowed by the card's own dismiss.
    for (const a of Array.from(hint.querySelectorAll<HTMLElement>('a.tr-door'))) {
      a.addEventListener('click', (e) => e.stopPropagation());
    }

    if (seenHint) hint.hidden = true;
    else {
      hint.hidden = false;
      /* One screen, one message: while the card is up the road keeps its
         pictures and gives up its words. (`.tr-introing` in road-v2.css.) */
      scene.classList.add('tr-introing');
      hint.addEventListener('click', () => dismiss());
      window.setTimeout(() => dismiss(), 14000);
    }
  }

  /* ------------------------------- the Devanagari face, paid for on demand - */
  /**
   * Tiro Devanagari Hindi is 99 kB and the first view paints exactly two lines
   * of Devanagari, both of which have a decent system fallback on every phone.
   * So it is fetched at the first sign of a human, or three seconds in.
   */
  let fontDone = false;
  function loadDevanagari() {
    if (fontDone || !world.font) return;
    fontDone = true;
    const s = document.createElement('style');
    s.textContent = `@font-face{font-family:'Tiro Devanagari Hindi';font-style:normal;font-weight:400;font-display:swap;src:url(${world.font}) format('woff2');unicode-range:U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09;}`;
    document.head.appendChild(s);
  }
  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const) {
    window.addEventListener(ev, loadDevanagari, { once: true, passive: true });
  }
  /**
   * A *human* scrolling counts; the entrance glide below does not — it drives
   * `scrollLeft` itself, which fired this listener on every cold load and put
   * the 97 kB face on the wire before anyone had touched anything (a third of
   * the whole first view, for two lines that have a real system fallback on
   * every phone). The listener is armed once the glide is done.
   */
  function armFontOnScroll() {
    road.addEventListener('scroll', loadDevanagari, { once: true, passive: true });
  }
  // The idle fallback, for a visitor who reads without touching.
  window.setTimeout(loadDevanagari, 10000);

  /* --------------------------------------------- /#at= and /#place= ------ */
  /**
   * The rest of the site links *into* the road: `WhereInTime` and "Continue
   * the journey" on every story page emit `/#at=<period-slug>`, and a deep
   * link to one place is `/#place=<id>`. Both land instantly — a smooth glide
   * across ten thousand pixels to a place you asked for by name is a wait, not
   * a journey — and both count as having answered the intro.
   */
  function fromHash(hash: string): boolean {
    const m = /^#(at|place)=(.+)$/.exec(hash);
    if (!m) return false;
    const v = decodeURIComponent(m[2]!);
    /* Arriving by name is a choice, not a side effect: the reader tapped
       "Continue the journey" on a story page. So it takes the wheel, and
       `wantX` carries the target into the boot re-apply above — otherwise a
       landing at Dvāpara clamps to 0 exactly like a resume does, and the road
       quietly opens at the waters instead. */
    takeTheWheel();
    if (m[1] === 'at') {
      const i = regions.findIndex((r) => r.slug === v);
      if (i < 0) return false;
      wantX = gateTarget(i);
      road.scrollLeft = wantX;
      lastX = -1;
      lastSweep = -1e9;
      enter(regionAt(road.scrollLeft + vw * 0.36));
      sweep(road.scrollLeft, true);
      schedule();
      live.textContent = `${regions[i]!.gate}.`;
      return true;
    }
    if (!PANELS[v]) return false;
    wantX = goto(v);
    return true;
  }
  const hashLanded = fromHash(location.hash);
  if (hashLanded) retireIntro();
  window.addEventListener('hashchange', () => {
    if (fromHash(location.hash)) retireIntro();
  });

  /* ----------------------------------------------------------- entrance - */

  if (!reduced && resumeAt <= 40 && !hashLanded) {
    scene.classList.add('tr-entrance');
    // The entrance: the world pulls you forward off the gate, so the first
    // painted place slides in from the right and settles centre-left. Nothing
    // is "played" at the user — it is the same motion their thumb makes.
    const to = 345;
    const t0 = performance.now();
    const glide = (now: number) => {
      const k = Math.min(1, (now - t0) / 2100);
      const e = 1 - (1 - k) ** 3;
      road.scrollLeft = to * e;
      if (k < 1) requestAnimationFrame(glide);
      else {
        armFontOnScroll();
        armIntroScroll();
      }
    };
    requestAnimationFrame(glide);
  } else {
    if (resumeAt > 40) scene.classList.add('tr-resumed');
    armFontOnScroll();
    armIntroScroll();
  }

  /**
   * The entrance drives `scrollLeft` itself, so "the road has moved" can only
   * be measured from where the entrance left it — otherwise the glide dismisses
   * the intro before anyone has read it.
   */
  function armIntroScroll() {
    introBase = road.scrollLeft;
    introArmed = true;
  }
}

/* ------------------------------------------------------------- helpers - */

function readJson<T>(id: string): T | null {
  const el = document.getElementById(id);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as T;
  } catch {
    return null;
  }
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

function touchGap(e: TouchEvent) {
  const [a, b] = [e.touches[0]!, e.touches[1]!];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/* --------------------------------------------------------------- motes - */
/**
 * One canvas, one pass, no allocation after setup. The particle count is tied
 * to the viewport so a phone draws about 30 and a desktop about 70; the kind
 * of mote is the age's own (embers in Tretā, lamps in Kali, mist in the
 * Future). Under `prefers-reduced-motion` this whole object is never built.
 */
function makeMotes(scene: HTMLElement) {
  const canvas = scene.querySelector<HTMLCanvasElement>('.tr-motes');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return null;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let colour = '#ffffff';
  let kind = 'dust';
  const P: { x: number; y: number; vx: number; vy: number; r: number; a: number; ph: number }[] = [];

  function resize() {
    // Measured: at DPR 2 the mote canvas alone took the fling from a 17 ms
    // median with a 18 ms p95 (reduced motion, canvas never built) to a 50 ms
    // p95. They are 1–3 px blurred dots; they do not need retina backing.
    dpr = 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = Math.round(clamp((w * h) / 16000, 20, 56));
    while (P.length < want) {
      P.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.06 - Math.random() * 0.24,
        r: 0.7 + Math.random() * 1.9,
        a: 0.2 + Math.random() * 0.6,
        ph: Math.random() * Math.PI * 2,
      });
    }
    P.length = want;
  }
  resize();

  let t = 0;
  function step(dx: number) {
    t += 0.016;
    ctx!.clearRect(0, 0, w, h);
    const drift = clamp(dx, -60, 60) * 0.22;
    for (const p of P) {
      p.x += p.vx - drift * (0.4 + p.r * 0.2);
      p.y += kind === 'mist' ? p.vy * 0.3 : p.vy;
      if (p.y < -12) {
        p.y = h + 8;
        p.x = Math.random() * w;
      }
      if (p.x < -20) p.x = w + 10;
      else if (p.x > w + 20) p.x = -10;
      const tw = kind === 'lamp' || kind === 'firefly' ? 0.45 + 0.55 * Math.sin(t * 2.2 + p.ph) : 1;
      // Mist is the one kind that must stay almost invisible: it sits on the
      // pale Future palette, and anything stronger reads as soap bubbles.
      ctx!.globalAlpha = p.a * tw * (kind === 'mist' ? 0.1 : 0.5);
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.r * (kind === 'mist' ? 3.4 : 1), 0, Math.PI * 2);
      ctx!.fillStyle = colour;
      ctx!.fill();
    }
    ctx!.globalAlpha = 1;
  }

  return {
    step,
    resize,
    recolour(r: { motes: string; moteKind: string }) {
      colour = r.motes;
      kind = r.moteKind;
    },
  };
}
