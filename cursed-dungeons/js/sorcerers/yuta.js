// Yuta-style kit — Copy / Queen of Curses Rika. 21 abilities on the
// technique tree; four are equipped (RMB takes a basic one) plus F.
//   LMB            five-cut katana combo wreathed in cursed energy.
//   Katana         Cursed Slash (start, RMB), Iaido Draw, Infused Flurry,
//                  Cursed Energy Edge
//   Copy           Copy: Cursed Speech ("Don't move."), "Crush.", "Get twisted.",
//                  Copy: Granite Blast (Ishigori), Copy: Thin Ice Breaker (Uro's
//                  Sky Manipulation), Copy: Hollow Purple (Limitless, from Shinjuku)
//   Rika           Rika, Rika: Grab, Rika: Shriek, Rika: Guard, Rika's Arsenal,
//                  Rika: Full Manifestation
//   Love           Reverse Cursed Technique, Ring of Vows, Pure Love
//   Special Grade  Special Grade Step, Overwhelming Cursed Energy
//   F              Domain: Authentic Mutual Love — an ashen field of katanas, each
//                  holding a copied technique. Every beat Yuta draws one and its
//                  technique lands as a sure hit (Cursed Speech, Rika's smash, a katana
//                  cut, or Reverse Cursed Technique healing), with Rika manifested.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';
import { beamMaterial, makeOrb } from '../gfx/orbs.js';

const CE = 0x9ad0ff, RIKA = 0xd86aff, LOVE = 0xff8ad8;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('yuta', { name: 'Yuta', technique: 'Copy', rarity: 'special', title: 'Special Grade Sorcerer', desc: 'Katana cuts, copied techniques like Cursed Speech, Rika\'s monstrous arms and the Pure Love beam.', domain: 'Authentic Mutual Love', color: '#d86aff' });

registerLook('yuta', {
  paint: { skinTone: 0xf0d0b8, hair: 0x14151c, hairVolume: true, top: 0xeceef2, collar: 0xdfe2ea, topTrim: 0xc8ccd6, buttons: 0x9aa0b0, sleeve: 0xeceef2, pants: 0xeceef2, shoes: 0x2a2a30, eye: 0x1a1a24, fringe: 3, hairSide: 4, hairBack: 6 },
  paintExtra: (S) => { S.px(9, 13, 0x8a7080); S.px(14, 13, 0x8a7080); S.px(10, 13, 0x8a7080); S.px(13, 13, 0x8a7080); }, // tired eye bags
  hair: (m) => [
    { x: -2.5, y: 7.5, z: 2, w: 3, h: 3.5, d: 3, rx: 0.6, rz: 0.5, material: m },
    { x: 0.5, y: 8, z: 2.5, w: 3, h: 3.5, d: 3, rx: 0.8, rz: -0.1, material: m },
    { x: 2.5, y: 7.5, z: 1.5, w: 3, h: 3, d: 3, rx: 0.5, rz: -0.6, material: m },
    { x: 0, y: 8.5, z: -1, w: 5, h: 3, d: 5, rx: -0.4, material: m },
    { x: -3.2, y: 6, z: -1, w: 2, h: 4, d: 4, rz: 0.5, material: m },
    { x: 3.2, y: 6, z: -1, w: 2, h: 4, d: 4, rz: -0.5, material: m },
  ],
  hairColor: 0x14151c, accent: CE, emit: 0.3, cape: null,
  props(rig, K) {
    const steel = K.mat(0xdfe6f0, { metalness: 0.9, roughness: 0.2, emissive: 0.15, emissiveColor: CE });
    const grip = K.mat(0x1a1a22, { roughness: 0.8 }), guard = K.mat(0x8a7a4a, { metalness: 0.7, roughness: 0.4 });
    const sword = new THREE.Group();
    K.box(sword, 1, 4, 1, grip, 0, -1, 0);
    K.box(sword, 3, 0.6, 3, guard, 0, -3.2, 0);
    K.box(sword, 0.5, 15, 1.2, steel, 0, -11, 0);
    K.box(sword, 0.4, 2, 0.8, steel, 0, -19, 0.2, 0.3);
    sword.rotation.x = Math.PI / 2; sword.position.z = 2 * K.PX;
    rig.handR.add(sword); rig.extras.weapon = sword;
    // sheath slung across the back
    K.box(rig.torso, 1.6, 16, 1.6, K.mat(0x22222a, { roughness: 0.6 }), 0, 6, -3, 0, 0, 0.7);
    // Rika's ring on a chain
    K.box(rig.torso, 1, 1, 0.4, K.mat(0xe8e0ff, { metalness: 1, roughness: 0.2, emissive: 0.6, emissiveColor: RIKA }), 0, 9, 2.2);
  },
});

registerDomainEnv('authentic_mutual_love', {
  skyTop: 0x05030a, skyHorizon: 0x4a2a5a, fog: 0x140a1a, fogDensity: 0.014, hemiSky: 0xd8b0ff, hemiGround: 0x100818, hemiI: 1.1, sun: 0xffd8f0, sunI: 0.8,
  grade: { tint: [1.04, 0.96, 1.1], lift: [0.01, 0.0, 0.02], sat: 1.05, contrast: 1.15, vignette: 0.5 }, floor: B.marble,
});

export const YUTA_SKILLS = [
  { id: 'katana', name: 'Katana Mastery', icon: '⚔️', desc: '+8% melee damage per rank.', max: 3, branch: 'Katana', tier: 0 },
  { id: 'cslash', name: 'Cursed Slash', icon: '🗡️', desc: 'Cursed Slash and katana techniques are bigger and hit harder.', max: 3, req: 'ab:slash', branch: 'Katana', tier: 1 },
  { id: 'speech', name: 'Cursed Speech', icon: '🗣️', desc: '"Don\'t move" holds curses longer and reaches further; every command hits harder.', max: 3, req: 'ab:speech', branch: 'Copy', tier: 2 },
  { id: 'blast_away', name: '"Blast Away"', icon: '💨', desc: 'Copy follows up with a second command that blows curses away.', max: 1, req: 'speech', branch: 'Copy', tier: 3 },
  { id: 'rika', name: 'Rika\'s Love', icon: '💍', desc: 'Rika stays longer and smashes harder.', max: 3, req: 'ab:manifest', branch: 'Rika', tier: 2 },
  { id: 'pure_love', name: 'Pure Love', icon: '💗', desc: 'Wider, stronger Pure Love beam.', max: 2, req: 'ab:pure_love', branch: 'Love', tier: 4 },
];

// Freeze a curse in place (bosses only slow down).
function hold(e, t) {
  if (e.dead) return;
  if (e.isBoss) { e.slowT = Math.max(e.slowT ?? 0, t); return; }
  e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.1;
  e.sealT = Math.max(e.sealT ?? 0, t);
}

class YutaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const cut = { range: 2.9, arc: 1.25, trail: CE, sparkColor: 0xd8f0ff };
    this.combo = [
      { ...cut, style: 'swingR', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 13, lunge: 7, knock: 3, stop: 0.045, shake: 0.15 },
      { ...cut, style: 'swingL', dur: 0.28, windup: 0.28, strike: 0.5, dmg: 13, lunge: 7, knock: 3, stop: 0.045, shake: 0.15 },
      { ...cut, style: 'swingR', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 15, lunge: 7, knock: 4, stop: 0.05, shake: 0.18 },
      { ...cut, style: 'spin', dur: 0.42, windup: 0.25, strike: 0.55, dmg: 18, range: 3.2, arc: Math.PI, lunge: 3, knock: 7, stop: 0.07, shake: 0.26, trail: RIKA },
      { ...cut, style: 'slam', dur: 0.55, windup: 0.42, strike: 0.6, dmg: 30, range: 3.4, arc: Math.PI, lunge: 4, knock: 11, stop: 0.1, shake: 0.45, ring: true, ringColor: RIKA, stagger: 0.6, trail: RIKA },
    ];
    this.p.stats.meleeMult += r('katana') * 0.08;
    this.branches = ['Katana', 'Copy', 'Rika', 'Love', 'Special Grade'];
    this.rikaMul = 1;
    this.library = {
      // ---- Katana
      slash: ability({ name: 'Cursed Slash', icon: '🗡️', kind: 'basic', desc: 'A flying arc of cursed energy off the blade.', cd: 0.9, ce: 0, branch: 'Katana', tier: 0, start: true, legacy: 'ranged', use: () => this.slash() }),
      iai: ability({ name: 'Iaido Draw', icon: '🌙', kind: 'basic', desc: 'Dash through the curses in front of you with one drawn cut.', cd: 1.6, ce: 0, branch: 'Katana', tier: 1, req: 'slash', use: () => this.iaiDraw() }),
      flurry: ability({ name: 'Infused Flurry', icon: '🌀', kind: 'technique', desc: 'Six cursed-energy cuts in front of you, then one wide finishing arc.', cd: 6, ce: 8, branch: 'Katana', tier: 2, req: 'iai', use: () => this.flurry() }),
      cursed_edge: ability({ name: 'Cursed Energy Edge', icon: '✨', kind: 'buff', desc: 'Pour cursed energy into the blade for 10s: +15% melee damage, and your cuts send slashes flying.', cd: 22, ce: 14, branch: 'Katana', tier: 3, req: 'flurry', use: () => this.cursedEdge() }),
      // ---- Copy
      speech: ability({ name: 'Copy: Cursed Speech', icon: '🗣️', kind: 'technique', desc: '"Don\'t move." — every curse around you is held in place.', cd: 8, ce: 14, branch: 'Copy', tier: 1, legacy: 't1', copy: true, use: () => this.speech() }),
      speech_crush: ability({ name: 'Copy: "Crush."', icon: '🫳', kind: 'technique', desc: 'Inumaki\'s command crushes every curse around you into the ground. Strains your throat (4% health).', cd: 10, ce: 18, branch: 'Copy', tier: 2, req: 'speech', copy: true, use: () => this.speechCrush() }),
      speech_twist: ability({ name: 'Copy: "Get Twisted."', icon: '🌪️', kind: 'technique', desc: 'One command wrings the targeted curse apart. Strains your throat (6% health).', cd: 14, ce: 22, branch: 'Copy', tier: 3, req: 'speech_crush', copy: true, use: () => this.speechTwist() }),
      granite: ability({ name: 'Copy: Granite Blast', icon: '☄️', kind: 'technique', desc: 'Ishigori\'s technique: a charged torrent of raw cursed energy that blows up at the end of its flight.', cd: 9, ce: 18, branch: 'Copy', tier: 2, req: 'speech', copy: true, use: () => this.graniteBlast() }),
      thin_ice: ability({ name: 'Copy: Thin Ice Breaker', icon: '🌌', kind: 'technique', desc: 'Uro\'s Sky Manipulation: the sky in front of you folds like a sheet and slams down along a line.', cd: 12, ce: 22, branch: 'Copy', tier: 3, req: 'granite', copy: true, use: () => this.thinIce() }),
      hollow_purple: ability({ name: 'Copy: Hollow Purple', icon: '🟣', kind: 'technique', desc: 'Limitless, as Yuta used it in Shinjuku: Blue and Red collide into an imaginary mass that erases everything in its path.', cd: 30, ce: 60, branch: 'Copy', tier: 4, req: 'thin_ice', copy: true, use: () => this.hollowPurple() }),
      // ---- Rika
      manifest: ability({ name: 'Rika', icon: '💍', kind: 'summon', desc: 'The Queen of Curses manifests behind you for a while and her giant arms smash whatever comes close.', cd: 18, ce: 22, branch: 'Rika', tier: 1, legacy: 't2', use: () => this.manifest() }),
      rika_grab: ability({ name: 'Rika: Grab', icon: '✊', kind: 'technique', desc: 'Rika\'s arm reaches out, seizes a curse, drags it in and slams it down.', cd: 9, ce: 12, branch: 'Rika', tier: 2, req: 'manifest', use: () => this.rikaGrab() }),
      rika_shriek: ability({ name: 'Rika: Shriek', icon: '😱', kind: 'technique', desc: 'Rika screams in a wide cone: curses are blown back and frozen with fear.', cd: 10, ce: 14, branch: 'Rika', tier: 2, req: 'manifest', use: () => this.rikaShriek() }),
      rika_guard: ability({ name: 'Rika: Guard', icon: '🫂', kind: 'defence', desc: 'Rika wraps herself around you for 5s and takes 80% of every hit (up to 120 damage).', cd: 16, ce: 12, branch: 'Rika', tier: 3, req: 'rika_grab', use: () => this.rikaGuard() }),
      rika_arsenal: ability({ name: 'Rika\'s Arsenal', icon: '🗡', kind: 'technique', desc: 'Rika spits out the blades she keeps for Yuta: a rain of katanas over the marked area.', cd: 12, ce: 18, branch: 'Rika', tier: 3, req: 'rika_shriek', use: () => this.rikaArsenal() }),
      full_manifest: ability({ name: 'Rika: Full Manifestation', icon: '👑', kind: 'summon', desc: 'Five minutes of the real Rika — here 15s: she is huge, smashes faster and harder, and feeds you Cursed Energy.', cd: 45, ce: 40, branch: 'Rika', tier: 4, req: 'rika_guard', use: () => this.fullManifest() }),
      // ---- Love
      rct: ability({ name: 'Reverse Cursed Technique', icon: '💚', kind: 'heal', desc: 'Heal 30% of your health; Yuta can output it, so allies nearby heal too.', cd: 20, ce: 20, branch: 'Love', tier: 1, use: () => this.rctOut() }),
      ring_vow: ability({ name: 'Ring of Vows', icon: '💍', kind: 'buff', desc: 'Kiss the ring: restore 30 Cursed Energy over 3s, and Rika (if she is out) stays 5s longer.', cd: 25, ce: 0, branch: 'Love', tier: 2, req: 'rct', use: () => this.ringVow() }),
      pure_love: ability({ name: 'Pure Love', icon: '💗', kind: 'technique', desc: 'Yuta and Rika pour out their love as a colossal beam (stronger with Rika out).', cd: 20, ce: 45, branch: 'Love', tier: 3, legacy: 't3', req: 'rct', use: () => this.pureLove() }),
      // ---- Special Grade
      sg_step: ability({ name: 'Special Grade Step', icon: '👣', kind: 'movement', desc: 'Burst forward on raw cursed energy to the aim point and knock aside whatever is there.', cd: 5, ce: 6, branch: 'Special Grade', tier: 1, use: () => this.sgStep() }),
      ce_overflow: ability({ name: 'Overwhelming Cursed Energy', icon: '🌋', kind: 'defence', desc: 'Let out a fraction of your monstrous cursed energy: a blast throws every curse back and you take 40% less damage for 3s.', cd: 16, ce: 24, branch: 'Special Grade', tier: 3, req: 'sg_step', use: () => this.ceOverflow() }),
    };
    this.passives = {
      rikas_ring: passive({ name: 'Rika\'s Ring', icon: '💍', desc: 'Rika stays manifested 50% longer.', branch: 'Rika', tier: 3, req: 'manifest', apply: (pl, k) => { k.rikaMul *= 1.5; } }),
      copycat: passive({ name: 'Copycat', icon: '🪞', desc: 'Copied techniques cost 25% less Cursed Energy.', branch: 'Copy', tier: 3, req: 'granite', apply: (pl, k) => { for (const a of Object.values(k.library)) if (a.copy) a.ce = Math.round(a.ce * 0.75); } }),
      vast_ce: passive({ name: 'Vast Cursed Energy', icon: '🔋', desc: '+30 max Cursed Energy (Yuta\'s reserves rival Gojo\'s).', branch: 'Special Grade', tier: 2, req: 'sg_step', apply: (pl) => { pl.maxCe += 30; } }),
      pure_oath: passive({ name: 'Oath of Pure Love', icon: '💞', desc: 'When a hit leaves you below 30% health, Rika manifests to protect you (once every 30s).', branch: 'Love', tier: 3, req: 'rct', apply: (pl, k) => { k.pureOath = true; } }),
    };
    // Authentic Mutual Love: an ashen field of countless katanas stuck in the
    // ground, each one holding a technique Yuta has copied. The sure-hit lands
    // through the katanas: every beat Yuta draws a blade and its copied
    // technique strikes every curse inside, with Rika fully manifested.
    this.domain = {
      name: 'Authentic Mutual Love', icon: '⚔️', key: 'authentic_mutual_love', type: 6, color: RIKA, sound: 'void', flash: 0xffd8ff,
      look: { floor: 0x3a3640, seam: 0x8a6ab8, sparkle: 0xe0d0ff, skyTop: 0x06040c, skyHorizon: 0x5a3a6a, stars: 0.5, band: 0xffc8ff },
      duration: 9, radius: 24,
      onStart: (g, d) => { this.swordField(g, d); if (!this.rika) this.manifest(true); else this.rika.life = Math.max(this.rika.life, 10); },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0.3) - dt;
        if (d.tick > 0) return;
        d.tick = 0.9;
        const list = g.enemies.filter((e) => !e.dead && !e.isDummy && g.domainSys.inside(e.pos));
        // a different copied technique each beat, drawn from a katana, all of them sure hits
        const pick = d.beat = ((d.beat ?? -1) + 1) % 4;
        if (!list.length && pick !== 3) return;
        this.drawSword(g, list[0]);
        if (pick === 0) { g.toast?.('Copy: Cursed Speech'); this.speech(list); }
        else if (pick === 1) { g.toast?.('Rika!'); for (const e of list.slice(0, 6)) this.rikaSmash(e.pos.clone(), 0.8); }
        else if (pick === 2) {
          g.toast?.('Katana: Cursed Energy Cut');
          for (const e of list) { const at = e.pos.clone().setY(e.pos.y + e.height * 0.55); g.fx.slashX(at, 2.4, CE); g.combat.damageEnemy(e, 28, this.p, { stagger: 0.4, unblockable: true, ceGain: 0 }); }
          g.audio?.energy('slash');
        } else {
          // Yuta can output Reverse Cursed Technique — he heals himself through the blade
          g.toast?.('Reverse Cursed Technique');
          this.p.heal(this.p.maxHp * 0.15); g.fx.heal?.(this.p.pos, 0x9affd8);
        }
      },
      onEnd: (g) => this.clearSwords(),
    };
    this.beamMats = [beamMaterial(LOVE), beamMaterial(0xffffff, true)];
  }
  dispose() { super.dispose(); if (this.rika) { this.game.scene.remove(this.rika.grp); this.game.lights.remove(this.rika.light); } this.clearSwords(); this.rika = null; }
  // -------------------------------------------------------------- RMB
  slash() {
    const g = this.game, p = this.p, rk = this.rank('cslash');
    p.action = { type: 'attack', step: { style: 'swingR', strike: 0.4, windup: 0.25 }, style: 'swingR', dur: 0.32, elapsed: 0, t: 0, windup: 0.25, strike: 0.4, struck: true, moveScale: 0.4 };
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const target = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const dmg = 15 + rk * 6;
    g.projectiles.fire({ pos: this.handPos(), vel: p.aimDir.clone().multiplyScalar(26), team: 'player', shape: 'slash', color: CE, emissive: 4, life: 0.55, radius: 0.9 + rk * 0.2, scale: 1 + rk * 0.25, pierce: true, light: 3,
      homing: target ? 10 : 0, target,
      trail: (q) => g.particles.burst(q.pos, { count: 2, color: Math.random() < 0.3 ? RIKA : CE, speed: 1, life: 0.25, size: 0.3, sizeEnd: 0.05 }),
      onHit: (e, q) => { g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setLength(3), stagger: 0.3 }); g.fx.hitSpark(q.pos, q.vel.clone().normalize(), { color: CE }); } });
    g.fx.slashArc(p.pos, p.facing, CE, 2.4, 0.5, 0.18);
    g.audio?.energy('slash');
  }
  // -------------------------------------------------------------- Copy: Cursed Speech
  speech(forced = null) {
    const g = this.game, p = this.p, rk = this.rank('speech');
    const R = 8 + rk * 1.5, dur = 1.6 + rk * 0.5;
    const list = forced ?? g.enemies.filter((e) => !e.dead && e.pos.distanceTo(p.pos) < R);
    if (!list.length) { if (!forced) { g.toast?.('No curses in earshot'); g.audio?.ui('back'); } return false; }
    if (!forced) this.cast(0.5, true);
    g.toast?.('「Don\'t move.」');
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.4), 0.8, 0.5);
    for (let i = 0; i < 3; i++) this.after(i * 0.09, () => g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 1.4, p.pos.z), { color: 0xe8e0ff, r0: 0.5, r1: R, dur: 0.5, thick: 0.08 }));
    g.audio?.tone({ freq: 160, to: 90, dur: 0.6, gain: 0.3, type: 'sawtooth', filter: 900, rev: 0.4 });
    g.audio?.noise({ dur: 0.5, gain: 0.3, type: 'bandpass', freq: 300, sweep: 1200, q: 2, rev: 0.3 });
    for (const e of list) {
      hold(e, dur);
      g.combat.damageEnemy(e, 8, p, { stagger: 0, ceGain: 1, unblockable: true, color: '#e8e0ff' });
      g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height), { count: 8, color: 0xe8e0ff, speed: 2, life: 0.6, size: 0.12, shape: 1 });
    }
    g.shake(0.2);
    if (this.rank('blast_away')) this.after(dur * 0.6, () => {
      g.toast?.('「Blast away.」');
      for (const e of list) {
        if (e.dead) continue;
        const k = tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(14);
        if (!e.isBoss) { e.sealT = 0; e.vel.y = Math.max(e.vel.y, 8); }
        g.combat.damageEnemy(e, 26, p, { knock: k, stagger: 0.6, unblockable: true });
      }
      g.fx.shockwave(p.pos, 0xe8e0ff, R); g.fx.screenWave(p.pos, 1, 0.4); g.shake(0.4); g.audio?.impact(1.6);
    });
  }
  // -------------------------------------------------------------- Rika
  buildRika() {
    const grp = new THREE.Group();
    const M = (c, e = 0) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.7, emissive: e ? c : 0x000000, emissiveIntensity: e });
    const body = M(0xe8e4f0), dark = M(0x1a1420), eye = M(0xffffff, 3), mouth = M(0x300818, 0.4);
    const b = (par, w, h, d, x, y, z, m) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, y, z); mm.castShadow = true; par.add(mm); return mm; };
    b(grp, 1.6, 1.8, 1.1, 0, 1.6, 0, body);                         // chest
    b(grp, 1.1, 1.3, 0.9, 0, 0.5, -0.1, dark);                      // trailing body
    const head = new THREE.Group(); head.position.set(0, 2.9, 0.2); grp.add(head);
    b(head, 1.2, 1.1, 1.1, 0, 0, 0, body); b(head, 0.9, 0.35, 0.1, 0, -0.25, 0.56, mouth);
    for (const x of [-0.28, 0.28]) b(head, 0.18, 0.18, 0.05, x, 0.18, 0.57, eye);
    for (let i = 0; i < 5; i++) b(head, 0.4, 0.9, 0.3, -0.6 + i * 0.3, 0.6, -0.3, dark); // wild hair
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 1.0, 2.2, 0); grp.add(sh);
      b(sh, 0.55, 1.6, 0.55, 0, -0.8, 0, body);
      const fore = new THREE.Group(); fore.position.y = -1.6; sh.add(fore);
      b(fore, 0.5, 1.4, 0.5, 0, -0.7, 0, body);
      b(fore, 0.9, 0.7, 0.8, 0, -1.5, 0.1, body);                   // fist
      for (let f = 0; f < 3; f++) b(fore, 0.15, 0.45, 0.15, -0.25 + f * 0.25, -2, 0.35, dark); // claws
      arms.push(sh);
    }
    grp.userData = { head, arms };
    return grp;
  }
  manifest(free = false) {
    const g = this.game, p = this.p, rk = this.rank('rika');
    const life = (free ? 9 : 8 + rk * 2) * this.rikaMul;
    if (this.rika) { this.rika.life = Math.max(this.rika.life, life); return; }
    if (!free) this.cast(0.6, true);
    const grp = this.buildRika(); grp.scale.setScalar(0.01); grp.position.copy(p.pos); g.scene.add(grp);
    const light = g.lights.attach(grp, RIKA, 5, 9, { offsetY: 2, priority: 3 });
    const R = this.rika = { grp, light, life, t: 0, cd: 0.6, swing: 0, side: 0 };
    g.toast?.('Rika!'); g.audio?.energy('summon'); g.audio?.tone({ freq: 70, to: 40, dur: 1.2, gain: 0.4, type: 'sawtooth', filter: 400, rev: 0.6 });
    g.fx.summonCircle(p.pos, RIKA); g.fx.flash(0x200010, 0.3, 0.2); g.shake(0.3);
    g.addUpdater((dt) => {
      R.t += dt; R.life -= dt; R.cd -= dt; R.swing = Math.max(0, R.swing - dt * 2.5);
      const back = tmp.set(-Math.sin(p.facing), 0, -Math.cos(p.facing));
      grp.position.lerp(tmp2.copy(p.pos).addScaledVector(back, this.rikaBoost ? 2.4 : 1.6).setY(p.pos.y + 0.6 + Math.sin(R.t * 2) * 0.15), Math.min(1, dt * 8));
      grp.rotation.y = p.facing;
      grp.scale.setScalar(Math.min(1, R.t * 3) * Math.min(1, Math.max(0, R.life) * 3) * (1.15 + rk * 0.05) * (this.rikaBoost ? 1.3 : 1));
      const [aL, aR] = grp.userData.arms;
      aL.rotation.x = -0.3 - (R.side === 0 ? R.swing * 2.6 : 0) + Math.sin(R.t * 3) * 0.1;
      aR.rotation.x = -0.3 - (R.side === 1 ? R.swing * 2.6 : 0) + Math.cos(R.t * 3) * 0.1;
      if (Math.random() < 0.4) g.particles.glow.emit(grp.position.x + (Math.random() - 0.5) * 1.6, grp.position.y + Math.random() * 3, grp.position.z + (Math.random() - 0.5) * 1.6, 0, 0.8, 0, 0.7, 1.4, 0.6, 1.8, 0.18, -0.4, 1.5, 0.2, 0);
      if (R.cd <= 0) {
        const e = g.nearestEnemy(p.pos, this.rikaBoost ? 10 : 7.5);
        if (e) { R.cd = (1.15 - rk * 0.1) * (this.rikaBoost ? 0.6 : 1); R.swing = 1; R.side ^= 1; this.after(0.14, () => !e.dead && this.rikaSmash(e.pos.clone(), this.rikaBoost ? 1.5 : 1)); }
      }
      if (R.life <= 0) { g.scene.remove(grp); g.lights.remove(light); g.fx.blinkPuff(grp.position, RIKA); this.rika = null; return false; }
      return this.rika === R;
    });
  }
  rikaSmash(at, mult = 1) {
    const g = this.game, rk = this.rank('rika');
    const R = 2.6 + rk * 0.3;
    g.combat.aoe(at, R, (30 + rk * 10) * mult, this.p, { knock: 9, stagger: 0.7, unblockable: true });
    g.fx.shockwave(at, RIKA, R + 1); g.fx.hitSpark(at.clone().setY(at.y + 0.8), null, { color: RIKA, big: true });
    g.fx.debris(at.clone().setY(at.y + 0.3), 0x6a5a6a, 4);
    g.shake(0.35); g.hitStop(0.05); g.audio?.impact(1.8);
  }
  // -------------------------------------------------------------- Pure Love
  swordField(g, d) {
    this.clearSwords();
    const grp = new THREE.Group();
    const steel = new THREE.MeshStandardNodeMaterial({ color: 0xd8e0ec, metalness: 0.9, roughness: 0.25, emissive: 0x6a4a9a, emissiveIntensity: 0.4 });
    const lit = new THREE.MeshStandardNodeMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.2, emissive: RIKA, emissiveIntensity: 4 });
    const hilt = new THREE.MeshStandardNodeMaterial({ color: 0x1a1a22, roughness: 0.8 });
    const wrap = new THREE.MeshStandardNodeMaterial({ color: 0xe8e4f0, roughness: 0.7 });
    const tsuba = new THREE.MeshStandardNodeMaterial({ color: 0x8a7a4a, metalness: 0.7, roughness: 0.4 });
    const G = { blade: new THREE.BoxGeometry(0.07, 1.8, 0.18), tip: new THREE.BoxGeometry(0.06, 0.3, 0.12), guard: new THREE.BoxGeometry(0.34, 0.06, 0.34), grip: new THREE.BoxGeometry(0.09, 0.55, 0.09), band: new THREE.BoxGeometry(0.1, 0.06, 0.1) };
    const list = [];
    for (let i = 0; i < 72; i++) {
      const a = Math.random() * Math.PI * 2, r0 = 2.5 + Math.sqrt(Math.random()) * (d.radius - 3.5);
      const s = new THREE.Group();
      const blade = new THREE.Mesh(G.blade, steel); blade.position.y = 0.5;
      const tip = new THREE.Mesh(G.tip, steel); tip.position.set(0, -0.5, 0.02); tip.rotation.x = 0.3;
      const guard = new THREE.Mesh(G.guard, tsuba); guard.position.y = 1.42;
      const grip = new THREE.Mesh(G.grip, hilt); grip.position.y = 1.72;
      s.add(blade, tip, guard, grip);
      for (const y of [1.58, 1.72, 1.86]) { const b = new THREE.Mesh(G.band, wrap); b.position.y = y; s.add(b); }
      const x = d.center.x + Math.cos(a) * r0, z = d.center.z + Math.sin(a) * r0;
      const gy = g.world.groundBelow(x, z, d.center.y + 3);
      s.position.set(x, (isFinite(gy) ? gy : d.center.y) - 0.3, z);
      s.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5);
      grp.add(s); list.push({ s, blade, baseY: s.position.y });
    }
    grp.userData = { G, steel, lit, list };
    grp.position.y = -2; g.scene.add(grp); this.swords = grp;
    let t = 0; g.addUpdater((dt) => { t += dt; grp.position.y = Math.min(0, -2 + t * 4); return t < 0.6 && this.swords === grp; });
  }
  // Yuta draws a katana from the field: it lifts out of the ground glowing
  // and a streak of cursed energy links it to him.
  drawSword(g, near) {
    const grp = this.swords; if (!grp) return;
    const { list, lit, steel } = grp.userData;
    const ref = near ? near.pos : this.p.pos;
    let best = list[0], bd = Infinity;
    for (const it of list) { if (it.busy) continue; const dd = it.s.position.distanceToSquared(ref) + Math.random() * 20; if (dd < bd) { bd = dd; best = it; } }
    if (!best || best.busy) return;
    best.busy = true; best.blade.material = lit;
    const at = best.s.position.clone().setY(best.baseY + 1.5);
    g.particles.burst(at, { count: 16, color: RIKA, speed: 3, up: 1.5, life: 0.5, size: 0.16, shape: 1 });
    const to = this.p.pos.clone().setY(this.p.pos.y + 1.2), dir = to.clone().sub(at);
    g.fx.slashLine(at, dir.clone().normalize(), dir.length(), RIKA, 0.18, 0.3);
    g.lights.flash(at, RIKA, 6, 7, 0.4);
    g.audio?.tone({ freq: 1800, to: 2400, dur: 0.15, gain: 0.05, type: 'triangle', rev: 0.4 });
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      best.s.position.y = best.baseY + Math.sin(Math.min(1, t / 0.7) * Math.PI) * 1.2;
      if (t < 0.7 && this.swords === grp) return true;
      best.s.position.y = best.baseY; best.blade.material = steel; best.busy = false;
      return false;
    });
  }
  clearSwords() {
    if (!this.swords) return;
    this.game.scene.remove(this.swords);
    for (const geo of Object.values(this.swords.userData.G)) geo.dispose();
    this.swords = null;
  }
  pureLove() {
    const g = this.game, p = this.p, rk = this.rank('pure_love');
    const withRika = !!this.rika;
    const W = 1.6 + rk * 0.4 + (withRika ? 0.4 : 0), L = 32, DMG = (130 + rk * 40) * (withRika ? 1.25 : 1);
    p.action = { type: 'cast', both: true, dur: 1.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    p.invulnerable = true; g.fx.dimTarget = 0.5;
    g.toast?.(withRika ? '「I love you, Rika.」' : 'Pure Love');
    g.audio?.charge(1.1, 0.8);
    const light = g.lights.flash(p.pos.clone().setY(p.pos.y + 1.5), LOVE, 10, 12, 1.2, { priority: 5 });
    let t = 0, beam = null; const CH = 1.05;
    g.addUpdater((dt, realDt) => {
      t += realDt;
      const fwd = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const from = p.pos.clone().addScaledVector(fwd, 1).setY(p.pos.y + 1.35);
      if (!beam) {
        p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
        for (let i = 0; i < 5; i++) { const a = Math.random() * Math.PI * 2, r = 2.5; g.particles.glow.emit(from.x + Math.cos(a) * r, from.y + (Math.random() - 0.5) * 2, from.z + Math.sin(a) * r, -Math.cos(a) * 6, 0, -Math.sin(a) * 6, 0.4, 3, 1.4, 2.6, 0.16, 0, 2, 0.2, 1); }
        if (t < CH) return true;
        g.lights.remove(light);
        beam = this.fireBeam(from, fwd.clone(), W, L, DMG);
        return true;
      }
      const bt = t - CH, a = Math.max(0, 1 - bt / 0.9);
      beam.scale.set(W * (0.4 + a * 0.6) * (1 + Math.sin(bt * 50) * 0.06), 1, W * (0.4 + a * 0.6));
      this.beamMats.forEach((m) => { m.userData.alpha.value = a; });
      if (bt > 0.9) { g.scene.remove(beam); g.fx.dimTarget = 0; p.invulnerable = false; p.action = null; return false; }
      return true;
    });
  }
  fireBeam(from, dir, W, L, DMG) {
    const g = this.game, p = this.p;
    const grp = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, L, 20, 1, true), this.beamMats[0]);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, L, 12, 1, true), this.beamMats[1]);
    for (const m of [outer, inner]) { m.rotation.x = Math.PI / 2; m.position.z = L / 2; m.renderOrder = 24; }
    grp.add(outer, inner); grp.position.copy(from); grp.lookAt(from.clone().add(dir));
    g.scene.add(grp);
    this.beamMats.forEach((m) => { m.userData.alpha.value = 1; });
    g.fx.flash(0xffc0f0, 0.8, 0.3); g.fx.screenWave(from, 1.5, 0.7); g.fx.chroma(1.8);
    g.shake(0.9); g.hitStop(0.1); g.slowMo(0.4, 0.4);
    g.audio?.energy('purple'); g.audio?.blackFlash();
    g.lights.flash(from.clone().addScaledVector(dir, 8), LOVE, 26, 24, 0.9, { priority: 8 });
    for (const e of g.enemies) {
      if (e.dead) continue;
      tmp.subVectors(e.pos, from); const along = tmp.dot(dir);
      if (along < -1 || along > L) continue;
      const perp = tmp.addScaledVector(dir, -along); perp.y = 0;
      if (perp.length() > W + e.radius + 0.4) continue;
      g.combat.damageEnemy(e, DMG, p, { knock: dir.clone().multiplyScalar(12), stagger: 1, unblockable: true });
      g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + 1), { count: 16, color: LOVE, speed: 8, life: 0.5, size: 0.14, drag: 3, shape: 1 });
    }
    for (let s = 1.5; s < L; s += 1.5) {
      g.particles.burst(tmp.copy(from).addScaledVector(dir, s), { count: 4, color: s % 3 < 1.5 ? LOVE : 0xffffff, speed: 5, life: 0.6, size: 0.3, drag: 2, sizeEnd: 0.1 });
      g.combat.hitBlocks(tmp.copy(from).addScaledVector(dir, s).setY(p.pos.y + 0.5), dir, W, Math.PI, 60, p);
    }
    return grp;
  }
  // ============================================================== new abilities
  incoming(a) {
    const p = this.p, g = this.game;
    if (this.pureOath && !this.rika && p.hp - a < p.maxHp * 0.3 && g.time > (this.oathT ?? -99)) {
      this.oathT = g.time + 30;
      g.toast?.('「Rika!」'); this.manifest(true);
    }
    return a;
  }
  onMeleeHit(e) {
    if (!this.buffs.has('cursed_edge') || (this.edgeT ?? 0) > this.game.time) return;
    this.edgeT = this.game.time + 0.3;
    const g = this.game, p = this.p;
    g.projectiles.fire({ pos: this.handPos(), vel: p.aimDir.clone().setY(0).normalize().multiplyScalar(24), team: 'player', shape: 'slash', color: CE, emissive: 4, life: 0.4, radius: 0.8, pierce: true,
      onHit: (t, q) => { this.hit(t, 12 + this.rank('cslash') * 3, { stagger: 0.2, knock: q.vel.clone().setLength(2) }); g.fx.hitSpark(q.pos, null, { color: CE }); } });
  }
  throatCost(frac) {
    const g = this.game, p = this.p, cost = Math.min(p.hp - 1, p.maxHp * frac);
    if (cost > 0) { p.hp -= cost; g.fx.damageNumber(p.pos, cost, { color: '#ff5a6a' }); }
  }
  iaiDraw() {
    const g = this.game, p = this.p, f = this.fwd(), from = p.pos.clone();
    const dmg = 18 + this.rank('cslash') * 5;
    this.dash(f, 5.5, 0.16, { hitR: 1.6, dmg, color: CE, hitOpts: { stagger: 0.5 } });
    this.after(0.17, () => {
      const L = from.distanceTo(p.pos);
      g.fx.slashLine(from.clone().setY(from.y + 1.1), f, Math.max(1, L), CE, 0.4, 0.3);
      g.fx.slashLine(from.clone().setY(from.y + 1.1), f, Math.max(1, L), 0xffffff, 0.12, 0.25);
      p.facing = Math.atan2(f.x, f.z); this.pose('swingR', 0.2);
    });
    g.audio?.energy('slash'); g.audio?.whoosh(1.2);
  }
  flurry() {
    const g = this.game, p = this.p, R = 3.3;
    p.facing = this.aimAngle();
    for (let i = 0; i < 7; i++) this.after(i * 0.08, () => {
      const last = i === 6;
      this.pose(last ? 'spin' : i % 2 ? 'swingL' : 'swingR', last ? 0.3 : 0.1);
      const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
      g.fx.slashArc(p.pos, p.facing, last ? RIKA : CE, last ? R + 0.6 : R, last ? Math.PI : 0.9, 0.14, i % 2 === 1);
      for (const e of this.foes(p.pos, last ? R + 0.6 : R, dir, last ? Math.PI : 0.9)) this.hit(e, last ? 26 + this.rank('cslash') * 4 : 9 + this.rank('cslash') * 2, { melee: true, stagger: last ? 0.7 : 0.15, knock: dir.clone().multiplyScalar(last ? 9 : 1) });
      g.audio?.energy('slash');
      if (last) g.shake(0.25);
    });
  }
  cursedEdge() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.toast?.('Cursed Energy Edge'); g.audio?.charge(0.3, 1.4);
    this.statBuff('cursed_edge', 10, { meleeMult: 0.15 }, {
      onTick: () => { if (Math.random() < 0.6) g.particles.burst(this.handPos().add(tmp.set((Math.random() - 0.5) * 0.4, -0.4 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4)), { count: 1, color: Math.random() < 0.3 ? RIKA : CE, speed: 0.4, up: 1, life: 0.35, size: 0.14 }); },
    });
  }
  speechCrush() {
    const g = this.game, p = this.p, R = 7;
    const list = this.foes(p.pos, R);
    if (!list.length) { g.toast?.('No curses in earshot'); g.audio?.ui('back'); return false; }
    this.cast(0.5, true); this.throatCost(0.04);
    g.toast?.('「Crush.」');
    g.audio?.tone({ freq: 120, to: 60, dur: 0.6, gain: 0.35, type: 'sawtooth', filter: 700, rev: 0.4 });
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.4), 1, 0.5);
    for (const e of list) {
      this.hit(e, 40 + this.rank('speech') * 8, { stagger: 0.8, unblockable: true, knock: new THREE.Vector3(0, 0, 0), color: '#e8e0ff' });
      if (!e.isBoss) { e.vel.y = Math.min(e.vel.y, -12); this.stun(e, 0.6); }
      g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z), { color: 0xe8e0ff, r0: 2, r1: 0.3, dur: 0.3, thick: 0.25 });
      g.particles.burst(e.pos.clone().setY(e.pos.y + e.height + 0.6), { count: 10, color: 0xe8e0ff, speed: 7, spread: 0.2, dir: tmp.set(0, -1, 0), life: 0.3, size: 0.1, shape: 1 });
      g.fx.landDust(e.pos, 12);
    }
    g.shake(0.4); g.hitStop(0.05); g.audio?.impact(1.6);
  }
  speechTwist() {
    const g = this.game, p = this.p, t = this.target(12);
    if (!t) { g.toast?.('No curse in earshot'); g.audio?.ui('back'); return false; }
    this.cast(0.55, true); this.throatCost(0.06);
    g.toast?.('「Get twisted.」');
    g.audio?.tone({ freq: 200, to: 70, dur: 0.7, gain: 0.35, type: 'sawtooth', filter: 900, rev: 0.4 });
    this.during(0.45, (tt) => {
      if (t.dead) return false;
      for (let i = 0; i < 3; i++) { const a = tt * 18 + i * 2.1, r = t.radius + 0.6; g.particles.glow.emit(t.pos.x + Math.cos(a) * r, t.pos.y + (tt / 0.45) * t.height, t.pos.z + Math.sin(a) * r, 0, 0.5, 0, 0.4, 2.2, 2, 2.6, 0.16, 0, 1, 0.3, 1); }
    }, () => {
      if (t.dead) return;
      this.hit(t, 80 + this.rank('speech') * 15, { stagger: 1, unblockable: true, crit: false, color: '#e8e0ff' });
      if (!t.isBoss) this.stun(t, 1);
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + t.height * 0.6), null, { color: 0xe8e0ff, big: true });
      g.particles.burst(t.pos.clone().setY(t.pos.y + t.height * 0.5), { count: 24, color: 0x8a2a4a, speed: 6, life: 0.5, size: 0.14, gravity: 12, shape: 1 });
      g.shake(0.35); g.hitStop(0.07); g.audio?.impact(1.7, 'crit');
    });
  }
  graniteBlast() {
    const g = this.game, p = this.p;
    p.action = { type: 'cast', both: true, dur: 0.75, elapsed: 0, t: 0, moveScale: 0.1, lock: true, faceAim: true };
    g.audio?.charge(0.5, 0.9);
    const orb = makeOrb(CE, { radius: 0.2, coreColor: 0xffffff }); g.scene.add(orb);
    this.during(0.5, (t, dt, k) => { orb.position.copy(this.handPos()); orb.scale.setScalar(0.2 + k * 0.8); for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, r = 2; const o = orb.position; g.particles.glow.emit(o.x + Math.cos(a) * r, o.y + (Math.random() - 0.5) * 1.5, o.z + Math.sin(a) * r, -Math.cos(a) * 5, 0, -Math.sin(a) * 5, 0.4, 1.4, 2.2, 2.8, 0.14, 0, 1, 0.1, 1); } }, () => {
      const dir = this.fwd();
      const dmg = 34 + this.rank('speech') * 6;
      const pr = g.projectiles.fire({ pos: this.handPos(), vel: dir.clone().multiplyScalar(22), team: 'player', shape: 'orb', color: CE, scale: 0.01, life: 0.8, radius: 1.1, pierce: true, light: 5,
        trail: (q) => { orb.position.copy(q.pos); g.particles.burst(q.pos, { count: 3, color: Math.random() < 0.5 ? CE : 0xffffff, speed: 2, life: 0.35, size: 0.5, sizeEnd: 0.05 }); },
        onHit: (e, q) => { this.hit(e, dmg, { stagger: 0.5, knock: dir.clone().multiplyScalar(4) }); },
        onExpire: (q) => { g.scene.remove(orb); this.blast(q.pos.clone(), 4, 46 + this.rank('speech') * 8, { color: CE, knock: 10, stagger: 0.8 }); g.fx.screenWave(q.pos, 0.8, 0.4); } });
      if (!pr) g.scene.remove(orb);
      g.shake(0.25); g.audio?.energy('red');
    });
  }
  thinIce() {
    const g = this.game, p = this.p, f = this.fwd(), from = p.pos.clone(), L = 13, W = 3;
    this.cast(0.5, true);
    g.toast?.('Copy: Sky Manipulation');
    g.markers.spawn({ pos: from.clone().addScaledVector(f, 1), dur: 0.35, shape: 'rect', width: W * 2, length: L, facing: Math.atan2(f.x, f.z), color: 0x9ad8ff });
    const mat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xa8dcff).multiplyScalar(1.6), transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(W * 2, 2.4);
    const hit = new Set();
    for (let i = 0; i < 6; i++) this.after(0.35 + i * 0.07, () => {
      const c = from.clone().addScaledVector(f, 1.8 + i * 2.1); c.y = this.groundAt(c.x, c.z, from.y);
      // a sheet of sky folds up out of the air and slams down
      const sheet = new THREE.Mesh(geo, mat); sheet.renderOrder = 22;
      sheet.position.copy(c).setY(c.y + 3); sheet.rotation.y = Math.atan2(f.x, f.z); g.scene.add(sheet);
      this.during(0.3, (t, dt, k) => { sheet.rotation.x = -Math.PI / 2 * (1 - k) - 0.2; sheet.position.y = c.y + 0.3 + (1 - k) * 2.5; }, () => g.scene.remove(sheet));
      this.after(0.2, () => {
        for (const e of this.foes(c, W)) { if (hit.has(e)) continue; hit.add(e); this.hit(e, 44 + this.rank('speech') * 6, { stagger: 0.8, knock: f.clone().multiplyScalar(4) }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9); }
        g.fx.shockwave(c, 0xa8dcff, W + 0.4); g.fx.landDust(c, 14); g.shake(0.18); g.audio?.impact(1.1);
      });
    });
    this.after(1.4, () => { geo.dispose(); mat.dispose(); });
    g.audio?.noise({ dur: 0.8, gain: 0.3, type: 'lowpass', freq: 400, sweep: 1600, rev: 0.4 });
  }
  hollowPurple() {
    const g = this.game, p = this.p, CH = 1.3;
    p.action = { type: 'cast', both: true, dur: CH + 0.3, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: true };
    p.invulnerable = true;
    g.toast?.('Copy: Hollow Purple', 'domain'); g.audio?.energy('blue'); this.after(0.5, () => g.audio?.energy('red'));
    g.fx.dimTarget = 0.5;
    const blue = makeOrb(0x4a8aff, { radius: 0.5 }), red = makeOrb(0xff3a3a, { radius: 0.5 });
    g.scene.add(blue, red);
    const L1 = g.lights.attach(blue, 0x4a8aff, 6, 8, { offsetY: 0, priority: 5 }), L2 = g.lights.attach(red, 0xff3a3a, 6, 8, { offsetY: 0, priority: 5 });
    this.during(CH, (t, dt, k) => {
      p.facing = this.aimAngle();
      const f = this.fwd(), side = tmp.set(f.z, 0, -f.x), c = p.pos.clone().addScaledVector(f, 1.4).setY(p.pos.y + 1.4);
      const spread = 1.8 * (1 - k * k);
      blue.position.copy(c).addScaledVector(side, spread); red.position.copy(c).addScaledVector(side, -spread);
      blue.scale.setScalar(0.4 + k * 0.4); red.scale.setScalar(0.4 + k * 0.4);
      for (const o of [blue, red]) g.particles.burst(o.position, { count: 1, color: o === blue ? 0x6aa8ff : 0xff5a5a, speed: 1, life: 0.3, size: 0.3, sizeEnd: 0.05 });
    }, () => {
      g.scene.remove(blue, red); g.lights.remove(L1); g.lights.remove(L2);
      const f = this.fwd(), from = p.pos.clone().addScaledVector(f, 1.6).setY(p.pos.y + 1.4);
      const purple = makeOrb(0x9a3aff, { radius: 2.2, coreColor: 0xffffff }); purple.position.copy(from); g.scene.add(purple);
      const light = g.lights.attach(purple, 0x9a3aff, 16, 18, { offsetY: 0, priority: 8 });
      g.fx.flash(0xc080ff, 0.6, 0.3); g.fx.chroma(1.6); g.fx.screenWave(from, 1.5, 0.6); g.shake(0.8); g.hitStop(0.1);
      g.audio?.energy('purple'); g.fx.dimTarget = 0;
      p.invulnerable = false; if (p.action?.lock) p.action = null;
      const hit = new Set(); let d = 0;
      this.during(1.7, (t, dt) => {
        d += 18 * dt; purple.position.copy(from).addScaledVector(f, d);
        purple.rotation.y += dt * 4;
        for (let i = 0; i < 4; i++) g.particles.burst(tmp2.copy(purple.position).add(tmp.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3)), { count: 1, color: Math.random() < 0.5 ? 0x9a3aff : 0xffffff, speed: 1, life: 0.4, size: 0.5, sizeEnd: 0.05, intensity: 3 });
        for (const e of this.foes(purple.position, 2.6)) { if (hit.has(e)) continue; hit.add(e); this.hit(e, 160 + (e.isBoss ? (e.maxHp ?? 100) * 0.06 : 0), { stagger: 1, unblockable: true, crit: false, knock: f.clone().multiplyScalar(6), color: '#c080ff' }); g.particles.burst(e.pos.clone().setY(e.pos.y + 1), { count: 20, color: 0x9a3aff, speed: 7, life: 0.5, size: 0.14, shape: 1 }); }
        g.combat.hitBlocks(purple.position.clone().setY(p.pos.y + 0.5), f, 2.2, Math.PI, 200, p);
      }, () => { g.scene.remove(purple); g.lights.remove(light); g.fx.explosion(purple.position, 0x9a3aff, 2.5); });
    });
  }
  rikaArm(from, to) {
    const g = this.game;
    const M = new THREE.MeshStandardNodeMaterial({ color: 0xe8e4f0, roughness: 0.7 }), dark = new THREE.MeshStandardNodeMaterial({ color: 0x1a1420, roughness: 0.7 });
    const arm = new THREE.Group(), geo = new THREE.BoxGeometry(1, 1, 1);
    const fore = new THREE.Mesh(geo, M); arm.add(fore);
    const fist = new THREE.Mesh(geo, M); fist.scale.set(1.1, 0.9, 1); arm.add(fist);
    for (let f = 0; f < 3; f++) { const c = new THREE.Mesh(geo, dark); c.scale.set(0.15, 0.15, 0.5); c.position.set(-0.3 + f * 0.3, -0.3, 0); fist.add(c); }
    g.scene.add(arm);
    const set = (k) => {
      const end = tmp2.lerpVectors(from, to, k), L = Math.max(0.3, from.distanceTo(end));
      arm.position.copy(from); arm.lookAt(end);
      fore.scale.set(0.55, 0.55, L); fore.position.set(0, 0, L / 2); fist.position.set(0, 0, L + 0.3);
    };
    set(0.01);
    return { arm, set, done: () => { g.scene.remove(arm); geo.dispose(); M.dispose(); dark.dispose(); } };
  }
  rikaGrab() {
    const g = this.game, p = this.p, t = this.target(11);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.6, true);
    g.audio?.energy('summon');
    const from = () => (this.rika ? this.rika.grp.position.clone().setY(this.rika.grp.position.y + 2.2) : p.pos.clone().setY(p.pos.y + 2));
    const A = this.rikaArm(from(), t.pos.clone().setY(t.pos.y + t.height * 0.5));
    this.during(0.22, (tt, dt, k) => { A.set(k); }, () => {
      if (t.dead) { A.done(); return; }
      this.stun(t, 1.4);
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + 1), null, { color: RIKA, big: true }); g.audio?.impact(1.2);
      // drag it in
      const start = t.pos.clone(), dest = p.pos.clone().addScaledVector(this.fwd(), 2.2);
      this.during(0.3, (tt, dt, k) => {
        if (!t.dead && !t.isBoss) { const gy = this.game.world.groundBelow(start.x + (dest.x - start.x) * k, start.z + (dest.z - start.z) * k, start.y + 2); if (isFinite(gy)) { t.pos.x = start.x + (dest.x - start.x) * k; t.pos.z = start.z + (dest.z - start.z) * k; t.pos.y = gy; } }
        A.arm.position.copy(from()); A.arm.lookAt(t.pos.clone().setY(t.pos.y + t.height * 0.5));
        const L = Math.max(0.3, A.arm.position.distanceTo(t.pos)); A.arm.children[0].scale.z = L; A.arm.children[0].position.z = L / 2; A.arm.children[1].position.z = L + 0.3;
      }, () => {
        A.done();
        if (t.dead) return;
        this.rikaSmash(t.pos.clone(), 1.3);
      });
    });
  }
  rikaShriek() {
    const g = this.game, p = this.p, range = 8, arc = 0.8;
    this.cast(0.55, true);
    const f = this.fwd();
    g.toast?.('「AAAAAAAH!」');
    g.audio?.tone({ freq: 700, to: 300, dur: 0.9, gain: 0.15, type: 'sawtooth', filter: 2500, rev: 0.5 }); g.audio?.noise({ dur: 0.8, gain: 0.35, type: 'bandpass', freq: 1500, sweep: 600, q: 1.5 });
    const from = this.rika ? this.rika.grp.position.clone().setY(this.rika.grp.position.y + 2.9) : p.pos.clone().setY(p.pos.y + 1.6);
    for (let k = 0; k < 4; k++) this.after(k * 0.07, () => g.fx.rings.spawn(from.clone().addScaledVector(f, 1 + k * 1.5), { color: RIKA, r0: 0.4 + k * 0.8, r1: 1.2 + k * 1.4, dur: 0.3, thick: 0.1, tilt: new THREE.Quaternion().setFromUnitVectors(tmp.set(0, 0, 1), f) }));
    for (let i = 0; i < 24; i++) { const a = Math.atan2(f.x, f.z) + (Math.random() - 0.5) * arc * 2, sp = 10 + Math.random() * 5; g.particles.glow.emit(from.x, from.y, from.z, Math.sin(a) * sp, (Math.random() - 0.5) * 2, Math.cos(a) * sp, range / sp, 2.4, 1.2, 2.6, 0.2, 0, 1, 0.8, 0); }
    for (const e of this.foes(p.pos, range, f, arc)) {
      this.hit(e, 22 + this.rank('rika') * 5, { stagger: 0.6, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(11), unblockable: true });
      hold(e, 1.4);
    }
    g.fx.screenWave(from, 0.8, 0.4); g.shake(0.35);
  }
  rikaGuard() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const R = this.rika ? null : this.buildRika();
    if (R) { R.scale.setScalar(0.01); g.scene.add(R); }
    let soak = 120;
    g.audio?.energy('summon'); g.fx.summonCircle(p.pos, RIKA);
    this.buff('rika_guard', 5, {
      incoming: (a) => {
        const took = Math.min(soak, a * 0.8); soak -= took;
        g.fx.hitSpark(p.pos.clone().setY(p.pos.y + 1.4), null, { color: RIKA });
        if (soak <= 0) { const b = this.buffs.get('rika_guard'); if (b) b.left = 0.01; }
        return a - took;
      },
      onTick: (dt, b) => {
        const grp = R ?? this.rika?.grp; if (!grp) return;
        if (R) {
          R.position.set(p.pos.x - Math.sin(p.facing) * 0.6, p.pos.y + 0.3, p.pos.z - Math.cos(p.facing) * 0.6); R.rotation.y = p.facing;
          R.scale.setScalar(Math.min(1, (b.dur - b.left) * 4) * 1.05);
        }
        for (const arm of grp.userData.arms) arm.rotation.x = -1.3 + Math.sin(g.time * 3) * 0.05;   // arms wrapped around him
        if (Math.random() < 0.4) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 1.4, p.pos.y + Math.random() * 2.2, p.pos.z + (Math.random() - 0.5) * 1.4, 0, 0.5, 0, 0.5, 2.2, 1, 2.6, 0.14, 0, 1, 0.2, 0);
      },
      onEnd: () => { if (R) { g.scene.remove(R); g.fx.blinkPuff(R.position, RIKA); } },
    });
  }
  rikaArsenal() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const c = this.aimGround(12), R = 4.2;
    g.markers.spawn({ pos: c, dur: 0.6, radius: R, color: RIKA });
    g.toast?.('Rika\'s Arsenal');
    const from = this.rika ? this.rika.grp.position.clone().setY(this.rika.grp.position.y + 3) : p.pos.clone().setY(p.pos.y + 3);
    g.particles.burst(from, { count: 16, color: RIKA, speed: 4, up: 3, life: 0.5, size: 0.2 });
    for (let i = 0; i < 12; i++) this.after(0.35 + i * 0.06, () => {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
      const at = new THREE.Vector3(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r); at.y = this.groundAt(at.x, at.z, c.y);
      g.projectiles.fire({ pos: at.clone().add(tmp.set(1, 10, 0.5)), vel: new THREE.Vector3(-2.4, -24, -1.2), team: 'player', shape: 'arrow', color: 0xdfe6f0, emissive: 1.2, scale: 1.3, life: 0.42, radius: 0.6, ghost: true,
        trail: (q) => { if (Math.random() < 0.5) g.particles.burst(q.pos, { count: 1, color: CE, speed: 0.3, life: 0.25, size: 0.15 }); },
        onHit: (e) => this.hit(e, 14 + this.rank('cslash') * 3, { stagger: 0.3 }),
        onExpire: (q, why) => { if (why === 'hit') return; g.combat.aoe(at, 1.3, 12, p, { knock: 3, stagger: 0.3 }); g.fx.hitSpark(at.clone().setY(at.y + 0.3), null, { color: 0xd8f0ff }); if (i % 3 === 0) g.audio?.impact(0.8, 'metal'); } });
    });
    g.audio?.energy('summon');
  }
  fullManifest() {
    const g = this.game, p = this.p;
    p.action = { type: 'cast', both: true, dur: 0.9, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.toast?.('Rika: Full Manifestation', 'domain');
    g.fx.flash(0x300018, 0.5, 0.35); g.fx.chroma(1.2); g.shake(0.6);
    g.audio?.tone({ freq: 55, to: 30, dur: 2, gain: 0.5, type: 'sawtooth', filter: 400, rev: 0.7 });
    this.after(0.9, () => { if (p.action?.lock) p.action = null; });
    if (!this.rika) this.manifest(true);
    if (this.rika) this.rika.life = Math.max(this.rika.life, 15 * this.rikaMul);
    this.blast(p.pos.clone(), 5, 30, { color: RIKA, knock: 12, stagger: 0.8 });
    let ce = 0;
    this.buff('full_manifest', 15 * this.rikaMul, { onStart: () => { this.rikaBoost = true; }, onEnd: () => { this.rikaBoost = false; },
      onTick: (dt) => { ce += dt; if (ce >= 1) { ce = 0; p.gainCE(3); } if (!this.rika) { const b = this.buffs.get('full_manifest'); if (b) b.left = 0.01; } } });
  }
  rctOut() {
    const g = this.game, p = this.p;
    if (p.hp >= p.maxHp && !g.players.some((pl) => pl !== p && !pl.dead && pl.hp < pl.maxHp && pl.pos.distanceTo(p.pos) < 7)) { g.toast?.('Already at full health'); g.audio?.ui('back'); return false; }
    if (p.hp < p.maxHp) this.rctHeal(0.3, 1.5, 0x9affd8); else this.cast(0.5, true);
    for (const pl of g.players) if (pl !== p && !pl.dead && pl.pos.distanceTo(p.pos) < 7) { pl.heal(pl.maxHp * 0.2); g.fx.heal(pl.pos, 0x9affd8); }
  }
  ringVow() {
    const g = this.game, p = this.p;
    this.cast(0.6, true);
    g.toast?.('「Rika…」'); g.audio?.energy('heal');
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1.4), { count: 16, color: LOVE, speed: 2, up: 1.5, life: 0.8, size: 0.14, shape: 1 });
    if (this.rika) this.rika.life += 5;
    let t0 = 0;
    this.buff('ring_vow', 3, { onTick: (dt) => { p.gainCE(10 * dt); t0 -= dt; if (t0 <= 0) { t0 = 0.2; g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1.2, p.pos.z), { count: 1, color: Math.random() < 0.5 ? LOVE : RIKA, speed: 1, up: 1, life: 0.5, size: 0.16 }); } } });
  }
  sgStep() {
    const g = this.game, p = this.p;
    const to = this.aimGround(8);
    const from = p.pos.clone();
    if (!this.blink(to, { color: CE, iframes: 0.35 })) return false;
    const d = tmp.subVectors(p.pos, from).setY(0); const L = d.length();
    if (L > 0.5) { d.normalize(); for (let s = 0; s < L; s += 0.6) g.particles.burst(tmp2.copy(from).addScaledVector(d, s).setY(from.y + 1), { count: 2, color: Math.random() < 0.3 ? RIKA : CE, speed: 0.6, life: 0.35, size: 0.5, sizeEnd: 0.1 }); }
    for (const e of this.foes(p.pos, 2.4)) this.hit(e, 14, { stagger: 0.5, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(7) });
    g.fx.shockwave(p.pos, CE, 2.6); g.audio?.whoosh(1.2);
  }
  ceOverflow() {
    const g = this.game, p = this.p;
    p.action = { type: 'cast', both: true, dur: 0.45, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    this.after(0.45, () => { if (p.action?.lock) p.action = null; });
    g.toast?.('Overwhelming Cursed Energy');
    this.blast(p.pos.clone(), 6, 40, { color: CE, knock: 15, stagger: 0.9, explode: false });
    for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2; g.particles.glow.emit(p.pos.x, p.pos.y + 0.5 + Math.random() * 1.5, p.pos.z, Math.cos(a) * 12, Math.random() * 3, Math.sin(a) * 12, 0.5, 1.6, 2.2, 3, 0.3, 0, 2, 1.2, 0); }
    g.fx.flash(0xc0e0ff, 0.35, 0.2); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1.2, 0.5); g.fx.chroma(0.8);
    this.statBuff('ce_overflow', 3, { armor: 0.4 }, { onTick: () => { if (Math.random() < 0.5) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 1, p.pos.y + Math.random() * 2, p.pos.z + (Math.random() - 0.5) * 1, 0, 1.5, 0, 0.5, 1.4, 2, 2.8, 0.2, 0, 1, 0.1, 0); } });
    g.audio?.energy('blue');
  }
}
registerKit('yuta', YutaKit, YUTA_SKILLS);
