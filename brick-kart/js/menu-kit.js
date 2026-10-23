// Small helpers shared by the menu screens (main.js, select.js).
import { isTouchDevice } from './input.js';

// arrows: chevrons drawn as SVG (◀ ▶ text gets turned into emoji boxes on iOS; text arrows carry U+FE0E)
const chev = (d) => `<svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const CHEV_L = chev('M15 4 7 12l8 8'), CHEV_R = chev('M9 4l8 8-8 8');
// player colours, by player slot
export const PCOL = ['#ff4a3a', '#3b8bff', '#3bdc5a', '#ffc93b', '#c45aff', '#ff8a1a', '#2fd6d0', '#ff6ab4'];
export const MAX_PLAYERS = 8;
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const hex = (c) => '#' + c.toString(16).padStart(6, '0');
// a phone (not a tablet): too small to share, so the select screen and races are single-player
export const isPhone = () => isTouchDevice() && Math.min(screen.width, screen.height) < 600;
