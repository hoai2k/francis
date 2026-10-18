// Crowds: cheap instanced civilians for the city regions (Shibuya, Shinjuku,
// and anyone else who wants them). Salarymen, office workers, students,
// shoppers, tourists, the elderly and (in Shibuya on 31 October) Halloween
// costumes walk a sidewalk graph, wait at pedestrian signals and surge
// across when they turn green, stand about in groups, and huddle where a
// curtain has trapped them. When a curse (or a fight) comes close they panic:
// they scream, flee, and calm down once it's gone (or run off and vanish).
// Everyone is drawn with a handful of InstancedMeshes (one draw per body
// part for the whole crowd), animated on the CPU, spawned round the camera
// focus and despawned far away; the head count is capped by quality tier.
//
// ------------------------------------------------------------------ build time
//   import { CrowdPlan } from '../../entities/crowd.js';
//   const C = new CrowdPlan(R, { looks: { salaryman: 3, shopper: 2 }, density: 1 });
//   C.path([[x, z], …], { width: 3, step: 8, weight: 1 })   a sidewalk polyline (nodes merge
//                                                             with nearby nodes, so paths join up)
//   C.cross([x, z], [x, z], 'ns')        a crosswalk on signal group 'ns' (or 'ew', 'all', any name)
//   C.signal(x, z, 'ns', yaw)            a pedestrian signal post (lamp turns green with its group)
//   C.phases([{ walk: ['ns'], t: 12 }, { walk: [], t: 3 }, …])   the signal cycle
//   C.spot(x, z, { n: 4, r: 2, pose: 'idle'|'phone'|'chat'|'cheer' })   people standing about
//   C.huddle(x, z, { n: 5, r: 2, to: [x, z], pose: 'cower'|'bang', face })   civilians trapped
//                                        there; walk up (with no curse near) and they run to `to`
//   C.zone(x0, z0, x1, z1, { mood: 'trapped', density: 1.5 })   area mood / density
//   L.crowd = C.finish()                 (after the terrain and buildings: finds the floor heights)
//
// ------------------------------------------------------------------ runtime
//   Crowd.attach(game, L)   -> crowd (or null if L.crowd is missing); builds the meshes, adds
//                              an updater; everything is cleaned up by game.clearLevel()
//   crowd.alarm(pos, r = 14)   make everyone near pos panic (explosions, domains…)
//   crowd.count                people currently out
//   crowd.freeHuddle(i)        send a trapped group running (also automatic)
//   game.crowd                 the current region's crowd (or null)
import * as THREE from 'three/webgpu';
import { B } from '../world/blocks.js';

// ---------------------------------------------------------------- looks
const SKIN = [0xf4d0b0, 0xeec4a2, 0xe0b48e, 0xd0a07c, 0xf6dcc8, 0xc89070];
const HAIR_DARK = [0x101010, 0x15110e, 0x1e1610, 0x2a1a10, 0x3a2414];
const HAIR_ANY = [...HAIR_DARK, 0x6a4020, 0x9a6a3a, 0xc8a060, 0xd0d0d8];
const HAIR_GREY = [0xb8b8c0, 0xd0d0d8, 0x8a8a90];
const BRIGHT = [0xe85a7a, 0xf0c040, 0x60b0e0, 0xa0d070, 0xf4f4f4, 0xff8a4a, 0xb07ae0, 0x40c0a0, 0xf0a0c0];
const JEANS = [0x3a4a6a, 0x2a3450, 0x2a2a2a, 0xd8c8a8, 0x5a5a62];
export const CROWD_LOOKS = {
  salaryman: { top: [0x1e2230, 0x2a2c34, 0x34363e, 0x1a1e2a, 0x30343c], pants: 'top', sleeve: 'top', acc: ['case', 'case', 'case', null], accColor: [0x1a1410, 0x2a1a10, 0x111111], hair: HAIR_DARK, collar: true },
  office: { top: [0xe8e8ee, 0x8a8a9a, 0xd8c8b8, 0x3a4a6a, 0xc8b0a8], pants: [0x2a2a38, 0x4a4a58, 0x1a1a22, 0x6a5a4a], sleeve: 'top', acc: ['bag', 'bag', null], accColor: [0xa04a3a, 0x1a1a1a, 0xd8b890, 0x6a3a2a], hair: HAIR_ANY },
  student: { top: [0x15151c, 0x1a1a24], pants: 'top', sleeve: 'top', acc: ['backpack', 'bag', null], accColor: [0x2a2a2a, 0x3a5a8a, 0x8a2a2a], hair: HAIR_DARK, scale: [0.88, 0.98] },
  sailor: { top: [0xf0f0f4], pants: [0x1e2a4a, 0x2a2440], sleeve: 'top', acc: ['bag', 'backpack'], accColor: [0x1e2a4a, 0x6a3a2a], hair: HAIR_DARK, scale: [0.86, 0.95] },
  shopper: { top: BRIGHT, pants: JEANS, sleeve: ['top', 'skin'], acc: ['bag', 'bag', null, 'backpack'], accColor: BRIGHT, hair: HAIR_ANY },
  tourist: { top: [0xf08a3a, 0x3ab0a0, 0xf0e060, 0x8ad0f0, 0xffffff], pants: [0xd8c8a0, 0x6a7a5a, 0x4a5a7a], sleeve: 'skin', acc: ['backpack'], accColor: [0x2a5a3a, 0x8a3a2a, 0x2a2a4a], hat: ['cap', 'cap', null], hatColor: [0xf4f4f4, 0x2a4a8a, 0xd83a2a], hair: HAIR_ANY },
  elder: { top: [0x6a5a4a, 0x8a4a6a, 0x5a6a5a, 0x7a7068], pants: [0x4a4038, 0x3a3a40], sleeve: 'top', acc: ['bag', null], accColor: [0x6a4a2a, 0x3a2a1a], hair: HAIR_GREY, scale: [0.86, 0.94], slow: true },
  kid: { top: [0xe85a3a, 0x3a8ae8, 0xf0c040, 0x60c070], pants: [0x2a3a5a, 0x3a3a3a], sleeve: 'skin', acc: ['backpack', null], accColor: [0xd83a2a, 0x2a2a2a], hat: ['cap', null, null], hatColor: [0xf0d040, 0xd83a2a], hair: HAIR_DARK, scale: [0.62, 0.72] },
  host: { top: [0x101014, 0xf4f4f4, 0x6a1a3a], pants: [0x101014], sleeve: 'top', acc: [null], hair: [0xc8a060, 0x9a6a3a, 0xe8e0d0, 0x101010], collar: true },
  // Halloween in Shibuya
  witch: { top: [0x2a1a3a, 0x1a1a2a], pants: 'top', sleeve: 'top', acc: ['bag'], accColor: [0xf07a1a], hat: ['witch'], hatColor: [0x1a0a2a, 0x2a1a3a], hair: [0x101010, 0xd04a1a, 0x5a2a8a] },
  pumpkin: { top: [0xf07a1a], pants: [0x2a5a2a, 0x1a1a1a], sleeve: 'top', acc: [null], hat: ['cap'], hatColor: [0x2a6a2a], hair: HAIR_ANY },
  ghost: { top: [0xf2f2f4], pants: [0xf2f2f4], sleeve: 'top', skin: [0xf0f0f4], acc: [null], hair: [0xf2f2f4] },
  vampire: { top: [0x141414], pants: [0x141414], sleeve: [0x8a0a1a], acc: [null], hair: [0x101010], skin: [0xe8e0e0, 0xd8d8e0], collar: true },
  cat: { top: [0x141414, 0x2a2a2a], pants: [0x141414], sleeve: 'top', acc: [null], hat: ['ears'], hatColor: [0x141414, 0xf4f4f4], hair: [0x101010, 0xf0c0d0] },
  nurse: { top: [0xf8f0f4, 0xf0d0e0], pants: [0xf8f0f4], sleeve: 'top', acc: ['bag'], accColor: [0xd83a3a], hat: ['cap'], hatColor: [0xf8f0f4], hair: HAIR_ANY },
};
export const LOOK_SETS = {
  city: { salaryman: 4, office: 3, student: 1, sailor: 1, shopper: 3, tourist: 1, elder: 1, kid: 0.4 },
  shibuya: { salaryman: 2, office: 1, student: 1, sailor: 1, shopper: 3, tourist: 1, elder: 0.5, witch: 1, pumpkin: 0.6, ghost: 0.6, vampire: 0.6, cat: 0.8, nurse: 0.5, kid: 0.3 },
  office: { salaryman: 6, office: 4, tourist: 0.6, shopper: 0.6 },
  kabukicho: { salaryman: 3, host: 2, office: 1, shopper: 3, tourist: 1.5, student: 0.4 },
  park: { tourist: 3, elder: 2, kid: 1.5, shopper: 2, office: 1, sailor: 0.6 },
};

// ---------------------------------------------------------------- build-time plan
export class CrowdPlan {
  constructor(R, o = {}) {
    this.R = R; this.o = o;
    this.nodes = []; this.edges = []; this.spots = []; this.huddles = []; this.signals = []; this.zones = []; this.cycle = null;
    this.grid = new Map(); this.edgeSet = new Set();
  }
  key(x, z) { return Math.floor(x / 4) + ',' + Math.floor(z / 4); }
  node(x, z, merge = 1.8) {
    const kx = Math.floor(x / 4), kz = Math.floor(z / 4);
    let best = -1, bd = merge;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const n of this.grid.get((kx + i) + ',' + (kz + j)) ?? []) { const d = Math.hypot(this.nodes[n][0] - x, this.nodes[n][1] - z); if (d < bd) { bd = d; best = n; } }
    if (best >= 0) return best;
    const id = this.nodes.length; this.nodes.push([x, z]);
    const k = kx + ',' + kz; if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(id);
    return id;
  }
  link(a, b, o = {}) {
    if (a === b) return;
    const k = Math.min(a, b) + ':' + Math.max(a, b); if (this.edgeSet.has(k)) return; this.edgeSet.add(k);
    this.edges.push({ a, b, light: o.light ?? null, w: o.width ?? 2, wt: o.weight ?? 1 });
  }
  path(pts, o = {}) {
    const step = o.step ?? 8, out = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
      for (let s = 0; s < n; s++) out.push(this.node(ax + (bx - ax) * s / n, az + (bz - az) * s / n));
    }
    out.push(this.node(pts[pts.length - 1][0], pts[pts.length - 1][1]));
    for (let i = 0; i < out.length - 1; i++) this.link(out[i], out[i + 1], o);
    return out;
  }
  cross(p0, p1, group = 'all', o = {}) { this.link(this.node(p0[0], p0[1]), this.node(p1[0], p1[1]), { ...o, light: group, width: o.width ?? 4 }); return this; }
  signal(x, z, group = 'all', yaw = 0) {
    this.signals.push({ x, z, group, yaw });
    const P = this.R.props, y = this.R.floor(Math.floor(x), Math.floor(z));
    P.box(x, y, z, 0.14, 2.6, 0.14, 0x2a2c30);
    P.box(x + Math.sin(yaw) * 0.12, y + 2.3, z + Math.cos(yaw) * 0.12, 0.42, 0.8, 0.26, 0x1a1c20, { ry: yaw });
    if (!this.R.world.get(Math.floor(x), y, Math.floor(z))) this.R.world.set(Math.floor(x), y, Math.floor(z), B.barrier);
    return this;
  }
  phases(list) { this.cycle = list; return this; }
  spot(x, z, o = {}) { this.spots.push({ x, z, n: o.n ?? 4, r: o.r ?? 2, pose: o.pose ?? 'chat', looks: o.looks ?? null, face: o.face ?? null }); return this; }
  huddle(x, z, o = {}) { this.huddles.push({ x, z, n: o.n ?? 5, r: o.r ?? 2, to: o.to ?? null, pose: o.pose ?? 'cower', face: o.face ?? null, looks: o.looks ?? null, id: o.id ?? null }); return this; }
  zone(x0, z0, x1, z1, o = {}) { this.zones.push({ x0, z0, x1, z1, mood: o.mood ?? null, density: o.density ?? 1, looks: o.looks ?? null }); return this; }
  // Join dead ends: each sidewalk end links to its nearest reachable node (round the corner)
  // and, if one is in range across a road, gets a crosswalk too (with signals). Call after
  // the buildings stand (links never pass through solid blocks). Returns [[p0, p1]…] crosswalks.
  autoLink(o = {}) {
    const R = this.R, W = R.world, rad = o.radius ?? 10, out = [];
    const deg = new Array(this.nodes.length).fill(0), nb = this.nodes.map(() => new Set());
    for (const e of this.edges) { deg[e.a]++; deg[e.b]++; nb[e.a].add(e.b); nb[e.b].add(e.a); }
    const clear = (a, b) => {
      const [ax, az] = this.nodes[a], [bx, bz] = this.nodes[b], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L * 2);
      let road = 0;
      for (let s = 1; s < n; s++) {
        const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n, y = R.hAt(x, z);
        if (W.solidAt(x, y + 0.5, z) && W.get(Math.floor(x), y, Math.floor(z)) !== B.barrier) return -1;
        if (W.solidAt(x, y + 1.5, z)) return -1;
        if (Math.abs(R.hAt(x, z) - R.hAt(ax, az)) > 2) return -1;
        if (R.roadId[R.i(Math.floor(x), Math.floor(z))]) road++;
      }
      return road;
    };
    const dead = [];
    for (let i = 0; i < this.nodes.length; i++) if (deg[i] <= 1) dead.push(i);
    for (const d of dead) {
      const [x, z] = this.nodes[d];
      const two = new Set([d]); for (const n of nb[d]) { two.add(n); for (const m of nb[n]) { two.add(m); for (const q of nb[m]) two.add(q); } }
      const cand = [];
      const kx = Math.floor(x / 4), kz = Math.floor(z / 4), rr = Math.ceil(rad / 4);
      for (let i = -rr; i <= rr; i++) for (let j = -rr; j <= rr; j++) for (const n of this.grid.get((kx + i) + ',' + (kz + j)) ?? []) {
        if (two.has(n)) continue; const dd = Math.hypot(this.nodes[n][0] - x, this.nodes[n][1] - z); if (dd <= rad) cand.push([n, dd]);
      }
      cand.sort((a, b) => a[1] - b[1]);
      let walked = false, crossed = false;
      for (const [n, dd] of cand) {
        if (walked && crossed) break;
        const road = clear(d, n); if (road < 0) continue;
        if (road <= 1 && !walked) { this.link(d, n, { width: 2 }); walked = true; }
        else if (road > 1 && !crossed && dd > 4) {
          const [nx, nz] = this.nodes[n], mx = (x + nx) / 2, mz = (z + nz) / 2;
          const grp = o.group?.(mx, mz, nx - x, nz - z) ?? (Math.abs(nx - x) > Math.abs(nz - z) ? 'ew' : 'ns');
          this.link(d, n, { light: grp, width: 3 }); crossed = true;
          const yaw = Math.atan2(nx - x, nz - z);
          if (o.signals !== false && grp !== 'all') { this.signal(x - Math.sin(yaw) * 0.8 + Math.cos(yaw) * 1.4, z - Math.cos(yaw) * 0.8 - Math.sin(yaw) * 1.4, grp, yaw); this.signal(nx + Math.sin(yaw) * 0.8 - Math.cos(yaw) * 1.4, nz + Math.cos(yaw) * 0.8 + Math.sin(yaw) * 1.4, grp, yaw + Math.PI); }
          out.push([[x, z], [nx, nz]]);
        }
      }
    }
    return out;
  }
  finish() {
    const R = this.R, fy = (x, z) => R.floor(Math.floor(x), Math.floor(z));
    const nodes = new Float32Array(this.nodes.length * 3);
    this.nodes.forEach(([x, z], i) => { nodes[i * 3] = x; nodes[i * 3 + 1] = fy(x, z); nodes[i * 3 + 2] = z; });
    const withY = (s) => ({ ...s, y: fy(s.x, s.z) });
    return {
      nodes, edges: this.edges, spots: this.spots.map(withY), huddles: this.huddles.map(withY), signals: this.signals.map(withY), zones: this.zones,
      cycle: this.cycle ?? [{ walk: ['ns', 'all'], t: 12 }, { walk: [], t: 3 }, { walk: ['ew', 'all'], t: 12 }, { walk: [], t: 3 }],
      looks: this.o.looks ?? LOOK_SETS.city, density: this.o.density ?? 1, mood: this.o.mood ?? null,
    };
  }
}

// ---------------------------------------------------------------- geometry
// boxes merged into one geometry with a vertex colour per box (multiplied by the instance colour)
function boxes(list) {
  const pos = [], nrm = [], col = [], idx = [];
  for (const b of list) {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d).translate(b.x ?? 0, b.y ?? 0, b.z ?? 0);
    const base = pos.length / 3, c = b.c ?? [1, 1, 1];
    pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i++) col.push(c[0], c[1], c[2]);
    for (const i of g.index.array) idx.push(i + base);
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
// body (units, before the per-person scale): ~2.05 tall
const LEG = { w: 0.25, h: 0.8, x: 0.135, y: 0.8 };
const ARM = { w: 0.21, h: 0.7, x: 0.375, y: 1.5 };
const NECK = 1.52;
let GEO = null, MATS = null;
function geometry() {
  if (GEO) return GEO;
  const shoe = [0.2, 0.18, 0.18];
  GEO = {
    leg: boxes([{ w: LEG.w, h: 0.66, d: 0.26, y: -0.33 }, { w: LEG.w + 0.02, h: 0.14, d: 0.32, y: -0.73, z: 0.03, c: shoe }]),
    arm: boxes([{ w: ARM.w, h: ARM.h - 0.14, d: 0.23, y: -(ARM.h - 0.14) / 2 + 0.02 }]),
    hand: boxes([{ w: ARM.w - 0.02, h: 0.15, d: 0.2, y: -ARM.h + 0.06 }]),
    torso: boxes([{ w: 0.54, h: 0.72, d: 0.3, y: 1.16 }]),
    collar: boxes([{ w: 0.2, h: 0.36, d: 0.02, y: 1.34, z: 0.152 }, { w: 0.07, h: 0.3, d: 0.025, y: 1.32, z: 0.158, c: [0.5, 0.12, 0.14] }]),
    head: boxes([{ w: 0.5, h: 0.5, d: 0.48, y: 0.25 }]),
    hair: boxes([{ w: 0.54, h: 0.16, d: 0.52, y: 0.52 }, { w: 0.54, h: 0.34, d: 0.12, y: 0.32, z: -0.22 }, { w: 0.06, h: 0.2, d: 0.42, x: 0.25, y: 0.38, z: -0.02 }, { w: 0.06, h: 0.2, d: 0.42, x: -0.25, y: 0.38, z: -0.02 }]),
    eyes: boxes([{ w: 0.08, h: 0.09, d: 0.02, x: 0.11, y: 0.27, z: 0.245 }, { w: 0.08, h: 0.09, d: 0.02, x: -0.11, y: 0.27, z: 0.245 }]),
    case: boxes([{ w: 0.1, h: 0.32, d: 0.44, y: -ARM.h - 0.12 }, { w: 0.04, h: 0.08, d: 0.14, y: -ARM.h + 0.06, c: [0.4, 0.4, 0.4] }]),
    bag: boxes([{ w: 0.12, h: 0.36, d: 0.34, x: 0.36, y: 0.92 }, { w: 0.03, h: 0.5, d: 0.04, x: 0.3, y: 1.22, z: 0.0 }]),
    backpack: boxes([{ w: 0.44, h: 0.52, d: 0.18, y: 1.18, z: -0.24 }, { w: 0.36, h: 0.18, d: 0.06, y: 1.0, z: -0.34, c: [0.8, 0.8, 0.8] }]),
    cap: boxes([{ w: 0.54, h: 0.14, d: 0.54, y: 0.56 }, { w: 0.46, h: 0.04, d: 0.24, y: 0.5, z: 0.34 }]),
    witch: boxes([{ w: 0.86, h: 0.05, d: 0.86, y: 0.52 }, { w: 0.44, h: 0.32, d: 0.44, y: 0.7 }, { w: 0.28, h: 0.26, d: 0.28, y: 0.98, z: -0.04 }, { w: 0.14, h: 0.2, d: 0.14, y: 1.18, z: -0.1 }, { w: 0.46, h: 0.06, d: 0.46, y: 0.57, c: [3.5, 1.6, 0.4] }]),
    ears: boxes([{ w: 0.14, h: 0.16, d: 0.06, x: 0.16, y: 0.6 }, { w: 0.14, h: 0.16, d: 0.06, x: -0.16, y: 0.6 }, { w: 0.06, h: 0.08, d: 0.07, x: 0.16, y: 0.58, c: [3, 1.6, 2] }, { w: 0.06, h: 0.08, d: 0.07, x: -0.16, y: 0.58, c: [3, 1.6, 2] }]),
    lamp: new THREE.BoxGeometry(0.3, 0.3, 0.06),
  };
  return GEO;
}
function materials() {
  if (MATS) return MATS;
  const mk = (o = {}) => new THREE.MeshStandardNodeMaterial({ roughness: 0.82, metalness: 0, vertexColors: true, ...o });
  MATS = {
    body: mk(), skin: mk({ roughness: 0.6 }), hair: mk({ roughness: 0.55 }),
    eyes: new THREE.MeshBasicNodeMaterial({ color: 0x141018, vertexColors: true }),
    red: new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(3.2, 0.5, 0.35) }),
    green: new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0.4, 3.0, 1.4) }),
  };
  return MATS;
}

// ---------------------------------------------------------------- runtime
const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _p = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
let lastCrowd = null;

export class Crowd {
  static attach(game, L) {
    if (!L?.crowd || !L.crowd.nodes?.length) { game.crowd = null; return null; }
    let c = null;
    try { c = new Crowd(game, L); } catch (e) { console.warn('crowd', e); game.crowd = null; return null; }
    game.crowd = c;
    game.addUpdater((dt) => { if (game.crowd !== c) return false; c.update(dt); });
    const grp = L.world?.group; if (grp) { const f = () => { grp.removeEventListener('removed', f); if (game.crowd === c) game.crowd = null; c.dispose(); }; grp.addEventListener('removed', f); }
    return c;
  }
  constructor(game, L) {
    if (lastCrowd) lastCrowd.dispose();
    lastCrowd = this;
    this.game = game; this.L = L; const D = this.D = L.crowd;
    const q = game.gr?.quality ?? 'medium';
    this.cap = Math.round(({ low: 32, medium: 52, high: 80, ultra: 110 }[q] ?? 48) * (D.density ?? 1));
    this.radius = { low: 46, medium: 56, high: 66, ultra: 74 }[q] ?? 56;
    this.shadows = q === 'high' || q === 'ultra';
    this.N = D.nodes.length / 3;
    this.adj = Array.from({ length: this.N }, () => []);
    D.edges.forEach((e, i) => { this.adj[e.a].push(i); this.adj[e.b].push(i); e.len = Math.hypot(D.nodes[e.a * 3] - D.nodes[e.b * 3], D.nodes[e.a * 3 + 2] - D.nodes[e.b * 3 + 2]) || 0.5; });
    this.lookW = Object.entries(D.looks ?? LOOK_SETS.city).filter(([k]) => CROWD_LOOKS[k]);
    if (!this.lookW.length) this.lookW = Object.entries(LOOK_SETS.city);
    this.rand = Math.random;
    this.agents = []; this.count = 0;
    this.spots = (D.spots ?? []).map((s) => ({ ...s, members: [] }));
    this.huddles = (D.huddles ?? []).map((s) => ({ ...s, members: [], freed: false }));
    this.phase = 0; this.phaseT = D.cycle[0]?.t ?? 10; this.walk = new Set(D.cycle[0]?.walk ?? []);
    this.screamT = 0; this.spawnT = 0; this.candT = 0; this.cands = []; this.threatT = 0; this.threats = [];
    this.t = 0;
    this.build();
  }
  // ---------------------------------------------------------------- meshes
  build() {
    const G = geometry(), M = materials(), n = this.cap, g = this.game;
    const inst = (geo, mat, count, shadow = this.shadows) => {
      const m = new THREE.InstancedMesh(geo, mat, count);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0; m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = true; m.name = 'crowd';
      for (let i = 0; i < count; i++) m.setMatrixAt(i, ZERO_M);
      g.scene.add(m); (g.hubProps ??= []).push(m);
      return m;
    };
    this.mesh = {
      leg: inst(G.leg, M.body, n * 2), arm: inst(G.arm, M.body, n * 2), hand: inst(G.hand, M.skin, n * 2, false),
      torso: inst(G.torso, M.body, n), collar: inst(G.collar, M.body, n, false), head: inst(G.head, M.skin, n), hair: inst(G.hair, M.hair, n, false), eyes: inst(G.eyes, M.eyes, n, false),
      case: inst(G.case, M.body, n, false), bag: inst(G.bag, M.body, n, false), backpack: inst(G.backpack, M.body, n, false),
      cap: inst(G.cap, M.body, n, false), witch: inst(G.witch, M.body, n, false), ears: inst(G.ears, M.body, n, false),
    };
    for (const k of ['leg', 'arm', 'hand', 'torso', 'collar', 'head', 'hair', 'case', 'bag', 'backpack', 'cap', 'witch', 'ears']) { const m = this.mesh[k]; for (let i = 0; i < m.instanceMatrix.count; i++) m.setColorAt(i, _c.set(0xffffff)); m.instanceColor.setUsage(THREE.DynamicDrawUsage); }
    for (let i = 0; i < n; i++) this.agents.push({ i, on: false });
    // pedestrian signal lamps
    const S = this.D.signals ?? [];
    this.lamps = null;
    if (S.length) {
      const red = inst(G.lamp, M.red, S.length, false), green = inst(G.lamp, M.green, S.length, false);
      red.count = green.count = S.length;
      this.lamps = { red, green };
      this.updateLamps();
    }
  }
  updateLamps() {
    if (!this.lamps) return;
    const S = this.D.signals;
    S.forEach((s, i) => {
      const on = this.walk.has(s.group);
      const lit = on ? this.lamps.green : this.lamps.red, off = on ? this.lamps.red : this.lamps.green;
      _q.setFromAxisAngle(_v.set(0, 1, 0), s.yaw);
      _m.compose(_s.set(s.x + Math.sin(s.yaw) * 0.26, s.y + (on ? 2.1 : 2.5), s.z + Math.cos(s.yaw) * 0.26), _q, _v.set(1, 1, 1));
      lit.setMatrixAt(i, _m); off.setMatrixAt(i, ZERO_M);
    });
    this.lamps.red.instanceMatrix.needsUpdate = true; this.lamps.green.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    for (const m of Object.values(this.mesh ?? {})) { m.parent?.remove(m); m.dispose?.(); }
    if (this.lamps) for (const m of Object.values(this.lamps)) { m.parent?.remove(m); m.dispose?.(); }
    this.mesh = null; this.lamps = null;
    if (lastCrowd === this) lastCrowd = null;
  }
  // ---------------------------------------------------------------- people
  zoneAt(x, z) { for (const Z of this.D.zones ?? []) if (x >= Z.x0 && x <= Z.x1 && z >= Z.z0 && z <= Z.z1) return Z; return null; }
  dress(a, lookSet) {
    const r = this.rand;
    let set = lookSet ? Object.entries(lookSet).filter(([k]) => CROWD_LOOKS[k]) : this.lookW;
    if (!set.length) set = this.lookW;
    let tot = 0; for (const [, w] of set) tot += w;
    let x = r() * tot, key = set[0][0];
    for (const [k, w] of set) { x -= w; if (x <= 0) { key = k; break; } }
    const lk = CROWD_LOOKS[key];
    const top = pick(lk.top, r);
    const skin = pick(lk.skin ?? SKIN, r);
    const pants = lk.pants === 'top' ? top : pick(lk.pants, r);
    const sl = Array.isArray(lk.sleeve) ? pick(lk.sleeve, r) : lk.sleeve;
    const sleeve = sl === 'top' ? top : sl === 'skin' ? skin : (typeof sl === 'number' ? sl : top);
    a.look = key; a.slow = !!lk.slow;
    a.col = { top, pants, sleeve, skin, hair: pick(lk.hair, r), acc: lk.accColor ? pick(lk.accColor, r) : 0x2a2a2a, hat: lk.hatColor ? pick(lk.hatColor, r) : 0xffffff };
    a.acc = pick(lk.acc ?? [null], r); a.hat = lk.hat ? pick(lk.hat, r) : null; a.collar = !!lk.collar;
    const [s0, s1] = lk.scale ?? [0.92, 1.06]; a.scale = s0 + (s1 - s0) * r();
    const i = a.i, M = this.mesh;
    M.leg.setColorAt(i * 2, _c.set(pants)); M.leg.setColorAt(i * 2 + 1, _c);
    M.arm.setColorAt(i * 2, _c.set(sleeve)); M.arm.setColorAt(i * 2 + 1, _c);
    M.hand.setColorAt(i * 2, _c.set(skin)); M.hand.setColorAt(i * 2 + 1, _c);
    M.torso.setColorAt(i, _c.set(top)); M.head.setColorAt(i, _c.set(skin)); M.hair.setColorAt(i, _c.set(a.col.hair));
    M.collar.setColorAt(i, _c.set(0xf2f2f2));
    for (const k of ['case', 'bag', 'backpack']) M[k].setColorAt(i, _c.set(a.col.acc));
    for (const k of ['cap', 'witch', 'ears']) M[k].setColorAt(i, _c.set(a.col.hat));
    this.colorsDirty = true;
  }
  free() { for (const a of this.agents) if (!a.on) return a; return null; }
  spawnWalker(e, t) {
    const a = this.free(); if (!a) return null;
    const D = this.D, E = D.edges[e];
    const fwd = this.rand() < 0.5;
    a.on = true; a.state = 'walk'; a.from = fwd ? E.a : E.b; a.to = fwd ? E.b : E.a; a.edge = e; a.t = t; a.prev = -1;
    a.y = null; a.off = (this.rand() - 0.5) * (E.w ?? 2) * 0.9; a.speed = 1.25 + this.rand() * 0.5; a.ph = this.rand() * 6.28; a.wait = 0; a.fade = 0; a.alpha = 0;
    this.place(a);
    const Z = this.zoneAt(a.x, a.z);
    this.dress(a, Z?.looks); if (a.slow) a.speed *= 0.7;
    a.mood = Z?.mood ?? D.mood ?? null; if (a.mood === 'trapped') a.speed *= 0.85;
    a.spot = null; a.hud = null; a.pose = null; a.panicT = 0; a.calm = 0;
    this.count++;
    return a;
  }
  spawnStill(group, k, huddle) {
    const a = this.free(); if (!a) return null;
    a.on = true; a.spot = huddle ? null : group; a.hud = huddle ? group : null;
    const ang = (k / group.n) * Math.PI * 2 + this.rand() * 0.6, d = group.r * (0.45 + this.rand() * 0.55);
    a.x = group.x + Math.cos(ang) * d; a.z = group.z + Math.sin(ang) * d;
    const W = this.game.world, gy = W.standY(a.x, a.z, group.y, 2); a.y = isFinite(gy) ? gy : group.y;
    a.yaw = group.face != null ? group.face + (this.rand() - 0.5) * 0.7 : Math.atan2(group.x - a.x, group.z - a.z);
    a.state = huddle ? 'huddle' : 'still'; a.pose = group.pose; a.ph = this.rand() * 6.28; a.speed = 0; a.fade = 0; a.alpha = 0; a.panicT = 0; a.calm = 0;
    this.dress(a, group.looks);
    a.mood = huddle ? 'trapped' : null;
    this.count++;
    return a;
  }
  despawn(a) {
    if (!a.on) return;
    a.on = false; this.count--;
    if (a.spot) a.spot.members = a.spot.members.filter((m) => m !== a);
    if (a.hud) a.hud.members = a.hud.members.filter((m) => m !== a);
    a.spot = a.hud = null;
    const M = this.mesh, i = a.i;
    for (const k of ['torso', 'collar', 'head', 'hair', 'eyes', 'case', 'bag', 'backpack', 'cap', 'witch', 'ears']) M[k].setMatrixAt(i, ZERO_M);
    for (const k of ['leg', 'arm', 'hand']) { M[k].setMatrixAt(i * 2, ZERO_M); M[k].setMatrixAt(i * 2 + 1, ZERO_M); }
  }
  place(a) {
    const D = this.D, n = D.nodes, A = a.from * 3, B = a.to * 3;
    const dx = n[B] - n[A], dz = n[B + 2] - n[A + 2], len = Math.hypot(dx, dz) || 1;
    const px = -dz / len, pz = dx / len;
    a.x = n[A] + dx * a.t + px * a.off; a.z = n[A + 2] + dz * a.t + pz * a.off;
    const y = n[A + 1] + (n[B + 1] - n[A + 1]) * a.t;
    a.y = a.y == null || Math.abs(a.y - y) > 2 ? y : a.y + (y - a.y) * 0.3;
    a.yaw = Math.atan2(dx, dz);
  }
  // next edge at node `at`, not straight back unless it's a dead end
  nextEdge(a) {
    const opts = this.adj[a.to].filter((e) => e !== a.edge);
    if (!opts.length) return a.edge;
    let tot = 0; for (const e of opts) tot += this.D.edges[e].wt ?? 1;
    let x = this.rand() * tot;
    for (const e of opts) { x -= this.D.edges[e].wt ?? 1; if (x <= 0) return e; }
    return opts[opts.length - 1];
  }
  // ---------------------------------------------------------------- frame
  alarm(pos, r = 14) {
    for (const a of this.agents) if (a.on && Math.hypot(a.x - pos.x, a.z - pos.z) < r) this.panic(a, pos);
  }
  panic(a, from) {
    if (a.state === 'gone') return;
    const was = a.state === 'panic';
    a.state = 'panic'; a.panicT = 0; a.calm = 0;
    if (a.spot) { a.spot.dropped = true; a.spot.members = a.spot.members.filter((m) => m !== a); a.spot = null; }
    if (from) { a.fx = a.x - from.x; a.fz = a.z - from.z; const l = Math.hypot(a.fx, a.fz) || 1; a.fx /= l; a.fz /= l; }
    a.speed = 4.6 + this.rand() * 1.4;
    if (!was && a.hud) { a.state = 'cower'; a.speed = 0; }
    if (!was) this.scream(a);
  }
  scream(a) {
    const g = this.game; if (this.screamT > 0 || !g.audio?.tone) return;
    const f = g.rig?.focus; if (f && Math.hypot(a.x - f.x, a.z - f.z) > 34) return;
    this.screamT = 0.7 + this.rand() * 1.2;
    const hi = a.look === 'kid' || a.look === 'sailor' || a.look === 'office' || this.rand() < 0.5;
    const f0 = (hi ? 820 : 420) + this.rand() * 200;
    try { g.audio.tone({ freq: f0, to: f0 * 1.45, dur: 0.38 + this.rand() * 0.25, gain: 0.035, type: 'sawtooth', filter: 2400, rev: 0.25 }); g.audio.tone({ freq: f0 * 1.01, to: f0 * 0.8, dur: 0.5, gain: 0.02, type: 'triangle', at: 0.12, rev: 0.25 }); } catch (e) { /* audio not started */ }
  }
  freeHuddle(h) {
    if (typeof h === 'number') h = this.huddles[h];
    if (!h || h.freed) return;
    h.freed = true;
    for (const a of h.members) { a.state = 'escape'; a.speed = 3.8 + this.rand(); a.panicT = 0; a.tx = h.to?.[0] ?? a.x + (a.x - this.game.players[0].pos.x) * 10; a.tz = h.to?.[1] ?? a.z; }
    this.game.toast?.('The trapped civilians run for it!');
    this.game.audio?.energy?.('heal');
  }
  active() {
    const g = this.game;
    return g.state === 'playing' && !g.paused && !g.cutscenes?.active;
  }
  update(dt) {
    if (!this.mesh) return;
    const g = this.game;
    const run = this.active();
    if (!run) dt = 0;
    this.t += dt; this.screamT -= dt;
    // signals
    if (dt) {
      this.phaseT -= dt;
      if (this.phaseT <= 0) { const C = this.D.cycle; this.phase = (this.phase + 1) % C.length; this.phaseT = C[this.phase].t; this.walk = new Set(C[this.phase].walk); this.updateLamps(); }
    }
    const focus = g.rig?.focus ?? g.players[0]?.pos; if (!focus) return;
    const R = this.radius;
    // threats: live curses near the focus (refreshed 4× a second)
    this.threatT -= dt;
    if (this.threatT <= 0) {
      this.threatT = 0.25;
      this.threats = g.enemies.filter((e) => !e.dead && !e.isDummy && e.pos && Math.hypot(e.pos.x - focus.x, e.pos.z - focus.z) < R + 16).map((e) => e.pos);
      const ds = g.domainSys; if (ds?.active && ds.center) this.threats.push(ds.center);
      for (const p of g.players) if (p.domainActive) this.threats.push(p.pos);
    }
    if (dt) this.spawn(dt, focus, R);
    const W = g.world, players = g.players.filter((p) => !p.dead);
    for (const a of this.agents) {
      if (!a.on) continue;
      const fd = Math.hypot(a.x - focus.x, a.z - focus.z);
      if (fd > R + 14 || a.alpha <= 0 && a.fade < 0) { this.despawn(a); continue; }
      if (dt) this.think(a, dt, W, players);
      this.draw(a, dt);
    }
    let hi = 0; for (const a of this.agents) if (a.on && a.i + 1 > hi) hi = a.i + 1;
    for (const [k, m] of Object.entries(this.mesh)) { m.instanceMatrix.needsUpdate = true; m.count = Math.min(m.instanceMatrix.count, (k === 'leg' || k === 'arm' || k === 'hand' ? 2 : 1) * Math.max(hi, this.hiPrev ?? 0)); }
    this.hiPrev = hi;
    if (this.colorsDirty) { for (const m of Object.values(this.mesh)) if (m.instanceColor) m.instanceColor.needsUpdate = true; this.colorsDirty = false; }
  }
  spawn(dt, focus, R) {
    // still groups (spots, huddles) near the focus
    for (const list of [this.spots, this.huddles]) for (const s of list) {
      const d = Math.hypot(s.x - focus.x, s.z - focus.z);
      if (d < R - 6 && !s.members.length && !s.freed && !s.dropped) { for (let k = 0; k < s.n; k++) { const a = this.spawnStill(s, k, list === this.huddles); if (a) s.members.push(a); } }
      if (d > R + 10) s.dropped = false;
    }
    // walkers on edges in a ring round the focus
    this.candT -= dt;
    if (this.candT <= 0) {
      this.candT = 0.8;
      const D = this.D, n = D.nodes; this.cands = [];
      D.edges.forEach((E, i) => {
        const mx = (n[E.a * 3] + n[E.b * 3]) / 2, mz = (n[E.a * 3 + 2] + n[E.b * 3 + 2]) / 2, d = Math.hypot(mx - focus.x, mz - focus.z);
        if (d < R - 4) { const Z = this.zoneAt(mx, mz); const w = (E.wt ?? 1) * (Z?.density ?? 1) * Math.min(1, E.len / 6); if (w > 0) this.cands.push([i, w, d]); }
      });
      this.candW = this.cands.reduce((s, c) => s + c[1], 0);
    }
    const want = this.cap - 2;
    if (!this.cands.length || this.count >= want) return;
    this.spawnT -= dt;
    let budget = this.count < want * 0.6 ? 4 : 1;
    if (this.spawnT > 0 && this.count > want * 0.3) return;
    this.spawnT = 0.25;
    const cam = this.game.rig?.camera, init = this.count < want * 0.3;
    for (let tries = 0; budget > 0 && tries < 12; tries++) {
      let x = this.rand() * this.candW, c = this.cands[0];
      for (const cc of this.cands) { x -= cc[1]; if (x <= 0) { c = cc; break; } }
      const E = this.D.edges[c[0]], n = this.D.nodes, t = this.rand();
      const px = n[E.a * 3] + (n[E.b * 3] - n[E.a * 3]) * t, pz = n[E.a * 3 + 2] + (n[E.b * 3 + 2] - n[E.a * 3 + 2]) * t, py = n[E.a * 3 + 1];
      if (!init && c[2] < 22 && cam) { _v.set(px, py + 1, pz).project(cam); if (_v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1) continue; }
      if (this.threats.some((p) => Math.hypot(p.x - px, p.z - pz) < 16)) continue;
      if (this.spawnWalker(c[0], t)) budget--;
    }
  }
  think(a, dt, W, players) {
    a.ph += dt * (a.speed * 2.6 + (a.state === 'still' || a.state === 'huddle' ? 1 : 0));
    a.alpha = Math.min(1, a.alpha + dt * 2.5);
    if (a.fade < 0) { a.alpha = Math.max(0, a.alpha + a.fade * dt); }
    // threats
    a.chk = (a.chk ?? Math.random() * 0.3) - dt;
    if (a.chk <= 0) {
      a.chk = 0.3;
      let near = null, nd = 12;
      for (const p of this.threats) { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < nd) { nd = d; near = p; } }
      if (near) { if (a.state !== 'panic' && a.state !== 'cower' && a.state !== 'gone') this.panic(a, near); else if (a.state === 'panic') { a.fx = a.x - near.x; a.fz = a.z - near.z; const l = Math.hypot(a.fx, a.fz) || 1; a.fx /= l; a.fz /= l; a.calm = 0; } else if (a.state === 'cower') a.calm = 0; }
      else if (a.state === 'panic' || a.state === 'cower') a.calm += 0.3;
      // trapped civilians run for it when a sorcerer reaches them and no curse is near
      if (a.hud && !a.hud.freed && a.state === 'huddle' && !near) for (const p of players) if (Math.hypot(p.pos.x - a.x, p.pos.z - a.z) < 3.6) { this.freeHuddle(a.hud); break; }
    }
    switch (a.state) {
      case 'walk': {
        // step aside for players
        for (const p of players) { const dx = a.x - p.pos.x, dz = a.z - p.pos.z, d = Math.hypot(dx, dz); if (d < 1.1) { a.off += Math.sign((dx * Math.cos(a.yaw) - dz * Math.sin(a.yaw)) || 1) * dt * 2.2; a.off = Math.max(-2.4, Math.min(2.4, a.off)); } }
        if (a.mood === 'trapped' && this.rand() < dt * 0.05) { a.state = 'look'; a.wait = 1.5 + this.rand() * 2; break; }
        const E = this.D.edges[a.edge];
        a.t += a.speed * dt / E.len;
        if (a.t >= 1) {
          const ne = this.nextEdge(a);
          const N = this.D.edges[ne];
          if (N.light && !this.walk.has(N.light)) { a.t = 1; a.state = 'wait'; a.wait = 0; a.next = ne; a.waitOff = (this.rand() - 0.5) * 1.6; break; }
          this.enter(a, ne);
        }
        this.place(a);
        break;
      }
      case 'wait': {
        const N = this.D.edges[a.next];
        a.wait += dt;
        if (this.walk.has(N.light) || a.wait > 40) { this.enter(a, a.next); a.t = 0; this.place(a); a.state = 'walk'; }
        else {
          const dir = Math.atan2(this.D.nodes[(N.a === a.to ? N.b : N.a) * 3] - this.D.nodes[a.to * 3], this.D.nodes[(N.a === a.to ? N.b : N.a) * 3 + 2] - this.D.nodes[a.to * 3 + 2]);
          a.yaw = dir;
        }
        break;
      }
      case 'look': { a.wait -= dt; a.yaw += Math.sin(this.t * 1.7 + a.i) * dt * 1.5; if (a.wait <= 0) a.state = 'walk'; break; }
      case 'panic': {
        a.panicT += dt;
        this.freeMove(a, a.fx, a.fz, a.speed, dt, W);
        if (a.calm > 3 || a.panicT > 12) { a.state = 'gone'; a.fade = -1.2; }
        break;
      }
      case 'cower': { if (a.calm > 2.5) a.state = a.hud ? 'huddle' : 'still'; break; }
      case 'escape': {
        const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
        a.panicT += dt;
        if (d < 2 || a.panicT > 14) { a.state = 'gone'; a.fade = -1.5; break; }
        this.freeMove(a, dx / d, dz / d, a.speed, dt, W);
        break;
      }
      case 'gone': { if (a.fx != null) this.freeMove(a, a.fx, a.fz, a.speed || 3, dt, W); break; }
      default: break;
    }
  }
  enter(a, e) {
    const E = this.D.edges[e];
    a.prev = a.from; a.from = a.to; a.to = E.a === a.from ? E.b : E.a; a.edge = e; a.t = 0;
    if (E.light) a.off = Math.max(-1.6, Math.min(1.6, a.off + (a.waitOff ?? 0)));
    else a.off = Math.max(-(E.w ?? 2) * 0.45, Math.min((E.w ?? 2) * 0.45, a.off));
  }
  freeMove(a, fx, fz, sp, dt, W) {
    for (let k = 0; k < 5; k++) {
      const ang = [0, 0.7, -0.7, 1.4, -1.4][k] + (a.i % 2 ? 0.05 : -0.05);
      const c = Math.cos(ang), s = Math.sin(ang), dx = fx * c - fz * s, dz = fx * s + fz * c;
      const nx = a.x + dx * sp * dt, nz = a.z + dz * sp * dt;
      const gy = W.standY(nx, nz, a.y, 1);
      if (isFinite(gy) && Math.abs(gy - a.y) <= 1.05 && !W.liquidAt(nx, gy + 0.2, nz)) {
        a.x = nx; a.z = nz; a.y += (gy - a.y) * Math.min(1, dt * 10); a.yaw = Math.atan2(dx, dz);
        if (k) { a.fx = dx; a.fz = dz; }
        return true;
      }
    }
    a.fx = -fx + (this.rand() - 0.5); a.fz = -fz + (this.rand() - 0.5); const l = Math.hypot(a.fx, a.fz) || 1; a.fx /= l; a.fz /= l;
    return false;
  }
  // ---------------------------------------------------------------- pose + matrices
  draw(a, dt) {
    const M = this.mesh, i = a.i, s = a.scale * (0.35 + 0.65 * Math.min(1, a.alpha * 1.2));
    let legA = 0, armL = 0, armR = 0, armZ = 0.06, bob = 0, lean = 0, crouch = 0, headX = 0, headY = 0;
    const sw = Math.sin(a.ph);
    switch (a.state) {
      case 'walk': legA = sw * 0.55; armL = sw * 0.42; armR = -sw * 0.42; bob = Math.abs(Math.cos(a.ph)) * 0.05; break;
      case 'panic': case 'escape': case 'gone':
        if (a.fade < 0 && a.state === 'gone' && !a.fx) break;
        legA = sw * 0.95; bob = Math.abs(Math.cos(a.ph)) * 0.1; lean = 0.22;
        if (a.i % 3 === 0) { armL = -2.7 + sw * 0.4; armR = -2.7 - sw * 0.4; armZ = 0.35; } else { armL = sw * 1.0; armR = -sw * 1.0; }
        break;
      case 'cower': crouch = 0.62; armL = armR = -2.6; armZ = 0.5; headX = 0.4; break;
      case 'huddle':
        if (a.pose === 'bang') { armR = -1.7 + Math.max(0, Math.sin(this.t * 7 + a.i)) * 0.5; armL = -1.7 + Math.max(0, Math.sin(this.t * 7 + a.i + 2)) * 0.5; lean = 0.12; }
        else { crouch = 0.62; armL = armR = -0.9; headX = 0.45 + Math.sin(this.t * 2 + a.i) * 0.05; }
        break;
      case 'still': case 'wait': case 'look':
        armL = Math.sin(this.t * 1.3 + a.i) * 0.04; armR = -armL;
        if (a.pose === 'phone' || (a.state === 'wait' && a.i % 4 === 0)) { armR = -1.25; headX = 0.35; }
        else if (a.pose === 'cheer') { const k = Math.max(0, Math.sin(this.t * 3 + a.i)); armR = -2.8 * k; armL = -2.6 * Math.max(0, Math.sin(this.t * 3 + a.i + 1.5)); }
        else if (a.pose === 'chat') { headY = Math.sin(this.t * 0.8 + a.i) * 0.3; armR = Math.max(0, Math.sin(this.t * 2.1 + a.i * 1.7)) * -0.7; }
        bob = Math.sin(this.t * 1.6 + a.i) * 0.01;
        break;
      default: break;
    }
    // root
    _q.setFromAxisAngle(_v.set(0, 1, 0), a.yaw);
    _m.compose(_s.set(a.x, a.y + bob * s - crouch * 0.42 * s, a.z), _q, _v.set(s, s, s));
    // body lean (pitch round the hips)
    _r.makeRotationX(lean); _m.multiply(_p.makeTranslation(0, LEG.y, 0)).multiply(_r).multiply(_p.makeTranslation(0, -LEG.y, 0));
    const body = _m.clone();
    const part = (mesh, slot, jx, jy, jz, rx, rz = 0, ry = 0) => {
      _e.set(rx, ry, rz, 'XYZ'); _q.setFromEuler(_e);
      _p.compose(_s.set(jx, jy, jz), _q, _v.set(1, 1, 1));
      mesh.setMatrixAt(slot, _r.multiplyMatrices(body, _p));
    };
    // legs (crouch: thighs forward)
    const legX = crouch ? -1.35 : 0;
    part(M.leg, i * 2, -LEG.x, LEG.y, 0, legX + legA); part(M.leg, i * 2 + 1, LEG.x, LEG.y, 0, legX - legA);
    part(M.arm, i * 2, -ARM.x, ARM.y, 0, armL, -armZ); part(M.arm, i * 2 + 1, ARM.x, ARM.y, 0, armR, armZ);
    part(M.hand, i * 2, -ARM.x, ARM.y, 0, armL, -armZ); part(M.hand, i * 2 + 1, ARM.x, ARM.y, 0, armR, armZ);
    M.torso.setMatrixAt(i, body);
    M.collar.setMatrixAt(i, a.collar ? body : ZERO_M);
    part(M.head, i, 0, NECK, 0, headX, 0, headY); part(M.eyes, i, 0, NECK, 0, headX, 0, headY);
    if (a.hat !== 'witch' && a.look !== 'ghost') part(M.hair, i, 0, NECK, 0, headX, 0, headY); else M.hair.setMatrixAt(i, ZERO_M);
    for (const k of ['cap', 'witch', 'ears']) if (a.hat === k) part(M[k], i, 0, NECK, 0, headX, 0, headY); else M[k].setMatrixAt(i, ZERO_M);
    M.case.setMatrixAt(i, ZERO_M); M.bag.setMatrixAt(i, ZERO_M); M.backpack.setMatrixAt(i, ZERO_M);
    if (a.acc === 'case') part(M.case, i, ARM.x, ARM.y, 0, armR, armZ);
    else if (a.acc === 'bag' || a.acc === 'backpack') M[a.acc].setMatrixAt(i, body);
  }
}
