// Dabura Karaba-style kit (Jujutsu Kaisen Modulo) — Light and Darkness.
// 20 abilities on the technique tree; four are equipped (RMB takes a basic one) plus F.
//   LMB        Simurian martial arts: heavy, fast fists and kicks.
//   Light      Light Bolt (start, RMB), Hand-and-Foot Volley, Piercing Light,
//              Light Construct Cage, Light Rain, Light: Full Output
//   Darkness   Darkness (Light poured full of positive energy turns into a
//              churning black sphere that drags matter in), Churning Dark,
//              Shroud of Darkness, Eclipse, Inversion: Singularity
//   Intent     his first innate technique, a Deskunte concept: killing intent
//              made tangible — Intent Step, Murderous Pressure, Dread
//   Simurian   Simurian Fists, Sub-light Step, Lightspeed Kick, Reverse Cursed
//              Technique (learned by watching), Black Rope, Black Rope Bind
//   F          Domain: Otherworld Between Darkness and Light: Reverse
//              Transcendence. Canon (Modulo ch. 21) names it and shows a blocky,
//              abstract realm grown from his black void amid floating debris; its
//              sure-hit was not explained, so here it strikes every curse inside
//              with alternating pillars of Light and swallowing spheres of Darkness.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { GEO, glow, dark, mat, temp, mesh, beam, pillar, meshShot, rise, insideFoes, pull, sigil, aimAt, makeOrb } from './fxlib.js';

const LIGHT = 0xfff2b8, GOLD = 0xffc84a, VOID = 0x5a2aff, INTENT = 0xff3a2a, ROPE = 0x1a1414;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('dabura', { name: 'Dabura', technique: 'Light and Darkness', rarity: 'legendary', title: 'Simurian Warrior', desc: 'Piercing Light beams that harden into constructs, Light inverted into devouring Darkness, killing intent made tangible and lightspeed kicks.', domain: 'Otherworld Between Darkness and Light: Reverse Transcendence', color: '#fff2b8' });

registerLook('dabura', {
  paint: { skinTone: 0xc8b8a8, hair: 0xe8f4f0, brow: 0xd8e8e4, top: 0xc8b8a8, collar: 0xc8b8a8, topTrim: 0xc8b8a8, buttons: 0xc8b8a8, sleeve: 0xc8b8a8, pants: 0x3a3048, shoes: 0x2a2030, eye: 0xff5a2a, eyeWhite: 0xf8e8d8, fringe: 1, hairSide: 3, hairBack: 7, hairVolume: true },
  paintExtra: (S) => {
    // the third eye with its ring marking
    S.mat = 'eye';
    S.px(11, 10, 0x2a1a1a); S.px(12, 10, 0x2a1a1a); S.fine(11.5, 10, 0xff6a2a); S.fine(11.5, 10.5, 0xffa040);
    S.mat = 'skin';
    S.fineRect(10.5, 9.5, 3, 0.5, 0x3a2a3a, 'skin'); S.fineRect(10.5, 11, 3, 0.5, 0x3a2a3a, 'skin');
    // bare, smooth skin on the torso and arms (painted over the default cloth)
    S.mat = 'skin';
    S.box(16, 16, 8, 12, 4, 0xc8b8a8, 0.03);
    S.box(40, 16, 4, 12, 4, 0xc8b8a8, 0.03); S.box(32, 48, 4, 12, 4, 0xc8b8a8, 0.03);
    S.fineRect(21, 24, 6, 0.5, 0xb0a090, 'skin'); S.fineRect(23.5, 22, 1, 6, 0xb4a494, 'skin');   // muscle lines
    // jagged dark markings: a band round the neck and shoulders, zig-zags down the arms
    const ink = 0x2a2234;
    S.rect(20, 20, 8, 1, ink, 0.03); S.rect(16, 20, 4, 1, ink, 0.03); S.rect(28, 20, 4, 1, ink, 0.03);
    for (const x of [20, 21, 26, 27]) S.px(x, 21, ink);
    S.px(20, 22, ink); S.px(27, 22, ink);
    for (const [u, v] of [[40, 20], [32, 52]]) {
      S.rect(u, v, 16, 1, ink, 0.03);
      for (let y = 1; y < 7; y++) { const zx = (y % 2) ? 1 : 2; S.px(u + 4 + zx, v + y, ink); S.px(u + 12 + zx, v + y, ink); S.px(u + zx - 1, v + y, ink); }
    }
    // wide belt and the coiled sash strips at the waist
    S.mat = 'cloth';
    S.rect(20, 29, 8, 2, 0x5a4a2a, 0.05); S.rect(16, 29, 4, 2, 0x5a4a2a, 0.05); S.rect(28, 29, 4, 2, 0x5a4a2a, 0.05);
    for (let x = 20; x < 28; x += 2) S.px(x, 31, 0x1a1420);
  },
  hair: (m) => [
    { x: 0, y: 8.4, z: 0, w: 8, h: 1.6, d: 8, material: m },
    { x: 0, y: 6, z: -3.8, w: 7, h: 13, d: 2, hang: true, material: m, stiff: 22 },
    { x: -2.6, y: 6, z: -3.4, w: 2.5, h: 11, d: 2, hang: true, material: m, stiff: 24 },
    { x: 2.6, y: 6, z: -3.4, w: 2.5, h: 11, d: 2, hang: true, material: m, stiff: 24 },
  ],
  hairColor: 0xe8f4f0, accent: LIGHT, emit: 0.35, cape: null, scale: 1.3,
  props(rig, K) {
    const horn = K.mat(0xe8e0d0, { roughness: 0.4 }), tip = K.mat(0x8a7a6a, { roughness: 0.4 }), gold = K.mat(0xd8b040, { metalness: 0.9, roughness: 0.3 }), lobe = K.mat(0xc8b8a8, { roughness: 0.7 }), sash = K.mat(0x1a1420, { roughness: 0.9 });
    for (const s of [-1, 1]) {
      // horns curving up and away from the temples
      K.box(rig.head, 2, 3.4, 2, horn, s * 4.6, 7.6, 0.6, 0, 0, s * -0.7);
      K.box(rig.head, 1.6, 3.6, 1.6, horn, s * 6.6, 10, 0.4, 0, 0, s * -0.3);
      K.box(rig.head, 1.1, 2.6, 1.1, tip, s * 7.4, 13, 0.2, 0, 0, s * 0.1);
      // the stretched earlobes hanging to his abdomen, ringed with piercings
      K.box(rig.head, 0.9, 12, 1.2, lobe, s * 4.4, -3.5, 0.4);
      for (let i = 0; i < 5; i++) K.box(rig.head, 1.3, 0.5, 1.6, gold, s * 4.4, 1.5 - i * 2.4, 0.4);
      // ten dark sash strips coiled at the waist (five a side)
      for (let i = 0; i < 5; i++) K.box(rig.torso, 1, 4 + (i % 2) * 2, 0.4, sash, s * (0.8 + i * 0.8), -1 - (i % 2), 2.3, 0.08 * s, 0, 0);
    }
    // light gathering in his palms
    const lit = K.mat(LIGHT, { emissive: 3 });
    K.box(rig.handR, 1, 1, 1, lit, 0, -2.8, 0.6); K.box(rig.handL, 1, 1, 1, lit, 0, -2.8, 0.6);
  },
});

registerDomainEnv('reverse_transcendence', {
  skyTop: 0x050508, skyHorizon: 0xfff4d0, fog: 0x2a2630, fogDensity: 0.012, hemiSky: 0xfff4e0, hemiGround: 0x101018, hemiI: 1.3, sun: 0xfff8e8, sunI: 1.4,
  grade: { tint: [1.04, 1.02, 0.98], lift: [0.0, 0.0, 0.02], sat: 0.7, contrast: 1.3, vignette: 0.5 }, floor: B.marble,
});

export const DABURA_SKILLS = [
  { id: 'physique', name: 'Simurian Physique', icon: '💪', desc: '+8% melee damage and +12 max health per rank.', max: 3, branch: 'Simurian', tier: 0 },
  { id: 'light', name: 'Radiant Output', icon: '🔆', desc: 'Light beams are wider and hit harder.', max: 3, req: 'ab:light_bolt', branch: 'Light', tier: 1 },
  { id: 'darkness', name: 'Abyss', icon: '🌑', desc: 'Darkness pulls harder and crushes longer.', max: 3, req: 'ab:darkness', branch: 'Darkness', tier: 2 },
  { id: 'intent', name: 'Killing Intent', icon: '👁️', desc: 'Killing-intent techniques stun longer.', max: 2, req: 'ab:intent_step', branch: 'Intent', tier: 2 },
  { id: 'lightspeed', name: 'Lightspeed', icon: '⚡', desc: 'Lightspeed techniques travel further and hit harder.', max: 2, req: 'ab:lightspeed_kick', branch: 'Simurian', tier: 4 },
  { id: 'transcend', name: 'Reverse Transcendence', icon: '☯️', desc: 'The domain lasts 2s longer and its Light and Darkness strike harder.', max: 1, req: 'up:darkness', branch: 'Darkness', tier: 5 },
];

class DaburaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const fist = { trail: LIGHT, sparkColor: GOLD };
    this.combo = [
      { ...fist, style: 'punch', dur: 0.26, windup: 0.25, strike: 0.5, dmg: 14, range: 2.7, arc: 1.0, lunge: 8, knock: 3, stop: 0.04, shake: 0.14 },
      { ...fist, style: 'swingL', dur: 0.28, windup: 0.25, strike: 0.5, dmg: 15, range: 2.8, arc: 1.2, lunge: 7, knock: 4, stop: 0.045, shake: 0.15 },
      { ...fist, style: 'spin', dur: 0.36, windup: 0.3, strike: 0.55, dmg: 18, range: 3.0, arc: Math.PI, lunge: 5, knock: 6, stop: 0.05, shake: 0.2 },
      { ...fist, style: 'slam', dur: 0.55, windup: 0.42, strike: 0.6, dmg: 30, range: 3.4, arc: Math.PI, lunge: 3, knock: 12, stop: 0.1, shake: 0.45, ring: true, ringColor: LIGHT, stagger: 0.7, lightFall: true },
    ];
    this.p.stats.meleeMult += r('physique') * 0.08;
    this.p.maxHp += r('physique') * 12; this.p.hp = Math.min(this.p.hp + r('physique') * 12, this.p.maxHp);
    this.branches = ['Light', 'Darkness', 'Intent', 'Simurian'];
    this.lightMul = 1 + r('light') * 0.15; this.darkMul = 1 + r('darkness') * 0.15; this.speedMul = 1 + r('lightspeed') * 0.2;
    this.library = {
      // ---- Light
      light_bolt: ability({ name: 'Light Bolt', icon: '✴️', kind: 'basic', desc: 'A piercing beam of Light fired from the palm.', cd: 0.75, ce: 0, branch: 'Light', tier: 0, start: true, legacy: 'ranged', use: () => this.lightBolt() }),
      volley: ability({ name: 'Hand-and-Foot Volley', icon: '🌟', kind: 'basic', desc: 'Beams of Light from both hands and both feet, fanned across the front.', cd: 1.1, ce: 0, branch: 'Light', tier: 1, req: 'light_bolt', use: () => this.volley() }),
      piercing: ability({ name: 'Piercing Light', icon: '🔆', kind: 'technique', desc: 'A heavy beam that pierces everything in a line and hardens into a construct inside them, pinning them in place.', cd: 7, ce: 14, branch: 'Light', tier: 1, legacy: 't1', req: 'light_bolt', use: () => this.piercingLight() }),
      cage: ability({ name: 'Light Construct Cage', icon: '🔲', kind: 'technique', desc: 'Beams stab down around the aim and solidify into a cage: curses inside are trapped and burned for 3s.', cd: 12, ce: 18, branch: 'Light', tier: 2, req: 'piercing', use: () => this.lightCage() }),
      light_rain: ability({ name: 'Light Rain', icon: '🌠', kind: 'technique', desc: 'Light constructs hang in the sky over the aim and rain beams down for 2.5s.', cd: 14, ce: 22, branch: 'Light', tier: 3, req: 'cage', use: () => this.lightRain() }),
      full_light: ability({ name: 'Light: Full Output', icon: '☀️', kind: 'technique', desc: 'Charge, then a colossal beam that tears through walls and everything in front of you.', cd: 22, ce: 45, branch: 'Light', tier: 4, req: 'light_rain', use: () => this.fullLight() }),
      // ---- Darkness
      darkness: ability({ name: 'Darkness', icon: '⚫', kind: 'technique', desc: 'Pour positive energy into Light and it turns into Darkness: a black sphere at the aim drags curses in, then crushes them.', cd: 9, ce: 16, branch: 'Darkness', tier: 1, legacy: 't2', use: () => this.darkness() }),
      churn: ability({ name: 'Churning Dark', icon: '🌀', kind: 'technique', desc: 'Darkness churns around you for 3s, pulling curses close and grinding them.', cd: 12, ce: 16, branch: 'Darkness', tier: 2, req: 'darkness', use: () => this.churn() }),
      shroud: ability({ name: 'Shroud of Darkness', icon: '🛡️', kind: 'defence', desc: 'Darkness wraps you for 5s: 50% less damage, and shots that reach you are swallowed.', cd: 16, ce: 12, branch: 'Darkness', tier: 2, req: 'darkness', use: () => this.shroud() }),
      eclipse: ability({ name: 'Eclipse', icon: '🌑', kind: 'technique', desc: 'Light and Darkness together: a black sphere drags curses in while beams of Light spear through it.', cd: 16, ce: 26, branch: 'Darkness', tier: 3, req: 'churn', use: () => this.eclipse() }),
      singularity: ability({ name: 'Inversion: Singularity', icon: '🕳️', kind: 'technique', desc: 'Invert Light completely: a vast sphere of Darkness swallows everything nearby, then collapses in a blinding flash.', cd: 24, ce: 48, branch: 'Darkness', tier: 4, legacy: 't3', req: 'eclipse', use: () => this.singularity() }),
      // ---- Killing intent
      intent_step: ability({ name: 'Intent Step', icon: '👣', kind: 'movement', desc: 'Move along your own killing intent: appear behind the curse you are aiming at and strike.', cd: 6, ce: 8, branch: 'Intent', tier: 1, use: () => this.intentStep() }),
      pressure: ability({ name: 'Murderous Pressure', icon: '😠', kind: 'technique', desc: 'Killing intent made tangible slams down in a cone: curses are crushed and frozen in terror.', cd: 9, ce: 14, branch: 'Intent', tier: 2, req: 'intent_step', use: () => this.pressure() }),
      dread: ability({ name: 'Dread', icon: '💀', kind: 'buff', desc: 'For 8s your killing intent pours off you: curses near you slow and falter, and you deal +15% damage.', cd: 22, ce: 18, branch: 'Intent', tier: 3, req: 'pressure', use: () => this.dread() }),
      // ---- Simurian
      fists: ability({ name: 'Simurian Fists', icon: '👊', kind: 'technique', desc: 'Close in and unleash a flurry of blows that ends in a launching uppercut.', cd: 6, ce: 8, branch: 'Simurian', tier: 1, use: () => this.fists() }),
      sublight: ability({ name: 'Sub-light Step', icon: '💨', kind: 'movement', desc: 'Move at sub-light speed, cutting through every curse in the way. The speed costs a little health.', cd: 5, ce: 6, branch: 'Simurian', tier: 2, req: 'fists', use: () => this.sublight() }),
      rope: ability({ name: 'Black Rope', icon: '🪢', kind: 'technique', desc: 'Lash out with the Black Rope, a cursed tool that cancels techniques: it breaks curses\' attacks and shields.', cd: 8, ce: 8, branch: 'Simurian', tier: 2, req: 'fists', use: () => this.rope() }),
      rct: ability({ name: 'Reverse Cursed Technique', icon: '✚', kind: 'heal', desc: 'The RCT he learned just by watching: heal 30% of your health.', cd: 20, ce: 16, branch: 'Simurian', tier: 3, req: 'sublight', use: () => this.rctHeal(0.3, 1.5, LIGHT) }),
      rope_bind: ability({ name: 'Black Rope Bind', icon: '⛓️', kind: 'technique', desc: 'The rope coils round the targeted curse and holds it for 3s, then you yank it in for a blow.', cd: 12, ce: 12, branch: 'Simurian', tier: 3, req: 'rope', use: () => this.ropeBind() }),
      lightspeed_kick: ability({ name: 'Lightspeed Kick', icon: '⚡', kind: 'technique', desc: 'Become the fastest thing in the universe for an instant: a kick at the speed of light that cleaves through a line of curses.', cd: 14, ce: 24, branch: 'Simurian', tier: 4, req: ['sublight', 'rope'], use: () => this.lightspeedKick() }),
    };
    this.passives = {
      third_eye: passive({ name: 'Third Eye', icon: '👁️', desc: '+8% critical chance; Light beams track the curse you aim at more tightly.', branch: 'Light', tier: 2, req: 'volley', apply: (pl) => { pl.stats.crit += 0.08; } }),
      tempered: passive({ name: 'Tempered Body', icon: '🧱', desc: 'Sub-light Step costs no health and +6% damage reduction.', branch: 'Simurian', tier: 3, req: 'sublight', apply: (pl, k) => { k.tempered = true; pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.06); } }),
      void_heart: passive({ name: 'Void Heart', icon: '🖤', desc: 'Curses killed by Darkness restore 3 Cursed Energy; Darkness lasts 30% longer.', branch: 'Darkness', tier: 3, req: 'churn', apply: (pl, k) => { k.voidHeart = true; k.darkMul *= 1.3; } }),
      prodigy: passive({ name: 'Self-taught Prodigy', icon: '🧠', desc: 'Techniques cost 15% less Cursed Energy.', branch: 'Intent', tier: 2, req: 'intent_step', apply: (pl, k) => { k.ceMul *= 0.85; } }),
    };
    // Otherworld Between Darkness and Light: Reverse Transcendence
    this.domain = {
      name: 'Otherworld Between Darkness and Light: Reverse Transcendence', short: 'Reverse Transcendence', icon: '☯️', key: 'reverse_transcendence', type: 6, color: LIGHT, sound: 'void', flash: 0xffffff,
      look: { floor: 0xd8d4cc, seam: 0x0a0a10, sparkle: 0xfff4c8, skyTop: 0x020204, skyHorizon: 0xfff0c8, stars: 0.6, band: 0x5a2aff },
      duration: 8 + r('transcend') * 2, radius: 25,
      onStart: (g, d) => { this.buildOtherworld(g, d); g.toast?.('Sure-hit: Light pierces and Darkness swallows every curse inside'); g.fx.flash(0xffffff, 0.6, 0.35); g.shake(0.6); },
      onTick: (g, d, dt) => this.otherworldTick(g, d, dt),
      onEnd: () => this.clearOtherworld(),
    };
  }
  dispose() { super.dispose(); this.clearOtherworld(); }
  onMeleeHit(e, step) {
    if (!step.lightFall) return;
    const at = e.pos.clone();
    pillar(this, at, 0.9, 10, LIGHT, 0.45, { core: 0xffffff });
    this.hit(e, 14 * this.lightMul, { stagger: 0.4, color: '#fff2b8' });
  }
  // ------------------------------------------------------------ Light
  lb(from, dir, L, W, dmg, o = {}) { return beam(this, from, dir, L, W * (0.8 + this.lightMul * 0.2), LIGHT, { dmg: dmg * this.lightMul, core: 0xffffff, numColor: '#fff2b8', ...o }); }
  lightBolt() {
    const g = this.game, from = this.handPos();
    this.cast(0.22);
    const { dir } = aimAt(this, from, 18);
    this.lb(from, dir, 18, 0.22, 13, { knock: 3, stagger: 0.25, blocks: false });
    g.audio?.tone({ freq: 1800, to: 900, dur: 0.12, gain: 0.08, type: 'sine', rev: 0.3 }); g.audio?.noise({ dur: 0.1, gain: 0.12, type: 'highpass', freq: 3000 });
  }
  volley() {
    const g = this.game, p = this.p;
    this.pose('spin', 0.32);
    const base = this.aimAngle();
    [-0.36, -0.12, 0.12, 0.36].forEach((off, i) => this.after(i * 0.05, () => {
      const a = base + off, from = i < 2 ? this.handPos() : p.pos.clone().setY(p.pos.y + 0.4);
      this.lb(from, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), 14, 0.18, 9, { knock: 2, stagger: 0.15, light: i === 0, blocks: false });
    }));
    g.audio?.tone({ freq: 1500, to: 700, dur: 0.18, gain: 0.07, type: 'sine', rev: 0.3 });
  }
  shard(e, dur) {
    // a construct of hardened Light lodged in the curse
    if (e.dead) return;
    this.stun(e, dur);
    const m = mesh(GEO.box, glow(LIGHT, 2.5, 0.85), [0.25, (e.height ?? 1.5) * 1.1, 0.25]);
    m.rotation.set(0.5, Math.random() * 3, 0.4);
    temp(this, m, dur, () => { if (e.dead) return false; m.position.set(e.pos.x, e.pos.y + (e.height ?? 1.5) * 0.5, e.pos.z); });
  }
  piercingLight() {
    const g = this.game, p = this.p;
    p.action = { type: 'cast', both: true, dur: 0.45, elapsed: 0, t: 0, moveScale: 0.2, lock: true, faceAim: true };
    g.audio?.charge(0.2, 1.4);
    this.after(0.2, () => {
      const from = this.handPos(), { dir } = aimAt(this, from, 22);
      this.lb(from, dir, 22, 0.6, 34, { knock: 2, stagger: 0.6, onHit: (e) => this.shard(e, 1.4 + this.rank('light') * 0.2) });
      g.shake(0.25); g.fx.flash(LIGHT, 0.15, 0.1); g.audio?.energy('red');
    });
  }
  lightCage() {
    const g = this.game;
    this.cast(0.45, true);
    const c = this.aimGround(12), R = 3.6;
    sigil(this, c, R, LIGHT, 0.4);
    g.audio?.charge(0.35, 1.6);
    this.after(0.35, () => {
      const bars = new THREE.Group();
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, at = tmp.set(c.x + Math.cos(a) * R, c.y, c.z + Math.sin(a) * R);
        pillar(this, at.clone(), 0.35, 12, LIGHT, 0.35);
        const bar = mesh(GEO.box, glow(LIGHT, 2, 0.7), [0.2, 4, 0.2]); bar.position.set(at.x - c.x, 2, at.z - c.z); bars.add(bar);
      }
      const top = mesh(GEO.torus, glow(GOLD, 3), [R, R, R]); top.rotation.x = Math.PI / 2; top.position.y = 4; bars.add(top);
      bars.position.copy(c);
      const trapped = this.foes(c, R);
      for (const e of trapped) this.stun(e, 3);
      this.blast(c, R, 22 * this.lightMul, { color: LIGHT, knock: 0, stagger: 0.5, explode: false });
      let tick = 0;
      temp(this, bars, 3, (t, dt) => {
        tick -= dt;
        // the cage holds: nobody gets out
        for (const e of trapped) if (!e.dead) { tmp.subVectors(e.pos, c).setY(0); if (tmp.length() > R - 0.5) e.pos.set(c.x, e.pos.y, c.z).addScaledVector(tmp.setLength(R - 0.5), 1); }
        if (tick <= 0) { tick = 0.5; for (const e of this.foes(c, R)) this.hit(e, 9 * this.lightMul, { stagger: 0.1, color: '#fff2b8' }); }
      });
      g.audio?.energy('infinity'); g.shake(0.2);
    });
  }
  lightRain() {
    const g = this.game;
    this.cast(0.5, true);
    const c = this.aimGround(13), R = 5.5;
    g.markers.spawn({ pos: c, dur: 0.5, radius: R, color: GOLD });
    g.toast?.('Light Rain');
    const stars = new THREE.Group();
    for (let i = 0; i < 6; i++) { const s = mesh(GEO.ico0, glow(LIGHT, 3), 0.5); const a = i / 6 * Math.PI * 2; s.position.set(Math.cos(a) * R * 0.6, 9, Math.sin(a) * R * 0.6); stars.add(s); }
    stars.position.copy(c);
    temp(this, stars, 3.1, (t) => { stars.rotation.y = t * 1.5; });
    let tick = 0.5;
    this.during(3, (t, dt) => {
      tick -= dt; if (tick > 0) return;
      tick = 0.12;
      const tg = this.foes(c, R); const e = tg.length && Math.random() < 0.7 ? tg[Math.floor(Math.random() * tg.length)] : null;
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      const at = e ? e.pos.clone() : new THREE.Vector3(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr);
      at.y = this.groundAt(at.x, at.z, c.y);
      const from = at.clone().add(tmp.set((Math.random() - 0.5) * 3, 9, (Math.random() - 0.5) * 3));
      this.lb(from, tmp2.subVectors(at, from).normalize(), from.distanceTo(at) + 0.5, 0.3, 0, { light: Math.random() < 0.3, pierce: true });
      g.combat.aoe(at, 1.3, 14 * this.lightMul, this.p, { knock: 2, stagger: 0.3, blocks: false });
      g.fx.rings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: LIGHT, r0: 0.2, r1: 1.4, dur: 0.25, thick: 0.1 });
      if (Math.random() < 0.4) g.audio?.tone({ freq: 2000, to: 1200, dur: 0.08, gain: 0.04, type: 'sine' });
    });
  }
  fullLight() {
    const g = this.game, p = this.p, CH = 0.8;
    p.action = { type: 'cast', both: true, dur: CH + 0.6, elapsed: 0, t: 0, moveScale: 0.05, lock: true, hold: true, cancelable: false, faceAim: true };
    g.toast?.('Light: Full Output'); g.audio?.charge(CH, 0.8);
    const orb = makeOrb(LIGHT, { radius: 0.2, coreColor: 0xffffff });
    temp(this, orb, CH, (t, dt, k) => {
      orb.position.copy(this.handPos()); orb.scale.setScalar(0.2 + k * 0.9);
      const h = orb.position;
      for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, rr = 2 + Math.random() * 2; g.particles.glow.emit(h.x + Math.cos(a) * rr, h.y + (Math.random() - 0.5) * 2, h.z + Math.sin(a) * rr, -Math.cos(a) * rr * 3, 0, -Math.sin(a) * rr * 3, 0.3, 3, 2.8, 2, 0.14, 0, 1, 0.2, 0); }
    });
    this.after(CH, () => {
      const from = this.handPos(), { dir } = aimAt(this, from, 30);
      for (let i = 0; i < 4; i++) this.after(i * 0.12, () => this.lb(this.handPos(), dir, 30, 2 - i * 0.2, i ? 22 : 120, { pierce: true, knock: 14, stagger: 1, unblockable: true, dur: 0.5 }));
      g.fx.flash(0xfff8e0, 0.6, 0.3); g.fx.screenWave(from, 1.2, 0.5); g.fx.chroma(1.2); g.shake(0.8); g.hitStop(0.06);
      g.audio?.energy('purple');
    });
  }
  // ------------------------------------------------------------ Darkness
  darkSphere(c, R, dur, pullK, dps, o = {}) {
    const g = this.game, p = this.p;
    const orb = makeOrb(VOID, { radius: 0.3, darkCore: true });
    orb.position.copy(c).setY(c.y + 1.4);
    const light = g.lights.flash(orb.position.clone(), VOID, 4, R * 3, dur + 0.3, { priority: 3, fade: false });
    let tick = 0;
    temp(this, orb, dur * this.darkMul, (t, dt, k) => {
      orb.scale.setScalar(Math.min(1, t / 0.25) * (o.size ?? 1.1) * (1 + Math.sin(t * 9) * 0.05));
      orb.rotation.y += dt * 4;
      pull(this, c, R, pullK * dt * 60 * 0.1, 0);
      // matter streaming into the sphere
      for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, rr = R * (0.5 + Math.random() * 0.5); g.particles.glow.emit(c.x + Math.cos(a) * rr, c.y + 0.3 + Math.random() * 2, c.z + Math.sin(a) * rr, -Math.cos(a) * rr * 1.8, 0.6, -Math.sin(a) * rr * 1.8, 0.5, 0.5, 0.25, 1.6, 0.16, 0, 0.5, 0.05, 0); }
      if (Math.random() < 0.3) g.particles.burst(orb.position, { count: 2, color: 0x0a0814, additive: false, speed: 1, life: 0.6, size: 0.5, sizeEnd: 0.1 });
      tick -= dt;
      if (tick <= 0) { tick = 0.3; for (const e of this.foes(c, R * 0.5)) { this.hit(e, dps * 0.3 * this.darkMul, { stagger: 0.15, color: '#a88aff' }); if (e.dead && this.voidHeart) p.gainCE(3); } }
    }, () => { g.lights.remove(light); o.onEnd?.(); });
    return orb;
  }
  darkness() {
    const g = this.game;
    this.cast(0.4, true);
    const c = this.aimGround(12), R = 5 + this.rank('darkness') * 0.6;
    g.audio?.energy('blue');
    this.darkSphere(c, R, 2, 1.6, 40, { onEnd: () => { this.blast(c, 2.6, 30 * this.darkMul, { color: VOID, knock: 6, stagger: 0.6 }); } });
  }
  churn() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    g.audio?.energy('blue');
    const ring = mesh(GEO.torus, glow(VOID, 2.5), 3);
    ring.rotation.x = Math.PI / 2;
    let tick = 0;
    temp(this, ring, 3 * this.darkMul, (t, dt) => {
      ring.position.set(p.pos.x, p.pos.y + 0.8, p.pos.z); ring.rotation.z += dt * 6; ring.scale.setScalar(3 + Math.sin(t * 7) * 0.3);
      pull(this, p.pos, 6, 0.6, 0);
      for (let i = 0; i < 4; i++) { const a = t * 8 + i * Math.PI / 2; g.particles.burst(tmp.set(p.pos.x + Math.cos(a) * 2.6, p.pos.y + 0.8, p.pos.z + Math.sin(a) * 2.6), { count: 1, color: 0x08060c, additive: false, speed: 0.5, life: 0.5, size: 0.6, sizeEnd: 0.1 }); }
      tick -= dt;
      if (tick <= 0) { tick = 0.35; for (const e of this.foes(p.pos, 3)) this.hit(e, 11 * this.darkMul, { stagger: 0.2, color: '#a88aff' }); }
    });
  }
  shroud() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    const shell = makeOrb(VOID, { radius: 1.6, darkCore: false });
    g.audio?.energy('infinity');
    this.buff('shroud', 5, {
      onStart: () => { g.scene.add(shell); },
      incoming: (a) => a * 0.5,
      onTick: () => {
        shell.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z);
        // shots that reach the shroud are swallowed
        for (const q of [...g.projectiles.list]) if (q.team === 'enemy' && q.pos.distanceTo(shell.position) < 1.9) { g.particles.burst(q.pos, { count: 6, color: VOID, speed: 2, life: 0.3, size: 0.2 }); g.projectiles.kill(q, 'absorb'); }
      },
      onEnd: () => g.scene.remove(shell),
    });
  }
  eclipse() {
    const g = this.game;
    this.cast(0.5, true);
    const c = this.aimGround(12), R = 6;
    g.toast?.('Eclipse'); g.audio?.energy('blue');
    this.darkSphere(c, R, 2.4, 2, 30, { size: 1.5 });
    for (let i = 0; i < 8; i++) this.after(0.4 + i * 0.22, () => {
      const a = Math.random() * Math.PI * 2, from = tmp.set(c.x + Math.cos(a) * 7, c.y + 3 + Math.random() * 3, c.z + Math.sin(a) * 7).clone();
      const to = c.clone().setY(c.y + 1.2);
      this.lb(from, tmp2.subVectors(to, from).normalize(), from.distanceTo(to) + 6, 0.35, 0, { pierce: true, light: i % 3 === 0 });
      g.combat.aoe(c, 2.4, 18 * this.lightMul, this.p, { stagger: 0.3, blocks: false, color: '#fff2b8' });
      g.audio?.tone({ freq: 1600, to: 800, dur: 0.1, gain: 0.05, type: 'sine' });
    });
  }
  singularity() {
    const g = this.game, p = this.p, c = this.aimGround(10), R = 9;
    p.action = { type: 'cast', both: true, dur: 0.8, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.toast?.('Inversion: Singularity'); g.audio?.charge(0.6, 0.5);
    g.markers.spawn({ pos: c, dur: 2.6, radius: R, color: VOID });
    g.fx.dimTarget = 0.4;
    this.darkSphere(c, R, 2.6, 3, 50, { size: 3, onEnd: () => {
      g.fx.dimTarget = 0;
      this.blast(c, R, 130 * this.darkMul, { color: LIGHT, knock: 16, stagger: 1, unblockable: true });
      pillar(this, c, 4, 30, LIGHT, 0.9);
      g.fx.flash(0xffffff, 0.8, 0.35); g.fx.chroma(1.5); g.fx.screenWave(c, 1.5, 0.7); g.hitStop(0.1); g.slowMo?.(0.35, 0.4);
      g.audio?.energy('explode'); g.audio?.blackFlash();
    } });
    this.after(0.8, () => { if (p.action?.lock) p.action = null; });
  }
  // ------------------------------------------------------------ Killing intent
  intentStep() {
    const g = this.game, p = this.p, t = this.target(14);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    tmp.subVectors(t.pos, p.pos).setY(0).normalize();
    const to = t.pos.clone().addScaledVector(tmp, (t.radius ?? 0.5) + 1.1);
    const from = p.pos.clone();
    if (!this.blink(to, { color: INTENT, quiet: true }) && !this.closeIn(t, INTENT)) return false;
    // a red trail of killing intent where you were
    for (let s = 0; s < 1; s += 0.1) g.particles.burst(tmp2.lerpVectors(from, p.pos, s).setY(from.y + 1), { count: 2, color: INTENT, speed: 0.5, life: 0.5, size: 0.4, sizeEnd: 0.05 });
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    this.pose('swingR', 0.3);
    this.after(0.08, () => { if (!t.dead) { this.hit(t, 30, { melee: true, stagger: 0.8, knock: tmp.subVectors(t.pos, p.pos).setY(0).setLength(7) }); this.stun(t, 0.6 + this.rank('intent') * 0.3); g.fx.hitSpark(t.pos.clone().setY(t.pos.y + 1), null, { color: INTENT, big: true }); g.audio?.impact(1.3); } });
    g.audio?.energy('teleport');
  }
  pressure() {
    const g = this.game, p = this.p, f = this.fwd(), R = 8;
    p.action = { type: 'cast', both: true, dur: 0.5, elapsed: 0, t: 0, moveScale: 0, lock: true, faceAim: true };
    g.markers.spawn({ pos: p.pos.clone(), dur: 0.3, radius: R, shape: 'cone', arc: 0.3, facing: Math.atan2(f.x, f.z), color: INTENT });
    this.after(0.3, () => {
      for (const e of this.foes(p.pos, R, f, 0.95)) { this.hit(e, 26, { stagger: 0.8, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(4), color: '#ff6a5a' }); this.stun(e, 1.2 + this.rank('intent') * 0.4); }
      for (let i = 0; i < 40; i++) { const a = Math.atan2(f.x, f.z) + (Math.random() - 0.5) * 1.9, rr = Math.random() * R; g.particles.burst(tmp.set(p.pos.x + Math.sin(a) * rr, p.pos.y + 3, p.pos.z + Math.cos(a) * rr), { count: 1, color: INTENT, speed: 8, spread: 0.1, dir: tmp2.set(0, -6, 0), life: 0.35, size: 0.3, sizeEnd: 0.05 }); }
      g.fx.flash(0x400000, 0.35, 0.25); g.fx.screenWave(p.pos.clone().addScaledVector(f, 3), 1, 0.4); g.shake(0.5);
      g.audio?.tone({ freq: 70, to: 40, dur: 0.7, gain: 0.5, type: 'sawtooth', filter: 400, rev: 0.4 });
    });
  }
  dread() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.fx.flash(0x300000, 0.3, 0.3); g.audio?.tone({ freq: 55, to: 45, dur: 1.2, gain: 0.4, type: 'sawtooth', filter: 300, rev: 0.5 });
    let tick = 0;
    this.statBuff('dread', 8, { damage: 0.15 }, {
      onTick: (dt) => {
        if (Math.random() < 0.6) { const a = Math.random() * Math.PI * 2; g.particles.burst(tmp.set(p.pos.x + Math.cos(a) * 0.8, p.pos.y + Math.random() * 2, p.pos.z + Math.sin(a) * 0.8), { count: 1, color: INTENT, speed: 0.6, up: 2, life: 0.6, size: 0.3, sizeEnd: 0.05 }); }
        tick -= dt; if (tick > 0) return; tick = 0.4;
        for (const e of this.foes(p.pos, 6)) { this.slow(e, 0.6); if (!e.isBoss && Math.random() < 0.15) e.cancelAttack?.(); }
      },
    });
  }
  // ------------------------------------------------------------ Simurian
  fists() {
    const g = this.game, p = this.p, t = this.target(8);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, LIGHT);
    const styles = ['punch', 'swingL', 'swingR', 'punch', 'punch', 'uppercut'];
    styles.forEach((s, i) => this.after(i * 0.09, () => {
      if (t.dead) return;
      this.pose(s, 0.12);
      this.hit(t, i === 5 ? 26 : 8, { melee: true, stagger: 0.3, knock: i === 5 ? null : tmp.subVectors(t.pos, p.pos).setY(0).setLength(0.5) });
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + 1.1), null, { color: GOLD, big: i === 5 });
      g.audio?.impact(i === 5 ? 1.4 : 0.7);
      if (i === 5 && !t.isBoss) t.vel.y = Math.max(t.vel.y, 11);
    }));
  }
  sublight() {
    const g = this.game, p = this.p, f = this.fwd(), from = p.pos.clone();
    if (!this.tempered && p.hp > p.maxHp * 0.2) p.hp -= p.maxHp * 0.03;
    this.dash(f, 9 * this.speedMul, 0.12, { hitR: 1.6, dmg: 24, color: LIGHT, hitOpts: { color: '#fff2b8' } });
    this.after(0.12, () => this.lb(from.clone().setY(from.y + 1), f, from.distanceTo(p.pos), 0.25, 0, { pierce: true, light: false }));
    g.audio?.energy('teleport'); g.audio?.whoosh(1.4);
  }
  rope() {
    const g = this.game, p = this.p, f = this.fwd(), R = 5.5;
    this.pose('swingR', 0.35);
    // the rope's sweep, drawn as a dark arc
    g.fx.slashArc(p.pos.clone().setY(p.pos.y + 1), p.facing, ROPE, R, 0.9, 0.25);
    g.fx.slashArc(p.pos.clone().setY(p.pos.y + 1.05), p.facing, 0x8a2a2a, R * 0.95, 0.9, 0.2);
    for (const e of this.foes(p.pos, R, f, 0.9)) {
      e.cancelAttack?.(); e.guardT = 0;   // the rope cancels techniques: attacks break, shields drop
      this.hit(e, 22, { stagger: 0.7, unblockable: true, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(5) });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: 0xff5a5a });
    }
    g.audio?.noise({ dur: 0.25, gain: 0.3, type: 'bandpass', freq: 500, sweep: 2500, q: 2 });
  }
  ropeBind() {
    const g = this.game, p = this.p, t = this.target(12);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.3);
    const line = mesh(GEO.box, mat(ROPE, { roughness: 0.9 }), 1);
    this.stun(t, 3); t.cancelAttack?.();
    temp(this, line, 3, () => {
      if (t.dead) return false;
      const a = this.handPos(), b = tmp.copy(t.pos).setY(t.pos.y + 1);
      line.position.lerpVectors(a, b, 0.5); line.scale.set(0.08, 0.08, a.distanceTo(b)); line.lookAt(b);
      if (Math.random() < 0.2) g.particles.burst(b, { count: 1, color: 0x8a2a2a, speed: 0.5, life: 0.4, size: 0.2 });
    }, () => {
      if (t.dead) return;
      tmp.subVectors(p.pos, t.pos).setY(0); const d = tmp.length();
      if (!t.isBoss && d > 2) t.knock?.addScaledVector(tmp.normalize(), Math.min(18, d * 3));
      this.after(0.2, () => { if (!t.dead) { this.pose('punch', 0.25); this.hit(t, 30, { melee: true, stagger: 0.8, knock: tmp.subVectors(t.pos, p.pos).setY(0).setLength(9) }); g.audio?.impact(1.4); } });
    });
    g.audio?.noise({ dur: 0.3, gain: 0.25, type: 'bandpass', freq: 600, sweep: 2000, q: 2 });
  }
  lightspeedKick() {
    const g = this.game, p = this.p, f = this.fwd(), from = p.pos.clone(), L = 14 * this.speedMul;
    p.action = { type: 'cast', both: true, dur: 0.2, elapsed: 0, t: 0, moveScale: 0, lock: true, faceAim: true };
    g.toast?.('Lightspeed');
    g.markers.spawn({ pos: from, dur: 0.2, shape: 'rect', width: 3, length: L, facing: Math.atan2(f.x, f.z), color: LIGHT });
    this.after(0.2, () => {
      this.dash(f, L, 0.08, { color: LIGHT, iframes: 0.4 });
      this.after(0.09, () => {
        this.line(from, f, from.distanceTo(p.pos) + 1, 1.6, (e) => { this.hit(e, (70 + this.rank('lightspeed') * 25), { stagger: 1, unblockable: true, knock: tmp.copy(f).setLength(10), color: '#fff2b8' }); g.fx.slashLine(e.pos.clone().setY(e.pos.y + 1), tmp2.set(-f.z, 0.3, f.x).normalize(), 3, LIGHT, 0.3, 0.3); });
        this.lb(from.clone().setY(from.y + 1), f, from.distanceTo(p.pos) + 0.5, 0.9, 0, { pierce: true, dur: 0.6 });
        this.pose('spin', 0.35);
        g.fx.flash(0xffffff, 0.4, 0.2); g.hitStop(0.08); g.shake(0.6); g.audio?.energy('slash'); g.audio?.impact(1.8, 'crit');
      });
    });
  }
  // ------------------------------------------------------------ Domain
  buildOtherworld(g, d) {
    this.clearOtherworld();
    const grp = new THREE.Group();
    const white = mat(0xe8e4dc, { roughness: 0.4, emissive: 0.08 }), black = mat(0x08080c, { roughness: 0.3, metalness: 0.4 });
    const debris = mat(0x6a6670, { roughness: 0.9 });
    this.owCubes = [];
    // a blocky, abstract realm: black and white blocks standing round the rim and hanging high
    // over it, half light, half dark (kept out of the camera's line to the fight)
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + Math.random() * 0.1, rr = d.radius - 1.5 - Math.random() * 5;
      const light = Math.cos(a) > 0, s = 1.2 + Math.random() * 2.6;
      const m = mesh(GEO.box, light ? white : black, [s, s * (0.8 + Math.random() * 1.6), s]);
      const gy = this.groundAt(d.center.x + Math.cos(a) * rr, d.center.z + Math.sin(a) * rr, d.center.y);
      m.position.set(d.center.x + Math.cos(a) * rr, gy + (i % 3 === 0 ? 3 + Math.random() * 7 : s * 0.5), d.center.z + Math.sin(a) * rr);
      m.rotation.set(i % 3 === 0 ? Math.random() : 0, Math.random() * 3, i % 3 === 0 ? Math.random() : 0);
      grp.add(m); this.owCubes.push({ m, spin: i % 3 === 0 ? (Math.random() - 0.5) * 0.6 : 0, bob: Math.random() * 6, y: m.position.y });
    }
    // small blocks scattered low across the floor, half buried
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, rr = 4 + Math.random() * (d.radius - 8), s = 0.4 + Math.random() * 0.9;
      const m = mesh(GEO.box, Math.cos(a) > 0 ? white : black, s);
      m.position.set(d.center.x + Math.cos(a) * rr, this.groundAt(d.center.x + Math.cos(a) * rr, d.center.z + Math.sin(a) * rr, d.center.y) + s * 0.3, d.center.z + Math.sin(a) * rr);
      m.rotation.set(Math.random(), Math.random(), Math.random()); grp.add(m);
    }
    // floating building debris high over the rim (the ruin the domain swallowed)
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, rr = d.radius - 2 - Math.random() * 6;
      const m = mesh(GEO.box, debris, [1 + Math.random() * 3, 0.5 + Math.random(), 1 + Math.random() * 2]);
      m.position.set(d.center.x + Math.cos(a) * rr, d.center.y + 8 + Math.random() * 8, d.center.z + Math.sin(a) * rr);
      m.rotation.set(Math.random(), Math.random(), Math.random());
      grp.add(m); this.owCubes.push({ m, spin: (Math.random() - 0.5) * 0.3, bob: Math.random() * 6, y: m.position.y });
    }
    // the great black void and the sun of Light facing each other across the realm
    const sun = makeOrb(LIGHT, { radius: 3, coreColor: 0xffffff }); sun.position.set(d.center.x + d.radius - 3, d.center.y + 9, d.center.z);
    const hole = makeOrb(VOID, { radius: 3, darkCore: true }); hole.position.set(d.center.x - d.radius + 3, d.center.y + 9, d.center.z);
    grp.add(sun, hole);
    // the floor split down the middle
    const half = mesh(GEO.box, black, [d.radius, 0.06, d.radius * 2]); half.position.set(d.center.x - d.radius / 2, this.groundAt(d.center.x, d.center.z, d.center.y) + 0.04, d.center.z); grp.add(half);
    this.ow = rise(this, grp, -8, 0.6);
    this.owLight = g.lights.flash(d.center.clone().setY(d.center.y + 10), LIGHT, 2.5, d.radius * 2, 60, { priority: 4, fade: false });
  }
  clearOtherworld() {
    const g = this.game;
    if (this.ow) { g.scene.remove(this.ow); this.ow = null; }
    if (this.owLight) { g.lights.remove(this.owLight); this.owLight = null; }
  }
  otherworldTick(g, d, dt) {
    for (const c of this.owCubes ?? []) { c.m.rotation.y += c.spin * dt; c.m.position.y = c.y + Math.sin(g.time * 0.8 + c.bob) * 0.4; }
    d.beat = (d.beat ?? 0.4) - dt;
    if (d.beat > 0) return;
    d.beat = 0.7;
    d.phase2 = !d.phase2;
    const heat = 1 + this.rank('transcend') * 0.25;
    for (const e of insideFoes(g)) {
      const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6);
      const dmg = (e.isBoss ? mx * 0.025 : Math.max(18, mx * 0.22)) * heat;
      if (d.phase2) {
        // Light: a pillar spears down through the curse
        pillar(this, e.pos.clone(), 0.8, 18, LIGHT, 0.4);
        this.hit(e, dmg, { stagger: e.isBoss ? 0 : 0.4, unblockable: true, crit: false, ceGain: 0, color: '#fff2b8' });
        this.stun(e, 0.4);
      } else {
        // Darkness: a black sphere swallows the curse for a moment
        const o = makeOrb(VOID, { radius: 1, darkCore: true });
        temp(this, o, 0.5, (t, dt2, k) => { o.position.set(e.pos.x, e.pos.y + (e.height ?? 1.5) * 0.5, e.pos.z); o.scale.setScalar((e.height ?? 1.5) * 0.7 * Math.sin(k * Math.PI)); });
        this.hit(e, dmg, { stagger: e.isBoss ? 0 : 0.3, unblockable: true, crit: false, ceGain: 0, color: '#a88aff' });
        if (!e.isBoss) e.slowT = Math.max(e.slowT ?? 0, 0.8);
      }
    }
    g.audio?.tone({ freq: d.phase2 ? 1400 : 90, to: d.phase2 ? 700 : 50, dur: 0.3, gain: 0.08, type: d.phase2 ? 'sine' : 'sawtooth', filter: 1500, rev: 0.4 });
  }
}
registerKit('dabura', DaburaKit, DABURA_SKILLS);
