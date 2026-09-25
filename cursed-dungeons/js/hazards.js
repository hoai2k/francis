// Lingering ground hazards: acid puddles from spitters, fire patches from
// bosses, shadow pools. Damage ticks players (or enemies) standing inside.
import * as THREE from 'three/webgpu';

export class Hazards {
  constructor(game) { this.game = game; this.list = []; }
  add({ pos, radius = 1.2, dps = 6, dur = 4, color = 0x9aff3a, team = 'enemy', slow = 0, src = null }) {
    const g = this.game;
    const gy = g.world.groundBelow(pos.x, pos.z, pos.y + 1);
    if (!isFinite(gy)) return;
    const p = new THREE.Vector3(pos.x, gy, pos.z);
    const marker = g.markers.spawn({ pos: p, radius, dur: dur, color });
    marker.prog.value = 1; marker.t = 0;
    marker.keep = true;
    this.list.push({ pos: p, radius, dps, t: 0, dur, color: new THREE.Color(color), team, slow, marker, src, tick: 0 });
  }
  acid(pos, dmg) { this.add({ pos, radius: 1.3, dps: dmg, dur: 3.5, color: 0x6aff2a, slow: 0.3 }); }
  fire(pos, dmg, r = 1.5) { this.add({ pos, radius: r, dps: dmg, dur: 4, color: 0xff6a1a }); }
  update(dt) {
    if (!dt) return;
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      h.t += dt; h.tick -= dt;
      h.marker.prog.value = 1; h.marker.t = Math.min(h.marker.t, h.dur - 0.2);
      h.marker.alpha.value = Math.min(1, (h.dur - h.t) * 2) * 0.6;
      if (Math.random() < dt * 14) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * h.radius;
        g.particles.glow.emit(h.pos.x + Math.cos(a) * r, h.pos.y + 0.1, h.pos.z + Math.sin(a) * r, 0, 0.8 + Math.random(), 0, 0.7, h.color.r * 2, h.color.g * 2, h.color.b * 2, 0.16, -0.5, 0.2, 1, 0);
      }
      if (h.tick <= 0) {
        h.tick = 0.4;
        const targets = h.team === 'enemy' ? g.hostileTargets() : g.enemies;
        for (const t of targets) {
          if (t.dead) continue;
          const dx = t.pos.x - h.pos.x, dz = t.pos.z - h.pos.z;
          if (dx * dx + dz * dz < h.radius * h.radius && Math.abs(t.pos.y - h.pos.y) < 1.2) {
            if (h.team === 'enemy') t.takeDamage(h.dps * 0.4, null, { dot: true, noKnock: true });
            else g.combat.damageEnemy(t, h.dps * 0.4, h.src, { stagger: 0 });
            if (h.slow) t.slowT = 0.5;
          }
        }
      }
      if (h.t >= h.dur) { g.markers.cancel(h.marker); this.list.splice(i, 1); }
    }
  }
  clear() { for (const h of this.list) this.game.markers.cancel(h.marker); this.list = []; }
}
