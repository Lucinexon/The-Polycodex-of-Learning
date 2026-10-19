/* lounge-art.js — CodexLoungeArt: procedural scenery for the lounge's side rooms and the door sprites that lead to them.
   · Everything is drawn on the lounge's 480×300 logical canvas with plain 2D calls (no image files, no network).
   · Static layers are painted once per room into an offscreen canvas by lounge2.js; the `dyn` layer is the only per-frame work.
   · Registered through CodexLounge.registerArt / decorate (see lounge2.js). Geometry that matters for gameplay (hotspots, entrances)
     lives in lounge-world.js — the numbers used here for doors/props are shared through CodexLoungeArt.GEO so art and hitboxes cannot drift. */
(function (root) {
'use strict';
const seedR = n => { let s = n; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const H = c => ({
  R: (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); },
  E: (x, y, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); },
  G: (y0, y1, a, b, x, w) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(x || 0, y0, w || 480, y1 - y0); },
  L: (x1, y1, x2, y2, col, w) => { c.strokeStyle = col; c.lineWidth = w || 1; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); },
  P: (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); },
  glow: (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
});

/* Door rectangles shared with the world definitions (x, y, w, h). Entrances in the main rooms and exits in the side rooms. */
const GEO = {
  deck: { dome: { x: 96, y: 126, w: 40, h: 60 } },
  cafe: { kitchen: { x: 190, y: 96, w: 44, h: 90 } },
  garden: { conservatory: { x: 184, y: 112, w: 50, h: 74 } },
  loft: { archive: { x: 332, y: 62, w: 48, h: 124 } },   /* a hinged bookcase in the right-hand stack (the edge zones belong to the ring doors) */
  exit: { x: 8, y: 128, w: 38, h: 58 }
};

/* ---------- door sprites (drawn in the scenery layer, behind characters) ---------- */
function doorSprite(c, g, kind, t, locked) {
  const { R, E, L, P, glow } = H(c), x = g.x, y = g.y, w = g.w, h = g.h, tw = Math.sin(t / 500);
  if (kind === 'dome') {              /* brass round hatch with a lit porthole */
    R(x - 3, y - 3, w + 6, h + 3, '#07131f'); E(x + w / 2, y + 22, w / 2 + 2, 24, '#7c6a3e'); E(x + w / 2, y + 22, w / 2 - 3, 20, '#b99a55'); E(x + w / 2, y + 22, w / 2 - 9, 14, '#0b1736'); glow(x + w / 2, y + 22, 18, 'rgba(160,190,255,' + (.35 + .15 * tw) + ')');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; E(x + w / 2 + Math.cos(a) * (w / 2 - 5), y + 22 + Math.sin(a) * 18, 1.5, 1.5, '#e6d49a'); }
    R(x + 4, y + 48, w - 8, 12, '#6b5a34'); R(x + 6, y + 50, w - 12, 2, '#d9c07a');
  } else if (kind === 'kitchen') {    /* swing door with a round window */
    R(x, y, w, h, '#4a2f1d'); R(x + 3, y + 3, w - 6, h - 6, '#6b4328'); R(x + w / 2 - 1, y + 3, 2, h - 6, '#3a2415'); E(x + w / 4 + 1, y + 28, 7, 7, '#e7f2ee'); E(x + w * .75 - 1, y + 28, 7, 7, '#e7f2ee');
    E(x + w / 4 + 1, y + 28, 5, 5, 'rgba(255,214,150,' + (.5 + .2 * tw) + ')'); E(x + w * .75 - 1, y + 28, 5, 5, 'rgba(255,214,150,' + (.5 + .2 * tw) + ')'); R(x + 5, y + 60, w - 10, 3, '#c9a15a'); R(x, y + h - 4, w, 4, '#2a180d');
  } else if (kind === 'conservatory') { /* glass arch door with glowing panes */
    R(x, y + 14, w, h - 14, '#0a2a2e'); E(x + w / 2, y + 14, w / 2, 14, '#0a2a2e'); R(x + 4, y + 16, w - 8, h - 18, '#0f4a52'); E(x + w / 2, y + 16, w / 2 - 4, 11, '#0f4a52');
    R(x + w / 2 - 1, y + 6, 2, h - 8, '#1d7d80'); R(x + 4, y + 44, w - 8, 2, '#1d7d80'); glow(x + w / 2, y + h / 2, 34, 'rgba(70,240,196,' + (.22 + .1 * tw) + ')');
    c.strokeStyle = '#3aa8a0'; c.lineWidth = 2; c.beginPath(); c.ellipse(x + w / 2, y + 14, w / 2, 14, 0, Math.PI, 0); c.lineTo(x + w, y + h); c.moveTo(x, y + 14); c.lineTo(x, y + h); c.stroke();
  } else if (kind === 'archive') {    /* the hinged bookcase: a door disguised as shelving, with a brass lock plate */
    const cols = ['#8a2f3a', '#c9a64a', '#2f6b8a', '#4f7a4a', '#6a3f8a', '#d9cfb0', '#a0552a', '#334455'], r = seedR(5);
    R(x, y, w, h, '#4a3322'); R(x + 2, y + 2, w - 4, h - 2, '#2a1a10');
    for (let row = 0; row < 4; row++) { const yy = y + 6 + row * 29; R(x + 4, yy, w - 8, 25, '#1c120b'); let bx = x + 5; while (bx < x + w - 9) { const bw = 3 + Math.floor(r() * 4), bh = 15 + Math.floor(r() * 9); R(bx, yy + 25 - bh, bw, bh, cols[Math.floor(r() * cols.length)]); R(bx, yy + 25 - bh, 1, bh, 'rgba(255,255,255,.16)'); bx += bw; } R(x + 4, yy + 25, w - 8, 3, '#5a3a24'); }
    R(x + w / 2, y + 3, 1, h - 6, locked ? 'rgba(0,0,0,.55)' : 'rgba(255,205,120,' + (.55 + .25 * tw) + ')');
    R(x + w - 14, y + 54, 8, 18, '#c9a64a'); R(x + w - 12, y + 56, 4, 14, '#7a6030'); E(x + w - 10, y + 62, 1.6, 1.6, '#1a0f08');
    if (locked) { E(x + w - 10, y + 80, 5, 5, '#8a8f98'); R(x + w - 15, y + 80, 10, 9, '#5a5f68'); c.strokeStyle = '#8a8f98'; c.lineWidth = 2; c.beginPath(); c.arc(x + w - 10, y + 80, 4, Math.PI, 0); c.stroke(); } else glow(x + w / 2, y + h / 2, 34, 'rgba(255,200,110,' + (.12 + .06 * tw) + ')');
  } else {                            /* generic exit back to the parent room */
    R(x, y, w, h, '#0c1626'); R(x + 3, y + 3, w - 6, h - 3, '#16243b'); R(x + w - 9, y + 30, 4, 8, '#c9a64a'); glow(x + w / 2, y + h / 2, 30, 'rgba(255,214,120,' + (.14 + .06 * tw) + ')');
  }
}

/* ---------- Telescope Dome ---------- */
const dome = {
  light: 'rgba(40,60,140,.10)',
  stat(c) {
    const { R, E, G, L, P, glow } = H(c), r = seedR(7);
    G(0, 185, '#060b22', '#1a2552');
    c.strokeStyle = 'rgba(130,160,230,.16)'; c.lineWidth = 2; for (let i = -7; i <= 7; i++) { c.beginPath(); c.moveTo(240, -80); c.quadraticCurveTo(240 + i * 48, 70, 240 + i * 86, 186); c.stroke(); }
    c.strokeStyle = 'rgba(196,170,100,.38)'; c.lineWidth = 3; [46, 98, 150].forEach(y => { c.beginPath(); c.ellipse(240, y - 30, 130 + y * 1.5, y * .55, 0, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke(); });
    c.save(); c.beginPath(); c.moveTo(212, 0); c.lineTo(268, 0); c.lineTo(318, 186); c.lineTo(166, 186); c.closePath(); c.clip(); G(0, 186, '#03061a', '#122052');
    for (let i = 0; i < 70; i++) R(Math.floor(160 + r() * 170), Math.floor(r() * 180), r() < .15 ? 2 : 1, r() < .15 ? 2 : 1, 'rgba(225,238,255,' + (.5 + r() * .5) + ')');
    c.fillStyle = '#f4ecc8'; c.beginPath(); c.arc(262, 40, 11, 0, 7); c.fill(); c.fillStyle = '#122052'; c.beginPath(); c.arc(267, 37, 10, 0, 7); c.fill(); c.restore();
    L(212, 0, 166, 186, '#c9a64a', 3); L(268, 0, 318, 186, '#c9a64a', 3); L(212, 0, 268, 0, '#c9a64a', 3);
    R(0, 185, 480, 115, '#0f1634'); G(185, 300, '#161e44', '#0a1029'); for (let y = 196; y < 300; y += 18) R(0, y, 480, 1, 'rgba(120,140,220,.10)');
    c.strokeStyle = '#b99a55'; c.lineWidth = 2; c.beginPath(); c.ellipse(240, 246, 150, 34, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(240, 246, 104, 23, 0, 0, 7); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; L(240 + Math.cos(a) * 104, 246 + Math.sin(a) * 23, 240 + Math.cos(a) * 150, 246 + Math.sin(a) * 34, 'rgba(185,154,85,.6)', 1); }
    c.fillStyle = 'rgba(150,175,255,.07)'; c.beginPath(); c.moveTo(166, 186); c.lineTo(318, 186); c.lineTo(380, 262); c.lineTo(110, 262); c.closePath(); c.fill();
    R(180, 150, 120, 36, 'rgba(0,0,0,0)');
    [[34, 66], [82, 58], [130, 70]].forEach((p, i) => { R(p[0], p[1], 40, 52, '#2a2f55'); R(p[0] + 2, p[1] + 2, 36, 48, i % 2 ? '#d8cfa6' : '#cfc79c'); for (let k = 0; k < 9; k++) R(p[0] + 5 + Math.floor(r() * 28), p[1] + 5 + Math.floor(r() * 38), 2, 2, '#2a2f55'); L(p[0] + 8, p[1] + 14, p[0] + 20, p[1] + 26, 'rgba(42,47,85,.7)'); L(p[0] + 20, p[1] + 26, p[0] + 30, p[1] + 18, 'rgba(42,47,85,.7)'); });
    R(30, 176, 104, 6, '#8a6a40'); R(30, 182, 104, 3, '#5a432a'); R(36, 182, 5, 18, '#5a432a'); R(124, 182, 5, 18, '#5a432a');
    R(52, 166, 44, 10, '#e8dcc0'); R(73, 164, 2, 12, '#7a5a3a'); R(56, 168, 15, 1, '#9a8a6a'); R(56, 171, 15, 1, '#9a8a6a'); R(77, 168, 15, 1, '#9a8a6a'); R(77, 171, 15, 1, '#9a8a6a');
    R(106, 150, 3, 28, '#b99a55'); L(107, 150, 120, 140, '#b99a55', 2); P([[112, 140], [132, 140], [128, 150], [116, 150]], '#2f6b58');
    E(420, 174, 14, 14, '#2a3a78'); E(420, 174, 14, 3, '#b99a55'); R(418, 188, 4, 12, '#6b5a34'); R(408, 198, 24, 4, '#6b5a34'); c.strokeStyle = 'rgba(160,190,255,.6)'; c.lineWidth = 1; c.beginPath(); c.ellipse(420, 174, 14, 6, 0, 0, 7); c.stroke();
    c.save(); c.translate(302, 178); c.rotate(-0.58); const g = c.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, '#6b7a96'); g.addColorStop(.5, '#d7e0ee'); g.addColorStop(1, '#6b7a96'); c.fillStyle = g; c.fillRect(-9, -112, 18, 112);
    c.fillStyle = '#b99a55'; c.fillRect(-10, -112, 20, 5); c.fillRect(-10, -60, 20, 3); c.fillRect(-10, -8, 20, 4); c.fillStyle = '#9ac8ff'; c.fillRect(-7, -116, 14, 3); c.fillStyle = '#2a3552'; c.fillRect(-4, 0, 8, 12); c.restore();
    R(292, 178, 22, 12, '#5a4a30'); R(288, 188, 30, 5, '#3a2e1c'); L(300, 192, 280, 206, '#5a4a30', 3); L(304, 192, 324, 206, '#5a4a30', 3); L(302, 192, 302, 208, '#5a4a30', 3);
  },
  dyn(L, c, t) {
    const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    if (!L.REDUCED) for (let i = 0; i < 22; i++) { const x = 176 + ((i * 53) % 130), y = (i * 37) % 170, a = .3 + .5 * Math.abs(Math.sin(t / 600 + i * 1.3)); R(x, y, 1, 1, 'rgba(240,248,255,' + a + ')'); }
    for (let i = 0; i < 10; i++) { const p = ((t / 6000) + i / 10) % 1, x = 190 + i * 11 + Math.sin(t / 1900 + i) * 6, y = 20 + p * 200; c.fillStyle = 'rgba(190,210,255,' + (.28 * (1 - Math.abs(p - .5) * 2)) + ')'; c.fillRect(x, y, 1, 1); }
    c.fillStyle = 'rgba(255,214,140,' + (.09 + .03 * Math.sin(t / 240)) + ')'; c.beginPath(); c.arc(120, 140, 34, 0, 7); c.fill();
    c.fillStyle = 'rgba(190,225,255,' + (.5 + .4 * Math.sin(t / 700)) + ')'; c.fillRect(247, 69, 2, 2);
  }
};

/* ---------- Café Kitchen ---------- */
const kitchen = {
  light: 'rgba(255,190,110,.10)',
  stat(c) {
    const { R, E, G, L, P } = H(c);
    G(0, 185, '#c7d9d3', '#b4cbc4'); for (let y = 0; y < 185; y += 12) { R(0, y, 480, 1, 'rgba(70,100,96,.28)'); for (let x = (y / 12 % 2) * 12; x < 480; x += 24) R(x, y, 1, 12, 'rgba(70,100,96,.28)'); }
    R(0, 0, 480, 22, '#7d5a3c'); R(0, 22, 480, 3, '#4a3320');
    R(0, 185, 480, 115, '#d9cdb4'); for (let y = 185, j = 0; y < 300; y += 22, j++) for (let x = (j % 2) * 22; x < 480; x += 44) R(x, y, 22, 22, '#8d7254'); R(0, 185, 480, 3, '#5a432a');
    R(52, 68, 52, 118, '#aeb8bd'); R(54, 70, 48, 114, '#cdd6da'); R(54, 126, 48, 2, '#7c868c'); R(92, 92, 3, 16, '#6b757b'); R(92, 140, 3, 20, '#6b757b'); R(60, 78, 22, 8, '#1f2a30'); R(62, 80, 8, 3, '#4de0c0');
    R(112, 52, 108, 76, '#6b4a2e'); R(116, 56, 100, 68, '#26402f'); c.fillStyle = 'rgba(240,240,225,.85)'; c.font = 'bold 8px "Atkinson Hyperlegible",sans-serif'; c.fillText('TODAY', 124, 70); R(124, 76, 78, 1, 'rgba(240,240,225,.5)'); R(124, 86, 62, 1, 'rgba(240,240,225,.5)'); R(124, 96, 70, 1, 'rgba(240,240,225,.5)'); R(124, 106, 50, 1, 'rgba(240,240,225,.5)'); E(196, 106, 5, 5, 'rgba(255,230,160,.8)');
    R(236, 40, 90, 4, '#8a949a'); for (let i = 0; i < 5; i++) { L(246 + i * 18, 44, 246 + i * 18, 52, '#8a949a', 1); E(246 + i * 18, 62, 8 + (i % 2) * 2, 9, i % 2 ? '#b0b8bd' : '#8d969c'); }
    R(228, 78, 100, 34, '#9ba6ad'); P([[228, 78], [328, 78], [316, 70], [240, 70]], '#b7c1c7'); R(232, 82, 92, 3, 'rgba(255,255,255,.4)');
    R(232, 112, 92, 74, '#20262b'); R(236, 116, 84, 66, '#2d353b'); for (let i = 0; i < 4; i++) { E(252 + (i % 2) * 40, 126 + (i >> 1) * 16, 10, 4, '#12171a'); } R(232, 112, 92, 4, '#8a949a'); R(244, 160, 68, 14, '#3c454c'); for (let i = 0; i < 4; i++) E(254 + i * 17, 167, 4, 4, '#aeb8bd');
    E(252, 124, 11, 5, '#c9d2d7'); R(241, 108, 22, 17, '#c9d2d7'); R(243, 110, 18, 3, '#e6edf0');
    R(344, 84, 118, 5, '#3a2f26'); for (let i = 0; i < 6; i++) { R(350 + i * 19, 89, 14, 26 + (i % 3) * 4, '#f4efe2'); R(352 + i * 19, 94, 10, 1, '#9a8f7a'); R(352 + i * 19, 99, 8, 1, '#9a8f7a'); R(352 + i * 19, 104, 10, 1, '#9a8f7a'); }
    R(338, 146, 130, 6, '#9ba6ad'); R(338, 152, 130, 34, '#6e7a82'); R(342, 156, 122, 3, 'rgba(255,255,255,.25)'); for (let i = 0; i < 4; i++) { E(364 + i * 28, 142, 10, 3, '#f4f1ea'); E(364 + i * 28, 140, 7, 2, '#e1ddd2'); }
    R(330, 100, 6, 52, '#3a2f26'); R(466, 100, 6, 52, '#3a2f26');
  },
  dyn(L, c, t) {
    for (let i = 0; i < 4; i++) { const p = ((t / 1500) + i / 4) % 1; c.fillStyle = 'rgba(255,255,255,' + (.34 * (1 - p)) + ')'; c.beginPath(); c.arc(252 + Math.sin(p * 6 + i) * 4, 104 - p * 34, 2 + p * 4, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(255,170,70,' + (.1 + .05 * Math.sin(t / 200)) + ')'; c.beginPath(); c.ellipse(400, 150, 60, 14, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(77,224,192,' + (.55 + .35 * Math.sin(t / 500)) + ')'; c.fillRect(62, 80, 8, 3);
  }
};

/* ---------- Bioluminescent Conservatory ---------- */
const conservatory = {
  light: 'rgba(40,255,200,.05)',
  stat(c) {
    const { R, E, G, L, P } = H(c), r = seedR(31);
    G(0, 185, '#04101f', '#0c3a42'); for (let i = 0; i < 46; i++) R(Math.floor(r() * 476), Math.floor(r() * 120), 1, 1, 'rgba(230,255,248,' + (.3 + r() * .6) + ')');
    E(392, 40, 16, 16, '#e9f6d8'); E(398, 36, 14, 14, '#071a2a');
    c.strokeStyle = 'rgba(60,170,160,.55)'; c.lineWidth = 3; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(240, -40); c.quadraticCurveTo(i * 80 - 20, 70, i * 80 - 20, 186); c.stroke(); } for (let y = 40; y < 185; y += 46) { c.lineWidth = 2; c.beginPath(); c.ellipse(240, y - 20, 300, 56 + y * .2, 0, 0.05 * Math.PI, 0.95 * Math.PI); c.stroke(); }
    R(0, 185, 480, 115, '#0e2a26'); for (let i = 0; i < 90; i++) R(Math.floor(r() * 476), 190 + Math.floor(r() * 106), 3, 1, 'rgba(90,230,170,' + (.12 + r() * .18) + ')');
    c.fillStyle = '#0b5b78'; c.beginPath(); c.ellipse(240, 270, 200, 17, 0, 0, 7); c.fill(); c.fillStyle = '#12809e'; c.beginPath(); c.ellipse(240, 268, 192, 13, 0, 0, 7); c.fill(); c.strokeStyle = '#3a5a52'; c.lineWidth = 3; c.beginPath(); c.ellipse(240, 270, 203, 19, 0, 0, 7); c.stroke();
    [[36, 188, '#1c8a5a'], [78, 196, '#27a06a'], [420, 190, '#1c8a5a'], [454, 196, '#27a06a']].forEach((p, i) => { for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? p[2] : '#2fb374'; c.beginPath(); c.ellipse(p[0] + (k - 2.5) * 9, p[1] - 12 - (k % 3) * 14, 9, 30 + (k % 2) * 8, (k - 2.5) * .3, 0, 7); c.fill(); c.strokeStyle = 'rgba(120,255,214,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(p[0] + (k - 2.5) * 9, p[1] - 4); c.lineTo(p[0] + (k - 2.5) * 12, p[1] - 40 - (k % 3) * 12); c.stroke(); } R(p[0] - 16, p[1] - 2, 32, 12, '#5a3a2a'); R(p[0] - 18, p[1] - 4, 36, 4, '#7a5338'); });
    R(204, 176, 72, 12, '#3a4a50'); R(212, 186, 56, 8, '#2a363a'); R(200, 92, 80, 4, '#6a808a'); R(200, 92, 4, 86, 'rgba(160,230,240,.35)'); R(276, 92, 4, 86, 'rgba(160,230,240,.35)');
    G(96, 178, 'rgba(10,80,110,.88)', 'rgba(8,120,120,.92)', 204, 72); for (let i = 0; i < 24; i++) R(206 + Math.floor(r() * 66), 100 + Math.floor(r() * 74), 1, 1, 'rgba(120,255,230,' + (.4 + r() * .5) + ')');
    R(206, 96, 3, 80, 'rgba(255,255,255,.18)'); E(240, 94, 40, 6, 'rgba(200,250,255,.25)'); R(232, 84, 16, 10, '#6a808a');
    R(332, 150, 130, 8, '#5a4a3a'); R(336, 158, 4, 28, '#3a2e22'); R(454, 158, 4, 28, '#3a2e22'); for (let i = 0; i < 3; i++) { const x = 340 + i * 40; R(x, 118, 34, 32, 'rgba(150,230,240,.18)'); c.strokeStyle = 'rgba(180,240,250,.6)'; c.lineWidth = 1; c.strokeRect(x + .5, 118.5, 33, 31); R(x, 148, 34, 4, '#6a808a'); }
    E(357, 138, 9, 8, 'rgba(120,200,255,.8)'); for (let k = 0; k < 5; k++) L(351 + k * 3, 144, 350 + k * 3, 150, 'rgba(160,220,255,.6)', 1); P([[385, 144], [397, 130], [409, 144]], '#8fd16a'); R(396, 144, 3, 5, '#cfe8a0'); for (let k = 0; k < 4; k++) L(430 + k * 4, 128, 430 + k * 5, 148, 'rgba(120,255,160,.8)', 1);
  },
  dyn(L, c, t) {
    const g = (x, y, r, col) => { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); };
    g(240, 140, 60, 'rgba(60,240,210,' + (.18 + .08 * Math.sin(t / 700)) + ')'); [[357, 138, '120,200,255'], [397, 140, '140,230,100'], [440, 138, '120,255,160']].forEach((p, i) => g(p[0], p[1], 24, 'rgba(' + p[2] + ',' + (.25 + .15 * Math.sin(t / 600 + i * 2)) + ')'));
    if (!L.REDUCED) for (let i = 0; i < 16; i++) { const x = 40 + (i * 61 + Math.sin(t / 1500 + i) * 26) % 400, y = 70 + (i * 41) % 190 + Math.cos(t / 1300 + i * 2) * 10, a = .3 + .7 * Math.abs(Math.sin(t / 600 + i)); c.fillStyle = 'rgba(160,255,200,' + a + ')'; c.fillRect(x, y, 2, 2); }
    for (let i = 0; i < 6; i++) { const p = ((t / 1800) + i / 6) % 1; c.fillStyle = 'rgba(200,255,250,' + (.5 * (1 - p)) + ')'; c.beginPath(); c.arc(214 + (i * 11) % 52 + Math.sin(p * 8 + i) * 2, 176 - p * 78, 1.4 + (i % 2), 0, 7); c.fill(); }
  }
};

/* ---------- Archive Stacks ---------- */
const archive = {
  light: 'rgba(255,150,70,.10)',
  stat(c) {
    const { R, E, G, L, P } = H(c), r = seedR(47), cols = ['#8a2f3a', '#c9a64a', '#2f6b8a', '#4f7a4a', '#6a3f8a', '#d9cfb0', '#a0552a', '#334455'];
    G(0, 185, '#16131d', '#2a2230'); for (let y = 6; y < 185; y += 16) for (let x = (y / 16 % 2) * 18; x < 480; x += 36) R(x, y, 34, 1, 'rgba(255,255,255,.04)');
    const stack = (x0, w) => { R(x0, 22, w, 164, '#3a2618'); for (let row = 0; row < 5; row++) { const y = 28 + row * 31; R(x0 + 4, y, w - 8, 27, '#1c120b'); let x = x0 + 6; while (x < x0 + w - 10) { const bw = 4 + Math.floor(r() * 7), bh = 16 + Math.floor(r() * 10); R(x, y + 27 - bh, bw, bh, cols[Math.floor(r() * cols.length)]); R(x, y + 27 - bh, 1, bh, 'rgba(255,255,255,.18)'); x += bw + (r() < .12 ? 5 : 0); } R(x0 + 4, y + 27, w - 8, 3, '#5a3a24'); } };
    stack(54, 118); stack(322, 112); R(20, 22, 30, 164, '#241a13'); R(430, 22, 4, 164, '#241a13');
    R(0, 185, 480, 115, '#1f1822'); for (let x = 0; x < 480; x += 30) { R(x, 185, 1, 115, 'rgba(0,0,0,.35)'); } for (let y = 197; y < 300; y += 24) R(0, y, 480, 1, 'rgba(0,0,0,.3)'); R(0, 185, 480, 4, '#4a3322');
    P([[200, 190], [280, 190], [330, 300], [150, 300]], '#6a1f2b'); P([[210, 192], [270, 192], [312, 300], [168, 300]], '#7d2a38'); c.strokeStyle = 'rgba(201,166,74,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(214, 194); c.lineTo(266, 194); c.lineTo(304, 296); c.lineTo(176, 296); c.closePath(); c.stroke();
    R(176, 156, 128, 8, '#6b4528'); R(180, 164, 6, 28, '#4a2e1c'); R(294, 164, 6, 28, '#4a2e1c'); R(176, 154, 128, 3, '#8a5a34');
    E(240, 146, 36, 9, '#3a2f1a'); E(240, 144, 34, 8, '#b99a55'); E(240, 143, 28, 6, '#d9c07a'); E(240, 143, 14, 3, '#7a6030'); for (let i = 0; i < 26; i++) { const a = i * Math.PI * 2 / 26; R(240 + Math.cos(a) * 25 - 1, 143 + Math.sin(a) * 5 - 1, 2, 2, '#3a2f1a'); }
    R(254, 120, 3, 26, '#b99a55'); E(255, 118, 6, 4, '#c9a64a'); R(212, 136, 14, 8, '#e8dcc0'); R(218, 134, 2, 10, '#7a5a3a');
    R(350, 108, 80, 78, '#4a3a2a'); R(354, 112, 72, 70, 'rgba(180,220,240,.14)'); c.strokeStyle = 'rgba(200,230,250,.55)'; c.lineWidth = 1; c.strokeRect(354.5, 112.5, 71, 69); R(350, 182, 80, 6, '#2a1d12');
    [[362, 150], [384, 150], [406, 150]].forEach((p, i) => { R(p[0], p[1] + 20, 16, 4, '#6b4528'); P([[p[0] - 2, p[1] + 22], [p[0] + 8, p[1] + 6], [p[0] + 18, p[1] + 22]], i === 1 ? '#e8dcc0' : '#d9cfb0'); R(p[0] + 7, p[1] + 6, 2, 16, '#9a8a6a'); });
    R(332, 112, 4, 74, '#8a6a44'); L(334, 112, 300, 80, '#8a6a44', 3);
  },
  dyn(L, c, t) {
    c.fillStyle = 'rgba(255,150,60,' + (.12 + .05 * Math.sin(t / 120)) + ')'; c.beginPath(); c.ellipse(255, 150, 64, 30, 0, 0, 7); c.fill();
    const fl = Math.sin(t / 100); c.fillStyle = '#ff9a3c'; c.beginPath(); c.moveTo(253, 118); c.quadraticCurveTo(252 - fl, 110, 255 + fl, 104); c.quadraticCurveTo(259, 112, 257, 118); c.fill(); c.fillStyle = '#ffe08a'; c.fillRect(254, 111, 2, 6);
    c.fillStyle = 'rgba(255,225,170,.06)'; c.beginPath(); c.moveTo(60, 0); c.lineTo(120, 0); c.lineTo(230, 230); c.lineTo(110, 230); c.fill();
    for (let i = 0; i < 18; i++) { const p = ((t / 9000) + i / 18) % 1, x = 70 + i * 6 + Math.sin(t / 1800 + i) * 10 + p * 80, y = 10 + p * 210; c.fillStyle = 'rgba(255,236,190,' + (.35 * Math.sin(p * Math.PI)) + ')'; c.fillRect(x, y, 1, 1); }
    c.fillStyle = 'rgba(255,200,110,' + (.4 + .3 * Math.sin(t / 400)) + ')'; c.fillRect(239, 141, 2, 1);
  }
};

function install() {
  const G = root.CodexLounge; if (!G || !G.registerArt) return false;
  G.registerArt('dome', dome); G.registerArt('kitchen', kitchen); G.registerArt('conservatory', conservatory); G.registerArt('archive', archive);
  const sprite = (kind, g, lockFn) => (L, c, t) => doorSprite(c, g, kind, t, lockFn ? !!lockFn() : false);
  G.decorate('deck', sprite('dome', GEO.deck.dome));
  G.decorate('cafe', sprite('kitchen', GEO.cafe.kitchen));
  G.decorate('garden', sprite('conservatory', GEO.garden.conservatory));
  G.decorate('loft', sprite('archive', GEO.loft.archive, () => G.lockOf('archive')));
  ['dome', 'kitchen', 'conservatory', 'archive'].forEach(id => G.decorate(id, (L, c, t) => doorSprite(c, GEO.exit, 'exit', t)));
  return true;
}
document.addEventListener('DOMContentLoaded', () => { try { install(); } catch (e) { if (root.console) console.error('[lounge-art]', e); } });
root.CodexLoungeArt = { GEO: GEO, painters: { dome: dome, kitchen: kitchen, conservatory: conservatory, archive: archive }, doorSprite: doorSprite, install: install };
if (typeof module !== 'undefined' && module.exports) module.exports = root.CodexLoungeArt;
})(typeof window !== 'undefined' ? window : globalThis);
