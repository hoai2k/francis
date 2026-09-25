// Pooled projectiles for players and curses: glowing orbs / nails / arrows
// with optional gravity, homing, trails, and world/entity collision.
import * as THREE from 'three/webgpu';
import { BLOCKS } from './world/blocks.js';

const tmp = new THREE.Vector3();

export class Projectiles {
  constructor(game, n = 96) {
    this.game = game;
    this.list = [];
    this.pool = [];
    this.geos = {
      orb: new THREE.IcosahedronGeometry(0.22, 1),
      nail: new THREE.BoxGeometry(0.06, 0.06, 0.55),
      arrow: new THREE.BoxGeometry(0.16, 0.16, 1.4),
      cube: new THREE.BoxGeometry(0.3, 0.3, 0.3),
      slash: new THREE.BoxGeometry(2.2, 0.08, 0.3),
    };
    this.mats = new Map();
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.geos.orb, this.mat(0xffffff));
      m.visible = false; m.frustumCulled = false;
      game.scene.add(m); this.pool.push(m);
    }
  }
  mat(color, emissive = 3) {
    const k = color + ':' + emissive;
    if (!this.mats.has(k)) this.mats.set(k, new THREE.MeshStandardNodeMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: 0.4 }));
    return this.mats.get(k);
  }
  // o: { pos, vel, team:'player'|'enemy', dmg, radius, gravity, life, shape, color, owner, pierce, onHit(target,p), onExpire(p), homing, trail, light }
  fire(o) {
    const mesh = this.pool.find((m) => !m.visible); if (!mesh) return null;
    mesh.geometry = this.geos[o.shape ?? 'orb'];
    mesh.material = this.mat(o.color ?? 0xffffff, o.emissive ?? 3);
    mesh.visible = true; mesh.scale.setScalar(o.scale ?? 1);
    mesh.position.copy(o.pos);
    const p = { ...o, mesh, pos: mesh.position, vel: o.vel.clone(), t: 0, life: o.life ?? 2.5, radius: o.radius ?? 0.4, hit: new Set(), gravity: o.gravity ?? 0 };
    if (o.light) p.lightH = this.game.lights.attach(mesh, o.color ?? 0xffffff, o.light, 6, { offsetY: 0, priority: 1.8 });
    this.list.push(p);
    return p;
  }
  kill(p, reason = 'expire') {
    const i = this.list.indexOf(p); if (i < 0) return;
    this.list.splice(i, 1);
    p.mesh.visible = false;
    if (p.lightH) this.game.lights.remove(p.lightH);
    p.onExpire?.(p, reason);
  }
  update(dt) {
    if (!dt) return;
    const g = this.game, w = g.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      if (p.homing && p.target && !p.target.dead) {
        tmp.subVectors(p.target.pos, p.pos); tmp.y += (p.target.height ?? 1.5) * 0.5;
        const sp = p.vel.length();
        p.vel.lerp(tmp.normalize().multiplyScalar(sp), Math.min(1, dt * p.homing));
      }
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.shape !== 'orb') p.mesh.lookAt(tmp.copy(p.pos).add(p.vel));
      else p.mesh.rotation.y += dt * 8;
      if (p.trail) p.trail(p, dt);
      // world
      const id = w.get(Math.floor(p.pos.x), Math.floor(p.pos.y), Math.floor(p.pos.z));
      if (id && BLOCKS[id].solid && !p.ghost) {
        if (BLOCKS[id].hp && p.team === 'player') g.combat.damageBlock(Math.floor(p.pos.x), Math.floor(p.pos.y), Math.floor(p.pos.z), p.dmg);
        this.kill(p, 'wall'); continue;
      }
      if (p.t > p.life || p.pos.y < -20) { this.kill(p, 'expire'); continue; }
      // entities
      const targets = p.team === 'player' ? g.enemies : g.hostileTargets();
      let dead = false;
      for (const e of targets) {
        if (e.dead || p.hit.has(e) || e.untargetable) continue;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dy = p.pos.y - e.pos.y;
        if (dy < -0.3 || dy > (e.height ?? 1.8) + 0.3) continue;
        const r = (e.radius ?? 0.4) + p.radius;
        if (dx * dx + dz * dz > r * r) continue;
        p.hit.add(e);
        p.onHit?.(e, p);
        if (!p.pierce) { this.kill(p, 'hit'); dead = true; break; }
      }
      if (dead) continue;
    }
  }
  clear() { for (const p of [...this.list]) this.kill(p, 'clear'); }
}
