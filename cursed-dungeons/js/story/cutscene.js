// In-engine cutscenes: the game's own renderer and world, a camera moved
// along eased keyframes, letterbox bars, subtitles with speaker names, fades
// to black or white, and title cards drawn in HTML/CSS (no image assets).
// Gameplay and the HUD pause while one runs (main.js skips the simulation
// and calls update() / applyCamera()).
// Skippable: hold Esc / Space / Enter (keyboard), A / B / Start (gamepad) or
// a finger on the screen; a ring fills while you hold.
//
// A cutscene definition (story/cutscenes.js) is { id, title, build(game, cs) }
// where build stages the set and returns { shots, update?(t, dt), dispose?() }.
// A shot is {
//   dur,                                  seconds
//   cam(k, t) -> { pos, look, fov? }       k: 0..1 through the shot (see helpers below)
//   lines: [{ at, who?, text, dur? }]      subtitles (who: speaker name; none = narration)
//   cards: [{ at, dur, kind, title, sub?, kanji?, color?, kicker? }]   title cards
//   fadeIn?, fadeOut?: 'black' | 'white'
//   flash?: [{ at, color, amount?, dur? }]  a screen flash through the colour grade
//   shake?: [{ at, amount }]               camera trauma (off with reduced motion)
//   dof?: 0..1                             depth of field on tiers that have it
//   enter?(game, cs), act?(k, dt, t)       per-shot hooks
// }
import * as THREE from 'three/webgpu';
import { h } from '../ui/ui.js';
import { settings } from '../settings.js';
import { Grade } from '../gfx/renderer.js';
import { noise1 } from '../util.js';

const HOLD = 0.85;   // seconds of holding to skip
const smooth = (k) => k * k * (3 - 2 * k);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const EASE = { smooth, inOut: easeInOut, out: easeOut, in: (k) => k * k * k, linear: (k) => k };

// Reduced motion: an explicit setting if the settings ever grow one, else the OS preference.
export function prefersReducedMotion() {
  if (typeof settings.reducedMotion === 'boolean') return settings.reducedMotion;
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

export class Cutscene {
  constructor(game, def, { onEnd = null, opts = {} } = {}) {
    this.game = game; this.def = def; this.id = def.id; this.onEnd = onEnd; this.opts = opts;
    this.t = 0; this.shotIdx = -1; this.shotT = 0; this.hold = 0; this.done = false;
    this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 35 };
    this.held = { key: false, ptr: false };
    this.trauma = 0;
    this.reduced = prefersReducedMotion();
  }
  start() {
    const g = this.game;
    this.fov0 = g.rig.camera.fov;
    this.dof0 = Grade.dofFocus.value; this.targetDof0 = g.targetDof ?? 0;
    // the game camera as it is now (shots can blend back into it)
    this.startPose = { pos: g.rig.camera.position.clone(), look: g.rig.focus.clone().add(new THREE.Vector3(0, 0.8, 0)) };
    this.buildOverlay();
    this.set = this.def.build(g, this) ?? { shots: [] };
    this.shots = (this.set.shots ?? []).filter(Boolean);
    this.total = this.shots.reduce((s, x) => s + x.dur, 0);
    this.onKey = (e) => {
      if (!['Escape', 'Space', 'Enter', 'KeyE'].includes(e.code)) return;
      this.held.key = e.type === 'keydown';
      if (e.type === 'keydown') { e.preventDefault(); e.stopImmediatePropagation(); }   // (never reaches the game: no pause menu on Esc)
    };
    window.addEventListener('keydown', this.onKey, true); window.addEventListener('keyup', this.onKey, true);
    this.nextShot();
    this.update(0);
  }
  buildOverlay() {
    const el = this.el = h('section', { class: 'cutscene', role: 'dialog', 'aria-label': this.def.title ?? 'Cutscene' },
      h('div', { class: 'cs-bar top' }), h('div', { class: 'cs-bar bottom' }),
      this.cardsEl = h('div', { class: 'cs-cards' }),
      this.subEl = h('p', { class: 'cs-sub', 'aria-live': 'polite' }),
      this.fadeEl = h('div', { class: 'cs-fade' }),
      this.skipEl = h('div', { class: 'cs-skip' }, h('span', { class: 'ring' }), h('span', { class: 'txt' }, this.skipText())));
    if (this.reduced) el.classList.add('reduced');
    const down = (e) => { this.held.ptr = true; e.preventDefault(); }, up = () => { this.held.ptr = false; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
  }
  skipText() {
    const d = this.game.input?.lastDevice ?? '';
    return `Hold ${d.startsWith('pad') ? 'A' : d === 'touch' ? 'the screen' : 'Esc'} to skip`;
  }
  nextShot() {
    this.shotIdx++; this.shotT = 0; this.fadingOut = false;
    const s = this.shots[this.shotIdx];
    if (!s) return;
    this.linesShown = new Set(); this.cardsShown = new Set(); this.fxDone = new Set();
    if (!s.keepSub) this.clearLine();
    if (s.fadeIn) this.fade(s.fadeIn, 1, 0, 0.7);
    this.game.targetDof = s.dof ?? 0;
    s.enter?.(this.game, this);
  }
  fade(color, from, to, dur) {
    const f = this.fadeEl;
    f.style.background = color === 'white' ? '#fbf8ff' : '#000';
    f.style.transition = 'none'; f.style.opacity = String(from);
    void f.offsetWidth;
    f.style.transition = `opacity ${dur}s ease`; f.style.opacity = String(to);
  }
  clearLine() { this.subEl.classList.remove('show'); this.lineT = 0; }
  line(L) {
    const who = L.who ? h('span', { class: 'cs-who', style: L.color ? `--who:${L.color}` : '' }, L.who) : null;
    this.subEl.replaceChildren(...[who, h('span', { class: 'cs-text' + (L.who ? '' : ' narr') }, L.text)].filter(Boolean));
    this.subEl.classList.remove('show'); void this.subEl.offsetWidth; this.subEl.classList.add('show');
    this.lineT = L.dur ?? 0;
    this.game.audio?.tone?.({ freq: 1400, dur: 0.04, gain: 0.015, type: 'sine' });
  }
  // A title card in HTML/CSS. kind: place | technique | boss | chapter | mission | defeat
  card(c) {
    const kanji = c.kanji ? h('div', { class: 'k' }, c.kanji) : null;
    const el = h('div', { class: `cs-card ${c.kind ?? 'chapter'}`, style: `--c:${c.color ?? '#a05aff'};--d:${c.dur ?? 3}s${c.y != null ? `;top:${c.y}%` : ''}` },
      kanji,
      h('div', { class: 'slash' }),
      c.kicker ? h('div', { class: 'kick' }, c.kicker) : null,
      h('div', { class: 't' }, c.title),
      c.sub ? h('div', { class: 's' }, c.sub) : null);
    this.cardsEl.appendChild(el);
    setTimeout(() => el.classList.add('out'), Math.max(0, (c.dur ?? 3) * 1000 - 450));
    setTimeout(() => el.remove(), (c.dur ?? 3) * 1000 + 200);
    if (c.kind === 'boss' || c.kind === 'technique') this.game.audio?.noise?.({ dur: 0.5, gain: 0.25, type: 'bandpass', freq: 300, sweep: 3200, q: 1, rev: 0.4 });
  }
  pad() {
    for (const p of navigator.getGamepads?.() ?? []) if (p && (p.buttons[0]?.pressed || p.buttons[1]?.pressed || p.buttons[9]?.pressed)) return true;
    return false;
  }
  shake(a) { if (!this.reduced) this.trauma = Math.min(1, this.trauma + a * (settings.shake ?? 1)); }
  // every frame (real time): the shot, the camera target, the skip ring
  update(dt) {
    if (this.done) return;
    const g = this.game;
    // skip
    // (wall-clock time, so a slow frame rate never makes skipping slower)
    const now = performance.now(), hdt = Math.min(0.25, (now - (this.lastNow ?? now)) / 1000); this.lastNow = now;
    const holding = this.held.key || this.held.ptr || this.pad();
    this.hold = holding ? this.hold + hdt : Math.max(0, this.hold - hdt * 2);
    this.skipEl.style.setProperty('--p', Math.min(1, this.hold / HOLD).toFixed(3));
    this.skipEl.classList.toggle('holding', this.hold > 0.05);
    if (this.hold >= HOLD) { this.finish(true); return; }
    let s = this.shots[this.shotIdx];
    if (!s) { this.finish(); return; }
    this.t += dt; this.shotT += dt;
    const k = Math.min(1, this.shotT / s.dur);
    for (const [i, L] of (s.lines ?? []).entries()) if (this.shotT >= L.at && !this.linesShown.has(i)) { this.linesShown.add(i); this.line(L); }
    if (this.lineT > 0) { this.lineT -= dt; if (this.lineT <= 0) this.clearLine(); }
    for (const [i, c] of (s.cards ?? []).entries()) if (this.shotT >= c.at && !this.cardsShown.has(i)) { this.cardsShown.add(i); this.card(c); }
    for (const [i, f] of (s.flash ?? []).entries()) if (this.shotT >= f.at && !this.fxDone.has('f' + i)) { this.fxDone.add('f' + i); g.fx?.flash?.(f.color ?? 0xffffff, (f.amount ?? 0.7) * (this.reduced ? 0.35 : 1), f.dur ?? 0.3); }
    for (const [i, q] of (s.shake ?? []).entries()) if (this.shotT >= q.at && !this.fxDone.has('s' + i)) { this.fxDone.add('s' + i); this.shake(q.amount ?? 0.5); }
    if (s.fadeOut && !this.fadingOut && s.dur - this.shotT < 0.6) { this.fadingOut = true; this.fade(s.fadeOut, 0, 1, 0.55); }
    s.act?.(k, dt, this.shotT);
    this.set.update?.(this.t, dt);
    const c = s.cam ? s.cam(k, this.shotT) : null;
    if (c) { this.cam.pos.copy(c.pos); this.cam.look.copy(c.look); this.cam.fov = c.fov ?? 35; }
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    if (this.shotT >= s.dur) { this.nextShot(); if (!this.shots[this.shotIdx]) this.finish(); }
  }
  // place the game's camera (after the camera rig ran)
  applyCamera() {
    if (this.done) return;
    const cam = this.game.rig.camera;
    cam.position.copy(this.cam.pos);
    if (Math.abs(cam.fov - this.cam.fov) > 0.01) { cam.fov = this.cam.fov; cam.updateProjectionMatrix(); }
    cam.lookAt(this.cam.look);
    const sh = this.trauma * this.trauma;
    if (sh > 0.0001) { const tt = this.t * 26; cam.rotateX(noise1(tt) * 0.04 * sh); cam.rotateY(noise1(tt + 50) * 0.04 * sh); cam.rotateZ(noise1(tt + 100) * 0.06 * sh); }
    cam.updateMatrixWorld();
    Grade.dofFocus.value = this.cam.pos.distanceTo(this.cam.look);
  }
  finish(skipped = false) {
    if (this.done) return;
    this.done = true; this.skipped = skipped;
    this.cleanup();
    this.onEnd?.(this, skipped);
  }
  cleanup() {
    window.removeEventListener('keydown', this.onKey, true); window.removeEventListener('keyup', this.onKey, true);
    const el = this.el; el?.classList.remove('in'); el?.classList.add('gone'); setTimeout(() => el?.remove(), 450);
    try { this.set?.dispose?.(this.skipped); } catch (e) { console.warn(e); }
    const g = this.game, cam = g.rig.camera;
    if (this.fov0 && cam.fov !== this.fov0) { cam.fov = this.fov0; cam.updateProjectionMatrix(); }
    Grade.dofFocus.value = this.dof0; g.targetDof = this.targetDof0;
  }
  // the scene changed under it: stop without callbacks
  abort() { if (!this.done) { this.done = true; this.cleanup(); } }
}

// ---------------------------------------------------------------- camera helpers
const V = (a) => (a.isVector3 ? a : new THREE.Vector3(...a));
const ez = (name) => (typeof name === 'function' ? name : EASE[name] ?? smooth);
// A straight move from one pose to another (with reduced motion: a held midpoint).
export function move(from, to, { fov = 35, fov2 = fov, ease = 'smooth' } = {}) {
  const a = { pos: V(from.pos), look: V(from.look) }, b = { pos: V(to.pos), look: V(to.look) };
  const P = new THREE.Vector3(), L = new THREE.Vector3(), E = ez(ease);
  return (k) => {
    const e = prefersReducedMotion() ? 0.5 : E(k);
    return { pos: P.lerpVectors(a.pos, b.pos, e), look: L.lerpVectors(a.look, b.look, e), fov: fov + (fov2 - fov) * e };
  };
}
// Several keyframes: [{ k, pos, look, fov, ease }] with k from 0 to 1.
export function keys(list) {
  const ks = list.map((x) => ({ k: x.k, pos: V(x.pos), look: V(x.look), fov: x.fov ?? 35, ease: ez(x.ease) }));
  const P = new THREE.Vector3(), L = new THREE.Vector3();
  return (k) => {
    if (prefersReducedMotion()) k = 0.5;
    let i = 0; while (i < ks.length - 2 && k > ks[i + 1].k) i++;
    const a = ks[i], b = ks[Math.min(ks.length - 1, i + 1)];
    const f = b === a ? 0 : b.ease(Math.min(1, Math.max(0, (k - a.k) / (b.k - a.k))));
    return { pos: P.lerpVectors(a.pos, b.pos, f), look: L.lerpVectors(a.look, b.look, f), fov: a.fov + (b.fov - a.fov) * f };
  };
}
// Circle a point: angle a0 → a1 (radians, 0 = +z), radius r → r2, height y → y2 above it.
export function orbit(center, { r = 6, r2 = r, y = 2, y2 = y, a0 = 0, a1 = 0.6, lookY = 1.4, fov = 35, fov2 = fov, ease = 'smooth' } = {}) {
  const C = V(center), P = new THREE.Vector3(), L = new THREE.Vector3(), E = ez(ease);
  return (k) => {
    const e = prefersReducedMotion() ? 0.5 : E(k);
    const a = a0 + (a1 - a0) * e, rr = r + (r2 - r) * e;
    const c = typeof center === 'function' ? center() : C;
    return { pos: P.set(c.x + Math.sin(a) * rr, c.y + y + (y2 - y) * e, c.z + Math.cos(a) * rr), look: L.set(c.x, c.y + lookY, c.z), fov: fov + (fov2 - fov) * e };
  };
}
// Follow something that moves: the camera at an offset from it.
export function follow(target, offset, lookOffset = [0, 1, 0], { fov = 35, offset2 = offset } = {}) {
  const P = new THREE.Vector3(), L = new THREE.Vector3(), o1 = V(offset), o2 = V(offset2), lo = V(lookOffset), o = new THREE.Vector3();
  return (k) => {
    const e = prefersReducedMotion() ? 0.5 : smooth(k);
    const p = typeof target === 'function' ? target() : target.position;
    o.lerpVectors(o1, o2, e);
    return { pos: P.copy(p).add(o), look: L.copy(p).add(lo), fov };
  };
}
// Where the gameplay camera will sit for the current players (to blend back into it).
export function gameplayPose(game) {
  const r = game.rig, f = r.focus.clone();
  const players = game.players.filter((p) => !p.dead);
  if (players.length) { f.set(0, 0, 0); for (const p of players) f.add(p.pos); f.divideScalar(players.length); }
  const yaw = r.yawBase + r.yawSteps * Math.PI / 2, pitch = r.pitch, dist = r.zoomTarget ?? r.dist;
  const cp = Math.cos(pitch);
  return { pos: new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp).multiplyScalar(dist).add(f), look: f.clone().add(new THREE.Vector3(0, 0.8, 0)), fov: 35 };
}

// ---------------------------------------------------------------- figures
// A figure in a cutscene: a rig that stands, turns, walks to a point (following
// the set's ground) and plays a pose (an action from the rig: cast, raise, sign,
// hit, attack, down...).
export function actor(game, rig, pos, yaw = 0, { scale = 1 } = {}) {
  rig.root.position.copy(pos); rig.root.rotation.y = yaw;
  if (scale !== 1) rig.root.scale.multiplyScalar(scale);
  game.scene.add(rig.root);
  const a = { rig, pos: pos.clone(), yaw, to: null, speed: 3.2, vel: new THREE.Vector3(), action: null, actT: 0, visible: true, hop: null };
  a.walk = (to, speed = 3.2) => { a.to = to.clone(); a.speed = speed; };
  a.face = (y) => { a.yaw = y; };
  a.faceTo = (p) => { a.yaw = Math.atan2(p.x - a.pos.x, p.z - a.pos.z); };
  a.pose = (type, o = {}) => { a.action = type ? { type, t: 0, ...o } : null; a.actT = 0; a.actDur = o.dur ?? 0; };
  a.show = (v) => { a.visible = v; rig.root.visible = v; };
  // a jump along an arc to a point (curses leaping, Gojo landing)
  a.leap = (to, dur = 0.8, height = 3) => { a.hop = { from: a.pos.clone(), to: to.clone(), t: 0, dur, height }; a.to = null; };
  const groundAt = (x, z, y) => { const gy = game.world?.groundBelow?.(x, z, y + 1.2); return Number.isFinite(gy) && gy > y - 2 ? gy : y; };
  const d = new THREE.Vector3();
  a.update = (dt) => {
    let sp = 0;
    if (a.hop) {
      const H = a.hop; H.t += dt; const f = Math.min(1, H.t / H.dur);
      a.pos.lerpVectors(H.from, H.to, f); a.pos.y += Math.sin(f * Math.PI) * H.height;
      if (f >= 1) { a.hop = null; a.onLand?.(); }
    } else if (a.to) {
      d.subVectors(a.to, a.pos); d.y = 0;
      const L = d.length();
      if (L < 0.08) { a.to = null; a.vel.set(0, 0, 0); }
      else {
        d.normalize();
        a.pos.addScaledVector(d, Math.min(L, a.speed * dt)); a.vel.copy(d).multiplyScalar(a.speed);
        a.yaw = Math.atan2(d.x, d.z); sp = Math.min(1, a.speed / 4.5);
        a.pos.y = groundAt(a.pos.x, a.pos.z, a.pos.y);
      }
    }
    if (a.action) { a.actT += dt; a.action.t = a.actDur ? Math.min(1, a.actT / a.actDur) : a.action.hold ?? 1; if (a.actDur && a.actT > a.actDur && a.action.once) a.action = null; }
    rig.root.position.copy(a.pos);
    rig.root.rotation.y += Math.atan2(Math.sin(a.yaw - rig.root.rotation.y), Math.cos(a.yaw - rig.root.rotation.y)) * Math.min(1, dt * 10);
    rig.animate({ dt, speed: sp, vel: a.vel, action: a.action });
    a.extra?.(dt);
  };
  a.dispose = () => { game.scene.remove(rig.root); };
  return a;
}
