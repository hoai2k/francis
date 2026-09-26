// In-game HUD: per-player health / Cursed Energy cards, ability bar with
// cooldowns, objective tracker, minimap, interaction prompts, boss bar,
// coins, and the co-op join hint.
import * as THREE from 'three/webgpu';
import { h } from './ui.js';
import { SORCERERS } from '../sorcerers/index.js';
import { isMobile } from '../util.js';

const KEYS = { ranged: 'RMB', t1: '1', t2: '2', t3: '3', heal: 'Q', domain: 'F', art1: 'R', art2: 'T' };
const PADKEYS = { ranged: 'RT', t1: 'LB', t2: 'RB', t3: 'Y', heal: '↑', domain: 'LT', art1: '←', art2: '→' };
const tmp = new THREE.Vector3();

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('hud');
    this.build();
    this.t = 0;
  }
  build() {
    const r = this.root; r.innerHTML = '';
    this.cards = h('div', { class: 'pcards' }); r.appendChild(this.cards);
    this.abBar = h('div', { class: 'abilities' }); r.appendChild(this.abBar);
    this.obj = h('div', { class: 'objective hidden' }, h('div', { class: 't' }), h('div', { class: 'd' })); r.appendChild(this.obj);
    this.mini = h('canvas', { class: 'minimap hidden', width: 128, height: 128 }); r.appendChild(this.mini);
    this.boss = h('div', { class: 'bossbar hidden' }, h('div', { class: 'n' }), h('div', { class: 'bar' }, h('b'), h('i'))); r.appendChild(this.boss);
    this.coins = h('div', { class: 'coins' }, '◆ 0'); r.appendChild(this.coins);
    this.join = h('div', { class: 'join-hint' }, isMobile ? '' : 'Controller: press Start to join'); r.appendChild(this.join);
    this.prompts = new Map();
    this.cardEls = [];
    this.abilityRows = new Map();
  }
  show(on) { this.root.classList.toggle('hidden', !on); }
  rebuildCards() {
    this.cards.innerHTML = ''; this.cardEls = [];
    for (const p of this.game.players) {
      const info = SORCERERS[p.sorcerer];
      const hpI = h('i'), hpB = h('b'), ceI = h('i');
      const name = h('span', {}, `P${p.index + 1} · ${info.name.toUpperCase()}`); const extra = h('span', {}, '');
      const card = h('div', { class: 'pcard', style: `--pc:${p.color}` }, h('div', { class: 'name' }, name, extra), h('div', { class: 'bar' }, hpB, hpI), h('div', { class: 'bar ce' }, ceI));
      this.cards.appendChild(card);
      this.cardEls.push({ p, hpI, hpB, ceI, ce: card.children[2], extra, card, last: {} });
    }
    this.abilityRows.clear();
  }
  buildAbilities(p) {
    const row = h('div', { class: 'ability-row', style: `--pc:${p.color}` });
    row.appendChild(h('div', { class: 'ability-player' }, `P${p.index + 1} · ${SORCERERS[p.sorcerer].name}`));
    const icons = h('div', { class: 'ability-icons' });
    row.appendChild(icons); this.abBar.appendChild(row);
    const pad = p.device.startsWith('pad');
    const keys = pad ? PADKEYS : KEYS;
    const els = {};
    const mk = (slot, ab, ult = false) => {
      const cd = h('div', { class: 'cd' });
      const cnt = h('div', { class: 'cnt' });
      const el = h('div', { class: 'ab' + (ult ? ' ult' : ''), title: ab?.name ?? '' }, h('div', { class: 'key' }, keys[slot] ?? ''), h('span', {}, ab?.icon ?? '·'), cnt, cd, h('div', { class: 'lbl' }, ab?.name ?? ''));
      icons.appendChild(el); els[slot] = { el, cd, cnt, ab };
    };
    const k = p.kit;
    for (const slot of ['ranged', 't1', 't2', 't3']) if (k.slots[slot]) mk(slot, k.slots[slot]);
    mk('heal', { name: 'Reverse CT', icon: '✚' });
    p.artifacts.forEach((a, i) => mk('art' + (i + 1), { name: a.base.name.split(' ').slice(-1)[0], icon: a.base.icon }));
    if (k.domain) mk('domain', { name: k.domain.name, icon: k.domain.icon ?? '領' }, true);
    this.abilityRows.set(p, { p, els, device: p.device, kit: p.kit, sig: p.artifacts.map((a) => a.it.uid).join() });
  }
  setObjective(title, desc) {
    this.obj.classList.toggle('hidden', !title);
    this.obj.children[0].textContent = title || ''; this.obj.children[1].textContent = desc || '';
  }
  setBoss(boss) {
    this.bossRef = boss;
    this.boss.classList.toggle('hidden', !boss);
    if (boss) this.boss.children[0].textContent = boss.displayName ?? boss.name;
  }
  // world-anchored prompt ("E  Talk")
  prompt(id, pos, text, onTap) {
    let el = this.prompts.get(id);
    if (!el) { el = h('div', { class: 'prompt' }); if (onTap) el.addEventListener('pointerdown', (e) => { e.stopPropagation(); onTap(); }); this.root.appendChild(el); this.prompts.set(id, el); }
    el.textContent = text; el.dataset.seen = '1';
    const v = tmp.copy(pos).project(this.game.rig.camera);
    el.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    el.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  }
  update(dt) {
    const g = this.game;
    this.t += dt;
    for (const [id, el] of this.prompts) { if (!el.dataset.seen) { el.remove(); this.prompts.delete(id); } else delete el.dataset.seen; }
    if (this.cardEls.length !== g.players.length) this.rebuildCards();
    for (const c of this.cardEls) {
      const p = c.p;
      const hp = Math.max(0, p.hp / p.maxHp), ce = p.ce / p.maxCe;
      if (c.last.hp !== hp) { c.hpI.style.width = (hp * 100).toFixed(1) + '%'; c.hpB.style.width = (hp * 100).toFixed(1) + '%'; c.last.hp = hp; }
      if (c.last.ce !== ce) { c.ceI.style.width = (ce * 100).toFixed(1) + '%'; c.ce.classList.toggle('full', ce >= 1); c.last.ce = ce; }
      const ex = p.dead ? '✖ DOWN' : p.downed ? `REVIVE ${Math.ceil(p.downT)}s` : `✚${p.healCharges}`;
      if (c.last.ex !== ex) { c.extra.textContent = ex; c.last.ex = ex; }
    }
    const stale = this.abilityRows.size !== g.players.length || g.players.some((p) => {
      const row = this.abilityRows.get(p);
      return !row || row.device !== p.device || row.kit !== p.kit || row.sig !== p.artifacts.map((a) => a.it.uid).join();
    });
    if (stale) {
      this.abBar.innerHTML = ''; this.abilityRows.clear();
      this.abBar.classList.toggle('multi', g.players.length > 1);
      this.cards.classList.toggle('multi', g.players.length > 1);
      for (const p of g.players) this.buildAbilities(p);
    }
    for (const { p, els } of this.abilityRows.values()) {
      for (const slot in els) {
        const e = els[slot];
        let frac = 0, ready = true, cnt = '';
        if (slot === 'heal') { frac = p.healCharges > 0 ? p.healCd / 1.2 : 1; ready = p.healCharges > 0; cnt = String(p.healCharges); }
        else if (slot.startsWith('art')) { const a = p.artifacts[+slot[3] - 1]; if (!a) continue; frac = a.cdLeft / (a.cd * (1 - p.stats.cdr)); ready = a.cdLeft <= 0; }
        else if (slot === 'domain') { frac = 1 - p.ce / p.maxCe; ready = p.ce >= p.maxCe && !g.domain; }
        else { const ab = p.kit.slots[slot]; frac = ab.cdLeft / Math.max(0.01, ab.cd * p.kit.cdr); ready = ab.cdLeft <= 0 && p.ce >= (ab.ce ?? 0); if (ab.maxCharges > 1) cnt = String(ab.chargesLeft ?? ''); }
        e.cd.style.height = (Math.min(1, frac) * 100).toFixed(0) + '%';
        e.el.classList.toggle('ready', ready);
        if (e.cnt.textContent !== cnt) e.cnt.textContent = cnt;
        if (p.device === 'touch') g.touch?.setCooldown(slot, Math.min(1, frac), ready);
      }
    }
    // boss
    if (this.bossRef) {
      const b = this.bossRef; const f = Math.max(0, b.hp / b.maxHp);
      this.boss.querySelector('i').style.width = (f * 100).toFixed(1) + '%';
      this.boss.querySelector('b').style.width = (f * 100).toFixed(1) + '%';
      if (b.dead) this.setBoss(null);
    }
    const coins = g.run?.coins ?? g.save?.data?.coins ?? 0;
    if (this.lastCoins !== coins) { this.coins.textContent = '◆ ' + coins; this.lastCoins = coins; }
    const canJoin = !isMobile && g.players.length < 4 && g.state === 'playing';
    this.join.classList.toggle('hidden', !canJoin);
  }
}
