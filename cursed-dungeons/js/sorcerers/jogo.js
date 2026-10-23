// Jogo-style kit — Disaster Flames. 21 abilities on the technique tree;
// four are equipped (RMB takes a basic one) plus F.
//   LMB        scorching punches; the finisher slams a ring of fire.
//   Flames     Fire Orb (start, RMB), Fingertip Flames, Flame Torrent, Wall of
//              Flame, Heat Haze, Disaster Flames: Inferno
//   Volcano    Volcano, Volcanic Bombs, Erupting Vents, Lava Flow, Volcano Head
//   Insects    Ember Insects, Ember Swarm Shield, Lurking Embers, Ember Firestorm
//   Maximum    Flame Pillar, Maximum: Meteor, Maximum: Meteor Swarm
//   Disaster   Boiling Point, Fire Dash, Eruption Leap
//   F          Domain: Coffin of the Iron Mountain — the inside of a volcano. The
//              sure-hit is the heat itself: ordinary curses burn to death almost
//              at once, bosses lose a big share of health every second, and the
//              crater floor keeps erupting.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { makeOrb } from '../gfx/orbs.js';

const FIRE = 0xff6a1a, LAVA = 0xff3a0a, EMBER = 0xffb03a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

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
  { id: 'scorch', name: 'Scorching Fists', icon: '👊', desc: '+8% melee damage per rank; melee hits ignite the ground.', max: 3, branch: 'Disaster', tier: 0 },
  { id: 'orb', name: 'Flame Orb', icon: '🔥', desc: 'Bigger, stronger fire orbs and fingertip flames.', max: 3, req: 'ab:fire_orb', branch: 'Flames', tier: 1 },
  { id: 'volcano', name: 'Eruption', icon: '🌋', desc: 'Every eruption is wider and hits harder.', max: 3, req: 'ab:volcano', branch: 'Volcano', tier: 2 },
  { id: 'insects', name: 'Ember Swarm', icon: '🐞', desc: 'More ember insects per swarm.', max: 2, req: 'ab:insects', branch: 'Insects', tier: 2 },
  { id: 'meteor', name: 'Maximum: Meteor', icon: '☄️', desc: 'Bigger meteors and longer-lasting fires.', max: 2, req: 'ab:meteor', branch: 'Maximum', tier: 4 },
  { id: 'iron', name: 'Iron Mountain', icon: '⛰️', desc: 'Coffin of the Iron Mountain burns 25% hotter and lasts 2s longer.', max: 1, req: 'meteor', branch: 'Maximum', tier: 5 },
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
    this.branches = ['Flames', 'Volcano', 'Insects', 'Maximum', 'Disaster'];
    this.lavaMul = 1; this.insectBonus = 0;
    this.library = {
      // ---- Flames
      fire_orb: ability({ name: 'Fire Orb', icon: '🔥', kind: 'basic', desc: 'A burning orb that bursts into flame on impact.', cd: 0.8, ce: 0, branch: 'Flames', tier: 0, start: true, legacy: 'ranged', use: () => this.fireOrb() }),
      finger_flames: ability({ name: 'Fingertip Flames', icon: '🫵', kind: 'basic', desc: 'Flick five quick darts of flame off the fingertips.', cd: 0.6, ce: 0, branch: 'Flames', tier: 1, req: 'fire_orb', use: () => this.fingerFlames() }),
      flame_torrent: ability({ name: 'Flame Torrent', icon: '🌬️', kind: 'technique', desc: 'Pour a roaring torrent of fire over a wide cone in front of you.', cd: 8, ce: 14, branch: 'Flames', tier: 2, req: 'finger_flames', use: () => this.flameTorrent() }),
      flame_wall: ability({ name: 'Wall of Flame', icon: '🧱', kind: 'technique', desc: 'Raise a burning wall across the aim point; curses that cross it burn.', cd: 10, ce: 12, branch: 'Flames', tier: 2, req: 'fire_orb', use: () => this.flameWall() }),
      heat_haze: ability({ name: 'Heat Haze', icon: '♨️', kind: 'buff', desc: 'Wreathe yourself in heat for 8s: +15% technique damage, and curses near you keep burning.', cd: 22, ce: 16, branch: 'Flames', tier: 3, req: 'flame_torrent', use: () => this.heatHaze() }),
      inferno: ability({ name: 'Disaster Flames: Inferno', icon: '🔆', kind: 'technique', desc: 'A ring of heat marks the ground around you, then everything inside goes up in a colossal blaze.', cd: 18, ce: 34, branch: 'Flames', tier: 4, req: 'heat_haze', use: () => this.inferno() }),
      // ---- Volcano
      volcano: ability({ name: 'Volcano', icon: '🌋', kind: 'technique', desc: 'A ring of heat marks the ground, then it erupts and launches everything standing on it, leaving lava.', cd: 6, ce: 12, branch: 'Volcano', tier: 1, legacy: 't1', use: () => this.volcano() }),
      volcanic_bombs: ability({ name: 'Volcanic Bombs', icon: '🪨', kind: 'technique', desc: 'Lob three molten rocks around the aim point; each bursts into a lava pool.', cd: 7, ce: 10, branch: 'Volcano', tier: 2, req: 'volcano', use: () => this.volcanicBombs() }),
      erupting_vents: ability({ name: 'Erupting Vents', icon: '🔺', kind: 'technique', desc: 'A chain of eruptions tears through the ground towards the aim, one after another.', cd: 9, ce: 16, branch: 'Volcano', tier: 2, req: 'volcano', use: () => this.eruptingVents() }),
      lava_flow: ability({ name: 'Lava Flow', icon: '🫗', kind: 'technique', desc: 'Flood an area with lava for 5s: curses in it burn and wade slowly.', cd: 14, ce: 18, branch: 'Volcano', tier: 3, req: 'volcanic_bombs', use: () => this.lavaFlow() }),
      volcano_head: ability({ name: 'Volcano Head', icon: '🗻', kind: 'technique', desc: 'Your head erupts: a blast knocks back curses beside you and lava bombs rain all around.', cd: 16, ce: 28, branch: 'Volcano', tier: 4, req: 'erupting_vents', use: () => this.volcanoHead() }),
      // ---- Insects
      insects: ability({ name: 'Ember Insects', icon: '🐞', kind: 'summon', desc: 'A swarm of fiery insects seeks out curses and pops.', cd: 9, ce: 16, branch: 'Insects', tier: 1, legacy: 't2', use: () => this.insects() }),
      ember_shield: ability({ name: 'Ember Swarm Shield', icon: '🛡️', kind: 'defence', desc: 'Ember insects circle you for 10s; each one blocks most of a hit and bursts on the attacker.', cd: 16, ce: 12, branch: 'Insects', tier: 2, req: 'insects', use: () => this.emberShield() }),
      ember_mines: ability({ name: 'Lurking Embers', icon: '🪲', kind: 'technique', desc: 'Insects settle in a ring on the ground and leap at the first curse that comes near.', cd: 10, ce: 12, branch: 'Insects', tier: 3, req: 'insects', use: () => this.emberMines() }),
      firestorm: ability({ name: 'Ember Firestorm', icon: '🌪️', kind: 'summon', desc: 'A vast swarm blots out the sky over the aim and dives in burning waves for 4s.', cd: 20, ce: 32, branch: 'Insects', tier: 4, req: 'ember_mines', use: () => this.firestorm() }),
      // ---- Maximum
      flame_pillar: ability({ name: 'Flame Pillar', icon: '🕯️', kind: 'technique', desc: 'The ground under the targeted curse glows, then a pillar of fire roars up through it.', cd: 8, ce: 14, branch: 'Maximum', tier: 2, req: 'fire_orb', use: () => this.flamePillar() }),
      meteor: ability({ name: 'Maximum: Meteor', icon: '☄️', kind: 'technique', desc: 'A colossal meteor falls on the aim point.', cd: 22, ce: 50, branch: 'Maximum', tier: 3, legacy: 't3', req: 'volcano', use: () => this.meteor() }),
      meteor_swarm: ability({ name: 'Maximum: Meteor Swarm', icon: '🌠', kind: 'technique', desc: 'Five smaller meteors rain down around the aim, each one telegraphed.', cd: 26, ce: 45, branch: 'Maximum', tier: 4, req: 'meteor', use: () => this.meteorSwarm() }),
      // ---- Disaster
      boiling_point: ability({ name: 'Boiling Point', icon: '😤', kind: 'defence', desc: 'Steam blasts out of your head: curses beside you are thrown back and you take 30% less damage for 4s.', cd: 12, ce: 8, branch: 'Disaster', tier: 1, use: () => this.boilingPoint() }),
      fire_dash: ability({ name: 'Fire Dash', icon: '💨', kind: 'movement', desc: 'Rocket forward on a jet of flame, scorching what you pass and leaving a burning trail.', cd: 5, ce: 6, branch: 'Disaster', tier: 2, req: 'boiling_point', use: () => this.fireDash() }),
      eruption_leap: ability({ name: 'Eruption Leap', icon: '🚀', kind: 'movement', desc: 'Blast off the ground to the aim point and come down in an eruption.', cd: 8, ce: 10, branch: 'Disaster', tier: 3, req: 'fire_dash', use: () => this.eruptionLeap() }),
    };
    this.passives = {
      volcanic_rage: passive({ name: 'Volcanic Rage', icon: '🌋', desc: 'Lava and burning ground you leave last 50% longer.', branch: 'Volcano', tier: 3, req: 'volcanic_bombs', apply: (pl, k) => { k.lavaMul *= 1.5; } }),
      kindling: passive({ name: 'Kindling', icon: '🔥', desc: 'Curses you kill explode in flames, burning those around them.', branch: 'Flames', tier: 3, req: 'flame_wall', apply: (pl, k) => { k.kindling = true; } }),
      magma_skin: passive({ name: 'Magma Skin', icon: '🧯', desc: '+6% damage reduction; curses that hit you up close are burned.', branch: 'Disaster', tier: 2, req: 'boiling_point', apply: (pl, k) => { pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.06); k.magmaSkin = true; } }),
      ember_heart: passive({ name: 'Ember Heart', icon: '❤️‍🔥', desc: '+2 insects in every swarm; each insect that hits restores Cursed Energy.', branch: 'Insects', tier: 3, req: 'ember_shield', apply: (pl, k) => { k.insectBonus += 2; k.emberHeart = true; } }),
    };
    this.rockGeo = new THREE.IcosahedronGeometry(1, 0);
    this.rockMat = new THREE.MeshStandardNodeMaterial({ color: 0x3a2018, roughness: 0.9, emissive: LAVA, emissiveIntensity: 1.2 });
    this.bugGeo = new THREE.BoxGeometry(0.22, 0.14, 0.3);
    this.bugMat = new THREE.MeshStandardNodeMaterial({ color: EMBER, emissive: EMBER, emissiveIntensity: 4 });
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
        for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.glow.spawn({ x: d.center.x + Math.cos(a) * rr, y: d.center.y + 6 + Math.random() * 6, z: d.center.z + Math.sin(a) * rr, vy: -2, life: 2, r: 3, g: 1.2, b: 0.3, size: 0.1, drag: 0.5, sizeEnd: 0.5, shape: 'square' }); }
        if (Math.random() < 0.3) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.smoke.spawn({ x: d.center.x + Math.cos(a) * rr, y: d.center.y + 8, z: d.center.z + Math.sin(a) * rr, vy: -0.6, life: 2.5, r: 0.12, g: 0.09, b: 0.08, size: 1.4, drag: 0.5, sizeEnd: 3 }); }
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
      for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R; g.particles.glow.spawn({ x: at.x + Math.cos(a) * rr, y: at.y + 0.1, z: at.z + Math.sin(a) * rr, vy: 1.5, life: 0.4, r: 3, g: 0.9, b: 0.2, size: 0.12, drag: 1, sizeEnd: 0.5, shape: 'square' }); }
      if (Math.random() < 0.3) g.particles.smoke.spawn({ x: at.x + (Math.random() - 0.5) * R, y: at.y + 0.2, z: at.z + (Math.random() - 0.5) * R, vy: 1.2, life: 1, r: 0.15, g: 0.1, b: 0.08, size: 0.5, gravity: -0.2, drag: 1, sizeEnd: 2 });
      if (t < warn) return true;
      // ERUPTION
      g.combat.aoe(at, R, (34 + rk * 12) * mult, p, { knock: 6, stagger: 0.8 });
      for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(at) < R + 0.5) e.vel.y = Math.max(e.vel.y, 12);
      const c = at.clone().setY(at.y + 0.5);
      for (let i = 0; i < 4; i++) g.particles.burst(c, { count: 20, color: i % 2 ? FIRE : EMBER, speed: 5, spread: 0.35, dir: tmp.set(0, 3 + i, 0), life: 0.9, size: 0.45, sizeEnd: 0.1, gravity: 8, intensity: 3 });
      g.particles.burst(c, { count: 18, color: 0x2a1a14, additive: false, speed: 4, up: 3, life: 1.4, size: 0.9, sizeEnd: 3, drag: 2 });
      g.fx.shockwave(at, LAVA, R + 1); g.fx.screenWave(c, 0.6, 0.35);
      g.lights.flash(c.clone().setY(c.y + 1.5), FIRE, 16, R * 4, 0.5);
      this.lava(at, R * 0.6, 12 + rk * 4, 3 + this.rank('meteor'));
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
    const n = 6 + this.rank('insects') * 2 + this.insectBonus;
    const foes = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 20);
    if (!foes.length) { g.toast?.('No curses to hunt'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    for (let i = 0; i < n; i++) this.after(i * 0.045, () => {
      const a = (i / n) * Math.PI * 2 + p.facing;
      const vel = new THREE.Vector3(Math.sin(a) * 7, 4 + Math.random() * 2, Math.cos(a) * 7);
      const target = foes[i % foes.length];
      g.projectiles.fire({ pos: p.pos.clone().setY(p.pos.y + 1.6), vel, team: 'player', shape: 'cube', color: EMBER, emissive: 5, scale: 0.9, life: 2.4, radius: 0.45, light: 1.5, ghost: true,
        homing: 5, target,
        trail: (q) => { q.homing = Math.min(14, q.homing + 0.25); if (Math.random() < 0.7) g.particles.burst(q.pos, { count: 1, color: FIRE, speed: 0.4, life: 0.3, size: 0.25, sizeEnd: 0.02 }); },
        onHit: (e, q) => {
          g.combat.damageEnemy(e, 14 + this.rank('insects') * 3, p, { stagger: 0.25 }); if (this.emberHeart) p.gainCE(1);
          g.fx.explosion(q.pos, FIRE, 1.2);
          g.combat.aoe(q.pos, 1.5, 8, p, { knock: 3, stagger: 0.2, blocks: false });
          g.audio?.impact(0.8);
        } });
      g.audio?.tone({ freq: 900 + i * 60, to: 500, dur: 0.1, gain: 0.05, type: 'square', filter: 3000 });
    });
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
      if (Math.random() < 0.6) g.particles.smoke.spawn({ x: rock.position.x, y: rock.position.y + 1, z: rock.position.z, vy: 2, life: 1.4, r: 0.12, g: 0.08, b: 0.06, size: 1.2, gravity: -0.1, drag: 1, sizeEnd: 3 });
      if (k < 1) return true;
      g.scene.remove(rock); g.lights.remove(light);
      g.fx.explosion(at, FIRE, R);
      g.fx.explosion(at.clone().setY(at.y + 2), EMBER, R * 0.6);
      g.combat.aoe(at, R, 110 + rk * 35, p, { knock: 16, stagger: 1, falloff: true, unblockable: true });
      for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(at) < R) e.vel.y = Math.max(e.vel.y, 10);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; this.lava(at.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.55, 0, Math.sin(a) * R * 0.55)), 1.6, 18, 4 + rk * 1.5); }
      for (let i = 0; i < 30; i++) g.debris.spawn(at.clone().setY(at.y + 0.6), new THREE.Vector3((Math.random() - 0.5) * 16, 6 + Math.random() * 10, (Math.random() - 0.5) * 16), 0.25 + Math.random() * 0.35, new THREE.Color(Math.random() < 0.4 ? 0xff5a1a : 0x3a2a24), 3);
      g.fx.screenWave(at, 1.5, 0.7); g.fx.flash(0xffa040, 0.6, 0.3); g.fx.chroma(1.5);
      g.shake(1); g.hitStop(0.1); g.slowMo(0.35, 0.4);
      g.audio?.energy('explode'); g.audio?.blackFlash();
      return false;
    });
  }
  // ============================================================== new abilities
  lava(pos, radius, dps, dur) { this.game.hazards.add({ pos: pos.clone(), radius, dps, dur: dur * this.lavaMul, color: LAVA, team: 'player', src: this.p }); }
  burn(e, dmg, o = {}) { return this.hit(e, dmg, { color: '#ff8a3a', ...o }); }
  flameBurst(at, n = 12, h = 3) { this.game.particles.burst(at, { count: n, color: Math.random() < 0.5 ? FIRE : EMBER, speed: 4, spread: 0.3, dir: tmp.set(0, h, 0), life: 0.7, size: 0.5, sizeEnd: 0.1, intensity: 3 }); }
  onKill(e) {
    if (!this.kindling) return;
    const at = e.pos.clone().setY(e.pos.y + (e.height ?? 1.5) * 0.4);
    this.game.combat.aoe(at, 2.4, 20 + (e.maxHp ?? 60) * 0.1, this.p, { knock: 5, stagger: 0.4 });
    this.game.fx.explosion(at, FIRE, 1.8); this.game.audio?.impact(0.9);
  }
  incoming(a, src) {
    if (this.magmaSkin && src && src.maxHp && !src.dead && src.pos && src.pos.distanceTo(this.p.pos) < 3.5) {
      this.burn(src, 12, { stagger: 0.2 }); this.flameBurst(src.pos.clone().setY(src.pos.y + 1), 6, 2);
    }
    return a;
  }
  fingerFlames() {
    const g = this.game, p = this.p, rk = this.rank('orb');
    this.cast(0.25);
    const base = this.aimAngle();
    for (let i = 0; i < 5; i++) this.after(i * 0.04, () => {
      const a = base + (Math.random() - 0.5) * 0.3;
      g.projectiles.fire({ pos: this.handPos(), vel: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(26), team: 'player', shape: 'cube', color: FIRE, emissive: 4, scale: 0.7, life: 0.45, radius: 0.4,
        trail: (q) => g.particles.burst(q.pos, { count: 1, color: Math.random() < 0.5 ? FIRE : EMBER, speed: 0.4, life: 0.25, size: 0.3, sizeEnd: 0.05 }),
        onHit: (e, q) => { this.burn(e, 6 + rk * 2, { stagger: 0.1, knock: q.vel.clone().setLength(1) }); g.fx.hitSpark(q.pos, null, { color: EMBER }); } });
    });
    g.audio?.noise({ dur: 0.2, gain: 0.2, type: 'lowpass', freq: 900, sweep: 2600 });
  }
  flameTorrent() {
    const g = this.game, p = this.p, range = 8.5, arc = 0.5;
    p.action = { type: 'cast', both: true, dur: 1.3, elapsed: 0, t: 0, moveScale: 0.25, lock: true, faceAim: true };
    g.audio?.energy('fire');
    const light = g.lights.attach(p.object, FIRE, 6, 10, { offsetY: 1.5, priority: 3 });
    let tick = 0;
    this.during(1.2, (t, dt) => {
      tick -= dt;
      const from = this.handPos(), f = p.facing;
      for (let i = 0; i < 9; i++) {
        const a = f + (Math.random() - 0.5) * arc * 2, sp = 10 + Math.random() * 6;
        g.particles.glow.spawn({ pos: from, vx: Math.sin(a) * sp, vy: (Math.random() - 0.3) * 2, vz: Math.cos(a) * sp, life: range / sp, r: 3, g: 1.1 + Math.random() * 0.8, b: 0.25, size: 0.4, gravity: -1, drag: 0.8, sizeEnd: 1.8 });
      }
      if (Math.random() < 0.3) g.particles.smoke.spawn({ x: from.x + Math.sin(f) * 4, y: from.y + 1, z: from.z + Math.cos(f) * 4, vy: 1.4, life: 1.2, r: 0.14, g: 0.1, b: 0.08, size: 1, gravity: -0.2, drag: 1, sizeEnd: 2.5 });
      if (tick <= 0) { tick = 0.15; for (const e of this.foes(p.pos, range, tmp2.set(Math.sin(f), 0, Math.cos(f)), arc)) this.burn(e, 7 + this.rank('orb') * 2, { stagger: 0.12 }); }
    }, () => g.lights.remove(light));
  }
  flameWall() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const c = this.aimGround(9), f = this.fwd(), side = new THREE.Vector3(f.z, 0, -f.x), dur = 5 * this.lavaMul;
    g.markers.spawn({ pos: c.clone().addScaledVector(side, -4.6), dur: 0.3, shape: 'rect', width: 1.6, length: 9.2, facing: Math.atan2(side.x, side.z), color: FIRE });
    for (let i = -3; i <= 3; i++) {
      const at = c.clone().addScaledVector(side, i * 1.3); at.y = this.groundAt(at.x, at.z, c.y);
      this.after(0.3 + Math.abs(i) * 0.05, () => {
        this.lava(at, 1, 20, 5); this.flameBurst(at.clone().setY(at.y + 0.5));
        for (const e of this.foes(at, 1.3)) this.burn(e, 16, { stagger: 0.35 });
      });
    }
    this.after(0.3, () => this.during(dur, () => {
      for (let k = 0; k < 2; k++) { const s = (Math.random() - 0.5) * 9; g.particles.glow.spawn({ x: c.x + side.x * s, y: c.y + 0.2, z: c.z + side.z * s, vy: 3 + Math.random() * 3, life: 0.6, r: 3, g: 1.1, b: 0.25, size: 0.5, drag: 1, sizeEnd: 0.1 }); }
    }));
    g.audio?.energy('fire');
  }
  heatHaze() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.fx.flash(0x401000, 0.2, 0.2); g.audio?.energy('fire');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: FIRE, r0: 0.4, r1: 3, dur: 0.4, thick: 0.2 });
    let tick = 0;
    this.statBuff('heat_haze', 8, { techMult: 0.15 }, {
      onTick: (dt) => {
        tick -= dt;
        for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2; g.particles.glow.spawn({ x: p.pos.x + Math.cos(a) * 0.7, y: p.pos.y + Math.random() * 1.8, z: p.pos.z + Math.sin(a) * 0.7, vy: 1.5, life: 0.5, r: 3, g: 1.2, b: 0.3, size: 0.25, gravity: -0.5, drag: 1, sizeEnd: 0.05 }); }
        if (tick <= 0) { tick = 0.5; for (const e of this.foes(p.pos, 2.8)) this.burn(e, 6, { stagger: 0 }); }
      },
    });
  }
  inferno() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 7.5;
    p.action = { type: 'cast', both: true, dur: 0.85, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.markers.spawn({ pos: c, dur: 0.6, radius: R, color: FIRE });
    g.toast?.('Disaster Flames'); g.audio?.charge(0.6, 0.6);
    this.during(0.6, () => { for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * R; g.particles.glow.spawn({ x: c.x + Math.cos(a) * r, y: c.y + 0.1, z: c.z + Math.sin(a) * r, vy: 2, life: 0.4, r: 3, g: 1, b: 0.2, size: 0.15, drag: 1, sizeEnd: 0.5, shape: 'square' }); } });
    this.after(0.6, () => {
      if (p.action?.lock) p.action = null;
      this.blast(c, R, 70 + this.rank('volcano') * 10, { color: FIRE, knock: 13, stagger: 0.9, unblockable: true });
      for (let k = 1; k <= 3; k++) this.after(k * 0.08, () => g.fx.shockwave(c, k % 2 ? FIRE : EMBER, R * k / 3 + 1));
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = 1 + Math.random() * (R - 1); this.flameBurst(new THREE.Vector3(c.x + Math.cos(a) * r, c.y + 0.3, c.z + Math.sin(a) * r), 8, 4 + Math.random() * 4); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; this.lava(new THREE.Vector3(c.x + Math.cos(a) * R * 0.6, c.y, c.z + Math.sin(a) * R * 0.6), 1.5, 16, 3); }
      g.lights.flash(c.clone().setY(c.y + 2), FIRE, 24, R * 3, 0.6, { priority: 6 });
      g.fx.flash(0xff8a3a, 0.45, 0.25); g.fx.screenWave(c, 1.2, 0.5); g.hitStop(0.06);
      g.audio?.energy('explode');
    });
  }
  // a molten rock lobbed from `from` to `to` (telegraphed where it lands)
  lob(from, to, dur, onLand, scale = 1) {
    const g = this.game;
    g.markers.spawn({ pos: to, dur, radius: 2.2 * scale, color: FIRE });
    const rock = new THREE.Mesh(this.rockGeo, this.rockMat); rock.scale.setScalar(0.45 * scale); rock.position.copy(from); g.scene.add(rock);
    const s = from.clone(), H = 4 + scale * 2;
    this.during(dur, (t, dt, k) => {
      rock.position.lerpVectors(s, to, k); rock.position.y += Math.sin(k * Math.PI) * H; rock.rotation.x += dt * 6; rock.rotation.z += dt * 4;
      g.particles.burst(rock.position, { count: 1, color: Math.random() < 0.5 ? FIRE : EMBER, speed: 0.5, life: 0.4, size: 0.4 * scale, sizeEnd: 0.05 });
    }, () => { g.scene.remove(rock); onLand(); });
  }
  volcanicBombs() {
    const g = this.game, rk = this.rank('volcano');
    this.cast(0.4, true);
    const c = this.aimGround(12);
    for (let i = 0; i < 3; i++) {
      const at = i ? c.clone().add(tmp.set((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5)) : c.clone(); at.y = this.groundAt(at.x, at.z, c.y);
      this.lob(this.handPos(), at, 0.75 + i * 0.12, () => { this.blast(at, 2.2, 24 + rk * 6, { color: FIRE, knock: 6, stagger: 0.5 }); this.lava(at, 1.3, 14, 3); });
    }
    g.audio?.whoosh(1);
  }
  eruptingVents() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    const f = this.fwd(), from = p.pos.clone();
    for (let i = 0; i < 5; i++) this.after(i * 0.16, () => this.erupt(from.clone().addScaledVector(f, 2.5 + i * 2.4), 0.45, 0.7));
    g.audio?.energy('fire'); g.audio?.noise({ dur: 0.9, gain: 0.3, type: 'lowpass', freq: 200, sweep: 700 });
  }
  lavaFlow() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const c = this.aimGround(11), R = 4.2, dur = 5 * this.lavaMul;
    this.lava(c, R, 18 + this.rank('volcano') * 4, 5);
    this.flameBurst(c.clone().setY(c.y + 0.4), 20, 3);
    this.zone(c, R, dur, 0.4, (list) => { for (const e of list) this.slow(e, 0.6); }, { color: LAVA, particles: 0.9, ring: false });
    g.audio?.energy('fire'); g.shake(0.2);
  }
  volcanoHead() {
    const g = this.game, p = this.p, c = p.pos.clone();
    p.action = { type: 'cast', both: true, dur: 0.7, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.toast?.('Volcano Head');
    const head = () => p.pos.clone().setY(p.pos.y + 2.4);
    for (let k = 0; k < 3; k++) g.particles.burst(head(), { count: 24, color: k ? LAVA : EMBER, speed: 9, spread: 0.25, dir: tmp.set(0, 6, 0), life: 1, size: 0.5, sizeEnd: 0.1, gravity: 9, intensity: 3 });
    g.particles.burst(head(), { count: 14, color: 0x2a1a14, additive: false, speed: 4, up: 4, life: 1.6, size: 1, sizeEnd: 3, drag: 2 });
    this.blast(c, 3.2, 26, { color: FIRE, knock: 12, stagger: 0.7 });
    g.audio?.energy('explode');
    for (let i = 0; i < 9; i++) this.after(0.15 + i * 0.07, () => {
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 5.5;
      const at = new THREE.Vector3(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r); at.y = this.groundAt(at.x, at.z, c.y);
      this.lob(head(), at, 0.7, () => { this.blast(at, 2, 22 + this.rank('volcano') * 5, { color: FIRE, knock: 5, stagger: 0.4, explode: true }); if (i % 3 === 0) this.lava(at, 1.2, 12, 2.5); }, 0.85);
    });
    this.after(0.7, () => { if (p.action?.lock) p.action = null; });
  }
  emberShield() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const bugs = [];
    for (let i = 0; i < 4 + Math.ceil(this.insectBonus / 2); i++) { const m = new THREE.Mesh(this.bugGeo, this.bugMat); g.scene.add(m); bugs.push(m); }
    g.audio?.energy('fire');
    this.buff('ember_shield', 10, {
      incoming: (a, src) => {
        const m = bugs.pop(); if (!m) return a;
        g.scene.remove(m);
        g.fx.explosion(m.position, FIRE, 1.2);
        const t = src && src.maxHp && !src.dead && src.pos ? src : this.target(10);
        if (t && !t.dead) { this.burn(t, 20, { stagger: 0.4 }); g.fx.explosion(t.pos.clone().setY(t.pos.y + 1), FIRE, 1.4); }
        g.audio?.impact(0.9);
        if (!bugs.length) { const b = this.buffs.get('ember_shield'); if (b) b.left = 0.01; }
        return a * 0.15;
      },
      onTick: () => {
        const T = g.time * 3;
        bugs.forEach((m, i) => {
          const a = T + i / bugs.length * Math.PI * 2;
          m.position.set(p.pos.x + Math.cos(a) * 1.3, p.pos.y + 1.1 + Math.sin(T * 2 + i) * 0.3, p.pos.z + Math.sin(a) * 1.3); m.rotation.y = -a;
          if (Math.random() < 0.25) g.particles.burst(m.position, { count: 1, color: FIRE, speed: 0.3, life: 0.3, size: 0.2, sizeEnd: 0.02 });
        });
      },
      onEnd: () => { for (const m of bugs) g.scene.remove(m); bugs.length = 0; },
    });
  }
  emberMines() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const c = this.aimGround(10), N = 5 + Math.floor(this.insectBonus / 2), R = 2.6;
    const mines = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, at = c.clone().add(tmp.set(Math.cos(a) * R, 0, Math.sin(a) * R)); at.y = this.groundAt(at.x, at.z, c.y);
      const m = new THREE.Mesh(this.bugGeo, this.bugMat); m.position.copy(at).setY(at.y + 0.1); m.rotation.y = a; g.scene.add(m);
      mines.push({ at, m, live: true });
      g.fx.rings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: EMBER, r0: 0.2, r1: 1.5, dur: 0.3, thick: 0.08 });
    }
    const pop = (mn, e) => {
      mn.live = false; g.scene.remove(mn.m);
      const at = (e && !e.dead ? e.pos : mn.at).clone().setY(mn.at.y + 0.6);
      g.combat.aoe(at, 1.8, 26 + this.rank('insects') * 5, p, { knock: 5, stagger: 0.5 });
      g.fx.explosion(at, FIRE, 1.5); g.audio?.impact(0.9);
      if (this.emberHeart) p.gainCE(1);
    };
    this.during(12, (t) => {
      let any = false;
      for (const mn of mines) {
        if (!mn.live) continue; any = true;
        mn.m.position.y = mn.at.y + 0.1 + Math.abs(Math.sin(t * 6 + mn.at.x)) * 0.08;
        if (Math.random() < 0.05) g.particles.burst(mn.m.position, { count: 1, color: FIRE, speed: 0.4, up: 1, life: 0.3, size: 0.15 });
        const e = t > 0.4 && this.foes(mn.at, 1.7)[0];
        if (e) { mn.live = false; const from = mn.m.position.clone(); this.during(0.15, (tt, dt, k) => { mn.m.position.lerpVectors(from, e.pos.clone().setY(e.pos.y + 1), k); }, () => pop(mn, e)); }
      }
      return any;
    }, () => { for (const mn of mines) if (mn.live) pop(mn, null); });
  }
  firestorm() {
    const g = this.game, p = this.p;
    this.cast(0.6, true);
    const c = this.aimGround(12), R = 6;
    g.toast?.('Ember Firestorm');
    g.markers.spawn({ pos: c, dur: 0.6, radius: R, color: FIRE });
    g.audio?.energy('fire');
    const light = g.lights.flash(c.clone().setY(c.y + 6), FIRE, 6, R * 2.5, 4.6, { priority: 4, fade: false });
    this.after(0.5, () => {
      let tick = 0;
      this.during(4, (t, dt) => {
        // the swarm overhead
        for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * R; g.particles.glow.spawn({ x: c.x + Math.cos(a) * r, y: c.y + 6 + Math.random() * 2, z: c.z + Math.sin(a) * r, vx: Math.sin(a + t) * 3, vy: (Math.random() - 0.5), vz: Math.cos(a + t) * 3, life: 0.5, r: 3, g: 1.6, b: 0.4, size: 0.22, drag: 1, sizeEnd: 0.3 }); }
        tick -= dt; if (tick > 0) return;
        tick = 0.12;
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
        const at = new THREE.Vector3(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r); at.y = this.groundAt(at.x, at.z, c.y);
        g.projectiles.fire({ pos: at.clone().add(tmp.set(0.6, 7, 0.3)), vel: new THREE.Vector3(-1.2, -22, -0.6), team: 'player', shape: 'cube', color: EMBER, emissive: 5, scale: 0.9, life: 0.32, radius: 0.5, ghost: true,
          onExpire: (q) => { g.combat.aoe(at, 1.6, 14 + this.rank('insects') * 4, p, { knock: 3, stagger: 0.3 }); g.fx.explosion(at.clone().setY(at.y + 0.4), FIRE, 1.2); if (this.emberHeart && Math.random() < 0.3) p.gainCE(1); } });
        if (Math.random() < 0.3) g.audio?.impact(0.7);
      }, () => g.lights.remove(light));
    });
  }
  flamePillar() {
    const g = this.game, p = this.p;
    const t = this.target(14);
    const at = t ? t.pos.clone() : this.aimGround(12);
    at.y = this.groundAt(at.x, at.z, at.y);
    this.cast(0.4, true);
    g.markers.spawn({ pos: at, dur: 0.55, radius: 1.9, color: FIRE });
    this.during(0.55, () => { g.particles.glow.spawn({ x: at.x + (Math.random() - 0.5) * 2, y: at.y + 0.1, z: at.z + (Math.random() - 0.5) * 2, vy: 2, life: 0.4, r: 3, g: 1, b: 0.2, size: 0.15, drag: 1, sizeEnd: 0.5, shape: 'square' }); });
    this.after(0.55, () => {
      g.combat.aoe(at, 1.9, 75 + this.rank('orb') * 10, p, { knock: 2, stagger: 0.9, unblockable: true });
      for (const e of this.foes(at, 2.2)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 10);
      this.during(0.6, () => { for (let i = 0; i < 6; i++) g.particles.glow.spawn({ x: at.x + (Math.random() - 0.5) * 1.4, y: at.y + Math.random() * 2, z: at.z + (Math.random() - 0.5) * 1.4, vy: 14 + Math.random() * 6, life: 0.6, r: 3, g: 1.2 + Math.random(), b: 0.25, size: 0.7, drag: 0.5 }); });
      g.fx.shockwave(at, FIRE, 3); g.lights.flash(at.clone().setY(at.y + 4), FIRE, 18, 14, 0.6, { priority: 5 });
      this.lava(at, 1.4, 14, 3);
      g.shake(0.35); g.hitStop(0.04); g.audio?.energy('explode');
    });
  }
  meteorSwarm() {
    const g = this.game, p = this.p, rk = this.rank('meteor');
    const c = this.aimGround(14);
    p.action = { type: 'cast', both: true, dur: 0.8, elapsed: 0, t: 0, moveScale: 0.2, lock: true, faceAim: true };
    g.toast?.('Maximum: Meteor Swarm'); g.audio?.charge(1.2, 0.6);
    for (let i = 0; i < 5; i++) {
      const at = i ? c.clone().add(tmp.set((Math.random() - 0.5) * 9, 0, (Math.random() - 0.5) * 9)) : c.clone(); at.y = this.groundAt(at.x, at.z, c.y);
      const R = 3 + rk * 0.4, FALL = 1.1 + i * 0.22;
      g.markers.spawn({ pos: at, dur: FALL, radius: R, color: FIRE });
      const rock = new THREE.Mesh(this.rockGeo, this.rockMat); rock.scale.setScalar(0.9 + rk * 0.15);
      const start = at.clone().add(new THREE.Vector3(-Math.sin(p.facing) * 6, 20, -Math.cos(p.facing) * 6));
      rock.position.copy(start); g.scene.add(rock);
      this.during(FALL, (t, dt, k) => {
        rock.position.lerpVectors(start, at, k * k); rock.rotation.x += dt * 4;
        for (let j = 0; j < 2; j++) g.particles.burst(rock.position, { count: 1, color: Math.random() < 0.5 ? FIRE : EMBER, speed: 1, up: 1, life: 0.5, size: 0.8, sizeEnd: 2, intensity: 3 });
      }, () => {
        g.scene.remove(rock);
        this.blast(at, R, 48 + rk * 14, { color: FIRE, knock: 10, stagger: 0.8, falloff: true });
        this.lava(at, R * 0.5, 16, 3);
        for (let j = 0; j < 8; j++) g.debris.spawn(at.clone().setY(at.y + 0.5), new THREE.Vector3((Math.random() - 0.5) * 10, 5 + Math.random() * 6, (Math.random() - 0.5) * 10), 0.25, new THREE.Color(Math.random() < 0.4 ? 0xff5a1a : 0x3a2a24), 2);
        g.hitStop(0.03); g.audio?.energy('explode');
      });
    }
  }
  boilingPoint() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const head = p.pos.clone().setY(p.pos.y + 2.3);
    g.particles.burst(head, { count: 24, color: 0xe8e8f0, additive: false, speed: 6, spread: 0.4, dir: tmp.set(0, 5, 0), life: 1.2, size: 0.8, sizeEnd: 2.5, drag: 2 });
    g.audio?.noise({ dur: 0.7, gain: 0.4, type: 'highpass', freq: 1800, sweep: 4000 });
    this.blast(p.pos.clone(), 3.8, 12, { color: 0xffd0a0, knock: 12, stagger: 0.6, explode: false });
    this.statBuff('boiling', 4, { armor: 0.3 }, {
      onTick: () => { if (Math.random() < 0.4) g.particles.smoke.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.4, y: p.pos.y + 2.4, z: p.pos.z + (Math.random() - 0.5) * 0.4, vy: 2.5, life: 0.9, r: 0.7, g: 0.7, b: 0.72, size: 0.5, gravity: -0.5, drag: 1, sizeEnd: 1.6 }); },
    });
  }
  fireDash() {
    const g = this.game, p = this.p;
    const from = p.pos.clone(), f = this.fwd();
    g.audio?.whoosh(1.2); g.audio?.energy('fire');
    this.dash(f, 7, 0.24, { hitR: 1.5, dmg: 16, color: FIRE, hitOpts: { color: '#ff8a3a' },
      onEnd: () => { const L = from.distanceTo(p.pos); for (let s = 0.8; s < L; s += 1.6) this.lava(from.clone().addScaledVector(f, s), 0.9, 12, 2.5); } });
    this.during(0.24, () => g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.4, p.pos.z), { count: 3, color: Math.random() < 0.5 ? FIRE : EMBER, speed: 2, life: 0.4, size: 0.5, sizeEnd: 0.05 }));
  }
  eruptionLeap() {
    const g = this.game, p = this.p;
    const to = this.aimGround(10), from = p.pos.clone();
    this.blast(from.clone(), 2.2, 14, { color: FIRE, knock: 6, stagger: 0.3 });
    p.invulnerable = true;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.9, windup: 0.3 }, style: 'slam', dur: 0.65, elapsed: 0, t: 0, windup: 0.3, strike: 0.9, struck: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    g.markers.spawn({ pos: to, dur: 0.55, radius: 3.4, color: FIRE });
    g.audio?.whoosh(1.4);
    this.during(0.55, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 4;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.2, p.pos.z), { count: 3, color: Math.random() < 0.5 ? FIRE : EMBER, speed: 2, spread: 0.4, dir: tmp2.set(0, -3, 0), life: 0.4, size: 0.5, sizeEnd: 0.05 });
    }, () => {
      p.invulnerable = false; p.action = null;
      this.erupt(p.pos.clone(), 0.01, 1);
      g.fx.landDust(p.pos, 30); g.shake(0.4);
    });
  }
}
registerKit('jogo', JogoKit, JOGO_SKILLS);
