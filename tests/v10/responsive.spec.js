'use strict';

const { test, expect } = require('@playwright/test');

const TAG = '@v10';

async function fresh(page) {
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('cx_a11y_seed')) return;
      localStorage.clear();
      sessionStorage.setItem('cx_a11y_seed', '1');
    } catch (e) { /* private mode */ }
  });
  await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(320);
}

async function noOverflow(page) {
  const delta = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(delta).toBeLessThanOrEqual(1);
}

test.describe('responsive and accessibility ' + TAG, () => {
  test('narrow screens keep one column and never scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await fresh(page);
    await expect(page.locator('h1.pixel-logo')).toBeVisible();
    await noOverflow(page);

    await page.goto('/app.html#/onboarding');
    await expect(page.locator('.reef-tile')).toHaveCount(6);
    await noOverflow(page);

    await page.goto('/app.html#/map');
    await expect(page.locator('.wreck-lesson')).toHaveCount(42);
    await noOverflow(page);

    await page.goto('/app.html#/reef/number/shallows');
    await expect(page.locator('#unit-title')).toHaveText('Ratios');
    await expect(page.locator('#screen h1')).toHaveCount(1);
    await noOverflow(page);

    await page.goto('/app.html#/logbook/progress');
    await expect(page.locator('.logbook-tabs a')).toHaveCount(7);
    await noOverflow(page);

    await page.goto('/app.html#/search?q=ratio');
    await expect(page.locator('.search-row').first()).toBeVisible();
    await noOverflow(page);
  });

  test('dive chrome stays fixed, the card scrolls inside, and 130% text does not clip', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await fresh(page);
    await page.goto('/app.html#/dive/ratios-d1/c1');
    await expect(page.locator('#dive-title')).toBeVisible();
    await page.waitForTimeout(220);

    const top = await page.locator('.dive-top').boundingBox();
    const bottom = await page.locator('.dive-bottom').boundingBox();
    expect(top.y).toBeLessThanOrEqual(1);
    expect(top.height).toBeGreaterThanOrEqual(44);
    expect(bottom.y + bottom.height).toBeLessThanOrEqual(641);
    await noOverflow(page);

    const body = await page.evaluate(() => {
      const el = document.getElementById('dive-body');
      return { overflow: getComputedStyle(el).overflowY, sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth };
    });
    expect(['auto', 'scroll']).toContain(body.overflow);
    expect(body.ch).toBeGreaterThan(200);
    expect(body.sh).toBeGreaterThanOrEqual(body.ch);
    expect(body.sw).toBeLessThanOrEqual(body.cw + 1);

    await page.evaluate(() => { document.documentElement.dataset.text = '3'; });
    await page.waitForTimeout(100);
    await noOverflow(page);
    const topAfter = await page.locator('.dive-top').boundingBox();
    const bottomAfter = await page.locator('.dive-bottom').boundingBox();
    expect(topAfter.y).toBeLessThanOrEqual(1);
    expect(bottomAfter.y + bottomAfter.height).toBeLessThanOrEqual(641);
    await expect(page.locator('#dive-title')).toBeVisible();
  });

  test('wide dive keeps the outline rail and the Lantern pushes the slate', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await fresh(page);
    await page.goto('/app.html#/dive/ratios-d1/c2');
    await expect(page.locator('.dive-outline')).toBeVisible();
    await noOverflow(page);
    const before = await page.locator('.dive-body').boundingBox();
    await page.keyboard.press('h');
    await expect(page.locator('#lantern')).toHaveAttribute('aria-hidden', 'false');
    const after = await page.locator('.dive-body').boundingBox();
    // At 1280 the slate is already at its 680px cap; the drawer pushes it left rather than narrowing it.
    expect(after.x).toBeLessThan(before.x - 10);
    await noOverflow(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#lantern')).toHaveAttribute('aria-hidden', 'true');
  });

  test('keyboard focus, live announcements, landmarks and labels are complete', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fresh(page);
    await expect(page.locator('[data-autofocus]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen h1')).toContainText('Choose where to start');
    await expect(page.locator('[data-autofocus]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#dive-title')).toBeVisible();
    await expect(page.locator('#dive-title')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#dive-title')).toHaveText('Part-to-part, or part-to-whole');
    await expect(page.locator('#live')).toContainText('Card 2 of 4');
    await page.keyboard.press('h');
    await expect(page.locator('#lantern')).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Escape');
    await expect(page.locator('#lantern')).toHaveAttribute('aria-hidden', 'true');
    await page.keyboard.press('o');
    await expect(page.locator('.sheet[role="dialog"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.sheet[role="dialog"]')).toHaveCount(0);
    await page.keyboard.press('2');
    await expect(page.locator('.feedback')).toContainText('Correct.');

    const unlabeled = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).filter((b) => {
        if (b.offsetParent === null) return false;
        const text = (b.textContent || '').trim();
        return !text && !b.getAttribute('aria-label') && !b.getAttribute('title');
      }).length;
    });
    expect(unlabeled).toBe(0);
    await expect(page.locator('main#screen')).toHaveCount(1);
    await expect(page.locator('#live')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('.skip-link')).toHaveAttribute('href', '#screen');
  });

  test('reduced motion selects the low tier and still completes a card change', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await fresh(page);
    await page.goto('/app.html#/dive/ratios-d1/c1');
    await expect(page.locator('html')).toHaveAttribute('data-reduced', '1');
    await expect(page.locator('html')).toHaveAttribute('data-fx', 'low');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#dive-title')).toHaveText('Part-to-part, or part-to-whole');
    await noOverflow(page);
  });
});
