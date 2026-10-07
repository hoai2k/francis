// Accessibility and difficulty: damage and health scaling, aim assist, captions for
// important sounds, colour-blind-friendly danger zones and larger text.
import { G } from './state.js';

export const DIFFICULTY = {
  story: { label: 'Story (relaxed)', dmg: 0.5, hp: 0.7 },
  normal: { label: 'Normal', dmg: 1, hp: 1 },
  hard: { label: 'Hard', dmg: 1.35, hp: 1.3 },
};
export const AIM = { 0: 'Off', 0.6: 'Low', 1: 'Normal', 1.8: 'High' };

export function applyAccess() {
  const S = G.settings;
  const d = DIFFICULTY[S.difficulty] || DIFFICULTY.normal;
  G.diffDmg = d.dmg;
  G.diffHp = d.hp;
  document.body.classList.toggle('big-text', !!S.bigText);
  document.body.classList.toggle('cb-mode', !!S.cbTelegraphs);
}

// captions for sounds that warn you about something
const CAPTIONS = {
  roar: 'A roar', dementor: 'An icy shriek', curse: 'A curse crackles', killing: 'A deadly curse hisses', explode: 'Explosion', slam: 'Crash', splash: 'Splash',
  gong: 'A gong sounds', whistle: 'A whistle', steam: 'The train hisses', portkey: 'A rushing pull', shatter: 'Something shatters', whoosh: 'Something lunges',
  confringo: 'A blast', incendio: 'Fire roars', fail: 'A failure tone', victory: 'Triumphant fanfare', quest: 'Quest chime', door: 'A door opens',
};
const last = {};
let el = null;
export function caption(name) {
  const text = CAPTIONS[name];
  if (!text || !G.settings?.captions) return;
  const now = performance.now();
  if (last[name] && now - last[name] < 1500) return;
  last[name] = now;
  if (!el) { el = document.createElement('div'); el.className = 'captions'; document.body.appendChild(el); }
  const line = document.createElement('div');
  line.textContent = `[${text}]`;
  el.appendChild(line);
  while (el.children.length > 3) el.firstChild.remove();
  setTimeout(() => line.remove(), 2200);
}
