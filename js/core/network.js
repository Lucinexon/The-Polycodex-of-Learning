/* ==========================================================================
   THE POLYMATH CODEX — network.js
   Multiplayer · social · academic productivity layer. Zero-build, retro-safe.

   MODULE MAP
   ──────────────────────────────────────────────────────────────────────────
   QuotaGuard        Firebase Spark armor: 1.5s-typing-debounce note sync,
                     10s hard sync interval, 15s presence heartbeat throttle,
                     250-message chat caps, 7d message expiry sweep, and a
                     self-imposed daily write budget (19k < 20k Spark limit).
  AuthManager       Email/password, legacy synthetic username aliases, Google
              sign-in, anonymous guest mode, and cloud profile sync.
   NotebookManager   Obsidian-style vaults + 6-digit room vaults, academic toolbar,
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
    // V5 room doc: { code, vault: { meta: {name, icon, color, owner, lock, ban, members}, notes: {id: {t, md, ts, by, pin}} } }
    // Roles (owner/editor/viewer) are enforced by the app; the 6-digit code is the access secret.
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
  Legacy username accounts map to synthetic internal addresses; newer
  accounts use real email addresses and verification. Google sign-in can link
  an anonymous guest account without changing its UID. */
const AuthManager = {
  user: null, uid: null, name: null,
  guest: true, admin: false, busy: false, viaGoogle: false, verified: false,
  authResolved: false, lastPush: 0, pushPending: false, PUSH_MIN_MS: 30000,

  emailOf: function (username) {
    return String(username).toLowerCase().replace(/[^a-z0-9]/g, '') + '@codex.local';
  },
  validName: function (u) { return /^[A-Za-z0-9_]{3,18}$/.test(String(u || '')); },
  validEmail: function (e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim()); },
  mailOK: function () { return !!(this.user && !this.guest && (this.viaGoogle || this.verified)); },

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
    this.viaGoogle = !!(user && (user.providerData || []).some(function (p) { return p.providerId === 'google.com'; }));
    this.verified = !!(this.viaGoogle || (user && user.emailVerified && !/@codex\.local$/i.test(user.email || '')));

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

  register: function (uname, pass, done, email) {
    if (!fbOK()) { done({ err: 'OFFLINE — Firebase link not configured on this deployment.' }); return; }
    if (!this.validName(uname)) { done({ err: 'USERNAME: 3–18 chars, letters / digits / underscore.' }); return; }
    if (!pass || String(pass).length < 6) { done({ err: 'PASSWORD: minimum 6 characters.' }); return; }
    email = String(email || '').trim();
    if (email && !this.validEmail(email)) { done({ err: 'Enter a valid email address.' }); return; }
    const self = this;
    AUTH.createUserWithEmailAndPassword(email || this.emailOf(uname), String(pass)).then(function (cred) {
      const u = cred.user;
      self.name = uname; self.viaGoogle = false; self.verified = false;
      return u.updateProfile({ displayName: uname }).then(function () {
        return email ? u.sendEmailVerification() : null;
      }).then(function () {
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
        self.onAuth(AUTH.currentUser);
        blip('level');
        say('<b>OPERATOR REGISTERED</b><br>Welcome, ' + esc(uname) + ' — cloud profile online.', 'coin', 4200);
        done({ ok: true });
      });
    }).catch(function (err) { done({ err: authErr(err) }); });
  },

  login: function (uname, pass, done) {
    if (!fbOK()) { done({ err: 'OFFLINE — Firebase link not configured on this deployment.' }); return; }
    uname = String(uname || '').trim();
    const email = this.validEmail(uname) ? uname : (this.validName(uname) ? this.emailOf(uname) : '');
    if (!email) { done({ err: 'Enter a valid username or email address.' }); return; }
    const self = this;
    AUTH.signInWithEmailAndPassword(email, String(pass))
      .then(function (cred) { self.onAuth(cred.user); blip('ok'); say('<b>LINK RESTORED</b><br>Cloud profile hydrated from the orbital archive.', 'coin', 3800); done({ ok: true }); })
      .catch(function (err) { done({ err: authErr(err) }); });
  },

  guestMode: function (done) {
    if (!fbOK()) { done({ err: 'OFFLINE — Firebase link not configured on this deployment.' }); return; }
    if (this.user) { done({ ok: true }); return; }
    const self = this;
    AUTH.signInAnonymously().then(function () { done({ ok: true }); })
      .catch(function (err) { done({ err: authErr(err) }); });
  },

  google: function (done) {
    if (!fbOK() || !window.firebase.auth.GoogleAuthProvider) { done({ err: 'Google sign-in is unavailable on this deployment.' }); return; }
    const self = this, provider = new window.firebase.auth.GoogleAuthProvider();
    const current = this.user;
    const request = current && current.isAnonymous ? current.linkWithPopup(provider) : AUTH.signInWithPopup(provider);
    request.then(function (result) {
      self.onAuth(result.user); self.viaGoogle = true; self.verified = true; self.updateUI(); done({ ok: true });
    }).catch(function (err) { done({ err: authErr(err) }); });
  },

  resetPassword: function (identity, done) {
    if (!fbOK()) { done({ err: 'OFFLINE — Firebase link not configured on this deployment.' }); return; }
    identity = String(identity || '').trim();
    const email = this.validEmail(identity) ? identity : (this.validName(identity) ? this.emailOf(identity) : '');
    if (!email) { done({ err: 'Enter a valid username or email address.' }); return; }
    if (/@codex\.local$/i.test(email)) { done({ err: 'This legacy account has no recovery email. Sign in and add a real email first.' }); return; }
    AUTH.sendPasswordResetEmail(email).then(function () { done({ ok: true }); })
      .catch(function (err) { done({ err: authErr(err) }); });
  },

  changeUsername: function (username, password, done) {
    if (!fbOK() || !this.user || this.guest) { done({ err: 'Sign in to change your username.' }); return; }
    username = String(username || '').trim();
    if (!this.validName(username)) { done({ err: 'USERNAME: 3–18 chars, letters / digits / underscore.' }); return; }
    const self = this, user = this.user, oldEmail = user.email || '';
    DB.collection('players').where('name', '==', username).limit(2).get().then(function (snap) {
      const taken = snap.docs.some(function (doc) { return doc.id !== self.uid; });
      if (taken) { done({ err: 'That username is already in use.' }); return; }
      let rename = Promise.resolve();
      if (/@codex\.local$/i.test(oldEmail)) {
        if (!password) { done({ err: 'Enter your password to confirm this username change.' }); return; }
        const credential = window.firebase.auth.EmailAuthProvider.credential(oldEmail, String(password));
        rename = user.reauthenticateWithCredential(credential).then(function () { return user.updateEmail(self.emailOf(username)); });
      }
      rename.then(function () { return user.updateProfile({ displayName: username }); }).then(function () {
        self.name = username; self.pushProfile(true); self.updateUI(); done({ ok: true });
      }).catch(function (err) { done({ err: authErr(err) }); });
    }).catch(function (err) { done({ err: authErr(err) }); });
  },

  addEmail: function (email, password, done) {
    if (!fbOK() || !this.user) { done({ err: 'Sign in before adding an email.' }); return; }
    email = String(email || '').trim();
    if (!this.validEmail(email)) { done({ err: 'Enter a valid email address.' }); return; }
    const self = this, user = this.user, Auth = window.firebase.auth;
    let update;
    if (user.isAnonymous) {
      if (!password || String(password).length < 6) { done({ err: 'PASSWORD: minimum 6 characters.' }); return; }
      update = user.linkWithCredential(Auth.EmailAuthProvider.credential(email, String(password))).then(function (result) { self.user = result.user; });
    } else if (/@codex\.local$/i.test(user.email || '')) {
      if (!password) { done({ err: 'Enter your password to confirm this email change.' }); return; }
      const credential = Auth.EmailAuthProvider.credential(user.email, String(password));
      update = user.reauthenticateWithCredential(credential).then(function () { return user.updateEmail(email); });
    } else if (user.email === email) update = Promise.resolve();
    else update = user.updateEmail(email);
    update.then(function () { return self.user.sendEmailVerification(); }).then(function () {
      self.verified = false; self.viaGoogle = false; self.updateUI(); done({ ok: true });
    }).catch(function (err) { done({ err: authErr(err) }); });
  },

  sendVerify: function (done) {
    if (!fbOK() || !this.user || this.guest || !this.user.email || /@codex\.local$/i.test(this.user.email)) {
      done({ err: 'Add a valid email before requesting verification.' }); return;
    }
    this.user.sendEmailVerification().then(function () { done({ ok: true }); })
      .catch(function (err) { done({ err: authErr(err) }); });
  },

  refreshUser: function (done) {
    if (!fbOK() || !this.user) { done({ err: 'No signed-in account to refresh.' }); return; }
    const self = this, user = this.user;
    user.reload().then(function () { self.onAuth(AUTH.currentUser || user); done({ ok: true }); })
      .catch(function (err) { done({ err: authErr(err) }); });
  },

  lookup: function (prefix, done) {
    prefix = String(prefix || '').trim();
    if (!fbOK() || !this.user || prefix.length < 2) { done([]); return; }
    DB.collection('players').orderBy('name').startAt(prefix).endAt(prefix + '\uf8ff').limit(20).get().then(function (snap) {
      done(snap.docs.map(function (doc) {
        const data = doc.data() || {};
        return { uid: doc.id, name: String(data.name || 'Operator'), level: data.level || 1, avatar: String(data.avatar || '') };
      }).filter(function (player) { return player.uid !== AuthManager.uid; }));
    }).catch(function () { done([]); });
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
      name: this.name || 'OPERATOR', avatar: window.CodexAvatar ? window.CodexAvatar.mine() || '' : '', guest: this.guest, admin: this.admin,
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
    if (window.CodexAvatar && this.uid && d.avatar) {
      const code = ChatEngine.normalizeAvatar(d.avatar);
      if (code) window.CodexAvatar.set(code, true);
    }
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
  if (code.indexOf('email-already-in-use') >= 0) return 'EMAIL ALREADY REGISTERED — try signing in instead.';
  if (code.indexOf('invalid-email') >= 0) return 'EMAIL ADDRESS INVALID — check the address and try again.';
  if (code.indexOf('weak-password') >= 0) return 'PASSWORD TOO WEAK — 6 characters minimum.';
  if (code.indexOf('user-not-found') >= 0 || code.indexOf('wrong-password') >= 0 || code.indexOf('invalid-credential') >= 0) return 'ACCESS DENIED — unknown username or wrong password.';
  if (code.indexOf('too-many-requests') >= 0) return 'THROTTLED — too many attempts, wait a moment.';
  if (code.indexOf('network') >= 0) return 'NETWORK UNREACHABLE — check the uplink.';
  if (code.indexOf('requires-recent-login') >= 0) return 'SIGN IN AGAIN — Firebase requires a recent login for this change.';
  if (code.indexOf('popup-closed-by-user') >= 0) return 'Google sign-in was cancelled.';
  if (code.indexOf('unauthorized-domain') >= 0) return 'FIREBASE CONFIG — authorize this domain for Google sign-in.';
  if (code.indexOf('operation-not-allowed') >= 0) return 'FIREBASE CONFIG — enable Email/Password, Anonymous, and Google providers in the console.';
  return 'LINK ERROR — ' + (code || 'unknown fault');
}

/* ========================= [3] NOTEBOOK MANAGER =========================
   Obsidian-style vault. A quiet markdown editor with a notes list, [[wikilinks]]
   + backlinks, a "/" insert menu, a Ctrl/Cmd+P palette and Edit / Split /
   Reading views. Notes live on this device (localStorage). A shared room is just
   another document: it syncs through group_notes/{code} behind the QuotaGuard
   debounce (1.5 s typing pause OR 10 s hard interval — never per keystroke) and
   never touches your local notes. Leaving a room keeps a copy as a normal note. */
/* ===== V5 NOTEBOOK (refactored) =====================================================================
   Obsidian-style vaults: local vaults + shared rooms (6-digit codes) where every room is itself a vault.
   Scoped in its own closure so it cannot collide with anything above or below. PUBLIC CONTRACT (used elsewhere):
   init · onScreen · identityChanged · saveScratch · room (chat binding) · setSync/flushRoom (legacy no-ops).
   Room docs live in group_notes/{code}: { code, vault: { meta, notes }, ts } — legacy {md} docs upgrade in place. */
const NotebookManager = (function () {
const $1 = (s, r) => (r || document).querySelector(s), $A = (s, r) => Array.from((r || document).querySelectorAll(s));
const ld = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v, (a, b) => a[0] === '_' ? undefined : b)); return true; } catch (e) { toast('<b>Storage full</b><br>Export a vault to free space.', 'trash'); return false; } };
const K = { idx: 'cx_v5_idx', v: 'cx_v5_v_', pref: 'cx_v5_pref', rooms: 'cx_v5_rooms', srs: 'cx_v5_srs' };
const bdg = id => { try { if (typeof award === 'function') award(id); } catch (e) {} };
const ICONS = ['📚', '🧠', '🔭', '🧪', '🛰️', '🌊', '🎮', '📜', '🧬', '🪐', '⚡', '🌱'], COLORS = ['#5fd0ee', '#46f0c4', '#a99cff', '#ff7ec9', '#ffc874', '#ff7b8a', '#9ad66b'];
const FONTS = { sans: 'var(--ui)', serif: 'Georgia,"Times New Roman",serif', mono: 'ui-monospace,Menlo,Consolas,monospace' }, WIDTHS = { narrow: '620px', normal: '800px', wide: '1100px' };
const WELCOME = '# Welcome to your vault\n\n- Link notes with `[[double brackets]]`. In Read view, click a link to jump to it (or create it).\n- Folders come from slashes: a note titled `Physics/Entropy` lives in **Physics**.\n- Add #tags anywhere and filter by them in the sidebar.\n- Write `Term :: definition` on its own line to make a flashcard (🃏).\n- Press 📎 on any lesson block to clip it into `Clips/`.\n';
const ROOM_WELCOME = '# Team notes\n\nEveryone in this room shares this vault live. Link notes with `[[…]]` and manage roles from the 👥 panel.\n';
const TPL = { Cornell: '## Cues\n- \n\n## Notes\n- \n\n## Summary\n', Meeting: '## Agenda\n- \n\n## Decisions\n- \n\n## Actions\n- [ ] \n', 'Lesson recap': '## What I learned\n- \n\n## Key terms\nTerm :: definition\n\n## Questions\n- \n' };

let IDX, ROOMS, P, CUR = null, curId = null, built = false, RM = null, FILT = '', COL = {};
let tSave = 0, tRead = 0, tTree = 0, tBack = 0, DECK = [], CI = 0, FLIP = 0, GOT = 0;
const uid8 = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const mk = (t, md) => ({ id: 'n' + uid8(), t, md: md || '', ts: Date.now() });
const NE = () => ({ AuthManager: AuthManager, online: fbOK, db: function () { return DB; }, guardedWrite: guardedWrite }), FV = () => firebase.firestore.FieldValue.delete();
const me = () => { const A = NE().AuthManager || {}; return { uid: A.uid || null, name: A.name || 'OPERATOR' }; };
const cur = () => CUR && CUR.notes[curId], norm = s => String(s).trim().toLowerCase();
const role = () => CUR.kind === 'local' ? 'owner' : ((CUR.meta.members || {})[me().uid] || {}).r || 'viewer';
const canEdit = () => role() !== 'viewer', isOwner = () => role() === 'owner';
const meta = v => ({ id: v.id, name: v.name, icon: v.icon, color: v.color });
const sp = () => sv(K.pref, P), setBody = h => { const b = $1('#modalBody'); if (b) b.innerHTML = h; }, dlg = (t, h) => openModal(h, t);
const clean = h => window.DOMPurify ? DOMPurify.sanitize(h, { ADD_ATTR: ['data-t', 'data-b'], FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe'], FORBID_ATTR: ['style'] }) : h.replace(/<[^>]*>/g, '');
function xp(n) { const d = new Date().toDateString(), r = ld('cx_v5_xp', { d, n: 0 }); if (r.d !== d) { r.d = d; r.n = 0; } if (r.n >= 30) return; r.n += n; sv('cx_v5_xp', r); gainXP(n, true); }

/* ================= DATA ================= */
function boot() {
  if (IDX) return;
  IDX = ld(K.idx, null); ROOMS = ld(K.rooms, []);
  P = Object.assign({ font: 'sans', size: 16, width: 'normal', view: 'edit', side: 1, roomOn: null }, ld(K.pref, {}));
  if (!IDX || !IDX.vaults || !IDX.vaults.length) {
    const v = { id: uid8(), name: 'My Vault', icon: '📚', color: COLORS[0], notes: {} };
    try { ((JSON.parse(localStorage.getItem('polymath_codex_vault_v1') || 'null') || {}).notes || []).forEach(n => { v.notes[n.id] = { id: n.id, t: n.title || 'Untitled', md: n.md || '', ts: n.ts || Date.now() }; }); } catch (e) {}
    try { const sp = localStorage.getItem('polymath_codex_nb_v1'); if (!Object.keys(v.notes).length && sp && sp.trim()) { const x = mk('Scratchpad', sp); v.notes[x.id] = x; } } catch (e) {}
    if (!Object.keys(v.notes).length) { const w = mk('Welcome', WELCOME); v.notes[w.id] = w; }
    sv(K.v + v.id, v); IDX = { active: v.id, vaults: [meta(v)] }; sv(K.idx, IDX);
  }
  if (!CUR) loadLocal(IDX.active);
}
function loadLocal(id) {
  const v = ld(K.v + id, null) || ld(K.v + IDX.vaults[0].id, null); if (!v) return;
  CUR = Object.assign({ kind: 'local' }, v); IDX.active = v.id; sv(K.idx, IDX);
  curId = Object.keys(CUR.notes).sort((a, b) => CUR.notes[b].ts - CUR.notes[a].ts)[0] || null;
}
function saveLocal() {
  if (!CUR || CUR.kind !== 'local') return;
  const o = Object.assign({}, CUR); delete o.kind; sv(K.v + CUR.id, o);
  const m = IDX.vaults.find(x => x.id === CUR.id); if (m) Object.assign(m, meta(CUR)); sv(K.idx, IDX);
}
function touch(n) {
  n.ts = Date.now();
  if (CUR.kind === 'local') { clearTimeout(tSave); tSave = setTimeout(saveLocal, 600); setSync('local'); }
  else if (RM) { RM.pending['vault.notes.' + n.id] = { t: n.t, md: n.md, ts: n.ts, by: me().uid, pin: n.pin ? 1 : 0 }; sched(); }
}
function setSync(s) { const e = $1('#vxSync'); if (e) { e.textContent = { local: 'Saved on this device', buf: 'Unsynced…', sync: 'Syncing…', ok: 'Synced · live', off: 'Offline · changes kept' }[s] || ''; e.dataset.s = s; } }

/* ================= ROOMS (cloud vaults) ================= */
function sched() { setSync('buf'); clearTimeout(RM.t); RM.t = setTimeout(flush, 1500); }
function flush() {
  if (!RM) return; clearTimeout(RM.t);
  if (!Object.keys(RM.pending).length) return;
  const n = NE(); if (!n.guardedWrite) { setSync('off'); return; }
  const r = RM, up = r.pending; r.pending = {}; up.ts = Date.now(); setSync('sync');
  n.guardedWrite('vault-sync', () => r.ref.update(up)).then(ok => {
    if (RM !== r) return;
    if (ok) setSync(Object.keys(r.pending).length ? 'buf' : 'ok');
    else { delete up.ts; r.pending = Object.assign(up, r.pending); setSync('off'); clearTimeout(r.t); r.t = setTimeout(flush, 15000); }
  });
}
function beat() { if (!RM || document.hidden) return; const m = me(); if ((CUR.meta.members || {})[m.uid]) { RM.pending['vault.meta.members.' + m.uid + '.ts'] = Date.now(); RM.pending['vault.meta.members.' + m.uid + '.n'] = m.name; sched(); } }
function stopRoom() { if (!RM) return; flush(); try { RM.un && RM.un(); } catch (e) {} clearInterval(RM.hb); clearTimeout(RM.t); API.room = null; RM = null; ChatEngine.onRoomChanged(null); }
function withAuth(cb, silent, i) {
  const A = NE().AuthManager; if (A && A.uid) return cb();
  if (silent) { if ((i || 0) < 6) setTimeout(() => withAuth(cb, true, (i || 0) + 1), 700); return; }
  if (A && A.ensureAuth) A.ensureAuth('Shared rooms need an operator link.');
}
function joinRoom(code, create, name, silent) {
  const n = NE(), bad = m => { if (!silent) { toast('<b>' + m + '</b>', 'cross'); sfx('bad'); } };
  if (!n.db) return bad('Rooms need the updated network.js');
  if (!n.online || !n.online()) return bad('Offline: rooms need a connection');
  withAuth(() => {
    const ref = n.db().collection('group_notes').doc(code), m = me(), now = Date.now();
    ref.get().then(doc => {
      const d = doc.exists ? doc.data() : null, v = d && d.vault;
      if (!d && !create) return bad('Room ' + code + ' not found');
      if (v && v.meta && v.meta.ban && v.meta.ban[m.uid]) return bad('You were removed from this room');
      if (!v) {   // brand-new room, or a legacy note room upgraded in place
        const b = mk(d && d.md ? 'Main' : 'Welcome', d && d.md ? d.md : ROOM_WELCOME), notes = {}; notes[b.id] = { t: b.t, md: b.md, ts: now, by: m.uid };
        const mt = { name: name || 'Room ' + code, icon: '🛰️', color: COLORS[2], owner: m.uid, lock: 0, ban: {}, members: {} }; mt.members[m.uid] = { n: m.name, r: 'owner', ts: now };
        return n.guardedWrite('room-create', () => ref.set({ code, vault: { meta: mt, notes }, ts: now, created: now }, { merge: true }))
          .then(ok => { if (!ok) return bad('Could not create the room (offline or write budget used)'); attach(code, ref); sfx('power'); if (!silent) toast('<b>Room ' + code + ' ready</b><br>Share the code from the 👥 panel.', 'coin'); });
      }
      if ((v.meta.members || {})[m.uid]) return attach(code, ref);
      const up = {}; up['vault.meta.members.' + m.uid] = { n: m.name, r: v.meta.lock ? 'viewer' : 'editor', ts: now };
      n.guardedWrite('room-join', () => ref.update(up)).then(ok => { if (ok) { attach(code, ref); sfx('ok'); } else bad('Could not join the room'); });
    }).catch(() => bad('Could not reach the room'));
  }, silent);
}
function mkRoom(name) {
  const n = NE(); if (!n.db || !n.online || !n.online()) return toast('<b>Rooms need a connection and the updated network.js</b>', 'cross');
  withAuth(() => {
    const col = n.db().collection('group_notes'), go = i => { const c = String(100000 + Math.floor(Math.random() * 900000)); return col.doc(c).get().then(d => d.exists && i < 5 ? go(i + 1) : c); };
    go(0).then(c => { closeModal(); joinRoom(c, true, name); });
  }, false);
}
function attach(code, ref) {
  if (CUR && CUR.kind === 'local') saveLocal();
  stopRoom();
  CUR = { kind: 'room', id: code, code, name: 'Room ' + code, icon: '🛰️', color: COLORS[2], notes: {}, meta: { members: {} } }; curId = null;
  RM = { code, ref, pending: {}, t: 0, hb: 0, un: null }; P.roomOn = code; sp();
  RM.un = ref.onSnapshot(snap => {
    if (snap.metadata.hasPendingWrites || !RM || RM.code !== code) return;
    const d = snap.data();
    if (!d || !d.vault) { toast('<b>Room closed</b><br>The owner closed this room.', 'cross'); return exitRoom(); }
    if (!(d.vault.meta.members || {})[me().uid]) { toast('<b>Removed from room</b>', 'cross'); return exitRoom(); }
    applyRemote(d.vault); setSync(Object.keys(RM.pending).length ? 'buf' : 'ok');
  }, () => setSync('off'));
  RM.hb = setInterval(beat, 150000);
  API.room = code; ChatEngine.onRoomChanged(code); bdg('v5_room');
  renderAll(); setSync('sync');
}
function exitRoom() { stopRoom(); P.roomOn = null; sp(); loadLocal(IDX.active); renderAll(); }
function applyRemote(v) {
  const pend = RM.pending, nn = v.notes || {};
  Object.keys(CUR.notes).forEach(id => { if (!nn[id] && !pend['vault.notes.' + id]) delete CUR.notes[id]; });
  Object.keys(nn).forEach(id => { const r = nn[id], l = CUR.notes[id]; if (pend['vault.notes.' + id]) return; if (!l || r.ts > l.ts) CUR.notes[id] = Object.assign({ id }, r); });
  const m = v.meta; CUR.meta = m; CUR.name = m.name; CUR.icon = m.icon; CUR.color = m.color;
  if (!curId || !CUR.notes[curId]) curId = Object.keys(CUR.notes).sort((a, b) => CUR.notes[b].ts - CUR.notes[a].ts)[0] || null;
  remember(CUR.code, m.name, m.icon); renderAll();
}
function remember(c, n, i) { const r = ROOMS.find(x => x.code === c); if (r && r.name === n && r.icon === i) return; ROOMS = ROOMS.filter(x => x.code !== c); ROOMS.unshift({ code: c, name: n, icon: i }); ROOMS = ROOMS.slice(0, 8); sv(K.rooms, ROOMS); }
function team(op, u, val) {
  if (!RM || !isOwner()) return;
  const k = 'vault.meta.', M = CUR.meta, mem = M.members, pd = RM.pending, me_ = me().uid;
  if (op === 'role' && mem[u]) { mem[u].r = val; pd[k + 'members.' + u + '.r'] = val; }
  else if (op === 'owner' && mem[u]) { mem[u].r = 'owner'; mem[me_].r = 'editor'; M.owner = u; pd[k + 'owner'] = u; pd[k + 'members.' + u + '.r'] = 'owner'; pd[k + 'members.' + me_ + '.r'] = 'editor'; }
  else if (op === 'kick' || op === 'ban') {
    if (op === 'ban') { (M.ban = M.ban || {})[u] = (mem[u] || {}).n || 'Operator'; pd[k + 'ban.' + u] = M.ban[u]; }
    Object.keys(pd).forEach(x => { if (x.indexOf(k + 'members.' + u) === 0) delete pd[x]; });
    delete mem[u]; pd[k + 'members.' + u] = FV();
  } else if (op === 'unban') { delete (M.ban || {})[u]; pd[k + 'ban.' + u] = FV(); }
  else if (op === 'lock') { M.lock = val ? 1 : 0; pd[k + 'lock'] = M.lock; }
  sfx('click'); sched(); flush(); setBody(teamHTML()); renderAll();
}
function setMeta(k, v) {
  if (CUR.kind === 'room') { if (!isOwner()) return; CUR.meta[k] = v; RM.pending['vault.meta.' + k] = v; sched(); remember(CUR.code, k === 'name' ? v : CUR.name, k === 'icon' ? v : CUR.icon); }
  CUR[k] = v; if (CUR.kind === 'local') saveLocal(); head();
}
function copyLocal() {
  const v = { id: uid8(), name: CUR.name + ' (copy)', icon: CUR.icon, color: CUR.color, notes: {} };
  Object.values(CUR.notes).forEach(n => { const c = mk(n.t, n.md); c.pin = n.pin; v.notes[c.id] = c; });
  sv(K.v + v.id, v); IDX.vaults.push(meta(v)); sv(K.idx, IDX); return v;
}
function leave(close) {
  if (!RM) return; const r = RM, mine = me().uid;
  if (isOwner() && !close && Object.keys(CUR.meta.members || {}).length > 1) return toast('<b>Make someone else owner first</b><br>Or close the room for everyone.', 'cross');
  if (!confirm(close ? 'Close this room for everyone? A local copy is saved.' : 'Leave this room? A local copy is saved.')) return;
  const v = copyLocal(); flush();
  const g = NE().guardedWrite; if (g) g(close ? 'room-close' : 'room-leave', close ? () => r.ref.delete() : () => { const u = {}; u['vault.meta.members.' + mine] = FV(); return r.ref.update(u); });
  stopRoom(); P.roomOn = null; sp(); loadLocal(v.id); closeModal(); renderAll();
  toast('<b>' + (close ? 'Room closed' : 'Left room') + '</b><br>Copy saved as “' + esc(v.name) + '”.', 'doc');
}

/* ================= UI ================= */
function build() {
  built = true;
  const sec = $1('#notebook'); sec.classList.remove('nbx'); sec.innerHTML = ('<h2 class="skip" id="h-nb">Notebook</h2><div class="vx" id="vx" data-view="edit" data-side="1">' +
    '<aside class="vx-side panel"><button type="button" class="vx-vsw" data-a="sw" aria-label="Switch vault or room"><span id="vxIc"></span><b id="vxVn"></b><span>▾</span></button>' +
    '<div class="vx-tools"><button type="button" class="btn primary" data-a="new">＋ Note</button><button type="button" class="btn" data-a="daily" title="Today’s note" aria-label="Daily note">📅</button><button type="button" class="btn" data-a="graph" title="Graph view" aria-label="Graph view">🕸️</button><button type="button" class="btn" data-a="cards" title="Flashcards from your notes" aria-label="Flashcards">🃏</button></div>' +
    '<input id="vxFilter" type="search" placeholder="Filter notes or #tags" aria-label="Filter notes" autocomplete="off"><div class="vx-tree" id="vxTree"></div><div class="vx-tags" id="vxTags"></div></aside>' +
    '<div class="vx-main panel"><div class="vx-bar"><button type="button" class="btn" data-a="side" aria-label="Toggle sidebar">☰</button><input id="vxTitle" class="vx-title" maxlength="80" placeholder="Folder/Note title" aria-label="Note title" autocomplete="off" spellcheck="false">' +
    '<div class="vx-seg" role="group" aria-label="View"><button type="button" data-v="edit" title="Edit">✎</button><button type="button" data-v="split" title="Edit and read">◫</button><button type="button" data-v="read" title="Read">📖</button></div>' +
    '<button type="button" class="btn" data-a="team" id="vxTeam" title="Room team" aria-label="Room team" hidden>👥</button><button type="button" class="btn" data-a="more" title="More" aria-label="More actions">⋯</button></div>' +
    '<div class="vx-panes"><textarea id="vxEd" aria-label="Markdown note" placeholder="Start writing…  [[link]] · #tag · Term :: definition"></textarea><article id="vxRead" class="md-body vx-read" aria-live="polite"></article></div>' +
    '<div class="vx-foot"><span id="vxWords"></span><span id="vxBack" class="vx-backs"></span><span id="vxSync" class="vx-sync"></span></div></div></div>');
  bind(); $1('#vx').dataset.side = P.side;
}
function head() {
  if (!built) return; const v = $1('#vx');
  $1('#vxIc').textContent = CUR.icon || '📚'; $1('#vxVn').textContent = CUR.name + (CUR.kind === 'room' ? ' · ' + CUR.code : ''); $1('#vxTeam').hidden = CUR.kind !== 'room';
  const s = v.style; s.setProperty('--vx-acc', CUR.color || COLORS[0]); s.setProperty('--vx-font', FONTS[P.font] || FONTS.sans); s.setProperty('--vx-size', P.size + 'px'); s.setProperty('--vx-w', WIDTHS[P.width] || WIDTHS.normal);
}
function renderAll() { if (!built || !CUR) return; head(); renderTree(); loadNote(); setView(P.view, true); }
const tagsOf = n => { if (n._tm !== n.ts || !n._tg) { n._tm = n.ts; n._tg = []; const re = /(?:^|\s)#([A-Za-z][\w/-]*)/g; let m; while ((m = re.exec(n.md))) { const t = m[1].toLowerCase(); if (n._tg.indexOf(t) < 0) n._tg.push(t); } } return n._tg; };
function renderTree() {
  if (!built || !CUR) return;
  const f = FILT.toLowerCase(), tq = f[0] === '#' ? f.slice(1) : '';
  let list = Object.values(CUR.notes);
  if (f) list = list.filter(n => tq ? tagsOf(n).indexOf(tq) >= 0 : (n.t + '\n' + n.md).toLowerCase().indexOf(f) >= 0);
  const row = n => '<button type="button" class="vx-n' + (n.id === curId ? ' on' : '') + '" data-id="' + n.id + '">' + (n.pin ? '★ ' : '') + esc(n.t.split('/').pop()) + '</button>', srt = a => a.slice().sort((x, y) => x.t.localeCompare(y.t));
  const by = {}; list.forEach(n => { const i = n.t.lastIndexOf('/'), d = i < 0 ? '' : n.t.slice(0, i); (by[d] = by[d] || []).push(n); });
  const pins = list.filter(n => n.pin); let h = pins.length ? '<div class="vx-sec">Pinned</div>' + srt(pins).map(row).join('') : '';
  h += srt(by[''] || []).map(row).join('');
  Object.keys(by).filter(Boolean).sort().forEach(d => { const op = f || !COL[d]; h += '<div class="vx-f" data-d="' + esc(d) + '"><span>' + (op ? '▾ ' : '▸ ') + esc(d) + ' <i>' + by[d].length + '</i></span>' + (canEdit() ? '<button type="button" class="vx-mini" data-a="rf" data-d="' + esc(d) + '" aria-label="Rename folder">✎</button>' : '') + '</div>' + (op ? srt(by[d]).map(row).join('') : ''); });
  $1('#vxTree').innerHTML = h || '<p class="small vx-empty">' + (f ? 'No matches.' : 'No notes yet. Press ＋ Note.') + '</p>';
  const tc = {}; Object.values(CUR.notes).forEach(n => tagsOf(n).forEach(t => tc[t] = (tc[t] || 0) + 1));
  $1('#vxTags').innerHTML = Object.keys(tc).sort((a, b) => tc[b] - tc[a]).slice(0, 14).map(t => '<button type="button" class="vx-tag" data-t="' + esc(t) + '">#' + esc(t) + ' ' + tc[t] + '</button>').join('');
}
function loadNote() {
  const n = cur(), ed = $1('#vxEd'), ti = $1('#vxTitle'), ro = !n || !canEdit();
  ed.readOnly = ro; ti.readOnly = ro;
  if (!n) { ed.value = ''; ti.value = ''; $1('#vxRead').innerHTML = '<p class="small">Nothing open. Create a note with ＋ Note.</p>'; $1('#vxWords').textContent = ''; $1('#vxBack').innerHTML = ''; return; }
  if (ed.value !== n.md) { const s = ed.selectionStart; ed.value = n.md; try { ed.setSelectionRange(s, s); } catch (e) {} }
  if (ti.value !== n.t && document.activeElement !== ti) ti.value = n.t;
  renderRead(); words(); backs();
}
function words() { const n = cur(); if (!n) return; const w = (n.md.trim().match(/\S+/g) || []).length; $1('#vxWords').textContent = w + ' words · ' + Math.max(1, Math.round(w / 200)) + ' min' + (canEdit() ? '' : ' · view only'); }
function renderRead() {
  const n = cur(), el = $1('#vxRead'); if (!n || P.view === 'edit') return;
  const src = n.md.replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, (m, t, l) => {
    t = t.trim(); if (/^lesson:/i.test(t)) { const id = t.slice(7).trim(); return '<a href="#" class="wl les" data-b="' + esc(id) + '">' + esc(l || id) + '</a>'; }
    return '<a href="#" class="wl' + (find(t) ? '' : ' ghost') + '" data-t="' + esc(t) + '">' + esc(l || t) + '</a>';
  }).replace(/(^|\s)#([A-Za-z][\w/-]*)/g, (m, a, t) => a + '<a href="#" class="vx-tag" data-t="' + esc(t.toLowerCase()) + '">#' + esc(t) + '</a>');
  el.innerHTML = clean(mdBlock(src)); typeset(el);
}
function setView(v, quiet) { P.view = v; $1('#vx').dataset.view = v; $A('.vx-seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); if (v !== 'edit') renderRead(); if (!quiet) sp(); }
function side(v) { P.side = v == null ? (P.side ? 0 : 1) : v; $1('#vx').dataset.side = P.side; sp(); }
const has = s => Object.values(CUR.notes).some(o => norm(o.t) === norm(s));
function find(name) { const t = norm(name), all = Object.values(CUR.notes); return all.find(n => norm(n.t) === t) || all.find(n => norm(n.t.split('/').pop()) === t); }
const refs = n => { const out = [], re = /\[\[([^\]|\n]+)/g; let m; while ((m = re.exec(n.md))) out.push(norm(m[1])); return out; };
function backs() {
  const n = cur(), el = $1('#vxBack'); if (!n) return;
  const nm = [norm(n.t), norm(n.t.split('/').pop())], bl = Object.values(CUR.notes).filter(o => o.id !== n.id && o.md.indexOf('[[') >= 0 && refs(o).some(l => nm.indexOf(l) >= 0));
  el.innerHTML = bl.length ? '↩ ' + bl.slice(0, 5).map(o => '<button type="button" class="vx-bk" data-id="' + o.id + '">' + esc(o.t.split('/').pop()) + '</button>').join('') + (bl.length > 5 ? ' +' + (bl.length - 5) : '') : '';
}
function openNote(id) { if (!CUR.notes[id]) return; curId = id; renderTree(); loadNote(); }
function newNote(t, md) {
  let name = t, i = 2; while (has(name)) name = t + ' ' + i++;
  const n = mk(name, md); CUR.notes[n.id] = n; touch(n); openNote(n.id); sfx('click');
  if (t === 'Untitled') { const ti = $1('#vxTitle'); ti.focus(); ti.select(); } else $1('#vxEd').focus();
}
function rewire(a, b) { Object.values(CUR.notes).forEach(o => { const m = o.md.split('[[' + a + ']]').join('[[' + b + ']]').split('[[' + a + '|').join('[[' + b + '|'); if (m !== o.md) { o.md = m; touch(o); } }); }
function rename(raw) {
  const n = cur(); if (!n || !canEdit()) return;
  let t = String(raw).replace(/\s*\/\s*/g, '/').replace(/^\/+|\/+$/g, '').slice(0, 80) || 'Untitled', b = t, i = 2;
  if (t === n.t) return;
  while (Object.values(CUR.notes).some(o => o.id !== n.id && norm(o.t) === norm(t))) t = b + ' ' + i++;
  const old = n.t; n.t = t; rewire(old, t); touch(n); renderTree(); loadNote(); sfx('click');
}
function renameFolder(d) {
  if (!canEdit()) return; const to = (prompt('Rename folder “' + d + '” to:', d) || '').trim().replace(/^\/+|\/+$/g, ''); if (!to || to === d) return;
  Object.values(CUR.notes).filter(n => n.t.indexOf(d + '/') === 0).forEach(n => { const old = n.t; n.t = to + old.slice(d.length); rewire(old, n.t); touch(n); }); renderTree(); loadNote();
}
function link(b) {
  if (b.dataset.b) return lesson(b.dataset.b);
  const n = find(b.dataset.t);
  if (n) openNote(n.id); else if (canEdit()) { const x = mk(b.dataset.t, ''); CUR.notes[x.id] = x; touch(x); openNote(x.id); sfx('ok'); }
}
function lesson(bid) {
  const el = document.getElementById(bid); if (!el) return toast('<b>Lesson block not found</b>', 'cross');
  const sec = el.closest('.screen'); window.showScreen(sec.id);
  const d = $1('.gl-dot[data-k="' + $A('article.block', sec).indexOf(el) + '"]', sec); if (d) d.click();
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}
function act(a, b) {
  if (a === 'side') return side();
  if (a === 'sw') return dlg('VAULTS & ROOMS', swHTML());
  if (a === 'graph') return graph();
  if (a === 'cards') return cards();
  if (a === 'team') return CUR.kind === 'room' && dlg('ROOM · ' + CUR.name, teamHTML());
  if (a === 'more') return dlg('NOTE & VAULT', moreHTML());
  if (a === 'rf') return renameFolder(b.dataset.d);
  if (!canEdit()) return toast('<b>View only</b><br>Ask the owner for editor access.', 'cross');
  if (a === 'new') return newNote('Untitled', '');
  if (a === 'daily') { const t = 'Daily/' + new Date().toLocaleDateString('en-CA'), n = find(t); return n ? openNote(n.id) : newNote(t, '# ' + t.slice(6) + '\n\n## Today I learned\n- \n\n## To review\n- [ ] \n'); }
}
function bind() {
  const root = $1('#vx');
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-a],[data-v],.vx-n,.vx-f,.wl,.vx-tag,.vx-bk'); if (!b) return;
    if (b.dataset.a) return act(b.dataset.a, b);
    if (b.dataset.v && b.closest('.vx-seg')) { sfx('click'); return setView(b.dataset.v); }
    if (b.classList.contains('vx-n') || b.classList.contains('vx-bk')) { openNote(b.dataset.id); sfx('click'); if (innerWidth < 900) side(0); return; }
    if (b.classList.contains('vx-f')) { COL[b.dataset.d] = !COL[b.dataset.d]; return renderTree(); }
    e.preventDefault();
    if (b.classList.contains('wl')) return link(b);
    if (b.classList.contains('vx-tag')) { FILT = '#' + b.dataset.t; $1('#vxFilter').value = FILT; side(1); renderTree(); }
  });
  $1('#vxEd').addEventListener('input', () => {
    const n = cur(); if (!n || !canEdit()) return;
    n.md = $1('#vxEd').value; touch(n); words();
    clearTimeout(tRead); tRead = setTimeout(renderRead, 250); clearTimeout(tBack); tBack = setTimeout(() => { backs(); chk(n); }, 500); clearTimeout(tTree); tTree = setTimeout(renderTree, 1200);
  });
  $1('#vxTitle').addEventListener('change', () => rename($1('#vxTitle').value));
  let ft = 0; $1('#vxFilter').addEventListener('input', e => { clearTimeout(ft); ft = setTimeout(() => { FILT = e.target.value.trim(); renderTree(); }, 120); });
  const mb = $1('#modalBody');
  ['click', 'change'].forEach(t => mb.addEventListener(t, e => { const b = e.target.closest('[data-vx]'); if (b && (e.type === 'change') === /^(INPUT|SELECT)$/.test(b.tagName)) mact(b, e); }));
  mb.addEventListener('input', e => { if (e.target.id === 'vxQ') qlist(e.target.value); });
  document.addEventListener('keydown', e => {
    if (!$1('#notebook.active')) return;
    if (e.key === 'Enter' && e.target.id === 'vxCode') { const j = $1('[data-vx=join]'); if (j) j.click(); }
    else if (e.key === 'Enter' && e.target.id === 'vxQ') { const r = $1('#vxQL .vx-row'); if (r) r.click(); }
  });
  window.addEventListener('pagehide', () => { if (RM) flush(); });
}

/* ================= DIALOGS ================= */
function swHTML() {
  const L = IDX.vaults.map(v => '<button type="button" class="vx-row' + (CUR.kind === 'local' && v.id === CUR.id ? ' on' : '') + '" data-vx="open" data-id="' + v.id + '"><span>' + v.icon + '</span><b>' + esc(v.name) + '</b></button>').join('');
  const R = ROOMS.map(r => '<button type="button" class="vx-row' + (RM && RM.code === r.code ? ' on' : '') + '" data-vx="room" data-c="' + r.code + '"><span>' + (r.icon || '🛰️') + '</span><b>' + esc(r.name) + '</b><i>' + r.code + '</i></button>').join('') || '<p class="small">No rooms yet.</p>';
  return '<h4>Your vaults</h4><div class="vx-list">' + L + '</div><button type="button" class="btn" data-vx="newv">＋ New vault</button><h4>Shared rooms</h4><div class="vx-list">' + R + '</div>' +
    '<div class="vx-join"><input id="vxCode" inputmode="numeric" maxlength="6" placeholder="6-digit room code" aria-label="Room code" autocomplete="off"><button type="button" class="btn primary" data-vx="join">Join</button></div>' +
    '<div class="vx-join"><input id="vxRName" maxlength="40" placeholder="Name a new room" aria-label="New room name" autocomplete="off"><button type="button" class="btn" data-vx="mkroom">Create</button></div>' +
    '<p class="small">A room is a shared vault: everyone in it sees the same notes live. Anyone with the code can join, so lock the room or ban members from the 👥 panel.</p>';
}
function teamHTML() {
  const M = CUR.meta, mem = M.members || {}, mine = me().uid, own = isOwner(), now = Date.now(), c = CUR.code;
  const rows = Object.keys(mem).sort((a, b) => (mem[b].r === 'owner') - (mem[a].r === 'owner')).map(u => {
    const x = mem[u], on = now - (x.ts || 0) < 300000, opt = r => '<option value="' + r + '"' + (x.r === r ? ' selected' : '') + '>' + r + '</option>';
    return '<div class="vx-mem"><span class="vx-dot' + (on ? ' on' : '') + '" title="' + (on ? 'Active now' : 'Away') + '"></span><b>' + esc(x.n || 'Operator') + (u === mine ? ' (you)' : '') + '</b>' +
      (own && u !== mine ? '<select data-vx="role" data-u="' + u + '" aria-label="Role">' + opt('editor') + opt('viewer') + '</select><button type="button" class="btn" data-vx="owner" data-u="' + u + '" title="Make owner" aria-label="Make owner">👑</button><button type="button" class="btn" data-vx="kick" data-u="' + u + '">Remove</button><button type="button" class="btn danger" data-vx="ban" data-u="' + u + '">Ban</button>' : '<span class="vx-role">' + esc(x.r) + '</span>') + '</div>';
  }).join('');
  const bans = own ? Object.keys(M.ban || {}).map(u => '<div class="vx-mem"><b>' + esc(M.ban[u]) + '</b><button type="button" class="btn" data-vx="unban" data-u="' + u + '">Unban</button></div>').join('') : '';
  return '<div class="vx-code" aria-label="Room code">' + c.slice(0, 3) + ' ' + c.slice(3) + '</div><div class="vx-chips"><button type="button" class="btn" data-vx="cpcode">Copy code</button><button type="button" class="btn" data-vx="cplink">Copy invite link</button></div>' +
    (own ? '<h4>Room name</h4><input data-vx="rname" value="' + esc(M.name) + '" maxlength="40" aria-label="Room name"><label class="vx-chk"><input type="checkbox" data-vx="lock"' + (M.lock ? ' checked' : '') + '> New members join as viewers</label>' : '') +
    '<h4>Members · ' + Object.keys(mem).length + '</h4>' + rows + (bans ? '<h4>Banned</h4>' + bans : '') +
    '<div class="vx-chips" style="margin-top:12px"><button type="button" class="btn" data-vx="cpcopy">Save local copy</button><button type="button" class="btn danger" data-vx="leave">Leave</button>' + (own ? '<button type="button" class="btn danger" data-vx="close">Close room</button>' : '') + '</div>' +
    '<p class="small">Roles are enforced by this app. The 6-digit code is the access secret, so treat it like a password.</p>';
}
function moreHTML() {
  const n = cur(), ed = n && canEdit();
  return '<div class="vx-list">' + (ed ? '<button type="button" class="vx-row" data-vx="pin"><b>' + (n.pin ? '★ Unpin note' : '☆ Pin note') + '</b></button><button type="button" class="vx-row" data-vx="dup"><b>⧉ Duplicate</b></button><h4>Insert template</h4><div class="vx-chips">' + Object.keys(TPL).map(k => '<button type="button" class="btn" data-vx="tpl" data-k="' + k + '">' + k + '</button>').join('') + '</div>' : '') +
    (ed && window.CodexGuide ? '<h4>✦ Guide</h4><div class="vx-chips">' + [['summarize', 'Summarize'], ['flashcards', 'Make flashcards'], ['improve', 'Improve writing'], ['gaps', 'Find gaps']].map(a => '<button type="button" class="btn" data-vx="ai" data-m="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>' : '') +
    '<button type="button" class="vx-row" data-vx="cpnote"><b>🔗 Copy [[link]] to this note</b></button><button type="button" class="vx-row" data-vx="set"><b>🎨 Appearance &amp; vault settings</b></button><button type="button" class="vx-row" data-vx="export"><b>⬇ Export vault (.json)</b></button>' +
    '<label class="vx-row"><b>⬆ Import .json or .md files</b><input type="file" data-vx="import" accept=".json,.md,.txt" multiple hidden></label>' + (ed ? '<button type="button" class="vx-row danger" data-vx="del"><b>🗑 Delete note</b></button>' : '') + '</div>';
}
function setHTML() {
  const dis = isOwner() ? '' : ' disabled', sel = (id, arr, v) => '<select data-vx="' + id + '">' + arr.map(x => '<option' + (x === v ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>';
  return '<h4>Vault' + (isOwner() ? '' : ' (owner only)') + '</h4><input data-vx="vname" value="' + esc(CUR.name) + '" maxlength="40" aria-label="Vault name"' + dis + '><div class="vx-chips">' +
    ICONS.map(i => '<button type="button" class="btn' + (i === CUR.icon ? ' primary' : '') + '" data-vx="icon" data-v="' + i + '"' + dis + '>' + i + '</button>').join('') + '</div><div class="vx-chips">' +
    COLORS.map(c => '<button type="button" class="vx-sw' + (c === CUR.color ? ' on' : '') + '" data-vx="color" data-v="' + c + '" style="background:' + c + '" aria-label="Accent ' + c + '"' + dis + '></button>').join('') + '</div>' +
    '<h4>Your reading view</h4><div class="vx-chips"><label>Font ' + sel('font', Object.keys(FONTS), P.font) + '</label><label>Width ' + sel('width', Object.keys(WIDTHS), P.width) + '</label><label>Size <input type="range" min="13" max="22" value="' + P.size + '" data-vx="size"></label></div>' +
    (CUR.kind === 'local' && IDX.vaults.length > 1 ? '<button type="button" class="btn danger" data-vx="vdel">Delete this vault</button>' : '');
}
function mact(b, e) {
  const a = b.dataset.vx, v = b.value, d = b.dataset, n = cur(), cp = t => navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast('<b>Copied</b>', 'check'));
  switch (a) {
    case 'open': stopRoom(); P.roomOn = null; sp(); loadLocal(d.id); closeModal(); renderAll(); break;
    case 'room': closeModal(); joinRoom(d.c, false); break;
    case 'newv': { const i = IDX.vaults.length, w = mk('Welcome', WELCOME), x = { id: uid8(), name: 'Vault ' + (i + 1), icon: ICONS[i % 12], color: COLORS[i % 7], notes: {} }; x.notes[w.id] = w; sv(K.v + x.id, x); IDX.vaults.push(meta(x)); sv(K.idx, IDX); stopRoom(); P.roomOn = null; loadLocal(x.id); renderAll(); setBody(setHTML()); sfx('ok'); break; }
    case 'join': { const c = String($1('#vxCode').value).replace(/\D/g, ''); if (!/^\d{4}(\d{2})?$/.test(c)) { sfx('bad'); return toast('<b>Room codes are 6 digits</b>', 'cross'); } closeModal(); joinRoom(c, false); break; }
    case 'mkroom': mkRoom($1('#vxRName').value.trim()); break;
    case 'role': team('role', d.u, v); break;
    case 'owner': if (confirm('Make this member the owner? You become an editor.')) team('owner', d.u); break;
    case 'kick': case 'ban': case 'unban': team(a, d.u); break;
    case 'lock': team('lock', null, b.checked); break;
    case 'rname': setMeta('name', v.trim().slice(0, 40) || CUR.name); break;
    case 'cpcode': cp(CUR.code); break;
    case 'cplink': cp(location.origin + location.pathname + '#room=' + CUR.code); break;
    case 'cpcopy': { const x = copyLocal(); toast('<b>Saved</b><br>“' + esc(x.name) + '” is in your vaults.', 'doc'); break; }
    case 'leave': leave(false); break;
    case 'close': leave(true); break;
    case 'pin': if (n) { n.pin = n.pin ? 0 : 1; touch(n); renderTree(); closeModal(); } break;
    case 'dup': if (n) { const c = mk(n.t + ' copy', n.md); CUR.notes[c.id] = c; touch(c); closeModal(); openNote(c.id); } break;
    case 'tpl': { const ed = $1('#vxEd'); closeModal(); ed.setRangeText(TPL[d.k], ed.selectionStart, ed.selectionEnd, 'end'); ed.dispatchEvent(new Event('input')); ed.focus(); break; }
    case 'cpnote': if (n) cp('[[' + n.t + ']]'); break;
    case 'set': setBody(setHTML()); break;
    case 'del': if (n && confirm('Delete “' + n.t + '”?')) { delete CUR.notes[n.id]; if (CUR.kind === 'local') saveLocal(); else RM.pending['vault.notes.' + n.id] = FV(), sched(); curId = Object.keys(CUR.notes)[0] || null; closeModal(); renderAll(); sfx('bad'); } break;
    case 'export': { const o = { app: 'codex-vault', v: 5, name: CUR.name, icon: CUR.icon, color: CUR.color, notes: Object.values(CUR.notes).map(x => ({ t: x.t, md: x.md, ts: x.ts, pin: x.pin ? 1 : 0 })) }; dl(JSON.stringify(o), CUR.name + '.vault.json', 'application/json'); break; }
    case 'import': importFiles(b.files); break;
    case 'vname': setMeta('name', v.trim().slice(0, 40) || CUR.name); break;
    case 'icon': case 'color': setMeta(a, d.v); setBody(setHTML()); break;
    case 'font': case 'width': P[a] = v; sp(); head(); break;
    case 'size': P.size = +v; sp(); head(); break;
    case 'vdel': if (confirm('Delete vault “' + CUR.name + '” and all its notes?')) { const id = CUR.id; localStorage.removeItem(K.v + id); IDX.vaults = IDX.vaults.filter(x => x.id !== id); loadLocal(IDX.vaults[0].id); closeModal(); renderAll(); } break;
    case 'qopen': closeModal(); openNote(d.id); break;
    case 'qnew': closeModal(); newNote(d.t, ''); break;
    case 'cflip': FLIP = 1; cardUI(); break;
    case 'cgood': grade(DECK[CI], true); GOT++; xp(1); CI++; FLIP = 0; sfx('ok'); cardUI(); break;
    case 'cagain': grade(DECK[CI], false); DECK.push(DECK[CI]); CI++; FLIP = 0; sfx('flip'); cardUI(); break;
    case 'call': cards(true); break;
    case 'ai': closeModal(); if (window.CodexGuide) window.CodexGuide.run(d.m); break;
    case 'cdone': closeModal(); break;
  }
}
function dl(txt, name, type) { const a = document.createElement('a'), u = URL.createObjectURL(new Blob([txt], { type })); a.href = u; a.download = name.replace(/[^\w.\- ]+/g, '_'); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
function importFiles(files) {
  Promise.all(Array.from(files).map(f => f.text().then(t => ({ f, t })))).then(rs => {
    let cnt = 0;
    rs.forEach(({ f, t }) => {
      if (/\.json$/i.test(f.name)) { try { const o = JSON.parse(t); if (o.app !== 'codex-vault') return; const x = { id: uid8(), name: String(o.name || 'Imported').slice(0, 40), icon: o.icon || '📚', color: o.color || COLORS[0], notes: {} }; (o.notes || []).forEach(q => { const c = mk(String(q.t || 'Untitled'), String(q.md || '')); c.pin = q.pin; x.notes[c.id] = c; cnt++; }); sv(K.v + x.id, x); IDX.vaults.push(meta(x)); sv(K.idx, IDX); } catch (e) {} }
      else if (canEdit()) { let name = f.name.replace(/\.(md|txt)$/i, ''), i = 2; while (has(name)) name += ' ' + i++; const c = mk(name, t); CUR.notes[c.id] = c; touch(c); cnt++; }
    });
    closeModal(); renderAll(); toast('<b>Imported ' + cnt + ' note' + (cnt === 1 ? '' : 's') + '</b>', 'doc'); sfx('ok');
  });
}
function quick() { dlg('QUICK SWITCH', '<input id="vxQ" placeholder="Jump to a note… (Enter opens)" autocomplete="off" aria-label="Jump to note"><div id="vxQL" class="vx-list"></div>'); const q = $1('#vxQ'); if (q) q.focus(); qlist(''); }
function qlist(s) {
  const t = norm(s), l = Object.values(CUR.notes).filter(n => !t || norm(n.t).indexOf(t) >= 0).sort((a, b) => b.ts - a.ts).slice(0, 8);
  $1('#vxQL').innerHTML = l.map(n => '<button type="button" class="vx-row" data-vx="qopen" data-id="' + n.id + '"><b>' + esc(n.t) + '</b></button>').join('') + (t && canEdit() && !has(s) ? '<button type="button" class="vx-row" data-vx="qnew" data-t="' + esc(s.trim()) + '"><b>＋ Create “' + esc(s.trim()) + '”</b></button>' : '');
}
/* spaced repetition: Term :: definition lines become Leitner cards (1,2,4,8,16,32 days) */
const SRS_IV = [0, 1, 2, 4, 8, 16, 32], CARD_RE = /^\s*(?:[-*]\s+)?(.{2,120}?)\s*::\s*(.{1,400})$/, today = () => Math.floor(Date.now() / 864e5), ck = c => norm(c.q).slice(0, 80);
const dueOf = list => { const s = ld(K.srs, {}); return list.filter(c => !s[ck(c)] || s[ck(c)].d <= today()); };
const cardsOf = notes => { const out = []; Object.values(notes).forEach(n => n.md.split('\n').forEach(l => { const m = CARD_RE.exec(l); if (m) out.push({ q: m[1], a: m[2], n: n.t }); })); return out; };
function chk(n) { if ((n.md.trim().match(/\S+/g) || []).length >= 50) bdg('v5_note'); if (/\[\[[^\]\n]+\]\]/.test(n.md)) bdg('v5_link'); }
function grade(c, ok) {
  const s = ld(K.srs, {}), k = ck(c), r = s[k] || { b: 0 }; r.b = ok ? Math.min(6, r.b + 1) : 1; r.d = today() + SRS_IV[r.b]; s[k] = r; sv(K.srs, s);
  if (ok) { const n = ld('cx_v5_rev', 0) + 1; sv('cx_v5_rev', n); if (n >= 10) bdg('v5_cards'); }
}
function cards(all) {
  const list = cardsOf(CUR.notes);
  if (!list.length) return dlg('FLASHCARDS FROM NOTES', '<p>No cards yet. In any note, write <code>Term :: definition</code> on its own line.</p>');
  const due = dueOf(list);
  if (!all && !due.length) return dlg('FLASHCARDS FROM NOTES', '<p><b>All caught up.</b> ' + list.length + ' cards, none due today.</p><button type="button" class="btn primary" data-vx="call">Review anyway</button>');
  DECK = shuffle(all ? list : due).slice(0, 30); CI = 0; FLIP = 0; GOT = 0; dlg('FLASHCARDS FROM NOTES', ''); cardUI();
}
function cardUI() {
  const c = DECK[CI];
  setBody(!c ? '<p><b>Deck done.</b> ' + GOT + ' recalled.</p><button type="button" class="btn primary" data-vx="cdone">Close</button>' :
    '<p class="small">' + (CI + 1) + ' / ' + DECK.length + ' · ' + esc(c.n) + '</p><div class="vx-card">' + mdInline(c.q) + (FLIP ? '<hr>' + mdInline(c.a) : '') + '</div>' +
    (FLIP ? '<button type="button" class="btn primary" data-vx="cgood">Got it</button> <button type="button" class="btn" data-vx="cagain">Again</button>' : '<button type="button" class="btn primary" data-vx="cflip">Show answer</button>'));
}
function graph() {
  const ns = Object.values(CUR.notes).slice(0, 120); if (!ns.length) return;
  dlg('GRAPH · ' + CUR.name, '<canvas id="vxG" width="640" height="420" aria-label="Note graph" style="width:100%;border-radius:12px;background:#021017"></canvas><p class="small">Click a node to open it. Bigger dots have more links.</p>');
  const W = 640, Hh = 420, E = [], deg = ns.map(() => 0);
  ns.forEach((n, i) => refs(n).forEach(l => { const j = ns.findIndex(o => norm(o.t) === l || norm(o.t.split('/').pop()) === l); if (j >= 0 && j !== i) { E.push([i, j]); deg[i]++; deg[j]++; } }));
  const X = ns.map((_, i) => W / 2 + Math.cos(i * 2.4) * (60 + i * 2.5)), Y = ns.map((_, i) => Hh / 2 + Math.sin(i * 2.4) * (60 + i * 2.5)), cl = (v, m) => Math.max(-12, Math.min(12, v)) + m;
  for (let it = 0; it < 160; it++) {
    const dx = ns.map(() => 0), dy = ns.map(() => 0);
    for (let a = 0; a < ns.length; a++) for (let b = a + 1; b < ns.length; b++) { const vx = X[a] - X[b], vy = Y[a] - Y[b], f = 1800 / (vx * vx + vy * vy + 40); dx[a] += vx * f; dy[a] += vy * f; dx[b] -= vx * f; dy[b] -= vy * f; }
    E.forEach(([a, b]) => { const vx = X[b] - X[a], vy = Y[b] - Y[a]; dx[a] += vx * .02; dy[a] += vy * .02; dx[b] -= vx * .02; dy[b] -= vy * .02; });
    for (let i = 0; i < ns.length; i++) { X[i] = Math.max(20, Math.min(W - 20, cl(dx[i] + (W / 2 - X[i]) * .01, X[i]))); Y[i] = Math.max(20, Math.min(Hh - 20, cl(dy[i] + (Hh / 2 - Y[i]) * .01, Y[i]))); }
  }
  const cv = $1('#vxG'), c = cv.getContext('2d'); let hov = -1, ra = 0;
  const draw = () => {
    c.clearRect(0, 0, W, Hh); c.strokeStyle = 'rgba(95,208,238,.35)'; c.lineWidth = 1; E.forEach(([a, b]) => { c.beginPath(); c.moveTo(X[a], Y[a]); c.lineTo(X[b], Y[b]); c.stroke(); });
    ns.forEach((n, i) => { c.fillStyle = n.id === curId ? '#ffc874' : i === hov ? '#fff' : (CUR.color || '#5fd0ee'); c.beginPath(); c.arc(X[i], Y[i], 4 + Math.min(deg[i], 8), 0, 7); c.fill(); if (deg[i] > 1 || i === hov || n.id === curId) { c.fillStyle = '#e4f7fb'; c.font = '12px sans-serif'; c.fillText(n.t.split('/').pop().slice(0, 22), X[i] + 8, Y[i] - 8); } });
  };
  const at = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * Hh / r.height; let best = -1, bd = 400; ns.forEach((n, i) => { const q = (X[i] - x) ** 2 + (Y[i] - y) ** 2; if (q < bd) { bd = q; best = i; } }); return best; };
  cv.onmousemove = e => { const h = at(e); cv.style.cursor = h >= 0 ? 'pointer' : 'default'; if (h !== hov) { hov = h; if (!ra) ra = requestAnimationFrame(() => { ra = 0; draw(); }); } };
  cv.onclick = e => { const i = at(e); if (i >= 0) { closeModal(); openNote(ns[i].id); } };
  draw();
}

/* ================= LESSON CLIPS ================= */
function clip(art) {
  boot();
  const sec = art.closest('.screen'), tl = $1('.gl-tldr', art), text = tl ? tl.textContent.replace(/^In short/, '').trim() : '';
  let v = CUR && CUR.kind === 'local' ? CUR : Object.assign({ kind: 'local' }, ld(K.v + IDX.active, null));
  if (!v.notes) return;
  const lab = (SECTORS.find(s => s.id === sec.id) || {}).label || sec.id, title = 'Clips/' + lab;
  let n = Object.values(v.notes).find(x => x.t === title);
  if (!n) { n = mk(title, '# ' + lab + '\n\n'); v.notes[n.id] = n; }
  if (n.md.indexOf('[[lesson:' + art.id + '|') >= 0) return toast('<b>Already clipped</b>', 'check');
  n.md += '- **' + art.dataset.title + '**' + (text ? ' — ' + text : '') + ' [[lesson:' + art.id + '|open lesson]]\n'; n.ts = Date.now();
  if (v === CUR) { saveLocal(); if (built) renderTree(); } else { const o = Object.assign({}, v); delete o.kind; sv(K.v + v.id, o); }
  sfx('ok'); xp(2); { const c = ld('cx_v5_clips', 0) + 1; sv('cx_v5_clips', c); if (c >= 3) bdg('v5_clip'); } toast('<b>Clipped</b><br>' + esc(title) + ' · ' + esc(v.name), 'doc');
}

/* ================= PUBLIC API: the contract network.js, chat and the engine rely on ================= */
function open() { boot(); if (!built) build(); if (P.roomOn && !RM) joinRoom(P.roomOn, false, null, true); renderAll(); }
const API = {
  room: null,                                        // read by ChatEngine to bind #essay-group to the open room
  init: function () {
    const mt = $1('#mount'); if (mt) mt.addEventListener('click', e => { const b = e.target.closest('.vx-clip'); if (b) clip(b.closest('article.block')); });
    const m = /room=(\d{4,6})/.exec(location.hash);
    if (m) { boot(); P.roomOn = m[1]; history.replaceState(null, '', location.pathname + location.search); setTimeout(() => window.showScreen && window.showScreen('notebook'), 400); }
    else if ($1('#notebook.active')) API.onScreen(true);
  },
  onScreen: function (on) {
    try { if (on) open(); else if (RM) { stopRoom(); if (CUR.kind === 'room') loadLocal(IDX.active); } } catch (e) { if (window.console) console.error('[notebook]', e); }
  },
  identityChanged: function () { try { if (!built) return; if (RM && !AuthManager.uid) exitRoom(); else if (P.roomOn && !RM && $1('#notebook.active')) joinRoom(P.roomOn, false, null, true); } catch (e) {} },
  saveScratch: function () { if (!IDX) return; clearTimeout(tSave); saveLocal(); if (RM) flush(); },
  setSync: function () {}, flushRoom: function () { if (RM) flush(); },   // legacy NoteSync hooks, kept harmless
  context: function () { try { boot(); const n = cur(); return n ? { vault: CUR.name, t: n.t, md: n.md } : null; } catch (e) { return null; } },
  insert: function (text) { try { const n = cur(); if (!n || !canEdit()) return false; n.md = n.md.replace(/\s+$/, '') + '\n\n' + String(text).trim() + '\n'; touch(n); loadNote(); renderTree(); return true; } catch (e) { return false; } },
  capture: function (title, md) {
    try {
      boot(); const v = CUR && CUR.kind === 'local' ? CUR : Object.assign({ kind: 'local' }, ld(K.v + IDX.active, null)); if (!v.notes) return false;
      const t = 'Guide/Saved answers'; let n = Object.values(v.notes).find(x => x.t === t);
      if (!n) { n = mk(t, '# Saved from the Guide\n\n'); v.notes[n.id] = n; }
      n.md += '## ' + String(title).replace(/\n/g, ' ') + '\n' + String(md).trim() + '\n\n'; n.ts = Date.now();
      if (v === CUR) { saveLocal(); if (built) renderTree(); } else { const o = Object.assign({}, v); delete o.kind; sv(K.v + v.id, o); }
      return true;
    } catch (e) { return false; }
  },
  list: function () { boot(); return Object.values(CUR.notes).map(n => ({ id: n.id, t: n.t })); },
  openNote: function (id) { window.showScreen('notebook'); openNote(id); },
  run: function (a) { window.showScreen('notebook'); if (a === 'quick') quick(); else act(a); },
  dueCount: function () {
    try { if (!localStorage.getItem(K.idx)) return 0; boot(); const v = CUR && CUR.kind === 'local' ? CUR : ld(K.v + IDX.active, null); return v ? dueOf(cardsOf(v.notes)).length : 0; } catch (e) { return 0; }
  },
  createRecap: function (sid) {
    const sec = SECTORS.find(s => s.id === sid); if (!sec) return;
    window.showScreen('notebook'); if (!canEdit()) return toast('<b>View only</b><br>Switch to a vault you can edit.', 'cross');
    const t = 'Recaps/' + sec.label; let n = Object.values(CUR.notes).find(x => norm(x.t) === norm(t));
    if (!n) {
      n = mk(t, '# ' + sec.label + ' recap\n\n## In my own words\n\n\n## Key ideas\n' + (sec.blocks || []).map(b => '- [[lesson:' + b.id + '|' + String(b.title).replace(/[\[\]|]/g, '') + ']]').join('\n') + '\n\n## Flashcards\nTerm :: definition\n\n## Still unsure\n- \n');
      CUR.notes[n.id] = n; touch(n);
    }
    openNote(n.id); setView('split'); sfx('ok');
  }
};
return API;
})();


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

   SETUP (no tables, no SQL): create a Supabase project, copy the Project URL
   (https://<ref>.supabase.co — not the dashboard page) and the publishable
   key (Project Settings → API Keys) below. Realtime public channels are on
   by default. Leave both as placeholders and the lounge falls back to the
   previous Firestore presence automatically.

   TRUST MODEL: the anon key is public by design. Lounge presence is cosmetic —
   names and positions are self-declared and sanitised on receipt (length, range,
   prototype-key guards). Never put anything sensitive on this channel. */
const SUPABASE_CONFIG = {
  url: 'https://qxdieorzlnocxbxmgyoj.supabase.co',   // API host, NOT the dashboard settings page
  anonKey: 'sb_publishable_rPtDHrr-OQKH9h093HiW5w_KCvs9fIU',     // the public publishable key
  channel: 'lounge:deck07'
};
/* A dashboard link (…/dashboard/project/<ref>/…) is not an API host. The
   socket was dialing supabase.com and sitting in RECONNECTING forever. */
function supabaseApiUrl(raw) {
  const u = String(raw || '').trim();
  const dash = u.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) return 'https://' + dash[1] + '.supabase.co';
  const host = u.match(/^(https:\/\/[a-z0-9-]+\.supabase\.co)(?:\/.*)?$/i);
  return host ? host[1] : u.replace(/\/+$/, '');
}
const SB_OK = (function () {
  try {
    const u = supabaseApiUrl(SUPABASE_CONFIG.url), k = String(SUPABASE_CONFIG.anonKey || '');
    return u.indexOf('https://') === 0 && u.indexOf('.supabase.co') > 0 && u.indexOf('YOUR_') < 0 && k.length > 20 && k.indexOf('YOUR_') !== 0;
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
      this.client = window.supabase.createClient(supabaseApiUrl(SUPABASE_CONFIG.url), SUPABASE_CONFIG.anonKey, {
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
      ro.innerHTML = '<span class="small">OFFLINE MODE — configure FIREBASE_CONFIG in js/core/network.js to meet other operators.</span>';
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
/* ---------- messenger helpers (V6) ---------- */
const CH_EMO = ['👍', '❤️', '😂', '🔥', '🤯'];
function chHue(s) { let h = 0; s = String(s || '?'); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
function chDay(d) { const t = new Date(), y = new Date(Date.now() - 864e5); return d.toDateString() === t.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
function chRich(t) { return esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1</a>').replace(/(^|\s)@([\w-]{2,24})/g, '$1<span class="cmen">@$2</span>'); }
/* ---------- /messenger helpers ---------- */
const ChatEngine = {
  channel: 'global', sub: null, dm: null,
  unsub: null, lastDocs: [], lastSend: 0, RATE_MS: 1000, sweepT: null, // 1s cooldown
  avatarCache: Object.create(null), avatarRefreshT: null,
  EXPIRE_MS: 7 * 86400000, // Keeps chat history for 7 full days
  TOPICS: ['astronomy', 'physics', 'gaming-lore', 'mathematics', 'history', 'psychology'],

  normalizeAvatar: function (code) {
    const A = window.CodexAvatar;
    if (!A || !code) return '';
    const raw = String(code).trim().toLowerCase().split('.');
    const keys = Object.keys(A.MAX || {});
    if (raw.length !== keys.length) return '';
    for (let i = 0; i < keys.length; i++) {
      const n = parseInt(raw[i], 36);
      if (!isFinite(n) || n < 0 || n >= A.MAX[keys[i]]) return '';
    }
    try { return A.enc(A.parse(raw.join('.'))); } catch (e) { return ''; }
  },
  fallbackAvatar: function (name) {
    const A = window.CodexAvatar;
    return A ? this.normalizeAvatar(A.forName(name || 'OP')) : '';
  },
  scheduleAvatarRefresh: function () {
    const self = this;
    if (this.avatarRefreshT) return;
    this.avatarRefreshT = setTimeout(function () {
      self.avatarRefreshT = null;
      if (self.lastDocs.length) self.render(self.lastDocs);
    }, 0);
  },
  loadAvatar: function (uid) {
    const self = this;
    if (typeof uid !== 'string' || !uid || uid.indexOf('/') !== -1 || !fbOK()) return Promise.resolve('');
    if (Object.prototype.hasOwnProperty.call(this.avatarCache, uid)) {
      return this.avatarCache[uid] && typeof this.avatarCache[uid].then === 'function'
        ? this.avatarCache[uid] : Promise.resolve(this.avatarCache[uid] || '');
    }
    this.avatarCache[uid] = DB.collection('players').doc(uid).get().then(function (doc) {
      const d = doc.exists ? (doc.data() || {}) : {};
      const code = self.normalizeAvatar(d.avatar);
      self.avatarCache[uid] = code;
      self.scheduleAvatarRefresh();
      return code;
    }).catch(function () {
      self.avatarCache[uid] = '';
      self.scheduleAvatarRefresh();
      return '';
    });
    return this.avatarCache[uid];
  },
  avatarFor: function (m) {
    const A = window.CodexAvatar;
    if (!A) return '';
    const uid = String(m.u || '');
    if (uid && uid === AuthManager.uid) {
      const mine = this.normalizeAvatar(A.mine());
      if (mine) return mine;
    }
    const messageAvatar = this.normalizeAvatar(m.av);
    if (messageAvatar) return messageAvatar;
    const cached = uid && this.avatarCache[uid];
    if (cached && typeof cached.then !== 'function') return cached;
    if (uid) this.loadAvatar(uid);
    return this.fallbackAvatar(m.n || 'OP');
  },

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
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); self.send(); }
    });
    this.mount();
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
    this.lastId = null; this.unseen = 0;
    if (this.unsub) { try { this.unsub(); } catch (e) {} this.unsub = null; }
    const log = q('#chatLog');
    if (!log) return;
    const col = this.colOf();
    if (!col) {
      log.innerHTML = '<div class="chat-sys">OFFLINE MODE — configure FIREBASE_CONFIG in js/core/network.js to open comms.</div>';
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
    const msgs = docs.filter(function (m) { return m.k !== 'r'; }), RX = {};
    docs.forEach(function (m) { if (m.k === 'r' && m.to && CH_EMO.indexOf(m.e) >= 0) { const a = RX[m.to] = RX[m.to] || {}; (a[m.e] = a[m.e] || []).push(m.u); } });
    if (!msgs.length) { log.innerHTML = '<div class="chat-sys chat-empty"><b>' + esc(this.chanLabel()) + '</b> is quiet.<br>Say hi. The first message sets the tone.</div>'; this.lastId = null; this.unseen = 0; this.jumpUI(); return; }
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 90, first = !this.lastId;
    const me = AuthManager.uid, admin = AdminManager.isAdmin(), show = msgs.slice(-150), A = window.CodexAvatar;
    const same = function (a, b) { return !!(a && b && a.u && a.u === b.u && b.ts - a.ts < 300000 && new Date(a.ts).toDateString() === new Date(b.ts).toDateString()); };
    const self = this;
    let h = '', lastDay = '';
    show.forEach(function (m, i) {
      const d = new Date(m.ts || Date.now()), dk = d.toDateString();
      if (dk !== lastDay) { lastDay = dk; h += '<div class="cday"><span>' + chDay(d) + '</span></div>'; }
      const mine = m.u === me, grp = same(show[i - 1], m), end = !same(m, show[i + 1]), rx = RX[m._id];
      const av = self.avatarFor(m);
      h += '<div class="cm' + (mine ? ' mine' : '') + (grp ? ' grp' : '') + '" data-id="' + esc(m._id || '') + '">' +
        (grp ? '<span class="cav sp" aria-hidden="true"></span>' : '<span class="cav' + (mine ? ' mine-av' : '') + '">' + (av ? A.el(av, 32) : '') + '</span>') +
        '<div class="cbody">' + (!mine && !grp ? '<div class="cwho">' + esc(m.n || 'OP') + (m.a ? '<span class="abadge" title="System administrator">ADMIN</span>' : '') + (m.g ? '<span class="gbadge" title="Anonymous guest link">GUEST</span>' : '') + '</div>' : '') +
        '<div class="cbub">' + (m.re ? '<button type="button" class="cquote" data-jump="' + esc(m.re.i || '') + '"><b>' + esc(m.re.n || 'OP') + '</b>' + esc(m.re.t || '') + '</button>' : '') + '<div class="ctx">' + chRich(m.t || '') + '</div></div>' +
        (rx ? '<div class="crxs">' + Object.keys(rx).map(function (e) { return '<button type="button" class="crx' + (rx[e].indexOf(me) >= 0 ? ' me' : '') + '" data-react="' + esc(e) + '">' + esc(e) + ' ' + rx[e].length + '</button>'; }).join('') + '</div>' : '') +
        (end && m.ts ? '<div class="cts">' + fmtTime(m.ts) + '</div>' : '') + '</div>' +
        '<div class="cact"><button type="button" data-reply aria-label="Reply">↩</button><button type="button" data-pick aria-label="React">☺</button>' + (admin && m._id ? '<button type="button" data-del aria-label="Delete message">×</button>' : '') + '</div>' +
        '<div class="cpick">' + CH_EMO.map(function (e) { return '<button type="button" data-react="' + e + '">' + e + '</button>'; }).join('') + '</div></div>';
    });
    log.innerHTML = h;
    const ids = show.map(function (m) { return m._id; }), li = this.lastId ? ids.indexOf(this.lastId) : -1, lastM = show[show.length - 1];
    this.lastId = ids[ids.length - 1];
    if (first || nearBottom || (lastM && lastM.u === me)) { log.scrollTop = log.scrollHeight; this.unseen = 0; }
    else if (li >= 0) this.unseen = (this.unseen || 0) + (ids.length - 1 - li);
    this.jumpUI();
  },

  find: function (id) { return (this.lastDocs || []).filter(function (m) { return m._id === id; })[0]; },
  setReply: function (r) {
    this.reply = r || null; const bar = q('#chatReply'); if (!bar) return;
    bar.hidden = !r;
    if (r) { bar.firstElementChild.innerHTML = 'Replying to <b>' + esc(r.n) + '</b> · ' + esc(r.t); const i = q('#chatInput'); if (i) i.focus(); }
  },
  react: function (id, emo) {
    const col = this.colOf();
    if (!col || !fbOK() || !AuthManager.user) { say('<b>Sign in to react</b>', 'speech', 2000); return; }
    const me = AuthManager.uid;
    if ((this.lastDocs || []).some(function (m) { return m.k === 'r' && m.to === id && m.e === emo && m.u === me; })) return;
    const now = Date.now(); if (now - (this.lastReact || 0) < 400) return; this.lastReact = now;
    guardedWrite('chat', function () { return col.add({ n: AuthManager.name || 'GUEST', u: me, k: 'r', to: id, e: emo, ts: Date.now() }); }).then(function (ok) { if (ok) blip('flip'); });
  },
  jumpUI: function () { const j = q('#chatJump'); if (!j) return; const n = this.unseen || 0; j.hidden = n < 1; j.textContent = '↓ ' + n + ' new'; },
  autosize: function (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; },
  catchUp: function () {
    if (!window.CodexGuide) return;
    const m = (this.lastDocs || []).filter(function (x) { return x.k !== 'r' && x.t; }).slice(-40).map(function (x) { return { n: x.n, t: x.t }; });
    if (!m.length) { say('Nothing to summarize yet.', 'speech', 2000); return; }
    window.CodexGuide.run('catchup', { chat: m, channel: this.chanLabel() });
  },
  mount: function () {
    const self = this, log = q('#chatLog');
    if (!log || log.dataset.v6) return; log.dataset.v6 = '1';
    const row = q('.chat-input-row'), panel = log.parentNode, input = q('#chatInput');
    if (row) row.insertAdjacentHTML('beforebegin', '<div class="creplybar" id="chatReply" hidden><span></span><button type="button" aria-label="Cancel reply">×</button></div>');
    panel.insertAdjacentHTML('beforeend', '<button type="button" class="cjump" id="chatJump" hidden></button>');
    const ch = q('#chatChannels'); if (ch && window.CodexGuide) ch.insertAdjacentHTML('beforeend', '<button type="button" class="chtool" id="chatCatch" title="Summarize the recent messages">✦ Catch up</button>');
    const rb = q('#chatReply button'); if (rb) rb.addEventListener('click', function () { self.setReply(null); });
    q('#chatJump').addEventListener('click', function () { log.scrollTop = log.scrollHeight; self.unseen = 0; self.jumpUI(); });
    const ct = q('#chatCatch'); if (ct) ct.addEventListener('click', function () { self.catchUp(); });
    log.addEventListener('scroll', function () { if (self.unseen && log.scrollHeight - log.scrollTop - log.clientHeight < 90) { self.unseen = 0; self.jumpUI(); } }, { passive: true });
    if (input) input.addEventListener('input', function () { self.autosize(input); });
    log.addEventListener('click', function (e) {
      const cm = e.target.closest('.cm'); if (!cm) return; const id = cm.dataset.id;
      if (e.target.closest('[data-del]')) { self.del(id); return; }
      if (e.target.closest('[data-reply]')) { const m = self.find(id); if (m) self.setReply({ i: id, n: m.n || 'OP', t: String(m.t || '').slice(0, 70) }); return; }
      const rb2 = e.target.closest('[data-react]'); if (rb2) { self.react(id, rb2.dataset.react); cm.classList.remove('picking'); return; }
      if (e.target.closest('[data-pick]')) { cm.classList.toggle('picking'); return; }
      const qt = e.target.closest('.cquote');
      if (qt) { const t = log.querySelector('.cm[data-id="' + String(qt.dataset.jump).replace(/"/g, '') + '"]'); if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.classList.add('flash'); setTimeout(function () { t.classList.remove('flash'); }, 1200); } return; }
      qa('.cm.sel', log).forEach(function (x) { if (x !== cm) x.classList.remove('sel'); }); cm.classList.toggle('sel');
    });
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
      const o = {
        n: AuthManager.name || 'GUEST', u: AuthManager.uid,
        t: text, ts: Date.now(),
        a: AuthManager.admin ? 1 : 0, g: AuthManager.guest ? 1 : 0
      };
      const avatar = window.CodexAvatar && ChatEngine.normalizeAvatar(window.CodexAvatar.mine());
      if (avatar) o.av = avatar;
      if (self.reply) o.re = self.reply;
      return col.add(o);
    }).then(function (ok) {
      if (ok) { input.value = ''; self.autosize(input); self.setReply(null); blip('flip'); const lg = q('#chatLog'); if (lg) lg.scrollTop = lg.scrollHeight; }
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
        res.textContent = 'OFFLINE MODE — paste your Firebase web config into FIREBASE_CONFIG (js/core/network.js) to enable accounts, lounge and chat.';
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
  db: function () { return fbOK() ? DB : null; },
  guardedWrite: guardedWrite,
  quota: function () { return { writes: QuotaGuard.ledger.w, budget: QuotaGuard.BUDGET, left: QuotaGuard.left() }; },
  AuthManager: AuthManager,
  NotebookManager: NotebookManager,
  LoungeEngine: LoungeEngine,
  SupabaseLounge: SupabaseLounge,
  ChatEngine: ChatEngine,
  AdminManager: AdminManager
};

})();
