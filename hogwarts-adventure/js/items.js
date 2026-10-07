// Sweets, gifts and found items. Bought from the trolley or shops, found in the world,
// eaten for small boosts or given to friends.
import { G } from './state.js';
import { pick } from './util.js';

export const ITEMS = {
  beans: { name: "Bertie Bott's Every Flavour Beans", short: 'Beans', icon: '🫘', price: 3, tags: ['beans', 'sweet'], eat: 'heal 8 (flavour not guaranteed)' },
  frog: { name: 'Chocolate Frog', short: 'Chocolate Frog', icon: '🐸', price: 5, tags: ['frog', 'sweet'], eat: 'heal 15 · may contain a rare card' },
  pasty: { name: 'Pumpkin Pasty', short: 'Pumpkin Pasty', icon: '🥧', price: 4, tags: ['pasty', 'sweet'], eat: 'heal 30' },
  cake: { name: 'Cauldron Cake', short: 'Cauldron Cake', icon: '🧁', price: 4, tags: ['cake', 'sweet'], eat: '+40 magic, heal 10' },
  liquorice: { name: 'Liquorice Wand', short: 'Liquorice Wand', icon: '🍬', price: 2, tags: ['liquorice', 'sweet'], eat: 'Swiftness for 30 s' },
  fizz: { name: 'Fizzing Whizzbee', short: 'Whizzbee', icon: '🐝', price: 3, tags: ['sweet', 'joke'], eat: 'float a little higher… briefly' },
  mead: { name: 'Hot Honeymead', short: 'Honeymead', icon: '🍯', price: 3, tags: ['sweet', 'pasty'], eat: 'heal 40, warms you through' },
  scone: { name: 'Scone with jam', short: 'Scone', icon: '🫓', price: 3, tags: ['sweet', 'cake'], eat: 'heal 25' },
  // gifts and found items
  book: { name: 'Second-hand spellbook', short: 'Old book', icon: '📕', price: 8, tags: ['book'], gift: true },
  plant: { name: 'Potted Puffapod', short: 'Puffapod', icon: '🪴', price: 7, tags: ['plant'], gift: true },
  joke: { name: 'Dungbomb', short: 'Dungbomb', icon: '💩', price: 4, tags: ['joke'], gift: true },
  potion: { name: 'Phial of Pepperup', short: 'Pepperup', icon: '🧪', price: 9, tags: ['potion'], eat: 'heal 50', gift: true },
  creature: { name: 'Bag of Owl Treats', short: 'Owl treats', icon: '🦉', price: 5, tags: ['creature'], gift: true },
  polish: { name: 'Broomstick polish', short: 'Broom polish', icon: '🧹', price: 10, tags: ['broom'], gift: true },
  feather: { name: 'Hippogriff feather', short: 'Feather', icon: '🪶', price: 0, tags: ['creature', 'book'], gift: true },
  egg: { name: 'Golden egg', short: 'Golden egg', icon: '🥚', price: 0, tags: [], gift: false },
  orb: { name: 'Prophecy orb', short: 'Prophecy', icon: '🔮', price: 0, tags: [], gift: false },
  locket: { name: 'Heavy gold locket', short: 'Locket', icon: '📿', price: 0, tags: [], gift: false },
  fang: { name: 'Wyrm fang', short: 'Wyrm fang', icon: '🦷', price: 0, tags: [], gift: false },
  circlet: { name: 'Silver circlet', short: 'Circlet', icon: '👑', price: 0, tags: [], gift: false },
  shell: { name: 'Lake shell', short: 'Shell', icon: '🐚', price: 0, tags: ['creature', 'plant'], gift: true },
};
export const SHOPS = {
  trolley: { title: 'The Trolley', sub: 'Mrs Pennywhistle’s sweets trolley', items: ['frog', 'beans', 'pasty', 'cake', 'liquorice'] },
  sweetshop: { title: 'Honeydew’s Sweet Shop', sub: 'Hogsmeade’s finest confectioner', items: ['frog', 'beans', 'liquorice', 'fizz', 'cake', 'pasty'] },
  jokeshop: { title: 'Grinwick’s Jokes', sub: 'Mischief for every occasion', items: ['joke', 'fizz', 'beans'] },
  pub: { title: 'The Three Lanterns', sub: 'Warm drinks and warmer gossip', items: ['mead', 'pasty', 'cake'] },
  tea: { title: 'Madam Puddock’s Tea Shop', sub: 'Frills, doilies and very good scones', items: ['scone', 'cake'] },
  general: { title: 'Scrivenshaw’s', sub: 'Quills, books and oddments', items: ['book', 'plant', 'creature', 'polish', 'potion'] },
};
const FLAVOURS = ['earwax', 'toffee', 'grass', 'cherry', 'soap', 'black pepper', 'marmalade', 'sprouts', 'sardine', 'bogey', 'strawberry', 'dirt', 'buttered toast', 'lemon sherbet', 'spinach', 'candyfloss'];

export const coins = () => G.save?.coins || 0;
export function addCoins(n) { if (!G.save) return; G.save.coins = Math.max(0, (G.save.coins || 0) + Math.round(n)); }
export function itemCount(id) { return G.save?.items?.[id] || 0; }
export function addItem(id, n = 1) { const s = G.save; s.items ||= {}; s.items[id] = Math.max(0, (s.items[id] || 0) + n); if (!s.items[id]) delete s.items[id]; }
export function buy(id) {
  const it = ITEMS[id];
  if (coins() < it.price) { G.audio.sfx('fail'); return false; }
  addCoins(-it.price);
  addItem(id);
  G.audio.sfx('pickup');
  return true;
}
// eat / use an item from the satchel
export function useItem(id) {
  const p = G.player;
  if (!itemCount(id) || !ITEMS[id].eat) return false;
  addItem(id, -1);
  const msg = {
    beans: () => { p.heal(8); return `A ${pick(FLAVOURS)} flavoured bean!`; },
    frog: () => { p.heal(15); return frogCard(); },
    pasty: () => { p.heal(30); return 'Warm and pumpkiny.'; },
    cake: () => { p.mana = Math.min(p.maxMana, p.mana + 40); p.heal(10); return 'Magic restored.'; },
    liquorice: () => { p.buffs.swift = 30; G.ui.updateBuffs(); return 'You feel light on your feet.'; },
    fizz: () => { p.vel.y = 9; return 'You float off the ground!'; },
    potion: () => { p.heal(50); return 'Steam pours out of your ears.'; },
    mead: () => { p.heal(40); return 'Warm all the way to your toes.'; },
    scone: () => { p.heal(25); return 'Crumbly and delicious.'; },
  }[id]?.();
  G.audio.sfx('pickup');
  G.ui.toast(`${ITEMS[id].icon} ${msg}`, 'info');
  return true;
}
// a Chocolate Frog has a good chance of a card you do not have yet
export function frogCard() {
  const missing = [...Array(12).keys()].filter((i) => !G.save.cards.includes(i));
  if (!missing.length || Math.random() > 0.6) return 'Just chocolate this time.';
  const i = pick(missing);
  G.save.cards.push(i);
  const c = G.story?.collectibles.find((c) => c.kind === 'card' && c.i === i);
  if (c) { c.got = true; c.mesh.parent?.remove(c.mesh); }
  return `The card inside: <b>${G.story?.cardName?.(i) || 'a famous witch or wizard'}</b>! (${G.save.cards.length}/12)`;
}
