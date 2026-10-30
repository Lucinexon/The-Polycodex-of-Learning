'use strict';

/*
 * Performance gate for Polycodex v10.
 * Chromium + CDP CPU/network throttling. Measures LCP, event latency,
 * long tasks, resource weight (gzip), heap and first-card time.
 * Usage: node scripts/perf-budget.js [baseUrl]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const BASE = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '');
const OUT_JSON = path.join(ROOT, 'docs', 'v10', 'perf.json');
const OUT_MD = path.join(ROOT, 'docs', 'v10', 'perf-report.md');
const OUT_BASE = path.join(ROOT, 'docs', 'v10', 'baseline.md');

const budgets = {
  titleJsGz: 150 * 1024,
  titleCssGz: 25 * 1024,
  titleThirdPartyScripts: 0,
  titleLcp: 2500,
  titleInp: 200,
  diveCached: 300,
  diveUncached: 1500,
  unitGz: 30 * 1024
};

const initScript = () => {
  window.__perf = { lcp: 0, lcpEl: '', longTasks: [], events: [], cls: 0, cardAt: 0, cardPaint: 0, cardObserver: null };
  window.__perf.watchCard = function () {
    if (window.__perf.cardObserver) window.__perf.cardObserver.disconnect();
    var check = function () {
      var el = document.getElementById('dive-title');
      if (el && !window.__perf.cardAt) {
        window.__perf.cardAt = performance.now();
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { window.__perf.cardPaint = performance.now(); });
        });
        return true;
      }
      return false;
    };
    var mo = new MutationObserver(function () { if (check()) mo.disconnect(); });
    mo.observe(document, { childList: true, subtree: true });
    window.__perf.cardObserver = mo;
    check();
  };
  window.__perf.resetCard = function () {
    window.__perf.cardAt = 0;
    window.__perf.cardPaint = 0;
    window.__perf.cardResetAt = performance.now();
    window.__perf.watchCard();
  };
  window.__perf.watchCard();
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.startTime > window.__perf.lcp) { window.__perf.lcp = e.startTime; window.__perf.lcpEl = e.element ? (e.element.tagName + '.' + e.element.className) : ''; }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.longTasks.push({ start: e.startTime, dur: e.duration });
    }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.events.push({ name: e.name, start: e.startTime, dur: e.duration });
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) { /* older engine */ }
};

function gz(file) {
  return zlib.gzipSync(fs.readFileSync(file)).length;
}

async function throttledPage(browser, cached) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  await context.addInitScript(initScript);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    connectionType: 'cellular4g'
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return { context, page, cdp, cached };
}

async function metrics(page, cdp) {
  const perf = await page.evaluate(() => window.__perf || {});
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0] || {};
    return { dcl: n.domContentLoadedEventEnd || 0, load: n.loadEventEnd || 0, ttfb: n.responseStart || 0 };
  });
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => ({
    name: r.name, initiator: r.initiatorType, transfer: r.transferSize || 0, encoded: r.encodedBodySize || 0
  })));
  let heap = 0;
  try {
    const m = await cdp.send('Performance.getMetrics');
    const found = m.metrics.find((x) => x.name === 'JSHeapUsedSize');
    heap = found ? found.value : 0;
  } catch (e) { /* metric unavailable */ }
  const longTasks = perf.longTasks || [];
  return {
    lcp: Math.round(perf.lcp || 0),
    lcpEl: perf.lcpEl || '',
    cls: Number((perf.cls || 0).toFixed(4)),
    longTasks: longTasks.length,
    longTaskMs: Math.round(longTasks.reduce((n, t) => n + t.dur, 0)),
    maxEvent: Math.round((perf.events || []).reduce((n, e) => Math.max(n, e.dur), 0)),
    cardAt: Math.round(perf.cardAt || 0),
    cardPaint: Math.round(perf.cardPaint || 0),
    nav,
    heap,
    resources
  };
}

function classify(resources) {
  const origin = new URL(BASE).origin;
  const js = [], css = [], third = [];
  for (const r of resources) {
    let u;
    try { u = new URL(r.name); } catch (e) { continue; }
    if (u.origin !== origin) third.push(r);
    if (/\.js($|\?)/.test(u.pathname)) js.push(r);
    if (/\.css($|\?)/.test(u.pathname)) css.push(r);
  }
  return { js, css, third };
}

async function gzipResources(resources) {
  let bytes = 0;
  for (const r of resources) {
    try {
      const res = await fetch(r.name);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      bytes += zlib.gzipSync(buf).length;
    } catch (e) { /* skip */ }
  }
  return bytes;
}

async function runScenario(spec) {
  const browser = await chromium.launch();
  const warm = spec.warm !== false;
  try {
  const session = await throttledPage(browser, warm);
  const page = session.page;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (warm) {
    const warmUrls = spec.warmUrls || (spec.warmUrl ? [spec.warmUrl] : []);
    for (const warmUrl of warmUrls) {
      await page.goto(BASE + warmUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(spec.warmSettle || 1200);
    }
  }
  const started = Date.now();
  await page.goto(BASE + spec.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(spec.settle || 1800);
  if (String(spec.id).indexOf('v10-') === 0) {
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(300);
  }
  if (spec.readyUnit) {
    await page.waitForFunction(() => window.CodexUnits && window.CodexUnits.get('number-shallows-ratios'), null, { timeout: 15000 });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  }
  let actionMs = null;
  if (spec.action) {
    const t0 = Date.now();
    if (spec.action === 'legacyLesson') {
      await page.locator('button.startbtn:visible').click();
      await page.waitForTimeout(800);
      await page.locator('#s1-1 .blk-head').click();
      await page.waitForTimeout(500);
    } else if (spec.action === 'diveFromDescent') {
      await page.evaluate(() => {
        window.__perf.resetCard();
        var btn = document.querySelector('[data-action="dive-open"]');
        if (btn) btn.click();
      });
      await page.waitForSelector('#dive-title', { state: 'visible', timeout: 5000 });
      await page.waitForFunction(() => window.__perf.cardPaint > 0, null, { timeout: 5000 }).catch(() => {});
      actionMs = await page.evaluate(() => {
        var p = window.__perf;
        return Math.max(0, (p.cardPaint || p.cardAt || 0) - (p.cardResetAt || 0));
      });
    } else {
      const loc = page.locator(spec.action).first();
      await loc.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
    if (actionMs == null) actionMs = Date.now() - t0;
  }
  const m = await metrics(page, session.cdp);
  m.actionMs = actionMs;
  m.elapsedMs = Date.now() - started;
  m.errors = errors;
  const c = classify(m.resources);
  m.jsGz = await gzipResources(c.js);
  m.cssGz = await gzipResources(c.css);
  m.thirdPartyScripts = c.third.filter((r) => /\.js($|\?)/.test(r.name)).length;
  m.thirdPartyResources = c.third.length;
  m.firstCard = spec.metric === 'card'
    ? Math.round(spec.action === 'diveFromDescent' ? m.actionMs : (m.cardPaint || m.cardAt || m.nav.dcl))
    : m.nav.dcl;
  m.inp = m.maxEvent || 0;
  m.title = await page.title();
  await session.context.close();
  return m;
  } finally {
    await browser.close();
  }
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function medianRun(runs, spec) {
  const primary = spec.metric === 'card' ? 'firstCard' : 'lcp';
  const target = median(runs.map((r) => r[primary] || 0));
  const rep = runs.reduce((best, r) => {
    return Math.abs((r[primary] || 0) - target) < Math.abs((best[primary] || 0) - target) ? r : best;
  }, runs[0]);
  return Object.assign({}, rep, {
    lcp: median(runs.map((r) => r.lcp || 0)),
    maxEvent: median(runs.map((r) => r.maxEvent || 0)),
    inp: median(runs.map((r) => r.inp || 0)),
    actionMs: median(runs.map((r) => r.actionMs || 0)),
    cardAt: median(runs.map((r) => r.cardAt || 0)),
    cardPaint: median(runs.map((r) => r.cardPaint || 0)),
    firstCard: spec.metric === 'card' ? median(runs.map((r) => r.firstCard || 0)) : rep.firstCard,
    runs: runs.map((r) => ({
      lcp: r.lcp, inp: r.inp, maxEvent: r.maxEvent, actionMs: r.actionMs,
      cardAt: r.cardAt, cardPaint: r.cardPaint, firstCard: r.firstCard,
      dcl: Math.round(r.nav.dcl), errors: r.errors
    }))
  });
}

function row(label, value, budget, unit, pass) {
  return '| ' + label + ' | ' + value + (unit || '') + ' | ' + (budget == null ? '—' : budget + (unit || '')) + ' | ' + (budget == null ? 'baseline' : (pass ? 'PASS' : 'FAIL')) + ' |';
}

(async () => {
  try {
    const head = await fetch(BASE + '/app.html', { method: 'HEAD' });
    if (!head.ok) throw new Error('HTTP ' + head.status);
  } catch (e) {
    console.error('perf: server is not reachable at ' + BASE + '. Run npm run serve first.');
    process.exit(2);
  }

  const results = [];
  const scenarios = [
    { id: 'legacy-home', url: '/index.html', settle: 2500, warm: false, baseline: true },
    { id: 'legacy-lesson', url: '/index.html', settle: 2500, warm: false, action: 'legacyLesson', baseline: true },
    { id: 'v10-title', url: '/app.html#/', settle: 2200, warm: false, action: '[data-action="continue"]', gate: true, runs: 3 },
    { id: 'v10-dive-cached', url: '/app.html?perf=dive#/reef/number/shallows', warmUrls: ['/app.html#/dive/ratios-d1/c1'], settle: 600, warm: true, readyUnit: true, action: 'diveFromDescent', metric: 'card', gate: true, runs: 3 },
    { id: 'v10-dive-uncached', url: '/app.html?perf=dive2#/dive/ratios-d1/c1', settle: 1400, warm: false, metric: 'card', gate: true, runs: 3 }
  ];

  for (const spec of scenarios) {
    const count = spec.runs || 1;
    const runs = [];
    for (let i = 0; i < count; i++) {
      console.log('perf: ' + spec.id + (count > 1 ? ' ' + (i + 1) + '/' + count : '') + ' …');
      runs.push(await runScenario(spec));
    }
    const r = medianRun(runs, spec);
    results.push(Object.assign({ id: spec.id, gate: !!spec.gate, baseline: !!spec.baseline }, r));
  }

  const title = results.find((r) => r.id === 'v10-title');
  const cached = results.find((r) => r.id === 'v10-dive-cached');
  const uncached = results.find((r) => r.id === 'v10-dive-uncached');
  const unitBytes = gz(path.join(ROOT, 'js', 'units', 'number', 'shallows', 'ratios.js'));
  const cssText = ['tokens.css', 'app.css', 'wreck.css'].map((f) => fs.readFileSync(path.join(ROOT, 'css', 'v10', f), 'utf8')).join('\n');
  const backdrop = (cssText.match(/backdrop-filter/g) || []).length;
  const checks = [
    { label: 'Title JS (gzip)', value: Math.round(title.jsGz / 1024), budget: 150, unit: ' KB', pass: title.jsGz <= budgets.titleJsGz },
    { label: 'Title CSS (gzip)', value: Math.round(title.cssGz / 1024), budget: 25, unit: ' KB', pass: title.cssGz <= budgets.titleCssGz },
    { label: 'Title third-party scripts', value: title.thirdPartyScripts, budget: 0, unit: '', pass: title.thirdPartyScripts === 0 },
    { label: 'Title LCP (Slow 4G, 4× CPU)', value: title.lcp, budget: 2500, unit: ' ms', pass: title.lcp <= budgets.titleLcp },
    { label: 'Title event latency', value: title.inp, budget: 200, unit: ' ms', pass: title.inp <= budgets.titleInp },
    { label: 'Dive first card cached', value: cached.firstCard, budget: 300, unit: ' ms', pass: cached.firstCard <= budgets.diveCached },
    { label: 'Dive first card uncached', value: uncached.firstCard, budget: 1500, unit: ' ms', pass: uncached.firstCard <= budgets.diveUncached },
    { label: 'Ratios unit (gzip)', value: Math.round(unitBytes / 1024 * 10) / 10, budget: 30, unit: ' KB', pass: unitBytes <= budgets.unitGz },
    { label: 'backdrop-filter in v10 CSS', value: backdrop, budget: 0, unit: '', pass: backdrop === 0 }
  ];

  const generated = new Date().toISOString();
  const json = { generatedAt: generated, base: BASE, budgets, unitGz: unitBytes, checks, scenarios: results };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(json, null, 2));

  const md = [];
  md.push('# Polycodex v10 performance gate');
  md.push('');
  md.push('Generated ' + generated + ' against `' + BASE + '` with Chromium, Slow 4G (1.6 Mbps down, 150 ms RTT) and 4× CPU throttling. Gate scenarios run three times in a fresh browser each; the table reports the median run (per metric).');
  md.push('');
  md.push('## Gate');
  md.push('');
  md.push('| Check | Measured | Budget | Result |');
  md.push('|---|---:|---:|---|');
  checks.forEach((c) => md.push(row(c.label, c.value, c.budget, c.unit, c.pass)));
  md.push('');
  md.push('## Baseline / comparison');
  md.push('');
  md.push('| Scenario | LCP | DCL | Load | Heap | Long tasks | Max event | JS gz | CSS gz | Third-party |');
  md.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  results.forEach((r) => {
    md.push('| ' + r.id + ' | ' + r.lcp + ' ms | ' + Math.round(r.nav.dcl) + ' ms | ' + Math.round(r.nav.load) + ' ms | ' +
      Math.round(r.heap / 1024 / 1024 * 10) / 10 + ' MB | ' + r.longTasks + ' | ' + r.maxEvent + ' ms | ' +
      Math.round(r.jsGz / 1024) + ' KB | ' + Math.round(r.cssGz / 1024) + ' KB | ' + r.thirdPartyScripts + ' |');
  });
  md.push('');
  md.push('## Notes');
  md.push('');
  md.push('- Resource weight is gzip size fetched from the same files the page requested; transfer sizes are not used because the dev server gzips on the wire.');
  md.push('- Dive “first card” is the real first paint of `#dive-title` after a double `requestAnimationFrame`. Cached is measured from a Descent click after the unit and shell are warm; uncached is a direct dive URL in a fresh browser.');
  md.push('- Title event latency is the longest `event` timing entry (INP proxy) from the Continue interaction, not wall-clock click duration.');
  md.push('- The 10-minute heap ratio is not run in the default gate (it is a 12-minute measurement). Run it manually before release.');
  md.push('- Legacy rows are the before baseline, not gates. They use the classic Home and the inline `#s1-1` lesson expansion.');
  md.push('- Full JSON, including every gate run: `docs/v10/perf.json`.');
  fs.writeFileSync(OUT_MD, md.join('\n') + '\n');

  const base = ['# Baseline — classic Polycodex', '', 'Captured ' + generated + ' with Slow 4G + 4× CPU.', '',
    '| Scenario | LCP | DCL | Load | Heap | Long tasks | JS gzip | CSS gzip |', '|---|---:|---:|---:|---:|---:|---:|---:|'];
  results.filter((r) => r.baseline).forEach((r) => {
    base.push('| ' + r.id + ' | ' + r.lcp + ' ms | ' + Math.round(r.nav.dcl) + ' ms | ' + Math.round(r.nav.load) + ' ms | ' +
      Math.round(r.heap / 1024 / 1024 * 10) / 10 + ' MB | ' + r.longTasks + ' | ' + Math.round(r.jsGz / 1024) + ' KB | ' + Math.round(r.cssGz / 1024) + ' KB |');
  });
  base.push('', 'The classic shell eagerly loads fonts, KaTeX, Prism, marked, DOMPurify, MiniSearch, confetti, Firebase and Supabase. v10 loads only the shell and the one live unit on demand.', '');
  fs.writeFileSync(OUT_BASE, base.join('\n'));

  const failed = checks.filter((c) => !c.pass);
  console.log('perf: ' + (checks.length - failed.length) + '/' + checks.length + ' gate checks pass');
  failed.forEach((c) => console.log('FAIL ' + c.label + ': ' + c.value + c.unit + ' (budget ' + c.budget + c.unit + ')'));
  console.log('perf: wrote docs/v10/perf-report.md and docs/v10/baseline.md');
  if (failed.length) process.exit(1);
})().catch((e) => {
  console.error('perf: ' + (e && e.stack || e));
  process.exit(2);
});
