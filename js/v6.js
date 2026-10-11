/* v6.js — "Abyss" UX layer: plain-language navigation, the Descent map, a depth-aware ocean with parallax,
   a mobile tab bar, a Home button, and a calmer home board. Pure layer: no engine internals are replaced. */
(function () {
'use strict';
const $1 = (s, r) => (r || document).querySelector(s), $A = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ---- 1. plain names first (runs before the engine builds the sidebar at DOMContentLoaded) ---- */
const PLAIN = { home: ['HOME', 'Your dive board'], probes: ['PROBES', 'Hands-on expeditions'], dispatch: ['DAILY', 'Daily challenge'], lobby: ['SOCIAL', 'Lounge & chat'],
  notebook: ['NOTES', 'Vaults & shared rooms'], chrono: ['TIMELINES', 'Timelines & recall'], syslog: ['CHEAT SHEET', 'Quick reference'], flash: ['FLASHCARDS', 'Drill & master'], exam: ['BOSS FIGHT', 'The Void Warden'] };
Object.keys(PLAIN).forEach(id => { const n = NAVMAP[id]; if (n) { n.label = PLAIN[id][0]; n.sub = PLAIN[id][1]; } });

/* ---- 2. depth: every sector is a deeper ocean zone ---- */
const DEPTHS = [150, 400, 800, 1500, 2500, 4000, 5500, 7000, 9000, 11000];
const zone = m => m < 200 ? 'Sunlight zone' : m < 1000 ? 'Twilight zone' : m < 4000 ? 'Midnight zone' : m < 6000 ? 'Abyssal zone' : 'Hadal trench';
function depthNow() {
  const done = SECTORS.map(s => !!S.completed[s.id]); let reached = 0;
  SECTORS.forEach((s, i) => { if (done[i]) reached = Math.max(reached, DEPTHS[i] || 0); });
  const cur = done.indexOf(false);
  if (cur >= 0) reached += ((DEPTHS[cur] || reached) - reached) * ((typeof secPct === 'function' ? secPct(SECTORS[cur].id) : 0) / 100);
  return { m: Math.round(reached), cur: cur, ratio: Math.min(1, reached / 11000) };
}
function applyDepth() { const d = depthNow(); document.documentElement.style.setProperty('--v6-depth', d.ratio.toFixed(3)); return d; }
function renderMap() {
  const m = $1('#v6Map'); if (!m) return; const d = applyDepth();
  m.innerHTML = '<div class="v6-mh"><div><b>' + d.m.toLocaleString() + ' m</b><span>' + zone(d.m) + '</span></div><small>Clear sectors to dive deeper</small></div><ol class="v6-track">' +
    SECTORS.map((s, i) => { const done = S.completed[s.id], cur = i === d.cur;
      return '<li class="' + (done ? 'done' : cur ? 'cur' : '') + '"><button type="button" data-go="' + s.id + '" aria-label="' + esc('Sector ' + s.num + ': ' + s.label + ', ' + DEPTHS[i] + ' meters' + (done ? ', cleared' : cur ? ', current' : '')) + '">' + (cur ? '<u aria-hidden="true">🐋</u>' : '') + '<i>' + (done ? '✓' : s.num) + '</i><span>' + esc(s.label) + '</span><em>' + DEPTHS[i].toLocaleString() + ' m</em></button></li>'; }).join('') + '</ol>';
  const c = $1('.cur', m), t = $1('.v6-track', m); if (c && t) t.scrollLeft = Math.max(0, c.offsetLeft - t.clientWidth / 2 + c.offsetWidth / 2);
}

/* ---- 3. home board ---- */
function board() {
  const home = $1('#home'); if (!home || $1('#v6Board')) return; home.classList.add('v6');
  const hero = $1('.hero', home), nu = $1('#nextUp'), act = $1('#cxAct'); if (!hero) return;
  const b = document.createElement('div'); b.id = 'v6Board'; b.className = 'v6-board'; hero.insertAdjacentElement('afterend', b);
  if (nu) b.appendChild(nu); if (act) b.appendChild(act);
  b.insertAdjacentHTML('afterend', '<section class="v6-map panel" id="v6Map" aria-label="Descent map"></section>');
  hero.insertAdjacentHTML('beforeend', '<div class="hero-ask"><button type="button" class="btn" id="v6HeroAsk">✦ Ask the Guide</button></div>');
  $1('#v6HeroAsk').addEventListener('click', () => window.CodexGuide && CodexGuide.open());
  const ex = $1('.grid4', home); if (ex) ex.insertAdjacentHTML('beforebegin', '<h3 class="v6-sec">Explore</h3>');
}

/* ---- 4. mobile tab bar + Home chip ---- */
const TABS = [['home', '⌂', 'Home'], ['learn', '📖', 'Learn'], ['guide', '✦', 'Guide'], ['notebook', '✎', 'Notes'], ['lobby', '💬', 'Social']];
function bar() {
  document.body.insertAdjacentHTML('beforeend', '<nav id="v6Bar" aria-label="Main">' + TABS.map(t => '<button type="button" data-t="' + t[0] + '"' + (t[0] === 'guide' ? ' class="mid"' : '') + '><i aria-hidden="true">' + t[1] + '</i><span>' + t[2] + '</span></button>').join('') + '</nav>');
  $1('#v6Bar').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const t = b.dataset.t; if (window.sfx) sfx('click');
    if (t === 'guide') window.CodexGuide && CodexGuide.open();
    else if (t === 'learn') showScreen((SECTORS.find(x => !S.completed[x.id]) || SECTORS[0]).id);
    else showScreen(t);
  });
  const main = $1('#main'); if (main) main.insertAdjacentHTML('afterbegin', '<button type="button" id="v6Back" data-go="home" hidden>← Home</button>');
}
function mark(id) {
  $A('#v6Bar button').forEach(b => { const on = b.dataset.t === id || (b.dataset.t === 'learn' && /^sec\d+$/.test(id)); b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
  const bk = $1('#v6Back'); if (bk) bk.hidden = id === 'home';
}

/* ---- 5. depth tint + gentle parallax (GPU transforms only; off for reduced motion) ---- */
function world() {
  const oc = $1('#ocean'); if (!oc) return;
  oc.insertAdjacentHTML('afterend', '<div id="v6Tint" aria-hidden="true"></div>');
  if (REDUCED) return;
  let tx = 0, ty = 0, px = 0, py = 0, sy = 0, ra = 0;
  const step = () => { ra = 0; px += (tx - px) * .1; py += (ty + sy - py) * .1; oc.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) scale(1.07)'; if (Math.abs(tx - px) > .1 || Math.abs(ty + sy - py) > .1) ra = requestAnimationFrame(step); };
  const kick = () => { if (!ra && !document.hidden) ra = requestAnimationFrame(step); };
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; tx = -(e.clientX / innerWidth - .5) * 24; ty = -(e.clientY / innerHeight - .5) * 14; kick(); }, { passive: true });
  addEventListener('scroll', e => { const t = e.target; sy = -Math.min((t && t.scrollTop) || window.scrollY || 0, 700) * .035; kick(); }, { passive: true, capture: true });
}

function init() {
  board(); bar(); world(); renderMap(); const a = $1('.screen.active'); mark(a ? a.id : 'home');
  const _s = window.showScreen;
  window.showScreen = function (id, ns) { _s(id, ns); try { mark(id); if (id === 'home') renderMap(); else applyDepth(); } catch (e) { /* cosmetic */ } };
}
document.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { if (window.console) console.error('[v6]', e); } });
})();
