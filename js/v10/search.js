/* Polycodex v10 — Sonar search. Local index only; no third-party search library
   is loaded until a query needs full Wreck bodies (P1). */
(function (root) {
  'use strict';
  var R = root.CodexRender;
  var esc = R.esc;
  var index = null;

  function conceptLabel(id) {
    var m = root.CodexUnits ? root.CodexUnits.manifest() : { units: [] };
    for (var i = 0; i < m.units.length; i++) {
      var g = (m.units[i].glossary || []).find(function (x) { return x.concept === id; });
      if (g) return g.term;
    }
    return id.replace(/^num\./, '').replace(/\./g, ' ');
  }

  function build() {
    if (index) return index;
    var m = root.CodexUnits ? root.CodexUnits.manifest() : { units: [], wrecks: [], reefs: [] };
    var items = [];
    var concepts = {};
    for (var u of m.units) {
      for (var g of u.glossary || []) {
        if (!concepts[g.concept]) concepts[g.concept] = { id: g.concept, term: g.term, def: g.def, unit: u, diveId: null };
        if (!concepts[g.concept].diveId) {
          for (var d of u.dives || []) {
            if ((d.concepts || []).includes(g.concept)) { concepts[g.concept].diveId = d.id; break; }
          }
        }
      }
      var firstDive = (u.dives || [])[0];
      items.push({
        type: 'unit', id: u.id, title: u.title, sub: u.objectives ? u.objectives[0] : '',
        reef: u.reef, zone: u.zone, status: u.status, path: '#/unit/' + u.id,
        text: [u.title, u.objectives || [], (u.concepts || []).map(conceptLabel), (u.glossary || []).map(function (g) { return g.term + ' ' + g.def; })].flat().join(' '),
        time: u.est
      });
      for (var d of u.dives || []) {
        items.push({
          type: 'dive', id: d.id, title: d.title, sub: u.title + ' · Dive ' + ((u.dives || []).indexOf(d) + 1),
          reef: u.reef, zone: u.zone, status: d.status || 'not_started', path: '#/dive/' + d.id + '/' + d.firstCardId,
          text: [d.title, u.title, (d.concepts || []).map(conceptLabel)].flat().join(' '),
          time: d.est, cardCount: d.cardCount
        });
      }
      for (var c of Object.keys(concepts)) {
        var cc = concepts[c];
        items.push({
          type: 'concept', id: c, title: cc.term, sub: cc.def,
          reef: cc.unit.reef, zone: cc.unit.zone, status: 'reference',
          path: cc.diveId ? '#/dive/' + cc.diveId + '/' + (cc.unit.dives.find(function (d) { return d.id === cc.diveId; }).firstCardId) : '#/map',
          text: cc.term + ' ' + cc.def + ' ' + cc.unit.title
        });
      }
      for (var g of u.glossary || []) {
        items.push({
          type: 'glossary', id: u.id + ':' + g.term, title: g.term, sub: g.def,
          reef: u.reef, zone: u.zone, status: 'reference', path: '#/dive/' + (firstDive ? firstDive.id + '/' + firstDive.firstCardId : ''),
          text: g.term + ' ' + g.def, time: null
        });
      }
    }
    for (var w of m.wrecks || []) {
      items.push({
        type: 'wreck', id: w.id, title: w.title,
        sub: 'Wreck · Sector ' + w.sectorNum + ' · ' + w.sectorLabel,
        reef: 'wrecks', zone: null, status: w.bridge === 'bridged' ? 'bridged' : 'wreck',
        path: 'wreck.html#/wreck/' + w.id,
        text: [w.title, w.sectorLabel, w.headings || [], w.searchTerms || [], (w.concepts || []).map(conceptLabel)].flat().join(' '),
        headings: w.headings || [], time: Math.max(1, Math.round((w.wordCount || 0) / 180)), wordCount: w.wordCount
      });
    }
    index = { items: items, concepts: Object.keys(concepts).map(function (k) { return concepts[k]; }) };
    return index;
  }

  function norm(s) { return String(s || '').toLowerCase().replace(/[^\w\s:./-]/g, ' ').replace(/\s+/g, ' ').trim(); }

  function scoreItem(item, q) {
    var title = norm(item.title), text = norm(item.text), sub = norm(item.sub);
    var terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) return 0;
    var score = 0;
    for (var t of terms) {
      if (title === t) score += 60;
      else if (title.startsWith(t)) score += 40;
      else if (title.includes(t)) score += 28;
      if (sub.includes(t)) score += 10;
      if (text.includes(t)) score += 8;
      if (item.type === 'concept' || item.type === 'glossary') score += 4;
    }
    if (item.type === 'unit' && terms.some(function (t) { return title.includes(t); })) score += 24;
    if (item.type === 'wreck' && item.bridge === 'bridged') score += 2;
    return score;
  }

  function fuzzy(q) {
    var idx = build();
    var words = idx.items.flatMap(function (i) { return norm(i.title).split(' '); });
    var uniq = Array.from(new Set(words.filter(function (w) { return w.length > 3; })));
    var target = norm(q);
    var best = [];
    for (var w of uniq) {
      var d = lev(target, w);
      if (d <= 2) best.push({ word: w, d: d });
    }
    return best.sort(function (a, b) { return a.d - b.d; }).slice(0, 3).map(function (x) { return x.word; });
  }

  function lev(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var prev = Array.from({ length: n + 1 }, function (_, i) { return i; });
    for (var i = 1; i <= m; i++) {
      var cur = [i];
      for (var j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  function results(q, filters) {
    var idx = build();
    var query = norm(q);
    var list = idx.items.map(function (item) { return { item: item, score: scoreItem(item, query) }; })
      .filter(function (x) { return x.score > 0; });
    if (filters && filters.type && filters.type !== 'all') list = list.filter(function (x) { return x.item.type === filters.type; });
    if (filters && filters.reef && filters.reef !== 'all') list = list.filter(function (x) { return x.item.reef === filters.reef; });
    if (filters && filters.zone && filters.zone !== 'all') list = list.filter(function (x) { return x.item.zone === filters.zone; });
    if (filters && filters.status && filters.status !== 'all') list = list.filter(function (x) { return x.item.status === filters.status; });
    if (filters && filters.sort === 'path') list.sort(function (a, b) { return String(a.item.path).localeCompare(String(b.item.path)); });
    else list.sort(function (a, b) { return b.score - a.score || String(a.item.title).localeCompare(String(b.item.title)); });
    return list.slice(0, 80);
  }

  function statusChip(item) {
    if (item.type === 'wreck') return item.status === 'bridged' ? 'Bridged Wreck' : 'Wreck';
    if (item.type === 'concept' || item.type === 'glossary') return 'Concept';
    var p = root.CodexProgress;
    if (item.type === 'dive' && p && p.dive(item.id)) {
      var d = p.dive(item.id);
      return d.status === 'surfaced' ? 'Surfaced' : 'In progress';
    }
    return 'Dive';
  }

  function resultRow(r) {
    var i = r.item;
    var icon = i.type === 'wreck' ? 'book' : (i.type === 'unit' ? 'reef' : (i.type === 'dive' ? 'dive' : 'spark'));
    return '<a class="search-row" href="' + esc(i.path) + '">' +
      '<span class="search-ico">' + (root.CodexIcons ? root.CodexIcons.icon(icon) : '') + '</span>' +
      '<span class="search-main"><strong>' + esc(i.title) + '</strong><span class="search-sub">' + esc(i.sub) + '</span></span>' +
      '<span class="search-meta"><span class="chip">' + esc(statusChip(i)) + '</span>' + (i.time ? '<span class="search-time">' + esc(i.time) + ' min</span>' : '') + '</span>' +
      '</a>';
  }

  function groupHtml(list) {
    if (!list.length) return '';
    var groups = { unit: 'Units', dive: 'Dives', concept: 'Concepts', glossary: 'Glossary', wreck: 'Wrecks' };
    var out = [];
    ['unit', 'dive', 'concept', 'glossary', 'wreck'].forEach(function (type) {
      var rows = list.filter(function (x) { return x.item.type === type; });
      if (!rows.length) return;
      out.push('<section class="search-group"><h2>' + groups[type] + ' <span class="count">' + rows.length + '</span></h2>' + rows.map(resultRow).join('') + '</section>');
    });
    return out.join('');
  }

  function recent() {
    try { return JSON.parse(localStorage.getItem('cx_v10_recent') || '[]').slice(0, 4); }
    catch (e) { return []; }
  }

  function remember(path, title) {
    try {
      var list = recent().filter(function (r) { return r.path !== path; });
      list.unshift({ path: path, title: title, at: Date.now() });
      localStorage.setItem('cx_v10_recent', JSON.stringify(list.slice(0, 8)));
    } catch (e) { /* private mode */ }
  }

  function emptyState() {
    var p = root.CodexProgress;
    var due = p ? p.dueReviews().length : 0;
    var rec = recent();
    return '<div class="search-empty">' +
      '<section class="search-suggest"><h2>Continue</h2><a class="search-row" href="#/">' + (root.CodexIcons ? root.CodexIcons.icon('compass') : '') + '<span class="search-main"><strong>Open the Title screen</strong><span class="search-sub">Continue where you left off</span></span></a>' +
      (rec.length ? rec.map(function (r) { return '<a class="search-row" href="' + esc(r.path) + '">' + (root.CodexIcons ? root.CodexIcons.icon('clock') : '') + '<span class="search-main"><strong>' + esc(r.title) + '</strong><span class="search-sub">Recent</span></span></a>'; }).join('') : '') +
      '<a class="search-row" href="#/review">' + (root.CodexIcons ? root.CodexIcons.icon('spark') : '') + '<span class="search-main"><strong>Review</strong><span class="search-sub">' + due + ' card' + (due === 1 ? '' : 's') + ' due</span></span></a></section>' +
      '<p class="search-hint">Search dives, concepts, glossary terms and all 42 Wrecks.</p></div>';
  }

  function mount(el, opts) {
    opts = opts || {};
    var m = root.CodexUnits ? root.CodexUnits.manifest() : { reefs: [] };
    var filters = { type: 'all', reef: 'all', zone: 'all', status: 'all', sort: 'relevance' };
    var initial = opts.query || '';
    el.innerHTML = '<div class="search-screen">' +
      '<header class="screen-head search-head"><div><span class="eyebrow">Sonar</span><h1>Search</h1></div><button type="button" class="icon-btn search-close" aria-label="Close search" title="Close search">' + (root.CodexIcons ? root.CodexIcons.icon('close') : '×') + '</button></header>' +
      '<div class="search-bar"><label class="sr-only" for="search-input">Search the codex</label>' + (root.CodexIcons ? root.CodexIcons.icon('search') : '') + '<input id="search-input" type="search" autocomplete="off" placeholder="Search dives, concepts, Wrecks…" value="' + esc(initial) + '"><kbd>/</kbd></div>' +
      '<div class="search-filters" aria-label="Filters">' +
      '<select id="f-type" aria-label="Type"><option value="all">All types</option><option value="unit">Units</option><option value="dive">Dives</option><option value="concept">Concepts</option><option value="glossary">Glossary</option><option value="wreck">Wrecks</option></select>' +
      '<select id="f-reef" aria-label="Reef"><option value="all">All reefs</option>' + (m.reefs || []).map(function (r) { return '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>'; }).join('') + '<option value="wrecks">Wrecks</option></select>' +
      '<select id="f-zone" aria-label="Zone"><option value="all">All zones</option><option value="shallows">Shallows</option><option value="twilight">Twilight</option><option value="midnight">Midnight</option><option value="abyss">Abyss</option></select>' +
      '<select id="f-status" aria-label="Status"><option value="all">Any status</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="surfaced">Surfaced</option><option value="bridged">Bridged Wreck</option></select>' +
      '<select id="f-sort" aria-label="Sort"><option value="relevance">Relevance</option><option value="path">Path order</option></select>' +
      '</div><div class="search-results" id="search-results" aria-live="polite"></div></div>';

    var input = el.querySelector('#search-input');
    var resultsEl = el.querySelector('#search-results');
    function update(push) {
      var q = input.value.trim();
      if (q) {
        var list = results(q, filters);
        resultsEl.innerHTML = list.length ? groupHtml(list) : '<div class="empty"><h2>No matches for “' + esc(q) + '”</h2><p>Try a shorter term, or browse the map.</p><p class="fuzzy">' + (fuzzy(q).length ? 'Did you mean: ' + fuzzy(q).map(function (w) { return '<button type="button" class="linklike fuzzy-word">' + esc(w) + '</button>'; }).join(', ') + '?' : '') + '</p><a class="btn btn-primary" href="#/map">Browse the map</a></div>';
        resultsEl.querySelectorAll('.fuzzy-word').forEach(function (b) { b.addEventListener('click', function () { input.value = b.textContent; update(true); }); });
      } else resultsEl.innerHTML = emptyState();
      if (root.history && root.history.replaceState) root.history.replaceState(null, '', '#/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
    }
    var t;
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { update(true); }, 90); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = resultsEl.querySelector('.search-row');
        if (first) { remember(first.getAttribute('href'), first.querySelector('strong').textContent); first.click(); }
      }
      if (e.key === 'Escape') root.CodexRouter.go('/map', { replace: true });
    });
    el.querySelectorAll('.search-filters select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        if (sel.id === 'f-type') filters.type = sel.value;
        if (sel.id === 'f-reef') filters.reef = sel.value;
        if (sel.id === 'f-zone') filters.zone = sel.value;
        if (sel.id === 'f-status') filters.status = sel.value;
        if (sel.id === 'f-sort') filters.sort = sel.value;
        update(false);
      });
    });
    el.querySelector('.search-close').addEventListener('click', function () { root.CodexRouter.go('/map', { replace: true }); });
    el.addEventListener('click', function (e) {
      var row = e.target.closest('.search-row');
      if (row) remember(row.getAttribute('href'), row.querySelector('strong').textContent);
    });
    update(false);
    setTimeout(function () { input.focus({ preventScroll: true }); }, 40);
    return { focus: function () { input.focus(); } };
  }

  root.CodexSearch = { mount: mount, build: build, results: results, fuzzy: fuzzy, remember: remember };
})(typeof window !== 'undefined' ? window : globalThis);
