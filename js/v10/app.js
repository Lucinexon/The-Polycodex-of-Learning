/* Polycodex v10 — the expedition shell.
   One writer: CodexProgress. One router. Screens stay thin. */
(function (root) {
  'use strict';

  var R = root.CodexRender;
  var P = root.CodexProgress;
  var U = root.CodexUnits;
  var Router = root.CodexRouter;
  var FX = root.CodexFX;
  var esc = R.esc;
  var icon = R.icon;

  var screenEl = document.getElementById('screen');
  var hudEl = document.getElementById('hud');
  var bannerEl = document.getElementById('banner');
  var toastsEl = document.getElementById('toasts');
  var sheetRoot = document.getElementById('sheet-root');
  var modalRoot = document.getElementById('modal-root');

  var app = {
    route: null,
    unit: null,
    dive: null,
    card: null,
    cardIndex: 0,
    surfaceFeedback: null,
    surfaceIndex: 0,
    revealed: {},
    skippedCollect: {},
    depthChoice: null,
    loadToken: 0,
    lastCardKey: '',
    lastFocus: null
  };

  function manifest() { return root.CODEX_MANIFEST || { reefs: [], units: [], wrecks: [], totals: {} }; }
  var scriptCache = {};
  function loadScript(src) {
    if (scriptCache[src]) return scriptCache[src];
    scriptCache[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
    return scriptCache[src];
  }
  function ensureSearch() { return root.CodexSearch ? Promise.resolve() : loadScript('js/v10/search.js'); }
  function ensureActivities() { return root.CodexActivities ? Promise.resolve() : loadScript('js/v10/activities.js'); }
  function ensurePractice() { return root.CodexPractice ? Promise.resolve() : loadScript('js/v10/practice.js'); }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* memory only */ } }
  function reefById(id) { return (manifest().reefs || []).filter(function (r) { return r.id === id; })[0] || null; }
  function unitMeta(id) { return (manifest().units || []).filter(function (u) { return u.id === id; })[0] || null; }
  function wreckMeta(id) { return (manifest().wrecks || []).filter(function (w) { return w.id === id; })[0] || null; }
  function metaForDive(diveId) {
    var units = manifest().units || [];
    for (var i = 0; i < units.length; i++) {
      if ((units[i].dives || []).some(function (d) { return d.id === diveId; })) return units[i];
    }
    return null;
  }
  function diveMeta(unitMetaObj, diveId) {
    return unitMetaObj && (unitMetaObj.dives || []).filter(function (d) { return d.id === diveId; })[0] || null;
  }
  function unitOfDive(unit, diveId) {
    return unit && (unit.dives || []).filter(function (d) { return d.id === diveId; })[0] || null;
  }
  function zoneLabel(reef, zone) {
    var z = reef && reef.zones && reef.zones[zone];
    return z ? z.label : (zone ? zone.charAt(0).toUpperCase() + zone.slice(1) : 'Shallows');
  }
  function zoneFor(route) {
    if (!route) return 'shallows';
    if (route.name === 'dive' || route.name === 'surface') {
      var m = metaForDive(route.params.diveId);
      return m ? m.zone : 'shallows';
    }
    if (route.name === 'descent') {
      var u = route.params.unitId ? unitMeta(route.params.unitId) : null;
      if (u) return u.zone;
      return route.params.zone || 'shallows';
    }
    return 'shallows';
  }
  function setZone(zone) {
    if (zone) document.documentElement.dataset.zone = zone;
  }

  function navigate(path, opts) {
    if (!path) return;
    if (/^[a-z]+\.html/i.test(path) || /^https?:/i.test(path)) { root.location.href = path; return; }
    Router.go(path, opts);
  }

  // Let the pressed control paint before a route builds a whole screen. This
  // keeps the interaction's event-timing entry short without faking the
  // first-card measurement, which still runs after the route changes.
  function afterPaint(fn) {
    root.requestAnimationFrame(function () { root.setTimeout(fn, 0); });
  }

  function paragraphs(text) {
    return String(text || '').split(/\n{2,}/).map(function (p) {
      return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function fmtWords(n) { return Number(n || 0).toLocaleString(); }
  function cardIndexOf(dive, cardId) {
    if (!dive || !dive.cards) return -1;
    for (var i = 0; i < dive.cards.length; i++) if (dive.cards[i].id === cardId) return i;
    return -1;
  }
  function statusOfDive(diveId) {
    var d = P.dive(diveId);
    return d ? d.status : 'not_started';
  }
  function savedOk(rec) { return !!(rec && rec.ok); }

  /* ---------------- save + chrome ---------------- */

  function saveState() {
    if (P.readonly) return { label: 'Read-only', status: 'readonly' };
    if (P.status === 'error') return { label: "Couldn't save", status: 'error' };
    if (P.status === 'saving') return { label: 'Saving…', status: 'saving' };
    var fresh = P.state.updatedAt && (Date.now() - P.state.updatedAt < 1600);
    return { label: fresh ? 'Saved' : 'Saved on this device', status: 'saved' };
  }

  function saveChipHtml() {
    var s = saveState();
    return '<span class="save-chip" data-status="' + s.status + '" title="' + esc(s.label) + '">' +
      '<i class="save-dot" aria-hidden="true"></i><span class="save-label">' + esc(s.label) + '</span></span>';
  }

  function updateHudLive() {
    var chip = hudEl.querySelector('.save-chip');
    if (chip) {
      var s = saveState();
      chip.setAttribute('data-status', s.status);
      chip.setAttribute('title', s.label);
      var lab = chip.querySelector('.save-label');
      if (lab) lab.textContent = s.label;
    }
    var fill = hudEl.querySelector('.goal-ring .fill');
    if (fill) {
      var c = Number(fill.getAttribute('data-circ') || 88);
      fill.setAttribute('stroke-dashoffset', String(c * (1 - P.goalRing())));
    }
    var goalStrong = hudEl.querySelector('.goal-copy strong');
    if (goalStrong) {
      var g = P.dailyGoal();
      goalStrong.textContent = g.done + '/' + g.target;
    }
    var diveSave = document.querySelector('.dive-save');
    if (diveSave) {
      var ds = saveState();
      diveSave.setAttribute('data-status', ds.status);
      diveSave.textContent = ds.label;
    }
    showBanner();
    if (saveState().label === 'Saved') {
      clearTimeout(app.saveTimer);
      app.saveTimer = setTimeout(updateHudLive, 1650);
    }
  }

  function showBanner() {
    if (!bannerEl) return;
    if (P.lastError && P.lastError.code === 'corrupt' && !app.corruptDismissed) {
      bannerEl.hidden = false;
      bannerEl.innerHTML = '<span class="banner-msg">Your old save was damaged. A copy was kept, and a fresh save was started. Nothing was overwritten.</span>' +
        '<button type="button" data-action="dismiss-corrupt">Continue</button>';
      return;
    }
    if (P.readonly) {
      bannerEl.hidden = false;
      bannerEl.innerHTML = '<span class="banner-msg">This progress was saved by a newer version. It is open in read-only mode; nothing will be overwritten.</span>';
      return;
    }
    if (P.status === 'error') {
      bannerEl.hidden = false;
      bannerEl.innerHTML = '<span class="banner-msg">Couldn’t save to this device. Your answers are still here for now.</span>' +
        '<button type="button" data-action="retry-save">Try again</button>' +
        '<button type="button" data-action="export">Export progress</button>';
      return;
    }
    if (bannerEl.hidden) return;
    bannerEl.hidden = true;
    bannerEl.innerHTML = '';
  }

  function renderHud(routeSample) {
    var zone = document.documentElement.dataset.zone || 'shallows';
    var reef = reefById('number');
    var g = P.dailyGoal();
    var ring = P.goalRing();
    var circ = 88;
    hudEl.hidden = false;
    hudEl.innerHTML = '<div class="hud-inner">' +
      '<button type="button" class="hud-depth" data-go="/map" aria-label="Open the Reef Map">' +
        '<span class="depth-num">' + esc(reef ? reef.depth : '12 m') + '</span>' +
        '<span class="depth-label">' + esc(zoneLabel(reef, zone)) + '</span>' +
      '</button>' +
      '<div class="hud-goal" aria-label="Daily goal: ' + g.done + ' of ' + g.target + ' dive' + (g.target === 1 ? '' : 's') + '">' +
        '<svg class="goal-ring" viewBox="0 0 34 34" aria-hidden="true">' +
          '<circle class="track" cx="17" cy="17" r="14"></circle>' +
          '<circle class="fill" cx="17" cy="17" r="14" data-circ="' + circ + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + (circ * (1 - ring)) + '" transform="rotate(-90 17 17)"></circle>' +
        '</svg>' +
        '<div class="goal-copy"><strong>' + g.done + '/' + g.target + '</strong>dive today</div>' +
      '</div>' +
      '<div class="hud-spacer"></div>' +
      '<div class="hud-actions">' +
        '<button type="button" class="hud-btn" data-go="/search" aria-label="Search with Sonar">' + icon('search') + '<span class="hud-label">Search</span></button>' +
        '<button type="button" class="hud-btn" data-go="/logbook/progress" aria-label="Open the Logbook">' + icon('book') + '<span class="hud-label">Logbook</span></button>' +
        saveChipHtml() +
      '</div>' +
    '</div>';
    showBanner();
    updateHudLive();
  }

  /* ---------------- continue target ---------------- */

  function mostRecentDive() {
    var list = Object.keys(P.state.dives || {}).map(function (id) {
      var d = P.state.dives[id];
      return { id: id, d: d };
    }).filter(function (x) { return x.d.status === 'in_progress'; });
    list.sort(function (a, b) { return (b.d.updatedAt || 0) - (a.d.updatedAt || 0); });
    if (!list.length) return null;
    if (Date.now() - (list[0].d.updatedAt || 0) > 14 * 24 * 60 * 60 * 1000) return null;
    return list[0];
  }

  function mostRecentWreck() {
    var list = Object.keys(P.state.wrecks || {}).map(function (id) {
      return { id: id, w: P.state.wrecks[id] };
    }).filter(function (x) { return x.w.status === 'in_progress'; });
    list.sort(function (a, b) { return (b.w.updatedAt || 0) - (a.w.updatedAt || 0); });
    if (!list.length) return null;
    if (Date.now() - (list[0].w.updatedAt || 0) > 14 * 24 * 60 * 60 * 1000) return null;
    return list[0];
  }

  function diveLocation(meta, diveMetaObj, cardId) {
    var reef = reefById(meta.reef);
    var full = U.get(meta.id);
    var dive = full ? unitOfDive(full, diveMetaObj.id) : null;
    var idx = dive && cardId ? cardIndexOf(dive, cardId) : -1;
    var total = diveMetaObj.cardCount || (dive ? dive.cards.length : 0);
    var cardPart = idx >= 0 && total ? ' · Card ' + (idx + 1) + ' of ' + total : '';
    var diveNo = (meta.dives || []).map(function (d) { return d.id; }).indexOf(diveMetaObj.id) + 1;
    return (reef ? reef.name : 'Number Reef') + ' · ' + zoneLabel(reef, meta.zone) + ' · ' + meta.title + ' · Dive ' + diveNo + cardPart;
  }

  function continueInfo() {
    var recent = mostRecentDive();
    if (recent) {
      var meta = metaForDive(recent.id);
      var dm = diveMeta(meta, recent.id);
      if (meta && dm) {
        return {
          mode: 'dive',
          path: '/dive/' + recent.id + '/' + (recent.d.cardId || (dm.firstCardId || 'c1')),
          label: diveLocation(meta, dm, recent.d.cardId)
        };
      }
    }
    var wreck = mostRecentWreck();
    if (wreck) {
      var wm = wreckMeta(wreck.id);
      if (wm) return { mode: 'wreck', path: 'wreck.html#/wreck/' + wm.id, label: 'Wreck · ' + wm.sectorLabel + ' · ' + wm.title };
    }

    var lastUnit = null;
    var lastAt = 0;
    Object.keys(P.state.dives || {}).forEach(function (id) {
      var meta = metaForDive(id);
      if (meta && (P.state.dives[id].updatedAt || 0) > lastAt) { lastAt = P.state.dives[id].updatedAt || 0; lastUnit = meta; }
    });
    var units = lastUnit ? [lastUnit] : (manifest().units || []);
    var fallback = null;
    units.forEach(function (meta) {
      if (fallback) return;
      var next = (meta.dives || []).filter(function (d) { return statusOfDive(d.id) !== 'surfaced'; })[0];
      if (next) fallback = { meta: meta, dive: next };
    });
    if (!fallback) {
      var live = (manifest().units || [])[0];
      if (live && live.dives && live.dives[0]) fallback = { meta: live, dive: live.dives[0] };
    }
    if (fallback) {
      return {
        mode: 'first',
        path: '/dive/' + fallback.dive.id + '/' + (fallback.dive.firstCardId || 'c1'),
        label: diveLocation(fallback.meta, fallback.dive, fallback.dive.firstCardId || 'c1')
      };
    }
    return { mode: 'none', path: '/onboarding', label: 'Choose a reef to begin' };
  }

  function hasLegacy() {
    return !!(P.state.legacy && (P.state.legacy.importedAt || Object.keys(P.state.legacy.charted || {}).length)) ||
      !!safeGet('polymath_codex_v1');
  }
  function firstVisit() {
    return !safeGet('cx_v10_onboarded') && !P.stats().divesStarted && !hasLegacy();
  }

  /* ---------------- title ---------------- */

  function renderTitle() {
    hudEl.hidden = true;
    bannerEl.hidden = true;
    screenEl.className = 'screen is-title';
    var info = continueInfo();
    var begin = firstVisit();
    var showLegacy = hasLegacy() && !safeGet('cx_v10_legacy_notice') && !safeGet('cx_v10_onboarded');
    var sound = P.state.prefs.sound !== 'off';
    var mainLabel = begin ? 'Begin' : 'Continue';
    screenEl.innerHTML = '<div class="title-wrap">' +
      '<div class="title-brand">' +
        '<h1 class="pixel-logo" tabindex="-1">POLY<span>CODEX</span></h1>' +
        '<p class="title-tag">A learning expedition. Short dives, real understanding.</p>' +
        '<div class="title-meta"><span class="pill live">' + icon('wave') + ' Number Reef is live</span><span class="pill">42 Wrecks to read</span></div>' +
      '</div>' +
      '<div class="title-menu" role="navigation" aria-label="Main">' +
        '<button type="button" class="btn continue" data-action="continue" data-path="' + esc(info.path) + '" data-autofocus>' +
          '<span class="continue-label">' + icon(begin ? 'compass' : 'right') + mainLabel + '</span>' +
          '<span class="continue-where" id="continue-where">' + esc(begin ? 'Start with Number Reef · Shallows' : info.label) + '</span>' +
        '</button>' +
        '<button type="button" class="btn secondary" data-go="/map">' + icon('map') + 'Dive<span class="menu-sub">Choose a reef or a Wreck</span></button>' +
        '<button type="button" class="btn secondary" data-go="/lounge">' + icon('spark') + 'Lounge<span class="menu-sub">Practice in the rooms</span></button>' +
        '<button type="button" class="btn secondary" data-go="/logbook/progress">' + icon('book') + 'Logbook<span class="menu-sub">Progress, review, notes</span></button>' +
      '</div>' +
      (showLegacy ? '<div class="legacy-notice paper" role="note"><h2>Your old progress is safe</h2>' +
        '<p>Your earlier XP, finished lessons and Lounge records were brought forward. Nothing was reset.</p>' +
        '<div class="btn-row"><button type="button" class="btn small-btn" data-go="/map">See the Wrecks</button>' +
        '<button type="button" class="btn small-btn ghost" data-action="legacy-dismiss">Dismiss</button></div></div>' : '') +
      '<div class="title-foot">' +
        '<span class="small muted">Progress stays on this device. No account needed.</span>' +
        '<div class="title-tools">' +
          '<button type="button" class="hud-btn" data-action="title-sound" aria-label="Sound: ' + (sound ? 'on' : 'off') + '">' + icon(sound ? 'sound' : 'mute') + '<span class="hud-label">Sound ' + (sound ? 'on' : 'off') + '</span></button>' +
          '<button type="button" class="hud-btn" data-action="title-graphics" aria-label="Graphics: ' + esc(FX.tier) + '">' + icon('spark') + '<span class="hud-label">' + esc(FX.tier) + '</span></button>' +
          '<button type="button" class="hud-btn" data-go="/logbook/settings" aria-label="Account and settings">' + icon('user') + '<span class="hud-label">Account</span></button>' +
        '</div>' +
      '</div>' +
    '</div>';
    R.title('');
    if (app.route && app.route.name === 'title') {
      var auto = screenEl.querySelector('[data-autofocus]');
      if (auto) setTimeout(function () { auto.focus({ preventScroll: true }); }, 10);
    }
  }

  function refreshContinue() {
    var info = continueInfo();
    var where = document.getElementById('continue-where');
    var btn = screenEl.querySelector('[data-action="continue"]');
    if (where) where.textContent = info.label;
    if (btn) btn.setAttribute('data-path', info.path);
  }

  /* ---------------- onboarding ---------------- */

  function renderOnboarding() {
    hudEl.hidden = true;
    bannerEl.hidden = true;
    screenEl.className = 'screen';
    var reefs = manifest().reefs || [];
    var choice = app.depthChoice || safeGet('cx_v10_depth') || '';
    screenEl.innerHTML = '<div class="onboard">' +
      '<span class="eyebrow">Before you dive</span>' +
      '<h1>Choose where to start.</h1>' +
      '<p class="lede">Polycodex is six reefs of short dives. Number Reef is open now. The others are charting.</p>' +
      '<section class="onboard-section" aria-labelledby="reef-pick"><h2 id="reef-pick">Pick a reef</h2>' +
        '<div class="reef-tiles">' + reefs.map(function (r) {
          var live = r.id === 'number' && r.live !== false;
          return '<button type="button" class="reef-tile" ' + (live ? 'data-action="onboard-reef" data-reef="' + esc(r.id) + '"' : 'disabled') + '>' +
            '<span class="reef-name">' + esc(r.name) + '</span>' +
            '<span class="reef-sub">' + (live ? esc(r.blurb) : 'Charting soon') + '</span>' +
            '<span class="pill ' + (live ? 'live' : 'planned') + '">' + (live ? 'Live' : 'Charting soon') + '</span>' +
          '</button>';
        }).join('') + '</div>' +
      '</section>' +
      '<section class="onboard-section" aria-labelledby="depth-pick"><h2 id="depth-pick">How deep should we start?</h2>' +
        '<div class="depth-choices" role="group" aria-label="Starting depth">' +
          '<button type="button" class="depth-choice" data-action="onboard-depth" data-depth="shallows" aria-pressed="' + (choice === 'shallows') + '"><strong>Shallows</strong><span>Grades 6–8. Start here if you are not sure.</span></button>' +
          '<button type="button" class="depth-choice" data-action="onboard-depth" data-depth="twilight" aria-pressed="' + (choice === 'twilight') + '"><strong>Twilight</strong><span>Grades 9–10. A quicker pace.</span></button>' +
          '<button type="button" class="depth-choice" data-action="onboard-depth" data-depth="not-sure" aria-pressed="' + (choice === 'not-sure') + '"><strong>Not sure</strong><span>Start shallow. You can move deeper later.</span></button>' +
        '</div>' +
      '</section>' +
      '<div class="btn-row"><button type="button" class="btn" data-action="onboard-begin" data-autofocus>Start diving ' + icon('right') + '</button>' +
      '<button type="button" class="btn ghost" data-action="onboard-skip">Skip for now</button></div>' +
    '</div>';
    R.title('Start · Polycodex');
    var auto = screenEl.querySelector('[data-autofocus]');
    if (auto) setTimeout(function () { auto.focus({ preventScroll: true }); }, 10);
  }

  function finishOnboarding() {
    safeSet('cx_v10_onboarded', '1');
    if (app.depthChoice) safeSet('cx_v10_depth', app.depthChoice);
    navigate('/dive/ratios-d1/c1');
  }

  /* ---------------- map ---------------- */

  function renderMap() {
    setZone('shallows');
    renderHud();
    screenEl.className = 'screen';
    var reefs = manifest().reefs || [];
    var wrecks = manifest().wrecks || [];
    var sectors = {};
    wrecks.forEach(function (w) {
      var key = w.sectorNum || w.sector;
      if (!sectors[key]) sectors[key] = { num: w.sectorNum || '', label: w.sectorLabel || w.sector || 'Wrecks', items: [] };
      sectors[key].items.push(w);
    });
    var sectorKeys = Object.keys(sectors).sort(function (a, b) { return String(sectors[a].num).localeCompare(String(sectors[b].num)); });
    var chartPins = reefs.map(function (r) {
      var live = r.id === 'number' && r.live !== false;
      return '<button type="button" class="reef-pin" style="left:' + r.x + '%;top:' + r.y + '%" ' +
        (live ? 'data-go="/reef/' + esc(r.id) + '/shallows"' : 'disabled data-planned="true"') +
        ' aria-label="' + esc(r.name + (live ? '' : ' — charting soon')) + '">' +
        '<span class="pin-dot">' + icon(live ? 'reef' : 'lock') + '</span>' +
        '<span class="pin-label">' + esc(live ? r.name : r.name + ' · soon') + '</span></button>';
    }).join('');
    var list = reefs.map(function (r) {
      var live = r.id === 'number' && r.live !== false;
      return '<button type="button" class="reef-row" ' + (live ? 'data-go="/reef/' + esc(r.id) + '/shallows"' : 'disabled') + '>' +
        '<span class="reef-mark">' + icon(live ? 'reef' : 'lock') + '</span>' +
        '<span><span class="reef-name">' + esc(r.name) + '</span><span class="reef-sub">' + esc(live ? r.blurb : 'Charting soon') + '</span></span>' +
        '<span class="pill ' + (live ? 'live' : 'planned') + '">' + esc(live ? r.depth : 'Soon') + '</span>' +
      '</button>';
    }).join('');
    screenEl.innerHTML = '<div class="page-head"><div><span class="eyebrow">Sonar chart</span><h1 tabindex="-1" data-autofocus>Reef Map</h1>' +
      '<p class="sub">Six reefs. One is live. Every Wreck below is open — no locks, no order.</p></div>' +
      '<button type="button" class="btn secondary small-btn" data-go="/search">' + icon('search') + 'Search</button></div>' +
      '<div class="map-grid">' +
        '<div class="reef-chart" aria-label="Bathymetric chart of six reefs">' +
          '<svg class="bathymetry" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">' +
            '<path d="M-5 18C16 8 30 22 48 14S76 2 105 12" fill="none" stroke="#1b5e73" stroke-width="1.4"/>' +
            '<path d="M-5 30C18 20 34 34 52 25S80 14 105 24" fill="none" stroke="#1b5e73" stroke-width="1.2"/>' +
            '<path d="M-5 44C20 33 33 47 54 38S82 28 105 38" fill="none" stroke="#0f3a52" stroke-width="1.5"/>' +
            '<path d="M-5 57C20 47 36 60 58 51S85 41 105 50" fill="none" stroke="#1b5e73" stroke-width="1.1"/>' +
            '<path d="M-5 68C22 59 38 70 60 62S87 54 105 62" fill="none" stroke="#0f3a52" stroke-width="1.3"/>' +
            '<path d="M12 70l7-18 9 8 7-19 11 12 9-8 8 25z" fill="#0a2238" stroke="#1b5e73" stroke-width=".8"/>' +
            '<path d="M61 70l6-14 8 4 7-17 10 9 9 18z" fill="#0a2238" stroke="#1b5e73" stroke-width=".8"/>' +
          '</svg>' + chartPins +
          '<span class="chart-caption">Depth contours · not to scale</span>' +
        '</div>' +
        '<div class="reef-list" aria-label="Reefs">' + list + '</div>' +
      '</div>' +
      '<section class="map-section" aria-labelledby="wreck-heading">' +
        '<div class="page-head"><div><span class="eyebrow">The reading layer</span><h2 class="section-title" id="wreck-heading">Wrecks</h2>' +
        '<p class="sub">' + wrecks.length + ' legacy lessons, clustered by their old sector. Reading one never changes dive progress.</p></div></div>' +
        '<div class="wreck-layer">' + sectorKeys.map(function (key) {
          var s = sectors[key];
          return '<details class="wreck-sector"' + (key === sectorKeys[0] ? ' open' : '') + '><summary><span>Sector ' + esc(s.num) + ' · ' + esc(s.label) + '</span><span class="muted small">' + s.items.length + '</span></summary>' +
            '<div class="wreck-lessons">' + s.items.map(function (w) {
              var wp = P.wreck(w.id);
              var status = wp && wp.status === 'read' ? 'Read' : (wp && wp.status === 'in_progress' ? 'Reading' : '');
              if (!status && P.state.legacy.charted[w.id]) status = 'Charted (legacy)';
              return '<a class="wreck-lesson" href="wreck.html#/wreck/' + esc(w.id) + '" data-bridge="' + (w.bridge && w.bridge.length ? 'true' : 'false') + '">' +
                '<span class="wl-title">' + esc(w.title) + '</span><span class="wl-status">' + esc(status) + '</span></a>';
            }).join('') + '</div></details>';
        }).join('') + '</div>' +
      '</section>';
    R.title('Reef Map · Polycodex');
    focusMain();
  }

  /* ---------------- descent + unit sheet ---------------- */

  function loadUnitInto(id, done, fail) {
    var existing = U.get(id);
    if (existing) { done(existing); return; }
    screenEl.innerHTML = R.skeleton('Loading ' + (unitMeta(id) ? unitMeta(id).title : 'unit') + '…');
    U.load(id).then(done).catch(function (err) {
      if (fail) fail(err);
      else screenEl.innerHTML = R.empty('This unit could not load', 'Check the connection and try again. Your saved progress is untouched.', '<button class="btn" data-go="/map">Back to the map</button>');
    });
  }

  function unitPrimary(unit) {
    var dives = unit.dives || [];
    var inProgress = dives.filter(function (d) { return statusOfDive(d.id) === 'in_progress'; })[0];
    if (inProgress) return { dive: inProgress, label: 'Continue Dive ' + (dives.indexOf(inProgress) + 1), path: '/dive/' + inProgress.id + '/' + (P.dive(inProgress.id).cardId || 'c1') };
    var next = dives.filter(function (d) { return statusOfDive(d.id) !== 'surfaced'; })[0];
    if (next) return { dive: next, label: 'Start Dive ' + (dives.indexOf(next) + 1), path: '/dive/' + next.id + '/' + next.cards[0].id };
    return { dive: null, label: 'Review this unit', path: '/logbook/review' };
  }

  function renderDescent(route) {
    var meta = route.params.unitId ? unitMeta(route.params.unitId) : null;
    var reef = route.params.reef ? reefById(route.params.reef) : null;
    if (!meta && reef) {
      meta = (manifest().units || []).filter(function (u) { return u.reef === reef.id && u.zone === (route.params.zone || 'shallows'); })[0] || null;
    }
    setZone(meta ? meta.zone : (route.params.zone || 'shallows'));
    renderHud();
    screenEl.className = 'screen';
    if (!meta) {
      screenEl.innerHTML = '<div class="page-head"><div><span class="eyebrow">Descent</span><h1 tabindex="-1" data-autofocus>Charting soon</h1>' +
        '<p class="sub">This reef or zone has no live unit yet. Number Reef · Shallows is open now.</p></div></div>' +
        R.empty('No unit here yet', 'The map is honest about what is open. Number Reef · Shallows has a live Ratios unit.', '<button class="btn" data-go="/reef/number/shallows">Open Number Reef · Shallows</button>');
      focusMain();
      return;
    }
    if (!app.unit || app.unit.id !== meta.id) {
      loadUnitInto(meta.id, function (unit) { app.unit = unit; renderDescent(route); });
      return;
    }
    var unit = app.unit;
    reef = reefById(unit.reef) || reef;
    var dives = unit.dives || [];
    var surfaced = dives.filter(function (d) { return statusOfDive(d.id) === 'surfaced'; }).length;
    var pct = dives.length ? Math.round((surfaced / dives.length) * 100) : 0;
    var primary = unitPrimary(unit);
    var linked = [];
    dives.forEach(function (d) {
      (d.wreck || []).forEach(function (id) { if (linked.indexOf(id) < 0) linked.push(id); });
    });
    var collects = dives.map(function (d) { return d.collect; }).filter(Boolean);
    screenEl.innerHTML = '<div class="page-head"><div><span class="eyebrow">Descent · ' + esc(reef ? reef.name : 'Number Reef') + '</span>' +
      '<h1 tabindex="-1" data-autofocus>' + esc(zoneLabel(reef, unit.zone)) + '</h1>' +
      '<p class="sub">' + esc(reef ? reef.blurb : '') + ' · ' + esc((reef && reef.zones && reef.zones[unit.zone] ? reef.zones[unit.zone].grades : '')) + '</p></div>' +
      '<button type="button" class="btn secondary small-btn" data-go="/map">' + icon('left') + 'Reef Map</button></div>' +
      '<div class="descent-grid">' +
        '<ol class="unit-rail" aria-label="Units in this zone">' +
          '<li class="' + (pct === 100 ? 'done' : 'live') + '"><button type="button" class="rail-card" aria-current="true" data-action="unit-open" data-unit="' + esc(unit.id) + '">' +
            '<span class="rc-title">' + esc(unit.title) + '</span><span class="rc-meta"><span>' + dives.length + ' dives</span><span>' + surfaced + '/' + dives.length + ' surfaced</span></span>' +
            '<span class="rail-progress"><span style="width:' + pct + '%"></span></span></button></li>' +
          '<li><button type="button" class="rail-card" disabled><span class="rc-title">Fractions</span><span class="rc-meta"><span>Charting soon</span></span></button></li>' +
          '<li><button type="button" class="rail-card" disabled><span class="rc-title">Decimals</span><span class="rc-meta"><span>Charting soon</span></span></button></li>' +
        '</ol>' +
        '<section class="unit-sheet" id="unit-sheet" aria-labelledby="unit-title">' +
          '<div class="unit-sheet-head"><div><span class="eyebrow">Number Reef · ' + esc(zoneLabel(reef, unit.zone)) + '</span>' +
            '<h2 id="unit-title">' + esc(unit.title) + '</h2>' +
            '<div class="unit-meta"><span class="pill live">' + esc(unit.status === 'published' ? 'Published' : 'Reviewed') + '</span><span class="pill">' + esc(unit.est) + ' min</span><span class="pill">' + dives.length + ' dives</span><span class="pill">' + surfaced + '/' + dives.length + ' surfaced</span></div>' +
          '</div>' + icon('reef') + '</div>' +
          '<h2 class="section-title" style="font-size:var(--fs-3);margin-top:18px">What you will be able to do</h2>' +
          '<ul class="unit-objectives">' + (unit.objectives || []).map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>' +
          '<h2 class="section-title" style="font-size:var(--fs-3);margin-top:18px">Dives</h2>' +
          '<ol class="dive-list">' + dives.map(function (d, i) {
            var st = P.dive(d.id);
            var prevDone = i === 0 || statusOfDive(dives[i - 1].id) === 'surfaced';
            var accessible = prevDone || (st && (st.status === 'in_progress' || st.status === 'surfaced'));
            var label = st && st.status === 'surfaced' ? 'Replay' : (st && st.status === 'in_progress' ? 'Continue' : 'Start');
            var sub = st && st.status === 'surfaced' ? 'Surfaced' : (st && st.status === 'in_progress' ? 'In progress · Card ' + ((cardIndexOf(d, st.cardId) + 1) || 1) + ' of ' + d.cards.length : (accessible ? 'Not started' : 'Finish the dive above first'));
            var cardTarget = st && st.status === 'surfaced' ? d.cards[0].id : ((st && st.cardId) || d.cards[0].id);
            return '<li data-locked="' + (!accessible) + '"><span class="dive-num">' + (i + 1) + '</span><span class="dive-info"><span class="dive-title">' + esc(d.title) + '</span><span class="dive-sub">' + esc(sub) + ' · ' + esc(d.est) + ' min</span></span>' +
              '<span class="dive-action"><button type="button" class="btn small-btn ' + (st && st.status === 'surfaced' ? 'secondary' : '') + '" ' + (accessible ? 'data-action="dive-open" data-dive="' + esc(d.id) + '" data-card="' + esc(cardTarget) + '"' : 'disabled') + '>' + (accessible ? label : icon('lock')) + '</button></span></li>';
          }).join('') + '</ol>' +
          '<div class="unit-columns">' +
            '<div class="unit-block"><h2>Collectibles</h2><div class="collectibles" aria-label="Collectibles">' +
              collects.map(function (c) {
                var earned = !!P.state.collection[c.id];
                return '<span class="collectible ' + (earned ? 'earned' : '') + '" title="' + esc(earned ? c.name : 'Not found yet') + '">' + icon(earned ? 'spark' : 'lock') + '</span>';
              }).join('') + '</div><p class="small muted" style="margin-top:6px">' + collects.filter(function (c) { return P.state.collection[c.id]; }).length + ' of ' + collects.length + ' found</p></div>' +
            '<div class="unit-block"><h2>Read alongside</h2><div class="wreck-links">' +
              (linked.length ? linked.map(function (id) { var w = wreckMeta(id); return w ? '<a href="wreck.html#/wreck/' + esc(w.id) + '">' + icon('book') + ' ' + esc(w.title) + '</a>' : ''; }).join('') : '<span class="small muted">No Wrecks linked to this unit yet.</span>') +
            '</div></div>' +
          '</div>' +
          '<div class="btn-row"><a class="btn" href="#' + esc(primary.path) + '">' + icon(primary.dive ? 'dive' : 'spark') + esc(primary.label) + '</a>' +
          '<button type="button" class="btn secondary" data-action="unit-review">Review due cards</button></div>' +
        '</section>' +
      '</div>';
    R.title(unit.title + ' · Polycodex');
    focusMain();
  }

  /* ---------------- dive player ---------------- */

  function kindLabel(kind) {
    return ({ concept: 'Concept', worked: 'Worked example', figure: 'Figure', formula: 'Formula', code: 'Code', interactive: 'Try it', prompt: 'Your turn' })[kind] || 'Card';
  }

  function promptSaved(card, dive) {
    var d = P.dive(dive.id);
    return d && d.prompts && d.prompts[card.prompt.id] || null;
  }

  function promptHtml(card, dive) {
    var p = card.prompt;
    if (!p) return '';
    var saved = promptSaved(card, dive);
    var open = !saved;
    var opts = p.opts || [];
    var out = '<section class="prompt" data-prompt="' + esc(p.id) + '"><h3>Your turn</h3><p class="q">' + esc(p.q) + '</p>';
    if (p.type === 'fill') {
      out += '<div class="prompt-fill"><label class="sr-only" for="prompt-fill-input">Your answer</label><input id="prompt-fill-input" type="text" autocomplete="off" ' + (open ? '' : 'disabled') + ' aria-describedby="prompt-feedback"><button type="button" class="btn small-btn" data-action="prompt-check" data-prompt="' + esc(p.id) + '" ' + (open ? '' : 'disabled') + '>Check</button></div>';
    } else {
      out += '<div class="options" role="group" aria-label="Answer choices">' + opts.map(function (o, i) {
        var state = '';
        if (saved && !saved.skipped) {
          if (i === p.a) state = 'correct';
          else if (saved.ok === false) state = 'muted';
        }
        return '<button type="button" class="option" data-action="prompt-option" data-prompt="' + esc(p.id) + '" data-opt="' + i + '" data-state="' + state + '" ' + (open ? '' : 'disabled') + '><span class="key">' + (i + 1) + '</span><span>' + esc(o) + '</span></button>';
      }).join('') + '</div>';
    }
    var feedback = '';
    if (saved) {
      if (saved.skipped) feedback = '<div class="feedback" id="prompt-feedback"><strong>Shown.</strong>This prompt was skipped, so it does not count as retrieval. ' + esc(p.why || '') + '</div>';
      else if (saved.ok) feedback = '<div class="feedback" id="prompt-feedback"><strong>Correct.</strong>' + esc(p.why || '') + '</div>';
      else feedback = '<div class="feedback is-wrong" id="prompt-feedback"><strong>Not quite.</strong>' + esc(p.why || '') + (p.why_wrong && p.why_wrong[String(p.a)] ? '' : '') + '</div>';
    }
    out += '<div class="prompt-actions"><button type="button" class="skip-link-btn" data-action="prompt-skip" data-prompt="' + esc(p.id) + '" ' + (open ? '' : 'hidden') + '>Skip prompt</button>' +
      '<button type="button" class="skip-link-btn" data-action="prompt-show" data-prompt="' + esc(p.id) + '" ' + (open ? '' : 'hidden') + '>Show me</button>' +
      (saved && !saved.ok && !saved.skipped ? '<button type="button" class="skip-link-btn" data-action="prompt-retry" data-prompt="' + esc(p.id) + '">Try once more</button>' : '') +
      '</div>' + feedback + '</section>';
    return out;
  }

  function practiceBlock(dive, open) {
    return '<details class="practice-inline" ' + (open ? 'open' : '') + '><summary><span>' + icon('spark') + ' Practice this dive</span><span class="small muted">' + esc(dive.practice ? dive.practice.template : '') + '</span></summary><div class="practice-host" id="practice-host"></div></details>';
  }

  function diveTop(unit, dive, index, replay) {
    var total = dive.cards.length;
    var segs = dive.cards.map(function (c, i) {
      return '<span class="segment ' + (i <= index ? 'done' : '') + '"></span>';
    }).join('');
    return '<header class="dive-top">' +
      '<button type="button" class="hud-btn text top-btn" data-action="dive-exit" aria-label="Exit to Descent">' + icon('left') + '<span class="hud-label">Descent</span></button>' +
      '<button type="button" class="dive-progress" data-action="dive-outline" aria-label="Card ' + (index + 1) + ' of ' + total + '. Open outline.">' +
        '<span class="segments" aria-hidden="true">' + segs + '</span><span class="count">' + (index + 1) + ' / ' + total + '</span>' +
        (replay ? '<span class="replay-chip">Replay</span>' : '') +
      '</button>' +
      '<button type="button" class="hud-btn text top-btn" data-action="lantern-toggle" aria-label="Open the Lantern" aria-expanded="false">' + icon('lantern') + '<span class="hud-label">Lantern</span></button>' +
    '</header>';
  }

  function outlineHtml(unit, dive, index) {
    return '<nav class="dive-outline" aria-label="Dive outline"><h2>Dive outline</h2><ol class="outline-list">' +
      dive.cards.map(function (c, i) {
        return '<li><button type="button" data-action="outline-card" data-card="' + esc(c.id) + '" aria-current="' + (i === index) + '">' + esc((i + 1) + '. ' + c.title) + '</button></li>';
      }).join('') +
      '<li class="outline-group">After the cards</li>' +
      '<li><button type="button" data-action="outline-surface">Surface · 3 checks</button></li>' +
      '</ol></nav>';
  }

  function lanternHtml(unit, dive, card) {
    var hints = card.prompt && card.prompt.hints || [];
    var glossary = unit.glossary || [];
    return '<aside class="lantern" id="lantern" aria-label="Lantern" aria-hidden="true">' +
      '<div class="lantern-head"><h2>' + icon('lantern') + ' Lantern</h2><button type="button" class="hud-btn" data-action="lantern-close" aria-label="Close the Lantern">' + icon('close') + '</button></div>' +
      '<div class="lantern-tabs" role="tablist">' +
        '<button type="button" role="tab" data-action="lantern-tab" data-tab="hints" aria-selected="true">Hints</button>' +
        '<button type="button" role="tab" data-action="lantern-tab" data-tab="glossary" aria-selected="false">Glossary</button>' +
        '<button type="button" role="tab" data-action="lantern-tab" data-tab="note" aria-selected="false">Note</button>' +
      '</div>' +
      '<div class="lantern-panel" id="lantern-panel">' +
        '<div data-panel="hints"><h3>A little light</h3>' +
          (hints.length ? hints.map(function (h) { return '<p>' + esc(h) + '</p>'; }).join('') : '<p>Read the question once for what it is asking. Then read the numbers in order.</p><p>You can skip a prompt. A skip is not counted as retrieval.</p>') +
          (card.prompt ? '<p class="small muted">Answer first. The explanation opens after you choose.</p>' : '') +
        '</div>' +
        '<div data-panel="glossary" hidden><h3>Glossary</h3>' + (glossary.length ? glossary.map(function (g) { return '<div class="glossary-item"><strong>' + esc(g.term) + '</strong><span>' + esc(g.def) + '</span></div>'; }).join('') : '<p>No glossary entries for this dive.</p>') + '</div>' +
        '<div data-panel="note" hidden><h3>Your note</h3><p class="small muted">Saved on this device as you type.</p><label class="sr-only" for="lantern-note">Note for this card</label><textarea id="lantern-note" data-dive="' + esc(dive.id) + '" data-card="' + esc(card.id) + '">' + esc(P.getNote(dive.id, card.id)) + '</textarea></div>' +
      '</div></aside>' +
      '<button type="button" class="lantern-backdrop" data-action="lantern-close" aria-label="Close the Lantern" hidden></button>';
  }

  function renderDive(route) {
    var meta = metaForDive(route.params.diveId);
    if (!meta) {
      renderHud();
      screenEl.className = 'screen';
      screenEl.innerHTML = R.empty('This dive has been retired', 'Its progress is kept, but the card is no longer in the live unit. Nothing was deleted.', '<button class="btn" data-go="/map">Back to the map</button>');
      focusMain();
      return;
    }
    if (!app.unit || app.unit.id !== meta.id) {
      renderHud();
      loadUnitInto(meta.id, function (unit) { app.unit = unit; renderDive(route); });
      return;
    }
    var unit = app.unit;
    var dive = unitOfDive(unit, route.params.diveId);
    if (!dive) {
      renderHud();
      screenEl.className = 'screen';
      screenEl.innerHTML = R.empty('This dive has been retired', 'Its progress is kept. The unit changed, but nothing you answered was deleted.', '<button class="btn" data-go="/map">Back to the map</button>');
      focusMain();
      return;
    }
    var saved = P.dive(dive.id);
    var replay = !!(saved && saved.status === 'surfaced');
    if (!replay) {
      P.startDive(dive, route.params.cardId || (saved && saved.cardId) || dive.cards[0].id, dive.rev);
      saved = P.dive(dive.id);
      if (saved && saved.rev !== dive.rev) {
        P.setCard(dive.id, saved.cardId, dive.rev);
        saved = P.dive(dive.id);
      }
    }
    var desired = route.params.cardId || (saved && saved.cardId) || dive.cards[0].id;
    var index = cardIndexOf(dive, desired);
    if (index < 0) index = Math.max(0, cardIndexOf(dive, saved && saved.cardId));
    if (index < 0) index = 0;
    var card = dive.cards[index];
    if (!replay) P.setCard(dive.id, card.id, dive.rev);
    P.markCardSeen(dive.id, card.id, card.concepts || []);
    if (route.params.cardId !== card.id) {
      try { history.replaceState(null, '', '#/dive/' + dive.id + '/' + card.id); } catch (e) { /* file URL */ }
    }
    app.unit = unit;
    app.dive = dive;
    app.card = card;
    app.cardIndex = index;
    setZone(unit.zone);
    hudEl.hidden = true;
    screenEl.className = 'screen is-dive';
    var primaryPath = '';
    var top = diveTop(unit, dive, index, replay);
    var cardHtml = '<article class="dive-card" aria-labelledby="dive-title">' +
      '<div class="card-kind"><span class="kind-label">' + esc(kindLabel(card.kind)) + '</span><span class="concept-chips">' + (card.concepts || []).map(function (c) { return '<span class="concept-chip">' + esc(U.conceptName(c)) + '</span>'; }).join('') + '</span></div>' +
      '<h1 id="dive-title" tabindex="-1">' + esc(card.title) + '</h1>' +
      (index === 0 && dive.hook ? '<p class="card-hook">' + esc(dive.hook) + '</p>' : '') +
      '<div class="card-body">' + paragraphs(card.body) + '</div>' +
      (card.visual ? R.visual(card.visual) : '') +
      (card.formula ? R.formula(card.formula, card.mathDesc) : '') +
      (card.steps ? '<ol class="steps">' + card.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' : '') +
      (card.kind === 'interactive' ? '<div class="activity" id="card-activity" data-template="' + esc(card.template) + '"><p class="small muted">Loading the activity…</p></div><p class="small" id="card-act-feedback" role="status"></p>' : '') +
      promptHtml(card, dive) +
      practiceBlock(dive, index === dive.cards.length - 1) +
    '</article>';
    var body = '<div class="dive-layout" id="dive-layout">' +
      outlineHtml(unit, dive, index) +
      '<div class="dive-body" id="dive-body"><div class="dive-body-inner">' + cardHtml + '</div></div>' +
      lanternHtml(unit, dive, card) +
    '</div>';
    var backDisabled = index === 0 ? 'disabled' : '';
    var nextLabel = index === dive.cards.length - 1 ? 'Surface' : 'Next';
    screenEl.innerHTML = '<div class="dive-shell">' + top + body +
      '<footer class="dive-bottom"><button type="button" class="btn secondary" data-action="dive-back" ' + backDisabled + '>' + icon('left') + 'Back</button>' +
        '<span class="dive-save" data-status="' + saveState().status + '">' + esc(saveState().label) + '</span>' +
        '<button type="button" class="btn" data-action="dive-next" data-autofocus>' + esc(nextLabel) + ' ' + icon(index === dive.cards.length - 1 ? 'wave' : 'right') + '</button>' +
      '</footer></div>';
    R.title(card.title + ' · ' + dive.title + ' · Polycodex');
    var key = dive.id + ':' + card.id;
    if (key !== app.lastCardKey) {
      app.lastCardKey = key;
      // Focus after the card has painted so the browser does not force layout
      // inside the click task. Screen readers still get the new heading.
      var head = document.getElementById('dive-title');
      if (head) root.requestAnimationFrame(function () {
        if (document.getElementById('dive-title') === head) head.focus({ preventScroll: true });
      });
      R.announce('Card ' + (index + 1) + ' of ' + dive.cards.length + ': ' + card.title);
    }
    mountCardActivity(card);
    var practiceEl = document.querySelector('.practice-inline');
    if (practiceEl) {
      practiceEl.addEventListener('toggle', function () {
        if (practiceEl.open && app.dive === dive) mountPractice(dive, true);
      });
      if (practiceEl.open) mountPractice(dive, true);
    }
    onSwipe();
    updateHudLive();
  }

  function mountCardActivity(card) {
    if (card.kind !== 'interactive' || !card.template) return;
    var host = document.getElementById('card-activity');
    if (!host) return;
    if (!root.CodexActivities) {
      host.innerHTML = '<p class="small muted">Loading the activity…</p>';
      ensureActivities().then(function () {
        if (app.card === card && document.getElementById('card-activity') === host) mountCardActivity(card);
      }).catch(function () {
        host.innerHTML = '<p class="small muted">This activity could not load. You can still finish the dive.</p>';
      });
      return;
    }
    var done = false;
    try {
      root.CodexActivities.mount(card.template, host, card.params || {}, {
        onComplete: function (result) {
          if (done) return;
          done = true;
          var fb = document.getElementById('card-act-feedback');
          if (fb) {
            fb.textContent = result.ok ? 'Nice. That is the scale in action.' : 'Not yet. Adjust one value and try again.';
            fb.style.color = result.ok ? 'var(--c-kelp)' : 'var(--c-coral)';
          }
          R.announce(result.ok ? 'Activity correct.' : 'Activity not yet correct.');
        }
      });
    } catch (e) {
      host.innerHTML = '<p class="small muted">This activity could not load. You can still finish the dive.</p>';
    }
  }

  function mountPractice(dive, open) {
    var host = document.getElementById('practice-host');
    if (!host) return;
    if (!root.CodexPractice) {
      host.innerHTML = '<p class="small muted">Loading practice…</p>';
      ensurePractice().then(function () {
        if (app.dive === dive && document.getElementById('practice-host') === host) mountPractice(dive, open);
      }).catch(function () {
        host.innerHTML = '<p class="small muted">Practice could not load. You can still finish the dive.</p>';
      });
      return;
    }
    try { root.CodexPractice.mount(host, dive, { inline: true }); } catch (e) { host.innerHTML = '<p class="small muted">Practice could not load. You can still finish the dive.</p>'; }
  }

  function goDive(diveId, cardId, replace) {
    navigate('/dive/' + diveId + '/' + cardId, { replace: !!replace });
  }

  function diveMove(delta) {
    if (!app.dive || !app.card) return;
    var dive = app.dive;
    var next = app.cardIndex + delta;
    if (next < 0) return;
    if (next >= dive.cards.length) { navigate('/surface/' + dive.id); return; }
    goDive(dive.id, dive.cards[next].id, false);
  }

  function exitDive() {
    if (!app.unit) { navigate('/map'); return; }
    navigate('/reef/' + app.unit.reef + '/' + app.unit.zone);
  }

  function setLantern(open, tab) {
    var lantern = document.getElementById('lantern');
    var backdrop = document.querySelector('.lantern-backdrop');
    var layout = document.getElementById('dive-layout');
    if (!lantern) return;
    lantern.classList.toggle('open', open);
    lantern.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (layout) layout.classList.toggle('lantern-open', open);
    if (backdrop) backdrop.hidden = !open || root.innerWidth >= 1024;
    var btn = document.querySelector('[data-action="lantern-toggle"]');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && tab) selectLanternTab(tab);
  }

  function selectLanternTab(tab) {
    document.querySelectorAll('.lantern-tabs button').forEach(function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false');
    });
    document.querySelectorAll('.lantern-panel [data-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-panel') !== tab;
    });
  }

  function openOutline() {
    if (!app.dive) return;
    var html = '<h2>Dive outline</h2><ol class="outline-list">' + app.dive.cards.map(function (c, i) {
      return '<li><button type="button" class="outline-sheet-card" data-action="outline-card" data-card="' + esc(c.id) + '">' + esc((i + 1) + '. ' + c.title) + '</button></li>';
    }).join('') + '</ol><div class="btn-row" style="margin-top:12px"><a class="btn" href="#/surface/' + esc(app.dive.id) + '">Go to Surface · 3 checks</a></div>';
    showSheet(html);
  }

  function showSheet(html) {
    closeSheet();
    app.lastFocus = document.activeElement;
    var backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'sheet-backdrop';
    backdrop.setAttribute('aria-label', 'Close');
    backdrop.addEventListener('click', closeSheet);
    var sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML = '<button type="button" class="hud-btn sheet-close" aria-label="Close">' + icon('close') + '</button>' + html;
    sheet.querySelector('.sheet-close').addEventListener('click', closeSheet);
    sheetRoot.appendChild(backdrop);
    sheetRoot.appendChild(sheet);
    var focusable = sheet.querySelector('button, a, input, textarea');
    if (focusable) focusable.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    app.sheetEl = sheet;
  }

  function closeSheet() {
    if (!app.sheetEl) return;
    sheetRoot.innerHTML = '';
    app.sheetEl = null;
    document.body.style.overflow = '';
    if (app.lastFocus && app.lastFocus.focus) { try { app.lastFocus.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
    app.lastFocus = null;
  }

  function selectPrompt(e) {
    if (!app.card || !app.dive) return;
    var prompt = app.card.prompt;
    if (!prompt) return;
    var box = e.target.closest('.prompt');
    if (!box) return;
    var opt = Number(e.target.getAttribute('data-opt'));
    var saved = promptSaved(app.card, app.dive);
    var retried = box.getAttribute('data-retried') === '1';
    var ok = opt === prompt.a;
    if (!saved) {
      P.answerPrompt(app.dive.id, prompt.id, ok);
    } else if (saved.ok || saved.skipped) {
      return;
    }
    box.querySelectorAll('.option').forEach(function (b) {
      var i = Number(b.getAttribute('data-opt'));
      b.disabled = true;
      if (i === prompt.a) b.setAttribute('data-state', 'correct');
      else if (i === opt && !ok) b.setAttribute('data-state', 'wrong');
      else b.setAttribute('data-state', 'muted');
    });
    var fb = box.querySelector('.feedback');
    if (!fb) {
      fb = document.createElement('div');
      fb.className = 'feedback';
      fb.id = 'prompt-feedback';
      box.querySelector('.prompt-actions').insertAdjacentElement('afterend', fb);
    }
    fb.className = 'feedback' + (ok ? '' : ' is-wrong');
    var whyWrong = !ok && prompt.why_wrong && prompt.why_wrong[String(opt)] ? '<p><strong>Why that one is tempting:</strong> ' + esc(prompt.why_wrong[String(opt)]) + '</p>' : '';
    fb.innerHTML = '<strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong><p>' + esc(prompt.why || '') + '</p>' + whyWrong +
      (!ok && !retried ? '<button type="button" class="skip-link-btn" data-action="prompt-retry">Try once more</button>' : '');
    box.querySelectorAll('[data-action="prompt-skip"], [data-action="prompt-show"]').forEach(function (b) { b.hidden = true; });
    if (retried) fb.insertAdjacentHTML('beforeend', '<p class="small muted">The first attempt is the one that counts for mastery.</p>');
    R.announce(ok ? 'Correct.' : 'Not quite. The explanation is open.');
  }

  function checkPromptFill(e) {
    if (!app.card || !app.dive || !app.card.prompt) return;
    var prompt = app.card.prompt;
    var input = document.getElementById('prompt-fill-input');
    if (!input) return;
    var raw = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
    var accepted = (prompt.accept || []).map(function (a) { return String(a).toLowerCase().replace(/\s+/g, ' '); });
    var ok = accepted.indexOf(raw) >= 0;
    var saved = promptSaved(app.card, app.dive);
    var wasSaved = !!saved;
    if (!saved) P.answerPrompt(app.dive.id, prompt.id, ok);
    input.disabled = true;
    var box = input.closest('.prompt');
    var btn = box.querySelector('[data-action="prompt-check"]');
    if (btn) btn.disabled = true;
    var fb = box.querySelector('.feedback');
    if (!fb) {
      fb = document.createElement('div');
      fb.className = 'feedback';
      fb.id = 'prompt-feedback';
      box.querySelector('.prompt-actions').insertAdjacentElement('afterend', fb);
    }
    fb.className = 'feedback' + (ok ? '' : ' is-wrong');
    fb.innerHTML = '<strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong><p>' + esc(prompt.why || '') + '</p>' + (!ok ? '<p>The accepted form is one of: ' + esc((prompt.accept || []).join(', ')) + '.</p>' : '');
    box.querySelectorAll('[data-action="prompt-skip"], [data-action="prompt-show"]').forEach(function (b) { b.hidden = true; });
    if (!wasSaved && !ok) {
      fb.insertAdjacentHTML('beforeend', '<button type="button" class="skip-link-btn" data-action="prompt-retry">Try once more</button>');
    }
    R.announce(ok ? 'Correct.' : 'Not quite. The explanation is open.');
  }

  function retryPrompt() {
    var box = document.querySelector('.prompt[data-prompt="' + (app.card && app.card.prompt ? app.card.prompt.id : '') + '"]');
    if (!box) return;
    box.setAttribute('data-retried', '1');
    box.querySelectorAll('.option').forEach(function (b) {
      b.disabled = false;
      b.setAttribute('data-state', '');
    });
    var input = document.getElementById('prompt-fill-input');
    if (input) { input.disabled = false; input.focus(); }
    var check = box.querySelector('[data-action="prompt-check"]');
    if (check) check.disabled = false;
    var fb = box.querySelector('.feedback');
    if (fb) fb.innerHTML = '<p class="small muted">One more try. The first answer stays in your record.</p>';
  }

  /* ---------------- surface ---------------- */

  function renderSurface(route) {
    var meta = metaForDive(route.params.diveId);
    if (!meta) {
      renderHud(); screenEl.className = 'screen';
      screenEl.innerHTML = R.empty('Surface not found', 'This dive is not in the live unit.', '<button class="btn" data-go="/map">Back to the map</button>');
      focusMain(); return;
    }
    if (!app.unit || app.unit.id !== meta.id) {
      renderHud();
      loadUnitInto(meta.id, function (unit) { app.unit = unit; renderSurface(route); });
      return;
    }
    var dive = unitOfDive(app.unit, route.params.diveId);
    var d = P.dive(dive.id);
    if (!d) {
      renderHud(); screenEl.className = 'screen';
      screenEl.innerHTML = R.empty('This dive has not started', 'Open the dive first. The three checks appear after the cards.', '<button class="btn" data-go="/dive/' + esc(dive.id) + '/' + esc(dive.cards[0].id) + '">Open Dive 1</button>');
      focusMain(); return;
    }
    setZone(meta.zone);
    renderHud();
    screenEl.className = 'screen';
    var answered = (dive.check || []).filter(function (c) { return d.checks[c.id]; });
    if (answered.length >= dive.check.length && !app.surfaceFeedback) {
      var res = P.surface(dive);
      renderSurfaceResults(dive, res);
      return;
    }
    var idx = 0;
    if (app.surfaceFeedback) {
      for (var f = 0; f < dive.check.length; f++) { if (dive.check[f].id === app.surfaceFeedback.id) { idx = f; break; } }
    } else {
      for (var i = 0; i < dive.check.length; i++) { if (!d.checks[dive.check[i].id]) { idx = i; break; } }
    }
    var check = dive.check[idx];
    var feedback = app.surfaceFeedback && app.surfaceFeedback.id === check.id ? app.surfaceFeedback : null;
    var body = '<div class="surface-wrap"><div class="surface-card">' +
      '<span class="eyebrow">Surface · ' + esc(meta.title) + ' · ' + esc(dive.title) + '</span>' +
      '<h1 tabindex="-1" data-autofocus>Three checks.</h1>' +
      '<p class="muted" style="margin-bottom:14px">One at a time. Every answer opens an explanation. There is no fail here.</p>' +
      '<div class="check-step">Check ' + (idx + 1) + ' of ' + dive.check.length + '</div>' +
      '<p class="surface-q">' + esc(check.q) + '</p>' +
      '<div class="surface-options" role="group" aria-label="Check answer choices">' +
        (check.opts || []).map(function (o, oi) {
          var state = '';
          if (feedback) {
            if (oi === check.a) state = 'correct';
            else if (oi === feedback.chosen) state = 'wrong';
            else state = 'muted';
          }
          return '<button type="button" class="option" data-action="surface-answer" data-opt="' + oi + '" data-state="' + state + '" ' + (feedback ? 'disabled' : '') + '><span class="key">' + String.fromCharCode(65 + oi) + '</span><span>' + esc(o) + '</span></button>';
        }).join('') +
      '</div>' +
      (feedback ? '<div class="explain" role="status"><strong>' + (feedback.idk ? 'Not knowing is useful information.' : (feedback.ok ? 'Got it.' : 'Not this time.')) + '</strong><p>' + esc(check.why) + '</p>' +
        (feedback.chosen != null && !feedback.ok && check.why_wrong && check.why_wrong[String(feedback.chosen)] ? '<p><strong>Why that option is tempting:</strong> ' + esc(check.why_wrong[String(feedback.chosen)]) + '</p>' : '') +
        '</div><div class="btn-row" style="margin-top:12px"><button type="button" class="btn" data-action="surface-next" data-autofocus>' + (idx === dive.check.length - 1 ? 'See results' : 'Next check') + ' ' + icon('right') + '</button></div>' : '<div style="margin-top:10px"><button type="button" class="idk" data-action="surface-idk">I don’t know</button></div>') +
    '</div></div>';
    screenEl.innerHTML = body;
    R.title('Surface · ' + dive.title + ' · Polycodex');
    var auto = screenEl.querySelector('[data-autofocus]');
    if (auto) auto.focus({ preventScroll: true });
    app.surfaceDive = dive;
    app.surfaceIndex = idx;
    app.surfaceFeedback = feedback;
  }

  function answerSurface(opt, idk) {
    var dive = app.surfaceDive || app.dive;
    if (!dive) return;
    var d = P.dive(dive.id);
    var idx = app.surfaceIndex || 0;
    var check = dive.check[idx];
    if (!check || d.checks[check.id]) return;
    var ok = !idk && opt === check.a;
    P.answerCheck(dive.id, check.id, ok, !!idk, check.concept, !!check.transfer);
    app.surfaceFeedback = { id: check.id, chosen: idk ? null : opt, ok: ok, idk: !!idk };
    renderSurface({ params: { diveId: dive.id } });
  }

  function nextSurface() {
    var dive = app.surfaceDive;
    if (!dive) return;
    var d = P.dive(dive.id);
    var answered = (dive.check || []).filter(function (c) { return d.checks[c.id]; }).length;
    app.surfaceFeedback = null;
    if (answered >= dive.check.length) {
      renderSurface({ params: { diveId: dive.id } });
    } else {
      renderSurface({ params: { diveId: dive.id } });
    }
  }

  function nextDiveFor(unit, dive) {
    var dives = unit.dives || [];
    var i = dives.indexOf(dive);
    for (var j = i + 1; j < dives.length; j++) {
      if (statusOfDive(dives[j].id) !== 'surfaced') return dives[j];
    }
    return null;
  }

  function renderSurfaceResults(dive, res) {
    var meta = metaForDive(dive.id);
    var unit = app.unit;
    var checks = dive.check || [];
    var d = P.dive(dive.id);
    var collected = res && res.collected;
    var already = P.state.collection[dive.collect && dive.collect.id];
    var found = !!(collected || (dive.collect && already));
    var priorFind = !collected && already;
    var reviewCount = (dive.review || []).length;
    app.surfaceDive = dive;
    var next = nextDiveFor(unit, dive);
    var wreck = (dive.wreck || [])[0] ? wreckMeta((dive.wreck || [])[0]) : null;
    var shownCollect = !app.skippedCollect[dive.id] && (app.revealed[dive.id] || app.revealed[dive.collect && dive.collect.id]);
    var rows = checks.map(function (c) {
      var rec = d.checks[c.id] || {};
      return '<li><span>' + esc(U.conceptName(c.concept)) + '</span><span class="' + (rec.ok ? 'got' : 'revisit') + '">' + (rec.ok ? 'Got it' : 'Revisit soon') + '</span></li>';
    }).join('');
    screenEl.innerHTML = '<div class="surface-wrap"><div class="surface-card">' +
      '<span class="eyebrow">Surface · ' + esc(meta ? meta.title : '') + '</span>' +
      '<h1 tabindex="-1" data-autofocus>You surfaced.</h1>' +
      '<div class="results-stamp">SURFACED</div>' +
      '<p class="muted">Three checks are in. Your answers are saved; the dive is complete.</p>' +
      '<div class="depth-gauge"><span>0 m</span><span class="gauge-track"><span class="gauge-fill" style="width:' + Math.round((checks.filter(function (c) { return d.checks[c.id] && d.checks[c.id].ok; }).length / Math.max(1, checks.length)) * 100) + '%"></span></span><span>Surface</span></div>' +
      '<h2 class="section-title" style="font-size:var(--fs-4)">Concepts</h2><ul class="result-list">' + rows + '</ul>' +
      '<div class="review-added">' + reviewCount + ' review card' + (reviewCount === 1 ? '' : 's') + ' added.</div>' +
      (dive.collect ? '<div class="collect-reveal"><h2>' + (app.skippedCollect[dive.id] ? 'Kept for later' : ((shownCollect || priorFind) ? esc(dive.collect.name) : 'Something is down here')) + '</h2>' +
        (app.skippedCollect[dive.id] ? '<p class="small">The find is in your collection. Open Collection in the Logbook to see it another time.</p>' :
          (shownCollect || priorFind ? '<div class="collect-art">' + icon('spark') + '</div><p class="fact">' + esc(dive.collect.fact) + '</p><p class="small muted">Source: ' + esc(dive.collect.source) + '</p>' :
          '<p class="small">A collectible is ready. Reveal it, or skip and keep moving.</p><div class="btn-row"><button type="button" class="btn small-btn" data-action="collect-reveal" data-collect="' + esc(dive.collect.id) + '">Reveal the find</button><button type="button" class="btn ghost small-btn" data-action="collect-skip">Skip reveal</button></div>')) +
      '</div>' : '') +
      '<div class="btn-row surface-actions">' +
        (next ? '<a class="btn" href="#/dive/' + esc(next.id) + '/' + esc(next.cards[0].id) + '">Next dive: ' + esc(next.title) + ' ' + icon('right') + '</a>' : '<a class="btn" href="#/reef/' + esc(unit.reef) + '/' + esc(unit.zone) + '">Back to Descent ' + icon('right') + '</a>') +
        '<button type="button" class="btn secondary" data-action="practice-lounge">Practice in the Lounge</button>' +
        (wreck ? '<a class="btn ghost" href="wreck.html#/wreck/' + esc(wreck.id) + '">' + icon('book') + 'Read ' + esc(wreck.title) + '</a>' : '') +
        '<a class="btn ghost" href="#/reef/' + esc(unit.reef) + '/' + esc(unit.zone) + '">Back to Descent</a>' +
      '</div>' +
    '</div></div>';
    R.title('Surfaced · ' + dive.title + ' · Polycodex');
    var auto = screenEl.querySelector('[data-autofocus]');
    if (auto) auto.focus({ preventScroll: true });
  }

  /* ---------------- logbook ---------------- */

  function allCollectibles() {
    var out = [];
    (manifest().units || []).forEach(function (meta) {
      var unit = U.get(meta.id);
      if (!unit) return;
      (unit.dives || []).forEach(function (d) {
        if (d.collect) out.push({ dive: d, collect: d.collect, unit: unit });
      });
    });
    return out;
  }

  function renderLogbook(route) {
    var tab = route.params.tab || 'progress';
    if ((tab === 'collection' || tab === 'review') && !U.get('number-shallows-ratios')) {
      renderHud();
      screenEl.className = 'screen';
      screenEl.innerHTML = '<div class="logbook">' + logbookHead(tab) + R.skeleton(tab === 'collection' ? 'Opening the collection…' : 'Opening review cards…') + '</div>';
      U.load('number-shallows-ratios').then(function () { renderLogbook(route); }).catch(function () {
        screenEl.innerHTML = '<div class="logbook">' + logbookHead(tab) + '<div class="empty-paper"><h2>This page could not open</h2><p>Check the connection. Your saved progress is untouched.</p><a class="btn" href="#/logbook/progress">Back to Progress</a></div></div>';
      });
      return;
    }
    renderHud();
    screenEl.className = 'screen';
    screenEl.innerHTML = '<div class="logbook">' + logbookHead(tab) + logbookBody(tab) + '</div>';
    R.title('Logbook · Polycodex');
    focusMain();
  }

  function logbookHead(tab) {
    var tabs = [
      ['progress', 'Progress'], ['collection', 'Collection'], ['review', 'Review'],
      ['notes', 'Notes'], ['settings', 'Settings'], ['extras', 'Extras'], ['reference', 'Reference']
    ];
    return '<span class="eyebrow">The Logbook</span><h1 tabindex="-1" data-autofocus>What you keep.</h1>' +
      '<p class="sub">Progress, finds, review cards and settings. Paper, not water.</p>' +
      '<nav class="logbook-tabs" aria-label="Logbook sections">' + tabs.map(function (t) {
        return '<a href="#/logbook/' + t[0] + '" ' + (tab === t[0] ? 'aria-current="page"' : '') + '>' + t[1] + '</a>';
      }).join('') + '</nav>';
  }

  function logbookBody(tab) {
    if (tab === 'collection') return collectionTab();
    if (tab === 'review') return reviewTab();
    if (tab === 'notes') return notesTab();
    if (tab === 'settings') return settingsTab();
    if (tab === 'extras') return extrasTab();
    if (tab === 'reference') return referenceTab();
    return progressTab();
  }

  function progressTab() {
    var stats = P.stats();
    var concepts = [];
    (manifest().units || []).forEach(function (u) { (u.concepts || []).forEach(function (c) { if (concepts.indexOf(c) < 0) concepts.push(c); }); });
    var wrecks = manifest().wrecks || [];
    return '<div class="lb-stats"><div class="lb-stat"><strong>' + stats.divesSurfaced + '</strong><span>dives surfaced</span></div>' +
      '<div class="lb-stat"><strong>' + stats.collection + '</strong><span>collectibles</span></div>' +
      '<div class="lb-stat"><strong>' + stats.xp + '</strong><span>XP from retrieval</span></div>' +
      '<div class="lb-stat"><strong>' + stats.due + '</strong><span>reviews due</span></div></div>' +
      '<div class="lb-grid"><section class="lb-card"><h2>Mastery map</h2><p class="small">Opening a card moves a concept to Seen. Recalled needs a correct retrieval at least 20 hours after the previous exposure.</p>' +
        '<ul class="mastery-list">' + concepts.map(function (c) {
          var stage = P.stage(c);
          var names = ['Not seen', 'Seen', 'Practiced', 'Recalled'];
          return '<li><span>' + esc(U.conceptName(c)) + '</span><span class="stage-pips" aria-label="' + names[stage] + '">' + [0,1,2,3].map(function (i) { return '<span class="' + (i < stage ? 'on' : '') + '"></span>'; }).join('') + '</span></li>';
        }).join('') + '</ul></section>' +
        '<section class="lb-card"><h2>Wreck reading list</h2><p class="small">42 lessons. Explicit Finish marks one read; scrolling does not.</p><div class="wreck-read-list">' +
          wrecks.map(function (w) {
            var rec = P.wreck(w.id);
            var read = rec && rec.status === 'read';
            var legacy = P.state.legacy.charted[w.id];
            return '<a href="wreck.html#/wreck/' + esc(w.id) + '"><span>' + esc(w.title) + '</span><span class="' + (read || legacy ? 'read' : '') + '">' + (read ? 'Read' : (legacy ? 'Charted' : '')) + '</span></a>';
          }).join('') +
        '</div></section></div>' +
        '<section class="lb-card" style="margin-top:12px"><h2>Recent dives</h2>' +
          (Object.keys(P.state.dives).length ? '<ul class="mastery-list">' + Object.keys(P.state.dives).map(function (id) {
            var m = metaForDive(id); var dm = diveMeta(m, id); var d = P.state.dives[id];
            if (!m || !dm) return '';
            return '<li><a href="#/dive/' + esc(id) + '/' + esc(d.cardId || 'c1') + '">' + esc(dm.title) + '</a><span>' + esc(d.status === 'surfaced' ? 'Surfaced' : 'In progress') + '</span></li>';
          }).join('') + '</ul>' : '<p class="small">No dives yet. The first one is waiting on the Reef Map.</p>') +
        '</section>';
  }

  function collectionTab() {
    var items = allCollectibles();
    var earned = items.filter(function (i) { return P.state.collection[i.collect.id]; }).length;
    return '<div class="page-head"><div><h2 class="section-title">Species log</h2><p class="sub">' + earned + ' of ' + items.length + ' found. Each find comes from a surfaced dive.</p></div></div>' +
      '<div class="collection-grid">' + items.map(function (i) {
        var got = !!P.state.collection[i.collect.id];
        return '<div class="collection-item ' + (got ? 'earned' : '') + '"><div class="c-art">' + icon(got ? 'spark' : 'lock') + '</div><strong>' + esc(got ? i.collect.name : 'Not found yet') + '</strong><span>' + esc(got ? i.collect.fact : 'Surface ' + i.dive.title + ' to find it.') + '</span></div>';
      }).join('') + '</div>';
  }

  function reviewTab() {
    var due = P.dueReviews();
    if (!due.length) {
      return '<div class="empty-paper"><h2>Nothing due right now.</h2><p>Review cards arrive when you surface a dive. A later session will bring them back.</p><div class="btn-row" style="justify-content:center"><a class="btn" href="#/map">Find a dive</a><a class="btn secondary" href="#/lounge">Practice in the Lounge</a></div></div>';
    }
    return '<h2 class="section-title">Review · ' + due.length + ' due</h2><p class="small">Retrieval, not rereading. A wrong answer comes back sooner; it never lowers a mastery stage.</p>' +
      due.slice(0, 20).map(function (id) {
        var item = P.reviewItems()[id];
        var found = findReview(id);
        var revealed = app.revealed[id];
        return '<article class="review-card"><div class="front">' + esc(found ? found.front : 'What did you learn?') + '</div>' +
          (revealed ? '<div class="back">' + esc(found ? found.back : 'Open the dive to reread this card.') + '</div><div class="btn-row" style="margin-top:8px"><button type="button" class="btn got" data-action="review-answer" data-review="' + esc(id) + '" data-ok="1">Got it</button><button type="button" class="btn again" data-action="review-answer" data-review="' + esc(id) + '" data-ok="0">Again</button></div>' :
            '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn" data-action="review-reveal" data-review="' + esc(id) + '">Reveal answer</button></div>') +
        '</article>';
      }).join('');
  }

  function findReview(id) {
    var parts = String(id).split(':');
    if (parts.length < 4) return null;
    var diveId = parts[1];
    var itemId = parts.slice(2).join(':');
    var meta = metaForDive(diveId);
    var unit = meta && U.get(meta.id);
    var dive = unit && unitOfDive(unit, diveId);
    var item = dive && (dive.review || []).filter(function (r) { return r.id === itemId; })[0];
    return item || null;
  }

  function notesTab() {
    var note = safeGet('cx_v10_notebook_note') || '';
    return '<div class="page-head"><div><h2 class="section-title">Notes</h2><p class="sub">The old Notebook is still there. New card notes live in the Lantern during a dive.</p></div></div>' +
      '<label class="small" for="global-note">A page for this device</label><textarea class="note-area" id="global-note" data-note="global">' + esc(note) + '</textarea>' +
      '<div class="btn-row" style="margin-top:10px"><a class="btn secondary" href="index.html?ui=legacy">Open the legacy Notebook</a></div>';
  }

  function settingsTab() {
    var p = P.state.prefs;
    return '<h2 class="section-title">Settings</h2><p class="small">These preferences save with your progress on this device.</p>' +
      '<div class="settings-row"><span class="label">Graphics<span class="hint">Auto follows the device. Lower tiers keep motion still.</span></span>' +
        '<select data-setting="fx" aria-label="Graphics tier">' + ['auto','high','med','low','off'].map(function (v) { return '<option value="' + v + '" ' + (p.fx === v ? 'selected' : '') + '>' + v.charAt(0).toUpperCase() + v.slice(1) + '</option>'; }).join('') + '</select></div>' +
      '<div class="settings-row"><span class="label">Text size<span class="hint">Scales the reading and UI tokens. Layout reflows; nothing clips.</span></span>' +
        '<select data-setting="text" aria-label="Text size">' + [[1,'100%'],[2,'115%'],[3,'130%']].map(function (v) { return '<option value="' + v[0] + '" ' + (Number(p.text) === v[0] ? 'selected' : '') + '>' + v[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="settings-row"><span class="label">Slate<span class="hint">Day uses paper. Night uses a dark slate in the dive player.</span></span>' +
        '<select data-setting="slate" aria-label="Slate theme"><option value="day" ' + (p.slate === 'day' ? 'selected' : '') + '>Day</option><option value="night" ' + (p.slate === 'night' ? 'selected' : '') + '>Night</option></select></div>' +
      '<div class="settings-row"><span class="label">Sound<span class="hint">A single toggle. No autoplay.</span></span>' +
        '<select data-setting="sound" aria-label="Sound"><option value="on" ' + (p.sound === 'on' ? 'selected' : '') + '>On</option><option value="off" ' + (p.sound === 'off' ? 'selected' : '') + '>Off</option></select></div>' +
      '<div class="settings-row"><span class="label">Save<span class="hint">Storage: ' + esc(P.source || 'this device') + '. Cloud sync is not acknowledged, so the app never says “Synced”.</span></span>' +
        '<span class="pill live">' + esc(saveState().label) + '</span></div>' +
      '<div class="settings-row"><span class="label">Account &amp; BYOK<span class="hint">The legacy account and API key screens remain available.</span></span>' +
        '<a class="btn small-btn" href="index.html?ui=legacy">Open account</a></div>' +
      '<div class="settings-row"><span class="label">Export<span class="hint">A JSON copy of this device’s progress.</span></span>' +
        '<button type="button" class="btn small-btn" data-action="export">Export progress</button></div>';
  }

  function extrasTab() {
    return '<h2 class="section-title">Extras</h2><p class="sub">Probes, energy and badges live in the Lounge. They are not part of dive mastery.</p>' +
      '<div class="lb-grid"><div class="lb-card"><h2>Probes &amp; energy</h2><p class="small">The original Lounge economy is still running, including the 30-action daily cap.</p><a class="btn secondary" href="index.html?ui=legacy">Open the Lounge</a></div>' +
      '<div class="lb-card"><h2>Badges</h2><p class="small">Legacy badges are preserved. Surfacing a dive here earns mastery, not a badge.</p><a class="btn secondary" href="index.html?ui=legacy">See badges</a></div>' +
      '<div class="lb-card"><h2>Legacy charted lessons</h2><p class="small">' + Object.keys(P.state.legacy.charted || {}).length + ' lesson records were imported and are shown as “Charted (legacy)”. They are never reset.</p></div>' +
      '<div class="lb-card"><h2>Daily Dive</h2><p class="small">A five-minute mixed review is planned for Phase 2. Due review cards work now.</p><a class="btn secondary" href="#/logbook/review">Open Review</a></div></div>';
  }

  function referenceTab() {
    return '<h2 class="section-title">Reference</h2><p class="sub">The old Sys-Log remains a reference surface. It is not progress.</p>' +
      '<div class="lb-card"><h2>Sys-Log</h2><p class="small">Open the legacy reference panel with its original navigation.</p><a class="btn secondary" href="index.html?ui=legacy">Open Sys-Log</a></div>';
  }

  /* ---------------- search + lounge ---------------- */

  function renderSearch(route) {
    renderHud();
    screenEl.className = 'screen';
    screenEl.innerHTML = '<div class="search-wrap" id="search-host"><p class="small muted" style="padding:16px">Opening the sonar…</p></div>';
    R.title('Search · Polycodex');
    app.searchMounted = true;
    var host = document.getElementById('search-host');
    ensureSearch().then(function () {
      if (app.route.name !== 'search' || document.getElementById('search-host') !== host) return;
      host.innerHTML = '';
      root.CodexSearch.mount(host, { query: route.query.q || '' });
    }).catch(function () {
      host.innerHTML = '<div class="empty"><h2>Search could not load</h2><p>Check your connection and try again, or browse the Reef Map.</p><div class="btn-row"><button type="button" class="btn" data-action="nav" data-path="/map">Browse the map</button></div></div>';
    });
  }

  function renderLounge() {
    renderHud();
    screenEl.className = 'screen';
    var returnRaw = safeGet('cx_v10_return');
    var returnInfo = null;
    try { returnInfo = returnRaw ? JSON.parse(returnRaw) : null; } catch (e) { returnInfo = null; }
    var rooms = { kitchen: 'Kitchen', dome: 'Dome', conservatory: 'Conservatory', archive: 'Archive' };
    var roomMeta = {
      kitchen: ['Kitchen', 'Number · Ratios and recipes', 'Scale a recipe with the Tune template.'],
      dome: ['Dome', 'Sky & Sea · observation', 'Read the sky and record what changes.'],
      conservatory: ['Conservatory', 'Life · systems', 'Sort and balance living systems.'],
      archive: ['Archive', 'Signal · evidence', 'Decode and sequence an argument.']
    };
    screenEl.innerHTML = '<div class="page-head"><div><span class="eyebrow">The doing half</span><h1 tabindex="-1" data-autofocus>The Lounge</h1>' +
      '<p class="sub">Lessons teach. Rooms let you do. Every room practises a named concept, and results come back to the dive.</p></div></div>' +
      (returnInfo ? '<div class="card" style="margin-bottom:14px"><span class="eyebrow">A dive is waiting</span><p>You left <strong>' + esc(returnInfo.diveId || 'a dive') + '</strong> to practise in the ' + esc(returnInfo.room || 'Lounge') + '.</p><div class="btn-row"><a class="btn" href="#' + esc(returnInfo.returnTo || '/') + '">Back to the dive</a></div></div>' : '') +
      '<div class="lounge-hero"><div><p class="sub">The Kitchen is mapped to Number Reef · Ratios. The other three rooms are open legacy spaces while their v10 activities are charted.</p>' +
        '<div class="room-list">' + Object.keys(rooms).map(function (id) {
          var m = roomMeta[id] || [rooms[id], '', ''];
          return '<div class="room-row"><strong>' + esc(m[0]) + '</strong><span>' + esc(m[1]) + '</span><p class="small muted" style="margin:4px 0 0">' + esc(m[2]) + '</p></div>';
        }).join('') + '</div></div>' +
        '<div class="card"><h2 class="section-title" style="font-size:var(--fs-4)">Open a room</h2><p class="small">The Lounge runs in the legacy shell for now. v10 returns you to the same dive card.</p>' +
          '<div class="btn-row"><button type="button" class="btn" data-action="open-kitchen">' + icon('spark') + 'Open the Kitchen</button><a class="btn secondary" href="index.html?ui=legacy">Open the Lounge</a></div>' +
          '<p class="small muted" style="margin-top:10px">If the room cannot open, the inline practice in the dive stays available. Nothing is lost.</p></div>' +
      '</div>';
    R.title('Lounge · Polycodex');
    focusMain();
  }

  /* ---------------- actions ---------------- */

  function openKitchen() {
    ensurePractice().then(function () {
      var meta = unitMeta('number-shallows-ratios');
      loadUnitInto('number-shallows-ratios', function (unit) {
        app.unit = unit;
        var dive = unitOfDive(unit, 'ratios-d3') || unit.dives[0];
        root.CodexPractice.openLounge(dive, { newTab: true });
      }, function () {
        navigate('index.html?ui=legacy&from=v10&room=kitchen');
      });
    }).catch(function () {
      navigate('index.html?ui=legacy&from=v10&room=kitchen');
    });
  }

  function exportProgress() {
    try {
      var blob = new Blob([P.exportJSON()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'polycodex-progress-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      root.toast('Progress exported.');
    } catch (e) {
      root.toast('Export is unavailable in this browser.', { tone: 'coral' });
    }
  }

  function handleAction(el, e) {
    var action = el.getAttribute('data-action');
    if (!action) return;
    if (action === 'continue') {
      var path = el.getAttribute('data-path') || continueInfo().path;
      if (firstVisit()) { afterPaint(function () { navigate('/onboarding'); }); return; }
      afterPaint(function () { navigate(path); });
      return;
    }
    if (action === 'legacy-dismiss') {
      safeSet('cx_v10_legacy_notice', '1');
      var note = el.closest('.legacy-notice');
      if (note) note.remove();
      return;
    }
    if (action === 'title-sound') {
      var on = P.state.prefs.sound !== 'off';
      P.setPref('sound', on ? 'off' : 'on');
      renderTitle();
      root.toast(on ? 'Sound off.' : 'Sound on.');
      return;
    }
    if (action === 'title-graphics') {
      var tiers = ['high', 'med', 'low', 'off'];
      var next = tiers[(tiers.indexOf(FX.tier) + 1) % tiers.length];
      P.setPref('fx', next);
      FX.setTier(next, { manual: true, announce: true });
      renderTitle();
      root.toast('Graphics: ' + next + '.');
      return;
    }
    if (action === 'onboard-depth') {
      app.depthChoice = el.getAttribute('data-depth');
      screenEl.querySelectorAll('.depth-choice').forEach(function (b) { b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
      return;
    }
    if (action === 'onboard-reef' || action === 'onboard-begin' || action === 'onboard-skip') {
      finishOnboarding();
      return;
    }
    if (action === 'unit-open') {
      var uid = el.getAttribute('data-unit');
      var sheet = document.getElementById('unit-sheet');
      if (sheet) { sheet.scrollIntoView({ behavior: 'smooth', block: 'start' }); sheet.focus({ preventScroll: true }); }
      return;
    }
    if (action === 'dive-open') {
      navigate('/dive/' + el.getAttribute('data-dive') + '/' + el.getAttribute('data-card'));
      return;
    }
    if (action === 'unit-review') { navigate('/logbook/review'); return; }
    if (action === 'dive-next') { diveMove(1); return; }
    if (action === 'dive-back') { diveMove(-1); return; }
    if (action === 'dive-exit') { exitDive(); return; }
    if (action === 'dive-outline') { openOutline(); return; }
    if (action === 'outline-card') { closeSheet(); goDive(app.dive.id, el.getAttribute('data-card'), true); return; }
    if (action === 'outline-surface') { closeSheet(); navigate('/surface/' + app.dive.id); return; }
    if (action === 'lantern-toggle') { setLantern(!document.getElementById('lantern').classList.contains('open')); return; }
    if (action === 'lantern-close') { setLantern(false); return; }
    if (action === 'lantern-tab') { selectLanternTab(el.getAttribute('data-tab')); return; }
    if (action === 'prompt-option') { selectPrompt(e); return; }
    if (action === 'prompt-check') { checkPromptFill(e); return; }
    if (action === 'prompt-retry') { retryPrompt(); return; }
    if (action === 'prompt-skip' || action === 'prompt-show') {
      if (!app.card || !app.dive || !app.card.prompt) return;
      var pid = app.card.prompt.id;
      P.skipPrompt(app.dive.id, pid);
      var box = el.closest('.prompt');
      var prompt = app.card.prompt;
      box.querySelectorAll('.option').forEach(function (b) {
        b.disabled = true;
        if (Number(b.getAttribute('data-opt')) === prompt.a) b.setAttribute('data-state', 'correct');
        else b.setAttribute('data-state', 'muted');
      });
      box.querySelectorAll('[data-action="prompt-skip"], [data-action="prompt-show"]').forEach(function (b) { b.hidden = true; });
      var fb = box.querySelector('.feedback');
      if (!fb) { fb = document.createElement('div'); fb.className = 'feedback'; box.querySelector('.prompt-actions').insertAdjacentElement('afterend', fb); }
      fb.innerHTML = '<strong>Shown.</strong><p>' + esc(prompt.why || '') + '</p><p class="small muted">This prompt is skipped, so it does not count as retrieval.</p>';
      R.announce('Prompt skipped. No retrieval credit.');
      return;
    }
    if (action === 'surface-answer') { answerSurface(Number(el.getAttribute('data-opt')), false); return; }
    if (action === 'surface-idk') { answerSurface(null, true); return; }
    if (action === 'surface-next') { nextSurface(); return; }
    if (action === 'collect-reveal') {
      app.revealed[el.getAttribute('data-collect')] = true;
      if (app.surfaceDive) { app.revealed[app.surfaceDive.id] = true; delete app.skippedCollect[app.surfaceDive.id]; }
      renderSurface({ params: { diveId: app.surfaceDive.id } });
      return;
    }
    if (action === 'collect-skip') {
      if (app.surfaceDive) app.skippedCollect[app.surfaceDive.id] = true;
      renderSurface({ params: { diveId: app.surfaceDive.id } });
      return;
    }
    if (action === 'practice-lounge') {
      var loungeDive = app.surfaceDive || app.dive;
      if (loungeDive) ensurePractice().then(function () { root.CodexPractice.openLounge(loungeDive, { newTab: true }); }).catch(function () { root.toast('Practice could not load. Inline practice is still available.', { tone: 'coral' }); });
      return;
    }
    if (action === 'open-kitchen') { openKitchen(); return; }
    if (action === 'review-reveal') {
      app.revealed[el.getAttribute('data-review')] = true;
      renderLogbook({ params: { tab: 'review' } });
      return;
    }
    if (action === 'review-answer') {
      var rid = el.getAttribute('data-review');
      P.reviewAnswer(rid, el.getAttribute('data-ok') === '1');
      delete app.revealed[rid];
      renderLogbook({ params: { tab: 'review' } });
      return;
    }
    if (action === 'export') { exportProgress(); return; }
    if (action === 'dismiss-corrupt') {
      app.corruptDismissed = true;
      showBanner();
      return;
    }
    if (action === 'retry-save') {
      if (P.flush()) root.toast('Saved on this device.'); else root.toast('Couldn’t save. Check storage space and try again.', { tone: 'coral' });
      updateHudLive();
      return;
    }
  }

  function onClick(e) {
    var actionEl = e.target.closest && e.target.closest('[data-action]');
    if (actionEl) {
      e.preventDefault();
      handleAction(actionEl, e);
      return;
    }
    var goEl = e.target.closest && e.target.closest('[data-go]');
    if (goEl) {
      e.preventDefault();
      navigate(goEl.getAttribute('data-go'));
    }
  }

  function onChange(e) {
    var sel = e.target.closest && e.target.closest('[data-setting]');
    if (!sel) return;
    var key = sel.getAttribute('data-setting');
    var val = key === 'text' ? Number(sel.value) : sel.value;
    if (key === 'fx') {
      P.setPref('fx', val);
      if (val === 'auto') FX.setTier(FX.detect(), { announce: true });
      else FX.setTier(val, { manual: true, announce: true });
      root.toast('Graphics: ' + (val === 'auto' ? 'auto (' + FX.tier + ')' : val) + '.');
    } else {
      P.setPref(key, val);
      root.toast('Saved.');
    }
    updateHudLive();
  }

  function onInput(e) {
    if (e.target.id === 'lantern-note') {
      clearTimeout(app.noteTimer);
      var t = e.target;
      app.noteTimer = setTimeout(function () {
        P.setNote(t.getAttribute('data-dive'), t.getAttribute('data-card'), t.value);
      }, 300);
      return;
    }
    if (e.target.id === 'global-note') {
      clearTimeout(app.globalNoteTimer);
      app.globalNoteTimer = setTimeout(function () { safeSet('cx_v10_notebook_note', e.target.value); root.toast('Note saved.'); }, 400);
    }
  }

  function onKey(e) {
    if (!app.route) return;
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
    if (e.key === 'Escape') {
      if (app.sheetEl) { closeSheet(); return; }
      var lantern = document.getElementById('lantern');
      if (lantern && lantern.classList.contains('open')) { setLantern(false); return; }
      if (app.route.name === 'dive') { exitDive(); return; }
      if (app.route.name === 'search') { navigate('/map', { replace: true }); return; }
      return;
    }
    if (typing) return;
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault(); navigate('/search'); return;
    }
    if (app.route.name === 'surface') {
      if (/^[1-4]$/.test(e.key)) {
        var sopt = document.querySelector('.surface-options .option[data-opt="' + (Number(e.key) - 1) + '"]:not([disabled])');
        if (sopt) { e.preventDefault(); sopt.click(); }
      }
      return;
    }
    if (app.route.name !== 'dive') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); diveMove(1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); diveMove(-1); return; }
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setLantern(!document.getElementById('lantern').classList.contains('open')); return; }
    if (e.key === 'g' || e.key === 'G') { e.preventDefault(); setLantern(true, 'glossary'); return; }
    if (e.key === 'o' || e.key === 'O') { e.preventDefault(); openOutline(); return; }
    if (/^[1-4]$/.test(e.key)) {
      var opt = document.querySelector('.prompt .option[data-opt="' + (Number(e.key) - 1) + '"]:not([disabled])');
      if (opt) { e.preventDefault(); opt.click(); }
    }
  }

  function onSwipe() {
    var body = document.getElementById('dive-body');
    if (!body) return;
    var startX = 0, startY = 0, tracking = false;
    body.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button, a, input, textarea, select, details, summary')) return;
      startX = e.clientX; startY = e.clientY; tracking = true;
    }, { passive: true });
    body.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy) * 1.6) diveMove(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ---------------- boot ---------------- */

  function focusMain() {
    var el = screenEl.querySelector('[data-autofocus]');
    if (!el) el = screenEl.querySelector('h1');
    if (el) { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }

  function render(route) {
    app.route = route;
    app.searchMounted = false;
    closeSheet();
    if (route.name === 'wreck') {
      root.location.replace('wreck.html#/wreck/' + encodeURIComponent(route.params.lessonId) + (route.params.anchor ? '/' + encodeURIComponent(route.params.anchor) : ''));
      return;
    }
    setZone(zoneFor(route));
    if (route.name === 'title') { renderTitle(); return; }
    if (route.name === 'onboarding') { renderOnboarding(); return; }
    if (route.name === 'map') { renderMap(); return; }
    if (route.name === 'descent') { renderDescent(route); return; }
    if (route.name === 'dive') { renderDive(route); return; }
    if (route.name === 'surface') { renderSurface(route); return; }
    if (route.name === 'logbook') { renderLogbook(route); return; }
    if (route.name === 'search') { renderSearch(route); return; }
    if (route.name === 'review') { renderLogbook({ params: { tab: 'review' } }); return; }
    if (route.name === 'lounge') { renderLounge(); return; }
    renderTitle();
  }

  function boot() {
    if (!R || !P || !U || !Router || !FX) {
      screenEl.innerHTML = '<div class="empty-state"><h2>Polycodex could not start</h2><p>A required script did not load. Refresh the page.</p></div>';
      return;
    }
    document.body.insertAdjacentHTML('afterbegin', root.CodexIcons.sprite());
    P.applyPrefs();
    FX.init(P);
    try { P.importLegacy(); } catch (e) { /* a corrupt legacy store must never block the app */ }
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    P.subscribe(function () { updateHudLive(); });
    Router.start(render);
    // Load the one live unit after first paint so Continue can name the exact card.
    setTimeout(function () {
      U.load('number-shallows-ratios').then(function () {
        if (app.route && app.route.name === 'title') refreshContinue();
      }).catch(function () { /* the dive route will retry */ });
    }, 900);
    window.addEventListener('resize', function () {
      var lantern = document.getElementById('lantern');
      if (lantern && lantern.classList.contains('open')) setLantern(true);
    });
    setTimeout(function () {
      var body = document.getElementById('dive-body');
      if (body) onSwipe();
    }, 0);
    app.booted = true;
  }

  root.CodexApp = { go: navigate, render: render, continueInfo: continueInfo, booted: false, app: app };
  boot();
})(typeof window !== 'undefined' ? window : globalThis);
