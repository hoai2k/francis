// Profile persistence in localStorage: coins, sorcerer levels/XP, skill
// ranks, enchantment points, inventory, loadouts and mission progress.
import { rollItem } from './loot.js';

const KEY = 'cursed-dungeons-save-v1';

function fresh() {
  return {
    version: 1,
    coins: 0,
    level: 1, xp: 0, enchantPoints: 1,
    sorcerers: {},             // id -> { skills: {id: rank}, skillPoints, gear: [weaponUid, armorUid, art1Uid, art2Uid] }
    inventory: [rollItem(1, { id: 'wraps' }), rollItem(1, { id: 'uniform' }), rollItem(1, { id: 'talisman' })],
    completed: {},             // missionId -> best threat cleared
    unlocked: { tokyo_night: true, jujutsu_high: true },
    lastSorcerer: null,
    technique: null,           // P1's rolled cursed technique
    spins: 10,                 // technique rerolls
    codeUnlocked: false,       // the "frannguy" code lets you pick any technique
    treeV2: true,
    stats: { kills: 0, missions: 0, deaths: 0, domains: 0 },
    shop: null,
    // the open world: current region and position, discovered regions and Window
    // stations, what the world map knows of each region, the dungeon to return from
    world: { region: null, pos: null, discovered: {}, stations: {}, meta: {}, returnTo: null },
    quests: { st: {}, tracked: null },   // quests/index.js (main quests read `completed`)
  };
}

// Techniques are now unlocked on the technique tree: refund old skill ranks.
function migrate(d) {
  if (!d.treeV2) {
    for (const k in d.sorcerers) {
      const S = d.sorcerers[k];
      const spent = Object.values(S.skills ?? {}).reduce((a, b) => a + b, 0);
      S.skills = {}; S.skillPoints = (S.skillPoints ?? 0) + spent + 3;
    }
    d.treeV2 = true;
    if (d.spins == null) d.spins = 10;
  }
  // Open world (Cursed Dungeons II): old saves start at Jujutsu High with every
  // cleared chapter still cleared (main quests read `completed`).
  d.world ??= {};
  d.world.discovered ??= {}; d.world.stations ??= {}; d.world.meta ??= {};
  if (d.world.region === undefined) d.world.region = null;
  d.quests ??= { st: {}, tracked: null };
  d.quests.st ??= {};
  return d;
}

export class Save {
  constructor() { this.data = this.load(); }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (d && d.version === 1) return { ...fresh(), ...migrate(d) }; }
    } catch (e) { /* ignore */ }
    return fresh();
  }
  // Returns false when the browser blocks storage (private mode, full disk);
  // the pause menu then offers a save code instead.
  write() {
    try { this.beforeWrite?.(); } catch (e) { /* never block a save */ }
    this.data.savedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); this.ok = true; } catch (e) { this.ok = false; }
    return this.ok;
  }
  // Portable save code: copy it to keep progress or move it to another device.
  exportCode() { return 'CD1.' + btoa(unescape(encodeURIComponent(JSON.stringify(this.data)))); }
  importCode(code) {
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(code.trim().replace(/^CD1\./, '')))));
      if (!d || d.version !== 1 || !Array.isArray(d.inventory)) return false;
      this.data = { ...fresh(), ...migrate(d) }; this.write(); return true;
    } catch (e) { return false; }
  }
  reset() { this.data = fresh(); this.write(); }
  sorc(id) {
    const s = this.data.sorcerers;
    if (!s[id]) {
      const inv = this.data.inventory;
      const w = inv.find((i) => i.id === 'wraps') ?? inv[0], a = inv.find((i) => i.id === 'uniform'), t = inv.find((i) => i.id === 'talisman');
      s[id] = { skills: {}, skillPoints: this.data.level * 2, gear: [w?.uid ?? null, a?.uid ?? null, t?.uid ?? null, null] };
    }
    return s[id];
  }
  item(uid) { return this.data.inventory.find((i) => i.uid === uid) ?? null; }
  gearFor(id) { return this.sorc(id).gear.map((u) => (u ? this.item(u) : null)); }
  // Each level: +2 technique-tree points (every technique) and +1 reroll.
  // XP curve: 100, 180, 260…
  xpFor(level) { return 60 + level * 60; }
  addXp(n) {
    const d = this.data; let ups = 0;
    d.xp += n;
    while (d.xp >= this.xpFor(d.level)) { d.xp -= this.xpFor(d.level); d.level++; d.enchantPoints++; d.spins = (d.spins ?? 0) + 1; ups++; for (const k in d.sorcerers) d.sorcerers[k].skillPoints += 2; }
    return ups;
  }
}
