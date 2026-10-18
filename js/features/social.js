/* social.js — V7 chat. One renderer (CodexChat) shared by the lounge panel and a floating dock that works on every screen.
   DMs deliver while the other person is offline (inbox pings + stored pair collection). Offline outbox, edit/delete/pin (as create-only
   events, so no Firestore-rules change), replies, reactions, read receipts, search, slash commands, drafts, avatars, hover profile cards. */
(function () {
'use strict';
const $1 = (s, r) => (r || document).querySelector(s), $A = (s, r) => Array.from((r || document).querySelectorAll(s));
const ld = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const NE = () => window.NetworkEngine || {}, AM = () => NE().AuthManager || {};
const DBr = () => { try { return NE().db && NE().db(); } catch (e) { return null; } };
const GW = (l, f) => NE().guardedWrite ? NE().guardedWrite(l, f) : Promise.resolve(false);
const online = () => { try { return !!NE().online() && !!AM().user && navigator.onLine !== false; } catch (e) { return false; } };
const me = () => ({ uid: AM().uid, name: AM().name || 'GUEST', admin: !!AM().admin, guest: !!AM().guest });
const EMO = ['😀', '😂', '😍', '🤔', '😎', '🥹', '😭', '🔥', '✨', '👍', '👏', '🙏', '💯', '❤️', '🎉', '🤯', '😴', '🐋', '🌊', '⭐'], REACT = ['👍', '❤️', '😂', '🔥', '🤯'];
const avOf = m => window.CodexAvatar ? (m.av || CodexAvatar.forName(m.n || 'op')) : '';
const dayLabel = d => { const t = new Date(), y = new Date(Date.now() - 864e5); return d.toDateString() === t.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
const clock = ts => { try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
function rich(t, q) {
  let s = esc(String(t)).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1</a>').replace(/(^|\s)@([\w-]{2,24})/g, (m, a, n) => a + '<span class="cmen' + (AM().name && n.toLowerCase() === String(AM().name).toLowerCase() ? ' me' : '') + '">@' + n + '</span>');
  if (q) { const r = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); s = s.replace(new RegExp('(' + esc(r) + ')(?![^<]*>)', 'gi'), '<mark>$1</mark>'); }
  return s;
}
/* ---------- fold: raw docs -> messages + applied events ---------- */
function fold(docs, ctx) {
  const msgs = [], by = {}, RX = {}, seen = {}; let pin = null;
  docs.forEach(m => { if (!m.k || m.k === 'm') { const c = Object.assign({}, m); msgs.push(c); if (c._id) by[c._id] = c; } });
  docs.filter(m => m.k && m.k !== 'm').sort((a, b) => (a.ts || 0) - (b.ts || 0)).forEach(e => {
    const t = by[e.to];
    if (e.k === 'r' && e.to && REACT.indexOf(e.e) >= 0) { const a = RX[e.to] = RX[e.to] || {}, l = a[e.e] = a[e.e] || []; if (l.indexOf(e.u) < 0) l.push(e.u); }
    else if (e.k === 'e' && t && t.u && t.u === e.u) { t.t = String(e.t || '').slice(0, 240); t.edited = 1; }
    else if (e.k === 'd' && t && t.u && t.u === e.u) t.deleted = 1;
    else if (e.k === 'p' && t && (ctx.kind === 'dm' || e.a)) pin = e.on ? t : (pin && pin._id === t._id ? null : pin);
    else if (e.k === 'v' && e.u) seen[e.u] = Math.max(seen[e.u] || 0, e.ts || 0);
  });
  return { msgs: msgs, RX: RX, pin: pin, seen: seen };
}
function build(st, ctx, q) {
  const U = ctx.me, peer = ctx.peer && ctx.peer.uid, show = st.msgs.filter(m => !q || (!m.deleted && String(m.t || '').toLowerCase().indexOf(q) >= 0)).slice(-150);
  const same = (a, b) => !!(a && b && a.u && a.u === b.u && !a.deleted === !b.deleted && b.ts - a.ts < 300000 && new Date(a.ts).toDateString() === new Date(b.ts).toDateString());
  let lastMine = -1; show.forEach((m, i) => { if (m.u === U.uid && !m.deleted && !m.pending) lastMine = i; });
  let h = '', day = '';
  show.forEach((m, i) => {
    const d = new Date(m.ts || Date.now()), dk = d.toDateString(); if (dk !== day) { day = dk; h += '<div class="cday"><span>' + dayLabel(d) + '</span></div>'; }
    const mine = m.u === U.uid, grp = same(show[i - 1], m), end = !same(m, show[i + 1]), rx = st.RX[m._id];
    const avt = mine ? '' : grp ? '<span class="cav sp"></span>' : '<button type="button" class="cav" data-u="' + esc(m.u || '') + '" data-n="' + esc(m.n || '') + '" data-av="' + esc(m.av || '') + '" aria-label="' + esc((m.n || 'Operator') + ' profile') + '">' + (window.CodexAvatar ? CodexAvatar.el(avOf(m), 32) : esc(String(m.n || 'O').charAt(0))) + '</button>';
    const t = String(m.t || ''), act = /^\/me\s/i.test(t);
    const bub = m.deleted ? '<div class="cbub gone"><i>Message deleted</i></div>' :
      '<div class="cbub' + (act ? ' act' : '') + '">' + (m.re ? '<button type="button" class="cquote" data-jump="' + esc(m.re.i || '') + '"><b>' + esc(m.re.n || 'OP') + '</b>' + esc(m.re.t || '') + '</button>' : '') + '<div class="ctx">' + (act ? '<i>* ' + esc(m.n || 'op') + ' ' + rich(t.slice(4), q) + '</i>' : rich(t, q)) + '</div></div>';
    const status = (end && m.ts ? clock(m.ts) : '') + (m.edited ? ' · edited' : '') + (m.pending ? ' · sending…' : '') + (ctx.kind === 'dm' && i === lastMine && peer && (st.seen[peer] || 0) >= m.ts ? ' · Seen' : '');
    h += '<div class="cm' + (mine ? ' mine' : '') + (grp ? ' grp' : '') + (m.pending ? ' pend' : '') + (st.pin && st.pin._id === m._id ? ' pinned' : '') + '" data-id="' + esc(m._id || '') + '">' + avt + '<div class="cbody">' +
      (!mine && !grp ? '<div class="cwho">' + esc(m.n || 'OP') + (m.a ? '<span class="abadge">ADMIN</span>' : '') + (m.g ? '<span class="gbadge">GUEST</span>' : '') + '</div>' : '') + bub +
      (rx ? '<div class="crxs">' + Object.keys(rx).map(e => '<button type="button" class="crx' + (rx[e].indexOf(U.uid) >= 0 ? ' me' : '') + '" data-react="' + esc(e) + '">' + esc(e) + ' ' + rx[e].length + '</button>').join('') + '</div>' : '') +
      (status ? '<div class="cts">' + status + '</div>' : '') + '</div>' +
      (m.deleted || m.pending ? '' : '<div class="cact"><button type="button" data-reply aria-label="Reply">↩</button><button type="button" data-pick aria-label="React">☺</button>' + (mine ? '<button type="button" data-edit aria-label="Edit">✎</button>' : '') + (mine || U.admin ? '<button type="button" data-del aria-label="Delete">🗑</button>' : '') + (ctx.kind === 'dm' || U.admin ? '<button type="button" data-pin aria-label="Pin">📌</button>' : '') + '</div><div class="cpick">' + REACT.map(e => '<button type="button" data-react="' + e + '">' + e + '</button>').join('') + '</div>') + '</div>';
  });
  return h;
}
/* ---------- outbox (offline queue) ---------- */
let OUT = ld('cx_v7_outbox', []), flushing = false;
const pendingFor = ad => { const c = ad.col && ad.col(), p = c && c.path; return p ? OUT.filter(o => o.path === p).map(o => Object.assign({ _id: 'o' + o.doc.ts, pending: 1 }, o.doc)) : []; };
function queue(path, doc) { OUT.push({ path: path, doc: doc, tries: 0 }); sv('cx_v7_outbox', OUT.slice(-60)); }
function flushOut() {
  if (flushing || !OUT.length || !online() || !DBr()) return; flushing = true;
  const next = () => {
    const o = OUT[0]; if (!o) { flushing = false; return; }
    GW('chat', () => DBr().collection(o.path).add(o.doc)).then(ok => { if (ok) { OUT.shift(); sv('cx_v7_outbox', OUT); setTimeout(next, 350); } else { flushing = false; } }).catch(() => { flushing = false; });
  };
  next();
}
/* ---------- events / sending ---------- */
function evt(ad, o) { const col = ad.col(), u = me(); if (!col || !online()) return Promise.resolve(false); return GW('chat', () => col.add(Object.assign({ n: u.name, u: u.uid, ts: Date.now(), a: u.admin ? 1 : 0 }, o))); }
let LASTPING = ld('cx_v7_ping', {});
function ping(uid, text) {
  const now = Date.now(); if (!uid || now - (LASTPING[uid] || 0) < 600000 || !online() || !DBr()) return; LASTPING[uid] = now; sv('cx_v7_ping', LASTPING);
  const u = me(); GW('chat', () => DBr().collection('chat_dm_inbox_' + uid).add({ k: 'ping', from: u.uid, n: u.name, av: (window.CodexAvatar && CodexAvatar.mine()) || '', ts: now, t: String(text || '').slice(0, 40) }));
}
const EDIT = { id: null };
function prepare(text, ad) {
  if (EDIT.id) { const id = EDIT.id; EDIT.id = null; evt(ad, { k: 'e', to: id, t: text }); toast('<b>Message edited</b>', 'check'); return { handled: true }; }
  let m;
  if ((m = /^\/roll(?:\s+(\d{1,2})d(\d{1,3}))?\s*$/i.exec(text))) { const n = +(m[1] || 1), s = Math.max(2, +(m[2] || 20)), r = []; for (let i = 0; i < n; i++) r.push(1 + Math.floor(Math.random() * s)); return { text: '🎲 rolled ' + n + 'd' + s + ': ' + (n > 1 ? r.join(' + ') + ' = ' : '') + r.reduce((a, b) => a + b, 0) }; }
  if (/^\/shrug\b/i.test(text)) return { text: (text.slice(6).trim() + ' ¯\\_(ツ)_/¯').trim() };
  if ((m = /^\/ask\s+(.+)/i.exec(text))) { if (window.CodexGuide) CodexGuide.ask(m[1]); return { handled: true }; }
  if (/^\/help\b/i.test(text)) { toast('<b>Chat commands</b><br>/me action · /roll 2d6 · /shrug · /ask question (private, to the Guide)', 'speech'); return { handled: true }; }
  return { text: text };
}
/* ---------- shared painting + actions ---------- */
function paint(log, docs, host, adOverride) {
  const ad = adOverride || host.adapter(), u = me(), ctx = { me: u, kind: ad.kind(), peer: ad.peer && ad.peer() };
  const st = fold(docs.concat(pendingFor(ad)), ctx), q = (log.dataset.q || '').toLowerCase(), S = log._s = log._s || { last: null, un: 0 };
  if (!st.msgs.length) { log.innerHTML = '<div class="chat-sys chat-empty"><b>' + esc(ad.label()) + '</b> is quiet.<br>' + (ctx.kind === 'dm' ? 'Say hi. Messages arrive even if they\'re offline.' : 'Say hi. The first message sets the tone.') + '</div>'; pinBar(log, null); return st; }
  const near = log.scrollHeight - log.scrollTop - log.clientHeight < 90, first = !S.last;
  log.innerHTML = build(st, ctx, q);
  const vis = st.msgs.filter(m => !q || (!m.deleted && String(m.t || '').toLowerCase().indexOf(q) >= 0)).slice(-150), ids = vis.map(m => m._id), li = S.last ? ids.indexOf(S.last) : -1, lm = vis[vis.length - 1];
  S.last = ids[ids.length - 1];
  if (first || near || (lm && lm.u === u.uid)) { log.scrollTop = log.scrollHeight; S.un = 0; } else if (li >= 0) S.un += ids.length - 1 - li;
  if (host && host.jumpUI) { host.unseen = S.un; host.lastId = S.last; host.jumpUI(); } else if (log._jump) { log._jump(S.un); }
  pinBar(log, st.pin); markSeen(ad, st, ctx);
  return st;
}
function pinBar(log, pin) {
  let b = log.parentNode && log.parentNode.querySelector('.cpinbar');
  if (!b) { if (!pin) return; log.insertAdjacentHTML('beforebegin', '<button type="button" class="cpinbar" hidden></button>'); b = log.parentNode.querySelector('.cpinbar'); b.addEventListener('click', () => { const t = log.querySelector('.cm[data-id="' + String(b.dataset.id).replace(/"/g, '') + '"]'); if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1200); } }); }
  b.hidden = !pin; if (pin) { b.dataset.id = pin._id; b.innerHTML = '📌 <b>' + esc(pin.n || 'OP') + '</b> ' + esc(String(pin.t || '').slice(0, 90)); }
}
const SEENW = {};
function markSeen(ad, st, ctx) {
  if (ctx.kind !== 'dm' || document.hidden || !ctx.peer) return; const last = st.msgs.filter(m => m.u === ctx.peer.uid).pop();
  const id = ad.convoId(); if (!last || (st.seen[ctx.me.uid] || 0) >= last.ts || Date.now() - (SEENW[id] || 0) < 20000) return; SEENW[id] = Date.now(); evt(ad, { k: 'v' });
}
function bind(log, ad) {
  if (log.__cb) return; log.__cb = 1;
  log.addEventListener('click', e => {
    const t = e.target, cm = t.closest('.cm'), av = t.closest('.cav[data-u]'); if (av) { userCard(av); return; }
    if (!cm) return; const id = cm.dataset.id, docs = ad.docs(), msg = docs.filter(m => m._id === id)[0];
    if (t.closest('[data-reply]')) { if (msg) ad.setReply({ i: id, n: msg.n || 'OP', t: String(msg.t || '').slice(0, 70) }); return; }
    const rb = t.closest('[data-react]'); if (rb) { react(ad, id, rb.dataset.react); cm.classList.remove('picking'); return; }
    if (t.closest('[data-pick]')) { cm.classList.toggle('picking'); return; }
    if (t.closest('[data-edit]') && msg) { EDIT.id = id; const i = ad.input ? ad.input() : $1('#chatInput'); if (i) { i.value = String(msg.t || ''); i.focus(); toast('<b>Editing</b><br>Press Enter to save, or reload to cancel.', 'speech'); } return; }
    if (t.closest('[data-del]') && msg) { const own = msg.u === me().uid; if (!confirm('Delete this message?')) return; if (own) evt(ad, { k: 'd', to: id }); else if (me().admin) GW('chat', () => ad.col().doc(id).delete()); return; }
    if (t.closest('[data-pin]') && msg) { const pinned = cm.classList.contains('pinned'); evt(ad, { k: 'p', to: id, on: pinned ? 0 : 1 }); return; }
    const qt = t.closest('.cquote'); if (qt) { const x = log.querySelector('.cm[data-id="' + String(qt.dataset.jump).replace(/"/g, '') + '"]'); if (x) { x.scrollIntoView({ block: 'center', behavior: 'smooth' }); x.classList.add('flash'); setTimeout(() => x.classList.remove('flash'), 1200); } return; }
    $A('.cm.sel', log).forEach(x => { if (x !== cm) x.classList.remove('sel'); }); cm.classList.toggle('sel');
  });
}
function react(ad, id, emo) {
  const u = me(); if (!online()) { toast('<b>Sign in to react</b>', 'cross'); return; }
  if (ad.docs().some(m => m.k === 'r' && m.to === id && m.e === emo && m.u === u.uid)) return;
  evt(ad, { k: 'r', to: id, e: emo }).then(ok => { if (ok && window.sfx) sfx('flip'); });
}
function userCard(btn) {
  const old = $1('.cx-ucard'); if (old) old.remove(); const u = me(), uid = btn.dataset.u, name = btn.dataset.n || 'Operator', av = btn.dataset.av || (window.CodexAvatar ? CodexAvatar.forName(name) : '');
  const r = btn.getBoundingClientRect(), c = document.createElement('div'); c.className = 'cx-ucard'; c.setAttribute('role', 'dialog');
  c.innerHTML = (window.CodexAvatar ? CodexAvatar.el(av, 64, 'sq') : '') + '<div><b>' + esc(name) + '</b>' + (uid && uid !== u.uid ? '<button type="button" class="btn primary" data-uc="dm">Message</button>' : '') + '</div>';
  document.body.appendChild(c); c.style.left = Math.max(8, Math.min(innerWidth - 230, r.left)) + 'px'; c.style.top = Math.min(innerHeight - 110, r.bottom + 6) + 'px';
  c.addEventListener('click', e => { if (e.target.closest('[data-uc=dm]')) { c.remove(); dock.openDM(uid, name, av); } });
  setTimeout(() => document.addEventListener('click', function f(e) { if (!c.contains(e.target)) { c.remove(); document.removeEventListener('click', f); } }), 0);
}
/* ---------- the dock ---------- */
let CONV = ld('cx_v7_convs', {}), LAST = ld('cx_v7_last', {}), INBOX = [], firstSnap = true, inboxUn = null;
const D = { open: false, view: 'list', cid: null, unsub: null, docs: [], reply: null, search: false, emo: false, err: 0 };
const TOPICS = () => (NE().ChatEngine && NE().ChatEngine.TOPICS) || ['astronomy', 'physics', 'gaming-lore', 'mathematics', 'history', 'psychology'];
const studyTopic = t => (TOPICS().indexOf(t) >= 0 ? t : TOPICS()[0]);   /* never build a collection path from an unvalidated cid */
function convo(cid) {
  if (cid === 'g') return { id: 'g', kind: 'room', label: 'Everyone', col: () => DBr() && DBr().collection('chat_global') };
  if (cid.indexOf('s:') === 0) { const tp = studyTopic(cid.slice(2)); return { id: 's:' + tp, kind: 'room', label: 'Study · ' + tp, col: () => DBr() && DBr().collection('chat_study_' + tp) }; }
  if (cid.indexOf('r:') === 0) return { id: cid, kind: 'room', label: 'Room ' + cid.slice(2), col: () => DBr() && DBr().collection('chat_essay_' + cid.slice(2)) };
  const uid = cid.slice(3), c = CONV[uid] || {};
  return { id: cid, kind: 'dm', label: c.n || 'Operator', peer: { uid: uid, name: c.n, av: c.av }, col: () => { if (!DBr() || !AM().uid) return null; return DBr().collection('chat_dm_' + [AM().uid, uid].sort().join('_')); } };
}
const unread = uid => INBOX.filter(p => p.from === uid && p.ts > (LAST['dm:' + uid] || 0)).length;
const totalUn = () => Object.keys(CONV).reduce((a, u) => a + unread(u), 0);
function badge() { const n = totalUn(), b = $1('#cxDockBtn .dk-badge'); if (b) { b.textContent = n > 9 ? '9+' : n; b.hidden = !n; } }
function adapterOf(cv) { return { kind: () => cv.kind, col: cv.col, docs: () => D.docs, setReply: r => { D.reply = r; replyBar(); }, peer: () => cv.peer, label: () => cv.label, convoId: () => cv.id, reply: () => D.reply, input: () => $1('#dkIn') }; }
function stopListen() { if (D.unsub) { try { D.unsub(); } catch (e) {} D.unsub = null; } }
function listen(cv) {
  stopListen(); D.docs = []; D.err = 0; const col = cv.col(); if (!col) { paintDock(); return; }
  D.unsub = col.orderBy('ts', 'desc').limit(100).onSnapshot(snap => { const a = []; snap.forEach(d => a.push(Object.assign({ _id: d.id }, d.data()))); a.reverse(); D.docs = a; paintDock(); }, () => { D.err = 1; paintDock(); });
}
function shell() {
  if ($1('#cxDock')) return;
  document.body.insertAdjacentHTML('beforeend', '<section id="cxDock" class="dk" role="dialog" aria-label="Chats" hidden><header class="dk-h"><button type="button" data-dk="back" aria-label="Back">‹</button><b class="dk-t">Chats</b><button type="button" data-dk="catch" aria-label="Catch up: summarize recent messages" title="Catch up" hidden>✦</button><button type="button" data-dk="search" aria-label="Search in chat">🔍</button><button type="button" data-dk="close" aria-label="Close chats">✕</button></header><div class="dk-body"></div></section>');
  $1('#cxDock').addEventListener('click', onDock);
}
function open(view, cid) {
  shell(); D.open = true; $1('#cxDock').hidden = false; if (view) D.view = view; if (cid) D.cid = cid; paintDock(); flushOut(); inboxStart();
  if (D.view === 'chat' && D.cid) { listen(convo(D.cid)); LAST[D.cid] = Date.now(); sv('cx_v7_last', LAST); badge(); }
}
function close() { D.open = false; stopListen(); const d = $1('#cxDock'); if (d) d.hidden = true; }
function openDM(uid, name, av) {
  if (!AM().user) { if (AM().ensureAuth) AM().ensureAuth('Sign in to message people.'); return; }
  if (!AM().mailOK()) { toast('<b>Add an email to unlock DMs</b><br>Verify an email or link Google (takes a minute).', 'speech', 3600); if (window.CodexAccount) CodexAccount.open('email'); return; }
  if (!CONV[uid]) { CONV[uid] = { n: name || 'Operator', av: av || '', ts: Date.now(), t: '' }; sv('cx_v7_convs', CONV); }
  D.view = 'chat'; D.cid = 'dm:' + uid; D.reply = null; open('chat', D.cid);
}
function listHTML() {
  const rows = [['g', 'Everyone', 'Global chat', ''], ...(NE().NotebookManager && NE().NotebookManager.room ? [['r:' + NE().NotebookManager.room, 'Room ' + NE().NotebookManager.room, 'Your notebook room', '']] : [])];
  const dms = Object.keys(CONV).sort((a, b) => (CONV[b].ts || 0) - (CONV[a].ts || 0));
  const row = (cid, name, sub, av, un) => '<button type="button" class="dk-r" data-dk="open" data-c="' + esc(cid) + '"><span class="dk-ico">' + (av && window.CodexAvatar ? CodexAvatar.el(av, 40, 'sq') : (cid === 'g' ? '🌊' : '🪐')) + '</span><span class="dk-rt"><b>' + esc(name) + '</b><small>' + esc(sub || '') + '</small></span>' + (un ? '<i class="dk-un">' + un + '</i>' : '') + '</button>';
  const gate = AM().user && !AM().mailOK() ? '<div class="dk-gate">🔒 <b>Direct messages</b> need a verified email or Google link. <button type="button" class="ac-link" data-dk="acct">Set up</button></div>' : '';
  return '<button type="button" class="btn primary dk-new" data-dk="new">＋ New message</button>' + gate + rows.map(r => row(r[0], r[1], r[2], '', 0)).join('') + '<h5 class="dk-sec">Study rooms</h5>' + TOPICS().map(tp => row('s:' + tp, 'Study · ' + tp, 'Topic room', '', 0)).join('') + '<h5 class="dk-sec">Direct messages</h5>' + (dms.length ? dms.map(u => row('dm:' + u, CONV[u].n || 'Operator', CONV[u].t || 'No messages yet', CONV[u].av || (window.CodexAvatar ? CodexAvatar.forName(CONV[u].n || 'op') : ''), unread(u))).join('') : '<p class="small dk-empty">No conversations yet. Start one with ＋ New message, or click a name in chat.</p>');
}
function paintDock() {
  const d = $1('#cxDock'); if (!d || !D.open) return; const body = $1('.dk-body', d), cv = D.cid && convo(D.cid);
  $1('.dk-t', d).textContent = D.view === 'chat' && cv ? cv.label : D.view === 'new' ? 'New message' : 'Chats'; $1('[data-dk=back]', d).hidden = D.view === 'list'; $1('[data-dk=search]', d).hidden = D.view !== 'chat'; { const cb = $1('[data-dk=catch]', d); if (cb) cb.hidden = D.view !== 'chat' || !window.CodexGuide; }
  if (D.view === 'list') { body.innerHTML = '<div class="dk-list">' + listHTML() + '</div>'; return; }
  if (D.view === 'new') { if (!$1('#dkQ', body)) { body.innerHTML = '<div class="dk-find"><input id="dkQ" type="search" placeholder="Search a username…" autocomplete="off" aria-label="Find a person"><div id="dkRes" class="dk-list"><p class="small dk-empty">Type at least 2 letters.</p></div></div>'; const q = $1('#dkQ', body); let t = 0; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => AM().lookup(q.value, rs => { $1('#dkRes').innerHTML = rs.length ? rs.map(r => '<button type="button" class="dk-r" data-dk="pick" data-u="' + esc(r.uid) + '" data-n="' + esc(r.name) + '" data-av="' + esc(r.avatar || '') + '"><span class="dk-ico">' + CodexAvatar.el(r.avatar || CodexAvatar.forName(r.name), 40, 'sq') + '</span><span class="dk-rt"><b>' + esc(r.name) + '</b><small>Level ' + (r.level || 1) + '</small></span></button>').join('') : '<p class="small dk-empty">No one found. Names must match exactly the start of a username.</p>'; }), 260); }); setTimeout(() => q.focus(), 40); } return; }
  if (!$1('.dk-log', body)) {
    const off = !online() ? '<div class="dk-off">Offline: messages will queue and send when you reconnect.</div>' : '';
    body.innerHTML = off + '<div class="dk-sbar" hidden><input id="dkS" type="search" placeholder="Search this chat" aria-label="Search this chat"></div><div class="dk-chat"><div class="dk-log" tabindex="0" aria-live="polite"></div><button type="button" class="cjump" id="dkJump" hidden></button></div><div class="creplybar" id="dkReply" hidden><span></span><button type="button" aria-label="Cancel reply">×</button></div><div class="dk-emo" hidden>' + EMO.map(e => '<button type="button" data-dk="emo" data-e="' + e + '">' + e + '</button>').join('') + '</div><div class="dk-comp"><button type="button" class="dk-eb" data-dk="emoT" aria-label="Emoji">😊</button><textarea id="dkIn" rows="1" maxlength="240" placeholder="Message… (/help)" aria-label="Message"></textarea><button type="button" class="btn primary" data-dk="send">Send</button></div>';
    const log = $1('.dk-log', body), ad = adapterOf(cv), inp = $1('#dkIn', body), dr = ld('cx_v7_draft', {});
    bind(log, ad); inp.value = dr[D.cid] || '';
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); dockSend(); } });
    inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 110) + 'px'; const x = ld('cx_v7_draft', {}); x[D.cid] = inp.value; sv('cx_v7_draft', x); });
    $1('#dkJump', body).addEventListener('click', () => { log.scrollTop = log.scrollHeight; log._s.un = 0; log._jump(0); }); log._jump = n => { const j = $1('#dkJump'); if (j) { j.hidden = n < 1; j.textContent = '↓ ' + n + ' new'; } };
    log.addEventListener('scroll', () => { if (log._s && log._s.un && log.scrollHeight - log.scrollTop - log.clientHeight < 90) { log._s.un = 0; log._jump(0); } }, { passive: true });
    $1('#dkS', body).addEventListener('input', e => { log.dataset.q = e.target.value.trim(); paint(log, D.docs, null, adapterOf(convo(D.cid))); });
    $1('#dkReply button', body).addEventListener('click', () => { D.reply = null; replyBar(); });
  }
  const log = $1('.dk-log', body); paint(log, D.docs, null, adapterOf(cv));
}
function replyBar() { const b = $1('#dkReply'); if (!b) return; b.hidden = !D.reply; if (D.reply) { $1('span', b).innerHTML = 'Replying to <b>' + esc(D.reply.n) + '</b> · ' + esc(D.reply.t); const i = $1('#dkIn'); if (i) i.focus(); } }
function dockSend() {
  const inp = $1('#dkIn'); if (!inp) return; let text = inp.value.trim().slice(0, 240); if (!text) return; const cv = convo(D.cid), ad = adapterOf(cv), u = me();
  if (!AM().user) { if (AM().ensureAuth) AM().ensureAuth('Sign in to chat.'); return; }
  const pr = prepare(text, ad); if (pr.handled) { inp.value = ''; inp.style.height = 'auto'; return; } text = pr.text;
  const col = cv.col(), doc = { n: u.name, u: u.uid, t: text, ts: Date.now(), a: u.admin ? 1 : 0, g: u.guest ? 1 : 0 };
  if (window.CodexAvatar && CodexAvatar.mine()) doc.av = CodexAvatar.mine(); if (D.reply) doc.re = D.reply;
  const done = () => { inp.value = ''; inp.style.height = 'auto'; D.reply = null; replyBar(); const x = ld('cx_v7_draft', {}); delete x[D.cid]; sv('cx_v7_draft', x); if (cv.kind === 'dm') { ping(cv.peer.uid, text); CONV[cv.peer.uid].ts = Date.now(); CONV[cv.peer.uid].t = text.slice(0, 40); sv('cx_v7_convs', CONV); } };
  if (!col) return;
  if (!online()) { queue(col.path, doc); done(); paintDock(); toast('<b>Queued</b><br>Sends when you\'re back online.', 'speech', 2600); return; }
  GW('chat', () => col.add(doc)).then(ok => { if (ok) { done(); if (window.sfx) sfx('flip'); } else { queue(col.path, doc); done(); paintDock(); toast('<b>Queued</b><br>Will retry automatically.', 'speech', 2400); } });
}
function onDock(e) {
  const b = e.target.closest('[data-dk]'); if (!b) return; const a = b.dataset.dk;
  if (a === 'close') return close();
  if (a === 'back') { stopListen(); D.view = 'list'; D.cid = null; D.reply = null; return paintDock(); }
  if (a === 'new') { D.view = 'new'; return paintDock(); }
  if (a === 'acct') { if (window.CodexAccount) CodexAccount.open('email'); return; }
  if (a === 'open') { const cid = b.dataset.c; if (cid.indexOf('dm:') === 0 && !AM().mailOK()) { toast('<b>Add an email to unlock DMs</b>', 'speech'); if (window.CodexAccount) CodexAccount.open('email'); return; } D.view = 'chat'; D.cid = cid; D.reply = null; return open('chat', cid); }
  if (a === 'pick') return openDM(b.dataset.u, b.dataset.n, b.dataset.av);
  if (a === 'search') { const s = $1('.dk-sbar'); if (s) { s.hidden = !s.hidden; if (!s.hidden) $1('#dkS').focus(); else { $1('#dkS').value = ''; $1('.dk-log').dataset.q = ''; paintDock(); } } return; }
  if (a === 'catch') { const cv = D.cid && convo(D.cid), m = (D.docs || []).filter(x => x.k !== 'r' && x.t && !x.deleted).slice(-40).map(x => ({ n: x.n, t: x.t })); if (!m.length) { toast('<b>Nothing to summarize yet.</b>', 'speech', 2000); return; } if (window.CodexGuide) CodexGuide.run('catchup', { chat: m, channel: cv ? cv.label : 'chat' }); return; }
  if (a === 'send') return dockSend();
  if (a === 'emoT') { const m = $1('.dk-emo'); if (m) m.hidden = !m.hidden; return; }
  if (a === 'emo') { const i = $1('#dkIn'); i.value += b.dataset.e; i.focus(); i.dispatchEvent(new Event('input')); }
}
/* ---------- inbox: DMs reach you even when you were offline ---------- */
function inboxStart() {
  if (inboxUn || !online() || !DBr() || !AM().mailOK()) return;
  inboxUn = DBr().collection('chat_dm_inbox_' + AM().uid).orderBy('ts', 'desc').limit(40).onSnapshot(snap => {
    INBOX = []; snap.forEach(d => { const x = d.data(); if (x && x.k === 'ping' && x.from) INBOX.push(x); });
    INBOX.forEach(p => { const c = CONV[p.from] = CONV[p.from] || {}; if ((p.ts || 0) > (c.ts || 0)) { c.n = p.n || c.n; c.av = p.av || c.av; c.ts = p.ts; c.t = p.t || c.t || ''; } });
    sv('cx_v7_convs', CONV);
    if (!firstSnap) snap.docChanges().forEach(ch => { if (ch.type !== 'added') return; const p = ch.doc.data(); if (!p || p.from === AM().uid || (D.open && D.cid === 'dm:' + p.from)) return; toast('<b>💬 ' + esc(p.n || 'Someone') + '</b><br>' + esc(p.t || 'sent you a message'), 'speech', 4200); if (window.sfx) sfx('reveal'); });
    firstSnap = false; badge(); if (D.open && D.view === 'list') paintDock();
  }, () => {});
}
function inboxStop() { if (inboxUn) { try { inboxUn(); } catch (e) {} inboxUn = null; } firstSnap = true; INBOX = []; badge(); }
const dock = { open: open, close: close, openDM: openDM, toggle: () => D.open ? close() : open('list') };
window.CodexChat = { paint: paint, bind: bind, prepare: prepare, ping: ping, dock: dock, _fold: fold, _build: build, flush: flushOut, dmAllowed: () => AM().mailOK && AM().mailOK() };
/* ---------- wiring ---------- */
function init() {
  const tools = $1('.tools');
  if (tools) { tools.insertAdjacentHTML('afterbegin', '<button type="button" class="tb" id="cxDockBtn" aria-label="Open chats" title="Chats"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg><i class="dk-badge" hidden></i></button>'); $1('#cxDockBtn').addEventListener('click', () => dock.toggle()); }
  const NEg = NE().ChatEngine; if (NEg && typeof NEg.adapter === 'function' && $1('#chatLog')) bind($1('#chatLog'), NEg.adapter());
  window.addEventListener('online', () => { flushOut(); inboxStart(); paintDock(); }); window.addEventListener('offline', () => paintDock());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) flushOut(); });
  setInterval(() => { flushOut(); if (!inboxUn) { inboxStart(); } else if (!AM().user) inboxStop(); }, 20000);
  let uid = null; setInterval(() => { if (AM().uid !== uid) { uid = AM().uid; inboxStop(); setTimeout(() => { inboxStart(); flushOut(); }, 600); } }, 1500);
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); dock.toggle(); } else if (e.key === 'Escape' && D.open) close(); });
}
document.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { if (window.console) console.error('[social]', e); } });
})();
