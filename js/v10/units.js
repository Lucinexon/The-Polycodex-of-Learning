/* Polycodex v10 — CodexUnits registry and lazy loader.
   Units are plain scripts registering themselves. Script injection works on
   file://, HTTP and inside a service worker cache. Bodies never enter the manifest. */
(function (root) {
  'use strict';
  var registry = {};
  var pending = root.__PENDING_UNITS__ || [];
  var loads = {};
  var listeners = [];

  function manifest() {
    return root.CODEX_MANIFEST || { reefs: [], units: [], wrecks: [], totals: {} };
  }

  function emit(unit) {
    listeners.slice().forEach(function (fn) { try { fn(unit); } catch (e) { /* ignore */ } });
  }

  function register(unit) {
    if (!unit || !unit.id) throw new Error('CodexUnits.register needs a unit id');
    registry[unit.id] = unit;
    emit(unit);
    return unit;
  }

  function meta(id) {
    return manifest().units.find(function (u) { return u.id === id; }) || null;
  }

  function get(id) { return registry[id] || null; }
  function all() { return Object.keys(registry).map(function (id) { return registry[id]; }); }

  function load(id) {
    if (registry[id]) return Promise.resolve(registry[id]);
    if (loads[id]) return loads[id];
    var m = meta(id);
    if (!m) return Promise.reject(new Error('Unknown unit: ' + id));
    loads[id] = new Promise(function (resolve, reject) {
      if (typeof document === 'undefined') { reject(new Error('No document to load a unit into.')); return; }
      var done = false;
      var s = document.createElement('script');
      s.src = m.file;
      s.async = true;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        s.remove();
        delete loads[id];
        reject(new Error('Loading ' + (m.title || id) + ' took too long.'));
      }, 8000);
      s.onload = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (registry[id]) resolve(registry[id]);
        else { delete loads[id]; reject(new Error('Unit ' + id + ' did not register.')); }
      };
      s.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        delete loads[id];
        s.remove();
        reject(new Error('Could not load ' + (m.title || id) + '.'));
      };
      document.head.appendChild(s);
    });
    return loads[id];
  }

  function unitForDive(diveId) {
    var ms = manifest().units;
    for (var i = 0; i < ms.length; i++) {
      if ((ms[i].dives || []).some(function (d) { return d.id === diveId; })) return ms[i];
    }
    return null;
  }

  function loadForDive(diveId) {
    var m = unitForDive(diveId);
    return m ? load(m.id) : Promise.reject(new Error('Unknown dive: ' + diveId));
  }

  function findDive(unit, diveId) {
    if (!unit) return null;
    return (unit.dives || []).find(function (d) { return d.id === diveId; }) || null;
  }

  function findCard(dive, cardId) {
    if (!dive) return null;
    return (dive.cards || []).find(function (c) { return c.id === cardId; }) || null;
  }

  function notes(id) {
    var m = meta(id);
    return (m && m.objectives) || [];
  }

  function conceptName(id) {
    var ms = manifest().units;
    for (var i = 0; i < ms.length; i++) {
      var g = (ms[i].glossary || []).find(function (x) { return x.concept === id; });
      if (g) return g.term;
    }
    return id;
  }

  function unitsForReef(reefId) {
    return manifest().units.filter(function (u) { return u.reef === reefId; });
  }

  function liveUnits() {
    return manifest().units.filter(function (u) { return u.status === 'reviewed' || u.status === 'published'; });
  }

  if (pending.length) pending.forEach(register);
  root.__PENDING_UNITS__ = pending;

  root.CodexUnits = {
    register: register,
    get: get,
    all: all,
    load: load,
    manifest: manifest,
    meta: meta,
    unitForDive: unitForDive,
    loadForDive: loadForDive,
    findDive: findDive,
    findCard: findCard,
    notes: notes,
    conceptName: conceptName,
    unitsForReef: unitsForReef,
    liveUnits: liveUnits,
    onRegister: function (fn) { listeners.push(fn); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
