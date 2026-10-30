'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { create, KEY } = require('../../js/v10/progress.js');

const FIX = path.join(__dirname, '..', 'fixtures', 'saves');

function memory(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    dump() { return Object.fromEntries(map); }
  };
}

function failing() {
  return {
    getItem() { return null; },
    setItem() { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; },
    removeItem() {}
  };
}

function make(storage, clock) {
  const p = create({ storage, now: () => clock.t, debounceMs: 0, autoSave: false, noListeners: true });
  p.init();
  return p;
}

const dive = {
  id: 'test-d1',
  rev: 1,
  cards: [
    { id: 'c1', concepts: ['c.one'] },
    { id: 'c2', concepts: ['c.two'] }
  ],
  check: [
    { id: 'k1', concept: 'c.one' },
    { id: 'k2', concept: 'c.two' },
    { id: 'k3', concept: 'c.three' }
  ],
  review: [
    { id: 'r1', concept: 'c.one' },
    { id: 'r2', concept: 'c.two' }
  ],
  collect: { id: 'find-1', name: 'Find', fact: 'A fact.', source: 'Source' }
};

test('refresh after a surfaced dive restores status, cards, checks, reviews and collection', () => {
  const storage = memory();
  const clock = { t: 1760000000000 };
  const a = make(storage, clock);
  a.startDive(dive, 'c1', 1);
  a.markCardSeen(dive.id, 'c1', ['c.one']);
  a.answerPrompt(dive.id, 'p1', true);
  a.answerCheck(dive.id, 'k1', true, false, 'c.one', false);
  a.answerCheck(dive.id, 'k2', false, true, 'c.two', false);
  a.answerCheck(dive.id, 'k3', true, false, 'c.three', false);
  assert.equal(a.surface(dive).surfaced, true);
  a.flush();

  const b = make(storage, clock);
  assert.equal(b.dive(dive.id).status, 'surfaced');
  assert.equal(b.dive(dive.id).checks.k2.idk, true);
  assert.equal(b.dive(dive.id).prompts.p1.ok, true);
  assert.ok(b.state.collection['find-1']);
  assert.ok(b.state.reviews['v10:test-d1:r1']);
  assert.equal(b.dueReviews().length, 2);
  assert.equal(b.stats().divesSurfaced, 1);
  assert.equal(b.xpTotal(), 40); // prompt 4 + two correct checks 16 + surface 20 (IDK earns no check XP)
});

test('double answers and a reload create exactly one record and one XP event per key', () => {
  const storage = memory();
  const clock = { t: 1760000000000 };
  const p = make(storage, clock);
  p.startDive(dive, 'c1', 1);
  p.answerPrompt(dive.id, 'p1', true);
  p.answerPrompt(dive.id, 'p1', false);
  p.answerCheck(dive.id, 'k1', true, false, 'c.one');
  p.answerCheck(dive.id, 'k1', false, false, 'c.one');
  p.answerCheck(dive.id, 'k2', true, false, 'c.two');
  p.answerCheck(dive.id, 'k3', true, false, 'c.three');
  p.surface(dive);
  p.surface(dive);
  p.flush();
  assert.equal(p.dive(dive.id).prompts.p1.ok, true);
  assert.equal(p.dive(dive.id).checks.k1.ok, true);
  assert.equal(Object.keys(p.state.xp).filter(k => k === 'prompt:test-d1:p1:first-ok').length, 1);
  assert.equal(Object.keys(p.state.xp).filter(k => k === 'check:test-d1:k1:first-ok').length, 1);
  assert.equal(Object.keys(p.state.xp).filter(k => k === 'dive:test-d1:surface').length, 1);
  assert.equal(p.dailyGoal().done, 1);
  assert.equal(Object.keys(p.state.reviews).length, 2);
  assert.equal(p.surface(dive).already, true);
});

test('a correct retrieval at least 20 hours after exposure reaches Recalled; later wrong never lowers it', () => {
  const storage = memory();
  const clock = { t: 1760000000000 };
  const p = make(storage, clock);
  p.startDive(dive, 'c1', 1);
  p.markCardSeen(dive.id, 'c1', ['c.one']);
  assert.equal(p.stage('c.one'), 1);
  clock.t += 20 * 3600000 + 1;
  p.answerCheck(dive.id, 'k1', true, false, 'c.one', false);
  assert.equal(p.stage('c.one'), 3);
  assert.ok(p.concept('c.one').recalledAt);
  p.reviewAnswer('v10:test-d1:r1', false);
  assert.equal(p.stage('c.one'), 3);
});

test('surface refuses before three checks and IDK still counts toward surfacing', () => {
  const storage = memory();
  const p = make(storage, { t: 1760000000000 });
  p.startDive(dive, 'c1', 1);
  p.answerCheck(dive.id, 'k1', false, true, 'c.one');
  p.answerCheck(dive.id, 'k2', false, true, 'c.two');
  assert.equal(p.surface(dive).error, 'checks-incomplete');
  p.answerCheck(dive.id, 'k3', false, true, 'c.three');
  assert.equal(p.surface(dive).surfaced, true);
  assert.equal(p.dive(dive.id).status, 'surfaced');
});

test('merge keeps the furthest status, latest position, max stage and the union of XP', () => {
  const clock = { t: 1760000000000 };
  const a = make(memory(), clock);
  const b = make(memory(), clock);
  a.startDive(dive, 'c1', 1);
  b.startDive(dive, 'c1', 1);
  b.markCardSeen(dive.id, 'c2', ['c.one']);
  b.raise('c.one', 3);
  clock.t += 10;
  b.setCard(dive.id, 'c2', 1);
  a.mergeState(b.state);
  assert.equal(a.dive(dive.id).cardId, 'c2');
  assert.equal(a.stage('c.one'), 3);
  assert.ok(a.state.legacy);
});

test('legacy import backs up verbatim, imports counts, and a second import is a zero-event no-op', () => {
  const rawS = fs.readFileSync(path.join(FIX, 'legacy-codex.json'), 'utf8');
  const rawL = fs.readFileSync(path.join(FIX, 'legacy-lounge.json'), 'utf8');
  const rawR = fs.readFileSync(path.join(FIX, 'legacy-srs.json'), 'utf8');
  const storage = memory({
    polymath_codex_v1: rawS,
    cx_lounge_world_v1: rawL,
    cx_v5_srs: rawR
  });
  const p = make(storage, { t: 1760000000000 });
  const first = p.importLegacy();
  assert.equal(first.imported, true);
  assert.equal(first.xp, 240);
  assert.equal(first.charted, 2);
  assert.equal(first.seen, 2);
  assert.equal(first.known, 2);
  assert.equal(first.srs, 2);
  assert.equal(p.state.legacy.charted['s1-1'], true);
  assert.equal(p.state.legacy.charted['s2-4'], true);
  assert.ok(storage.getItem('cx_v10_progress_bak'));
  assert.equal(storage.getItem('polymath_codex_v1'), rawS);
  assert.equal(storage.getItem('cx_lounge_world_v1'), rawL);
  assert.equal(storage.getItem('cx_v5_srs'), rawR);
  const xpBefore = Object.keys(p.state.xp).length;
  const second = p.importLegacy();
  assert.equal(second.imported, false);
  assert.equal(second.reason, 'unchanged');
  assert.equal(Object.keys(p.state.xp).length, xpBefore);
});

test('corrupt progress is copied aside, a fresh store loads, and the corrupt bytes are not overwritten', () => {
  const raw = fs.readFileSync(path.join(FIX, 'progress-corrupt.json'), 'utf8');
  const storage = memory({ [KEY]: raw });
  const p = make(storage, { t: 1760000000000 });
  assert.equal(p.source, 'recovered');
  assert.equal(p.lastError.code, 'corrupt');
  assert.equal(storage.getItem(KEY), raw);
  assert.ok(Object.keys(storage.dump()).some(k => k.startsWith(KEY + '_corrupt_')));
  assert.deepEqual(p.state.dives, {});
});

test('a newer schema is read-only and never writes', () => {
  const raw = fs.readFileSync(path.join(FIX, 'progress-newer.json'), 'utf8');
  const storage = memory({ [KEY]: raw });
  const p = make(storage, { t: 1760000000000 });
  assert.equal(p.readonly, true);
  assert.equal(p.source, 'newer');
  p.startDive(dive, 'c1', 1);
  assert.equal(p.flush(), false);
  assert.equal(storage.getItem(KEY), raw);
});

test('storage failure becomes an error, never a false saved state', () => {
  const p = make(failing(), { t: 1760000000000 });
  p.startDive(dive, 'c1', 1);
  assert.equal(p.flush(), false);
  assert.equal(p.status, 'error');
  assert.equal(p.lastError.code, 'QuotaExceededError');
  assert.notEqual(p.status, 'saved');
});

test('valid v2 fixture imports through export/import without losing counts', () => {
  const raw = fs.readFileSync(path.join(FIX, 'progress-v2.json'), 'utf8');
  const p = make(memory(), { t: 1760000000000 });
  const res = p.importJSON(raw);
  assert.equal(res.ok, true);
  assert.equal(p.dive('ratios-d1').status, 'surfaced');
  assert.equal(p.wreck('s1-1').status, 'read');
  assert.ok(p.state.collection['measuring-cup']);
  assert.equal(p.exportJSON().includes('"v": 2'), true);
});

test('huge fixture loads and its XP total remains the sum of events', () => {
  const raw = fs.readFileSync(path.join(FIX, 'progress-huge.json'), 'utf8');
  const p = make(memory({ [KEY]: raw }), { t: 1760000000000 });
  assert.equal(p.xpTotal(), 2200);
  assert.ok(raw.length > 80000);
});
