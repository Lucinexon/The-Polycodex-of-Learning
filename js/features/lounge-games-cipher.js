/* lounge-games-cipher.js — Archive Cipher (Library Loft / Archive Stacks).
   MECHANIC: deduction. Each case is a real classical cipher. The reader sees the ciphertext and a clue, chooses the right tool on the decoder bench
   (Wheel, Mirror, Rails or Keyword), sets its parameter, and submits the reading. A wrong submission costs a life; hints cost points.
   The four cases use exactly the four methods the rare-book case explains, so reading the notes is the way to learn the tools.
   PRESENTATION: the lounge viewport becomes a reading-desk bench (DOM + SVG, real form controls). Ciphertext is ENCODED from the plaintext at load time
   so the two can never disagree; the pure functions below are exported for tests. */
(function (root) {
'use strict';
const doc = root.document, A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', LIVES = 3;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const idx = ch => A.indexOf(ch), norm = t => String(t || '').toUpperCase().replace(/[^A-Z]/g, '');

/* ---------- pure ciphers (letters only; case and punctuation are not significant) ---------- */
const caesar = (t, k) => String(t).toUpperCase().replace(/[A-Z]/g, c => A[((idx(c) + k) % 26 + 26) % 26]);
const atbash = t => String(t).toUpperCase().replace(/[A-Z]/g, c => A[25 - idx(c)]);
function railPattern(n, rails) { const p = []; let r = 0, d = 1; for (let i = 0; i < n; i++) { p.push(r); if (rails > 1) { if (r === 0) d = 1; else if (r === rails - 1) d = -1; r += d; } } return p; }
function railEnc(t, rails) { t = norm(t); const p = railPattern(t.length, rails); let out = ''; for (let r = 0; r < rails; r++) for (let i = 0; i < t.length; i++) if (p[i] === r) out += t[i]; return out; }
function railDec(t, rails) { t = norm(t); const p = railPattern(t.length, rails), order = []; for (let r = 0; r < rails; r++) for (let i = 0; i < t.length; i++) if (p[i] === r) order.push(i); const out = []; order.forEach((pos, k) => { out[pos] = t[k]; }); return out.join(''); }
function vig(t, key, dir) { key = norm(key); if (!key) return String(t).toUpperCase(); let j = 0; return String(t).toUpperCase().replace(/[A-Z]/g, c => A[((idx(c) + dir * idx(key[j++ % key.length])) % 26 + 26) % 26]); }
const vigEnc = (t, k) => vig(t, k, 1), vigDec = (t, k) => vig(t, k, -1);

/* ---------- cases: plaintext + method + parameters; the ciphertext is derived ---------- */
const CASES = [
  { n: 'The Fireplace Note', method: 'wheel', plain: 'MEET ME AT THE FIREPLACE', p: { shift: 3 }, clue: 'Orrin\u2019s margin note: \u201cJulius Caesar\u2019s own cipher. Suetonius says he slid every letter along by the number of sides on a triangle.\u201d', hint: 'Turn the wheel until English appears. Each click moves the whole alphabet one place.' },
  { n: 'The Scribe\u2019s Mirror', method: 'mirror', plain: 'THE ARCHIVE REMEMBERS', p: {}, clue: 'A card in the scribe\u2019s hand: \u201cI wrote with the alphabet reflected in a looking-glass: first for last.\u201d', hint: 'The mirror swaps A\u2194Z, B\u2194Y, C\u2194X \u2026 It has no key to set.' },
  { n: 'The Three Fences', method: 'rails', plain: 'LOOK BEHIND THE CLOCK', p: { rails: 3 }, clue: 'Scrawled on a ticket: \u201cThe message leaps over three fences, up and down, up and down.\u201d', hint: 'Set the number of rails to the number of fences, then read the zigzag.' },
  { n: 'The Brass Plate', method: 'keyword', plain: 'THE LAST PAGE IS BLANK', p: { key: 'BRASS' }, clue: 'Orrin: \u201cThe key is the metal on the bookcase\u2019s lock plate. Five letters, an alloy of copper and zinc.\u201d', hint: 'The keyword repeats under the message; each key letter is its own Caesar shift (A=0, B=1\u2026).' }
];
CASES.forEach(c => { c.cipher = c.method === 'wheel' ? caesar(c.plain, c.p.shift) : c.method === 'mirror' ? atbash(c.plain) : c.method === 'rails' ? railEnc(c.plain, c.p.rails) : vigEnc(c.plain, c.p.key); });
const TOOLS = [['wheel', 'Wheel', 'Slide the alphabet by a shift'], ['mirror', 'Mirror', 'Swap A\u2194Z, B\u2194Y \u2026'], ['rails', 'Rails', 'Read a zigzag across rails'], ['keyword', 'Keyword', 'A repeating keyword']];
/* what the bench shows for the current tool + setting */
function decodeWith(tool, cipher, set) {
  if (tool === 'wheel') return caesar(cipher, -(set.shift | 0)); if (tool === 'mirror') return atbash(cipher); if (tool === 'rails') return railDec(cipher, Math.max(2, Math.min(5, set.rails | 0 || 2))); return vigDec(cipher, set.key || '');
}
const solved = (c, tool, set) => norm(decodeWith(tool, c.cipher, set)) === norm(c.plain);
const group5 = t => norm(t).replace(/(.{5})/g, '$1 ').trim();

function start(opts) {
  opts = opts || {}; const G = root.CodexLoungeGames, host = opts.host || (G && G.host), stage = host && host.stage ? host.stage({ id: 'cipher', label: 'Archive Cipher', cls: 'lgs-cipher' }) : null;
  let dead = false, ended = false, ci = 0, lives = LIVES, mistakes = 0, hints = 0, tool = 'wheel', set = { shift: 0, rails: 2, key: '' }, phase = 'menu', score = 0, msgText = ''; const unlocked = Math.min(CASES.length, Math.max(0, opts.cleared | 0) + 1);
  const ctl = { el: stage && stage.el, get dead() { return dead; }, get core() { return { phase: phase, case: ci + 1, lives: lives, tool: tool, set: set, mistakes: mistakes, hints: hints }; } };
  if (!stage) { dead = true; if (opts.onClose) opts.onClose(ctl); return ctl; }
  const el = stage.el, result = x => Object.assign({ won: false, score: score, rounds: 0, lives: lives, mistakes: mistakes, quit: false, case: ci + 1 }, x);
  const msg = t => { msgText = t; const m = el.querySelector('.lgs-msg'); if (m) m.textContent = t; };
  const hearts = () => '\u2764\ufe0f'.repeat(lives) + '\ud83d\udda4'.repeat(LIVES - lives);

  function shell(inner, acts, sub) {
    el.innerHTML = '<div class="lgs-h"><b>\ud83d\udddd\ufe0f Archive Cipher</b><span class="lgs-sub">' + esc(sub || '') + '</span><span class="lgs-hearts" role="img" aria-label="' + lives + ' of ' + LIVES + ' lives">' + hearts() + '</span><button type="button" class="lgs-x" data-a="close" aria-label="Leave the desk">\u2715</button></div><div class="lgs-main">' + inner + '</div><div class="lgs-f"><p class="lgs-msg" role="status" aria-live="polite">' + esc(msgText) + '</p><div class="lgs-acts">' + acts + '</div></div>';
  }
  function menu() {
    phase = 'menu'; msgText = '';
    shell('<div class="lgs-menu"><p>Four case files from old readers. Each uses a different method; the rare-book case explains them all.</p>' + CASES.map((c, i) => '<button type="button" class="lgs-chart" data-case="' + i + '"' + (i + 1 > unlocked ? ' disabled' : '') + '><b>' + (i + 1) + '. ' + (i + 1 > unlocked ? '???' : esc(c.n)) + '</b><small>' + (i + 1 > unlocked ? '\ud83d\udd12 solve the previous case first' : 'Cipher: ' + group5(c.cipher).slice(0, 23) + '\u2026') + '</small></button>').join('') + '</div>', '<button type="button" class="btn" data-a="close">Close</button>', 'Choose a case');
    const f = el.querySelector('.lgs-chart:not([disabled])'); if (f) f.focus();
  }
  function begin(i) { ci = Math.max(0, Math.min(CASES.length - 1, i)); lives = LIVES; mistakes = 0; hints = 0; tool = 'wheel'; set = { shift: 0, rails: 2, key: '' }; ended = false; score = 0; phase = 'bench'; msgText = ''; bench(); msg('Read the clue, pick the tool it points to, set it, and submit your reading.'); }
  function wheelSVG(shift) {
    const R1 = 78, R2 = 56, cx = 90, cy = 90; let s = '<svg class="cp-wheel" viewBox="0 0 180 180" role="img" aria-label="Cipher wheel, shift ' + shift + '"><circle cx="90" cy="90" r="88" fill="#2a1d10" stroke="#c9a64a" stroke-width="2"/><circle cx="90" cy="90" r="46" fill="#1a110a" stroke="#c9a64a"/>';
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 - Math.PI / 2, b = ((i + shift) % 26 / 26) * Math.PI * 2 - Math.PI / 2; s += '<text x="' + (cx + Math.cos(a) * R1) + '" y="' + (cy + Math.sin(a) * R1 + 3) + '" text-anchor="middle" font-size="9" fill="#f0dfb0">' + A[i] + '</text><text x="' + (cx + Math.cos(a) * R2) + '" y="' + (cy + Math.sin(a) * R2 + 3) + '" text-anchor="middle" font-size="8" fill="#5fd0ee" transform="rotate(' + (shift * 360 / 26) + ' 90 90)">' + A[(i - 0 + 26) % 26] + '</text>'; }
    return s + '<text x="90" y="94" text-anchor="middle" font-size="12" fill="#c9a64a">+' + shift + '</text></svg>';
  }
  function toolUI() {
    if (tool === 'wheel') return '<div class="cp-tool"><div class="cp-wheelbox">' + wheelSVG(set.shift) + '</div><label>Shift <b id="cpShiftV">' + set.shift + '</b><input type="range" min="0" max="25" value="' + set.shift + '" data-set="shift" aria-label="Shift, 0 to 25"></label><div class="cp-step"><button type="button" class="btn" data-step="-1" aria-label="Shift down">\u25c0</button><button type="button" class="btn" data-step="1" aria-label="Shift up">\u25b6</button></div></div>';
    if (tool === 'mirror') return '<div class="cp-tool"><div class="cp-mirror" aria-label="Alphabet and its mirror image"><div>' + A + '</div><div class="cp-rev">' + A.split('').reverse().join('') + '</div></div><p class="cp-note">The mirror has no setting: every letter swaps with its opposite.</p></div>';
    if (tool === 'rails') return '<div class="cp-tool"><label>Rails <b>' + set.rails + '</b><input type="range" min="2" max="5" value="' + set.rails + '" data-set="rails" aria-label="Number of rails, 2 to 5"></label><p class="cp-note">The cipher was written by reading each rail from top to bottom.</p></div>';
    return '<div class="cp-tool"><label>Keyword <input type="text" maxlength="12" value="' + esc(set.key) + '" data-set="key" autocomplete="off" spellcheck="false" aria-label="Keyword"></label><p class="cp-note">The keyword repeats under the message; each letter shifts one letter back.</p></div>';
  }
  function preview() { const c = CASES[ci], out = decodeWith(tool, c.cipher, set); return tool === 'rails' ? out : out; }
  function bench() {
    const c = CASES[ci];
    shell('<div class="cp"><p class="cp-clue"><b>Clue.</b> ' + esc(c.clue) + '</p><p class="cp-lbl">Ciphertext</p><p class="cp-cipher" aria-label="Ciphertext">' + esc(c.method === 'rails' || true ? group5(c.cipher) : c.cipher) + '</p>' +
      '<div class="cp-tools" role="radiogroup" aria-label="Decoder tool">' + TOOLS.map(t => '<button type="button" role="radio" aria-checked="' + (tool === t[0]) + '" class="cp-t' + (tool === t[0] ? ' on' : '') + '" data-tool="' + t[0] + '" title="' + esc(t[2]) + '">' + t[1] + '</button>').join('') + '</div>' + toolUI() +
      '<p class="cp-lbl">Your reading</p><p class="cp-out" id="cpOut" aria-live="polite">' + esc(group5(preview())) + '</p></div>',
      '<button type="button" class="btn primary" data-a="submit">Submit reading</button><button type="button" class="btn" data-a="hint">Hint (\u221210)</button><button type="button" class="btn" data-a="menu">Cases</button>', c.n + ' \u00b7 case ' + (ci + 1) + ' of ' + CASES.length);
  }
  const live = () => { const o = el.querySelector('#cpOut'); if (o) o.textContent = group5(preview()); const w = el.querySelector('.cp-wheelbox'); if (w) w.innerHTML = wheelSVG(set.shift); const v = el.querySelector('#cpShiftV'); if (v) v.textContent = set.shift; };
  function submit() {
    if (phase !== 'bench' || ended) return; const c = CASES[ci];
    if (solved(c, tool, set)) { ended = true; phase = 'done'; score = Math.max(10, 100 - 15 * mistakes - 10 * hints); const res = result({ won: true, rounds: 1 }); if (G && G.report) G.report('cipher', res);
      const nx = ci + 1 < CASES.length; if (root.sfx) root.sfx('ok');
      shell('<div class="cp"><p class="cp-win">\u2714 Decoded!</p><p class="cp-out">' + esc(c.plain) + '</p><p class="cp-note">' + esc(c.n) + ' solved. Score ' + score + '.</p></div>', (nx ? '<button type="button" class="btn primary" data-a="next">Next case</button>' : '') + '<button type="button" class="btn" data-a="menu">Cases</button><button type="button" class="btn" data-a="close">Close</button>', c.n);
      msg('Score ' + score + (mistakes ? ' (' + mistakes + ' wrong reading' + (mistakes > 1 ? 's' : '') + ')' : ' \u2014 perfect') + '.'); const b = el.querySelector('.lgs-acts .btn'); if (b) b.focus(); if (opts.onEnd) opts.onEnd(res); return; }
    lives--; mistakes++; if (root.sfx) root.sfx('bad');
    if (lives <= 0) { ended = true; phase = 'done'; const res = result({ won: false, rounds: 0 }); if (G && G.report) G.report('cipher', res);
      shell('<div class="cp"><p class="cp-lose">The page crumbles. Out of readings.</p><p class="cp-note">The answer was: ' + esc(c.plain) + '</p></div>', '<button type="button" class="btn primary" data-a="retry">Try again</button><button type="button" class="btn" data-a="menu">Cases</button><button type="button" class="btn" data-a="close">Close</button>', c.n);
      const b = el.querySelector('.lgs-acts .btn'); if (b) b.focus(); if (opts.onEnd) opts.onEnd(res); return; }
    const o = el.querySelector('#cpOut'); if (o && !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches)) { o.classList.remove('shake'); void o.offsetWidth; o.classList.add('shake'); }
    const h = el.querySelector('.lgs-hearts'); if (h) { h.textContent = hearts(); h.setAttribute('aria-label', lives + ' of ' + LIVES + ' lives'); }
    msg('That reading is not right. ' + lives + (lives === 1 ? ' life' : ' lives') + ' left. Check the clue and the tool.');
  }
  el.addEventListener('click', e => {
    if (dead) return; const t = e.target.closest('[data-a],[data-tool],[data-case],[data-step]'); if (!t) return;
    if (t.dataset.case != null) { if (!t.disabled) begin(+t.dataset.case); return; }
    if (t.dataset.tool) { tool = t.dataset.tool; bench(); const b = el.querySelector('.cp-t.on'); if (b) b.focus(); return; }
    if (t.dataset.step) { set.shift = ((set.shift + (+t.dataset.step)) % 26 + 26) % 26; const r = el.querySelector('[data-set=shift]'); if (r) r.value = set.shift; live(); return; }
    const k = t.dataset.a; if (k === 'close') ctl.quit('close'); else if (k === 'menu') menu(); else if (k === 'submit') submit(); else if (k === 'retry') begin(ci); else if (k === 'next') begin(ci + 1);
    else if (k === 'hint') { hints++; msg('Hint: ' + CASES[ci].hint); }
  });
  el.addEventListener('input', e => { const s = e.target.closest('[data-set]'); if (!s) return; const k = s.dataset.set; set[k] = k === 'key' ? norm(s.value).slice(0, 12) : +s.value; if (k === 'key' && s.value !== set.key) s.value = set.key; live(); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input[type=text]')) { e.preventDefault(); submit(); } else if (e.target.closest('[role=radiogroup]') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const ids = TOOLS.map(t => t[0]), i = ids.indexOf(tool); tool = ids[(i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length]; e.preventDefault(); bench(); const b = el.querySelector('.cp-t.on'); if (b) b.focus(); } });
  function onKey(e) { if (dead || e.key !== 'Escape') return; e.preventDefault(); e.stopPropagation(); ctl.quit('esc'); }
  doc.addEventListener('keydown', onKey, true);
  Object.assign(ctl, {
    begin: begin, submit: submit, setTool: t => { tool = t; if (phase === 'bench') bench(); }, setParam: (k, v) => { set[k] = v; if (phase === 'bench') live(); },
    quit(why) { if (dead) return; const was = ended || phase === 'menu' || phase === 'done' || (!mistakes && !hints); this.destroy(); if (!was) { const res = result({ quit: true, aborted: why || '' }); if (G && G.report) G.report('cipher', res); if (opts.onEnd) opts.onEnd(res); } },
    destroy() { if (dead) return; dead = true; doc.removeEventListener('keydown', onKey, true); stage.close(); try { if (opts.onClose) opts.onClose(ctl); } catch (e) {} }
  });
  if (opts.case) begin((opts.case | 0) - 1); else menu();
  return ctl;
}
const meta = { n: 'Archive Cipher', room: 'archive', host: 'Cipher desk', mech: 'Deduction & decoding', blurb: 'Read the clue, choose the right decoder tool and set it. Four classical ciphers, each with its own bench tool.' };
const API = { start: start, meta: meta, CASES: CASES, caesar: caesar, atbash: atbash, railEnc: railEnc, railDec: railDec, vigEnc: vigEnc, vigDec: vigDec, decodeWith: decodeWith, solved: solved, norm: norm };
if (root.CodexLoungeGames && root.CodexLoungeGames.register) root.CodexLoungeGames.register('cipher', API);
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
