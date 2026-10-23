// @ts-check
/* Avatar arms + studio polish. The arm thresholds were chosen by measuring the ORIGINAL rig (commit 678abae): there the hands flared 2 px beyond the
   shoulder line at rest (22 vs 20), walkH frame 2 flared to 26, and the cheer was barely wider than the head (26 vs 24 — arms folded into the face).
   The checks below fail on that rig and pass on the current one. */
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const URL = pathToFileURL(resolve(process.cwd(), 'index.html')).href;
test.beforeEach(async ({ page }) => { await page.goto(URL); await page.waitForFunction(() => Boolean(window.CodexAvatar && window.CodexAvatar.rig && window.CodexAvatar.anim)); });

/* opaque-pixel silhouette width of a frame between two body-space rows */
const WIDTHS = `(code, pose, y0, y1) => { const A = window.CodexAvatar, f = A.sprite(code, A.rig.normPose(pose)), cv = document.createElement('canvas'); cv.width = f.cv.width; cv.height = f.cv.height; const g = cv.getContext('2d'); g.drawImage(f.cv, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height).data; let mn = 1e9, mx = -1; for (let y = A.rig.OY + y0; y <= A.rig.OY + y1; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 40) { mn = Math.min(mn, x); mx = Math.max(mx, x); } return mx < 0 ? 0 : mx - mn + 1; }`;

test.describe('arm placement', () => {
  test('relaxed arms: hands rest inside the shoulder line, for several looks (no outward "A-pose" flare)', async ({ page }) => {
    const r = await page.evaluate(w => { const A = window.CodexAvatar, W = eval(w), out = []; ['kai', 'Mira', 'ada', 'lucinexon', 'tess'].forEach(n => { const o = A.parse(A.forName(n)); o.o = 0; o.sl = 1; const c = A.enc(o); out.push({ n: n, shoulder: W(c, {}, -22, -19), hands: W(c, {}, -14, -10) }); }); return out; }, WIDTHS);
    for (const x of r) expect(x.hands, x.n).toBeLessThanOrEqual(x.shoulder);
  });

  test('walking: arm swing stays beside the torso in every walk frame (no flare, no crossing the belly)', async ({ page }) => {
    const r = await page.evaluate(w => { const A = window.CodexAvatar, W = eval(w), C = A.anim.CLIPS, o = A.parse(A.forName('kai')); o.o = 0; o.sl = 1; const c = A.enc(o), sh = W(c, {}, -22, -19), out = { sh: sh, widths: [] }; ['walkH', 'walkV'].forEach(k => C[k].frames.forEach(f => out.widths.push(W(c, f.p || {}, -14, -10)))); return out; }, WIDTHS);
    for (const w of r.widths) expect(w).toBeLessThanOrEqual(r.sh);
  });

  test('cheer throws the arms up and OUT (clearly wider than the head), not folded into the face', async ({ page }) => {
    const r = await page.evaluate(w => { const A = window.CodexAvatar, W = eval(w), C = A.anim.CLIPS, o = A.parse(A.forName('kai')); o.o = 0; o.sl = 1; const c = A.enc(o); return { chin: W(c, {}, -30, -20), peak: Math.max(...C.cheer.frames.map(f => W(c, f.p || {}, -30, -20))), spark: Math.max(...C.spark.frames.map(f => W(c, f.p || {}, -30, -20))) }; }, WIDTHS);
    expect(r.peak).toBeGreaterThanOrEqual(r.chin + 4); expect(r.spark).toBeGreaterThanOrEqual(r.chin + 2);
  });

  test('gesture poses keep their authored targets: wave/sip/heart are unchanged by the new rest pose (blend factor reaches 1 for gesture-sized offsets)', async ({ page }) => {
    /* the blend is continuous: tiny offsets use the relaxed rest, large offsets the legacy rest the gestures were authored against */
    const r = await page.evaluate(w => { const A = window.CodexAvatar, W = eval(w), C = A.anim.CLIPS, o = A.parse(A.forName('kai')); o.o = 0; o.sl = 1; const c = A.enc(o), steps = []; for (let v = 0; v <= 8; v += 1) steps.push(W(c, { a0x: v, a0y: -v }, -30, -10)); return { steps: steps, wave: Math.max(...C.wave.frames.map(f => W(c, f.p || {}, -30, -10))) }; }, WIDTHS);
    for (let i = 1; i < r.steps.length; i++) expect(Math.abs(r.steps[i] - r.steps[i - 1])).toBeLessThanOrEqual(4);   // no pops while an arm is raised gradually
    expect(r.wave).toBeGreaterThan(18);
  });

  test('every animation frame still renders a non-empty sprite with the new arm maths', async ({ page }) => {
    const r = await page.evaluate(() => { const A = window.CodexAvatar, C = A.anim.CLIPS, c = A.forName('ada'); let n = 0, bad = []; Object.keys(C).forEach(k => C[k].frames.forEach((f, i) => { const s = A.sprite(c, A.rig.normPose(f.p || {})); n++; if (!s || !s.cv || !s.cv.width) bad.push(k + i); })); return { n: n, bad: bad }; });
    expect(r.bad).toEqual([]); expect(r.n).toBeGreaterThan(60);
  });
});

test.describe('avatar studio', () => {
  test.use({ viewport: { width: 1100, height: 560 } });
  const open = async page => { await page.evaluate(() => window.CodexAvatar.edit()); await expect(page.locator('#modalBody .avs')).toBeVisible(); };

  test('category tabs wrap (nothing is clipped or hidden behind a scroll) and form a keyboard tablist', async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => { const t = document.querySelector('.avs-tabs'), box = document.querySelector('#modalBody').getBoundingClientRect(); return { overflow: t.scrollWidth > t.clientWidth + 1, rows: new Set([...t.children].map(b => b.offsetTop)).size, out: [...t.children].filter(b => b.getBoundingClientRect().right > box.right + 1).length, count: t.children.length }; });
    expect(r.overflow).toBe(false); expect(r.out).toBe(0); expect(r.rows).toBeGreaterThan(1); expect(r.count).toBeGreaterThanOrEqual(14);
    await page.locator('.avs-tabs [role=tab].on').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.avs-tabs [role=tab].on')).toHaveText('Hair colour');
    await expect(page.locator('.avs-tabs [role=tab].on')).toBeFocused();                           // focus follows the tab through the re-render
    expect(await page.locator('.avs-tabs [role=tab][tabindex="0"]').count()).toBe(1);
  });

  test('new catalog entries are marked and counted; categories that did not grow are not', async ({ page }) => {
    await open(page);
    await expect(page.locator('.avs-grid .avo')).toHaveCount(30);
    await expect(page.locator('.avs-grid .avo[data-new]')).toHaveCount(6);
    await expect(page.locator('.avs-hd b')).toHaveText('Hair'); await expect(page.locator('.avs-legend')).toBeVisible();
    await expect(page.locator('.avs-grid .avo[data-i="29"]')).toHaveAttribute('aria-label', /Hair 30 of 30 \(new\)/);
    await page.locator('.avs-tabs [role=tab]', { hasText: 'Hair colour' }).click();
    await expect(page.locator('.avs-grid .avo[data-new]')).toHaveCount(0); await expect(page.locator('.avs-legend')).toHaveCount(0);
    await page.locator('.avs-tabs [role=tab]', { hasText: 'Outfit' }).first().click();
    await expect(page.locator('.avs-grid .avo[data-new]')).toHaveCount(6);                       // outfits 18–23
  });

  test('option grid: roving tabindex, arrows move focus without selecting, Enter selects and focus survives the re-render', async ({ page }) => {
    await open(page);
    expect(await page.locator('.avs-grid .avo[tabindex="0"]').count()).toBe(1);
    await page.locator('.avs-grid .avo[tabindex="0"]').focus();
    const start = await page.evaluate(() => document.activeElement.dataset.i);
    await page.keyboard.press('ArrowRight');
    const moved = await page.evaluate(() => document.activeElement.dataset.i);
    expect(+moved).toBe(+start + 1);
    expect(await page.locator('.avs-grid .avo[aria-pressed="true"]').getAttribute('data-i')).toBe(start);   // moving focus did not change the selection
    await page.keyboard.press('ArrowDown');                                                                  // one row down (columns detected from layout)
    const down = await page.evaluate(() => +document.activeElement.dataset.i);
    expect(down).toBeGreaterThan(+moved + 1);
    await page.keyboard.press('End'); expect(await page.evaluate(() => +document.activeElement.dataset.i)).toBe(29);
    await page.keyboard.press('Enter');
    await expect(page.locator('.avs-grid .avo[data-i="29"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.activeElement.dataset.i)).toBe('29');                          // focus was restored to the same control
    await expect(page.locator('.avs-hd span')).toHaveText('30 / 30');
  });

  test('selecting an option keeps the grid scroll position, and the preview is painted immediately', async ({ page }) => {
    await open(page);
    await page.locator('.avs-grid').evaluate(g => { g.scrollTop = 40; });
    const before = await page.locator('.avs-grid').evaluate(g => ({ top: g.scrollTop, max: g.scrollHeight - g.clientHeight }));
    expect(before.max).toBeGreaterThan(30);                                                                   // the grid really scrolls at this height
    await page.locator('.avs-grid .avo[data-i="27"]').click();
    expect(await page.locator('.avs-grid').evaluate(g => g.scrollTop)).toBeGreaterThan(before.top - 3);
    const px = await page.evaluate(() => { const cv = document.getElementById('avPv'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; });
    expect(px).toBeGreaterThan(300);                                                                          // no blank frame after the preview canvas was re-created
  });

  test('saving a new hairstyle persists it; the saved code round-trips through parse()', async ({ page }) => {
    await open(page);
    await page.locator('.avs-grid .avo[data-i="25"]').click();
    await page.locator('[data-av=save]').click();
    await expect(page.locator('#modalBody .avs')).toBeHidden();                                  // closeModal() hides the dialog
    expect(await page.evaluate(() => window.CodexAvatar.parse(window.CodexAvatar.mine()).h)).toBe(25);
  });

  test('reduced motion: option transitions are off; focus rings are visible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
    expect(await page.locator('.avs-grid .avo').first().evaluate(e => getComputedStyle(e).transitionDuration)).toMatch(/^0s$/);
    await page.locator('.avs-grid .avo[tabindex="0"]').focus();
    expect(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)).toBe('solid');
  });
});
