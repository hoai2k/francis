// Astronomy: chart three constellations through the telescope. Move the cross-hair (stick,
// arrows, WASD, mouse or touch) and mark each star of the shape shown in the corner.
import { G } from '../state.js';
import { lesson } from './dom.js';
import { mulberry32 } from '../util.js';

const SHAPES = [
  { name: 'The Hippogriff', pts: [[0.2, 0.6], [0.35, 0.45], [0.5, 0.5], [0.62, 0.35], [0.78, 0.4], [0.5, 0.7]] },
  { name: 'The Cauldron', pts: [[0.3, 0.4], [0.7, 0.4], [0.75, 0.62], [0.5, 0.75], [0.25, 0.62]] },
  { name: 'The Wand', pts: [[0.2, 0.75], [0.35, 0.62], [0.5, 0.5], [0.65, 0.38], [0.8, 0.25]] },
  { name: 'The Owl', pts: [[0.4, 0.3], [0.6, 0.3], [0.65, 0.5], [0.5, 0.72], [0.35, 0.5], [0.5, 0.45]] },
];

export function play() {
  const LEN = 75;
  return lesson({
    cls: 'astro', music: 'castle',
    html: `<div class="l-title">Astronomy · Chart the night sky</div><canvas class="sky" width="640" height="400"></canvas><canvas class="ref" width="140" height="100"></canvas><div class="l-help">Move the cross-hair and mark each star of the constellation shown (Enter / A / click).</div>`,
    setup(el, api) {
      const cv = el.querySelector('.sky'), g = cv.getContext('2d');
      const ref = el.querySelector('.ref'), rg = ref.getContext('2d');
      const rnd = mulberry32(Math.floor(Math.random() * 1e6));
      const S = { t: 0, round: 0, found: 0, misses: 0, cx: 320, cy: 200, marked: [] };
      const order = [...SHAPES].sort(() => Math.random() - 0.5).slice(0, 3);
      let stars = [], target = [];
      const setup = () => {
        const sh = order[S.round];
        const ox = 80 + rnd() * 240, oy = 40 + rnd() * 120, sc = 260 + rnd() * 60;
        target = sh.pts.map(([x, y]) => ({ x: ox + x * sc, y: oy + y * sc * 0.75, big: true }));
        stars = [...target];
        for (let i = 0; i < 70; i++) stars.push({ x: rnd() * 640, y: rnd() * 400, big: false });
        S.marked = [];
        rg.clearRect(0, 0, 140, 100); rg.fillStyle = '#0a1028'; rg.fillRect(0, 0, 140, 100);
        rg.strokeStyle = '#ffd27a'; rg.fillStyle = '#ffd27a'; rg.beginPath();
        sh.pts.forEach(([x, y], i) => { const X = 10 + x * 120, Y = 5 + y * 90; i ? rg.lineTo(X, Y) : rg.moveTo(X, Y); });
        rg.stroke(); sh.pts.forEach(([x, y]) => { rg.beginPath(); rg.arc(10 + x * 120, 5 + y * 90, 3, 0, 7); rg.fill(); });
        rg.font = '11px serif'; rg.fillText(sh.name, 8, 96);
      };
      setup();
      const mark = () => {
        let best = -1, bd = 22;
        stars.forEach((s, i) => { const d = Math.hypot(s.x - S.cx, s.y - S.cy); if (d < bd) { bd = d; best = i; } });
        if (best >= 0 && best < target.length && !S.marked.includes(best)) { S.marked.push(best); S.found++; G.audio.sfx('ring'); }
        else { S.misses++; G.audio.sfx('fail'); }
        if (S.marked.length === target.length) { S.round++; G.audio.sfx('quest'); if (S.round < 3) setup(); }
      };
      cv.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); S.cx = (e.clientX - r.left) / r.width * 640; S.cy = (e.clientY - r.top) / r.height * 400; });
      cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(); S.cx = (e.clientX - r.left) / r.width * 640; S.cy = (e.clientY - r.top) / r.height * 400; mark(); });
      return {
        update(dt) {
          S.t += dt;
          const I = G.input, m = I.move;
          const nav = I.nav();
          S.cx = Math.max(0, Math.min(640, S.cx + (m.x + (I.isHeld('right') ? 1 : 0) - (I.isHeld('left') ? 1 : 0)) * 260 * dt));
          S.cy = Math.max(0, Math.min(400, S.cy - (m.y + (I.isHeld('up') ? 1 : 0) - (I.isHeld('down') ? 1 : 0)) * 260 * dt));
          if ((nav.confirm || I.isPressed('cast') || I.isPressed('interact')) && S.round < 3) mark();
          // draw
          g.fillStyle = '#050a1c'; g.fillRect(0, 0, 640, 400);
          stars.forEach((s, i) => { const tw = 0.6 + Math.sin(S.t * 3 + i) * 0.3; g.fillStyle = S.marked.includes(i) ? '#ffd27a' : `rgba(255,255,255,${s.big ? 0.95 : tw * 0.6})`; g.beginPath(); g.arc(s.x, s.y, s.big ? 3 : 1.4, 0, 7); g.fill(); });
          if (S.marked.length > 1) { g.strokeStyle = 'rgba(255,210,122,0.7)'; g.beginPath(); S.marked.forEach((k, i) => (i ? g.lineTo(stars[k].x, stars[k].y) : g.moveTo(stars[k].x, stars[k].y))); g.stroke(); }
          g.strokeStyle = '#7ad0ff'; g.lineWidth = 2; g.beginPath(); g.arc(S.cx, S.cy, 14, 0, 7); g.moveTo(S.cx - 22, S.cy); g.lineTo(S.cx - 8, S.cy); g.moveTo(S.cx + 8, S.cy); g.lineTo(S.cx + 22, S.cy); g.moveTo(S.cx, S.cy - 22); g.lineTo(S.cx, S.cy - 8); g.moveTo(S.cx, S.cy + 8); g.lineTo(S.cx, S.cy + 22); g.stroke(); g.lineWidth = 1;
          api.hud(`<div class="mg-row"><span>Constellation <b>${Math.min(3, S.round + 1)}</b>/3</span><span><b>${Math.max(0, LEN - S.t).toFixed(0)}</b>s</span><span>Stars <b>${S.found}</b></span></div>`);
          if (S.round >= 3 || S.t >= LEN) {
            const score = S.found * 20 - S.misses * 5 + (S.round >= 3 ? Math.round((LEN - S.t) * 3) : 0);
            api.finish({ title: S.round >= 3 ? 'A perfect star chart!' : 'Clouds rolled in…', success: S.round >= 2, score: Math.max(0, score), points: Math.min(30, S.round * 9 + 3), lines: [['Constellations charted', `${S.round} / 3`], ['Wrong stars', S.misses]] });
          }
        },
      };
    },
  });
}
