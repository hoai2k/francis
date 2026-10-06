// Culling Games Colony (Jujutsu Kaisen Season 3): race out of the barrier-sealed
// Tokyo colony under Kogane's scoreboards, hit the JACKPOT straight past Hakari's
// pachinko parlour, dodge the gavel in Higuruma's courtroom domain and Kashimo's
// lightning on the broken expressway, glide off a ruined skyscraper over the flooded
// crater under Uro's flipped sky, survive Ryu's Granite Blast and Kurourushi's
// cockroach swarm in the Sendai colony and finish through ash-grey Sakurajima.
import { THREE, BrickBuilder, C, plastic, groundPlane, rock, liquid, disc, strokeTrack, inRange, each, edges, arch, mat4, canvasTexture, brickGeometry, crossing, cycleRandom } from './kit.js';
import * as P from './jjk-props.js';
import * as Q from './jjk-culling-props.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const fxOf = (ctx) => ctx.world.race?.fx;
const rbox = P.rbox;

// ---- hazards --------------------------------------------------------------------------------

// Hakari's pachinko balls: giant steel balls hop across the road; their shadow grows as they drop.
function pachinkoBall(ctx, { k, period = 3.6, offset = 0, r = 1.9 }) {
  const tr = ctx.track, i = tr.kToIndex(k), w = tr.HW[i] + 1;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), plastic(0xd8dce4, { metal: 0.9, rough: 0.12 }));
  ball.castShadow = true;
  const shMat = new THREE.MeshBasicMaterial({ color: 0x200008, transparent: true, opacity: 0.4, depthWrite: false });
  const sh = new THREE.Mesh(new THREE.CircleGeometry(r * 1.3, 20).rotateX(-Math.PI / 2), shMat);
  ctx.group.add(ball, sh);
  const pos = new THREE.Vector3(), A = tr.at(i, -w, 0), B = tr.at(i, w, 0);
  let low = false, bounced = false;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period, dir = Math.floor((t + offset) / period) % 2;
      const f = dir ? 1 - ph : ph, hop = (ph * 3) % 1, hgt = Math.sin(hop * Math.PI) * 9;
      pos.lerpVectors(A, B, f);
      sh.position.set(pos.x, pos.y + 0.12, pos.z);
      sh.scale.setScalar(0.5 + 0.5 * (1 - hgt / 9)); shMat.opacity = 0.2 + 0.4 * (1 - hgt / 9);
      ball.position.set(pos.x, pos.y + r + hgt, pos.z); ball.rotation.z -= dt * 4;
      low = hgt < 2.2;
      if (hgt < 0.6 && !bounced) { bounced = true; ctx.world.race?.audio.sfx('wall', pos); const fx = fxOf(ctx); if (fx) fx.pop(V1.set(pos.x, pos.y + 0.5, pos.z), 0xffe040); }
      if (hgt > 2) bounced = false;
    },
    test(p) { return low && Math.hypot(p.x - pos.x, p.z - pos.z) < r + 1.2 && Math.abs(p.y - pos.y) < 4 ? 'bump' : null; },
    near(p, rr) { return Math.hypot(p.x - pos.x, p.z - pos.z) < r + rr; },
  };
}

// Higuruma's gavel: a giant gavel hinged beside the road rears up, shakes, and slams onto a red mark.
function gavelSlam(ctx, { S, T, period = 4.2, offset = 0 }) {
  const hx = T.x - S.x, hz = T.z - S.z, dh = Math.hypot(hx, hz), dy = S.y - T.y - 2.1;
  const len = Math.hypot(dh, dy) - 0.4, aDown = Math.atan2(dh, dy), aUp = Math.PI - 0.25;
  const pivot = new THREE.Group(); pivot.position.copy(S); pivot.rotation.y = Math.atan2(-hz, hx);
  const inner = new THREE.Group(); pivot.add(inner); inner.add(Q.gavel(len));
  ctx.group.add(pivot);
  const ax = hx / dh, az = hz / dh;
  const markMat = new THREE.MeshBasicMaterial({ color: 0xff1030, transparent: true, opacity: 0.2, depthWrite: false });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(10, 5.2).rotateX(-Math.PI / 2), markMat);
  mark.position.copy(T); mark.position.y += 0.1; mark.rotation.y = Math.atan2(ax, az) + Math.PI / 2; ctx.group.add(mark);
  let a = aUp, down = false;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.45 raised, .45-.62 wobble, .62-.67 slam, .67-.82 down, .82-1 lift
      if (ph < 0.45) a = aUp;
      else if (ph < 0.62) a = aUp + 0.12 + Math.sin(t * 50) * 0.04;
      else if (ph < 0.67) a = aUp + 0.12 + (aDown - aUp - 0.12) * ((ph - 0.62) / 0.05);
      else if (ph < 0.82) a = aDown;
      else a = aDown + (aUp - aDown) * ((ph - 0.82) / 0.18);
      inner.rotation.z = a;
      const isDown = Math.abs(a - aDown) < 0.02;
      if (isDown && !down) { down = true; const fx = fxOf(ctx); if (fx) { fx.dust({ pos: T, yaw: 0 }, 0xe8d0a0, 16); fx.pop(T, 0xffd040); } ctx.world.race?.audio.sfx('wall', T); }
      if (!isDown) down = false;
      markMat.opacity = ph > 0.4 && ph < 0.82 ? 0.3 + 0.4 * Math.abs(Math.sin(t * 12)) : 0.14;
    },
    test(p) {
      if (!down) return null;
      const dx = p.x - T.x, dz = p.z - T.z, al = dx * ax + dz * az, ac = Math.abs(dx * az - dz * ax);
      return Math.abs(al) < 5.2 && ac < 2.8 && p.y < T.y + 4.5 ? 'wreck' : null;
    },
    near(p, r) { return Math.hypot(p.x - T.x, p.z - T.z) < 5.2 + r && (down || markMat.opacity > 0.25); },
  };
}

// Kashimo's lightning: a crackling blue ring marks the spot, then a bolt cracks down from the storm.
function lightning(ctx, { targets, period = 2.6, offset = 0 }) {
  const tr = ctx.track;
  const bb = new BrickBuilder(1), boltMat = P.neon(0xbfefff, 3.2);
  let x = 0, z = 0;
  for (let y = 70; y > 0; y -= 7) {
    const ny = y - 7, nx = ny > 0 ? (Math.random() - 0.5) * 7 : 0, nz = ny > 0 ? (Math.random() - 0.5) * 7 : 0;
    const dx = nx - x, dy = ny - y, dz = nz - z, L = Math.hypot(dx, dy, dz);
    bb.boxM(mat4((x + nx) / 2, (y + ny) / 2, (z + nz) / 2, -Math.asin(dy / L), Math.atan2(dx, dz), 0, 0.8, 0.8, L), 0, { mat: boltMat });
    if (y < 50 && y > 20 && Math.random() < 0.6) { const a = Math.random() * 6.28; bb.boxM(mat4(x + Math.cos(a) * 2.5, y - 2, z + Math.sin(a) * 2.5, 0.8, -a, 0, 0.4, 0.4, 6), 0, { mat: boltMat }); }
    x = nx; z = nz;
  }
  const bolt = new THREE.Group(); bolt.add(bb.build({ name: 'bolt', shadows: false })); bolt.add(P.glow(0x8ad8ff, 22, 1));
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x5ad0ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x2a8aff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
  const marker = new THREE.Group();
  marker.add(new THREE.Mesh(new THREE.RingGeometry(3.6, 4.4, 28).rotateX(-Math.PI / 2), ringMat));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(3.6, 28).rotateX(-Math.PI / 2), fillMat); marker.add(fill);
  ctx.group.add(bolt, marker); bolt.visible = marker.visible = false;
  const target = new THREE.Vector3();
  let state = 0, cur = -1, struck = -1;
  const TEL = 1.3, HIT = 0.3, rnd = cycleRandom();
  return {
    // cycle n of the hazard clock: wait, mark the spot (hashed from n), strike: the same on every
    // online screen
    update(dt, t) {
      const x = t + offset, n = Math.floor(x / period), u = x - n * period, s0 = period - TEL - HIT;
      if (u <= s0) { if (state !== 0) bolt.visible = marker.visible = false; state = 0; return; }
      if (cur !== n) {
        cur = n;
        const [k, latF] = targets[Math.floor(rnd(n, 0) * targets.length)];
        const i = tr.wrap(tr.kToIndex(k) + Math.floor((rnd(n, 1) - 0.5) * 14));
        tr.at(i, (latF + (rnd(n, 2) - 0.5) * 0.4) * tr.HW[i], 0.12, target);
        marker.position.copy(target); marker.visible = true;
      }
      if (u < period - HIT) {
        state = 1; marker.visible = true; bolt.visible = false;
        const f = (u - s0) / TEL;
        fill.scale.setScalar(Math.max(0.01, Math.min(1, f))); ringMat.opacity = 0.4 + 0.5 * Math.abs(Math.sin(t * 14));
        const fx = fxOf(ctx); if (fx && Math.random() < 0.4) { const a = Math.random() * 6.28; fx.spark(target.x + Math.cos(a) * 4, target.y + 0.3, target.z + Math.sin(a) * 4, 0, 3 + Math.random() * 3, 0, 0x8ad8ff, 0.4, 0); }
        return;
      }
      state = 2;
      if (struck !== n) {
        struck = n; bolt.visible = true; bolt.position.copy(target); bolt.rotation.y = Math.random() * 6.28;
        const fx2 = fxOf(ctx); if (fx2) { for (let j = 0; j < 22; j++) { const a = Math.random() * 6.28; fx2.spark(target.x, target.y + 0.5, target.z, Math.cos(a) * 12, 4 + Math.random() * 10, Math.sin(a) * 12, j % 2 ? 0xbfefff : 0x3a9aff, 0.5, 14); } }
        ctx.world.race?.audio.sfx('cannon', target);
      }
      bolt.scale.x = bolt.scale.z = 0.7 + Math.random() * 0.6;
    },
    test(p) { return state === 2 && Math.hypot(p.x - target.x, p.z - target.z) < 4.3 && p.y < target.y + 5 ? 'spin' : null; },
    near(p, r) { return state > 0 && Math.hypot(p.x - target.x, p.z - target.z) < 4.4 + r; },
  };
}

// Ryu's Granite Blast: cursed energy gathers at his fists while a band glows across the road, then a huge beam fires.
function graniteBlast(ctx, { from, to, period = 6.5, offset = 0, radius = 3.2 }) {
  const dir = V1.subVectors(to, from).clone(); const L = dir.length(); dir.normalize();
  const g = new THREE.Group(); ctx.group.add(g);
  const orb = new THREE.Group(); orb.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff4c0 }))); orb.add(P.glow(0xffd060, 14, 1));
  orb.position.copy(from); g.add(orb);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 18, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), beamMat);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, 1, 12).rotateX(Math.PI / 2).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  for (const m of [beam, core]) { m.position.copy(from); m.lookAt(to); m.scale.z = L; g.add(m); }
  const bandMat = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.2, L).rotateX(-Math.PI / 2), bandMat);
  band.position.set((from.x + to.x) / 2, (ctx.track.roadHeightNear((from.x + to.x) / 2, (from.z + to.z) / 2) ?? 0) + 0.15, (from.z + to.z) / 2); band.rotation.y = Math.atan2(dir.x, dir.z);
  g.add(band);
  let state = 0, fired = false;
  const CH = 2.4, FIRE = 0.9;
  return {
    update(dt, t) {
      const ph = (t + offset) % period;
      beam.visible = core.visible = false;
      if (ph < CH) {
        state = ph > CH - 1.6 ? 1 : 0; fired = false;
        orb.visible = true; orb.scale.setScalar(0.3 + (ph / CH) * 1.2 + Math.sin(t * 30) * 0.05);
        bandMat.opacity = state ? 0.15 + 0.4 * Math.abs(Math.sin(t * 9)) : 0.04;
        return;
      }
      if (ph < CH + FIRE) {
        state = 2; orb.visible = true; beam.visible = core.visible = true;
        const f = (ph - CH) / FIRE, w = Math.sin(Math.min(1, f * 3) * Math.PI / 2) * (1 - Math.max(0, f - 0.8) * 4);
        beam.scale.x = beam.scale.y = core.scale.x = core.scale.y = Math.max(0.05, w);
        beamMat.opacity = 0.6 + Math.random() * 0.3; bandMat.opacity = 0.7;
        if (!fired) { fired = true; ctx.world.race?.audio.sfx('cannon', from); }
        const fx = fxOf(ctx); if (fx) { const s = Math.random(); fx.spark(from.x + dir.x * L * s, from.y + dir.y * L * s, from.z + dir.z * L * s, (Math.random() - 0.5) * 8, Math.random() * 8, (Math.random() - 0.5) * 8, 0xffd040, 0.6); }
        return;
      }
      state = 0; orb.visible = false; bandMat.opacity = Math.max(0.04, bandMat.opacity - dt * 2);
    },
    test(p) {
      if (state !== 2) return null;
      const dx = p.x - from.x, dz = p.z - from.z, a = dx * dir.x + dz * dir.z, n = Math.abs(dx * dir.z - dz * dir.x);
      return a > 0 && a < L && n < radius + 0.8 ? 'wreck' : null;
    },
    near(p, r) {
      if (!state) return false;
      const dx = p.x - from.x, dz = p.z - from.z, a = dx * dir.x + dz * dir.z, n = Math.abs(dx * dir.z - dz * dir.x);
      return a > -r && a < L + r && n < radius + r;
    },
  };
}

// ---- textures ------------------------------------------------------------------------------------
// Kogane scoreboard atlas: 4 x 4 cells of 256 x 128
const BOARDS = [
  ['CULLING GAMES', 'TOKYO No.1', '#f2c230'], ['YUJI ITADORI', '0 PTS', '#ff8a9a'], ['MEGUMI', '5 PTS', '#8ab0ff'], ['HAKARI', 'JACKPOT!', '#7aff9a'],
  ['HIGURUMA', '100 PTS', '#ffd070'], ['KASHIMO', '0 PTS', '#6ad8ff'], ['YUTA OKKOTSU', '130 PTS', '#e8e8ff'], ['RYU ISHIGORI', '150 PTS', '#ffb050'],
  ['URO', '120 PTS', '#a8c8ff'], ['MAKI ZEN\'IN', '-', '#c8ffb0'], ['RULE 8', 'ADD A RULE', '#ff6a6a'], ['NEW RULE', '100 PTS', '#f2c230'],
  ['SENDAI', 'COLONY', '#9ad8ff'], ['SAKURAJIMA', 'COLONY', '#ffb0c8'], ['GUILTY', 'CONFISCATION', '#ff4040'], ['GLIDE!', 'NEXT COLONY', '#6ad8ff'],
];
let boardMat = null;
function boardMaterial() {
  if (boardMat) return boardMat;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  BOARDS.forEach(([a, b, col], k) => {
    const x = (k % 4) * 256, y = Math.floor(k / 4) * 128;
    g.fillStyle = '#0c0a14'; g.fillRect(x, y, 256, 128);
    g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(x + 6, y + 6, 244, 116);
    g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 12; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [txt, yy, fs0] of [[a, 44, 40], [b, 92, 46]]) { let fs = fs0; g.font = `900 ${fs}px Arial Black, Arial`; while (g.measureText(txt).width > 220 && fs > 14) { fs -= 3; g.font = `900 ${fs}px Arial Black, Arial`; } g.fillText(txt, x + 128, y + yy); }
    g.shadowBlur = 0;
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  boardMat = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide });
  return boardMat;
}
const boardGeos = new Map();
function boardGeo(k) {
  let g = boardGeos.get(k);
  if (!g) {
    g = new THREE.PlaneGeometry(2, 1);
    const u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 4, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) / 4, v0 + uv.getY(i) / 4);
    boardGeos.set(k, g);
  }
  return g;
}
// a floating holographic score board with Kogane perched on top
function scoreboard(ctx, k, x, y, z, w, rot, withKogane = true) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const m = new THREE.Mesh(boardGeo(k), boardMaterial()); m.scale.setScalar(w / 2); g.add(m);
  const fr = new BrickBuilder(1); fr.box(0, -w * 0.27, -0.2, w + 0.6, 0.4, 0.3, 0xf2c230, { matOpts: { emissive: 0xc89a10, emissiveIntensity: 0.8 } }); fr.box(0, w * 0.25, -0.2, w + 0.6, 0.4, 0.3, 0xf2c230, { matOpts: { emissive: 0xc89a10, emissiveIntensity: 0.8 } });
  g.add(fr.build({ name: 'board-frame', shadows: false }));
  let kg = null;
  if (withKogane) { kg = Q.kogane(w * 0.09); kg.position.set(w * 0.3, w * 0.27, 0); g.add(kg); }
  ctx.group.add(g);
  const ph = Math.random() * 6;
  ctx.anim((dt, t) => { g.position.y = y + Math.sin(t * 1.3 + ph) * 0.6; if (kg) { kg.position.y = w * 0.27 + Math.abs(Math.sin(t * 3 + ph)) * w * 0.05; kg.rotation.y = Math.sin(t * 0.8 + ph) * 0.5; } });
  return g;
}

// ---- ruins ---------------------------------------------------------------------------------------
const RUIN = [0x5a5a60, 0x6c6e68, 0x4a4c52, 0x7a7266, 0x3e4048, 0x8a8478, 0x5a5048];
// a ruined tower block: storeys with dark window bands and a broken, jagged top
function ruin(b, x, z, w, d, floors, col, rand, y0 = 0, flat = false) {
  let y = y0;
  const win = 0x1a1c22;
  for (let f = 0; f < floors; f++) {
    b.box(x, y, z, w, 3.2, d, col);
    b.box(x, y + 1, z, w + 0.2, 1.4, d + 0.2, win);
    y += 3.4;
  }
  if (flat) return y;
  for (let n = 0; n < 4; n++) {   // jagged broken top
    const cw = w * (0.3 + rand() * 0.4), cd = d * (0.3 + rand() * 0.4), h = 2 + rand() * 6;
    b.box(x + (rand() - 0.5) * (w - cw), y, z + (rand() - 0.5) * (d - cd), cw, h, cd, col);
  }
  for (let n = 0; n < 3; n++) b.cyl(x + (rand() - 0.5) * w * 0.8, y, z + (rand() - 0.5) * d * 0.8, 0.12, 2 + rand() * 4, 0x3a2a24, { seg: 4 });
  return y;
}
function rubble(b, x, z, s, rand, y = 0) {
  for (let n = 0; n < 5; n++) rbox(b, x + (rand() - 0.5) * 4 * s, y + 0.4 * s, z + (rand() - 0.5) * 4 * s, (1 + rand() * 2) * s, (0.6 + rand()) * s, (1 + rand() * 2) * s, rand() * 0.6, rand() * 3, rand() * 0.6, RUIN[Math.floor(rand() * RUIN.length)]);
}
function wreckCar(b, x, z, rot, col, flip = false) {
  const y = flip ? 2.2 : 0;
  rbox(b, x, y + 0.9, z, 2.4, 1.2, 4.6, flip ? Math.PI : 0, rot, flip ? 0 : 0.12, col);
  rbox(b, x, y + (flip ? -0.2 : 1.9), z, 2.1, 0.9, 2.4, flip ? Math.PI : 0, rot, flip ? 0 : 0.12, 0x2a3040);
}

export default {
  id: 'jjk-culling', name: 'Culling Games Colony', subtitle: 'Season 3 · Kogane, a JACKPOT, a courtroom domain and a glide between colonies', cup: 'jjk', seed: 303,
  width: 28, shoulder: 6, edge: 'fence', start: 0.5,
  points: [[-200, -300, 0], [-80, -312, 0], [40, -310, 0], [150, -295, 0], [240, -260, 0], [295, -190, 0], [312, -100, 0], [305, -10, 0], [270, 60, 0], [200, 85, 0], [130, 70, 0], [75, 110, 0], [90, 185, 3], [150, 240, 8], [230, 275, 14], [215, 345, 20], [120, 372, 26], [20, 365, 30], [-80, 350, 24], [-185, 335, 14], [-265, 280, 9], [-310, 180, 4], [-300, 75, 0], [-265, -20, 0], [-295, -120, 0], [-290, -220, 0], [-255, -285, 0]],
  sections: [
    { from: 4.6, to: 7.3, surface: 'jackpot', edge: 'wall', shoulder: 2, width: 30 },
    { from: 8.5, to: 10.7, surface: 'court', edge: 'wall', shoulder: 2 },
    { from: 12.3, to: 17.3, surface: 'express', edge: 'wall', shoulder: 1.5, width: 26, support: 'pillar' },
    { from: 17.35, to: 18.95, gap: true },
    { from: 18.95, to: 19.6, edge: 'wall', shoulder: 3, support: 'pillar' },
    { from: 19.6, to: 22.6, surface: 'sendai', shoulder: 5 },
    { from: 23.2, to: 25.8, surface: 'ash', edge: 'open', shoulder: 9 },
  ],
  items: [1.4, 4.3, 8.0, 11.6, 15.4, 20.0, 23.6],
  boosts: [[2.9, 0], [5.2, -0.4], [5.55, 0.4], [5.9, -0.4], [6.25, 0.4], [6.6, 0], [12.7, 0], [16.6, 0], [21.0, 0.3], [24.8, -0.3]],
  ramps: [22.3],
  gliders: [17.25],
  studs: [[0.9, -0.4, 8], [3.3, 0, 8], [6.9, 0, 6], [9.6, 0, 6], [11.2, 0, 6], [14.0, 0, 6], [16.2, 0, 8], [19.8, 0, 6], [21.6, -0.5, 6], [24.0, 0.3, 8], [25.9, 0, 6]],
  theme: {
    sky: [0x160c26, 0x8a5a6a, 0x2a1820], fog: [0x4a3448, 150, 880],
    sun: { color: 0xffc0a0, intensity: 1.7, dir: [-0.4, 0.8, 0.5] },
    hemi: [0xc0a8d8, 0x4a3a30, 1.3], envIntensity: 0.45,
    ground: 0x4a4644, groundPitch: 1.6, shoulder: 0x5c5854, dust: 0x8a8070,
    road: { base: '#3c3c42', line: '#e8e0d0' },
    surfaces: {
      jackpot: { base: '#8a0f22', line: '#f2cd37', dashed: true, seams: 'rgba(255,210,60,0.25)', emissive: 0x2a0008, emissiveIntensity: 1 },
      court: { base: '#7a4a2a', line: null, seams: 'rgba(30,14,4,0.55)', rough: 0.4 },
      express: { base: '#2e3036', line: '#f2cd37', dashed: true, seams: 'rgba(0,0,0,0.3)' },
      sendai: { base: '#4a4642', line: '#d8d0c0', seams: 'rgba(20,10,0,0.35)' },
      ash: { base: '#605a5c', line: null, seams: 'rgba(30,30,30,0.3)' },
    },
    wall: [C.dkgray, C.dkstone], curb: [C.yellow, C.black], gate: [C.black, 0xf2c230], fence: [C.dkgray, C.yellow, C.black],
    support: 'pillar', pillar: C.dkstone, pillar2: C.dkgray, skirt: ['#55565a', '#3a3a3e'], skirtColor: C.dkgray,
    rampSide: C.black, ramp: C.yellow, particles: 'embers',
    music: { bpm: 158, root: 49, scale: 'dorian', style: 'rock' },
  },

  decor(ctx) {
    const { b, rand, track: tr, scene, bounds } = ctx;
    const nb = ctx.bNoShadow;
    const K = (k) => tr.kToIndex(k);
    const edgeLat = (i) => tr.HW[i] + tr.SH[i];
    const spot = (k, lat, r) => {
      const i = K(k), sd = Math.sign(lat) || 1;
      for (let l = Math.abs(lat); l < Math.abs(lat) + 160; l += 2) { const p = tr.at(i, l * sd, 0); if (tr.clearance(p.x, p.z, r + 4) >= r && ctx.free(p.x, p.z, r * 0.5)) { p.y = 0; return p; } }
      const p = tr.at(i, lat, 0); p.y = 0; return p;
    };
    const faceRoad = (obj, k) => { const q = tr.at(K(k), 0, 0); obj.rotation.y = Math.atan2(q.x - obj.position.x, q.z - obj.position.z); };
    const add = (f, p, k, y = 0) => { f.root.position.set(p.x, y, p.z); faceRoad(f.root, k); ctx.group.add(f.root); ctx.claim(p.x, p.z, f.s * 1.5); return f; };
    const pl = (col, x, y, z, I, d) => { const l = new THREE.PointLight(col, I, d, 1.3); l.position.set(x, y, z); scene.add(l); return l; };
    const glowAt = (col, x, y, z, s, o = 0.9) => { const g = P.glow(col, s, o); g.position.set(x, y, z); ctx.group.add(g); return g; };
    const roadFacing = (x, z) => { let best = 1e9, bi = 0; for (let i = 0; i < tr.N; i += 6) { const d = Math.hypot(tr.px(i) - x, tr.pz(i) - z); if (d < best) { best = d; bi = i; } } return Math.atan2(tr.px(bi) - x, tr.pz(bi) - z); };

    // ---- ground: the flooded crater under the glide, scorched ash fields ----------------------
    const CRATER = [-85, 335];
    const gliding = (i) => inRange(tr, i, 17.3, 19.0);
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = '#000'; disc(g, toPx, sc, CRATER[0], CRATER[1], 120); strokeTrack(g, tr, toPx, sc, 18, gliding);
    });
    ctx.cutGround(hole);
    const water = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, CRATER[0], CRATER[1], 124); strokeTrack(g, tr, toPx, sc, 22, gliding); });
    liquid(ctx, water, 0x24405a, -5, { size: 1600, speed: 0.06, opacity: 0.92 });
    // crater walls: stepped rubble rings
    for (let n = 0; n < 90; n++) {
      const a = n / 90 * Math.PI * 2, r = 118 + rand() * 10, x = CRATER[0] + Math.cos(a) * r, z = CRATER[1] + Math.sin(a) * r;
      if (tr.clearance(x, z, 12) < 3) continue;
      rbox(b, x, -3, z, 8 + rand() * 6, 5 + rand() * 4, 4 + rand() * 4, 0, -a, (rand() - 0.5) * 0.5, RUIN[n % RUIN.length]);
    }
    // half-sunk buildings in the crater
    for (let n = 0; n < 9; n++) {
      const a = rand() * 6.28, r = 30 + rand() * 80, x = CRATER[0] + Math.cos(a) * r, z = CRATER[1] + Math.sin(a) * r;
      if (tr.clearance(x, z, 30) < 10) continue;
      const w = 10 + rand() * 8;
      const hold = new BrickBuilder(1); ruin(hold, 0, 0, w, w, 3 + Math.floor(rand() * 5), RUIN[n % RUIN.length], rand, -8);
      const gg = hold.build({ name: 'sunk' }); gg.position.set(x, 0, z); gg.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5); ctx.group.add(gg);
    }
    const ash = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, -330, -170, 150); disc(g, toPx, sc, -420, -60, 120); });
    scene.add(groundPlane(0x6a6466, -0.05, 1600, 1.6, { mask: ash, rough: 0.9 }));

    // ---- the colony barrier: a dark curtain dome over everything -----------------------------------
    { const tex = canvasTexture(1024, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(10,4,20,0.25)'); gr.addColorStop(0.75, 'rgba(14,6,24,0.6)'); gr.addColorStop(1, 'rgba(6,2,10,0.92)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 160; k++) { const x = Math.random() * w, l = 40 + Math.random() * 200; g.fillStyle = `rgba(${20 + Math.random() * 30},0,${40 + Math.random() * 40},${0.25 + Math.random() * 0.4})`; g.fillRect(x, h - l, 2 + Math.random() * 6, l); }
        g.strokeStyle = 'rgba(170,110,255,0.22)'; g.lineWidth = 2;
        for (let y = 20; y < h; y += 40) { g.beginPath(); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + ((x / 32) % 2) * 20); g.stroke(); }
      });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(980, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, side: THREE.BackSide }));
      dome.position.set(bounds.cx, -10, bounds.cz); dome.renderOrder = -5; scene.add(dome);
      ctx.anim((dt, t) => { tex.offset.x = t * 0.003; });
    }

    // ---- start: Tokyo Colony No. 1 ---------------------------------------------------------------
    arch(ctx, 26.3, { cols: [C.black, 0xf2c230], text: 'TOKYO COLONY No.1', bg: '#120a1c', fg: '#f2c230' });
    { const i = K(0.5), p = tr.at(i, 0, 0), yaw = tr.yawAt(i); scoreboard(ctx, 0, p.x, p.y + 22, p.z, 24, yaw + Math.PI); }
    // smashed cars and rubble along the start straight
    edges(ctx, 25.8, 3.6, 14, 4, (p, i, sd) => { const r = rand(); if (r < 0.45) wreckCar(b, p.x, p.z, tr.yawAt(i) + (rand() - 0.5) * 0.8, [C.red, C.white, C.blue, 0x2a2a2a, C.yellow][Math.floor(rand() * 5)], rand() < 0.3); else if (r < 0.8) rubble(b, p.x, p.z, 1, rand); });
    { const p = spot(0.95, -30, 6); const yj = add(P.yuji(3.6), p, 0.95); ctx.anim((dt, t) => { const ph = (t % 2.4) / 2.4; yj.armR.rotation.x = ph < 0.2 ? -1.6 * Math.sin(ph / 0.2 * Math.PI) : -0.2; yj.armL.rotation.x = -0.5; }); }
    { const p = spot(1.35, 30, 6); const mg = add(P.megumi(3.4), p, 1.35); mg.armR.rotation.set(-1.3, 0, 0.35); mg.armL.rotation.set(-1.3, 0, -0.35);
      const d = P.divineDog(0x15161c, 1.8); d.position.set(6, 0, 3); mg.root.add(d); }

    // ---- ruined Tokyo: tower blocks everywhere, some burning ---------------------------------------
    const fires = [];
    for (let x = -520; x < 520; x += 30) for (let z = -560; z < 560; z += 30) {
      const bx = x + (rand() - 0.5) * 12, bz = z + (rand() - 0.5) * 12;
      if (!hole.test(bx, bz) || ash.test(bx, bz)) continue;
      const w = 12 + Math.floor(rand() * 5) * 2, d = 12 + Math.floor(rand() * 5) * 2, r = Math.max(w, d) * 0.72;
      const c = tr.clearance(bx, bz, 120, r + 3);
      if (c < r + 3 || !ctx.free(bx, bz, r)) continue;
      if (c < 60 && rand() < 0.25) continue;
      ctx.claim(bx, bz, r);
      const floors = 2 + Math.floor(rand() * 3 + Math.min(c, 110) * 0.06 + rand() * rand() * 8);
      const top = ruin(c > 60 ? nb : b, bx, bz, w, d, floors, RUIN[Math.floor(rand() * RUIN.length)], rand);
      if (rand() < 0.12 && fires.length < 26) fires.push([bx, top, bz]);
    }
    const flameMat = P.neon(0xff7a20, 2.6), flame2 = P.neon(0xffc040, 2.8);
    fires.forEach(([x, y, z], n) => { nb.cone(x, y, z, 3, 5, 0, { mat: flameMat, seg: 7 }); nb.cone(x + 1, y, z - 1, 1.6, 6.5, 0, { mat: flame2, seg: 6 }); glowAt(0xff7a30, x, y + 4, z, 22, 0.8); });
    { // smoke columns from the fires
      const smoke = new THREE.InstancedMesh(brickGeometry(2, 2, 3, 2, true, 8), new THREE.MeshStandardMaterial({ color: 0x2a2428, roughness: 1, transparent: true, opacity: 0.6 }), 60);
      scene.add(smoke);
      const src = fires.slice(0, 10);
      const sm = [...Array(60)].map((_, k) => ({ t: k / 6 % 10, s: k % Math.max(1, src.length) }));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e = new THREE.Euler();
      ctx.anim((dt) => { if (!src.length) return; sm.forEach((s, k) => { s.t = (s.t + dt) % 10; const f = s.t / 10, [x, y, z] = src[s.s]; p3.set(x + f * 26, y + 4 + f * 60, z + Math.sin(k) * 4 * f); s3.setScalar(0.8 + f * 3.2); q.setFromEuler(e.set(f * 2, k, f)); m4.compose(p3, q, s3); smoke.setMatrixAt(k, m4); }); smoke.instanceMatrix.needsUpdate = true; });
    }

    // ---- Idle Death Gamble: the pachinko parlour and the JACKPOT straight -----------------------------
    const iJ = K(4.75), pJ = tr.at(iJ, 0, 0), yJ = tr.yawAt(iJ), spanJ = edgeLat(iJ) + 2;
    // parlour facade on the outside of the straight
    { const i = K(5.9), p = spot(5.9, 26, 18), rot = roadFacing(p.x, p.z);
      b.box(p.x, 0, p.z, 40, 22, 26, 0x2a1a2a, { rot });
      const fx = Math.sin(rot), fz = Math.cos(rot), rx = Math.cos(rot), rz = -Math.sin(rot);
      for (let n = -2; n <= 2; n++) Q.pachinkoCabinet(b, p.x + fx * 14 + rx * n * 6.5, p.z + fz * 14 + rz * n * 6.5, rot, 1);
      const sTex = canvasTexture(1024, 256, (g, w, h) => { g.fillStyle = '#1a0010'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 120px Arial Black'; g.shadowColor = '#ff3a8a'; g.shadowBlur = 30; g.fillStyle = '#ffe040'; g.fillText('PACHINKO', w / 2, 90); g.font = '900 64px Arial Black'; g.fillStyle = '#ff6ab0'; g.fillText('IDLE DEATH GAMBLE', w / 2, 200); });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(38, 9.5), new THREE.MeshBasicMaterial({ map: sTex }));
      sign.position.set(p.x + fx * 13.1, 26, p.z + fz * 13.1); sign.rotation.y = rot; ctx.group.add(sign);
      b.box(p.x + fx * 12.6, 21, p.z + fz * 12.6, 40, 10, 1, 0x1a0010, { rot });
      ctx.claim(p.x, p.z, 26);
      pl(0xff4aa0, p.x + fx * 24, 14, p.z + fz * 24, 4, 120);
      // Hakari dancing outside his parlour
      const hp = tr.at(i, edgeLat(i) + 7, 0); hp.y = 0;
      const hk = Q.hakari(3.6); hk.root.position.copy(hp); faceRoad(hk.root, 5.9); ctx.group.add(hk.root);
      const aura = glowAt(0x7aff9a, hp.x, 7, hp.z, 26, 0.35);
      ctx.anim((dt, t) => { const s = Math.sin(t * 6); hk.armR.rotation.set(-2.6 + s * 0.4, 0, -0.3); hk.armL.rotation.set(-0.4 - s * 0.6, 0, 0.4); hk.body.rotation.y = Math.sin(t * 3) * 0.3; hk.root.position.y = Math.abs(Math.sin(t * 6)) * 0.6; aura.material.opacity = 0.25 + 0.15 * Math.abs(s); });
    }
    // pachinko cabinets lining both sides of the straight, lamp posts flashing in sequence
    const lampMats = [P.neon(0xff3a6a, 2), P.neon(0xffe040, 2), P.neon(0x40ff9a, 2), P.neon(0x40c8ff, 2)];
    const lamps = new BrickBuilder(1);
    let ln = 0;
    each(tr, 4.7, 7.25, 9, (i) => { for (const sd of [-1, 1]) { const p = tr.at(i, sd * (edgeLat(i) + 3.5), 0); Q.pachinkoCabinet(b, p.x, p.z, tr.yawAt(i) + sd * Math.PI / 2, 0.9); const q = tr.at(i, sd * (edgeLat(i) + 0.6), 0); lamps.sphere(q.x, q.y + 2.4, q.z, 0.6, 0, { mat: lampMats[ln++ % 4] }); } });
    ctx.group.add(lamps.build({ name: 'jackpot-lamps', shadows: false }));
    ctx.anim((dt, t) => { lampMats.forEach((m, k) => { m.emissiveIntensity = ((Math.floor(t * 8) + k) % 4 === 0) ? 4 : 0.6; }); });
    // the jackpot gate: three reels; when 7-7-7 lands every kart through the gate gets a big boost
    const reelTex = canvasTexture(128, 768, (g, w, h) => {
      const sy = ['7', 'BAR', 'BELL', '$', '7', 'CHERRY'];
      sy.forEach((s, n) => { g.fillStyle = n % 2 ? '#fff6e0' : '#ffffff'; g.fillRect(0, n * 128, w, 128); g.fillStyle = s === '7' ? '#d01020' : '#2a2a6a'; g.font = `900 ${s.length > 1 ? 44 : 96}px Arial Black`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, w / 2, n * 128 + 68); });
    });
    reelTex.wrapT = THREE.RepeatWrapping; reelTex.repeat.set(1, 1 / 6);
    const reels = [];
    { const hold = new THREE.Group(); hold.position.copy(pJ); hold.rotation.y = yJ;
      const gb = new BrickBuilder(1);
      for (const sd of [-1, 1]) { let y = 0; for (let n = 0; n < 6; n++) y = gb.brick(sd * spanJ, y, 0, 2, 2, 3, n % 2 ? 0xf2c230 : 0xc81a2a); }
      gb.box(0, 14, 0, spanJ * 2 + 3, 9, 2.4, 0xc81a2a); gb.box(0, 13.4, 0, spanJ * 2 + 4, 0.8, 3, 0xf2c230);
      gb.box(0, 22.6, 0, spanJ * 2 + 4, 0.8, 3, 0xf2c230);
      hold.add(gb.build({ name: 'jackpot-gate' }));
      for (let n = -1; n <= 1; n++) for (const fz of [-1.25, 1.25]) {
        const tex = reelTex.clone(); tex.needsUpdate = true;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 6), new THREE.MeshBasicMaterial({ map: tex }));
        m.position.set(n * 6.5, 18.5, fz); m.rotation.y = fz < 0 ? Math.PI : 0; hold.add(m); reels.push({ tex, n });
      }
      const jtex = canvasTexture(512, 64, (g, w, h) => { g.fillStyle = '#ffe040'; g.font = '900 52px Arial Black'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JACKPOT!', w / 2, h / 2 + 2); });
      const jm = new THREE.MeshBasicMaterial({ map: jtex, transparent: true, opacity: 0, depthWrite: false });
      for (const fz of [-1.6, 1.6]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(spanJ * 1.6, spanJ * 0.2), jm); m.position.set(0, 25.5, fz); m.rotation.y = fz < 0 ? Math.PI : 0; hold.add(m); }
      const jl = new THREE.PointLight(0xffd040, 0, 90, 1.3); jl.position.set(0, 12, 0); hold.add(jl);
      ctx.group.add(hold);
      const lucky = new WeakMap();
      ctx.anim((dt, t) => {
        const ph = t % 7, jp = ph > 4.4, round = Math.floor(t / 7);   // reels stop one by one on 7, then JACKPOT for 2.6 s
        for (const r of reels) r.tex.offset.y = ph < 2.2 + (r.n + 1) * 0.7 ? (t * 4.2 + r.n * 0.3) % 1 : 5 / 6;
        jm.opacity = jp ? (Math.floor(t * 8) % 2 ? 1 : 0.3) : 0; jl.intensity = jp ? 6 + Math.sin(t * 30) * 2 : 0;
        if (jp) for (const m of lampMats) m.emissiveIntensity = Math.floor(t * 10) % 2 ? 4 : 1;
        const race = ctx.world.race; if (!jp || !race) return;
        for (const k of race.karts) {
          const ki = k.loc?.i; if (ki === undefined) continue;
          const d = (ki - iJ + tr.N) % tr.N;
          if (d < 8 && lucky.get(k) !== round) { lucky.set(k, round); k.boost(1.6); const fx = fxOf(ctx); if (fx) fx.pop(V2.copy(k.pos).setY(k.pos.y + 3), 0xffe040); }
        }
      });
    }
    // steel balls hopping across the straight
    [[5.4, 0], [6.05, 1.2], [6.75, 2.3]].forEach(([k, off]) => ctx.hazard(pachinkoBall(ctx, { k, period: 3.8, offset: off })));
    // silver balls tumbling down the parlour cabinets (decorative)
    { const ballG = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 10, 8), plastic(0xd8dce4, { metal: 0.9, rough: 0.15 }), 40);
      ctx.group.add(ballG);
      const sp = []; each(tr, 4.9, 7.1, 18, (i) => { for (const sd of [-1, 1]) sp.push(tr.at(i, sd * (edgeLat(i) + 4.6), 0)); });
      const m4 = new THREE.Matrix4();
      ctx.anim((dt, t) => { for (let n = 0; n < 40; n++) { const s = sp[n % sp.length]; if (!s) break; const f = (t * 0.6 + n * 0.37) % 1; m4.makeTranslation(s.x + Math.sin(f * 40 + n) * 1.2, 7.5 - f * 6, s.z + Math.cos(n) * 0.6); ballG.setMatrixAt(n, m4); } ballG.instanceMatrix.needsUpdate = true; });
    }
    { const i = K(7.1), p = tr.at(i, -(edgeLat(i) + 4), 0); scoreboard(ctx, 3, p.x, 14, p.z, 12, roadFacing(p.x, p.z)); }

    // ---- Deadly Sentencing: Higuruma's courtroom domain ----------------------------------------------
    arch(ctx, 8.35, { cols: [0x3a1a0a, 0xf2cd37], text: 'DOMAIN: DEADLY SENTENCING', bg: '#1a0a04', fg: '#f2cd37' });
    // wood panelling and pews along the walls, a dark domain ring overhead
    each(tr, 8.55, 10.65, 6, (i) => { for (const sd of [-1, 1]) { const p = tr.at(i, sd * (edgeLat(i) + 2.2), 0); b.box(p.x, 0, p.z, 1.2, 9, 6.2, 0x5a3418, { rot: tr.yawAt(i) }); b.box(p.x, 9, p.z, 1.8, 0.8, 6.4, 0x3a2008, { rot: tr.yawAt(i) }); const q = tr.at(i, sd * (edgeLat(i) + 6), 0); b.box(q.x, 0, q.z, 3, 2, 5, 0x6a3a1a, { rot: tr.yawAt(i) }); b.box(q.x + Math.cos(tr.yawAt(i)) * sd * 1.3, 2, q.z - Math.sin(tr.yawAt(i)) * sd * 1.3, 0.6, 2.4, 5, 0x6a3a1a, { rot: tr.yawAt(i) }); } });
    { const c = tr.at(K(9.6), 0, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(70, 3, 8, 48), P.neon(0x2a0a04, 0.4)); ring.position.set(c.x, 34, c.z); ring.rotation.x = Math.PI / 2; ctx.group.add(ring);
      const floorM = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, c.x, c.z, 74); });
      scene.add(groundPlane(0x2a1408, -0.04, 1600, 1.6, { mask: floorM, rough: 0.5 }));
      pl(0xffc880, c.x, 26, c.z, 3, 140); }
    // the judge's bench on the infield with Judgeman and Higuruma; Yuji stands trial in the dock
    { const i = K(9.6), yaw = tr.yawAt(i), p = tr.at(i, -(edgeLat(i) + 14), 0), ca = Math.cos(yaw), sa = Math.sin(yaw);
      const rot = roadFacing(p.x, p.z);
      b.box(p.x, 0, p.z, 22, 7, 8, 0x5a3418, { rot }); b.box(p.x, 7, p.z, 23, 0.8, 9, 0x3a2008, { rot });
      b.box(p.x - Math.sin(rot) * 5, 0, p.z - Math.cos(rot) * 5, 26, 14, 2, 0x3a2008, { rot });
      const jm = Q.judgeman(3.2); jm.position.set(p.x - Math.sin(rot) * 3, 2, p.z - Math.cos(rot) * 3); jm.rotation.y = rot; ctx.group.add(jm);
      const hg = Q.higuruma(3.0); hg.root.position.set(p.x + Math.cos(rot) * 7, 7.8, p.z - Math.sin(rot) * 7); hg.root.rotation.y = rot; ctx.group.add(hg.root);
      ctx.anim((dt, t) => { const ph = (t % 4.2) / 4.2; hg.armR.rotation.x = ph < 0.62 ? -2.4 : ph < 0.67 ? -2.4 + (ph - 0.62) / 0.05 * 1.8 : -0.6; jm.rotation.z = Math.sin(t * 1.2) * 0.04; });
      glowAt(0xffd080, p.x, 16, p.z, 30, 0.25);
      ctx.claim(p.x, p.z, 16);
      // the dock on the outside
      const dp = tr.at(i, edgeLat(i) + 10, 0); dp.y = 0; b.box(dp.x, 0, dp.z, 7, 3.4, 7, 0x5a3418, { rot: yaw });
      const yj = P.yuji(2.8); yj.root.position.set(dp.x, 0.4, dp.z); faceRoad(yj.root, 9.6); ctx.group.add(yj.root); yj.armR.rotation.x = -0.3;
      ctx.claim(dp.x, dp.z, 6);
      scoreboard(ctx, 14, dp.x + sa * 12, 16, dp.z + ca * 12, 12, roadFacing(dp.x, dp.z), false);
      scoreboard(ctx, 4, p.x + sa * 16, 18, p.z + ca * 16, 12, rot); }
    // two gavels slam down across the court
    [[9.15, -1, 0], [10.05, 1, 2.1]].forEach(([k, sd, off]) => {
      const i = K(k), S = tr.at(i, sd * (edgeLat(i) + 3), 5), T = tr.at(i, -sd * tr.HW[i] * 0.22, 0.1);
      const post = new BrickBuilder(1); post.box(S.x, 0, S.z, 2.6, S.y, 2.6, 0x3a2008); post.cyl(S.x, S.y - 0.6, S.z, 1.2, 1.2, 0xf2cd37, { seg: 10 }); ctx.group.add(post.build({ name: 'gavel-post' }));
      ctx.hazard(gavelSlam(ctx, { S, T, period: 4.2, offset: off }));
    });

    // ---- the broken expressway: Kashimo's storm ---------------------------------------------------------
    each(tr, 12.4, 17.2, 16, (i) => { if (rand() < 0.5) { const sd = rand() < 0.5 ? -1 : 1, q = tr.at(i, sd * (edgeLat(i) + 0.3), 0); rbox(b, q.x, q.y + 1.2, q.z, 3, 0.5, 2, 0.4, tr.yawAt(i), sd * 0.6, C.dkgray); } });
    each(tr, 12.6, 17.0, 20, (i) => { for (const sd of [-1, 1]) { const q = tr.at(i, sd * (edgeLat(i) + 0.4), 0); b.cyl(q.x, q.y + 1.2, q.z, 0.2, 6, C.ltgray, { seg: 6 }); rbox(b, q.x, q.y + 7, q.z, 0.3, 0.3, 2.4, 0.3 * sd, tr.yawAt(i) + Math.PI / 2, 0, C.ltgray); } });
    // storm cloud with a crackling core over Kashimo
    const iK = K(14.6), kp = tr.at(iK, edgeLat(iK) + 14, 0);
    { const cl = new BrickBuilder(1); for (let n = 0; n < 26; n++) { const a = rand() * 6.28, r = rand() * 60; cl.sphere(Math.cos(a) * r, (rand() - 0.5) * 6, Math.sin(a) * r, 10 + rand() * 10, n % 3 ? 0x2a2838 : 0x3a3850, { sy: 0.5 }); }
      const cg = cl.build({ name: 'storm', shadows: false }); const hold = new THREE.Group(); hold.add(cg); const sc = tr.at(K(14.9), 0, 0); hold.position.set(sc.x, 72, sc.z); ctx.group.add(hold);
      const flash = glowAt(0x9ad8ff, sc.x, 66, sc.z, 160, 0); ctx.anim((dt, t) => { hold.rotation.y = t * 0.05; flash.material.opacity = Math.max(0, Math.sin(t * 7.3) * Math.sin(t * 2.1)) * 0.6; }); }
    { const ks = Q.kashimo(3.8); ks.root.position.set(kp.x, 6, kp.z); faceRoad(ks.root, 14.6); ctx.group.add(ks.root);
      const spark = new BrickBuilder(1); for (let n = 0; n < 8; n++) { const a = n * 0.8; rbox(spark, Math.cos(a) * 4, 7 + Math.sin(a) * 4, 0, 2.6, 0.2, 0.2, 0, 0, a + 1, 0, { mat: P.neon(0x9ad8ff, 3) }); }
      const sg = spark.build({ name: 'kashimo-arcs', shadows: false }); ks.root.add(sg); ks.root.add(P.glow(0x6ad8ff, 22, 0.5)).children.at(-1).position.y = 8;
      ctx.anim((dt, t) => { ks.root.position.y = 6 + Math.sin(t * 1.4) * 0.8; sg.rotation.z = t * 3; sg.visible = Math.sin(t * 13) > -0.3; ks.armR.rotation.x = -1.6 + Math.sin(t * 2) * 0.3; ks.armL.rotation.set(-2.4, 0, 0.3); });
      // his pillar of rubble
      for (let n = 0; n < 4; n++) b.box(kp.x + (rand() - 0.5) * 3, n * 1.4 - 1, kp.z + (rand() - 0.5) * 3, 6 - n, 1.4, 6 - n, RUIN[n]);
      ctx.claim(kp.x, kp.z, 8); scoreboard(ctx, 5, kp.x, 22, kp.z, 10, roadFacing(kp.x, kp.z)); }
    const lTargets = [[13.4, -0.3], [13.8, 0.3], [14.3, 0], [14.8, -0.35], [15.3, 0.3], [15.8, -0.2], [16.2, 0.3]];
    ctx.hazard(lightning(ctx, { targets: lTargets, period: 2.6 }));
    ctx.hazard(lightning(ctx, { targets: lTargets, period: 3.1, offset: 1.4 }));
    ctx.hazard(lightning(ctx, { targets: lTargets, period: 2.9, offset: 0.7 }));
    // skyscrapers holding up the last of the expressway: the glide launches off a rooftop
    each(tr, 15.2, 17.3, 18, (i) => { const p = tr.at(i, 0, 0), yaw = tr.yawAt(i), w = 2 * edgeLat(i) + 6; const hb = new BrickBuilder(1); const fl = Math.floor((p.y - 1) / 3.4), top = ruin(hb, 0, 0, w, 18, fl, RUIN[i % RUIN.length], rand, 0, true); hb.box(0, top, 0, w, Math.max(0.1, p.y - 1 - top), 18, C.dkgray); const gg = hb.build({ name: 'tower' }); gg.position.set(p.x, -0.6, p.z); gg.rotation.y = yaw; ctx.group.add(gg); });
    arch(ctx, 17.0, { cols: [C.black, C.azure], text: 'TO SENDAI COLONY', bg: '#0a1830', fg: '#9ad8ff' });

    // ---- Uro's flipped sky over the crater ---------------------------------------------------------------
    { const sky = canvasTexture(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6a8ac8'); gr.addColorStop(1, '#b8c8e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.7)'; for (let n = 0; n < 14; n++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 40, 10 + Math.random() * 10, 0, 0, 7); g.fill(); } g.strokeStyle = '#1a1030'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); for (let n = 0; n < 6; n++) { g.beginPath(); g.moveTo(Math.random() * w, 0); for (let k = 0; k < 5; k++) g.lineTo(Math.random() * w, k * 60); g.stroke(); } });
      const skyMat = new THREE.MeshBasicMaterial({ map: sky, side: THREE.DoubleSide, fog: false });
      // a slab of sky that keeps flipping over, an upside-down city on its underside
      const slabs = [];
      for (const [dx, dz, w, ph] of [[-40, -10, 70, 0], [55, 30, 50, 2.2], [-120, 40, 46, 4]]) {
        const hold = new THREE.Group(); hold.position.set(CRATER[0] + dx, 78 + dz * 0.2, CRATER[1] + dz);
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.55).rotateX(-Math.PI / 2), skyMat); hold.add(pane);
        const ub = new BrickBuilder(1); for (let n = 0; n < 7; n++) { const x = (rand() - 0.5) * w * 0.8, z = (rand() - 0.5) * w * 0.4, bw = 5 + rand() * 5, h = 6 + rand() * 18; ub.box(x, -h - 0.2, z, bw, h, bw, RUIN[n % RUIN.length]); ub.box(x, -h - 0.4, z, bw + 0.2, 1.2, bw + 0.2, 0x1a1c22); }
        hold.add(ub.build({ name: 'flipped-city', shadows: false })); hold.rotation.y = rand() * 3; ctx.group.add(hold); slabs.push([hold, ph]);
      }
      ctx.anim((dt, t) => { for (const [h, ph] of slabs) { const c = (t * 0.25 + ph) % 4, f = c < 1 ? c : 1; const turn = Math.floor((t * 0.25 + ph) / 4); h.rotation.x = (turn + f * f * (3 - 2 * f)) * Math.PI; } });
      // upside-down skyline hanging from the sky above the glide
      for (let n = 0; n < 22; n++) {
        const a = rand() * 6.28, r = 40 + rand() * 120, x = CRATER[0] + Math.cos(a) * r, z = CRATER[1] + Math.sin(a) * r, w = 10 + rand() * 10, h = 20 + rand() * 40;
        nb.box(x, 150 - h, z, w, h, w, RUIN[n % RUIN.length]); for (let y = 150 - h + 2; y < 148; y += 4) nb.box(x, y, z, w + 0.2, 1.2, w + 0.2, 0x1a1c22);
      }
      const ur = Q.uro(3.4); ur.root.position.set(CRATER[0] + 30, 34, CRATER[1] - 20); ctx.group.add(ur.root);
      ctx.anim((dt, t) => { ur.root.position.y = 34 + Math.sin(t * 0.9) * 2; ur.root.rotation.y = t * 0.3; ur.armR.rotation.set(-2.6, 0, -0.4); ur.armL.rotation.set(-2.6, 0, 0.4); });
      scoreboard(ctx, 8, CRATER[0] + 30, 50, CRATER[1] - 20, 12, 0);
    }

    // ---- Sendai colony: Yuta and Rika, Ryu's Granite Blast, Kurourushi's swarm ---------------------------
    arch(ctx, 19.75, { cols: [C.black, C.azure], text: 'SENDAI COLONY', bg: '#081428', fg: '#9ad8ff' });
    edges(ctx, 19.6, 22.6, 12, 4, (p) => { if (rand() < 0.6) rubble(b, p.x, p.z, 1.2, rand); else if (rand() < 0.5) rock(b, p.x, 0, p.z, 1.2, rand, [C.dkgray, C.dkstone]); });
    { const p = spot(20.4, 30, 9); const yt = add(P.yuta(3.4), p, 20.4); yt.armR.rotation.x = -1.4;
      const RS = 5.5, rk = P.rika(RS); rk.root.position.set(p.x, 0, p.z); faceRoad(rk.root, 20.4); rk.root.translateZ(-9); ctx.group.add(rk.root);
      ctx.anim((dt, t) => { yt.armR.rotation.x = -1.4 + Math.sin(t * 2) * 0.4; rk.armL.rotation.x = -0.8 + Math.sin(t * 1.3) * 0.3; rk.armR.rotation.x = -0.8 - Math.sin(t * 1.3) * 0.3; });
      scoreboard(ctx, 6, p.x, 26, p.z, 11, roadFacing(p.x, p.z)); }
    { const i = K(21.0), p = tr.at(i, -(edgeLat(i) + 12), 0); p.y = 0;
      const ry = Q.ryu(3.6); ry.root.position.copy(p); faceRoad(ry.root, 21.0); ctx.group.add(ry.root); ry.armR.rotation.set(-1.5, 0, 0.3); ry.armL.rotation.set(-1.5, 0, -0.3);
      ctx.claim(p.x, p.z, 8);
      const from = tr.at(i, -(edgeLat(i) + 6), 3), to = tr.at(i, edgeLat(i) + 18, 3);
      ctx.hazard(graniteBlast(ctx, { from, to, period: 6.5 }));
      scoreboard(ctx, 7, p.x, 20, p.z, 11, roadFacing(p.x, p.z)); }
    { const p = spot(22.0, 34, 10); const kr = Q.kurourushi(3.2); kr.position.set(p.x, 0, p.z); kr.rotation.y = roadFacing(p.x, p.z); ctx.group.add(kr); ctx.claim(p.x, p.z, 10);
      ctx.anim((dt, t) => { kr.rotation.z = Math.sin(t * 2.2) * 0.05; });
      for (let n = 0; n < 30; n++) { const a = rand() * 6.28, r = 6 + rand() * 18; Q.roach(b, p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r, 0.8 + rand() * 0.6, rand() * 6.28); } }
    for (const [k, off] of [[21.55, 0], [22.05, 0.5]]) {
      const sb = new BrickBuilder(1); for (let n = 0; n < 9; n++) Q.roach(sb, (rand() - 0.5) * 5, 0, (rand() - 0.5) * 5, 0.7 + rand() * 0.4, -Math.PI / 2 + (rand() - 0.5) * 0.6);
      const hold = new THREE.Group(); const sg = sb.build({ name: 'swarm' }); hold.add(sg);
      ctx.hazard(crossing(ctx, { mesh: hold, k, speed: 5.5, radius: 2.8, kind: 'spin', offset: off, span: 1.05 }));
      ctx.anim((dt, t) => { sg.position.y = Math.abs(Math.sin(t * 18)) * 0.15; sg.rotation.y = Math.PI / 2 + Math.sin(t * 9) * 0.08; });
    }
    // Sendai skyline: the TV tower
    { const tx = -470, tz = 230; let y = 0; for (let n = 0; n < 9; n++) y = nb.box(tx, y, tz, 12 - n, 9, 12 - n, n % 2 ? C.white : C.dkgray); nb.cyl(tx, y, tz, 7, 5, C.ltgray, { seg: 12 }); nb.cyl(tx, y + 5, tz, 0.8, 30, C.white, { seg: 6 }); nb.sphere(tx, y + 36, tz, 1.4, 0, { mat: P.neon(0xff2010, 2) }); }

    // ---- Sakurajima colony: ash, the volcano, Maki, Kenjaku, Angel and Panda -------------------------------
    arch(ctx, 23.05, { cols: [C.black, C.pink], text: 'SAKURAJIMA COLONY', bg: '#2a0a14', fg: '#ffb0c8' });
    { const vx = -560, vz = -120; let y = -0.1;
      for (let k = 0; k < 14; k++) y = nb.cyl(vx + Math.sin(k) * 2, y, vz + Math.cos(k) * 2, 120 - k * 8, 5, k % 3 === 2 ? 0x3a3034 : k % 2 ? 0x5a5056 : 0x4a4046, { seg: 28 });
      nb.cyl(vx, y - 0.2, vz, 10, 0.5, 0xff6a00, { seg: 20, matOpts: { emissive: 0xff5000, emissiveIntensity: 2.2 } });
      glowAt(0xff6a20, vx, y + 8, vz, 90, 0.6);
      const smoke = new THREE.InstancedMesh(brickGeometry(2, 2, 3, 2, true, 8), new THREE.MeshStandardMaterial({ color: 0x5a5458, roughness: 1, transparent: true, opacity: 0.7 }), 24);
      scene.add(smoke);
      const sm = [...Array(24)].map((_, k) => ({ t: k / 24 * 10, a: rand() * 6.28 }));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e = new THREE.Euler();
      ctx.anim((dt) => { sm.forEach((s, k) => { s.t += dt; if (s.t > 10) { s.t = 0; s.a = rand() * 6.28; } const f = s.t / 10; p3.set(vx + Math.cos(s.a) * f * 30 + f * 60, y + f * 120, vz + Math.sin(s.a) * f * 30); s3.setScalar(2 + f * 6); q.setFromEuler(e.set(f * 2, s.a, f)); m4.compose(p3, q, s3); smoke.setMatrixAt(k, m4); }); smoke.instanceMatrix.needsUpdate = true; }); }
    ctx.scatter(60, { minC: 4, maxC: 90, r: 3, test: (x, z) => ash.test(x, z) }, (x, z) => (rand() < 0.5 ? rock(b, x, 0, z, 1.4, rand, [0x3a3034, 0x5a5056, C.dkgray]) : P.sakura(b, x, z, 0.8 + rand() * 0.4, rand)));
    { const p = spot(23.8, -30, 6); const mk = add(Q.maki(3.6), p, 23.8);
      ctx.anim((dt, t) => { const ph = (t % 2.2) / 2.2; mk.armR.rotation.set(ph < 0.3 ? -2.6 : ph < 0.4 ? -2.6 + (ph - 0.3) / 0.1 * 2.2 : -0.4, 0, 0.2); mk.body.rotation.y = ph > 0.3 && ph < 0.5 ? -0.3 : 0; });
      scoreboard(ctx, 9, p.x, 20, p.z, 10, roadFacing(p.x, p.z)); }
    { const p = spot(24.45, 30, 7); const hn = Q.hana(3.4); hn.root.position.set(p.x, 8, p.z); faceRoad(hn.root, 24.45); ctx.group.add(hn.root); ctx.claim(p.x, p.z, 6);
      glowAt(0xfff0c0, p.x, 14, p.z, 30, 0.4);
      ctx.anim((dt, t) => { const f = Math.sin(t * 5) * 0.4; hn.wings.forEach((w, n) => { w.rotation.y = (n < 2 ? -1 : 1) * (0.4 + f); }); hn.root.position.y = 8 + Math.sin(t * 1.5) * 1.2; hn.armR.rotation.set(-2.4, 0, -0.3); hn.armL.rotation.set(-2.4, 0, 0.3); }); }
    { const p = spot(25.05, -32, 8); const kj = add(P.geto(3.6), p, 25.05); kj.armR.rotation.set(-1.3, 0, 0.3);
      const vort = new THREE.Group(); vort.position.set(p.x, 0, p.z); ctx.group.add(vort);
      const cb = new BrickBuilder(1); for (let n = 0; n < 10; n++) { const a = n / 10 * 6.28, r = 7 + (n % 3) * 2, y = 5 + n * 1.2; cb.sphere(Math.cos(a) * r, y, Math.sin(a) * r, 1 + (n % 3) * 0.4, [0x2a1a3a, 0x1a2a2a, 0x3a1a1a][n % 3]); cb.sphere(Math.cos(a) * r * 1.08, y + 0.3, Math.sin(a) * r * 1.08, 0.35, 0, { mat: P.neon(0xffe040, 2) }); }
      vort.add(cb.build({ name: 'uzumaki' })); ctx.anim((dt, t) => { vort.rotation.y = t * 1.1; });
      glowAt(0x6a2aaa, p.x, 10, p.z, 34, 0.4); }
    { const p = spot(25.9, 30, 7); const pd = P.panda(3.2); pd.root.position.set(p.x, 0, p.z); faceRoad(pd.root, 25.9); ctx.group.add(pd.root); ctx.claim(p.x, p.z, 6); ctx.anim((dt, t) => { pd.armL.rotation.z = 2.4 + Math.sin(t * 5) * 0.4; }); }
    { const i = K(24.0), p = tr.at(i, edgeLat(i) + 6, 0); scoreboard(ctx, 13, p.x, 15, p.z, 12, roadFacing(p.x, p.z), false); }
    { const i = K(20.0), p = tr.at(i, -(edgeLat(i) + 6), 0); scoreboard(ctx, 12, p.x, 15, p.z, 12, roadFacing(p.x, p.z), false); }
    { const i = K(12.0), p = tr.at(i, -(edgeLat(i) + 5), 0); scoreboard(ctx, 10, p.x, 14, p.z, 12, roadFacing(p.x, p.z)); }
    { const i = K(2.6), p = tr.at(i, edgeLat(i) + 5, 0); scoreboard(ctx, 11, p.x, 14, p.z, 12, roadFacing(p.x, p.z)); }
    { const i = K(16.7), p = tr.at(i, -(edgeLat(i) + 4), 0); scoreboard(ctx, 15, p.x, p.y + 12, p.z, 12, roadFacing(p.x, p.z)); }

    // ---- light & atmosphere ------------------------------------------------------------------------------
    const moon = new THREE.Mesh(new THREE.CircleGeometry(36, 32), new THREE.MeshBasicMaterial({ color: 0xffd8a8, fog: false }));
    moon.position.set(-520, 360, 820); moon.lookAt(0, 0, 0); scene.add(moon);
    const mglow = P.glow(0xffb080, 240, 0.45); mglow.position.copy(moon.position); scene.add(mglow);
  },
};
