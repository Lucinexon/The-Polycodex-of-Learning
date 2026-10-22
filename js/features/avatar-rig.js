/* avatar-rig.js — CodexRig: procedural pixel-art chibi rig for the Codex avatar system.
   ----------------------------------------------------------------------------------------------
   · One appearance descriptor (derived from the compact avatar code) drives everything: static
     portraits (SVG), animated full-body frames (canvas) and the avatar studio preview.
   · Characters are NOT sprite sheets. Each body part (head, hair, torso, shoes …) is generated
     from small shape programs on a 48×72 pixel grid, cached as a trimmed pixel sprite, and
     assembled per pose by a skeleton (joints, limb chains, anchors, layering order).
   · Cache key = only the fields a part depends on, so changing e.g. shoe colour rebuilds only the
     shoe sprites; every cache is a bounded LRU.
   Public: CodexRig.{W,H,OX,OY, frame(desc,pose), bust(desc,view), svg(desc,opts), poseKey, IDLE,
                     purge(), trim(), stats()}                                                      */
(function (root) {
'use strict';
const W = 48, H = 72, OX = 24, OY = 70, N = W * H, HC = -34;   /* HC = head-centre y in rig space (y up is negative, ground = 0) */

/* ---------------------------------- colour helpers ---------------------------------- */
const h2r = h => { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const r2h = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = h2r(a), y = h2r(b); return r2h([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); };
const lum = h => { const c = h2r(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
const P32 = h => { const c = h2r(h); return ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; };
const lift = (h, floor) => { const l = lum(h); return l >= floor ? h : mix(h, '#6a6a76', Math.min(1, (floor - l) / floor)); };

/* ---------------------------------- colour roles ---------------------------------- */
/* Parts paint with ROLE numbers, never with colours; one role table per appearance resolves them. */
const ROLE = ['', 'INK', 'WHITE', 'SKIN', 'SKIN_HI', 'SKIN_LO', 'SKIN_OL', 'HAIR', 'HAIR_HI', 'HAIR_LO', 'OUT', 'OUT_HI', 'OUT_LO', 'LEG', 'LEG_HI', 'LEG_LO',
  'SHOE', 'SHOE_HI', 'SHOE_LO', 'ACC', 'ACC_HI', 'ACC_LO', 'IRIS', 'IRIS_HI', 'GOLD', 'GOLD_LO', 'PINK', 'CYAN', 'GRAY', 'GRAY_HI', 'GRAY_LO', 'GREEN', 'GREEN_LO',
  'RED', 'MOUTH', 'BLUSH', 'SCLERA', 'LENS', 'WOOD', 'CUP', 'STEAM', 'SPARK', 'DARK', 'COAT', 'COAT_HI', 'COAT_LO', 'NAVY', 'NAVY_HI', 'NAVY_LO', 'BLUE', 'BLUE_HI', 'BLUE_LO'];
const R = {}; ROLE.forEach((n, i) => { if (n) R[n] = i; });
const NR = ROLE.length, BEV = [];
[['SKIN', 'SKIN_HI', 'SKIN_LO'], ['HAIR', 'HAIR_HI', 'HAIR_LO'], ['OUT', 'OUT_HI', 'OUT_LO'], ['LEG', 'LEG_HI', 'LEG_LO'], ['SHOE', 'SHOE_HI', 'SHOE_LO'],
  ['ACC', 'ACC_HI', 'ACC_LO'], ['GRAY', 'GRAY_HI', 'GRAY_LO'], ['GOLD', 'WHITE', 'GOLD_LO'], ['GREEN', 'GREEN', 'GREEN_LO'], ['COAT', 'COAT_HI', 'COAT_LO'], ['NAVY', 'NAVY_HI', 'NAVY_LO'], ['BLUE', 'BLUE_HI', 'BLUE_LO']].forEach(a => { BEV[R[a[0]]] = [R[a[1]], R[a[2]]]; });

function makeRoles(A) {
  const t = new Uint32Array(NR), S = (n, hex) => { t[R[n]] = P32(hex); };
  const skin = A.skin, hair = lift(A.hair, .2), out = lift(A.outfit, .27), leg = lift(A.legs, .25), shoe = A.shoes, acc = lift(A.accent, .25), iris = A.iris;
  S('INK', '#120c10'); S('WHITE', '#ffffff'); S('DARK', '#1c1822');
  S('SKIN', skin); S('SKIN_HI', mix(skin, '#fff6ea', .5)); S('SKIN_LO', mix(skin, '#b0603c', .34)); S('SKIN_OL', mix(skin, '#4a1f12', .72));
  S('HAIR', hair); S('HAIR_HI', mix(hair, '#f3e6c4', .26)); S('HAIR_LO', mix(hair, '#000000', .3));
  S('OUT', out); S('OUT_HI', mix(out, '#ffffff', .22)); S('OUT_LO', mix(out, '#000000', .3));
  S('LEG', leg); S('LEG_HI', mix(leg, '#ffffff', .22)); S('LEG_LO', mix(leg, '#1a1208', .4));
  S('SHOE', shoe); S('SHOE_HI', mix(shoe, '#ffffff', .42)); S('SHOE_LO', mix(shoe, '#14141c', .6));
  S('ACC', acc); S('ACC_HI', mix(acc, '#ffffff', .3)); S('ACC_LO', mix(acc, '#000000', .34));
  S('IRIS', iris); S('IRIS_HI', mix(iris, '#ffffff', .45));
  S('GOLD', '#f2c14e'); S('GOLD_LO', '#b07d1c'); S('PINK', '#ff7aa8'); S('CYAN', '#5fd0ee'); S('GRAY', '#aab3bd'); S('GRAY_HI', '#dfe5ea'); S('GRAY_LO', '#6b7782');
  S('GREEN', '#58b060'); S('GREEN_LO', '#2f7a42'); S('RED', '#d9453d'); S('MOUTH', '#7a2438'); S('BLUSH', mix(skin, '#ff6f8a', .55));
  S('COAT', '#eef3f7'); S('COAT_HI', '#ffffff'); S('COAT_LO', '#b5c1cc'); S('NAVY', '#343c4c'); S('NAVY_HI', '#566077'); S('NAVY_LO', '#1d222e'); S('BLUE', '#3b7bd8'); S('BLUE_HI', '#6aa0ee'); S('BLUE_LO', '#27529a');
  S('SCLERA', '#e6ecf2'); S('LENS', '#bfe9f4'); S('WOOD', '#8a5a34'); S('CUP', '#f4efe6'); S('STEAM', '#ffffff'); S('SPARK', '#fff2a8');
  return t;
}

/* ---------------------------------- pixel layer (role map) ---------------------------------- */
function Layer() { this.t = new Uint8Array(N); this.reset(); }
const LP = Layer.prototype;
LP.reset = function () { this.t.fill(0); this.k = 1; this.s = 0; this.ox = 0; this.oy = 0; this.x0 = W; this.y0 = H; this.x1 = -1; this.y1 = -1; return this; };
/* design-space → rig-space transform:  X = x·k + s + ox ; Y = y + oy   (k,s give the 3/4-view squeeze/shift) */
LP.at = function (ox, oy, k, s) { this.ox = ox || 0; this.oy = oy || 0; this.k = k == null ? 1 : k; this.s = s || 0; return this; };
LP.X = function (x) { return x * this.k + this.s + this.ox; };
LP.Y = function (y) { return y + this.oy; };
LP.set = function (cx, cy, r) {
  const col = OX + cx, row = OY + cy; if (col < 0 || col >= W || row < 0 || row >= H) return;
  this.t[row * W + col] = r;
  if (r) { if (col < this.x0) this.x0 = col; if (col > this.x1) this.x1 = col; if (row < this.y0) this.y0 = row; if (row > this.y1) this.y1 = row; }
};
LP.px = function (x, y, r) { this.set(Math.floor(this.X(x + .5)), Math.floor(this.Y(y + .5)), r); return this; };
LP.rect = function (x, y, w, h, r) {
  const x0 = this.X(x), x1 = this.X(x + w), y0 = this.Y(y), y1 = this.Y(y + h);
  for (let cy = Math.ceil(y0 - .5); cy < Math.ceil(y1 - .5); cy++) for (let cx = Math.ceil(x0 - .5); cx < Math.ceil(x1 - .5); cx++) this.set(cx, cy, r);
  return this;
};
LP.ell = function (cx, cy, rx, ry, r) {
  const X = this.X(cx), Y = this.Y(cy), a = Math.max(.01, rx * this.k), b = Math.max(.01, ry);
  for (let y = Math.floor(Y - b); y <= Math.ceil(Y + b); y++) for (let x = Math.floor(X - a); x <= Math.ceil(X + a); x++) { const dx = (x + .5 - X) / a, dy = (y + .5 - Y) / b; if (dx * dx + dy * dy <= 1) this.set(x, y, r); }
  return this;
};
LP.poly = function (p, r) {
  const q = []; let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (let i = 0; i < p.length; i += 2) { const x = this.X(p[i]), y = this.Y(p[i + 1]); q.push(x, y); if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; }
  const n = q.length / 2;
  for (let y = Math.floor(mny); y <= Math.ceil(mxy); y++) for (let x = Math.floor(mnx); x <= Math.ceil(mxx); x++) {
    const px = x + .5, py = y + .5; let ins = false;
    for (let i = 0, j = n - 1; i < n; j = i++) { const xi = q[i * 2], yi = q[i * 2 + 1], xj = q[j * 2], yj = q[j * 2 + 1]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; }
    if (ins) this.set(x, y, r);
  }
  return this;
};
LP.line = function (x0, y0, x1, y1, r) {   /* 1-px Bresenham in design space */
  let ax = Math.floor(this.X(x0 + .5)), ay = Math.floor(this.Y(y0 + .5)); const bx = Math.floor(this.X(x1 + .5)), by = Math.floor(this.Y(y1 + .5));
  const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1; let er = dx + dy;
  for (let g = 0; g < 200; g++) { this.set(ax, ay, r); if (ax === bx && ay === by) break; const e2 = 2 * er; if (e2 >= dy) { er += dy; ax += sx; } if (e2 <= dx) { er += dx; ay += sy; } }
  return this;
};
LP.disk = function (cx, cy, rad, r) {      /* absolute rig coords, no transform (limbs) */
  for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) { const dx = x + .5 - cx, dy = y + .5 - cy; if (dx * dx + dy * dy <= rad * rad) this.set(x, y, r); }
  return this;
};
/* stamp a round brush along a polyline [x,y,x,y,…] (absolute rig coords) from arc-length a to b */
LP.chain = function (pts, rad, r, a, b) {
  let acc = 0; a = a || 0; b = b == null ? 1e9 : b;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const x0 = pts[i], y0 = pts[i + 1], x1 = pts[i + 2], y1 = pts[i + 3], len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len * 2));
    for (let s = 0; s <= n; s++) { const d = acc + len * s / n; if (d < a || d > b) continue; const f = s / n; this.disk(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, rad, r); }
    acc += len;
  }
  return this;
};
LP.keep = function (o) { for (let i = 0; i < N; i++) if (!o.t[i]) this.t[i] = 0; return this; };   /* clip to another layer */
LP.cut = function (o) { for (let i = 0; i < N; i++) if (o.t[i]) this.t[i] = 0; return this; };
LP.copy = function (o) { this.t.set(o.t); this.x0 = o.x0; this.y0 = o.y0; this.x1 = o.x1; this.y1 = o.y1; return this; };
LP.shift = function (dx, dy) {              /* returns this shifted (used for under-hair shadow) */
  const n = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = this.t[y * W + x]; if (!v) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < W && ny >= 0 && ny < H) n[ny * W + nx] = v; }
  this.t = n; this.x0 += dx; this.x1 += dx; this.y0 += dy; this.y1 += dy; return this;
};
LP.replace = function (from, to) { for (let i = 0; i < N; i++) if (this.t[i] === from) this.t[i] = to; return this; };

/* ---------------------------------- paint: bevel + outline + grain into a Uint32 buffer ---------------------------------- */
/* o.ol  outline role (0 = none, default INK) · o.bev 0 flat | 1 shade low edges | 2 light top-left + shade low edges · o.grain hair streaks */
function paint(dst, L, roles, o) {
  o = o || {}; const t = L.t, ol = o.ol === undefined ? R.INK : o.ol, bv = o.bev === undefined ? 2 : o.bev, gr = o.grain | 0;
  if (L.x1 < 0) return dst;
  const x0 = Math.max(0, L.x0 - 1), x1 = Math.min(W - 1, L.x1 + 1), y0 = Math.max(0, L.y0 - 1), y1 = Math.min(H - 1, L.y1 + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x, r = t[i];
    if (!r) { if (ol && ((x > 0 && t[i - 1]) || (x < W - 1 && t[i + 1]) || (y > 0 && t[i - W]) || (y < H - 1 && t[i + W]))) dst[i] = roles[ol]; continue; }
    let c = r; const b = BEV[r];
    if (b && bv) {
      const up = y > 0 ? t[i - W] : 0, lf = x > 0 ? t[i - 1] : 0, dn = y < H - 1 ? t[i + W] : 0, rt = x < W - 1 ? t[i + 1] : 0, lo = !dn || !rt, hi = !up || !lf;
      if (lo && !hi) c = b[1]; else if (hi && !lo && bv === 2) c = b[0];
    }
    if (gr && c === R.HAIR) { const n = x * 7919 + (y >> 1) * 104729 + (x >> 1) * 31; const v = ((n ^ (n >> 5)) >>> 0) % gr; if (v === 0) c = R.HAIR_LO; else if (v === 1) c = R.HAIR_HI; }
    dst[i] = roles[c];
  }
  return dst;
}

/* ---------------------------------- trimmed sprites ---------------------------------- */
function trim(buf) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y * W + x] >>> 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { w: 0, h: 0, x: 0, y: 0, d: new Uint32Array(0) };
  const w = x1 - x0 + 1, h = y1 - y0 + 1, d = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = buf[(y0 + y) * W + x0 + x];
  return { w: w, h: h, x: x0 - OX, y: y0 - OY, d: d };      /* x,y = rig coords of the top-left pixel */
}
function blit(dst, s, dx, dy, flip) {
  if (!s || !s.w) return;
  for (let y = 0; y < s.h; y++) { const row = OY + s.y + dy + y; if (row < 0 || row >= H) continue;
    for (let x = 0; x < s.w; x++) { const p = s.d[y * s.w + x]; if (!(p >>> 24)) continue; const col = OX + s.x + dx + x; if (col < 0 || col >= W) continue; dst[row * W + col] = p; } }
}

/* ---------------------------------- bounded LRU ---------------------------------- */
function LRU(max) { this.max = max; this.m = new Map(); }
LRU.prototype.get = function (k) { const v = this.m.get(k); if (v !== undefined) { this.m.delete(k); this.m.set(k, v); } return v; };
LRU.prototype.set = function (k, v) { this.m.set(k, v); if (this.m.size > this.max) this.m.delete(this.m.keys().next().value); return v; };
LRU.prototype.clear = function () { this.m.clear(); };
Object.defineProperty(LRU.prototype, 'size', { get: function () { return this.m.size; } });

const SCR = [new Layer(), new Layer(), new Layer()];   /* scratch layers: no per-part allocation */

/* ======================================================================================
   PART LIBRARY — every part is a small shape program on a Layer (role numbers, not colours).
   Head-local space: origin = skull centre, y down; skull ≈ 22 wide × 21 tall, eyes rows 3‥6.
   ====================================================================================== */
const EY = 3, MY = 8;                       /* eye top row, mouth top row (head-local) */
const AL = { k: 'INK', i: 'IRIS', I: 'IRIS_HI', w: 'WHITE', s: 'SCLERA', y: 'GOLD', p: 'PINK', m: 'MOUTH', l: 'SKIN_LO', r: 'RED', c: 'CYAN', g: 'GRAY', d: 'DARK', b: 'BLUSH', t: 'GREEN' };
function art(L, rows, x, y, look, skipCols) {            /* draw ASCII rows at head-local (x,y); look shifts pupil letters */
  for (let j = 0; j < rows.length; j++) for (let i = (skipCols || 0); i < rows[j].length; i++) {
    const ch = rows[j][i]; if (ch === '.' || ch === ' ') continue; const r = R[AL[ch]]; if (!r) continue;
    const shift = look && 'iIw'.indexOf(ch) >= 0 ? look : 0;
    L.px(x + i + shift - (skipCols || 0), y + j, r);
  }
}
const mirrorRows = rows => rows.map(s => s.split('').reverse().join(''));
/* ---- eyes: art for the LEFT eye (inner edge = last column); right eye is mirrored unless same:true ---- */
const EYES = [
  { a: ['....', '.kk.', '.kk.', '....'] },                                  /* 0 dots */
  { a: ['.ww.', 'wkkw', 'wkkw', '.ww.'] },                                  /* 1 white + pupil */
  { a: ['....', '.kk.', 'k..k', '....'], c: 1 },                            /* 2 happy ^ */
  { a: ['....', 'k..k', '.kk.', '....'], c: 1 },                            /* 3 sleepy u */
  { a: ['.y..', 'yyy.', '.y..', '....'], same: 1 },                          /* 4 star */
  { a: ['.p.p.', 'ppppp', '.ppp.', '..p..'], w5: 1 },                        /* 5 heart */
  { a: ['.kk.', 'kwkk', 'kkkk', '.kk.'] },                                  /* 6 big shiny */
  { a: ['....', '.kk.', '.kk.', '....'], wink: 1 },                         /* 7 wink */
  { a: ['.yy.', 'yyky', 'yyky', '.yy.'] },                                  /* 8 cat slit */
  { a: ['.kk.', 'kwwk', 'kwkk', '.kk.'] },                                  /* 9 wide */
  { a: ['kk..', '.kkk', '.kk.', '....'], same: 0 },                          /* 10 determined */
  { a: ['k..k', '.kk.', '.kk.', 'k..k'] },                                  /* 11 x */
  { a: ['kkkkk', 'iwiii', 'iiiii', '.sss.'], same: 1 },                     /* 12 chibi (default) */
  /* appended — never reorder: saved codes index into this list */
  { a: ['k....', 'kkkkk', 'iwiii', '.iii.'] },                              /* 13 lashes: a flick at the outer corner */
  { a: ['....', 'kkkk', 'iwii', '.ii.'] },                                  /* 14 calm half-lid */
  { a: ['.kkk.', 'kiwik', 'kiiik', '.kkk.'], same: 1 }                      /* 15 round, bright */
];
const CLOSED = ['....', '....', 'kkkk', '....'];
function drawEyes(L, st, v, ex) {
  const E = EYES[st] || EYES[12], blink = ex.blink || ex.cl, look = ex.look | 0;
  let a = blink && !E.c ? CLOSED : E.a;
  const wid = a[0].length, top = EY - (E.w5 ? 0 : 0);
  if (v === 1) {                                              /* three-quarter: near eye full, far eye 3 px */
    art(L, a, -3, top, look); const far = E.same ? a : mirrorRows(a); art(L, far, 4 + (wid - 4), top, look, 1);
    if (E.wink && !blink) art(L, CLOSED, 4, top, 0);
    return;
  }
  const lx = -2 - wid;                                         /* left eye: inner edge at x=-2 */
  art(L, a, lx, top, look);
  let ra = E.same ? a : mirrorRows(a);
  if (E.wink && !blink) ra = CLOSED;
  art(L, ra, 2, top, look);
}
/* ---- brows ---- */
const BROWS = [null, ['kkkk'], ['.kk.', 'k..k'], ['k...', '.kkk'], ['...k', 'kkk.'], ['kkkk', 'kkkk'], ['...kk', 'kkk..'], ['kk...', '..kkk']];   /* 6 worried, 7 stern (appended) */
function drawBrows(L, st, v, ex) {
  const a = BROWS[st]; if (!a) return; const y = ex.brow ? -1 : 0, wid = a[0].length;
  const l = a, rr = st >= 3 && st !== 5 ? mirrorRows(a) : a;   /* asymmetric brows (3,4,6,7) mirror to the other side */
  if (v === 1) { art(L, l, -3, y); art(L, rr, 4 + (wid - 4), y, 0, 1); return; }
  art(L, l, -2 - wid, y); art(L, rr, 2, y);
}
/* ---- mouths (centred on x=0, or on the face centre in 3/4 view) ---- */
const MOUTHS = [
  ['k..k', '.kk.'], ['kkkk', 'kwwk', '.kk.'], ['.mm.', 'm..m', '.mm.'], ['kkkk'], ['..kk', '.k..'],
  ['k..k', '.kk.', '.pp.'], ['mm', 'mm'], ['k.k.', '.k.k'], ['k..k', '.kk.', 'w..w'], ['kkkk', 'wkww', '.kk.'], ['.ll.'],
  ['...kk', '.kk..'], ['k....k', '.kkkk.'], ['kk']                                  /* 11 smirk, 12 wide gentle smile, 13 neutral dot (appended) */
];
const MOUTH_OPEN = ['.kkkk.', 'kmmmmk', '.kmmk.'], MOUTH_O = ['.kk.', 'kmmk', '.kk.'], MOUTH_BIG = ['kkkkkk', 'kwwwwk', '.kmmk.'], MOUTH_SLEEP = ['.kk.'];
function drawMouth(L, st, v, ex) {
  const a = ex.mo === 1 ? MOUTH_OPEN : ex.mo === 2 ? MOUTH_O : ex.mo === 3 ? MOUTH_BIG : ex.mo === 4 ? MOUTH_SLEEP : MOUTHS[st] || MOUTHS[10];
  const wid = a[0].length, cx = v === 1 ? 4 : 0;
  art(L, a, cx - Math.round(wid / 2), MY + (ex.mo === 4 ? 1 : 0));
}

/* ---- head shapes (skin) + metadata used by hats / extras ---- */
function rrect(L, x, y, w, h, r, role) { L.rect(x + r, y, w - 2 * r, h, role); L.rect(x, y + r, w, h - 2 * r, role); [[x + r, y + r], [x + w - r, y + r], [x + r, y + h - r], [x + w - r, y + h - r]].forEach(c => L.ell(c[0], c[1], r, r, role)); }
const HM = [{ top: -10, rx: 11, ear: 12 }, { top: -11, rx: 10, ear: 11 }, { top: -9.5, rx: 12, ear: 13 }, { top: -10, rx: 11, ear: 12 }, { top: -10, rx: 11, ear: 15 }];
function skull(L, hd) {
  switch (hd) {
    case 1: L.ell(0, 0, 10, 11, R.SKIN); break;
    case 2: L.ell(0, 0, 12, 9.5, R.SKIN); break;
    case 3: rrect(L, -11, -10, 22, 20, 5, R.SKIN); break;
    case 4: L.ell(0, -1, 11, 9, R.SKIN); L.poly([-9, 3, 9, 3, 3, 10.5, -3, 10.5], R.SKIN); break;
    default: L.ell(0, 0, 11, 10.5, R.SKIN);
  }
}
function ears(L, hd, v, back) {
  if (v === 1) { if (!back) { L.rect(-5.5, 1, 3, 4, R.SKIN); L.px(-4, 2, R.SKIN_LO); L.px(-4, 3, R.SKIN_LO); } return; }
  if (!back) return;
  if (hd === 4) { L.poly([-10, 0, -15.5, -5, -11, 4], R.SKIN); L.poly([10, 0, 15.5, -5, 11, 4], R.SKIN); return; }
  const e = HM[hd].ear; L.rect(-e, 0.5, 2, 4, R.SKIN); L.rect(e - 2, 0.5, 2, 4, R.SKIN); L.px(-e + .5 | 0, 2, R.SKIN_LO); L.px(e - 2, 2, R.SKIN_LO);
}

/* ---- hair styles ---- */
function capShape(L, e, fy, sy, role) {
  L.ell(0, 0, 11 + e, 10 + e, role);
  L.rect(-16, sy, 32, 30, 0);                     /* nothing below the sideburn line */
  L.rect(-8.5, fy, 17, 30, 0);                    /* nothing below the fringe line in the centre */
}
function spikesUp(L, xs, hs, base, w, role) { xs.forEach((x, i) => L.poly([x - w, base, x + w, base, x + (i % 2 ? .5 : -.5), base - hs[i]], role)); }
function spikesDown(L, xs, ys, y0, w, role) { xs.forEach((x, i) => L.poly([x - w, y0, x + w, y0, x + ((i % 3) - 1) * .7, ys[i]], role)); }
function puffs(L, pts, r, role) { pts.forEach(p => L.ell(p[0], p[1], r, r, role)); }
const HAIR = [];
HAIR[0] = { lift: 0 };
HAIR[1] = { lift: 1, cap: [.6, -1, 2] };
HAIR[2] = { lift: 2, cap: [1.8, -1, 3], fuzz: 1 };
HAIR[3] = { lift: 1, cap: [.6, -2, 2], fringe: L => L.poly([-10, -3, 3, -10, 10, -6, 10.5, 1, 6, -1.5, -2, -2], R.HAIR) };
HAIR[4] = { lift: 4, cap: [.6, -2, 3], top: L => puffs(L, [[-6, -11], [0, -13], [6, -11], [-10, -7], [10, -7]], 4, R.HAIR) };
HAIR[5] = { lift: 6, cap: [.6, -2, 3], back: L => L.ell(0, -4, 16.5, 15.5, R.HAIR), top: L => { L.ell(0, -5, 15, 14, R.HAIR); L.rect(-16, 3, 32, 30, 0); L.rect(-8.5, -2, 17, 30, 0); } };
HAIR[6] = { lift: 1, cap: [.6, -2, 3], back: (L, v) => { L.rect(-12.5, -8, 25, 28, R.HAIR); L.ell(0, 20, 12.5, 3, R.HAIR); }, fringe: L => L.rect(-9, -2, 18, 2, R.HAIR) };
HAIR[7] = { lift: 1, cap: [.6, -2, 3], back: L => { L.rect(-12.5, -8, 25, 16, R.HAIR); L.ell(0, 8, 12.5, 3, R.HAIR); }, fringe: L => L.rect(-9.5, -2, 19, 3, R.HAIR) };
HAIR[8] = { lift: 1, cap: [.6, -2, 3], back: (L, v) => { L.rect(-12.5, -8, 12, 14, R.HAIR); }, top: L => { L.poly([8, -6, 15, -4, 17, 10, 12, 18, 11, 8], R.HAIR); } };
HAIR[9] = { lift: 5, cap: [.6, -2, 2], top: L => puffs(L, [[-9, -11], [9, -11]], 4.5, R.HAIR) };
HAIR[10] = { lift: 6, cap: [-.5, -4, 0], top: L => { L.rect(-2.5, -17, 5, 9, R.HAIR); } };
HAIR[11] = { lift: 6, cap: [.6, -2, 2], top: L => spikesUp(L, [-6, 0, 6], [6, 8, 6], -8.5, 3.6, R.HAIR) };
HAIR[12] = { lift: 2, cap: [.6, -2, 2], fringe: L => L.poly([-10, -3, -4, -9.5, 6, -9, 10.5, -3, 10.5, 1, 4, -3, -3, -1], R.HAIR) };
HAIR[13] = { lift: 1, cap: [.6, -2, 3], back: L => { L.rect(-12.5, -8, 25, 22, R.HAIR); L.rect(-13, 14, 4, 12, R.HAIR); L.rect(9, 14, 4, 12, R.HAIR); } };
HAIR[14] = { lift: 3, cap: [.6, -2, 2], top: L => puffs(L, [[-8, -10], [-4, -12], [0, -12.5], [4, -12], [8, -10], [-11, -6], [11, -6]], 2.8, R.HAIR) };
HAIR[15] = { lift: 1, cap: [.6, -2, 2], fringe: L => { L.poly([-10, -3, -1, -4, -3, 2, -7, 1], R.HAIR); L.poly([10, -3, 1, -4, 3, 2, 7, 1], R.HAIR); } };
HAIR[16] = { lift: 6, cap: [.6, -2, 2], top: L => L.ell(0, -14.5, 5, 4.5, R.HAIR) };
HAIR[17] = { lift: 1, cap: [.6, -2, 2], back: L => { L.poly([-11, -6, -15, -2, -17, 8, -14, 16, -12.5, 6, -10, 0], R.HAIR); L.poly([11, -6, 15, -2, 17, 8, 14, 16, 12.5, 6, 10, 0], R.HAIR); } };
HAIR[18] = { lift: 1, cap: [.6, -2, 3], back: L => { L.rect(-12.5, -8, 25, 18, R.HAIR); L.ell(0, 10, 12.5, 3, R.HAIR); }, fringe: L => { L.rect(-9, -2, 5, 1, R.HAIR); L.rect(4, -2, 5, 1, R.HAIR); } };
HAIR[19] = { lift: 1, cap: [.6, -2, 3], fringe: L => L.rect(-11, -5, 22, 2, R.HAIR_LO) };
HAIR[20] = { lift: 3, cap: [.6, -2, 2], fringe: L => { L.poly([-10, -3, -2, -9, 9, -7, 10.5, -3, 4, -2, -6, 1], R.HAIR); }, top: L => L.poly([9, -5, 16, -8, 12, 2], R.HAIR) };
HAIR[21] = { lift: 1, cap: [.6, -2, 3], back: L => { L.rect(-12.5, -8, 25, 16, R.HAIR); L.poly([-9, 8, -15, 20, -7, 14], R.HAIR); } };
/* NEW 22 — messy spikes (the reference character) */
HAIR[22] = { lift: 4, cap: [.7, -.5, 3.5], top: L => {
  spikesUp(L, [-8.5, -4.5, 0, 4.5, 8.5], [4, 5.5, 6.5, 5, 3.5], -9, 3.2, R.HAIR);
  L.poly([-11.5, -3, -14.5, -1.5, -11.5, 2], R.HAIR); L.poly([11.5, -4, 15, -3, 11.5, 1], R.HAIR);
}, fringe: L => { spikesDown(L, [-8, -4.2, -.5, 3.4, 7.2], [2.5, 1.8, 1, 2.2, 2.8], -1.5, 2.4, R.HAIR); } };
/* NEW 23 — shaggy side fringe */
HAIR[23] = { lift: 2, cap: [1, -1, 3], top: L => spikesUp(L, [-5, 1, 7], [3, 4, 3], -9, 3.2, R.HAIR), fringe: L => L.poly([-11, -4, 2, -9, 11, -6, 10.5, 4, 7, 1, 5, 5, 2, 0, -2, 3, -6, 1, -9, 2], R.HAIR) };
/* appended 24‥29: distinct silhouettes, not recolours */
HAIR[24] = { lift: 7, cap: [.6, -2, 2], top: L => { L.ell(0, -16, 4.8, 4.4, R.HAIR); L.rect(-4, -12, 8, 1.6, R.HAIR_LO); }, fringe: L => L.poly([-10, -3, -3, -8, 8, -8, 10.5, -3, 10.5, 1, 4, -2, -4, -1], R.HAIR) };            /* top bun */
HAIR[25] = { lift: 1, cap: [.6, -2, 3], back: L => { [-1, 1].forEach(s => { for (let i = 0; i < 5; i++) L.ell(s * 13.5, 5 + i * 4.8, 2.7 - i * .2, 2.6, R.HAIR); L.rect(s * 13.5 - 1, 28, 2, 2, R.GOLD); }); }, fringe: L => L.poly([-10, -3, -1, -9, 10, -4, 10.5, 1, 3, -2, -5, 0], R.HAIR) };   /* twin braids */
HAIR[26] = { lift: 7, cap: [1.8, -2, 3], fuzz: 1, top: L => puffs(L, [[-12, -7], [-7, -14], [0, -17], [7, -14], [12, -7], [-14, 0], [14, 0], [-4, -16], [4, -16]], 5.2, R.HAIR) };                                  /* round cloud */
HAIR[27] = { lift: 7, cap: [-.5, -4, 0], top: L => { L.poly([-3.5, -8, -1.5, -20, 0, -24, 1.5, -20, 3.5, -8], R.HAIR); L.rect(-.6, -22, 1.2, 12, R.HAIR_HI); }, fringe: L => L.rect(-1.8, -7, 3.6, 5, R.HAIR) };      /* undercut fin */
HAIR[28] = { lift: 1, cap: [.6, -2, 3], back: L => { L.rect(-12.5, -8, 25, 24, R.HAIR); L.poly([-12.5, 16, -9, 22, -5, 16, -1, 22, 3, 16, 7, 22, 12.5, 16], R.HAIR); }, fringe: L => L.poly([-10.5, -3, -3, -9.5, 9, -7, 10.5, -1, 6, -2, -1, -4, -6, 0], R.HAIR) };      /* long wavy, side part */
HAIR[29] = { lift: 5, cap: [.6, -2, 2], top: L => { [-1, 1].forEach(s => { L.ell(s * 13, -6, 3.4, 3.4, R.HAIR); L.poly([s * 11, -4, s * 17, 2, s * 13.5, 13, s * 10, 3], R.HAIR); L.rect(s * 11.2 - 1.5, -8.5, 3, 1.6, R.GOLD); }); }, fringe: L => L.rect(-10.5, -4, 21, 2.5, R.HAIR) };   /* high pigtails */
const HAIR_N = HAIR.length;
function hairFront(L, st, v) {            /* cap + top + fringe into L (design space already set) */
  const H = HAIR[st]; if (!H || !H.cap) { if (H && H.top) H.top(L); return; }
  const c = H.cap; capShape(L, c[0], v === 2 ? 12 : c[1], v === 2 ? 12 : c[2], R.HAIR);
  if (H.top) H.top(L); if (H.fringe && v !== 2) H.fringe(L);
}
function hairBack(L, st, v) { const H = HAIR[st]; if (H && H.back) H.back(L, v); }

/* ---- hats: (L, t, v) — t = top of the hair in head-local space ---- */
const HATS = [null,
  (L, t) => { L.ell(0, t + 7, 12, 8, R.ACC); L.rect(-14, t + 9, 28, 10, 0); L.rect(-12.5, t + 7, 25, 2.5, R.ACC_LO); L.ell(0, t - .5, 2.4, 2.4, R.WHITE); },
  (L, t, v) => { L.ell(0, t + 7, 11.5, 7.5, R.ACC); L.rect(-14, t + 8.5, 28, 10, 0); if (v === 1) L.poly([3, t + 8, 16, t + 9.5, 3, t + 11], R.ACC_LO); else L.rect(-9, t + 8, 18, 2.5, R.ACC_LO); },
  (L, t) => { L.ell(0, t + 7, 11, 6.5, R.ACC); L.rect(-14, t + 8, 28, 10, 0); L.ell(0, t + 8.5, 15.5, 3, R.ACC_LO); L.ell(0, t + 8, 12, 1.6, R.ACC); },
  (L, t) => { L.poly([-9, t + 9, 9, t + 9, 2, t - 15], R.ACC); L.ell(0, t + 9, 14, 3, R.ACC_LO); L.px(1, t, R.GOLD); L.px(-2, t + 4, R.GOLD); },
  (L, t) => { L.poly([-9, t + 9, -9, t + 1, -5, t + 5, 0, t - 1.5, 5, t + 5, 9, t + 1, 9, t + 9], R.GOLD); L.px(-5, t + 7, R.PINK); L.px(0, t + 6, R.CYAN); L.px(4, t + 7, R.GREEN); },
  (L, t) => { L.rect(-8, t - 4, 16, 13, R.NAVY); L.rect(-8, t + 5, 16, 3, R.ACC); L.ell(0, t + 9, 13, 2.6, R.NAVY); },
  (L, t) => { L.ell(1, t + 7, 13, 5.5, R.ACC); L.rect(-16, t + 9.5, 34, 6, 0); L.px(1, t + 1, R.ACC_LO); },
  (L, t) => { L.poly([-11, t + 9, -10, t - 3, -2, t + 4], R.ACC); L.poly([11, t + 9, 10, t - 3, 2, t + 4], R.ACC); L.poly([-9.5, t + 4, -9.2, t, -6, t + 3], R.PINK); L.poly([9.5, t + 4, 9.2, t, 6, t + 3], R.PINK); },
  (L, t) => { L.ell(-6, t - 4, 3, 8, R.ACC); L.ell(6, t - 4, 3, 8, R.ACC); L.ell(-6, t - 3, 1.3, 5.5, R.PINK); L.ell(6, t - 3, 1.3, 5.5, R.PINK); },
  (L, t) => { [[-1, 1], [1, -1]].forEach(s => { const x = s[0] * 7; L.line(x, t + 7, x + s[0] * 2.5, t - 6, R.WOOD); L.line(x + s[0] * 2, t - 1, x + s[0] * 6, t - 3, R.WOOD); L.line(x + s[0] * 2.5, t - 6, x + s[0] * 5, t - 9, R.WOOD); }); },
  (L, t) => { L.ell(0, t - 3, 9, 2.7, R.GOLD); L.ell(0, t - 3, 6.2, 1.2, 0); },
  (L, t) => { L.poly([-9, t + 9, 9, t + 9, 2, t - 14], R.ACC); L.ell(2, t - 14, 2.4, 2.4, R.WHITE); L.rect(-6, t + 3, 12, 1.5, R.WHITE); L.rect(-8, t + 7, 16, 2, R.WHITE); },
  (L, t) => { L.ell(0, 0, 15, 14, R.GRAY_HI); L.ell(0, 0, 13, 12, 0); L.px(-9, -9, R.WHITE); L.px(-8, -8, R.WHITE); L.rect(-5, t - 2.5, 10, 2, R.GRAY); },
  (L, t) => { L.ell(0, t + 7, 11.5, 7, R.NAVY); L.rect(-14, t + 8.5, 28, 10, 0); L.rect(-2, t + 4, 4, 3, R.WHITE); L.px(-1, t + 5, R.INK); L.px(1, t + 5, R.INK); L.poly([8, t + 8, 14, t + 12, 9, t + 12], R.NAVY); },
  (L, t) => { L.rect(-11.5, t + 8, 23, 3, R.ACC); L.ell(5, t + 9.5, 1.7, 1.7, R.GOLD); },
  (L, t) => { L.ell(-8, t + 8, 2.6, 2.6, R.PINK); L.ell(-3, t + 6, 2.4, 2.4, R.ACC); L.ell(2, t + 5, 2.2, 2.2, R.PINK); L.px(-8, t + 8, R.GOLD); L.px(-3, t + 6, R.GOLD); L.poly([-6, t + 10, -4, t + 7.5, -3, t + 10.5], R.GREEN); },
  (L, t) => { [[-1, 1], [1, 1]].forEach(s => { const x = s[0]; L.ell(x * 10.5, t + 9, 1.8, 2.6, R.GREEN); L.ell(x * 11.4, t + 13, 1.8, 2.6, R.GREEN); L.ell(x * 9.4, t + 5, 1.6, 2.4, R.GREEN); }); },
  /* appended 18‥21 */
  (L, t) => { L.ell(0, t + 9, 12.8, 10.5, R.DARK); L.ell(0, t + 9, 11.2, 9, 0); L.rect(-16, t + 11, 32, 12, 0); L.rect(-15, t + 6, 4.2, 9, R.ACC); L.rect(-14.2, t + 7, 1.2, 6, R.ACC_HI); L.rect(10.8, t + 6, 4.2, 9, R.ACC); L.rect(12, t + 7, 1.2, 6, R.ACC_HI); },            /* 18 headphones */
  (L, t) => { L.ell(-1, t + 7, 12.5, 5.2, R.ACC); L.rect(-15, t + 9, 30, 8, 0); L.poly([-12, t + 8.5, 9, t + 8.5, 14, t + 11.5, -12, t + 11.5], R.ACC_LO); L.px(-1, t + 2, R.ACC_HI); L.px(-1, t + 1, R.ACC_LO); },                                        /* 19 flat cap */
  (L, t) => { L.ell(0, t + 6.5, 11.2, 7.2, R.GOLD); L.rect(-14, t + 8, 28, 10, 0); L.rect(-1.8, t - 2, 3.6, 8, R.GOLD_LO); L.ell(0, t + 9, 14.5, 2.6, R.GOLD_LO); L.rect(-12, t + 7, 24, 1.4, R.GOLD_LO); },                                                   /* 20 hard hat */
  (L, t) => { L.ell(0, t + 8, 9, 4.2, R.NAVY); L.rect(-12, t + 9, 24, 8, 0); L.poly([-15, t + 3, 0, t - 3, 15, t + 3, 0, t + 8.5], R.NAVY); L.poly([-12, t + 3, 0, t - 1.5, 12, t + 3, 0, t + 6], R.NAVY_HI); L.line(12, t + 3.2, 13.5, t + 11, R.GOLD); L.ell(13.6, t + 12, 1.4, 1.8, R.GOLD); }      /* 21 mortarboard */
];
const HAT_N = HATS.length;

/* ---- extras (face / head accessories). layer: 0 = on the face (under hair), 1 = over the hair ---- */
function lensBoxes(v) { return v === 1 ? [[-4, 6], [3, 5]] : [[-8, 6], [2, 6]]; }
function ringBox(L, x, y, w, h, r) { L.rect(x, y, w, 1, r); L.rect(x, y + h - 1, w, 1, r); L.rect(x, y, 1, h, r); L.rect(x + w - 1, y, 1, h, r); }
const EXTRAS = [null,
  { l: 0, f: (L, v) => { lensBoxes(v).forEach(b => ringBox(L, b[0], 1, b[1], 5, R.INK)); L.rect(v === 1 ? 2 : -2, 2, v === 1 ? 1 : 4, 1, R.INK); } },
  { l: 0, f: (L, v) => { const x = v === 1 ? -5 : -9.5, w = v === 1 ? 15 : 19; L.rect(x, 1, w, 5, R.DARK); L.rect(x + 1, 2, Math.round(w / 3), 1, R.CYAN); } },
  { l: 0, f: (L, v) => { const b = lensBoxes(v)[1]; ringBox(L, b[0], 1, b[1], 5, R.GOLD); L.line(b[0] + b[1] - 1, 6, b[0] + b[1], 12, R.GOLD); } },
  { l: 0, f: (L, v) => { const x = v === 1 ? -3 : -7; L.rect(x, 1, 5, 5, R.DARK); L.line(-10, -3, 10, 0, R.DARK); } },
  { l: 0, f: (L, v) => { const x = v === 1 ? -4 : -9, w = v === 1 ? 14 : 18; L.rect(x, 6.5, w, 5, R.COAT); L.rect(x, 8.5, w, 1, R.COAT_LO); } },
  { l: 1, f: (L, v) => { L.ell(0, 0, 13.5, 13, R.GRAY_LO); L.ell(0, 0, 11.7, 11.2, 0); L.rect(-16, 1, 32, 20, 0); const c = v === 1 ? [[-8, 4]] : [[-14.5, 4], [10.5, 4]]; c.forEach(p => { L.rect(p[0], p[1] - 3, 4, 7, R.DARK); L.rect(p[0] + 1, p[1] - 2, 2, 5, R.GRAY_LO); }); } },
  { l: 0, f: (L, v) => { if (v === 1) { L.px(-5, 5, R.GOLD); L.px(-5, 6, R.GOLD); } else { L.px(-12, 5, R.GOLD); L.px(-12, 6, R.GOLD); L.px(11, 5, R.GOLD); L.px(11, 6, R.GOLD); } } },
  { l: 0, f: (L, v) => L.line(v === 1 ? 4 : 3, -1, v === 1 ? 6 : 5, 5, R.RED) },
  { l: 0, f: (L, v) => { const o = v === 1 ? 3 : 0; [[-8, 6], [-6, 7], [-9, 7], [6, 6], [8, 7], [4, 7]].forEach(p => L.px(p[0] + o, p[1], R.SKIN_OL)); } },
  { l: 0, f: (L, v) => { const o = v === 1 ? 3 : 0; L.rect(-8 + o, 6, 3, 1, R.BLUSH); L.rect(5 + o - (v === 1 ? 2 : 0), 6, 3, 1, R.BLUSH); } },
  { l: 0, f: (L, v) => { const x = v === 1 ? 5 : 1; L.rect(x, 5, 5, 2, R.COAT); L.px(x + 2, 4, R.COAT); L.px(x + 2, 7, R.COAT); } },
  { l: 1, f: (L, v) => { const x = v === 1 ? 1 : -2; L.poly([x + 2, -6, x + 3, -3.5, x + 5.5, -3.5, x + 3.5, -2, x + 4.2, .5, x + 2, -1, x - .2, .5, x + .5, -2, x - 1.5, -3.5, x + 1, -3.5], R.GOLD); } },
  { l: 0, f: (L, v) => { const x = v === 1 ? -5 : -10, w = v === 1 ? 15 : 20; L.rect(x, 0, w, 7, R.DARK); L.rect(x + 1, 1, w - 2, 5, R.CYAN); L.rect(x + 2, 1, Math.round(w / 3), 1, R.WHITE); } },
  { l: 1, f: (L, v, t) => { L.line(0, t + 1, 0, t - 7, R.GRAY_LO); L.ell(0, t - 8, 2, 2, R.PINK); } },
  { l: 0, f: (L, v) => { const o = v === 1 ? 3 : 0; L.rect(-4 + o, 6, 8, 1, R.HAIR_LO); L.px(-5 + o, 7, R.HAIR_LO); L.px(4 + o, 7, R.HAIR_LO); } },
  /* appended 16‥19 */
  { l: 0, f: (L, v) => { const o = v === 1 ? 3 : 0; L.rect(-3 + o, 4, 7, 2, R.COAT_HI); L.px(-1 + o, 4, R.COAT_LO); L.px(1 + o, 5, R.COAT_LO); L.px(-3 + o, 4, R.SKIN_OL); L.px(3 + o, 5, R.SKIN_OL); } },                                                           /* 16 nose plaster */
  { l: 0, f: (L, v) => { const o = v === 1 ? 3 : 0; L.line(-9 + o, 5, -6 + o, 6, R.RED); L.line(-9.5 + o, 7, -6.5 + o, 8, R.RED); L.line(6 + o, 6, 9 + o - (v === 1 ? 2 : 0), 5, R.RED); L.line(6.5 + o, 8, 9.5 + o - (v === 1 ? 2 : 0), 7, R.RED); } },       /* 17 cheek stripes */
  { l: 0, f: (L, v) => { const x = v === 1 ? -4 : -9, w = v === 1 ? 14 : 18; L.rect(x, 7.5, w, 5, R.RED); L.rect(x, 7.5, w, 1, R.WHITE); L.px(x + 3, 10, R.WHITE); L.px(x + 8, 9, R.WHITE); L.px(x + 12 > x + w - 1 ? x + w - 2 : x + 12, 10, R.WHITE); } },  /* 18 bandana (lower face) */
  { l: 1, f: (L, v) => { const x = v === 1 ? 8 : 11; L.poly([x, -6, x + 1.6, -3, x, -.8, x - 1.6, -3], R.CYAN); L.px(x - .4, -4, R.WHITE); } }                                                                                                                   /* 19 sweat drop */
];
const EXTRA_N = EXTRAS.length;

/* ---- outfits (tops). Drawn in torso space: x -6‥6, y -21‥-11. base = role of the garment. ---- */
const TOP_Y0 = -21, TOP_Y1 = -11;
const OUTFITS = [
  { b: 'OUT', s: 's', f: L => { L.rect(-3, -21, 6, 1, R.OUT_LO); L.rect(-2, -20, 4, 1, R.OUT_LO); } },
  { b: 'OUT', s: 'l', f: L => { L.rect(-4, -22, 8, 2, R.OUT_LO); L.rect(-4.5, -16, 9, 3.5, R.OUT_LO); L.px(-2, -19, R.WHITE); L.px(-2, -18, R.WHITE); L.px(1, -19, R.WHITE); L.px(1, -18, R.WHITE); } },
  { b: 'COAT', s: 'l', sr: 'COAT', f: L => { L.poly([-4, -21, 0, -15, -1, -21], R.COAT_LO); L.poly([4, -21, 0, -15, 1, -21], R.COAT_LO); L.rect(2, -17, 3, 3, R.COAT_LO); L.px(3, -16, R.OUT); L.px(0, -14, R.GRAY); L.px(0, -12, R.GRAY); } },
  { b: 'COAT', s: 'l', sr: 'COAT', f: L => { L.rect(-5, -21, 10, 1, R.OUT); L.rect(-3, -17, 6, 3, R.GRAY); L.px(-2, -16, R.CYAN); L.px(1, -16, R.GOLD); L.rect(-6, -12, 12, 1, R.OUT); } },
  { b: 'OUT', s: 's', cape: 1, f: L => { L.px(-1, -20, R.GOLD); L.px(0, -20, R.GOLD); L.rect(-3, -21, 6, 1, R.OUT_LO); } },
  { b: 'OUT', s: 's', f: L => { L.poly([-2.5, -21, 0, -16, 2.5, -21], R.WHITE); L.rect(-6, -13, 12, 1.5, R.GOLD); } },
  { b: 'GRAY', s: 'c', sr: 'GRAY', f: L => { L.rect(-.5, -20, 1, 9, R.GRAY_LO); L.rect(-4, -18, 3, 2, R.GRAY_HI); L.rect(1, -18, 3, 2, R.GRAY_HI); L.rect(-6, -12, 12, 1, R.GRAY_LO); } },
  { b: 'NAVY', s: 'l', sr: 'NAVY', f: L => { L.poly([-3, -21, 0, -14, 3, -21], R.WHITE); L.poly([-.8, -20, .8, -20, 1.4, -14.5, 0, -13, -1.4, -14.5], R.OUT); } },
  { b: 'OUT', s: 's', flare: 1, f: L => { L.rect(-.5, -20, 1, 9, R.OUT_LO); L.poly([-3, -21, 0, -17, 3, -21], R.OUT_HI); } },
  { b: 'BLUE', s: 's', sr: 'COAT', f: L => { L.rect(-3.5, -16.5, 7, 6, R.OUT); L.rect(-4, -21, 1.5, 5, R.BLUE_LO); L.rect(2.5, -21, 1.5, 5, R.BLUE_LO); L.px(-3, -16, R.GOLD); L.px(2, -16, R.GOLD); L.rect(-5, -21, 10, 3, R.COAT); } },
  { b: 'COAT', s: 's', sr: 'COAT', f: L => { L.poly([-3, -21, 0, -15, 3, -21], R.OUT); L.poly([0, -15, -1.8, -11.5, 1.8, -11.5], R.OUT); } },
  { b: 'OUT', s: 'l', f: L => { L.rect(-4, -17, 8, 4, R.OUT_LO); L.rect(-3, -15, 6, 1, R.WHITE); L.ell(0, -20.3, 2.8, 1.6, R.OUT_LO); } },
  { b: 'OUT', s: 'l', f: L => { L.rect(-.5, -20, 1, 9, R.COAT_HI); L.rect(-4.5, -16.5, 3, 3, R.OUT_LO); } },
  { b: 'OUT', s: 'l', flare: 1, f: L => { L.poly([-6, -20, 0, -13, 6, -20, 3.5, -20, 0, -16, -3.5, -20], R.OUT_LO); L.rect(-1.5, -16, 3, 5, R.GOLD); } },
  { b: 'NAVY', s: 'l', sr: 'NAVY', f: L => { L.poly([-4, -21, 4, -21, 6, -16, 0, -13, -6, -16], R.OUT); } },
  { b: 'OUT', s: 's', f: L => { L.poly([0, -18, 1.2, -15.5, 3.8, -15.2, 1.8, -13.5, 2.4, -11.2, 0, -12.5, -2.4, -11.2, -1.8, -13.5, -3.8, -15.2, -1.2, -15.5], R.GOLD); } },
  { b: 'OUT', s: 's', f: L => { L.rect(-6, -18, 12, 1, R.WHITE); L.rect(-6, -15, 12, 1, R.WHITE); L.rect(-6, -12, 12, 1, R.WHITE); L.rect(-3, -21, 6, 1, R.WHITE); } },
  { b: 'OUT', s: 'l', flare: 1, f: L => { L.rect(-.5, -20, 1, 9, R.OUT_LO); L.poly([-5, -21, 0, -15, 5, -21, 3, -21, 0, -18, -3, -21], R.OUT_HI); } },
  /* appended 18‥23 — each changes the silhouette or the garment structure, not just the colour */
  { b: 'OUT', s: 'l', f: L => { L.rect(-5.5, -22, 11, 2.4, R.OUT_LO); L.rect(-4, -15.5, 8, 3.5, R.OUT_LO); L.rect(-4, -15.5, 8, 1, R.OUT_HI); L.px(-1.6, -19, R.WHITE); L.px(-1.6, -18, R.WHITE); L.px(1.6, -19, R.WHITE); L.px(1.6, -18, R.WHITE); L.rect(-6, -12, 12, 1, R.OUT_LO); } },                       /* 18 hoodie */
  { b: 'COAT', s: 'l', sr: 'COAT', f: L => { L.poly([-2.8, -21, 0, -11.5, 2.8, -21], R.OUT); L.rect(-.4, -20, .8, 9, R.COAT_LO); L.rect(-4.6, -16, 3, 3, R.COAT_LO); L.rect(1.6, -16, 3, 3, R.COAT_LO); L.px(-3.6, -17, R.CYAN); L.px(-3.6, -16, R.CYAN); L.rect(-5, -22, 3, 1.4, R.COAT_HI); L.rect(2, -22, 3, 1.4, R.COAT_HI); } },   /* 19 lab coat */
  { b: 'NAVY', s: 's', sr: 'WHITE', flare: 1, f: L => { L.rect(-3.2, -21, 1.6, 4, R.NAVY_LO); L.rect(1.6, -21, 1.6, 4, R.NAVY_LO); L.rect(-3.5, -18, 7, 5, R.NAVY_HI); L.px(-2, -17, R.GOLD); L.px(2, -17, R.GOLD); L.rect(-7, -11, 14, 1, R.NAVY_LO); } },                                    /* 20 pinafore dress */
  { b: 'OUT', s: 'c', flare: 1, f: L => { L.poly([-3, -21, 0, -17, 3, -21], R.OUT_LO); L.rect(-6, -16, 12, 1.2, R.GOLD); L.rect(-6.5, -13.5, 13, 1.2, R.WHITE); L.rect(-7, -11, 14, 1.2, R.GOLD); } },                                                                                         /* 21 poncho */
  { b: 'OUT', s: 's', sr: 'OUT', f: L => { L.rect(-6, -15.5, 12, 5, R.BLUE); L.rect(-3.5, -19, 7, 4, R.BLUE_HI); L.rect(-4, -21, 1.5, 3, R.BLUE_LO); L.rect(2.5, -21, 1.5, 3, R.BLUE_LO); L.px(-3, -17.5, R.GOLD); L.px(2, -17.5, R.GOLD); L.rect(-2, -14, 4, 2.4, R.BLUE_LO); } },                      /* 22 overalls */
  { b: 'OUT', s: 'l', f: L => { L.rect(-5.5, -22, 11, 3.2, R.RED); L.rect(1.2, -19, 2.8, 6.5, R.RED); L.rect(1.2, -13, 2.8, 1.2, R.WHITE); L.rect(-6, -14.5, 12, 1, R.OUT_HI); L.rect(-6, -12.5, 12, 1, R.OUT_HI); L.px(-3, -21, R.WHITE); L.px(0, -21, R.WHITE); } }                          /* 23 knit sweater + scarf */
];
const OUT_N = OUTFITS.length;
function torsoShape(L, role, flare) {
  L.rect(-5, TOP_Y0, 10, 1, role); L.rect(-6, TOP_Y0 + 1, 12, 10, role);
  if (flare) L.poly([-6, -12, 6, -12, 7, -10, -7, -10], role);
}

/* ---- legwear: len = px of the leg path covered, rad = brush radius ---- */
const LEGW = [
  { len: 3.6, rad: 2.3 },                 /* 0 shorts (default) */
  { len: 6.6, rad: 2.1 },                 /* 1 long pants */
  { skirt: 1, len: 0, rad: 0 },           /* 2 skirt */
  { len: 5.2, rad: 2.1 },                 /* 3 capris */
  { len: 4.6, rad: 2.5 },                 /* 4 long shorts */
  { len: 2.4, rad: 2.2 },                 /* 5 short shorts */
  { len: 6.6, rad: 2.8 },                 /* 6 baggy trousers (appended) */
  { len: 5.2, rad: 1.6 }                  /* 7 slim cropped (appended) */
];
const LEG_N = LEGW.length;

/* ---- footwear: ASCII art, ankle = local (0,0); columns -2‥ ; y0 = first row (negative = shaft above the ankle) ---- */
const SA = { s: 'SHOE', h: 'SHOE_HI', l: 'SHOE_LO', S: 'SKIN', D: 'SKIN_LO', w: 'COAT_HI', a: 'ACC', k: 'INK' };
const SHOES = [
  { y0: 0, f: ['.hss.', 'sssss', 'sssss', 'lllll'], s: ['ssss...', 'sssshh.', 'sssssss', 'lllllll'] },                                     /* 0 sneakers */
  { y0: -3, f: ['.sss.', '.sss.', '.sss.', 'sssss', 'sssss', 'sssss', 'lllll'], s: ['ssss...', 'ssss...', 'ssss...', 'sssss..', 'sssssss', 'sssssss', 'lllllll'] }, /* 1 boots */
  { y0: 1, f: ['sssss', 'sssss', 'lllll'], s: ['ssssss.', 'sssssss', 'lllllll'] },                                                              /* 2 flats */
  { y0: 1, f: ['sssss', 'shhss', 'lllll'], s: ['ssssss.', 'ssshhss', 'lllllll'] },                                                              /* 3 loafers */
  { y0: -2, f: ['.sss.', '.sss.', 'sssss', 'sssss', 'hssss', 'lllll'], s: ['ssss...', 'ssss...', 'sssshh.', 'sssssss', 'sssssss', 'lllllll'] },   /* 4 high-tops */
  { y0: 2, f: ['SSSSS', 'SSDSS'], s: ['SSSSSS.', 'SSSSSSD'], skin: 1 },                                                                      /* 5 barefoot */
  { y0: 1, f: ['.aaa.', 'aaaaa', 'lllll'], s: ['.aaaaa.', 'aaaaaaa', 'lllllll'] },                                                          /* 6 slippers */
  { y0: -4, f: ['hhhhh', '.sss.', '.sss.', '.sss.', 'sssss', 'sssss', 'lllll'], s: ['hhhh...', 'ssss...', 'ssss...', 'ssss...', 'sssssss', 'sssssss', 'lllllll'] },  /* 7 cuffed boots (appended) */
  { y0: 1, f: ['SaSaS', 'SSSSS', 'lllll'], s: ['SSSaSS.', 'SSSSSSS', 'lllllll'], skin: 1 },                                                         /* 8 sandals (appended) */
  { y0: -1, f: ['.hss.', 'sssss', 'sssss', 'wwwww', 'lllll'], s: ['sssh...', 'sssssh.', 'ssssss.', 'wwwwwww', 'lllllll'] }                          /* 9 chunky sneakers (appended) */
];
const SHOE_N = SHOES.length;

/* ======================================================================================
   ASSEMBLY — appearance descriptor → cached part sprites → posed frame
   desc = { skin, hair, outfit, accent, iris, legs, shoes : '#hex',
            hd, h, e, b, m, o, sl, hn, lw, ft, t, x : part indices }
   ====================================================================================== */
const C_ROLES = new LRU(96), C_PART = new LRU(520), C_FRAME = new LRU(260), C_PORT = new LRU(120), C_SVG = new LRU(160);
const rk = A => [A.skin, A.hair, A.outfit, A.accent, A.iris, A.legs, A.shoes].join('');
function rolesFor(A) { const k = rk(A); let r = C_ROLES.get(k); if (!r) r = C_ROLES.set(k, makeRoles(A)); return r; }
function memo(key, fn) { let v = C_PART.get(key); if (v === undefined) v = C_PART.set(key, fn()); return v; }
const exOf = n => { const lk = (n >> 2) & 3; return { blink: n & 1, cl: (n >> 1) & 1, look: lk === 1 ? 1 : lk === 2 ? -1 : 0, mo: (n >> 4) & 7, brow: (n >> 7) & 1 }; };

/* ---- head: skull, ears, face, hair, hat, extras. Cached per (view, expression) ---- */
function partHead(A, v, exn) {
  const hat = A.t ? A.accent : '';
  return memo(['H', v, exn, A.hd, A.e, A.b, A.m, A.h, A.t, A.x, A.skin, A.hair, A.iris, hat].join('|'), () => {
    const ex = exOf(exn), roles = rolesFor(A), buf = new Uint32Array(N), L = SCR[0], hd = A.hd | 0, kS = v === 1 ? .92 : 1;
    if (v !== 1) { L.reset().at(0, HC, kS, 0); ears(L, hd, v, true); paint(buf, L, roles, { ol: R.SKIN_OL, bev: 1 }); }
    L.reset().at(0, HC, kS, 0); skull(L, hd); paint(buf, L, roles, { ol: R.SKIN_OL, bev: 2 });
    if (v === 1) { L.reset().at(0, HC, kS, 0); ears(L, hd, v, false); paint(buf, L, roles, { ol: R.SKIN_OL, bev: 1 }); }
    const X = EXTRAS[A.x] || null;
    if (v !== 2) {
      L.reset().at(0, HC, 1, 0); drawEyes(L, A.e, v, ex); drawBrows(L, A.b, v, ex); drawMouth(L, A.m, v, ex); paint(buf, L, roles, { ol: 0, bev: 0 });
      if (X && X.l === 0) { L.reset().at(0, HC, 1, 0); X.f(L, v, 0); paint(buf, L, roles, { ol: 0, bev: 0 }); }
    }
    const HS = HAIR[A.h] || HAIR[0], top = (HM[hd] || HM[0]).top - Math.round(HS.lift * .5);
    L.reset().at(0, HC, v === 1 ? .92 : 1, v === 1 ? 1 : 0); hairFront(L, A.h, v); paint(buf, L, roles, { ol: R.INK, bev: 1, grain: HS.fuzz ? 7 : 12 });
    if (HATS[A.t]) { L.reset().at(0, HC, v === 1 ? .92 : 1, v === 1 ? 1 : 0); HATS[A.t](L, top, v); paint(buf, L, roles, { ol: R.INK, bev: 2 }); }
    if (X && X.l === 1) { L.reset().at(0, HC, 1, 0); X.f(L, v, top); paint(buf, L, roles, { ol: R.INK, bev: 1 }); }
    return trim(buf);
  });
}
function partHairBack(A, v) {
  const HS = HAIR[A.h]; if (!HS || !HS.back) return null;
  return memo(['HB', v, A.h, A.hair].join('|'), () => {
    const buf = new Uint32Array(N), L = SCR[0].reset().at(0, HC, 1, v === 1 ? -2 : 0); hairBack(L, A.h, v);
    paint(buf, L, rolesFor(A), { ol: R.INK, bev: 1, grain: 12 }); return trim(buf);
  });
}
/* ---- torso (neck, garment, skirt) ---- */
function partTorso(A, v) {
  return memo(['T', v, A.o, A.outfit, A.skin, A.lw === 2 ? A.legs : '', A.lw === 2 ? 1 : 0].join('|'), () => {
    const O = OUTFITS[A.o] || OUTFITS[0], roles = rolesFor(A), buf = new Uint32Array(N), L = SCR[0];
    L.reset().at(0, 0, 1, 0); L.rect(-2, -24, 4, 4, R.SKIN); L.rect(-2, -23, 4, 1, R.SKIN_LO); paint(buf, L, roles, { ol: R.SKIN_OL, bev: 0 });
    const k = v === 1 ? .72 : 1, s = v === 1 ? .5 : 0;
    L.reset().at(0, 0, k, s); torsoShape(L, R[O.b], O.flare); if (v !== 2) O.f(L, v); paint(buf, L, roles, { ol: R.INK, bev: 1 });
    if (A.lw === 2) { L.reset().at(0, 0, k, s); L.poly([-6, -11, 6, -11, 8.5, -5.5, -8.5, -5.5], R.LEG); L.rect(-8.5, -6.5, 17, 1, R.LEG_LO); paint(buf, L, roles, { ol: R.INK, bev: 1 }); }
    return trim(buf);
  });
}
function partCape(A, v) {
  if (!(OUTFITS[A.o] || {}).cape) return null;
  return memo(['C', v, A.outfit].join('|'), () => { const buf = new Uint32Array(N), L = SCR[0].reset().at(0, 0, v === 1 ? .72 : 1, v === 1 ? -2 : 0); L.poly([-6, -21, 6, -21, 9.5, -7, -9.5, -7], R.OUT_LO); paint(buf, L, rolesFor(A), { ol: R.INK, bev: 0 }); return trim(buf); });
}
const BY = -30;   /* shoe/prop sprites are authored at this y offset so they never touch the cell edge */
function partShoe(A, v) {
  return memo(['S', v, A.ft, A.shoes, A.skin, A.accent].join('|'), () => {
    const S = SHOES[A.ft] || SHOES[0], rows = v === 1 ? S.s : S.f, buf = new Uint32Array(N), L = SCR[0].reset();
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const ch = rows[j][i]; if (ch !== '.') L.set(-2 + i, BY + S.y0 + j, R[SA[ch]]); }
    paint(buf, L, rolesFor(A), { ol: S.skin ? R.SKIN_OL : R.INK, bev: 0 }); return trim(buf);
  });
}
const NEUTRAL = { skin: '#f3c9a5', hair: '#5c3b24', outfit: '#444', accent: '#888', iris: '#553f1a', legs: '#a88b55', shoes: '#cfd3d9' };
function propSprite(kind) {
  return memo('P|' + kind, () => {
    const buf = new Uint32Array(N), L = SCR[0].reset(), roles = rolesFor(NEUTRAL);
    L.at(0, BY, 1, 0);
    if (kind === 1) { L.rect(0, 0, 4, 4, R.CUP); L.rect(0, 0, 4, 1, R.WOOD); L.px(4, 1, R.CUP); L.px(4, 2, R.CUP); paint(buf, L, roles, { ol: R.INK, bev: 0 }); }
    else { L.px(0, -1, R.SPARK); L.px(-1, 0, R.SPARK); L.px(0, 0, R.WHITE); L.px(1, 0, R.SPARK); L.px(0, 1, R.SPARK); paint(buf, L, roles, { ol: 0, bev: 0 }); }
    return trim(buf);
  });
}

/* ---- skeleton: joint rest positions per view (0 front, 1 three-quarter facing +x, 2 back) ---- */
const SKEL = [
  { sh: [[7, -20], [-7, -20]], hip: [[2.5, -10], [-2.5, -10]], hand: [[1.2, 7.4], [-1.2, 7.4]], hs: 0 },
  { sh: [[-2, -20], [3, -20]], hip: [[-1, -10], [2, -10]], hand: [[.3, 7.4], [.3, 7.4]], hs: 1 },
  { sh: [[7, -20], [-7, -20]], hip: [[2.5, -10], [-2.5, -10]], hand: [[1.2, 7.4], [-1.2, 7.4]], hs: 0 }
];
const LEG_L = 3, ARM_L = 3.6;
function ik(sx, sy, tx, ty, l1, l2, pick) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy); const mx = l1 + l2 - .02;
  if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; tx = sx + dx; ty = sy + dy; }
  if (d < .6) { d = .6; if (!dx && !dy) dy = .6; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), bx = sx + dx * a / d, by = sy + dy * a / d, px = -dy / d, py = dx / d;
  const e = pick([bx + px * h, by + py * h], [bx - px * h, by - py * h]);
  return { ex: e[0], ey: e[1], tx: tx, ty: ty };
}
const elbowDown = (a, b) => a[1] > b[1] ? a : b;
function sleeveOf(A) {
  const O = OUTFITS[A.o] || OUTFITS[0]; let t = O.s;
  if (A.sl === 1) t = 's'; else if (A.sl === 2) t = 'l'; else if (A.sl === 3) t = 'n';
  return { t: t, role: R[O.sr || O.b] };
}
function drawArm(buf, roles, A, v, i, P, dy, dx, hands) {
  const K = SKEL[v], sh = K.sh[i], rest = K.hand[i], S = [sh[0] + dx, sh[1] + dy], L = SCR[0];
  const g = ik(S[0], S[1], S[0] + rest[0] + P['a' + i + 'x'], S[1] + rest[1] + P['a' + i + 'y'], ARM_L, ARM_L, elbowDown), pts = [S[0], S[1], g.ex, g.ey, g.tx, g.ty];
  const tot = Math.hypot(g.ex - S[0], g.ey - S[1]) + Math.hypot(g.tx - g.ex, g.ty - g.ey), sl = sleeveOf(A), hn = A.hn | 0;
  L.reset(); L.chain(pts, 1.15, R.SKIN); paint(buf, L, roles, { ol: R.SKIN_OL, bev: 0 });
  if (sl.t !== 'n') { L.reset(); if (sl.t === 'c') L.disk(S[0], S[1] + .5, 2.9, sl.role); else L.chain(pts, 2.05, sl.role, 0, sl.t === 's' ? 3.6 : tot - .6); paint(buf, L, roles, { ol: R.INK, bev: 1 }); }
  if (hn === 3) { L.reset(); L.chain(pts, 1.7, R.ACC, Math.max(0, tot - 2.4), tot - 1.2); paint(buf, L, roles, { ol: R.INK, bev: 0 }); }
  L.reset(); L.disk(g.tx, g.ty, hn === 2 ? 2 : 1.5, hn === 1 || hn === 2 ? R.ACC : R.SKIN); paint(buf, L, roles, { ol: hn === 1 || hn === 2 ? R.INK : R.SKIN_OL, bev: hn === 1 || hn === 2 ? 1 : 0 });
  hands[i] = [g.tx, g.ty];
}
function drawLeg(buf, roles, A, v, i, P, py, dx) {
  const K = SKEL[v], hp = K.hip[i], Hh = [hp[0] + dx, hp[1] + py], L = SCR[0], f = v === 1 ? 1 : (i === 0 ? 1 : -1), seat = P.st ? [3, 3] : [0, 6];
  const g = ik(Hh[0], Hh[1], Hh[0] + seat[0] + P['l' + i + 'x'], Hh[1] + seat[1] + P['l' + i + 'y'], LEG_L, LEG_L, (a, b) => a[0] * f >= b[0] * f ? a : b), pts = [Hh[0], Hh[1], g.ex, g.ey, g.tx, g.ty], W_ = LEGW[A.lw] || LEGW[0];
  L.reset(); L.chain(pts, 1.1, R.SKIN); paint(buf, L, roles, { ol: R.SKIN_OL, bev: 0 });
  if (!W_.skirt) {
    L.reset(); L.chain(pts, W_.rad, R.LEG, 0, W_.len); paint(buf, L, roles, { ol: R.INK, bev: 1 });
    L.reset(); L.chain(pts, W_.rad, R.LEG_LO, Math.max(0, W_.len - .9), W_.len); paint(buf, L, roles, { ol: 0, bev: 0 });
  }
  blit(buf, partShoe(A, v), Math.floor(g.tx), Math.round(g.ty) - BY);
}

/* ---- pose ---- */
const PK = ['yw', 'bk', 'by', 'bx', 'ty', 'hx', 'hy', 'ex', 'st', 'pr', 'a0x', 'a0y', 'a1x', 'a1y', 'l0x', 'l0y', 'l1x', 'l1y'];
const POSE0 = {}; PK.forEach(k => { POSE0[k] = 0; });
function normPose(p) { const o = {}; for (let i = 0; i < PK.length; i++) o[PK[i]] = Math.round((p && p[PK[i]]) || 0); return o; }
function poseKey(p) { let s = ''; for (let i = 0; i < PK.length; i++) s += (p[PK[i]] || 0) + ','; return s; }
function mirror(buf) { for (let y = 0; y < H; y++) for (let x = 0; x < W >> 1; x++) { const a = y * W + x, b = y * W + W - 1 - x, t = buf[a]; buf[a] = buf[b]; buf[b] = t; } return buf; }

/* compose one frame. layering (back→front): back hair/cape · far leg · near leg · [far arm] · torso · [arms] · head · props */
function compose(A, P0) {
  const P = normPose(P0), v = P.bk ? 2 : (P.yw ? 1 : 0), roles = rolesFor(A), buf = new Uint32Array(N), hands = [], seat = P.st ? 3 : 0, py = P.by + seat, pyT = py - P.ty, dx = P.bx;
  const hb = partHairBack(A, v); if (hb && hb.w) blit(buf, hb, dx + P.hx, pyT + P.hy);
  const cp = partCape(A, v); if (cp) blit(buf, cp, dx, pyT);
  drawLeg(buf, roles, A, v, 1, P, py, dx); drawLeg(buf, roles, A, v, 0, P, py, dx);
  if (v === 1) drawArm(buf, roles, A, v, 1, P, pyT, dx, hands);
  blit(buf, partTorso(A, v), dx, pyT);
  if (v !== 1) drawArm(buf, roles, A, v, 1, P, pyT, dx, hands);
  drawArm(buf, roles, A, v, 0, P, pyT, dx, hands);
  blit(buf, partHead(A, v, P.ex), dx + P.hx, pyT + P.hy);
  if (P.pr === 1 && hands[0]) blit(buf, propSprite(1), Math.floor(hands[0][0]) - 1, Math.round(hands[0][1]) - 3 - BY);
  if (P.pr >= 2) { const s = propSprite(2), o = P.pr === 2 ? [[3, -3], [-3, -4]] : [[-3, -3], [3, -4]]; [0, 1].forEach(i => { if (hands[i]) blit(buf, s, Math.floor(hands[i][0]) + (i ? -o[1][0] : o[0][0]), Math.round(hands[i][1]) + o[i][1] - BY); }); }
  return buf;
}
const bodyKey = A => [A.skin, A.hair, A.outfit, A.accent, A.iris, A.legs, A.shoes, A.hd, A.h, A.e, A.b, A.m, A.o, A.sl, A.hn, A.lw, A.ft, A.t, A.x].join('~');

/* cached, canvas-backed frame. yw<0 = mirrored (facing left) */
function toCanvas(buf) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength), W, H), 0, 0); return cv;
}
/* build budget: a host loop calls budget(ms) once per tick; frame(…, soft=true) then returns null instead of composing once the budget is spent
   (the caller keeps showing the previous frame), so a crowd of new appearances is spread over a few ticks rather than hitching one. */
let BUDGET_END = 0; const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
function frame(A, pose, soft) {
  const P = normPose(pose), key = bodyKey(A) + '#' + poseKey(P); let f = C_FRAME.get(key); if (f) return f;
  if (soft && BUDGET_END && now() > BUDGET_END) return null;
  let buf;
  if (P.yw < 0) { buf = mirror(compose(A, Object.assign({}, P, { yw: 1 }))); } else buf = compose(A, P);
  f = { cv: toCanvas(buf), buf: typeof document === 'undefined' ? buf : null, w: W, h: H, ox: OX, oy: OY };
  return C_FRAME.set(key, f);
}
/* static idle buffer (portraits) */
const IDLE = Object.assign({}, POSE0);
function idleBuf(A) { const k = bodyKey(A); let b = C_PORT.get(k); if (!b) b = C_PORT.set(k, compose(A, IDLE)); return b; }

/* ---- SVG export: pixel runs merged into rectangles, one <path> per colour ---- */
const hex6 = c => '#' + ((c & 255) << 16 | ((c >> 8) & 255) << 8 | ((c >> 16) & 255)).toString(16).padStart(6, '0');
function runsSVG(buf, x0, y0, w, h) {
  const by = new Map(); let prev = new Map();
  for (let y = y0; y < y0 + h; y++) {
    const now = new Map();
    for (let x = x0; x < x0 + w;) {
      const c = buf[y * W + x]; if (!(c >>> 24)) { x++; continue; }
      let e = x + 1; while (e < x0 + w && buf[y * W + e] === c) e++;
      const key = c + ':' + x + ':' + (e - x); let r = prev.get(key);
      if (r) r.h++; else { r = { x: x, y: y, w: e - x, h: 1 }; let l = by.get(c); if (!l) by.set(c, l = []); l.push(r); }
      now.set(key, r); x = e;
    }
    prev = now;
  }
  let s = ''; by.forEach((l, c) => { s += '<path fill="' + hex6(c) + '" d="' + l.map(r => 'M' + r.x + ' ' + r.y + 'h' + r.w + 'v' + r.h + 'h-' + r.w + 'z').join('') + '"/>'; });
  return s;
}
const CROPS = { torso: [OX - 12, OY - 27, 24, 24], legs: [OX - 12, OY - 23, 24, 24], full: [OX - 28, OY - 56, 56, 58] };
/* → { vb:[x,y,w,h], body:'<path…/>' } in buffer-pixel units; view: bust | torso | legs | full */
function svgBody(A, view) {
  view = view || 'bust'; const key = bodyKey(A) + '@' + view; let r = C_SVG.get(key); if (r) return r;
  const buf = idleBuf(A); let vb;
  if (view === 'bust') {
    let top = H; for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (buf[y * W + x] >>> 24) { top = y; break; }
    const bottom = OY - 13, hgt = Math.max(34, bottom - (top - 1)); vb = [OX - Math.round(hgt / 2), bottom - hgt, hgt, hgt];
  } else vb = CROPS[view] || CROPS.full;
  const x0 = Math.max(0, vb[0]), y0 = Math.max(0, vb[1]), x1 = Math.min(W, vb[0] + vb[2]), y1 = Math.min(H, vb[1] + vb[3]);
  return C_SVG.set(key, { vb: vb, body: runsSVG(buf, x0, y0, x1 - x0, y1 - y0) });
}
function purge(A) { const k = A ? bodyKey(A) : null; [C_FRAME, C_PORT, C_SVG].forEach(c => { if (!k) return c.clear(); Array.from(c.m.keys()).forEach(kk => { if (kk.indexOf(k) === 0) c.m.delete(kk); }); }); }
function trimCaches() { C_FRAME.clear(); C_SVG.clear(); C_PORT.clear(); }
function stats() { return { parts: C_PART.size, frames: C_FRAME.size, portraits: C_PORT.size, svg: C_SVG.size, roles: C_ROLES.size }; }

const API = {
  W: W, H: H, OX: OX, OY: OY, POSE0: POSE0, IDLE: IDLE, PK: PK, R: R,
  N: { heads: HM.length, hair: HAIR_N, eyes: EYES.length, brows: BROWS.length, mouths: MOUTHS.length, outfits: OUT_N, hats: HAT_N, extras: EXTRA_N, legs: LEG_N, shoes: SHOE_N },
  compose: compose, frame: frame, budget: ms => { BUDGET_END = ms > 0 ? now() + ms : 0; }, svgBody: svgBody, normPose: normPose, poseKey: poseKey, bodyKey: bodyKey, purge: purge, trim: trimCaches, stats: stats, mirror: mirror, idleBuf: idleBuf
};
root.CodexRig = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
