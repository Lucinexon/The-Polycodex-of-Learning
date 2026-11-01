'use strict';

const { test, expect } = require('@playwright/test');

test.describe('@v10 Lounge two-way return', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);
  const legacyReady = { timeout: 20000 };

  test('a dive opens the Kitchen and returns to the exact card', async ({ page }) => {
    await page.goto('/app.html#/dive/ratios-d3/c4');
    await expect(page.locator('#dive-title')).toHaveText('Rates can be fractions');
    await expect(page.locator('.lounge-open')).toBeVisible(legacyReady);

    await page.locator('.lounge-open').click();
    await expect(page).toHaveURL(/index\.html\?ui=legacy&from=v10&.*room=kitchen/);
    await expect(page.locator('#v10ReturnBanner')).toBeVisible(legacyReady);
    await expect(page.locator('#v10ReturnBanner a')).toHaveAttribute('href', 'app.html#/dive/ratios-d3/c4');
    await expect(page.locator('#lobby')).toHaveClass(/active/, legacyReady);
    await expect.poll(() => page.evaluate(() => window.CodexLounge && window.CodexLounge.room())).toBe('kitchen', legacyReady);

    // The Kitchen hosts the same Tune activity and records its first clear
    // through CodexProgress. A second visit must not pay the first-clear XP again.
    async function scaleRecipe() {
      await expect(page.locator('#v10KitchenPractice input')).toHaveCount(3, legacyReady);
      await page.fill('#v10KitchenPractice input[data-name="rice"]', '2.5');
      await page.fill('#v10KitchenPractice input[data-name="stock"]', '5');
      await page.fill('#v10KitchenPractice input[data-name="lemon"]', '2.5');
      await page.locator('#v10KitchenPractice button').click();
      await expect(page.locator('#v10KitchenPractice')).toContainText('Saved to this dive once.');
    }
    await scaleRecipe();
    const first = await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('cx_v10_progress'));
      return {
        ok: p.dives['ratios-d3'].activity.state.ok,
        template: p.dives['ratios-d3'].activity.state.template,
        xp: Object.keys(p.xp).filter((k) => k.indexOf('act:ratios-d3:tune') === 0).length
      };
    });
    expect(first).toEqual({ ok: true, template: 'tune', xp: 1 });

    await page.reload();
    await expect(page.locator('#v10KitchenPractice input')).toHaveCount(3, legacyReady);
    await scaleRecipe();
    const second = await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('cx_v10_progress'));
      return Object.keys(p.xp).filter((k) => k.indexOf('act:ratios-d3:tune') === 0).length;
    });
    expect(second).toBe(1);

    await page.locator('#v10ReturnBanner a').click();
    await expect(page).toHaveURL(/#\/dive\/ratios-d3\/c4$/);
    await expect(page.locator('#dive-title')).toHaveText('Rates can be fractions');
  });

  test('the Lounge Kitchen entry returns to the Lounge without pretending it came from a dive', async ({ page }) => {
    await page.goto('/app.html#/lounge');
    await page.locator('[data-action="open-kitchen"]').click();
    await expect(page).toHaveURL(/index\.html\?ui=legacy&from=v10&.*room=kitchen/);
    await expect(page.locator('#v10ReturnBanner')).toContainText('You came from v10. The Kitchen is open', legacyReady);
    await expect(page.locator('#v10ReturnBanner a')).toHaveText('Back to Polycodex');
    await expect(page.locator('#v10ReturnBanner a')).toHaveAttribute('href', 'app.html#/lounge');
    await page.locator('#v10ReturnBanner a').click();
    await expect(page).toHaveURL(/#\/lounge$/);
  });

  test('inline practice still completes when the legacy Lounge scripts fail', async ({ page }) => {
    await page.route('**/js/features/lounge2.js', (route) => route.abort());
    await page.goto('/app.html#/dive/ratios-d3/c4');
    await expect(page.locator('#dive-title')).toHaveText('Rates can be fractions');

    await expect(page.locator('#practice-host .tune-input')).toHaveCount(3, legacyReady);
    await page.fill('#practice-host input[data-name="rice"]', '2.5');
    await page.fill('#practice-host input[data-name="stock"]', '5');
    await page.fill('#practice-host input[data-name="lemon"]', '2.5');
    await page.locator('#practice-host .act-check').click();
    await expect(page.locator('#practice-host')).toContainText('Scaled correctly');
    await expect(page.locator('#practice-host')).toContainText('Practice complete');

    await page.locator('.lounge-open').click();
    await expect(page).toHaveURL(/index\.html\?ui=legacy&from=v10/);
    await expect(page.locator('#v10ReturnBanner')).toBeVisible(legacyReady);
    await page.locator('#v10ReturnBanner a').click();
    await expect(page).toHaveURL(/#\/dive\/ratios-d3\/c4$/);
    await expect(page.locator('#dive-title')).toHaveText('Rates can be fractions');
  });
});
