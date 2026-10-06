// Brick Kart online protocol: shared constants, validation of everything that arrives from other
// players, the compact kart-state encoding and a seeded random number generator.
//
// Every presence object and topic payload carries v: PROTO. Anything with another version, an
// unknown topic or a malformed field is ignored, never thrown on: a bad packet must not be able to
// put NaN / Infinity into the physics or the renderer.

export const PROTO = 1;
export const GAME = 'brick-kart';
export const CAPACITY = 12;          // people per room (races are always 12 karts: CPUs fill in)
export const RACERS = 12;
export const RACE_HZ = 15;           // kart updates per second during a race
export const MENU_HEARTBEAT = 15;    // seconds between presence re-sends while nothing changes

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const num = (v, lo, hi, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : def);
export const int = (v, lo, hi, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), lo, hi) : def);
export const str = (v, max, def = '') => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').slice(0, max) : def);
export const ID_RE = /^[a-z0-9]{6,16}$/;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const r2 = (v) => Math.round(v * 100) / 100;
export const r3 = (v) => Math.round(v * 1000) / 1000;

export function newUid() {
  let s = '';
  for (let i = 0; i < 10; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)];
  return s;
}
export function cleanName(s) {
  const n = String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return n || 'Racer';
}
export function randomName() { return 'Racer ' + (100 + Math.floor(Math.random() * 900)); }

// mulberry32: a tiny seeded generator. withSeed() swaps it in for Math.random while fn runs, so
// code written with Math.random (world building, item and ability uses) makes the same choices
// on every screen.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function withSeed(seed, fn) {
  const orig = Math.random;
  Math.random = rng(seed);
  try { return fn(); } finally { Math.random = orig; }
}

// ---- kart state ---------------------------------------------------------------------------------
// One kart's state as a flat array (about 130 bytes of JSON):
//  0 i      grid index            1 t   race time of the sample (s)
//  2-4 x,y,z position             5 yaw
//  6,7 vx,vz world velocity       8 vy  vertical speed       9 spd  signed speed (wheels, anims)
// 10 steer                        11 flags (F below)        12 drift: dir * level (-3..3), 0 = none
// 13 spin time left               14 hidden (wreck)         15 invulnerable time (blink)
// 16 race distance (lap * N + i)  17 item id or 0           18 gesture "name:voice" or 0
// 19 gesture counter              20 finish time (0 = racing)  21 studs  22 trick spin
export const F = {
  GROUND: 1, GLIDE: 2, DRIFT: 4, BOOST: 8, GOLD: 16, SHIELD: 32, MEGA: 64, BULLET: 128, GHOST: 256,
  FROZEN: 512, FIN: 1024, GONE: 2048, LOOK: 4096, CPU: 8192,
};
export const STATE_LEN = 23;
export function encodeKart(k, t, out) {
  const d = k.drift;
  let f = 0;
  if (k.grounded) f |= F.GROUND;
  if (k.gliding) f |= F.GLIDE;
  if (d.active) f |= F.DRIFT;
  if (k.boostTime > 0) f |= F.BOOST;
  if (k.goldenTime > 0) f |= F.GOLD;
  if (k.shieldTime > 0) f |= F.SHIELD;
  if (k.megaTime > 0) f |= F.MEGA;
  if (k.bulletTime > 0) f |= F.BULLET;
  if (k.ghostTime > 0) f |= F.GHOST;
  if (k.frozenTime > 0) f |= F.FROZEN;
  if (k.finished) f |= F.FIN;
  if (k.respawn > 0 && !k.respawnPlaced) f |= F.GONE;
  if (k.lookBack) f |= F.LOOK;
  if (!k.human) f |= F.CPU;
  const vx = Math.sin(k.moveYaw) * k.speed + k.kvx, vz = Math.cos(k.moveYaw) * k.speed + k.kvz;
  out.length = 0;
  out.push(k.idx, r3(t), r2(k.pos.x), r2(k.pos.y), r2(k.pos.z), r3(k.yaw), r2(vx), r2(vz), r2(k.vy), r2(k.speed),
    r2((k.gliding ? k.glideSteer : k.ctl?.steer) || 0), f, d.active ? d.dir * Math.max(1, d.level) : 0, r2(Math.max(0, k.spinTime)), r2(Math.max(0, k.hidden)),
    r2(Math.max(0, k.invuln)), r2(k.raceDist), k.item || 0, k.gest || 0, k.gestN, k.finished ? r3(k.finishTime) : 0, k.studs | 0,
    r2(Math.max(0, k.trickSpin || 0)));
  return out;
}

// Parse a received kart state into `s` (a preallocated snapshot). false if it's not usable.
// items / gestures: Sets of the known item ids and gesture names.
export function decodeKart(a, s, items, gestures) {
  if (!Array.isArray(a) || a.length < STATE_LEN) return false;
  const t = a[1], x = a[2], y = a[3], z = a[4];
  if (![t, x, y, z].every((v) => typeof v === 'number' && Number.isFinite(v))) return false;
  if (Math.abs(x) > 1e5 || Math.abs(y) > 1e4 || Math.abs(z) > 1e5 || t < -60 || t > 1e5) return false;
  s.t = t; s.x = x; s.y = y; s.z = z;
  s.yaw = num(a[5], -10, 10);
  s.vx = num(a[6], -400, 400); s.vz = num(a[7], -400, 400); s.vy = num(a[8], -200, 200);
  s.spd = num(a[9], -400, 400); s.steer = num(a[10], -1, 1);
  s.flags = int(a[11], 0, 65535); s.dl = int(a[12], -3, 3);
  s.spin = num(a[13], 0, 2); s.hid = num(a[14], 0, 2); s.inv = num(a[15], 0, 10);
  s.rd = num(a[16], -1e5, 1e6);
  s.item = typeof a[17] === 'string' && items.has(a[17]) ? a[17] : null;
  const g = typeof a[18] === 'string' ? a[18].split(':') : null;
  s.gest = g && gestures.has(g[0]) ? g[0] : null;
  s.gvoice = g && /^[a-z]{1,12}$/i.test(g[1] || '') ? g[1] : null;
  s.gestN = int(a[19], 0, 1023);
  s.fin = num(a[20], 0, 1e5);
  s.studs = int(a[21], 0, 10);
  s.trick = num(a[22], 0, 1);
  return true;
}
export function blankSnap() {
  return { t: 0, x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, vy: 0, spd: 0, steer: 0, flags: 0, dl: 0, spin: 0, hid: 0, inv: 0, rd: 0, item: null, gest: null, gvoice: null, gestN: 0, fin: 0, studs: 0, trick: 0 };
}
