/* lounge-games-keeper.js — Ecosystem Keeper (Glow Greenhouse / Conservatory terrarium).
   MECHANIC: systems balance. Keep three populations inside their safe bands for several cycles in a row by steering light, nutrients and the
   population itself — two actions per cycle. Every cycle prints the cause and effect that produced the result, so the player can reason, not guess.
   PRESENTATION: a compact activity inside the Activity Console (the world stays live; the player can keep walking and reading the specimen cases).
   RULES CORE: Model.step() is pure and deterministic (no DOM, no randomness) so balance is testable. */
(function (root) {
'use strict';
const doc = root.document;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CAP = 10, PICKS = 2;
const SP = { p: { n: 'Phytoplankton', c: '#46e0a0', d: 'Makes food from light + nutrients' }, z: { n: 'Copepods', c: '#ffb04a', d: 'Graze phytoplankton' }, j: { n: 'Comb jellies', c: '#b784ff', d: 'Eat copepods' } };
const SCEN = [
  { id: 'starter', name: 'Starter tank', story: 'A young tank: phytoplankton and a few copepods. Keep the grazers from eating everything.', start: { n: 4, p: 3, z: 2, j: 0, light: 2 }, bands: { p: [3, 8], z: [1, 6], j: null }, need: 5, limit: 16, inflow: [1] },
  { id: 'predator', name: 'A predator arrives', story: 'Comb jellies join the tank. Now the grazers have a hunter, and the hunter needs grazers.', start: { n: 5, p: 4, z: 3, j: 1, light: 2 }, bands: { p: [2, 8], z: [1, 6], j: [1, 4] }, need: 5, limit: 18, inflow: [1, 0] },
  { id: 'pulse', name: 'Nutrient pulse', story: 'A pump dumps nutrients every third cycle. Bursts of food mean bursts of growth: plan for the surge.', start: { n: 3, p: 3, z: 3, j: 2, light: 2 }, bands: { p: [2, 7], z: [2, 6], j: [1, 3] }, need: 6, limit: 20, inflow: [0, 0, 4] }
];
const ACTS = {
  'light+': ['Light +', 'More light: phytoplankton can grow faster (up to 3 per cycle).'], 'light-': ['Light −', 'Less light: slows phytoplankton growth.'], feed: ['Add nutrients', '+3 nutrients (the tank holds 10).'],
  harvestP: ['Harvest phytoplankton', 'Remove 2 phytoplankton.'], harvestZ: ['Harvest copepods', 'Remove 2 copepods.'], harvestJ: ['Harvest comb jellies', 'Remove 2 comb jellies.'],
  seedP: ['Seed phytoplankton', 'Add 1 phytoplankton.'], seedZ: ['Seed copepods', 'Add 1 copepod.'], seedJ: ['Seed comb jellies', 'Add 1 comb jelly.']
};
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- pure rules ---------- */
const Model = {
  CAP: CAP, PICKS: PICKS, SCEN: SCEN, ACTS: Object.keys(ACTS),
  init: scn => Object.assign({ cycle: 0, stable: 0 }, scn.start),
  /* the actions a player may choose right now: comb-jelly actions exist only in tanks that have jellies. The UI and step() both use this, so the rules can never offer a move the screen does not. */
  available: (s, scn) => Object.keys(ACTS).filter(a => a.slice(-1) !== 'J' || !!scn.bands.j || (s.j | 0) > 0),
  /* one cycle: apply the chosen actions, then growth → grazing → predation → recycling. Returns the new state, a causal log, and the outcome. */
  step(s0, acts, scn) {
    const s = Object.assign({}, s0), ok = Model.available(s0, scn); acts = (acts || []).filter(a => ok.indexOf(a) >= 0).slice(0, PICKS);
    acts.forEach(a => {
      if (a === 'light+') s.light = cl(s.light + 1, 0, 4); else if (a === 'light-') s.light = cl(s.light - 1, 0, 4); else if (a === 'feed') s.n = cl(s.n + 3, 0, CAP);
      else if (a.indexOf('harvest') === 0) { const k = a.slice(7).toLowerCase(); if (SP[k]) s[k] = Math.max(0, s[k] - 2); } else if (a.indexOf('seed') === 0) { const k = a.slice(4).toLowerCase(); if (SP[k]) s[k] = Math.min(CAP, s[k] + 1); }
    });
    const gP = Math.min(s.light, s.n, 3); s.n -= gP; s.p = Math.min(CAP, s.p + gP);
    const eatZ = Math.min(s.p, s.z), starveZ = s.z > eatZ ? Math.ceil((s.z - eatZ) / 2) : 0, gZ = Math.floor(eatZ / 2); s.p -= eatZ; s.z = cl(s.z + gZ - starveZ, 0, CAP);
    const eatJ = Math.min(s.z, s.j), starveJ = s.j > eatJ ? Math.ceil((s.j - eatJ) / 2) : 0, gJ = Math.floor(eatJ / 2); s.z -= eatJ; s.j = cl(s.j + gJ - starveJ, 0, CAP);
    const inflow = scn.inflow[(s0.cycle | 0) % scn.inflow.length] | 0, back = Math.floor((starveZ + starveJ + eatJ) / 2); s.cycle = (s0.cycle | 0) + 1; s.n = cl(s.n + back + inflow, 0, CAP);
    const lines = ['Light ' + s0.light + (acts.indexOf('light+') >= 0 || acts.indexOf('light-') >= 0 ? ' → ' + s.light : '') + ' × nutrients ' + (s.n + gP - back - inflow) + ' → +' + gP + ' phytoplankton.'];
    lines.push('Copepods grazed ' + eatZ + ' phytoplankton' + (gZ ? ' → +' + gZ + ' copepod' + (gZ > 1 ? 's' : '') : '') + (starveZ ? '; ' + starveZ + ' starved' : '') + '.');
    if (scn.bands.j || s0.j > 0) lines.push('Comb jellies ate ' + eatJ + ' copepod' + (eatJ === 1 ? '' : 's') + (gJ ? ' → +' + gJ + ' jelly' : '') + (starveJ ? '; ' + starveJ + ' starved' : '') + '.');
    lines.push('Recycling returned ' + back + ' nutrient' + (back === 1 ? '' : 's') + (inflow ? '; the pump added ' + inflow : '') + '.');
    let fail = null; if (s.p >= CAP) fail = 'bloom'; else if (s.p === 0) fail = 'p'; else if (s.z === 0) fail = 'z'; else if (scn.bands.j && s.j === 0) fail = 'j';
    const inb = (v, b) => !b || (v >= b[0] && v <= b[1]);
    s.stable = inb(s.p, scn.bands.p) && inb(s.z, scn.bands.z) && inb(s.j, scn.bands.j) ? (s0.stable | 0) + 1 : 0;
    return { s: s, lines: lines, fail: fail, won: !fail && s.stable >= scn.need };
  },
  failText: f => f === 'bloom' ? 'Algal bloom: phytoplankton choked the tank of oxygen.' : f === 'p' ? 'The phytoplankton died out, so everything that eats it starves.' : f === 'z' ? 'The copepods died out.' : f === 'j' ? 'The comb jellies died out.' : 'Out of time.',
  score: (cycles, scn, used) => Math.max(10, 100 - 5 * Math.max(0, cycles - scn.need) - 2 * used)
};

/* ---------- activity UI (console tab) ---------- */
function start(opts) {
  opts = opts || {}; const G = root.CodexLoungeGames, host = opts.host || (G && G.host);
  let prev = null, idx = cl((opts.scenario | 0) - 1, 0, SCEN.length - 1), scn = SCEN[idx], st = Model.init(scn), picks = [], used = 0, ended = false, dead = false, view = 'menu', lastLines = [], note = '', tab = null, runs = 0;
  const reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches), unlocked = Math.max(0, opts.cleared | 0) + 1, forecastOn = !!opts.forecast;
  const result = x => Object.assign({ won: false, score: 0, rounds: st.cycle, mistakes: 0, quit: false, scenario: idx + 1 }, x);
  const bandOf = k => scn.bands[k];
  let panel = null;
  const meter = k => { const v = st[k], bump = !!prev && prev[k] !== v && !reduced, b = bandOf(k), ok = !b || (v >= b[0] && v <= b[1]); let seg = ''; for (let i = 1; i <= CAP; i++) seg += '<i class="' + (i <= v ? 'on' : '') + (b && i >= b[0] && i <= b[1] ? ' band' : '') + '"></i>'; return '<div class="kp-row" style="--c:' + SP[k].c + '"><span class="kp-n">' + esc(SP[k].n) + '</span><div class="kp-m' + (ok ? '' : ' warn') + (bump ? ' bump' : '') + '" role="meter" aria-label="' + esc(SP[k].n) + '" aria-valuemin="0" aria-valuemax="' + CAP + '" aria-valuenow="' + v + '"' + (b ? ' aria-valuetext="' + v + ', safe ' + b[0] + ' to ' + b[1] + '"' : '') + '>' + seg + '</div><b class="kp-v">' + v + '</b><small>' + (b ? 'safe ' + b[0] + '–' + b[1] : SP[k].d) + '</small></div>'; };
  const tank = () => { let dots = ''; [['p', 11], ['z', 7], ['j', 5]].forEach(a => { for (let i = 0; i < st[a[0]]; i++) { const x = 8 + ((i * 37 + a[1] * 13) % 120), y = 8 + ((i * 23 + a[1] * 7) % 54); dots += '<circle class="kp-d" cx="' + x + '" cy="' + y + '" r="' + (a[0] === 'j' ? 3.4 : a[0] === 'z' ? 2.4 : 1.8) + '" fill="' + SP[a[0]].c + '" style="animation-delay:-' + ((i * 7 + a[1]) % 9) / 3 + 's"/>'; } }); return '<svg class="kp-tank" viewBox="0 0 136 70" role="img" aria-label="Tank: ' + st.p + ' phytoplankton, ' + st.z + ' copepods, ' + st.j + ' comb jellies"><rect width="136" height="70" rx="8" fill="#062a3a"/>' + dots + '<rect y="' + (70 - st.n * 3) + '" width="136" height="' + st.n * 3 + '" fill="rgba(255,255,255,.07)"/></svg>'; };
  function paint() {
    if (!panel || dead) return; let h;
    if (view === 'menu') {
      h = '<h4>Ecosystem Keeper</h4><p class="kp-intro">Steer light and nutrients, harvest or seed — two actions a cycle. Hold every population in its safe band for several cycles in a row.</p>' + SCEN.map((c, i) => '<button type="button" class="kp-scn" data-scn="' + i + '"' + (i + 1 > unlocked ? ' disabled' : '') + ' data-fk="s' + i + '"><b>' + (i + 1) + '. ' + esc(c.name) + '</b><small>' + (i + 1 > unlocked ? '🔒 Clear the previous tank first' : esc(c.story)) + '</small></button>').join('') + '<div class="kp-acts"><button type="button" class="btn" data-k="close">Close</button></div>';
    } else {
      const left = PICKS - picks.length, fc = forecastOn && !ended ? Model.step(st, picks, scn) : null;
      h = '<h4>' + esc(scn.name) + '</h4>' + tank() + '<p class="kp-meta">Cycle <b>' + st.cycle + '</b> / ' + scn.limit + ' · stable <b>' + st.stable + '</b> / ' + scn.need + ' · light ' + '●'.repeat(st.light) + '○'.repeat(4 - st.light) + ' · nutrients <b>' + st.n + '</b></p>' +
        '<div class="kp-meters">' + meter('p') + meter('z') + (scn.bands.j || st.j ? meter('j') : '') + '</div>';
      if (!ended) {
        h += '<p class="kp-h">Actions this cycle <span>(' + left + ' left)</span></p><div class="kp-chips" role="group" aria-label="Actions">' + Model.available(st, scn).map(a => { const on = picks.indexOf(a) >= 0; return '<button type="button" class="kp-chip" data-act="' + a + '" aria-pressed="' + on + '" title="' + esc(ACTS[a][1]) + '"' + (!on && !left ? ' disabled' : '') + ' data-fk="a:' + a + '">' + esc(ACTS[a][0]) + '</button>'; }).join('') + '</div>' +
          '<div class="kp-acts"><button type="button" class="btn primary" data-k="run" data-fk="run">Run cycle</button>' + (forecastOn ? '' : '') + '<button type="button" class="btn" data-k="restart">Restart</button><button type="button" class="btn" data-k="close">Close</button></div>' +
          (fc ? '<p class="kp-fc">Forecast: phytoplankton ' + fc.s.p + ', copepods ' + fc.s.z + (scn.bands.j || st.j ? ', jellies ' + fc.s.j : '') + (fc.fail ? ' — <b>' + esc(Model.failText(fc.fail)) + '</b>' : '') + '</p>' : '<p class="kp-fc kp-lock">Forecast tool: inspect 3 specimens in the cases to unlock a preview of the next cycle.</p>');
      } else {
        h += '<div class="kp-acts"><button type="button" class="btn primary" data-k="again" data-fk="again">' + (note.indexOf('stable') >= 0 && idx + 1 < SCEN.length && idx + 1 < unlocked + 1 ? 'Next tank' : 'Try again') + '</button><button type="button" class="btn" data-k="menu">Tanks</button><button type="button" class="btn" data-k="close">Close</button></div>';
      }
      h += '<p class="kp-note" role="status" aria-live="polite">' + esc(note) + '</p>' + (lastLines.length ? '<ul class="kp-log">' + lastLines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '');
    }
    const a = doc.activeElement, fk = a && panel.contains(a) ? a.getAttribute('data-fk') : ''; panel.innerHTML = '<div class="kp">' + h + '</div>';
    if (fk) { const n = panel.querySelector('[data-fk="' + fk + '"]'); if (n && !n.disabled) n.focus(); }
  }
  function begin(i) { prev = null; idx = cl(i, 0, SCEN.length - 1); scn = SCEN[idx]; st = Model.init(scn); picks = []; used = 0; ended = false; lastLines = []; note = scn.story; view = 'play'; runs++; paint(); }
  function run() {
    if (ended || dead) return; prev = Object.assign({}, st); const r = Model.step(st, picks, scn); used += picks.length; picks = []; st = r.s; lastLines = r.lines;
    if (r.fail || r.won || st.cycle >= scn.limit) {
      ended = true; const won = r.won; if (!won) note = r.fail ? Model.failText(r.fail) : 'Out of time: the tank never held steady long enough.'; else note = 'The tank held steady for ' + scn.need + ' cycles — stable!';
      const res = result({ won: won, score: won ? Model.score(st.cycle, scn, used) : 0, mistakes: won ? 0 : 1 }); if (G && G.report) G.report('keeper', res); if (opts.onEnd) opts.onEnd(res);
    } else note = st.stable ? 'In the safe bands (' + st.stable + '/' + scn.need + '). Hold it.' : 'Outside a safe band — adjust.';
    paint();
  }
  function onClick(e) {
    const t = e.target.closest('[data-act],[data-k],[data-scn]'); if (!t || dead) return;
    if (t.dataset.scn != null) { begin(+t.dataset.scn); return; }
    if (t.dataset.act) { const a = t.dataset.act, i = picks.indexOf(a); if (i >= 0) picks.splice(i, 1); else if (picks.length < PICKS) picks.push(a); paint(); return; }
    const k = t.dataset.k; if (k === 'run') run(); else if (k === 'restart' || k === 'again') begin(ended && note.indexOf('stable') >= 0 && idx + 1 < SCEN.length && idx + 1 < unlocked + 1 ? idx + 1 : idx); else if (k === 'menu') { view = 'menu'; paint(); } else if (k === 'close') ctl.quit('close');
  }
  const ctl = {
    el: null, get core() { return st; }, get dead() { return dead; }, model: Model,
    quit(why) { if (dead) return; const was = ended || view === 'menu' || !runs; this.destroy(); if (!was) { const res = result({ quit: true, aborted: why || '' }); if (G && G.report) G.report('keeper', res); if (opts.onEnd) opts.onEnd(res); } },
    destroy() { if (dead) return; dead = true; if (tab) tab.close(); try { if (opts.onClose) opts.onClose(ctl); } catch (e) {} }
  };
  tab = host && host.consoleTab ? host.consoleTab({ id: 'keeper', label: 'Terrarium', build: p => { panel = p; ctl.el = p; p.addEventListener('click', onClick); paint(); } }) : null;
  if (!tab) { dead = true; if (opts.onClose) opts.onClose(ctl); return ctl; }
  if (opts.scenario) begin(idx); else paint();
  return ctl;
}

const meta = { n: 'Ecosystem Keeper', room: 'conservatory', host: 'Terrarium console', mech: 'Systems balance', blurb: 'Balance light, nutrients and three populations. Two actions a cycle; read the cause and effect.' };
if (root.CodexLoungeGames && root.CodexLoungeGames.register) root.CodexLoungeGames.register('keeper', { start: start, meta: meta, Model: Model });
if (typeof module !== 'undefined' && module.exports) module.exports = { Model: Model, start: start, meta: meta };
})(typeof window !== 'undefined' ? window : globalThis);
