/* Polycodex v10 — hash router. Screen changes pushState; card changes replaceState. */
(function (root) {
  'use strict';
  var handler = null;
  var current = null;

  function parse(hash) {
    var raw = String(hash == null ? (root.location ? root.location.hash : '') : hash).replace(/^#/, '');
    if (!raw) raw = '/';
    if (raw[0] !== '/') raw = '/' + raw;
    var qi = raw.indexOf('?');
    var qs = qi >= 0 ? raw.slice(qi + 1) : '';
    var path = qi >= 0 ? raw.slice(0, qi) : raw;
    var parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    var query = {};
    try {
      new URLSearchParams(qs).forEach(function (v, k) { query[k] = v; });
    } catch (e) { /* no URLSearchParams */ }
    var route = { name: 'title', params: {}, query: query, path: path };
    if (!parts.length) return route;
    if (parts[0] === 'map') route.name = 'map';
    else if (parts[0] === 'reef' && parts[1]) { route.name = 'descent'; route.params.reef = parts[1]; route.params.zone = parts[2] || 'shallows'; }
    else if (parts[0] === 'unit' && parts[1]) { route.name = 'descent'; route.params.unitId = parts[1]; }
    else if (parts[0] === 'dive' && parts[1]) { route.name = 'dive'; route.params.diveId = parts[1]; route.params.cardId = parts[2] || null; }
    else if (parts[0] === 'surface' && parts[1]) { route.name = 'surface'; route.params.diveId = parts[1]; }
    else if (parts[0] === 'logbook') { route.name = 'logbook'; route.params.tab = parts[1] || 'progress'; }
    else if (parts[0] === 'search') { route.name = 'search'; }
    else if (parts[0] === 'review') { route.name = 'review'; }
    else if (parts[0] === 'lounge') { route.name = 'lounge'; }
    else if (parts[0] === 'wreck' && parts[1]) { route.name = 'wreck'; route.params.lessonId = parts[1]; route.params.anchor = parts[2] || null; }
    else if (parts[0] === 'onboarding') { route.name = 'onboarding'; }
    return route;
  }

  function href(path) {
    if (!path) return '#/';
    return '#' + (path[0] === '/' ? path : '/' + path);
  }

  function go(path, opts) {
    opts = opts || {};
    var hash = href(path);
    if (root.location && root.location.hash === hash) {
      if (handler) handler(parse(hash), { same: true });
      return;
    }
    try {
      if (opts.replace) root.history.replaceState(null, '', hash);
      else root.history.pushState(null, '', hash);
    } catch (e) {
      root.location.hash = hash;
      return;
    }
    if (handler) handler(parse(hash), opts);
  }

  function start(fn) {
    handler = fn;
    var run = function () {
      var route = parse();
      current = route;
      fn(route, { pop: true });
    };
    root.addEventListener('popstate', run);
    root.addEventListener('hashchange', run);
    current = parse();
    fn(current, { boot: true });
  }

  root.CodexRouter = {
    parse: parse,
    go: go,
    href: href,
    start: start,
    get current() { return current; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
