// Menu screens: title, pause, settings, controls, spellbook, journal, customisation,
// minigame select, results and credits. All navigable with mouse, touch, keys and d-pad.
import * as THREE from 'three';
import { G, HOUSES, HOUSE_KEYS } from './state.js';
import { SPELLS, spellIcon } from './spelldata.js';
import { BINDINGS, glyph, padGlyphSet } from './input.js';
import { crestSVG } from './ui.js';
import { saveSettings, hasSave, loadSave, newSave, writeSave, deleteSave } from './save.js';
import { setQuality } from './engine.js';
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES, WAND_WOODS } from './models.js';
import { el } from './util.js';
import { autoFullscreen, toggleFullscreen, canFullscreen, fullscreenElement } from './fullscreen.js';
import { PLATEAU } from './world/terrain.js';

const MINIGAMES = [
  { id: 'quidditch', name: 'Quidditch Practice', desc: 'Fly through rings, dodge Bludgers, catch the Snitch.', icon: '🧹' },
  { id: 'potions', name: 'Potions Class', desc: 'Add ingredients on the beat, stir and keep the heat steady.', icon: '⚗️' },
  { id: 'duel', name: 'Duelling Club', desc: 'A tournament of five ever-tougher duellists.', icon: '⚡' },
  { id: 'wanddraw', name: 'Wand Drawing', desc: 'Trace spell shapes quickly and neatly.', icon: '🪄' },
  { id: 'creatures', name: 'Hippogriff Flight', desc: 'Bow to Silvermane, then fly the rings over the grounds.', icon: '🦅' },
  { id: 'frogs', name: 'Chocolate Frog Chase', desc: 'Catch the escaped frogs before time runs out.', icon: '🐸' },
];

function title(h, sub) { return `<h2 class="m-title">${h}</h2>${sub ? `<p class="m-sub">${sub}</p>` : ''}`; }
const escHTML = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- online (loaded on first use)
let coopMod = null;
function online() {
  if (!coopMod) {
    coopMod = import('./online/coop.js').then((m) => { m.setLeaveHooks(onLeftWorld); return m; });
    coopMod.catch(() => { coopMod = null; });
  }
  return coopMod;
}
function closeNet() {
  const n = G.net;
  if (!n) return;
  G.net = null;
  n.close();
}

// ---------------------------------------------------------------- backdrop
let orbitT = 0;
export function menuBackdrop(init, dt = 0) {
  if (init) {
    G.world.setZone('grounds', 'spawn');
    G.player.root.visible = false;
    G.ui.showHUD(false);
  }
  orbitT += dt;
  const a = orbitT * 0.035 + 2.2;
  const pos = new THREE.Vector3(Math.sin(a) * 120, 40 + Math.sin(orbitT * 0.05) * 8, -60 + Math.cos(a) * 120);
  G.cam.setCinematic(pos, new THREE.Vector3(0, 32, -62), init ? 100 : 2);
}

// ---------------------------------------------------------------- title
export function openMainMenu() {
  closeNet(); // never online on the title screen
  G.ui.closeAll();
  G.mode = 'menu';
  G.paused = false;
  document.exitPointerLock?.();
  const hasS = hasSave() && loadSave()?.started;
  G.ui.open((w) => {
    w.innerHTML = `<div class="title-wrap"><div class="logo big">Hogwarts<span>Adventure</span></div><div class="tagline">A new student · eight spells · one House Cup</div></div><div class="menu-col"></div>
      <div class="m-foot">Not affiliated with any official Harry Potter product. Made with three.js · <span class="dev-ind"></span></div>`;
    const c = w.querySelector('.menu-col');
    if (hasS) G.ui.button(c, 'Continue', () => { autoFullscreen(); continueGame(); }, 'primary');
    G.ui.button(c, 'New Game', () => {
      autoFullscreen();
      if (hasS) confirmBox('Start a new game? Your current progress will be replaced.', () => newGame());
      else newGame();
    }, hasS ? '' : 'primary');
    // "Join Online World" appears here while a friend is hosting
    const joinSlot = el('div', 'join-slot');
    c.appendChild(joinSlot);
    watchJoin(joinSlot);
    G.ui.button(c, 'Minigames', () => openMinigames());
    G.ui.button(c, 'Settings', () => openSettings());
    G.ui.button(c, 'Controls', () => openControls());
    G.ui.button(c, 'Credits', () => openCredits(false, true));
    if (canFullscreen()) G.ui.button(c, fullscreenElement() ? 'Exit fullscreen' : 'Fullscreen', () => toggleFullscreen(), 'fs-btn');
    const ind = w.querySelector('.dev-ind');
    // browsers only start sound after a click or key press, never a controller button
    const soundOff = () => !G.audio.ctx || G.audio.ctx.state !== 'running';
    const upd = () => {
      ind.textContent = G.input.device === 'pad' ? `🎮 ${{ xbox: 'Xbox', ps: 'PlayStation', switch: 'Switch Pro' }[padGlyphSet()]} controller detected${soundOff() ? ' · click or press any key once to turn on sound' : ''}` : G.input.device === 'touch' ? '👆 Touch controls' : '⌨️ Keyboard & mouse';
    };
    const iv = setInterval(() => { if (!document.body.contains(ind)) clearInterval(iv); else upd(); }, 1000);
    upd();
    G.input.on(upd);
  }, { cls: 'main', modal: true });
}

function confirmBox(text, yes) {
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel small">${title('Are you sure?')}<p>${text}</p><div class="row"></div></div>`;
    const r = w.querySelector('.row');
    G.ui.button(r, 'Yes', () => { G.ui.close(); yes(); }, 'primary');
    G.ui.button(r, 'No', () => G.ui.close());
  }, { cls: 'modal' });
}

function newGame() {
  G.quitting = false;
  G.save = newSave();
  G.spells.unlocked = new Set();
  G.player.rebuild();
  G.story.rebuildCollectibles();
  G.ui.closeAll();
  openCustomize(() => {
    G.ui.closeAll();
    G.ui.fade(1, 0.6).then(() => {
      G.player.root.visible = true;
      G.story.beginNewGame();
    });
  });
}

function continueGame() {
  G.quitting = false;
  G.save = loadSave() || newSave();
  G.spells.unlocked = new Set(G.save.spells);
  G.player.rebuild();
  G.story.rebuildCollectibles();
  G.ui.closeAll();
  G.ui.fade(1, 0.4).then(async () => {
    G.player.root.visible = true;
    G.skyObj.tod = G.save.tod ?? 0.68;
    const zone = G.world.zones[G.save.zone] ? G.save.zone : 'greatHall';
    const p = G.save.pos;
    G.world.setZone(zone, p ? { pos: new THREE.Vector3(p[0], p[1], p[2]), yaw: p[3] } : null);
    G.story.stage = G.save.stage;
    if (G.save.stage === 0) { G.story.beginNewGame(); return; }
    G.cam.setCinematic(null);
    G.cam.snap();
    G.mode = 'play';
    G.ui.refreshHUD();
    G.ui.showHUD(true);
    G.story.onArrive(zone);
    await G.ui.fade(0, 0.6);
    G.ui.toast(`Welcome back, ${G.save.name}!`, 'info');
  });
}

// ---------------------------------------------------------------- pause
export function openPause() {
  if (G.ui.menuOpen) return;
  G.paused = true;
  document.exitPointerLock?.();
  G.ui.showHUD(false);
  G.ui.closeWheel();
  G.ui.open((w) => {
    const net = G.net;
    const sub = net?.isGuest ? `Visiting ${escHTML(net.hostName)}’s world · the world keeps going while you’re in this menu` : net?.isHost ? 'Your world is online · it keeps going while you’re in this menu' : '';
    w.innerHTML = `<div class="panel">${title('Paused', `${escHTML(G.save.name)} of ${HOUSES[G.save.house]?.name || 'no house yet'} · ${G.zone.label}${sub ? `<br><small>${sub}</small>` : ''}`)}<div class="menu-col"></div></div>`;
    const c = w.querySelector('.menu-col');
    G.ui.button(c, 'Resume', () => resume(), 'primary');
    if (net?.isGuest && !G.minigame) G.ui.button(c, `Go to ${escHTML(net.hostName)}`, () => { resume(); net.travelToHost(); });
    if (!net?.isGuest && G.save.stage > 0 && !G.minigame) {
      G.ui.button(c, net?.isHost ? 'Stop hosting' : 'Host this world online', () => {
        resume();
        if (G.net?.isHost) online().then((m) => m.stopHosting());
        else online().then((m) => m.hostWorld()).catch(() => G.ui.toast('Online play could not load. Check your connection.', 'info'));
      });
    }
    G.ui.button(c, 'Spellbook', () => openSpellbook());
    G.ui.button(c, 'Journal & Collection', () => openJournal());
    G.ui.button(c, 'House Points', () => openHouseBoard());
    G.ui.button(c, 'Settings', () => openSettings());
    G.ui.button(c, 'Controls', () => openControls());
    if (canFullscreen()) G.ui.button(c, fullscreenElement() ? 'Exit fullscreen' : 'Fullscreen', () => { toggleFullscreen(); resume(); });
    if (G.minigame) G.ui.button(c, 'Leave minigame', () => { const mg = G.minigame; resume(); mg.abort?.(); });
    if (net?.isGuest) G.ui.button(c, `Leave ${escHTML(net.hostName)}’s world`, () => confirmBox(`Leave ${escHTML(net.hostName)}’s world and go back to the title screen? Your own save is untouched.`, () => online().then((m) => m.leaveWorld(null))));
    else G.ui.button(c, 'Save & Quit to Title', () => { closeNet(); writeSave(); G.quitting = true; G.ui.cancelDialogue(); G.minigame?.abort?.(); G.minigame = null; G.enemies.clearZone(); G.player.flying = false; G.player.control = true; G.player.status.override = null; document.getElementById('draw-layer').classList.add('hidden'); menuBackdrop(true); openMainMenu(); G.audio.music('menu'); G.audio.wind(0); });
  }, { cls: 'pause', onBack: () => resume(), pauseCloses: true });
}
function resume() {
  G.ui.closeAll();
  G.paused = false;
  if (G.mode === 'play') G.ui.showHUD(true);
  if (G.input.device === 'kbm' && G.mode === 'play' && G.settings.pointerLock !== false) G.renderer.domElement.requestPointerLock?.();
}

// ---------------------------------------------------------------- settings
export function openSettings() {
  const S = G.settings;
  const save = () => { saveSettings(); G.audio.applyVolumes(); };
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel wide">${title('Settings')}<div class="opts"></div><div class="row"></div></div>`;
    const o = w.querySelector('.opts');
    const sec = (t) => o.appendChild(el('div', 'o-sec', t));
    sec('Graphics');
    G.ui.option(o, 'Quality', ['low', 'medium', 'high'], () => S.quality, (v) => { S.quality = v; save(); setQuality(v); }, (v) => ({ low: 'Low (phones)', medium: 'Medium', high: 'High' })[v]);
    G.ui.option(o, 'Ambient occlusion (High)', [true, false], () => S.ao, (v) => { S.ao = v; save(); setQuality(S.quality); }, (v) => (v ? 'On' : 'Off'));
    G.ui.option(o, 'Day length', [6, 12, 24, 0], () => S.dayLength, (v) => { S.dayLength = v; save(); }, (v) => (v ? v + ' min' : 'Frozen'));
    G.ui.option(o, 'Screen shake', [true, false], () => S.shake, (v) => { S.shake = v; save(); }, (v) => (v ? 'On' : 'Off'));
    if (canFullscreen()) G.ui.option(o, 'Fullscreen when playing', [true, false], () => S.fullscreen !== false, (v) => { S.fullscreen = v; save(); }, (v) => (v ? 'On' : 'Off'));
    G.ui.option(o, 'FPS counter', [false, true], () => S.fps, (v) => { S.fps = v; save(); }, (v) => (v ? 'On' : 'Off'));
    if (G.mode === 'play' && !G.minigame && G.save.started && G.save.stage > 0 && !G.net?.isGuest) {
      sec('Online');
      const row = el('div', 'opt nav', '<span class="o-label">Host this world online</span><span class="o-ctl"><b class="o-val"></b></span>');
      const val = row.querySelector('.o-val');
      const render = () => { val.textContent = G.net?.isHost ? 'On · friends can join' : 'Off'; };
      let waiting = false;
      const toggle = async () => {
        if (waiting) return;
        waiting = true;
        try {
          const m = await online();
          if (G.net?.isHost) m.stopHosting();
          else { val.textContent = 'Opening…'; await m.hostWorld(); }
        } catch { G.ui.toast('Online play could not load. Check your connection.', 'info'); }
        waiting = false;
        render();
      };
      row.addEventListener('click', toggle);
      row.addEventListener('adjust', toggle);
      render();
      o.appendChild(row);
      o.appendChild(el('p', 'o-note', 'Friends on other devices choose <b>Join Online World</b> on the title screen. You lead the story; they join in as your supporting cast.'));
    }
    sec('Audio');
    G.ui.slider(o, 'Music volume', 0, 1, 0.05, () => S.music, (v) => { S.music = v; save(); }, (v) => Math.round(v * 100) + '%');
    G.ui.slider(o, 'Effects volume', 0, 1, 0.05, () => S.sfx, (v) => { S.sfx = v; save(); }, (v) => Math.round(v * 100) + '%');
    G.ui.option(o, 'Mute all', [false, true], () => S.muted, (v) => { S.muted = v; save(); }, (v) => (v ? 'Muted' : 'Off'));
    G.ui.option(o, 'Dialogue voice blips', [true, false], () => S.voiceBlips !== false, (v) => { S.voiceBlips = v; save(); }, (v) => (v ? 'On' : 'Off'));
    sec('Controls');
    G.ui.slider(o, 'Mouse / touch look sensitivity', 0.3, 2.5, 0.05, () => S.sensitivity, (v) => { S.sensitivity = v; save(); });
    G.ui.slider(o, 'Controller look sensitivity', 0.3, 2.5, 0.05, () => S.padSensitivity, (v) => { S.padSensitivity = v; save(); });
    G.ui.slider(o, 'Stick dead zone', 0.05, 0.4, 0.01, () => S.deadzone, (v) => { S.deadzone = v; save(); });
    G.ui.option(o, 'Invert Y axis', [false, true], () => S.invertY, (v) => { S.invertY = v; save(); }, (v) => (v ? 'On' : 'Off'));
    G.ui.option(o, 'Controller vibration', [true, false], () => S.rumble, (v) => { S.rumble = v; save(); if (v) G.input.rumble(0.6, 0.6, 200); }, (v) => (v ? 'On' : 'Off'));
    G.ui.option(o, 'Button prompts', ['auto', 'xbox', 'ps', 'switch'], () => S.prompts, (v) => { S.prompts = v; save(); }, (v) => ({ auto: 'Automatic', xbox: 'Xbox', ps: 'PlayStation', switch: 'Switch' })[v]);
    G.ui.option(o, 'Capture mouse when playing', [true, false], () => S.pointerLock !== false, (v) => { S.pointerLock = v; save(); }, (v) => (v ? 'On' : 'Off (drag to look)'));
    const r = w.querySelector('.row');
    G.ui.button(r, 'Back', () => G.ui.close(), 'primary');
    if (!G.net) G.ui.button(r, 'Reset progress', () => confirmBox('Erase all saved progress?', () => { deleteSave(); G.save = newSave(); G.ui.toast('Progress erased', 'info'); }));
  }, { cls: 'settings' });
}

// ---------------------------------------------------------------- controls
const PAD_NAMES = {
  xbox: {},
  ps: { A: '✕', B: '◯', X: '☐', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', View: 'Create', Menu: 'Options' },
  switch: { A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', View: '−', Menu: '+' },
};
export function openControls() {
  G.ui.open((w) => {
    const set = padGlyphSet();
    const map = PAD_NAMES[set] || {};
    const padLabel = (s) => s.replace(/\b(A|B|X|Y|LB|RB|LT|RT|View|Menu)\b/g, (m) => map[m] || m);
    const rows = BINDINGS.map(([a, k, p]) => `<tr><td>${a}</td><td><span class="kc">${k}</span></td><td><span class="kc pad">${padLabel(p)}</span></td></tr>`).join('');
    w.innerHTML = `<div class="panel wide">${title('Controls', `Controller layout: ${{ xbox: 'Xbox', ps: 'PlayStation', switch: 'Switch Pro' }[set]} (change under Settings → Button prompts)`)}
      <div class="ctl-scroll nav" data-kind="scroll"><table class="ctl"><thead><tr><th>Action</th><th>Keyboard & mouse</th><th>Controller</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Touch</h3><p class="small">Drag on the left half to move (push to the edge to sprint) · drag on the right half to look · <b>swipe fast</b> on the right half to cast toward the swipe · buttons on the right: ✦ cast, 🛡 Protego, ⤳ dodge, ⤒ jump, ✋ interact, ◎ lock-on · spell icons pick a spell.</p>
      <h3>Minigames</h3><p class="small"><b>Quidditch & Hippogriff:</b> steer with WASD / mouse / left stick, boost with Shift / RT / ✦, roll-dodge with Space / A. <b>Potions:</b> choose ingredients with 1–6 or the d-pad and press on the beat; stir by circling the mouse or the right stick; heat with W/S or the triggers. <b>Wand drawing:</b> trace with the mouse or a finger; on a controller aim with either stick and hold RT to draw. Accuracy counts, not speed. <b>Frog chase:</b> run and press interact near a frog.</p>
      </div><div class="row"></div></div>`;
    G.ui.button(w.querySelector('.row'), 'Back', () => G.ui.close(), 'primary');
    const sc = w.querySelector('.ctl-scroll');
    sc.addEventListener('adjust', (e) => { sc.scrollTop += e.detail * 80; });
  }, { cls: 'controls' });
}

// ---------------------------------------------------------------- spellbook
export function openSpellbook(fromPlay) {
  if (fromPlay) { G.paused = true; document.exitPointerLock?.(); G.ui.showHUD(false); }
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel wide">${title('Spellbook', 'Select a spell to ready it. Lift, freeze or set foes alight, then follow up for combos.')}<div class="spellgrid"></div><div class="combos"><b>Combos:</b> Leviosa → Incendio = <i>Fire Comet</i> · Leviosa → Stupefy = <i>Meteor Slam</i> · Petrificus → Stupefy/Expelliarmus = <i>Shatter</i> · Incendio → Petrificus = <i>Steam Blast</i> · Expelliarmus → Stupefy = <i>Knockout</i></div><div class="row"></div></div>`;
    const g = w.querySelector('.spellgrid');
    SPELLS.forEach((s, i) => {
      const un = G.spells.unlocked.has(s.id);
      const card = el('button', 'spellcard nav' + (un ? '' : ' locked') + (G.spells.selected === i ? ' sel' : ''), un
        ? `${spellIcon(s, 52)}<div><b style="color:${s.css}">${i + 1}. ${s.name}</b><small>${s.desc}</small><em>Magic ${s.mana}${s.drain ? ` + ${s.drain}/s` : ''} · cooldown ${s.cd}s</em></div>`
        : `<span class="lock-ico big">?</span><div><b>${i + 1}. ???</b><small>${unlockHint(s.id)}</small></div>`);
      card.dataset.kind = 'grid';
      card.addEventListener('click', () => { if (un) { G.spells.select(i); g.querySelectorAll('.spellcard').forEach((c, k) => c.classList.toggle('sel', k === i)); G.audio.sfx('ui'); } });
      g.appendChild(card);
    });
    G.ui.button(w.querySelector('.row'), 'Close', () => close(), 'primary');
  }, { cls: 'book', onBack: () => close(), pauseCloses: true, bookCloses: true });
  function close() { G.ui.close(); if (fromPlay) resume(); }
}
function unlockHint(id) {
  return {
    stupefy: 'Learned at the Sorting.', protego: 'Learned at the Sorting.', lumos: 'Learned at the Sorting.',
    leviosa: 'Pass Professor Thornwick’s Charms class.', expelliarmus: 'Join the Duelling Club.', incendio: 'Taught in Potions.',
    petrificus: 'Reward for a brave deed in the dungeons.', patronum: 'Taught by the Headmistress when darkness comes.',
  }[id];
}

// ---------------------------------------------------------------- journal
export async function openJournal(fromPlay) {
  if (fromPlay) { G.paused = true; document.exitPointerLock?.(); G.ui.showHUD(false); }
  const { QUESTS } = await import('./story.js');
  const CARDS = ['Merlin', 'Morgana', 'Circe', 'Paracelsus', 'Cliodna', 'Agrippa', 'Ptolemy', 'Nicolas Flamel', 'Medea', 'Taliesin', 'Baba Yaga', 'Hengist'];
  G.ui.open((w) => {
    const s = G.save.stage;
    const q = QUESTS[Math.min(s, QUESTS.length - 1)];
    const done = QUESTS.slice(0, Math.min(s, 11)).map((x) => `<li>✔ ${x.title}</li>`).join('');
    const cards = CARDS.map((n, i) => `<div class="fcard ${G.save.cards.includes(i) ? 'got' : ''}">${G.save.cards.includes(i) ? `<b>${n}</b>` : '?'}</div>`).join('');
    const best = MINIGAMES.map((m) => `<li>${m.icon} ${m.name}: <b>${G.save.best[m.id] ?? '—'}</b></li>`).join('');
    w.innerHTML = `<div class="panel wide">${title('Journal')}
      <div class="nav jr" data-kind="scroll">
      <div class="j-cols"><div><h3>Current quest</h3><p><b>${q.title}</b><br>${q.objective}</p><h3>Completed</h3><ul class="done">${done || '<li>Nothing yet</li>'}</ul></div>
      <div><h3>Chocolate Frog Cards (${G.save.cards.length}/12)</h3><div class="fcards">${cards}</div>
      <h3>Bertie Bott's Every Flavour Beans</h3><p>${G.save.beans.length} / 30 found</p>
      <h3>Minigame bests</h3><ul>${best}</ul></div></div></div><div class="row"></div></div>`;
    G.ui.button(w.querySelector('.row'), 'Close', () => close(), 'primary');
    const jr = w.querySelector('.jr');
    jr.addEventListener('adjust', (e) => { jr.scrollTop += e.detail * 80; });
  }, { cls: 'journal', onBack: () => close(), pauseCloses: true });
  function close() { G.ui.close(); if (fromPlay) resume(); }
}

export function openHouseBoard() {
  const pts = G.save.points;
  const max = Math.max(...Object.values(pts));
  G.ui.open((w) => {
    const rows = HOUSE_KEYS.slice().sort((a, b) => pts[b] - pts[a]).map((k) => `<div class="hb-row" style="--c:${HOUSES[k].c1};--c2:${HOUSES[k].c2}">${crestSVG(k, 44)}<div class="hb-name">${HOUSES[k].name}${k === G.save.house ? ' <small>(your house)</small>' : ''}</div><div class="hb-bar"><i style="width:${(pts[k] / max) * 100}%"></i></div><b>${pts[k]}</b></div>`).join('');
    w.innerHTML = `<div class="panel">${title('House Points', 'Win points with lessons, duels, minigames, brave deeds and collectibles.')}<div class="hboard">${rows}</div><div class="row"></div></div>`;
    G.ui.button(w.querySelector('.row'), 'Close', () => G.ui.close(), 'primary');
  }, { cls: 'board' });
}

// ---------------------------------------------------------------- customisation
export function openCustomize(onDone, opts = {}) {
  const look = G.save.look;
  const p = G.player;
  G.world.setZone('greatHall', { pos: G.world.zones.greatHall.W(0, 0, 30), yaw: 0 });
  p.root.visible = true;
  p.teleport(G.world.zones.greatHall.W(0, 0, 30), 0);
  const narrow = innerWidth < 720;
  const camPos = G.world.zones.greatHall.W(narrow ? 0 : 0.95, narrow ? 1.9 : 1.45, narrow ? 34.2 : 33.3);
  const look2 = G.world.zones.greatHall.W(narrow ? 0 : 0.95, narrow ? 0.7 : 1.1, 30);
  G.cam.setCinematic(camPos, look2, 100);
  const rebuild = () => { p.rebuild(); p.anim.set('idle'); };
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel side">${title('Your Student', 'Customise your look. Your house is chosen by the Sorting Hat.')}<div class="opts"></div><div class="row"></div></div>`;
    const o = w.querySelector('.opts');
    const nameRow = el('div', 'opt nav', `<span class="o-label">Name</span><input class="name-in" maxlength="16" value="${G.save.name}">`);
    const inp = nameRow.querySelector('input');
    inp.addEventListener('input', () => { G.save.name = inp.value.trim() || 'Student'; });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); e.stopPropagation(); });
    nameRow.addEventListener('click', () => inp.focus());
    const names = ['Rowan', 'Elsie', 'Tobias', 'Ada', 'Kit', 'Morgan', 'Nell', 'Ezra', 'Wren', 'Alfie', 'Juniper', 'Felix'];
    nameRow.addEventListener('adjust', (e) => { const i = (names.indexOf(G.save.name) + e.detail + names.length) % names.length; G.save.name = names[i]; inp.value = names[i]; });
    o.appendChild(nameRow);
    G.ui.option(o, 'Skin tone', SKIN_TONES.map((_, i) => i), () => look.skin, (v) => { look.skin = v; rebuild(); }, (v) => `<i class="sw" style="background:${SKIN_TONES[v]}"></i>`);
    G.ui.option(o, 'Hair style', HAIR_STYLES, () => look.hairStyle, (v) => { look.hairStyle = v; rebuild(); }, (v) => v[0].toUpperCase() + v.slice(1));
    G.ui.option(o, 'Hair colour', HAIR_COLORS.map((_, i) => i), () => look.hairColor, (v) => { look.hairColor = v; rebuild(); }, (v) => `<i class="sw" style="background:${HAIR_COLORS[v]}"></i>`);
    G.ui.option(o, 'Eyes', ['#3a2a1a', '#2a5a8a', '#3a7a3a', '#6a6a6a', '#8a5a2a'], () => look.eyes, (v) => { look.eyes = v; rebuild(); }, (v) => `<i class="sw" style="background:${v}"></i>`);
    G.ui.option(o, 'Glasses', [false, true], () => look.glasses, (v) => { look.glasses = v; rebuild(); }, (v) => (v ? 'Round' : 'None'));
    G.ui.option(o, 'Pointed hat', [false, true], () => look.hat, (v) => { look.hat = v; rebuild(); }, (v) => (v ? 'Yes' : 'No'));
    G.ui.option(o, 'Wand wood', Object.keys(WAND_WOODS), () => look.wand, (v) => { look.wand = v; rebuild(); }, (v) => v[0].toUpperCase() + v.slice(1));
    const r = w.querySelector('.row');
    G.ui.button(r, opts.doneLabel || 'Begin your first year ›', () => { autoFullscreen(); onDone(); }, 'primary');
    G.ui.button(r, 'Back', back);
  }, { cls: 'custom', onBack: back });
  function back() { G.ui.close(); if (opts.onBack) { opts.onBack(); return; } G.mode = 'menu'; menuBackdrop(true); openMainMenu(); }
  G.mode = 'menu-custom';
}

// ---------------------------------------------------------------- minigames
export function openMinigames() {
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel wide">${title('Minigames', 'Practise any time. Points count for your house once you have been Sorted.')}<div class="mg-grid"></div><div class="row"></div></div>`;
    const g = w.querySelector('.mg-grid');
    MINIGAMES.forEach((m) => {
      const b = el('button', 'mg-card nav', `<span class="mg-ico">${m.icon}</span><b>${m.name}</b><small>${m.desc}</small><em>Best: ${G.save.best[m.id] ?? '—'}</em>`);
      b.dataset.kind = 'grid';
      b.addEventListener('click', () => { autoFullscreen(); launchFromMenu(m.id); });
      g.appendChild(b);
    });
    G.ui.button(w.querySelector('.row'), 'Back', () => G.ui.close(), 'primary');
  }, { cls: 'mgsel' });
}
async function launchFromMenu(id) {
  const { runMinigame } = await import('./minigames/index.js');
  G.quitting = false;
  G.ui.closeAll();
  const saved = loadSave();
  if (saved && saved.started) { G.save = saved; G.spells.unlocked = new Set(saved.spells); }
  // practice needs a few spells for the duel
  for (const s of ['stupefy', 'protego', 'expelliarmus', 'lumos', 'petrificus']) if (id === 'duel' || id === 'frogs') G.spells.unlocked.add(s);
  G.player.rebuild();
  G.player.root.visible = true;
  G.ui.refreshHUD();
  await runMinigame(id, { practice: true, fromMenu: true });
  if (G.quitting) return;
  if (saved && saved.started) writeSave();
  G.spells.unlocked = new Set(G.save.spells);
  menuBackdrop(true);
  openMainMenu();
  G.audio.music('menu');
}

// ---------------------------------------------------------------- results / credits
export function openResults(r) {
  return new Promise((res) => {
    G.ui.open((w) => {
      const lines = (r.lines || []).map(([a, b]) => `<div class="rs-line"><span>${a}</span><b>${b}</b></div>`).join('');
      w.innerHTML = `<div class="panel small results">${title(r.title, r.sub || '')}<div class="rs">${lines}</div>${r.points ? `<div class="rs-pts">+${r.points} points to ${HOUSES[G.save.house]?.name || 'your house'}</div>` : ''}${r.best ? '<div class="rs-best">New personal best!</div>' : ''}<div class="row"></div></div>`;
      const row = w.querySelector('.row');
      G.ui.button(row, 'Continue', () => { G.ui.close(); res('continue'); }, 'primary');
      if (r.retry) G.ui.button(row, 'Try again', () => { G.ui.close(); res('retry'); });
    }, { cls: 'resultscr', modal: true });
  });
}

export function openCredits(won, fromMenu) {
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel">${title(fromMenu ? 'Credits' : won ? 'The House Cup is yours!' : 'The End of Term')}
      <div class="credits">
      ${fromMenu ? '' : `<p>${won ? 'Your house lifts the House Cup — thanks in no small part to you.' : 'Another house took the Cup this year, but Hogwarts is safe thanks to you.'} You can keep exploring, hunt for collectibles and play the minigames to earn more points.</p>`}
      <p><b>Hogwarts Adventure</b> — a fan-made, Harry Potter–inspired game. Not affiliated with or endorsed by J.K. Rowling, Warner Bros. or Wizarding World.</p>
      <p>Everything you see and hear is generated in code: procedural castle, characters, textures, particles, an original orchestral-style score and synthesized sound effects (Web Audio). No external models or sound files.</p>
      <p>Built with <a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> (MIT) — WebGL rendering, EffectComposer, UnrealBloom, GTAO.</p>
      <p>Fonts: Cinzel, Cinzel Decorative and EB Garamond (SIL Open Font License) via Google Fonts.</p>
      </div><div class="row"></div></div>`;
    G.ui.button(w.querySelector('.row'), fromMenu ? 'Back' : 'Keep exploring', () => { G.ui.close(); if (!fromMenu) { G.mode = 'play'; G.ui.showHUD(true); } }, 'primary');
  }, { cls: 'creditscr' });
}

// ---------------------------------------------------------------- online: joining a friend's world
// The title screen checks for open worlds and shows "Join Online World" while one is hosted.
function watchJoin(slot) {
  let key = '';
  online().then((m) => {
    if (!document.body.contains(slot)) return;
    const stop = m.watchWorlds((rooms) => {
      if (!document.body.contains(slot)) { stop(); return; }
      const list = (rooms || []).filter((r) => r.count < r.capacity);
      const k = list.map((r) => r.id + r.title).join('|');
      if (k === key) return;
      key = k;
      slot.innerHTML = '';
      if (!list.length) return;
      const label = list.length === 1 ? `Join Online World<small>${escHTML(list[0].title)}</small>` : `Join Online World<small>${list.length} worlds open</small>`;
      G.ui.button(slot, label, () => (list.length === 1 ? startJoin(list[0]) : openWorldList(list)), 'join-btn');
    });
  }).catch(() => { /* online play unavailable: the title screen works as before */ });
}

function openWorldList(rooms) {
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel small">${title('Join Online World', 'Pick a friend’s world.')}<div class="menu-col"></div><div class="row"></div></div>`;
    const c = w.querySelector('.menu-col');
    for (const r of rooms) G.ui.button(c, `${escHTML(r.title)} <small>${r.count}/${r.capacity}</small>`, () => { G.ui.close(); startJoin(r); });
    G.ui.button(w.querySelector('.row'), 'Back', () => G.ui.close());
  }, { cls: 'modal' });
}

async function startJoin(room) {
  autoFullscreen();
  let m;
  try { m = await online(); } catch { infoBox('Online play could not load. Check your connection and try again.'); return; }
  G.ui.closeAll();
  m.joinWorld(room, {
    openCustomize: () => new Promise((res) => openCustomize(() => res(true), { onBack: () => res(null), doneLabel: 'Continue ›' })),
    pickHouse,
    backToTitle: (msg) => {
      G.ui.closeAll();
      G.mode = 'menu';
      G.save = loadSave() || newSave();
      G.player.rebuild();
      menuBackdrop(true);
      openMainMenu();
      if (msg) infoBox(msg);
    },
    connecting: (text, onCancel) => {
      const entry = G.ui.open((w) => {
        w.innerHTML = `<div class="panel small">${title(text)}<p class="m-sub"><span class="crest-spin small">✦</span> Connecting…</p><div class="row"></div></div>`;
        G.ui.button(w.querySelector('.row'), 'Cancel', () => {
          G.ui.close(entry);
          onCancel();
          G.ui.closeAll();
          G.mode = 'menu';
          G.save = loadSave() || newSave();
          G.player.rebuild();
          menuBackdrop(true);
          openMainMenu();
        });
      }, { cls: 'modal', modal: true });
      return { close: () => G.ui.close(entry) };
    },
  });
}

// a visitor without a save of their own picks a house (there's no Sorting in someone else's world)
function pickHouse() {
  G.ui.closeAll();
  return new Promise((res) => {
    G.ui.open((w) => {
      w.innerHTML = `<div class="panel">${title('Choose your house', 'You’re visiting a friend’s world. Points you earn there go to your house.')}<div class="house-pick"></div><div class="row"></div></div>`;
      const g = w.querySelector('.house-pick');
      for (const k of HOUSE_KEYS) {
        const b = el('button', 'hp-card nav', `${crestSVG(k, 56)}<b>${HOUSES[k].name}</b>`);
        b.dataset.kind = 'grid';
        b.addEventListener('click', () => { G.audio.sfx('ui'); G.ui.close(); res(k); });
        g.appendChild(b);
      }
      const r = w.querySelector('.row');
      G.ui.button(r, 'Let the Hat decide', () => { G.ui.close(); res(HOUSE_KEYS[Math.floor(Math.random() * 4)]); });
      G.ui.button(r, 'Back', () => { G.ui.close(); res(null); });
    }, { cls: 'modal', onBack: () => { G.ui.close(); res(null); } });
  });
}

function infoBox(text) {
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel small">${title('Online')}<p>${escHTML(text)}</p><div class="row"></div></div>`;
    G.ui.button(w.querySelector('.row'), 'OK', () => G.ui.close(), 'primary');
  }, { cls: 'modal' });
}

// a visit ended (by choice, or the world closed): back to the title with my own save
function onLeftWorld(message) {
  G.quitting = true;
  G.ui.cancelDialogue();
  G.minigame?.abort?.();
  G.minigame = null;
  G.enemies.clearZone();
  G.paused = false;
  const P = G.player;
  if (G.spells.lumosOn) G.spells.toggleLumos(false);
  P.flying = false; P.control = true; P.status.override = null; P.alive = true; P.hp = P.maxHp; P.mana = P.maxMana;
  if (P.root.parent !== G.scene) { P.root.parent?.remove(P.root); G.scene.add(P.root); }
  P.model.root.position.set(0, 0, 0);
  document.getElementById('draw-layer').classList.add('hidden');
  G.save = loadSave() || newSave();
  G.spells.unlocked = new Set(G.save.spells);
  P.rebuild();
  G.story.syncStage(G.save.stage);
  G.story.rebuildCollectibles();
  G.ui.updatePoints();
  G.skyObj.lock = null;
  G.skyObj.tod = G.save.tod ?? 0.68;
  G.ui.closeAll();
  menuBackdrop(true);
  openMainMenu();
  G.audio.music('menu');
  G.audio.wind(0);
  if (message) infoBox(message);
}
