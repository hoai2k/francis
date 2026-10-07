// Classmates: eight friends across the four houses plus a Slytherin rival. Each has a
// personality, a home town, a friendship meter, favourite gifts, a spell they can teach
// and the spells they use as a combat companion.
import { G } from './state.js';
import { SKIN_TONES } from './models.js';

export const FRIENDS = {
  pip: { name: 'Pip Fenwick', short: 'Pip', house: 'hufflepuff', home: 'Little Sowerby, Somerset', voice: 'high', color: '#ffb0d0',
    personality: 'Cheerful, chatty and obsessed with Chocolate Frog cards.', likes: ['frog', 'cake'], teaches: 'episkey', spells: ['stupefy', 'episkey'],
    look: { house: 'hufflepuff', hairStyle: 'bun', hairColor: '#b5682a', skin: SKIN_TONES[1], scale: 0.92 } },
  oren: { name: 'Oren Achterberg', short: 'Oren', house: 'ravenclaw', home: 'Whitby, Yorkshire', voice: 'mid', color: '#8ab8ff',
    personality: 'Bookish and dry-witted; knows every star by name.', likes: ['book', 'liquorice'], teaches: 'glacius', spells: ['glacius', 'stupefy'],
    look: { house: 'ravenclaw', hairStyle: 'messy', hairColor: '#1b1210', glasses: true, skin: SKIN_TONES[0], scale: 0.95 } },
  tamsin: { name: 'Tamsin Hollowell', short: 'Tamsin', house: 'gryffindor', home: 'Cardiff', voice: 'mid', color: '#ff9a6a',
    personality: 'Bold and loud; a born Beater who never backs down.', likes: ['pasty', 'broom'], teaches: 'confringo', spells: ['incendio', 'confringo'],
    look: { house: 'gryffindor', hairStyle: 'ponytail', hairColor: '#a8322a', skin: SKIN_TONES[1], scale: 0.97 } },
  kofi: { name: 'Kofi Mensah-Lowe', short: 'Kofi', house: 'gryffindor', home: 'Brixton, London', voice: 'mid', color: '#ffd27a',
    personality: 'The class joker; dreams of opening a joke shop.', likes: ['joke', 'beans'], teaches: 'rictusempra', spells: ['rictusempra', 'flipendo'],
    look: { house: 'gryffindor', hairStyle: 'curly', hairColor: '#1b1210', skin: SKIN_TONES[4], scale: 1.0 } },
  isolde: { name: 'Isolde Varga', short: 'Isolde', house: 'slytherin', home: 'Bath (by way of Budapest)', voice: 'mid', color: '#7fd0a0',
    personality: 'Ambitious, precise, a gifted potioneer with a kind streak she hides.', likes: ['potion', 'cake'], teaches: 'diffindo', spells: ['diffindo', 'expelliarmus'],
    look: { house: 'slytherin', hairStyle: 'long', hairColor: '#1b1210', skin: SKIN_TONES[2], scale: 0.95 } },
  ruairi: { name: 'Ruairí Doyle', short: 'Ruairí', house: 'hufflepuff', home: 'Galway', voice: 'low', color: '#e0b080',
    personality: 'A gentle giant who would rather be with the creatures.', likes: ['pasty', 'creature'], teaches: 'depulso', spells: ['depulso', 'ventus'],
    look: { house: 'hufflepuff', hairStyle: 'short', hairColor: '#d9b26a', skin: SKIN_TONES[0], scale: 1.12 } },
  mei: { name: 'Mei Lin Chau', short: 'Mei', house: 'ravenclaw', home: 'Manchester', voice: 'high', color: '#c9a0ff',
    personality: 'A competitive duelling prodigy who hates to lose.', likes: ['book', 'frog'], teaches: 'arresto', spells: ['stupefy', 'expelliarmus'],
    look: { house: 'ravenclaw', hairStyle: 'bun', hairColor: '#1b1210', skin: SKIN_TONES[1], scale: 0.9 } },
  bram: { name: 'Bram Okonkwo-Hale', short: 'Bram', house: 'slytherin', home: 'Edinburgh', voice: 'low', color: '#9fe08a',
    personality: 'Quiet, loyal and a brilliant Herbology student.', likes: ['plant', 'liquorice'], teaches: 'aguamenti', spells: ['aguamenti', 'petrificus'],
    look: { house: 'slytherin', hairStyle: 'short', hairColor: '#1b1210', skin: SKIN_TONES[5], scale: 1.05 } },
  cassius: { name: 'Cassius Vane', short: 'Cassius', house: 'slytherin', home: 'Vane Hall, Wiltshire', voice: 'mid', color: '#c4c9cf', rival: true,
    personality: 'Your rival: proud, sharp-tongued and desperate to live up to his father.', likes: ['broom', 'book'], teaches: 'levicorpus', spells: ['stupefy', 'levicorpus'],
    look: { house: 'slytherin', hairStyle: 'short', hairColor: '#e8dcc0', skin: SKIN_TONES[0], scale: 1.0 } },
};
export const FRIEND_IDS = Object.keys(FRIENDS);

export function friendship(id) { return G.save?.friends?.[id]?.f || 0; }
export function friendLevel(id) { const f = friendship(id); return f >= 80 ? 4 : f >= 55 ? 3 : f >= 30 ? 2 : f >= 10 ? 1 : 0; }
export const FRIEND_LEVELS = ['Stranger', 'Acquaintance', 'Friend', 'Good friend', 'Best friend'];
export function meet(id) {
  const s = G.save;
  s.friends ||= {};
  if (!s.friends[id]) s.friends[id] = { f: FRIENDS[id].rival ? 0 : 5, met: true, talkDay: -1, gifts: 0 };
  return s.friends[id];
}

// ------------------------------------------------------------------ friendship over time
import * as THREE from 'three';
import { SPELL_BY_ID } from './spelldata.js';
import { ITEMS, itemCount, addItem } from './items.js';
import { groundHeight, PLATEAU, SPOTS } from './world/terrain.js';
import { addXP } from './progress.js';
import { writeSave } from './save.js';
import { pick } from './util.js';

const dayKey = () => `${G.save.year}-${G.save.yq || 0}-${G.save.flags?.[`y${G.save.year}`]?.step || 0}-${G.save.stage}-${Math.floor((G.save.playTime || 0) / 600)}`;

export function addFriendship(id, n, quiet) {
  const f = meet(id);
  const before = friendLevel(id);
  f.f = Math.max(0, Math.min(100, f.f + n));
  const after = friendLevel(id);
  if (!quiet && n > 0) G.ui.floatText(G.player.pos.clone().setY(G.player.pos.y + 2.3), `♥ ${FRIENDS[id].short} +${n}`, 'heal');
  if (after > before) onLevelUp(id, after);
  writeSave();
}
async function onLevelUp(id, L) {
  const F = FRIENDS[id];
  G.ui.banner(`${F.short} is now your ${FRIEND_LEVELS[L].toLowerCase()}`, L === 2 ? `${F.short} can now join you as a companion (Friends menu or talk to them).` : L === 3 ? `${F.short} wants to teach you something…` : L === 4 ? 'Best friends — through everything.' : '', 'unlock');
  G.audio.sfx('unlock');
  addXP(60 * L);
}
// where friends spend their free time
export function hangout(id) {
  const Z = G.world.zones;
  const g = (x, z) => new THREE.Vector3(x, groundHeight(x, z), z);
  return {
    pip: ['grounds', new THREE.Vector3(6, PLATEAU, 6), -2.4],
    oren: ['corridor', Z.corridor.W(-8, 0, -98), 0.5],
    tamsin: ['grounds', g(SPOTS.pitch.x + 10, SPOTS.pitch.z + 28), Math.PI],
    kofi: ['greatHall', Z.greatHall.W(-6, 0, 30), Math.PI],
    isolde: ['dungeon', Z.dungeon.W(8, 0, -22), -1.2],
    ruairi: ['grounds', g(SPOTS.paddock.x - 12, SPOTS.paddock.z + 10), 1.4],
    mei: ['grounds', new THREE.Vector3(-14, PLATEAU, 8), 2.2],
    bram: ['grounds', new THREE.Vector3(-22, PLATEAU, -6), 1.0],
    cassius: ['grounds', new THREE.Vector3(12, PLATEAU, -2), -1.2],
  }[id];
}
export function placeFriends() {
  const st = this?.placeNPC ? this : G.story;
  if (!st) return;
  if (!G.save.house || st.journeyQuest) return;
  for (const id of FRIEND_IDS) {
    if (G.companion?.id === id) { st.hideNPC(id); continue; }
    const h = hangout(id);
    if (h) st.placeNPC(id, h[0], h[1], h[2]);
  }
}

const GREET = {
  pip: ['Hiya! Did you see — no, of course you didn’t. Guess what card I got!', 'Want a bean? It might be toffee. It might be bogey.', 'I wrote to my gran about you. All good things!'],
  oren: ['Did you know Jupiter has more moons than the castle has staircases? Probably.', 'I’ve found a book in the Restricted Section… I mean, I’ve heard of one.', 'Hello. I was just thinking about you. About your spellwork. Nothing weird.'],
  tamsin: ['Oi! Fancy a race to the lake?', 'If I don’t make the house team this year I’m eating my broom.', 'Wands up, champion!'],
  kofi: ['Knock knock. …You’re supposed to say who’s there.', 'Don’t eat anything I give you today. Trust me.', 'Life tip: never prank a Slytherin before breakfast.'],
  isolde: ['You again. …I’m glad, actually. Don’t tell anyone.', 'Vexley gave me an Outstanding. I may frame it.', 'Ambition isn’t a dirty word, you know.'],
  ruairi: ['Shh — there’s a Bowtruckle in that tree. Look!', 'Brannoc lets me feed the Thestrals. You can’t see them? Ah.', 'Grand day for it, isn’t it?'],
  mei: ['Practice duel later? I’ll go easy. I won’t, actually.', 'I timed your Stupefy last week. You’re getting faster.', 'Losing is just research.'],
  bram: ['…Hello.', 'The Mandrakes are teething. Bring earmuffs.', 'I saved you a seat in Herbology. Again.'],
  cassius: ['What do you want.', 'Don’t stand so close, people will talk.', 'My father says— never mind what my father says.'],
};
const GIFT_LINES = { love: ['For me? You remembered!', 'This is perfect. Actually perfect.', 'How did you know?!'], ok: ['Oh — thanks!', 'That’s kind of you.', 'I’ll put it somewhere safe.'], meh: ['…Thanks, I suppose.', 'Er. Interesting.', 'I’ll find a use for it. Probably.'] };

export async function friendTalk(id) {
  const st = G.story;
  const F = FRIENDS[id];
  const fr = meet(id);
  const first = !fr.introduced;
  const L = friendLevel(id);
  const sp = st.speaker(id);
  if (first) {
    fr.introduced = true;
    await st.talk(id, [`I’m ${F.name}. ${F.house[0].toUpperCase() + F.house.slice(1)}, from ${F.home}.`, F.personality.replace(/^Your rival: /, '')]);
    addFriendship(id, 2, true);
  }
  const isComp = G.companion?.id === id;
  const canJoin = L >= 2 && (!F.rival || G.save.year >= 6);
  const choices = ['Chat', 'Give a gift', 'Study together', isComp ? 'Part ways for now' : canJoin ? 'Come with me' : null, 'Goodbye'].filter(Boolean);
  const c = await st.talk(id, [{ ...sp, text: `${pick(GREET[id] || ['Hello.'])}  (${FRIEND_LEVELS[L]} · ${fr.f}/100)`, choices }]);
  const pickd = choices[c];
  const today = dayKey();
  if (pickd === 'Chat') {
    const lines = chatLines(id, L);
    await st.talk(id, lines);
    if (fr.talkDay !== today) { fr.talkDay = today; addFriendship(id, 3); }
  } else if (pickd === 'Give a gift') await giveGift(id);
  else if (pickd === 'Study together') {
    if (fr.studyDay === today) { await st.talk(id, ['We already studied today. My brain is full.']); return; }
    fr.studyDay = today;
    await G.ui.fade(1, 0.4);
    G.ui.toast(`You study with ${F.short} for an hour…`, 'info');
    await new Promise((r) => setTimeout(r, 700));
    await G.ui.fade(0, 0.4);
    addXP(40 + G.save.year * 10, 'Study session');
    addFriendship(id, 5);
  } else if (pickd === 'Come with me') {
    const { setCompanion } = await import('./friendsCompanion.js');
    setCompanion(id);
    await st.talk(id, [pick(['Brilliant, let’s go!', 'Lead the way.', 'Right behind you.', 'Try to keep up.'])]);
  } else if (pickd === 'Part ways for now') {
    const { setCompanion } = await import('./friendsCompanion.js');
    setCompanion(null);
    await st.talk(id, ['See you around!']);
  }
  // reward: a friend teaches you their spell
  if (friendLevel(id) >= 3 && F.teaches && !G.spells.unlocked.has(F.teaches) && SPELL_BY_ID[F.teaches] && (SPELL_BY_ID[F.teaches].year || 1) <= G.save.year + 1) {
    await st.talk(id, [`You know what? I’ve been practising something. Let me teach you ${SPELL_BY_ID[F.teaches].name}.`]);
    G.spells.unlock(F.teaches);
  }
}
function chatLines(id, L) {
  const F = FRIENDS[id];
  const y = G.save.year;
  const deep = {
    pip: ['My gran raised me. She runs the post office in Little Sowerby and knows everyone’s business.', 'Sometimes I think I collect cards because they never leave.'],
    oren: ['My sister’s a Muggle. A proper astrophysicist. She thinks I’m at a boarding school for maths.', 'I like you because you never make me feel like I talk too much. Even though I do.'],
    tamsin: ['My mam played Beater for the Holyhead Harpies. Two seasons. I’ve got her bat.', 'Truth is I get scared before every match. Being loud helps.'],
    kofi: ['My uncle had a joke shop in Diagon Alley. Lost it in a fire. I’m going to open a better one.', 'Being funny means nobody asks how you’re really doing. Clever, eh?'],
    isolde: ['My parents expect me to be Minister by thirty. No pressure.', 'Everyone assumes Slytherins are cruel. Some of us just want to be very, very good at things.'],
    ruairi: ['Back home I raised a Kneazle from a kitten. She sends me letters. Well — her claw prints.', 'People think big means brave. I’m not. I just don’t like seeing things get hurt.'],
    mei: ['My dad was a duelling champion. He doesn’t say “well done”. He says “again”.', 'You’re the only one who beats me sometimes. I hate it. I also like it.'],
    bram: ['Plants don’t interrupt. That’s why I like them. …You don’t interrupt either.', 'My grandfather fought in the last war against the dark wizards. He doesn’t talk about it.'],
    cassius: ['My father has never once said he was proud of me.', 'If the Hollow King comes back… my family will have to choose. I don’t know what we’ll choose.'],
  }[id];
  const basic = [`${F.personality}`, y >= 3 ? 'Can you believe how fast the years are going?' : 'I’m still getting lost on the staircases.'];
  return L >= 2 && deep ? [pick(deep)] : [pick(basic)];
}
async function giveGift(id) {
  const st = G.story;
  const F = FRIENDS[id];
  const fr = meet(id);
  const owned = Object.keys(G.save.items || {}).filter((k) => ITEMS[k] && itemCount(k) > 0);
  if (!owned.length) { await st.talk(id, ['(You have nothing to give. Sweets from the trolley or Hogsmeade make good gifts.)']); return; }
  const c = await st.talk(id, [{ ...st.speaker(id), text: 'Oh? What have you got?', choices: [...owned.map((k) => `${ITEMS[k].icon} ${ITEMS[k].short} (×${itemCount(k)})`), 'Never mind'] }]);
  if (c == null || c >= owned.length) return;
  const k = owned[c];
  const it = ITEMS[k];
  addItem(k, -1);
  const today = dayKey();
  const again = fr.giftDay === today;
  fr.giftDay = today;
  fr.gifts = (fr.gifts || 0) + 1;
  const love = it.tags.some((t) => F.likes.includes(t));
  const ok = love || it.tags.includes('sweet');
  await st.talk(id, [pick(GIFT_LINES[love ? 'love' : ok ? 'ok' : 'meh'])]);
  addFriendship(id, Math.round((love ? 14 : ok ? 6 : 2) * (again ? 0.4 : 1)));
}
