// Pickups dropped by curses and chests: cursed coins (currency), health
// orbs and Cursed Energy orbs. They pop out, bounce, then magnet to the
// nearest player.
import * as THREE from 'three/webgpu';

const KINDS = {
  coin: { color: 0xffc83a, emissive: 1.5, size: 0.22, geo: 'oct' },
  heal: { color: 0x5aff8a, emissive: 2.5, size: 0.28, geo: 'box' },
  ce: { color: 0x4ac8ff, emissive: 2.5, size: 0.24, geo: 'oct' },
};

export class Pickups {
  constructor(game) {
    this.game = game; this.list = [];
    this.geos = { oct: new THREE.OctahedronGeometry(1, 0), box: new THREE.BoxGeometry(1.4, 1.4, 1.4) };
    this.mats = {};
    for (const k in KINDS) this.mats[k] = new THREE.MeshStandardNodeMaterial({ color: KINDS[k].color, emissive: KINDS[k].color, emissiveIntensity: KINDS[k].emissive, roughness: 0.3, metalness: 0.6 });
  }
  drop(kind, pos, n = 1, value = 1) {
    for (let i = 0; i < n; i++) {
      const K = KINDS[kind];
      const m = new THREE.Mesh(this.geos[K.geo], this.mats[kind]);
      m.scale.setScalar(K.size); m.castShadow = true;
      m.position.copy(pos).add(new THREE.Vector3(0, 0.8, 0));
      this.game.scene.add(m);
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3;
      this.list.push({ kind, mesh: m, pos: m.position, vel: new THREE.Vector3(Math.cos(a) * sp, 5 + Math.random() * 3, Math.sin(a) * sp), t: 0, value });
    }
  }
  update(dt) {
    if (!dt) return;
    const g = this.game, w = g.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      // nearest living player
      let best = null, bd = 3.8;
      for (const pl of g.players) { if (pl.dead || pl.downed) continue; const d = pl.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = pl; } }
      if (best && p.t > 0.45 && (p.kind === 'coin' || (p.kind === 'heal' && best.hp < best.maxHp) || p.kind === 'ce')) {
        const to = best.pos.clone().setY(best.pos.y + 1).sub(p.pos);
        const d = to.length();
        p.vel.lerp(to.normalize().multiplyScalar(14), Math.min(1, dt * 10));
        if (d < 0.6) { this.collect(p, best); this.list.splice(i, 1); continue; }
      } else {
        p.vel.y -= 20 * dt;
        const gy = w.groundBelow(p.pos.x, p.pos.z, p.pos.y + 0.5);
        if (isFinite(gy) && p.pos.y + p.vel.y * dt < gy + 0.25) { p.pos.y = gy + 0.25; p.vel.y *= -0.4; p.vel.x *= 0.7; p.vel.z *= 0.7; }
      }
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.rotation.y += dt * 3; p.mesh.rotation.x += dt;
      if (p.t > 40 || p.pos.y < -20) { g.scene.remove(p.mesh); this.list.splice(i, 1); }
    }
  }
  collect(p, pl) {
    const g = this.game;
    g.scene.remove(p.mesh);
    if (p.kind === 'coin') { g.addCoins(p.value); g.audio?.coin(); }
    else if (p.kind === 'heal') { pl.heal(pl.maxHp * 0.12); g.audio?.energy('heal'); }
    else if (p.kind === 'ce') { pl.gainCE(8); g.audio?.tone({ freq: 1200, to: 1800, dur: 0.1, gain: 0.05, type: 'sine' }); }
    g.particles.burst(p.pos, { count: 6, color: KINDS[p.kind].color, speed: 2, life: 0.3, size: 0.12, shape: 1 });
  }
  clear() { for (const p of this.list) this.game.scene.remove(p.mesh); this.list = []; }
}
