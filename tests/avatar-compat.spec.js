// @ts-check
/* Avatar compatibility + variety. Golden codes were captured from the ORIGINAL main (commit 678abae) before the catalogs were extended:
   saved looks, chat fallbacks (forName) and the public CodexAvatar API must keep working, while every NEW option must be visually distinct. */
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const URL = pathToFileURL(resolve(process.cwd(), 'index.html')).href;
const GOLDEN_NAMES = {
  "lucinexon": "5.0.m.2.c.0.a.0.4.0.0.0.0.0.0.5.0.0.0.7.1.9",
  "Mira": "2.0.1.3.c.0.a.f.2.9.0.0.0.0.0.7.0.0.0.1.1.1",
  "Orrin": "2.0.b.e.c.0.a.c.9.0.0.0.0.0.0.a.0.0.1.4.4.4",
  "Wren": "8.0.3.3.c.0.a.0.b.0.0.0.0.0.0.0.0.0.4.6.0.2",
  "ada": "1.0.m.4.c.0.a.c.7.0.0.0.0.0.0.0.0.0.0.2.4.4",
  "kai": "2.0.n.4.c.0.a.f.4.0.0.0.0.0.0.1.0.0.0.7.1.1",
  "noor": "2.0.n.e.c.0.a.a.3.0.0.0.0.0.0.0.0.0.4.2.4.4",
  "tess": "6.0.n.4.c.0.a.h.c.0.0.0.0.0.0.5.0.0.3.7.3.7",
  "bo": "8.0.m.e.c.0.a.1.a.6.0.0.0.0.0.b.0.0.3.5.3.5",
  "juno": "2.0.m.2.c.0.a.0.3.0.0.0.0.0.0.8.0.0.4.2.0.2",
  "sol": "1.0.b.2.c.0.a.0.d.0.0.0.0.0.0.2.0.0.4.8.0.8",
  "pim": "6.0.c.5.c.0.a.0.9.0.0.0.0.0.0.6.0.0.0.8.4.2",
  "GUEST-RXTK": "4.0.c.0.c.0.a.a.1.0.0.0.0.0.0.6.0.0.0.0.2.6",
  "operator": "6.0.3.1.c.0.a.0.9.0.0.0.0.0.0.6.0.0.4.4.2.4",
  "x": "0.0.m.3.c.0.a.a.3.0.0.0.0.0.0.8.0.0.0.2.2.6",
  "Zed": "1.0.c.1.c.0.a.1.0.0.0.0.0.0.0.5.0.0.3.3.1.1",
  "maya_99": "3.0.m.2.c.0.a.h.0.0.0.0.0.0.0.5.0.0.0.7.0.5",
  "\u00d8": "7.0.c.3.c.0.a.c.3.0.0.0.0.0.0.0.0.0.1.a.2.8",
  "long name with spaces": "3.0.1.e.c.0.a.a.5.0.0.0.0.0.0.a.0.0.0.8.0.2",
  "AUDREY": "8.0.n.1.c.0.a.0.f.0.0.0.0.0.0.0.0.0.4.a.0.2",
  "quinn": "5.0.c.3.c.0.a.1.e.f.0.0.0.0.0.3.0.0.3.9.0.9",
  "rio": "8.0.c.2.c.0.a.0.d.0.0.0.0.0.0.6.0.0.4.8.4.2",
  "sage": "2.0.c.2.c.0.a.0.9.0.0.0.0.0.0.6.0.0.4.8.2.6",
  "tove": "2.0.m.4.c.0.a.0.5.0.0.0.0.0.0.2.0.0.0.8.4.2",
  "una": "1.0.b.1.c.0.a.a.d.0.0.0.0.0.0.6.0.0.4.8.0.6",
  "vik": "2.0.m.0.c.0.a.0.d.0.0.0.0.0.0.a.0.0.0.8.2.6",
  "willow": "6.0.m.4.c.0.a.0.f.0.0.0.0.0.0.8.0.0.1.6.4.2",
  "xena": "0.0.n.1.c.0.a.0.7.0.0.0.0.0.0.8.0.0.4.6.0.2",
  "yuri": "3.0.m.4.c.0.a.f.a.2.0.0.0.0.0.b.0.0.3.5.3.3",
  "zora": "3.0.b.2.c.0.a.0.3.0.0.0.0.0.0.4.0.0.1.6.2.8",
  "alpha": "8.0.k.3.c.0.a.0.7.0.0.0.0.0.0.4.0.0.1.a.2.2",
  "bravo": "6.0.m.2.c.0.a.g.f.0.0.0.0.0.0.0.0.0.0.6.2.8",
  "charlie": "1.0.k.3.c.0.a.0.d.0.0.0.0.0.0.a.0.0.1.4.4.0",
  "delta": "4.0.1.1.c.0.a.0.d.0.0.0.0.0.0.6.0.0.1.4.4.2",
  "echo": "5.0.n.2.c.0.a.h.0.0.0.0.0.0.0.1.0.0.0.b.1.5",
  "foxtrot": "3.0.3.3.c.0.a.0.b.0.0.0.0.0.0.0.0.0.0.6.2.4",
  "golf": "2.0.3.0.c.0.a.0.5.0.0.0.0.0.0.2.0.0.4.8.2.2",
  "hotel": "6.0.m.3.c.0.a.0.9.0.0.0.0.0.0.a.0.0.4.4.0.2",
  "india": "6.0.b.2.c.0.a.1.8.0.0.0.0.0.0.5.0.0.3.7.1.1",
  "juliet": "1.0.n.2.c.0.a.b.a.4.0.0.0.0.0.7.0.0.3.5.1.5"
};
const OLD_MAX = {"s": 14, "hd": 5, "h": 24, "hc": 16, "e": 13, "b": 6, "m": 11, "o": 18, "oc": 16, "t": 18, "x": 16, "bg": 16, "p": 15, "au": 6, "fr": 8, "ic": 12, "sl": 4, "hn": 4, "lw": 6, "lc": 12, "ft": 7, "fc": 10};
const GOLDEN_DEFAULT = "0.0.m.2.c.0.a.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0";

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await page.waitForFunction(() => Boolean(window.CodexAvatar && window.CodexAvatar.rig));
});

test('name-derived looks (chat fallbacks, guests) are byte-identical to the original main', async ({ page }) => {
  const now = await page.evaluate(names => Object.fromEntries(names.map(n => [n, window.CodexAvatar.forName(n)])), Object.keys(GOLDEN_NAMES));
  expect(now).toEqual(GOLDEN_NAMES);
  expect(await page.evaluate(() => window.CodexAvatar.DEFAULT)).toBe(GOLDEN_DEFAULT);
});

test('every legacy field value still parses to itself; catalogs only grew; no legacy range shrank', async ({ page }) => {
  const r = await page.evaluate(oldMax => {
    const A = window.CodexAvatar, bad = []; let total = 0;
    Object.keys(oldMax).forEach(k => { if (A.MAX[k] < oldMax[k]) bad.push('shrunk ' + k); for (let v = 0; v < oldMax[k]; v++) { const o = A.parse(A.DEFAULT); o[k] = v; const p = A.parse(A.enc(o)); total++; if (p[k] !== v) bad.push(k + '=' + v); } });
    return { bad: bad, total: total, max: A.MAX };
  }, OLD_MAX);
  expect(r.bad).toEqual([]); expect(r.total).toBeGreaterThan(200);
  for (const [k, n] of [['h', 30], ['o', 24], ['t', 22], ['x', 20], ['ft', 10], ['lw', 8], ['e', 16], ['b', 8], ['m', 14]]) expect(r.max[k], k).toBe(n);
});

test('codes written by the old build (every field at its old maximum) still decode, and remote validation limits are respected', async ({ page }) => {
  const r = await page.evaluate(oldMax => {
    const A = window.CodexAvatar, o = {}; Object.keys(oldMax).forEach(k => { o[k] = oldMax[k] - 1; }); const code = A.enc(o), back = A.parse(code);
    return { code: code, len: code.length, same: Object.keys(oldMax).every(k => back[k] === oldMax[k] - 1), ok: /^[0-9a-z.]{3,80}$/.test(code) };
  }, OLD_MAX);
  expect(r.same).toBe(true); expect(r.ok).toBe(true);                      // presence validation in network.js accepts [0-9a-z.]{3,80}
});

test('an out-of-range value from a newer/older client is clamped, never thrown', async ({ page }) => {
  const r = await page.evaluate(() => { const A = window.CodexAvatar; const p = A.parse('zz.zz.zz.zz.zz.zz.zz.zz.zz.zz.zz'); return Object.keys(p).every(k => p[k] >= 0 && p[k] < A.MAX[k]); });
  expect(r).toBe(true);
});

test('every NEW option renders (world sprite + chat portrait) and differs from every other option in its field', async ({ page }) => {
  const res = await page.evaluate(() => {
    const A = window.CodexAvatar, base = A.parse(A.forName('Mira')); base.t = 0; base.x = 0;
    const hash = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 2166136261; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; } return h; };
    const draw = code => { const f = A.sprite(code, A.rig.IDLE), cv = document.createElement('canvas'); cv.width = 48; cv.height = 72; cv.getContext('2d').drawImage(f.cv, 0, 0); return cv; };
    const first = { h: 24, o: 18, t: 18, x: 16, ft: 7, lw: 6, e: 13, b: 6, m: 11 }, out = {};
    Object.keys(first).forEach(k => {
      const hashes = [], errs = []; for (let v = 0; v < A.MAX[k]; v++) { const o = Object.assign({}, base, k === 'lw' || k === 'ft' ? { o: 1 } : {}); o[k] = v; const c = A.enc(o); try { hashes.push(hash(draw(c))); const svg = A.el(c, 22, 'sq'); if (!svg || svg.length < 20) errs.push(k + v + ' portrait'); } catch (e) { errs.push(k + v + ': ' + e.message); } }
      const dup = []; for (let v = first[k]; v < A.MAX[k]; v++) hashes.forEach((h, w) => { if (w !== v && h === hashes[v]) dup.push(k + ':' + v + '=' + w); });
      out[k] = { n: A.MAX[k], errs: errs, dup: dup };
    });
    return out;
  });
  for (const k of Object.keys(res)) { expect(res[k].errs, k + ' errors').toEqual([]); expect(res[k].dup, k + ' duplicates of another option').toEqual([]); }
});

test('every frame of every animation clip (idle, walk, sit, emotes) renders with the new parts', async ({ page }) => {
  const r = await page.evaluate(() => {
    const A = window.CodexAvatar, o = A.parse(A.forName('ada')); Object.assign(o, { h: 25, o: 20, t: 21, x: 17, ft: 9, lw: 7, e: 13, b: 7, m: 12 }); const code = A.enc(o), bad = []; let frames = 0, clips = 0;
    const C = A.anim.CLIPS;
    Object.keys(C).forEach(name => { clips++; (C[name].frames || []).forEach((f, i) => { const pose = f.p || f.pose || f; try { const s = A.sprite(code, A.rig.normPose ? A.rig.normPose(pose) : pose); frames++; if (!s || !s.cv || !s.cv.width) bad.push(name + '#' + i); } catch (e) { bad.push(name + '#' + i + ': ' + e.message); } }); });
    return { bad: bad, frames: frames, clips: clips };
  });
  expect(r.bad).toEqual([]); expect(r.clips).toBeGreaterThan(8); expect(r.frames).toBeGreaterThan(30);
});
