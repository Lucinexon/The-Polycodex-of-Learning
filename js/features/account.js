/* account.js — V7 account sheet: Google sign-in, email-required sign-up, username change, email verification, avatar + shortcuts.
   Replaces AuthManager.openModal. Needs the V7 AuthManager methods in network.js. */
(function () {
'use strict';
const $1 = (s, r) => (r || document).querySelector(s);
const AM = () => (window.NetworkEngine || {}).AuthManager;
let TAB = 'in', MSG = '', OK = false, WAIT = false;
const f = (id, label, type, ph, extra) => '<label class="ac-f"><span>' + label + '</span><input id="' + id + '" type="' + type + '" placeholder="' + (ph || '') + '" autocomplete="' + (extra || 'off') + '" spellcheck="false"></label>';
const msg = () => MSG ? '<p class="ac-msg ' + (OK ? 'ok' : 'bad') + '" role="alert">' + esc(MSG) + '</p>' : '';
const val = id => { const e = $1('#' + id); return e ? e.value.trim() : ''; };
const legacy = u => !!(u && /@codex\.local$/i.test(u.email || ''));
function who(A) { const n = A.name || 'OPERATOR'; return CodexAvatar.el(CodexAvatar.mine() || CodexAvatar.forName(n), 72, 'sq'); }
function signedOutHTML() {
  const tabs = '<div class="ac-tabs" role="tablist"><button type="button" role="tab" class="' + (TAB === 'in' ? 'on' : '') + '" data-ac="tab" data-t="in">Sign in</button><button type="button" role="tab" class="' + (TAB === 'up' ? 'on' : '') + '" data-ac="tab" data-t="up">Create account</button></div>';
  const g = '<button type="button" class="btn ac-g" data-ac="google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.7 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg> Continue with Google</button>';
  const body = TAB === 'in'
    ? f('acId', 'Email or legacy username', 'text', 'you@mail.com or a legacy username', 'username') + f('acPw', 'Password', 'password', '••••••••', 'current-password') + '<button type="button" class="btn primary" data-ac="login" ' + (WAIT ? 'disabled' : '') + '>Sign in</button> <button type="button" class="ac-link" data-ac="reset">Forgot password?</button>'
    : f('acUn', 'Username', 'text', '3–18 letters, digits or _', 'username') + f('acEm', 'Email (required)', 'email', 'you@mail.com', 'email') + f('acPw', 'Password', 'password', 'min 6 characters', 'new-password') + '<p class="small">A real email lets you recover your account and unlocks direct messages. We send one verification link.</p><button type="button" class="btn primary" data-ac="register" ' + (WAIT ? 'disabled' : '') + '>Create account</button>';
  return '<div class="ac">' + g + '<div class="ac-or"><span>or</span></div>' + tabs + '<div class="ac-body">' + body + '</div>' + msg() + '<p class="small ac-guest">No account? <button type="button" class="ac-link" data-ac="guest">Keep browsing as a guest</button>. Guests can read and learn but can\'t send DMs.</p></div>';
}
function profileHTML(A) {
  const u = A.user, lg = legacy(u), mail = u.email && !lg ? u.email : '';
  const mailRow = A.viaGoogle ? '<div class="ac-row"><b>Email</b><span class="ac-ok">✓ Google account</span></div>'
    : mail ? '<div class="ac-row"><b>Email</b><span>' + esc(mail) + ' ' + (A.verified ? '<i class="ac-ok">✓ verified</i>' : '<i class="ac-warn">not verified</i>') + '</span></div>' + (A.verified ? '' : '<div class="ac-btns"><button type="button" class="btn" data-ac="verify">Resend link</button><button type="button" class="btn" data-ac="refresh">I verified it</button></div>')
    : '<div class="ac-row"><b>Email</b><span class="ac-warn">none yet</span></div><div class="ac-box">' + f('acEm', 'Add an email to unlock DMs', 'email', 'you@mail.com', 'email') + (lg ? f('acPw', 'Password (to confirm)', 'password', '', 'current-password') : '') + '<button type="button" class="btn primary" data-ac="addmail">Add &amp; send verification</button><p class="small">After adding an email you can sign in with it. Your username keeps working as your display name.</p></div>';
  return '<div class="ac"><div class="ac-me">' + who(A) + '<div><b class="ac-name">' + esc(A.name || 'OPERATOR') + '</b><span class="small">' + (A.guest ? 'Guest' : A.viaGoogle ? 'Google account' : 'Account') + ' · ' + (A.mailOK() ? 'DMs unlocked' : 'DMs locked') + '</span><button type="button" class="btn" data-ac="avatar">🎨 Edit avatar</button></div></div>' +
    (A.guest ? '<div class="ac-box"><p><b>You\'re browsing as a guest.</b> Create an account or link Google to keep your progress across devices.</p>' + '<div class="ac-btns"><button type="button" class="btn primary" data-ac="google">Link Google</button><button type="button" class="btn" data-ac="tab" data-t="up">Create account</button></div></div>' :
      '<h4>Username</h4><div class="ac-box">' + f('acNew', 'New username', 'text', A.name || '', 'username') + (lg ? f('acPw2', 'Password (to confirm)', 'password', '', 'current-password') : '') + '<button type="button" class="btn" data-ac="rename">Change username</button></div><h4>Email &amp; security</h4>' + mailRow) +
    msg() + '<h4>Shortcuts</h4><div class="ac-btns"><button type="button" class="btn" data-ac="go" data-g="badges">🏆 Badges</button><button type="button" class="btn" data-ac="go" data-g="settings">⚙ Settings</button><button type="button" class="btn" data-ac="go" data-g="guide">✦ Guide</button></div>' +
    '<div class="ac-btns" style="margin-top:14px"><button type="button" class="btn danger" data-ac="signout">' + (A.guest ? 'Reset guest link' : 'Sign out') + '</button></div></div>';
}
function render(tab) {
  const A = AM(); if (!A) return; if (tab) TAB = tab;
  const html = (A.user && !(A.guest && TAB === 'up' && false)) && !(A.guest && (TAB === 'in' || TAB === 'up') && !A.__showProfile) ? profileHTML(A) : signedOutHTML();
  const mb = $1('#modalBody'); if (mb && !$1('#modal').hidden && mb.__ac) mb.innerHTML = html; else open2(html);
}
function open2(html) {
  openModal(html, 'ACCOUNT'); const mb = $1('#modalBody'); mb.__ac = 1;
  if (!mb.__acL) { mb.__acL = 1; mb.addEventListener('click', onClick); mb.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const b = $1(TAB === 'up' ? '[data-ac=register]' : '[data-ac=login]', mb); if (b && !AM().user) b.click(); } }); }
  const first = $1('input', mb); if (first && !AM().user) setTimeout(() => first.focus(), 60);
}
function done(okMsg) { return r => { WAIT = false; if (r && r.err) { MSG = r.err; OK = false; if (window.sfx) sfx('bad'); } else { MSG = okMsg || ''; OK = true; if (window.sfx) sfx('ok'); } render(); }; }
function onClick(e) {
  const b = e.target.closest('[data-ac]'); if (!b) return; const a = b.dataset.ac, A = AM(); MSG = '';
  if (a === 'tab') { TAB = b.dataset.t; A.__showProfile = false; return render(); }
  if (a === 'google') { WAIT = true; return A.google(r => { A.__showProfile = true; done('Signed in with Google.')(r); }); }
  if (a === 'login') { WAIT = true; render(); return A.login(val('acId'), val('acPw'), r => { A.__showProfile = true; done('Welcome back.')(r); }); }
  if (a === 'register') { WAIT = true; render(); return A.register(val('acUn'), val('acPw'), r => { A.__showProfile = true; done('Account created. Check your inbox to verify your email.')(r); }, val('acEm')); }
  if (a === 'guest') { A.guestMode(() => { closeModal(); }); return; }
  if (a === 'reset') return A.resetPassword(val('acId'), done('Reset link sent. Check your inbox.'));
  if (a === 'rename') return A.changeUsername(val('acNew'), val('acPw2'), done('Username updated.'));
  if (a === 'addmail') return A.addEmail(val('acEm'), val('acPw'), done('Verification email sent. Open the link, then press "I verified it".'));
  if (a === 'verify') return A.sendVerify(done('Verification link sent.'));
  if (a === 'refresh') return A.refreshUser(r => { done(A.verified ? 'Email verified. DMs unlocked.' : 'Not verified yet. Open the link in your inbox first.')(r); if (!A.verified && !(r && r.err)) { MSG = 'Not verified yet. Open the link in your inbox first.'; OK = false; render(); } });
  if (a === 'avatar') { closeModal(); return setTimeout(() => CodexAvatar.edit(), 60); }
  if (a === 'signout') { A.__showProfile = false; A.logout(); closeModal(); return; }
  if (a === 'go') { const g = b.dataset.g; closeModal(); setTimeout(() => { if (g === 'badges') { const x = $1('#badgeBtn'); if (x) x.click(); } else if (g === 'settings') { const x = $1('#byokBtn'); if (x) x.click(); } else if (window.CodexGuide) CodexGuide.open(); }, 60); }
}
function syncBtn() {
  const A = AM(), btn = $1('#authBtn'); if (!btn || !A) return;
  let av = $1('.v7-me-av', btn); if (!av) { btn.insertAdjacentHTML('afterbegin', '<span class="v7-me-av"></span>'); av = $1('.v7-me-av', btn); }
  const name = A.name || 'operator'; av.innerHTML = CodexAvatar.el(CodexAvatar.mine() || CodexAvatar.forName(name), 28, 'sq');
  btn.classList.add('v7-has-av');
}
function init() {
  const A = AM(); if (!A) return;
  A.openModal = function () { A.__showProfile = !!A.user; TAB = 'in'; MSG = ''; const mb = $1('#modalBody'); if (mb) mb.__ac = 0; render(); };
  syncBtn(); document.addEventListener('cx:avatar', syncBtn);
  let last = ''; setInterval(() => { const k = (A.uid || '') + '|' + (A.name || ''); if (k !== last) { last = k; syncBtn(); } }, 1500);
}
document.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { if (window.console) console.error('[account]', e); } });
window.CodexAccount = { open: function (t) { const A = AM(); if (!A) return; A.__showProfile = !!A.user; if (t === 'email') MSG = 'Add or verify an email to unlock direct messages.'; const mb = $1('#modalBody'); if (mb) mb.__ac = 0; render(t === 'up' ? 'up' : 'in'); } };
})();
