/* Polycodex v10 — inline practice and the Lounge handoff.
   The inline template is always available. The Lounge is an enhancement; if its
   scripts are unavailable, practice still completes here. */
(function (root) {
  'use strict';
  var R = root.CodexRender;
  var esc = R.esc;
  var ROOMS = { kitchen: 'Kitchen', dome: 'Dome', conservatory: 'Conservatory', archive: 'Archive' };

  function conceptsFor(dive) {
    var set = new Set();
    (dive.cards || []).forEach(function (c) { (c.concepts || []).forEach(function (id) { set.add(id); }); });
    return Array.from(set);
  }

  function activityData(dive) {
    var p = root.CodexProgress;
    var d = p && p.dive(dive.id);
    return d && d.activity && d.activity.state ? d.activity.state : null;
  }

  function mount(el, dive, opts) {
    opts = opts || {};
    if (!dive || !dive.practice) return null;
    var template = dive.practice.template;
    var params = dive.practice.params || {};
    if (!root.CodexActivities || !root.CodexActivities.has(template)) {
      el.innerHTML = '<p class="activity-error">This activity could not load. You can still finish the dive.</p>';
      return null;
    }
    var saved = activityData(dive);
    var concepts = conceptsFor(dive);
    var completed = !!(saved && saved.ok);
    el.innerHTML = '<section class="practice" aria-labelledby="practice-title">' +
      '<header class="practice-head"><div><span class="eyebrow">Practice</span><h2 id="practice-title">' + esc(template === 'tune' ? 'Scale the recipe' : params.prompt || 'Try it') + '</h2></div>' +
      '<span class="pill room-pill">' + (root.CodexIcons ? root.CodexIcons.icon('compass') : '') + esc(ROOMS[dive.practice.room] || 'Practice') + '</span></header>' +
      '<div class="practice-mount"></div>' +
      '<div class="practice-actions"><button type="button" class="btn btn-quiet lounge-open">Practice in the Lounge</button><p class="practice-status" role="status">' + (completed ? 'Practice complete. The linked room is optional.' : 'You can retry as often as you like.') + '</p></div>' +
      '</section>';

    var mountEl = el.querySelector('.practice-mount');
    var status = el.querySelector('.practice-status');
    var controller = root.CodexActivities.mount(template, mountEl, params, {
      onComplete: function (result) {
        root.CodexProgress.completeActivity(dive.id, template, result.ok, concepts, controller ? controller.serialize() : null);
        if (result.ok) {
          status.textContent = 'Practice complete. The concept is now Practised.';
          status.className = 'practice-status good';
          root.CodexRender.announce('Practice complete.');
        } else {
          status.textContent = 'Not yet. Your answer is saved; adjust and try again.';
          status.className = 'practice-status bad';
        }
      }
    });
    if (saved && saved.data && controller.restore) controller.restore(saved.data);

    el.querySelector('.lounge-open').addEventListener('click', function () { openLounge(dive, opts); });
    return { controller: controller, element: el };
  }

  function openLounge(dive, opts) {
    var returnPath = root.location ? root.location.hash.replace(/^#/, '') || '/' : '/';
    var payload = { diveId: dive.id, room: dive.practice && dive.practice.room, activity: dive.practice && dive.practice.template, returnTo: returnPath, at: Date.now() };
    try { localStorage.setItem('cx_v10_return', JSON.stringify(payload)); } catch (e) { /* fallback below still works */ }
    if (root.CodexLounge && typeof root.CodexLounge.setRoom === 'function') {
      root.CodexLounge.setRoom(payload.room || 'kitchen', { activity: payload.activity, from: 'v10', returnTo: returnPath });
      if (root.toast) root.toast('The Kitchen is open. Your dive is saved.');
      return;
    }
    if (root.toast) root.toast('The Lounge lives in the legacy build. Your dive is saved; use Back to return.', { duration: 5000 });
    var url = 'index.html?ui=legacy&from=v10&dive=' + encodeURIComponent(dive.id) + '&room=' + encodeURIComponent(payload.room || 'kitchen');
    if (opts && opts.newTab === false) root.location.href = url;
    else root.open(url, '_blank', 'noopener');
  }

  root.CodexPractice = { mount: mount, openLounge: openLounge, ROOMS: ROOMS };
})(typeof window !== 'undefined' ? window : globalThis);
