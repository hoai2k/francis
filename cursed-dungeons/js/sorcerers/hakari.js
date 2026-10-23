// Hakari kit — Idle Death Gamble.
// Hakari's cursed technique only works inside his domain; outside it he is a
// brawler whose cursed energy is notoriously rough, using the pachinko balls
// and steel shutters his domain is built from.
//   LMB  rough brawler combo; every hit builds Fever (better odds next roll).
//   RMB  Pachinko Balls: a spray of steel balls that ricochet off the floor.
//   1    Shutter Doors: a line of steel shutters slams down in front of you.
//   2    Rough Energy Rush: a frenzied barrage of jagged, rough-energy punches.
//   3    Ball Rain: the tray dumps — a shower of steel balls around Hakari.
//   F    Domain Expansion: Idle Death Gamble — a pachinko parlour with the
//        "Private Pure Love Train" running behind the reels. The sure-hit is
//        only the RULES: every curse inside has the rules forced into its head
//        (no damage). Every few seconds the reels spin at 1/239 base odds; rider
//        riichi events (Transit Card, Seat Struggle, Potty Emergency) and
//        green / red / gold / rainbow holds raise the odds, and a rainbow is a
//        sure thing. JACKPOT: infinite cursed energy and an automatic Reverse
//        Cursed Technique — Hakari is effectively unkillable for 4 min 11 s in
//        canon (~25 s here).
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const GREEN = 0x3aff8a, GOLD = 0xffd23a, SILVER = 0xd8dce8, PINK = 0xff5ac8;
const tmp = new THREE.Vector3();

registerSorcerer('hakari', {
  name: 'Hakari', technique: 'Idle Death Gamble', rarity: 'legendary', title: 'The Gambler', color: '#3aff8a',
  desc: 'A rough-energy brawler who pelts curses with pachinko balls and slams shutter doors. Inside his domain the reels spin at 1/239 odds — riichi and coloured holds raise them — and a JACKPOT makes him unkillable.',
  domain: 'Idle Death Gamble',
});

registerLook('hakari', {
  paint: { skinTone: 0xf0cdb0, hair: 0x2c2a30, hairVolume: true, top: 0x1c1f2c, collar: 0x12141c, topTrim: 0x101218, buttons: 0x3aff8a, pants: 0x1c1f2c, eye: 0x6a7a88, fringe: 1, hairSide: 3, hairBack: 7, shoes: 0x0e0e12 },
  hair: (m) => [
    { x: 0, y: 8, z: -0.5, w: 7, h: 1.6, d: 7, rx: -0.12, material: m },
    { x: -2, y: 7.4, z: -2.8, w: 3, h: 2.6, d: 3, rx: -0.9, rz: 0.25, material: m },
    { x: 2, y: 7.4, z: -2.8, w: 3, h: 2.6, d: 3, rx: -0.9, rz: -0.25, material: m },
    { x: 0, y: 6, z: -4.2, w: 2, h: 4, d: 2, hang: true, material: m, stiff: 30 },
  ],
  hairColor: 0x2c2a30, accent: GREEN, emit: 0.35,
  cape: { color: 0x1c1f2c, length: 10, width: 9, segments: 3 },   // long uniform coat tails
  paintExtra(S) {
    S.rect(20, 20, 1, 12, 0x3aff8a, 0.05); S.rect(27, 20, 1, 12, 0x3aff8a, 0.05);  // green coat piping
    S.px(10, 14, 0xb08a78);                                                         // smirk
  },
  props(rig, K) {
    const gold = K.mat(GOLD, { metalness: 0.9, roughness: 0.25, emissive: 0.4 });
    K.box(rig.head, 0.8, 1.4, 0.8, gold, -4.8, 3.2, 0.5);   // earrings
    K.box(rig.head, 0.8, 1.4, 0.8, gold, 4.8, 3.2, 0.5);
    K.box(rig.torso, 8.6, 1.2, 4.6, K.mat(0x0c0c10), 0, 1.5, 0);               // belt
    K.box(rig.torso, 1.8, 1.4, 0.6, gold, 0, 1.5, 2.4);                        // buckle
  },
});

registerDomainEnv('pure_love_train', {
  skyTop: 0x02120a, skyHorizon: 0x1aff7a, fog: 0x06281a, fogDensity: 0.016, hemiSky: 0x9affc8, hemiGround: 0x1a0a20, hemiI: 1.15, sun: 0xffe08a, sunI: 1.1,
  grade: { tint: [0.95, 1.1, 0.98], lift: [0.0, 0.02, 0.01], sat: 1.35, contrast: 1.12, vignette: 0.4 }, floor: B.subway_floor,
});

export const HAKARI_SKILLS = [
  { id: 'fever', name: 'Fever', icon: '🔥', desc: 'Melee builds more Fever (better jackpot odds).', max: 3, branch: 'Fever', tier: 0 },
  { id: 'balls', name: 'Ball Rush', icon: '🎱', desc: 'More pachinko balls per spray and every ball ability hits harder.', max: 3, req: 'ab:balls', branch: 'Pachinko', tier: 1 },
  { id: 'shutter', name: 'Steel Shutters', icon: '🚪', desc: 'More, heavier shutter doors (and heavier train doors).', max: 3, req: 'ab:shutters', branch: 'Shutters', tier: 2 },
  { id: 'rough', name: 'Rough Energy', icon: '👊', desc: '+8% melee damage per rank; Rough Energy Rush lands more punches.', max: 3, branch: 'Rough Energy', tier: 0 },
  { id: 'jackpot', name: '4 Minutes 11 Seconds', icon: '⏱️', desc: 'Jackpots last 4s longer per rank.', max: 2, req: 'fever', branch: 'Fever', tier: 2 },
  { id: 'riichi', name: 'Riichi Rider', icon: '🚃', desc: 'Riichi events come more often and holds lean toward gold and rainbow; Riichi Roll lands more matches.', max: 2, req: 'ab:riichi_roll', branch: 'Fever', tier: 3 },
];

// Rider riichi events: each one is a cut-in story on the reels that raises
// the odds of the roll. Holds colour the reels; a rainbow hold is a sure win.
const BASE_ODDS = 1 / 239;
const RIDERS = [
  { name: 'Transit Card Riichi', odds: 0.08, w: 45 },
  { name: 'Seat Struggle Riichi', odds: 0.16, w: 35 },
  { name: 'Potty Emergency Riichi', odds: 0.3, w: 20 },
];
const HOLDS = [
  { name: 'Green Hold', mult: 1.5, color: GREEN, css: '#3aff8a', w: 50 },
  { name: 'Red Hold', mult: 2.5, color: 0xff3a4a, css: '#ff3a4a', w: 30 },
  { name: 'Gold Hold', mult: 4, color: GOLD, css: '#ffd23a', w: 15 },
  { name: 'RAINBOW HOLD', mult: Infinity, color: PINK, css: '#ff5ac8', w: 5 },
];
const pick = (list, bias = 0) => { let x = Math.random() * list.reduce((a, q) => a + q.w, 0) - bias; for (const q of list) { x -= q.w; if (x <= 0) return q; } return list[list.length - 1]; };

function bx(parent, w, h, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; }
// The pachinko machine's reel screen, drawn on a canvas.
function reelScreen(w, h) {
  const cv = document.createElement('canvas'); cv.width = 768; cv.height = Math.round(768 * h / w);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicNodeMaterial({ map: tex, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.draw = (reels, caption = '', color = '#3aff8a') => {
    const c = cv.getContext('2d'), W = cv.width, H = cv.height;
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#061a10'); bg.addColorStop(1, '#1a0620');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.strokeStyle = color; c.lineWidth = 10; c.strokeRect(8, 8, W - 16, H - 16);
    const rw = W / 3.6;
    reels.forEach((n, i) => {
      const x = W / 2 + (i - 1) * (rw + 18);
      c.fillStyle = '#f4f0e6'; c.fillRect(x - rw / 2, 40, rw, H * 0.62);
      c.fillStyle = n === 7 ? '#e01a2a' : '#141414'; c.font = `bold ${Math.round(H * 0.5)}px Impact, Arial Black, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(n), x, 40 + H * 0.31);
    });
    if (caption) { c.fillStyle = color; c.font = `bold ${Math.round(H * 0.13)}px Impact, Arial Black, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(caption, W / 2, H * 0.86); }
    tex.needsUpdate = true;
  };
  mesh.userData.free = () => { tex.dispose(); mat.dispose(); mesh.geometry.dispose(); };
  return mesh;
}

class HakariKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const ROUGH = 0x9affb8;
    this.combo = [
      { style: 'punch', dur: 0.24, windup: 0.26, strike: 0.48, dmg: 11, range: 2.5, arc: 1.1, lunge: 7, knock: 2.5, stop: 0.04, shake: 0.13, trail: GREEN, sparkColor: ROUGH, chainAt: 0.5 },
      { style: 'swingL', dur: 0.26, windup: 0.28, strike: 0.5, dmg: 12, range: 2.6, arc: 1.2, lunge: 6, knock: 3, stop: 0.045, shake: 0.15, trail: GREEN, sparkColor: ROUGH, chainAt: 0.52 },
      { style: 'punch', dur: 0.24, windup: 0.26, strike: 0.48, dmg: 12, range: 2.5, arc: 1.1, lunge: 7, knock: 2.5, stop: 0.04, shake: 0.13, trail: GREEN, sparkColor: ROUGH, chainAt: 0.5 },
      { style: 'uppercut', dur: 0.36, windup: 0.3, strike: 0.5, dmg: 17, range: 2.6, arc: 1.0, lunge: 5, knock: 5, stop: 0.07, shake: 0.24, trail: GOLD, launch: true, chainAt: 0.58 },
      { style: 'slam', dur: 0.55, windup: 0.4, strike: 0.6, dmg: 28, range: 3.3, arc: Math.PI, lunge: 4, knock: 11, stop: 0.1, shake: 0.45, ring: true, ringColor: GREEN, stagger: 0.6, trail: GREEN },
    ];
    this.p.stats.meleeMult += r('rough') * 0.08;
    this.branches = ['Pachinko', 'Shutters', 'Rough Energy', 'Fever'];
    this.library = {
      // ---- Pachinko: the steel balls his domain is built from
      balls: ability({ name: 'Pachinko Balls', icon: '🎱', kind: 'basic', desc: 'A spray of steel balls that ricochet off the floor.', cd: 0.65, ce: 0, branch: 'Pachinko', tier: 0, start: true, legacy: 'ranged', use: () => this.balls(4 + r('balls'), 0.28) }),
      ball_shot: ability({ name: 'Ball Bearing Shot', icon: '⚪', kind: 'basic', desc: 'One heavy steel ball flicked hard: it caroms from curse to curse up to four times, harder each bounce.', cd: 1.1, ce: 0, branch: 'Pachinko', tier: 1, req: 'balls', use: () => this.ballShot() }),
      ball_slide: ability({ name: 'Ball Slide', icon: '🛹', kind: 'movement', desc: 'Surf forward on a spill of pachinko balls; curses in the way trip over them.', cd: 6, ce: 6, branch: 'Pachinko', tier: 1, req: 'balls', use: () => this.ballSlide() }),
      ball_rain: ability({ name: 'Ball Rain', icon: '🌧️', kind: 'technique', desc: 'The tray dumps — a shower of steel balls around you.', cd: 12, ce: 22, branch: 'Pachinko', tier: 2, legacy: 't3', req: 'ball_shot', use: () => this.ballRain() }),
      payout: ability({ name: 'Payout Cannon', icon: '🎰', kind: 'technique', desc: 'Channel a roaring stream of balls at the aim for 1.2s, like a machine paying out.', cd: 10, ce: 16, branch: 'Pachinko', tier: 3, req: 'ball_rain', use: () => this.payout() }),
      ball_flood: ability({ name: 'Ball Flood', icon: '🌊', kind: 'technique', desc: 'A marked lane lights up, then a tidal wave of steel balls rolls down it, bowling over everything.', cd: 16, ce: 30, branch: 'Pachinko', tier: 4, req: 'payout', use: () => this.ballFlood() }),
      // ---- Shutters: the parlour's steel doors and the Love Train
      shutters: ability({ name: 'Shutter Doors', icon: '🚪', kind: 'technique', desc: 'A line of steel shutters slams down in front of you.', cd: 6, ce: 12, branch: 'Shutters', tier: 1, legacy: 't1', use: () => this.shutters() }),
      shutter_ring: ability({ name: 'Shutter Fortress', icon: '🏰', kind: 'defence', desc: 'Shutters crash down in a ring around you, crushing curses beside you; you take 60% less damage for 4s.', cd: 15, ce: 14, branch: 'Shutters', tier: 2, req: 'shutters', use: () => this.shutterRing() }),
      train_doors: ability({ name: 'Train Doors', icon: '🚇', kind: 'technique', desc: 'A pair of Love Train doors appears either side of a curse and slams shut on it.', cd: 7, ce: 12, branch: 'Shutters', tier: 2, req: 'shutters', use: () => this.trainDoors() }),
      ticket_gate: ability({ name: 'Ticket Gate', icon: '🎫', kind: 'technique', desc: 'Plant a row of station ticket gates: for 6s curses inside are stopped and zapped — no ticket, no entry.', cd: 13, ce: 16, branch: 'Shutters', tier: 3, req: 'train_doors', use: () => this.ticketGate() }),
      love_train: ability({ name: 'Private Pure Love Train', icon: '🚃', kind: 'technique', desc: 'The track lights up, then the Private Pure Love Train thunders down it, flattening everything on the line.', cd: 20, ce: 34, branch: 'Shutters', tier: 4, req: 'ticket_gate', use: () => this.loveTrain() }),
      // ---- Rough Energy: Hakari the brawler
      rush: ability({ name: 'Rough Rush', icon: '👊', kind: 'technique', desc: 'A frenzied barrage of jagged, rough-energy punches.', cd: 8, ce: 16, branch: 'Rough Energy', tier: 1, legacy: 't2', use: () => this.rush() }),
      rough_shot: ability({ name: 'Rough Energy Shot', icon: '🟢', kind: 'basic', desc: 'Hurl a jagged lump of rough cursed energy: it grinds into the curse, slowing it and everything beside it.', cd: 0.9, ce: 0, branch: 'Rough Energy', tier: 1, use: () => this.roughShot() }),
      flying_knee: ability({ name: 'Flying Knee', icon: '🦵', kind: 'movement', desc: 'Close the distance with a flying knee that launches the curse.', cd: 6, ce: 8, branch: 'Rough Energy', tier: 2, req: 'rush', use: () => this.flyingKnee() }),
      haymaker: ability({ name: 'Fight Club Haymaker', icon: '🥊', kind: 'technique', desc: 'Wind up (watch the glow) and throw the punch that made him champion of the fight club.', cd: 9, ce: 14, branch: 'Rough Energy', tier: 3, req: 'flying_knee', use: () => this.haymaker() }),
      ce_overflow: ability({ name: 'Cursed Energy Overflow', icon: '💚', kind: 'technique', desc: 'Let his absurd output loose: after a short charge a huge burst of rough energy erupts around him (bigger during a jackpot).', cd: 18, ce: 30, branch: 'Rough Energy', tier: 4, req: 'haymaker', use: () => this.ceOverflow() }),
      // ---- Fever: the gambler
      riichi_roll: ability({ name: 'Riichi Roll', icon: '🎲', kind: 'buff', desc: 'Spin three reels over your head: two of a kind is a riichi (+25% attack speed for 6s), three is a mini jackpot (heal, CE and +30% damage for 8s), nothing still builds Fever.', cd: 14, ce: 8, branch: 'Fever', tier: 1, use: () => this.riichiRoll() }),
      hot_streak: ability({ name: 'Hot Streak', icon: '♨️', kind: 'buff', desc: 'For 8s every hit builds double Fever and you attack 15% faster.', cd: 18, ce: 10, branch: 'Fever', tier: 2, req: 'riichi_roll', use: () => this.hotStreak() }),
      all_in: ability({ name: 'All In', icon: '🪙', kind: 'technique', desc: 'Bet all your Fever on one blow: a coin-gold blast whose size and damage grow with the Fever spent.', cd: 10, ce: 12, branch: 'Fever', tier: 3, req: 'hot_streak', use: () => this.allIn() }),
      lucky_break: ability({ name: 'Lucky Break', icon: '🍀', kind: 'heal', desc: 'Catch your breath: heal 20% health (30% if Fever is above 50, which it spends).', cd: 26, ce: 18, branch: 'Fever', tier: 3, req: 'riichi_roll', use: () => this.luckyBreak() }),
      lucky_seven: ability({ name: 'Lucky Seven', icon: '7️⃣', kind: 'buff', desc: 'Your next seven hits (within 10s) are all critical hits, and each builds Fever.', cd: 22, ce: 16, branch: 'Fever', tier: 4, req: 'all_in', use: () => this.luckySeven() }),
    };
    this.passives = {
      gamblers_luck: passive({ name: 'Gambler\'s Luck', icon: '🃏', desc: 'Fever drains 60% slower.', branch: 'Fever', tier: 2, req: 'riichi_roll', apply: (pl, k) => { k.feverDecay = 0.4; } }),
      rough_skin: passive({ name: 'Rough Cursed Energy', icon: '🪨', desc: 'Your jagged energy grinds: melee hits slow curses for 1.2s.', branch: 'Rough Energy', tier: 2, req: 'rush', apply: (pl, k) => { k.roughSlow = true; } }),
      steel_frame: passive({ name: 'Steel Frame', icon: '🔩', desc: 'Shutters, train doors and the Love Train hit 30% harder.', branch: 'Shutters', tier: 3, req: 'shutter_ring', apply: (pl, k) => { k.steelMul = 1.3; } }),
      fever_body: passive({ name: 'Fever Pitch', icon: '🌡️', desc: 'While Fever is 50 or more you move 12% faster and take 12% less damage.', branch: 'Fever', tier: 4, req: 'hot_streak', apply: (pl, k) => { k.feverBody = true; } }),
    };
    this.fever = 0; this.jackpotT = 0; this.auraT = 0;
    this.domain = {
      name: 'Idle Death Gamble', icon: '🎰', key: 'pure_love_train', type: 6, color: GREEN, sound: 'resonance', flash: 0x7affb0,
      sureHit: false,   // the sure-hit only forces the rules on everyone inside
      look: { floor: 0x0c2418, seam: 0x3aff8a, sparkle: 0xffd23a, skyTop: 0x04020a, skyHorizon: 0x0e3a26, stars: 0.9, band: 0xff5ac8 },
      duration: 12, radius: 24,
      onStart: (g, d) => this.openParlour(g, d),
      onTick: (g, d, dt) => this.runParlour(g, d, dt),
      onEnd: (g) => this.closeParlour(g),
    };
  }
  // ------------------------------------------------------------ the parlour
  openParlour(g, d) {
    const cam = g.rig.camera.position;
    const away = new THREE.Vector3(d.center.x - cam.x, 0, d.center.z - cam.z);
    if (away.lengthSq() < 1e-4) away.set(0, 0, -1);
    away.normalize();
    const grp = new THREE.Group();
    grp.position.copy(d.center); grp.rotation.y = Math.atan2(away.x, away.z);
    const frame = new THREE.MeshStandardNodeMaterial({ color: 0x1a1a22, metalness: 0.7, roughness: 0.3 });
    const gold = new THREE.MeshStandardNodeMaterial({ color: GOLD, metalness: 0.9, roughness: 0.25, emissive: GOLD, emissiveIntensity: 0.6 });
    const bulbG = new THREE.MeshBasicNodeMaterial({ color: GREEN, fog: false }), bulbP = new THREE.MeshBasicNodeMaterial({ color: PINK, fog: false });
    // giant pachinko machine with the reel screen
    bx(grp, 11, 9, 0.8, 0, 5.5, 12, frame);
    bx(grp, 11.4, 0.4, 1, 0, 10.1, 12, gold); bx(grp, 11.4, 0.4, 1, 0, 0.9, 12, gold);
    const screen = reelScreen(8, 4.2); screen.position.set(0, 6.4, 11.55); screen.rotation.y = Math.PI; grp.add(screen);
    const bulbs = [];
    for (let i = 0; i < 18; i++) { const x = -5 + (i % 9) * 1.25, y = i < 9 ? 9.4 : 3.6; bulbs.push(bx(grp, 0.35, 0.35, 0.2, x, y, 11.55, i % 2 ? bulbG : bulbP)); }
    // the Private Pure Love Train runs past behind the machine
    const train = new THREE.Group(); train.position.set(-40, 0, 18); grp.add(train);
    const body = new THREE.MeshStandardNodeMaterial({ color: 0xd8dce0, metalness: 0.6, roughness: 0.35 });
    const stripe = new THREE.MeshBasicNodeMaterial({ color: GREEN, fog: false }), win = new THREE.MeshBasicNodeMaterial({ color: 0xfff0c8, fog: false });
    for (let c = 0; c < 3; c++) {
      const x = c * 15;
      bx(train, 14.4, 3.4, 3.2, x, 2.2, 0, body); bx(train, 14.5, 0.35, 3.25, x, 1.6, 0, stripe);
      for (let w = 0; w < 6; w++) bx(train, 1.4, 1.0, 3.3, x - 5.5 + w * 2.2, 2.8, 0, win);
    }
    g.scene.add(grp);
    this.parlour = { grp, screen, bulbs, train, mats: [frame, gold, bulbG, bulbP, body, stripe, win], roll: 1.2, pity: 0, spin: null };
    screen.userData.draw([7, 7, 7], 'IDLE DEATH GAMBLE');
    // the sure-hit: the rules are forced into every curse's head
    for (const e of this.inDomain()) g.fx.damageNumber(e.pos.clone().setY(e.pos.y + e.height * 0.3), 0, { text: '📜 RULES', color: '#9affb8' });
    g.toast?.('🎰 The rules of Idle Death Gamble are transmitted to everyone inside', 'big');
  }
  closeParlour(g) {
    const P = this.parlour; if (!P) return;
    g.scene.remove(P.grp);
    P.screen.userData.free();
    for (const m of P.mats) m.dispose();
    this.parlour = null;
  }
  runParlour(g, d, dt) {
    const P = this.parlour; if (!P) return;
    // marquee bulbs chase, the train rattles past
    const k = Math.floor(g.time * 8);
    P.bulbs.forEach((b, i) => { b.visible = (i + k) % 3 !== 0; });
    P.train.position.x += dt * 24; if (P.train.position.x > 40) P.train.position.x = -70;
    if (Math.random() < 0.4) { const a = Math.random() * Math.PI * 2, rr = Math.random() * d.radius; g.particles.glow.spawn({ x: d.center.x + Math.cos(a) * rr, y: d.center.y + 4 + Math.random() * 3, z: d.center.z + Math.sin(a) * rr, vy: -2, life: 1.2, r: Math.random() < 0.5 ? 0.4 : 2.4, g: 2.4, b: Math.random() < 0.5 ? 1.2 : 0.4, size: 0.14, gravity: 2, drag: 0.3, sizeEnd: 1, shape: 'square' }); }
    if (P.spin) { this.updateSpin(P, dt); return; }
    if (this.jackpotT > 0) return;           // already immortal: just enjoy the ride
    P.roll -= dt;
    if (P.roll <= 0) this.startSpin(P);
  }
  // Decide the roll up front, then let the reels play it out.
  startSpin(P) {
    const g = this.game;
    let chance = BASE_ODDS + this.fever * 0.0008 + P.pity;
    let rider = null, hold = null;
    if (Math.random() < 0.55 + this.rank('riichi') * 0.1) {
      rider = pick(RIDERS);
      hold = pick(HOLDS, this.rank('riichi') * 8);
      chance = hold.mult === Infinity ? 1 : Math.min(1, (rider.odds + this.fever * 0.001 + P.pity) * hold.mult);
    }
    const win = Math.random() < chance;
    const digit = () => 1 + Math.floor(Math.random() * 9);
    let reels;
    if (win) { const n = Math.random() < 0.5 ? 7 : digit(); reels = [n, n, n]; }
    else if (rider) { const n = digit(); reels = [n, n, n % 9 + 1]; }   // a riichi that falls one short
    else { reels = [digit(), digit(), digit()]; if (reels[0] === reels[1] && reels[1] === reels[2]) reels[2] = reels[2] % 9 + 1; }
    P.spin = { t: 0, reels, win, rider, hold, said: 0 };
    P.pity = win ? 0 : P.pity + 0.02;
    g.audio?.tone({ freq: 660, to: 990, dur: 0.12, gain: 0.08, type: 'square', filter: 3000 });
  }
  updateSpin(P, dt) {
    const g = this.game, p = this.p, S = P.spin;
    S.t += dt;
    const stops = S.rider ? [0.5, 0.9, 3.2] : [0.5, 0.9, 1.3];
    const shown = S.reels.map((n, i) => (S.t >= stops[i] ? n : 1 + Math.floor(Math.random() * 9)));
    const color = S.hold ? S.hold.css : '#3aff8a';
    let caption = '';
    if (S.rider && S.t >= 0.9) caption = S.t < 1.9 ? 'REACH!' : S.t < 2.6 ? S.rider.name : S.hold.name;
    P.screen.userData.draw(shown, caption, color);
    if (Math.random() < dt * 20) g.audio?.tone({ freq: 1200 + Math.random() * 400, dur: 0.03, gain: 0.03, type: 'square', filter: 4000 });
    if (S.rider) {
      if (S.said === 0 && S.t >= 0.9) { S.said = 1; g.toast?.('🎰 REACH!', 'big'); g.audio?.charge(0.6, 1.5); }
      if (S.said === 1 && S.t >= 1.9) { S.said = 2; g.toast?.(`🚃 ${S.rider.name}`, 'big'); g.fx.flash(0xffffff, 0.12, 0.12); }
      if (S.said === 2 && S.t >= 2.6) {
        S.said = 3; g.toast?.(`✨ ${S.hold.name}`, 'big');
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: S.hold.color, r0: 0.5, r1: 5, dur: 0.6, thick: 0.15 });
        g.fx.flash(S.hold.color, 0.2, 0.2);
      }
    }
    if (S.t < stops[2] + 0.5) return;
    P.spin = null; P.roll = 1.4;
    g.toast?.(`🎰 ${S.reels.join(' | ')}${S.win ? '  JACKPOT!' : ''}`);
    if (S.win) this.jackpot();
    else g.audio?.ui('back');
  }
  // ------------------------------------------------------------ odds & jackpot
  onMeleeHit(e, step) {
    this.addFever(3 + this.rank('fever') * 1.5);
    if (step.launch && !e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
    if (this.roughSlow) this.slow(e, 1.2);
  }
  addFever(n) { this.fever = Math.min(100, this.fever + n * (this.buffs.has('hot_streak') ? 2 : 1)); }
  onHitEnemy(e) {
    // Lucky Seven: count the guaranteed critical hits
    if (this.buffs.has('lucky7')) { this.addFever(1); if (--this.lucky7 <= 0) this.buffs.get('lucky7').left = 0; }
  }
  jackpot() {
    const g = this.game, p = this.p;
    const fresh = this.jackpotT <= 0;
    this.jackpotT = Math.max(this.jackpotT, 25 + this.rank('jackpot') * 4);
    this.fever = 0;
    if (fresh) { p.stats.attackSpeed *= 1.25; this.speedMul = 1.15; }
    g.toast?.('JACKPOT!', 'domain');
    this.after(0.9, () => g.toast?.('♪ Next stop, Tokyo Station… "Private Pure Love Train" ♪', 'big'));
    g.fx.flash(GOLD, 0.6, 0.35); g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1.4, 0.7); g.fx.chroma(1.2);
    g.shake(0.6); g.slowMo(0.6, 0.3);
    g.lights.flash(p.pos.clone().setY(p.pos.y + 2), GOLD, 26, 18, 1.2, { priority: 8 });
    for (let i = 0; i < 4; i++) g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08 + i * 0.6, p.pos.z), { color: i % 2 ? GREEN : GOLD, r0: 0.4, r1: 5 + i * 2, dur: 0.6 + i * 0.15, thick: 0.12 });
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1.2), { count: 70, color: GOLD, speed: 12, up: 2, gravity: 10, life: 1.2, size: 0.16, shape: 1, intensity: 4 });
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1.2), { count: 40, color: GREEN, speed: 8, up: 1.5, life: 1, size: 0.3, sizeEnd: 0.05 });
    if (this.parlour) this.parlour.screen.userData.draw([7, 7, 7], 'JACKPOT!!', '#ffd23a');
    // a bright little fanfare in place of the anime's dancing opening
    [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => g.audio?.tone({ freq: f, dur: 0.22, gain: 0.08, type: 'square', filter: 3500, at: i * 0.11, rev: 0.3 }));
    for (let i = 0; i < 8; i++) this.after(0.12 + i * 0.07, () => g.audio?.coin());
  }
  onIncoming(amount, src, o) {
    amount = super.onIncoming(amount, src, o); if (amount <= 0) return 0;
    if (this.feverBody && this.fever >= 50) amount *= 0.88;
    // automatic Reverse Cursed Technique: the body heals faster than anything can kill it
    if (this.jackpotT > 0) return Math.min(amount, Math.max(0, this.p.hp - 1));
    return amount;
  }
  tick(dt) {
    const g = this.game, p = this.p;
    this.fever = Math.max(0, this.fever - dt * 1.5 * (this.feverDecay ?? 1));
    if (this.feverBody) this.speedMul = (this.jackpotT > 0 ? 1.15 : 1) * (this.fever >= 50 ? 1.12 : 1);
    const mat = p.rig.material.userData;
    if (this.jackpotT > 0) {
      this.jackpotT -= dt;
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35 * dt);   // automatic RCT regrows whole limbs
      p.ce = p.maxCe;                                          // infinite cursed energy
      mat.emitMask.value = 1.4 + Math.sin(g.time * 12) * 0.4;
      p.rig.setGlow?.(Math.sin(g.time * 6) > 0 ? 0x2a6a20 : 0x5a4a08);
      p.heroLight.color.setHex(Math.sin(g.time * 6) > 0 ? GREEN : GOLD); p.heroLight.intensity = 4;
      this.auraT += dt * 40;
      for (; this.auraT > 1; this.auraT--) {
        const a = Math.random() * Math.PI * 2, rr = 0.4 + Math.random() * 0.4, gold = Math.random() < 0.5;
        g.particles.glow.spawn({ x: p.pos.x + Math.cos(a) * rr, y: p.pos.y + Math.random() * 1.8, z: p.pos.z + Math.sin(a) * rr, vx: Math.cos(a) * 0.6, vy: 2 + Math.random() * 2, vz: Math.sin(a) * 0.6, life: 0.6, r: gold ? 3 : 0.6, g: gold ? 2.4 : 3, b: gold ? 0.4 : 1.2, size: 0.14, gravity: -1, drag: 1.2, sizeEnd: 0.1, shape: gold ? 1 : 0 });
      }
      if (this.jackpotT <= 0) {
        p.stats.attackSpeed /= 1.25; this.speedMul = 1;
        mat.emitMask.value = 0.35; p.rig.setGlow?.(0x000000); p.heroLight.color.setHex(0xffe8d0); p.heroLight.intensity = 1.6;
        g.toast?.('Jackpot over');
      }
    } else if (this.fever > 40 && Math.random() < this.fever / 400) {
      g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.8, y: p.pos.y + Math.random() * 1.6, z: p.pos.z + (Math.random() - 0.5) * 0.8, vy: 1.2, life: 0.5, r: 0.6, g: 3, b: 1.2, size: 0.1, drag: 1, shape: 'square' });
    }
  }
  // ------------------------------------------------------------ techniques
  balls(n, spread) {
    const g = this.game, p = this.p;
    this.cast(0.26);
    const base = Math.atan2(p.aimDir.x, p.aimDir.z);
    const dmg = 5 + this.rank('balls') * 2;
    const homing = g.domainSys?.sureHit(p);
    for (let i = 0; i < n; i++) {
      const a = base + (Math.random() - 0.5) * spread * 2;
      const vel = new THREE.Vector3(Math.sin(a), 0.15 + Math.random() * 0.2, Math.cos(a)).multiplyScalar(20 + Math.random() * 6);
      g.projectiles.fire({ pos: this.handPos(), vel, team: 'player', shape: 'orb', color: i % 3 ? SILVER : GOLD, emissive: 1.2, scale: 0.55, radius: 0.3, gravity: 18, life: 1.1, pierce: true,
        homing: homing ? 10 : 0, target: homing ? g.nearestEnemy(p.pos, 30) : null,
        trail: (q) => {
          // ricochet off the floor like a pachinko ball
          const gy = g.world.groundBelow(q.pos.x, q.pos.z, q.pos.y + 0.3);
          if (isFinite(gy) && q.pos.y < gy + 0.2 && q.vel.y < 0) { q.vel.y = -q.vel.y * 0.65; q.pos.y = gy + 0.2; if (Math.random() < 0.3) g.audio?.coin(); }
          if (Math.random() < 0.3) g.particles.burst(q.pos, { count: 1, color: GREEN, speed: 0.2, life: 0.2, size: 0.1, shape: 1 });
        },
        onHit: (e, q) => { g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setY(0).setLength(2), stagger: 0.12 }); g.fx.hitSpark(q.pos, null, { color: SILVER }); this.fever = Math.min(100, this.fever + 1); } });
    }
    g.audio?.whoosh(0.6);
  }
  ensureShutterAssets() {
    if (this.shutterGeo) return;
    this.shutterGeo = new THREE.BoxGeometry(2.2, 2.6, 0.18);
    this.shutterMat = new THREE.MeshStandardNodeMaterial({ color: 0x8a9098, metalness: 0.85, roughness: 0.35, emissive: GREEN, emissiveIntensity: 0.12 });
    this.slatGeo = new THREE.BoxGeometry(2.25, 0.08, 0.24);
    this.slatMat = new THREE.MeshStandardNodeMaterial({ color: 0x5a6068, metalness: 0.9, roughness: 0.3 });
  }
  shutter(at, facing, dmg, life = 0.9) {
    dmg *= this.steelMul ?? 1;
    const g = this.game, p = this.p;
    this.ensureShutterAssets();
    const grp = new THREE.Group();
    const door = new THREE.Mesh(this.shutterGeo, this.shutterMat); door.castShadow = true; grp.add(door);
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(this.slatGeo, this.slatMat); s.position.y = -1.1 + i * 0.44; grp.add(s); }
    const gy = g.world.groundBelow(at.x, at.z, p.pos.y + 3); const floor = isFinite(gy) ? gy : p.pos.y;
    grp.position.set(at.x, floor + 6, at.z); grp.rotation.y = facing;
    g.scene.add(grp);
    let t = 0, landed = false;
    g.addUpdater((dt) => {
      t += dt;
      if (!landed) {
        grp.position.y = Math.max(floor + 1.3, grp.position.y - dt * 40);
        if (grp.position.y <= floor + 1.3) {
          landed = true;
          const c = tmp.set(at.x, floor, at.z);
          g.combat.aoe(c, 1.8, dmg, p, { knock: 7, stagger: 0.7 });
          g.fx.shockwave(c, GREEN, 2.4, 0.3);
          g.particles.burst(c.clone().setY(floor + 0.3), { count: 12, color: SILVER, speed: 6, up: 0.6, life: 0.3, size: 0.08, shape: 1, gravity: 10 });
          g.shake(0.18); g.audio?.impact(1.2, 'crit');
        }
        return true;
      }
      if (t > life) grp.scale.y = Math.max(0.01, 1 - (t - life) * 5);
      if (t > life + 0.2 || this.disposed) { g.scene.remove(grp); return false; }
      return true;
    });
  }
  shutters() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const face = Math.atan2(p.aimDir.x, p.aimDir.z);
    const n = 4 + this.rank('shutter');
    const dmg = 20 + this.rank('shutter') * 8;
    const sure = g.domainSys?.sureHit(p) ? [...this.inDomain()].slice(0, n) : null;
    for (let i = 0; i < n; i++) this.after(i * 0.07, () => {
      const at = sure && sure[i] ? sure[i].pos.clone() : p.pos.clone().addScaledVector(p.aimDir, 1.8 + i * 1.6);
      this.shutter(at, face, dmg);
    });
    g.audio?.whoosh(1.1);
  }
  rush() {
    const g = this.game, p = this.p;
    const hits = 7 + this.rank('rough') * 2;
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const drive = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing)).multiplyScalar(2.6);
    p.action = { type: 'cast', dur: hits * 0.07 + 0.2, elapsed: 0, t: 0, both: true, moveScale: 0.6, lock: true, hold: true, faceAim: true, root: drive };
    let i = 0;
    const step = () => {
      if (i >= hits || p.dead || p.downed) { p.action = null; return; }
      const fwd = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const front = p.pos.clone().addScaledVector(fwd, 1.2).setY(p.pos.y + 1.1 + (Math.random() - 0.5) * 0.6);
      const targets = g.domainSys?.sureHit(p) ? [...this.inDomain()] : g.combat.query(p.pos, fwd, 2.9, 0.9);
      for (const e of targets) g.combat.damageEnemy(e, 7 + this.rank('rough') * 2, p, { melee: true, knock: fwd.clone().multiplyScalar(i === hits - 1 ? 10 : 1.2), stagger: 0.3 });
      // jagged, rough cursed energy
      g.fx.slashLine(front.clone().addScaledVector(fwd, -0.6), new THREE.Vector3(fwd.x + (Math.random() - 0.5), (Math.random() - 0.5) * 0.6, fwd.z + (Math.random() - 0.5)).normalize(), 1.6, i % 2 ? GREEN : 0xd8ffe0, 0.3, 0.12, Math.random() * 3);
      g.particles.burst(front, { count: 6, color: GREEN, speed: 5, life: 0.25, size: 0.1, shape: 1, dir: fwd.clone().multiplyScalar(0.8) });
      if (targets.length) { g.hitStop(0.02); g.shake(0.1); g.audio?.impact(0.8); this.fever = Math.min(100, this.fever + 1.5); } else g.audio?.swing(i % 3);
      if (i === hits - 1) { g.fx.shockwave(front, GREEN, 3); g.shake(0.3); }
      i++; this.after(0.07, step);
    };
    step();
  }
  ballRain() {
    const g = this.game, p = this.p, rk = this.rank('balls');
    this.cast(0.5, true, { type: 'raise' });
    g.audio?.charge(0.4, 1.4);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GREEN, r0: 3, r1: 0.4, dur: 0.5, thick: 0.15 });
    this.after(0.4, () => {
      const c = p.pos.clone();
      const n = 16 + rk * 4;
      for (let i = 0; i < n; i++) this.after(i * 0.025, () => {
        const a = Math.random() * Math.PI * 2, rr = 1 + Math.random() * 4.5;
        g.projectiles.fire({ pos: c.clone().add(new THREE.Vector3(Math.cos(a) * rr, 7 + Math.random() * 2, Math.sin(a) * rr)), vel: new THREE.Vector3(0, -16, 0), team: 'player', shape: 'orb', color: i % 2 ? SILVER : GOLD, emissive: 1.5, scale: 0.8, radius: 0.5, life: 1.2, ghost: true,
          onHit: (e) => { g.combat.damageEnemy(e, 12 + rk * 3, p, { stagger: 0.3 }); this.fever = Math.min(100, this.fever + 0.5); },
          onExpire: (q) => { g.particles.burst(q.pos, { count: 4, color: SILVER, speed: 3, life: 0.3, size: 0.1, shape: 1 }); if (Math.random() < 0.3) g.audio?.coin(); } });
      });
      g.combat.aoe(c, 5, 20 + rk * 4, p, { knock: 4, stagger: 0.4, falloff: true });
      g.fx.shockwave(c, SILVER, 5);
    });
  }
  // ------------------------------------------------------------ Pachinko (more)
  ballShot() {
    const g = this.game, p = this.p, rk = this.rank('balls');
    this.cast(0.25);
    const dmg = 16 + rk * 4;
    let cur = this.target(14);
    if (!cur) {
      this.shoot({ speed: 32, color: SILVER, emissive: 1.6, scale: 1.2, radius: 0.35, life: 0.6,
        onHit: (e, q) => { this.hit(e, dmg, { stagger: 0.4, knock: q.vel.clone().setY(0).setLength(4) }); g.fx.hitSpark(q.pos, null, { color: GOLD }); } });
      g.audio?.whoosh(0.6); return;
    }
    const seen = new Set();
    let src = this.handPos(), n = 0;
    const hop = () => {
      if (!cur || cur.dead || n >= 4 || this.disposed) return;
      const at = cur.pos.clone().setY(cur.pos.y + cur.height * 0.5);
      const d = tmp.subVectors(at, src); const len = d.length();
      if (len > 0.05) { g.fx.slashLine(src, d.normalize().clone(), len, SILVER, 0.22, 0.2); g.fx.slashLine(src, d, len, GOLD, 0.08, 0.16); }
      this.hit(cur, dmg * (1 + n * 0.25), { stagger: 0.35, knock: tmp.subVectors(cur.pos, p.pos).setY(0).normalize().multiplyScalar(3) });
      g.fx.hitSpark(at, null, { color: GOLD });
      g.particles.burst(at, { count: 6, color: SILVER, speed: 4, life: 0.25, size: 0.08, shape: 1 });
      g.audio?.coin();
      this.addFever(2);
      seen.add(cur); src = at; n++;
      let best = null, bd = 7;
      for (const e of g.enemies) { if (e.dead || seen.has(e) || e.untargetable) continue; const dd = e.pos.distanceTo(cur.pos); if (dd < bd) { bd = dd; best = e; } }
      cur = best;
      this.after(0.08, hop);
    };
    hop();
    g.audio?.whoosh(0.7);
  }
  ballSlide() {
    const g = this.game, p = this.p;
    const dir = this.fwd();
    g.audio?.whoosh(1.1);
    for (let i = 0; i < 3; i++) this.after(i * 0.1, () => { for (let k = 0; k < 6; k++) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.15, p.pos.z), { count: 2, color: k % 2 ? SILVER : GOLD, speed: 3, up: 0.6, life: 0.6, size: 0.12, shape: 1, gravity: 14 }); g.audio?.coin(); });
    this.dash(dir, 8, 0.36, { hitR: 1.5, dmg: 10 + this.rank('balls') * 3, color: SILVER,
      onHit: (e) => { this.slow(e, 2.5); if (!e.isBoss) { this.stun(e, 0.6); e.vel.y = Math.max(e.vel.y, 5); } this.addFever(2); } });
  }
  payout() {
    const g = this.game, p = this.p, rk = this.rank('balls');
    this.cast(1.25, true, { moveScale: 0.25 });
    g.audio?.charge(0.3, 1.6);
    let acc = 0;
    this.during(1.2, (t, dt) => {
      if (p.dead) return false;
      p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
      acc += dt;
      for (; acc > 0.045; acc -= 0.045) {
        const a = p.facing + (Math.random() - 0.5) * 0.25;
        const vel = new THREE.Vector3(Math.sin(a), 0.05 + Math.random() * 0.1, Math.cos(a)).multiplyScalar(26 + Math.random() * 6);
        g.projectiles.fire({ pos: this.handPos(), vel, team: 'player', shape: 'orb', color: Math.random() < 0.3 ? GOLD : SILVER, emissive: 1.3, scale: 0.6, radius: 0.32, gravity: 6, life: 0.8,
          onHit: (e, q) => { this.hit(e, 6 + rk * 2, { knock: q.vel.clone().setY(0).setLength(1.6), stagger: 0.12 }); this.addFever(0.5); if (Math.random() < 0.3) g.fx.hitSpark(q.pos, null, { color: SILVER }); } });
        if (Math.random() < 0.25) g.audio?.coin();
      }
    });
  }
  ballFlood() {
    const g = this.game, p = this.p, rk = this.rank('balls');
    const dir = this.fwd(), L = 18, W = 2.6;
    const from = p.pos.clone().addScaledVector(dir, 0.5);
    this.cast(0.5, true);
    // telegraph: the lane lights up first
    for (let s = 1; s <= L; s += 2) { const c = tmp.copy(from).addScaledVector(dir, s); c.y = this.groundAt(c.x, c.z, p.pos.y) + 0.07; g.fx.rings.spawn(c, { color: GOLD, r0: W * 0.4, r1: W, dur: 0.6, thick: 0.1 }); }
    g.audio?.charge(0.5, 1.2);
    g.toast?.('🎱 Ball Flood!');
    this.after(0.55, () => {
      const hit = new Set();
      g.audio?.noise({ dur: 1.0, gain: 0.3, type: 'bandpass', freq: 2400, sweep: 1200, q: 1, rev: 0.3 });
      this.during(0.9, (t, dt, k) => {
        const front = k * L;
        for (let i = 0; i < 6; i++) {
          const lat = (Math.random() - 0.5) * W * 2, c = tmp.copy(from).addScaledVector(dir, front);
          c.x += dir.z * lat; c.z -= dir.x * lat;
          g.particles.burst(c.setY(this.groundAt(c.x, c.z, p.pos.y) + 0.3), { count: 2, color: Math.random() < 0.4 ? GOLD : SILVER, speed: 4, up: 1.2, life: 0.5, size: 0.14, shape: 1, gravity: 14, dir: dir.clone() });
        }
        if (Math.random() < 0.4) g.audio?.coin();
        this.line(from, dir, front, W, (e, along) => {
          if (hit.has(e) || along < front - 2.5) return;
          hit.add(e);
          this.hit(e, (40 + rk * 10), { stagger: 0.9, knock: dir.clone().multiplyScalar(e.isBoss ? 3 : 14) });
          if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 6);
          this.addFever(2);
        });
        g.shake(0.08);
      });
    });
  }
  // ------------------------------------------------------------ Shutters (more)
  shutterRing() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    const n = 8, R = 2.6, dmg = 18 + this.rank('shutter') * 6;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      this.after(i * 0.03, () => this.shutter(tmp.set(p.pos.x + Math.sin(a) * R, p.pos.y, p.pos.z + Math.cos(a) * R).clone(), a, dmg, 3.8));
    }
    this.buff('fortress', 4, { incoming: (amt) => amt * 0.4 });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GREEN, r0: 0.4, r1: R + 0.6, dur: 0.4, thick: 0.15 });
    g.audio?.whoosh(1.2);
  }
  trainDoors() {
    const g = this.game, p = this.p;
    const e = this.target(12);
    const at = e ? e.pos.clone() : this.aimGround(8);
    at.y = this.groundAt(at.x, at.z, at.y);
    this.cast(0.35);
    const face = Math.atan2(at.x - p.pos.x, at.z - p.pos.z);
    p.facing = face;
    const side = new THREE.Vector3(Math.cos(face), 0, -Math.sin(face));
    const geo = new THREE.BoxGeometry(1.5, 2.5, 0.16), win = new THREE.BoxGeometry(0.9, 0.8, 0.2);
    const body = new THREE.MeshStandardNodeMaterial({ color: 0xd8dce0, metalness: 0.6, roughness: 0.35 }), glass = new THREE.MeshBasicNodeMaterial({ color: 0xfff0c8, fog: false }), stripe = new THREE.MeshBasicNodeMaterial({ color: GREEN, fog: false });
    const stripeGeo = new THREE.BoxGeometry(1.52, 0.18, 0.18);
    const doors = [-1, 1].map((sd) => {
      const d = new THREE.Group();
      const m = new THREE.Mesh(geo, body); m.castShadow = true; d.add(m);
      const w = new THREE.Mesh(win, glass); w.position.y = 0.5; d.add(w);
      const st = new THREE.Mesh(stripeGeo, stripe); st.position.y = -0.5; d.add(st);
      d.rotation.y = face + Math.PI / 2;
      g.scene.add(d);
      return { d, sd };
    });
    g.fx.rings.spawn(tmp.set(at.x, at.y + 0.07, at.z), { color: GREEN, r0: 2.2, r1: 0.5, dur: 0.35, thick: 0.15 });
    g.audio?.tone({ freq: 880, to: 660, dur: 0.25, gain: 0.07, type: 'square', filter: 2500 });
    let t = 0, slammed = false;
    g.addUpdater((dt) => {
      t += dt;
      const k = Math.min(1, t / 0.3), gap = 3.2 * (1 - k * k) + 0.78;
      for (const D of doors) D.d.position.set(at.x + side.x * gap * D.sd, at.y + 1.25, at.z + side.z * gap * D.sd);
      if (!slammed && k >= 1) {
        slammed = true;
        const n = g.combat.aoe(at, 1.6, (38 + this.rank('shutter') * 10) * (this.steelMul ?? 1), p, { stagger: 1, knock: 1, blocks: false });
        for (const f of this.foes(at, 1.6)) this.stun(f, 1.2);
        g.fx.hitSpark(at.clone().setY(at.y + 1.2), null, { color: GREEN, big: true });
        g.particles.burst(at.clone().setY(at.y + 1.2), { count: 16, color: SILVER, speed: 6, life: 0.35, size: 0.1, shape: 1 });
        g.shake(0.3); g.hitStop(n ? 0.06 : 0); g.audio?.impact(1.6, 'crit');
      }
      if (t > 0.9 || this.disposed) {
        for (const D of doors) g.scene.remove(D.d);
        geo.dispose(); win.dispose(); stripeGeo.dispose(); body.dispose(); glass.dispose(); stripe.dispose();
        return false;
      }
      return true;
    });
  }
  ticketGate() {
    const g = this.game, p = this.p;
    const c = this.aimGround(9), R = 2.8;
    this.cast(0.35);
    const face = Math.atan2(c.x - p.pos.x, c.z - p.pos.z);
    const grp = new THREE.Group(); grp.position.copy(c); grp.rotation.y = face + Math.PI / 2;
    const post = new THREE.BoxGeometry(0.3, 1.1, 1.2), flap = new THREE.BoxGeometry(0.6, 0.12, 0.05);
    const steel = new THREE.MeshStandardNodeMaterial({ color: 0xa8b0b8, metalness: 0.7, roughness: 0.35 }), lamp = new THREE.MeshBasicNodeMaterial({ color: GREEN, fog: false }), red = new THREE.MeshBasicNodeMaterial({ color: 0xff3a4a, fog: false });
    const lamps = [];
    for (let i = -2; i <= 2; i++) {
      const m = new THREE.Mesh(post, steel); m.position.set(i * 1.1, 0.55, 0); m.castShadow = true; grp.add(m);
      const l = new THREE.Mesh(flap, lamp); l.position.set(i * 1.1 + 0.4, 0.8, 0); grp.add(l); lamps.push(l);
    }
    g.scene.add(grp);
    g.fx.summonCircle(c, GREEN);
    g.audio?.tone({ freq: 1320, dur: 0.08, gain: 0.07, type: 'square', at: 0 }); g.audio?.tone({ freq: 1320, dur: 0.08, gain: 0.07, type: 'square', at: 0.12 });
    this.zone(c, R, 6, 0.5, (list) => {
      for (const e of list) { this.stun(e, 0.55); this.hit(e, 6 + this.rank('shutter') * 2, { stagger: 0.2, ceGain: 1 }); this.addFever(0.5); }
      for (const l of lamps) l.material = list.length ? red : lamp;
      if (list.length) g.audio?.tone({ freq: 660, dur: 0.1, gain: 0.05, type: 'square' });
    }, { color: GREEN, onEnd: () => { g.scene.remove(grp); post.dispose(); flap.dispose(); steel.dispose(); lamp.dispose(); red.dispose(); g.fx.blinkPuff(c, GREEN); } });
  }
  loveTrain() {
    const g = this.game, p = this.p;
    const dir = this.fwd(), L = 28, W = 1.8;
    const from = p.pos.clone().addScaledVector(dir, -4);
    this.cast(0.6, true);
    // the track lights up: stay off the line!
    for (let s = 0; s <= L; s += 1.6) { const c = tmp.copy(from).addScaledVector(dir, s); c.y = this.groundAt(c.x, c.z, p.pos.y) + 0.07; g.fx.rings.spawn(c, { color: s % 3.2 < 1.6 ? GREEN : GOLD, r0: W, r1: W * 0.9, dur: 0.9, thick: 0.08 }); }
    g.toast?.('♪ Private Pure Love Train ♪', 'big');
    [784, 988, 1175].forEach((f, i) => g.audio?.tone({ freq: f, dur: 0.18, gain: 0.07, type: 'square', at: i * 0.15, filter: 3000 }));
    const train = new THREE.Group();
    const body = new THREE.MeshStandardNodeMaterial({ color: 0xd8dce0, metalness: 0.6, roughness: 0.35 });
    const stripe = new THREE.MeshBasicNodeMaterial({ color: GREEN, fog: false }), win = new THREE.MeshBasicNodeMaterial({ color: 0xfff0c8, fog: false }), lamp = new THREE.MeshBasicNodeMaterial({ color: 0xffffe0, fog: false });
    const geos = [new THREE.BoxGeometry(2.2, 2.6, 6.4), new THREE.BoxGeometry(2.25, 0.3, 6.45), new THREE.BoxGeometry(2.3, 0.7, 0.9), new THREE.BoxGeometry(0.5, 0.3, 0.1)];
    for (let c = 0; c < 3; c++) {
      const z = -c * 6.7;
      const m = new THREE.Mesh(geos[0], body); m.position.set(0, 1.5, z); m.castShadow = true; train.add(m);
      const st = new THREE.Mesh(geos[1], stripe); st.position.set(0, 1.0, z); train.add(st);
      for (let w = 0; w < 4; w++) { const wm = new THREE.Mesh(geos[2], win); wm.position.set(0, 2.0, z - 2.2 + w * 1.5); train.add(wm); }
    }
    for (const x of [-0.6, 0.6]) { const l = new THREE.Mesh(geos[3], lamp); l.position.set(x, 1.1, 3.25); train.add(l); }
    train.rotation.y = Math.atan2(dir.x, dir.z);
    train.visible = false; g.scene.add(train);
    const light = g.lights.attach(train, 0xfff0c8, 6, 12, { offsetY: 1.5, priority: 4 });
    const hit = new Set();
    this.after(0.85, () => {
      train.visible = true;
      g.audio?.noise({ dur: 1.0, gain: 0.4, type: 'lowpass', freq: 400, sweep: 200, rev: 0.3 });
      this.during(0.9, (t, dt, k) => {
        const s = -6 + k * (L + 14);
        const at = tmp.copy(from).addScaledVector(dir, s);
        train.position.set(at.x, this.groundAt(at.x, at.z, p.pos.y), at.z);
        this.line(from, dir, s + 3.2, W, (e, along) => {
          if (hit.has(e) || along < s - 16) return;
          hit.add(e);
          const lat = Math.sign((e.pos.x - from.x) * dir.z - (e.pos.z - from.z) * dir.x) || 1;
          this.hit(e, (70 + this.rank('shutter') * 15) * (this.steelMul ?? 1), { stagger: 1.2, unblockable: true, knock: new THREE.Vector3(dir.z * lat, 0, -dir.x * lat).multiplyScalar(e.isBoss ? 3 : 12).addScaledVector(dir, e.isBoss ? 2 : 10) });
          if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
          g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: GREEN, big: true });
          g.hitStop(0.03); this.addFever(3);
        });
        if (Math.random() < 0.5) g.particles.burst(train.position.clone().setY(train.position.y + 0.2), { count: 3, color: GOLD, speed: 4, life: 0.3, size: 0.08, shape: 1 });
        g.shake(0.15);
      }, () => { g.scene.remove(train); g.lights.remove(light); for (const ge of geos) ge.dispose(); body.dispose(); stripe.dispose(); win.dispose(); lamp.dispose(); });
    });
    this.after(3, () => { if (train.parent) { g.scene.remove(train); g.lights.remove(light); } });
  }
  // ------------------------------------------------------------ Rough Energy (more)
  roughShot() {
    const g = this.game, p = this.p, rk = this.rank('rough');
    this.cast(0.26);
    this.shoot({ speed: 22, color: GREEN, emissive: 2, scale: 1.4, radius: 0.45, life: 0.9, light: 2,
      trail: (q) => { if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color: 0x9affb8, speed: 1.2, life: 0.25, size: 0.12, shape: 1 }); },
      onHit: (e, q) => {
        this.hit(e, 12 + rk * 3, { stagger: 0.3, knock: q.vel.clone().setY(0).setLength(2) });
        for (const f of this.foes(q.pos, 2)) this.slow(f, 2.5);
        g.fx.shockwave(q.pos, GREEN, 2, 0.3);
        g.particles.burst(q.pos, { count: 10, color: GREEN, speed: 5, life: 0.35, size: 0.1, shape: 1 });
        this.addFever(1.5);
      } });
    g.audio?.whoosh(0.6);
  }
  flyingKnee() {
    const g = this.game, p = this.p;
    const t = this.target(10);
    const dir = t ? tmp.subVectors(t.pos, p.pos).setY(0) : this.fwd(tmp);
    const dist = t ? Math.max(1, dir.length() - (t.radius ?? 0.5) - 0.6) : 6;
    dir.normalize();
    this.dash(dir.clone(), dist, 0.22, { hitR: 1.6, dmg: 24 + this.rank('rough') * 6, color: GREEN,
      onHit: (e) => { if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9); this.addFever(3); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: GREEN, big: true }); g.hitStop(0.05); g.audio?.impact(1.4); },
      onEnd: () => { g.fx.shockwave(p.pos, GREEN, 2.5, 0.3); } });
    g.audio?.whoosh(1);
  }
  haymaker() {
    const g = this.game, p = this.p, rk = this.rank('rough');
    this.cast(0.5, true, { lock: true, moveScale: 0 });
    g.audio?.charge(0.4, 1);
    const fist = () => this.handPos(tmp);
    this.during(0.42, () => { const h = fist(); g.particles.glow.spawn({ x: h.x + (Math.random() - 0.5) * 0.6, y: h.y + (Math.random() - 0.5) * 0.6, z: h.z + (Math.random() - 0.5) * 0.6, vy: 0.5, life: 0.3, r: 0.6, g: 3, b: 1.2, size: 0.18, drag: 1, sizeEnd: 0.1, shape: 'square' }); });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GREEN, r0: 3.6, r1: 0.4, dur: 0.42, thick: 0.15 });
    this.after(0.42, () => {
      this.pose('punch', 0.3);
      const dir = this.fwd();
      let n = 0;
      for (const e of this.foes(p.pos, 3.8, dir, 0.7)) {
        this.hit(e, 60 + rk * 15, { melee: true, stagger: 1.2, knock: dir.clone().multiplyScalar(e.isBoss ? 4 : 18) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 5);
        this.addFever(5); n++;
      }
      const front = p.pos.clone().addScaledVector(dir, 2).setY(p.pos.y + 1.1);
      g.fx.shockwave(front, GREEN, 4); g.fx.hitSpark(front, dir, { color: GREEN, big: true });
      g.particles.burst(front, { count: 24, color: GREEN, speed: 9, life: 0.4, size: 0.12, shape: 1, dir: dir.clone() });
      g.shake(0.5); if (n) g.hitStop(0.09); g.audio?.impact(2, 'crit');
    });
  }
  ceOverflow() {
    const g = this.game, p = this.p, rk = this.rank('rough');
    const big = this.jackpotT > 0, R = big ? 9 : 7;
    this.cast(0.7, true, { type: 'raise', lock: true });
    g.audio?.charge(0.6, 0.8);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: GREEN, r0: R, r1: R * 0.95, dur: 0.65, thick: 0.12 });
    this.during(0.6, () => { for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, rr = 0.5 + Math.random(); g.particles.glow.spawn({ x: p.pos.x + Math.cos(a) * rr, y: p.pos.y + Math.random() * 2, z: p.pos.z + Math.sin(a) * rr, vy: 4, life: 0.4, r: Math.random() < 0.5 ? 0.4 : 3, g: Math.random() < 0.5 ? 3 : 2.4, b: Math.random() < 0.5 ? 1.2 : 0.4, size: 0.2, gravity: -2, drag: 1, sizeEnd: 0.05, shape: 'square' }); } });
    this.after(0.62, () => {
      const c = p.pos.clone();
      this.blast(c, R, (50 + rk * 12) * (big ? 1.8 : 1), { color: GREEN, knock: 12, stagger: 1 });
      for (let i = 0; i < 3; i++) g.fx.rings.spawn(tmp.set(c.x, c.y + 0.1 + i * 0.8, c.z), { color: i % 2 ? GOLD : GREEN, r0: 0.5, r1: R + i, dur: 0.5 + i * 0.1, thick: 0.15 });
      g.lights.flash(c.clone().setY(c.y + 2), GREEN, 20, R + 6, 0.4, { priority: 6 });
      g.fx.flash(0x40ff9a, 0.25, 0.2); g.fx.chroma(0.8);
      g.particles.burst(c.clone().setY(c.y + 1.2), { count: 50, color: GREEN, speed: 14, up: 1.5, life: 0.7, size: 0.16, sizeEnd: 0.03 });
    });
  }
  // ------------------------------------------------------------ Fever (abilities)
  riichiRoll() {
    const g = this.game, p = this.p;
    this.cast(0.35);
    const digit = () => 1 + Math.floor(Math.random() * 9);
    const triple = Math.random() < 1 / 9 + this.fever * 0.003 + this.rank('riichi') * 0.04;
    const pair = !triple && Math.random() < 0.45 + this.rank('riichi') * 0.08;
    let reels;
    if (triple) { const n = Math.random() < 0.5 ? 7 : digit(); reels = [n, n, n]; }
    else if (pair) { const n = digit(); reels = [n, n, n % 9 + 1]; }
    else { reels = [digit(), digit(), digit()]; if (reels[0] === reels[1]) reels[1] = reels[1] % 9 + 1; if (reels[2] === reels[0] || reels[2] === reels[1]) reels[2] = (Math.max(reels[0], reels[1]) % 9) + 1; }
    const show = (txt, col) => g.fx.damageNumber(p.pos.clone().setY(p.pos.y + 0.8), 0, { text: txt, color: col, crit: true });
    for (let i = 0; i < 6; i++) this.after(i * 0.09, () => { show(`🎰 ${digit()} | ${digit()} | ${digit()}`, '#9affb8'); g.audio?.tone({ freq: 1100 + i * 80, dur: 0.04, gain: 0.04, type: 'square' }); });
    this.after(0.6, () => {
      show(`🎰 ${reels.join(' | ')}`, triple ? '#ffd23a' : pair ? '#ff5ac8' : '#c8c8d8');
      if (triple) {
        g.toast?.('🎰 MINI JACKPOT!', 'big');
        p.gainCE(30); p.healOverTime = { left: p.maxHp * 0.2, t: 1.5 };
        this.statBuff('mini_jackpot', 8, { damage: 0.3 });
        this.addFever(30);
        g.fx.flash(GOLD, 0.35, 0.25);
        g.particles.burst(p.pos.clone().setY(p.pos.y + 1.4), { count: 40, color: GOLD, speed: 9, up: 2, gravity: 10, life: 1, size: 0.14, shape: 1 });
        for (let i = 0; i < 6; i++) this.after(i * 0.07, () => g.audio?.coin());
      } else if (pair) {
        g.toast?.('🎰 REACH! Riichi: +25% attack speed');
        this.statBuff('riichi', 6, { attackSpeed: 0.25 });
        this.addFever(15);
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: PINK, r0: 0.4, r1: 3, dur: 0.4, thick: 0.15 });
        g.audio?.charge(0.3, 1.5);
      } else { this.addFever(10); g.audio?.ui('back'); }
    });
  }
  hotStreak() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    this.statBuff('hot_streak', 8, { attackSpeed: 0.15 }, { onTick: () => { if (Math.random() < 0.3) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.8, y: p.pos.y + Math.random() * 1.8, z: p.pos.z + (Math.random() - 0.5) * 0.8, vy: 1.6, life: 0.5, r: 3, g: 1.4, b: 0.3, size: 0.12, gravity: -1, drag: 1, sizeEnd: 0.1, shape: 'square' }); } });
    g.toast?.('♨️ Hot Streak — double Fever');
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0xff8a3a, r0: 0.4, r1: 3.2, dur: 0.4, thick: 0.15 });
    g.audio?.energy('fire');
  }
  allIn() {
    const g = this.game, p = this.p;
    if (this.fever < 10) { g.toast?.('Not enough Fever to bet (10+)'); g.audio?.ui('back'); return false; }
    const f = this.fever; this.fever = 0;
    const R = 3.5 + f / 25, dmg = 20 + f * 0.9;
    this.cast(0.45, true);
    const c = p.pos.clone().addScaledVector(this.fwd(), 1.5);
    this.blast(c, R, dmg, { color: GOLD, knock: 9, stagger: 0.8 });
    if (f >= 80) { for (const e of this.foes(c, R)) this.stun(e, 1.2); g.toast?.('🪙 BIG WIN!', 'big'); g.fx.flash(GOLD, 0.4, 0.25); }
    g.particles.burst(c.clone().setY(c.y + 1), { count: 20 + Math.round(f / 2), color: GOLD, speed: 10, up: 2, gravity: 12, life: 0.9, size: 0.14, shape: 1 });
    for (let i = 0; i < 5; i++) this.after(i * 0.06, () => g.audio?.coin());
  }
  luckyBreak() {
    const rich = this.fever > 50;
    if (this.rctHeal(rich ? 0.3 : 0.2, 2, GREEN) === false) return false;
    if (rich) this.fever -= 30;
    this.game.toast?.(rich ? '🍀 Lucky break! (Fever spent)' : '🍀 Lucky break');
  }
  luckySeven() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    this.lucky7 = 7;
    this.statBuff('lucky7', 10, { crit: 1 }, { onTick: () => { if (Math.random() < 0.25) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.8, y: p.pos.y + 1 + Math.random(), z: p.pos.z + (Math.random() - 0.5) * 0.8, vy: 1, life: 0.6, r: 3, g: 2.4, b: 0.4, size: 0.14, drag: 1, sizeEnd: 0.1, shape: 'square' }); } });
    g.fx.damageNumber(p.pos.clone().setY(p.pos.y + 0.8), 0, { text: '7 | 7 | 7', color: '#ffd23a', crit: true });
    g.toast?.('7️⃣ Lucky Seven — the next 7 hits are critical');
    g.fx.flash(GOLD, 0.2, 0.15);
    for (let i = 0; i < 3; i++) this.after(i * 0.1, () => g.audio?.coin());
  }
  dispose() {
    super.dispose();
    this.closeParlour(this.game);
    this.jackpotT = 0; this.speedMul = 1;   // stats are rebuilt with the next kit
  }
}
registerKit('hakari', HakariKit, HAKARI_SKILLS);
