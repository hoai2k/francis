// Naoya-style kit — Projection Sorcery.
//   The 24fps rule: every technique moves you in fixed frames, and anything
//   you touch that can't keep up is frozen inside a flat frame "panel".
//   Speed stacks build with every hit and technique (faster movement, harder
//   techniques) and fade if you stop moving.
//   LMB  lightning-fast strikes; each hit adds a stack.
//   RMB  Projection Dash: a frame-by-frame dash that panels everything it passes.
//   1    Blitz: rapid-fire strikes that jump from curse to curse.
//   2    Acceleration: max stacks; for a few seconds every blow panels its target.
//   3    Mach Strike: spend every stack on one sound-barrier-breaking dash punch;
//        panelled curses shatter.
//   F    Domain: Time Cell Moon Palace — everything inside is forced to 24fps;
//        any curse that moves tears its own body apart.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const FRAME = 0xa8f0ff, GOLD = 0xffd870;
const FPS = 1 / 24;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('naoya', { name: 'Naoya', technique: 'Projection Sorcery', rarity: 'rare', title: 'Zenin Heir', desc: 'Frame-by-frame dashes freeze curses in panels while ever-growing speed stacks fuel blitz strikes and a Mach punch.', domain: 'Time Cell Moon Palace', color: '#a8f0ff' });

registerLook('naoya', {
  paint: { skinTone: 0xf0d0b4, hair: 0xe8c878, undercut: 0x2a2018, hairVolume: true, top: 0x16161c, kimono: true, sash: 0x5a5a64, sleeve: 0x16161c, pants: 0x4a4a54, shoes: 0x16161c, eye: 0x6a4a20, fringe: 2, hairSide: 3, hairBack: 4 },
  paintExtra: (S) => { S.px(10, 12, 0x2a1a10); S.px(13, 12, 0x2a1a10); }, // narrow, smug eyes
  hair: (m) => [
    { x: -1.8, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.4, rz: 0.3, material: m },
    { x: 1.8, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.4, rz: -0.3, material: m },
    { x: 0, y: 8.5, z: -0.5, w: 5, h: 2.5, d: 5, rx: -0.3, material: m },
  ],
  hairColor: 0xe8c878, accent: FRAME, emit: 0.2,
  cape: { color: 0x16161c, length: 7, width: 8, segments: 3 },
  props(rig, K) {
    const gold = K.mat(GOLD, { metalness: 1, roughness: 0.25 });
    for (const s of [-1, 1]) { K.box(rig.head, 0.6, 0.6, 0.6, gold, s * 4.7, 3.4, 0.5); K.box(rig.head, 0.5, 0.5, 0.5, gold, s * 4.7, 4.6, 0.2); }
  },
});

registerDomainEnv('time_cell_moon_palace', {
  skyTop: 0x02030a, skyHorizon: 0x1a2a4a, fog: 0x060a18, fogDensity: 0.016, hemiSky: 0xb0c8ff, hemiGround: 0x0a0a14, hemiI: 1.0, sun: 0xe0ecff, sunI: 1.1,
  grade: { tint: [0.95, 1.0, 1.1], lift: [0.0, 0.0, 0.02], sat: 0.85, contrast: 1.2, vignette: 0.55 }, floor: B.tatami,
});

export const NAOYA_SKILLS = [
  { id: 'tempo', name: 'Tempo', desc: '+1 max speed stack per rank, and stacks last longer.', max: 3 },
  { id: 'frames', name: 'Frame Lock', desc: 'Panels hold curses longer.', max: 3 },
  { id: 'dash', name: 'Projection', desc: 'Projection Dash reaches further and hits harder.', max: 3 },
  { id: 'blitz', name: 'Blitz', desc: 'More Blitz strikes.', max: 2, req: 'dash' },
  { id: 'mach', name: 'Sound Barrier', desc: 'Mach Strike scales harder with stacks.', max: 3, req: 'tempo' },
  { id: 'palace', name: 'Moon Palace', desc: 'Domain lasts 2s longer and moving curses take more damage.', max: 1, req: 'frames' },
];

class NaoyaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const fast = { trail: FRAME, sparkColor: 0xe0faff, stagger: 0.25 };
    this.combo = [
      { ...fast, style: 'punch', dur: 0.22, windup: 0.25, strike: 0.45, dmg: 10, range: 2.5, arc: 1.1, lunge: 8, knock: 2.5, stop: 0.035, shake: 0.12, chainAt: 0.5 },
      { ...fast, style: 'punch', dur: 0.22, windup: 0.25, strike: 0.45, dmg: 10, range: 2.5, arc: 1.1, lunge: 8, knock: 2.5, stop: 0.035, shake: 0.12, chainAt: 0.5 },
      { ...fast, style: 'swingR', dur: 0.26, windup: 0.27, strike: 0.48, dmg: 12, range: 2.7, arc: 1.2, lunge: 8, knock: 3, stop: 0.04, shake: 0.14, chainAt: 0.5 },
      { ...fast, style: 'swingL', dur: 0.26, windup: 0.27, strike: 0.48, dmg: 12, range: 2.7, arc: 1.2, lunge: 8, knock: 3, stop: 0.04, shake: 0.14, chainAt: 0.5 },
      { ...fast, style: 'uppercut', dur: 0.4, windup: 0.3, strike: 0.5, dmg: 22, range: 2.8, arc: 1.0, lunge: 6, knock: 8, stop: 0.08, shake: 0.3, ring: true, ringColor: FRAME, stagger: 0.5 },
    ];
    this.slots = {
      ranged: this.ability({ name: 'Projection Dash', icon: '🎞️', cd: 1.4, ce: 0, use: () => this.dash() }),
      t1: this.ability({ name: 'Blitz', icon: '⚡', cd: 7, ce: 14, use: () => this.blitz() }),
      t2: this.ability({ name: 'Acceleration', icon: '⏩', cd: 14, ce: 16, use: () => this.accelerate() }),
      t3: this.ability({ name: 'Mach Strike', icon: '💨', cd: 15, ce: 30, use: () => this.mach() }),
    };
    this.domain = {
      name: 'Time Cell Moon Palace', icon: '🌕', key: 'time_cell_moon_palace', type: 1, color: FRAME, sound: 'void', flash: 0xe0f4ff,
      duration: 8 + r('palace') * 2, radius: 24,
      onStart: (g) => { for (const e of g.enemies) e.cellPos = e.pos.clone(); this.stacks = this.maxStacks; },
      onTick: (g, d, dt) => {
        this.stacks = this.maxStacks; this.stackT = 3;
        d.tick = (d.tick ?? 0) - dt;
        if (d.tick > 0) return;
        d.tick = 0.25;
        for (const e of g.enemies) {
          if (e.dead || e.isDummy || !g.domainSys.inside(e.pos)) continue;
          const moved = e.cellPos ? Math.hypot(e.pos.x - e.cellPos.x, e.pos.z - e.cellPos.z) : 0;
          e.cellPos = (e.cellPos ?? new THREE.Vector3()).copy(e.pos);
          e.slowT = 0.4;
          // moving out of step with the 24 frames destroys the body from the inside
          const dmg = 3 + moved * (14 + r('palace') * 8);
          g.combat.damageEnemy(e, dmg, this.p, { stagger: moved > 0.4 ? 0.3 : 0, ceGain: 0, unblockable: true, color: '#a8f0ff' });
          if (moved > 0.3 || Math.random() < 0.25) this.panel(e, 0.35);
        }
      },
      onEnd: (g) => { for (const e of g.enemies) e.cellPos = null; },
    };
    this.stacks = 0; this.stackT = 0; this.accelT = 0;
    this.panels = [];
    this.panelGeo = { face: new THREE.PlaneGeometry(1, 1), bar: new THREE.BoxGeometry(1, 0.05, 0.05), side: new THREE.BoxGeometry(0.05, 1, 0.05) };
    this.panelMats = { face: new THREE.MeshBasicNodeMaterial({ color: FRAME, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), edge: new THREE.MeshStandardNodeMaterial({ color: 0xffffff, emissive: FRAME, emissiveIntensity: 3 }) };
  }
  get maxStacks() { return 8 + this.rank('tempo'); }
  get speedMul() { return 1 + this.stacks * 0.05 + (this.accelT > 0 ? 0.25 : 0); }
  get power() { return 1 + this.stacks * 0.05; }
  dispose() { super.dispose(); for (const pn of this.panels) this.game.scene.remove(pn.mesh); this.panels = []; }
  addStack(n = 1) { this.stacks = Math.min(this.maxStacks, this.stacks + n); this.stackT = 2.5 + this.rank('tempo') * 0.5; }
  onMeleeHit(e) { this.addStack(1); if (this.accelT > 0) this.panel(e, 0.8); }
  // ------------------------------------------------------------ panels
  makePanel() {
    const grp = new THREE.Group(), M = this.panelMats, G = this.panelGeo;
    const face = new THREE.Mesh(G.face, M.face); face.renderOrder = 22; grp.add(face);
    for (const y of [-0.5, 0.5]) { const m = new THREE.Mesh(G.bar, M.edge); m.position.y = y; grp.add(m); }
    for (const x of [-0.5, 0.5]) { const m = new THREE.Mesh(G.side, M.edge); m.position.x = x; grp.add(m); }
    return grp;
  }
  // Freeze a curse inside a flat frame (bosses are only slowed).
  panel(e, dur) {
    if (e.dead) return;
    const g = this.game;
    dur *= 1 + this.rank('frames') * 0.2;
    if (e.isBoss) e.slowT = Math.max(e.slowT ?? 0, dur);
    else { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.1; e.sealT = Math.max(e.sealT ?? 0, dur); }
    e.panelEnd = Math.max(e.panelEnd ?? 0, g.time + dur);
    if (this.panels.some((pn) => pn.e === e)) return;
    let mesh = this.panels.length < 16 ? this.makePanel() : null;
    if (!mesh) return;
    g.scene.add(mesh);
    this.panels.push({ e, mesh });
    g.audio?.tone({ freq: 1400, to: 1400, dur: 0.05, gain: 0.05, type: 'square', filter: 5000 });
  }
  tick(dt) {
    const g = this.game, p = this.p;
    this.accelT = Math.max(0, this.accelT - dt);
    this.stackT -= dt;
    if (this.stackT <= 0 && this.stacks > 0) { this.stacks--; this.stackT = 0.35; }
    // panels follow their curse and face the camera
    for (let i = this.panels.length - 1; i >= 0; i--) {
      const pn = this.panels[i], e = pn.e;
      if (e.dead || !(e.panelEnd > g.time)) { g.scene.remove(pn.mesh); this.panels.splice(i, 1); continue; }
      pn.mesh.position.set(e.pos.x, e.pos.y + e.height * 0.5, e.pos.z);
      pn.mesh.quaternion.copy(g.rig.camera.quaternion);
      pn.mesh.scale.set(e.radius * 2.6 + 0.6, e.height + 0.5, 1);
    }
    // speed lines at high stacks, an afterimage trail while accelerating
    const k = this.stacks / this.maxStacks;
    if (Math.random() < k * 0.8 || this.accelT > 0) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.5, p.pos.y + 0.2 + Math.random() * 1.6, p.pos.z + (Math.random() - 0.5) * 0.5, -p.vel.x * 0.3, 0.2, -p.vel.z * 0.3, 0.3, 1.2, 2.2, 2.6, 0.1 + k * 0.08, 0, 2, 0.2, 1);
    if (p.rig.material?.userData?.emitMask) p.rig.material.userData.emitMask.value = 0.2 + k;
  }
  // ------------------------------------------------------------ movement helper
  // Walk a straight line in 0.5 m steps and stop before walls or drops.
  reach(dir, dist) {
    const g = this.game, p = this.p, w = g.world;
    let last = p.pos.clone();
    for (let s = 0.5; s <= dist; s += 0.5) {
      const q = tmp2.copy(p.pos).addScaledVector(dir, s);
      const gy = w.groundBelow(q.x, q.z, last.y + 1.5);
      if (!isFinite(gy) || Math.abs(gy - last.y) > 1.2 || w.solidAt(q.x, gy + 0.5, q.z) || w.solidAt(q.x, gy + 1.5, q.z)) break;
      last = q.clone().setY(gy);
    }
    return last;
  }
  // Move along a path in discrete 24fps frames, panelling whatever is close.
  frameMove(from, to, frames, onFrame) {
    const g = this.game, p = this.p;
    p.iframes = Math.max(p.iframes, frames * FPS + 0.15);
    for (let f = 1; f <= frames; f++) setTimeout(() => {
      const prev = p.pos.clone();
      p.pos.lerpVectors(from, to, f / frames); p.visY = p.pos.y; p.vel.set(0, 0, 0);
      g.particles.burst(prev.setY(prev.y + 1), { count: 6, color: FRAME, speed: 0.5, life: 0.25, size: 0.6, sizeEnd: 0.2, intensity: 1.4 });
      onFrame?.(f);
    }, f * FPS * 1000);
  }
  // ------------------------------------------------------------ RMB
  dash() {
    const g = this.game, p = this.p, rk = this.rank('dash');
    const dir = p.aimDir.clone().setY(0).normalize();
    const to = this.reach(dir, 7 + rk * 1.2);
    if (to.distanceTo(p.pos) < 1) { g.audio?.ui('back'); return false; }
    p.facing = Math.atan2(dir.x, dir.z);
    const from = p.pos.clone(), dmg = (12 + rk * 5) * this.power, hit = new Set();
    this.frameMove(from, to, 4, () => {
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || e.pos.distanceTo(p.pos) > 1.6 + e.radius) continue;
        hit.add(e);
        g.combat.damageEnemy(e, dmg, p, { stagger: 0.2, knock: dir.clone().multiplyScalar(2) });
        this.panel(e, 0.9);
        g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.6), dir, { color: FRAME });
      }
    });
    setTimeout(() => { if (hit.size) { g.hitStop(0.05); g.shake(0.2); g.audio?.impact(1.1); } this.addStack(1 + hit.size); }, 4 * FPS * 1000 + 10);
    g.audio?.whoosh(1.2); g.audio?.energy('teleport');
  }
  // ------------------------------------------------------------ 1
  blitz() {
    const g = this.game, p = this.p;
    const n = 6 + this.rank('blitz') * 2;
    const pool = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 11);
    if (!pool.length) { g.toast?.('No curses in reach'); g.audio?.ui('back'); return false; }
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.3, windup: 0.2 }, style: 'punch', dur: n * FPS * 2 + 0.2, elapsed: 0, t: 0, windup: 0.2, strike: 0.3, struck: true, moveScale: 0, lock: true, cancelable: false };
    p.iframes = Math.max(p.iframes, n * FPS * 2 + 0.3);
    for (let i = 0; i < n; i++) setTimeout(() => {
      const alive = pool.filter((e) => !e.dead);
      if (!alive.length) return;
      const e = alive[i % alive.length];
      // reappear on the near side of the target, one frame later
      tmp.subVectors(p.pos, e.pos).setY(0); if (tmp.lengthSq() < 0.01) tmp.set(0, 0, 1);
      const spot = e.pos.clone().addScaledVector(tmp.normalize(), e.radius + 0.9);
      const gy = g.world.groundBelow(spot.x, spot.z, e.pos.y + 1.5);
      if (isFinite(gy) && Math.abs(gy - e.pos.y) < 1.5 && !g.world.solidAt(spot.x, gy + 0.5, spot.z) && !g.world.solidAt(spot.x, gy + 1.5, spot.z)) {
        g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 8, color: FRAME, speed: 1, life: 0.25, size: 0.5, sizeEnd: 0.1 });
        p.pos.set(spot.x, gy, spot.z); p.visY = gy; p.vel.set(0, 0, 0);
      }
      p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
      g.combat.damageEnemy(e, (14 + this.stacks * 1.5) * this.power, p, { stagger: 0.3, knock: new THREE.Vector3() });
      if (e.panelEnd > g.time) g.combat.damageEnemy(e, 8 * this.power, p, { stagger: 0, crit: false, color: '#a8f0ff' });
      this.panel(e, 0.5);
      g.fx.hitSpark(at, null, { color: i % 2 ? FRAME : 0xffffff, big: i === n - 1 });
      g.fx.slashArc(p.pos, p.facing, FRAME, 1.6, 0.4, 0.1, i % 2 === 1);
      this.addStack(1);
      g.hitStop(0.025); g.shake(0.12); g.audio?.impact(0.9 + i * 0.05);
      if (i === n - 1) { p.action = null; g.fx.screenWave(at, 0.6, 0.3); }
    }, i * FPS * 2 * 1000);
  }
  // ------------------------------------------------------------ 2
  accelerate() {
    const g = this.game, p = this.p;
    this.stacks = this.maxStacks; this.stackT = 5; this.accelT = 5;
    g.toast?.('Acceleration — 24 frames per second');
    g.fx.flash(0xc0f4ff, 0.25, 0.15); g.fx.chroma(0.6);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: FRAME, r0: 0.4, r1: 4, dur: 0.35, thick: 0.15 });
    g.audio?.charge(0.4, 1.4);
  }
  // ------------------------------------------------------------ 3
  mach() {
    const g = this.game, p = this.p, rk = this.rank('mach');
    const dir = p.aimDir.clone().setY(0).normalize();
    const to = this.reach(dir, 11);
    const st = this.stacks;
    const dmg = (50 + st * (10 + rk * 4)) * (1 + (this.accelT > 0 ? 0.2 : 0));
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.5, windup: 0.3 }, style: 'punch', dur: 0.45, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0, lock: true, cancelable: false };
    const from = p.pos.clone(), hit = new Set();
    g.audio?.whoosh(2);
    this.frameMove(from, to, 3, (f) => {
      for (const e of g.enemies) {
        if (e.dead || hit.has(e)) continue;
        tmp.subVectors(e.pos, from).setY(0); const along = tmp.dot(dir);
        if (along < -0.5 || along > from.distanceTo(p.pos) + 1.5) continue;
        if (Math.abs(tmp.x * dir.z - tmp.z * dir.x) > 1.6 + e.radius) continue;
        hit.add(e);
        const shatter = e.panelEnd > g.time;
        g.combat.damageEnemy(e, dmg * (shatter ? 1.5 : 1), p, { stagger: 1, unblockable: true, knock: dir.clone().multiplyScalar(16) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
        if (shatter) { e.panelEnd = 0; g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.5), { count: 24, color: FRAME, speed: 9, life: 0.5, size: 0.14, drag: 3, shape: 1, intensity: 4 }); }
      }
      if (f === 3) {
        // the sound barrier breaks
        const c = p.pos.clone().setY(p.pos.y + 1.1);
        g.fx.rings.spawn(c, { color: 0xffffff, r0: 0.5, r1: 6 + st * 0.3, dur: 0.4, thick: 0.12, tilt: new THREE.Quaternion().setFromUnitVectors(tmp2.set(0, 0, 1), dir) });
        g.fx.shockwave(p.pos, FRAME, 5 + st * 0.3); g.fx.screenWave(c, 1.2, 0.5); g.fx.flash(0xe0f8ff, 0.4, 0.15); g.fx.chroma(1);
        g.combat.aoe(p.pos, 3, dmg * 0.3, p, { knock: 8, stagger: 0.5 });
        g.shake(0.6 + st * 0.03); g.hitStop(0.09); g.audio?.blackFlash();
        this.stacks = 0;
      }
    });
  }
}
registerKit('naoya', NaoyaKit, NAOYA_SKILLS);
