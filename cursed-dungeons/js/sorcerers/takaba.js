// Fumihiko Takaba-style kit — Comedian. Whatever Takaba finds funny becomes
// reality, so his fights are slapstick: falling washtubs, banana peels, giant
// mallets, and a body that simply can't be hurt while he's sure the bit
// isn't over. 20 abilities on the technique tree; four are equipped (RMB
// takes a basic one) plus F.
//   LMB        tsukkomi slaps with a paper fan; the last one is a big "WHY?!".
//   Gags       Tsukkomi Fan (start, RMB), Pie Throw, Washtub Drop, Banana Peel,
//              Squeaky Mallet, Washtub Rain
//   Slapstick  Spring Glove, Pratfall, Cartoon Chase, Exploding Afro, Rubber Body
//   Stage      Rimshot, Spotlight Bit, Laugh Track, Confetti Cannon
//   Reality    Not Funny (can't be hurt), Straight Man (a manzai partner),
//              Retcon, The Bit Goes On, Running Gag
//   F          Ultimate: Comedian: Showtime! (no canon domain) — a stage drops in
//              around him, the curtain goes up, gags rain down and the punchline
//              is a colossal mallet.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { GEO, glow, mat, temp, mesh, beam, pillar, meshShot, pull, sigil, aimAt, awayFromCamera } from './fxlib.js';

const GOLD = 0xffd84a, RED = 0xe83a3a, TUB = 0xc8ccd4, BANANA = 0xffe04a, PIE = 0xfff4e0, CONFETTI = [0xff5a8a, 0x5ad8ff, 0xffe04a, 0x7aff7a, 0xc07aff];
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('takaba', { name: 'Takaba', technique: 'Comedian', rarity: 'rare', title: 'Struggling Comedian', desc: 'Slapstick made real: falling washtubs, banana peels, pies and mallets, and a body that can\'t be hurt while the bit is still going.', ultimate: 'Comedian: Showtime!', color: '#ffd84a' });

registerLook('takaba', {
  paint: { skinTone: 0xf0cdb0, hair: 0x1a1210, hairVolume: true, top: 0xf2f0ea, collar: 0xf2f0ea, topTrim: 0xd8d4c8, buttons: 0x2a2a2a, sleeve: 0xf2f0ea, pants: 0x2a2a34, shoes: 0x1a1010, eye: 0x3a2a1a, fringe: 1, hairSide: 2, hairBack: 3 },
  paintExtra(S) {
    // moustache, a big grin and the red bow tie
    S.mat = 'hair'; S.rect(10, 13, 4, 1, 0x1a1210, 0.05);
    S.mat = 'skin'; S.fineRect(10.5, 14, 3, 0.5, 0xf8f8f8, 'skin');
    S.mat = 'cloth'; S.rect(22, 20, 4, 1, RED, 0.05); S.px(21, 20, RED); S.px(26, 20, RED);
  },
  hair: (m) => [
    { x: 0, y: 8, z: 0, w: 8, h: 1.6, d: 8, material: m },
    { x: 1.5, y: 8.6, z: 2.2, w: 4, h: 1.4, d: 4, rz: -0.25, material: m },   // the side-parted quiff
  ],
  hairColor: 0x1a1210, accent: GOLD, emit: 0.05, cape: null, scale: 1.15,
  props(rig, K) {
    // the harisen (pleated paper fan) for tsukkomi
    const paper = K.mat(0xf8f4e8, { roughness: 0.9 }), tape = K.mat(RED, { roughness: 0.7 });
    const fan = new THREE.Group();
    for (let i = 0; i < 5; i++) K.box(fan, 1.2, 9, 0.3, paper, (i - 2) * 1.1, -5, (i % 2) * 0.3, 0, 0, (i - 2) * 0.08);
    K.box(fan, 3, 2, 0.8, tape, 0, -0.5, 0.1);
    fan.rotation.x = Math.PI / 2.2; fan.position.z = 2 * K.PX;
    rig.handR.add(fan); rig.extras.weapon = fan;
  },
});

export const TAKABA_SKILLS = [
  { id: 'timing', name: 'Comic Timing', icon: '⏱️', desc: '+8% melee damage and +5% critical chance per rank.', max: 3, branch: 'Slapstick', tier: 0 },
  { id: 'props', name: 'Prop Comedy', icon: '🎭', desc: 'Gags are bigger and hit harder.', max: 3, req: 'ab:fan', branch: 'Gags', tier: 1 },
  { id: 'crowd', name: 'Tough Crowd', icon: '👏', desc: 'Stage bits last longer and heal more.', max: 2, req: 'ab:laugh', branch: 'Stage', tier: 2 },
  { id: 'reality', name: 'Comedy Is Reality', icon: '🌀', desc: 'Not Funny lasts longer; Showtime\'s punchline hits harder.', max: 2, req: 'ab:not_funny', branch: 'Reality', tier: 3 },
];

class TakabaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const fan = { trail: GOLD, sparkColor: 0xffffff };
    this.combo = [
      { ...fan, style: 'swingR', dur: 0.26, windup: 0.24, strike: 0.5, dmg: 11, range: 2.7, arc: 1.2, lunge: 7, knock: 4, stop: 0.04, shake: 0.12 },
      { ...fan, style: 'swingL', dur: 0.26, windup: 0.24, strike: 0.5, dmg: 12, range: 2.7, arc: 1.2, lunge: 7, knock: 4, stop: 0.04, shake: 0.12 },
      { ...fan, style: 'slam', dur: 0.5, windup: 0.4, strike: 0.6, dmg: 24, range: 3.2, arc: 1.4, lunge: 4, knock: 10, stop: 0.09, shake: 0.35, ring: true, ringColor: GOLD, stagger: 0.7, why: true },
    ];
    this.p.stats.meleeMult += r('timing') * 0.08; this.p.stats.crit += r('timing') * 0.05;
    this.branches = ['Gags', 'Slapstick', 'Stage', 'Reality'];
    this.gagMul = 1 + r('props') * 0.15; this.crowdMul = 1 + r('crowd') * 0.3;
    this.library = {
      // ---- Gags
      fan: ability({ name: 'Tsukkomi Fan', icon: '🪭', kind: 'basic', desc: '"Why would you do that?!" A paper-fan slap that flies across the room and smacks a curse.', cd: 0.75, ce: 0, branch: 'Gags', tier: 0, start: true, legacy: 'ranged', use: () => this.fanShot() }),
      pie: ability({ name: 'Pie Throw', icon: '🥧', kind: 'basic', desc: 'A cream pie to the face: the curse is blinded and stumbles about.', cd: 1.2, ce: 0, branch: 'Gags', tier: 1, req: 'fan', use: () => this.pie() }),
      tub: ability({ name: 'Washtub Drop', icon: '🪣', kind: 'technique', desc: 'The classic: a metal washtub falls out of nowhere onto the targeted curse. CLANG.', cd: 6, ce: 10, branch: 'Gags', tier: 1, legacy: 't1', req: 'fan', use: () => this.tub() }),
      banana: ability({ name: 'Banana Peel', icon: '🍌', kind: 'technique', desc: 'Toss banana peels around the aim: curses that step on one slip, fly up and land on their heads.', cd: 9, ce: 12, branch: 'Gags', tier: 2, req: 'pie', use: () => this.banana() }),
      mallet: ability({ name: 'Squeaky Mallet', icon: '🔨', kind: 'technique', desc: 'Pull out a giant squeaky mallet and bonk everything in front of you flat.', cd: 8, ce: 14, branch: 'Gags', tier: 2, req: 'tub', use: () => this.mallet() }),
      tub_rain: ability({ name: 'Washtub Rain', icon: '🌧️', kind: 'technique', desc: 'It is raining washtubs. Over the aim. For 2.5 seconds.', cd: 16, ce: 26, branch: 'Gags', tier: 3, req: ['banana', 'mallet'], use: () => this.tubRain() }),
      // ---- Slapstick
      glove: ability({ name: 'Spring Glove', icon: '🥊', kind: 'technique', desc: 'A boxing glove on a spring shoots out of your sleeve and sends a curse flying.', cd: 6, ce: 8, branch: 'Slapstick', tier: 1, use: () => this.glove() }),
      pratfall: ability({ name: 'Pratfall', icon: '🤸', kind: 'movement', desc: 'Trip over nothing and tumble forward a long way, untouchable, flattening what you roll over.', cd: 6, ce: 5, branch: 'Slapstick', tier: 2, req: 'glove', use: () => this.pratfall() }),
      chase: ability({ name: 'Cartoon Chase', icon: '💨', kind: 'movement', desc: 'Legs spin into a blur: a dust-cloud dash that bowls curses over.', cd: 7, ce: 6, branch: 'Slapstick', tier: 2, req: 'glove', use: () => this.chase() }),
      afro: ability({ name: 'Exploding Afro', icon: '💣', kind: 'technique', desc: 'A cartoon bomb with a lit fuse. It explodes and everyone near it ends up with a smoking afro.', cd: 10, ce: 14, branch: 'Slapstick', tier: 3, req: 'pratfall', use: () => this.afro() }),
      rubber: ability({ name: 'Rubber Body', icon: '🪀', kind: 'technique', desc: 'Your arm stretches like rubber, grabs a curse far away and snaps it into a punch.', cd: 9, ce: 12, branch: 'Slapstick', tier: 3, req: 'chase', use: () => this.rubber() }),
      // ---- Stage
      rimshot: ability({ name: 'Rimshot', icon: '🥁', kind: 'technique', desc: 'Ba-dum TSS! The punchline lands so hard curses around you freeze.', cd: 10, ce: 10, branch: 'Stage', tier: 1, legacy: 't2', use: () => this.rimshot() }),
      spotlight: ability({ name: 'Spotlight Bit', icon: '🎙️', kind: 'technique', desc: 'A spotlight finds a curse; the bit plays out on it for 3s and it can\'t do a thing.', cd: 12, ce: 14, branch: 'Stage', tier: 2, req: 'rimshot', use: () => this.spotBit() }),
      laugh: ability({ name: 'Laugh Track', icon: '😂', kind: 'heal', desc: 'The audience roars: you heal 25% over 3s and regain Cursed Energy.', cd: 20, ce: 0, branch: 'Stage', tier: 2, req: 'rimshot', use: () => this.laugh() }),
      confetti: ability({ name: 'Confetti Cannon', icon: '🎉', kind: 'technique', desc: 'A party cannon blasts a cone of confetti, streamers and surprisingly heavy party favours.', cd: 8, ce: 12, branch: 'Stage', tier: 3, req: 'spotlight', use: () => this.confetti() }),
      // ---- Reality
      not_funny: ability({ name: 'Not Funny', icon: '🙅', kind: 'defence', desc: 'As long as Takaba doesn\'t think it\'s funny, it can\'t hurt him: 4s of immunity.', cd: 22, ce: 14, branch: 'Reality', tier: 1, use: () => this.notFunny() }),
      straight_man: ability({ name: 'Straight Man', icon: '🧑‍🤝‍🧑', kind: 'summon', desc: 'Your manzai partner appears for 8s and smacks curses on every one of your punchlines.', cd: 18, ce: 18, branch: 'Reality', tier: 2, req: 'not_funny', use: () => this.straightMan() }),
      retcon: ability({ name: 'Retcon', icon: '↩️', kind: 'heal', desc: '"That didn\'t happen." Undo the damage you took in the last 4 seconds.', cd: 24, ce: 16, branch: 'Reality', tier: 3, req: 'not_funny', use: () => this.retcon() }),
      bit: ability({ name: 'The Bit Goes On', icon: '♾️', kind: 'buff', desc: 'For 10s every gag cools down 40% faster and hits 20% harder.', cd: 30, ce: 16, branch: 'Reality', tier: 3, req: 'straight_man', use: () => this.bitGoesOn() }),
      running: ability({ name: 'Running Gag', icon: '🔁', kind: 'technique', desc: 'Washtubs drop on every curse nearby — then again, and again, each one funnier and harder.', cd: 22, ce: 40, branch: 'Reality', tier: 4, legacy: 't3', req: ['bit', 'retcon'], use: () => this.runningGag() }),
    };
    this.passives = {
      heckler: passive({ name: 'Heckler-proof', icon: '🛡️', desc: '+8% damage reduction and +20 max health.', branch: 'Reality', tier: 2, req: 'not_funny', apply: (pl) => { pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.08); pl.maxHp += 20; pl.hp += 20; } }),
      callback: passive({ name: 'Callback', icon: '📞', desc: 'Curses you kill have a chance to get a washtub dropped on the curse next to them.', branch: 'Gags', tier: 3, req: 'tub', apply: (pl, k) => { k.callback = true; } }),
      improv: passive({ name: 'Improv', icon: '🎲', desc: 'Every gag has a 20% chance not to go on cooldown.', branch: 'Slapstick', tier: 3, req: 'pratfall', apply: (pl, k) => { k.improv = true; } }),
      encore: passive({ name: 'Standing Ovation', icon: '👏', desc: 'Kills restore 2 Cursed Energy and 1% health.', branch: 'Stage', tier: 2, req: 'rimshot', apply: (pl, k) => { k.ovation = true; } }),
    };
    this.ultimate = { name: 'Comedian: Showtime!', icon: '🎭', use: () => this.showtime() };
    this.dmgLog = [];
  }
  get gm() { return this.gagMul * (this.buffs.has('bit') ? 1.2 : 1); }
  ghit(e, dmg, o = {}) { return this.hit(e, dmg * this.gm, { color: '#ffe88a', ...o }); }
  onCast(s) { if (this.improv && Math.random() < 0.2) this.after(0, () => { s.cdLeft = 0; }); }
  onKill(e) {
    if (this.ovation) { this.p.gainCE(2); this.p.heal?.(this.p.maxHp * 0.01, true); }
    if (this.callback && Math.random() < 0.35) { const n = this.game.enemies.find((x) => !x.dead && x !== e && x.pos.distanceTo(e.pos) < 6); if (n) this.dropTub(n.pos.clone(), 1, 22, n); }
  }
  incoming(a) { this.dmgLog.push({ t: this.game.time, a }); while (this.dmgLog.length && this.dmgLog[0].t < this.game.time - 4) this.dmgLog.shift(); return a; }
  onMeleeHit(e, step) { if (step.why) { this.boing(e.pos); if (this.partner) this.partnerHit(e); } }
  sfx(kind) {
    const a = this.game.audio; if (!a) return;
    if (kind === 'clang') { a.tone({ freq: 880, to: 840, dur: 0.6, gain: 0.12, type: 'triangle', rev: 0.5 }); a.tone({ freq: 1320, dur: 0.4, gain: 0.06, type: 'sine', rev: 0.5 }); }
    else if (kind === 'squeak') { a.tone({ freq: 1400, to: 2200, dur: 0.12, gain: 0.08, type: 'square', filter: 4000 }); a.tone({ freq: 2200, to: 1400, dur: 0.12, gain: 0.08, type: 'square', filter: 4000, at: 0.1 }); }
    else if (kind === 'boing') a.tone({ freq: 200, to: 600, dur: 0.25, gain: 0.1, type: 'sine' });
    else if (kind === 'rim') { a.noise({ dur: 0.06, gain: 0.3, type: 'bandpass', freq: 300 }); a.noise({ dur: 0.06, gain: 0.3, type: 'bandpass', freq: 300, at: 0.14 }); a.noise({ dur: 0.5, gain: 0.25, type: 'highpass', freq: 6000, at: 0.3 }); }
    else if (kind === 'laugh') for (let i = 0; i < 8; i++) a.tone({ freq: 300 + Math.random() * 300, to: 200, dur: 0.12, gain: 0.04, type: 'sawtooth', filter: 1500, at: i * 0.1 });
  }
  boing(at) { const g = this.game; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.particles.burst(tmp.set(at.x + Math.cos(a) * 0.6, at.y + 2, at.z + Math.sin(a) * 0.6), { count: 1, color: GOLD, speed: 1, up: 2, life: 0.6, size: 0.25, shape: 3 }); } this.sfx('boing'); }
  stars(e) { const g = this.game, ring = new THREE.Group(); for (let i = 0; i < 4; i++) { const s = mesh(GEO.box, glow(GOLD, 3), 0.18); s.rotation.z = Math.PI / 4; ring.add(s); } temp(this, ring, 1.4, (t) => { if (e.dead) return false; ring.children.forEach((s, i) => { const a = t * 6 + i * Math.PI / 2; s.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); }); ring.position.set(e.pos.x, e.pos.y + (e.height ?? 1.5) + 0.4, e.pos.z); }); }
  tubMesh(s = 1) {
    const grp = new THREE.Group(), m = mat(TUB, { metalness: 0.8, roughness: 0.3 });
    const base = mesh(GEO.cylSolid, m, [0.55 * s, 0.1 * s, 0.55 * s]); base.position.y = 0.25 * s; grp.add(base);
    const wall = mesh(GEO.cyl, mat(TUB, { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }), [0.75 * s, 0.5 * s, 0.75 * s]); grp.add(wall);
    const rim = mesh(GEO.torus, m, 0.75 * s); rim.rotation.x = Math.PI / 2; rim.position.y = -0.25 * s; grp.add(rim);
    return grp;
  }
  // a washtub falls on `at` (upside down, CLANG)
  dropTub(at, s, dmg, follow = null, R = 1.4) {
    const g = this.game;
    at.y = this.groundAt(at.x, at.z, at.y);
    const tub = this.tubMesh(s * (0.8 + this.gm * 0.2));
    const from = at.clone().setY(at.y + 9);
    temp(this, tub, 0.4, (t, dt, k) => { const to = follow && !follow.dead ? follow.pos.clone().setY(follow.pos.y + (follow.height ?? 1.5) + 0.3) : at.clone().setY(at.y + 0.5); tub.position.lerpVectors(from, to, k * k); tub.rotation.y = k * 3; }, () => {
      const c = follow && !follow.dead ? follow.pos.clone() : at;
      for (const e of this.foes(c, R * s)) { this.ghit(e, dmg, { stagger: 0.8 }); this.stun(e, 0.8); this.stars(e); }
      this.sfx('clang'); g.fx.rings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: TUB, r0: 0.3, r1: R * s + 0.5, dur: 0.25, thick: 0.1 });
      // it bounces off and clatters away
      const bounce = this.tubMesh(s); bounce.position.copy(c).setY(c.y + 1.4);
      const v = new THREE.Vector3((Math.random() - 0.5) * 4, 6, (Math.random() - 0.5) * 4);
      temp(this, bounce, 0.8, (t, dt) => { v.y -= 20 * dt; bounce.position.addScaledVector(v, dt); bounce.rotation.x += dt * 9; });
    });
  }
  // ------------------------------------------------------------ Gags
  fanShot() {
    const g = this.game;
    this.pose('swingR', 0.22);
    const { dir } = aimAt(this, this.handPos(), 15);
    const fan = new THREE.Group(); for (let i = 0; i < 5; i++) { const b = mesh(GEO.box, mat(0xf8f4e8, { roughness: 0.9 }), [0.12, 0.05, 0.8]); b.rotation.y = (i - 2) * 0.18; b.position.x = (i - 2) * 0.1; fan.add(b); }
    meshShot(this, fan, { pos: this.handPos(), vel: dir.clone().multiplyScalar(22), life: 0.7, radius: 0.55, face: false,
      trail: (q, dt) => { fan.rotation.y += dt * 20; },
      onHit: (e, q) => { this.ghit(e, 13, { stagger: 0.35, knock: q.vel.clone().setY(0).setLength(4) }); g.fx.damageNumber(e.pos.clone().setY(e.pos.y + 0.6), 0, { text: 'WHY?!', color: '#ffe88a' }); g.audio?.impact(0.9); } });
    g.audio?.whoosh(0.8);
  }
  pie() {
    const g = this.game;
    this.cast(0.3);
    const { dir } = aimAt(this, this.handPos(), 14);
    const pie = new THREE.Group(); const crust = mesh(GEO.cylSolid, mat(0xd8a050), [0.35, 0.1, 0.35]); const cream = mesh(GEO.sphere, mat(PIE, { roughness: 0.9 }), [0.33, 0.12, 0.33]); cream.position.y = 0.08; pie.add(crust, cream);
    meshShot(this, pie, { pos: this.handPos(), vel: dir.clone().multiplyScalar(18).setY(3), gravity: 9, life: 1, radius: 0.55, face: false,
      trail: (q, dt) => { pie.rotation.x += dt * 4; },
      onHit: (e) => { this.ghit(e, 10, { stagger: 0.3 }); this.stun(e, 1.2); e.slowT = Math.max(e.slowT ?? 0, 3); g.particles.burst(e.pos.clone().setY(e.pos.y + (e.height ?? 1.5) * 0.8), { count: 16, color: PIE, additive: false, speed: 3, life: 0.7, size: 0.18, gravity: 8, intensity: 1.2 }); g.audio?.noise({ dur: 0.15, gain: 0.25, type: 'lowpass', freq: 600 }); } });
  }
  tub() {
    const t = this.target(15), at = t ? t.pos.clone() : this.aimGround(13);
    this.cast(0.3);
    this.game.markers.spawn({ pos: at.clone(), dur: 0.4, radius: 1.4, color: GOLD });
    this.dropTub(at, 1.3, 34, t);
  }
  banana() {
    const g = this.game, c = this.aimGround(11);
    this.cast(0.35, true);
    const peels = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + Math.random() * 0.5, rr = 1 + Math.random() * 2.6, at = c.clone().add(tmp.set(Math.cos(a) * rr, 0, Math.sin(a) * rr)); at.y = this.groundAt(at.x, at.z, c.y);
      const m = new THREE.Group(); for (let k = 0; k < 3; k++) { const b = mesh(GEO.box, mat(BANANA, { roughness: 0.6 }), [0.12, 0.04, 0.45]); b.rotation.y = k * 2.1; b.position.set(Math.sin(k * 2.1) * 0.15, 0.03, Math.cos(k * 2.1) * 0.15); m.add(b); }
      m.position.copy(at); peels.push({ m, at, live: true });
    }
    const grp = new THREE.Group(); peels.forEach((pl) => grp.add(pl.m));
    temp(this, grp, 10, () => {
      let any = false;
      for (const pl of peels) {
        if (!pl.live) continue; any = true;
        const e = this.foes(pl.at, 0.9)[0];
        if (e) {
          pl.live = false; pl.m.visible = false;
          if (!e.isBoss) e.vel.y = 10;
          this.stun(e, 1.4); this.sfx('boing');
          this.after(0.8, () => { if (!e.dead) { this.ghit(e, 30, { stagger: 0.9 }); this.stars(e); g.fx.landDust(e.pos, 14); } });
        }
      }
      return any;
    });
  }
  mallet() {
    const g = this.game, p = this.p, f = this.fwd(), c = p.pos.clone().addScaledVector(f, 2.6), R = 3;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.6, windup: 0.4 }, style: 'slam', dur: 0.5, elapsed: 0, t: 0, windup: 0.4, strike: 0.6, struck: true, moveScale: 0, lock: true, faceAim: true };
    const m = new THREE.Group(); const head = mesh(GEO.cylSolid, mat(RED, { roughness: 0.5 }), [0.9, 1.8, 0.9]); head.rotation.x = Math.PI / 2; head.position.y = 3; m.add(head);
    const cap = mesh(GEO.cylSolid, mat(GOLD), [0.92, 0.2, 0.92]); cap.rotation.x = Math.PI / 2; cap.position.set(0, 3, 0.95); m.add(cap);
    const handle = mesh(GEO.box, mat(0xd8a050), [0.2, 3, 0.2]); handle.position.y = 1.5; m.add(handle);
    m.rotation.order = 'YXZ';
    const yaw = Math.atan2(f.x, f.z);
    temp(this, m, 0.45, (t, dt, k) => { m.position.copy(p.pos).setY(p.pos.y + 0.6); m.rotation.set(-0.5 + Math.min(1, k * 1.6) * (Math.PI / 2 + 0.5), yaw, 0); });
    this.after(0.28, () => {
      for (const e of this.foes(c, R)) { this.ghit(e, 42, { stagger: 1, unblockable: true }); this.stun(e, 1); this.stars(e); }
      g.fx.shockwave(c, GOLD, R + 1); g.fx.landDust(c, 20); g.shake(0.4); g.hitStop(0.05); this.sfx('squeak');
    });
  }
  tubRain() {
    const g = this.game, c = this.aimGround(12), R = 5.5;
    this.cast(0.5, true);
    g.toast?.('It\'s raining washtubs!'); g.markers.spawn({ pos: c, dur: 0.5, radius: R, color: GOLD });
    let tick = 0.3;
    this.during(2.6, (t, dt) => {
      tick -= dt; if (tick > 0) return; tick = 0.14;
      const list = this.foes(c, R), e = list.length && Math.random() < 0.6 ? list[Math.floor(Math.random() * list.length)] : null;
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
      this.dropTub(e ? e.pos.clone() : c.clone().add(tmp.set(Math.cos(a) * rr, 0, Math.sin(a) * rr)), 0.9, 16, e);
    });
  }
  // ------------------------------------------------------------ Slapstick
  glove() {
    const g = this.game, p = this.p, f = this.fwd(), L = 8;
    this.cast(0.35);
    const grp = new THREE.Group(); const glove = mesh(GEO.box, mat(RED, { roughness: 0.4 }), [0.7, 0.7, 0.8]); grp.add(glove);
    const spring = mesh(GEO.box, mat(0xb8b8c0, { metalness: 0.9 }), [0.1, 0.1, 1]); grp.add(spring);
    const from = this.handPos(); grp.rotation.y = Math.atan2(f.x, f.z);
    let hitOne = false;
    temp(this, grp, 0.45, (t, dt, k) => {
      const ext = Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * L * (k > 0.6 ? (1 - (k - 0.6) * 2.5) : 1);
      glove.position.z = ext; spring.position.z = ext / 2; spring.scale.z = ext;
      grp.position.copy(this.handPos());
      if (!hitOne) { const at = tmp.copy(grp.position).addScaledVector(f, ext); const e = this.foes(at, 1.2)[0]; if (e) { hitOne = true; this.ghit(e, 32, { stagger: 0.9, knock: tmp2.copy(f).setLength(18) }); if (!e.isBoss) e.vel.y = 6; this.sfx('boing'); g.fx.hitSpark(at, f, { color: RED, big: true }); } }
    });
  }
  pratfall() {
    const g = this.game, p = this.p, f = this.fwd();
    this.dash(f, 9, 0.45, { hitR: 1.5, dmg: 16 * this.gm, color: GOLD, iframes: 0.6, onHit: (e) => this.stun(e, 0.6) });
    p.action.style = 'spin';
    g.audio?.noise({ dur: 0.4, gain: 0.2, type: 'lowpass', freq: 300 }); this.sfx('boing');
  }
  chase() {
    const g = this.game, p = this.p, f = this.fwd();
    this.dash(f, 11, 0.3, { hitR: 1.7, dmg: 14 * this.gm, color: 0xe8e0d0, onHit: (e) => { if (!e.isBoss) e.knock?.add(tmp.set(-f.z, 0, f.x).multiplyScalar(Math.random() < 0.5 ? 8 : -8)); } });
    this.during(0.3, () => g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.3, p.pos.z), { count: 3, color: 0xd8d0c0, additive: false, speed: 1, life: 0.6, size: 0.5, sizeEnd: 1.4, drag: 3 }));
    g.audio?.tone({ freq: 300, to: 1200, dur: 0.3, gain: 0.06, type: 'square', filter: 2000 });
  }
  afro() {
    const g = this.game, c = this.aimGround(10), p = this.p;
    this.cast(0.35);
    const bomb = new THREE.Group(); bomb.add(mesh(GEO.sphere, mat(0x1a1a1e, { roughness: 0.4 }), 0.45)); const fuse = mesh(GEO.box, glow(0xffa040, 3), [0.06, 0.3, 0.06]); fuse.position.y = 0.5; bomb.add(fuse);
    const from = this.handPos();
    g.markers.spawn({ pos: c, dur: 1.2, radius: 3, color: GOLD });
    temp(this, bomb, 1.2, (t, dt, k) => { const kk = Math.min(1, t / 0.5); bomb.position.lerpVectors(from, c.clone().setY(c.y + 0.45), kk); bomb.position.y += Math.sin(kk * Math.PI) * 2.5; if (Math.random() < 0.6) g.particles.burst(tmp.copy(bomb.position).setY(bomb.position.y + 0.6), { count: 1, color: 0xffa040, speed: 1, life: 0.2, size: 0.1, shape: 3 }); }, () => {
      const list = this.foes(c, 3);
      this.blast(c, 3, 40 * this.gm, { color: 0xffa040, knock: 6, stagger: 0.8 });
      g.particles.burst(c.clone().setY(c.y + 1), { count: 20, color: 0x2a2a2a, additive: false, speed: 3, up: 2, life: 1.2, size: 0.8, sizeEnd: 2.5, drag: 2 });
      // smoking afros
      for (const e of list) if (!e.dead) { const a = mesh(GEO.sphere, mat(0x1a1210, { roughness: 1 }), (e.radius ?? 0.5) + 0.3); temp(this, a, 3, () => { if (e.dead) return false; a.position.set(e.pos.x, e.pos.y + (e.height ?? 1.5) + 0.1, e.pos.z); if (Math.random() < 0.1) g.particles.smoke.emit(a.position.x, a.position.y + 0.5, a.position.z, 0, 1, 0, 1, 0.3, 0.3, 0.3, 0.3, -0.2, 1, 1, 0); }); this.slow(e, 3); }
    });
  }
  rubber() {
    const g = this.game, p = this.p, t = this.target(14);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.5);
    const arm = mesh(GEO.box, mat(0xf2f0ea), [0.25, 0.25, 1]), fist = mesh(GEO.box, mat(0xf0cdb0), 0.45);
    const grp = new THREE.Group(); grp.add(arm, fist);
    this.stun(t, 0.8);
    temp(this, grp, 0.6, (tt, dt, k) => {
      if (t.dead) return false;
      const a = this.handPos(), b = t.pos.clone().setY(t.pos.y + 1), out = k < 0.4 ? k / 0.4 : 1;
      const end = a.clone().lerp(b, out);
      arm.position.lerpVectors(a, end, 0.5); arm.scale.set(0.25, 0.25, Math.max(0.1, a.distanceTo(end))); arm.lookAt(end); fist.position.copy(end);
      if (k > 0.4 && !t.isBoss) t.knock?.add(tmp.subVectors(p.pos, t.pos).setY(0).setLength(3));
    }, () => { if (!t.dead) { this.pose('punch', 0.25); this.ghit(t, 36, { stagger: 1, knock: tmp.subVectors(t.pos, p.pos).setY(0).setLength(10) }); this.sfx('boing'); g.audio?.impact(1.3); } });
  }
  // ------------------------------------------------------------ Stage
  rimshot() {
    const g = this.game, p = this.p, R = 6;
    this.cast(0.5, true);
    this.sfx('rim');
    this.after(0.3, () => {
      for (const e of this.foes(p.pos, R)) { this.stun(e, 1.5 * this.crowdMul); this.ghit(e, 14, { stagger: 0.5 }); this.stars(e); }
      g.fx.shockwave(p.pos, GOLD, R + 1); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 0.7, 0.3);
    });
  }
  spotBit() {
    const g = this.game, t = this.target(14);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    const dur = 3 * this.crowdMul;
    this.stun(t, dur); t.cancelAttack?.();
    pillar(this, t.pos.clone(), 1.4, 12, 0xfff8e0, dur, { core: 0xffffff, soft: true });
    let tick = 0;
    this.during(dur, (tt, dt) => { if (t.dead) return false; tick -= dt; if (tick <= 0) { tick = 0.6; this.ghit(t, 12, { stagger: 0.2 }); if (Math.random() < 0.5) this.dropTub(t.pos.clone(), 0.7, 8, t); else this.boing(t.pos); } });
    g.audio?.tone({ freq: 523, to: 659, dur: 0.3, gain: 0.07, type: 'triangle' });
  }
  laugh() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    p.healOverTime = { left: p.maxHp * 0.25 * this.crowdMul, t: 3 };
    p.gainCE(15);
    this.sfx('laugh'); g.fx.heal(p.pos, GOLD);
    for (let i = 0; i < 10; i++) this.after(i * 0.15, () => g.fx.damageNumber(p.pos.clone().add(tmp.set((Math.random() - 0.5) * 4, 1 + Math.random(), (Math.random() - 0.5) * 4)), 0, { text: Math.random() < 0.5 ? 'HAHA' : 'LOL', color: '#ffe88a' }));
  }
  confetti() {
    const g = this.game, p = this.p, f = this.fwd(), R = 7;
    this.cast(0.35);
    for (let i = 0; i < 60; i++) { const a = Math.atan2(f.x, f.z) + (Math.random() - 0.5) * 1.4, sp = 6 + Math.random() * 10; g.particles.burst(this.handPos(), { count: 1, color: CONFETTI[i % 5], speed: sp, spread: 0.1, dir: tmp.set(Math.sin(a) * sp, 2 + Math.random() * 3, Math.cos(a) * sp), life: 1.2, size: 0.14, gravity: 6, drag: 1.5, shape: 1 }); }
    for (const e of this.foes(p.pos, R, f, 0.7)) this.ghit(e, 26, { stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(9) });
    g.audio?.noise({ dur: 0.3, gain: 0.4, type: 'lowpass', freq: 2000, sweep: 300 }); g.shake(0.2);
  }
  // ------------------------------------------------------------ Reality
  notFunny() {
    const g = this.game, p = this.p, dur = 4 + this.rank('reality');
    this.cast(0.3, true);
    g.toast?.('"...That\'s not funny."');
    const aura = mesh(GEO.sphere, glow(GOLD, 0.6, 0.25), 1.3);
    this.buff('not_funny', dur, { onStart: () => g.scene.add(aura), incoming: () => { this.boing(p.pos); return 0; }, onTick: () => aura.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z), onEnd: () => g.scene.remove(aura) });
    g.audio?.tone({ freq: 200, to: 180, dur: 0.6, gain: 0.1, type: 'sine', rev: 0.4 });
  }
  straightMan() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    // the partner: a little blocky figure in a dark suit
    const fig = new THREE.Group(), suit = mat(0x2a2a34), skin = mat(0xf0cdb0), hair = mat(0x1a1210);
    const body = mesh(GEO.box, suit, [0.6, 0.8, 0.35]); body.position.y = 1.1; fig.add(body);
    const head = mesh(GEO.box, skin, [0.5, 0.5, 0.5]); head.position.y = 1.8; fig.add(head);
    const hd = mesh(GEO.box, hair, [0.52, 0.15, 0.52]); hd.position.y = 2.08; fig.add(hd);
    for (const s of [-1, 1]) { const leg = mesh(GEO.box, suit, [0.22, 0.7, 0.25]); leg.position.set(s * 0.15, 0.35, 0); fig.add(leg); }
    const arm = mesh(GEO.box, suit, [0.2, 0.7, 0.2]); arm.position.set(0.42, 1.2, 0); fig.add(arm);
    g.fx.summonCircle(p.pos, GOLD);
    this.partner = { fig, arm };
    let tick = 0;
    temp(this, fig, 8, (t, dt) => {
      const side = tmp.set(Math.cos(p.facing), 0, -Math.sin(p.facing));
      const want = p.pos.clone().addScaledVector(side, 1.3);
      fig.position.lerp(want, Math.min(1, dt * 6)); fig.position.y = this.groundAt(fig.position.x, fig.position.z, p.pos.y);
      fig.rotation.y = p.facing;
      arm.rotation.x = Math.max(0, arm.rotation.x - dt * 8);
      tick -= dt; if (tick <= 0) { tick = 1.1; const e = this.foes(fig.position, 6)[0]; if (e) this.partnerHit(e); }
    }, () => { this.partner = null; g.fx.poof(fig.position); });
    g.audio?.energy('summon');
  }
  partnerHit(e) {
    const g = this.game, P = this.partner; if (!P || e.dead) return;
    P.arm.rotation.x = 2;
    P.fig.lookAt(e.pos.x, P.fig.position.y, e.pos.z);
    this.ghit(e, 18, { stagger: 0.5, knock: tmp.subVectors(e.pos, P.fig.position).setY(0).setLength(6) });
    g.fx.damageNumber(e.pos.clone().setY(e.pos.y + 0.8), 0, { text: 'NANDE YA!', color: '#ffe88a' });
    g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: GOLD }); g.audio?.impact(0.8);
  }
  retcon() {
    const g = this.game, p = this.p;
    const lost = this.dmgLog.reduce((a, d) => a + d.a, 0);
    if (lost <= 0 || p.hp >= p.maxHp) { g.toast?.('Nothing to take back'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    p.heal?.(Math.max(lost, p.maxHp * 0.1), false);
    this.dmgLog.length = 0;
    g.toast?.('"That didn\'t happen."');
    g.fx.flash(0xfff0c0, 0.25, 0.25); g.fx.heal(p.pos, GOLD); g.audio?.tone({ freq: 1500, to: 300, dur: 0.4, gain: 0.08, type: 'sine', rev: 0.5 });
  }
  bitGoesOn() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.toast?.('The bit goes on!'); this.sfx('rim');
    this.buff('bit', 10, { onStart: () => { this.cdMul *= 0.6; }, onEnd: () => { this.cdMul /= 0.6; }, onTick: () => { if (Math.random() < 0.3) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 2.4, p.pos.z), { count: 1, color: CONFETTI[Math.floor(Math.random() * 5)], speed: 1, life: 0.6, size: 0.14, gravity: 3, shape: 1 }); } });
  }
  runningGag() {
    const g = this.game, p = this.p;
    const list = this.foes(p.pos, 12);
    if (!list.length) { g.toast?.('No audience'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    g.toast?.('Running Gag');
    for (let round = 0; round < 4; round++) this.after(round * 0.55, () => { for (const e of list) if (!e.dead) this.dropTub(e.pos.clone(), 1 + round * 0.25, 18 + round * 12, e); if (round === 3) this.after(0.4, () => this.sfx('laugh')); });
  }
  // ------------------------------------------------------------ F: Showtime!
  showtime() {
    const g = this.game, p = this.p, c = p.pos.clone(), R = 12;
    p.action = { type: 'cast', both: true, dur: 2.6, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.iframes = Math.max(p.iframes, 2.8);
    g.toast?.('Comedian: Showtime!');
    // the stage: boards, footlights and a red curtain that rises
    const stage = new THREE.Group(), gy = this.groundAt(c.x, c.z, c.y);
    const boards = mesh(GEO.box, mat(0x8a5a2a, { roughness: 0.8 }), [R * 2, 0.2, R * 1.2]); boards.position.set(0, 0.1, 0); stage.add(boards);
    for (let i = -5; i <= 5; i++) { const l = mesh(GEO.box, glow(GOLD, 3), [0.3, 0.2, 0.3]); l.position.set(i * 2, 0.3, R * 0.6); stage.add(l); }
    const curtain = mesh(GEO.box, mat(0xa01020, { roughness: 0.9 }), [R * 2, 8, 0.3]); curtain.position.set(0, 4, -R * 0.6); stage.add(curtain);
    const arch = mesh(GEO.box, mat(GOLD, { metalness: 0.7, roughness: 0.3 }), [R * 2 + 1, 0.8, 0.5]); arch.position.set(0, 8.2, -R * 0.6); stage.add(arch);
    const away = awayFromCamera(this, c);   // the curtain stands on the far side, facing the camera
    stage.position.set(c.x, gy, c.z); stage.rotation.y = Math.atan2(-away.x, -away.z);
    temp(this, stage, 3.4, (t, dt, k) => { stage.scale.y = Math.min(1, t * 3); curtain.scale.y = Math.max(0.05, 1 - Math.max(0, t - 0.4) * 1.5); curtain.position.y = 8 - 4 * curtain.scale.y; });
    pillar(this, c.clone().setY(gy), 2, 16, 0xfff8e0, 3.2, { core: 0xffffff, soft: true });
    g.fx.dimTarget = 0.4;
    this.sfx('rim');
    const list = this.foes(c, R);
    for (const e of list) this.stun(e, 2.8);
    // act one: everything falls on everyone
    for (let i = 0; i < 3; i++) this.after(0.6 + i * 0.4, () => { for (const e of list) if (!e.dead) { if (i === 1) { this.ghit(e, 10, { stagger: 0.3 }); this.boing(e.pos); g.particles.burst(e.pos.clone().setY(e.pos.y + 1.5), { count: 10, color: PIE, additive: false, speed: 3, life: 0.6, size: 0.18, gravity: 8 }); } else this.dropTub(e.pos.clone(), 1.1, 16, e); } });
    // the punchline: a colossal mallet
    this.after(2, () => {
      g.fx.dimTarget = 0;
      const m = new THREE.Group(), head = mesh(GEO.cylSolid, mat(RED, { roughness: 0.5 }), [3, 6, 3]); head.rotation.x = Math.PI / 2; head.position.y = 7; m.add(head);
      const cap1 = mesh(GEO.cylSolid, mat(GOLD), [3.05, 0.5, 3.05]); cap1.rotation.x = Math.PI / 2; cap1.position.set(0, 7, 3.1); m.add(cap1); m.rotation.order = 'YXZ';
      const handle = mesh(GEO.box, mat(0xd8a050), [0.6, 7, 0.6]); handle.position.y = 3.5; m.add(handle);
      const f = tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing)).clone(), at = c.clone().addScaledVector(f, 7); at.y = gy;
      temp(this, m, 0.5, (t, dt, k) => { m.position.copy(c).setY(gy); m.rotation.set(-0.6 + k * k * (Math.PI / 2 + 0.6), p.facing, 0); }, () => {
        for (const e of this.foes(c, R)) { const mx = e.isDummy ? 100 : Math.min(e.maxHp ?? 100, 1e6); this.ghit(e, (e.isBoss ? 40 + mx * 0.05 : Math.max(70, mx * 0.55)) * (1 + this.rank('reality') * 0.2), { stagger: 1, unblockable: true, crit: false }); this.stars(e); }
        g.fx.shockwave(at, GOLD, R); g.fx.screenWave(at, 1.4, 0.6); g.hitStop(0.1); g.shake(1);
        for (let i = 0; i < 80; i++) g.particles.burst(at.clone().setY(at.y + 2), { count: 1, color: CONFETTI[i % 5], speed: 10, up: 4, life: 1.6, size: 0.16, gravity: 6, drag: 1.2, shape: 1 });
        this.sfx('squeak'); this.sfx('laugh'); g.audio?.energy('explode');
      });
    });
  }
}
registerKit('takaba', TakabaKit, TAKABA_SKILLS);
