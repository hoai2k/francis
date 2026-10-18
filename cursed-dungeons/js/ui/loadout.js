// Loadout: equip 4 active abilities (RMB / 1 / 2 / 3 — RMB takes a basic
// ability) and 3 passive talismans from what is unlocked on the technique
// tree. F stays the Domain / Ultimate. Saved per technique in
// save.sorc(id).loadout. Pick a slot, then pick an ability (mouse, touch,
// keyboard or gamepad — every card is a focusable button).
import { h, toast } from './ui.js';
import { SORCERERS } from '../sorcerers/index.js';
import { SLOT_KEYS, ABILITY_KINDS, rmbOk } from '../sorcerers/kit.js';
import { isMobile } from '../util.js';

const SLOT_LABEL = { ranged: 'RMB', t1: '1', t2: '2', t3: '3' };
const PAD_LABEL = { ranged: 'RT', t1: 'LB', t2: 'RB', t3: 'Y' };
const TOUCH_LABEL = { ranged: '✦', t1: '1', t2: '2', t3: '3' };

export function openLoadout(game, player, opts = {}) {
  const ui = game.ui, save = game.save;
  const sid = player.sorcerer;
  let pick = 'ranged', hover = null;
  if (opts.focus) {
    const k = player.kit;
    if (k.passives?.[opts.focus] && !k.library?.[opts.focus]) pick = 'p' + Math.max(0, k.loadout.talismans.indexOf(null));
    else pick = SLOT_KEYS.find((s) => k.loadout[s] === opts.focus) ?? (rmbOk(k.library?.[opts.focus]) && !k.has(k.loadout.ranged) ? 'ranged' : SLOT_KEYS.slice(1).find((s) => !k.loadout[s] || !k.has(k.loadout[s])) ?? 't1');
    hover = opts.focus;
  }
  game.paused = true;
  const close = () => { ui.close('loadout'); if (!ui.isOpen('pause')) game.paused = false; };
  const keyLabel = player.device.startsWith('pad') ? PAD_LABEL : player.device === 'touch' ? TOUCH_LABEL : SLOT_LABEL;
  const commit = (msg) => { save.write(); player.refreshLoadout(); game.audio?.ui('buy'); if (msg) toast(msg); ui.refresh('loadout'); };
  ui.open('loadout', (el) => {
    const kit = player.kit, L = kit.loadout, lib = kit.library, pas = kit.passives;
    const S = save.sorc(sid);
    const isTal = pick.startsWith('p'), ti = isTal ? +pick[1] : -1;
    const equip = (id) => {
      if (isTal) {
        if (!kit.hasPassive(id)) { toast('🔒 Unlock this talisman on the technique tree first'); game.audio?.ui('back'); return; }
        const j = L.talismans.indexOf(id);
        if (j === ti) { L.talismans[ti] = null; commit(); return; }
        if (j >= 0) L.talismans[j] = L.talismans[ti];
        L.talismans[ti] = id;
        const nx = L.talismans.indexOf(null); if (nx >= 0) pick = 'p' + nx;
        commit(`${pas[id].name} equipped`);
        return;
      }
      const a = lib[id];
      if (!kit.has(id)) { toast('🔒 Unlock this ability on the technique tree first'); game.audio?.ui('back'); return; }
      if (pick === 'ranged' && !rmbOk(a)) { toast('RMB takes a basic (ranged) ability'); game.audio?.ui('back'); return; }
      const from = SLOT_KEYS.find((k) => L[k] === id);
      if (from === pick) return;
      if (from) {
        const back = L[pick];
        if (from === 'ranged' && !rmbOk(lib[back])) { toast('RMB needs a basic ability — put another basic ability on RMB first'); game.audio?.ui('back'); return; }
        L[from] = back ?? null;
      }
      L[pick] = id;
      commit(`${a.name} → ${keyLabel[pick]}`);
    };
    const kindOf = (a) => ABILITY_KINDS[a.kind] ?? ABILITY_KINDS.technique;
    // ---- equipped slots
    const slotCard = (k) => {
      const id = L[k], a = id ? lib[id] : null, locked = a && !kit.has(id);
      return h('button', { class: 'lo-slot' + (pick === k ? ' pick' : '') + (locked ? ' locked' : '') + (a ? '' : ' empty'), 'data-autofocus': pick === k && !hover, onclick: () => { pick = k; hover = null; ui.refresh('loadout'); } },
        h('span', { class: 'lo-key' }, keyLabel[k]),
        h('span', { class: 'lo-icon' }, a ? a.icon : '＋'),
        h('span', { class: 'lo-name' }, a ? a.name : 'Empty'),
        a ? h('span', { class: 'lo-kind', style: `color:${kindOf(a).color}` }, locked ? '🔒 locked' : kindOf(a).label) : h('span', { class: 'lo-kind' }, k === 'ranged' ? 'basic only' : 'any ability'));
    };
    const ult = kit.domain ?? kit.ultimate;
    const fCard = h('div', { class: 'lo-slot ult' + (kit.domainLocked ? ' locked' : '') },
      h('span', { class: 'lo-key' }, player.device.startsWith('pad') ? 'LT' : 'F'),
      h('span', { class: 'lo-icon' }, ult?.icon ?? '領'), h('span', { class: 'lo-name' }, ult?.name ?? '—'),
      h('span', { class: 'lo-kind' }, kit.domainLocked ? '🔒 tree capstone' : kit.domain ? 'Domain' : 'Ultimate'));
    const talCard = (i) => {
      const id = L.talismans[i], a = id ? pas[id] : null;
      return h('button', { class: 'lo-slot tal' + (pick === 'p' + i ? ' pick' : '') + (a ? '' : ' empty'), onclick: () => { pick = 'p' + i; hover = null; ui.refresh('loadout'); } },
        h('span', { class: 'lo-key' }, '符' + (i + 1)), h('span', { class: 'lo-icon' }, a ? a.icon : '＋'), h('span', { class: 'lo-name' }, a ? a.name : 'Empty'), h('span', { class: 'lo-kind' }, 'Talisman'));
    };
    // ---- the pool for the picked slot
    const ids = isTal ? Object.keys(pas) : Object.keys(lib);
    const owned = (id) => (isTal ? kit.hasPassive(id) : kit.has(id));
    ids.sort((a, b) => (owned(b) - owned(a)) || ((isTal ? 0 : (lib[a].tier ?? 1) - (lib[b].tier ?? 1))));
    const detail = h('div', { class: 'lo-detail' });
    const showDetail = (id) => {
      detail.innerHTML = '';
      const a = isTal ? pas[id] : lib[id]; if (!a) { detail.append(h('div', { class: 'hint' }, isTal ? 'Pick a talisman for this slot.' : pick === 'ranged' ? 'RMB takes a basic ability. Pick one below.' : 'Pick an ability for this slot.')); return; }
      detail.append(...[h('div', { class: 'lo-dname' }, `${a.icon} ${a.name}`),
        h('div', { class: 'lo-dmeta' }, isTal ? (a.generic ? 'Talisman · any technique' : 'Talisman · technique') : `${kindOf(a).label} · ⏱ ${a.cd}s · 💧 ${a.ce ?? 0} CE${a.maxCharges > 1 ? ` · ${a.maxCharges} charges` : ''}`),
        h('div', { class: 'lo-ddesc' }, a.desc ?? ''),
        owned(id) ? null : h('div', { class: 'lo-dlock' }, '🔒 Unlock on the technique tree')].filter(Boolean));
    };
    const pool = h('div', { class: 'lo-pool' }, ...ids.map((id) => {
      const a = isTal ? pas[id] : lib[id];
      const own = owned(id), bad = !isTal && pick === 'ranged' && !rmbOk(a);
      const where = isTal ? (L.talismans.includes(id) ? '符' + (L.talismans.indexOf(id) + 1) : '') : (keyLabel[SLOT_KEYS.find((k) => L[k] === id)] ?? '');
      const b = h('button', { class: 'lo-card' + (own ? '' : ' locked') + (bad ? ' bad' : '') + (where ? ' on' : ''), 'data-autofocus': hover === id, style: `--kc:${isTal ? '#ffcf4a' : kindOf(a).color}`, onclick: () => equip(id) },
        h('span', { class: 'lo-icon' }, a.icon ?? '◆'), h('span', { class: 'lo-name' }, a.name), where ? h('span', { class: 'lo-where' }, where) : null, own ? null : h('span', { class: 'lo-lock' }, '🔒'));
      b.addEventListener('navfocus', () => showDetail(id));
      b.addEventListener('pointerenter', () => showDetail(id));
      return b;
    }));
    showDetail(hover ?? (isTal ? L.talismans[ti] : L[pick]));
    const info = SORCERERS[sid];
    el.appendChild(h('div', { class: 'panel lo-panel' },
      h('h2', {}, `Loadout · ${info.technique ?? info.name}`),
      h('div', { class: 'hint', style: 'margin:0 0 6px' }, `${isMobile ? 'Tap' : 'Select'} a slot, then an ability to put in it. ${Object.keys(lib).filter((id) => kit.has(id)).length}/${Object.keys(lib).length} abilities unlocked · ◆ ${S.skillPoints} technique points`),
      h('div', { class: 'lo-row' }, h('div', { class: 'lo-label' }, 'Active'), ...SLOT_KEYS.map(slotCard), fCard),
      h('div', { class: 'lo-row' }, h('div', { class: 'lo-label' }, 'Talismans'), ...[0, 1, 2].map(talCard)),
      h('div', { class: 'lo-sub' }, isTal ? `Talisman slot ${ti + 1} — passives` : `Slot ${keyLabel[pick]} — ${pick === 'ranged' ? 'basic abilities' : 'abilities'}`),
      h('div', { class: 'lo-body' }, pool, detail),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:8px;gap:8px' },
        h('button', { class: 'btn small', onclick: () => {
          if (isTal) { L.talismans[ti] = null; commit(); return; }
          if (pick === 'ranged') { toast('RMB always holds a basic ability'); game.audio?.ui('back'); return; }
          L[pick] = null; commit();
        } }, 'Clear slot'),
        h('button', { class: 'btn', onclick: () => { ui.close('loadout'); import('./techniqueTree.js').then((m) => m.openTechniqueTree(game, player)); } }, '🌳 Technique Tree'),
        h('button', { class: 'btn primary', onclick: close }, 'Done'))));
  }, { dim: true, onBack: close, owner: player?.device });
}
