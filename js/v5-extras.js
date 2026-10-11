/* v5-extras.js — V5 features beyond the notebook: command palette (Ctrl/⌘+K), Focus Sprint with generated
   ambient soundscapes, daily goal + activity heatmap + due-cards nudge, and new badges.
   Isolated on purpose: each feature is guarded so a failure here can't break lessons, the boss or the notebook. */
(function () {
'use strict';
const $1 = (s, r) => (r || document).querySelector(s);
const ld = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const NM = () => (window.NetworkEngine || {}).NotebookManager, dkey = d => (d || new Date()).toLocaleDateString('en-CA');
const safe = f => function () { try { return f.apply(this, arguments); } catch (e) { if (window.console) console.error('[v5]', e); } };

/* ---- badges: pushed at load, before the engine's DOMContentLoaded init renders them ---- */
[{ id: 'v5_note', name: 'SCRIBE', desc: 'Write a 50-word note in your vault.', icon: 'doc' },
 { id: 'v5_link', name: 'WEAVER', desc: 'Link two notes with [[wikilinks]].', icon: 'bolt' },
 { id: 'v5_room', name: 'CREW CHIEF', desc: 'Create or join a shared room.', icon: 'coin' },
 { id: 'v5_clip', name: 'CURATOR', desc: 'Clip 3 lesson blocks into your notebook.', icon: 'star' },
 { id: 'v5_cards', name: 'RECALL ENGINE', desc: 'Review 10 flashcards from your notes.', icon: 'cards' },
 { id: 'v5_focus', name: 'DEEP WORK', desc: 'Finish a Focus Sprint.', icon: 'flame' },
 { id: 'v5_streak3', name: 'ON A ROLL', desc: 'Hit your daily goal 3 days in a row.', icon: 'trophy' },
 { id: 'v5_hard', name: 'VOID SLAYER', desc: 'Defeat the Void Warden on Hard.', icon: 'qblock' }
].forEach(b => { if (!BADGES.some(x => x.id === b.id)) BADGES.push(b); });

/* ================= DAILY GOAL + ACTIVITY ================= */
let ACT = ld('cx_v5_act', {}), GD = ld('cx_v5_gd', {}), GOAL = ld('cx_v5_goal', 50), rT = 0, bonus = false;
{ const cut = dkey(new Date(Date.now() - 140 * 864e5)); Object.keys(ACT).forEach(k => { if (k < cut) delete ACT[k]; }); }
const _gain = window.gainXP;
if (typeof _gain === 'function') window.gainXP = function (n) {
  const r = _gain.apply(this, arguments);
  if (!bonus && n > 0) { const k = dkey(); ACT[k] = (ACT[k] || 0) + n; sv('cx_v5_act', ACT); clearTimeout(rT); rT = setTimeout(safe(goalCheck), 400); }
  return r;
};
function goalCheck() {
  const k = dkey();
  if ((ACT[k] || 0) >= GOAL && !GD[k]) {
    GD[k] = 1; sv('cx_v5_gd', GD); sfx('level'); toast('<b>Daily goal reached!</b><br>+10 XP bonus', 'trophy', 3600);
    bonus = true; try { gainXP(10, true); } finally { bonus = false; }
    let n = 0; const d = new Date(); while (GD[dkey(d)]) { n++; d.setDate(d.getDate() - 1); }
    if (n >= 3 && typeof award === 'function') award('v5_streak3');
  }
  renderAct();
}
function streak() { let n = 0; const d = new Date(); if (!ACT[dkey(d)]) d.setDate(d.getDate() - 1); while (ACT[dkey(d)] > 0) { n++; d.setDate(d.getDate() - 1); } return n; }
function renderAct() {
  const h = $1('#cxAct'); if (!h || !$1('#home.active')) return;
  const t = ACT[dkey()] || 0, p = Math.min(100, Math.round(t / GOAL * 100)), today = dkey(), d0 = new Date(); d0.setDate(d0.getDate() - d0.getDay() - 98);
  let cells = '';
  for (let i = 0; i < 105; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); const k = dkey(d), x = ACT[k] || 0; cells += k > today ? '<i class="f"></i>' : '<i class="l' + (x ? (x < GOAL / 2 ? 1 : x < GOAL ? 2 : x < GOAL * 2 ? 3 : 4) : 0) + '" title="' + k + ' · ' + x + ' XP"></i>'; }
  const due = NM() && NM().dueCount ? NM().dueCount() : 0, st = streak();
  h.innerHTML = '<button type="button" class="cx-ring" style="--p:' + p + '" data-fx="goal" aria-label="Daily goal: ' + t + ' of ' + GOAL + ' XP. Press to change the goal"><span><b>' + t + '</b><small>/ ' + GOAL + ' XP</small></span></button>' +
    '<div class="cx-info"><b>' + (st ? '🔥 ' + st + '-day streak' : 'Start a streak today') + '</b><span class="small">Earn ' + GOAL + ' XP a day. Tap the ring to change your goal.</span><div class="cx-heat" role="img" aria-label="Study activity, last 15 weeks">' + cells + '</div></div>' +
    (due ? '<button type="button" class="btn primary" data-fx="due">🃏 ' + due + ' due</button>' : '');
}

/* ================= COMMAND PALETTE ================= */
let pal = null, pSel = 0, pItems = [], pView = [];
function items() {
  const go = id => () => window.showScreen(id), L = [];
  NAV_ITEMS.forEach(n => L.push({ t: n.label, s: n.sub, k: 'Go to', run: go(n.id) }));
  SECTORS.forEach(sec => (sec.blocks || []).forEach((b, i) => L.push({ t: b.title, s: sec.label, k: 'Lesson', run: () => { window.showScreen(sec.id); const d = $1('#' + sec.id + ' .gl-dot[data-k="' + i + '"]'); if (d) d.click(); } })));
  [['New note', 'new'], ['Today’s daily note', 'daily'], ['Review flashcards from notes', 'cards'], ['Open note graph', 'graph'], ['Jump to a note…', 'quick']].forEach(a => L.push({ t: a[0], s: 'Notebook', k: 'Action', run: () => NM() && NM().run(a[1]) }));
  L.push({ t: 'Open the Guide', s: 'Context-aware AI tutor', k: 'Action', run: () => window.CodexGuide && CodexGuide.open() }, { t: 'Start a Focus Sprint', s: 'Timer + ambient sound', k: 'Action', run: focusDlg }, { t: 'Fight the Void Warden', s: 'Boss exam', k: 'Action', run: go('exam') },
    { t: 'Toggle smooth mode', s: 'Lighter visual effects', k: 'Action', run: () => { const b = $1('#smoothBtn'); if (b) b.click(); } });
  try { (NM() ? NM().list() : []).forEach(n => L.push({ t: n.t, s: 'Notebook', k: 'Note', run: () => NM().openNote(n.id) })); } catch (e) {}
  return L;
}
function palOpen() {
  if (!pal) {
    pal = document.createElement('div'); pal.id = 'cxPal'; pal.hidden = true;
    pal.innerHTML = '<div class="cx-pbox" role="dialog" aria-label="Command palette"><input id="cxPq" placeholder="Search lessons, notes, screens, actions…" autocomplete="off" aria-label="Command palette"><div id="cxPl" role="listbox"></div><p class="small">↑↓ move · Enter run · Esc close</p></div>';
    document.body.appendChild(pal);
    pal.addEventListener('mousedown', e => { if (e.target === pal) return palClose(); const r = e.target.closest('[data-i]'); if (r) { e.preventDefault(); palRun(+r.dataset.i); } });
    const q = $1('#cxPq'); q.addEventListener('input', palList);
    q.addEventListener('keydown', e => {
      if (e.key === 'Escape') palClose();
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); pSel = (pSel + (e.key === 'ArrowDown' ? 1 : -1) + pView.length) % (pView.length || 1); palPaint(); }
      else if (e.key === 'Enter') { e.preventDefault(); palRun(pSel); }
    });
  }
  pItems = items(); pal.hidden = false; $1('#cxPq').value = ''; palList(); $1('#cxPq').focus(); sfx('reveal');
}
function palClose() { if (pal) pal.hidden = true; }
function palList() {
  const q = $1('#cxPq').value.toLowerCase().split(/\s+/).filter(Boolean);
  const sc = it => { const h = (it.t + ' ' + it.s + ' ' + it.k).toLowerCase(); return q.every(w => h.indexOf(w) >= 0) ? (it.t.toLowerCase().indexOf(q[0] || '') === 0 ? 0 : 1) + (it.k === 'Action' ? 0 : .5) : -1; };
  pView = pItems.map(it => [sc(it), it]).filter(x => x[0] >= 0).sort((a, b) => a[0] - b[0]).slice(0, 9).map(x => x[1]);
  { const raw = $1('#cxPq').value.trim(); if (raw.length > 2 && window.CodexGuide) pView.unshift({ t: '✦ Ask the Guide: ' + raw.slice(0, 60), s: 'Uses your AI link', k: 'Guide', run: () => CodexGuide.ask(raw) }); }
  pSel = 0; palPaint();
}
function palPaint() {
  $1('#cxPl').innerHTML = pView.length ? pView.map((it, i) => '<div class="cx-pr" role="option" data-i="' + i + '" aria-selected="' + (i === pSel) + '"><b>' + esc(it.t) + '</b><i>' + esc(it.s) + '</i><em>' + it.k + '</em></div>').join('') : '<p class="small" style="padding:8px">No matches.</p>';
}
function palRun(i) { const it = pView[i]; if (!it) return; palClose(); sfx('click'); safe(it.run)(); }

/* ================= FOCUS SPRINT + SOUNDSCAPES ================= */
const SC = { off: 'Off', ocean: '🌊 Ocean', rain: '🌧 Rain', space: '🌌 Deep space' };
let FS = null, SND = null, SEL = ld('cx_v5_focus', { m: 25, s: 'ocean' });
const focusBody = () => FS ? '<p>Sprint in progress. Keep going!</p><button type="button" class="btn danger" data-fx="stop">End early</button>' :
  '<p>Pick a length and a background sound. Finishing a sprint earns XP.</p><h4>Length</h4><div class="vx-chips">' + [15, 25, 45].map(m => '<button type="button" class="btn' + (m === SEL.m ? ' primary' : '') + '" data-fx="m" data-v="' + m + '">' + m + ' min</button>').join('') + '</div><h4>Sound</h4><div class="vx-chips">' +
  Object.keys(SC).map(k => '<button type="button" class="btn' + (k === SEL.s ? ' primary' : '') + '" data-fx="s" data-v="' + k + '">' + SC[k] + '</button>').join('') + '</div><p><button type="button" class="btn primary" data-fx="go">Start sprint</button></p>';
function focusDlg() { openModal(focusBody(), 'FOCUS SPRINT'); }
function scapeStart(kind) {
  if (kind === 'off') return;
  const A = new (window.AudioContext || window.webkitAudioContext)(), out = A.createGain(); out.gain.value = 0; out.gain.linearRampToValueAtTime(.5, A.currentTime + 2); out.connect(A.destination);
  const buf = A.createBuffer(1, A.sampleRate * 4, A.sampleRate), d = buf.getChannelData(0); let l = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + .02 * w) / 1.02; d[i] = kind === 'rain' ? w * .5 : l * 3.5; }
  const src = A.createBufferSource(), f = A.createBiquadFilter(), g = A.createGain(); src.buffer = buf; src.loop = true;
  if (kind === 'ocean') { f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = .55; const o = A.createOscillator(), og = A.createGain(); o.frequency.value = .09; og.gain.value = .3; o.connect(og); og.connect(g.gain); o.start(); }
  else if (kind === 'rain') { f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = .5; g.gain.value = .22; }
  else { f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = .4; [55, 55.35, 82.4].forEach((hz, i) => { const o = A.createOscillator(), og = A.createGain(); o.frequency.value = hz; og.gain.value = .05 / (i + 1); o.connect(og); og.connect(out); o.start(); }); }
  src.connect(f); f.connect(g); g.connect(out); src.start(); SND = { A, out };
}
function scapeStop() { if (!SND) return; const s = SND; SND = null; try { s.out.gain.cancelScheduledValues(0); s.out.gain.linearRampToValueAtTime(0, s.A.currentTime + .6); } catch (e) {} setTimeout(() => { try { s.A.close(); } catch (e) {} }, 800); }
function fsTick() {
  if (!FS) return; const left = Math.max(0, FS.end - Date.now()), el = $1('#cxFt');
  if (el) el.textContent = String(Math.floor(left / 60000)).padStart(2, '0') + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0');
  if (!left) fsEnd(true);
}
function fsStart() {
  sv('cx_v5_focus', SEL); closeModal();
  FS = { end: Date.now() + SEL.m * 60000, m: SEL.m, t: setInterval(safe(fsTick), 1000) };
  document.body.insertAdjacentHTML('beforeend', '<div class="cx-pill" id="cxFocus" role="timer"><span aria-hidden="true">⏱</span><span id="cxFt"></span><button type="button" data-fx="stop" aria-label="End focus sprint">✕</button></div>');
  scapeStart(SEL.s); sfx('power'); fsTick();
}
function fsEnd(done) {
  if (!FS) return; clearInterval(FS.t); const m = FS.m; FS = null; scapeStop(); const p = $1('#cxFocus'); if (p) p.remove();
  if (!done) return toast('<b>Sprint ended</b>', 'bolt');
  const k = dkey(), r = ld('cx_v5_fxp', { d: k, n: 0 }); if (r.d !== k) { r.d = k; r.n = 0; }
  const xp = Math.max(0, Math.min(Math.round(m / 2.5), 60 - r.n)); r.n += xp; sv('cx_v5_fxp', r);
  sfx('win'); if (xp) gainXP(xp, true); if (typeof award === 'function') award('v5_focus');
  toast('<b>Sprint complete!</b><br>' + m + ' focused minutes' + (xp ? ' · +' + xp + ' XP' : ' · daily focus XP maxed'), 'flame', 4200);
}

/* ================= WIRING ================= */
document.addEventListener('click', safe(e => {
  const b = e.target.closest('[data-fx],#cxPalBtn,#cxFocusBtn,.gl-recap'); if (!b) return;
  if (b.id === 'cxPalBtn') return palOpen();
  if (b.id === 'cxFocusBtn') return focusDlg();
  if (b.classList.contains('gl-recap')) { const sec = b.closest('section.screen'), n = NM(); if (sec && n && n.createRecap) n.createRecap(sec.id); return; }
  const a = b.dataset.fx;
  if (a === 'goal') { const G = [25, 50, 100, 200]; GOAL = G[(G.indexOf(GOAL) + 1) % G.length]; sv('cx_v5_goal', GOAL); sfx('click'); renderAct(); }
  else if (a === 'due') NM() && NM().run('cards');
  else if (a === 'm' || a === 's') { SEL[a] = a === 'm' ? +b.dataset.v : b.dataset.v; $1('#modalBody').innerHTML = focusBody(); sfx('click'); }
  else if (a === 'go') fsStart();
  else if (a === 'stop') { fsEnd(false); if ($1('#modalBody') && !$1('#modal').hidden) closeModal(); }
}));
document.addEventListener('keydown', safe(e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palOpen(); } }));
document.addEventListener('DOMContentLoaded', safe(() => {
  const nu = $1('#nextUp') || $1('#home .hero'); if (nu) { nu.insertAdjacentHTML('afterend', '<div class="cx-act panel" id="cxAct"></div>'); renderAct(); }
  const pb = $1('.prefbar') || $1('.topbar'); if (pb) pb.insertAdjacentHTML('beforeend', '<button type="button" class="tb" id="cxPalBtn" title="Command palette (Ctrl/⌘+K)" aria-label="Command palette">⌘</button><button type="button" class="tb" id="cxFocusBtn" title="Focus Sprint" aria-label="Focus Sprint">⏱</button>');
  const _s = window.showScreen; window.showScreen = function (id, ns) { _s(id, ns); if (id === 'home') safe(renderAct)(); };
}));
})();
