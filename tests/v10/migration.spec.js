'use strict';

const { test, expect } = require('@playwright/test');

const LEGACY = {
  polymath_codex_v1: JSON.stringify({
    xp: 240,
    completed: { 's1-1': true, 's2-4': true },
    seen: { 's1-1': true, 's1-2': true },
    known: ['ratio', 'unit rate']
  }),
  cx_lounge_world_v1: JSON.stringify({ v: 1, rooms: { kitchen: { visits: 3 } }, probes: 12, energy: 4 }),
  cx_v5_srs: JSON.stringify({ q1: { b: 2, d: 20000 }, q2: { b: 0, d: 19999 } })
};

async function seed(page, values) {
  const marker = 'cx_seed_' + Date.now() + '_' + Math.random();
  await page.addInitScript(({ vals, mark }) => {
    try {
      if (sessionStorage.getItem(mark)) return;
      localStorage.clear();
      Object.keys(vals).forEach((k) => localStorage.setItem(k, vals[k]));
      sessionStorage.setItem(mark, '1');
    } catch (e) { /* storage unavailable in this context */ }
  }, { vals: values, mark: marker });
  await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
}

test.describe('migration and storage @v10', () => {
  test('legacy import is backed up, shown, idempotent and never rewrites the source keys', async ({ page }) => {
    await seed(page, LEGACY);
    await page.goto('/app.html#/');
    await page.waitForTimeout(500);
    await expect(page.locator('.legacy-notice')).toBeVisible();
    const rawBefore = await page.evaluate(() => ({
      c: localStorage.getItem('polymath_codex_v1'),
      l: localStorage.getItem('cx_lounge_world_v1'),
      r: localStorage.getItem('cx_v5_srs')
    }));
    expect(rawBefore.c).toBe(LEGACY.polymath_codex_v1);
    expect(rawBefore.l).toBe(LEGACY.cx_lounge_world_v1);
    expect(rawBefore.r).toBe(LEGACY.cx_v5_srs);
    const saved = await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('cx_v10_progress'));
      return {
        charted: Object.keys(p.legacy.charted),
        importedAt: p.legacy.importedAt,
        bak: !!localStorage.getItem('cx_v10_progress_bak'),
        snapshots: Object.keys(localStorage).filter(k => k.startsWith('cx_legacy_snapshot_')),
        xpEvents: Object.keys(p.xp).length
      };
    });
    expect(saved.charted.sort()).toEqual(['s1-1', 's2-4']);
    expect(saved.importedAt).toBeTruthy();
    expect(saved.bak).toBe(true);
    expect(saved.snapshots.length).toBeGreaterThanOrEqual(3);
    expect(saved.xpEvents).toBe(1);
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator('.legacy-notice')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.legacy-notice')).toHaveCount(0);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('cx_v10_progress')));
    expect(Object.keys(after.xp).length).toBe(saved.xpEvents);
    expect(after.legacy.importedAt).toBe(saved.importedAt);
    expect(await page.evaluate(() => localStorage.getItem('polymath_codex_v1'))).toBe(LEGACY.polymath_codex_v1);
  });

  test('charted legacy lessons show in the Wreck list and are never reset', async ({ page }) => {
    await seed(page, { polymath_codex_v1: LEGACY.polymath_codex_v1 });
    await page.goto('/app.html#/map');
    await page.waitForTimeout(400);
    const row = page.locator('.wreck-lesson', { hasText: 'The Layer Cake of Digital Abstraction' });
    await expect(row.locator('.wl-status')).toHaveText('Charted (legacy)');
    const raw = await page.evaluate(() => localStorage.getItem('polymath_codex_v1'));
    expect(raw).toBe(LEGACY.polymath_codex_v1);
  });

  test('corrupt progress keeps the raw bytes, copies them aside and shows a banner', async ({ page }) => {
    await seed(page, { cx_v10_progress: '{"v":2,"dives":' });
    await page.goto('/app.html#/map');
    await expect(page.locator('.banner')).toBeVisible();
    await expect(page.locator('.banner')).toContainText('old save was damaged');
    const data = await page.evaluate(() => ({
      raw: localStorage.getItem('cx_v10_progress'),
      copies: Object.keys(localStorage).filter(k => k.startsWith('cx_v10_progress_corrupt_')).length
    }));
    expect(data.raw).toBe('{"v":2,"dives":');
    expect(data.copies).toBeGreaterThanOrEqual(1);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('.banner')).toBeHidden();
  });

  test('a newer schema opens read-only and writes nothing', async ({ page }) => {
    const newer = JSON.stringify({ v: 99, dives: {}, units: {}, wrecks: {}, concepts: {}, reviews: {}, xp: {}, goal: { daily: 1, days: {} }, collection: {}, prefs: {} });
    await seed(page, { cx_v10_progress: newer });
    await page.goto('/app.html#/map');
    await expect(page.locator('.banner')).toContainText('read-only');
    await page.goto('/app.html#/dive/ratios-d1/c1');
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => localStorage.getItem('cx_v10_progress'))).toBe(newer);
    await expect(page.locator('.banner')).toContainText('read-only');
  });

  test('a storage failure shows Couldn’t save, never Saved or Synced', async ({ page }) => {
    await page.addInitScript(() => {
      const proto = Storage.prototype;
      proto.setItem = function () {
        const e = new Error('quota');
        e.name = 'QuotaExceededError';
        throw e;
      };
    });
    await page.goto('/app.html#/dive/ratios-d1/c1');
    await page.waitForTimeout(800);
    await expect(page.locator('.save-chip .save-label')).toHaveText("Couldn't save");
    await expect(page.locator('.banner')).toContainText('Couldn’t save');
    const text = await page.locator('body').innerText();
    expect(text).not.toContain('Synced');
    expect(text).not.toContain('Saved on this device');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('.banner')).toContainText('Couldn’t save');
  });
});
