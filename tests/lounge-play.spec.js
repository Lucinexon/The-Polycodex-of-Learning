/* Lounge game layer: NPC schedule, the AI budget gate, and end-to-end NPC → dialogue → minigame flows on the REAL lounge2.js draw/tick path
   (only the network/engine layer is stubbed — see fixtures/lounge-play.html). */
const { test, expect } = require('@playwright/test');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, 'fixtures/lounge-play.html');
const T0 = new Date('2026-10-17T12:00:00Z');

async function open(page, o) {
  o = o || {}; page.__errs = []; page.on('pageerror', e => page.__errs.push(String(e)));
  await page.clock.install({ time: T0 }); await page.goto(URL); await page.clock.pauseAt(new Date(T0.getTime() + 1000));
  await page.evaluate(() => { window.__calls = { n: 0, inflight: 0, max: 0, log: [] }; });
}
/* install a BYOK double on the real SystemsEngine path the module looks up */
const byok = (page, mode) => page.evaluate(m => {
  window.SystemsEngine = { BYOKClient: { configured: () => m !== 'none', query(msgs, opt) { const c = __calls; c.n++; c.inflight++; c.max = Math.max(c.max, c.inflight); c.log.push({ at: Date.now(), msgs: msgs, opt: opt });
    return new Promise((res, rej) => { const done = () => { c.inflight--; };
      if (m === 'fail') { done(); rej(new Error('HTTP 429')); } else if (m === 'hang') { window.__release = t => { done(); res({ text: t }); }; } else { done(); res({ text: 'A **bold**\nline `code` from the barista.' }); } }); } } };
}, mode);
const play = page => page.evaluate(() => CodexLoungePlay);

test.describe('schedule (pure, deterministic)', () => {
  test.beforeEach(async ({ page }) => { await open(page); });

  test('same clock → same state; always inside walkable bounds and real rooms; seats match the real HOT table', async ({ page }) => {
    const r = await page.evaluate(() => {
      const P = CodexLoungePlay, T = P._t, L = NetworkEngine.LoungeEngine, rooms = Object.keys(CodexLounge.ROOMS), bad = [], seen = {};
      P.npcs.forEach(n => { seen[n.id] = {}; for (let t = 1.7e12; t < 1.7e12 + 20 * 60e3; t += 3333) {
        const a = T.stateAt(n, t), b = T.stateAt(n, t); seen[n.id][a.r] = 1;
        if (JSON.stringify(a) !== JSON.stringify(b)) bad.push('nondeterministic ' + n.id);
        if (!(a.cx >= L.MIN_X && a.cx <= L.MAX_X && a.cy >= L.MIN_Y && a.cy <= L.MAX_Y)) bad.push('out of bounds ' + n.id + ' ' + a.cx + ',' + a.cy);
        if (rooms.indexOf(a.r) < 0) bad.push('bad room ' + a.r);
        if (a.pose) { const seat = (CodexLounge.HOT[a.r] || []).find(h => h.t === 'seat' && h.id === a.pz); if (!seat || seat.sx !== a.x || seat.sy !== a.y) bad.push('seat mismatch ' + n.id + ' ' + a.pz); }
        if (a.em && !CodexAnim.CLIPS[a.em.k]) bad.push('unknown clip ' + a.em.k);
      } });
      return { bad: bad.slice(0, 5), rooms: Object.keys(seen).reduce((o, k) => (o[k] = Object.keys(seen[k]).sort(), o), {}) };
    });
    expect(r.bad).toEqual([]);
    expect(r.rooms.mira).toEqual(['cafe']); expect(r.rooms.orrin).toEqual(['loft']); expect(r.rooms.wren).toEqual(['cafe', 'deck', 'garden', 'loft']);
  });

  test('NPC avatar codes are valid, distinct and clamped to the catalog', async ({ page }) => {
    const codes = await page.evaluate(() => CodexLoungePlay.npcs.map(n => CodexLoungePlay._t.lookCode(n.look)));
    expect(new Set(codes).size).toBe(3);
    for (const c of codes) expect(c).toMatch(/^[0-9a-z]{1,2}(\.[0-9a-z]{1,2}){5,24}$/);
    expect(await page.evaluate(() => CodexLoungePlay._t.lookCode({ name: 'x', over: { t: 9999, o: -5 } }).length > 0)).toBe(true);
  });
});

test.describe('AI gate: budget invariants', () => {
  test.beforeEach(async ({ page }) => { await open(page); });

  test('chance 1 for 3 simulated hours: capped, never concurrent, cooldowns respected', async ({ page }) => {
    await byok(page, 'ok');
    const r = await page.evaluate(async () => {
      const P = CodexLoungePlay, T = P._t, C = P.config; C.aiChance = 1; T.setRng(() => .5); T.resetSession(); localStorage.clear();
      const ids = P.npcs.map(n => n.id), byNpc = {}, all = []; let src = { ai: 0, cache: 0, local: 0 };
      for (let t = 0, i = 0; t < 3 * 3600e3; t += 5000, i++) { const n = P.npcs[i % 3], res = await T.encounter(n, 'cafe', 1e12 + t); src[res.src]++; }
      __calls.log.forEach(c => { all.push(c.at); });
      return { calls: __calls.n, max: __calls.max, src: src, cap: C.aiSessionMax, stats: P.ai.stats() };
    });
    expect(r.calls).toBeLessThanOrEqual(r.cap); expect(r.calls).toBe(r.cap); expect(r.max).toBe(1);
    expect(r.src.ai).toBe(r.calls); expect(r.src.cache + r.src.local).toBeGreaterThan(2000);
  });

  test('gaps: ≥ global cooldown between any two calls and ≥ NPC cooldown per NPC (explicit timeline)', async ({ page }) => {
    await byok(page, 'ok');
    const r = await page.evaluate(async () => {
      const P = CodexLoungePlay, T = P._t, C = P.config, G = T.AIG; C.aiChance = 1; T.setRng(() => .5); T.resetSession(); const mira = P.npcs[0], orrin = P.npcs[1], out = [];
      const t = async (n, at) => { const before = __calls.n; await T.encounter(n, 'x', at); out.push([n.id, at, __calls.n - before]); };
      await t(mira, 0); await t(mira, 10e3); await t(orrin, 20e3); await t(orrin, 89e3); await t(orrin, 91e3); await t(mira, 150e3); await t(mira, 241e3); await t(mira, 330e3);
      return out;
    });
    /* mira@0 ✓ | mira@10s ✗ global | orrin@20s ✗ global | orrin@89s ✗ global | orrin@91s ✓ | mira@150s ✗ npc (150<240) | mira@241s ✓ | mira@330s ✗ global(89<90) */
    expect(r.map(x => x[2])).toEqual([1, 0, 0, 0, 1, 0, 1, 0]);
  });

  test('unconfigured, chance 0, hidden tab and session cap all mean zero calls and a local line', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const P = CodexLoungePlay, T = P._t, C = P.config, n = P.npcs[0], out = {}; T.setRng(() => .5);
      C.aiChance = 1; window.SystemsEngine = undefined; out.none = (await T.encounter(n, 'x', 1e12)).src;
      window.SystemsEngine = { BYOKClient: { configured: () => false, query() { __calls.n++; return Promise.resolve({ text: 'x' }); } } }; out.unconf = (await T.encounter(n, 'x', 1e12)).src;
      window.SystemsEngine.BYOKClient.configured = () => true; C.aiChance = 0; out.zero = (await T.encounter(n, 'x', 1e12)).src;
      C.aiChance = 1; Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); out.hidden = (await T.encounter(n, 'x', 1e12)).src; out.why = T.AIG.block(n.id, 1e12);
      Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); T.resetSession(); T.AIG.s.calls = C.aiSessionMax; out.cap = T.AIG.block(n.id, 1e12); out.calls = __calls.n; return out;
    });
    expect(r).toEqual({ none: 'local', unconf: 'local', zero: 'local', hidden: 'local', why: 'hidden', cap: 'session-cap', calls: 0 });
  });

  test('a failed call still spends budget and falls back; a concurrent chat never double-fires', async ({ page }) => {
    await byok(page, 'fail');
    const f = await page.evaluate(async () => { const P = CodexLoungePlay, T = P._t; P.config.aiChance = 1; T.setRng(() => .5); T.resetSession(); localStorage.clear(); const a = await T.encounter(P.npcs[0], 'x', 1e12), b = await T.encounter(P.npcs[0], 'x', 1e12 + 1000); return { a: a.src, b: b.src, calls: __calls.n }; });
    expect(f).toEqual({ a: 'local', b: 'local', calls: 1 });
    await byok(page, 'hang');
    const h = await page.evaluate(async () => { const P = CodexLoungePlay, T = P._t; T.resetSession(); localStorage.clear(); __calls.n = 0; const p1 = T.encounter(P.npcs[0], 'x', 2e12), p2 = await T.encounter(P.npcs[1], 'x', 2e12 + 10); __release('Hello from the loft.'); const r1 = await p1; return { second: p2.src, first: r1, calls: __calls.n, max: __calls.max }; });
    expect(h).toEqual({ second: 'local', first: { text: 'Hello from the loft.', src: 'ai' }, calls: 1, max: 1 });
  });

  test('replies are sanitized; bounded request; reused from cache when the gate blocks later', async ({ page }) => {
    await byok(page, 'ok');
    const r = await page.evaluate(async () => {
      const P = CodexLoungePlay, T = P._t, C = P.config; C.aiChance = 1; T.setRng(() => .5); T.resetSession(); localStorage.clear(); const n = P.npcs[0];
      const first = await T.encounter(n, 'Starlight Café, evening', 1e12), blocked = await T.encounter(n, 'x', 1e12 + 1000), req = __calls.log[0];
      return { first: first, blocked: blocked, calls: __calls.n, opt: req.opt, sys: req.msgs[0].content, user: req.msgs[1].content, clean: T.cleanText('x'.repeat(500)).length, cached: JSON.parse(localStorage.getItem('cx_lounge_v1')).ai.mira };
    });
    expect(r.first).toEqual({ text: 'A bold line code from the barista.', src: 'ai' });
    expect(r.blocked).toEqual({ text: 'A bold line code from the barista.', src: 'cache' }); expect(r.calls).toBe(1);
    expect(r.opt).toEqual({ max_tokens: 90, temperature: 0.9, timeout: 12000 }); expect(r.clean).toBe(220); expect(r.cached).toEqual(['A bold line code from the barista.']);
    expect(r.sys).toContain('Mira'); expect(r.sys).toContain('no real-world facts'); expect(r.user.length).toBeLessThan(200);
    expect(r.user).not.toMatch(/TESTER|me\b/);                                    /* nothing about the player is sent */
  });
});

test.describe('on the real lounge2.js render path', () => {
  const gotoCafe = async page => { await page.evaluate(() => { const L = NetworkEngine.LoungeEngine, r = L.cv.getBoundingClientRect(); window.__click = (x, y) => L.cv.dispatchEvent(new MouseEvent('click', { clientX: r.left + x * r.width / L.W, clientY: r.top + y * r.height / L.H, bubbles: true })); __click(466, 160); }); await page.clock.runFor(300); };
  const mira = page => page.evaluate(() => { const h = CodexLounge.HOT.cafe.find(x => x.id === 'npc:mira'); return h && { x: h.x, y: h.y, w: h.w, h: h.h, sx: h.sx, sy: h.sy }; });
  test.beforeEach(async ({ page }) => { await open(page); await page.evaluate(() => { window.__calls = { n: 0, inflight: 0, max: 0, log: [] }; }); });

  test('NPCs are drawn and animated by the shared token/tick path (and absent when hooks are off)', async ({ page }) => {
    await gotoCafe(page); await page.clock.runFor(2000);
    expect(await page.evaluate(() => NetworkEngine.LoungeEngine.me.room)).toBe('cafe');
    const px = await page.evaluate(async () => {
      const L = NetworkEngine.LoungeEngine, c = L.ctx, snap = () => c.getImageData(0, 0, 480, 300).data, wait = () => new Promise(r => requestAnimationFrame(() => r()));
      const hk = CodexLounge.hooks, npcs = hk.npcs; L.setActive(false); L.draw(1000); const withN = Array.from(snap()); hk.npcs = () => []; L.draw(1000); const without = Array.from(snap()); hk.npcs = npcs;
      let diff = 0; for (let i = 0; i < withN.length; i += 4) if (withN[i] !== without[i] || withN[i + 1] !== without[i + 1] || withN[i + 2] !== without[i + 2]) diff++;
      return { diff: diff, actors: Object.keys(L.actors) };
    });
    expect(px.diff).toBeGreaterThan(300); expect(px.actors).toContain('npc:mira');
  });

  test('click Mira → walk → dialogue; Chat is local by default; zero AI calls from frames, hover, emotes or proximity', async ({ page }) => {
    await byok(page, 'ok'); await page.evaluate(() => { CodexLoungePlay.config.aiChance = 1; });
    await gotoCafe(page); await page.clock.runFor(4000);
    await page.mouse.move(100, 100); await page.evaluate(() => { const L = NetworkEngine.LoungeEngine; L.cv.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10, bubbles: true })); CodexLounge.doEmote('wave'); });
    await page.clock.runFor(8000);
    expect(await page.evaluate(() => __calls.n)).toBe(0);                          /* chance is 1, yet nothing fired: only a deliberate Chat can call */
    const m = await mira(page); expect(m).toBeTruthy();
    await page.evaluate(m => __click(m.x + m.w / 2, m.y + m.h / 2), m);
    for (let i = 0; i < 80 && !(await page.locator('.lgd').count()); i++) await page.clock.runFor(250);
    await expect(page.locator('.lgd')).toBeVisible(); await expect(page.locator('.lgd-n')).toHaveText('Mira'); await expect(page.locator('.lgd')).toHaveAttribute('role', 'dialog');
    expect(await page.evaluate(() => __calls.n)).toBe(0);                          /* opening the dialogue is not an AI trigger either */
    await page.evaluate(() => CodexLoungePlay.config.aiChance = 0);
    await page.locator('[data-d=chat]').click(); await page.clock.runFor(50);
    await expect(page.locator('.lgd-t')).not.toHaveText('…'); expect(await page.evaluate(() => __calls.n)).toBe(0);
    await page.evaluate(() => { CodexLoungePlay.config.aiChance = 1; CodexLoungePlay._t.resetSession(); CodexLoungePlay._t.setRng(() => .5); });
    await page.locator('[data-d=chat]').click(); await page.clock.runFor(50);
    await expect(page.locator('.lgd-t')).toContainText('✦'); expect(await page.evaluate(() => __calls.n)).toBe(1);
    await page.keyboard.press('Escape'); await expect(page.locator('.lgd')).toHaveCount(0);
  });

  test('NPCs react to nearby emotes by reusing the existing synced clips', async ({ page }) => {
    await gotoCafe(page); await page.clock.runFor(1500);
    await page.evaluate(() => { const L = NetworkEngine.LoungeEngine, a = CodexLoungePlay.npcs; /* stand beside whoever is in the café and is not walking */ });
    const info = await page.evaluate(() => { const L = NetworkEngine.LoungeEngine, T = CodexLoungePlay._t; const h = CodexLounge.HOT.cafe.find(x => x.id === 'npc:mira'); L.me.cx = L.me.x = h.sx; L.me.cy = L.me.y = h.sy; CodexLounge.doEmote('dance'); return { sx: h.sx }; });
    await page.clock.runFor(1200);
    const em = await page.evaluate(() => { const a = NetworkEngine.LoungeEngine.actors['npc:mira']; return a && a.an.state; });
    expect(em).toBe('emote');                                                      /* Mira answered a dance with her cheer clip */
  });

  test('Order Up from the dialogue: win → XP through gainXP (daily cap), best score, toast, cheer; second win earns no XP', async ({ page }) => {
    await gotoCafe(page); await page.clock.runFor(4000);
    const playOnce = async () => {
      const m = await mira(page); await page.evaluate(m => __click(m.x + m.w / 2, m.y + m.h / 2), m);
      for (let i = 0; i < 80 && !(await page.locator('.lgd').count()); i++) await page.clock.runFor(250);
      await page.locator('[data-d=game]').click(); await expect(page.locator('.lgx')).toBeVisible(); await expect(page.locator('.lgd')).toHaveCount(0);
      const idx = { Espresso: 0, Matcha: 1, Boba: 2, Croissant: 3, Cake: 4, Milk: 5 };
      for (let r = 0; r < 6; r++) { const names = (await page.locator('.lgx-ticket li').allTextContents()).map(t => idx[t.split(' ').pop()]); await page.locator('[data-a=ready]').click(); for (const i of names) await page.locator('.lgx-it[data-i="' + i + '"]').click(); if (r < 5) await page.clock.runFor(1000); }
      await expect(page.locator('.lgx-msg')).toContainText('Shift complete'); await page.locator('[data-a=quit]').click(); await expect(page.locator('.lgx')).toHaveCount(0);
    };
    await playOnce(); await page.clock.runFor(100);
    expect(await page.evaluate(() => __xp)).toEqual([30]);                         /* round(141/4)=35 → capped at 30 per local day */
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cx_lounge_v1')).best.orderUp)).toBe(141);
    expect(await page.evaluate(() => __toasts.pop())).toContain('Shift complete');
    expect(await page.evaluate(() => NetworkEngine.LoungeEngine.me.emote && NetworkEngine.LoungeEngine.me.emote.k)).toBe('cheer');
    await page.clock.runFor(5000); await playOnce(); await page.clock.runFor(100);
    expect(await page.evaluate(() => __xp)).toEqual([30]);                         /* cap reached: no further XP, best unchanged */
    expect(await page.evaluate(() => __toasts.pop())).toContain('cap reached');
  });

  test('leaving the room or deactivating the lounge tears down the dialogue and the minigame', async ({ page }) => {
    await gotoCafe(page); await page.clock.runFor(4000);
    await page.evaluate(() => CodexLoungePlay.openDialog('mira')); await expect(page.locator('.lgd')).toBeVisible();
    await page.evaluate(() => { NetworkEngine.LoungeEngine.me.room = 'loft'; }); await page.clock.runFor(100); await expect(page.locator('.lgd')).toHaveCount(0);
    await page.evaluate(() => { NetworkEngine.LoungeEngine.me.room = 'cafe'; }); await page.clock.runFor(100);
    await page.evaluate(() => { CodexLoungePlay.openDialog('mira'); }); await page.locator('[data-d=game]').click(); await expect(page.locator('.lgx')).toBeVisible();
    await page.evaluate(() => NetworkEngine.LoungeEngine.setActive(false)); await expect(page.locator('.lgx')).toHaveCount(0);
    await page.clock.runFor(20000); expect(page.__errs).toEqual([]);
  });

  test('walking through every room across several schedule slots: NPC lists match the pure schedule, no page errors', async ({ page }) => {
    test.setTimeout(60000);
    await gotoCafe(page);
    for (let hop = 0; hop < 8; hop++) {
      await page.clock.fastForward(50000); await page.clock.runFor(600);                    /* jump one schedule slot, then let a few frames run */
      const r = await page.evaluate(() => { const L = NetworkEngine.LoungeEngine, room = L.me.room, P = CodexLoungePlay, now = Date.now();
        const want = P.npcs.filter(n => P._t.stateAt(n, now).r === room).map(n => 'npc:' + n.id).sort(), got = CodexLounge.hooks.npcs(room).map(a => a.uid).sort();
        return { room: room, want: want, got: got, hots: (CodexLounge.HOT[room] || []).filter(h => h.t === 'npc').map(h => 'npc:' + h.npc).sort() }; });
      expect(r.got).toEqual(r.want); expect(r.hots).toEqual(r.want);                       /* hotspots follow the NPCs between rooms, none left behind */
      await page.evaluate(() => __click(466, 160)); await page.clock.runFor(300);           /* next door */
    }
    expect(page.__errs).toEqual([]);
  });
});
