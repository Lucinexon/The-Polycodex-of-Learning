/* lounge-console.js — CodexLoungeConsole: the closable Activity Console and the lounge's world-focus mode.
   · Replaces the embedded chat panel. Messaging lives in the chat dock (social.js); this panel is about the WORLD: where you are,
     what you can do here, which games exist, and what you have done.
   · Tabs are a registry (registerTab), so later modules (quests, v10 surfaces) plug in without editing this file.
   · World focus is the lounge's own state (#lobby.is-world-focus). It is deliberately separate from the app-wide body.focusmode
     (a reading mode that hides the sidebar); the two can be on at the same time.
   · UI preferences are stored in cx_lounge_ui_v1 (console open/closed + last tab). Game progress is NOT stored here — see lounge-progress.js.
   · Escape policy (capture phase, see onKey): other layers win (game, dialogue, dock, modals, text fields); otherwise a mobile sheet
     closes first, then world focus ends. The console panel itself is only closed by its own controls on desktop. */
(function (root) {
'use strict';
const doc = root.document;
const $1 = (s, r) => (r || doc).querySelector(s), $A = (s, r) => Array.from((r || doc).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const UI_KEY = 'cx_lounge_ui_v1', MOBILE = '(max-width: 900px)';
const NE = () => root.NetworkEngine || {}, LG = () => root.CodexLounge, PG = () => root.CodexLoungeProgress, GM = () => root.CodexLoungeGames;
const mq = root.matchMedia ? root.matchMedia(MOBILE) : { matches: false, addEventListener() {} };

const st = { console: null, focus: false, tab: 'room', ready: false };
const TABS = [];                  /* { id, label, order, render(panel, api), badge?() } */
const panels = {};                /* id → persistent tabpanel element */
let el = {}, timer = 0, raf = 0, ro = null, lastFocusKey = '';

/* ---------- prefs ---------- */
function loadPrefs() {
  let p = {}; try { p = JSON.parse(localStorage.getItem(UI_KEY) || '{}') || {}; } catch (e) {}
  if (typeof p.console === 'boolean') st.console = p.console;
  if (typeof p.tab === 'string') st.tab = p.tab;
}
function savePrefs() { try { localStorage.setItem(UI_KEY, JSON.stringify({ v: 1, console: !!st.console, tab: st.tab })); } catch (e) {} }

/* ---------- tab registry ---------- */
function registerTab(t) {
  if (!t || !/^[a-z0-9_]{1,16}$/.test(t.id) || typeof t.render !== 'function') return false;
  const i = TABS.findIndex(x => x.id === t.id); if (i >= 0) TABS.splice(i, 1);
  TABS.push({ id: t.id, label: String(t.label || t.id), order: t.order | 0, render: t.render, badge: t.badge });
  TABS.sort((a, b) => a.order - b.order); if (st.ready) buildTabs(); return true;
}
function buildTabs() {
  if (!el.tabs) return;
  if (!TABS.some(t => t.id === st.tab) && TABS.length) st.tab = TABS[0].id;
  el.tabs.innerHTML = TABS.map(t => '<button type="button" role="tab" class="lc-tab' + (t.id === st.tab ? ' on' : '') + '" id="lcTab-' + t.id + '" data-tab="' + t.id + '" aria-selected="' + (t.id === st.tab) + '" aria-controls="lcPanel-' + t.id + '" tabindex="' + (t.id === st.tab ? 0 : -1) + '">' + esc(t.label) + '<span class="lc-badge" hidden></span></button>').join('');
  TABS.forEach(t => {
    let p = panels[t.id];
    if (!p) { p = panels[t.id] = doc.createElement('div'); p.className = 'lc-panel'; p.id = 'lcPanel-' + t.id; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'lcTab-' + t.id); p.dataset.built = ''; el.body.appendChild(p); }
    p.hidden = t.id !== st.tab;
  });
  Object.keys(panels).forEach(k => { if (!TABS.some(t => t.id === k)) { panels[k].remove(); delete panels[k]; } });
  refresh();
}
function selectTab(id, focus) {
  if (!TABS.some(t => t.id === id)) return; st.tab = id; savePrefs(); buildTabs();
  if (focus) { const b = $1('#lcTab-' + id); if (b) b.focus(); }
}

/* ---------- refresh: render only the visible panel, coalesced to one pass per frame ---------- */
function refresh() {
  if (raf) return; const rf = root.requestAnimationFrame || (f => setTimeout(f, 16));
  raf = rf(() => { raf = 0; renderNow(); });
}
function renderNow() {
  if (!st.ready) return;
  const ctx = api(); const active = TABS.find(t => t.id === st.tab);
  TABS.forEach(t => { const b = $1('#lcTab-' + t.id), n = t.badge ? t.badge(ctx) : 0, bd = b && $1('.lc-badge', b); if (bd) { bd.hidden = !n; bd.textContent = n > 9 ? '9+' : String(n || ''); } });
  if (active && panels[active.id]) { try { active.render(panels[active.id], ctx); } catch (e) { if (root.console) console.error('[lounge-console:' + active.id + ']', e); } }
  const L = LG(), kick = $1('#loungeKicker'); if (L && L.ROOMS && kick) { const r = L.ROOMS[L.room()]; if (r && r.k) kick.textContent = r.k; }
}
/* Replace a container's HTML only when it changed, and keep keyboard focus on the same logical control (data-fk) if it was inside. */
function setHTML(node, html) {
  if (!node || node.__html === html) return; const a = doc.activeElement, fk = a && node.contains(a) ? a.getAttribute('data-fk') : '';
  node.innerHTML = html; node.__html = html;
  if (fk) { const n = node.querySelector('[data-fk="' + fk + '"]'); if (n) n.focus(); }
}

/* ---------- state changes ---------- */
const mobile = () => !!mq.matches;
function setConsole(open, opts) {
  open = !!open; const changed = st.console !== open; st.console = open; savePrefs();
  if (el.lounge) el.lounge.dataset.console = open ? 'open' : 'closed';
  if (el.cbtn) { el.cbtn.setAttribute('aria-pressed', String(open)); el.cbtn.setAttribute('aria-expanded', String(open)); }
  if (el.cons) el.cons.hidden = !open;
  if (open) refresh();
  if (!open && opts && opts.restoreFocus && el.cbtn && el.cons && el.cons.contains(doc.activeElement)) el.cbtn.focus();
  layout(); return changed;
}
function lobbyActive() { return !!(el.lobby && el.lobby.classList.contains('active')); }
function setFocus(on) {
  on = !!on; st.focus = on;
  if (el.lobby) el.lobby.classList.toggle('is-world-focus', on);
  if (el.fbtn) { el.fbtn.setAttribute('aria-pressed', String(on)); el.fbtn.querySelector('.lg-tool-t').textContent = on ? 'Exit focus' : 'Focus'; }
  syncBody(); layout();
}
function syncBody() { doc.body.classList.toggle('lounge-world-focus', st.focus && lobbyActive()); }

/* ---------- layout: sit under the sticky top bar and size the canvas to the largest 16:10 box that fits ---------- */
function layout() {
  if (!el.lobby) return; const rf = root.requestAnimationFrame || (f => setTimeout(f, 16));
  if (layout.q) return; layout.q = rf(() => { layout.q = 0; fit(); fit(); });
}
function fit() {
  const lobby = el.lobby, wrap = el.wrap, cv = el.cv; if (!lobby || !wrap || !cv) return;
  const tb = $1('.topbar'), top = tb ? Math.max(0, Math.round(tb.getBoundingClientRect().bottom)) : 0;
  lobby.style.setProperty('--lounge-top', top + 'px');
  lobby.style.setProperty('--console-h', mobile() && st.console && el.cons ? el.cons.offsetHeight + 'px' : '0px');
  if (!(st.focus && lobbyActive())) { wrap.style.removeProperty('--stage-w'); return; }
  /* the focus container is fixed between the top bar and the bottom nav, so its own height is the budget; on phones the open sheet overlays
     the bottom of it, so the world is sized to fit ABOVE the sheet (it can still be scrolled into view) */
  const cs = root.getComputedStyle(lobby), stage = el.stage, scs = root.getComputedStyle(stage), padX = parseFloat(scs.paddingLeft) + parseFloat(scs.paddingRight);
  const sheet = mobile() && st.console && el.cons ? el.cons.offsetHeight : 0, availH = lobby.clientHeight - parseFloat(cs.paddingTop) - 12 - sheet, chrome = stage.offsetHeight - cv.offsetHeight;
  const availW = stage.clientWidth - padX, h = Math.max(160, availH - chrome);
  wrap.style.setProperty('--stage-w', Math.max(300, Math.floor(Math.min(availW, h * (480 / 300)))) + 'px');
}

/* ---------- Escape policy ---------- */
const visible = n => !!(n && n.getClientRects && n.getClientRects().length);
function otherLayerOpen() { return $A('.lgx,.lgd,.lgi,.modal,[role="dialog"],[aria-modal="true"]').some(visible); }
function typing(t) { return !!(t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)); }
function onKey(e) {
  if (e.key !== 'Escape' || e.defaultPrevented || !lobbyActive() || typing(e.target) || otherLayerOpen()) return;
  if (mobile() && st.console) { setConsole(false, { restoreFocus: true }); e.preventDefault(); return; }
  if (st.focus) { setFocus(false); e.preventDefault(); const b = el.fbtn; if (b) b.focus(); }
}

/* ---------- built-in tabs ---------- */
const VERB = { scope: 'Look through', juke: 'Toggle music', coffee: 'Sip a coffee', fire: 'Warm up', spark: 'Admire', pond: 'Skim the water', shelf: 'Open your Notes', npc: 'Talk', door: 'Go through' };
const ICON = { scope: '🔭', juke: '🎵', coffee: '☕', fire: '🔥', spark: '✨', pond: '💧', shelf: '📚', npc: '💬', seat: '🪑', door: '🚪' };

const roomTab = {
  id: 'room', label: 'Room', order: 10,
  render(p) {
    const L = LG(); if (!L) { setHTML(p, '<p class="lc-empty">The lounge is still starting up.</p>'); return; }
    if (!p.dataset.built) {
      p.innerHTML = '<div class="lc-room-head"><span class="lc-room-ic" aria-hidden="true"></span><div><b class="lc-room-name"></b><small class="lc-room-kick"></small></div></div><p class="lc-desc"></p>' +
        '<h4 class="lc-h">Things to do here</h4><div class="lc-things"></div><h4 class="lc-h">Residents</h4><div class="lc-res"></div>' +
        '<h4 class="lc-h">Operators</h4><div class="lc-roster-slot"></div><h4 class="lc-h">Exits</h4><div class="lc-exits"></div>';
      p.dataset.built = '1'; const slot = $1('.lc-roster-slot', p), ros = el.roster; if (slot && ros) slot.appendChild(ros);
      p.addEventListener('click', onAct);
    }
    const id = L.room(), r = L.ROOMS[id] || {}, hot = (L.HOT[id] || []);
    $1('.lc-room-ic', p).textContent = r.i || ''; $1('.lc-room-name', p).textContent = r.n || id; $1('.lc-room-kick', p).textContent = r.k || ''; $1('.lc-desc', p).textContent = r.d || '';
    const seats = hot.filter(h => h.t === 'seat'), acts = hot.filter(h => h.t !== 'seat' && h.t !== 'npc' && h.t !== 'door' && h.l), lbl = h => (L.label ? L.label(h) : h.l);
    setHTML($1('.lc-things', p), (acts.length || seats.length ? acts.map(h => '<button type="button" class="lc-act" data-hot="' + esc(h.id) + '" data-fk="h:' + esc(h.id) + '"><span aria-hidden="true">' + (h.icon || ICON[h.t] || '•') + '</span><span class="lc-act-l"><b>' + esc(lbl(h)) + '</b><small>' + esc(h.verb || VERB[h.t] || 'Go') + '</small></span></button>').join('') +
      (seats.length ? '<button type="button" class="lc-act" data-hot="' + esc(seats[0].id) + '" data-fk="h:seat"><span aria-hidden="true">🪑</span><span class="lc-act-l"><b>Sit down</b><small>' + seats.length + ' seat' + (seats.length > 1 ? 's' : '') + ' here</small></span></button>' : '') : '<p class="lc-empty">Nothing to interact with here yet.</p>'));
    const npcs = (L.who ? L.who(id) : []).filter(w => w.npc);
    setHTML($1('.lc-res', p), npcs.length ? npcs.map(n => '<button type="button" class="lc-res-i" data-hot="' + esc(n.uid) + '" data-fk="n:' + esc(n.uid) + '"><span class="lc-av">' + (root.CodexAvatar && n.code ? root.CodexAvatar.el(n.code, 28, 'sq') : '') + '</span><span class="lc-act-l"><b>' + esc(n.n) + '</b><small>' + esc(n.tag || 'Resident') + ' · talk</small></span></button>').join('') : '<p class="lc-empty">No one is on shift here right now.</p>');
    const keys = ['prev', 'next'].map(k => r[k]).concat(hot.filter(h => h.t === 'door').map(h => h.to)).filter((v, i, a) => v && L.ROOMS[v] && a.indexOf(v) === i);
    setHTML($1('.lc-exits', p), keys.map(k => { const lk = L.lockOf ? L.lockOf(k) : null; return '<button type="button" class="lc-exit" data-room="' + k + '" data-fk="r:' + k + '"' + (lk ? ' title="' + esc(lk) + '"' : '') + '>' + (lk ? '\uD83D\uDD12 ' : '') + esc(L.ROOMS[k].i) + ' ' + esc(L.ROOMS[k].n) + '</button>'; }).join(''));
  }
};

/* Games: metadata comes from CodexLoungeGames.meta[id] when a game provides it; Order Up's is the built-in fallback. */
const META = { orderUp: { n: 'Order Up', room: 'cafe', host: 'Mira', blurb: 'Memorise the tickets, then plate every order from memory.' } };
const gamesTab = {
  id: 'games', label: 'Games', order: 20,
  render(p) {
    const G = GM(), L = LG(), led = PG() ? PG().get() : { games: {} }; if (!G) { setHTML(p, '<p class="lc-empty">No games are loaded.</p>'); return; }
    const ids = (G.list || []).filter(id => G[id] && G[id].start);
    setHTML(p, ids.length ? ids.map(id => {
      const m = Object.assign({}, META[id], (G.meta && G.meta[id]) || {}), s = led.games[id] || { best: 0, plays: 0, wins: 0 }, rm = L && L.ROOMS[m.room];
      return '<article class="lc-game"><h4>' + esc(m.n || id) + '</h4><p>' + esc(m.blurb || '') + '</p><p class="lc-meta">' + (rm ? esc(rm.i + ' ' + rm.n) : '') + (m.host ? ' · ' + esc(m.host) : '') + '</p>' +
        '<p class="lc-stats"><span>Best <b>' + s.best + '</b></span><span>Plays <b>' + s.plays + '</b></span><span>Wins <b>' + s.wins + '</b></span></p>' +
        (rm ? '<button type="button" class="btn lc-go" data-room="' + esc(m.room) + '" data-fk="g:' + esc(id) + '">Go to ' + esc(rm.n) + '</button>' : '') + '</article>';
    }).join('') : '<p class="lc-empty">No games are loaded.</p>');
    if (!p.__bound) { p.__bound = 1; p.addEventListener('click', onAct); }
  }
};

const journalTab = {
  id: 'journal', label: 'Journal', order: 30,
  render(p) {
    const P = PG(), L = LG(); if (!P) { setHTML(p, '<p class="lc-empty">Progress tracking is unavailable.</p>'); return; }
    const d = P.get(), ids = L ? Object.keys(L.ROOMS) : [], seen = ids.filter(k => d.rooms[k] && d.rooms[k].n);
    const when = t => { if (!t) return ''; const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'now' : m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
    const note = P.status() === 'newer' ? '<p class="lc-warn">This journal was saved by a newer version of the site. It is shown empty and left untouched.</p>' : P.status() === 'recovered' ? '<p class="lc-warn">Your saved journal was unreadable, so a fresh one was started (a backup copy was kept).</p>' : '';
    setHTML(p, note + '<h4 class="lc-h">Rooms explored <span class="lc-count">' + seen.length + '/' + ids.length + '</span></h4><div class="lc-chips">' + ids.map(k => '<span class="lc-chip' + (seen.includes(k) ? ' on' : '') + '">' + esc(L.ROOMS[k].i) + ' ' + esc(L.ROOMS[k].n) + '</span>').join('') + '</div>' +
      (root.CodexLoungeWorld ? root.CodexLoungeWorld.collectionHTML(d) : '') + '<h4 class="lc-h">Activity</h4><p class="lc-stats"><span>Seats <b>' + d.stats.sits + '</b></span><span>Emotes <b>' + d.stats.emotes + '</b></span></p>' +
      '<h4 class="lc-h">Recent</h4>' + (d.log.length ? '<ol class="lc-log">' + d.log.slice().reverse().slice(0, 12).map(e => '<li><span>' + esc(e.x) + '</span><time>' + when(e.t) + '</time></li>').join('') + '</ol>' : '<p class="lc-empty">Nothing yet — explore, sit down, try a game.</p>') +
      '<button type="button" class="lc-reset" data-act="reset" data-fk="reset">Clear journal</button>');
    if (!p.__bound) { p.__bound = 1; p.addEventListener('click', e => { if (e.target.closest('[data-act="reset"]') && root.confirm('Clear your lounge journal? Rooms explored, activity and game records will be erased on this device.')) { P.reset(); } }); }
  }
};

function onAct(e) {
  const L = LG(); if (!L) return; const h = e.target.closest('[data-hot]'), r = e.target.closest('[data-room]');
  if (h) { if (L.walkTo(h.dataset.hot) && mobile()) setConsole(false, { restoreFocus: true }); }
  else if (r) { L.setRoom(r.dataset.room, { from: L.room() }); }
}

/* ---------- public API ---------- */
function api() { return { state: st, refresh: refresh, selectTab: selectTab, mobile: mobile, setHTML: setHTML }; }

function init() {
  el.lobby = $1('#lobby'); el.lounge = $1('#lounge'); if (!el.lobby || !el.lounge) return;
  Object.assign(el, { stage: $1('#loungeStage'), wrap: $1('.lobby-cv-wrap', el.lobby), cv: $1('#loungeCanvas'), cons: $1('#loungeConsole'), tabs: $1('#lcTabs'), body: $1('#lcBody'), cbtn: $1('#loungeConsoleBtn'), fbtn: $1('#loungeFocusBtn'), roster: $1('#lobbyRoster') });
  loadPrefs(); if (st.console === null) st.console = !mobile();
  registerTab(roomTab); registerTab(gamesTab); registerTab(journalTab);
  st.ready = true; buildTabs(); setConsole(st.console);
  el.cbtn.addEventListener('click', () => setConsole(!st.console, { restoreFocus: true }));
  $1('#loungeConsoleClose').addEventListener('click', () => setConsole(false, { restoreFocus: true }));
  el.fbtn.addEventListener('click', () => setFocus(!st.focus));
  el.tabs.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) selectTab(b.dataset.tab); });
  el.tabs.addEventListener('keydown', e => {   /* roving tabindex: ←/→/Home/End */
    const ids = TABS.map(t => t.id), i = ids.indexOf(st.tab); let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % ids.length; else if (e.key === 'ArrowLeft') n = (i + ids.length - 1) % ids.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = ids.length - 1;
    if (n >= 0) { e.preventDefault(); selectTab(ids[n], true); }
  });
  doc.addEventListener('keydown', onKey, true);
  root.addEventListener('resize', layout); if (mq.addEventListener) mq.addEventListener('change', () => { layout(); refresh(); });
  if (root.ResizeObserver) { ro = new root.ResizeObserver(layout); if (el.stage) ro.observe(el.stage); if (el.cons) ro.observe(el.cons); }
  const L = LG();
  if (L && L.on) {
    L.on('room', () => { refresh(); layout(); });
    L.on('active', e => { syncBody(); layout(); clearInterval(timer); timer = 0; if (e && e.on) { refresh(); timer = setInterval(refresh, 4000); } });
    L.on('arrive', refresh);
  }
  const le = NE().LoungeEngine; if (le && typeof le.renderRoster === 'function') { const rr = le.renderRoster; le.renderRoster = function () { const r = rr.apply(this, arguments); refresh(); return r; }; }
  if (PG()) PG().onChange(refresh);
  if (lobbyActive()) { syncBody(); refresh(); if (!timer) timer = setInterval(refresh, 4000); }
  layout();
}
doc.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { if (root.console) console.error('[lounge-console]', e); } });

root.CodexLoungeConsole = {
  registerTab: registerTab, selectTab: selectTab, refresh: refresh, setConsole: setConsole, setFocus: setFocus,
  isOpen: () => !!st.console, isFocus: () => st.focus, tabs: () => TABS.map(t => t.id), layout: layout, UI_KEY: UI_KEY
};
})(typeof window !== 'undefined' ? window : globalThis);
