/* lounge-games-sky.js — Celestial Survey (Observation Deck / Telescope Dome).
   MECHANIC: spatial pattern memory. A constellation is shown with its lines among decoy stars; then the sky ROTATES and the lines vanish. The player
   rebuilds the figure by joining the right pairs of stars. A wrong pair costs a life. Later charts rotate further, add more decoys and give less time.
   PRESENTATION: the game takes over the lounge viewport (CodexLoungeGames.host.stage): a full SVG night sky, not a popup card.
   INPUT: mouse/touch (tap snaps to the nearest star), keyboard (arrows jump to the nearest star in that direction, Enter/Space selects, Esc clears then leaves).
   Charts come from CodexLoungeWorld.SKY so the Dome atlas, the discoveries and the game always agree. */
(function (root) {
'use strict';
const doc = root.document, NS = 'http://www.w3.org/2000/svg';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LIVES = 3, CX = 240, CY = 135, ROT = [18, 28, -42, 58, -75, 96], OBS = [9, 8, 7, 6, 5, 4.5];   /* rotation (deg) and observe seconds per chart */
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* pure layout: pattern in a 220×170 box centred on the field, plus decoys that keep clear of every pattern star and of each other */
function layout(chart, level, rng) {
  const stars = chart.s.map((s, i) => ({ id: i, x: 130 + s[0] * 220, y: 50 + s[1] * 170, pat: true, r: 3.2 })), want = 7 + 4 * level;
  let guard = 0; while (stars.length < chart.s.length + want && guard++ < 4000) {
    const x = 22 + rng() * 436, y = 20 + rng() * 230; if (stars.every(s => Math.hypot(s.x - x, s.y - y) > (s.pat ? 30 : 24))) stars.push({ id: stars.length, x: x, y: y, pat: false, r: 1.6 + rng() * 1.6 });
  }
  return stars;
}
const rotPt = (p, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), dx = p.x - CX, dy = p.y - CY; return { x: CX + dx * c - dy * s, y: CY + dx * s + dy * c }; };
/* keyboard navigation: the star nearest to `from` in the pressed direction (within a 60° cone, else the closest by angle-weighted distance) */
function neighbour(pts, from, dir) {
  let best = -1, bs = Infinity; pts.forEach((p, i) => { if (i === from) return; const dx = p.x - pts[from].x, dy = p.y - pts[from].y, d = Math.hypot(dx, dy) || 1, dot = (dx * dir[0] + dy * dir[1]) / d; if (dot < .3) return; const sc = d * (2 - dot); if (sc < bs) { bs = sc; best = i; } });
  return best;
}

function start(opts) {
  opts = opts || {}; const W = root.CodexLoungeWorld, G = root.CodexLoungeGames, SKY = W && W.SKY, host = opts.host || (G && G.host);
  const stage = host && host.stage && SKY ? host.stage({ id: 'survey', label: 'Celestial Survey', cls: 'lgs-sky' }) : null;
  const reduced = opts.reduced != null ? !!opts.reduced : !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let joined = false, anim = false, lock = 0, dead = false, ended = false, level = 0, run = 0, lives = LIVES, edges = [], done = {}, sel = -1, fi = 0, phase = 'menu', stars = [], pts = [], mistakes = 0, score = 0, early = false; const timers = new Set();
  const unlocked = Math.min(SKY ? SKY.length : 1, Math.max(0, opts.cleared | 0) + 1);
  const ctl = { el: stage && stage.el, get dead() { return dead; }, get core() { return { phase: phase, level: level + 1, lives: lives, edges: edges.length, need: edges.length && SKY ? SKY[level].e.length : 0, stars: stars, pts: pts, sel: sel, done: done }; } };
  if (!stage) { dead = true; if (opts.onClose) opts.onClose(ctl); return ctl; }
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
  const el = stage.el;
  const chart = () => SKY[level], rot = () => (phase === 'find' || phase === 'done' ? ROT[level] || 0 : 0);
  const result = x => Object.assign({ won: false, score: score, rounds: Object.keys(done).length, lives: lives, mistakes: mistakes, quit: false, level: level + 1 }, x);
  const msg = t => { const m = el.querySelector('.lgs-msg'); if (m) m.textContent = t; };
  const hearts = () => '❤️'.repeat(lives) + '🖤'.repeat(LIVES - lives);

  function shell(inner, acts, sub) {
    el.innerHTML = '<div class="lgs-h"><b>🔭 Celestial Survey</b><span class="lgs-sub">' + esc(sub || '') + '</span><span class="lgs-hearts" role="img" aria-label="' + lives + ' of ' + LIVES + ' lives">' + hearts() + '</span><button type="button" class="lgs-x" data-a="close" aria-label="Leave the survey">✕</button></div>' +
      '<div class="lgs-main">' + inner + '</div><div class="lgs-f"><p class="lgs-msg" role="status" aria-live="polite"></p><div class="lgs-acts">' + acts + '</div></div>';
  }
  function menu() {
    phase = 'menu'; sel = -1;
    shell('<div class="lgs-menu"><p>Pick a chart. The atlas in the Dome shows the next shape to study; clear a chart to unlock the next.</p>' + SKY.map((c, i) => '<button type="button" class="lgs-chart" data-chart="' + i + '"' + (i + 1 > unlocked ? ' disabled' : '') + '><b>' + (i + 1) + '. ' + (i + 1 > unlocked ? '???' : esc(c.n)) + '</b><small>' + (i + 1 > unlocked ? '🔒 locked' : c.s.length + ' stars · ' + Math.abs(ROT[i]) + '° rotation') + '</small></button>').join('') + '</div>', '<button type="button" class="btn" data-a="close">Close</button>', 'Choose a chart');
    const f = el.querySelector('.lgs-chart:not([disabled])'); if (f) f.focus();
  }
  function begin(i) {
    level = Math.max(0, Math.min(SKY.length - 1, i)); run++; lives = LIVES; edges = []; done = {}; sel = -1; mistakes = 0; score = 0; early = false; ended = false;
    const rng = opts.rng || mulberry(level * 977 + run * 131 + 7); stars = layout(chart(), level, rng); phase = 'observe'; fi = 0; draw(); watch();
  }
  /* SVG scene. Everything inside <g class="sky"> is rotated together, which is what makes "the sky turned" visible. */
  function draw() {
    const c = chart(), th = rot(); pts = stars.map(s => rotPt(s, th));
    let svg = '<svg class="lgs-svg" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><radialGradient id="lgsG" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#16265e"/><stop offset="1" stop-color="#03061a"/></radialGradient></defs><rect width="480" height="270" fill="url(#lgsG)"/>';
    const dust = mulberry(4242); for (let k = 0; k < 46; k++) svg += '<circle cx="' + Math.round(dust() * 480) + '" cy="' + Math.round(dust() * 270) + '" r="' + (.5 + dust() * .5).toFixed(2) + '" fill="#fff" opacity="' + (.15 + dust() * .35).toFixed(2) + '"/>';
    svg += '<g class="sky' + (reduced ? ' still' : '') + '" style="transform-origin:' + CX + 'px ' + CY + 'px;transform:rotate(' + (anim ? 0 : th) + 'deg)">';
    if (phase === 'observe' || phase === 'done') c.e.forEach(e => { const a = stars[e[0]], b = stars[e[1]]; svg += '<line class="lgs-line' + (phase === 'observe' ? ' show' : ' hit') + '" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>'; });
    edges.forEach((e, k) => { const a = stars[e[0]], b = stars[e[1]]; svg += '<line class="lgs-line hit' + (joined && k === edges.length - 1 ? ' new' : '') + '" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>'; });
    stars.forEach((s, i) => { svg += '<circle class="lgs-star' + (phase === 'observe' && s.pat ? ' pat' : '') + (i === sel ? ' sel' : '') + (i === fi && phase === 'find' ? ' foc' : '') + '" data-s="' + i + '" cx="' + s.x + '" cy="' + s.y + '" r="' + s.r + '"/>'; });
    joined = false; svg += '</g></svg>';
    shell('<div class="lgs-field" tabindex="0" role="application" aria-label="Star field. Arrow keys move between stars, Enter or Space selects a star.">' + svg + '</div>',
      phase === 'observe' ? '<button type="button" class="btn primary" data-a="ready">Ready — turn the sky</button><button type="button" class="btn" data-a="menu">Charts</button>' : '<button type="button" class="btn" data-a="menu">Charts</button><button type="button" class="btn" data-a="retry">Restart chart</button>',
      c.n + ' · chart ' + (level + 1) + ' of ' + SKY.length);
    msg(phase === 'observe' ? 'Study ' + c.n + ': ' + c.s.length + ' stars joined by ' + c.e.length + ' lines. The sky will turn about ' + Math.abs(ROT[level]) + '° and the lines will disappear.' : 'Join the stars that formed ' + c.n + '. Lines left: ' + (c.e.length - edges.length) + '.');
    const f = el.querySelector('.lgs-field'); if (f && phase === 'find') f.focus({ preventScroll: true });
    if (anim) { anim = false; const g = el.querySelector('.sky'), raf = root.requestAnimationFrame || (fn => setTimeout(fn, 16)); if (g) raf(() => raf(() => { g.style.transform = 'rotate(' + th + 'deg)'; })); }
  }
  let watchId = 0;
  function watch() { if (watchId) { clearTimeout(watchId); timers.delete(watchId); } const ms = OBS[level] * 1000 * (reduced ? 2 : 1); watchId = later(() => { if (phase === 'observe') turn(); }, ms); }
  function turn() { if (phase !== 'observe') return; phase = 'find'; sel = -1; anim = !reduced && !!ROT[level]; lock = anim ? Date.now() + 950 : 0; fi = nearestTo(240, 135); draw(); }
  const nearestTo = (x, y) => { let b = 0, d = 1e9; pts.forEach((p, i) => { const k = Math.hypot(p.x - x, p.y - y); if (k < d) { d = k; b = i; } }); return b; };
  function pick(i) {
    if (phase !== 'find' || i < 0 || Date.now() < lock) return; const c = chart(), n = c.s.length;
    if (sel < 0) { sel = i; fi = i; draw(); msg('Star selected. Choose the star it connects to.'); return; }
    if (sel === i) { sel = -1; draw(); msg('Selection cleared.'); return; }
    const a = Math.min(sel, i), b = Math.max(sel, i), idx = c.e.findIndex(e => Math.min(e[0], e[1]) === a && Math.max(e[0], e[1]) === b);
    if (idx >= 0 && a < n && b < n) {
      if (done[idx]) { sel = -1; draw(); msg('Those two are already joined.'); return; }
      done[idx] = 1; edges.push(c.e[idx]); joined = !reduced; score += 10 + Math.max(0, 4 - mistakes) * 2; sel = -1; fi = i; if (root.sfx) root.sfx('click');
      if (edges.length === c.e.length) return win(); draw(); msg('Joined! Lines left: ' + (c.e.length - edges.length) + '.');
    } else {
      lives--; mistakes++; sel = -1; if (root.sfx) root.sfx('bad'); const fld = el.querySelector('.lgs-field'); if (fld && !reduced) { fld.classList.remove('shake'); void fld.offsetWidth; fld.classList.add('shake'); }
      if (lives <= 0) return lose(); draw(); msg('Not a line in this figure. ' + lives + (lives === 1 ? ' life' : ' lives') + ' left.');
    }
  }
  function finish(won) {
    if (ended) return; ended = true; phase = 'done'; score = won ? score + lives * 10 + (early ? 5 : 0) : score; const res = result({ won: won, score: score });
    if (G && G.report) G.report('survey', res); if (opts.onEnd) opts.onEnd(res); return res;
  }
  function win() { const c = chart(); finish(true); draw(); const nx = level + 1 < SKY.length;
    el.querySelector('.lgs-acts').innerHTML = (nx ? '<button type="button" class="btn primary" data-a="next">Next chart</button>' : '') + '<button type="button" class="btn" data-a="retry">Again</button><button type="button" class="btn" data-a="menu">Charts</button><button type="button" class="btn" data-a="close">Close</button>';
    msg(c.n + ' charted! Score ' + score + '. ' + c.fact); const b = el.querySelector('.lgs-acts .btn'); if (b) b.focus(); }
  function lose() { finish(false); draw(); el.querySelector('.lgs-acts').innerHTML = '<button type="button" class="btn primary" data-a="retry">Try again</button><button type="button" class="btn" data-a="menu">Charts</button><button type="button" class="btn" data-a="close">Close</button>'; msg('The sky slipped away. Study the shape again and retry.'); const b = el.querySelector('.lgs-acts .btn'); if (b) b.focus(); }

  el.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'), ch = e.target.closest('[data-chart]'); if (dead) return;
    if (ch && !ch.disabled) { begin(+ch.dataset.chart); return; }
    if (!a) return; const k = a.dataset.a;
    if (k === 'close') ctl.quit('close'); else if (k === 'menu') { menu(); } else if (k === 'ready') { early = true; turn(); } else if (k === 'retry') begin(level); else if (k === 'next') begin(level + 1);
  });
  el.addEventListener('pointerdown', e => {   /* tap snaps to the nearest star within 28 units, so small stars are easy to hit on a phone */
    const svg = el.querySelector('.lgs-svg'); if (!svg || phase !== 'find' || !e.target.closest('.lgs-field')) return;
    const r = svg.getBoundingClientRect(), k = Math.min(r.width / 480, r.height / 270), ox = r.left + (r.width - 480 * k) / 2, oy = r.top + (r.height - 270 * k) / 2, x = (e.clientX - ox) / k, y = (e.clientY - oy) / k;
    const i = nearestTo(x, y); if (Math.hypot(pts[i].x - x, pts[i].y - y) <= 28) { e.preventDefault(); pick(i); }
  });
  function onKey(e) {
    if (dead) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (sel >= 0) { sel = -1; draw(); msg('Selection cleared.'); } else ctl.quit('esc'); return; }
    if (phase !== 'find' || !el.contains(doc.activeElement) || !doc.activeElement.classList.contains('lgs-field')) return;
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[e.key]) { e.preventDefault(); const n = neighbour(pts, fi, dirs[e.key]); if (n >= 0) { fi = n; draw(); const s = pts[n]; msg('Star ' + (n + 1) + (sel === n ? ' (selected)' : '') + ' at ' + Math.round(s.x / 48) + ',' + Math.round(s.y / 27) + '.'); } }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(fi); }
  }
  doc.addEventListener('keydown', onKey, true);
  Object.assign(ctl, {
    pick: pick, begin: begin, turn: turn,
    quit(why) { if (dead) return; const was = ended || phase === 'menu' || !edges.length && !mistakes; this.destroy(); if (!was) { const res = result({ quit: true, aborted: why || '' }); if (G && G.report) G.report('survey', res); if (opts.onEnd) opts.onEnd(res); } },
    destroy() { if (dead) return; dead = true; timers.forEach(t => clearTimeout(t)); timers.clear(); doc.removeEventListener('keydown', onKey, true); stage.close(); try { if (opts.onClose) opts.onClose(ctl); } catch (e) {} }
  });
  if (opts.level) begin((opts.level | 0) - 1); else menu();
  return ctl;
}
const meta = { n: 'Celestial Survey', room: 'dome', host: 'Dome telescope', mech: 'Spatial memory', blurb: 'Memorise a constellation, then rebuild it after the sky turns. Later charts rotate further with more decoys.' };
if (root.CodexLoungeGames && root.CodexLoungeGames.register) root.CodexLoungeGames.register('survey', { start: start, meta: meta, layout: layout, neighbour: neighbour, ROT: ROT, OBS: OBS });
if (typeof module !== 'undefined' && module.exports) module.exports = { layout: layout, neighbour: neighbour, start: start, meta: meta };
})(typeof window !== 'undefined' ? window : globalThis);
