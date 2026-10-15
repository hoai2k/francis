// Player names for online play.
//
// Each local player (P1, P2, ...) joins racing under "Default" (made from their driver, see
// resolveNames, so it follows the driver they pick) and goes straight to picking a driver. Clicking
// their name tag on the select screen opens the other choices: one of the names saved on this
// device, or "New name…" (typed on an on-screen keyboard that works with a controller, or with a
// real keyboard / the phone's own keyboard).
import { DRIVERS } from '../driver.js';
import { esc, cleanName } from './proto.js';

const KEY = 'brickkart.names.v1';
const MAX_SAVED = 12;

export class Names {
  constructor() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* storage unavailable */ }
    this.saved = Array.isArray(d.saved) ? d.saved.filter((n) => typeof n === 'string').map(cleanName).slice(0, MAX_SAVED) : [];
    this.last = d.last && typeof d.last === 'object' ? d.last : {};
  }
  store() { try { localStorage.setItem(KEY, JSON.stringify({ saved: this.saved, last: this.last })); } catch { /* storage unavailable */ } }
  // the choices for a player: 'default', the saved names, 'new'
  options() { return ['default', ...this.saved, 'new']; }
  remember(slot, choice) { this.last[slot] = choice; this.store(); }
  add(name) {
    name = cleanName(name);
    this.saved = [name, ...this.saved.filter((n) => n !== name)].slice(0, MAX_SAVED);
    this.store();
    return name;
  }
  remove(name) {
    this.saved = this.saved.filter((n) => n !== name);
    for (const k of Object.keys(this.last)) if (this.last[k] === name) this.last[k] = 'default';
    this.store();
  }
}

// Names for everyone in the room. humans: [{ key, custom (a chosen name or null), d }] in room order
// (driver indices). "Default" leaves the name up to us: before a race it's "Player N" (N = place in
// the room), and once the race starts (race = true) it becomes the driver's name if nobody else in
// the room has that driver (or took it as their name), else it stays "Player N". Every screen runs
// this on the same data, so they all agree.
export function resolveNames(humans, race = false) {
  const out = new Map();
  humans.forEach((h, i) => {
    let n = h.custom || `Player ${i + 1}`;
    if (!h.custom && race) {
      const dn = DRIVERS[h.d]?.name;
      if (dn && !humans.some((o, j) => j !== i && (o.d === h.d || o.custom === dn))) n = dn;
    }
    out.set(h.key, n);
  });
  return out;
}

// The on-screen keyboard for "New name…", shown over the select screen for one player.
const ROWS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ-.!?', '0123456789', ['␣', '⌫', 'OK']];
export class NameKeyboard {
  constructor(game, root, player, done) {
    this.game = game; this.p = player; this.done = done;
    this.r = 0; this.c = 0;
    const el = this.el = document.createElement('div');
    el.className = 'olkbd-back';
    const keys = ROWS.map((row, r) => `<div class="olkrow">${[...row].map((k, c) => `<button class="olkey${k.length > 1 || k === '␣' || k === '⌫' ? ' wide' : ''}" data-act="olk:${r}:${c}">${esc(k)}</button>`).join('')}</div>`).join('');
    el.innerHTML = `<div class="olkbd" style="--pc:${player.color}"><h3><i>P${player.id + 1}</i> Type your name</h3>
      <input class="olkbd-in" maxlength="16" spellcheck="false" autocomplete="off" autocapitalize="words" placeholder="Your name">
      <div class="olkeys">${keys}</div>
      <div class="olkhint"><span><b>A</b> type</span><span><b>B</b> delete</span><span><b>Start</b> done</span><span><b>Esc</b> cancel</span></div></div>`;
    root.appendChild(el);
    this.input = el.querySelector('.olkbd-in');
    this.btns = [...el.querySelectorAll('.olkey')];
    // a real keyboard (or the phone's) types straight into the field
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); this.finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); this.finish(false); }
    });
    if (player.device === 'kb' || player.device === 'kb2' || player.device === 'touch') setTimeout(() => this.input.focus(), 30);
    this.mark();
  }
  key(r, c) { const row = ROWS[r]; return typeof row === 'string' ? row[c] : row[c]; }
  rowLen(r) { return ROWS[r].length; }
  mark() {
    const n = ROWS.slice(0, this.r).reduce((a, row) => a + row.length, 0) + this.c;
    this.btns.forEach((b, i) => b.classList.toggle('focus', i === n));
  }
  press(r, c) {
    const k = this.key(r, c), v = this.input.value;
    if (k === 'OK') { this.finish(true); return; }
    if (k === '⌫') this.input.value = v.slice(0, -1);
    else if (v.length < 16) {
      const ch = k === '␣' ? ' ' : k;
      // Capitalised words, lower case after
      this.input.value = v + (!v || v.endsWith(' ') ? ch : ch.toLowerCase());
    }
    this.game.audio.sfx('click');
  }
  // controller / keyboard navigation (only the player who opened it)
  update() {
    if (document.activeElement === this.input && this.p.device !== 'touch' && !this.p.device.startsWith('pad')) return;
    for (const [dev, m] of this.game.menuEvents) {
      if (dev !== this.p.device && !(this.p.device === 'touch' && dev === 'kb')) continue;
      if (m.up) this.r = (this.r + ROWS.length - 1) % ROWS.length;
      if (m.down) this.r = (this.r + 1) % ROWS.length;
      this.c = Math.min(this.c, this.rowLen(this.r) - 1);
      if (m.left) this.c = (this.c + this.rowLen(this.r) - 1) % this.rowLen(this.r);
      if (m.right) this.c = (this.c + 1) % this.rowLen(this.r);
      if (m.up || m.down || m.left || m.right) { this.mark(); this.game.audio.sfx('click'); }
      if (m.ok) this.press(this.r, this.c);
      if (m.x) this.press(4, 1);
      if (m.start) { this.finish(true); return; }
      if (m.back) { if (this.input.value) this.press(4, 1); else { this.finish(false); return; } }
    }
  }
  act(a) {
    const [, r, c] = a.split(':');
    if (ROWS[+r] && +c < this.rowLen(+r)) { this.r = +r; this.c = +c; this.mark(); this.press(+r, +c); }
  }
  finish(ok) {
    if (this.closed) return;
    const name = this.input.value.trim();
    if (ok && !name) { this.game.audio.sfx('wrong'); return; }
    this.closed = true;
    this.el.remove();
    this.game.audio.sfx(ok ? 'select' : 'back');
    this.done(ok ? cleanName(name) : null);
  }
}
