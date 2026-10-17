/* lounge-games.js — CodexLoungeGames: self-contained lounge minigames. DOM overlays only: no canvas, no network, no globals beyond the
   optional sfx(). Every game is start(opts) → controller; the controller owns its overlay, timers and key listener and releases all of
   them in destroy(). Pure rules live in a separate Core class so they can be tested without a DOM.
   Game 1 — Order Up (Starlight Café): memorize the ticket, tap it back. 6 orders (3→8 items), 3 lives. */
(function (root) {
'use strict';
const ITEMS = [['Espresso', '☕'], ['Matcha', '🍵'], ['Boba', '🧋'], ['Croissant', '🥐'], ['Cake', '🍰'], ['Milk', '🥛']];
const ROUNDS = 6, START_LEN = 3, LIVES = 3;
const showMs = (len, reduced) => (1500 + 650 * len) * (reduced ? 2 : 1);      /* memorize window; doubled for reduced-motion users */
const sfx = n => { try { if (typeof root.sfx === 'function') root.sfx(n); } catch (e) {} };
function makeSeq(len, rng) {
  const s = []; let guard = 0;
  while (s.length < len) { const v = Math.floor(rng() * ITEMS.length) % ITEMS.length; if (s.length >= 2 && s[s.length - 1] === v && s[s.length - 2] === v && guard++ < 50) continue; s.push(v); }
  return s;
}

/* ---------- rules (no DOM) ---------- */
function Core(rng) { this.rng = rng || Math.random; this.reset(); }
Core.prototype.reset = function () { this.round = 0; this.lives = LIVES; this.score = 0; this.cleared = 0; this.mistakes = 0; this.phase = 'idle'; this.seq = []; this.pos = 0; };
Core.prototype.len = function () { return START_LEN + this.round; };
Core.prototype.deal = function () { this.seq = makeSeq(this.len(), this.rng); this.pos = 0; this.phase = 'show'; return this.seq; };
Core.prototype.replay = function () { this.pos = 0; this.phase = 'show'; };
Core.prototype.recall = function () { if (this.phase === 'show') { this.phase = 'input'; this.pos = 0; } };
/* → 'ok' (right, more to go) | 'round' (ticket done) | 'won' | 'wrong' (life lost, same ticket again) | 'lost' | null (ignored: not accepting input) */
Core.prototype.press = function (i) {
  if (this.phase !== 'input') return null;
  if (i === this.seq[this.pos]) {
    this.pos++; if (this.pos < this.seq.length) return 'ok';
    this.cleared++; this.score += 10 + 2 * this.len();
    if (this.round + 1 >= ROUNDS) { this.score += 5 * this.lives; this.phase = 'won'; return 'won'; }
    this.round++; this.phase = 'between'; return 'round';
  }
  this.lives--; this.mistakes++; this.pos = 0;
  if (this.lives <= 0) { this.phase = 'lost'; return 'lost'; }
  this.phase = 'between'; return 'wrong';
};

/* ---------- Order Up UI ---------- */
function startOrderUp(opts) {
  opts = opts || {};
  const doc = document, host = opts.host || doc.body, who = String(opts.npc || 'Mira');
  const reduced = opts.reduced != null ? !!opts.reduced : !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const core = new Core(opts.rng), timers = new Set(), prevFocus = doc.activeElement;
  let dead = false, finished = false, hold = 0;
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
  const clearHold = () => { if (hold) { clearTimeout(hold); timers.delete(hold); hold = 0; } };

  const el = doc.createElement('div'); el.className = 'lgx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'lgxT');
  el.innerHTML = '<div class="lgx-card"><header class="lgx-h"><b id="lgxT">☕ Order Up</b><span class="lgx-who"></span><span class="lgx-hearts" role="img"></span></header>' +
    '<p class="lgx-round"></p><ol class="lgx-ticket"></ol><div class="lgx-bar" hidden><i></i></div><p class="lgx-msg" role="status" aria-live="polite"></p>' +
    '<div class="lgx-items" role="group" aria-label="Menu">' + ITEMS.map((it, i) => '<button type="button" class="lgx-it" data-i="' + i + '" aria-label="' + it[0] + ' (key ' + (i + 1) + ')"><span class="lgx-e" aria-hidden="true">' + it[1] + '</span><span class="lgx-l">' + it[0] + '</span><kbd aria-hidden="true">' + (i + 1) + '</kbd></button>').join('') + '</div>' +
    '<div class="lgx-acts"><button type="button" class="btn primary" data-a="ready">Ready</button><button type="button" class="btn" data-a="again" hidden>Play again</button><button type="button" class="btn" data-a="quit">Quit</button></div></div>';
  const $ = s => el.querySelector(s), items = Array.from(el.querySelectorAll('.lgx-it')), ready = $('[data-a=ready]'), again = $('[data-a=again]'), quit = $('[data-a=quit]');
  $('.lgx-who').textContent = 'with ' + who;
  host.appendChild(el);

  const say = t => { $('.lgx-msg').textContent = t; };
  const setItems = on => items.forEach(b => { b.disabled = !on; });
  function paint() {
    $('.lgx-hearts').textContent = '❤️'.repeat(core.lives) + '🖤'.repeat(LIVES - core.lives); $('.lgx-hearts').setAttribute('aria-label', core.lives + ' of ' + LIVES + ' lives left');
    $('.lgx-round').textContent = 'Ticket ' + (core.round + 1) + ' of ' + ROUNDS + ' · ' + core.len() + ' items';
    const t = $('.lgx-ticket'); t.textContent = '';
    core.seq.forEach((v, j) => {
      const li = doc.createElement('li'); const showIt = core.phase === 'show' || (core.phase === 'input' && j < core.pos);
      li.className = showIt ? 'on' : ''; li.textContent = showIt ? ITEMS[v][1] + ' ' + ITEMS[v][0] : '?'; t.appendChild(li);
    });
  }
  function showOrder(fresh) {
    clearHold(); if (fresh) core.deal(); else core.replay();
    paint(); setItems(false); ready.hidden = false; again.hidden = true; quit.hidden = false;
    const ms = showMs(core.len(), reduced), bar = $('.lgx-bar');
    say(core.len() + ' items. Memorize the ticket' + (reduced ? ' (extra time given).' : '.')); ready.focus();
    if (reduced) bar.hidden = true; else { bar.hidden = false; const i = bar.firstElementChild; i.style.animation = 'none'; void i.offsetWidth; i.style.animation = 'lgxBar ' + ms + 'ms linear forwards'; }
    hold = later(recall, ms);
  }
  function recall() {
    clearHold(); core.recall(); if (core.phase !== 'input') return;
    ready.hidden = true; $('.lgx-bar').hidden = true; paint(); setItems(true); say('Your turn: 1 of ' + core.seq.length + '.'); items[0].focus();
  }
  function press(i) {
    const r = core.press(i); if (!r) return; sfx(r === 'wrong' || r === 'lost' ? 'bad' : 'click'); paint();
    if (r === 'ok') say('Good. ' + (core.pos + 1) + ' of ' + core.seq.length + '.');
    else if (r === 'round') { setItems(false); say('Order up! Next ticket…'); hold = later(() => showOrder(true), reduced ? 1200 : 900); }
    else if (r === 'wrong') { setItems(false); say('Not quite: ' + core.lives + (core.lives === 1 ? ' life' : ' lives') + ' left. Here is the ticket again.'); hold = later(() => showOrder(false), reduced ? 1600 : 1200); }
    else finish(r === 'won');
  }
  const result = extra => Object.assign({ won: false, score: core.score, rounds: core.cleared, lives: core.lives, mistakes: core.mistakes, quit: false }, extra);
  function finish(won) {
    if (finished) return; finished = true; clearHold(); setItems(false); ready.hidden = true; again.hidden = false; quit.textContent = 'Close'; $('.lgx-bar').hidden = true;
    say(won ? 'Shift complete! Score ' + core.score + '. ' + who + ' is thrilled.' : 'Out of lives after ' + core.cleared + ' of ' + ROUNDS + ' tickets. Score ' + core.score + '.'); sfx(won ? 'ok' : 'bad'); again.focus();
    if (opts.onEnd) opts.onEnd(result({ won: won }));
  }
  function onKey(e) {
    if (dead) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ctl.quit(); return; }
    if (e.key === 'Tab') {   /* keep focus inside the dialog */
      const f = Array.from(el.querySelectorAll('button:not([disabled]):not([hidden])')); if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (!el.contains(doc.activeElement)) { e.preventDefault(); a.focus(); } else if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
      return;
    }
    if (/^[1-6]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); press(+e.key - 1); }
  }
  el.addEventListener('click', e => {
    const it = e.target.closest('.lgx-it'), a = e.target.closest('[data-a]');
    if (it && !it.disabled) press(+it.dataset.i);
    else if (a) { const k = a.dataset.a; if (k === 'ready') recall(); else if (k === 'quit') ctl.quit(); else if (k === 'again') { core.reset(); finished = false; quit.textContent = 'Quit'; showOrder(true); } }
  });
  doc.addEventListener('keydown', onKey, true);

  const ctl = {
    core: core, el: el, reduced: reduced, showMs: showMs, get dead() { return dead; },
    /* leave early: reported once as a quit (never as a win/loss) unless the run already ended */
    quit: function (why) { if (dead) return; const was = finished; this.destroy(); if (!was && opts.onEnd) opts.onEnd(result({ quit: true, aborted: why || '' })); },
    /* release everything this game created; safe to call repeatedly */
    destroy: function () {
      if (dead) return; dead = true; timers.forEach(t => clearTimeout(t)); timers.clear(); hold = 0;
      doc.removeEventListener('keydown', onKey, true); if (el.parentNode) el.parentNode.removeChild(el);
      try { if (prevFocus && prevFocus.focus && doc.contains(prevFocus)) prevFocus.focus(); } catch (e) {}
    }
  };
  showOrder(true);
  return ctl;
}

root.CodexLoungeGames = { orderUp: { start: startOrderUp, Core: Core, ITEMS: ITEMS, ROUNDS: ROUNDS, LIVES: LIVES, showMs: showMs, makeSeq: makeSeq }, list: ['orderUp'] };
if (typeof module !== 'undefined' && module.exports) module.exports = root.CodexLoungeGames;
})(typeof window !== 'undefined' ? window : globalThis);
