// Shared visual helpers for the technique kits added in the "ten new
// techniques" batch (Dabura, Dagon, Kenjaku, Yorozu, Angel, Ishigori, Uro,
// Kirara, Ui Ui, Takaba). Everything here is a picture plus, where named,
// the damage call through kit.hit() — so a replayed (online) figure stays a
// picture like every other kit. Materials are cached per colour.
import * as THREE from 'three/webgpu';
import { beamMaterial, makeOrb } from '../gfx/orbs.js';

export const GEO = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18, 1, true),
  cylSolid: new THREE.CylinderGeometry(1, 1, 1, 14, 1),
  box: new THREE.BoxGeometry(1, 1, 1),
  ico: new THREE.IcosahedronGeometry(1, 1),
  ico0: new THREE.IcosahedronGeometry(1, 0),
  sphere: new THREE.SphereGeometry(1, 24, 16),
  cone: new THREE.ConeGeometry(1, 1, 10),
  torus: new THREE.TorusGeometry(1, 0.08, 6, 40),
  plane: new THREE.PlaneGeometry(1, 1),
};

const MATS = new Map();
// standard (lit) material, cached
export function mat(color, o = {}) {
  const k = [color, o.emissive ?? 0, o.roughness ?? 0.6, o.metalness ?? 0, o.opacity ?? 1, o.side ?? 0].join(':');
  let m = MATS.get(k);
  if (!m) {
    m = new THREE.MeshStandardNodeMaterial({ color, roughness: o.roughness ?? 0.6, metalness: o.metalness ?? 0, emissive: o.emissive ? (o.emissiveColor ?? color) : 0x000000, emissiveIntensity: o.emissive ?? 0 });
    if ((o.opacity ?? 1) < 1) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
    if (o.side) m.side = o.side;
    MATS.set(k, m);
  }
  return m;
}
// unlit glowing material (additive), cached
export function glow(color, strength = 3, opacity = 1) {
  const k = 'g:' + color + ':' + strength + ':' + opacity;
  let m = MATS.get(k);
  if (!m) {
    m = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(color).multiplyScalar(strength), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    MATS.set(k, m);
  }
  return m;
}
// a flat dark material (Darkness, shadows)
export function dark(color = 0x000000, opacity = 1) {
  const k = 'd:' + color + ':' + opacity;
  let m = MATS.get(k);
  if (!m) { m = new THREE.MeshBasicNodeMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, fog: false }); MATS.set(k, m); }
  return m;
}
const BEAMS = new Map();
export function beamMats(color, core = 0xffffff) {
  const k = color + ':' + core;
  if (!BEAMS.has(k)) BEAMS.set(k, [beamMaterial(color), beamMaterial(core, true)]);
  return BEAMS.get(k);
}
export { makeOrb };

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

// Add obj to the scene for `dur` seconds; tick(t, dt, k01, obj) every frame (return false to end early).
export function temp(kit, obj, dur, tick, onEnd) {
  const g = kit.game;
  g.scene.add(obj);
  let t = 0;
  g.addUpdater((dt) => {
    t += dt;
    const done = kit.disposed || t >= dur || (tick && tick(t, dt, Math.min(1, t / dur), obj) === false);
    if (!done) return true;
    g.scene.remove(obj); onEnd?.(obj); return false;
  });
  return obj;
}
export function mesh(geo, material, s = 1) { const m = new THREE.Mesh(geo, material); if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); return m; }

// A beam from `from` along (unit) `dir`: shortened at the first wall unless
// o.pierce, damages every curse along it (o.dmg) and fades out.
export function beam(kit, from, dir, L, W, color, o = {}) {
  const g = kit.game;
  if (!o.pierce) for (let s = 0.6; s < L; s += 0.4) if (g.world.solidAt(from.x + dir.x * s, from.y + dir.y * s, from.z + dir.z * s)) { L = s; break; }
  const [mo, mi] = beamMats(color, o.core ?? 0xffffff);
  const grp = new THREE.Group();
  const outer = new THREE.Mesh(GEO.cyl, mo), inner = new THREE.Mesh(GEO.cyl, mi);
  for (const m of [outer, inner]) { m.rotation.x = Math.PI / 2; m.position.z = L / 2; m.renderOrder = 24; }
  grp.add(outer, inner);
  grp.position.copy(from); grp.lookAt(v1.copy(from).add(dir));
  const hits = [];
  if (o.dmg) {
    for (const e of g.enemies) {
      if (e.dead || e.untargetable) continue;
      v1.subVectors(e.pos, from); v1.y += (e.height ?? 1.5) * 0.5;
      const along = v1.dot(dir);
      if (along < -0.5 || along > L) continue;
      if (v1.addScaledVector(dir, -along).length() > W + (e.radius ?? 0.5) + 0.3) continue;
      kit.hit(e, o.dmg, { knock: v2.copy(dir).setY(0).setLength(o.knock ?? 5), stagger: o.stagger ?? 0.5, unblockable: o.unblockable, color: o.numColor });
      g.fx.hitSpark(v1.copy(e.pos).setY(e.pos.y + (e.height ?? 1.5) * 0.5), dir, { color });
      hits.push(e); o.onHit?.(e);
    }
    const end = from.clone().addScaledVector(dir, L);
    if (o.blocks !== false) g.combat.hitBlocks(end, dir, W + 0.6, Math.PI, o.dmg * 1.5, kit.p);
  }
  const end = from.clone().addScaledVector(dir, L);
  g.particles.burst(end, { count: 12, color, speed: 6, life: 0.35, size: 0.14, drag: 3, shape: 1, intensity: 3 });
  if (o.light !== false) g.lights.flash(from.clone().addScaledVector(dir, Math.min(L, 6)), color, 8 * Math.max(0.6, W), 10 + W * 4, 0.3);
  const dur = o.dur ?? 0.3 + W * 0.12;
  temp(kit, grp, dur, (t, dt, k) => {
    const a = 1 - k, wob = 1 + Math.sin(t * 70) * 0.08, w = W * wob * (0.25 + a * 0.75);
    outer.scale.set(w, L, w); inner.scale.set(w * 0.45, L, w * 0.45);
  });
  outer.scale.set(W, L, W); inner.scale.set(W * 0.45, L, W * 0.45);
  return { L, end, hits };
}
// A vertical column of light (or water, or darkness) standing on `at`.
export function pillar(kit, at, R, H, color, dur = 0.6, o = {}) {
  // wide columns use a soft glow: the camera often looks down through them
  const soft = o.soft ?? R >= 1.8;
  const [mo, mi] = soft ? (o.faint ? [glow(color, 0.6, 0.12), glow(o.core ?? 0xffffff, 1, 0.3)] : [glow(color, 0.9, 0.32), glow(o.core ?? 0xffffff, 1.4, 0.55)]) : beamMats(color, o.core ?? 0xffffff);
  const grp = new THREE.Group();
  const outer = new THREE.Mesh(GEO.cyl, mo), inner = new THREE.Mesh(GEO.cyl, mi);
  outer.position.y = inner.position.y = H / 2; outer.renderOrder = inner.renderOrder = 24;
  grp.add(outer, inner); grp.position.copy(at);
  temp(kit, grp, dur, (t, dt, k) => {
    const grow = Math.min(1, t / 0.08), a = 1 - Math.max(0, (k - 0.5) * 2), w = R * grow * (0.3 + a * 0.7);
    outer.scale.set(w, H, w); inner.scale.set(w * (soft ? 0.25 : 0.45), H, w * (soft ? 0.25 : 0.45));
  });
  outer.scale.set(0.01, H, 0.01); inner.scale.set(0.01, H, 0.01);
  return grp;
}
// A projectile carrying its own mesh (the pooled projectile itself is hidden).
export function meshShot(kit, obj, o) {
  const g = kit.game;
  g.scene.add(obj); obj.position.copy(o.pos);
  const trail = o.trail, expire = o.onExpire;
  const pr = g.projectiles.fire({ team: 'player', shape: 'orb', scale: 0.01, ...o,
    trail: (q, dt) => { obj.position.copy(q.pos); if (o.face !== false) obj.lookAt(v1.copy(q.pos).add(q.vel)); o.spin && obj.rotateZ(dt * o.spin); trail?.(q, dt); },
    onExpire: (q, why) => { g.scene.remove(obj); expire?.(q, why); } });
  if (!pr) g.scene.remove(obj);
  return pr;
}
// A set-piece group rising out of the ground (domain scenery).
export function rise(kit, grp, from = -6, dur = 0.6) {
  const g = kit.game;
  grp.position.y = from; g.scene.add(grp);
  let t = 0; g.addUpdater((dt) => { t += dt; grp.position.y = Math.min(0, from + (t / dur) * -from); return t < dur && grp.parent; });
  return grp;
}
// curses inside the active domain
export function insideFoes(g) { return g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos)); }
// pull (or with negative strength, push) curses toward a point
export function pull(kit, c, R, strength, lift = 0) {
  for (const e of kit.foes(c, R)) {
    if (e.isBoss && strength > 0) continue;
    v1.subVectors(c, e.pos).setY(0); const d = v1.length(); if (d < 0.3) continue;
    e.knock?.addScaledVector(v1.normalize(), strength * Math.min(1, d / 2));
    if (lift && !e.isBoss) e.vel.y = Math.max(e.vel.y, lift);
  }
}
// ground ring + rising sparks: a generic cast telegraph
export function sigil(kit, at, R, color, dur = 0.5) {
  const g = kit.game;
  g.fx.rings.spawn(v1.set(at.x, at.y + 0.06, at.z), { color, r0: R, r1: R * 0.2, dur, thick: 0.18 });
  g.fx.rings.spawn(v1.set(at.x, at.y + 0.08, at.z), { color, r0: R * 0.2, r1: R, dur: dur * 0.8, thick: 0.08 });
}
// horizontal unit vector from the camera towards `at` (tall set-pieces go on the far side)
export function awayFromCamera(kit, at) {
  const c = kit.game.rig?.camera?.position;
  const d = new THREE.Vector3(c ? at.x - c.x : 0, 0, c ? at.z - c.z : 1);
  if (d.lengthSq() < 1e-4) d.set(0, 0, 1);
  return d.normalize();
}
export function rnd(a, b) { return a + Math.random() * (b - a); }
// direction from `from` to the curse being aimed at (sure-hit aware), else the aim direction
export function aimAt(kit, from, range = 16) {
  const t = kit.target(range, 0.4);
  const d = new THREE.Vector3();
  if (t) d.set(t.pos.x - from.x, t.pos.y + (t.height ?? 1.5) * 0.5 - from.y, t.pos.z - from.z).normalize();
  else d.set(kit.p.aimDir.x, 0, kit.p.aimDir.z).normalize();
  return { dir: d, t };
}
