/* Order Up: full playthroughs (win / lose / replay), timers, keyboard, focus, reduced motion and cleanup. Uses a fake clock for determinism. */
const { test, expect } = require('@playwright/test');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, 'fixtures/lounge-games.html');

async function begin(page, o) {
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.__errs = errs;
  await page.clock.install({ time: new Date('2026-10-17T12:00:00Z') });
  if (o && o.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.clock.pauseAt(new Date('2026-10-17T12:00:30Z'));            /* time now moves ONLY when a test calls runFor() */
  await page.evaluate(() => { window.__end = []; document.getElementById('opener').focus(); window.__ctl = CodexLoungeGames.orderUp.start({ rng: mulberry32(5), onEnd: r => __end.push(r) }); });
}
const seq = page => page.evaluate(() => __ctl.core.seq.slice());
const item = (page, i) => page.locator('.lgx-it[data-i="' + i + '"]');
async function clearTicket(page) { await page.locator('[data-a=ready]').click(); for (const i of await seq(page)) await item(page, i).click(); }
async function wrongPress(page) { const s = await seq(page); await item(page, (s[0] + 1) % 6).click(); }

test('perfect run wins all 6 tickets with the documented score', async ({ page }) => {
  await begin(page);
  for (let r = 0; r < 6; r++) { await expect(page.locator('.lgx-round')).toContainText('Ticket ' + (r + 1) + ' of 6'); await clearTicket(page); if (r < 5) await page.clock.runFor(1000); }
  await expect(page.locator('.lgx-msg')).toContainText('Shift complete');
  expect(await page.evaluate(() => __end)).toEqual([{ won: true, score: 141, rounds: 6, lives: 3, mistakes: 0, quit: false }]);   /* Σ(10+2·len, len 3..8)=126 + 5·3 lives */
  await expect(page.locator('[data-a=again]')).toBeVisible(); await expect(page.locator('[data-a=ready]')).toBeHidden();
});

test('three mistakes lose; the run reports once; play again starts fresh', async ({ page }) => {
  await begin(page);
  for (let k = 0; k < 3; k++) { await page.locator('[data-a=ready]').click(); await wrongPress(page); if (k < 2) { await expect(page.locator('.lgx-msg')).toContainText('left'); await page.clock.runFor(1300); await expect(page.locator('.lgx-round')).toContainText('Ticket 1 of 6'); } }
  await expect(page.locator('.lgx-msg')).toContainText('Out of lives');
  let end = await page.evaluate(() => __end); expect(end).toHaveLength(1); expect(end[0]).toMatchObject({ won: false, lives: 0, rounds: 0, mistakes: 3, quit: false });
  expect(await page.locator('.lgx-it:disabled').count()).toBe(6);
  await page.locator('[data-a=again]').click();
  await expect(page.locator('.lgx-hearts')).toHaveAttribute('aria-label', '3 of 3 lives left'); await expect(page.locator('.lgx-round')).toContainText('Ticket 1 of 6');
  await page.locator('[data-a=quit]').click();                                    /* quit mid-run after a replay */
  end = await page.evaluate(() => __end); expect(end).toHaveLength(2); expect(end[1].quit).toBe(true);
  await expect(page.locator('.lgx')).toHaveCount(0);
});

test('the memorize window ends on its own; input is locked while memorizing', async ({ page }) => {
  await begin(page);
  expect(await page.locator('.lgx-it:disabled').count()).toBe(6);
  await page.clock.runFor(3400); expect(await page.evaluate(() => __ctl.core.phase)).toBe('show');      /* showMs(3) = 3450 */
  await page.clock.runFor(100);  expect(await page.evaluate(() => __ctl.core.phase)).toBe('input');
  await expect(page.locator('[data-a=ready]')).toBeHidden(); expect(await page.locator('.lgx-it:disabled').count()).toBe(0);
});

test('keyboard: 1-6 play, Esc quits once and focus returns', async ({ page }) => {
  await begin(page); await page.locator('[data-a=ready]').click();
  const s = await seq(page); await page.keyboard.press(String(s[0] + 1)); await expect(page.locator('.lgx-ticket li.on')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.lgx')).toHaveCount(0);
  const end = await page.evaluate(() => __end); expect(end).toHaveLength(1); expect(end[0].quit).toBe(true);
  expect(await page.evaluate(() => document.activeElement.id)).toBe('opener');
});

test('dialog semantics and a focus trap', async ({ page }) => {
  await begin(page);
  await expect(page.locator('.lgx')).toHaveAttribute('role', 'dialog'); await expect(page.locator('.lgx')).toHaveAttribute('aria-modal', 'true'); await expect(page.locator('.lgx-msg')).toHaveAttribute('aria-live', 'polite');
  for (let k = 0; k < 8; k++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement.closest('.lgx'))).toBe(true); }
  await page.keyboard.press('Shift+Tab'); expect(await page.evaluate(() => !!document.activeElement.closest('.lgx'))).toBe(true);
});

test('destroy() releases timers, listeners and the overlay; nothing fires afterwards', async ({ page }) => {
  await begin(page);
  await page.evaluate(() => { __ctl.destroy(); __ctl.destroy(); });
  await page.clock.runFor(30000);
  await expect(page.locator('.lgx')).toHaveCount(0);
  expect(await page.evaluate(() => __end.length)).toBe(0);
  await page.keyboard.press('1'); await page.keyboard.press('Escape');
  expect(page.__errs).toEqual([]);
});

test('reduced motion: no animated bar and a doubled memorize window', async ({ page }) => {
  await begin(page, { reduced: true });
  expect(await page.evaluate(() => __ctl.reduced)).toBe(true); await expect(page.locator('.lgx-bar')).toBeHidden();
  await page.clock.runFor(3500); expect(await page.evaluate(() => __ctl.core.phase)).toBe('show');       /* would already be over without the doubling */
  await page.clock.runFor(3500); expect(await page.evaluate(() => __ctl.core.phase)).toBe('input');
});

test('rules core: no item three times in a row, degenerate rng terminates, wrong input costs exactly one life', async ({ page }) => {
  await begin(page);
  const r = await page.evaluate(() => {
    const G = CodexLoungeGames.orderUp; let triples = 0, short = 0;
    for (let n = 1; n <= 500; n++) { const s = G.makeSeq(8, mulberry32(n)); if (s.length !== 8) short++; for (let i = 2; i < s.length; i++) if (s[i] === s[i - 1] && s[i] === s[i - 2]) triples++; }
    const degenerate = G.makeSeq(8, () => 0).length;                          /* a constant rng must not hang */
    const c = new G.Core(mulberry32(1)); c.deal(); c.recall(); const bad = (c.seq[0] + 1) % 6;
    return { triples, short, degenerate, first: c.press(bad), lives: c.lives, ignored: c.press(0) };
  });
  expect(r).toEqual({ triples: 0, short: 0, degenerate: 8, first: 'wrong', lives: 2, ignored: null });
});
