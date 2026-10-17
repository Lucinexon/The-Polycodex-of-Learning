/* lounge-play.js — the lounge game layer. Loads after lounge2.js, avatar-*.js and lounge-games.js.
   · NPCs (Mira, Orrin, Wren) are pure functions of the wall clock: every client computes the same position/animation, so they cost ZERO network traffic.
     They are drawn by lounge2's own token()/tick() (same CodexRig sprites, same CodexAnim clips) through the CodexLounge.hooks seam.
   · Clicking an NPC walks you over (existing hotspot flow) and opens a dialogue card. Dialogue is scripted and local.
   · Rare unique lines go through the AI gate below → SystemsEngine.BYOKClient.query. Nothing here ever calls AI from a frame, a hover, movement or
     proximity: the ONLY trigger is the player pressing "Chat" in an open dialogue, and then only with probability CFG.aiChance.
   · Tuning/budget knobs are all in CFG (also reachable as CodexLoungePlay.config). Worst-case spend per page load: CFG.aiSessionMax calls,
     each ≈ 220 prompt tokens + ≤ CFG.aiMaxTokens reply tokens (≈ 4k tokens at the defaults). Expected: ~1 call per 8 deliberate chats.     */
(function (root) {
'use strict';
const $1 = (s, r) => (r || document).querySelector(s);
const NE = () => root.NetworkEngine || {}, LE = () => NE().LoungeEngine, LG = () => root.CodexLounge;
const KEY = 'cx_lounge_v1';
const CFG = {
  aiChance: 0.12,              /* probability that a deliberate "Chat" becomes a rare AI encounter */
  aiNpcCooldownMs: 240000,     /* per-NPC minimum gap between AI calls */
  aiGlobalCooldownMs: 90000,   /* minimum gap between ANY two AI calls */
  aiSessionMax: 12,            /* hard cap per page load (failed calls count) */
  aiMaxTokens: 90, aiTimeoutMs: 12000, aiCacheKeep: 6,
  slotMs: 45000, npcSpeed: 28, emotePeriodMs: 14000, ambientMs: 38000, ambientShowMs: 5500,
  reactRadius: 90, reactCooldownMs: 7000, reactDelayMs: 500,
  xpPerDayCap: 30
};
let rng = Math.random;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ---------- persistence (own key, same pattern as the cx_v7_* keys; XP goes through the existing gainXP) ---------- */
const store = {
  get() { let d = {}; try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {} return Object.assign({ visits: {}, ai: {}, best: {}, xp: { d: '', n: 0 } }, d); },
  set(fn) { const d = this.get(); fn(d); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} return d; }
};

/* ---------- NPC roster. Route stops: {r room, x,y feet, em emote key, pose:1+pz seat id, dir}. Coordinates mirror lounge2 HOT stand points. ---------- */
const NPCS = [
  { id: 'mira', n: 'Mira', tag: 'BARISTA', role: 'the barista of the Starlight Café', home: 'cafe', phase: 0, game: 'orderUp',
    look: { name: 'Mira', over: { t: 3, o: 4, oc: 2 } },
    persona: 'warm, quick-witted, treats every drink like a tiny experiment, says "brewing" about almost everything',
    route: [{ x: 288, y: 214, em: 'sip' }, { x: 92, y: 224, em: 'dance' }, { x: 196, y: 256 }, { x: 340, y: 214, em: 'spark' }],
    greet: ['Welcome in! First one is on the house. Metaphorically.', 'Back again? The usual is already half-brewed.', 'Pull up a stool. The machine is in a good mood.'],
    talk: ['The jukebox only plays what the room is feeling. It is rarely wrong.', 'Everything tastes better after a long study session. That is science. Mostly.', 'I keep a ledger of orders. Memory is the whole trick to this job.', 'Try the matcha. Or the boba. Or both, if you are brave.', 'Quiet nights are my favorite: steam, lofi, someone figuring something out.', 'People think the machine does the work. The machine just hums.'],
    ambient: ['Order up for nobody in particular!', 'Fresh brew, fresh ideas.', 'Who ordered the double espresso?'],
    pitch: 'Fancy a shift? I read the tickets, you plate the orders. Do not lose count.' },
  { id: 'orrin', n: 'Orrin', tag: 'ARCHIVIST', role: 'the archivist of the Library Loft', home: 'loft', phase: 1,
    look: { name: 'Orrin', over: { t: 7, x: 3, o: 9, p: 2 } },
    persona: 'gentle and absent-minded, speaks in tiny marginalia-style asides, loves unfinished books',
    route: [{ x: 372, y: 244, pose: 1, pz: 'a2', dir: -1 }, { x: 110, y: 214, em: 'spark' }, { x: 240, y: 212, em: 'warm' }],
    greet: ['Ah. A reader. Mind the stack by your left foot.', 'You have the look of someone mid-chapter.', 'Shh. No, I am joking. Come in.'],
    talk: ['Every shelf up there is a conversation someone left halfway.', 'Notes you write today are letters to a stranger who happens to be you.', 'I once lost a bookmark for a year. It was in the book. Of course it was.', 'The fire is a good editor. It makes you cut things short.', 'An unfinished book is only a very patient one.', 'The best margin notes are the ones that disagree politely.'],
    ambient: ['Now where did I put that chapter…', '*turns a page very carefully*', 'Hm. Footnote seven is lying.'] },
  { id: 'wren', n: 'Wren', tag: 'WANDERER', role: 'a wanderer who drifts between the lounge rooms', home: 'deck', phase: 2,
    look: { name: 'Wren', over: { t: 11, o: 14, oc: 5, au: 2 } },
    persona: 'curious and a little mysterious, collects small superstitions, never stays anywhere long',
    route: [{ r: 'deck', x: 300, y: 236, em: 'wave' }, { r: 'cafe', x: 230, y: 236, em: 'sip' }, { r: 'garden', x: 240, y: 214, em: 'spark' }, { r: 'loft', x: 160, y: 240, em: 'warm' }],
    greet: ['Oh, you found me. I am never in the same room twice.', 'Hello! Quick, before I wander off.', 'Mm. Good timing. I was just leaving.'],
    talk: ['I never stay long. Rooms keep better secrets when you are only passing through.', 'The glow mushroom brightens when someone is close to an idea. I have a theory.', 'Superstition of the day: never study with your shoes on the wrong feet.', 'The pond remembers every wish. It just does not do refunds.', 'I count doors. This place has more than it admits.', 'If the jukebox skips, someone nearby is about to have a good idea.'],
    ambient: ['Mm. Next room, I think.', 'Do you hear the humming? That is the station thinking.', 'Lucky door, that one.'] }
];
const NPC_BY = {}; NPCS.forEach(n => { NPC_BY[n.id] = n; });
const TOPICS = ['something you noticed today', 'a tiny superstition', 'a favorite quiet moment', 'a small mistake that turned out well', 'a thing you almost forgot to do'];
const dayIndex = now => Math.floor(now / 864e5);

/* avatar code for an NPC: name-derived base look + a few overrides, clamped to the catalog sizes (CodexAvatar.MAX) */
function lookCode(spec) {
  const A = root.CodexAvatar; if (!A || !A.parse || !A.enc || !A.forName) return '';
  const o = A.parse(A.forName(spec.name)), mx = A.MAX || {};
  Object.keys(spec.over || {}).forEach(k => { const m = mx[k]; o[k] = m ? ((spec.over[k] % m) + m) % m : spec.over[k]; });
  return A.enc(o);
}

/* ---------- deterministic schedule: position/animation of an NPC at wall-clock `now` (ms) ---------- */
function stateAt(npc, now, out) {
  out = out || {}; const rt = npc.route, n = rt.length, slot = Math.floor(now / CFG.slotMs), el = now - slot * CFG.slotMs;
  const i = (slot + npc.phase) % n, stop = rt[i], prev = rt[(i + n - 1) % n], room = stop.r || npc.home, same = (prev.r || npc.home) === room;
  const from = same ? prev : { x: stop.x < 240 ? 36 : 444, y: stop.y };           /* arriving from another room → come in through a door */
  const dx = stop.x - from.x, dy = stop.y - from.y, dist = Math.hypot(dx, dy), travel = Math.min(dist / CFG.npcSpeed * 1000, CFG.slotMs * .4), walking = el < travel, f = travel > 0 ? Math.min(1, el / travel) : 1;
  out.r = room; out.cx = from.x + dx * f; out.cy = from.y + dy * f; out.x = stop.x; out.y = stop.y; out.walk = walking;
  out.dir = walking ? (dx >= 0 ? 1 : -1) : (stop.dir || (dx >= 0 ? 1 : -1));
  out.pose = !walking && stop.pose ? 1 : 0; out.pz = out.pose ? (stop.pz || '') : '';
  out.em = null; if (!walking && stop.em) out.em = { k: stop.em, ts: slot * CFG.slotMs + travel + Math.floor((el - travel) / CFG.emotePeriodMs) * CFG.emotePeriodMs };
  const ph = now + npc.phase * 9000, ap = ph % CFG.ambientMs;
  out.say = (!walking && ap < CFG.ambientShowMs) ? npc.ambient[Math.floor(ph / CFG.ambientMs) % npc.ambient.length] : '';
  out.sayAge = ap; return out;
}

/* ---------- live actors (player-shaped objects consumed by lounge2 token()/tick()) ---------- */
const ACTORS = {}, BY_ROOM = {}, BY_UID = {}, HOTS = {}, REACT = {}, REACT_LAST = {};
const EMPTY = [];
let lastRoom = null, lastEmoteTs = 0;
function ensureActors() {
  NPCS.forEach(n => { if (ACTORS[n.id]) return; ACTORS[n.id] = { uid: 'npc:' + n.id, id: n.id, n: n.n, tag: n.tag, lv: 1, npc: 1, av: lookCode(n.look), r: n.home, x: 0, y: 0, cx: 0, cy: 0, dir: 1, walk: false, pose: 0, pz: '', em: null, say: '', sayAge: 0 }; BY_UID['npc:' + n.id] = ACTORS[n.id]; });
}
const REACTS = { wave: { any: 'wave' }, dance: { mira: 'cheer', any: 'wave' }, sip: { mira: 'sip' }, cheer: { any: 'cheer' }, heart: { any: 'heart' }, spark: { orrin: 'spark' } };
function placeHot(L, a, npc) {
  const G = LG(); if (!G) return; let h = HOTS[npc.id];
  if (!h) h = HOTS[npc.id] = { id: 'npc:' + npc.id, t: 'npc', npc: npc.id, x: 0, y: 0, w: 24, h: 54, sx: 0, sy: 0, l: npc.n + ' · ' + npc.tag, _r: '' };
  if (h._r !== a.r) {
    if (h._r && G.HOT[h._r]) { const k = G.HOT[h._r].indexOf(h); if (k >= 0) G.HOT[h._r].splice(k, 1); }
    (G.HOT[a.r] = G.HOT[a.r] || []).unshift(h); h._r = a.r;                          /* unshift: an NPC sitting in a chair wins the click over the chair */
  }
  h.x = Math.round(a.cx) - 12; h.y = Math.round(a.cy) - 50; h.sx = clamp(Math.round(a.cx) + (a.cx > 240 ? -30 : 30), L.MIN_X, L.MAX_X); h.sy = clamp(Math.round(a.cy), L.MIN_Y, L.MAX_Y);
}
function removeHots() { const G = LG(); if (!G) return; Object.keys(HOTS).forEach(k => { const h = HOTS[k]; if (h._r && G.HOT[h._r]) { const i = G.HOT[h._r].indexOf(h); if (i >= 0) G.HOT[h._r].splice(i, 1); } h._r = ''; }); }
function update(L) {
  ensureActors(); const now = Date.now(), rooms = {}, A = root.CodexAnim;
  const myEm = L.me && L.me.emote && L.me.emote.ts !== lastEmoteTs ? (lastEmoteTs = L.me.emote.ts, L.me.emote.k) : null;
  NPCS.forEach(n => {
    const a = ACTORS[n.id]; stateAt(n, now, a);
    if (myEm && L.me.room === a.r && !a.walk && Math.hypot(L.me.cx - a.cx, L.me.cy - a.cy) < CFG.reactRadius && now - (REACT_LAST[n.id] || 0) > CFG.reactCooldownMs) {
      const m = REACTS[myEm], k = m && (m[n.id] || m.any); if (k && A && A.CLIPS[k]) { REACT_LAST[n.id] = now; REACT[n.id] = { k: k, at: now + CFG.reactDelayMs }; }
    }
    const r = REACT[n.id]; if (r && now >= r.at && (!a.em || r.at > a.em.ts) && !a.walk) a.em = { k: r.k, ts: r.at };   /* latest trigger wins → no replay when it ends */
    (rooms[a.r] = rooms[a.r] || []).push(a); placeHot(L, a, n);
  });
  Object.keys(BY_ROOM).forEach(k => { if (!rooms[k]) delete BY_ROOM[k]; }); Object.keys(rooms).forEach(k => { BY_ROOM[k] = rooms[k]; });
  if (lastRoom !== L.me.room) { lastRoom = L.me.room; closeDialog(); abortGame('left-room'); }
  if (DLG) { const a = ACTORS[DLG.npc.id]; if (!a || a.r !== L.me.room || Math.hypot(L.me.cx - a.cx, L.me.cy - a.cy) > 150) closeDialog(); }   /* walked away */
}
function over(L, c, pos, t, wrap) {
  const list = BY_ROOM[(L.me && L.me.room) || 'deck'] || EMPTY; if (!list.length) return;
  c.font = '9px "Atkinson Hyperlegible", sans-serif';
  list.forEach(a => {
    if (!a.say) return; const q = pos[a.uid]; if (!q) return; const lines = wrap(c, a.say, 116), w = Math.max.apply(null, lines.map(l => c.measureText(l).width)) + 10, h = lines.length * 11 + 6;
    const x = clamp(q.x - w / 2, 4, L.W - w - 4), y = Math.max(2, q.y - h - 6), left = CFG.ambientShowMs - a.sayAge;
    c.globalAlpha = clamp(left / 700, 0, 1) * clamp(a.sayAge / 300, 0, 1); c.fillStyle = 'rgba(255,255,255,.96)'; c.fillRect(x, y, w, h); c.fillRect(Math.round(q.x) - 3, y + h, 6, 4);
    c.fillStyle = '#10222e'; lines.forEach((l, i) => c.fillText(l, x + 5, y + 11 + i * 11)); c.globalAlpha = 1;
  });
}

/* ---------- dialogue text (scripted, deterministic) ---------- */
function scripted(npc, kind) {
  const pool = npc[kind] || npc.talk; let v = 0;
  store.set(d => { d.visits[npc.id] = ((d.visits[npc.id] | 0) + (kind === 'talk' ? 1 : 0)); v = d.visits[npc.id] | 0; });
  return pool[(v + dayIndex(Date.now()) + (kind === 'greet' ? 0 : npc.phase)) % pool.length];
}

/* ---------- the AI gate ---------- */
const cleanText = t => String(t == null ? '' : t).replace(/[\r\n]+/g, ' ').replace(/[*_`#>~\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 220);
const AIG = {
  s: { calls: 0, last: -Infinity, byNpc: {}, busy: false },
  client() { const S = root.SystemsEngine, b = S && S.BYOKClient; return b && typeof b.query === 'function' ? b : null; },
  configured() { const b = this.client(); return !!(b && typeof b.configured === 'function' && b.configured()); },
  /* '' when a call is allowed right now, otherwise why not */
  block(npcId, now) {
    const s = this.s; now = now == null ? Date.now() : now;
    if (!this.configured()) return 'unconfigured'; if (s.busy) return 'busy'; if (typeof document !== 'undefined' && document.hidden) return 'hidden';
    if (s.calls >= CFG.aiSessionMax) return 'session-cap'; if (now - s.last < CFG.aiGlobalCooldownMs) return 'global-cooldown';
    if (s.byNpc[npcId] != null && now - s.byNpc[npcId] < CFG.aiNpcCooldownMs) return 'npc-cooldown'; return '';
  },
  request(npc, scene, now) {
    const why = this.block(npc.id, now), s = this.s; now = now == null ? Date.now() : now;
    if (why) return Promise.reject(Object.assign(new Error(why), { gate: why }));
    s.busy = true; s.calls++; s.last = now; s.byNpc[npc.id] = now;                  /* stamped BEFORE sending: failures and timeouts spend budget too */
    const msgs = [{ role: 'system', content: 'You voice ' + npc.n + ', ' + npc.role + ', a character in a cozy fictional space-station lounge game. Persona: ' + npc.persona + '. This is lighthearted in-world fiction: reply in character with at most two short sentences (under 40 words), no questions, no lists, no markdown, no real-world facts or advice.' },
      { role: 'user', content: 'Scene: ' + scene + '. A visitor says hello. Let slip ' + TOPICS[Math.floor(rng() * TOPICS.length) % TOPICS.length] + '.' }];
    let p; try { p = Promise.resolve(this.client().query(msgs, { max_tokens: CFG.aiMaxTokens, temperature: .9, timeout: CFG.aiTimeoutMs })); } catch (e) { s.busy = false; return Promise.reject(e); }
    return p.then(r => { s.busy = false; const t = cleanText(r && r.text); if (!t) throw new Error('empty reply'); return t; }, e => { s.busy = false; throw e; });
  },
  stats() { const s = this.s; return { calls: s.calls, busy: s.busy, last: s.last, byNpc: Object.assign({}, s.byNpc), configured: this.configured(), cap: CFG.aiSessionMax, chance: CFG.aiChance }; }
};
const cacheLines = id => (store.get().ai[id] || []);
function cachePut(id, text) { store.set(d => { const a = (d.ai[id] = d.ai[id] || []).filter(x => x !== text); a.push(text); d.ai[id] = a.slice(-CFG.aiCacheKeep); }); }
function cachePick(id) { const a = cacheLines(id); return a.length ? a[Math.floor(rng() * a.length) % a.length] : ''; }
const partOfDay = now => { const h = new Date(now).getHours(); return h < 6 ? 'late night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; };
/* One deliberate "Chat". → Promise<{ text, src: 'local'|'ai'|'cache' }>. The ONLY place an AI call can originate. */
function encounter(npc, scene, now) {
  now = now == null ? Date.now() : now;
  if (!(rng() < CFG.aiChance)) return Promise.resolve({ text: scripted(npc, 'talk'), src: 'local' });     /* the common case: free and instant */
  const fallback = () => { const c = cachePick(npc.id); return c ? { text: c, src: 'cache' } : { text: scripted(npc, 'talk'), src: 'local' }; };
  if (AIG.block(npc.id, now)) return Promise.resolve(fallback());
  return AIG.request(npc, scene || npc.home, now).then(t => { cachePut(npc.id, t); return { text: t, src: 'ai' }; }, () => fallback());
}

/* ---------- dialogue card ---------- */
let DLG = null, GAME = null;
function closeDialog() { if (!DLG) return; DLG.dead = true; document.removeEventListener('keydown', DLG.key, true); if (DLG.el.parentNode) DLG.el.parentNode.removeChild(DLG.el); DLG = null; }
function openDialog(npcId) {
  const L = LE(), npc = NPC_BY[npcId], a = ACTORS[npcId]; if (!L || !L.cv || !npc || !a || a.r !== L.me.room || GAME) return;
  closeDialog(); const wrapEl = L.cv.parentNode; wrapEl.style.position = 'relative';
  const el = document.createElement('div'); el.className = 'lgd'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Talking to ' + npc.n);
  el.innerHTML = '<span class="lgd-av"></span><div class="lgd-b"><b class="lgd-n"></b><small class="lgd-r"></small><p class="lgd-t" aria-live="polite"></p><div class="lgd-a"><button type="button" class="btn primary" data-d="chat">Chat</button>' + (npc.game ? '<button type="button" class="btn" data-d="game">Play Order Up</button>' : '') + '<button type="button" class="btn" data-d="bye">Bye</button></div></div>';
  el.querySelector('.lgd-n').textContent = npc.n; el.querySelector('.lgd-r').textContent = npc.tag + ' · ' + (L.me.room === a.r && root.CodexLounge && root.CodexLounge.ROOMS[a.r] ? root.CodexLounge.ROOMS[a.r].n : '');
  if (root.CodexAvatar) el.querySelector('.lgd-av').innerHTML = root.CodexAvatar.el(a.av, 56, 'sq');
  const txt = el.querySelector('.lgd-t'), chat = el.querySelector('[data-d=chat]'); txt.textContent = scripted(npc, 'greet');
  const d = DLG = { el: el, npc: npc, seq: 0, dead: false, key: e => { if (e.key === 'Escape' && !GAME) { e.preventDefault(); e.stopPropagation(); closeDialog(); } } };
  document.addEventListener('keydown', d.key, true);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-d]'); if (!b || d.dead) return; const k = b.dataset.d;
    if (k === 'bye') { if (root.sfx) root.sfx('click'); closeDialog(); }
    else if (k === 'game') playGame(npc);
    else if (k === 'chat') {
      const my = ++d.seq; chat.disabled = true; el.setAttribute('aria-busy', 'true'); txt.textContent = '…';
      encounter(npc, (root.CodexLounge && root.CodexLounge.ROOMS[a.r] ? root.CodexLounge.ROOMS[a.r].n : a.r) + ', ' + partOfDay(Date.now())).then(r => {
        if (d.dead || my !== d.seq) return;
        txt.textContent = (r.src === 'ai' ? '✦ ' : r.src === 'cache' ? '✦ (remembered) ' : '') + r.text; chat.disabled = false; el.removeAttribute('aria-busy'); if (root.sfx) root.sfx(r.src === 'local' ? 'click' : 'reveal');
      });
    }
  });
  wrapEl.appendChild(el); if (root.sfx) root.sfx('click'); chat.focus();
}

/* ---------- minigame host ---------- */
function abortGame(why) { if (GAME) { const g = GAME; GAME = null; g.quit(why); } }
function playGame(npc) {
  const G = root.CodexLoungeGames; if (!G || !G[npc.game] || GAME) return; closeDialog();
  GAME = G[npc.game].start({ npc: npc.n, onEnd: r => { GAME = null; finishGame(npc, r); } });
}
function finishGame(npc, r) {
  if (r.quit && !r.rounds) return;                                               /* quit before clearing a ticket: nothing to reward */
  const today = new Date().toDateString(); let gain = 0;
  store.set(d => {
    if (d.xp.d !== today) d.xp = { d: today, n: 0 };
    gain = clamp(Math.round(r.score / 4), 0, Math.max(0, CFG.xpPerDayCap - d.xp.n)); d.xp.n += gain;
    d.best[npc.game] = Math.max(d.best[npc.game] | 0, r.score);
  });
  if (gain > 0 && typeof root.gainXP === 'function') root.gainXP(gain, true);
  const best = store.get().best[npc.game] | 0;
  if (r.won) { const G = LG(); if (G) G.doEmote('cheer'); REACT[npc.id] = { k: 'cheer', at: Date.now() + 400 }; }
  if (typeof root.toast === 'function') root.toast('<b>' + (r.won ? 'Shift complete!' : 'Shift over') + '</b><br>Score ' + r.score + ' · best ' + best + (gain ? ' · +' + gain + ' XP' : ' · daily XP cap reached'), 'coin', 3200);
}

/* ---------- wiring ---------- */
function init() {
  const L = LE(), G = LG(); if (!L || !L.cv || !G) return;
  const h = G.hooks; h.npcs = id => BY_ROOM[id] || EMPTY; h.byUid = uid => BY_UID[uid]; h.over = over;
  h.arrive = (a, Lx) => { if (a && a.t === 'npc') openDialog(a.npc); };
  const s0 = L.step; L.step = function (dt, t) { s0.call(this, dt, t); try { update(this); } catch (e) { if (root.console && !init.warned) { init.warned = 1; console.error('[lounge-play]', e); } } };
  const sa = L.setActive; L.setActive = function (on) { sa.call(this, on); if (!on) { closeDialog(); abortGame('inactive'); } };
  document.addEventListener('click', e => { if (DLG && !DLG.el.contains(e.target) && !(L.cv && L.cv.contains(e.target))) closeDialog(); });
}
document.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { if (root.console) console.error('[lounge-play]', e); } });
root.CodexLoungePlay = {
  config: CFG, npcs: NPCS, ai: { stats: () => AIG.stats(), gate: AIG, encounter: encounter }, openDialog: openDialog, closeDialog: closeDialog, teardown: () => { closeDialog(); abortGame('teardown'); removeHots(); },
  _t: { stateAt: stateAt, AIG: AIG, encounter: encounter, cleanText: cleanText, store: store, scripted: scripted, lookCode: lookCode, setRng: f => { rng = f || Math.random; }, resetSession: () => { AIG.s = { calls: 0, last: -Infinity, byNpc: {}, busy: false }; } }
};
if (typeof module !== 'undefined' && module.exports) module.exports = root.CodexLoungePlay;
})(typeof window !== 'undefined' ? window : globalThis);
