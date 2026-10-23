// Higuruma kit — Deadly Sentencing (Judgeman).
// Higuruma's cursed technique *is* his domain: outside it he fights with the
// gavel Judgeman lends him (he can resize it and make it vanish and reappear),
// and Confiscation / the Executioner's Sword only ever come from a verdict.
//   LMB  gavel combo. With the Executioner's Sword, every touch is certain
//        death: curses die outright, bosses lose a huge slice of their HP.
//   RMB  Gavel Strike: the gavel swells to giant size and slams the aim point.
//   1    Judgeman: the shikigami hovers at your shoulder and gathers Evidence
//        on curses (no damage). Evidence makes the court's verdict harsher.
//   2    Gavel: Vanish — the gavel disappears mid-swing and reappears behind
//        the target, striking past any guard.
//   3    Gavel: Enlarge — the gavel grows enormous for a sweeping blow.
//   F    Domain Expansion: Deadly Sentencing — a dark courtroom. The sure-hit
//        is the trial itself and VIOLENCE IS FORBIDDEN inside: no one (Higuruma
//        included) can deal damage. Judgeman presents the evidence against one
//        defendant (the strongest curse inside), the defendant pleads (silence,
//        denial or confession), then the verdict:
//          GUILTY → Confiscation: the defendant's cursed technique is
//                   confiscated — it cannot attack or use abilities for ~20s.
//          DEATH PENALTY (rarer; likelier against bosses and with lots of
//                   evidence) → Higuruma is granted the Executioner's Sword.
//        One trial per domain, then the domain collapses.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const GOLD = 0xffd060, BLADE = 0xfff0b0, INK = 0x0c0c10, RED = 0xd0202a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('higuruma', {
  name: 'Higuruma', technique: 'Deadly Sentencing', rarity: 'legendary', title: 'The Judge', color: '#ffd060',
  desc: 'A lawyer with Judgeman\'s gavel. His domain puts the strongest curse on trial — violence is forbidden in court — and the verdict either confiscates its cursed technique or grants him the Executioner\'s Sword.',
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
    // the Executioner's Sword: hidden until a death-penalty verdict grants it
    const sword = new THREE.Group();
    const steel = K.mat(BLADE, { metalness: 0.6, roughness: 0.2, emissive: 1.6 });
    K.box(sword, 1.2, 4, 1.2, K.mat(0x1a1410), 0, 1, 0);
    K.box(sword, 6, 1, 1.6, band, 0, -1.2, 0);
    K.box(sword, 3, 24, 0.6, steel, 0, -14, 0);
    sword.rotation.x = Math.PI / 2; sword.position.z = 2 * K.PX; sword.visible = false;
    rig.handR.add(sword); rig.extras.sword = sword;
    K.box(rig.torso, 1.2, 1.2, 0.5, band, 2.2, 9.5, 2.3);   // sunflower-and-scales lawyer badge
  },
});

// A dark courtroom: black void, dark wooden floor, warm spotlights.
registerDomainEnv('deadly_sentencing', {
  skyTop: 0x000000, skyHorizon: 0x0c0806, fog: 0x040302, fogDensity: 0.03, hemiSky: 0xffe0b0, hemiGround: 0x040302, hemiI: 0.55, sun: 0xfff0d0, sunI: 1.3,
  grade: { tint: [1.04, 1.0, 0.9], lift: [0.0, 0.0, 0.0], sat: 0.7, contrast: 1.3, vignette: 0.72 }, floor: B.dark_planks,
});

export const HIGURUMA_SKILLS = [
  { id: 'gavel', name: 'Heavy Gavel', icon: '🔨', desc: '+8% melee damage per rank and bigger gavel techniques.', max: 3, req: 'ab:gavel_strike', branch: 'Gavel', tier: 1 },
  { id: 'evidence', name: 'Evidence', icon: '📁', desc: 'Judgeman gathers evidence faster and stays longer. More evidence, harsher verdicts.', max: 3, req: 'ab:judgeman', branch: 'Judgeman', tier: 2 },
  { id: 'verdict', name: 'Confiscation', icon: '🚫', desc: 'A confiscated technique stays sealed 4s longer per rank (Summary Confiscation: 2s).', max: 2, branch: 'Verdict', tier: 1 },
  { id: 'sword', name: 'Executioner\'s Sword', icon: '🗡️', desc: 'The sword lasts 3s longer per rank.', max: 3, req: 'ab:guilty_stamp', branch: 'Verdict', tier: 3 },
  { id: 'court', name: 'Courtroom', icon: '🏛️', desc: 'The trial moves faster and the death penalty is more likely.', max: 2, req: 'evidence', branch: 'Court', tier: 5 },
];

// What Judgeman's evidence accuses each kind of curse of.
const CHARGES = {
  swarmer: ['assaulting 3 passers-by in Shibuya', 'attacking commuters on the Fukutoshin Line'],
  imp: ['trespassing in a sealed barrier', 'accessory to a brood mother\'s crimes'],
  spitter: ['poisoning 5 people at a bus stop', 'melting a patrol car and its officers'],
  blob: ['blowing up a convenience store', 'self-destructing in a crowded station'],
  tank: ['crushing two window cleaners', 'collapsing a footbridge onto traffic'],
  teleporter: ['stalking and murdering 3 people in Shibuya', 'abducting a student from Jujutsu High'],
  summoner: ['breeding curses under an elementary school', 'the deaths of 12 people at a hospital'],
  jogo: ['burning sorcerers alive in Shibuya', 'the incineration of a Grade 1 sorcerer'],
  hanami: ['the attack on Jujutsu High during the Goodwill Event', 'draining a forest and the people in it'],
  mahito: ['transfiguring dozens of people in Shibuya', 'murdering Kento Nanami'],
  sugisawa_curse: ['breaking into Sugisawa Third High', 'devouring two students in the school building'],
  finger_bearer: ['the deaths of four inmates at Eishu Juvenile Detention Center', 'tearing off a sorcerer\'s hand'],
  eso_kechizu: ['the rotting of a man at Yasohachi Bridge', 'stealing Sukuna\'s fingers from Jujutsu High'],
  kechizu: ['the rotting of a man at Yasohachi Bridge', 'stealing Sukuna\'s fingers from Jujutsu High'],
  dagon: ['drowning sorcerers in Shibuya Station', 'the death of Naobito Zen\'in\'s escort'],
  choso: ['assaulting sorcerers on the Fukutoshin Line', 'aiding the sealing of Satoru Gojo'],
  mahoraga: ['rampaging through Shibuya', 'the destruction of Dogenzaka'],
  sukuna: ['the destruction of Shibuya', 'the massacre of thousands in a single Malevolent Shrine'],
  default: ['murdering 3 people in Shibuya', 'the massacre at Shibuya Station'],
};
const PLEAS = [
  { kind: 'silence', w: 3, text: 'The defendant remains silent.', mod: 0 },
  { kind: 'denial', w: 4, text: '"I didn\'t do it!" (the defendant denies the charge)', mod: 0 },
  { kind: 'confession', w: 3, text: '"...I did it." (the defendant confesses)', mod: 0.06 },
];

let mats = null;
const M = () => mats || (mats = {
  robe: new THREE.MeshStandardNodeMaterial({ color: INK, roughness: 0.9 }),
  blind: new THREE.MeshStandardNodeMaterial({ color: 0xf2eee4, roughness: 0.8 }),
  teeth: new THREE.MeshStandardNodeMaterial({ color: 0xf8f4ea, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.15 }),
  gold: new THREE.MeshStandardNodeMaterial({ color: GOLD, metalness: 0.9, roughness: 0.25, emissive: GOLD, emissiveIntensity: 0.5 }),
  wood: new THREE.MeshStandardNodeMaterial({ color: 0x4a2a18, roughness: 0.55 }),
  dark: new THREE.MeshStandardNodeMaterial({ color: 0x1e120a, roughness: 0.45, metalness: 0.05 }),
  blade: new THREE.MeshStandardNodeMaterial({ color: BLADE, metalness: 0.5, roughness: 0.2, emissive: BLADE, emissiveIntensity: 2.4 }),
  shaft: new THREE.MeshBasicNodeMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
  ban: new THREE.MeshBasicNodeMaterial({ color: RED, fog: false }),
  banGold: new THREE.MeshBasicNodeMaterial({ color: GOLD, fog: false }),
  ring: new THREE.TorusGeometry(0.34, 0.06, 6, 24),
});
function bx(parent, w, h, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
// Judgeman: a black, robed shikigami with a blindfold and a wide grin, holding
// the scales of justice.
function makeJudgeman(s = 1) {
  const m = M(), g = new THREE.Group();
  bx(g, 1.0, 1.5, 0.7, 0, 0.75, 0, m.robe); bx(g, 1.3, 0.4, 0.9, 0, 0.12, 0, m.robe);
  bx(g, 0.24, 0.24, 0.7, -0.45, 1.2, 0.35, m.robe); bx(g, 0.24, 0.24, 0.7, 0.45, 1.2, 0.35, m.robe);
  bx(g, 0.95, 0.9, 0.85, 0, 1.95, 0, m.robe);                                    // big round head
  bx(g, 1.0, 0.2, 0.9, 0, 2.08, 0, m.blind); bx(g, 0.22, 0.34, 0.1, 0, 2.0, -0.48, m.blind);   // blindfold + knot
  bx(g, 0.64, 0.14, 0.03, 0, 1.72, 0.43, m.teeth);                                 // grin
  for (let i = -2; i <= 2; i++) bx(g, 0.025, 0.14, 0.04, i * 0.12, 1.72, 0.44, m.robe);
  const sc = new THREE.Group(); sc.position.set(0, 1.2, 0.75); g.add(sc);
  bx(sc, 0.06, 0.95, 0.06, 0, 0.45, 0, m.gold);
  const beam = new THREE.Group(); beam.position.y = 0.92; sc.add(beam);
  bx(beam, 1.15, 0.05, 0.05, 0, 0, 0, m.gold);
  const pans = [];
  for (const x of [-0.52, 0.52]) { const pan = new THREE.Group(); pan.position.x = x; beam.add(pan); bx(pan, 0.02, 0.4, 0.02, 0, -0.2, 0, m.gold); bx(pan, 0.34, 0.04, 0.34, 0, -0.42, 0, m.gold); pans.push(pan); }
  g.userData.beam = beam; g.userData.pans = pans;
  g.scale.setScalar(s);
  return g;
}
function tiltScales(jm, a) { const u = jm.userData; u.beam.rotation.z = a; for (const p of u.pans) p.rotation.z = -a; }
function makeGavel(s) {
  const m = M(), gv = new THREE.Group(), arm = new THREE.Group(); gv.add(arm);
  bx(arm, 0.3 * s, 3.2 * s, 0.3 * s, 0, 1.6 * s, 0, m.wood);
  bx(arm, 1.9 * s, 1 * s, 1 * s, 0, 3.4 * s, 0, m.wood);
  bx(arm, 0.2 * s, 1.1 * s, 1.1 * s, -0.6 * s, 3.4 * s, 0, m.gold); bx(arm, 0.2 * s, 1.1 * s, 1.1 * s, 0.6 * s, 3.4 * s, 0, m.gold);
  return { gv, arm };
}
function makeSword(s) {
  const m = M(), sw = new THREE.Group();
  bx(sw, 0.5 * s, 6 * s, 0.12 * s, 0, 0, 0, m.blade);
  bx(sw, 1.8 * s, 0.25 * s, 0.35 * s, 0, 3.1 * s, 0, m.gold);
  bx(sw, 0.22 * s, 1.4 * s, 0.22 * s, 0, 3.9 * s, 0, m.wood);
  return sw;
}
// A parchment panel in the courtroom that shows the charge and the verdict.
function textPanel(w, h) {
  const cv = document.createElement('canvas'); cv.width = 768; cv.height = Math.round(768 * h / w);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicNodeMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.renderOrder = 2;
  mesh.userData.draw = (title, lines, color = '#ffd060') => {
    const c = cv.getContext('2d'), W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(14,10,6,0.88)'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#c8a040'; c.lineWidth = 8; c.strokeRect(10, 10, W - 20, H - 20);
    c.textAlign = 'center'; c.fillStyle = color; c.font = 'bold 64px Georgia, serif';
    c.fillText(title, W / 2, 92);
    c.fillStyle = '#f2e6c8'; c.font = '38px Georgia, serif';
    let y = 160;
    for (const line of lines) {
      const words = line.split(' '); let cur = '';
      for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (c.measureText(t).width > W - 80 && cur) { c.fillText(cur, W / 2, y); y += 46; cur = wd; } else cur = t; }
      if (cur) { c.fillText(cur, W / 2, y); y += 52; }
    }
    tex.needsUpdate = true;
  };
  mesh.userData.free = () => { tex.dispose(); mat.dispose(); mesh.geometry.dispose(); };
  return mesh;
}

class HigurumaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const step = (o) => ({ trail: GOLD, sparkColor: 0xffe0a0, ...o });
    this.gavelCombo = [
      step({ style: 'swingR', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 14, range: 2.8, arc: 1.2, lunge: 5, knock: 5, stop: 0.055, shake: 0.2 }),
      step({ style: 'swingL', dur: 0.36, windup: 0.32, strike: 0.55, dmg: 14, range: 2.8, arc: 1.2, lunge: 5, knock: 5, stop: 0.055, shake: 0.2 }),
      step({ style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 15, range: 3, arc: 0.8, lunge: 7, knock: 6, stop: 0.06, shake: 0.2 }),
      step({ style: 'slam', dur: 0.62, windup: 0.46, strike: 0.62, dmg: 32, range: 3.4, arc: Math.PI, lunge: 3, knock: 12, stop: 0.11, shake: 0.5, ring: true, ringColor: GOLD, stagger: 0.7 }),
    ];
    // the Executioner's Sword: long, quick cuts
    const cut = (o) => ({ trail: BLADE, sparkColor: 0xffffff, ...o });
    this.swordCombo = [
      cut({ style: 'swingR', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 18, range: 3.6, arc: 1.3, lunge: 7, knock: 4, stop: 0.07, shake: 0.25 }),
      cut({ style: 'swingL', dur: 0.3, windup: 0.28, strike: 0.5, dmg: 18, range: 3.6, arc: 1.3, lunge: 7, knock: 4, stop: 0.07, shake: 0.25 }),
      cut({ style: 'slam', dur: 0.5, windup: 0.4, strike: 0.6, dmg: 26, range: 3.8, arc: 1.6, lunge: 5, knock: 8, stop: 0.1, shake: 0.4, ring: true, ringColor: BLADE }),
    ];
    this.combo = this.gavelCombo;
    this.p.stats.meleeMult += r('gavel') * 0.08;
    this.branches = ['Gavel', 'Judgeman', 'Court', 'Verdict'];
    this.library = {
      // ---- Gavel: Judgeman's gavel, which he can resize, throw and make vanish
      gavel_strike: ability({ name: 'Gavel Strike', icon: '🔨', kind: 'basic', desc: 'The gavel swells to giant size and slams the aim point.', cd: 1.5, ce: 0, branch: 'Gavel', tier: 0, start: true, legacy: 'ranged', use: () => this.gavelStrike() }),
      gavel_toss: ability({ name: 'Gavel Throw', icon: '🪃', kind: 'basic', desc: 'Hurl the gavel end over end; it flies out and returns to your hand, striking on the way out and back.', cd: 1.3, ce: 0, branch: 'Gavel', tier: 1, req: 'gavel_strike', use: () => this.gavelToss() }),
      gavel_vanish: ability({ name: 'Gavel: Vanish', icon: '🫥', kind: 'technique', desc: 'The gavel disappears mid-swing and reappears behind the target, striking past any guard.', cd: 7, ce: 16, branch: 'Gavel', tier: 2, legacy: 't2', req: 'gavel_toss', use: () => this.gavelVanish() }),
      gavel_pound: ability({ name: 'Gavel Pound', icon: '🪵', kind: 'technique', desc: 'Three giant gavels pound the floor one after another, marching away from you (each spot is marked first).', cd: 8, ce: 14, branch: 'Gavel', tier: 3, req: 'gavel_toss', use: () => this.gavelPound() }),
      gavel_enlarge: ability({ name: 'Gavel: Enlarge', icon: '🔨', kind: 'technique', desc: 'The gavel grows enormous for a sweeping blow.', cd: 11, ce: 24, branch: 'Gavel', tier: 3, legacy: 't3', req: 'gavel_vanish', use: () => this.gavelSweep() }),
      supreme_gavel: ability({ name: 'Supreme Gavel', icon: '🏛️', kind: 'technique', desc: 'A gold circle marks the aim, then a colossal gavel comes down on it and stuns what it does not flatten.', cd: 16, ce: 32, branch: 'Gavel', tier: 4, req: 'gavel_enlarge', use: () => this.supremeGavel() }),
      // ---- Judgeman: the shikigami of his technique
      judgeman: ability({ name: 'Judgeman', icon: '⚖️', kind: 'summon', desc: 'Judgeman hovers at your shoulder and gathers Evidence on curses (no damage). Evidence makes every verdict harsher.', cd: 14, ce: 12, branch: 'Judgeman', tier: 1, legacy: 't1', use: () => this.summonJudgeman() }),
      exhibit: ability({ name: 'Exhibit A', icon: '📁', kind: 'technique', desc: 'Present the evidence: every curse in front of you is charged with 2 Evidence and staggered.', cd: 7, ce: 8, branch: 'Judgeman', tier: 2, req: 'judgeman', use: () => this.exhibit() }),
      cross_exam: ability({ name: 'Cross-Examination', icon: '❓', kind: 'technique', desc: 'Judgeman questions one curse: it is held in the witness box for 2.5s and charged with 3 Evidence.', cd: 10, ce: 12, branch: 'Judgeman', tier: 2, req: 'judgeman', use: () => this.crossExam() }),
      scales: ability({ name: 'Weigh the Evidence', icon: '⚖️', kind: 'technique', desc: 'Judgeman raises the scales: every curse with Evidence takes damage for each piece weighed against it (Evidence is halved).', cd: 12, ce: 18, branch: 'Judgeman', tier: 3, req: 'exhibit', use: () => this.weighEvidence() }),
      jm_guard: ability({ name: 'Judgeman\'s Bar', icon: '🛡️', kind: 'defence', desc: 'Judgeman stands before you for 6s and takes the next 3 hits; every attacker it stops is charged with Evidence.', cd: 16, ce: 14, branch: 'Judgeman', tier: 3, req: 'cross_exam', use: () => this.judgemanGuard() }),
      // ---- Court: the lawyer
      objection: ability({ name: 'Objection!', icon: '✋', kind: 'defence', desc: 'Raise an objection for 1.2s: the first hit is overruled (no damage) and the gavel answers it.', cd: 9, ce: 8, branch: 'Court', tier: 1, use: () => this.objection() }),
      recess: ability({ name: 'Recess', icon: '🚪', kind: 'movement', desc: 'The court takes a recess: step back out of the fight and shake off slows.', cd: 6, ce: 5, branch: 'Court', tier: 1, use: () => this.recess() }),
      order: ability({ name: 'Order in the Court', icon: '📢', kind: 'technique', desc: 'Bang the gavel: a ringing shockwave silences every curse around you (stunned 1.5s).', cd: 11, ce: 14, branch: 'Court', tier: 2, req: 'objection', use: () => this.orderInCourt() }),
      subpoena: ability({ name: 'Subpoena', icon: '📜', kind: 'technique', desc: 'Summon a curse to court: it is dragged to you and dazed.', cd: 8, ce: 10, branch: 'Court', tier: 2, req: 'recess', use: () => this.subpoena() }),
      plea: ability({ name: 'Plea Bargain', icon: '🤝', kind: 'heal', desc: 'Negotiate a lighter sentence: heal 25% health over 2s and shake off slows.', cd: 28, ce: 20, branch: 'Court', tier: 3, req: 'order', use: () => this.pleaBargain() }),
      counsel: ability({ name: 'Defence Counsel', icon: '🌻', kind: 'buff', desc: 'The sunflower badge of a lawyer who fights for the innocent: for 10s +25% technique damage and 15% less damage taken.', cd: 24, ce: 18, branch: 'Court', tier: 4, req: 'plea', use: () => this.defenceCounsel() }),
      // ---- Verdict: summary judgments outside the domain
      guilty_stamp: ability({ name: 'Verdict: Guilty', icon: '🟥', kind: 'technique', desc: 'Stamp a giant GUILTY seal on the marked area: damage grows with each curse\'s Evidence, which it uses up.', cd: 10, ce: 16, branch: 'Verdict', tier: 2, req: 'judgeman', use: () => this.guiltyStamp() }),
      confiscation: ability({ name: 'Summary Confiscation', icon: '🚫', kind: 'technique', desc: 'A curse with 3+ Evidence has its cursed technique confiscated for 6s: it cannot attack.', cd: 20, ce: 24, branch: 'Verdict', tier: 3, req: 'guilty_stamp', use: () => this.summaryConfiscation() }),
      death_penalty: ability({ name: 'Summary Death Penalty', icon: '💀', kind: 'buff', desc: 'Against a curse with 5 Evidence, Judgeman grants the Executioner\'s Sword for 6s: every touch is certain death.', cd: 45, ce: 40, branch: 'Verdict', tier: 4, req: 'confiscation', use: () => this.summaryDeath() }),
      executioner_cut: ability({ name: 'Executioner\'s Cut', icon: '🗡️', kind: 'technique', desc: 'A long cutting wave. With the Executioner\'s Sword it executes curses on the line (bosses lose a big slice); without it, a golden gavel shockwave.', cd: 12, ce: 22, branch: 'Verdict', tier: 5, req: 'death_penalty', use: () => this.executionerCut() }),
    };
    this.passives = {
      burden_proof: passive({ name: 'Burden of Proof', icon: '📚', desc: 'Judgeman gathers 2 Evidence at a time.', branch: 'Judgeman', tier: 2, req: 'judgeman', apply: (pl, k) => { k.proof = 2; } }),
      weighted_gavel: passive({ name: 'Weighted Gavel', icon: '🔨', desc: 'Gavel techniques hit 25% harder.', branch: 'Gavel', tier: 2, req: 'gavel_toss', apply: (pl, k) => { k.gavelMul = 1.25; } }),
      defence_attorney: passive({ name: 'Defence Attorney', icon: '🌻', desc: 'Take 15% less damage while Judgeman is at your side.', branch: 'Court', tier: 3, req: 'objection', apply: (pl, k) => { k.attorney = true; } }),
      swift_justice: passive({ name: 'Swift Justice', icon: '⏩', desc: 'The Executioner\'s Sword lasts 4s longer and Verdict abilities recharge 25% faster.', branch: 'Verdict', tier: 4, req: 'confiscation', apply: (pl, k) => { k.swordBonus = 4; for (const id of ['guilty_stamp', 'confiscation', 'death_penalty', 'executioner_cut']) k.library[id].cd *= 0.75; } }),
    };
    this.swordT = 0;
    this.forbid = false;
    this.confiscated = new Set();
    this.domain = {
      name: 'Deadly Sentencing', icon: '⚖️', key: 'deadly_sentencing', type: 6, color: GOLD, sound: 'void', flash: 0xfff0c0,
      sureHit: false,   // the sure-hit is the trial, not damage
      look: { floor: 0x1a120c, seam: 0x050302, sparkle: 0x3a2a12, skyTop: 0x000000, skyHorizon: 0x0a0705, stars: 0, band: 0x4a3410 },
      duration: 30, radius: 22,   // the court adjourns (collapses) once the verdict is carried out
      onStart: (g, d) => this.openCourt(g, d),
      onTick: (g, d, dt) => this.runTrial(g, d, dt),
      onEnd: (g) => this.closeCourt(g),
    };
  }
  // ================================================================ the court
  openCourt(g, d) {
    const m = M();
    const cam = g.rig.camera.position;
    const away = new THREE.Vector3(d.center.x - cam.x, 0, d.center.z - cam.z);
    if (away.lengthSq() < 1e-4) away.set(0, 0, -1);
    away.normalize();
    // local +z points away from the camera: the bench is at the far end
    const court = new THREE.Group();
    court.position.copy(d.center); court.rotation.y = Math.atan2(away.x, away.z);
    // judge's bench, back wall and the scales emblem
    bx(court, 8, 2.4, 2, 0, 1.2, 9, m.dark); bx(court, 8.4, 0.2, 2.4, 0, 2.45, 9, m.gold);
    for (let x = -3; x <= 3; x += 2) bx(court, 1.4, 1.6, 0.1, x, 1.2, 7.98, m.wood);   // panel insets
    bx(court, 11, 8, 0.5, 0, 4, 11, m.dark); bx(court, 11.4, 0.3, 0.7, 0, 8, 11, m.gold);
    bx(court, 0.2, 2.4, 0.1, 0, 5.6, 10.7, m.gold); bx(court, 3, 0.16, 0.1, 0, 6.8, 10.7, m.gold);
    bx(court, 0.9, 0.08, 0.6, -1.4, 5.6, 10.6, m.gold); bx(court, 0.9, 0.08, 0.6, 1.4, 5.6, 10.6, m.gold);
    bx(court, 0.5, 0.3, 0.3, 2.6, 2.7, 8.8, m.wood);                                   // sound block
    // Judgeman presides behind the bench, facing the court
    const jm = makeJudgeman(2.1); jm.position.set(0, 2.2, 9.7); jm.rotation.y = Math.PI; court.add(jm);
    // defendant's stand (a railed box facing the bench)
    const stand = new THREE.Vector3(0, 0, 3.5);
    bx(court, 2.6, 0.25, 2.6, 0, 0.12, 3.5, m.dark);
    bx(court, 2.6, 1.3, 0.2, 0, 0.9, 4.7, m.wood); bx(court, 0.2, 1.3, 2.4, -1.2, 0.9, 3.5, m.wood); bx(court, 0.2, 1.3, 2.4, 1.2, 0.9, 3.5, m.wood);
    bx(court, 2.8, 0.12, 0.3, 0, 1.6, 4.7, m.gold);
    // counsel tables either side
    for (const sx of [-1, 1]) { bx(court, 2.6, 1.0, 1.2, sx * 5.2, 0.5, 4.2, m.dark); bx(court, 2.8, 0.1, 1.4, sx * 5.2, 1.05, 4.2, m.wood); }
    // spotlight shafts from the dark above
    for (const [x, z, w] of [[0, 3.5, 2.6], [0, 9.6, 3.2], [-5.2, 4.2, 2], [5.2, 4.2, 2]]) { const s = bx(court, w, 16, w, x, 8, z, m.shaft); s.castShadow = false; }
    // the evidence panel floats over the court, facing the camera
    const panel = textPanel(6.4, 3.2); panel.position.set(0, 5.2, 6.4); panel.rotation.y = Math.PI; panel.visible = false; court.add(panel);
    g.scene.add(court); court.updateMatrixWorld(true);
    this.court = court;
    this.courtLight = g.lights.attach(jm, 0xffe0a0, 7, 18, { offsetY: 3, priority: 5 });
    this.trialState = { t: 0, stage: 'session', did: false, jm, panel, stand: court.localToWorld(stand.clone()), d };
    this.forbid = true;
    this.installHook(g);
    g.audio?.gong();
    g.toast?.('⚖️ The court is now in session. Violence is forbidden.', 'big');
  }
  closeCourt(g) {
    this.forbid = false;
    this.releaseCourt(g);
    this.removeHook();
    if (this.courtLight) { g.lights.remove(this.courtLight); this.courtLight = null; }
    if (this.court) {
      this.trialState?.panel.userData.free();
      g.scene.remove(this.court); this.court = null;
    }
    this.trialState = null;
  }
  // No one may deal damage inside the courtroom: damage to anything inside is
  // refused at the source while the trial runs.
  installHook(g) {
    this.removeHook();
    const combat = g.combat, orig = combat.damageEnemy, kit = this;
    const hook = function (e, base, src, o) {
      if (kit.forbid && e && !e.dead && g.domainSys?.inside(e.pos)) { kit.forbidPing(src); return 0; }
      return orig.call(this, e, base, src, o);
    };
    this.hook = { combat, orig, hook, own: Object.prototype.hasOwnProperty.call(combat, 'damageEnemy') };
    combat.damageEnemy = hook;
  }
  removeHook() {
    const h = this.hook; if (!h) return;
    if (h.combat.damageEnemy === h.hook) { if (h.own) h.combat.damageEnemy = h.orig; else delete h.combat.damageEnemy; }
    this.hook = null;
  }
  forbidPing(src) {
    const g = this.game;
    if (!src?.isPlayer || g.time - (this.pingForbid ?? -9) < 2.5) return;
    this.pingForbid = g.time;
    g.toast?.('⚖️ Violence is forbidden in the courtroom');
    g.audio?.tone({ freq: 220, to: 200, dur: 0.4, gain: 0.12, type: 'triangle', rev: 0.5 });
  }
  // While the trial runs every curse inside stands still and cannot attack,
  // bosses included, and no player inside can be hurt.
  enforceCourt(g) {
    this.heldBosses = this.heldBosses || new Set();
    this.shielded = this.shielded || new Set();
    for (const e of g.enemies) {
      if (e.dead || e.isDummy || !g.domainSys.inside(e.pos)) continue;
      if (e.isBoss) { e.co = null; e.coWait = Math.max(e.coWait ?? 0, 0.3); e.anim = null; e.moving = false; e.untargetable = false; this.heldBosses.add(e); }
      else { e.sealT = Math.max(e.sealT ?? 0, 0.2); if (e.state === 'windup') { e.cancelAttack?.(); e.state = 'idle'; } }
    }
    for (const p of g.players) if (!p.dead && g.domainSys.inside(p.pos)) { p.invulnerable = true; this.shielded.add(p); }
  }
  releaseCourt() {
    for (const e of this.heldBosses ?? []) if (!e.dead) e.moving = true;
    for (const p of this.shielded ?? []) p.invulnerable = false;
    this.heldBosses = null; this.shielded = null;
  }
  pickDefendant(g) {
    let best = null, bs = -1;
    for (const e of g.enemies) {
      if (e.dead || e.isDummy || !g.domainSys.inside(e.pos)) continue;
      const s = (e.isBoss ? 1e6 : 0) + (e.maxHp ?? e.hp) * (1 + (e.evidence ?? 0) * 0.2) + (e.elite ? 60 : 0);
      if (s > bs) { bs = s; best = e; }
    }
    return best;
  }
  chargeFor(e) {
    const list = CHARGES[e.isBoss ? e.id : e.kind] ?? CHARGES.default;
    return list[Math.floor(Math.random() * list.length)];
  }
  runTrial(g, d, dt) {
    const T = this.trialState; if (!T) return;
    T.t += dt;
    const speed = 1 + this.rank('court') * 0.25;
    const jm = T.jm;
    jm.position.y = 2.2 + Math.sin(g.time * 2) * 0.12;
    tiltScales(jm, T.tilt ?? Math.sin(g.time * 1.3) * 0.12);
    if (this.forbid) this.enforceCourt(g);
    const once = () => { if (T.did) return false; T.did = true; return true; };
    const next = (stage) => { T.stage = stage; T.t = 0; T.did = false; };
    const def = T.defendant;
    if (def && def.dead && T.stage !== 'verdict' && T.stage !== 'adjourn') { g.toast?.('The defendant is gone — the court adjourns'); next('adjourn'); }
    switch (T.stage) {
      case 'session':
        if (T.t < 1.1 / speed) return;
        T.defendant = this.pickDefendant(g);
        if (!T.defendant) { g.toast?.('⚖️ No defendant stands before the court — adjourned'); next('adjourn'); return; }
        this.seatDefendant(g, T);
        next('evidence');
        return;
      case 'evidence':
        if (once()) {
          const e = def;
          T.evidence = (e.evidence ?? 0) + (e.isBoss ? 3 : e.def?.grade === '1' ? 2 : e.def?.grade === '2' ? 1 : 0);
          T.charge = this.chargeFor(e);
          T.panel.visible = true;
          T.panel.userData.draw('EVIDENCE', [`Defendant: ${e.displayName ?? e.name ?? 'Curse'}`, `Charge: ${T.charge}`, `Evidence presented: ×${Math.max(1, T.evidence)}`]);
          g.toast?.(`⚖️ Charge: ${T.charge}`, 'big');
          g.audio?.gong();
          // Judgeman points the evidence at the defendant
          const from = jm.getWorldPosition(new THREE.Vector3()); from.y += 3;
          const to = e.pos.clone().setY(e.pos.y + e.height * 0.6);
          g.fx.slashLine(from.clone(), tmp2.subVectors(to, from).normalize().clone(), from.distanceTo(to), GOLD, 0.3, 0.6);
          g.fx.summonCircle(e.pos, GOLD);
          for (let i = 0; i < 3; i++) g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.08 + i * 0.7, e.pos.z), { color: GOLD, r0: 2.2, r1: 1.2, dur: 0.8, thick: 0.08 });
        }
        if (Math.random() < 0.3) { const e = def; g.particles.glow.spawn({ x: e.pos.x + (Math.random() - 0.5), y: e.pos.y + Math.random() * e.height, z: e.pos.z + (Math.random() - 0.5), vy: 0.6, life: 0.6, r: 2.4, g: 1.9, b: 0.6, size: 0.1, drag: 1, sizeEnd: 0.3, shape: 'square' }); }
        if (T.t > 2.6 / speed) next('plea');
        return;
      case 'plea':
        if (once()) {
          let x = Math.random() * PLEAS.reduce((a, q) => a + q.w, 0), pl = PLEAS[0];
          for (const q of PLEAS) { x -= q.w; if (x <= 0) { pl = q; break; } }
          T.plea = pl;
          T.panel.userData.draw('THE PLEA', [`Charge: ${T.charge}`, pl.text]);
          g.toast?.(`⚖️ ${pl.text}`);
          g.audio?.tone({ freq: 330, to: 300, dur: 0.6, gain: 0.08, type: 'triangle', rev: 0.5 });
        }
        if (T.t > 2.2 / speed) next('verdict');
        return;
      case 'verdict':
        if (once()) this.verdict(g, T);
        T.tilt = (T.tilt ?? 0) + ((T.death ? -0.5 : 0.35) - (T.tilt ?? 0)) * Math.min(1, dt * 4);
        if (T.t > 2.4) next('adjourn');
        return;
      case 'adjourn':
        if (T.t > 1.4) { T.stage = 'done'; d.t = d.def.duration; }   // the domain collapses
        return;
    }
  }
  seatDefendant(g, T) {
    const e = T.defendant, at = T.stand;
    const gy = g.world.groundBelow(at.x, at.z, at.y + 3);
    if (isFinite(gy) && Math.abs(gy - at.y) < 3 && !g.world.solidAt(at.x, gy + 0.5, at.z) && !g.world.solidAt(at.x, gy + 1.5, at.z)) {
      g.fx.blinkPuff(e.pos, GOLD);
      e.pos.set(at.x, gy, at.z); e.vel?.set(0, 0, 0); e.knock?.set(0, 0, 0); e.visY = gy;
      if (this.court) e.facing = this.court.rotation.y;   // facing the bench
      g.fx.blinkPuff(e.pos, GOLD);
    }
    g.toast?.(`⚖️ The defendant: ${e.displayName ?? e.name ?? 'Curse'}`);
  }
  verdict(g, T) {
    const e = T.defendant;
    let pDeath = 0.08 + T.evidence * 0.06 + (e.isBoss ? 0.12 : 0) + this.rank('court') * 0.05 + (T.plea?.mod ?? 0);
    if (T.plea?.kind === 'denial') pDeath += T.evidence >= 4 ? 0.1 : -0.04;   // lying in the face of evidence
    T.death = Math.random() < Math.max(0.05, Math.min(0.72, pDeath));
    this.forbid = false; this.releaseCourt(g);
    g.audio?.gong(); g.audio?.impact(2.2, 'crit');
    g.shake(0.5); g.fx.chroma(1);
    g.slowMo(0.8, 0.3);
    if (T.death) {
      T.panel.userData.draw('DEATH PENALTY', [`The defendant is found GUILTY of ${T.charge}.`, 'Judgeman grants the Executioner\'s Sword.'], '#ff5a4a');
      g.toast?.('⚖️ GUILTY — DEATH PENALTY', 'domain');
      g.fx.flash(0x400000, 0.5, 0.35);
      const from = T.jm.getWorldPosition(new THREE.Vector3()); from.y += 5;
      this.bestowSword(g, from);
    } else {
      const dur = 20 + this.rank('verdict') * 4;
      T.panel.userData.draw('GUILTY', [`The defendant is found GUILTY of ${T.charge}.`, `Sentence: CONFISCATION of its cursed technique (${dur}s).`]);
      g.toast?.('⚖️ GUILTY — CONFISCATION', 'domain');
      g.fx.flash(0x302000, 0.45, 0.3);
      this.confiscate(e, dur);
    }
    if (e && !e.dead) e.evidence = 0;
  }
  // ------------------------------------------------------------ Confiscation
  confiscate(e, dur) {
    const g = this.game, m = M();
    if (!e || e.dead) return;
    e.confiscatedT = dur;
    e.cancelAttack?.();
    if (!e.isBoss) e.sealT = Math.max(e.sealT ?? 0, 1.2);
    if (!e.confIcon) {
      const icon = new THREE.Group();
      const ring = new THREE.Mesh(m.ring, m.ban); icon.add(ring);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.04), m.ban); bar.rotation.z = Math.PI / 4; icon.add(bar);
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.02), m.banGold); glyph.rotation.z = Math.PI / 4; glyph.position.z = -0.02; icon.add(glyph);
      g.scene.add(icon); e.confIcon = icon;
    }
    this.confiscated.add(e);
    const at = tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z);
    g.fx.rings.spawn(at, { color: GOLD, r0: 2.4, r1: 0.4, dur: 0.5, thick: 0.25 });
    g.fx.darkRings.spawn(at, { color: 0x000000, r0: 0.4, r1: 2.6, dur: 0.6, thick: 0.3 });
    g.fx.summonCircle(e.pos, GOLD);
    g.particles.burst(tmp.set(e.pos.x, e.pos.y + e.height + 0.4, e.pos.z), { count: 20, color: GOLD, speed: 2.5, life: 0.7, size: 0.12, shape: 1 });
    g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height * 0.4), 0, { text: 'CONFISCATED', color: '#ffd060', crit: true });
  }
  dropConfiscation(e) {
    if (e.confIcon) { this.game.scene.remove(e.confIcon); e.confIcon = null; }
    e.confiscatedT = 0;
    this.confiscated.delete(e);
  }
  // A confiscated technique: no attacks, no boss patterns.
  holdConfiscated(dt) {
    const g = this.game;
    for (const e of [...this.confiscated]) {
      e.confiscatedT -= dt;
      if (e.dead || e.confiscatedT <= 0 || !g.enemies.includes(e)) { if (!e.dead) g.fx.damageNumber(e.pos, 0, { text: 'technique returned', color: '#c8c8d8' }); this.dropConfiscation(e); continue; }
      if (e.isBoss) { e.co = null; e.coWait = Math.max(e.coWait ?? 0, 0.25); e.anim = null; e.untargetable = false; if (!this.forbid) e.moving = true; }
      else { e.cd = Math.max(e.cd ?? 0, 0.5); if (e.state === 'windup') { e.cancelAttack?.(); e.state = 'idle'; e.stateT = 0; } }
      const icon = e.confIcon;
      if (icon) { icon.position.set(e.pos.x, e.pos.y + e.height + 0.7 + Math.sin(g.time * 3) * 0.08, e.pos.z); icon.quaternion.copy(g.rig.camera.quaternion); }
    }
  }
  // ------------------------------------------------------------ Executioner's Sword
  bestowSword(g, from, dur = 12) {
    const p = this.p;
    const sw = makeSword(1.1);
    sw.position.copy(from); g.scene.add(sw);
    const light = g.lights.attach(sw, BLADE, 12, 14, { offsetY: 0, priority: 7 });
    g.fx.dimTarget = 0.4;
    g.audio?.charge(0.9, 0.6);
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      if (p.dead) { g.scene.remove(sw); g.lights.remove(light); g.fx.dimTarget = 0; return false; }
      const k = Math.min(1, t / 1.1);
      const hand = this.handPos(tmp);
      sw.position.lerpVectors(from, hand.setY(hand.y + 3 * (1 - k)), k * k);
      sw.rotation.y += dt * 6;
      g.particles.burst(sw.position, { count: 3, color: BLADE, speed: 1, life: 0.35, size: 0.4, sizeEnd: 0.1 });
      if (k < 1) return true;
      g.scene.remove(sw); g.lights.remove(light);
      g.fx.dimTarget = 0;
      g.fx.flash(0xfff0c0, 0.55, 0.3); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.2), 1.2, 0.5);
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: BLADE, r0: 0.4, r1: 4, dur: 0.5, thick: 0.15 });
      g.lights.flash(p.pos.clone().setY(p.pos.y + 2), BLADE, 16, 12, 0.6, { priority: 7 });
      g.shake(0.5); g.audio?.blackFlash(); g.audio?.energy('slash');
      this.grantSword(dur);
      return false;
    });
  }
  grantSword(dur) {
    const fresh = this.swordT <= 0;
    this.swordT = Math.max(this.swordT, dur + this.rank('sword') * 3 + (this.swordBonus ?? 0));
    this.combo = this.swordCombo;
    const x = this.p.rig.extras;
    if (x.sword) { x.sword.visible = true; if (x.weapon) x.weapon.visible = false; }
    if (fresh) { this.game.toast?.('🗡️ Executioner\'s Sword — its touch is certain death'); this.game.audio?.energy('infinity'); }
  }
  endSword() {
    this.swordT = 0; this.combo = this.gavelCombo;
    const x = this.p.rig.extras; if (x.sword) x.sword.visible = false; if (x.weapon) x.weapon.visible = true;
    this.game.toast?.('The Executioner\'s Sword fades');
  }
  onMeleeHit(e, step) {
    if (this.swordT <= 0 || e.dead) return;
    const g = this.game, p = this.p;
    const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
    if (e.isBoss) {
      if (g.time - (e.swordHitT ?? -9) < 0.9) return;   // one deathly cut per beat on a boss
      e.swordHitT = g.time;
      g.combat.damageEnemy(e, e.maxHp * 0.07, p, { unblockable: true, stagger: 0.5, crit: false, color: '#fff0b0', ceGain: 4 });
    } else {
      g.combat.damageEnemy(e, Math.max(e.hp, 1) * 6 + 200, p, { unblockable: true, stagger: 1, crit: false, color: '#fff0b0', ceGain: 4 });
      g.fx.damageNumber(at, 0, { text: 'EXECUTED', color: '#fff0b0', crit: true });
    }
    g.fx.slashLine(at.clone().add(new THREE.Vector3(-1.4, 1.2, 0)), new THREE.Vector3(1, -0.8, Math.random() - 0.5).normalize(), 3.2, BLADE, 0.55, 0.22, Math.random());
    g.fx.hitSpark(at, null, { color: BLADE, big: true });
    g.lights.flash(at, BLADE, 8, 8, 0.2);
  }
  // ------------------------------------------------------------ tick
  tick(dt) {
    const g = this.game, p = this.p;
    if (this.swordT > 0) {
      this.swordT -= dt;
      if (Math.random() < 0.6) { const h = this.handPos(tmp); g.particles.glow.spawn({ x: h.x + (Math.random() - 0.5) * 0.6, y: h.y + (Math.random() - 0.5) * 0.6, z: h.z + (Math.random() - 0.5) * 0.6, vy: 0.6, life: 0.4, r: 3, g: 2.6, b: 1.4, size: 0.1, drag: 1, shape: 'square' }); }
      if (this.swordT <= 0) this.endSword();
    }
    this.holdConfiscated(dt);
    // Judgeman hovers at your shoulder, gathering evidence
    const j = this.judgeman;
    if (j) {
      j.t -= dt; j.fire -= dt;
      const side = tmp.set(Math.cos(p.facing), 0, -Math.sin(p.facing));
      j.mesh.position.set(p.pos.x + side.x * 1.4 - Math.sin(p.facing) * 0.8, p.pos.y + 0.9 + Math.sin(g.time * 3) * 0.12, p.pos.z + side.z * 1.4 - Math.cos(p.facing) * 0.8);
      j.mesh.rotation.y = p.facing;
      tiltScales(j.mesh, Math.sin(g.time * 2) * 0.15);
      if (j.fire <= 0) {
        j.fire = 1.4 - this.rank('evidence') * 0.25;
        let e = null, bs = Infinity;
        for (const c of g.enemies) {
          if (c.dead || c.isDummy || (c.evidence ?? 0) >= 5) continue;
          const dd = c.pos.distanceTo(p.pos); if (dd > 14) continue;
          const s = dd - (c.isBoss ? 20 : 0);   // bosses first
          if (s < bs) { bs = s; e = c; }
        }
        if (e) {
          const from = j.mesh.position.clone().setY(j.mesh.position.y + 1.9);
          const to = e.pos.clone().setY(e.pos.y + e.height * 0.6);
          const dir = tmp2.subVectors(to, from); const len = dir.length();
          g.fx.slashLine(from, dir.normalize(), len, GOLD, 0.2, 0.25);
          e.evidence = Math.min(5, (e.evidence ?? 0) + (this.proof ?? 1));
          g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height * 0.4), 0, { text: `EVIDENCE ×${e.evidence}`, color: '#ffe8a0' });
          g.audio?.tone({ freq: 520, to: 780, dur: 0.12, gain: 0.06, type: 'triangle', rev: 0.3 });
        }
      }
      if (j.t <= 0) this.dismissJudgeman();
    }
    if (Math.random() < 0.2) for (const e of g.enemies) if (!e.dead && e.evidence && Math.random() < 0.3) g.particles.glow.spawn({ x: e.pos.x, y: e.pos.y + e.height + 0.3, z: e.pos.z, vy: 0.4, life: 0.5, r: 2.4, g: 1.9, b: 0.6, size: 0.08 + e.evidence * 0.02, drag: 1, sizeEnd: 1, shape: 'square' });
  }
  // ------------------------------------------------------------ gavel techniques
  // A giant gavel pivoting behind `at` swings down onto it along `face`.
  swingGavel(at, face, s, onHit) {
    const g = this.game;
    const { gv, arm } = makeGavel(s);
    gv.position.copy(at).addScaledVector(tmp.set(Math.sin(face), 0, Math.cos(face)), -3.4 * s); gv.rotation.y = face;
    arm.rotation.x = -0.9;
    g.scene.add(gv);
    let t = 0, hit = false;
    g.addUpdater((dt) => {
      t += dt;
      arm.rotation.x = -0.9 + Math.min(1, Math.max(0, (t - 0.12) / 0.14)) * (0.9 + Math.PI / 2);
      if (!hit && t >= 0.26) { hit = true; onHit(); }
      if (t > 0.6) gv.scale.setScalar(Math.max(0.01, 1 - (t - 0.6) * 5));
      if (t > 0.8) { g.scene.remove(gv); return false; }
      return true;
    });
  }
  snapGround(at) { const gy = this.game.world.groundBelow(at.x, at.z, this.p.pos.y + 3); at.y = isFinite(gy) ? gy : this.p.pos.y; return at; }
  gavelStrike() {
    const g = this.game, p = this.p, rk = this.rank('gavel');
    const at = p.aimPoint.clone();
    tmp.subVectors(at, p.pos).setY(0); if (tmp.length() > 8) at.copy(p.pos).addScaledVector(tmp.normalize(), 8);
    this.snapGround(at);
    this.p.action = { type: 'attack', step: { style: 'slam', strike: 0.5, windup: 0.35 }, style: 'slam', dur: 0.45, elapsed: 0, t: 0, windup: 0.35, strike: 0.5, struck: true, moveScale: 0.3 };
    p.facing = Math.atan2(at.x - p.pos.x, at.z - p.pos.z);
    this.swingGavel(at, p.facing, 1 + rk * 0.15, () => {
      g.combat.aoe(at, 2.2 + rk * 0.3, (20 + rk * 6) * (this.gavelMul ?? 1), p, { knock: 6, stagger: 0.6 });
      g.fx.shockwave(at, GOLD, 3 + rk * 0.4); g.fx.debris(at.clone().setY(at.y + 0.3), 0x8a7a6a, 4);
      g.shake(0.3); g.hitStop(0.04); g.audio?.impact(1.5);
    });
    g.audio?.whoosh(1);
  }
  gavelVanish() {
    const g = this.game, p = this.p, rk = this.rank('gavel');
    const e = this.aimTarget() ?? g.nearestEnemy(p.pos, 10);
    if (!e || e.pos.distanceTo(p.pos) > 12) { g.toast?.('No target in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.35);
    p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    const x = p.rig.extras;
    if (x.weapon && this.swordT <= 0) x.weapon.visible = false;
    g.fx.blinkPuff(this.handPos(tmp), GOLD);
    g.audio?.energy('teleport');
    // it reappears on the far side and swings back toward Higuruma
    const face = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    const at = this.snapGround(e.pos.clone());
    g.fx.blinkPuff(at.clone().addScaledVector(tmp.set(Math.sin(face), 0, Math.cos(face)), -2.2).setY(at.y + 2), GOLD);
    this.swingGavel(at, face, 0.8 + rk * 0.1, () => {
      if (!e.dead) g.combat.damageEnemy(e, (34 + rk * 10) * (this.gavelMul ?? 1), p, { unblockable: true, stagger: 0.9, knock: tmp.subVectors(p.pos, e.pos).setY(0).normalize().multiplyScalar(6) });
      g.combat.aoe(at, 1.8, 10 + rk * 3, p, { stagger: 0.3, blocks: false });
      g.fx.shockwave(at, GOLD, 2.4); g.fx.hitSpark(at.clone().setY(at.y + 1), null, { color: GOLD, big: true });
      g.shake(0.3); g.hitStop(0.05); g.audio?.impact(1.6, 'crit');
      if (x.weapon && this.swordT <= 0) x.weapon.visible = true;
    });
  }
  gavelSweep() {
    const g = this.game, p = this.p, rk = this.rank('gavel');
    const s = 2.1 + rk * 0.25, R = 3.6 * s;
    this.cast(0.55, true, { lock: true });
    const face = Math.atan2(p.aimDir.x, p.aimDir.z); p.facing = face;
    const { gv, arm } = makeGavel(s);
    arm.rotation.x = Math.PI / 2; arm.position.y = 0.9;   // held out level
    gv.position.copy(p.pos); gv.rotation.y = face + 1.7;
    g.scene.add(gv);
    g.audio?.charge(0.25, 1.2);
    let t = 0, hit = false;
    g.addUpdater((dt) => {
      t += dt;
      gv.position.copy(p.pos);
      const k = Math.min(1, Math.max(0, (t - 0.18) / 0.26));
      gv.rotation.y = face + 1.7 - k * 3.4;
      if (!hit && t >= 0.31) {
        hit = true;
        const dir = tmp.set(Math.sin(face), 0, Math.cos(face));
        for (const e of g.combat.query(p.pos, dir, R, 1.75)) {
          const k2 = tmp2.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(e.isBoss ? 3 : 14);
          g.combat.damageEnemy(e, (42 + rk * 12) * (this.gavelMul ?? 1), p, { knock: k2.clone(), stagger: 1 });
        }
        g.combat.hitBlocks(p.pos, dir, R, 1.75, 60, p);
        g.fx.slashArc(p.pos, face, GOLD, R, 1.75, 0.3);
        g.fx.shockwave(p.pos.clone().addScaledVector(dir, R * 0.5), GOLD, R * 0.6);
        g.shake(0.5); g.hitStop(0.06); g.audio?.impact(2, 'crit'); g.audio?.whoosh(1.6);
      }
      if (t > 0.6) gv.scale.setScalar(Math.max(0.01, 1 - (t - 0.6) * 5));
      if (t > 0.8) { g.scene.remove(gv); return false; }
      return true;
    });
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
    g.toast?.('⚖️ Judgeman: gathering evidence');
  }
  dismissJudgeman() {
    if (!this.judgeman) return;
    this.game.fx.blinkPuff(this.judgeman.mesh.position, GOLD);
    this.game.scene.remove(this.judgeman.mesh); this.judgeman = null;
  }
  // ================================================================ library abilities
  incoming(amount) { return this.attorney && this.judgeman ? amount * 0.85 : amount; }
  freeMesh(o) { this.game.scene.remove(o); o.traverse((c) => c.geometry?.dispose?.()); }
  // ------------------------------------------------------------ Gavel
  gavelToss() {
    const g = this.game, p = this.p, rk = this.rank('gavel'), gm = this.gavelMul ?? 1;
    this.cast(0.3);
    const dir = this.fwd(); p.facing = Math.atan2(dir.x, dir.z);
    const s = 0.45 + rk * 0.05;
    const { gv, arm } = makeGavel(s);
    const spin = new THREE.Group(); gv.remove(arm); spin.add(arm); arm.position.y = -2 * s; gv.add(spin);
    gv.rotation.y = p.facing; spin.rotation.order = 'YXZ';
    g.scene.add(gv);
    const x = p.rig.extras; if (x.weapon && this.swordT <= 0) x.weapon.visible = false;
    const hits = new Map(), L = 10 + rk;
    g.audio?.whoosh(1);
    this.during(0.95, (t, dt, k) => {
      const out = Math.sin(k * Math.PI) * L;
      gv.position.set(p.pos.x + dir.x * out, p.pos.y + 1.2, p.pos.z + dir.z * out);
      spin.rotation.x += dt * 22;
      if (Math.random() < 0.5) g.particles.burst(gv.position, { count: 1, color: GOLD, speed: 0.5, life: 0.25, size: 0.12, shape: 1 });
      for (const e of this.foes(gv.position, 1.3)) {
        if (g.time - (hits.get(e) ?? -9) < 0.35) continue;
        hits.set(e, g.time);
        this.hit(e, (14 + rk * 4) * gm, { stagger: 0.4, knock: tmp.subVectors(e.pos, gv.position).setY(0).normalize().multiplyScalar(4) });
        g.fx.hitSpark(gv.position, null, { color: GOLD }); g.audio?.impact(0.9);
      }
    }, () => { this.freeMesh(gv); if (x.weapon && this.swordT <= 0) x.weapon.visible = true; });
  }
  gavelPound() {
    const g = this.game, p = this.p, rk = this.rank('gavel'), gm = this.gavelMul ?? 1;
    this.cast(0.5, true);
    const dir = this.fwd(), face = Math.atan2(dir.x, dir.z);
    const spots = [2.6, 5.2, 7.8].map((d) => { const at = p.pos.clone().addScaledVector(dir, d); at.y = this.groundAt(at.x, at.z, p.pos.y); return at; });
    for (const at of spots) g.fx.rings.spawn(tmp.set(at.x, at.y + 0.07, at.z), { color: GOLD, r0: 2.3, r1: 2.1, dur: 0.6, thick: 0.1 });
    spots.forEach((at, i) => this.after(0.15 + i * 0.22, () => this.swingGavel(at, face, 1.1 + rk * 0.1, () => {
      g.combat.aoe(at, 2.3, (22 + rk * 6) * gm, p, { knock: 6, stagger: 0.6 });
      g.fx.shockwave(at, GOLD, 3); g.fx.debris(at.clone().setY(at.y + 0.3), 0x8a7a6a, 4);
      g.shake(0.25); g.audio?.impact(1.4);
    })));
  }
  supremeGavel() {
    const g = this.game, p = this.p, rk = this.rank('gavel'), gm = this.gavelMul ?? 1;
    const at = this.aimGround(10), R = 5 + rk * 0.4;
    this.cast(0.6, true, { lock: true });
    const face = Math.atan2(at.x - p.pos.x, at.z - p.pos.z); p.facing = face;
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.07, at.z), { color: GOLD, r0: R, r1: R * 0.97, dur: 0.85, thick: 0.12 });
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.08, at.z), { color: GOLD, r0: R, r1: 0.3, dur: 0.85, thick: 0.2 });
    g.audio?.charge(0.6, 0.9);
    this.after(0.55, () => this.swingGavel(at, face, 3.2 + rk * 0.2, () => {
      this.blast(at, R, (90 + rk * 20) * gm, { color: GOLD, knock: 10, stagger: 1 });
      for (const e of this.foes(at, R)) this.stun(e, 1);
      g.fx.debris(at.clone().setY(at.y + 0.3), 0x8a7a6a, 12);
      g.fx.flash(0xfff0c0, 0.25, 0.2); g.hitStop(0.08); g.audio?.gong();
    }));
  }
  // ------------------------------------------------------------ Judgeman
  addEvidence(e, n) { e.evidence = Math.min(5, (e.evidence ?? 0) + n); this.game.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height * 0.4), 0, { text: `EVIDENCE ×${e.evidence}`, color: '#ffe8a0' }); }
  exhibit() {
    const g = this.game, p = this.p;
    const list = this.foes(p.pos, 10, this.fwd(), 0.8);
    if (!list.length) { g.toast?.('No curse to present evidence against'); g.audio?.ui('back'); return false; }
    this.cast(0.35);
    const from = p.pos.clone().setY(p.pos.y + 1.8);
    for (const e of list) {
      const to = e.pos.clone().setY(e.pos.y + e.height * 0.6);
      const d = tmp2.subVectors(to, from); const len = d.length();
      g.fx.slashLine(from, d.normalize().clone(), len, GOLD, 0.2, 0.3);
      this.hit(e, 4, { stagger: 0.5, ceGain: 1 });
      this.addEvidence(e, 2);
      g.particles.burst(to, { count: 8, color: 0xf2e6c8, speed: 2.5, life: 0.5, size: 0.14, shape: 1 });
    }
    g.toast?.('📁 Exhibit A');
    g.audio?.tone({ freq: 520, to: 780, dur: 0.15, gain: 0.07, type: 'triangle', rev: 0.3 });
  }
  crossExam() {
    const g = this.game, p = this.p, e = this.target(12);
    if (!e) { g.toast?.('No witness in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.4);
    this.stun(e, 2.5); this.hit(e, 6, { stagger: 0.6, ceGain: 1 });
    this.addEvidence(e, 3);
    g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height + 0.4), 0, { text: '❓ CROSS-EXAMINATION', color: '#ffd060', crit: true });
    const from = p.pos.clone().setY(p.pos.y + 1.8), to = e.pos.clone().setY(e.pos.y + e.height * 0.6);
    g.fx.slashLine(from, tmp2.subVectors(to, from).normalize().clone(), from.distanceTo(to), GOLD, 0.25, 0.35);
    let tick = 0;
    this.during(2.5, (t, dt) => {
      if (e.dead) return false;
      tick -= dt;
      if (tick <= 0) { tick = 0.5; for (let i = 0; i < 3; i++) g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.1 + i * 0.6, e.pos.z), { color: GOLD, r0: 1.3, r1: 1.2, dur: 0.5, thick: 0.06 }); }
    });
    g.audio?.tone({ freq: 440, to: 660, dur: 0.3, gain: 0.07, type: 'triangle', rev: 0.4 });
  }
  weighEvidence() {
    const g = this.game, p = this.p, rk = this.rank('evidence');
    const list = g.enemies.filter((e) => !e.dead && (e.evidence ?? 0) > 0 && e.pos.distanceTo(p.pos) < 16);
    if (!list.length) { g.toast?.('No evidence to weigh — let Judgeman gather some'); g.audio?.ui('back'); return false; }
    this.cast(0.6, true);
    const jm = makeJudgeman(1.6);
    const fw = this.fwd();
    jm.position.copy(p.pos).addScaledVector(fw, 1.2).setY(p.pos.y + 1.2); jm.rotation.y = Math.atan2(fw.x, fw.z);
    g.scene.add(jm); g.fx.blinkPuff(jm.position, GOLD);
    g.audio?.gong();
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      tiltScales(jm, Math.sin(t * 9) * 0.4 * Math.max(0, 1 - t));
      if (t < 1.4 && !this.disposed) return true;
      g.fx.blinkPuff(jm.position, GOLD); this.freeMesh(jm); return false;
    });
    this.after(0.55, () => {
      const top = jm.position.clone().setY(jm.position.y + 2.6);
      list.forEach((e, i) => this.after(i * 0.05, () => {
        if (e.dead) return;
        const ev = e.evidence ?? 1, to = e.pos.clone().setY(e.pos.y + e.height * 0.6);
        g.fx.slashLine(top, tmp2.subVectors(to, top).normalize().clone(), top.distanceTo(to), GOLD, 0.3, 0.3);
        this.hit(e, (18 + ev * 14) * (1 + rk * 0.1), { unblockable: true, stagger: 0.8, color: '#ffd060' });
        g.fx.hitSpark(to, null, { color: GOLD, big: ev >= 3 });
        e.evidence = Math.floor(ev / 2);
      }));
      g.shake(0.3); g.audio?.impact(1.6, 'crit');
    });
  }
  judgemanGuard() {
    const g = this.game, p = this.p;
    if (this.buffs.has('jm_guard')) { const b = this.buffs.get('jm_guard'); b.hits = 3; b.left = 6; return; }
    this.cast(0.35);
    const jm = makeJudgeman(1.1);
    g.scene.add(jm); g.fx.summonCircle(p.pos, GOLD);
    g.audio?.energy('summon');
    let b = null;
    b = this.buff('jm_guard', 6, { hits: 3,
      incoming: (amt, src) => {
        b.hits--;
        g.fx.blinkPuff(jm.position.clone().setY(jm.position.y + 1), GOLD);
        g.fx.rings.spawn(tmp.set(jm.position.x, jm.position.y + 1, jm.position.z), { color: GOLD, r0: 0.3, r1: 1.6, dur: 0.25, thick: 0.12 });
        g.audio?.tone({ freq: 700, to: 500, dur: 0.15, gain: 0.08, type: 'triangle' });
        if (src && src.pos && !src.isPlayer && !src.dead && g.enemies.includes(src)) this.addEvidence(src, 1);
        if (b.hits <= 0) b.left = 0;
        return 0;
      },
      onTick: () => {
        jm.position.set(p.pos.x + Math.sin(p.facing) * 1.1, p.pos.y + Math.sin(g.time * 3) * 0.08, p.pos.z + Math.cos(p.facing) * 1.1);
        jm.rotation.y = p.facing; tiltScales(jm, Math.sin(g.time * 2) * 0.15);
      },
      onEnd: () => { g.fx.blinkPuff(jm.position, GOLD); this.freeMesh(jm); } });
    g.toast?.('🛡️ Judgeman takes the stand (3 hits)');
  }
  // ------------------------------------------------------------ Court
  objection() {
    const g = this.game, p = this.p, gm = this.gavelMul ?? 1;
    this.cast(0.3, false, { type: 'raise' });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GOLD, r0: 1.6, r1: 1.4, dur: 1.2, thick: 0.1 });
    let used = false, b = null;
    b = this.buff('objection', 1.2, {
      onTick: () => { if (Math.random() < 0.4) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5), y: p.pos.y + 1 + Math.random(), z: p.pos.z + (Math.random() - 0.5), vy: 0.6, life: 0.4, r: 2.4, g: 1.9, b: 0.6, size: 0.1, drag: 1, shape: 'square' }); },
      incoming: (amt, src) => {
        if (used) return amt;
        used = true; b.left = 0;
        g.toast?.('✋ OBJECTION! — sustained', 'big');
        g.fx.flash(0xfff0c0, 0.25, 0.15); g.audio?.gong();
        const t = src && src.pos && !src.dead && g.enemies.includes(src) && src.pos.distanceTo(p.pos) < 10 ? src : g.nearestEnemy(p.pos, 5);
        p.iframes = Math.max(p.iframes, 0.5);
        if (t) {
          const at = this.snapGround(t.pos.clone());
          this.swingGavel(at, Math.atan2(at.x - p.pos.x, at.z - p.pos.z), 1.2, () => {
            if (!t.dead) { this.hit(t, 45 * gm, { unblockable: true, stagger: 1, knock: tmp.subVectors(t.pos, p.pos).setY(0).normalize().multiplyScalar(8) }); this.stun(t, 1.2); }
            g.fx.shockwave(at, GOLD, 2.5); g.shake(0.3); g.audio?.impact(1.6, 'crit');
          });
        }
        return 0;
      } });
  }
  recess() {
    const g = this.game, p = this.p;
    const back = this.fwd().multiplyScalar(-1);
    for (const d of [6, 4.5, 3]) {
      if (this.blink(p.pos.clone().addScaledVector(back, d), { color: GOLD, quiet: true, iframes: 0.4 })) {
        p.slowT = 0;
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GOLD, r0: 0.3, r1: 2, dur: 0.3, thick: 0.12 });
        g.audio?.energy('teleport');
        return;
      }
    }
    g.audio?.ui('back'); return false;
  }
  orderInCourt() {
    const g = this.game, p = this.p, gm = this.gavelMul ?? 1, R = 6.5;
    this.pose('slam', 0.4);
    const n = g.combat.aoe(p.pos, R, 12 * gm, p, { stagger: 0.6, knock: 3 });
    for (const e of this.foes(p.pos, R)) this.stun(e, 1.5);
    for (let i = 0; i < 3; i++) this.after(i * 0.12, () => g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1 + i * 0.4, p.pos.z), { color: GOLD, r0: 0.5, r1: R, dur: 0.45, thick: 0.12 }));
    g.fx.shockwave(p.pos, GOLD, R); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 0.6, 0.4);
    g.toast?.('📢 ORDER IN THE COURT!', 'big');
    g.audio?.gong(); g.shake(0.3); if (n) g.hitStop(0.04);
  }
  subpoena() {
    const g = this.game, p = this.p, e = this.target(14);
    if (!e) { g.toast?.('No curse to summon'); g.audio?.ui('back'); return false; }
    this.cast(0.4);
    const from = p.pos.clone().setY(p.pos.y + 1.3), to = e.pos.clone().setY(e.pos.y + e.height * 0.6);
    g.fx.slashLine(from, tmp2.subVectors(to, from).normalize().clone(), from.distanceTo(to), GOLD, 0.18, 0.35);
    g.fx.slashLine(from, tmp2, from.distanceTo(to), 0xf2e6c8, 0.06, 0.3, Math.PI / 2);
    const fw = tmp.subVectors(e.pos, p.pos).setY(0).normalize();
    const dest = p.pos.clone().addScaledVector(fw, 1.4 + (e.radius ?? 0.5));
    const w = g.world, gy = w.groundBelow(dest.x, dest.z, p.pos.y + 3);
    if (!e.isBoss && isFinite(gy) && Math.abs(gy - p.pos.y) < 3 && !w.solidAt(dest.x, gy + 0.5, dest.z) && !w.solidAt(dest.x, gy + 1.5, dest.z)) {
      g.fx.blinkPuff(e.pos, GOLD);
      e.pos.set(dest.x, gy, dest.z); e.vel?.set(0, 0, 0); e.knock?.set(0, 0, 0); e.visY = gy;
      g.fx.blinkPuff(e.pos, GOLD);
    } else e.knock?.addScaledVector(fw, -6);
    this.hit(e, 10 * (this.gavelMul ?? 1), { stagger: 0.6 });
    this.stun(e, 0.8);
    g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height + 0.3), 0, { text: '📜 SUBPOENA', color: '#ffd060' });
    g.audio?.energy('teleport');
  }
  pleaBargain() {
    if (this.rctHeal(0.25, 2, GOLD) === false) return false;
    this.p.slowT = 0;
    this.game.toast?.('🤝 Plea bargain accepted');
  }
  defenceCounsel() {
    const g = this.game, p = this.p;
    this.cast(0.35, false, { type: 'raise' });
    this.statBuff('counsel', 10, { techMult: 0.25 }, {
      incoming: (amt) => amt * 0.85,
      onTick: () => { if (Math.random() < 0.3) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.8, y: p.pos.y + Math.random() * 1.8, z: p.pos.z + (Math.random() - 0.5) * 0.8, vy: 1, life: 0.6, r: 3, g: 2.4, b: 0.4, size: 0.1, drag: 1, sizeEnd: 0.1, shape: 'square' }); } });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0xffd23a, r0: 0.3, r1: 3, dur: 0.45, thick: 0.15 });
    g.toast?.('🌻 Defence Counsel');
    g.audio?.energy('infinity');
  }
  // ------------------------------------------------------------ Verdict
  guiltyStamp() {
    const g = this.game, p = this.p, R = 3.6;
    const c = this.aimGround(9);
    this.cast(0.45, true);
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.07, c.z), { color: RED, r0: R, r1: R * 0.96, dur: 0.5, thick: 0.12 });
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: RED, r0: R, r1: 0.3, dur: 0.5, thick: 0.2 });
    const seal = textPanel(5.2, 2.6); seal.userData.draw('GUILTY', ['有罪'], '#ff4a4a');
    seal.rotation.x = -Math.PI / 2; seal.rotation.z = -Math.atan2(c.x - p.pos.x, c.z - p.pos.z) + Math.PI;
    seal.position.set(c.x, c.y + 6, c.z); g.scene.add(seal);
    let t = 0, landed = false;
    g.addUpdater((dt) => {
      t += dt;
      if (this.disposed) { g.scene.remove(seal); seal.userData.free(); return false; }
      if (t > 0.35) seal.position.y = Math.max(c.y + 0.12, seal.position.y - dt * 50);
      if (!landed && t > 0.45) {
        landed = true;
        for (const e of this.foes(c, R)) {
          const ev = e.evidence ?? 0;
          this.hit(e, (30 + ev * 12) * (1 + this.rank('verdict') * 0.1), { unblockable: true, stagger: 0.8, color: '#ff4a4a' });
          if (ev) g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height * 0.4), 0, { text: `GUILTY ×${ev}`, color: '#ff4a4a', crit: true });
          e.evidence = 0;
        }
        g.fx.shockwave(c, RED, R + 0.5); g.shake(0.4); g.hitStop(0.05); g.audio?.impact(1.8, 'crit'); g.audio?.gong();
      }
      if (t > 1.2) seal.material.opacity = Math.max(0, 1 - (t - 1.2) * 2.5);
      if (t < 1.6) return true;
      g.scene.remove(seal); seal.userData.free(); return false;
    });
  }
  bestEvidence(min) {
    const g = this.game, p = this.p;
    const t = this.target(14);
    if (t && (t.evidence ?? 0) >= min) return t;
    let best = null, bs = -1;
    for (const e of g.enemies) {
      if (e.dead || (e.evidence ?? 0) < min || e.pos.distanceTo(p.pos) > 14) continue;
      const s = (e.isBoss ? 1e6 : 0) + (e.maxHp ?? e.hp);
      if (s > bs) { bs = s; best = e; }
    }
    return best;
  }
  summaryConfiscation() {
    const g = this.game, p = this.p, e = this.bestEvidence(3);
    if (!e) { g.toast?.('⚖️ Insufficient evidence — a curse needs 3 Evidence'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    e.evidence -= 3;
    const from = p.pos.clone().setY(p.pos.y + 1.8), to = e.pos.clone().setY(e.pos.y + e.height * 0.6);
    g.fx.slashLine(from, tmp2.subVectors(to, from).normalize().clone(), from.distanceTo(to), GOLD, 0.3, 0.4);
    this.confiscate(e, 6 + this.rank('verdict') * 2);
    g.toast?.('⚖️ Summary judgment: CONFISCATION', 'big');
    g.audio?.gong(); g.fx.flash(0x302000, 0.3, 0.2);
  }
  summaryDeath() {
    const g = this.game, p = this.p, e = this.bestEvidence(5);
    if (!e) { g.toast?.('⚖️ Insufficient evidence — a curse needs 5 Evidence'); g.audio?.ui('back'); return false; }
    this.cast(0.6, true, { type: 'raise' });
    e.evidence = 0;
    g.toast?.('⚖️ Summary judgment: DEATH PENALTY', 'domain');
    g.fx.flash(0x400000, 0.4, 0.3); g.audio?.gong();
    g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height + 0.4), 0, { text: 'SENTENCED', color: '#ff5a4a', crit: true });
    this.bestowSword(g, p.pos.clone().setY(p.pos.y + 6), 6);
  }
  executionerCut() {
    const g = this.game, p = this.p, dir = this.fwd(), L = 12, W = 1.2;
    const from = p.pos.clone().setY(p.pos.y + 1.1);
    this.pose('swingR', 0.35);
    p.facing = Math.atan2(dir.x, dir.z);
    if (this.swordT > 0) {
      g.fx.slashLine(from, dir, L, BLADE, W * 2, 0.35, 0); g.fx.slashLine(from, dir, L, 0xffffff, W * 0.6, 0.25, 0);
      g.lights.flash(from.clone().addScaledVector(dir, 4), BLADE, 14, 12, 0.25);
      this.line(p.pos, dir, L, W, (e) => {
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.55);
        if (e.isBoss) this.hit(e, e.maxHp * 0.1, { unblockable: true, stagger: 0.8, crit: false, color: '#fff0b0' });
        else { this.hit(e, Math.max(e.hp, 1) * 6 + 200, { unblockable: true, stagger: 1, crit: false, color: '#fff0b0' }); g.fx.damageNumber(at, 0, { text: 'EXECUTED', color: '#fff0b0', crit: true }); }
        g.fx.hitSpark(at, dir, { color: BLADE, big: true });
      });
      this.swordT = Math.max(0.05, this.swordT - 3);
      g.shake(0.45); g.hitStop(0.06); g.audio?.blackFlash(); g.audio?.energy('slash');
    } else {
      const rk = this.rank('gavel');
      g.fx.slashLine(from, dir, L, GOLD, W * 1.6, 0.3, 0); g.fx.slashLine(from, dir, L, 0xfff0c0, W * 0.4, 0.25, Math.PI / 2);
      this.line(p.pos, dir, L, W, (e) => { this.hit(e, (40 + rk * 10) * (this.gavelMul ?? 1), { stagger: 0.7, knock: dir.clone().multiplyScalar(e.isBoss ? 2 : 8) }); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), dir, { color: GOLD }); });
      for (let s = 1; s < L; s += 1.5) g.combat.hitBlocks(from.clone().addScaledVector(dir, s).setY(p.pos.y), dir, 1, Math.PI, 30, p);
      g.shake(0.3); g.audio?.whoosh(1.4); g.audio?.impact(1.3);
    }
  }
  dispose() {
    super.dispose();
    this.dismissJudgeman();
    this.closeCourt(this.game);
    for (const e of [...this.confiscated]) this.dropConfiscation(e);
    this.swordT = 0; this.combo = this.gavelCombo;
  }
}
registerKit('higuruma', HigurumaKit, HIGURUMA_SKILLS);
