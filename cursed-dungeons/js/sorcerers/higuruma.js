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
import { Kit } from './kit.js';
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
  { id: 'gavel', name: 'Heavy Gavel', desc: '+8% melee damage per rank and bigger gavel techniques.', max: 3 },
  { id: 'evidence', name: 'Evidence', desc: 'Judgeman gathers evidence faster and stays longer. More evidence, harsher verdicts.', max: 3 },
  { id: 'verdict', name: 'Confiscation', desc: 'A confiscated technique stays sealed 4s longer per rank.', max: 2 },
  { id: 'sword', name: 'Executioner\'s Sword', desc: 'The sword lasts 3s longer per rank.', max: 3 },
  { id: 'court', name: 'Courtroom', desc: 'The trial moves faster and the death penalty is more likely.', max: 2, req: 'evidence' },
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
    this.slots = {
      ranged: this.ability({ name: 'Gavel Strike', icon: '🔨', cd: 1.5, ce: 0, use: () => this.gavelStrike() }),
      t1: this.ability({ name: 'Judgeman', icon: '⚖️', cd: 14, ce: 12, use: () => this.summonJudgeman() }),
      t2: this.ability({ name: 'Gavel: Vanish', icon: '🫥', cd: 7, ce: 16, use: () => this.gavelVanish() }),
      t3: this.ability({ name: 'Gavel: Enlarge', icon: '🔨', cd: 11, ce: 24, use: () => this.gavelSweep() }),
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
        if (Math.random() < 0.3) { const e = def; g.particles.glow.emit(e.pos.x + (Math.random() - 0.5), e.pos.y + Math.random() * e.height, e.pos.z + (Math.random() - 0.5), 0, 0.6, 0, 0.6, 2.4, 1.9, 0.6, 0.1, 0, 1, 0.3, 1); }
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
  bestowSword(g, from) {
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
      this.grantSword(12);
      return false;
    });
  }
  grantSword(dur) {
    const fresh = this.swordT <= 0;
    this.swordT = Math.max(this.swordT, dur + this.rank('sword') * 3);
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
      if (Math.random() < 0.6) { const h = this.handPos(tmp); g.particles.glow.emit(h.x + (Math.random() - 0.5) * 0.6, h.y + (Math.random() - 0.5) * 0.6, h.z + (Math.random() - 0.5) * 0.6, 0, 0.6, 0, 0.4, 3, 2.6, 1.4, 0.1, 0, 1, 0.2, 1); }
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
          e.evidence = Math.min(5, (e.evidence ?? 0) + 1);
          g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height * 0.4), 0, { text: `EVIDENCE ×${e.evidence}`, color: '#ffe8a0' });
          g.audio?.tone({ freq: 520, to: 780, dur: 0.12, gain: 0.06, type: 'triangle', rev: 0.3 });
        }
      }
      if (j.t <= 0) this.dismissJudgeman();
    }
    if (Math.random() < 0.2) for (const e of g.enemies) if (!e.dead && e.evidence && Math.random() < 0.3) g.particles.glow.emit(e.pos.x, e.pos.y + e.height + 0.3, e.pos.z, 0, 0.4, 0, 0.5, 2.4, 1.9, 0.6, 0.08 + e.evidence * 0.02, 0, 1, 1, 1);
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
  groundAt(at) { const gy = this.game.world.groundBelow(at.x, at.z, this.p.pos.y + 3); at.y = isFinite(gy) ? gy : this.p.pos.y; return at; }
  gavelStrike() {
    const g = this.game, p = this.p, rk = this.rank('gavel');
    const at = p.aimPoint.clone();
    tmp.subVectors(at, p.pos).setY(0); if (tmp.length() > 8) at.copy(p.pos).addScaledVector(tmp.normalize(), 8);
    this.groundAt(at);
    this.p.action = { type: 'attack', step: { style: 'slam', strike: 0.5, windup: 0.35 }, style: 'slam', dur: 0.45, elapsed: 0, t: 0, windup: 0.35, strike: 0.5, struck: true, moveScale: 0.3 };
    p.facing = Math.atan2(at.x - p.pos.x, at.z - p.pos.z);
    this.swingGavel(at, p.facing, 1 + rk * 0.15, () => {
      g.combat.aoe(at, 2.2 + rk * 0.3, 20 + rk * 6, p, { knock: 6, stagger: 0.6 });
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
    const at = this.groundAt(e.pos.clone());
    g.fx.blinkPuff(at.clone().addScaledVector(tmp.set(Math.sin(face), 0, Math.cos(face)), -2.2).setY(at.y + 2), GOLD);
    this.swingGavel(at, face, 0.8 + rk * 0.1, () => {
      if (!e.dead) g.combat.damageEnemy(e, 34 + rk * 10, p, { unblockable: true, stagger: 0.9, knock: tmp.subVectors(p.pos, e.pos).setY(0).normalize().multiplyScalar(6) });
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
          g.combat.damageEnemy(e, 42 + rk * 12, p, { knock: k2.clone(), stagger: 1 });
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
  dispose() {
    super.dispose();
    this.dismissJudgeman();
    this.closeCourt(this.game);
    for (const e of [...this.confiscated]) this.dropConfiscation(e);
    this.swordT = 0; this.combo = this.gavelCombo;
  }
}
registerKit('higuruma', HigurumaKit, HIGURUMA_SKILLS);
