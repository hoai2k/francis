// Herbology: repotting Mandrakes. Seedlings poke out of six pots; pull and repot each one
// while it is calm. When one starts to SCREAM, hold your earmuffs (block) or be stunned.
import { G } from '../state.js';
import { lesson, gridNav } from './dom.js';
import { rand } from '../util.js';

export function play() {
  const LEN = 45;
  return lesson({
    cls: 'herb', music: 'castle',
    html: `<div class="l-title">Herbology · Repotting Mandrakes</div><div class="pots">${'<button class="pot"><span></span></button>'.repeat(6)}</div><button class="earmuffs">🎧 Earmuffs</button><div class="l-help">Pick a pot (arrows / D-pad / tap) and repot a calm Mandrake (Enter / A / E). When one screams, hold <b>Block</b> (Q / right-click / Y) or the earmuffs button.</div>`,
    setup(el, api) {
      const cells = [...el.querySelectorAll('.pot')];
      const nav = gridNav(cells, 3);
      const S = { t: 0, score: 0, repot: 0, stunned: 0, stuns: 0, muffs: false };
      const pots = cells.map(() => ({ state: 'empty', t: rand(0.5, 3) }));
      const muffBtn = el.querySelector('.earmuffs');
      let touchMuffs = false;
      muffBtn.addEventListener('pointerdown', () => { touchMuffs = true; });
      window.addEventListener('pointerup', () => { touchMuffs = false; });
      const pull = (k) => {
        if (S.stunned > 0) return;
        const p = pots[k];
        if (p.state === 'calm') { p.state = 'empty'; p.t = rand(1, 3); S.repot++; S.score += 10; G.audio.sfx('card'); }
        else if (p.state === 'scream') { S.stunned = 1.6; S.stuns++; G.audio.sfx('fail'); G.cam.shake(0.3); }
      };
      cells.forEach((c, k) => c.addEventListener('click', () => { nav.set(k); pull(k); }));
      return {
        update(dt) {
          S.t += dt;
          S.muffs = touchMuffs || G.input.isHeld('block');
          el.classList.toggle('muffled', S.muffs);
          muffBtn.classList.toggle('on', S.muffs);
          if (S.stunned > 0) S.stunned -= dt;
          if (nav.update() && !G.ui.menuOpen) pull(nav.i);
          let screaming = false;
          pots.forEach((p, k) => {
            p.t -= dt;
            if (p.state === 'empty' && p.t <= 0) { p.state = 'calm'; p.t = rand(2.2, 3.5) * (S.t > 25 ? 0.75 : 1); }
            else if (p.state === 'calm' && p.t <= 0) { p.state = 'scream'; p.t = rand(1.2, 2); G.audio.sfx('roar'); }
            else if (p.state === 'scream' && p.t <= 0) { p.state = 'empty'; p.t = rand(1, 2.5); }
            if (p.state === 'scream') screaming = true;
            const span = cells[k].firstChild;
            span.textContent = p.state === 'empty' ? '🟫' : p.state === 'calm' ? '🌱' : '😱';
            cells[k].className = 'pot ' + p.state + (k === nav.i ? ' focus' : '');
          });
          if (screaming && !S.muffs && S.stunned <= 0 && Math.random() < dt * 1.4) { S.stunned = 1.2; S.stuns++; G.ui.toast('The scream stuns you — earmuffs!', 'warn', 1200); G.input.rumble(0.6, 0.5, 200); }
          el.classList.toggle('stunned', S.stunned > 0);
          api.hud(`<div class="mg-row"><span>Repotted <b>${S.repot}</b></span><span><b>${Math.max(0, LEN - S.t).toFixed(0)}</b>s</span><span>Stunned <b>${S.stuns}</b></span></div>`);
          if (S.t >= LEN) {
            const score = Math.max(0, S.score - S.stuns * 8);
            api.finish({ title: S.repot >= 8 ? 'Green fingers!' : 'Muddy but alive', success: S.repot >= 6, score, points: Math.min(30, Math.round(score / 6)), lines: [['Mandrakes repotted', S.repot], ['Times stunned', S.stuns]] });
          }
        },
      };
    },
  });
}
