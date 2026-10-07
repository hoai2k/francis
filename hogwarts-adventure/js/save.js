// localStorage persistence for progress and settings.
import { G } from './state.js';
import { ensureProgress, xpForLevel } from './progress.js';

const SAVE_KEY = 'hogwarts-adventure-save-v1';
const SET_KEY = 'hogwarts-adventure-settings-v1';

export function defaultSettings() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  let quality = 'medium';
  if (coarse || cores <= 4 || mem <= 3) quality = 'low';
  else if (cores >= 8 && mem >= 8) quality = 'high';
  return {
    quality, music: 0.6, sfx: 0.8, muted: false, deadzone: 0.18, sensitivity: 1, padSensitivity: 1,
    invertY: false, shake: true, rumble: true, prompts: 'auto', dayLength: 12, fps: false, ao: true, pointerLock: true, fullscreen: true,
    difficulty: 'normal', aimAssist: 1, captions: false, cbTelegraphs: false, bigText: false,
  };
}

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SET_KEY) || 'null');
    return { ...defaultSettings(), ...(s || {}) };
  } catch {
    return defaultSettings();
  }
}
export function saveSettings() {
  try { localStorage.setItem(SET_KEY, JSON.stringify(G.settings)); } catch { /* storage unavailable */ }
}

export function newSave() {
  return ensureProgress({
    version: 2,
    started: false,
    name: 'Student',
    house: null,
    look: { skin: 1, hairStyle: 'short', hairColor: 1, glasses: false, hat: false, wand: 'holly', eyes: '#3a2a1a' },
    spells: [],
    stage: 0,
    year: 1,
    yq: 0,
    yearDone: false,
    flags: {},
    points: { gryffindor: 120, slytherin: 135, ravenclaw: 110, hufflepuff: 105 },
    cards: [],
    beans: [],
    best: {},
    potions: {},
    minigames: {},
    zone: 'greatHall',
    pos: null,
    tod: 0.72,
    playTime: 0,
    completed: false,
    savedAt: 0,
  });
}

// Slot 1 keeps the original key so saves from before the seven-year update load as they are.
export const SLOTS = [1, 2, 3];
const slotKey = (n) => (n === 1 ? SAVE_KEY : n === 'auto' ? 'hogwarts-adventure-save-auto' : typeof n === 'string' && n.startsWith('y') ? `hogwarts-adventure-save-auto-${n}` : `hogwarts-adventure-save-slot${n}`);
export function currentSlot() { return G.settings?.lastSlot || 1; }
export function setSlot(n) { G.settings.lastSlot = n; saveSettings(); }

// v1 saves (the original single-year game) continue as Year 1; a finished Year 1 counts as complete.
export function migrate(s) {
  if (!s) return s;
  if (!s.version || s.version < 2) {
    s.version = 2;
    s.year = 1;
    s.yq = 0;
    const done = s.completed || s.stage >= 11;
    s.yearDone = !!done;
    ensureProgress(s);
    // XP for what was already achieved
    const stage = Math.min(11, s.stage || 0);
    s.xp = stage * 260 + (done ? 600 : 0);
    while (s.xp >= xpForLevel(s.level)) { s.level++; s.talentPts++; }
    if (done && !s.yearsDone.some((y) => y.year === 1)) s.yearsDone.push({ year: 1, cup: null });
    s.letters.unshift({ id: 'migrated', from: 'Headmistress Aldmoor', title: 'Your Hogwarts years', year: 1, read: false,
      body: done ? 'Congratulations on finishing your first year. Hogwarts now runs all seven years: you earn experience and talent points, master your spells and choose which spells to carry in your loadouts. Your next year begins when you are ready.' : 'Hogwarts now runs all seven years. Finish your first year to move on; along the way you earn experience and talent points, master your spells and choose which spells to carry in your loadouts.' });
  }
  return ensureProgress(s);
}

function readKey(key) {
  try {
    const s = JSON.parse(localStorage.getItem(key) || 'null');
    if (!s) return null;
    return migrate({ ...newSave(), ...s });
  } catch {
    return null;
  }
}
export function hasSave(slot = currentSlot()) {
  try { return !!localStorage.getItem(slotKey(slot)); } catch { return false; }
}
export function loadSave(slot = currentSlot()) { return readKey(slotKey(slot)); }
export function peekSlot(slot) { return readKey(slotKey(slot)); }
export function anySave() { return [...SLOTS, 'auto'].some((n) => peekSlot(n)?.started); }
// the slot with the most recent save
export function latestSlot() {
  let best = null, t = -1;
  for (const n of SLOTS) { const s = peekSlot(n); if (s?.started && (s.savedAt || 0) >= t) { t = s.savedAt || 0; best = n; } }
  return best;
}
export function writeSave() {
  const s = G.save;
  if (!s || !s.started || G.practiceSave) return;
  if (G.net?.isGuest) return; // visiting a friend's world: their world is theirs, my save stays as it was
  if (G.player && G.zone && G.mode !== 'cutscene' && !G.zone.noSave) {
    s.zone = G.zone.name;
    s.pos = [G.player.pos.x, G.player.pos.y, G.player.pos.z, G.player.yaw];
  }
  if (G.skyObj) s.tod = G.skyObj.tod;
  s.savedAt = Date.now();
  try { localStorage.setItem(slotKey(currentSlot()), JSON.stringify(s)); } catch { /* ignore */ }
}
// autosave: the rolling autosave plus a snapshot at the start of each year (used by Year select)
export function autoSave(yearStart) {
  const s = G.save;
  if (!s || !s.started || G.practiceSave) return;
  writeSave();
  try {
    const txt = JSON.stringify(s);
    localStorage.setItem(slotKey('auto'), txt);
    if (yearStart) localStorage.setItem(slotKey('y' + s.year), txt);
  } catch { /* ignore */ }
  G.ui?.toast('💾 Autosaved', 'info', 1600);
}
export function loadYearSnapshot(n) { return readKey(slotKey('y' + n)); }
export function deleteSave(slot = currentSlot()) {
  try { localStorage.removeItem(slotKey(slot)); } catch { /* ignore */ }
}
