/* avatar-anim.js — CodexAnim: shared animation definitions + Animator state machine.
   ---------------------------------------------------------------------------------------------
   · Clips are plain pose data (joint offsets for the CodexRig skeleton), not per-character art:
     every appearance combination plays the same clips; the rig re-poses its own parts.
   · One Animator per character, local or remote. Inputs each tick: { walk, dx, dy, dir, speed,
     seated, emote:{k,ts}, reduced }. Output: an integer pose for CodexRig.frame().
   · Pixel cadence (clip frame times, ~8–12 poses/s for walking) is independent of positional
     movement, which the host loop keeps interpolating every rAF.
   · Transitions blend numerically from the pose being shown (rounded to whole pixels by the rig),
     so interrupting idle/walk/sit/emote never snaps.
   · No timers of its own: it only advances with the dt it is given (hidden tabs stop with rAF).     */
(function (root) {
'use strict';
const PK = ['by', 'bx', 'ty', 'hx', 'hy', 'st', 'a0x', 'a0y', 'a1x', 'a1y', 'l0x', 'l0y', 'l1x', 'l1y'];   /* blended numerically */
const LOWER = ['by', 'bx', 'l0x', 'l0y', 'l1x', 'l1y'];                                                   /* dropped when an emote is played seated */
const BL = 1, CL = 2, LR = 4, LL = 8, BR = 128, MO = n => n << 4;                                          /* expression bits (see rig exOf) */
const F = (ms, p) => ({ ms: ms, p: p || {} });
const SIT_ARMS = { a0x: 2, a0y: 1, a1x: 0, a1y: 2 };
const sit = o => Object.assign({ st: 1 }, SIT_ARMS, o || {});

const CLIPS = {
  idle:    { loop: 1, frames: [F(1000, { ty: 0 }), F(1000, { ty: 1 })] },
  idleRM:  { loop: 1, frames: [F(1000, {})] },
  /* small, restrained idle variations — chosen at random between breaths */
  vLook:   { frames: [F(650, { hx: -1, ex: LL }), F(650, { hx: 1, ex: LR }), F(250, {})] },
  vShift:  { frames: [F(700, { bx: 1, ty: 1 }), F(500, { bx: 1 }), F(300, {})] },
  vTap:    { frames: [F(150, { l0y: -1 }), F(150, {}), F(150, { l0y: -1 }), F(250, {})] },
  vTilt:   { frames: [F(800, { hx: 1, hy: 0, ex: LR }), F(400, {})] },
  /* walking: 4 poses (contact · pass · contact · pass); ms comes from measured speed */
  walkH:   { loop: 1, cad: 1, frames: [
    F(0, { by: 1, l0x: 4, l0y: -1, l1x: -4, l1y: -1, a0x: -3, a0y: -1, a1x: 3, a1y: -1 }),
    F(0, { by: 0, l0x: 0, l0y: -2, l1x: 0, l1y: 0, a0x: 0, a0y: 0, a1x: 0, a1y: 0 }),
    F(0, { by: 1, l0x: -4, l0y: -1, l1x: 4, l1y: -1, a0x: 3, a0y: -1, a1x: -3, a1y: -1 }),
    F(0, { by: 0, l0x: 0, l0y: 0, l1x: 0, l1y: -2, a0x: 0, a0y: 0, a1x: 0, a1y: 0 })] },
  walkV:   { loop: 1, cad: 1, frames: [
    F(0, { l0y: -2, a0y: 2, a1y: -2 }), F(0, {}), F(0, { l1y: -2, a1y: 2, a0y: -2 }), F(0, {})] },
  walkRM:  { loop: 1, frames: [F(260, { l0x: 2, l1x: -2 }), F(260, { l0x: -2, l1x: 2 })] },
  /* sitting: lower the pelvis, thighs horizontal toward the facing side (st:1), hands on lap */
  sitIn:   { frames: [F(90, { by: 2, l0y: -2, l1y: -2 }), F(120, sit())] },
  sitOut:  { frames: [F(90, sit({ by: 0, ty: 0 })), F(100, { by: 2, l0y: -2, l1y: -2 })] },
  sitIdle: { loop: 1, frames: [F(1100, sit({ ty: 0 })), F(1100, sit({ ty: 1 }))] },
  vSwing:  { frames: [F(260, sit({ l0x: -1 })), F(260, sit({ l1x: -1 })), F(260, sit({ l0x: -1 })), F(200, sit())] },
  /* emotes — all front-facing standing, seated variants keep the upper body only */
  wave:  { dur: 1700, rm: 1, frames: [F(110, { a0x: 5, a0y: -9, ex: MO(1) })].concat([0, 1, 0, 1, 0, 1, 0, 1].map(i => F(135, i ? { a0x: 2, a0y: -15, ex: MO(1) } : { a0x: 5, a0y: -14, ex: MO(1) })), [F(110, { a0x: 3, a0y: -5 })]) },
  dance: { loop: 1, dur: 4200, rm: 0, frames: [
    F(125, { by: -1, bx: 1, hx: 1, a0x: 4, a0y: -13, a1x: -1, l0x: 1, l1x: 2, l1y: -1, ex: MO(1) }), F(125, { bx: 1, hx: 1, a0x: 3, a0y: -6, a1x: -1, a1y: -3, l1x: 1, ex: MO(1) }),
    F(125, { by: -1, bx: -1, hx: -1, a0x: 1, a1x: -4, a1y: -13, l0x: -2, l0y: -1, l1x: -1, ex: MO(1) }), F(125, { bx: -1, hx: -1, a0x: 1, a0y: -3, a1x: -3, a1y: -6, l0x: -1, ex: MO(1) })] },
  cheer: { loop: 1, dur: 3000, rm: 1, frames: [
    F(130, { by: 1, l0y: -1, l1y: -1, a0x: 2, a0y: -3, a1x: -2, a1y: -3, ex: CL | MO(3) }), F(170, { by: -3, a0x: 4, a0y: -15, a1x: -4, a1y: -15, l0y: -1, l1y: -1, ex: CL | MO(3) }),
    F(130, { by: -2, a0x: 4, a0y: -14, a1x: -4, a1y: -14, ex: CL | MO(3) }), F(110, { by: 1, a0x: 3, a0y: -9, a1x: -3, a1y: -9, l0y: -1, l1y: -1, ex: MO(3) })] },
  heart: { loop: 1, dur: 2400, rm: 0, frames: [
    F(320, { a0x: -7, a0y: -3, a1x: 7, a1y: -3, hx: 1, ex: CL | MO(1) }), F(320, { by: -1, a0x: -7, a0y: -4, a1x: 7, a1y: -4, hx: -1, ex: CL | MO(1) })] },
  sleep: { loop: 1, dur: 4200, rm: 0, frames: [
    F(800, { hy: 2, ex: CL | MO(4) }), F(800, { hy: 3, hx: 1, ty: 1, ex: CL | MO(4) }), F(800, { hy: 2, hx: 1, bx: 1, ex: CL | MO(4) }), F(800, { hy: 3, ty: 1, ex: CL | MO(4) })] },
  sip:   { dur: 2300, rm: 2, frames: [
    F(160, { a0x: -3, a0y: -6, pr: 1 }), F(220, { a0x: -5, a0y: -12, pr: 1 }), F(520, { a0x: -5, a0y: -13, hy: -1, pr: 1, ex: CL }), F(260, { a0x: -5, a0y: -12, pr: 1 }),
    F(520, { a0x: -5, a0y: -13, hy: -1, pr: 1, ex: CL }), F(200, { a0x: -3, a0y: -6, pr: 1 }), F(140, {})] },
  spark: { loop: 1, dur: 3000, rm: 0, frames: [
    F(150, { a0x: 5, a0y: -8, a1x: -5, a1y: -8, pr: 2, ex: MO(1) }), F(150, { by: -1, a0x: 5, a0y: -10, a1x: -5, a1y: -10, pr: 3, ex: MO(1) }),
    F(150, { a0x: 5, a0y: -9, a1x: -5, a1y: -9, pr: 3, hx: 1, ex: MO(1) }), F(150, { by: -1, a0x: 5, a0y: -11, a1x: -5, a1y: -11, pr: 2, hx: -1, ex: MO(1) })] },
  warm:  { loop: 1, dur: 3600, rm: 0, frames: [
    F(170, { a0x: -6, a0y: -5, a1x: 6, a1y: -4, ex: CL }), F(170, { a0x: -6, a0y: -4, a1x: 6, a1y: -5, bx: 1, ex: CL }), F(170, { a0x: -5, a0y: -5, a1x: 5, a1y: -4, ex: CL }), F(170, { a0x: -6, a0y: -4, a1x: 6, a1y: -5, bx: -1, ex: CL })] }
};
const EMOTES = ['wave', 'dance', 'heart', 'cheer', 'sleep', 'sip', 'spark', 'warm'];
const clipLen = c => c.frames.reduce((s, f) => s + f.ms, 0);
const durOf = k => { const c = CLIPS[k]; return c ? (c.dur || clipLen(c)) : 0; };
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => v < a ? a : v > b ? b : v, ease = t => 1 - (1 - t) * (1 - t);
const VARS = { idle: [['vLook', 5], ['vShift', 3], ['vTap', 2], ['vTilt', 3]], sit: [['vSwing', 1]] };
const rnd = (a, b) => a + Math.random() * (b - a);
function pick(list) { let s = 0; list.forEach(l => { s += l[1]; }); let r = Math.random() * s; for (let i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; } return list[0][0]; }

function Animator(o) {
  o = o || {};
  this.state = 'idle'; this.clipName = 'idle'; this.ci = 0; this.ct = 0; this.total = 0; this.done = false;
  this.cur = {}; PK.forEach(k => { this.cur[k] = 0; }); this.ex = 0; this.pr = 0;
  this.from = null; this.bt = 0; this.bd = 0;
  this.yaw = 0; this.bk = 0; this.f = 1; this.axis = 'h'; this.settle = 999; this.walkMs = 100;
  this.blinkT = rnd(1500, 4000); this.blinkL = 0; this.varT = rnd(3000, 6000); this.emoteTs = 0; this.emoteSeated = false; this.emoteKey = null;
  this.rm = false;
}
const AP = Animator.prototype;
AP.clip = function () { return CLIPS[this.clipName]; };
AP.setClip = function (name, blendMs) {
  this.from = {}; PK.forEach(k => { this.from[k] = this.cur[k]; });
  this.bt = 0; this.bd = this.rm ? 0 : (blendMs == null ? 110 : blendMs);
  this.clipName = name; this.ci = 0; this.ct = 0; this.total = 0; this.done = false;
};
AP.go = function (state, name, blend) { this.state = state; this.setClip(name, blend); };
AP.frameMs = function (c, f) { return c.cad ? this.walkMs : f.ms; };
AP.target = function (inp) {
  const c = this.clip(), f = c.frames[this.rm && c.rm != null && this.state === 'emote' ? c.rm : this.ci], t = {};
  PK.forEach(k => { t[k] = f.p[k] || 0; });
  let ex = f.p.ex || 0, pr = f.p.pr || 0;
  if (this.state === 'emote' && this.emoteSeated) { LOWER.forEach(k => { t[k] = 0; }); t.st = 1; t.a0y += 0; }
  if (this.rm) { t.by = 0; t.bx = 0; }
  this.tex = ex; this.tpr = pr; return t;
};
/* advance one tick. inp = { walk, dx, dy, dir, speed, seated, emote:{k,ts}, reduced } */
AP.update = function (dt, inp) {
  inp = inp || {}; dt = clamp(dt, 0, 100); this.rm = !!inp.reduced;
  const walking = !!inp.walk, seated = !!inp.seated && !walking, S = this.state;
  if (inp.dir) this.f = inp.dir > 0 ? 1 : -1;
  if (walking) { const ax = Math.abs(inp.dx || 0), ay = Math.abs(inp.dy || 0); if (this.axis === 'h' && ay > ax * 1.5) this.axis = 'v'; else if (this.axis === 'v' && ax > ay * .8) this.axis = 'h'; this.walkMs = this.rm ? 260 : clamp(4750 / Math.max(20, inp.speed || 50), 83, 125); }
  /* new emote? (remote emotes arrive as {k, ts}) */
  const em = inp.emote;
  if (em && em.ts !== this.emoteTs) {
    this.emoteTs = em.ts;
    if (!walking && CLIPS[em.k] && CLIPS[em.k].dur && S !== 'sitIn' && S !== 'sitOut') { this.emoteSeated = seated || S === 'sitIdle'; this.emoteKey = em.k; this.go('emote', em.k, 100); }
  }
  const st = this.state, c = this.clip();
  switch (st) {
    case 'idle': if (walking) this.go('walk', this.axis === 'v' ? 'walkV' : this.rm ? 'walkRM' : 'walkH', 90); else if (seated) this.go('sitIn', 'sitIn', 80); else if (this.clipName.charAt(0) === 'v' && this.done) this.setClip(this.rm ? 'idleRM' : 'idle', 120); break;
    case 'walk': if (!walking) { this.settle = 0; if (seated) this.go('sitIn', 'sitIn', 80); else this.go('idle', this.rm ? 'idleRM' : 'idle', 120); } break;
    case 'sitIn': if (walking || !seated) this.go('sitOut', 'sitOut', 70); else if (this.done) this.go('sitIdle', 'sitIdle', 80); break;
    case 'sitIdle': if (walking || !seated) this.go('sitOut', 'sitOut', 70); else if (this.clipName === 'vSwing' && this.done) this.setClip('sitIdle', 100); break;
    case 'sitOut': if (this.done) { if (walking) this.go('walk', this.axis === 'v' ? 'walkV' : this.rm ? 'walkRM' : 'walkH', 80); else if (seated) this.go('sitIn', 'sitIn', 80); else { this.settle = 0; this.go('idle', this.rm ? 'idleRM' : 'idle', 100); } } break;
    case 'emote':
      if (walking) { if (this.emoteSeated) this.go('sitOut', 'sitOut', 70); else this.go('walk', this.axis === 'v' ? 'walkV' : this.rm ? 'walkRM' : 'walkH', 90); }
      else if (this.done || this.total >= (c.dur || 1e9)) { this.emoteKey = null; if (seated) this.go('sitIdle', 'sitIdle', 130); else this.go('idle', this.rm ? 'idleRM' : 'idle', 130); }
      else if (this.emoteSeated && !seated) { this.go('idle', this.rm ? 'idleRM' : 'idle', 120); }
      break;
  }
  /* clip time */
  const c2 = this.clip(); this.total += dt; this.ct += dt;
  if (!(this.rm && this.state === 'emote') && !(this.rm && this.state === 'idle')) {
    let guard = 4;
    while (guard-- > 0) { const f = c2.frames[this.ci], ms = Math.max(1, this.frameMs(c2, f)); if (this.ct < ms) break; this.ct -= ms; if (this.ci + 1 >= c2.frames.length) { if (c2.loop) this.ci = 0; else { this.done = true; this.ct = 0; break; } } else this.ci++; }
  }
  /* idle variations + blink (never in reduced motion) */
  if (!this.rm) {
    if ((this.state === 'idle' && this.clipName === 'idle') || (this.state === 'sitIdle' && this.clipName === 'sitIdle')) {
      this.varT -= dt; if (this.varT <= 0) { this.varT = rnd(3500, 7500); this.setClip(pick(this.state === 'idle' ? VARS.idle : VARS.sit), 110); }
    }
    this.blinkT -= dt; if (this.blinkT <= 0) { this.blinkL = 110; this.blinkT = Math.random() < .2 ? 220 : rnd(2200, 5500); }
    if (this.blinkL > 0) this.blinkL -= dt;
  }
  /* yaw: three-quarter while walking sideways or seated, front otherwise; passes through the front frame */
  this.settle += dt; let ty = 0;
  if (this.state === 'walk') ty = this.axis === 'h' ? this.f : 0;
  else if (this.state.indexOf('sit') === 0 || (this.state === 'emote' && this.emoteSeated)) ty = this.f;
  else if (this.state === 'idle' && this.settle < 380 && !this.rm) ty = this.f;
  this.yaw = this.rm ? ty : this.yaw + clamp(ty - this.yaw, -dt / 110, dt / 110);
  this.bk = this.state === 'walk' && this.axis === 'v' && (inp.dy || 0) < 0 ? 1 : 0;
  /* pose = blend(from → target) */
  const t = this.target(inp); this.bt += dt; const k = this.bd > 0 && this.bt < this.bd ? ease(this.bt / this.bd) : 1;
  PK.forEach(key => { this.cur[key] = this.from && k < 1 ? lerp(this.from[key], t[key], k) : t[key]; });
  this.ex = this.tex | (this.blinkL > 0 ? BL : 0); this.pr = this.tpr;
  if (k >= 1) this.from = null;
  return this;
};
/* integer pose for CodexRig.frame() */
AP.pose = function () {
  const p = { yw: Math.round(this.yaw), bk: this.bk, ex: this.ex, pr: this.pr };
  PK.forEach(k => { p[k] = Math.round(this.cur[k]); });
  if (p.st && p.yw === 0) p.yw = this.f;          /* a seated character always shows its facing side */
  return p;
};
/* head-top offset above the feet (for nameplates / bubbles) */
AP.headRoom = function () { return 50 - (this.cur.st > .5 ? 3 : 0) - Math.round(this.cur.by) + (this.cur.hy > 0 ? -Math.round(this.cur.hy) : 0); };

root.CodexAnim = { Animator: Animator, CLIPS: CLIPS, EMOTES: EMOTES, durOf: durOf, LOWER: LOWER, PK: PK };
if (typeof module !== 'undefined' && module.exports) module.exports = root.CodexAnim;
})(typeof window !== 'undefined' ? window : globalThis);
