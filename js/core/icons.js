/* ==========================================================================
  THE POLYMATH CODEX — js/core/icons.js
   Hand-built duotone icon set (46 glyphs, 32×32 grid) that replaces the old
   8×8 pixel sprites. Each glyph is an SVG <symbol> in one hidden sheet and is
   instanced with <use>, so there is no per-icon image to decode and every icon
   recolours through CSS custom properties:

     --ica  primary stroke / solid      --icb  soft fill (derived, ~20% alpha)
     --icg  glow colour (drop-shadow)   --icw  stroke width (thicker when small)

   Shape classes (styled in style.css):
     .iab closed shape: soft fill + stroke     .ia  open stroke
     .ic  secondary detail stroke (softer)     .id  solid accent    .ib fill only

   API: CodexIcons.has(name) · CodexIcons.paint(el, name, px, tint)
   engine.js drawSprites() calls paint() for every [data-sprite] element.
   Glyphs are inlined (not <use>) so the class styles in style.css apply.
   ========================================================================== */
'use strict';
(function () {
  const brain = '<path class="iab" d="M15.4 6.2C14.4 4.1 10.9 3.9 9.3 6.1C6.9 6.2 5.3 8.5 6 10.6C4 12 4 14.8 5.6 16.1C4.6 18 5.7 20.5 7.9 20.9C8.2 23.3 10.9 24.5 12.9 23.3C13.7 24.7 14.5 25.5 15.4 25.7Z"/>' +
    '<path class="ic" d="M10 11.2c1.8 0 3 1.2 3 3M9 17c2 0 3.5 1.1 3.7 2.8M13.2 7.8v3"/>';

  const ICONS = {
    coin: '<circle class="iab" cx="16" cy="16" r="12"/><circle class="ic" cx="16" cy="16" r="8.4"/><path class="id" d="M16 10.6l1.6 3.4 3.7.5-2.7 2.5.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.5 3.7-.5z"/>',
    star: '<path class="iab" d="M16 3.5l3.8 7.7 8.5 1.2-6.1 6 1.4 8.5L16 22.9l-7.6 4 1.4-8.5-6.1-6 8.5-1.2z"/><path class="ic" d="M26 2.8v4.4M23.8 5h4.4"/>',
    flame: '<path class="iab" d="M16 3c.8 4.8 7.5 8 7.5 15.2A7.5 7.5 0 0 1 8.5 18.2c0-3.2 1.6-4.8 3.2-6.4.3 2.1 1.3 3.2 2.3 3.2C13.2 11 14 6.4 16 3z"/><path class="id" d="M16 25a3.2 3.2 0 0 1-3.2-3.2c0-1.8 1.6-2.8 3.2-4.7 1.6 1.9 3.2 2.9 3.2 4.7A3.2 3.2 0 0 1 16 25z"/>',
    check: '<circle class="iab" cx="16" cy="16" r="12"/><path class="ia" d="M10.2 16.6l4 4 7.8-8.6"/>',
    cross: '<circle class="iab" cx="16" cy="16" r="12"/><path class="ia" d="M11.3 11.3l9.4 9.4M20.7 11.3l-9.4 9.4"/>',
    book: '<path class="ib" opacity=".55" d="M28 7.5c-4.2-1.7-8.2-1.1-12 1.4v17.6c3.8-2.5 7.8-3.1 12-1.4z"/><path class="iab" d="M4 7.5c4.2-1.7 8.2-1.1 12 1.4 3.8-2.5 7.8-3.1 12-1.4v17.6c-4.2-1.7-8.2-1.1-12 1.4-3.8-2.5-7.8-3.1-12-1.4z"/><path class="ic" d="M16 9v17.6M7.5 12.2c2-.4 4-.2 6 .6M7.5 16.2c2-.4 4-.2 6 .6"/>',
    search: '<circle class="iab" cx="14" cy="14" r="8.6"/><path class="ia" d="M20.4 20.4L27.3 27.3" style="stroke-width:calc(var(--icw,1.7)*1.35)"/><path class="ic" d="M9.8 12.4a4.8 4.8 0 0 1 3.6-2.9"/>',
    eye: '<path class="iab" d="M2.8 16C6.2 9.8 10.8 6.8 16 6.8s9.8 3 13.2 9.2C25.8 22.2 21.2 25.2 16 25.2S6.2 22.2 2.8 16z"/><circle class="ic" cx="16" cy="16" r="5.2"/><circle class="id" cx="16" cy="16" r="2.4"/><circle cx="17.1" cy="14.9" r=".85" fill="#fff"/>',
    print: '<rect class="iab" x="4.5" y="11.5" width="23" height="10.5" rx="2.5"/><path class="ia" d="M9.5 11.5V4.5h13v7M9.5 22v5.5h13V22"/><path class="ic" d="M12.5 17.5h7"/><circle class="id" cx="23.5" cy="15" r="1.1"/>',
    trophy: '<path class="iab" d="M9 4.5h14v7.5a7 7 0 0 1-14 0z"/><path class="ia" d="M9 7.5H5v2.5a4.2 4.2 0 0 0 4.2 4.2M23 7.5h4v2.5a4.2 4.2 0 0 1-4.2 4.2M16 19v4.5M11 27.5h10M12.5 23.5h7"/><path class="id" d="M16 8l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.2-2 1.2.4-2.3-1.7-1.6 2.3-.3z"/>',
    trash: '<path class="iab" d="M7.5 10h17l-1.5 16a2 2 0 0 1-2 1.8h-10a2 2 0 0 1-2-1.8z"/><path class="ia" d="M4.5 10h23M12 10V7a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 20 7v3"/><path class="ic" d="M13.5 14v9M18.5 14v9"/>',
    qblock: '<rect class="iab" x="5" y="5" width="22" height="22" rx="5.5"/><path class="ia" d="M12.4 12.6a3.7 3.7 0 1 1 5.6 3.2c-1.3.8-2 1.5-2 2.9"/><circle class="id" cx="16" cy="22.4" r="1.5"/>',
    shield: '<path class="iab" d="M16 3.5l10 3.8v7.2c0 6.4-4.3 10.7-10 14-5.7-3.3-10-7.6-10-14V7.3z"/><path class="ic" d="M11.5 15.5l3.2 3.2 6-6.5"/>',
    chart: '<path class="ia" d="M5 4.5v22.5h22.5"/><rect class="iab" x="9.5" y="16.5" width="4.5" height="7.5" rx="1"/><rect class="iab" x="16" y="11" width="4.5" height="13" rx="1"/><rect class="iab" x="22.5" y="6.5" width="4.5" height="17.5" rx="1"/>',
    doc: '<path class="iab" d="M8 3.5h11l6 6V28.5H8z"/><path class="ia" d="M19 3.5v6h6"/><path class="ic" d="M12 15h9M12 19h9M12 23h5.5"/>',
    bolt: '<path class="iab" d="M18.5 2.8L6.5 18.2h8l-2 11 13-16.4h-8.5z"/>',
    target: '<circle class="ia" cx="16" cy="16" r="11.5"/><circle class="iab" cx="16" cy="16" r="7"/><circle class="id" cx="16" cy="16" r="2.6"/><path class="ic" d="M16 1.5v5M16 25.5v5M1.5 16h5M25.5 16h5"/>',
    bag: '<path class="iab" d="M7 10h18l1.6 15.5a2.4 2.4 0 0 1-2.4 2.7H7.8a2.4 2.4 0 0 1-2.4-2.7z"/><path class="ia" d="M11.5 14V9.5a4.5 4.5 0 0 1 9 0V14"/><circle class="id" cx="16" cy="19.5" r="1.7"/>',
    building: '<path class="iab" d="M3.5 12L16 5l12.5 7z"/><path class="ia" d="M6 12v11M11.5 12v11M20.5 12v11M26 12v11M4.5 23h23M2.5 27.5h27"/><path class="ic" d="M16 12v11"/>',
    speech: '<path class="iab" d="M6 5.5h20a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5H14l-6.5 5.5V21.5H6a2.5 2.5 0 0 1-2.5-2.5V8A2.5 2.5 0 0 1 6 5.5z"/><path class="ic" d="M9.5 11h13M9.5 15.5h8"/>',
    calendar: '<rect class="iab" x="4" y="6.5" width="24" height="21.5" rx="3.2"/><path class="ia" d="M4 12.8h24M10.5 3.8v5.4M21.5 3.8v5.4"/><rect class="id" x="8.5" y="17" width="4" height="4" rx="1"/><rect class="ic" x="14" y="17" width="4" height="4" rx="1"/><rect class="ic" x="19.5" y="17" width="4" height="4" rx="1"/>',
    cards: '<g transform="rotate(-13 12 18)"><rect class="iab" x="4.5" y="7" width="15" height="20" rx="2.6" opacity=".55"/></g><g transform="rotate(9 21 16)"><rect class="iab" x="13" y="5" width="15" height="21" rx="2.6"/><path class="id" d="M20.5 10.4l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z"/></g>',
    bulb: '<path class="iab" d="M16 3.5a8.6 8.6 0 0 0-5.2 15.5c.9.7 1.4 1.7 1.4 2.9V23h7.6v-1.1c0-1.2.5-2.2 1.4-2.9A8.6 8.6 0 0 0 16 3.5z"/><path class="ia" d="M12.5 26.2h7M14 29h4"/><path class="ic" d="M13 13.5l3 3.2 3-3.2M16 16.7V23"/>',
    sfx: '<path class="iab" d="M4.5 12.2h5l7.5-6v19.6l-7.5-6h-5z"/><path class="ic" d="M21.5 11.8a6.4 6.4 0 0 1 0 8.4M25 8.2a11.2 11.2 0 0 1 0 15.6"/>',
    net: '<circle class="iab" cx="16" cy="16" r="12"/><ellipse class="ic" cx="16" cy="16" rx="5.2" ry="12"/><path class="ic" d="M4 16h24M5.8 10.2h20.4M5.8 21.8h20.4"/>',
    brain: '<g>' + brain + '</g><g transform="translate(32 0) scale(-1 1)">' + brain + '</g>',
    gamepad: '<path class="iab" d="M9.5 9h13c3.5 0 6 3.5 6.7 8l.6 4.5c.4 2.7-2 4.5-4 3L21 22.5H11L7.2 24.5c-2 1.5-4.4-.3-4-3l.6-4.5C4.5 12.5 6 9 9.5 9z"/><path class="ic" d="M10 13v6M7 16h6"/><circle class="id" cx="21" cy="14.5" r="1.4"/><circle class="id" cx="24" cy="17.5" r="1.4"/>',
    atom: '<g class="ia"><ellipse cx="16" cy="16" rx="13" ry="5"/><ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(60 16 16)"/><ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(120 16 16)"/></g><circle class="iab" cx="16" cy="16" r="3"/><circle class="id" cx="29" cy="16" r="1.5"/><circle class="id" cx="9.5" cy="27.2" r="1.5"/>',
    cube: '<path class="iab" d="M16 3.5l11 6v13l-11 6-11-6v-13z"/><path class="ic" d="M5 9.5l11 6 11-6M16 15.5v13"/>',
    dice: '<rect class="iab" x="4.5" y="4.5" width="23" height="23" rx="5.5"/><circle class="id" cx="11" cy="11" r="1.9"/><circle class="id" cx="21" cy="11" r="1.9"/><circle class="id" cx="16" cy="16" r="1.9"/><circle class="id" cx="11" cy="21" r="1.9"/><circle class="id" cx="21" cy="21" r="1.9"/>',
    key: '<circle class="iab" cx="10.5" cy="11.5" r="6.5"/><circle class="id" cx="10.5" cy="11.5" r="1.9"/><path class="ia" d="M15.2 16.2L27.5 28.5M22 23l3.2-3.2M25 26l2.6-2.6"/>',
    crown: '<path class="iab" d="M3.8 11l6 5.8L16 5.5l6.2 11.3 6-5.8-2.2 15.2H6z"/><path class="ic" d="M6.8 22.5h18.4"/><circle class="id" cx="3.8" cy="10.5" r="1.5"/><circle class="id" cx="16" cy="4.8" r="1.5"/><circle class="id" cx="28.2" cy="10.5" r="1.5"/>',
    power: '<circle class="ib" cx="16" cy="17" r="9.5"/><path class="ia" d="M9.4 8.9a11.4 11.4 0 1 0 13.2 0M16 3.8v11.4"/>',
    moon: '<path class="iab" d="M25 20.3A11.3 11.3 0 0 1 11.7 7.1a11.3 11.3 0 1 0 13.3 13.2z"/><circle class="id" cx="23.5" cy="8.5" r="1.3"/><path class="ic" d="M27 14.5v3M25.5 16h3"/>',
    hour: '<path class="iab" d="M9 4.5h14v4.4c0 3-3.2 5.1-7 7.1 3.8 2 7 4.1 7 7.1v4.4H9v-4.4c0-3 3.2-5.1 7-7.1-3.8-2-7-4.1-7-7.1z"/><path class="ia" d="M7 4.5h18M7 27.5h18"/><path class="id" d="M12.4 25h7.2l-2.6-3.4h-2z"/>',
    music: '<path class="ia" d="M12.5 23.5V7.5l14-3v16"/><path class="ic" d="M12.5 12l14-3"/><ellipse class="iab" cx="9.2" cy="23.8" rx="3.7" ry="3.1"/><ellipse class="iab" cx="23.2" cy="20.8" rx="3.7" ry="3.1"/>',
    radar: '<circle class="iab" cx="16" cy="16" r="12"/><circle class="ic" cx="16" cy="16" r="7.2"/><path d="M16 16V4A12 12 0 0 1 26.4 10z" style="fill:var(--ica);opacity:.28"/><path class="ia" d="M16 16L26.4 10"/><circle class="id" cx="21.5" cy="21" r="1.6"/><circle class="id" cx="11" cy="12" r="1.2"/>',
    antenna: '<path class="ia" d="M16 14.5V28M10.5 28.5h11M12.3 22l3.7-7.5 3.7 7.5"/><circle class="iab" cx="16" cy="11.5" r="2.4"/><path class="ic" d="M10.6 6.4a7.6 7.6 0 0 0 0 10.2M21.4 6.4a7.6 7.6 0 0 1 0 10.2M6.8 3.2a12.6 12.6 0 0 0 0 16.6M25.2 3.2a12.6 12.6 0 0 1 0 16.6"/>',
    gear: '<circle cx="16" cy="16" r="12" style="fill:none;stroke:var(--ica);stroke-width:4.2;stroke-dasharray:3.14 3.14"/><circle class="iab" cx="16" cy="16" r="9.6"/><circle class="ic" cx="16" cy="16" r="3.8"/>',
    battery: '<rect class="iab" x="3.5" y="9.5" width="21" height="13" rx="3"/><path class="ia" d="M27.5 13.5v5"/><rect class="id" x="6.5" y="12.5" width="9" height="7" rx="1.2"/>',
    cpu: '<rect class="iab" x="8" y="8" width="16" height="16" rx="3"/><rect class="ic" x="12" y="12" width="8" height="8" rx="1.5"/><path class="ia" d="M12 4v4M16 4v4M20 4v4M12 24v4M16 24v4M20 24v4M4 12h4M4 16h4M4 20h4M24 12h4M24 16h4M24 20h4"/>',
    database: '<path class="ib" d="M5 8v16c0 2.2 4.9 4 11 4s11-1.8 11-4V8c0 2.2-4.9 4-11 4S5 10.2 5 8z"/><ellipse class="ia" cx="16" cy="8" rx="11" ry="4"/><path class="ia" d="M5 8v16c0 2.2 4.9 4 11 4s11-1.8 11-4V8"/><path class="ic" d="M5 16c0 2.2 4.9 4 11 4s11-1.8 11-4"/>',
    lock: '<rect class="iab" x="6" y="14" width="20" height="14" rx="3"/><path class="ia" d="M10.5 14V10a5.5 5.5 0 0 1 11 0v4"/><circle class="id" cx="16" cy="20.5" r="2"/>',
    sun: '<circle class="iab" cx="16" cy="16" r="6"/><path class="ia" d="M16 3.5v4M16 24.5v4M3.5 16h4M24.5 16h4M7.2 7.2l2.8 2.8M22 22l2.8 2.8M24.8 7.2L22 10M10 22l-2.8 2.8"/>',
    edit: '<path class="iab" d="M5 27l1.4-6.6L21.5 5.3a2.4 2.4 0 0 1 3.4 0l1.8 1.8a2.4 2.4 0 0 1 0 3.4L11.6 25.6z"/><path class="ic" d="M18.5 8.3l5.2 5.2M6.4 20.4l5.2 5.2"/>',
    plus: '<circle class="iab" cx="16" cy="16" r="12"/><path class="ia" d="M16 10.5v11M10.5 16h11"/>',
    sidebar: '<rect class="iab" x="4" y="5.5" width="24" height="21" rx="3.5"/><path class="ia" d="M12.5 5.5v21"/><path class="ic" d="M7.2 11h2.6M7.2 15h2.6M7.2 19h2.6"/>',
    columns: '<rect class="iab" x="4" y="5.5" width="24" height="21" rx="3.5"/><path class="ia" d="M16 5.5v21"/>',
    dots: '<circle class="id" cx="7" cy="16" r="2.4"/><circle class="id" cx="16" cy="16" r="2.4"/><circle class="id" cx="25" cy="16" r="2.4"/>',
    link: '<path class="ia" d="M13.5 18.5a5 5 0 0 0 7.1 0l4-4a5 5 0 0 0-7.1-7.1l-1.2 1.2M18.5 13.5a5 5 0 0 0-7.1 0l-4 4a5 5 0 0 0 7.1 7.1l1.2-1.2"/>',
    users: '<circle class="iab" cx="12" cy="11" r="4.8"/><path class="iab" d="M3.5 26c0-5 3.8-8.4 8.5-8.4s8.5 3.4 8.5 8.4z"/><path class="ic" d="M21 6.8a4.6 4.6 0 0 1 0 8.6M23.5 18.2c2.6.9 4.6 3.4 4.6 7.2"/>',
    user: '<path class="iab" d="M5.5 28c0-6 4.7-10 10.5-10s10.5 4 10.5 10z"/><circle class="iab" cx="16" cy="11" r="5.5"/>'
  };
  const ALIAS = { globe: 'net', zap: 'bolt', x: 'cross' };
  const WARM = '#ffd27d', CYAN = '#8fe3fb', VIO = '#c4b8ff', CORAL = '#ff9aa6', MINT = '#6cf5c0';
  const COL = {
    _: CYAN,
    coin: WARM, star: WARM, bolt: WARM, crown: WARM, trophy: WARM, key: WARM, bag: WARM, qblock: WARM, hour: WARM, bulb: WARM, sun: WARM, lock: WARM,
    flame: '#ffa27d', check: MINT, battery: MINT, radar: MINT, cross: CORAL, trash: CORAL, target: CORAL,
    brain: VIO, gamepad: VIO, moon: '#cfe3ff', music: '#ff9ad6'
  };

  function rgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return 'rgba(95,208,238,' + a + ')';
    const n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function resolve(name) { return ICONS[name] ? name : (ALIAS[name] && ICONS[ALIAS[name]] ? ALIAS[name] : null); }

  /* hidden sheet with every symbol, injected once */
  function mount() {
    if (document.getElementById('codexIconSheet')) return;
    const sheet = '<svg id="codexIconSheet" xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">' +
      Object.keys(ICONS).map(function (k) { return '<symbol id="ic-' + k + '" viewBox="0 0 32 32">' + ICONS[k] + '</symbol>'; }).join('') + '</svg>';
    document.body.insertAdjacentHTML('afterbegin', sheet);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  window.CodexIcons = {
    names: Object.keys(ICONS),
    has: function (name) { return !!resolve(name); },
    paint: function (el, name, px, tint) {
      const key = resolve(name); if (!key) return false;
      const A = tint || COL[key] || COL._;
      /* Inline the glyph. <use href="#id"> clones into a closed shadow tree,
         so the .ia/.iab rules in style.css never apply and every shape falls
         back to SVG's default fill (solid black). */
      el.innerHTML = '<svg viewBox="0 0 32 32" focusable="false" aria-hidden="true">' + ICONS[key] + '</svg>';
      const s = el.style;
      s.width = px + 'px'; s.height = px + 'px';
      s.setProperty('--ica', A);
      s.setProperty('--icb', rgba(A, 0.2));
      s.setProperty('--icg', rgba(A, px >= 28 ? 0.6 : 0.5));
      s.setProperty('--icr', (px >= 28 ? 5 : px >= 18 ? 3.5 : 2.5) + 'px');
      s.setProperty('--icw', px <= 14 ? 2.7 : px <= 20 ? 2.3 : px <= 28 ? 1.95 : 1.7);
      return true;
    }
  };
})();
