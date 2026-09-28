// Power-ups: roulette odds, item use and projectiles/traps on the track.
import * as THREE from 'three';
import { BrickBuilder, C, plastic, brickGeometry } from './lego.js';
import { angleDiff } from './kart.js';

export const ITEMS = {
  boost:  { name: 'Turbo Stud', color: '#ff9a1a' },
  boost3: { name: 'Triple Turbo', color: '#ff6a00' },
  rocket: { name: 'Homing Rocket', color: '#e0301a' },
  cannon: { name: 'Bouncer Brick', color: '#2fa84a' },
  trap:   { name: 'Stray Bricks', color: '#f2cd37' },
  shield: { name: 'Brick Shield', color: '#36aebf' },
  golden: { name: 'Golden Brick', color: '#ffd040' },
  storm:  { name: 'Brick Storm', color: '#9a5aff' },
};

// SVG icons drawn in a LEGO style
export const ICONS = {
  boost: `<svg viewBox="0 0 64 64"><circle cx="32" cy="36" r="20" fill="#f2cd37" stroke="#1b2a34" stroke-width="3"/><ellipse cx="32" cy="30" rx="12" ry="5" fill="#fff6c0"/><path d="M26 8l12 0-4 10 8 0-16 22 4-16-8 0z" fill="#ff7a00" stroke="#1b2a34" stroke-width="2"/></svg>`,
  boost3: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="2.5"><circle cx="18" cy="42" r="12" fill="#f2cd37"/><circle cx="46" cy="42" r="12" fill="#f2cd37"/><circle cx="32" cy="22" r="12" fill="#f2cd37"/></g><path d="M29 12h7l-3 7h5l-10 12 3-9h-5z" fill="#ff7a00"/><path d="M15 32h7l-3 7h5l-10 12 3-9h-5z" fill="#ff7a00"/><path d="M43 32h7l-3 7h5l-10 12 3-9h-5z" fill="#ff7a00"/></svg>`,
  rocket: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"><path d="M32 4c10 8 12 20 10 34H22C20 24 22 12 32 4z" fill="#c91a09"/><path d="M22 30l-10 14 10-2zM42 30l10 14-10-2z" fill="#f4f4f4"/><rect x="24" y="38" width="16" height="8" fill="#6c6e68"/></g><circle cx="32" cy="20" r="5" fill="#9ad8ff" stroke="#1b2a34" stroke-width="2"/><path d="M26 48l6 12 6-12z" fill="#ff9a1a"/></svg>`,
  cannon: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3"><ellipse cx="32" cy="42" rx="22" ry="10" fill="#1a6a32"/><rect x="10" y="26" width="44" height="16" fill="#237841"/><ellipse cx="32" cy="26" rx="22" ry="10" fill="#4fbf6a"/><ellipse cx="32" cy="22" rx="10" ry="5" fill="#8ae09a"/></g></svg>`,
  trap: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="2.5"><rect x="8" y="34" width="24" height="14" fill="#c91a09" transform="rotate(-12 20 41)"/><rect x="30" y="30" width="26" height="14" fill="#f2cd37" transform="rotate(14 43 37)"/><rect x="20" y="14" width="18" height="14" fill="#0055bf" transform="rotate(8 29 21)"/></g><g fill="#fff" opacity=".6"><rect x="12" y="32" width="5" height="3"/><rect x="34" y="28" width="5" height="3"/><rect x="24" y="12" width="5" height="3"/></g></svg>`,
  shield: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#9ad8ff" fill-opacity=".55" stroke="#36aebf" stroke-width="4"/><path d="M32 14l14 6v10c0 10-6 16-14 20-8-4-14-10-14-20V20z" fill="#0055bf" stroke="#1b2a34" stroke-width="2.5"/><circle cx="32" cy="30" r="5" fill="#f2cd37"/></svg>`,
  golden: `<svg viewBox="0 0 64 64"><g stroke="#7a5a00" stroke-width="3"><rect x="10" y="26" width="44" height="26" rx="2" fill="#ffd040"/><rect x="16" y="16" width="12" height="10" fill="#ffe680"/><rect x="36" y="16" width="12" height="10" fill="#ffe680"/></g><path d="M16 32h32" stroke="#fff6c0" stroke-width="4"/><path d="M8 10l4 4M56 10l-4 4M32 4v6" stroke="#fff6a0" stroke-width="3"/></svg>`,
  storm: `<svg viewBox="0 0 64 64"><path d="M14 30c-8 0-8-12 0-12 2-10 16-12 20-4 6-6 18-2 16 8 8 2 6 12-2 12H14z" fill="#6a5a9a" stroke="#1b2a34" stroke-width="3"/><g stroke="#1b2a34" stroke-width="2"><rect x="14" y="40" width="10" height="7" fill="#c91a09" transform="rotate(20 19 43)"/><rect x="30" y="46" width="10" height="7" fill="#f2cd37" transform="rotate(-15 35 49)"/><rect x="44" y="40" width="10" height="7" fill="#0055bf" transform="rotate(30 49 43)"/></g></svg>`,
};

const TABLES = [
  // [upTo rank fraction, weights]
  [0.01, { trap: 30, cannon: 30, boost: 15, shield: 25 }],
  [0.35, { trap: 18, cannon: 26, rocket: 16, boost: 18, shield: 22 }],
  [0.65, { cannon: 16, rocket: 26, boost: 18, boost3: 16, trap: 8, shield: 14, golden: 2 }],
  [0.9, { rocket: 26, boost3: 28, golden: 14, cannon: 8, boost: 12, storm: 6, shield: 6 }],
  [1.01, { boost3: 30, golden: 28, rocket: 22, storm: 14, boost: 6 }],
];
export function rollItem(rankFrac, rand = Math.random) {
  const t = TABLES.find(([u]) => rankFrac <= u)[1];
  let sum = 0;
  for (const w of Object.values(t)) sum += w;
  let r = rand() * sum;
  for (const [k, w] of Object.entries(t)) { r -= w; if (r <= 0) return k; }
  return 'boost';
}

// ---- meshes -----------------------------------------------------------------------
function rocketMesh() {
  const b = new BrickBuilder(0.5);
  b.cyl(0, 0, 0, 0.45, 1.8, C.red, { seg: 12 });
  b.cone(0, 1.8, 0, 0.45, 0.8, C.white, { seg: 12 });
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; b.box(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, 0.1, 0.7, 0.5, C.white, { rot: -a }); }
  b.cyl(0, -0.3, 0, 0.3, 0.3, 0xffa020, { seg: 10, matOpts: { emissive: 0xff6a00, emissiveIntensity: 3 } });
  const g = b.build();
  g.children.forEach((c) => c.geometry.rotateX(Math.PI / 2));
  const holder = new THREE.Group();
  holder.add(g);
  return holder;
}
function cannonMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.1, 20), plastic(0x237841));
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16).translate(0, 0.7, 0), plastic(0x4fbf6a));
  body.castShadow = true;
  const inner = new THREE.Group();
  inner.add(body, stud);
  g.add(inner);
  g.userData.inner = inner;
  return g;
}
const trapGeos = [brickGeometry(2, 1, 3, 0.55, true, 8), brickGeometry(1, 1, 3, 0.55, true, 8), brickGeometry(2, 2, 1, 0.55, true, 8)];
function trapMesh() {
  const g = new THREE.Group();
  const cols = [C.red, C.yellow, C.blue, C.green, C.white, C.orange];
  for (let k = 0; k < 6; k++) {
    const m = new THREE.Mesh(trapGeos[k % 3], plastic(cols[Math.floor(Math.random() * cols.length)]));
    m.position.set((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6);
    m.rotation.set(Math.random() < 0.3 ? Math.PI / 2 : 0, Math.random() * 6, Math.random() < 0.3 ? 0.4 : 0);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}
function stormMesh() {
  const g = new THREE.Group();
  const cloud = new BrickBuilder(0.8);
  for (let k = 0; k < 5; k++) cloud.brick((k - 2) * 1.4, (k % 2) * 0.6, (Math.random() - 0.5), 3, 2, 3, 0x4a4a6a, {});
  g.add(cloud.build({ shadows: false }));
  return g;
}

export class Items {
  constructor(race) {
    this.race = race;
    this.track = race.track;
    this.scene = race.scene;
    this.proj = [];   // rockets & cannons
    this.traps = [];
    this.storms = [];
    this.tmp = new THREE.Vector3();
    this.loc = {};
  }

  use(k) {
    const it = k.item;
    if (!it) return;
    const back = k.ctl.back;
    const au = this.race.audio;
    switch (it) {
      case 'boost': k.boost(1.2); break;
      case 'boost3': k.boost(1.2); break;
      case 'rocket': this.fireRocket(k); au.sfx('rocket', k.pos); break;
      case 'cannon': this.fireCannon(k, back); au.sfx('cannon', k.pos); break;
      case 'trap': this.dropTrap(k, !back && !!k.ctl.aimFwd); au.sfx('trap', k.pos); break;
      case 'shield': k.shieldTime = 12; au.sfx('shield', k.pos); break;
      case 'golden': k.goldenTime = 7.5; k.boost(0.6); au.sfx('golden', k.pos); break;
      case 'storm': this.brickStorm(k); break;
    }
    if (it === 'boost3') {
      k.itemCount--;
      if (k.itemCount <= 0) k.item = null;
    } else k.item = null;
    this.race.onItemUsed?.(k, it);
  }

  fireRocket(k) {
    const mesh = rocketMesh();
    this.scene.add(mesh);
    // target: the kart one place ahead (or leader when in first: none)
    const order = this.race.order;
    const my = order.indexOf(k);
    const target = my > 0 ? order[my - 1] : null;
    const p = k.pos.clone().add(k.forward().multiplyScalar(3)).setY(k.pos.y + 1);
    this.proj.push({ type: 'rocket', mesh, pos: p, yaw: k.yaw, owner: k, target, life: 14, si: k.loc.i, speed: Math.max(58, k.speed + 20), safe: 0.4 });
  }
  fireCannon(k, back) {
    const mesh = cannonMesh();
    this.scene.add(mesh);
    const yaw = back ? k.yaw + Math.PI : k.yaw;
    const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const p = k.pos.clone().addScaledVector(f, 3.2).setY(k.pos.y + 0.9);
    this.proj.push({ type: 'cannon', mesh, pos: p, yaw, owner: k, life: 9, si: k.loc.i, speed: back ? 40 : Math.max(52, k.speed + 18), safe: 0.35, bounces: 0, vy: 0 });
  }
  dropTrap(k, forward) {
    const mesh = trapMesh();
    this.scene.add(mesh);
    const f = k.forward();
    const t = { mesh, pos: k.pos.clone().addScaledVector(f, forward ? 3 : -3.2), vel: null, si: k.loc.i, owner: k, safe: 0.5, air: false };
    if (forward) { t.vel = f.clone().multiplyScalar(k.speed + 22).setY(12); t.air = true; t.pos.y += 1; }
    mesh.position.copy(t.pos);
    this.traps.push(t);
    if (this.traps.length > 40) this.removeTrap(this.traps[0]);
  }
  removeTrap(t) {
    this.scene.remove(t.mesh);
    this.traps.splice(this.traps.indexOf(t), 1);
  }
  brickStorm(k) {
    this.race.audio.sfx('storm');
    this.race.flash(0xb0a0ff);
    for (const o of this.race.karts) {
      if (o === k || o.finished) continue;
      if (o.rank > k.rank && Math.random() < 0.5) continue; // mostly hits karts ahead
      const cloud = stormMesh();
      this.scene.add(cloud);
      this.storms.push({ kart: o, cloud, t: 0, hit: false, by: k });
    }
  }

  update(dt) {
    const tr = this.track;
    const karts = this.race.karts;
    // projectiles
    for (let n = this.proj.length - 1; n >= 0; n--) {
      const p = this.proj[n];
      p.life -= dt; p.safe -= dt;
      let dead = p.life <= 0;
      const loc = tr.locate(p.pos.x, p.pos.y, p.pos.z, p.si, this.loc);
      p.si = loc.i;
      if (p.type === 'rocket') {
        let aimYaw;
        const tgt = p.target && !p.target.finished ? p.target : null;
        if (tgt && tgt.pos.distanceTo(p.pos) < 32) {
          aimYaw = Math.atan2(tgt.pos.x - p.pos.x, tgt.pos.z - p.pos.z);
          p.yaw += Math.max(-8 * dt, Math.min(8 * dt, angleDiff(p.yaw, aimYaw)));
        } else {
          const ahead = tr.wrap(loc.i + 10);
          const tp = tr.at(ahead, 0, 0, this.tmp);
          aimYaw = Math.atan2(tp.x - p.pos.x, tp.z - p.pos.z);
          p.yaw += Math.max(-5 * dt, Math.min(5 * dt, angleDiff(p.yaw, aimYaw)));
        }
        p.pos.x += Math.sin(p.yaw) * p.speed * dt;
        p.pos.z += Math.cos(p.yaw) * p.speed * dt;
        p.pos.y += ((loc.y + 1.0) - p.pos.y) * Math.min(1, dt * 8);
        if (Math.random() < 0.35) this.race.fx.puff(p.pos.x, p.pos.y, p.pos.z, 0, 1, 0, 0xdddddd, 0.5);
        this.race.fx.spark(p.pos.x, p.pos.y, p.pos.z, (Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2, 0xff8a20, 0.2);
        p.mesh.rotation.set(0, p.yaw, 0);
      } else {
        // cannon: straight, bounce off walls, follow ground, fall off void edges
        const nx = p.pos.x + Math.sin(p.yaw) * p.speed * dt;
        const nz = p.pos.z + Math.cos(p.yaw) * p.speed * dt;
        tr.locate(nx, p.pos.y, nz, p.si, this.loc);
        const L = this.loc;
        const abs = Math.abs(L.lat);
        if (L.edge === 0 && !L.gap && abs > L.hw + L.sh - 0.9) {
          const ty = Math.atan2(L.tx, L.tz);
          const rel = angleDiff(ty, p.yaw);
          p.yaw = ty - rel;
          p.bounces++;
          this.race.audio.sfx('bounce', p.pos);
        } else { p.pos.x = nx; p.pos.z = nz; }
        const ground = (!L.gap && (abs <= L.hw + 0.3 || (L.edge !== 1 && abs <= L.hw + L.sh))) ? L.y + 0.85 : -Infinity;
        if (p.pos.y > ground + 0.05) { p.vy -= 40 * dt; p.pos.y += p.vy * dt; if (p.pos.y < ground) { p.pos.y = ground; p.vy = 0; } }
        else { p.pos.y = ground; p.vy = 0; }
        if (p.pos.y < loc.y - 12) dead = true;
        p.mesh.rotation.y = p.yaw;
        p.mesh.userData.inner.rotation.y += dt * 10;
        if (p.bounces > 6) dead = true;
      }
      p.mesh.position.copy(p.pos);
      // hits
      if (!dead) {
        for (const k of karts) {
          if (k === p.owner && p.safe > 0) continue;
          if (k.respawn > 0) continue;
          if (k.pos.distanceToSquared(p.pos) < 2.4 * 2.4 && Math.abs(k.pos.y + 0.8 - p.pos.y) < 2.5) {
            if (k.hit('wreck', p.owner)) this.race.onProjectileHit?.(p.owner, k, p.type);
            this.race.fx.explosion(p.pos);
            dead = true; break;
          }
        }
      }
      if (!dead) {
        for (const t of this.traps) if (t.pos.distanceToSquared(p.pos) < 2.2 * 2.2) {
          this.race.fx.debris(t.pos, [C.red, C.yellow, C.blue], 6); this.removeTrap(t); dead = true;
          this.race.fx.explosion(p.pos); this.race.audio.sfx('crash', p.pos);
          break;
        }
      }
      if (!dead) for (const q of this.proj) if (q !== p && q.pos.distanceToSquared(p.pos) < 2 * 2) { q.life = 0; dead = true; this.race.fx.explosion(p.pos); break; }
      if (dead) { this.scene.remove(p.mesh); this.proj.splice(n, 1); }
    }
    // traps
    for (let n = this.traps.length - 1; n >= 0; n--) {
      const t = this.traps[n];
      t.safe -= dt;
      if (t.air) {
        t.vel.y -= 40 * dt;
        t.pos.addScaledVector(t.vel, dt);
        const L = tr.locate(t.pos.x, t.pos.y, t.pos.z, t.si, this.loc);
        t.si = L.i;
        if (!L.gap && Math.abs(L.lat) < L.hw + L.sh && t.pos.y <= L.y) { t.pos.y = L.y; t.air = false; }
        if (t.pos.y < L.y - 15) { this.removeTrap(t); continue; }
        t.mesh.position.copy(t.pos);
      }
      for (const k of karts) {
        if (k === t.owner && t.safe > 0) continue;
        if (k.respawn > 0 || !k.grounded && k.pos.y > t.pos.y + 1.5) continue;
        if (k.pos.distanceToSquared(t.pos) < 1.9 * 1.9) {
          if (k.hit('spin', t.owner)) this.race.onProjectileHit?.(t.owner, k, 'trap');
          this.race.fx.debris(t.pos, [C.red, C.yellow, C.blue, C.green], 6, 0.7);
          this.removeTrap(t);
          break;
        }
      }
    }
    // brick storms: a cloud gathers over each victim then rains bricks on them
    for (let n = this.storms.length - 1; n >= 0; n--) {
      const s = this.storms[n];
      s.t += dt;
      const k = s.kart;
      s.cloud.position.set(k.pos.x, k.pos.y + 7 - Math.min(1, s.t) * 1.5, k.pos.z);
      s.cloud.rotation.y += dt;
      if (s.t > 0.8 && s.t < 1.4) {
        this.race.fx.debrisOne(s.cloud.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, -1, (Math.random() - 0.5) * 3)), [C.red, C.yellow, C.blue, C.green][Math.floor(Math.random() * 4)], new THREE.Vector3(0, -12, 0), 1.2);
      }
      if (s.t > 1.1 && !s.hit) { s.hit = true; k.hit('wreck', s.by); }
      if (s.t > 1.8) { this.scene.remove(s.cloud); this.storms.splice(n, 1); }
    }
  }

  // AI helper: is there a trap/projectile near a point ahead?
  dangerNear(pos, r = 6) {
    for (const t of this.traps) if (t.pos.distanceToSquared(pos) < r * r) return t.pos;
    return null;
  }

  dispose() {
    for (const p of this.proj) this.scene.remove(p.mesh);
    for (const t of this.traps) this.scene.remove(t.mesh);
    for (const s of this.storms) this.scene.remove(s.cloud);
  }
}
