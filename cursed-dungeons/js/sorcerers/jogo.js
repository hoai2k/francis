// Jogo-style kit — Disaster Flames.
//   LMB  scorching punches; the finisher slams a ring of fire.
//   RMB  Fire Orb: a burning orb that bursts into flame on impact.
//   1    Volcano: a ring of heat marks the ground, then it erupts and
//        launches everything standing on it, leaving pools of lava.
//   2    Ember Insects: a swarm of fiery insects seeks out curses and pops.
//   3    Maximum: Meteor — a colossal meteor falls on the aim point.
//   F    Domain: Coffin of the Iron Mountain — the inside of a volcano. The
//        sure-hit is the heat itself: ordinary curses burn to death almost
//        at once, bosses lose a big share of health every second, and the
//        crater floor keeps erupting.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { makeOrb } from '../gfx/orbs.js';

const FIRE = 0xff6a1a, LAVA = 0xff3a0a, EMBER = 0xffb03a;
const tmp = new THREE.Vector3();

registerSorcerer('jogo', { name: 'Jogo', technique: 'Disaster Flames', rarity: 'epic', title: 'Disaster Curse', desc: 'Fire orbs, telegraphed volcano eruptions, seeking ember insects and the crushing Maximum: Meteor.', domain: 'Coffin of the Iron Mountain', color: '#ff6a1a' });

registerLook('jogo', {
  paint: { skinTone: 0xdcd4c4, hair: 0xdcd4c4, brow: 0x2a2420, top: 0x5a4a3a, kimono: true, sash: 0x2a1a12, sleeve: 0x5a4a3a, pants: 0x3a2e24, shoes: 0x1a1410, eye: 0x1a1a1a, eyeWhite: 0x2a2a2a, fringe: 0, hairSide: 0, hairBack: 0 },
  paintExtra: (S) => {
    // the single big eye and stitched-shut mouth
    S.rect(10, 11, 4, 3, 0x1a1414, 0.05); S.rect(11, 12, 2, 1, 0xffa040, 0.05);
    for (let x = 9; x < 15; x++) S.px(x, 14, x % 2 ? 0x3a2a24 : 0x8a7a6a);
    // dark spots on the robe
    for (const [x, y] of [[21, 22], [26, 25], [22, 29], [25, 21]]) S.px(x, y, 0x2a1e16);
  },
  hair: () => [], hairColor: 0xdcd4c4, accent: FIRE, emit: 0.5, cape: null, scale: 1.05,
  props(rig, K) {
    // the volcano that is his head
    const rock = K.mat(0x4a3a34, { roughness: 0.9 }), lava = K.mat(LAVA, { emissive: 3 }), glow = K.mat(EMBER, { emissive: 4 });
    K.box(rig.head, 8, 2, 8, rock, 0, 9.5, 0);
    K.box(rig.head, 6, 2, 6, rock, 0, 11.3, 0);
    K.box(rig.head, 4, 1.6, 4, rock, 0, 12.9, 0);
    K.box(rig.head, 2.6, 0.6, 2.6, lava, 0, 13.6, 0);
    K.box(rig.head, 1.2, 1.2, 1.2, glow, 0, 14.3, 0);
    for (const [x, z] of [[3.5, 2], [-3, -3.2], [2.8, -3.4]]) K.box(rig.head, 0.6, 1.4, 0.6, lava, x, 10.2, z, 0.2, 0, 0.2);
    // smouldering fists
    K.box(rig.handR, 1.6, 1.6, 1.6, glow, 0, -1.4, 0);
    K.box(rig.handL, 1.6, 1.6, 1.6, glow, 0, -1.4, 0);
  },
});

export const JOGO_SKILLS = [
  { id: 'scorch', name: 'Scorching Fists', desc: '+8% melee damage per rank; melee hits ignite the ground.', max: 3 },
  { id: 'orb', name: 'Flame Orb', desc: 'Bigger, stronger fire orbs.', max: 3 },
  { id: 'volcano', name: 'Eruption', desc: 'Volcano erupts wider and harder.', max: 3 },
  { id: 'insects', name: 'Ember Swarm', desc: 'More ember insects per swarm.', max: 2 },
  { id: 'meteor', name: 'Maximum: Meteor', desc: 'Bigger meteor and longer-lasting fires.', max: 2, req: 'volcano' },
  { id: 'iron', name: 'Iron Mountain', desc: 'Coffin of the Iron Mountain burns 25% hotter and lasts 2s longer.', max: 1, req: 'meteor' },
];

class JogoKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const hot = { trail: FIRE, sparkColor: EMBER };
    this.combo = [
      { ...hot, style: 'punch', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 12, range: 2.6, arc: 1.1, lunge: 6, knock: 3, stop: 0.045, shake: 0.15 },
      { ...hot, style: 'punch', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 13, range: 2.6, arc: 1.1, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15 },
      { ...hot, style: 'uppercut', dur: 0.38, windup: 0.3, strike: 0.5, dmg: 17, range: 2.6, arc: 1.0, lunge: 5, knock: 5, stop: 0.06, shake: 0.22 },
      { ...hot, style: 'slam', dur: 0.6, windup: 0.45, strike: 0.62, dmg: 28, range: 3.4, arc: Math.PI, lunge: 3, knock: 11, stop: 0.1, shake: 0.45, ring: true, ringColor: FIRE, stagger: 0.6, fireRing: true },
    ];
    this.p.stats.meleeMult += r('scorch') * 0.08;
    this.slots = {
      ranged: this.ability({ name: 'Fire Orb', icon: '🔥', cd: 0.8, ce: 0, use: () => this.fireOrb() }),
      t1: this.ability({ name: 'Volcano', icon: '🌋', cd: 6, ce: 12, use: () => this.volcano() }),
      t2: this.ability({ name: 'Ember Insects', icon: '🐞', cd: 9, ce: 16, use: () => this.insects() }),
      t3: this.ability({ name: 'Maximum: Meteor', icon: '☄️', cd: 22, ce: 50, use: () => this.meteor() }),
    };
    // Coffin of the Iron Mountain: the inside of a volcano. The sure-hit is the
    // heat itself — in canon it would burn a normal sorcerer to death at once
    // (Gojo needed Infinity just to stand there). Ordinary curses are cooked
    // within a second or two; bosses lose a big slice of health every second.
    this.domain = {
      name: 'Coffin of the Iron Mountain', icon: '🌋', key: 'coffin_iron_mountain', type: 6, color: FIRE, sound: 'fire', flash: 0xff8a3a,
      look: { floor: 0x2a1610, seam: 0xff3a08, sparkle: 0xffc040, skyTop: 0x140402, skyHorizon: 0xff4a10, stars: 0, band: 0xffa040 },
      duration: 8 + r('iron') * 2, radius: 24,
      onStart: (g, d) => {
        this.buildCrater(g, d);
        g.toast?.('Sure-hit: the heat of the volcano burns everything inside');
        g.fx.flash(0xff6a1a, 0.5, 0.4); g.shake(0.7); g.audio?.energy('explode');
      },
      onTick: (g, d, dt) => {
        d.burn = (d.burn ?? 0.25) - dt; d.erupt = (d.erupt ?? 0.6) - dt;
        if (d.burn <= 0) {
          d.burn = 0.5;
          const heat = 1 + r('iron') * 0.25;
          for (const e of g.enemies) if (!e.dead && !e.isDummy && g.domainSys.inside(e.pos)) {
            const mx = e.maxHp ?? 100;
            const dmg = (e.isBoss ? mx * 0.03 : Math.max(25, mx * 0.4)) * heat;
            g.combat.damageEnemy(e, dmg, this.p, { stagger: e.isBoss ? 0 : 0.2, ceGain: 0, unblockable: true, crit: false, color: '#ff8a3a' });
            const at = tmp.copy(e.pos).setY(e.pos.y + e.height * 0.5);
            g.particles.burst(at, { count: 10, color: FIRE, speed: 2, up: 3, life: 0.6, size: 0.45, sizeEnd: 0.05, intensity: 3 });
            g.particles.burst(at, { count: 3, color: 0x1a1210, additive: false, speed: 1, up: 2, life: 1, size: 0.6, sizeEnd: 1.6 });
          }
        }
        // the crater floor keeps erupting under the curses
        if (d.erupt <= 0) {
          d.erupt = 0.8;
          const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
          for (let i = 0; i < Math.min(3, list.length); i++) this.erupt(list[Math.floor(Math.random() * list.length)].pos.clone(), 0.45, 0.8);
          // and a random lava fountain somewhere in the crater
          const a = Math.random() * Math.PI * 2, rr = 4 + Math.random() * (d.radius - 6);
          const at = new THREE.Vector3(d.center.x + Math.cos(a) * rr, d.center.y, d.center.z + Math.sin(a) * rr);
          at.y = this.groundAt(at.x, at.z, d.center.y);
          for (let k = 0; k < 2; k++) g.particles.burst(at, { count: 18, color: k ? LAVA : EMBER, speed: 6, spread: 0.3, dir: tmp.set(0, 4, 0), life: 1.1, size: 0.4, sizeEnd: 0.1, gravity: 9, intensity: 3 });
        }
        // falling ash and embers, heat shimmer
        for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.glow.emit(d.center.x + Math.cos(a) * rr, d.center.y + 6 + Math.random() * 6, d.center.z + Math.sin(a) * rr, 0, -2, 0, 2, 3, 1.2, 0.3, 0.1, 0, 0.5, 0.5, 1); }
        if (Math.random() < 0.3) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.smoke.emit(d.center.x + Math.cos(a) * rr, d.center.y + 8, d.center.z + Math.sin(a) * rr, 0, -0.6, 0, 2.5, 0.12, 0.09, 0.08, 1.4, 0, 0.5, 3, 0); }
        // the crater walls' lava streams pulse
        if (this.crater) this.crater.userData.lava.emissiveIntensity = 3 + Math.sin(g.time * 5) * 0.8;
      },
      onEnd: () => this.clearCrater(),
    };
  }
  dispose() { super.dispose(); this.clearCrater(); }
  // Volcano interior set-piece: a ring of black rock walls leaning inward,
  // lava streams pouring down them and glowing vents in the floor.
  buildCrater(g, d) {
    this.clearCrater();
    const grp = new THREE.Group();
    const rock = new THREE.MeshStandardNodeMaterial({ color: 0x241612, roughness: 0.95, emissive: 0x3a0a00, emissiveIntensity: 0.4 });
    const lava = new THREE.MeshStandardNodeMaterial({ color: LAVA, emissive: LAVA, emissiveIntensity: 3, roughness: 0.6 });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const R = d.radius - 0.5, N = 44;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + Math.random() * 0.05;
      const h = 9 + Math.random() * 9, w = (2 * Math.PI * R) / N + 1.2;
      const x = d.center.x + Math.cos(a) * R, z = d.center.z + Math.sin(a) * R;
      const gy = this.groundAt(x, z, d.center.y);
      const wall = new THREE.Mesh(box, rock);
      wall.scale.set(w, h, 3 + Math.random() * 2);
      wall.position.set(x, gy + h * 0.5 - 1, z);
      wall.rotation.y = -a + Math.PI / 2; wall.rotateX(-0.28 - Math.random() * 0.12); // lean in over the crater
      grp.add(wall);
      if (i % 4 === 0) { // a lava stream running down the wall
        const fall = new THREE.Mesh(box, lava);
        fall.scale.set(0.7, h * 0.95, 0.4);
        fall.position.set(d.center.x + Math.cos(a) * (R - 1.6), gy + h * 0.45 - 1, d.center.z + Math.sin(a) * (R - 1.6));
        fall.rotation.copy(wall.rotation);
        grp.add(fall);
        const pool = new THREE.Mesh(box, lava);
        pool.scale.set(2.6, 0.12, 2.6); pool.position.set(d.center.x + Math.cos(a) * (R - 3), gy + 0.04, d.center.z + Math.sin(a) * (R - 3));
        grp.add(pool);
      }
    }
    // glowing cracks / vents across the crater floor
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, rr = 3 + Math.random() * (R - 6);
      const x = d.center.x + Math.cos(a) * rr, z = d.center.z + Math.sin(a) * rr;
      const vent = new THREE.Mesh(box, lava);
      vent.scale.set(0.35, 0.08, 2 + Math.random() * 3); vent.rotation.y = Math.random() * Math.PI;
      vent.position.set(x, this.groundAt(x, z, d.center.y) + 0.03, z);
      grp.add(vent);
    }
    grp.userData = { lava, box };
    grp.position.y = -6; g.scene.add(grp); this.crater = grp;
    this.craterLight = g.lights.flash(d.center.clone().setY(d.center.y + 4), FIRE, 6, d.radius * 1.6, 60, { priority: 4, fade: false });
    let t = 0; g.addUpdater((dt) => { t += dt; grp.position.y = Math.min(0, -6 + t * 12); return t < 0.6 && this.crater === grp; });
  }
  clearCrater() {
    const g = this.game;
    if (this.crater) { g.scene.remove(this.crater); this.crater.userData.box?.dispose(); this.crater = null; }
    if (this.craterLight) { g.lights.remove(this.craterLight); this.craterLight = null; }
  }
  onMeleeHit(e, step) {
    if (step.fireRing && this.rank('scorch')) this.game.hazards.add({ pos: e.pos.clone(), radius: 1.3, dps: 8 + this.rank('scorch') * 4, dur: 2.5, color: FIRE, team: 'player', src: this.p });
  }
  groundAt(x, z, y) { const gy = this.game.world.groundBelow(x, z, y + 3); return isFinite(gy) ? gy : y; }
  // -------------------------------------------------------------- RMB
  fireOrb() {
    const g = this.game, p = this.p, rk = this.rank('orb');
    this.cast(0.3);
    const from = this.handPos();
    const orb = makeOrb(FIRE, { radius: 0.3 + rk * 0.06, coreColor: 0xffe0a0 });
    orb.position.copy(from); g.scene.add(orb);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const pr = g.projectiles.fire({ pos: from, vel: p.aimDir.clone().multiplyScalar(20), team: 'player', shape: 'orb', color: FIRE, scale: 0.01, life: 0.9, radius: 0.5, light: 4,
      homing: target ? 10 : 0, target,
      trail: (q) => { orb.position.copy(q.pos); g.particles.burst(q.pos, { count: 2, color: Math.random() < 0.5 ? FIRE : EMBER, speed: 1, up: 1, life: 0.35, size: 0.35, sizeEnd: 0.05 }); },
      onExpire: (q) => {
        g.scene.remove(orb);
        const R = 1.8 + rk * 0.4;
        g.fx.explosion(q.pos, FIRE, R);
        g.combat.aoe(q.pos, R, 14 + rk * 6, p, { knock: 5, stagger: 0.35, falloff: true });
        g.audio?.impact(1.1); g.shake(0.12);
      } });
    if (!pr) { g.scene.remove(orb); return false; }
    g.audio?.whoosh(0.8); g.audio?.noise({ dur: 0.25, gain: 0.2, type: 'lowpass', freq: 600, sweep: 2400 });
  }
  // -------------------------------------------------------------- Volcano
  erupt(at, warn = 0.6, mult = 1) {
    const g = this.game, p = this.p, rk = this.rank('volcano');
    const R = (2.8 + rk * 0.5) * (mult < 1 ? 0.8 : 1);
    at.y = this.groundAt(at.x, at.z, at.y);
    g.markers.spawn({ pos: at, dur: warn, radius: R, color: FIRE });
    // the ground cracks and smokes during the warning
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R; g.particles.glow.emit(at.x + Math.cos(a) * rr, at.y + 0.1, at.z + Math.sin(a) * rr, 0, 1.5, 0, 0.4, 3, 0.9, 0.2, 0.12, 0, 1, 0.5, 1); }
      if (Math.random() < 0.3) g.particles.smoke.emit(at.x + (Math.random() - 0.5) * R, at.y + 0.2, at.z + (Math.random() - 0.5) * R, 0, 1.2, 0, 1, 0.15, 0.1, 0.08, 0.5, -0.2, 1, 2, 0);
      if (t < warn) return true;
      // ERUPTION
      g.combat.aoe(at, R, (34 + rk * 12) * mult, p, { knock: 6, stagger: 0.8 });
      for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(at) < R + 0.5) e.vel.y = Math.max(e.vel.y, 12);
      const c = at.clone().setY(at.y + 0.5);
      for (let i = 0; i < 4; i++) g.particles.burst(c, { count: 20, color: i % 2 ? FIRE : EMBER, speed: 5, spread: 0.35, dir: tmp.set(0, 3 + i, 0), life: 0.9, size: 0.45, sizeEnd: 0.1, gravity: 8, intensity: 3 });
      g.particles.burst(c, { count: 18, color: 0x2a1a14, additive: false, speed: 4, up: 3, life: 1.4, size: 0.9, sizeEnd: 3, drag: 2 });
      g.fx.shockwave(at, LAVA, R + 1); g.fx.screenWave(c, 0.6, 0.35);
      g.lights.flash(c.clone().setY(c.y + 1.5), FIRE, 16, R * 4, 0.5);
      g.hazards.add({ pos: at.clone(), radius: R * 0.6, dps: 12 + rk * 4, dur: 3 + this.rank('meteor'), color: LAVA, team: 'player', src: p });
      g.shake(0.4 * mult); g.hitStop(0.04); g.audio?.energy('explode');
      return false;
    });
  }
  volcano() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const at = target ? target.pos.clone() : p.aimPoint.clone();
    tmp.subVectors(at, p.pos).setY(0); if (tmp.length() > 11) at.copy(p.pos).addScaledVector(tmp.normalize(), 11);
    this.erupt(at, 0.6, 1);
    g.audio?.energy('fire');
  }
  // -------------------------------------------------------------- Ember Insects
  insects() {
    const g = this.game, p = this.p;
    const n = 6 + this.rank('insects') * 2;
    const foes = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 20);
    if (!foes.length) { g.toast?.('No curses to hunt'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    for (let i = 0; i < n; i++) setTimeout(() => {
      const a = (i / n) * Math.PI * 2 + p.facing;
      const vel = new THREE.Vector3(Math.sin(a) * 7, 4 + Math.random() * 2, Math.cos(a) * 7);
      const target = foes[i % foes.length];
      g.projectiles.fire({ pos: p.pos.clone().setY(p.pos.y + 1.6), vel, team: 'player', shape: 'cube', color: EMBER, emissive: 5, scale: 0.9, life: 2.4, radius: 0.45, light: 1.5, ghost: true,
        homing: 5, target,
        trail: (q) => { q.homing = Math.min(14, q.homing + 0.25); if (Math.random() < 0.7) g.particles.burst(q.pos, { count: 1, color: FIRE, speed: 0.4, life: 0.3, size: 0.25, sizeEnd: 0.02 }); },
        onHit: (e, q) => {
          g.combat.damageEnemy(e, 14 + this.rank('insects') * 3, p, { stagger: 0.25 });
          g.fx.explosion(q.pos, FIRE, 1.2);
          g.combat.aoe(q.pos, 1.5, 8, p, { knock: 3, stagger: 0.2, blocks: false });
          g.audio?.impact(0.8);
        } });
      g.audio?.tone({ freq: 900 + i * 60, to: 500, dur: 0.1, gain: 0.05, type: 'square', filter: 3000 });
    }, i * 45);
    g.audio?.energy('fire');
  }
  // -------------------------------------------------------------- Maximum: Meteor
  meteor() {
    const g = this.game, p = this.p, rk = this.rank('meteor');
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const at = target ? target.pos.clone() : p.aimPoint.clone();
    tmp.subVectors(at, p.pos).setY(0); if (tmp.length() > 14) at.copy(p.pos).addScaledVector(tmp.normalize(), 14);
    at.y = this.groundAt(at.x, at.z, p.pos.y);
    const R = 6 + rk * 1.2, FALL = 1.5;
    p.action = { type: 'cast', both: true, dur: 0.9, elapsed: 0, t: 0, moveScale: 0.2, lock: true, faceAim: true };
    g.toast?.('Maximum: Meteor');
    g.markers.spawn({ pos: at, dur: FALL, radius: R, color: FIRE });
    g.audio?.charge(FALL, 0.5);
    // the rock itself: a molten block wrapped in fire
    const rock = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardNodeMaterial({ color: 0x3a2018, roughness: 0.9, emissive: LAVA, emissiveIntensity: 0.8 }));
    const halo = makeOrb(FIRE, { radius: 1.6, coreColor: 0xffd080 });
    rock.add(core, halo); rock.scale.setScalar(1.6 + rk * 0.3);
    const start = at.clone().add(new THREE.Vector3(-Math.sin(p.facing) * 8, 26, -Math.cos(p.facing) * 8));
    rock.position.copy(start); g.scene.add(rock);
    const light = g.lights.attach(rock, FIRE, 14, 26, { offsetY: 0, priority: 6 });
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      const k = Math.min(1, t / FALL);
      rock.position.lerpVectors(start, at, k * k);
      core.rotation.x += dt * 3; core.rotation.y += dt * 2;
      for (let i = 0; i < 6; i++) g.particles.burst(tmp.copy(rock.position).add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)), { count: 1, color: Math.random() < 0.5 ? FIRE : EMBER, speed: 1, up: 1.5, life: 0.6, size: 1, sizeEnd: 2.5, intensity: 3 });
      if (Math.random() < 0.6) g.particles.smoke.emit(rock.position.x, rock.position.y + 1, rock.position.z, 0, 2, 0, 1.4, 0.12, 0.08, 0.06, 1.2, -0.1, 1, 3, 0);
      if (k < 1) return true;
      g.scene.remove(rock); g.lights.remove(light);
      g.fx.explosion(at, FIRE, R);
      g.fx.explosion(at.clone().setY(at.y + 2), EMBER, R * 0.6);
      g.combat.aoe(at, R, 110 + rk * 35, p, { knock: 16, stagger: 1, falloff: true, unblockable: true });
      for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(at) < R) e.vel.y = Math.max(e.vel.y, 10);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.hazards.add({ pos: at.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.55, 0, Math.sin(a) * R * 0.55)), radius: 1.6, dps: 18, dur: 4 + rk * 1.5, color: LAVA, team: 'player', src: p }); }
      for (let i = 0; i < 30; i++) g.debris.spawn(at.clone().setY(at.y + 0.6), new THREE.Vector3((Math.random() - 0.5) * 16, 6 + Math.random() * 10, (Math.random() - 0.5) * 16), 0.25 + Math.random() * 0.35, new THREE.Color(Math.random() < 0.4 ? 0xff5a1a : 0x3a2a24), 3);
      g.fx.screenWave(at, 1.5, 0.7); g.fx.flash(0xffa040, 0.6, 0.3); g.fx.chroma(1.5);
      g.shake(1); g.hitStop(0.1); g.slowMo(0.35, 0.4);
      g.audio?.energy('explode'); g.audio?.blackFlash();
      return false;
    });
  }
}
registerKit('jogo', JogoKit, JOGO_SKILLS);
