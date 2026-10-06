// localStorage persistence for progress and settings.
import { G } from './state.js';

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
    invertY: false, shake: true, rumble: true, prompts: 'auto', dayLength: 12, fps: false, ao: true, pointerLock: true,
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
  return {
    version: 1,
    started: false,
    name: 'Student',
    house: null,
    look: { skin: 1, hairStyle: 'short', hairColor: 1, glasses: false, hat: false, wand: 'holly', eyes: '#3a2a1a' },
    spells: [],
    stage: 0,
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
  };
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}
export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s) return null;
    return { ...newSave(), ...s };
  } catch {
    return null;
  }
}
export function writeSave() {
  const s = G.save;
  if (!s || !s.started) return;
  if (G.player && G.zone) {
    s.zone = G.zone.name;
    s.pos = [G.player.pos.x, G.player.pos.y, G.player.pos.z, G.player.yaw];
  }
  if (G.skyObj) s.tod = G.skyObj.tod;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
export function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
