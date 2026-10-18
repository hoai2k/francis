// The Culling Game (死滅回游): the shared rules of the three colonies
// (colony_tokyo1, colony_sendai, colony_sakurajima).
//
// Build time (region files, with a RegionBuilder R):
//   colonyBarrier(R, { color, accent })   the colony barrier: a shimmering curtain on all four map
//                                         edges and a lattice dome over the whole region
//   setupColony(R, cfg)                   installs the runtime below whenever the region is loaded
//   ruinedTower / rubble / wreck / crater / scorch / debrisField   ruined-city dressing helpers
//
//   cfg = {
//     name, color: '#hex', intro: [lines Kogane says on arrival],
//     playerZones: [{ x0, z0, x1, z1, roster: ['brawler', …], level, max }],   hostile "players"
//     cap: 3,                              players alive at once
//     events: [{ kind: 'lightning'|'swarm'|'sky'|'trail'|'eruption'|'steam'|'ash', … }],
//     board: [x, z],                       the Rule Board (interact: rules, add a rule for 100 points)
//   }
//
// Runtime (one CullingGame per loaded colony):
//   * entering registers you as a player (first time: Kogane reads out the rules)
//   * Kogane, your golden shikigami, floats beside you and announces scores
//   * points: another player's life = 5, a curse = 1, named players / champions more
//     (NAMED below: a quest 'defeat' curse with one of these names is re-dressed as that sorcerer)
//   * a points HUD while you are in a colony
//   * hostile players roam the player zones (sorcerer models on curse AIs, with a name plate)
//   * 100 points buys a new rule at a Rule Board (or as the reward of a quest: openAddRule(game, { free: true }))
//   * leaving through a gate: Kogane reminds you of the gate rule
//   * colony events (Kashimo's lightning, Kurourushi's swarm, Uro's sky, Dhruv's trails, the volcano…)
//
// Exports for quests (js/quests/colonies.js):
//   addPoints(game, n, why)  cgData(game)  hasRule(game, id)  openAddRule(game, o)  openRuleBoard(game)
//   A quest step { type: 'cgpoints', need: 100, text } completes when your points reach `need`
//   (checked while you are in a colony).
//
// Save: save.data.cullingGame = { v, registered, visited: {region}, points, earned, players, curses, rules: [ids], spent }
import * as THREE from 'three/webgpu';
import { uv, vec3, float, sin, abs, fract, max, smoothstep, pow, positionWorld } from 'three/tsl';
import { B } from './blocks.js';
import { registerLook, SORCERER_LOOKS, PROP_KIT, buildSorcererModel } from '../entities/models.js';
import { Rig } from '../entities/character.js';
import { addEliteShell } from '../entities/curses.js';
import { U } from '../gfx/materials.js';
import { onRegionLoad } from './regionRuntime.js';
import { signMesh } from './regions/common.js';
import { toast, h } from '../ui/ui.js';

// ------------------------------------------------------------------ looks: players and colony residents
const hairOf = (list) => (m) => list.map((s) => ({ material: m, stiff: 60, ...s }));
const look = (id, paint, o = {}) => registerLook(id, { paint: { collar: paint.top, topTrim: paint.top, buttons: paint.top, ...paint }, hair: o.hair ?? (() => []), hairColor: paint.hair, cape: o.cape ?? null, scale: o.scale ?? 1.16, emit: o.emit ?? 0, paintExtra: o.paintExtra, props: o.props });
// anonymous players (sorcerers awakened by Kenjaku, and the ones who came back from the Heian era)
look('npc_cg_0', { skinTone: 0xf0cdb0, hair: 0xb02a2a, undercut: 0x2a1a1a, top: 0x26262a, pants: 0x2a2a30, shoes: 0x101010, eye: 0x3a2a1a, fringe: 2, hairSide: 2, hairBack: 3 }, { hair: hairOf([{ x: 0, y: 8.2, z: 0, w: 2.4, h: 2.6, d: 8, stiff: 120 }]) });
look('npc_cg_1', { skinTone: 0xe8c0a0, hair: 0xe0c060, top: 0x2a7a4a, collar: 0xf0f0f0, pants: 0x2a7a4a, shoes: 0xf0f0f0, eye: 0x3a2a1a, fringe: 3, hairSide: 3, hairBack: 4, hairVolume: true });
look('npc_cg_2', { skinTone: 0xf0d0b8, hair: 0x15120f, top: 0x3a3a44, collar: 0xf2f2f2, topTrim: 0x7a2a2a, pants: 0x3a3a44, shoes: 0x0c0c0c, eye: 0x2a2a2a, fringe: 1, hairSide: 2, hairBack: 3 });
look('npc_cg_3', { skinTone: 0xd8a888, hair: 0x1a2030, top: 0x5a3a8a, pants: 0x24242c, shoes: 0xd8d8d8, eye: 0x2a2a3a, fringe: 4, hairSide: 4, hairBack: 5, hairVolume: true });
look('npc_cg_4', { skinTone: 0xf0cdb0, hair: 0xd87a2a, top: 0x15151a, collar: 0x15151a, buttons: 0xd8b040, pants: 0x15151a, shoes: 0x2a1a10, eye: 0x4a2a1a, fringe: 1, hairSide: 2, hairBack: 3 }, { hair: hairOf([{ x: 0, y: 8, z: 2.5, w: 7, h: 2.4, d: 6, stiff: 140, rx: -0.5 }]) });
look('npc_cg_5', { skinTone: 0xf4d6c0, hair: 0xe080a0, top: 0xe8e8e8, pants: 0x2a2a3a, shoes: 0x1a1a1a, eye: 0x5a3a4a, fringe: 3, hairSide: 6, hairBack: 6, bob: true, blush: true });
// named residents
look('npc_reggie', { skinTone: 0xf0cdb0, hair: 0xe8d070, top: 0x18181c, collar: 0xe8e0d0, pants: 0x34343e, shoes: 0x101010, eye: 0x3a3a2a, fringe: 1, hairSide: 2, hairBack: 3 }, {
  scale: 1.22, hair: hairOf([{ x: 0, y: 8.4, z: 1.5, w: 7.6, h: 2.6, d: 6.5, stiff: 130, rx: -0.35 }]),
  props(rig, K) {   // a fan of receipts in his left hand
    const g = new THREE.Group(); g.position.set(0, -1 * K.PX, 2 * K.PX); rig.handL.add(g);
    for (let i = 0; i < 4; i++) { const p = K.box(g, 2.4, 0.2, 4.6, K.mat(0xf4f2ea, { emissive: 0.15 }), (i - 1.5) * 0.9, 0, 2); if (p) p.rotation.y = (i - 1.5) * 0.25; }
    rig.extras.receipts = g;
  },
});
look('npc_hana', { skinTone: 0xf6dcc8, hair: 0x2a1a1a, top: 0xf4f4f0, collar: 0xf4f4f0, topTrim: 0xd8c070, pants: 0xf4f4f0, shoes: 0xe8e8e8, eye: 0x6a4a2a, fringe: 3, hairSide: 6, hairBack: 8, hairVolume: true }, {
  scale: 1.1, emit: 0.15,
  hair: hairOf([{ x: 0, y: 4, z: -4.6, w: 7, h: 9, d: 1.6, hang: true, stiff: 30 }]),
  props(rig, K) {   // Angel: a halo and small white wings
    const gold = K.mat(0xffe08a, { emissive: 1.6 }), white = K.mat(0xf8f8ff, { emissive: 0.25 });
    const halo = new THREE.Group(); halo.position.y = 11 * K.PX; rig.head.add(halo);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; K.box(halo, 1.6, 0.5, 0.6, gold, Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4); }
    for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 2 * K.PX, 9 * K.PX, -2.4 * K.PX); w.rotation.set(0, s * 0.5, s * 0.35); rig.torso.add(w); K.box(w, 1, 8, 2, white, s * 3, 0, 0); K.box(w, 1, 6, 2, white, s * 6, 1, 0); K.box(w, 1, 4, 2, white, s * 8.5, 2, 0); }
    rig.extras.halo = halo;
  },
});
look('npc_kirara', { skinTone: 0xf4d6c0, hair: 0xf080b0, top: 0x1b2030, collar: 0x1b2030, topTrim: 0xf080b0, pants: 0x1b2030, shoes: 0x14141a, eye: 0x6a3a5a, fringe: 3, hairSide: 5, hairBack: 6, hairVolume: true, blush: true }, {
  hair: hairOf([{ x: -3.4, y: 6, z: -2, w: 1.8, h: 5, d: 1.8, hang: true, stiff: 40 }, { x: 3.4, y: 6, z: -2, w: 1.8, h: 5, d: 1.8, hang: true, stiff: 40 }]),
});
look('npc_uro', { skinTone: 0xf2d8c4, hair: 0x101014, top: 0x3a2a4a, collar: 0x5a4a7a, topTrim: 0xc8b8f0, pants: 0x2a2030, shoes: 0x14101a, eye: 0x5a4a8a, fringe: 3, hairSide: 7, hairBack: 8, hairVolume: true }, {
  hair: hairOf([{ x: 0, y: 3, z: -4.6, w: 7.6, h: 11, d: 1.6, hang: true, stiff: 24 }]),
});
look('npc_ishigori', { skinTone: 0xe0b890, hair: 0x101010, top: 0x202028, collar: 0x202028, buttons: 0xd8b040, pants: 0x202028, shoes: 0x101010, eye: 0x2a2a2a, fringe: 1, hairSide: 2, hairBack: 3 }, {
  scale: 1.4, hair: hairOf([{ x: 0, y: 8.6, z: 4, w: 7, h: 3.2, d: 9, stiff: 160, rx: -0.2 }]),
  paintExtra(S) { S.mat = 'metal'; S.fineRect(8.5, 11.5, 7, 1, 0x101010); S.mat = 'cloth'; },
});
look('npc_kamo', { skinTone: 0xf0d6c0, hair: 0x101010, top: 0x2a2a38, collar: 0xe8e0c8, topTrim: 0x8a7a5a, pants: 0x2a2a38, shoes: 0x14141a, eye: 0x2a2a2a, fringe: 2, hairSide: 4, hairBack: 6 }, {
  hair: hairOf([{ x: 0, y: 6.5, z: -4.6, w: 2.4, h: 8, d: 2, hang: true, stiff: 30 }]),
});
look('npc_zenin_hei', { skinTone: 0xf0cdb0, hair: 0x101010, top: 0x1a1a22, collar: 0xe8e8e8, topTrim: 0x1a1a22, pants: 0x24242e, shoes: 0x0c0c0c, eye: 0x2a2a2a, fringe: 1, hairSide: 2, hairBack: 3 }, {
  hair: hairOf([{ x: 0, y: 8.6, z: -2, w: 2.4, h: 2.4, d: 2.4, stiff: 160 }]),
  props(rig, K) { const s = new THREE.Group(); s.rotation.x = Math.PI / 2; s.position.z = 2 * K.PX; rig.handR.add(s); K.box(s, 0.9, 20, 0.4, K.mat(0xc8ccd4, { metalness: 0.8, roughness: 0.3 }), 0, 10, 0); K.box(s, 1.2, 5, 1.2, K.mat(0x1a1a1a), 0, -1, 0); rig.extras.weapon = s; },
});
look('npc_zenin_captain', { skinTone: 0xe8c0a0, hair: 0x2a2a2a, top: 0x5a1a1a, collar: 0x1a1a22, topTrim: 0xd8b040, pants: 0x1a1a22, shoes: 0x0c0c0c, eye: 0x6a2a1a, fringe: 1, hairSide: 3, hairBack: 4 }, {
  scale: 1.3, cape: { color: 0x3a0e0e, segments: 3, length: 9, width: 9 },
  props(rig, K) { const s = new THREE.Group(); s.rotation.x = Math.PI / 2; s.position.z = 2 * K.PX; rig.handR.add(s); K.box(s, 1.1, 26, 0.5, K.mat(0xd8dce4, { metalness: 0.9, roughness: 0.25 }), 0, 13, 0); K.box(s, 1.4, 6, 1.4, K.mat(0x5a1a1a), 0, -2, 0); rig.extras.weapon = s; },
});
look('npc_takaba', { skinTone: 0xf0cdb0, hair: 0x2a1a10, top: 0xd8d8d8, collar: 0x8a2a2a, pants: 0x3a3a44, shoes: 0x1a1a1a, eye: 0x3a2a1a, fringe: 2, hairSide: 3, hairBack: 3 });
look('npc_kogane_host', { skinTone: 0xf0d0b0, hair: 0x6a4a2a, top: 0x2a4a6a, pants: 0x2a2a3a, shoes: 0x1a1a1a, eye: 0x3a2a1a, fringe: 3, hairSide: 3, hairBack: 4 });

// ------------------------------------------------------------------ rosters
// base: the curse AI the player fights with (enemy.js); hp: multiplier; pts: points for taking them out
export const ROSTER = {
  brawler: { base: 'swarmer', hp: 2.6, pts: 5, looks: ['npc_cg_0', 'npc_cg_1', 'npc_cg_4'], names: ['Brawler', 'Street Player', 'Knuckle Player'] },
  caster: { base: 'spitter', hp: 1.8, pts: 5, looks: ['npc_cg_2', 'npc_cg_3', 'npc_cg_5'], names: ['Technique User', 'Heian Revenant', 'Projectile Player'] },
  blinker: { base: 'teleporter', hp: 1.2, pts: 5, looks: ['npc_cg_3', 'npc_cg_5', 'npc_cg_2'], names: ['Shadow-Step Player', 'Blink Player'] },
  heavy: { base: 'tank', hp: 1.0, pts: 8, looks: ['npc_cg_4', 'npc_cg_0'], names: ['Barrier Player', 'Heavy Player'] },
  lancer: { base: 'longneck', hp: 1.1, pts: 6, looks: ['npc_cg_1', 'npc_cg_2'], names: ['Reach Player', 'Lance Player'] },
  gunner: { base: 'lantern', hp: 1.1, pts: 6, looks: ['npc_cg_2', 'npc_cg_5'], names: ['Beam Player', 'Output Player'] },
  gang: { base: 'swarmer', hp: 2.4, pts: 5, looks: ['npc_cg_0', 'npc_cg_4'], names: ['Reggie\'s Gang'] },
  hei: { base: 'swarmer', hp: 3.0, pts: 6, looks: ['npc_zenin_hei'], names: ['Zen\'in Hei'] },
  hei_archer: { base: 'spitter', hp: 2.0, pts: 6, looks: ['npc_zenin_hei'], names: ['Zen\'in Hei Marksman'] },
  revenant: { base: 'teleporter', hp: 1.4, pts: 6, looks: ['npc_uro', 'npc_cg_3'], names: ['Heian Revenant'] },
};
// quest 'defeat' curses with these names are dressed as sorcerers (and worth more points)
export const NAMED = {
  'Reggie Star': { look: 'npc_reggie', pts: 40 },
  'Iori Hazenoki': { look: 'npc_cg_2', pts: 15 },
  'Kenta the Undefeated': { look: 'npc_cg_4', pts: 15 },
  'Big Okabe': { look: 'npc_cg_0', pts: 15 },
  'Ryu Ishigori': { look: 'npc_ishigori', pts: 30 },
  'Uro Takako': { look: 'npc_uro', pts: 30 },
  'Kurourushi': { pts: 40 },
  'Hei Captain Ogami Zen\'in': { look: 'npc_zenin_captain', pts: 35 },
  'Naoya Zen\'in (Cursed Spirit)': { look: 'naoya', pts: 50, tint: 0x8a2aff },
  'Fumihiko Takaba': { look: 'npc_takaba', pts: 10 },
};
const AFFIX_COL = { swift: 0x4affd8, armored: 0xffc24a, vampiric: 0xff3a5a, explosive: 0xff8a2a, shadow: 0xb05aff };

// ------------------------------------------------------------------ the rules
export const CG_RULES = [
  'Players who have awakened a cursed technique must declare their participation at a colony within 19 days.',
  'Any sorcerer who refuses to participate will have their cursed technique removed.',
  'Non-sorcerers become players the moment they enter a colony.',
  'Players score points by taking the life of another player.',
  'A player\'s life is worth 5 points. A non-player\'s life (here: a curse) is worth 1 point.',
  'A player may spend 100 points to negotiate with the game master and add one new rule.',
  'The game master must accept the new rule, unless it greatly affects the outcome of the Culling Game.',
  'If a player\'s score does not change for 19 days, their cursed technique is removed.',
];
export const CG_ADDABLE = {
  transfer: { name: 'Point Transfer', text: 'Players may transfer points. (Trade 10 points for 60 coins at any Rule Board.)' },
  mercy: { name: 'Merciful Scoring', text: 'A player who scores recovers their strength. (Each score heals 8% HP.)' },
  bounty: { name: 'Raised Bounty', text: 'A player\'s life is worth 10 points instead of 5.' },
  radar: { name: 'Kogane\'s Radar', text: 'Kogane must tell players where the nearest player is. (Announced every 20 s.)' },
  curse_bounty: { name: 'Curse Bounty', text: 'Curses are worth 2 points, and drop extra coins.' },
};

export function cgData(game) {
  const s = game.save.data;
  s.cullingGame ??= { v: 1, registered: false, visited: {}, points: 0, earned: 0, players: 0, curses: 0, rules: [], spent: 0 };
  const d = s.cullingGame; d.visited ??= {}; d.rules ??= [];
  return d;
}
export const hasRule = (game, id) => cgData(game).rules.includes(id);
let LIVE = null;   // the running CullingGame (if any)
export const liveColony = () => LIVE;
export function addPoints(game, n, why = '') {
  const d = cgData(game);
  d.points = Math.max(0, (d.points ?? 0) + n); if (n > 0) d.earned = (d.earned ?? 0) + n;
  if (LIVE && LIVE.game === game) { LIVE.say(`${why ? why + ' · ' : ''}${n >= 0 ? '+' : ''}${n} point${Math.abs(n) === 1 ? '' : 's'}  (total ${d.points})`); LIVE.refreshHud(true); }
  else toast(`◈ Culling Game: ${n >= 0 ? '+' : ''}${n} points (total ${d.points})`);
  if (n > 0 && hasRule(game, 'mercy')) for (const p of game.players) if (!p.dead && !p.downed) { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.08); }
  game.save.write();
}

// ------------------------------------------------------------------ build-time helpers
function curtainMaterial(color) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const u = uv();
  const stripes = smoothstep(0.42, 0.5, abs(fract(u.x.mul(140).add(U.time.mul(0.05))).sub(0.5)));
  const hexes = smoothstep(0.45, 0.5, max(abs(fract(u.x.mul(70)).sub(0.5)), abs(fract(u.y.mul(10).sub(U.time.mul(0.08))).sub(0.5))));
  const fade = pow(float(1).sub(u.y), 1.6);
  const foot = smoothstep(0.06, 0.0, u.y);
  const shimmer = sin(U.time.mul(1.3).add(u.x.mul(60)).add(u.y.mul(9))).mul(0.25).add(0.75);
  m.colorNode = vec3(c.r, c.g, c.b).mul(float(1.2).add(foot.mul(2)));
  m.opacityNode = stripes.mul(0.18).add(hexes.mul(0.32)).add(0.05).mul(fade).mul(shimmer).add(foot.mul(0.5)).clamp(0, 1);
  m.fog = false;
  return m;
}
function domeMaterial(color) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide });
  const u = uv();
  const gx = abs(fract(u.x.mul(96)).sub(0.5)), gy = abs(fract(u.y.mul(30)).sub(0.5));
  const line = smoothstep(0.44, 0.5, max(gx, gy));
  const pulse = sin(U.time.mul(0.6).add(u.y.mul(16)).add(positionWorld.x.mul(0.01))).mul(0.5).add(0.5);
  m.colorNode = vec3(c.r, c.g, c.b).mul(1.5);
  m.opacityNode = line.mul(0.26).add(0.035).mul(pulse.mul(0.5).add(0.5));
  m.fog = false;
  return m;
}
// The colony barrier: curtains on all four edges and a lattice dome above.
export function colonyBarrier(R, o = {}) {
  const color = o.color ?? 0xb08aff, { sx, sz } = R, base = (o.y ?? R.base) - 8, hgt = o.height ?? 70;
  R.deco.extra(() => {
    const out = [];
    const cm = curtainMaterial(color);
    for (const [x, z, len, ry] of [[sx / 2, 0.3, sx, 0], [sx / 2, sz - 0.3, sx, Math.PI], [0.3, sz / 2, sz, Math.PI / 2], [sx - 0.3, sz / 2, sz, -Math.PI / 2]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, hgt), cm);
      m.position.set(x, base + hgt / 2, z); m.rotation.y = ry; m.renderOrder = 4; m.castShadow = false; m.receiveShadow = false; m.name = 'colony-curtain';
      m.frustumCulled = false; out.push(m);
    }
    const r = Math.hypot(sx, sz) * 0.5 + 2;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMaterial(color));
    dome.scale.y = (o.domeH ?? 110) / r; dome.position.set(sx / 2, base + hgt * 0.55, sz / 2);
    dome.renderOrder = 4; dome.castShadow = false; dome.receiveShadow = false; dome.frustumCulled = false; dome.name = 'colony-barrier';
    out.push(dome);
    return out;
  });
}
// A burnt-out, broken building: a tower with chunks bitten out of the top and sides, rubble round its feet.
export function ruinedTower(R, x0, z0, w, d, floors, o = {}) {
  const t = R.tower(x0, z0, w, d, floors, { win: R.chance(0.6) ? B.window_dark : B.window, ...o });
  const W = R.world, bites = o.bites ?? 2 + Math.floor(R.r() * 3);
  for (let b = 0; b < bites; b++) {
    const cx = R.chance(0.5) ? (R.chance(0.5) ? t.x0 : t.x1) : x0 + Math.floor(R.r() * w);
    const cz = R.chance(0.5) ? (R.chance(0.5) ? t.z0 : t.z1) : z0 + Math.floor(R.r() * d);
    const cy = t.y + 4 + Math.floor(R.r() * Math.max(1, t.top - t.y - 2));
    const rr = 2.5 + R.r() * (o.bite ?? 4);
    for (let y = Math.floor(cy - rr); y <= cy + rr + 6; y++) for (let z = Math.floor(cz - rr); z <= cz + rr; z++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
      const dd = Math.hypot(x - cx, (y - cy) * (y > cy ? 0.45 : 1), z - cz);
      if (dd < rr + R.r() * 0.8 && y > t.y + 2) W.setRaw(x, y, z, 0);
    }
  }
  // scorch some of the facade
  for (let k = 0; k < 18; k++) { const x = x0 + Math.floor(R.r() * w), z = R.chance(0.5) ? t.z0 : t.z1, y = t.y + Math.floor(R.r() * (t.top - t.y)); if (W.get(x, y, z)) W.setRaw(x, y, z, R.chance(0.5) ? B.cracked_brick : B.dark_brick); }
  if (o.rubble !== false) for (let k = 0; k < 3; k++) rubble(R, x0 - 2 + Math.floor(R.r() * (w + 4)), R.chance(0.5) ? z0 - 2 : z0 + d + 1, 1.5 + R.r() * 1.5, { lock: false });
  return t;
}
// A pile of broken concrete.
export function rubble(R, cx, cz, r = 2.5, o = {}) {
  const W = R.world, ids = o.blocks ?? [B.concrete, B.cracked_brick, B.stone, B.concrete, B.dark_brick];
  for (let z = Math.floor(cz - r); z <= cz + r; z++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    if (!R.in(x, z) || R.roadId[R.i(x, z)] && o.roads !== true) continue;
    const d = Math.hypot(x - cx, z - cz); if (d > r) continue;
    const hh = Math.round((1 - d / r) * (o.h ?? 2.5) + R.r() * 0.8);
    const y = R.groundY(x, z); if (!isFinite(y)) continue;
    for (let k = 0; k < hh; k++) W.set(x, y + k, z, ids[Math.floor(R.r() * ids.length)]);
  }
  if (o.lock !== false) R.reserve(Math.floor(cx - r), Math.floor(cz - r), Math.ceil(cx + r), Math.ceil(cz + r), 4);
}
// A wrecked car (props), optionally burning.
export function wreck(R, x, z, o = {}) {
  const P = R.props, y = o.y ?? R.groundY(Math.floor(x), Math.floor(z)), ry = o.ry ?? R.rnd(0, Math.PI), col = o.color ?? [0x6a2a2a, 0x2a3a5a, 0x8a8a8a, 0x3a3a3a, 0xc8b070][Math.floor(R.r() * 5)];
  const flip = o.flip ?? R.chance(0.2);
  const rz = flip ? Math.PI : (R.rnd(-0.12, 0.12));
  const lift = flip ? 1.2 : 0;
  const dx = Math.sin(ry), dz = Math.cos(ry);
  P.box(x, y + lift + (flip ? 0 : 0.25), z, 1.8, 0.75, 3.8, col, { ry, rz, vary: 0.15 });
  P.box(x - dx * 0.2, y + (flip ? 0.4 : 0.95), z - dz * 0.2, 1.6, 0.65, 2.0, 0x1a1c22, { ry, rz });
  for (const s of [-1, 1]) for (const f of [-1, 1]) if (!flip) P.box(x + Math.cos(ry) * s * 0.85 + dx * f * 1.2, y, z - Math.sin(ry) * s * 0.85 + dz * f * 1.2, 0.3, 0.6, 0.6, 0x111111, { ry });
  R.world.set(Math.floor(x), y, Math.floor(z), B.barrier);
  if (o.fire) { P.box(x, y + 1.3, z, 0.9, 0.5, 1.2, 0xff8a2a, { ry, emit: 2.4, vary: 0.3 }); R.world.addLight(x, y + 2, z, 0xff7a2a, 3, 8); }
}
// A blast crater: a bowl pushed into the ground with a raised rim.
export function crater(R, cx, cz, r = 6, o = {}) {
  const W = R.world, depth = o.depth ?? Math.max(2, Math.round(r * 0.45));
  for (let z = Math.floor(cz - r - 2); z <= cz + r + 2; z++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
    if (!R.in(x, z) || x < 2 || z < 2 || x > R.sx - 3 || z > R.sz - 3) continue;
    const d = Math.hypot(x - cx, z - cz), top = R.groundY(x, z); if (!isFinite(top)) continue;
    if (d < r) {
      const dip = Math.round(depth * (1 - (d / r) ** 2));
      for (let y = top - dip; y < top + 12; y++) W.setRaw(x, y, z, 0);
      W.setRaw(x, top - dip - 1, z, R.chance(0.3) ? (o.alt ?? B.dark_brick) : (o.floor ?? B.obsidian));
      R.H[R.i(x, z)] = top - dip;
    } else if (d < r + 2 && R.chance(0.7)) { W.setRaw(x, top, z, o.rim ?? B.cracked_brick); }
  }
  if (o.glow) { W.setRaw(Math.floor(cx), R.groundY(Math.floor(cx), Math.floor(cz)) - 1, Math.floor(cz), o.glow); }
  R.reserve(Math.floor(cx - r - 2), Math.floor(cz - r - 2), Math.ceil(cx + r + 2), Math.ceil(cz + r + 2), 4);
}
// Blacken the ground (scorch marks, lightning scars).
export function scorch(R, cx, cz, r, o = {}) {
  const W = R.world, ids = o.blocks ?? [B.obsidian, B.dark_brick, B.cracked_brick];
  for (let z = Math.floor(cz - r); z <= cz + r; z++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    if (!R.in(x, z)) continue;
    const d = Math.hypot(x - cx, z - cz) / r; if (d > 1 || R.r() < d * d * (o.ragged ?? 0.9)) continue;
    const y = R.groundY(x, z); if (!isFinite(y)) continue;
    const id = W.get(x, y - 1, z); if (!id || id === B.water || id === B.lava) continue;
    W.setRaw(x, y - 1, z, ids[Math.floor(R.r() * ids.length)]);
  }
}
// Loose debris on the ground: paper, bones, small concrete chunks (props).
export function debrisField(R, x0, z0, x1, z1, n = 60) {
  for (let k = 0; k < n; k++) {
    const x = x0 + R.r() * (x1 - x0), z = z0 + R.r() * (z1 - z0), y = R.groundY(Math.floor(x), Math.floor(z)); if (!isFinite(y)) continue;
    if (R.chance(0.55)) { const s = R.rnd(0.25, 0.7); R.props.box(x, y, z, s, s * 0.6, s * R.rnd(0.7, 1.4), [0x8a8a86, 0x6a6a68, 0x9a8a7a][k % 3], { ry: R.rnd(0, 3), vary: 0.15 }); }
    else R.deco.add(R.chance(0.7) ? 'paper' : 'bone', x, y, z, { mode: 'flat', scale: 0.8 });
  }
}
// The Rule Board: a black monolith with the rules in gold (POI + anchor 'cg_board').
export function ruleBoard(R, x, z, o = {}) {
  const y = R.groundY(x, z), P = R.props, ry = o.ry ?? 0;
  P.box(x + 0.5, y, z + 0.5, 2.6, 0.3, 1.2, 0x2a2a30, { ry });
  P.box(x + 0.5, y + 0.3, z + 0.5, 2.2, 3.2, 0.5, 0x101014, { ry, vary: 0 });
  P.box(x + 0.5, y + 3.5, z + 0.5, 2.5, 0.2, 0.7, 0xd8b040, { ry, emit: 0.6, vary: 0 });
  for (let dx = -1; dx <= 1; dx++) for (let k = 0; k < 3; k++) R.world.set(x + (ry ? 0 : dx), y + k, z + (ry ? dx : 0), B.barrier);
  R.world.addLight(x + 0.5, y + 2.6, z + 1.6, 0xffd27a, 2.4, 6);
  R.deco.extra(() => {
    const m = signMesh(['死滅回游', 'CULLING GAME', 'RULES'], { w: 1.9, h: 2.4, color: '#ffd84a', bg: 'rgba(10,8,14,0.96)', font: 'bold 64px "Pixelify Sans", sans-serif' });
    m.position.set(x + 0.5 + Math.sin(ry) * 0.27, y + 1.95, z + 0.5 + Math.cos(ry) * 0.27); m.rotation.y = ry;
    return m;
  });
  R.poi('cg_board', 'Culling Game Rule Board', '📜', x, z, 'board');
  R.anchor('cg_board', x + Math.round(Math.sin(ry) * 2), z + Math.round(Math.cos(ry) * 2));
  R.reserve(x - 2, z - 2, x + 2, z + 2, 2);
}
// Install the colony runtime on every load.
export function setupColony(R, cfg) {
  R.colony = cfg;
  onRegionLoad(R, (game, L) => { const cg = new CullingGame(game, L, cfg); return () => cg.dispose(); });
}

// ------------------------------------------------------------------ Kogane
function buildKogane() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardNodeMaterial({ color: 0xf2c23a, roughness: 0.35, metalness: 0.4, emissive: 0x7a5200, emissiveIntensity: 0.5 });
  const dark = new THREE.MeshStandardNodeMaterial({ color: 0x1a1008, roughness: 0.6 });
  const white = new THREE.MeshStandardNodeMaterial({ color: 0xf8f4ea, roughness: 0.5, emissive: 0x404040, emissiveIntensity: 0.3 });
  const red = new THREE.MeshStandardNodeMaterial({ color: 0xc8362a, roughness: 0.5 });
  const box = (w, hh, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
  box(0.62, 0.5, 0.52, gold, 0, 0, 0); box(0.5, 0.62, 0.42, gold, 0, 0, 0); box(0.54, 0.4, 0.62, gold, 0, -0.02, 0);
  box(0.4, 0.09, 0.05, dark, 0, -0.06, 0.31); box(0.34, 0.06, 0.06, white, 0, -0.02, 0.32); box(0.3, 0.05, 0.06, red, 0, -0.11, 0.31);
  box(0.09, 0.12, 0.05, dark, -0.14, 0.12, 0.29); box(0.09, 0.12, 0.05, dark, 0.14, 0.12, 0.29);
  box(0.035, 0.035, 0.02, white, -0.12, 0.15, 0.32); box(0.035, 0.035, 0.02, white, 0.16, 0.15, 0.32);
  box(0.05, 0.22, 0.05, gold, -0.16, 0.38, 0); box(0.05, 0.22, 0.05, gold, 0.16, 0.38, 0); box(0.09, 0.09, 0.09, red, -0.16, 0.51, 0); box(0.09, 0.09, 0.09, red, 0.16, 0.51, 0);
  const armL = box(0.08, 0.24, 0.08, gold, -0.36, -0.08, 0.05), armR = box(0.08, 0.24, 0.08, gold, 0.36, -0.08, 0.05);
  box(0.06, 0.06, 0.32, gold, 0, -0.12, -0.38);
  g.userData.arms = [armL, armR];
  return g;
}

// ------------------------------------------------------------------ player rigs (spec cached per look)
const SPECS = new Map();
function sorcererRig(lookId) {
  const id = SORCERER_LOOKS[lookId] ? lookId : 'npc_cg_0';
  if (!SPECS.has(id)) { const r = buildSorcererModel(id); SPECS.set(id, r.spec); return r; }
  const rig = new Rig(SPECS.get(id)); const lk = SORCERER_LOOKS[id];
  lk.props?.(rig, PROP_KIT); rig.look = lk;
  return rig;
}
const PLATES = new Map();   // name plates are cached per text (no texture per spawn)
function plate(text, color) {
  const key = text + '|' + color;
  if (!PLATES.has(key)) {
    if (PLATES.size > 80) { for (const v of PLATES.values()) { v.material.map?.dispose(); v.material.dispose(); v.geometry.dispose(); } PLATES.clear(); }
    const m = signMesh([text], { w: 2.6, h: 0.42, color, bg: 'rgba(12,8,18,0.82)', border: 'rgba(0,0,0,0)', glow: 1.3, font: 'bold 50px "Pixelify Sans", sans-serif' });
    m.material.depthTest = false; m.material.transparent = true;
    PLATES.set(key, m);
  }
  const src = PLATES.get(key), m = new THREE.Mesh(src.geometry, src.material);
  m.renderOrder = 7; m.frustumCulled = false; m.castShadow = false;
  return m;
}
// Dress an enemy as a sorcerer (its AI stays). Returns the enemy.
export function dressAsSorcerer(game, e, lookId, o = {}) {
  if (!e || e._dressed) return e;
  e._dressed = true;
  const rig = sorcererRig(lookId);
  game.scene.remove(e.object);
  e.rig = rig; e.object = rig.root;
  rig.root.position.copy(e.pos);
  if (e.elite) addEliteShell(rig, AFFIX_COL[e.elite] ?? 0xffffff, e.elite, e.def.radius);
  else if (o.tint) addEliteShell(rig, o.tint, 'shadow', e.def.radius);
  game.scene.add(rig.root);
  if (o.name) Object.defineProperty(e, 'name', { value: o.name, configurable: true });
  if (o.plate !== false) {
    const p = plate(o.plateText ?? o.name ?? 'Player', o.plateColor ?? '#ff8a8a');
    const sc = rig.spec.scale ?? 1.18;
    p.position.y = (2.55 * sc / 1.18 + 0.35) / sc;
    p.scale.setScalar(1 / sc);
    rig.root.add(p); e._plate = p; e._plateH = 2.75 * sc / 1.18 + 0.3;
  }
  return e;
}

// ------------------------------------------------------------------ the runtime
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), qInv = new THREE.Quaternion();
const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const rectDist = (r, x, z) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
const dirName = (dx, dz) => ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) % 8) + 8) % 8];

export class CullingGame {
  constructor(game, L, cfg) {
    this.game = game; this.L = L; this.cfg = cfg; this.t = 0;
    this.players = []; this.spawnT = 6 + Math.random() * 4; this.events = (cfg.events ?? []).map((e) => ({ ...e, st: {} }));
    this.counted = new WeakSet();
    LIVE = this;
    const d = cgData(game);
    game.dialogue?.speaker('kogane', { name: 'Kogane', color: '#ffd23a', kanji: '金', voice: 1.6 });
    this.buildHud();
    this.kogane = buildKogane(); game.scene.add(this.kogane); (game.hubProps ??= []).push(this.kogane);
    const lead = this.lead(); if (lead) this.kogane.position.copy(lead.pos).add(tmp.set(1.4, 2.2, 0.6));
    this.koLight = game.lights.attach(this.kogane, 0xffd23a, 1.4, 4, { offsetY: 0 });
    // the Rule Board
    const bp = L.anchors.cg_board;
    if (bp) game.interactables.push({ id: 'cg-board', pos: bp, radius: 2.6, label: 'Culling Game Rule Board · rules / add a rule', action: () => openRuleBoard(game) });
    // gates: Kogane's gate rule
    for (const it of game.interactables) if (String(it.id).startsWith('gate-') && !it._cg) {
      const go = it.action; it._cg = true;
      it.action = (p) => {
        if (this.leaving) return; this.leaving = true;
        this.say('Gate rule: players may leave a colony only through its gate. Your points stay with you.', 2.4);
        setTimeout(() => { this.leaving = false; go(p); }, 900);
      };
    }
    game.addUpdater((dt) => this.update(dt));
    // registration and arrival
    const first = !d.registered, firstHere = !d.visited[L.regionId];
    d.visited[L.regionId] = true;
    setTimeout(() => {
      if (this.disposed) return;
      if (first) this.register();
      else if (firstHere) game.dialogue?.say('kogane', cfg.intro ?? [`Welcome to ${cfg.name}, player!`]);
      else this.say(`${cfg.name}. You have ${d.points} points. Good hunting!`, 3);
    }, 900);
    game.save.write();
  }
  lead() { return this.game.players.find((p) => !p.dead && !p.downed) ?? null; }
  register() {
    const g = this.game, d = cgData(g);
    d.registered = true; g.save.write();
    g.dialogue?.say('kogane', [
      'Ding ding ding! A new player has entered the colony!',
      { who: null, text: 'A small golden shikigami pops into the air beside you, grinning.' },
      'I am Kogane, your game-master liaison! By setting foot inside this barrier you have joined the CULLING GAME.',
      'Rule 4: players score points by taking the life of another player. Rule 5: a player is worth 5 points, a non-player 1. Curses count as non-players here!',
      'Rule 6: spend 100 points to add a new rule. Find a Rule Board, or ask me when you are rich!',
      'Rule 8: if your score does not change for 19 days, your technique is removed. So keep scoring!',
      ...(this.cfg.intro ?? []),
    ], { onEnd: () => { d.registered = true; g.save.write(); toast('◈ You are now a Culling Game player', 'big'); this.refreshHud(true); } });
  }
  // Kogane's speech bubble
  say(text, dur = 2.6) {
    if (!this.bub) return;
    this.bub.textContent = text; this.bub.classList.add('on'); this.bubT = dur;
    this.koHop = 0.6;
    this.game.audio?.tone?.({ freq: 1320, to: 1760, dur: 0.08, gain: 0.05, type: 'square', filter: 4000 });
  }
  buildHud() {
    document.getElementById('cg-hud')?.remove();
    const pts = h('b', { class: 'cg-pts' }, '0'), sub = h('div', { class: 'cg-sub' }), bub = h('div', { class: 'cg-say' });
    const el = h('div', { id: 'cg-hud', 'aria-live': 'polite' },
      h('div', { class: 'cg-title' }, h('span', { class: 'cg-kanji' }, '死滅回游'), h('span', {}, this.cfg.name)),
      h('div', { class: 'cg-row' }, h('span', { class: 'cg-coin' }, '◈'), pts, h('span', { class: 'cg-unit' }, 'points')),
      sub, bub);
    el.style.setProperty('--cg', this.cfg.color ?? '#e08aff');
    document.body.appendChild(el);
    this.hud = el; this.hudPts = pts; this.hudSub = sub; this.bub = bub; this.bubT = 0;
    this.refreshHud(true);
  }
  refreshHud(force = false) {
    const g = this.game, d = cgData(g);
    const key = `${d.points}|${d.players}|${d.rules.length}|${this.players.length}|${g.state}|${g.dialogue?.active}`;
    if (!force && key === this.hudKey) return; this.hudKey = key;
    this.hudPts.textContent = String(d.points);
    const qid = (g.quests?.active?.() ?? []).find((id) => g.quests.current(id)?.type === 'cgpoints');
    const need = qid ? (g.quests.current(qid).need ?? 100) : null;
    this.hudSub.textContent = `⚔ ${d.players ?? 0} players · ☠ ${d.curses ?? 0} curses · 📜 ${d.rules.length} rule${d.rules.length === 1 ? '' : 's'} added${need ? ` · goal ${Math.min(d.points, need)}/${need}` : ''}${d.points >= 100 ? ' · 100 pts: add a rule!' : ''}`;
    this.hud.classList.toggle('hidden', g.state !== 'playing' || g.mode !== 'world' || !!g.ui?.stack?.length);
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game; if (this.disposed) return false;
    if (g.paused || g.state !== 'playing') { this.refreshHud(); return; }
    this.t += dt;
    const lead = this.lead();
    this.updateKogane(dt, lead);
    if (this.bubT > 0) { this.bubT -= dt; if (this.bubT <= 0) this.bub.classList.remove('on'); }
    this.countKills(dt);
    this.dressNamed();
    if (lead) { this.spawnPlayers(dt, lead); this.keepPlayers(dt); }
    for (const ev of this.events) { try { EVENTS[ev.kind]?.(this, ev, dt, lead); } catch (e) { console.warn('colony event', ev.kind, e); ev.kind = 'off'; } }
    // quest steps that wait for points
    const d = cgData(g);
    for (const id of g.quests?.active?.() ?? []) { const s = g.quests.current(id); if (s?.type === 'cgpoints' && d.points >= (s.need ?? 100)) { g.quests.advance(id); this.say(`Point goal reached: ${s.need}!`); } }
    // Kogane's radar rule
    if (hasRule(g, 'radar') && lead) {
      this.radarT = (this.radarT ?? 8) - dt;
      if (this.radarT <= 0) { this.radarT = 20; const n = this.players.filter((e) => !e.dead).sort((a, b) => a.pos.distanceTo(lead.pos) - b.pos.distanceTo(lead.pos))[0]; if (n) this.say(`Radar: a player ${Math.round(n.pos.distanceTo(lead.pos))} m ${dirName(n.pos.x - lead.pos.x, n.pos.z - lead.pos.z)}!`); }
    }
    // name plates face the camera
    const cam = g.rig?.camera;
    if (cam) for (const e of g.enemies) if (e._plate && !e.dead) {
      e._plate.visible = !(e.spawnT > 0.15) && !e.burrowed;
      const sc = Math.max(0.05, e.object.scale.y);
      e._plate.position.set(0, (e._plateH ?? 2.8) / sc, 0); e._plate.scale.setScalar(1 / sc);
      e._plate.quaternion.copy(qInv.copy(e.object.quaternion).invert()).multiply(cam.quaternion);
    }
    this.refreshHud();
  }
  updateKogane(dt, lead) {
    const k = this.kogane; if (!lead) return;
    const cam = this.game.rig?.camera;
    const right = cam ? tmp2.set(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize() : tmp2.set(1, 0, 0);
    const want = tmp.copy(lead.pos).addScaledVector(right, 1.3); want.y += 2.3 + Math.sin(this.t * 2.2) * 0.15;
    this.koHop = Math.max(0, (this.koHop ?? 0) - dt);
    want.y += Math.sin(this.koHop * 10) * this.koHop * 0.5;
    if (k.position.distanceTo(want) > 20) k.position.copy(want);
    k.position.lerp(want, Math.min(1, dt * 4));
    if (cam) { const yaw = Math.atan2(cam.position.x - k.position.x, cam.position.z - k.position.z); k.rotation.y += (((yaw - k.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 5); }
    const [a, b] = k.userData.arms; a.rotation.z = 0.4 + Math.sin(this.t * 6) * 0.3; b.rotation.z = -0.4 - Math.sin(this.t * 6) * 0.3;
  }
  countKills(dt) {
    const g = this.game, d = cgData(g);
    for (const e of g.enemies) {
      if (!e.dead || e.isDummy || this.counted.has(e)) continue;
      this.counted.add(e);
      if (!(e.hp <= 0)) continue;                      // vanished (roaming despawn), not killed
      if (e.cgPlayer) {
        const pts = (e.cgPlayer.pts ?? 5) * (hasRule(g, 'bounty') && e.cgPlayer.pts === 5 ? 2 : 1);
        d.players = (d.players ?? 0) + 1;
        addPoints(g, pts, `${e.cgName ?? 'Player'} eliminated`);
        if (hasRule(g, 'bounty')) g.pickups?.drop('coin', e.pos, 4);
      } else if (e.questName && NAMED[e.questName]) {
        d.players = (d.players ?? 0) + 1;
        addPoints(g, NAMED[e.questName].pts ?? 20, `${e.questName} defeated`);
      } else {
        d.curses = (d.curses ?? 0) + 1;
        const pts = hasRule(g, 'curse_bounty') ? 2 : 1;
        d.points += pts; d.earned = (d.earned ?? 0) + pts;
        if (hasRule(g, 'curse_bounty')) g.pickups?.drop('coin', e.pos, 2);
        if (hasRule(g, 'mercy')) for (const p of g.players) if (!p.dead && !p.downed) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.03);
        this.curseTally = (this.curseTally ?? 0) + pts;
        this.tallyT = 1.2;
      }
    }
    if (this.tallyT > 0) { this.tallyT -= dt; if (this.tallyT <= 0 && this.curseTally) { this.say(`Curse exorcised · +${this.curseTally} (total ${d.points})`, 1.8); this.curseTally = 0; g.save.write(); } }
  }
  // quest bosses with a NAMED entry become that sorcerer
  dressNamed() {
    for (const e of this.game.enemies) {
      if (e._dressed || e.dead || !e.questName) continue;
      const n = NAMED[e.questName]; if (!n) { e._dressed = true; continue; }
      if (n.look) dressAsSorcerer(this.game, e, n.look, { name: e.questName, plateText: `★ ${e.questName} · ${n.pts} pts`, plateColor: '#ffd23a', tint: n.tint });
      else e._dressed = true;
    }
  }
  // ---------------------------------------------------------------- hostile players
  spawnPlayer(spec, pos, o = {}) {
    const g = this.game, R = ROSTER[spec] ?? ROSTER.brawler;
    const e = g.spawnEnemy(R.base, pos, { level: o.level ?? 2, elite: o.elite ?? null });
    if (!e) return null;
    e.maxHp *= R.hp; e.hp = e.maxHp; e.roamer = true;
    const nm = o.name ?? `${R.names[Math.floor(Math.random() * R.names.length)]}`;
    e.cgPlayer = { spec, pts: o.pts ?? R.pts }; e.cgName = nm;
    dressAsSorcerer(g, e, o.look ?? R.looks[Math.floor(Math.random() * R.looks.length)], { name: nm, plateText: `${nm} · ${e.cgPlayer.pts} pts`, plateColor: o.plateColor ?? '#ff9a9a' });
    g.fx?.blinkPuff?.(pos, 0xffd23a);
    this.players.push(e);
    return e;
  }
  spawnPlayers(dt, lead) {
    const zones = this.cfg.playerZones ?? []; if (!zones.length) return;
    this.spawnT -= dt; if (this.spawnT > 0) return;
    this.spawnT = 7 + Math.random() * 7;
    const q = this.game.gr?.quality;
    const cap = Math.max(1, (this.cfg.cap ?? 3) - (q === 'low' ? 1 : 0));
    this.players = this.players.filter((e) => !e.dead && this.game.enemies.includes(e));
    const zone = zones.find((z) => rectDist(z, lead.pos.x, lead.pos.z) < 12);
    if (!zone) return;
    const inZone = this.players.length;
    if (inZone >= Math.min(cap, zone.max ?? cap)) return;
    const W = this.game.world, safe = this.L.safe ?? [];
    for (let tries = 0; tries < 16; tries++) {
      const a = Math.random() * Math.PI * 2, dd = 15 + Math.random() * 12;
      const x = lead.pos.x + Math.cos(a) * dd, z = lead.pos.z + Math.sin(a) * dd;
      if (!inRect(zone, x, z) || safe.some((r) => inRect(r, x, z))) continue;
      if (W.isLoaded && !W.isLoaded(x, z)) continue;
      const y = W.standY(x, z, lead.pos.y + 4, 10);
      if (!isFinite(y) || Math.abs(y - lead.pos.y) > 8 || W.liquidAt(x, y + 0.2, z) || W.solidAt(x, y + 1.5, z)) continue;
      const roster = zone.roster ?? ['brawler', 'caster'];
      const e = this.spawnPlayer(roster[Math.floor(Math.random() * roster.length)], new THREE.Vector3(x, y, z), { level: zone.level ?? 2, elite: Math.random() < (zone.elite ?? 0.08) ? ['swift', 'armored', 'vampiric'][Math.floor(Math.random() * 3)] : null });
      if (e && Math.random() < 0.5) this.say(`A player approaches: ${e.cgName} (${e.cgPlayer.pts} pts)!`, 2.2);
      return;
    }
  }
  keepPlayers(dt) {
    const g = this.game, hs = g.players.filter((p) => !p.dead), safe = this.L.safe ?? [];
    for (const e of this.players) {
      if (e.dead) continue;
      const far = hs.length ? Math.min(...hs.map((p) => p.pos.distanceTo(e.pos))) : 99;
      e.farT = far > 60 ? (e.farT ?? 0) + dt : 0;
      const unsafe = safe.some((r) => inRect(r, e.pos.x, e.pos.z));
      if (e.farT > 5 || unsafe) {
        if (unsafe) g.fx?.blinkPuff?.(e.pos, 0xffd23a);
        e.dead = true; e.deathT = 0.5;
      }
    }
  }
  dispose() {
    this.disposed = true;
    if (LIVE === this) LIVE = null;
    this.hud?.remove(); this.hud = null;
    for (const ev of this.events) EVENTS_END[ev.kind]?.(this, ev);
  }
}

// ------------------------------------------------------------------ colony events
const ash = (cg, dt, rate, col = [0.55, 0.52, 0.5]) => {
  const g = cg.game, part = g.particles; if (!part) return;
  cg.ashT = (cg.ashT ?? 0) + dt * rate * (part.budget ?? 1);
  const f = g.rig?.focus ?? cg.lead()?.pos; if (!f) return;
  while (cg.ashT > 1) {
    cg.ashT -= 1;
    const x = f.x + (Math.random() - 0.5) * 40, z = f.z + (Math.random() - 0.5) * 36, y = f.y + 6 + Math.random() * 8;
    const k = 0.85 + Math.random() * 0.3;
    part.smoke.emit(x, y, z, 0.4 + Math.random() * 0.5, -0.9 - Math.random() * 0.6, 0.2 + Math.random() * 0.4, 7 + Math.random() * 3, col[0] * k, col[1] * k, col[2] * k, 0.07 + Math.random() * 0.05, 0, 0.05, 0.9, 1);
  }
};
const strike = (cg, at, { dmg = 12, color = 0x9ad8ff, delay = 0.9, radius = 2.2 } = {}) => {
  const g = cg.game;
  const y = g.world.groundBelow(at.x, at.z, at.y + 6); if (!isFinite(y)) return;
  const pos = new THREE.Vector3(at.x, y, at.z);
  const mk = g.markers?.spawn({ pos, radius, dur: delay, color });
  let t = 0;
  g.addUpdater((dt) => {
    if (cg.disposed) return false;
    t += dt; if (t < delay) return true;
    if (mk) g.markers.cancel(mk);
    const top = pos.clone().setY(pos.y + 18);
    g.fx?.slashLine(top, new THREE.Vector3(0.05, -1, 0.02).normalize(), 18.2, color, 0.5, 0.25);
    g.fx?.slashLine(top.clone().add(new THREE.Vector3(0.4, 0, 0)), new THREE.Vector3(-0.08, -1, 0.05).normalize(), 18, 0xffffff, 0.22, 0.2);
    g.fx?.shockwave?.(pos, color, radius * 1.6, 0.4);
    g.particles?.burst(pos.clone().setY(pos.y + 0.3), { count: 24, color, speed: 7, up: 3, life: 0.4, size: 0.12, drag: 4, shape: 1, intensity: 3 });
    g.lights?.flash(pos.clone().setY(pos.y + 3), color, 9, 16, 0.25);
    g.audio?.tone?.({ freq: 180, to: 40, dur: 0.35, gain: 0.18, type: 'sawtooth', filter: 1200 });
    g.shake?.(0.25);
    if (dmg > 0) for (const p of g.players) if (!p.dead && !p.downed && Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < radius) p.takeDamage(dmg, null, { knock: new THREE.Vector3(p.pos.x - pos.x, 2, p.pos.z - pos.z).normalize().multiplyScalar(6) });
    return false;
  });
};
const EVENTS = {
  off() {},
  // falling ash everywhere (Sakurajima), or a grey drift (Sendai)
  ash(cg, ev, dt) { ash(cg, dt, ev.rate ?? 14, ev.color); },
  // Kashimo's scar: lightning walks the ground; strikes target you while you are inside
  lightning(cg, ev, dt, lead) {
    const s = ev.st, r = ev.rect;
    s.amb = (s.amb ?? 2) - dt;
    if (lead && rectDist(r, lead.pos.x, lead.pos.z) < 40 && s.amb <= 0) {
      s.amb = 1.2 + Math.random() * 2.2;
      const x = r.x0 + Math.random() * (r.x1 - r.x0), z = r.z0 + Math.random() * (r.z1 - r.z0);
      strike(cg, tmp.set(x, lead.pos.y, z), { dmg: 0, delay: 0.5, radius: 1.6 });
    }
    if (!lead || !inRect(r, lead.pos.x, lead.pos.z)) { s.was = false; return; }
    if (!s.was) { s.was = true; if (!s.told) { s.told = true; cg.say(ev.enter ?? 'Lightning scars everywhere. Mind the strikes!', 3); } }
    s.hit = (s.hit ?? 2.5) - dt;
    if (s.hit <= 0) { s.hit = 2.4 + Math.random() * 1.8; strike(cg, tmp.set(lead.pos.x + (Math.random() - 0.5) * 3, lead.pos.y, lead.pos.z + (Math.random() - 0.5) * 3), { dmg: ev.dmg ?? 12, delay: 1.0 }); }
  },
  // Kurourushi's nest: entering wakes a swarm for ev.dur seconds
  swarm(cg, ev, dt, lead) {
    const s = ev.st, g = cg.game;
    s.cd = Math.max(0, (s.cd ?? 0) - dt);
    if (!s.on && lead && inRect(ev.rect, lead.pos.x, lead.pos.z) && s.cd <= 0) {
      s.on = true; s.t = ev.dur ?? 28; s.spawnT = 0; s.list = []; s.killed = 0;
      cg.say(ev.enter ?? 'The swarm wakes! Survive!', 3); toast('⚠ SWARM EVENT', 'big');
      g.audio?.energy?.('summon'); g.fx?.screenWave?.(lead.pos, 0.6, 0.6);
    }
    if (!s.on) return;
    s.t -= dt; s.spawnT -= dt;
    s.list = s.list.filter((e) => { if (e.dead && !e._sw) { e._sw = true; if (e.hp <= 0) s.killed++; } return !e.dead; });
    if (lead && s.spawnT <= 0 && s.t > 2 && s.list.length < (ev.max ?? 8)) {
      s.spawnT = 0.8;
      const kinds = ev.kinds ?? ['flyhead', 'swarmer'];
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 7;
        const x = lead.pos.x + Math.cos(a) * d, z = lead.pos.z + Math.sin(a) * d, y = g.world.standY(x, z, lead.pos.y + 3, 8);
        if (!isFinite(y) || g.world.solidAt(x, y + 0.5, z)) continue;
        const e = g.spawnEnemy(kinds[Math.floor(Math.random() * kinds.length)], new THREE.Vector3(x, y, z), { level: ev.level ?? 2 });
        if (e) { s.list.push(e); g.fx?.summonCircle?.(e.pos, 0x6a4a2a); }
      }
    }
    if (s.t <= 0 || (lead && rectDist(ev.rect, lead.pos.x, lead.pos.z) > 50)) {
      s.on = false; s.cd = ev.cooldown ?? 90;
      if (s.t <= 0) { cg.say(`The swarm scatters! You crushed ${s.killed} of them.`, 3); if (s.killed >= 6) addPoints(g, 10, 'Swarm survived'); }
    }
  },
  // Uro Takako's sky manipulation: the sky folds while you are inside
  sky(cg, ev, dt, lead) {
    const s = ev.st, g = cg.game, inside = !!lead && inRect(ev.rect, lead.pos.x, lead.pos.z);
    if (inside !== !!s.in) {
      s.in = inside;
      if (inside) { g.env?.setRegionLook?.(ev.look); if (!s.told) { s.told = true; cg.say(ev.enter ?? 'The sky itself is bending here!', 3); } }
      else g.env?.setRegionLook?.(cg.L.biome?.look ?? {});
    }
    if (inside) {
      s.fx = (s.fx ?? 0) - dt;
      if (s.fx <= 0) { s.fx = 0.15; const part = g.particles; const f = lead.pos; part?.glow.emit(f.x + (Math.random() - 0.5) * 30, f.y + 8 + Math.random() * 6, f.z + (Math.random() - 0.5) * 30, 0, -0.4, 0, 3, 0.6, 0.7, 1.6, 0.25, 0, 0.1, 0.5, 0); }
    }
  },
  // Dhruv's shikigami trails: walking on a live trail burns; a shikigami runs along each
  trail(cg, ev, dt, lead) {
    const s = ev.st, g = cg.game;
    const off = ev.offQuest && g.quests?.state(ev.offQuest) === 'complete';
    if (!s.runners) {
      s.runners = ev.paths.map((path) => {
        const grp = new THREE.Group();
        const m = new THREE.MeshStandardNodeMaterial({ color: 0x14141c, roughness: 0.5, emissive: 0x3a6aff, emissiveIntensity: 0.6 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.9), m); body.position.y = 0.4; grp.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.32), m); head.position.set(0, 0.6, 0.5); grp.add(head);
        for (const sx of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.4), m); wing.position.set(sx * 0.6, 0.5, 0); grp.add(wing); grp.userData['w' + sx] = wing; }
        g.scene.add(grp); (g.hubProps ??= []).push(grp);
        let len = 0; const seg = []; for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); seg.push(l); len += l; }
        return { grp, path, seg, len, d: Math.random() * len };
      });
    }
    for (const r of s.runners) {
      r.grp.visible = !off;
      if (off) continue;
      r.d = (r.d + dt * 7) % r.len;
      let d = r.d, i = 0; while (i < r.seg.length - 1 && d > r.seg[i]) { d -= r.seg[i]; i++; }
      const [ax, az] = r.path[i], [bx, bz] = r.path[i + 1], t = Math.min(1, d / r.seg[i]);
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = g.world.groundBelow(x, z, 60);
      r.grp.position.set(x, (isFinite(y) ? y : 10) + 0.6 + Math.sin(cg.t * 8) * 0.15, z); r.grp.rotation.y = Math.atan2(bx - ax, bz - az);
      r.grp.userData['w-1'].rotation.z = Math.sin(cg.t * 18) * 0.5; r.grp.userData.w1.rotation.z = -Math.sin(cg.t * 18) * 0.5;
      if (lead && !lead.dead && Math.hypot(lead.pos.x - x, lead.pos.z - z) < 1.6 && (s.bite ?? 0) <= 0) { s.bite = 1.2; lead.takeDamage(ev.bite ?? 10, null, {}); cg.say('A trail shikigami bites as it passes!', 1.6); }
    }
    s.bite = (s.bite ?? 0) - dt;
    if (off || !lead) return;
    const cell = Math.floor(lead.pos.x) + ',' + Math.floor(lead.pos.z);
    s.cells ??= new Set(ev.cells ?? []);
    if (s.cells.has(cell)) {
      s.tick = (s.tick ?? 0) - dt;
      if (s.tick <= 0) { s.tick = 0.6; lead.takeDamage(ev.dps ?? 4, null, { dot: true }); if (!s.told) { s.told = true; cg.say(ev.enter ?? 'Shikigami trail! Stepping on it hurts.', 3); } }
    }
  },
  // the volcano: lava bombs rain round you while you are near the cone
  eruption(cg, ev, dt, lead) {
    const s = ev.st, g = cg.game;
    // a smoke column over the crater, always
    s.smoke = (s.smoke ?? 0) + dt * 9 * (g.particles?.budget ?? 1);
    const [cx, cy, cz] = ev.crater;
    while (s.smoke > 1) { s.smoke -= 1; const k = 0.18 + Math.random() * 0.15; g.particles?.smoke.emit(cx + (Math.random() - 0.5) * 6, cy + Math.random() * 3, cz + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 1.2, 4 + Math.random() * 3, (Math.random() - 0.5) * 1.2, 6 + Math.random() * 3, k, k * 0.9, k * 0.85, 1.6, -0.3, 0.2, 6, 0); }
    s.glow = (s.glow ?? 0) + dt * 6;
    while (s.glow > 1) { s.glow -= 1; g.particles?.glow.emit(cx + (Math.random() - 0.5) * 5, cy, cz + (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4, 8 + Math.random() * 6, (Math.random() - 0.5) * 4, 2.5, 3, 1.1, 0.3, 0.18, 9, 0.2, 0.4, 1); }
    if (!lead) return;
    const near = Math.hypot(lead.pos.x - cx, lead.pos.z - cz) < (ev.radius ?? 70);
    s.t = (s.t ?? 4) - dt;
    if (near && s.t <= 0) {
      s.t = (ev.every ?? 4.5) + Math.random() * 3;
      if (!s.told) { s.told = true; cg.say(ev.enter ?? 'The volcano rumbles! Watch for falling lava bombs!', 3); }
      const n = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const at = tmp.set(lead.pos.x + (Math.random() - 0.5) * 8, lead.pos.y, lead.pos.z + (Math.random() - 0.5) * 8);
        const y = g.world.groundBelow(at.x, at.z, at.y + 8); if (!isFinite(y)) continue;
        const pos = new THREE.Vector3(at.x, y, at.z), mk = g.markers?.spawn({ pos, radius: 2.4, dur: 1.4, color: 0xff6a1a });
        let t = 0;
        g.addUpdater((dt2) => {
          if (cg.disposed) return false;
          t += dt2;
          const k = Math.min(1, t / 1.4);
          g.particles?.glow.emit(pos.x + (1 - k) * 6, pos.y + (1 - k) * 22, pos.z, 0, -6, 0, 0.25, 3, 1.2, 0.3, 0.5, 0, 0, 0.4, 1);
          if (t < 1.4) return true;
          if (mk) g.markers.cancel(mk);
          g.fx?.explosion?.(pos, 0xff6a1a, 2.6);
          g.hazards?.fire(pos, 6, 1.6);
          g.shake?.(0.3);
          for (const p of g.players) if (!p.dead && !p.downed && Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < 2.4) p.takeDamage(ev.dmg ?? 16, null, { knock: new THREE.Vector3(p.pos.x - pos.x, 2, p.pos.z - pos.z).normalize().multiplyScalar(7) });
          return false;
        });
      }
    }
  },
  // standing in lava burns
  lava(cg, ev, dt) {
    const g = cg.game, s = ev.st;
    s.t = (s.t ?? 0) - dt; if (s.t > 0) return;
    for (const p of g.players) {
      if (p.dead || p.downed) continue;
      if (g.world.liquidAt(p.pos.x, p.pos.y + 0.2, p.pos.z) === 'lava' || g.world.liquidAt(p.pos.x, p.pos.y - 0.4, p.pos.z) === 'lava') {
        s.t = 0.5; p.takeDamage(ev.dps ?? 7, null, { dot: true });
        g.particles?.burst(p.pos.clone().setY(p.pos.y + 0.4), { count: 10, color: 0xff6a1a, speed: 2, up: 3, life: 0.5, size: 0.12, shape: 1 });
        if (!s.told) { s.told = true; cg.say('Lava! Get out of the lava!', 2); }
      }
    }
  },
  // hot springs: steam, and they heal you while you soak
  steam(cg, ev, dt, lead) {
    const s = ev.st, g = cg.game;
    s.puff = (s.puff ?? 0) + dt * 14 * (g.particles?.budget ?? 1);
    while (s.puff > 1) { s.puff -= 1; const [x, y, z] = ev.pools[Math.floor(Math.random() * ev.pools.length)]; g.particles?.smoke.emit(x + (Math.random() - 0.5) * 4, y + 0.3, z + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 0.4, 1 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4, 2.5 + Math.random(), 0.9, 0.9, 0.92, 0.5, -0.2, 0.3, 2.2, 0); }
    if (!lead) return;
    const inPool = g.world.liquidAt(lead.pos.x, lead.pos.y + 0.3, lead.pos.z) === 'water' && inRect(ev.rect, lead.pos.x, lead.pos.z);
    if (inPool) {
      for (const p of g.players) if (!p.dead && !p.downed && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.06 * dt);
      s.heal = (s.heal ?? 0) - dt; if (s.heal <= 0) { s.heal = 1.2; g.fx?.heal?.(lead.pos, 0x9affd8); }
      if (!s.told) { s.told = true; cg.say(ev.enter ?? 'Hot springs! Soak to recover.', 3); }
    }
  },
};
const EVENTS_END = {
  sky(cg, ev) { if (ev.st.in) cg.game.env?.setRegionLook?.(cg.L.biome?.look ?? {}); },
};

// ------------------------------------------------------------------ panels
export function openRuleBoard(game) {
  const g = game, d = cgData(g);
  g.paused = true;
  const close = () => { g.ui.close('cg-rules'); g.paused = false; g.last = performance.now(); };
  g.ui.open('cg-rules', (el) => {
    const added = d.rules.map((id, i) => h('li', { class: 'cg-added' }, h('b', {}, `Rule ${9 + i}: `), CG_ADDABLE[id]?.text ?? id));
    const trade = hasRule(g, 'transfer') ? h('button', { class: 'btn', disabled: d.points < 10 ? true : null, onclick: () => { if (cgData(g).points < 10) return; cgData(g).points -= 10; g.save.data.coins += 60; g.save.write(); toast('◈ 10 points transferred · +60 coins'); close(); openRuleBoard(g); } }, 'Trade 10 pts → ◆60') : null;
    el.appendChild(h('div', { class: 'panel cg-board' },
      h('div', { class: 'cnum' }, '死滅回游 · The Culling Game'),
      h('h2', {}, 'Rules'),
      h('ol', { class: 'cg-rules' }, ...CG_RULES.map((r) => h('li', {}, r)), ...added),
      h('div', { class: 'cg-stat' }, `◈ ${d.points} points · ${d.earned ?? 0} earned in total · ${d.players ?? 0} players and ${d.curses ?? 0} curses defeated`),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:12px;gap:8px;flex-wrap:wrap' },
        h('button', { class: 'btn', onclick: close }, 'Close'),
        trade,
        h('button', { class: 'btn primary', 'data-autofocus': true, disabled: d.points < 100 || Object.keys(CG_ADDABLE).every((k) => d.rules.includes(k)) ? true : null, onclick: () => { g.ui.close('cg-rules'); openAddRule(g, {}); } }, 'Add a rule (100 pts)'))));
  }, { dim: true, onBack: close });
}
// Add a rule. o.free: no points needed (a quest reward); o.onDone()
export function openAddRule(game, o = {}) {
  const g = game, d = cgData(g);
  const left = Object.keys(CG_ADDABLE).filter((k) => !d.rules.includes(k));
  if (!left.length) { toast('Kogane: every rule you could add is already in play!'); o.onDone?.(); return; }
  if (!o.free && d.points < 100) { toast('Kogane: you need 100 points to add a rule.'); return; }
  g.paused = true;
  const close = () => { g.ui.close('cg-add'); g.paused = false; g.last = performance.now(); o.onDone?.(); };
  g.ui.open('cg-add', (el) => {
    el.appendChild(h('div', { class: 'panel cg-board' },
      h('div', { class: 'cnum' }, o.free ? 'Quest reward · a free rule' : 'Spend 100 points'),
      h('h2', {}, 'Kogane: "Which rule do you propose?"'),
      h('div', { class: 'cg-choices' }, ...left.map((id, i) => h('button', { class: 'btn cg-choice', 'data-autofocus': i === 0 ? true : null, onclick: () => {
        if (!o.free) d.points -= 100;
        d.spent = (d.spent ?? 0) + (o.free ? 0 : 100);
        d.rules.push(id); g.save.write();
        toast(`📜 Rule ${8 + d.rules.length} added: ${CG_ADDABLE[id].name}`, 'big');
        g.audio?.levelUp?.();
        if (LIVE) { LIVE.say(`The game master accepts! Rule ${8 + d.rules.length}: ${CG_ADDABLE[id].name}.`, 3.5); LIVE.refreshHud(true); }
        close();
      } }, h('b', {}, CG_ADDABLE[id].name), h('span', {}, CG_ADDABLE[id].text)))),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' }, h('button', { class: 'btn', onclick: close }, 'Not now'))));
  }, { dim: true, onBack: close });
}
