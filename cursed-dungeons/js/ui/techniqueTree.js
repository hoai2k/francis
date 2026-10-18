// Technique tree: a branching ARPG-style skill tree built from the kit's
// ability library, passive talismans, technique upgrades and the shared
// nodes (RCT, Cursed Energy, Domain / Ultimate). Nodes are buttons laid out
// on a scrollable canvas with prerequisite lines, so it works with a mouse,
// touch (tap to select, tap again to unlock), keyboard and gamepad (move to a
// node to select it, A / Enter to unlock).
import { h, toast } from './ui.js';
import { SORCERERS, buildTree, nodeRank, lockReason, unlockNode } from '../sorcerers/index.js';
import { ABILITY_KINDS } from '../sorcerers/kit.js';
import { openLoadout } from './loadout.js';

const CW = 78, RH = 92, PAD = 44, NODE = 58;
const TYPE_LABEL = { ability: 'Ability', passive: 'Talisman (passive)', upgrade: 'Upgrade', core: 'Core' };

// Grid positions: branches are columns (several sub-columns when a tier has
// more than one node), tiers are rows; the Domain / Ultimate sits below as
// the capstone.
function layout(tree, kit) {
  const order = [...(kit.branches ?? [])];
  const push = (b) => { if (b && !order.includes(b)) order.push(b); };
  for (const n of tree.nodes) if (n.type === 'ability') push(n.branch);
  for (const n of tree.nodes) if (n.type === 'passive' && !n.generic) push(n.branch);
  for (const n of tree.nodes) if (n.type === 'upgrade') push(n.branch);
  for (const n of tree.nodes) if (!n.capstone) push(n.branch);
  const cells = new Map();
  let maxTier = 0;
  for (const n of tree.nodes) {
    if (n.capstone) continue;
    const k = n.branch + '|' + n.tier;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(n);
    maxTier = Math.max(maxTier, n.tier);
  }
  const cols = [];
  let x = 0;
  for (const b of order) {
    let w = 1;
    for (let t = 0; t <= maxTier; t++) w = Math.max(w, cells.get(b + '|' + t)?.length ?? 0);
    cols.push({ b, x, w });
    for (let t = 0; t <= maxTier; t++) {
      const list = cells.get(b + '|' + t) ?? [];
      list.forEach((n, i) => { n.gx = x + (w - list.length) / 2 + i; n.gy = t; });
    }
    x += w + 0.45;
  }
  const width = Math.max(1, x - 0.45);
  for (const n of tree.nodes) if (n.capstone) { n.gx = (width - 1) / 2; n.gy = maxTier + 1.25; }
  return { cols, width, height: maxTier + 2.25 };
}
const px = (n) => PAD + n.gx * CW + NODE / 2;
const py = (n) => PAD + 22 + n.gy * RH + NODE / 2;

export function openTechniqueTree(game, player) {
  const ui = game.ui, save = game.save;
  const sid = player.sorcerer;
  let sel = null;
  game.paused = true;
  const close = () => { ui.close('skills'); if (!ui.isOpen('pause')) game.paused = false; };
  ui.open('skills', (el) => {
    const S = save.sorc(sid), kit = player.kit;
    const tree = buildTree(kit, sid);
    const L = layout(tree, kit);
    if (!sel || !tree.by[sel]) sel = tree.nodes.find((n) => n.type === 'ability' && n.start)?.nid ?? tree.nodes[0]?.nid;
    const W = PAD * 2 + L.width * CW, H = PAD * 2 + 22 + L.height * RH;
    const status = (n) => {
      const r = nodeRank(S.skills, n);
      if (r >= n.max) return 'owned';
      const why = lockReason(tree, S.skills, n, S.skillPoints);
      if (!why) return r > 0 ? 'owned partial' : 'avail';
      return r > 0 ? 'owned partial' : why.startsWith('Needs') ? 'afford' : 'locked';
    };
    // prerequisite lines (elbows), lit when the parent is owned
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('class', 'tt-lines');
    for (const n of tree.nodes) for (const q of n.reqs) {
      const a = tree.by[q]; if (!a || a.gx == null) continue;
      const x1 = px(a), y1 = py(a), x2 = px(n), y2 = py(n), my = y1 + (y2 - y1) / 2;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', Math.abs(x1 - x2) < 1 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} L${x1},${my} L${x2},${my} L${x2},${y2}`);
      path.setAttribute('class', nodeRank(S.skills, a) > 0 ? (nodeRank(S.skills, n) > 0 ? 'on' : 'lit') : 'off');
      svg.appendChild(path);
    }
    // the capstone hangs off the bottom of every branch
    const cap = tree.nodes.find((n) => n.capstone);
    const canvas = h('div', { class: 'tt-canvas', style: `width:${W}px;height:${H}px` });
    canvas.appendChild(svg);
    for (const c of L.cols) canvas.appendChild(h('div', { class: 'tt-branch', style: `left:${PAD + c.x * CW - 6}px;width:${c.w * CW - 20 + NODE / 2 + 12}px;height:${H - PAD}px` }, h('span', {}, c.b)));
    if (cap) canvas.appendChild(h('div', { class: 'tt-capline', style: `left:${PAD}px;width:${L.width * CW - CW + NODE}px;top:${py(cap) - RH * 0.55}px` }));
    const detail = h('div', { class: 'tt-detail' });
    const renderDetail = () => {
      detail.innerHTML = '';
      const n = tree.by[sel]; if (!n) return;
      const r = nodeRank(S.skills, n), why = lockReason(tree, S.skills, n, S.skillPoints), a = n.ref;
      const K = n.type === 'ability' ? ABILITY_KINDS[a.kind] ?? ABILITY_KINDS.technique : null;
      const meta = [];
      if (n.type === 'ability') {
        meta.push(h('span', { class: 'tt-kind', style: `color:${K.color}` }, K.label + (a.kind === 'basic' ? ' · RMB-capable' : '')));
        meta.push(h('span', {}, `⏱ ${a.cd}s`), h('span', {}, `💧 ${a.ce ?? 0} CE`));
        if (a.maxCharges > 1) meta.push(h('span', {}, `${a.maxCharges} charges`));
      } else meta.push(h('span', { class: 'tt-kind' }, n.capstone ? 'Capstone · F' : TYPE_LABEL[n.type]));
      const eqSlot = n.type === 'ability' ? Object.entries({ ranged: 'RMB', t1: '1', t2: '2', t3: '3' }).find(([k]) => kit.loadout?.[k] === n.id)?.[1] : null;
      const eqTal = n.type === 'passive' && kit.loadout?.talismans.includes(n.id);
      detail.append(...[
        h('div', { class: 'tt-dname' }, h('span', { class: 'tt-dicon' }, n.icon ?? '◆'), n.name),
        h('div', { class: 'tt-meta' }, ...meta),
        h('div', { class: 'tt-desc' }, n.desc),
        n.max > 1 ? h('div', { class: 'pips' }, '◆'.repeat(r) + '◇'.repeat(n.max - r)) : null,
        h('div', { class: 'tt-state' + (why && why !== 'max' ? ' bad' : '') },
          n.start ? 'Unlocked from the start' : r >= n.max ? (eqSlot ? `Unlocked · equipped on ${eqSlot}` : eqTal ? 'Unlocked · equipped as a talisman' : n.type === 'ability' ? 'Unlocked · not equipped (open the Loadout)' : n.type === 'passive' ? 'Unlocked · equip it in a talisman slot (Loadout)' : 'Unlocked')
            : why ? why : `Cost: ${n.cost} technique point${n.cost > 1 ? 's' : ''}`),
        h('div', { class: 'row', style: 'margin-top:8px;gap:6px' },
          r < n.max ? h('button', { class: 'btn small primary', disabled: !!why, onclick: () => buy(n) }, `Unlock (${n.cost} pt${n.cost > 1 ? 's' : ''})`) : null,
          (n.type === 'ability' || n.type === 'passive') && r > 0 ? h('button', { class: 'btn small', onclick: () => { ui.close('skills'); openLoadout(game, player, { focus: n.id }); } }, 'Equip…') : null)].filter(Boolean));
    };
    const buy = (n) => {
      if (!unlockNode(save, sid, player.kit, tree, n)) { const why = lockReason(tree, S.skills, n, S.skillPoints); if (why && why !== 'max') toast(why); game.audio?.ui('back'); return; }
      player.refreshLoadout();
      game.audio?.levelUp();
      toast(`Unlocked ${n.name}`);
      ui.refresh('skills');
    };
    for (const n of tree.nodes) {
      const st = status(n), r = nodeRank(S.skills, n);
      const kindCol = n.type === 'ability' ? (ABILITY_KINDS[n.ref.kind] ?? ABILITY_KINDS.technique).color : n.type === 'passive' ? '#ffcf4a' : n.type === 'upgrade' ? '#b8bcc8' : '#ff8a8a';
      const b = h('button', { class: `tt-node ${n.type} ${st}${n.capstone ? ' cap' : ''}${sel === n.nid ? ' sel' : ''}`, title: n.name, 'data-autofocus': sel === n.nid, style: `left:${px(n) - NODE / 2}px;top:${py(n) - NODE / 2}px;--kc:${kindCol}`,
        onclick: () => { if (sel !== n.nid) { sel = n.nid; markSel(); renderDetail(); game.audio?.ui('move'); } else if (nodeRank(S.skills, n) < n.max) buy(n); } },
      h('span', { class: 'tt-icon' }, n.icon ?? '◆'),
      n.max > 1 ? h('span', { class: 'tt-rank' }, `${r}/${n.max}`) : r < n.max ? h('span', { class: 'tt-cost' }, String(n.cost)) : null,
      h('span', { class: 'tt-name' }, n.name.replace(/^(Domain|Ultimate): /, '')));
      b.dataset.nid = n.nid;
      b.addEventListener('navfocus', () => { if (sel !== n.nid) { sel = n.nid; markSel(); renderDetail(); } });
      canvas.appendChild(b);
    }
    const markSel = () => canvas.querySelectorAll('.tt-node').forEach((b) => b.classList.toggle('sel', b.dataset.nid === sel));
    renderDetail();
    const info = SORCERERS[sid];
    const wrap = h('div', { class: 'tt-wrap' }, canvas);
    el.appendChild(h('div', { class: 'panel tt-panel' },
      h('div', { class: 'tt-head' },
        h('h2', {}, `Technique Tree · ${info.technique ?? info.name}`),
        h('div', { class: 'tt-points' }, `◆ ${S.skillPoints} technique point${S.skillPoints === 1 ? '' : 's'}`)),
      h('div', { class: 'hint', style: 'margin:0 0 6px' }, 'Select a node, then select it again (or press Unlock) to spend points. +2 points per level. Equip unlocked abilities and talismans in the Loadout.'),
      h('div', { class: 'tt-body' }, wrap, detail),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:8px;gap:8px' },
        h('button', { class: 'btn', onclick: () => { ui.close('skills'); openLoadout(game, player); } }, '🎴 Loadout'),
        h('button', { class: 'btn', onclick: close }, 'Close'))));
    // keep the selected node in view
    requestAnimationFrame(() => { const n = tree.by[sel]; if (n && wrap.scrollLeft === 0 && wrap.scrollTop === 0) { wrap.scrollLeft = Math.max(0, px(n) - wrap.clientWidth / 2); } });
  }, { dim: true, onBack: close });
}
