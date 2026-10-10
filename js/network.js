/* ==========================================================================
   THE POLYMATH CODEX — network.js
   Multiplayer · social · academic productivity layer. Zero-build, retro-safe.

   MODULE MAP
   ──────────────────────────────────────────────────────────────────────────
   QuotaGuard        Firebase Spark armor: 1.5s-typing-debounce note sync,
                     10s hard sync interval, 15s presence heartbeat throttle,
                     250-message chat caps, 7d message expiry sweep, and a
                     self-imposed daily write budget (19k < 20k Spark limit).
   AuthManager       Pure username/password ⇄ synthetic email auth, guest
                     (anonymous) mode, cloud profile sync to players/{uid}.
   NotebookManager   Scratchpad + 4-digit group rooms, academic toolbar,
                     live metrics, KaTeX preview, .md export, rich-HTML
                     clipboard copy (Google Docs / Word paste-ready).
   LoungeEngine      2D pixel-art observation deck canvas, click-to-walk,
                     presence-synced astronaut sprites + nameplates.
   ChatEngine        #global · #essay-group · #study-rooms · #direct-messages
                     channels, 1s rate limiter, 7d ring-buffer.
   AdminManager      'admin' / 'lucinexon' moderation: golden badges, message
                     purge, global broadcast banner, system audit counts.
   NetworkEngine     Public facade consumed by engine.js (onScreen / onStateSave).

   FIRESTORE CONTRACT (suggested security rules — paste in console):
   ──────────────────────────────────────────────────────────────────────────
  rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if request is from sysop
    function isAdmin() {
      return request.auth != null && request.auth.uid in [
        'YOUR_ADMIN_FIREBASE_UID_HERE'
      ];
    }

    match /players/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid || isAdmin();
    }
    match /group_notes/{code} {
      allow read, write: if request.auth != null;
    }
    match /lobby_presence/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /chat_global/{id} {
      allow read, create: if request.auth != null;
      allow delete: if isAdmin();
    }
    match /chat_essay/{id} {
      allow read, create: if request.auth != null;
      allow delete: if isAdmin();
    }
    // Room / topic / DM chats live in per-channel collections named
    // chat_essay_<code>, chat_study_<topic>, chat_dm_<uidA>_<uidB>.
    // Firestore rules cannot wildcard PART of a collection name, so match
    // any top-level collection and filter on its prefix instead.
    match /{col}/{id} {
      allow read, create: if request.auth != null && col.matches('chat_(essay|study|dm)_.*');
      allow delete: if isAdmin() && col.matches('chat_(essay|study|dm)_.*');
    }
    match /broadcasts/latest {
      allow read: if request.auth != null;
      allow write: if isAdmin(); // ONLY admin can send broadcasts
    }
    match /meta/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}

   OFFLINE CONTRACT — if FIREBASE_CONFIG is still the placeholder, or the
   Firebase CDN is unreachable, this layer degrades to OFFLINE MODE: every
   sector, quiz, flashcard, minigame, BYOK lab and the personal scratchpad
   keep working exactly as before. network.js NEVER throws into engine.js
   (all engine→network calls are also try/catch-wrapped on the engine side).
   ========================================================================== */
'use strict';

(function () {

/* ========================= [0] CONFIG ========================= */
/* >>> Paste your Firebase web app config here (Project settings → Your apps).
       Until then the codex runs in OFFLINE MODE with zero breakage. <<< */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC7hH65hJLyxM6ULL36Ub8I5bi_W0ZdXp4',
  authDomain: 'pmc-web-app-project.firebaseapp.com',
  projectId: 'pmc-web-app-project',
  storageBucket: 'pmc-web-app-project.firebasestorage.app',
  messagingSenderId: '335161156704',
  appId: '1:335161156704:web:db783a2d74969830fb8f05'
};

const CFG_OK = (function () {
  try {
    const k = String(FIREBASE_CONFIG.apiKey || '');
    return k.length > 0 && k.indexOf('YOUR_') !== 0 && k.indexOf('PASTE') !== 0 &&
      k.indexOf('XXXX') !== 0 && String(FIREBASE_CONFIG.projectId || '').indexOf('YOUR_') !== 0;
  } catch (e) { return false; }
})();

const ADMIN_UIDS = ['h3tpYLgtCDdiWzoSfUPkih2r3wa2'];           // hardcoded operators
const LS = {
  nb: 'polymath_codex_nb_v1',          // personal scratchpad text
  quota: 'polymath_codex_quota_v1',    // daily write budget ledger
  banner: 'polymath_codex_banner_v1',  // last dismissed broadcast ts
  nbroom: 'polymath_codex_nbroom_v1',  // last joined notebook room
  vault: 'polymath_codex_vault_v1',    // notebook vault (all local notes)
  nbview: 'polymath_codex_nbview_v1'   // edit | split | read
};
const DAY_MS = 86400000;

let FB_READY = false, DB = null, AUTH = null;
const UN = {};   // unsubscribe registry: name → fn

/* ---- local helpers (engine.js evaluates AFTER this file; engine globals
        are referenced lazily inside call-time function bodies only) ---- */
function q(s, r) { return (r || document).querySelector(s); }
function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function p2(n) { return (n < 10 ? '0' + n : '' + n); }
function fmtTime(ts) { const d = new Date(ts); return p2(d.getHours()) + ':' + p2(d.getMinutes()); }
function dayKey() { const d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
function uid4() { return Math.random().toString(16).slice(2, 6); }
function say(msg, icon, ms) { if (typeof window.toast === 'function') window.toast(msg, icon, ms); }
function blip(name) { if (typeof window.sfx === 'function') window.sfx(name); }
function paint(root) { if (typeof window.drawSprites === 'function') window.drawSprites(root); }
function fbOK() { return !!(FB_READY && DB && AUTH); }
function engS() { return (typeof S !== 'undefined') ? S : null; }

function fbInit() {
  if (!CFG_OK || typeof window.firebase === 'undefined' || !window.firebase.initializeApp) return false;
  try {
    if (!window.firebase.apps || !window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
    DB = window.firebase.firestore();
    AUTH = window.firebase.auth();
    try { AUTH.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}
    try { DB.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) { /* optional */ }
    FB_READY = true;
    return true;
  } catch (e) { FB_READY = false; DB = null; AUTH = null; return false; }
}

/* ========================= [1] QUOTA GUARD =========================
   Firebase Spark: ~20k writes/day. The guard keeps a local daily ledger
   and refuses NON-ESSENTIAL writes past a 19k safety margin, plus exposes
   the debounce / heartbeat primitives the feature modules call. */
const QuotaGuard = {
  BUDGET: 19000,
  ledger: { d: '', w: 0 },
  exhaustedNotice: 0,
  load: function () {
    try {
      const raw = localStorage.getItem(LS.quota);
      if (raw) { const p = JSON.parse(raw); if (p && p.d) this.ledger = p; }
    } catch (e) {}
    if (this.ledger.d !== dayKey()) { this.ledger = { d: dayKey(), w: 0 }; this.persist(); }
  },
  persist: function () { try { localStorage.setItem(LS.quota, JSON.stringify(this.ledger)); } catch (e) {} },
  canWrite: function () {
    if (this.ledger.d !== dayKey()) { this.ledger = { d: dayKey(), w: 0 }; this.persist(); }
    return this.ledger.w < this.BUDGET;
  },
  charge: function (n) { this.ledger.w += (n || 1); this.persist(); },
  left: function () { return Math.max(0, this.BUDGET - this.ledger.w); },
  notifyExhausted: function () {
    const now = Date.now();
    if (now - this.exhaustedNotice < 600000) return;
    this.exhaustedNotice = now;
    say('<b>QUOTA ARMOR ENGAGED</b><br>Daily cloud write budget spent — live features continue locally and resume at 00:00.', 'shield', 5200);
  }
};

/* Every Firestore WRITE funnels through here. Returns Promise<boolean>. */
function guardedWrite(label, fn) {
  if (!fbOK()) return Promise.resolve(false);
  if (!QuotaGuard.canWrite()) { QuotaGuard.notifyExhausted(); return Promise.resolve(false); }
  QuotaGuard.charge();
  try {
    return Promise.resolve().then(fn).then(function (r) { return true; })
      .catch(function (err) { if (window.console) console.warn('[codex-net] write failed:', label, err && err.code || err); return false; });
  } catch (e) { return Promise.resolve(false); }
}

/* ---- Typing debounce + 10-second hard interval (group notes) ---- */
const NoteSync = {
  dirty: false,
  debounceT: null,
  intervalT: null,
  DEBOUNCE_MS: 1500,
  INTERVAL_MS: 10000,
  tap: function () {                       // called on every editor keystroke
    this.dirty = true;
    NotebookManager.setSync('buffering');
    clearTimeout(this.debounceT);
    this.debounceT = setTimeout(function () { NoteSync.flush(); }, this.DEBOUNCE_MS);
    if (!this.intervalT) this.intervalT = setInterval(function () {
      if (NoteSync.dirty) NoteSync.flush();
    }, this.INTERVAL_MS);
  },
  flush: function () {
    clearTimeout(this.debounceT);
    if (!this.dirty) return;
    this.dirty = false;
    NotebookManager.flushRoom();
  },
  stop: function () {
    clearTimeout(this.debounceT);
    clearInterval(this.intervalT);
    this.intervalT = null;
    if (this.dirty) { this.dirty = false; NotebookManager.flushRoom(); }
  }
};

/* ---- 10-second presence heartbeat ---- */
const Presence = {
  last: 0,
  MIN_MS: 10000,
  due: function (force) { return force || (Date.now() - this.last) >= this.MIN_MS; },
  mark: function () { this.last = Date.now(); }
};

/* ========================= [2] AUTH MANAGER =========================
   Pure username/password: the handle maps to a synthetic internal address
   (username.toLowerCase().replace(/[^a-z0-9]/g,'') + '@codex.local') so
   Firebase Email/Password auth runs with ZERO email friction and zero
   OAuth popups. Anonymous Firebase auth powers CONTINUE AS GUEST. */
const AuthManager = {
  user: null, uid: null, name: null,
  guest: true, admin: false, busy: false,
  authResolved: false, lastPush: 0, pushPending: false, PUSH_MIN_MS: 30000,

  emailOf: function (username) {
    return String(username).toLowerCase().replace(/[^a-z0-9]/g, '') + '@codex.local';
  },
  validName: function (u) { return /^[A-Za-z0-9_]{3,18}$/.test(String(u || '')); },

  init: function () {
    if (!fbOK()) return;
    const self = this;
    AUTH.onAuthStateChanged(function (user) { self.onAuth(user); });
  },

  onAuth: function (user) {
    this.authResolved = true; // <-- Mark that Firebase has finished checking storage
    if (!user && this.pendingWhy) {            // a feature asked for a link before auth resolved — retry now
      const w = this.pendingWhy, me = this; this.pendingWhy = null;
      setTimeout(function () { me.ensureAuth(w === true ? undefined : w); }, 0);
    }
    const prevUid = this.uid;
    this.user = user || null;
    this.uid = user ? user.uid : null;
    this.guest = !user || user.isAnonymous;

    // Guaranteed username recovery: if displayName is missing, pull handle from the email!
    if (user && !user.isAnonymous) {
      this.name = user.displayName || (user.email ? user.email.split('@')[0] : 'OPERATOR');
    } else if (user && user.isAnonymous) {
      this.name = 'GUEST-' + String(user.uid).slice(0, 4).toUpperCase();
    } else {
      this.name = null;
    }

    this.admin = !!(user && !user.isAnonymous && ADMIN_UIDS.indexOf(user.uid) >= 0);
    this.updateUI();
    AdminManager.apply();
    if (this.user) {
      if (!this.guest) this.ensureProfile();
      if (prevUid !== this.uid) {
        LoungeEngine.identityChanged();
        ChatEngine.identityChanged();
      NotebookManager.identityChanged();
      }
    } else {
      LoungeEngine.identityChanged();
      ChatEngine.identityChanged();
      NotebookManager.identityChanged();
    }
  },

  ensureAuth: function (why) {
    /* Wait until Firebase has finished restoring any existing session. */
    if (!this.authResolved) { this.pendingWhy = why || true; return; }
    if (!fbOK() || this.user || this.busy) return;

    const self = this;
    this.busy = true;

    AUTH.signInAnonymously()
      .then(function () {
        self.busy = false;
        say(
          '<b>GUEST LINK ESTABLISHED</b><br>' +
          (why || 'Live deck access granted — register anytime from ACCOUNT.'),
          'power',
          3600
        );
      })
      .catch(function () {
        self.busy = false;
      });
  },

  register: function (uname, pass, done) {
    if (!fbOK()) { done({ err: 'OFFLINE — Firebase link not configured on this deployment.' }); return; }
    if (!this.validName(uname)) { done({ err: 'USERNAME: 3–18 chars, letters / digits / underscore.' }); return; }
    if (!pass || String(pass).length < 6) { done({ err: 'PASSWORD: minimum 6 characters.' }); return; }
    const self = this;
    AUTH.createUserWithEmailAndPassword(this.emailOf(uname), String(pass)).then(function (cred) {
      const u = cred.user;
      return u.updateProfile({ displayName: uname }).then(function () {
        return guardedWrite('register', function () {
          const seed = self.snapshot();
          return DB.collection('players').doc(u.uid).set(seed, { merge: true }).then(function () {
            return DB.runTransaction(function (tx) {
              const ref = DB.collection('meta').doc('player_count');
              return tx.get(ref).then(function (doc) {
                const n = (doc.exists && doc.data().n) ? doc.data().n : 0;
                return tx.set(ref, { n: n + 1, ts: Date.now() });
              });
            });
          });
        });
      }).then(function () {
        blip('level');
        say('<b>OPERATOR REGISTERED</b><br>Welcome, ' + esc(uname) + ' — cloud profile online.', 'coin', 4200);
        done({ ok: true });
      });
    }).catch(function (err) { done({ err: authErr(err) }); });
  },

  login: function (uname, pass, done) {
    if (!fbOK()) { done({ err: 'OFFLINE — Firebase link not configured on this deployment.' }); return; }
    if (!this.validName(uname)) { done({ err: 'USERNAME: 3–18 chars, letters / digits / underscore.' }); return; }
    AUTH.signInWithEmailAndPassword(this.emailOf(uname), String(pass))
      .then(function () { blip('ok'); say('<b>LINK RESTORED</b><br>Cloud profile hydrated from the orbital archive.', 'coin', 3800); done({ ok: true }); })
      .catch(function (err) { done({ err: authErr(err) }); });
  },

  guestMode: function (done) {
    if (!fbOK()) { done({ err: 'OFFLINE — Firebase link not configured on this deployment.' }); return; }
    if (this.user) { done({ ok: true }); return; }
    const self = this;
    AUTH.signInAnonymously().then(function () { done({ ok: true }); })
      .catch(function (err) { done({ err: authErr(err) }); });
  },

  logout: function () {
    if (!fbOK()) return;
    NoteSync.stop();
    const self = this;
    AUTH.signOut().then(function () {
      say('Link severed — guest mode. Local progress is untouched.', 'power', 3200);
      self.updateUI();
    }).catch(function () {});
  },

  /* ---- cloud profile (players/{uid}) ---- */
  snapshot: function () {
    const st = engS() || {};
    const inv = (window.SystemsEngine && window.SystemsEngine.InventoryEngine)
      ? window.SystemsEngine.InventoryEngine.bag() : [];
    const inventory = {};
    inv.forEach(function (it) { inventory[it.key] = it.count; });
    let level = 1;
    if (typeof window.levelOf === 'function' && typeof st.xp === 'number') level = window.levelOf(st.xp) + 1;
    return {
      name: this.name || 'OPERATOR', guest: this.guest, admin: this.admin,
      xp: st.xp || 0, level: level, streak: st.streak || 0, bestStreak: st.bestStreak || 0,
      known: (st.known || []).slice(0, 2000), badges: (st.badges || []).slice(),
      quizBest: st.quizBest || {}, companion: st.companion || null,
      inventory: inventory, lastSeen: Date.now(), ts: Date.now()
    };
  },
  ensureProfile: function () {
    if (!fbOK() || !this.uid || this.guest) return;
    const self = this;
    DB.collection('players').doc(this.uid).get().then(function (doc) {
      if (doc.exists) { self.hydrate(doc.data() || {}); }
      else {
        guardedWrite('seed-profile', function () {
          return DB.collection('players').doc(self.uid).set(self.snapshot(), { merge: true });
        });
      }
    }).catch(function () {});
  },
  hydrate: function (d) {
    const st = engS();
    if (!st) return;
    let changed = false;
    if (typeof d.xp === 'number' && d.xp > (st.xp || 0)) { st.xp = d.xp; changed = true; }
    if (typeof d.bestStreak === 'number' && d.bestStreak > (st.bestStreak || 0)) { st.bestStreak = d.bestStreak; changed = true; }
    if (Array.isArray(d.known)) d.known.forEach(function (k) { if (st.known.indexOf(k) < 0) { st.known.push(k); changed = true; } });
    if (Array.isArray(d.badges)) d.badges.forEach(function (b) { if (st.badges.indexOf(b) < 0) { st.badges.push(b); changed = true; } });
    if (d.quizBest && typeof d.quizBest === 'object') {
      Object.keys(d.quizBest).forEach(function (k) {
        const remote = d.quizBest[k];
        if (remote != null && !(st.quizBest[k] != null && st.quizBest[k] >= remote)) { st.quizBest[k] = remote; changed = true; }
      });
    }
    if (d.inventory && window.SystemsEngine && window.SystemsEngine.InventoryEngine) {
      const inv = window.SystemsEngine.InventoryEngine;
      Object.keys(d.inventory).forEach(function (k) {
        const want = d.inventory[k] | 0, have = inv.count(k);
        if (want > have) { inv.grant(k, want - have); changed = true; }
      });
    }
    if (d.companion && !st.companion) { st.companion = d.companion; changed = true; }
    if (changed) {
      if (typeof save === 'function') save();
      if (typeof updateHUD === 'function') updateHUD();
      say('<b>CLOUD PROFILE HYDRATED</b><br>XP, badges, mastery and inventory merged from the archive.', 'coin', 4000);
    }
    this.updateUI();
  },
  pushProfile: function (force) {
    if (!fbOK() || !this.uid || this.guest) return;
    const now = Date.now();
    if (!force && now - this.lastPush < this.PUSH_MIN_MS) { this.pushPending = true; return; }
    this.lastPush = now; this.pushPending = false;
    const snap = this.snapshot();
    guardedWrite('profile', function () {
      return DB.collection('players').doc(snap.uid || AuthManager.uid).set(snap, { merge: true });
    });
  },
  onStateSave: function () {                       // engine.js save() hook
    if (this.user && !this.guest) {
      if (this.pushPending || Date.now() - this.lastPush >= this.PUSH_MIN_MS) this.pushProfile(true);
      else this.pushPending = true;
    }
  },
  updateUI: function () {
    const btn = q('#authBtn'), tx = q('#authBtnTx');
    if (!fbOK()) { if (btn) { btn.classList.add('offline'); btn.classList.remove('signed'); } if (tx) tx.textContent = 'ACCOUNT'; }
    else if (this.user) {
      if (btn) { btn.classList.add('signed'); btn.classList.remove('offline'); }
      if (tx) tx.textContent = this.guest ? 'GUEST' : (String(this.name || 'OP').slice(0, 10).toUpperCase() + (String(this.name || '').length > 10 ? '…' : ''));
    } else { if (btn) btn.classList.remove('signed', 'offline'); if (tx) tx.textContent = 'ACCOUNT'; }
    /* profile card */
    const pw = q('#authProfileWrap'), lw = q('#authLoginWrap');
    if (pw && lw) {
      const signed = !!(this.user && !this.guest);
      pw.hidden = !signed; lw.hidden = signed;
      if (signed) {
        const st = engS() || {};
        q('#apName').textContent = this.name || 'OPERATOR';
        let rank = 'LV 1 · NOVICE CHRONICLER';
        const LV = window.LEVELS || (typeof LEVELS !== 'undefined' ? LEVELS : null);
        if (typeof window.levelOf === 'function' && LV) {
          const lv = window.levelOf(st.xp || 0);
          rank = 'LV ' + (lv + 1) + ' · ' + LV[lv].t;
        }
        q('#apRank').textContent = rank + (this.admin ? ' · ★ SYSOP' : '');
        q('#apAvatar').textContent = String(this.name || '?').charAt(0).toUpperCase();
        q('#apXp').textContent = st.xp || 0;
        q('#apBadges').textContent = (st.badges || []).length;
        q('#apCards').textContent = (st.known || []).length;
        q('#apSyncTx').textContent = 'CLOUD PROFILE: SYNCED · WRITES TODAY: ' + QuotaGuard.ledger.w + '/' + QuotaGuard.BUDGET;
      }
    }
  },
  openModal: function () {
    const m = q('#authModal');
    if (!m) return;
    m.hidden = false;
    document.body.classList.add('modal-open');
    this.updateUI();
    const inp = q('#authUser');
    if (inp && !this.user) setTimeout(function () { inp.focus(); }, 40);
  },
  closeModal: function () {
    const m = q('#authModal');
    if (m) m.hidden = true;
    if (q('#modal') && q('#modal').hidden) document.body.classList.remove('modal-open');
  }
};

function authErr(err) {
  const code = (err && err.code) || '';
  if (code.indexOf('email-already-in-use') >= 0) return 'USERNAME ALREADY REGISTERED — try LOGIN instead.';
  if (code.indexOf('invalid-email') >= 0) return 'USERNAME EMPTY — handles need at least one letter or digit.';
  if (code.indexOf('weak-password') >= 0) return 'PASSWORD TOO WEAK — 6 characters minimum.';
  if (code.indexOf('user-not-found') >= 0 || code.indexOf('wrong-password') >= 0 || code.indexOf('invalid-credential') >= 0) return 'ACCESS DENIED — unknown username or wrong password.';
  if (code.indexOf('too-many-requests') >= 0) return 'THROTTLED — too many attempts, wait a moment.';
  if (code.indexOf('network') >= 0) return 'NETWORK UNREACHABLE — check the uplink.';
  if (code.indexOf('operation-not-allowed') >= 0) return 'FIREBASE CONFIG — enable Email/Password + Anonymous providers in the console.';
  return 'LINK ERROR — ' + (code || 'unknown fault');
}

/* ========================= [3] NOTEBOOK MANAGER =========================
   Obsidian-style vault. A quiet markdown editor with a notes list, [[wikilinks]]
   + backlinks, a "/" insert menu, a Ctrl/Cmd+P palette and Edit / Split /
   Reading views. Notes live on this device (localStorage). A shared room is just
   another document: it syncs through group_notes/{code} behind the QuotaGuard
   debounce (1.5 s typing pause OR 10 s hard interval — never per keystroke) and
   never touches your local notes. Leaving a room keeps a copy as a normal note. */
const NB_WELCOME = [
  '# Welcome to your vault', '',
  'Quiet notes, kept on this device.', '',
  '- Type `/` for the insert menu: headings, tables, math, code, citations',
  '- Type `[[` to link another note — links show up as backlinks',
  '- **Ctrl/Cmd + E** flips between editing and reading; **Ctrl/Cmd + P** opens the palette',
  '- Tick tasks while reading:',
  '  - [ ] Try the slash menu',
  '  - [x] Open the Welcome note', '',
  'Math works too: $E = mc^2$', ''
].join('\n');

const NB_SLASH = [
  { label: 'Heading 1', hint: '#', icon: 'doc', w: 'h1 title heading', ins: '# ' },
  { label: 'Heading 2', hint: '##', icon: 'doc', w: 'h2 heading', ins: '## ' },
  { label: 'Heading 3', hint: '###', icon: 'doc', w: 'h3 heading', ins: '### ' },
  { label: 'Bulleted list', hint: '-', icon: 'doc', w: 'bullet list ul', ins: '- ' },
  { label: 'Numbered list', hint: '1.', icon: 'doc', w: 'number ordered list ol', ins: '1. ' },
  { label: 'Task list', hint: '[ ]', icon: 'check', w: 'task todo checkbox', ins: '- [ ] ' },
  { label: 'Quote', hint: '>', icon: 'speech', w: 'quote blockquote', ins: '> ' },
  { label: 'Code block', hint: '~~~', icon: 'cpu', w: 'code fence snippet', ins: '~~~\n\n~~~', caret: 4 },
  { label: 'Table', hint: '3×3', icon: 'chart', w: 'table grid', ins: '| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| — | — | — |\n| — | — | — |\n', caret: 2 },
  { label: 'Math block', hint: '$$', icon: 'atom', w: 'math latex equation formula', ins: '$$\n\n$$', caret: 3 },
  { label: 'Inline math', hint: '$', icon: 'atom', w: 'inline math latex', ins: '$$', caret: 1 },
  { label: 'Citation / footnote', hint: '[^1]', icon: 'book', w: 'cite citation footnote reference', special: 'cite' },
  { label: 'Link to note', hint: '[[', icon: 'link', w: 'link wiki note', ins: '[[]]', caret: 2 },
  { label: 'Divider', hint: '---', icon: 'doc', w: 'divider rule hr line', ins: '---\n' }
];

const NotebookManager = {
  vault: { v: 1, active: null, notes: [] },
  doc: 'note',                 // 'note' | 'room'  (what the editor is showing)
  room: null, roomMd: '', roomUnsub: null, pendingRoom: null,
  view: 'edit', lastEdit: 'edit', filter: '', armed: null,
  active: false, dirtyLocal: false,
  previewT: null, saveT: null, renameT: null, armedT: null, remoteNoticeT: 0,
  menu: { open: false, items: [], sel: 0 }, pal: { items: [], sel: 0 },
  COLLAB_FRESH_MS: 150000,

  editor: function () { return q('#nbEditor'); },

  /* ------------------------------ boot ------------------------------ */
  init: function () {
    if (!this.editor()) return;
    this.loadVault();
    try { const v = localStorage.getItem(LS.nbview); if (v === 'edit' || v === 'split' || v === 'read') this.view = v; } catch (e) {}
    if (this.view !== 'read') this.lastEdit = this.view;
    this.bind();
    const sh = q('#nbShell'); if (sh) sh.dataset.side = window.innerWidth > 900 ? '1' : '0';
    this.setView(this.view, true);
    this.showDoc();
    this.renderRoom();
    try {
      const last = localStorage.getItem(LS.nbroom);
      if (last && /^\d{4}$/.test(last)) { q('#nbRoomInput').value = last; this.attachRoom(last, false, true); }
    } catch (e) {}
  },

  /* ------------------------------ vault ------------------------------ */
  mk: function (title, md) { return { id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: title, md: md || '', ts: Date.now() }; },
  loadVault: function () {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(LS.vault) || 'null'); } catch (e) {}
    if (raw && Array.isArray(raw.notes) && raw.notes.length) { this.vault = raw; }
    else {
      let legacy = '';
      try { legacy = localStorage.getItem(LS.nb) || ''; } catch (e) {}      // migrate the old single scratchpad
      const notes = [];
      if (legacy.trim()) notes.push(this.mk('Scratchpad', legacy));
      notes.push(this.mk('Welcome', NB_WELCOME));
      this.vault = { v: 1, active: notes[0].id, notes: notes };
      this.persist();
    }
    if (!this.cur()) this.vault.active = this.vault.notes[0].id;
  },
  persist: function () { try { localStorage.setItem(LS.vault, JSON.stringify(this.vault)); } catch (e) {} },
  saveScratch: function () { this.persist(); },                         // legacy name used by the boot facade
  saveSoon: function () { const s = this; clearTimeout(this.saveT); this.saveT = setTimeout(function () { s.persist(); }, 400); },
  cur: function () { const id = this.vault.active; return this.vault.notes.filter(function (n) { return n.id === id; })[0] || null; },
  findByTitle: function (t) { t = String(t || '').trim().toLowerCase(); return this.vault.notes.filter(function (n) { return n.title.toLowerCase() === t; })[0] || null; },
  uniqueTitle: function (base, exceptId) {
    base = String(base || '').replace(/[\\\/:*?"<>|\[\]#^]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Untitled';
    const taken = function (x) { return NotebookManager.vault.notes.some(function (n) { return n.id !== exceptId && n.title.toLowerCase() === x.toLowerCase(); }); };
    let t = base, i = 2;
    while (taken(t)) t = base + ' ' + (i++);
    return t;
  },
  newNote: function (title) {
    this.persist();
    const n = this.mk(this.uniqueTitle(title || 'Untitled'), '');
    this.vault.notes.push(n); this.vault.active = n.id; this.doc = 'note';
    if (this.view === 'read') this.setView(this.lastEdit || 'edit');
    this.persist(); this.showDoc(); this.closeSideOnMobile();
    const t = q('#nbTitle'), ed = this.editor();
    if (title) { if (ed) ed.focus(); } else if (t) { t.focus(); t.select(); }
    return n;
  },
  openNote: function (id) {
    if (!this.vault.notes.some(function (n) { return n.id === id; })) return;
    this.persist(); this.vault.active = id; this.doc = 'note'; this.persist();
    this.showDoc(); this.closeSideOnMobile();
  },
  deleteNote: function (id) {
    const v = this.vault;
    v.notes = v.notes.filter(function (n) { return n.id !== id; });
    if (!v.notes.length) v.notes.push(this.mk('Untitled', ''));
    if (v.active === id || !this.cur()) v.active = v.notes.slice().sort(function (a, b) { return b.ts - a.ts; })[0].id;
    this.armed = null; this.persist(); this.showDoc(); blip('flip');
  },
  armDelete: function (id) {
    const s = this; this.armed = id; this.renderList();
    clearTimeout(this.armedT); this.armedT = setTimeout(function () { s.armed = null; s.renderList(); }, 2600);
  },
  rename: function (raw) {
    const n = this.cur(); if (!n || this.doc !== 'note') return;
    const old = n.title, next = this.uniqueTitle(raw, n.id);
    if (next === old) return;
    n.title = next; n.ts = Date.now();
    const re = new RegExp('\\[\\[' + old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\||\\]\\])', 'gi');
    this.vault.notes.forEach(function (m) { if (m.md) m.md = m.md.replace(re, function (x, g) { return '[[' + next + g; }); });
    const ed = this.editor(); if (ed && ed.value !== n.md) ed.value = n.md;     // self-links
    this.persist(); this.renderList();
  },
  backlinks: function () {
    const n = this.cur(); if (!n || this.doc !== 'note') return [];
    const re = new RegExp('\\[\\[\\s*' + n.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*(\\||\\]\\])', 'i');
    return this.vault.notes.filter(function (m) { return m.id !== n.id && re.test(m.md); });
  },
  stripLinks: function (md) { return String(md).replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, function (m, a, b) { return (b || a).trim(); }); },
  wikify: function (md) {
    const self = this; let fence = false;
    return String(md).split('\n').map(function (ln) {
      if (/^\s*(~~~|```)/.test(ln)) { fence = !fence; return ln; }
      if (fence) return ln;
      return ln.replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, function (m, a, b) {
        const t = a.trim();
        return '<a class="wl' + (self.findByTitle(t) ? '' : ' new') + '" data-wl="' + esc(t) + '">' + esc((b || a).trim()) + '</a>';
      });
    }).join('\n');
  },

  /* ------------------------------ document display ------------------------------ */
  showDoc: function () {
    const ed = this.editor(), ti = q('#nbTitle');
    const isRoom = this.doc === 'room' && !!this.room;
    if (!isRoom) this.doc = 'note';
    const n = this.cur();
    ed.value = isRoom ? this.roomMd : (n ? n.md : '');
    ti.value = isRoom ? 'Room ' + this.room : (n ? n.title : '');
    ti.readOnly = isRoom;
    this.setSync(isRoom ? (fbOK() ? (NoteSync.dirty || this.dirtyLocal ? 'buffering' : 'saved') : 'offline') : 'local');
    this.metrics(); this.renderPreview(); this.renderList(); this.renderRoom(); this.backlinkChip(); this.menuHide();
    ed.scrollTop = 0;
  },
  showRoom: function () { this.persist(); this.doc = 'room'; this.showDoc(); this.closeSideOnMobile(); },
  onInput: function (ev) {
    const ed = this.editor(); if (!ed) return;
    if (ev && ev.data === '[') {                                       // auto-close [[ → [[]]
      const p = ed.selectionStart;
      if (ed.value.charAt(p - 2) === '[' && ed.value.slice(p, p + 2) !== ']]') { this.put(p, p, ']]', 0); return; }
    }
    const md = ed.value;
    if (this.doc === 'room') {
      this.roomMd = md; this.dirtyLocal = true;
      if (fbOK()) NoteSync.tap(); else this.setSync('offline');
    } else {
      const n = this.cur(); if (n) { n.md = md; n.ts = Date.now(); }
      this.setSync('local'); this.saveSoon();
    }
    this.metrics(); this.previewSoon(); this.backlinkChip();
    this.contextMenu();
  },
  metrics: function () {
    const ed = this.editor(), text = ed ? ed.value : '';
    const words = (text.trim().match(/\S+/g) || []).length;
    const w = q('#nbWords'), r = q('#nbRead');
    if (w) w.textContent = words + (words === 1 ? ' word' : ' words');
    if (r) r.textContent = words > 150 ? '· ~' + Math.max(1, Math.round(words / 200)) + ' min read' : '';
  },
  backlinkChip: function () {
    const b = q('#nbBack'); if (!b) return;
    const n = this.backlinks().length;
    b.hidden = !n; b.textContent = n + (n === 1 ? ' backlink' : ' backlinks');
  },
  setSync: function (state) {
    const wrap = q('#nbSync'), tx = q('#nbSyncTx'); if (!wrap || !tx) return;
    wrap.className = 'nbx-sync ' + state;
    tx.textContent = ({ local: 'Saved on this device', saved: 'Synced', buffering: 'Unsynced edits…', syncing: 'Syncing…', offline: 'Offline — rooms need Firebase' })[state] || '';
  },

  /* ------------------------------ views ------------------------------ */
  setView: function (v, boot) {
    if (v !== 'edit' && v !== 'split' && v !== 'read') v = 'edit';
    this.view = v; if (v !== 'read') this.lastEdit = v;
    try { localStorage.setItem(LS.nbview, v); } catch (e) {}
    const sh = q('#nbShell'); if (sh) sh.dataset.view = v;
    qa('[data-nbview]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.nbview === v)); });
    this.menuHide();
    if (v !== 'edit') this.renderPreview();
    if (!boot && v !== 'read') { const ed = this.editor(); if (ed && window.innerWidth > 900) ed.focus(); }
  },
  toggleRead: function () { this.setView(this.view === 'read' ? (this.lastEdit || 'edit') : 'read'); blip('flip'); },
  setSide: function (on) {
    const sh = q('#nbShell'); if (!sh) return;
    sh.dataset.side = on ? '1' : '0';
    const b = q('#nbSideBtn'); if (b) b.setAttribute('aria-expanded', String(!!on));
  },
  toggleSide: function () { const sh = q('#nbShell'); this.setSide(!(sh && sh.dataset.side === '1')); },
  closeSideOnMobile: function () { if (window.innerWidth <= 900) this.setSide(false); },
  previewSoon: function () { const s = this; clearTimeout(this.previewT); this.previewT = setTimeout(function () { s.renderPreview(); }, 140); },
  renderPreview: function () {
    const pv = q('#nbPreview'), ed = this.editor();
    if (!pv || !ed || this.view === 'edit') return;
    const md = ed.value || '';
    if (!md.trim()) { pv.innerHTML = '<p class="nbx-empty">Nothing here yet — switch to edit and start writing.</p>'; return; }
    pv.innerHTML = (typeof window.mdBlock === 'function') ? window.mdBlock(this.wikify(md)) : '<p>' + esc(md).replace(/\n/g, '<br>') + '</p>';
    qa('input[type="checkbox"]', pv).forEach(function (cb, i) { cb.disabled = false; cb.dataset.ti = i; });
    if (typeof window.typeset === 'function') window.typeset(pv);
  },
  toggleTask: function (idx) {
    const ed = this.editor(); if (!ed) return;
    let fence = false, n = -1;
    const lines = ed.value.split('\n').map(function (ln) {
      if (/^\s*(~~~|```)/.test(ln)) { fence = !fence; return ln; }
      if (fence) return ln;
      const m = /^(\s*(?:[-*+]|\d+\.)\s+\[)([ xX])(\]\s.*)$/.exec(ln);
      if (m && ++n === idx) return m[1] + (m[2] === ' ' ? 'x' : ' ') + m[3];
      return ln;
    });
    ed.value = lines.join('\n'); this.onInput();
  },
  follow: function (title) {
    const n = this.findByTitle(title);
    if (n) this.openNote(n.id); else this.newNote(title);
  },

  /* ------------------------------ editing helpers ------------------------------ */
  put: function (start, end, text, a, b) {
    const ed = this.editor(); if (!ed) return;
    ed.focus(); ed.setSelectionRange(start, end);
    let ok = false;
    try { ok = text === '' ? (start === end ? true : document.execCommand('delete')) : document.execCommand('insertText', false, text); } catch (e) {}   // execCommand keeps native undo working
    if (!ok) { ed.setRangeText(text, start, end, 'end'); this.onInput(); }
    const pa = a != null ? a : text.length;                                  // always land the caret deliberately
    ed.setSelectionRange(start + pa, start + (b != null ? b : pa));
    this.contextMenu();                                                      // e.g. re-open the [[ link menu after auto-closing
  },
  wrap: function (mark, placeholder) {
    const ed = this.editor(), s = ed.selectionStart, e = ed.selectionEnd, v = ed.value, m = mark.length, sel = v.slice(s, e);
    if (s >= m && v.slice(s - m, s) === mark && v.slice(e, e + m) === mark) { this.put(s - m, e + m, sel, 0, sel.length); return; }
    const body = sel || placeholder || '';
    this.put(s, e, mark + body + mark, m, m + body.length);
  },
  linkSel: function () {
    const ed = this.editor(), s = ed.selectionStart, e = ed.selectionEnd, sel = ed.value.slice(s, e) || 'text';
    this.put(s, e, '[' + sel + '](url)', sel.length + 3, sel.length + 6);
  },
  lineInfo: function () {
    const ed = this.editor(), p = ed.selectionStart, v = ed.value;
    const ls = p > 0 ? v.lastIndexOf('\n', p - 1) + 1 : 0;
    let le = v.indexOf('\n', p); if (le < 0) le = v.length;
    return { p: p, ls: ls, le: le, before: v.slice(ls, p), line: v.slice(ls, le) };
  },
  onKey: function (e) {
    if (e.isComposing) return;
    if (this.menu.open && this.menuKey(e)) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key;
    if (mod && !e.altKey) {
      const lk = k.toLowerCase();
      if (lk === 'b') { e.preventDefault(); this.wrap('**', 'bold'); return; }
      if (lk === 'i') { e.preventDefault(); this.wrap('*', 'italic'); return; }
      if (lk === 'k') { e.preventDefault(); this.linkSel(); return; }
    }
    const ed = this.editor();
    if (k === 'Tab' && !mod && ed.selectionStart === ed.selectionEnd) {         // only inside lists, so Tab never traps keyboard users
      const li = this.lineInfo();
      if (/^\s*([-*+]|\d+\.)\s/.test(li.line)) {
        e.preventDefault();
        if (e.shiftKey) { const m = /^( {1,2}|\t)/.exec(li.line); if (m) { this.put(li.ls, li.ls + m[0].length, ''); ed.setSelectionRange(Math.max(li.ls, li.p - m[0].length), Math.max(li.ls, li.p - m[0].length)); } }
        else { this.put(li.ls, li.ls, '  '); ed.setSelectionRange(li.p + 2, li.p + 2); }
        return;
      }
    }
    if (k === 'Enter' && !e.shiftKey && !mod && !e.altKey && ed.selectionStart === ed.selectionEnd) {
      const li = this.lineInfo();
      const m = /^(\s*)((?:[-*+]|\d+\.)\s\[[ xX]\]\s|[-*+]\s|\d+\.\s|>\s)(.*)$/.exec(li.line);
      if (m && li.before.length >= m[1].length + m[2].length) {
        e.preventDefault();
        if (!m[3].trim() && !ed.value.slice(li.p, li.le).trim()) {               // empty item: outdent, then clear
          if (m[1].length >= 2) this.put(li.ls, li.le, m[1].slice(2) + m[2]); else this.put(li.ls, li.le, '');
          return;
        }
        let mark = m[2];
        if (/^\d+\./.test(mark)) mark = (parseInt(mark, 10) + 1) + '. ';
        else if (/\[[ xX]\]/.test(mark)) mark = mark.replace(/\[[ xX]\]/, '[ ]');
        this.put(li.p, li.p, '\n' + m[1] + mark);
      }
    }
  },

  /* ------------------------------ pop-up menu: "/", "[[", ⋯, backlinks ------------------------------ */
  menuShow: function (items, at) {
    const ul = q('#nbMenu'); if (!ul) return;
    this.menu = { open: items.length > 0, items: items, sel: 0 };
    ul.hidden = !this.menu.open;
    if (!this.menu.open) return;
    this.fill(ul, items, 0);
    ul.style.left = Math.max(8, Math.min(at.x, window.innerWidth - 270)) + 'px';
    const h = ul.offsetHeight || 240;
    ul.style.top = (at.y + h > window.innerHeight - 8 ? Math.max(8, (at.up != null ? at.up : at.y) - h) : at.y) + 'px';
  },
  menuHide: function () { const ul = q('#nbMenu'); if (ul) ul.hidden = true; this.menu.open = false; },
  fill: function (ul, items, sel) {
    ul.innerHTML = items.map(function (it, i) {
      return '<li role="option" data-i="' + i + '"' + (i === sel ? ' class="on"' : '') + '><span data-sprite="' + (it.icon || 'doc') + '" data-px="15"></span><span class="l">' + esc(it.label) + '</span>' + (it.hint ? '<kbd>' + esc(it.hint) + '</kbd>' : '') + '</li>';
    }).join('');
    paint(ul);
  },
  mark: function (ul, sel) {
    qa('li', ul).forEach(function (li, i) { li.classList.toggle('on', i === sel); if (i === sel && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' }); });
  },
  menuKey: function (e) {
    const m = this.menu, k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); m.sel = (m.sel + (k === 'ArrowDown' ? 1 : m.items.length - 1)) % m.items.length; this.mark(q('#nbMenu'), m.sel); return true; }
    if (k === 'Enter' || k === 'Tab') { e.preventDefault(); this.menuPick(m.sel); return true; }
    if (k === 'Escape') { e.preventDefault(); this.menuHide(); return true; }
    return false;
  },
  menuPick: function (i) { const it = this.menu.items[i]; this.menuHide(); if (it && it.run) it.run(); },
  caretXY: function (ed) {
    const m = this._mirror || (this._mirror = document.createElement('div'));
    const cs = getComputedStyle(ed);
    ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'tabSize', 'wordSpacing'].forEach(function (p) { m.style[p] = cs[p]; });
    Object.assign(m.style, { position: 'fixed', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', top: '0', left: '-9999px', boxSizing: 'border-box', width: ed.clientWidth + 'px' });
    m.textContent = ed.value.slice(0, ed.selectionStart);
    const sp = document.createElement('span'); sp.textContent = '\u200b'; m.appendChild(sp);
    document.body.appendChild(m);
    const lh = parseFloat(cs.lineHeight) || 26, r = ed.getBoundingClientRect();
    const out = { x: r.left + sp.offsetLeft - ed.scrollLeft, y: r.top + sp.offsetTop - ed.scrollTop + lh, up: r.top + sp.offsetTop - ed.scrollTop };
    m.remove(); return out;
  },
  contextMenu: function () {
    const ed = this.editor();
    if (!ed || this.view === 'read' || ed.selectionStart !== ed.selectionEnd) { this.menuHide(); return; }
    const li = this.lineInfo(), p = li.p;
    let m = /\[\[([^\]\n]*)$/.exec(li.before);
    if (m) { this.linkMenu(m[1], p - m[1].length - 2, p); return; }
    m = /(?:^|\s)\/([a-z0-9 ]{0,16})$/i.exec(li.before);
    if (m) { this.slashMenu(m[1].toLowerCase(), p - m[1].length - 1, p); return; }
    this.menuHide();
  },
  slashMenu: function (qy, start, end) {
    const s = this, items = NB_SLASH.filter(function (it) { return !qy || (it.label + ' ' + it.w).toLowerCase().indexOf(qy) >= 0; }).map(function (it) {
      return { label: it.label, hint: it.hint, icon: it.icon, run: function () { s.slashRun(it, start, end); } };
    });
    this.menuShow(items.slice(0, 9), this.caretXY(this.editor()));
  },
  slashRun: function (it, start, end) {
    if (it.special === 'cite') {
      const v = this.editor().value; let n = 1;
      (v.match(/\[\^(\d+)\]/g) || []).forEach(function (x) { const k = parseInt(x.replace(/\D/g, ''), 10); if (k >= n) n = k + 1; });
      const tag = '[^' + n + ']';
      this.put(start, end, tag);
      const ed = this.editor(), len = ed.value.length, def = '\n\n' + tag + ': Source — author, "title", publication, year, page.';
      this.put(len, len, def);
      return;
    }
    this.put(start, end, it.ins, it.caret != null ? it.caret : it.ins.length);
  },
  linkMenu: function (qy, start, end) {
    const s = this, ed = this.editor(), f = qy.trim().toLowerCase(), cur = this.cur();
    const items = this.vault.notes.filter(function (n) { return (!cur || n.id !== cur.id || s.doc === 'room') && (!f || n.title.toLowerCase().indexOf(f) >= 0); })
      .sort(function (a, b) { return b.ts - a.ts; }).slice(0, 7)
      .map(function (n) { return { label: n.title, icon: 'doc', run: function () { s.linkRun(start, end, n.title); } }; });
    if (f && !this.findByTitle(qy.trim())) items.push({ label: 'Create “' + qy.trim() + '”', icon: 'plus', run: function () { s.linkRun(start, end, qy.trim()); } });
    this.menuShow(items, this.caretXY(ed));
  },
  linkRun: function (start, end, title) {
    const v = this.editor().value, close = v.slice(end, end + 2) === ']]' ? 2 : 0;
    const t = '[[' + title + ']]';
    this.put(start, end + close, t, t.length);
  },
  backlinkMenu: function () {
    const s = this, b = q('#nbBack'), r = b.getBoundingClientRect();
    this.menuShow(this.backlinks().map(function (n) { return { label: n.title, icon: 'link', run: function () { s.openNote(n.id); } }; }), { x: r.left, y: r.top - 4, up: r.top - 4 });
  },
  commands: function () {
    const s = this, inRoom = this.doc === 'room', c = [];
    c.push({ label: 'New note', hint: 'Alt+N', icon: 'plus', run: function () { s.newNote(); } });
    c.push({ label: this.view === 'read' ? 'Back to editing' : 'Reading view', hint: 'Ctrl+E', icon: 'book', run: function () { s.toggleRead(); } });
    c.push({ label: 'Split view', icon: 'columns', run: function () { s.setView('split'); } });
    c.push({ label: 'Show / hide notes list', icon: 'sidebar', run: function () { s.toggleSide(); } });
    c.push({ label: 'Export as Markdown', icon: 'doc', run: function () { s.exportMd(); } });
    c.push({ label: 'Copy formatted (Docs / Word)', icon: 'print', run: function () { s.copyFormatted(); } });
    if (inRoom) c.push({ label: 'Save a copy to my notes', icon: 'bag', run: function () { const n = s.saveRoomCopy(s.room, s.roomMd); if (n) { s.openNote(n.id); say('<b>COPY SAVED</b><br>“' + esc(n.title) + '” is in your notes.', 'doc', 2800); } } });
    else c.push({ label: 'Delete this note', icon: 'trash', run: function () { s.setSide(true); s.armDelete(s.vault.active); } });
    if (this.room) c.push({ label: 'Leave room ' + this.room, icon: 'cross', run: function () { s.leaveRoom(); } });
    else c.push({ label: 'Join a shared room…', icon: 'users', run: function () { s.setSide(true); const i = q('#nbRoomInput'); if (i) i.focus(); } });
    return c;
  },
  moreMenu: function () {
    const b = q('#nbMore'), r = b.getBoundingClientRect(), keep = { 'Export as Markdown': 1, 'Copy formatted (Docs / Word)': 1, 'Delete this note': 1, 'Save a copy to my notes': 1, 'Leave room': 1 };
    const items = this.commands().filter(function (c) { return keep[c.label] || /^Leave room/.test(c.label); });
    this.menuShow(items, { x: r.right - 250, y: r.bottom + 6, up: r.top - 4 });
  },

  /* ------------------------------ palette (Ctrl/Cmd+P) ------------------------------ */
  palOpen: function (prefill) {
    const pal = q('#nbPal'), inp = q('#nbPalIn'); if (!pal) return;
    this.menuHide(); pal.hidden = false; inp.value = prefill || ''; this.palRefresh(); inp.focus();
  },
  palClose: function () { const p = q('#nbPal'); if (p && !p.hidden) { p.hidden = true; const ed = this.editor(); if (ed && this.view !== 'read') ed.focus(); } },
  palRefresh: function () {
    const s = this, raw = q('#nbPalIn').value.trim(), f = raw.toLowerCase();
    const hit = function (t) {
      if (!f) return true; t = t.toLowerCase();
      if (t.indexOf(f) >= 0) return true;
      let i = 0; for (let k = 0; k < t.length && i < f.length; k++) if (t[k] === f[i]) i++;
      return i === f.length;
    };
    const items = [];
    if (this.room && hit('room ' + this.room)) items.push({ label: 'Room ' + this.room, icon: 'users', run: function () { s.showRoom(); } });
    this.vault.notes.slice().sort(function (a, b) { return b.ts - a.ts; }).forEach(function (n) {
      if (hit(n.title)) items.push({ label: n.title || 'Untitled', icon: 'doc', run: function () { s.openNote(n.id); } });
    });
    this.commands().forEach(function (c) { if (hit(c.label)) items.push(c); });
    if (raw && !this.findByTitle(raw)) items.push({ label: 'Create “' + raw + '”', icon: 'plus', run: function () { s.newNote(raw); } });
    this.pal = { items: items.slice(0, 14), sel: 0 };
    this.fill(q('#nbPalList'), this.pal.items, 0);
  },
  palPick: function (i) { const it = this.pal.items[i]; this.palClose(); if (it && it.run) it.run(); },

  /* ------------------------------ sidebar ------------------------------ */
  renderList: function () {
    const ul = q('#nbList'); if (!ul) return;
    const s = this, f = this.filter.trim().toLowerCase();
    const notes = this.vault.notes.slice().sort(function (a, b) { return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1; })
      .filter(function (n) { return !f || n.title.toLowerCase().indexOf(f) >= 0 || n.md.toLowerCase().indexOf(f) >= 0; });
    let html = '';
    if (this.room) html += '<li class="room' + (this.doc === 'room' ? ' on' : '') + '" data-room="1" role="option"><span data-sprite="users" data-px="15"></span><span class="t">Room ' + esc(this.room) + '</span><i class="nbx-live" title="Live"></i></li>';
    html += notes.map(function (n) {
      const on = s.doc === 'note' && n.id === s.vault.active, arm = s.armed === n.id;
      return '<li' + (on ? ' class="on"' : '') + ' data-id="' + esc(n.id) + '" role="option"><span data-sprite="doc" data-px="15"></span><span class="t">' + esc(n.title || 'Untitled') + '</span>' +
        '<button class="del' + (arm ? ' armed' : '') + '" data-del="' + esc(n.id) + '" aria-label="Delete note ' + esc(n.title) + '">' + (arm ? 'Delete?' : '×') + '</button></li>';
    }).join('');
    if (!notes.length && f) html += '<li class="empty">No matching notes</li>';
    ul.innerHTML = html; paint(ul);
  },

  /* ------------------------------ wiring ------------------------------ */
  bind: function () {
    const s = this, ed = this.editor(), $ = q;
    ed.addEventListener('input', function (e) { s.onInput(e); });
    ed.addEventListener('keydown', function (e) { s.onKey(e); });
    ed.addEventListener('click', function () { s.contextMenu(); });
    ed.addEventListener('blur', function () { setTimeout(function () { if (!s.menu.open) return; s.menuHide(); }, 160); });
    ed.addEventListener('scroll', function () { if (s.menu.open) s.menuHide(); });
    const ti = $('#nbTitle');
    ti.addEventListener('input', function () { if (s.doc !== 'note') return; clearTimeout(s.renameT); s.renameT = setTimeout(function () { s.rename(ti.value); }, 350); });
    ti.addEventListener('change', function () { if (s.doc !== 'note') return; s.rename(ti.value); const n = s.cur(); if (n) ti.value = n.title; });
    ti.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ti.blur(); if (s.view !== 'read') ed.focus(); } });
    $('#nbNew').addEventListener('click', function () { s.newNote(); blip('click'); });
    $('#nbSideBtn').addEventListener('click', function () { s.toggleSide(); });
    $('#nbScrim').addEventListener('click', function () { s.setSide(false); });
    $('#nbPalBtn').addEventListener('click', function () { s.palOpen(); });
    $('#nbMore').addEventListener('click', function (e) { e.stopPropagation(); if (s.menu.open) s.menuHide(); else s.moreMenu(); });
    $('#nbBack').addEventListener('click', function (e) { e.stopPropagation(); if (s.menu.open) s.menuHide(); else s.backlinkMenu(); });
    qa('[data-nbview]').forEach(function (b) { b.addEventListener('click', function () { s.setView(b.dataset.nbview); blip('click'); }); });
    $('#nbFilter').addEventListener('input', function () { s.filter = this.value; s.renderList(); });
    $('#nbList').addEventListener('click', function (e) {
      const d = e.target.closest('[data-del]');
      if (d) { e.stopPropagation(); if (s.armed === d.dataset.del) s.deleteNote(d.dataset.del); else s.armDelete(d.dataset.del); return; }
      const li = e.target.closest('li'); if (!li) return;
      if (li.dataset.room) s.showRoom(); else if (li.dataset.id) s.openNote(li.dataset.id);
    });
    $('#nbPreview').addEventListener('click', function (e) {
      const a = e.target.closest && e.target.closest('a.wl'); if (a) { e.preventDefault(); s.follow(a.dataset.wl); return; }
      const t = e.target; if (t.tagName === 'INPUT' && t.type === 'checkbox' && t.dataset.ti != null) s.toggleTask(+t.dataset.ti);
    });
    /* menu + palette pointer handling (mousedown keeps editor focus) */
    $('#nbMenu').addEventListener('mousedown', function (e) { e.preventDefault(); const li = e.target.closest('li[data-i]'); if (li) s.menuPick(+li.dataset.i); });
    $('#nbPalList').addEventListener('mousedown', function (e) { e.preventDefault(); const li = e.target.closest('li[data-i]'); if (li) s.palPick(+li.dataset.i); });
    $('#nbPal').addEventListener('mousedown', function (e) { if (e.target === this) s.palClose(); });
    const pi = $('#nbPalIn');
    pi.addEventListener('input', function () { s.palRefresh(); });
    pi.addEventListener('keydown', function (e) {
      const p = s.pal, k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); if (p.items.length) { p.sel = (p.sel + (k === 'ArrowDown' ? 1 : p.items.length - 1)) % p.items.length; s.mark($('#nbPalList'), p.sel); } }
      else if (k === 'Enter') { e.preventDefault(); s.palPick(p.sel); }
      else if (k === 'Escape') { e.preventDefault(); s.palClose(); }
    });
    document.addEventListener('mousedown', function (e) { if (s.menu.open && !e.target.closest('#nbMenu') && e.target.id !== 'nbMore' && e.target.id !== 'nbBack') s.menuHide(); });
    /* rooms */
    $('#nbJoinBtn').addEventListener('click', function () { s.joinRoom(false); });
    $('#nbCreateBtn').addEventListener('click', function () { s.joinRoom(true); });
    $('#nbLeaveBtn').addEventListener('click', function () { s.leaveRoom(); });
    const ri = $('#nbRoomInput');
    ri.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); s.joinRoom(false); } });
    ri.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 4); });
    /* global shortcuts, only while the notebook screen is showing */
    document.addEventListener('keydown', function (e) {
      if (!s.active) return;
      const mod = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
      if (mod && !e.altKey && !e.shiftKey && k === 'p') { e.preventDefault(); s.palOpen(); }
      else if (mod && !e.altKey && !e.shiftKey && k === 'e') { e.preventDefault(); s.toggleRead(); }
      else if (e.altKey && !mod && k === 'n') { e.preventDefault(); s.newNote(); }
    }, true);
    if (window.matchMedia) {                                   // notes list follows the breakpoint (open on desktop, drawer on phones)
      const mq = window.matchMedia('(max-width: 900px)'), h = function (e) { s.setSide(!e.matches); };
      if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
    }
  },

  /* ------------------------------ shared rooms ------------------------------ */
  renderRoom: function () {
    const idle = q('#nbRoomIdle'), live = q('#nbRoomLive'); if (!idle || !live) return;
    idle.hidden = !!this.room; live.hidden = !this.room;
    if (!this.room) { const c = q('#nbCollab'); if (c) c.textContent = ''; }
  },
  joinRoom: function (create) {
    const code = String(q('#nbRoomInput').value || '').replace(/\D/g, '');
    if (!/^\d{4}$/.test(code)) { say('<b>ROOM CODE</b><br>Enter exactly 4 digits (e.g. 4091).', 'doc', 3000); blip('bad'); return; }
    if (!fbOK()) { say('<b>OFFLINE</b><br>Configure FIREBASE_CONFIG to open shared rooms.', 'doc', 3000); blip('bad'); return; }
    AuthManager.ensureAuth('Shared rooms need an operator link.');
    this.attachRoom(code, create, false);
  },
  attachRoom: function (code, create, silent) {
    const self = this;
    if (!fbOK()) { if (!silent) say('<b>OFFLINE</b><br>Configure FIREBASE_CONFIG to open shared rooms.', 'doc', 3000); return; }
    if (!AuthManager.user) {
      if (silent) { this.pendingRoom = code; return; }          // resume quietly once auth resolves (no toast on page load)
      say('Awaiting operator link — try again in a second.', 'power', 2600); return;
    }
    if (this.room === code && this.roomUnsub) { this.showRoom(); return; }
    const ref = DB.collection('group_notes').doc(code);
    const n = this.cur(), seed = (this.doc === 'note' && n) ? n.md : '';
    ref.get().then(function (doc) {
      if (!doc.exists && !create) {
        if (silent) { try { localStorage.removeItem(LS.nbroom); } catch (e) {} }
        else { say('<b>ROOM ' + esc(code) + ' NOT FOUND</b><br>Double-check the code, or hit New to create it from the open note.', 'doc', 3400); blip('bad'); }
        return;
      }
      let md = seed;
      if (!doc.exists) {
        guardedWrite('create-room', function () {
          return ref.set({ code: code, md: seed, updatedBy: AuthManager.uid, updatedName: AuthManager.name || 'OPERATOR', coll: {}, ts: Date.now(), created: Date.now() });
        });
        if (!silent) say('<b>ROOM ' + esc(code) + ' CREATED</b><br>Seeded from your open note — share the code.', 'coin', 3600);
      } else {
        const d = doc.data() || {};
        md = typeof d.md === 'string' ? d.md : '';
        self.renderCollab(d.coll || {});
        if (!silent) say('<b>LINKED TO ROOM ' + esc(code) + '</b><br>Live essay channel bound to #essay-group.', 'coin', 3200);
      }
      if (!silent) blip('ok');
      self.detachRoom(true);
      self.room = code; self.roomMd = md; self.dirtyLocal = false; NoteSync.dirty = false;
      try { localStorage.setItem(LS.nbroom, code); } catch (e) {}
      self.roomUnsub = ref.onSnapshot(function (snap) { self.onRoomSnap(snap); }, function () {});
      ChatEngine.onRoomChanged(code);
      if (!silent) self.showRoom(); else { self.renderRoom(); self.renderList(); }
    }).catch(function () { say('<b>ROOM LINK FAILED</b><br>Relay unreachable — try again.', 'doc', 3000); });
  },
  detachRoom: function (keepRoomVar) {
    if (this.roomUnsub) { try { this.roomUnsub(); } catch (e) {} this.roomUnsub = null; }
    if (!keepRoomVar) {
      this.room = null;
      try { localStorage.removeItem(LS.nbroom); } catch (e) {}
      ChatEngine.onRoomChanged(null);
    }
  },
  saveRoomCopy: function (code, md) {
    if (!md || !md.trim()) return null;
    const title = 'Room ' + code;
    let n = this.findByTitle(title);
    if (n) { n.md = md; n.ts = Date.now(); } else { n = this.mk(title, md); this.vault.notes.push(n); }
    this.persist(); return n;
  },
  leaveRoom: function () {
    const code = this.room; if (!code) return;
    NoteSync.stop();                                   // flush pending edits while still attached
    const md = this.roomMd, wasOpen = this.doc === 'room';
    this.detachRoom(false);
    this.dirtyLocal = false; this.roomMd = '';
    const copy = this.saveRoomCopy(code, md);
    if (wasOpen) { this.doc = 'note'; if (copy) this.vault.active = copy.id; }
    this.persist(); this.showDoc();
    say('<b>LEFT ROOM ' + esc(code) + '</b><br>' + (copy ? 'A copy is saved as “' + esc(copy.title) + '”.' : 'Nothing to keep.'), 'doc', 3200);
    blip('flip');
  },
  onRoomSnap: function (snap) {
    if (!snap.exists) return;
    const d = snap.data() || {};
    this.renderCollab(d.coll || {});
    if (d.updatedBy === AuthManager.uid) return;                       // our own echo
    const remote = typeof d.md === 'string' ? d.md : '';
    if (NoteSync.dirty || this.dirtyLocal) {                            // our unsent edits win until the next flush
      const now = Date.now();
      if (now - this.remoteNoticeT > 20000) { this.remoteNoticeT = now; say('<b>REMOTE EDIT DETECTED</b><br>' + esc(d.updatedName || 'A collaborator') + ' pushed changes — your pending edits flush in a moment.', 'doc', 3400); }
      return;
    }
    if (remote === this.roomMd) return;
    this.roomMd = remote;
    if (this.doc === 'room') {
      const ed = this.editor(), p = Math.min(ed.selectionStart, remote.length);
      ed.value = remote; ed.setSelectionRange(p, p);                   // keep the caret where it was
      this.metrics(); this.previewSoon();
    }
  },
  renderCollab: function (coll) {
    const now = Date.now(), names = [];
    Object.keys(coll || {}).forEach(function (uid) {
      const c = coll[uid];
      if (c && c.n && (now - (c.ts || 0)) < NotebookManager.COLLAB_FRESH_MS) names.push(c.n);
    });
    if (AuthManager.name && names.indexOf(AuthManager.name) < 0) names.push(AuthManager.name);
    const el = q('#nbCollab');
    if (el) el.textContent = names.length + ' editing · ' + names.slice(0, 3).join(', ') + (names.length > 3 ? ' +' + (names.length - 3) : '');
  },
  flushRoom: function () {
    const self = this;
    if (!this.room || !fbOK() || !AuthManager.uid) { this.setSync(this.room ? 'buffering' : 'local'); return; }
    const md = this.roomMd, uid = AuthManager.uid, name = AuthManager.name || 'OPERATOR';
    this.setSync('syncing');
    guardedWrite('note-sync', function () {
      const coll = {}; coll[uid] = { n: name, ts: Date.now() };
      return DB.collection('group_notes').doc(self.room).set({ code: self.room, md: md, updatedBy: uid, updatedName: name, coll: coll, ts: Date.now() }, { merge: true });
    }).then(function (ok) {
      if (ok) self.dirtyLocal = (self.roomMd !== md);
      self.setSync(ok ? (self.dirtyLocal ? 'buffering' : 'saved') : 'buffering');
    });
  },
  identityChanged: function () {
    if (this.pendingRoom && AuthManager.user && fbOK()) { const c = this.pendingRoom; this.pendingRoom = null; this.attachRoom(c, false, true); }
    this.renderRoom();
  },

  /* ------------------------------ export & clipboard ------------------------------ */
  exportMd: function () {
    const ed = this.editor(); if (!ed) return;
    this.persist();
    const n = this.cur();
    const base = this.doc === 'room' ? 'room-' + this.room : String((n && n.title) || 'note').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'note';
    const name = base + '-' + dayKey() + '.md';
    try {
      const blob = new Blob([ed.value], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      say('<b>EXPORTED</b><br>' + esc(name) + ' written to your downloads.', 'doc', 3200); blip('ok');
    } catch (e) { say('Export failed — browser blocked the download.', 'doc', 3000); }
  },
  /* KaTeX → styled HTML for the rich clipboard (Google Docs / Word paste) */
  katexHTML: function (tex, display) {
    if (typeof window.katex !== 'undefined') {
      try {
        /* mdBlock() HTML-escapes TeX; undo that so & < > reach KaTeX intact */
        const raw = String(tex).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
        return window.katex.renderToString(raw, { throwOnError: false, output: 'htmlAndMathml', displayMode: !!display });
      } catch (e) { /* fall through */ }
    }
    return esc((display ? '$$' + tex + '$$' : '$' + tex + '$'));
  },
  richHTML: function () {
    const ed = this.editor();
    const md = ed ? ed.value : '';
    let html;
    if (typeof window.mdBlock === 'function') html = window.mdBlock(NotebookManager.stripLinks(md));
    else html = '<p>' + esc(md).replace(/\n/g, '<br>') + '</p>';
    /* render math segments for targets that never load KaTeX css */
    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (function (m, tx) { return NotebookManager.katexHTML(tx, true); }))
               .replace(/\$([^$\n]+?)\$/g, (function (m, tx) { return NotebookManager.katexHTML(tx, false); }));
    /* inline styles — Docs/Word strip <style> blocks but keep inline CSS */
    const MAP = [
      ['<h1>', '<h1 style="font-family:Georgia,serif;font-size:26pt;font-weight:700;margin:20pt 0 8pt;color:#111">'],
      ['<h2>', '<h2 style="font-family:Georgia,serif;font-size:19pt;font-weight:700;margin:16pt 0 6pt;color:#222">'],
      ['<h3>', '<h3 style="font-family:Georgia,serif;font-size:15pt;font-weight:700;margin:12pt 0 5pt;color:#333">'],
      ['<blockquote>', '<blockquote style="border-left:4px solid #b39243;margin:10pt 0;padding:2pt 14pt;color:#555">'],
      ['<code>', '<code style="font-family:Consolas,monospace;background:#f2f2f2;padding:1pt 3pt">'],
      ['<pre>', '<pre style="font-family:Consolas,monospace;background:#f5f5f5;border:1px solid #ddd;padding:10pt;white-space:pre-wrap">'],
      ['<table>', '<table style="border-collapse:collapse;margin:12pt 0">'],
      ['<th>', '<th style="border:1px solid #999;padding:5pt 9pt;background:#eee;text-align:left">'],
      ['<td>', '<td style="border:1px solid #999;padding:5pt 9pt">'],
      ['<li>', '<li style="margin:3pt 0">']
    ];
    MAP.forEach(function (pair) { html = html.split(pair[0]).join(pair[1]); });
    return '<div style="font-family:Georgia,serif;font-size:11pt;line-height:1.6;color:#1a1a1a;max-width:660pt">' + html + '</div>';
  },
  copyFormatted: function () {
    const self = this;
    this.saveScratch();
    const rich = this.richHTML();
    const ed = this.editor();
    const plain = ed ? ed.value : '';
    const okToast = function () {
      say('<b>FORMATTED COPY COMPLETE</b><br>Now paste (Ctrl/Cmd+V) straight into Google Docs or Word — headings, tables, bolding and citations ride along.', 'doc', 4600);
      blip('ok');
    };
    const fallback = function () {
      try {
        const ta = document.createElement('textarea');
        ta.value = plain;
        ta.style.cssText = 'position:fixed;left:-999px;top:0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        if (ok) say('<b>PLAIN-TEXT COPY</b><br>This browser withholds the rich clipboard — Markdown source copied instead.', 'doc', 3600);
        else say('Copy blocked — select the editor text and copy manually.', 'doc', 3200);
      } catch (e) { say('Copy blocked — select the editor text and copy manually.', 'doc', 3200); }
    };
    if (navigator.clipboard && window.ClipboardItem && navigator.clipboard.write) {
      try {
        const item = new ClipboardItem({
          'text/html': new Blob([rich], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        });
        navigator.clipboard.write([item]).then(okToast).catch(fallback);
      } catch (e) { fallback(); }
    } else fallback();
  },

  onScreen: function (active) {
    this.active = !!active;
    if (active) { this.metrics(); this.renderPreview(); this.renderList(); this.renderRoom(); this.backlinkChip(); }
    else { this.persist(); NoteSync.flush(); this.menuHide(); this.palClose(); }
  }
};

/* ========================= [3b] SUPABASE REALTIME — LOUNGE TRANSPORT =========================
   The observation lounge used to heartbeat every operator's position into
   Firestore (a write per operator every ~15 s, plus ghost-purging deletes, all
   counted against the daily write budget). Supabase Realtime does the same job
   without a database at all:

     · PRESENCE  — who is on the deck. Joins/leaves are automatic (the socket IS
                   the heartbeat), so there is nothing to purge. Each operator's
                   resting position rides along as presence metadata.
     · BROADCAST — one tiny "walk" message per click-to-walk (a start point and a
                   target). Peers animate the walk locally, so the wire stays quiet.
     · The channel is only open while the Lounge screen is showing, and it is
       dropped 45 s after the tab is hidden.

   Firebase is untouched for accounts, notebook rooms, chat and moderation; it
   still supplies the operator identity (uid + display name) used here.

   SETUP (no tables, no SQL): create a Supabase project, copy Project URL and the
   `anon` public key (Project Settings → API) below. Realtime public channels are
   on by default. Leave both as placeholders and the lounge falls back to the
   previous Firestore presence automatically.

   TRUST MODEL: the anon key is public by design. Lounge presence is cosmetic —
   names and positions are self-declared and sanitised on receipt (length, range,
   prototype-key guards). Never put anything sensitive on this channel. */
const SUPABASE_CONFIG = {
  url: 'https://supabase.com/dashboard/project/qxdieorzlnocxbxmgyoj/settings/infrastructure',              // e.g. https://abcdxyz.supabase.co
  anonKey: 'sb_publishable_rPtDHrr-OQKH9h093HiW5w_KCvs9fIU',     // the public "anon" key
  channel: 'lounge:deck07'
};
const SB_OK = (function () {
  try {
    const u = String(SUPABASE_CONFIG.url || ''), k = String(SUPABASE_CONFIG.anonKey || '');
    return u.indexOf('https://') === 0 && u.indexOf('YOUR_') < 0 && k.length > 20 && k.indexOf('YOUR_') !== 0;
  } catch (e) { return false; }
})();
function clampN(v, lo, hi, d) { v = +v; return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }

const SupabaseLounge = {
  client: null, ch: null, uid: null,
  state: 'idle',                 // idle | joining | live | retry
  WALK_MIN_MS: 120,              // at most ~8 walk messages / second
  REST_MS: 1500,                 // settle time before refreshing our resting position
  lastWalk: 0, walkT: null, restT: null, hiddenT: null, _vw: false,

  available: function () { return SB_OK && typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function'; },
  label: function () { return this.state === 'live' ? 'REALTIME' : (this.state === 'retry' ? 'RECONNECTING…' : 'CONNECTING…'); },

  ensureClient: function () {
    if (this.client) return this.client;
    try {
      this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },   // Firebase owns accounts
        realtime: { params: { eventsPerSecond: 10 } }
      });
    } catch (e) { this.client = null; }
    return this.client;
  },

  /* what peers need to draw us when we are standing still */
  meta: function () {
    const st = engS(); let lv = 1;
    if (typeof window.levelOf === 'function' && st) lv = window.levelOf(st.xp || 0) + 1;
    const me = LoungeEngine.me;
    return { n: String(AuthManager.name || 'GUEST').slice(0, 14), lv: lv, a: AuthManager.admin ? 1 : 0, x: Math.round(me.cx), y: Math.round(me.cy), ts: Date.now() };
  },

  connect: function () {
    const uid = AuthManager.uid;
    if (!this.available() || !uid) return false;
    if (this.ch && this.uid === uid) return true;            // already live for this identity
    this.disconnect();
    const c = this.ensureClient(); if (!c) return false;
    const self = this;
    this.uid = uid; this.state = 'joining';
    const ch = c.channel(SUPABASE_CONFIG.channel, { config: { presence: { key: uid }, broadcast: { self: false, ack: false } } });
    ch.on('presence', { event: 'sync' }, function () { self.onSync(); })
      .on('broadcast', { event: 'walk' }, function (m) { LoungeEngine.applyWalk(m && m.payload); })
      .subscribe(function (status) {
        if (self.ch !== ch) return;                         // a newer channel replaced this one
        if (status === 'SUBSCRIBED') { self.state = 'live'; try { ch.track(self.meta()); } catch (e) {} }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') self.state = 'retry';
        else if (status === 'CLOSED') self.state = 'idle';
        LoungeEngine.onTransport();
      });
    this.ch = ch;
    return true;
  },

  disconnect: function () {
    clearTimeout(this.restT); clearTimeout(this.walkT); this.restT = this.walkT = null;
    const ch = this.ch; this.ch = null; this.uid = null; this.state = 'idle';
    if (ch && this.client) {
      try { ch.untrack(); } catch (e) {}
      try { this.client.removeChannel(ch); } catch (e) {}
    }
  },

  onSync: function () {
    if (!this.ch) return;
    let st = {}; try { st = this.ch.presenceState() || {}; } catch (e) {}
    LoungeEngine.applyRoster(st);
  },

  /* one message per click-to-walk; peers interpolate */
  sendWalk: function () {
    if (!this.ch || this.state !== 'live') return;
    const self = this, wait = Math.max(0, this.WALK_MIN_MS - (Date.now() - this.lastWalk));
    clearTimeout(this.walkT);
    this.walkT = setTimeout(function () {
      if (!self.ch || self.state !== 'live') return;
      const me = LoungeEngine.me; self.lastWalk = Date.now();
      try { self.ch.send({ type: 'broadcast', event: 'walk', payload: { u: self.uid, fx: Math.round(me.cx), fy: Math.round(me.cy), x: me.x, y: me.y } }); } catch (e) {}
    }, wait);
  },

  /* when our walk ends, refresh the resting position newcomers will read */
  queueRest: function () {
    if (!this.ch || this.state !== 'live') return;
    const self = this; clearTimeout(this.restT);
    this.restT = setTimeout(function () { if (self.ch && self.state === 'live') { try { self.ch.track(self.meta()); } catch (e) {} } }, this.REST_MS);
  },
  retrack: function () { if (this.ch && this.state === 'live') { try { this.ch.track(this.meta()); } catch (e) {} } },

  /* drop the socket after 45 s hidden; reconnect on return */
  watchVisibility: function () {
    if (this._vw) return; this._vw = true;
    const self = this;
    document.addEventListener('visibilitychange', function () {
      clearTimeout(self.hiddenT);
      if (document.hidden) {
        self.hiddenT = setTimeout(function () { if (LoungeEngine.active && self.ch) { self.disconnect(); LoungeEngine.players = {}; LoungeEngine.onTransport(); } }, 45000);
      } else if (LoungeEngine.active && !self.ch) LoungeEngine.attachListener();
    });
  }
};

/* ========================= [4] LOUNGE ENGINE =========================
   Cozy 2D observation deck beneath the surface: rising marine snow, a
   drifting whale + jellyfish, light shafts, grated floor. Operators render as retro
   astronaut sprites with nameplates + level chips. Click the deck to
   walk. Presence + walks travel over Supabase Realtime when configured
   (SupabaseLounge); otherwise Firestore lobby_presence at most every 15 s. */
const LoungeEngine = {
  W: 480, H: 300, FLOOR_Y: 185, MIN_X: 16, MAX_X: 464, MIN_Y: 205, MAX_Y: 282,
  cv: null, ctx: null, buf: null, bufCtx: null,
  active: false, raf: null, lastT: 0,
  players: {},            // uid → { n, lv, x, y, ts, a, cx, cy, dir, walk, _localSeen, _remoteTs }
  me: { x: 240, y: 244, cx: 240, cy: 244, dir: 1, walk: false },
  presUnsub: null, beatT: null,
  stars: null, sat: { x: 40, y: 46, v: 0.02 },
  REDUCED: (typeof matchMedia !== 'undefined') && matchMedia('(prefers-reduced-motion: reduce)').matches,

  init: function () {
    this.cv = q('#loungeCanvas');
    if (!this.cv) return;
    this.ctx = this.cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.buf = document.createElement('canvas');
    this.buf.width = 64; this.buf.height = 64;
    this.bufCtx = this.buf.getContext('2d');
    this.stars = [];
    for (let i = 0; i < 46; i++) {
      this.stars.push({
        x: Math.random() * this.W, y: Math.random() * (this.FLOOR_Y - 14),
        s: Math.random() < 0.25 ? 2 : 1, v: 0.004 + Math.random() * 0.012,
        tw: Math.random() * Math.PI * 2
      });
    }
    const self = this;
    this.cv.addEventListener('click', function (e) { self.onClick(e); });
  },

  setActive: function (on) {
    this.active = !!on;
    if (on) this.enter();
    else this.leave();
  },

  attachListener: function () {
    if (!AuthManager.user) return;
    if (SupabaseLounge.available()) { SupabaseLounge.watchVisibility(); SupabaseLounge.connect(); return; }   // Realtime transport
    if (!fbOK() || this.presUnsub) return;
    const self = this;
    try {
      this.presUnsub = DB.collection('lobby_presence').onSnapshot(function (snap) {
        self.onPresence(snap);
      }, function () {});
    } catch (e) {}
  },

  enter: function () {
    const self = this;
    if (!this.cv) this.init();
    this.attachListener();
    if (fbOK()) AuthManager.ensureAuth('The lounge needs an operator link to see other operators.');
    this.beat(true);
    if (!this.beatT) this.beatT = setInterval(function () { self.beat(false); }, 7000);
    if (!this.raf) { this.lastT = 0; this.raf = requestAnimationFrame(function (t) { self.frame(t); }); }
    this.renderRoster();
    this.updateWhoami();
  },

  leave: function () {
    clearInterval(this.beatT); this.beatT = null;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.clearPresence();
    if (SupabaseLounge.available()) { this.players = {}; this.renderRoster(); }
  },

  detachAll: function () {
    this.leave();
    if (this.presUnsub) { try { this.presUnsub(); } catch (e) {} this.presUnsub = null; }
  },

  identityChanged: function () {
    if (this.active) {
      this.attachListener();
      this.beat(true);
      this.renderRoster();
      this.updateWhoami();
    }
    if (SupabaseLounge.available()) { if (!AuthManager.user) SupabaseLounge.disconnect(); else SupabaseLounge.retrack(); }
    if (this.presUnsub && !AuthManager.user) {
      try { this.presUnsub(); } catch (e) {}
      this.presUnsub = null;
    }
  },

  clearPresence: function () {
    if (SupabaseLounge.available()) { SupabaseLounge.disconnect(); return; }
    if (!fbOK() || !AuthManager.uid) return;
    try {
      DB.collection('lobby_presence').doc(AuthManager.uid).delete().catch(function () {});
    } catch (e) {}
  },

  deleteGhost: function (uid) {
    if (!fbOK() || !uid) return;
    DB.collection('lobby_presence').doc(uid).delete().catch(function () {});
  },

  onClick: function (e) {
    const r = this.cv.getBoundingClientRect();
    const x = (e.clientX - r.left) * (this.W / r.width);
    const y = (e.clientY - r.top) * (this.H / r.height);
    this.me.x = Math.max(this.MIN_X, Math.min(this.MAX_X, Math.round(x)));
    this.me.y = Math.max(this.MIN_Y, Math.min(this.MAX_Y, Math.round(y)));
    this.me.walk = true;
    blip('click');
    if (SupabaseLounge.available()) SupabaseLounge.sendWalk();
  },

  beat: function (force) {
    if (SupabaseLounge.available()) return;               // Realtime presence needs no heartbeat
    if (!fbOK() || !AuthManager.uid || !Presence.due(force)) return;
    Presence.mark();
    const st = engS();
    let lv = 1;
    if (typeof window.levelOf === 'function' && st) lv = window.levelOf(st.xp || 0) + 1;
    const uid = AuthManager.uid;
    guardedWrite('presence', function () {
      return DB.collection('lobby_presence').doc(uid).set({
        n: AuthManager.name || 'GUEST', lv: lv,
        x: LoungeEngine.me.x, y: LoungeEngine.me.y,
        a: AuthManager.admin ? 1 : 0, ts: Date.now()
      }, { merge: true });
    });
  },

  onPresence: function (snap) {
    const now = Date.now();
    const next = {};
    const self = this;

    snap.forEach(function (doc) {
      const d = doc.data() || {};
      const uid = doc.id;

      // Skip self
      if (uid === AuthManager.uid) return;

      const prev = self.players[uid];
      const timeDiff = Math.abs(now - (d.ts || 0));

      // 1. If player stopped sending new heartbeats for >22s on our local clock, purge ghost
      if (prev && prev._localSeen && (now - prev._localSeen > 22000)) {
        self.deleteGhost(uid);
        return;
      }

      // 2. If first time seeing this doc and it has been abandoned for >60s, purge ghost
      if (!prev && (!d.ts || timeDiff > 60000)) {
        self.deleteGhost(uid);
        return;
      }

      // 3. Keep local arrival time current whenever sender sends a new heartbeat
      const localSeen = (prev && prev._remoteTs === d.ts) ? prev._localSeen : now;

      next[uid] = {
        n: String(d.n || 'OP').slice(0, 14),
        lv: d.lv || 1,
        a: !!d.a,
        x: d.x || 240,
        y: d.y || 244,
        cx: prev ? prev.cx : (d.x || 240),
        cy: prev ? prev.cy : (d.y || 244),
        dir: prev ? prev.dir : 1,
        walk: true,
        ts: d.ts,
        _localSeen: localSeen,
        _remoteTs: d.ts
      };
    });

    this.players = next;
    this.renderRoster();
    const fresh = Object.keys(next).length + (AuthManager.user ? 1 : 0);
    const chip = q('#lobbyCountChip');
    if (chip) chip.textContent = fresh + ' ONLINE';
    if (AdminManager.isAdmin()) AdminManager.auditTick();
  },

  /* ---- Supabase Realtime inputs (see SupabaseLounge) ---- */
  applyRoster: function (state) {
    const self = this, next = {}, myId = AuthManager.uid;
    Object.keys(state || {}).forEach(function (uid) {
      if (uid === myId || uid === '__proto__' || uid === 'constructor' || uid === 'prototype') return;
      const arr = state[uid], d = arr && arr.length ? arr[arr.length - 1] : null;
      if (!d || typeof d !== 'object') return;
      const prev = Object.prototype.hasOwnProperty.call(self.players, uid) ? self.players[uid] : null;
      const x = clampN(d.x, self.MIN_X, self.MAX_X, 240), y = clampN(d.y, self.MIN_Y, self.MAX_Y, 244);
      next[uid] = {
        n: String(d.n || 'OP').slice(0, 14), lv: Math.round(clampN(d.lv, 1, 99, 1)), a: !!d.a,
        x: prev && prev.walk ? prev.x : x, y: prev && prev.walk ? prev.y : y,
        cx: prev ? prev.cx : x, cy: prev ? prev.cy : y,
        dir: prev ? prev.dir : 1, walk: prev ? prev.walk : false, ts: Date.now()
      };
    });
    this.players = next;
    this.renderRoster();
    const chip = q('#lobbyCountChip');
    if (chip) chip.textContent = this.freshCount() + ' ONLINE';
    if (AdminManager.isAdmin()) AdminManager.auditTick();
  },
  applyWalk: function (p) {
    if (!p || typeof p !== 'object' || p.u === AuthManager.uid) return;
    const u = String(p.u);
    if (!Object.prototype.hasOwnProperty.call(this.players, u)) return;
    const pl = this.players[u];
    const fx = clampN(p.fx, this.MIN_X, this.MAX_X, pl.cx), fy = clampN(p.fy, this.MIN_Y, this.MAX_Y, pl.cy);
    if (Math.abs(pl.cx - fx) + Math.abs(pl.cy - fy) > 30) { pl.cx = fx; pl.cy = fy; }      // resync if we drifted
    pl.x = clampN(p.x, this.MIN_X, this.MAX_X, pl.x); pl.y = clampN(p.y, this.MIN_Y, this.MAX_Y, pl.y); pl.walk = true;
  },
  onTransport: function () { this.updateWhoami(); this.renderRoster(); },

  freshCount: function () {
    return Object.keys(this.players).length + (AuthManager.user ? 1 : 0);
  },

  onlineOperators: function () {
    const out = [{ uid: AuthManager.uid, name: AuthManager.name || 'GUEST', me: true, admin: AuthManager.admin }];
    const self = this;
    Object.keys(this.players).forEach(function (uid) {
      out.push({ uid: uid, name: self.players[uid].n, me: false, admin: self.players[uid].a });
    });
    return out;
  },

  updateWhoami: function () {
    const el = q('#lobbyWhoami');
    if (!el) return;
    if (!fbOK()) el.innerHTML = 'IDENT: <b style="color:var(--red)">OFFLINE LINK</b>';
    else if (!AuthManager.user) el.innerHTML = 'IDENT: <b>ESTABLISHING GUEST LINK…</b>';
    else el.innerHTML = 'IDENT: <b style="color:' + (AuthManager.admin ? 'var(--gold)' : 'var(--cyan)') + '">' +
      esc(AuthManager.name || 'GUEST') + (AuthManager.admin ? ' ★SYSOP' : (AuthManager.guest ? ' ·GUEST' : '')) + '</b>' +
      (SupabaseLounge.available() ? ' <span class="small">· ' + SupabaseLounge.label() + '</span>' : '');
  },

  renderRoster: function () {
    const ro = q('#lobbyRoster');
    if (!ro) return;
    const ops = this.onlineOperators();
    if (!fbOK()) {
      ro.innerHTML = '<span class="small">OFFLINE MODE — configure FIREBASE_CONFIG in js/network.js to meet other operators.</span>';
      const chip = q('#lobbyCountChip');
      if (chip) chip.textContent = 'OFFLINE';
      return;
    }
    if (!AuthManager.user) { ro.innerHTML = '<span class="small">Establishing operator link…</span>'; return; }
    ro.innerHTML = ops.map(function (o) {
      return '<button class="lro' + (o.me ? ' me' : '') + (o.admin ? ' admin' : '') + '" data-dmuid="' + esc(o.uid) +
        '" data-dmname="' + esc(o.name) + '" title="Message ' + esc(o.name) + '"><span class="tdot' + (o.me ? '' : ' dim') + '"></span>' +
        esc(o.name) + (o.admin ? ' ★' : '') + '<span class="lv">LV' + (o.lv || 1) + '</span></button>';
    }).join('');
    const self = this;
    qa('.lro', ro).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.dmuid === AuthManager.uid) return;
        ChatEngine.openDM(b.dataset.dmuid, b.dataset.dmname);
      });
    });
  },

  /* ---- rendering ---- */
  frame: function (t) {
    const self = this;
    const dt = this.lastT ? Math.min(64, t - this.lastT) : 16;
    this.lastT = t;
    this.step(dt, t);
    this.draw(t);
    if (this.active) this.raf = requestAnimationFrame(function (tt) { self.frame(tt); });
    else this.raf = null;
  },
  step: function (dt, t) {
    const self = this;
    const mv = function (p, speed) {
      const dx = p.x - p.cx, dy = p.y - p.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.2) { p.cx = p.x; p.cy = p.y; p.walk = false; return; }
      const k = Math.min(1, (speed * dt / 1000) / dist);
      if (Math.abs(dx) > 1) p.dir = dx > 0 ? 1 : -1;
      p.cx += dx * k; p.cy += dy * k; p.walk = true;
    };
    const wasWalking = this.me.walk;
    mv(this.me, 62);
    if (wasWalking && !this.me.walk && SupabaseLounge.available()) SupabaseLounge.queueRest();
    Object.keys(this.players).forEach(function (uid) { mv(self.players[uid], 46); });
    if (!this.REDUCED) {
      this.stars.forEach(function (s) { s.y -= s.v * dt * 0.8; s.x += Math.sin(s.tw) * 0.04; if (s.y < -2) { s.y = self.FLOOR_Y - 4; s.x = Math.random() * self.W; } s.tw += dt * 0.002; });
      this.sat.x += this.sat.v * dt;
      if (this.sat.x > self.W + 20) { this.sat.x = -20; this.sat.y = 20 + Math.random() * 90; }
    }
  },

  drawGlow: function (t) {
    const c = this.ctx, W = this.W, H = this.FLOOR_Y;
    const g = c.createRadialGradient(W * 0.5, -30, 8, W * 0.5, -30, 270);
    g.addColorStop(0, 'rgba(160,236,255,.62)'); g.addColorStop(0.45, 'rgba(48,150,190,.17)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sway = this.REDUCED ? 0 : Math.sin(t / 3200) * 10;
    c.fillStyle = 'rgba(120,225,255,.045)';
    [[170, 40], [250, 56], [330, 36]].forEach(function (s) {
      c.beginPath(); c.moveTo(s[0] - s[1] / 2 + sway, 0); c.lineTo(s[0] + s[1] / 2 + sway, 0);
      c.lineTo(s[0] + s[1] * 1.6 + sway * 2, H); c.lineTo(s[0] - s[1] * 1.6 + sway * 2, H); c.closePath(); c.fill();
    });
  },
  drawWhale: function (t) {
    const c = this.ctx, W = this.W;
    const x = this.REDUCED ? 300 : ((t * 0.006) % (W + 260)) - 130;
    const y = 76 + (this.REDUCED ? 0 : Math.sin(t / 4200) * 10) - (x / W) * 14;
    const tail = this.REDUCED ? 0 : Math.sin(t / 650) * 0.32;
    c.save(); c.translate(x, y); c.rotate(-0.12); c.scale(0.95, 0.95);
    c.fillStyle = 'rgba(2,13,20,.82)'; c.strokeStyle = 'rgba(120,225,255,.26)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(100, 2);
    c.bezierCurveTo(92, -12, 70, -16, 48, -13); c.bezierCurveTo(30, -10, 14, -6, 4, -3.5);
    c.lineTo(4, 3); c.bezierCurveTo(14, 6, 32, 10, 52, 13); c.bezierCurveTo(74, 16, 94, 12, 100, 2);
    c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(70, 10); c.quadraticCurveTo(62, 22, 50, 27); c.quadraticCurveTo(58, 14, 60, 10); c.closePath(); c.fill();
    c.save(); c.translate(4, -0.5); c.rotate(tail);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-14, -10); c.quadraticCurveTo(-17, -3, -11, 0);
    c.quadraticCurveTo(-17, 3, -14, 10); c.closePath(); c.fill(); c.restore();
    c.restore();
  },
  drawSat: function (t) {                       // a drifting jellyfish
    const c = this.ctx;
    const x = Math.round(this.sat.x), y = Math.round(this.sat.y + Math.sin(t / 700) * 3);
    c.fillStyle = 'rgba(130,235,255,.55)'; c.beginPath(); c.arc(x, y, 7, Math.PI, 0); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,200,116,.9)'; c.fillRect(x - 1, y - 3, 2, 2);
    c.strokeStyle = 'rgba(130,235,255,.38)'; c.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      c.beginPath(); c.moveTo(x + i * 2.6, y);
      for (let k = 1; k <= 5; k++) c.lineTo(x + i * 2.6 + Math.sin(t / 260 + k + i) * 1.6, y + k * 3);
      c.stroke();
    }
  },
  drawAstro: function (p, isMe, t) {
    const c = this.ctx;
    const bob = (!this.REDUCED && p.walk) ? Math.round(Math.sin(t / 90) * 1.6) : 0;
    const x = Math.round(p.cx), y = Math.round(p.cy) + bob;
    const d = p.dir >= 0 ? 1 : -1;
    const F = function (dx, dy, w, h, col) { c.fillStyle = col; c.fillRect(x + (d > 0 ? dx : -dx - w), y + dy, w, h); };
    /* backpack */
    F(-10, -14, 4, 10, isMe ? '#5fd0ee' : (p.a ? '#ffc874' : '#7fb0c0'));
    /* legs */
    F(-4, -2, 3, 6, '#bfe0ea'); F(2, -2, 3, 6, '#bfe0ea');
    /* body */
    F(-6, -12, 12, 11, '#e8fbff');
    F(-6, -12, 12, 2, '#bfe0ea');
    /* chest panel */
    F(-3, -9, 6, 4, p.a ? '#ffc874' : '#5fd0ee');
    /* arms */
    F(-9, -11, 3, 7, '#cfeaf1'); F(6, -11, 3, 7, '#cfeaf1');
    /* helmet */
    F(-5, -20, 10, 8, '#effcff');
    F(-4, -19, 8, 5, '#04222f');
    F(d > 0 ? 0 : -4, -18, 4, 3, p.a ? '#ffc874' : '#5fd0ee');
    /* nameplate */
    const name = String(p.n || 'OP').slice(0, 14);
    const lv = 'LV' + (p.lv || 1);
    c.font = 'bold 8px "Atkinson Hyperlegible", sans-serif';
    const tw = Math.max(34, c.measureText(name).width + c.measureText(lv).width + 8);
    c.fillStyle = 'rgba(3,20,30,.88)';
    c.fillRect(x - tw / 2, y - 34, tw, 11);
    c.fillStyle = p.a ? '#ffc874' : (isMe ? '#5fd0ee' : '#e6fbff');
    c.fillText(name, x - tw / 2 + 3, y - 25.5);
    c.fillStyle = '#ffc874';
    c.fillText(lv, x - tw / 2 + c.measureText(name).width + 6, y - 25.5);
    if (isMe) { /* selection reticle */
      c.fillStyle = 'rgba(95,208,238,.5)';
      c.fillRect(x - 7, y + 5, 14, 2);
    }
  },
  draw: function (t) {
    const c = this.ctx;
    if (!c) return;
    const self = this;
    /* open water */
    const bg = c.createLinearGradient(0, 0, 0, this.FLOOR_Y);
    bg.addColorStop(0, '#0b4d74'); bg.addColorStop(1, '#04283f');
    c.fillStyle = bg; c.fillRect(0, 0, this.W, this.H);
    this.drawGlow(t);
    this.stars.forEach(function (s) {
      const a = self.REDUCED ? 0.6 : (0.35 + 0.4 * Math.abs(Math.sin(s.tw)));
      c.fillStyle = s.s > 1 ? 'rgba(255,200,116,' + a + ')' : 'rgba(190,235,250,' + a + ')';
      c.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    });
    this.drawWhale(t);
    if (!this.REDUCED) this.drawSat(t);
    /* viewport struts */
    c.fillStyle = '#08304a';
    c.fillRect(0, 0, 5, this.FLOOR_Y); c.fillRect(this.W - 5, 0, 5, this.FLOOR_Y);
    c.fillRect(158, 0, 5, this.FLOOR_Y); c.fillRect(317, 0, 5, this.FLOOR_Y);
    c.fillStyle = '#1c6f94';
    c.fillRect(158, 0, 2, this.FLOOR_Y); c.fillRect(317, 0, 2, this.FLOOR_Y);
    /* deck floor */
    c.fillStyle = '#07304a'; c.fillRect(0, this.FLOOR_Y, this.W, this.H - this.FLOOR_Y);
    c.fillStyle = '#0e4a6c'; c.fillRect(0, this.FLOOR_Y, this.W, 6);
    c.fillStyle = '#2f96bd'; c.fillRect(0, this.FLOOR_Y, this.W, 2);
    c.strokeStyle = 'rgba(95,208,238,.10)';
    c.beginPath();
    for (let gx = 40; gx < this.W; gx += 40) { c.moveTo(gx + .5, this.FLOOR_Y + 6); c.lineTo(gx + .5, this.H); }
    for (let gy = this.FLOOR_Y + 44; gy < this.H; gy += 42) { c.moveTo(0, gy + .5); c.lineTo(this.W, gy + .5); }
    c.stroke();
    c.fillStyle = 'rgba(255,200,116,.35)';
    for (let rx = 20; rx < this.W; rx += 40) { c.fillRect(rx, this.FLOOR_Y + 12, 2, 2); c.fillRect(rx, this.H - 8, 2, 2); }
    /* status text when offline / unlinked / reconnecting */
    let banner = null, red = false;
    if (!fbOK()) { banner = 'OFFLINE MODE — FIREBASE LINK REQUIRED FOR OTHER OPERATORS'; red = true; }
    else if (!AuthManager.user) banner = 'ESTABLISHING OPERATOR LINK…';
    else if (SupabaseLounge.available() && SupabaseLounge.state === 'retry') banner = 'REALTIME LINK LOST — RETRYING…';
    if (banner) {
      c.fillStyle = 'rgba(2,20,34,.74)'; c.fillRect(0, 78, this.W, 34);
      c.fillStyle = red ? '#ff8795' : '#ffcb7a';
      c.font = 'bold 10px "Atkinson Hyperlegible", sans-serif';
      c.textAlign = 'center'; c.fillText(banner, this.W / 2, 98); c.textAlign = 'left';
    }
    /* players sorted by depth */
    const list = [];
    Object.keys(this.players).forEach(function (uid) { list.push(self.players[uid]); });
    const meDraw = { n: AuthManager.name || 'YOU', lv: (typeof window.levelOf === 'function' && engS()) ? window.levelOf(engS().xp || 0) + 1 : 1, cx: this.me.cx, cy: this.me.cy, dir: this.me.dir, walk: this.me.walk, a: AuthManager.admin };
    list.push(meDraw);
    list.sort(function (a, b) { return a.cy - b.cy; });
    list.forEach(function (p) { self.drawAstro(p, p === meDraw, t); });
  }
};

/* ========================= [5] CHAT ENGINE =========================
   Multi-channel realtime chat. Listeners are capped at .limit(250) and
   messages older than 7d are dropped client-side (+ sweeper deletes
   expired docs the viewer owns / admin-owned). 1s send rate limiter. */
const ChatEngine = {
  channel: 'global', sub: null, dm: null,
  unsub: null, lastDocs: [], lastSend: 0, RATE_MS: 1000, sweepT: null, // 1s cooldown
  EXPIRE_MS: 7 * 86400000, // Keeps chat history for 7 full days
  TOPICS: ['astronomy', 'physics', 'gaming-lore', 'mathematics', 'history', 'psychology'],

  colOf: function () {
    if (!fbOK()) return null;
    if (this.channel === 'global') return DB.collection('chat_global');
    if (this.channel === 'essay') return DB.collection(NotebookManager.room ? 'chat_essay_' + NotebookManager.room : 'chat_essay');
    if (this.channel === 'study') return DB.collection('chat_study_' + (this.sub || 'astronomy'));
    if (this.channel === 'dm') {
      if (!this.dm || !this.dm.uid || !AuthManager.uid) return null;
      const pair = [AuthManager.uid, this.dm.uid].sort();
      return DB.collection('chat_dm_' + pair.join('_'));
    }
    return DB.collection('chat_global');
  },
  chanLabel: function () {
    if (this.channel === 'global') return '#global';
    if (this.channel === 'essay') return NotebookManager.room ? '#essay-group · ROOM ' + NotebookManager.room : '#essay-group';
    if (this.channel === 'study') return '#study-rooms / ' + (this.sub || 'astronomy');
    if (this.channel === 'dm' && this.dm) return '#dm · ' + this.dm.name;
    return '#direct-messages';
  },

  init: function () {
    const self = this;
    q('#chatChannels').addEventListener('click', function (e) {
      const b = e.target.closest('.chtab'); if (!b) return;
      self.open(b.dataset.ch, null);
      blip('click');
    });
    q('#chatSubchips').addEventListener('click', function (e) {
      const b = e.target.closest('.subchipt'); if (!b) return;
      if (b.dataset.topic) { self.open('study', b.dataset.topic); }
      else if (b.dataset.dmuid) { self.openDM(b.dataset.dmuid, b.dataset.dmname); }
      blip('click');
    });
    q('#chatSend').addEventListener('click', function () { self.send(); });
    q('#chatInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); self.send(); }
    });
    this.sweepT = setInterval(function () { self.sweep(); }, 300000);
    this.open('global', null, true);
  },

  open: function (ch, sub, quiet) {
    this.channel = ch; this.sub = sub;
    if (ch !== 'dm') this.dm = null;
    qa('#chatChannels .chtab').forEach(function (b) {
      const on = b.dataset.ch === ch;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    this.renderSubchips();
    const input = q('#chatInput');
    if (input) input.placeholder = 'Transmit on ' + this.chanLabel() + '…';
    this.attach(quiet);
    this.renderNote();
  },

  openDM: function (uid, name) {
    if (!uid || uid === AuthManager.uid) { this.open('dm', null); return; }
    this.dm = { uid: uid, name: name || 'OPERATOR' };
    this.open('dm', null);
    say('<b>SECURE CHANNEL OPEN</b><br>Direct line to ' + esc(name || 'operator') + '.', 'speech', 2600);
  },

  onRoomChanged: function (code) {
    if (this.channel === 'essay') this.open('essay', null, true);
  },
  identityChanged: function () { this.renderNote(); if (this.channel === 'dm' && !this.dm) this.renderSubchips(); },

  renderSubchips: function () {
    const box = q('#chatSubchips');
    if (!box) return;
    if (this.channel === 'study') {
      box.hidden = false;
      box.innerHTML = this.TOPICS.map(function (tp) {
        return '<button class="subchipt' + (tp === ChatEngine.sub ? ' on' : '') + '" data-topic="' + tp + '">' + tp + '</button>';
      }).join('');
    } else if (this.channel === 'dm') {
      box.hidden = false;
      const ops = fbOK() && AuthManager.user ? LoungeEngine.onlineOperators() : [];
      const others = ops.filter(function (o) { return !o.me; });
      box.innerHTML = others.length
        ? others.map(function (o) {
            return '<button class="subchipt dm-op' + (ChatEngine.dm && ChatEngine.dm.uid === o.uid ? ' on' : '') +
              '" data-dmuid="' + esc(o.uid) + '" data-dmname="' + esc(o.name) + '"><span class="dmdot"></span>' + esc(o.name) + (o.admin ? ' ★' : '') + '</button>';
          }).join('')
        : '<span class="small">No other operators on deck — open DMs appear here as they arrive.</span>';
    } else box.hidden = true;
  },

  attach: function (quiet) {
    const self = this;
    if (this.unsub) { try { this.unsub(); } catch (e) {} this.unsub = null; }
    const log = q('#chatLog');
    if (!log) return;
    const col = this.colOf();
    if (!col) {
      log.innerHTML = '<div class="chat-sys">OFFLINE MODE — configure FIREBASE_CONFIG in js/network.js to open comms.</div>';
      return;
    }
    if (this.channel === 'dm' && !this.dm) {
      const ops = LoungeEngine.onlineOperators().filter(function (o) { return !o.me; });
      log.innerHTML = '<div class="chat-sys">DIRECT MESSAGE RELAY — pick an operator from the deck roster or the chips above.' +
        (ops.length ? '' : '<br>No other operators currently on deck — they will appear as presence heartbeats arrive.') + '</div>';
      return;
    }
    log.innerHTML = '<div class="chat-sys">TUNING ' + esc(this.chanLabel()) + '…</div>';
    /* THE RING BUFFER: newest 250 messages only — anti-storage-bloat cap */
    this.unsub = col.orderBy('ts', 'desc').limit(250).onSnapshot(function (snap) {
      const now = Date.now();
      const docs = [];
      snap.forEach(function (d) {
        const m = d.data() || {};
        m._id = d.id;
        /* 7d self-destruct check — expired packets are dropped at render */
        if (m.ts && now - m.ts > self.EXPIRE_MS) return;
        docs.push(m);
      });
      docs.reverse();
      self.lastDocs = docs;
      self.render(docs);
    }, function () {
      const lg = q('#chatLog');
      if (lg) lg.innerHTML = '<div class="chat-sys">CHANNEL FAULT — listener rejected. If this persists, publish the suggested Firestore rules (see network.js header) and enable Email/Password + Anonymous auth providers.</div>';
    });
  },

  render: function (docs) {
    const log = q('#chatLog');
    if (!log) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    if (!docs.length) {
      log.innerHTML = '<div class="chat-sys">' + esc(this.chanLabel()) + ' is quiet. Break the silence, operator.</div>';
      return;
    }
    const self = this;
    const admin = AdminManager.isAdmin();
    log.innerHTML = docs.map(function (m) {
      const mine = m.u === AuthManager.uid;
      return '<div class="cmsg' + (mine ? ' mine' : '') + '">' +
        '<div class="cmeta">' +
        '<span class="cwho">' + esc(m.n || 'OP') + '</span>' +
        (m.a ? '<span class="abadge" title="System administrator">[ADMIN]</span>' : '') +
        (m.g ? '<span class="gbadge" title="Anonymous guest link">[GUEST]</span>' : '') +
        '<span class="cts">' + (m.ts ? fmtTime(m.ts) : '') + '</span>' +
        (admin && m._id ? '<button class="cdel show" data-del="' + esc(m._id) + '" title="Purge message" aria-label="Delete message">×</button>' : '') +
        '</div>' +
        '<div class="ctx">' + esc(m.t || '') + '</div>' +
        '</div>';
    }).join('');
    qa('.cdel', log).forEach(function (b) {
      b.addEventListener('click', function () { self.del(b.dataset.del); });
    });
    if (nearBottom) log.scrollTop = log.scrollHeight;
  },

  send: function () {
    const input = q('#chatInput');
    if (!input) return;
const text = String(input.value || '').trim().slice(0, 240);
    if (!text) return;
    if (!fbOK()) { say('<b>OFFLINE</b><br>Comms need the Firebase link.', 'speech', 2600); blip('bad'); return; }
    if (!AuthManager.user) { AuthManager.ensureAuth('Comms need an operator link — try again in a second.'); return; }
    if (this.channel === 'dm' && !this.dm) { say('Pick a direct-message partner first.', 'speech', 2400); return; }
    const now = Date.now();
    if (now - this.lastSend < this.RATE_MS) {
      say('<b>TRANSMISSION THROTTLED</b><br>1-second cooldown between packets.', 'speech', 2200);
      blip('bad');
      return;
    }
    const col = this.colOf();
    if (!col) return;
    this.lastSend = now;
    const self = this;
    guardedWrite('chat', function () {
      return col.add({
        n: AuthManager.name || 'GUEST', u: AuthManager.uid,
        t: text, ts: Date.now(),
        a: AuthManager.admin ? 1 : 0, g: AuthManager.guest ? 1 : 0
      });
    }).then(function (ok) {
      if (ok) { input.value = ''; blip('flip'); }
    });
  },

  del: function (id) {
    if (!AdminManager.isAdmin() || !fbOK()) {
      say('Unauthorized.', 'shield', 2000);
      return;
    }
    const col = this.colOf();
    if (!col || !id) return;
    guardedWrite('purge-msg', function () { return col.doc(id).delete(); });
    blip('bad');
  },

  /* automated client-side expiry sweep — runs every 5 minutes */
  sweep: function () {
    if (!fbOK() || !this.lastDocs.length) return;
    const now = Date.now(), self = this;
    const admin = AdminManager.isAdmin();
    this.lastDocs.forEach(function (m) {
      if (!m.ts || now - m.ts <= self.EXPIRE_MS) return;
      if (!admin && m.u !== AuthManager.uid) return;   // only purge your own expired packets
      const col = self.colOf();
      if (col && m._id) guardedWrite('expiry-sweep', function () { return col.doc(m._id).delete(); });
    });
  },

  renderNote: function () {
    const el = q('#chatNote');
    if (!el) return;
    let note = '1s rate limit per message · history self-destructs after 7 days · the latest 250 messages are kept';
    if (!fbOK()) note = 'OFFLINE MODE — chat, lounge presence and group sync need FIREBASE_CONFIG.';
    else if (!AuthManager.user) note = 'Establishing guest operator link…';
    else if (this.channel === 'essay') note = NotebookManager.room
      ? 'Bound to notebook room ' + NotebookManager.room + ' — crew chatter for the live essay.'
      : 'General essay chat. Join a notebook ROOM to focus this channel on your crew.';
    el.textContent = note;
  }
};

/* ========================= [6] ADMIN MANAGER =========================
   Designated sysops: usernames 'admin' and 'lucinexon'. Golden [ADMIN]
   badges, [×] message purge, global broadcast banner, audit counts. */
const AdminManager = {
  isAdmin: function () { 
    return !!(AuthManager.user && !AuthManager.guest && AuthManager.admin && ADMIN_UIDS.indexOf(AuthManager.uid) >= 0); 
  },
  apply: function () {
    const bar = q('#chatAdminBar');
    if (bar) bar.hidden = !this.isAdmin() || !fbOK();
    if (this.isAdmin()) this.auditTick();
    AdminBanner.refreshDismiss();
  },
  listen: function () {
    if (!fbOK()) return;
    const self = this;
    try {
      UN.broadcast = DB.collection('broadcasts').doc('latest').onSnapshot(function (snap) {
        AdminBanner.onSnap(snap);
      }, function () {});
    } catch (e) {}
  },
  broadcast: function () {
    if (!this.isAdmin()) {
      say('Access denied — Sysop privileges required.', 'shield', 3000);
      blip('bad');
      return;
    }
    const inp = q('#adminBroadcastIn');
    const text = inp ? String(inp.value || '').trim().slice(0, 120) : '';
    if (!text) { say('Type the alert text first, sysop.', 'antenna', 2200); return; }
    if (!fbOK()) return;
    const self = this;
    guardedWrite('broadcast', function () {
      return DB.collection('broadcasts').doc('latest').set({
        t: text, by: AuthManager.name || 'SYSOP', ts: Date.now()
      });
    }).then(function (ok) {
      if (ok) { if (inp) inp.value = ''; say('<b>BROADCAST DISPATCHED</b><br>Banner deployed to every connected screen.', 'antenna', 3400); blip('level'); }
    });
  },
  auditTick: function () {
    if (!this.isAdmin() || !fbOK()) return;
    const el = q('#adminAudit');
    if (!el) return;
    const active = LoungeEngine.freshCount();
    el.textContent = 'ACTIVE CONNECTIONS: ' + active + ' · WRITES TODAY: ' + QuotaGuard.ledger.w + '/' + QuotaGuard.BUDGET;
    DB.collection('meta').doc('player_count').get().then(function (doc) {
      const n = (doc.exists && doc.data().n) ? doc.data().n : '—';
      el.textContent = 'REGISTERED ACCOUNTS: ' + n + ' · ACTIVE CONNECTIONS: ' + LoungeEngine.freshCount() +
        ' · WRITES TODAY: ' + QuotaGuard.ledger.w + '/' + QuotaGuard.BUDGET;
    }).catch(function () {});
  },
  bind: function () {
    const self = this;
    const bb = q('#adminBroadcastBtn');
    if (bb) bb.addEventListener('click', function () { self.broadcast(); });
    const bi = q('#adminBroadcastIn');
    if (bi) bi.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); self.broadcast(); } });
    setInterval(function () { if (AdminManager.isAdmin() && fbOK()) AdminManager.auditTick(); }, 30000);
  }
};

const AdminBanner = {
  FRESH_MS: 900000,   // banner auto-expires after 15 minutes
  dismissed: 0,
  refreshDismiss: function () {
    try { this.dismissed = parseInt(localStorage.getItem(LS.banner) || '0', 10) || 0; } catch (e) { this.dismissed = 0; }
  },
  onSnap: function (snap) {
    const d = snap.exists ? (snap.data() || {}) : null;
    if (!d || !d.ts || !d.t) { this.hide(); return; }
    const now = Date.now();
    if (now - d.ts > this.FRESH_MS) { this.hide(); return; }
    if (d.ts <= this.dismissed) return;                       // already dismissed this one
    this.show(d);
  },
  show: function (d) {
    const b = q('#sysBanner');
    if (!b) return;
    q('#sysBannerTx').textContent = String(d.t).slice(0, 160) + '  — ' + (d.by || 'SYSOP');
    b.hidden = false;
    document.body.classList.add('sys-banner-on');
    blip('reveal');
  },
  hide: function () {
    const b = q('#sysBanner');
    if (!b) return;
    b.hidden = true;
    document.body.classList.remove('sys-banner-on');
  },
  dismiss: function () {
    try { localStorage.setItem(LS.banner, String(Date.now())); } catch (e) {}
    this.hide();
  }
};

/* ========================= [7] FACADE + BOOT ========================= */
function bindAuthUI() {
  const self = AuthManager;
  let mode = 'login';
  const tabs = qa('.authtab');
  const setMode = function (m) {
    mode = m;
    tabs.forEach(function (t) {
      const on = t.dataset.auth === m;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', String(on));
    });
    const go = q('#authGo');
    if (go) go.textContent = (m === 'login') ? 'LOGIN' : 'CREATE ACCOUNT';
    const res = q('#authResult');
    if (res) { res.hidden = true; res.className = 'byok-result'; }
    const pw = q('#authPass');
    if (pw) pw.setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
  };
  tabs.forEach(function (t) { t.addEventListener('click', function () { setMode(t.dataset.auth); blip('click'); }); });
  const eye = q('#authEye');
  if (eye) eye.addEventListener('click', function () {
    const pw = q('#authPass');
    if (!pw) return;
    pw.type = pw.type === 'password' ? 'text' : 'password';
    eye.textContent = pw.type === 'password' ? 'SHOW' : 'HIDE';
  });
  const go = q('#authGo');
  if (go) go.addEventListener('click', function () {
    const u = (q('#authUser').value || '').trim();
    const p = q('#authPass').value || '';
    const res = q('#authResult');
    const done = function (r) {
      if (r && r.ok) { AuthManager.closeModal(); AuthManager.updateUI(); return; }
      if (res) {
        res.hidden = false;
        res.className = 'byok-result err';
        res.textContent = r && r.err ? r.err : 'LINK ERROR';
      }
      blip('bad');
    };
    if (mode === 'login') self.login(u, p, done);
    else self.register(u, p, done);
  });
  const gu = q('#authGuest');
  if (gu) gu.addEventListener('click', function () {
    self.guestMode(function (r) {
      if (r && r.ok) { self.closeModal(); self.updateUI(); }
      else {
        const res = q('#authResult');
        if (res) { res.hidden = false; res.className = 'byok-result err'; res.textContent = (r && r.err) || 'GUEST LINK FAILED'; }
      }
    });
  });
  const lo = q('#authLogout');
  if (lo) lo.addEventListener('click', function () { self.logout(); self.closeModal(); });
  const cl = q('#authClose');
  if (cl) cl.addEventListener('click', function () { self.closeModal(); });
  const am = q('#authModal');
  if (am) {
    am.addEventListener('click', function (e) { if (e.target === am) self.closeModal(); });
  }
  const ab = q('#authBtn');
  if (ab) ab.addEventListener('click', function () {
    if (!fbOK()) {
      AuthManager.openModal();
      const res = q('#authResult');
      if (res) {
        res.hidden = false; res.className = 'byok-result err';
        res.textContent = 'OFFLINE MODE — paste your Firebase web config into FIREBASE_CONFIG (js/network.js) to enable accounts, lounge and chat.';
      }
      return;
    }
    AuthManager.openModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const m = q('#authModal');
    if (m && !m.hidden) AuthManager.closeModal();
  });
  const bc = q('#sysBannerClose');
  if (bc) bc.addEventListener('click', function () { AdminBanner.dismiss(); blip('click'); });
}

function boot() {
  try {
    QuotaGuard.load();
    const online = fbInit();
    NotebookManager.init();
    LoungeEngine.init();
    ChatEngine.init();
    AdminManager.bind();
    bindAuthUI();
    if (online) {
      AuthManager.init();
      AdminManager.listen();
      AuthManager.updateUI();
      ChatEngine.renderNote();
    } else {
      AuthManager.updateUI();
      ChatEngine.renderNote();
      LoungeEngine.renderRoster();
      LoungeEngine.updateWhoami();
    }
    window.addEventListener('beforeunload', function () {
      try { 
        NotebookManager.saveScratch(); 
        NoteSync.stop(); 
        LoungeEngine.clearPresence(); // Instantly removes player for everyone else
      } catch (e) {}
    });
  } catch (e) {
    if (window.console) console.warn('[codex-net] boot degraded:', e);
  }
}

document.addEventListener('DOMContentLoaded', boot);

/* ---- public API consumed by engine.js ---- */
window.NetworkEngine = {
  onScreen: function (id) {
    LoungeEngine.setActive(id === 'lobby');
    NotebookManager.onScreen(id === 'notebook');
    if (id === 'lobby') ChatEngine.renderNote();
  },
  onStateSave: function () { AuthManager.onStateSave(); },
  openAuth: function () { AuthManager.openModal(); },
  online: function () { return fbOK(); },
  quota: function () { return { writes: QuotaGuard.ledger.w, budget: QuotaGuard.BUDGET, left: QuotaGuard.left() }; },
  AuthManager: AuthManager,
  NotebookManager: NotebookManager,
  LoungeEngine: LoungeEngine,
  ChatEngine: ChatEngine,
  AdminManager: AdminManager
};

})();
