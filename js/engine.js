/* ==========================================================================
   THE POLYMATH CODEX — engine.js
   Zero-build engine: pixel sprites, Web Audio synth, state/progression,
   MiniSearch index, Marked+KaTeX quiz engine, flashcard runner, widget helpers.
   Data comes from js/sectors-part{1,2,3}.js (globals SECTORS_PART1/2/3,
   CHRONO_ROWS, CHRONO_STAGES, SYSLOG, CODEX_CARDS, MASTER_EXAM).
   ========================================================================== */
'use strict';

/* ================= UTILITIES ================= */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pad2 = n => (n < 10 ? '0' + n : '' + n);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= PIXEL SPRITES ================= */
const PAL = { d:'#b9741f', y:'#ffc874', w:'#e9fbff', s:'#e8a24a', c:'#5fd0ee', t:'#46f0c4', p:'#a99cff',
  r:'#ff7b8a', o:'#ff9f6b', g:'#5df2b8', n:'#7fb0c0', k:'#031821', e:'#27566a' };
const SPRITES = {
  coin:    ['..dddd..','.dyyyyd.','dywwyyyd','dywyyyyd','dyyyyyyd','dyyssyyd','.dyssyd.','..dddd..'],
  star:    ['...yy...','...yy...','.yyyyyy.','yyyyyyyy','.yyyyyy.','..yyyy..','.yy..yy.','y......y'],
  flame:   ['....r...','...rr...','..rorr..','..roor..','.rooyyr.','.royyyr.','..ryyr..','...rr...'],
  check:   ['........','......gg','.....gg.','....gg..','gg..gg..','.gggg...','..gg....','........'],
  cross:   ['rr....rr','rrr..rrr','.rrrrrr.','..rrrr..','..rrrr..','.rrrrrr.','rrr..rrr','rr....rr'],
  book:    ['........','.cccccc.','.cwwwwc.','.cwwwwc.','.cwwwwc.','.cwwwwc.','.cccccc.','........'],
  search:  ['..ccc...','.c...c..','c.....c.','c.....c.','.c...c..','..ccc...','....ee..','.....ee.'],
  eye:     ['........','..wwww..','.wccccw.','wcckcccw','.wccccw.','..wwww..','........','........'],
  print:   ['........','.nnnnnn.','.nwwwwn.','.nwwwwn.','nnnnnnnn','nwwwwwwn','.nnnnnn.','........'],
  trophy:  ['........','.yyyyyy.','.ykkkky.','..ykky..','...yy...','...yy...','.yyyyyy.','........'],
  trash:   ['nnnnnnnn','.nnnnnn.','.n.nn.n.','.n.nn.n.','.n.nn.n.','.n.nn.n.','.nnnnnn.','........'],
  qblock:  ['dddddddd','dykkkkyd','dykyykyd','dyyyykyd','dyykkyyd','dykkyyyd','dyykkyyd','dddddddd'],
  shield:  ['.cccccc.','cccccccc','cccwwccc','cccwwccc','cccccccc','.cccccc.','..cccc..','...cc...'],
  chart:   ['........','.....tt.','.yy..tt.','.yy..tt.','.yy..tt.','.yy..tt.','eeeeeeee','........'],
  doc:     ['.wwwwww.','.wnnnnw.','.wnnnww.','.wnnnnw.','.wnnwww.','.wnnnnw.','.wnnnww.','.wwwwww.'],
  bolt:    ['....yyy.','...yyy..','..yyy...','.yyyyyy.','...yyy..','..yyy...','.yyy....','.yy.....'],
  target:  ['..rrrr..','.rwwwwr.','rwccccwr','rwccccwr','rwccccwr','.rwwwwr.','..rrrr..','........'],
  bag:     ['...dd...','...dd...','..yyyy..','.yyyyyy.','.yykkyy.','.yykkyy.','.yyyyyy.','..yyyy..'],
  building:['.eeeeee.','eeeeeeee','.n.nn.n.','.n.nn.n.','.n.nn.n.','.n.nn.n.','eeeeeeee','eeeeeeee'],
  speech:  ['..cccc..','.cwwwwc.','cwwwwwwc','cwnnnnwc','cwwwwwwc','.cwwwwc.','..cccc..','..cc....'],
  calendar:['.n....n.','.nnnnnn.','nwwwwwwn','nwnnnnwn','nwwwwwwn','nwnnnnwn','nnnnnnnn','........'],
  cards:   ['.cc.....','.ccyyyy.','.ccywwy.','.ccyyyy.','.ccyyyy.','.ccyyyy.','...yyyy.','........'],
  bulb:    ['..yyyy..','.yyyyyy.','.yywwyy.','.yywwyy.','.yyyyyy.','..yyyy..','..nnnn..','..nnnn..'],
  sfx:     ['........','....ee..','..nneee.','..nneeee','..nneeee','..nneee.','....ee..','........'],
  net:     ['..cccc..','.cwwwwc.','cwwccwwc','cwccccwc','cwccccwc','cwwccwwc','.cwwwwc.','..cccc..'],
  brain:   ['........','.pppppp.','ppwppwpp','pppppppp','pwppppwp','.pppppp.','..p..p..','........'],
  gamepad: ['........','........','nnnnnnnn','nwnnnnrn','nwnnnnrn','nnnnnnnn','.nn..nn.','........'],
  atom:    ['..p..p..','.p.cc.p.','..cccc..','p.cccc.p','p.cccc.p','..cccc..','.p.cc.p.','..p..p..'],
  cube:    ['gggggggg','gggggggg','gdgddgdg','dddddddd','dddddddd','dddddddd','dddddddd','dddddddd'],
  dice:    ['........','.wwwwww.','wkwwwwkw','wwwwwwww','wwwkkwww','wwwwwwww','wkwwwwkw','.wwwwww.'],
  key:     ['.yyy....','y...y...','y...y...','.yyy....','..y.....','..y.yy..','..y.yy..','..y.....'],
  crown:   ['y..y..y.','yy.yy.yy','yyyyyyyy','yyyyyyyy','yyyyyyyy','dddddddd','........','........'],
  power:   ['...rr...','...rr...','.rr..rr.','rr....rr','rr....rr','rr....rr','.rr..rr.','..rrrr..'],
  moon:    ['..cccc..','.cccccc.','ccccwccc','ccwccccc','ccccccwc','.cccccc.','..cccc..','........'],
  hour:    ['nnnnnnnn','.wwwwww.','..wnnn..','...ww...','...ww...','..nnww..','.wwwwww.','nnnnnnnn'],
  music:   ['..nnnnnn','..nnnnnn','..n..n..','..n..n..','..n..n..','nnn.nnn.','nnn.nnn.','........'],
  radar:   ['........','..cccc..','.cy...c.','c..y...c','c...y..c','.c....c.','..cccc..','...cc...'],
  antenna: ['...cc...','..c..c..','.c....c.','...ww...','...ww...','..w..w..','...ww...','..wwww..'],
  gear:    ['..n..n..','.nnnnnn.','.nn..nn.','nnn..nnn','nnn..nnn','.nn..nn.','.nnnnnn.','..n..n..']
};
/* Sprites render as glowing "plankton" dot-matrices. Each unique
   (sprite · tint · size) is painted ONCE to a canvas and reused as a CSS
   background — ~190 elements instead of the ~12,000 <i> nodes the old
   grid renderer produced, and no more display:flex-vs-inline-grid clashes. */
const _SPR_CACHE = {};
function _spriteURL(name, px, tint) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const key = name + '|' + px + '|' + (tint || '') + '|' + dpr;
  if (_SPR_CACHE[key]) return _SPR_CACHE[key];
  const art = SPRITES[name]; if (!art) return '';
  const cell = Math.max(3, Math.ceil(px * dpr / 8)), N = cell * 8;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return '';
  const fat = px <= 30;                       // small/medium icons: overlapping blobs stay legible
  const r = cell * (fat ? 0.58 : 0.46);
  art.forEach((row, y) => {
    for (let x = 0; x < 8; x++) {
      const ch = row[x]; if (ch === '.') continue;
      const col = tint || PAL[ch] || '#fff';
      c.shadowColor = col; c.shadowBlur = cell * (fat ? 0.7 : 1.1);
      c.fillStyle = col; c.beginPath();
      c.arc((x + 0.5) * cell, (y + 0.5) * cell, r, 0, 6.2832); c.fill();
    }
  });
  return (_SPR_CACHE[key] = 'url(' + cv.toDataURL() + ')');
}
function drawSprites(root) {
  $$('[data-sprite]', root || document).forEach(el => {
    const name = el.dataset.sprite, px = +(el.dataset.px || 16), tint = el.dataset.tint || '';
    const sig = name + '|' + px + '|' + tint;
    if (el.dataset.drawn === sig) return;                       // already painted
    if (window.CodexIcons && window.CodexIcons.paint(el, name, px, tint)) { el.dataset.drawn = sig; return; }
    if (!SPRITES[name]) return;                                 // unknown icon: leave empty
    el.dataset.drawn = sig; el.textContent = '';                // legacy pixel fallback
    el.style.backgroundImage = _spriteURL(name, px, tint);
    el.style.width = px + 'px'; el.style.height = px + 'px';
    el.setAttribute('aria-hidden', 'true');
  });
}

/* ================= AUDIO SYNTH ================= */
let AC = null;
function sfx(name) {
  if (S.sfx === false) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime;
    const tone = (f, st, d, type, v) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(v || .04, t + st);
      g.gain.exponentialRampToValueAtTime(.0001, t + st + d);
      o.connect(g); g.connect(AC.destination); o.start(t + st); o.stop(t + st + d + .02);
    };
    if (name === 'ok') { tone(660, 0, .09); tone(880, .09, .12); }
    else if (name === 'bad') { tone(170, 0, .16, 'sawtooth', .05); }
    else if (name === 'flip') { tone(520, 0, .05); }
    else if (name === 'click') { tone(440, 0, .04, 'square', .025); }
    else if (name === 'reveal') { tone(392, 0, .06); tone(523, .06, .09, 'triangle', .05); }
    else if (name === 'level') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .11, .14)); }
    else if (name === 'badge') { [784, 988, 1319].forEach((f, i) => tone(f, i * .09, .12, 'triangle', .05)); }
    else if (name === 'done') { [659, 784, 988].forEach((f, i) => tone(f, i * .1, .13)); }
    else if (name === 'heal') { tone(392, 0, .12, 'triangle', .05); tone(523, .09, .14, 'triangle', .05); tone(659, .18, .22, 'triangle', .05); }
  } catch (e) { /* audio unavailable */ }
}

/* ================= CONFETTI (canvas-confetti, pixel-styled) ================= */
let CONF_FX = null;
function confettiInit() {
  if (typeof confetti !== 'function') return null;
  if (!CONF_FX) {
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:300';
    document.body.appendChild(cv);
    CONF_FX = confetti.create(cv, { resize: true, useWorker: true, disableForReducedMotion: true });
  }
  return CONF_FX;
}
function celebrate(n) {
  if (REDUCED) return;
  const fx = confettiInit(); if (!fx) return;
  const colors = ['#5fd0ee', '#46f0c4', '#a99cff', '#ffc874', '#ff7ec9', '#effcff'];
  fx({ particleCount: Math.min(n || 90, 130), spread: 75, origin: { y: .68 }, colors, shapes: ['circle'], scalar: 1.0, gravity: .55, decay: .94, zIndex: 300, ticks: 260 });
  if ((n || 0) >= 80) {
    setTimeout(() => fx({ particleCount: 55, angle: 60, spread: 62, origin: { x: 0, y: .72 }, colors, shapes: ['circle'], scalar: .9, gravity: .55 }), 160);
    setTimeout(() => fx({ particleCount: 55, angle: 120, spread: 62, origin: { x: 1, y: .72 }, colors, shapes: ['circle'], scalar: .9, gravity: .55 }), 320);
  }
}

/* ================= STATE ================= */
const KEY = 'polymath_codex_v1';
function load() {
  const d = { xp: 0, streak: 0, bestStreak: 0, seen: {}, completed: {}, quizDone: {}, quizBest: {}, known: [], badges: [],
    lastScreen: 'home', font: 16, focus: false, sfx: true, tlRev: {}, stats: { ans: 0, ok: 0, search: 0 } };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); return Object.assign({}, d, p, { stats: Object.assign({}, d.stats, p.stats || {}) }); }
  } catch (e) { /* corrupted state — start fresh */ }
  return d;
}
let S = load(), saveT = null;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    if (window.NetworkEngine) { try { NetworkEngine.onStateSave(); } catch (e) { /* cloud sync optional */ } }
  }, 400);
}

/* ================= SECTOR / DATA REGISTRY ================= */
const SECTORS = []
  .concat(window.SECTORS_PART1 || [])
  .concat(window.SECTORS_PART2 || [])
  .concat(window.SECTORS_PART3 || []);
const SECTMAP = Object.fromEntries(SECTORS.map(s => [s.id, s]));
const QUIZZES = {};
SECTORS.forEach(s => { if (s.quiz) QUIZZES[s.id] = s.quiz; });
if (window.MASTER_EXAM) QUIZZES.exam = window.MASTER_EXAM;
const CH_LABEL = {}; SECTORS.forEach(s => { CH_LABEL[s.id] = 'SEC ' + s.num; });
const CARDS = (window.CODEX_CARDS || []).map(c => ({ i: c[0], ch: c[1], q: c[2], a: c[3] }));
const MISSION_IDS = SECTORS.map(s => s.id).concat(['chrono']);
const SECTOR_IDS = SECTORS.map(s => s.id);

/* ================= LEVELS & BADGES ================= */
const LEVELS = [
  { xp: 0,    t: 'NOVICE CHRONICLER' },
  { xp: 100,  t: 'DATA DRIFTER' },
  { xp: 250,  t: 'CODE STRIDER' },
  { xp: 450,  t: 'SYSTEMS SAGE' },
  { xp: 700,  t: 'ARCHIVE WARDEN' },
  { xp: 1000, t: 'COSMIC STRATEGIST' },
  { xp: 1400, t: 'CYBER POLYMATH' },
  { xp: 1900, t: 'UNIVERSAL ARCHITECT' }
];
function levelOf(xp) { let l = 0; LEVELS.forEach((L, i) => { if (xp >= L.xp) l = i; }); return l; }
window.LEVELS = LEVELS;   // top-level const is NOT a window property; network.js reads window.LEVELS
const BADGES = [
  { id: 'first_boot',   name: 'FIRST TRANSMISSION', desc: 'Boot into your first sector.',                     icon: 'power' },
  { id: 'read10',       name: 'DATA MINER',          desc: 'Scan 10 lore terminal entries.',                   icon: 'book' },
  { id: 'read30',       name: 'ARCHIVE DIVER',       desc: 'Scan 30 lore terminal entries.',                   icon: 'doc' },
  { id: 'quiz1',        name: 'SIMULATION SURVIVED', desc: 'Complete your first sector evaluation.',           icon: 'qblock' },
  { id: 'perfect',      name: 'CRITICAL ACCURACY',   desc: 'Score 100% on any sector evaluation.',             icon: 'target' },
  { id: 'streak5',      name: 'FLOW STATE',          desc: 'Chain 5 consecutive correct inputs.',              icon: 'flame' },
  { id: 'streak10',     name: 'HYPER-THREADED',      desc: 'Chain 10 consecutive correct inputs.',             icon: 'bolt' },
  { id: 'cards25',      name: 'SYNAPSE FORGE',       desc: 'Master 25 neural flashcards.',                     icon: 'cards' },
  { id: 'cards50',      name: 'NEURAL BUFFER',       desc: 'Master 50 neural flashcards.',                     icon: 'cards' },
  { id: 'cardsAll',     name: 'LIVING OMNIDISC',     desc: 'Master every flashcard in the codex.',             icon: 'trophy' },
  { id: 'allQuiz',      name: 'SECTOR OVERLORD',     desc: 'Clear every sector quiz.',                         icon: 'shield' },
  { id: 'chrono',       name: 'CHRONO WEAVER',       desc: 'Uncover all historical/aesthetic timelines.',       icon: 'calendar' },
  { id: 'boss75',       name: 'TRIAL CHALLENGER',    desc: 'Attain 75%+ on the Void Boss Trial.',              icon: 'bolt' },
  { id: 'boss100',      name: 'REALITY ARCHITECT',   desc: '100% perfection on the Void Boss Trial.',          icon: 'crown' },
  { id: 'search',       name: 'PACKET SNIFFER',      desc: 'Execute a fuzzy database query.',                  icon: 'search' },
  { id: 'cicada',       name: 'RUNIC CIPHER',        desc: 'Master the Cicada 3301 / Cryptography terminal.',  icon: 'key' },
  { id: 'farlands',     name: 'INTEGER DRIFT',       desc: 'Master the Minecraft Far Lands engine glitch.',    icon: 'cube' },
  { id: 'gacha',        name: '50/50 CONQUEROR',     desc: 'Master the Hoyoverse probability curve.',          icon: 'dice' },
  { id: 'astrophysics', name: 'SINGULARITY DIVER',   desc: 'Calculate the Schwarzschild radius.',              icon: 'atom' }
];

/* ================= NAV CONFIG ================= */
const NAV_ITEMS = [{ id: 'home', label: 'CODEX HUB', sub: 'Start the quest', icon: 'coin', prog: false }]
  .concat(SECTORS.map(s => ({ id: s.id, label: 'SECTOR ' + s.num, sub: s.label, icon: s.icon, prog: true })))
  .concat([
    { id: 'probes', label: 'TELEMETRY BAY', sub: 'Probe expeditions', icon: 'radar', prog: false },
    { id: 'dispatch', label: '0600 DISPATCH', sub: 'Daily calibration', icon: 'antenna', prog: false },
    { id: 'lobby', label: 'OBSERVATION LOUNGE', sub: 'Multiplayer deck · chat', icon: 'moon', prog: false },
    { id: 'notebook', label: 'NOTEBOOK', sub: 'Notes & shared rooms', icon: 'doc', prog: false },
    { id: 'chrono', label: 'CHRONO MATRIX', sub: 'Timelines & recall', icon: 'calendar', prog: true },
    { id: 'syslog', label: 'SYS-LOG', sub: 'Cheat sheet', icon: 'bulb', prog: false },
    { id: 'flash', label: 'NEURAL MATRIX', sub: 'Flashcard deck', icon: 'cards', prog: true },
    { id: 'exam', label: 'VOID TRIAL', sub: 'Boss exam', icon: 'qblock', prog: false }
  ]);
const NAVMAP = Object.fromEntries(NAV_ITEMS.map(n => [n.id, n]));

/* ================= MARKDOWN + MATH + CODE PIPELINE =================
   Strategy: lift $…$ / $$…$$ out of the source BEFORE marked.parse()
   (so underscores/asterisks in TeX never become emphasis), run marked,
   then re-inject the TeX HTML-escaped — KaTeX auto-render picks it up
   from the DOM text afterwards. Prism highlights fenced code blocks. */
let _MATH = [];
function _liftMath(src) {
  _MATH = [];
  let s = String(src);
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, tx) => '\u0001D' + (_MATH.push({ t: tx, disp: true }) - 1) + '\u0001');
  s = s.replace(/\$([^$\n]+?)\$/g, (m, tx) => '\u0001D' + (_MATH.push({ t: tx, disp: false }) - 1) + '\u0001');
  return s;
}
function _dropMath(html) {
  return html.replace(/\u0001D(\d+)\u0001/g, (m, i) => {
    const mm = _MATH[+i]; if (!mm) return '';
    const tx = esc(mm.t);
    return mm.disp ? '<span class="fx-line">$$' + tx + '$$</span>' : '$' + tx + '$';
  });
}
function mdBlock(src) {                      // full markdown (panel bodies)
  const lifted = _liftMath(src);
  let html;
  try { html = (typeof marked !== 'undefined') ? marked.parse(lifted) : '<p>' + esc(lifted).replace(/\n/g, '<br>') + '</p>'; }
  catch (e) { html = '<p>' + esc(lifted).replace(/\n/g, '<br>') + '</p>'; }
  return _dropMath(html).replace(/<i class="pixelart-icons-font-([a-z0-9-]+)"><\/i>/g, '<span class="mi" data-sprite="$1" data-px="15" role="img"></span>');
}
function mdSafe(src) {
  let s = String(src || '');
  if (((s.match(/```/g) || []).length) % 2) s += '\n```';
  return mdBlock(s)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}
function mdInline(src) {                     // inline-safe markdown (buttons, cards, quiz text)
  const lifted = _liftMath(src);
  let html;
  try { html = (typeof marked !== 'undefined') ? marked.parseInline(lifted) : esc(lifted); }
  catch (e) { html = esc(lifted); }
  return _dropMath(html);
}
function typeset(el) {                       // KaTeX + Prism + sprites for a live DOM node
  if (!el) return;
  if (typeof renderMathInElement === 'function' && typeof katex !== 'undefined') {
    try {
      renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false, ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
      });
    } catch (e) { /* katex hiccup — leave TeX visible */ }
  }
  if (typeof Prism !== 'undefined' && typeof el.querySelector === 'function' && el.querySelector('pre code')) {
    try { Prism.highlightAllUnder(el); } catch (e) {}
  }
  drawSprites(el);
}

/* ================= TOASTS ================= */
function toast(msg, icon, ms) {
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = '<span class="tic" data-sprite="' + (icon || 'star') + '" data-px="16"></span><div>' + msg + '</div>';
  $('#toasts').appendChild(t); drawSprites(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, ms || 3200);
}
function flyXP(el, n) {
  if (!el) return;
  const f = document.createElement('div'); f.className = 'xpfly'; f.textContent = '+' + n + ' XP';
  el.appendChild(f); setTimeout(() => f.remove(), 1100);
}

/* ================= MODAL ================= */
const modal = () => $('#modal');
let lastFocus = null;
function openModal(html, title) {
  lastFocus = document.activeElement;
  $('#mTitle').textContent = title || 'INFO';
  $('#modalBody').innerHTML = html;
  const m = modal(); m.hidden = false;
  document.body.classList.add('modal-open');
  typeset($('#modalBody'));
  const fb = $('#modalBody').querySelector('button') || $('#mClose'); if (fb) fb.focus();
}
function closeModal() {
  const m = modal(); m.hidden = true;
  document.body.classList.remove('modal-open');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* ================= XP / BADGES / HUD ================= */
function gainXP(n, silent) {
  if (!n) return;
  const before = levelOf(S.xp);
  S.xp += n; save();
  const after = levelOf(S.xp);
  updateHUD();
  if (!silent) toast('+' + n + ' XP', 'coin', 2000);
  if (after > before) {
    sfx('level'); celebrate(130);
    const final = after === LEVELS.length - 1;
    openModal('<div style="text-align:center">' +
      '<p class="sec-kick" style="margin-top:4px">RANK PROMOTION</p>' +
      '<div style="font-family:var(--pf);font-size:34px;color:var(--gold);margin:14px 0;text-shadow:3px 3px 0 #001018">LV ' + (after + 1) + '</div>' +
      '<p style="font-family:var(--px);letter-spacing:1px;color:var(--cyan)">' + LEVELS[after].t + '</p>' +
      (final
        ? '<p class="small" style="margin-top:12px">You have reached the summit of the codex. The Void Trial still awaits a perfect run, Architect.</p>'
        : '<p class="small" style="margin-top:12px">' + LEVELS[after + 1].xp + ' XP to ' + LEVELS[after + 1].t + '.</p>') +
      '<div class="mbtns" style="justify-content:center"><button class="btn primary" id="mOk">CONTINUE</button></div></div>', 'LEVEL UP');
  }
  checkBadges();
}
function award(id) {
  if (S.badges.includes(id)) return;
  const b = BADGES.find(x => x.id === id); if (!b) return;
  S.badges.push(id); save();
  sfx('badge'); celebrate(60);
  toast('<b>BADGE UNLOCKED!</b><br>' + esc(b.name) + ' — ' + esc(b.desc), b.icon, 4200);
  gainXP(20, true);
}
function checkBadges() {
  const seenCount = Object.keys(S.seen).length;
  if (seenCount >= 10) award('read10');
  if (seenCount >= 30) award('read30');
  if (S.bestStreak >= 5) award('streak5');
  if (S.bestStreak >= 10) award('streak10');
  if (S.known.length >= 25) award('cards25');
  if (S.known.length >= 50) award('cards50');
  if (CARDS.length > 0 && S.known.length >= CARDS.length) award('cardsAll');
}
function doneQuests() { return MISSION_IDS.filter(id => S.completed[id]).length; }
function secPct(sid) {
  const bl = $$('#' + sid + ' article.block');
  if (!bl.length) return 0;
  const seen = bl.filter(b => S.seen[b.id]).length;
  return Math.round(seen / bl.length * 100);
}
function updateNavProgress() {
  NAV_ITEMS.forEach(it => {
    if (!it.prog) return;
    const bar = $('#np-' + it.id); if (!bar) return;
    const p = it.id === 'flash' ? (CARDS.length ? Math.round(S.known.length / CARDS.length * 100) : 0) : secPct(it.id);
    bar.querySelector('i').style.width = p + '%';
    const em = $('#np-' + it.id + 't'); if (em) em.textContent = p + '%';
    const chip = $('#chip-' + it.id);
    if (chip) { chip.textContent = p + '%'; chip.classList.toggle('done', p >= 100); }
    const mm = $('#mm-' + it.id);
    if (mm) { mm.textContent = p + '%'; mm.classList.toggle('done', p >= 100); }
  });
}
function updateHUD() {
  const lv = levelOf(S.xp), cur = LEVELS[lv], next = LEVELS[lv + 1];
  const pct = next ? Math.min(100, Math.round((S.xp - cur.xp) / (next.xp - cur.xp) * 100)) : 100;
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('#lvChip', 'LV' + (lv + 1));
  const xf = $('#xpFill'); if (xf) xf.style.width = pct + '%';
  set('#xpTx', S.xp + ' XP');
  set('#pcLv', 'LV ' + (lv + 1) + ' · ' + cur.t);
  set('#pcXp', next ? (S.xp + ' / ' + next.xp + ' XP') : (S.xp + ' XP · MAX'));
  const pf = $('#pcFill'); if (pf) pf.style.width = pct + '%';
  set('#streakN', S.streak);
  const sh = $('#streakHud'); if (sh) sh.classList.toggle('hot', S.streak >= 3);
  const dq = doneQuests();
  set('#stQuests', dq + '/' + MISSION_IDS.length);
  set('#stCards', S.known.length + '/' + CARDS.length);
  set('#stStreak', S.bestStreak);
  const hb = $('#homeBar'); if (hb) hb.style.width = (dq / MISSION_IDS.length * 100) + '%';
  set('#homeBarTx', dq + '/' + MISSION_IDS.length + ' quests');
  updateNavProgress();
}
function updateResume() {
  const nextT = MISSION_IDS.find(id => !S.completed[id]) || 'syslog';
  const startBtn = document.querySelector('.startbtn');
  if (startBtn) {
    startBtn.dataset.go = nextT;
    startBtn.innerHTML = '<span class="tri"></span>' + (S.xp > 0 ? 'RESUME QUEST' : 'ENTER THE CODEX');
  }
  const last = (S.lastScreen && S.lastScreen !== 'home' && document.getElementById(S.lastScreen)) ? S.lastScreen : null;
  const rb = $('#resumeBtn');
  if (rb) { rb.dataset.go = last || 'syslog'; rb.textContent = 'RESUME: ' + ((NAVMAP[last || 'syslog'] || {}).label || 'SYS-LOG'); }
}
/* ================= SCREEN BUILDERS ================= */
function sectorScreen(sec) {
  const blocks = sec.blocks.map((b, i) => {
    const tags = (b.tags && b.tags.length)
      ? '<span class="blk-tags">' + b.tags.map(t => '<span class="blk-tag">' + esc(t) + '</span>').join('') +
        '<span class="blk-check" data-sprite="check" data-px="15" data-tint="#5df2b8"></span></span>'
      : '<span class="blk-check" data-sprite="check" data-px="15" data-tint="#5df2b8"></span>';
    return '<article class="block panel" id="' + esc(b.id) + '" data-title="' + esc(b.title) + '">' +
      '<header class="blk-head"><span class="blk-idx">' + pad2(i + 1) + '</span><h3 class="blk-title">' + esc(b.title) + '</h3>' + tags + '</header>' +
      '<div class="md-body">' + mdBlock(b.md) + '</div></article>';
  }).join('\n');
  return '<section id="' + sec.id + '" class="screen" aria-labelledby="h-' + sec.id + '">' +
    '<div class="sec-head">' +
    '<span class="sec-ic" data-sprite="' + sec.icon + '" data-px="36"></span>' +
    '<span><p class="sec-kick">' + esc(sec.kick) + '</p><h2 class="sec-title" id="h-' + sec.id + '">' + esc(sec.title) + '</h2>' +
    '<p class="sec-sub">' + esc(sec.sub) + '</p></span>' +
    '<span class="sec-chip" id="chip-' + sec.id + '">0%</span></div>' +
    '<div class="panel" style="margin-bottom:16px"><div class="md-body">' + mdBlock(sec.intro) + '</div></div>' +
    blocks +
    '<div class="qz panel no-print" data-quiz="' + sec.id + '" aria-live="polite"></div>' +
    '</section>';
}
function chronoScreen() {
  const stages = window.CHRONO_STAGES || {};
  const rows = (window.CHRONO_ROWS || []).map((r, i) =>
    '<tr data-stage="' + r.stage + '"><td><span class="mchip m-' + r.stage + '">' + esc(r.era) + '</span></td>' +
    '<td><b>' + esc(r.event) + '</b></td><td class="act">' + esc(r.act) + '</td></tr>').join('');
  return '<section id="chrono" class="screen" aria-labelledby="h-chrono">' +
    '<div class="sec-head">' +
    '<span class="sec-ic" data-sprite="calendar" data-px="36"></span>' +
    '<span><p class="sec-kick">QUEST 11 · TEMPORAL</p><h2 class="sec-title" id="h-chrono">CHRONO MATRIX</h2>' +
    '<p class="sec-sub">Every pivot epoch — cosmic, human, memetic, aesthetic — in one grid</p></span>' +
    '<span class="sec-chip" id="chip-chrono">0%</span></div>' +
    '<article class="block panel" id="ch-1" data-title="Chrono Matrix master grid">' +
    '<header class="blk-head"><span class="blk-idx">01</span><h3 class="blk-title">The Master Grid</h3>' +
    '<span class="blk-check" data-sprite="check" data-px="15" data-tint="#5df2b8"></span></header>' +
    '<p>Four bands of time, color-coded: <span class="mchip m-big">BIG HISTORY</span> <span class="mchip m-anthro">ANTHROPOLOGY</span> <span class="mchip m-memes">MEMETICS</span> <span class="mchip m-vibes">AESTHETICS</span></p>' +
    '<div class="tl-tools no-print"><div class="chips" id="tlStages">' +
    '<button class="chip on" data-stage="all">All bands</button>' +
    Object.keys(stages).map(k => '<button class="chip" data-stage="' + k + '">' + esc(stages[k]) + '</button>').join('') +
    '</div><button class="btn" id="tlTest"><span data-sprite="qblock" data-px="14"></span> RECALL MODE</button></div>' +
    '<p class="small no-print" id="tlHint" hidden>Recall mode active: the right column is scrambled. Click a cell to reveal the answer. Keep the “All bands” filter on to reach every cell.</p>' +
    '<div class="tblwrap"><table class="tbl tlx" id="tlTable">' +
    '<thead><tr><th>Era</th><th>Pivot event</th><th class="act-h">Why it matters</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>' +
    '<aside class="co mem"><span class="co-tag"><span data-sprite="bulb" data-px="12"></span>MEMORY ANCHOR</span>' +
    '<p>Reveal every cell in Recall mode to earn the <b>CHRONO WEAVER</b> badge. The grid is the codex’s entire model of time, from nucleosynthesis to brainrot.</p></aside>' +
    '</article></section>';
}
function syslogScreen() {
  const sl = window.SYSLOG || { intro: '', panels: [] };
  const panels = sl.panels.map((p, i) =>
    '<div' + (p.id ? ' id="' + p.id + '"' : '') + ' class="panel" data-title="' + esc(p.title) + '"' + (i ? ' style="margin-top:16px"' : '') + '>' +
    '<h3 class="panel-kick" style="color:var(--gold);font-size:14px">' + esc(p.title) + '</h3>' +
    '<div class="md-body">' + mdBlock(p.md) + '</div></div>').join('');
  return '<section id="syslog" class="screen" aria-labelledby="h-syslog">' +
    '<div class="sec-head">' +
    '<span class="sec-ic" data-sprite="bulb" data-px="36"></span>' +
    '<span><p class="sec-kick">FAST REFERENCE</p><h2 class="sec-title" id="h-syslog">SYS-LOG / CHEAT SHEET</h2>' +
    '<p class="sec-sub">Every crucial constant, formula, chain and trap in one burst</p></span></div>' +
    '<div class="panel" style="margin-bottom:16px"><div class="md-body">' + mdBlock(sl.intro || '') + '</div></div>' +
    panels +
    '<div class="no-print" style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">' +
    '<button class="btn primary" data-go="flash"><span data-sprite="cards" data-px="16"></span> DRILL THE NEURAL MATRIX</button>' +
    '<button class="btn" data-go="exam"><span data-sprite="qblock" data-px="16"></span> ENTER THE VOID TRIAL</button></div>' +
    '</section>';
}
function flashScreen() {
  return '<section id="flash" class="screen noprintsec" aria-labelledby="h-fl">' +
    '<div class="sec-head">' +
    '<span class="sec-ic" data-sprite="cards" data-px="36"></span>' +
    '<span><p class="sec-kick">TRAINING DECK</p><h2 class="sec-title" id="h-fl">NEURAL MATRIX</h2>' +
    '<p class="sec-sub">Flip, recall, mark as mastered — ' + CARDS.length + ' cards loaded</p></span></div>' +
    '<div class="panel fpanel">' +
    '<div class="f-controls"><div class="chips" id="fFilters"></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    '<button class="btn" id="fShuffle"><span data-sprite="bolt" data-px="14"></span> SHUFFLE</button>' +
    '<button class="btn" id="fReset"><span data-sprite="trash" data-px="14"></span> RESET CARDS</button></div></div>' +
    '<div class="f-meta"><span id="fCount"></span><div class="bar slim" style="max-width:260px"><i id="fBar"></i></div><span id="fPosTx"></span></div>' +
    '<div id="fArea" aria-live="polite"></div>' +
    '<div class="f-nav">' +
    '<button class="btn" id="fPrev"><span class="ar l"></span>PREV</button>' +
    '<button class="btn primary" id="fFlip">FLIP CARD</button>' +
    '<button class="btn" id="fNext">NEXT<span class="ar"></span></button></div>' +
    '<div class="f-mark">' +
    '<button class="btn" id="fNo"><span data-sprite="cross" data-px="14" data-tint="#ff7b8a"></span> NOT MASTERED</button>' +
    '<button class="btn primary" id="fYes">MASTERED<span data-sprite="check" data-px="14" data-tint="#012a36"></span></button></div>' +
    '<p class="f-keys">Keys: <span class="kbd">←</span> <span class="kbd">→</span> navigate · <span class="kbd">SPACE</span> flip · <span class="kbd">1</span> not mastered · <span class="kbd">2</span> mastered</p>' +
    '</div></section>';
}
function examScreen() {
  const ex = window.MASTER_EXAM || { title: 'VOID TRIAL', desc: '' };
  return '<section id="exam" class="screen noprintsec" aria-labelledby="h-ex">' +
    '<div class="sec-head">' +
    '<span class="sec-ic" data-sprite="qblock" data-px="36"></span>' +
    '<span><p class="sec-kick">FINAL BOSS</p><h2 class="sec-title" id="h-ex">THE VOID TRIAL: BOSS EXAM</h2>' +
    '<p class="sec-sub">' + esc(ex.desc || 'A cross-sector boss exam') + '</p></span></div>' +
    '<div class="panel" style="margin-bottom:16px">' +
    '<p style="margin:0">The Void pulls questions from <b>all ten sectors</b> — subsea fiber to stellar collapse, gacha math to game theory. Each correct answer is <b>+10 XP</b>; a perfect run forges the <b>REALITY ARCHITECT</b> badge. Repeatable for record hunting.</p></div>' +
    '<div class="qz panel" data-quiz="exam" aria-live="polite"></div>' +
    '</section>';
}
function mountAll() {
  const mount = $('#mount'); if (!mount) return;
  let html = SECTORS.map(sectorScreen).join('\n');
  html += chronoScreen() + syslogScreen() + flashScreen() + examScreen();
  mount.innerHTML = html;
  $$('[data-quiz]', mount).forEach(cont => { renderQuiz(cont, cont.dataset.quiz); bindQuiz(cont); });
  typeset(mount);
}

/* ================= SCREEN ROUTING ================= */
let currentScreen = 'home';
function showScreen(id, noScroll) {
  if (!document.getElementById(id)) id = 'home';
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  $$('#nav .navit').forEach(b => { if (b.dataset.go === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  currentScreen = id;
  if (id !== 'home') { S.lastScreen = id; save(); }
  document.body.classList.remove('nav-open');
  if (!noScroll) window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
  const qc = $('#' + id + ' .qz[data-quiz]');
  if (qc) renderQuiz(qc, qc.dataset.quiz);
  if (id === 'flash') renderFlash();
  if (window.SystemsEngine) SystemsEngine.onScreen(id);
  if (window.NetworkEngine) { try { NetworkEngine.onScreen(id); } catch (e) { /* network layer optional */ } }
  if (SECTOR_IDS.indexOf(id) >= 0) award('first_boot');
  updateResume(); updateHUD();
  closeSearch();
}

/* ================= SEEN TRACKING ================= */
const io = new IntersectionObserver(es => {
  es.forEach(en => {
    if (!en.isIntersecting) return;
    const id = en.target.id;
    if (S.seen[id]) return;
    S.seen[id] = 1; save();
    en.target.classList.add('seen');
    const sec = en.target.closest('.screen');
    if (sec) {
      updateHUD(); checkBadges();
      if (secPct(sec.id) === 100 && !S.completed[sec.id]) {
        S.completed[sec.id] = 1; save();
        const label = (NAVMAP[sec.id] || {}).label || sec.id;
        sfx('done'); celebrate(85);
        toast('<b>SECTOR CLEARED!</b><br>' + esc(label) + ' — +15 XP', 'trophy', 3800);
        gainXP(15, true);
        if (window.SystemsEngine) SystemsEngine.onSectorComplete(sec.id);
      }
    }
  });
}, { threshold: 0, rootMargin: '0px 0px -50% 0px' });

/* ================= SEARCH (MiniSearch + substring fallback) ================= */
let MS = null, DOCMAP = {}, sItems = [], sActive = -1, sT = null, sAsk = 0, sAnswer = '', sCopyT = null, sBYOKReturnFocus = null;
function buildIndex() {
  const docs = [];
  $$('article.block, #syslog .panel[data-title]').forEach(b => {
    const sec = b.closest('.screen'); if (!sec) return;
    const item = NAVMAP[sec.id];
    const bt = b.querySelector('.blk-title');
    const title = b.dataset.title || (bt ? bt.textContent : '');
    const text = (b.textContent || '').replace(/\s+/g, ' ').trim();
    const doc = { id: b.id, sec: sec.id, secLabel: (item ? item.label + ' · ' + (item.sub || '') : sec.id), title, text };
    docs.push(doc); DOCMAP[b.id] = doc;
  });
  if (typeof MiniSearch === 'function') {
    try {
      MS = new MiniSearch({ fields: ['title', 'text'], storeFields: ['id'] });
      MS.addAll(docs);
    } catch (e) { MS = null; }
  }
}
const sIn = () => $('#search'), sRes = () => $('#searchResults');
function closeSearch(restoreFocus) {
  sAsk++;
  clearTimeout(sT);
  const r = sRes(), i = sIn();
  if (r) { r.hidden = true; r.classList.remove('ai'); r.setAttribute('role', 'listbox'); }
  if (i) { i.setAttribute('aria-expanded', 'false'); if (restoreFocus) i.focus(); }
  sActive = -1;
}
function askBar(q) {
  const shown = q.length > 80 ? q.slice(0, 80) + '…' : q;
  return '<button type="button" class="sr-ask" id="srAsk">' +
    '<span class="sr-ask-k">QUERY CODEX INTELLIGENCE</span>' +
    '<span class="sr-ask-q">✨ Ask Codex AI: &quot;' + esc(shown) + '&quot;</span></button>';
}
function doSearch() {
  sAsk++;
  const input = sIn(), r = sRes();
  const raw = (input.value || '').trim();
  const q = raw.toLowerCase();
  if (q.length < 2) { closeSearch(); return; }
  if (!S.stats.search) { S.stats.search = 1; save(); award('search'); }
  let hits = [];
  if (MS) {
    try {
      hits = MS.search(q, { fuzzy: 0.3, prefix: true, limit: 12, boost: { title: 3 } })
        .map(res => DOCMAP[res.id]).filter(Boolean);
    } catch (e) { hits = []; }
  }
  if (!hits.length) {  // offline-CDN / no-index fallback
    hits = Object.keys(DOCMAP).map(k => DOCMAP[k]).filter(d =>
      d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q)).slice(0, 14);
  }
  sItems = hits; sActive = 0;
  r.classList.remove('ai');
  r.setAttribute('role', 'listbox');
  let list;
  if (!hits.length) {
    list = '<div class="sr-empty">No packets matched “' + esc(raw) + '” — try another keyword, or ask the link.</div>';
  } else {
    const terms = q.split(/\s+/).filter(Boolean).slice(0, 3)
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const rx = terms.length ? new RegExp('(' + terms.join('|') + ')', 'i') : null;
    const mark = v => rx ? esc(v).replace(rx, '<mark>$1</mark>') : esc(v);
    list = hits.map((h, i) => {
      const lq = q, pos = h.text.toLowerCase().indexOf(lq);
      let snip = '';
      if (pos >= 0) { const st = Math.max(0, pos - 30); snip = (st > 0 ? '…' : '') + h.text.slice(st, st + 96) + '…'; }
      else if (terms.length) { const p2 = h.text.toLowerCase().indexOf(terms[0]); if (p2 >= 0) { const st = Math.max(0, p2 - 30); snip = (st > 0 ? '…' : '') + h.text.slice(st, st + 96) + '…'; } }
      return '<button class="sr-item' + (i === 0 ? ' act' : '') + '" data-i="' + i + '" role="option">' +
        '<span class="sr-sec">' + esc(h.secLabel) + '</span>' +
        '<span class="sr-t">' + mark(h.title) + '</span>' +
        (snip ? '<span class="sr-snip">' + mark(snip) + '</span>' : '') + '</button>';
    }).join('');
  }
  r.innerHTML = '<div class="sr-scroll">' + list + '</div>' + askBar(raw);
  r.hidden = false; input.setAttribute('aria-expanded', 'true');
}
function searchMarkdown(src) {
  const html = mdSafe(src);
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
    return window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  }
  return '<p>' + esc(src).replace(/\n/g, '<br>') + '</p>';
}
function openSearchBYOK() {
  const sys = window.SystemsEngine;
  if (!sys || !sys.openBYOK) return;
  sBYOKReturnFocus = document.activeElement;
  sys.openBYOK();
}
function askSearch(query) {
  const input = sIn(), r = sRes();
  const q = String(query == null ? (input.value || '') : query).trim();
  if (!r || q.length < 2) return;
  const id = ++sAsk;
  sAnswer = '';
  const sys = window.SystemsEngine;
  const client = sys && sys.BYOKClient;
  const live = !!(client && client.configured());
  r.classList.add('ai'); r.hidden = false;
  r.setAttribute('role', 'region');
  r.setAttribute('aria-label', 'Codex AI answer');
  input.setAttribute('aria-expanded', 'true');
  r.innerHTML = '<div class="sr-ai-bar">' +
    '<button type="button" class="sr-ai-back" id="srAskBack">← Back to matches</button>' +
    '<div class="sr-ai-h"><span class="sr-ai-k">POLYMATH BYOK SYNAPSE</span><b>' + esc(q) + '</b></div>' +
    '<button type="button" class="sr-ai-copy" id="srAskCopy" disabled>Copy</button></div>' +
    '<div class="sr-ai-body md-body" tabindex="0" aria-label="AI answer">' +
    (live ? '<div class="sr-ai-skeleton" role="status" aria-label="Generating answer"><span></span><span></span><span></span></div>' : '') +
    '</div>';
  drawSprites(r);
  const body = r.querySelector('.sr-ai-body');
  if (!live) {
    body.innerHTML = '<p class="sr-ai-wait">Configure a BYOK endpoint URL and model in the Operator Console, then retry. An API key is optional for local endpoints.</p>' +
      '<button type="button" class="btn primary" id="srAskConsole">OPEN OPERATOR CONSOLE</button>' +
      '<button type="button" class="btn" id="srAskRetry">TRY AGAIN</button>';
    const back = r.querySelector('.sr-ai-back'); if (back) back.focus();
    return;
  }
  const back = r.querySelector('.sr-ai-back'); if (back) back.focus();
  const excerpts = sItems.slice(0, 4).map(function (h) {
    return '• ' + h.title + ' (' + h.secLabel + '): ' + String(h.text || '').replace(/\s+/g, ' ').slice(0, 320);
  }).join('\n');
  let full = '', timer = null;
  const paint = function (final) {
    if (id !== sAsk) return;
    const b = r.querySelector('.sr-ai-body'); if (!b) return;
    b.innerHTML = searchMarkdown(full) + (final ? '' : '<span class="sr-caret" aria-hidden="true"></span>');
    if (final) typeset(b);
    b.scrollTop = b.scrollHeight;
  };
  client.query([
    { role: 'system', content: 'You are the archivist of the Polymath Codex, a study spanning systems, lore, and cosmos. The operator searched the codex and asked you to answer. Use the supplied excerpts when they are relevant; if they are not, answer from knowledge and say the codex did not cover it. Write GitHub-flavored markdown. Put mathematics in $...$ or $$...$$. Lead with the answer. Be concrete and compact. No greeting and no preamble.' },
    { role: 'user', content: 'Question: ' + q + (excerpts ? '\n\nCodex excerpts:\n' + excerpts : '') }
  ], { temperature: 0.4, max_tokens: 900, timeout: 50000, stream: true, onToken: function (_d, all) {
    if (id !== sAsk) return;
    full = all;
    sAnswer = all;
    const copy = r.querySelector('#srAskCopy'); if (copy) copy.disabled = !all;
    if (timer) return;
    timer = setTimeout(function () { timer = null; paint(false); }, 120);
  } }).then(function (res) {
    if (id !== sAsk) return;
    clearTimeout(timer);
    full = (res && res.text) || full || 'The link returned an empty reply.';
    sAnswer = full;
    const copy = r.querySelector('#srAskCopy'); if (copy) copy.disabled = false;
    paint(true);
  }).catch(function (err) {
    if (id !== sAsk) return;
    clearTimeout(timer);
    const b = r.querySelector('.sr-ai-body');
    const copy = r.querySelector('#srAskCopy'); if (copy) copy.disabled = !sAnswer;
    if (b) b.innerHTML = '<p class="sr-ai-err">' + esc((err && err.message) || 'The link failed.') + '</p>' +
      '<p><button type="button" class="btn" id="srAskRetry">TRY AGAIN</button></p>';
  });
}
function goSearch(i) {
  const h = sItems[i]; if (!h) return;
  showScreen(h.sec, true);
  closeSearch(); sIn().blur();
  setTimeout(() => {
    const el = document.getElementById(h.id);
    if (el) {
      el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
      el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl');
    }
  }, 90);
}
function bindSearch() {
  const input = sIn(), r = sRes();
  input.addEventListener('input', () => { sAsk++; clearTimeout(sT); sT = setTimeout(doSearch, 180); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (r.hidden || r.classList.contains('ai')) return; e.preventDefault();
      const n = sItems.length; if (!n) return;
      sActive = (sActive + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      $$('.sr-item', r).forEach((el, i) => el.classList.toggle('act', i === sActive));
      const act = $$('.sr-item', r)[sActive]; if (act) act.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); askSearch(); }
    else if (e.key === 'Enter') { if (!r.hidden && !r.classList.contains('ai') && sItems[sActive]) goSearch(sActive); else if (!r.hidden && !sItems.length) askSearch(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSearch(true); }
  });
  r.addEventListener('mousedown', e => {
    const it = e.target.closest('.sr-item');
    if (it) { goSearch(+it.dataset.i); return; }
    if (!e.target.closest('button,a,input,textarea,select,[tabindex]')) e.preventDefault();
  });
  r.addEventListener('click', e => {
    if (e.target.closest('#srAsk') || e.target.closest('#srAskRetry')) { askSearch(); return; }
    if (e.target.closest('#srAskBack')) { doSearch(); input.focus(); return; }
    if (e.target.closest('#srAskCopy')) {
      const button = e.target.closest('#srAskCopy');
      if (!sAnswer) return;
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        button.textContent = 'Unavailable'; button.setAttribute('aria-label', 'Clipboard access is unavailable');
        clearTimeout(sCopyT);
        sCopyT = setTimeout(() => { button.textContent = 'Copy'; button.removeAttribute('aria-label'); }, 1500);
        return;
      }
      navigator.clipboard.writeText(sAnswer).then(() => {
        button.textContent = 'Copied'; button.classList.add('copied'); button.setAttribute('aria-label', 'Response copied to clipboard');
        clearTimeout(sCopyT);
        sCopyT = setTimeout(() => {
          button.textContent = 'Copy'; button.classList.remove('copied'); button.removeAttribute('aria-label');
        }, 1500);
      }).catch(() => {
        button.textContent = 'Copy failed'; button.setAttribute('aria-label', 'Could not copy response');
        clearTimeout(sCopyT);
        sCopyT = setTimeout(() => {
          button.textContent = 'Copy'; button.removeAttribute('aria-label');
        }, 1500);
      });
      return;
    }
    if (e.target.closest('#srAskConsole')) {
      openSearchBYOK();
    }
  });
  document.addEventListener('pointerdown', e => {
    const byok = document.getElementById('byokModal');
    if (sBYOKReturnFocus && byok && byok.contains(e.target)) return;
    if (!r.hidden && !e.target.closest('.searchwrap')) closeSearch();
  });
  document.addEventListener('click', e => {
    if (!sBYOKReturnFocus) return;
    const modal = document.getElementById('byokModal');
    if (!modal || !modal.hidden || !(e.target.closest('#byokClose') || e.target === modal)) return;
    const target = sBYOKReturnFocus; sBYOKReturnFocus = null;
    target.focus();
  });
  input.addEventListener('blur', (e) => {
    if (e.relatedTarget && r.contains(e.relatedTarget)) return;
    setTimeout(() => { if (!r.contains(document.activeElement) && !r.matches(':hover')) closeSearch(); }, 180);
  });
}

/* ================= QUIZ ENGINE ================= */
const QSTATE = {};
function qzContainer(qid) { return document.querySelector('.qz[data-quiz="' + qid + '"]'); }
function fbHTML(ok, q) {
  return '<div class="qfb ' + (ok ? 'ok' : 'no') + '"><span class="fbic" data-sprite="' + (ok ? 'check' : 'cross') + '" data-px="18" data-tint="' + (ok ? '#5df2b8' : '#ff7b8a') + '"></span>' +
    '<div><b>' + (ok ? 'CORRECT! +10 XP' : 'INPUT REJECTED') + '</b><br>' + mdInline(q.why) + '</div></div>';
}
function renderQuiz(cont, qid) {
  const q = QUIZZES[qid]; if (!cont || !q) return;
  const st = QSTATE[qid], best = S.quizBest[qid], total = q.qs.length;
  if (!st) {
    cont.innerHTML = '<div class="qz-head"><span data-sprite="' + q.icon + '" data-px="30"></span>' +
      '<div><p class="qz-title">' + esc(q.title) + '</p><p class="qz-sub">' + esc(q.desc) + '</p></div></div>' +
      (best != null ? ('<p class="qz-best">Best score: <b>' + best + '%</b>' + (best === 100 ? ' — flawless.' : '') + '</p>') : '') +
      '<p class="qmeta">' + total + ' QUESTIONS · MULTIPLE CHOICE &amp; TRUE/FALSE · +10 XP PER CORRECT INPUT</p>' +
      '<div class="qnext center"><button class="btn primary" data-qstart="' + qid + '"><span class="tri"></span>INITIATE SIMULATION</button></div>';
  } else if (st.done) {
    const pct = st.pct, stars = pct === 100 ? 3 : pct >= 66 ? 2 : pct >= 40 ? 1 : 0;
    cont.innerHTML = '<div class="qz-head"><span data-sprite="' + q.icon + '" data-px="30"></span>' +
      '<div><p class="qz-title">RESULTS · ' + esc(q.title) + '</p><p class="qz-sub">Simulation complete</p></div></div>' +
      '<div class="qres"><div class="qstars">' +
      [0, 1, 2].map(i => '<span data-sprite="star" data-px="34" data-tint="' + (i < stars ? '#ffc874' : '#27566a') + '"></span>').join('') + '</div>' +
      '<p class="qscore">' + st.score + '/' + total + ' · ' + pct + '%' + (st.isBest ? '<span class="newbest">NEW RECORD!</span>' : '') + '</p>' +
      (pct === 100 ? '<p class="qperfect">FLAWLESS — the terminal bows to you.</p>' :
        pct >= 66 ? '<p class="qperfect">Strong run — a few packets dropped.</p>' :
        '<p class="small">Re-scan the lore blocks, then re-run the simulation.</p>') +
      '<div class="qnext center" style="margin-top:16px">' +
      '<button class="btn primary" data-qstart="' + qid + '">RUN AGAIN</button>' +
      (q.next ? '<button class="btn" data-go="' + q.next + '">NEXT SECTOR <span class="ar"></span></button>' : '') +
      '</div></div>' +
      (st.wrong.length ? '<div class="qwrong"><h4>RETRANSMIT &amp; STUDY:</h4>' + st.wrong.map(w =>
        '<div class="qw"><p class="qw-q">' + mdInline(w.q) + '</p>' +
        '<p>Your input: <b class="y">' + mdInline(w.picked) + '</b> → Correct: <b class="r">' + mdInline(w.correct) + '</b></p>' +
        '<p class="qw-why">' + mdInline(w.why) + '</p></div>').join('') + '</div>' : '');
  } else {
    const qIdx = st.order[st.i], question = q.qs[qIdx];
    if (!st.optsMap) st.optsMap = {};
    if (!st.elims) st.elims = {};
    if (!st.optsMap[qIdx]) {
      let opts = question.opts.map((t, idx) => ({ t, ok: idx === question.a }));
      if (question.opts.length > 2) opts = shuffle(opts);
      st.optsMap[qIdx] = opts;
    }
    const opts = st.optsMap[qIdx], res = st.results[qIdx];
    st.curQ = qIdx;
    const inv = (window.SystemsEngine && SystemsEngine.InventoryEngine) || null;
    const bagN = inv ? inv.bagCount() : 0;
    const elims = (st.elims[qIdx] || []);
    cont.innerHTML = '<div class="qz-head"><span data-sprite="' + q.icon + '" data-px="30"></span>' +
      '<div><p class="qz-title">' + esc(q.title) + '</p><p class="qz-sub">Question ' + (st.i + 1) + ' of ' + total + ' · Score: ' + st.score + '</p></div></div>' +
      '<p class="qtext">' + mdInline(question.q) + '</p>' +
      (st.advisor && st.advisorQ === qIdx ? '<div class="qadvisor"><b>🤖 ADVISOR LINK</b><br>' + esc(st.advisor) + '</div>' : '') +
      '<div class="qz-tools">' +
      '<button class="btn qz-items" id="qItems" title="Open the consumable item tray">🎒 ITEMS <b class="qbag-n' + (bagN ? '' : ' dim') + '">' + (bagN ? '×' + bagN : '×0') + '</b></button>' +
      '<button class="btn qz-advisor' + (st.advisorBusy ? ' busy" disabled' : '"') + ' id="qAdvisor" title="Request an analysis hint — live via your BYOK link, or offline heuristic">🤖 ADVISOR' + (st.advisorBusy ? ' · ANALYZING…' : '') + '</button>' +
      '</div>' +
      (st.itemsOpen ? quizTrayHTML(qid) : '') +
      '<div class="opts" role="group">' + opts.map((o, i) => {
        const elim = elims.indexOf(i) >= 0;
        return '<button class="opt' + (res ? (o.ok ? ' good' : (i === res.pick ? ' bad' : '')) : '') + (elim ? ' ghost' : '') + '" data-a="' + i + '"' + (res || elim ? ' disabled' : '') + '>' +
          '<span class="opt-key">' + String.fromCharCode(65 + i) + '</span><span>' + mdInline(o.t) + '</span></button>';
      }).join('') + '</div>' +
      '<div id="qfb">' + (res ? fbHTML(res.ok, question) : '') + '</div>' +
      '<div class="qnext" id="qnextRow"' + (res ? '' : ' hidden') + '><button class="btn primary" id="qNext">' +
      (st.i === total - 1 ? 'VIEW RESULTS' : 'NEXT') + ' <span class="ar"></span></button></div>';
  }
  typeset(cont);
}
function startQuiz(qid) {
  QSTATE[qid] = { i: 0, score: 0, wrong: [], results: {}, optsMap: {}, elims: {}, done: false,
    order: shuffle(Array.from(QUIZZES[qid].qs.keys())) };
  renderQuiz(qzContainer(qid), qid);
}
function answerQuiz(qid, btn) {
  const st = QSTATE[qid]; if (!st || st.done) return;
  const q = QUIZZES[qid], qIdx = st.curQ, question = q.qs[qIdx], opts = st.optsMap[qIdx];
  const pick = +btn.dataset.a, ok = opts[pick].ok;
  st.results[qIdx] = { ok, pick };
  if (ok) {
    st.score++; S.stats.ok++; S.streak++;
    if (S.streak > S.bestStreak) S.bestStreak = S.streak;
    sfx('ok'); flyXP(qzContainer(qid), 10); gainXP(10, true);
    if (question.badge) award(question.badge);
    if (S.streak > 0 && S.streak % 5 === 0) { gainXP(20, false); toast('<b>STREAK ' + S.streak + '!</b> Bonus +20 XP', 'flame'); }
    if (window.SystemsEngine) SystemsEngine.onCorrectAnswer(qid);
  } else {
    st.results[qIdx].prevStreak = S.streak;      // remembered for ⏳ Chrono Hourglass undo
    S.streak = 0; sfx('bad');
    st.wrong.push({ q: question.q, picked: opts[pick].t, correct: opts.find(o => o.ok).t, why: question.why });
  }
  S.stats.ans++; save(); updateHUD();
  renderQuiz(qzContainer(qid), qid);
  const nc = qzContainer(qid) ? qzContainer(qid).querySelector('#qNext') : null;
  if (nc) { nc.focus(); nc.scrollIntoView({ block: 'nearest' }); }
}
function finishQuiz(qid) {
  const q = QUIZZES[qid], st = QSTATE[qid];
  const pct = Math.round(st.score / q.qs.length * 100);
  const prev = S.quizBest[qid];
  st.isBest = (prev == null || pct > prev);
  if (st.isBest) S.quizBest[qid] = pct;
  S.quizDone[qid] = 1; save();
  let bonus = 0;
  if (pct === 100) bonus = 30; else if (pct >= 80) bonus = 15; else if (pct >= 60) bonus = 5;
  if (bonus) gainXP(bonus, false);
  if (pct === 100) { award('perfect'); celebrate(140); } else if (pct >= 80) celebrate(70);
  award('quiz1');
  if (qid !== 'exam') {
    if (SECTOR_IDS.every(k => S.quizDone[k])) award('allQuiz');
  } else {
    if (pct >= 75) award('boss75');
    if (pct === 100) award('boss100');
    if (pct === 100) celebrate(200);
  }
  if (window.SystemsEngine) SystemsEngine.onQuizFinish(qid, pct);
  st.done = true; st.pct = pct;
  updateHUD(); checkBadges();
  renderQuiz(qzContainer(qid), qid);
}
function bindQuiz(cont) {
  cont.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const qid = cont.dataset.quiz;
    if (b.dataset.qstart) { startQuiz(qid); sfx('click'); }
    else if (b.id === 'qNext') {
      const st = QSTATE[qid]; if (!st) return;
      st.i++;
      if (st.i >= QUIZZES[qid].qs.length) finishQuiz(qid);
      else renderQuiz(cont, qid);
      sfx('click');
    }
    else if (b.id === 'qItems') {
      const st = QSTATE[qid]; if (!st) return;
      st.itemsOpen = !st.itemsOpen; renderQuiz(cont, qid); sfx('flip');
    }
    else if (b.id === 'qAdvisor') { runAdvisor(qid, cont); }
    else if (b.dataset.quse) { useQuizItem(qid, b.dataset.quse, cont, b); }
    else if (b.classList.contains('opt') && !b.disabled) { answerQuiz(qid, b); }
  });
}

/* ================= IN-QUIZ ITEM DRAWER + AI ADVISOR ================= */
function quizTrayHTML(qid) {
  const st = QSTATE[qid]; if (!st) return '';
  const q = QUIZZES[qid], qIdx = st.curQ;
  const opts = st.optsMap[qIdx], res = st.results[qIdx];
  const inv = (window.SystemsEngine && SystemsEngine.InventoryEngine) || null;
  if (!inv) return '';
  const rows = inv.quizItems().map(function (it) {
    let hint = it.def.hint, off = '';
    if (it.count <= 0) { off = ' disabled'; hint = 'DEPLETED — launch Telemetry Bay probes to recover more'; }
    else if (it.key === 'hourglass' && !(res && !res.ok)) { off = ' disabled'; hint = 'NEEDS A WRONG ANSWER ON SCREEN'; }
    else if (it.key === 'decryptor' && (res || opts.length < 3)) { off = ' disabled'; hint = res ? 'NEEDS AN UNANSWERED QUESTION' : 'NEEDS ≥3 OPTIONS'; }
    return '<button class="qtray-item" data-quse="' + it.key + '"' + off + '>' +
      '<span class="qi-ic">' + it.def.emoji + '</span>' +
      '<span class="qi-tx"><b>' + esc(it.def.name) + ' <i>×' + it.count + '</i></b><span>' + esc(hint) + '</span></span>' +
      (off ? '' : '<span class="qi-use">USE ▸</span>') + '</button>';
  }).join('');
  return '<div class="qtray" id="qTray">' + rows + '</div>';
}

function itemFloat(cont, txt) {
  if (!cont) return;
  const f = document.createElement('div'); f.className = 'itemfly'; f.textContent = txt;
  cont.appendChild(f); setTimeout(() => f.remove(), 1500);
}

function useQuizItem(qid, key, cont, btn) {
  const st = QSTATE[qid]; if (!st || st.done) return;
  const q = QUIZZES[qid], qIdx = st.curQ, opts = st.optsMap[qIdx];
  const res = st.results[qIdx];
  const inv = (window.SystemsEngine && SystemsEngine.InventoryEngine) || null;
  const def = inv && inv.defOf(key);
  if (!inv || !def) return;
  if (inv.count(key) <= 0) { toast('Item depleted — launch probes to recover more.', 'bag', 2200); return; }
  /* timing validation (quiz state is engine-owned) */
  if (key === 'hourglass' && !(res && !res.ok)) {
    toast('<b>⏳ CHRONO HOURGLASS</b><br>Only engages a wrong answer currently on screen.', 'hour', 2600); sfx('bad'); return;
  }
  if (key === 'decryptor' && (res || opts.length < 3)) {
    toast('<b>🗝️ CIPHER DECRYPTOR</b><br>Needs an unanswered question with three or more options.', 'key', 2600); sfx('bad'); return;
  }
  const r = inv.quizConsume(key, { qid: qid });
  if (!r.ok) { toast(r.msg || 'Consumable unavailable.', 'bag', 2400); return; }
  sfx('heal');
  itemFloat(cont, def.emoji + ' ' + def.name.toUpperCase());
  if (r.effect === 'undo') {
    delete st.results[qIdx];
    if (st.wrong.length) st.wrong.pop();
    S.streak = (res && res.prevStreak) || 0;
    save(); updateHUD();
    toast('<b>⏳ TIMELINE REWOUND</b><br>The wrong input is erased — streak restored to ' + S.streak + '. Second chance armed.', 'hour', 3400);
  } else if (r.effect === 'eliminate') {
    if (!st.elims) st.elims = {};
    const cur = st.elims[qIdx] || [];
    const wrongIdx = opts.map(function (o, i) { return o.ok ? -1 : i; })
      .filter(function (i) { return i >= 0 && cur.indexOf(i) < 0; });
    shuffle(wrongIdx).slice(0, 2).forEach(function (i) { cur.push(i); });
    st.elims[qIdx] = cur;
    toast('<b>🗝️ CIPHER DECRYPTOR</b><br>Two incorrect options eliminated from the matrix.', 'key', 3000);
  } else if (r.msg) {
    toast('<b>' + def.emoji + ' ' + def.name.toUpperCase() + '</b><br>' + r.msg, 'bag', 3200);
  }
  renderQuiz(cont, qid);
}

function runAdvisor(qid, cont) {
  const st = QSTATE[qid]; if (!st || st.done || st.advisorBusy) return;
  const q = QUIZZES[qid], qIdx = st.curQ, question = q.qs[qIdx], opts = st.optsMap[qIdx];
  const res = st.results[qIdx];
  st.advisorBusy = true; renderQuiz(cont, qid);
  const sys = window.SystemsEngine;
  const live = sys && sys.BYOKClient && sys.BYOKClient.configured();
  const offlineHint = function (note) {
    let eliminated = false;
    if (!res && opts.length > 2 && st.elims) {
      const cur = st.elims[qIdx] || [];
      const wrongIdx = opts.map(function (o, i) { return o.ok ? -1 : i; })
        .filter(function (i) { return i >= 0 && cur.indexOf(i) < 0; });
      if (wrongIdx.length) { cur.push(wrongIdx[(Math.random() * wrongIdx.length) | 0]); st.elims[qIdx] = cur; eliminated = true; }
    }
    st.advisor = 'HEURISTIC SWEEP' + (note || '') + ' — ' +
      (eliminated
        ? 'one low-probability option has been struck from the matrix. Cross-reference the sector lore before committing.'
        : 'binary field detected — the sector lore holds the tiebreaker. Recall before you retransmit.');
  };
  if (live) {
    const optLines = opts.map(function (o, i) { return String.fromCharCode(65 + i) + ') ' + o.t; }).join('\n');
    sys.BYOKClient.query([
      { role: 'system', content: 'You are TERMINAL ADVISOR, a study assistant inside a retro learning game. Answer with ONE compact hint of at most two sentences. Narrow the choice WITHOUT stating which option letter or text is correct. No preamble, no headers.' },
      { role: 'user', content: 'Question: ' + question.q + '\nOptions:\n' + optLines + '\nGive one cryptic, factual hint.' }
    ], { temperature: 0.3, max_tokens: 140, timeout: 20000 }).then(function (r) {
      st.advisor = ('LIVE COMPLETION · ' + (r.ms || 0) + ' ms — ' + String(r.text || '').trim()).slice(0, 700);
    }).catch(function () {
      offlineHint(' (LINK OFFLINE — HEURISTIC FALLBACK)');
    }).then(function () {
      st.advisorBusy = false; st.advisorQ = qIdx; sfx('reveal'); renderQuiz(cont, qid);
    });
  } else {
    setTimeout(function () {
      offlineHint('');
      st.advisorBusy = false; st.advisorQ = qIdx; sfx('reveal'); renderQuiz(cont, qid);
    }, 420);
  }
}

/* ================= FLASHCARDS ================= */
let F = { filter: 'all', deck: [], idx: 0, flip: false, order: null };
function buildDeck() {
  let list = CARDS.filter(c => {
    if (F.filter === 'all') return true;
    if (F.filter === 'unknown') return !S.known.includes(c.i);
    return c.ch === F.filter;
  });
  if (F.order) {
    const pos = new Map(F.order.map((ci, k) => [ci, k]));
    list = list.slice().sort((a, b) => ((pos.get(a.i) != null ? pos.get(a.i) : 1e9) - (pos.get(b.i) != null ? pos.get(b.i) : 1e9)));
  }
  F.deck = list;
  F.idx = Math.max(0, Math.min(F.idx, list.length - 1));
  F.flip = false;
}
function renderFlash() {
  buildDeck();
  const ff = $('#fFilters');
  if (ff && !ff.dataset.built) {
    ff.innerHTML = '<button class="chip on" data-f="all">ALL <span class="cnt">' + CARDS.length + '</span></button>' +
      Object.keys(CH_LABEL).map(k => '<button class="chip" data-f="' + k + '">' + CH_LABEL[k] + ' <span class="cnt">' + CARDS.filter(c => c.ch === k).length + '</span></button>').join('') +
      '<button class="chip" data-f="unknown">UNMASTERED <span class="cnt pink">' + (CARDS.length - S.known.length) + '</span></button>';
    ff.dataset.built = '1';
  }
  if (ff) $$('button', ff).forEach(b => {
    b.classList.toggle('on', b.dataset.f === F.filter);
    if (b.dataset.f === 'unknown') b.querySelector('.cnt').textContent = CARDS.length - S.known.length;
  });
  const area = $('#fArea'); if (!area) return;
  if (!F.deck.length) {
    area.innerHTML = '<div class="fc-empty"><span data-sprite="trophy" data-px="40"></span>' +
      '<p style="margin-top:12px"><b>This deck is fully mastered!</b></p>' +
      '<p class="small">Every card in this filter is marked as mastered. Switch filters or reset your mastery marks.</p></div>';
    $('#fBar').style.width = '100%';
    $('#fCount').textContent = 'Mastered: ' + S.known.length + '/' + CARDS.length;
    $('#fPosTx').textContent = '';
    drawSprites(area); return;
  }
  const c = F.deck[F.idx], known = S.known.includes(c.i);
  area.innerHTML = '<button class="fc' + (F.flip ? ' fl' : '') + '" id="fcCard" aria-label="Flashcard — press to flip">' +
    (known ? '<span class="fc-star" data-sprite="star" data-px="18" data-tint="#ffc874" title="Mastered"></span>' : '') +
    '<span class="fc-in">' +
    '<span class="fc-face fc-front"><span class="fc-bab">' + (CH_LABEL[c.ch] || 'MIXED') + '</span>' +
    '<span class="fc-q">' + mdInline(c.q) + '</span><span class="fc-hint">— CLICK / SPACE TO FLIP —</span></span>' +
    '<span class="fc-face fc-back"><span class="fc-bab">DECRYPTED</span>' +
    '<span class="fc-a">' + mdInline(c.a) + '</span><span class="fc-hint">' + (known ? 'Marked as mastered' : 'Not yet mastered') + '</span></span>' +
    '</span></button>';
  $('#fCount').textContent = 'Mastered: ' + S.known.length + '/' + CARDS.length;
  $('#fPosTx').textContent = (F.idx + 1) + '/' + F.deck.length;
  $('#fBar').style.width = (CARDS.length ? S.known.length / CARDS.length * 100 : 0) + '%';
  typeset(area);
  const card = $('#fcCard'); if (card) card.addEventListener('click', flipCard);
}
function flipCard() {
  if (!F.deck.length) return;
  F.flip = !F.flip;
  const card = $('#fcCard'); if (card) card.classList.toggle('fl', F.flip);
  sfx('flip');
}
function nextCard() { if (!F.deck.length) return; F.idx = (F.idx + 1) % F.deck.length; F.flip = false; renderFlash(); }
function prevCard() { if (!F.deck.length) return; F.idx = (F.idx - 1 + F.deck.length) % F.deck.length; F.flip = false; renderFlash(); }
function markCard(v) {
  if (!F.deck.length) return;
  const c = F.deck[F.idx], pos = S.known.indexOf(c.i);
  if (v && pos < 0) {
    S.known.push(c.i); sfx('ok'); flyXP($('#fArea'), 5); gainXP(5, true);
  } else if (!v && pos >= 0) {
    S.known.splice(pos, 1); sfx('click');
  }
  save(); updateHUD(); checkBadges();
  renderFlash();
}

/* ================= CHRONO MATRIX ================= */
let tlTesting = false;
function tlAllRevealed() { return $$('#tlTable tbody tr').every(tr => S.tlRev[tr.dataset.k]); }
function initChrono() {
  const table = $('#tlTable'); if (!table) return;
  const rows = $$('#tlTable tbody tr');
  rows.forEach((tr, i) => tr.dataset.k = String(i));
  $('#tlStages').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#tlStages .chip').forEach(x => x.classList.toggle('on', x === b));
    const st = b.dataset.stage;
    rows.forEach(tr => { tr.hidden = (st !== 'all' && tr.dataset.stage !== st); });
    sfx('click');
  });
  $('#tlTest').addEventListener('click', () => {
    tlTesting = !tlTesting;
    $('#tlTable').classList.toggle('testing', tlTesting);
    $('#tlHint').hidden = !tlTesting;
    $('#tlTest').innerHTML = tlTesting
      ? '<span data-sprite="eye" data-px="14"></span> READ MODE'
      : '<span data-sprite="qblock" data-px="14"></span> RECALL MODE';
    drawSprites($('#tlTest'));
    if (tlTesting) {
      rows.forEach(tr => { if (S.tlRev[tr.dataset.k]) tr.querySelector('.act').classList.add('rev'); });
      if (tlAllRevealed()) award('chrono');
    }
    sfx('click');
  });
  $('#tlTable').addEventListener('click', e => {
    const td = e.target.closest('td.act');
    if (!td || !tlTesting || td.classList.contains('rev')) return;
    td.classList.add('rev'); sfx('reveal');
    S.tlRev[td.closest('tr').dataset.k] = 1; save();
    if (tlAllRevealed()) { award('chrono'); toast('Every timeline decoded — CHRONO WEAVER!', 'calendar'); }
  });
}

/* ================= MODALS: BADGES / HELP / RESET ================= */
function openBadges() {
  const got = S.badges.length;
  openModal('<h4>BADGES <span style="color:var(--gold)">' + got + '/' + BADGES.length + '</span></h4>' +
    '<div class="badges">' + BADGES.map(b => {
      const on = S.badges.includes(b.id);
      return '<div class="badge' + (on ? ' on' : '') + '"><span class="bic" data-sprite="' + b.icon + '" data-px="30" data-tint="' + (on ? '#ffc874' : '#5d8798') + '"></span>' +
        '<b>' + esc(b.name) + '</b><span>' + esc(b.desc) + '</span><em>' + (on ? 'UNLOCKED' : '???') + '</em></div>';
    }).join('') + '</div>' +
    '<div class="mbtns"><button class="btn primary" id="mOk">CLOSE</button></div>', 'BADGES');
}
function openHelp() {
  openModal('<h4>HOW TO RUN THE CODEX</h4>' +
    '<p>The Polymath Codex turns deep lore into a playable quest:</p>' +
    '<ul class="small"><li><b>Scan 11 quests</b> — every lore block you scroll through is logged; read them all to clear a sector (+15 XP).</li>' +
    '<li><b>Sector evaluations</b> — correct inputs are +10 XP; every 5-streak adds +20 XP; 100% unlocks stars and badges.</li>' +
    '<li><b>Neural Matrix</b> — mark flashcards as mastered; +5 XP each.</li>' +
    '<li><b>Chrono Matrix</b> — use Recall mode to test timeline memory.</li>' +
    '<li><b>The Void Trial</b> — the cross-sector boss exam. 75%+ earns TRIAL CHALLENGER; 100% forges REALITY ARCHITECT.</li>' +
    '<li><b>Telemetry Bay</b> — launch timed probes that keep running while you study. Quiz streaks trigger Telemetry Surges that shave real minutes off active probes; loot lands in the Data Cache.</li>' +
    '<li><b>Node Integrity</b> — sector knowledge decays on an Ebbinghaus curve. Run fast 3-question Targeted Audits to restore 100% and harden stability.</li>' +
    '<li><b>0600 Dispatch</b> — claim a deterministic daily transmission: +25 energy, +1 Chrono Metric, day streak maintained.</li>' +
    '<li><b>Item Cache</b> — ⚡ Energy Shards (+20 energy), ⏳ Chrono Hourglasses (erase a wrong answer mid-quiz, streak preserved), 🗝️ Cipher Decryptors (strike 2 wrong options), 🧪 Neural Tonics (restore a sector node to 100% without an audit) and ⚛️ Synthesis Artifacts (+50 XP). Open the <b>🎒 ITEMS</b> tray during any live evaluation, or spend them from the Telemetry Bay Data Cache.</li>' +
    '<li><b>Simulation Suites</b> — every sector hides a tactile terminal: the Caesar decryptor, the gacha pity engine, the live Neural Inference Lab, the chokepoint console, Dunbar’s scale, the Schwarzschild calculator, the transit photometer, the Prisoner’s Dilemma arena, the DNA synthesizer and the Decade Frequency Synthesizer.</li>' +
    '<li><b>Operator Console</b> — the ⚙️ CONSOLE button in the topbar holds interface preferences and the BYOK link. Wire any OpenAI-compatible endpoint (Gemini, DeepSeek, GLM, OpenRouter, OpenAI, Ollama) and the Neural Lab + quiz ADVISOR run live on your key; offline, deterministic simulators cover both.</li>' +
    '</ul>' +
    '<h4>KEYBOARD SHORTCUTS</h4>' +
    '<div class="helprow"><span>Focus the query box</span><span class="kbd">/</span></div>' +
    '<div class="helprow"><span>Cards: navigate</span><span><span class="kbd">←</span> <span class="kbd">→</span></span></div>' +
    '<div class="helprow"><span>Cards: flip</span><span class="kbd">SPACE</span></div>' +
    '<div class="helprow"><span>Cards: not mastered / mastered</span><span><span class="kbd">1</span> <span class="kbd">2</span></span></div>' +
    '<div class="helprow"><span>Close dialog / search</span><span class="kbd">ESC</span></div>' +
    '<div class="mbtns"><button class="btn primary" id="mOk">UNDERSTOOD!</button></div>', 'HELP');
}
function openReset() {
  openModal('<h4>WIPE ALL PROGRESS?</h4>' +
    '<p>XP, rank, badges, quiz scores, flashcard mastery, probe telemetry, data cache, dispatch streaks and settings will be deleted from this device. This cannot be undone.</p>' +
    '<div class="mbtns"><button class="btn" id="mCancel">CANCEL</button>' +
    '<button class="btn danger" id="mResetYes">YES, PURGE EVERYTHING</button></div>', 'RESET PROGRESS');
}
function openCardsReset() {
  openModal('<h4>RESET CARD MASTERY?</h4>' +
    '<p>All ' + CARDS.length + ' cards return to “not mastered”. XP you have already earned is unaffected.</p>' +
    '<div class="mbtns"><button class="btn" id="mCancel">CANCEL</button>' +
    '<button class="btn danger" id="mCardsYes">YES, RESET CARDS</button></div>', 'RESET CARDS');
}

/* ================= BUILDERS ================= */
function buildNav() {
  $('#nav').innerHTML = NAV_ITEMS.map(it =>
    '<button class="navit" data-go="' + it.id + '" id="nav-' + it.id + '">' +
    '<span class="nav-ic" data-sprite="' + it.icon + '" data-px="20"></span>' +
    '<span class="nav-tx"><b>' + esc(it.label) + '</b><span>' + esc(it.sub) + '</span></span>' +
    (it.prog ? '<span class="nav-pv"><em id="np-' + it.id + 't">0%</em><span class="npbar" id="np-' + it.id + '"><i></i></span></span>' : '') +
    '</button>').join('');
}
function buildMissionMap() {
  const map = $('#missionMap'); if (!map) return;
  map.innerHTML = MISSION_IDS.map(id => {
    const it = NAVMAP[id]; if (!it) return '';
    return '<button class="card" data-go="' + id + '"><span data-sprite="' + it.icon + '" data-px="26"></span>' +
      '<b>' + esc(it.label) + '</b><span class="cp">' + esc(it.sub) + '</span><span class="mm-pct" id="mm-' + id + '">0%</span></button>';
  }).join('');
}

/* ================= PREFS ================= */
function applyPrefs() {
  document.body.style.fontSize = S.font + 'px';
  document.body.classList.toggle('focusmode', !!S.focus);
  const fb = $('#focusBtn'); if (fb) fb.setAttribute('aria-pressed', String(!!S.focus));
  const sb = $('#sfxBtn'); if (sb) sb.setAttribute('aria-pressed', String(S.sfx !== false));
}
function setFont(n) {
  S.font = Math.max(14, Math.min(20, n));
  document.body.style.fontSize = S.font + 'px'; save();
}

/* ================= EVENTS ================= */
function bindEvents() {
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) { showScreen(g.dataset.go); sfx('click'); return; }
    const tile = e.target.closest('.tile');
    if (tile) { tile.classList.toggle('on'); sfx('flip'); }
  });
  $('#menuBtn').addEventListener('click', () => { document.body.classList.toggle('nav-open'); sfx('click'); });
  $('#sideCloseBtn').addEventListener('click', () => { document.body.classList.remove('nav-open'); sfx('click'); });
  $('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
  $('#fontMinus').addEventListener('click', () => { setFont(S.font - 1); sfx('click'); });
  $('#fontPlus').addEventListener('click', () => { setFont(S.font + 1); sfx('click'); });
  $('#sfxBtn').addEventListener('click', () => {
    S.sfx = (S.sfx === false); save();
    $('#sfxBtn').setAttribute('aria-pressed', String(S.sfx));
    if (S.sfx) sfx('ok');
    toast(S.sfx ? 'Sound effects ONLINE' : 'Sound effects MUTED', 'star', 1500);
  });
  $('#focusBtn').addEventListener('click', () => {
    S.focus = !S.focus; save(); applyPrefs(); sfx('click');
    toast(S.focus ? 'Focus mode ONLINE — happy scanning.' : 'Focus mode OFFLINE', 'eye', 1800);
  });
  $('#homeFocus').addEventListener('click', () => { S.focus = true; save(); applyPrefs(); sfx('click'); });
  $('#printBtn').addEventListener('click', () => window.print());
  $('#homePrint').addEventListener('click', () => window.print());
  $('#badgeBtn').addEventListener('click', openBadges);
  $('#helpBtn').addEventListener('click', openHelp);
  $('#homeHelp').addEventListener('click', openHelp);
  $('#resetBtn').addEventListener('click', openReset);
  $('#topBtn').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); sfx('click'); });
  $('#mClose').addEventListener('click', closeModal);
  modal().addEventListener('click', e => { if (e.target === modal()) closeModal(); });
  modal().addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $$('button,[href],input', modal()).filter(el => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  $('#modalBody').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'mOk' || b.id === 'mCancel') closeModal();
    else if (b.id === 'mResetYes') { try { localStorage.removeItem(KEY); } catch (_) {} if (window.SystemsEngine) SystemsEngine.hardReset(); location.reload(); }
    else if (b.id === 'mCardsYes') { S.known = []; save(); updateHUD(); buildDeck(); renderFlash(); closeModal(); toast('All mastery marks reset.', 'cards'); }
  });
  // flashcards
  $('#fPrev').addEventListener('click', prevCard);
  $('#fNext').addEventListener('click', nextCard);
  $('#fFlip').addEventListener('click', flipCard);
  $('#fYes').addEventListener('click', () => markCard(true));
  $('#fNo').addEventListener('click', () => markCard(false));
  $('#fShuffle').addEventListener('click', () => { F.order = shuffle(CARDS.map(c => c.i)); F.idx = 0; F.flip = false; renderFlash(); sfx('flip'); toast('Deck shuffled.', 'bolt', 1400); });
  $('#fReset').addEventListener('click', openCardsReset);
  $('#fFilters').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    F.filter = b.dataset.f; F.idx = 0; F.flip = false; renderFlash(); sfx('click');
  });
  bindSearch();
  // keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const bk = document.getElementById('byokModal');
      if (bk && !bk.hidden && window.SystemsEngine) {
        SystemsEngine.closeBYOK();
        if (sBYOKReturnFocus) { const target = sBYOKReturnFocus; sBYOKReturnFocus = null; target.focus(); }
        return;
      }
      const m = modal();
      if (m && !m.hidden) closeModal();
      else if (!sRes().hidden) closeSearch(true);
      else document.body.classList.remove('nav-open');
      return;
    }
    const m = modal();
    if (m && !m.hidden) return;
    const tag = e.target.tagName;
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === '/') { e.preventDefault(); sIn().focus(); return; }
    if (currentScreen === 'flash') {
      if (e.key === 'ArrowRight') { e.preventDefault(); nextCard(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevCard(); }
      else if (e.key === ' ') { if (tag === 'BUTTON') return; e.preventDefault(); flipCard(); }
      else if (e.key === '1') markCard(false);
      else if (e.key === '2') markCard(true);
    }
  });
  window.addEventListener('scroll', () => {
    $('#topBtn').classList.toggle('show', scrollY > 420);
  }, { passive: true });
}

/* ================= INIT ================= */
function init() {
  drawSprites();
  mountAll();
  buildNav();
  buildMissionMap();
  buildIndex();
  $$('article.block').forEach(b => {
    if (S.seen[b.id]) b.classList.add('seen');
    io.observe(b);
  });
  applyPrefs();
  bindEvents();
  initChrono();
  renderFlash();
  if (window.SystemsEngine) SystemsEngine.init();
  const start = (S.lastScreen && document.getElementById(S.lastScreen)) ? S.lastScreen : 'home';
  showScreen(start, true);
  drawSprites();
  updateHUD(); updateResume(); checkBadges();
}
document.addEventListener('DOMContentLoaded', init);

