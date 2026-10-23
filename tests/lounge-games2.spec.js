// @ts-check
/* Milestone 3 — four distinct games. Pure rules are tested in Node; presentation, input, lifecycle and rewards on the real index.html. */
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const URL = pathToFileURL(resolve(process.cwd(), 'index.html')).href;
const Keeper = require('../js/features/lounge-games-keeper.js');
const Cipher = require('../js/features/lounge-games-cipher.js');
const Sky = require('../js/features/lounge-games-sky.js');
test.use({ viewport: { width: 1440, height: 900 } });

const lcg = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const nextFrames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));

async function boot(page, seed) {
  if (seed) await page.addInitScript(s => { for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); }, seed);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => Boolean(window.CodexLoungeWorld && window.CodexLoungeGames?.survey && window.CodexLoungeGames?.keeper && window.CodexLoungeGames?.cipher && window.CodexLoungePlay?.launch && window.NetworkEngine?.LoungeEngine));
  await page.evaluate(() => { window.__xp = []; window.gainXP = n => { window.__xp.push(n); }; window.showScreen('lobby'); });
  await page.waitForFunction(() => window.NetworkEngine.LoungeEngine.active);
  return errors;
}
async function goRoom(page, id, from) { await page.evaluate(([i, f]) => window.CodexLounge.setRoom(i, { force: true, from: f }), [id, from]); await nextFrames(page); }
const ledger = page => page.evaluate(() => window.CodexLoungeProgress.get());

/* ============ pure rules ============ */
test.describe('Ecosystem Keeper model (pure)', () => {
  const M = Keeper.Model, setsFor = (s, scn) => { const av = M.available(s, scn), o = [[]]; av.forEach(a => o.push([a])); for (let i = 0; i < av.length; i++) for (let j = i + 1; j < av.length; j++) o.push([av[i], av[j]]); return o; };
  const solve = scn => { const key = s => [s.n, s.p, s.z, s.j, s.light, s.cycle % scn.inflow.length, s.stable].join(','), start = M.init(scn), seen = new Set([key(start)]); let fr = [{ s: start, path: [] }];
    for (let d = 1; d <= scn.limit; d++) { const nx = []; for (const f of fr) for (const a of setsFor(f.s, scn)) { const r = M.step(f.s, a, scn); if (r.fail) continue; if (r.won) return f.path.concat([a]); const k = key(r.s); if (!seen.has(k)) { seen.add(k); nx.push({ s: r.s, path: f.path.concat([a]) }); } } fr = nx; } return null; };

  test('step() is deterministic and never mutates its input', () => {
    const scn = M.SCEN[1], s0 = M.init(scn), snap = JSON.stringify(s0), a = M.step(s0, ['feed', 'harvestZ'], scn), b = M.step(s0, ['feed', 'harvestZ'], scn);
    expect(JSON.stringify(s0)).toBe(snap); expect(a).toEqual(b);
  });
  test('only 2 actions count per cycle; populations stay within 0..10', () => {
    const scn = M.SCEN[0], r = M.step(M.init(scn), ['feed', 'feed', 'feed'], scn), one = M.step(M.init(scn), ['feed', 'feed'], scn);
    expect(r.s).toEqual(one.s);
    let s = M.init(scn); for (let i = 0; i < 30; i++) { const x = M.step(s, ['seedP', 'seedP'], scn); s = x.s; for (const k of ['n', 'p', 'z', 'j']) { expect(s[k]).toBeGreaterThanOrEqual(0); expect(s[k]).toBeLessThanOrEqual(10); } if (x.fail) break; }
  });
  test('every tank is solvable within its limit, doing nothing fails, and the win needs the full stable streak', () => {
    for (const scn of M.SCEN) {
      const path = solve(scn); expect(path, scn.id).not.toBeNull(); expect(path.length).toBeLessThanOrEqual(scn.limit); expect(path.length).toBeGreaterThanOrEqual(scn.need);
      let s = M.init(scn), out = null; for (let i = 0; i < scn.limit && !out; i++) { const r = M.step(s, [], scn); s = r.s; if (r.fail || r.won) out = r; }
      expect(out && out.fail, scn.id + ' do-nothing').toBeTruthy();
    }
  });
  test('difficulty rises: a random policy wins far less often on later tanks', () => {
    const rate = scn => { const rnd = lcg(7); let w = 0; for (let t = 0; t < 4000; t++) { let s = M.init(scn), won = false; for (let i = 0; i < scn.limit; i++) { const sets = setsFor(s, scn), r = M.step(s, sets[Math.floor(rnd() * sets.length)], scn); if (r.fail) break; if (r.won) { won = true; break; } s = r.s; } if (won) w++; } return w / 4000; };
    const r = M.SCEN.map(rate); expect(r[0]).toBeGreaterThan(r[2]); expect(r[2]).toBeLessThan(0.02);
  });
});

test.describe('ciphers (pure)', () => {
  test('reference vectors', () => {
    expect(Cipher.railEnc('WE ARE DISCOVERED FLEE AT ONCE', 3)).toBe('WECRLTEERDSOEEFEAOCAIVDEN');
    expect(Cipher.vigEnc('ATTACKATDAWN', 'LEMON')).toBe('LXFOPVEFRNHR'); expect(Cipher.vigDec('LXFOPVEFRNHR', 'LEMON')).toBe('ATTACKATDAWN');
    expect(Cipher.caesar('HELLO', 3)).toBe('KHOOR'); expect(Cipher.atbash(Cipher.atbash('ARCHIVE'))).toBe('ARCHIVE');
    for (const r of [2, 3, 4, 5]) expect(Cipher.railDec(Cipher.railEnc('LOOK BEHIND THE CLOCK', r), r)).toBe('LOOKBEHINDTHECLOCK');
  });
  test('each case is solved by its own tool and setting, and by no other tool', () => {
    const own = { wheel: c => ({ shift: c.p.shift }), mirror: () => ({}), rails: c => ({ rails: c.p.rails }), keyword: c => ({ key: c.p.key }) };
    Cipher.CASES.forEach(c => {
      expect(Cipher.solved(c, c.method, own[c.method](c)), c.n).toBe(true);
      for (const t of ['wheel', 'mirror', 'rails', 'keyword'].filter(x => x !== c.method)) for (const sh of [0, 3, 9, 14]) for (const rl of [2, 3, 4]) expect(Cipher.solved(c, t, { shift: sh, rails: rl, key: 'BRASS' }) && !(t === 'wheel' && sh === c.p.shift)).toBe(false);
    });
  });
});

test.describe('Celestial Survey layout (pure)', () => {
  const W = { SKY: [] };
  test('decoys never crowd the pattern or each other; layout is reproducible from a seed', () => {
    const chart = { s: [[.1, .2], [.5, .5], [.9, .8], [.3, .9]], e: [[0, 1]] };
    const a = Sky.layout(chart, 3, lcg(5)), b = Sky.layout(chart, 3, lcg(5)); expect(a).toEqual(b);
    expect(a.length).toBe(4 + 7 + 12);
    a.forEach((p, i) => { expect(p.x).toBeGreaterThanOrEqual(22 - 1e-9); a.forEach((q, j) => { if (j <= i) return; const need = p.pat || q.pat ? 30 : 24; if (!(p.pat && q.pat)) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(need - 1e-9); }); });
  });
  test('keyboard neighbour picks the nearest star in the pressed direction and never itself', () => {
    const pts = [{ x: 100, y: 100 }, { x: 160, y: 104 }, { x: 98, y: 170 }, { x: 40, y: 98 }];
    expect(Sky.neighbour(pts, 0, [1, 0])).toBe(1); expect(Sky.neighbour(pts, 0, [0, 1])).toBe(2); expect(Sky.neighbour(pts, 0, [-1, 0])).toBe(3); expect(Sky.neighbour(pts, 3, [-1, 0])).toBe(-1);
  });
});

test.describe('Order Up tiers (pure)', () => {
  test('classic is untouched; tiers add rules only when opted in', async ({ page }) => {
    await page.goto(pathToFileURL(resolve(process.cwd(), 'tests/fixtures/lounge-games.html')).href);
    const r = await page.evaluate(() => {
      const O = CodexLoungeGames.orderUp, mk = (tier, seed) => { let s = seed; return new O.Core(() => (s = (s * 16807) % 2147483647) / 2147483647, tier); };
      const classicSeq = (() => { const c = mk(undefined, 9); c.deal(); return c.seq.slice(); })(), raw = (() => { let s = 9; return O.makeSeq(3, () => (s = (s * 16807) % 2147483647) / 2147483647); })();
      const perfect = tier => { const c = mk(tier, 3); for (let i = 0; i < c.cfg.rounds; i++) { c.deal(); c.recall(); const n = c.seq.length; for (let k = 0; k < n; k++) c.press(c.want()); } return { score: c.score, phase: c.phase, best: c.bestStreak }; };
      const mods = { t1: [0, 1, 2, 3].map(r => O.pickMods(1, r, Math.random)), t2: [0, 1, 2].map(r => O.pickMods(2, r, () => .3)), t3: [2, 3, 4].map(r => O.pickMods(3, r, lcgTest())) };
      function lcgTest() { let s = 4; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
      const ban = (() => { const c = mk(2, 21); c.round = 1; let ok = true, found = 0; for (let t = 0; t < 40; t++) { c.deal(); if (c.ban >= 0) { found++; if (c.seq.includes(c.ban)) ok = false; } } return { ok: ok, found: found }; })();
      const rev = (() => { const c = mk(3, 2); c.round = 3; for (let t = 0; t < 60 && !c.rev; t++) c.deal(); if (!c.rev) return null; c.recall(); const exp = c.seq.slice().reverse(); const first = c.want() === exp[0]; const wrong = c.seq[0] === exp[0] ? 'same' : c.press(c.seq[0]); return { first: first, wrong: wrong }; })();
      const lives = (() => { const c = mk(2, 21); c.round = 1; for (let t = 0; t < 40 && c.ban < 0; t++) c.deal(); c.recall(); const before = c.lives, res = c.press(c.ban); return { res: res, lost: before - c.lives, miss: c.ticketMiss }; })();
      return { same: JSON.stringify(classicSeq) === JSON.stringify(raw), p1: perfect(1), p2: perfect(2), p3: perfect(3), mods: mods, ban: ban, rev: rev, lives: lives };
    });
    expect(r.same).toBe(true);                                                                       // tier 1 consumes the rng exactly as before (seeded runs stay reproducible)
    expect(r.p1).toMatchObject({ phase: 'won', best: 0 });                                          // classic: no streak bookkeeping
    expect(r.p2.phase).toBe('won'); expect(r.p2.score).toBeGreaterThan(r.p1.score); expect(r.p2.best).toBe(6);
    expect(r.p3.phase).toBe('won');
    expect(r.mods.t1).toEqual([[], [], [], []]);                                                    // classic never carries modifiers
    expect(r.mods.t2[0]).toEqual([]);                                                               // ticket 1 of a tier is always plain
    expect(r.mods.t2[1]).toHaveLength(1);
    expect(r.mods.t3[0]).toHaveLength(1);                                                           // round 2: one rule
    expect(r.mods.t3[1]).toHaveLength(2); expect(new Set(r.mods.t3[1]).size).toBe(2);               // round 3+: two different rules
    expect(r.ban.found).toBeGreaterThan(0); expect(r.ban.ok).toBe(true);                            // an allergy item is never on its own ticket
    expect(r.rev && r.rev.first).toBe(true); expect(r.rev && r.rev.wrong).toMatch(/wrong|same|lost/);
    expect(r.lives).toEqual({ res: 'wrong', lost: 1, miss: true });                                 // serving the banned item costs a life
  });
});

/* ============ presentation, input, lifecycle, rewards (real page) ============ */
test.describe('Celestial Survey (stage takeover)', () => {
  test('takes over the viewport, pauses the world, wins by rebuilding the figure, records tier + discovery once, and restores everything on close', async ({ page }) => {
    const errors = await boot(page);
    await goRoom(page, 'dome', 'deck');
    const ends = []; await page.exposeFunction('__end', r => ends.push(r));
    await page.evaluate(() => { window.__closed = 0; window.__s = window.CodexLoungeWorld.launchGame('survey', { level: 1, reduced: true, onEnd: r => window.__end(r), onClose: () => window.__closed++ }); });
    await expect(page.locator('.lgs-sky')).toBeVisible();
    const box = await page.evaluate(() => { const a = document.querySelector('.lgs').getBoundingClientRect(), c = document.querySelector('#loungeCanvas').getBoundingClientRect(); return { dx: Math.abs(a.width - c.width), dh: Math.abs(a.height - c.height) }; });
    expect(box.dx).toBeLessThan(2); expect(box.dh).toBeLessThan(2);                                   // it IS the viewport, not a card
    expect(await page.evaluate(() => window.CodexLounge.paused())).toBe(true);
    await expect(page.locator('.lgs-star.pat')).toHaveCount(4);                                       // pattern is highlighted while observing; lines are visible
    await expect(page.locator('.lgs-line.show')).toHaveCount(2);
    await page.locator('[data-a=ready]').click();
    await expect(page.locator('.lgs-line')).toHaveCount(0);                                           // lines vanish once the sky turns
    // a wrong pair costs a life, not the run
    const wrongPair = await page.evaluate(() => { const c = window.__s.core, n = c.stars.filter(s => s.pat).length; return [0, n]; });
    await page.evaluate(([a, b]) => { window.__s.pick(a); window.__s.pick(b); }, wrongPair);
    expect(await page.evaluate(() => window.__s.core.lives)).toBe(2);
    // the right pairs win
    for (const e of await page.evaluate(() => window.CodexLoungeWorld.SKY[0].e)) await page.evaluate(([a, b]) => { window.__s.pick(a); window.__s.pick(b); }, e);
    await expect(page.locator('.lgs-msg')).toContainText('Southern Cross charted');
    expect(ends).toHaveLength(1); expect(ends[0]).toMatchObject({ won: true, level: 1, mistakes: 1, quit: false });
    const d = await ledger(page);
    expect(d.games.survey.tier).toBe(1); expect(d.games.survey.wins).toBe(1); expect(d.found.crux).toBeTruthy();
    expect(await page.evaluate(() => window.__xp)).toEqual([6]);                                      // first clear: 4 + 2×1 XP through the shared cap
    await page.locator('[data-a=retry]').click(); await page.evaluate(() => window.__s.turn());
    for (const e of await page.evaluate(() => window.CodexLoungeWorld.SKY[0].e)) await page.evaluate(([a, b]) => { window.__s.pick(a); window.__s.pick(b); }, e);
    expect(await page.evaluate(() => window.__xp)).toEqual([6]);                                      // replay pays no further XP
    expect((await ledger(page)).games.survey).toMatchObject({ plays: 2, wins: 2, tier: 1 });          // …but both runs are recorded as plays/wins
    await page.keyboard.press('Escape');
    await expect(page.locator('.lgs')).toHaveCount(0);
    expect(await page.evaluate(() => window.CodexLounge.paused())).toBe(false);                      // world input restored
    expect(await page.evaluate(() => window.__closed)).toBe(1);                                       // onClose exactly once
    expect(errors).toEqual([]);
  });

  test('keyboard: arrows move a focus ring between stars, Enter selects/joins, Escape clears the selection before leaving', async ({ page }) => {
    await boot(page); await goRoom(page, 'dome', 'deck');
    await page.evaluate(() => { window.__s = window.CodexLoungeWorld.launchGame('survey', { level: 1, reduced: true, rng: (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })() }); });
    await page.locator('[data-a=ready]').click();
    await expect(page.locator('.lgs-field')).toBeFocused();
    const before = await page.locator('.lgs-star.foc').getAttribute('data-s');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
    expect(await page.locator('.lgs-star.foc').getAttribute('data-s')).not.toBe(before);
    await page.keyboard.press('Enter');
    await expect(page.locator('.lgs-star.sel')).toHaveCount(1);
    await page.keyboard.press('Escape');                                                              // first Esc clears the selection…
    await expect(page.locator('.lgs-star.sel')).toHaveCount(0); await expect(page.locator('.lgs')).toHaveCount(1);
    await page.keyboard.press('Escape');                                                              // …the second leaves
    await expect(page.locator('.lgs')).toHaveCount(0);
  });

  test('touch/mouse: a tap snaps to the nearest star within reach and ignores taps in empty sky', async ({ page }) => {
    await boot(page); await goRoom(page, 'dome', 'deck');
    await page.evaluate(() => { window.__s = window.CodexLoungeWorld.launchGame('survey', { level: 1, reduced: true }); });
    await page.locator('[data-a=ready]').click();
    const hit = await page.evaluate(() => { const svg = document.querySelector('.lgs-svg'), r = svg.getBoundingClientRect(), k = Math.min(r.width / 480, r.height / 270), ox = r.left + (r.width - 480 * k) / 2, oy = r.top + (r.height - 270 * k) / 2, p = window.__s.core.pts[0]; return { x: ox + (p.x + 9) * k, y: oy + (p.y + 7) * k }; });   // 11 units off the star
    await page.mouse.click(hit.x, hit.y);
    expect(await page.evaluate(() => window.__s.core.sel)).toBe(0);
    await page.mouse.click(hit.x, hit.y);                                                              // tap again deselects
    expect(await page.evaluate(() => window.__s.core.sel)).toBe(-1);
  });

  test('compact layout: the game surface keeps a usable height, the room bar is pushed down (not covered), and the canvas box is restored on close', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 760 });                                          // normal (non-focus) layout: the stage is only ~450 px wide
    await boot(page); await goRoom(page, 'dome', 'deck');
    const natural = await page.evaluate(() => document.querySelector('#loungeCanvas').offsetHeight);
    expect(natural).toBeLessThan(330);                                                                 // precondition: this really is the cramped case
    await page.evaluate(() => { window.__s = window.CodexLoungeWorld.launchGame('survey', { level: 1, reduced: true }); });
    await page.locator('[data-a=ready]').click();
    const m = await page.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { stage: r('.lgs').height, field: r('.lgs-svg').height, lgsBottom: r('.lgs').bottom, barTop: r('#lgBar').top }; });
    expect(m.stage).toBeGreaterThanOrEqual(438);
    expect(m.field).toBeGreaterThanOrEqual(260);                                                       // was 168 px before the minimum was introduced
    expect(m.barTop).toBeGreaterThanOrEqual(m.lgsBottom - 1);                                          // the room/emote bar is below the game, never under it
    await page.evaluate(() => window.__s.destroy());
    expect(await page.evaluate(() => document.querySelector('#loungeCanvas').style.height)).toBe('');   // inline height removed
    expect(await page.evaluate(() => document.querySelector('#loungeCanvas').offsetHeight)).toBe(natural);
  });

  test('locked charts stay locked until the previous chart is cleared', async ({ page }) => {
    await boot(page); await goRoom(page, 'dome', 'deck');
    await page.evaluate(() => { window.__s = window.CodexLoungeWorld.launchGame('survey', {}); });
    await expect(page.locator('.lgs-chart')).toHaveCount(6);
    await expect(page.locator('.lgs-chart:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => window.__s.destroy());
    await page.evaluate(() => window.CodexLoungeWorld.setTier('survey', 2));
    await page.evaluate(() => { window.__s = window.CodexLoungeWorld.launchGame('survey', {}); });
    await expect(page.locator('.lgs-chart:not([disabled])')).toHaveCount(3);
  });
});

test.describe('Archive Cipher (stage takeover)', () => {
  test('choose the tool the clue points to, set it, submit: win records tier + discovery; wrong readings cost lives', async ({ page }) => {
    const errors = await boot(page); await goRoom(page, 'archive', 'loft');
    const ends = []; await page.exposeFunction('__cend', r => ends.push(r));
    await page.evaluate(() => { window.__c = window.CodexLoungeWorld.launchGame('cipher', { case: 1, onEnd: r => window.__cend(r) }); });
    await expect(page.locator('.lgs-cipher')).toBeVisible();
    await expect(page.locator('.cp-cipher')).toContainText('PHHWP');
    await page.locator('[data-a=submit]').click();                                                    // wrong: the wheel is still at 0
    expect(await page.evaluate(() => window.__c.core.lives)).toBe(2);
    await page.locator('[data-set=shift]').fill('3');
    await expect(page.locator('#cpOut')).toHaveText('MEETM EATTH EFIRE PLACE');
    await page.locator('[data-a=hint]').click(); await expect(page.locator('.lgs-msg')).toContainText('Hint');
    await page.locator('[data-a=submit]').click();
    await expect(page.locator('.cp-win')).toBeVisible();
    expect(ends).toHaveLength(1); expect(ends[0]).toMatchObject({ won: true, case: 1, mistakes: 1, rounds: 1 });
    expect(ends[0].score).toBe(100 - 15 - 10);
    const d = await ledger(page); expect(d.games.cipher.tier).toBe(1); expect(d.found.caesar).toBeTruthy();
    expect(await page.evaluate(() => window.__xp)).toEqual([9]);                                      // 6 + 3×1
    await page.keyboard.press('Escape'); await expect(page.locator('.lgs')).toHaveCount(0);
    expect(await page.evaluate(() => window.CodexLounge.paused())).toBe(false);
    expect(errors).toEqual([]);
  });

  test('losing all three lives ends the run once (not a win) and reveals the answer; case 2 is locked before case 1 is solved', async ({ page }) => {
    await boot(page); await goRoom(page, 'archive', 'loft');
    const ends = []; await page.exposeFunction('__cend2', r => ends.push(r));
    await page.evaluate(() => { window.__c = window.CodexLoungeWorld.launchGame('cipher', {}); });
    await expect(page.locator('.lgs-chart:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { window.__c.destroy(); window.__c = window.CodexLoungeWorld.launchGame('cipher', { case: 2, cleared: 1, onEnd: r => window.__cend2(r) }); });
    for (let i = 0; i < 3; i++) await page.locator('[data-a=submit]').click();                          // the mirror tool isn't selected, so the reading is wrong
    await expect(page.locator('.cp-lose')).toBeVisible(); await expect(page.locator('.cp-note')).toContainText('THE ARCHIVE REMEMBERS');
    expect(ends).toHaveLength(1); expect(ends[0]).toMatchObject({ won: false, mistakes: 3, rounds: 0 });
    expect((await ledger(page)).games.cipher.wins).toBe(0);
  });

  test('every tool is usable by keyboard: radio group arrows, range input, text input + Enter submits', async ({ page }) => {
    await boot(page); await goRoom(page, 'archive', 'loft');
    await page.evaluate(() => { window.__c = window.CodexLoungeWorld.launchGame('cipher', { case: 4, cleared: 3 }); });
    await page.locator('.cp-t[data-tool="wheel"]').focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    await expect(page.locator('.cp-t.on')).toHaveText('Keyword');
    await page.locator('[data-set=key]').fill('brass');
    await expect(page.locator('#cpOut')).toHaveText('THELA STPAG EISBL ANK');
    await page.keyboard.press('Enter');
    await expect(page.locator('.cp-win')).toBeVisible();
  });
});

test.describe('Ecosystem Keeper (console activity)', () => {
  test('lives in a console tab while the world stays live; a real winning plan stabilises the tank; first clear pays once; closing removes the tab', async ({ page }) => {
    const errors = await boot(page); await goRoom(page, 'conservatory', 'garden');
    const M = Keeper.Model, scn = M.SCEN[0], setsFor = s => { const av = M.available(s, scn), o = [[]]; av.forEach(a => o.push([a])); for (let i = 0; i < av.length; i++) for (let j = i + 1; j < av.length; j++) o.push([av[i], av[j]]); return o; };
    const key = s => [s.n, s.p, s.z, s.j, s.light, s.cycle % scn.inflow.length, s.stable].join(','); let fr = [{ s: M.init(scn), path: [] }], plan = null; const seen = new Set();
    for (let d = 1; d <= scn.limit && !plan; d++) { const nx = []; for (const f of fr) for (const a of setsFor(f.s)) { const r = M.step(f.s, a, scn); if (r.fail) continue; if (r.won) { plan = f.path.concat([a]); break; } const k = key(r.s); if (!seen.has(k)) { seen.add(k); nx.push({ s: r.s, path: f.path.concat([a]) }); } } fr = nx; }
    expect(plan).not.toBeNull();
    const ends = []; await page.exposeFunction('__kend', r => ends.push(r));
    await page.evaluate(() => { window.__closed = 0; window.__k = window.CodexLoungeWorld.launchGame('keeper', { scenario: 1, onEnd: r => window.__kend(r), onClose: () => window.__closed++ }); });
    await expect(page.locator('#lcTab-keeper')).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => window.CodexLounge.paused())).toBe(false);                      // console activity does NOT freeze the world
    await expect(page.locator('#lcPanel-keeper .kp-meters [role=meter]')).toHaveCount(2);
    await expect(page.locator('#lcPanel-keeper .kp-lock')).toContainText('unlock');                   // forecast is earned by inspecting specimens
    for (const acts of plan) { for (const a of acts) await page.locator('#lcPanel-keeper [data-act="' + a + '"]').click(); await page.locator('#lcPanel-keeper [data-k=run]').click(); }
    await expect(page.locator('#lcPanel-keeper .kp-note')).toContainText('stable');
    await expect(page.locator('#lcPanel-keeper .kp-log li').first()).toContainText(/phytoplankton/i);  // the cause/effect log is shown
    expect(ends).toHaveLength(1); expect(ends[0]).toMatchObject({ won: true, scenario: 1 });
    expect((await ledger(page)).games.keeper.tier).toBe(1); expect(await page.evaluate(() => window.__xp)).toEqual([15, 12]);   // the one-time quest “Keep it balanced” (15) + the first-clear bonus 8 + 4×1 (12); each paid exactly once
    await page.evaluate(() => window.__k.destroy());
    await expect(page.locator('#lcTab-keeper')).toHaveCount(0);
    expect(await page.evaluate(() => window.__closed)).toBe(1);
    await expect(page.locator('#lcTab-room')).toHaveAttribute('aria-selected', 'true');               // console falls back to a real tab
    expect(errors).toEqual([]);
  });

  test('doing nothing crashes the tank (one failed run, not a win); the forecast unlocks after 3 specimens', async ({ page }) => {
    await boot(page); await goRoom(page, 'conservatory', 'garden');
    const ends = []; await page.exposeFunction('__kend2', r => ends.push(r));
    await page.evaluate(() => { window.__k = window.CodexLoungeWorld.launchGame('keeper', { scenario: 1, onEnd: r => window.__kend2(r) }); });
    for (let i = 0; i < 5 && !ends.length; i++) await page.locator('#lcPanel-keeper [data-k=run]').click();
    expect(ends).toHaveLength(1); expect(ends[0]).toMatchObject({ won: false, mistakes: 1 });
    await expect(page.locator('#lcPanel-keeper .kp-note')).toContainText(/died out|bloom|time/i);
    await page.evaluate(() => { window.__k.destroy(); ['dinoflagellate', 'vibrio', 'aequorea'].forEach(id => window.CodexLoungeWorld.discover(id, { quiet: true })); window.__k = window.CodexLoungeWorld.launchGame('keeper', { scenario: 1 }); });
    await expect(page.locator('#lcPanel-keeper .kp-fc:not(.kp-lock)')).toContainText('Forecast');
  });
});

test.describe('shared lifecycle', () => {
  test('only one game at a time; leaving the room destroys a running game and restores input; quitting without progress is not a play', async ({ page }) => {
    await boot(page); await goRoom(page, 'dome', 'deck');
    const first = await page.evaluate(() => { window.__s = window.CodexLoungeWorld.launchGame('survey', { level: 1 }); return !!window.__s; });
    expect(first).toBe(true);
    expect(await page.evaluate(() => window.CodexLoungeWorld.launchGame('cipher', {}))).toBeNull();      // the slot is taken
    await page.evaluate(() => window.CodexLounge.setRoom('deck', { from: 'dome' }));
    await expect(page.locator('.lgs')).toHaveCount(0);                                                // room change tears the game down
    expect(await page.evaluate(() => window.CodexLounge.paused())).toBe(false);
    expect(await page.evaluate(() => window.__s.dead)).toBe(true);
    expect((await ledger(page)).games.survey).toBeUndefined();                                        // no progress → nothing recorded
    // the slot is free again
    await goRoom(page, 'dome', 'deck');
    expect(await page.evaluate(() => !!window.CodexLoungeWorld.launchGame('survey', {}))).toBe(true);
  });

  test('daily XP ceiling is shared across all activities', async ({ page }) => {
    await boot(page);
    const got = await page.evaluate(() => { const P = window.CodexLoungePlay; return [P.awardXP(20), P.awardXP(20), P.awardXP(20)]; });
    expect(got).toEqual([20, 10, 0]);                                                                 // CFG.xpPerDayCap = 30
  });

  test('world interactions launch the real games: dome telescope, terrarium, cipher desk, and the kitchen pass offers tiers', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.CodexLoungeWorld.discover('espresso', { quiet: true })); await page.evaluate(() => { const W = window.CodexLoungeWorld; W.discover('matcha', { quiet: true }); W.discover('boba', { quiet: true }); });
    await goRoom(page, 'dome', 'deck');
    await page.locator('#lcPanel-room [data-hot="bigscope"]').click();
    await expect(page.locator('.lgs-sky')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.locator('.lgs')).toHaveCount(0);
    await goRoom(page, 'conservatory', 'garden');
    await page.locator('#lcPanel-room [data-hot="terrarium"]').click();
    await expect(page.locator('#lcTab-keeper')).toBeVisible(); await page.evaluate(() => window.CodexLoungePlay.current().destroy());
    await goRoom(page, 'archive', 'loft');
    await page.locator('#lcPanel-room [data-hot="cipherdesk"]').click();
    await expect(page.locator('.lgs-cipher')).toBeVisible(); await page.keyboard.press('Escape');
    await goRoom(page, 'kitchen', 'cafe');
    await page.locator('#lcPanel-room [data-hot="pass"]').click();
    await expect(page.locator('.lgi .btn', { hasText: 'Lunch Rush' })).toContainText('🔒');
    await page.locator('.lgi .btn', { hasText: 'Classic shift' }).click();
    await expect(page.locator('.lgx')).toBeVisible(); await expect(page.locator('#lgxT')).toHaveText('☕ Order Up');
  });

  test('Order Up tier 2 UI: modifier badges, a crossed-out allergy item, tier in the result; unlocking order 1→2→3', async ({ page }) => {
    await boot(page);
    expect(await page.evaluate(() => window.CodexLoungeWorld.gameTiers('orderUp').map(t => t.open))).toEqual([false, false]);
    await page.evaluate(() => window.CodexLoungeWorld.setTier('orderUp', 1));
    expect(await page.evaluate(() => window.CodexLoungeWorld.gameTiers('orderUp').map(t => t.open))).toEqual([true, false]);
    await goRoom(page, 'cafe');
    await page.evaluate(() => { window.__o = window.CodexLoungeWorld.launchGame('orderUp', { tier: 2, rng: (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })() }); });
    await expect(page.locator('#lgxT')).toHaveText('☕ Order Up · Lunch Rush');
    expect(await page.locator('.lgx-mods .lgx-mod').count()).toBe(0);                                  // ticket 1 is plain
    // play ticket 1 perfectly, then inspect ticket 2's rules
    await page.locator('[data-a=ready]').click();
    for (const v of await page.evaluate(() => window.__o.core.seq)) await page.locator('.lgx-it[data-i="' + v + '"]').click();
    await expect(page.locator('[data-a=ready]')).toBeVisible({ timeout: 4000 });
    await expect(page.locator('.lgx-mods .lgx-mod')).toHaveCount(1);
    const m = await page.evaluate(() => window.__o.core.mods[0]);
    if (m === 'allergy') { await expect(page.locator('.lgx-it.ban')).toHaveCount(1); await expect(page.locator('.lgx-it.ban')).toHaveAttribute('aria-label', /allergy/); }
    else await expect(page.locator('.lgx-mod-' + m)).toBeVisible();
    await expect(page.locator('.lgx-round')).toContainText('Ticket 2 of 6');
  });
});
