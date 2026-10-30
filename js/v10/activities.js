/* Polycodex v10 — six practice templates. Contract C5.
   mount(el, params, ctx) -> { serialize, restore, onComplete, unmount }
   Every template is keyboard operable and keeps a text representation. */
(function (root) {
  'use strict';
  var R = root.CodexRender || { esc: function (s) { return String(s); } };
  var esc = R.esc;
  var handlers = {};

  function shell(params, inner, extra) {
    return '<div class="activity">' +
      '<p class="activity-prompt">' + esc(params.prompt || '') + '</p>' +
      inner +
      '<div class="activity-foot"><button type="button" class="btn btn-primary act-check">Check</button><p class="activity-feedback" role="status" aria-live="polite"></p></div>' +
      (extra || '') +
      '</div>';
  }

  function mountSort(el, p, ctx, api) {
    var state = { assign: {} };
    var items = p.items || [];
    var bins = p.bins || [];
    el.innerHTML = shell(p,
      '<div class="sort-list">' + items.map(function (it) {
        return '<div class="sort-item" data-item="' + esc(it.id) + '"><span class="sort-text">' + esc(it.text) + '</span><label class="sr-only" for="sort-' + esc(it.id) + '">Group for ' + esc(it.text) + '</label><select id="sort-' + esc(it.id) + '" class="sort-bin" data-id="' + esc(it.id) + '"><option value="">Choose…</option>' + bins.map(function (b) { return '<option value="' + esc(b.id) + '">' + esc(b.label) + '</option>'; }).join('') + '</select></div>';
      }).join('') + '</div>'
    );
    var fb = el.querySelector('.activity-feedback');
    el.querySelectorAll('.sort-bin').forEach(function (sel) {
      sel.addEventListener('change', function () { state.assign[sel.dataset.id] = sel.value; });
    });
    el.querySelector('.act-check').addEventListener('click', function () {
      var missing = items.filter(function (it) { return !state.assign[it.id]; });
      if (missing.length) { fb.textContent = 'Choose a group for every card.'; return; }
      var wrong = items.filter(function (it) { return state.assign[it.id] !== it.bin; });
      if (wrong.length) {
        fb.className = 'activity-feedback bad';
        fb.textContent = wrong.length + ' card' + (wrong.length === 1 ? '' : 's') + ' in the wrong group. Adjust and check again.';
        api.complete({ ok: false, wrong: wrong.map(function (w) { return w.id; }) });
      } else {
        fb.className = 'activity-feedback good';
        fb.textContent = 'All four grouped correctly.';
        api.complete({ ok: true });
      }
    });
    return state;
  }

  function mountTune(el, p, ctx, api) {
    var state = { values: {} };
    var factor = (p.to || 1) / (p.from || 1);
    el.innerHTML = shell(p,
      '<div class="tune-head"><span class="pill">' + esc(p.from) + ' → ' + esc(p.to) + ' ' + esc(p.unitLabel || 'servings') + '</span><span class="tune-factor">× ' + esc(Number(factor.toFixed(2))) + '</span></div>' +
      '<div class="tune-list">' + (p.ingredients || []).map(function (ing) {
        var id = 'tune-' + ing.name.replace(/\W+/g, '-');
        return '<div class="tune-row"><label for="' + id + '">' + esc(ing.name) + '</label><span class="tune-calc">' + esc(ing.amount) + ' × ' + esc(Number(factor.toFixed(2))) + ' =</span><input id="' + id + '" class="tune-input" inputmode="decimal" type="number" step="0.01" min="0" data-name="' + esc(ing.name) + '" aria-label="' + esc(ing.name) + ' amount"> <span class="tune-unit">' + esc(ing.unit) + '</span></div>';
      }).join('') + '</div>'
    );
    var fb = el.querySelector('.activity-feedback');
    el.querySelectorAll('.tune-input').forEach(function (input) {
      input.addEventListener('input', function () { state.values[input.dataset.name] = input.value; });
    });
    el.querySelector('.act-check').addEventListener('click', function () {
      var bad = [];
      (p.ingredients || []).forEach(function (ing) {
        var want = Number(ing.amount) * factor;
        var got = Number(state.values[ing.name]);
        if (!Number.isFinite(got) || Math.abs(got - want) > 0.011) bad.push(ing.name);
      });
      if (bad.length) {
        fb.className = 'activity-feedback bad';
        fb.textContent = 'Not yet. Multiply every ingredient by ' + Number(factor.toFixed(2)) + '. Check: ' + bad.join(', ') + '.';
        api.complete({ ok: false, wrong: bad });
      } else {
        fb.className = 'activity-feedback good';
        fb.textContent = 'Scaled correctly. The ratio held.';
        api.complete({ ok: true });
      }
    });
    return state;
  }

  function mountSequence(el, p, ctx, api) {
    var state = { order: (p.steps || []).map(function (s) { return s.id; }) };
    /* deterministic but non-answer shuffle for display */
    var view = state.order.slice();
    if (view.length > 1) {
      var last = view.pop();
      view.unshift(last);
    }
    state.order = view.slice();
    function draw() {
      el.querySelector('.seq-list').innerHTML = state.order.map(function (id, i) {
        var step = (p.steps || []).find(function (s) { return s.id === id; });
        return '<li class="seq-item"><span class="seq-num">' + (i + 1) + '</span><span class="seq-text">' + esc(step ? step.text : id) + '</span><span class="seq-move"><button type="button" class="icon-btn seq-up" data-id="' + esc(id) + '" aria-label="Move up" ' + (i === 0 ? 'disabled' : '') + '>↑</button><button type="button" class="icon-btn seq-down" data-id="' + esc(id) + '" aria-label="Move down" ' + (i === state.order.length - 1 ? 'disabled' : '') + '>↓</button></span></li>';
      }).join('');
    }
    el.innerHTML = shell(p, '<ol class="seq-list"></ol>');
    draw();
    var fb = el.querySelector('.activity-feedback');
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]');
      if (!b) return;
      var i = state.order.indexOf(b.dataset.id);
      if (b.classList.contains('seq-up') && i > 0) { state.order.splice(i, 1); state.order.splice(i - 1, 0, b.dataset.id); draw(); }
      if (b.classList.contains('seq-down') && i < state.order.length - 1) { state.order.splice(i, 1); state.order.splice(i + 1, 0, b.dataset.id); draw(); }
    });
    el.querySelector('.act-check').addEventListener('click', function () {
      var ok = state.order.every(function (id, i) { return id === p.order[i]; });
      fb.className = 'activity-feedback ' + (ok ? 'good' : 'bad');
      fb.textContent = ok ? 'That is the order. Cross products come after the fractions.' : 'Not yet. Start by writing both ratios as fractions, then cross multiply.';
      api.complete({ ok: ok });
    });
    return state;
  }

  function mountEstimate(el, p, ctx, api) {
    var state = { value: p.min || 0 };
    var mid = p.min + (p.max - p.min) / 2;
    el.innerHTML = shell(p,
      '<div class="estimate"><output class="estimate-out" for="estimate-range">' + esc(state.value) + ' ' + esc(p.unit || '') + '</output><input id="estimate-range" class="estimate-range" type="range" min="' + esc(p.min) + '" max="' + esc(p.max) + '" step="' + esc(p.step || 1) + '" value="' + esc(state.value) + '"><div class="estimate-scale"><span>' + esc(p.min) + '</span><span>your estimate</span><span>' + esc(p.max) + '</span></div></div>'
    );
    var range = el.querySelector('.estimate-range');
    var out = el.querySelector('.estimate-out');
    var fb = el.querySelector('.activity-feedback');
    range.addEventListener('input', function () { state.value = Number(range.value); out.textContent = state.value + ' ' + (p.unit || ''); });
    el.querySelector('.act-check').addEventListener('click', function () {
      var ok = Math.abs(state.value - p.value) <= (p.tol || 0);
      fb.className = 'activity-feedback ' + (ok ? 'good' : 'bad');
      fb.textContent = ok ? 'Close enough. 6.4 cm × 5 km per cm is 32 km.' : 'Not quite. Multiply 6.4 by 5. Aim for 32 km.';
      api.complete({ ok: ok });
    });
    return state;
  }

  function mountDecode(el, p, ctx, api) {
    var state = { value: '' };
    el.innerHTML = shell(p,
      '<div class="decode-key" aria-label="Symbol key">' + (p.mapping || []).map(function (m) { return '<span class="decode-chip"><b>' + esc(m.symbol) + '</b> = ' + esc(m.value) + '</span>'; }).join('') + '</div>' +
      '<label class="decode-label" for="decode-input">' + esc(p.question || 'Decoded ratio') + '</label><input id="decode-input" class="decode-input" autocomplete="off" inputmode="text" placeholder="e.g. 3:5">'
    );
    var input = el.querySelector('.decode-input');
    var fb = el.querySelector('.activity-feedback');
    input.addEventListener('input', function () { state.value = input.value; });
    el.querySelector('.act-check').addEventListener('click', function () {
      var v = state.value.trim().toLowerCase().replace(/\s+to\s+/g, ':').replace(/\s+per\s+/g, ':').replace(/\s/g, '');
      var ok = (p.accept || [p.answer]).some(function (a) { return String(a).toLowerCase().replace(/\s/g, '') === v; });
      fb.className = 'activity-feedback ' + (ok ? 'good' : 'bad');
      fb.textContent = ok ? 'Decoded: ' + p.answer + '.' : 'The key gives ★ = 3 and ● = 5. Write them in the same order.';
      api.complete({ ok: ok });
    });
    return state;
  }

  function mountBalance(el, p, ctx, api) {
    var state = { choice: null };
    var opts = p.options || [];
    el.innerHTML = shell(p,
      '<div class="balance"><div class="pan left-pan"><span class="pan-lab">left mix</span><span class="pan-ratio">' + esc(p.left.a) + ' : ' + esc(p.left.b) + '</span></div><span class="balance-eq" aria-hidden="true">=</span><div class="pan right-pan"><span class="pan-lab">right mix</span><span class="pan-ratio">' + esc(p.right.a) + ' : <b class="pan-missing">?</b></span></div></div>' +
      '<div class="balance-opts" role="group" aria-label="Choose the missing water amount">' + opts.map(function (o) { return '<button type="button" class="opt balance-opt" data-val="' + esc(o) + '">' + esc(o) + '</button>'; }).join('') + '</div>'
    );
    var fb = el.querySelector('.activity-feedback');
    el.querySelectorAll('.balance-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        state.choice = Number(b.dataset.val);
        el.querySelectorAll('.balance-opt').forEach(function (x) { x.classList.remove('picked'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('picked');
        b.setAttribute('aria-pressed', 'true');
        el.querySelector('.pan-missing').textContent = b.dataset.val;
      });
    });
    el.querySelector('.act-check').addEventListener('click', function () {
      if (state.choice == null) { fb.textContent = 'Choose an amount first.'; return; }
      var ok = state.choice === p.answer;
      fb.className = 'activity-feedback ' + (ok ? 'good' : 'bad');
      fb.textContent = ok ? 'Balanced. 2:3 scaled by 2 is 4:6.' : 'Not balanced. The left 2 grew to 4, a factor of 2. Scale 3 by 2 as well.';
      api.complete({ ok: ok });
    });
    return state;
  }

  function mount(template, el, params, ctx) {
    var api = { complete: null };
    var state;
    var done = false;
    function complete(result) {
      if (done) return;
      done = result.ok;
      if (ctx && ctx.onComplete) ctx.onComplete(result);
    }
    var fn = handlers[template];
    if (!fn) {
      el.innerHTML = '<p class="activity-error">This activity is not available yet.</p>';
      return { serialize: function () { return {}; }, restore: function () {}, onComplete: function (cb) { api.complete = cb; }, unmount: function () {} };
    }
    state = fn(el, params || {}, ctx, api);
    return {
      el: el,
      serialize: function () { return JSON.parse(JSON.stringify(state || {})); },
      restore: function (saved) {
        if (!saved) return;
        Object.keys(saved).forEach(function (k) { if (saved[k] != null) state[k] = saved[k]; });
        if (template === 'sort') {
          Object.keys(saved.assign || {}).forEach(function (id) {
            var sel = el.querySelector('.sort-bin[data-id="' + id + '"]');
            if (sel) sel.value = saved.assign[id];
          });
        }
        if (template === 'tune') {
          Object.keys(saved.values || {}).forEach(function (name) {
            var input = el.querySelector('.tune-input[data-name="' + name + '"]');
            if (input) input.value = saved.values[name];
          });
        }
        if (template === 'estimate') {
          var r = el.querySelector('.estimate-range'), out = el.querySelector('.estimate-out');
          if (r) { r.value = saved.value; out.textContent = saved.value + ' ' + (params.unit || ''); }
        }
        if (template === 'decode') {
          var i = el.querySelector('.decode-input'); if (i) i.value = saved.value || '';
        }
        if (template === 'balance' && saved.choice != null) {
          var b = el.querySelector('.balance-opt[data-val="' + saved.choice + '"]');
          if (b) b.click();
        }
      },
      onComplete: function (cb) { api.complete = cb; },
      unmount: function () { el.innerHTML = ''; }
    };
  }

  ['sort', 'tune', 'sequence', 'estimate', 'decode', 'balance'].forEach(function (t) { handlers[t] = null; });
  handlers.sort = mountSort; handlers.tune = mountTune; handlers.sequence = mountSequence;
  handlers.estimate = mountEstimate; handlers.decode = mountDecode; handlers.balance = mountBalance;

  root.CodexActivities = { mount: mount, has: function (t) { return !!handlers[t]; } };
})(typeof window !== 'undefined' ? window : globalThis);
