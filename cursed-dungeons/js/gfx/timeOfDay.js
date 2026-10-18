// Time of day: a 24-hour clock that drives the sun / moon direction, colour
// and intensity, the sky gradient, fog, hemisphere ambient, stars, how much
// torches and lanterns count, exposure and a grading bias.
//
//   game.timeOfDay.hour            current hour (0-24)
//   game.timeOfDay.set(h)          jump to an hour or a preset name (keeps cycling)
//   game.timeOfDay.pin(h)          freeze at an hour / preset ('night', 'golden'…); pin(null) resumes
//   game.timeOfDay.dayLength       real seconds per full day while cycling (night passes faster)
//   game.timeOfDay.isNight         true between dusk and dawn
//   TOD_PRESETS                    named hours: dawn, morning, day/noon, afternoon,
//                                  golden, sunset, dusk, night, midnight
import * as THREE from 'three/webgpu';

export const TOD_PRESETS = { dawn: 6.1, morning: 8.5, day: 12.5, noon: 12.5, afternoon: 15, golden: 17.2, sunset: 18.35, dusk: 19.1, night: 22.5, midnight: 0 };
export const SUNRISE = 5.6, SUNSET = 18.75;
const DEG = Math.PI / 180;

// Atmosphere keyframes (hex colours are sRGB). Interpolated cyclically.
//   sky top / horizon, fog, sun (light colour), sunI, hemi sky / ground / intensity,
//   exposure, stars, torch (lantern & baked-light weight), tint (grade), sat, bloom threshold bias
const K = [
  [0.0, { top: 0x060c22, hor: 0x1a2a4c, fog: 0x14203a, sun: 0x9ab0ff, sunI: 0.75, hs: 0x4a5ea8, hg: 0x14121c, hi: 0.52, exp: 1.28, stars: 1, torch: 1, tint: [0.92, 0.97, 1.1], sat: 1.0 }],
  [4.6, { top: 0x060c22, hor: 0x1a2a4c, fog: 0x14203a, sun: 0x9ab0ff, sunI: 0.7, hs: 0x4a5ea8, hg: 0x14121c, hi: 0.5, exp: 1.28, stars: 1, torch: 1, tint: [0.92, 0.97, 1.1], sat: 1.0 }],
  [5.5, { top: 0x26346c, hor: 0xd88a7a, fog: 0x8a7488, sun: 0xff9a6a, sunI: 0.7, hs: 0x7a80b8, hg: 0x32282a, hi: 0.72, exp: 1.3, stars: 0.35, torch: 0.8, tint: [1.02, 0.96, 1.02], sat: 1.04 }],
  [6.4, { top: 0x3e66be, hor: 0xffc49a, fog: 0xd8b8a8, sun: 0xffc89a, sunI: 2.6, hs: 0x8eaae0, hg: 0x56443a, hi: 0.7, exp: 1.12, stars: 0, torch: 0.35, tint: [1.05, 0.99, 0.95], sat: 1.1 }],
  [8.5, { top: 0x2a6ee4, hor: 0xbcdcf6, fog: 0xb8cce0, sun: 0xfff0dc, sunI: 3.2, hs: 0x9cbcee, hg: 0x6a5a40, hi: 0.78, exp: 1.0, stars: 0, torch: 0.08, tint: [1.0, 1.0, 1.0], sat: 1.1 }],
  [12.5, { top: 0x1e62ea, hor: 0xa4cef6, fog: 0xaac6e6, sun: 0xfff4e6, sunI: 3.3, hs: 0x9cc0f2, hg: 0x6e5e44, hi: 0.8, exp: 0.98, stars: 0, torch: 0.0, tint: [1.0, 1.0, 1.0], sat: 1.14 }],
  [15.5, { top: 0x2668e4, hor: 0xc4dcf0, fog: 0xc4d0dc, sun: 0xffe6c4, sunI: 3.35, hs: 0x9cbcee, hg: 0x725c3e, hi: 0.76, exp: 1.0, stars: 0, torch: 0.0, tint: [1.02, 1.0, 0.98], sat: 1.18 }],
  [17.2, { top: 0x3070dc, hor: 0xffd29a, fog: 0xd8c0a4, sun: 0xffd09a, sunI: 3.7, hs: 0xa0b2d6, hg: 0x7a5636, hi: 0.66, exp: 1.06, stars: 0, torch: 0.12, tint: [1.05, 1.0, 0.93], sat: 1.24 }],
  [18.35, { top: 0x3a4c96, hor: 0xff8a52, fog: 0xc8846c, sun: 0xffa064, sunI: 2.6, hs: 0x847ec0, hg: 0x55342a, hi: 0.66, exp: 1.14, stars: 0.05, torch: 0.45, tint: [1.08, 0.96, 0.92], sat: 1.14 }],
  [19.2, { top: 0x182258, hor: 0x9a5266, fog: 0x4a3854, sun: 0xa0a8e8, sunI: 0.55, hs: 0x5a5a98, hg: 0x201822, hi: 0.56, exp: 1.22, stars: 0.5, torch: 0.9, tint: [0.98, 0.95, 1.06], sat: 1.06 }],
  [20.4, { top: 0x080e28, hor: 0x24305a, fog: 0x18223e, sun: 0x9ab0ff, sunI: 0.72, hs: 0x4a5ea8, hg: 0x14121c, hi: 0.52, exp: 1.28, stars: 0.95, torch: 1, tint: [0.92, 0.97, 1.1], sat: 1.0 }],
];
const KC = K.map(([h, k]) => [h, { ...k, top: new THREE.Color(k.top), hor: new THREE.Color(k.hor), fog: new THREE.Color(k.fog), sun: new THREE.Color(k.sun), hs: new THREE.Color(k.hs), hg: new THREE.Color(k.hg) }]);

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function hourOf(v) {
  if (typeof v === 'number' && isFinite(v)) return ((v % 24) + 24) % 24;
  if (typeof v === 'string' && v in TOD_PRESETS) return TOD_PRESETS[v];
  return null;
}

export class TimeOfDay {
  constructor() {
    this.hour = TOD_PRESETS.golden;
    this.pinned = null;          // hour the region (or the player) pinned, or null when cycling
    this.dayLength = 1500;       // real seconds per 24 h of daylight-speed time
    this.nightSpeed = 2.6;       // nights pass this much faster
    this.speed = 1;              // settings multiplier (0 freezes)
    this.sunAzimuth = 0;         // degrees: rotates the whole sun path (per region)
    this.state = {
      sunDir: new THREE.Vector3(), lightDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), sunEl: 0,
      top: new THREE.Color(), hor: new THREE.Color(), fog: new THREE.Color(), sun: new THREE.Color(), sunI: 1,
      hs: new THREE.Color(), hg: new THREE.Color(), hi: 1, exp: 1, stars: 0, torch: 0, tint: new THREE.Color(1, 1, 1), sat: 1,
      day: 1, golden: 0, moon: false,
    };
    this.sample();
  }
  get isNight() { const h = this.hour; return h > SUNSET + 0.4 || h < SUNRISE - 0.2; }
  set(v) { const h = hourOf(v); if (h == null) return; this.hour = h; if (this.pinned != null) this.pinned = h; this.sample(); }
  pin(v) { const h = hourOf(v); this.pinned = h; if (h != null) this.hour = h; this.sample(); }
  update(dt) {
    if (this.pinned != null) { this.hour = this.pinned; return; }
    if (!dt || !this.speed) return;
    const rate = (24 / this.dayLength) * this.speed * (this.isNight ? this.nightSpeed : 1);
    this.hour = (this.hour + dt * rate) % 24;
  }
  // Direction towards a body on the arc from east (+x) through south (+z) to west.
  arc(t, maxEl, out) {
    const el = maxEl * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t)))), 1.25);
    const phi = Math.PI * t;
    let hx = Math.cos(phi), hz = Math.sin(phi) * 0.85 + 0.2;
    const a = this.sunAzimuth * DEG, c = Math.cos(a), s = Math.sin(a);
    const rx = hx * c - hz * s, rz = hx * s + hz * c;
    const l = Math.hypot(rx, rz) || 1;
    out.set(rx / l * Math.cos(el), Math.sin(el), rz / l * Math.cos(el));
    return el;
  }
  sample() {
    const S = this.state, h = this.hour;
    // interpolate keyframes
    let i = 0;
    while (i < KC.length - 1 && KC[i + 1][0] <= h) i++;
    const [h0, a] = KC[i], [h1raw, b] = KC[(i + 1) % KC.length];
    const h1 = h1raw <= h0 ? h1raw + 24 : h1raw;
    const t = smooth(0, 1, (h - h0) / Math.max(1e-3, h1 - h0));
    const L = (x, y) => x + (y - x) * t;
    S.top.copy(a.top).lerp(b.top, t); S.hor.copy(a.hor).lerp(b.hor, t); S.fog.copy(a.fog).lerp(b.fog, t);
    S.sun.copy(a.sun).lerp(b.sun, t); S.hs.copy(a.hs).lerp(b.hs, t); S.hg.copy(a.hg).lerp(b.hg, t);
    S.sunI = L(a.sunI, b.sunI); S.hi = L(a.hi, b.hi); S.exp = L(a.exp, b.exp); S.stars = L(a.stars, b.stars); S.torch = L(a.torch, b.torch);
    S.tint.setRGB(L(a.tint[0], b.tint[0]), L(a.tint[1], b.tint[1]), L(a.tint[2], b.tint[2])); S.sat = L(a.sat, b.sat);
    // sun & moon
    const ts = (h - SUNRISE) / (SUNSET - SUNRISE);
    const sunEl = ts > -0.08 && ts < 1.08 ? this.arc(ts, 64 * DEG, S.sunDir) : (this.arc(Math.min(1, Math.max(0, ts)), 0, S.sunDir), -0.2);
    const nightLen = 24 - SUNSET + SUNRISE;
    const tm = (((h - SUNSET) % 24) + 24) % 24 / nightLen;
    const moonEl = this.arc(Math.min(1, Math.max(0, tm)), 48 * DEG, S.moonDir);
    S.sunEl = sunEl;
    const sunUp = smooth(-1 * DEG, 7 * DEG, sunEl), moonUp = smooth(-1 * DEG, 12 * DEG, moonEl) * (1 - sunUp);
    S.day = smooth(-4 * DEG, 10 * DEG, sunEl);
    S.golden = S.day * (1 - smooth(12 * DEG, 30 * DEG, sunEl));
    S.moon = moonUp > sunUp;
    const dir = S.moon ? S.moonDir : S.sunDir;
    S.lightDir.copy(dir);
    // the light itself never drops below ~24° by day (~30° for the moon): long shadows that stay
    // readable, sunlit floors that still catch the light, stable shadow maps near the horizon
    const minY = S.moon ? 0.5 : 0.4;
    if (S.lightDir.y < minY) { const hl = Math.hypot(S.lightDir.x, S.lightDir.z) || 1; const k = Math.sqrt(1 - minY * minY) / hl; S.lightDir.set(S.lightDir.x * k, minY, S.lightDir.z * k); }
    S.sunI *= S.moon ? Math.max(0.15, moonUp) : Math.max(0.08, sunUp);
    return S;
  }
}
