// Sukuna-style kit — Shrine.
//   LMB  claw combo trailing crimson slashes.
//   RMB  Dismantle: an invisible cutting wave that slices everything in a line
//        (including crates, walls and pillars).
//   1    Cleave: an adaptive X-cut on the nearest curse that scales with its toughness.
//   2    Dismantle Flurry: a fan of cutting waves.
//   3    Fuga: "Open" — a flame bow forms and looses a burning arrow.
//   F    Domain: Malevolent Shrine — everything nearby is sliced, constantly.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit } from './index.js';
import { makeOrb } from '../gfx/orbs.js';
import { ditherMask, occlusionAmount } from '../gfx/materials.js';

const CRIMSON = 0xff2a3a, FIRE = 0xff7a2a;
const tmp = new THREE.Vector3();

export const SUKUNA_SKILLS = [
  { id: 'dismantle', name: 'Dismantle', desc: 'Longer, stronger cutting waves.', max: 3 },
  { id: 'cleave', name: 'Cleave', desc: 'Cleave cuts deeper into tough curses.', max: 3 },
  { id: 'flurry', name: 'Flurry', desc: 'More waves in Dismantle Flurry.', max: 2, req: 'dismantle' },
  { id: 'fuga', name: 'Fuga', desc: 'Bigger flame arrow explosion.', max: 3 },
  { id: 'claws', name: 'King\'s Claws', desc: '+8% melee damage per rank.', max: 3 },
  { id: 'shrine', name: 'Malevolent Shrine', desc: 'Domain slashes faster and lasts longer.', max: 2 },
  { id: 'rct', name: 'Reverse Cursed Technique', desc: '+1 Reverse Cursed Technique charge.', max: 1 },
];

class SukunaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 12, range: 2.8, arc: 1.2, lunge: 7, knock: 3, stop: 0.04, shake: 0.14, trail: CRIMSON, sparkColor: 0xff6a6a },
      { style: 'swingL', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 12, range: 2.8, arc: 1.2, lunge: 7, knock: 3, stop: 0.04, shake: 0.14, trail: CRIMSON, sparkColor: 0xff6a6a },
      { style: 'swingR', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 14, range: 3, arc: 1.3, lunge: 7, knock: 4, stop: 0.05, shake: 0.18, trail: CRIMSON, sparkColor: 0xff6a6a },
      { style: 'spin', dur: 0.45, windup: 0.25, strike: 0.55, dmg: 22, range: 3.4, arc: Math.PI, lunge: 3, knock: 9, stop: 0.08, shake: 0.35, ring: true, ringColor: CRIMSON, trail: CRIMSON },
    ];
    this.p.stats.meleeMult += r('claws') * 0.08;
    this.p.healMax += r('rct'); this.p.healCharges = Math.min(this.p.healCharges + r('rct'), this.p.healMax);
    this.slots = {
      ranged: this.ability({ name: 'Dismantle', icon: '〰️', cd: 0.75, ce: 0, use: () => this.dismantle(Math.atan2(this.p.aimDir.x, this.p.aimDir.z)) }),
      t1: this.ability({ name: 'Cleave', icon: '✖️', cd: 6, ce: 12, use: () => this.cleave() }),
      t2: this.ability({ name: 'Flurry', icon: '🌪️', cd: 9, ce: 16, use: () => this.flurry() }),
      t3: this.ability({ name: 'Fuga', icon: '🏹', cd: 16, ce: 40, use: () => this.fuga() }),
    };
    this.domain = {
      name: 'Malevolent Shrine', icon: '⛩️', key: 'malevolent_shrine', type: 2, color: 0xff3a2a, sound: 'shrine', flash: 0xff2020,
      duration: 8 + r('shrine') * 1.5, radius: 22,
      onStart: (g, d) => { this.shrineProp(g, d); },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt;
        if (d.tick > 0) return;
        d.tick = 0.16 - r('shrine') * 0.02;
        const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
        for (let i = 0; i < Math.min(3, list.length); i++) {
          const e = list[Math.floor(Math.random() * list.length)];
          const at = e.pos.clone().setY(e.pos.y + e.height * (0.3 + Math.random() * 0.6));
          g.combat.damageEnemy(e, 7, this.p, { stagger: 0.1, ceGain: 0, unblockable: true });
          const a = Math.random() * Math.PI * 2;
          g.fx.slashLine(at.clone().add(new THREE.Vector3(Math.cos(a) * 1.4, (Math.random() - 0.5), Math.sin(a) * 1.4)), new THREE.Vector3(-Math.cos(a), (Math.random() - 0.5) * 0.6, -Math.sin(a)), 2.8, 0xffffff, 0.12, 0.12, Math.random() * 3);
        }
        // the ground and scenery get cut too
        if (Math.random() < 0.5) { const a = Math.random() * Math.PI * 2, r0 = Math.random() * d.radius; const at = d.center.clone().add(new THREE.Vector3(Math.cos(a) * r0, 0.3, Math.sin(a) * r0)); g.fx.slashLine(at, new THREE.Vector3(Math.cos(a + 1.5), 0, Math.sin(a + 1.5)), 3, 0xff4a4a, 0.08, 0.15); g.combat.hitBlocks(at, tmp.set(0, 0, 1), 1, Math.PI, 30, this.p); }
        if (Math.random() < 0.3) g.audio?.energy('slash');
      },
      onEnd: () => { if (this.shrine) { this.game.scene.remove(this.shrine); this.shrine = null; } },
    };
  }
  // the shrine itself: a dark gate of skulls behind the caster
  shrineProp(g, d) {
    const grp = new THREE.Group();
    const mk = (o) => { const m = new THREE.MeshStandardNodeMaterial(o); m.maskNode = ditherMask(occlusionAmount()); return m; };
    const wood = mk({ color: 0x2a0a0a, roughness: 0.6 }), bone = mk({ color: 0xe8dcc0, roughness: 0.8 }), mouth = mk({ color: 0x080000, emissive: 0x801008, emissiveIntensity: 0.6 });
    const b = (w, h, dd, x, y, z, m) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); mm.position.set(x, y, z); mm.castShadow = true; grp.add(mm); };
    for (const x of [-3, 3]) b(0.8, 7, 0.8, x, 3.5, 0, wood);
    b(9, 0.8, 2.6, 0, 7.2, 0, wood); b(10.5, 0.5, 3.2, 0, 7.9, 0, wood); b(6, 3.6, 1.5, 0, 3, -0.6, mouth);
    for (let i = 0; i < 14; i++) b(0.7, 0.7, 0.7, (Math.random() - 0.5) * 8, Math.random() * 0.8, 1 + Math.random(), bone);
    // stand it across the arena, away from the camera, facing the caster
    const cam = this.game.rig.camera.position;
    const away = new THREE.Vector3(d.center.x - cam.x, 0, d.center.z - cam.z).normalize();
    grp.position.copy(d.center).addScaledVector(away, 9);
    grp.rotation.y = Math.atan2(-away.x, -away.z);
    grp.scale.setScalar(0.01);
    g.scene.add(grp); this.shrine = grp;
    let t = 0; g.addUpdater((dt) => { t += dt; grp.scale.setScalar(Math.min(1, t * 2)); return t < 0.6; });
  }
  dismantle(angle, len = 11) {
    const g = this.game, p = this.p;
    if (!this.flurrying) this.cast(0.25);
    const L = len + this.rank('dismantle') * 2;
    const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const from = p.pos.clone().setY(p.pos.y + 1.1).addScaledVector(dir, 0.6);
    // visual: a fast pale slash line + a thin crimson wake
    g.fx.slashLine(from, dir, L, 0xffffff, 0.5, 0.16, Math.random() * 0.4 - 0.2);
    g.fx.slashLine(from.clone().setY(from.y - 0.05), dir, L * 0.9, CRIMSON, 0.25, 0.3);
    const dmg = 13 + this.rank('dismantle') * 5;
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, p.pos); const along = tmp.dot(dir);
      if (along < 0 || along > L) continue;
      const lat = Math.abs(tmp.x * dir.z - tmp.z * dir.x);
      if (lat > 0.9 + e.radius) continue;
      g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().multiplyScalar(2), stagger: 0.25 });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), dir, { color: CRIMSON });
    }
    // cut scenery along the line
    for (let s = 1; s < L; s += 1) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(p.pos.y), dir, 0.8, Math.PI, 18, p);
    g.audio?.energy('slash');
  }
  cleave() {
    const g = this.game, p = this.p;
    let t = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    if (!t) { let bd = 7; for (const e of g.enemies) { if (e.dead) continue; tmp.subVectors(e.pos, p.pos).setY(0); const d = tmp.length(); if (d < bd && tmp.normalize().dot(p.aimDir) > 0.3) { bd = d; t = e; } } }
    if (!t) t = g.nearestEnemy(p.pos, 5);
    if (!t) { g.audio?.ui('back'); return false; }
    this.cast(0.35);
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    const at = t.pos.clone().setY(t.pos.y + t.height * 0.55);
    const adaptive = Math.min(t.maxHp * (0.12 + this.rank('cleave') * 0.03), 180);
    g.fx.slashX(at, 2.6 + t.height * 0.4, 0xffffff);
    setTimeout(() => {
      g.combat.damageEnemy(t, 26 + adaptive, p, { stagger: 0.9, unblockable: true, knock: new THREE.Vector3() });
      g.fx.slashX(at, 3 + t.height * 0.5, CRIMSON);
      g.fx.hitSpark(at, null, { color: CRIMSON, big: true });
      g.hitStop(0.08); g.shake(0.35); g.fx.chroma(0.6);
      g.audio?.energy('slash'); g.audio?.impact(1.6);
    }, 120);
  }
  flurry() {
    const base = Math.atan2(this.p.aimDir.x, this.p.aimDir.z);
    const n = 5 + this.rank('flurry') * 2;
    this.cast(0.5, true);
    this.flurrying = true;
    for (let i = 0; i < n; i++) setTimeout(() => { this.dismantle(base + (i / (n - 1) - 0.5) * 1.3, 9); if (i === n - 1) this.flurrying = false; }, i * 55);
  }
  fuga() {
    const g = this.game, p = this.p;
    const rk = this.rank('fuga');
    p.action = { type: 'cast', both: true, dur: 1.05, elapsed: 0, t: 0, moveScale: 0.15, lock: true, hold: true, cancelable: false, faceAim: true };
    g.audio?.energy('fire');
    const bow = makeOrb(FIRE, { radius: 0.3, coreColor: 0xffe0a0 });
    g.scene.add(bow);
    const light = g.lights.attach(bow, FIRE, 8, 9, { offsetY: 0, priority: 5 });
    g.fx.dimTarget = 0.3;
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
      bow.position.copy(this.handPos());
      bow.scale.setScalar(0.3 + t * 0.6);
      for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2; g.particles.glow.emit(bow.position.x + Math.cos(a) * 1.4, bow.position.y + (Math.random() - 0.5), bow.position.z + Math.sin(a) * 1.4, -Math.cos(a) * 4, 0.5, -Math.sin(a) * 4, 0.35, 3, 1.3, 0.3, 0.16, 0, 2, 0.2, 0); }
      if (t < 0.95) return true;
      g.scene.remove(bow); g.lights.remove(light);
      g.fx.dimTarget = 0;
      p.action = null;
      const from = this.handPos();
      const self = this;
      g.projectiles.fire({ pos: from, vel: p.aimDir.clone().multiplyScalar(34), team: 'player', shape: 'arrow', color: FIRE, emissive: 5, life: 0.9, radius: 0.8, scale: 1.4, light: 10,
        trail: (q) => g.particles.burst(q.pos, { count: 4, color: FIRE, speed: 2, life: 0.5, size: 0.5, sizeEnd: 1.5, intensity: 3 }),
        onExpire: (q) => {
          const R = 5 + rk;
          g.fx.explosion(q.pos, FIRE, R);
          g.combat.aoe(q.pos, R, 70 + rk * 25, p, { knock: 14, stagger: 1, falloff: true });
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.hazards.add({ pos: q.pos.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.5, 0, Math.sin(a) * R * 0.5)), radius: 1.6, dps: 20, dur: 4, color: FIRE, team: 'player', src: p }); }
          g.fx.screenWave(q.pos, 1.3, 0.6); g.fx.flash(0xff8a3a, 0.45, 0.25); g.fx.chroma(1.2);
          g.shake(0.8); g.hitStop(0.08);
          g.audio?.energy('explode');
        } });
      g.audio?.whoosh(1.5);
      return false;
    });
  }
}
registerKit('sukuna', SukunaKit, SUKUNA_SKILLS);
