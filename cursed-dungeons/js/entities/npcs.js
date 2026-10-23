// Jujutsu High's residents and ambient life. Gojo lounging on his bench,
// Principal Yaga at the shrine with a cursed doll, Ijichi at the briefing
// table, Nitta by the gate, Megumi at the vending machines (the shop), Panda
// and Maki sparring and Inumaki watching. They breathe, gesture, turn to face
// you, call out in speech bubbles and talk through game.dialogue. Plus a cat
// to pet, birds overhead, koi in the pond and sakura petals on the wind.
//
// new HubNpcs(game, L) builds everything (rigs are cached between hub
// visits); update(dt) every frame; talk(id) / station(id, open) start a
// conversation. Conversation progress is saved in save.data.hubTalk.
//
// RegionNpcs (bottom of the file): the ambient people of any open-world
// region (L.people posts: { id, name, look, pos, yaw, pose: 'idle'|'wave'|
// 'sit'|'wander', wander, lines: [[…], […]], barks, color }) plus the NPCs a
// quest needs. They idle, wander, face you, talk through game.dialogue
// (quests get first say: game.quests.onTalk) and show a gold ! (new quest)
// or ? (quest step) over their heads — for the Jujutsu High residents too.
// Civilian looks: npc_civ_0 … npc_civ_5.
import * as THREE from 'three/webgpu';
import { registerLook, buildSorcererModel, PROP_KIT } from './models.js';
import { SORCERERS } from '../sorcerers/index.js';
import { Props } from '../world/jujutsuHigh.js';
import { dampAngle, clamp } from '../util.js';

const ZERO = new THREE.Vector3();
const tmp = new THREE.Vector3();
const SUIT = 0x17171c, UNIFORM = 0x1b2030;

// ---------------------------------------------------------------- looks
registerLook('npc_yaga', {
  paint: { skinTone: 0xc08a62, hair: 0x15120f, fringe: 1, hairSide: 2, hairBack: 3, top: 0x24262c, collar: 0x1a1b20, topTrim: 0x1a1b20, buttons: 0x2c2c32, pants: 0x24262c, shoes: 0x101010, eye: 0x101010, brow: 0x15120f },
  hair: () => [], hairColor: 0x15120f, cape: null, scale: 1.34, emit: 0,
  paintExtra(S) {
    S.mat = 'metal'; S.rect(8, 11, 8, 2, 0x0a0a10, 0.02); S.rect(0, 11, 8, 1, 0x0a0a10, 0.02); S.rect(16, 11, 8, 1, 0x0a0a10, 0.02);   // sunglasses
    S.fineRect(9, 11, 2, 0.5, 0x4a5a70); S.fineRect(13, 11, 2, 0.5, 0x4a5a70);
    S.mat = 'hair'; S.rect(10, 14, 4, 1, 0x1a1410, 0.1); S.rect(11, 15, 2, 1, 0x1a1410, 0.1); S.rect(8, 13, 1, 3, 0x1a1410, 0.1); S.rect(15, 13, 1, 3, 0x1a1410, 0.1);
    S.mat = 'cloth';
  },
  props(rig, K) {   // a little cursed doll in his hand
    const brown = K.mat(0xb08058), dark = K.mat(0x2a1a10), pink = K.mat(0xf0a0b0);
    const d = new THREE.Group(); d.position.set(0, -2 * K.PX, 2.5 * K.PX); rig.handL.add(d);
    K.box(d, 4, 4, 3, brown, 0, -2, 0); K.box(d, 4.5, 4, 4, brown, 0, 2, 0);
    K.box(d, 1.4, 1.4, 1, brown, -1.6, 4.4, 0); K.box(d, 1.4, 1.4, 1, brown, 1.6, 4.4, 0);
    K.box(d, 0.6, 0.6, 0.4, dark, -0.9, 2.4, 2.1); K.box(d, 0.6, 0.6, 0.4, dark, 0.9, 2.4, 2.1); K.box(d, 1.2, 0.6, 0.4, pink, 0, 1.2, 2.1);
    rig.extras.doll = d;
  },
});
registerLook('npc_ijichi', {
  paint: { skinTone: 0xf0d6c0, hair: 0x2a2018, fringe: 1, hairSide: 2, hairBack: 4, top: SUIT, collar: 0xf2f2f2, topTrim: 0x2c2c48, buttons: SUIT, pants: SUIT, shoes: 0x0c0c0c, eye: 0x2a2a2a },
  hair: (m) => [{ x: 0, y: 7.6, z: -1, w: 8.4, h: 1.6, d: 7.4, material: m, stiff: 120 }],
  hairColor: 0x2a2018, cape: null, scale: 1.16, emit: 0,
  paintExtra(S) {
    S.mat = 'metal';
    for (const x of [9, 13]) { S.fineRect(x - 0.5, 11.5, 2.5, 0.5, 0x101010); S.fineRect(x - 0.5, 13, 2.5, 0.5, 0x101010); S.fineRect(x - 0.5, 11.5, 0.5, 2, 0x101010); S.fineRect(x + 1.5, 11.5, 0.5, 2, 0x101010); }
    S.fineRect(11, 12, 2, 0.5, 0x101010);
    S.mat = 'cloth'; S.rect(22, 20, 4, 2, 0xf2f2f2, 0.02); S.rect(23, 20, 2, 9, 0x2c2c48, 0.04);
  },
  props(rig, K) {
    const t = new THREE.Group(); t.position.set(0, -1 * K.PX, 2 * K.PX); t.rotation.x = -0.9; rig.handR.add(t);
    K.box(t, 6, 0.6, 8, K.mat(0x2a2a30), 0, 0, 2); K.box(t, 5, 0.2, 6.6, K.mat(0xe8e8f0, { emissive: 0.3 }), 0, 0.4, 2);
  },
});
registerLook('npc_nitta', {
  paint: { skinTone: 0xf4d6c0, hair: 0x9a6a3a, hairVolume: true, bob: true, fringe: 3, hairSide: 6, hairBack: 6, top: SUIT, collar: 0xf0f0f0, topTrim: 0xf0f0f0, buttons: SUIT, pants: SUIT, shoes: 0x0c0c0c, eye: 0x5a3a2a, blush: true },
  hair: (m) => [{ x: -3.4, y: 2.5, z: 0.5, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 50 }, { x: 3.4, y: 2.5, z: 0.5, w: 2, h: 3, d: 6, hang: true, material: m, stiff: 50 }],
  hairColor: 0x9a6a3a, cape: null, scale: 1.1, emit: 0,
});
registerLook('npc_maki', {
  paint: { skinTone: 0xf0cdb0, hair: 0x1e3a2c, hairVolume: true, fringe: 3, hairSide: 4, hairBack: 5, top: UNIFORM, collar: UNIFORM, pants: UNIFORM, shoes: 0x14141a, eye: 0x6a4a2a },
  hair: (m) => [
    { x: 0, y: 5.5, z: -4.6, w: 3, h: 7, d: 2, hang: true, material: m, stiff: 26 },
    { x: -3.3, y: 7, z: 2.4, w: 1.6, h: 4, d: 1.6, hang: true, material: m, stiff: 60 },
    { x: 3.3, y: 7, z: 2.4, w: 1.6, h: 4, d: 1.6, hang: true, material: m, stiff: 60 },
  ],
  hairColor: 0x1e3a2c, cape: null, scale: 1.16, emit: 0,
  paintExtra(S) {
    S.mat = 'metal';
    for (const x of [9, 13]) { S.fineRect(x - 0.5, 11.5, 2.5, 0.5, 0x2a1414); S.fineRect(x - 0.5, 13, 2.5, 0.5, 0x2a1414); S.fineRect(x - 0.5, 11.5, 0.5, 2, 0x2a1414); S.fineRect(x + 1.5, 11.5, 0.5, 2, 0x2a1414); }
    S.fineRect(11, 12, 2, 0.5, 0x2a1414);
    S.mat = 'cloth';
  },
  props(rig, K) {   // a training polearm
    const s = new THREE.Group(); s.rotation.x = Math.PI / 2; s.position.z = 2 * K.PX; rig.handR.add(s);
    K.box(s, 1.1, 36, 1.1, K.mat(0x6a4a2a), 0, 2, 0); K.box(s, 1.4, 5, 0.6, K.mat(0xc8ccd4, { metalness: 0.8, roughness: 0.3 }), 0, 22, 0);
    K.box(s, 1.6, 1, 1.6, K.mat(0x8a2a1a), 0, 19, 0);
    rig.extras.weapon = s;
  },
});

// townsfolk / civilians: npc_civ_0 … npc_civ_5
const CIVS = [
  { skinTone: 0xf4d0b0, hair: 0x2a1a10, top: 0xe85a3a, pants: 0x2a3a5a, shoes: 0x1a1a1a, eye: 0x3a2a1a, fringe: 3, hairSide: 3, hairBack: 4 },   // kid in a red tee
  { skinTone: 0xe8c0a0, hair: 0x101010, top: 0xf2f2ea, collar: 0xf2f2ea, pants: 0x3a3a3a, shoes: 0x2a1a10, eye: 0x2a2a2a, fringe: 1, hairSide: 2, hairBack: 3 },   // shopkeeper, white apron
  { skinTone: 0xf0cdb0, hair: 0x6a3a1a, top: 0x3a6ab8, pants: 0x2a2a3a, shoes: 0xf0f0f0, eye: 0x4a2a1a, fringe: 3, hairSide: 5, hairBack: 6, hairVolume: true },   // student in a blue hoodie
  { skinTone: 0xd8a888, hair: 0x2a2a2a, top: 0x3a5a3a, collar: 0x2a4a2a, pants: 0x4a4030, shoes: 0x2a1a10, eye: 0x2a2a2a, fringe: 1, hairSide: 2, hairBack: 3 },   // ranger / station master
  { skinTone: 0xf0d6c0, hair: 0xb8b8c0, top: 0x8a4a6a, collar: 0x6a3a5a, pants: 0x4a3a4a, shoes: 0x1a1a1a, eye: 0x3a3a3a, fringe: 2, hairSide: 3, hairBack: 4, bob: true },   // grandma
  { skinTone: 0xe0b890, hair: 0x15120f, top: 0xd8a040, collar: 0x8a5a2a, pants: 0xd8a040, shoes: 0x2a1a10, eye: 0x2a2a2a, fringe: 0, hairSide: 0, hairBack: 0 },   // monk in saffron
];
CIVS.forEach((p, i) => registerLook('npc_civ_' + i, { paint: { collar: p.top, topTrim: p.top, buttons: p.top, ...p }, hair: () => [], hairColor: p.hair, cape: null, scale: i === 0 ? 0.92 : 1.12, emit: 0 }));

// ---------------------------------------------------------------- who is who
const tq = (g) => { const id = g.players[0]?.sorcerer ?? g.save?.data.technique; return SORCERERS[id]?.technique ?? 'a new technique'; };
const techQuip = (g) => {
  const id = g.players[0]?.sorcerer ?? g.save?.data.technique;
  return {
    gojo: 'Wait. That\'s MY technique. Are you me? Is this one of Shoko\'s pranks?',
    sukuna: 'The King of Curses\' own technique. The higher-ups are going to be SO dramatic about this.',
    megumi: 'Ten Shadows! Megumi\'s going to be jealous. He\'ll pretend he isn\'t.',
    yuji: 'Just fists and guts? Yuji would love you.',
    nobara: 'Straw Doll! Nobara will want to see you swing that hammer.',
    inumaki: 'Cursed Speech. Mind your words. And drink some throat syrup.',
    panda: 'Gorilla Core? Did Yaga make you? ...No? Huh.',
    todo: 'Boogie Woogie. Please never ask me what type of woman I like.',
    hakari: 'A gambler, huh? Just don\'t bet your life on a pachinko reel.',
    kenjaku: 'Anti-Gravity System... and those stitches. If you start talking about "the next era of jujutsu", I am sealing you myself.',
    dabura: 'Light AND Darkness? Seventy years from now that would be the scariest thing in the sky. Today it\'s just you. Lucky us.',
    dagon: 'Disaster Tides. Last time I saw that one, it was being rude to Naobito on a beach.',
    angel: 'Jacob\'s Ladder. Please don\'t point it at me. I mean it.',
    takaba: 'Comedian? Okay, okay. Tell me a joke. ...No, a good one.',
    uiui: 'Space Manipulation! Mei Mei\'s going to want a cut of everything you earn.',
  }[id] ?? 'Interesting! Let\'s find out how far it goes.';
};

export const NPC_DEFS = {
  gojo: {
    name: 'Satoru Gojo', short: 'Gojo', look: 'gojo', color: '#6ad8ff', voice: 1.15, hideIfPlayer: true, pose: 'lounge', turn: false,
    sets: [
      ['Yo! You must be the new first-year. Satoru Gojo, your teacher. Also the strongest. Don\'t let it go to your head. That\'s my job.',
        (g) => `So your cursed technique is ${tq(g)}, huh? ${techQuip(g)}`,
        'Cursed energy comes from negative emotions. Control it. Don\'t let it control you.',
        'Ijichi has missions at the briefing table. Megumi has gear. Yaga has the scary dolls. Off you go!'],
      ['Want to know the secret of a Domain Expansion? It\'s a barrier with your innate domain inside. Every attack in there is a sure hit.',
        'To counter one, use a Simple Domain, or expand a stronger domain of your own. Or just be me.',
        'Mine is Unlimited Void. Infinite information, zero action. Very relaxing. For me.'],
      ['A Black Flash happens when cursed energy hits within a millionth of a second of your blow. Space bends. The hit is 2.5 times stronger.',
        'Nobody can do it on purpose. But once you\'ve done it, you understand cursed energy on a whole new level.'],
      ['These? Kikufuku from Sendai. The Six Eyes burn a lot of sugar.', 'Want one?', '...Nah, changed my mind.'],
    ],
    barks: ['Yo~!', 'Train hard, first-year!', 'Panda, less hugging, more punching!', 'Ah, youth.', 'Did someone say Kikufuku?', 'I\'m not slacking. I\'m supervising.'],
  },
  yaga: {
    name: 'Masamichi Yaga', short: 'Yaga', look: 'npc_yaga', color: '#d8a86a', voice: 0.7, pose: 'doll', station: 'Technique tree',
    sets: [
      ['I am Masamichi Yaga, principal of Tokyo Jujutsu High.', 'Before anything else. Why do you want to become a jujutsu sorcerer?', '...Hm. Good enough for now. Your answer will change. Make sure it never disappears.', 'This shrine is where you refine your technique. Spend your technique points here.'],
      ['These dolls are cursed corpses. I fill them with cursed energy and they move on their own. Don\'t poke them.', 'Panda was my finest work. Three cores... and a terrible sense of humour.', 'Reverse Cursed Technique heals the body. Few can do it. Unlock it here, then use it wisely.'],
      ['A sorcerer should never die with regrets. Remember that, out there.'],
    ],
    barks: ['...', 'Don\'t touch the dolls.', 'Train. Then train more.', 'Hmph.'],
  },
  ijichi: {
    name: 'Kiyotaka Ijichi', short: 'Ijichi', look: 'npc_ijichi', color: '#9ab0d8', voice: 1.05, pose: 'clipboard', station: 'Missions',
    sets: [
      ['Ah! H-hello. Kiyotaka Ijichi, assistant manager. I handle mission briefings. And the curtains.', 'The missions are on this map. The threat grade tells you how strong the curses are.', 'Clear the objective first. That opens the way to the Special Grade.', 'And please come back alive. The paperwork when you don\'t is... a lot.'],
      ['A curtain is a barrier that hides us from non-sorcerers. I drop one before every mission.', '"Emerging from darkness, darker than black, purify that which is impure."', '...Sorry. Force of habit.'],
      ['Gojo-san told me to make your next mission harder "for fun". I did not. Please don\'t tell him.'],
    ],
    barks: ['Mission briefings here!', 'Gojo-san isn\'t looking, is he?', 'The car is ready when you are.'],
  },
  nitta: {
    name: 'Akari Nitta', short: 'Nitta', look: 'npc_nitta', color: '#f0b070', voice: 1.3, pose: 'wave',
    sets: [
      ['Hiya! Akari Nitta, assistant manager. I drive you sorcerers to the missions.', 'The car\'s at the bottom of the stairs. Very long stairs. Great leg day, though.', 'Tip: Grade 4 curses are weak alone, but they swarm. Keep moving and don\'t get surrounded.'],
      ['I can\'t fight like you, but my technique stops injuries from getting worse.', 'So if you come back hurt, come back fast, okay?'],
      ['Dodge through attacks, not away from them. And watch the red markers on the ground!'],
    ],
    barks: ['Welcome back!', 'Mind the stairs!', 'Need a ride?', 'Ganbatte!'],
  },
  merchant: {
    name: 'Megumi Fushiguro', short: 'Megumi', look: 'megumi', color: '#8a8aff', voice: 0.9, pose: 'lean', station: 'Shop', hideIfPlayer: false,
    sets: [
      ['Megumi Fushiguro. ...Gojo told me to help you gear up.', 'Gear from missions and from here makes you stronger. Enchant it in your inventory.', 'Don\'t waste coins on junk. Check the power number first.'],
      ['Shikigami are summoned with hand signs. If one is destroyed, it\'s gone for good.', '...So don\'t be reckless. That goes for you too.'],
    ],
    barks: ['...', 'The vending machine is out of coffee again.', 'Need something?', 'Tch.'],
  },
  nobara: {
    name: 'Nobara Kugisaki', short: 'Nobara', look: 'nobara', color: '#ffa050', voice: 1.25, pose: 'lean', station: 'Shop',
    sets: [
      ['Nobara Kugisaki. I came all the way from the countryside for Tokyo, and I got stuck running the shop.', 'Buy something good. Gear makes you stronger, and you can enchant it in your inventory.'],
      ['A real sorcerer always looks good. Even covered in curse guts.'],
    ],
    barks: ['Buy something!', 'Tokyo, baby!', 'Hmph.'],
  },
  pandamaki: {
    name: 'Panda & Maki', color: '#e8e8e8', pose: 'spar',
    sets: [
      [{ who: 'panda', text: 'Hey hey! New kid! I\'m Panda. Just Panda. Not a real panda. Probably.' },
        { who: 'maki', text: 'Maki Zen\'in. Second-year. No cursed energy to speak of, so I hit things with weapons. Hard.' },
        { who: 'panda', text: 'She\'s not kidding. My cores still hurt.' },
        { who: 'maki', text: 'Want to get strong? Learn to fight without your technique first. Footwork. Dodges. Timing.' }],
      [{ who: 'maki', text: 'Dodge through attacks. A curse that\'s swinging is a curse that\'s open.' },
        { who: 'panda', text: 'And when a big curse lights up, that\'s your cue to MOVE.' }],
      [{ who: 'panda', text: 'Toge says hi. Well, he said "tuna mayo". Same thing.' },
        { who: 'maki', text: 'Use the talisman by the dummy if you want real practice. Training curses don\'t hold back.' }],
    ],
    barks: [],
  },
  inumaki: {
    name: 'Toge Inumaki', short: 'Inumaki', look: 'inumaki', color: '#b89aff', voice: 1.1, hideIfPlayer: true, pose: 'watch',
    sets: [
      ['Shake.', 'Tuna mayo! Takana.', { who: null, text: 'He points at the training dummy, then gives you a thumbs-up.' }, { who: 'panda', text: '(from the ring) He says welcome, and the dummy can\'t hit back, so go wild!' }],
      ['Konbu.', { who: null, text: 'He taps the seal on his throat and shakes his head. Cursed Speech hurts the user, too.' }],
      ['Okaka!', { who: null, text: 'He mimes a curse exploding. Somehow it\'s very clear.' }],
    ],
    barks: ['Shake.', 'Tuna.', 'Salmon roe!', 'Konbu.', 'Takana.', 'Okaka.'],
  },
};
const SPEAKERS = {
  panda: { name: 'Panda', look: 'panda', color: '#e8e8e8', voice: 0.8 },
  maki: { name: 'Maki Zen\'in', look: 'npc_maki', color: '#6ac08a', voice: 1.05 },
};

// ---------------------------------------------------------------- rigs (cached)
const RIGS = new Map();
function rigFor(look, key = look) {
  if (!RIGS.has(key)) { const r = buildSorcererModel(look); RIGS.set(key, r); }
  return RIGS.get(key);
}

// ---------------------------------------------------------------- the cat
function buildCat() {
  const parts = {};
  const mk = (fn) => { const P = new Props(5); fn(P); const m = P.build(); m.castShadow = true; return m; };
  const fur = 0xf0e6d8, patch = 0x3a2a22, ginger = 0xd8883a;
  const root = new THREE.Group();
  parts.body = mk((P) => { P.box(0, 0, 0, 0.32, 0.26, 0.6, fur, { center: true }); P.box(0.08, 0.1, -0.1, 0.18, 0.08, 0.3, ginger, { center: true }); P.box(-0.1, 0.08, 0.12, 0.14, 0.12, 0.16, patch, { center: true }); });
  parts.body.position.y = 0.32; root.add(parts.body);
  parts.head = mk((P) => {
    P.box(0, 0, 0, 0.3, 0.26, 0.26, fur, { center: true }); P.box(-0.09, 0.17, 0, 0.08, 0.1, 0.06, ginger, { center: true }); P.box(0.09, 0.17, 0, 0.08, 0.1, 0.06, patch, { center: true });
    P.box(-0.07, 0.03, 0.135, 0.05, 0.05, 0.01, 0x2a6a2a, { center: true, emit: 0.6, vary: 0 }); P.box(0.07, 0.03, 0.135, 0.05, 0.05, 0.01, 0x2a6a2a, { center: true, emit: 0.6, vary: 0 });
    P.box(0, -0.04, 0.14, 0.05, 0.03, 0.01, 0xe88a9a, { center: true, vary: 0 });
  });
  parts.head.position.set(0, 0.48, 0.3); root.add(parts.head);
  parts.tail = mk((P) => { P.box(0, 0.22, 0, 0.07, 0.44, 0.07, ginger); });
  parts.tail.position.set(0, 0.38, -0.3); parts.tail.rotation.x = -0.5; root.add(parts.tail);
  parts.legs = [];
  for (const [x, z] of [[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]]) {
    const l = mk((P) => P.box(0, -0.22, 0, 0.08, 0.22, 0.08, fur)); l.position.set(x, 0.22, z); root.add(l); parts.legs.push(l);
  }
  root.userData.parts = parts;
  return root;
}

// ---------------------------------------------------------------- manager
export class HubNpcs {
  constructor(game, L) {
    this.game = game; this.L = L;
    this.list = []; this.byId = {};
    this.t = 0;
    this.bubbles = new Map();
    document.querySelectorAll('.npc-bubble').forEach((e) => e.remove());
    const D = game.dialogue;
    const players = game.players.map((p) => p.sorcerer);
    const merchantId = players.includes('megumi') ? 'nobara' : 'merchant';
    for (const [sid, s] of Object.entries(SPEAKERS)) D?.speaker(sid, { ...s, rig: rigFor(s.look) });
    const posts = L.npcs ?? {};
    const add = (id, defId, post) => {
      if (!post) return;
      const def = NPC_DEFS[defId];
      const rig = rigFor(def?.look ?? SPEAKERS[id].look);
      const n = { id, def: def ?? { ...SPEAKERS[id], pose: post.pose, barks: [] }, defId, rig, pos: post.pos.clone(), yaw: post.yaw, baseYaw: post.yaw, headYaw: 0, pose: post.pose, t: Math.random() * 10, barkCd: 3 + Math.random() * 4, greeted: false, gesture: 0, visible: true };
      rig.root.position.copy(n.pos); rig.root.rotation.set(0, n.yaw, 0); rig.root.visible = true;
      game.scene.add(rig.root); (game.hubProps ??= []).push(rig.root);
      this.list.push(n); this.byId[id] = n;
      if (def) D?.speaker(defId, { name: def.name, color: def.color, voice: def.voice, rig });
      return n;
    };
    add('gojo', 'gojo', posts.gojo);
    add('yaga', 'yaga', posts.yaga);
    add('ijichi', 'ijichi', posts.ijichi);
    add('nitta', 'nitta', posts.nitta);
    add('merchant', merchantId, posts.merchant);
    add('panda', null, posts.panda);
    add('maki', null, posts.maki);
    add('inumaki', 'inumaki', posts.inumaki);
    if (this.byId.panda) { this.byId.panda.hideIfPlayer = 'panda'; }
    this.spar = { t: 0, phase: 'fight', who: 0, swing: 0, count: 0, hit: 0 };
    // talk prompts for the NPCs without a station (stations are wired in main.loadHub)
    const talkSpot = (n, off = 0) => n.pos.clone().add(tmp.set(Math.sin(n.baseYaw) * off, 0, Math.cos(n.baseYaw) * off));
    const talk = (id, label, pos, defId, radius = 2.2) => {
      const n = this.byId[id]; if (!n) return;
      game.interactables.push({ id: 'npc-' + id, pos, radius, label, action: () => this.talk(defId, n), enabled: () => n.rig.root.visible && !game.dialogue?.active });
    };
    if (this.byId.gojo) talk('gojo', 'Talk to Gojo', talkSpot(this.byId.gojo, 1.2), 'gojo');
    if (this.byId.nitta) talk('nitta', 'Talk to Nitta', this.byId.nitta.pos, 'nitta');
    if (this.byId.inumaki) talk('inumaki', 'Talk to Inumaki', this.byId.inumaki.pos, 'inumaki');
    if (this.byId.panda && this.byId.maki) talk('panda', 'Talk to Panda & Maki', this.byId.panda.pos.clone().lerp(this.byId.maki.pos, 0.5).add(tmp.set(0, 0, 1.6)), 'pandamaki', 2.0);
    this.buildLife();
  }
  // ------------------------------------------------------------ conversations
  progress(defId) { const d = this.game.save?.data; if (!d) return 0; d.hubTalk ??= {}; return d.hubTalk[defId] ?? 0; }
  bump(defId) { const d = this.game.save?.data; if (!d) return; d.hubTalk ??= {}; d.hubTalk[defId] = (d.hubTalk[defId] ?? 0) + 1; }
  talk(defId, n = null, onEnd = null) {
    const g = this.game, def = NPC_DEFS[defId]; if (!def || !g.dialogue) { onEnd?.(); return; }
    if (!onEnd && g.quests?.onTalk(n?.id ?? defId)) return;   // a quest takes the conversation (quests/index.js)
    const i = this.progress(defId);
    const set = def.sets[i % def.sets.length];
    this.bump(defId);
    const talkers = defId === 'pandamaki' ? [this.byId.panda, this.byId.maki] : [n ?? this.byId[defId]];
    for (const t of talkers) if (t) t.talking = true;
    this.hideBubbles();
    g.dialogue.say(defId, set, {
      onTick: (dt) => this.update(dt, true),
      onEnd: () => { for (const t of talkers) if (t) t.talking = false; g.save?.write(); onEnd?.(); },
    });
  }
  // A station NPC (shop, missions, technique tree): new lines first, then the menu.
  station(id, open) {
    if (this.game.quests?.onTalk(id)) return;
    const n = this.byId[id]; const defId = n?.defId ?? id; const def = NPC_DEFS[defId];
    if (def && n?.rig.root.visible && this.progress(defId) < def.sets.length) { this.talk(defId, n, open); return; }
    if (n && def?.barks?.length) this.bark(n, def.barks[Math.floor(Math.random() * def.barks.length)], 2.4);
    open();
  }
  // a resident who stays away because a player has their technique (you are Gojo: no second Gojo)
  hiddenByPlayer(id) {
    const n = this.byId[id]; if (!n) return false; const g = this.game;
    return !!((n.def.hideIfPlayer && g.players.some((p) => p.sorcerer === n.def.look)) || (n.hideIfPlayer && g.players.some((p) => p.sorcerer === n.hideIfPlayer)));
  }
  label(id, fallback) { const n = this.byId[id]; const def = n && NPC_DEFS[n.defId]; return def && n.rig.root.visible !== false ? `${def.short} · ${def.station ?? fallback}` : fallback; }
  // ------------------------------------------------------------ speech bubbles
  bark(n, text, dur = 3.2) {
    const root = this.game.hud?.root; if (!root) return;
    let el = this.bubbles.get(n.id);
    if (!el) { el = document.createElement('div'); el.className = 'npc-bubble'; root.appendChild(el); this.bubbles.set(n.id, el); }
    el.textContent = text; el.style.setProperty('--accent', n.def.color ?? '#fff');
    el.classList.remove('out'); el.classList.add('in');
    n.bubbleT = dur;
    clearTimeout(el._t); el._t = setTimeout(() => { el.remove(); this.bubbles.delete(n.id); }, dur * 1000 + 600);
  }
  hideBubbles() { for (const el of this.bubbles.values()) el.remove(); this.bubbles.clear(); }
  // ------------------------------------------------------------ per frame
  update(dt, talkingOnly = false) {
    const g = this.game; this.t += dt;
    const ps = g.players.filter((p) => !p.dead);
    const focus = g.rig?.focus ?? ZERO;
    for (const n of this.list) {
      const r = n.rig;
      const hide = (n.def.hideIfPlayer && g.players.some((p) => p.sorcerer === n.def.look)) || (n.hideIfPlayer && g.players.some((p) => p.sorcerer === n.hideIfPlayer));
      const far = Math.hypot(n.pos.x - focus.x, n.pos.z - focus.z) > 58;
      r.root.visible = !hide && !far;
      if (!r.root.visible) continue;
      if (talkingOnly && !n.talking) continue;
      n.t += dt;
      let near = null, nd = 1e9;
      for (const p of ps) { const d = Math.hypot(p.pos.x - n.pos.x, p.pos.z - n.pos.z); if (d < nd) { nd = d; near = p; } }
      // turn to the player (whole body when standing and close, otherwise the head)
      let want = n.baseYaw;
      const toward = near ? Math.atan2(near.pos.x - n.pos.x, near.pos.z - n.pos.z) : n.baseYaw;
      const canTurn = n.def.turn !== false && (n.pose !== 'spar' || n.talking);
      if (near && (nd < 5.5 || n.talking) && canTurn) want = toward;
      n.yaw = dampAngle(n.yaw, want, n.talking ? 6 : 3, dt);
      r.root.rotation.y = n.yaw;
      const look = near && nd < 9 ? clamp(((toward - n.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -1.0, 1.0) : 0;
      n.headYaw += (look - n.headYaw) * Math.min(1, dt * 5);
      if (n.pose !== 'spar') { r.animate({ dt, speed: 0, vel: ZERO }); this.pose(n, dt, nd); }
      r.head.rotation.y = n.headYaw;
      // barks: greet when someone walks up, chatter now and then
      if (talkingOnly) continue;
      n.barkCd -= dt; if (n.bubbleT > 0) n.bubbleT -= dt;
      const barks = n.def.barks ?? [];
      if (near && nd < 7 && !n.greeted && barks.length && n.barkCd <= 0 && !g.dialogue?.active) { n.greeted = true; n.barkCd = 14; n.gesture = 1.6; this.bark(n, barks[Math.floor(Math.random() * barks.length)]); }
      else if (near && nd < 14 && n.barkCd <= 0 && barks.length && !g.dialogue?.active && Math.random() < dt * 0.06) { n.barkCd = 22 + Math.random() * 14; this.bark(n, barks[Math.floor(Math.random() * barks.length)]); }
      if (nd > 12) n.greeted = false;
    }
    if (this.byId.panda && this.byId.maki && !talkingOnly) this.updateSpar(dt, ps);
    else if (talkingOnly) for (const id of ['panda', 'maki']) { const n = this.byId[id]; if (n?.talking) { n.rig.animate({ dt, speed: 0, vel: ZERO }); } }
    // bubbles follow heads
    const cam = g.rig?.camera;
    if (cam) for (const [id, el] of this.bubbles) {
      const n = this.byId[id]; if (!n || !n.rig.root.visible) { el.style.display = 'none'; continue; }
      el.style.display = '';
      const v = tmp.copy(n.pos); v.y += 2.55 * (n.rig.spec.scale ?? 1.18) / 1.18 + (n.pose === 'lounge' ? -0.3 : 0);
      v.project(cam);
      el.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
      el.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    }
    if (!talkingOnly) this.updateLife(dt, ps);
  }
  pose(n, dt, nd) {
    const r = n.rig, t = n.t;
    if (n.gesture > 0) n.gesture -= dt;
    const gest = n.gesture > 0 ? Math.sin(Math.min(1, n.gesture / 1.6) * Math.PI) : 0;
    switch (n.pose) {
      case 'lounge': {   // Gojo sprawled on the bench, arms along the backrest
        r.hips.position.y = 0.47; r.hips.rotation.x = 0;
        r.legR.rotation.set(-1.45, 0, 0.12); r.legL.rotation.set(-1.25, 0, -0.18);
        r.torso.rotation.set(-0.22, 0, 0);
        r.armR.rotation.set(-0.15, 0, 1.15); r.armL.rotation.set(-0.15, 0, -1.15);
        const wave = Math.max(gest, (t % 9) < 1.2 ? Math.sin((t % 9) / 1.2 * Math.PI) : 0);
        if (wave > 0) r.armR.rotation.set(-2.7 * wave - 0.15 * (1 - wave), 0, 1.15 * (1 - wave) + 0.25 * wave + Math.sin(t * 11) * 0.15 * wave);
        r.head.rotation.x = -0.12 + Math.sin(t * 0.7) * 0.05;
        break;
      }
      case 'doll': {     // Yaga cradling a doll, sewing now and then
        const sew = (t % 7) < 2.4 ? Math.sin(t * 9) * 0.1 : 0;
        r.armL.rotation.set(-0.95, -0.35, -0.12); r.armR.rotation.set(-0.85 + sew, 0.5, 0.25);
        r.head.rotation.x = 0.18;
        if (n.talking) { r.head.rotation.x = 0.0; }
        break;
      }
      case 'clipboard': {   // Ijichi: tablet, nervous bows, pushes up his glasses
        r.armR.rotation.set(-0.95, 0.25, 0.05);
        const bow = Math.max(gest, n.talking ? 0 : 0);
        r.torso.rotation.x = 0.5 * bow;
        const glasses = (t % 8) < 0.9 ? Math.sin((t % 8) / 0.9 * Math.PI) : 0;
        r.armL.rotation.set(-2.3 * glasses, -0.4 * glasses, -0.06 - 0.3 * glasses);
        break;
      }
      case 'wave': {     // Nitta waves at whoever walks up
        const w = Math.max(gest, n.talking && (t % 5) < 0.8 ? Math.sin((t % 5) / 0.8 * Math.PI) : 0);
        if (w > 0) r.armL.rotation.set(-2.7 * w, 0, -0.3 * w + Math.sin(t * 13) * 0.3 * w);
        break;
      }
      case 'lean': {     // Megumi, hands in pockets; a shadow sign now and then
        r.armR.rotation.set(0.15, 0, 0.22); r.armL.rotation.set(0.15, 0, -0.22);
        r.torso.rotation.z = 0.05;
        const sign = (t % 12) < 1.6 ? Math.sin((t % 12) / 1.6 * Math.PI) : 0;
        if (sign > 0) { r.armR.rotation.set(-1.25 * sign, 0.6 * sign, 0.2); r.armL.rotation.set(-1.25 * sign, -0.6 * sign, -0.2); if (Math.random() < dt * 20) this.game.particles?.smoke.emit(n.pos.x + Math.sin(n.yaw) * 0.5, n.pos.y + 1.2, n.pos.z + Math.cos(n.yaw) * 0.5, 0, 0.3, 0, 0.8, 0.04, 0.03, 0.08, 0.25, 0, 1, 1.4, 0); }
        break;
      }
      case 'watch': {    // Inumaki, arms folded
        r.armR.rotation.set(-1.2, 0.65, 0.2); r.armL.rotation.set(-1.2, -0.65, -0.2);
        if (gest > 0) { r.armR.rotation.set(-2.6 * gest - 1.2 * (1 - gest), 0.65 * (1 - gest), 0.2); }
        break;
      }
    }
  }
  // Panda and Maki trade blows, rest, and go again.
  updateSpar(dt, ps) {
    const P = this.byId.panda, M = this.byId.maki, s = this.spar, g = this.game;
    if (!P.rig.root.visible && !M.rig.root.visible) return;
    if (P.talking || M.talking) return;
    s.t += dt;
    const pair = [P, M];
    const mid = P.pos.clone().lerp(M.pos, 0.5);
    let nd = 1e9; for (const p of ps) nd = Math.min(nd, p.pos.distanceTo(mid));
    // they shuffle round a common centre
    const ang = Math.sin(this.t * 0.35) * 0.5;
    const off = 1.35 + Math.sin(this.t * 1.7) * 0.15;
    const homeP = this.L.npcs.panda.pos, homeM = this.L.npcs.maki.pos, c = homeP.clone().lerp(homeM, 0.5);
    P.pos.set(c.x - Math.cos(ang) * off, homeP.y, c.z + Math.sin(ang) * off);
    M.pos.set(c.x + Math.cos(ang) * off, homeM.y, c.z - Math.sin(ang) * off);
    for (const [a, b] of [[P, M], [M, P]]) { a.yaw = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z); a.rig.root.position.copy(a.pos); a.rig.root.rotation.y = a.yaw; }
    if (s.phase === 'rest') {
      for (const n of pair) n.rig.animate({ dt, speed: 0.18, vel: ZERO });
      if (s.t > 2.6) { s.phase = 'fight'; s.t = 0; s.count = 0; }
      return;
    }
    const dur = 0.62;
    const atk = pair[s.who], def = pair[1 - s.who];
    const k = Math.min(1, s.t / dur);
    const styles = s.who === 0 ? ['punch', 'swingR', 'swingL', 'slam'] : ['swingR', 'spin', 'swingL', 'uppercut'];
    atk.rig.animate({ dt, speed: 0, vel: ZERO, action: { type: 'attack', t: k, step: s.count, style: styles[s.count % styles.length], windup: 0.3, strike: 0.55 } });
    if (k > 0.45 && !s.hit) {
      s.hit = 1;
      if (nd < 16) {
        const at = atk.pos.clone().lerp(def.pos, 0.6); at.y += 1.2;
        g.fx?.hitSpark(at, null, { color: s.who === 0 ? 0xffffff : 0xffe0a0 });
        g.audio?.impact?.(0.25, s.who === 1 ? 'metal' : 'flesh');
      }
    }
    if (s.hit && k < 1) def.rig.animate({ dt, speed: 0, vel: ZERO, action: { type: 'hit', t: Math.min(1, (k - 0.45) / 0.4) } });
    else def.rig.animate({ dt, speed: 0.12, vel: ZERO });
    if (s.t >= dur) { s.t = 0; s.hit = 0; s.who = 1 - s.who; s.count++; if (s.count >= 6 + Math.floor(Math.random() * 3)) { s.phase = 'rest'; s.t = 0; if (nd < 14 && Math.random() < 0.6) this.bark(Math.random() < 0.5 ? P : M, Math.random() < 0.5 ? (Math.random() < 0.5 ? 'Again!' : 'Ow, my core.') : (Math.random() < 0.5 ? 'Too slow, Panda.' : 'Your guard\'s open.'), 2.4); } }
  }
  // ------------------------------------------------------------ ambient life
  buildLife() {
    const g = this.game, L = this.L;
    // the cat: wanders between the dorm, the courtyard and the pavilion
    this.cat = HubNpcs.catMesh ??= buildCat();
    const c0 = L.spots?.dormitory ?? L.spawn;
    this.catS = { pos: c0.clone().add(tmp.set(2, 0, -3)), yaw: 0, target: null, wait: 2, petT: 0, sit: 0 };
    this.cat.position.copy(this.catS.pos);
    g.scene.add(this.cat); (g.hubProps ??= []).push(this.cat);
    this.catPoints = [L.spots?.dormitory, L.spots?.courtyard, L.spots?.vending, L.spots?.mapTable, L.spots?.gate, L.spots?.mainHall].filter(Boolean).map((v) => v.clone());
    g.interactables.push({ id: 'cat', pos: this.catS.pos, radius: 1.5, label: 'Pet the cat', action: () => this.petCat(), enabled: () => !g.dialogue?.active && this.catS.petT <= 0 });
    // birds circling over the campus
    if (!HubNpcs.birds) {
      const geo = new THREE.BufferGeometry();
      const v = [0, 0, 0.2, -0.55, 0.12, -0.05, 0, 0, -0.15, 0, 0, 0.2, 0, 0, -0.15, 0.55, 0.12, -0.05];
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
      const birds = new THREE.InstancedMesh(geo, new THREE.MeshStandardNodeMaterial({ color: 0x222028, side: THREE.DoubleSide, roughness: 1 }), 9);
      birds.frustumCulled = false; birds.castShadow = false;
      HubNpcs.birds = birds;
    }
    this.birds = HubNpcs.birds;
    const bc = L.spots?.courtyard ?? new THREE.Vector3(64, 14, 60);
    this.birdY = bc.y;
    this.birdS = Array.from({ length: this.birds.count }, (_, i) => ({ r: 22 + Math.random() * 22, h: 16 + Math.random() * 10, sp: (0.12 + Math.random() * 0.1) * (i % 3 === 0 ? -1 : 1), ph: Math.random() * Math.PI * 2, fl: Math.random() * 10, cx: bc.x + (Math.random() - 0.5) * 30, cz: bc.z - 8 + (Math.random() - 0.5) * 30 }));
    g.scene.add(this.birds); g.hubProps.push(this.birds);
    // koi
    if (L.pond) {
      if (!HubNpcs.koi) {
        const koi = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.1, 0.2), new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: 0.35 }), 7);
        const cols = [0xff6a1a, 0xffffff, 0xff8a2a, 0xf0d040, 0xff4a2a, 0xffffff, 0xff9a4a];
        cols.forEach((c, i) => koi.setColorAt(i, new THREE.Color(c)));
        koi.frustumCulled = false;
        HubNpcs.koi = koi;
      }
      this.koi = HubNpcs.koi;
      this.koiS = Array.from({ length: this.koi.count }, () => ({ a: Math.random() * Math.PI * 2, r: 0.35 + Math.random() * 0.55, sp: (0.15 + Math.random() * 0.2) * (Math.random() < 0.5 ? -1 : 1), wob: Math.random() * 6 }));
      g.scene.add(this.koi); g.hubProps.push(this.koi);
    }
    this.petalT = 0;
    // two of Yaga's cursed corpses toddle up and down the office porch
    this.dolls = [];
    const off = L.spots?.office;
    if (off) {
      HubNpcs.dollMeshes ??= [0xc8a070, 0xe8b0c0].map((col) => {
        const P = new Props(9), d = new THREE.Color(col).multiplyScalar(0.7).getHex();
        P.box(0, 0.08, 0, 0.3, 0.28, 0.24, col); P.box(0, 0.36, 0, 0.34, 0.3, 0.3, col);
        P.box(-0.12, 0.66, 0, 0.1, 0.1, 0.06, d); P.box(0.12, 0.66, 0, 0.1, 0.1, 0.06, d);
        P.box(-0.07, 0.5, 0.155, 0.05, 0.05, 0.02, 0x101010, { vary: 0 }); P.box(0.07, 0.5, 0.155, 0.05, 0.05, 0.02, 0x101010, { vary: 0 });
        P.box(-0.1, 0, 0, 0.09, 0.08, 0.1, d); P.box(0.1, 0, 0, 0.09, 0.08, 0.1, d);
        return P.build();
      });
      HubNpcs.dollMeshes.forEach((m, i) => {
        const x0 = off.x - 4 + i * 4.5;
        this.dolls.push({ m, x0, x1: x0 + 3.5, z: off.z - 2.2 + i * 0.3, y: off.y, t: i * 1.7, dir: 1 });
        g.scene.add(m); g.hubProps.push(m);
      });
    }
  }
  petCat() {
    const g = this.game, s = this.catS;
    s.petT = 2.2; s.sit = 2.2; s.target = null;
    const p = s.pos.clone(); p.y += 0.9;
    g.particles?.burst(p, { count: 8, color: 0xff7ab0, speed: 1.2, up: 2.5, life: 1.1, size: 0.18, drag: 2, gravity: -1 });
    g.audio?.tone?.({ freq: 820, to: 1250, dur: 0.18, gain: 0.05, type: 'triangle' });
    g.audio?.tone?.({ freq: 1250, to: 700, dur: 0.3, gain: 0.05, type: 'triangle', at: 0.16 });
    const fake = { id: 'cat', pos: s.pos, def: { color: '#ffb0d0' }, rig: { root: this.cat, spec: { scale: 0.5 } }, pose: 'cat' };
    this.byId.cat = fake;
    this.bark(fake, ['Mrrp.', 'Nyaa~', 'Purrr...', '*slow blink*'][Math.floor(Math.random() * 4)], 2);
  }
  updateLife(dt, ps) {
    const g = this.game, s = this.catS, W = g.world;
    // ---- cat
    if (this.cat && s) {
      const P = this.cat.userData.parts;
      s.petT -= dt;
      let moving = false;
      if (s.sit > 0) s.sit -= dt;
      else if (!s.target) { s.wait -= dt; if (s.wait <= 0) { const pick = this.catPoints[Math.floor(Math.random() * this.catPoints.length)]; s.target = pick.clone().add(tmp.set((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)); } }
      else {
        const dx = s.target.x - s.pos.x, dz = s.target.z - s.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.4) { s.target = null; s.wait = 3 + Math.random() * 6; if (Math.random() < 0.4) s.sit = 4 + Math.random() * 5; }
        else {
          const want = Math.atan2(dx, dz); s.yaw = dampAngle(s.yaw, want, 5, dt);
          const sp = 1.3 * dt, nx = s.pos.x + Math.sin(s.yaw) * sp, nz = s.pos.z + Math.cos(s.yaw) * sp;
          const gy = W.standY(nx, nz, s.pos.y, 1);
          if (isFinite(gy) && Math.abs(gy - s.pos.y) <= 1.01 && !W.liquidAt(nx, gy + 0.2, nz)) { s.pos.x = nx; s.pos.z = nz; s.pos.y += (gy - s.pos.y) * Math.min(1, dt * 12); moving = true; }
          else { s.target = null; s.wait = 1; }
        }
      }
      // look at a nearby player while sitting
      const near = ps.find((p) => p.pos.distanceTo(s.pos) < 3);
      if (!moving && near) s.yaw = dampAngle(s.yaw, Math.atan2(near.pos.x - s.pos.x, near.pos.z - s.pos.z), 3, dt);
      this.cat.position.copy(s.pos); this.cat.rotation.y = s.yaw;
      const tt = this.t * 9;
      P.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(tt + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.6 : 0; l.visible = true; });
      const sitK = s.sit > 0 && !moving ? 1 : 0;
      P.body.rotation.x = -0.35 * sitK; P.body.position.y = 0.32 - 0.04 * sitK;
      P.legs[2].rotation.x = P.legs[3].rotation.x = moving ? P.legs[2].rotation.x : -1.2 * sitK;
      P.tail.rotation.set(-0.5 - Math.sin(this.t * 2.2) * 0.25, Math.sin(this.t * 1.3) * 0.5, 0);
      P.head.rotation.y = Math.sin(this.t * 0.6) * 0.3 * (1 - (near ? 1 : 0));
      const fakeCat = this.byId.cat; if (fakeCat) fakeCat.pos = s.pos;
    }
    // ---- cursed dolls on the porch
    for (const d of this.dolls ?? []) {
      d.t += dt;
      const span = d.x1 - d.x0, ph = (d.t * 0.35) % 2, k = ph < 1 ? ph : 2 - ph;
      const x = d.x0 + span * k, hop = Math.abs(Math.sin(d.t * 7)) * 0.12;
      d.m.position.set(x, d.y + hop, d.z); d.m.rotation.set(0, ph < 1 ? Math.PI / 2 : -Math.PI / 2, Math.sin(d.t * 7) * 0.12);
    }
    // ---- birds
    if (this.birds) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
      this.birdS.forEach((b, i) => {
        b.ph += b.sp * dt; b.fl += dt * (7 + (i % 3));
        const x = b.cx + Math.cos(b.ph) * b.r, z = b.cz + Math.sin(b.ph) * b.r, y = (this.birdY ?? 14) + b.h + Math.sin(b.ph * 3) * 1.2;
        p.set(x, y, z);
        e.set(0, -b.ph + (b.sp > 0 ? 0 : Math.PI), Math.sin(b.ph * 2) * 0.2); q.setFromEuler(e);
        const flap = 0.55 + Math.abs(Math.sin(b.fl)) * 0.6;
        sc.set(flap * 1.1, 1 + Math.sin(b.fl) * 0.8, 1.1);
        m.compose(p, q, sc); this.birds.setMatrixAt(i, m);
      });
      this.birds.instanceMatrix.needsUpdate = true;
    }
    // ---- koi
    if (this.koi && this.L.pond) {
      const pd = this.L.pond, m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), e = new THREE.Euler();
      this.koiS.forEach((f, i) => {
        f.a += f.sp * dt; f.wob += dt * 6;
        const x = pd.cx + Math.cos(f.a) * pd.rx * f.r, z = pd.cz + Math.sin(f.a) * pd.rz * f.r;
        if (Math.abs(z - (pd.bridgeZ ?? 27.5)) < 2.2 && Math.abs(x - pd.cx) < 9) { p.set(x, -50, z); }   // hidden under the bridge
        else p.set(x, pd.y + 0.12, z);
        const dir = f.sp > 0 ? 1 : -1;
        const vx = -Math.sin(f.a) * pd.rx * dir, vz = Math.cos(f.a) * pd.rz * dir;
        e.set(0, Math.atan2(-vz, vx) + Math.sin(f.wob) * 0.15, 0); q.setFromEuler(e);
        m.compose(p, q, sc); this.koi.setMatrixAt(i, m);
      });
      this.koi.instanceMatrix.needsUpdate = true;
    }
    // ---- sakura petals drifting on the wind
    const part = g.particles;
    if (part && g.state !== 'loading') {
      this.petalT += dt * 7 * (part.budget ?? 1);
      const f = g.rig?.focus ?? ZERO;
      while (this.petalT > 1) {
        this.petalT -= 1;
        const x = f.x + (Math.random() - 0.5) * 34, z = f.z + (Math.random() - 0.5) * 30, y = f.y + 4 + Math.random() * 5;
        const pink = 0.85 + Math.random() * 0.15;
        part.smoke.emit(x, y, z, 0.5 + Math.random() * 0.4, -0.55 - Math.random() * 0.3, 0.25 + Math.random() * 0.3, 6 + Math.random() * 3, 1.0 * pink, 0.68 * pink, 0.78 * pink, 0.085, 0, 0.05, 0.9, 1);
      }
    }
  }
  dispose() { this.hideBubbles(); }
}

// ---------------------------------------------------------------- quest marks (! and ?)
function markTexture(ch) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96;
  const c = cv.getContext('2d');
  c.font = 'bold 84px "Pixelify Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 10; c.strokeStyle = '#3a1a5a'; c.strokeText(ch, 32, 52);
  c.fillStyle = ch === '!' ? '#ffd84a' : '#7ae0ff'; c.fillText(ch, 32, 52);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const MARK_MATS = {};
function markMesh(ch) {
  MARK_MATS[ch] ??= new THREE.MeshBasicNodeMaterial({ map: markTexture(ch), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.93), MARK_MATS[ch]);
  m.renderOrder = 6; m.castShadow = false; m.frustumCulled = false;
  return m;
}

// ---------------------------------------------------------------- region people
const LOOK_FALLBACK = 'npc_civ_2';
export class RegionNpcs {
  // posts: L.people plus quest NPC posts (game.quests.npcPosts(L))
  constructor(game, L, extra = []) {
    this.game = game; this.L = L; this.list = []; this.byId = {}; this.t = 0;
    this.bubbles = new Map();
    for (const p of [...(L.people ?? []), ...extra]) { try { this.add(p); } catch (e) { console.warn('npc', p.id, e); } }
    this.refreshMarks();
  }
  has(id) { return !!this.byId[id]; }
  posOf(id) { return this.byId[id]?.pos.clone() ?? null; }
  makeRig(look) { return buildSorcererModel(SORCERERS[look] || look?.startsWith?.('npc_') ? look : LOOK_FALLBACK); }
  add(p) {
    if (!p?.id || this.byId[p.id] || !p.pos) return null;
    const g = this.game;
    const rig = this.makeRig(p.look ?? LOOK_FALLBACK);
    const n = { ...p, rig, pos: p.pos.clone(), home: p.pos.clone(), yaw: p.yaw ?? 0, baseYaw: p.yaw ?? 0, headYaw: 0, t: Math.random() * 10, talkI: 0, target: null, wait: 1 + Math.random() * 3, mark: null, markCh: null };
    rig.root.position.copy(n.pos); rig.root.rotation.set(0, n.yaw, 0);
    g.scene.add(rig.root); (g.hubProps ??= []).push(rig.root);
    g.dialogue?.speaker(p.id, { name: p.name ?? p.id, color: p.color ?? '#c8b8ff', voice: p.voice ?? 1, rig });
    this.list.push(n); this.byId[p.id] = n;
    g.interactables.push({ id: 'npc-' + p.id, pos: n.pos, radius: 2.2, label: `Talk to ${p.name ?? p.id}`, action: () => this.talk(n), enabled: () => n.rig.root.visible && !g.dialogue?.active });
    return n;
  }
  talk(n) {
    const g = this.game;
    n.talking = true;
    const end = () => { n.talking = false; this.refreshMarks(); };
    if (g.quests?.onTalk(n.id)) { const chk = () => { if (g.dialogue?.active) { setTimeout(chk, 200); return; } end(); }; setTimeout(chk, 200); return; }
    const sets = n.lines?.length ? n.lines : [['…']];
    const set = typeof sets === 'function' ? sets(g) : sets[n.talkI++ % sets.length];
    g.dialogue?.say(n.id, set, { onEnd: end });
  }
  // gold ! over people with a new quest, blue ? over people a quest step wants (Jujutsu High residents too)
  refreshMarks() {
    const q = this.game.quests;
    const all = [...this.list, ...(this.game.hubNpcs?.list ?? [])];
    for (const n of all) {
      const ch = q?.npcMark?.(n.id) ?? null;
      if (ch === n.markCh) continue;
      if (n.mark) { n.mark.parent?.remove(n.mark); n.mark = null; }
      n.markCh = ch;
      if (ch) { n.mark = markMesh(ch); this.game.scene.add(n.mark); (this.game.hubProps ??= []).push(n.mark); }
    }
  }
  update(dt) {
    const g = this.game; this.t += dt;
    const focus = g.rig?.focus ?? ZERO, ps = g.players.filter((p) => !p.dead), W = g.world, cam = g.rig?.camera;
    for (const n of this.list) {
      const r = n.rig;
      const far = Math.hypot(n.pos.x - focus.x, n.pos.z - focus.z) > 64;
      r.root.visible = !far;
      if (n.mark) n.mark.visible = !far;
      if (far) continue;
      n.t += dt;
      let near = null, nd = 1e9;
      for (const p of ps) { const d = Math.hypot(p.pos.x - n.pos.x, p.pos.z - n.pos.z); if (d < nd) { nd = d; near = p; } }
      let speed = 0;
      if (n.pose === 'wander' && !n.talking && !(near && nd < 3.5)) {
        if (!n.target) { n.wait -= dt; if (n.wait <= 0) { const a = Math.random() * Math.PI * 2, d = Math.random() * (n.wander ?? 5); n.target = n.home.clone().add(tmp.set(Math.cos(a) * d, 0, Math.sin(a) * d)); } }
        else {
          const dx = n.target.x - n.pos.x, dz = n.target.z - n.pos.z, d = Math.hypot(dx, dz);
          if (d < 0.3) { n.target = null; n.wait = 2 + Math.random() * 5; }
          else {
            n.yaw = dampAngle(n.yaw, Math.atan2(dx, dz), 6, dt);
            const sp = 1.6 * dt, nx = n.pos.x + Math.sin(n.yaw) * sp, nz = n.pos.z + Math.cos(n.yaw) * sp;
            const gy = W.standY(nx, nz, n.pos.y, 1);
            if (isFinite(gy) && Math.abs(gy - n.pos.y) <= 1.01 && !W.liquidAt(nx, gy + 0.2, nz)) { n.pos.x = nx; n.pos.z = nz; n.pos.y += (gy - n.pos.y) * Math.min(1, dt * 12); speed = 1.6; }
            else { n.target = null; n.wait = 1; }
          }
        }
      } else if (near && (nd < 5 || n.talking)) n.yaw = dampAngle(n.yaw, Math.atan2(near.pos.x - n.pos.x, near.pos.z - n.pos.z), n.talking ? 6 : 3, dt);
      else n.yaw = dampAngle(n.yaw, n.baseYaw, 1.5, dt);
      r.root.position.copy(n.pos); r.root.rotation.y = n.yaw;
      r.animate({ dt, speed, vel: speed ? tmp.set(Math.sin(n.yaw) * speed, 0, Math.cos(n.yaw) * speed) : ZERO });
      if (n.pose === 'wave' && !speed) { const w = Math.max(0, Math.sin(n.t * 0.7)); r.armR.rotation.set(-2.7 * w, 0, 0.3 * w + Math.sin(n.t * 12) * 0.25 * w); }
      if (n.pose === 'sit' && !speed) { r.legR.rotation.x = -1.45; r.legL.rotation.x = -1.45; }
    }
    // marks bob over heads and face the camera
    const all = [...this.list, ...(g.hubNpcs?.list ?? [])];
    for (const n of all) {
      if (!n.mark) continue;
      const sc = (n.rig.spec?.scale ?? 1.18) / 1.18;
      n.mark.position.set(n.pos.x, n.pos.y + 2.9 * sc + Math.sin(this.t * 3 + n.pos.x) * 0.12, n.pos.z);
      if (cam) n.mark.quaternion.copy(cam.quaternion);
      n.mark.visible = n.rig.root.visible;
    }
  }
  dispose() { for (const n of this.list) n.mark?.parent?.remove(n.mark); }
}
