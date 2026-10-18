/* lounge-progress.js — CodexLoungeProgress: the world layer's persistent progress ledger.
   · One versioned localStorage key (cx_lounge_world_v1). Everything read from storage is untrusted and is re-validated by clean().
   · Corrupt JSON is backed up once (…_bak) and replaced by a fresh ledger; data written by a NEWER schema is never overwritten
     (the ledger runs read-only in memory) so a rollback of the site cannot destroy a player's progress.
   · Legacy keys are only ever READ (cx_lounge_v1 → games.*.best) — never modified, so lounge-play.js keeps working untouched.
   · No DOM, no network. The wiring at the bottom subscribes to CodexLounge / CodexLoungeGames when they exist; the ledger itself is
     usable (and unit-testable) without either. */
(function (root) {
'use strict';
const KEY = 'cx_lounge_world_v1', LEGACY = 'cx_lounge_v1', VER = 1, LOG_MAX = 40;
const ID = /^[A-Za-z][A-Za-z0-9_]{0,23}$/;   /* room ids are lowercase; game ids are camelCase (orderUp) */
const nat = (v, max) => { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? Math.min(v, max || 1e9) : 0; };
const ts = v => { v = Math.floor(Number(v)); return isFinite(v) && v > 0 && v < 4e12 ? v : 0; };
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').slice(0, n);

function blank() { return { v: VER, rooms: {}, found: {}, items: {}, quests: {}, games: {}, log: [], stats: { walks: 0, sits: 0, emotes: 0, talks: 0 } }; }

/* Validate + normalise an arbitrary value into a ledger of the current schema. Never throws. */
function clean(raw) {
  const o = blank(); if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return o;
  const each = (src, fn) => { if (src && typeof src === 'object' && !Array.isArray(src)) Object.keys(src).slice(0, 200).forEach(k => { if (ID.test(k)) fn(k, src[k]); }); };
  each(raw.rooms, (k, v) => { if (v && typeof v === 'object') o.rooms[k] = { n: nat(v.n, 1e6), t: ts(v.t) }; });
  each(raw.found, (k, v) => { o.found[k] = ts(v) || 1; });
  each(raw.items, (k, v) => { const n = nat(v, 9999); if (n) o.items[k] = n; });
  each(raw.quests, (k, v) => { if (v && typeof v === 'object') o.quests[k] = { s: v.s === 'done' ? 'done' : 'active', p: nat(v.p, 999), t: ts(v.t) }; });
  each(raw.games, (k, v) => { if (v && typeof v === 'object') o.games[k] = { best: nat(v.best, 1e6), plays: nat(v.plays, 1e6), wins: nat(v.wins, 1e6), last: ts(v.last), tier: nat(v.tier, 9) }; });
  if (Array.isArray(raw.log)) raw.log.slice(-LOG_MAX).forEach(e => { if (e && typeof e === 'object') o.log.push({ t: ts(e.t), k: str(e.k, 12), id: ID.test(e.id) ? e.id : '', x: str(e.x, 120) }); });
  if (raw.stats && typeof raw.stats === 'object') Object.keys(o.stats).forEach(k => { o.stats[k] = nat(raw.stats[k], 1e9); });
  return o;
}

let D = blank(), status = 'fresh', readonly = false; const subs = [];

function load() {
  let txt = null; try { txt = localStorage.getItem(KEY); } catch (e) {}
  readonly = false;
  if (txt == null) { D = blank(); status = 'fresh'; importLegacy(); return; }
  let raw; try { raw = JSON.parse(txt); } catch (e) { raw = undefined; }
  if (raw === undefined || raw === null || typeof raw !== 'object') {            /* corrupt: keep a copy for support, start clean */
    try { if (localStorage.getItem(KEY + '_bak') == null) localStorage.setItem(KEY + '_bak', String(txt).slice(0, 20000)); } catch (e) {}
    D = blank(); status = 'recovered'; importLegacy(); save(); return;
  }
  if (nat(raw.v) > VER) { D = blank(); status = 'newer'; readonly = true; return; }   /* written by a newer build: leave it alone */
  D = clean(raw); status = 'ok';
}
function importLegacy() {   /* read-only import of scores earned before this ledger existed */
  try {
    const old = JSON.parse(localStorage.getItem(LEGACY) || '{}') || {};
    if (old.best && typeof old.best === 'object') Object.keys(old.best).forEach(k => { const b = nat(old.best[k], 1e6); if (b && ID.test(k)) D.games[k] = Object.assign({ best: 0, plays: 0, wins: 0, last: 0, tier: 0 }, D.games[k], { best: b }); });
  } catch (e) {}
}
function save() { if (readonly) return false; try { localStorage.setItem(KEY, JSON.stringify(D)); return true; } catch (e) { return false; } }
function notify(why) { subs.slice().forEach(f => { try { f(why); } catch (e) { if (root.console) console.error('[lounge-progress]', e); } }); }

/* Apply a mutation, re-validate the result, persist, notify. The only way state changes. */
function update(fn, why) { const draft = JSON.parse(JSON.stringify(D)); fn(draft); D = clean(draft); save(); notify(why || 'update'); return get(); }
function get() { return JSON.parse(JSON.stringify(D)); }
function log(d, k, id, x) { d.log.push({ t: Date.now(), k: str(k, 12), id: ID.test(id) ? id : '', x: str(x, 120) }); if (d.log.length > LOG_MAX) d.log.splice(0, d.log.length - LOG_MAX); }

function visit(id, label) {
  if (!ID.test(id)) return; let first = false;
  update(d => { const r = d.rooms[id] || (d.rooms[id] = { n: 0, t: Date.now() }); first = r.n === 0; r.n++; if (first) log(d, 'room', id, 'First visit: ' + (label || id)); }, 'room');
  return first;
}
function gameResult(id, r) {
  if (!ID.test(id) || !r || typeof r !== 'object') return;
  if (r.quit && !r.rounds) return;                                              /* same rule lounge-play.js uses: quitting before any progress is not a play */
  update(d => {
    const g = d.games[id] || (d.games[id] = { best: 0, plays: 0, wins: 0, last: 0, tier: 0 }), s = nat(r.score, 1e6);
    g.plays++; if (r.won) g.wins++; g.best = Math.max(g.best, s); g.last = Date.now();
    log(d, 'game', id, (r.won ? 'Won ' : r.quit ? 'Left ' : 'Played ') + id + ' · score ' + s);
  }, 'game');
}
function stat(k, n) { update(d => { if (k in d.stats) d.stats[k] = nat(d.stats[k] + (n || 1), 1e9); }, 'stat'); }
function reset() { D = blank(); readonly = false; status = 'fresh'; try { localStorage.removeItem(KEY); } catch (e) {} notify('reset'); }

load();

/* ---------- wiring (soft: every dependency is optional) ---------- */
let wired = false;
function wire() {
  if (wired) return; wired = true;
  const G = root.CodexLounge, GM = root.CodexLoungeGames;
  if (G && G.on) {
    const name = id => (G.ROOMS && G.ROOMS[id] && G.ROOMS[id].n) || id;
    G.on('active', e => { if (e && e.on && G.room) visit(G.room(), name(G.room())); });
    G.on('room', e => { if (e && e.to) visit(e.to, name(e.to)); });
    G.on('emote', () => stat('emotes'));
    G.on('arrive', e => { if (e && e.t === 'seat') stat('sits'); });
  }
  if (GM && GM.observe) GM.observe(gameResult);
}
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => { try { wire(); } catch (e) { if (root.console) console.error('[lounge-progress]', e); } });

root.CodexLoungeProgress = {
  KEY: KEY, VERSION: VER, get: get, update: update, visit: visit, gameResult: gameResult, stat: stat, reset: reset, wire: wire,
  onChange: fn => { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; },
  status: () => status, readonly: () => readonly, reload: load,
  _t: { clean: clean, blank: blank }
};
if (typeof module !== 'undefined' && module.exports) module.exports = root.CodexLoungeProgress;
})(typeof window !== 'undefined' ? window : globalThis);
