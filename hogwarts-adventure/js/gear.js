// Gear: wands, robes and hats. Wands and robes carry small bonuses (power, armour, haste,
// regeneration, health, magic); hats are for looks. Buy them by owl-order catalogue with
// Sickles, or earn special pieces from the story.
import { G, HOUSES } from './state.js';
import { coins, addCoins } from './items.js';
import { applyStats } from './progress.js';

export const GEAR = {
  wand: {
    holly: { name: 'Holly & phoenix feather', desc: 'Your first wand. Loyal and true.', price: 0, stats: {} },
    yew: { name: 'Yew & dragon heartstring', desc: '+6% spell power', price: 120, year: 2, stats: { power: 0.06 } },
    vine: { name: 'Vine & unicorn hair', desc: '8% shorter cooldowns', price: 160, year: 3, stats: { haste: 0.08 } },
    willow: { name: 'Willow & Thestral hair', desc: '+20 magic, +10% regeneration', price: 200, year: 4, stats: { mana: 20, regen: 0.1 } },
    ebony: { name: 'Ebony & dragon heartstring', desc: '+12% spell power', price: 320, year: 5, stats: { power: 0.12 } },
    elder: { name: 'The Elder Branch', desc: '+18% power, 5% shorter cooldowns. Taken from the Hollow King.', price: 0, unlock: () => !!G.save.flags?.sagaComplete || !!G.save.flags?.y7?.victory, stats: { power: 0.18, haste: 0.05 } },
  },
  robe: {
    school: { name: 'School robes', desc: 'Black, practical, slightly singed.', price: 0, stats: {}, look: {} },
    duelling: { name: 'Duelling robes', desc: '8% less damage taken', price: 140, year: 2, stats: { armour: 0.08 }, look: { robeColor: '#2a1a1a', liningColor: '#a02020' } },
    dress: { name: 'Yule Ball dress robes', desc: 'Midnight blue with gold. Purely for looks.', price: 90, year: 4, stats: {}, look: { robeColor: '#1a2050', liningColor: '#d8b040' } },
    dragonhide: { name: 'Dragonhide coat', desc: '15% less damage taken. A gift after the First Task.', price: 0, unlock: () => !!G.save.flags?.y4?.task1 || (G.save.year || 1) > 4, stats: { armour: 0.15 }, look: { robeColor: '#3a2416', liningColor: '#6a4a2a' } },
    auror: { name: 'Auror’s greatcoat', desc: '12% less damage taken, +15 health', price: 420, year: 6, stats: { armour: 0.12, hp: 15 }, look: { robeColor: '#1a2a2a', liningColor: '#c0c8c0' } },
  },
  hat: {
    none: { name: 'No hat', desc: '', price: 0 },
    pointed: { name: 'Pointed hat', desc: 'The classic.', price: 0, look: { hat: true } },
    purple: { name: 'Starry purple hat', desc: 'Very Headmistress-y.', price: 60, look: { hat: true, hatColor: '#4a2a7a' } },
    green: { name: 'Mossy green hat', desc: 'Thornwick would approve.', price: 60, look: { hat: true, hatColor: '#2a4a2a' } },
  },
};

export function ensureGear() {
  const s = G.save;
  if (!s.gear) s.gear = { wand: s.look?.wand && GEAR.wand[s.look.wand] ? s.look.wand : 'holly', robe: 'school', hat: s.look?.hat ? 'pointed' : 'none', owned: ['wand:holly', 'robe:school', 'hat:none', 'hat:pointed'] };
  if (s.look?.wand && !GEAR.wand[s.gear.wand]) s.gear.wand = 'holly';
  return s.gear;
}
export const owns = (kind, id) => { const g = ensureGear(); const d = GEAR[kind][id]; return g.owned.includes(`${kind}:${id}`) || (d?.unlock && d.unlock()); };
export const available = (kind, id) => { const d = GEAR[kind][id]; return !d.unlock && (G.save.year || 1) >= (d.year || 1); };

G.gearStats = () => {
  if (!G.save) return {};
  const g = ensureGear();
  const out = {};
  for (const kind of ['wand', 'robe']) for (const [k, v] of Object.entries(GEAR[kind][g[kind]]?.stats || {})) out[k] = (out[k] || 0) + v;
  return out;
};
// look overrides for the player model
export function gearLook() {
  const g = ensureGear();
  return { ...(GEAR.robe[g.robe]?.look || {}), ...(GEAR.hat[g.hat]?.look || { hat: false }) };
}

function equip(kind, id) {
  const g = ensureGear();
  g[kind] = id;
  if (kind === 'wand' && G.save.look) G.save.look.wand = ['holly', 'yew', 'vine', 'willow', 'ebony', 'elder'].includes(id) ? id : 'holly';
  if (kind === 'hat' && G.save.look) G.save.look.hat = id !== 'none';
  G.player.rebuild();
  applyStats();
  G.ui.buildSpellBar?.();
}

export function openGear() {
  let entry;
  const tabs = [['wand', 'Wands'], ['robe', 'Robes'], ['hat', 'Hats']];
  let tab = 'wand';
  const render = (focus = 0) => {
    if (entry) G.ui.close(entry);
    entry = G.ui.open((w) => {
      const g = ensureGear();
      w.innerHTML = `<div class="panel wide"><h2 class="m-title">Gear</h2><p class="m-sub">${coins()} Sickles · owl-order catalogue</p><div class="tabs"></div><div class="gear-list"></div><div class="row"></div></div>`;
      const tb = w.querySelector('.tabs');
      for (const [k, label] of tabs) { const b = document.createElement('button'); b.className = 'tab nav' + (k === tab ? ' on' : ''); b.textContent = label; b.addEventListener('click', () => { tab = k; render(); }); tb.appendChild(b); }
      const list = w.querySelector('.gear-list');
      for (const [id, d] of Object.entries(GEAR[tab])) {
        const have = owns(tab, id);
        const can = have || available(tab, id);
        const on = g[tab] === id;
        const status = on ? 'Equipped' : have ? 'Equip' : d.unlock ? 'Earned in the story' : can ? `Buy · ${d.price} Sickles` : `From Year ${d.year}`;
        const b = G.ui.button(list, `<b>${d.name}</b><small>${d.desc || ''}</small><i>${status}</i>`, () => {
          if (on) return;
          if (have) { equip(tab, id); G.audio.sfx('card'); render(entry.focus); return; }
          if (!can) { G.ui.toast(d.unlock ? 'You will earn this in the story.' : `Available from Year ${d.year}.`, 'info'); return; }
          if (coins() < d.price) { G.ui.toast('Not enough Sickles.', 'info'); return; }
          addCoins(-d.price);
          g.owned.push(`${tab}:${id}`);
          equip(tab, id);
          G.audio.sfx('quest');
          G.ui.toast(`${d.name} arrives by owl!`, 'info');
          render(entry.focus);
        }, 'gear-row' + (on ? ' on' : '') + (can ? '' : ' locked'));
      }
      G.ui.button(w.querySelector('.row'), 'Back', () => G.ui.close(entry), 'primary');
    }, { focus, pauseCloses: true });
  };
  render();
}
