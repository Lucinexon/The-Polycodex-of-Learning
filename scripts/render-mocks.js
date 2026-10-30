'use strict';
/* Render the six G1 screens at phone and desktop sizes, plus a gallery and states sheet.
   Usage: node scripts/render-mocks.js [baseUrl] */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'v10', 'mock');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const seed = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'saves', 'progress-v2.json'), 'utf8');

async function ensureServer() {
  try {
    const r = await fetch(BASE + '/app.html', { method: 'HEAD' });
    if (r.ok) return null;
  } catch (e) { /* start one */ }
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts', 'serve.js'), '4173'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100));
    try { const r = await fetch(BASE + '/app.html', { method: 'HEAD' }); if (r.ok) return child; } catch (e) { /* wait */ }
  }
  throw new Error('server did not start');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await ensureServer();
  const browser = await chromium.launch();
  const shots = [
    { id: 'title', hash: '#/', note: 'Title with Continue, Dive, Lounge, Logbook' },
    { id: 'map', hash: '#/map', note: 'Reef Map, Wrecks layer' },
    { id: 'descent', hash: '#/reef/number/shallows', note: 'Descent and unit sheet' },
    { id: 'dive', hash: '#/dive/ratios-d2/c1', note: 'Dive player, first card' },
    { id: 'surface', hash: '#/surface/ratios-d1', note: 'Surface results and collectible' },
    { id: 'logbook', hash: '#/logbook/progress', note: 'Logbook, paper surface' },
    { id: 'wreck', hash: 'wreck.html#/wreck/s1-1', note: 'Wreck reader, full legacy lesson' }
  ];
  const sizes = [
    { name: 'phone', width: 360, height: 640 },
    { name: 'desktop', width: 1280, height: 720 }
  ];
  const rows = [];
  for (const size of sizes) {
    const dir = path.join(OUT, size.name);
    fs.mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
    await context.addInitScript(({ json }) => {
      try {
        if (!localStorage.getItem('cx_v10_progress')) {
          localStorage.setItem('cx_v10_progress', json);
          localStorage.setItem('cx_v10_onboarded', '1');
          localStorage.setItem('cx_v10_legacy_notice', '1');
        }
      } catch (e) {}
    }, { json: seed });
    const page = await context.newPage();
    for (const shot of shots) {
      const url = BASE + '/' + shot.hash;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(150);
      const file = path.join(dir, shot.id + '.png');
      await page.screenshot({ path: file, fullPage: false });
      const bytes = fs.statSync(file).size;
      if (bytes < 2000) throw new Error('screenshot too small: ' + file);
      rows.push({ size: size.name, id: shot.id, file: 'mock/' + size.name + '/' + shot.id + '.png', note: shot.note, bytes });
      console.log(size.name, shot.id, bytes + 'B');
    }
    await context.close();
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cards = rows.map(r => '<figure class="shot"><img src="' + esc(r.file) + '" alt="' + esc(r.note) + '"><figcaption><strong>' + esc(r.id) + '</strong> · ' + esc(r.size) + '<span>' + esc(r.note) + '</span></figcaption></figure>').join('\n');
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Polycodex v10 mocks</title>' +
    '<style>body{margin:0;background:#0a2238;color:#f2f6f8;font:16px/1.5 system-ui,sans-serif;padding:24px}h1,h2{font-family:ui-monospace,monospace;color:#ffb547}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}.shot{margin:0;background:#0f3a52;border:2px solid #1b5e73;box-shadow:4px 4px 0 #02060c}.shot img{display:block;width:100%;height:auto}.shot figcaption{padding:8px 10px;font-size:13px}.shot figcaption span{display:block;color:#c9d7e0}.note{max-width:70ch;color:#c9d7e0}a{color:#ffb547}</style></head><body>' +
    '<h1>Polycodex v10 · G1 screen mocks</h1><p class="note">Rendered from the live build by <code>scripts/render-mocks.js</code> at 360×640 and 1280×720. These are working screens, not static comps. The states sheet covers save failure, read-only, empty review, and the Lantern.</p>' +
    '<p><a href="states.html">Open the states sheet</a></p><h2>Screens</h2><div class="grid">' + cards + '</div></body></html>';
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  const states = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Polycodex v10 states</title>' +
    '<style>body{margin:0;background:#0a2238;color:#f2f6f8;font:16px/1.6 system-ui,sans-serif;padding:24px}h1,h2{font-family:ui-monospace,monospace;color:#ffb547}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}.state{border:2px solid #1b5e73;background:#0f3a52;padding:14px;box-shadow:4px 4px 0 #02060c}.state h3{margin:0 0 6px;color:#ffb547}.state p{color:#c9d7e0;margin:0 0 8px}.tag{display:inline-block;border:1px solid #c9d7e0;padding:1px 6px;font-size:12px;margin:0 4px 4px 0}a{color:#ffb547}</style></head><body>' +
    '<h1>States sheet</h1><p>Required states beyond the happy path. Each has one job and one action.</p><div class="grid">' +
    ['Saved / Saving… / Saved on this device / Couldn’t save + banner + Try again', 'Read-only newer save: banner, no writes', 'Corrupt save: copy kept, fresh store, Continue', 'Empty review: one sentence, one action', 'Dive: prompt wrong + explanation + Try once more', 'Dive: prompt skipped, no retrieval credit', 'Surface: one check at a time, explanation after every answer', 'Surface: SURFACED, Got it / Revisit soon, collectible reveal', 'Lantern: hints, glossary, note', 'Outline sheet: card list and Surface', 'Search: empty query, recent, due reviews', 'Search: no results, fuzzy suggestions, Browse map', 'Wreck: outline, resume, explicit Finish', 'Onboarding: six reefs, one live, depth choice'].map(s => '<div class="state"><h3>' + s.split(':')[0] + '</h3><p>' + (s.split(':')[1] || '') + '</p><span class="tag">required</span></div>').join('') +
    '</div><p><a href="index.html">Back to screens</a></p></body></html>';
  fs.writeFileSync(path.join(OUT, 'states.html'), states);
  fs.writeFileSync(path.join(ROOT, 'docs', 'v10', 'mock', 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sizes, rows }, null, 2));
  await browser.close();
  if (server) server.kill();
  console.log('mock gallery:', path.join(OUT, 'index.html'));
}
main().catch(e => { console.error(e); process.exit(1); });
