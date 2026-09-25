// On-screen touch controls: floating joystick on the left, action buttons
// on the right (landscape layout). Writes into input.touch.
import { h } from './ui.js';

const BUTTONS = [
  // id, label, right(px), bottom(px), size
  ['attack', '⚔', 34, 40, 86],
  ['dodge', '⤳', 136, 22, 58],
  ['ranged', '✦', 24, 140, 58],
  ['t1', '1', 150, 96, 52],
  ['t2', '2', 104, 160, 52],
  ['t3', '3', 60, 214, 52],
  ['heal', '✚', 206, 30, 48],
  ['domain', '領域', 196, 150, 60],
];

export class TouchControls {
  constructor(game) {
    this.game = game;
    const input = game.input;
    const root = document.getElementById('touch');
    this.root = root;
    root.innerHTML = '';
    const zone = h('div', { class: 'stick-zone' });
    const base = h('div', { class: 'stick-base' }, h('div', { class: 'stick-knob' }));
    zone.appendChild(base); root.appendChild(zone);
    const knob = base.firstChild;
    let id = null, ox = 0, oy = 0;
    const R = 55;
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return; id = e.pointerId; zone.setPointerCapture(id);
      ox = e.clientX; oy = e.clientY; base.style.display = 'block';
      base.style.left = ox + 'px'; base.style.top = (oy - zone.getBoundingClientRect().top) + 'px';
      knob.style.transform = ''; input.lastDevice = 'touch';
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const m = Math.min(1, l / R);
      input.touch.stickVec = l > 6 ? { x: dx / R, y: -dy / R } : { x: 0, y: 0 };
      if (m < 0.1) input.touch.stickVec = { x: 0, y: 0 };
    });
    const end = (e) => { if (e.pointerId !== id) return; id = null; base.style.display = 'none'; input.touch.stickVec = { x: 0, y: 0 }; };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    this.btns = {};
    for (const [a, label, right, bottom, size] of BUTTONS) {
      const b = h('div', { class: 'tbtn', style: `right:calc(${right}px + env(safe-area-inset-right,0px));bottom:calc(${bottom}px + env(safe-area-inset-bottom,0px));width:${size}px;height:${size}px;font-size:${size > 70 ? 30 : a === 'domain' ? 14 : 18}px` }, h('div', { class: 'cd' }), h('span', {}, label));
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); input.touch.buttons[a] = true; b.classList.add('on'); input.lastDevice = 'touch'; });
      const up = () => { input.touch.buttons[a] = false; b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      root.appendChild(b); this.btns[a] = b;
    }
    const pause = h('button', { class: 'tpause', onclick: () => game.pause() }, '❚❚');
    root.appendChild(pause);
    if (!document.getElementById('rotate-hint')) document.body.appendChild(h('div', { id: 'rotate-hint' }, 'Rotate your device to landscape to play ⟲'));
  }
  show(on) { this.root.classList.toggle('hidden', !on); document.body.classList.toggle('playing', on); }
  // p: cooldown fraction 0..1 per action
  setCooldown(a, frac, ready = false) {
    const b = this.btns[a]; if (!b) return;
    b.firstChild.style.setProperty('--p', (frac * 100).toFixed(0) + '%');
    if (a === 'domain') b.classList.toggle('ready-ult', ready);
  }
}
