// Megumi-style kit — Ten Shadows. 21 abilities on the technique tree: the
// ten shikigami, shadow techniques and stored tools; four are equipped (RMB
// takes a basic one) plus F.
//   Shadows    Shadow Step (start, RMB), Shadow Storage: Blade, Kunai Volley,
//              Shadow Swamp, Shadow Dive
//   Dogs       Divine Dogs, Divine Dog: Hunt, Black & White Pincer, Divine Dog: Totality
//   Beasts     Nue, Nue: Glide, Nue: Thunder Dive, Toad, Toad: Tongue Pull,
//              Rabbit Escape, Round Deer
//   Great      Great Serpent, Piercing Ox, Tiger Funeral, Max Elephant,
//              Eight-Handled Sword Divergent Sila Divine General Mahoraga
//   F          Domain: Chimera Shadow Garden (incomplete — no sure-hit) — the floor
//              floods with liquid shadow, curses sink and flounder, shikigami rise
//              from any shadow and Shadow Step reaches anywhere inside.
// The temporary shikigami (serpent, elephant, ox, tiger, deer, rabbits,
// Mahoraga…) are blocky models built here; the lasting ones (dogs, Nue,
// Toad) are Ally entities (entities/ally.js).
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit } from './index.js';
import { Ally } from '../entities/ally.js';

const SHADOW = 0x6a6aff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

export const MEGUMI_SKILLS = [
  { id: 'shikigami', name: 'Ten Shadows', icon: '🐾', desc: '+20% shikigami damage per rank.', max: 3, branch: 'Dogs', tier: 0 },
  { id: 'dogs_totality', name: 'Loyal Hounds', icon: '🐕', desc: 'Divine Dogs last longer and are tougher.', max: 2, req: 'shikigami', branch: 'Dogs', tier: 2 },
  { id: 'nue_storm', name: 'Nue Storm', icon: '🌩️', desc: 'Nue lasts longer and attacks faster.', max: 2, req: 'ab:nue', branch: 'Beasts', tier: 3 },
  { id: 'toad_grip', name: 'Toad Grip', icon: '👅', desc: 'Toad is tougher and pulls harder.', max: 2, req: 'ab:toad', branch: 'Beasts', tier: 2 },
  { id: 'shadow_step', name: 'Shadow Swim', icon: '🌊', desc: 'Shadow Step reaches further and hits harder.', max: 3, req: 'ab:shadow_step', branch: 'Shadows', tier: 1 },
  { id: 'blade', name: 'Shadow Blade', icon: '🗡️', desc: '+8% melee damage per rank.', max: 3, branch: 'Shadows', tier: 2, req: 'ab:shadow_blade' },
  { id: 'garden', name: 'Chimera Garden', icon: '🌑', desc: 'Domain lasts 2s longer and spawns more shikigami.', max: 2, req: 'core:unlock_domain', branch: 'Great', tier: 0 },
];

// ---------------------------------------------------------------- blocky shikigami
const mats = new Map();
const M = (hex, e = 0) => { const k = hex + ':' + e; if (!mats.has(k)) mats.set(k, new THREE.MeshStandardNodeMaterial({ color: hex, roughness: 0.75, emissive: e ? hex : 0, emissiveIntensity: e })); return mats.get(k); };
function box(parent, w, h, d, x, y, z, hex, e = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(hex, e)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
const BEASTS = {
  serpent() {
    const root = new THREE.Group(), segs = [];
    for (let i = 0; i < 7; i++) { const s = box(root, 1.2 - i * 0.05, 0.9, 1.2 - i * 0.05, 0, 0.45 + i * 0.85, 0, i % 2 ? 0x1a1424 : 0x2a2038); box(s, 0.2, 0.5, 1.22 - i * 0.05, i % 2 ? 0.35 : -0.35, 0, 0, 0xe8e0f0); segs.push(s); }
    const head = grp(root, 0, 6.4, 0.3);
    box(head, 1.4, 0.8, 1.8, 0, 0, 0.3, 0x1a1424); box(head, 0.2, 0.15, 0.1, -0.4, 0.3, 1.2, 0xffe04a, 3); box(head, 0.2, 0.15, 0.1, 0.4, 0.3, 1.2, 0xffe04a, 3);
    const jaw = grp(head, 0, -0.4, 0); box(jaw, 1.3, 0.35, 1.7, 0, -0.1, 0.35, 0x2a2038);
    for (const x of [-0.45, 0.45]) { box(head, 0.12, 0.4, 0.12, x, -0.5, 1.1, 0xffffff); }
    return { root, head, jaw, segs };
  },
  elephant() {
    const root = new THREE.Group(), c = 0x5a5a6e, d = 0x3a3a4a;
    const body = grp(root, 0, 2.4, 0);
    box(body, 2.6, 2.2, 3.6, 0, 0, 0, c); box(body, 2.62, 0.5, 3.62, 0, 0.6, 0, d);
    for (const [x, z] of [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]]) box(body, 0.8, 1.9, 0.8, x, -1.9, z, c);
    const head = grp(body, 0, 0.4, 2.1); box(head, 1.8, 1.7, 1.2, 0, 0, 0, c);
    for (const x of [-1.2, 1.2]) box(head, 0.8, 1.5, 0.15, x, 0, -0.2, d);
    box(head, 0.18, 0.18, 0.06, -0.5, 0.3, 0.62, 0xffffff, 2); box(head, 0.18, 0.18, 0.06, 0.5, 0.3, 0.62, 0xffffff, 2);
    for (const x of [-0.55, 0.55]) box(head, 0.18, 0.18, 1.2, x, -0.7, 0.8, 0xf0ead8);
    const trunk = grp(head, 0, -0.5, 0.65);
    for (let i = 0; i < 4; i++) box(trunk, 0.5 - i * 0.06, 0.5, 0.5 - i * 0.06, 0, -0.3 - i * 0.45, 0.15 * i, c);
    return { root, body, head, trunk };
  },
  rabbit() { const root = new THREE.Group(); box(root, 0.32, 0.28, 0.4, 0, 0.16, 0, 0xf4f4f8); box(root, 0.24, 0.22, 0.22, 0, 0.32, 0.2, 0xf4f4f8); box(root, 0.06, 0.24, 0.05, -0.06, 0.52, 0.18, 0xf4f4f8); box(root, 0.06, 0.24, 0.05, 0.06, 0.52, 0.18, 0xf4f4f8); return { root }; },
  deer() {
    const root = new THREE.Group(), c = 0xe8e4f0;
    box(root, 1.3, 1.2, 1.5, 0, 1.4, 0, c);
    for (const [x, z] of [[-0.4, 0.5], [0.4, 0.5], [-0.4, -0.5], [0.4, -0.5]]) box(root, 0.22, 0.9, 0.22, x, 0.45, z, 0x2a2a34);
    const head = grp(root, 0, 2.1, 0.8); box(head, 0.6, 0.6, 0.7, 0, 0, 0, c); box(head, 0.1, 0.1, 0.05, -0.18, 0.08, 0.36, 0x6affc8, 3); box(head, 0.1, 0.1, 0.05, 0.18, 0.08, 0.36, 0x6affc8, 3);
    // the antler halo of Round Deer
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; box(head, 0.14, 0.14, 0.14, Math.cos(a) * 0.9, 0.9 + Math.sin(a) * 0.9, -0.2, 0x9affd8, 1.5); }
    return { root, head };
  },
  ox() {
    const root = new THREE.Group();
    const body = grp(root, 0, 1.3, 0); box(body, 1.6, 1.5, 2.6, 0, 0, 0, 0x16141c);
    for (const [x, z] of [[-0.5, 0.9], [0.5, 0.9], [-0.5, -0.9], [0.5, -0.9]]) box(body, 0.4, 1, 0.4, x, -1, z, 0x16141c);
    const head = grp(body, 0, 0.2, 1.6); box(head, 1.1, 1, 0.9, 0, 0, 0, 0x22202a);
    for (const s of [-1, 1]) { box(head, 0.8, 0.2, 0.2, s * 0.8, 0.45, 0.1, 0xf0ead8); box(head, 0.2, 0.6, 0.2, s * 1.15, 0.8, 0.1, 0xf0ead8); }
    box(head, 0.14, 0.14, 0.05, -0.3, 0.15, 0.46, 0xff3a3a, 3); box(head, 0.14, 0.14, 0.05, 0.3, 0.15, 0.46, 0xff3a3a, 3);
    return { root, body };
  },
  tiger() {
    const root = new THREE.Group();
    const body = grp(root, 0, 1.1, 0); box(body, 1.1, 1, 2.4, 0, 0, 0, 0xeeeae2);
    for (let i = 0; i < 4; i++) box(body, 1.12, 0.2, 0.18, 0, 0.2, -0.8 + i * 0.5, 0x101014);
    for (const [x, z] of [[-0.35, 0.8], [0.35, 0.8], [-0.35, -0.8], [0.35, -0.8]]) box(body, 0.3, 0.9, 0.3, x, -0.7, z, 0xeeeae2);
    const head = grp(body, 0, 0.35, 1.4); box(head, 0.9, 0.8, 0.8, 0, 0, 0, 0xeeeae2); box(head, 0.92, 0.15, 0.6, 0, 0.3, 0, 0x101014);
    box(head, 0.14, 0.1, 0.05, -0.22, 0.08, 0.41, 0xffd040, 3); box(head, 0.14, 0.1, 0.05, 0.22, 0.08, 0.41, 0xffd040, 3);
    const tail = grp(body, 0, 0.3, -1.2); box(tail, 0.15, 0.15, 1.1, 0, 0, -0.55, 0x101014);
    return { root, body, head };
  },
  mahoraga() {
    const root = new THREE.Group(), skin = 0xd8d4c8, dark = 0x2a2620;
    box(root, 0.5, 1.6, 0.5, -0.4, 0.8, 0, skin); box(root, 0.5, 1.6, 0.5, 0.4, 0.8, 0, skin);
    box(root, 1.6, 0.5, 0.9, 0, 1.75, 0, 0xf0ece0);
    const torso = grp(root, 0, 2, 0); box(torso, 1.5, 1.6, 0.9, 0, 0.8, 0, skin); box(torso, 1.52, 0.2, 0.92, 0, 0.4, 0, dark);
    const head = grp(torso, 0, 1.95, 0); box(head, 0.7, 0.7, 0.7, 0, 0, 0, skin);
    for (const x of [-0.18, 0.18]) for (const y of [0.12, -0.05]) box(head, 0.12, 0.06, 0.04, x, y, 0.36, 0xffffff, 2);
    box(head, 0.8, 0.2, 0.2, 0, 0.3, -0.38, dark);   // the feathered wings at the head
    const wheel = grp(head, 0, 1.05, 0);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const sp = box(wheel, 0.08, 0.7, 0.08, Math.sin(a) * 0.35, Math.cos(a) * 0.35, 0, 0xc8a050, 0.6); sp.rotation.z = -a;
      box(wheel, 0.2, 0.2, 0.2, Math.sin(a) * 0.75, Math.cos(a) * 0.75, 0, 0xe8c060, 1);
    }
    box(wheel, 0.22, 0.22, 0.22, 0, 0, 0, 0xe8c060, 1);
    const armL = grp(torso, -0.95, 1.4, 0); box(armL, 0.4, 1.4, 0.4, 0, -0.6, 0, skin);
    const armR = grp(torso, 0.95, 1.4, 0); box(armR, 0.4, 1.4, 0.4, 0, -0.6, 0, skin);
    // Sword of Extermination
    const sword = grp(armR, 0, -1.3, 0.2); box(sword, 0.18, 0.18, 2.8, 0, 0, 1.4, 0xf0f0ff, 1.2); box(sword, 0.5, 0.12, 0.12, 0, 0, 0.05, 0xc8a050);
    return { root, torso, head, wheel, armR, armL, sword };
  },
  bird() {
    const root = new THREE.Group(); const body = grp(root, 0, 0, 0);
    box(body, 0.6, 0.5, 1.1, 0, 0, 0, 0x2a2a3a); const head = grp(body, 0, 0.2, 0.65); box(head, 0.45, 0.45, 0.45, 0, 0, 0, 0xe8e8f0); box(head, 0.12, 0.12, 0.3, 0, -0.05, 0.3, 0xd8a030);
    const wings = []; for (const s of [-1, 1]) { const w = grp(body, s * 0.3, 0.1, 0); box(w, 1.8, 0.07, 0.7, s * 0.9, 0, 0, 0x2a2a3a); wings.push(w); }
    return { root, wings };
  },
  toad() { const root = new THREE.Group(); box(root, 1.1, 0.8, 1, 0, 0.4, 0, 0x4a6a3a); box(root, 0.28, 0.28, 0.28, -0.32, 0.9, 0.3, 0x4a6a3a); box(root, 0.28, 0.28, 0.28, 0.32, 0.9, 0.3, 0x4a6a3a); const tongue = box(root, 0.16, 0.08, 1, 0, 0.45, 1, 0xff5a8a, 0.5); return { root, tongue }; },
  dogHead(c) { const root = new THREE.Group(); box(root, 0.6, 0.55, 0.7, 0, 0, 0, c); box(root, 0.36, 0.3, 0.45, 0, -0.08, 0.5, c); box(root, 0.14, 0.3, 0.12, -0.2, 0.38, -0.1, c); box(root, 0.14, 0.3, 0.12, 0.2, 0.38, -0.1, c); box(root, 0.1, 0.07, 0.03, -0.16, 0.1, 0.36, 0xffffff, 3); box(root, 0.1, 0.07, 0.03, 0.16, 0.1, 0.36, 0xffffff, 3); return { root }; },
};

class MegumiKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.32, windup: 0.3, strike: 0.52, dmg: 12, range: 2.8, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: SHADOW, sparkColor: 0xb0b0ff },
      { style: 'swingL', dur: 0.32, windup: 0.3, strike: 0.52, dmg: 12, range: 2.8, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: SHADOW, sparkColor: 0xb0b0ff },
      { style: 'spin', dur: 0.46, windup: 0.3, strike: 0.55, dmg: 20, range: 3, arc: Math.PI, lunge: 3, knock: 8, stop: 0.07, shake: 0.28, ring: true, ringColor: SHADOW, trail: SHADOW },
    ];
    this.p.stats.meleeMult += r('blade') * 0.08;
    this.shikiMul = 1; this.lifeMul = 1;
    this.branches = ['Shadows', 'Dogs', 'Beasts', 'Great'];
    this.library = {
      // ---- Shadows
      shadow_step: ability({ name: 'Shadow Step', icon: '🌑', kind: 'basic', rmb: true, desc: 'Sink into your shadow and burst out at the aim point, striking around you.', cd: 3.2, ce: 0, branch: 'Shadows', tier: 0, start: true, legacy: 'ranged', use: () => this.shadowStep() }),
      shadow_blade: ability({ name: 'Shadow Storage: Blade', icon: '🗡️', kind: 'basic', desc: 'Draw a blade from your shadow and hurl it; it pierces every curse in its path.', cd: 0.8, ce: 0, branch: 'Shadows', tier: 1, req: 'shadow_step', use: () => this.throwBlade() }),
      kunai_volley: ability({ name: 'Shadow Storage: Kunai', icon: '🔪', kind: 'basic', desc: 'Pull a fan of stored kunai out of the shadow and throw them all at once.', cd: 1.6, ce: 3, branch: 'Shadows', tier: 2, req: 'shadow_blade', use: () => this.kunai() }),
      shadow_swamp: ability({ name: 'Shadow Swamp', icon: '🕳️', kind: 'technique', desc: 'Spread your shadow into a swamp: curses in it sink, flounder and are dragged under.', cd: 12, ce: 18, branch: 'Shadows', tier: 3, req: 'shadow_step', use: () => this.swamp() }),
      shadow_dive: ability({ name: 'Shadow Dive', icon: '🫥', kind: 'defence', desc: 'Submerge in your shadow for 1.5s — untouchable and faster — then erupt from it.', cd: 10, ce: 10, branch: 'Shadows', tier: 4, req: 'shadow_swamp', use: () => this.dive() }),
      // ---- Divine Dogs
      divine_dogs: ability({ name: 'Divine Dogs', icon: '🐺', kind: 'summon', desc: 'Two shadow wolves, white and black, hunt the nearest curses.', cd: 14, ce: 14, branch: 'Dogs', tier: 1, legacy: 't1', use: () => this.summon('dog') }),
      dog_hunt: ability({ name: 'Divine Dog: Hunt', icon: '🐶', kind: 'basic', desc: 'A Divine Dog\'s head lunges out of your shadow and bites the curse you aim at.', cd: 1.1, ce: 0, branch: 'Dogs', tier: 2, req: 'divine_dogs', use: () => this.dogHunt() }),
      dog_pincer: ability({ name: 'Black & White Pincer', icon: '☯️', kind: 'technique', desc: 'Both Divine Dogs burst from the shadows on either side of a curse and maul it.', cd: 7, ce: 12, branch: 'Dogs', tier: 3, req: 'dog_hunt', use: () => this.pincer() }),
      totality: ability({ name: 'Divine Dog: Totality', icon: '🐕‍🦺', kind: 'summon', desc: 'The two dogs merge into one huge wolf that rampages through the curses.', cd: 28, ce: 30, branch: 'Dogs', tier: 4, req: 'dog_pincer', use: () => this.totality() }),
      // ---- Beasts
      nue: ability({ name: 'Nue', icon: '🦅', kind: 'summon', desc: 'A thunder-bird that dive-bombs curses with lightning.', cd: 16, ce: 14, branch: 'Beasts', tier: 1, legacy: 't2', use: () => this.summon('nue') }),
      nue_glide: ability({ name: 'Nue: Glide', icon: '🪽', kind: 'movement', desc: 'Nue swoops down and carries you to where you aim.', cd: 6, ce: 6, branch: 'Beasts', tier: 2, req: 'nue', use: () => this.glide() }),
      nue_thunder: ability({ name: 'Nue: Thunder Dive', icon: '🌩️', kind: 'technique', desc: 'Nue dives out of the sky onto a curse; the lightning arcs to the curses near it.', cd: 8, ce: 14, branch: 'Beasts', tier: 3, req: 'nue', use: () => this.thunderDive() }),
      toad: ability({ name: 'Toad', icon: '🐸', kind: 'summon', desc: 'A shikigami toad that tongue-pulls and stuns curses.', cd: 12, ce: 10, branch: 'Beasts', tier: 1, legacy: 't3', use: () => this.summon('toad') }),
      toad_tongue: ability({ name: 'Toad: Tongue Pull', icon: '👅', kind: 'technique', desc: 'A toad pops out at your feet and yanks the aimed curse to you, stunned.', cd: 6, ce: 8, branch: 'Beasts', tier: 2, req: 'toad', use: () => this.tongue() }),
      rabbit: ability({ name: 'Rabbit Escape', icon: '🐇', kind: 'defence', desc: 'A flood of rabbits pours out: you vanish among them and nearby curses lose track of everything.', cd: 16, ce: 14, branch: 'Beasts', tier: 3, req: 'toad_tongue', use: () => this.rabbits() }),
      deer: ability({ name: 'Round Deer', icon: '🦌', kind: 'heal', desc: 'Round Deer\'s reverse cursed energy heals you and your allies for 6s.', cd: 30, ce: 25, branch: 'Beasts', tier: 4, req: 'rabbit', use: () => this.deer() }),
      // ---- Great shikigami
      serpent: ability({ name: 'Great Serpent', icon: '🐍', kind: 'summon', desc: 'The Great Serpent erupts from the ground under a curse, seizes it and hurls it skyward.', cd: 10, ce: 18, branch: 'Great', tier: 2, req: 'divine_dogs', use: () => this.serpent() }),
      ox: ability({ name: 'Piercing Ox', icon: '🐂', kind: 'summon', desc: 'An ox charges in a straight line; the further it runs, the harder it hits.', cd: 12, ce: 20, branch: 'Great', tier: 3, req: 'serpent', use: () => this.oxCharge() }),
      tiger: ability({ name: 'Tiger Funeral', icon: '🐅', kind: 'summon', desc: 'Tiger Funeral pounces on a curse and mauls it with three savage swipes.', cd: 14, ce: 22, branch: 'Great', tier: 3, req: 'serpent', use: () => this.tigerPounce() }),
      elephant: ability({ name: 'Max Elephant', icon: '🐘', kind: 'summon', desc: 'Max Elephant drops from the sky, crushing curses, then floods the area with a torrent of water.', cd: 20, ce: 35, branch: 'Great', tier: 4, req: ['ox', 'tiger'], use: () => this.elephant() }),
      mahoraga: ability({ name: 'Mahoraga', icon: '☸️', kind: 'summon', desc: 'With this treasure, I summon… Eight-Handled Sword Divergent Sila Divine General Mahoraga. It slaughters the curses — and may turn on you.', cd: 90, ce: 90, branch: 'Great', tier: 5, req: 'elephant', use: () => this.mahoraga() }),
    };
    this.passives = {
      mastery: passive({ name: 'Shikigami Mastery', icon: '🐾', desc: 'Shikigami (lasting and temporary) deal 25% more damage.', branch: 'Dogs', tier: 2, req: 'divine_dogs', apply: (pl, k) => { k.shikiMul *= 1.25; } }),
      reserve: passive({ name: 'Deep Shadows', icon: '🌒', desc: 'Summoned shikigami last 30% longer.', branch: 'Beasts', tier: 2, req: 'nue', apply: (pl, k) => { k.lifeMul *= 1.3; } }),
      bond: passive({ name: 'Bonded Beasts', icon: '🔗', desc: 'When one of your shikigami is destroyed you regain 8 Cursed Energy.', branch: 'Great', tier: 3, req: 'serpent', apply: (pl, k) => { k.bond = true; } }),
      footing: passive({ name: 'Shadow Footing', icon: '👣', desc: 'Movement and defence abilities recharge 25% faster.', branch: 'Shadows', tier: 2, req: 'shadow_step', apply: (pl, k) => { for (const a of Object.values(k.library)) if (a.kind === 'movement' || a.kind === 'defence' || a.id === 'shadow_step') a.cd *= 0.75; } }),
    };
    // Canon: Megumi's domain is INCOMPLETE — it has no sure-hit. Instead the
    // ground becomes a sea of shadow: curses sink and flounder in it, Megumi
    // can surface anywhere (Shadow Step reaches the whole domain), and
    // shikigami rise out of any shadow, including the curses' own.
    this.domain = {
      name: 'Chimera Shadow Garden', icon: '🌑', key: 'chimera_garden', type: 3, color: 0x8a8aff, sound: 'garden', flash: 0x101020,
      duration: 8 + r('garden') * 2, radius: 24, sureHit: false,
      onStart: (g, d) => {
        g.toast?.('Incomplete domain — no sure-hit; shikigami rise from every shadow');
        const n = 2 + r('garden');
        const foes = [...this.inDomain()];
        for (let i = 0; i < n; i++) { const e = foes[i % Math.max(1, foes.length)]; this.summon(i % 3 === 2 ? 'nue' : i % 2 ? 'toad' : 'dog', true, e?.pos); }
        d.rise = 1.4;
      },
      onTick: (g, d, dt) => {
        d.tick = (d.tick ?? 0) - dt; d.rise -= dt;
        const list = [];
        for (const e of g.enemies) {
          if (e.dead || e.isDummy || !g.domainSys.inside(e.pos)) continue;
          list.push(e);
          e.slowT = 0.3;   // floundering in liquid shadow
          if (Math.random() < 0.15) g.particles.burst(e.pos.clone().setY(e.pos.y + 0.1), { count: 2, color: 0x05050a, additive: false, speed: 1.5, up: 1.2, life: 0.5, size: 0.3, sizeEnd: 0.9 });
        }
        // a curse is dragged under the shadow for a moment
        if (d.tick <= 0) {
          d.tick = 0.6;
          for (let i = 0; i < Math.min(3, list.length); i++) {
            const e = list[Math.floor(Math.random() * list.length)];
            g.combat.damageEnemy(e, 7, this.p, { stagger: 0.3, ceGain: 0 });
            if (!e.isBoss) e.sealT = Math.max(e.sealT ?? 0, 0.5);
            g.fx.darkRings.spawn(tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z), { color: 0x000000, r0: 0.4, r1: 1.8, dur: 0.4, thick: 0.3 });
            g.particles.burst(e.pos.clone().setY(e.pos.y + 0.2), { count: 10, color: 0x05050a, additive: false, speed: 3, up: 3, life: 0.5, size: 0.3, sizeEnd: 1.2 });
          }
        }
        // shikigami surface from a curse's shadow
        if (d.rise <= 0 && list.length) {
          d.rise = 1.6 - r('garden') * 0.3;
          const mine = g.allies.filter((a) => a.owner === this.p && !a.dead).length;
          if (mine < 6) { const e = list[Math.floor(Math.random() * list.length)]; this.summon(Math.random() < 0.6 ? 'dog' : 'toad', true, e.pos); }
        }
      },
    };
    this.props = new Set();
  }
  inMyGarden() { const d = this.game.domain; return d && d.caster === this.p && d.phase === 'hold'; }
  tick(dt) {
    // the whole garden is Megumi's shadow: Shadow Step recovers much faster
    const step = this.library.shadow_step;
    if (this.inMyGarden()) step.cdLeft = Math.max(0, step.cdLeft - dt * 2);
  }
  dispose() { super.dispose(); for (const o of this.props) this.game.scene.remove(o); this.props.clear(); if (this.diving) this.endDive(); }
  // a temporary shikigami model in the scene (removed with the kit)
  prop(kind, pos, scale = 1, ...args) {
    const b = BEASTS[kind](...args);
    b.root.position.copy(pos); b.root.scale.setScalar(scale);
    this.game.scene.add(b.root); this.props.add(b.root);
    b.remove = () => { this.game.scene.remove(b.root); this.props.delete(b.root); };
    return b;
  }
  shadowPuff(at, n = 26, s = 1) {
    const g = this.game;
    g.particles.burst(tmp.set(at.x, at.y + 0.3, at.z), { count: n, color: 0x05050a, additive: false, speed: 3 * s, up: 1.5, life: 0.7, size: 0.5 * s, sizeEnd: 2 * s });
    g.fx.darkRings.spawn(tmp.set(at.x, at.y + 0.06, at.z), { color: 0x000000, r0: 1.6 * s, r1: 0.2, dur: 0.35, thick: 0.4 });
  }
  sdmg(x) { return x * this.shikiMul * (1 + this.rank('shikigami') * 0.2); }
  summon(kind, free = false, at = null) {
    const g = this.game, p = this.p;
    const mine = g.allies.filter((a) => a.owner === p && a.kind === kind && !a.dead && !a.big);
    const max = kind === 'dog' ? 2 : 1;
    // re-summoning refreshes: dismiss the oldest
    while (!free && mine.length >= max) mine.shift().despawn();
    const n = kind === 'dog' && !free ? 2 : 1;
    if (!free) this.cast(0.45, true);
    g.audio?.energy('summon');
    for (let i = 0; i < n; i++) {
      const side = new THREE.Vector3(Math.cos(p.facing), 0, -Math.sin(p.facing)).multiplyScalar(i ? 1.4 : -1.4);
      // from the summoner's shadow — or, inside the garden, from the shadow under a curse
      const pos = at ? at.clone().add(tmp.set((Math.random() - 0.5) * 2.4, 0, (Math.random() - 0.5) * 2.4)) : p.pos.clone().addScaledVector(p.aimDir, 1.2).add(side);
      const gy = g.world.groundBelow(pos.x, pos.z, (at ? at.y : p.pos.y) + 2); pos.y = isFinite(gy) ? gy : (at ? at.y : p.pos.y);
      const life = (kind === 'dog' ? 20 + this.rank('dogs_totality') * 8 : kind === 'nue' ? 15 + this.rank('nue_storm') * 5 : 15) * this.lifeMul;
      const hpMult = kind === 'dog' ? 1 + this.rank('dogs_totality') * 0.4 : kind === 'toad' ? 1 + this.rank('toad_grip') * 0.4 : 1;
      const a = new Ally(g, p, kind, pos, { life: free ? 10 : life, hpMult, dmgMult: (1 + this.rank('shikigami') * 0.2) * this.shikiMul, color: (free ? Math.random() < 0.5 : i) ? 0x151518 : 0xf0f0f4 });
      if (kind === 'nue' && this.rank('nue_storm')) a.S = { ...a.S, cd: a.S.cd * (1 - 0.2 * this.rank('nue_storm')) };
      this.watchAlly(a);
      g.allies.push(a);
    }
  }
  watchAlly(a) {
    const orig = a.despawn.bind(a);
    a.despawn = () => { if (!a.dead && this.bond && a.hp <= 0) this.p.gainCE(8); orig(); };
  }
  shadowStep() {
    const g = this.game, p = this.p;
    const range = this.inMyGarden() ? 28 : 8 + this.rank('shadow_step') * 1.5;
    const to = p.aimPoint.clone(); tmp.subVectors(to, p.pos).setY(0);
    if (tmp.length() > range) to.copy(p.pos).addScaledVector(tmp.normalize(), range);
    const gy = g.world.groundBelow(to.x, to.z, p.pos.y + 3);
    if (!isFinite(gy) || Math.abs(gy - p.pos.y) > 4 || g.world.solidAt(to.x, gy + 0.5, to.z) || g.world.solidAt(to.x, gy + 1.5, to.z)) { g.audio?.ui('back'); return false; }
    to.y = gy;
    this.shadowPuff(p.pos);
    p.iframes = Math.max(p.iframes, 0.45);
    p.object.visible = false;
    g.audio?.energy('teleport');
    this.after(0.17, () => {
      p.pos.copy(to); p.visY = to.y; p.vel.set(0, 0, 0); p.object.visible = true;
      this.shadowPuff(to);
      const dmg = 16 + this.rank('shadow_step') * 8;
      g.combat.aoe(to, 2.6, dmg, p, { knock: 7, stagger: 0.6 });
      g.fx.shockwave(to, SHADOW, 3);
      g.shake(0.2); g.audio?.impact(1.1);
    });
  }
  // ============================================================== new abilities
  throwBlade() {
    const g = this.game, p = this.p;
    this.cast(0.26);
    this.shadowPuff(p.pos, 8, 0.5);
    const pr = this.shoot({ speed: 30, shape: 'nail', color: 0x9a9ac8, emissive: 1.2, scale: 2.6, life: 0.7, radius: 0.45, pierce: true,
      trail: (q) => g.particles.burst(q.pos, { count: 1, color: 0x05050a, additive: false, speed: 0.2, life: 0.3, size: 0.25, sizeEnd: 0.05 }),
      onHit: (e, q) => { this.hit(e, 17, { stagger: 0.3, knock: q.vel.clone().setLength(2) }); g.fx.hitSpark(q.pos, null, { color: 0xb0b0ff }); } });
    if (!pr) return false;
    g.audio?.whoosh(0.8);
  }
  kunai() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    this.shadowPuff(p.pos, 10, 0.6);
    const base = this.aimAngle();
    for (let i = 0; i < 5; i++) {
      const a = base + (i - 2) * 0.13, dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      g.projectiles.fire({ pos: this.handPos(), vel: dir.multiplyScalar(28), team: 'player', shape: 'nail', color: 0xc8c8e0, emissive: 0.8, life: 0.6, radius: 0.35,
        onHit: (e, q) => { this.hit(e, 9, { stagger: 0.15, knock: q.vel.clone().setLength(1.5) }); g.fx.hitSpark(q.pos, null, { color: 0xb0b0ff }); } });
    }
    g.audio?.energy('nail');
  }
  swamp() {
    const g = this.game, p = this.p;
    this.cast(0.45, true);
    const c = this.aimGround(11), R = 4.6;
    this.shadowPuff(c, 30, 1.4);
    let sink = 0;
    this.zone(c, R, 5, 0.5, (list) => {
      sink++;
      for (const e of list) {
        this.slow(e, 0.7); this.hit(e, 7, { stagger: 0.1, crit: false, ceGain: 0.5 });
        if (sink % 3 === 0) { this.stun(e, 0.6); g.fx.darkRings.spawn(tmp.set(e.pos.x, e.pos.y + 0.06, e.pos.z), { color: 0, r0: 0.3, r1: 1.6, dur: 0.4, thick: 0.3 }); }
      }
      for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * R; g.particles.burst(tmp.set(c.x + Math.cos(a) * rr, c.y + 0.1, c.z + Math.sin(a) * rr), { count: 2, color: 0x05050a, additive: false, speed: 0.6, up: 1.4, life: 0.8, size: 0.4, sizeEnd: 1.2 }); }
    }, { color: 0x3a3a8a, particles: 0.2 });
    g.fx.darkRings.spawn(tmp.set(c.x, c.y + 0.05, c.z), { color: 0, r0: 0.3, r1: R, dur: 0.5, thick: 0.6 });
    g.audio?.energy('summon');
  }
  dive() {
    const g = this.game, p = this.p;
    this.shadowPuff(p.pos, 30, 1.2);
    p.object.visible = false; p.invulnerable = true; this.diving = true;
    const prevSpeed = this.speedMul ?? 1;
    this.speedMul = prevSpeed * 1.6;
    g.audio?.energy('teleport');
    let trail = 0;
    this.during(1.5, (t, dt) => {
      trail -= dt;
      if (trail <= 0) { trail = 0.08; g.fx.darkRings.spawn(tmp.set(p.pos.x, p.pos.y + 0.05, p.pos.z), { color: 0, r0: 0.9, r1: 0.6, dur: 0.4, thick: 0.4 }); }
    }, () => this.endDive(prevSpeed));
  }
  endDive(prevSpeed = 1) {
    const g = this.game, p = this.p;
    if (!this.diving) return;
    this.diving = false;
    p.object.visible = true; p.invulnerable = false; this.speedMul = prevSpeed;
    if (this.disposed) return;
    this.shadowPuff(p.pos, 30, 1.2);
    g.combat.aoe(p.pos, 3, 30 + this.rank('shadow_step') * 6, p, { knock: 9, stagger: 0.7 });
    for (const e of this.foes(p.pos, 3)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
    g.fx.shockwave(p.pos, SHADOW, 3.5); g.shake(0.3); g.audio?.impact(1.3);
  }
  dogHunt() {
    const g = this.game, p = this.p;
    this.cast(0.28);
    const f = this.fwd(), L = 7.5;
    const white = Math.random() < 0.5;
    const head = this.prop('dogHead', p.pos.clone().addScaledVector(f, 0.6).setY(p.pos.y + 0.8), 1.2, white ? 0xf0f0f4 : 0x151518);
    head.root.rotation.y = Math.atan2(f.x, f.z);
    this.shadowPuff(p.pos, 10, 0.6);
    const from = head.root.position.clone();
    let bit = false;
    this.during(0.32, (t, dt, k) => {
      const out = k < 0.6 ? k / 0.6 : 1 - (k - 0.6) / 0.4;
      head.root.position.copy(from).addScaledVector(f, out * L);
      g.particles.burst(head.root.position, { count: 1, color: 0x05050a, additive: false, speed: 0.3, life: 0.35, size: 0.4, sizeEnd: 0.1 });
      if (!bit && k >= 0.6) {
        bit = true;
        this.line(p.pos, f, L + 0.5, 0.9, (e) => { this.hit(e, this.sdmg(15), { stagger: 0.45, knock: tmp.copy(f).multiplyScalar(-3) }); this.slow(e, 1.2); g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 0.8), null, { color: 0xb0b0ff }); });
        g.audio?.impact(0.9);
      }
    }, () => head.remove());
  }
  pincer() {
    const g = this.game, p = this.p, t = this.target(12);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    const side = tmp2.subVectors(t.pos, p.pos).setY(0).normalize(); const perp = new THREE.Vector3(side.z, 0, -side.x);
    const dogs = [1, -1].map((s, i) => {
      const at = t.pos.clone().addScaledVector(perp, s * 3.2); at.y = this.groundAt(at.x, at.z, t.pos.y);
      this.shadowPuff(at, 14, 0.8);
      const d = this.prop('dogHead', at.clone().setY(at.y + 0.7), 1.5, i ? 0x151518 : 0xf0f0f4);
      d.from = at.clone().setY(at.y + 0.7); d.s = s;
      return d;
    });
    g.audio?.energy('summon');
    this.during(0.45, (tt, dt, k) => {
      for (const d of dogs) {
        const to = t.pos.clone().setY(t.pos.y + 0.9);
        d.root.position.lerpVectors(d.from, to, Math.min(1, k * 1.6));
        d.root.lookAt(to);
      }
    }, () => {
      for (const d of dogs) { this.shadowPuff(d.root.position, 12, 0.6); d.remove(); }
      if (t.dead) return;
      this.hit(t, this.sdmg(52), { stagger: 1, unblockable: true, knock: new THREE.Vector3() });
      for (const e of this.foes(t.pos, 2.4)) if (e !== t) this.hit(e, this.sdmg(16), { stagger: 0.4 });
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + 1), null, { color: 0xffffff, big: true }); g.fx.slashX(t.pos.clone().setY(t.pos.y + 1), 2.6, 0xb0b0ff);
      g.hitStop(0.06); g.shake(0.35); g.audio?.impact(1.5);
    });
  }
  totality() {
    const g = this.game, p = this.p;
    for (const a of g.allies) if (a.owner === p && a.big && !a.dead) a.despawn();
    this.cast(0.6, true);
    const pos = p.pos.clone().addScaledVector(this.fwd(), 2.2); pos.y = this.groundAt(pos.x, pos.z, p.pos.y);
    this.shadowPuff(pos, 40, 1.8);
    const a = new Ally(g, p, 'dog', pos, { life: 22 * this.lifeMul, hpMult: 3.5 * (1 + this.rank('dogs_totality') * 0.4), dmgMult: 2.6 * this.shikiMul * (1 + this.rank('shikigami') * 0.2), color: 0x22222a });
    a.big = true; a.object.scale.setScalar(1.9); a.radius *= 1.7; a.height *= 1.8; a.S = { ...a.S, range: a.S.range * 1.6, speed: a.S.speed * 1.1, cd: 0.6 };
    this.watchAlly(a);
    g.allies.push(a);
    g.fx.shockwave(pos, SHADOW, 5); g.shake(0.4); g.audio?.energy('summon'); g.toast?.('Divine Dog: Totality');
  }
  glide() {
    const g = this.game, p = this.p;
    const to = this.aimGround(13);
    const from = p.pos.clone(), dist = from.distanceTo(to);
    if (dist < 1.5) return false;
    const bird = this.prop('bird', from.clone().setY(from.y + 3), 1.3);
    p.invulnerable = true;
    p.action = { type: 'cast', dur: 0.6, elapsed: 0, t: 0, both: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false };
    p.facing = Math.atan2(to.x - from.x, to.z - from.z);
    g.audio?.whoosh(1.3);
    this.during(0.55, (t, dt, k) => {
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k;
      const y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 3;
      if (!g.world.solidAt(x, y + 0.5, z) && !g.world.solidAt(x, y + 1.5, z)) { p.pos.set(x, y, z); p.visY = y; }
      p.vel.set(0, 0, 0);
      bird.root.position.set(p.pos.x, p.pos.y + 2.6, p.pos.z); bird.root.rotation.y = p.facing;
      bird.wings.forEach((w, i) => { w.rotation.z = Math.sin(t * 22) * 0.6 * (i ? -1 : 1); });
    }, () => {
      p.invulnerable = false; if (p.action?.lock) p.action = null;
      bird.remove(); this.shadowPuff(p.pos, 16, 0.8);
      g.bolts.spawn(p.pos.clone().setY(p.pos.y + 1), { count: 4, length: 2, life: 0.25 });
      g.combat.aoe(p.pos, 2.4, this.sdmg(14), p, { knock: 6, stagger: 0.4 });
    });
  }
  thunderDive() {
    const g = this.game, p = this.p;
    const t = this.target(14);
    const c = t ? t.pos.clone() : this.aimGround(12);
    this.cast(0.4, true);
    const bird = this.prop('bird', c.clone().add(tmp.set(-4, 9, -4)), 1.5);
    const start = bird.root.position.clone();
    bird.root.lookAt(c);
    g.audio?.whoosh(1.3);
    this.during(0.4, (tt, dt, k) => { bird.root.position.lerpVectors(start, tmp.copy(t && !t.dead ? t.pos : c).setY((t ? t.pos.y : c.y) + 1), k * k); bird.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * 0.5; }); }, () => {
      const at = (t && !t.dead ? t.pos : c).clone();
      bird.remove(); this.shadowPuff(at, 16, 0.8);
      g.bolts.spawn(at.clone().setY(at.y + 4), { count: 8, length: 4, life: 0.35 });
      g.lights.flash(at.clone().setY(at.y + 2), 0x9ad8ff, 18, 14, 0.3, { priority: 7 });
      g.combat.aoe(at, 3, this.sdmg(46), p, { knock: 7, stagger: 0.9 });
      g.fx.shockwave(at, 0x9ad8ff, 4); g.fx.flash(0xbfe8ff, 0.25, 0.12);
      // the lightning arcs to nearby curses
      const near = this.foes(at, 8).filter((e) => e.pos.distanceTo(at) > 2.5).slice(0, 3);
      for (const e of near) {
        this.hit(e, this.sdmg(20), { stagger: 0.5 });
        const from = at.clone().setY(at.y + 1.2), to = e.pos.clone().setY(e.pos.y + 1.2);
        for (let s = 0; s <= 1; s += 0.12) g.particles.burst(tmp.lerpVectors(from, to, s).add(tmp2.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4)), { count: 1, color: 0x9ad8ff, speed: 0.4, life: 0.25, size: 0.2, sizeEnd: 0.05, intensity: 4 });
        g.bolts.spawn(to, { count: 3, length: 1.5, life: 0.2 });
      }
      g.shake(0.4); g.audio?.impact(1.5);
    });
  }
  tongue() {
    const g = this.game, p = this.p, t = this.target(10);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    const f = tmp2.subVectors(t.pos, p.pos).setY(0).normalize();
    const toad = this.prop('toad', p.pos.clone().addScaledVector(f, 0.9), 1);
    toad.root.rotation.y = Math.atan2(f.x, f.z);
    this.shadowPuff(toad.root.position, 14, 0.7);
    const d = t.pos.distanceTo(p.pos);
    toad.tongue.scale.z = d; toad.tongue.position.z = 0.4 + d / 2;
    g.audio?.tone?.({ freq: 400, to: 150, dur: 0.2, gain: 0.08, type: 'triangle' });
    if (!t.isBoss) { t.knock.add(tmp.subVectors(p.pos, t.pos).setY(0).multiplyScalar(4.5)); this.stun(t, 1.1 + this.rank('toad_grip') * 0.3); }
    else { t.cancelAttack?.(); }
    this.hit(t, this.sdmg(16), { stagger: 0.9, knock: new THREE.Vector3() });
    this.during(0.35, (tt, dt, k) => { const dd = Math.max(0.5, t.pos.distanceTo(toad.root.position)); toad.tongue.scale.z = dd * (1 - k * 0.6); toad.tongue.position.z = 0.4 + toad.tongue.scale.z / 2; }, () => { this.after(0.3, () => { this.shadowPuff(toad.root.position, 10, 0.6); toad.remove(); }); });
  }
  rabbits() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    p.iframes = Math.max(p.iframes, 2); p.object.visible = false;
    this.after(0.9, () => { p.object.visible = true; });
    const bunnies = [];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 5;
      const b = this.prop('rabbit', p.pos.clone().add(tmp.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5)), 0.9 + Math.random() * 0.4);
      b.v = new THREE.Vector3(Math.cos(a) * sp, 0, Math.sin(a) * sp); b.root.rotation.y = Math.atan2(b.v.x, b.v.z); b.ph = Math.random() * 6;
      bunnies.push(b);
    }
    for (const e of this.foes(p.pos, 7)) { e.cancelAttack?.(); this.slow(e, 3); if (!e.isBoss) { this.stun(e, 0.8); e.target = null; } }
    g.audio?.energy('summon'); g.toast?.('Rabbit Escape');
    this.during(2.6, (t, dt) => {
      for (const b of bunnies) {
        b.root.position.addScaledVector(b.v, dt);
        b.root.position.y = this.groundAt(b.root.position.x, b.root.position.z, p.pos.y) + Math.abs(Math.sin(t * 9 + b.ph)) * 0.6;
        b.v.multiplyScalar(Math.pow(0.6, dt));
      }
    }, () => { for (const b of bunnies) { if (Math.random() < 0.3) this.shadowPuff(b.root.position, 4, 0.3); b.remove(); } });
  }
  deer() {
    const g = this.game, p = this.p;
    this.cast(0.5, true);
    const deer = this.prop('deer', p.pos.clone().add(tmp.set(1.6, 0, -1)), 1);
    this.shadowPuff(deer.root.position, 20, 1);
    g.audio?.energy('heal'); g.toast?.('Round Deer');
    let tick = 0;
    this.during(6, (t, dt) => {
      const want = tmp.copy(p.pos).add(tmp2.set(Math.sin(p.facing + 2.2) * 1.8, 0, Math.cos(p.facing + 2.2) * 1.8));
      deer.root.position.lerp(want, Math.min(1, dt * 3)); deer.root.position.y = this.groundAt(deer.root.position.x, deer.root.position.z, p.pos.y);
      deer.root.rotation.y = p.facing; deer.head.rotation.z = Math.sin(t * 2) * 0.1;
      tick -= dt;
      if (Math.random() < 0.5) g.particles.glow.spawn({ x: deer.root.position.x + (Math.random() - 0.5), y: deer.root.position.y + 3, z: deer.root.position.z + (Math.random() - 0.5), vy: 0.8, life: 0.8, r: 0.6, g: 2.2, b: 1.6, size: 0.12, drag: 1, sizeEnd: 0.05, shape: 'square' });
      if (tick > 0) return;
      tick = 0.5;
      for (const q of g.players) if (!q.dead && !q.downed && q.pos.distanceTo(deer.root.position) < 7) { q.heal(q.maxHp * 0.025, true); g.particles.burst(q.pos.clone().setY(q.pos.y + 1), { count: 4, color: 0x9affd8, speed: 1, up: 2, life: 0.6, size: 0.15 }); }
      for (const a of g.allies) if (a.owner === p && !a.dead) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.05);
      g.fx.rings.spawn(tmp.set(deer.root.position.x, deer.root.position.y + 0.06, deer.root.position.z), { color: 0x9affd8, r0: 0.5, r1: 7, dur: 0.5, thick: 0.06 });
    }, () => { this.shadowPuff(deer.root.position, 16, 0.9); deer.remove(); });
  }
  serpent() {
    const g = this.game, p = this.p;
    const t = this.target(13);
    const c = t ? t.pos.clone() : this.aimGround(12);
    this.cast(0.45, true);
    g.fx.darkRings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: 0, r0: 0.3, r1: 2.6, dur: 0.35, thick: 0.6 });
    this.after(0.3, () => {
      const at = (t && !t.dead ? t.pos : c).clone(); at.y = this.groundAt(at.x, at.z, at.y);
      const s = this.prop('serpent', at.clone().setY(at.y - 7), 1);
      s.root.rotation.y = Math.atan2(p.pos.x - at.x, p.pos.z - at.z);
      this.shadowPuff(at, 34, 1.6);
      g.debris.burst(at.clone().setY(at.y + 0.3), 7, 8, 1);
      for (const e of this.foes(at, 2.6)) {
        this.hit(e, this.sdmg(e === t ? 56 : 30), { stagger: 1, unblockable: true, knock: new THREE.Vector3() });
        if (!e.isBoss) { e.vel.y = Math.max(e.vel.y, 13); this.stun(e, 1.6); }
      }
      g.fx.shockwave(at, SHADOW, 3.5); g.shake(0.5); g.hitStop(0.06); g.audio?.impact(1.7); g.audio?.energy('summon');
      this.during(1.6, (tt, dt) => {
        const rise = tt < 0.25 ? tt / 0.25 : tt > 1.2 ? Math.max(0, 1 - (tt - 1.2) / 0.4) : 1;
        s.root.position.y = at.y - 7 + rise * 7;
        s.jaw.rotation.x = 0.2 + Math.max(0, Math.sin(tt * 9)) * 0.6;
        s.segs.forEach((seg, i) => { seg.position.x = Math.sin(tt * 4 + i * 0.7) * 0.25 * i * 0.3; });
      }, () => s.remove());
    });
  }
  oxCharge() {
    const g = this.game, p = this.p;
    const f = this.fwd(), start = p.pos.clone().addScaledVector(f, -2);
    start.y = this.groundAt(start.x, start.z, p.pos.y);
    const ox = this.prop('ox', start, 1.2);
    ox.root.rotation.y = Math.atan2(f.x, f.z);
    this.shadowPuff(start, 26, 1.3);
    this.cast(0.4, true);
    g.audio?.energy('summon');
    const hitSet = new Set();
    let dist = 0, stepT = 0;
    this.during(1, (t, dt) => {
      const sp = 26 * Math.min(1, t * 3);
      const nx = ox.root.position.x + f.x * sp * dt, nz = ox.root.position.z + f.z * sp * dt;
      const gy = this.groundAt(nx, nz, ox.root.position.y);
      if (g.world.solidAt(nx, gy + 1.2, nz)) { g.combat.hitBlocks(tmp.set(nx, gy, nz), f, 1.6, Math.PI, 200, p); return false; }
      ox.root.position.set(nx, gy, nz); dist += sp * dt;
      ox.body.position.y = 1.3 + Math.abs(Math.sin(t * 18)) * 0.15;
      stepT -= dt; if (stepT <= 0) { stepT = 0.08; g.particles.burst(tmp.set(nx, gy + 0.2, nz), { count: 3, color: 0x6a5a4a, additive: false, speed: 2, up: 1, life: 0.5, size: 0.35, sizeEnd: 1 }); }
      for (const e of this.foes(ox.root.position, 1.8)) {
        if (hitSet.has(e)) continue; hitSet.add(e);
        this.hit(e, this.sdmg(36 + dist * 3.2), { stagger: 1, unblockable: true, knock: f.clone().multiplyScalar(e.isBoss ? 6 : 20) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 8);
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), f, { color: 0xffffff, big: true }); g.shake(0.3); g.audio?.impact(1.4);
      }
    }, () => { this.shadowPuff(ox.root.position, 24, 1.2); ox.remove(); });
  }
  tigerPounce() {
    const g = this.game, p = this.p, t = this.target(13);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.45, true);
    const start = p.pos.clone().add(tmp.set(Math.cos(p.facing) * 1.4, 0, -Math.sin(p.facing) * 1.4));
    const tiger = this.prop('tiger', start, 1.2);
    this.shadowPuff(start, 22, 1.1);
    g.audio?.energy('summon');
    let phase = 0, swipe = 0, next = 0;
    this.during(1.6, (tt, dt) => {
      if (t.dead && phase < 2) phase = 2;
      if (phase === 0) {
        const k = Math.min(1, tt / 0.45);
        const to = t.pos;
        tiger.root.position.set(start.x + (to.x - start.x) * k, start.y + (to.y - start.y) * k + Math.sin(k * Math.PI) * 3, start.z + (to.z - start.z) * k);
        tiger.root.rotation.y = Math.atan2(to.x - start.x, to.z - start.z);
        if (k >= 1) { phase = 1; next = tt; this.hit(t, this.sdmg(24), { stagger: 1, knock: new THREE.Vector3() }); this.stun(t, 1.2); g.fx.shockwave(t.pos, 0xffffff, 2.5); g.audio?.impact(1.3); }
        return true;
      }
      if (phase === 1) {
        if (tt < next) return true;
        next = tt + 0.22;
        tiger.head.rotation.x = swipe % 2 ? 0.4 : -0.2;
        const at = t.pos.clone().setY(t.pos.y + t.height * 0.6);
        this.hit(t, this.sdmg(30), { stagger: 0.7, unblockable: true, knock: new THREE.Vector3() });
        for (const e of this.foes(t.pos, 2.2)) if (e !== t) this.hit(e, this.sdmg(12), { stagger: 0.3 });
        g.fx.slashArc(tiger.root.position, tiger.root.rotation.y + (swipe % 2 ? 0.5 : -0.5), 0xffffff, 2.4, 0.8, 0.2, swipe % 2 === 1);
        g.fx.hitSpark(at, null, { color: 0xffd040, big: true });
        g.hitStop(0.04); g.shake(0.3); g.audio?.impact(1.2);
        if (++swipe >= 3) phase = 2;
        return true;
      }
      return false;
    }, () => { this.shadowPuff(tiger.root.position, 22, 1.1); tiger.remove(); });
  }
  elephant() {
    const g = this.game, p = this.p;
    const c = this.aimGround(12);
    this.cast(0.5, true);
    g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: 0x9ad8ff, r0: 4.5, r1: 4.6, dur: 0.55, thick: 0.25 });
    g.fx.darkRings.spawn(tmp.set(c.x, c.y + 0.06, c.z), { color: 0, r0: 0.4, r1: 4.5, dur: 0.55, thick: 0.6 });
    const el = this.prop('elephant', c.clone().setY(c.y + 14), 1.1);
    el.root.rotation.y = Math.atan2(c.x - p.pos.x, c.z - p.pos.z);
    g.audio?.whoosh(1.6);
    this.during(0.55, (t, dt, k) => { el.root.position.y = c.y + 14 * (1 - k * k); }, () => {
      el.root.position.y = c.y;
      g.combat.aoe(c, 4.5, this.sdmg(85), p, { knock: 14, stagger: 1, falloff: true });
      for (const e of this.foes(c, 4.5)) if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9);
      g.fx.shockwave(c, 0x9ad8ff, 6); g.fx.landDust(c, 40); g.fx.screenWave(c, 1.2, 0.5);
      g.debris.burst(c.clone().setY(c.y + 0.3), 7, 12, 1.3);
      g.shake(0.9); g.hitStop(0.08); g.audio?.impact(2);
      // the torrent: water floods out in a cone from the trunk
      const f = new THREE.Vector3(Math.sin(el.root.rotation.y), 0, Math.cos(el.root.rotation.y));
      let tick = 0;
      this.during(1.8, (t, dt) => {
        el.trunk.rotation.x = -0.9 + Math.sin(t * 6) * 0.15;
        const mouth = el.root.position.clone().addScaledVector(f, 3.2).setY(el.root.position.y + 1.4);
        for (let i = 0; i < 6; i++) { const sp = 9 + Math.random() * 6, a = (Math.random() - 0.5) * 1.1, d = new THREE.Vector3(f.x * Math.cos(a) - f.z * Math.sin(a), 0, f.x * Math.sin(a) + f.z * Math.cos(a)); g.particles.glow.spawn({ pos: mouth, vx: d.x * sp, vy: 2 + Math.random() * 2, vz: d.z * sp, life: 0.6, r: 0.6, g: 1.4, b: 2.4, size: 0.25, gravity: 12, drag: 0.5, sizeEnd: 0.7 }); }
        if (Math.random() < 0.5) g.fx.splash(mouth.clone().addScaledVector(f, 3 + Math.random() * 5).setY(el.root.position.y), 1.2);
        tick -= dt; if (tick > 0) return;
        tick = 0.3;
        for (const e of this.foes(el.root.position, 10, f, 0.6)) { this.hit(e, this.sdmg(10), { stagger: 0.3, crit: false, knock: f.clone().multiplyScalar(e.isBoss ? 1 : 9) }); this.slow(e, 1.5); }
      }, () => { this.shadowPuff(el.root.position, 40, 2); el.remove(); });
    });
  }
  mahoraga() {
    const g = this.game, p = this.p;
    if (this.mahoragaOut) return false;
    const pos = p.pos.clone().addScaledVector(this.fwd(), 3); pos.y = this.groundAt(pos.x, pos.z, p.pos.y);
    const turns = Math.random() < 0.3;   // the summoning ritual: it may not spare you
    p.action = { type: 'cast', both: true, dur: 1.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    p.invulnerable = true;
    g.toast?.('With this treasure, I summon…', 'domain');
    g.fx.dimTarget = 0.6; g.audio?.charge?.(1, 0.6);
    for (let i = 0; i < 3; i++) this.after(i * 0.35, () => g.fx.darkRings.spawn(tmp.set(pos.x, pos.y + 0.06, pos.z), { color: 0, r0: 4.5 - i, r1: 0.3, dur: 0.4, thick: 0.6 }));
    this.after(1.2, () => {
      p.invulnerable = false; if (p.action?.lock) p.action = null; g.fx.dimTarget = 0;
      const m = this.prop('mahoraga', pos, 1.25);
      this.mahoragaOut = m;
      this.shadowPuff(pos, 60, 2.4);
      g.fx.flash(0xffffff, 0.5, 0.3); g.fx.shockwave(pos, 0xe8c060, 8); g.shake(0.8); g.audio?.impact(2);
      g.toast?.('Eight-Handled Sword Divergent Sila Divine General Mahoraga', 'domain');
      let next = 0.6, adapt = 0, swing = 0, betray = turns ? 4 : Infinity;
      this.during(10 * this.lifeMul, (t, dt) => {
        m.wheel.rotation.z += dt * (0.5 + swing * 2); swing = Math.max(0, swing - dt);
        m.armR.rotation.x = -swing * 2.5;
        if (t >= betray) {
          betray = Infinity;
          // it turns on its summoner: a telegraphed Sword of Extermination
          g.toast?.('Mahoraga turns on you — move!');
          const at = p.pos.clone();
          m.root.position.copy(at).add(tmp.set(2.5, 0, 0)); m.root.position.y = this.groundAt(m.root.position.x, m.root.position.z, at.y);
          m.root.rotation.y = Math.atan2(at.x - m.root.position.x, at.z - m.root.position.z);
          g.fx.rings.spawn(tmp.set(at.x, at.y + 0.08, at.z), { color: 0xff3030, r0: 3, r1: 3.1, dur: 1, thick: 0.3 });
          this.after(1, () => {
            swing = 0.5;
            g.fx.slashLine(at.clone().add(tmp.set(-3, 1, 0)), tmp2.set(1, 0, 0), 6, 0xffffff, 0.6, 0.3);
            if (!p.dead && p.pos.distanceTo(at) < 3) p.takeDamage(p.maxHp * 0.35, null, { knock: tmp.subVectors(p.pos, at).setY(0).normalize().multiplyScalar(10) });
            g.shake(0.6); g.audio?.energy('slash');
          });
          next = t + 1.8;
          return true;
        }
        if (t < next) return true;
        const e = g.nearestEnemy(m.root.position, 24) ?? g.nearestEnemy(p.pos, 18);
        if (!e) { next = t + 0.4; return true; }
        next = t + 0.85;
        // leap to the curse and swing the Sword of Extermination
        tmp.subVectors(m.root.position, e.pos).setY(0); if (tmp.lengthSq() < 0.01) tmp.set(1, 0, 0);
        const to = e.pos.clone().add(tmp.setLength(e.radius + 2));
        to.y = this.groundAt(to.x, to.z, e.pos.y);
        this.shadowPuff(m.root.position, 10, 0.8);
        m.root.position.copy(to); m.root.rotation.y = Math.atan2(e.pos.x - to.x, e.pos.z - to.z);
        swing = 0.45;
        const dmg = this.sdmg(110) * (1 + adapt * 0.1); adapt = Math.min(10, adapt + 1);
        this.hit(e, dmg, { stagger: 1.2, unblockable: true, crit: false, knock: tmp2.subVectors(e.pos, to).setY(0).normalize().multiplyScalar(14) });
        for (const o of this.foes(e.pos, 3)) if (o !== e) this.hit(o, dmg * 0.35, { stagger: 0.6 });
        const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
        g.fx.slashX(at, 3.5, 0xffffff); g.fx.slashArc(to, m.root.rotation.y, 0xe8c060, 3.6, 1, 0.25);
        g.fx.hitSpark(at, null, { color: 0xe8c060, big: true });
        g.hitStop(0.06); g.shake(0.5); g.audio?.energy('slash'); g.audio?.impact(1.8);
      }, () => { this.shadowPuff(m.root.position, 50, 2.2); m.remove(); this.mahoragaOut = null; });
    });
  }
}
registerKit('megumi', MegumiKit, MEGUMI_SKILLS);
