/* [V8: full-body animated characters via CodexRig/CodexAnim; appearance + interaction state synced over presence] lounge2.js — V7 lounge: four cozy rooms, doors, seats, interactive furniture, jukebox, emotes, companions, speech bubbles, avatars.
   Overrides LoungeEngine.draw/onClick/renderRoster/step (rooms + avatars ride on the existing presence channel as extra fields). */
(function () {
'use strict';
const $1 = (s, r) => (r || document).querySelector(s), $A = (s, r) => Array.from((r || document).querySelectorAll(s));
const NE = () => window.NetworkEngine || {};
const ROOMS = {
  deck: { n: 'Observation Deck', i: '🔭', prev: 'loft', next: 'cafe', k: 'DECK 07 · ABYSSAL VIEWPORT', d: 'A glass-walled deck beneath the surface. The telescope is tuned to the night sky above the water, and the whales drift past the windows.' },
  cafe: { n: 'Starlight Café', i: '☕', prev: 'deck', next: 'garden', k: 'DECK 04 · STARLIGHT CAFÉ', d: 'Warm lamps, a humming espresso machine and a jukebox that plays whatever the room is feeling. Mira keeps the tickets.' },
  garden: { n: 'Glow Greenhouse', i: '🌿', prev: 'cafe', next: 'loft', k: 'DECK 09 · GLOW GREENHOUSE', d: 'Bioluminescent plants, a koi pond and benches among the ferns. Quiet enough to hear the water.' },
  loft: { n: 'Library Loft', i: '📚', prev: 'garden', next: 'deck', k: 'DECK 11 · LIBRARY LOFT', d: 'Floor-to-ceiling shelves, a crackling fireplace and a keeper of unfinished books. Your own notes live behind the left bookcase.' }
};
const EMO = { wave: ['👋', 'Wave'], dance: ['💃', 'Dance'], heart: ['💖', 'Heart'], cheer: ['🎉', 'Cheer'], sleep: ['💤', 'Nap'], sip: ['☕', 'Sip'], spark: ['✨', 'Sparkle'], warm: ['🔥', 'Warm up'] };
const HOT = {   /* x,y,w,h = click box; sx,sy = where you stand/sit */
  deck: [{ id: 'scope', t: 'scope', x: 318, y: 120, w: 44, h: 66, sx: 340, sy: 214, l: 'Telescope → Astronomy' }, { id: 'b1', t: 'seat', lift: 4, x: 52, y: 212, w: 56, h: 26, sx: 80, sy: 232, l: 'Bench' }, { id: 'b2', t: 'seat', lift: 4, x: 372, y: 224, w: 56, h: 26, sx: 400, sy: 244, l: 'Bench' }],
  cafe: [{ id: 'juke', t: 'juke', x: 14, y: 98, w: 46, h: 88, sx: 70, sy: 222, l: 'Jukebox' }, { id: 'cof', t: 'coffee', x: 262, y: 84, w: 54, h: 46, sx: 288, sy: 214, l: 'Coffee machine' }, { id: 's1', t: 'seat', lift: 9, x: 276, y: 196, w: 28, h: 26, sx: 290, sy: 214, l: 'Stool' }, { id: 's2', t: 'seat', lift: 9, x: 326, y: 196, w: 28, h: 26, sx: 340, sy: 214, l: 'Stool' }, { id: 's3', t: 'seat', lift: 9, x: 376, y: 196, w: 28, h: 26, sx: 390, sy: 214, l: 'Stool' }, { id: 'c1', t: 'seat', lift: 3, x: 100, y: 224, w: 28, h: 30, sx: 114, sy: 244, l: 'Chair' }, { id: 'c2', t: 'seat', lift: 3, x: 182, y: 238, w: 28, h: 30, sx: 196, sy: 258, l: 'Chair' }],
  garden: [{ id: 'pond', t: 'pond', x: 150, y: 222, w: 180, h: 54, sx: 240, sy: 214, l: 'Pond' }, { id: 'g1', t: 'seat', lift: 4, x: 36, y: 214, w: 62, h: 26, sx: 68, sy: 236, l: 'Bench' }, { id: 'g2', t: 'seat', lift: 4, x: 384, y: 214, w: 62, h: 26, sx: 416, sy: 236, l: 'Bench' }, { id: 'mush', t: 'spark', x: 342, y: 170, w: 36, h: 36, sx: 360, sy: 214, l: 'Glow mushroom' }],
  loft: [{ id: 'fire', t: 'fire', x: 205, y: 104, w: 72, h: 82, sx: 240, sy: 212, l: 'Fireplace' }, { id: 'shelf', t: 'shelf', x: 24, y: 40, w: 168, h: 130, sx: 110, sy: 214, l: 'Bookshelf → your Notes' }, { id: 'a1', t: 'seat', lift: 3, x: 86, y: 220, w: 50, h: 36, sx: 112, sy: 244, l: 'Armchair' }, { id: 'a2', t: 'seat', lift: 3, x: 346, y: 220, w: 50, h: 36, sx: 372, sy: 244, l: 'Armchair' }]
};
const BUS = {};   /* evt → [fn]; handlers are isolated so one bad listener cannot break the render loop */
const on = (evt, fn) => { (BUS[evt] || (BUS[evt] = [])).push(fn); return () => off(evt, fn); };
const off = (evt, fn) => { BUS[evt] = (BUS[evt] || []).filter(f => f !== fn); };
const emit = (evt, d) => { (BUS[evt] || []).slice().forEach(f => { try { f(d); } catch (e) { if (window.console) console.error('[lounge2:' + evt + ']', e); } }); };
/* ---------- room registry ----------
   A room definition: { id, n, i, k, d, parent?, spawn?: { x, y, from?: { <roomId>: { x, y } } }, lock?: () => null | 'reason', hot?: [hotspot…] }.
   Main-ring rooms keep prev/next (the two edge doors). Sub-rooms set `parent` and are entered through `door` hotspots
   ({ t:'door', to:'<roomId>', x,y,w,h, sx,sy }), never through the ring tabs. Remote clients can only NAME a room (see roomOf); they can never define one. */
const ID_RE = /^[a-z]{2,12}$/, SEAT_RE = /^[a-z0-9]{1,8}$/;
const HANDLERS = {};      /* hotspot type → fn(hotspot, L): runs when the player arrives at a hotspot of that type (before the lounge-play hook) */
const OVERLAYS = [];      /* fn(L, ctx, t, roomId, pos): extra per-frame painters (markers, prompts) drawn after characters */
const PAINT = {};         /* roomId → { stat(c), dyn(L, c, t), light } — scenery painters; rooms without one use the built-in legacy painters */
const DECOR = {};         /* roomId → [fn(L, ctx, t)]: scenery-layer decorations drawn behind the characters (door sprites, props) */
const PAUSE = new Set();  /* tokens: while non-empty the world ignores click/keyboard movement (a game or panel owns the input) */
const inBox = (v, a, b) => typeof v === 'number' && v >= a && v <= b;
function registerRoom(def) {
  const bad = why => { if (window.console) console.error('[lounge2:registerRoom] ' + (def && def.id) + ': ' + why); return false; };
  if (!def || !ID_RE.test(def.id)) return bad('id must match ' + ID_RE);
  if (def.parent && !(ROOMS[def.parent] && !ROOMS[def.parent].parent)) return bad('parent must be an existing main room');
  if (!def.n || !def.i) return bad('missing name/icon');
  const seen = {}, hot = [];
  for (const h of (def.hot || [])) {
    if (!h || !h.id || seen[h.id] || !inBox(h.x, 0, 480) || !inBox(h.y, 0, 300) || !(h.w > 0) || !(h.h > 0) || !inBox(h.sx, 0, 480) || !inBox(h.sy, 0, 300)) return bad('bad hotspot ' + (h && h.id));
    if (h.t === 'seat' && !SEAT_RE.test(h.id)) return bad('seat ids must match ' + SEAT_RE + ' (they travel in presence)');
    if (h.t === 'door' && !h.to) return bad('door without target');
    seen[h.id] = 1; hot.push(h);
  }
  ROOMS[def.id] = Object.assign({}, ROOMS[def.id], { n: def.n, i: def.i, k: def.k || def.n.toUpperCase(), d: def.d || '', parent: def.parent || undefined, spawn: def.spawn || undefined, lock: def.lock || undefined });
  if (def.prev) ROOMS[def.id].prev = def.prev; if (def.next) ROOMS[def.id].next = def.next;
  HOT[def.id] = (HOT[def.id] || []).filter(h => h.sticky).concat(hot);
  return true;
}
/* add a hotspot to an already-registered room (e.g. the sub-room door in a main room); replaces any hotspot with the same id */
function addHotspot(rid, h) {
  if (!ROOMS[rid] || !h || !h.id || !inBox(h.x, 0, 480) || !inBox(h.y, 0, 300) || !(h.w > 0) || !(h.h > 0)) return false;
  HOT[rid] = (HOT[rid] || []).filter(x => x.id !== h.id).concat([h]); return true;
}
/* where the player appears in `rid` when arriving from `from` (e.g. back in the café, in front of the kitchen door); must be walkable floor */
function setSpawn(rid, from, pt) {
  if (!ROOMS[rid] || !ROOMS[from] || !pt || !inBox(pt.x, 16, 464) || !inBox(pt.y, 205, 282)) return false;
  const R = ROOMS[rid]; R.spawn = R.spawn || {}; R.spawn.from = R.spawn.from || {}; R.spawn.from[from] = { x: pt.x, y: pt.y }; return true;
}
const parentOf = id => (ROOMS[id] && ROOMS[id].parent) || id;
const mainRooms = () => Object.keys(ROOMS).filter(k => !ROOMS[k].parent);
const lockOf = id => { const r = ROOMS[id]; if (!r || typeof r.lock !== 'function') return null; try { return r.lock() || null; } catch (e) { return null; } };
const hlabel = h => (typeof h.lf === 'function' ? (function () { try { return h.lf(); } catch (e) { return h.l; } })() : h.l);
const STATE = { fade: 0, hover: null, fx: [], ripple: [], cards: null, last: 0, lastTrack: 0, steam: [] };
const EM = {};   /* uid → { ts, at } so emotes survive roster rebuilds */
const EXT = {};  /* extension hooks (set by lounge-play.js): npcs(roomId) → player-shaped actors, byUid(uid), arrive(hotspot, L), over(L, c, pos, t, wrap) */
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
const roomOf = p => { if (!p) return 'deck'; const r = ROOMS[p.r] && !ROOMS[p.r].parent ? p.r : 'deck'; return p.sr && ROOMS[p.sr] && ROOMS[p.sr].parent === r ? p.sr : r; };   /* remote ids are untrusted: `r` must be a main room; `sr` only counts if the registry says it belongs to that room */
const seatDef = (rid, sid) => { const hs = HOT[rid] || []; for (let i = 0; i < hs.length; i++) if (hs[i].id === sid && hs[i].t === 'seat') return hs[i]; return null; };
function room() { const L = LE(); return (L && L.me.room) || 'deck'; }
function track(force) {
  const now = Date.now(); if (!force && now - STATE.lastTrack < 900) return; STATE.lastTrack = now;
  try { const S = NE().SupabaseLounge; if (S && typeof S.available === 'function' && S.available()) S.retrack(); else if (LE() && LE().beat && now - (STATE.lastBeat || 0) > 4000) { STATE.lastBeat = now; LE().beat(true); } } catch (e) {}   /* Firestore fallback: push state, rate-limited */
}
/* compact state that rides on every presence update (network.js merges it into meta()): appearance, room, seat, jukebox, emote, facing */
function extraMeta() {
  const L = LE(), m = L ? L.me : {}, o = { av: mineCode(), r: parentOf(room()), sr: ROOMS[room()] && ROOMS[room()].parent ? room() : '', pz: m.pose && m.seat ? String(m.seat) : '', jk: m.jukebox ? 1 : 0, d: m.dir >= 0 ? 1 : -1 };
  o.em = m.emote && m.emote.k && Date.now() - m.emote.ts < 6000 ? { k: m.emote.k, ts: m.emote.ts } : null;   /* explicit null clears the field in Firestore merge-writes */
  return o;
}
function setRoom(id, opts) {
  const L = LE(); if (!L || !ROOMS[id] || L.me.room === id) return false; const o = typeof opts === 'object' && opts ? opts : { silent: !!opts };
  const why = lockOf(id); if (why) { if (!o.force) { emit('locked', { room: id, why: why }); if (window.toast) toast('<b>' + esc(ROOMS[id].i + ' ' + ROOMS[id].n) + ' is locked</b><br>' + esc(why), 'speech', 3200); if (window.sfx) sfx('cross'); return false; } }
  const from = L.me.room || 'deck', R = ROOMS[id], sp = (R.spawn && R.spawn.from && R.spawn.from[from]) || (R.spawn && R.spawn.x != null ? R.spawn : null) || { x: 240, y: 244 };
  L.me.room = id; L.me.pose = 0; L.me.seat = null; L.me.pendingSit = null; L.me.emote = null; L.me.jukebox = 0; L.me.x = L.me.cx = sp.x; L.me.y = L.me.cy = sp.y; L.me.walk = false; L.me.act = null;
  STATE.fade = 1; STATE.hover = null; hideCard(); track(true); if (L.renderRoster) L.renderRoster(); paintBar(); if (!o.silent && window.sfx) sfx('reveal'); emit('room', { from: from, to: id });
  return true;
}
function doEmote(k) { const L = LE(); if (!L || !EMO[k]) return; L.me.emote = { k: k, ts: Date.now() }; EM[AM().uid || 'me'] = { ts: L.me.emote.ts, at: performance.now() }; if (k === 'sip') STATE.fx.push({ k: 'steam', x: L.me.cx, y: L.me.cy - 30, at: performance.now() }); track(true); if (window.sfx) sfx(k === 'cheer' ? 'combo' : 'click'); emit('emote', { k: k }); }
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
function lightOverlay(c, id) { const m = PAINT[id] && PAINT[id].light !== undefined ? PAINT[id].light : { deck: null, cafe: 'rgba(255,170,90,.10)', garden: 'rgba(80,255,190,.06)', loft: 'rgba(255,140,60,.12)' }[id]; if (!m) return; c.fillStyle = m; c.fillRect(0, 0, 480, 300); const g = c.createRadialGradient(240, 150, 90, 240, 150, 300); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.38)'); c.fillStyle = g; c.fillRect(0, 0, 480, 300); }
function doors(c, id, t) {
  const R = ROOMS[id]; if (!R.prev || !R.next) return; [['L', 6, R.prev], ['R', 450, R.next]].forEach(d => { const x = d[1]; c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x, 132, 24, 53); c.fillStyle = 'rgba(255,214,120,' + (.5 + .3 * Math.sin(t / 500)) + ')'; c.fillRect(x, 132, 24, 2); c.fillRect(x, 132, 2, 53); c.fillRect(x + 22, 132, 2, 53); c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillText(ROOMS[d[2]].i, x + 12, 164); c.font = 'bold 7px "Atkinson Hyperlegible",sans-serif'; c.fillStyle = 'rgba(255,240,200,.9)'; c.fillText(ROOMS[d[2]].n.split(' ')[1] ? ROOMS[d[2]].n.split(' ')[0].toUpperCase() : ROOMS[d[2]].n.toUpperCase(), x + 12, 178); c.textAlign = 'left'; });
}
/* door hotspots: a soft pulsing frame + padlock when locked, so exits are visible without hovering */
function hotDoors(c, id, t) {
  (HOT[id] || []).forEach(h => { if (h.t !== 'door') return; const lk = lockOf(h.to), a = .35 + .25 * Math.sin(t / 420);
    c.strokeStyle = lk ? 'rgba(255,135,149,' + a + ')' : 'rgba(255,214,120,' + a + ')'; c.lineWidth = 1.5; c.strokeRect(h.x + .5, h.y + .5, h.w - 1, h.h - 1);
    c.font = '10px sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(255,240,200,.95)'; c.fillText(lk ? '🔒' : (ROOMS[h.to] ? ROOMS[h.to].i : '🚪'), h.x + h.w / 2, h.y + h.h / 2 + 4); c.textAlign = 'left'; });
}
/* the interactable closest to the player (within reach): shown as a readable prompt, used by the keyboard "interact" key */
function nearest(L) {
  const id = room(), hs = HOT[id] || []; let best = null, bd = 64;
  hs.forEach(h => { const d = Math.hypot(h.sx - L.me.cx, h.sy - L.me.cy); if (d < bd && !(h.t === 'seat' && L.me.pose && L.me.seat === h.id)) { bd = d; best = h; } });
  const R = ROOMS[id]; if (R && R.prev && R.next && L.me.cy > 128 && L.me.cy < 200) { if (L.me.cx < 46 && bd > L.me.cx) { best = { id: '_prev', t: 'ring', ring: 'prev', l: 'Go to ' + ROOMS[R.prev].n }; } else if (L.me.cx > 434 && bd > 480 - L.me.cx) { best = { id: '_next', t: 'ring', ring: 'next', l: 'Go to ' + ROOMS[R.next].n }; } }
  return best;
}
function prompt(L, c) {
  if (PAUSE.size || L.me.walk) { STATE.near = null; return; } const h = nearest(L); STATE.near = h; if (!h) return;
  const txt = (document.activeElement === L.cv ? '[E] ' : '') + hlabel(h); c.font = 'bold 9px "Atkinson Hyperlegible", sans-serif'; const w = c.measureText(txt).width + 14, x = Math.round(L.W / 2 - w / 2), y = L.H - 30;
  c.fillStyle = 'rgba(3,20,30,.9)'; c.fillRect(x, y, w, 16); c.strokeStyle = '#5fd0ee'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, 15); c.fillStyle = '#e6fbff'; c.fillText(txt, x + 7, y + 11);
}
function wrap(c, text, max) { const w = String(text).split(/\s+/), out = []; let cur = ''; w.forEach(x => { if (c.measureText(cur + ' ' + x).width > max && cur) { out.push(cur); cur = x; } else cur = (cur ? cur + ' ' : '') + x; }); if (cur) out.push(cur); return out.slice(0, 3); }
/* ---------- animated characters ---------- */
const ACT = {};                         /* uid → { an: Animator, seen, pet:{x,y} } — one shared state machine per character, local or remote */
const AURC = ['', '#ffe29a', '#ffffff', '#ff7ec9', '#a99cff', '#ff9a3c'];
const actor = uid => ACT[uid] || (ACT[uid] = { an: new window.CodexAnim.Animator(), seen: 0, pet: { x: 0, y: 0, on: 0 } });
const emoteFor = (uid, now) => { const e = EM[uid]; if (!e) return null; const em = uid === (AM().uid || 'me') ? (LE().me.emote) : (LE().players[uid] || (EXT.byUid && EXT.byUid(uid)) || {}).em; if (!em || !em.k || !window.CodexAnim || !CodexAnim.CLIPS[em.k]) return null; return now - e.at < CodexAnim.durOf(em.k) + 300 ? { k: em.k, ts: em.ts } : null; };
/* advance every visible character's animation (called from the engine step; dt already clamped by the engine) */
function tick(L, dt) {
  if (!window.CodexAnim || !window.CodexAvatar) return; const id = room(), now = performance.now(), red = !!L.REDUCED, myId = AM().uid || 'me';
  const feed = (uid, p, isMe) => {
    const a = actor(uid); a.seen = now;
    if (!isMe && p.em) { const e = EM[uid]; if (!e || e.ts !== p.em.ts) EM[uid] = { ts: p.em.ts, at: (!e && Date.now() - p.em.ts > 8000) ? -1e9 : now }; }   /* joining mid-way: don't replay an old emote */
    const seated = isMe ? L.me.pose : p.pose, em = emoteFor(uid, now);
    a.an.update(dt, { walk: !!p.walk, dx: p.x - p.cx, dy: p.y - p.cy, dir: p.dir, speed: isMe ? 62 : 46, seated: !!seated, emote: em, reduced: red });
    const code = isMe ? mineCode() : codeOf(p);
    if (window.CodexAvatar.parse(code).p > 0) { const tx = p.cx + (p.dir >= 0 ? -17 : 17), ty = p.cy - 7, pt = a.pet; if (!pt.on) { pt.x = tx; pt.y = ty; pt.on = 1; } const k = red ? 1 : 1 - Math.exp(-dt / 140); pt.x += (tx - pt.x) * k; pt.y += (ty - pt.y) * k; }
  };
  feed(myId, L.me, true);
  Object.keys(L.players).forEach(u => { const p = L.players[u]; if (roomOf(p) === id) feed(u, p, false); });
  if (EXT.npcs) EXT.npcs(id).forEach(p => feed(p.uid, p, false));
  Object.keys(ACT).forEach(k => { if (now - ACT[k].seen > 4000) delete ACT[k]; });
}
function token(L, c, p, isMe, t) {
  const A = window.CodexAvatar, uid = isMe ? (AM().uid || 'me') : p.uid, code = isMe ? mineCode() : codeOf(p), a = actor(uid), an = a.an, o = A.parse(code);
  const em = EM[uid], emo = em && performance.now() - em.at < 4200 ? em : null, k = isMe ? (L.me.emote && emo ? L.me.emote.k : null) : (p.em && emo ? p.em.k : null);
  const sd = (isMe ? L.me.pose : p.pose) ? seatDef(isMe ? room() : roomOf(p), isMe ? L.me.seat : p.pz) : null, st = Math.max(0, Math.min(1, an.cur.st || 0));
  const x = Math.round(p.cx), gy = Math.round(p.cy), y = gy - (sd && sd.lift ? Math.round(sd.lift * st) : 0), pose = an.pose();
  c.imageSmoothingEnabled = false;
  if (o.au > 0 && AURC[o.au]) { c.save(); c.globalAlpha = .28 + (L.REDUCED ? 0 : .1 * Math.sin(t / 320)); c.strokeStyle = AURC[o.au]; c.lineWidth = 2; c.beginPath(); c.ellipse(x, gy + 2, 16, 5.5, 0, 0, 7); c.stroke(); c.restore(); }
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x, gy + 2, 12, 4, 0, 0, 7); c.fill();
  if (o.p > 0 && a.pet.on) { const pi = A.petImg(code); if (pi && pi.complete && pi.naturalWidth) { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(Math.round(a.pet.x), gy + 2, 6, 2, 0, 0, 7); c.fill(); c.drawImage(pi, Math.round(a.pet.x) - 8, Math.round(a.pet.y) - 8 + (L.REDUCED || p.walk ? 0 : Math.round(Math.sin(t / 380 + x))), 16, 16); } }
  let fr = A.sprite(code, pose, true); if (fr) a.last = fr; else fr = a.last;     /* soft: over the per-tick build budget → keep showing the previous frame */
  if (fr && fr.cv) c.drawImage(fr.cv, x - A.rig.OX, y - A.rig.OY); else { c.fillStyle = '#0e4a6c'; c.fillRect(x - 8, y - 40, 16, 40); }
  const top = y - 50 - (o.t > 0 ? 8 : 0) - (o.t === 4 || o.t === 6 || o.t === 12 ? 8 : 0) - (o.h === 5 ? 4 : 0) + Math.min(0, Math.round(an.cur.by || 0)), py = top - 13;
  const name = String(p.n || 'OP').slice(0, 14), lv = p.tag || ('LV' + (p.lv || 1)); c.font = 'bold 8px "Atkinson Hyperlegible", sans-serif';
  const tw = Math.max(34, c.measureText(name).width + c.measureText(lv).width + 8); c.fillStyle = isMe ? 'rgba(6,52,72,.9)' : 'rgba(3,20,30,.86)'; c.fillRect(x - tw / 2, py, tw, 11);
  c.fillStyle = p.a ? '#ffc874' : (isMe ? '#5fd0ee' : '#e6fbff'); c.fillText(name, x - tw / 2 + 3, py + 8.5); c.fillStyle = '#ffc874'; c.fillText(lv, x - tw / 2 + c.measureText(name).width + 6, py + 8.5);
  if (k && EMO[k]) { c.font = '15px sans-serif'; c.textAlign = 'center'; const age = (performance.now() - emo.at) / 4200; c.globalAlpha = 1 - age * age; c.fillText(EMO[k][0], x + 16, py - 2 - age * 12); c.globalAlpha = 1; c.textAlign = 'left'; }
  if (isMe) { c.fillStyle = 'rgba(95,208,238,.5)'; c.fillRect(x - 8, gy + 5, 16, 2); }
  return { x: x, y: py - 2, top: py - 2 };
}
function bubbles(L, c, pos) {
  const CE = NE().ChatEngine; if (!CE || CE.channel !== 'global') return; const now = Date.now(), seen = {};
  (CE.lastDocs || []).slice(-8).forEach(m => { if (!m.k && m.ts && now - m.ts < 7000 && m.u) seen[m.u] = m; });
  c.font = '9px "Atkinson Hyperlegible", sans-serif';
  Object.keys(seen).forEach(u => { const p = pos[u]; if (!p) return; const lines = wrap(c, seen[u].t, 120), w = Math.max.apply(null, lines.map(l => c.measureText(l).width)) + 10, h = lines.length * 11 + 6, x = Math.max(4, Math.min(L.W - w - 4, p.x - w / 2)), y = Math.max(2, p.y - h - 6);
    c.globalAlpha = Math.min(1, (7000 - (now - seen[u].ts)) / 900); c.fillStyle = 'rgba(255,255,255,.96)'; c.fillRect(x, y, w, h); c.fillRect(Math.round(p.x) - 3, y + h, 6, 4); c.fillStyle = '#10222e'; lines.forEach((l, i) => c.fillText(l, x + 5, y + 11 + i * 11)); c.globalAlpha = 1; });
}
function draw(t) {
  const L = LE(), c = L.ctx; if (!c) return; const id = room(), realtime = NE().SupabaseLounge;
  try { if (window.CodexAvatar && CodexAvatar.rig) CodexAvatar.rig.budget(6); } catch (e) {}      /* ≤ ~6 ms of new sprite composition per tick */
  c.imageSmoothingEnabled = false;
  const P = PAINT[id];
  if (P && P.draw) P.draw(L, c, t);
  else if (P && P.stat) { if (!cache[id]) { const cv = document.createElement('canvas'); cv.width = 480; cv.height = 300; P.stat(cv.getContext('2d')); cache[id] = cv; } c.drawImage(cache[id], 0, 0); if (P.dyn) P.dyn(L, c, t); }
  else { if (id === 'deck') deckBG(L, c, t); else { if (!cache[id]) cache[id] = paintStatic(id); c.drawImage(cache[id], 0, 0); } dynRoom(L, c, t, id); }
  (DECOR[id] || []).forEach(f => { try { f(L, c, t); } catch (e) { if (window.console && !STATE.warnedDec) { STATE.warnedDec = 1; console.error('[lounge2:decor]', e); } } });
  let banner = null, red = false; if (!NE().online || !NE().online()) { banner = 'OFFLINE MODE — LOG-IN LINK REQUIRED FOR OTHER OPERATORS'; red = true; } else if (!AM().user) banner = 'ESTABLISHING OPERATOR LINK…'; else if (realtime && typeof realtime.available === 'function' && realtime.available() && realtime.state === 'retry') banner = 'REALTIME LINK LOST — RETRYING…';
  if (banner) { c.fillStyle = 'rgba(2,20,34,.74)'; c.fillRect(0, 78, L.W, 34); c.fillStyle = red ? '#ff8795' : '#ffcb7a'; c.font = 'bold 10px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'center'; c.fillText(banner, L.W / 2, 98); c.textAlign = 'left'; }
  const list = []; Object.keys(L.players).forEach(u => { const p = L.players[u]; if (roomOf(p) === id) { p.uid = u; list.push(p); } });
  const me = { n: AM().name || 'YOU', lv: (typeof window.levelOf === 'function' && typeof S !== 'undefined') ? window.levelOf(S.xp || 0) + 1 : 1, cx: L.me.cx, cy: L.me.cy, dir: L.me.dir, walk: L.me.walk, a: AM().admin };   /* `S` is engine.js's module-scoped let binding, not a window property */
  list.push(me); if (EXT.npcs) EXT.npcs(id).forEach(p => list.push(p)); list.sort((a, b) => a.cy - b.cy); const pos = {};
  list.forEach(p => { const isMe = p === me; const r = token(L, c, p, isMe, t); pos[isMe ? AM().uid : p.uid] = r; });
  lightOverlay(c, id); doors(c, id, t); hotDoors(c, id, t); bubbles(L, c, pos);
  if (EXT.over) { try { EXT.over(L, c, pos, t, wrap); } catch (e) { if (window.console && !STATE.warnedOver) { STATE.warnedOver = 1; console.error('[lounge2:over]', e); } } }
  OVERLAYS.forEach(f => { try { f(L, c, t, id, pos); } catch (e) { if (window.console && !STATE.warnedOv) { STATE.warnedOv = 1; console.error('[lounge2:overlay]', e); } } });
  prompt(L, c);
  STATE.fx = STATE.fx.filter(f => performance.now() - f.at < 1800); STATE.fx.forEach(f => { const a = (performance.now() - f.at) / 1800; c.fillStyle = 'rgba(255,255,255,' + (.7 * (1 - a)) + ')'; c.beginPath(); c.arc(f.x + Math.sin(a * 6) * 3, f.y - a * 24, 2 + a * 3, 0, 7); c.fill(); });
  const h = STATE.hover; if (h) { c.font = 'bold 9px "Atkinson Hyperlegible", sans-serif'; const w = c.measureText(hlabel(h)).width + 10, x = Math.max(4, Math.min(L.W - w - 4, h.x + h.w / 2 - w / 2)), y = Math.max(4, h.y - 16); c.fillStyle = 'rgba(3,20,30,.92)'; c.fillRect(x, y, w, 14); c.strokeStyle = '#ffc874'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, 13); c.fillStyle = '#ffe9b0'; c.fillText(hlabel(h), x + 5, y + 10); }
  if (STATE.fade > 0.01) { c.fillStyle = 'rgba(2,12,20,' + STATE.fade + ')'; c.fillRect(0, 0, L.W, L.H); STATE.fade *= .88; }
  c.font = '7px "Atkinson Hyperlegible", sans-serif'; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(ROOMS[id].i + ' ' + ROOMS[id].n.toUpperCase(), 10, 294);
}
/* ---------- interaction ---------- */
function pt(L, e) { const r = L.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (L.W / r.width), y: (e.clientY - r.top) * (L.H / r.height) }; }
function hotAt(id, x, y) { const hs = HOT[id] || []; for (let i = 0; i < hs.length; i++) { const h = hs[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }
const doorAtKey = p => doorAt(p.x, p.y);
function doorAt(x, y) { return y > 128 && y < 190 ? (x < 34 ? 'prev' : x > 446 ? 'next' : null) : null; }
/* walk to a hotspot's stand point and act on arrival — the single path used by mouse clicks, the Activity Console and keyboard play */
function walkToHot(L, h) {
  const realtime = NE().SupabaseLounge;
  L.me.pose = 0; L.me.seat = null; L.me.pendingSit = null; L.me.emote = null;
  L.me.x = Math.max(L.MIN_X, Math.min(L.MAX_X, h.sx)); L.me.y = Math.max(L.MIN_Y, Math.min(L.MAX_Y, h.sy)); L.me.walk = true; L.me.act = h; if (h.t === 'seat') L.me.pendingSit = h;
  if (window.sfx) sfx('click'); if (realtime && typeof realtime.available === 'function' && realtime.available() && typeof realtime.sendWalk === 'function') realtime.sendWalk();
}
function walkTo(hotId) { const L = LE(); if (!L || !L.active) return false; const h = (HOT[room()] || []).filter(x => x.id === hotId)[0]; if (!h) return false; hideCard(); walkToHot(L, h); return true; }
/* everyone visible in a room: remote operators (uid), NPCs, and the local player — used by the console's Room tab */
function who(rid) {
  const L = LE(), out = []; if (!L) return out; rid = rid || room();
  out.push({ me: 1, n: AM().name || 'YOU', code: mineCode() });
  Object.keys(L.players || {}).forEach(u => { const p = L.players[u]; if (roomOf(p) === rid) out.push({ uid: u, n: p.n || 'OP', code: codeOf(p), a: !!p.a }); });
  if (EXT.npcs) { try { EXT.npcs(rid).forEach(p => out.push({ npc: 1, uid: p.uid, n: p.n, tag: p.tag, code: codeOf(p) })); } catch (e) {} }
  return out;
}
function onClick(e) {
  if (PAUSE.size) return; const L = LE(), p = pt(L, e), id = room(), d = doorAt(p.x, p.y), realtime = NE().SupabaseLounge;
  if (d && ROOMS[id][d]) { setRoom(ROOMS[id][d]); return; }
  if (AM().user && L.cv) { /* click another operator → mini card */ const keys = Object.keys(L.players); for (let i = 0; i < keys.length; i++) { const o = L.players[keys[i]]; if (roomOf(o) === id && Math.abs(p.x - o.cx) < 14 && p.y > o.cy - 52 && p.y < o.cy + 5) { showCard(keys[i], o, e); return; } } }
  hideCard();
  const h = hotAt(id, p.x, p.y); L.me.pose = 0; L.me.seat = null; L.me.pendingSit = null; L.me.emote = null;
  if (h) { walkToHot(L, h); return; }
  L.me.act = null; L.me.x = Math.max(L.MIN_X, Math.min(L.MAX_X, Math.round(p.x))); L.me.y = Math.max(L.MIN_Y, Math.min(L.MAX_Y, Math.round(p.y))); L.me.walk = true; if (window.sfx) sfx('click'); if (realtime && typeof realtime.available === 'function' && realtime.available() && typeof realtime.sendWalk === 'function') realtime.sendWalk();
}
const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1], A: [-1, 0], D: [1, 0], W: [0, -1], S: [0, 1] };
function onKey(e) {
  const L = LE(); if (!L || !L.active || PAUSE.size || e.ctrlKey || e.metaKey || e.altKey) return;
  if (KEYS[e.key]) { e.preventDefault(); L.me.pose = 0; L.me.seat = null; L.me.pendingSit = null; L.me.act = null; L.me.x = Math.max(L.MIN_X, Math.min(L.MAX_X, Math.round(L.me.x + KEYS[e.key][0] * 30))); L.me.y = Math.max(L.MIN_Y, Math.min(L.MAX_Y, Math.round(L.me.y + KEYS[e.key][1] * 22))); L.me.walk = true; const rt = NE().SupabaseLounge; if (rt && typeof rt.available === 'function' && rt.available() && typeof rt.sendWalk === 'function') rt.sendWalk(); return; }
  if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
    const h = nearest(L); if (!h) return; e.preventDefault(); hideCard();
    if (h.t === 'ring') setRoom(ROOMS[room()][h.ring]); else walkToHot(L, h);
  }
}
function arrive(L) {
  const a = L.me.act; if (!a || L.me.walk) return; L.me.act = null; emit('arrive', { id: a.id, t: a.t, room: room() });
  if (a.t === 'seat') { L.me.pose = 1; L.me.seat = a.id; L.me.dir = a.sx < 240 ? 1 : -1; track(true); }
  else if (a.t === 'juke') { L.me.jukebox = L.me.jukebox ? 0 : 1; track(true); toast('<b>Jukebox ' + (L.me.jukebox ? 'on' : 'off') + '</b><br>' + (L.me.jukebox ? 'Everyone in the café hears it.' : ''), 'speech', 1800); if (L.me.jukebox) musicStart(); }
  else if (a.t === 'coffee') doEmote('sip');
  else if (a.t === 'fire') doEmote('warm');
  else if (a.t === 'spark') doEmote('spark');
  else if (a.t === 'pond') { STATE.ripple.push({ x: L.me.cx, y: 250, at: performance.now() }); if (window.sfx) sfx('flip'); }
  else if (a.t === 'shelf') { if (window.showScreen) showScreen('notebook'); }
  else if (a.t === 'scope') { if (window.showScreen) showScreen('sec7'); }
  else if (a.t === 'door') setRoom(a.to, { from: room() });
  else if (HANDLERS[a.t]) { try { HANDLERS[a.t](a, L); } catch (e) { if (window.console) console.error('[lounge2:handler:' + a.t + ']', e); } }
  else if (EXT.arrive) EXT.arrive(a, L);
}
function showCard(uid, o, e) {
  hideCard(); const wrapEl = LE().cv.parentNode; wrapEl.style.position = 'relative';
  const r = LE().cv.getBoundingClientRect(), wr = wrapEl.getBoundingClientRect(), div = document.createElement('div'); div.className = 'lg-card';
  div.innerHTML = (window.CodexAvatar ? CodexAvatar.el(codeOf(o), 56, 'sq') : '') + '<div><b>' + esc(o.n || 'OP') + '</b><small>LV' + (o.lv || 1) + ' · ' + esc(ROOMS[roomOf(o)].n) + '</small><div class="lg-cb"><button type="button" class="btn" data-lg="wave">👋 Wave</button><button type="button" class="btn primary" data-lg="dm" data-u="' + esc(uid) + '" data-n="' + esc(o.n || '') + '">💬 Message</button></div></div>';
  wrapEl.appendChild(div); div.style.left = Math.max(6, Math.min(wr.width - 250, e.clientX - wr.left - 20)) + 'px'; div.style.top = Math.max(6, e.clientY - wr.top - 100) + 'px'; STATE.cards = div;
  div.addEventListener('click', ev => { const b = ev.target.closest('[data-lg]'); if (!b) return; if (b.dataset.lg === 'wave') doEmote('wave'); else if (NE().ChatEngine) NE().ChatEngine.openDM(b.dataset.u, b.dataset.n); hideCard(); });
}
function hideCard() { if (STATE.cards) { STATE.cards.remove(); STATE.cards = null; } }
function roster() {
  const L = LE(), ro = $1('#lobbyRoster'); if (!ro) return; const N = NE();
  if (!N.online || !N.online()) { ro.innerHTML = '<span class="small">OFFLINE MODE — sign in link needed to meet other operators.</span>'; const ch = $1('#lobbyCountChip'); if (ch) ch.textContent = 'OFFLINE'; return; }
  if (!AM().user) { ro.innerHTML = '<span class="small">Establishing operator link…</span>'; return; }
  const me = { uid: AM().uid, n: AM().name || 'GUEST', lv: 1, r: room(), a: AM().admin, av: mineCode(), me: 1 }, all = [me].concat(Object.keys(L.players).map(u => Object.assign({ uid: u }, L.players[u]))), here = all.filter(p => roomOf(p) === room()), away = all.filter(p => roomOf(p) !== room());
  const row = p => '<button class="lro' + (p.me ? ' me' : '') + (p.a ? ' admin' : '') + '" data-dmuid="' + esc(p.uid) + '" data-dmname="' + esc(p.n) + '" title="' + (p.me ? 'You' : 'Message ' + esc(p.n)) + '"><span class="lro-av">' + (window.CodexAvatar ? CodexAvatar.el(codeOf(p), 22) : '') + '</span>' + esc(p.n) + (p.a ? ' ★' : '') + (p.jk ? ' ♪' : '') + (p.pose ? ' 🪑' : '') + '<span class="lv">' + (p.me ? 'YOU' : ROOMS[roomOf(p)].i) + '</span></button>';
  ro.innerHTML = '<div class="lro-sec">Here · ' + here.length + '</div>' + here.map(row).join('') + (away.length ? '<div class="lro-sec">Elsewhere · ' + away.length + '</div>' + away.map(row).join('') : '');
  $A('.lro', ro).forEach(b => b.addEventListener('click', () => { if (b.dataset.dmuid !== AM().uid) NE().ChatEngine.openDM(b.dataset.dmuid, b.dataset.dmname); }));
  const ch = $1('#lobbyCountChip'); if (ch) ch.textContent = all.length + ' ONLINE';
}
function paintBar() {
  const bar = $1('#lgBar'); if (!bar) return; const id = room();
  bar.innerHTML = '<div class="lg-rooms" role="tablist" aria-label="Rooms">' + mainRooms().map(k => '<button type="button" role="tab" class="' + (k === parentOf(id) ? 'on' : '') + '" data-room="' + k + '" aria-selected="' + (k === parentOf(id)) + '">' + ROOMS[k].i + ' <span>' + ROOMS[k].n + '</span></button>').join('') + (ROOMS[id].parent ? '<span class="lg-crumb" aria-label="You are in a side room">↳ ' + ROOMS[id].i + ' ' + ROOMS[id].n + '</span>' : '') + '</div><div class="lg-emo" role="group" aria-label="Emotes">' + Object.keys(EMO).map(k => '<button type="button" data-emo="' + k + '" aria-label="' + EMO[k][1] + '" title="' + EMO[k][1] + '">' + EMO[k][0] + '</button>').join('') + '<button type="button" data-lg2="mute" class="' + (muted() ? 'off' : '') + '" aria-label="Toggle jukebox sound" title="Jukebox sound">' + (muted() ? '🔇' : '🔊') + '</button><button type="button" data-lg2="avatar" aria-label="Edit avatar" title="Edit your avatar">🎨</button></div>';
}
function init() {
  const L = LE(); if (!L || !L.cv) return;
  Object.assign(L.me, { room: 'deck', pose: 0, seat: null, emote: null, jukebox: 0, act: null, pendingSit: null });
  L.extra = extraMeta;                /* network.js merges this into presence meta */
  L.actors = ACT;                     /* read-only handle for diagnostics */
  window.CodexLounge = { HOT: HOT, ROOMS: ROOMS, hooks: EXT, room: room, doEmote: doEmote, track: track, setRoom: setRoom, who: who, walkTo: walkTo, on: on, off: off, emit: emit,
    registerRoom: registerRoom, addHotspot: addHotspot, setSpawn: setSpawn, handlers: HANDLERS, addOverlay: f => { OVERLAYS.push(f); return () => { const i = OVERLAYS.indexOf(f); if (i >= 0) OVERLAYS.splice(i, 1); }; },
    decorate: (id, fn) => { if (ID_RE.test(id) && typeof fn === 'function') (DECOR[id] || (DECOR[id] = [])).push(fn); }, registerArt: (id, def) => { if (ID_RE.test(id) && def) { PAINT[id] = def; delete cache[id]; } }, parentOf: parentOf, mainRooms: mainRooms, lockOf: lockOf, label: hlabel, nearest: () => STATE.near,
    pause: tok => { PAUSE.add(tok || 'x'); emit('pause', { on: true }); }, resume: tok => { PAUSE.delete(tok || 'x'); if (!PAUSE.size) emit('pause', { on: false }); }, paused: () => PAUSE.size > 0 };   /* seam for lounge-play.js */
  L.draw = draw; L.onClick = onClick; L.renderRoster = roster;
  const step0 = L.step; L.step = function (dt, t) { step0.call(this, dt, t); arrive(this); try { tick(this, dt); } catch (e) { if (window.console && !STATE.warned) { STATE.warned = 1; console.error('[lounge2:tick]', e); } } if (L.me.emote && Date.now() - L.me.emote.ts > 4300) L.me.emote = null; STATE.last += dt; if (STATE.last > 1000) { STATE.last = 0; if (wantMusic()) musicStart(); else if (MUS.on) musicStop(); } };
  const sa = L.setActive; L.setActive = function (on) { sa.call(this, on); if (!on) { musicStop(); hideCard(); Object.keys(ACT).forEach(k => delete ACT[k]); } emit('active', { on: !!on }); };
  L.cv.insertAdjacentHTML('afterend', '<div id="lgBar" class="lg-bar"></div>'); paintBar();
  $1('#lgBar').addEventListener('click', e => {
    const r = e.target.closest('[data-room]'), m = e.target.closest('[data-emo]'), g = e.target.closest('[data-lg2]');
    if (r) setRoom(r.dataset.room, { from: room() }); else if (m) doEmote(m.dataset.emo);
    else if (g && g.dataset.lg2 === 'mute') { try { localStorage.setItem('cx_v7_mute', muted() ? '0' : '1'); } catch (x) {} if (muted()) musicStop(); paintBar(); }
    else if (g && g.dataset.lg2 === 'avatar') CodexAvatar.edit();
  });
  L.cv.addEventListener('mousemove', e => { const p = pt(L, e), id = room(), d = ROOMS[id][doorAtKey(p)] ? doorAt(p.x, p.y) : null, h = d ? { l: 'Go to ' + ROOMS[ROOMS[id][d]].n, x: d === 'prev' ? 6 : 450, y: 132, w: 24 } : hotAt(id, p.x, p.y); STATE.hover = h; L.cv.style.cursor = h ? 'pointer' : 'default'; });
  L.cv.addEventListener('mouseleave', () => { STATE.hover = null; });
  L.cv.tabIndex = 0; L.cv.setAttribute('aria-label', 'Observation lounge — arrow keys or WASD to move, E to use the highlighted object. The Activity Console lists everything you can do here.'); L.cv.addEventListener('keydown', onKey);
  document.addEventListener('cx:avatar', () => { Object.keys(cache).length; track(true); roster(); });
  /* remote emote detection now lives in tick(): it only runs while the lounge is active */
  roster();
}
document.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { if (window.console) console.error('[lounge2]', e); } });
})();
