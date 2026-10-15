// Yuta-style kit — Copy / Queen of Curses Rika.
//   LMB  five-cut katana combo wreathed in cursed energy.
//   RMB  Cursed Slash: a flying arc of cursed energy off the blade.
//   1    Copy — Cursed Speech: "Don't move." stuns every curse around you
//        (rank up to follow it with "Blast away.").
//   2    Rika: the Queen of Curses manifests behind you for a while and her
//        giant arms smash whatever comes close.
//   3    Pure Love: Yuta and Rika pour out their love as a colossal beam.
//   F    Domain: Authentic Mutual Love — an ashen field of katanas, each
//        holding a copied technique. Every beat Yuta draws one and its
//        technique lands as a sure hit (Cursed Speech, Rika's smash, a katana
//        cut, or Reverse Cursed Technique healing), with Rika manifested.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { beamMaterial } from '../gfx/orbs.js';

const CE = 0x9ad0ff, RIKA = 0xd86aff, LOVE = 0xff8ad8;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('yuta', { name: 'Yuta', technique: 'Copy', rarity: 'special', title: 'Special Grade Sorcerer', desc: 'Katana cuts, copied techniques like Cursed Speech, Rika\'s monstrous arms and the Pure Love beam.', domain: 'Authentic Mutual Love', color: '#d86aff' });

registerLook('yuta', {
  paint: { skinTone: 0xf0d0b8, hair: 0x14151c, hairVolume: true, top: 0xeceef2, collar: 0xdfe2ea, topTrim: 0xc8ccd6, buttons: 0x9aa0b0, sleeve: 0xeceef2, pants: 0xeceef2, shoes: 0x2a2a30, eye: 0x1a1a24, fringe: 3, hairSide: 4, hairBack: 6 },
  paintExtra: (S) => { S.px(9, 13, 0x8a7080); S.px(14, 13, 0x8a7080); S.px(10, 13, 0x8a7080); S.px(13, 13, 0x8a7080); }, // tired eye bags
  hair: (m) => [
    { x: -2.5, y: 7.5, z: 2, w: 3, h: 3.5, d: 3, rx: 0.6, rz: 0.5, material: m },
    { x: 0.5, y: 8, z: 2.5, w: 3, h: 3.5, d: 3, rx: 0.8, rz: -0.1, material: m },
    { x: 2.5, y: 7.5, z: 1.5, w: 3, h: 3, d: 3, rx: 0.5, rz: -0.6, material: m },
    { x: 0, y: 8.5, z: -1, w: 5, h: 3, d: 5, rx: -0.4, material: m },
    { x: -3.2, y: 6, z: -1, w: 2, h: 4, d: 4, rz: 0.5, material: m },
    { x: 3.2, y: 6, z: -1, w: 2, h: 4, d: 4, rz: -0.5, material: m },
  ],
  hairColor: 0x14151c, accent: CE, emit: 0.3, cape: null,
  props(rig, K) {
    const steel = K.mat(0xdfe6f0, { metalness: 0.9, roughness: 0.2, emissive: 0.15, emissiveColor: CE });
    const grip = K.mat(0x1a1a22, { roughness: 0.8 }), guard = K.mat(0x8a7a4a, { metalness: 0.7, roughness: 0.4 });
    const sword = new THREE.Group();
    K.box(sword, 1, 4, 1, grip, 0, -1, 0);
    K.box(sword, 3, 0.6, 3, guard, 0, -3.2, 0);
    K.box(sword, 0.5, 15, 1.2, steel, 0, -11, 0);
    K.box(sword, 0.4, 2, 0.8, steel, 0, -19, 0.2, 0.3);
    sword.rotation.x = Math.PI / 2; sword.position.z = 2 * K.PX;
    rig.handR.add(sword); rig.extras.weapon = sword;
    // sheath slung across the back
    K.box(rig.torso, 1.6, 16, 1.6, K.mat(0x22222a, { roughness: 0.6 }), 0, 6, -3, 0, 0, 0.7);
    // Rika's ring on a chain
    K.box(rig.torso, 1, 1, 0.4, K.mat(0xe8e0ff, { metalness: 1, roughness: 0.2, emissive: 0.6, emissiveColor: RIKA }), 0, 9, 2.2);
  },
});

registerDomainEnv('authentic_mutual_love', {
  skyTop: 0x05030a, skyHorizon: 0x4a2a5a, fog: 0x140a1a, fogDensity: 0.014, hemiSky: 0xd8b0ff, hemiGround: 0x100818, hemiI: 1.1, sun: 0xffd8f0, sunI: 0.8,
  grade: { tint: [1.04, 0.96, 1.1], lift: [0.01, 0.0, 0.02], sat: 1.05, contrast: 1.15, vignette: 0.5 }, floor: B.marble,
});

export const YUTA_SKILLS = [
  { id: 'katana', name: 'Katana Mastery', desc: '+8% melee damage per rank.', max: 3 },
  { id: 'cslash', name: 'Cursed Slash', desc: 'Cursed Slash is bigger and hits harder.', max: 3 },
  { id: 'speech', name: 'Cursed Speech', desc: '"Don\'t move" holds curses longer and reaches further.', max: 3 },
  { id: 'blast_away', name: '"Blast Away"', desc: 'Copy follows up with a second command that blows curses away.', max: 1, req: 'speech' },
  { id: 'rika', name: 'Rika\'s Love', desc: 'Rika stays longer and smashes harder.', max: 3 },
  { id: 'pure_love', name: 'Pure Love', desc: 'Wider, stronger Pure Love beam.', max: 2, req: 'rika' },
];

// Freeze a curse in place (bosses only slow down).
function hold(e, t) {
  if (e.dead) return;
  if (e.isBoss) { e.slowT = Math.max(e.slowT ?? 0, t); return; }
  e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.1;
  e.sealT = Math.max(e.sealT ?? 0, t);
}

class YutaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const cut = { range: 2.9, arc: 1.25, trail: CE, sparkColor: 0xd8f0ff };
    this.combo = [
      { ...cut, style: 'swingR', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 13, lunge: 7, knock: 3, stop: 0.045, shake: 0.15 },
      { ...cut, style: 'swingL', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 13, lunge: 7, knock: 3, stop: 0.045, shake: 0.15 },
      { ...cut, style: 'swingR', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 15, lunge: 7, knock: 4, stop: 0.05, shake: 0.18 },
      { ...cut, style: 'spin', dur: 0.42, windup: 0.25, strike: 0.55, dmg: 18, range: 3.2, arc: Math.PI, lunge: 3, knock: 7, stop: 0.07, shake: 0.26, trail: RIKA },
      { ...cut, style: 'slam', dur: 0.55, windup: 0.42, strike: 0.6, dmg: 30, range: 3.4, arc: Math.PI, lunge: 4, knock: 11, stop: 0.1, shake: 0.45, ring: true, ringColor: RIKA, stagger: 0.6, trail: RIKA },
    ];
    this.p.stats.meleeMult += r('katana') * 0.08;
    this.slots = {
      ranged: this.ability({ name: 'Cursed Slash', icon: '🗡️', cd: 0.9, ce: 0, use: () => this.slash() }),
      t1: this.ability({ name: 'Copy: Cursed Speech', icon: '🗣️', cd: 8, ce: 14, use: () => this.speech() }),
      t2: this.ability({ name: 'Rika', icon: '💍', cd: 18, ce: 22, use: () => this.manifest() }),
      t3: this.ability({ name: 'Pure Love', icon: '💗', cd: 20, ce: 45, use: () => this.pureLove() }),
    };
    // Authentic Mutual Love: an ashen field of countless katanas stuck in the
    // ground, each one holding a technique Yuta has copied. The sure-hit lands
    // through the katanas: every beat Yuta draws a blade and its copied
    // technique strikes every curse inside, with Rika fully manifested.
    this.domain = {
      name: 'Authentic Mutual Love', icon: '⚔️', key: 'authentic_mutual_love', type: 6, color: RIKA, sound: 'void', flash: 0xffd8ff,
      look: { floor: 0x3a3640, seam: 0x8a6ab8, sparkle: 0xe0d0ff, skyTop: 0x06040c, skyHorizon: 0x5a3a6a, stars: 0.5, band: 0xffc8ff },
      duration: 9, radius: 24,
      onStart: (g, d) => { this.swordField(g, d); if (!this.rika) this.manifest(true); else this.rika.life = Math.max(this.rika.life, 10); },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0.3) - dt;
        if (d.tick > 0) return;
        d.tick = 0.9;
        const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
        // a different copied technique each beat, drawn from a katana, all of them sure hits
        const pick = d.beat = ((d.beat ?? -1) + 1) % 4;
        if (!list.length && pick !== 3) return;
        this.drawSword(g, list[0]);
        if (pick === 0) { g.toast?.('Copy: Cursed Speech'); this.speech(list); }
        else if (pick === 1) { g.toast?.('Rika!'); for (const e of list.slice(0, 6)) this.rikaSmash(e.pos.clone(), 0.8); }
        else if (pick === 2) {
          g.toast?.('Katana: Cursed Energy Cut');
          for (const e of list) { const at = e.pos.clone().setY(e.pos.y + e.height * 0.55); g.fx.slashX(at, 2.4, CE); g.combat.damageEnemy(e, 28, this.p, { stagger: 0.4, unblockable: true, ceGain: 0 }); }
          g.audio?.energy('slash');
        } else {
          // Yuta can output Reverse Cursed Technique — he heals himself through the blade
          g.toast?.('Reverse Cursed Technique');
          this.p.heal(this.p.maxHp * 0.15); g.fx.heal?.(this.p.pos, 0x9affd8);
        }
      },
      onEnd: (g) => this.clearSwords(),
    };
    this.beamMats = [beamMaterial(LOVE), beamMaterial(0xffffff, true)];
  }
  dispose() { super.dispose(); if (this.rika) { this.game.scene.remove(this.rika.grp); this.game.lights.remove(this.rika.light); } this.clearSwords(); this.rika = null; }
  // -------------------------------------------------------------- RMB
  slash() {
    const g = this.game, p = this.p, rk = this.rank('cslash');
    p.action = { type: 'attack', step: { style: 'swingR', strike: 0.4, windup: 0.25 }, style: 'swingR', dur: 0.32, elapsed: 0, t: 0, windup: 0.25, strike: 0.4, struck: true, moveScale: 0.4 };
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const dmg = 15 + rk * 6;
    g.projectiles.fire({ pos: this.handPos(), vel: p.aimDir.clone().multiplyScalar(26), team: 'player', shape: 'slash', color: CE, emissive: 4, life: 0.55, radius: 0.9 + rk * 0.2, scale: 1 + rk * 0.25, pierce: true, light: 3,
      homing: target ? 10 : 0, target,
      trail: (q) => g.particles.burst(q.pos, { count: 2, color: Math.random() < 0.3 ? RIKA : CE, speed: 1, life: 0.25, size: 0.3, sizeEnd: 0.05 }),
      onHit: (e, q) => { g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setLength(3), stagger: 0.3 }); g.fx.hitSpark(q.pos, q.vel.clone().normalize(), { color: CE }); } });
    g.fx.slashArc(p.pos, p.facing, CE, 2.4, 0.5, 0.18);
    g.audio?.energy('slash');
  }
  // -------------------------------------------------------------- Copy: Cursed Speech
  speech(forced = null) {
    const g = this.game, p = this.p, rk = this.rank('speech');
    const R = 8 + rk * 1.5, dur = 1.6 + rk * 0.5;
    const list = forced ?? g.enemies.filter((e) => !e.dead && e.pos.distanceTo(p.pos) < R);
    if (!list.length) { if (!forced) { g.toast?.('No curses in earshot'); g.audio?.ui('back'); } return false; }
    if (!forced) this.cast(0.5, true);
    g.toast?.('「Don\'t move.」');
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.4), 0.8, 0.5);
    for (let i = 0; i < 3; i++) setTimeout(() => g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 1.4, p.pos.z), { color: 0xe8e0ff, r0: 0.5, r1: R, dur: 0.5, thick: 0.08 }), i * 90);
    g.audio?.tone({ freq: 160, to: 90, dur: 0.6, gain: 0.3, type: 'sawtooth', filter: 900, rev: 0.4 });
    g.audio?.noise({ dur: 0.5, gain: 0.3, type: 'bandpass', freq: 300, sweep: 1200, q: 2, rev: 0.3 });
    for (const e of list) {
      hold(e, dur);
      g.combat.damageEnemy(e, 8, p, { stagger: 0, ceGain: 1, unblockable: true, color: '#e8e0ff' });
      g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height), { count: 8, color: 0xe8e0ff, speed: 2, life: 0.6, size: 0.12, shape: 1 });
    }
    g.shake(0.2);
    if (this.rank('blast_away')) setTimeout(() => {
      g.toast?.('「Blast away.」');
      for (const e of list) {
        if (e.dead) continue;
        const k = tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(14);
        if (!e.isBoss) { e.sealT = 0; e.vel.y = Math.max(e.vel.y, 8); }
        g.combat.damageEnemy(e, 26, p, { knock: k, stagger: 0.6, unblockable: true });
      }
      g.fx.shockwave(p.pos, 0xe8e0ff, R); g.fx.screenWave(p.pos, 1, 0.4); g.shake(0.4); g.audio?.impact(1.6);
    }, dur * 1000 * 0.6);
  }
  // -------------------------------------------------------------- Rika
  buildRika() {
    const grp = new THREE.Group();
    const M = (c, e = 0) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.7, emissive: e ? c : 0x000000, emissiveIntensity: e });
    const body = M(0xe8e4f0), dark = M(0x1a1420), eye = M(0xffffff, 3), mouth = M(0x300818, 0.4);
    const b = (par, w, h, d, x, y, z, m) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, y, z); mm.castShadow = true; par.add(mm); return mm; };
    b(grp, 1.6, 1.8, 1.1, 0, 1.6, 0, body);                         // chest
    b(grp, 1.1, 1.3, 0.9, 0, 0.5, -0.1, dark);                      // trailing body
    const head = new THREE.Group(); head.position.set(0, 2.9, 0.2); grp.add(head);
    b(head, 1.2, 1.1, 1.1, 0, 0, 0, body); b(head, 0.9, 0.35, 0.1, 0, -0.25, 0.56, mouth);
    for (const x of [-0.28, 0.28]) b(head, 0.18, 0.18, 0.05, x, 0.18, 0.57, eye);
    for (let i = 0; i < 5; i++) b(head, 0.4, 0.9, 0.3, -0.6 + i * 0.3, 0.6, -0.3, dark); // wild hair
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 1.0, 2.2, 0); grp.add(sh);
      b(sh, 0.55, 1.6, 0.55, 0, -0.8, 0, body);
      const fore = new THREE.Group(); fore.position.y = -1.6; sh.add(fore);
      b(fore, 0.5, 1.4, 0.5, 0, -0.7, 0, body);
      b(fore, 0.9, 0.7, 0.8, 0, -1.5, 0.1, body);                   // fist
      for (let f = 0; f < 3; f++) b(fore, 0.15, 0.45, 0.15, -0.25 + f * 0.25, -2, 0.35, dark); // claws
      arms.push(sh);
    }
    grp.userData = { head, arms };
    return grp;
  }
  manifest(free = false) {
    const g = this.game, p = this.p, rk = this.rank('rika');
    const life = (free ? 9 : 8 + rk * 2);
    if (this.rika) { this.rika.life = Math.max(this.rika.life, life); return; }
    if (!free) this.cast(0.6, true);
    const grp = this.buildRika(); grp.scale.setScalar(0.01); grp.position.copy(p.pos); g.scene.add(grp);
    const light = g.lights.attach(grp, RIKA, 5, 9, { offsetY: 2, priority: 3 });
    const R = this.rika = { grp, light, life, t: 0, cd: 0.6, swing: 0, side: 0 };
    g.toast?.('Rika!'); g.audio?.energy('summon'); g.audio?.tone({ freq: 70, to: 40, dur: 1.2, gain: 0.4, type: 'sawtooth', filter: 400, rev: 0.6 });
    g.fx.summonCircle(p.pos, RIKA); g.fx.flash(0x200010, 0.3, 0.2); g.shake(0.3);
    g.addUpdater((dt) => {
      R.t += dt; R.life -= dt; R.cd -= dt; R.swing = Math.max(0, R.swing - dt * 2.5);
      const back = tmp.set(-Math.sin(p.facing), 0, -Math.cos(p.facing));
      grp.position.lerp(tmp2.copy(p.pos).addScaledVector(back, 1.6).setY(p.pos.y + 0.6 + Math.sin(R.t * 2) * 0.15), Math.min(1, dt * 8));
      grp.rotation.y = p.facing;
      grp.scale.setScalar(Math.min(1, R.t * 3) * Math.min(1, Math.max(0, R.life) * 3) * (1.15 + rk * 0.05));
      const [aL, aR] = grp.userData.arms;
      aL.rotation.x = -0.3 - (R.side === 0 ? R.swing * 2.6 : 0) + Math.sin(R.t * 3) * 0.1;
      aR.rotation.x = -0.3 - (R.side === 1 ? R.swing * 2.6 : 0) + Math.cos(R.t * 3) * 0.1;
      if (Math.random() < 0.4) g.particles.glow.emit(grp.position.x + (Math.random() - 0.5) * 1.6, grp.position.y + Math.random() * 3, grp.position.z + (Math.random() - 0.5) * 1.6, 0, 0.8, 0, 0.7, 1.4, 0.6, 1.8, 0.18, -0.4, 1.5, 0.2, 0);
      if (R.cd <= 0) {
        const e = g.nearestEnemy(p.pos, 7.5);
        if (e) { R.cd = 1.15 - rk * 0.1; R.swing = 1; R.side ^= 1; setTimeout(() => !e.dead && this.rikaSmash(e.pos.clone(), 1), 140); }
      }
      if (R.life <= 0) { g.scene.remove(grp); g.lights.remove(light); g.fx.blinkPuff(grp.position, RIKA); this.rika = null; return false; }
      return this.rika === R;
    });
  }
  rikaSmash(at, mult = 1) {
    const g = this.game, rk = this.rank('rika');
    const R = 2.6 + rk * 0.3;
    g.combat.aoe(at, R, (30 + rk * 10) * mult, this.p, { knock: 9, stagger: 0.7, unblockable: true });
    g.fx.shockwave(at, RIKA, R + 1); g.fx.hitSpark(at.clone().setY(at.y + 0.8), null, { color: RIKA, big: true });
    g.fx.debris(at.clone().setY(at.y + 0.3), 0x6a5a6a, 4);
    g.shake(0.35); g.hitStop(0.05); g.audio?.impact(1.8);
  }
  // -------------------------------------------------------------- Pure Love
  swordField(g, d) {
    this.clearSwords();
    const grp = new THREE.Group();
    const steel = new THREE.MeshStandardNodeMaterial({ color: 0xd8e0ec, metalness: 0.9, roughness: 0.25, emissive: 0x6a4a9a, emissiveIntensity: 0.4 });
    const lit = new THREE.MeshStandardNodeMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.2, emissive: RIKA, emissiveIntensity: 4 });
    const hilt = new THREE.MeshStandardNodeMaterial({ color: 0x1a1a22, roughness: 0.8 });
    const wrap = new THREE.MeshStandardNodeMaterial({ color: 0xe8e4f0, roughness: 0.7 });
    const tsuba = new THREE.MeshStandardNodeMaterial({ color: 0x8a7a4a, metalness: 0.7, roughness: 0.4 });
    const G = { blade: new THREE.BoxGeometry(0.07, 1.8, 0.18), tip: new THREE.BoxGeometry(0.06, 0.3, 0.12), guard: new THREE.BoxGeometry(0.34, 0.06, 0.34), grip: new THREE.BoxGeometry(0.09, 0.55, 0.09), band: new THREE.BoxGeometry(0.1, 0.06, 0.1) };
    const list = [];
    for (let i = 0; i < 72; i++) {
      const a = Math.random() * Math.PI * 2, r0 = 2.5 + Math.sqrt(Math.random()) * (d.radius - 3.5);
      const s = new THREE.Group();
      const blade = new THREE.Mesh(G.blade, steel); blade.position.y = 0.5;
      const tip = new THREE.Mesh(G.tip, steel); tip.position.set(0, -0.5, 0.02); tip.rotation.x = 0.3;
      const guard = new THREE.Mesh(G.guard, tsuba); guard.position.y = 1.42;
      const grip = new THREE.Mesh(G.grip, hilt); grip.position.y = 1.72;
      s.add(blade, tip, guard, grip);
      for (const y of [1.58, 1.72, 1.86]) { const b = new THREE.Mesh(G.band, wrap); b.position.y = y; s.add(b); }
      const x = d.center.x + Math.cos(a) * r0, z = d.center.z + Math.sin(a) * r0;
      const gy = g.world.groundBelow(x, z, d.center.y + 3);
      s.position.set(x, (isFinite(gy) ? gy : d.center.y) - 0.3, z);
      s.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5);
      grp.add(s); list.push({ s, blade, baseY: s.position.y });
    }
    grp.userData = { G, steel, lit, list };
    grp.position.y = -2; g.scene.add(grp); this.swords = grp;
    let t = 0; g.addUpdater((dt) => { t += dt; grp.position.y = Math.min(0, -2 + t * 4); return t < 0.6 && this.swords === grp; });
  }
  // Yuta draws a katana from the field: it lifts out of the ground glowing
  // and a streak of cursed energy links it to him.
  drawSword(g, near) {
    const grp = this.swords; if (!grp) return;
    const { list, lit, steel } = grp.userData;
    const ref = near ? near.pos : this.p.pos;
    let best = list[0], bd = Infinity;
    for (const it of list) { if (it.busy) continue; const dd = it.s.position.distanceToSquared(ref) + Math.random() * 20; if (dd < bd) { bd = dd; best = it; } }
    if (!best || best.busy) return;
    best.busy = true; best.blade.material = lit;
    const at = best.s.position.clone().setY(best.baseY + 1.5);
    g.particles.burst(at, { count: 16, color: RIKA, speed: 3, up: 1.5, life: 0.5, size: 0.16, shape: 1 });
    const to = this.p.pos.clone().setY(this.p.pos.y + 1.2), dir = to.clone().sub(at);
    g.fx.slashLine(at, dir.clone().normalize(), dir.length(), RIKA, 0.18, 0.3);
    g.lights.flash(at, RIKA, 6, 7, 0.4);
    g.audio?.tone({ freq: 1800, to: 2400, dur: 0.15, gain: 0.05, type: 'triangle', rev: 0.4 });
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      best.s.position.y = best.baseY + Math.sin(Math.min(1, t / 0.7) * Math.PI) * 1.2;
      if (t < 0.7 && this.swords === grp) return true;
      best.s.position.y = best.baseY; best.blade.material = steel; best.busy = false;
      return false;
    });
  }
  clearSwords() {
    if (!this.swords) return;
    this.game.scene.remove(this.swords);
    for (const geo of Object.values(this.swords.userData.G)) geo.dispose();
    this.swords = null;
  }
  pureLove() {
    const g = this.game, p = this.p, rk = this.rank('pure_love');
    const withRika = !!this.rika;
    const W = 1.6 + rk * 0.4 + (withRika ? 0.4 : 0), L = 32, DMG = (130 + rk * 40) * (withRika ? 1.25 : 1);
    p.action = { type: 'cast', both: true, dur: 1.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    p.invulnerable = true; g.fx.dimTarget = 0.5;
    g.toast?.(withRika ? '「I love you, Rika.」' : 'Pure Love');
    g.audio?.charge(1.1, 0.8);
    const light = g.lights.flash(p.pos.clone().setY(p.pos.y + 1.5), LOVE, 10, 12, 1.2, { priority: 5 });
    let t = 0, beam = null; const CH = 1.05;
    g.addUpdater((dt, realDt) => {
      t += realDt;
      const fwd = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const from = p.pos.clone().addScaledVector(fwd, 1).setY(p.pos.y + 1.35);
      if (!beam) {
        p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
        for (let i = 0; i < 5; i++) { const a = Math.random() * Math.PI * 2, r = 2.5; g.particles.glow.emit(from.x + Math.cos(a) * r, from.y + (Math.random() - 0.5) * 2, from.z + Math.sin(a) * r, -Math.cos(a) * 6, 0, -Math.sin(a) * 6, 0.4, 3, 1.4, 2.6, 0.16, 0, 2, 0.2, 1); }
        if (t < CH) return true;
        g.lights.remove(light);
        beam = this.fireBeam(from, fwd.clone(), W, L, DMG);
        return true;
      }
      const bt = t - CH, a = Math.max(0, 1 - bt / 0.9);
      beam.scale.set(W * (0.4 + a * 0.6) * (1 + Math.sin(bt * 50) * 0.06), 1, W * (0.4 + a * 0.6));
      this.beamMats.forEach((m) => { m.userData.alpha.value = a; });
      if (bt > 0.9) { g.scene.remove(beam); g.fx.dimTarget = 0; p.invulnerable = false; p.action = null; return false; }
      return true;
    });
  }
  fireBeam(from, dir, W, L, DMG) {
    const g = this.game, p = this.p;
    const grp = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, L, 20, 1, true), this.beamMats[0]);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, L, 12, 1, true), this.beamMats[1]);
    for (const m of [outer, inner]) { m.rotation.x = Math.PI / 2; m.position.z = L / 2; m.renderOrder = 24; }
    grp.add(outer, inner); grp.position.copy(from); grp.lookAt(from.clone().add(dir));
    g.scene.add(grp);
    this.beamMats.forEach((m) => { m.userData.alpha.value = 1; });
    g.fx.flash(0xffc0f0, 0.8, 0.3); g.fx.screenWave(from, 1.5, 0.7); g.fx.chroma(1.8);
    g.shake(0.9); g.hitStop(0.1); g.slowMo(0.4, 0.4);
    g.audio?.energy('purple'); g.audio?.blackFlash();
    g.lights.flash(from.clone().addScaledVector(dir, 8), LOVE, 26, 24, 0.9, { priority: 8 });
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from); const along = tmp.dot(dir);
      if (along < -1 || along > L) continue;
      const perp = tmp.addScaledVector(dir, -along); perp.y = 0;
      if (perp.length() > W + e.radius + 0.4) continue;
      g.combat.damageEnemy(e, DMG, p, { knock: dir.clone().multiplyScalar(12), stagger: 1, unblockable: true });
      g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + 1), { count: 16, color: LOVE, speed: 8, life: 0.5, size: 0.14, drag: 3, shape: 1 });
    }
    for (let s = 1.5; s < L; s += 1.5) {
      g.particles.burst(tmp.copy(from).addScaledVector(dir, s), { count: 4, color: s % 3 < 1.5 ? LOVE : 0xffffff, speed: 5, life: 0.6, size: 0.3, drag: 2, sizeEnd: 0.1 });
      g.combat.hitBlocks(tmp.copy(from).addScaledVector(dir, s).setY(p.pos.y + 0.5), dir, W, Math.PI, 60, p);
    }
    return grp;
  }
}
registerKit('yuta', YutaKit, YUTA_SKILLS);
