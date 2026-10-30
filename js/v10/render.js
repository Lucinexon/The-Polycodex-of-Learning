/* Polycodex v10 — small render helpers. No framework, no innerHTML of user data
   without escaping. Content strings are authored in-repo and escaped anyway. */
(function (root) {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function attr(s) { return esc(s).replace(/`/g, '&#96;'); }
  function icon(name, cls) { return root.CodexIcons ? root.CodexIcons.icon(name, cls) : ''; }

  function visual(v) {
    if (!v) return '';
    var alt = esc(v.alt || '');
    var body = '';
    if (v.type === 'bars') {
      var max = Math.max(v.a || 1, v.b || 1);
      var aw = Math.max(8, Math.round(((v.a || 0) / max) * 100));
      var bw = Math.max(8, Math.round(((v.b || 0) / max) * 100));
      body = '<div class="vis-bars" role="img" aria-label="' + alt + '">' +
        '<div class="vis-row"><span class="vis-lab">' + esc(v.labelA || 'A') + '</span><span class="vis-track"><i class="vis-fill amber" style="width:' + aw + '%"></i></span><span class="vis-num">' + esc(v.a) + (v.unit ? ' ' + esc(v.unit) : '') + '</span></div>' +
        '<div class="vis-row"><span class="vis-lab">' + esc(v.labelB || 'B') + '</span><span class="vis-track"><i class="vis-fill foam" style="width:' + bw + '%"></i></span><span class="vis-num">' + esc(v.b) + (v.unit ? ' ' + esc(v.unit) : '') + '</span></div>' +
        (v.total ? '<div class="vis-total">whole = ' + esc((Number(v.a) || 0) + (Number(v.b) || 0)) + (v.unit ? ' ' + esc(v.unit) : '') + '</div>' : '') +
        '</div>';
    } else if (v.type === 'table') {
      body = '<div class="vis-table-wrap" role="img" aria-label="' + alt + '"><table class="vis-table"><thead><tr>' +
        v.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        v.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>';
    } else if (v.type === 'double-line') {
      body = '<div class="vis-double" role="img" aria-label="' + alt + '">' +
        '<div class="dl-line"><span class="dl-lab">' + esc(v.aLabel) + '</span>' + v.pairs.map(function (p) { return '<span class="dl-tick"><b>' + esc(p[0]) + '</b></span>'; }).join('') + '</div>' +
        '<div class="dl-line"><span class="dl-lab">' + esc(v.bLabel) + '</span>' + v.pairs.map(function (p) { return '<span class="dl-tick"><b>' + esc(p[1]) + '</b></span>'; }).join('') + '</div>' +
        '</div>';
    } else if (v.type === 'map') {
      body = '<div class="vis-map" role="img" aria-label="' + alt + '"><div class="vis-map-scale">' + esc(v.scale) + '</div><div class="vis-ruler"><span>0</span><i></i><span>' + esc(v.measured) + ' cm</span></div><p class="vis-map-out">' + esc(v.measured) + ' cm → <strong>' + esc(v.result) + ' km</strong></p></div>';
    } else {
      body = '<div class="vis-fallback" role="img" aria-label="' + alt + '">' + esc(v.alt || '') + '</div>';
    }
    return '<figure class="visual">' + body + '</figure>';
  }

  /* Readable fallback for the small TeX used in v10 cards. KaTeX, when present,
     replaces this with typeset math; the fallback never shows raw backslashes. */
  function texFallback(tex) {
    var out = esc(String(tex || ''));
    var frac = /\\frac\{([^{}]+)\}\{([^{}]+)\}/g;
    var guard = 0;
    while (frac.test(out) && guard++ < 8) {
      out = out.replace(frac, function (m, a, b) { return '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>'; });
      frac.lastIndex = 0;
    }
    out = out.replace(/\\div/g, ' ÷ ').replace(/\\times/g, ' × ').replace(/\\Rightarrow/g, ' → ')
      .replace(/\\quad/g, '   ').replace(/\\approx/g, ' ≈ ').replace(/\\le/g, ' ≤ ').replace(/\\ge/g, ' ≥ ')
      .replace(/\\[a-zA-Z]+/g, '');
    return out;
  }

  function formula(tex, desc) {
    return '<div class="formula" role="math" aria-label="' + attr(desc || tex) + '">' + texFallback(tex) + '</div>' +
      (desc ? '<p class="math-desc">' + esc(desc) + '</p>' : '');
  }

  function announce(msg) {
    var live = document.getElementById('live');
    if (live) { live.textContent = ''; requestAnimationFrame(function () { live.textContent = msg; }); }
  }

  function title(t) { document.title = t ? t + ' · Polycodex' : 'Polycodex'; }

  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  }

  function fmtRange(seconds) {
    if (seconds == null) return '';
    var m = Math.floor(seconds / 60);
    return m < 1 ? '<1 min' : m + ' min';
  }

  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

  function skeleton(label) {
    return '<div class="skeleton" role="status"><svg class="sonar" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26"/><circle cx="32" cy="32" r="14"/><path d="M32 6v10M32 48v10M6 32h10M48 32h10"/></svg><p>' + esc(label || 'Loading…') + '</p></div>';
  }

  function empty(titleText, body, action) {
    return '<div class="empty"><svg class="contour" viewBox="0 0 120 80" aria-hidden="true"><path d="M8 62c12-18 22-6 34-20s22-28 38-18 20 30 32 38"/><path d="M4 70c14-16 24-4 36-18s22-24 38-14 22 24 34 32"/></svg><h2>' + esc(titleText) + '</h2><p>' + esc(body) + '</p>' + (action || '') + '</div>';
  }

  root.CodexRender = { esc: esc, attr: attr, icon: icon, visual: visual, formula: formula, texFallback: texFallback, announce: announce, title: title, fmtDate: fmtDate, fmtRange: fmtRange, pct: pct, skeleton: skeleton, empty: empty };
})(typeof window !== 'undefined' ? window : globalThis);
