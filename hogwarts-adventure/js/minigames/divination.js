// Divination: Madam Vey's crystal-ball cards. Turn two at a time and find the matching
// omens before the mists close in. Your fortune depends on how you do.
import { G } from '../state.js';
import { lesson, gridNav } from './dom.js';

const OMENS = ['🌙', '⭐', '☀️', '⚡', '🔮', '🦉'];
const FORTUNES = [
  'The mists show… a great deal of homework. And a toad. Possibly both at once.',
  'I see a journey, a friend who keeps a secret, and a cake you should not eat.',
  'The Grim! No — no, it is a smudge on the glass. You will be perfectly fine. Probably.',
  'A bright star rises over your house. Your enemies will trip on their own robes.',
];

export function play() {
  const MAX = 22;
  return lesson({
    cls: 'divi', music: 'castle',
    html: `<div class="l-title">Divination · Omens in the mist</div><div class="cards">${'<button class="card"><span></span></button>'.repeat(12)}</div><div class="l-help">Turn two cards at a time (arrows / D-pad + Enter / A, or tap) and match the omens.</div>`,
    setup(el, api) {
      const cells = [...el.querySelectorAll('.card')];
      const nav = gridNav(cells, 4);
      const deck = [...OMENS, ...OMENS].sort(() => Math.random() - 0.5);
      const S = { open: [], matched: new Set(), moves: 0, lock: 0, done: false };
      const flip = (k) => {
        if (S.lock > 0 || S.matched.has(k) || S.open.includes(k)) return;
        S.open.push(k); G.audio.sfx('uimove');
        cells[k].classList.add('up'); cells[k].firstChild.textContent = deck[k];
        if (S.open.length === 2) {
          S.moves++;
          const [a, b] = S.open;
          if (deck[a] === deck[b]) { S.matched.add(a); S.matched.add(b); S.open = []; G.audio.sfx('card'); cells[a].classList.add('got'); cells[b].classList.add('got'); }
          else S.lock = 0.9;
        }
      };
      cells.forEach((c, k) => c.addEventListener('click', () => { nav.set(k); flip(k); }));
      return {
        update(dt) {
          if (S.lock > 0) { S.lock -= dt; if (S.lock <= 0) { for (const k of S.open) { cells[k].classList.remove('up'); cells[k].firstChild.textContent = ''; } S.open = []; } }
          if (nav.update() && !G.ui.menuOpen) flip(nav.i);
          api.hud(`<div class="mg-row"><span>Pairs <b>${S.matched.size / 2}</b>/6</span><span>Turns <b>${S.moves}</b>/${MAX}</span></div>`);
          if (!S.done && (S.matched.size === 12 || S.moves >= MAX) && S.lock <= 0) {
            S.done = true;
            const pairs = S.matched.size / 2;
            const fortune = FORTUNES[Math.min(3, Math.floor(pairs / 2))];
            setTimeout(() => api.finish({ title: pairs === 6 ? 'The Inner Eye opens!' : 'The mists are cloudy today', success: pairs >= 5, score: pairs * 40 + Math.max(0, MAX - S.moves) * 10, points: Math.min(30, pairs * 4 + (pairs === 6 ? 6 : 0)), sub: `“${fortune}”`, lines: [['Pairs found', `${pairs} / 6`], ['Turns', S.moves]] }), 600);
          }
        },
      };
    },
  });
}
