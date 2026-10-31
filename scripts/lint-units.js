#!/usr/bin/env node
/* Unit linter — contract C1. Dependency-free Node.
   Usage: node scripts/lint-units.js [--file path/to/unit.js] [--json] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const UNITS_DIR = path.join(ROOT, 'js', 'units');
const INVENTORY = path.join(ROOT, 'docs', 'v10', 'content-inventory.json');
const BANNED = [
  'delve', 'tapestry', 'unlock the power', "in today's fast-paced world",
  "it's important to note", 'in today\u2019s fast-paced world', 'it\u2019s important to note'
];
const ZONE_MAX_GRADE = { shallows: 7, twilight: 9, midnight: 11, abyss: 13 };

function walk(dir, out) {
  out = out || [];
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.js') && name !== 'manifest.js') out.push(full);
  }
  return out;
}

function words(text) {
  return String(text || '')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, ' ')
    .replace(/[#*_`>~<]/g, ' ')
    .split(/\s+/).filter(Boolean);
}

function syllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  return (word.match(/[aeiouy]{1,2}/g) || ['x']).length;
}

function readability(text) {
  const ws = words(text).filter((w) => /[a-z]/i.test(w));
  if (!ws.length) return 0;
  const sentences = Math.max(1, (String(text).match(/[.!?]+/g) || []).length);
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (ws.length / sentences) + 11.8 * (syl / ws.length) - 15.59;
}

function flatText(unit) {
  const out = [];
  out.push(unit.title || '');
  for (const d of unit.dives || []) {
    out.push(d.hook || '');
    for (const c of d.cards || []) out.push(c.body || '');
    for (const c of d.check || []) out.push(c.why || '');
  }
  return out.join(' ');
}

function load(file, errors) {
  const code = fs.readFileSync(file, 'utf8');
  const units = [];
  const sandbox = { window: { CodexUnits: { register: (u) => units.push(u) }, __PENDING_UNITS__: [] } };
  vm.createContext(sandbox);
  try {
    vm.runInContext(code, sandbox, { filename: file, timeout: 2000 });
  } catch (err) {
    errors.push(`${path.relative(ROOT, file)}: syntax/runtime error: ${err.message}`);
  }
  return units.concat(sandbox.window.__PENDING_UNITS__ || []);
}

function lint(unit, file, errors, warnings, inventoryIds) {
  const where = path.relative(ROOT, file);
  const fail = (msg) => errors.push(`${where}: ${msg}`);
  const warn = (msg) => warnings.push(`${where}: ${msg}`);
  if (unit.v !== 1) fail('v must be 1');
  if (!unit.id || !/^[a-z0-9-]+$/.test(unit.id)) fail('id must be kebab-case');
  if (!unit.reef || !unit.zone) fail('reef and zone are required');
  if (!['shallows', 'twilight', 'midnight', 'abyss'].includes(unit.zone)) fail('unknown zone');
  if (!unit.title) fail('title required');
  if (!Number.isFinite(unit.est)) fail('est required');
  if (!Array.isArray(unit.objectives) || unit.objectives.length < 2 || unit.objectives.length > 4) fail('objectives must be 2–4');
  if (!Array.isArray(unit.sources) || unit.sources.length < 1 || unit.sources.length > 3) fail('sources must be 1–3');
  if (!Array.isArray(unit.standards) || !unit.standards.length) fail('standards required');
  if (!Array.isArray(unit.dives) || !unit.dives.length) fail('dives required');
  if (!['draft', 'reviewed', 'published'].includes(unit.status)) fail('status must be draft, reviewed or published');
  if ((unit.status === 'reviewed' || unit.status === 'published') && (!unit.reviewedBy || !unit.reviewedAt)) fail('reviewed/published units need reviewedBy and reviewedAt');
  if (unit.prereqs && !Array.isArray(unit.prereqs)) fail('prereqs must be an array');

  const cardIds = new Set();
  const diveIds = new Set();
  const checkIds = new Set();
  let checks = 0;
  for (const d of unit.dives || []) {
    if (!d.id) fail('dive missing id');
    if (diveIds.has(d.id)) fail(`duplicate dive id ${d.id}`);
    diveIds.add(d.id);
    if (!d.title) fail(`${d.id}: title required`);
    if (!Number.isFinite(d.est)) fail(`${d.id}: est required`);
    if (words(d.hook).length > 60) fail(`${d.id}: hook is ${words(d.hook).length} words (max 60)`);
    if (!Array.isArray(d.cards) || d.cards.length < 3 || d.cards.length > 5) fail(`${d.id}: cards must be 3–5`);
    if (!Array.isArray(d.check) || d.check.length !== 3) fail(`${d.id}: exactly 3 checks required`);
    if (!Array.isArray(d.review) || d.review.length < 2 || d.review.length > 4) fail(`${d.id}: review must be 2–4`);
    if (!d.collect || !d.collect.id || !d.collect.name || !d.collect.art || !d.collect.fact) fail(`${d.id}: collectible incomplete`);
    if (d.wreck) {
      for (const id of d.wreck) if (inventoryIds && !inventoryIds.has(id)) fail(`${d.id}: unknown wreck ${id}`);
    }
    for (const c of d.cards || []) {
      if (!c.id) fail(`${d.id}: card missing id`);
      if (cardIds.has(d.id + ':' + c.id)) fail(`duplicate card ${d.id}:${c.id}`);
      cardIds.add(d.id + ':' + c.id);
      if (!c.kind) fail(`${d.id}:${c.id}: kind required`);
      if (!c.title) fail(`${d.id}:${c.id}: title required`);
      const wc = words(c.body).length;
      if (wc > 120) fail(`${d.id}:${c.id}: body is ${wc} words (max 120)`);
      if (c.visual && !c.visual.alt) fail(`${d.id}:${c.id}: visual needs alt text`);
      if (c.kind === 'formula' && !c.mathDesc) fail(`${d.id}:${c.id}: formula needs mathDesc`);
      if (c.prompt) {
        if (!c.prompt.id || !c.prompt.q || !c.prompt.why) fail(`${d.id}:${c.id}: prompt needs id, q and why`);
        if (['choose', 'predict'].includes(c.prompt.type) && (!Array.isArray(c.prompt.opts) || c.prompt.opts.length < 2)) fail(`${d.id}:${c.id}: prompt options required`);
        if (['choose', 'predict'].includes(c.prompt.type) && !Number.isInteger(c.prompt.a)) fail(`${d.id}:${c.id}: prompt answer index required`);
        if (['choose', 'predict'].includes(c.prompt.type) && c.prompt.why_wrong) {
          const wrong = c.prompt.opts.map((_, i) => i).filter((i) => i !== c.prompt.a);
          for (const i of wrong) if (!c.prompt.why_wrong[String(i)]) warn(`${d.id}:${c.id}: no why_wrong for option ${i}`);
        }
        for (const phrase of BANNED) if (String(c.prompt.q).toLowerCase().includes(phrase)) fail(`${d.id}:${c.id}: banned phrase "${phrase}"`);
      }
      for (const phrase of BANNED) if (String(c.body).toLowerCase().includes(phrase)) fail(`${d.id}:${c.id}: banned phrase "${phrase}"`);
    }
    for (const c of d.check || []) {
      checks++;
      if (!c.id) fail(`${d.id}: check missing id`);
      if (checkIds.has(c.id)) fail(`duplicate check id ${c.id}`);
      checkIds.add(c.id);
      if (!c.q || !c.why) fail(`${d.id}:${c.id}: check needs q and why`);
      if (!Array.isArray(c.opts) || c.opts.length < 2) fail(`${d.id}:${c.id}: check options required`);
      if (!Number.isInteger(c.a) || c.a < 0 || c.a >= (c.opts || []).length) fail(`${d.id}:${c.id}: check answer index out of range`);
      if (!c.concept) fail(`${d.id}:${c.id}: check concept required`);
      if (c.opts && c.why_wrong) {
        for (let i = 0; i < c.opts.length; i++) if (i !== c.a && !c.why_wrong[String(i)]) warn(`${d.id}:${c.id}: no why_wrong for option ${i}`);
      }
    }
    for (const r of d.review || []) {
      if (!r.id || !r.front || !r.back || !r.concept) fail(`${d.id}: review item incomplete`);
    }
  }

  if (checks !== 3 * (unit.dives || []).length) fail('every dive needs exactly 3 checks');
  const checkedConcepts = new Set((unit.dives || []).flatMap((d) => (d.check || []).map((c) => c.concept)));
  for (const g of unit.glossary || []) if (g.concept && !checkedConcepts.has(g.concept)) warn(`glossary concept ${g.concept} is never checked`);
  if (Array.isArray(unit.objectiveCoverage)) {
    const valid = new Set();
    for (const d of unit.dives || []) for (const c of d.check || []) valid.add(`${d.id}:${c.id}`);
    for (let i = 0; i < (unit.objectives || []).length; i++) {
      const row = unit.objectiveCoverage.find((r) => r.objective === i);
      if (!row || !row.checks || !row.checks.length) fail(`objective ${i} has no covering check`);
      else for (const ref of row.checks) if (!valid.has(ref)) fail(`objective ${i} references unknown check ${ref}`);
    }
  } else {
    fail('objectiveCoverage is required so objectives can be checked');
  }

  if (!unit.flags || !unit.flags.math) {
    const fk = readability(flatText(unit));
    const max = ZONE_MAX_GRADE[unit.zone] || 11;
    if (fk > max) warn(`Flesch-Kincaid grade ${fk.toFixed(1)} exceeds ${max} for ${unit.zone}`);
  }
  const gz = zlib.gzipSync(fs.readFileSync(file)).length;
  if (gz > 30 * 1024) fail(`unit is ${(gz / 1024).toFixed(1)} KB gzipped (max 30 KB)`);
  return { gz, checks };
}

function main() {
  const args = process.argv.slice(2);
  const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
  const errors = [];
  const warnings = [];
  const inventory = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const inventoryIds = new Set((inventory.lessons || []).map((l) => l.id));
  const files = fileArg ? [path.resolve(fileArg)] : walk(UNITS_DIR).sort();
  if (!files.length) errors.push('no unit files found');
  const all = [];
  for (const file of files) {
    const units = load(file, errors);
    if (!units.length) errors.push(`${path.relative(ROOT, file)}: no unit registered`);
    for (const u of units) all.push({ unit: u, file });
  }
  const ids = new Set();
  for (const { unit, file } of all) {
    if (ids.has(unit.id)) errors.push(`duplicate unit id ${unit.id}`);
    ids.add(unit.id);
  }
  for (const { unit, file } of all) lint(unit, file, errors, warnings, inventoryIds);
  /* prereq cycles */
  const byId = new Map(all.map((x) => [x.unit.id, x.unit]));
  for (const { unit } of all) {
    const seen = new Set();
    const stack = (unit.prereqs || []).slice();
    while (stack.length) {
      const id = stack.pop();
      if (id === unit.id) { errors.push(`prereq cycle at ${unit.id}`); break; }
      if (seen.has(id) || !byId.has(id)) continue;
      seen.add(id);
      stack.push(...(byId.get(id).prereqs || []));
    }
  }
  if (args.includes('--json')) {
    console.log(JSON.stringify({ errors, warnings, units: all.map((x) => x.unit.id) }, null, 2));
  } else {
    for (const w of warnings) console.warn('warn  ' + w);
    for (const e of errors) console.error('error ' + e);
    for (const { unit, file } of all) {
      const gz = (zlib.gzipSync(fs.readFileSync(file)).length / 1024).toFixed(1);
      console.log(`ok    ${unit.id} · ${unit.dives.length} dives · ${gz} KB gz · ${unit.status}`);
    }
  }
  if (errors.length) process.exit(1);
  console.log(`\nlint passed: ${all.length} unit(s), ${warnings.length} warning(s)`);
}

main();
