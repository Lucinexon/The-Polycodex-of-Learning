'use strict';

const { test, expect } = require('@playwright/test');

async function fresh(page, hash = '') {
  await page.goto('/app.html' + hash);
  await page.evaluate(() => localStorage.clear());
  await page.goto('/app.html' + hash);
  await page.waitForTimeout(120);
}

async function startDive(page) {
  await fresh(page, '#/dive/ratios-d1/c1');
  await expect(page.locator('#dive-title')).toHaveText('A ratio compares two amounts');
}

async function answerSurfaceChecks(page) {
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.check-step')).toContainText(`Check ${i + 1} of 3`);
    await page.locator('.surface-options .option').first().click();
    await expect(page.locator('.explain')).toBeVisible();
    await page.locator('[data-action="surface-next"]').click();
  }
}

test.describe('@v10 v10 shell and golden path', () => {
  test('title, onboarding, first dive, surface and next dive', async ({ page }) => {
    await fresh(page);
    await expect(page.locator('h1.pixel-logo')).toHaveText('POLYCODEX');
    await expect(page.getByRole('button', { name: /Begin/ })).toBeFocused();
    await page.getByRole('button', { name: /Begin/ }).click();
    await expect(page).toHaveURL(/#\/onboarding$/);
    await expect(page.getByRole('heading', { name: 'Choose where to start.' })).toBeVisible();
    await expect(page.locator('.reef-tile')).toHaveCount(6);
    await expect(page.locator('.reef-tile:not([disabled])')).toHaveCount(1);
    await page.getByRole('button', { name: /Start diving/ }).click();
    await expect(page).toHaveURL(/#\/dive\/ratios-d1\/c1$/);
    await expect(page.locator('#dive-title')).toHaveText('A ratio compares two amounts');
    await expect(page.locator('.dive-progress .count')).toHaveText('1 / 4');
    await expect(page.locator('.prompt .option')).toHaveCount(4);

    await page.locator('.prompt .option').first().click();
    await expect(page.locator('.feedback')).toContainText('Correct.');
    await page.locator('[data-action="dive-next"]').click();
    await expect(page.locator('#dive-title')).toHaveText('Part-to-part, or part-to-whole');
    await page.locator('.prompt .option[data-opt="1"]').click();
    await expect(page.locator('.feedback')).toContainText('Correct.');
    await page.locator('[data-action="dive-next"]').click();
    await expect(page.locator('#dive-title')).toHaveText('Scale a batch');
    await page.locator('#prompt-fill-input').fill('4:2');
    await page.locator('[data-action="prompt-check"]').click();
    await expect(page.locator('.feedback')).toContainText('Correct.');
    await page.locator('[data-action="dive-next"]').click();
    await expect(page.locator('#dive-title')).toHaveText('Ratios are not always counts');
    await page.locator('.prompt .option').first().click();
    await page.locator('[data-action="dive-next"]').click();
    await expect(page).toHaveURL(/#\/surface\/ratios-d1$/);
    await expect(page.getByRole('heading', { name: 'Three checks.' })).toBeVisible();
    await answerSurfaceChecks(page);
    await expect(page.getByRole('heading', { name: 'You surfaced.' })).toBeVisible();
    await expect(page.locator('.results-stamp')).toHaveText('SURFACED');
    await expect(page.locator('.review-added')).toContainText('3 review cards added');
    await expect(page.locator('.collect-reveal')).toBeVisible();
    await page.waitForTimeout(400);

    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('cx_v10_progress')));
    expect(state.dives['ratios-d1'].status).toBe('surfaced');
    expect(Object.keys(state.dives['ratios-d1'].checks)).toHaveLength(3);
    expect(state.collection['measuring-cup']).toBeTruthy();
    expect(state.goal.days[Object.keys(state.goal.days)[0]]).toBe(1);

    await page.reload();
    await expect(page.locator('.results-stamp')).toHaveText('SURFACED');
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('cx_v10_progress')));
    expect(after.goal.days[Object.keys(after.goal.days)[0]]).toBe(1);
    expect(Object.keys(after.reviews).filter(id => id.startsWith('v10:ratios-d1:')).length).toBe(3);

    await page.getByRole('link', { name: /Next dive: Equivalent ratios/ }).click();
    await expect(page).toHaveURL(/#\/dive\/ratios-d2\/c1$/);
    await expect(page.locator('#dive-title')).toHaveText('Multiply both parts');
  });

  test('card refresh, exact continue location and replay never changes status', async ({ page }) => {
    await startDive(page);
    await page.locator('[data-action="dive-next"]').click();
    await expect(page.locator('#dive-title')).toHaveText('Part-to-part, or part-to-whole');
    await page.reload();
    await expect(page.locator('#dive-title')).toHaveText('Part-to-part, or part-to-whole');
    await expect(page.locator('.dive-progress .count')).toHaveText('2 / 4');

    await page.goto('/app.html#/');
    await expect(page.locator('.continue-where')).toContainText('Number Reef · Shallows · Ratios · Dive 1 · Card 2 of 4', { timeout: 6000 });
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page).toHaveURL(/#\/dive\/ratios-d1\/c2$/);

    // Finish this dive quickly, then replay from the Descent list.
    await page.locator('.prompt .option[data-opt="1"]').click();
    await page.locator('[data-action="dive-next"]').click();
    await page.locator('#prompt-fill-input').fill('4:2');
    await page.locator('[data-action="prompt-check"]').click();
    await page.locator('[data-action="dive-next"]').click();
    await page.locator('.prompt .option').first().click();
    await page.locator('[data-action="dive-next"]').click();
    await answerSurfaceChecks(page);
    await page.waitForTimeout(400);
    const xpBefore = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('cx_v10_progress'));
      return Object.keys(s.xp).length;
    });
    await page.goto('/app.html#/reef/number/shallows');
    await expect(page.locator('.dive-list li').first().getByRole('button', { name: 'Replay' })).toBeVisible({ timeout: 6000 });
    await page.locator('.dive-list li').first().getByRole('button', { name: 'Replay' }).click();
    await expect(page).toHaveURL(/#\/dive\/ratios-d1\/c1$/);
    const after = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('cx_v10_progress'));
      return { status: s.dives['ratios-d1'].status, xp: Object.keys(s.xp).length, card: s.dives['ratios-d1'].cardId };
    });
    expect(after.status).toBe('surfaced');
    expect(after.xp).toBe(xpBefore);
    expect(after.card).toBe('c4');
  });

  test('keyboard, lantern and outline work without a pointer', async ({ page }) => {
    await startDive(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#dive-title')).toHaveText('Part-to-part, or part-to-whole');
    await page.keyboard.press('h');
    await expect(page.locator('#lantern')).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#lantern')).not.toHaveClass(/open/);
    await page.keyboard.press('o');
    await expect(page.locator('.sheet')).toBeVisible();
    await expect(page.locator('.sheet .outline-sheet-card')).toHaveCount(4);
    await page.keyboard.press('Escape');
    await expect(page.locator('.sheet')).toHaveCount(0);
    await page.keyboard.press('2');
    await expect(page.locator('.feedback')).toContainText('Correct.');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#dive-title')).toHaveText('A ratio compares two amounts');
  });

  test('surface resumes at the first unanswered check and never surfaces early', async ({ page }) => {
    await startDive(page);
    await page.goto('/app.html#/surface/ratios-d1');
    await expect(page.locator('.check-step')).toContainText('Check 1 of 3');
    await page.locator('.surface-options .option').first().click();
    await expect(page.locator('.explain')).toBeVisible();
    let state = await page.evaluate(() => JSON.parse(localStorage.getItem('cx_v10_progress')));
    expect(state.dives['ratios-d1'].status).toBe('in_progress');
    await page.reload();
    await expect(page.locator('.check-step')).toContainText('Check 2 of 3');
    state = await page.evaluate(() => JSON.parse(localStorage.getItem('cx_v10_progress')));
    expect(state.dives['ratios-d1'].status).toBe('in_progress');
    await page.locator('.surface-options .option').first().click();
    await page.locator('[data-action="surface-next"]').click();
    await page.locator('.surface-options .option').first().click();
    await page.locator('[data-action="surface-next"]').click();
    await expect(page.locator('.results-stamp')).toHaveText('SURFACED');
  });

  test('search finds Ratios first and the s2-4 gacha Wreck; map reaches all 42 Wrecks', async ({ page }) => {
    await fresh(page, '#/search?q=ratio');
    await expect(page.locator('.search-group h2').first()).toContainText('Units');
    await expect(page.locator('.search-row').first()).toContainText('Ratios');
    await expect(page.locator('a[href*="wreck.html#/wreck/s2-4"]')).toHaveCount(1);
    await fresh(page, '#/map');
    await expect(page.locator('a.wreck-lesson')).toHaveCount(42);
    await expect(page.locator('.reef-pin:not([disabled])')).toHaveCount(1);
    await expect(page.locator('.reef-pin[disabled]')).toHaveCount(5);
    await page.locator('.wreck-sector').nth(1).locator('summary').click();
    await expect(page.locator('.wreck-sector').nth(1).locator('a.wreck-lesson').first()).toBeVisible();
  });

  test('logbook has all paper tabs and settings persist', async ({ page }) => {
    await fresh(page, '#/logbook/progress');
    await expect(page.locator('.logbook-tabs a')).toHaveCount(7);
    await expect(page.getByRole('heading', { name: 'What you keep.' })).toBeVisible();
    await page.locator('.logbook-tabs a', { hasText: 'Settings' }).click();
    await page.locator('[data-setting="text"]').selectOption('3');
    await page.locator('[data-setting="slate"]').selectOption('night');
    await page.waitForTimeout(450);
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('cx_v10_progress')).prefs);
    expect(prefs.text).toBe(3);
    expect(prefs.slate).toBe('night');
    await expect(page.locator('html')).toHaveAttribute('data-text', '3');
    await expect(page.locator('html')).toHaveAttribute('data-slate', 'night');
    await page.locator('.logbook-tabs a', { hasText: 'Collection' }).click();
    await expect(page.getByRole('heading', { name: 'Species log' })).toBeVisible();
  });
});
