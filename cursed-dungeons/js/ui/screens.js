// Menu screens: title, character select (co-op join), inventory with
// enchanting, skill tree, shop, mission map table, and loot summary.
import * as THREE from 'three/webgpu';
import { h, toast } from './ui.js';
import { openSettings } from './settingsScreen.js';
import { SORCERERS, SORCERER_IDS, SKILL_TREES } from '../sorcerers/index.js';
import { ITEM_BY_ID, RARITY, ENCHANTS, itemInfo, salvageValue, itemPrice, rollItem } from '../loot.js';
import { BIOMES } from '../world/biomes.js';
import { PLAYER_COLORS } from '../entities/player.js';
import { isMobile } from '../util.js';

// ------------------------------------------------------------------ title
export function openTitle(game) {
  const ui = game.ui;
  ui.open('title', (el) => {
    const save = game.save.data;
    el.appendChild(h('div', { class: 'title-wrap' },
      h('div', { class: 'logo' }, 'CURSED', h('span', {}, 'DUNGEONS')),
      h('div', { class: 'tag' }, 'A Jujutsu Kaisen dungeon crawler · Level ' + save.level + ' · ◆ ' + save.coins),
      h('div', { class: 'title-menu' },
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { ui.close('title'); openSelect(game); } }, save.stats.missions ? 'Continue' : 'Play'),
        h('button', { class: 'btn', onclick: () => openSettings(game) }, 'Settings'),
        h('button', { class: 'btn', onclick: () => { if (confirm('Erase all progress?')) { game.save.reset(); ui.refresh('title'); toast('Progress reset'); } } }, 'Reset Save'))),
      h('div', { class: 'footer-note' }, isMobile ? 'Tap to begin · landscape recommended' : 'Keyboard + mouse or up to 4 controllers · Press A / Start on a controller to join'));
  }, { onNav: (m) => { if (m.start) { ui.close('title'); openSelect(game); } } });
}

// ------------------------------------------------------------------ character select
export function openSelect(game) {
  const ui = game.ui;
  const slots = game.selectSlots = game.selectSlots ?? [{ device: game.input.lastDevice === 'touch' || isMobile ? 'touch' : game.input.lastDevice?.startsWith('pad') ? game.input.lastDevice : 'kbm', char: SORCERER_IDS.indexOf(game.save.data.lastSorcerer) < 0 ? 0 : SORCERER_IDS.indexOf(game.save.data.lastSorcerer), ready: false }];
  game.enterSelectView?.(slots);
  const render = (el) => {
    const top = h('div', { class: 'select-top' }, 'CHOOSE YOUR SORCERER');
    const cards = h('div', { class: 'slots' });
    for (let i = 0; i < 4; i++) {
      const s = slots[i];
      const pc = PLAYER_COLORS[i];
      if (!s) { cards.appendChild(h('div', { class: 'slot', style: `--pc:${pc}` }, h('div', { class: 'pn' }, `P${i + 1}`), h('div', { class: 'empty' }, isMobile ? '—' : 'Press A / Start on a controller to join'))); continue; }
      const id = SORCERER_IDS[s.char], info = SORCERERS[id];
      const lvl = game.save.data.level;
      cards.appendChild(h('div', { class: 'slot joined' + (s.ready ? ' ready' : ''), style: `--pc:${pc}` },
        h('div', { class: 'pn' }, `P${i + 1} · ${s.device === 'kbm' ? 'KEYBOARD' : s.device === 'touch' ? 'TOUCH' : 'GAMEPAD'}`),
        h('div', { class: 'cn', style: `color:${info.color}` }, info.name.toUpperCase()),
        h('div', { style: 'font-size:12px;color:#ddd' }, info.title + ' · Domain: ' + info.domain),
        h('div', { class: 'cd' }, info.desc),
        i === 0 ? h('div', { class: 'arrows' },
          h('button', { class: 'btn small', onclick: () => { s.char = (s.char + SORCERER_IDS.length - 1) % SORCERER_IDS.length; s.ready = false; game.enterSelectView?.(slots); ui.refresh('select'); } }, '◀'),
          h('span', { style: 'font-size:12px;color:#aaa' }, `Lv ${lvl}`),
          h('button', { class: 'btn small', onclick: () => { s.char = (s.char + 1) % SORCERER_IDS.length; s.ready = false; game.enterSelectView?.(slots); ui.refresh('select'); } }, '▶')) : h('div', { class: 'hint' }, s.ready ? 'READY' : '◀ ▶ choose · A ready · B leave')));
    }
    const bottom = h('div', { class: 'row', style: 'justify-content:center' },
      h('button', { class: 'btn', onclick: () => { ui.close('select'); game.exitSelectView?.(); openTitle(game); } }, 'Back'),
      h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => start() }, 'Enter Jujutsu High ▶'));
    el.appendChild(h('div', { class: 'select-wrap' }, top, cards, bottom));
  };
  const start = () => {
    ui.close('select');
    game.save.data.lastSorcerer = SORCERER_IDS[slots[0].char]; game.save.write();
    game.exitSelectView?.();
    game.beginSession(slots.map((s) => ({ device: s.device, sorcerer: SORCERER_IDS[s.char] })));
  };
  // gamepads: A/Start to join, stick to change, B to leave
  const prev = {};
  ui.open('select', render, {
    onNav: (m) => {
      for (const pad of game.input.pads()) {
        const id = 'pad' + pad.index;
        const b = { a: pad.buttons[0]?.pressed, b: pad.buttons[1]?.pressed, s: pad.buttons[9]?.pressed, l: pad.buttons[14]?.pressed || pad.axes[0] < -0.6, r: pad.buttons[15]?.pressed || pad.axes[0] > 0.6 };
        const p = prev[id] || {}; prev[id] = b;
        let slot = slots.find((s) => s.device === id);
        if (!slot && (b.a && !p.a || b.s && !p.s) && slots.length < 4 && !(slots.length === 1 && slots[0].device === id)) {
          if (slots.length === 1 && slots[0].device === 'kbm' && game.input.lastDevice === id && !slots[0].touched) { slots[0].device = id; }
          else slots.push({ device: id, char: slots.length % SORCERER_IDS.length, ready: false });
          game.audio?.ui('buy'); game.enterSelectView?.(slots); ui.refresh('select'); continue;
        }
        if (!slot || slots.indexOf(slot) === 0) continue;
        if (b.l && !p.l) { slot.char = (slot.char + SORCERER_IDS.length - 1) % SORCERER_IDS.length; slot.ready = false; game.enterSelectView?.(slots); ui.refresh('select'); }
        if (b.r && !p.r) { slot.char = (slot.char + 1) % SORCERER_IDS.length; slot.ready = false; game.enterSelectView?.(slots); ui.refresh('select'); }
        if (b.a && !p.a) { slot.ready = !slot.ready; ui.refresh('select'); }
        if (b.b && !p.b) { slots.splice(slots.indexOf(slot), 1); game.enterSelectView?.(slots); ui.refresh('select'); }
      }
      if (m.start && m.device === slots[0].device) start();
    },
    onBack: () => { ui.close('select'); game.exitSelectView?.(); openTitle(game); },
  });
}

// ------------------------------------------------------------------ inventory
const SLOT_NAMES = ['Weapon', 'Armour', 'Tool 1', 'Tool 2'];
const SLOT_KIND = ['weapon', 'armor', 'artifact', 'artifact'];
export function openInventory(game, player) {
  const ui = game.ui, save = game.save;
  const sid = player.sorcerer;
  let sel = null;
  game.paused = true;
  const close = () => { ui.close('inventory'); game.paused = false; };
  ui.open('inventory', (el) => {
    const d = save.data, S = save.sorc(sid);
    const gear = S.gear;
    const itemEl = (it, extra = '') => {
      const b = itemInfo(it);
      const eq = gear.includes(it.uid);
      const el2 = h('button', { class: `item ${b.rarity}${eq ? ' equipped' : ''} ${extra}`, onclick: () => { sel = it.uid; ui.refresh('inventory'); } }, b.icon, h('span', { class: 'pw' }, String(it.power)));
      el2.addEventListener('navfocus', () => { if (sel !== it.uid) { sel = it.uid; renderDetail(); } });
      return el2;
    };
    const eqRow = h('div', { class: 'slots-eq' }, ...gear.map((uid, i) => {
      const it = uid ? save.item(uid) : null;
      return it ? itemEl(it) : h('div', { class: 'item', title: SLOT_NAMES[i], style: 'opacity:.45;font-size:12px' }, SLOT_NAMES[i]);
    }));
    const grid = h('div', { class: 'inv-grid' }, ...d.inventory.map((it) => itemEl(it)));
    const detail = h('div', { class: 'detail' });
    const renderDetail = () => {
      detail.innerHTML = '';
      const it = sel ? save.item(sel) : null;
      if (!it) { detail.append(h('div', { class: 'hint' }, 'Select an item. Enchantment points: ' + d.enchantPoints)); return; }
      const b = itemInfo(it), R = RARITY[b.rarity];
      const eqIdx = gear.indexOf(it.uid);
      detail.append(
        h('div', { class: 'iname', style: `color:${R.color}` }, `${b.icon} ${b.name}`),
        h('div', { class: 'rar', style: `color:${R.color}` }, `${R.label} ${b.kind} · Power ${it.power}`),
        h('div', { class: 'desc' }, b.desc + (b.cd ? ` (cooldown ${b.cd}s)` : '')),
        ...it.ench.map((e) => {
          const E = ENCHANTS[e.id];
          const cost = e.level + 1;
          return h('div', { class: 'ench' }, h('span', {}, `${E.name} `, h('span', { class: 'lv' }, '★'.repeat(e.level) + '☆'.repeat(3 - e.level))),
            h('span', { style: 'font-size:12px;color:#aaa;flex:1;padding:0 6px' }, E.desc(Math.max(1, e.level))),
            e.level < 3 ? h('button', { class: 'btn small', disabled: d.enchantPoints < cost, onclick: () => { d.enchantPoints -= cost; e.level++; save.write(); player.refreshLoadout(); game.audio?.ui('buy'); ui.refresh('inventory'); } }, `+${cost}pt`) : null);
        }),
        h('div', { class: 'row', style: 'margin-top:10px' },
          eqIdx >= 0 ? h('button', { class: 'btn small', onclick: () => { gear[eqIdx] = null; save.write(); player.refreshLoadout(); ui.refresh('inventory'); } }, 'Unequip')
            : h('button', { class: 'btn small primary', onclick: () => {
              let slot = SLOT_KIND.indexOf(b.kind);
              if (b.kind === 'artifact' && gear[2] && !gear[3]) slot = 3;
              gear[slot] = it.uid; save.write(); player.refreshLoadout(); game.audio?.ui('buy'); ui.refresh('inventory');
            } }, 'Equip'),
          eqIdx < 0 ? h('button', { class: 'btn small danger', onclick: () => {
            const refund = it.ench.reduce((a, e) => a + (e.level * (e.level + 1)) / 2, 0);
            d.coins += salvageValue(it); d.enchantPoints += refund; d.inventory = d.inventory.filter((x) => x !== it); sel = null; save.write(); game.audio?.coin(); ui.refresh('inventory');
          } }, `Salvage (+◆${salvageValue(it)})`) : null));
    };
    renderDetail();
    const st = player.stats;
    const stats = h('div', { style: 'margin-top:8px' },
      h('div', { class: 'stat-line' }, 'Health', h('b', {}, String(Math.round(player.maxHp)))),
      h('div', { class: 'stat-line' }, 'Melee damage', h('b', {}, `×${st.meleeMult.toFixed(2)}`)),
      h('div', { class: 'stat-line' }, 'Technique damage', h('b', {}, `×${st.techMult.toFixed(2)}`)),
      h('div', { class: 'stat-line' }, 'Damage reduction', h('b', {}, `${Math.round(st.armor * 100)}%`)),
      h('div', { class: 'stat-line' }, 'Crit / Cooldown', h('b', {}, `${Math.round(st.crit * 100)}% / -${Math.round(st.cdr * 100)}%`)));
    el.appendChild(h('div', { class: 'panel', style: 'width:min(940px,97vw)' },
      h('h2', {}, `Inventory · ${SORCERERS[sid].name}`),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, `Level ${d.level} · ◆ ${d.coins} · Enchantment points: ${d.enchantPoints}`),
      h('div', { class: 'inv' }, h('div', {}, h('h3', {}, 'Equipped'), eqRow, h('h3', {}, 'Stash'), grid, stats), detail),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' }, h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Close'))));
  }, { dim: true, onBack: close });
}

// ------------------------------------------------------------------ skill tree
export function openSkills(game, player) {
  const ui = game.ui, save = game.save;
  const sid = player.sorcerer, tree = SKILL_TREES[sid] ?? [];
  game.paused = true;
  const close = () => { ui.close('skills'); game.paused = false; };
  ui.open('skills', (el) => {
    const S = save.sorc(sid);
    const cards = tree.map((sk) => {
      const r = S.skills[sk.id] ?? 0;
      const locked = sk.req && !(S.skills[sk.req] > 0);
      return h('button', { class: 'skill' + (locked ? ' locked' : ''), style: 'text-align:left', onclick: () => {
        if (locked || r >= sk.max || S.skillPoints <= 0) { game.audio?.ui('back'); return; }
        S.skills[sk.id] = r + 1; S.skillPoints--; save.write(); player.refreshLoadout(); game.audio?.levelUp(); ui.refresh('skills');
      } }, h('div', { class: 'sn' }, sk.name), h('div', { class: 'sd' }, sk.desc + (locked ? ` (requires ${tree.find((t) => t.id === sk.req)?.name})` : '')), h('div', { class: 'pips' }, '◆'.repeat(r) + '◇'.repeat(sk.max - r)));
    });
    el.appendChild(h('div', { class: 'panel', style: 'width:min(820px,97vw)' },
      h('h2', {}, `Skill Tree · ${SORCERERS[sid].name}`),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, `Skill points: ${S.skillPoints} · earn one per level (all sorcerers)`),
      h('div', { class: 'tree' }, ...cards),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' }, h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Close'))));
  }, { dim: true, onBack: close });
}

// ------------------------------------------------------------------ shop
export function openShop(game, player) {
  const ui = game.ui, save = game.save, d = save.data;
  if (!d.shop || !d.shop.items?.length) d.shop = { items: [0, 1, 2, 3, 4].map((i) => rollItem(Math.max(1, d.level / 2), { kind: ['weapon', 'armor', 'artifact', 'artifact', null][i] })) };
  game.paused = true;
  const close = () => { ui.close('shop'); game.paused = false; };
  ui.open('shop', (el) => {
    const rows = d.shop.items.map((it, i) => {
      const b = itemInfo(it), R = RARITY[b.rarity], price = itemPrice(it);
      return h('button', { class: 'mission', style: 'width:100%;text-align:left;color:inherit', onclick: () => {
        if (d.coins < price) { toast('Not enough coins'); game.audio?.ui('back'); return; }
        d.coins -= price; d.inventory.push(it); d.shop.items.splice(i, 1); save.write(); game.audio?.ui('buy'); toast(`Bought ${b.name}`); ui.refresh('shop');
      } }, h('div', { class: `mi item ${b.rarity}` }, b.icon), h('div', {}, h('div', { class: 'mt', style: `color:${R.color}` }, b.name), h('div', { class: 'md' }, `${R.label} ${b.kind} · Power ${it.power} · ${it.ench.map((e) => ENCHANTS[e.id].name).join(', ')}`)), h('div', { class: 'diff' }, `◆ ${price}`));
    });
    el.appendChild(h('div', { class: 'panel', style: 'width:min(620px,96vw)' }, h('h2', {}, 'Cursed Tool Merchant'),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, `Your coins: ◆ ${d.coins}`), ...rows,
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' },
        h('button', { class: 'btn small', onclick: () => { if (d.coins < 25) { toast('Need ◆25'); return; } d.coins -= 25; d.shop = null; save.write(); close(); openShop(game, player); } }, 'Restock (◆25)'),
        h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Close'))));
  }, { dim: true, onBack: close });
}

// ------------------------------------------------------------------ mission map table
export const MISSIONS = [
  { id: 'm1', name: 'Night Patrol', biome: 'jujutsu_high', objective: 'exorcise', boss: 'hanami', difficulty: 1, icon: '⛩️', desc: 'Curses have breached the school grounds.' },
  { id: 'm2', name: 'Stranded Students', biome: 'tokyo_night', objective: 'rescue', boss: 'mahito', difficulty: 1, icon: '🌃', desc: 'First-years are trapped in talisman cages downtown.', req: 'm1' },
  { id: 'm3', name: 'Rotten Grove', biome: 'cursed_forest', objective: 'seal', boss: 'hanami', difficulty: 2, icon: '🌲', desc: 'Seal the cursed objects feeding the forest.', req: 'm2' },
  { id: 'm4', name: 'Drowned Line', biome: 'flooded_subway', objective: 'exorcise', boss: 'jogo', difficulty: 2, icon: '🚇', desc: 'Something boils beneath the flooded tunnels.', req: 'm3' },
  { id: 'm5', name: 'Shibuya Incident', biome: 'shibuya', objective: 'rescue', boss: 'mahito', difficulty: 3, icon: '🎃', desc: 'Halloween. A curtain falls over Shibuya.', req: 'm4' },
  { id: 'm6', name: 'Volcanic Descent', biome: 'shibuya', objective: 'seal', boss: 'jogo', difficulty: 4, icon: '🌋', desc: 'Special Grade threat. Bring friends.', req: 'm5' },
];
export function openMapTable(game) {
  const ui = game.ui, d = game.save.data;
  let threat = 0;
  game.paused = true;
  const close = () => { ui.close('maptable'); game.paused = false; };
  ui.open('maptable', (el) => {
    const rows = MISSIONS.map((m) => {
      const locked = m.req && !d.completed[m.req];
      const best = d.completed[m.id];
      const diff = m.difficulty + threat;
      return h('button', { class: 'mission' + (locked ? ' locked' : ''), style: 'width:100%;text-align:left;color:inherit', onclick: () => {
        if (locked) { toast('Complete the previous mission first'); return; }
        close(); game.startMission({ ...m, difficulty: diff, seed: (Math.random() * 1e9) | 0 });
      } }, h('div', { class: 'mi' }, m.icon), h('div', {}, h('div', { class: 'mt' }, m.name + (best ? ' ✔' : '')), h('div', { class: 'md' }, `${BIOMES[m.biome].name} · ${m.desc}`)), h('div', { class: 'diff' }, locked ? '🔒' : ['', 'Grade 3', 'Grade 2', 'Grade 1', 'Special', 'Special+', 'Special++'][Math.min(6, diff)]));
    });
    el.appendChild(h('div', { class: 'panel', style: 'width:min(640px,96vw)' }, h('h2', {}, 'Mission Map'),
      h('div', { class: 'setting' }, h('label', {}, 'Threat level'), (() => { const s = h('select', {}, ...[['0', 'Normal'], ['1', 'Hard (+1 grade)'], ['2', 'Nightmare (+2 grades)']].map(([v, t]) => { const o = h('option', { value: v }, t); if (+v === threat) o.selected = true; return o; })); s.addEventListener('change', () => { threat = +s.value; ui.refresh('maptable'); }); return s; })()),
      ...rows,
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' }, h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Close'))));
  }, { dim: true, onBack: close });
}
