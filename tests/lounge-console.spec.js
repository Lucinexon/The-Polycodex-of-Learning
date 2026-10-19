// @ts-check
/* Milestone 1 — Activity Console, world focus, relocated chat features and the progress ledger.
   Runs against the REAL index.html (same approach as chat-avatar.spec.js). */
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const URL = pathToFileURL(resolve(process.cwd(), 'index.html')).href;

async function boot(page, seed) {
  if (seed) await page.addInitScript(s => { for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); }, seed);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => Boolean(window.CodexLounge && window.CodexLoungeConsole && window.CodexLoungeProgress && window.NetworkEngine?.LoungeEngine));
  await page.evaluate(() => window.showScreen('lobby'));
  await page.waitForFunction(() => document.querySelector('#lobby')?.classList.contains('active') && window.NetworkEngine.LoungeEngine.active);
  return errors;
}
const box = (page, sel) => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; }, sel);

test.describe('desktop layout', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the visible lounge has no embedded chat panel, but the chat dock and the ChatEngine DOM contract survive', async ({ page }) => {
    const errors = await boot(page);
    await expect(page.locator('#lobby .lobby-chat-panel')).toBeHidden();
    await expect(page.locator('#chatEngineMount')).toBeHidden();
    expect(await page.locator('#chatLog').count()).toBe(1);                         // ChatEngine still renders into it (chat-avatar.spec relies on this)
    expect(await page.locator('#loungeConsole #chatAdminBar').count()).toBe(1);    // admin broadcast moved into the console footer, same ids
    expect(await page.locator('#loungeConsole #adminBroadcastIn').count()).toBe(1);
    await page.click('#cxDockBtn');
    await expect(page.locator('#cxDock')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('console toggles with correct ARIA, keeps the room, and the roster lives inside it', async ({ page }) => {
    await boot(page);
    const btn = page.locator('#loungeConsoleBtn');
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#loungeConsole')).toBeVisible();
    await expect(page.locator('#loungeConsole #lobbyRoster')).toHaveCount(1);
    await page.evaluate(() => window.CodexLounge.setRoom('cafe'));
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#loungeConsole')).toBeHidden();
    expect(await page.evaluate(() => window.CodexLounge.room())).toBe('cafe');
    await page.click('#loungeConsoleBtn');
    await expect(page.locator('#loungeConsole')).toBeVisible();
    await page.click('#loungeConsoleClose');
    await expect(page.locator('#loungeConsole')).toBeHidden();
    await expect(btn).toBeFocused();                                                // focus is returned, not lost, when the console closes
  });

  test('console state is restored from a previous session', async ({ page }) => {
    await boot(page, { cx_lounge_ui_v1: JSON.stringify({ v: 1, console: false, tab: 'journal' }) });
    await expect(page.locator('#loungeConsole')).toBeHidden();
    await page.click('#loungeConsoleBtn');
    await expect(page.locator('#lcTab-journal')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#lcPanel-journal')).toBeVisible();
  });

  test('tabs are a real tablist: arrow keys move selection, only the active panel is shown', async ({ page }) => {
    await boot(page);
    await page.locator('#lcTab-room').focus();
    await page.keyboard.press('ArrowRight');                                         // tab order: Room, Quests, Games, Journal
    await expect(page.locator('#lcTab-quests')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#lcTab-quests')).toBeFocused();
    await expect(page.locator('#lcPanel-quests')).toBeVisible();
    await expect(page.locator('#lcPanel-room')).toBeHidden();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#lcTab-games')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#lcPanel-games')).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.locator('#lcTab-journal')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(page.locator('#lcTab-room')).toHaveAttribute('aria-selected', 'true');
  });

  test('Room tab lists real hotspots and residents, and its buttons drive the same walk path as clicking the world', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#lcPanel-room .lc-room-name')).toHaveText('Observation Deck');
    await expect(page.locator('#lcPanel-room [data-hot="scope"]')).toBeVisible();
    await page.locator('#lcPanel-room [data-hot="scope"]').click();
    expect(await page.evaluate(() => { const m = window.NetworkEngine.LoungeEngine.me; return { walk: m.walk, act: m.act && m.act.id }; })).toEqual({ walk: true, act: 'scope' });
    await page.locator('#lcPanel-room .lc-exit', { hasText: 'Starlight Café' }).click();
    await expect(page.locator('#lcPanel-room .lc-room-name')).toHaveText('Starlight Café');
    await expect(page.locator('#loungeKicker')).toContainText('STARLIGHT');
  });
});

test.describe('world focus', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('focus gives the canvas a much larger 16:10 box that fits the viewport, and keeps all world state', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => { window.CodexLounge.setRoom('garden'); });
    const before = await box(page, '#loungeCanvas');
    const me0 = await page.evaluate(() => { const m = window.NetworkEngine.LoungeEngine.me; return { room: m.room, x: m.x, y: m.y }; });
    await page.click('#loungeFocusBtn');
    await expect(page.locator('#loungeFocusBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForFunction(() => document.querySelector('.lobby-cv-wrap').style.getPropertyValue('--stage-w') !== '');
    const after = await box(page, '#loungeCanvas');
    expect(after.w).toBeGreaterThan(before.w * 1.5);
    expect(Math.abs(after.w / after.h - 1.6)).toBeLessThan(0.02);
    expect(after.b).toBeLessThanOrEqual(900);                                       // the whole stage (incl. room/emote bar) fits without scrolling
    expect((await box(page, '#lgBar')).b).toBeLessThanOrEqual(900);
    expect(await page.evaluate(() => { const m = window.NetworkEngine.LoungeEngine.me; return { room: m.room, x: m.x, y: m.y }; })).toEqual(me0);
    await page.click('#loungeFocusBtn');
    await expect(page.locator('#loungeFocusBtn')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => document.body.classList.contains('lounge-world-focus'))).toBe(false);
    expect((await box(page, '#loungeCanvas')).w).toBeCloseTo(before.w, -1);
  });

  test('focus coexists with the app-wide reading mode (body.focusmode) and the sticky top bar stays visible', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => document.body.classList.add('focusmode'));
    await page.click('#loungeFocusBtn');
    await page.waitForFunction(() => document.querySelector('.lobby-cv-wrap').style.getPropertyValue('--stage-w') !== '');
    expect((await box(page, '#loungeCanvas')).w).toBeGreaterThan(700);              // not squeezed into the 820px reading column
    const top = await box(page, '.topbar'), lobby = await box(page, '#lobby');
    expect(lobby.y).toBeGreaterThanOrEqual(top.b - 1);                              // the overlay starts below the top bar, never under it
  });

  test('the chat dock stays above the focus overlay', async ({ page }) => {
    await boot(page);
    await page.click('#loungeFocusBtn');
    await page.click('#cxDockBtn');
    await expect(page.locator('#cxDock')).toBeVisible();
    const hit = await page.evaluate(() => { const r = document.querySelector('#cxDock').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(e && e.closest('#cxDock')); });
    expect(hit).toBe(true);
  });

  test('Escape policy: other layers win, otherwise focus ends; the console panel is never closed by Escape on desktop', async ({ page }) => {
    await boot(page);
    await page.click('#loungeFocusBtn');
    // 1. dock open → Escape closes only the dock, world focus stays
    await page.click('#cxDockBtn');
    await expect(page.locator('#cxDock')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#cxDock')).toBeHidden();
    await expect(page.locator('#lobby')).toHaveClass(/is-world-focus/);
    // 2. typing in a field → Escape is not ours
    await page.evaluate(() => { const i = document.createElement('input'); i.id = 'tmpIn'; document.querySelector('#loungeStage').appendChild(i); i.focus(); });
    await page.keyboard.press('Escape');
    await expect(page.locator('#lobby')).toHaveClass(/is-world-focus/);
    await page.evaluate(() => document.getElementById('tmpIn').remove());
    // 3. a modal/dialog layer open → not ours either
    await page.evaluate(() => { const m = document.getElementById('modal'); m.hidden = false; });
    await page.keyboard.press('Escape');
    await expect(page.locator('#lobby')).toHaveClass(/is-world-focus/);
    await page.evaluate(() => { document.getElementById('modal').hidden = true; });
    // 4. nothing else open → focus ends, console untouched
    await page.keyboard.press('Escape');
    await expect(page.locator('#lobby')).not.toHaveClass(/is-world-focus/);
    await expect(page.locator('#loungeConsole')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#loungeConsole')).toBeVisible();
  });

  test('Escape never abandons a running minigame: the game handles it, focus mode stays', async ({ page }) => {
    await boot(page);
    await page.click('#loungeFocusBtn');
    await page.evaluate(() => { window.__ctl = window.CodexLoungeGames.orderUp.start({ onEnd() {}, onClose() {} }); });
    await expect(page.locator('.lgx')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.lgx')).toHaveCount(0);                              // the game's own Esc rule ran…
    await expect(page.locator('#lobby')).toHaveClass(/is-world-focus/);              // …and the same keypress did not also end world focus
  });

  test('leaving the lounge ends the overlay and returning keeps focus mode', async ({ page }) => {
    await boot(page);
    await page.click('#loungeFocusBtn');
    await page.evaluate(() => window.showScreen('home'));
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('lounge-world-focus'))).toBe(false);
    await page.evaluate(() => window.showScreen('lobby'));
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('lounge-world-focus'))).toBe(true);
  });
});

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('console starts closed, opens as a bottom sheet that Escape closes first, and the sheet is opaque', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#loungeConsole')).toBeHidden();
    await expect(page.locator('#lobbyRoster')).toHaveCount(1);                     // roster was still moved into the (closed) console, not left under the stage
    expect(await page.evaluate(() => document.querySelector('#lobbyRoster').closest('#loungeConsole') !== null)).toBe(true);
    await page.tap('#loungeConsoleBtn');
    await expect(page.locator('#loungeConsole')).toBeVisible();
    const sheet = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#loungeConsole')); return { pos: c.position, bg: c.backgroundImage }; });
    expect(sheet.pos).toBe('fixed');
    expect(sheet.bg).not.toMatch(/rgba\(/);                                         // fully opaque stops: page text must not show through
    await page.keyboard.press('Escape');
    await expect(page.locator('#loungeConsole')).toBeHidden();
    await page.tap('#loungeFocusBtn');
    await page.keyboard.press('Escape');
    await expect(page.locator('#lobby')).not.toHaveClass(/is-world-focus/);
  });

  test('phone toolbar controls are at least 44px and the world is not wider than the screen', async ({ page }) => {
    await boot(page);
    /* layout size (offsetWidth/Height), not getBoundingClientRect: the screen's enter animation applies a transform scale that skews rects by ~0.5% */
    for (const id of ['#loungeConsoleBtn', '#loungeFocusBtn']) { const sz = await page.evaluate(s => { const e = document.querySelector(s); return { w: e.offsetWidth, h: e.offsetHeight }; }, id); expect(sz.w).toBeGreaterThanOrEqual(44); expect(sz.h).toBeGreaterThanOrEqual(44); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});

test.describe('relocated chat features (dock)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Study rooms are reachable from the dock, with a validated topic and a Catch-up action', async ({ page }) => {
    await boot(page);
    await page.click('#cxDockBtn');
    await expect(page.locator('#cxDock .dk-sec', { hasText: 'Study rooms' })).toBeVisible();
    const rows = await page.locator('#cxDock [data-dk="open"][data-c^="s:"]').evaluateAll(els => els.map(e => e.getAttribute('data-c')));
    expect(rows).toEqual(['astronomy', 'physics', 'gaming-lore', 'mathematics', 'history', 'psychology'].map(t => 's:' + t));
    await page.locator('#cxDock [data-c="s:physics"]').click();
    await expect(page.locator('#cxDock .dk-t')).toHaveText('Study · physics');
    await expect(page.locator('#cxDock [data-dk="catch"]')).toBeVisible();
    await page.click('#cxDock [data-dk="back"]');
    await expect(page.locator('#cxDock [data-dk="catch"]')).toBeHidden();
  });
});

test.describe('progress ledger', () => {
  test('clean() normalises garbage, drops bad keys and never throws', async ({ page }) => {
    await boot(page);
    const out = await page.evaluate(() => {
      const c = window.CodexLoungeProgress._t.clean;
      return [c(null), c('x'), c([]), c({ v: 1, rooms: { cafe: { n: -4, t: 'x' }, 'BAD KEY': { n: 3 }, deck: { n: 2.9, t: 5 } }, games: { orderUp: { best: 'NaN', plays: 3, wins: 99999999999 } }, log: [{ x: '<script>alert(1)</script>', k: 'room', id: 'deck' }, 7], stats: { sits: '4' } })];
    });
    expect(out[0].rooms).toEqual({}); expect(out[1].v).toBe(1); expect(out[2].log).toEqual([]);
    expect(Object.keys(out[3].rooms)).toEqual(['cafe', 'deck']);
    expect(out[3].rooms.cafe.n).toBe(0); expect(out[3].rooms.deck.n).toBe(2);
    expect(out[3].games.orderUp).toMatchObject({ best: 0, plays: 3, wins: 1000000 });
    expect(out[3].log).toHaveLength(1); expect(out[3].log[0].x).not.toMatch(/[<>]/);
    expect(out[3].stats.sits).toBe(4);
  });

  test('corrupt storage is backed up and replaced; a NEWER schema is never overwritten', async ({ page }) => {
    await boot(page, { cx_lounge_world_v1: '{not json' });
    expect(await page.evaluate(() => window.CodexLoungeProgress.status())).toBe('recovered');
    expect(await page.evaluate(() => localStorage.getItem('cx_lounge_world_v1_bak'))).toBe('{not json');
    const newer = JSON.stringify({ v: 99, rooms: { cafe: { n: 5, t: 1 } } });
    await page.evaluate(n => { localStorage.setItem('cx_lounge_world_v1', n); window.CodexLoungeProgress.reload(); window.CodexLoungeProgress.visit('deck', 'Observation Deck'); }, newer);
    expect(await page.evaluate(() => window.CodexLoungeProgress.status())).toBe('newer');
    expect(await page.evaluate(() => window.CodexLoungeProgress.readonly())).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('cx_lounge_world_v1'))).toBe(newer);   // untouched
  });

  test('legacy Order Up best is imported read-only; the legacy key is not modified', async ({ page }) => {
    const legacy = JSON.stringify({ visits: {}, ai: {}, best: { orderUp: 141 }, xp: { d: '', n: 0 } });
    await boot(page, { cx_lounge_v1: legacy });
    expect(await page.evaluate(() => window.CodexLoungeProgress.get().games.orderUp.best)).toBe(141);
    expect(await page.evaluate(() => localStorage.getItem('cx_lounge_v1'))).toBe(legacy);
    await page.locator('#lcTab-games').click();
    await expect(page.locator('#lcPanel-games .lc-game')).toContainText('Order Up');
    await expect(page.locator('#lcPanel-games .lc-stats')).toContainText('141');
  });

  test('visiting rooms and game results are recorded: a real lost run via the UI, a synthetic win, and a no-progress quit', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => { window.CodexLounge.setRoom('cafe'); window.CodexLounge.setRoom('loft'); });
    // quit before any progress is not a play
    await page.evaluate(() => { window.CodexLoungeGames.orderUp.start({ onEnd() {}, onClose() {} }).quit('test'); });
    expect(await page.evaluate(() => window.CodexLoungeProgress.get().games.orderUp)).toBeUndefined();
    // a REAL lost run through the overlay (3 wrong presses) reaches the ledger through the observer hook
    await page.evaluate(() => { window.__ends = []; window.__ctl = window.CodexLoungeGames.orderUp.start({ rng: (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(), onEnd: r => window.__ends.push(r), onClose() {} }); });
    for (let k = 0; k < 3; k++) {
      await page.locator('[data-a=ready]').click();
      const s0 = await page.evaluate(() => window.__ctl.core.seq[0]);
      await page.locator('.lgx-it[data-i="' + ((s0 + 1) % 6) + '"]').click();
      if (k < 2) await expect(page.locator('[data-a=ready]')).toBeVisible({ timeout: 4000 });
    }
    await expect(page.locator('.lgx-msg')).toContainText('Out of lives');
    expect(await page.evaluate(() => window.__ends.length)).toBe(1);
    let g = await page.evaluate(() => window.CodexLoungeProgress.get().games.orderUp);
    expect(g).toMatchObject({ plays: 1, wins: 0 });
    await page.evaluate(() => window.__ctl.destroy());
    // the win branch + best-score handling (the overlay's win path is covered by lounge-games.spec.js)
    await page.evaluate(() => window.CodexLoungeProgress.gameResult('orderUp', { won: true, score: 141, rounds: 6, lives: 3, mistakes: 0, quit: false }));
    g = await page.evaluate(() => window.CodexLoungeProgress.get().games.orderUp);
    expect(g).toMatchObject({ plays: 2, wins: 1, best: 141 });
    await page.evaluate(() => window.CodexLoungeProgress.gameResult('orderUp', { won: false, score: 12, rounds: 1, lives: 0, mistakes: 3, quit: false }));
    expect((await page.evaluate(() => window.CodexLoungeProgress.get().games.orderUp)).best).toBe(141);    // best never goes down
    const d = await page.evaluate(() => window.CodexLoungeProgress.get());
    expect(Object.keys(d.rooms).sort()).toEqual(['cafe', 'deck', 'loft']);
    expect(d.log.filter(e => e.k === 'room')).toHaveLength(3);
    expect(d.log.filter(e => e.k === 'game').length).toBe(3);
    await page.locator('#lcTab-journal').click();
    await expect(page.locator('#lcPanel-journal .lc-count').first()).toHaveText('3/8');
    page.once('dialog', dlg => dlg.accept());
    await page.locator('#lcPanel-journal [data-act="reset"]').click();
    await expect(page.locator('#lcPanel-journal .lc-count').first()).toHaveText('0/8');
  });
});
