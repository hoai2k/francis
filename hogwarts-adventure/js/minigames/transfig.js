// Transfiguration: watch Professor Marlowe's wand pattern, then repeat it. Each correct
// pattern transforms the object a little further. Six rounds, each one longer.
import { G } from '../state.js';
import { lesson } from './dom.js';

const DIRS = ['up', 'right', 'down', 'left'];
const ARROW = { up: '▲', right: '▶', down: '▼', left: '◀' };
const CHAIN = ['🐭', '🫖', '🐦', '🦊', '🐈', '🦉', '🐉'];

export function play() {
  return lesson({
    cls: 'trans', music: 'castle',
    html: `<div class="l-title">Transfiguration · Mouse to … something</div><div class="obj">🐭</div><div class="seq"></div><div class="pad">${DIRS.map((d) => `<button data-d="${d}">${ARROW[d]}</button>`).join('')}</div><div class="l-help">Watch the wand pattern, then repeat it with arrows / D-pad / the buttons.</div>`,
    setup(el, api) {
      const seqEl = el.querySelector('.seq'), objEl = el.querySelector('.obj');
      const btns = Object.fromEntries([...el.querySelectorAll('.pad button')].map((b) => [b.dataset.d, b]));
      const S = { round: 0, seq: [], input: [], phase: 'show', t: 0, idx: 0, mistakes: 0, done: false };
      const touch = [];
      Object.entries(btns).forEach(([d, b]) => b.addEventListener('click', () => touch.push(d)));
      const next = () => { S.seq = Array.from({ length: 3 + S.round }, () => DIRS[Math.floor(Math.random() * 4)]); S.input = []; S.phase = 'show'; S.t = 0; S.idx = -1; seqEl.textContent = 'Watch…'; };
      const flash = (d, cls) => { const b = btns[d]; b.classList.remove('lit', 'bad'); void b.offsetWidth; b.classList.add(cls); };
      next();
      return {
        update(dt) {
          S.t += dt;
          if (S.phase === 'show') {
            const k = Math.floor(S.t / 0.6);
            if (k !== S.idx && k < S.seq.length) { S.idx = k; flash(S.seq[k], 'lit'); G.audio.sfx('uimove'); seqEl.textContent = S.seq.slice(0, k + 1).map((d) => ARROW[d]).join(' '); }
            if (S.t > S.seq.length * 0.6 + 0.4) { S.phase = 'input'; seqEl.textContent = 'Your turn!'; }
            touch.length = 0;
          } else if (S.phase === 'input') {
            const n = G.input.nav();
            const pressed = DIRS.filter((d) => n[d]).concat(touch.splice(0));
            for (const d of pressed) {
              const want = S.seq[S.input.length];
              if (d === want) { S.input.push(d); flash(d, 'lit'); G.audio.sfx('card'); seqEl.textContent = S.input.map((x) => ARROW[x]).join(' '); }
              else { flash(d, 'bad'); S.mistakes++; G.audio.sfx('fail'); S.phase = 'show'; S.t = -0.6; S.idx = -1; S.input = []; seqEl.textContent = 'Again — watch carefully'; break; }
              if (S.input.length === S.seq.length) {
                S.round++;
                objEl.textContent = CHAIN[Math.min(CHAIN.length - 1, S.round)];
                objEl.classList.remove('poof'); void objEl.offsetWidth; objEl.classList.add('poof');
                G.audio.sfx('quest');
                if (S.round >= 6 || S.mistakes >= 4) S.phase = 'end'; else { S.phase = 'wait'; S.t = 0; }
                break;
              }
            }
          } else if (S.phase === 'wait' && S.t > 0.9) next();
          if (S.mistakes >= 4 && S.phase !== 'end') S.phase = 'end';
          api.hud(`<div class="mg-row"><span>Round <b>${Math.min(6, S.round + 1)}</b>/6</span><span>Mistakes <b>${S.mistakes}</b>/4</span></div>`);
          if (S.phase === 'end' && !S.done) {
            S.done = true;
            const ok = S.round >= 4;
            api.finish({ title: S.round >= 6 ? 'A dragon from a mouse!' : ok ? 'Well transfigured' : 'Still slightly mousy', success: ok, score: S.round * 50 - S.mistakes * 10, points: Math.min(30, S.round * 5), lines: [['Patterns copied', `${S.round} / 6`], ['Mistakes', S.mistakes]] });
          }
        },
      };
    },
  });
}
