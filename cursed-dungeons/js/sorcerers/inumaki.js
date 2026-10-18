// Inumaki kit — Cursed Speech.
//   Every word is an order that curses must obey, but each one strains Toge's
//   throat — and the stronger the target, the harder the backlash. Past the
//   limit he coughs blood (loses HP) to keep speaking; cough syrup helps.
//   LMB  quick kick-and-jab combo.
//   RMB  "Blast away": a cone of commanding voice that hurls curses back.
//   1    "Don't move": everything nearby freezes in place.
//   2    "Get crushed": the aim point folds in on itself.
//   3    "Twist": the curses in front are wrung like rags.
//   F    Ultimate (Inumaki has no canon domain): "DIE" — the strongest order
//        he can give. Every curse in range dies outright and bosses are torn
//        apart, but the word rips his throat: a huge HP cost, and he cannot
//        speak (no words) for a while afterwards.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';

const VOICE = 0xb89aff, BLOOD = 0xc0102a, UNIFORM = 0x1b2030;
const tmp = new THREE.Vector3();

registerSorcerer('inumaki', {
  name: 'Inumaki', technique: 'Cursed Speech', rarity: 'epic', title: 'Cursed Speech', color: '#b89aff',
  desc: 'Words are commands — "Blast away", "Don\'t move", "Get crushed", "Twist" — each straining his throat (more against stronger curses) until he coughs blood. His ultimate order, "Die", kills but tears his throat.',
  ultimate: 'Die',
});

registerLook('inumaki', {
  paint: { skinTone: 0xf2d6c2, hair: 0xe8e2f0, hairVolume: true, top: UNIFORM, collar: UNIFORM, pants: UNIFORM, eye: 0x7a5ac8, brow: 0xd8d0e8, fringe: 3, hairSide: 3, hairBack: 5 },
  hair: (m) => [
    { x: -2.5, y: 8, z: 1.5, w: 3, h: 3, d: 3, rx: 0.4, rz: 0.5, material: m },
    { x: 0, y: 8.4, z: 1.5, w: 3, h: 3, d: 3, rx: 0.5, material: m },
    { x: 2.5, y: 8, z: 1.5, w: 3, h: 3, d: 3, rx: 0.4, rz: -0.5, material: m },
    { x: -1.5, y: 8, z: -1.5, w: 3, h: 3, d: 3, rx: -0.5, rz: 0.3, material: m },
    { x: 1.5, y: 8, z: -1.5, w: 3, h: 3, d: 3, rx: -0.5, rz: -0.3, material: m },
  ],
  hairColor: 0xe8e2f0, accent: VOICE, emit: 0.25, cape: null,
  paintExtra(S) {
    // high zipped collar hides the mouth (and the snake-and-fang seal)
    S.rect(8, 13, 8, 3, UNIFORM, 0.06); S.rect(0, 13, 8, 3, UNIFORM, 0.06); S.rect(16, 13, 8, 3, UNIFORM, 0.06); S.rect(24, 13, 8, 3, UNIFORM, 0.06);
    S.px(11, 13, 0xc8ccd8); S.px(11, 14, 0xc8ccd8); S.px(11, 15, 0xc8ccd8);
    S.rect(40, 13, 8, 3, UNIFORM, 0.06);   // hat layer collar rim
  },
  props(rig, K) {
    const cloth = K.mat(UNIFORM, { roughness: 0.85 });
    K.box(rig.torso, 9.2, 3, 5.2, cloth, 0, 12.4, 0);           // collar column
    K.box(rig.torso, 0.6, 2.6, 0.4, K.mat(0xc8ccd8, { metalness: 0.8, roughness: 0.3 }), 0, 12.4, 2.7);   // zip
  },
});

export const INUMAKI_SKILLS = [
  { id: 'voice', name: 'Commanding Voice', icon: '📢', desc: 'Every word hits 12% harder per rank.', max: 3, branch: 'Commands', tier: 3 },
  { id: 'throat', name: 'Trained Throat', icon: '🫁', desc: 'Words strain your throat less.', max: 3, branch: 'Throat', tier: 0 },
  { id: 'syrup', name: 'Cough Syrup', icon: '🧴', desc: 'Throat strain recovers faster.', max: 2, req: 'throat', branch: 'Throat', tier: 3 },
  { id: 'freeze', name: 'Don\'t Move', icon: '✋', desc: 'Freeze lasts longer and reaches further.', max: 3, req: 'ab:dont_move', branch: 'Binding', tier: 2 },
  { id: 'crush', name: 'Get Crushed', icon: '⬇️', desc: 'Bigger, harder crush; "Twist" wrings harder.', max: 2, req: 'ab:get_crushed', branch: 'Destruction', tier: 2 },
  { id: 'die', name: 'Die', icon: '☠️', desc: '"Die" reaches further and tears bosses harder, but costs more HP.', max: 2, req: 'voice', branch: 'Commands', tier: 4 },
];

class InumakiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.26, windup: 0.26, strike: 0.48, dmg: 11, range: 2.5, arc: 1.1, lunge: 7, knock: 3, stop: 0.04, shake: 0.13, trail: VOICE, sparkColor: 0xe0d0ff, chainAt: 0.52 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 12, range: 2.6, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: VOICE, sparkColor: 0xe0d0ff, chainAt: 0.55 },
      { style: 'spin', dur: 0.44, windup: 0.26, strike: 0.55, dmg: 19, range: 3, arc: Math.PI, lunge: 4, knock: 8, stop: 0.07, shake: 0.28, ring: true, ringColor: VOICE, trail: VOICE },
    ];
    this.baseMult = 1 + r('voice') * 0.12;
    this.strainMul = 1; this.bindMul = 1;
    this.branches = ['Commands', 'Binding', 'Destruction', 'Throat'];
    this.library = {
      // ---- Commands: words that move curses
      blast_away: ability({ name: 'Blast Away', icon: '📢', kind: 'basic', desc: '「Blast away」: a cone of commanding voice that hurls curses back.', cd: 1.3, ce: 0, branch: 'Commands', tier: 0, start: true, legacy: 'ranged', use: () => this.blastAway() }),
      burst: ability({ name: 'Burst', icon: '💢', kind: 'basic', desc: '「Burst」: the curse you are looking at bursts from the inside, splashing whatever stands beside it.', cd: 1.1, ce: 0, branch: 'Commands', tier: 1, req: 'blast_away', use: () => this.burstWord() }),
      come_here: ability({ name: 'Come Here', icon: '🫴', kind: 'technique', desc: '「Come here」: the curse walks straight to you, dazed.', cd: 7, ce: 8, branch: 'Commands', tier: 1, req: 'blast_away', use: () => this.comeHere() }),
      dont_come: ability({ name: 'Don\'t Come Closer', icon: '🙅', kind: 'movement', desc: '「Don\'t come closer」: curses beside you are flung away as you flip back out of reach.', cd: 7, ce: 6, branch: 'Commands', tier: 2, req: 'burst', use: () => this.dontCome() }),
      fall: ability({ name: 'Fall', icon: '⏬', kind: 'technique', desc: '「Fall」: everything in the marked spot is slammed into the floor and slowed; curses in the air are stunned.', cd: 8, ce: 12, branch: 'Commands', tier: 2, req: 'come_here', use: () => this.fallWord() }),
      // ---- Binding: words that stop curses
      dont_move: ability({ name: 'Don\'t Move', icon: '✋', kind: 'technique', desc: '「Don\'t move」: everything nearby freezes in place.', cd: 9, ce: 14, branch: 'Binding', tier: 1, legacy: 't1', use: () => this.dontMove() }),
      stop: ability({ name: 'Stop', icon: '🛑', kind: 'technique', desc: '「Stop」: one curse stops dead for 3.5s (bosses drop their attack and slow down). Costly against strong curses.', cd: 10, ce: 10, branch: 'Binding', tier: 2, req: 'dont_move', use: () => this.stopWord() }),
      sleep: ability({ name: 'Sleep', icon: '💤', kind: 'technique', desc: '「Sleep」: curses around you fall asleep for 5s — until something hits them.', cd: 14, ce: 16, branch: 'Binding', tier: 2, req: 'dont_move', use: () => this.sleepWord() }),
      get_down: ability({ name: 'Get Down', icon: '🙇', kind: 'technique', desc: '「Get down」: every curse around you is forced to the ground — hurt and slowed for 4s.', cd: 11, ce: 14, branch: 'Binding', tier: 3, req: 'stop', use: () => this.getDown() }),
      nobody_move: ability({ name: 'Everyone, Don\'t Move', icon: '🗣️', kind: 'technique', desc: '「Nobody move」: a shout that freezes every curse in a huge radius for 3s — at a heavy price for the throat.', cd: 24, ce: 30, branch: 'Binding', tier: 4, req: ['get_down', 'sleep'], use: () => this.nobodyMove() }),
      // ---- Destruction: words that break curses
      get_crushed: ability({ name: 'Get Crushed', icon: '⬇️', kind: 'technique', desc: '「Get crushed」: the aim point folds in on itself.', cd: 7, ce: 16, branch: 'Destruction', tier: 1, legacy: 't2', use: () => this.getCrushed() }),
      twist: ability({ name: 'Twist', icon: '🌀', kind: 'technique', desc: '「Twist」: the curses in front are wrung like rags.', cd: 12, ce: 26, branch: 'Destruction', tier: 2, legacy: 't3', req: 'get_crushed', use: () => this.twist() }),
      shatter: ability({ name: 'Shatter', icon: '💥', kind: 'technique', desc: '「Shatter」: everything on a line in front of you breaks apart — curses, crates and walls.', cd: 9, ce: 16, branch: 'Destruction', tier: 3, req: 'get_crushed', use: () => this.shatter() }),
      explode: ability({ name: 'Explode', icon: '🎇', kind: 'technique', desc: '「Explode」: the curses in front glow — a beat later each one blows up, hurting everything around it.', cd: 13, ce: 24, branch: 'Destruction', tier: 3, req: 'twist', use: () => this.explodeWord() }),
      flatten: ability({ name: 'Be Crushed Flat', icon: '🥞', kind: 'technique', desc: '「Be crushed flat」: a wide marked circle is pressed flat after a breath. Enormous damage, enormous strain.', cd: 18, ce: 34, branch: 'Destruction', tier: 4, req: ['explode', 'shatter'], use: () => this.flatten() }),
      // ---- Throat: everything that keeps Toge talking (no strain)
      syrup: ability({ name: 'Cough Syrup', icon: '🧴', kind: 'heal', desc: 'A swig of throat medicine: strain drops by 60, a torn throat heals 3s sooner and you heal 10% health. Works while you cannot speak.', cd: 20, ce: 6, branch: 'Throat', tier: 1, use: () => this.coughSyrup() }),
      spin_kick: ability({ name: 'Roundhouse Kick', icon: '🦵', kind: 'technique', desc: 'No words needed: a spinning kick that knocks back everything around you.', cd: 4, ce: 4, branch: 'Throat', tier: 1, use: () => this.spinKick() }),
      onigiri: ability({ name: 'Tuna Mayo Onigiri', icon: '🍙', kind: 'heal', desc: '"Tuna mayo!" — eat a rice ball: heal 25% health over 3s.', cd: 30, ce: 12, branch: 'Throat', tier: 2, req: 'syrup', use: () => this.onigiri() }),
      stay_back: ability({ name: 'Stay Back', icon: '🛡️', kind: 'defence', desc: 'For 4s every hit you take is halved and the attacker is ordered back (each order strains a little).', cd: 14, ce: 10, branch: 'Throat', tier: 2, req: 'spin_kick', use: () => this.stayBack() }),
      deep_breath: ability({ name: 'Deep Breath', icon: '🌬️', kind: 'buff', desc: 'Steady the throat: strain -20 and for 6s your words cause no strain.', cd: 26, ce: 14, branch: 'Throat', tier: 3, req: 'syrup', use: () => this.deepBreath() }),
      unzip: ability({ name: 'Snake and Fangs', icon: '🐍', kind: 'buff', desc: 'Pull the collar down and bare the seal: for 8s words hit 40% harder and reach further, but strain 50% more.', cd: 28, ce: 20, branch: 'Throat', tier: 4, req: 'deep_breath', use: () => this.unzip() }),
    };
    this.passives = {
      clan_heir: passive({ name: 'Inumaki Clan Heir', icon: '🐍', desc: 'Words strain your throat 25% less.', branch: 'Throat', tier: 2, req: 'syrup', apply: (pl, k) => { k.strainMul *= 0.75; } }),
      onigiri_words: passive({ name: 'Onigiri Vocabulary', icon: '🍙', desc: 'While strain is under 50, abilities recharge 15% faster.', branch: 'Commands', tier: 2, req: 'burst', apply: (pl, k) => { k.onigiriWords = true; } }),
      commanding: passive({ name: 'Commanding Presence', icon: '👑', desc: 'Binding words (freeze, stop, sleep, get down) last 30% longer.', branch: 'Binding', tier: 3, req: 'stop', apply: (pl, k) => { k.bindMul = 1.3; } }),
      bloody_voice: passive({ name: 'Voice Through Blood', icon: '🩸', desc: 'While your throat is strained past its limit, words hit 30% harder.', branch: 'Destruction', tier: 3, req: 'twist', apply: (pl, k) => { k.bloodyVoice = true; } }),
    };
    this.strain = 0; this.quietT = 0; this.muteT = 0;
    this.ultimate = { name: 'Die', icon: '☠️', use: () => this.die() };
  }
  // Backlash grows with the strength of whoever is ordered.
  weight(list) {
    let w = 1;
    for (const e of list) w += e.isBoss ? 0.9 : e.elite ? 0.25 : e.def?.grade === '1' ? 0.2 : 0.04;
    return Math.min(3, w);
  }
  // The throat is torn: no words for a while.
  mute() {
    if (this.muteT <= 0) return false;
    const g = this.game;
    if ((g.time - (this.muteMsgT ?? -9)) > 1.5) { this.muteMsgT = g.time; g.toast?.(`🩸 Toge's throat is torn — he can't speak (${Math.ceil(this.muteT)}s)`); g.audio?.ui('back'); }
    return true;
  }
  // ------------------------------------------------------------ the voice
  say(word, big) {
    const g = this.game, p = this.p;
    g.fx.damageNumber(p.pos.clone().setY(p.pos.y + 0.4), 0, { text: `「${word}」`, color: '#d8c8ff', crit: true });
    if (big) g.toast?.(`「${word.toUpperCase()}」`, 'big');
    g.audio?.tone({ freq: 180, to: 120, dur: 0.35, gain: 0.25, type: 'sawtooth', filter: 900, rev: 0.4 });
    g.audio?.noise({ dur: 0.3, gain: 0.25, type: 'bandpass', freq: 600, sweep: 200, q: 2, rev: 0.4 });
    const m = this.mouth();
    g.particles.burst(m, { count: 10, color: VOICE, speed: 5, life: 0.4, size: 0.12, shape: 2, dir: p.aimDir.clone(), spread: 0.5 });
  }
  mouth() { const p = this.p; return tmp.set(p.pos.x + Math.sin(p.facing) * 0.35, p.pos.y + 1.75, p.pos.z + Math.cos(p.facing) * 0.35).clone(); }
  // Returns the HP the word cost (0 when the throat can still take it).
  strainBy(n, quiet = false) {
    const g = this.game, p = this.p;
    if (this.buffs.has('deep_breath')) n = 0;
    if (this.buffs.has('unzip')) n *= 1.5;
    this.strain = Math.min(130, this.strain + n * (1 - this.rank('throat') * 0.18) * this.strainMul);
    this.quietT = 1.6;
    if (this.strain < 100) return 0;
    const cost = Math.min(p.hp - 1, p.maxHp * 0.04 * (this.strain / 100));
    if (cost > 0) {
      p.hp -= cost;
      g.fx.damageNumber(p.pos, cost, { color: '#ff4a5a', text: `-${Math.round(cost)} 🩸` });
      g.particles.burst(this.mouth(), { count: 14, color: BLOOD, speed: 3, life: 0.6, size: 0.1, gravity: 14, shape: 1, intensity: 1.4 });
      g.fx.flash(0x400008, 0.15, 0.15);
      if (!quiet && (g.time - (this.coughT ?? -9)) > 4) { this.coughT = g.time; g.toast?.('🩸 Throat strained — words cost HP'); }
    }
    return cost;
  }
  tick(dt) {
    const g = this.game, p = this.p;
    this.quietT -= dt;
    this.muteT = Math.max(0, this.muteT - dt);
    if (this.quietT <= 0) this.strain = Math.max(0, this.strain - dt * (9 + this.rank('syrup') * 7));
    if (this.strain > 70 && Math.random() < dt * 2) g.particles.burst(this.mouth(), { count: 3, color: BLOOD, speed: 1.5, life: 0.5, size: 0.07, gravity: 12, shape: 1, intensity: 1.2 });
  }
  targets(range, arc) {
    const g = this.game, p = this.p;
    if (g.domainSys?.sureHit(p)) return g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
    return g.combat.query(p.pos, p.aimDir, range, arc);
  }
  dispose() { super.dispose(); if (this.dieT) { clearTimeout(this.dieT); this.dieT = null; } this.game.fx.dimTarget = 0; }
  // ------------------------------------------------------------ library helpers
  get mult() { return this.baseMult * (this.bloodyVoice && this.strain >= 100 ? 1.3 : 1); }
  reach() { return this.buffs.has('unzip') ? 1.25 : 1; }
  onCast(s) { if (this.onigiriWords && this.strain < 50 && !s.maxCharges) s.cdLeft *= 0.85; }
  onHitEnemy(e) {
    // a sleeping curse wakes when it is hit
    if (e.togeSleepT && this.game.time < e.togeSleepT) { e.togeSleepT = 0; e.sealT = Math.min(e.sealT ?? 0, 0.2); this.game.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height), 0, { text: '!', color: '#ffffff' }); }
  }
  // a word aimed at the ground under the curse in front (or the aim point)
  wordSpot(range) {
    const g = this.game, p = this.p;
    if (g.domainSys?.sureHit(p)) { const t = g.nearestEnemy(p.pos, 30); if (t) return t.pos.clone(); }
    const e = g.nearestEnemy(p.aimPoint, 2.5);
    if (e && e.pos.distanceTo(p.pos) < range + 2) return e.pos.clone();
    return this.aimGround(range);
  }
  voiceRing(at, R, dark = true) {
    const g = this.game;
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.08, at.z), { color: VOICE, r0: 0.5, r1: R, dur: 0.45, thick: 0.1 });
    if (dark) g.fx.darkRings.spawn(tmp.set(at.x, at.y + 0.07, at.z), { color: 0x000000, r0: 0.5, r1: R * 0.9, dur: 0.55, thick: 0.2 });
  }
  // ------------------------------------------------------------ Commands
  burstWord() {
    if (this.mute()) return false;
    const g = this.game, p = this.p;
    const e = this.target(12);
    const at = e ? e.pos.clone() : this.aimGround(10);
    this.cast(0.28);
    this.say('Burst', false);
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.08, at.z), { color: VOICE, r0: 1.8, r1: 0.3, dur: 0.15, thick: 0.15 });
    this.after(0.15, () => {
      const c = at.clone().setY(at.y + (e ? e.height * 0.5 : 0.5));
      if (e && !e.dead) this.hit(e, 14 * this.mult, { stagger: 0.4, unblockable: true });
      this.blast(c, 1.8 * this.reach(), 12 * this.mult, { color: VOICE, knock: 4, stagger: 0.3, sound: false });
      g.audio?.impact(0.9);
    });
    this.strainBy(6 * this.weight(e ? [e] : []));
  }
  comeHere() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, e = this.target(14);
    if (!e) { g.toast?.('No one to command'); g.audio?.ui('back'); return false; }
    this.cast(0.35);
    this.say('Come here', true);
    const fw = tmp.subVectors(e.pos, p.pos).setY(0).normalize().clone();
    const dest = p.pos.clone().addScaledVector(fw, 1.4 + (e.radius ?? 0.5));
    const w = g.world, gy = w.groundBelow(dest.x, dest.z, p.pos.y + 3);
    for (let i = 0; i < 4; i++) this.after(i * 0.04, () => g.fx.slashArc(e.pos, Math.atan2(-fw.x, -fw.z), VOICE, 1.2 + i * 0.4, 0.5, 0.2));
    if (!e.isBoss && isFinite(gy) && Math.abs(gy - p.pos.y) < 3 && !w.solidAt(dest.x, gy + 0.5, dest.z) && !w.solidAt(dest.x, gy + 1.5, dest.z)) {
      g.fx.blinkPuff(e.pos, VOICE);
      e.pos.set(dest.x, gy, dest.z); e.vel?.set(0, 0, 0); e.knock?.set(0, 0, 0); e.visY = gy;
      g.fx.blinkPuff(e.pos, VOICE);
    } else e.knock?.addScaledVector(fw, -6);
    this.hit(e, 6 * this.mult, { stagger: 0.6 });
    this.stun(e, 1);
    this.strainBy(8 * this.weight([e]));
  }
  dontCome() {
    if (this.mute()) return false;
    const g = this.game, p = this.p;
    const near = this.foes(p.pos, 3.8 * this.reach());
    const back = this.fwd().multiplyScalar(-1);
    let moved = false;
    for (const d of [5, 3.5, 2]) if (this.blink(p.pos.clone().addScaledVector(back, d), { color: VOICE, quiet: true, iframes: 0.45 })) { moved = true; break; }
    if (!moved && !near.length) { g.audio?.ui('back'); return false; }
    this.say('Don\'t come closer', false);
    for (const e of near) { this.hit(e, 8 * this.mult, { stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(e.isBoss ? 4 : 14) }); }
    this.voiceRing(p.pos, 3.8 * this.reach(), false);
    g.fx.dodgeTrail?.(p);
    this.strainBy(6 * this.weight(near));
  }
  fallWord() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, R = 3.6 * this.reach();
    const at = this.wordSpot(10); at.y = this.groundAt(at.x, at.z, at.y);
    this.cast(0.35);
    this.say('Fall', true);
    const list = this.foes(at, R);
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R; g.particles.glow.emit(at.x + Math.cos(a) * rr, at.y + 3 + Math.random() * 2, at.z + Math.sin(a) * rr, 0, -20, 0, 0.2, 1.6, 1.2, 3, 0.16, 0, 0, 0.6, 1); }
    for (const e of list) {
      const air = e.pos.y > this.groundAt(e.pos.x, e.pos.z, e.pos.y) + 0.6;
      this.hit(e, (30 + this.rank('crush') * 8) * this.mult * (air ? 1.5 : 1), { stagger: 0.8, unblockable: true });
      if (e.vel) e.vel.y = Math.min(e.vel.y, -12);
      this.slow(e, 3 * this.bindMul);
      if (air) this.stun(e, 1);
    }
    this.voiceRing(at, R);
    g.fx.shockwave(at, VOICE, R + 0.5); g.shake(0.3); g.audio?.impact(1.5);
    this.strainBy(14 * this.weight(list));
  }
  // ------------------------------------------------------------ Binding
  stopWord() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, e = this.target(14);
    if (!e) { g.toast?.('No one to command'); g.audio?.ui('back'); return false; }
    this.cast(0.35);
    this.say('Stop', true);
    const dur = 3.5 * this.bindMul;
    if (e.isBoss) { e.cancelAttack?.(); this.slow(e, dur); this.hit(e, 6, { stagger: 1 }); }
    else { e.cancelAttack?.(); e.sealT = Math.max(e.sealT ?? 0, dur); }
    g.fx.summonCircle(e.pos, VOICE);
    for (let i = 0; i < 3; i++) g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.1 + i * 0.6, e.pos.z), { color: VOICE, r0: 1.6, r1: 1, dur: 0.6, thick: 0.08 });
    g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height + 0.3), 0, { text: '🛑 STOP', color: '#d8c8ff', crit: true });
    g.audio?.energy('infinity');
    this.strainBy(12 * this.weight([e]));
  }
  sleepWord() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, R = 7 * this.reach();
    const sure = g.domainSys?.sureHit(p);
    const list = g.enemies.filter((e) => !e.dead && !e.isDummy && (sure ? g.domainSys.inside(e.pos) : e.pos.distanceTo(p.pos) < R));
    this.cast(0.45, true);
    this.say('Sleep', true);
    this.voiceRing(p.pos, R);
    const dur = 5 * this.bindMul;
    for (const e of list) {
      e.cancelAttack?.();
      if (e.isBoss) { this.slow(e, 3); continue; }
      e.sealT = Math.max(e.sealT ?? 0, dur); e.togeSleepT = g.time + dur;
      g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height + 0.2), 0, { text: '💤 Zzz', color: '#b8a8ff' });
      g.particles.burst(e.pos.clone().setY(e.pos.y + e.height), { count: 6, color: VOICE, speed: 0.8, up: 1, life: 1.2, size: 0.12, sizeEnd: 0.02 });
    }
    g.audio?.tone({ freq: 300, to: 150, dur: 1, gain: 0.12, type: 'sine', rev: 0.6 });
    if (!list.length) g.toast?.('Nothing to put to sleep');
    this.strainBy(16 * this.weight(list));
  }
  getDown() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, R = 8 * this.reach();
    const list = this.foes(p.pos, R);
    this.cast(0.45, true);
    this.say('Get down', true);
    this.voiceRing(p.pos, R);
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.6), 0.7, 0.4);
    for (const e of list) {
      this.hit(e, 14 * this.mult, { stagger: 0.8, unblockable: true });
      if (e.vel) e.vel.y = Math.min(e.vel.y, -10);
      this.slow(e, 4 * this.bindMul);
      g.fx.darkRings.spawn(tmp.set(e.pos.x, e.pos.y + 0.07, e.pos.z), { color: 0x000000, r0: 1.4, r1: 0.4, dur: 0.4, thick: 0.25 });
    }
    g.shake(0.3); g.audio?.impact(1.3);
    this.strainBy(14 * this.weight(list));
  }
  nobodyMove() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, R = 16 * this.reach();
    const sure = g.domainSys?.sureHit(p);
    const list = g.enemies.filter((e) => !e.dead && !e.isDummy && (sure ? g.domainSys.inside(e.pos) : e.pos.distanceTo(p.pos) < R));
    this.cast(0.6, true);
    this.say('Nobody move', true);
    for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.voiceRing(p.pos, R * (0.5 + i * 0.25)));
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.6), 1.4, 0.7); g.fx.chroma(0.8); g.fx.flash(0x20103a, 0.25, 0.2);
    const dur = 3 * this.bindMul;
    for (const e of list) {
      e.cancelAttack?.();
      if (e.isBoss) { this.slow(e, dur); this.hit(e, 8, { stagger: 1 }); }
      else e.sealT = Math.max(e.sealT ?? 0, dur);
      g.fx.summonCircle(e.pos, VOICE);
    }
    g.shake(0.4); g.audio?.energy('infinity'); g.audio?.impact(1.6);
    this.strainBy(30 * this.weight(list));
  }
  // ------------------------------------------------------------ Destruction
  shatter() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, dir = this.fwd(), L = 13 * this.reach(), W = 1.4;
    const from = p.pos.clone().setY(p.pos.y + 1.2);
    this.cast(0.4, true);
    this.say('Shatter', true);
    g.fx.slashLine(from, dir, L, VOICE, W * 1.8, 0.35, 0); g.fx.slashLine(from, dir, L, 0xffffff, W * 0.4, 0.25, Math.PI / 2);
    const list = [];
    this.line(p.pos, dir, L, W, (e) => {
      list.push(e);
      this.hit(e, (36 + this.rank('crush') * 8) * this.mult, { stagger: 0.9, unblockable: true, knock: dir.clone().multiplyScalar(e.isBoss ? 2 : 6) });
      g.particles.burst(e.pos.clone().setY(e.pos.y + e.height * 0.5), { count: 10, color: VOICE, speed: 5, life: 0.4, size: 0.1, shape: 1 });
    });
    for (let s = 1; s < L; s += 1.2) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(p.pos.y + 0.5), dir, 1.3, Math.PI, 60, p);
    for (let s = 2; s < L; s += 3) g.fx.debris(from.clone().addScaledVector(dir, s).setY(p.pos.y + 0.4), 0x6a5a5a, 3);
    g.shake(0.4); g.audio?.impact(1.7);
    this.strainBy(16 * this.weight(list));
  }
  explodeWord() {
    if (this.mute()) return false;
    const g = this.game, p = this.p;
    let list = this.targets(9 * this.reach(), 0.7);
    if (!list.length) { const e = g.nearestEnemy(p.pos, 7); if (e) list = [e]; }
    if (!list.length) { g.toast?.('No one to command'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    this.say('Explode', true);
    for (const e of list) { e.cancelAttack?.(); this.slow(e, 1); }
    this.during(0.8, () => { for (const e of list) if (!e.dead && Math.random() < 0.6) g.particles.glow.emit(e.pos.x + (Math.random() - 0.5) * 0.6, e.pos.y + Math.random() * e.height, e.pos.z + (Math.random() - 0.5) * 0.6, 0, 1.5, 0, 0.3, 2.2, 1.6, 3.2, 0.14, 0, 1, 0.1, 1); });
    for (const e of list) g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.08, e.pos.z), { color: VOICE, r0: 2.6, r1: 2.4, dur: 0.8, thick: 0.08 });
    g.audio?.charge(0.4, 1.4);
    this.after(0.8, () => {
      list.forEach((e, i) => this.after(i * 0.05, () => {
        if (e.dead) return;
        const c = e.pos.clone().setY(e.pos.y + e.height * 0.5);
        this.hit(e, (20 + this.rank('crush') * 6) * this.mult, { unblockable: true, stagger: 0.6 });
        this.blast(c, 2.6 * this.reach(), (34 + this.rank('crush') * 8) * this.mult, { color: VOICE, knock: 8 });
      }));
    });
    this.strainBy(22 * this.weight(list));
  }
  flatten() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, rk = this.rank('crush'), R = 6 * this.reach();
    const at = this.wordSpot(10); at.y = this.groundAt(at.x, at.z, at.y);
    this.cast(0.6, true, { lock: true });
    this.say('Be crushed flat', true);
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.07, at.z), { color: VOICE, r0: R, r1: R * 0.97, dur: 0.6, thick: 0.12 });
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.08, at.z), { color: VOICE, r0: R, r1: 0.3, dur: 0.6, thick: 0.2 });
    this.during(0.6, () => { for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R; g.particles.glow.emit(at.x + Math.cos(a) * rr, at.y + 5 + Math.random() * 2, at.z + Math.sin(a) * rr, 0, -14, 0, 0.35, 1.6, 1.2, 3, 0.2, 0, 0, 0.6, 1); } });
    this.strainBy(30 * this.weight(this.foes(at, R)));
    this.after(0.6, () => {
      for (const e of this.foes(at, R)) {
        this.hit(e, (70 + rk * 20) * this.mult, { stagger: 1.2, unblockable: true });
        if (e.vel) e.vel.y = Math.min(e.vel.y, -12);
        this.slow(e, 3);
      }
      g.combat.hitBlocks(at, tmp.set(0, 0, 1), R * 0.7, Math.PI, 80, p);
      g.fx.shockwave(at, VOICE, R + 1.5); g.fx.debris(at.clone().setY(at.y + 0.3), 0x6a5a5a, 14);
      g.fx.darkRings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: 0x000000, r0: 0.3, r1: R, dur: 0.6, thick: 0.6 });
      g.fx.screenWave(at, 1.2, 0.5); g.fx.flash(0x20103a, 0.3, 0.2);
      g.shake(0.7); g.hitStop(0.08); g.audio?.impact(2.2, 'crit');
    });
  }
  // ------------------------------------------------------------ Throat (no words)
  coughSyrup() {
    const g = this.game, p = this.p;
    if (this.strain <= 0 && this.muteT <= 0 && p.hp >= p.maxHp) { g.toast?.('Your throat is fine'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    this.strain = Math.max(0, this.strain - 60);
    this.muteT = Math.max(0, this.muteT - 3);
    p.healOverTime = { left: p.maxHp * 0.1, t: 1 };
    g.fx.heal(p.pos, VOICE);
    g.particles.burst(this.mouth(), { count: 10, color: 0xffb0d0, speed: 1.5, life: 0.5, size: 0.1, shape: 1 });
    g.toast?.('🧴 Cough syrup — throat soothed');
    g.audio?.energy('heal');
  }
  spinKick() {
    const g = this.game, p = this.p, R = 3.2;
    this.pose('spin', 0.4);
    let n = 0;
    for (const e of this.foes(p.pos, R)) { this.hit(e, 20, { melee: true, stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(e.isBoss ? 3 : 9) }); n++; }
    g.fx.slashArc(p.pos, p.facing, VOICE, R, Math.PI, 0.25);
    g.fx.shockwave(p.pos, VOICE, R, 0.3);
    if (n) { g.hitStop(0.04); g.audio?.impact(1.1); } else g.audio?.swing(1);
  }
  onigiri() {
    if (this.rctHeal(0.25, 3, 0xffffff) === false) return false;
    this.game.toast?.('🍙 "Tuna mayo!"');
  }
  stayBack() {
    if (this.mute()) return false;
    const g = this.game, p = this.p;
    this.cast(0.3);
    this.say('Stay back', false);
    this.buff('stay_back', 4, {
      onTick: () => { if (Math.random() < 0.35) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5), p.pos.y + 0.5 + Math.random() * 1.4, p.pos.z + (Math.random() - 0.5), 0, 0.5, 0, 0.4, 1.6, 1.2, 3, 0.1, 0, 1, 0.1, 1); },
      incoming: (amt, src) => {
        if (src && src.pos && !src.dead && !src.isPlayer && g.enemies.includes(src) && src.pos.distanceTo(p.pos) < 7 && this.muteT <= 0) {
          this.hit(src, 8 * this.mult, { stagger: 0.8, knock: tmp.subVectors(src.pos, p.pos).setY(0).normalize().multiplyScalar(src.isBoss ? 4 : 14) });
          g.fx.slashArc(p.pos, Math.atan2(src.pos.x - p.pos.x, src.pos.z - p.pos.z), VOICE, 2.5, 0.5, 0.2);
          this.strainBy(4 * this.weight([src]), true);
        }
        return amt * 0.5;
      } });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: VOICE, r0: 0.3, r1: 2.2, dur: 0.35, thick: 0.15 });
    this.strainBy(4);
  }
  deepBreath() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    this.strain = Math.max(0, this.strain - 20);
    this.buff('deep_breath', 6, { onTick: () => { if (Math.random() < 0.2) g.particles.burst(this.mouth(), { count: 1, color: 0xe8e2f0, speed: 0.6, life: 0.6, size: 0.12, sizeEnd: 0.02 }); } });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0xe8e2f0, r0: 2.4, r1: 0.4, dur: 0.5, thick: 0.12 });
    g.toast?.('🌬️ Deep breath — no strain for 6s');
    g.audio?.tone({ freq: 220, to: 330, dur: 0.6, gain: 0.06, type: 'sine', rev: 0.5 });
  }
  unzip() {
    const g = this.game, p = this.p;
    this.cast(0.5, true, { type: 'raise' });
    this.statBuff('unzip', 8, { techMult: 0.4 }, { onTick: () => { if (Math.random() < 0.5) { const m = this.mouth(); g.particles.glow.emit(m.x + (Math.random() - 0.5) * 0.3, m.y + (Math.random() - 0.5) * 0.2, m.z + (Math.random() - 0.5) * 0.3, 0, 0.6, 0, 0.4, 2.2, 1.6, 3.2, 0.1, 0, 1, 0.1, 1); } } });
    g.lights.flash(this.mouth(), VOICE, 8, 6, 0.6, { priority: 5 });
    g.particles.burst(this.mouth(), { count: 24, color: VOICE, speed: 2, life: 0.7, size: 0.14, sizeEnd: 0.02 });
    g.toast?.('🐍 The snake-and-fangs seal is bared');
    g.audio?.charge(0.4, 0.8);
  }
  // ------------------------------------------------------------ words
  blastAway() {
    if (this.mute()) return false;
    const g = this.game, p = this.p;
    this.cast(0.32);
    this.say('Blast away', false);
    const face = Math.atan2(p.aimDir.x, p.aimDir.z);
    for (let i = 0; i < 4; i++) setTimeout(() => g.fx.slashArc(p.pos, face, VOICE, 1.6 + i * 1.6, 0.45, 0.25), i * 45);
    g.particles.burst(this.handPos(), { count: 24, color: VOICE, speed: 14, spread: 0.35, dir: p.aimDir.clone(), life: 0.4, size: 0.14, shape: 1 });
    for (const e of this.targets(7, 0.6)) {
      const k = tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(e.isBoss ? 4 : 15);
      g.combat.damageEnemy(e, 12 * this.mult, p, { knock: k, stagger: 0.5 });
      g.combat.hitBlocks(e.pos, p.aimDir, 1, Math.PI, 20, p);
    }
    g.combat.hitBlocks(p.pos, p.aimDir, 5, 0.5, 15, p);
    g.shake(0.15);
    this.strainBy(5 * this.weight(this.targets(7, 0.6)));
  }
  dontMove() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, rk = this.rank('freeze');
    const R = 9 + rk * 1.5;
    this.cast(0.45, true);
    this.say('Don\'t move', true);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: VOICE, r0: 0.5, r1: R, dur: 0.5, thick: 0.08 });
    g.fx.darkRings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: 0x000000, r0: 0.5, r1: R * 0.9, dur: 0.6, thick: 0.2 });
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.6), 0.8, 0.5);
    let n = 0; const held = [];
    for (const e of g.enemies) {
      if (e.dead || e.isDummy || (e.pos.distanceTo(p.pos) > R && !g.domainSys?.sureHit(p))) continue;
      held.push(e);
      e.cancelAttack?.();
      if (e.isBoss) { e.slowT = Math.max(e.slowT ?? 0, 2 + rk * 0.5); g.combat.damageEnemy(e, 6, p, { stagger: 1 }); }
      else e.sealT = Math.max(e.sealT ?? 0, (2.2 + rk * 0.6) * this.bindMul);
      g.fx.summonCircle(e.pos, VOICE);
      n++;
    }
    g.shake(0.2); g.audio?.energy('infinity');
    this.strainBy(14 * this.weight(held));
    if (!n) g.toast?.('Nothing to stop');
  }
  getCrushed() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, rk = this.rank('crush');
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const at = sure ? sure.pos.clone() : (g.nearestEnemy(p.aimPoint, 2.5)?.pos.clone() ?? p.aimPoint.clone());
    tmp.subVectors(at, p.pos).setY(0); if (!sure && tmp.length() > 10) at.copy(p.pos).addScaledVector(tmp.normalize(), 10);
    const gy = g.world.groundBelow(at.x, at.z, p.pos.y + 3); at.y = isFinite(gy) ? gy : p.pos.y;
    const R = 3.4 + rk * 0.7;
    this.cast(0.4);
    this.say('Get crushed', true);
    // the air above folds down
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R; g.particles.glow.emit(at.x + Math.cos(a) * rr, at.y + 4 + Math.random() * 2, at.z + Math.sin(a) * rr, 0, -18, 0, 0.25, 1.6, 1.2, 3, 0.18, 0, 0, 0.6, 1); }
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.08, at.z), { color: VOICE, r0: R * 1.4, r1: 0.3, dur: 0.25, thick: 0.2 });
    this.strainBy(20 * this.weight(g.combat.query(at, tmp.set(0, 0, 1), R, Math.PI)));
    setTimeout(() => {
      for (const e of g.combat.query(at, tmp.set(0, 0, 1), R, Math.PI)) {
        g.combat.damageEnemy(e, (46 + rk * 16) * this.mult, p, { stagger: 1, unblockable: true });
        e.vel.y = Math.min(e.vel.y, -8); e.slowT = Math.max(e.slowT ?? 0, 2);
      }
      g.combat.hitBlocks(at, tmp.set(0, 0, 1), R, Math.PI, 60, p);
      g.fx.shockwave(at, VOICE, R + 1.5); g.fx.debris(at.clone().setY(at.y + 0.3), 0x6a5a5a, 8);
      g.fx.darkRings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: 0x000000, r0: 0.3, r1: R, dur: 0.5, thick: 0.4 });
      g.fx.screenWave(at, 0.9, 0.4);
      g.shake(0.45); g.hitStop(0.06); g.audio?.impact(2);
    }, 220);
  }
  twist() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, rk = this.rank('crush');
    let list = this.targets(8, 0.7);
    if (!list.length) { const e = g.nearestEnemy(p.pos, 7); if (e) list = [e]; }
    if (!list.length) { g.toast?.('No one to command'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    this.say('Twist', true);
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.6), 0.7, 0.4);
    for (const e of list) {
      e.slowT = Math.max(e.slowT ?? 0, 1.5);
      for (let k = 0; k < 3; k++) setTimeout(() => {
        if (e.dead) return;
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
        g.combat.damageEnemy(e, (16 + rk * 6) * this.mult, p, { stagger: 0.5, unblockable: true, color: '#b89aff' });
        g.fx.slashArc(e.pos, k * 2.1 + Math.random(), VOICE, 0.9 + e.radius, 0.9, 0.22, k % 2 === 1);
        g.particles.burst(at, { count: 8, color: k === 2 ? BLOOD : VOICE, speed: 4, life: 0.4, size: 0.1, shape: 1 });
        g.audio?.impact(0.9);
      }, 120 + k * 140);
    }
    g.shake(0.3);
    this.strainBy(18 * this.weight(list));
  }
  // Ultimate: "Die".
  die() {
    if (this.mute()) return false;
    const g = this.game, p = this.p, rk = this.rank('die');
    const R = 15 + rk * 3;
    const list = g.enemies.filter((e) => !e.dead && !e.isDummy && e.pos.distanceTo(p.pos) < R);
    if (!list.length) { g.toast?.('No one to command'); g.audio?.ui('back'); return false; }
    p.action = { type: 'sign', dur: 1.0, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes ?? 0, 1.5);
    g.slowMo(1.4, 0.2); g.fx.dimTarget = 0.7;
    g.toast?.('「DIE」', 'domain');
    // the collar comes down: the snake-and-fangs seal glows as he draws breath
    g.particles.burst(this.mouth(), { count: 30, color: VOICE, speed: 2, life: 0.8, size: 0.15, sizeEnd: 0.02 });
    g.lights.flash(this.mouth(), VOICE, 8, 6, 0.9, { priority: 6 });
    g.audio?.charge(0.9, 0.5);
    for (const e of list) { e.cancelAttack?.(); if (!e.isBoss) e.sealT = Math.max(e.sealT ?? 0, 1.2); }
    const bosses = list.filter((e) => e.isBoss).length;
    this.dieT = setTimeout(() => {
      this.dieT = null;
      if (p.action?.type === 'sign') p.action = null;
      g.fx.dimTarget = 0;
      this.say('Die', false);
      g.fx.flash(0x5a0010, 0.8, 0.45); g.fx.blackFlash(0.25); g.fx.chroma(2);
      g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.7), 2, 0.9);
      for (let i = 0; i < 5; i++) g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1 + i * 0.4, p.pos.z), { color: i % 2 ? BLOOD : VOICE, r0: 0.5, r1: R * (0.6 + i * 0.1), dur: 0.5 + i * 0.1, thick: 0.12 });
      g.fx.darkRings.spawn(tmp.set(p.pos.x, p.pos.y + 0.07, p.pos.z), { color: 0x000000, r0: 0.5, r1: R, dur: 0.8, thick: 0.6 });
      g.lights.flash(p.pos.clone().setY(p.pos.y + 2), BLOOD, 30, R + 6, 0.6, { priority: 8 });
      g.shake(1); g.hitStop(0.12);
      g.audio?.blackFlash(); g.audio?.energy('explode');
      list.forEach((e, i) => setTimeout(() => {
        if (e.dead) return;
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
        e.sealT = 0;
        const dmg = e.isBoss ? e.maxHp * (0.22 + rk * 0.04) + 200 : Math.max(e.hp, 1) * 6 + 300;
        g.combat.damageEnemy(e, dmg, p, { stagger: 1.5, unblockable: true, crit: false, color: '#ff3a5a', ceGain: 0 });
        g.particles.burst(at, { count: 30, color: BLOOD, speed: 7, life: 0.6, size: 0.14, gravity: 12, shape: 1, intensity: 1.6 });
        g.fx.darkRings.spawn(tmp.set(e.pos.x, e.pos.y + 0.07, e.pos.z), { color: 0x000000, r0: 0.3, r1: 3, dur: 0.5, thick: 0.4 });
        g.lights.flash(at, BLOOD, 10, 8, 0.4);
      }, 40 + i * 35));
      // the order tears Toge's throat
      const cost = Math.min(p.hp - 1, p.maxHp * (0.3 + rk * 0.04 + bosses * 0.08));
      if (cost > 0) {
        p.hp -= cost;
        g.fx.damageNumber(p.pos, cost, { color: '#ff3a4a', text: `-${Math.round(cost)} 🩸`, crit: true });
        g.particles.burst(this.mouth(), { count: 40, color: BLOOD, speed: 4, life: 0.8, size: 0.12, gravity: 14, shape: 1, intensity: 1.5 });
        g.audio?.hurt();
      }
      this.strain = 130; this.quietT = 4; this.muteT = 8;
      setTimeout(() => g.toast?.('🩸 The order tears Toge\'s throat — he can\'t speak for 8s'), 700);
    }, 900);
  }
}
registerKit('inumaki', InumakiKit, INUMAKI_SKILLS);
