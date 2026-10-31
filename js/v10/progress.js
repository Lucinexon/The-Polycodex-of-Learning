/* Polycodex v10 — CodexProgress.
   The single writer for learner progress. Contract C2 in docs/v10/contracts.md.
   No DOM assumptions; storage and clock are injectable for headless tests. */
(function (root) {
  'use strict';

  var KEY = 'cx_v10_progress';
  var BACKUP_KEY = 'cx_v10_progress_bak';
  var SNAP_PREFIX = 'cx_legacy_snapshot_';
  var SCHEMA = 2;
  var DAY = 86400000;
  var REVIEW_STEPS = [1, 3, 7, 14, 30, 60];

  function djb2(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function dayIndex(ms) {
    return Math.floor(ms / DAY);
  }

  function dayKey(ms) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fresh(now) {
    return {
      v: SCHEMA,
      deviceId: 'dev-' + Math.random().toString(36).slice(2, 10) + '-' + now.toString(36),
      updatedAt: now,
      dives: {},
      units: {},
      wrecks: {},
      concepts: {},
      reviews: {},
      xp: {},
      goal: { daily: 1, days: {} },
      collection: {},
      prefs: { fx: 'auto', text: 1, slate: 'day', sound: 'on', outline: true },
      legacy: { importedAt: null, sourceHashes: {}, imported: false, charted: {}, seen: [], known: [] }
    };
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function create(opts) {
    opts = opts || {};
    var storage = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var nowFn = opts.now || Date.now;
    var key = opts.key || KEY;
    var debounceMs = opts.debounceMs == null ? 250 : opts.debounceMs;
    var listeners = [];
    var saveTimer = null;
    var status = 'saved';
    var statusSince = 0;
    var readonly = false;
    var lastError = null;
    var state = null;
    var stateSource = 'fresh';
    var pendingSince = 0;

    function now() { return nowFn(); }

    function ensureShape(s) {
      if (!s || typeof s !== 'object') return fresh(now());
      if (!s.v) s.v = SCHEMA;
      ['dives', 'units', 'wrecks', 'concepts', 'reviews', 'xp', 'collection'].forEach(function (k) {
        if (!s[k] || typeof s[k] !== 'object') s[k] = {};
      });
      if (!s.goal || typeof s.goal !== 'object') s.goal = { daily: 1, days: {} };
      if (!s.goal.days || typeof s.goal.days !== 'object') s.goal.days = {};
      if (!s.prefs || typeof s.prefs !== 'object') s.prefs = {};
      var pd = { fx: 'auto', text: 1, slate: 'day', sound: 'on', outline: true };
      Object.keys(pd).forEach(function (k) { if (s.prefs[k] == null) s.prefs[k] = pd[k]; });
      if (!s.legacy || typeof s.legacy !== 'object') s.legacy = {};
      var ld = { importedAt: null, sourceHashes: {}, imported: false, charted: {}, seen: [], known: [] };
      Object.keys(ld).forEach(function (k) { if (s.legacy[k] == null) s.legacy[k] = ld[k]; });
      if (!s.deviceId) s.deviceId = 'dev-' + Math.random().toString(36).slice(2, 10);
      if (!s.updatedAt) s.updatedAt = now();
      return s;
    }

    function readRaw(k) {
      if (!storage) return null;
      try { return storage.getItem(k); } catch (e) { return null; }
    }

    function writeRaw(k, v) {
      if (!storage) throw new Error('no storage');
      storage.setItem(k, v);
    }

    function load() {
      var raw = readRaw(key);
      if (!raw) { state = fresh(now()); stateSource = 'fresh'; return state; }
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        lastError = { code: 'corrupt', message: 'Progress file could not be read.' };
        try { writeRaw(key + '_corrupt_' + now().toString(36), raw); } catch (e2) { /* keep going */ }
        state = fresh(now());
        stateSource = 'recovered';
        return state;
      }
      if (parsed && typeof parsed.v === 'number' && parsed.v > SCHEMA) {
        readonly = true;
        state = ensureShape(parsed);
        stateSource = 'newer';
        return state;
      }
      state = ensureShape(parsed);
      stateSource = 'loaded';
      return state;
    }

    function emit(evt) {
      listeners.slice().forEach(function (fn) {
        try { fn(evt || {}, api); } catch (e) { /* listener errors never block a save */ }
      });
    }

    function setStatus(s, err) {
      if (status !== s) {
        status = s;
        statusSince = now();
        if (err) lastError = err;
        emit({ type: 'status', status: status, error: lastError });
      }
    }

    function scheduleWrite(immediate) {
      if (readonly) return;
      if (immediate || debounceMs === 0 || !storage) {
        api.flush();
        return;
      }
      if (!saveTimer) {
        if (status !== 'saving') { setStatus('saving'); pendingSince = now(); }
        saveTimer = setTimeout(function () {
          saveTimer = null;
          api.flush();
        }, debounceMs);
      }
    }

    function touch() {
      state.updatedAt = now();
      emit({ type: 'change', state: state });
      scheduleWrite(false);
    }

    function api() {}
    api = {
      get state() { return state; },
      get status() { return status; },
      get readonly() { return readonly; },
      get lastError() { return lastError; },
      get source() { return stateSource; },
      init: function () { load(); api.applyPrefs(); emit({ type: 'init', state: state }); return api; },
      subscribe: function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
      touch: touch,
      flush: function () {
        if (readonly) return false;
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        if (!storage) { setStatus('error', { code: 'nostorage', message: 'This browser has no local storage.' }); return false; }
        state.updatedAt = now();
        try {
          writeRaw(key, JSON.stringify(state));
          var wasError = status === 'error';
          setStatus('saved');
          if (wasError) emit({ type: 'recovered' });
          return true;
        } catch (e) {
          setStatus('error', { code: e && e.name || 'write', message: 'Couldn\u2019t save on this device.' });
          return false;
        }
      },
      applyPrefs: function () {
        if (typeof document === 'undefined') return;
        var p = state.prefs;
        document.documentElement.dataset.text = String(p.text || 1);
        document.documentElement.dataset.slate = p.slate || 'day';
        if (p.sound === 'off') document.documentElement.dataset.sound = 'off';
        else delete document.documentElement.dataset.sound;
      },
      setPref: function (k, v) {
        state.prefs[k] = v;
        api.applyPrefs();
        touch();
        return v;
      },

      /* ---- lifecycle -------------------------------------------------- */
      dive: function (id) { return state.dives[id] || null; },
      unit: function (id) { return state.units[id] || null; },
      wreck: function (id) { return state.wrecks[id] || null; },

      startDive: function (dive, cardId, rev) {
        var d = state.dives[dive.id];
        if (!d) {
          d = state.dives[dive.id] = {
            status: 'in_progress', cardId: cardId || (dive.cards[0] && dive.cards[0].id) || null,
            rev: rev || 1, prompts: {}, checks: {}, activity: null,
            seenCards: {}, notes: {}, startedAt: now(), surfacedAt: null, updatedAt: now()
          };
          touch();
        } else {
          if (cardId) d.cardId = cardId;
          if (rev && d.rev !== rev) d.rev = rev;
          d.updatedAt = now();
          touch();
        }
        return d;
      },
      setCard: function (diveId, cardId, rev) {
        var d = state.dives[diveId];
        if (!d || d.status === 'surfaced') return;
        if (d.cardId !== cardId) { d.cardId = cardId; d.updatedAt = now(); touch(); }
        if (rev && d.rev !== rev) { d.rev = rev; touch(); }
      },
      markCardSeen: function (diveId, cardId, concepts) {
        var d = state.dives[diveId];
        if (!d) return false;
        if (!d.seenCards) d.seenCards = {};
        if (d.seenCards[cardId]) return false;
        d.seenCards[cardId] = now();
        (concepts || []).forEach(function (id) {
          var c = api.concept(id);
          c.lastExposureAt = now();
          api.raise(id, 1);
        });
        d.updatedAt = now();
        touch();
        return true;
      },
      skipPrompt: function (diveId, promptId) {
        var d = state.dives[diveId];
        if (!d || d.prompts[promptId]) return d && d.prompts[promptId];
        d.prompts[promptId] = { ok: false, skipped: true, first: true, at: now() };
        d.updatedAt = now();
        touch();
        return d.prompts[promptId];
      },
      setNote: function (diveId, cardId, text) {
        var d = state.dives[diveId];
        if (!d) return;
        if (!d.notes) d.notes = {};
        d.notes[cardId] = String(text || '').slice(0, 2000);
        d.updatedAt = now();
        scheduleWrite(false);
      },
      getNote: function (diveId, cardId) {
        var d = state.dives[diveId];
        return d && d.notes && d.notes[cardId] || '';
      },
      answerPrompt: function (diveId, promptId, ok) {
        var d = state.dives[diveId];
        if (!d) return null;
        var old = d.prompts[promptId];
        if (old) return old;
        var rec = { ok: !!ok, first: true, at: now() };
        d.prompts[promptId] = rec;
        d.updatedAt = now();
        if (ok) api.addXp('prompt:' + diveId + ':' + promptId + ':first-ok', 4);
        touch();
        return rec;
      },
      answerCheck: function (diveId, checkId, ok, idk, conceptId, transfer) {
        var d = state.dives[diveId];
        if (!d) return null;
        if (d.checks[checkId]) return d.checks[checkId];
        var rec = { ok: !!ok, idk: !!idk, at: now() };
        d.checks[checkId] = rec;
        d.updatedAt = now();
        if (ok && conceptId) {
          var c = api.concept(conceptId);
          var isTransfer = !!transfer;
          var diff = c.lastExposureAt ? now() - c.lastExposureAt : 0;
          if (diff >= 20 * 3600000) {
            c.recalledAt = c.recalledAt || now();
            api.raise(conceptId, 3);
          } else {
            api.raise(conceptId, 2);
          }
          if (isTransfer) c.appliedAt = c.appliedAt || now();
          c.lastResult = 'correct';
        } else if (conceptId) {
          var c2 = api.concept(conceptId);
          c2.lastResult = idk ? 'idk' : 'wrong';
        }
        if (ok) api.addXp('check:' + diveId + ':' + checkId + ':first-ok', 8);
        touch();
        return rec;
      },
      saveActivityState: function (diveId, template, data, ok) {
        var d = state.dives[diveId];
        if (!d) return null;
        var prev = d.activity && d.activity.state;
        var alreadyOk = !!(prev && prev.ok);
        d.activity = { state: { template: template, data: data, ok: alreadyOk || !!ok, done: alreadyOk || !!ok }, at: now() };
        d.updatedAt = now();
        touch();
        return d.activity.state;
      },
      completeActivity: function (diveId, template, ok, concepts, data) {
        var d = state.dives[diveId];
        if (!d) return null;
        var rec = { ok: !!ok, at: now() };
        var prev = d.activity && d.activity.state;
        var alreadyOk = !!(prev && prev.ok);
        d.activity = { state: { template: template, data: data || (prev && prev.data) || null, ok: alreadyOk || !!ok, done: alreadyOk || !!ok }, at: now() };
        d.updatedAt = now();
        if (ok && !alreadyOk) {
          api.addXp('act:' + diveId + ':' + template + ':first', 12);
          (concepts || []).forEach(function (id) { api.raise(id, 2); });
        }
        touch();
        return rec;
      },
      surface: function (dive) {
        var d = state.dives[dive.id];
        if (!d) return { error: 'no-dive' };
        if (d.status === 'surfaced') return { already: true, dive: d };
        var answered = (dive.check || []).filter(function (c) { return d.checks[c.id]; });
        if (answered.length < 3) return { error: 'checks-incomplete', answered: answered.length };
        d.status = 'surfaced';
        d.surfacedAt = now();
        d.updatedAt = now();
        d.activity = null;
        var xp = api.addXp('dive:' + dive.id + ':surface', 20);

        var today = dayKey(now());
        state.goal.days[today] = (state.goal.days[today] || 0) + 1;
        var keys = Object.keys(state.goal.days).sort();
        while (keys.length > 60) delete state.goal.days[keys.shift()];

        var collected = null;
        if (dive.collect && dive.collect.id && !state.collection[dive.collect.id]) {
          state.collection[dive.collect.id] = new Date(now()).toISOString();
          collected = dive.collect;
        }
        var added = [];
        (dive.review || []).forEach(function (r) {
          var id = 'v10:' + dive.id + ':' + r.id;
          if (!state.reviews[id]) {
            state.reviews[id] = { b: 0, d: dayIndex(now()), created: now(), concept: r.concept || null };
            added.push(id);
          }
        });
        touch();
        return {
          surfaced: true, xp: xp, collected: collected, reviewAdded: added,
          checks: (dive.check || []).map(function (c) { return { id: c.id, concept: c.concept, ...d.checks[c.id] }; })
        };
      },

      finishWreck: function (lessonId) {
        var w = state.wrecks[lessonId] || (state.wrecks[lessonId] = { status: 'in_progress', anchor: null, para: 0, updatedAt: now(), readAt: null });
        if (w.status === 'read') return { already: true };
        w.status = 'read';
        w.readAt = now();
        w.updatedAt = now();
        api.addXp('wreck:' + lessonId + ':finish', 3);
        touch();
        return { read: true };
      },
      setWreckPosition: function (lessonId, anchor, para, immediate) {
        var w = state.wrecks[lessonId] || (state.wrecks[lessonId] = { status: 'in_progress', anchor: null, para: 0, updatedAt: now(), readAt: null });
        if (w.status === 'read') return;
        w.anchor = anchor;
        w.para = para || 0;
        w.updatedAt = now();
        if (immediate) api.flush(); else scheduleWrite(false);
      },

      /* ---- concepts / xp --------------------------------------------- */
      concept: function (id) {
        if (!state.concepts[id]) {
          state.concepts[id] = { stage: 0, seenAt: null, practicedAt: null, recalledAt: null, appliedAt: null, lastResult: null, lastExposureAt: null };
        }
        return state.concepts[id];
      },
      stage: function (id) { return (state.concepts[id] && state.concepts[id].stage) || 0; },
      raise: function (id, stage) {
        if (!id) return 0;
        var c = api.concept(id);
        var next = clamp(stage, 0, 3);
        if (next > c.stage) {
          c.stage = next;
          if (next === 1) c.seenAt = c.seenAt || now();
          if (next === 2) c.practicedAt = c.practicedAt || now();
          if (next === 3) c.recalledAt = c.recalledAt || now();
        }
        return c.stage;
      },
      expose: function (concepts) {
        (concepts || []).forEach(function (id) {
          var c = api.concept(id);
          c.lastExposureAt = now();
          api.raise(id, 1);
        });
        touch();
      },
      addXp: function (eventKey, amt) {
        if (state.xp[eventKey]) return 0;
        state.xp[eventKey] = { amt: amt, at: now() };
        return amt;
      },
      xpTotal: function () {
        return Object.keys(state.xp).reduce(function (n, k) { return n + (state.xp[k].amt || 0); }, 0);
      },
      dailyGoal: function () {
        var today = dayKey(now());
        var done = state.goal.days[today] || 0;
        return { done: done, target: state.goal.daily || 1, met: done >= (state.goal.daily || 1) };
      },
      goalRing: function () {
        var g = api.dailyGoal();
        return g.target > 0 ? Math.min(1, g.done / g.target) : 0;
      },

      /* ---- review ----------------------------------------------------- */
      dueReviews: function () {
        var today = dayIndex(now());
        return Object.keys(state.reviews).filter(function (id) { return state.reviews[id].d <= today; });
      },
      reviewAnswer: function (id, ok) {
        var r = state.reviews[id];
        if (!r) return null;
        if (ok) {
          r.b = Math.min(5, (r.b || 0) + 1);
          r.d = dayIndex(now()) + REVIEW_STEPS[r.b];
          api.raise(r.concept, 3);
        } else {
          r.b = Math.max(0, (r.b || 0) - 1);
          r.d = dayIndex(now()) + 1;
          var c = api.concept(r.concept);
          c.lastResult = 'wrong';
        }
        r.last = now();
        touch();
        return r;
      },
      reviewItems: function () { return state.reviews; },

      /* ---- legacy import --------------------------------------------- */
      importLegacy: function () {
        var rawS = readRaw('polymath_codex_v1');
        var rawL = readRaw('cx_lounge_world_v1');
        var rawR = readRaw('cx_v5_srs');
        if (!rawS && !rawL && !rawR) return { imported: false, reason: 'no-legacy' };
        var hashes = {
          'polymath_codex_v1': rawS ? djb2(rawS) : null,
          'cx_lounge_world_v1': rawL ? djb2(rawL) : null,
          'cx_v5_srs': rawR ? djb2(rawR) : null
        };
        var same = Object.keys(hashes).every(function (k) { return (state.legacy.sourceHashes || {})[k] === hashes[k]; });
        if (same) return { imported: false, reason: 'unchanged' };

        /* Back up before the first import, verbatim. Abort if backup fails. */
        try {
          if (storage && !readRaw(BACKUP_KEY)) writeRaw(BACKUP_KEY, JSON.stringify(state));
          var stamp = dayKey(now()) + '-' + now().toString(36);
          if (storage) {
            if (rawS && !readRaw(SNAP_PREFIX + 'codex_' + stamp)) writeRaw(SNAP_PREFIX + 'codex_' + stamp, rawS);
            if (rawL && !readRaw(SNAP_PREFIX + 'lounge_' + stamp)) writeRaw(SNAP_PREFIX + 'lounge_' + stamp, rawL);
            if (rawR && !readRaw(SNAP_PREFIX + 'srs_' + stamp)) writeRaw(SNAP_PREFIX + 'srs_' + stamp, rawR);
          }
        } catch (e) {
          setStatus('error', { code: 'backup', message: 'Could not back up your old progress, so nothing was changed.' });
          return { imported: false, reason: 'backup-failed' };
        }

        var summary = { imported: true, xp: 0, charted: 0, seen: 0, known: 0, srs: 0 };
        if (rawS) {
          try {
            var S = JSON.parse(rawS);
            if (S && typeof S.xp === 'number' && S.xp > 0) {
              if (!state.xp['legacy:polymath:xp']) {
                state.xp['legacy:polymath:xp'] = { amt: S.xp, at: now() };
                summary.xp = S.xp;
              }
            }
            if (S && S.completed && typeof S.completed === 'object') {
              Object.keys(S.completed).forEach(function (id) {
                if (!state.legacy.charted[id]) { state.legacy.charted[id] = true; summary.charted++; }
              });
            }
            if (S && S.seen && typeof S.seen === 'object') {
              state.legacy.seen = Object.keys(S.seen);
              summary.seen = state.legacy.seen.length;
            }
            if (S && Array.isArray(S.known)) {
              state.legacy.known = S.known.slice();
              summary.known = state.legacy.known.length;
            }
          } catch (e) { /* keep raw backup, skip broken source */ }
        }
        if (rawL) {
          try {
            var L = JSON.parse(rawL);
            state.legacy.lounge = L;
          } catch (e) { /* skip */ }
        }
        if (rawR) {
          try {
            var R = JSON.parse(rawR);
            if (R && typeof R === 'object') {
              state.legacy.srs = R;
              summary.srs = Object.keys(R).length;
            }
          } catch (e) { /* skip */ }
        }
        state.legacy.sourceHashes = hashes;
        state.legacy.imported = true;
        state.legacy.importedAt = state.legacy.importedAt || now();
        touch();
        return summary;
      },

      /* ---- merge (two tabs / future cloud) --------------------------- */
      mergeState: function (other) {
        if (!other || typeof other !== 'object') return state;
        function at(x) { return (x && x.updatedAt) || 0; }
        Object.keys(other.dives || {}).forEach(function (id) {
          var a = state.dives[id], b = other.dives[id];
          if (!a) { state.dives[id] = b; return; }
          if (b.status === 'surfaced' && a.status !== 'surfaced') { state.dives[id] = b; return; }
          if (at(b) > at(a)) {
            var prompts = Object.assign({}, a.prompts || {}, b.prompts || {});
            var checks = Object.assign({}, a.checks || {}, b.checks || {});
            state.dives[id] = Object.assign({}, a, b, { prompts: prompts, checks: checks, status: a.status === 'surfaced' ? 'surfaced' : b.status });
          } else {
            a.prompts = Object.assign({}, b.prompts || {}, a.prompts || {});
            a.checks = Object.assign({}, b.checks || {}, a.checks || {});
          }
        });
        Object.keys(other.units || {}).forEach(function (id) { if (!state.units[id] || at(other.units[id]) > at(state.units[id])) state.units[id] = other.units[id]; });
        Object.keys(other.wrecks || {}).forEach(function (id) {
          var a = state.wrecks[id], b = other.wrecks[id];
          if (!a) state.wrecks[id] = b;
          else if (b.status === 'read' || at(b) > at(a)) state.wrecks[id] = Object.assign({}, a, b, { status: a.status === 'read' ? 'read' : b.status });
        });
        Object.keys(other.concepts || {}).forEach(function (id) {
          var a = api.concept(id), b = other.concepts[id];
          a.stage = Math.max(a.stage || 0, b.stage || 0);
          ['seenAt', 'practicedAt', 'recalledAt', 'appliedAt', 'lastExposureAt'].forEach(function (k) { a[k] = Math.max(a[k] || 0, b[k] || 0) || null; });
          a.lastResult = (b.lastExposureAt || 0) > (a.lastExposureAt || 0) ? b.lastResult : a.lastResult;
        });
        ['xp', 'collection', 'reviews'].forEach(function (k) {
          Object.keys(other[k] || {}).forEach(function (id) { if (!state[k][id]) state[k][id] = other[k][id]; });
        });
        Object.keys(other.goal && other.goal.days || {}).forEach(function (d) {
          state.goal.days[d] = Math.max(state.goal.days[d] || 0, other.goal.days[d]);
        });
        if (at(other) > at(state)) state.prefs = Object.assign({}, state.prefs, other.prefs || {});
        if (other.legacy) {
          Object.keys(other.legacy.charted || {}).forEach(function (id) { state.legacy.charted[id] = true; });
          state.legacy.imported = state.legacy.imported || other.legacy.imported;
        }
        state.legacy.seen = Array.from(new Set((state.legacy.seen || []).concat(other.legacy && other.legacy.seen || [])));
        state.legacy.known = Array.from(new Set((state.legacy.known || []).concat(other.legacy && other.legacy.known || [])));
        touch();
        return state;
      },

      /* ---- export ----------------------------------------------------- */
      exportJSON: function () { return JSON.stringify(state, null, 2); },
      importJSON: function (text) {
        var parsed;
        try { parsed = JSON.parse(text); } catch (e) { return { ok: false, error: 'Not valid JSON.' }; }
        if (!parsed || parsed.v !== SCHEMA) return { ok: false, error: 'Unsupported progress version.' };
        state = ensureShape(parsed);
        touch(); api.flush();
        return { ok: true };
      },
      stats: function () {
        var dives = Object.keys(state.dives);
        return {
          divesStarted: dives.length,
          divesSurfaced: dives.filter(function (id) { return state.dives[id].status === 'surfaced'; }).length,
          xp: api.xpTotal(),
          collection: Object.keys(state.collection).length,
          wrecksRead: Object.keys(state.wrecks).filter(function (id) { return state.wrecks[id].status === 'read'; }).length,
          due: api.dueReviews().length
        };
      }
    };

    load();
    if (opts.autoSave !== false) {
      /* Lifecycle flush: never lose the last card. */
      if (typeof window !== 'undefined' && !opts.noListeners) {
        window.addEventListener('pagehide', function () { api.flush(); });
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') api.flush(); });
      }
    }
    return api;
  }

  var exported = { create: create, KEY: KEY, SCHEMA: SCHEMA, dayIndex: dayIndex, dayKey: dayKey, djb2: djb2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.CodexProgressFactory = exported;
  if (typeof window !== 'undefined' && !root.CodexProgress) {
    root.CodexProgress = create({});
    root.CodexProgress.init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
