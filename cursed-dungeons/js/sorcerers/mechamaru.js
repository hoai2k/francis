// Kokichi Muta (Ultimate Mechamaru)-style kit — Puppet Manipulation. 21
// abilities on the technique tree; four are equipped (RMB takes a basic one)
// plus F.
//   LMB       armoured puppet combo with a rotary spin.
//   Cannon    Ultra Cannon (start, RMB: palm beam), Rapid Fire, Sweep, Shoulder
//             Missiles, Full Burst
//   Arsenal   Sword Drill (drill-blade charge), Blade Arm, Rocket Punch, Thruster
//             Boost, Jet Slam
//   Bastion   Bastion (barrier dome), Barrier Wall, Self-Repair, Cursed Pulse
//   Puppets   Mini Mechamaru, Puppet Bomb, Absolute Mode (Mechamaru Mode: Absolute
//             — mini puppets deploy and the cannon fires heavier), Puppet Legion
//   Muta      Stored Energy (his Heavenly Restriction), Remote Reserves, Overclock
//   Talismans Alloy Plating, Heavenly Restriction, Overclocked Cannon, Drone Uplink
//   F    Ultimate — Ultra Cannon: Maximum Output. Mechamaru has no Domain
//        Expansion; his trump card is dumping the cursed energy Muta stored
//        up for years (his Heavenly Restriction) into one colossal beam that
//        punches through walls and everything in its path.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { beamMaterial, orbMaterial } from '../gfx/orbs.js';

const CYAN = 0x40e0ff, WHITE = 0xe0f8ff, STEEL = 0x9aa2ae;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);

registerSorcerer('mechamaru', {
  name: 'Mechamaru', technique: 'Puppet Manipulation', rarity: 'uncommon', title: 'Ultimate Mechamaru', color: '#40e0ff', ultimate: 'Ultra Cannon: Maximum Output',
  desc: 'A remote-piloted battle puppet: palm-mounted Ultra Cannon, Sword Drill, a Bastion barrier, Absolute Mode — and Maximum Output, years of stored cursed energy in one beam.',
});

registerLook('mechamaru', {
  paint: { skinTone: 0xa8aeb8, hair: 0x7a828e, top: 0xc8ced6, topTrim: 0x3a404a, buttons: 0x3a404a, collar: 0x7a828e, sleeve: 0x9aa2ae, pants: 0x6a727e, shoes: 0x2a2e36, eye: 0x40e8ff, eyeWhite: 0x40e8ff, brow: 0x5a626e, fringe: 1, hairSide: 2, hairBack: 3 },
  hair: () => [],
  hairColor: STEEL, accent: CYAN, emit: 1, scale: 1.3,
  cape: null,
  paintExtra(S) {
    // visor band wrapping the head, mouth grille, panel lines and chest core
    S.rect(8, 11, 8, 2, 0x40e8ff, 0.02); S.rect(0, 11, 8, 1, 0x2a6a80, 0.02); S.rect(16, 11, 8, 1, 0x2a6a80, 0.02);
    for (let x = 10; x < 14; x++) S.px(x, 14, x % 2 ? 0x2a2e36 : 0x5a626e);
    S.rect(20, 25, 8, 1, 0x5a626e, 0.02); S.rect(32, 25, 8, 1, 0x5a626e, 0.02);
    S.rect(23, 21, 2, 2, 0x60f0ff, 0.02);
    for (const [u, v] of [[40, 16], [32, 48]]) S.rect(u, v + 4 + 9, 16, 3, 0x6a727e, 0.05);   // metal hands
  },
  props(rig, K) {
    const steel = K.mat(STEEL, { metalness: 0.85, roughness: 0.3 }), dark = K.mat(0x2a2e36, { metalness: 0.7, roughness: 0.4 }), glow = K.mat(CYAN, { emissive: 3 });
    K.box(rig.head, 9.4, 1.6, 0.6, glow, 0, 4.6, 4.8);                 // visor
    K.box(rig.head, 1, 4, 1.6, steel, -4.9, 7, -0.5, 0, 0, 0.2);        // head fins
    K.box(rig.head, 1, 4, 1.6, steel, 4.9, 7, -0.5, 0, 0, -0.2);
    K.box(rig.armR, 5.4, 3, 5.4, steel, 0, 1.2, 0);                     // shoulder armour
    K.box(rig.armL, 5.4, 3, 5.4, steel, 0, 1.2, 0);
    K.box(rig.handR, 2.6, 0.6, 2.6, glow, 0, -2.2, 0);                  // palm cannon emitter
    K.box(rig.torso, 6, 6, 2.4, dark, 0, 7.5, -3.2);                    // thruster pack
    K.box(rig.torso, 1.6, 1.4, 1.6, glow, -1.8, 4.2, -3.6);
    K.box(rig.torso, 1.6, 1.4, 1.6, glow, 1.8, 4.2, -3.6);
  },
});

export const MECHAMARU_SKILLS = [
  { id: 'cannon', name: 'Ultra Cannon', icon: '🔆', desc: 'Cannon beams (and Maximum Output) hit harder and reach further.', max: 3, req: 'ab:cannon', branch: 'Cannon', tier: 1 },
  { id: 'overcharge', name: 'Overcharge', icon: '⚡', desc: 'Ultra Cannon recharges faster.', max: 2, req: 'cannon', branch: 'Cannon', tier: 2 },
  { id: 'drill', name: 'Sword Drill', icon: '🌀', desc: 'Longer drilling charge and a harder final thrust.', max: 3, req: 'ab:sword_drill', branch: 'Arsenal', tier: 2 },
  { id: 'bastion', name: 'Bastion', icon: '🛡️', desc: 'Bastion lasts longer; at rank 2 it fires projectiles back.', max: 2, req: 'ab:bastion', branch: 'Bastion', tier: 2 },
  { id: 'drones', name: 'Absolute Mode', icon: '🤖', desc: '+1 drone per rank and longer Absolute Mode.', max: 2, req: 'ab:absolute', branch: 'Puppets', tier: 4 },
  { id: 'alloy', name: 'Puppet Alloy', icon: '🔩', desc: '+4% damage reduction per rank.', max: 3, branch: 'Bastion', tier: 0 },
];

class MechamaruKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 13, range: 2.7, arc: 1.1, lunge: 6, knock: 4, stop: 0.05, shake: 0.16, trail: CYAN, sparkColor: WHITE },
      { style: 'swingL', dur: 0.34, windup: 0.3, strike: 0.52, dmg: 13, range: 2.8, arc: 1.2, lunge: 6, knock: 4, stop: 0.05, shake: 0.16, trail: CYAN, sparkColor: WHITE },
      { style: 'spin', dur: 0.45, windup: 0.25, strike: 0.55, dmg: 18, range: 3.1, arc: Math.PI, lunge: 3, knock: 7, stop: 0.06, shake: 0.24, trail: WHITE },
      { style: 'slam', dur: 0.6, windup: 0.45, strike: 0.62, dmg: 28, range: 3.4, arc: Math.PI, lunge: 3, knock: 11, stop: 0.1, shake: 0.45, ring: true, ringColor: CYAN, stagger: 0.6, trail: CYAN },
    ];
    this.p.stats.armor = (this.p.stats.armor ?? 0) + r('alloy') * 0.04;
    this.cannonMul = 1; this.puppetMul = 1; this.puppetLife = 1;
    this.branches = ['Cannon', 'Arsenal', 'Bastion', 'Puppets', 'Muta'];
    this.library = {
      // ---- Cannon
      cannon: ability({ name: 'Ultra Cannon', icon: '🔆', kind: 'basic', desc: 'A short charge, then a cursed-energy beam from the palm.', cd: 1.8 - r('overcharge') * 0.35, ce: 0, branch: 'Cannon', tier: 0, start: true, legacy: 'ranged', use: () => this.cannon() }),
      rapid_cannon: ability({ name: 'Ultra Cannon: Rapid Fire', icon: '📡', kind: 'basic', desc: 'Three thin beams in quick succession.', cd: 2, ce: 2, branch: 'Cannon', tier: 1, req: 'cannon', use: () => this.rapidCannon() }),
      sweep_beam: ability({ name: 'Ultra Cannon: Sweep', icon: '〰️', kind: 'technique', desc: 'Hold the beam and sweep it across the field in front of you.', cd: 9, ce: 16, branch: 'Cannon', tier: 2, req: 'rapid_cannon', use: () => this.sweepBeam() }),
      missiles: ability({ name: 'Shoulder Missiles', icon: '🚀', kind: 'technique', desc: 'Panels open and six homing cursed missiles arc out at the nearest curses.', cd: 10, ce: 16, branch: 'Cannon', tier: 3, req: 'cannon', use: () => this.missiles() }),
      full_burst: ability({ name: 'Ultra Cannon: Full Burst', icon: '☀️', kind: 'technique', desc: 'Plant your feet and pour out a wide, continuous beam for over a second.', cd: 20, ce: 38, branch: 'Cannon', tier: 4, req: 'sweep_beam', use: () => this.fullBurst() }),
      // ---- Arsenal
      sword_drill: ability({ name: 'Sword Drill', icon: '🌀', kind: 'movement', desc: 'The arm becomes a spinning drill-blade and you rocket forward, grinding through curses.', cd: 7, ce: 12, branch: 'Arsenal', tier: 1, legacy: 't1', use: () => this.swordDrill() }),
      blade_arm: ability({ name: 'Blade Arm', icon: '🗡️', kind: 'basic', desc: 'A blade snaps out of the forearm for one wide slash.', cd: 1.4, ce: 0, branch: 'Arsenal', tier: 1, use: () => this.bladeArm() }),
      rocket_punch: ability({ name: 'Rocket Punch', icon: '🤜', kind: 'basic', desc: 'Fire the fist on its thruster; it hits on the way out and on the way back.', cd: 2.4, ce: 3, branch: 'Arsenal', tier: 2, req: 'blade_arm', use: () => this.rocketPunch() }),
      thruster: ability({ name: 'Thruster Boost', icon: '💨', kind: 'movement', desc: 'Back thrusters fire for a quick boost. Two charges.', cd: 4, ce: 3, branch: 'Arsenal', tier: 2, req: 'sword_drill', maxCharges: 2, chargesLeft: 2, gateTime: 0.3, use: () => this.thruster() }),
      jet_slam: ability({ name: 'Jet Slam', icon: '🛬', kind: 'movement', desc: 'Jet up and slam down on the aim point.', cd: 9, ce: 12, branch: 'Arsenal', tier: 3, req: 'thruster', use: () => this.jetSlam() }),
      // ---- Bastion
      bastion: ability({ name: 'Bastion', icon: '🛡️', kind: 'defence', desc: 'A barrier dome that eats projectiles and blunts damage.', cd: 13, ce: 14, branch: 'Bastion', tier: 1, legacy: 't2', use: () => this.bastion() }),
      bastion_wall: ability({ name: 'Bastion: Barrier Wall', icon: '🧱', kind: 'defence', desc: 'Project a barrier wall in front of you for 6s: it stops curse projectiles and holds curses back.', cd: 14, ce: 12, branch: 'Bastion', tier: 2, req: 'bastion', use: () => this.barrierWall() }),
      self_repair: ability({ name: 'Self-Repair', icon: '🔧', kind: 'heal', desc: 'Muta reroutes power to repairs: heal 25% health over 2.5s.', cd: 28, ce: 22, branch: 'Bastion', tier: 3, req: 'bastion', use: () => this.rctHeal(0.25, 2.5, CYAN) }),
      cursed_pulse: ability({ name: 'Cursed Pulse', icon: '📳', kind: 'technique', desc: 'Charge the core (its reach is marked) and release a pulse that stuns every curse around you.', cd: 14, ce: 18, branch: 'Bastion', tier: 3, req: 'bastion_wall', use: () => this.cursedPulse() }),
      // ---- Puppets
      mini_mecha: ability({ name: 'Mini Mechamaru', icon: '🤖', kind: 'summon', desc: 'Deploy a small auxiliary puppet that flies beside you and shoots curses for 15s.', cd: 18, ce: 14, branch: 'Puppets', tier: 1, use: () => this.miniMecha() }),
      puppet_bomb: ability({ name: 'Puppet Bomb', icon: '💣', kind: 'summon', desc: 'A disposable puppet runs at the nearest curse, flashes and self-destructs.', cd: 9, ce: 12, branch: 'Puppets', tier: 2, req: 'mini_mecha', use: () => this.puppetBomb() }),
      absolute: ability({ name: 'Absolute Mode', icon: '🦾', kind: 'buff', desc: 'Mechamaru Mode: Absolute — mini puppets deploy and fire on curses, and the Ultra Cannon fires a heavier, wider beam.', cd: 28, ce: 40, branch: 'Puppets', tier: 3, legacy: 't3', req: 'mini_mecha', use: () => this.absolute() }),
      puppet_legion: ability({ name: 'Puppet Legion', icon: '🛸', kind: 'summon', desc: 'Every spare puppet Muta has: six drones ring you for 10s firing beams, then dive in a final volley.', cd: 34, ce: 55, branch: 'Puppets', tier: 5, req: 'absolute', use: () => this.puppetLegion() }),
      // ---- Muta
      stored_energy: ability({ name: 'Stored Energy', icon: '🔋', kind: 'buff', desc: 'Tap the cursed energy Muta\'s Heavenly Restriction stored up: for 8s techniques cost half and cannon beams hit 40% harder.', cd: 26, ce: 0, branch: 'Muta', tier: 2, use: () => this.storedEnergy() }),
      reserves: ability({ name: 'Remote Reserves', icon: '🩸', kind: 'buff', desc: 'Push Muta\'s fragile body (15% health) to send 40 Cursed Energy to the puppet.', cd: 20, ce: 0, branch: 'Muta', tier: 3, req: 'stored_energy', use: () => this.reserves() }),
      overclock: ability({ name: 'Overclock', icon: '⏩', kind: 'buff', desc: 'For 6s every cooldown recovers twice as fast.', cd: 30, ce: 20, branch: 'Muta', tier: 4, req: 'reserves', use: () => this.overclock() }),
    };
    this.passives = {
      plating: passive({ name: 'Alloy Plating', icon: '🔩', desc: '+10% damage reduction.', branch: 'Bastion', tier: 2, req: 'bastion', apply: (pl) => { pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.1); } }),
      restriction: passive({ name: 'Heavenly Restriction', icon: '📿', desc: '+30 max Cursed Energy and +10% Cursed Energy gain (paid for by Muta\'s body).', branch: 'Muta', tier: 2, req: 'stored_energy', apply: (pl) => { pl.maxCe += 30; pl.stats.ceGain += 0.1; } }),
      overclocked: passive({ name: 'Overclocked Cannon', icon: '🔆', desc: 'Every cannon beam deals 25% more damage.', branch: 'Cannon', tier: 2, req: 'rapid_cannon', apply: (pl, k) => { k.cannonMul *= 1.25; } }),
      uplink: passive({ name: 'Drone Uplink', icon: '📶', desc: 'Puppets and drones hit 30% harder and last 50% longer.', branch: 'Puppets', tier: 2, req: 'mini_mecha', apply: (pl, k) => { k.puppetMul *= 1.3; k.puppetLife = 1.5; } }),
    };
    this.ultimate = { name: 'Ultra Cannon: Maximum Output', icon: '🔆', use: () => this.maximumOutput() };
    this.beamMats = [beamMaterial(CYAN), beamMaterial(WHITE, true)];
    this.drones = []; this.absT = 0; this.bastionT = 0;
    this.dome = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 3), orbMaterial(CYAN, { power: 2.2, intensity: 1.6 }));
    this.dome.visible = false; this.dome.renderOrder = 22;
    this.own(this.dome);
  }
  dispose() {
    super.dispose();
    for (const d of this.drones) this.game.scene.remove(d.mesh);
    if (this.drill) this.p.rig.handR.remove(this.drill);
    this.drones = []; this.maxOut = null; this.game.fx.dimTarget = 0;
    for (const o of this.temps ?? []) this.game.scene.remove(o); this.temps?.clear(); this.mini = null;
  }
  // ------------------------------------------------------------- Ultra Cannon
  beam(from, dir, L, W, dmg, { pierceWalls = false, knock = 6 } = {}) {
    const g = this.game, p = this.p;
    dmg *= this.cannonMul;
    if (!pierceWalls) for (let s = 0.6; s < L; s += 0.4) if (g.world.solidAt(from.x + dir.x * s, from.y + dir.y * s, from.z + dir.z * s)) { L = s; break; }
    const grp = new THREE.Group();
    const outer = new THREE.Mesh(UNIT_CYL, this.beamMats[0]), inner = new THREE.Mesh(UNIT_CYL, this.beamMats[1]);
    outer.scale.set(W, L, W); inner.scale.set(W * 0.45, L, W * 0.45);
    for (const m of [outer, inner]) { m.rotation.x = Math.PI / 2; m.position.z = L / 2; m.renderOrder = 24; }
    grp.add(outer, inner);
    grp.position.copy(from); grp.lookAt(tmp.copy(from).add(dir));
    g.scene.add(grp);
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from); tmp.y += e.height * 0.5;
      const along = tmp.dot(dir);
      if (along < -0.5 || along > L) continue;
      if (tmp.addScaledVector(dir, -along).length() > W + e.radius + 0.3) continue;
      g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().setY(0).setLength(knock), stagger: 0.5 });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.5), dir, { color: CYAN });
    }
    const end = from.clone().addScaledVector(dir, L);
    g.combat.hitBlocks(end, dir, W + 0.6, Math.PI, dmg * 2, p);
    g.particles.burst(end, { count: 14, color: CYAN, speed: 6, life: 0.3, size: 0.12, drag: 3, shape: 1, intensity: 3 });
    g.lights.flash(from.clone().addScaledVector(dir, Math.min(L, 6)), CYAN, 10 * W, 10, 0.3);
    let t = 0; const dur = 0.3 + W * 0.15;
    this.beamMats.forEach((m) => { m.userData.alpha.value = 1; });
    g.addUpdater((dt) => {
      t += dt;
      const a = Math.max(0, 1 - t / dur), wob = 1 + Math.sin(t * 70) * 0.08;
      outer.scale.set(W * wob * (0.5 + a * 0.5), L, W * wob * (0.5 + a * 0.5));
      this.beamMats.forEach((m) => { m.userData.alpha.value = a; });
      if (t < dur) return true;
      g.scene.remove(grp); return false;
    });
    return L;
  }
  cannon() {
    const g = this.game, p = this.p, rk = this.rank('cannon');
    const max = this.absT > 0;
    const charge = max ? 0.32 : 0.22;
    p.action = { type: 'cast', dur: charge + 0.15, elapsed: 0, t: 0, moveScale: max ? 0.1 : 0.3, faceAim: true, lock: true };
    g.audio?.charge(charge, max ? 0.7 : 1.4);

    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      const h = this.handPos();
      g.particles.burst(h, { count: max ? 3 : 1, color: CYAN, speed: -3, life: 0.25, size: 0.15, jitter: max ? 1.6 : 0.8, shape: 1 });
      if (t < charge) return true;
      const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.aimPoint, 30) : null;
      const dir = target ? tmp2.copy(target.pos).setY(target.pos.y + target.height * 0.5).sub(h).normalize().clone() : p.aimDir.clone();
      if (max) {   // Absolute Mode: a heavier, wider cannon
        this.beam(h, dir, 17 + rk * 2, 0.75, (16 + rk * 6) * 2.2, { knock: 9 });
        g.fx.flash(0xc0f8ff, 0.2, 0.1); g.shake(0.3); g.hitStop(0.04);
        g.audio?.tone({ freq: 900, to: 120, dur: 0.35, gain: 0.16, type: 'sawtooth', filter: 3000 });
        g.audio?.noise({ dur: 0.35, gain: 0.35, type: 'bandpass', freq: 2000, sweep: 400, q: 2 });
      } else {
        this.beam(h, dir, 13 + rk * 2, 0.4, 16 + rk * 6);
        g.shake(0.12);
        g.audio?.tone({ freq: 1200, to: 200, dur: 0.25, gain: 0.12, type: 'sawtooth', filter: 3500 });
        g.audio?.noise({ dur: 0.25, gain: 0.25, type: 'bandpass', freq: 2500, sweep: 600, q: 2 });
      }
      return false;
    });
  }
  // ------------------------------------------------------------- Sword Drill
  swordDrill() {
    const g = this.game, p = this.p, rk = this.rank('drill');
    const dir = p.aimDir.clone().setY(0).normalize();
    const dur = 0.45 + rk * 0.08, speed = 18;
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'cast', dur: dur + 0.1, elapsed: 0, t: 0, lock: true, cancelable: false, faceAim: false, root: dir.clone().multiplyScalar(speed) };
    p.vel.x = dir.x * speed; p.vel.z = dir.z * speed;
    p.iframes = Math.max(p.iframes, dur);
    // the forearm reforms into a drill-blade
    const drill = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.3, 8).rotateX(Math.PI).translate(0, -0.65, 0),
      new THREE.MeshStandardNodeMaterial({ color: 0xc8d0da, metalness: 0.9, roughness: 0.25, emissive: CYAN, emissiveIntensity: 0.4 }));
    drill.position.y = -0.1; p.rig.handR.add(drill); this.drill = drill;
    g.audio?.whoosh(1.3);
    const caught = new Set();
    let t = 0, tick = 0;
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      drill.rotation.y += dt * 40;
      const tip = this.handPos();
      g.particles.burst(tip, { count: 3, color: Math.random() < 0.5 ? CYAN : 0xffe0a0, speed: 6, life: 0.2, size: 0.08, shape: 1, intensity: 3 });
      if (tick <= 0) {
        tick = 0.08;
        for (const e of g.combat.query(p.pos, dir, 2.2, 0.8)) {
          caught.add(e);
          g.combat.damageEnemy(e, 6 + rk * 2, p, { knock: dir.clone().multiplyScalar(speed * 0.9), stagger: 0.3, ceGain: 0.6 });
        }
        g.audio?.tone({ freq: 300 + Math.random() * 80, dur: 0.06, gain: 0.05, type: 'square', filter: 2000 });
      }
      if (t < dur) return true;
      p.action = null;
      p.rig.handR.remove(drill); this.drill = null;
      // final thrust
      for (const e of caught) {
        if (e.dead) continue;
        g.combat.damageEnemy(e, 26 + rk * 9, p, { knock: dir.clone().multiplyScalar(12), stagger: 0.8 });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
      }
      const c = p.pos.clone().addScaledVector(dir, 1.5);
      g.fx.explosion(c, CYAN, 1.8);
      g.combat.hitBlocks(c, dir, 2, 1, 60, p);
      g.shake(0.35); g.hitStop(0.06); g.audio?.impact(1.6);
      return false;
    });
  }
  // ------------------------------------------------------------- Bastion
  bastion() {
    const g = this.game, p = this.p;
    this.bastionDur = 4 + this.rank('bastion') * 1.2;
    this.bastionT = this.bastionDur;
    p.action = { type: 'sign', dur: 0.35, elapsed: 0, t: 0, moveScale: 0.3 };
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: CYAN, r0: 0.4, r1: 2.6, dur: 0.35, thick: 0.15 });
    g.fx.flash(0x80e8ff, 0.12, 0.12);
    g.audio?.energy('infinity');
  }
  incoming(amount) {
    if (this.bastionT <= 0) return amount;
    this.dome.material.userData.inten.value = 4;
    return amount * 0.25;
  }
  // ------------------------------------------------------------- Absolute Mode
  absolute() {
    const g = this.game, p = this.p, rk = this.rank('drones');
    for (const d of this.drones) g.scene.remove(d.mesh);
    this.drones = [];
    this.absT = (12 + rk * 3) * this.puppetLife;
    const n = 3 + rk;
    for (let i = 0; i < n; i++) {
      const m = this.makeDrone();
      m.position.copy(p.pos).setY(p.pos.y + 1.2);
      g.scene.add(m);
      this.drones.push({ mesh: m, a: (i / n) * Math.PI * 2, cd: 0.3 + i * 0.15 });
    }
    p.action = { type: 'raise', dur: 0.5, elapsed: 0, t: 0, moveScale: 0.2 };
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1), { count: 30, color: CYAN, speed: 8, life: 0.4, size: 0.12, shape: 1, drag: 3 });
    g.fx.shockwave(p.pos, CYAN, 4);
    g.toast?.('Absolute Mode');
    g.audio?.energy('summon'); g.audio?.charge(0.5, 1.5);
  }
  tick(dt) {
    const g = this.game, p = this.p;
    // Bastion dome
    if (this.bastionT > 0) {
      this.bastionT -= dt;
      const D = this.dome; D.visible = true;
      D.position.set(p.pos.x, p.pos.y + 0.9, p.pos.z);
      const u = D.material.userData;
      u.alpha.value = Math.min(1, this.bastionT * 3, (this.bastionDur - this.bastionT) * 6 + 0.2);
      u.inten.value = Math.max(1.6, u.inten.value - dt * 8);
      for (const pr of [...g.projectiles.list]) {
        if (pr.team !== 'enemy' || pr.pos.distanceTo(D.position) > 2.4) continue;
        g.fx.hitSpark(pr.pos, null, { color: CYAN }); u.inten.value = 4;
        if (this.rank('bastion') >= 2) { pr.team = 'player'; pr.vel.multiplyScalar(-1.3); const dmg = pr.dmg ?? 10; pr.onHit = (e) => g.combat.damageEnemy(e, dmg * 2, p, { knock: pr.vel.clone().setLength(5) }); pr.hit.clear(); }
        else g.projectiles.kill(pr, 'blocked');
      }
      for (const e of g.enemies) {
        if (e.dead || e.isDummy) continue;
        tmp.subVectors(e.pos, p.pos).setY(0); const dd = tmp.length();
        if (dd < 2.3 + e.radius) e.knock.addScaledVector(tmp.normalize(), (2.3 + e.radius - dd) * 60 * dt);
      }
      if (this.bastionT <= 0) D.visible = false;
    }
    // Absolute Mode drones
    if (this.absT > 0) {
      this.absT -= dt;
      for (const d of this.drones) {
        d.a += dt * 1.8; d.cd -= dt;
        const m = d.mesh;
        tmp.set(p.pos.x + Math.cos(d.a) * 2.2, p.pos.y + 2.5 + Math.sin(d.a * 3) * 0.15, p.pos.z + Math.sin(d.a) * 2.2);
        m.position.lerp(tmp, Math.min(1, dt * 10));
        const e = g.domainSys?.sureHit(p) ? g.nearestEnemy(m.position, 30) : g.nearestEnemy(m.position, 12);
        if (e) m.lookAt(tmp2.copy(e.pos).setY(e.pos.y + 1)); else m.rotation.y = -d.a;
        if (e && d.cd <= 0) {
          d.cd = 0.85;
          const to = tmp2.copy(e.pos).setY(e.pos.y + e.height * 0.5);
          const dir = to.clone().sub(m.position); const L = dir.length(); dir.normalize();
          g.fx.slashLine(m.position.clone(), dir, L, CYAN, 0.12, 0.12);
          g.combat.damageEnemy(e, (7 + this.rank('drones') * 2) * this.puppetMul, p, { stagger: 0.15, ceGain: 0.5 });
          g.particles.burst(to, { count: 5, color: CYAN, speed: 4, life: 0.2, size: 0.08, shape: 1 });
          g.audio?.tone({ freq: 1800, to: 900, dur: 0.06, gain: 0.03, type: 'square', filter: 5000 });
        }
      }
      if (this.absT <= 0) { for (const d of this.drones) { g.fx.poof(d.mesh.position.clone().setY(d.mesh.position.y - 0.8)); g.scene.remove(d.mesh); } this.drones = []; }
    }
    // thruster glow
    if (Math.random() < 0.3) {
      const back = tmp.set(-Math.sin(p.facing) * 0.35, 0, -Math.cos(p.facing) * 0.35);
      g.particles.glow.spawn({ x: p.pos.x + back.x, y: p.pos.y + 1.2, z: p.pos.z + back.z, vx: back.x, vy: -1.2, vz: back.z, life: 0.3, r: 0.4, g: 1.6, b: 2.2, size: 0.1, drag: 2, sizeEnd: 0.1 });
    }
  }
  // ------------------------------------------------------------- Ultimate
  // Ultra Cannon: Maximum Output — every drop of the cursed energy Muta
  // stored up over the years, fired in one colossal beam.
  maximumOutput() {
    const g = this.game, p = this.p, rk = this.rank('cannon');
    if (this.maxOut) return false;
    const M = this.maxOut = {};
    const charge = 1.3;
    p.action = { type: 'cast', both: true, dur: charge + 1.2, elapsed: 0, t: 0, moveScale: 0, faceAim: true, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes, charge + 1.2);
    g.toast?.('Ultra Cannon: Maximum Output', 'big');
    g.fx.dimTarget = 0.55; g.slowMo(1.0, 0.4); g.fx.chroma(0.6);
    g.audio?.charge(charge, 0.5); g.audio?.charge(charge, 0.75);
    let t = 0, fired = false, pulse = 0, pulses = 0, dir = null, from = null;
    const L = 40 + rk * 4;
    g.addUpdater((dt) => {
      if (this.maxOut !== M || this.p.kit !== this) { g.fx.dimTarget = 0; return false; }
      t += dt;
      const h = this.handPos();
      if (!fired) {
        const k = Math.min(1, t / charge);
        // stored energy pours into the palm from all around him
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2, rr = 1 + Math.random() * (3 - k * 2);
          g.particles.glow.spawn({ x: h.x + Math.cos(a) * rr, y: h.y + (Math.random() - 0.5) * 2, z: h.z + Math.sin(a) * rr, vx: -Math.cos(a) * rr * 4, vz: -Math.sin(a) * rr * 4, life: 0.25, r: 0.4, g: 1.8, b: 2.4, size: 0.12, shape: 'square' });
        }
        g.particles.burst(h, { count: 1, color: WHITE, speed: 0, life: 0.08, size: 0.4 + k * 1.6, sizeEnd: 0.2, intensity: 4 });
        if (Math.random() < 0.3) g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: CYAN, r0: 3, r1: 0.4, dur: 0.3, thick: 0.1 });
        g.shake(0.05 + k * 0.1);
        if (t < charge) return true;
        fired = true;
        g.fx.dimTarget = 0;
        const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.aimPoint, 40) : null;
        dir = target ? tmp2.copy(target.pos).setY(target.pos.y + target.height * 0.5).sub(h).normalize().clone() : p.aimDir.clone();
        from = h.clone();
        this.beam(from, dir, L, 2.2, 300 + rk * 70, { pierceWalls: true, knock: 18 });
        g.fx.flash(0xe0fcff, 0.85, 0.3); g.fx.screenWave(from, 2, 0.8); g.fx.chroma(2);
        g.shake(1.2); g.hitStop(0.12); g.slowMo(0.6, 0.3);
        g.audio?.energy('purple'); g.audio?.energy('explode');
        // recoil skids the puppet backwards
        p.vel.x -= dir.x * 9; p.vel.z -= dir.z * 9;
        return true;
      }
      // the beam keeps pouring out for a moment
      pulse -= dt;
      if (pulse <= 0 && pulses < 6) {
        pulse = 0.14; pulses++;
        this.beam(from, dir, L, 1.6 - pulses * 0.15, 24 + rk * 6, { pierceWalls: true, knock: 6 });
        g.particles.burst(from, { count: 10, color: CYAN, speed: 8, dir: dir.clone(), spread: 0.4, life: 0.3, size: 0.15, shape: 1, intensity: 3 });
        g.shake(0.3);
        return true;
      }
      if (pulses < 6) return true;
      this.maxOut = null; p.action = null;
      g.fx.poof(p.pos);
      return false;
    });
  }
  // ============================================================== library abilities
  temp(o) { (this.temps || (this.temps = new Set())).add(o); this.game.scene.add(o); return o; }
  untemp(o) { this.temps?.delete(o); this.game.scene.remove(o); }
  warn(c, R, dur, col = CYAN) {
    const g = this.game, y = this.groundAt(c.x, c.z, c.y) + 0.07;
    g.fx.rings.spawn(tmp.set(c.x, y, c.z), { color: col, r0: R, r1: R, dur, thick: 0.1 });
    g.fx.rings.spawn(tmp.set(c.x, y + 0.01, c.z), { color: col, r0: R, r1: 0.3, dur, thick: 0.3 });
  }
  makeDrone(scale = 1) {
    this.droneMats ??= { body: new THREE.MeshStandardNodeMaterial({ color: 0xb8c0ca, metalness: 0.8, roughness: 0.3 }), eye: new THREE.MeshStandardNodeMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 3 }) };
    const { body, eye } = this.droneMats;
    const m = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.34), body); b.castShadow = true;
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), eye); e.position.z = 0.18;
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.1), body), wr = wl.clone(); wl.position.x = -0.3; wr.position.x = 0.3;
    m.add(b, e, wl, wr); m.scale.setScalar(scale);
    return m;
  }
  zap(from, e, dmg) {
    const g = this.game;
    const to = tmp2.copy(e.pos).setY(e.pos.y + e.height * 0.5);
    const dir = to.clone().sub(from); const L = dir.length(); dir.normalize();
    g.fx.slashLine(from.clone(), dir, L, CYAN, 0.14, 0.12);
    this.hit(e, dmg * this.puppetMul, { stagger: 0.15, ceGain: 0.5 });
    g.particles.burst(to, { count: 5, color: CYAN, speed: 4, life: 0.2, size: 0.08, shape: 1 });
    g.audio?.tone({ freq: 1800, to: 900, dur: 0.06, gain: 0.03, type: 'square', filter: 5000 });
  }
  leapTo(to, dur, height, onLand) {
    const g = this.game, p = this.p, from = p.pos.clone();
    p.invulnerable = true;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.9, windup: 0.3 }, style: 'slam', dur: dur + 0.1, elapsed: 0, t: 0, windup: 0.3, strike: 0.9, struck: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    this.during(dur, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * height;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      g.particles.glow.spawn({ x: p.pos.x, y: p.pos.y + 1, z: p.pos.z, vy: -4, life: 0.3, r: 0.4, g: 1.6, b: 2.2, size: 0.2, drag: 1, sizeEnd: 0.05 });
    }, () => { p.invulnerable = false; if (p.action?.lock) p.action = null; if (!this.disposed) onLand?.(p.pos.clone()); });
  }
  // ---- Cannon
  rapidCannon() {
    const g = this.game, p = this.p, rk = this.rank('cannon');
    p.action = { type: 'cast', dur: 0.4, elapsed: 0, t: 0, moveScale: 0.3, faceAim: true };
    for (let i = 0; i < 3; i++) this.after(0.05 + i * 0.1, () => {
      this.beam(this.handPos(), p.aimDir.clone(), 12 + rk * 2, 0.22, 8 + rk * 2, { knock: 2 });
      g.audio?.tone({ freq: 1600, to: 500, dur: 0.1, gain: 0.08, type: 'sawtooth', filter: 4000 });
    });
  }
  sweepBeam() {
    const g = this.game, p = this.p, rk = this.rank('cannon'), base = this.aimAngle(), half = 0.75;
    p.action = { type: 'cast', dur: 0.95, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    g.audio?.charge(0.2, 1.2);
    let tick = 0;
    this.after(0.2, () => this.during(0.65, (t, dt, k) => {
      tick -= dt; if (tick > 0) return;
      tick = 0.06;
      const a = base - half + k * half * 2;
      p.facing = a;
      this.beam(this.handPos(), tmp.set(Math.sin(a), 0, Math.cos(a)).clone(), 14 + rk * 2, 0.4, 7 + rk * 2, { knock: 3 });
      g.audio?.noise({ dur: 0.08, gain: 0.15, type: 'bandpass', freq: 2200, sweep: 300, q: 2 });
    }, () => { if (p.action?.lock) p.action = null; }));
  }
  missiles() {
    const g = this.game, p = this.p, rk = this.rank('cannon');
    this.cast(0.4, true);
    const list = this.byDistance([...this.near(p.pos, 18)], p.pos);
    for (let i = 0; i < 6; i++) this.after(i * 0.07, () => {
      const side = i % 2 ? 1 : -1, f = this.fwd();
      const from = p.pos.clone().add(tmp.set(f.z * side * 0.5, 2.2, -f.x * side * 0.5));
      const target = list.length ? list[i % list.length] : null;
      const vel = f.clone().multiplyScalar(8).add(tmp.set(f.z * side * 5, 9, -f.x * side * 5));
      g.projectiles.fire({ pos: from, vel, team: 'player', shape: 'arrow', color: 0xe0e8f0, emissive: 1.5, scale: 0.35, life: 1.6, radius: 0.4, homing: target ? 6 : 0, target, gravity: target ? 0 : 6,
        trail: (q) => { q.vel.setLength(Math.min(28, q.vel.length() + 0.6)); g.particles.burst(q.pos, { count: 1, color: 0xffa040, speed: 0.4, life: 0.3, size: 0.25, sizeEnd: 0.05, intensity: 3 }); },
        onExpire: (q) => { g.combat.aoe(q.pos, 2, 18 + rk * 5, p, { knock: 5, stagger: 0.4 }); g.fx.explosion(q.pos, 0xffa040, 1.4); } });
      g.audio?.whoosh(0.7);
    });
  }
  fullBurst() {
    const g = this.game, p = this.p, rk = this.rank('cannon');
    p.action = { type: 'cast', both: true, dur: 1.75, elapsed: 0, t: 0, moveScale: 0, faceAim: true, lock: true, hold: true, cancelable: false };
    this.buff('full_burst_brace', 1.75, { incoming: (a) => a * 0.6 });
    g.audio?.charge(0.35, 0.8);
    let tick = 0;
    this.after(0.35, () => this.during(1.3, (t, dt) => {
      tick -= dt; if (tick > 0) return;
      tick = 0.12;
      this.beam(this.handPos(), p.aimDir.clone(), 18 + rk * 2, 0.9, 14 + rk * 4, { knock: 4 });
      g.shake(0.15);
      g.audio?.noise({ dur: 0.14, gain: 0.3, type: 'bandpass', freq: 1800, sweep: 300, q: 2 });
    }, () => { if (p.action?.lock) p.action = null; g.fx.poof(p.pos); }));
  }
  // ---- Arsenal
  bladeArm() {
    const g = this.game, p = this.p, f = this.fwd();
    this.pose('swingR', 0.3);
    this.after(0.1, () => {
      for (const e of this.foes(p.pos, 3.3, f, 0.9)) { this.hit(e, 18 + this.rank('drill') * 4, { melee: true, stagger: 0.4, knock: f.clone().multiplyScalar(4) }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), f, { color: CYAN }); }
      g.fx.slashArc(p.pos, p.facing, WHITE, 3.3, 0.4, 0.18); g.fx.slashArc(p.pos, p.facing, CYAN, 3, 0.4, 0.22);
      g.audio?.energy('slash');
    });
  }
  rocketPunch() {
    const g = this.game, p = this.p, f = this.fwd();
    this.cast(0.3);
    const fist = this.temp(new THREE.Group());
    const steel = new THREE.MeshStandardNodeMaterial({ color: STEEL, metalness: 0.85, roughness: 0.3 }), glow = new THREE.MeshStandardNodeMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 3 });
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.5), steel), j = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), glow); j.position.z = -0.3;
    fist.add(k, j); fist.position.copy(this.handPos()); fist.lookAt(tmp.copy(fist.position).add(f));
    const out = new Set(), back = new Set(), pos = fist.position;
    g.audio?.whoosh(1.1);
    this.during(1.2, (t, dt) => {
      const going = t < 0.4;
      if (going) pos.addScaledVector(f, 26 * dt * (1 - t / 0.45));
      else { const b = tmp.copy(this.handPos()).sub(pos); const d = b.length(); if (d < 0.8) return false; pos.addScaledVector(b.normalize(), Math.min(d, 28 * dt)); }
      g.particles.glow.spawn({ pos: pos, vx: -f.x * 2, vz: -f.z * 2, life: 0.25, r: 0.4, g: 1.6, b: 2.2, size: 0.15, drag: 1, sizeEnd: 0.05 });
      for (const e of this.foes(pos, 1.3)) {
        const set = going ? out : back; if (set.has(e)) continue; set.add(e);
        this.hit(e, 22 + this.rank('drill') * 4, { stagger: 0.5, knock: f.clone().multiplyScalar(going ? 6 : -4) });
        g.fx.hitSpark(pos, null, { color: CYAN }); g.audio?.impact(1.1);
      }
    }, () => { this.untemp(fist); k.geometry.dispose(); j.geometry.dispose(); });
  }
  thruster() {
    const g = this.game, p = this.p;
    const v = tmp.set(p.vel.x, 0, p.vel.z);
    this.dash(v.lengthSq() > 1 ? v.clone().normalize() : this.fwd(), 6, 0.18, { color: CYAN });
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1.2), { count: 14, color: CYAN, speed: 5, life: 0.3, size: 0.15, shape: 1, intensity: 3 });
    g.audio?.whoosh(1.2);
  }
  jetSlam() {
    const g = this.game, to = this.aimGround(10);
    this.warn(to, 3.5, 0.6);
    g.audio?.charge(0.3, 0.8);
    this.leapTo(to, 0.6, 4.5, (c) => {
      this.blast(c, 3.5, 40 + this.rank('drill') * 8, { color: CYAN, knock: 10, stagger: 0.8 });
      g.fx.landDust(c, 30); g.hitStop(0.05);
    });
  }
  // ---- Bastion
  barrierWall() {
    const g = this.game, p = this.p, f = this.fwd();
    this.cast(0.4, true);
    const c = p.pos.clone().addScaledVector(f, 2.6); c.y = this.groundAt(c.x, c.z, p.pos.y);
    const W = 5, side = new THREE.Vector3(f.z, 0, -f.x);
    const wall = this.temp(new THREE.Mesh(new THREE.BoxGeometry(W, 2.6, 0.2), orbMaterial(CYAN, { power: 1.6, intensity: 1.4 })));
    wall.position.copy(c).setY(c.y + 1.3); wall.rotation.y = Math.atan2(f.x, f.z); wall.renderOrder = 22;
    g.fx.flash(0x80e8ff, 0.1, 0.1); g.audio?.energy('infinity');
    const near = (pos) => { tmp.subVectors(pos, c); return { lat: tmp.x * side.x + tmp.z * side.z, dep: tmp.x * f.x + tmp.z * f.z }; };
    this.during(6, (t, dt) => {
      wall.scale.y = Math.min(1, t * 6);
      for (const pr of [...g.projectiles.list]) {
        if (pr.team !== 'enemy') continue;
        const n = near(pr.pos); if (Math.abs(n.lat) < W / 2 + 0.2 && Math.abs(n.dep) < 0.6 && pr.pos.y < c.y + 3) { g.fx.hitSpark(pr.pos, null, { color: CYAN }); g.projectiles.kill(pr, 'blocked'); }
      }
      for (const e of g.enemies) {
        if (e.dead) continue;
        const n = near(e.pos), r = (e.radius ?? 0.5) + 0.3;
        if (Math.abs(n.lat) < W / 2 + 0.2 && n.dep > 0 && n.dep < r) e.knock.addScaledVector(f, (r - n.dep) * 40 * dt);
      }
    }, () => { this.untemp(wall); wall.geometry.dispose(); g.particles.burst(c.clone().setY(c.y + 1.2), { count: 20, color: CYAN, speed: 3, life: 0.4, size: 0.12, shape: 1 }); });
  }
  cursedPulse() {
    const g = this.game, p = this.p, R = 5.5, ch = 0.5;
    p.action = { type: 'raise', dur: ch + 0.2, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    this.warn(p.pos, R, ch);
    g.audio?.charge(ch, 1.2);
    this.after(ch, () => {
      if (p.action?.lock) p.action = null;
      for (const e of this.foes(p.pos, R)) { this.hit(e, 20, { stagger: 0.8 }); this.stun(e, 1.6); g.fx.slashLine(p.pos.clone().setY(p.pos.y + 1.2), tmp2.subVectors(e.pos, p.pos).setY(0).normalize().clone(), e.pos.distanceTo(p.pos), CYAN, 0.1, 0.2); }
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: CYAN, r0: 0.4, r1: R, dur: 0.3, thick: 0.3 });
      g.fx.shockwave(p.pos, WHITE, R + 1); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 0.8, 0.4); g.fx.flash(0x80e8ff, 0.2, 0.1);
      g.shake(0.4); g.audio?.energy('infinity'); g.audio?.impact(1.4);
    });
  }
  // ---- Puppets
  miniMecha() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    if (this.mini) this.untemp(this.mini);
    const m = this.mini = this.temp(this.makeDrone(1.6));
    m.position.copy(p.pos).setY(p.pos.y + 1.5);
    g.fx.summonCircle(p.pos, CYAN); g.audio?.energy('summon');
    let cd = 0.4, a = 0;
    this.during(15 * this.puppetLife, (t, dt) => {
      if (this.mini !== m) return false;
      cd -= dt; a += dt * 1.5;
      m.position.lerp(tmp.set(p.pos.x + Math.cos(a) * 1.5, p.pos.y + 2.2 + Math.sin(t * 3) * 0.15, p.pos.z + Math.sin(a) * 1.5), Math.min(1, dt * 8));
      const e = g.domainSys?.sureHit(p) ? g.nearestEnemy(m.position, 30) : g.nearestEnemy(m.position, 13);
      if (e) m.lookAt(tmp2.copy(e.pos).setY(e.pos.y + 1));
      if (e && cd <= 0) { cd = 0.7; this.zap(m.position, e, 10); }
    }, () => { if (this.mini === m) { this.mini = null; g.fx.poof(m.position.clone().setY(m.position.y - 0.8)); this.untemp(m); } });
  }
  puppetBomb() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const m = this.temp(this.makeDrone(1.8));
    m.position.copy(p.pos).addScaledVector(this.fwd(), 1); m.position.y = p.pos.y + 0.3;
    g.audio?.energy('summon');
    let fuse = -1;
    const f = this.fwd();
    const boom = () => {
      const c = m.position.clone(); this.untemp(m);
      this.blast(c, 2.8, (55 + this.rank('drones') * 10) * this.puppetMul, { color: CYAN, knock: 10, stagger: 0.8 });
    };
    this.during(4, (t, dt) => {
      if (fuse >= 0) { fuse -= dt; m.visible = Math.sin(t * 50) > 0; if (fuse <= 0) return false; return; }
      const e = g.nearestEnemy(m.position, 16);
      const goal = e ? e.pos : tmp.copy(m.position).addScaledVector(f, 1);
      tmp2.subVectors(goal, m.position).setY(0); const d = tmp2.length();
      if (e && d < 1 + (e.radius ?? 0.5)) { fuse = 0.35; this.warn(m.position, 2.8, 0.35); g.audio?.tone({ freq: 1200, dur: 0.3, gain: 0.06, type: 'square', filter: 4000 }); return; }
      m.position.addScaledVector(tmp2.normalize(), Math.min(d, 8 * dt));
      m.position.y = this.groundAt(m.position.x, m.position.z, m.position.y) + 0.3 + Math.abs(Math.sin(t * 14)) * 0.15;
      m.rotation.y = Math.atan2(tmp2.x, tmp2.z);
    }, () => { if (this.temps?.has(m)) boom(); });
  }
  puppetLegion() {
    const g = this.game, p = this.p, n = 6;
    p.action = { type: 'raise', dur: 0.6, elapsed: 0, t: 0, moveScale: 0.2 };
    g.toast?.('Puppet Legion'); g.audio?.energy('summon'); g.audio?.charge(0.6, 1.2);
    g.fx.shockwave(p.pos, CYAN, 5);
    const ds = [];
    for (let i = 0; i < n; i++) { const m = this.temp(this.makeDrone(1.2)); m.position.copy(p.pos).setY(p.pos.y + 1); ds.push({ m, a: i / n * Math.PI * 2, cd: 0.3 + i * 0.1 }); }
    this.during(10 * this.puppetLife, (t, dt) => {
      for (const d of ds) {
        d.a += dt * 1.4; d.cd -= dt;
        d.m.position.lerp(tmp.set(p.pos.x + Math.cos(d.a) * 3, p.pos.y + 3 + Math.sin(d.a * 2) * 0.3, p.pos.z + Math.sin(d.a) * 3), Math.min(1, dt * 6));
        const e = g.nearestEnemy(d.m.position, 16);
        if (e) d.m.lookAt(tmp2.copy(e.pos).setY(e.pos.y + 1));
        if (e && d.cd <= 0) { d.cd = 0.6; this.zap(d.m.position, e, 12 + this.rank('drones') * 3); }
      }
    }, () => {
      if (this.disposed) return;
      // final volley: every drone dives onto a curse and bursts
      for (const d of ds) {
        const e = g.nearestEnemy(d.m.position, 16), at = (e ? e.pos : d.m.position).clone();
        at.y = this.groundAt(at.x, at.z, at.y);
        const from = d.m.position.clone();
        this.warn(at, 2, 0.3);
        this.during(0.3, (t, dt, k) => { d.m.position.lerpVectors(from, at, k); }, () => { this.untemp(d.m); this.blast(at, 2, 30 * this.puppetMul, { color: CYAN, knock: 6, stagger: 0.5, sound: false }); });
      }
      this.after(0.3, () => g.audio?.energy('explode'));
    });
  }
  // ---- Muta
  storedEnergy() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.toast?.('Stored Energy'); g.audio?.charge(0.4, 0.8); g.fx.shockwave(p.pos, CYAN, 4);
    this.buff('stored_energy', 8, {
      onStart: () => { this.ceMul *= 0.5; this.cannonMul *= 1.4; },
      onEnd: () => { this.ceMul /= 0.5; this.cannonMul /= 1.4; },
      onTick: () => { if (Math.random() < 0.4) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5), y: p.pos.y + Math.random() * 2, z: p.pos.z + (Math.random() - 0.5), vy: 0.8, life: 0.5, r: 0.4, g: 1.6, b: 2.2, size: 0.12, drag: 1, sizeEnd: 0.1 }); },
    });
  }
  reserves() {
    const g = this.game, p = this.p;
    if (p.ce >= p.maxCe) { g.toast?.('Cursed Energy is already full'); g.audio?.ui('back'); return false; }
    const cost = Math.min(Math.max(0, p.hp - 1), p.maxHp * 0.15);
    if (cost > 0) { p.hp -= cost; g.fx.damageNumber(p.pos, cost, { color: '#ff6a6a' }); g.fx.hurtVignette(); }
    p.ce = Math.min(p.maxCe, p.ce + 40);
    this.cast(0.4, true);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: CYAN, r0: 3, r1: 0.4, dur: 0.5, thick: 0.2 });
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 30, color: CYAN, speed: 3, up: 2, life: 0.7, size: 0.15, shape: 1, intensity: 3 });
    g.audio?.energy('heal');
  }
  overclock() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.toast?.('Overclock'); g.audio?.tone({ freq: 400, to: 1600, dur: 0.4, gain: 0.08, type: 'sawtooth', filter: 3000 });
    this.buff('overclock', 6, {
      onTick: (dt) => {
        for (const a of Object.values(this.library)) {
          if (a.maxCharges) { if (a.chargesLeft < a.maxCharges) a.recharge = (a.recharge ?? 0) + dt; }
          else if (a.cdLeft > 0) a.cdLeft = Math.max(0, a.cdLeft - dt);
        }
        if (Math.random() < 0.3) g.particles.burst(p.pos.clone().setY(p.pos.y + 1.2), { count: 1, color: 0xffe080, speed: 2, life: 0.3, size: 0.08, shape: 1 });
      },
    });
  }
}
registerKit('mechamaru', MechamaruKit, MECHAMARU_SKILLS);
