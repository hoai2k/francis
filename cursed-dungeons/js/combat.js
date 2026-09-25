// Combat core: melee combos, damage application, hit feedback (hit-stop,
// shake, flash, sparks, knockback, damage numbers) and area queries.
import * as THREE from 'three/webgpu';
import { BLOCKS } from './world/blocks.js';
import { tileAvgColor } from './gfx/textures.js';
import { angleDiff } from './util.js';

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

// Default three-hit combo (sorcerers override / extend it).
export const BASE_COMBO = [
  { style: 'swingR', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 12, range: 2.7, arc: 1.25, lunge: 6, knock: 4, stop: 0.045, shake: 0.18 },
  { style: 'swingL', dur: 0.34, windup: 0.3, strike: 0.55, dmg: 13, range: 2.7, arc: 1.25, lunge: 6, knock: 4, stop: 0.05, shake: 0.2 },
  { style: 'slam', dur: 0.56, windup: 0.42, strike: 0.6, dmg: 24, range: 3.2, arc: Math.PI, lunge: 4, knock: 10, stop: 0.09, shake: 0.42, ring: true, stagger: 0.5 },
];

export class Combat {
  constructor(game) { this.game = game; }

  // All living enemies in a cone/circle. arc = half angle (PI = full circle)
  query(origin, dir, range, arc = Math.PI, list = this.game.enemies) {
    const out = [];
    const face = Math.atan2(dir.x, dir.z);
    for (const e of list) {
      if (e.dead || e.untargetable) continue;
      v1.subVectors(e.pos, origin); const dy = v1.y; v1.y = 0;
      const d = v1.length();
      if (d > range + e.radius || Math.abs(dy) > 3.2) continue;
      if (arc < Math.PI && d > 0.6 && Math.abs(angleDiff(face, Math.atan2(v1.x, v1.z))) > arc) continue;
      out.push(e);
    }
    return out;
  }

  // Player (or ally) deals damage. Returns final amount.
  damageEnemy(e, base, src, o = {}) {
    const g = this.game;
    if (!e || e.dead) return 0;
    let dmg = base * (src?.stats?.damage ?? 1) * (o.mult ?? 1);
    const crit = o.crit ?? (Math.random() < (src?.stats?.crit ?? 0.05));
    if (crit) dmg *= o.critMult ?? 2;
    if (o.blackFlash) dmg *= 2.5;
    dmg *= g.difficultyDamageTaken ?? 1;
    const dealt = e.takeDamage(dmg, src, { ...o, crit });
    if (dealt > 0) {
      g.stats && (g.stats.damage += dealt);
      if (src && src.isPlayer) {
        src.gainCE?.(o.ceGain ?? dealt * 0.08);
        if (src.stats.lifesteal) src.heal?.(dealt * src.stats.lifesteal, true);
        src.onHitEnemy?.(e, dealt, o);
      }
      const col = o.blackFlash ? '#ff2a2a' : crit ? null : o.color ?? null;
      g.fx.damageNumber(e.pos, dealt, { crit: crit || o.blackFlash, color: col, text: o.blackFlash ? `${Math.round(dealt)}!` : null });
    }
    return dealt;
  }

  // Melee strike from a player's current combo step.
  meleeStrike(p, step) {
    const g = this.game;
    const dir = v2.set(Math.sin(p.facing), 0, Math.cos(p.facing));
    const targets = this.query(p.pos, dir, step.range * (p.stats.reach ?? 1), step.arc);
    let hit = 0;
    const bf = p.blackFlashReady?.(step) ?? false;
    for (const e of targets) {
      const kdir = v1.subVectors(e.pos, p.pos).setY(0).normalize();
      const dealt = this.damageEnemy(e, step.dmg * (p.weaponMult ?? 1), p, {
        knock: kdir.clone().multiplyScalar(step.knock * (bf ? 2.2 : 1)), stagger: step.stagger ?? 0.25, blackFlash: bf, melee: true, color: step.color,
      });
      if (dealt > 0) {
        hit++;
        const hp = e.pos.clone(); hp.y += e.height * 0.55;
        g.fx.hitSpark(hp, kdir, { color: bf ? 0xff2020 : step.sparkColor ?? p.rig.look?.accent ?? 0xffe0a0, big: step.ring || bf, crit: false });
        p.onMeleeHit?.(e, step, dealt, bf);
      }
    }
    // destructible scenery in the arc
    this.hitBlocks(p.pos, dir, step.range, step.arc, step.dmg * 1.5, p);
    if (hit) {
      g.hitStop(step.stop * (bf ? 3 : 1) + Math.min(0.03, hit * 0.006));
      g.shake(step.shake * (bf ? 2.2 : 1));
      g.audio?.impact(step.ring ? 1.6 : 1, bf ? 'crit' : 'flesh');
      if (bf) this.blackFlashFx(p, targets[0]);
    }
    if (step.ring) {
      const c = p.pos.clone().addScaledVector(dir, 1.2);
      g.fx.shockwave(c, step.ringColor ?? p.rig.look?.accent ?? 0xffffff, step.range + 0.8);
      if (!hit) g.shake(0.15);
    }
    return hit;
  }
  blackFlashFx(p, e) {
    const g = this.game;
    const at = e ? e.pos.clone().setY(e.pos.y + 1) : p.pos.clone().setY(p.pos.y + 1);
    g.fx.blackFlash(0.22);
    g.fx.screenWave(at, 1.2, 0.55);
    g.fx.chroma(1.4);
    g.slowMo(0.35, 0.25);
    g.audio?.blackFlash();
    g.fx.blackLightning(at);
    g.lights.flash(at, 0xff1010, 14, 12, 0.35);
  }
  // Damage destructible blocks in an arc/radius.
  hitBlocks(origin, dir, range, arc, dmg, src) {
    const w = this.game.world; if (!w) return;
    const face = Math.atan2(dir.x, dir.z);
    const r = Math.ceil(range);
    for (let dy = 0; dy <= 2; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const bx = Math.floor(origin.x) + dx, by = Math.floor(origin.y) + dy, bz = Math.floor(origin.z) + dz;
      const id = w.get(bx, by, bz); if (!id || !BLOCKS[id].hp) continue;
      const cx = bx + 0.5 - origin.x, cz = bz + 0.5 - origin.z;
      const d = Math.hypot(cx, cz); if (d > range + 0.7) continue;
      if (arc < Math.PI && d > 0.8 && Math.abs(angleDiff(face, Math.atan2(cx, cz))) > arc) continue;
      this.damageBlock(bx, by, bz, dmg);
    }
  }
  damageBlock(bx, by, bz, dmg) {
    const g = this.game, w = g.world;
    const id = w.get(bx, by, bz); if (!id) return false;
    const def = BLOCKS[id];
    const center = new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5);
    if (!w.hitBlock(bx, by, bz, dmg)) { g.fx.debris(center, tileAvgColor[def.side], 2); return false; }
    // broke: chunks fly + collapse pillars above
    g.debris?.burst(center, def, def.debris);
    g.audio?.breakBlock(def.step === 'wood' ? 'wood' : 'stone');
    g.onBlockBroken?.(bx, by, bz, def);
    if (def.name.includes('pillar') || def.name === 'cracked_brick') {
      for (let y = by + 1; y < by + 12; y++) { const up = w.get(bx, y, bz); if (up === id || (up && BLOCKS[up].name === 'dark_planks' && y === by + 1 + 0)) { w.set(bx, y, bz, 0); g.debris?.burst(new THREE.Vector3(bx + 0.5, y + 0.5, bz + 0.5), BLOCKS[up], 4); } else break; }
      for (let y = by - 1; y > by - 12; y--) { const dn = w.get(bx, y, bz); if (dn === id) { w.set(bx, y, bz, 0); g.debris?.burst(new THREE.Vector3(bx + 0.5, y + 0.5, bz + 0.5), BLOCKS[dn], 4); } else break; }
    }
    // loose crates stacked on top fall too
    const above = w.get(bx, by + 1, bz);
    if (above && BLOCKS[above].hp && BLOCKS[above].hp < 20) this.damageBlock(bx, by + 1, bz, 999);
    return true;
  }
  // Circle AoE helper used by techniques.
  aoe(center, radius, dmg, src, o = {}) {
    const targets = this.query(center, v2.set(0, 0, 1), radius, Math.PI);
    let n = 0;
    for (const e of targets) {
      const kd = v1.subVectors(e.pos, center).setY(0); const d = kd.length(); kd.normalize();
      const fall = o.falloff ? Math.max(0.35, 1 - d / radius) : 1;
      if (this.damageEnemy(e, dmg * fall, src, { ...o, knock: o.knock ? kd.clone().multiplyScalar(o.knock * fall) : null }) > 0) n++;
    }
    if (o.blocks !== false) this.hitBlocks(center, v2.set(0, 0, 1), radius, Math.PI, dmg * 2, src);
    return n;
  }
}
