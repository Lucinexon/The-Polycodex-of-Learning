/* lounge-world.js — CodexLoungeWorld: the world layer on top of lounge2.js.
   · DATA lives here as plain tables (SKY, DISC, QUESTS, side-room definitions) so content can change without touching engine code.
   · Interactions are registered with ONE shape — defIx({ id, room, hot, l, verb, icon, requires?, run }) — and share one arrival handler,
     one feedback surface (the in-stage info card) and one persistence path (CodexLoungeProgress). No per-prop event systems.
   · Quests are deterministic functions of the ledger: they complete the moment their condition holds, never from random dialogue.
   · Remote data never defines anything here: rooms/interactions come only from this file. */
(function (root) {
'use strict';
const doc = root.document;
const $1 = (s, r) => (r || doc).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const G = () => root.CodexLounge, P = () => root.CodexLoungeProgress, LE = () => (root.NetworkEngine || {}).LoungeEngine;
const MAIN = ['deck', 'cafe', 'garden', 'loft'], SIDE = ['dome', 'kitchen', 'conservatory', 'archive'];

/* ======================= content ======================= */
/* Constellations for the Dome atlas and the Celestial Survey: stars in a unit square (y down), e = index pairs. Ordered by difficulty. */
const SKY = [
  { id: 'crux', n: 'Southern Cross', fact: 'The smallest of the 88 constellations. Its long axis points toward the south celestial pole.', s: [[.5, .1], [.5, .9], [.8, .46], [.24, .54]], e: [[0, 1], [2, 3]] },
  { id: 'cassiopeia', n: 'Cassiopeia', fact: 'A W-shaped constellation that circles Polaris opposite the Big Dipper, so one of them is almost always above the horizon.', s: [[.08, .4], [.28, .7], [.5, .42], [.72, .72], [.92, .36]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  { id: 'bigdipper', n: 'Big Dipper', fact: 'An asterism in Ursa Major. The two stars at the end of its bowl point toward Polaris.', s: [[.06, .7], [.2, .6], [.34, .52], [.48, .46], [.5, .66], [.74, .68], [.76, .48]], e: [[0, 1], [1, 2], [2, 3], [3, 6], [6, 5], [5, 4], [4, 3]] },
  { id: 'orion', n: 'Orion', fact: 'Betelgeuse, a red supergiant, marks one shoulder and blue-white Rigel the opposite foot. Three stars in a row form the belt.', s: [[.34, .14], [.68, .18], [.4, .5], [.5, .48], [.6, .46], [.36, .88], [.7, .86]], e: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
  { id: 'scorpius', n: 'Scorpius', fact: 'Red supergiant Antares, whose name means rival of Mars, glows at the scorpion\u2019s heart; the tail curls into a hook.', s: [[.28, .16], [.36, .28], [.46, .4], [.52, .52], [.6, .62], [.7, .7], [.8, .66], [.88, .54], [.9, .42]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]] },
  { id: 'polaris', n: 'Polaris & the Little Dipper', fact: 'Polaris sits within about a degree of the north celestial pole, so it barely moves while the rest of the sky turns.', s: [[.1, .56], [.24, .5], [.36, .44], [.48, .42], [.5, .58], [.74, .5], [.78, .34]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] }
];
const D = (n, k, room, fact) => ({ n: n, k: k, room: room, fact: fact });
const DISC = {};
SKY.forEach(c => { DISC[c.id] = D(c.n, 'Sky', 'dome', c.fact); });
Object.assign(DISC, {
  espresso: D('Espresso', 'Recipe', 'kitchen', 'Hot water is forced through fine grounds at roughly 9 bar for 25\u201330 seconds. The crema is an emulsion of coffee oils and CO\u2082 bubbles.'),
  matcha: D('Matcha', 'Recipe', 'kitchen', 'Shade-grown tea leaves stone-ground to a powder. You drink the whole leaf, which is why it is rich in both caffeine and L-theanine.'),
  boba: D('Boba pearls', 'Recipe', 'kitchen', 'Tapioca pearls are made from cassava starch. They are boiled until translucent and chewy, then soaked in syrup so they do not harden.'),
  coldchain: D('Cold chain', 'Pantry', 'kitchen', 'Keeping food below about 5\u00b0C slows bacterial growth enough to buy days of safe storage; every warm hour shortens that.'),
  dinoflagellate: D('Dinoflagellates', 'Specimen', 'conservatory', 'Single-celled plankton that flash blue when disturbed. A luciferin\u2013luciferase reaction is triggered by mechanical stress on the cell.'),
  vibrio: D('Vibrio fischeri', 'Specimen', 'conservatory', 'Glowing bacteria that live in the light organ of the Hawaiian bobtail squid, which uses the glow to erase its own shadow.'),
  aequorea: D('Crystal jelly', 'Specimen', 'conservatory', 'Aequorea victoria produces green fluorescent protein (GFP), which became one of biology\u2019s most useful labelling tools.'),
  glowworm: D('Glowworm', 'Specimen', 'conservatory', 'In New Zealand caves, Arachnocampa larvae hang sticky silk threads and glow to lure insects into them.'),
  foxfire: D('Foxfire', 'Specimen', 'conservatory', 'Some fungi in rotting wood, such as Panellus stipticus, emit a faint green light that needs oxygen to shine.'),
  caesar: D('Caesar cipher', 'Cipher', 'archive', 'Every letter moves a fixed number of places along the alphabet. With only 25 useful keys it falls to simple brute force.'),
  atbash: D('Atbash', 'Cipher', 'archive', 'The alphabet mirrored: A\u2194Z, B\u2194Y, and so on. It has no key at all, which is exactly why it is weak.'),
  rail: D('Rail fence', 'Cipher', 'archive', 'A transposition cipher: write the message in a zigzag across several rails, then read it off rail by rail.'),
  vigenere: D('Vigen\u00e8re', 'Cipher', 'archive', 'A repeating keyword picks a different Caesar shift for each letter. It resisted analysis for centuries until Kasiski published a method in 1863.')
});
const DISC_IDS = Object.keys(DISC);
const RECIPES = ['espresso', 'matcha', 'boba'], SPECIMENS = ['dinoflagellate', 'vibrio', 'aequorea', 'glowworm', 'foxfire'], CIPHERS = ['caesar', 'atbash', 'rail', 'vigenere'];

/* Quests: prog(ledger) → [n, of]. `after` = prerequisite quest id. `where` = room that helps most. Lines are in each NPC's voice. */
const gt = (d, g) => (d.games[g] && d.games[g].tier) | 0;
const nRooms = (d, ids) => ids.filter(k => d.rooms[k] && d.rooms[k].n).length;
const nFound = d => Object.keys(d.found).filter(k => DISC[k]).length;
const QUESTS = [
  { id: 'rounds', npc: 'wren', title: 'Make the rounds', text: 'Visit the Observation Deck, Starlight Caf\u00e9, Glow Greenhouse and Library Loft.', where: 'deck', xp: 10, prog: d => [nRooms(d, MAIN), 4],
    offer: 'Rooms keep better secrets when you pass through all of them. Try each deck once, then tell me what you noticed.', nudge: (n, of) => n + ' of ' + of + ' decks so far. The doors at the edges of each room lead on.', done: 'All four decks. You walk like someone who is never leaving. I approve.' },
  { id: 'sidedoors', npc: 'wren', title: 'Behind the doors', text: 'Step through the Dome hatch, the Kitchen door and the Conservatory arch.', where: 'deck', xp: 10, prog: d => [nRooms(d, ['dome', 'kitchen', 'conservatory']), 3],
    offer: 'Every deck has a smaller room tucked behind it. The hatch by the windows, the swing door, the glass arch. Go on.', nudge: (n, of) => n + ' of ' + of + ' side rooms found. Look for the glowing door frames.', done: 'You found the small rooms. They are where the good light hides.' },
  { id: 'keycard', npc: 'orrin', title: 'Earn the key card', text: 'Log 3 discoveries anywhere in the lounge to open the Archive Stacks.', where: 'dome', xp: 10, prog: d => [Math.min(nFound(d), 3), 3],
    offer: 'The stacks are for readers with a few finds to their name. Three will do. The atlas, the recipe board or the specimen cases would be a fine start.', nudge: (n, of) => n + ' of ' + of + '. Read a recipe, inspect a specimen, study the atlas.', done: 'Three finds. The bookcase by the fireplace will open for you now. Mind the dust.' },
  { id: 'stargazer', npc: 'wren', title: 'Eyes on the sky', text: 'Clear 3 levels of the Celestial Survey at the Dome telescope.', where: 'dome', xp: 15, prog: d => [Math.min(gt(d, 'survey'), 3), 3], need: 'survey',
    offer: 'The big telescope in the Dome lets you chart the sky from memory. Clear three charts and I will believe you can read it.', nudge: (n, of) => n + ' of ' + of + ' charts cleared. The atlas shows the next shape to study.', done: 'You can read the sky now. Superstition of the day: always look up when you leave.' },
  { id: 'service', npc: 'mira', title: 'Order of service', text: 'Win a shift of Order Up.', where: 'cafe', xp: 10, prog: d => [Math.min(gt(d, 'orderUp'), 1), 1],
    offer: 'Fancy a shift? I read the tickets, you plate the orders. Clear all six and the apron is yours.', nudge: () => 'Memorise the ticket, then plate it in order. You have three lives.', done: 'Shift complete! The machine hums a little prouder.' },
  { id: 'rush', npc: 'mira', title: 'Survive the lunch rush', text: 'Win the Lunch Rush shift: tickets arrive with rules.', where: 'cafe', xp: 15, after: 'service', prog: d => [Math.min(Math.max(gt(d, 'orderUp') - 1, 0), 1), 1],
    offer: 'Ready for the rush? Tickets come with rules now: rush orders, allergies, reversals. Read the whole ticket.', nudge: () => 'Read the modifier badge before you press anything.', done: 'You survived the rush. Brewing continues in your honour.' },
  { id: 'greenthumb', npc: 'wren', title: 'Keep it balanced', text: 'Stabilise the tank in the Conservatory terrarium.', where: 'garden', xp: 15, prog: d => [Math.min(gt(d, 'keeper'), 1), 1], need: 'keeper',
    offer: 'The terrarium in the glass room behind the greenhouse is fragile. Light, nutrients and mouths to feed. Keep it balanced.', nudge: () => 'Read the specimen cases first: they say what each creature needs.', done: 'The tank glows steadily. The pond would be jealous.' },
  { id: 'cipher', npc: 'orrin', title: 'Read between the lines', text: 'Solve 3 cases at the Archive cipher desk.', where: 'loft', xp: 15, after: 'keycard', prog: d => [Math.min(gt(d, 'cipher'), 3), 3], need: 'cipher',
    offer: 'The desk in the stacks keeps cases from old readers. The notes in the rare-book case explain the methods. Marginalia, mostly.', nudge: (n, of) => n + ' of ' + of + ' cases solved. The notes teach each method.', done: 'Three cases cracked. I wrote your name in the margin. In pencil. Do not tell anyone.' },
  { id: 'collector', npc: 'orrin', title: 'The whole collection', text: 'Log every discovery in the lounge.', where: 'loft', xp: 25, after: 'keycard', prog: d => [nFound(d), DISC_IDS.length],
    offer: 'There are nineteen entries in the lounge\u2019s collection: sky, recipes, specimens, ciphers. A full set is rare.', nudge: (n, of) => n + ' of ' + of + ' logged. The Journal tab lists what is missing.', done: 'A complete collection. I shall need a bigger drawer.' }
];
const Q_BY = {}; QUESTS.forEach(q => { Q_BY[q.id] = q; });

/* ======================= small helpers ======================= */
function led() { return P() ? P().get() : { rooms: {}, found: {}, items: {}, quests: {}, games: {}, log: [], stats: {} }; }
const isFound = id => !!led().found[id];
const foundCount = () => nFound(led());
function toast(h, kind, ms) { if (typeof root.toast === 'function') root.toast(h, kind || 'speech', ms || 2600); }
const sfx = n => { if (typeof root.sfx === 'function') { try { root.sfx(n); } catch (e) {} } };

/* Record a discovery once. Returns true the first time. */
function discover(id, opts) {
  if (!DISC[id] || !P() || isFound(id)) return false;
  P().update(d => { d.found[id] = Date.now(); d.log.push({ t: Date.now(), k: 'found', id: id, x: 'Discovered: ' + DISC[id].n }); }, 'found');
  if (!(opts && opts.quiet)) { toast('<b>New discovery</b><br>' + esc(DISC[id].n) + ' <small>(' + esc(DISC[id].k) + ')</small>', 'coin', 2800); sfx('reveal'); const g = G(); if (g && g.emit) g.emit('discover', { id: id }); }
  return true;
}
/* game progress → ledger (tier only ever rises) */
function setTier(gameId, n) { if (!P()) return; P().update(d => { const g = d.games[gameId] || (d.games[gameId] = { best: 0, plays: 0, wins: 0, last: 0, tier: 0 }); if (n > g.tier) g.tier = Math.min(9, n); }, 'tier'); }

/* ======================= info card (the shared feedback surface for interactions) ======================= */
const Info = {
  el: null, cfg: null, i: 0, prevFocus: null,
  open(cfg) {
    const L = LE(); if (!L || !L.cv) return; this.close(true); this.cfg = cfg; this.i = Math.max(0, cfg.index | 0);
    const wrapEl = L.cv.parentNode; wrapEl.style.position = 'relative';
    const el = this.el = doc.createElement('div'); el.className = 'lgi'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', cfg.title || 'Details');
    this.prevFocus = doc.activeElement; wrapEl.appendChild(el); this.paint(); doc.addEventListener('keydown', this.key, true);
    el.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const k = b.dataset.i;
      if (k === 'close') Info.close(); else if (k === 'prev') Info.go(-1); else if (k === 'next') Info.go(1); else if (k === 'act') { const a = cfg.actions && cfg.actions[+b.dataset.n]; if (a) { if (a.close !== false) Info.close(); a.run(); } } });
    sfx('click'); const f = $1('[data-i=close]', el); if (f) f.focus();
  },
  paint() {
    const c = this.cfg, el = this.el; if (!c || !el) return; const pages = c.pages || [], pg = pages[this.i] || {}, n = pages.length;
    if (c.onView && pg && !pg.locked) { try { c.onView(this.i, pg); } catch (e) {} }
    el.innerHTML = '<div class="lgi-h"><span class="lgi-ic" aria-hidden="true">' + esc(pg.icon || c.icon || '') + '</span><div class="lgi-t"><small>' + esc(pg.kicker || c.kicker || '') + '</small><b>' + esc(pg.title || c.title || '') + '</b></div><button type="button" class="lgi-x" data-i="close" aria-label="Close">\u2715</button></div>' +
      '<div class="lgi-b">' + (pg.svg ? '<div class="lgi-svg">' + pg.svg + '</div>' : '') + '<div class="lgi-p" aria-live="polite">' + (pg.html || '') + '</div></div>' +
      '<div class="lgi-f">' + (n > 1 ? '<button type="button" class="btn" data-i="prev" aria-label="Previous"' + (this.i === 0 ? ' disabled' : '') + '>\u2039</button><span class="lgi-n">' + (this.i + 1) + ' / ' + n + '</span><button type="button" class="btn" data-i="next" aria-label="Next"' + (this.i === n - 1 ? ' disabled' : '') + '>\u203a</button>' : '') +
      (c.actions || []).map((a, k) => '<button type="button" class="btn' + (a.primary ? ' primary' : '') + '" data-i="act" data-n="' + k + '">' + esc(a.label) + '</button>').join('') + '</div>';
  },
  go(d) { const n = (this.cfg.pages || []).length; this.i = Math.max(0, Math.min(n - 1, this.i + d)); this.paint(); const b = $1('[data-i=' + (d < 0 ? 'prev' : 'next') + ']', this.el) || $1('[data-i=close]', this.el); if (b) b.focus(); sfx('flip'); },
  key(e) {
    if (!Info.el) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); Info.close(); }
    else if (e.key === 'ArrowRight' && Info.el.contains(doc.activeElement)) { e.preventDefault(); Info.go(1); } else if (e.key === 'ArrowLeft' && Info.el.contains(doc.activeElement)) { e.preventDefault(); Info.go(-1); }
  },
  close(quiet) {
    if (!this.el) return; doc.removeEventListener('keydown', this.key, true); if (this.el.parentNode) this.el.parentNode.removeChild(this.el); this.el = null; this.cfg = null;
    const L = LE(); if (!quiet && L && L.cv && L.active) { try { L.cv.focus({ preventScroll: true }); } catch (e) {} } this.prevFocus = null;
  }
};
function starSVG(c, lit) {   /* a constellation as an inline SVG: stars + (optionally) the connecting lines */
  const W = 150, Hh = 100, px = s => [Math.round(8 + s[0] * (W - 16)), Math.round(8 + s[1] * (Hh - 16))];
  const lines = lit ? c.e.map(e => { const a = px(c.s[e[0]]), b = px(c.s[e[1]]); return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#5fd0ee" stroke-width="1.4" opacity=".7"/>'; }).join('') : '';
  return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="150" height="100" role="img" aria-label="' + esc(lit ? c.n + ' star pattern' : 'Unknown star pattern') + '"><rect width="' + W + '" height="' + Hh + '" rx="10" fill="#050c24"/>' + lines + c.s.map(s => { const p = px(s); return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="#fff6d8"/>'; }).join('') + '</svg>';
}

/* ======================= interaction registry ======================= */
const IX = {};
function defIx(def) {
  if (!def || !def.id || IX[def.id]) return false; IX[def.id] = def; const g = G(); if (!g) return false;
  return g.addHotspot(def.room, Object.assign({ id: def.id, t: 'ix', ix: def.id, l: def.l, verb: def.verb, icon: def.icon, lf: def.lf }, def.hot));
}
function runIx(id) {
  const d = IX[id]; if (!d) return; const why = d.requires && d.requires(); if (why) { toast('<b>' + esc(d.l) + '</b><br>' + esc(why), 'speech', 3000); sfx('cross'); return; }
  try { d.run(api); } catch (e) { if (root.console) console.error('[lounge-world:ix:' + id + ']', e); }
}
const api = { info: c => Info.open(c), discover: discover, isFound: isFound, setTier: setTier, led: led, toast: toast, esc: esc, starSVG: starSVG, SKY: SKY, DISC: DISC, emote: k => { const g = G(); if (g) g.doEmote(k); } };

/* ======================= quests ======================= */
const JUST = []; let evaluating = false;
function questState(d, q) { const st = d.quests[q.id]; if (st && st.s === 'done') return 'done'; if (q.after && !(d.quests[q.after] && d.quests[q.after].s === 'done')) return 'locked'; return 'active'; }
function completeQuest(q) {
  P().update(d => { d.quests[q.id] = { s: 'done', p: q.prog(d)[1], t: Date.now() }; d.log.push({ t: Date.now(), k: 'quest', id: q.id, x: 'Quest complete: ' + q.title }); }, 'quest');
  JUST.push({ id: q.id, npc: q.npc, ack: false }); toast('<b>Quest complete</b><br>' + esc(q.title) + (q.xp ? ' \u00b7 +' + q.xp + ' XP' : ''), 'coin', 3400); sfx('combo');
  if (q.xp && typeof root.gainXP === 'function') { try { root.gainXP(q.xp, true); } catch (e) {} }        /* once per quest: the ledger marks it done BEFORE the reward */
}
function evalQuests() {
  if (evaluating || !P() || P().readonly()) return; evaluating = true;
  try { let again = true, guard = 0; while (again && guard++ < 12) { again = false; const d = P().get(); for (const q of QUESTS) { if (questState(d, q) !== 'active') continue; const pr = q.prog(d); if (pr[0] >= pr[1]) { completeQuest(q); again = true; break; } } } }
  finally { evaluating = false; }
}
/* what an NPC says right now: acknowledgement of a fresh completion, else the current objective (offer or progress nudge), else a closing line */
function npcLine(npcId) {
  if (!P()) return null; const j = JUST.find(x => x.npc === npcId && !x.ack); if (j) { j.ack = true; return { text: Q_BY[j.id].done }; }
  const d = P().get(), mine = QUESTS.filter(q => q.npc === npcId);
  for (const q of mine) { if (questState(d, q) !== 'active') continue; if (q.need && !(root.CodexLoungeGames && root.CodexLoungeGames[q.need])) continue; const pr = q.prog(d); return { text: (pr[0] > 0 ? q.nudge(pr[0], pr[1]) : q.offer), quest: q.id, go: q.where, goLabel: 'Show me where' }; }
  return mine.length && mine.every(q => questState(d, q) === 'done') ? { text: ({ mira: 'Everything is brewing nicely. Come by any time \u2014 the shift board is always open.', orrin: 'Every case closed, every entry logged. Stay as long as you like. The fire is good company.', wren: 'You have seen everything I have. Which means I will have to find new rooms.' })[npcId] || null } : null;
}
function goTo(room) { const g = G(); if (!g) return false; const dest = MAIN.includes(room) || SIDE.includes(room) ? room : null; if (!dest) return false; return g.setRoom(dest, { from: g.room() }); }

/* ======================= side rooms ======================= */
const GEO = () => (root.CodexLoungeArt && root.CodexLoungeArt.GEO) || {};
function registerWorld() {
  const g = G(); if (!g || !g.registerRoom) return false; const geo = GEO(), ex = geo.exit || { x: 8, y: 128, w: 38, h: 58 };
  const exitDoor = (to, sx, sy) => ({ id: 'out', t: 'door', to: to, x: ex.x, y: ex.y, w: ex.w, h: ex.h, sx: 40, sy: 212, l: 'Back to ' + g.ROOMS[to].n });
  const keycard = () => { const n = foundCount(); return n >= 3 ? null : 'Orrin issues key cards to readers with 3 discoveries (' + n + '/3). Try the Dome atlas, the kitchen recipe board or the conservatory specimen cases.'; };
  g.registerRoom({ id: 'dome', parent: 'deck', n: 'Telescope Dome', i: '\ud83d\udd2d', k: 'DOME \u00b7 STAR CHARTS', d: 'A brass-ribbed dome with a slit open to the night. Star charts are pinned to the wall and the big telescope tracks the sky.', spawn: { x: 120, y: 240, from: { deck: { x: 66, y: 238 } } }, hot: [exitDoor('deck')] });
  g.registerRoom({ id: 'kitchen', parent: 'cafe', n: 'Caf\u00e9 Kitchen', i: '\ud83c\udf73', k: 'KITCHEN \u00b7 PREP LINE', d: 'Steel counters, a hissing range and a ticket rail. The recipe board changes with the day, and Mira\u2019s pantry keeps everything cold.', spawn: { x: 120, y: 240, from: { cafe: { x: 66, y: 238 } } }, hot: [exitDoor('cafe')] });
  g.registerRoom({ id: 'conservatory', parent: 'garden', n: 'Bioluminescent Conservatory', i: '\ud83e\udeb8', k: 'CONSERVATORY \u00b7 SPECIMENS', d: 'A glass dome full of things that make their own light. Specimens sit in lit cases; a terrarium glows at the centre.', spawn: { x: 120, y: 240, from: { garden: { x: 66, y: 238 } } }, hot: [exitDoor('garden')] });
  g.registerRoom({ id: 'archive', parent: 'loft', n: 'Archive Stacks', i: '\ud83d\udddd\ufe0f', k: 'ARCHIVE \u00b7 RESTRICTED STACKS', d: 'Tall stacks, a red runner and a brass cipher wheel on the reading desk. A case of rare books keeps the old methods.', lock: keycard, spawn: { x: 120, y: 240, from: { loft: { x: 66, y: 238 } } }, hot: [exitDoor('loft')] });
  /* entrances live in the main rooms (door hotspots drawn by lounge-art.js at the same rectangles) */
  const door = (room, to, gx, sx, sy, l, extra) => g.addHotspot(room, Object.assign({ id: 'to_' + to, t: 'door', to: to, x: gx.x, y: gx.y, w: gx.w, h: gx.h, sx: sx, sy: sy, l: l }, extra || {}));
  g.setSpawn('deck', 'dome', { x: 116, y: 228 }); g.setSpawn('cafe', 'kitchen', { x: 212, y: 228 }); g.setSpawn('garden', 'conservatory', { x: 208, y: 228 }); g.setSpawn('loft', 'archive', { x: 356, y: 228 });   /* come back out in front of the door you used */
  door('deck', 'dome', geo.deck.dome, 116, 212, 'Dome hatch \u2192 Telescope Dome');
  door('cafe', 'kitchen', geo.cafe.kitchen, 212, 210, 'Kitchen door \u2192 Caf\u00e9 Kitchen');
  door('garden', 'conservatory', geo.garden.conservatory, 208, 208, 'Glass arch \u2192 Conservatory');
  door('loft', 'archive', geo.loft.archive, 356, 212, 'Hidden bookcase \u2192 Archive Stacks', { lf: () => (keycard() ? 'Bookcase door \uD83D\uDD12 ' + foundCount() + '/3 discoveries' : 'Bookcase door \u2192 Archive Stacks') });

  /* ---- Telescope Dome: the atlas studies the NEXT chart; cleared charts show their facts ---- */
  defIx({ id: 'atlas', room: 'dome', hot: { x: 34, y: 150, w: 98, h: 38, sx: 84, sy: 212 }, l: 'Star atlas', verb: 'Study the charts', icon: '\ud83d\udcd6',
    run(a) {
      const d = a.led(), cleared = Math.min(SKY.length, (d.games.survey && d.games.survey.tier) | 0);
      const pages = SKY.map((c, i) => i < cleared ? { title: c.n, kicker: 'Chart ' + (i + 1) + ' \u00b7 cleared', icon: '\u2728', svg: starSVG(c, true), html: '<p>' + esc(c.fact) + '</p>' } :
        i === cleared ? { title: 'Next chart: ' + c.n, kicker: 'Chart ' + (i + 1) + ' \u00b7 study this shape', icon: '\ud83d\udd2d', svg: starSVG(c, true), html: '<p>Memorise how the stars connect. At the telescope you will see the stars without the lines, rotated, among decoys.</p>' } :
        { title: 'Chart ' + (i + 1), kicker: 'Locked', icon: '\ud83d\udd12', svg: starSVG(c, false), html: '<p>Clear the earlier charts at the telescope to unlock this one.</p>', locked: true });
      a.info({ title: 'Star atlas', icon: '\ud83d\udcd6', pages: pages, index: Math.min(cleared, SKY.length - 1) });
    } });
  /* ---- Kitchen: recipes are discoveries; the pantry is a one-off ---- */
  defIx({ id: 'recipes', room: 'kitchen', hot: { x: 112, y: 52, w: 108, h: 76, sx: 166, sy: 212 }, l: 'Recipe board', verb: 'Read the recipes', icon: '\ud83d\udccb',
    run(a) {
      const body = { espresso: ['Grind fine, dose 18 g, tamp level.', 'Pull 36 g of espresso in about 25\u201330 s.', 'Serve immediately: crema fades in minutes.'], matcha: ['Sift 2 g of matcha to break clumps.', 'Add 70 mL of water at about 80\u00b0C.', 'Whisk in a W-motion until a fine foam forms.'], boba: ['Boil the pearls until they float, then simmer.', 'Rest them covered, off the heat, for 15 minutes.', 'Rinse and soak in brown-sugar syrup.'] };
      a.info({ title: 'Recipe board', icon: '\ud83d\udccb', onView: (i, p) => a.discover(RECIPES[i]), pages: RECIPES.map(id => ({ title: DISC[id].n, kicker: 'Recipe', icon: '\u2615', html: '<ol>' + body[id].map(s => '<li>' + esc(s) + '</li>').join('') + '</ol><p class="lgi-fact">' + esc(DISC[id].fact) + '</p>' })) });
    } });
  defIx({ id: 'pantry', room: 'kitchen', hot: { x: 52, y: 68, w: 52, h: 118, sx: 78, sy: 210 }, l: 'Pantry fridge', verb: 'Check the stock', icon: '\ud83e\uddca',
    run(a) { a.discover('coldchain'); a.info({ title: 'Pantry fridge', icon: '\ud83e\uddca', pages: [{ title: DISC.coldchain.n, kicker: 'Pantry', icon: '\ud83e\uddca', html: '<p>' + esc(DISC.coldchain.fact) + '</p><p>Mira labels every tub with the day it was opened.</p>' }] }); } });
  /* ---- Conservatory: specimen cases, browsable; first view logs a discovery ---- */
  defIx({ id: 'cases', room: 'conservatory', hot: { x: 332, y: 116, w: 130, h: 72, sx: 396, sy: 212 }, l: 'Specimen cases', verb: 'Inspect', icon: '\ud83d\udd0e',
    run(a) {
      const note = { dinoflagellate: 'Field note: feeds on light and nutrients \u2014 a producer. Grazers keep its numbers in check.', vibrio: 'Field note: thrives where nutrients are plentiful; needs a host or a rich broth.', aequorea: 'Field note: a predator of plankton and small drifters \u2014 it needs a steady food supply.', glowworm: 'Field note: a hunter that tolerates dark and damp; too much light shuts its glow down.', foxfire: 'Field note: a decomposer \u2014 it turns dead wood and waste into food for others, and needs oxygen.' };
      a.info({ title: 'Specimen cases', icon: '\ud83d\udd0e', onView: (i, p) => a.discover(SPECIMENS[i]), pages: SPECIMENS.map(id => ({ title: DISC[id].n, kicker: 'Specimen', icon: '\ud83e\udeb8', html: '<p>' + esc(DISC[id].fact) + '</p><p class="lgi-fact">' + esc(note[id]) + '</p>' })) });
    } });
  /* ---- Archive: the rare-book case teaches the four methods the cipher desk uses ---- */
  defIx({ id: 'rarebooks', room: 'archive', hot: { x: 350, y: 108, w: 80, h: 78, sx: 392, sy: 212 }, l: 'Rare book case', verb: 'Read the notes', icon: '\ud83d\udcda',
    run(a) {
      const how = { caesar: 'To decode: slide every letter BACK by the shift. Try each shift until words appear, or use a clue that tells you the shift.', atbash: 'To decode: swap each letter with its mirror (A\u2194Z, B\u2194Y, C\u2194X \u2026). Applying it twice gives back the original.', rail: 'To decode: count the zigzag. Fill the top rail first, then the next, and read the zigzag path back down and up.', vigenere: 'To decode: line the keyword up under the text and shift each letter back by its keyword letter (A=0, B=1, \u2026).' };
      a.info({ title: 'Rare book case', icon: '\ud83d\udcda', onView: (i, p) => a.discover(CIPHERS[i]), pages: CIPHERS.map(id => ({ title: DISC[id].n, kicker: 'Method', icon: '\ud83d\udcdc', html: '<p>' + esc(DISC[id].fact) + '</p><p class="lgi-fact">' + esc(how[id]) + '</p>' })) });
    } });
  return true;
}

/* ======================= console: Quests tab + collection ======================= */
function questsHTML(d) {
  const rows = QUESTS.map(q => ({ q: q, st: questState(d, q), pr: q.prog(d) })).filter(r => !r.q.need || (root.CodexLoungeGames && root.CodexLoungeGames[r.q.need]) || r.st === 'done');
  const card = r => { const pct = Math.round(100 * Math.min(1, r.pr[0] / r.pr[1])), npc = r.q.npc[0].toUpperCase() + r.q.npc.slice(1);
    return '<article class="lc-quest' + (r.st === 'done' ? ' done' : '') + '"><h4>' + esc(r.q.title) + (r.st === 'done' ? ' <span class="lc-tick" aria-label="completed">\u2713</span>' : '') + '</h4><p>' + esc(r.q.text) + '</p><div class="lc-prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + r.pr[1] + '" aria-valuenow="' + r.pr[0] + '" aria-label="' + esc(r.q.title) + ' progress"><i style="width:' + pct + '%"></i></div><p class="lc-meta">' + r.pr[0] + '/' + r.pr[1] + ' \u00b7 from ' + esc(npc) + (r.q.xp ? ' \u00b7 ' + r.q.xp + ' XP' : '') + '</p>' + (r.st === 'active' ? '<button type="button" class="btn lc-go" data-goroom="' + esc(r.q.where) + '" data-fk="q:' + r.q.id + '">Go there</button>' : '') + '</article>'; };
  const act = rows.filter(r => r.st === 'active'), lock = rows.filter(r => r.st === 'locked'), done = rows.filter(r => r.st === 'done');
  return '<h4 class="lc-h">Objectives <span class="lc-count">' + act.length + '</span></h4>' + (act.map(card).join('') || '<p class="lc-empty">Nothing active \u2014 every objective is complete.</p>') +
    (lock.length ? '<h4 class="lc-h">Later</h4>' + lock.map(r => '<p class="lc-empty">\ud83d\udd12 ' + esc(r.q.title) + ' \u2014 finish \u201c' + esc(Q_BY[r.q.after].title) + '\u201d first.</p>').join('') : '') +
    (done.length ? '<h4 class="lc-h">Completed <span class="lc-count">' + done.length + '</span></h4>' + done.map(card).join('') : '');
}
function collectionHTML(d) {
  const kinds = ['Sky', 'Recipe', 'Pantry', 'Specimen', 'Cipher'], n = nFound(d);
  return '<h4 class="lc-h">Collection <span class="lc-count">' + n + '/' + DISC_IDS.length + '</span></h4>' + kinds.map(k => { const ids = DISC_IDS.filter(i => DISC[i].k === k);
    return '<details class="lc-coll"><summary>' + esc(k) + ' <span class="lc-count">' + ids.filter(i => d.found[i]).length + '/' + ids.length + '</span></summary>' + ids.map(i => d.found[i] ? '<p><b>' + esc(DISC[i].n) + '</b> \u2014 ' + esc(DISC[i].fact) + '</p>' : '<p class="lc-empty">??? \u2014 found in the ' + esc((G() && G().ROOMS[DISC[i].room] && G().ROOMS[DISC[i].room].n) || DISC[i].room) + '</p>').join('') + '</details>'; }).join('');
}
function registerConsole() {
  const C = root.CodexLoungeConsole; if (!C) return;
  C.registerTab({ id: 'quests', label: 'Quests', order: 15,
    badge: () => (P() ? QUESTS.filter(q => questState(P().get(), q) === 'active' && (!q.need || (root.CodexLoungeGames && root.CodexLoungeGames[q.need]))).length : 0),
    render(p, c) { const d = P() ? P().get() : null; if (!d) { c.setHTML(p, '<p class="lc-empty">Progress tracking is unavailable.</p>'); return; } c.setHTML(p, questsHTML(d));
      if (!p.__bound) { p.__bound = 1; p.addEventListener('click', e => { const b = e.target.closest('[data-goroom]'); if (b) { goTo(b.dataset.goroom); } }); } } });
}

/* ======================= wiring ======================= */
let started = false;
function init() {
  if (started) return; const g = G(); if (!g || !g.registerRoom) return; started = true;
  registerWorld(); registerConsole();
  g.handlers.ix = a => runIx(a.ix);
  P() && P().onChange(evalQuests);
  g.on('room', () => Info.close(true)); g.on('active', e => { if (!e.on) Info.close(true); else evalQuests(); });
  evalQuests();
}
doc.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { if (root.console) console.error('[lounge-world]', e); } });

root.CodexLoungeWorld = {
  SKY: SKY, DISC: DISC, QUESTS: QUESTS, MAIN: MAIN, SIDE: SIDE, IX: IX, defIx: defIx, runIx: runIx, api: api, info: Info, init: init,
  discover: discover, isFound: isFound, foundCount: foundCount, setTier: setTier, questState: questState, evalQuests: evalQuests, npcLine: npcLine, goTo: goTo,
  collectionHTML: collectionHTML, starSVG: starSVG, _t: { JUST: JUST }
};
if (typeof module !== 'undefined' && module.exports) module.exports = root.CodexLoungeWorld;
})(typeof window !== 'undefined' ? window : globalThis);
