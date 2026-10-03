// Brick Kart workbench: choose the drivers and karts for Simplified mode and export them as
// JSON. The selection starts from the set in js/simplified.js (everything when that's null).
import { DRIVERS, UNIVERSES } from '../js/driver.js';
import { KARTS, KART_GROUPS } from '../js/vehicles.js';
import { SIMPLIFIED } from '../js/simplified.js';
import { driverPortrait, kartPortrait } from '../js/showcase.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = (c) => '#' + (c ?? 0xffffff).toString(16).padStart(6, '0');

// what the game uses now
const base = {
  drivers: new Set(SIMPLIFIED.drivers ?? DRIVERS.map((d) => d.id)),
  karts: new Set(SIMPLIFIED.karts ?? KARTS.map((k) => k.id)),
};
const sel = { drivers: new Set(base.drivers), karts: new Set(base.karts) };

const groups = {
  drivers: UNIVERSES.map((u) => ({ id: u.id, name: u.name, color: u.color, items: DRIVERS.filter((d) => d.from === u.id) })),
  // karts by pack, in the order the game lists them
  karts: KART_GROUPS.map((g) => ({ id: g.id, name: g.name, color: '#f2cd37', items: KARTS.filter((k) => k.group === g.id) })),
};

const cardHtml = (kind, it) => `<div class="card${kind === 'karts' ? ' kart' : ''}" tabindex="0" role="checkbox" data-kind="${kind}" data-id="${esc(it.id)}"
  style="--c:${hex(kind === 'karts' ? it.kart : it.color)}"><img alt="" data-src="${kind}:${esc(it.id)}"><span>${esc(kind === 'karts' ? it.vehicle : it.name)}</span><div class="chk">✓</div></div>`;

function build(kind) {
  $('#' + kind).innerHTML = groups[kind].filter((g) => g.items.length).map((g) => `
    <section data-group="${g.id}"><div class="ghead" style="--gc:${g.color}"><h2>${esc(g.name)}</h2><span></span>
      <button data-gall="${kind}:${g.id}">All</button><button data-gnone="${kind}:${g.id}">None</button></div>
    <div class="grid">${g.items.map((it) => cardHtml(kind, it)).join('')}</div></section>`).join('');
}
build('drivers');
build('karts');

function refresh() {
  for (const c of document.querySelectorAll('.card')) {
    const on = sel[c.dataset.kind].has(c.dataset.id);
    c.classList.toggle('off', !on);
    c.setAttribute('aria-checked', on);
  }
  for (const kind of ['drivers', 'karts']) {
    for (const g of groups[kind]) {
      const sp = document.querySelector(`#${kind} [data-group="${g.id}"] .ghead span`);
      if (sp) sp.textContent = `${g.items.filter((it) => sel[kind].has(it.id)).length} / ${g.items.length}`;
    }
  }
  $('#count').innerHTML = `<b>${sel.drivers.size}</b> / ${DRIVERS.length} characters · <b>${sel.karts.size}</b> / ${KARTS.length} karts`;
}
refresh();

const toggle = (card) => {
  const set = sel[card.dataset.kind], id = card.dataset.id;
  if (set.has(id)) set.delete(id); else set.add(id);
  refresh();
};
document.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) { toggle(card); return; }
  const t = e.target.closest('[data-tab]');
  if (t) {
    for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('on', b === t);
    $('#drivers').classList.toggle('hidden', t.dataset.tab !== 'drivers');
    $('#karts').classList.toggle('hidden', t.dataset.tab !== 'karts');
    return;
  }
  const g = e.target.closest('[data-gall], [data-gnone]');
  if (g) {
    const [kind, gid] = (g.dataset.gall || g.dataset.gnone).split(':');
    for (const it of groups[kind].find((x) => x.id === gid).items) { if (g.dataset.gall) sel[kind].add(it.id); else sel[kind].delete(it.id); }
    refresh();
  }
});
document.addEventListener('keydown', (e) => {
  const card = e.target.closest?.('.card');
  if (card && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); toggle(card); }
});

// the visible tab's buttons act on that tab
const activeKind = () => ($('#karts').classList.contains('hidden') ? 'drivers' : 'karts');
$('#all').onclick = () => { const k = activeKind(); for (const it of (k === 'drivers' ? DRIVERS : KARTS)) sel[k].add(it.id); refresh(); };
$('#none').onclick = () => { sel[activeKind()].clear(); refresh(); };
$('#reset').onclick = () => { sel.drivers = new Set(base.drivers); sel.karts = new Set(base.karts); refresh(); toast('Back to the set in the game'); };

// export in game order
const payload = () => ({
  game: 'brick-kart',
  kind: 'simplified-roster',
  exported: new Date().toISOString(),
  drivers: DRIVERS.filter((d) => sel.drivers.has(d.id)).map((d) => d.id),
  karts: KARTS.filter((k) => sel.karts.has(k.id)).map((k) => k.id),
});
$('#export').onclick = () => {
  const p = payload();
  if (!p.drivers.length || !p.karts.length) { toast('Pick at least one character and one kart'); return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'brick-kart-simplified.json' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Exported ${p.drivers.length} characters and ${p.karts.length} karts`);
};
$('#copy').onclick = async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(payload(), null, 2)); toast('JSON copied'); } catch { toast('Copy failed: use Export instead'); }
};

let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

// portraits render a few per frame (the visible tab first)
const imgs = [...document.querySelectorAll('img[data-src]')];
function fill() {
  const kind = activeKind();
  for (let n = 0; n < 3; n++) {
    const i = imgs.findIndex((im) => im.closest('#' + kind));
    const img = imgs.splice(i >= 0 ? i : 0, 1)[0];
    if (!img) return;
    const [k, id] = img.dataset.src.split(':');
    img.src = k === 'drivers' ? driverPortrait(DRIVERS.find((d) => d.id === id)) : kartPortrait(KARTS.find((x) => x.id === id));
  }
  requestAnimationFrame(fill);
}
requestAnimationFrame(fill);
