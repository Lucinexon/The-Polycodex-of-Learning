/* Polycodex v10 — Wreck reader.
   The 42 legacy lessons keep their words. This page only changes the surface:
   paper, a slim header, an outline, an explicit Finish. */
(function (root) {
  'use strict';

  var R = root.CodexRender;
  var P = root.CodexProgress;
  var esc = R.esc;

  var state = {
    lesson: null,
    sector: null,
    meta: null,
    outline: [],
    paragraphs: [],
    restoring: true,
    saveTimer: null,
    scrollRaf: 0,
    lastScroll: 0,
    headerHidden: false
  };

  function allSectors() {
    var out = [];
    if (root.SECTORS_PART1) out = out.concat(root.SECTORS_PART1);
    if (root.SECTORS_PART2) out = out.concat(root.SECTORS_PART2);
    if (root.SECTORS_PART3) out = out.concat(root.SECTORS_PART3);
    return out;
  }

  function findLesson(id) {
    var sectors = allSectors();
    for (var i = 0; i < sectors.length; i++) {
      var blocks = sectors[i].blocks || [];
      for (var j = 0; j < blocks.length; j++) {
        if (blocks[j].id === id) return { lesson: blocks[j], sector: sectors[i] };
      }
    }
    return null;
  }

  function wreckMeta(id) {
    return ((root.CODEX_MANIFEST && root.CODEX_MANIFEST.wrecks) || []).filter(function (w) { return w.id === id; })[0] || null;
  }

  function parseHash() {
    var h = String(root.location.hash || '').replace(/^#/, '');
    if (!h) return { name: 'index' };
    if (h.charAt(0) !== '/') h = '/' + h;
    var bits = h.split('/').filter(Boolean);
    if (bits[0] === 'wreck' && bits[1]) return { name: 'wreck', id: decodeURIComponent(bits[1]), anchor: bits[2] ? decodeURIComponent(bits[2]) : null };
    if (bits[0] === 'wreck') return { name: 'index' };
    return { name: 'index' };
  }

  function liftMath(src) {
    var math = [];
    var s = String(src || '');
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, function (m, tex) {
      math.push({ tex: tex, display: true });
      return '\u0001M' + (math.length - 1) + '\u0001';
    });
    s = s.replace(/\$([^$\n]+?)\$/g, function (m, tex) {
      math.push({ tex: tex, display: false });
      return '\u0001M' + (math.length - 1) + '\u0001';
    });
    return { text: s, math: math };
  }

  function restoreMath(html, math) {
    return html.replace(/\u0001M(\d+)\u0001/g, function (m, i) {
      var mm = math[Number(i)];
      if (!mm) return '';
      return '<span class="w-math" data-display="' + (mm.display ? 'true' : 'false') + '" data-tex="' + esc(mm.tex) + '">' + R.texFallback(mm.tex) + '</span>';
    });
  }

  function sanitize(html) {
    if (root.DOMPurify) {
      return root.DOMPurify.sanitize(html, {
        ADD_ATTR: ['data-sprite', 'data-px', 'data-tex', 'data-display', 'data-correct', 'data-answer', 'data-i', 'data-k', 'target', 'style'],
        ADD_TAGS: ['details', 'summary', 'canvas'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick']
      });
    }
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  }

  function fallbackMarkdown(src) {
    var lines = String(src || '').split(/\r?\n/);
    var out = [];
    var list = false;
    var fence = false;
    lines.forEach(function (line) {
      if (/^~~~/.test(line)) { fence = !fence; out.push(fence ? '<pre><code>' : '</code></pre>'); return; }
      if (fence) { out.push(esc(line)); return; }
      if (/^####\s+/.test(line)) { if (list) { out.push('</ul>'); list = false; } out.push('<h4>' + esc(line.replace(/^####\s+/, '')) + '</h4>'); return; }
      if (/^###\s+/.test(line)) { if (list) { out.push('</ul>'); list = false; } out.push('<h3>' + esc(line.replace(/^###\s+/, '')) + '</h3>'); return; }
      if (/^-\s+/.test(line)) { if (!list) { out.push('<ul>'); list = true; } out.push('<li>' + esc(line.replace(/^-\s+/, '')) + '</li>'); return; }
      if (list) { out.push('</ul>'); list = false; }
      if (!line.trim()) { out.push(''); return; }
      if (/^</.test(line.trim())) { out.push(line); return; }
      out.push('<p>' + esc(line) + '</p>');
    });
    if (list) out.push('</ul>');
    if (fence) out.push('</code></pre>');
    return out.join('\n');
  }

  function markdown(src) {
    var lifted = liftMath(src);
    var html;
    if (root.marked && typeof root.marked.parse === 'function') {
      try {
        html = root.marked.parse(lifted.text, { gfm: true, breaks: false, mangle: false });
      } catch (e) {
        html = fallbackMarkdown(lifted.text);
      }
    } else {
      html = fallbackMarkdown(lifted.text);
    }
    return sanitize(restoreMath(html, lifted.math));
  }

  function textOf(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }

  function toast(message) {
    var host = document.getElementById('toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    host.appendChild(el);
    setTimeout(function () { el.remove(); }, 4000);
  }

  function prepareSlate(slate) {
    state.outline = [];
    state.paragraphs = [];
    var headings = slate.querySelectorAll('h2,h3,h4,h5,h6');
    headings.forEach(function (h, i) {
      var id = 'w-h-' + i;
      h.id = id;
      h.setAttribute('data-heading', 'true');
      state.outline.push({ id: id, level: Number(h.tagName.slice(1)), text: textOf(h) });
    });
    slate.querySelectorAll('p').forEach(function (p, i) {
      p.id = 'w-p-' + i;
      state.paragraphs.push(p);
    });
    slate.querySelectorAll('[data-sprite]').forEach(function (s) {
      var glyph = document.createElement('span');
      glyph.className = 'w-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = '✦';
      s.replaceWith(glyph);
    });
    slate.querySelectorAll('i.pixelart-icons-font-' + 'x').forEach(function (i) { i.remove(); });
    slate.querySelectorAll('.tiles .tile').forEach(function (tile) {
      tile.setAttribute('type', 'button');
      tile.setAttribute('aria-expanded', 'false');
      tile.addEventListener('click', function () {
        var open = tile.classList.toggle('is-open');
        tile.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
    slate.querySelectorAll('details').forEach(function (d) {
      d.addEventListener('toggle', function () { scheduleSave(); });
    });
    slate.querySelectorAll('a[href^="http"]').forEach(function (a) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    slate.querySelectorAll('button:not(.tile)').forEach(function (b) {
      if (!b.getAttribute('type')) b.setAttribute('type', 'button');
    });
  }

  function typesetMath(slate) {
    if (!root.katex || typeof root.katex.render !== 'function') return;
    slate.querySelectorAll('.w-math').forEach(function (el) {
      try {
        root.katex.render(el.getAttribute('data-tex'), el, {
          displayMode: el.getAttribute('data-display') === 'true',
          throwOnError: false,
          strict: false
        });
      } catch (e) { /* the fallback stays visible */ }
    });
  }

  function updateOutline() {
    var panel = document.getElementById('wreck-outline');
    if (!panel) return;
    panel.innerHTML = '<div class="wo-head"><h2>Outline</h2><button type="button" class="icon-btn" data-close-outline aria-label="Close outline">✕</button></div>' +
      '<ol class="wo-list">' + state.outline.map(function (h) {
        return '<li data-level="' + h.level + '"><a href="#' + esc(h.id) + '" data-outline-link="' + esc(h.id) + '">' + esc(h.text) + '</a></li>';
      }).join('') + '</ol>';
  }

  function showOutline(show) {
    var panel = document.getElementById('wreck-outline');
    var backdrop = document.getElementById('wreck-outline-backdrop');
    if (!panel) return;
    panel.hidden = !show;
    if (backdrop) backdrop.hidden = !show;
    panel.classList.toggle('open', show);
    document.body.classList.toggle('outline-open', show);
    var btn = document.querySelector('[data-action="outline"]');
    if (btn) btn.setAttribute('aria-expanded', show ? 'true' : 'false');
  }

  function currentPosition() {
    var slate = document.getElementById('wreck-slate');
    if (!slate) return { anchor: null, para: 0 };
    var top = 58;
    var anchor = null;
    var para = 0;
    state.outline.forEach(function (h) {
      var el = document.getElementById(h.id);
      if (el && el.getBoundingClientRect().top <= top + 4) anchor = h.id;
    });
    state.paragraphs.forEach(function (p, i) {
      if (p.getBoundingClientRect().top <= top + 4) para = i;
    });
    return { anchor: anchor, para: para };
  }

  function scheduleSave() {
    if (state.restoring || !state.lesson) return;
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () {
      var pos = currentPosition();
      P.setWreckPosition(state.lesson.id, pos.anchor, pos.para, false);
    }, 1000);
  }

  function progressBar() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - root.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, (root.scrollY / max) * 100)) : 0;
    var fill = document.querySelector('.wreck-top-progress i');
    if (fill) fill.style.width = pct.toFixed(2) + '%';
  }

  function onScroll() {
    if (state.scrollRaf) return;
    state.scrollRaf = requestAnimationFrame(function () {
      state.scrollRaf = 0;
      progressBar();
      var top = document.querySelector('.wreck-top');
      if (!top) return;
      var y = root.scrollY || 0;
      if (y > 90 && y > state.lastScroll + 4) {
        top.classList.add('is-hidden');
        state.headerHidden = true;
      } else if (y < state.lastScroll - 4 || y < 40) {
        top.classList.remove('is-hidden');
        state.headerHidden = false;
      }
      state.lastScroll = y;
      scheduleSave();
    });
  }

  function restorePosition(anchorParam) {
    var rec = P.wreck(state.lesson.id);
    var anchor = anchorParam || (rec && rec.anchor);
    var para = rec && Number(rec.para) || 0;
    state.restoring = true;
    requestAnimationFrame(function () {
      var target = anchor ? document.getElementById(anchor) : null;
      if (!target && para && document.getElementById('w-p-' + para)) target = document.getElementById('w-p-' + para);
      if (target) {
        var top = target.getBoundingClientRect().top + (root.scrollY || 0) - 62;
        root.scrollTo(0, Math.max(0, top));
      }
      progressBar();
      setTimeout(function () {
        state.restoring = false;
        if (state.lesson) scheduleSave();
      }, 120);
    });
  }

  function finishButtonHtml() {
    var rec = P.wreck(state.lesson.id);
    var read = rec && rec.status === 'read';
    var legacy = P.state.legacy.charted[state.lesson.id];
    if (read) return '<span class="wreck-finished">' + (legacy ? 'Charted (legacy) · Read' : 'Read') + '</span>';
    return '<button type="button" class="btn small-btn" data-action="finish">Finish wreck</button>';
  }

  function renderIndex() {
    var sectors = allSectors();
    var top = document.querySelector('.wreck-top');
    if (top) top.hidden = true;
    var main = document.getElementById('wreck-main');
    main.className = 'wreck-index';
    main.innerHTML = '<div class="wreck-index-head"><span class="eyebrow">The reading layer</span><h1>Wrecks</h1>' +
      '<p>42 legacy lessons, kept whole. Choose one. Reading never changes dive progress; only Finish marks a Wreck read.</p>' +
      '<a class="btn secondary small-btn" href="app.html#/map">Back to the Reef Map</a></div>' +
      sectors.map(function (s) {
        return '<section class="wreck-index-sector"><h2>Sector ' + esc(s.num) + ' · ' + esc(s.label) + '</h2><div class="wreck-index-list">' +
          (s.blocks || []).map(function (b) {
            var rec = P.wreck(b.id);
            var read = rec && rec.status === 'read';
            var legacy = P.state.legacy.charted[b.id];
            return '<a href="#/wreck/' + esc(b.id) + '"><span>' + esc(b.title) + '</span><span class="wi-status">' + (read ? 'Read' : (legacy ? 'Charted' : '')) + '</span></a>';
          }).join('') + '</div></section>';
      }).join('');
    root.document.title = 'Wrecks · Polycodex';
  }

  function renderWreck(route) {
    var found = findLesson(route.id);
    if (!found) {
      var top = document.querySelector('.wreck-top');
      if (top) top.hidden = true;
      document.getElementById('wreck-main').innerHTML = R.empty('Wreck not found', 'That lesson is not in the legacy library. Nothing was changed.', '<a class="btn" href="app.html#/map">Back to the map</a>');
      return;
    }
    state.lesson = found.lesson;
    state.sector = found.sector;
    state.meta = wreckMeta(found.lesson.id);
    var bridge = state.meta && state.meta.concepts && state.meta.concepts.length ? state.meta.concepts : [];
    var rec = P.wreck(found.lesson.id);
    var legacy = P.state.legacy.charted[found.lesson.id];
    var top = document.querySelector('.wreck-top');
    top.hidden = false;
    top.classList.remove('is-hidden');
    top.innerHTML = '<div class="wreck-top-inner">' +
      '<a class="icon-btn wreck-back" href="app.html#/map" aria-label="Back to the Reef Map">' + R.icon('left') + '</a>' +
      '<div class="wreck-top-title"><span>Sector ' + esc(found.sector.num) + ' · ' + esc(found.sector.label) + '</span><strong>' + esc(found.lesson.title) + '</strong></div>' +
      '<div class="wreck-top-actions">' +
        '<button type="button" class="icon-btn" data-action="outline" aria-label="Open outline" aria-expanded="false">' + R.icon('menu') + '</button>' +
        '<span data-finish-slot>' + finishButtonHtml() + '</span>' +
      '</div>' +
      '<div class="wreck-top-progress"><i></i></div>' +
    '</div>';
    var main = document.getElementById('wreck-main');
    main.className = 'wreck-main';
    var bridgeHtml = bridge.length ? '<div class="wreck-bridge"><span class="eyebrow">Reads alongside</span>' + bridge.map(function (c) {
      return '<span class="pill warm">' + esc(root.CodexUnits ? root.CodexUnits.conceptName(c) : c) + '</span>';
    }).join('') + '</div>' : '';
    var legacyBadge = legacy ? '<span class="pill live">Charted (legacy)</span>' : '';
    main.innerHTML = '<div class="wreck-slate" id="wreck-slate">' +
      '<header class="wreck-head"><span class="eyebrow">Wreck · Sector ' + esc(found.sector.num) + ' · ' + esc(found.sector.label) + '</span>' +
        '<h1 tabindex="-1">' + esc(found.lesson.title) + '</h1>' +
        '<div class="wreck-head-meta"><span class="pill">' + esc((state.meta && state.meta.wordCount) || 0) + ' words</span>' + legacyBadge +
        (rec && rec.status === 'read' ? '<span class="pill live">Read</span>' : '') + '</div>' +
        bridgeHtml +
      '</header>' +
      '<div class="wreck-body" id="wreck-body">' + markdown(found.lesson.md) + '</div>' +
      '<footer class="wreck-foot"><p class="small muted">Finished? Marking a Wreck read is explicit. Scrolling never does it.</p>' +
        '<div class="wreck-foot-actions" data-finish-slot>' + finishButtonHtml() + '</div></footer>' +
    '</div>';
    prepareSlate(document.getElementById('wreck-slate'));
    typesetMath(document.getElementById('wreck-slate'));
    updateOutline();
    bindFinish();
    root.document.title = found.lesson.title + ' · Wreck · Polycodex';
    restorePosition(route.anchor);
    progressBar();
    setTimeout(function () { state.restoring = false; }, 200);
    var h1 = main.querySelector('h1');
    if (h1) h1.focus({ preventScroll: true });
  }

  function bindFinish() {
    document.querySelectorAll('[data-action="finish"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var res = P.finishWreck(state.lesson.id);
        if (res.already) toast('This Wreck was already marked read.');
        else toast('Wreck finished. Marked read.');
        document.querySelectorAll('[data-finish-slot]').forEach(function (slot) { slot.innerHTML = finishButtonHtml(); });
        bindFinish();
        var meta = document.querySelector('.wreck-head-meta');
        if (meta && !meta.querySelector('.wreck-finished')) {
          var pill = document.createElement('span');
          pill.className = 'pill live';
          pill.textContent = 'Read';
          meta.appendChild(pill);
        }
      });
    });
  }

  function onHash() {
    var route = parseHash();
    showOutline(false);
    if (route.name === 'index') renderIndex();
    else renderWreck(route);
    root.scrollTo(0, 0);
    state.lastScroll = 0;
  }

  function boot() {
    if (!R || !P) {
      document.getElementById('wreck-main').innerHTML = '<div class="empty"><h2>The Wreck reader could not start</h2><p>A required script did not load.</p></div>';
      return;
    }
    P.applyPrefs();
    try { P.importLegacy(); } catch (e) { /* legacy data must never block a Wreck */ }
    document.body.insertAdjacentHTML('afterbegin', root.CodexIcons.sprite());
    document.addEventListener('click', function (e) {
      var outline = e.target.closest && e.target.closest('[data-action="outline"]');
      if (outline) { showOutline(true); return; }
      if (e.target.closest && e.target.closest('[data-close-outline]')) { showOutline(false); return; }
      var link = e.target.closest && e.target.closest('[data-outline-link]');
      if (link) {
        e.preventDefault();
        showOutline(false);
        var el = document.getElementById(link.getAttribute('data-outline-link'));
        if (el) root.scrollTo(0, el.getBoundingClientRect().top + root.scrollY - 62);
        return;
      }
      if (e.target.closest && e.target.closest('#wreck-outline-backdrop')) showOutline(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { showOutline(false); return; }
      if ((e.key === 'o' || e.key === 'O') && !/input|textarea|select/i.test(e.target.tagName || '')) {
        e.preventDefault(); showOutline(true);
      }
    });
    root.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('hashchange', onHash);
    root.addEventListener('pagehide', function () {
      if (state.lesson) {
        var pos = currentPosition();
        P.setWreckPosition(state.lesson.id, pos.anchor, pos.para, true);
      }
    });
    onHash();
    // If KaTeX arrives after the first paint, typeset the math in place.
    setTimeout(function () {
      if (root.katex) typesetMath(document.getElementById('wreck-slate'));
    }, 700);
  }

  root.CodexWreck = { markdown: markdown, parseHash: parseHash, state: state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
