/* Polycodex v10 — inline icon sprite. 16px grid, 2px strokes, currentColor.
   Nav icons always carry a text label. Icon-only controls need aria-label + title. */
(function (root) {
  'use strict';
  var P = {
    compass: '<circle cx="8" cy="8" r="6"/><path d="M10.5 5.5 9 9l-3.5 1.5L7 7z"/>',
    map: '<path d="M2 4l4-2 4 2 4-2v10l-4 2-4-2-4 2z"/><path d="M6 2v10M10 4v10"/>',
    book: '<path d="M3 3h4a2 2 0 0 1 2 2v8a2 2 0 0 0-2-2H3z"/><path d="M13 3H9a2 2 0 0 0-2 2v8a2 2 0 0 1 2-2h4z"/>',
    search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>',
    lantern: '<path d="M6 4h4l1 2v6H5V6z"/><path d="M8 2v2M6 14h4M8 12v2"/>',
    pen: '<path d="M3 13l1-4 7-7 3 3-7 7z"/><path d="M4 9l3 3"/>',
    check: '<path d="M2.5 8.5 6 12l7.5-8"/>',
    close: '<path d="M3 3l10 10M13 3 3 13"/>',
    left: '<path d="M10 3 5 8l5 5"/>',
    right: '<path d="M6 3l5 5-5 5"/>',
    down: '<path d="M3 6l5 5 5-5"/>',
    up: '<path d="M3 10l5-5 5 5"/>',
    arrow: '<path d="M3 8h9M9 4l4 4-4 4"/>',
    wave: '<path d="M1 10c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 2 4"/><path d="M1 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 2 2"/>',
    reef: '<path d="M3 14V8l3-4 3 4v6M9 14V6l3-3 2 3v8"/><path d="M1 14h14"/>',
    dive: '<path d="M8 2v9M5 8l3 3 3-3"/><path d="M2 14h12"/>',
    sound: '<path d="M3 6h3l4-3v10L6 10H3z"/><path d="M12 6c1 1 1 3 0 4"/>',
    mute: '<path d="M3 6h3l4-3v10L6 10H3z"/><path d="M11 6l3 4M14 6l-3 4"/>',
    settings: '<circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M13 3l-1.5 1.5M4.5 11.5 3 13"/>',
    user: '<circle cx="8" cy="5" r="3"/><path d="M2 15c1-4 3-5 6-5s5 1 6 5"/>',
    spark: '<path d="M8 1v4M8 11v4M1 8h4M11 8h4M3 3l2.5 2.5M10.5 10.5 13 13M13 3l-2.5 2.5M5.5 10.5 3 13"/>',
    lock: '<rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/>',
    clock: '<circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/>',
    route: '<circle cx="3" cy="12" r="1.5"/><circle cx="13" cy="4" r="1.5"/><path d="M5 12h3a3 3 0 0 0 3-3V7a3 3 0 0 1 3-3"/>',
    anchor: '<circle cx="8" cy="3" r="1.5"/><path d="M8 5v9M3 9c0 3 2 5 5 5s5-2 5-5M2 9h3M11 9h3"/>',
    plus: '<path d="M8 2v12M2 8h12"/>',
    minus: '<path d="M2 8h12"/>',
    menu: '<path d="M2 4h12M2 8h12M2 12h12"/>',
    chart: '<path d="M2 14V2M2 14h12"/><path d="M5 11V8M8 11V4M11 11V6"/>',
    flag: '<path d="M3 14V2M3 3h9l-2 3 2 3H3"/>',
    eye: '<path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/>',
    shuffle: '<path d="M2 3h3l6 10h3M2 13h3l2-3M10 3h4v3M10 6 14 3M11 10l3 3h-4"/>'
  };
  function sprite() {
    if (typeof document === 'undefined') return '';
    if (document.getElementById('cx-icons')) return '';
    var body = Object.keys(P).map(function (name) {
      return '<symbol id="i-' + name + '" viewBox="0 0 16 16">' + P[name] + '</symbol>';
    }).join('');
    return '<svg id="cx-icons" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>' + body + '</defs></svg>';
  }
  function icon(name, cls) {
    if (!P[name]) name = 'spark';
    return '<svg class="ic ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }
  root.CodexIcons = { sprite: sprite, icon: icon, has: function (n) { return !!P[n]; } };
})(typeof window !== 'undefined' ? window : globalThis);
