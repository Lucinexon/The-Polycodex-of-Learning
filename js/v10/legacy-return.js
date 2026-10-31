/* Polycodex v10 — legacy Lounge return bridge.
   The legacy shell is opened with ?from=v10&room=<room>&returnTo=<path>.
   This bridge opens the requested Lounge room, offers the dive's Tune
   practice in the Kitchen, and puts one obvious way back to the exact v10
   dive card. It does nothing on ordinary legacy visits. */
(function (root, doc) {
  'use strict';

  function query(name) {
    try { return new URLSearchParams(root.location.search).get(name) || ''; } catch (e) { return ''; }
  }

  function readReturn() {
    try { return JSON.parse(root.localStorage.getItem('cx_v10_return') || 'null') || {}; } catch (e) { return {}; }
  }

  function safePath(value) {
    var path = String(value || '/');
    return path.charAt(0) === '/' ? path : '/' + path;
  }

  function loadScript(src, done) {
    var s = doc.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = function () { done(null); };
    s.onerror = function () { done(new Error('load failed: ' + src)); };
    doc.head.appendChild(s);
  }

  function conceptsFor(dive) {
    var seen = {};
    (dive.cards || []).forEach(function (card) {
      (card.concepts || []).forEach(function (id) { seen[id] = true; });
    });
    return Object.keys(seen);
  }

  function makeButton(label, cls) {
    var b = doc.createElement('button');
    b.type = 'button';
    b.className = cls || 'btn';
    b.textContent = label;
    return b;
  }

  function buildPractice(lobby, after, diveId) {
    var panel = doc.createElement('section');
    panel.id = 'v10KitchenPractice';
    panel.style.cssText = 'margin:0 0 14px;padding:14px 16px;border:1px solid rgba(125,211,252,.35);border-radius:10px;background:rgba(4,32,50,.75);color:#e6f7ff;';

    var kicker = doc.createElement('p');
    kicker.style.cssText = 'margin:0 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.8;';
    kicker.textContent = 'Kitchen · Recipe Scaler';
    panel.appendChild(kicker);

    var prompt = doc.createElement('p');
    prompt.style.cssText = 'margin:0 0 10px;font-size:14px;line-height:1.45;';
    prompt.textContent = 'Loading the dive practice…';
    panel.appendChild(prompt);

    var rows = doc.createElement('div');
    panel.appendChild(rows);

    var check = makeButton('Check the scale', 'btn primary');
    check.disabled = true;
    panel.appendChild(check);

    var status = doc.createElement('p');
    status.setAttribute('role', 'status');
    status.style.cssText = 'margin:8px 0 0;font-size:13px;line-height:1.4;';
    panel.appendChild(status);

    if (after && after.parentNode) after.parentNode.insertBefore(panel, after.nextSibling);
    else lobby.insertBefore(panel, lobby.firstChild);

    var ready = false;
    var loaded = 0;
    var errors = 0;
    function settle() {
      loaded += 1;
      if (loaded < 2) return;
      if (errors || !root.CodexProgress || !findDive()) {
        prompt.textContent = 'This Kitchen activity could not load. Inline practice in the dive still works.';
        status.textContent = 'Use Back to your dive to continue.';
        return;
      }
      ready = true;
      render();
    }
    function findDive() {
      var unit = root.CodexUnits && root.CodexUnits.get ? root.CodexUnits.get('number-shallows-ratios') : null;
      var pending = root.__PENDING_UNITS__ || [];
      if (!unit) {
        for (var i = 0; i < pending.length; i++) if (pending[i] && pending[i].id === 'number-shallows-ratios') unit = pending[i];
      }
      if (!unit) return null;
      for (var j = 0; j < (unit.dives || []).length; j++) if (unit.dives[j].id === diveId) return unit.dives[j];
      return null;
    }

    var values = {};
    function render() {
      var dive = findDive();
      var practice = dive && dive.practice;
      if (!practice || practice.template !== 'tune' || !practice.params) {
        prompt.textContent = 'This dive uses a different practice. Open it inline from the dive.';
        status.textContent = 'Use Back to your dive to continue.';
        check.disabled = true;
        return;
      }
      var p = practice.params;
      var factor = (p.to || 1) / (p.from || 1);
      prompt.textContent = p.prompt || 'Scale the recipe.';
      rows.textContent = '';
      (p.ingredients || []).forEach(function (ing) {
        var row = doc.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:7px 0;font-size:14px;';
        var name = doc.createElement('span');
        name.style.cssText = 'min-width:58px;text-transform:capitalize;';
        name.textContent = ing.name;
        row.appendChild(name);
        var calc = doc.createElement('span');
        calc.style.cssText = 'opacity:.78;';
        calc.textContent = ing.amount + ' × ' + Number(factor.toFixed(2)) + ' =';
        row.appendChild(calc);
        var input = doc.createElement('input');
        input.type = 'number';
        input.inputMode = 'decimal';
        input.step = '0.01';
        input.min = '0';
        input.setAttribute('data-name', ing.name);
        input.setAttribute('aria-label', ing.name + ' amount');
        input.style.cssText = 'width:86px;padding:6px 8px;border-radius:6px;border:1px solid rgba(125,211,252,.45);background:#082f49;color:#e6f7ff;font:inherit;';
        input.addEventListener('input', function () { values[ing.name] = input.value; });
        row.appendChild(input);
        var unit = doc.createElement('span');
        unit.style.cssText = 'opacity:.8;';
        unit.textContent = ing.unit;
        row.appendChild(unit);
        rows.appendChild(row);
      });
      check.disabled = false;
      status.textContent = 'Multiply every ingredient by ' + Number(factor.toFixed(2)) + '.';
      status.style.color = '';
    }

    check.addEventListener('click', function () {
      if (!ready) return;
      var dive = findDive();
      var p = dive && dive.practice && dive.practice.params;
      if (!p) return;
      var factor = (p.to || 1) / (p.from || 1);
      var bad = [];
      (p.ingredients || []).forEach(function (ing) {
        var want = Number(ing.amount) * factor;
        var got = Number(values[ing.name]);
        if (!Number.isFinite(got) || Math.abs(got - want) > 0.011) bad.push(ing.name);
      });
      if (bad.length) {
        status.textContent = 'Not yet. Multiply every ingredient by ' + Number(factor.toFixed(2)) + '. Check: ' + bad.join(', ') + '.';
        status.style.color = '#ffd0c8';
        return;
      }
      var P = root.CodexProgress;
      if (!P.dive(dive.id)) P.startDive(dive, dive.cards[0] && dive.cards[0].id, dive.rev);
      var recorded = P.completeActivity(dive.id, 'tune', true, conceptsFor(dive), { values: values });
      var saved = recorded ? (P.flush ? P.flush() !== false : true) : false;
      if (saved) {
        status.textContent = 'Scaled correctly. Saved to this dive once.';
        status.style.color = '#a9e6b1';
        check.disabled = true;
        Array.prototype.forEach.call(rows.querySelectorAll('input'), function (input) { input.disabled = true; });
      } else {
        status.textContent = 'Scaled correctly, but this browser could not save the result. Your dive is still open; try again from the dive.';
        status.style.color = '#ffd0c8';
      }
    });

    loadScript('js/v10/progress.js', function (err) { if (err) errors += 1; settle(); });
    loadScript('js/units/number/shallows/ratios.js', function (err) { if (err) errors += 1; settle(); });
  }

  function init() {
    if (query('from') !== 'v10') return;
    var lobby = doc.getElementById('lobby');
    if (!lobby || doc.getElementById('v10ReturnBanner')) return;

    var payload = readReturn();
    var room = query('room') || payload.room || 'kitchen';
    var returnTo = safePath(query('returnTo') || payload.returnTo || '/');
    var diveId = query('dive') || payload.diveId || '';

    var banner = doc.createElement('div');
    banner.id = 'v10ReturnBanner';
    banner.setAttribute('role', 'status');
    banner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 14px;padding:12px 16px;border:1px solid rgba(125,211,252,.45);border-radius:10px;background:rgba(8,47,73,.82);color:#e6f7ff;';

    var fromDive = /^\/dive\//.test(returnTo);
    var fromStudy = /^\/(dive|surface)\//.test(returnTo);
    var text = doc.createElement('p');
    text.style.cssText = 'margin:0;font-size:14px;line-height:1.45;';
    text.textContent = diveId
      ? (fromStudy
        ? 'You came from a v10 dive. The Kitchen is open; your progress is saved.'
        : 'You came from v10. The Kitchen is open; your progress is saved.')
      : 'You came from v10. The Kitchen is open.';
    banner.appendChild(text);

    var link = doc.createElement('a');
    link.className = 'btn primary';
    link.href = 'app.html#' + returnTo;
    link.textContent = fromDive ? 'Back to your dive' : (fromStudy ? 'Back to your results' : 'Back to Polycodex');
    link.setAttribute('data-v10-return', '1');
    link.addEventListener('click', function () {
      try { root.localStorage.removeItem('cx_v10_return'); } catch (e) { /* return still works */ }
    });
    banner.appendChild(link);

    var head = lobby.querySelector('.sec-head');
    if (head && head.parentNode) head.parentNode.insertBefore(banner, head.nextSibling);
    else lobby.insertBefore(banner, lobby.firstChild);

    if (room === 'kitchen' && diveId) buildPractice(lobby, banner, diveId);

    var tries = 0;
    function openRoom() {
      if (typeof root.showScreen === 'function') root.showScreen('lobby');
      var lounge = root.CodexLounge;
      if (lounge && typeof lounge.setRoom === 'function' && lounge.ROOMS && lounge.ROOMS[room]) {
        if (typeof lounge.room !== 'function' || lounge.room() !== room) {
          lounge.setRoom(room, { from: room === 'kitchen' ? 'cafe' : 'deck', silent: true });
        }
        return;
      }
      tries += 1;
      if (tries < 40) root.setTimeout(openRoom, 100);
    }
    openRoom();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(typeof window !== 'undefined' ? window : globalThis, document);
