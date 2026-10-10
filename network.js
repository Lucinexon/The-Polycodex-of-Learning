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
  nbroom: 'polymath_codex_nbroom_v1'   // last joined notebook room
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
      }
    } else {
      LoungeEngine.identityChanged();
      ChatEngine.identityChanged();
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
   Dual-pane academic writing terminal. Scratchpad is local-only; group
   rooms sync through group_notes/{code} behind the QuotaGuard debounce
   (1.5s typing pause OR 10s hard interval — never per keystroke). */
const NotebookManager = {
  mode: 'scratch',          // 'scratch' | 'group'
  room: null,               // 4-digit code while in a group room
  roomUnsub: null,
  dirtyLocal: false,        // unsynced local keystrokes
  previewT: null,
  scratchT: null,
  remoteNoticeT: 0,
  COLLAB_FRESH_MS: 150000,  // collaborator considered active for 2.5 min

  editor: function () { return q('#nbEditor'); },

  init: function () {
    const self = this;
    /* mode switching */
    q('#nbScratchBtn').addEventListener('click', function () { self.setMode('scratch'); blip('click'); });
    q('#nbGroupBtn').addEventListener('click', function () { self.setMode('group'); blip('click'); });
    /* room controls */
    q('#nbJoinBtn').addEventListener('click', function () { self.joinRoom(false); });
    q('#nbCreateBtn').addEventListener('click', function () { self.joinRoom(true); });
    q('#nbLeaveBtn').addEventListener('click', function () { self.leaveRoom(); blip('click'); });
    q('#nbRoomInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); self.joinRoom(false); }
    });
    q('#nbRoomInput').addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
    /* editor */
    const ed = this.editor();
    ed.addEventListener('input', function () { self.onInput(); });
    ed.addEventListener('change', function () { self.onInput(); });
    /* toolbar */
    qa('.nbtool').forEach(function (b) {
      b.addEventListener('click', function () { self.tool(b.dataset.nb); blip('click'); });
    });
    /* table popover */
    q('#nbTblGen').addEventListener('click', function () { self.genTable(); blip('flip'); });
    q('#nbTblCancel').addEventListener('click', function () { q('#nbTablePop').hidden = true; });
    /* mobile tabs */
    q('#nbTabEdit').addEventListener('click', function () { self.tab('edit'); blip('click'); });
    q('#nbTabPrev').addEventListener('click', function () { self.tab('preview'); blip('flip'); });
    /* export / copy */
    q('#nbExportBtn').addEventListener('click', function () { self.exportMd(); });
    q('#nbCopyBtn').addEventListener('click', function () { self.copyFormatted(); });
    /* hydrate scratchpad */
    let scratch = '';
    try { scratch = localStorage.getItem(LS.nb) || ''; } catch (e) {}
    ed.value = scratch;
    this.updateMetrics();
    this.renderPreview();
    /* auto-rejoin last room if session was live */
    try {
      const lastRoom = localStorage.getItem(LS.nbroom);
      if (lastRoom && /^\d{4}$/.test(lastRoom)) {
        q('#nbRoomInput').value = lastRoom;
        this.setMode('group', true);
        this.attachRoom(lastRoom, false);
      }
    } catch (e) {}
    this.setSync(this.mode === 'group' && fbOK() ? 'saved' : 'local');
  },

  tab: function (which) {
    const panes = q('.nb-panes');
    if (!panes) return;
    panes.classList.toggle('previewing', which === 'preview');
    q('#nbTabEdit').classList.toggle('on', which === 'edit');
    q('#nbTabPrev').classList.toggle('on', which === 'preview');
    q('#nbTabEdit').setAttribute('aria-selected', String(which === 'edit'));
    q('#nbTabPrev').setAttribute('aria-selected', String(which === 'preview'));
    if (which === 'preview') this.renderPreview(true);
  },

  setMode: function (m, silent) {
    if (m === this.mode && !silent) { /* re-click: just refresh UI */ }
    this.mode = m;
    q('#nbScratchBtn').classList.toggle('on', m === 'scratch');
    q('#nbGroupBtn').classList.toggle('on', m === 'group');
    q('#nbScratchBtn').setAttribute('aria-pressed', String(m === 'scratch'));
    q('#nbGroupBtn').setAttribute('aria-pressed', String(m === 'group'));
    q('#nbRoomRow').hidden = (m !== 'group');
    q('#nbModeChip').textContent = m === 'group' ? (this.room ? 'ROOM ' + this.room : 'GROUP') : 'SCRATCHPAD';
    if (m === 'scratch') {
      /* leaving group mode — flush pending edits, keep content */
      if (this.room) { NoteSync.stop(); this.detachRoom(false); }
      this.setSync('local');
      let scratch = '';
      try { scratch = localStorage.getItem(LS.nb) || ''; } catch (e) {}
      const ed = this.editor();
      if (ed && ed.value !== scratch) { /* keep current buffer as scratch */ }
      this.saveScratch();
      q('#nbCollab').innerHTML = 'Personal scratchpad — stored on this device. Open a <b>GROUP ROOM</b> to co-write essays live with a 4-digit code.';
      this.updateMetrics(); this.renderPreview();
    } else {
      if (!fbOK()) {
        this.setSync('offline');
        q('#nbCollab').innerHTML = '<b style="color:var(--red)">OFFLINE MODE</b> — group rooms need the Firebase link. The scratchpad still works, and .MD export / formatted copy remain fully operational.';
      } else {
        this.setSync('saved');
        q('#nbCollab').innerHTML = 'Enter a <b>4-digit room code</b> and hit JOIN (or CREATE to spawn one). Share the code with your crew — edits sync live after a 1.5-second typing pause.';
      }
      AuthManager.ensureAuth('Group rooms and live sync need an operator link.');
    }
  },

  joinRoom: function (create) {
    const inp = q('#nbRoomInput');
    const code = String(inp.value || '').replace(/\D/g, '');
    if (!/^\d{4}$/.test(code)) { say('<b>ROOM CODE</b><br>Enter exactly 4 digits (e.g. 4091).', 'doc', 3000); blip('bad'); return; }
    if (!fbOK()) { say('<b>OFFLINE</b><br>Configure FIREBASE_CONFIG to open group rooms.', 'doc', 3000); blip('bad'); return; }
    AuthManager.ensureAuth('Group rooms need an operator link.');
    this.attachRoom(code, create);
  },

  attachRoom: function (code, create) {
    const self = this;
    if (!AuthManager.user) { say('Awaiting operator link — try again in a second.', 'power', 2600); return; }
    const ref = DB.collection('group_notes').doc(code);
    ref.get().then(function (doc) {
      if (!doc.exists && !create) {
        say('<b>ROOM ' + esc(code) + ' NOT FOUND</b><br>Double-check the code, or hit CREATE to spawn it.', 'doc', 3400);
        blip('bad');
        return;
      }
      if (!doc.exists && create) {
        guardedWrite('create-room', function () {
          return ref.set({
            code: code, md: self.editor() ? self.editor().value : '',
            updatedBy: AuthManager.uid, updatedName: AuthManager.name || 'OPERATOR',
            coll: {}, ts: Date.now(), created: Date.now()
          });
        });
        say('<b>ROOM ' + esc(code) + ' CREATED</b><br>Share the code — crew edits sync live.', 'coin', 3600);
      } else {
        say('<b>LINKED TO ROOM ' + esc(code) + '</b><br>Live essay channel bound to #essay-group.', 'coin', 3200);
      }
      blip('ok');
      self.room = code;
      try { localStorage.setItem(LS.nbroom, code); } catch (e) {}
      self.mode = 'group';
      q('#nbScratchBtn').classList.remove('on'); q('#nbGroupBtn').classList.add('on');
      q('#nbScratchBtn').setAttribute('aria-pressed', 'false'); q('#nbGroupBtn').setAttribute('aria-pressed', 'true');
      q('#nbRoomRow').hidden = false;
      q('#nbModeChip').textContent = 'ROOM ' + code;
      /* adopt remote content when entering */
      if (doc.exists) {
        const d = doc.data() || {};
        const ed = self.editor();
        if (ed && typeof d.md === 'string' && !self.dirtyLocal) {
          ed.value = d.md; self.updateMetrics(); self.renderPreview();
        }
        self.renderCollab(d.coll || {});
      }
      self.setSync('saved');
      NoteSync.dirty = false;
      self.detachRoom(true);
      self.roomUnsub = ref.onSnapshot(function (snap) { self.onRoomSnap(snap); }, function () {});
      ChatEngine.onRoomChanged(code);
    }).catch(function () {
      say('<b>ROOM LINK FAILED</b><br>Orbit relay unreachable — try again.', 'doc', 3000);
    });
  },

  detachRoom: function (keepRoomVar) {
    if (this.roomUnsub) { try { this.roomUnsub(); } catch (e) {} this.roomUnsub = null; }
    if (!keepRoomVar) {
      this.room = null;
      try { localStorage.removeItem(LS.nbroom); } catch (e) {}
      q('#nbModeChip').textContent = 'GROUP';
      ChatEngine.onRoomChanged(null);
    }
  },

  leaveRoom: function () {
    NoteSync.stop();
    this.dirtyLocal = false;
    this.detachRoom(false);
    this.setSync('local');
    q('#nbCollab').innerHTML = 'Left the group room. The buffer below stays yours — switch back to <b>SCRATCHPAD</b> mode to store it locally.';
    blip('flip');
  },

  onRoomSnap: function (snap) {
    if (!snap.exists) { /* room deleted upstream */ return; }
    const d = snap.data() || {};
    this.renderCollab(d.coll || {});
    const remoteMd = typeof d.md === 'string' ? d.md : '';
    if (d.updatedBy === AuthManager.uid) return;               // our own echo
    const ed = this.editor();
    if (!ed) return;
    if (this.dirtyLocal) {
      /* local unsynced edits win until the next flush — surface the merge note */
      const now = Date.now();
      if (now - this.remoteNoticeT > 20000) {
        this.remoteNoticeT = now;
        say('<b>REMOTE EDIT DETECTED</b><br>' + esc(d.updatedName || 'A collaborator') + ' pushed changes — your pending edits flush in a moment.', 'doc', 3400);
      }
      return;
    }
    if (ed.value !== remoteMd) {
      ed.value = remoteMd;
      this.updateMetrics(); this.renderPreview();
    }
  },

  renderCollab: function (coll) {
    const now = Date.now(), names = [];
    Object.keys(coll || {}).forEach(function (uid) {
      const c = coll[uid];
      if (c && c.n && (now - (c.ts || 0)) < NotebookManager.COLLAB_FRESH_MS) names.push(c.n);
    });
    if (AuthManager.name && names.indexOf(AuthManager.name) < 0) names.push(AuthManager.name);
    q('#nbCollab').innerHTML = 'GROUP ROOM <b>' + esc(this.room || '----') + '</b> · Collaborators: <b>[' +
      (names.length ? names.slice(0, 8).map(esc).join(', ') : '—you—') + ']</b>' +
      (names.length > 8 ? ' +' + (names.length - 8) : '') +
      '<br>Sync contract: 1.5-second typing pause or 10-second interval — keystrokes never burn the write quota.';
  },

  onInput: function () {
    const ed = this.editor();
    if (!ed) return;
    if (this.mode === 'group' && this.room && fbOK()) {
      NoteSync.tap();                       // QuotaGuard debounce path
    } else {
      this.setSync('local');
      this.saveScratchDebounced();
    }
    this.updateMetrics();
    this.schedulePreview();
  },

  saveScratchDebounced: function () {
    const self = this;
    clearTimeout(this.scratchT);
    this.scratchT = setTimeout(function () { self.saveScratch(); }, 500);
  },
  saveScratch: function () {
    const ed = this.editor();
    if (!ed) return;
    if (this.mode === 'group' && this.room) return;   // never overwrite the personal scratchpad with a shared room's text
    try { localStorage.setItem(LS.nb, ed.value); } catch (e) {}
  },

  flushRoom: function () {
    const self = this;
    if (this.mode !== 'group' || !this.room || !fbOK() || !AuthManager.uid) { this.setSync(this.mode === 'group' && this.room ? 'buffering' : 'local'); return; }
    const ed = this.editor();
    const md = ed ? ed.value : '';
    this.setSync('syncing');
    const uid = AuthManager.uid, name = AuthManager.name || 'OPERATOR';
    guardedWrite('note-sync', function () {
      const coll = {};
      coll[uid] = { n: name, ts: Date.now() };
      return DB.collection('group_notes').doc(self.room).set({
        code: self.room, md: md, updatedBy: uid, updatedName: name,
        coll: coll, ts: Date.now()
      }, { merge: true });
    }).then(function (ok) { self.setSync(ok ? 'saved' : 'buffering'); });
  },

  setSync: function (state) {
    const wrap = q('#nbSync'), dot = q('#nbSyncDot'), tx = q('#nbSyncTx');
    if (!wrap || !dot || !tx) return;
    wrap.classList.remove('saved', 'buffering', 'syncing', 'offline');
    if (state === 'saved') { wrap.classList.add('saved'); tx.textContent = '● SAVED TO CLOUD'; }
    else if (state === 'buffering') { wrap.classList.add('buffering'); tx.textContent = '○ BUFFERING EDITS…'; }
    else if (state === 'syncing') { wrap.classList.add('syncing'); tx.textContent = '⚡ SYNCING'; }
    else if (state === 'offline') { wrap.classList.add('offline'); tx.textContent = '○ OFFLINE'; }
    else { tx.textContent = '● LOCAL'; }
  },

  /* ---- toolbar ---- */
  tool: function (what) {
    const ed = this.editor();
    if (!ed) return;
    ed.focus();
    const s = ed.selectionStart, e = ed.selectionEnd, v = ed.value, sel = v.slice(s, e);
    const set = function (text, caretStart, caretEnd) {
      const before = ed.scrollTop;
      ed.value = text;
      if (caretStart != null) { ed.selectionStart = caretStart; ed.selectionEnd = caretEnd == null ? caretStart : caretEnd; }
      ed.scrollTop = before;
      NotebookManager.onInput();
    };
    if (what === 'h1' || what === 'h2' || what === 'h3' || what === 'quote') {
      const marks = { h1: '# ', h2: '## ', h3: '### ', quote: '> ' };
      const lineStart = s > 0 ? v.lastIndexOf('\n', s - 1) + 1 : 0;
      const prefix = marks[what];
      const already = v.slice(lineStart, lineStart + prefix.length) === prefix;
      const next = already
        ? v.slice(0, lineStart) + v.slice(lineStart + prefix.length)
        : v.slice(0, lineStart) + prefix + v.slice(lineStart);
      const delta = already ? -prefix.length : prefix.length;
      set(next, s + delta, e + delta);
    } else if (what === 'bold') {
      const out = v.slice(0, s) + '**' + (sel || 'bold text') + '**' + v.slice(e);
      set(out, s + 2, s + 2 + (sel || 'bold text').length);
    } else if (what === 'italic') {
      const out = v.slice(0, s) + '*' + (sel || 'italic text') + '*' + v.slice(e);
      set(out, s + 1, s + 1 + (sel || 'italic text').length);
    } else if (what === 'code') {
      const body = sel || 'printf("hello, cosmos");';
      const out = v.slice(0, s) + '\n~~~\n' + body + '\n~~~\n' + v.slice(e);
      set(out, s + 5, s + 5 + body.length);
    } else if (what === 'math') {
      const body = sel || 'E = mc^2';
      const out = v.slice(0, s) + '$' + body + '$' + v.slice(e);
      set(out, s + 1, s + 1 + body.length);
    } else if (what === 'cite') {
      let n = 1;
      const used = v.match(/\[\^(\d+)\]/g) || [];
      used.forEach(function (m) { const k = parseInt(m.replace(/\D/g, ''), 10); if (k >= n) n = k + 1; });
      const tag = '[^' + n + ']';
      const tail = '\n\n' + tag + ': Source — author, "title", publication, year, page. ';
      const out = v.slice(0, e) + tag + v.slice(e) + tail;
      set(out, e + tag.length, null);
      const ed2 = this.editor();
      const cpos = out.length;
      ed2.selectionStart = ed2.selectionEnd = cpos;
    } else if (what === 'table') {
      const pop = q('#nbTablePop');
      pop.hidden = !pop.hidden;
    }
  },

  genTable: function () {
    const rows = Math.max(2, Math.min(12, parseInt(q('#nbTblRows').value || '3', 10)));
    const cols = Math.max(2, Math.min(8, parseInt(q('#nbTblCols').value || '3', 10)));
    const ed = this.editor();
    if (!ed) return;
    let out = '\n';
    const cell = function (r, c) { return (r === 0 ? 'Header ' + (c + 1) : '—'); };
    for (let r = 0; r < rows; r++) {
      const cells = [];
      for (let c = 0; c < cols; c++) cells.push(cell(r, c));
      out += '| ' + cells.join(' | ') + ' |\n';
      if (r === 0) out += '|' + ' --- |'.repeat(cols).slice(1) + '\n';
    }
    const s = ed.selectionStart;
    ed.value = ed.value.slice(0, s) + out + '\n' + ed.value.slice(ed.selectionEnd);
    ed.selectionStart = ed.selectionEnd = s + out.length + 1;
    q('#nbTablePop').hidden = true;
    this.onInput();
    ed.focus();
  },

  /* ---- metrics + preview ---- */
  updateMetrics: function () {
    const ed = this.editor();
    const text = ed ? ed.value : '';
    const words = (text.trim().match(/\S+/g) || []).length;
    const chars = text.length;
    const mins = words / 200;
    const pages = words / 500;
    q('#nbWords').textContent = words + ' WORDS';
    q('#nbChars').textContent = chars + ' CHARS';
    q('#nbRead').textContent = '~' + Math.max(words ? 1 : 0, Math.round(mins)) + ' MIN READ';
    q('#nbPages').textContent = (Math.round(pages * 10) / 10).toFixed(1) + ' PAGES';
  },
  schedulePreview: function () {
    const self = this;
    clearTimeout(this.previewT);
    this.previewT = setTimeout(function () { self.renderPreview(); }, 140);
  },
  renderPreview: function (force) {
    const pv = q('#nbPreview'), ed = this.editor();
    if (!pv || !ed) return;
    const md = ed.value || '';
    if (!md.trim()) {
      pv.innerHTML = '<p class="small">The formatted preview renders here — headings, tables, KaTeX formulas and citations included.</p>';
      return;
    }
    let html;
    if (typeof window.mdBlock === 'function') html = window.mdBlock(md);
    else html = '<p>' + esc(md).replace(/\n/g, '<br>') + '</p>';
    pv.innerHTML = html;
    if (typeof window.typeset === 'function') window.typeset(pv);
  },

  /* ---- export & clipboard ---- */
  exportMd: function () {
    const ed = this.editor();
    if (!ed) return;
    this.saveScratch();
    const name = (this.mode === 'group' && this.room ? 'polymath-notebook-room' + this.room : 'polymath-scratchpad') + '-' + dayKey() + '.md';
    try {
      const blob = new Blob([ed.value], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      say('<b>EXPORTED</b><br>' + esc(name) + ' written to your downloads.', 'doc', 3200);
      blip('ok');
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
    if (typeof window.mdBlock === 'function') html = window.mdBlock(md);
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
    if (active) {
      this.updateMetrics();
      this.renderPreview(true);
      if (this.mode === 'group' && !this.room) AuthManager.ensureAuth('Group rooms need an operator link.');
    } else {
      /* leaving the notebook — persist everything, flush group buffer */
      this.saveScratch();
      NoteSync.flush();
    }
  }
};

/* ========================= [4] LOUNGE ENGINE =========================
   Cozy 2D observation deck beneath the surface: rising marine snow, a
   drifting whale + jellyfish, light shafts, grated floor. Operators render as retro
   astronaut sprites with nameplates + level chips. Click the deck to
   walk; presence heartbeats to lobby_presence at most every 15 seconds. */
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
    if (!fbOK() || !AuthManager.user || this.presUnsub) return;
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
    if (this.presUnsub && !AuthManager.user) {
      try { this.presUnsub(); } catch (e) {}
      this.presUnsub = null;
    }
  },

  clearPresence: function () {
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
  },

  beat: function (force) {
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
      esc(AuthManager.name || 'GUEST') + (AuthManager.admin ? ' ★SYSOP' : (AuthManager.guest ? ' ·GUEST' : '')) + '</b>';
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
    mv(this.me, 62);
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
    g.addColorStop(0, 'rgba(140,230,255,.46)'); g.addColorStop(0.45, 'rgba(48,150,190,.17)'); g.addColorStop(1, 'rgba(0,0,0,0)');
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
    bg.addColorStop(0, '#05283a'); bg.addColorStop(1, '#02111a');
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
    c.fillStyle = '#06232f';
    c.fillRect(0, 0, 5, this.FLOOR_Y); c.fillRect(this.W - 5, 0, 5, this.FLOOR_Y);
    c.fillRect(158, 0, 5, this.FLOOR_Y); c.fillRect(317, 0, 5, this.FLOOR_Y);
    c.fillStyle = '#0f4a5e';
    c.fillRect(158, 0, 2, this.FLOOR_Y); c.fillRect(317, 0, 2, this.FLOOR_Y);
    /* deck floor */
    c.fillStyle = '#051b27'; c.fillRect(0, this.FLOOR_Y, this.W, this.H - this.FLOOR_Y);
    c.fillStyle = '#0a3042'; c.fillRect(0, this.FLOOR_Y, this.W, 6);
    c.fillStyle = '#1a6a80'; c.fillRect(0, this.FLOOR_Y, this.W, 2);
    c.strokeStyle = 'rgba(95,208,238,.10)';
    c.beginPath();
    for (let gx = 40; gx < this.W; gx += 40) { c.moveTo(gx + .5, this.FLOOR_Y + 6); c.lineTo(gx + .5, this.H); }
    for (let gy = this.FLOOR_Y + 44; gy < this.H; gy += 42) { c.moveTo(0, gy + .5); c.lineTo(this.W, gy + .5); }
    c.stroke();
    c.fillStyle = 'rgba(255,200,116,.35)';
    for (let rx = 20; rx < this.W; rx += 40) { c.fillRect(rx, this.FLOOR_Y + 12, 2, 2); c.fillRect(rx, this.H - 8, 2, 2); }
    /* status text when offline / unlinked */
    if (!fbOK() || !AuthManager.user) {
      c.fillStyle = 'rgba(2,14,22,.72)'; c.fillRect(0, 78, this.W, 34);
      c.fillStyle = !fbOK() ? '#ff7b8a' : '#ffc874';
      c.font = 'bold 10px "Atkinson Hyperlegible", sans-serif';
      c.textAlign = 'center';
      c.fillText(!fbOK() ? 'OFFLINE MODE — FIREBASE LINK REQUIRED FOR OTHER OPERATORS'
                        : 'ESTABLISHING OPERATOR LINK…', this.W / 2, 98);
      c.textAlign = 'left';
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
