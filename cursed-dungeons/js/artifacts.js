// Active cursed-tool artifacts (keys R / T, gamepad D-pad ← / →).
import * as THREE from 'three/webgpu';
import { Ally } from './entities/ally.js';

const tmp = new THREE.Vector3();

export function useArtifact(game, p, art) {
  const g = game, b = art.base;
  const power = 1 + (art.it.power - 10) * 0.03;
  const from = p.pos.clone().setY(p.pos.y + 1.3);
  switch (b.act) {
    case 'spear': {
      p.kit.cast(0.35);
      g.projectiles.fire({ pos: from, vel: p.aimDir.clone().multiplyScalar(30), team: 'player', shape: 'arrow', color: 0xc8d0ff, emissive: 1.5, life: 1.1, pierce: true, radius: 0.6, light: 3,
        trail: (q) => g.particles.burst(q.pos, { count: 1, color: 0xaab8ff, speed: 0.2, life: 0.3, size: 0.2, sizeEnd: 0.05 }),
        onHit: (e, q) => { g.combat.damageEnemy(e, 55 * power, p, { unblockable: true, knock: q.vel.clone().setLength(6), stagger: 0.6 }); g.fx.hitSpark(q.pos, q.vel.clone().normalize(), { color: 0xc8d0ff, big: true }); } });
      g.audio?.whoosh(1.2);
      break;
    }
    case 'chain': {
      p.kit.cast(0.3);
      g.projectiles.fire({ pos: from, vel: p.aimDir.clone().multiplyScalar(24), team: 'player', shape: 'nail', color: 0xb0b0b8, emissive: 0.5, life: 0.5, pierce: true, radius: 0.7, scale: 2,
        trail: (q) => g.particles.burst(q.pos, { count: 1, color: 0x9090a0, additive: false, speed: 0, life: 0.4, size: 0.12, sizeEnd: 1, shape: 1 }),
        onHit: (e) => { g.combat.damageEnemy(e, 18 * power, p, { stagger: 0.8 }); e.knock?.add(tmp.subVectors(p.pos, e.pos).setY(0).multiplyScalar(2.6)); } });
      g.audio?.tone({ freq: 900, to: 400, dur: 0.3, gain: 0.08, type: 'square', filter: 3000 });
      break;
    }
    case 'prison': {
      p.kit.cast(0.5, true);
      let n = 0;
      for (const e of g.enemies) if (!e.dead && !e.isBoss && !e.isDummy && e.pos.distanceTo(p.pos) < 8) { e.sealT = 4; n++; g.fx.summonCircle(e.pos, 0xd8c8ff); }
      g.fx.shockwave(p.pos, 0xd8c8ff, 8);
      g.audio?.gong();
      break;
    }
    case 'doll': {
      p.kit.cast(0.4);
      let n = 0;
      for (const e of g.enemies) {
        if (e.dead || !e.hitBy) continue;
        const t = e.hitBy.get(p); if (t === undefined || g.time - t > 5) continue;
        g.combat.damageEnemy(e, 38 * power, p, { stagger: 0.6, unblockable: true });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: 0xffa050, big: true }); n++;
      }
      g.audio?.impact(1.4);
      break;
    }
    case 'barrier': {
      p.barrierT = 5;
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0xffe08a, r0: 0.5, r1: 3, dur: 0.5, thick: 0.12 });
      g.audio?.energy('infinity');
      break;
    }
    case 'corpse': {
      const pos = p.pos.clone().addScaledVector(p.aimDir, 1.5);
      const a = new Ally(g, p, 'corpse', pos, { life: 12, hpMult: power, dmgMult: power });
      g.allies.push(a);
      g.audio?.energy('summon');
      break;
    }
    case 'charm': {
      for (const q of g.players) if (!q.dead && q.pos.distanceTo(p.pos) < 6) { q.healOverTime = { left: q.maxHp * 0.3 * power, t: 4 }; g.fx.heal(q.pos, 0xff9ad8); }
      g.audio?.energy('heal');
      break;
    }
  }
}
