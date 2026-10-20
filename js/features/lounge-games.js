/* lounge-games.js — CodexLoungeGames: self-contained lounge minigames. DOM overlays only: no canvas, no network, no globals beyond the
   optional sfx(). Every game is start(opts) → controller; the controller owns its overlay, timers and key listener and releases all of
   them in destroy(). Pure rules live in a separate Core class so they can be tested without a DOM.
   Lifecycle: a run ends → opts.onEnd(score) fires once per run while the controller (and its replay/close UI) stays alive; the overlay
   is only released by destroy()/quit()/Escape/Close, at which point opts.onClose() fires exactly once. Hosts must keep tracking a
   controller after onEnd and clear it from onClose — never from onEnd.
   Game 1 — Order Up (Starlight Café): memorize the ticket, tap it back. 6 orders (3→8 items), 3 lives. */
(function (root) {
'use strict';
const ITEMS = [['Espresso', '☕'], ['Matcha', '🍵'], ['Boba', '🧋'], ['Croissant', '🥐'], ['Cake', '🍰'], ['Milk', '🥛']];
const ROUNDS = 6, START_LEN = 3, LIVES = 3;
const showMs = (len, reduced) => (1500 + 650 * len) * (reduced ? 2 : 1);      /* memorize window; doubled for reduced-motion users */
const sfx = n => { try { if (typeof root.sfx === 'function') root.sfx(n); } catch (e) {} };
function makeSeq(len, rng, avoid) {
  const s = []; let guard = 0;
  while (s.length < len) { let v = Math.floor(rng() * ITEMS.length) % ITEMS.length; if (avoid != null && v === avoid) v = (v + 1) % ITEMS.length; if (s.length >= 2 && s[s.length - 1] === v && s[s.length - 2] === v && guard++ < 50) continue; s.push(v); }
  return s;
}
/* Shift tiers. Tier 1 is the classic game and is never altered. Higher tiers are opt-in (opts.tier) and add rules, never change tier 1's scoring. */
const TIERS = {
  1: { name: 'Classic shift', rounds: ROUNDS, start: START_LEN, mods: [] },
  2: { name: 'Lunch Rush', rounds: ROUNDS, start: START_LEN, mods: ['rush', 'allergy'], from: 1, streak: true },
  3: { name: 'Chef\'s Table', rounds: 7, start: 4, mods: ['rush', 'allergy', 'reverse'], from: 1, streak: true, double: 3 }
};
/* which modifiers a ticket carries: deterministic from (tier, round, rng). Ticket 1 is always plain so the rules are never a surprise on the first press. */
function pickMods(tier, round, rng) {
  const T = TIERS[tier]; if (!T || !T.mods.length || round < (T.from || 0)) return [];
  const pool = T.mods.slice(), out = [], n = T.double && round >= T.double ? 2 : 1;
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0]);
  return out;
}
const MOD_TEXT = { rush: ['\u26a1 RUSH', 'half the memorising time'], allergy: ['\ud83e\udd5c ALLERGY', 'never serve the crossed-out item'], reverse: ['\u21ba REVERSE', 'serve the ticket from last to first'] };

/* ---------- rules (no DOM) ---------- */
function Core(rng, tier) { this.rng = rng || Math.random; this.tier = TIERS[tier] ? tier : 1; this.cfg = TIERS[this.tier]; this.reset(); }
Core.prototype.reset = function () { this.round = 0; this.lives = LIVES; this.score = 0; this.cleared = 0; this.mistakes = 0; this.phase = 'idle'; this.seq = []; this.pos = 0; this.mods = []; this.ban = -1; this.rev = false; this.streak = 0; this.bestStreak = 0; this.ticketMiss = false; };
Core.prototype.len = function () { return this.cfg.start + this.round; };
Core.prototype.deal = function () {
  this.mods = pickMods(this.tier, this.round, this.rng); this.rev = this.mods.indexOf('reverse') >= 0; this.ticketMiss = false;
  this.ban = this.mods.indexOf('allergy') >= 0 ? Math.floor(this.rng() * ITEMS.length) % ITEMS.length : -1;
  this.seq = makeSeq(this.len(), this.rng, this.ban >= 0 ? this.ban : undefined); this.pos = 0; this.phase = 'show'; return this.seq;
};
Core.prototype.want = function () { return this.rev ? this.seq[this.seq.length - 1 - this.pos] : this.seq[this.pos]; };
Core.prototype.replay = function () { this.pos = 0; this.phase = 'show'; };
Core.prototype.recall = function () { if (this.phase === 'show') { this.phase = 'input'; this.pos = 0; } };
/* → 'ok' (right, more to go) | 'round' (ticket done) | 'won' | 'wrong' (life lost, same ticket again) | 'lost' | null (ignored: not accepting input) */
Core.prototype.press = function (i) {
  if (this.phase !== 'input') return null;
  if (i === this.want() && i !== this.ban) {
    this.pos++; if (this.pos < this.seq.length) return 'ok';
    this.cleared++; this.score += 10 + 2 * this.len();
    if (this.cfg.streak) { this.streak = this.ticketMiss ? 0 : this.streak + 1; this.bestStreak = Math.max(this.bestStreak, this.streak); this.score += Math.min(this.streak - 1, 3) * 3 > 0 ? Math.min(this.streak - 1, 3) * 3 : 0; }   /* streak bonus: tiers 2+ only */
    if (this.round + 1 >= this.cfg.rounds) { this.score += 5 * this.lives; this.phase = 'won'; return 'won'; }
    this.round++; this.phase = 'between'; return 'round';
  }
  this.lives--; this.mistakes++; this.pos = 0; this.ticketMiss = true; this.streak = 0;
  if (this.lives <= 0) { this.phase = 'lost'; return 'lost'; }
  this.phase = 'between'; return 'wrong';
};

/* ---------- Order Up UI ---------- */
function startOrderUp(opts) {
  opts = opts || {};
  const doc = document, host = opts.host || doc.body, who = String(opts.npc || 'Mira');
  const reduced = opts.reduced != null ? !!opts.reduced : !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tier = TIERS[opts.tier | 0] ? opts.tier | 0 : 1, core = new Core(opts.rng, tier), timers = new Set(), prevFocus = doc.activeElement;
  let dead = false, finished = false, hold = 0;
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
  const clearHold = () => { if (hold) { clearTimeout(hold); timers.delete(hold); hold = 0; } };

  const el = doc.createElement('div'); el.className = 'lgx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'lgxT');
  el.innerHTML = '<div class="lgx-card"><header class="lgx-h"><b id="lgxT">☕ Order Up' + (tier > 1 ? ' · ' + TIERS[tier].name : '') + '</b><span class="lgx-who"></span><span class="lgx-hearts" role="img"></span></header>' +
    '<p class="lgx-round"></p>' + (tier > 1 ? '<p class="lgx-mods" aria-live="polite"></p>' : '') + '<ol class="lgx-ticket"></ol><div class="lgx-bar" hidden><i></i></div><p class="lgx-msg" role="status" aria-live="polite"></p>' +
    '<div class="lgx-items" role="group" aria-label="Menu">' + ITEMS.map((it, i) => '<button type="button" class="lgx-it" data-i="' + i + '" aria-label="' + it[0] + ' (key ' + (i + 1) + ')"><span class="lgx-e" aria-hidden="true">' + it[1] + '</span><span class="lgx-l">' + it[0] + '</span><kbd aria-hidden="true">' + (i + 1) + '</kbd></button>').join('') + '</div>' +
    '<div class="lgx-acts"><button type="button" class="btn primary" data-a="ready">Ready</button><button type="button" class="btn" data-a="again" hidden>Play again</button><button type="button" class="btn" data-a="quit">Quit</button></div></div>';
  const $ = s => el.querySelector(s), items = Array.from(el.querySelectorAll('.lgx-it')), ready = $('[data-a=ready]'), again = $('[data-a=again]'), quit = $('[data-a=quit]');
  $('.lgx-who').textContent = 'with ' + who;
  host.appendChild(el);

  const say = t => { $('.lgx-msg').textContent = t; };
  const setItems = on => items.forEach(b => { b.disabled = !on; });
  function paint() {
    $('.lgx-hearts').textContent = '❤️'.repeat(core.lives) + '🖤'.repeat(LIVES - core.lives); $('.lgx-hearts').setAttribute('aria-label', core.lives + ' of ' + LIVES + ' lives left');
    $('.lgx-round').textContent = 'Ticket ' + (core.round + 1) + ' of ' + core.cfg.rounds + ' · ' + core.len() + ' items' + (tier > 1 && core.streak > 1 ? ' · 🔥 streak ×' + core.streak : '');
    if (tier > 1) {   /* the rules for THIS ticket, stated in words and shown on the menu: nothing is hidden or learned by failing */
      const m = $('.lgx-mods'); m.textContent = ''; core.mods.forEach(k => { const b = doc.createElement('span'); b.className = 'lgx-mod lgx-mod-' + k; b.textContent = MOD_TEXT[k][0] + (k === 'allergy' && core.ban >= 0 ? ' · ' + ITEMS[core.ban][0] : '') + ' — ' + MOD_TEXT[k][1]; m.appendChild(b); });
      items.forEach((b, i) => { const ban = core.ban === i; b.classList.toggle('ban', ban); b.setAttribute('aria-label', ITEMS[i][0] + ' (key ' + (i + 1) + ')' + (ban ? ' — allergy, do not serve' : '')); });
    }
    const t = $('.lgx-ticket'); t.textContent = '';
    core.seq.forEach((v, j) => {
      const li = doc.createElement('li'); const showIt = core.phase === 'show' || (core.phase === 'input' && j < core.pos);
      li.className = showIt ? 'on' : ''; li.textContent = showIt ? ITEMS[v][1] + ' ' + ITEMS[v][0] : '?'; t.appendChild(li);
    });
  }
  function showOrder(fresh) {
    clearHold(); if (fresh) core.deal(); else core.replay();
    paint(); setItems(false); ready.hidden = false; again.hidden = true; quit.hidden = false;
    let ms = showMs(core.len(), reduced); const bar = $('.lgx-bar'); if (core.mods.indexOf('rush') >= 0) ms = Math.round(ms * 0.55);
    say(core.len() + ' items. Memorize the ticket' + (reduced ? ' (extra time given).' : '.') + (core.rev ? ' Remember: serve it in REVERSE.' : '')); ready.focus();
    if (reduced) bar.hidden = true; else { bar.hidden = false; const i = bar.firstElementChild; i.style.animation = 'none'; void i.offsetWidth; i.style.animation = 'lgxBar ' + ms + 'ms linear forwards'; }
    hold = later(recall, ms);
  }
  function recall() {
    clearHold(); core.recall(); if (core.phase !== 'input') return;
    ready.hidden = true; $('.lgx-bar').hidden = true; paint(); setItems(true); say('Your turn: 1 of ' + core.seq.length + '.'); items[0].focus();
  }
  function press(i) {
    const banned = tier > 1 && core.ban === i && core.phase === 'input', r = core.press(i); if (!r) return; sfx(r === 'wrong' || r === 'lost' ? 'bad' : 'click'); paint();
    if (r !== 'wrong' && r !== 'lost' && !reduced) { const b = items[i]; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    if (r === 'ok') say('Good. ' + (core.pos + 1) + ' of ' + core.seq.length + '.');
    else if (r === 'round') { setItems(false); say(tier > 1 && core.streak > 1 ? 'Order up! Streak ×' + core.streak + ' — bonus points. Next ticket…' : 'Order up! Next ticket…'); hold = later(() => showOrder(true), reduced ? 1200 : 900); }
    else if (r === 'wrong') { setItems(false); say((banned ? 'Allergy! ' + ITEMS[i][0] + ' must never be served. ' : 'Not quite: ') + core.lives + (core.lives === 1 ? ' life' : ' lives') + ' left. Here is the ticket again.'); hold = later(() => showOrder(false), reduced ? 1600 : 1200); }
    else finish(r === 'won');
  }
  const result = extra => Object.assign({ won: false, score: core.score, rounds: core.cleared, lives: core.lives, mistakes: core.mistakes, quit: false }, tier > 1 ? { tier: tier, bestStreak: core.bestStreak } : null, extra);   /* classic (tier 1) result keeps exactly its original keys */
  function finish(won) {
    if (finished) return; finished = true; clearHold(); setItems(false); ready.hidden = true; again.hidden = false; quit.textContent = 'Close'; $('.lgx-bar').hidden = true;
    say(won ? 'Shift complete! Score ' + core.score + '. ' + who + ' is thrilled.' + (tier > 1 ? ' Best streak ×' + core.bestStreak + '.' : '') : 'Out of lives after ' + core.cleared + ' of ' + core.cfg.rounds + ' tickets. Score ' + core.score + '.'); sfx(won ? 'ok' : 'bad'); again.focus();
    const res = result({ won: won }); notify('orderUp', res); if (opts.onEnd) opts.onEnd(res);
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
    quit: function (why) { if (dead) return; const was = finished; this.destroy(); if (!was) { const res = result({ quit: true, aborted: why || '' }); notify('orderUp', res); if (opts.onEnd) opts.onEnd(res); } },
    /* release everything this game created; safe to call repeatedly. onClose fires exactly once, on the transition dead→destroyed */
    destroy: function () {
      if (dead) return; dead = true; timers.forEach(t => clearTimeout(t)); timers.clear(); hold = 0;
      doc.removeEventListener('keydown', onKey, true); if (el.parentNode) el.parentNode.removeChild(el);
      try { if (prevFocus && prevFocus.focus && doc.contains(prevFocus)) prevFocus.focus(); } catch (e) {}
      try { if (opts.onClose) opts.onClose(ctl); } catch (e) {}
    }
  };
  showOrder(true);
  return ctl;
}

/* result observers (progress ledger, console): fn(gameId, result). Isolated from the game: a throwing observer never affects play or rewards. */
const OBS = [];
function notify(id, r) { OBS.slice().forEach(f => { try { f(id, r); } catch (e) { if (root.console) console.error('[lounge-games:observer]', e); } }); }
function observe(fn) { if (typeof fn === 'function') OBS.push(fn); return () => { const i = OBS.indexOf(fn); if (i >= 0) OBS.splice(i, 1); }; }
root.CodexLoungeGames = { observe: observe, report: notify, orderUp: { start: startOrderUp, Core: Core, ITEMS: ITEMS, ROUNDS: ROUNDS, LIVES: LIVES, TIERS: TIERS, pickMods: pickMods, showMs: showMs, makeSeq: makeSeq }, list: ['orderUp'],
  meta: { orderUp: { n: 'Order Up', room: 'cafe', host: 'Mira', mech: 'Memory & sequencing', blurb: 'Memorise the ticket, then plate every order in sequence. Higher shifts add rush timers, allergies and reversals.' } } };
/* Add a game. Contract: def.start(opts) → controller { quit(why), destroy(), dead }. opts.onEnd(result) fires once per run (result: { won, score, rounds, mistakes, quit, … });
   opts.onClose(ctl) fires exactly once when the controller is destroyed. Games report through CodexLoungeGames.report(id, result) BEFORE calling opts.onEnd. */
/* Presentation hosts. A game picks the one that suits its mechanic:
     stage(cfg)      → a panel that takes over the lounge canvas area (the room bar stays; the world is paused for the duration)
     consoleTab(cfg) → a compact activity living in an Activity Console tab (the world stays live and walkable)
   Both pause/clean up through one contract: close() is idempotent, and closing always restores the world's input and the previous focus. */
const Host = {
  stage(cfg) {
    const NE = root.NetworkEngine, L = NE && NE.LoungeEngine, G = root.CodexLounge; if (!L || !L.cv || !G) return null;
    const wrap = L.cv.parentNode, el = document.createElement('div'), tok = 'game:' + (cfg.id || 'x'), prev = document.activeElement; let closed = false, ro = null;
    el.className = 'lgs ' + (cfg.cls || ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', cfg.label || 'Activity'); el.tabIndex = -1; wrap.style.position = 'relative'; wrap.appendChild(el);
    const size = () => { el.style.height = L.cv.offsetHeight + 'px'; }; size(); if (root.ResizeObserver) { ro = new root.ResizeObserver(size); ro.observe(L.cv); }
    G.pause(tok);
    return { el: el, get closed() { return closed; }, close() { if (closed) return; closed = true; if (ro) ro.disconnect(); if (el.parentNode) el.parentNode.removeChild(el); G.resume(tok); try { if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true }); else L.cv.focus({ preventScroll: true }); } catch (e) {} } };
  },
  consoleTab(cfg) {
    const C = root.CodexLoungeConsole; if (!C || !C.unregisterTab) return null; let closed = false, panel = null;
    C.registerTab({ id: cfg.id, label: cfg.label, order: 5, render(p) { if (!p.__built) { p.__built = 1; panel = p; p.className += ' lc-activity'; if (cfg.build) cfg.build(p); } } });
    C.setConsole(true); C.selectTab(cfg.id); C.refresh();
    return { get panel() { return panel || (C.panel && C.panel(cfg.id)); }, get closed() { return closed; }, close() { if (closed) return; closed = true; C.unregisterTab(cfg.id); } };
  }
};
root.CodexLoungeGames.host = Host;
root.CodexLoungeGames.register = function (id, def) {
  const G = root.CodexLoungeGames; if (!/^[A-Za-z][A-Za-z0-9]{1,15}$/.test(id) || !def || typeof def.start !== 'function' || G[id]) return false;
  G[id] = def; G.list.push(id); if (def.meta) G.meta[id] = def.meta; return true;
};
if (typeof module !== 'undefined' && module.exports) module.exports = root.CodexLoungeGames;
})(typeof window !== 'undefined' ? window : globalThis);
