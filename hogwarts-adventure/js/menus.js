// Menu screens: title, pause, settings, controls, spellbook, journal, customisation,
// minigame select, results and credits. All navigable with mouse, touch, keys and d-pad.
import * as THREE from 'three';
import { G, HOUSES, HOUSE_KEYS } from './state.js';
import { SPELLS, spellIcon } from './spelldata.js';
import { BINDINGS, glyph, padGlyphSet } from './input.js';
import { crestSVG } from './ui.js';
import { saveSettings, hasSave, loadSave, newSave, writeSave, deleteSave, SLOTS, peekSlot, currentSlot, setSlot, latestSlot, anySave, loadYearSnapshot } from './save.js';
import { TALENTS, TALENT_MAX, spendTalent, resetTalents, slotCount, slotsFor, equippable, setSlot as setSpellSlot, masteryLevel, MASTERY_STEPS, YEARS, today, xpForLevel, levelProgress } from './progress.js';
import { SPELL_BY_ID } from './spelldata.js';
import { ITEMS, SHOPS, coins, itemCount, buy, useItem, frogCard } from './items.js';
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
  G.ui.closeAll();
  G.mode = 'menu';
  G.paused = false;
  G.practiceSave = false;
  document.exitPointerLock?.();
  const last = latestSlot();
  const lastSave = last ? peekSlot(last) : null;
  G.ui.open((w) => {
    w.innerHTML = `<div class="title-wrap"><div class="logo big">Hogwarts<span>Adventure</span></div><div class="tagline">Seven years · thirty spells · one House Cup at a time</div></div><div class="menu-col"></div>
      <div class="m-foot">Not affiliated with any official Harry Potter product. Made with three.js · <span class="dev-ind"></span></div>`;
    const c = w.querySelector('.menu-col');
    if (lastSave) G.ui.button(c, `Continue <small>${lastSave.name} · Year ${lastSave.year}</small>`, () => { autoFullscreen(); setSlot(last); continueGame(); }, 'primary');
    G.ui.button(c, 'New Game', () => { autoFullscreen(); openSlots('new'); }, lastSave ? '' : 'primary');
    if (anySave()) G.ui.button(c, 'Load Game', () => openSlots('load'));
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

function slotSummary(s) {
  if (!s || !s.started) return '<i>Empty</i>';
  const h = HOUSES[s.house];
  const hrs = Math.floor((s.playTime || 0) / 3600), mins = Math.floor(((s.playTime || 0) % 3600) / 60);
  return `${h ? crestSVG(s.house, 22) : ''}<b>${s.name}</b> · Year ${s.year}${s.yearDone ? ' (complete)' : ''} · Level ${s.level}<small>${h ? h.name + ' · ' : ''}${hrs}h ${mins}m${s.savedAt ? ' · ' + new Date(s.savedAt).toLocaleDateString() : ''}</small>`;
}
// save slot picker: 'new' starts a game in a slot, 'load' loads one
function openSlots(kind) {
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel">${title(kind === 'new' ? 'Choose a save slot' : 'Load game', kind === 'new' ? 'Your progress is saved here automatically.' : 'Pick a slot, or the latest autosave.')}<div class="menu-col slots"></div><div class="row"></div></div>`;
    const c = w.querySelector('.slots');
    for (const n of SLOTS) {
      const s = peekSlot(n);
      if (kind === 'load' && !s?.started) continue;
      G.ui.button(c, `<span class="sl-n">${n}</span><span class="sl-d">${slotSummary(s)}</span>`, () => {
        if (kind === 'load') { setSlot(n); G.ui.closeAll(); continueGame(); return; }
        const go = () => { setSlot(n); newGame(); };
        if (s?.started) confirmBox(`Overwrite slot ${n} (${s.name}, Year ${s.year})?`, go); else go();
      }, 'slot-btn');
    }
    const auto = peekSlot('auto');
    if (kind === 'load' && auto?.started) {
      G.ui.button(c, `<span class="sl-n">⟳</span><span class="sl-d">Autosave · ${slotSummary(auto)}</span>`, () => {
        G.ui.closeAll();
        G.save = auto; // continue into the current slot
        startFromSave();
      }, 'slot-btn');
    }
    G.ui.button(w.querySelector('.row'), 'Back', () => G.ui.close(), 'primary');
  }, { cls: 'slotscr' });
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
  G.spells.setUnlocked([]);
  G.player.rebuild();
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
  G.save = loadSave() || newSave();
  startFromSave();
}
export function startFromSave() {
  G.quitting = false;
  G.spells.setUnlocked(G.save.spells);
  G.player.rebuild();
  G.ui.closeAll();
  G.ui.fade(1, 0.4).then(async () => {
    G.player.root.visible = true;
    G.skyObj.tod = G.save.tod ?? 0.68;
    const zone = G.world.zones[G.save.zone] && !G.world.zones[G.save.zone].noSave ? G.save.zone : 'greatHall';
    const p = G.save.pos;
    G.world.setZone(zone, p ? { pos: new THREE.Vector3(p[0], p[1], p[2]), yaw: p[3] } : null);
    G.story.resume();
    if (G.save.journey) {
      const { runJourney } = await import('./journey.js');
      const j = G.save.journey;
      G.ui.fade(0, 0.5);
      if (!(await runJourney(j.year, j.step))) return;
      if (j.year === 1) { G.story.sortingAfterJourney(); return; }
      await G.story.startYear(j.year);
      return;
    }
    if (G.save.year === 1 && G.save.stage === 0) { G.story.beginNewGame(); return; }
    G.cam.setCinematic(null);
    G.cam.snap();
    G.mode = 'play';
    G.ui.refreshHUD();
    G.ui.showHUD(true);
    G.story.onArrive(zone);
    await G.ui.fade(0, 0.6);
    G.ui.toast(`Welcome back, ${G.save.name}! ${today().label}, Year ${G.save.year}.`, 'info');
    if (G.save.yearDone) G.story.offerNextYear?.();
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
    w.innerHTML = `<div class="panel">${title('Paused', `${G.save.name} of ${HOUSES[G.save.house]?.name || 'no house yet'} · ${G.zone.label}`)}<div class="menu-col"></div></div>`;
    const c = w.querySelector('.menu-col');
    G.ui.button(c, 'Resume', () => resume(), 'primary');
    G.ui.button(c, 'Spellbook', () => openSpellbook());
    G.ui.button(c, `Owl Post & Journal${unreadBadge()}`, () => openJournal());
    G.ui.button(c, `Satchel <small>${coins()} Sickles</small>`, () => openSatchel());
    G.ui.button(c, 'School Years', () => openYears());
    G.ui.button(c, 'House Points', () => openHouseBoard());
    G.ui.button(c, 'Settings', () => openSettings());
    G.ui.button(c, 'Controls', () => openControls());
    if (canFullscreen()) G.ui.button(c, fullscreenElement() ? 'Exit fullscreen' : 'Fullscreen', () => { toggleFullscreen(); resume(); });
    if (G.minigame) G.ui.button(c, 'Leave minigame', () => { const mg = G.minigame; resume(); mg.abort?.(); });
    G.ui.button(c, 'Save & Quit to Title', () => { writeSave(); G.quitting = true; G.ui.cancelDialogue(); G.minigame?.abort?.(); G.minigame = null; G.enemies.clearZone(); G.player.flying = false; G.player.control = true; G.player.status.override = null; document.getElementById('draw-layer').classList.add('hidden'); menuBackdrop(true); openMainMenu(); G.audio.music('menu'); G.audio.wind(0); });
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
    G.ui.button(r, 'Erase this save slot', () => confirmBox(`Erase save slot ${currentSlot()}?`, () => { deleteSave(); G.save = newSave(); G.ui.toast('Save slot erased', 'info'); }));
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
// Tabs: Loadouts (equip spells into slots, three saved loadouts), Spells (all learned
// spells and mastery) and Talents. Every row works with d-pad / arrows / mouse / touch.
let bookTab = 'loadout';
export function openSpellbook(fromPlay, tab) {
  if (fromPlay) { G.paused = true; document.exitPointerLock?.(); G.ui.showHUD(false); }
  if (tab) bookTab = tab;
  let entry;
  const rebuild = () => { const f = entry.focus; G.ui.close(entry); open(f); };
  const open = (focus = 0) => {
    entry = G.ui.open((w) => {
      const pts = G.save.talentPts;
      w.innerHTML = `<div class="panel wide">${title('Spellbook', `Level ${G.save.level} · ${Math.floor(levelProgress() * 100)}% to next level${pts ? ` · <b class="gold">${pts} talent point${pts > 1 ? 's' : ''} to spend</b>` : ''}`)}<div class="tabs"></div><div class="book-body"></div><div class="row"></div></div>`;
      const tabs = w.querySelector('.tabs'), body = w.querySelector('.book-body');
      for (const [k, label] of [['loadout', 'Loadouts'], ['spells', 'Spells'], ['talents', `Talents${pts ? ' •' : ''}`]]) {
        const b = el('button', 'tab nav' + (bookTab === k ? ' on' : ''), label);
        b.dataset.kind = 'grid';
        b.addEventListener('click', () => { bookTab = k; G.audio.sfx('ui'); rebuild(); });
        tabs.appendChild(b);
      }
      if (bookTab === 'loadout') buildLoadouts(body, rebuild);
      else if (bookTab === 'spells') buildSpellList(body);
      else buildTalents(body, rebuild);
      G.ui.button(w.querySelector('.row'), 'Close', () => close(), 'primary');
    }, { cls: 'book', onBack: () => close(), pauseCloses: true, bookCloses: true, focus });
  };
  open();
  function close() { G.ui.close(entry); G.ui.buildSpellBar(); if (fromPlay) resume(); }
}
function buildLoadouts(body, rebuild) {
  const s = G.save;
  const n = slotCount();
  const learned = [...G.spells.unlocked].filter(equippable);
  body.innerHTML = `<p class="small">You can equip <b>${n}</b> spells (more unlock each school year). <b>Protego</b> is always on the block button. Swap loadouts in play with ${G.input.device === 'pad' ? 'the D-pad ↑ ↓' : G.input.device === 'touch' ? 'the loadout button by your spells' : 'T'}.</p><div class="ldo-tabs"></div><div class="opts ldo-slots"></div>`;
  const lt = body.querySelector('.ldo-tabs');
  for (let li = 0; li < 3; li++) {
    const b = el('button', 'tab nav' + (s.loadout === li ? ' on' : ''), `Loadout ${li + 1}`);
    b.dataset.kind = 'grid';
    b.addEventListener('click', () => { s.loadout = li; G.spells.selected = 0; G.audio.sfx('ui'); rebuild(); });
    lt.appendChild(b);
  }
  const o = body.querySelector('.ldo-slots');
  const L = s.loadouts[s.loadout];
  for (let i = 0; i < 8; i++) {
    if (i >= n) {
      const yr = YEARS.find((y) => slotsFor(y.n) > i);
      o.appendChild(el('div', 'opt disabled', `<span class="o-label">Slot ${i + 1}</span><span class="o-ctl"><i>Unlocks in Year ${yr ? yr.n : 7}</i></span>`));
      continue;
    }
    const values = [null, ...learned];
    G.ui.option(o, `Slot ${i + 1}`, values, () => L[i] ?? null, (v) => { if (v) setSpellSlot(s.loadout, i, v); else L[i] = null; G.ui.buildSpellBar(); setTimeout(rebuild, 0); },
      (v) => (v ? `${spellIcon(SPELL_BY_ID[v], 22)} ${SPELL_BY_ID[v].name} ${'★'.repeat(masteryLevel(v))}` : '<i>Empty</i>'));
  }
}
function buildSpellList(body) {
  body.innerHTML = `<div class="spellgrid"></div><div class="combos small" id="combo-list"></div>`;
  const g = body.querySelector('.spellgrid');
  for (const sp of SPELLS) {
    const un = G.spells.unlocked.has(sp.id);
    const m = masteryLevel(sp.id), uses = G.save.mastery[sp.id] || 0, next = MASTERY_STEPS[m + 1];
    const card = el('button', 'spellcard nav' + (un ? '' : ' locked'), un
      ? `${spellIcon(sp, 52)}<div><b style="color:${sp.css}">${sp.name}</b> <span class="gold">${'★'.repeat(m)}${'☆'.repeat(4 - m)}</span><small>${sp.desc}</small><em>Magic ${sp.mana}${sp.drain ? ` + ${sp.drain}/s` : ''} · cooldown ${sp.cd}s${next ? ` · mastery ${uses}/${next}` : ' · mastered'}</em>${sp.puzzle ? `<em class="puz">Puzzles: ${sp.puzzle}</em>` : ''}</div>`
      : `<span class="lock-ico big">?</span><div><b>???</b><small>${sp.hint || unlockHint(sp.id) || 'Learned in a later year.'}</small></div>`);
    card.dataset.kind = 'grid';
    g.appendChild(card);
  }
  body.querySelector('#combo-list').innerHTML = `<b>Combos:</b> ${COMBOS.filter((c) => c.need.every((id) => G.spells.unlocked.has(id))).map((c) => `${c.how} = <i>${c.name}</i>`).join(' · ') || 'Learn more spells to discover combos.'}`;
}
function buildTalents(body, rebuild) {
  const s = G.save;
  body.innerHTML = `<p class="small">Earn a talent point every level. Ranks max out at ${TALENT_MAX}.</p><div class="menu-col talents"></div>`;
  const c = body.querySelector('.talents');
  for (const [k, t] of Object.entries(TALENTS)) {
    const r = s.talents[k];
    G.ui.button(c, `<span class="t-ico">${t.icon}</span><span class="t-txt"><b>${t.name}</b> <span class="pips">${'◆'.repeat(r)}${'◇'.repeat(TALENT_MAX - r)}</span><small>${t.desc}</small></span><span class="t-plus">${s.talentPts > 0 && r < TALENT_MAX ? '+' : ''}</span>`, () => { if (spendTalent(k)) { G.audio.sfx('unlock'); G.ui.updateXP(); rebuild(); } else G.audio.sfx('fail'); }, 'talent-btn');
  }
  G.ui.button(c, 'Reset talents (free)', () => { resetTalents(); G.ui.updateXP(); rebuild(); });
}
const COMBOS = [
  { name: 'Fire Comet', how: 'Leviosa → Incendio', need: ['leviosa', 'incendio'] },
  { name: 'Meteor Slam', how: 'Leviosa → Stupefy', need: ['leviosa', 'stupefy'] },
  { name: 'Shatter', how: 'Petrificus → Stupefy/Expelliarmus', need: ['petrificus', 'stupefy'] },
  { name: 'Steam Blast', how: 'Incendio → Petrificus', need: ['incendio', 'petrificus'] },
  { name: 'Knockout', how: 'Expelliarmus → Stupefy', need: ['expelliarmus', 'stupefy'] },
];
export function registerCombo(c) { COMBOS.push(c); }
function unlockHint(id) {
  return {
    stupefy: 'Learned at the Sorting.', protego: 'Learned at the Sorting.', lumos: 'Learned at the Sorting.',
    leviosa: 'Pass Professor Thornwick’s Charms class.', expelliarmus: 'Join the Duelling Club.', incendio: 'Taught in Potions.',
    petrificus: 'Reward for a brave deed in the dungeons.', patronum: 'Taught by the Headmistress when darkness comes.',
  }[id];
}
function unreadBadge() { const n = (G.save.letters || []).filter((l) => !l.read).length; return n ? ` <span class="badge">${n}</span>` : ''; }

// ---------------------------------------------------------------- owl post + journal
export async function openJournal(fromPlay) {
  if (fromPlay) { G.paused = true; document.exitPointerLock?.(); G.ui.showHUD(false); }
  const CARDS = ['Merlin', 'Morgana', 'Circe', 'Paracelsus', 'Cliodna', 'Agrippa', 'Ptolemy', 'Nicolas Flamel', 'Medea', 'Taliesin', 'Baba Yaga', 'Hengist'];
  G.ui.open((w) => {
    const q = G.story.currentQuest();
    const date = today();
    const letters = G.save.letters || [];
    const done = G.story.completedQuests().map((x) => `<li>✔ ${x}</li>`).join('');
    const cards = CARDS.map((n, i) => `<div class="fcard ${G.save.cards.includes(i) ? 'got' : ''}">${G.save.cards.includes(i) ? `<b>${n}</b>` : '?'}</div>`).join('');
    const best = MINIGAMES.map((m) => `<li>${m.icon} ${m.name}: <b>${G.save.best[m.id] ?? '—'}</b></li>`).join('');
    const extra = G.story.journalExtra ? G.story.journalExtra() : '';
    w.innerHTML = `<div class="panel wide">${title('Owl Post & Journal', `Year ${G.save.year} · ${date.label} · ${date.term}`)}
      <div class="nav jr" data-kind="scroll">
      <div class="j-cols"><div><h3>Current quest</h3><p><b>${q.title}</b><br>${q.objective}</p>
      <h3>Owl post</h3><div class="letters">${letters.length ? letters.map((l) => `<details class="letter ${l.read ? '' : 'new'}"${l === letters[0] ? ' open' : ''}><summary>🦉 <b>${l.title}</b> <small>— ${l.from}, Year ${l.year}</small></summary><p>${l.body}</p></details>`).join('') : '<p class="small">No letters yet.</p>'}</div>
      <h3>Completed this year</h3><ul class="done">${done || '<li>Nothing yet</li>'}</ul></div>
      <div>${extra}<h3>Chocolate Frog Cards (${G.save.cards.length}/12)</h3><div class="fcards">${cards}</div>
      <h3>Bertie Bott's Every Flavour Beans</h3><p>${G.save.beans.length} / 30 found</p>
      <h3>Minigame bests</h3><ul>${best}</ul></div></div></div><div class="row"></div></div>`;
    letters.forEach((l) => (l.read = true));
    G.ui.button(w.querySelector('.row'), 'Close', () => close(), 'primary');
    const jr = w.querySelector('.jr');
    jr.addEventListener('adjust', (e) => { jr.scrollTop += e.detail * 80; });
  }, { cls: 'journal', onBack: () => close(), pauseCloses: true });
  function close() { G.ui.close(); if (fromPlay) resume(); }
}

// ---------------------------------------------------------------- shops + satchel
export function openShop(id) {
  const shop = SHOPS[id];
  const wasPaused = G.paused;
  G.paused = true;
  document.exitPointerLock?.();
  return new Promise((res) => {
    let entry;
    const build = (focus = 0) => {
      entry = G.ui.open((w) => {
        w.innerHTML = `<div class="panel">${title(shop.title, `${shop.sub} · you have <b class="gold">${coins()} Sickles</b>`)}<div class="menu-col shop"></div><div class="row"></div></div>`;
        const c = w.querySelector('.shop');
        for (const iid of shop.items) {
          const it = ITEMS[iid];
          G.ui.button(c, `<span class="t-ico">${it.icon}</span><span class="t-txt"><b>${it.name}</b><small>${it.eat ? 'Eat: ' + it.eat : 'A good gift for the right friend'} · you have ${itemCount(iid)}</small></span><span class="price">${it.price}s</span>`, () => {
            if (!buy(iid)) { G.ui.toast('Not enough Sickles.', 'info'); return; }
            let extra = '';
            if (iid === 'frog') extra = ' ' + frogCard().replace('Just chocolate this time.', '');
            G.ui.toast(`Bought ${it.short}.${extra}`, 'info');
            const f = entry.focus; G.ui.close(entry); build(f);
          }, 'talent-btn');
        }
        G.ui.button(w.querySelector('.row'), 'Done', () => done(), 'primary');
      }, { cls: 'shopscr', onBack: () => done(), focus });
    };
    const done = () => { G.ui.close(entry); G.paused = wasPaused; if (G.mode === 'play' && !wasPaused) G.ui.showHUD(true); res(); };
    build();
  });
}
export function openSatchel() {
  let entry;
  const build = (focus = 0) => {
    entry = G.ui.open((w) => {
      const ids = Object.keys(G.save.items || {}).filter((k) => ITEMS[k] && itemCount(k) > 0);
      w.innerHTML = `<div class="panel">${title('Satchel', `<b class="gold">${coins()} Sickles</b> · eat sweets for a boost, or give them to friends`)}<div class="menu-col shop"></div><div class="row"></div></div>`;
      const c = w.querySelector('.shop');
      if (!ids.length) c.innerHTML = '<p class="small">Your satchel is empty. The sweets trolley on the Hogwarts Express (and, from your third year, Hogsmeade) sells treats.</p>';
      for (const iid of ids) {
        const it = ITEMS[iid];
        G.ui.button(c, `<span class="t-ico">${it.icon}</span><span class="t-txt"><b>${it.name} ×${itemCount(iid)}</b><small>${it.eat ? 'Use: ' + it.eat : 'Gift item'}</small></span>`, () => {
          if (!it.eat) { G.ui.toast('Give this to a friend: talk to them and choose Give a gift.', 'tip'); return; }
          useItem(iid);
          const f = entry.focus; G.ui.close(entry); build(f);
        }, 'talent-btn');
      }
      G.ui.button(w.querySelector('.row'), 'Close', () => G.ui.close(entry), 'primary');
    }, { cls: 'shopscr', focus });
  };
  build();
}

// ---------------------------------------------------------------- school years
export function openYears() {
  G.ui.open((w) => {
    w.innerHTML = `<div class="panel wide">${title('School Years', 'Each year has its own story. Replay a year from the autosave made when it began.')}<div class="menu-col years"></div><div class="row"></div></div>`;
    const c = w.querySelector('.years');
    for (const y of YEARS) {
      const done = G.save.yearsDone.some((d) => d.year === y.n);
      const cur = G.save.year === y.n;
      const snap = loadYearSnapshot(y.n);
      const ready = G.story.yearAvailable ? G.story.yearAvailable(y.n) : y.n === 1;
      const status = done ? '✔ Complete' : cur ? 'In progress' : ready ? 'Locked' : 'Coming in a later update';
      const b = G.ui.button(c, `<span class="sl-n">${y.n}</span><span class="sl-d"><b>${y.title}</b> <small>${y.sub} · ${status}${snap && !cur ? ' · replay available' : ''}</small></span>`, () => {
        if (!snap || cur) { G.audio.sfx('fail'); return; }
        confirmBox(`Replay Year ${y.n} from its start? Your current progress in this slot will be replaced by that autosave.`, () => {
          G.ui.closeAll(); G.paused = false; G.save = snap; startFromSave();
        });
      }, 'slot-btn' + (cur ? ' cur' : ''));
      if (!snap || cur) b.classList.add('dim');
    }
    G.ui.button(w.querySelector('.row'), 'Back', () => G.ui.close(), 'primary');
  }, { cls: 'yearscr' });
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
export function openCustomize(onDone) {
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
    G.ui.button(r, 'Begin your first year ›', () => { autoFullscreen(); onDone(); }, 'primary');
    G.ui.button(r, 'Back', () => { G.ui.close(); G.mode = 'menu'; menuBackdrop(true); openMainMenu(); });
  }, { cls: 'custom', onBack: () => { G.ui.close(); G.mode = 'menu'; menuBackdrop(true); openMainMenu(); } });
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
  const saved = latestSlot() ? loadSave(latestSlot()) : null;
  if (saved && saved.started) { setSlot(latestSlot()); G.save = saved; } else { G.save = newSave(); G.practiceSave = true; }
  // practice needs a few spells for the duel
  const practice = new Set(G.save.spells);
  for (const s of ['stupefy', 'protego', 'expelliarmus', 'lumos', 'petrificus']) if (id === 'duel' || id === 'frogs') practice.add(s);
  G.spells.setUnlocked([...practice]);
  G.player.rebuild();
  G.player.root.visible = true;
  G.ui.refreshHUD();
  await runMinigame(id, { practice: true, fromMenu: true });
  if (G.quitting) return;
  if (saved && saved.started) writeSave();
  G.spells.setUnlocked(G.save.spells);
  G.practiceSave = false;
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
