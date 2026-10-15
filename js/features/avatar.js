/* avatar.js — V7 avatar studio. Layered vector sprites (64×64): 14 skins · 5 heads · 22 hairstyles × 16 colours · 12 eyes · 6 brows ·
   10 mouths · 18 outfits × 16 colours · 18 hats · 16 extras · 16 backdrops · 14 companions · 6 auras · 8 frames.
   API: CodexAvatar.{svg,el,img,mine,set,edit,forName,random,parse,enc,pet} — a code is a short dotted string, safe to put in chat/presence. */
(function () {
'use strict';
const SK = ['#ffdfc4', '#f5c9a6', '#e8b48a', '#d99a6c', '#c4825a', '#a96844', '#8a5233', '#6b3e26', '#4f2c1a', '#f7d3e0', '#c9e7f2', '#bff2d6', '#d9c9ff', '#9ad1ff'];
const PAL = ['#1b1b22', '#3a2a20', '#5c3b24', '#8a5a2b', '#c98f3f', '#e8c372', '#f4e9c8', '#c94c4c', '#ff7ec9', '#a99cff', '#5fd0ee', '#46f0c4', '#9ad66b', '#e8eef2', '#7a8794', '#ff9a3c'];
const sh = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * (1 - k)))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join(''); };
const P = (d, f, x) => '<path d="' + d + '" fill="' + f + '"' + (x ? ' ' + x : '') + '/>', C = (x, y, r, f, o) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"' + (o ? ' opacity="' + o + '"' : '') + '/>', R = (x, y, w, h, f, rx) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" fill="' + f + '"/>';
const L = (d, s, w, x) => '<path d="' + d + '" fill="none" stroke="' + s + '" stroke-width="' + (w || 1.4) + '" stroke-linecap="round" stroke-linejoin="round" ' + (x || '') + '/>';
const INK = '#14171f';

/* ---- heads (skin → ears + head) ---- */
const HEADS = [
  s => C(19.6, 28, 2.8, sh(s, .1)) + C(44.4, 28, 2.8, sh(s, .1)) + '<ellipse cx="32" cy="27" rx="12.5" ry="13.5" fill="' + s + '"/>',
  s => C(20.4, 28, 2.6, sh(s, .1)) + C(43.6, 28, 2.6, sh(s, .1)) + '<ellipse cx="32" cy="27.5" rx="11.5" ry="14.5" fill="' + s + '"/>',
  s => C(18.6, 28, 3, sh(s, .1)) + C(45.4, 28, 3, sh(s, .1)) + '<ellipse cx="32" cy="27.5" rx="13.5" ry="12.5" fill="' + s + '"/>',
  s => C(19.6, 28, 2.8, sh(s, .1)) + C(44.4, 28, 2.8, sh(s, .1)) + R(19.5, 14, 25, 26, s, 9),
  s => P('M19.6 24L14 21L19.8 30Z', sh(s, .1)) + P('M44.4 24L50 21L44.2 30Z', sh(s, .1)) + P('M20 22C20 14 26 13 32 13S44 14 44 22C44 32 38 41 32 41S20 32 20 22Z', s)
];
/* ---- hair: [back, front] ---- */
const cap = (c, t, o) => P('M19.5 26C19.5 ' + (t + 3) + ' 27 ' + t + ' 32 ' + t + 'S44.5 ' + (t + 3) + ' 44.5 26C41 21 37 19 32 19S23 21 19.5 26Z', c, o ? 'opacity="' + o + '"' : '');
const longB = (c, n) => P('M18.5 22C16 ' + (22 + n) + ' 19 ' + (28 + n) + ' 24 ' + (30 + n) + 'L40 ' + (30 + n) + 'C45 ' + (28 + n) + ' 48 ' + (22 + n) + ' 45.5 22C46 12 39 8 32 8S18 12 18.5 22Z', c);
const puffs = (c, r, pts) => pts.map(p => C(p[0], p[1], r, c)).join('');
const spikes = (c, xs, h) => xs.map(x => P('M' + (x - 3.5) + ' 17L' + x + ' ' + (17 - h) + 'L' + (x + 3.5) + ' 17Z', c)).join('');
const bang = (c, d) => P(d, c);
const H = [
  c => ['', ''],
  c => ['', cap(c, 11)],
  c => ['', cap(c, 12.5, .8)],
  c => ['', cap(c, 11) + bang(c, 'M26 19C33 19 39 17 44 21L44 24C38 20 32 22 26 24Z')],
  c => ['', puffs(c, 4.6, [[22, 15], [28, 12], [36, 12], [42, 15], [19, 21], [45, 21]]) + cap(c, 14)],
  c => [C(32, 22, 17.5, c), cap(c, 11)],
  c => [longB(c, 14), cap(c, 11)],
  c => [longB(c, 4), cap(c, 11) + bang(c, 'M21 24C26 20 38 20 43 24L43 19C37 16 27 16 21 19Z')],
  c => [P('M44 18C54 20 56 36 50 46C48 40 46 32 44 26Z', c) + longB(c, -6), cap(c, 11)],
  c => [puffs(c, 5.5, [[20, 12], [44, 12]]), cap(c, 11)],
  c => ['', P('M29 19L30 8L34 8L35 19Z', c) + P('M20 25C22 19 28 18 32 18S42 19 44 25C41 22 37 20 32 20S23 22 20 25Z', c, 'opacity=".5"')],
  c => ['', spikes(c, [24, 32, 40], 8) + cap(c, 13)],
  c => ['', P('M20 25C20 15 26 12 32 12S44 15 44 25C42 19 38 18 32 18S22 19 20 25Z', c)],
  c => [longB(c, 10) + L('M22 40L22 52M42 40L42 52', c, 2.6), cap(c, 11)],
  c => ['', cap(c, 10) + puffs(c, 3.2, [[21, 18], [27, 13], [37, 13], [43, 18], [32, 11]])],
  c => ['', cap(c, 11) + bang(c, 'M22 26C22 20 26 17 31 17L29 25L25 28Z') + bang(c, 'M42 26C42 20 38 17 33 17L35 25L39 28Z')],
  c => [C(32, 7.5, 5, c), cap(c, 11)],
  c => [P('M19 22C12 24 11 36 15 42C16 36 18 30 20 26Z', c) + P('M45 22C52 24 53 36 49 42C48 36 46 30 44 26Z', c), cap(c, 11)],
  c => [longB(c, 8), cap(c, 11) + L('M21 24C24 21 28 22 31 20M33 20C36 22 40 21 43 24', sh(c, .25), 1)],
  c => ['', P('M19.5 28C18 14 26 11 32 11S46 14 44.5 28L44 22C38 17 26 17 20 22Z', c) + R(19.5, 20, 25, 3, sh(c, .2))],
  c => ['', cap(c, 12) + bang(c, 'M25 20C31 18 38 17 44 22L40 21C36 20 30 21 25 24Z') + bang(c, 'M44 24L50 18L46 30Z')],
  c => [longB(c, 6) + P('M20 38L16 50L24 44Z', c), cap(c, 11)]
];
/* ---- eyes (x, side) ---- */
const E = [
  x => C(x, 27, 1.9, INK),
  x => '<ellipse cx="' + x + '" cy="27" rx="2.4" ry="2.8" fill="#fff"/>' + C(x, 27.4, 1.6, INK),
  x => L('M' + (x - 2.4) + ' 27.6Q' + x + ' 24.8 ' + (x + 2.4) + ' 27.6', INK, 1.6),
  x => L('M' + (x - 2.4) + ' 26.6Q' + x + ' 29.4 ' + (x + 2.4) + ' 26.6', INK, 1.6),
  x => P('M' + x + ' 24.4L' + (x + 1) + ' 26.4L' + (x + 3) + ' 26.6L' + (x + 1.4) + ' 28L' + (x + 1.9) + ' 30L' + x + ' 29L' + (x - 1.9) + ' 30L' + (x - 1.4) + ' 28L' + (x - 3) + ' 26.6L' + (x - 1) + ' 26.4Z', '#ffc874'),
  x => P('M' + x + ' 30C' + (x - 5) + ' 26 ' + (x - 2) + ' 23.6 ' + x + ' 26C' + (x + 2) + ' 23.6 ' + (x + 5) + ' 26 ' + x + ' 30Z', '#ff5f8f'),
  x => C(x, 27, 2.6, INK) + C(x + .9, 26, .9, '#fff') + C(x - .8, 28, .5, '#fff'),
  (x, s) => s > 0 ? L('M' + (x - 2.4) + ' 27.4L' + (x + 2.4) + ' 27.4', INK, 1.7) : C(x, 27, 1.9, INK),
  x => '<ellipse cx="' + x + '" cy="27" rx="2.4" ry="2.8" fill="#ffd166"/><rect x="' + (x - .5) + '" y="24.4" width="1" height="5.2" fill="' + INK + '"/>',
  x => '<ellipse cx="' + x + '" cy="27" rx="3.1" ry="3.4" fill="#fff"/>' + C(x, 27.4, 2, INK) + C(x + .8, 26.4, .7, '#fff'),
  (x, s) => L('M' + (x - 2.6) + ' ' + (26 - s * 1.2) + 'L' + (x + 2.6) + ' ' + (26 + s * 1.2), INK, 1.6) + C(x, 28.2, 1.2, INK),
  x => L('M' + (x - 2) + ' 25.2L' + (x + 2) + ' 29M' + (x + 2) + ' 25.2L' + (x - 2) + ' 29', INK, 1.5)
];
const B = [() => '', x => L('M' + (x - 3) + ' 22.6L' + (x + 3) + ' 22.6', INK, 1.4), (x, s) => L('M' + (x - 3) + ' 23.4Q' + x + ' 20.8 ' + (x + 3) + ' 23.4', INK, 1.4), (x, s) => L('M' + (x - 3) + ' ' + (22 - s * .1) + 'L' + (x + 3) + ' ' + (23.6 + s * 1.2), INK, 1.5), (x, s) => L('M' + (x - 3) + ' ' + (23.2 + s * 1) + 'L' + (x + 3) + ' 22', INK, 1.4), x => L('M' + (x - 3.2) + ' 22.8L' + (x + 3.2) + ' 22.8', INK, 2.6)];
/* ---- mouths ---- */
const M = [
  () => L('M28.4 33.4Q32 36.4 35.6 33.4', INK, 1.5),
  () => '<path d="M27.6 32.6Q32 38 36.4 32.6Z" fill="#fff" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/>',
  () => '<ellipse cx="32" cy="34.2" rx="2.8" ry="3.2" fill="#7a1f33"/>',
  () => L('M29 34L35 34', INK, 1.5),
  () => L('M28.6 34.4Q32 35.6 36 32.6', INK, 1.5),
  () => L('M28.4 33.4Q32 36.4 35.6 33.4', INK, 1.5) + P('M31 35.2Q32 39 33 35.2Z', '#ff7a93'),
  () => '<circle cx="32" cy="34.4" r="1.9" fill="#7a1f33"/>',
  () => L('M27.6 33Q30 36 32 33Q34 36 36.4 33', INK, 1.4),
  () => L('M28.4 33.4Q32 36.4 35.6 33.4', INK, 1.5) + P('M29.6 34.6L30.6 37L31.6 35Z', '#fff') + P('M32.4 35L33.4 37L34.4 34.6Z', '#fff'),
  () => '<path d="M27.6 32.6Q32 38 36.4 32.6Z" fill="#fff" stroke="' + INK + '" stroke-width="1.2"/>' + L('M29.6 33.4L29.6 35.4M32 34L32 36.2M34.4 33.4L34.4 35.4', '#8aa', .8)
];
/* ---- outfits (colour, skin) ---- */
const TORSO = c => P('M9 64C9 52 15 44.5 25 43.5L32 47.5L39 43.5C49 44.5 55 52 55 64Z', c);
const OUT = [
  c => TORSO(c) + L('M25 43.5L32 47.5L39 43.5', sh(c, .3), 1.4),
  c => TORSO(c) + P('M24 43.6C24 49 40 49 40 43.6L36 44.4C34 47 30 47 28 44.4Z', sh(c, .25)) + L('M29 47L28.4 55M35 47L35.6 55', sh(c, .4), 1.2),
  c => TORSO('#f4f8fb') + P('M25 43.5L32 56L27 56Z', '#dfe8ee') + P('M39 43.5L32 56L37 56Z', '#dfe8ee') + R(40, 54, 8, 6, '#dfe8ee', 1) + C(46, 50, 1.3, c),
  c => TORSO('#e8f1f6') + '<ellipse cx="32" cy="44.6" rx="10" ry="3" fill="none" stroke="' + c + '" stroke-width="3"/>' + R(26, 53, 12, 6, sh(c, .1), 1.5) + C(29, 56, 1, '#fff') + C(35, 56, 1, '#ffc874'),
  c => P('M4 64C6 50 14 44 25 43L32 47L39 43C50 44 58 50 60 64Z', sh(c, .35)) + TORSO(c) + C(32, 46, 2.2, '#ffc874'),
  c => TORSO(c) + P('M25 43.5L32 56L39 43.5L36 43L32 50L28 43Z', '#f5eefc') + R(24, 56, 16, 3, '#ffd166'),
  c => TORSO('#9aa7b2') + P('M25 43.5L32 47.5L39 43.5L36 52L28 52Z', '#cfd8de') + C(19, 47, 4.4, '#7b8995') + C(45, 47, 4.4, '#7b8995') + L('M32 47.5L32 64', '#6b7882', 1.2),
  c => TORSO('#1b1b22') + P('M25 43.5L32 56L39 43.5L36 43L32 49L28 43Z', '#fff') + P('M30 48L32 51L34 48L32 46Z', c),
  c => P('M12 64C14 50 20 44 25 43.5L32 47L39 43.5C44 44 50 50 52 64Z', c) + L('M32 47L32 64', sh(c, .3), 1.2) + P('M25 43.5L32 52L39 43.5', sh(c, .2), 'opacity=".6"'),
  c => TORSO('#3b7bd8') + P('M24 43.6L24 56L40 56L40 43.6L36 44.6L36 50L28 50L28 44.6Z', c) + C(28, 51.5, 1, '#ffc874') + C(36, 51.5, 1, '#ffc874'),
  c => TORSO('#f5f7fa') + P('M25 43.5L32 54L39 43.5L36 43L32 48L28 43Z', c) + P('M32 54L28 64L36 64Z', c, 'opacity=".9"'),
  c => TORSO(c) + R(22, 48, 20, 8, sh(c, .25), 4) + L('M26 52L38 52', '#fff', 1) + C(32, 44.8, 2.6, sh(c, .35)),
  c => TORSO(c) + L('M32 47.5L32 64', '#e8eef2', 1.4) + P('M26 50L30 50L30 56L26 56Z', sh(c, .2)),
  c => P('M9 64C9 52 15 44.5 25 43.5L32 48L39 43.5C49 44.5 55 52 55 64Z', c) + P('M22 64L28 46L32 50L36 46L42 64Z', sh(c, .22)) + R(29, 52, 6, 12, '#ffd166', 1),
  c => TORSO('#26323d') + P('M25 43.5L32 47.5L39 43.5L42 50C36 56 28 56 22 50Z', c, 'opacity=".9"'),
  c => TORSO(c) + P('M32 49L34 53L38 53.4L35 56.2L36 60L32 58L28 60L29 56.2L26 53.4L30 53Z', '#ffe29a'),
  c => TORSO(c) + R(9, 54, 46, 3.4, '#fff') + R(9, 59, 46, 3.4, '#fff') + L('M25 43.5L32 47.5L39 43.5', '#fff', 1.6),
  c => P('M7 64C9 50 17 44 25 43.5L32 47L39 43.5C47 44 55 50 57 64Z', c) + L('M16 48C22 54 42 54 48 48', sh(c, .3), 1.2) + L('M32 47L32 64', sh(c, .3), 1)
];
/* ---- hats (accent colour) ---- */
const T = [
  () => '',
  c => P('M19.5 21C19.5 9 26 6 32 6S44.5 9 44.5 21Z', c) + R(18.6, 19.4, 26.8, 4.4, sh(c, .22), 2) + C(32, 5.4, 2.2, sh(c, .3)),
  c => P('M19.5 21C19.5 10 26 8 32 8S44.5 10 44.5 21Z', c) + P('M44 20L56 22L44 24Z', sh(c, .25)),
  c => P('M19 21C19 10 25 9 32 9S45 10 45 21Z', c) + '<ellipse cx="32" cy="21" rx="16" ry="3.4" fill="' + sh(c, .2) + '"/>',
  c => P('M32 -4L22 20L42 20Z', c) + '<ellipse cx="32" cy="20.4" rx="15" ry="3" fill="' + sh(c, .25) + '"/>' + C(33, 8, 1.4, '#ffe29a'),
  c => P('M20 19L21 8L26 14L32 6L38 14L43 8L44 19Z', '#ffd166') + C(26, 12, 1.2, '#ff5f8f') + C(32, 10, 1.4, '#5fd0ee') + C(38, 12, 1.2, '#46f0c4'),
  c => R(21, 3, 22, 16, '#1b1b22') + R(21, 14, 22, 3.4, c) + '<ellipse cx="32" cy="19.6" rx="15" ry="3" fill="#1b1b22"/>',
  c => P('M17 20C17 10 27 8 36 9C44 10 48 14 47 20C42 16 24 15 17 20Z', c) + C(34, 8, 1.6, sh(c, .3)),
  c => P('M20 20L21 6L28 14Z', c) + P('M44 20L43 6L36 14Z', c) + P('M22 15L22.6 10L26 14Z', '#ffb0c8'),
  c => '<ellipse cx="25" cy="6" rx="3" ry="8" fill="' + c + '"/><ellipse cx="39" cy="6" rx="3" ry="8" fill="' + c + '"/><ellipse cx="25" cy="7" rx="1.4" ry="5.4" fill="#ffb0c8"/><ellipse cx="39" cy="7" rx="1.4" ry="5.4" fill="#ffb0c8"/>',
  c => L('M24 16L21 6M21 6L16 4M21 6L22 1M40 16L43 6M43 6L48 4M43 6L42 1', '#a9774b', 2.2),
  () => '<ellipse cx="32" cy="7" rx="11" ry="3.2" fill="none" stroke="#ffe29a" stroke-width="2.2"/>',
  c => P('M32 -2L24 20L40 20Z', c) + C(32, -2, 2, '#fff') + L('M27 12L37 12M25.6 16L38.4 16', '#fff', 1.2),
  c => '<ellipse cx="32" cy="20" rx="18" ry="16" fill="#7fb0c0" opacity=".25" stroke="#cfeaf2" stroke-width="2"/>' + R(26, 4, 12, 3, '#cfd8de', 1.4),
  c => P('M18 21C18 12 26 10 32 10S46 12 46 21Z', '#1b1b22') + P('M32 12C28 12 26 14 26 16C26 18 28 19 32 19C36 19 38 18 38 16C38 14 36 12 32 12Z', '#fff', 'opacity=".9"') + L('M29 14L35 18M35 14L29 18', '#1b1b22', 1),
  c => R(19.5, 17.6, 25, 4, c, 2) + C(40, 19.6, 2.4, sh(c, .3)),
  c => '<g>' + C(22, 11, 3, '#ff7ec9') + C(22, 11, 1.2, '#ffe29a') + C(27, 8, 2.6, '#a99cff') + C(27, 8, 1, '#ffe29a') + P('M22 13Q25 17 30 12', '#46c06b', 'opacity=".9"') + '</g>',
  c => L('M20 20C18 12 22 7 28 6M44 20C46 12 42 7 36 6', '#7fc060', 2) + P('M22 12Q19 10 18 12Q21 14 22 12Z', '#7fc060') + P('M42 12Q45 10 46 12Q43 14 42 12Z', '#7fc060') + P('M26 7Q25 4 28 4Q29 6 28 7Z', '#7fc060')
];
/* ---- extras ---- */
const X = [
  () => '',
  () => L('M21 27H43', INK, 1.1) + '<circle cx="26.5" cy="27" r="4.4" fill="#cfeaf2" opacity=".25" stroke="' + INK + '" stroke-width="1.3"/><circle cx="37.5" cy="27" r="4.4" fill="#cfeaf2" opacity=".25" stroke="' + INK + '" stroke-width="1.3"/>',
  () => R(21, 24.6, 22, 6, '#14171f', 2.4) + L('M23 26L27 26', '#7fe9ff', 1.1),
  () => '<circle cx="37.5" cy="27" r="4.6" fill="#cfeaf2" opacity=".3" stroke="#d6a84a" stroke-width="1.3"/>' + L('M41 31Q43 36 42 40', '#d6a84a', .9),
  () => P('M22 23L31 31L29 33L20 25Z', INK) + L('M20 22L44 33', INK, .9),
  () => P('M24 31.6C24 38 40 38 40 31.6Q32 33.4 24 31.6Z', '#cfeaf2') + L('M21 29L24 31.6M43 29L40 31.6', '#cfeaf2', .9),
  () => L('M18 26C18 8 46 8 46 26', '#2a2f3a', 2.4) + R(15, 24, 6, 9, '#3a4150', 2.6) + R(43, 24, 6, 9, '#3a4150', 2.6),
  () => C(19.6, 34, 1.5, '#ffd166') + C(44.4, 34, 1.5, '#ffd166') + L('M19.6 35.6L19.6 38', '#ffd166', .9),
  () => L('M37 22L40 30', '#c0636b', 1.1),
  () => C(25, 31, .5, sh('#d99a6c', .2)) + C(27, 32, .5, '#a9683f') + C(24, 33, .5, '#a9683f') + C(39, 31, .5, '#a9683f') + C(37, 32, .5, '#a9683f') + C(40, 33, .5, '#a9683f'),
  () => '<ellipse cx="23.4" cy="31.4" rx="2.8" ry="1.7" fill="#ff7a93" opacity=".5"/><ellipse cx="40.6" cy="31.4" rx="2.8" ry="1.7" fill="#ff7a93" opacity=".5"/>',
  () => R(36.5, 19.6, 6, 2.6, '#f2d6b3', 1) + L('M38.6 19.6L38.6 22.2M40.4 19.6L40.4 22.2', '#c9a37a', .6),
  () => P('M31 17L32.3 20.4L36 20.6L33.1 22.8L34 26.3L31 24.4L28 26.3L28.9 22.8L26 20.6L29.7 20.4Z', '#ffd166'),
  () => R(19, 23.6, 26, 7.4, '#26323d', 3.4) + R(20.6, 25, 22.8, 4.6, '#5fd0ee', 2) + R(20.6, 25, 22.8, 1.6, '#bff7ff', .8),
  () => L('M32 11L32 2', '#8aa', 1.2) + C(32, 2, 2, '#ff5f8f'),
  () => P('M25 33.4C28 31.6 30.6 33 32 34C33.4 33 36 31.6 39 33.4C37 36 34 35.6 32 35.2C30 35.6 27 36 25 33.4Z', '#3a2a20')
];
/* ---- backdrops ---- */
const G = (id, a, b, ang) => '<defs><linearGradient id="bg' + id + '" x1="0" y1="0" x2="' + (ang ? 1 : 0) + '" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs><rect width="64" height="64" fill="url(#bg' + id + ')"/>';
const dots = (c, pts, r) => pts.map(p => C(p[0], p[1], r || .8, c, .7)).join('');
const BG = [
  () => G(0, '#1b86a8', '#052437') + dots('#bff7ff', [[10, 12], [52, 9], [46, 22], [14, 30], [56, 36]], 1.1),
  () => G(1, '#0a3d5c', '#010a12') + dots('#46f0c4', [[12, 50], [50, 44], [30, 56], [54, 16]], 1.4),
  () => G(2, '#2a1f66', '#1ea7a0', 1) + L('M0 18C20 8 40 28 64 14', '#7fffd4', 3, 'opacity=".4"'),
  () => G(3, '#ff9a5c', '#7b2d8b') + C(46, 18, 7, '#ffe29a', .85),
  () => G(4, '#3a1f7a', '#0b1646', 1) + dots('#fff', [[8, 10], [20, 6], [50, 12], [58, 30], [10, 40], [44, 8]], .9) + C(14, 48, 10, '#ff7ec9', .18),
  () => G(5, '#9ff2d4', '#2aa59a'),
  () => G(6, '#ffc2d6', '#c05a95'),
  () => G(7, '#101a3a', '#02040c') + dots('#fff', [[6, 8], [18, 14], [30, 5], [44, 10], [56, 6], [52, 24], [10, 28], [24, 20]], .7) + dots('#ffe29a', [[38, 16], [14, 20]], 1.2),
  () => G(8, '#0e2a3a', '#062030') + '<path d="M0 16H64M0 32H64M0 48H64M16 0V64M32 0V64M48 0V64" stroke="#5fd0ee" stroke-width=".5" opacity=".25"/>',
  () => G(9, '#2fa8d0', '#0a5078') + '<g fill="none" stroke="#e8fbff" stroke-width=".8" opacity=".6"><circle cx="12" cy="48" r="4"/><circle cx="50" cy="40" r="6"/><circle cx="40" cy="14" r="3"/><circle cx="20" cy="22" r="2"/></g>',
  () => G(10, '#1f6db0', '#0a2f5a') + L('M0 20Q8 14 16 20T32 20T48 20T64 20', '#9ee3ff', 1.4, 'opacity=".5"') + L('M0 34Q8 28 16 34T32 34T48 34T64 34', '#9ee3ff', 1.4, 'opacity=".35"'),
  () => G(11, '#1b2b4a', '#0a1224') + '<g fill="none" stroke="#a99cff" stroke-width=".8" opacity=".4"><path d="M10 10l6-3.5 6 3.5v7l-6 3.5-6-3.5z"/><path d="M22 17l6-3.5 6 3.5v7l-6 3.5-6-3.5z"/><path d="M44 36l6-3.5 6 3.5v7l-6 3.5-6-3.5z"/></g>',
  () => G(12, '#ffd9e6', '#f7a8c8') + dots('#fff', [[10, 12], [24, 8], [50, 14], [56, 36], [8, 40], [44, 6]], 2),
  () => G(13, '#f2d49b', '#c98f3f') + P('M0 50Q20 40 40 50T64 46V64H0Z', '#e2b777', 'opacity=".7"'),
  () => G(14, '#232b3a', '#0c1018') + '<path d="M-4 20L24 -4M-4 40L44 -4M-4 60L64 -4M16 68L68 20M40 68L68 44" stroke="#5fd0ee" stroke-width="2" opacity=".12"/>',
  () => G(15, '#3a4757', '#1a2230')
];
/* ---- companions (corner buddy, ~16px) ---- */
const PET = [
  () => 'M', () => 'M', () => 'M', () => 'M', () => 'M', () => 'M', () => 'M', () => 'M', () => 'M', () => 'M', () => 'M', () => 'M', () => 'M', () => 'M'
];
const PETS = [
  '<path d="M2 11C2 6 6 3 11 4C15 5 16 8 15 11C13 14 6 15 2 11Z" fill="#4a90c0"/><path d="M2 11L0 7L4 9Z" fill="#4a90c0"/><circle cx="12" cy="7" r=".9" fill="#fff"/>',
  '<path d="M3 8C3 2 13 2 13 8Z" fill="#ff9ac8" opacity=".9"/><path d="M5 8L4 14M8 8V15M11 8L12 14" stroke="#ff9ac8" stroke-width="1" fill="none"/><circle cx="6.5" cy="6" r=".8" fill="#fff"/>',
  '<ellipse cx="8" cy="10" rx="6" ry="4.4" fill="#ffb3c8"/><path d="M3 5L1 2M3 7L0 6M13 5L15 2M13 7L16 6" stroke="#ff7ea6" stroke-width="1.4" stroke-linecap="round"/><circle cx="6" cy="9" r=".8" fill="#222"/><circle cx="10" cy="9" r=".8" fill="#222"/>',
  '<ellipse cx="8" cy="10" rx="5.4" ry="4.6" fill="#e8a65a"/><path d="M4 7L4.4 2.6L7 6ZM12 7L11.6 2.6L9 6Z" fill="#e8a65a"/><circle cx="6.3" cy="9.4" r=".8" fill="#222"/><circle cx="9.7" cy="9.4" r=".8" fill="#222"/>',
  '<ellipse cx="8" cy="10" rx="5.2" ry="4.4" fill="#e07a3a"/><path d="M3.6 8L3.2 2.6L7 6ZM12.4 8L12.8 2.6L9 6Z" fill="#e07a3a"/><path d="M5 11Q8 14 11 11L8 8Z" fill="#fff"/><circle cx="6.3" cy="9" r=".8" fill="#222"/><circle cx="9.7" cy="9" r=".8" fill="#222"/>',
  '<ellipse cx="8" cy="9.6" rx="5" ry="5.4" fill="#8a6a4a"/><circle cx="6" cy="8" r="2.2" fill="#fff"/><circle cx="10" cy="8" r="2.2" fill="#fff"/><circle cx="6" cy="8" r="1" fill="#222"/><circle cx="10" cy="8" r="1" fill="#222"/><path d="M7 10L8 11.4L9 10Z" fill="#ffc874"/>',
  '<rect x="3" y="5" width="10" height="8" rx="2" fill="#9aa7b2"/><circle cx="6" cy="9" r="1.4" fill="#5fd0ee"/><circle cx="10" cy="9" r="1.4" fill="#5fd0ee"/><path d="M8 5V2" stroke="#9aa7b2" stroke-width="1"/><circle cx="8" cy="1.6" r="1" fill="#ff5f8f"/>',
  '<path d="M3 14V7C3 2 13 2 13 7V14L11 12L9 14L8 12L6 14L5 12Z" fill="#f2f8ff" opacity=".95"/><circle cx="6.4" cy="7.4" r=".9" fill="#222"/><circle cx="9.6" cy="7.4" r=".9" fill="#222"/>',
  '<ellipse cx="8" cy="10" rx="5.4" ry="4" fill="#6bc06a"/><path d="M4 7L3 3L6 6ZM12 7L13 3L10 6Z" fill="#4aa04a"/><path d="M13 10L16 8L15 12Z" fill="#6bc06a"/><circle cx="6.4" cy="9" r=".8" fill="#222"/><circle cx="9.6" cy="9" r=".8" fill="#222"/>',
  '<circle cx="8" cy="8" r="5" fill="#a9f3ff" opacity=".35"/><circle cx="8" cy="8" r="3.2" fill="#fff"/><circle cx="8" cy="8" r="1.6" fill="#5fd0ee"/>',
  '<ellipse cx="8" cy="10" rx="5.4" ry="3.6" fill="#e0523a"/><path d="M3 7L1 3L4 5ZM13 7L15 3L12 5Z" fill="#e0523a"/><path d="M5 6L5 4M11 6L11 4" stroke="#e0523a" stroke-width="1.2"/><circle cx="5.4" cy="3.6" r=".9" fill="#fff"/><circle cx="10.6" cy="3.6" r=".9" fill="#fff"/>',
  '<ellipse cx="8" cy="9" rx="5.6" ry="4" fill="#5aa86a"/><path d="M4 9H12M6 6L6.6 12M10 6L9.4 12" stroke="#3f8a4e" stroke-width=".8"/><circle cx="13" cy="8" r="1.8" fill="#79c08a"/><circle cx="13.6" cy="7.6" r=".4" fill="#222"/>',
  '<path d="M9 2C6 2 5 5 7 6C9 7 7 9 6 10C5 12 7 14 9 13C8 12 9 11 10 10C12 8 12 3 9 2Z" fill="#ffb347"/><circle cx="8.4" cy="4" r=".7" fill="#222"/>',
  '<path d="M2 8L5 5L8 8L11 5L14 8L11 12L8 10L5 12Z" fill="#4a3a6a"/><circle cx="6.6" cy="8" r=.7 fill="#ff7ec9"/><circle cx="9.4" cy="8" r=.7 fill="#ff7ec9"/>'.replace(/r=\./g, 'r=".').replace(/ fill="#ff7ec9"\/>/g, '" fill="#ff7ec9"/>')
];
const AUR = [
  () => '', () => '<defs><radialGradient id="ag"><stop offset=".6" stop-color="#ffe29a" stop-opacity="0"/><stop offset="1" stop-color="#ffe29a" stop-opacity=".45"/></radialGradient></defs><circle cx="32" cy="30" r="30" fill="url(#ag)"/>',
  () => ['[8,12]', '[54,10]', '[58,40]', '[6,44]', '[48,56]'].map(p => { const [x, y] = JSON.parse(p); return P('M' + x + ' ' + (y - 3.4) + 'L' + (x + 1) + ' ' + (y - 1) + 'L' + (x + 3.4) + ' ' + y + 'L' + (x + 1) + ' ' + (y + 1) + 'L' + x + ' ' + (y + 3.4) + 'L' + (x - 1) + ' ' + (y + 1) + 'L' + (x - 3.4) + ' ' + y + 'L' + (x - 1) + ' ' + (y - 1) + 'Z', '#fff6c8', 'opacity=".9"'); }).join(''),
  () => [[10, 14], [54, 16], [56, 42], [8, 46]].map(p => P('M' + p[0] + ' ' + (p[1] + 3) + 'C' + (p[0] - 5) + ' ' + (p[1] - 1) + ' ' + (p[0] - 2) + ' ' + (p[1] - 4) + ' ' + p[0] + ' ' + (p[1] - 1) + 'C' + (p[0] + 2) + ' ' + (p[1] - 4) + ' ' + (p[0] + 5) + ' ' + (p[1] - 1) + ' ' + p[0] + ' ' + (p[1] + 3) + 'Z', '#ff7ea6', 'opacity=".85"')).join(''),
  () => '<ellipse cx="32" cy="30" rx="29" ry="9" fill="none" stroke="#a99cff" stroke-width="1.2" opacity=".7" transform="rotate(-24 32 30)"/><ellipse cx="32" cy="30" rx="29" ry="9" fill="none" stroke="#5fd0ee" stroke-width="1" opacity=".6" transform="rotate(24 32 30)"/>',
  () => P('M6 64C6 54 10 48 12 44C13 50 16 52 17 56C19 52 19 48 20 46C22 52 24 58 22 64Z', '#ff9a3c', 'opacity=".75"') + P('M44 64C42 58 44 52 46 46C47 48 47 52 49 56C50 52 52 50 53 44C55 48 58 54 58 64Z', '#ff6a3c', 'opacity=".7"')
];
const FR = [
  () => '', () => '<circle cx="32" cy="32" r="30.4" fill="none" stroke="#5fd0ee" stroke-width="2.4"/>', () => '<circle cx="32" cy="32" r="30.4" fill="none" stroke="#ffc874" stroke-width="2.6"/>',
  () => '<circle cx="32" cy="32" r="30.4" fill="none" stroke="#ff7ec9" stroke-width="2.4" stroke-dasharray="6 3"/>',
  () => '<rect x="1.4" y="1.4" width="61.2" height="61.2" rx="6" fill="none" stroke="#fff" stroke-width="2.4"/><rect x="4.6" y="4.6" width="54.8" height="54.8" rx="3" fill="none" stroke="#5fd0ee" stroke-width="1"/>',
  () => '<circle cx="32" cy="32" r="30.8" fill="none" stroke="#46f0c4" stroke-width="1.6"/><circle cx="32" cy="32" r="28.2" fill="none" stroke="#a99cff" stroke-width="1.2"/>',
  () => '<circle cx="32" cy="32" r="30.4" fill="none" stroke="#9ee3ff" stroke-width="2.2" stroke-dasharray="2 4" stroke-linecap="round"/>',
  () => '<circle cx="32" cy="32" r="30.4" fill="none" stroke="#c94c4c" stroke-width="2.6"/><path d="M32 0.8V6M32 58V63.2M0.8 32H6M58 32H63.2" stroke="#c94c4c" stroke-width="2.4"/>'
];
const KEYS = ['s', 'hd', 'h', 'hc', 'e', 'b', 'm', 'o', 'oc', 't', 'x', 'bg', 'p', 'au', 'fr'];
const MAX = { s: SK.length, hd: HEADS.length, h: H.length, hc: PAL.length, e: E.length, b: B.length, m: M.length, o: OUT.length, oc: PAL.length, t: T.length, x: X.length, bg: BG.length, p: PETS.length + 1, au: AUR.length, fr: FR.length };
const hashS = s => { let h = 2166136261; s = String(s || 'x'); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
function parse(code) { const a = String(code || '').split('.'), o = {}; KEYS.forEach((k, i) => { const v = parseInt(a[i], 36); o[k] = isFinite(v) && v >= 0 && v < MAX[k] ? v : 0; }); return o; }
const enc = o => KEYS.map(k => (o[k] | 0).toString(36)).join('.');
function forName(name) { let h = hashS(name), o = {}; KEYS.forEach(k => { o[k] = h % MAX[k]; h = Math.imul(h, 1103515245) + 12345 >>> 0; }); o.t = h % 3 ? 0 : o.t; o.p = (h >> 3) % 4 ? 0 : o.p; o.au = 0; o.fr = 0; o.x = (h >> 5) % 2 ? 0 : o.x; o.oc = o.oc % PAL.length; o.s = o.s % 9; return enc(o); }
function random() { const o = {}; KEYS.forEach(k => { o[k] = Math.floor(Math.random() * MAX[k]); }); if (Math.random() < .5) o.t = 0; if (Math.random() < .5) o.x = 0; if (Math.random() < .55) o.p = 0; if (Math.random() < .7) o.au = 0; return enc(o); }
function body(o) {
  const sk = SK[o.s], hc = PAL[o.hc], oc = PAL[o.oc], ac = PAL[(o.oc + 5) % 16], hr = H[o.h](hc), face = (x, s) => E[o.e](x, s) + B[o.b](x, s);
  const eyeY = 0, pet = o.p > 0 ? '<g transform="translate(43 44) scale(1.2)">' + PETS[o.p - 1] + '</g>' : '';
  return BG[o.bg]() + AUR[o.au]() + hr[0] + OUT[o.o](oc, sk) + R(27.4, 37, 9.2, 8, sh(sk, .12), 3) + HEADS[o.hd](sk) +
    face(26.4, -1) + face(37.6, 1) + M[o.m]() + X[o.x]() + hr[1] + T[o.t](ac) + pet + FR[o.fr]();
}
function svg(code, size) { const o = typeof code === 'object' ? code : parse(code); return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + (size || 64) + '" height="' + (size || 64) + '" role="img" aria-label="Avatar">' + body(o) + '</svg>'; }
function pet(code, size) { const o = parse(code); return o.p > 0 ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="' + (size || 16) + '" height="' + (size || 16) + '">' + PETS[o.p - 1] + '</svg>' : ''; }
const el = (code, size, cls) => '<span class="av ' + (cls || '') + '" style="width:' + size + 'px;height:' + size + 'px">' + svg(code, size) + '</span>';
const IMG = {};
function img(code, size) { const k = code + '@' + size; if (!IMG[k]) { const i = new Image(); i.decoding = 'async'; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(code, size)); IMG[k] = i; } return IMG[k]; }
/* ---- storage ---- */
let CUR = null;
const mine = () => { if (!CUR) { try { CUR = localStorage.getItem('cx_v7_avatar'); } catch (e) {} if (!CUR) CUR = null; } return CUR; };
function set(code, silent) {
  CUR = enc(parse(code)); try { localStorage.setItem('cx_v7_avatar', CUR); } catch (e) {}
  document.dispatchEvent(new CustomEvent('cx:avatar', { detail: CUR }));
  if (!silent) { try { const N = window.NetworkEngine; if (N && N.AuthManager) N.AuthManager.pushProfile(true); if (N && N.SupabaseLounge) N.SupabaseLounge.retrack(); } catch (e) {} }
}
/* ---- editor ---- */
const TABS = [['s', 'Skin', 'c'], ['hd', 'Head', 'p'], ['h', 'Hair', 'p'], ['hc', 'Hair colour', 'c'], ['e', 'Eyes', 'p'], ['b', 'Brows', 'p'], ['m', 'Mouth', 'p'], ['o', 'Outfit', 'p'], ['oc', 'Outfit colour', 'c'], ['t', 'Headwear', 'p'], ['x', 'Extras', 'p'], ['bg', 'Backdrop', 'p'], ['p', 'Companion', 'p'], ['au', 'Aura', 'p'], ['fr', 'Frame', 'p']];
let ED = null, TAB = 'h';
function edHTML() {
  const cur = ED[TAB], t = TABS.find(x => x[0] === TAB);
  const opts = [...Array(MAX[TAB]).keys()].map(i => {
    const sel = i === cur ? ' on' : '';
    if (t[2] === 'c') return '<button type="button" class="avo sw' + sel + '" data-av="opt" data-i="' + i + '" style="background:' + (TAB === 's' ? SK[i] : PAL[i]) + '" aria-label="' + t[1] + ' ' + (i + 1) + '"></button>';
    const o = Object.assign({}, ED); o[TAB] = i;
    return '<button type="button" class="avo' + sel + '" data-av="opt" data-i="' + i + '" aria-label="' + t[1] + ' ' + (i + 1) + '">' + el(o, 46) + '</button>';
  }).join('');
  return '<div class="avs"><div class="avs-pv">' + el(ED, 132, 'sq') + '<div class="avs-bt"><button type="button" class="btn" data-av="rand">🎲 Random</button><button type="button" class="btn" data-av="reset">↺ Mine</button></div></div>' +
    '<div class="avs-main"><div class="avs-tabs" role="tablist">' + TABS.map(x => '<button type="button" role="tab" class="' + (x[0] === TAB ? 'on' : '') + '" data-av="tab" data-k="' + x[0] + '" aria-selected="' + (x[0] === TAB) + '">' + x[1] + '</button>').join('') + '</div><div class="avs-grid">' + opts + '</div></div></div>' +
    '<div class="avs-foot"><button type="button" class="btn primary" data-av="save">Save avatar</button></div>';
}
function edit() {
  ED = parse(mine() || forName((window.NetworkEngine && window.NetworkEngine.AuthManager && window.NetworkEngine.AuthManager.name) || 'operator')); TAB = 'h';
  openModal(edHTML(), 'AVATAR STUDIO');
  const mb = document.getElementById('modalBody'); if (mb.__av) return; mb.__av = 1;
  mb.addEventListener('click', e => {
    const b = e.target.closest('[data-av]'); if (!b || !ED) return; const a = b.dataset.av;
    if (a === 'opt') ED[TAB] = +b.dataset.i; else if (a === 'tab') TAB = b.dataset.k; else if (a === 'rand') ED = parse(random());
    else if (a === 'reset') ED = parse(mine() || forName('operator'));
    else if (a === 'save') { set(enc(ED)); closeModal(); toast('<b>Avatar saved</b><br>It follows you into chat and the lounge.', 'star'); ED = null; sfx('ok'); return; }
    mb.innerHTML = edHTML(); if (window.sfx) sfx('click');
  });
}
window.CodexAvatar = { svg: svg, el: el, img: img, pet: pet, mine: mine, set: set, edit: edit, forName: forName, random: random, parse: parse, enc: enc, MAX: MAX, count: Object.keys(MAX).reduce((a, k) => a + MAX[k], 0) };
})();
