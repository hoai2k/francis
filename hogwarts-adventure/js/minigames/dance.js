// The Yule Ball: a rhythm minigame. Steps slide toward the line in time with the waltz;
// press the matching direction on the beat (arrows / WASD, D-pad or stick, or the touch
// pads) while you and your partner turn about the floor of the Great Hall.
import * as THREE from 'three';
import { G } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { FRIENDS } from '../friends.js';
import { makeWizard } from '../models.js';
import { el, rand } from '../util.js';

const DIRS = ['left', 'up', 'down', 'right'];
const ARROW = { left: '◀', up: '▲', down: '▼', right: '▶' };

export async function play(opts = {}) {
  const gh = G.world.zones.greatHall;
  await G.ui.fade(1, 0.4);
  G.world.setZone('greatHall', { pos: gh.W(0, 0, 4), yaw: Math.PI });
  gh.tables.visible = false;
  gh.tableCols.forEach((c) => (c.disabled = true));
  const p = G.player;
  p.control = false;
  const pid = opts.partner && FRIENDS[opts.partner] ? opts.partner : 'pip';
  const partner = makeWizard({ ...FRIENDS[pid].look, scarf: false, noWand: true });
  gh.world.add(partner.root);
  // other couples twirling in the background
  const couples = [];
  for (let i = 0; i < 6; i++) { const w = makeWizard({ robeColor: ['#3a1f5a', '#1b3070', '#5a1020', '#1a5c34'][i % 4], noWand: true, noShadow: true, hairStyle: ['long', 'bun', 'short'][i % 3] }); gh.world.add(w.root); couples.push({ w, a: (i / 6) * Math.PI * 2, r: 8 + (i % 2) * 3 }); }
  G.skyObj.tod = 0.9;
  G.audio.music('hall');
  G.ui.fade(0, 0.6);
  // DOM lane
  const lane = el('div', 'dance-lane', DIRS.map((d) => `<div class="dl-col" data-d="${d}"><div class="dl-target">${ARROW[d]}</div></div>`).join(''));
  document.getElementById('hud').appendChild(lane);
  const cols = Object.fromEntries([...lane.querySelectorAll('.dl-col')].map((c) => [c.dataset.d, c]));
  // touch pads
  const pads = el('div', 'dance-pads', DIRS.map((d) => `<button data-d="${d}">${ARROW[d]}</button>`).join(''));
  document.body.appendChild(pads);
  const touchHits = [];
  pads.querySelectorAll('button').forEach((b) => b.addEventListener('touchstart', (e) => { e.preventDefault(); touchHits.push(b.dataset.d); }, { passive: false }));
  pads.querySelectorAll('button').forEach((b) => b.addEventListener('mousedown', () => touchHits.push(b.dataset.d)));
  const BPM = 86 * (opts.fast ? 1.2 : 1);
  const beat = 60 / BPM;
  const LEN = 46;
  const TRAVEL = 2.2; // seconds a step takes to reach the line
  const notes = [];
  let tNote = 2.5;
  while (tNote < LEN - 1) {
    const d = DIRS[Math.floor(rand(0, 4))];
    notes.push({ t: tNote, d, el: null, hit: false, miss: false });
    tNote += beat * (Math.random() < 0.25 ? 0.5 : Math.random() < 0.3 ? 2 : 1);
  }
  const S = { t: 0, score: 0, combo: 0, best: 0, perfect: 0, good: 0, miss: 0, done: false, spin: 0 };
  G.ui.banner('The Yule Ball', `Dancing with ${FRIENDS[pid].short} — press each step as it reaches the line`, '');
  return new Promise((resolve) => {
    const finish = (aborted) => {
      if (S.done) return;
      S.done = true;
      lane.remove(); pads.remove();
      gh.world.remove(partner.root);
      couples.forEach((c) => gh.world.remove(c.w.root));
      gh.tables.visible = true;
      gh.tableCols.forEach((c) => (c.disabled = false));
      p.control = true;
      p.status.override = null;
      mgExit();
      const acc = notes.length ? (S.perfect + S.good * 0.6) / notes.length : 0;
      resolve(aborted ? { aborted: true } : {
        title: acc > 0.85 ? 'The belle of the ball!' : acc > 0.6 ? 'A lovely dance' : 'Two left feet…', success: acc > 0.5, score: S.score, points: Math.round(acc * 30), accuracy: acc, partner: pid,
        lines: [['Perfect', S.perfect], ['Good', S.good], ['Missed', S.miss], ['Best combo', S.best], ['Score', S.score]],
      });
    };
    const judge = (d) => {
      // nearest unhit note in this column within the window
      let best = null, bd = 1;
      for (const n of notes) { if (n.hit || n.miss || n.d !== d) continue; const dt = Math.abs(n.t - S.t); if (dt < bd) { bd = dt; best = n; } }
      if (!best || bd > 0.28) { S.combo = 0; flash(d, 'bad'); return; }
      best.hit = true;
      best.el?.remove();
      const perfect = bd < 0.1;
      if (perfect) S.perfect++; else S.good++;
      S.combo++; S.best = Math.max(S.best, S.combo);
      S.score += (perfect ? 100 : 50) * (1 + Math.floor(S.combo / 10) * 0.5);
      flash(d, perfect ? 'perfect' : 'good');
      G.audio.sfx(perfect ? 'ring' : 'uimove');
      if (S.combo % 10 === 0) { S.spin = 1; G.fx.emit({ pos: p.pos.clone().setY(p.pos.y + 1.5), color: 0xffd070, count: 40, speed: 4, size: 0.2, life: 1, intensity: 3 }); }
    };
    const flash = (d, cls) => { const t = cols[d].querySelector('.dl-target'); t.classList.remove('perfect', 'good', 'bad'); void t.offsetWidth; t.classList.add(cls); };
    mgEnter({
      music: 'hall', abort: () => finish(true),
      update(dt) {
        if (S.done) return;
        S.t += dt;
        const I = G.input, n = I.nav();
        for (const d of DIRS) if (n[d] || I.isPressed(d + 'Menu') || touchHits.includes(d)) judge(d);
        touchHits.length = 0;
        for (const note of notes) {
          const until = note.t - S.t;
          if (!note.el && until < TRAVEL && !note.hit) { note.el = el('div', 'dl-note', ARROW[note.d]); cols[note.d].appendChild(note.el); }
          if (note.el && !note.hit) note.el.style.bottom = `${Math.max(-10, (until / TRAVEL) * 100)}%`;
          if (!note.hit && !note.miss && until < -0.3) { note.miss = true; S.miss++; S.combo = 0; note.el?.remove(); }
        }
        // the couple turns about the floor
        const a = S.t * (Math.PI * 2 / (beat * 6));
        const c = gh.W(0, 0, 4);
        p.pos.set(c.x + Math.cos(a) * 1.6, c.y, c.z + Math.sin(a) * 1.6);
        p.root.position.copy(p.pos);
        p.yaw = a + Math.PI / 2 + Math.PI;
        p.root.rotation.y = -a + Math.PI;
        partner.root.position.set(c.x + Math.cos(a + Math.PI) * 0.7 + Math.cos(a) * 0.9, c.y, c.z + Math.sin(a + Math.PI) * 0.7 + Math.sin(a) * 0.9);
        partner.root.rotation.y = -a;
        S.spin = Math.max(0, S.spin - dt);
        p.model.root.rotation.y = S.spin * Math.PI * 2;
        p.anim.set('idle'); p.anim.update(dt, 1.5);
        partner.anim.set('idle'); partner.anim.update(dt, 1.5);
        couples.forEach((cp, i) => { const b = a * 0.8 + cp.a; cp.w.root.position.set(c.x + Math.cos(b) * cp.r, c.y, c.z + Math.sin(b) * cp.r); cp.w.root.rotation.y = -b; cp.w.anim.update(dt, 1.4); });
        G.cam.setCinematic(c.clone().add(new THREE.Vector3(Math.sin(S.t * 0.2) * 7, 3.2, 7)), c.clone().setY(c.y + 1.2), 2);
        if (S.t > LEN) finish(false);
        G.ui.minigameHUD(`<div class="mg-row"><span>Score <b>${Math.round(S.score)}</b></span><span>Combo <b>${S.combo}</b></span><span><b>${Math.max(0, LEN - S.t).toFixed(0)}</b>s</span></div><small>Arrows / WASD · D-pad or stick · tap the pads</small>`);
      },
    });
  });
}
