/* ==========================================================================
  THE POLYMATH CODEX — js/core/ocean.js  (v2)
   Ambient deep-ocean scene behind the whole UI, tuned to the reference photo:
   a luminous blue water column with a bright light and a diagonal band of
   nebula-like starlight, thousands of glowing specks suspended in the water,
   rim-lit coral-tree trunks with dandelion crowns whose filament tips catch
   the light, and whales gliding through the haze.

   · Everything static (water, nebula, forest, specks) is painted ONCE to an
     offscreen layer on resize.
   · Per frame (30 fps cap): blit the layer, light shafts, twinkling snow, whales.
   · Pauses when hidden; freezes in Focus mode and under reduced-motion.
   Zero dependencies. window.OceanFX = { redraw, pause, resume }.
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

  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function bez(p0, p1, p2, p3, t) { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; }

  /* a glowing speck with optional bloom */
  function speck(c, x, y, r, a, bloom) {
    if (bloom) {
      const g = c.createRadialGradient(x, y, 0, x, y, bloom);
      g.addColorStop(0, 'rgba(190,240,255,' + (a * 0.5).toFixed(3) + ')'); g.addColorStop(1, 'rgba(190,240,255,0)');
      c.fillStyle = g; c.fillRect(x - bloom, y - bloom, bloom * 2, bloom * 2);
    }
    c.fillStyle = 'rgba(226,248,255,' + a.toFixed(3) + ')';
    if (r <= 1) c.fillRect(x, y, r + 0.4, r + 0.4); else { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  }

  /* ---------- one coral-tree seen from below ---------- */
  function tree(c, x, baseY, topX, topY, trunkW, crownR, col, rim, R, glint) {
    const bend = (R() - 0.5) * trunkW * 1.6, span = baseY - topY;
    const L = [x - trunkW, baseY, x - trunkW * 0.9 + bend, baseY - span * 0.35, topX - trunkW * 0.34 - bend, topY + span * 0.3, topX - trunkW * 0.22, topY];
    const Rr = [x + trunkW, baseY, x + trunkW * 0.9 + bend, baseY - span * 0.35, topX + trunkW * 0.34 - bend, topY + span * 0.3, topX + trunkW * 0.22, topY];
    c.fillStyle = col;
    c.beginPath(); c.moveTo(L[0], L[1]);
    c.bezierCurveTo(L[2], L[3], L[4], L[5], L[6], L[7]); c.lineTo(Rr[6], Rr[7]);
    c.bezierCurveTo(Rr[4], Rr[5], Rr[2], Rr[3], Rr[0], Rr[1]); c.closePath(); c.fill();
    /* bark: faint ridges following the trunk */
    if (rim) {
      c.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const f = 0.12 + R() * 0.76, t0 = R() * 0.78, t1 = t0 + 0.05 + R() * 0.1;
        const pt = function (t) { return [bez(L[0], L[2], L[4], L[6], t) * (1 - f) + bez(Rr[0], Rr[2], Rr[4], Rr[6], t) * f, bez(L[1], L[3], L[5], L[7], t) * (1 - f) + bez(Rr[1], Rr[3], Rr[5], Rr[7], t) * f]; };
        const a = pt(t0), m = pt((t0 + t1) / 2), b = pt(t1);
        c.strokeStyle = 'rgba(110,205,240,' + (0.05 + R() * 0.07).toFixed(3) + ')'; c.lineWidth = 1 + R() * 1.6;
        c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(m[0] + (R() - 0.5) * 6, m[1], b[0], b[1]); c.stroke();
      }
      /* rim light on the edge that faces the glow */
      const E = topX < W / 2 ? Rr : L;
      c.strokeStyle = rim; c.lineWidth = Math.max(1.6, trunkW * 0.035);
      c.beginPath(); c.moveTo(E[0], E[1]); c.bezierCurveTo(E[2], E[3], E[4], E[5], E[6], E[7]); c.stroke();
    }
    /* crown disc with a lit lip */
    c.fillStyle = col;
    c.beginPath(); c.ellipse(topX, topY, crownR * 0.34, crownR * 0.11, 0, 0, TAU); c.fill();
    if (rim) { c.strokeStyle = rim; c.lineWidth = 1.4; c.beginPath(); c.ellipse(topX, topY, crownR * 0.34, crownR * 0.11, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); }
    /* filaments: a dandelion of fine branching strands */
    c.strokeStyle = col; c.lineCap = 'round';
    const n = Math.round(54 + crownR * 0.24), tips = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (R() - 0.5) * 0.06;
      const len = crownR * (0.62 + R() * 0.5);
      const sx = topX + Math.cos(a) * crownR * 0.2, sy = topY + Math.sin(a) * crownR * 0.07;
      const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.78 - len * 0.1;
      const bx = (sx + ex) / 2 + (R() - 0.5) * len * 0.18, by = (sy + ey) / 2 - len * 0.16;
      c.lineWidth = Math.max(0.7, crownR * 0.0085);
      c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(bx, by, ex, ey); c.stroke();
      for (let k = 0; k < 2; k++) {
        const t = 0.62 + k * 0.2;
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * bx + t * t * ex;
        const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * by + t * t * ey;
        const ta = a + (R() - 0.5) * 1.1, tl = len * (0.16 + R() * 0.12);
        c.lineWidth = Math.max(0.5, crownR * 0.005);
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(ta) * tl, py + Math.sin(ta) * tl * 0.8 - tl * 0.1); c.stroke();
      }
      if (R() < glint) tips.push([ex, ey]);
    }
    /* stars caught in the branches */
    tips.forEach(function (p) { speck(c, p[0], p[1], 0.8 + R() * 0.9, 0.45 + R() * 0.5, R() < 0.18 ? 7 : 0); });
  }

  /* ---------- static layer ---------- */
  function paintLayer() {
    layer = document.createElement('canvas');
    layer.width = Math.round(W * DPR); layer.height = Math.round(H * DPR);
    const c = layer.getContext('2d'); c.scale(DPR, DPR);
    const portrait = H > W * 1.05, R = rng(3301), M = Math.max(W, H);
    const gx = W * 0.5, gy = H * (portrait ? 0.42 : 0.3);

    /* luminous water column */
    const base = c.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#0a4468'); base.addColorStop(0.4, '#0b5780'); base.addColorStop(0.72, '#073c5c'); base.addColorStop(1, '#03213a');
    c.fillStyle = base; c.fillRect(0, 0, W, H);

    /* nebula clouds along the band + the big light */
    const ang = portrait ? -1.05 : -0.48;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 11; i++) {
      const t = i / 10 - 0.5, cx = gx + Math.cos(ang) * t * M * 1.15, cy = gy + Math.sin(ang) * t * M * 1.15, r = M * (0.16 + R() * 0.17);
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(70,175,225,' + (0.2 * (1 - Math.abs(t) * 1.4)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(70,175,225,0)');
      c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    const glow = c.createRadialGradient(gx, gy, 0, gx, gy, M * 0.72);
    glow.addColorStop(0, 'rgba(205,246,255,.9)'); glow.addColorStop(0.03, 'rgba(130,222,248,.72)'); glow.addColorStop(0.15, 'rgba(62,170,210,.44)');
    glow.addColorStop(0.45, 'rgba(18,108,150,.26)'); glow.addColorStop(1, 'rgba(10,70,110,0)');
    c.fillStyle = glow; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';

    /* starlight: dense along the band, scattered everywhere */
    const dens = Math.min(2800, W * H / 520);
    for (let i = 0; i < dens; i++) {
      const u = R(), v = (R() + R() + R() - 1.5) * 0.3, k = Math.max(W, H) * 1.5;
      const px = gx + Math.cos(ang) * (u - 0.5) * k - Math.sin(ang) * v * M * 0.5;
      const py = gy + Math.sin(ang) * (u - 0.5) * k + Math.cos(ang) * v * M * 0.5;
      const near = 1 - Math.min(1, Math.abs(v) * 2.2);
      speck(c, px, py, R() < 0.06 ? 1.6 : R() < 0.3 ? 1 : 0.6, Math.max(0.06, 0.12 + near * 0.6 * R()), 0);
    }
    for (let i = 0; i < W * H / 2200; i++) speck(c, R() * W, R() * H, R() < 0.1 ? 1.5 : 0.7, 0.08 + R() * 0.4, 0);

    /* far forest: pale blue haze */
    const far = '#0b4666';
    c.globalAlpha = 0.6;
    (portrait ? [[0.34, 0.9, 0.5, 0.56, 14, 120], [0.68, 0.92, 0.56, 0.58, 14, 130]] : [[0.3, 0.98, 0.35, 0.52, 16, 150], [0.72, 1, 0.68, 0.48, 16, 160], [0.52, 1, 0.5, 0.64, 12, 110]])
      .forEach(function (t) { tree(c, W * t[0], H * t[1], W * (t[0] + (R() - 0.5) * 0.04), H * t[3], t[4], t[5] * (W < 600 ? 0.8 : 1), far, null, R, 0.35); });
    c.globalAlpha = 1; c.fillStyle = 'rgba(14,100,140,.24)'; c.fillRect(0, 0, W, H);

    /* mid forest */
    c.globalAlpha = 0.9;
    (portrait ? [[0.2, 1.02, 0.28, 0.7, 20, 150], [0.8, 1.02, 0.72, 0.72, 20, 160]] : [[0.12, 1.02, 0.17, 0.56, 30, 230], [0.9, 1.02, 0.86, 0.58, 30, 240]])
      .forEach(function (t) { tree(c, W * t[0], H * t[1], W * t[2], H * t[3], t[4], t[5] * (W < 600 ? 0.9 : 1), '#06293f', 'rgba(110,210,245,.2)', R, 0.28); });
    c.globalAlpha = 1; c.fillStyle = 'rgba(10,84,120,.12)'; c.fillRect(0, 0, W, H);

    /* near giants: rim-lit silhouettes */
    const near = '#020f18', rim = 'rgba(120,218,248,.34)';
    if (portrait) {
      tree(c, -W * 0.02, H * 1.05, W * 0.15, H * 0.34, W * 0.2, W * 0.5, near, rim, R, 0.3);
      tree(c, W * 1.04, H * 1.05, W * 0.88, H * 0.27, W * 0.22, W * 0.56, near, rim, R, 0.3);
    } else {
      tree(c, -W * 0.04, H * 1.06, W * 0.045, H * 0.3, Math.min(150, W * 0.09), Math.min(W * 0.34, 420), near, rim, R, 0.3);
      tree(c, W * 1.04, H * 1.06, W * 0.955, H * 0.22, Math.min(170, W * 0.1), Math.min(W * 0.38, 480), near, rim, R, 0.3);
    }

    /* depth fog, then particulate caught in front of everything */
    const haze = c.createLinearGradient(0, H * 0.5, 0, H);
    haze.addColorStop(0, 'rgba(3,33,58,0)'); haze.addColorStop(1, 'rgba(2,22,40,.5)');
    c.fillStyle = haze; c.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 1500; i++) speck(c, R() * W, R() * H, R() < 0.08 ? 1.5 : 0.8, 0.08 + R() * 0.5, R() < 0.03 ? 8 : 0);
  }

  /* ---------- animated bits ---------- */
  function seedSnow() {
    const n = Math.round(Math.min(150, Math.max(40, W * H / 12000)));
    snow = [];
    for (let i = 0; i < n; i++) snow.push({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 1.8, v: 0.006 + Math.random() * 0.02, ph: Math.random() * TAU, amb: Math.random() < 0.08, tw: 0.4 + Math.random() * 1.6 });
  }
  function whale(c, x, y, s, rot, tail, alpha) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.globalAlpha = alpha; c.fillStyle = '#010a12'; c.strokeStyle = 'rgba(140,228,252,.4)'; c.lineWidth = 0.9 / s;
    c.shadowColor = 'rgba(120,225,255,.35)'; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(100, 2);
    c.bezierCurveTo(92, -12, 70, -16, 48, -13); c.bezierCurveTo(30, -10, 14, -6, 4, -3.5);
    c.lineTo(4, 3); c.bezierCurveTo(14, 6, 32, 10, 52, 13); c.bezierCurveTo(74, 16, 94, 12, 100, 2);
    c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(70, 10); c.quadraticCurveTo(60, 24, 44, 33); c.quadraticCurveTo(58, 15, 60, 10); c.closePath(); c.fill();
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
    ctx.globalCompositeOperation = 'lighter';
    const gx = W * 0.5, top = -20;
    for (let i = 0; i < 4; i++) {
      const off = (i - 1.5) * W * 0.12 + Math.sin(tt / 5200 + i * 1.7) * 26, wd = W * (0.05 + i * 0.012);
      const g = ctx.createLinearGradient(0, top, 0, H * 0.9);
      g.addColorStop(0, 'rgba(130,225,250,' + (0.1 + 0.025 * Math.sin(tt / 3100 + i)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(130,225,250,0)');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(gx + off - wd * 0.35, top); ctx.lineTo(gx + off + wd * 0.35, top);
      ctx.lineTo(gx + off * 2.2 + wd * 1.4, H); ctx.lineTo(gx + off * 2.2 - wd * 1.4, H); ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < snow.length; i++) {
      const p = snow[i];
      if (!still) { p.y -= p.v * 16; p.x += Math.sin(tt / 1400 + p.ph) * 0.12; if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; } }
      const a = 0.22 + 0.62 * Math.abs(Math.sin(tt / (900 * p.tw) + p.ph));
      ctx.fillStyle = p.amb ? 'rgba(255,205,125,' + (a * 0.85).toFixed(3) + ')' : 'rgba(210,244,255,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      if (p.r > 1.5) { ctx.fillStyle = 'rgba(160,232,255,.07)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, TAU); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
    const sz = Math.max(0.95, Math.min(W * 0.0018, 2.6));
    const span = W + 520 * sz, cyc = still ? 0.42 : (((tt / 80000) + 0.2) % 1);
    const wx = -260 * sz + cyc * span, wy = H * 0.5 - cyc * H * 0.2 + Math.sin(tt / 4300) * 10;
    whale(ctx, wx - 200 * sz, wy + 75 * sz, sz * 0.4, -0.2, still ? 0 : Math.sin(tt / 520) * 0.3, 0.55);
    whale(ctx, wx, wy, sz, -0.2, still ? 0 : Math.sin(tt / 680) * 0.3, 0.86);
    ctx.globalAlpha = 1;
  }

  /* ---------- lifecycle ---------- */
  function animate() { return !REDUCED && !document.hidden && !document.body.classList.contains('focusmode') && !document.body.classList.contains('noocean'); }
  function loop(t) { raf = null; if (!running) return; if (t - last >= 33) { last = t; frame(t, false); } raf = requestAnimationFrame(loop); }
  function resume() { if (running || !layer) return; if (!animate()) { frame(0, true); return; } running = true; last = 0; raf = requestAnimationFrame(loop); }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
  function size() {
    const w = window.innerWidth, h = window.innerHeight;
    if (layer && w === W && Math.abs(h - H) < 120) return;
    W = w; H = h;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    paintLayer(); seedSnow();
    if (!running) frame(0, true);
  }
  let rT = null;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(size, 220); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else { pause(); resume(); } });
  new MutationObserver(function () { pause(); resume(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  size(); resume();
  window.OceanFX = { redraw: function () { layer = null; size(); }, pause: pause, resume: resume };
})();
