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
    lastSorcerer: 'gojo',
    stats: { kills: 0, missions: 0, deaths: 0, domains: 0 },
    shop: null,
  };
}

export class Save {
  constructor() { this.data = this.load(); }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (d && d.version === 1) return { ...fresh(), ...d }; }
    } catch (e) { /* ignore */ }
    return fresh();
  }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full / private mode */ } }
  reset() { this.data = fresh(); this.write(); }
  sorc(id) {
    const s = this.data.sorcerers;
    if (!s[id]) {
      const inv = this.data.inventory;
      const w = inv.find((i) => i.id === 'wraps') ?? inv[0], a = inv.find((i) => i.id === 'uniform'), t = inv.find((i) => i.id === 'talisman');
      s[id] = { skills: {}, skillPoints: this.data.level, gear: [w?.uid ?? null, a?.uid ?? null, t?.uid ?? null, null] };
    }
    return s[id];
  }
  item(uid) { return this.data.inventory.find((i) => i.uid === uid) ?? null; }
  gearFor(id) { return this.sorc(id).gear.map((u) => (u ? this.item(u) : null)); }
  // XP curve: 100, 180, 260…
  xpFor(level) { return 60 + level * 60; }
  addXp(n) {
    const d = this.data; let ups = 0;
    d.xp += n;
    while (d.xp >= this.xpFor(d.level)) { d.xp -= this.xpFor(d.level); d.level++; d.enchantPoints++; ups++; for (const k in d.sorcerers) d.sorcerers[k].skillPoints++; }
    return ups;
  }
}
