// How to Play: the open world, quests, the story and how a chapter plays, controls for
// keyboard + mouse, gamepad (with a diagram) and touch, the technique tree,
// rerolls and tips. Opens from the title screen and the pause menu. Scrolls
// with the stick, D-pad, arrow keys or mouse wheel.
import { h } from './ui.js';

const ACC = '#a07aff';
const L = (key, val, fx, fy, ty, sub) => ({ side: 'l', key, val, fx, fy, ty, sub });
const R = (key, val, fx, fy, ty, sub) => ({ side: 'r', key, val, fx, fy, ty, sub });
const CALLOUTS = [
  L('LT', 'Reverse CT (heal)', 162, 20, 20),
  L('LB', 'Technique 1', 150, 45, 62),
  L('Left stick', 'Move', 168, 125, 126),
  L('D-pad', '↑ Domain / ultimate', 246, 182, 200, ['↓ Inventory', '← → Cursed tools']),
  R('RT', 'Ranged technique', 480, 20, 20),
  R('RB', 'Technique 2', 490, 45, 62),
  R('Y', 'Technique 3', 466, 100, 102),
  R('B', 'Dodge roll', 496, 128, 140),
  R('A', 'Jump (hold: higher)', 466, 158, 188, ['Interact when a prompt shows']),
];
function callout(c) {
  const left = c.side === 'l';
  const tx = left ? 28 : 612, anchor = left ? 'end' : 'start', lx = left ? 34 : 606;
  const subs = (c.sub ?? []).map((s) => `<tspan x="${tx}" dy="17" class="s">${s}</tspan>`).join('');
  return `<line x1="${c.fx}" y1="${c.fy}" x2="${lx}" y2="${c.ty - 5}" class="ld"/><circle cx="${c.fx}" cy="${c.fy}" r="3" class="dot"/>` +
    `<text x="${tx}" y="${c.ty}" text-anchor="${anchor}"><tspan class="k">${c.key}</tspan><tspan class="v"> · ${c.val}</tspan>${subs}</text>`;
}
function padSvg() {
  return `<svg viewBox="0 0 1010 450" role="img" aria-label="Gamepad diagram. Left stick moves, right stick aims. A jumps, hold it for a higher jump, and interacts when a prompt shows. X melee, in the air a jump slam. B dodge roll. LB, RB and Y techniques 1, 2 and 3. LT Reverse Cursed Technique (heal), RT ranged technique. D-pad up Domain Expansion or ultimate, down inventory, left and right cursed tools. View map, Menu pause.">
  <style>
    .ld{stroke:${ACC};stroke-width:1.3;opacity:.75} .dot{fill:${ACC}} text{font:600 15px 'Pixelify Sans',system-ui,sans-serif;fill:#f2ecff}
    .k{font-weight:800;fill:#ffcf4a} .s{fill:#c8bce6;font-weight:500;font-size:14px} .body{fill:#140f22;stroke:${ACC};stroke-width:3} .part{fill:#221a38;stroke:${ACC};stroke-width:1.8}
    .btn-l{font:800 15px 'Pixelify Sans',sans-serif;text-anchor:middle} .sm{font:700 10px 'Pixelify Sans',sans-serif;fill:#ffcf4a;text-anchor:middle}
  </style>
  <g transform="translate(190 100)">
    <path class="body" d="M180 70 Q320 40 460 70 Q540 80 570 190 Q590 270 530 270 Q490 270 460 220 L180 220 Q150 270 110 270 Q50 270 70 190 Q100 80 180 70 Z"/>
    <rect class="part" x="160" y="8" width="52" height="22" rx="8"/><text class="sm" x="186" y="23">LT</text>
    <rect class="part" x="428" y="8" width="52" height="22" rx="8"/><text class="sm" x="454" y="23">RT</text>
    <rect class="part" x="148" y="36" width="74" height="18" rx="8"/><text class="sm" x="185" y="49">LB</text>
    <rect class="part" x="418" y="36" width="74" height="18" rx="8"/><text class="sm" x="455" y="49">RB</text>
    <circle class="part" cx="190" cy="125" r="23"/><circle cx="190" cy="125" r="11" fill="none" stroke="${ACC}" stroke-width="1.5"/>
    <circle class="part" cx="380" cy="190" r="21"/><circle cx="380" cy="190" r="10" fill="none" stroke="${ACC}" stroke-width="1.5"/>
    <path class="part" d="M240 183h16v-16h16v16h16v16h-16v16h-16v-16h-16z" transform="translate(-2 0)"/>
    <circle cx="450" cy="100" r="15" fill="#e8b830"/><text class="btn-l" x="450" y="105" style="fill:#17130f">Y</text>
    <circle cx="420" cy="128" r="15" fill="#3d7bd9"/><text class="btn-l" x="420" y="133" style="fill:#fff">X</text>
    <circle cx="480" cy="128" r="15" fill="#d9443d"/><text class="btn-l" x="480" y="133" style="fill:#fff">B</text>
    <circle cx="450" cy="156" r="15" fill="#4caf50"/><text class="btn-l" x="450" y="161" style="fill:#fff">A</text>
    <rect class="part" x="299" y="110" width="17" height="10" rx="4"/><rect x="331" y="110" width="17" height="10" rx="4" fill="${ACC}"/>
    ${CALLOUTS.map(callout).join('')}
    <line class="ld" x1="420" y1="143" x2="446" y2="270"/><circle class="dot" cx="420" cy="143" r="3"/>
    <text x="450" y="290" text-anchor="start"><tspan class="k">X</tspan><tspan class="v"> · Melee combo</tspan><tspan x="450" dy="17" class="s">In the air: jump slam</tspan></text>
    <line class="ld" x1="372" y1="209" x2="338" y2="270"/><circle class="dot" cx="372" cy="209" r="3"/>
    <text x="334" y="290" text-anchor="end"><tspan class="k">Right stick</tspan><tspan class="v"> · Aim</tspan></text>
    <line class="ld" x1="307" y1="109" x2="304" y2="8"/><line class="ld" x1="339" y1="109" x2="342" y2="8"/><circle class="dot" cx="307" cy="112" r="3"/><circle class="dot" cx="339" cy="112" r="3"/>
    <text x="298" y="6" text-anchor="end"><tspan class="k">View</tspan><tspan class="v"> · Map</tspan></text>
    <text x="348" y="6" text-anchor="start"><tspan class="k">Menu</tspan><tspan class="v"> · Pause / join</tspan></text>
  </g></svg>`;
}

// [action, keyboard + mouse, gamepad, touch]
const TABLE = [
  ['Move', 'W A S D / arrows', 'Left stick', 'Left joystick'],
  ['Aim', 'Mouse', 'Right stick', 'Auto-aim'],
  ['Melee combo', 'Left click', 'X', '⚔'],
  ['Jump (hold for a higher, 2-block jump)', 'Space', 'A', '⤒'],
  ['Jump slam (attack in the air)', 'Left click mid-jump', 'X mid-jump', '⚔ mid-jump'],
  ['Ranged technique', 'Right click', 'RT', '✦'],
  ['Dodge roll (dodge through attacks)', 'Shift', 'B', '⤳'],
  ['Techniques 1 · 2 · 3', '1 · 2 · 3', 'LB · RB · Y', '1 · 2 · 3'],
  ['Domain Expansion / ultimate (full CE bar)', 'F', 'D-pad ↑', '領域'],
  ['Reverse Cursed Technique (heal, always available, recharges over time)', 'Q', 'LT', '✚'],
  ['Cursed tools', 'R · T', 'D-pad ← · →', '—'],
  ['Interact (talk, open, travel, enter a curtain)', 'E', 'A when a prompt shows', 'Tap the prompt'],
  ['Inventory', 'I', 'D-pad ↓', 'Pause menu'],
  ['World map (fast travel) / dungeon map', 'Tab', 'View', 'Pause menu'],
  ['Quest log', 'J', 'Hold View', 'Pause menu'],
  ['Pause', 'Esc', 'Menu', '❚❚'],
  ['Zoom', 'Mouse wheel', '—', 'Pinch'],
  ['Turn the camera (on in Settings)', 'Z · C', '—', '—'],
  ['Menus', 'Arrows / WASD, Enter, Esc, or the mouse', 'D-pad or stick, A confirm, B back', 'Tap'],
];

export function openInstructions(game, onClose) {
  const ui = game.ui;
  const close = () => { ui.close('instructions'); onClose?.(); };
  let last = performance.now();
  ui.open('instructions', (el) => {
    const sec = (title, ...kids) => h('section', { class: 'ins-sec' }, h('h3', {}, title), ...kids);
    const body = h('div', { class: 'ins-scroll', tabindex: 0, 'aria-label': 'How to play' },
      sec('Your story',
        h('p', {}, 'You are a new first-year at ', h('b', {}, 'Tokyo Jujutsu High'), '. Your cursed technique was rolled when you enrolled. Curses are born from human fear, and sorcerers exorcise them.'),
        h('p', {}, h('b', {}, 'Objective. '), 'Play the story as ', h('b', {}, 'main quests'), ': from the Cursed Womb, through the Kyoto Goodwill Event, to the Shibuya Incident. Each chapter is briefed by someone in the right place (Gojo at the school, Nitta in Shibuya…) and ends in a curtain you walk into: a dungeon with a Special Grade curse at the end.')),
      sec('The open world',
        h('p', {}, 'Japan is ', h('b', {}, 'nine regions'), ': Jujutsu High and its valley town, the Cursed Forest, the Okinawa coast, Kyoto, Shinjuku, Shibuya and three Culling Game colonies (Tokyo No. 1, Sendai, Sakurajima). Walk anywhere: towns full of people, wild places full of curses, ruins, waterfalls and hidden lairs.'),
        h('ul', { class: 'tips' },
          h('li', {}, h('b', {}, 'One open world. '), 'The regions join up with no gates and no loading: follow a road to the edge of a region and just keep walking into the next one (you can see it ahead of you). Signposts mark the borders. The Culling Game colonies sit behind their barrier: you walk through it where the roads cross it, and only there.'),
          h('li', {}, h('b', {}, 'Window stations 窓. '), 'The Window (the sorcerers\' support network) keeps a glowing blue shrine in every region. Walk up to one to add it to your map, then touch any station, or open the World Map (Tab / View), to ', h('b', {}, 'fast travel'), ' to any station you have found.'),
          h('li', {}, h('b', {}, 'Quests. '), 'People with a gold ', h('b', { class: 'gold' }, '!'), ' over their heads have a side quest; a blue ? means a quest wants you to talk to them. Side quests ask you to exorcise curses, defeat a named curse, find lost things, rescue and escort someone, or clear a lair. The ', h('b', {}, 'Quest Log'), ' (J, hold View, or Pause) lists them; pick one and Track it.'),
          h('li', {}, h('b', {}, 'Where to go. '), 'Follow the ', h('b', { class: 'gold' }, 'gold arrow, beam and footprints'), ' to the tracked quest. When it is in another region they lead along the road over the border (or fast travel there). The minimap (top right) shows stations, the roads out (⇧), quest givers and curses.'),
          h('li', {}, h('b', {}, 'Curses roam '), 'the wild. Towns, camps and the school sit behind barriers: curses cannot follow you in.'))),
      sec('A chapter (a curtain)',
        h('ol', { class: 'steps' },
          h('li', {}, h('b', {}, 'Walk into the curtain '), '(a black dome with the chapter\'s card over it) and press Begin. Cleared chapters stay open for replays on a harder threat.'),
          h('li', {}, h('b', {}, 'Complete the goal: '), 'exorcise the curses, free the trapped, or hold to seal the cursed objects. The goal is shown top left.'),
          h('li', {}, h('b', {}, 'The arena gate opens. '), 'Beat the Special Grade curse inside. Watch for red ground markers: they show where an attack will land.'),
          h('li', {}, h('b', {}, 'Loot the chest, '), 'then leave through the glowing torii: you come back out at the curtain, in the open world.')),
        h('p', {}, h('b', {}, 'Losing. '), 'If the whole party goes down, everyone gets back up together at the start of the area. A downed teammate can be revived by standing next to them.')),
      sec('Controls',
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'map-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Action'), h('th', {}, 'Keyboard + mouse'), h('th', {}, 'Gamepad'), h('th', {}, 'Touch'))),
          h('tbody', {}, ...TABLE.map(([a, k, p, t]) => h('tr', {}, h('td', {}, a), h('td', {}, k), h('td', {}, p), h('td', {}, t))))))),
      sec('Gamepad', h('div', { class: 'pad-diagram', html: padSvg() })),
      sec('Technique tree and rerolls', h('ul', { class: 'tips' },
        h('li', {}, h('b', {}, 'Technique tree '), '(the shrine steps at Jujutsu High, or Pause → Technique Tree). You start with melee and your first technique. Spend technique points (2 per level) to unlock Techniques I–III, Reverse Cursed Technique, your Domain Expansion or ultimate, and upgrades.'),
        h('li', {}, h('b', {}, 'Rarity. '), 'Popular techniques are rare: Common up to Special Grade. The select screen shows the odds.'),
        h('li', {}, h('b', {}, 'Rerolls 🎲. '), 'A reroll spins a new technique. You start with 10, earn +1 per level and +2 per cleared chapter, or buy one for ◆40.'),
        h('li', {}, h('b', {}, 'Cursed Energy '), 'refills over time and from hits. A full bar lets you cast your Domain or ultimate: for a few seconds every attack is a sure hit.'))),
      sec('Tips', h('ul', { class: 'tips' },
        h('li', {}, h('b', {}, 'Jump slam. '), 'Jump, then attack in the air to dive down and hit everything around where you land.'),
        h('li', {}, h('b', {}, 'Dodge '), 'through attacks: a roll makes you briefly untouchable.'),
        h('li', {}, h('b', {}, 'Gear. '), 'Equip weapons, armour and cursed tools in the inventory, and spend enchantment points on them. Salvage the rest for coins.'),
        h('li', {}, h('b', {}, 'Saving. '), 'The game saves by itself. Pause → Save Code backs up your progress or moves it to another device.'))),
      sec('Playing together',
        h('p', {}, 'Up to four players share one screen: keyboard + mouse plus controllers. Press ', h('b', {}, 'Start'), ' or ', h('b', {}, 'A'), ' on a controller to join, on the select screen or any time in play. Each player rolls their own technique.'),
        h('p', {}, h('b', {}, 'Touch. '), 'On a phone or tablet, drag on the left to move; the buttons on the right attack, jump, dodge and cast. Landscape works best.')));
    el.appendChild(h('div', { class: 'panel ins-panel', role: 'dialog', 'aria-label': 'How to play', 'aria-modal': 'true' },
      h('h2', {}, 'How to Play'), body,
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px;align-items:center' },
        h('span', { class: 'hint', style: 'margin:0' }, 'Scroll: stick, D-pad, arrows or wheel · B / Esc close'),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: close }, 'Close'))));
  }, {
    dim: true, onBack: close,
    onNav: (m) => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      const sc = ui.top()?.el.querySelector('.ins-scroll'); if (!sc) return;
      let dy = 0;
      const k = game.input.keys;
      if (k.has('ArrowDown') || k.has('KeyS')) dy += 1; if (k.has('ArrowUp') || k.has('KeyW')) dy -= 1;
      for (const p of game.input.pads()) {
        const ay = Math.abs(p.axes[1] ?? 0) > 0.25 ? p.axes[1] : 0, ry = Math.abs(p.axes[3] ?? 0) > 0.25 ? p.axes[3] : 0;
        dy += ay + ry + (p.buttons[13]?.pressed ? 1 : 0) - (p.buttons[12]?.pressed ? 1 : 0);
      }
      if (dy) sc.scrollTop += Math.max(-2, Math.min(2, dy)) * 560 * dt;
      m.up = m.down = false;
    },
  });
}
