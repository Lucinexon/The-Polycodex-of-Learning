'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'units', 'manifest.json'), 'utf8'));
const wrecks = manifest.wrecks;

function words(s) {
  return (String(s).match(/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g) || []).map(w => w.toLowerCase());
}

test.describe('@v10 Wreck reader', () => {
  test('all 42 lessons keep their headings, words, maths and page width', async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/wreck.html');
    for (const meta of wrecks) {
      await page.evaluate(() => localStorage.clear());
      errors.length = 0;
      await page.goto('/wreck.html?lesson=' + encodeURIComponent(meta.id) + '#/wreck/' + meta.id);
      await page.waitForTimeout(180);
      const got = await page.evaluate(() => {
        const slate = document.getElementById('wreck-slate');
        const body = document.getElementById('wreck-body');
        const clone = body.cloneNode(true);
        clone.querySelectorAll('details').forEach(d => { d.open = true; });
        clone.querySelectorAll('.tile').forEach(t => t.classList.add('is-open'));
        clone.querySelectorAll('.w-math, .katex, .katex-display').forEach(n => n.remove());
        clone.querySelectorAll('*').forEach(el => {
          el.before(document.createTextNode(' '));
          el.after(document.createTextNode(' '));
        });
        return {
          visible: slate.querySelectorAll('h2,h3,h4,h5,h6').length,
          summaries: slate.querySelectorAll('summary').length,
          rendered: clone.textContent,
          raw: body.innerText,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          read: (() => {
            try {
              const s = JSON.parse(localStorage.getItem('cx_v10_progress'));
              const w = s && s.wrecks && s.wrecks[location.hash.split('/')[2]];
              return !!(w && w.status === 'read');
            } catch (e) { return false; }
          })(),
          title: document.title,
          source: window.SECTORS_PART1.concat(window.SECTORS_PART2, window.SECTORS_PART3)
            .flatMap(s => s.blocks).find(b => b.id === location.hash.split('/')[2]).md
        };
      });
      expect(got.visible, meta.id + ' visible headings').toBe(meta.headings.length);
      expect(got.summaries, meta.id + ' summaries').toBe(2);
      expect(got.overflow, meta.id + ' horizontal overflow').toBeLessThanOrEqual(0);
      expect(got.raw, meta.id + ' raw markdown').not.toContain('**');
      expect(got.raw, meta.id + ' raw display math').not.toContain('$$');
      expect(got.raw, meta.id + ' raw TeX command').not.toContain('\\frac');
      expect(got.read, meta.id + ' read before Finish').toBe(false);
      expect(got.title).toContain('Wreck · Polycodex');
      expect(errors, meta.id + ' console errors').toEqual([]);

      const src = got.source
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/\$\$[\s\S]*?\$\$/g, ' ').replace(/\$[^$\n]+?\$/g, ' ');
      const srcWords = words(src);
      const out = new Map();
      words(got.rendered).forEach(w => out.set(w, (out.get(w) || 0) + 1));
      let matched = 0;
      srcWords.forEach(w => {
        const n = out.get(w) || 0;
        if (n > 0) { matched++; out.set(w, n - 1); }
      });
      const overlap = srcWords.length ? matched / srcWords.length : 1;
      expect(overlap, meta.id + ' token overlap').toBeGreaterThanOrEqual(0.995);
    }
  });

  test('outline, explicit Finish and resume use saved heading and paragraph', async ({ page }) => {
    await page.goto('/wreck.html');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/wreck.html#/wreck/s1-1');
    await expect(page.locator('.wreck-top-title strong')).toHaveText('The Layer Cake of Digital Abstraction');
    await expect(page.locator('#wreck-body h2, #wreck-body h3, #wreck-body h4, #wreck-body h5, #wreck-body h6')).toHaveCount(5);

    await page.locator('[data-action="outline"]').click();
    await expect(page.locator('#wreck-outline')).toHaveClass(/open/);
    const links = page.locator('[data-outline-link]');
    await expect(links).toHaveCount(5);
    await links.nth(2).click();
    await page.waitForTimeout(1600);

    const saved = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('cx_v10_progress'));
      return s.wrecks['s1-1'];
    });
    expect(saved.status).toBe('in_progress');
    expect(saved.anchor).toBeTruthy();

    await page.reload();
    await page.waitForTimeout(700);
    const top = await page.locator('#' + saved.anchor).evaluate(el => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(220);
    await expect(page.locator('.wreck-finished')).toHaveCount(0);

    await page.locator('.wreck-foot-actions [data-action="finish"]').click();
    await expect(page.locator('.wreck-finished').first()).toContainText('Read');
    await page.waitForTimeout(400);
    const read = await page.evaluate(() => JSON.parse(localStorage.getItem('cx_v10_progress')).wrecks['s1-1']);
    expect(read.status).toBe('read');
    expect(read.readAt).toBeTruthy();

    await page.reload();
    await expect(page.locator('.wreck-finished').first()).toContainText('Read');
  });

  test('a legacy-charted lesson is shown as Charted (legacy), never reset', async ({ page }) => {
    await page.goto('/wreck.html');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('polymath_codex_v1', JSON.stringify({ xp: 12, completed: { 's1-1': true }, seen: {}, known: [] }));
    });
    await page.goto('/wreck.html?legacy=1#/wreck/s1-1');
    await expect(page.locator('.wreck-head-meta')).toContainText('Charted (legacy)');
    await expect(page.locator('.wreck-finished')).toHaveCount(0);
    await page.locator('.wreck-foot-actions [data-action="finish"]').click();
    await expect(page.locator('.wreck-finished').first()).toContainText('Charted (legacy)');
    const raw = await page.evaluate(() => localStorage.getItem('polymath_codex_v1'));
    expect(raw).toContain('s1-1');
  });
});
