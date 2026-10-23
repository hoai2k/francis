// Hanami-style kit — Disaster Plants. 22 abilities on the technique tree;
// four are equipped (RMB takes a basic one) plus F.
//   LMB        heavy wooden-armed blows; the slam drives roots up around you.
//   Wood       Wooden Ball Barrage (start, RMB), Seed Bullet, Branch Lash,
//              Wooden Shield, Great Seed
//   Roots      Root Spikes, Root Bind, Root Upheaval, Root Surge, Root Cage
//   Buds       Cursed Buds, Burst Bloom, Draining Vine, Pollen Cloud, Seed Rain
//   Flowers    Bloom of Life, Flower Field, Petal Storm, Flower of the Eye
//   Forest     Verdant Step, Sacred Tree, Disaster Plants: Overgrowth
//   F          Domain: Ceremonial Sea of Light — a sunlit sea of flowers under
//              great trees. The flowers sap every curse's Cursed Energy (slower,
//              faltering attacks; Hanami drinks it in as healing) and the sure-hit is wood: roots
//              spear up under every curse inside.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { beamMaterial } from '../gfx/orbs.js';

const LEAF = 0x6adf6a, BLOOM = 0xff9ad8, WOOD = 0x8a5a2a, SAP = 0xb8ff6a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('hanami', { name: 'Hanami', technique: 'Disaster Plants', rarity: 'rare', title: 'Disaster Curse', desc: 'Wooden ball barrages, root spikes, life-draining cursed buds and a calming Flower Field.', domain: 'Ceremonial Sea of Light', color: '#6adf6a' });

registerLook('hanami', {
  paint: { skinTone: 0xd8d4c4, hair: 0xd8d4c4, brow: 0xd8d4c4, top: 0xd8d4c4, kimono: true, sash: 0x5a3a7a, scarf: 0xeeeae0, sleeve: 0xd8d4c4, pants: 0x2a2a2e, skirt: 0xeeeae0, shoes: 0xb8b4a4, eye: 0x3a2a1a, eyeWhite: 0x2a2018, fringe: 0, hairSide: 0, hairBack: 0 },
  paintExtra: (S) => {
    // black markings across the face, a blank mouthless jaw
    for (let y = 9; y < 16; y++) { S.px(8, y, 0x1a1a1a); S.px(15, y, 0x1a1a1a); }
    S.rect(9, 15, 6, 1, 0x1a1a1a, 0.05);
    for (let y = 20; y < 32; y += 2) { S.px(20, y, 0x2a2a2a); S.px(27, y, 0x2a2a2a); }
  },
  hair: () => [], hairColor: 0xd8d4c4, accent: LEAF, emit: 0.2, scale: 1.38,
  cape: { color: 0xeeeae0, length: 9, width: 7, segments: 3 },
  props(rig, K) {
    // wooden branches growing out of the eye sockets
    const wood = K.mat(WOOD, { roughness: 0.9 }), leaf = K.mat(LEAF, { emissive: 0.4 }), flower = K.mat(BLOOM, { emissive: 0.8 });
    for (const s of [-1, 1]) {
      K.box(rig.head, 1.2, 4, 1.2, wood, s * 1.8, 5.5, 4.4, 0.9, 0, s * -0.35);
      K.box(rig.head, 1, 3, 1, wood, s * 2.6, 8, 5.6, 0.3, 0, s * -0.7);
      K.box(rig.head, 1.4, 1.4, 1.4, leaf, s * 3.2, 9.4, 5.8);
    }
    K.box(rig.head, 1.4, 1.4, 1.4, flower, 3.4, 10.4, 5.2, 0.4, 0.4);
    // the white cloth over the left shoulder
    K.box(rig.torso, 5, 3, 5, K.mat(0xeeeae0, { roughness: 0.95 }), 3.6, 11, 0, 0, 0, -0.3);
    // root-wrapped forearms
    K.box(rig.handR, 2.2, 3, 2.2, wood, 0, -0.5, 0);
    K.box(rig.handL, 2.2, 3, 2.2, wood, 0, -0.5, 0);
  },
});

registerDomainEnv('ceremonial_sea_of_light', {
  skyTop: 0x2a6a9a, skyHorizon: 0xffe0a0, fog: 0x8ab070, fogDensity: 0.012, hemiSky: 0xfff0c0, hemiGround: 0x2a5a1a, hemiI: 1.4, sun: 0xfff0d0, sunI: 1.4,
  grade: { tint: [1.02, 1.06, 0.95], lift: [0.01, 0.02, 0.0], sat: 1.3, contrast: 1.05, vignette: 0.35 }, floor: B.moss_floor,
});

export const HANAMI_SKILLS = [
  { id: 'heartwood', name: 'Heartwood', icon: '🪵', desc: '+8% melee damage and +10 max HP per rank.', max: 3, branch: 'Forest', tier: 0 },
  { id: 'balls', name: 'Wooden Balls', icon: '🟤', desc: 'More, harder wooden balls and seeds.', max: 3, req: 'ab:balls', branch: 'Wood', tier: 1 },
  { id: 'roots', name: 'Root Spikes', icon: '🌿', desc: 'Root techniques reach further and hit harder.', max: 3, req: 'ab:root_spikes', branch: 'Roots', tier: 2 },
  { id: 'buds', name: 'Cursed Buds', icon: '🌱', desc: 'Buds drain faster and heal more.', max: 3, req: 'ab:buds', branch: 'Buds', tier: 2 },
  { id: 'field', name: 'Flower Field', icon: '🌸', desc: 'Flower Field is wider and lasts longer.', max: 2, req: 'ab:flower_field', branch: 'Flowers', tier: 3 },
  { id: 'sea', name: 'Sea of Light', icon: '☀️', desc: 'Ceremonial Sea of Light lasts 2s longer and its roots hit harder.', max: 1, req: 'field', branch: 'Flowers', tier: 5 },
];

class HanamiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const wood = { trail: LEAF, sparkColor: 0xd8ffa0 };
    this.combo = [
      { ...wood, style: 'punch', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 15, range: 2.9, arc: 1.1, lunge: 5, knock: 5, stop: 0.06, shake: 0.2 },
      { ...wood, style: 'swingL', dur: 0.38, windup: 0.32, strike: 0.55, dmg: 16, range: 3, arc: 1.3, lunge: 5, knock: 5, stop: 0.06, shake: 0.2 },
      { ...wood, style: 'slam', dur: 0.62, windup: 0.46, strike: 0.62, dmg: 32, range: 3.6, arc: Math.PI, lunge: 3, knock: 12, stop: 0.11, shake: 0.5, ring: true, ringColor: LEAF, stagger: 0.7, roots: true },
    ];
    this.p.stats.meleeMult += r('heartwood') * 0.08;
    this.p.maxHp += r('heartwood') * 10; this.p.hp = Math.min(this.p.hp + r('heartwood') * 10, this.p.maxHp);
    this.branches = ['Wood', 'Roots', 'Buds', 'Flowers', 'Forest'];
    this.rootMul = 1; this.rootHold = 1; this.budBonus = 0;
    this.library = {
      // ---- Wood
      balls: ability({ name: 'Wooden Ball Barrage', icon: '🟤', kind: 'basic', desc: 'A burst of hard wooden balls.', cd: 1.3, ce: 0, branch: 'Wood', tier: 0, start: true, legacy: 'ranged', use: () => this.balls() }),
      seed_shot: ability({ name: 'Seed Bullet', icon: '🌰', kind: 'basic', desc: 'One hard seed that pierces every curse in a line; the first it hits sprouts a cursed bud.', cd: 1.1, ce: 0, branch: 'Wood', tier: 1, req: 'balls', use: () => this.seedShot() }),
      branch_lash: ability({ name: 'Branch Lash', icon: '🎋', kind: 'technique', desc: 'Your arm grows into a long branch and sweeps everything in front of you aside.', cd: 5, ce: 8, branch: 'Wood', tier: 2, req: 'seed_shot', use: () => this.branchLash() }),
      wood_shield: ability({ name: 'Wooden Shield', icon: '🛡️', kind: 'defence', desc: 'Wooden planks grow around you for 6s and soak up to 70 damage.', cd: 14, ce: 10, branch: 'Wood', tier: 2, req: 'balls', use: () => this.woodShield() }),
      great_seed: ability({ name: 'Great Seed', icon: '🥥', kind: 'technique', desc: 'A colossal wooden seed rolls forward, flattening every curse in its path.', cd: 10, ce: 16, branch: 'Wood', tier: 3, req: 'branch_lash', use: () => this.greatSeed() }),
      // ---- Roots
      root_spikes: ability({ name: 'Root Spikes', icon: '🌿', kind: 'technique', desc: 'A line of sharpened roots tears out of the ground.', cd: 6, ce: 12, branch: 'Roots', tier: 1, legacy: 't1', use: () => this.rootLine() }),
      root_bind: ability({ name: 'Root Bind', icon: '🪢', kind: 'technique', desc: 'Roots burst up around the aim point and bind every curse there in place.', cd: 10, ce: 14, branch: 'Roots', tier: 2, req: 'root_spikes', use: () => this.rootBind() }),
      root_wave: ability({ name: 'Root Upheaval', icon: '🌀', kind: 'technique', desc: 'Three rings of roots burst outward from you, one after another.', cd: 9, ce: 14, branch: 'Roots', tier: 2, req: 'root_spikes', use: () => this.rootWave() }),
      root_surge: ability({ name: 'Root Surge', icon: '🏄', kind: 'movement', desc: 'Ride a surging root forward, spearing what you pass.', cd: 6, ce: 6, branch: 'Roots', tier: 3, req: 'root_wave', use: () => this.rootSurge() }),
      root_cage: ability({ name: 'Root Cage', icon: '🪺', kind: 'technique', desc: 'A cage of giant roots closes around the aim point for 4s: curses inside cannot get out and are speared again and again.', cd: 18, ce: 26, branch: 'Roots', tier: 4, req: 'root_bind', use: () => this.rootCage() }),
      // ---- Buds
      buds: ability({ name: 'Cursed Buds', icon: '🌱', kind: 'technique', desc: 'Seeds latch onto curses and drain their life and Cursed Energy into you.', cd: 10, ce: 16, branch: 'Buds', tier: 1, legacy: 't2', use: () => this.buds() }),
      burst_bloom: ability({ name: 'Burst Bloom', icon: '🌺', kind: 'technique', desc: 'Every budded curse bursts into a storm of razor petals; you heal for each one.', cd: 7, ce: 10, branch: 'Buds', tier: 2, req: 'buds', use: () => this.burstBloom() }),
      draining_vine: ability({ name: 'Draining Vine', icon: '🧬', kind: 'heal', desc: 'A vine latches onto a curse for 3s and pumps its life into you.', cd: 12, ce: 12, branch: 'Buds', tier: 3, req: 'buds', use: () => this.drainingVine() }),
      pollen: ability({ name: 'Pollen Cloud', icon: '🌼', kind: 'technique', desc: 'A heavy cloud of cursed pollen hangs over the aim for 6s: curses inside slow, choke and falter.', cd: 14, ce: 14, branch: 'Buds', tier: 3, req: 'burst_bloom', use: () => this.pollen() }),
      seed_rain: ability({ name: 'Seed Rain', icon: '🌧️', kind: 'technique', desc: 'Scatter seeds high into the air: they rain over an area and bud every curse they strike.', cd: 16, ce: 22, branch: 'Buds', tier: 4, req: 'draining_vine', use: () => this.seedRain() }),
      // ---- Flowers
      bloom_of_life: ability({ name: 'Bloom of Life', icon: '💐', kind: 'heal', desc: 'Flowers bloom at your feet and restore 25% of your health over 4s (allies nearby heal too).', cd: 24, ce: 18, branch: 'Flowers', tier: 1, use: () => this.bloomOfLife() }),
      flower_field: ability({ name: 'Flower Field', icon: '🌸', kind: 'buff', desc: 'A field of flowers blooms around you; curses inside are calmed while you regenerate.', cd: 18, ce: 30, branch: 'Flowers', tier: 2, legacy: 't3', req: 'bloom_of_life', use: () => this.flowerField() }),
      petal_storm: ability({ name: 'Petal Storm', icon: '🌪️', kind: 'technique', desc: 'Razor petals whirl around you for 3s, cutting every curse that comes close.', cd: 12, ce: 16, branch: 'Flowers', tier: 3, req: 'flower_field', use: () => this.petalStorm() }),
      flower_eye: ability({ name: 'Flower of the Eye', icon: '👁️', kind: 'technique', desc: 'Draw the life of the land in through the flower in your eye, then release it as a colossal beam. Heals you.', cd: 24, ce: 45, branch: 'Flowers', tier: 4, req: 'petal_storm', use: () => this.flowerEye() }),
      // ---- Forest
      verdant_step: ability({ name: 'Verdant Step', icon: '🍃', kind: 'movement', desc: 'Sink into the earth and rise from it at the aim point.', cd: 7, ce: 6, branch: 'Forest', tier: 1, use: () => this.verdantStep() }),
      sacred_tree: ability({ name: 'Sacred Tree', icon: '🌳', kind: 'summon', desc: 'A great tree grows at the aim for 10s: its roots spear nearby curses and its shade heals you.', cd: 20, ce: 22, branch: 'Forest', tier: 3, req: 'verdant_step', use: () => this.sacredTree() }),
      overgrowth: ability({ name: 'Disaster Plants: Overgrowth', icon: '🌲', kind: 'technique', desc: 'The forest erupts: giant roots and trunks burst out of the ground all around you at marked spots.', cd: 22, ce: 40, branch: 'Forest', tier: 4, req: 'sacred_tree', use: () => this.overgrowth() }),
    };
    this.passives = {
      photosynthesis: passive({ name: 'Photosynthesis', icon: '☀️', desc: 'Standing still, you regenerate 1.5% of your health per second.', branch: 'Flowers', tier: 2, req: 'bloom_of_life', apply: (pl, k) => { k.photo = true; } }),
      thorned_bark: passive({ name: 'Thorned Bark', icon: '🌵', desc: '+6% damage reduction; curses that strike you up close are pierced by thorns.', branch: 'Wood', tier: 3, req: 'wood_shield', apply: (pl, k) => { pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.06); k.thorns = true; } }),
      deep_roots: passive({ name: 'Deep Roots', icon: '🌳', desc: 'Root techniques hit 20% harder and hold curses 50% longer.', branch: 'Roots', tier: 3, req: 'root_bind', apply: (pl, k) => { k.rootMul *= 1.2; k.rootHold *= 1.5; } }),
      bountiful: passive({ name: 'Bountiful Buds', icon: '🌱', desc: 'Buds last 2s longer and planting one restores 2 Cursed Energy.', branch: 'Buds', tier: 2, req: 'buds', apply: (pl, k) => { k.budBonus += 2; } }),
    };
    // Ceremonial Sea of Light: a sunlit sea of flowers under great trees. The
    // flowers sap the Cursed Energy of everything inside (their attacks come
    // slower and falter, Hanami drinks it in) and the sure-hit is wood — roots
    // spear up under every curse in the domain, again and again.
    this.domain = {
      name: 'Ceremonial Sea of Light', icon: '🌸', key: 'ceremonial_sea_of_light', type: 6, color: BLOOM, sound: 'garden', flash: 0xfff0c0,
      look: { floor: 0x4a8a2a, seam: 0xfff0a0, sparkle: 0xffb0e0, skyTop: 0x5a9ad8, skyHorizon: 0xfff0c8, stars: 0, band: 0xffffff },
      duration: 8 + r('sea') * 2, radius: 24,
      onStart: (g, d) => { this.buildSea(g, d); g.toast?.('The flowers sap the Cursed Energy of every curse inside'); },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0.3) - dt;
        // petals drifting and motes of light rising out of the flowers
        for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.glow.spawn({ x: d.center.x + Math.cos(a) * rr, y: d.center.y + 0.5 + Math.random() * 4, z: d.center.z + Math.sin(a) * rr, vx: 1, vy: -0.4, vz: 0.5, life: 2, r: 2.4, g: 1.2, b: 1.8, size: 0.14, drag: 0.5, sizeEnd: 0.8, shape: 'square' }); }
        for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.glow.spawn({ x: d.center.x + Math.cos(a) * rr, y: d.center.y + 0.3, z: d.center.z + Math.sin(a) * rr, vy: 1 + Math.random(), life: 2.2, r: 2.6, g: 2.5, b: 1.6, size: 0.1, gravity: -0.2, drag: 0.5, sizeEnd: 0.4 }); }
        // the sap: every curse inside loses Cursed Energy continuously
        for (const e of g.enemies) if (!e.dead && !e.isDummy && g.domainSys.inside(e.pos)) {
          e.cd = (e.cd ?? 0) + dt * 0.5; e.slowT = Math.max(e.slowT ?? 0, 0.3);
          if (Math.random() < dt * 3) g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.7), { count: 2, color: SAP, speed: 0, dir: tmp.clone().subVectors(this.p.pos, e.pos).setY(0.4).normalize().multiplyScalar(5), spread: 0.15, life: 0.8, size: 0.14, shape: 1 });
        }
        if (d.tick > 0) return;
        d.tick = 0.7;
        let drained = 0, n = 0;
        for (const e of g.enemies) if (!e.dead && !e.isDummy && g.domainSys.inside(e.pos)) {
          n++;
          // sure-hit wooden attack: roots tear up under the curse
          const at = e.pos.clone(); at.y = this.groundAt(at.x, at.z, at.y);
          for (let k = 0; k < 3; k++) this.rootStab(at.clone().add(new THREE.Vector3((Math.random() - 0.5) * e.radius * 2, 0, (Math.random() - 0.5) * e.radius * 2)), 1.6 + e.height * 0.9, 0.35 + Math.random() * 0.2);
          const dmg = (14 + r('sea') * 6) + (e.maxHp ?? 100) * (e.isBoss ? 0.012 : 0.07);
          drained += g.combat.damageEnemy(e, dmg, this.p, { stagger: 0.35, ceGain: 0, unblockable: true, crit: false, color: '#b8ff6a' });
          if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 4);
          // sapped curses lose the strength to finish an attack
          if (!e.isBoss && e.state === 'windup' && Math.random() < 0.4) { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.5; }
        }
        if (n) { this.p.heal(drained * 0.08, true); g.audio?.breakBlock('wood'); g.shake(0.12); }
      },
      onEnd: () => this.clearSea(),
    };
    this.roots = [];
    this.rootGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    this.rootMat = new THREE.MeshStandardNodeMaterial({ color: 0x6a4420, roughness: 0.95 });
  }
  dispose() { super.dispose(); this.clearSea(); for (const rt of this.roots) this.game.scene.remove(rt.m); this.roots = []; }
  // A sharpened root that spears out of the ground and sinks back.
  rootStab(at, h = 2.2, w = 0.5) {
    if (this.roots.length >= 48) return;
    const m = new THREE.Mesh(this.rootGeo, this.rootMat);
    m.position.copy(at).setY(at.y - 0.2);
    m.rotation.set((Math.random() - 0.5) * 0.7, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.7);
    m.scale.set(w, 0.01, w); m.castShadow = true;
    this.game.scene.add(m);
    this.roots.push({ m, t: 0, h, w });
  }
  tick(dt) {
    if (this.photo) {
      const p = this.p, lp = this.lastPos ?? (this.lastPos = p.pos.clone());
      if (p.pos.distanceToSquared(lp) < 0.0004 * Math.max(1, dt * 60) && p.hp < p.maxHp && !p.dead) { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.015 * dt); if (Math.random() < dt * 4) this.game.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.2, p.pos.z), { count: 1, color: LEAF, speed: 0.3, up: 2, life: 0.8, size: 0.12 }); }
      lp.copy(p.pos);
    }
    for (let i = this.roots.length - 1; i >= 0; i--) {
      const rt = this.roots[i]; rt.t += dt;
      const k = rt.t < 0.1 ? rt.t / 0.1 : rt.t < 0.5 ? 1 : Math.max(0, 1 - (rt.t - 0.5) / 0.3);
      rt.m.scale.set(rt.w * (0.6 + k * 0.4), Math.max(0.01, rt.h * k), rt.w * (0.6 + k * 0.4));
      if (rt.t >= 0.8) { this.game.scene.remove(rt.m); this.roots.splice(i, 1); }
    }
  }
  // Sea of flowers set-piece: instanced flowers carpeting the domain, great
  // trees around the rim and roots arching out of the ground.
  buildSea(g, d) {
    this.clearSea();
    const grp = new THREE.Group(), box = new THREE.BoxGeometry(1, 1, 1);
    const N = 260, R = d.radius - 1;
    const stems = new THREE.InstancedMesh(box, new THREE.MeshStandardNodeMaterial({ color: 0x3a8a2a, roughness: 0.8 }), N);
    const heads = new THREE.InstancedMesh(box, new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0xffe0f0, emissiveIntensity: 0.35 }), N);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
    const petals = [0xff9ad8, 0xffffff, 0xffe06a, 0xd8a0ff, 0xff6a8a, 0xa0d8ff];
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      const x = d.center.x + Math.cos(a) * rr, z = d.center.z + Math.sin(a) * rr, y = this.groundAt(x, z, d.center.y);
      const h = 0.3 + Math.random() * 0.4;
      q.setFromAxisAngle(tmp.set(0, 1, 0), Math.random() * Math.PI);
      M.compose(pos.set(x, y + h * 0.5, z), q, sc.set(0.06, h, 0.06)); stems.setMatrixAt(i, M);
      M.compose(pos.set(x, y + h + 0.06, z), q, sc.set(0.22, 0.1, 0.22)); heads.setMatrixAt(i, M);
      heads.setColorAt(i, col.set(petals[i % petals.length]));
    }
    grp.add(stems, heads);
    // great trees with pale blossom canopies around the rim
    const bark = new THREE.MeshStandardNodeMaterial({ color: 0x5a3a1e, roughness: 0.95 });
    const bloom = new THREE.MeshStandardNodeMaterial({ color: 0xffc8e8, roughness: 0.7, emissive: 0xff9ad8, emissiveIntensity: 0.25 });
    const leaf = new THREE.MeshStandardNodeMaterial({ color: 0x5aa83a, roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3, rr = R - 2;
      const x = d.center.x + Math.cos(a) * rr, z = d.center.z + Math.sin(a) * rr, y = this.groundAt(x, z, d.center.y);
      const add = (m, w, h, dd, px, py, pz, rx = 0, rz = 0) => { const o = new THREE.Mesh(box, m); o.scale.set(w, h, dd); o.position.set(px, py, pz); o.rotation.set(rx, 0, rz); o.castShadow = true; grp.add(o); return o; };
      add(bark, 1.4, 9, 1.4, x, y + 4.5, z);
      add(bark, 0.7, 4, 0.7, x + 1.2, y + 7.5, z, 0, -0.7);
      add(bark, 0.7, 4, 0.7, x - 1.2, y + 7, z, 0, 0.7);
      add(i % 2 ? bloom : leaf, 6, 3, 6, x, y + 10, z);
      add(bloom, 4, 2, 4, x + 0.6, y + 12, z - 0.4);
      // roots arching out of the ground towards the centre
      for (let k = 0; k < 3; k++) {
        const ra = a + Math.PI + (k - 1) * 0.5;
        add(bark, 0.5, 4, 0.5, x + Math.cos(ra) * 1.6, y + 0.6, z + Math.sin(ra) * 1.6, Math.sin(ra) * 1.1, -Math.cos(ra) * 1.1);
      }
    }
    grp.userData.box = box;
    grp.scale.y = 0.01; g.scene.add(grp); this.sea = grp;
    this.seaLight = g.lights.flash(d.center.clone().setY(d.center.y + 6), 0xfff0c0, 5, d.radius * 1.8, 60, { priority: 4, fade: false });
    let t = 0; g.addUpdater((dt) => { t += dt; grp.scale.y = Math.min(1, t * 2); return t < 0.5 && this.sea === grp; });
  }
  clearSea() {
    const g = this.game;
    if (this.sea) { g.scene.remove(this.sea); this.sea.userData.box?.dispose(); this.sea = null; }
    if (this.seaLight) { g.lights.remove(this.seaLight); this.seaLight = null; }
  }
  onMeleeHit(e, step) { if (step.roots) this.spike(e.pos.clone(), 1.4, 12); }
  groundAt(x, z, y) { const gy = this.game.world.groundBelow(x, z, y + 3); return isFinite(gy) ? gy : y; }
  // One root spike bursting out of the ground.
  spike(at, R, dmg) {
    const g = this.game, p = this.p;
    at.y = this.groundAt(at.x, at.z, at.y);
    g.combat.aoe(at, R, dmg * this.rootMul, p, { knock: 3, stagger: 0.5 });
    for (const e of g.enemies) if (!e.dead && !e.isBoss && e.pos.distanceTo(at) < R + 0.3) e.vel.y = Math.max(e.vel.y, 7);
    for (let k = 0; k < 2; k++) this.rootStab(at.clone().add(new THREE.Vector3((Math.random() - 0.5) * R, 0, (Math.random() - 0.5) * R)), 1.4 + Math.random() * 0.8, 0.3 + Math.random() * 0.15);
    const c = at.clone().setY(at.y + 0.2);
    g.particles.burst(c, { count: 10, color: WOOD, additive: false, speed: 6, spread: 0.25, dir: tmp.set(0, 2, 0), life: 0.5, size: 0.35, sizeEnd: 0.15, gravity: 10, intensity: 1 });
    g.particles.burst(c, { count: 8, color: LEAF, speed: 4, up: 2, life: 0.5, size: 0.14, shape: 1 });
    g.fx.debris(c, 0x5a4a2a, 3);
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: LEAF, r0: 0.2, r1: R + 0.4, dur: 0.25, thick: 0.15 });
  }
  // -------------------------------------------------------------- RMB
  balls() {
    const g = this.game, p = this.p, rk = this.rank('balls');
    const n = 4 + rk;
    this.cast(0.45);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    for (let i = 0; i < n; i++) this.after(i * 0.07, () => {
      const a = Math.atan2(p.aimDir.x, p.aimDir.z) + (Math.random() - 0.5) * 0.25;
      const dir = new THREE.Vector3(Math.sin(a), 0.04, Math.cos(a));
      g.projectiles.fire({ pos: this.handPos().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4, 0)), vel: dir.multiplyScalar(24), team: 'player', shape: 'orb', color: WOOD, emissive: 0.15, scale: 1.4, life: 0.8, radius: 0.4, gravity: 3,
        homing: target ? 10 : 0, target,
        onHit: (e, q) => { g.combat.damageEnemy(e, 8 + rk * 3, p, { knock: q.vel.clone().setY(0).setLength(3), stagger: 0.25 }); g.fx.hitSpark(q.pos, null, { color: 0xd8b080 }); g.audio?.impact(0.7, 'wood'); },
        onExpire: (q, why) => { if (why === 'wall') g.fx.debris(q.pos, 0x8a5a2a, 2); } });
      g.audio?.whoosh(0.5);
    });
  }
  // -------------------------------------------------------------- Root Spikes
  rootLine() {
    const g = this.game, p = this.p, rk = this.rank('roots');
    this.cast(0.5, true);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const dir = target ? tmp.subVectors(target.pos, p.pos).setY(0).normalize().clone() : p.aimDir.clone().setY(0).normalize();
    const n = 7 + rk * 2, dmg = 22 + rk * 8;
    for (let i = 0; i < n; i++) this.after(i * 0.055, () => {
      const at = p.pos.clone().addScaledVector(dir, 1.6 + i * 1.3).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6));
      this.spike(at, 1.5, dmg);
      if (i % 2 === 0) { g.shake(0.12); g.audio?.breakBlock('wood'); }
    });
    g.audio?.noise({ dur: 0.6, gain: 0.3, type: 'lowpass', freq: 300, sweep: 900 });
  }
  // -------------------------------------------------------------- Cursed Buds
  buds() {
    const g = this.game, p = this.p, rk = this.rank('buds');
    const foes = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 14).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, 4 + rk);
    if (!foes.length) { g.toast?.('No curses to plant on'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    for (const [i, e] of foes.entries()) {
      const vel = new THREE.Vector3((Math.random() - 0.5) * 6, 6, (Math.random() - 0.5) * 6);
      g.projectiles.fire({ pos: this.handPos(), vel, team: 'player', shape: 'cube', color: SAP, emissive: 2, scale: 0.8, life: 2, radius: 0.5, homing: 8, target: e, ghost: true,
        trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: LEAF, speed: 0.3, life: 0.3, size: 0.12 }); },
        onHit: (t) => this.plantBud(t) });
      if (i === 0) g.audio?.energy('spit');
    }
  }
  plantBud(e) {
    const g = this.game, p = this.p, rk = this.rank('buds');
    const life = 4 + this.budBonus;
    if (this.budBonus) p.gainCE(2);
    if (e.budT > 0) { e.budT = life; return; }
    e.budT = life;
    g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), null, { color: SAP });
    let tick = 0;
    g.addUpdater((dt) => {
      if (e.dead) { if (e.budT > 0) { g.fx.splat(e.pos.clone().setY(e.pos.y + 0.6), BLOOM); p.gainCE(6); } e.budT = 0; return false; }
      e.budT -= dt; tick -= dt;
      if (Math.random() < 0.5) g.particles.glow.spawn({ x: e.pos.x + (Math.random() - 0.5) * 0.6, y: e.pos.y + e.height * (0.4 + Math.random() * 0.4), z: e.pos.z + (Math.random() - 0.5) * 0.6, vy: 0.6, life: 0.5, r: 1.4, g: 2.4, b: 0.8, size: 0.14, drag: 1, sizeEnd: 0.4, shape: 'square' });
      if (tick <= 0) {
        tick = 0.5 - rk * 0.06;
        const dealt = g.combat.damageEnemy(e, 7 + rk * 3, p, { stagger: 0, ceGain: 2 + rk, color: '#b8ff6a' });
        p.heal(dealt * (0.25 + rk * 0.08), true);
        // a mote of stolen life floats back to Hanami
        g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + 1), { count: 3, color: SAP, speed: 0, dir: tmp.clone().subVectors(p.pos, e.pos).setY(0.5).normalize().multiplyScalar(4), spread: 0.2, life: 0.6, size: 0.15, shape: 1 });
      }
      if (e.budT <= 0) { g.fx.splat(e.pos.clone().setY(e.pos.y + e.height * 0.6), BLOOM); return false; }
      return true;
    });
  }
  // -------------------------------------------------------------- Flower Field
  flowerField() {
    const g = this.game, p = this.p, rk = this.rank('field');
    const R = 6 + rk * 1.5, dur = 6 + rk * 2;
    this.cast(0.6, true);
    const c = p.pos.clone();
    g.toast?.('Flower Field');
    g.fx.flash(0xffd0f0, 0.25, 0.25);
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: BLOOM, r0: 0.5, r1: R, dur: 0.6, thick: 0.2 });
    g.audio?.energy('heal');
    const light = g.lights.flash(c.clone().setY(c.y + 2), BLOOM, 4, R * 2, dur, { priority: 3, fade: false });
    let t = 0, tick = 0;
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
        const col = i % 2 ? [2.4, 1.2, 1.8] : [2.6, 2.4, 1.2];
        g.particles.glow.spawn({ x: c.x + Math.cos(a) * rr, y: c.y + 0.15, z: c.z + Math.sin(a) * rr, vy: 0.5 + Math.random(), life: 0.9, r: col[0], g: col[1], b: col[2], size: 0.16, gravity: -0.3, drag: 1, sizeEnd: 0.6, shape: 'square' });
      }
      if (tick <= 0) {
        tick = 0.3;
        // calm: curses inside lose their will to fight
        for (const e of g.enemies) {
          if (e.dead || Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > R) continue;
          e.slowT = 0.5;
          if (!e.isBoss && e.state === 'windup' && Math.random() < 0.5) { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.6; g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height + 0.2), { count: 6, color: BLOOM, speed: 1, up: 1, life: 0.7, size: 0.18 }); }
          g.combat.damageEnemy(e, 3, p, { stagger: 0, ceGain: 0.5, color: '#ff9ad8' });
        }
        for (const pl of g.players) if (!pl.dead && pl.pos.distanceTo(c) < R) pl.heal(pl.maxHp * 0.012, true);
      }
      if (t >= dur) { g.lights.remove(light); return false; }
      return true;
    });
  }
  // ============================================================== new abilities
  incoming(a, src) {
    if (this.thorns && src && src.maxHp && !src.dead && src.pos && src.pos.distanceTo(this.p.pos) < 3.5) {
      this.hit(src, 10, { stagger: 0.2, color: '#b8ff6a' });
      this.rootStab(src.pos.clone().setY(this.groundAt(src.pos.x, src.pos.z, src.pos.y)), 1.2, 0.25);
    }
    return a;
  }
  // a wooden mesh helper (shared box geometry)
  woodBox(w, h, d, mat = this.rootMat) { const m = new THREE.Mesh(this.rootGeo, mat); m.scale.set(w, h, d); m.castShadow = true; return m; }
  seedShot() {
    const g = this.game, p = this.p, rk = this.rank('balls');
    this.cast(0.3);
    let first = true;
    g.projectiles.fire({ pos: this.handPos(), vel: p.aimDir.clone().setY(0).normalize().multiplyScalar(34), team: 'player', shape: 'orb', color: 0x6a4420, emissive: 0.3, scale: 1.6, life: 0.7, radius: 0.5, pierce: true,
      trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: LEAF, speed: 0.3, life: 0.3, size: 0.12 }); },
      onHit: (e, q) => { this.hit(e, 20 + rk * 6, { knock: q.vel.clone().setLength(3), stagger: 0.4 }); g.fx.hitSpark(q.pos, null, { color: 0xd8b080 }); if (first) { first = false; this.plantBud(e); } g.audio?.impact(0.9, 'wood'); } });
    g.audio?.whoosh(0.8);
  }
  branchLash() {
    const g = this.game, p = this.p, R = 4.8;
    this.pose('swingR', 0.4);
    const f = this.aimAngle(); p.facing = f;
    const arm = new THREE.Group(), br = this.woodBox(0.35, R, 0.35); br.rotation.x = Math.PI / 2; br.position.z = 0; arm.add(br);
    for (let k = 1; k < 4; k++) { const l = this.woodBox(0.5, 0.25, 0.5, new THREE.MeshStandardNodeMaterial({ color: LEAF, emissive: LEAF, emissiveIntensity: 0.3 })); l.position.set(0, 0.1, k * R / 4); arm.add(l); }
    g.scene.add(arm);
    const hitSet = new Set();
    this.during(0.32, (t, dt, k) => {
      const a = f + 1.6 - k * 3.2;
      arm.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z); arm.rotation.y = a;
      const dir = tmp.set(Math.sin(a), 0, Math.cos(a));
      this.line(p.pos, dir, R, 0.7, (e) => {
        if (hitSet.has(e)) return; hitSet.add(e);
        this.hit(e, 26 + this.rank('balls') * 4, { melee: true, stagger: 0.6, knock: tmp2.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9) });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: LEAF });
      });
      if (Math.random() < 0.6) g.particles.burst(tmp2.set(p.pos.x + dir.x * R, p.pos.y + 1.1, p.pos.z + dir.z * R), { count: 2, color: LEAF, speed: 1, life: 0.4, size: 0.14 });
    }, () => { g.scene.remove(arm); });
    g.fx.slashArc(p.pos, f, LEAF, R, 1.6, 0.3);
    g.audio?.whoosh(1.2); this.after(0.12, () => g.audio?.impact(1, 'wood'));
  }
  woodShield() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const planks = [];
    for (let i = 0; i < 8; i++) { const m = this.woodBox(0.5, 2.2, 0.25); g.scene.add(m); planks.push(m); }
    let soak = 70;
    g.audio?.breakBlock('wood'); g.fx.summonCircle(p.pos, LEAF);
    this.buff('wood_shield', 6, {
      incoming: (a) => {
        const took = Math.min(soak, a); soak -= took;
        g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 10, color: WOOD, additive: false, speed: 4, life: 0.5, size: 0.2, gravity: 12 });
        g.audio?.impact(0.8, 'wood');
        if (soak <= 0) { const b = this.buffs.get('wood_shield'); if (b) b.left = 0.01; }
        return a - took;
      },
      onTick: (dt, b) => {
        const k = Math.min(1, (b.dur - b.left) * 5);
        planks.forEach((m, i) => { const a = i / planks.length * Math.PI * 2 + g.time * 0.4; m.position.set(p.pos.x + Math.cos(a) * 1.2, p.pos.y - 0.2, p.pos.z + Math.sin(a) * 1.2); m.rotation.y = -a; m.scale.y = 2.2 * k * (0.5 + 0.5 * soak / 70); });
      },
      onEnd: () => { for (const m of planks) { g.scene.remove(m); g.fx.debris(m.position.clone().setY(m.position.y + 1), 0x6a4420, 2); } },
    });
  }
  greatSeed() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const f = this.fwd(), R = 1.5;
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 1), new THREE.MeshStandardNodeMaterial({ color: 0x7a4e24, roughness: 0.9, flatShading: true }));
    ball.castShadow = true;
    const pos = p.pos.clone().addScaledVector(f, 1.8); pos.y = this.groundAt(pos.x, pos.z, p.pos.y) + R;
    ball.position.copy(pos); g.scene.add(ball);
    g.markers.spawn({ pos: p.pos.clone(), dur: 0.4, shape: 'rect', width: R * 2.4, length: 16, facing: Math.atan2(f.x, f.z), color: LEAF });
    const hitSet = new Set(), axis = new THREE.Vector3(f.z, 0, -f.x);
    this.after(0.25, () => this.during(1.4, (t, dt) => {
      const nx = ball.position.x + f.x * 11 * dt, nz = ball.position.z + f.z * 11 * dt;
      const gy = this.groundAt(nx, nz, ball.position.y - R);
      if (g.world.solidAt(nx, gy + R, nz)) return false;
      ball.position.set(nx, gy + R, nz); ball.rotateOnWorldAxis(axis, 11 * dt / R);
      if (Math.random() < 0.5) g.fx.landDust(ball.position.clone().setY(gy), 4);
      for (const e of this.foes(ball.position, R + 0.6)) {
        if (hitSet.has(e)) continue; hitSet.add(e);
        this.hit(e, 44 + this.rank('balls') * 8, { stagger: 0.9, knock: tmp.copy(f).multiplyScalar(10).add(tmp2.subVectors(e.pos, ball.position).setY(0).normalize().multiplyScalar(5)) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6);
        g.audio?.impact(1.3, 'wood'); g.shake(0.2);
      }
    }, () => { g.scene.remove(ball); ball.geometry.dispose(); g.fx.debris(ball.position, 0x7a4e24, 8); g.audio?.breakBlock('wood'); }));
    g.audio?.whoosh(1.4);
  }
  rootBind() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    const c = this.aimGround(11), R = 3.5;
    g.markers.spawn({ pos: c, dur: 0.35, radius: R, color: LEAF });
    this.after(0.35, () => {
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; this.rootStab(c.clone().add(tmp.set(Math.cos(a) * R * 0.8, 0, Math.sin(a) * R * 0.8)), 2.2, 0.35); }
      for (const e of this.foes(c, R)) {
        this.hit(e, (18 + this.rank('roots') * 5) * this.rootMul, { stagger: 0.5, knock: new THREE.Vector3() });
        this.stun(e, 2 * this.rootHold);
        const at = e.pos.clone(); at.y = this.groundAt(at.x, at.z, at.y);
        for (let k = 0; k < 3; k++) this.rootStab(at.clone().add(tmp.set((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8)), 1 + e.height * 0.6, 0.22);
      }
      g.fx.rings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: LEAF, r0: R, r1: 0.4, dur: 0.4, thick: 0.2 });
      g.audio?.breakBlock('wood'); g.shake(0.2);
    });
  }
  rootWave() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const c = p.pos.clone(), hit = new Set();
    for (let k = 0; k < 3; k++) this.after(k * 0.18, () => {
      const r = 2.2 + k * 2.2, n = 8 + k * 5;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + k * 0.3; const at = c.clone().add(tmp.set(Math.cos(a) * r, 0, Math.sin(a) * r)); at.y = this.groundAt(at.x, at.z, c.y); this.rootStab(at, 1.6 + k * 0.3, 0.32); }
      for (const e of this.foes(c, r + 1.3)) {
        const d = Math.hypot(e.pos.x - c.x, e.pos.z - c.z); if (d < r - 1.4 || hit.has(e)) continue; hit.add(e);
        this.hit(e, (24 + this.rank('roots') * 6) * this.rootMul, { stagger: 0.6, knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(6) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
      }
      g.fx.shockwave(c, LEAF, r + 0.6); g.audio?.breakBlock('wood'); g.shake(0.15);
    });
  }
  rootSurge() {
    const g = this.game, p = this.p, f = this.fwd();
    let last = p.pos.clone();
    this.dash(f, 8, 0.3, { hitR: 1.5, dmg: 16 * this.rootMul, color: LEAF, onHit: (e) => { if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6); } });
    this.during(0.3, () => {
      if (p.pos.distanceTo(last) > 0.9) { last = p.pos.clone(); this.rootStab(last.clone(), 1.3, 0.4); g.particles.burst(tmp.set(last.x, last.y + 0.2, last.z), { count: 4, color: WOOD, additive: false, speed: 3, up: 2, life: 0.4, size: 0.2, gravity: 10 }); }
    });
    g.audio?.whoosh(1.2); g.audio?.breakBlock('wood');
  }
  rootCage() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const c = this.aimGround(11), R = 3.6, N = 12, dur = 4;
    g.markers.spawn({ pos: c, dur: 0.45, radius: R, color: LEAF });
    g.toast?.('Root Cage');
    const bars = [];
    this.after(0.45, () => {
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2, x = c.x + Math.cos(a) * R, z = c.z + Math.sin(a) * R;
        const m = this.woodBox(0.5, 0.01, 0.5); m.position.set(x, this.groundAt(x, z, c.y) - 0.1, z);
        m.rotation.set(-Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35);   // lean in over the cage
        g.scene.add(m); bars.push(m);
      }
      g.audio?.breakBlock('wood'); g.shake(0.25);
      let tick = 0;
      this.during(dur, (t, dt) => {
        const k = Math.min(1, t * 5);
        for (const m of bars) m.scale.y = 4.5 * k * (t > dur - 0.3 ? Math.max(0.01, (dur - t) / 0.3) : 1);
        // nothing walks out of the cage
        for (const e of g.enemies) {
          if (e.dead || e.isBoss) continue;
          tmp.subVectors(e.pos, c).setY(0); const d = tmp.length();
          if (d > R - 0.5 && d < R + 1.2) { e.pos.x = c.x + tmp.x / d * (R - 0.6); e.pos.z = c.z + tmp.z / d * (R - 0.6); }
        }
        tick -= dt; if (tick > 0) return;
        tick = 0.5;
        for (const e of this.foes(c, R)) {
          this.hit(e, (14 + this.rank('roots') * 4) * this.rootMul, { stagger: 0.4, knock: new THREE.Vector3() });
          this.slow(e, 0.6);
          const at = e.pos.clone(); at.y = this.groundAt(at.x, at.z, at.y);
          this.rootStab(at.add(tmp.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6)), 1.2 + e.height * 0.6, 0.28);
        }
      }, () => { for (const m of bars) { g.scene.remove(m); g.fx.debris(m.position.clone().setY(m.position.y + 1), 0x6a4420, 2); } });
    });
  }
  burstBloom() {
    const g = this.game, p = this.p;
    const list = g.enemies.filter((e) => !e.dead && e.budT > 0);
    if (!list.length) { g.toast?.('No budded curses'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    let healed = 0;
    for (const e of list) {
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
      healed += this.hit(e, 30 + this.rank('buds') * 8, { stagger: 0.6, unblockable: true, color: '#ff9ad8' }) || 0;
      g.combat.aoe(at, 2, 12, p, { knock: 4, stagger: 0.3 });
      e.budT = 0;
      g.particles.burst(at, { count: 26, color: BLOOM, speed: 7, life: 0.6, size: 0.16, drag: 2, shape: 1 });
      g.particles.burst(at, { count: 10, color: 0xffffff, speed: 4, life: 0.5, size: 0.12, shape: 1 });
      g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z), { color: BLOOM, r0: 0.3, r1: 2.2, dur: 0.35, thick: 0.15 });
    }
    p.heal(healed * 0.3, true);
    g.shake(0.25); g.audio?.impact(1.2); g.audio?.energy('heal');
  }
  drainingVine() {
    const g = this.game, p = this.p;
    const t = this.target(11);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    p.action = { type: 'cast', both: true, dur: 3, elapsed: 0, t: 0, moveScale: 0.3, lock: false };
    g.audio?.energy('spit');
    let tick = 0;
    this.during(3, (tt, dt) => {
      if (t.dead || t.pos.distanceTo(p.pos) > 15) { if (p.action?.dur === 3) p.action = null; return false; }
      const a = this.handPos(), b = t.pos.clone().setY(t.pos.y + t.height * 0.6), d = tmp.subVectors(b, a); const L = d.length();
      if (Math.random() < 0.5) g.fx.slashLine(a, d.normalize(), L, LEAF, 0.12, 0.1, Math.random() * 3);
      if (Math.random() < 0.7) g.particles.burst(tmp2.lerpVectors(b, a, Math.random()), { count: 1, color: SAP, speed: 0.2, life: 0.3, size: 0.18 });
      tick -= dt; if (tick > 0) return;
      tick = 0.25;
      const dealt = this.hit(t, 7 + this.rank('buds') * 2, { stagger: 0.1, ceGain: 1, color: '#b8ff6a' }) || 0;
      p.heal(dealt * 0.6 + 1, true);
      this.slow(t, 0.4);
    });
  }
  pollen() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const c = this.aimGround(11), R = 4.2;
    g.audio?.noise({ dur: 0.6, gain: 0.2, type: 'bandpass', freq: 1200, sweep: 400 });
    this.during(6, () => {
      for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R; g.particles.glow.spawn({ x: c.x + Math.cos(a) * r, y: c.y + 0.3 + Math.random() * 2.2, z: c.z + Math.sin(a) * r, vx: (Math.random() - 0.5) * 0.4, vy: 0.2, vz: (Math.random() - 0.5) * 0.4, life: 1.4, r: 2.6, g: 2.3, b: 0.8, size: 0.14, drag: 1, sizeEnd: 0.3 }); }
    });
    this.zone(c, R, 6, 0.4, (list) => {
      for (const e of list) {
        this.slow(e, 0.6);
        this.hit(e, 4 + this.rank('buds'), { stagger: 0, ceGain: 0.5, color: '#ffe06a' });
        if (!e.isBoss && e.state === 'windup' && Math.random() < 0.35) { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.5; }
      }
    }, { color: 0xffe06a, particles: 0.4 });
  }
  seedRain() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const c = this.aimGround(12), R = 5;
    g.markers.spawn({ pos: c, dur: 0.5, radius: R, color: SAP });
    for (let i = 0; i < 8; i++) g.particles.burst(this.handPos(), { count: 1, color: SAP, speed: 6, spread: 0.2, dir: tmp.set(0, 8, 0), life: 0.4, size: 0.2 });
    let tt = 0;
    this.after(0.4, () => this.during(2, (t, dt) => {
      tt -= dt; if (tt > 0) return; tt = 0.06;
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
      const at = new THREE.Vector3(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r);
      g.projectiles.fire({ pos: at.clone().setY(c.y + 9), vel: new THREE.Vector3(0, -24, 0), team: 'player', shape: 'cube', color: SAP, emissive: 2, scale: 0.7, life: 0.5, radius: 0.6, ghost: true,
        onHit: (e) => { this.hit(e, 8, { stagger: 0.2 }); this.plantBud(e); },
        onExpire: (q, why) => { if (why !== 'hit') g.particles.burst(q.pos, { count: 3, color: LEAF, speed: 2, life: 0.3, size: 0.1 }); } });
    }));
    g.audio?.energy('spit');
  }
  bloomOfLife() {
    const g = this.game, p = this.p;
    if (p.hp >= p.maxHp) { g.toast?.('Already at full health'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    p.healOverTime = { left: p.maxHp * 0.25, t: 4 };
    for (const pl of g.players) if (pl !== p && !pl.dead && pl.pos.distanceTo(p.pos) < 6) pl.heal(pl.maxHp * 0.15);
    g.fx.heal(p.pos, BLOOM); g.audio?.energy('heal');
    const c = p.pos.clone();
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: BLOOM, r0: 0.3, r1: 3, dur: 0.6, thick: 0.15 });
    this.during(4, () => {
      if (Math.random() < 0.6) { const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 1.4, col = Math.random() < 0.5 ? [2.6, 1.4, 2.0] : [2.6, 2.5, 1.4]; g.particles.glow.spawn({ x: p.pos.x + Math.cos(a) * r, y: p.pos.y + 0.1, z: p.pos.z + Math.sin(a) * r, vy: 0.8 + Math.random(), life: 1, r: col[0], g: col[1], b: col[2], size: 0.16, gravity: -0.3, drag: 1, sizeEnd: 0.5, shape: 'square' }); }
    });
  }
  petalStorm() {
    const g = this.game, p = this.p, R = 3.6;
    this.cast(0.35, true);
    g.audio?.whoosh(1.4);
    let tick = 0;
    this.during(3, (t, dt) => {
      for (let i = 0; i < 6; i++) {
        const a = t * 7 + i / 6 * Math.PI * 2 + Math.random() * 0.4, r = 1 + Math.random() * (R - 1);
        g.particles.glow.spawn({ x: p.pos.x + Math.cos(a) * r, y: p.pos.y + 0.3 + Math.random() * 2, z: p.pos.z + Math.sin(a) * r, vx: -Math.sin(a) * 9, vy: 0.3, vz: Math.cos(a) * 9, life: 0.25, r: i % 2 ? 2.6 : 2.6, g: i % 2 ? 1.2 : 2.6, b: i % 2 ? 1.8 : 2.6, size: 0.16, drag: 1, sizeEnd: 0.6, shape: 'square' });
      }
      tick -= dt; if (tick > 0) return; tick = 0.25;
      for (const e of this.foes(p.pos, R)) { this.hit(e, 7 + this.rank('field') * 2, { stagger: 0.15, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(1.5), color: '#ff9ad8' }); }
    });
  }
  flowerEye() {
    const g = this.game, p = this.p;
    const L = 24, W = 1.7, CH = 1.1;
    p.action = { type: 'cast', both: true, dur: CH + 0.9, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    p.invulnerable = true;
    g.toast?.('Flower of the Eye'); g.audio?.charge(CH, 0.7);
    this.beamMats ??= [beamMaterial(SAP), beamMaterial(0xffffff, true)];
    const light = g.lights.attach(p.object, SAP, 6, 10, { offsetY: 2.5, priority: 5 });
    let beam = null, from = null, dir = null;
    this.during(CH + 0.9, (t) => {
      if (!beam) {
        p.facing = this.aimAngle();
        // the land's life streams in towards the flower in Hanami's eye
        const eye = p.pos.clone().setY(p.pos.y + 2.4);
        for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 5; g.particles.glow.spawn({ x: eye.x + Math.cos(a) * r, y: p.pos.y + 0.2, z: eye.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.4, vy: 2.2, vz: -Math.sin(a) * r * 1.4, life: 0.65, r: 1.4, g: 2.6, b: 0.8, size: 0.16, drag: 1, sizeEnd: 0.3, shape: 'square' }); }
        if (t < CH) return;
        dir = this.fwd(); from = p.pos.clone().addScaledVector(dir, 0.8).setY(p.pos.y + 2.2);
        const grp = new THREE.Group();
        const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, L, 16, 1, true), this.beamMats[0]);
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, L, 10, 1, true), this.beamMats[1]);
        for (const m of [outer, inner]) { m.rotation.x = Math.PI / 2; m.position.z = L / 2; m.renderOrder = 24; }
        grp.add(outer, inner); grp.position.copy(from); grp.lookAt(from.clone().add(dir)); grp.scale.set(W, W, 1);
        g.scene.add(grp); beam = grp;
        this.beamMats.forEach((m) => { m.userData.alpha.value = 1; });
        let healed = 0;
        this.line(p.pos, dir, L, W + 0.4, (e) => { healed += this.hit(e, 110 + this.rank('field') * 20, { stagger: 1, unblockable: true, knock: dir.clone().multiplyScalar(10), color: '#b8ff6a' }) || 0; g.particles.burst(e.pos.clone().setY(e.pos.y + 1), { count: 12, color: SAP, speed: 6, life: 0.5, size: 0.14, shape: 1 }); });
        p.heal(p.maxHp * 0.15 + healed * 0.1, true);
        g.fx.flash(0xe0ffc0, 0.6, 0.25); g.fx.screenWave(from, 1.2, 0.5); g.fx.chroma(1.2);
        g.lights.flash(from.clone().addScaledVector(dir, 8), SAP, 20, 20, 0.8, { priority: 7 });
        g.shake(0.7); g.hitStop(0.08); g.audio?.energy('purple');
        for (let s = 2; s < L; s += 2) g.combat.hitBlocks(tmp.copy(from).addScaledVector(dir, s).setY(p.pos.y + 0.5), dir, W, Math.PI, 40, p);
        return;
      }
      const k = Math.max(0, 1 - (t - CH) / 0.9);
      beam.scale.set(W * (0.3 + 0.7 * k) * (1 + Math.sin(t * 50) * 0.05), W * (0.3 + 0.7 * k), 1);
      this.beamMats.forEach((m) => { m.userData.alpha.value = k; });
    }, () => {
      if (beam) { g.scene.remove(beam); beam.children.forEach((m) => m.geometry.dispose()); }
      g.lights.remove(light); p.invulnerable = false; if (p.action?.lock) p.action = null;
    });
  }
  verdantStep() {
    const g = this.game, p = this.p;
    const to = this.aimGround(10), from = p.pos.clone();
    if (!this.blink(to, { color: LEAF, iframes: 0.4 })) return false;
    for (const at of [from, p.pos]) {
      g.particles.burst(tmp.set(at.x, at.y + 0.2, at.z), { count: 14, color: WOOD, additive: false, speed: 3, up: 2, life: 0.6, size: 0.25, gravity: 10 });
      g.particles.burst(tmp.set(at.x, at.y + 0.4, at.z), { count: 12, color: LEAF, speed: 2.5, up: 2, life: 0.6, size: 0.14 });
      for (let i = 0; i < 4; i++) this.rootStab(at.clone().add(tmp.set((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6)), 1, 0.25);
    }
    for (const e of this.foes(p.pos, 2.2)) this.hit(e, 12 * this.rootMul, { stagger: 0.4, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(5) });
    g.audio?.breakBlock('wood');
  }
  sacredTree() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const c = this.aimGround(8);
    const tree = new THREE.Group();
    const bark = new THREE.MeshStandardNodeMaterial({ color: 0x5a3a1e, roughness: 0.95 });
    const bloom = new THREE.MeshStandardNodeMaterial({ color: 0xffc8e8, roughness: 0.7, emissive: 0xff9ad8, emissiveIntensity: 0.35 });
    const leaf = new THREE.MeshStandardNodeMaterial({ color: 0x5aa83a, roughness: 0.8, emissive: LEAF, emissiveIntensity: 0.1 });
    const add = (m, w, h, d, x, y, z, rz = 0) => { const o = this.woodBox(w, h, d, m); o.position.set(x, y, z); o.rotation.z = rz; tree.add(o); };
    add(bark, 1, 4.5, 1, 0, 0, 0); add(bark, 0.5, 2.2, 0.5, 0.5, 3.2, 0, -0.7); add(bark, 0.5, 2.2, 0.5, -0.5, 3, 0, 0.7);
    add(leaf, 4, 1.6, 4, 0, 4.2, 0); add(bloom, 3, 1.2, 3, 0.3, 5.6, -0.2); add(leaf, 2, 1, 2, -1.2, 5, 0.8);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; const o = this.woodBox(0.4, 1.6, 0.4, bark); o.position.set(Math.cos(a) * 0.8, -0.2, Math.sin(a) * 0.8); o.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1); tree.add(o); }
    tree.position.copy(c); tree.scale.set(1, 0.01, 1); g.scene.add(tree);
    g.fx.summonCircle(c, LEAF); g.audio?.energy('summon'); g.audio?.breakBlock('wood');
    const light = g.lights.flash(c.clone().setY(c.y + 3), 0xfff0c0, 3, 8, 10, { priority: 3, fade: false });
    let cd = 0.6, heal = 0;
    this.during(10, (t, dt) => {
      tree.scale.y = Math.min(1, t * 2.5) * (t > 9.6 ? Math.max(0.01, (10 - t) / 0.4) : 1);
      tree.rotation.z = Math.sin(t * 1.3) * 0.02;
      if (Math.random() < 0.2) g.particles.glow.spawn({ x: c.x + (Math.random() - 0.5) * 4, y: c.y + 5, z: c.z + (Math.random() - 0.5) * 4, vx: 0.6, vy: -0.6, vz: 0.3, life: 2.5, r: 2.4, g: 1.3, b: 1.9, size: 0.12, drag: 0.5, sizeEnd: 0.8, shape: 'square' });
      cd -= dt; heal -= dt;
      if (cd <= 0) {
        const e = g.nearestEnemy(c, 8);
        if (e) { cd = 0.8; this.spike(e.pos.clone(), 1.5, 20 + this.rank('roots') * 5); g.audio?.breakBlock('wood'); }
      }
      if (heal <= 0) { heal = 1; for (const pl of g.players) if (!pl.dead && pl.pos.distanceTo(c) < 4) pl.heal(pl.maxHp * 0.03, true); }
    }, () => { g.scene.remove(tree); g.lights.remove(light); g.fx.debris(c.clone().setY(c.y + 2), 0x5a3a1e, 8); });
  }
  overgrowth() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 9;
    p.action = { type: 'cast', both: true, dur: 0.9, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.toast?.('Disaster Plants'); g.audio?.charge(0.6, 0.5);
    const spots = [];
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + Math.random() * 0.3, r = 2.5 + Math.random() * (R - 2.5);
      const at = new THREE.Vector3(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r); at.y = this.groundAt(at.x, at.z, c.y);
      spots.push(at); g.markers.spawn({ pos: at, dur: 0.6 + i * 0.03, radius: 2, color: LEAF });
    }
    // enemies the player is aiming at get their own trunk
    for (const e of this.foes(c, R).slice(0, 4)) { const at = e.pos.clone(); at.y = this.groundAt(at.x, at.z, at.y); spots.push(at); g.markers.spawn({ pos: at, dur: 0.6, radius: 2, color: LEAF }); }
    spots.forEach((at, i) => this.after(0.6 + Math.min(i, 14) * 0.03, () => {
      g.combat.aoe(at, 2, (46 + this.rank('roots') * 8) * this.rootMul, p, { knock: 6, stagger: 0.8 });
      for (const e of this.foes(at, 2.2)) { if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9); this.slow(e, 2); }
      this.rootStab(at.clone(), 4 + Math.random() * 2, 0.9);
      for (let k = 0; k < 3; k++) this.rootStab(at.clone().add(tmp.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)), 2 + Math.random() * 1.5, 0.4);
      g.particles.burst(at.clone().setY(at.y + 0.4), { count: 10, color: WOOD, additive: false, speed: 6, spread: 0.3, dir: tmp.set(0, 3, 0), life: 0.6, size: 0.35, gravity: 10 });
      g.particles.burst(at.clone().setY(at.y + 2), { count: 10, color: LEAF, speed: 4, life: 0.6, size: 0.16 });
      if (i % 3 === 0) { g.audio?.breakBlock('wood'); g.shake(0.25); }
    }));
    this.after(0.9, () => { if (p.action?.lock) p.action = null; g.fx.flash(0xd0ffc0, 0.3, 0.2); });
  }
}
registerKit('hanami', HanamiKit, HANAMI_SKILLS);
