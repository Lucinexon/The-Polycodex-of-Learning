/* lounge2.js — V7 lounge: four cozy rooms, doors, seats, interactive furniture, jukebox, emotes, companions, speech bubbles, avatars.
   Overrides LoungeEngine.draw/onClick/renderRoster/step (rooms + avatars ride on the existing presence channel as extra fields). */
(function () {
'use strict';
const $1 = (s, r) => (r || document).querySelector(s), $A = (s, r) => Array.from((r || document).querySelectorAll(s));
const NE = () => window.NetworkEngine || {};
const ROOMS = { deck: { n: 'Observation Deck', i: '🔭', prev: 'loft', next: 'cafe' }, cafe: { n: 'Starlight Café', i: '☕', prev: 'deck', next: 'garden' }, garden: { n: 'Glow Greenhouse', i: '🌿', prev: 'cafe', next: 'loft' }, loft: { n: 'Library Loft', i: '📚', prev: 'garden', next: 'deck' } };
const EMO = { wave: ['👋', 'Wave'], dance: ['💃', 'Dance'], heart: ['💖', 'Heart'], cheer: ['🎉', 'Cheer'], sleep: ['💤', 'Nap'], sip: ['☕', 'Sip'], spark: ['✨', 'Sparkle'], warm: ['🔥', 'Warm up'] };
const HOT = {   /* x,y,w,h = click box; sx,sy = where you stand/sit */
  deck: [{ id: 'scope', t: 'scope', x: 318, y: 120, w: 44, h: 66, sx: 340, sy: 214, l: 'Telescope → Astronomy' }, { id: 'b1', t: 'seat', x: 52, y: 212, w: 56, h: 26, sx: 80, sy: 232, l: 'Bench' }, { id: 'b2', t: 'seat', x: 372, y: 224, w: 56, h: 26, sx: 400, sy: 244, l: 'Bench' }],
  cafe: [{ id: 'juke', t: 'juke', x: 14, y: 98, w: 46, h: 88, sx: 70, sy: 222, l: 'Jukebox' }, { id: 'cof', t: 'coffee', x: 262, y: 84, w: 54, h: 46, sx: 288, sy: 214, l: 'Coffee machine' }, { id: 's1', t: 'seat', x: 276, y: 196, w: 28, h: 26, sx: 290, sy: 214, l: 'Stool' }, { id: 's2', t: 'seat', x: 326, y: 196, w: 28, h: 26, sx: 340, sy: 214, l: 'Stool' }, { id: 's3', t: 'seat', x: 376, y: 196, w: 28, h: 26, sx: 390, sy: 214, l: 'Stool' }, { id: 'c1', t: 'seat', x: 100, y: 224, w: 28, h: 30, sx: 114, sy: 244, l: 'Chair' }, { id: 'c2', t: 'seat', x: 182, y: 238, w: 28, h: 30, sx: 196, sy: 258, l: 'Chair' }],
  garden: [{ id: 'pond', t: 'pond', x: 150, y: 222, w: 180, h: 54, sx: 240, sy: 214, l: 'Pond' }, { id: 'g1', t: 'seat', x: 36, y: 214, w: 62, h: 26, sx: 68, sy: 236, l: 'Bench' }, { id: 'g2', t: 'seat', x: 384, y: 214, w: 62, h: 26, sx: 416, sy: 236, l: 'Bench' }, { id: 'mush', t: 'spark', x: 342, y: 170, w: 36, h: 36, sx: 360, sy: 214, l: 'Glow mushroom' }],
  loft: [{ id: 'fire', t: 'fire', x: 205, y: 104, w: 72, h: 82, sx: 240, sy: 212, l: 'Fireplace' }, { id: 'shelf', t: 'shelf', x: 24, y: 40, w: 168, h: 130, sx: 110, sy: 214, l: 'Bookshelf → your Notes' }, { id: 'a1', t: 'seat', x: 86, y: 220, w: 50, h: 36, sx: 112, sy: 244, l: 'Armchair' }, { id: 'a2', t: 'seat', x: 346, y: 220, w: 50, h: 36, sx: 372, sy: 244, l: 'Armchair' }]
};
const STATE = { fade: 0, hover: null, fx: [], ripple: [], cards: null, last: 0, lastTrack: 0, steam: [] };
const EM = {};   /* uid → { ts, at } so emotes survive roster rebuilds */
const LE = () => NE().LoungeEngine, AM = () => NE().AuthManager || {};
const seedR = n => { let s = n; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const cache = {};
/* ---------- static scenery ---------- */
function paintStatic(id) {
  const cv = document.createElement('canvas'); cv.width = 480; cv.height = 300; const c = cv.getContext('2d'), R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const grad = (y0, y1, a, b, x, w) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(x || 0, y0, w || 480, y1 - y0); };
  const planks = (y, a, b, step) => { R(0, y, 480, 300 - y, a); for (let i = 0; i < 18; i++) R(i * 27 + ((i * 7) % 5), y, 2, 300 - y, b); for (let yy = y + 20; yy < 300; yy += step || 22) R(0, yy, 480, 1, b); };
  if (id === 'cafe') {
    grad(0, 185, '#2b1b34', '#4a2a45'); for (let y = 8; y < 185; y += 14) for (let x = (y / 14 % 2) * 12; x < 480; x += 24) R(x, y, 22, 1, 'rgba(255,200,150,.07)');
    R(56, 28, 130, 106, '#6b4a3a'); grad(34, 128, '#0e2a52', '#1a4478', 62, 118); R(120, 34, 3, 94, '#6b4a3a'); R(62, 80, 118, 3, '#6b4a3a'); c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(150, 56, 9, 0, 7); c.fill(); c.fillStyle = '#1a4478'; c.beginPath(); c.arc(154, 53, 8, 0, 7); c.fill();
    R(240, 120, 236, 66, '#7a4b2a'); R(240, 114, 236, 8, '#b07440'); R(244, 126, 228, 2, 'rgba(0,0,0,.25)'); for (let i = 0; i < 6; i++) R(250 + i * 38, 134, 26, 44, 'rgba(0,0,0,.16)');
    R(266, 86, 46, 30, '#9aa7b2'); R(270, 92, 38, 14, '#5b6772'); R(296, 80, 8, 8, '#cfd8de'); R(300, 120 - 34, 4, 4, '#ff5f5f');
    [[330, 104], [346, 104], [362, 106]].forEach(p => { R(p[0], p[1], 9, 9, '#f4efe6'); R(p[0] + 9, p[1] + 2, 3, 4, '#f4efe6'); });
    R(14, 98, 46, 88, '#5a2a5e'); R(18, 102, 38, 40, '#23123a'); R(22, 108, 30, 6, '#ff7ec9'); R(22, 118, 30, 6, '#5fd0ee'); R(22, 128, 30, 6, '#ffc874'); R(18, 150, 38, 28, '#3a1a3e'); R(24, 156, 26, 14, '#12091c');
    planks(185, '#5b3a24', '#4a2e1c'); R(0, 185, 480, 4, '#7a4f33');
    [[140, 240], [220, 256]].forEach(p => { c.fillStyle = '#8a5a34'; c.beginPath(); c.ellipse(p[0], p[1], 34, 10, 0, 0, 7); c.fill(); c.fillStyle = '#a8703f'; c.beginPath(); c.ellipse(p[0], p[1] - 3, 34, 9, 0, 0, 7); c.fill(); R(p[0] - 3, p[1], 6, 16, '#6b4528'); });
    [[114, 236], [166, 236], [196, 252], [250, 252]].forEach(p => { R(p[0] - 9, p[1] - 14, 18, 14, '#7b3a3a'); R(p[0] - 9, p[1], 3, 10, '#4a2323'); R(p[0] + 6, p[1], 3, 10, '#4a2323'); });
    [290, 340, 390].forEach(x => { R(x - 11, 204, 22, 7, '#c0453a'); R(x - 2, 211, 4, 18, '#5a5a66'); R(x - 8, 228, 16, 3, '#5a5a66'); });
  } else if (id === 'garden') {
    grad(0, 185, '#082f38', '#0d4a43'); c.strokeStyle = 'rgba(160,240,230,.18)'; c.lineWidth = 2; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(240, -20); c.quadraticCurveTo(i * 80 - 20, 70, i * 80 - 20, 185); c.stroke(); } c.beginPath(); c.arc(240, 190, 250, Math.PI, 0); c.stroke();
    const r = seedR(11); c.fillStyle = '#e8fff8'; for (let i = 0; i < 40; i++) c.fillRect(Math.floor(r() * 470), Math.floor(r() * 120), 1 + (r() < .2 ? 1 : 0), 1);
    c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(400, 40, 14, 0, 7); c.fill(); c.fillStyle = '#082f38'; c.beginPath(); c.arc(405, 37, 12, 0, 7); c.fill();
    [[40, 150, 40, 70], [96, 160, 30, 56], [420, 148, 44, 74], [370, 162, 30, 50]].forEach((p, i) => { c.fillStyle = i % 2 ? '#1f7a4e' : '#2a9a5e'; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(p[0] + (k - 2) * 8, p[1] - k % 3 * 10, 8, p[3] / 2, (k - 2) * .35, 0, 7); c.fill(); } R(p[0] - 14, 178, 28, 10, '#6b4a3a'); });
    c.fillStyle = '#0b5a4a'; for (let i = 0; i < 6; i++) { c.fillRect(120 + i * 44, 0, 2, 20 + (i * 17) % 40); }
    R(0, 185, 480, 115, '#123a2a'); const r2 = seedR(5); for (let i = 0; i < 60; i++) R(Math.floor(r2() * 470), 188 + Math.floor(r2() * 108), 3, 1, 'rgba(120,230,150,.25)');
    c.fillStyle = '#0a2a22'; for (let x = 20; x < 480; x += 54) R(x, 190, 40, 2, 'rgba(255,255,255,.04)');
    c.fillStyle = '#0f6a86'; c.beginPath(); c.ellipse(240, 250, 92, 26, 0, 0, 7); c.fill(); c.fillStyle = '#1688a8'; c.beginPath(); c.ellipse(240, 247, 84, 22, 0, 0, 7); c.fill(); c.strokeStyle = '#5a6a62'; c.lineWidth = 3; c.beginPath(); c.ellipse(240, 250, 94, 27, 0, 0, 7); c.stroke();
    [[200, 246], [270, 252], [236, 258]].forEach(p => { c.fillStyle = '#3aa86a'; c.beginPath(); c.ellipse(p[0], p[1], 10, 4, 0, 0, 7); c.fill(); });
    [[52, 226], [416, 226]].forEach(p => { R(p[0] - 30, p[1] - 12, 60, 8, '#8a6a44'); R(p[0] - 28, p[1] - 4, 4, 14, '#5a4328'); R(p[0] + 24, p[1] - 4, 4, 14, '#5a4328'); R(p[0] - 30, p[1] - 26, 60, 6, '#8a6a44'); });
    [[360, 196, '#ff7ec9'], [330, 204, '#5fd0ee'], [100, 200, '#46f0c4']].forEach(p => { R(p[0] - 2, p[1], 4, 12, '#cfd8de'); c.fillStyle = p[2]; c.beginPath(); c.ellipse(p[0], p[1], 10, 6, 0, Math.PI, 0); c.fill(); });
  } else if (id === 'loft') {
    grad(0, 185, '#1a2030', '#2c3347'); const r = seedR(23), cols = ['#c0453a', '#d6a84a', '#3a7b9a', '#5a8a5a', '#8a5a9a', '#e8dcc0', '#b0603a'];
    [[24, 40], [290, 40]].forEach(b => { R(b[0], b[1], 166, 130, '#4a3322'); for (let row = 0; row < 4; row++) { R(b[0] + 4, b[1] + 4 + row * 31, 158, 28, '#2a1d12'); let x = b[0] + 6; while (x < b[0] + 158) { const w = 4 + Math.floor(r() * 6), h = 18 + Math.floor(r() * 9); R(x, b[1] + 32 + row * 31 - h, w, h, cols[Math.floor(r() * cols.length)]); x += w + 1; } R(b[0] + 2, b[1] + 32 + row * 31, 162, 3, '#6b4a30'); } });
    R(196, 98, 88, 90, '#4a4f5c'); R(206, 110, 68, 76, '#15131a'); R(190, 92, 100, 10, '#6b6f7c'); R(200, 104, 80, 4, '#5a5f6c'); for (let i = 0; i < 4; i++) R(200 + i * 20, 106, 1, 80, 'rgba(0,0,0,.2)');
    c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(240, 60, 22, 0, 7); c.fill(); c.fillStyle = '#e8c372'; c.beginPath(); c.arc(240, 60, 18, 0, 7); c.fill(); R(240, 44, 2, 16, '#3a2a20'); R(240, 60, 12, 2, '#3a2a20');
    R(0, 185, 480, 115, '#3a2a22'); for (let y = 185; y < 300; y += 16) R(0, y, 480, 1, '#2a1d17'); R(0, 185, 480, 4, '#5a4030');
    c.fillStyle = '#7a2e3a'; c.beginPath(); c.ellipse(240, 252, 110, 30, 0, 0, 7); c.fill(); c.strokeStyle = '#d6a84a'; c.lineWidth = 2; c.beginPath(); c.ellipse(240, 252, 96, 24, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(240, 252, 70, 17, 0, 0, 7); c.stroke();
    [[112, 246, 1], [372, 246, -1]].forEach(p => { R(p[0] - 26, p[1] - 28, 52, 30, '#6b3a3a'); R(p[0] - 30, p[1] - 22, 10, 26, '#5a2e2e'); R(p[0] + 20, p[1] - 22, 10, 26, '#5a2e2e'); R(p[0] - 22, p[1] - 6, 44, 10, '#7a4444'); });
    R(424, 130, 4, 60, '#3a3a44'); c.fillStyle = '#ffd98a'; c.beginPath(); c.moveTo(414, 130); c.lineTo(438, 130); c.lineTo(432, 112); c.lineTo(420, 112); c.fill();
  }
  return cv;
}
/* ---------- helpers ---------- */
const mineCode = () => (window.CodexAvatar && (CodexAvatar.mine() || CodexAvatar.forName(AM().name || 'operator'))) || '';
const codeOf = p => (window.CodexAvatar && (p.av || CodexAvatar.forName(p.n || 'op'))) || '';
function room() { const L = LE(); return (L && L.me.room) || 'deck'; }
function track(force) { const now = Date.now(); if (!force && now - STATE.lastTrack < 900) return; STATE.lastTrack = now; try { NE().SupabaseLounge.retrack(); } catch (e) {} }
function setRoom(id, silent) {
  const L = LE(); if (!L || !ROOMS[id] || L.me.room === id) return;
  L.me.room = id; L.me.pose = 0; L.me.pendingSit = null; L.me.jukebox = 0; const left = id === ROOMS[L.me.room || 'deck'].prev; L.me.x = L.me.cx = 240; L.me.y = L.me.cy = 244; L.me.walk = false;
  STATE.fade = 1; STATE.hover = null; track(true); if (L.renderRoster) L.renderRoster(); paintBar(); if (!silent && window.sfx) sfx('reveal');
}
function doEmote(k) { const L = LE(); if (!L || !EMO[k]) return; L.me.emote = { k: k, ts: Date.now() }; EM[AM().uid || 'me'] = { ts: L.me.emote.ts, at: performance.now() }; if (k === 'sip') STATE.fx.push({ k: 'steam', x: L.me.cx, y: L.me.cy - 30, at: performance.now() }); track(true); if (window.sfx) sfx(k === 'cheer' ? 'combo' : 'click'); }
/* ---------- jukebox (generated lofi) ---------- */
const MUS = { A: null, on: false, t: 0, step: 0, out: null };
const muted = () => { try { return localStorage.getItem('cx_v7_mute') === '1'; } catch (e) { return false; } };
function note(A, f, t, d, type, v) { const o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .04); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(MUS.out); o.start(t); o.stop(t + d + .05); }
function musicStart() {
  if (MUS.on || muted()) return;
  try {
    const A = MUS.A || (MUS.A = new (window.AudioContext || window.webkitAudioContext)()); if (A.state === 'suspended') A.resume();
    MUS.out = A.createGain(); MUS.out.gain.value = 0.0001; MUS.out.gain.linearRampToValueAtTime(.2, A.currentTime + 1.5); const lp = A.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; MUS.out.connect(lp); lp.connect(A.destination);
    MUS.on = true; MUS.step = 0; const beat = 60 / 72, ch = [[220, 261.6, 329.6, 392], [146.8, 174.6, 220, 261.6], [196, 246.9, 293.7, 349.2], [130.8, 164.8, 196, 246.9]], pent = [523.3, 587.3, 659.3, 784, 880];
    const tick = () => { if (!MUS.on) return; const t0 = A.currentTime + .05, c = ch[(MUS.step >> 2) % 4];
      if (MUS.step % 4 === 0) { c.forEach((f, i) => note(A, f, t0 + i * .025, beat * 3.7, 'triangle', .07)); note(A, c[0] / 2, t0, beat * 1.8, 'sine', .16); }
      if (MUS.step % 4 === 2) note(A, c[0] / 2, t0, beat * 1.2, 'sine', .1);
      if (Math.random() < .55) note(A, pent[Math.floor(Math.random() * 5)] * (Math.random() < .3 ? .5 : 1), t0 + (Math.random() < .5 ? .25 : 0), beat * 1.4, 'sine', .05);
      MUS.step++; MUS.t = setTimeout(tick, beat * 1000); };
    tick();
  } catch (e) { MUS.on = false; }
}
function musicStop() { MUS.on = false; clearTimeout(MUS.t); try { MUS.out.gain.cancelScheduledValues(0); MUS.out.gain.linearRampToValueAtTime(.0001, MUS.A.currentTime + .6); } catch (e) {} }
function wantMusic() { const L = LE(); if (!L || !L.active) return false; const r = room(); return r === 'cafe' && !muted() && (L.me.jukebox || Object.keys(L.players).some(u => L.players[u].r === r && L.players[u].jk)); }
/* ---------- drawing ---------- */
function deckBG(L, c, t) {
  const bg = c.createLinearGradient(0, 0, 0, L.FLOOR_Y); bg.addColorStop(0, '#0b4d74'); bg.addColorStop(1, '#04283f'); c.fillStyle = bg; c.fillRect(0, 0, L.W, L.H); L.drawGlow(t);
  L.stars.forEach(s => { const a = L.REDUCED ? .6 : (.35 + .4 * Math.abs(Math.sin(s.tw))); c.fillStyle = s.s > 1 ? 'rgba(255,200,116,' + a + ')' : 'rgba(190,235,250,' + a + ')'; c.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s); });
  L.drawWhale(t); if (!L.REDUCED) L.drawSat(t);
  c.fillStyle = '#08304a'; c.fillRect(0, 0, 5, L.FLOOR_Y); c.fillRect(L.W - 5, 0, 5, L.FLOOR_Y); c.fillRect(158, 0, 5, L.FLOOR_Y); c.fillRect(317, 0, 5, L.FLOOR_Y); c.fillStyle = '#1c6f94'; c.fillRect(158, 0, 2, L.FLOOR_Y); c.fillRect(317, 0, 2, L.FLOOR_Y);
  c.fillStyle = '#07304a'; c.fillRect(0, L.FLOOR_Y, L.W, L.H - L.FLOOR_Y); c.fillStyle = '#0e4a6c'; c.fillRect(0, L.FLOOR_Y, L.W, 6); c.fillStyle = '#2f96bd'; c.fillRect(0, L.FLOOR_Y, L.W, 2);
  c.strokeStyle = 'rgba(95,208,238,.10)'; c.beginPath(); for (let gx = 40; gx < L.W; gx += 40) { c.moveTo(gx + .5, L.FLOOR_Y + 6); c.lineTo(gx + .5, L.H); } for (let gy = L.FLOOR_Y + 44; gy < L.H; gy += 42) { c.moveTo(0, gy + .5); c.lineTo(L.W, gy + .5); } c.stroke();
  [[52, 226], [400, 238]].forEach(p => { c.fillStyle = '#1a5a7a'; c.fillRect(p[0] - 28, p[1] - 12, 56, 12); c.fillStyle = '#2f96bd'; c.fillRect(p[0] - 28, p[1] - 14, 56, 3); c.fillStyle = '#0b3a52'; c.fillRect(p[0] - 24, p[1], 4, 10); c.fillRect(p[0] + 20, p[1], 4, 10); });
  c.fillStyle = '#9aa7b2'; c.save(); c.translate(340, 150); c.rotate(-.5); c.fillRect(-4, -26, 8, 40); c.fillStyle = '#5fd0ee'; c.fillRect(-5, -28, 10, 5); c.restore(); c.fillStyle = '#6b7882'; c.fillRect(336, 150, 3, 36); c.fillRect(330, 184, 16, 3);
}
function dynRoom(L, c, t, id) {
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); }, tw = Math.sin(t / 400);
  if (id === 'cafe') {
    for (let i = 0; i < 20; i++) { const x = 12 + i * 24, y = 14 + Math.sin(i * .9) * 5, a = .55 + .4 * Math.sin(t / 380 + i * 1.7); c.fillStyle = ['rgba(255,214,120,', 'rgba(255,150,120,', 'rgba(255,230,170,'][i % 3] + a + ')'; c.fillRect(x, y, 4, 5); c.fillStyle = 'rgba(255,214,120,' + a * .18 + ')'; c.beginPath(); c.arc(x + 2, y + 2, 9, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(160,200,255,.5)'; c.lineWidth = 1; if (!L.REDUCED) for (let i = 0; i < 16; i++) { const x = 64 + (i * 37 + t * .12) % 116, y = 36 + (i * 53 + t * .32) % 92; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + 6); c.stroke(); }
    const on = wantMusic(); R(22, 108, 30, 6, on ? 'rgba(255,126,201,' + (.7 + .3 * tw) + ')' : 'rgba(255,126,201,.35)'); if (on) for (let i = 0; i < 3; i++) { const p = ((t / 900) + i / 3) % 1; c.fillStyle = 'rgba(255,230,160,' + (1 - p) + ')'; c.font = '11px sans-serif'; c.fillText('♪', 62 + Math.sin(p * 6 + i) * 8, 96 - p * 40); }
    for (let i = 0; i < 3; i++) { const p = ((t / 1400) + i / 3) % 1; c.fillStyle = 'rgba(255,255,255,' + (.35 * (1 - p)) + ')'; c.beginPath(); c.arc(286 + Math.sin(p * 7 + i) * 3, 78 - p * 26, 2 + p * 3, 0, 7); c.fill(); }
  } else if (id === 'garden') {
    for (let i = 0; i < 14; i++) { const x = (i * 83 + Math.sin(t / 1800 + i) * 30 + 240) % 480, y = 90 + (i * 37) % 180 + Math.cos(t / 1500 + i * 2) * 12, a = .4 + .6 * Math.abs(Math.sin(t / 700 + i)); c.fillStyle = 'rgba(190,255,140,' + a + ')'; c.fillRect(x, y, 2, 2); c.fillStyle = 'rgba(190,255,140,' + a * .15 + ')'; c.beginPath(); c.arc(x + 1, y + 1, 7, 0, 7); c.fill(); }
    [[360, 196, '255,126,201'], [330, 204, '95,208,238'], [100, 200, '70,240,196']].forEach((p, i) => { c.fillStyle = 'rgba(' + p[2] + ',' + (.1 + .08 * Math.sin(t / 600 + i)) + ')'; c.beginPath(); c.arc(p[0], p[1], 26, 0, 7); c.fill(); });
    c.fillStyle = 'rgba(8,60,80,.9)'; for (let i = 0; i < 3; i++) { const x = 190 + ((t / 40 + i * 70) % 100), y = 250 + Math.sin(t / 500 + i * 3) * 6; c.beginPath(); c.ellipse(x, y, 6, 2.4, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x - 10, y - 2); c.lineTo(x - 10, y + 2); c.fill(); }
    STATE.ripple = STATE.ripple.filter(r => performance.now() - r.at < 1600); STATE.ripple.forEach(r => { const p = (performance.now() - r.at) / 1600; c.strokeStyle = 'rgba(180,240,255,' + (.8 * (1 - p)) + ')'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(r.x, r.y, 6 + p * 40, 2.4 + p * 14, 0, 0, 7); c.stroke(); });
  } else if (id === 'loft') {
    for (let i = 0; i < 7; i++) { const fl = Math.sin(t / 110 + i * 2.1), h = 20 + 10 * fl + (i % 3) * 5, x = 214 + i * 9; c.fillStyle = i % 2 ? '#ff9a3c' : '#ff6a3c'; c.beginPath(); c.moveTo(x, 184); c.quadraticCurveTo(x - 5, 184 - h * .5, x + 4 + fl * 2, 184 - h); c.quadraticCurveTo(x + 8, 184 - h * .4, x + 9, 184); c.fill(); c.fillStyle = '#ffd36a'; c.fillRect(x + 2, 184 - h * .4, 3, h * .4); }
    c.fillStyle = 'rgba(255,150,60,' + (.1 + .04 * Math.sin(t / 130)) + ')'; c.beginPath(); c.ellipse(240, 220, 150, 70, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,217,138,.14)'; c.beginPath(); c.arc(426, 118, 40, 0, 7); c.fill();
    for (let i = 0; i < 18; i++) { const x = (i * 71 + t * .01) % 480, y = 40 + (i * 29 + Math.sin(t / 2000 + i) * 20) % 140; c.fillStyle = 'rgba(255,230,180,.35)'; c.fillRect(x, y, 1, 1); }
  }
}
function lightOverlay(c, id) { const m = { deck: null, cafe: 'rgba(255,170,90,.10)', garden: 'rgba(80,255,190,.06)', loft: 'rgba(255,140,60,.12)' }[id]; if (!m) return; c.fillStyle = m; c.fillRect(0, 0, 480, 300); const g = c.createRadialGradient(240, 150, 90, 240, 150, 300); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.38)'); c.fillStyle = g; c.fillRect(0, 0, 480, 300); }
function doors(c, id, t) {
  const R = ROOMS[id]; [['L', 6, R.prev], ['R', 450, R.next]].forEach(d => { const x = d[1]; c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x, 132, 24, 53); c.fillStyle = 'rgba(255,214,120,' + (.5 + .3 * Math.sin(t / 500)) + ')'; c.fillRect(x, 132, 24, 2); c.fillRect(x, 132, 2, 53); c.fillRect(x + 22, 132, 2, 53); c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillText(ROOMS[d[2]].i, x + 12, 164); c.font = 'bold 7px "Atkinson Hyperlegible",sans-serif'; c.fillStyle = 'rgba(255,240,200,.9)'; c.fillText(ROOMS[d[2]].n.split(' ')[1] ? ROOMS[d[2]].n.split(' ')[0].toUpperCase() : ROOMS[d[2]].n.toUpperCase(), x + 12, 178); c.textAlign = 'left'; });
}
function wrap(c, text, max) { const w = String(text).split(/\s+/), out = []; let cur = ''; w.forEach(x => { if (c.measureText(cur + ' ' + x).width > max && cur) { out.push(cur); cur = x; } else cur = (cur ? cur + ' ' : '') + x; }); if (cur) out.push(cur); return out.slice(0, 3); }
function token(L, c, p, isMe, t) {
  const em = EM[isMe ? (AM().uid || 'me') : p.uid], emo = em && performance.now() - em.at < 4200 ? em : null, k = isMe ? (L.me.emote && emo ? L.me.emote.k : null) : (p.em && emo ? p.em.k : null);
  const seated = isMe ? L.me.pose : p.pose, dance = k === 'dance' && !L.REDUCED;
  const bob = (!L.REDUCED && p.walk) ? Math.sin(t / 90) * 1.8 : (dance ? Math.abs(Math.sin(t / 130)) * -5 : (k === 'cheer' ? Math.abs(Math.sin(t / 160)) * -4 : 0));
  const x = Math.round(p.cx), y = Math.round(p.cy) + (seated ? 8 : 0) + Math.round(bob), code = isMe ? mineCode() : codeOf(p), S = 34;
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x, Math.round(p.cy) + 3, 12, 4, 0, 0, 7); c.fill();
  const code2 = code, pc = window.CodexAvatar && CodexAvatar.parse(code2).p > 0;
  if (pc) { const fx = x + (p.dir >= 0 ? -22 : 22) + Math.sin(t / 500 + x) * 2; const pi = CodexAvatar.img(code2, 16); /* companion pet is part of the portrait; draw a tiny trailing copy */ }
  c.save(); c.beginPath(); c.arc(x, y - 17, S / 2, 0, 7); c.clip(); const im = window.CodexAvatar ? CodexAvatar.img(code, 48) : null;
  c.imageSmoothingEnabled = true; if (im && im.complete && im.naturalWidth) c.drawImage(im, x - S / 2, y - 17 - S / 2, S, S); else { c.fillStyle = '#0e4a6c'; c.fillRect(x - S / 2, y - 34, S, S); } c.restore(); c.imageSmoothingEnabled = false;
  c.strokeStyle = isMe ? '#5fd0ee' : (p.a ? '#ffc874' : 'rgba(230,251,255,.85)'); c.lineWidth = 2; c.beginPath(); c.arc(x, y - 17, S / 2, 0, 7); c.stroke();
  const name = String(p.n || 'OP').slice(0, 14), lv = 'LV' + (p.lv || 1); c.font = 'bold 8px "Atkinson Hyperlegible", sans-serif';
  const tw = Math.max(34, c.measureText(name).width + c.measureText(lv).width + 8); c.fillStyle = 'rgba(3,20,30,.86)'; c.fillRect(x - tw / 2, y - 47, tw, 11); c.fillStyle = p.a ? '#ffc874' : (isMe ? '#5fd0ee' : '#e6fbff'); c.fillText(name, x - tw / 2 + 3, y - 38.5); c.fillStyle = '#ffc874'; c.fillText(lv, x - tw / 2 + c.measureText(name).width + 6, y - 38.5);
  if (k && EMO[k]) { c.font = '15px sans-serif'; c.textAlign = 'center'; const age = (performance.now() - emo.at) / 4200; c.globalAlpha = 1 - age * age; c.fillText(EMO[k][0], x + 14, y - 52 - age * 12); c.globalAlpha = 1; c.textAlign = 'left'; }
  if (isMe) { c.fillStyle = 'rgba(95,208,238,.5)'; c.fillRect(x - 8, Math.round(p.cy) + 5, 16, 2); }
  return { x: x, y: y - 56, top: y - 56 };
}
function bubbles(L, c, pos) {
  const CE = NE().ChatEngine; if (!CE || CE.channel !== 'global') return; const now = Date.now(), seen = {};
  (CE.lastDocs || []).slice(-8).forEach(m => { if (!m.k && m.ts && now - m.ts < 7000 && m.u) seen[m.u] = m; });
  c.font = '9px "Atkinson Hyperlegible", sans-serif';
  Object.keys(seen).forEach(u => { const p = pos[u]; if (!p) return; const lines = wrap(c, seen[u].t, 120), w = Math.max.apply(null, lines.map(l => c.measureText(l).width)) + 10, h = lines.length * 11 + 6, x = Math.max(4, Math.min(L.W - w - 4, p.x - w / 2)), y = Math.max(2, p.y - h - 6);
    c.globalAlpha = Math.min(1, (7000 - (now - seen[u].ts)) / 900); c.fillStyle = 'rgba(255,255,255,.96)'; c.fillRect(x, y, w, h); c.fillRect(Math.round(p.x) - 3, y + h, 6, 4); c.fillStyle = '#10222e'; lines.forEach((l, i) => c.fillText(l, x + 5, y + 11 + i * 11)); c.globalAlpha = 1; });
}
function draw(t) {
  const L = LE(), c = L.ctx; if (!c) return; const id = room();
  c.imageSmoothingEnabled = false;
  if (id === 'deck') deckBG(L, c, t); else { if (!cache[id]) cache[id] = paintStatic(id); c.drawImage(cache[id], 0, 0); }
  dynRoom(L, c, t, id);
  let banner = null, red = false; if (!NE().online || !NE().online()) { banner = 'OFFLINE MODE — LOG-IN LINK REQUIRED FOR OTHER OPERATORS'; red = true; } else if (!AM().user) banner = 'ESTABLISHING OPERATOR LINK…'; else if (NE().SupabaseLounge.available() && NE().SupabaseLounge.state === 'retry') banner = 'REALTIME LINK LOST — RETRYING…';
  if (banner) { c.fillStyle = 'rgba(2,20,34,.74)'; c.fillRect(0, 78, L.W, 34); c.fillStyle = red ? '#ff8795' : '#ffcb7a'; c.font = 'bold 10px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'center'; c.fillText(banner, L.W / 2, 98); c.textAlign = 'left'; }
  const list = []; Object.keys(L.players).forEach(u => { const p = L.players[u]; if ((p.r || 'deck') === id) { p.uid = u; list.push(p); } });
  const me = { n: AM().name || 'YOU', lv: (typeof window.levelOf === 'function' && window.S) ? window.levelOf(window.S.xp || 0) + 1 : 1, cx: L.me.cx, cy: L.me.cy, dir: L.me.dir, walk: L.me.walk, a: AM().admin };
  list.push(me); list.sort((a, b) => a.cy - b.cy); const pos = {};
  list.forEach(p => { const isMe = p === me; const r = token(L, c, p, isMe, t); pos[isMe ? AM().uid : p.uid] = r; });
  lightOverlay(c, id); doors(c, id, t); bubbles(L, c, pos);
  STATE.fx = STATE.fx.filter(f => performance.now() - f.at < 1800); STATE.fx.forEach(f => { const a = (performance.now() - f.at) / 1800; c.fillStyle = 'rgba(255,255,255,' + (.7 * (1 - a)) + ')'; c.beginPath(); c.arc(f.x + Math.sin(a * 6) * 3, f.y - a * 24, 2 + a * 3, 0, 7); c.fill(); });
  const h = STATE.hover; if (h) { c.font = 'bold 9px "Atkinson Hyperlegible", sans-serif'; const w = c.measureText(h.l).width + 10, x = Math.max(4, Math.min(L.W - w - 4, h.x + h.w / 2 - w / 2)), y = Math.max(4, h.y - 16); c.fillStyle = 'rgba(3,20,30,.92)'; c.fillRect(x, y, w, 14); c.strokeStyle = '#ffc874'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, 13); c.fillStyle = '#ffe9b0'; c.fillText(h.l, x + 5, y + 10); }
  if (STATE.fade > 0.01) { c.fillStyle = 'rgba(2,12,20,' + STATE.fade + ')'; c.fillRect(0, 0, L.W, L.H); STATE.fade *= .88; }
  c.font = '7px "Atkinson Hyperlegible", sans-serif'; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(ROOMS[id].i + ' ' + ROOMS[id].n.toUpperCase(), 10, 294);
}
/* ---------- interaction ---------- */
function pt(L, e) { const r = L.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (L.W / r.width), y: (e.clientY - r.top) * (L.H / r.height) }; }
function hotAt(id, x, y) { const hs = HOT[id] || []; for (let i = 0; i < hs.length; i++) { const h = hs[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }
function doorAt(x, y) { return y > 128 && y < 190 ? (x < 34 ? 'prev' : x > 446 ? 'next' : null) : null; }
function onClick(e) {
  const L = LE(), p = pt(L, e), id = room(), d = doorAt(p.x, p.y);
  if (d) { setRoom(ROOMS[id][d]); return; }
  if (AM().user && L.cv) { /* click another operator → mini card */ const keys = Object.keys(L.players); for (let i = 0; i < keys.length; i++) { const o = L.players[keys[i]]; if ((o.r || 'deck') === id && Math.abs(p.x - o.cx) < 16 && Math.abs(p.y - (o.cy - 17)) < 20) { showCard(keys[i], o, e); return; } } }
  hideCard();
  const h = hotAt(id, p.x, p.y); L.me.pose = 0; L.me.pendingSit = null;
  if (h) {
    L.me.x = Math.max(L.MIN_X, Math.min(L.MAX_X, h.sx)); L.me.y = Math.max(L.MIN_Y, Math.min(L.MAX_Y, h.sy)); L.me.walk = true; L.me.act = h; if (h.t === 'seat') L.me.pendingSit = h;
    if (window.sfx) sfx('click'); if (NE().SupabaseLounge.available()) NE().SupabaseLounge.sendWalk(); return;
  }
  L.me.act = null; L.me.x = Math.max(L.MIN_X, Math.min(L.MAX_X, Math.round(p.x))); L.me.y = Math.max(L.MIN_Y, Math.min(L.MAX_Y, Math.round(p.y))); L.me.walk = true; if (window.sfx) sfx('click'); if (NE().SupabaseLounge.available()) NE().SupabaseLounge.sendWalk();
}
function arrive(L) {
  const a = L.me.act; if (!a || L.me.walk) return; L.me.act = null;
  if (a.t === 'seat') { L.me.pose = 1; L.me.dir = a.sx < 240 ? 1 : -1; track(true); }
  else if (a.t === 'juke') { L.me.jukebox = L.me.jukebox ? 0 : 1; track(true); toast('<b>Jukebox ' + (L.me.jukebox ? 'on' : 'off') + '</b><br>' + (L.me.jukebox ? 'Everyone in the café hears it.' : ''), 'speech', 1800); if (L.me.jukebox) musicStart(); }
  else if (a.t === 'coffee') doEmote('sip');
  else if (a.t === 'fire') doEmote('warm');
  else if (a.t === 'spark') doEmote('spark');
  else if (a.t === 'pond') { STATE.ripple.push({ x: L.me.cx, y: 250, at: performance.now() }); if (window.sfx) sfx('flip'); }
  else if (a.t === 'shelf') { if (window.showScreen) showScreen('notebook'); }
  else if (a.t === 'scope') { if (window.showScreen) showScreen('sec7'); }
}
function showCard(uid, o, e) {
  hideCard(); const wrapEl = LE().cv.parentNode; wrapEl.style.position = 'relative';
  const r = LE().cv.getBoundingClientRect(), wr = wrapEl.getBoundingClientRect(), div = document.createElement('div'); div.className = 'lg-card';
  div.innerHTML = (window.CodexAvatar ? CodexAvatar.el(codeOf(o), 56, 'sq') : '') + '<div><b>' + esc(o.n || 'OP') + '</b><small>LV' + (o.lv || 1) + ' · ' + esc((ROOMS[o.r || 'deck'] || ROOMS.deck).n) + '</small><div class="lg-cb"><button type="button" class="btn" data-lg="wave">👋 Wave</button><button type="button" class="btn primary" data-lg="dm" data-u="' + esc(uid) + '" data-n="' + esc(o.n || '') + '">💬 Message</button></div></div>';
  wrapEl.appendChild(div); div.style.left = Math.max(6, Math.min(wr.width - 250, e.clientX - wr.left - 20)) + 'px'; div.style.top = Math.max(6, e.clientY - wr.top - 100) + 'px'; STATE.cards = div;
  div.addEventListener('click', ev => { const b = ev.target.closest('[data-lg]'); if (!b) return; if (b.dataset.lg === 'wave') doEmote('wave'); else if (NE().ChatEngine) NE().ChatEngine.openDM(b.dataset.u, b.dataset.n); hideCard(); });
}
function hideCard() { if (STATE.cards) { STATE.cards.remove(); STATE.cards = null; } }
function roster() {
  const L = LE(), ro = $1('#lobbyRoster'); if (!ro) return; const N = NE();
  if (!N.online || !N.online()) { ro.innerHTML = '<span class="small">OFFLINE MODE — sign in link needed to meet other operators.</span>'; const ch = $1('#lobbyCountChip'); if (ch) ch.textContent = 'OFFLINE'; return; }
  if (!AM().user) { ro.innerHTML = '<span class="small">Establishing operator link…</span>'; return; }
  const me = { uid: AM().uid, n: AM().name || 'GUEST', lv: 1, r: room(), a: AM().admin, av: mineCode(), me: 1 }, all = [me].concat(Object.keys(L.players).map(u => Object.assign({ uid: u }, L.players[u]))), here = all.filter(p => (p.r || 'deck') === room()), away = all.filter(p => (p.r || 'deck') !== room());
  const row = p => '<button class="lro' + (p.me ? ' me' : '') + (p.a ? ' admin' : '') + '" data-dmuid="' + esc(p.uid) + '" data-dmname="' + esc(p.n) + '" title="' + (p.me ? 'You' : 'Message ' + esc(p.n)) + '"><span class="lro-av">' + (window.CodexAvatar ? CodexAvatar.el(codeOf(p), 22) : '') + '</span>' + esc(p.n) + (p.a ? ' ★' : '') + (p.jk ? ' ♪' : '') + (p.pose ? ' 🪑' : '') + '<span class="lv">' + (p.me ? 'YOU' : ROOMS[p.r || 'deck'].i) + '</span></button>';
  ro.innerHTML = '<div class="lro-sec">Here · ' + here.length + '</div>' + here.map(row).join('') + (away.length ? '<div class="lro-sec">Elsewhere · ' + away.length + '</div>' + away.map(row).join('') : '');
  $A('.lro', ro).forEach(b => b.addEventListener('click', () => { if (b.dataset.dmuid !== AM().uid) NE().ChatEngine.openDM(b.dataset.dmuid, b.dataset.dmname); }));
  const ch = $1('#lobbyCountChip'); if (ch) ch.textContent = all.length + ' ONLINE';
}
function paintBar() {
  const bar = $1('#lgBar'); if (!bar) return; const id = room();
  bar.innerHTML = '<div class="lg-rooms" role="tablist" aria-label="Rooms">' + Object.keys(ROOMS).map(k => '<button type="button" role="tab" class="' + (k === id ? 'on' : '') + '" data-room="' + k + '" aria-selected="' + (k === id) + '">' + ROOMS[k].i + ' <span>' + ROOMS[k].n + '</span></button>').join('') + '</div><div class="lg-emo" role="group" aria-label="Emotes">' + Object.keys(EMO).map(k => '<button type="button" data-emo="' + k + '" aria-label="' + EMO[k][1] + '" title="' + EMO[k][1] + '">' + EMO[k][0] + '</button>').join('') + '<button type="button" data-lg2="mute" class="' + (muted() ? 'off' : '') + '" aria-label="Toggle jukebox sound" title="Jukebox sound">' + (muted() ? '🔇' : '🔊') + '</button><button type="button" data-lg2="avatar" aria-label="Edit avatar" title="Edit your avatar">🎨</button></div>';
}
function init() {
  const L = LE(); if (!L || !L.cv) return;
  Object.assign(L.me, { room: 'deck', pose: 0, emote: null, jukebox: 0, act: null, pendingSit: null });
  L.draw = draw; L.onClick = onClick; L.renderRoster = roster;
  const step0 = L.step; L.step = function (dt, t) { step0.call(this, dt, t); arrive(this); if (L.me.emote && Date.now() - L.me.emote.ts > 4300) L.me.emote = null; STATE.last += dt; if (STATE.last > 1000) { STATE.last = 0; if (wantMusic()) musicStart(); else if (MUS.on) musicStop(); } };
  const sa = L.setActive; L.setActive = function (on) { sa.call(this, on); if (!on) { musicStop(); hideCard(); } };
  L.cv.insertAdjacentHTML('afterend', '<div id="lgBar" class="lg-bar"></div>'); paintBar();
  $1('#lgBar').addEventListener('click', e => {
    const r = e.target.closest('[data-room]'), m = e.target.closest('[data-emo]'), g = e.target.closest('[data-lg2]');
    if (r) setRoom(r.dataset.room); else if (m) doEmote(m.dataset.emo);
    else if (g && g.dataset.lg2 === 'mute') { try { localStorage.setItem('cx_v7_mute', muted() ? '0' : '1'); } catch (x) {} if (muted()) musicStop(); paintBar(); }
    else if (g && g.dataset.lg2 === 'avatar') CodexAvatar.edit();
  });
  L.cv.addEventListener('mousemove', e => { const p = pt(L, e), id = room(), d = doorAt(p.x, p.y), h = d ? { l: 'Go to ' + ROOMS[ROOMS[id][d]].n, x: d === 'prev' ? 6 : 450, y: 132, w: 24 } : hotAt(id, p.x, p.y); STATE.hover = h; L.cv.style.cursor = h ? 'pointer' : 'default'; });
  L.cv.addEventListener('mouseleave', () => { STATE.hover = null; });
  document.addEventListener('cx:avatar', () => { Object.keys(cache).length; track(true); roster(); });
  setInterval(() => { Object.keys(L.players).forEach(u => { const p = L.players[u], e = EM[u]; if (p.em && (!e || e.ts !== p.em.ts)) EM[u] = { ts: p.em.ts, at: performance.now() }; }); }, 400);
  roster();
}
document.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { if (window.console) console.error('[lounge2]', e); } });
})();
