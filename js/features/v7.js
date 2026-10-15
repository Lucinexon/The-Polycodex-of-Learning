/* v7.js — layout tidy-ups: mobile search toggle, hide duplicate home panels, print-open details. */
(function () {
'use strict';
const $1 = (s, r) => (r || document).querySelector(s), $A = (s, r) => Array.from((r || document).querySelectorAll(s));
document.addEventListener('DOMContentLoaded', () => {
  try {
    $A('#home > .panel').forEach(p => { if ($1('#missionMap', p) || $1('.toolrow', p)) p.classList.add('v7-hide'); });
    const tools = $1('.tools');
    if (tools) {
      tools.insertAdjacentHTML('afterbegin', '<button type="button" class="tb" id="v7SearchBtn" aria-label="Search the codex" aria-expanded="false"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg></button>');
      $1('#v7SearchBtn').addEventListener('click', () => {
        const on = document.body.classList.toggle('v7-search'); $1('#v7SearchBtn').setAttribute('aria-expanded', on);
        if (on) { const i = $1('#search'); if (i) i.focus(); }
      });
      document.addEventListener('click', e => { if (document.body.classList.contains('v7-search') && !e.target.closest('.searchwrap,#v7SearchBtn')) document.body.classList.remove('v7-search'); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('v7-search'); });
    }
  } catch (e) { if (window.console) console.error('[v7]', e); }
});
window.addEventListener('beforeprint', () => $A('details').forEach(d => { d.open = true; }));
})();
