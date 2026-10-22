// @ts-check
/* Milestones 4–5 — scene art alignment, microinteractions (local-only, bounded, reduced-motion safe), state-reflecting scenery,
   inactive/hidden-tab cleanup, NPC dialogue integration and the avatar studio. Real index.html throughout. */
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const URL = pathToFileURL(resolve(process.cwd(), 'index.html')).href;
test.use({ viewport: { width: 1440, height: 900 } });

async function boot(page, opts) {
  if (opts && opts.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => Boolean(window.CodexLoungeWorld && window.CodexLoungeArt && window.CodexLoungePlay && window.NetworkEngine?.LoungeEngine));
  await page.evaluate(() => { window.__xp = []; window.gainXP = n => window.__xp.push(n); window.showScreen('lobby'); });
  await page.waitForFunction(() => window.NetworkEngine.LoungeEngine.active && window.CodexLounge.ROOMS.dome);
  return errors;
}
const frames = (page, n = 2) => page.evaluate(k => new Promise(r => { let i = 0; const f = () => (++i >= k ? setTimeout(r, 30) : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
async function go(page, id, from) { await page.evaluate(([i, f]) => window.CodexLounge.setRoom(i, { force: true, from: f }), [id, from]); await page.waitForFunction(() => !window.CodexLounge.fading(), null, { timeout: 8000 }); await page.waitForTimeout(80); }   // setRoom starts a frame-based fade-from-black; sample only once it has cleared
/* count pixels inside a logical-canvas rectangle whose colour satisfies a predicate (canvas is 480×300 backing store) */
const count = (page, rect, pred) => page.evaluate(([r, src]) => { const d = document.getElementById('loungeCanvas').getContext('2d').getImageData(r[0], r[1], r[2], r[3]).data, f = new Function('r', 'g', 'b', 'return ' + src); let n = 0; for (let i = 0; i < d.length; i += 4) if (f(d[i], d[i + 1], d[i + 2])) n++; return n; }, [rect, pred]);
const GOLDISH = 'r > 140 && g > 110 && b < 200';     // alpha-blended gold over a dark scene still clears these
const snap = (page, rect) => page.evaluate(r => Array.from(document.getElementById('loungeCanvas').getContext('2d').getImageData(r[0], r[1], r[2], r[3]).data), rect);
const diff = async (page, rect, before) => { const now = await snap(page, rect); let n = 0; for (let i = 0; i < now.length; i += 4) if (Math.abs(now[i] - before[i]) + Math.abs(now[i + 1] - before[i + 1]) + Math.abs(now[i + 2] - before[i + 2]) > 30) n++; return n; };

test.describe('art ↔ hitbox alignment', () => {
  test('door sprites, deck benches and the telescope are drawn at their hotspot rectangles', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.CodexLounge, A = window.CodexLoungeArt, out = [], rect = h => [h.x, h.y, h.w, h.h].join();
      [['deck', 'dome', 'to_dome'], ['cafe', 'kitchen', 'to_kitchen'], ['garden', 'conservatory', 'to_conservatory'], ['loft', 'archive', 'to_archive']].forEach(([room, sub, id]) => { const h = G.HOT[room].find(x => x.id === id), g = A.GEO[room][sub]; if (rect(h) !== [g.x, g.y, g.w, g.h].join()) out.push(id + ' hotspot ≠ sprite'); });
      A.PROPS.deck.benches.forEach((b, i) => { const h = G.HOT.deck.find(x => x.id === 'b' + (i + 1)); if (h.x !== b[0] || h.y !== b[1]) out.push('bench b' + (i + 1) + ' art ≠ hotspot'); });
      const sc = G.HOT.deck.find(x => x.id === 'scope'), p = A.PROPS.deck.scope; if (sc.x !== p.x || sc.y !== p.y || sc.w !== p.w || sc.h !== p.h) out.push('scope');
      Object.keys(G.ROOMS).filter(k => G.ROOMS[k].parent).forEach(k => { const e = G.HOT[k].find(h => h.id === 'out'), x = A.GEO.exit; if (rect(e) !== [x.x, x.y, x.w, x.h].join()) out.push(k + ' exit'); });
      return out;
    });
    expect(r).toEqual([]);
  });

  test('props are really painted: bench cushions, brass telescope bands, door sprite pixels', async ({ page }) => {
    await boot(page); await go(page, 'deck');
    expect(await count(page, [56, 213, 48, 9], 'b > 140 && g > 110 && r < 90')).toBeGreaterThan(150);           // b1 cushion (teal)
    expect(await count(page, [376, 225, 48, 9], 'b > 140 && g > 110 && r < 90')).toBeGreaterThan(150);          // b2 cushion
    expect(await count(page, [318, 120, 44, 66], 'r > 170 && g > 140 && b < 120')).toBeGreaterThan(8);            // brass bands on the tube
    expect(await count(page, [96, 126, 40, 60], 'r > 150 && g > 120 && b < 110')).toBeGreaterThan(80);            // brass hatch ring
    await go(page, 'loft'); expect(await count(page, [366, 116, 8, 18], 'r > 180 && g > 140 && b < 110')).toBeGreaterThan(20);   // bookcase door: the brass lock plate
  });

  test('every room paints something different: scenery fingerprints are all distinct across the 8 rooms', async ({ page }) => {
    await boot(page);
    const hashes = [];
    for (const id of ['deck', 'cafe', 'garden', 'loft', 'dome', 'kitchen', 'conservatory', 'archive']) {
      await go(page, id, id === 'deck' || id === 'cafe' || id === 'garden' || id === 'loft' ? undefined : page.evaluate ? undefined : undefined);
      hashes.push(await page.evaluate(() => { const d = document.getElementById('loungeCanvas').getContext('2d').getImageData(0, 0, 480, 120).data; let h = 0, rs = 0, gs = 0, bs = 0; for (let i = 0; i < d.length; i += 64) { rs += d[i]; gs += d[i + 1]; bs += d[i + 2]; } return [Math.round(rs / 1000), Math.round(gs / 1000), Math.round(bs / 1000)].join(','); }));
    }
    expect(new Set(hashes).size).toBe(8);
  });
});

test.describe('microinteractions', () => {
  test('room-entry banner appears on arrival, names the room, and clears itself', async ({ page }) => {
    await boot(page); await frames(page, 2);
    await page.evaluate(() => window.CodexLounge.setRoom('dome', { force: true, from: 'deck' }));
    expect(await page.evaluate(() => window.CodexLounge.bannerOn())).toBe(true);
    await expect.poll(() => count(page, [100, 34, 280, 3], 'r > 200 && g > 150 && b < 170'), { timeout: 1800, intervals: [60] }).toBeGreaterThan(40);   // gold accent rule = side-room banner, at full opacity once its fade-in and the room fade settle
    await page.waitForTimeout(2300);
    expect(await page.evaluate(() => window.CodexLounge.bannerOn())).toBe(false);
  });

  test('effects are local-only and bounded: no presence traffic, capped list, cleared on leaving', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(async () => {
      const L = window.NetworkEngine.LoungeEngine, orig = L.extra; let calls = 0; L.extra = function () { calls++; return orig.apply(this, arguments); };
      const before = calls; for (let i = 0; i < 200; i++) window.CodexLounge.fx(['sparkle', 'dust', 'ping', 'deny', 'confetti'][i % 5], 100 + i % 50, 220);
      const n = window.CodexLounge.fxCount(); await new Promise(r => setTimeout(r, 250)); const during = calls - before; L.extra = orig; return { n: n, extraCalls: during };
    });
    expect(r.n).toBeLessThanOrEqual(28);                                                                            // hard cap on the particle list
    expect(r.extraCalls).toBe(0);                                                                                   // cosmetic effects never touch presence
    await page.evaluate(() => { window.CodexLounge.fx('sparkle', 100, 200); window.showScreen('home'); });
    await page.waitForFunction(() => window.CodexLounge.fxCount() === 0);
  });

  test('discovery sparkle and arrival ping are actually drawn (pixel change near the player / object)', async ({ page }) => {
    await boot(page); await go(page, 'kitchen', 'cafe');
    const me = await page.evaluate(() => { const m = window.NetworkEngine.LoungeEngine.me; return { x: Math.round(m.cx), y: Math.round(m.cy) }; });
    const rect = [me.x - 30, me.y - 70, 60, 40], ctl = [300, 235, 60, 40], b0 = await snap(page, rect), c0 = await snap(page, ctl);
    expect(await page.evaluate(() => window.CodexLounge.fxCount())).toBe(0);
    await page.evaluate(() => window.CodexLoungeWorld.discover('boba'));
    expect(await page.evaluate(() => window.CodexLounge.fxCount())).toBeGreaterThan(0);                               // the discovery event queued a sparkle
    await page.waitForTimeout(160);
    expect(await diff(page, rect, b0)).toBeGreaterThan((await diff(page, ctl, c0)) + 5);                              // …and it is visibly drawn above the player (vs a control area)
  });

  test('“something new here” markers show on unexplored objects and go away once they are used', async ({ page }) => {
    await boot(page); await go(page, 'dome', 'deck');
    const rect = [70, 130, 28, 18];                                                                              // above the atlas (hotspot 34,150,98×38 → marker at x≈83,y≈143)
    expect(await count(page, rect, GOLDISH)).toBeGreaterThan(3);
    await page.evaluate(() => window.CodexLoungeWorld.runIx('atlas')); await page.keyboard.press('Escape'); await frames(page, 4);
    expect(await page.evaluate(() => window.CodexLoungeProgress.get().items.atlas)).toBe(1);
    expect(await count(page, rect, GOLDISH)).toBeLessThan(2);
  });

  test('scenery reflects saved progress: kitchen chalk ticks, dome pins, conservatory glow, archive lamps (deterministic: decorators rendered at a fixed time)', async ({ page }) => {
    await boot(page);
    /* total ink = sum of alpha the room's scenery decorators put on an empty canvas at t = 1000 ms; independent of the live animation phase */
    const ink = (id) => page.evaluate(id => { const cv = document.createElement('canvas'); cv.width = 480; cv.height = 300; const c = cv.getContext('2d'); window.CodexLounge.paintDecor(id, c, 1000); const d = c.getImageData(0, 0, 480, 300).data; let n = 0; for (let i = 3; i < d.length; i += 4) n += d[i]; return n; }, id);
    const W = (fn) => page.evaluate(fn);
    const cases = [
      ['kitchen', () => { const w = window.CodexLoungeWorld; ['espresso', 'matcha', 'boba'].forEach(i => w.discover(i, { quiet: true })); }],
      ['dome', () => window.CodexLoungeWorld.setTier('survey', 3)],
      ['conservatory', () => { const w = window.CodexLoungeWorld; ['dinoflagellate', 'vibrio', 'foxfire'].forEach(i => w.discover(i, { quiet: true })); }],
      ['archive', () => window.CodexLoungeWorld.setTier('cipher', 2)]
    ];
    for (const [room, advance] of cases) {
      const a = await ink(room), a2 = await ink(room);
      expect(a2, room + ' decorators are deterministic at a fixed t').toBe(a);
      await W(advance);
      expect(await ink(room), room + ' scenery changes with saved progress').toBeGreaterThan(a);
    }
    // more progress → more light, monotonically (dome: 3 → 6 charts)
    const d3 = await ink('dome'); await W(() => window.CodexLoungeWorld.setTier('survey', 6)); expect(await ink('dome')).toBeGreaterThan(d3);
  });

  test('Journal tab badges new discoveries and clears once viewed; quest bars animate to their value; “New objective” announces unlocks', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => { const W = window.CodexLoungeWorld; W.discover('espresso', { quiet: true }); });
    await expect(page.locator('#lcTab-journal .lc-badge')).toBeVisible();
    await page.locator('#lcTab-journal').click();
    await page.locator('#lcTab-room').click();
    await expect(page.locator('#lcTab-journal .lc-badge')).toBeHidden();
    await page.locator('#lcTab-quests').click();
    const bar = page.locator('#lcPanel-quests .lc-prog i[data-q="rounds"]');
    await expect(bar).toHaveAttribute('data-to', '25');
    await page.evaluate(() => window.CodexLounge.setRoom('cafe', { force: true }));
    await expect(bar).toHaveAttribute('data-to', '50');
    await expect.poll(() => bar.evaluate(e => e.style.width)).toBe('50%');
    await page.evaluate(() => { const W = window.CodexLoungeWorld; W.discover('matcha', { quiet: true }); W.discover('boba', { quiet: true }); });   // completes “Earn the key card” → unlocks “Read between the lines”
    await expect(page.locator('body')).toContainText('New objective', { timeout: 3000 });
  });

  test('a game that cannot start says so instead of failing silently', async ({ page }) => {
    await boot(page); await go(page, 'dome', 'deck');
    await page.evaluate(() => { const G = window.CodexLoungeGames; const real = G.survey.start; G.survey.start = o => { const c = { dead: true, quit() {}, destroy() {} }; if (o.onClose) o.onClose(c); return c; }; window.__restore = () => { G.survey.start = real; }; window.CodexLoungeWorld.launchGame('survey', {}); });
    await expect(page.locator('body')).toContainText('Could not start');
  });
});

test.describe('reduced motion', () => {
  test('tokens collapse, CSS animations are off, and the important state changes still have a static form', async ({ page }) => {
    await boot(page, { reduced: true });
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--lg-dur').trim())).toMatch(/^0?\.01ms$/);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#loungeConsole')).animationName)).toBe('none');
    await go(page, 'kitchen', 'cafe');
    const rect = [226, 182, 40, 18], ctl = [330, 250, 40, 18], b0 = await snap(page, rect), c0 = await snap(page, ctl);
    await page.evaluate(() => window.CodexLounge.fx('ping', 246, 190)); await page.waitForTimeout(120);
    expect(await diff(page, rect, b0)).toBeGreaterThan((await diff(page, ctl, c0)) + 3);                              // the ping still shows, as a static ring
    await page.evaluate(() => { window.__g = window.CodexLoungeWorld.launchGame('survey', { level: 2 }); });
    await expect(page.locator('.lgs-sky .sky')).toHaveClass(/still/);                                                // the sky snaps instead of rotating
    await page.locator('[data-a=ready]').click();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.lgs-sky .sky')).transitionDuration)).toMatch(/^0s|0\.01ms|1e-05s/);
  });
});

test.describe('inactive / hidden cleanup', () => {
  test('no console work after leaving the lounge, none while the tab is hidden, and it resumes when visible', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => { window.__n = 0; window.CodexLoungeConsole.registerTab({ id: 'probe', label: 'Probe', order: 99, render() { window.__n++; } }); window.CodexLoungeConsole.selectTab('probe'); });
    await expect.poll(() => page.evaluate(() => window.__n)).toBeGreaterThan(0);
    // hidden document → the 4 s refresh is skipped
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); });
    await page.waitForTimeout(300); const h0 = await page.evaluate(() => window.__n); await page.waitForTimeout(4600);
    expect(await page.evaluate(() => window.__n)).toBe(h0);
    await page.evaluate(() => { delete document.hidden; });
    await expect.poll(() => page.evaluate(() => window.__n), { timeout: 6000 }).toBeGreaterThan(h0);                 // visible again → refresh resumes
    // leaving the lounge → timer cleared
    await page.evaluate(() => window.showScreen('home')); await page.waitForTimeout(300);
    const a0 = await page.evaluate(() => window.__n); await page.waitForTimeout(4600);
    expect(await page.evaluate(() => window.__n)).toBe(a0);
    expect(await page.evaluate(() => window.NetworkEngine.LoungeEngine.active)).toBe(false);
  });

  test('leaving the lounge mid-game removes the overlay, listeners and input lock', async ({ page }) => {
    await boot(page); await go(page, 'dome', 'deck');
    await page.evaluate(() => { window.__s = window.CodexLoungeWorld.launchGame('survey', { level: 1 }); });
    await expect(page.locator('.lgs')).toBeVisible();
    await page.evaluate(() => window.showScreen('home'));
    await expect(page.locator('.lgs')).toHaveCount(0);
    expect(await page.evaluate(() => window.CodexLounge.paused())).toBe(false);
    expect(await page.evaluate(() => window.__s.dead)).toBe(true);
    await page.evaluate(() => window.showScreen('lobby'));                                                           // coming back is clean
    await expect(page.locator('.lgs')).toHaveCount(0); await expect(page.locator('.lgi')).toHaveCount(0);
  });
});

test.describe('NPC dialogue + avatar studio', () => {
  test('Mira states her current objective every time, offers “Show me where”, and offers higher shifts only once unlocked', async ({ page }) => {
    await boot(page);
    await frames(page, 6);
    let where = null; await expect.poll(async () => { where = await page.evaluate(() => ['deck', 'cafe', 'garden', 'loft'].find(r => window.CodexLounge.who(r).some(w => w.uid === 'npc:mira')) || null); return where; }, { timeout: 5000 }).not.toBeNull();   // NPC schedules are time-based: find where Mira is right now
    await go(page, where);
    const open = () => page.evaluate(() => { window.CodexLoungePlay.closeDialog(); window.CodexLoungePlay.openDialog('mira'); });
    await open();
    await expect(page.locator('.lgd .lgd-t')).toContainText(/shift|tickets/i);
    await expect(page.locator('.lgd [data-d=go]')).toHaveText('Show me where');
    expect(await page.locator('.lgd [data-d=game][data-tier]').count()).toBe(0);
    await open(); await expect(page.locator('.lgd .lgd-t')).toContainText(/shift|tickets/i);                          // deterministic: same objective again, not a random line
    await page.evaluate(() => window.CodexLoungeWorld.setTier('orderUp', 1));
    await open(); await expect(page.locator('.lgd [data-d=game][data-tier="2"]')).toHaveText('Lunch Rush');
    expect(await page.locator('.lgd [data-d=game][data-tier="3"]').count()).toBe(0);
    await page.locator('.lgd [data-d=game][data-tier="2"]').click();
    await expect(page.locator('#lgxT')).toHaveText('☕ Order Up · Lunch Rush');
  });

  test('avatar studio opens and exposes every new catalog entry', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.CodexAvatar.edit());
    await expect(page.locator('.av-studio, .avs, [data-avs], .modal:not([hidden])').first()).toBeVisible();
    const counts = await page.evaluate(() => { const A = window.CodexAvatar; return { h: A.MAX.h, o: A.MAX.o, t: A.MAX.t }; });
    expect(counts).toEqual({ h: 30, o: 24, t: 22 });
  });
});
