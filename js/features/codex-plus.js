/* codex-plus.js — overhaul layer. Load AFTER engine.js. Adds: richer sound, guided lessons,
   interactive simulation missions, "Up next" card, and the Void Warden boss mini-game. */
(function () {
'use strict';
const $1 = (s, r) => (r || document).querySelector(s);
const $A = (s, r) => Array.from((r || document).querySelectorAll(s));
const store = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* ================= SOUND ENGINE (replaces sfx) ================= */
let ctx, master, nbuf;
function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(); master = ctx.createGain(); master.gain.value = .9;
    master.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(f, at, dur, type, vol, to, lp) {
  const c = ac(), t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol || .08, t + .012);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  let n = o;
  if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
  n.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .03);
}
function noise(at, dur, vol, freq) {
  const c = ac();
  if (!nbuf) { nbuf = c.createBuffer(1, c.sampleRate >> 1, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = c.currentTime + at, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
  s.buffer = nbuf; f.type = 'bandpass'; f.frequency.value = freq || 1500; f.Q.value = .8;
  g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
}
const arp = (notes, step, dur, type, vol) => notes.forEach((f, i) => { tone(f, i * step, dur, type, vol); tone(f / 2, i * step, dur, 'sine', vol * .6); });
const SND = {
  ok: () => { tone(660, 0, .14, 'sine', .1); tone(990, .07, .22, 'sine', .09); tone(1320, .07, .2, 'triangle', .03); },
  bad: () => { tone(200, 0, .3, 'sawtooth', .06, 90, 900); noise(0, .12, .05, 400); },
  flip: () => { noise(0, .06, .05, 3000); tone(500, 0, .06, 'triangle', .04, 800); },
  click: () => tone(560, 0, .035, 'square', .025, 420, 2500),
  reveal: () => { tone(392, 0, .08, 'triangle', .06); tone(588, .06, .14, 'sine', .07); },
  level: () => arp([523, 659, 784, 1047, 1319], .09, .25, 'triangle', .08),
  badge: () => [784, 988, 1319, 1568].forEach((f, i) => tone(f, i * .08, .22, 'sine', .08)),
  done: () => arp([659, 784, 988, 1319], .09, .18, 'triangle', .07),
  heal: () => [392, 523, 659].forEach((f, i) => tone(f, i * .09, .25, 'sine', .07)),
  tick: a => tone(600 + (a || 0) * 800, 0, .03, 'square', .02, null, 3000),
  hit: () => { noise(0, .2, .12, 900); tone(180, 0, .28, 'sawtooth', .09, 45, 700); tone(880, 0, .08, 'square', .04, 1760); },
  hurt: () => { noise(0, .3, .1, 300); tone(110, 0, .4, 'sawtooth', .1, 40, 500); },
  roar: () => { tone(70, 0, 1, 'sawtooth', .1, 38, 380); tone(74, 0, 1, 'square', .05, 40, 300); noise(0, .8, .06, 200); },
  combo: n => { const b = 520 * Math.pow(1.122, Math.min(n || 1, 10)); tone(b, 0, .1, 'square', .04); tone(b * 1.5, .06, .16, 'triangle', .06); },
  power: () => tone(300, 0, .35, 'sawtooth', .05, 1800, 3000),
  shield: () => { tone(900, 0, .12, 'sine', .08); tone(600, .08, .2, 'triangle', .06); },
  win: () => { arp([523, 659, 784, 1047, 784, 1047, 1319], .12, .3, 'triangle', .09); noise(.7, .5, .04, 5000); },
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, i * .22, .4, 'sawtooth', .06, f * .9, 800))
};
window.sfx = function (name, a) {
  if (typeof S !== 'undefined' && S.sfx === false) return;
  try { const f = SND[name]; if (f) { ac(); f(a); } } catch (e) { /* audio unavailable */ }
};

/* ================= GUIDED LESSONS ================= */
const clipBtn = () => (window.NetworkEngine && NetworkEngine.NotebookManager) ? '<button type="button" class="vx-clip" title="Clip to your notebook" aria-label="Clip this block to your notebook">📎</button>' : '';
const steps = sec => $A('article.block', sec).concat($1('.qz', sec) || []);
function markSeen(b) {
  if (S.seen[b.id]) return;
  S.seen[b.id] = 1; save(); b.classList.add('seen');
  const sec = b.closest('.screen'); updateHUD(); checkBadges();
  if (secPct(sec.id) === 100 && !S.completed[sec.id]) {
    S.completed[sec.id] = 1; save(); sfx('done'); celebrate(85);
    toast('<b>SECTOR CLEARED!</b><br>+15 XP', 'trophy', 3800); gainXP(15, true);
    if (window.SystemsEngine) SystemsEngine.onSectorComplete(sec.id);
  }
}
function renderBar(sec, st) {
  const g = sec.classList.contains('guided'), i = sec._gi || 0, n = st.length, last = n - 1;
  $1('.gl-bar', sec).innerHTML = '<div class="gl-dots">' + st.map((el, k) =>
    '<button type="button" class="gl-dot' + (g && k === i ? ' on' : '') + ((k < last ? el.classList.contains('seen') : S.quizDone[sec.id]) ? ' done' : '') +
    '" data-k="' + k + '" title="' + (k < last ? esc(el.dataset.title) : 'Quick check') + '">' + (k < last ? k + 1 : '★') + '</button>').join('') +
    '</div><span class="gl-acts"><button type="button" class="btn gl-recap" title="Start a recap note for this sector">📝 Recap</button><button type="button" class="btn gl-mode">' + (g ? 'Show all' : 'Step by step') + '</button></span>';
  const nav = $1('.gl-nav', sec); nav.hidden = !g;
  nav.innerHTML = '<button type="button" class="btn gl-prev"' + (i === 0 ? ' disabled' : '') + '>◀ Back</button><span class="gl-where">' +
    (i < last ? 'Step ' + (i + 1) + ' of ' + last + ' · ' + esc(st[i].dataset.title) : 'Quick check') + '</span>' +
    '<button type="button" class="btn primary gl-next"' + (i === last ? ' disabled' : '') + '>' + (i === last - 1 ? 'Quick check' : 'Next') + ' ▶</button>';
}
function show(sec, i, mark, scroll) {
  const st = steps(sec), from = sec._gi; i = Math.max(0, Math.min(i, st.length - 1));
  if (mark && st[from] && st[from].tagName === 'ARTICLE') markSeen(st[from]);
  sec._gi = i;
  const g = sec.classList.contains('guided');
  st.forEach((el, k) => el.classList.toggle('gl-hide', g && k !== i));
  renderBar(sec, st);
  if (scroll) $1('.gl-bar', sec).scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function setupLesson(sec) {
  if (!sec) return;
  const blocks = $A('article.block', sec); if (!blocks.length) return;
  blocks.forEach(b => {
    const body = $1('.md-body', b), p = $1('.md-body > p.hook', b) || $1('.md-body > p', b);
    const cb = body.cloneNode(true); $A('details.deep', cb).forEach(d => d.remove()); const words = (cb.textContent || '').trim().split(/\s+/).length;
    $1('.blk-head', b).insertAdjacentHTML('beforeend', '<span class="gl-time">' + Math.max(1, Math.round(words / 200)) + ' min</span>' + clipBtn());
    if (p) {
      const c = p.cloneNode(true); $A('.katex', c).forEach(k => k.remove());
      let t = c.textContent.replace(/\s+/g, ' ').trim();
      if (!p.classList.contains('hook')) { const m = t.match(/^.{40,230}?[.!?](\s|$)/); t = m ? m[0].trim() : t.slice(0, 170) + '…'; }
      body.insertAdjacentHTML('beforebegin', '<div class="gl-tldr"><b>In short</b>' + esc(t) + '</div>');
    }
  });
  blocks[0].insertAdjacentHTML('beforebegin', '<div class="gl-bar" role="navigation" aria-label="Lesson steps"></div>');
  sec.insertAdjacentHTML('beforeend', '<div class="gl-nav" hidden></div>');
  sec.classList.toggle('guided', store.get('cx_guided', true));
  const k = blocks.findIndex(b => !S.seen[b.id]);
  show(sec, k >= 0 ? k : blocks.length, false, false);
}
const _sv = Element.prototype.scrollIntoView;     // search/deep links into a hidden step reveal it first
Element.prototype.scrollIntoView = function (a) {
  if (this.classList && this.classList.contains('gl-hide')) { const sec = this.closest('section.screen'); if (sec) show(sec, steps(sec).indexOf(this), false, false); }
  return _sv.call(this, a);
};
function bindLessons() {
  $1('#mount').addEventListener('click', e => {
    const b = e.target.closest('.gl-dot,.gl-next,.gl-prev,.gl-mode'), sec = b && b.closest('section.screen'); if (!sec) return;
    const i = sec._gi || 0;
    if (b.classList.contains('gl-mode')) {
      const on = !sec.classList.contains('guided'); store.set('cx_guided', on);
      $A('section.screen').filter(s => $1('.gl-bar', s)).forEach(s => { s.classList.toggle('guided', on); show(s, s._gi || 0, false, false); });
      sfx('flip'); return;
    }
    if (b.classList.contains('gl-dot')) {
      const k = +b.dataset.k; sfx('click');
      if (sec.classList.contains('guided')) show(sec, k, false, true); else steps(sec)[k].scrollIntoView({ behavior: 'smooth' });
    } else if (b.classList.contains('gl-next')) { sfx('reveal'); show(sec, i + 1, true, true); }
    else { sfx('click'); show(sec, i - 1, false, true); }
  });
  document.addEventListener('keydown', e => {
    if (!/^Arrow(Left|Right)$/.test(e.key) || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
    const sec = $1('section.screen.active.guided'); if (!sec || !$1('.gl-bar', sec) || !$1('#modal').hidden) return;
    const b = $1(e.key === 'ArrowRight' ? '.gl-next' : '.gl-prev', sec); if (b && !b.disabled) b.click();
  });
}

/* ================= SIMULATION MISSIONS ================= */
const MISSION = {
  caesar: 'Slide the shift until the message turns into readable English.',
  gacha: 'Pull repeatedly and notice where the odds jump (soft pity).',
  chokepoint: 'Block a chokepoint and watch what changes.',
  dunbar: 'Push the population past ~150 and watch cohesion.',
  dilemma: 'Play all five rounds, then try a different strategy.',
  dna: 'Build the strand and watch matched pairs bond.',
  'neural-lab': 'Change a setting and compare the results.',
  blackhole: 'Change the mass and watch the horizon respond.',
  transit: 'Adjust the controls and watch the signal change.',
  decade: 'Switch decades and compare them.'
};
function initSims() {
  const done = store.get('cx_sims', {}), need = 5;
  $A('.interactive-sim').forEach(sim => {
    const key = sim.dataset.sim, body = $1('.sim-body', sim); if (!body) return;
    let n = done[key] ? need : 0, last = 0, tk = 0;
    body.insertAdjacentHTML('afterbegin', '<div class="sx-mission"><span>🎯 ' + esc(MISSION[key] || 'Try every control. Each change teaches something.') + '</span><span class="sx-ring" aria-live="polite"></span></div>');
    const ring = $1('.sx-ring', sim);
    const paint = () => { ring.textContent = n >= need ? '✓ Explored' : n + '/' + need + ' tries'; sim.classList.toggle('sx-done', n >= need); };
    paint();
    const bump = e => {
      const el = e.target.closest('input,select,button'); if (!el || (e.type === 'click' && el.type === 'range')) return;
      const now = performance.now();
      if (el.type === 'range') {
        if (now - tk > 70) { sfx('tick', (el.value - el.min) / ((el.max - el.min) || 1)); tk = now; }
        if (now - last < 700) { last = now; return; } last = now;
      } else sfx('click');
      if (ring.animate && !REDUCED) ring.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 260 });
      if (n < need && ++n >= need) { done[key] = 1; store.set('cx_sims', done); sfx('power'); gainXP(10, true); toast('<b>Simulation explored</b> +10 XP', 'star'); }
      paint();
    };
    sim.addEventListener('input', bump); sim.addEventListener('click', bump);
  });
}

/* ================= UP NEXT (home) ================= */
function nextUp() {
  const host = $1('#nextUp'); if (!host) return;
  const sec = SECTORS.find(s => !S.completed[s.id]);
  if (!sec) { host.innerHTML = '<div><b>All ten sectors cleared.</b><span>Time to face the Void Warden.</span></div><button class="btn primary" data-go="exam">Fight the boss</button>'; return; }
  const k = sec.blocks.findIndex(b => !S.seen[b.id]), seen = sec.blocks.filter(b => S.seen[b.id]).length;
  host.innerHTML = '<div><b>' + (seen ? 'Continue: ' : 'Start: ') + esc(sec.label) + '</b><span>' +
    (k >= 0 ? 'Step ' + (k + 1) + ' of ' + sec.blocks.length + ' · ' + esc(sec.blocks[k].title) : 'Lessons done. Take the quick check.') +
    '</span></div><button class="btn primary" data-go="' + sec.id + '">' + (seen ? 'Resume' : 'Begin') + '</button>';
}

/* ================= VOID WARDEN BOSS FIGHT ================= */
let root, G = null, raf = 0;
const FX = { shake: 0, flash: 0, hurt: 0, bolts: [], orbs: [], parts: [] };
const PHASE = ['', 'Phase I · Static', 'Phase II · Surge', 'Phase III · Collapse'], PCOL = ['', '#5fd0ee', '#a99cff', '#ff7b8a'];
let DIFF = store.get('cx_diff', 1);
const MAXME = () => DIFF === 2 ? 3 : 5, BONUS = () => Math.round((60 + G.me * 10) * (DIFF === 2 ? 1.5 : 1)), active = () => $1('#exam') && $1('#exam').classList.contains('active');
function bossIntro() {
  const b = S.quizBest && S.quizBest.exam;
  root.innerHTML = '<div class="bf-intro"><h3>The Void Warden awakens</h3>' +
    '<p>Answer before the timer runs out. Every right answer fires a bolt. Every miss lets the Warden strike.</p>' +
    '<ul><li><b>5 shields.</b> Lose them all and you fall.</li><li><b>Combos hit harder.</b> Fast answers add bonus damage.</li>' +
    '<li><b>3 in a row</b> charges a Barrier that blocks one strike. <b>4 in a row</b> charges a Cut that removes two wrong answers.</li>' +
    '<li><b>Three phases.</b> The Warden speeds up as it weakens. Keys 1–4 answer.</li></ul>' +
    (b != null ? '<p class="small">Best winning accuracy: <b>' + b + '%</b></p>' : '') +
    '<div class="vx-chips" style="justify-content:center;margin:10px 0"><button type="button" class="btn bf-d' + (DIFF === 1 ? ' primary' : '') + '" data-d="1">Normal</button><button type="button" class="btn bf-d' + (DIFF === 2 ? ' primary' : '') + '" data-d="2">Hard</button></div>' +
    (DIFF === 2 ? '<p class="small">Hard: 3 shields, 30% shorter timers, ×1.5 XP bonus.</p>' : '') +
    '<button type="button" class="btn primary" id="bfGo">FIGHT</button></div>';
}
function bossStart() {
  sfx('roar'); FX.bolts = []; FX.orbs = []; FX.parts = [];
  G = { deck: shuffle(MASTER_EXAM.qs.slice()), i: 0, hp: 100, me: MAXME(), max: MAXME(), combo: 0, maxCombo: 0, ok: 0, bad: 0, wrong: [], barrier: 0, cuts: 0, phase: 1, state: 'ask' };
  root.innerHTML = '<div class="bf-hud"><div class="bf-me" aria-label="Your shields"></div><div class="bf-combo"></div>' +
    '<div class="bf-boss"><span class="bf-ph"></span><div class="bar"><i class="bf-hpfill"></i></div></div></div>' +
    '<canvas class="bf-cv" width="640" height="250" aria-hidden="true"></canvas><div class="bf-timer"><i></i></div>' +
    '<p class="bf-q"></p><div class="bf-opts"></div><div class="bf-pw"></div><div class="bf-fb" aria-live="polite"></div>';
  G.cv = $1('.bf-cv', root); G.ctx = G.cv.getContext('2d'); G.tbar = $1('.bf-timer i', root); G.tbox = G.tbar.parentNode; G.bg = makeBg(G.cv.width, G.cv.height);
  document.body.classList.add('noocean');
  ask(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function makeBg(W, H) {
  const o = document.createElement('canvas'); o.width = W; o.height = H; const c = o.getContext('2d');
  const g = c.createRadialGradient(W / 2, H * .4, 10, W / 2, H * .4, W * .7); g.addColorStop(0, 'rgba(22,66,96,.95)'); g.addColorStop(1, '#020c14');
  c.fillStyle = g; c.fillRect(0, 0, W, H); return o;
}
function ask() {
  if (G.i >= G.deck.length) G.deck = G.deck.concat(shuffle(MASTER_EXAM.qs.slice()));
  const q = G.q = G.deck[G.i], o = q.opts.map((t, i) => ({ t, ok: i === q.a }));
  G.opts = o.length > 2 ? shuffle(o) : o; G.state = 'ask'; G.t0 = performance.now(); G.tl = Math.round([0, 18, 14, 11][G.phase] * (DIFF === 2 ? .7 : 1)); G.tick = 0; G.paused = (document.hidden || !active()) ? performance.now() : 0;
  $1('.bf-q', root).innerHTML = mdInline(q.q);
  $1('.bf-opts', root).innerHTML = G.opts.map((x, i) => '<button type="button" class="bf-opt" data-i="' + i + '"><b>' + 'ABCD'[i] + '</b><span>' + mdInline(x.t) + '</span></button>').join('');
  $1('.bf-fb', root).innerHTML = ''; typeset(root); hud();
}
function hud() {
  $1('.bf-me', root).innerHTML = '<span class="on">' + '♥'.repeat(G.me) + '</span><span>' + '♥'.repeat(G.max - G.me) + '</span>';
  $1('.bf-combo', root).innerHTML = G.combo > 1 ? 'COMBO ×' + G.combo : '';
  $1('.bf-hpfill', root).style.width = G.hp + '%'; $1('.bf-ph', root).textContent = 'VOID WARDEN · ' + PHASE[G.phase];
  $1('.bf-boss', root).style.setProperty('--pc', PCOL[G.phase]);
  $1('.bf-pw', root).innerHTML = '<span class="bf-chip' + (G.barrier ? ' on' : '') + '">🛡 Barrier ×' + G.barrier + '</span>' +
    '<button type="button" class="btn bf-cut"' + (G.cuts && G.state === 'ask' ? '' : ' disabled') + '>✂ Cut ×' + G.cuts + '</button>';
}
function answer(i) {
  if (G.state !== 'ask') return; G.state = 'result';
  const o = i < 0 ? null : G.opts[i], ms = performance.now() - G.t0;
  $A('.bf-opt', root).forEach((b, k) => { b.disabled = true; if (G.opts[k].ok) b.classList.add('good'); else if (k === i) b.classList.add('bad'); });
  S.stats.ans++;
  if (o && o.ok) {
    G.ok++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
    const dmg = 7 + Math.min(G.combo - 1, 5) * 1.5 + (ms < G.tl * 400 ? 3 : 0);
    G.hp = Math.max(0, G.hp - dmg); FX.bolts.push({ p: 0 }); sfx('hit'); setTimeout(() => sfx('combo', G.combo), 120);
    S.stats.ok++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); gainXP(10, true);
    try { SystemsEngine.onCorrectAnswer('exam'); } catch (e) {}
    if (G.combo % 3 === 0) { G.barrier = Math.min(2, G.barrier + 1); setTimeout(() => sfx('power'), 260); }
    if (G.combo % 4 === 0) { G.cuts = Math.min(2, G.cuts + 1); setTimeout(() => sfx('power'), 360); }
    $1('.bf-fb', root).innerHTML = '<div class="qfb ok"><div><b>HIT!</b> ' + mdInline(G.q.why) + '</div></div>';
    typeset(root); hud(); setTimeout(next, G.hp <= 0 ? 900 : 1500);
  } else {
    G.combo = 0; S.streak = 0; G.bad++;
    G.wrong.push({ q: G.q.q, correct: G.opts.find(x => x.ok).t, why: G.q.why });
    const blocked = G.barrier > 0;
    if (blocked) { G.barrier--; sfx('shield'); } else { G.me--; sfx('hurt'); }
    FX.orbs.push({ p: 0, blocked });
    $1('.bf-fb', root).innerHTML = '<div class="qfb no"><div><b>' + (o ? 'MISS' : 'TIME UP') + (blocked ? ' · Barrier absorbed it' : '') + '.</b> ' + mdInline(G.q.why) + '</div></div>' +
      '<button type="button" class="btn primary" id="bfNext">Continue</button>' +
      (window.CodexGuide && CodexGuide.ready() ? '<button type="button" class="btn v6-qx" data-gm="debrief" data-gq="' + encodeURIComponent(JSON.stringify({ q: G.q.q, correct: G.opts.find(function (x) { return x.ok; }).t, why: G.q.why, opts: G.opts.map(function (x) { return x.t; }) })) + '">✦ Explain</button>' : '');
    typeset(root); hud();
  }
  save(); updateHUD();
}
function next() {
  if (!G || G.state !== 'result') return;
  if (G.hp <= 0) return end(true);
  if (G.me <= 0) return end(false);
  const ph = G.hp > 66 ? 1 : G.hp > 33 ? 2 : 3;
  if (ph !== G.phase) { G.phase = ph; sfx('roar'); FX.shake = 30; toast('<b>' + PHASE[ph] + '</b><br>The Warden speeds up!', 'flame'); }
  G.i++; ask();
}
function end(win) {
  G.state = 'end'; const tot = G.ok + G.bad, pct = tot ? Math.round(G.ok / tot * 100) : 0;
  award('quiz1');
  if (win) {
    S.quizDone.exam = 1; if (S.quizBest.exam == null || pct > S.quizBest.exam) S.quizBest.exam = pct;
    sfx('win'); celebrate(160); gainXP(BONUS(), false); if (DIFF === 2) award('v5_hard');
    if (pct >= 75) award('boss75');
    if (!G.bad) { award('boss100'); award('perfect'); celebrate(220); }
  } else sfx('lose');
  document.body.classList.remove('noocean');
  save(); try { SystemsEngine.onQuizFinish('exam', pct); } catch (e) {} updateHUD(); checkBadges();
  const stars = win ? (pct === 100 ? 3 : pct >= 75 ? 2 : 1) : 0;
  root.innerHTML = '<div class="bf-end ' + (win ? 'win' : 'lose') + '"><h3>' + (win ? 'VOID WARDEN DEFEATED' : 'YOU WERE CONSUMED') + '</h3>' +
    '<div class="qstars">' + [0, 1, 2].map(i => '<span data-sprite="star" data-px="34" data-tint="' + (i < stars ? '#ffc874' : '#27566a') + '"></span>').join('') + '</div>' +
    '<p class="qscore">' + G.ok + ' right · ' + G.bad + ' missed · ' + pct + '% accuracy · best combo ×' + G.maxCombo + (win ? ' · +' + BONUS() + ' XP bonus' : '') + '</p>' +
    '<div class="qnext center"><button type="button" class="btn primary" id="bfGo">Fight again</button><button type="button" class="btn" data-go="flash">Review flashcards</button><button type="button" class="btn bf-d" data-d="' + (DIFF === 1 ? 2 : 1) + '">' + (DIFF === 1 ? 'Try Hard mode' : 'Back to Normal') + '</button></div></div>' +
    (G.wrong.length ? '<div class="qwrong"><h4>STUDY THESE:</h4>' + G.wrong.map(w => '<div class="qw"><p class="qw-q">' + mdInline(w.q) + '</p><p>Answer: <b class="r">' + mdInline(w.correct) + '</b></p><p class="qw-why">' + mdInline(w.why) + '</p></div>').join('') + '</div>' : '');
  drawSprites(root); typeset(root);
}
function loop(t) {
  if (!G || !G.cv || !G.cv.isConnected) { raf = 0; document.body.classList.remove('noocean'); return; }
  if (!active() || document.hidden) { if (!G.paused) G.paused = performance.now(); raf = 0; document.body.classList.remove('noocean'); return; }
  raf = requestAnimationFrame(loop);
  if (t - (G.lt || 0) < 30) return;                 // ~33fps cap
  G.lt = t; draw(t);
  if (G.state === 'ask') {
    const left = G.tl - (performance.now() - G.t0) / 1000, low = left < 4;
    G.tbar.style.transform = 'scaleX(' + Math.max(0, left / G.tl).toFixed(3) + ')';
    if (low !== G.low) { G.low = low; G.tbox.classList.toggle('low', low); }
    if (low && Math.ceil(left) !== G.tick) { G.tick = Math.ceil(left); sfx('tick', .9); }
    if (left <= 0) answer(-1);
  }
}
function draw(t) {
  const c = G.ctx, W = G.cv.width, H = G.cv.height, col = PCOL[G.phase];
  const dt = Math.min(.1, (t - (G.pt || t)) / 1000), f = dt * 60; G.pt = t;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  const k = REDUCED ? 0 : FX.shake; c.translate((Math.random() - .5) * k, (Math.random() - .5) * k); FX.shake *= Math.pow(.88, f);
  c.drawImage(G.bg, -20, -20, W + 40, H + 40);
  const cx = W / 2, cy = H * .42 + Math.sin(t / 600) * 8, r = 54 + Math.sin(t / 300) * 3 + FX.flash * 8;
  c.fillStyle = col; c.globalAlpha = .85;
  for (let j = 0; j < 8; j++) { const a = t / 900 + j * Math.PI / 4, rr = 96 + (j % 2) * 16; c.fillRect(cx + Math.cos(a) * rr * 1.3 - 5, cy + Math.sin(a) * rr * .62 - 5, 10, 10); }
  c.globalAlpha = 1; c.lineWidth = 4; c.strokeStyle = col; c.fillStyle = FX.flash > .15 ? '#fff' : '#06202e';
  c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.stroke(); FX.flash *= Math.pow(.85, f);
  c.fillStyle = col; c.beginPath(); c.arc(cx + Math.sin(t / 700) * 12, cy, 16 + G.phase * 3, 0, 7); c.fill();
  c.fillStyle = '#021017'; c.beginPath(); c.arc(cx + Math.sin(t / 700) * 12, cy, 7, 0, 7); c.fill();
  const me = { x: 64, y: H - 38 };
  c.fillStyle = '#5df2b8'; c.beginPath(); c.moveTo(me.x, me.y - 18); c.lineTo(me.x + 18, me.y + 14); c.lineTo(me.x - 18, me.y + 14); c.fill();
  if (G.barrier) { c.strokeStyle = '#ffc874'; c.lineWidth = 3; c.beginPath(); c.arc(me.x, me.y, 32, 0, 7); c.stroke(); }
  FX.bolts = FX.bolts.filter(b => {
    b.p += 3.6 * dt; const x = me.x + (cx - me.x) * b.p, y = me.y + (cy - me.y) * b.p;
    c.fillStyle = '#ffc874'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill();
    if (b.p >= 1) { FX.flash = 1; FX.shake = 14; burst(cx, cy, '#ffc874'); return false; } return true;
  });
  FX.orbs = FX.orbs.filter(o => {
    o.p += 2.7 * dt; const x = cx + (me.x - cx) * o.p, y = cy + (me.y - cy) * o.p;
    c.fillStyle = '#ff7b8a'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill();
    if (o.p >= 1) { if (o.blocked) burst(me.x, me.y, '#ffc874'); else { FX.hurt = 1; FX.shake = 22; burst(me.x, me.y, '#ff7b8a'); } return false; } return true;
  });
  FX.parts = FX.parts.filter(p => { p.x += p.vx * f; p.y += p.vy * f; p.l -= 1.8 * dt; c.globalAlpha = Math.max(0, p.l); c.fillStyle = p.c; c.fillRect(p.x, p.y, 4, 4); c.globalAlpha = 1; return p.l > 0; });
  if (FX.hurt > .02) { c.fillStyle = 'rgba(255,60,80,' + FX.hurt * .35 + ')'; c.fillRect(-20, -20, W + 40, H + 40); FX.hurt *= Math.pow(.9, f); }
}
function burst(x, y, c) { for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 3; FX.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 1, c }); } }
function resumeBoss() {
  if (!G || G.state === 'end' || document.hidden || !active()) return;
  if (G.paused) { G.t0 += performance.now() - G.paused; G.paused = 0; }
  G.pt = 0; G.lt = 0; document.body.classList.add('noocean');
  if (!raf) raf = requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange', () => {
  if (!G || G.state === 'end') return;
  if (document.hidden) { if (!G.paused) G.paused = performance.now(); cancelAnimationFrame(raf); raf = 0; }
  else resumeBoss();
});
function bossInit() {
  const old = $1('#exam .qz'); if (!old || !window.MASTER_EXAM) return;
  root = document.createElement('div'); root.className = 'panel bf'; old.replaceWith(root); bossIntro();
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !G && b.id !== 'bfGo' && !b.classList.contains('bf-d')) return;
    if (b.classList.contains('bf-d')) { DIFF = +b.dataset.d; store.set('cx_diff', DIFF); bossIntro(); }
    else if (b.id === 'bfGo') bossStart();
    else if (b.classList.contains('bf-opt')) answer(+b.dataset.i);
    else if (b.id === 'bfNext') next();
    else if (b.classList.contains('bf-cut') && G.cuts && G.state === 'ask') {
      const wrong = shuffle($A('.bf-opt', root).filter((x, k) => !G.opts[k].ok)).slice(0, 2);
      wrong.forEach(x => { x.disabled = true; x.classList.add('ghost'); }); G.cuts--; sfx('power'); hud();
    }
  });
  document.addEventListener('keydown', e => {
    if (!G || !active() || e.ctrlKey || e.metaKey || e.altKey) return;
    const i = '1234'.indexOf(e.key); if (G.state === 'ask' && i >= 0 && G.opts[i]) answer(i);
    else if (G.state === 'result' && (e.key === 'Enter' || e.key === ' ') && $1('#bfNext', root) && !(e.target.closest && e.target.closest('.v6-qx'))) { e.preventDefault(); next(); }
  });
}

/* ================= INIT ================= */
function init() {
  const home = $1('#home .hero');
  if (home) { home.insertAdjacentHTML('afterend', '<div class="nextup" id="nextUp"></div>'); nextUp(); }
  SECTORS.forEach(s => setupLesson(document.getElementById(s.id)));
  bindLessons(); initSims(); bossInit();
  const sm = store.get('cx_smooth', true); document.body.classList.toggle('smooth', sm);
  const pb = $1('.prefbar');
  if (pb) {
    pb.insertAdjacentHTML('beforeend', '<button type="button" class="tb" id="smoothBtn" aria-pressed="' + sm + '" title="Smooth mode: lighter effects for better speed" aria-label="Smooth mode">⚡</button>');
    $1('#smoothBtn').onclick = e => { const on = !document.body.classList.contains('smooth'); document.body.classList.toggle('smooth', on); store.set('cx_smooth', on); e.currentTarget.setAttribute('aria-pressed', on); toast(on ? '<b>Smooth mode on</b>' : '<b>Glass effects on</b>', 'bolt'); };
  }
  const _show = window.showScreen;
  window.showScreen = function (id, ns) {
    _show(id, ns);
    try {
      if (id !== 'exam') document.body.classList.remove('noocean'); else if (G && G.state !== 'end') document.body.classList.add('noocean');
      if (id === 'home') nextUp();
      if (id === 'exam' && G && G.state !== 'end') resumeBoss();
    } catch (e) { /* non-fatal */ }
  };
}
document.addEventListener('DOMContentLoaded', init);
})();
