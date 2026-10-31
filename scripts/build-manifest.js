#!/usr/bin/env node
/* Build js/units/manifest.json + js/units/manifest.js from unit files.
   Dependency-free by design (contract C1). Bodies never enter the manifest. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const UNITS_DIR = path.join(ROOT, 'js', 'units');
const INVENTORY = path.join(ROOT, 'docs', 'v10', 'content-inventory.json');
const BRIDGE = path.join(ROOT, 'docs', 'v10', 'bridge-map.json');
const OUT_JSON = path.join(UNITS_DIR, 'manifest.json');
const OUT_JS = path.join(UNITS_DIR, 'manifest.js');

const REEFS = [
  {
    id: 'number', name: 'Number Reef', depth: '12 m', wave: 1, live: true,
    blurb: 'Patterns, quantities and the rules that hold them together.',
    x: 18, y: 42,
    zones: {
      shallows: { label: 'Shallows', grades: 'Grades 6–8' },
      twilight: { label: 'Twilight', grades: 'Grades 9–10' },
      midnight: { label: 'Midnight', grades: 'Grades 11–12 / AP' },
      abyss: { label: 'Abyss', grades: 'College' }
    }
  },
  {
    id: 'life', name: 'Life Reef', depth: '26 m', wave: 1, live: false,
    blurb: 'Cells, systems and the long argument of evolution.',
    x: 38, y: 30,
    zones: { shallows: { label: 'Shallows', grades: 'Grades 6–8' }, twilight: { label: 'Twilight', grades: 'Grades 9–10' }, midnight: { label: 'Midnight', grades: 'Grades 11–12 / AP' }, abyss: { label: 'Abyss', grades: 'College' } }
  },
  {
    id: 'matter', name: 'Matter & Motion', depth: '41 m', wave: 1, live: false,
    blurb: 'Forces, energy and the machinery of the physical world.',
    x: 61, y: 48,
    zones: { shallows: { label: 'Shallows', grades: 'Grades 6–8' }, twilight: { label: 'Twilight', grades: 'Grades 9–10' }, midnight: { label: 'Midnight', grades: 'Grades 11–12 / AP' }, abyss: { label: 'Abyss', grades: 'College' } }
  },
  {
    id: 'sky', name: 'Sky & Sea', depth: '58 m', wave: 2, live: false,
    blurb: 'Oceans, atmospheres and the planets beyond them.',
    x: 78, y: 34,
    zones: { shallows: { label: 'Shallows', grades: 'Grades 6–8' }, twilight: { label: 'Twilight', grades: 'Grades 9–10' }, midnight: { label: 'Midnight', grades: 'Grades 11–12 / AP' }, abyss: { label: 'Abyss', grades: 'College' } }
  },
  {
    id: 'signal', name: 'Signal Reef', depth: '73 m', wave: 2, live: false,
    blurb: 'Networks, minds and the messages that move between them.',
    x: 32, y: 68,
    zones: { shallows: { label: 'Shallows', grades: 'Grades 6–8' }, twilight: { label: 'Twilight', grades: 'Grades 9–10' }, midnight: { label: 'Midnight', grades: 'Grades 11–12 / AP' }, abyss: { label: 'Abyss', grades: 'College' } }
  },
  {
    id: 'chronicle', name: 'Chronicle Reef', depth: '88 m', wave: 2, live: false,
    blurb: 'People, power and the stories that outlast them.',
    x: 67, y: 72,
    zones: { shallows: { label: 'Shallows', grades: 'Grades 6–8' }, twilight: { label: 'Twilight', grades: 'Grades 9–10' }, midnight: { label: 'Midnight', grades: 'Grades 11–12 / AP' }, abyss: { label: 'Abyss', grades: 'College' } }
  }
];

function walk(dir, out) {
  out = out || [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.js') && name !== 'manifest.js') out.push(full);
  }
  return out;
}

function loadUnits() {
  const units = [];
  for (const file of walk(UNITS_DIR).sort()) {
    const code = fs.readFileSync(file, 'utf8');
    const sandbox = { window: {} };
    sandbox.window.CodexUnits = { register: (u) => units.push({ unit: u, file }) };
    sandbox.window.__PENDING_UNITS__ = [];
    vm.createContext(sandbox);
    try {
      vm.runInContext(code, sandbox, { filename: file, timeout: 2000 });
    } catch (err) {
      throw new Error(`${path.relative(ROOT, file)}: ${err.message}`);
    }
    for (const pending of sandbox.window.__PENDING_UNITS__ || []) units.push({ unit: pending, file });
  }
  return units;
}

function conceptsOf(unit) {
  const set = new Set();
  for (const dive of unit.dives || []) {
    for (const card of dive.cards || []) for (const c of card.concepts || []) set.add(c);
    for (const c of dive.check || []) if (c.concept) set.add(c.concept);
    for (const r of dive.review || []) if (r.concept) set.add(r.concept);
  }
  for (const g of unit.glossary || []) if (g.concept) set.add(g.concept);
  return Array.from(set).sort();
}

function main() {
  const loaded = loadUnits();
  if (!loaded.length) throw new Error('No units found under js/units.');
  const ids = new Set();
  const units = [];
  for (const { unit, file } of loaded) {
    if (!unit.id) throw new Error(`${path.relative(ROOT, file)}: missing unit id`);
    if (ids.has(unit.id)) throw new Error(`duplicate unit id ${unit.id}`);
    ids.add(unit.id);
    if (!Array.isArray(unit.dives) || !unit.dives.length) throw new Error(`${unit.id}: no dives`);
    const diveIds = new Set();
    const dives = unit.dives.map((d) => {
      if (!d.id) throw new Error(`${unit.id}: dive missing id`);
      if (diveIds.has(d.id)) throw new Error(`${unit.id}: duplicate dive ${d.id}`);
      diveIds.add(d.id);
      const cardIds = new Set();
      for (const c of d.cards || []) {
        if (!c.id) throw new Error(`${d.id}: card missing id`);
        if (cardIds.has(c.id)) throw new Error(`${d.id}: duplicate card ${c.id}`);
        cardIds.add(c.id);
      }
      return {
        id: d.id, rev: d.rev || 1, title: d.title, est: d.est,
        firstCardId: (d.cards && d.cards[0] && d.cards[0].id) || null,
        cardCount: (d.cards || []).length,
        concepts: Array.from(new Set((d.cards || []).flatMap((c) => c.concepts || []).concat((d.check || []).map((c) => c.concept).filter(Boolean)))).sort(),
        checkCount: (d.check || []).length,
        wrecks: d.wreck || []
      };
    });
    units.push({
      id: unit.id, file: path.relative(ROOT, file).replace(/\\/g, '/'),
      reef: unit.reef, zone: unit.zone, title: unit.title, est: unit.est,
      status: unit.status, rev: unit.rev || 1, objectives: unit.objectives || [],
      prereqs: unit.prereqs || [], standards: unit.standards || [],
      flags: unit.flags || {}, reviewedBy: unit.reviewedBy || null, reviewedAt: unit.reviewedAt || null,
      concepts: conceptsOf(unit),
      glossary: (unit.glossary || []).map((g) => ({ term: g.term, def: g.def, concept: g.concept })),
      diveCount: dives.length, dives
    });
  }

  const inventory = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const bridge = JSON.parse(fs.readFileSync(BRIDGE, 'utf8'));
  const bridgeById = new Map((bridge.lessons || []).map((b) => [b.id, b]));
  const allConcepts = new Set(units.flatMap((u) => u.concepts));
  for (const b of bridge.lessons || []) {
    for (const c of b.concepts || []) {
      if (!allConcepts.has(c)) throw new Error(`bridge ${b.id} references unknown concept ${c}`);
    }
  }
  const wrecks = (inventory.lessons || []).map((l) => {
    const b = bridgeById.get(l.id) || { status: 'unbridged', concepts: [] };
    return {
      id: l.id, title: l.title, sector: l.sector, sectorLabel: l.sectorLabel,
      sectorNum: l.sectorNum, order: l.order, wordCount: l.wordCount,
      headings: (l.headings || []).filter((h) => !h.summary).map((h) => h.text),
      concepts: b.concepts || [], bridge: b.status || 'unbridged',
      searchTerms: b.searchTerms || [], note: b.note || ''
    };
  });
  const missingBridge = (inventory.lessons || []).filter((l) => !bridgeById.has(l.id)).map((l) => l.id);
  if (missingBridge.length) throw new Error(`bridge map missing ${missingBridge.join(', ')}`);

  const manifest = {
    version: 1,
    generatedBy: 'scripts/build-manifest.js',
    reefs: REEFS.map((r) => {
      const reefUnits = units.filter((u) => u.reef === r.id).map((u) => u.id);
      return { ...r, units: reefUnits };
    }),
    units,
    wrecks,
    totals: {
      units: units.length,
      dives: units.reduce((n, u) => n + u.diveCount, 0),
      wrecks: wrecks.length,
      bridged: wrecks.filter((w) => w.bridge === 'bridged').length
    }
  };

  const json = JSON.stringify(manifest, null, 2) + '\n';
  const js = '/* generated by scripts/build-manifest.js — do not edit */\nwindow.CODEX_MANIFEST = ' + JSON.stringify(manifest) + ';\n';
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT_JSON) ? fs.readFileSync(OUT_JSON, 'utf8') : '';
    if (current !== json) {
      console.error('manifest is stale: run node scripts/build-manifest.js');
      process.exit(1);
    }
    console.log('manifest check passed');
    return;
  }
  fs.writeFileSync(OUT_JSON, json);
  fs.writeFileSync(OUT_JS, js);
  console.log(`manifest: ${units.length} unit(s), ${manifest.totals.dives} dive(s), ${wrecks.length} wreck(s), ${manifest.totals.bridged} bridged`);
}

main();
