// Sukuna-style kit — Shrine. 21 abilities on the technique tree; four are
// equipped (RMB takes a basic one) plus F.
//   LMB        claw combo trailing crimson slashes.
//   Dismantle  Dismantle (start, RMB), Barrage, Flurry, Cross, Rising Cut, Web,
//              World-Cutting Slash
//   Cleave     Cleave, Cleave: Lunge, Spiderweb, Cleave: Execution
//   Flame      Divine Flame: Brand, Fuga ("Open"), Divine Flame: Pillar
//   King       Heian Stomp, Cursed Energy Burst, Four-Armed Barrage, Black Flash,
//              RCT: Regeneration, Domain Amplification, Twenty Fingers
//   F          Domain: Malevolent Shrine — an open domain (no barrier): the shrine of
//              mouths and skulls rises and Cleave + Dismantle cut everything in reach.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit } from './index.js';
import { makeOrb } from '../gfx/orbs.js';
import { ditherMask, occlusionAmount } from '../gfx/materials.js';

const CRIMSON = 0xff2a3a, FIRE = 0xff7a2a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

export const SUKUNA_SKILLS = [
  { id: 'dismantle', name: 'Sharper Dismantle', icon: '🔪', desc: 'Longer, stronger cutting waves.', max: 3, req: 'ab:dismantle', branch: 'Dismantle', tier: 1 },
  { id: 'cleave', name: 'Deeper Cleave', icon: '🩸', desc: 'Cleave cuts deeper into tough curses.', max: 3, req: 'ab:cleave', branch: 'Cleave', tier: 2 },
  { id: 'flurry', name: 'Wider Flurry', icon: '🌀', desc: 'More waves in Dismantle Flurry.', max: 2, req: 'dismantle', branch: 'Dismantle', tier: 3 },
  { id: 'fuga', name: 'Divine Flame', icon: '🔥', desc: 'Bigger flame arrow explosion; hotter Brand and Pillar.', max: 3, req: 'ab:flame_brand', branch: 'Flame', tier: 2 },
  { id: 'claws', name: 'King\'s Claws', icon: '🐾', desc: '+8% melee damage per rank.', max: 3, branch: 'King', tier: 0 },
  { id: 'shrine', name: 'Malevolent Shrine', icon: '⛩️', desc: 'Domain slashes faster and lasts longer.', max: 2, req: 'core:unlock_domain', branch: 'Flame', tier: 5 },
  { id: 'rct', name: 'Reverse Cursed Technique', icon: '✚', desc: '+1 Reverse Cursed Technique charge.', max: 1, req: 'core:unlock_rct', branch: 'Core', tier: 4 },
];

class SukunaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 12, range: 2.8, arc: 1.2, lunge: 7, knock: 3, stop: 0.04, shake: 0.14, trail: CRIMSON, sparkColor: 0xff6a6a },
      { style: 'swingL', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 12, range: 2.8, arc: 1.2, lunge: 7, knock: 3, stop: 0.04, shake: 0.14, trail: CRIMSON, sparkColor: 0xff6a6a },
      { style: 'swingR', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 14, range: 3, arc: 1.3, lunge: 7, knock: 4, stop: 0.05, shake: 0.18, trail: CRIMSON, sparkColor: 0xff6a6a },
      { style: 'spin', dur: 0.45, windup: 0.25, strike: 0.55, dmg: 22, range: 3.4, arc: Math.PI, lunge: 3, knock: 9, stop: 0.08, shake: 0.35, ring: true, ringColor: CRIMSON, trail: CRIMSON },
    ];
    this.p.stats.meleeMult += r('claws') * 0.08;
    this.p.healMax += r('rct'); this.p.healCharges = Math.min(this.p.healCharges + r('rct'), this.p.healMax);
    this.branches = ['Dismantle', 'Cleave', 'Flame', 'King'];
    this.cleaveMul = 1;
    this.library = {
      // ---- Dismantle
      dismantle: ability({ name: 'Dismantle', icon: '〰️', kind: 'basic', desc: 'An invisible cutting wave that slices everything in a line — curses, crates, walls and pillars.', cd: 0.75, ce: 0, branch: 'Dismantle', tier: 0, start: true, legacy: 'ranged', use: () => this.dismantle(this.aimAngle()) }),
      dismantle_rain: ability({ name: 'Dismantle: Barrage', icon: '≋', kind: 'basic', desc: 'Three Dismantles in a heartbeat, fanned slightly toward the aim.', cd: 1.6, ce: 3, branch: 'Dismantle', tier: 1, req: 'dismantle', use: () => this.barrage() }),
      flurry: ability({ name: 'Dismantle: Flurry', icon: '🌪️', kind: 'technique', desc: 'A wide fan of cutting waves.', cd: 9, ce: 16, branch: 'Dismantle', tier: 2, legacy: 't2', req: 'dismantle_rain', use: () => this.flurry() }),
      dismantle_cross: ability({ name: 'Dismantle: Cross', icon: '❌', kind: 'basic', desc: 'Two Dismantles cross on the aim point, carving an X through whatever stands there.', cd: 1.2, ce: 0, branch: 'Dismantle', tier: 2, req: 'dismantle', use: () => this.crossCut() }),
      dismantle_rise: ability({ name: 'Dismantle: Rising Cut', icon: '⤴️', kind: 'technique', desc: 'A vertical Dismantle that splits the ground and hurls curses into the air.', cd: 5, ce: 8, branch: 'Dismantle', tier: 3, req: 'dismantle_cross', use: () => this.risingCut() }),
      web: ability({ name: 'Dismantle: Web', icon: '🕸️', kind: 'technique', desc: 'A lattice of Dismantles falls over an area, dicing everything inside it.', cd: 12, ce: 24, branch: 'Dismantle', tier: 4, req: 'flurry', use: () => this.webCut() }),
      world_slash: ability({ name: 'World-Cutting Slash', icon: '🌐', kind: 'technique', desc: 'Dragon scales. Recoil. Twin meteors. A Dismantle that cuts space itself — nothing in its line survives.', cd: 50, ce: 85, branch: 'Dismantle', tier: 5, req: ['web', 'cleave_exec'], use: () => this.worldSlash() }),
      // ---- Cleave
      cleave: ability({ name: 'Cleave', icon: '✖️', kind: 'technique', desc: 'An adaptive X-cut on the curse in front of you, scaled to its toughness.', cd: 6, ce: 12, branch: 'Cleave', tier: 1, legacy: 't1', use: () => this.cleave() }),
      cleave_dash: ability({ name: 'Cleave: Lunge', icon: '⚔️', kind: 'movement', desc: 'Dash through the enemy line, Cleaving every curse you pass.', cd: 6, ce: 10, branch: 'Cleave', tier: 2, req: 'cleave', use: () => this.cleaveDash() }),
      spiderweb: ability({ name: 'Spiderweb', icon: '🕷️', kind: 'technique', desc: 'Strike the ground: Dismantle spreads through it in radial cracks, cutting everything around you.', cd: 10, ce: 18, branch: 'Cleave', tier: 3, req: 'cleave', use: () => this.spiderweb() }),
      cleave_exec: ability({ name: 'Cleave: Execution', icon: '☠️', kind: 'technique', desc: 'Cleave every curse in front of you at once; the weakened are cut in half.', cd: 16, ce: 35, branch: 'Cleave', tier: 4, req: 'cleave_dash', use: () => this.execution() }),
      // ---- Flame
      flame_brand: ability({ name: 'Divine Flame: Brand', icon: '🔥', kind: 'basic', desc: 'Flick an ember that sets a curse alight; it burns, and bursts if it dies burning.', cd: 2, ce: 4, branch: 'Flame', tier: 1, use: () => this.brand() }),
      fuga: ability({ name: 'Fuga', icon: '🏹', kind: 'technique', desc: 'Divine Flame: "Open". A flame bow forms and looses a burning arrow that explodes.', cd: 16, ce: 40, branch: 'Flame', tier: 3, legacy: 't3', req: 'flame_brand', use: () => this.fuga() }),
      fire_pillar: ability({ name: 'Divine Flame: Pillar', icon: '🌋', kind: 'technique', desc: 'Mark a spot; a column of divine fire erupts from it a moment later.', cd: 14, ce: 30, branch: 'Flame', tier: 4, req: 'fuga', use: () => this.firePillar() }),
      // ---- King (body)
      king_stomp: ability({ name: 'Heian Stomp', icon: '🦶', kind: 'technique', desc: 'Stamp the ground hard enough to throw every curse around you off its feet.', cd: 6, ce: 8, branch: 'King', tier: 1, use: () => this.stomp() }),
      ce_burst: ability({ name: 'Cursed Energy Burst', icon: '💢', kind: 'defence', desc: 'Release a wave of raw malice: curses are blown back and their attacks interrupted.', cd: 9, ce: 10, branch: 'King', tier: 2, req: 'king_stomp', use: () => this.ceBurst() }),
      four_arms: ability({ name: 'Four-Armed Barrage', icon: '🤜', kind: 'technique', desc: 'The Heian form\'s four arms pummel everything in front of you, then a finishing blow.', cd: 10, ce: 18, branch: 'King', tier: 3, req: 'king_stomp', use: () => this.fourArms() }),
      black_flash: ability({ name: 'Black Flash', icon: '⚡', kind: 'technique', desc: 'Close in and land a guaranteed Black Flash.', cd: 14, ce: 18, branch: 'King', tier: 3, req: 'ce_burst', use: () => this.blackFlashStrike(46) }),
      rct_regen: ability({ name: 'RCT: Regeneration', icon: '💗', kind: 'heal', desc: 'Reverse Cursed Technique regrows the damage: heal 40% over 3s.', cd: 35, ce: 30, branch: 'King', tier: 3, req: 'ce_burst', use: () => this.rctHeal(0.4, 3, 0xff9a9a) }),
      domain_amp: ability({ name: 'Domain Amplification', icon: '🛡️', kind: 'defence', desc: 'For 6s, a thin domain coats you: half damage taken and +20% melee damage.', cd: 22, ce: 20, branch: 'King', tier: 4, req: 'black_flash', use: () => this.domainAmp() }),
      twenty_fingers: ability({ name: 'Twenty Fingers', icon: '☝️', kind: 'buff', desc: 'The full power of the King of Curses for 10s: +30% damage and faster Cursed Energy.', cd: 40, ce: 30, branch: 'King', tier: 5, req: 'domain_amp', use: () => this.fingers() }),
    };
    this.passives = {
      king: passive({ name: 'King of Curses', icon: '👑', desc: '+15% damage while below half health.', branch: 'King', tier: 2, req: 'king_stomp', apply: (pl, k) => { k.kingBonus = 0; } }),
      calibration: passive({ name: 'Cleave Calibration', icon: '📐', desc: 'Cleave abilities adapt harder: +50% to their toughness-scaled damage.', branch: 'Cleave', tier: 3, req: 'cleave_dash', apply: (pl, k) => { k.cleaveMul = 1.5; } }),
      heian: passive({ name: 'Heian Era Body', icon: '🗿', desc: '+30 max health and 8% damage reduction.', branch: 'King', tier: 4, req: 'four_arms', apply: (pl) => { pl.maxHp += 30; pl.hp += 30; pl.stats.armor = Math.min(0.7, pl.stats.armor + 0.08); } }),
      malice: passive({ name: 'Malevolence', icon: '😈', desc: 'Every kill restores 5 Cursed Energy.', branch: 'Dismantle', tier: 3, req: 'flurry', apply: (pl, k) => { k.malice = true; } }),
    };
    // Malevolent Shrine is an OPEN domain: no barrier closes the sky — the
    // shrine simply manifests, and everything within its (vast) reach is cut
    // by Dismantle and Cleave without pause. Cleave adapts to each target's
    // toughness; Dismantle carves the scenery.
    this.domain = {
      name: 'Malevolent Shrine', icon: '⛩️', key: 'malevolent_shrine', type: 2, color: 0xff3a2a, sound: 'shrine', flash: 0xff2020,
      duration: 8 + r('shrine') * 1.5, radius: 28,
      onStart: (g, d) => {
        g.domainSys.dome.visible = false;   // no barrier: the real sky stays
        this.shrineProp(g, d);
        g.toast?.('No barrier — a domain without walls');
      },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt;
        if (d.tick > 0) return;
        d.tick = 0.24 - r('shrine') * 0.03;
        d.n = (d.n ?? 0) + 1;
        let shown = 0;
        for (const e of g.enemies) {
          if (e.dead || e.isDummy || !g.domainSys.inside(e.pos)) continue;
          // Cleave: one slash tuned to the target's toughness; Dismantle: the constant default cut
          const cleave = Math.min(e.maxHp * 0.022, 30);
          g.combat.damageEnemy(e, 5 + cleave, this.p, { stagger: 0.12, ceGain: 0, unblockable: true, crit: false, color: '#ff6a6a' });
          if (shown++ < 8) {
            const at = e.pos.clone().setY(e.pos.y + e.height * (0.3 + Math.random() * 0.6));
            const ang = Math.random() * Math.PI * 2;
            if (d.n % 3 === 0) g.fx.slashX(at, 1.6 + e.height * 0.4, 0xffffff);
            else g.fx.slashLine(at.clone().add(new THREE.Vector3(Math.cos(ang) * 1.4, (Math.random() - 0.5), Math.sin(ang) * 1.4)), new THREE.Vector3(-Math.cos(ang), (Math.random() - 0.5) * 0.6, -Math.sin(ang)), 2.8, 0xffffff, 0.12, 0.12, Math.random() * 3);
          }
        }
        // Dismantle: the ground and scenery are carved up too
        for (let k = 0; k < 2; k++) {
          const ang = Math.random() * Math.PI * 2, r0 = Math.random() * d.radius;
          const at = d.center.clone().add(new THREE.Vector3(Math.cos(ang) * r0, 0.3, Math.sin(ang) * r0));
          g.fx.slashLine(at, new THREE.Vector3(Math.cos(ang + 1.5), 0, Math.sin(ang + 1.5)), 3.5, 0xff4a4a, 0.08, 0.15);
          g.combat.hitBlocks(at, tmp.set(0, 0, 1), 1.2, Math.PI, 40, this.p);
        }
        if (Math.random() < 0.4) g.audio?.energy('slash');
      },
      onEnd: () => this.removeShrine(),
    };
  }
  removeShrine() { if (this.shrine) { this.game.scene.remove(this.shrine); this.shrine = null; } }
  dispose() { super.dispose(); this.removeShrine(); }
  // The shrine: a temple of dark wood on a mound of skulls, its front a giant
  // fanged mouth, smaller mouths on the pillars, an ox skull on the roof.
  shrineProp(g, d) {
    this.removeShrine();
    const grp = new THREE.Group();
    const mk = (o) => { const m = new THREE.MeshStandardNodeMaterial(o); m.maskNode = ditherMask(occlusionAmount()); return m; };
    const wood = mk({ color: 0x2a0808, roughness: 0.6 }), roof = mk({ color: 0x140404, roughness: 0.5 }), bone = mk({ color: 0xe8dcc0, roughness: 0.8 });
    const mouth = mk({ color: 0x080000, emissive: 0x801008, emissiveIntensity: 0.8 }), lip = mk({ color: 0x7a0a10, roughness: 0.4 }), eye = mk({ color: 0x050000 });
    const b = (w, h, dd, x, y, z, m, parent = grp, rz = 0) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); mm.position.set(x, y, z); mm.rotation.z = rz; mm.castShadow = true; parent.add(mm); return mm; };
    const skull = (x, y, z, s = 0.7, horns = false) => {
      const k = new THREE.Group(); k.position.set(x, y, z); k.rotation.y = (Math.random() - 0.5) * 0.8; grp.add(k);
      b(s, s * 0.85, s, 0, 0, 0, bone, k); b(s * 0.62, s * 0.3, s * 0.7, 0, -s * 0.5, s * 0.12, bone, k);
      b(s * 0.22, s * 0.2, 0.05, -s * 0.2, s * 0.08, s * 0.5, eye, k); b(s * 0.22, s * 0.2, 0.05, s * 0.2, s * 0.08, s * 0.5, eye, k);
      if (horns) { b(s * 1.1, s * 0.16, s * 0.16, -s * 0.85, s * 0.45, 0, bone, k, 0.5); b(s * 1.1, s * 0.16, s * 0.16, s * 0.85, s * 0.45, 0, bone, k, -0.5); }
    };
    // mound of skulls the shrine stands on
    for (let i = 0; i < 46; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * 6; skull(Math.cos(a) * rr * 1.2, Math.random() * 0.9 * (1 - rr / 7), Math.sin(a) * rr * 0.8 + 1, 0.5 + Math.random() * 0.5, Math.random() < 0.15); }
    b(9, 1, 5, 0, 1, 0, wood);
    // pillars, each with a small mouth
    for (const x of [-3.6, -1.6, 1.6, 3.6]) {
      b(0.7, 6.5, 0.7, x, 4.5, 1.6, wood);
      b(0.5, 0.4, 0.1, x, 4.6, 1.98, mouth); b(0.62, 0.1, 0.12, x, 4.85, 1.98, lip); b(0.62, 0.1, 0.12, x, 4.35, 1.98, lip);
    }
    b(8, 6.2, 3, 0, 4.6, -0.4, wood);
    // the great mouth: lips, black maw and two rows of fangs; the jaw works
    b(4.6, 2.8, 0.2, 0, 3.6, 1.12, mouth);
    b(5, 0.35, 0.4, 0, 5.1, 1.2, lip);
    const jaw = new THREE.Group(); jaw.position.set(0, 2.2, 1.2); grp.add(jaw);
    b(5, 0.35, 0.4, 0, 0, 0, lip, jaw);
    for (let i = 0; i < 9; i++) {
      const x = -2 + i * 0.5;
      b(0.26, 0.6, 0.18, x, 4.65, 1.26, bone);
      b(0.26, 0.55, 0.18, x, 0.42, 0.06, bone, jaw);
    }
    // three-tier roof with upturned eaves
    const tiers = [[10.5, 7.9, 4.6], [8.4, 8.8, 3.8], [6, 9.6, 3]];
    for (const [w, y, dd] of tiers) {
      b(w, 0.45, dd, 0, y, 0.1, roof);
      b(1.4, 0.3, dd, -w / 2 - 0.4, y + 0.25, 0.1, roof, grp, 0.35);
      b(1.4, 0.3, dd, w / 2 + 0.4, y + 0.25, 0.1, roof, grp, -0.35);
    }
    skull(0, 10.4, 0.6, 1.1, true);
    // stand it across the arena, away from the camera, facing the caster
    const cam = this.game.rig.camera.position;
    const away = new THREE.Vector3(d.center.x - cam.x, 0, d.center.z - cam.z).normalize();
    grp.position.copy(d.center).addScaledVector(away, 11);
    grp.rotation.y = Math.atan2(-away.x, -away.z);
    grp.scale.setScalar(0.01);
    g.scene.add(grp); this.shrine = grp;
    let t = 0;
    g.addUpdater((dt) => {
      if (this.shrine !== grp) return false;
      t += dt;
      grp.scale.setScalar(Math.min(1, t * 1.6));
      jaw.position.y = 2.2 - Math.max(0, Math.sin(t * 3)) * 0.7;
      return true;
    });
  }
  dismantle(angle, len = 11) {
    const g = this.game, p = this.p;
    if (!this.flurrying) this.cast(0.25);
    const L = len + this.rank('dismantle') * 2;
    const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const from = p.pos.clone().setY(p.pos.y + 1.1).addScaledVector(dir, 0.6);
    // visual: a fast pale slash line + a thin crimson wake
    g.fx.slashLine(from, dir, L, 0xffffff, 0.5, 0.16, Math.random() * 0.4 - 0.2);
    g.fx.slashLine(from.clone().setY(from.y - 0.05), dir, L * 0.9, CRIMSON, 0.25, 0.3);
    const dmg = 13 + this.rank('dismantle') * 5;
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, p.pos); const along = tmp.dot(dir);
      if (along < 0 || along > L) continue;
      const lat = Math.abs(tmp.x * dir.z - tmp.z * dir.x);
      if (lat > 0.9 + e.radius) continue;
      g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().multiplyScalar(2), stagger: 0.25 });
      g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), dir, { color: CRIMSON });
    }
    // cut scenery along the line
    for (let s = 1; s < L; s += 1) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(p.pos.y), dir, 0.8, Math.PI, 18, p);
    g.audio?.energy('slash');
  }
  cleave() {
    const g = this.game, p = this.p;
    let t = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    if (!t) { let bd = 7; for (const e of g.enemies) { if (e.dead) continue; tmp.subVectors(e.pos, p.pos).setY(0); const d = tmp.length(); if (d < bd && tmp.normalize().dot(p.aimDir) > 0.3) { bd = d; t = e; } } }
    if (!t) t = g.nearestEnemy(p.pos, 5);
    if (!t) { g.audio?.ui('back'); return false; }
    this.cast(0.35);
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    const at = t.pos.clone().setY(t.pos.y + t.height * 0.55);
    const adaptive = this.adaptive(t, 0.12 + this.rank('cleave') * 0.03, 180);
    g.fx.slashX(at, 2.6 + t.height * 0.4, 0xffffff);
    this.after(0.12, () => {
      g.combat.damageEnemy(t, 26 + adaptive, p, { stagger: 0.9, unblockable: true, knock: new THREE.Vector3() });
      g.fx.slashX(at, 3 + t.height * 0.5, CRIMSON);
      g.fx.hitSpark(at, null, { color: CRIMSON, big: true });
      g.hitStop(0.08); g.shake(0.35); g.fx.chroma(0.6);
      g.audio?.energy('slash'); g.audio?.impact(1.6);
    });
  }
  flurry() {
    const base = Math.atan2(this.p.aimDir.x, this.p.aimDir.z);
    const n = 5 + this.rank('flurry') * 2;
    this.cast(0.5, true);
    this.flurrying = true;
    for (let i = 0; i < n; i++) this.after(i * 0.055, () => { this.dismantle(base + (i / (n - 1) - 0.5) * 1.3, 9); if (i === n - 1) this.flurrying = false; });
  }
  fuga() {
    const g = this.game, p = this.p;
    const rk = this.rank('fuga');
    p.action = { type: 'cast', both: true, dur: 1.05, elapsed: 0, t: 0, moveScale: 0.15, lock: true, hold: true, cancelable: false, faceAim: true };
    g.audio?.energy('fire');
    const bow = makeOrb(FIRE, { radius: 0.3, coreColor: 0xffe0a0 });
    g.scene.add(bow);
    const light = g.lights.attach(bow, FIRE, 8, 9, { offsetY: 0, priority: 5 });
    g.fx.dimTarget = 0.3;
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
      bow.position.copy(this.handPos());
      bow.scale.setScalar(0.3 + t * 0.6);
      for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2; g.particles.glow.emit(bow.position.x + Math.cos(a) * 1.4, bow.position.y + (Math.random() - 0.5), bow.position.z + Math.sin(a) * 1.4, -Math.cos(a) * 4, 0.5, -Math.sin(a) * 4, 0.35, 3, 1.3, 0.3, 0.16, 0, 2, 0.2, 0); }
      if (t < 0.95) return true;
      g.scene.remove(bow); g.lights.remove(light);
      g.fx.dimTarget = 0;
      p.action = null;
      const from = this.handPos();
      const self = this;
      g.projectiles.fire({ pos: from, vel: p.aimDir.clone().multiplyScalar(34), team: 'player', shape: 'arrow', color: FIRE, emissive: 5, life: 0.9, radius: 0.8, scale: 1.4, light: 10,
        trail: (q) => g.particles.burst(q.pos, { count: 4, color: FIRE, speed: 2, life: 0.5, size: 0.5, sizeEnd: 1.5, intensity: 3 }),
        onExpire: (q) => {
          const R = 5 + rk;
          g.fx.explosion(q.pos, FIRE, R);
          g.combat.aoe(q.pos, R, 70 + rk * 25, p, { knock: 14, stagger: 1, falloff: true });
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.hazards.add({ pos: q.pos.clone().add(new THREE.Vector3(Math.cos(a) * R * 0.5, 0, Math.sin(a) * R * 0.5)), radius: 1.6, dps: 20, dur: 4, color: FIRE, team: 'player', src: p }); }
          g.fx.screenWave(q.pos, 1.3, 0.6); g.fx.flash(0xff8a3a, 0.45, 0.25); g.fx.chroma(1.2);
          g.shake(0.8); g.hitStop(0.08);
          g.audio?.energy('explode');
        } });
      g.audio?.whoosh(1.5);
      return false;
    });
  }
  // ============================================================== new abilities
  adaptive(e, frac, cap) { return Math.min(e.maxHp * frac * this.cleaveMul, cap * this.cleaveMul); }
  barrage() {
    const base = this.aimAngle();
    this.cast(0.35); this.flurrying = true;
    for (let i = 0; i < 3; i++) this.after(i * 0.07, () => { this.dismantle(base + (i - 1) * 0.09, 10); if (i === 2) this.flurrying = false; });
  }
  crossCut() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const c = this.aimGround(10).setY(0); c.y = this.groundAt(c.x, c.z, p.pos.y) + 1;
    g.fx.slashX(c, 3.4, 0xffffff);
    this.after(0.08, () => {
      g.fx.slashX(c, 3.8, CRIMSON);
      for (const e of this.foes(c, 2.6)) { this.hit(e, 26 + this.rank('dismantle') * 4, { stagger: 0.5, knock: new THREE.Vector3() }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: CRIMSON }); }
      g.combat.hitBlocks(c.clone().setY(c.y - 1), tmp.set(0, 0, 1), 2.4, Math.PI, 30, p);
      g.audio?.energy('slash');
    });
  }
  risingCut() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const f = this.fwd(), from = p.pos.clone().setY(p.pos.y + 0.2);
    const L = 10;
    for (let s = 0.8; s < L; s += 0.9) this.after(s * 0.012, () => { const at = from.clone().addScaledVector(f, s); g.fx.slashLine(at, tmp.set(0, 1, 0), 2.6, s % 2 < 1 ? 0xffffff : CRIMSON, 0.3, 0.2); g.particles.burst(at, { count: 3, color: 0x6a5a4a, additive: false, speed: 3, up: 2, life: 0.5, size: 0.2, gravity: 12 }); });
    this.line(p.pos, f, L, 1.2, (e) => {
      this.hit(e, 32 + this.rank('dismantle') * 5, { stagger: 0.8, knock: f.clone().multiplyScalar(2) });
      if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 13);
    });
    for (let s = 1; s < L; s += 1) g.combat.hitBlocks(from.clone().addScaledVector(f, s), f, 0.8, Math.PI, 30, p);
    g.shake(0.35); g.audio?.energy('slash'); g.audio?.impact(1.2);
  }
  webCut() {
    const g = this.game, p = this.p;
    this.cast(0.55, true);
    const c = this.aimGround(12), H = 4;
    c.y += 0.6;
    g.fx.rings.spawn(tmp.set(c.x, c.y - 0.5, c.z), { color: CRIMSON, r0: H * 1.3, r1: H * 1.4, dur: 0.6, thick: 0.1 });
    for (let wave = 0; wave < 3; wave++) this.after(0.12 + wave * 0.16, () => {
      for (let i = -2; i <= 2; i++) {
        const o = i * H * 0.4;
        g.fx.slashLine(tmp.set(c.x - H, c.y + wave * 0.3, c.z + o), tmp2.set(1, 0, 0), H * 2, wave % 2 ? CRIMSON : 0xffffff, 0.2, 0.18);
        g.fx.slashLine(tmp.set(c.x + o, c.y + wave * 0.3, c.z - H), tmp2.set(0, 0, 1), H * 2, wave % 2 ? 0xffffff : CRIMSON, 0.2, 0.18);
      }
      for (const e of g.enemies) {
        if (e.dead || e.untargetable || Math.abs(e.pos.x - c.x) > H + e.radius || Math.abs(e.pos.z - c.z) > H + e.radius || Math.abs(e.pos.y - c.y) > 4) continue;
        this.hit(e, 18 + this.rank('dismantle') * 4, { stagger: 0.4, knock: new THREE.Vector3(), crit: wave === 2 ? undefined : false });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + e.height * 0.6), null, { color: CRIMSON });
      }
      g.combat.hitBlocks(c.clone().setY(c.y - 0.6), tmp2.set(0, 0, 1), H, Math.PI, 30, p);
      g.audio?.energy('slash'); g.shake(0.2);
    });
  }
  worldSlash() {
    const g = this.game, p = this.p;
    const words = ['Dragon Scale.', 'Recoil.', 'Twin Meteors.'];
    p.action = { type: 'cast', both: true, dur: 1.6, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    p.invulnerable = true; g.fx.dimTarget = 0.6;
    words.forEach((w, i) => this.after(i * 0.4, () => { g.toast?.(w, 'domain'); g.audio?.tone?.({ freq: 180 + i * 60, to: 120, dur: 0.3, gain: 0.12, type: 'sawtooth', filter: 1200 }); g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0xffffff, r0: 3, r1: 0.4, dur: 0.35, thick: 0.08 }); }));
    this.during(1.3, () => { p.facing = this.aimAngle(); if (Math.random() < 0.5) g.particles.burst(this.handPos(), { count: 2, color: 0xffffff, speed: 2, life: 0.3, size: 0.1, shape: 1 }); }, () => {
      const f = this.fwd(), from = p.pos.clone().setY(p.pos.y + 1.1);
      const L = 42;
      g.fx.slashLine(from.clone().addScaledVector(f, -2), f, L + 2, 0xffffff, 1.6, 0.6);
      g.fx.slashLine(from.clone().addScaledVector(f, -2), f, L + 2, 0x000000, 0.4, 0.8);
      g.fx.slashLine(from.clone().setY(from.y + 0.3), f, L, CRIMSON, 0.7, 0.5);
      g.fx.flash(0xffffff, 0.9, 0.35); g.fx.chroma(2.2); g.fx.screenWave(from.clone().addScaledVector(f, 8), 1.8, 0.8);
      g.lights.flash(from.clone().addScaledVector(f, 10), 0xffffff, 30, 30, 0.6, { priority: 9 });
      g.shake(1.1); g.hitStop(0.12); g.slowMo(0.4, 0.3);
      this.line(p.pos, f, L, 1.6, (e) => {
        this.hit(e, 320, { stagger: 1.2, unblockable: true, crit: false, knock: f.clone().multiplyScalar(4) });
        g.fx.slashX(e.pos.clone().setY(e.pos.y + e.height * 0.5), 3 + e.height * 0.5, 0xffffff);
        g.particles.burst(e.pos.clone().setY(e.pos.y + 1), { count: 20, color: 0xa00010, speed: 8, life: 0.6, size: 0.14, gravity: 14, shape: 1 });
      });
      for (let s = 1; s < L; s += 0.8) g.combat.hitBlocks(from.clone().addScaledVector(f, s).setY(p.pos.y), f, 1.4, Math.PI, 500, p);
      g.audio?.blackFlash(); g.audio?.energy('slash');
      this.after(0.4, () => { p.invulnerable = false; g.fx.dimTarget = 0; if (p.action?.lock) p.action = null; });
    });
  }
  cleaveDash() {
    const g = this.game, p = this.p;
    g.audio?.whoosh(1.2);
    this.dash(this.fwd(), 8, 0.22, { hitR: 1.8, color: CRIMSON, onHit: (e) => {
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
      g.fx.slashX(at, 2 + e.height * 0.4, 0xffffff);
      this.after(0.1, () => {
        this.hit(e, 20 + this.adaptive(e, 0.1, 90), { stagger: 0.7, unblockable: true, knock: new THREE.Vector3() });
        g.fx.slashX(at, 2.4 + e.height * 0.4, CRIMSON); g.audio?.energy('slash'); g.hitStop(0.03);
      });
    } });
  }
  spiderweb() {
    const g = this.game, p = this.p;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.5, windup: 0.3 }, style: 'slam', dur: 0.5, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0 };
    this.after(0.22, () => {
      const c = p.pos.clone().setY(p.pos.y + 0.12), R = 7.5;
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + Math.random() * 0.2, dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        g.fx.slashLine(c, dir, R * (0.7 + Math.random() * 0.3), i % 2 ? CRIMSON : 0xffffff, 0.35, 0.4, Math.PI / 2);
        for (let s = 1.5; s < R; s += 1.5) g.particles.burst(c.clone().addScaledVector(dir, s), { count: 3, color: 0x5a4a3a, additive: false, speed: 2.5, up: 3, life: 0.6, size: 0.25, gravity: 12 });
      }
      for (let r0 = 2; r0 <= R; r0 += 2.5) g.fx.darkRings.spawn(tmp.set(c.x, c.y, c.z), { color: 0, r0: r0 - 0.3, r1: r0, dur: 0.6, thick: 0.08 });
      for (const e of this.foes(c, R)) { this.hit(e, 34 + this.adaptive(e, 0.05, 40), { stagger: 0.9, knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(5) }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6); }
      g.combat.hitBlocks(c, tmp.set(0, 0, 1), R, Math.PI, 40, p);
      g.fx.shockwave(c, CRIMSON, R + 1); g.fx.screenWave(c, 0.9, 0.45);
      g.shake(0.6); g.hitStop(0.06); g.audio?.impact(1.7); g.audio?.energy('slash');
    });
  }
  execution() {
    const g = this.game, p = this.p;
    this.cast(0.6, true);
    const f = this.fwd();
    const list = this.foes(p.pos, 7, f, 0.7);
    if (!list.length) { g.toast?.('No curse in front of you'); g.audio?.ui('back'); return false; }
    for (const e of list) {
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
      g.fx.slashX(at, 2.4 + e.height * 0.5, 0xffffff);
      this.after(0.18, () => {
        const low = e.hp < e.maxHp * 0.35;
        this.hit(e, (30 + this.adaptive(e, 0.18, 220)) * (low ? 2 : 1), { stagger: 1, unblockable: true, knock: new THREE.Vector3(), crit: false });
        g.fx.slashX(at, 3 + e.height * 0.5, CRIMSON);
        g.fx.slashLine(at.clone().add(tmp.set(-1.6, 0, 0)), tmp2.set(1, 0, 0), 3.2, 0xffffff, 0.15, 0.2);
        g.particles.burst(at, { count: 14, color: 0xa00010, speed: 6, life: 0.5, size: 0.12, gravity: 14, shape: 1 });
      });
    }
    this.after(0.18, () => { g.hitStop(0.1); g.shake(0.55); g.fx.chroma(1); g.audio?.energy('slash'); g.audio?.impact(1.8); });
  }
  brand() {
    const g = this.game, p = this.p;
    this.cast(0.26);
    const pr = this.shoot({ speed: 26, color: FIRE, emissive: 5, scale: 1.2, life: 0.8, radius: 0.45, light: 4, homing: 3, target: this.target(14),
      trail: (q) => g.particles.burst(q.pos, { count: 2, color: FIRE, speed: 0.8, life: 0.3, size: 0.3, sizeEnd: 0.6, intensity: 3 }),
      onHit: (e) => {
        this.hit(e, 12, { stagger: 0.25 });
        let tick = 0;
        this.during(5, (t, dt) => {
          if (e.dead) {
            this.blast(e.pos.clone().setY(e.pos.y + 0.6), 3, 30, { color: FIRE, knock: 8 });
            return false;
          }
          if (Math.random() < 0.6) g.particles.burst(tmp.set(e.pos.x, e.pos.y + e.height * Math.random(), e.pos.z), { count: 1, color: FIRE, speed: 1, up: 2, life: 0.4, size: 0.3, sizeEnd: 0.7, intensity: 3 });
          tick -= dt; if (tick > 0) return;
          tick = 0.5; this.hit(e, 7 + this.rank('fuga') * 2, { stagger: 0, crit: false, ceGain: 0.5, color: '#ff9a4a' });
        });
      } });
    if (!pr) return false;
    g.audio?.energy('fire');
  }
  firePillar() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    const c = this.aimGround(12), R = 3.4;
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: FIRE, r0: R, r1: R + 0.1, dur: 0.65, thick: 0.2 });
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: 0xffd080, r0: 0.2, r1: R, dur: 0.65, thick: 0.1 });
    this.during(0.6, () => { if (Math.random() < 0.8) g.particles.burst(tmp.set(c.x + (Math.random() - 0.5) * R, c.y + 0.2, c.z + (Math.random() - 0.5) * R), { count: 1, color: FIRE, speed: 1, up: 3, life: 0.4, size: 0.3, sizeEnd: 0.1 }); }, () => {
      g.combat.aoe(c.clone().setY(c.y + 1), R, 95 + this.rank('fuga') * 20, p, { knock: 10, stagger: 1, falloff: true });
      for (const e of this.foes(c, R)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 12);
      const light = g.lights.flash(c.clone().setY(c.y + 3), FIRE, 26, 18, 1.4, { priority: 8 });
      this.during(1.2, (t) => {
        for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R * 0.8 * (1 - t * 0.5); g.particles.glow.emit(c.x + Math.cos(a) * rr, c.y + Math.random() * 1.5, c.z + Math.sin(a) * rr, Math.cos(a) * 0.5, 9 + Math.random() * 8, Math.sin(a) * 0.5, 0.7, 3.5, 1.2, 0.3, 0.5, -2, 1, 1.4, 0); }
      }, () => g.lights.remove?.(light));
      g.hazards.add({ pos: c.clone(), radius: R * 0.8, dps: 22, dur: 4, color: FIRE, team: 'player', src: p });
      g.fx.explosion(c.clone().setY(c.y + 1), FIRE, R); g.fx.shockwave(c, FIRE, R + 1.5); g.fx.screenWave(c, 1, 0.5);
      g.shake(0.6); g.hitStop(0.06); g.audio?.energy('fire'); g.audio?.energy('explode');
    });
  }
  stomp() {
    const g = this.game, p = this.p;
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.5, windup: 0.3 }, style: 'slam', dur: 0.45, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0.1 };
    this.after(0.18, () => {
      const R = 4.2;
      g.combat.aoe(p.pos, R, 32, p, { melee: true, knock: 12, stagger: 0.8, falloff: true });
      for (const e of this.foes(p.pos, R)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
      g.fx.shockwave(p.pos, CRIMSON, R + 1); g.fx.landDust(p.pos, 30);
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0xffffff, r0: 0.4, r1: R, dur: 0.3, thick: 0.25 });
      g.debris.burst(p.pos.clone().setY(p.pos.y + 0.3), 7, 6, 0.8);
      g.shake(0.5); g.hitStop(0.05); g.audio?.impact(1.6);
    });
  }
  ceBurst() {
    const g = this.game, p = this.p;
    this.cast(0.35, true);
    const R = 5.5;
    p.iframes = Math.max(p.iframes, 0.4);
    for (const e of this.foes(p.pos, R)) { e.cancelAttack?.(); this.hit(e, 18, { knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(e.isBoss ? 4 : 18), stagger: 0.9 }); }
    for (const pr of g.projectiles.list) if (pr.team === 'enemy' && pr.pos.distanceTo(p.pos) < R) g.projectiles.kill(pr, 'clear');
    g.fx.explosion(p.pos.clone().setY(p.pos.y + 1), CRIMSON, 3); g.fx.shockwave(p.pos, 0x400008, R + 1);
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 40, color: 0x200004, additive: false, speed: 9, up: 0.3, life: 0.6, size: 0.5, sizeEnd: 1.8, drag: 3 });
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 0.8, 0.4); g.shake(0.4); g.audio?.impact(1.3);
  }
  fourArms() {
    const g = this.game, p = this.p;
    const styles = ['punch', 'swingL', 'swingR', 'punch'];
    let i = 0, next = 0;
    p.invulnerable = true;
    this.during(0.95, (t) => {
      p.facing = this.aimAngle();
      if (t < next) return true;
      next += 0.08;
      const st = styles[i % 4];
      this.pose(st, 0.1);
      const f = this.fwd();
      const at = p.pos.clone().addScaledVector(f, 1.8).setY(p.pos.y + 1 + (Math.random() - 0.5) * 0.6).add(tmp.set((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2));
      g.fx.hitSpark(at, f, { color: i % 2 ? CRIMSON : 0xffd0d0 });
      for (const e of this.foes(p.pos, 3.4, f, 0.8)) this.hit(e, 8, { melee: true, stagger: 0.25, knock: f.clone().multiplyScalar(0.6), crit: i % 4 === 0 ? undefined : false });
      if (i % 2 === 0) g.audio?.impact(0.7);
      i++;
    }, () => {
      p.invulnerable = false;
      this.pose('slam', 0.4);
      const f = this.fwd(), c = p.pos.clone().addScaledVector(f, 2);
      for (const e of this.foes(p.pos, 3.8, f, 0.9)) this.hit(e, 34, { melee: true, stagger: 1, knock: f.clone().multiplyScalar(14) });
      g.fx.shockwave(c, CRIMSON, 4); g.fx.slashArc(p.pos, p.facing, CRIMSON, 3.8, 0.9, 0.25);
      g.shake(0.5); g.hitStop(0.07); g.audio?.impact(1.7);
    });
  }
  domainAmp() {
    const g = this.game, p = this.p;
    g.toast?.('Domain Amplification'); g.audio?.energy('shrine');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0xff3a2a, r0: 2.2, r1: 0.4, dur: 0.4, thick: 0.2 });
    const before = p.weaponPierce;
    this.statBuff('domain_amp', 6, { meleeMult: 0.2 }, {
      incoming: (a) => a * 0.5,
      onStart: () => { p.weaponPierce = true; },
      onEnd: () => { p.weaponPierce = before; },
      onTick: () => { if (Math.random() < 0.5) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 1.1, p.pos.y + Math.random() * 1.9, p.pos.z + (Math.random() - 0.5) * 1.1, 0, 0.6, 0, 0.5, 1.6, 0.2, 0.2, 0.12, 0, 1, 0.05, 1); },
    });
  }
  fingers() {
    const g = this.game, p = this.p;
    g.toast?.('Twenty fingers — the King returns', 'domain');
    g.fx.flash(0xff2020, 0.35, 0.25); g.fx.chroma(1); g.audio?.charge?.(0.6, 0.5); g.shake(0.4);
    this.statBuff('fingers', 10, { techMult: 0.3, meleeMult: 0.3 }, {
      onTick: (dt) => {
        p.ce = Math.min(p.maxCe, p.ce + 4 * dt);
        if (Math.random() < 0.7) { const a = Math.random() * Math.PI * 2; g.particles.glow.emit(p.pos.x + Math.cos(a) * 0.4, p.pos.y + 0.1, p.pos.z + Math.sin(a) * 0.4, Math.cos(a) * 0.3, 2 + Math.random() * 2, Math.sin(a) * 0.3, 0.6, 2.4, 0.2, 0.25, 0.2, -1, 1.5, 0.1, 0); }
      },
    });
  }
  // hooks for passives
  tick(dt) {
    if (this.kingBonus != null) {
      const want = this.p.hp < this.p.maxHp * 0.5 ? 0.15 : 0;
      if (want !== this.kingBonus) { const d = want - this.kingBonus; this.p.stats.techMult += d; this.p.stats.meleeMult += d; this.kingBonus = want; }
    }
  }
  onKill() { if (this.malice) this.p.gainCE(5); }
}
registerKit('sukuna', SukunaKit, SUKUNA_SKILLS);
