// Base class for a sorcerer's technique kit: ability slots with cooldowns
// and Cursed Energy costs, input routing, and a generic ranged CE blast.
import * as THREE from 'three/webgpu';
import { BASE_COMBO } from '../combat.js';

export class Kit {
  constructor(player) {
    this.p = player; this.game = player.game;
    this.combo = BASE_COMBO;
    this.slots = {
      ranged: this.ability({ name: 'Cursed Blast', icon: '✦', cd: 0.55, ce: 0, use: () => this.cursedBlast() }),
    };
    this.domain = null;
    this.skills = {};   // skill-tree ranks, filled from save
  }
  ability(o) { return { cdLeft: 0, charges: 1, ...o }; }
  rank(id) { return this.p.skills?.[id] ?? 0; }
  get cdr() { return 1 - (this.p.stats.cdr ?? 0); }
  update(dt, inp) {
    for (const k in this.slots) {
      const s = this.slots[k];
      if (s.maxCharges) {
        // charge-based ability: recharges one charge at a time
        if (s.chargesLeft < s.maxCharges) { s.recharge = (s.recharge ?? 0) + dt; if (s.recharge >= s.cd * this.cdr) { s.recharge = 0; s.chargesLeft++; } }
        s.gate = Math.max(0, (s.gate ?? 0) - dt);
        s.cdLeft = s.chargesLeft > 0 ? s.gate : s.cd * this.cdr - (s.recharge ?? 0);
      } else s.cdLeft = Math.max(0, s.cdLeft - dt);
      const pressed = s.hold ? inp.held[k] : inp.pressed[k];
      if (pressed && s.cdLeft <= 0 && this.p.ce >= (s.ce ?? 0) && this.canCast(s)) {
        if (s.use() !== false) {
          if (s.maxCharges) { s.chargesLeft--; s.gate = s.gateTime ?? 0.3; } else s.cdLeft = s.cd * this.cdr;
          this.p.ce -= s.ce ?? 0;
        }
      }
      if (s.onRelease && inp.released[k]) s.onRelease();
    }
    if (this.domain && inp.pressed.domain && this.p.ce >= this.p.maxCe && !this.game.domain && this.canCast(this.domain)) {
      this.p.ce = 0;
      this.game.startDomain(this.p, this.domain);
    }
    this.tick?.(dt, inp);
  }
  canCast() { const a = this.p.action; return this.p.dodgeT <= 0 && !(a && a.type === 'cast' && a.lock); }
  cast(dur = 0.35, both = false, extra = {}) { this.p.action = { type: 'cast', dur, elapsed: 0, t: 0, both, moveScale: 0.35, ...extra }; this.p.facing = Math.atan2(this.p.aimDir.x, this.p.aimDir.z); }
  handPos(out = new THREE.Vector3()) {
    const p = this.p; return out.set(p.pos.x + Math.sin(p.facing) * 0.6, p.pos.y + 1.35, p.pos.z + Math.cos(p.facing) * 0.6);
  }
  aimTarget() { return this.p.autoTarget || this.game.nearestEnemy(this.p.aimPoint, 3.5); }
  cursedBlast() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const from = this.handPos();
    const dir = p.aimDir.clone(); const col = p.rig.look?.accent ?? 0x6ad8ff;
    g.projectiles.fire({ pos: from, vel: dir.multiplyScalar(22), team: 'player', dmg: 9, shape: 'orb', color: col, life: 0.9, light: 3, scale: 0.8,
      trail: (pr) => g.particles.burst(pr.pos, { count: 1, color: col, speed: 0.3, life: 0.25, size: 0.25, sizeEnd: 0.1 }),
      onHit: (e, pr) => { g.combat.damageEnemy(e, 9, p, { knock: pr.vel.clone().setLength(3), stagger: 0.2 }); g.fx.hitSpark(pr.pos, null, { color: col }); } });
    g.audio?.whoosh(0.7);
  }
}
