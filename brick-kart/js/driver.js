// Movie-character drivers for the "Use Characters" option: the driver registry,
// the seated-rig contract every driver follows, and the animator that gives each
// driver Mario Kart-style gestures (steering, leaning, cheering, taunting, tricks…).
//
// A driver definition (see js/drivers/*.js):
//   { id, name, blurb, weight: 'light'|'medium'|'heavy', color, voice: { kind, pitch },
//     style: { cheer, taunt, trick }, build() -> rig }
// A rig is built in the SEAT FRAME: origin at the hip/seat point, +Z forward, +Y up.
//   { root, torso, head, armL, armR, armLen, height, jaw?, tail?, gestures?, idle? }
//   torso  pivot at the hips (parent of head and arms): the animator leans/twists/bobs it
//   head   pivot at the neck (turn = rotation.y, nod = rotation.x)
//   armL/R pivots at the shoulders; rotation 0 = arm hanging straight down,
//          rotation.x < 0 swings it forward/up (-PI = straight up), armL is on +X
//   Anything below y = -0.45 is hidden inside the kart tub.
import * as THREE from 'three';

export const UNIVERSES = [
  { id: 'marvel', name: 'Marvel', color: '#e23636' },
  { id: 'starwars', name: 'Star Wars', color: '#ffe81f' },
  { id: 'jjk', name: 'Jujutsu Kaisen', color: '#8a5cff' },
  { id: 'jurassic', name: 'Jurassic World', color: '#e8a33a' },
];

// each universe loads on its own so one broken file never stops the game
const loaded = await Promise.allSettled(UNIVERSES.map((u) => import(`./drivers/${u.id}.js`)));
export const DRIVERS = [];
loaded.forEach((r, i) => {
  if (r.status !== 'fulfilled') { console.error(`Drivers "${UNIVERSES[i].id}" failed to load`, r.reason); return; }
  for (const d of r.value.default || []) DRIVERS.push({ weight: 'medium', voice: { kind: 'human', pitch: 1 }, style: {}, color: 0xffffff, blurb: '', ...d, from: UNIVERSES[i].id });
});

// driver weight class nudges the kart's stats, like Mario Kart's light/medium/heavy drivers
const WEIGHT = {
  light: { speed: -0.5, accel: 0.5, handling: 0.5, weight: -1 },
  medium: { speed: 0, accel: 0, handling: 0, weight: 0 },
  heavy: { speed: 0.5, accel: -0.5, handling: -0.5, weight: 1 },
};
export function combinedStats(kartStats, driver) {
  const w = WEIGHT[driver?.weight] || WEIGHT.medium, out = {};
  for (const k of ['speed', 'accel', 'handling', 'weight']) out[k] = Math.max(1, Math.min(5, kartStats[k] + w[k]));
  return out;
}

const rigCache = new Map();
// Builds a driver rig, normalising the optional fields of the contract.
export function buildDriver(def) {
  const rig = def.build();
  rig.def = def;
  rig.torso ||= rig.root;
  if (!rig.height) {
    const bb = new THREE.Box3().setFromObject(rig.root);
    rig.height = bb.max.y;
  }
  rig.armLen ||= 1;
  rig.shoulder = rig.armL ? rig.armL.position.clone() : new THREE.Vector3(0.5, rig.height * 0.6, 0);
  rig.rest = new Map();
  for (const o of [rig.torso, rig.head, rig.armL, rig.armR, rig.jaw, rig.tail]) if (o) rig.rest.set(o, { r: o.rotation.clone(), p: o.position.clone() });
  rig.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return rig;
}
// where the steering wheel goes so the driver's hands reach it (seat frame)
export const REACH = 1.0;
export function wheelSpot(rig) {
  const s = rig.shoulder, L = rig.armLen;
  return new THREE.Vector3(0, s.y - Math.cos(REACH) * L, s.z + Math.sin(REACH) * L);
}
void rigCache;

// ---- gestures -------------------------------------------------------------------------
// A gesture returns a partial pose for progress f (0..1) and time t (seconds into it).
// Pose keys: tx ty tz (torso rotation), by (torso bob), hx hy hz (head), lx lz rx rz (arms), jaw.
const S = Math.sin;
const up = -2.75;   // arm straight up-ish
const CHEERS = {
  fist: (f, t) => ({ rx: up + S(t * 15) * 0.4, rz: -0.15, hx: -0.25, by: Math.abs(S(t * 15)) * 0.08, tz: 0.08 }),
  both: (f, t) => ({ lx: up, rx: up, lz: 0.35 + S(t * 13) * 0.3, rz: -0.35 - S(t * 13) * 0.3, hx: -0.3, by: Math.abs(S(t * 13)) * 0.1 }),
  wave: (f, t) => ({ rx: up + 0.2, rz: -0.35 + S(t * 12) * 0.55, hy: -0.4, hz: S(t * 6) * 0.12 }),
  flex: (f, t) => ({ lx: -0.6, rx: -0.6, lz: 1.5, rz: -1.5, tx: -0.15, ty: S(t * 8) * 0.25, hx: -0.2, by: Math.abs(S(t * 8)) * 0.06 }),
  roar: (f, t) => ({ hx: -0.65, jaw: 0.8, lz: 0.9, rz: -0.9, lx: -1.2, rx: -1.2, tx: -0.2, tz: S(t * 40) * 0.05 }),
  spin: (f, t) => ({ ty: f * Math.PI * 2, lz: 1.3, rz: -1.3, lx: -0.4, rx: -0.4, by: S(f * Math.PI) * 0.25 }),
  clap: (f, t) => ({ lx: -1.5, rx: -1.5, lz: -0.25 + Math.abs(S(t * 14)) * 0.6, rz: 0.25 - Math.abs(S(t * 14)) * 0.6, hx: -0.2 + S(t * 14) * 0.1 }),
  point: (f, t) => ({ rx: -1.65, rz: -0.1, hx: S(t * 18) * 0.15 - 0.1, ty: -0.25, tz: S(t * 18) * 0.05 }),
  salute: (f, t) => ({ rx: -2.5, rz: 0.75, hx: -0.15, tx: -0.1 }),
  bow: (f, t) => ({ tx: 0.45 * S(f * Math.PI), hx: 0.3 * S(f * Math.PI), lx: -0.3, rx: -0.3 }),
  beep: (f, t) => ({ hy: S(t * 10) * 0.9, by: Math.abs(S(t * 10)) * 0.08, tz: S(t * 20) * 0.06 }),
};
const GESTURES = {
  cheer: { dur: 1.5, prio: 3 },
  taunt: { dur: 1.1, prio: 2, f: (f, t, a) => ({ hy: a.tauntSide * 1.3, ty: a.tauntSide * 0.45, [a.tauntSide > 0 ? 'lx' : 'rx']: -2.3, [a.tauntSide > 0 ? 'lz' : 'rz']: a.tauntSide * (0.6 + S(t * 14) * 0.4), hz: S(t * 9) * 0.1 }) },
  ouch: { dur: 1.2, prio: 4, f: (f, t) => ({ lx: -2.4 + S(t * 24) * 0.6, rx: -2.4 + S(t * 24 + 1.5) * 0.6, lz: 0.7, rz: -0.7, hy: S(t * 26) * 0.45, hx: -0.2, tz: S(t * 13) * 0.18, jaw: 0.6 }) },
  bonk: { dur: 0.5, prio: 1, f: (f, t) => ({ hy: S(t * 30) * 0.3, hz: S(t * 22) * 0.12, tz: S(t * 18) * 0.08 }) },
  trick: { dur: 0.75, prio: 3, f: (f, t, a) => {
    const st = a.def.style?.trick || 'arms';
    if (st === 'superman') return { tx: 0.35, lx: -2.9, rx: -2.9, lz: 0.1, rz: -0.1, hx: -0.4 };
    if (st === 'twist') return { ty: S(f * Math.PI) * 1.2, lz: 1.4, rz: -1.4, hx: -0.3 };
    return { lx: up, rx: up, lz: 0.55, rz: -0.55, tx: -0.2, hx: -0.35, by: S(f * Math.PI) * 0.15 };
  } },
  throwF: { dur: 0.5, prio: 2, f: (f) => ({ rx: f < 0.35 ? 0.9 * (f / 0.35) : 0.9 - 3.2 * Math.min(1, (f - 0.35) / 0.25), rz: -0.2, ty: f < 0.35 ? 0.35 : -0.2, tx: f < 0.35 ? -0.1 : 0.12 }) },
  throwB: { dur: 0.55, prio: 2, f: (f) => ({ rx: -2.6 + 3.6 * Math.min(1, f / 0.6), rz: -0.3, hy: 1.4, ty: 0.5 }) },
  use: { dur: 0.6, prio: 2, f: (f, t) => ({ rx: up, rz: -0.2, hx: -0.2, by: S(f * Math.PI) * 0.06 }) },
  yay: { dur: 0.8, prio: 1, f: (f, t) => ({ rx: up + S(t * 16) * 0.3, rz: -0.25, hx: -0.15 }) },
  ready: { dur: 0.9, prio: 1, f: (f, t) => ({ tx: 0.25, hx: 0.1, by: -0.05 }) },
};
const ORDER = ['tx', 'ty', 'tz', 'by', 'hx', 'hy', 'hz', 'lx', 'lz', 'rx', 'rz', 'jaw'];
const ease = (x) => x * x * (3 - 2 * x);

export class DriverAnim {
  constructor(rig) {
    this.rig = rig; this.def = rig.def;
    this.p = Object.fromEntries(ORDER.map((k) => [k, 0]));
    this.g = null; this.t = 0;
    this.tauntSide = 1;
    this.steer = 0;
    const s = rig.shoulder, L = rig.armLen, ws = wheelSpot(rig);
    // arms reach forward to the wheel, angled in so the hands meet its rim
    const rim = Math.min(Math.abs(s.x), 0.32 + L * 0.08);
    this.reach = REACH;
    this.inward = Math.asin(Math.max(-0.9, Math.min(0.9, (Math.abs(s.x) - rim) / L)));
    void ws;
    this.seed = Math.random() * 10;
  }
  // start a gesture unless a more important one is playing
  play(name) {
    const G = GESTURES[name];
    if (!G) return false;
    if (this.g && this.g.left > 0.15 && GESTURES[this.g.name].prio > G.prio) return false;
    this.g = { name, t: 0, left: G.dur, dur: G.dur };
    if (name === 'taunt') this.tauntSide = Math.random() < 0.5 ? 1 : -1;
    return true;
  }
  gesturePose(name, f, t) {
    const custom = this.rig.gestures?.[name] || this.def.gestures?.[name];
    if (custom) { const r = custom(f, t, this.rig, this); if (r) return r; }
    if (name === 'cheer') return (CHEERS[this.def.style?.cheer] || CHEERS.fist)(f, t);
    if (name === 'win') return (CHEERS[this.def.style?.win || this.def.style?.cheer] || CHEERS.both)(f, t);
    return GESTURES[name].f(f, t, this);
  }
  // s: { steer, drift, speed01, grounded, gliding, boosting, look, phase, rank, time }
  update(dt, s) {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
    const rig = this.rig, p = {};
    this.t += dt;
    const t = this.t + this.seed;
    this.steer += ((s.steer || 0) - this.steer) * Math.min(1, dt * 10);
    const st = this.steer;
    // base: hands on the wheel, lean and look into turns
    p.lx = -this.reach - st * 0.28; p.rx = -this.reach + st * 0.28;
    p.lz = -this.inward; p.rz = this.inward;
    p.tz = st * 0.16 + (s.drift || 0) * 0.14;
    p.hy = -st * 0.4 - (s.drift || 0) * 0.25;
    p.hx = 0; p.hz = st * 0.08; p.tx = 0; p.ty = -st * 0.08; p.jaw = 0;
    p.by = s.grounded ? S(t * (12 + s.speed01 * 20)) * 0.012 * s.speed01 : 0.03;
    if (s.boosting) { p.tx = -0.16; p.hx = -0.12; }
    if (!s.grounded && !s.gliding) { p.lz -= 0.15; p.rz += 0.15; p.hx = -0.1; }
    if (s.gliding) { p.lx = p.rx = -2.95; p.lz = 0.25; p.rz = -0.25; p.tx = 0.12; p.hx = -0.15; p.tz = -st * 0.25; }
    if (s.look) { p.hy = Math.PI * 0.55; p.ty = 0.45; p.rx = -0.4; p.rz = -0.1; }
    if (s.phase === 'pre') {
      p.hy = S(t * 0.8) * 0.7; p.hx = S(t * 0.5) * 0.1; p.by = Math.abs(S(t * 9)) * 0.02;
    } else if (s.phase === 'win') {
      Object.assign(p, this.gesturePose('win', (t % 1.6) / 1.6, t % 1.6));
    } else if (s.phase === 'lose') {
      p.hx = 0.45; p.tx = 0.18; p.hy = S(t * 1.3) * 0.35; p.lx = p.rx = -0.9 - Math.max(0, S(t * 3)) * 0.4; p.tz = S(t * 1.3) * 0.05;
    }
    // gesture overlay
    if (this.g) {
      const g = this.g;
      g.t += dt; g.left -= dt;
      if (g.left <= 0) this.g = null;
      else {
        const f = Math.min(1, g.t / g.dur);
        const gp = this.gesturePose(g.name, f, g.t);
        const w = ease(Math.min(1, f / 0.12, (1 - f) / 0.2));
        for (const k in gp) if (k in this.p) p[k] = (p[k] ?? 0) * (1 - w) + gp[k] * w;
      }
    }
    // smooth toward the target pose (spins are tracked directly)
    const k = Math.min(1, dt * 14);
    for (const key of ORDER) {
      let v = p[key] ?? 0;
      if (!Number.isFinite(v)) v = 0;   // a bad custom gesture value never breaks the rig
      if (!Number.isFinite(this.p[key])) this.p[key] = 0;
      this.p[key] += (v - this.p[key]) * (key === 'ty' && Math.abs(v - this.p[key]) > 1 ? 1 : k);
    }
    this.apply();
    rig.idle?.(t, dt, this, s);
    rig.fx?.(this.g?.name || s.phase, this.g ? this.g.t / this.g.dur : 0, t);
  }
  apply() {
    const rig = this.rig, P = this.p, R = rig.rest;
    const set = (o, x, y, z) => { if (!o) return; const r = R.get(o).r; o.rotation.set(r.x + x, r.y + y, r.z + z); };
    set(rig.torso, P.tx, P.ty, P.tz);
    if (rig.torso) rig.torso.position.y = R.get(rig.torso).p.y + P.by;
    if (rig.head) set(rig.head, P.hx, Math.max(-1.6, Math.min(1.6, P.hy)), P.hz);
    else set(rig.torso, P.tx + P.hx * 0.5, P.ty + P.hy * 0.4, P.tz + P.hz);
    if (rig.armL) rig.armL.rotation.set(P.lx, 0, P.lz);
    if (rig.armR) rig.armR.rotation.set(P.rx, 0, P.rz);
    if (rig.jaw) set(rig.jaw, P.jaw * (rig.jawOpen ?? 0.5), 0, 0);
    if (rig.tail) rig.tail.rotation.y = R.get(rig.tail).r.y + S(this.t * 3) * 0.25 + this.steer * 0.3;
  }
}
