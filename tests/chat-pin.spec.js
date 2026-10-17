/* Regression: pinning a message must show a compact pinned bar ABOVE the log, never a flex sibling that
   swallows the chat area (the floating dock's .dk-chat used to be a row flexbox). Drives the real social.js
   click handlers (data-pin / data-reply / data-pick) against the real stylesheets. */
const { test, expect } = require('@playwright/test');
const path = require('path');
const url = (q) => 'file://' + path.resolve(__dirname, 'fixtures/chat-pin.html') + (q || '');

const SURFACES = [
  { name: 'floating dock', root: '#cxDock', log: '.dk-log' },
  { name: 'main lounge chat', root: '#mainPanel', log: '#chatLog' }
];
const box = async (loc) => loc.evaluate(e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; });

for (const S of SURFACES) {
  test.describe(S.name, () => {
    test.beforeEach(async ({ page }) => { await page.goto(url()); });

    test('pin shows a compact bar above an intact log; unpin restores it', async ({ page }) => {
      const root = page.locator(S.root), log = root.locator(S.log), msg = (id) => log.locator('.cm[data-id="' + id + '"]');
      const before = await box(log);
      await msg('m2').hover();
      await msg('m2').locator('[data-pin]').click();
      const bar = root.locator('.cpinbar');
      await expect(bar).toBeVisible();
      await expect(msg('m2')).toHaveClass(/pinned/);
      const b = await box(bar), l = await box(log), m = await box(msg('m2'));
      expect(b.h, 'bar stays a one-line preview').toBeLessThan(60);
      expect(b.b, 'bar sits above the log, not beside it').toBeLessThanOrEqual(l.y + 1);
      expect(l.w, 'log keeps its width').toBeGreaterThan(before.w * 0.9);
      expect(l.h, 'log keeps most of its height').toBeGreaterThan(before.h * 0.6);
      expect(m.w).toBeGreaterThan(100); expect(m.h).toBeLessThan(250);
      await expect(bar).toContainText('Study room opens');
      /* unpin from the same hover bar */
      await msg('m2').hover();
      await msg('m2').locator('[data-pin]').click();
      await expect(bar).toBeHidden();
      await expect(log.locator('.cm.pinned')).toHaveCount(0);
      const after = await box(log);
      expect(Math.abs(after.w - before.w)).toBeLessThan(2); expect(Math.abs(after.h - before.h)).toBeLessThan(2);
    });

    test('hover action bar still works on and around the pinned message', async ({ page }) => {
      const root = page.locator(S.root), log = root.locator(S.log), msg = (id) => log.locator('.cm[data-id="' + id + '"]');
      await msg('m3').hover(); await msg('m3').locator('[data-pin]').click();            /* pin the OTHER message */
      await expect(msg('m3')).toHaveClass(/pinned/);
      for (const id of ['m3', 'm2']) {
        await msg(id).hover();
        const act = msg(id).locator('.cact');
        await expect(act).toHaveCSS('opacity', '1');
        const a = await box(act), r = await box(root);
        expect(a.w, id + ' action bar is compact').toBeLessThan(220);
        expect(a.x).toBeGreaterThanOrEqual(r.x); expect(a.r).toBeLessThanOrEqual(r.r + 1);
      }
      /* reply + react still wired */
      await msg('m3').hover(); await msg('m3').locator('[data-reply]').click();
      expect(await page.evaluate(() => CX.replies.pop().i)).toBe('m3');
      await msg('m3').hover(); await msg('m3').locator('[data-pick]').click();
      await expect(msg('m3')).toHaveClass(/picking/);
      await expect(msg('m3').locator('.cpick')).toBeVisible();
    });

    test('clicking the pinned bar jumps to the message', async ({ page }) => {
      const root = page.locator(S.root), log = root.locator(S.log), msg = (id) => log.locator('.cm[data-id="' + id + '"]');
      await msg('m1').hover(); await msg('m1').locator('[data-pin]').click();
      await root.locator('.cpinbar').click();
      await expect(msg('m1')).toHaveClass(/flash/);
    });
  });
}

test('log still scrolls with a pin on a long conversation (dock)', async ({ page }) => {
  await page.goto(url('?many=1'));
  const log = page.locator('#cxDock .dk-log');
  await log.locator('.cm[data-id="m2"]').scrollIntoViewIfNeeded();
  await log.locator('.cm[data-id="m2"]').hover(); await log.locator('.cm[data-id="m2"] [data-pin]').click();
  await expect(page.locator('#cxDock .cpinbar')).toBeVisible();
  const s = await log.evaluate(e => { e.scrollTop = 0; const a = e.scrollTop; e.scrollTop = 99999; return { overflowY: getComputedStyle(e).overflowY, scrollable: e.scrollHeight > e.clientHeight + 100, moved: e.scrollTop > a + 100 }; });
  expect(s).toEqual({ overflowY: 'auto', scrollable: true, moved: true });
});

test('dock layout holds on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(url());
  const log = page.locator('#cxDock .dk-log'), before = await box(log);
  await log.locator('.cm[data-id="m2"]').hover(); await log.locator('.cm[data-id="m2"] [data-pin]').click();
  const bar = await box(page.locator('#cxDock .cpinbar')), l = await box(log);
  expect(bar.h).toBeLessThan(60); expect(l.w).toBeGreaterThan(before.w * 0.9); expect(bar.b).toBeLessThanOrEqual(l.y + 1);
});

for (const S of SURFACES) {
  test(S.name + ': hover action bar clears your own first line and stays inside the log', async ({ page }) => {
    await page.goto(url());
    const root = page.locator(S.root), log = root.locator(S.log), mine = log.locator('.cm.mine[data-id="m2"]');
    await mine.hover();
    const r = await mine.evaluate(cm => {
      const a = cm.querySelector('.cact').getBoundingClientRect(), t = cm.querySelector('.ctx').getBoundingClientRect();
      const logBox = cm.closest('.chat-log, .dk-log').getBoundingClientRect();
      return { overlaps: a.bottom > t.top + 0.5, aboveLog: a.top >= logBox.top - 0.5 };
    });
    expect(r.overlaps, 'action bar must not cover the first line').toBe(false);
    expect(r.aboveLog, 'action bar must not be clipped by the scroller').toBe(true);
  });
}
