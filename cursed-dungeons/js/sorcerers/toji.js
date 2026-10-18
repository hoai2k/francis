// Toji-style kit — Heavenly Restriction.
// Toji has zero cursed energy: no passive flow, every tool costs nothing.
// The CE bar becomes his "Hunter's Instinct" meter, filled only by hits and kills.
//   LMB  five-hit cursed-tool combo, monstrous physical damage.
//   RMB  Inverted Spear of Heaven: dash-stab through a line of curses,
//        nullifying shields and techniques.
//   1    Chain of a Thousand Miles: the spear whirls on its endless chain,
//        sweeping a huge circle and dragging curses in.
//   2    Playful Cloud: a six-blow three-section-staff flurry ending in a
//        crushing smash.
//   3    Split Soul Katana: blink to a curse and cut its soul — ignores armor,
//        scales with the target's toughness.
//   F    Sorcerer Killer (ultimate — Toji has no domain): the full Hunter's
//        Instinct meter (filled only by hits and kills) unleashes the hunt that
//        killed Gojo once. Slow-mo, Toji blinks through the curses around his
//        prey cutting their souls, then runs the strongest one through with the
//        Inverted Spear of Heaven: its technique is nullified, a normal curse
//        dies outright and a boss takes a massive wound. A short rampage follows.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { B } from '../world/blocks.js';

const GREEN = 0xb8f070, SILVER = 0xe8f0f4, BLOOD = 0xff3a3a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('toji', {
  name: 'Toji', technique: 'Heavenly Restriction', rarity: 'legendary', title: 'Sorcerer Killer',
  desc: 'Zero cursed energy, monstrous body: cursed tools (Inverted Spear, Chain, Playful Cloud, Split Soul Katana) cost nothing, and hits fuel a Hunter\'s Instinct rampage.',
  ultimate: 'Sorcerer Killer', color: '#b8f070',
});

registerLook('toji', {
  paint: { skinTone: 0xe6bc9c, hair: 0x0e0e10, hairVolume: true, top: 0x141418, collar: 0x141418, topTrim: 0x101014, buttons: 0x141418, sleeve: 0xe6bc9c, pants: 0xdcdad2, shoes: 0x1a1a1a, eye: 0x2a3a2a, fringe: 2, hairSide: 3, hairBack: 4 },
  paintExtra(S) {
    // the scar across the right corner of his mouth
    S.px(10, 13, 0xc88a86); S.px(10, 14, 0xc88a86); S.px(10, 15, 0xc88a86);
    // muscle shading on the tight shirt
    S.rect(21, 23, 2, 3, 0x0a0a0c, 0.05); S.rect(25, 23, 2, 3, 0x0a0a0c, 0.05);
  },
  hair: (m) => [
    { x: -2, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.4, rz: 0.3, material: m },
    { x: 1.5, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.5, rz: -0.3, material: m },
    { x: 0, y: 8, z: -1.5, w: 5, h: 2.5, d: 4, rx: -0.4, material: m },
    { x: 0, y: 7, z: 3.2, w: 4, h: 2, d: 1.5, rx: 1.1, material: m },
  ],
  hairColor: 0x0e0e10, accent: GREEN, emit: 0, cape: null,
  props(rig, K) {
    // the worm curse that stores his arsenal, coiled around his torso
    const worm = K.mat(0x6a5a78, { roughness: 0.8 }), band = K.mat(0x3a2e44, { roughness: 0.8 }), eye = K.mat(0xffe04a, { emissive: 2 });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      K.box(rig.torso, 2.6, 2.6, 2.6, i % 2 ? band : worm, Math.sin(a) * 5, 4 + i * 0.55, Math.cos(a) * 3.2, 0, a, 0.3);
    }
    const head = K.box(rig.torso, 3.6, 3.2, 3.6, worm, 3.6, 11.5, -1.5, 0, 0.6, -0.3);
    K.box(head, 0.8, 0.8, 0.4, eye, -0.8, 0.5, 1.9); K.box(head, 0.8, 0.8, 0.4, eye, 0.8, 0.5, 1.9);
    // cursed tools, one visible at a time in the right hand
    const tool = (build) => { const g = new THREE.Group(); build(g); g.rotation.x = Math.PI / 2; g.position.z = 3 * K.PX; g.visible = false; rig.handR.add(g); return g; };
    const steel = K.mat(0xd8e0e8, { metalness: 0.9, roughness: 0.25 }), grip = K.mat(0x2a1a14, { roughness: 0.9 });
    const spear = tool((g) => {
      K.box(g, 1.2, 4, 1.2, grip, 0, 0, 0);
      K.box(g, 3.2, 0.8, 1, steel, 0, -2.2, 0);
      K.box(g, 1, 7, 0.4, steel, 0, -6, 0);
      K.box(g, 0.8, 2.2, 0.4, steel, 0.9, -4.2, 0, 0, 0, 0.5);   // the jitte hook
      K.box(g, 0.4, 0.4, 8, K.mat(0x8a8a90, { metalness: 0.8 }), 0, 1.5, -3);   // chain trailing off
    });
    const cloud = tool((g) => {
      const red = K.mat(0x9a2a24, { roughness: 0.5, metalness: 0.3 }), gold = K.mat(0xd8a830, { metalness: 0.8, roughness: 0.3 });
      for (let s = 0; s < 3; s++) { K.box(g, 1.3, 8, 1.3, red, s * 1.5 - 1.5, -3, 0, 0, 0, (s - 1) * 0.35); K.box(g, 1.6, 1, 1.6, gold, s * 1.5 - 1.5, -7, 0, 0, 0, (s - 1) * 0.35); }
    });
    const katana = tool((g) => {
      K.box(g, 1.1, 4, 1.1, grip, 0, 0, 0);
      K.box(g, 2.4, 0.6, 2.4, K.mat(0x1a1a1a), 0, -2.1, 0);
      K.box(g, 0.9, 13, 0.3, K.mat(0xf0f4f8, { metalness: 0.9, roughness: 0.15, emissive: 0.3, emissiveColor: GREEN }), 0, -8.8, 0);
    });
    spear.visible = true;
    rig.extras.tools = { spear, cloud, katana };
    rig.extras.weapon = spear;
  },
});

export const TOJI_SKILLS = [
  { id: 'spear', name: 'Inverted Spear', icon: '🗡️', desc: 'The spear dash reaches further and stabs harder; Spear Throw and Run Through hit harder.', max: 3, branch: 'Spear', tier: 1, req: 'ab:spear' },
  { id: 'chain', name: 'Thousand Miles', icon: '⛓️', desc: 'Wider chain sweeps and a stronger pull.', max: 2, branch: 'Chain', tier: 3, req: 'ab:chain' },
  { id: 'cloud', name: 'Playful Cloud', icon: '🥢', desc: 'Every staff blow hits harder.', max: 3, branch: 'Arsenal', tier: 3, req: 'ab:cloud' },
  { id: 'katana', name: 'Split Soul', icon: '⚔️', desc: 'The katana cuts deeper into tough curses.', max: 3, branch: 'Arsenal', tier: 4, req: 'ab:katana' },
  { id: 'physique', name: 'Heavenly Body', icon: '🫀', desc: '+20 max HP and +5% speed per rank.', max: 3, branch: 'Body', tier: 0 },
  { id: 'instinct', name: 'Hunter\'s Instinct', icon: '🐆', desc: 'Kills fill the meter faster; Sorcerer Killer cuts down more curses and its rampage lasts longer.', max: 2, branch: 'Hunter', tier: 0 },
];

class TojiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    // Heavenly Restriction: no cursed energy flows at all
    p.ceRegen = 0;
    p.stats.speed += 0.3 + r('physique') * 0.05;
    p.stats.meleeMult += 0.45;
    p.stats.crit += 0.06;
    p.stats.armor += 0.1;
    const hpBonus = 60 + r('physique') * 20;
    p.maxHp += hpBonus; p.hp = Math.min(p.hp + hpBonus, p.maxHp);
    this.combo = [
      { style: 'swingR', dur: 0.26, windup: 0.26, strike: 0.48, dmg: 15, range: 2.9, arc: 1.2, lunge: 9, knock: 4, stop: 0.05, shake: 0.16, trail: SILVER, sparkColor: 0xe8fff0, chainAt: 0.55 },
      { style: 'swingL', dur: 0.26, windup: 0.26, strike: 0.48, dmg: 15, range: 2.9, arc: 1.2, lunge: 9, knock: 4, stop: 0.05, shake: 0.16, trail: SILVER, sparkColor: 0xe8fff0, chainAt: 0.55 },
      { style: 'punch', dur: 0.24, windup: 0.25, strike: 0.45, dmg: 14, range: 2.6, arc: 1.0, lunge: 11, knock: 6, stop: 0.05, shake: 0.18, trail: GREEN, chainAt: 0.55 },
      { style: 'uppercut', dur: 0.34, windup: 0.3, strike: 0.5, dmg: 19, range: 2.7, arc: 1.0, lunge: 6, knock: 5, stop: 0.07, shake: 0.24, trail: GREEN, launch: true, chainAt: 0.6 },
      { style: 'slam', dur: 0.5, windup: 0.4, strike: 0.6, dmg: 34, range: 3.5, arc: Math.PI, lunge: 5, knock: 13, stop: 0.1, shake: 0.5, ring: true, ringColor: GREEN, stagger: 0.7, trail: SILVER },
    ];
    // Every one of Toji's abilities is a cursed tool or a physical feat: none
    // of them costs anything (he has no cursed energy to spend). The CE bar is
    // the Hunter's Instinct meter, filled only by hits and kills.
    this.branches = ['Spear', 'Chain', 'Arsenal', 'Body', 'Hunter'];
    this.library = {
      // ---- Inverted Spear of Heaven
      spear: ability({ name: 'Inverted Spear of Heaven', icon: '🗡️', kind: 'basic', desc: 'Dash-stab through a line of curses. The spear nullifies techniques: shields and guards don\'t matter.', cd: 1.4, ce: 0, branch: 'Spear', tier: 0, start: true, legacy: 'ranged', use: () => this.spear() }),
      spear_throw: ability({ name: 'Spear Throw', icon: '🎯', kind: 'technique', desc: 'Hurl the Inverted Spear on its chain through a long line of curses, cancelling their attacks, then yank it back and drag them in.', cd: 5, ce: 0, branch: 'Spear', tier: 1, req: 'spear', use: () => this.spearThrow() }),
      nullify: ability({ name: 'Nullifying Thrust', icon: '🚫', kind: 'technique', desc: 'Close in and drive the spear into a curse: its technique is forcibly cancelled and it is pinned in place.', cd: 9, ce: 0, branch: 'Spear', tier: 2, req: 'spear_throw', use: () => this.nullify() }),
      run_through: ability({ name: 'Run Through', icon: '☄️', kind: 'technique', desc: 'The thrust that pierced Infinity: a line is marked, then Toji charges down it, running every curse on it through.', cd: 18, ce: 0, branch: 'Spear', tier: 4, req: 'nullify', use: () => this.runThrough() }),
      // ---- Chain of a Thousand Miles
      chain: ability({ name: 'Chain of a Thousand Miles', icon: '⛓️', kind: 'technique', desc: 'The spear whirls on its endless chain, sweeping a huge circle and dragging curses in.', cd: 5, ce: 0, branch: 'Chain', tier: 1, legacy: 't1', use: () => this.chain() }),
      chain_snare: ability({ name: 'Chain Snare', icon: '🪝', kind: 'technique', desc: 'Lash the chain around a curse and yank it to your feet, stunned. Against something too big to move, the chain pulls you to it instead.', cd: 6, ce: 0, branch: 'Chain', tier: 2, req: 'chain', use: () => this.chainSnare() }),
      chain_swing: ability({ name: 'Chain Swing', icon: '🧗', kind: 'movement', desc: 'Hook the chain ahead and haul yourself along it, bowling over anything in the way.', cd: 5, ce: 0, branch: 'Chain', tier: 2, req: 'chain', use: () => this.chainSwing() }),
      endless_chain: ability({ name: 'Endless Chain', icon: '🌀', kind: 'technique', desc: 'Keep the chain spinning for 3s: a wide ring of steel around you that shreds every curse it passes. You can move while it spins.', cd: 14, ce: 0, branch: 'Chain', tier: 3, req: 'chain_snare', use: () => this.endlessChain() }),
      // ---- the arsenal in the Inventory Curse
      pistol: ability({ name: 'Handgun', icon: '🔫', kind: 'basic', desc: 'A plain pistol from the Inventory Curse — fast, precise shots with a high critical chance.', cd: 0.55, ce: 0, branch: 'Arsenal', tier: 1, req: 'spear', use: () => this.pistol() }),
      knives: ability({ name: 'Throwing Knives', icon: '🔪', kind: 'basic', desc: 'A fan of five knives that cut through curses.', cd: 1.3, ce: 0, branch: 'Arsenal', tier: 2, req: 'pistol', use: () => this.knives() }),
      cloud: ability({ name: 'Playful Cloud', icon: '🥢', kind: 'technique', desc: 'A six-blow three-section-staff flurry ending in a crushing smash. Its power is the wielder\'s strength.', cd: 8, ce: 0, branch: 'Arsenal', tier: 2, legacy: 't2', req: 'pistol', use: () => this.cloud() }),
      cloud_smash: ability({ name: 'Skull Breaker', icon: '🔨', kind: 'technique', desc: 'Leap and bring Playful Cloud down where you aim (the spot is marked): a crater that stuns everything in it.', cd: 10, ce: 0, branch: 'Arsenal', tier: 3, req: 'cloud', use: () => this.cloudSmash() }),
      katana: ability({ name: 'Split Soul Katana', icon: '⚔️', kind: 'technique', desc: 'Blink to a curse and cut its soul — ignores armor, scales with the target\'s toughness.', cd: 12, ce: 0, branch: 'Arsenal', tier: 3, legacy: 't3', req: 'cloud', use: () => this.katana() }),
      arsenal: ability({ name: 'Arsenal Spill', icon: '🐛', kind: 'technique', desc: 'The Inventory Curse disgorges its whole hoard: three volleys of blades in a cone, then the spear itself.', cd: 16, ce: 0, branch: 'Arsenal', tier: 4, req: 'katana', use: () => this.arsenalSpill() }),
      // ---- the Heavenly Restriction body
      speed_dash: ability({ name: 'Heavenly Speed', icon: '💨', kind: 'movement', desc: 'Move faster than the eye can follow: a long, invulnerable dash that leaves afterimages.', cd: 3.5, ce: 0, branch: 'Body', tier: 1, use: () => this.speedDash() }),
      kick: ability({ name: 'Flying Kick', icon: '🦶', kind: 'technique', desc: 'A leaping kick that blasts the first curse across the battlefield, through anything behind it.', cd: 6, ce: 0, branch: 'Body', tier: 2, req: 'speed_dash', use: () => this.flyingKick() }),
      senses: ability({ name: 'Heightened Senses', icon: '👂', kind: 'buff', desc: 'For 6s your senses are absolute: the next three attacks that would hit you miss, and you counter each one.', cd: 18, ce: 0, branch: 'Body', tier: 2, req: 'speed_dash', use: () => this.senses() }),
      iron_body: ability({ name: 'Iron Physique', icon: '🛡️', kind: 'defence', desc: 'Tense a body built beyond human limits: 4s of 55% less damage, and anything that strikes you in melee is knocked away.', cd: 15, ce: 0, branch: 'Body', tier: 3, req: 'kick', use: () => this.ironBody() }),
      afterimage: ability({ name: 'Afterimage', icon: '👥', kind: 'movement', desc: 'Leave an afterimage the curses attack while you vanish for a moment and reappear behind your target.', cd: 9, ce: 0, branch: 'Body', tier: 3, req: 'senses', use: () => this.afterimage() }),
      // ---- the hunt
      ambush: ability({ name: 'Ambush', icon: '🐆', kind: 'technique', desc: 'Vanish (curses lose track of you), then strike the nearest curse from behind with a guaranteed critical.', cd: 9, ce: 0, branch: 'Hunter', tier: 1, use: () => this.ambush() }),
      fly_heads: ability({ name: 'Fly Head Swarm', icon: '🪰', kind: 'summon', desc: 'Release a cloud of Grade 4 fly heads where you aim. Curses in it are swarmed — slowed, chewed on, and wide open to your criticals.', cd: 16, ce: 0, branch: 'Hunter', tier: 2, req: 'ambush', use: () => this.flyHeads() }),
      prey_mark: ability({ name: 'Mark the Prey', icon: '🩸', kind: 'buff', desc: 'Pick your prey: for 8s it takes 40% more damage from you and every hit on it fills the Hunter\'s Instinct meter twice as fast.', cd: 14, ce: 0, branch: 'Hunter', tier: 2, req: 'ambush', use: () => this.markPrey() }),
      rampage: ability({ name: 'Rampage', icon: '🔥', kind: 'buff', desc: 'Let the beast out for 6s: 45% faster and 25% quicker attacks.', cd: 24, ce: 0, branch: 'Hunter', tier: 3, req: 'prey_mark', use: () => this.startRampage(6) }),
      execute: ability({ name: 'Coup de Grâce', icon: '💀', kind: 'technique', desc: 'Blink to the most wounded curse nearby and finish it: a weakened curse (below 35%) dies outright; anything else takes a cut that grows with its wounds.', cd: 12, ce: 0, branch: 'Hunter', tier: 4, req: 'rampage', use: () => this.execute() }),
    };
    this.passives = {
      tool_master: passive({ name: 'Tool Master', icon: '🧰', desc: 'Every cursed tool comes out faster: ability cooldowns -15%.', branch: 'Arsenal', tier: 2, req: 'pistol', apply: (pl, k) => { k.cdMul *= 0.85; } }),
      heavenly_physique: passive({ name: 'Heavenly Physique', icon: '💪', desc: '+40 max health and 10% damage reduction.', branch: 'Body', tier: 2, req: 'speed_dash', apply: (pl) => { pl.maxHp += 40; pl.hp += 40; pl.stats.armor += 0.1; } }),
      reflexes: passive({ name: 'Restricted Reflexes', icon: '🌪️', desc: '12% chance to evade any hit completely.', branch: 'Body', tier: 3, req: 'senses', apply: (pl, k) => { k.evade = 0.12; } }),
      unseen: passive({ name: 'Zero Cursed Energy', icon: '👻', desc: 'Curses can\'t feel you coming: after 3s without taking damage, your next hit deals double damage.', branch: 'Hunter', tier: 2, req: 'ambush', apply: (pl, k) => { k.unseen = true; } }),
      hunger: passive({ name: 'Hunter\'s Hunger', icon: '🍖', desc: 'Kills fill the meter 50% faster and heal 4% of your health.', branch: 'Hunter', tier: 3, req: 'prey_mark', apply: (pl, k) => { k.hunger = true; } }),
    };
    // no domain: the meter is spent on one perfect kill
    this.ultimate = { name: 'Sorcerer Killer', icon: '🐆', use: () => this.sorcererKiller() };
    this.rampageT = 0;
    this.readyPinged = false;
  }
  get rampage() { return this.rampageT > 0; }
  get speedMul() { return this.rampage ? 1.45 : 1; }
  dispose() {
    super.dispose(); this.disposed = true;
    clearTimeout(this.toolTimer);
    for (const id of this.ultTimers ?? []) clearTimeout(id);
    this.ultTimers = [];
    if (this.ultActive) { this.game.fx.dimTarget = 0; this.ultActive = false; }
  }
  // ------------------------------------------------------------- helpers
  showTool(name, dur = 1.1) {
    const tools = this.p.rig.extras.tools; if (!tools) return;
    for (const k in tools) tools[k].visible = k === name;
    clearTimeout(this.toolTimer);
    if (name !== 'spear') this.toolTimer = setTimeout(() => { if (!this.disposed) for (const k in tools) tools[k].visible = k === 'spear'; }, dur * 1000);
  }
  safeSpot(x, z, y) {
    const w = this.game.world;
    const gy = w.groundBelow(x, z, y + 2);
    if (!isFinite(gy) || Math.abs(gy - y) > 3 || w.solidAt(x, gy + 0.5, z) || w.solidAt(x, gy + 1.5, z)) return null;
    return new THREE.Vector3(x, gy, z);
  }
  blinkTo(to) {
    const p = this.p, g = this.game;
    for (let i = 0; i < 6; i++) { const k = i / 6; g.particles.burst(tmp.lerpVectors(p.pos, to, k).setY(p.pos.y + 1), { count: 3, color: GREEN, speed: 0.6, life: 0.3, size: 0.35, sizeEnd: 0.05, intensity: 1.2 }); }
    p.pos.copy(to); p.visY = to.y; p.vel.set(0, 0, 0);
  }
  // (kills are credited once by the framework: player.onHitEnemy -> onKill)
  onKill(e) {
    if (e.isDummy) return;
    const p = this.p;
    p.gainCE((6 + this.rank('instinct') * 4 + (e.isBoss ? 30 : 0)) * (this.hunger ? 1.5 : 1));
    if (this.hunger) p.heal?.(p.maxHp * 0.04, true);
    if (e === this.prey) this.prey = null;
  }
  onHitEnemy(e, dealt, o) {
    // Mark the Prey: hits on it fill the meter twice as fast
    if (e === this.prey && this.preyT > 0 && !o.preyBonus) this.p.gainCE(o.ceGain ?? dealt * 0.08);
  }
  // every hit Toji deals goes through here: prey bonus, swarmed crits, the unseen first strike
  hit(e, dmg, o = {}) {
    if (!e || e.dead) return 0;
    let m = 1;
    if (e === this.prey && this.preyT > 0) m *= 1.4;
    if (this.unseen && this.game.time - (this.lastHurtT ?? -9) > 3 && !this.unseenUsed) { m *= 2; this.unseenUsed = true; this.game.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), null, { color: GREEN, big: true }); }
    if ((e.swarmedT ?? 0) > 0 && o.crit == null) o = { ...o, crit: true };
    return this.game.combat.damageEnemy(e, dmg * m, this.p, o);
  }
  blackFlashReady() { return false; }
  onMeleeHit(e, step, dealt) {
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
    // the combo benefits from the hunt too (bonus dealt as a follow-up)
    let m = 0;
    if (e === this.prey && this.preyT > 0) m += 0.4;
    if (this.unseen && this.game.time - (this.lastHurtT ?? -9) > 3 && !this.unseenUsed) { m += 1; this.unseenUsed = true; }
    if (m && !e.dead) this.game.combat.damageEnemy(e, dealt * m, this.p, { melee: true, stagger: 0, crit: false, ceGain: 0, preyBonus: true });
  }
  incoming(amount, src) {
    if (this.evade && Math.random() < this.evade) { this.dodgeFx(); return 0; }
    this.lastHurtT = this.game.time; this.unseenUsed = false;
    return amount;
  }
  tick(dt) {
    const p = this.p, g = this.game;
    if (!this.domainLocked && !this.readyPinged && p.ce >= p.maxCe) { this.readyPinged = true; g.toast?.('🐆 Hunter\'s Instinct is full — Sorcerer Killer is ready (F)'); }
    if (p.ce < p.maxCe) this.readyPinged = false;
    this.rampageT = Math.max(0, this.rampageT - dt);
    this.preyT = Math.max(0, (this.preyT ?? 0) - dt);
    if (this.prey && (this.prey.dead || this.preyT <= 0)) this.prey = null;
    if (this.prey && Math.random() < 0.5) { const e = this.prey; g.particles.glow.emit(e.pos.x + (Math.random() - 0.5) * e.radius, e.pos.y + e.height + 0.3, e.pos.z + (Math.random() - 0.5) * e.radius, 0, 0.8, 0, 0.4, 2.4, 0.3, 0.3, 0.16, 0, 1, 0.3, 1); }
    // the unseen strike is ready again: a faint green glint in the hand
    if (this.unseen && !this.unseenUsed && g.time - (this.lastHurtT ?? -9) > 3 && Math.random() < 0.2) g.particles.burst(this.handPos(), { count: 1, color: GREEN, speed: 1, life: 0.3, size: 0.1, shape: 1 });
    for (const e of g.enemies) if (e.swarmedT > 0) e.swarmedT -= dt;
    if (this.rampage && Math.random() < 0.5) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.8, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.8, 0, 1.2, 0, 0.4, 1.4, 2.2, 0.8, 0.12, 0, 1, 0.2, 1);
  }
  // ---------------------------------------------------------- techniques
  spear() {
    const g = this.game, p = this.p, rk = this.rank('spear');
    const dir = p.aimDir.clone().setY(0).normalize();
    const L = 6 + rk * 1.3;
    let dist = 0, to = p.pos.clone();
    for (let s = 0.5; s <= L; s += 0.5) { const q = this.safeSpot(p.pos.x + dir.x * s, p.pos.z + dir.z * s, p.pos.y); if (!q || Math.abs(q.y - p.pos.y) > 1.1) break; dist = s; to = q; }
    this.showTool('spear');
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.3, windup: 0.15 }, style: 'punch', dur: 0.3, elapsed: 0, t: 0, windup: 0.15, strike: 0.3, struck: true, moveScale: 0 };
    p.iframes = Math.max(p.iframes, 0.3);
    const from = p.pos.clone().setY(p.pos.y + 1.1);
    const reach = dist + 1.6;
    if (dist > 0.4) this.blinkTo(to);
    g.fx.slashLine(from, dir, reach, 0xffffff, 0.45, 0.2);
    g.fx.slashLine(from.clone().setY(from.y - 0.08), dir, reach, GREEN, 0.25, 0.32);
    const dmg = 24 + rk * 8;
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from).setY(0); const along = tmp.dot(dir);
      if (along < -0.5 || along > reach) continue;
      if (Math.abs(tmp.x * dir.z - tmp.z * dir.x) > 1 + e.radius) continue;
      // the spear nullifies techniques: shields and guards don't matter
      this.hit(e, dmg, { melee: true, unblockable: true, knock: dir.clone().multiplyScalar(5), stagger: 0.5, color: '#e8fff0' });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), dir, { color: SILVER, big: true });
      n++;
    }
    g.combat.hitBlocks(to, dir, 1.5, 0.8, 30, p);
    if (n) { g.hitStop(0.06); g.shake(0.22); g.audio?.impact(1.3, 'crit'); }
    g.audio?.energy('slash'); g.audio?.whoosh(1.1);
  }
  chain() {
    const g = this.game, p = this.p, rk = this.rank('chain');
    const R = 6.5 + rk * 1.5;
    this.showTool('spear', 0.8);
    p.action = { type: 'attack', step: { style: 'spin', strike: 0.45, windup: 0.2 }, style: 'spin', dur: 0.55, elapsed: 0, t: 0, windup: 0.2, strike: 0.45, struck: true, moveScale: 0.3 };
    g.audio?.whoosh(1.4);
    // the chain whirls a full circle, its spear tip drawing a ring of links
    let t = 0; const a0 = p.facing;
    g.addUpdater((dt) => {
      t += dt;
      const a = a0 + t / 0.4 * Math.PI * 2;
      const hand = tmp.set(p.pos.x, p.pos.y + 1.2, p.pos.z);
      for (let i = 1; i <= 10; i++) {
        const k = i / 10 * R;
        g.particles.glow.emit(hand.x + Math.sin(a) * k, hand.y - i * 0.04, hand.z + Math.cos(a) * k, 0, 0, 0, 0.12, 1.6, 1.7, 1.8, 0.09, 0, 0, 1, 1);
      }
      g.particles.burst(tmp2.set(hand.x + Math.sin(a) * R, hand.y - 0.4, hand.z + Math.cos(a) * R), { count: 2, color: GREEN, speed: 1, life: 0.25, size: 0.2, shape: 1 });
      return t < 0.4;
    });
    this.after(0.2, () => {
      const hits = g.combat.query(p.pos, tmp.set(0, 0, 1), R, Math.PI);
      for (const e of hits) {
        const toward = tmp.subVectors(p.pos, e.pos).setY(0); const d = toward.length(); toward.normalize();
        this.hit(e, 20 + rk * 8, { melee: true, knock: toward.multiplyScalar(Math.min(14, d * 2) + rk * 2), stagger: 0.7 });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: SILVER });
      }
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1, p.pos.z), { color: SILVER, r0: R * 0.9, r1: R, dur: 0.35, thick: 0.06 });
      g.fx.slashArc(p.pos, p.facing, GREEN, R, 1, 0.3);
      g.combat.hitBlocks(p.pos, tmp.set(0, 0, 1), R, Math.PI, 18, p);
      if (hits.length) { g.hitStop(0.07); g.shake(0.3); g.audio?.impact(1.4); }
    });
  }
  cloud() {
    const g = this.game, p = this.p, rk = this.rank('cloud');
    this.showTool('cloud', 1.3);
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const styles = ['swingR', 'swingL', 'swingR', 'swingL', 'spin', 'slam'];
    styles.forEach((style, i) => this.after(i * 0.08, () => {
      if (p.dead || this.disposed) return;
      const last = i === styles.length - 1;
      p.action = { type: 'attack', step: { style, strike: 0.4, windup: 0.2 }, style, dur: last ? 0.4 : 0.16, elapsed: 0, t: 0, windup: 0.2, strike: 0.4, struck: true, moveScale: 0.3 };
      const fwd = tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const R = last ? 4.4 : 3.6;
      const hits = g.combat.query(p.pos, fwd, R, last ? Math.PI : 1.1);
      for (const e of hits) {
        const kd = tmp.subVectors(e.pos, p.pos).setY(0).normalize();
        this.hit(e, last ? 34 + rk * 12 : 9 + rk * 3, { melee: true, knock: kd.multiplyScalar(last ? 16 : 2), stagger: last ? 1 : 0.3 });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), kd, { color: last ? BLOOD : 0xffd8a0, big: last });
      }
      g.fx.slashArc(p.pos, p.facing, last ? BLOOD : 0xd8a830, R, last ? 1 : 0.4, 0.16, i % 2 === 1);
      g.audio?.swing(i);
      if (last) {
        const c = p.pos.clone().addScaledVector(fwd, 1.5);
        g.fx.shockwave(c, BLOOD, R + 1); g.debris.burst(c.clone().setY(c.y + 0.3), B.concrete, 8);
        g.combat.hitBlocks(c, fwd, R, Math.PI, 60, p);
        g.shake(0.5); g.hitStop(0.09); g.audio?.impact(1.9); g.fx.screenWave(c, 0.6, 0.35);
      } else if (hits.length) { g.hitStop(0.025); g.shake(0.1); g.audio?.impact(0.8); }
    }));
  }
  katana() {
    const g = this.game, p = this.p, rk = this.rank('katana');
    let t = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    if (!t) { let bd = 10; for (const e of g.enemies) { if (e.dead || e.untargetable) continue; tmp.subVectors(e.pos, p.pos).setY(0); const d = tmp.length(); if (d < bd && (d < 3 || tmp.normalize().dot(p.aimDir) > 0.4)) { bd = d; t = e; } } }
    if (!t) { g.audio?.ui('back'); return false; }
    this.showTool('katana', 1);
    // blink past the target and cut through its soul
    const dir = tmp.subVectors(t.pos, p.pos).setY(0).normalize();
    const behind = this.safeSpot(t.pos.x + dir.x * (t.radius + 1.1), t.pos.z + dir.z * (t.radius + 1.1), t.pos.y);
    if (behind) this.blinkTo(behind);
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    p.action = { type: 'attack', step: { style: 'swingL', strike: 0.35, windup: 0.15 }, style: 'swingL', dur: 0.4, elapsed: 0, t: 0, windup: 0.15, strike: 0.35, struck: true, moveScale: 0 };
    p.iframes = Math.max(p.iframes, 0.4);
    const at = t.pos.clone().setY(t.pos.y + t.height * 0.55);
    g.fx.slashX(at, 2.6 + t.height * 0.4, 0xffffff);
    this.after(0.14, () => {
      if (t.dead) return;
      const soul = Math.min(t.maxHp * (0.14 + rk * 0.04), 240);
      // the blade strikes the soul itself: armor is irrelevant
      const dmg = (44 + rk * 14 + soul) / Math.max(0.2, 1 - (t.armor ?? 0));
      this.hit(t, dmg, { melee: true, unblockable: true, stagger: 1, knock: new THREE.Vector3(), color: '#b8f070' });
      g.fx.slashX(at, 3.2 + t.height * 0.5, GREEN);
      g.fx.slashLine(at.clone().add(tmp2.set(-1.8, 0.2, 0)), tmp.set(1, -0.1, 0), 3.6, 0xffffff, 0.3, 0.25);
      g.fx.hitSpark(at, null, { color: GREEN, big: true, crit: true });
      g.particles.burst(at, { count: 30, color: 0xd8ffd0, speed: 4, up: 1.5, life: 0.8, size: 0.25, sizeEnd: 0.05, intensity: 2 });
      g.lights.flash(at, GREEN, 10, 10, 0.3);
      g.fx.flash(0x102008, 0.3, 0.15); g.fx.chroma(0.9); g.slowMo(0.25, 0.25);
      g.hitStop(0.1); g.shake(0.4);
      g.audio?.energy('slash'); g.audio?.impact(1.8, 'crit');
    });
  }
  // ---------------------------------------------------------- ultimate
  // Sorcerer Killer: the prey is the toughest curse in reach. Its escorts are
  // cut down first, then the Inverted Spear of Heaven runs it through.
  sorcererKiller() {
    const g = this.game, p = this.p, rk = this.rank('instinct');
    if (this.ultActive) return false;
    let prey = null, best = -1;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable) continue;
      const d = e.pos.distanceTo(p.pos); if (d > 22) continue;
      const score = (e.isBoss ? 1e6 : 0) + e.maxHp - d;
      if (score > best) { best = score; prey = e; }
    }
    if (!prey) { g.toast?.('🐆 No prey in sight — the meter waits.'); g.audio?.ui('back'); return false; }
    this.ultActive = true; this.ultTimers = [];
    const later = (ms, fn) => this.ultTimers.push(setTimeout(() => { if (!this.disposed && !p.dead) fn(); }, ms));
    const escorts = g.enemies.filter((e) => e !== prey && !e.dead && !e.untargetable && !e.isBoss && e.pos.distanceTo(prey.pos) < 11)
      .sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)).slice(0, 4 + rk * 2);
    const total = 650 + escorts.length * 170 + 900;
    p.iframes = Math.max(p.iframes, total / 1000 + 0.4);
    g.slowMo(total / 1000, 0.3);
    g.fx.dimTarget = 0.45; g.fx.flash(0x0a1408, 0.5, 0.3); g.fx.chroma(0.8);
    g.toast?.('SORCERER KILLER', 'domain');
    g.rig.cinematic?.({ center: prey.pos.clone().setY(prey.pos.y + 0.6), dur: total / 1000 + 0.6, dist: 11, pitch: 0.45, orbit: 0.35 });
    g.audio?.charge(0.6, 0.7);
    // the hunter's stare: green motes rush in toward Toji
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3;
      g.particles.glow.emit(p.pos.x + Math.cos(a) * r, p.pos.y + 0.3 + Math.random() * 2, p.pos.z + Math.sin(a) * r, -Math.cos(a) * r * 2, 0, -Math.sin(a) * r * 2, 0.5, 1.4, 2.4, 0.8, 0.14, 0, 1, 0.2, 1);
    }
    // 1) cut down the escorts, one blink each — a soul cut, no armor
    escorts.forEach((e, i) => later(650 + i * 170, () => {
      if (e.dead) return;
      this.assassinate(e, 70 + rk * 20 + Math.min(e.maxHp * 0.35, 200));
      g.fx.slashX(e.pos.clone().setY(e.pos.y + e.height * 0.55), 2.4, GREEN);
    }));
    // 2) the kill: blink in front of the prey and run it through
    const strike = 650 + escorts.length * 170 + 150;
    later(strike, () => {
      if (prey.dead) return;
      const dir = tmp.subVectors(prey.pos, p.pos).setY(0); if (dir.lengthSq() < 0.01) dir.set(Math.sin(p.facing), 0, Math.cos(p.facing)); dir.normalize();
      const front = this.safeSpot(prey.pos.x - dir.x * (prey.radius + 1.3), prey.pos.z - dir.z * (prey.radius + 1.3), prey.pos.y);
      if (front) this.blinkTo(front);
      p.facing = Math.atan2(prey.pos.x - p.pos.x, prey.pos.z - p.pos.z);
      this.showTool('spear', 1.2);
      p.action = { type: 'attack', step: { style: 'punch', strike: 0.35, windup: 0.3 }, style: 'punch', dur: 0.5, elapsed: 0, t: 0, windup: 0.3, strike: 0.35, struck: true, moveScale: 0 };
      // the Inverted Spear of Heaven forcibly nullifies its technique
      prey.cancelAttack?.(); prey.cd = Math.max(prey.cd ?? 0, 5); prey.sealT = Math.max(prey.sealT ?? 0, prey.isBoss ? 1.2 : 2);
      g.fx.rings.spawn(tmp2.set(prey.pos.x, prey.pos.y + prey.height * 0.55, prey.pos.z), { color: SILVER, r0: prey.radius + 2.5, r1: 0.2, dur: 0.3, thick: 0.12 });
      g.audio?.energy('infinity');
    });
    later(strike + 260, () => {
      if (prey.dead) return;
      const at = prey.pos.clone().setY(prey.pos.y + prey.height * 0.55);
      const dir = tmp.subVectors(prey.pos, p.pos).setY(0).normalize();
      const from = p.pos.clone().setY(p.pos.y + 1.1);
      // a normal curse dies outright; a boss takes a wound it cannot shrug off
      const dmg = prey.isBoss ? 160 + Math.min(prey.maxHp * (0.28 + rk * 0.04), 900) : (prey.hp + 1) / Math.max(0.2, 1 - (prey.armor ?? 0));
      this.hit(prey, dmg, { melee: true, unblockable: true, crit: true, critMult: 1, stagger: 1.2, knock: dir.clone().multiplyScalar(prey.isBoss ? 2 : 16), color: '#e8fff0', ceGain: 0 });
      g.fx.slashLine(from, dir, 9, 0xffffff, 0.7, 0.35);
      g.fx.slashLine(from.clone().setY(from.y - 0.1), dir, 12, GREEN, 0.35, 0.5);
      g.fx.hitSpark(at, dir, { color: SILVER, big: true, crit: true });
      g.particles.burst(at, { count: 50, color: BLOOD, additive: false, speed: 7, dir: dir.clone().multiplyScalar(6), up: 0.6, life: 0.7, size: 0.18, gravity: 14, shape: 1 });
      g.particles.burst(at, { count: 40, color: 0xe8fff0, speed: 9, life: 0.5, size: 0.14, shape: 1, intensity: 3 });
      g.fx.shockwave(prey.pos, SILVER, 6); g.fx.screenWave(at, 1.4, 0.6);
      g.lights.flash(at, 0xe8fff0, 22, 18, 0.5, { priority: 8 });
      g.fx.flash(0xffffff, 0.55, 0.12); g.fx.blackFlash(0.2); g.fx.chroma(1.4);
      g.hitStop(0.16); g.shake(0.9);
      g.audio?.impact(2.2, 'crit'); g.audio?.energy('slash');
    });
    // 3) the follow-through: a katana cross through whatever is left
    this.ultTimers.push(setTimeout(() => { if (!this.disposed) { this.ultActive = false; g.fx.dimTarget = 0; } }, strike + 560));
    later(strike + 560, () => {
      this.rampageT = 4 + rk * 1.5;
      if (prey.dead) { g.toast?.('🐆 Target eliminated.'); return; }
      this.showTool('katana', 0.6);
      const at = prey.pos.clone().setY(prey.pos.y + prey.height * 0.55);
      this.hit(prey, 50 + rk * 20, { melee: true, unblockable: true, stagger: 0.8, knock: new THREE.Vector3(), color: '#b8f070' });
      g.fx.slashX(at, 3.6 + prey.height * 0.5, GREEN);
      g.shake(0.4); g.audio?.energy('slash');
    });
    return true;
  }
  // ============================================================== tree abilities
  dodgeFx() {
    const g = this.game, p = this.p;
    g.fx.damageNumber(p.pos.clone().setY(p.pos.y + 1.6), 0, { text: 'EVADE', color: '#b8f070' });
    for (let i = 0; i < 6; i++) g.particles.burst(tmp.set(p.pos.x + (Math.random() - 0.5) * 1.6, p.pos.y + 0.4 + Math.random() * 1.4, p.pos.z + (Math.random() - 0.5) * 1.6), { count: 1, color: GREEN, speed: 0.5, life: 0.3, size: 0.4, sizeEnd: 0.05 });
    p.iframes = Math.max(p.iframes, 0.25);
    g.audio?.whoosh(0.8);
  }
  // a chain drawn from a to b out of glowing links
  chainFx(a, b, life = 0.25) {
    const g = this.game, n = Math.max(4, Math.round(a.distanceTo(b) * 2.5));
    for (let i = 0; i <= n; i++) { const k = i / n; g.particles.glow.emit(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 0.3, a.z + (b.z - a.z) * k, 0, 0, 0, life, 1.6, 1.7, 1.8, 0.09, 0, 0, 1, 1); }
  }
  spearThrow() {
    const g = this.game, p = this.p, rk = this.rank('spear');
    this.showTool('spear', 1.2);
    p.facing = this.aimAngle();
    this.pose('throw', 0.35);
    const f = this.fwd(), from = this.handPos(), L = 16;
    const hits = [];
    this.after(0.1, () => {
      g.fx.slashLine(from, f, L, 0xffffff, 0.35, 0.25); g.fx.slashLine(from.clone().setY(from.y - 0.05), f, L, GREEN, 0.18, 0.4);
      this.chainFx(from, from.clone().addScaledVector(f, L), 0.4);
      this.line(p.pos, f, L, 0.8, (e) => {
        hits.push(e);
        this.hit(e, 26 + rk * 7, { unblockable: true, stagger: 0.6, knock: f.clone().multiplyScalar(2), color: '#e8fff0' });
        e.cancelAttack?.(); if (!e.isBoss) e.sealT = Math.max(e.sealT ?? 0, 0.6);
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.55), f, { color: SILVER, big: true });
      });
      for (let s = 2; s < L; s += 2) g.combat.hitBlocks(from.clone().addScaledVector(f, s).setY(p.pos.y), f, 0.6, Math.PI, 24, p);
      g.audio?.whoosh(1.4); g.audio?.energy('slash');
      if (hits.length) { g.hitStop(0.05); g.shake(0.25); }
    });
    // the chain yanks everything back toward Toji
    this.after(0.45, () => {
      for (const e of hits) {
        if (e.dead || e.isBoss) continue;
        const d = tmp.subVectors(p.pos, e.pos).setY(0); const len = d.length();
        e.knock.add(d.normalize().multiplyScalar(Math.min(16, len * 1.6)));
        this.chainFx(this.handPos(), e.pos.clone().setY(e.pos.y + 1), 0.2);
      }
      if (hits.length) g.audio?.impact(1);
    });
  }
  nullify() {
    const g = this.game, p = this.p, t = this.target(8);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, GREEN);
    this.showTool('spear', 1);
    this.pose('punch', 0.4);
    this.after(0.12, () => {
      if (t.dead) return;
      const at = t.pos.clone().setY(t.pos.y + t.height * 0.55), dir = tmp.subVectors(t.pos, p.pos).setY(0).normalize();
      this.hit(t, 44 + this.rank('spear') * 10, { melee: true, unblockable: true, stagger: 1, knock: new THREE.Vector3(), color: '#e8fff0' });
      // its technique is cancelled outright
      t.cancelAttack?.(); t.cd = Math.max(t.cd ?? 0, t.isBoss ? 3 : 4); t.guarding = false;
      this.stun(t, 2.2);
      g.fx.rings.spawn(tmp2.set(t.pos.x, t.pos.y + t.height * 0.55, t.pos.z), { color: SILVER, r0: t.radius + 2.2, r1: 0.2, dur: 0.35, thick: 0.14 });
      g.fx.slashLine(p.pos.clone().setY(p.pos.y + 1.1), dir, 4, 0xffffff, 0.4, 0.25);
      g.fx.hitSpark(at, dir, { color: SILVER, big: true, crit: true });
      g.fx.chroma(0.5); g.hitStop(0.08); g.shake(0.35);
      g.audio?.energy('infinity'); g.audio?.impact(1.5, 'crit');
    });
  }
  runThrough() {
    const g = this.game, p = this.p, rk = this.rank('spear');
    const f = this.fwd(), L = 13, start = p.pos.clone();
    this.showTool('spear', 1.6);
    // telegraph: the line of the charge glows on the ground first
    const ground = start.clone().setY(start.y + 0.12);
    g.fx.slashLine(ground, f, L, GREEN, 0.9, 0.5);
    g.fx.slashLine(ground, f, L, 0xffffff, 0.25, 0.5);
    p.action = { type: 'cast', both: true, dur: 0.45, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes, 1.1);
    g.audio?.charge?.(0.4, 0.45);
    this.during(0.4, () => { const h = this.handPos(); g.particles.burst(h, { count: 2, color: GREEN, speed: 2, life: 0.25, size: 0.12, shape: 1 }); }, () => {
      if (p.action?.lock) p.action = null;
      this.pose('punch', 0.3);
      g.audio?.whoosh(1.8);
      this.dash(f, L, 0.22, { color: GREEN, hitR: 1.8, onHit: (e) => {
        const dmg = (90 + rk * 20) * (e.isBoss ? 1.5 : 1);
        this.hit(e, dmg, { melee: true, unblockable: true, stagger: 1.2, knock: f.clone().multiplyScalar(e.isBoss ? 2 : 10), color: '#e8fff0' });
        e.cancelAttack?.();
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
        g.fx.hitSpark(at, f, { color: SILVER, big: true, crit: true });
        g.particles.burst(at, { count: 24, color: BLOOD, additive: false, speed: 6, dir: f.clone().multiplyScalar(5), life: 0.6, size: 0.14, gravity: 14, shape: 1 });
        g.hitStop(0.06); g.audio?.impact(1.8, 'crit');
      }, onEnd: () => {
        g.fx.slashLine(start.clone().setY(start.y + 1.1), f, L + 1, 0xffffff, 0.7, 0.3);
        g.fx.slashLine(start.clone().setY(start.y + 1.0), f, L + 2, GREEN, 0.35, 0.5);
        g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 0.9, 0.4); g.fx.flash(0xe8fff0, 0.3, 0.1);
        g.shake(0.6);
      } });
    });
  }
  chainSnare() {
    const g = this.game, p = this.p, t = this.target(14, 0.3);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.showTool('spear', 0.8);
    this.pose('throw', 0.35);
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    this.chainFx(this.handPos(), t.pos.clone().setY(t.pos.y + t.height * 0.5), 0.35);
    g.audio?.whoosh(1.2);
    this.after(0.15, () => {
      if (t.dead) return;
      this.hit(t, 16 + this.rank('chain') * 6, { stagger: 0.8, knock: new THREE.Vector3(), color: '#e8fff0' });
      if (t.isBoss || t.def?.rooted) {
        // too heavy to move: the chain hauls Toji in instead
        this.closeIn(t, GREEN); t.cancelAttack?.();
      } else {
        const to = this.safeSpot(p.pos.x + Math.sin(p.facing) * 1.6, p.pos.z + Math.cos(p.facing) * 1.6, p.pos.y);
        if (to) { g.fx.blinkPuff(t.pos, SILVER); t.pos.copy(to); t.vel?.set(0, 0, 0); t.knock?.set(0, 0, 0); }
        this.stun(t, 1.2);
      }
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + t.height * 0.5), null, { color: SILVER, big: true });
      g.shake(0.25); g.audio?.impact(1.2);
    });
  }
  chainSwing() {
    const g = this.game, p = this.p, f = this.fwd();
    this.showTool('spear', 0.6);
    const from = this.handPos();
    this.chainFx(from, from.clone().addScaledVector(f, 11), 0.3);
    g.audio?.whoosh(1.3);
    this.dash(f, 10, 0.26, { color: SILVER, hitR: 1.5, dmg: 18 + this.rank('chain') * 5, hitOpts: { melee: true, stagger: 0.6 } });
  }
  endlessChain() {
    const g = this.game, p = this.p, rk = this.rank('chain'), R = 5 + rk;
    this.showTool('spear', 3.2);
    g.toast?.('⛓️ Endless Chain');
    let a = p.facing, tick = 0;
    p.action = { type: 'attack', step: { style: 'spin', strike: 0.45, windup: 0.2 }, style: 'spin', dur: 0.45, elapsed: 0, t: 0, windup: 0.2, strike: 0.45, struck: true, moveScale: 0.7 };
    g.audio?.whoosh(1.4);
    this.during(3, (t, dt) => {
      a += dt * Math.PI * 4;
      const hand = tmp.set(p.pos.x, p.pos.y + 1.2, p.pos.z);
      for (let i = 1; i <= 8; i++) { const k = i / 8 * R; g.particles.glow.emit(hand.x + Math.sin(a) * k, hand.y - i * 0.03, hand.z + Math.cos(a) * k, 0, 0, 0, 0.1, 1.6, 1.7, 1.8, 0.09, 0, 0, 1, 1); }
      g.particles.burst(tmp2.set(hand.x + Math.sin(a) * R, hand.y - 0.3, hand.z + Math.cos(a) * R), { count: 1, color: GREEN, speed: 1, life: 0.2, size: 0.2, shape: 1 });
      tick -= dt;
      if (tick <= 0) {
        tick = 0.25;
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: SILVER, r0: R * 0.92, r1: R, dur: 0.25, thick: 0.06 });
        for (const e of this.foes(p.pos, R)) this.hit(e, 8 + rk * 3, { melee: true, stagger: 0.25, knock: tmp2.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(2) });
        g.audio?.swing(Math.floor(Math.random() * 4));
      }
    });
  }
  pistol() {
    const g = this.game, p = this.p;
    this.cast(0.18);
    const f = this.p.aimDir.clone(), from = this.handPos();
    const pr = g.projectiles.fire({ pos: from, vel: f.clone().multiplyScalar(48), team: 'player', shape: 'nail', color: 0xfff0c0, emissive: 2, scale: 1.3, life: 0.5, radius: 0.3,
      onHit: (e, q) => { this.hit(e, 12, { stagger: 0.25, knock: q.vel.clone().setLength(1.5), crit: Math.random() < 0.35 || undefined }); g.fx.hitSpark(q.pos, null, { color: 0xfff0c0 }); } });
    if (!pr) return false;
    g.particles.burst(from, { count: 6, color: 0xffd080, speed: 3, life: 0.12, size: 0.12, shape: 1, dir: f, spread: 0.3 });
    g.lights.flash(from, 0xffd080, 4, 4, 0.06);
    g.audio?.noise?.({ dur: 0.08, gain: 0.5, type: 'highpass', freq: 900, q: 0.7 });
  }
  knives() {
    const g = this.game, p = this.p;
    this.cast(0.25);
    const base = this.aimAngle();
    for (let i = 0; i < 5; i++) {
      const a = base + (i - 2) * 0.13, dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      g.projectiles.fire({ pos: this.handPos(), vel: dir.multiplyScalar(30), team: 'player', shape: 'nail', color: SILVER, emissive: 1.2, scale: 1.6, life: 0.55, radius: 0.35, pierce: true,
        onHit: (e, q) => { this.hit(e, 9, { stagger: 0.2, knock: q.vel.clone().setLength(1.5) }); g.fx.hitSpark(q.pos, null, { color: SILVER }); } });
    }
    g.audio?.whoosh(0.9);
  }
  cloudSmash() {
    const g = this.game, p = this.p, rk = this.rank('cloud');
    const to = this.aimGround(8), R = 3.8;
    this.showTool('cloud', 1.2);
    // the landing spot is marked before the staff comes down
    g.fx.rings.spawn(tmp.set(to.x, to.y + 0.08, to.z), { color: BLOOD, r0: R, r1: R * 0.95, dur: 0.5, thick: 0.1 });
    g.fx.rings.spawn(tmp.set(to.x, to.y + 0.08, to.z), { color: 0xd8a830, r0: 0.3, r1: R, dur: 0.45, thick: 0.08 });
    p.vel.y = 9; p.grounded = false; p.iframes = Math.max(p.iframes, 0.6);
    this.pose('slam', 0.55);
    const from = p.pos.clone();
    this.during(0.42, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k;
      if (!g.world.solidAt(x, p.pos.y + 0.5, z) && !g.world.solidAt(x, p.pos.y + 1.5, z)) { p.pos.x = x; p.pos.z = z; }
      p.facing = Math.atan2(to.x - from.x, to.z - from.z) || p.facing;
    }, () => {
      p.vel.y = -20;
      const c = p.pos.clone().setY(this.groundAt(p.pos.x, p.pos.z, p.pos.y) + 0.3);
      const n = g.combat.aoe(c, R, 55 + rk * 14, p, { melee: true, knock: 9, stagger: 1, falloff: true, color: '#ff6a5a' });
      for (const e of this.foes(c, R)) this.stun(e, 1.2);
      g.fx.slashArc(p.pos, p.facing, BLOOD, R, 1, 0.25);
      g.fx.shockwave(c, BLOOD, R + 1.5); g.fx.landDust(c, 30); g.debris.burst(c, B.concrete, 10, 1.1);
      g.fx.screenWave(c, 0.7, 0.4); g.shake(0.7); g.hitStop(n ? 0.1 : 0.04); g.audio?.impact(2);
    });
  }
  arsenalSpill() {
    const g = this.game, p = this.p;
    this.cast(1.1, true, { lock: true, hold: true, cancelable: false, moveScale: 0.1 });
    g.toast?.('🐛 The Inventory Curse spills its hoard');
    const shapes = ['nail', 'arrow', 'nail', 'slash'];
    for (let w = 0; w < 3; w++) this.after(w * 0.22, () => {
      const base = this.aimAngle();
      const mouth = tmp2.set(p.pos.x + Math.sin(p.facing + 0.8) * 0.6, p.pos.y + 1.6, p.pos.z + Math.cos(p.facing + 0.8) * 0.6).clone();
      g.particles.burst(mouth, { count: 10, color: 0x6a5a78, additive: false, speed: 3, life: 0.4, size: 0.3, sizeEnd: 0.05 });
      for (let i = 0; i < 8; i++) {
        const a = base + (i - 3.5) * 0.1 + (Math.random() - 0.5) * 0.05, dir = new THREE.Vector3(Math.sin(a), (Math.random() - 0.5) * 0.08, Math.cos(a));
        g.projectiles.fire({ pos: mouth.clone(), vel: dir.multiplyScalar(26 + Math.random() * 6), team: 'player', shape: shapes[(i + w) % 4], color: (i + w) % 3 ? SILVER : 0xd8a830, emissive: 1.2, scale: 1.2, life: 0.6, radius: 0.4,
          onHit: (e, q) => { this.hit(e, 11, { stagger: 0.3, knock: q.vel.clone().setLength(1.5) }); g.fx.hitSpark(q.pos, null, { color: SILVER }); } });
      }
      g.audio?.whoosh(1); g.audio?.energy('spit');
    });
    // last out: the spear itself, on its chain
    this.after(0.75, () => { if (p.action?.lock) p.action = null; this.spearThrow(); });
  }
  speedDash() {
    const g = this.game, p = this.p;
    const d = Math.hypot(p.vel.x, p.vel.z) > 2 ? new THREE.Vector3(p.vel.x, 0, p.vel.z) : this.fwd();
    const from = p.pos.clone();
    g.audio?.whoosh(1.5);
    this.dash(d, 8.5, 0.18, { color: GREEN, iframes: 0.35, onEnd: () => {
      // afterimages along the path
      for (let i = 0; i < 5; i++) { const k = i / 5; g.particles.burst(tmp.lerpVectors(from, p.pos, k).setY(from.y + 1), { count: 4, color: 0x141418, additive: false, speed: 0.3, life: 0.35, size: 0.7, sizeEnd: 0.2 }); }
    } });
  }
  flyingKick() {
    const g = this.game, p = this.p, f = this.fwd();
    this.pose('uppercut', 0.3);
    g.audio?.whoosh(1.4);
    let done = false;
    this.dash(f, 6, 0.2, { color: SILVER, hitR: 1.6, onHit: (e) => {
      if (done) return; done = true;
      this.hit(e, 34, { melee: true, stagger: 1, knock: new THREE.Vector3() });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: 0xffffff, big: true });
      g.hitStop(0.08); g.shake(0.45); g.audio?.impact(1.7);
      if (e.isBoss) return;
      // the curse flies, ploughing through whatever stands behind it
      const hitSet = new Set([e]);
      this.during(0.45, () => {
        if (e.dead) return false;
        e.knock.copy(f).multiplyScalar(22);
        for (const o of this.foes(e.pos, 1.6)) if (!hitSet.has(o)) { hitSet.add(o); this.hit(o, 22, { stagger: 0.7, knock: f.clone().multiplyScalar(8) }); this.hit(e, 10, { stagger: 0.3 }); g.fx.hitSpark(o.pos.clone().setY(o.pos.y + 1), f, { color: 0xffffff }); g.audio?.impact(1.1); }
        g.particles.burst(tmp.set(e.pos.x, e.pos.y + 0.3, e.pos.z), { count: 1, color: 0x8a7a6a, additive: false, speed: 1, life: 0.4, size: 0.4, sizeEnd: 1 });
        g.combat.hitBlocks(e.pos.clone().setY(e.pos.y + 0.5), f, 1.2, Math.PI, 30, p);
      });
    } });
  }
  senses() {
    const g = this.game, p = this.p;
    let left = 3;
    g.toast?.('👂 Heightened Senses');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GREEN, r0: 4, r1: 0.4, dur: 0.4, thick: 0.15 });
    g.audio?.charge?.(0.3, 0.4);
    this.statBuff('senses', 6, { crit: 0.1 }, {
      incoming: (a, src) => {
        if (left <= 0) return a;
        left--;
        this.dodgeFx();
        if (src && src.pos && !src.dead && !src.isPlayer && src.takeDamage) {
          // slip aside and counter
          p.facing = Math.atan2(src.pos.x - p.pos.x, src.pos.z - p.pos.z);
          this.pose('swingR', 0.22);
          this.hit(src, 24, { melee: true, stagger: 0.6, knock: tmp.subVectors(src.pos, p.pos).setY(0).normalize().multiplyScalar(5) });
          g.fx.slashArc(p.pos, p.facing, SILVER, 2.6, 0.4, 0.15);
        }
        if (left <= 0) this.buffs.get('senses') && (this.buffs.get('senses').left = Math.min(this.buffs.get('senses').left, 0.01));
        return 0;
      },
      onTick: () => { if (Math.random() < 0.3) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5), p.pos.y + 1.6 + Math.random() * 0.3, p.pos.z + (Math.random() - 0.5), 0, 0.4, 0, 0.4, 1.4, 2.2, 0.8, 0.1, 0, 1, 0.2, 1); },
    });
  }
  ironBody() {
    const g = this.game, p = this.p;
    this.cast(0.3, true);
    g.toast?.('🛡️ Iron Physique'); g.audio?.charge?.(0.3, 0.4);
    let lastT = -9;
    this.buff('iron_body', 4, {
      incoming: (a, src) => {
        if (src && src.pos && !src.dead && !src.isPlayer && g.time - lastT > 0.25 && src.pos.distanceTo(p.pos) < 4 && src.knock) {
          lastT = g.time;
          if (!src.isBoss) src.knock.add(tmp.subVectors(src.pos, p.pos).setY(0).normalize().multiplyScalar(14));
          if (src.takeDamage) this.hit(src, 10, { melee: true, stagger: 0.6 });
          g.fx.hitSpark(src.pos.clone().setY(src.pos.y + 1), null, { color: 0xffffff, big: true });
        }
        return a * 0.45;
      },
      onTick: () => { if (Math.random() < 0.4) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.9, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.9, 0, 0.6, 0, 0.4, 2, 2, 1.6, 0.1, 0, 1, 0.1, 1); },
    });
  }
  afterimage() {
    const g = this.game, p = this.p;
    const t = this.target(14);
    const decoy = new Afterimage(g, p, p.pos);
    g.allies.push(decoy);
    for (const e of g.enemies) if (!e.dead && e.target === p && e.pos.distanceTo(p.pos) < 20) e.target = decoy;
    this.vanish(1.2);
    if (t) this.after(0.25, () => { if (!t.dead) { const a = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z); const spot = this.safeSpot(t.pos.x + Math.sin(a) * (t.radius + 1), t.pos.z + Math.cos(a) * (t.radius + 1), t.pos.y); if (spot) this.blinkTo(spot); p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z); } });
    else this.speedDash();
    g.audio?.whoosh(1.2);
  }
  // curses lose track of Toji for `dur` seconds
  vanish(dur) {
    const g = this.game, p = this.p;
    p.untargetable = true;
    for (const e of g.enemies) if (e.target === p) e.target = null;
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 16, color: 0x141418, additive: false, speed: 2, life: 0.5, size: 0.6, sizeEnd: 0.1 });
    this.buff('vanish', dur, { onTick: () => { for (const e of g.enemies) if (e.target === p) e.target = null; }, onEnd: () => { p.untargetable = false; } });
  }
  ambush() {
    const g = this.game, p = this.p;
    const t = this.target(12) ?? g.nearestEnemy(p.pos, 12);
    if (!t) { g.toast?.('No prey in reach'); g.audio?.ui('back'); return false; }
    this.vanish(0.9);
    this.cast(0.2, true);
    this.after(0.35, () => {
      if (t.dead) return;
      // reappear behind it
      const back = tmp.subVectors(t.pos, p.pos).setY(0).normalize();
      const spot = this.safeSpot(t.pos.x + back.x * (t.radius + 1), t.pos.z + back.z * (t.radius + 1), t.pos.y);
      if (spot) this.blinkTo(spot);
      p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
      this.showTool('katana', 0.6);
      this.pose('swingL', 0.3);
      const at = t.pos.clone().setY(t.pos.y + t.height * 0.55);
      this.hit(t, 30, { melee: true, crit: true, critMult: 2.5, unblockable: true, stagger: 0.9, knock: new THREE.Vector3() });
      g.fx.slashX(at, 2.2 + t.height * 0.3, GREEN); g.fx.hitSpark(at, null, { color: GREEN, big: true, crit: true });
      g.hitStop(0.08); g.shake(0.35); g.audio?.energy('slash'); g.audio?.impact(1.6, 'crit');
    });
  }
  flyHeads() {
    const g = this.game, p = this.p;
    const c = this.aimGround(11), R = 4;
    this.cast(0.35, true);
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1.5), { count: 16, color: 0x3a3a2a, additive: false, speed: 3, life: 0.5, size: 0.25, sizeEnd: 0.1 });
    g.audio?.noise?.({ dur: 0.6, gain: 0.2, type: 'bandpass', freq: 500, q: 2 });
    const flies = [];
    for (let i = 0; i < 14; i++) flies.push({ a: Math.random() * Math.PI * 2, r: Math.random() * R, h: 0.5 + Math.random() * 1.8, s: 2 + Math.random() * 3 });
    this.during(5, (t, dt) => {
      for (const f of flies) {
        f.a += dt * f.s;
        if (Math.random() < 0.7) g.particles.burst(tmp.set(c.x + Math.cos(f.a) * f.r, c.y + f.h + Math.sin(t * 9 + f.a) * 0.2, c.z + Math.sin(f.a) * f.r), { count: 1, color: 0x2a2a1a, additive: false, speed: 0.1, life: 0.12, size: 0.25, sizeEnd: 0.2 });
      }
    });
    this.zone(c, R, 5, 0.5, (foes) => {
      for (const e of foes) { e.swarmedT = 0.7; this.slow(e, 0.7); this.hit(e, 4, { stagger: 0.15, crit: false, ceGain: 1 }); }
    }, { color: 0x6a6a40, particles: 0.3 });
  }
  markPrey() {
    const g = this.game, p = this.p;
    let t = this.target(16);
    if (!t) { g.toast?.('No prey in sight'); g.audio?.ui('back'); return false; }
    this.prey = t; this.preyT = 8;
    this.cast(0.25);
    g.fx.rings.spawn(tmp.set(t.pos.x, t.pos.y + 0.08, t.pos.z), { color: BLOOD, r0: t.radius + 2.5, r1: t.radius + 0.4, dur: 0.4, thick: 0.15 });
    g.fx.damageNumber(t.pos.clone().setY(t.pos.y + t.height + 0.4), 0, { text: 'PREY', color: '#ff5a5a' });
    g.audio?.tone?.({ freq: 180, to: 120, dur: 0.4, gain: 0.12, type: 'sawtooth', filter: 800 });
  }
  startRampage(dur) {
    const g = this.game, p = this.p;
    this.rampageT = Math.max(this.rampageT, dur);
    this.statBuff('rampage', dur, { attackSpeed: 0.25 });
    g.toast?.('🔥 Rampage'); g.fx.flash(0x102008, 0.3, 0.15);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GREEN, r0: 0.4, r1: 4, dur: 0.4, thick: 0.15 });
    g.audio?.charge?.(0.4, 0.5);
  }
  execute() {
    const g = this.game, p = this.p;
    let t = null, best = 2;
    for (const e of g.enemies) { if (e.dead || e.untargetable || e.isDummy) continue; if (e.pos.distanceTo(p.pos) > 12) continue; const f = e.hp / e.maxHp; if (f < best) { best = f; t = e; } }
    t ??= this.target(12);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, GREEN);
    this.showTool('katana', 0.7);
    this.pose('swingR', 0.35);
    this.after(0.12, () => {
      if (t.dead) return;
      const at = t.pos.clone().setY(t.pos.y + t.height * 0.55);
      const kill = !t.isBoss && t.hp / t.maxHp < 0.35;
      const dmg = kill ? (t.hp + 1) / Math.max(0.2, 1 - (t.armor ?? 0)) : 60 + (t.maxHp - t.hp) * (t.isBoss ? 0.08 : 0.2);
      this.hit(t, dmg, { melee: true, unblockable: true, crit: kill ? false : undefined, stagger: 1, knock: new THREE.Vector3(), color: '#b8f070' });
      g.fx.slashX(at, 2.8 + t.height * 0.4, kill ? 0xffffff : GREEN);
      g.fx.hitSpark(at, null, { color: GREEN, big: true, crit: true });
      if (kill) g.particles.burst(at, { count: 30, color: BLOOD, additive: false, speed: 5, life: 0.6, size: 0.16, gravity: 14, shape: 1 });
      g.hitStop(0.1); g.shake(0.4); g.audio?.energy('slash'); g.audio?.impact(1.8, 'crit');
    });
  }
  // rampage: blink to a curse and cut it down

  assassinate(e, dmg) {
    const g = this.game, p = this.p;
    const a = Math.random() * Math.PI * 2;
    const spot = this.safeSpot(e.pos.x + Math.sin(a) * (e.radius + 1), e.pos.z + Math.cos(a) * (e.radius + 1), e.pos.y);
    if (!spot) return;
    this.blinkTo(spot);
    p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    const style = Math.random() < 0.5 ? 'swingR' : 'swingL';
    p.action = { type: 'attack', step: { style, strike: 0.4, windup: 0.15 }, style, dur: 0.22, elapsed: 0, t: 0, windup: 0.15, strike: 0.4, struck: true, moveScale: 0.5 };
    this.showTool(Math.random() < 0.5 ? 'katana' : 'spear', 0.4);
    const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
    this.hit(e, dmg, { melee: true, unblockable: true, stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(4) });
    g.fx.slashLine(at.clone().addScaledVector(tmp2.set(Math.cos(a), 0.4, Math.sin(a)), -1.5), tmp2.set(Math.cos(a), -0.4, Math.sin(a)), 3, 0xffffff, 0.3, 0.18);
    g.fx.hitSpark(at, null, { color: GREEN, big: true });
    g.hitStop(0.03); g.shake(0.15);
    g.audio?.energy('slash');
  }
}
// A decoy left by Afterimage: a dark, fading silhouette the curses attack.
// Same contract as an ally (pos, radius, height, takeDamage, update, dispose).
class Afterimage {
  constructor(game, owner, pos) {
    this.game = game; this.owner = owner; this.kind = 'afterimage';
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = 0.4; this.height = 1.9; this.hp = this.maxHp = 60; this.life = 2.5; this.dead = false; this.isAlly = true;
    const mat = new THREE.MeshBasicNodeMaterial({ color: 0x1a2a14, transparent: true, opacity: 0.6, depthWrite: false });
    this.mat = mat;
    const grp = new THREE.Group();
    for (const [w, h, d, y] of [[0.5, 0.75, 0.3, 1.15], [0.4, 0.4, 0.4, 1.75], [0.45, 0.8, 0.28, 0.4]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = y; grp.add(m); }
    grp.position.copy(this.pos); grp.rotation.y = owner.facing;
    this.object = grp; game.scene.add(grp);
  }
  takeDamage(a) { if (this.dead) return 0; this.hp -= a; if (this.hp <= 0) this.despawn(); return a; }
  despawn(quiet = false) {
    if (this.dead) return; this.dead = true;
    this.game.scene.remove(this.object); for (const m of this.object.children) m.geometry.dispose(); this.mat.dispose();
    if (!quiet) this.game.particles.burst(this.pos.clone().setY(this.pos.y + 1), { count: 14, color: GREEN, speed: 2, life: 0.4, size: 0.3, sizeEnd: 0.05 });
  }
  dispose() { this.despawn(true); }
  update(dt) {
    if (this.dead) return false;
    this.life -= dt;
    this.mat.opacity = Math.min(0.6, this.life * 0.5);
    if (this.life <= 0) { this.despawn(); return false; }
    return true;
  }
}
registerKit('toji', TojiKit, TOJI_SKILLS);
