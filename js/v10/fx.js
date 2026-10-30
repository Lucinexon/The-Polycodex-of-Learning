/* Polycodex v10 — CodexFX tiers, CodexLoop scheduler, toasts.
   Contract C4: one scheduler, one tier authority, no ad-hoc rAF loops. */
(function (root) {
  'use strict';
  var TIERS = ['off', 'low', 'med', 'high'];
  var current = 'high';
  var manual = false;
  var probeDone = false;
  var reduceQuery = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  var listeners = [];

  function prefersReduced() { return !!(reduceQuery && reduceQuery.matches); }

  function detect() {
    var nav = root.navigator || {};
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn && conn.saveData) return 'off';
    if (conn && /(^|-)2g$/.test(conn.effectiveType || '')) return 'off';
    if (prefersReduced()) return 'low';
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return 'low';
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) return 'low';
    if (conn && /3g/.test(conn.effectiveType || '')) return 'med';
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return 'med';
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return 'med';
    return 'high';
  }

  function apply() {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.fx = current;
    document.documentElement.dataset.reduced = prefersReduced() ? '1' : '0';
    listeners.slice().forEach(function (fn) { try { fn(current); } catch (e) { /* ignore */ } });
  }

  function lower(n) {
    var i = TIERS.indexOf(current);
    return TIERS[Math.max(0, i - (n || 1))];
  }

  function setTier(t, opts) {
    opts = opts || {};
    if (!TIERS.includes(t)) return current;
    if (opts.manual) manual = true;
    var prev = current;
    current = t;
    apply();
    if (opts.announce && TIERS.indexOf(t) < TIERS.indexOf(prev)) toast('Graphics lowered to keep things smooth.', { tone: 'info' });
    return current;
  }

  function init(progress) {
    var pref = progress && progress.state && progress.state.prefs && progress.state.prefs.fx;
    if (pref && pref !== 'auto' && TIERS.includes(pref)) {
      manual = true;
      current = pref;
    } else {
      current = detect();
    }
    apply();
    if (!manual && !probeDone && current === 'high') {
      probeDone = true;
      probe();
    }
    if (reduceQuery && reduceQuery.addEventListener) {
      reduceQuery.addEventListener('change', function () {
        if (!manual) { current = detect(); apply(); }
      });
    }
    return current;
  }

  /* One-shot idle probe. Not a continuous loop. */
  function probe() {
    if (typeof requestAnimationFrame === 'undefined') return;
    var times = [];
    var last = 0;
    function frame(ts) {
      if (last) times.push(ts - last);
      last = ts;
      if (times.length < 30) requestAnimationFrame(frame);
      else {
        var avg = times.reduce(function (a, b) { return a + b; }, 0) / times.length;
        if (avg > 24 && current === 'high' && !manual) setTier('med', { announce: true });
        else if (avg > 24 && current === 'med' && !manual) setTier('low', { announce: true });
      }
    }
    setTimeout(function () { requestAnimationFrame(frame); }, 1800);
  }

  /* ---- one scheduler ------------------------------------------------- */
  var loop = (function () {
    var fns = [];
    var running = false;
    var raf = 0;
    var last = 0;
    function tick(ts) {
      if (!running) return;
      var dt = last ? ts - last : 16;
      last = ts;
      for (var i = fns.length - 1; i >= 0; i--) {
        try { if (fns[i](dt, ts) === false) fns.splice(i, 1); } catch (e) { fns.splice(i, 1); }
      }
      if (!fns.length) { stop(); return; }
      raf = requestAnimationFrame(tick);
    }
    function start() {
      if (running || !fns.length) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') stop();
        else if (fns.length) start();
      });
    }
    return {
      add: function (fn) {
        if (typeof fn !== 'function') return function () {};
        fns.push(fn);
        if (current === 'high' || current === 'med') start();
        return function () { var i = fns.indexOf(fn); if (i >= 0) fns.splice(i, 1); };
      },
      kick: function () { start(); },
      stop: stop,
      start: start,
      get activeCount() { return fns.length; },
      get running() { return running; }
    };
  })();

  /* ---- toasts -------------------------------------------------------- */
  function toast(message, opts) {
    opts = opts || {};
    if (typeof document === 'undefined') return null;
    var host = document.getElementById('toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toasts';
      host.className = 'toasts';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'toast toast-' + (opts.tone || 'info');
    el.setAttribute('role', 'status');
    el.textContent = message;
    host.appendChild(el);
    var t = setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 180);
    }, opts.duration || 4000);
    el.addEventListener('click', function () { clearTimeout(t); el.remove(); });
    return el;
  }

  root.CodexFX = {
    init: init,
    get tier() { return current; },
    get manual() { return manual; },
    setTier: setTier,
    lower: lower,
    detect: detect,
    prefersReduced: prefersReduced,
    apply: apply,
    onChange: function (fn) { listeners.push(fn); },
    probe: probe
  };
  root.CodexLoop = loop;
  root.toast = toast;
})(typeof window !== 'undefined' ? window : globalThis);
