// Persistent player settings (graphics, audio, camera, controls).
const KEY = 'cursed-dungeons-settings-v1';
const DEFAULTS = {
  quality: 'auto', forceWebGL: false, showFps: false, dynRes: true, motionBlur: false,
  shake: 1, hitstop: true, slowmo: true, cameraRotate: false, cameraZoom: 22,
  master: 0.8, music: 0.5, sfx: 0.9, damageNumbers: true, autoAim: 'touch',
};
export const settings = { ...DEFAULTS };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
export function saveSettings() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }
export function resetSettings() { Object.assign(settings, DEFAULTS); saveSettings(); }
