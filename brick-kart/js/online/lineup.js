// The line-up: once the host picks a map, every player's driver stands in their kart side by side
// with their online name over them, while each screen builds the race (a spinner per player turns
// into a tick when they're loaded).
import * as THREE from 'three';
import { Showcase } from '../showcase.js';
import { DRIVERS } from '../driver.js';
import { KARTS } from '../vehicles.js';
import { GLIDERS } from '../gliders.js';
import { esc } from './proto.js';

const V = new THREE.Vector3();

export class Lineup {
  // people: [{ uid, name, d, k, g }] (indices into DRIVERS / KARTS / GLIDERS); title: the map's name
  // onLeave: leave the room (Back twice, or the Leave button)
  constructor(game, people, title, sub, onLeave = null) {
    this.game = game;
    this.onLeave = onLeave;
    this.people = people;
    const labels = people.map((p, i) => `<div class="lu-tag${p.me ? ' me' : ''}" data-n="${i}"><b>${p.tag || ''}${esc(p.name)}</b><span>${p.name.startsWith(DRIVERS[p.d]?.name || '\u0000') ? '&nbsp;' : esc(DRIVERS[p.d]?.name || '')}</span><i class="lu-st"></i></div>`).join('');
    game.setScreen(`<div class="screen lineup"><div class="lu-head"><h2>${esc(title)}</h2><p class="lu-sub">${esc(sub || '')}</p></div>
      <div class="lu-stage"><canvas class="lu-cv"></canvas><div class="lu-tags">${labels}</div></div>
      <div class="lu-foot"><span class="lu-note">Loading…</span>${onLeave ? '<button class="bbtn lu-leave" data-act="leave">Leave</button>' : ''}</div></div>`, {
      update: (dt) => {
        for (const [, m] of game.menuEvents) if (m.back && this.onLeave) {
          const t = performance.now();
          if (t - (this.backAt || 0) < 3000) { this.onLeave(); return; }
          this.backAt = t; this.note.textContent = 'Press Back again to leave the room';
        }
        this.update(dt);
      },
      act: (a) => { if (a === 'leave') this.onLeave?.(); },
    });
    const ui = game.ui;
    this.cv = ui.querySelector('.lu-cv');
    this.tags = [...ui.querySelectorAll('.lu-tag')];
    this.note = ui.querySelector('.lu-note');
    this.subEl = ui.querySelector('.lu-sub');
    // two rows of up to six, the second row a step back and up
    const n = people.length, cols = Math.min(6, Math.max(1, n <= 6 ? n : Math.ceil(n / 2))), gap = 4.4;
    const items = people.map((p, i) => {
      const row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, n - row * cols);
      return {
        ch: KARTS[p.k] || KARTS[0], driver: DRIVERS[p.d] || DRIVERS[0], glider: GLIDERS[p.g] || null,
        x: (col - (inRow - 1) / 2) * gap + (row ? gap / 2 * 0 : 0), z: -row * 5.2, y: row ? 0.6 : 0, ry: 0.32 * (col % 2 ? -1 : 1), phase: 'pre',
      };
    });
    const W = (cols - 1) * gap + 5, D = (W / 2 + 1.5) / 0.42 + (n > cols ? 3 : 0);
    const look = [0, 1.5 + (n > cols ? 0.6 : 0), -(n > cols ? 2.6 : 0)];
    const dir = new THREE.Vector3(0, 0.3, 1).normalize();
    this.show = new Showcase(this.cv, { cam: [look[0] + dir.x * D, look[1] + dir.y * D, look[2] + dir.z * D], look, fov: 30, spin: 0 });
    this.show.set(items, { plate: false });
    // a brick floor under them
    const floor = new THREE.Mesh(new THREE.CircleGeometry(Math.max(14, W), 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a3a52, roughness: 0.6 }));
    floor.position.y = -0.02;
    this.show.scene.add(floor);
    this.show.items.forEach((it, i) => { it.nextIdle = 0.6 + i * 0.35; });
    this.items = items;
    this.status = people.map(() => false);
    game.cleanup = () => this.dispose();
  }
  // ready[i]: player i has loaded
  setStatus(ready, note, sub) {
    ready.forEach((r, i) => {
      if (r === this.status[i] || !this.tags[i]) return;
      this.status[i] = r;
      this.tags[i].classList.toggle('ok', !!r);
      if (r) this.show.play(i, 'cheer');
    });
    if (note !== undefined && this.note.textContent !== note) this.note.textContent = note;
    if (sub !== undefined && this.subEl.textContent !== sub) this.subEl.textContent = sub;
  }
  update(dt) {
    this.show.update(dt);
    // names float over each driver's head
    const cam = this.show.cam, w = this.cv.clientWidth, h = this.cv.clientHeight;
    this.items.forEach((o, i) => {
      const it = this.show.items[i], tag = this.tags[i];
      if (!it || !tag) return;
      const top = (it.m.top || 2.6) + 0.5;
      V.set(o.x, (o.y || 0) + top, o.z).project(cam);
      tag.style.transform = `translate(${((V.x + 1) / 2 * w).toFixed(1)}px, ${((1 - V.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
    });
  }
  dispose() { this.show?.dispose(); this.show = null; }
}
