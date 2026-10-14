// Higuruma-style kit — Judgeman / Deadly Sentencing.
//   LMB  gavel combo; with the Executioner's Sword every hit is followed by a
//        golden cut that ignores guards.
//   RMB  Gavel Strike: the gavel swells to giant size and slams the aim point.
//   1    Judgeman: the shikigami floats at your shoulder and gathers Evidence
//        on curses (golden beams); Evidence makes verdicts harsher.
//   2    Confiscation: a GUILTY verdict on the curses in front — they are bound
//        (stunned) and their techniques confiscated (silenced).
//   3    Executioner's Sword: a giant glowing blade drops on the aim point and
//        Higuruma wields the sword for a few seconds.
//   F    Domain: Deadly Sentencing — the courtroom tries every curse inside.
//        GUILTY curses are confiscated (stunned + silenced) and the strongest
//        guilty one is executed by the Executioner's Sword, which Higuruma then
//        keeps for a while.
import * as THREE from 'three/webgpu';
import { Kit } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const GOLD = 0xffd060, BLADE = 0xfff0b0, INK = 0x14141a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('higuruma', {
  name: 'Higuruma', technique: 'Judgeman', rarity: 'legendary', title: 'The Judge', color: '#ffd060',
  desc: 'A lawyer with a giant gavel: Judgeman gathers evidence, GUILTY verdicts confiscate curses\' techniques and the Executioner\'s Sword carries out the death penalty.',
  domain: 'Deadly Sentencing',
});

registerLook('higuruma', {
  paint: { skinTone: 0xe8c4a4, hair: 0x16141a, hairVolume: true, top: 0x2a2b32, collar: 0xe8e8ec, topTrim: 0x5a1a22, buttons: 0x5a1a22, sleeve: 0x2a2b32, pants: 0x2a2b32, shoes: 0x0c0c0e, eye: 0x2a2018, fringe: 2, hairSide: 4, hairBack: 6 },
  hair: (m) => [
    { x: -2.2, y: 8, z: 1, w: 3.5, h: 2.5, d: 4, rx: 0.3, rz: 0.5, material: m },
    { x: 2.2, y: 8, z: 1, w: 3.5, h: 2.5, d: 4, rx: 0.3, rz: -0.5, material: m },
    { x: 0, y: 8.3, z: -1, w: 6, h: 2, d: 5, rx: -0.3, material: m },
    { x: 0, y: 6, z: -4, w: 6, h: 3, d: 2, rx: -1.0, material: m },
  ],
  hairColor: 0x16141a, accent: GOLD, emit: 0.2, cape: null,
  paintExtra(S) {
    for (const x of [9, 10, 11, 12, 13, 14]) S.px(x, 15, 0x9a8070);   // stubble
    S.px(8, 14, 0x9a8070); S.px(15, 14, 0x9a8070);
    S.px(9, 13, 0xb89a88); S.px(14, 13, 0xb89a88);                     // tired eye bags
  },
  props(rig, K) {
    const wood = K.mat(0x4a2a18, { roughness: 0.55 }), band = K.mat(GOLD, { metalness: 0.9, roughness: 0.3, emissive: 0.3 });
    const gavel = new THREE.Group();
    K.box(gavel, 1.2, 11, 1.2, wood, 0, -2, 0);
    K.box(gavel, 5, 2.6, 2.6, wood, 0, -8, 0);
    K.box(gavel, 0.6, 2.8, 2.8, band, -1.6, -8, 0); K.box(gavel, 0.6, 2.8, 2.8, band, 1.6, -8, 0);
    gavel.rotation.x = Math.PI / 2; gavel.position.z = 3 * K.PX;
    rig.handR.add(gavel); rig.extras.weapon = gavel;
    // the Executioner's Sword: hidden until confiscation grants it
    const sword = new THREE.Group();
    const steel = K.mat(BLADE, { metalness: 0.6, roughness: 0.2, emissive: 1.6 });
    K.box(sword, 1.2, 4, 1.2, K.mat(0x1a1410), 0, 1, 0);
    K.box(sword, 6, 1, 1.6, band, 0, -1.2, 0);
    K.box(sword, 3, 24, 0.6, steel, 0, -14, 0);
    sword.rotation.x = Math.PI / 2; sword.position.z = 2 * K.PX; sword.visible = false;
    rig.handR.add(sword); rig.extras.sword = sword;
    K.box(rig.torso, 1.2, 1.2, 0.5, band, 2.2, 9.5, 2.3);   // sunflower lawyer badge
  },
});

registerDomainEnv('deadly_sentencing', {
  skyTop: 0x060402, skyHorizon: 0x3a2a10, fog: 0x140c04, fogDensity: 0.02, hemiSky: 0xffd8a0, hemiGround: 0x100804, hemiI: 0.85, sun: 0xffe0a0, sunI: 1.2,
  grade: { tint: [1.06, 1.0, 0.88], lift: [0.01, 0.008, 0.0], sat: 0.85, contrast: 1.22, vignette: 0.55 }, floor: B.polished,
});

export const HIGURUMA_SKILLS = [
  { id: 'gavel', name: 'Heavy Gavel', desc: '+8% melee damage per rank and a bigger Gavel Strike.', max: 3 },
  { id: 'evidence', name: 'Evidence', desc: 'Judgeman gathers evidence faster and stays longer.', max: 3 },
  { id: 'verdict', name: 'Verdict', desc: 'Confiscation judges one more curse and binds longer.', max: 2 },
  { id: 'sword', name: 'Executioner\'s Sword', desc: 'The sword lasts 2s longer and cuts deeper.', max: 3 },
  { id: 'court', name: 'Courtroom', desc: 'Trials come faster and verdicts lean GUILTY.', max: 2, req: 'evidence' },
];

let mats = null;
const M = () => mats || (mats = {
  robe: new THREE.MeshStandardNodeMaterial({ color: INK, roughness: 0.9 }),
  mask: new THREE.MeshStandardNodeMaterial({ color: 0xe8e4d8, roughness: 0.6 }),
  eye: new THREE.MeshStandardNodeMaterial({ color: 0x000000, emissive: GOLD, emissiveIntensity: 2.5 }),
  gold: new THREE.MeshStandardNodeMaterial({ color: GOLD, metalness: 0.9, roughness: 0.25, emissive: GOLD, emissiveIntensity: 0.5 }),
  wood: new THREE.MeshStandardNodeMaterial({ color: 0x4a2a18, roughness: 0.55 }),
  blade: new THREE.MeshStandardNodeMaterial({ color: BLADE, metalness: 0.5, roughness: 0.2, emissive: BLADE, emissiveIntensity: 2.4 }),
});
function bx(parent, w, h, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
// Judgeman: a hooded shikigami with a blank mask and the scales of justice.
function makeJudgeman(s = 1) {
  const m = M(), g = new THREE.Group();
  bx(g, 0.9, 1.6, 0.6, 0, 0.8, 0, m.robe); bx(g, 1.2, 0.5, 0.8, 0, 0.1, 0, m.robe);
  bx(g, 0.62, 0.66, 0.6, 0, 1.95, 0, m.robe); bx(g, 0.44, 0.48, 0.1, 0, 1.92, 0.3, m.mask);
  bx(g, 0.3, 0.05, 0.02, 0, 1.98, 0.36, m.eye); bx(g, 0.04, 0.12, 0.02, 0, 1.8, 0.36, m.robe);
  bx(g, 0.06, 0.9, 0.06, 0.65, 1.5, 0.2, m.gold); bx(g, 0.9, 0.05, 0.05, 0.65, 1.95, 0.2, m.gold);
  bx(g, 0.3, 0.04, 0.3, 0.22, 1.7, 0.2, m.gold); bx(g, 0.3, 0.04, 0.3, 1.08, 1.7, 0.2, m.gold);
  g.scale.setScalar(s);
  return g;
}

class HigurumaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 14, range: 2.8, arc: 1.2, lunge: 5, knock: 5, stop: 0.055, shake: 0.2, trail: GOLD, sparkColor: 0xffe0a0 },
      { style: 'swingL', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 14, range: 2.8, arc: 1.2, lunge: 5, knock: 5, stop: 0.055, shake: 0.2, trail: GOLD, sparkColor: 0xffe0a0 },
      { style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 15, range: 3, arc: 0.8, lunge: 7, knock: 6, stop: 0.06, shake: 0.2, trail: GOLD, sparkColor: 0xffe0a0 },
      { style: 'slam', dur: 0.62, windup: 0.46, strike: 0.62, dmg: 32, range: 3.4, arc: Math.PI, lunge: 3, knock: 12, stop: 0.11, shake: 0.5, ring: true, ringColor: GOLD, stagger: 0.7, trail: GOLD },
    ];
    this.p.stats.meleeMult += r('gavel') * 0.08;
    this.slots = {
      ranged: this.ability({ name: 'Gavel Strike', icon: '🔨', cd: 1.5, ce: 0, use: () => this.gavelStrike() }),
      t1: this.ability({ name: 'Judgeman', icon: '⚖️', cd: 14, ce: 14, use: () => this.summonJudgeman() }),
      t2: this.ability({ name: 'Confiscation', icon: '🔒', cd: 9, ce: 18, use: () => this.confiscation() }),
      t3: this.ability({ name: 'Executioner\'s Sword', icon: '🗡️', cd: 20, ce: 35, use: () => this.executioner() }),
    };
    this.swordT = 0;
    this.domain = {
      name: 'Deadly Sentencing', icon: '⚖️', key: 'deadly_sentencing', type: 3, color: GOLD, sound: 'void', flash: 0xfff0c0,
      duration: 9, radius: 24,
      onStart: (g, d) => {
        d.trial = 1; d.trials = 0;
        const court = new THREE.Group();
        bx(court, 7, 1.6, 1.6, 0, 0.8, 0, M().wood); bx(court, 7.4, 0.2, 2, 0, 1.7, 0, M().gold);
        const jm = makeJudgeman(2.4); jm.position.set(0, 1.8, -0.6); court.add(jm);
        const cam = g.rig.camera.position, away = new THREE.Vector3(d.center.x - cam.x, 0, d.center.z - cam.z).normalize();
        court.position.copy(d.center).addScaledVector(away, 8); court.rotation.y = Math.atan2(-away.x, -away.z);
        g.scene.add(court); this.court = court;
        g.audio?.gong();
      },
      onTick: (g, d, dt) => {
        if (this.court) this.court.children[this.court.children.length - 1].position.y = 1.8 + Math.sin(g.time * 2) * 0.15;
        d.trial -= dt;
        if (d.trial > 0) return;
        d.trial = 3.2 - r('court') * 0.5;
        this.trial(g, d, ++d.trials);
      },
      onEnd: (g) => { if (this.court) { g.scene.remove(this.court); this.court = null; } },
    };
  }
  // ------------------------------------------------------------ verdicts
  verdictText(e, text, color) { this.game.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height * 0.4), 0, { text, color, crit: true }); }
  confiscate(e, dmg, bind) {
    const g = this.game, p = this.p;
    const ev = e.evidence ?? 0;
    if (e.isBoss) { e.slowT = Math.max(e.slowT ?? 0, bind + 1); } else e.sealT = Math.max(e.sealT ?? 0, bind + ev * 0.4);
    e.cancelAttack?.(); e.cd = Math.max(e.cd ?? 0, 0) + 3 + ev * 0.5;   // techniques confiscated: no attacks for a while
    g.combat.damageEnemy(e, dmg + ev * 10, p, { stagger: 0.8, unblockable: true, color: '#ffd060' });
    e.evidence = 0;
    this.verdictText(e, 'GUILTY', '#ffd060');
    const at = tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z);
    g.fx.rings.spawn(at, { color: GOLD, r0: 2, r1: 0.4, dur: 0.4, thick: 0.25 });
    g.fx.summonCircle(e.pos, GOLD);
    g.particles.burst(tmp.set(e.pos.x, e.pos.y + e.height + 0.4, e.pos.z), { count: 14, color: GOLD, speed: 2, life: 0.6, size: 0.12, shape: 1 });
  }
  trial(g, d, n) {
    const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
    if (!list.length) return;
    g.toast?.(n === 1 ? '⚖️ The court is in session' : '⚖️ Verdict', 'big');
    g.audio?.gong();
    let worst = null;
    for (const e of list) {
      const guilty = Math.random() < 0.8 + this.rank('court') * 0.07 + (e.evidence ?? 0) * 0.05;
      if (!guilty) { this.verdictText(e, 'NOT GUILTY', '#c8c8d8'); continue; }
      this.confiscate(e, 10, 2.6);
      if (!worst || e.hp > worst.hp) worst = e;
    }
    if (!worst) return;
    // the death penalty for the gravest offender
    setTimeout(() => {
      if (worst.dead) return;
      g.toast?.('GUILTY — DEATH PENALTY', 'domain');
      this.dropSword(worst.pos.clone(), 1.6, (at) => {
        if (!worst.dead) g.combat.damageEnemy(worst, 160 + Math.min(worst.maxHp * 0.3, 320), this.p, { stagger: 1.2, unblockable: true, crit: true, color: '#fff0b0' });
        g.combat.aoe(at, 3, 30, this.p, { knock: 8, stagger: 0.6 });
        this.grantSword(10);
      });
    }, 700);
  }
  // ------------------------------------------------------------ the sword
  grantSword(dur) {
    const fresh = this.swordT <= 0;
    this.swordT = Math.max(this.swordT, dur + this.rank('sword') * 2);
    const x = this.p.rig.extras;
    if (x.sword) { x.sword.visible = true; if (x.weapon) x.weapon.visible = false; }
    if (fresh) { this.game.toast?.('Executioner\'s Sword granted'); this.game.audio?.energy('infinity'); }
  }
  dropSword(at, s, onLand) {
    const g = this.game, m = M();
    const gy = g.world.groundBelow(at.x, at.z, at.y + 3); const floor = isFinite(gy) ? gy : at.y;
    const sw = new THREE.Group();
    bx(sw, 0.5 * s, 6 * s, 0.12 * s, 0, 0, 0, m.blade);
    bx(sw, 1.8 * s, 0.25 * s, 0.35 * s, 0, 3.1 * s, 0, m.gold);
    bx(sw, 0.22 * s, 1.4 * s, 0.22 * s, 0, 3.9 * s, 0, m.wood);
    sw.position.set(at.x, floor + 14, at.z); sw.rotation.y = Math.random() * Math.PI;
    g.scene.add(sw);
    const light = g.lights.attach(sw, BLADE, 10, 12, { offsetY: 0, priority: 6 });
    g.fx.rings.spawn(tmp2.set(at.x, floor + 0.08, at.z), { color: GOLD, r0: 3.5 * s, r1: 0.5, dur: 0.45, thick: 0.1 });
    g.fx.dimTarget = 0.35;
    let t = 0, landed = false;
    g.addUpdater((dt) => {
      t += dt;
      if (!landed) {
        sw.position.y = Math.max(floor + 3 * s - 0.4, sw.position.y - dt * 55);
        g.particles.burst(sw.position, { count: 3, color: BLADE, speed: 1, life: 0.3, size: 0.4, sizeEnd: 0.1 });
        if (sw.position.y <= floor + 3 * s - 0.4) {
          landed = true;
          const c = new THREE.Vector3(at.x, floor, at.z);
          g.fx.slashLine(c.clone().setY(floor + 6 * s), new THREE.Vector3(0, -1, 0), 7 * s, 0xffffff, 0.8, 0.3);
          g.fx.explosion(c, GOLD, 2.5 * s);
          g.fx.screenWave(c.clone().setY(floor + 1), 1.2, 0.5); g.fx.flash(0xfff0c0, 0.5, 0.25); g.fx.chroma(1);
          g.shake(0.7); g.hitStop(0.1);
          g.audio?.blackFlash(); g.audio?.energy('slash');
          g.fx.dimTarget = 0;
          onLand(c);
        }
        return true;
      }
      if (t > 1.2) sw.scale.setScalar(Math.max(0.01, 1 - (t - 1.2) * 4));
      if (t > 1.45) { g.scene.remove(sw); g.lights.remove(light); return false; }
      return true;
    });
  }
  onMeleeHit(e, step, dealt) {
    if (this.swordT <= 0 || e.dead) return;
    const g = this.game, p = this.p;
    const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
    g.combat.damageEnemy(e, step.dmg * (1.4 + this.rank('sword') * 0.2), p, { melee: true, unblockable: true, stagger: 0.4, color: '#fff0b0' });
    g.fx.slashLine(at.clone().add(new THREE.Vector3(-1.2, 1, 0)), new THREE.Vector3(1, -0.8, Math.random() - 0.5).normalize(), 2.8, BLADE, 0.45, 0.2, Math.random());
    g.fx.hitSpark(at, null, { color: BLADE, big: true });
  }
  tick(dt) {
    const g = this.game, p = this.p;
    if (this.swordT > 0) {
      this.swordT -= dt;
      if (Math.random() < 0.5) { const h = this.handPos(tmp); g.particles.glow.emit(h.x + (Math.random() - 0.5) * 0.6, h.y + (Math.random() - 0.5) * 0.6, h.z + (Math.random() - 0.5) * 0.6, 0, 0.6, 0, 0.4, 3, 2.6, 1.4, 0.1, 0, 1, 0.2, 1); }
      if (this.swordT <= 0) { const x = p.rig.extras; if (x.sword) x.sword.visible = false; if (x.weapon) x.weapon.visible = true; }
    }
    // Judgeman hovers at your shoulder, gathering evidence
    const j = this.judgeman;
    if (j) {
      j.t -= dt; j.fire -= dt;
      const side = tmp.set(Math.cos(p.facing), 0, -Math.sin(p.facing));
      j.mesh.position.set(p.pos.x + side.x * 1.4 - Math.sin(p.facing) * 0.8, p.pos.y + 0.9 + Math.sin(g.time * 3) * 0.12, p.pos.z + side.z * 1.4 - Math.cos(p.facing) * 0.8);
      j.mesh.rotation.y = p.facing;
      if (j.fire <= 0) {
        j.fire = 1.5 - this.rank('evidence') * 0.25;
        const e = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : g.nearestEnemy(p.pos, 12);
        if (e) {
          const from = j.mesh.position.clone().setY(j.mesh.position.y + 1.9);
          const to = e.pos.clone().setY(e.pos.y + e.height * 0.6);
          const dir = tmp2.subVectors(to, from); const len = dir.length();
          g.fx.slashLine(from, dir.normalize(), len, GOLD, 0.25, 0.25);
          e.evidence = Math.min(5, (e.evidence ?? 0) + 1);
          g.combat.damageEnemy(e, 8, p, { stagger: 0.15, color: '#ffd060' });
          this.verdictText(e, `EVIDENCE ×${e.evidence}`, '#ffe8a0');
          g.audio?.tone({ freq: 520, to: 780, dur: 0.12, gain: 0.06, type: 'triangle', rev: 0.3 });
        }
      }
      if (j.t <= 0) this.dismissJudgeman();
    }
    if (Math.random() < 0.2) for (const e of g.enemies) if (!e.dead && e.evidence && Math.random() < 0.3) g.particles.glow.emit(e.pos.x, e.pos.y + e.height + 0.3, e.pos.z, 0, 0.4, 0, 0.5, 2.4, 1.9, 0.6, 0.08 + e.evidence * 0.02, 0, 1, 1, 1);
  }
  // ------------------------------------------------------------ techniques
  gavelStrike() {
    const g = this.game, p = this.p, rk = this.rank('gavel');
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const at = sure ? sure.pos.clone() : p.aimPoint.clone();
    tmp.subVectors(at, p.pos).setY(0); if (!sure && tmp.length() > 8) at.copy(p.pos).addScaledVector(tmp.normalize(), 8);
    const gy = g.world.groundBelow(at.x, at.z, p.pos.y + 3); at.y = isFinite(gy) ? gy : p.pos.y;
    this.p.action = { type: 'attack', step: { style: 'slam', strike: 0.5, windup: 0.35 }, style: 'slam', dur: 0.45, elapsed: 0, t: 0, windup: 0.35, strike: 0.5, struck: true, moveScale: 0.3 };
    p.facing = Math.atan2(at.x - p.pos.x, at.z - p.pos.z);
    const s = 1 + rk * 0.15, m = M();
    const gv = new THREE.Group(), arm = new THREE.Group(); gv.add(arm);
    bx(arm, 0.3 * s, 3.2 * s, 0.3 * s, 0, 1.6 * s, 0, m.wood);
    bx(arm, 1.9 * s, 1 * s, 1 * s, 0, 3.4 * s, 0, m.wood);
    bx(arm, 0.2 * s, 1.1 * s, 1.1 * s, -0.6 * s, 3.4 * s, 0, m.gold); bx(arm, 0.2 * s, 1.1 * s, 1.1 * s, 0.6 * s, 3.4 * s, 0, m.gold);
    // pivot behind the target so the head swings down onto it
    const back = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
    gv.position.copy(at).addScaledVector(back, -3.4 * s); gv.rotation.y = p.facing;
    arm.rotation.x = -0.9;
    g.scene.add(gv);
    let t = 0, hit = false;
    g.addUpdater((dt) => {
      t += dt;
      arm.rotation.x = -0.9 + Math.min(1, Math.max(0, (t - 0.12) / 0.14)) * (0.9 + Math.PI / 2);
      if (!hit && t >= 0.26) {
        hit = true;
        g.combat.aoe(at, 2.2 + rk * 0.3, 20 + rk * 6, p, { knock: 6, stagger: 0.6 });
        g.fx.shockwave(at, GOLD, 3 + rk * 0.4); g.fx.debris(at.clone().setY(at.y + 0.3), 0x8a7a6a, 4);
        g.shake(0.3); g.hitStop(0.04); g.audio?.impact(1.5);
      }
      if (t > 0.6) gv.scale.setScalar(Math.max(0.01, 1 - (t - 0.6) * 5));
      if (t > 0.8) { g.scene.remove(gv); return false; }
      return true;
    });
    g.audio?.whoosh(1);
  }
  summonJudgeman() {
    const g = this.game, p = this.p;
    this.dismissJudgeman();
    this.cast(0.45, true);
    const mesh = makeJudgeman(1);
    g.scene.add(mesh);
    this.judgeman = { mesh, t: 12 + this.rank('evidence') * 3, fire: 0.4 };
    g.fx.summonCircle(p.pos, GOLD); g.fx.blinkPuff(p.pos, GOLD);
    g.audio?.energy('summon');
    g.toast?.('⚖️ Judgeman');
  }
  dismissJudgeman() {
    if (!this.judgeman) return;
    this.game.fx.blinkPuff(this.judgeman.mesh.position, GOLD);
    this.game.scene.remove(this.judgeman.mesh); this.judgeman = null;
  }
  confiscation() {
    const g = this.game, p = this.p;
    const n = 1 + this.rank('verdict');
    let list = g.domainSys?.sureHit(p) ? g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos)) : g.combat.query(p.pos, p.aimDir, 9, 0.7);
    if (!list.length) { const e = g.nearestEnemy(p.pos, 6); if (e) list = [e]; }
    if (!list.length) { g.toast?.('No defendant in range'); g.audio?.ui('back'); return false; }
    list.sort((a, b) => (b.evidence ?? 0) - (a.evidence ?? 0) || a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos));
    this.cast(0.5, true, { type: 'raise' });
    g.fx.flash(0x302000, 0.25, 0.15);
    g.audio?.gong();
    for (const e of list.slice(0, n)) this.confiscate(e, 24, 2.4 + this.rank('verdict') * 0.6);
    g.toast?.('GUILTY — CONFISCATION');
    g.shake(0.25); g.hitStop(0.05);
  }
  executioner() {
    const g = this.game, p = this.p;
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const at = sure ? sure.pos.clone() : (g.nearestEnemy(p.aimPoint, 3)?.pos.clone() ?? p.aimPoint.clone());
    tmp.subVectors(at, p.pos).setY(0); if (tmp.length() > 10) at.copy(p.pos).addScaledVector(tmp.normalize(), 10);
    at.y = p.pos.y;
    this.cast(0.6, true, { type: 'raise', lock: true });
    g.audio?.charge(0.5, 0.7);
    const dmg = 90 + this.rank('sword') * 30;
    this.dropSword(at, 1.3, (c) => {
      g.combat.aoe(c, 3.2, dmg, p, { knock: 10, stagger: 1, unblockable: true, falloff: true });
      // the cut carries on as a shockwave line toward the aim
      const dir = tmp.subVectors(c, p.pos).setY(0); if (dir.lengthSq() < 0.01) dir.set(Math.sin(p.facing), 0, Math.cos(p.facing)); dir.normalize();
      g.fx.slashLine(c.clone().setY(c.y + 0.4).addScaledVector(dir, -3), dir.clone(), 8, BLADE, 0.6, 0.3);
      for (const e of g.combat.query(c, dir, 6, 0.35)) g.combat.damageEnemy(e, dmg * 0.4, p, { stagger: 0.5, knock: dir.clone().multiplyScalar(6) });
      this.grantSword(6);
    });
  }
  dispose() { super.dispose(); this.dismissJudgeman(); if (this.court) { this.game.scene.remove(this.court); this.court = null; } }
}
registerKit('higuruma', HigurumaKit, HIGURUMA_SKILLS);
