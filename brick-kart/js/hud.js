// In-race heads-up display. One panel per local player (matching the
// split-screen viewports), a shared minimap, countdown and title card.
import { ICONS, ITEMS, MULTI } from './items.js';

// Split-screen cells for n local players as [col, row, cols, rows] (row 0 = top):
// 1 full, 2 stacked, 3–4 in a 2x2 grid, 5–6 in 3x2, 7–8 in 4x2. Spare cells show the TV camera.
export function splitCells(n) {
  if (n <= 1) return [[0, 0, 1, 1]];
  if (n === 2) return [[0, 0, 1, 2], [0, 1, 1, 2]];
  const cols = n <= 4 ? 2 : n <= 6 ? 3 : 4, rows = 2, out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([c, r, cols, rows]);
  return out;
}

const ORD = ['th', 'st', 'nd', 'rd'];
const ord = (n) => (n % 100 > 10 && n % 100 < 14 ? 'th' : ORD[n % 10] || 'th');
const PLACE_COL = ['#ffd23a', '#dfe6ee', '#e0a060'];
const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; };
export { fmt };
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

export class HUD {
  constructor(race, root) {
    this.race = race;
    this.root = root;
    root.innerHTML = '';
    root.classList.remove('hidden', 'intro');
    const n = race.cams.length;
    root.dataset.players = n;
    root.classList.add('intro');
    root.classList.toggle('touch', race.cams.some((c) => c.player.device === 'touch'));
    const boxes = splitCells(n).map(([c, r, cols, rows]) => [c * 100 / cols, r * 100 / rows, 100 / cols, 100 / rows]);
    this.panels = race.cams.map((c, i) => {
      const [l, t, w, h] = boxes[i];
      const el = document.createElement('div');
      el.className = 'hud-vp';
      el.style.cssText = `left:${l}%;top:${t}%;width:${w}%;height:${h}%;--pc:${c.player.color}`;
      el.innerHTML = `
        <div class="h-top">
          <div class="h-lap"><span class="lbl">LAP</span> <b class="lapn">1</b><span class="lapt">/${race.laps}</span><div class="h-time">0:00.00</div></div>
          <div class="h-items"><div class="h-item2"><div class="slot"><div class="icon"></div></div></div><div class="h-item"><div class="slot"><div class="icon"></div></div><span class="cnt"></span></div></div>
        </div>
        <div class="h-ink"><i></i><i></i><i></i><i></i><i></i></div>
        <div class="h-msg"></div>
        <div class="h-wrong">WRONG WAY!</div>
        <div class="h-bottom">
          <div class="h-studs"><i class="stud-ic"></i><b>0</b><span class="max">/10</span></div>
          <div class="h-pos"><b>1</b><sup>st</sup></div>
        </div>
        ${n > 1 ? `<div class="h-tag">P${c.player.id + 1}</div>` : ''}`;
      root.appendChild(el);
      return {
        el, kart: c.kart,
        lap: el.querySelector('.lapn'), time: el.querySelector('.h-time'),
        icon: el.querySelector('.h-item .icon'), slot: el.querySelector('.h-item'), cnt: el.querySelector('.cnt'),
        icon2: el.querySelector('.h-item2 .icon'), slot2: el.querySelector('.h-item2'), last2: undefined, roll2T: 0,
        msg: el.querySelector('.h-msg'), ink: el.querySelector('.h-ink'), wrong: el.querySelector('.h-wrong'),
        studs: el.querySelector('.h-studs b'), pos: el.querySelector('.h-pos b'), sup: el.querySelector('.h-pos sup'), posEl: el.querySelector('.h-pos'),
        lastItem: null, lastRank: 0, rollT: 0, msgT: 0,
      };
    });
    // shared elements
    this.count = this.count.bind(this);
    this.countEl = document.createElement('div'); this.countEl.className = 'h-count'; root.appendChild(this.countEl);
    this.title = document.createElement('div'); this.title.className = 'h-title';
    const d = race.opts.def;
    const gp = race.opts.gpRound ? `<div class="gp">${race.opts.gpName || 'GRAND PRIX'} · RACE ${race.opts.gpRound}/${race.opts.gpTotal}</div>` : '';
    this.title.innerHTML = `${gp}<h2>${d.name}</h2><p>${d.subtitle}</p><span class="skip">Press A / Enter to skip</span>`;
    root.appendChild(this.title);
    // minimap
    this.mini = document.createElement('canvas');
    this.mini.className = 'h-mini' + (n > 1 ? ' center' : '');
    this.mini.width = this.mini.height = 220;
    root.appendChild(this.mini);
    this.miniBase = this.drawMiniBase();
    if (race.mode === 'tt') {
      this.ttEl = document.createElement('div'); this.ttEl.className = 'h-tt'; root.appendChild(this.ttEl);
    }
  }

  drawMiniBase() {
    const { pts } = this.race.track.minimap();
    const c = document.createElement('canvas');
    c.width = c.height = 220;
    const g = c.getContext('2d');
    const S = 220;
    const path = (w, col) => {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = g.lineJoin = 'round';
      g.beginPath();
      let pen = false;
      pts.forEach(([x, z, , gap], i) => {
        if (gap) { pen = false; return; }
        if (!pen) { g.moveTo(x * S, z * S); pen = true; } else g.lineTo(x * S, z * S);
        if (i === pts.length - 1 && !pts[0][3]) g.lineTo(pts[0][0] * S, pts[0][1] * S);
      });
      g.stroke();
    };
    path(13, 'rgba(0,0,0,0.55)');
    path(8, '#f4f4f4');
    // start line
    const [sx, sz] = pts[0];
    g.fillStyle = '#c91a09'; g.fillRect(sx * S - 5, sz * S - 5, 10, 10);
    return c;
  }

  hideTitle() { this.title.classList.add('out'); this.root.classList.remove('intro'); }
  count(n) {
    this.countEl.textContent = n;
    this.countEl.className = 'h-count show' + (n === 'GO!' ? ' go' : '');
    clearTimeout(this.countT);
    this.countT = setTimeout(() => { this.countEl.className = 'h-count'; }, n === 'GO!' ? 900 : 800);
  }
  message(k, text, cls = '') {
    const p = this.panels.find((p) => p.kart === k);
    if (!p) return;
    p.msg.textContent = text;
    p.msg.className = 'h-msg show ' + cls;
    p.msgT = 2.2;
  }
  finish(k) {
    const p = this.panels.find((p) => p.kart === k);
    if (!p) return;
    p.msg.innerHTML = `FINISH!<small>${k.rank}${ord(k.rank)} place</small>`;
    p.msg.className = 'h-msg show finish';
    p.msgT = 999;
    p.el.classList.add('done');
  }

  update(dt) {
    const race = this.race;
    for (const p of this.panels) {
      const k = p.kart;
      p.lap.textContent = Math.max(1, Math.min(race.laps, k.lap));
      p.time.textContent = fmt(k.finished ? k.finishTime : race.time);
      if (k.rank !== p.lastRank) {
        p.lastRank = k.rank;
        p.pos.textContent = k.rank; p.sup.textContent = ord(k.rank);
        p.posEl.style.color = PLACE_COL[k.rank - 1] || '#fff';
        p.posEl.classList.remove('bump'); void p.posEl.offsetWidth; p.posEl.classList.add('bump');
      }
      p.studs.textContent = k.studs;
      // item slot
      let show = null;
      if (k.roulette > 0) {
        p.rollT -= dt;
        if (p.rollT <= 0) { p.rollT = 0.07; const keys = Object.keys(ICONS); p.rollIcon = keys[Math.floor(Math.random() * keys.length)]; }
        show = p.rollIcon;
        p.slot.classList.add('rolling');
      } else { show = k.item; p.slot.classList.remove('rolling'); }
      if (show !== p.lastItem) {
        p.lastItem = show;
        p.icon.innerHTML = show ? ICONS[show] : '';
        p.slot.title = show ? ITEMS[show].name : '';
        if (show && k.roulette <= 0) { p.slot.classList.remove('pop'); void p.slot.offsetWidth; p.slot.classList.add('pop'); }
      }
      // next item (second slot)
      let show2 = k.nextItem;
      if (k.roulette2 > 0) {
        p.roll2T -= dt;
        if (p.roll2T <= 0) { p.roll2T = 0.08; const keys = Object.keys(ICONS); p.roll2Icon = keys[Math.floor(Math.random() * keys.length)]; }
        show2 = p.roll2Icon;
      }
      p.slot2.classList.toggle('rolling', k.roulette2 > 0);
      if (show2 !== p.last2) { p.last2 = show2; p.icon2.innerHTML = show2 ? ICONS[show2] : ''; }
      p.cnt.textContent = MULTI[k.item] && k.roulette <= 0 && k.itemCount > 1 ? '×' + k.itemCount : k.item === 'goldturbo' && k.goldTurboTime > 0 ? Math.ceil(k.goldTurboTime) + 's' : '';
      p.ink.classList.toggle('show', k.inkTime > 0);
      if (k.inkTime > 0) p.ink.style.opacity = Math.min(1, k.inkTime / 1.5);
      if (p.msgT > 0) { p.msgT -= dt; if (p.msgT <= 0) p.msg.className = 'h-msg'; }
      p.wrong.classList.toggle('show', k.wrongWay > 1.2 && !k.finished);
    }
    if (this.ttEl) {
      const k = this.panels[0]?.kart;
      if (k) this.ttEl.innerHTML = k.lapTimes.map((t, i) => `<div>Lap ${i + 1} <b>${fmt(t)}</b></div>`).join('') + (this.race.opts.bestTime ? `<div class="best">Best <b>${fmt(this.race.opts.bestTime)}</b></div>` : '');
    }
    this.drawMini();
  }

  drawMini() {
    const g = this.mini.getContext('2d');
    const S = 220;
    g.clearRect(0, 0, S, S);
    g.drawImage(this.miniBase, 0, 0);
    const { map } = this.race.track.minimap();
    // item traps
    g.fillStyle = '#f2cd37';
    for (const t of this.race.items.traps) { const [x, z] = map(t.pos.x, t.pos.z); g.fillRect(x * S - 2, z * S - 2, 4, 4); }
    g.fillStyle = '#ff3a1a';
    for (const pr of this.race.items.proj) { const [x, z] = map(pr.pos.x, pr.pos.z); g.beginPath(); g.arc(x * S, z * S, 3, 0, 7); g.fill(); }
    const karts = [...this.race.order].reverse();
    for (const k of karts) {
      const [x, z] = map(k.pos.x, k.pos.z);
      const r = k.human ? 7 : 5;
      g.fillStyle = hex(k.ch.kart);
      g.strokeStyle = k.human ? k.player.color : '#1b2a34';
      g.lineWidth = k.human ? 3 : 1.5;
      g.beginPath(); g.arc(x * S, z * S, r, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }

  dispose() {
    clearTimeout(this.countT);
    this.root.innerHTML = '';
    this.root.classList.add('hidden');
  }
}
