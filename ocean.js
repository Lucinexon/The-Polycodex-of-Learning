/* ==========================================================================
   THE POLYMATH CODEX — js/ocean.js
   Ambient deep-ocean scene behind the whole UI: looking up through towering
   alien coral-trees toward a distant light, marine snow drifting upward, slow
   light shafts and a whale gliding through the haze.

   · The trees + glow are painted ONCE to an offscreen canvas (on resize).
   · Per frame: blit that layer, then shafts, snow and the whale (30 fps cap).
   · Pauses when the tab is hidden; freezes in Focus mode and under
     prefers-reduced-motion (a single still frame is drawn instead).
   Zero dependencies. Exposes window.OceanFX.{redraw,pause,resume}.
   ========================================================================== */
'use strict';
(function () {
  const cv = document.getElementById('ocean');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(1.5, window.devicePixelRatio || 1);
  const TAU = Math.PI * 2;

  let W = 0, H = 0, layer = null, snow = [], raf = null, last = 0, running = false;

  /* deterministic PRNG so the forest looks the same every load */
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- one coral-tree, seen from below ---------- */
  function tree(c, x, baseY, topX, topY, trunkW, crownR, shade, R) {
    const col = shade;
    /* trunk: tapered, gently S-curved ribbon from the viewer's feet to the crown */
    const bend = (R() - 0.5) * trunkW * 1.6;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - trunkW, baseY);
    c.bezierCurveTo(x - trunkW * 0.9 + bend, baseY - (baseY - topY) * 0.35, topX - trunkW * 0.34 - bend, topY + (baseY - topY) * 0.3, topX - trunkW * 0.22, topY);
    c.lineTo(topX + trunkW * 0.22, topY);
    c.bezierCurveTo(topX + trunkW * 0.34 - bend, topY + (baseY - topY) * 0.3, x + trunkW * 0.9 + bend, baseY - (baseY - topY) * 0.35, x + trunkW, baseY);
    c.closePath(); c.fill();
    /* crown disc */
    c.beginPath(); c.ellipse(topX, topY, crownR * 0.34, crownR * 0.11, 0, 0, TAU); c.fill();
    /* filaments: a dandelion of fine branching strands */
    c.strokeStyle = col; c.lineCap = 'round';
    const n = Math.round(46 + crownR * 0.22);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (R() - 0.5) * 0.06;
      const len = crownR * (0.62 + R() * 0.5);
      const sx = topX + Math.cos(a) * crownR * 0.2, sy = topY + Math.sin(a) * crownR * 0.07;
      const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.78 - len * 0.1;
      const bx = (sx + ex) / 2 + (R() - 0.5) * len * 0.18, by = (sy + ey) / 2 - len * 0.16;
      c.lineWidth = Math.max(0.6, crownR * 0.008);
      c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(bx, by, ex, ey); c.stroke();
      /* twigs near the tip */
      for (let k = 0; k < 2; k++) {
        const t = 0.62 + k * 0.2;
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * bx + t * t * ex;
        const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * by + t * t * ey;
        const ta = a + (R() - 0.5) * 1.1;
        const tl = len * (0.16 + R() * 0.12);
        c.lineWidth = Math.max(0.5, crownR * 0.005);
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(ta) * tl, py + Math.sin(ta) * tl * 0.8 - tl * 0.1); c.stroke();
      }
    }
  }

  /* ---------- static layer: water, glow, star-band, forest ---------- */
  function paintLayer() {
    layer = document.createElement('canvas');
    layer.width = Math.round(W * DPR); layer.height = Math.round(H * DPR);
    const c = layer.getContext('2d'); c.scale(DPR, DPR);
    const portrait = H > W * 1.05;
    const R = rng(3301);

    /* water column */
    const base = c.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#07283a'); base.addColorStop(0.5, '#05202f'); base.addColorStop(1, '#021019');
    c.fillStyle = base; c.fillRect(0, 0, W, H);
    /* the distant light */
    const gx = W * 0.5, gy = H * (portrait ? 0.43 : 0.3), gr = Math.max(W, H) * (portrait ? 0.62 : 0.6);
    const glow = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
    glow.addColorStop(0, 'rgba(110,205,232,.62)'); glow.addColorStop(0.1, 'rgba(58,156,187,.46)');
    glow.addColorStop(0.45, 'rgba(12,84,108,.28)'); glow.addColorStop(1, 'rgba(2,16,25,0)');
    c.fillStyle = glow; c.fillRect(0, 0, W, H);
    const core = c.createRadialGradient(gx, gy, 0, gx, gy, Math.min(W, H) * 0.06);
    core.addColorStop(0, 'rgba(235,252,255,.95)'); core.addColorStop(1, 'rgba(235,252,255,0)');
    c.fillStyle = core; c.fillRect(gx - 200, gy - 200, 400, 400);

    /* a diagonal band of fine specks, like a galaxy seen through the water */
    const specks = Math.round(Math.min(1100, W * H / 1300));
    for (let i = 0; i < specks; i++) {
      const u = R(), v = (R() + R() + R() - 1.5) * 0.34;
      const ang = -0.92;
      const px = gx + (u - 0.5) * Math.max(W, H) * 1.3 * Math.cos(ang) - v * Math.max(W, H) * Math.sin(ang) * 0.5;
      const py = gy + (u - 0.5) * Math.max(W, H) * 1.3 * Math.sin(ang) + v * Math.max(W, H) * Math.cos(ang) * 0.5;
      const a = 0.12 + R() * 0.7 * (1 - Math.abs(v) * 1.8);
      c.fillStyle = 'rgba(214,244,252,' + Math.max(0.05, a).toFixed(3) + ')';
      const s = R() < 0.06 ? 1.8 : R() < 0.3 ? 1.2 : 0.8;
      c.fillRect(px, py, s, s);
    }

    /* far trees: low contrast, bluish — atmospheric depth */
    const far = '#0a3547';
    const farA = portrait
      ? [[0.34, 0.9, 0.5, 0.58, 14, 120], [0.66, 0.92, 0.56, 0.6, 14, 130]]
      : [[0.3, 0.98, 0.35, 0.54, 16, 150], [0.72, 1.0, 0.68, 0.5, 16, 160], [0.52, 1.0, 0.5, 0.66, 12, 110]];
    c.globalAlpha = 0.55;
    farA.forEach(function (t) { tree(c, W * t[0], H * t[1], W * (t[0] + (R() - 0.5) * 0.04), H * t[3], t[4], t[5] * (W < 600 ? 0.8 : 1), far, R); });

    /* mid trees */
    c.globalAlpha = 0.82;
    const mid = '#052434';
    const midA = portrait
      ? [[0.22, 1.02, 0.3, 0.72, 20, 160], [0.78, 1.02, 0.7, 0.74, 20, 170]]
      : [[0.12, 1.02, 0.17, 0.58, 30, 230], [0.9, 1.02, 0.86, 0.6, 30, 240]];
    midA.forEach(function (t) { tree(c, W * t[0], H * t[1], W * t[2], H * t[3], t[4], t[5] * (W < 600 ? 0.9 : 1), mid, R); });

    /* near giants: the silhouettes that frame everything */
    c.globalAlpha = 1;
    const near = '#020f17';
    if (portrait) {
      tree(c, -W * 0.02, H * 1.05, W * 0.16, H * 0.34, W * 0.2, W * 0.62, near, R);
      tree(c, W * 1.04, H * 1.05, W * 0.88, H * 0.26, W * 0.22, W * 0.7, near, R);
    } else {
      tree(c, -W * 0.04, H * 1.06, W * 0.045, H * 0.3, Math.min(150, W * 0.09), Math.min(W * 0.34, 420), near, R);
      tree(c, W * 1.04, H * 1.06, W * 0.955, H * 0.22, Math.min(170, W * 0.1), Math.min(W * 0.38, 480), near, R);
    }
    /* settle everything into the haze */
    const haze = c.createLinearGradient(0, H * 0.55, 0, H);
    haze.addColorStop(0, 'rgba(2,16,25,0)'); haze.addColorStop(1, 'rgba(1,10,16,.55)');
    c.fillStyle = haze; c.fillRect(0, 0, W, H);
  }

  /* ---------- animated bits ---------- */
  function seedSnow() {
    const n = Math.round(Math.min(130, Math.max(36, W * H / 14000)));
    snow = [];
    for (let i = 0; i < n; i++) {
      snow.push({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 1.7, v: 0.006 + Math.random() * 0.02,
        ph: Math.random() * TAU, amb: Math.random() < 0.1, tw: 0.4 + Math.random() * 1.6 });
    }
  }
  function whale(c, x, y, s, rot, tail, alpha) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.globalAlpha = alpha; c.fillStyle = '#010a10'; c.strokeStyle = 'rgba(120,225,255,.22)'; c.lineWidth = 0.7 / s;
    c.beginPath(); c.moveTo(100, 2);
    c.bezierCurveTo(92, -12, 70, -16, 48, -13); c.bezierCurveTo(30, -10, 14, -6, 4, -3.5);
    c.lineTo(4, 3); c.bezierCurveTo(14, 6, 32, 10, 52, 13); c.bezierCurveTo(74, 16, 94, 12, 100, 2);
    c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(70, 10); c.quadraticCurveTo(60, 24, 46, 31); c.quadraticCurveTo(58, 15, 60, 10); c.closePath(); c.fill();
    c.save(); c.translate(4, -0.5); c.rotate(tail);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-15, -11); c.quadraticCurveTo(-19, -3, -12, 0); c.quadraticCurveTo(-19, 3, -15, 11); c.closePath(); c.fill(); c.restore();
    c.restore();
  }
  function frame(t, still) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(layer, 0, 0, cv.width, cv.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const tt = still ? 0 : t;
    /* light shafts */
    ctx.globalCompositeOperation = 'lighter';
    const gx = W * 0.5, top = -20;
    for (let i = 0; i < 4; i++) {
      const off = (i - 1.5) * W * 0.12 + Math.sin(tt / 5200 + i * 1.7) * 26;
      const wd = W * (0.05 + i * 0.012);
      const g = ctx.createLinearGradient(0, top, 0, H * 0.9);
      g.addColorStop(0, 'rgba(120,220,245,' + (0.07 + 0.02 * Math.sin(tt / 3100 + i)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(120,220,245,0)');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(gx + off - wd * 0.35, top); ctx.lineTo(gx + off + wd * 0.35, top);
      ctx.lineTo(gx + off * 2.2 + wd * 1.4, H); ctx.lineTo(gx + off * 2.2 - wd * 1.4, H); ctx.closePath(); ctx.fill();
    }
    /* marine snow */
    for (let i = 0; i < snow.length; i++) {
      const p = snow[i];
      if (!still) { p.y -= p.v * 16; p.x += Math.sin(tt / 1400 + p.ph) * 0.12; if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; } }
      const a = 0.18 + 0.5 * Math.abs(Math.sin(tt / (900 * p.tw) + p.ph));
      ctx.fillStyle = p.amb ? 'rgba(255,200,116,' + (a * 0.8).toFixed(3) + ')' : 'rgba(205,242,252,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      if (p.r > 1.7) { ctx.fillStyle = 'rgba(160,230,250,.05)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, TAU); ctx.fill(); }
    }
    /* the whale (and a distant calf) */
    ctx.globalCompositeOperation = 'source-over';
    const sz = Math.max(0.9, Math.min(W * 0.0017, 2.4));
    const span = W + 520 * sz, cyc = still ? 0.42 : (((tt / 80000) + 0.2) % 1);
    const wx = -260 * sz + cyc * span, wy = H * 0.5 - cyc * H * 0.2 + Math.sin(tt / 4300) * 10;
    const tail = still ? 0 : Math.sin(tt / 680) * 0.3;
    whale(ctx, wx - 190 * sz, wy + 70 * sz, sz * 0.38, -0.2, still ? 0 : Math.sin(tt / 520) * 0.3, 0.5);
    whale(ctx, wx, wy, sz, -0.2, tail, 0.78);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  /* ---------- lifecycle ---------- */
  function animate() { return !REDUCED && !document.hidden && !document.body.classList.contains('focusmode'); }
  function loop(t) {
    raf = null; if (!running) return;
    if (t - last >= 33) { last = t; frame(t, false); }       // ~30 fps
    raf = requestAnimationFrame(loop);
  }
  function resume() {
    if (running || !layer) return;
    if (!animate()) { frame(0, true); return; }
    running = true; last = 0; raf = requestAnimationFrame(loop);
  }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
  function size() {
    const w = window.innerWidth, h = window.innerHeight;
    if (layer && w === W && Math.abs(h - H) < 120) return;     // ignore mobile URL-bar jitter
    W = w; H = h;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    paintLayer(); seedSnow();
    if (running) return;
    frame(0, true);
  }
  let rT = null;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(size, 220); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else { pause(); resume(); } });
  new MutationObserver(function () { pause(); resume(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  size(); resume();
  window.OceanFX = { redraw: function () { layer = null; size(); }, pause: pause, resume: resume };
})();
