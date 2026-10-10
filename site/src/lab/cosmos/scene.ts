/**
 * scene.ts — the WebGL half of /lab/cosmos/.
 *
 * The page has already decided (inline, before paint) whether WebGL exists. If
 * it does, `boot()` builds the egg: a painted disc of the seven dvīpas and
 * seven oceans, Meru on the axis, luminous plates for the lokas above and the
 * pātālas below, and one billboard per film at the coordinates world.ts gives
 * it. Everything else on the page — the ladder, the ages rail, the panel, the
 * list dialog, the scrolling fallback — is server-rendered; this file only
 * wires it.
 *
 * Budget notes: one canvas-baked ground texture, one baked texture per film
 * (loaded by proximity), two shared sprite textures, two Points clouds. No
 * post-processing, no shadow maps, no lights (everything is unlit/painted).
 */
import * as THREE from 'three';

/* ------------------------------------------------------------------ types */

interface RingDef {
  r0: number;
  r1: number;
  kind: 'land' | 'sea' | 'gold' | 'wall';
  name: string;
  liquid?: string;
}

interface RealmDef {
  id: string;
  name: string;
  gloss: string;
  y: number;
  plate: number;
  band: 'upper' | 'disc' | 'lower';
  color: number;
  route: string;
  cite: string;
  tick: string;
}

interface AgeDef {
  slug: string;
  short: string;
  route: string;
  sky: string;
  key: string;
  line: string;
}

interface PlaceDef {
  slug: string;
  title: string;
  short: string;
  hi: string | null;
  summary: string;
  where: string;
  realmId: string;
  realmName: string;
  realmGloss: string;
  realmRoute: string;
  cite: string;
  x: number;
  y: number;
  z: number;
  period: string | null;
  periodName: string;
  art400: string | null;
  art800: string | null;
  alt: string;
  videoId: string | null;
  isPublic: boolean;
  duration: string | null;
  filmRoute: string;
  corpusRoute: string | null;
  corpusTitle: string | null;
}

interface Payload {
  discEdge: number;
  defaultSky: string;
  defaultKey: string;
  rings: RingDef[];
  realms: RealmDef[];
  ages: AgeDef[];
  places: PlaceDef[];
}

interface Leaf {
  def: PlaceDef;
  /** The colour of the age this story belongs to. */
  age: THREE.Color;
  sprite: THREE.Sprite;
  glow: THREE.Sprite;
  label: HTMLElement;
  pos: THREE.Vector3;
  /** Sprite width once the art has loaded. */
  full: number;
  loaded: boolean;
  loading: boolean;
  /** 0 while a bud, 1 once the leaf has opened. */
  open: number;
  /** 1 when its age is lit (or no age is), 0.16 when another age is. */
  lit: number;
  litTo: number;
}

/* -------------------------------------------------------------- constants */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = Math.min(window.innerWidth, window.innerHeight) < 760;
const LOW =
  MOBILE ||
  ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) < 4 ||
  (navigator.hardwareConcurrency ?? 8) <= 4;

const TIER = {
  ground: LOW ? 1024 : 1536,
  stars: LOW ? 900 : 1900,
  dust: LOW ? 260 : 620,
  leaf: LOW ? 192 : 256,
  eager: LOW ? 8 : 14,
  labels: LOW ? 9 : 14,
  dpr: LOW ? 1.75 : 2,
};

const LIQUID: Record<string, string> = {
  'salt water': '#2f4a4c',
  'sugarcane juice': '#7c6a33',
  wine: '#5f2f37',
  'clarified butter': '#8e6f32',
  curds: '#b3a894',
  milk: '#e6dac2',
  'sweet water': '#3c5f66',
};

const LAND = ['#6b4a2c', '#5c4a2c', '#8a5334', '#4e3f2b', '#7d5f2f', '#63432f', '#8a6a3a'];

const TMP = new THREE.Vector3();
const NDC = new THREE.Vector2();

/* --------------------------------------------------------------- helpers */

function damp(current: number, goal: number, lambda: number, dt: number): number {
  return goal + (current - goal) * Math.exp(-lambda * dt);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${size}px "EB Garamond", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width + size * 0.16);
  const total = widths.reduce((a, b) => a + b, 0);
  let a = startAngle - total / radius / 2;
  for (let i = 0; i < chars.length; i++) {
    const w = widths[i]!;
    a += w / radius / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    const flip = Math.sin(a) > 0;
    ctx.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(chars[flip ? chars.length - 1 - i : i]!, 0, 0);
    ctx.restore();
    a += w / radius / 2;
  }
  ctx.restore();
}

/* ------------------------------------------------------------- textures */

/** The disc, painted once into a canvas: rings, liquids, Jambudvīpa's varṣas. */
function groundTexture(data: Payload): THREE.CanvasTexture {
  const S = TIER.ground;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const cx = S / 2;
  const k = S / 2 / data.discEdge; // world → px

  ctx.clearRect(0, 0, S, S);

  let landIndex = 0;
  for (const ring of data.rings) {
    let fill = '#2a211a';
    if (ring.kind === 'land') fill = LAND[landIndex++ % LAND.length]!;
    else if (ring.kind === 'sea') fill = LIQUID[ring.liquid ?? ''] ?? '#33474d';
    else if (ring.kind === 'gold') fill = '#a8813a';
    else if (ring.kind === 'wall') fill = '#241c17';

    ctx.beginPath();
    ctx.arc(cx, cx, ring.r1 * k, 0, Math.PI * 2);
    ctx.arc(cx, cx, ring.r0 * k, 0, Math.PI * 2, true);
    ctx.fillStyle = fill;
    ctx.fill();

    // A painted grain: radial strokes, lighter on the sunward side.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cx, ring.r1 * k, 0, Math.PI * 2);
    ctx.arc(cx, cx, ring.r0 * k, 0, Math.PI * 2, true);
    ctx.clip();
    const strokes = ring.kind === 'sea' ? 200 : 150;
    for (let i = 0; i < strokes; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = (ring.r0 + Math.random() * (ring.r1 - ring.r0)) * k;
      const len = (0.3 + Math.random() * 0.9) * (ring.r1 - ring.r0) * k * 0.5;
      ctx.strokeStyle = Math.random() > 0.45 ? 'rgba(255,232,196,0.055)' : 'rgba(0,0,0,0.075)';
      ctx.lineWidth = 1 + Math.random() * 2.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r, cx + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a + 0.04) * (r + len), cx + Math.sin(a + 0.04) * (r + len));
      ctx.stroke();
    }
    ctx.restore();

    // Shoreline
    ctx.beginPath();
    ctx.arc(cx, cx, ring.r1 * k, 0, Math.PI * 2);
    ctx.strokeStyle = ring.kind === 'gold' ? 'rgba(255,222,150,0.5)' : 'rgba(12,8,5,0.42)';
    ctx.lineWidth = Math.max(1, S / 900);
    ctx.stroke();
  }

  // Jambudvīpa's varṣas — the six ranges either side of Ilāvṛta, plus the
  // southern land that matters (Bhārata). 06-sacred-geography/meru-…md §II.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, 9 * k, 0, Math.PI * 2);
  ctx.clip();
  const bands = [-3.6, -2.4, -1.2, 1.2, 2.4, 3.6];
  for (const b of bands) {
    ctx.fillStyle = 'rgba(236,196,124,0.30)';
    ctx.fillRect(0, cx + b * k - S * 0.004, S, S * 0.008);
    ctx.fillStyle = 'rgba(40,24,12,0.24)';
    ctx.fillRect(0, cx + b * k + S * 0.004, S, S * 0.005);
  }
  // Bhārata-varṣa, the karma-bhūmi, kept warm and slightly redder.
  const g = ctx.createLinearGradient(0, cx + 4 * k, 0, cx + 9 * k);
  g.addColorStop(0, 'rgba(180,86,52,0.0)');
  g.addColorStop(1, 'rgba(180,86,52,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, cx + 4 * k, S, 5 * k);
  ctx.restore();

  // The lotus of Meru at the centre — a rose of eight petals.
  ctx.save();
  ctx.translate(cx, cx);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, -1.6 * k, 0.85 * k, 1.8 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(238,196,120,0.09)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(246,214,150,0.16)';
    ctx.lineWidth = Math.max(1, S / 1100);
    ctx.stroke();
  }
  ctx.restore();

  // Names, set into the map itself.
  for (const ring of data.rings) {
    if (ring.kind === 'wall') continue;
    const rMid = ((ring.r0 + ring.r1) / 2) * k;
    if (rMid < 2.6 * k) continue;
    const size = Math.max(9, S / 118);
    const colour = ring.kind === 'sea' ? 'rgba(246,232,206,0.3)' : 'rgba(255,236,206,0.22)';
    arcText(ctx, ring.name.toUpperCase(), cx, cx, rMid, -Math.PI / 2, size, colour);
    arcText(ctx, ring.name.toUpperCase(), cx, cx, rMid, Math.PI / 2, size, colour);
  }
  arcText(ctx, 'BHĀRATA-VARṢA', cx, cx, 7 * k, Math.PI / 2, Math.max(10, S / 92), 'rgba(255,224,190,0.62)');

  // Light falls from the axis: brighten the middle, drown the rim.
  const glow = ctx.createRadialGradient(cx, cx, 0, cx, cx, S / 2);
  glow.addColorStop(0, 'rgba(255,206,132,0.16)');
  glow.addColorStop(0.34, 'rgba(255,190,110,0.05)');
  glow.addColorStop(0.74, 'rgba(14,9,6,0.08)');
  glow.addColorStop(1, 'rgba(10,6,4,0.42)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cx, S / 2, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A soft round glow, used behind every leaf and as the plate wash. */
function glowTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.22, 'rgba(255,236,200,0.42)');
  g.addColorStop(0.55, 'rgba(255,206,140,0.12)');
  g.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The unopened bud: what a place looks like before its art has arrived. */
function budTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,240,206,0.9)');
  g.addColorStop(0.18, 'rgba(240,196,120,0.5)');
  g.addColorStop(0.5, 'rgba(220,160,80,0.14)');
  g.addColorStop(1, 'rgba(220,160,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.21, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,226,170,0.7)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A vertical wash, used for Meru's stone and for the god-ray. */
function gradientTexture(stops: [number, string][], w = 8, h = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, h, 0, 0);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A film still, framed in gold on a dark leaf, ready to hang in the sky. */
function bakeLeaf(img: HTMLImageElement): HTMLCanvasElement {
  const W = TIER.leaf;
  const H = Math.round((W * 9) / 16);
  const pad = Math.round(W * 0.115);
  const c = document.createElement('canvas');
  c.width = W + pad * 2;
  c.height = H + pad * 2;
  const ctx = c.getContext('2d')!;
  const r = Math.max(3, W * 0.028);

  ctx.save();
  ctx.shadowColor = 'rgba(244,196,110,0.75)';
  ctx.shadowBlur = pad * 1.05;
  ctx.fillStyle = '#150e09';
  roundRect(ctx, pad, pad, W, H, r);
  ctx.fill();
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, pad, pad, W, H, r);
  ctx.clip();
  ctx.drawImage(img, pad, pad, W, H);
  // Seat the picture in the warm night it hangs in.
  ctx.fillStyle = 'rgba(38,20,9,0.20)';
  ctx.fillRect(pad, pad, W, H);
  const vg = ctx.createLinearGradient(0, pad, 0, pad + H);
  vg.addColorStop(0, 'rgba(0,0,0,0.18)');
  vg.addColorStop(0.45, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(14,8,4,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(pad, pad, W, H);
  ctx.restore();

  ctx.strokeStyle = 'rgba(246,214,152,0.8)';
  ctx.lineWidth = Math.max(1, W / 150);
  roundRect(ctx, pad + 0.5, pad + 0.5, W - 1, H - 1, r);
  ctx.stroke();
  return c;
}

/* ------------------------------------------------------------------ boot */

export function boot(): void {
  const raw = document.getElementById('cos-data')?.textContent;
  if (!raw) return;
  const data = JSON.parse(raw) as Payload;

  const canvas = document.getElementById('cos-canvas') as HTMLCanvasElement | null;
  if (!canvas || !document.body.classList.contains('cos-gl')) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, alpha: false, powerPreference: 'high-performance' });
  } catch {
    document.body.classList.remove('cos-gl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TIER.dpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const sky = new THREE.Color(data.defaultSky);
  const skyGoal = new THREE.Color(data.defaultSky);
  const keyColor = new THREE.Color(data.defaultKey);
  const keyGoal = new THREE.Color(data.defaultKey);
  /** What the age does to the painted ground — white when no age is chosen. */
  const wash = new THREE.Color(0xffffff);
  const washGoal = new THREE.Color(0xffffff);
  const washFor = (hex: string | null) => {
    if (!hex) return new THREE.Color(0xffffff);
    const c = new THREE.Color(hex);
    // Keep the hue, throw away most of the saturation, keep it bright: the map
    // should read as *lit* by the age, not painted over by it.
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    return new THREE.Color().setHSL(hsl.h, Math.min(0.44, hsl.s * 0.62), 0.84);
  };
  scene.background = sky;
  scene.fog = new THREE.FogExp2(sky.getHex(), 0.0055);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.4, 400);

  /* ---------------------------------------------------------- the world - */

  const world = new THREE.Group();
  scene.add(world);

  // The disc.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(data.discEdge, 128),
    new THREE.MeshBasicMaterial({ map: groundTexture(data), transparent: true, fog: true }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0;
  world.add(disc);

  const glowTex = glowTexture();
  const budTex = budTexture();

  // The ocean of milk, given its own shimmer.
  const milk = data.rings.find((r) => r.liquid === 'milk');
  let milkRing: THREE.Mesh | null = null;
  if (milk) {
    milkRing = new THREE.Mesh(
      new THREE.RingGeometry(milk.r0, milk.r1, 128),
      new THREE.MeshBasicMaterial({
        color: 0xf6ecd6,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    milkRing.rotation.x = -Math.PI / 2;
    milkRing.position.y = 0.03;
    world.add(milkRing);
  }

  // Lokāloka — the wall at the rim, beyond Kāñcanī-bhūmi, where the light of
  // the sun stops. (06-sacred-geography/meru-kailash-and-cosmic-mountains.md)
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(data.discEdge, data.discEdge, 2.6, 128, 1, true),
    new THREE.MeshBasicMaterial({
      map: gradientTexture([
        [0, '#120c08'],
        [0.55, '#2c2016'],
        [0.94, '#6d4f25'],
        [1, '#c79a4e'],
      ]),
      side: THREE.DoubleSide,
      fog: true,
    }),
  );
  wall.position.y = 1.2;
  world.add(wall);

  // Meru — 84,000 above, 16,000 sunk; broader at the summit than at the base.
  // Meru's face: a vertical wash for the stone, times a cosine round the
  // cylinder so the seven faces catch the light differently.
  const meruTex = (() => {
    const W = 128;
    const H = 128;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, H, 0, 0);
    g.addColorStop(0, '#22150a');
    g.addColorStop(0.32, '#5d3d17');
    g.addColorStop(0.7, '#a3722e');
    g.addColorStop(0.92, '#cf9c4c');
    g.addColorStop(1, '#eec684');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H);
    for (let x = 0; x < W; x++) {
      const k = 0.46 + 0.54 * Math.max(0, Math.cos((x / W) * Math.PI * 2));
      for (let y = 0; y < H; y++) {
        const i = (y * W + x) * 4;
        img.data[i] = img.data[i]! * k;
        img.data[i + 1] = img.data[i + 1]! * k;
        img.data[i + 2] = img.data[i + 2]! * k;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const meru = new THREE.Mesh(
    new THREE.CylinderGeometry(1.62, 0.81, 13, 9, 1, false),
    new THREE.MeshBasicMaterial({ map: meruTex, fog: true }),
  );
  meru.position.y = 4.5;
  world.add(meru);

  for (const ty of [1.0, 4.4, 7.8]) {
    const terrace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 + 0.81 + (ty / 13) * 0.81, 0.05 + 0.81 + (ty / 13) * 0.81, 0.09, 9),
      new THREE.MeshBasicMaterial({ color: 0x6a481f, fog: true }),
    );
    terrace.position.y = ty;
    world.add(terrace);
  }

  // Brahmapurī on the summit.
  const summit = new THREE.Mesh(
    new THREE.CylinderGeometry(1.72, 1.62, 0.34, 9),
    new THREE.MeshBasicMaterial({ color: 0xc79a55, fog: true }),
  );
  summit.position.y = 11.1;
  world.add(summit);
  // Brahmā's city on the plateau, and the Lokapālas' eight around it.
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 1.15, 8),
    new THREE.MeshBasicMaterial({ color: 0xdcae63, fog: true }),
  );
  spire.position.y = 11.8;
  world.add(spire);
  const crown = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffd08a,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  crown.position.y = 11.9;
  crown.scale.set(9.0, 3.2, 1);
  world.add(crown);

  // Two mountains that the corpus keeps distinct from Meru, and that stories
  // are hung on: Kailāsa in the north (Meru & Kailāsa §IV) and the Vindhya in
  // the middle of Bhārata (Devī Māhātmya).
  function mountain(radius: number, az: number, h: number, r: number, top: string, base: string) {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 6),
      new THREE.MeshBasicMaterial({ map: gradientTexture([[0, base], [0.55, base], [1, top]]), fog: true }),
    );
    m.position.set(Math.sin(az) * radius, h / 2, Math.cos(az) * radius);
    world.add(m);
    return m;
  }
  mountain(7.4, 0.35, 3.2, 1.0, '#e8d9c0', '#8a6f52');
  mountain(5.2, 4.0, 2.6, 1.05, '#b8664a', '#42261f');

  // The god-ray: light standing off the summit.
  const rayTex = (() => {
    const W = 128;
    const H = 256;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const v = y / H; // 0 at the top of the canvas, 1 at its foot
      const up = Math.pow(v, 1.5); // brightest where it leaves the summit
      for (let x = 0; x < W; x++) {
        const u = Math.abs(x / W - 0.5) * 2;
        const across = Math.max(0, 1 - u * u);
        const a = up * across * across * 255;
        const i = (y * W + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = 226;
        img.data[i + 2] = 176;
        img.data[i + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const ray = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: rayTex,
      color: 0xffd39a,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  ray.position.y = 24;
  ray.scale.set(15, 30, 1);
  world.add(ray);

  // The luminous plates: one per loka above, one per pātāla below.
  const plates: { mesh: THREE.Mesh; base: number; realm: RealmDef }[] = [];
  for (const r of data.realms) {
    if (r.plate <= 0) continue;
    const mat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: new THREE.Color(r.color),
      transparent: true,
      opacity: r.band === 'lower' ? 0.4 : 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r.plate * 2.6, r.plate * 2.6), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = r.y;
    world.add(mesh);
    plates.push({ mesh, base: mat.opacity, realm: r });

    // A thin ring drawn on the plate makes it read as a floor, not a fog.
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(r.plate * 0.97, r.plate, 96),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(r.color),
        transparent: true,
        opacity: r.band === 'lower' ? 0.3 : 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    );
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = r.y;
    world.add(edge);
  }

  // The axis itself, drawn faintly from Garbhodaka to Satyaloka.
  const axis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 84, 6, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xf0c884,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  axis.position.y = 4;
  world.add(axis);

  /* ------------------------------------------------------------- stars - */

  function cloud(count: number, radius: number, spread: number, size: number, warm: boolean): THREE.Points {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const r = radius + Math.random() * spread;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(a) * s * r;
      pos[i * 3 + 1] = u * r * 0.86 + 4;
      pos[i * 3 + 2] = Math.sin(a) * s * r;
      const t = Math.random();
      if (warm) c.setHSL(0.09 + t * 0.04, 0.5, 0.62 + t * 0.3);
      else c.setHSL(0.08 + t * 0.06, 0.35, 0.5 + t * 0.4);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size,
        map: glowTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        fog: false,
      }),
    );
  }

  // The pātālas are lit by the crest-gems of the serpents, not by any sun
  // (00-time-and-cosmology/bila-svarga-and-the-patalas.md §2). Scatter them.
  {
    const n = LOW ? 260 : 520;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 15;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = -4 - Math.random() * 33;
      pos[i * 3 + 2] = Math.sin(a) * r;
      const t = Math.random();
      c.setHSL(t < 0.55 ? 0.09 + t * 0.05 : 0.44 + t * 0.12, 0.62, 0.52 + Math.random() * 0.28);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const gems = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.85,
        map: glowTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        fog: false,
      }),
    );
    world.add(gems);
  }

  const stars = cloud(TIER.stars, 120, 90, 1.5, false);
  scene.add(stars);
  const dust = cloud(TIER.dust, 6, 26, 0.5, true);
  dust.position.y = 2;
  world.add(dust);

  /* ------------------------------------------------------------- leaves - */

  const labelHost = document.getElementById('cos-labels')!;
  const leaves: Leaf[] = [];
  const pickables: THREE.Object3D[] = [];
  const bySlug = new Map<string, Leaf>();

  const ageColor = new Map(data.ages.map((a) => [a.slug, new THREE.Color(a.key)]));

  for (const def of data.places) {
    const ageTint = (def.period && ageColor.get(def.period)) || new THREE.Color(data.defaultKey);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: ageTint.clone(),
      transparent: true,
      opacity: def.isPublic ? 0.55 : 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.position.set(def.x, def.y, def.z);
    glow.scale.setScalar(2.6);
    world.add(glow);

    const mat = new THREE.SpriteMaterial({
      map: budTex,
      transparent: true,
      opacity: def.isPublic ? 1 : 0.55,
      depthWrite: false,
      fog: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(def.x, def.y, def.z);
    sprite.scale.set(1.5, 1.5, 1);
    sprite.userData.slug = def.slug;
    world.add(sprite);
    pickables.push(sprite);

    const label = document.createElement('div');
    label.className = 'cos-label';
    label.innerHTML = `<b></b><i></i>`;
    (label.firstChild as HTMLElement).textContent = def.short;
    (label.lastChild as HTMLElement).textContent = def.isPublic ? def.realmName : `${def.realmName} · soon`;
    labelHost.appendChild(label);

    const leaf: Leaf = {
      def,
      age: ageTint,
      sprite,
      glow,
      label,
      pos: new THREE.Vector3(def.x, def.y, def.z),
      full: def.isPublic ? 3.05 : 2.6,
      loaded: false,
      loading: false,
      open: 0,
      lit: 1,
      litTo: 1,
    };
    leaves.push(leaf);
    bySlug.set(def.slug, leaf);
  }

  // Realm names, floating on the near side of each plate.
  const realmLabels = data.realms.map((r) => {
    const el = document.createElement('div');
    el.className = 'cos-label is-realm';
    el.innerHTML = `<b></b><i></i>`;
    (el.firstChild as HTMLElement).textContent = r.name;
    (el.lastChild as HTMLElement).textContent = r.band === 'lower' ? 'below' : r.band === 'disc' ? 'the disc' : 'above';
    labelHost.appendChild(el);
    return { realm: r, el, pos: new THREE.Vector3() };
  });

  /* -------------------------------------------------- texture streaming - */

  function loadLeaf(leaf: Leaf) {
    if (leaf.loaded || leaf.loading || !leaf.def.art400) return;
    leaf.loading = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const tex = new THREE.CanvasTexture(bakeLeaf(img));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 2;
      const old = leaf.sprite.material.map;
      leaf.sprite.material.map = tex;
      leaf.sprite.material.needsUpdate = true;
      if (old && old !== budTex) old.dispose();
      leaf.loaded = true;
      dirty = true;
    };
    img.onerror = () => {
      // Give up on this one. `loading` stays true, so the streamer never comes
      // back to it and the place keeps its bud rather than flickering.
      leaf.loading = true;
    };
    img.src = leaf.def.art400;
  }

  let streamAt = 0;
  function stream(now: number) {
    if (now - streamAt < 420) return;
    streamAt = now;
    const pending = leaves.filter((l) => !l.loaded && !l.loading);
    if (pending.length === 0) return;
    pending.sort(
      (a, b) => a.pos.distanceToSquared(camera.position) - b.pos.distanceToSquared(camera.position),
    );
    for (let i = 0; i < 2 && i < pending.length; i++) loadLeaf(pending[i]!);
  }

  /* ------------------------------------------------------------ camera - */

  const cam = { az: 3.28, ty: 8.4, radius: 58, polar: 0.78 };
  const goal = { az: 3.72, ty: 4.6, radius: 36, polar: 1.04 };
  let lambda = 1.15;
  let lookOffset = 0;
  let lookOffsetGoal = 0;
  const AZ_V = { v: 0 };
  const TY_V = { v: 0 };

  const R_MIN = 5;
  const R_MAX = 112;
  const Y_MIN = -40;
  const Y_MAX = 47;

  function poseFor(y: number, radius: number, polar?: number) {
    goal.ty = Math.max(Y_MIN, Math.min(Y_MAX, y));
    goal.radius = Math.max(R_MIN, Math.min(R_MAX, radius));
    if (polar !== undefined) goal.polar = polar;
    lambda = 1.9;
  }

  /** The tilt the world wants at a given altitude: look down onto the disc,
   *  level in the sky, up from beneath. */
  function naturalPolar(y: number): number {
    if (y > 6) return 1.5;
    if (y < -4) return 1.72;
    return 1.16 + (6 - y) * 0.01;
  }

  function place3(v: THREE.Vector3, az: number, ty: number, radius: number, polar: number) {
    const s = Math.sin(polar);
    v.set(Math.sin(az) * s * radius, ty + Math.cos(polar) * radius, Math.cos(az) * s * radius);
  }

  /* ------------------------------------------------------------ gestures */

  let dragging = false;
  let pinching = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let pinchDist = 0;
  let downAt = 0;
  let downX = 0;
  let downY = 0;
  let idleSince = performance.now();
  const pointers = new Map<number, { x: number; y: number }>();

  function poke() {
    idleSince = performance.now();
    killOverture();
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true;
      moved = 0;
      lastX = downX = e.clientX;
      lastY = downY = e.clientY;
      downAt = performance.now();
      AZ_V.v = 0;
      TY_V.v = 0;
    } else if (pointers.size === 2) {
      dragging = false;
      pinching = true;
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
    poke();
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pinching && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinchDist > 0) {
        goal.radius = Math.max(R_MIN, Math.min(R_MAX, goal.radius * (pinchDist / Math.max(1, d))));
        lambda = 7;
      }
      pinchDist = d;
      poke();
      dirty = true;
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    const scale = Math.max(0.42, Math.min(2.2, goal.radius / 30));
    AZ_V.v = -dx * 0.0055;
    TY_V.v = dy * 0.026 * scale;
    goal.az += AZ_V.v;
    goal.ty = Math.max(Y_MIN, Math.min(Y_MAX, goal.ty + TY_V.v));
    goal.polar = damp(goal.polar, naturalPolar(goal.ty), 3, 0.05);
    lambda = 9;
    poke();
    dirty = true;
  });

  function endPointer(e: PointerEvent) {
    const had = pointers.has(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinching = false;
    if (pointers.size === 0) {
      if (dragging && had && moved < 9 && performance.now() - downAt < 620) tap(downX, downY);
      dragging = false;
      lambda = 3.4;
    }
    poke();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      goal.radius = Math.max(R_MIN, Math.min(R_MAX, goal.radius * Math.exp(e.deltaY * 0.0011)));
      lambda = 6;
      poke();
      dirty = true;
    },
    { passive: false },
  );

  /* ---------------------------------------------------------- the panel - */

  const panel = document.getElementById('cos-panel') as HTMLElement;
  const panelTitle = document.getElementById('cos-panel-title') as HTMLElement;
  const panelHi = document.getElementById('cos-hi') as HTMLElement;
  const panelSum = document.getElementById('cos-sum') as HTMLElement;
  const panelNote = document.getElementById('cos-note') as HTMLElement;
  const panelWhere = document.getElementById('cos-where') as HTMLElement;
  const panelLinks = document.getElementById('cos-links') as HTMLElement;
  const art = document.getElementById('cos-art') as HTMLElement;
  const artImg = document.getElementById('cos-art-img') as HTMLImageElement;
  const play = document.getElementById('cos-play') as HTMLButtonElement;
  const closeBtn = document.getElementById('cos-panel-close') as HTMLButtonElement;

  let openSlug: string | null = null;
  let restore: typeof goal | null = null;
  let lastFocus: HTMLElement | null = null;

  function openPlace(slug: string, from?: { x: number; y: number }) {
    const leaf = bySlug.get(slug);
    if (!leaf) return;
    const d = leaf.def;
    if (openSlug !== slug) restore = restore ?? { ...goal };
    openSlug = slug;
    const active = document.activeElement;
    lastFocus = active instanceof HTMLElement && active !== document.body ? active : canvas;

    // Fly: stand off the leaf at its own azimuth, a little below it so the
    // panel does not sit on top of the picture.
    const r = Math.hypot(d.x, d.z);
    const az = Math.atan2(d.x, d.z);
    let a = az;
    while (a - goal.az > Math.PI) a -= Math.PI * 2;
    while (a - goal.az < -Math.PI) a += Math.PI * 2;
    goal.az = a;
    goal.ty = d.y;
    goal.radius = Math.max(7.5, r * 0.35 + 8.5);
    goal.polar = 1.5;
    lambda = REDUCED ? 40 : 2.1;
    lookOffsetGoal = window.innerWidth < 900 ? -2.1 : 0;

    loadLeaf(leaf);

    panelTitle.textContent = d.title;
    panelHi.textContent = d.hi ?? '';
    panelHi.hidden = !d.hi;
    panelSum.textContent = d.summary;
    panelNote.textContent = d.where;
    panelWhere.innerHTML = '';
    const bits: string[] = [d.realmName, d.periodName];
    if (d.duration && d.isPublic) bits.push(d.duration);
    bits.forEach((t, i) => {
      const el = document.createElement(i === 0 ? 'b' : 'span');
      el.textContent = t;
      panelWhere.appendChild(el);
      if (i < bits.length - 1) {
        const s = document.createElement('s');
        s.textContent = '·';
        panelWhere.appendChild(s);
      }
    });

    art.classList.remove('is-playing');
    art.querySelector('iframe')?.remove();
    artImg.src = d.art800 ?? d.art400 ?? '';
    artImg.alt = d.alt;
    play.hidden = !d.videoId;

    panelLinks.innerHTML = '';
    if (!d.isPublic) {
      const soon = document.createElement('span');
      soon.className = 'cos-soon';
      soon.textContent = 'Film coming soon';
      panelLinks.appendChild(soon);
    }
    if (d.corpusRoute) {
      const a1 = document.createElement('a');
      a1.href = d.corpusRoute;
      a1.textContent = 'Read the story';
      panelLinks.appendChild(a1);
    }
    const a2 = document.createElement('a');
    a2.href = d.filmRoute;
    a2.textContent = 'Film page';
    panelLinks.appendChild(a2);
    const a3 = document.createElement('a');
    a3.href = d.realmRoute;
    a3.textContent = d.cite;
    panelLinks.appendChild(a3);

    panel.hidden = false;
    if (from && !REDUCED) {
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty('--ox', `${from.x - rect.left - rect.width / 2}px`);
      panel.style.setProperty('--oy', `${from.y - rect.top - rect.height / 2}px`);
    } else {
      panel.style.setProperty('--ox', '0px');
      panel.style.setProperty('--oy', '30px');
    }
    panel.classList.add('is-entering');
    panel.classList.remove('is-open');
    requestAnimationFrame(() => {
      panel.classList.remove('is-entering');
      panel.classList.add('is-open');
    });
    closeBtn.focus({ preventScroll: true });
    dirty = true;
  }

  function closePanel() {
    if (!openSlug) return;
    openSlug = null;
    panel.classList.remove('is-open');
    panel.classList.add('is-entering');
    art.querySelector('iframe')?.remove();
    art.classList.remove('is-playing');
    lookOffsetGoal = 0;
    if (restore) {
      Object.assign(goal, restore);
      restore = null;
      lambda = REDUCED ? 40 : 2.4;
    }
    window.setTimeout(() => {
      if (!openSlug) panel.hidden = true;
    }, REDUCED ? 130 : 320);
    lastFocus?.focus({ preventScroll: true });
    dirty = true;
  }

  closeBtn.addEventListener('click', closePanel);
  play.addEventListener('click', () => {
    const d = openSlug ? bySlug.get(openSlug)?.def : null;
    if (!d?.videoId) return;
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${d.videoId}?autoplay=1&rel=0&modestbranding=1`;
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    frame.title = d.title;
    art.appendChild(frame);
    art.classList.add('is-playing');
  });

  /* --------------------------------------------------------------- taps - */

  const raycaster = new THREE.Raycaster();
  // `tap` is hoisted above the null-guard above, so it needs its own handle.
  const view: HTMLCanvasElement = canvas;
  function tap(x: number, y: number) {
    const rect = view.getBoundingClientRect();
    NDC.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(NDC, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    for (const h of hits) {
      const slug = h.object.userData.slug as string | undefined;
      const leaf = slug ? bySlug.get(slug) : null;
      if (leaf && leaf.lit > 0.5) {
        openPlace(slug!, { x, y });
        return;
      }
    }
    if (openSlug) closePanel();
  }

  // Desktop hover: the leaf under the cursor lifts and the cursor changes.
  let hovered: Leaf | null = null;
  let hoverAt = 0;
  if (window.matchMedia('(hover: hover)').matches) {
    canvas.addEventListener('pointermove', (e) => {
      if (dragging || pinching) return;
      const now = performance.now();
      if (now - hoverAt < 70) return;
      hoverAt = now;
      const rect = canvas.getBoundingClientRect();
      NDC.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(NDC, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      const slug = hit?.object.userData.slug as string | undefined;
      const leaf = slug ? bySlug.get(slug) ?? null : null;
      const next = leaf && leaf.lit > 0.5 ? leaf : null;
      if (next !== hovered) {
        hovered = next;
        canvas.style.cursor = next ? 'pointer' : '';
        dirty = true;
      }
    });
  }

  /* ------------------------------------------------------------- ladder - */

  const ticks = [...document.querySelectorAll<HTMLButtonElement>('.cos-tick')];
  for (const t of ticks) {
    t.addEventListener('click', () => {
      const realm = data.realms.find((r) => r.id === t.dataset.realm);
      if (!realm) return;
      closePanel();
      const span = realm.plate > 0 ? realm.plate : 8;
      poseFor(realm.y, Math.max(11, span * 1.75), naturalPolar(realm.y));
      poke();
      // Empty realms still lead somewhere: the rail carries the corpus page.
      railLine(`<b>${realm.name}.</b> ${realm.gloss} <a href="${realm.route}">${realm.cite}</a>`);
    });
  }

  function syncLadder() {
    let best: string | null = null;
    let bestD = Infinity;
    for (const r of data.realms) {
      const d = Math.abs(r.y - cam.ty);
      if (d < bestD) {
        bestD = d;
        best = r.id;
      }
    }
    for (const t of ticks) t.setAttribute('aria-current', t.dataset.realm === best ? 'true' : 'false');
  }

  /* ---------------------------------------------------------- ages rail - */

  const railText = document.getElementById('cos-rail-line') as HTMLElement;
  const ageBtns = [...document.querySelectorAll<HTMLButtonElement>('.cos-age')];
  let activeAge = '';
  let railTimer = 0;

  function railLine(html: string) {
    railText.innerHTML = html;
    window.clearTimeout(railTimer);
    railTimer = window.setTimeout(() => {
      if (!activeAge) railText.innerHTML = '<b>The whole egg.</b> Drag to turn and to climb; pinch to come closer.';
      else {
        const a = data.ages.find((x) => x.slug === activeAge);
        if (a) railText.innerHTML = `<b>${a.short}.</b> ${a.line}`;
      }
    }, 5200);
  }

  function setAge(slug: string) {
    activeAge = slug;
    const age = data.ages.find((a) => a.slug === slug);
    for (const b of ageBtns) b.setAttribute('aria-pressed', (b.dataset.age ?? '') === slug ? 'true' : 'false');
    skyGoal.set(age ? age.sky : data.defaultSky);
    keyGoal.set(age ? age.key : data.defaultKey);
    washGoal.copy(washFor(age ? age.key : null));
    document.documentElement.style.setProperty('--cos-key', age ? age.key : data.defaultKey);
    window.clearTimeout(railTimer);
    railText.innerHTML = age
      ? `<b>${age.short}.</b> ${age.line}`
      : '<b>The whole egg.</b> Drag to turn and to climb; pinch to come closer.';

    const lit = leaves.filter((l) => !slug || l.def.period === slug);
    for (const l of leaves) l.litTo = !slug || l.def.period === slug ? 1 : 0.14;

    if (slug && lit.length) {
      closePanel();
      // Frame the age: the mean altitude, far enough back that the whole band
      // of it is in shot. When the age is spread round the disc (Bhārata's
      // stories run through 170° of it) the turntable stays where it is —
      // spinning to a meaningless "centroid" only disorients.
      let sy = 0;
      let sx = 0;
      let sz = 0;
      let maxR = 0;
      for (const l of lit) {
        sy += l.def.y;
        sx += l.def.x;
        sz += l.def.z;
        maxR = Math.max(maxR, Math.hypot(l.def.x, l.def.z));
      }
      const n = lit.length;
      const azs = lit.map((l) => Math.atan2(l.def.x, l.def.z));
      const spread = Math.hypot(sx / n, sz / n) / Math.max(0.001, maxR); // 0 = all round, 1 = one spot
      if (spread > 0.45 && azs.length) {
        let a = Math.atan2(sx / n, sz / n);
        while (a - goal.az > Math.PI) a -= Math.PI * 2;
        while (a - goal.az < -Math.PI) a += Math.PI * 2;
        goal.az = a;
      }
      // The mean, not the midpoint: one story in Mahātala must not drag the
      // whole of Dvāpara under the disc.
      const my = sy / n;
      poseFor(my, Math.max(30, Math.min(76, maxR * 2.9 + 13)), naturalPolar(my));
      lambda = REDUCED ? 40 : 1.7;
    }
    dirty = true;
  }

  for (const b of ageBtns) {
    b.addEventListener('click', () => {
      const slug = b.dataset.age ?? '';
      setAge(slug === activeAge ? '' : slug);
      poke();
    });
  }

  /* ---------------------------------------------------- list + hotspots - */

  const dialog = document.getElementById('cos-list') as HTMLDialogElement;
  document.getElementById('cos-open-list')?.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else location.hash = '#cos-all';
  });

  for (const btn of document.querySelectorAll<HTMLButtonElement>('#cos-hotspots button')) {
    btn.addEventListener('click', () => {
      const r = btn.getBoundingClientRect();
      openPlace(btn.dataset.slug!, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
    btn.addEventListener('focus', () => {
      const leaf = bySlug.get(btn.dataset.slug!);
      if (!leaf || openSlug) return;
      const az = Math.atan2(leaf.def.x, leaf.def.z);
      let a = az;
      while (a - goal.az > Math.PI) a -= Math.PI * 2;
      while (a - goal.az < -Math.PI) a += Math.PI * 2;
      goal.az = a;
      poseFor(leaf.def.y, Math.hypot(leaf.def.x, leaf.def.z) * 0.35 + 10, 1.5);
      poke();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dialog.open) return;
      closePanel();
    }
  });

  /* ------------------------------------------------- overture and hint - */

  const overture = document.getElementById('cos-overture');
  let overtureDead = false;
  function killOverture() {
    if (overtureDead) return;
    overtureDead = true;
    overture?.remove();
    maybeHint();
  }
  window.setTimeout(killOverture, REDUCED ? 1200 : 3150);

  const hint = document.getElementById('cos-hint') as HTMLElement;
  let hintShown = false;
  function maybeHint() {
    if (hintShown) return;
    hintShown = true;
    let seen = false;
    try {
      seen = localStorage.getItem('cos-hint-v1') === '1';
    } catch {
      seen = false;
    }
    if (seen) return;
    hint.hidden = false;
    (document.getElementById('cos-hint-go') as HTMLButtonElement)?.focus({ preventScroll: true });
  }
  function dismissHint() {
    if (hint.hidden) return;
    hint.hidden = true;
    try {
      localStorage.setItem('cos-hint-v1', '1');
    } catch {
      /* private mode — the hint simply returns next time */
    }
    poke();
  }
  document.getElementById('cos-hint-go')?.addEventListener('click', dismissHint);
  hint.addEventListener('pointerdown', dismissHint);

  /* --------------------------------------------------------------- loop - */

  let dirty = true;
  let raf = 0;
  let last = performance.now();
  let width = 0;
  let height = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === width && h === height) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  window.addEventListener('resize', resize);
  resize();

  const shown = new Set<HTMLElement>();

  function updateLabels() {
    // Only the nearest few carry a name; the rest stay glimmers.
    const cands = leaves
      .filter((l) => l.lit > 0.5)
      .map((l) => ({ l, d: l.pos.distanceToSquared(camera.position) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, TIER.labels);
    const keep = new Set<HTMLElement>();
    const taken: { x: number; y: number }[] = [];
    // Keep the chrome's own lanes clear: the wordmark, the ladder, the rail.
    const topSafe = 72;
    const botSafe = height - 152;
    const rightSafe = width - 62;

    for (const { l } of cands) {
      TMP.copy(l.pos).project(camera);
      const on = TMP.z < 1 && Math.abs(TMP.x) < 1.02 && Math.abs(TMP.y) < 1.02;
      if (!on) continue;
      let x = (TMP.x * 0.5 + 0.5) * width;
      const dist = Math.sqrt(l.pos.distanceToSquared(camera.position));
      const lift = (l.full * 0.5 * height) / (2 * dist * Math.tan((camera.fov * Math.PI) / 360));
      const y = (-TMP.y * 0.5 + 0.5) * height + lift * 0.62;
      if (y < topSafe || y > botSafe) continue;
      const half = (l.label.offsetWidth || 90) / 2 + 8;
      x = Math.max(half, Math.min(rightSafe - half, x));
      // One name per patch of sky — nothing is worse than a heap of type.
      let clash = false;
      for (const t of taken) {
        if (Math.abs(t.y - y) < 34 && Math.abs(t.x - x) < 150) {
          clash = true;
          break;
        }
      }
      if (clash) continue;
      taken.push({ x, y });
      l.label.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translateX(-50%)`;
      keep.add(l.label);
      if (!shown.has(l.label)) {
        l.label.classList.add('is-on');
        shown.add(l.label);
      }
    }

    for (const rl of realmLabels) {
      const near = Math.abs(rl.realm.y - cam.ty) < 4.6 && !openSlug;
      if (!near) continue;
      const span = rl.realm.plate > 0 ? rl.realm.plate * 0.62 : 3.2;
      rl.pos.set(Math.sin(cam.az) * span, rl.realm.y + 0.5, Math.cos(cam.az) * span);
      TMP.copy(rl.pos).project(camera);
      if (TMP.z >= 1 || Math.abs(TMP.x) > 1.05 || Math.abs(TMP.y) > 1.05) continue;
      const x = (TMP.x * 0.5 + 0.5) * width;
      const y = (-TMP.y * 0.5 + 0.5) * height;
      if (y < topSafe || y > botSafe || x > rightSafe || x < 8) continue;
      let clash = false;
      for (const t of taken) {
        if (Math.abs(t.y - y) < 30 && Math.abs(t.x - x) < 150) {
          clash = true;
          break;
        }
      }
      if (clash) continue;
      taken.push({ x, y });
      rl.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translateX(-50%)`;
      keep.add(rl.el);
      if (!shown.has(rl.el)) {
        rl.el.classList.add('is-on');
        shown.add(rl.el);
      }
    }

    for (const el of [...shown]) {
      if (!keep.has(el)) {
        el.classList.remove('is-on');
        shown.delete(el);
      }
    }
  }

  let fpsAccum = 0;
  let fpsFrames = 0;
  const perf = { fps: 0 };
  (window as unknown as { cosPerf: typeof perf }).cosPerf = perf;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAccum += dt;
    fpsFrames++;
    if (fpsAccum > 1) {
      perf.fps = Math.round(fpsFrames / fpsAccum);
      fpsAccum = 0;
      fpsFrames = 0;
    }

    const idle = now - idleSince > 2600;
    const drifting = !REDUCED && idle && !openSlug && !dragging && !pinching;

    if (drifting) {
      goal.az += dt * 0.028;
      dirty = true;
    }

    // Inertia after a flick.
    if (!dragging && !pinching && (Math.abs(AZ_V.v) > 1e-5 || Math.abs(TY_V.v) > 1e-4)) {
      goal.az += AZ_V.v * dt * 24;
      goal.ty = Math.max(Y_MIN, Math.min(Y_MAX, goal.ty + TY_V.v * dt * 24));
      AZ_V.v *= Math.exp(-4.4 * dt);
      TY_V.v *= Math.exp(-4.4 * dt);
      if (Math.abs(AZ_V.v) < 1e-5) AZ_V.v = 0;
      if (Math.abs(TY_V.v) < 1e-4) TY_V.v = 0;
      goal.polar = damp(goal.polar, naturalPolar(goal.ty), 2.4, dt);
      dirty = true;
    }

    const moving =
      Math.abs(cam.az - goal.az) > 1e-4 ||
      Math.abs(cam.ty - goal.ty) > 1e-3 ||
      Math.abs(cam.radius - goal.radius) > 1e-3 ||
      Math.abs(cam.polar - goal.polar) > 1e-4 ||
      Math.abs(lookOffset - lookOffsetGoal) > 1e-3;

    if (moving) {
      cam.az = damp(cam.az, goal.az, lambda, dt);
      cam.ty = damp(cam.ty, goal.ty, lambda, dt);
      cam.radius = damp(cam.radius, goal.radius, lambda, dt);
      cam.polar = damp(cam.polar, goal.polar, lambda * 0.8, dt);
      lookOffset = damp(lookOffset, lookOffsetGoal, 3.2, dt);
      dirty = true;
    }

    meru.rotation.y = cam.az + 0.55;
    place3(TMP, cam.az, cam.ty, cam.radius, cam.polar);
    camera.position.copy(TMP);
    camera.lookAt(0, cam.ty + lookOffset, 0);

    // Colour of the age: the sky, the fog, and the ground it happened on. The
    // disc's material colour multiplies its painted texture, so a desaturated
    // key laid over white re-lights the whole map without repainting it.
    if (!sky.equals(skyGoal) || !keyColor.equals(keyGoal) || !wash.equals(washGoal)) {
      sky.lerp(skyGoal, Math.min(1, dt * 2.2));
      keyColor.lerp(keyGoal, Math.min(1, dt * 2.2));
      wash.lerp(washGoal, Math.min(1, dt * 2.2));
      (scene.fog as THREE.FogExp2).color.copy(sky);
      (disc.material as THREE.MeshBasicMaterial).color.copy(wash);
      (wall.material as THREE.MeshBasicMaterial).color.copy(wash);
      (meru.material as THREE.MeshBasicMaterial).color.copy(wash);
      dirty = true;
    }

    // Leaves: open the buds, dim the ages that are not lit, breathe.
    const t = now / 1000;
    for (const leaf of leaves) {
      if (leaf.loaded && leaf.open < 1) {
        leaf.open = REDUCED ? 1 : Math.min(1, leaf.open + dt * 2.6);
        dirty = true;
      }
      if (Math.abs(leaf.lit - leaf.litTo) > 0.002) {
        leaf.lit = damp(leaf.lit, leaf.litTo, 5, dt);
        dirty = true;
      }
      const ease = leaf.open * leaf.open * (3 - 2 * leaf.open);
      const dCam = Math.sqrt(leaf.pos.distanceToSquared(camera.position));
      const pin = Math.max(0.62, Math.min(1.9, Math.pow(dCam / 26, 0.55)));
      const w = (1.5 + (leaf.full - 1.5) * ease) * pin;
      const h = leaf.loaded ? (w * 9) / 16 + w * 0.23 : w;
      const hot = hovered === leaf ? 1.09 : 1;
      const pulse = (REDUCED || !leaf.loaded ? 1 : 1 + Math.sin(t * 0.9 + leaf.def.x) * 0.012) * hot;
      leaf.sprite.scale.set(w * pulse, h * pulse, 1);
      const near = 1 - Math.max(0, Math.min(1, (dCam - 34) / 36)) * 0.55;
      leaf.sprite.material.opacity = (leaf.def.isPublic ? 1 : 0.62) * leaf.lit * near;
      const gs = 2.2 + w * 0.85 + (REDUCED ? 0 : Math.sin(t * 0.7 + leaf.def.z) * 0.16);
      leaf.glow.scale.set(gs, gs, 1);
      leaf.glow.material.opacity =
        (leaf.def.isPublic ? 0.5 : 0.24) * leaf.lit * (leaf.loaded ? 0.72 : 1) * (hovered === leaf ? 1.8 : 1);
      leaf.glow.material.color.copy(activeAge ? keyColor : leaf.age);
    }

    if (!REDUCED && !openSlug) {
      dust.rotation.y += dt * 0.012;
      stars.rotation.y += dt * 0.0035;
      if (milkRing) (milkRing.material as THREE.MeshBasicMaterial).opacity = 0.13 + Math.sin(t * 0.55) * 0.05;
      (ray.material as THREE.SpriteMaterial).opacity = 0.38 + Math.sin(t * 0.42) * 0.09;
      dirty = true;
    }

    for (const p of plates) {
      const near = 1 - Math.min(1, Math.abs(p.realm.y - cam.ty) / 26);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.base * (0.35 + near * 0.75);
    }

    stream(now);

    if (dirty) {
      updateLabels();
      syncLadder();
      renderer.render(scene, camera);
      dirty = moving || drifting || (!REDUCED && !openSlug);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      last = performance.now();
      dirty = true;
      raf = requestAnimationFrame(frame);
    }
  });

  // Eager-load what the entrance will fly past.
  const seed = [...leaves].sort((a, b) => Math.abs(a.def.y) - Math.abs(b.def.y)).slice(0, TIER.eager);
  for (const l of seed) loadLeaf(l);

  if (REDUCED) {
    cam.az = goal.az;
    cam.ty = goal.ty;
    cam.radius = goal.radius;
    cam.polar = goal.polar;
  }
  raf = requestAnimationFrame(frame);
}
