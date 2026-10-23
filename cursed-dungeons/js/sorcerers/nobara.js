// Nobara-style kit — Straw Doll Technique. 21 abilities on the technique
// tree; four are equipped (RMB takes a basic one) plus F.
//   LMB        hammer combo; every hit drives a nail into the curse.
//   Nails      Nails (start, RMB), Piercing Nail, Nail Volley, Nail Storm, Nail
//              Rain, Cursed Energy Infusion
//   Hairpin    Hairpin, Cluster, Nail Trap, Chain Reaction
//   Resonance  Resonance, Pin, Spike, Chain, Severed Piece
//   Hammer     Hammer Whirl, Hammer Quake, Hammer Throw, Hammer Leap
//   Straw Doll Straw Doll Ward, Self-Resonance
//   F          Ultimate (no domain): Resonance: Blood Doll — she takes the strongest
//              curse's blood (and pays with her own), hammers the nail into a giant
//              straw doll three times, then every embedded nail detonates (Hairpin).
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit } from './index.js';

const ORANGE = 0xffa050;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

export const NOBARA_SKILLS = [
  { id: 'nails', name: 'Iron Nails', icon: '🔩', desc: 'Nails deal more damage.', max: 3, req: 'ab:nails', branch: 'Nails', tier: 1 },
  { id: 'hairpin', name: 'Bigger Bang', icon: '💣', desc: 'Bigger, stronger nail detonations.', max: 3, req: 'ab:hairpin', branch: 'Hairpin', tier: 2 },
  { id: 'resonance', name: 'Deep Resonance', icon: '〰️', desc: 'Resonance hits harder per nail.', max: 3, req: 'ab:resonance', branch: 'Resonance', tier: 2 },
  { id: 'hammer', name: 'Heavy Hammer', icon: '🔨', desc: '+8% melee damage per rank (and hammer abilities).', max: 3, branch: 'Hammer', tier: 0 },
  { id: 'storm', name: 'Thicker Storm', icon: '🌠', desc: 'More nails in the storm.', max: 2, req: 'ab:nail_storm', branch: 'Nails', tier: 3 },
  { id: 'doll', name: 'Straw Doll', icon: '🪆', desc: 'Resonance also restores Cursed Energy.', max: 1, req: 'resonance', branch: 'Straw Doll', tier: 3 },
];

class NobaraKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 14, range: 2.7, arc: 1.2, lunge: 5, knock: 5, stop: 0.055, shake: 0.2, trail: ORANGE, sparkColor: 0xffc080 },
      { style: 'swingL', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 14, range: 2.7, arc: 1.2, lunge: 5, knock: 5, stop: 0.055, shake: 0.2, trail: ORANGE, sparkColor: 0xffc080 },
      { style: 'slam', dur: 0.6, windup: 0.45, strike: 0.62, dmg: 28, range: 3.2, arc: Math.PI, lunge: 3, knock: 11, stop: 0.1, shake: 0.45, ring: true, ringColor: ORANGE, stagger: 0.6, trail: ORANGE },
    ];
    this.p.stats.meleeMult += r('hammer') * 0.08;
    this.branches = ['Nails', 'Hairpin', 'Resonance', 'Hammer', 'Straw Doll'];
    this.resMul = 1; this.hpCostMul = 1; this.nailBonus = 0; this.nailDmgMul = 1;
    this.library = {
      // ---- Nails
      nails: ability({ name: 'Nails', icon: '📌', kind: 'basic', desc: 'Flick three cursed nails that embed in curses.', cd: 0.7, ce: 0, branch: 'Nails', tier: 0, start: true, legacy: 'ranged', use: () => this.nails(3, 0.22) }),
      piercing_nail: ability({ name: 'Piercing Nail', icon: '📍', kind: 'basic', desc: 'One heavy nail driven by the hammer: it pierces every curse in a line and embeds twice.', cd: 0.9, ce: 0, branch: 'Nails', tier: 1, req: 'nails', use: () => this.piercingNail() }),
      nail_volley: ability({ name: 'Nail Volley', icon: '🔩', kind: 'basic', desc: 'Hammer five nails in a rapid line at the aim.', cd: 1.4, ce: 2, branch: 'Nails', tier: 2, req: 'piercing_nail', use: () => this.volley() }),
      nail_storm: ability({ name: 'Nail Storm', icon: '🌠', kind: 'technique', desc: 'A wide fan of nails.', cd: 10, ce: 14, branch: 'Nails', tier: 2, legacy: 't3', req: 'nails', use: () => this.nails(9 + this.rank('storm') * 3, 1.1) }),
      nail_rain: ability({ name: 'Nail Rain', icon: '🌧️', kind: 'technique', desc: 'Toss a handful of nails high and hammer the air: they rain down over an area.', cd: 12, ce: 18, branch: 'Nails', tier: 3, req: 'nail_storm', use: () => this.nailRain() }),
      infusion: ability({ name: 'Cursed Energy Infusion', icon: '✨', kind: 'buff', desc: 'For 10s your nails carry more cursed energy: each embeds twice and hits 50% harder.', cd: 24, ce: 16, branch: 'Nails', tier: 4, req: 'nail_rain', use: () => this.infuse() }),
      // ---- Hairpin
      hairpin: ability({ name: 'Hairpin', icon: '💥', kind: 'technique', desc: 'Every embedded nail detonates.', cd: 4, ce: 8, branch: 'Hairpin', tier: 1, legacy: 't1', use: () => this.hairpin() }),
      cluster: ability({ name: 'Hairpin: Cluster', icon: '🎆', kind: 'basic', desc: 'Three nails primed to burst the moment they hit.', cd: 2.2, ce: 5, branch: 'Hairpin', tier: 2, req: 'hairpin', use: () => this.cluster() }),
      mine: ability({ name: 'Hairpin: Nail Trap', icon: '🪤', kind: 'technique', desc: 'Scatter nails in a ring on the ground; they detonate when a curse steps near.', cd: 10, ce: 14, branch: 'Hairpin', tier: 3, req: 'cluster', use: () => this.trap() }),
      chain_reaction: ability({ name: 'Hairpin: Chain Reaction', icon: '⛓️‍💥', kind: 'technique', desc: 'Detonate one nailed curse; the blast leaps from nail to nail, growing each time.', cd: 14, ce: 24, branch: 'Hairpin', tier: 4, req: 'mine', use: () => this.chainReaction() }),
      // ---- Resonance
      resonance: ability({ name: 'Resonance', icon: '🪆', kind: 'technique', desc: 'The straw doll strikes every curse you have nailed, wherever it is, harder for each nail.', cd: 9, ce: 16, branch: 'Resonance', tier: 1, legacy: 't2', use: () => this.resonance() }),
      pin: ability({ name: 'Resonance: Pin', icon: '📎', kind: 'technique', desc: 'Drive the nail home through the doll: every nailed curse is pinned in place.', cd: 11, ce: 14, branch: 'Resonance', tier: 2, req: 'resonance', use: () => this.pin() }),
      res_spike: ability({ name: 'Resonance: Spike', icon: '🦔', kind: 'technique', desc: 'Iron spikes burst out of every nailed curse, piercing whatever stands beside it.', cd: 10, ce: 16, branch: 'Resonance', tier: 3, req: 'resonance', use: () => this.spikes() }),
      res_chain: ability({ name: 'Resonance: Chain', icon: '🔗', kind: 'technique', desc: 'The resonance runs from nail to nail: lines of force connect the nailed curses and cut everything between them.', cd: 12, ce: 20, branch: 'Resonance', tier: 3, req: 'pin', use: () => this.resChain() }),
      soul_res: ability({ name: 'Resonance: Severed Piece', icon: '💔', kind: 'technique', desc: 'Pour everything into one nailed curse — the way she struck Mahito\'s soul through a piece of him.', cd: 16, ce: 30, branch: 'Resonance', tier: 4, req: 'res_chain', use: () => this.severed() }),
      // ---- Hammer
      hammer_spin: ability({ name: 'Hammer Whirl', icon: '🔨', kind: 'technique', desc: 'Spin with the hammer out, bashing every curse around you and nailing each one.', cd: 5, ce: 6, branch: 'Hammer', tier: 1, use: () => this.whirl() }),
      hammer_quake: ability({ name: 'Hammer Quake', icon: '🌋', kind: 'technique', desc: 'Slam the ground: shockwaves roll forward, embedding nails in everything they hit.', cd: 7, ce: 10, branch: 'Hammer', tier: 2, req: 'hammer_spin', use: () => this.quake() }),
      hammer_toss: ability({ name: 'Hammer Throw', icon: '🪃', kind: 'basic', desc: 'Throw the hammer; it spins out and comes back, hitting on the way out and back.', cd: 1.8, ce: 0, branch: 'Hammer', tier: 2, req: 'hammer_spin', use: () => this.toss() }),
      hammer_leap: ability({ name: 'Hammer Leap', icon: '🦘', kind: 'movement', desc: 'Leap to the aim point and bring the hammer down where you land.', cd: 6, ce: 8, branch: 'Hammer', tier: 3, req: 'hammer_quake', use: () => this.leap() }),
      // ---- Straw Doll
      ward: ability({ name: 'Straw Doll Ward', icon: '🧸', kind: 'defence', desc: 'A doll takes the next three hits meant for you (8s); each one it takes sprays nails back.', cd: 15, ce: 12, branch: 'Straw Doll', tier: 2, req: 'resonance', use: () => this.wardDoll() }),
      self_doll: ability({ name: 'Straw Doll: Self-Resonance', icon: '🩸', kind: 'buff', desc: 'Nail the doll through your own blood (10% health): for 8s every hit you take strikes every nailed curse twice as hard.', cd: 25, ce: 20, branch: 'Straw Doll', tier: 4, req: 'ward', use: () => this.selfResonance() }),
    };
    this.passives = {
      nerve: passive({ name: 'Nobara\'s Nerve', icon: '😤', desc: 'Your techniques deal 20% more damage to nailed curses.', branch: 'Resonance', tier: 2, req: 'resonance', apply: (pl, k) => { k.nerve = true; } }),
      steel_nails: passive({ name: 'Steel Nails', icon: '⚙️', desc: 'Every nail you embed counts as two.', branch: 'Nails', tier: 2, req: 'piercing_nail', apply: (pl, k) => { k.nailBonus += 1; } }),
      grit: passive({ name: 'Country Grit', icon: '🌾', desc: '+20 max health and 8% damage reduction.', branch: 'Hammer', tier: 3, req: 'hammer_quake', apply: (pl) => { pl.maxHp += 20; pl.hp += 20; pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.08); } }),
      blood_price: passive({ name: 'Blood Price', icon: '💉', desc: 'Abilities that cost your health cost half; Resonance abilities hit 15% harder.', branch: 'Straw Doll', tier: 3, req: 'ward', apply: (pl, k) => { k.hpCostMul = 0.5; k.resMul *= 1.15; } }),
    };
    // No canon domain: F is Nobara's full Resonance ritual — the straw doll,
    // her own blood and a nail driven home, then every nail goes off (Hairpin).
    this.ultimate = { name: 'Resonance: Blood Doll', icon: '🩸', use: () => this.bloodDoll() };
  }
  addNail(e, n = 1) {
    e.nails = Math.min(8, (e.nails ?? 0) + n + (this.nailBonus ?? 0)); e.nailT = this.game.time;
    if (!e.nailMarks) e.nailMarks = [];
  }
  onMeleeHit(e) { this.addNail(e, 1); }
  nails(n, spread) {
    const g = this.game, p = this.p;
    this.cast(0.28);
    const base = Math.atan2(p.aimDir.x, p.aimDir.z);
    const dmg = (7 + this.rank('nails') * 3) * this.nailDmgMul;
    for (let i = 0; i < n; i++) {
      const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * 2);
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      g.projectiles.fire({ pos: this.handPos(), vel: dir.multiplyScalar(30), team: 'player', shape: 'nail', color: 0xd8d8e0, emissive: 0.8, life: 0.8, radius: 0.35,
        trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: ORANGE, speed: 0.2, life: 0.2, size: 0.08, shape: 1 }); },
        onHit: (e, q) => { g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setLength(1.5), stagger: 0.15 }); this.addNail(e, 1); g.fx.hitSpark(q.pos, null, { color: ORANGE }); } });
    }
    g.audio?.energy('nail');
  }
  hairpin() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const rk = this.rank('hairpin');
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || !e.nails) continue;
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
      const pow = e.nails;
      g.fx.explosion(at, ORANGE, 1.4 + rk * 0.3 + pow * 0.1);
      g.combat.aoe(at, 1.6 + rk * 0.4, (10 + rk * 5) * pow, p, { knock: 5, stagger: 0.5, blocks: true });
      e.nails = 0; n++;
    }
    if (n) { g.shake(0.3); g.hitStop(0.05); g.audio?.energy('explode'); }
    else { g.toast?.('No nails embedded'); g.audio?.ui('back'); return false; }
  }
  resonance() {
    const g = this.game, p = this.p;
    this.cast(0.6, true);
    const rk = this.rank('resonance');
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || !e.nails) continue;
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
      this.hit(e, (14 + rk * 6) * e.nails * this.resMul, { stagger: 0.8, unblockable: true, color: '#ffa050' });
      g.fx.hitSpark(at, null, { color: ORANGE, big: true });
      g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z), { color: ORANGE, r0: 0.3, r1: 1.8, dur: 0.3, thick: 0.2 });
      e.nails = Math.max(0, e.nails - 2);
      n++;
    }
    if (n && this.rank('doll')) p.gainCE(4 * n);
    if (n) { g.shake(0.25); g.audio?.impact(1.4); g.fx.flash(0x301000, 0.2, 0.12); g.hitStop(0.06); }
    else { g.toast?.('No nailed curses'); g.audio?.ui('back'); return false; }
  }
  tick(dt) {
    // show nails sticking out of curses as tiny sparks
    if (Math.random() < 0.3) for (const e of this.game.enemies) if (!e.dead && e.nails) {
      if (Math.random() < 0.3) this.game.particles.glow.spawn({ x: e.pos.x + (Math.random() - 0.5) * 0.6, y: e.pos.y + e.height * (0.3 + Math.random() * 0.5), z: e.pos.z + (Math.random() - 0.5) * 0.6, vy: 0.2, life: 0.3, r: 2, g: 1.2, b: 0.5, size: 0.06 + e.nails * 0.01, drag: 1, sizeEnd: 1 });
    }
  }
  // -------------------------------------------------------------- ultimate
  bloodDoll() {
    const g = this.game, p = this.p;
    let tgt = null, bs = -1;
    for (const e of g.enemies) {
      if (e.dead || e.isDummy) continue;
      const d = e.pos.distanceTo(p.pos); if (d > 20) continue;
      const sc = (e.isBoss ? 1e6 : 0) + (e.nails ?? 0) * 500 + e.hp - d;
      if (sc > bs) { bs = sc; tgt = e; }
    }
    if (!tgt) { g.toast?.('No curse to take blood from'); g.audio?.ui('back'); return false; }
    this.removeDoll();
    const rk = this.rank('resonance');
    // Resonance through her own wound: Nobara shares the pain
    const cost = Math.min(p.hp - 1, p.maxHp * 0.1 * this.hpCostMul);
    if (cost > 0) { p.hp -= cost; g.fx.damageNumber(p.pos, cost, { color: '#ff5a6a' }); g.fx.splat(p.pos.clone().setY(p.pos.y + 1.2), 0xa00010); }
    this.addNail(tgt, 3);
    p.action = { type: 'cast', both: true, dur: 2.1, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.invulnerable = true;
    g.slowMo(2.2, 0.4);
    g.fx.dimTarget = 0.55;
    g.toast?.('RESONANCE', 'domain');
    g.audio?.charge(0.7, 0.6);
    // the giant straw doll, planted in front of her
    const doll = this.makeDoll();
    const fwd = new THREE.Vector3(p.aimDir.x, 0, p.aimDir.z).normalize();
    doll.position.copy(p.pos).addScaledVector(fwd, 2.4);
    doll.rotation.y = Math.atan2(-fwd.x, -fwd.z);
    doll.scale.setScalar(0.01);
    g.scene.add(doll); this.doll = doll;
    p.facing = Math.atan2(fwd.x, fwd.z);
    let t = 0, strikes = 0;
    const times = [0.55, 0.95, 1.35];
    g.addUpdater((dt) => {
      if (this.doll !== doll) return false;
      t += dt;
      doll.scale.setScalar(Math.min(1, t * 4));
      // her blood (and the curse's) streams into the doll
      if (tgt && !tgt.dead && Math.random() < 0.7) {
        const from = tgt.pos, to = doll.position;
        g.particles.glow.spawn({ x: from.x, y: from.y + tgt.height * 0.6, z: from.z, vx: (to.x - from.x) * 1.5, vy: 2 + (to.y - from.y) * 1.5, vz: (to.z - from.z) * 1.5, life: 0.6, r: 1.6, g: 0.05, b: 0.08, size: 0.14, gravity: 4, sizeEnd: 0.05, shape: 'square' });
      }
      if (strikes < times.length && t >= times[strikes]) {
        strikes++;
        const last = strikes === times.length;
        doll.userData.nail.position.z = 1.1 - strikes * 0.28;
        doll.updateMatrixWorld(true);
        const heart = doll.userData.nail.getWorldPosition(new THREE.Vector3());
        g.fx.hitSpark(heart, null, { color: ORANGE, big: true });
        g.fx.shockwave(doll.position, ORANGE, 2 + strikes);
        g.audio?.impact(1.2 + strikes * 0.3, 'crit');
        g.hitStop(0.07); g.shake(0.3 + strikes * 0.15);
        // RESONANCE: the hammer blow lands on the curse through the doll
        if (tgt && !tgt.dead) {
          const at = tgt.pos.clone().setY(tgt.pos.y + tgt.height * 0.6);
          g.combat.damageEnemy(tgt, (45 + rk * 12) * (1 + (tgt.nails ?? 0) * 0.15), p, { unblockable: true, crit: false, stagger: 1, color: '#ff4040' });
          g.fx.hitSpark(at, null, { color: 0xff2030, big: true });
          g.fx.rings.spawn(tmp.set(tgt.pos.x, tgt.pos.y + 0.06, tgt.pos.z), { color: 0xff3030, r0: 0.4, r1: 3, dur: 0.35, thick: 0.25 });
          g.particles.burst(at, { count: 18, color: 0xb00010, speed: 6, life: 0.5, size: 0.12, gravity: 14, shape: 1 });
          if (!tgt.isBoss) tgt.sealT = Math.max(tgt.sealT ?? 0, 0.8);
        }
        // the echo reaches every other nailed curse
        for (const e of g.enemies) if (e !== tgt && !e.dead && e.nails) g.combat.damageEnemy(e, (12 + rk * 4) * e.nails, p, { unblockable: true, crit: false, stagger: 0.5, color: '#ffa050' });
        if (last) {
          // HAIRPIN: every embedded nail detonates at once
          g.fx.flash(0xff6a2a, 0.6, 0.3); g.fx.chroma(1.6); g.fx.screenWave(heart, 1.4, 0.6);
          g.lights.flash(heart, ORANGE, 20, 16, 0.6, { priority: 7 });
          for (const e of g.enemies) {
            if (e.dead || !e.nails) continue;
            const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
            const pow = e.nails, hr = this.rank('hairpin');
            g.fx.explosion(at, ORANGE, 1.8 + hr * 0.3 + pow * 0.15);
            g.combat.aoe(at, 2.2 + hr * 0.4, (18 + hr * 6) * pow, p, { knock: 8, stagger: 0.8, unblockable: true });
            e.nails = 0;
          }
          g.shake(0.9); g.audio?.energy('explode');
          if (this.rank('doll')) p.gainCE(20);
        }
        return true;
      }
      if (t < 1.9) return true;
      this.endDoll();
      return false;
    });
  }
  // ============================================================== new abilities
  hit(e, dmg, o = {}) { return super.hit(e, dmg * (this.nerve && e.nails ? 1.2 : 1), o); }
  // a nail projectile helper: embeds `embed` nails on hit
  nailShot(dir, o = {}) {
    const g = this.game, p = this.p;
    return g.projectiles.fire({ pos: o.from ?? this.handPos(), vel: dir.clone().multiplyScalar(o.speed ?? 30), team: 'player', shape: 'nail', color: 0xd8d8e0, emissive: 0.8, life: o.life ?? 0.8, radius: o.radius ?? 0.35, scale: o.scale ?? 1, pierce: !!o.pierce, gravity: o.gravity ?? 0,
      trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: ORANGE, speed: 0.2, life: 0.2, size: 0.08, shape: 1 }); },
      onHit: (e, q) => { this.hit(e, (o.dmg ?? 9) * this.nailDmgMul, { knock: q.vel.clone().setY(0).setLength(o.knock ?? 1.5), stagger: o.stagger ?? 0.15 }); this.addNail(e, o.embed ?? 1); g.fx.hitSpark(q.pos, null, { color: ORANGE }); o.onHit?.(e, q); },
      onExpire: o.onExpire });
  }
  piercingNail() {
    const g = this.game;
    this.cast(0.3);
    this.nailShot(this.p.aimDir, { speed: 40, scale: 2.2, radius: 0.5, pierce: true, dmg: 16 + this.rank('nails') * 4, embed: 2, stagger: 0.4, knock: 3 });
    g.audio?.energy('nail'); g.audio?.impact(0.8);
  }
  volley() {
    const g = this.game;
    this.cast(0.4);
    for (let i = 0; i < 5; i++) this.after(i * 0.06, () => { this.nailShot(this.p.aimDir, { dmg: 8 + this.rank('nails') * 2 }); g.audio?.energy('nail'); });
  }
  nailRain() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const c = this.aimGround(12), R = 4;
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: ORANGE, r0: R, r1: R + 0.1, dur: 1.6, thick: 0.12 });
    g.audio?.energy('nail');
    let t0 = 0;
    this.during(1.5, (t, dt) => {
      t0 -= dt; if (t0 > 0) return;
      t0 = 0.05;
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
        const from = new THREE.Vector3(c.x + Math.cos(a) * rr, c.y + 9, c.z + Math.sin(a) * rr);
        this.nailShot(new THREE.Vector3((Math.random() - 0.5) * 0.1, -1, (Math.random() - 0.5) * 0.1), { from, speed: 26, life: 0.6, dmg: 9 + this.rank('nails') * 2, radius: 0.5,
          onExpire: (q, why) => { if (why !== 'hit') g.particles.burst(q.pos, { count: 3, color: ORANGE, speed: 2, life: 0.25, size: 0.06, shape: 1 }); } });
      }
    });
  }
  infuse() {
    const g = this.game, p = this.p;
    g.fx.flash(0x402000, 0.2, 0.2); g.audio?.charge?.(0.4, 0.5); g.toast?.('Cursed Energy Infusion');
    this.buff('infusion', 10, {
      onStart: () => { this.nailBonus += 1; this.nailDmgMul *= 1.5; },
      onEnd: () => { this.nailBonus -= 1; this.nailDmgMul /= 1.5; },
      onTick: () => { if (Math.random() < 0.5) g.particles.burst(this.handPos(), { count: 1, color: ORANGE, speed: 1, life: 0.3, size: 0.1, shape: 1 }); },
    });
  }
  detonate(e, mult = 1) {
    const g = this.game, p = this.p, rk = this.rank('hairpin');
    const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
    const pow = e.nails ?? 1;
    g.fx.explosion(at, ORANGE, (1.4 + rk * 0.3 + pow * 0.1) * Math.min(2, mult));
    g.combat.aoe(at, 1.6 + rk * 0.4, (10 + rk * 5) * pow * mult, p, { knock: 5, stagger: 0.5, blocks: true });
    e.nails = 0;
  }
  cluster() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const base = this.aimAngle();
    for (let i = 0; i < 3; i++) {
      const a = base + (i - 1) * 0.18;
      this.nailShot(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), { dmg: 8, onExpire: (q) => {
        const rk = this.rank('hairpin');
        g.combat.aoe(q.pos, 1.8 + rk * 0.3, 18 + rk * 6, p, { knock: 5, stagger: 0.4 });
        g.fx.explosion(q.pos, ORANGE, 1.4 + rk * 0.2);
      } });
    }
    g.audio?.energy('nail'); this.after(0.2, () => g.audio?.energy('explode'));
  }
  trap() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    const c = this.aimGround(10), N = 6, R = 2.6;
    const traps = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2;
      const at = c.clone().add(tmp.set(Math.cos(a) * R, 0, Math.sin(a) * R)); at.y = this.groundAt(at.x, at.z, c.y);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), new THREE.MeshStandardNodeMaterial({ color: 0xd8d8e0, metalness: 0.8, roughness: 0.3, emissive: ORANGE, emissiveIntensity: 0.8 }));
      m.position.copy(at).setY(at.y + 0.2); m.rotation.z = 0.3; g.scene.add(m);
      traps.push({ at, m, live: true });
      g.fx.rings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: ORANGE, r0: 0.2, r1: 1.4, dur: 0.3, thick: 0.08 });
    }
    g.audio?.energy('nail');
    const boom = (tr) => {
      tr.live = false; g.scene.remove(tr.m); tr.m.geometry.dispose();
      const rk = this.rank('hairpin');
      g.combat.aoe(tr.at.clone().setY(tr.at.y + 0.5), 2.2 + rk * 0.3, 28 + rk * 8, p, { knock: 7, stagger: 0.7 });
      g.fx.explosion(tr.at.clone().setY(tr.at.y + 0.5), ORANGE, 1.8 + rk * 0.2);
      for (const e of this.foes(tr.at, 2.4)) this.addNail(e, 1);
      g.shake(0.2); g.audio?.energy('explode');
    };
    this.during(10, (t) => {
      let any = false;
      for (const tr of traps) {
        if (!tr.live) continue; any = true;
        tr.m.material.emissiveIntensity = 0.6 + Math.sin(t * 8) * 0.4;
        if (t > 0.5 && this.foes(tr.at, 1.6).length) boom(tr);
      }
      return any;
    }, () => { for (const tr of traps) if (tr.live) boom(tr); });
  }
  chainReaction() {
    const g = this.game, p = this.p;
    let cur = null, bd = Infinity;
    for (const e of g.enemies) { if (e.dead || !e.nails) continue; const d = e.pos.distanceTo(p.aimPoint); if (d < bd) { bd = d; cur = e; } }
    if (!cur) { g.toast?.('No nails embedded'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    const done = new Set();
    let mult = 1;
    const step = () => {
      if (!cur || cur.dead && !cur.nails) return;
      done.add(cur);
      const from = cur.pos.clone().setY(cur.pos.y + 1);
      this.detonate(cur, mult);
      g.shake(0.25); g.audio?.energy('explode'); g.hitStop(0.03);
      mult *= 1.25;
      let nx = null, nd = 9;
      for (const e of g.enemies) { if (e.dead || done.has(e) || !e.nails) continue; const d = e.pos.distanceTo(from); if (d < nd) { nd = d; nx = e; } }
      if (!nx) return;
      const to = nx.pos.clone().setY(nx.pos.y + 1);
      for (let s = 0; s <= 1; s += 0.1) g.particles.burst(tmp.lerpVectors(from, to, s), { count: 1, color: ORANGE, speed: 0.4, life: 0.25, size: 0.2, sizeEnd: 0.05, intensity: 4 });
      cur = nx;
      this.after(0.14, step);
    };
    step();
  }
  pin() {
    const g = this.game, p = this.p;
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || !e.nails) continue;
      this.hit(e, (10 + this.rank('resonance') * 3) * e.nails * this.resMul, { stagger: 1, unblockable: true, knock: new THREE.Vector3(), color: '#ffa050' });
      this.stun(e, 1.5); e.nails = Math.max(0, e.nails - 1);
      g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z), { color: ORANGE, r0: 1.6, r1: 0.3, dur: 0.3, thick: 0.25 });
      g.particles.burst(e.pos.clone().setY(e.pos.y + e.height + 0.5), { count: 8, color: 0xd8d8e0, speed: 6, life: 0.3, size: 0.08, shape: 1, dir: new THREE.Vector3(0, -1, 0), spread: 0.2 });
      n++;
    }
    if (!n) { g.toast?.('No nailed curses'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    g.shake(0.3); g.audio?.impact(1.5); g.hitStop(0.05);
  }
  spikes() {
    const g = this.game, p = this.p;
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || !e.nails) continue;
      const c = e.pos.clone().setY(e.pos.y + e.height * 0.5), pow = e.nails;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.fx.slashLine(c, tmp2.set(Math.cos(a), (Math.random() - 0.3) * 0.6, Math.sin(a)), 1.4 + pow * 0.2, 0xd8d8e0, 0.12, 0.25); }
      this.hit(e, (8 + this.rank('resonance') * 3) * pow * this.resMul, { stagger: 0.5, unblockable: true, color: '#ffa050' });
      for (const o of this.foes(c, 2.5 + pow * 0.15)) if (o !== e) { this.hit(o, 9 * pow * this.resMul, { stagger: 0.5, knock: tmp.subVectors(o.pos, c).setY(0).normalize().multiplyScalar(4) }); this.addNail(o, 1); }
      g.fx.hitSpark(c, null, { color: ORANGE, big: true });
      n++;
    }
    if (!n) { g.toast?.('No nailed curses'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true);
    g.shake(0.35); g.audio?.impact(1.4); g.audio?.energy('nail');
  }
  resChain() {
    const g = this.game, p = this.p;
    const list = g.enemies.filter((e) => !e.dead && e.nails);
    if (list.length < 1) { g.toast?.('No nailed curses'); g.audio?.ui('back'); return false; }
    this.cast(0.6, true);
    // chain from you through the nailed curses, nearest first
    const order = [], left = new Set(list); let at = p.pos;
    while (left.size) { let best = null, bd = Infinity; for (const e of left) { const d = e.pos.distanceTo(at); if (d < bd) { bd = d; best = e; } } order.push(best); left.delete(best); at = best.pos; }
    const pts = [p.pos.clone().setY(p.pos.y + 1), ...order.map((e) => e.pos.clone().setY(e.pos.y + e.height * 0.5))];
    const struck = new Set();
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], d = tmp2.subVectors(b, a); const L = d.length(); if (L < 0.1) continue; d.normalize();
      this.after(i * 0.08, () => {
        g.fx.slashLine(a, d, L, ORANGE, 0.3, 0.4); g.fx.slashLine(a, d, L, 0xffffff, 0.1, 0.3);
        this.line(a, d, L, 0.8, (e) => { if (struck.has(e)) return; struck.add(e); this.hit(e, (30 + (e.nails ?? 0) * (10 + this.rank('resonance') * 3)) * this.resMul, { stagger: 0.7, unblockable: true, color: '#ffa050' }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: ORANGE }); });
        g.audio?.energy('slash');
      });
    }
    this.after(0.1, () => { g.shake(0.4); g.hitStop(0.05); });
  }
  severed() {
    const g = this.game, p = this.p;
    let t = null, bs = -1;
    for (const e of g.enemies) { if (e.dead || !e.nails) continue; const sc = e.nails * 100 + (e.isBoss ? 1000 : 0) - e.pos.distanceTo(p.aimPoint); if (sc > bs) { bs = sc; t = e; } }
    if (!t) { g.toast?.('No nailed curses'); g.audio?.ui('back'); return false; }
    p.action = { type: 'cast', both: true, dur: 0.7, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.audio?.charge?.(0.5, 0.5);
    this.after(0.45, () => {
      if (p.action?.lock) p.action = null;
      if (t.dead) return;
      const at = t.pos.clone().setY(t.pos.y + t.height * 0.6);
      this.hit(t, (40 + t.nails * 25 + this.rank('resonance') * 10) * this.resMul * (t.isBoss ? 1.5 : 1), { stagger: 1.2, unblockable: true, crit: false, color: '#ff4040' });
      t.nails = 0;
      g.fx.hitSpark(at, null, { color: 0xff2030, big: true }); g.fx.screenWave(at, 1.1, 0.5); g.fx.flash(0x501000, 0.35, 0.2); g.fx.chroma(1.2);
      g.fx.rings.spawn(tmp.set(t.pos.x, t.pos.y + 0.06, t.pos.z), { color: 0xff3030, r0: 0.4, r1: 4, dur: 0.4, thick: 0.3 });
      g.particles.burst(at, { count: 24, color: 0xb00010, speed: 7, life: 0.6, size: 0.14, gravity: 14, shape: 1 });
      g.hitStop(0.1); g.shake(0.6); g.audio?.impact(2, 'crit');
    });
  }
  whirl() {
    const g = this.game, p = this.p;
    this.pose('spin', 0.5);
    this.after(0.15, () => {
      const R = 3.2;
      for (const e of this.foes(p.pos, R)) { this.hit(e, 24 + this.rank('hammer') * 3, { melee: true, stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(7) }); this.addNail(e, 1); }
      g.fx.slashArc(p.pos, p.facing, ORANGE, R, 1, 0.3); g.fx.shockwave(p.pos, ORANGE, R + 0.5);
      g.shake(0.3); g.audio?.impact(1.3);
    });
    g.audio?.whoosh(1.1);
  }
  quake() {
    const g = this.game, p = this.p;
    this.pose('slam', 0.55);
    const f = this.fwd();
    for (let i = 0; i < 4; i++) this.after(0.22 + i * 0.09, () => {
      const c = p.pos.clone().addScaledVector(f, 1.6 + i * 1.8); c.y = this.groundAt(c.x, c.z, p.pos.y) + 0.2;
      for (const e of this.foes(c, 1.8)) { this.hit(e, 22 + this.rank('hammer') * 3, { melee: true, stagger: 0.6, knock: f.clone().multiplyScalar(5) }); this.addNail(e, 1); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6); }
      g.fx.shockwave(c, ORANGE, 2.2); g.fx.landDust(c, 18); g.combat.hitBlocks(c, f, 1.4, Math.PI, 30, p);
      g.audio?.impact(1.1 + i * 0.1); g.shake(0.2);
    });
  }
  toss() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const f = this.fwd();
    const ham = new THREE.Group();
    const iron = new THREE.MeshStandardNodeMaterial({ color: 0x9a9aa8, metalness: 0.8, roughness: 0.35, emissive: ORANGE, emissiveIntensity: 0.3 }), wood = new THREE.MeshStandardNodeMaterial({ color: 0x6a4a2a, roughness: 0.8 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.25), iron); head.position.y = 0.35; ham.add(head);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), wood); ham.add(handle);
    ham.position.copy(this.handPos()); g.scene.add(ham);
    const hitOut = new Set(), hitBack = new Set();
    const pos = ham.position;
    this.during(1.2, (t, dt) => {
      const out = t < 0.45;
      if (out) pos.addScaledVector(f, 24 * dt * (1 - t / 0.5));
      else { const back = tmp.copy(this.handPos()).sub(pos); const d = back.length(); if (d < 0.8) return false; pos.addScaledVector(back.normalize(), Math.min(d, 26 * dt)); }
      ham.rotation.x += dt * 22;
      for (const e of this.foes(pos, 1.3)) {
        const set = out ? hitOut : hitBack; if (set.has(e)) continue; set.add(e);
        this.hit(e, 18 + this.rank('hammer') * 3, { stagger: 0.5, knock: f.clone().multiplyScalar(out ? 4 : -4) }); this.addNail(e, 1);
        g.fx.hitSpark(pos, null, { color: ORANGE }); g.audio?.impact(1);
      }
    }, () => { g.scene.remove(ham); head.geometry.dispose(); handle.geometry.dispose(); });
    g.audio?.whoosh(1);
  }
  leap() {
    const g = this.game, p = this.p;
    const to = this.aimGround(9), from = p.pos.clone();
    p.invulnerable = true;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.9, windup: 0.3 }, style: 'slam', dur: 0.6, elapsed: 0, t: 0, windup: 0.3, strike: 0.9, struck: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    g.audio?.whoosh(1.2);
    this.during(0.5, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k, y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 3.2;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
    }, () => {
      p.invulnerable = false; p.action = null;
      const c = p.pos.clone().setY(p.pos.y + 0.3);
      for (const e of this.foes(c, 3.2)) { this.hit(e, 30 + this.rank('hammer') * 4, { melee: true, stagger: 0.8, knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(9) }); this.addNail(e, 1); }
      g.fx.shockwave(p.pos, ORANGE, 4); g.fx.landDust(p.pos, 30);
      g.shake(0.45); g.hitStop(0.05); g.audio?.impact(1.6);
    });
  }
  makeSmallDoll() { const d = this.makeDoll(); d.scale.setScalar(0.45); return d; }
  wardDoll() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const doll = this.makeSmallDoll(); g.scene.add(doll);
    let left = 3;
    const place = () => { doll.position.set(p.pos.x + Math.sin(p.facing + 2.4) * 0.9, p.pos.y, p.pos.z + Math.cos(p.facing + 2.4) * 0.9); doll.rotation.y = p.facing; };
    place();
    g.audio?.energy('summon');
    this.buff('ward', 8, {
      incoming: (a, src) => {
        if (left <= 0) return a;
        left--;
        g.fx.hitSpark(doll.position.clone().setY(doll.position.y + 1), null, { color: ORANGE, big: true });
        // the doll answers with a spray of nails at whoever struck
        const dir = src?.pos ? tmp.subVectors(src.pos, p.pos).setY(0).normalize() : this.fwd();
        for (let i = -2; i <= 2; i++) { const a2 = Math.atan2(dir.x, dir.z) + i * 0.15; this.nailShot(new THREE.Vector3(Math.sin(a2), 0, Math.cos(a2)), { from: doll.position.clone().setY(doll.position.y + 1), dmg: 9 }); }
        g.audio?.energy('nail');
        if (left <= 0) this.buffs.get('ward') && (this.buffs.get('ward').left = 0.01);
        return 0;
      },
      onTick: () => { place(); doll.scale.setScalar(0.45 * (0.9 + left * 0.05)); },
      onEnd: () => { g.scene.remove(doll); g.fx.poof(doll.position); },
    });
  }
  selfResonance() {
    const g = this.game, p = this.p;
    const cost = Math.min(p.hp - 1, p.maxHp * 0.1 * this.hpCostMul);
    if (cost > 0) { p.hp -= cost; g.fx.damageNumber(p.pos, cost, { color: '#ff5a6a' }); g.fx.splat(p.pos.clone().setY(p.pos.y + 1.2), 0xa00010); }
    this.cast(0.5, true);
    g.toast?.('Straw Doll: Self-Resonance'); g.fx.flash(0x500008, 0.3, 0.2); g.audio?.impact(1.4, 'crit');
    this.buff('self_res', 8, {
      incoming: (a) => {
        this.after(0.05, () => {
          for (const e of g.enemies) if (!e.dead && e.nails) { this.hit(e, a * 2 * this.resMul + 6 * e.nails, { stagger: 0.6, unblockable: true, crit: false, color: '#ff4040' }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: 0xff2030 }); }
        });
        return a;
      },
      onTick: () => { if (Math.random() < 0.3) for (const e of g.enemies) if (!e.dead && e.nails && Math.random() < 0.3) g.particles.glow.spawn({ x: e.pos.x, y: e.pos.y + e.height * 0.6, z: e.pos.z, vy: 0.8, life: 0.4, r: 1.6, g: 0.05, b: 0.08, size: 0.14, drag: 1, sizeEnd: 0.05, shape: 'square' }); },
    });
  }
  makeDoll() {
    const grp = new THREE.Group();
    const straw = new THREE.MeshStandardNodeMaterial({ color: 0xc8a860, roughness: 0.9 }), rope = new THREE.MeshStandardNodeMaterial({ color: 0x6a4a2a, roughness: 0.9 });
    const blood = new THREE.MeshStandardNodeMaterial({ color: 0x8a0010, roughness: 0.4, emissive: 0x400008, emissiveIntensity: 0.6 }), iron = new THREE.MeshStandardNodeMaterial({ color: 0xd8d8e0, metalness: 0.9, roughness: 0.3, emissive: ORANGE, emissiveIntensity: 0.4 });
    const b = (w, h, d, x, y, z, m, parent = grp) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, y, z); mm.castShadow = true; parent.add(mm); return mm; };
    b(0.9, 1.6, 0.6, 0, 1.6, 0, straw);                         // body
    b(1, 0.15, 0.7, 0, 1.2, 0, rope); b(1, 0.15, 0.7, 0, 2.1, 0, rope);
    b(0.8, 0.8, 0.6, 0, 2.85, 0, straw); b(0.85, 0.12, 0.65, 0, 2.5, 0, rope);   // head + neck tie
    b(2.4, 0.3, 0.3, 0, 2.15, 0, straw);                        // arms
    b(0.3, 1.1, 0.3, -0.25, 0.55, 0, straw); b(0.3, 1.1, 0.3, 0.25, 0.55, 0, straw);   // legs
    b(0.5, 0.5, 0.08, 0.1, 1.85, 0.32, blood);                  // the blood-soaked heart
    const nail = new THREE.Group(); nail.position.set(0.1, 1.85, 1.1); grp.add(nail);
    b(0.08, 0.08, 1.1, 0, 0, 0, iron, nail); b(0.3, 0.3, 0.06, 0, 0, 0.55, iron, nail);
    grp.userData.nail = nail;
    return grp;
  }
  removeDoll() { if (this.doll) { this.game.scene.remove(this.doll); this.doll = null; } }
  endDoll() {
    this.removeDoll();
    this.p.invulnerable = false; this.p.action = null;
    this.game.fx.dimTarget = 0;
  }
  dispose() { super.dispose(); if (this.doll) this.endDoll(); }
}
registerKit('nobara', NobaraKit, NOBARA_SKILLS);
