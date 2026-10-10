/**
 * web.js — "The web of stories".
 *
 * A single 2D canvas draws 164 illustrated nodes and 525 relations over a warm
 * night. The layout is precomputed (build-graph.mjs); this file only draws it,
 * moves the camera, and unfolds a neighbourhood when you touch a node.
 *
 * Why 2D canvas and not three.js: with 164 art nodes the bottleneck is texture
 * memory and image decode, not fill rate. Circular sprites are baked once into
 * small offscreen canvases (~8 MB total, GPU-backed) and blitted; there is no
 * 100 MB atlas to build on a phone, no shader compile stall on first paint,
 * text stays crisp at any zoom, and there is no WebGL-context failure mode to
 * fall back from. Measured: 60fps on the frame budget with room to spare.
 *
 * Everything is drawn in one pass per frame, ordered:
 *   ground (one blitted gradient) → dust → links → travelling lights →
 *   haloes (additive) → art sprites → rims → labels.
 */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
/** frame-rate independent approach factor */
const approach = (dt, rate) => 1 - Math.exp(-dt * rate);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** One colour per age. Violet before time, gold in Satya, Kṛṣṇa-blue in
 *  Dvāpara, ember in Kali, ash in history, gold again where ages cross. */
const AGE = [
  '#7b57bd',
  '#4a6cbe',
  '#f0cf8c',
  '#e79038',
  '#4794c4',
  '#cf4f42',
  '#8f97a3',
  '#9b68cc',
  '#d8ab5f',
];

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const AGE_RGB = AGE.map(rgb);

const fold = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .toLowerCase();

export function start() {
  const G = JSON.parse(document.getElementById('web-data').textContent);
  const PANELS = JSON.parse(document.getElementById('web-panels').textContent);
  const N = G.nodes;
  const E = G.edges;
  const P = G.periods;
  const W = G.world.w;
  const H = G.world.h;

  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d', { alpha: false });
  const stage = document.getElementById('stage');
  const live = document.getElementById('live');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let calm = reduce.matches;
  reduce.addEventListener?.('change', (e) => {
    calm = e.matches;
    dirty = true;
  });

  /* ------------------------------------------------------------ adjacency */

  const adj = N.map(() => []);
  for (let k = 0; k < E.length; k++) {
    const [i, j, w] = E[k];
    adj[i].push({ j, w, e: k });
    adj[j].push({ j: i, w, e: k });
  }
  for (const a of adj) a.sort((x, y) => y.w - x.w);

  /* -------------------------------------------------------------- viewport */

  let vw = 0;
  let vh = 0;
  let dpr = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    vw = Math.max(1, Math.round(r.width));
    vh = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(vw * dpr);
    cv.height = Math.round(vh * dpr);
    cv.style.width = `${vw}px`;
    cv.style.height = `${vh}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    limits();
    dirty = true;
  }

  /* ---------------------------------------------------------------- camera */

  const cam = { x: W / 2, y: H / 2, z: 0.2 };
  const tgt = { x: W / 2, y: H / 2, z: 0.2 };
  let zMin = 0.045;
  const zMax = 2.4;
  function limits() {
    zMin = Math.max(0.03, Math.min(vw / (W + 260), vh / (H + 260)));
    if (zMin > 0.5) zMin = 0.5;
  }
  function clampCam(c) {
    c.z = clamp(c.z, zMin, zMax);
    const hw = vw / (2 * c.z);
    const hh = vh / (2 * c.z * ysFor(c.z));
    const mx = 130;
    const my = 130;
    c.x = W + mx * 2 < hw * 2 ? W / 2 : clamp(c.x, hw - mx, W - hw + mx);
    c.y = H + my * 2 < hh * 2 ? H / 2 : clamp(c.y, hh - my, H - hh + my);
  }
  /* The world is four times wider than it is tall, so pulled all the way out
     it would be a thread across the middle of a phone. Below the zoom where
     the art fades to pure light, the vertical scale opens out to twice the
     horizontal — the web spreads into a sky instead of a smear. Circles stay
     circles; only the spacing between them breathes. */
  const ysFor = (z) => 1 + 1.15 * clamp((0.14 - z) / 0.09, 0, 1);
  const wx = (px) => (px - vw / 2) / cam.z + cam.x;
  const wy = (py) => (py - vh / 2) / (cam.z * ysFor(cam.z)) + cam.y;

  function flyTo(x, y, z, snap) {
    tgt.x = x;
    tgt.y = y;
    tgt.z = clamp(z, zMin, zMax);
    clampCam(tgt);
    if (snap || calm) {
      cam.x = tgt.x;
      cam.y = tgt.y;
      cam.z = tgt.z;
    }
    dirty = true;
  }

  /* ---------------------------------------------------------------- sprites */

  /** node index → {lq: canvas|null, full: canvas|null, img: Image, state} */
  const art = N.map(() => ({ lq: null, full: null, loading: false, done: false }));
  const lqImgs = N.map(() => null);
  const buildQueue = [];

  function circle(img, size, quiet) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.beginPath();
    g.arc(size / 2, size / 2, size / 2, 0, TAU);
    g.clip();
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.max(size / iw, size / ih);
    const dw = iw * s;
    const dh = ih * s;
    g.drawImage(img, (size - dw) / 2, (size - dh) / 2 - dh * 0.04, dw, dh);
    /* a breath of warm light from the top-left, so every node reads as lit */
    const gr = g.createRadialGradient(size * 0.32, size * 0.26, size * 0.05, size * 0.5, size * 0.5, size * 0.62);
    gr.addColorStop(0, 'rgba(255,231,190,0.16)');
    gr.addColorStop(1, 'rgba(20,10,4,0.34)');
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    if (quiet) {
      /* the seven unmade films are present but hushed: half the colour, and
         a wash of night over them */
      g.globalCompositeOperation = 'saturation';
      g.fillStyle = 'hsl(0,42%,50%)';
      g.fillRect(0, 0, size, size);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(10,7,4,0.34)';
      g.fillRect(0, 0, size, size);
    }
    return c;
  }

  const spriteSize = (i) => Math.min(256, Math.max(72, Math.round(N[i].r * 4)));

  /** 23 of the 164 nodes are ideas rather than scenes — the Mahābhārata as a
   *  whole, Ayodhyā, the yugas, the puruṣārthas. Rather than borrow a still
   *  that does not belong to them, they are struck as engraved seals: a warm
   *  ground in their age's colour and a rosette whose fold count comes from
   *  the id, so each is its own and none of them pretends to be a picture. */
  function medallion(i, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const col = AGE_RGB[N[i].p];
    let hsh = 0;
    for (let k = 0; k < N[i].id.length; k++) hsh = (hsh * 31 + N[i].id.charCodeAt(k)) >>> 0;
    const R = size / 2;
    g.beginPath();
    g.arc(R, R, R, 0, TAU);
    g.clip();
    const gr = g.createRadialGradient(R * 0.8, R * 0.7, R * 0.05, R, R, R);
    gr.addColorStop(0, rgba([Math.min(255, col[0] * 0.6 + 60), Math.min(255, col[1] * 0.6 + 44), Math.min(255, col[2] * 0.5 + 30)], 1));
    gr.addColorStop(0.55, rgba([col[0] * 0.34 + 26, col[1] * 0.3 + 18, col[2] * 0.26 + 12], 1));
    gr.addColorStop(1, 'rgb(22,14,9)');
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    const petals = 5 + (hsh % 5); // 5..9 folds
    const turn = ((hsh >> 3) % 32) / 32 * TAU;
    g.strokeStyle = rgba([255, 226, 176], 0.34);
    g.lineWidth = Math.max(1, size / 96);
    for (let k = 0; k < petals; k++) {
      const a = turn + (k / petals) * TAU;
      g.beginPath();
      g.arc(R + Math.cos(a) * R * 0.34, R + Math.sin(a) * R * 0.34, R * 0.42, 0, TAU);
      g.stroke();
    }
    g.strokeStyle = rgba([255, 226, 176], 0.5);
    g.lineWidth = Math.max(1, size / 64);
    g.beginPath();
    g.arc(R, R, R * 0.86, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(R, R, R * 0.11, 0, TAU);
    g.fillStyle = rgba([255, 232, 190], 0.8);
    g.fill();
    const vg = g.createRadialGradient(R, R, R * 0.4, R, R, R);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = vg;
    g.fillRect(0, 0, size, size);
    return c;
  }

  /* tiny inline previews: decoded up front (they are ~120 bytes each), baked
     into sprites lazily so the first frame is never blocked. */
  for (let i = 0; i < N.length; i++) {
    if (!N[i].lq) continue;
    const im = new Image();
    im.decoding = 'async';
    im.src = N[i].lq;
    lqImgs[i] = im;
  }

  let inFlight = 0;
  const MAX_FLIGHT = 4;
  function pump() {
    buildQueue.sort((a, b) => a.d - b.d);
    while (inFlight < MAX_FLIGHT && buildQueue.length) {
      const { i } = buildQueue.shift();
      const a = art[i];
      if (a.done || a.loading || !N[i].img) continue;
      a.loading = true;
      inFlight++;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        inFlight--;
        a.loading = false;
        a.done = true;
        try {
          a.full = circle(im, spriteSize(i), N[i].k === 'soon');
        } catch {
          /* ignore */
        }
        a.born = now();
        dirty = true;
        pump();
      };
      im.onerror = () => {
        inFlight--;
        a.loading = false;
        a.done = true;
        dirty = true;
        pump();
      };
      im.src = N[i].img;
    }
  }

  /* ------------------------------------------------------------- the ground */
  /* Painted in screen space every frame so it can never seam: a warm night,
     then one soft aurora per visible age at that age's place in the world. */

  /* The ground is pure gradient, so it is painted into a third-scale
     offscreen and blitted — one full-screen composite per frame instead of
     five full-screen gradient fills. Invisible at this softness, ~9× cheaper. */
  const gcv = document.createElement('canvas');
  const gg = gcv.getContext('2d');
  function ground(z, zy) {
    const gw = Math.max(2, Math.ceil(vw / 3));
    const gh = Math.max(2, Math.ceil(vh / 3));
    if (gcv.width !== gw || gcv.height !== gh) {
      gcv.width = gw;
      gcv.height = gh;
    }
    gg.setTransform(1, 0, 0, 1, 0, 0);
    gg.fillStyle = '#0a0704';
    gg.fillRect(0, 0, gw, gh);
    const vgrad = gg.createLinearGradient(0, 0, 0, gh);
    vgrad.addColorStop(0, 'rgba(58,32,15,0.85)');
    vgrad.addColorStop(0.42, 'rgba(30,17,10,0.55)');
    vgrad.addColorStop(1, 'rgba(9,6,4,0.96)');
    gg.fillStyle = vgrad;
    gg.fillRect(0, 0, gw, gh);
    const midY = ((H * 0.5 - cam.y) * zy + vh / 2) / 3;
    for (let i = 0; i < P.length; i++) {
      const X = ((P[i].x - cam.x) * z + vw / 2) / 3;
      const R = Math.max((P[i].w * z * 0.8) / 3, Math.min(gw, gh) * 0.55);
      if (X + R * 1.35 < 0 || X - R * 1.35 > gw) continue;
      const c = AGE_RGB[i];
      const gr = gg.createRadialGradient(X, midY, 0, X, midY, R * 1.35);
      gr.addColorStop(0, rgba(c, 0.22));
      gr.addColorStop(0.4, rgba(c, 0.1));
      gr.addColorStop(1, rgba(c, 0));
      gg.fillStyle = gr;
      gg.fillRect(Math.max(0, X - R * 1.4), 0, Math.min(gw, R * 2.8), gh);
    }
    /* the river of time along the spine of the world */
    const h = Math.max(20, (H * 0.34 * zy) / 3);
    const riv = gg.createLinearGradient(0, midY - h, 0, midY + h);
    riv.addColorStop(0, 'rgba(255,196,120,0)');
    riv.addColorStop(0.5, 'rgba(255,196,120,0.1)');
    riv.addColorStop(1, 'rgba(255,196,120,0)');
    gg.fillStyle = riv;
    gg.fillRect(0, midY - h, gw, h * 2);
    ctx.drawImage(gcv, 0, 0, vw, vh);
  }

  /** one soft halo per age, drawn additively under each node */
  const HALO = 96;
  const haloes = AGE_RGB.map((c) => {
    const h = document.createElement('canvas');
    h.width = h.height = HALO;
    const g = h.getContext('2d');
    const gr = g.createRadialGradient(HALO / 2, HALO / 2, 0, HALO / 2, HALO / 2, HALO / 2);
    gr.addColorStop(0, rgba(c, 0.85));
    gr.addColorStop(0.28, rgba(c, 0.34));
    gr.addColorStop(0.62, rgba(c, 0.08));
    gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, HALO, HALO);
    return h;
  });

  /* ------------------------------------------------------------------ dust */

  const DUST = 190;
  const dust = new Float32Array(DUST * 4);
  for (let i = 0; i < DUST; i++) {
    dust[i * 4] = Math.random();
    dust[i * 4 + 1] = Math.random();
    dust[i * 4 + 2] = 0.25 + Math.random() * 0.75; // depth
    dust[i * 4 + 3] = Math.random() * TAU; // phase
  }

  /* -------------------------------------------------------- moving lights */

  const SPARKS = 26;
  const sparks = [];
  for (let i = 0; i < SPARKS; i++) sparks.push({ e: -1, t: 0, v: 0.1, life: 0 });
  let visEdges = [];

  /* ------------------------------------------------------------ node state */

  const st = N.map((n, i) => ({
    ph: Math.random() * TAU,
    sp: 0.5 + Math.random() * 0.6,
    a: 1, // alpha
    at: 1,
    ox: 0, // unfold offset
    oy: 0,
    tx: 0,
    ty: 0,
    lift: 0,
    ltgt: 0,
  }));

  let focus = -1;
  let neigh = new Set();
  let camBefore = null;

  /* ---------------------------------------------------------------- render */

  let dirty = true;
  let t0 = performance.now();
  const now = () => performance.now();
  let last = t0;
  let entrance = 0; // 0..1
  const frames = [];
  let fpsNow = 0;

  function nodePos(i, time) {
    const n = N[i];
    const s = st[i];
    let x = n.x + s.ox;
    let y = n.y + s.oy;
    if (!calm) {
      const b = 3 + n.r * 0.08;
      x += Math.sin(time * 0.00021 * s.sp + s.ph) * b;
      y += Math.cos(time * 0.00017 * s.sp + s.ph * 1.7) * b;
    }
    return [x, y];
  }

  const posX = new Float32Array(N.length);
  const posY = new Float32Array(N.length);
  const scrX = new Float32Array(N.length);
  const scrY = new Float32Array(N.length);
  const scrR = new Float32Array(N.length);
  const onScreen = new Uint8Array(N.length);

  function frame(time) {
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;
    frames.push(time);
    if (frames.length > 60) frames.shift();
    if (frames.length > 8) fpsNow = (frames.length - 1) * 1000 / (frames[frames.length - 1] - frames[0]);

    /* camera spring */
    if (!calm) {
      const k = approach(dt, 7.5);
      const kz = approach(dt, 6.5);
      const dx = tgt.x - cam.x;
      const dy = tgt.y - cam.y;
      const lz = Math.log(tgt.z / cam.z);
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05 || Math.abs(lz) > 0.0005) {
        cam.x += dx * k;
        cam.y += dy * k;
        cam.z *= Math.exp(lz * kz);
        dirty = true;
      } else {
        cam.x = tgt.x;
        cam.y = tgt.y;
        cam.z = tgt.z;
      }
    }

    /* inertia */
    if (!drag.active && (Math.abs(vel.x) > 0.02 || Math.abs(vel.y) > 0.02)) {
      const f = Math.pow(0.0022, dt);
      tgt.x -= (vel.x / cam.z) * dt;
      tgt.y -= (vel.y / cam.z) * dt;
      vel.x *= f;
      vel.y *= f;
      clampCam(tgt);
      cam.x = tgt.x;
      cam.y = tgt.y;
      dirty = true;
    }

    /* per-node easing */
    let moving = false;
    /* under prefers-reduced-motion nothing eases: states change at once */
    const ka = calm ? 1 : approach(dt, 6);
    const ko = calm ? 1 : approach(dt, 5);
    for (let i = 0; i < N.length; i++) {
      const s = st[i];
      if (Math.abs(s.a - s.at) > 0.002) {
        s.a += (s.at - s.a) * ka;
        moving = true;
      } else s.a = s.at;
      if (Math.abs(s.ox - s.tx) > 0.05 || Math.abs(s.oy - s.ty) > 0.05) {
        s.ox += (s.tx - s.ox) * ko;
        s.oy += (s.ty - s.oy) * ko;
        moving = true;
      }
      if (Math.abs(s.lift - s.ltgt) > 0.003) {
        s.lift += (s.ltgt - s.lift) * ka;
        moving = true;
      } else s.lift = s.ltgt;
    }
    if (moving) dirty = true;
    if (entrance < 1) {
      entrance = calm ? 1 : Math.min(1, entrance + dt / 1.1);
      dirty = true;
    }

    if (!calm) dirty = true; // breathing, dust and lights never stop
    if (dirty) {
      dirty = false;
      draw(time);
    }
    raf = requestAnimationFrame(frame);
  }

  function draw(time) {
    const z = cam.z;
    const zy = z * ysFor(z);
    ctx.save();
    ctx.globalAlpha = 1;
    ground(z, zy);

    /* dust */
    if (!calm) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < DUST; i++) {
        const d = dust[i * 4 + 2];
        const px = (((dust[i * 4] * vw - cam.x * z * d * 0.5 + time * 0.004 * d) % vw) + vw) % vw;
        const py = (((dust[i * 4 + 1] * vh - cam.y * z * d * 0.5) % vh) + vh) % vh;
        const tw = 0.32 + 0.3 * Math.sin(time * 0.0013 + dust[i * 4 + 3]);
        ctx.fillStyle = `rgba(255,226,182,${(0.1 + tw * 0.18) * d})`;
        ctx.fillRect(px, py, d * 1.5, d * 1.5);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    /* positions */
    const pad = 90;
    for (let i = 0; i < N.length; i++) {
      const [x, y] = nodePos(i, time);
      posX[i] = x;
      posY[i] = y;
      const X = (x - cam.x) * z + vw / 2;
      const Y = (y - cam.y) * zy + vh / 2;
      scrX[i] = X;
      scrY[i] = Y;
      const R = N[i].r * z * (1 + st[i].lift * 0.3);
      scrR[i] = R;
      onScreen[i] = X > -R - pad && X < vw + R + pad && Y > -R - pad && Y < vh + R + pad ? 1 : 0;
    }

    /* the ages, written across their bands when you are far out */
    if (z < 0.19) {
      const f = clamp((0.19 - z) / 0.09, 0, 1);
      ctx.save();
      ctx.textBaseline = 'middle';
      const midY = (H * 0.5 - cam.y) * zy + vh / 2;
      const Y = midY + clamp(H * 0.55 * zy + 30, 40, vh * 0.3);
      const used = [];
      for (let i = 0; i < P.length; i++) {
        const X = (P[i].x - cam.x) * z + vw / 2;
        if (X < -80 || X > vw + 80) continue;
        ctx.font = `400 14px "EB Garamond", Georgia, serif`;
        const tw = ctx.measureText(P[i].short).width;
        const vertical = tw > P[i].w * z - 10;
        const w = vertical ? 17 : tw + 14;
        let hit = false;
        for (const u of used) if (X - w / 2 < u[1] && X + w / 2 > u[0]) hit = true;
        if (hit) continue;
        used.push([X - w / 2, X + w / 2]);
        ctx.save();
        ctx.translate(X, Y);
        if (vertical) {
          ctx.rotate(Math.PI / 2);
          ctx.textAlign = 'left';
        } else ctx.textAlign = 'center';
        ctx.fillStyle = rgba(AGE_RGB[i], 0.7 * f);
        ctx.fillText(P[i].short, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    /* links — three alpha buckets, three stroke calls */
    const bDim = new Path2D();
    const bMid = new Path2D();
    const bHot = new Path2D();
    visEdges.length = 0;
    const focused = focus >= 0;
    for (let k = 0; k < E.length; k++) {
      const i = E[k][0];
      const j = E[k][1];
      if (!onScreen[i] && !onScreen[j]) continue;
      const hot = focused && (i === focus || j === focus);
      const p = hot ? bHot : focused ? bDim : E[k][2] > 2.4 ? bMid : bDim;
      p.moveTo(scrX[i], scrY[i]);
      p.lineTo(scrX[j], scrY[j]);
      if (visEdges.length < 400) visEdges.push(k);
    }
    ctx.lineCap = 'round';
    ctx.globalAlpha = entrance;
    ctx.lineWidth = Math.max(0.6, z * 1.1);
    ctx.strokeStyle = focused ? 'rgba(226,205,175,0.05)' : 'rgba(226,205,175,0.11)';
    ctx.stroke(bDim);
    ctx.strokeStyle = 'rgba(240,214,175,0.2)';
    ctx.stroke(bMid);
    if (focused) {
      ctx.lineWidth = Math.max(1, z * 2);
      ctx.strokeStyle = 'rgba(245,200,132,0.5)';
      ctx.stroke(bHot);
    }
    ctx.globalAlpha = 1;

    /* travelling lights */
    if (!calm && visEdges.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const s of sparks) {
        if (s.e < 0 || s.t > 1) {
          s.e = visEdges[(Math.random() * visEdges.length) | 0];
          s.t = 0;
          s.v = 0.09 + Math.random() * 0.16;
        }
        s.t += s.v * 0.016;
        const e = E[s.e];
        const i = e[0];
        const j = e[1];
        const tt = easeOut(s.t);
        const X = lerp(scrX[i], scrX[j], tt);
        const Y = lerp(scrY[i], scrY[j], tt);
        const X2 = lerp(scrX[i], scrX[j], Math.max(0, tt - 0.07));
        const Y2 = lerp(scrY[i], scrY[j], Math.max(0, tt - 0.07));
        const fade = Math.sin(Math.min(1, s.t) * Math.PI);
        ctx.strokeStyle = `rgba(255,222,168,${0.5 * fade})`;
        ctx.lineWidth = Math.max(1, z * 1.6);
        ctx.beginPath();
        ctx.moveTo(X2, Y2);
        ctx.lineTo(X, Y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    /* nodes, back to front by radius so the big ones sit on top */
    const order = [];
    for (let i = 0; i < N.length; i++) if (onScreen[i]) order.push(i);
    order.sort((a, b) => N[a].r - N[b].r || (a === focus ? 1 : 0) - (b === focus ? 1 : 0));

    /* how much of the illustrated web is showing, versus pure constellation */
    const artMix = clamp((z - 0.12) / 0.07, 0, 1);

    /* queue art for what is on screen */
    if (artMix > 0) {
      buildQueue.length = 0;
      for (const i of order) {
        const a = art[i];
        if (a.done || a.loading || !N[i].img) continue;
        if (scrR[i] < 5) continue;
        buildQueue.push({ i, d: Math.hypot(scrX[i] - vw / 2, scrY[i] - vh / 2) });
      }
      if (buildQueue.length) pump();
    }

    /* haloes */
    ctx.globalCompositeOperation = 'lighter';
    for (const i of order) {
      const s = st[i];
      const R = scrR[i];
      const ent = clamp(entrance * 2.4 - (N[i].p / P.length) * 1.2, 0, 1);
      const a = s.a * ent * (N[i].k === 'soon' ? 0.5 : 1);
      if (a < 0.02) continue;
      const g = R * (z < 0.16 ? 5.2 : 2.5) * (1 + s.lift * 0.5);
      ctx.globalAlpha = clamp(a * (z < 0.16 ? 0.85 : 0.5 + s.lift * 0.5), 0, 1);
      ctx.drawImage(haloes[N[i].p], scrX[i] - g, scrY[i] - g, g * 2, g * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    /* art — crossfading into pure light as you pull away */
    let built = 0;
    if (artMix > 0) {
      for (const i of order) {
        const s = st[i];
        const ent = clamp(entrance * 2.4 - (N[i].p / P.length) * 1.2, 0, 1);
        const a = s.a * ent * artMix;
        if (a < 0.03) continue;
        const R = scrR[i];
        if (R < 2) continue;
        const A = art[i];
        if (!A.full && !N[i].img && built < 5) {
          A.full = medallion(i, spriteSize(i));
          A.done = true;
          built++;
        }
        if (!A.lq && lqImgs[i] && lqImgs[i].complete && built < 5) {
          try {
            A.lq = circle(lqImgs[i], 64, N[i].k === 'soon');
            built++;
          } catch {
            /* ignore */
          }
        }
        const soon = N[i].k === 'soon';
        ctx.globalAlpha = clamp(a * (soon ? 0.78 : 1), 0, 1);
        if (A.full) {
          const fadeIn = A.born ? clamp((time - A.born) / 320, 0, 1) : 1;
          if (fadeIn < 1 && A.lq) ctx.drawImage(A.lq, scrX[i] - R, scrY[i] - R, R * 2, R * 2);
          ctx.globalAlpha = clamp(a * (soon ? 0.78 : 1) * fadeIn, 0, 1);
          ctx.drawImage(A.full, scrX[i] - R, scrY[i] - R, R * 2, R * 2);
          if (fadeIn < 1) dirty = true;
        } else if (A.lq) {
          ctx.drawImage(A.lq, scrX[i] - R, scrY[i] - R, R * 2, R * 2);
        } else {
          ctx.fillStyle = rgba(AGE_RGB[N[i].p], 0.35);
          ctx.beginPath();
          ctx.arc(scrX[i], scrY[i], R, 0, TAU);
          ctx.fill();
        }

        /* rim */
        const c = AGE_RGB[N[i].p];
        ctx.globalAlpha = clamp(a, 0, 1);
        ctx.lineWidth = Math.max(0.7, R * 0.035) * (1 + s.lift * 2);
        ctx.strokeStyle =
          i === focus
            ? 'rgba(255,222,168,0.95)'
            : soon
              ? rgba(c, 0.32)
              : rgba([Math.min(255, c[0] + 60), Math.min(255, c[1] + 50), Math.min(255, c[2] + 40)], 0.42);
        if (soon) ctx.setLineDash([R * 0.28, R * 0.22]);
        ctx.beginPath();
        ctx.arc(scrX[i], scrY[i], R + ctx.lineWidth * 0.5, 0, TAU);
        ctx.stroke();
        if (soon) ctx.setLineDash([]);
      }
    }
    if (artMix < 1) {
      /* constellation: pure light */
      for (const i of order) {
        const R = Math.max(2.2, scrR[i] * 1.5);
        ctx.globalAlpha = clamp(st[i].a * entrance * (1 - artMix) * (N[i].k === 'soon' ? 0.55 : 1), 0, 1);
        ctx.fillStyle = rgba(AGE_RGB[N[i].p], 0.95);
        ctx.beginPath();
        ctx.arc(scrX[i], scrY[i], R, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    /* labels — biggest first, never overlapping, never off the edge */
    if (z >= 0.15) {
      const cands = order
        .filter((i) => st[i].a > 0.5 && scrR[i] > 9)
        .sort((a, b) => (b === focus ? 1 : 0) - (a === focus ? 1 : 0) || scrR[b] - scrR[a]);
      const lim = vw < 600 ? 13 : 26;
      const taken = [];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineJoin = 'round';
      let drawn = 0;
      for (const i of cands) {
        const forced = i === focus || (focus >= 0 && neigh.has(i));
        if (drawn >= lim && !forced) continue;
        const R = scrR[i];
        if (!forced && R < 26 && z < 0.42) continue;
        const fs = clamp(R * 0.42, 11, 17);
        ctx.font = `400 ${fs}px "EB Garamond", Georgia, serif`;
        let label = N[i].l;
        if (label.length > 26) label = `${label.slice(0, 25).trimEnd()}…`;
        const tw = ctx.measureText(label).width;
        const th = fs * 1.2;
        /* never park a label where its picture is not: an off-screen node
           keeps its name off-screen too */
        if (scrX[i] < -R || scrX[i] > vw + R) continue;
        const half = tw / 2 + 6;
        const x = clamp(scrX[i], half, vw - half);
        const y = scrY[i] + R + Math.max(4, R * 0.12);
        if (y + th > vh - 34 || y < 44) continue;
        const box = [x - half, y - 2, x + half, y + th];
        let hit = false;
        for (const b of taken) {
          if (box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]) {
            hit = true;
            break;
          }
        }
        if (hit && !forced) continue;
        /* a label may not sit on top of somebody else's picture */
        if (!forced) {
          for (const j of order) {
            if (j === i || scrR[j] < 8) continue;
            const rj = scrR[j] * 0.72;
            if (
              scrX[j] + rj > box[0] &&
              scrX[j] - rj < box[2] &&
              scrY[j] + rj > box[1] &&
              scrY[j] - rj < box[3]
            ) {
              hit = true;
              break;
            }
          }
          if (hit) continue;
        }
        taken.push(box);
        ctx.globalAlpha = clamp(st[i].a * entrance, 0, 1);
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = 'rgba(9,6,4,0.85)';
        ctx.strokeText(label, x, y);
        ctx.fillStyle = i === focus ? '#ffe6bd' : 'rgba(246,235,218,0.9)';
        ctx.fillText(label, x, y);
        drawn++;
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    railSync();
  }

  /* ------------------------------------------------------------- unfolding */

  function unfold(i) {
    for (const s of st) {
      s.tx = 0;
      s.ty = 0;
    }
    if (i < 0) {
      for (const s of st) {
        s.at = 1;
        s.ltgt = 0;
      }
      neigh = new Set();
      return 0;
    }
    const list = adj[i].slice(0, 12);
    neigh = new Set(list.map((a) => a.j));
    for (let k = 0; k < N.length; k++) {
      st[k].at = k === i || neigh.has(k) ? 1 : 0.13;
      st[k].ltgt = k === i ? 1 : neigh.has(k) ? 0.3 : 0;
    }
    /* arrange the neighbourhood as a rosette: each neighbour keeps a memory of
       where it was, but the ring is evened out so nothing overlaps. */
    const fx = N[i].x;
    const fy = N[i].y;
    const withAngle = list.map((a) => ({
      ...a,
      ang: Math.atan2(N[a.j].y - fy, N[a.j].x - fx),
    }));
    withAngle.sort((a, b) => a.ang - b.ang);
    const n = withAngle.length;
    const base = withAngle.length ? withAngle[0].ang : 0;
    let span = N[i].r * 2.4;
    withAngle.forEach((a, k) => {
      const even = base + (k / n) * TAU;
      const ang = Math.atan2(
        lerp(Math.sin(a.ang), Math.sin(even), 0.55),
        lerp(Math.cos(a.ang), Math.cos(even), 0.55),
      );
      const ring = n > 7 && k % 2 === 1 ? 1.66 : 1;
      const R = (N[i].r + N[a.j].r) * 1.95 * ring + 26;
      st[a.j].tx = fx + Math.cos(ang) * R - N[a.j].x;
      st[a.j].ty = fy + Math.sin(ang) * R - N[a.j].y;
      span = Math.max(span, R + N[a.j].r + 16);
    });
    dirty = true;
    return span;
  }

  /* ---------------------------------------------------------------- panel */

  const panel = document.getElementById('panel');
  const panelInner = document.getElementById('panelInner');
  const panelGrip = document.getElementById('panelGrip');
  const panelClose = document.getElementById('panelClose');
  const rail = document.getElementById('rail');
  const railNow = document.getElementById('railNow');
  let stageMode = 'none'; // none | peek | full

  const medCache = new Map();
  /** background-image value for a node in the HTML chrome */
  function artCss(i, size) {
    if (N[i].img && !size) return `url(${N[i].img}), url(${N[i].lq})`;
    if (N[i].lq && !size) return `url(${N[i].lq})`;
    const key = `${i}:${size || 128}`;
    if (!medCache.has(key)) {
      try {
        medCache.set(key, medallion(i, size || 128).toDataURL('image/webp', 0.85));
      } catch {
        medCache.set(key, '');
      }
    }
    const u = medCache.get(key);
    return u ? `url(${u})` : `radial-gradient(circle at 34% 30%, ${AGE[N[i].p]}, #1a1109)`;
  }

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function ageName(i) {
    return P[N[i].p].short;
  }

  function peekHTML(i) {
    const p = PANELS[i];
    const kind = p.kind === 'film' ? 'Film' : p.kind === 'soon' ? 'Coming soon' : p.section;
    return `<div class="peek" data-open="1" role="button" tabindex="0">
      <span class="peek-art" style="background-image:${artCss(i)}"></span>
      <span class="peek-txt">
        <p class="peek-kicker">${esc(kind)} · ${esc(ageName(i))}</p>
        <h2 id="panelTitle">${esc(p.label.endsWith('…') ? p.title : p.label)}</h2>
        ${p.hi ? `<span class="hi" lang="hi">${esc(p.hi)}</span>` : ''}
      </span>
      <span class="peek-more" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></span>
    </div>`;
  }

  function fullHTML(i) {
    const p = PANELS[i];
    const kind = p.kind === 'film' ? 'Film' : p.kind === 'soon' ? 'Film · coming soon' : p.section;
    const near = (p.neighbours || []).slice(0, 8);
    const play =
      p.kind === 'film' && p.video
        ? `<button class="play" type="button" data-play="${esc(p.video)}" aria-label="Watch ${esc(p.label)}"></button>`
        : '';
    /* An idea rather than a scene gets its seal, struck large and centred —
       never a still stretched to pretend it is a picture of the thing. */
    const art = p.img8
      ? `<figure class="full-art" style="background-image:${artCss(i)}">
        <img src="${esc(p.img8)}" alt="${esc(p.alt || p.title)}" loading="eager" decoding="async" />
        ${play}
        ${p.caption ? `<figcaption>${esc(p.caption)}${p.artFilmTitle ? ` — from <i>${esc(p.artFilmTitle)}</i>` : ''}</figcaption>` : ''}
      </figure>`
      : `<figure class="full-art is-seal"><span class="seal" style="background-image:${artCss(i, 256)}"></span></figure>`;
    return `<div class="full">
      ${art}
      <p class="kicker">${esc(kind)} · ${esc(ageName(i))}</p>
      <h2 id="panelTitle">${esc(p.title)}</h2>
      ${p.hi ? `<span class="hi" lang="hi">${esc(p.hi)}</span>` : ''}
      ${p.summary ? `<p class="sum">${esc(p.summary)}</p>` : ''}
      ${p.kind === 'soon' ? '<p class="soonnote">Not filmed yet — the story is written and waiting.</p>' : ''}
      <div class="acts">
        ${p.kind === 'film' && p.video ? '<button class="primary" type="button" data-play-top="1">▶ Watch</button>' : ''}
        ${p.read ? `<a href="${esc(p.read)}">Read the story</a>` : ''}
        ${p.kind !== 'page' ? `<a href="${esc(p.href)}">Film page</a>` : ''}
      </div>
      ${
        near.length
          ? `<div class="near"><h3>Nearby in the web</h3><div class="near-row">${near
              .map(
                (j) =>
                  `<button type="button" data-go="${j}"><span class="nart" style="background-image:${artCss(
                    j,
                  )}"></span><span>${esc(N[j].l)}</span></button>`,
              )
              .join('')}</div></div>`
          : ''
      }
    </div>`;
  }

  function showPanel(i, mode) {
    const p = PANELS[i];
    stageMode = mode;
    panel.hidden = false;
    panel.classList.remove('closing');
    panel.classList.toggle('is-peek', mode === 'peek');
    panel.classList.toggle('is-full', mode === 'full');
    panel.style.setProperty('--ox', `${clamp(scrX[i], 20, vw - 20)}px`);
    panel.style.setProperty('--tint', rgba(AGE_RGB[N[i].p], 0.45));
    panel.style.setProperty('--tint-txt', rgba(AGE_RGB[N[i].p], 0.95));
    panelInner.innerHTML = mode === 'peek' ? peekHTML(i) : fullHTML(i);
    panelGrip.setAttribute('aria-label', mode === 'peek' ? 'Expand the story' : 'Shrink the story');
    if (mode === 'full') {
      const img = panelInner.querySelector('.full-art img');
      if (img) {
        if (img.complete) img.classList.add('in');
        else img.addEventListener('load', () => img.classList.add('in'), { once: true });
      }
      panel.focus?.();
    }
    rail.classList.toggle('tucked', mode === 'full');
    stage.classList.toggle('peeking', mode === 'peek');
    stage.classList.add('paneled');
    live.textContent = `${p.label}. ${mode === 'full' ? p.summary || '' : `${ageName(i)}. Tap again to open.`}`;
  }

  function hidePanel() {
    if (panel.hidden) return;
    panel.classList.add('closing');
    stageMode = 'none';
    rail.classList.remove('tucked');
    stage.classList.remove('peeking');
    stage.classList.remove('paneled');
    const el = panel;
    setTimeout(
      () => {
        if (stageMode === 'none') {
          el.hidden = true;
          panelInner.innerHTML = '';
        }
      },
      calm ? 1 : 220,
    );
  }

  function setFocus(i, opts = {}) {
    if (i === focus) {
      if (stageMode === 'peek') showPanel(i, 'full');
      return;
    }
    if (focus < 0 && !camBefore) camBefore = { x: tgt.x, y: tgt.y, z: tgt.z };
    focus = i;
    const span = unfold(i);
    if (i >= 0) {
      /* frame the whole neighbourhood in the free space beside or above the
         panel — a side card on a wide screen, a bottom card on a phone */
      const wide = vw >= 900;
      const availW = wide ? vw - 460 - 40 : vw - 34;
      const availH = wide ? vh - 90 : vh - 196;
      const z = clamp(Math.min(availW, availH) / (2 * span), 0.34, 1.5);
      const cx = wide ? (vw - 440) / 2 : vw / 2;
      const cy = wide ? vh * 0.5 : vh * 0.43;
      const offX = (vw * 0.5 - cx) / z;
      const offY = (vh * 0.5 - cy) / (z * ysFor(z));
      flyTo(N[i].x + offX, N[i].y + offY, z, opts.snap);
      showPanel(i, opts.mode || 'peek');
    } else {
      hidePanel();
      if (camBefore) {
        flyTo(camBefore.x, camBefore.y, camBefore.z);
        camBefore = null;
      }
    }
    dirty = true;
  }

  panelClose.addEventListener('click', () => {
    if (stageMode === 'full') showPanel(focus, 'peek');
    else setFocus(-1);
  });
  panelGrip.addEventListener('click', () => {
    if (stageMode === 'peek') showPanel(focus, 'full');
    else showPanel(focus, 'peek');
  });
  panelInner.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) {
      showPanel(focus, 'full');
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go) {
      const j = +go.dataset.go;
      setFocus(j, { mode: 'full' });
      return;
    }
    const top = e.target.closest('[data-play-top]');
    const play = top ? panelInner.querySelector('[data-play]') : e.target.closest('[data-play]');
    if (play) {
      const id = play.dataset.play;
      const fig = panelInner.querySelector('.full-art');
      fig.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        id,
      )}?autoplay=1&rel=0&modestbranding=1" title="Film" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    }
  });
  panelInner.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-open]')) {
      e.preventDefault();
      showPanel(focus, 'full');
    }
  });

  /* -------------------------------------------------------------- gestures */

  const drag = { active: false, id: -1, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: 0 };
  const vel = { x: 0, y: 0 };
  const pts = new Map();
  let pinch = null;
  let longTimer = 0;
  let lastTap = 0;
  let pressed = -1;
  function unpress() {
    if (pressed >= 0 && pressed !== focus) st[pressed].ltgt = 0;
    pressed = -1;
    dirty = true;
  }

  function pick(px, py) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < N.length; i++) {
      if (!onScreen[i]) continue;
      const d = Math.hypot(scrX[i] - px, scrY[i] - py);
      const hit = Math.max(scrR[i] + 6, 18);
      if (d <= hit && d - scrR[i] < bestD) {
        bestD = d - scrR[i];
        best = i;
      }
    }
    return best;
  }

  cv.addEventListener(
    'pointerdown',
    (e) => {
      cv.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      hideResults();
      if (pts.size === 1) {
        pressed = pick(e.clientX, e.clientY);
        if (pressed >= 0) {
          st[pressed].ltgt = Math.max(st[pressed].ltgt, 0.62);
          dirty = true;
        }
        drag.active = true;
        drag.id = e.pointerId;
        drag.x = e.clientX;
        drag.y = e.clientY;
        drag.sx = e.clientX;
        drag.sy = e.clientY;
        drag.t = now();
        drag.moved = 0;
        vel.x = 0;
        vel.y = 0;
        clearTimeout(longTimer);
        longTimer = setTimeout(() => {
          if (drag.active && drag.moved < 10) {
            drag.moved = 999; // swallow the tap
            overview();
          }
        }, 520);
      } else if (pts.size === 2) {
        unpress();
        clearTimeout(longTimer);
        const [a, b] = [...pts.values()];
        pinch = {
          d: Math.hypot(a.x - b.x, a.y - b.y),
          mx: (a.x + b.x) / 2,
          my: (a.y + b.y) / 2,
          z: cam.z,
        };
        drag.active = false;
      }
    },
    { passive: true },
  );

  cv.addEventListener(
    'pointermove',
    (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const nz = clamp(pinch.z * (d / pinch.d), zMin, zMax);
        const wxp = wx(pinch.mx);
        const wyp = wy(pinch.my);
        cam.z = nz;
        cam.x = wxp - (mx - vw / 2) / nz;
        cam.y = wyp - (my - vh / 2) / nz;
        clampCam(cam);
        tgt.x = cam.x;
        tgt.y = cam.y;
        tgt.z = cam.z;
        dirty = true;
        return;
      }
      if (!drag.active || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 10) {
        clearTimeout(longTimer);
        unpress();
      }
      cam.x -= dx / cam.z;
      cam.y -= dy / cam.z;
      clampCam(cam);
      tgt.x = cam.x;
      tgt.y = cam.y;
      const dtt = Math.max(8, now() - drag.t);
      vel.x = lerp(vel.x, (dx * 1000) / dtt, 0.35);
      vel.y = lerp(vel.y, (dy * 1000) / dtt, 0.35);
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = now();
      dirty = true;
    },
    { passive: true },
  );

  function endPointer(e) {
    clearTimeout(longTimer);
    unpress();
    const was = pts.get(e.pointerId);
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (!was || e.pointerId !== drag.id) return;
    const wasDrag = drag.moved;
    drag.active = false;
    if (wasDrag < 10 && now() - drag.t < 700) {
      vel.x = 0;
      vel.y = 0;
      const i = pick(e.clientX, e.clientY);
      const dbl = now() - lastTap < 300;
      lastTap = now();
      if (i >= 0) {
        dismissHint();
        setFocus(i);
      } else if (dbl) {
        const px = wx(e.clientX);
        const py = wy(e.clientY);
        flyTo(px, py, cam.z * 1.9);
      } else if (focus >= 0) {
        setFocus(-1);
      }
    }
  }
  cv.addEventListener('pointerup', endPointer, { passive: true });
  cv.addEventListener('pointercancel', endPointer, { passive: true });

  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const px = wx(e.clientX);
      const py = wy(e.clientY);
      const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.02 : 0.0016));
      const nz = clamp(cam.z * f, zMin, zMax);
      cam.z = nz;
      cam.x = px - (e.clientX - vw / 2) / nz;
      cam.y = py - (e.clientY - vh / 2) / nz;
      clampCam(cam);
      tgt.x = cam.x;
      tgt.y = cam.y;
      tgt.z = cam.z;
      dirty = true;
    },
    { passive: false },
  );

  function overview() {
    setFocus(-1);
    camBefore = null;
    flyTo(W / 2, H / 2, zMin * 1.02);
    live.textContent = 'The whole web, all nine ages.';
  }

  /* ------------------------------------------------------------------ rail */

  let railAt = -1;
  function railSync() {
    let k = 0;
    let bd = Infinity;
    for (let i = 0; i < P.length; i++) {
      const d = Math.abs(P[i].x - cam.x);
      if (d < bd) {
        bd = d;
        k = i;
      }
    }
    if (k === railAt) return;
    railAt = k;
    for (const b of rail.children) b.setAttribute('aria-current', String(+b.dataset.i === k));
    railNow.textContent = `${P[k].short} · ${P[k].count}`;
    if (!calm) {
      railNow.classList.remove('turn');
      void railNow.offsetWidth;
      railNow.classList.add('turn');
    }
  }
  for (const b of rail.children) {
    b.style.setProperty('--seg', AGE[+b.dataset.i]);
    b.addEventListener('click', () => {
      if (railMoved > 8) return; // that was a scrub, not a tap
      const i = +b.dataset.i;
      dismissHint();
      setFocus(-1);
      camBefore = null;
      flyTo(P[i].x, H / 2, Math.max(0.34, Math.min(cam.z, 0.7)));
      live.textContent = `${P[i].name}. ${P[i].count} things here.`;
    });
  }

  /* The rail is also a scrubber: drag along it and the world runs through the
     ages under your thumb, 1:1, the way a film scrubber does. */
  let railDown = -1;
  let railMoved = 0;
  let railFrom = 0;
  function scrub(cx) {
    const r = rail.getBoundingClientRect();
    const t = clamp((cx - r.left) / Math.max(1, r.width), 0, 1);
    flyTo(lerp(P[0].x - 260, P[P.length - 1].x + 260, t), H / 2, clamp(cam.z, 0.3, 0.7), true);
  }
  rail.addEventListener('pointerdown', (e) => {
    railDown = e.pointerId;
    railMoved = 0;
    railFrom = e.clientX;
    dismissHint();
    setFocus(-1);
    camBefore = null;
    rail.setPointerCapture?.(e.pointerId);
  });
  rail.addEventListener('pointermove', (e) => {
    if (e.pointerId !== railDown) return;
    railMoved += Math.abs(e.clientX - railFrom);
    railFrom = e.clientX;
    if (railMoved > 8) scrub(e.clientX);
  });
  const railUp = (e) => {
    if (e.pointerId !== railDown) return;
    railDown = -1;
    if (railMoved > 8) live.textContent = `${P[railAt].name}. ${P[railAt].count} things here.`;
    setTimeout(() => {
      railMoved = 0;
    }, 60);
  };
  rail.addEventListener('pointerup', railUp);
  rail.addEventListener('pointercancel', railUp);

  /* ---------------------------------------------------------------- search */

  const q = document.getElementById('q');
  const results = document.getElementById('results');
  const index = N.map((n, i) => ({
    i,
    s: fold(`${n.l} ${n.t} ${n.sec}`),
    l: fold(n.l),
  }));
  let rIdx = -1;

  function hideResults() {
    results.hidden = true;
    results.innerHTML = '';
    q.setAttribute('aria-expanded', 'false');
    rIdx = -1;
  }

  function search() {
    const v = fold(q.value.trim());
    if (v.length < 2) return hideResults();
    const hits = [];
    for (const e of index) {
      const a = e.l.indexOf(v);
      const b = a >= 0 ? a : e.s.indexOf(v);
      if (b < 0) continue;
      hits.push({ i: e.i, score: (a === 0 ? 0 : a > 0 ? 1 : 3) + b * 0.01 - N[e.i].r * 0.004 });
      if (hits.length > 60) break;
    }
    hits.sort((x, y) => x.score - y.score);
    if (!hits.length) return hideResults();
    results.innerHTML = hits
      .slice(0, 8)
      .map(
        (h) =>
          `<li role="option" aria-selected="false"><button type="button" data-i="${h.i}">
            <span class="rart" style="background-image:${artCss(h.i)}"></span>
            <span>${esc(N[h.i].l)}<span class="rmeta">${esc(
              N[h.i].k === 'page' ? N[h.i].sec : 'Film',
            )} · ${esc(P[N[h.i].p].short)}</span></span>
          </button></li>`,
      )
      .join('');
    results.hidden = false;
    q.setAttribute('aria-expanded', 'true');
    rIdx = -1;
  }
  q.addEventListener('input', search);
  q.addEventListener('focus', () => q.value.length > 1 && search());
  q.addEventListener('keydown', (e) => {
    const items = [...results.querySelectorAll('button')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault();
      rIdx = clamp(rIdx + (e.key === 'ArrowDown' ? 1 : -1), 0, items.length - 1);
      items.forEach((b, k) => b.parentElement.setAttribute('aria-selected', String(k === rIdx)));
      items[rIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const b = items[rIdx >= 0 ? rIdx : 0];
      if (b) goTo(+b.dataset.i);
    } else if (e.key === 'Escape') {
      hideResults();
      q.blur();
    }
  });
  results.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (b) goTo(+b.dataset.i);
  });
  function goTo(i) {
    hideResults();
    q.blur();
    dismissHint();
    camBefore = null;
    focus = -1;
    flyTo(N[i].x, N[i].y, 0.95);
    setTimeout(() => setFocus(i), calm ? 0 : 260);
  }

  /* ------------------------------------------------------------- list view */

  const listBtn = document.getElementById('listBtn');
  const alllist = document.getElementById('alllist');
  const alllistClose = document.getElementById('alllistClose');
  let lastFocused = null;
  function openList() {
    lastFocused = document.activeElement;
    alllist.hidden = false;
    document.body.classList.add('list-open');
    alllistClose.focus();
  }
  function closeList() {
    alllist.hidden = true;
    document.body.classList.remove('list-open');
    (lastFocused || listBtn).focus?.();
  }
  listBtn.addEventListener('click', openList);
  alllistClose.addEventListener('click', closeList);

  /* -------------------------------------------------------------- keyboard */

  cv.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (focus >= 0) {
        setFocus(-1);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (focus >= 0) {
        showPanel(focus, 'full');
        e.preventDefault();
      }
      return;
    }
    const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = dirs[e.key];
    if (!d) return;
    e.preventDefault();
    if (focus < 0) {
      /* start from whatever is nearest the middle */
      let best = -1;
      let bd = Infinity;
      for (let i = 0; i < N.length; i++) {
        const dd = Math.hypot(N[i].x - cam.x, N[i].y - cam.y);
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      }
      setFocus(best);
      return;
    }
    /* nearest node in the pressed direction, cone-weighted */
    let best = -1;
    let bs = Infinity;
    const fx = N[focus].x;
    const fy = N[focus].y;
    for (let i = 0; i < N.length; i++) {
      if (i === focus) continue;
      const dx = N[i].x - fx;
      const dy = N[i].y - fy;
      const along = dx * d[0] + dy * d[1];
      if (along <= 12) continue;
      const off = Math.abs(dx * d[1] - dy * d[0]);
      const s = along + off * 2.4 - (neigh.has(i) ? 220 : 0);
      if (s < bs) {
        bs = s;
        best = i;
      }
    }
    if (best >= 0) setFocus(best);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!alllist.hidden) {
        closeList();
        return;
      }
      if (stageMode === 'full') {
        showPanel(focus, 'peek');
        cv.focus();
      } else if (focus >= 0) {
        setFocus(-1);
        cv.focus();
      }
    }
    if (e.key === '/' && document.activeElement !== q) {
      e.preventDefault();
      q.focus();
    }
  });

  /* ------------------------------------------------------------------ hint */

  const hint = document.getElementById('hint');
  const HINT_KEY = 'web-hint-v1';
  function dismissHint() {
    if (hint.hidden) return;
    hint.hidden = true;
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  }
  document.getElementById('hintOk').addEventListener('click', dismissHint);
  let seen = false;
  try {
    seen = localStorage.getItem(HINT_KEY) === '1';
  } catch {
    /* ignore */
  }
  if (!seen) {
    hint.hidden = false;
    setTimeout(dismissHint, 11000);
  }

  /* ------------------------------------------------------------- lifecycle */

  let raf = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  /* ------------------------------------------------------------- entrance */

  resize();
  /* Open on the whole constellation, then fall into the age with the most
     stories — the camera does the explaining. */
  const rich = P.reduce((a, p, i) => (p.count > P[a].count ? i : a), 0);
  cam.z = tgt.z = clamp(zMin * 2.6, zMin, 0.145);
  cam.x = tgt.x = (P[3].x + P[4].x) / 2;
  cam.y = tgt.y = H / 2;
  clampCam(cam);
  if (calm) {
    flyTo(P[rich].x, H / 2, 0.5, true);
    entrance = 1;
  } else {
    setTimeout(() => flyTo(P[rich].x, H / 2, 0.55), 750);
  }
  raf = requestAnimationFrame(frame);

  /* a small handle for driving and measuring from the outside */
  window.__web = {
    focus: (i) => setFocus(i),
    open: (i) => setFocus(i, { mode: 'full' }),
    fly: flyTo,
    overview,
    fps: () => Math.round(fpsNow),
    state: () => ({ mode: stageMode, focus, hidden: panel.hidden }),
    cam,
    nodes: N,
    ready: true,
  };
}
