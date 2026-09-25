// Screen manager with spatial focus navigation so every menu works with a
// mouse, touch, keyboard (arrows/Enter/Esc) or gamepad (d-pad/stick/A/B).
export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screens');
    this.stack = [];        // open screens (top = active)
    this.focusEl = null;
  }
  // Create and show a screen. build(el) fills it; opts.onBack when B/Esc.
  open(id, build, opts = {}) {
    this.close(id);
    const el = document.createElement('section');
    el.className = 'screen' + (opts.dim ? ' dim' : '');
    el.id = 'scr-' + id;
    this.root.appendChild(el);
    const s = { id, el, build, opts };
    this.stack.push(s);
    build(el, s);
    this.autoFocus(s);
    return s;
  }
  refresh(id) {
    const s = this.stack.find((x) => x.id === id); if (!s) return;
    const idx = this.focusables(s).indexOf(this.focusEl);
    const scroll = [...s.el.querySelectorAll('.panel')].map((p) => p.scrollTop);
    s.el.innerHTML = ''; s.build(s.el, s);
    [...s.el.querySelectorAll('.panel')].forEach((p, i) => { p.scrollTop = scroll[i] ?? 0; });
    const f = this.focusables(s);
    this.setFocus(f[Math.min(Math.max(0, idx), f.length - 1)]);
  }
  close(id) {
    const i = this.stack.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [s] = this.stack.splice(i, 1);
    s.el.remove(); s.opts.onClose?.();
    const top = this.top(); if (top) this.autoFocus(top);
  }
  closeAll() { while (this.stack.length) this.close(this.stack[this.stack.length - 1].id); }
  top() { return this.stack[this.stack.length - 1]; }
  isOpen(id) { return this.stack.some((s) => s.id === id); }
  get active() { return this.stack.length > 0 && this.stack.some((s) => !s.opts.passive); }
  focusables(s) { return [...s.el.querySelectorAll('button:not([disabled]), [data-nav], select, input')].filter((e) => e.offsetParent !== null && !e.closest('[data-nonav]')); }
  autoFocus(s) {
    const f = this.focusables(s);
    const pref = s.el.querySelector('[data-autofocus]') || f[0];
    this.setFocus(pref);
  }
  setFocus(el) {
    if (this.focusEl) this.focusEl.classList.remove('focus'), this.focusEl.closest('.setting')?.classList.remove('focus');
    this.focusEl = el || null;
    if (el) {
      el.classList.add('focus');
      el.closest('.setting')?.classList.add('focus');
      el.scrollIntoView?.({ block: 'nearest' });
      el.dispatchEvent(new CustomEvent('navfocus'));
    }
  }
  move(dx, dy) {
    const s = this.top(); if (!s) return;
    const f = this.focusables(s); if (!f.length) return;
    if (!this.focusEl || !f.includes(this.focusEl)) return this.setFocus(f[0]);
    const cur = this.focusEl.getBoundingClientRect();
    const cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2;
    let best = null, bestD = Infinity;
    for (const e of f) {
      if (e === this.focusEl) continue;
      const r = e.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const ddx = ex - cx, ddy = ey - cy;
      const along = ddx * dx + ddy * dy;
      if (along <= 4) continue;
      const perp = Math.abs(ddx * dy) + Math.abs(ddy * dx);
      const d = along + perp * 2.5;
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) { this.setFocus(best); this.game.audio?.ui('move'); }
  }
  // Called every frame while a screen is open.
  update() {
    const s = this.top(); if (!s || s.opts.passive) return;
    const m = this.game.input.menu();
    const el = this.focusEl;
    const isRange = el && el.tagName === 'INPUT' && el.type === 'range';
    const isSelect = el && el.tagName === 'SELECT';
    if (m.up) this.move(0, -1);
    if (m.down) this.move(0, 1);
    if ((m.left || m.right) && (isRange || isSelect)) {
      const dir = m.right ? 1 : -1;
      if (isRange) { el.value = String(Number(el.value) + dir * Number(el.step || 1)); }
      else { el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + dir)); }
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (m.left) this.move(-1, 0);
    else if (m.right) this.move(1, 0);
    if (s.opts.onNav) s.opts.onNav(m);
    if (m.confirm && el) {
      if (el.tagName === 'INPUT' && el.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change', { bubbles: true })); }
      else if (!isRange && !isSelect) { el.click(); }
      this.lastConfirmDevice = m.device;
    }
    if (m.back && s.opts.onBack) { this.game.audio?.ui('back'); s.opts.onBack(); }
  }
}

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  return el;
}

export function toast(text, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls; el.textContent = text;
  document.getElementById('toast-layer').appendChild(el);
  setTimeout(() => el.remove(), cls.includes('domain') ? 3300 : 2700);
}
