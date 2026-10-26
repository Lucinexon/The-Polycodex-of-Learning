// @ts-check
/* Milestone 2 — room registry, side rooms, interactions, discoveries, quests, presence validation, keyboard play.
   Runs against the REAL index.html. */
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const URL = pathToFileURL(resolve(process.cwd(), 'index.html')).href;
test.use({ viewport: { width: 1440, height: 900 } });

async function boot(page, seed) {
  if (seed) await page.addInitScript(s => { for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); }, seed);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => Boolean(window.CodexLounge?.registerRoom && window.CodexLoungeWorld && window.CodexLoungeConsole && window.NetworkEngine?.LoungeEngine));
  await page.evaluate(() => { window.__xp = []; window.gainXP = (n) => { window.__xp.push(n); }; window.showScreen('lobby'); });
  await page.waitForFunction(() => window.NetworkEngine.LoungeEngine.active && window.CodexLounge.ROOMS.dome);
  return errors;
}
const room = page => page.evaluate(() => window.CodexLounge.room());
const me = page => page.evaluate(() => { const m = window.NetworkEngine.LoungeEngine.me; return { room: m.room, x: m.x, y: m.y, walk: m.walk }; });
const waitRoom = (page, id) => page.waitForFunction(r => window.CodexLounge.room() === r, id, { timeout: 8000 });

test.describe('room registry', () => {
  test('eight rooms; every main room has a real side room; ring and ids are unchanged', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => { const R = window.CodexLounge.ROOMS; return { ids: Object.keys(R), ring: ['deck', 'cafe', 'garden', 'loft'].map(k => [k, R[k].prev, R[k].next]), parents: Object.fromEntries(Object.keys(R).filter(k => R[k].parent).map(k => [k, R[k].parent])), main: window.CodexLounge.mainRooms() }; });
    expect(r.ids.length).toBeGreaterThanOrEqual(8);
    expect(r.main).toEqual(['deck', 'cafe', 'garden', 'loft']);
    expect(r.ring).toEqual([['deck', 'loft', 'cafe'], ['cafe', 'deck', 'garden'], ['garden', 'cafe', 'loft'], ['loft', 'garden', 'deck']]);
    expect(new Set(Object.values(r.parents))).toEqual(new Set(['deck', 'cafe', 'garden', 'loft']));
    expect(r.parents).toEqual({ dome: 'deck', kitchen: 'cafe', conservatory: 'garden', archive: 'loft' });
  });

  test('every hotspot is inside the canvas, ids are unique per room, seat ids fit the presence format, doors have a return path and valid spawns', async ({ page }) => {
    await boot(page);
    const bad = await page.evaluate(() => {
      const G = window.CodexLounge, out = [];
      Object.keys(G.ROOMS).forEach(id => {
        const seen = {};
        (G.HOT[id] || []).filter(h => !h.npc).forEach(h => {
          if (seen[h.id]) out.push(id + ': duplicate ' + h.id); seen[h.id] = 1;
          if (!(h.x >= 0 && h.y >= 0 && h.x + h.w <= 480 && h.y + h.h <= 300 && h.w > 0 && h.h > 0)) out.push(id + ': ' + h.id + ' outside canvas');
          if (!(h.sx >= 16 && h.sx <= 464 && h.sy >= 205 && h.sy <= 282)) out.push(id + ': ' + h.id + ' stand point not on walkable floor');
          if (h.t === 'seat' && !/^[a-z0-9]{1,8}$/.test(h.id)) out.push(id + ': seat id ' + h.id);
          if (h.t === 'door') {
            if (!G.ROOMS[h.to]) out.push(id + ': door to unknown ' + h.to);
            else if (!(G.HOT[h.to] || []).some(b => b.t === 'door' && b.to === id)) out.push(h.to + ': no door back to ' + id);
          }
        });
        const sp = G.ROOMS[id].spawn; if (sp) { const pts = [sp].concat(Object.values(sp.from || {})).filter(p => p && p.x != null); pts.forEach(p => { if (!(p.x >= 16 && p.x <= 464 && p.y >= 205 && p.y <= 282)) out.push(id + ': spawn off the floor'); }); }
      });
      return out;
    });
    expect(bad).toEqual([]);
  });

  test('registerRoom rejects malformed definitions instead of registering them', async ({ page }) => {
    await boot(page);
    const res = await page.evaluate(() => {
      const G = window.CodexLounge, errs = console.error; console.error = () => {};
      const r = [G.registerRoom({ id: 'Bad_ID', n: 'x', i: 'x' }), G.registerRoom({ id: 'orphan', parent: 'nowhere', n: 'x', i: 'x' }), G.registerRoom({ id: 'deepsub', parent: 'dome', n: 'x', i: 'x' }),
        G.registerRoom({ id: 'offmap', n: 'x', i: 'x', hot: [{ id: 'a', x: 900, y: 10, w: 5, h: 5, sx: 10, sy: 210 }] }), G.registerRoom({ id: 'seatbad', n: 'x', i: 'x', hot: [{ id: 'toolongid1', t: 'seat', x: 10, y: 10, w: 5, h: 5, sx: 10, sy: 210 }] }),
        G.registerRoom({ id: 'nodoor', n: 'x', i: 'x', hot: [{ id: 'd', t: 'door', x: 10, y: 10, w: 5, h: 5, sx: 10, sy: 210 }] })];
      console.error = errs; return { r: r, leaked: ['orphan', 'deepsub', 'offmap', 'seatbad', 'nodoor', 'Bad_ID'].filter(k => G.ROOMS[k]) };
    });
    expect(res.r).toEqual([false, false, false, false, false, false]);
    expect(res.leaked).toEqual([]);
  });
});

test.describe('transitions', () => {
  for (const [parent, sub, door] of [['deck', 'dome', 'to_dome'], ['cafe', 'kitchen', 'to_kitchen'], ['garden', 'conservatory', 'to_conservatory']]) {
    test(`${parent} → ${sub} → back: walk to the door, arrive at its spawn, return in front of the same door`, async ({ page }) => {
      const errors = await boot(page);
      await page.evaluate(p => window.CodexLounge.setRoom(p, { force: true }), parent);
      expect(await page.evaluate(d => window.CodexLounge.walkTo(d), door)).toBe(true);
      await waitRoom(page, sub);
      let m = await me(page);
      expect(m.walk).toBe(false); expect(m.x).toBe(66); expect(m.y).toBe(238);                   // entry spawn declared by the side room
      expect(await page.locator('#lgBar .lg-crumb').innerText()).toContain('↳');
      expect(await page.evaluate(() => window.NetworkEngine.LoungeEngine.extra())).toMatchObject({ r: parent, sr: sub });
      expect(await page.evaluate(() => window.CodexLounge.walkTo('out'))).toBe(true);
      await waitRoom(page, parent);
      m = await me(page);
      const door0 = await page.evaluate(([p, s]) => window.CodexLounge.ROOMS[p].spawn.from[s], [parent, sub]);
      expect({ x: m.x, y: m.y }).toEqual(door0);
      expect(await page.evaluate(() => window.NetworkEngine.LoungeEngine.extra().sr)).toBe('');
      expect(errors).toEqual([]);
    });
  }

  test('the Archive is locked until 3 discoveries: refused with a reason, then opens', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.CodexLounge.setRoom('loft', { force: true }));
    const lockedEvents = await page.evaluate(() => { window.__locked = []; window.CodexLounge.on('locked', e => window.__locked.push(e)); window.CodexLounge.setRoom('archive', { from: 'loft' }); return window.__locked; });
    expect(lockedEvents).toHaveLength(1); expect(lockedEvents[0].why).toMatch(/0\/3/);
    expect(await room(page)).toBe('loft');
    expect(await page.evaluate(() => window.CodexLounge.label(window.CodexLounge.HOT.loft.find(h => h.id === 'to_archive')))).toContain('0/3');
    await page.evaluate(() => { const W = window.CodexLoungeWorld; W.discover('espresso', { quiet: true }); W.discover('matcha', { quiet: true }); });
    expect(await page.evaluate(() => window.CodexLounge.setRoom('archive', { from: 'loft' }))).toBe(false);
    await page.evaluate(() => window.CodexLoungeWorld.discover('boba', { quiet: true }));
    expect(await page.evaluate(() => window.CodexLounge.lockOf('archive'))).toBeNull();
    expect(await page.evaluate(() => window.CodexLounge.setRoom('archive', { from: 'loft' }))).toBe(true);
    expect(await room(page)).toBe('archive');
  });

  test('the Console lists side rooms as exits and marks a locked one', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.CodexLounge.setRoom('loft', { force: true }));
    const ex = page.locator('#lcPanel-room .lc-exit', { hasText: 'Archive Stacks' });
    await expect(ex).toBeVisible();
    await expect(ex).toContainText('🔒');
    await page.locator('#lcPanel-room .lc-exit', { hasText: 'Glow Greenhouse' }).click();
    await expect(page.locator('#lcPanel-room .lc-room-name')).toHaveText('Glow Greenhouse');
    await page.locator('#lcPanel-room .lc-exit', { hasText: 'Conservatory' }).click();
    await expect(page.locator('#lcPanel-room .lc-room-name')).toHaveText('Bioluminescent Conservatory');
    await expect(page.locator('#lcPanel-room .lc-exit', { hasText: 'Glow Greenhouse' })).toBeVisible();   // return path is listed
  });
});

test.describe('presence validation (remote data is untrusted)', () => {
  test('r must be a main room; sr only counts if the registry says it belongs to that r; junk falls back safely', async ({ page }) => {
    await boot(page);
    const where = await page.evaluate(() => {
      const L = window.NetworkEngine.LoungeEngine, G = window.CodexLounge, old = L.players;
      const mk = (r, sr) => ({ n: 'X', r: r, sr: sr, av: '', x: 100, y: 230, cx: 100, cy: 230 });
      L.players = { a: mk('deck', 'dome'), b: mk('cafe', 'dome'), c: mk('loft', 'archive'), d: mk('nowhere', ''), e: mk('dome', ''), f: mk('deck', 'zzzzzzzzzzzzzzzz'), g: mk('garden', 'conservatory') };
      const out = {}; ['deck', 'cafe', 'dome', 'archive', 'loft', 'garden', 'conservatory'].forEach(r => { out[r] = G.who(r).filter(w => w.uid && !w.npc).map(w => w.uid).sort(); }); // who() also includes local NPCs with synthetic uids
      L.players = old; return out;
    });
    expect(where.dome).toEqual(['a']);                    // valid pair
    expect(where.archive).toEqual(['c']);
    expect(where.conservatory).toEqual(['g']);
    expect(where.cafe).toEqual(['b']);                    // sr 'dome' does not belong to cafe → shown in cafe, not the dome
    expect(where.deck).toEqual(['d', 'e', 'f']);          // unknown r / a side room named in r / junk sr → the safe default room
    expect(where.loft).toEqual([]);
  });
});

test.describe('interactions, discoveries and quests', () => {
  test('atlas opens an info card, Escape closes only the card, and the first view of a recipe logs a discovery once', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.CodexLounge.setRoom('dome', { from: 'deck' }));
    await page.locator('#lcPanel-room [data-hot="atlas"]').click();
    await page.waitForFunction(() => document.querySelector('.lgi'));
    await expect(page.locator('.lgi .lgi-t b')).toContainText('Next chart: Southern Cross');
    await expect(page.locator('.lgi svg')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('.lgi')).toHaveCount(0);
    expect(await room(page)).toBe('dome');
    // recipes: browsing is free, each first view is a discovery
    await page.evaluate(() => window.CodexLounge.setRoom('kitchen', { from: 'cafe' }));
    await page.locator('#lcPanel-room [data-hot="recipes"]').click();
    await page.waitForFunction(() => window.CodexLoungeWorld.isFound('espresso'));
    expect(await page.evaluate(() => window.CodexLoungeWorld.isFound('matcha'))).toBe(false);
    await page.locator('.lgi [data-i="next"]').click();
    await page.waitForFunction(() => window.CodexLoungeWorld.isFound('matcha'));
    await page.locator('.lgi [data-i="prev"]').click();
    expect((await page.evaluate(() => window.CodexLoungeProgress.get().log.filter(e => e.k === 'found' && e.id === 'espresso'))).length).toBe(1);   // re-viewing does not log again
  });

  test('keycard quest completes the moment 3 discoveries exist, pays XP exactly once, and survives a reload', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => { const W = window.CodexLoungeWorld; W.discover('espresso', { quiet: true }); W.discover('matcha', { quiet: true }); });
    expect(await page.evaluate(() => window.CodexLoungeProgress.get().quests.keycard)).toBeUndefined();
    await page.evaluate(() => window.CodexLoungeWorld.discover('boba', { quiet: true }));
    expect(await page.evaluate(() => window.CodexLoungeProgress.get().quests.keycard.s)).toBe('done');
    expect(await page.evaluate(() => window.__xp)).toEqual([10]);
    await page.evaluate(() => { window.CodexLoungeWorld.discover('coldchain', { quiet: true }); window.CodexLoungeWorld.evalQuests(); window.CodexLoungeWorld.evalQuests(); });
    expect(await page.evaluate(() => window.__xp)).toEqual([10]);                                       // no repeat
    await page.reload();
    await page.waitForFunction(() => window.CodexLoungeWorld && window.CodexLoungeProgress);
    await page.evaluate(() => { window.__xp = []; window.gainXP = n => window.__xp.push(n); window.CodexLoungeWorld.evalQuests(); });
    expect(await page.evaluate(() => window.__xp)).toEqual([]);                                         // persisted as done → never re-awarded
    expect(await page.evaluate(() => window.CodexLoungeProgress.get().quests.keycard.s)).toBe('done');
  });

  test('prerequisite quests stay locked until their parent is done; game quests stay hidden until their game exists', async ({ page }) => {
    await boot(page);
    const st = await page.evaluate(() => { const W = window.CodexLoungeWorld, d = window.CodexLoungeProgress.get(); return Object.fromEntries(W.QUESTS.map(q => [q.id, W.questState(d, q)])); });
    expect(st.rounds).toBe('active'); expect(st.cipher).toBe('locked'); expect(st.rush).toBe('locked'); expect(st.collector).toBe('locked');
  });

  test('visiting all four decks completes “Make the rounds”; Wren acknowledges it once, then states the next objective', async ({ page }) => {
    await boot(page);
    const before = await page.evaluate(() => window.CodexLoungeWorld.npcLine('wren'));
    expect(before.quest).toBe('rounds'); expect(before.text).toMatch(/1 of 4 decks/i); expect(before.go).toBe('deck');   // the deck is already visited on activation, so Wren states progress (not the first-time offer)
    await page.evaluate(() => { const G = window.CodexLounge; ['cafe', 'garden', 'loft', 'deck'].forEach(r => G.setRoom(r, { force: true })); });
    expect(await page.evaluate(() => window.CodexLoungeProgress.get().quests.rounds.s)).toBe('done');
    const ack = await page.evaluate(() => window.CodexLoungeWorld.npcLine('wren'));
    expect(ack.text).toMatch(/four decks/i); expect(ack.quest).toBeUndefined();
    const next = await page.evaluate(() => window.CodexLoungeWorld.npcLine('wren'));
    expect(next.quest).toBe('sidedoors');
  });

  test('Quests tab shows real progress and “Go there” travels', async ({ page }) => {
    await boot(page);
    await page.locator('#lcTab-quests').click();
    const card = page.locator('#lcPanel-quests .lc-quest', { hasText: 'Make the rounds' });
    await expect(card).toBeVisible();
    await expect(card.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '1');
    await expect(card).toContainText('1/4');
    await page.evaluate(() => window.CodexLounge.setRoom('cafe', { force: true }));
    await expect(card.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '2');
    await expect(page.locator('#lcTab-quests .lc-badge')).toBeVisible();
    await page.locator('#lcPanel-quests .lc-quest', { hasText: 'Behind the doors' }).locator('.lc-go').click();
    expect(await room(page)).toBe('deck');
  });
});

test.describe('keyboard and pause', () => {
  test('canvas is focusable; arrows move; E uses the nearest object; pause blocks input; Esc/other keys do not leak', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.CodexLounge.setRoom('dome', { from: 'deck' }));
    await page.locator('#loungeCanvas').focus();
    const a = await me(page);
    await page.keyboard.press('ArrowRight');
    const b = await me(page);
    expect(b.x).toBe(a.x + 30); expect(b.walk).toBe(true);
    await page.keyboard.press('ArrowUp'); expect((await me(page)).y).toBe(b.y - 22);
    // walk next to the atlas, then press E
    await page.evaluate(() => { const m = window.NetworkEngine.LoungeEngine.me; m.x = m.cx = 84; m.y = m.cy = 212; m.walk = false; });
    await page.waitForFunction(() => window.CodexLounge.nearest() && window.CodexLounge.nearest().id === 'atlas');
    await page.keyboard.press('e');
    await page.waitForFunction(() => document.querySelector('.lgi'));
    await page.keyboard.press('Escape');
    // pause: movement and interaction keys are ignored while a game/panel owns input
    await page.evaluate(() => window.CodexLounge.pause('t'));
    await page.locator('#loungeCanvas').focus();
    const c = await me(page); await page.keyboard.press('ArrowLeft'); expect((await me(page)).x).toBe(c.x);
    await page.evaluate(() => window.CodexLounge.resume('t'));
    await page.keyboard.press('ArrowLeft'); expect((await me(page)).x).toBe(c.x - 30);
    expect(await page.evaluate(() => window.CodexLounge.paused())).toBe(false);
  });
});
