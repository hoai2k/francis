// Avengers Brick Assemble: the Marvel movie race. Park Avenue during the Battle of
// New York (cabs, Hulk, Spider-Man, Doctor Strange's portal, Chitauri chariots on the
// viaduct round Avengers Tower), Thor's lightning on the Bifrost, a glide off the
// broken bridge over Warrior Falls into Wakanda, the vibranium mine under Mount
// Bhashanti, a jump at Stark Expo and the Guardians' Milano under Knowhere.
import { THREE, BrickBuilder, C, plastic, groundPlane, building, cloud, canvasTexture, billboard, minifig, trackMover, mover, tunnel, liquid, disc, strokeTrack, inRange, each, edges, arch, mat4, rock, pick } from './kit.js';
import { M, glow, texMat, fig, part, bake, spiderman, ironman, captain, shieldMesh, thor, hulk, widow, hawkeye, panther, strange, mandalaMat, starlord, gamora, drax, thanos, loki, ultron, groot, rocket, chariot, leviathanParts, milano } from './marvel-props.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const faceTo = (obj, x, z) => { obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z); };

// ---- hazards ------------------------------------------------------------------------------
function ringMarker(ctx, color, r = 4) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.72, r, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
  m.visible = false; ctx.group.add(m);
  return m;
}
// Hulk leaps from the kerb onto a lane (marked in red), smashes, and leaps back.
function hulkLeap(ctx, k, side, { period = 5.6, offset = 0 } = {}) {
  const tr = ctx.track, i = tr.kToIndex(k);
  const home = tr.at(i, side * (tr.HW[i] + tr.SH[i] + 9), 0);
  const lanes = [tr.at(i + 5, side * 0.45 * tr.HW[i], 0.05), tr.at(i - 5, -side * 0.45 * tr.HW[i], 0.05)];
  const h = hulk(); h.root.scale.setScalar(4.4); h.root.position.copy(home); ctx.group.add(h.root);
  const marker = ringMarker(ctx, 0xff2a10, 5.2);
  const crack = new THREE.Mesh(new THREE.CircleGeometry(4.6, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1b1b1b, transparent: true, opacity: 0, depthWrite: false }));
  ctx.group.add(crack);
  let kind = null, tgt = lanes[0], landed = false;
  return {
    update(dt, t) {
      const T = ((t + offset) % period + period) % period, cyc = Math.floor((t + offset) / period);
      tgt = lanes[cyc % 2];
      const r = h.root;
      kind = null;
      marker.visible = T > 0.8 && T < 3.3;
      if (marker.visible) { marker.position.copy(tgt); marker.material.opacity = 0.45 + 0.45 * Math.abs(Math.sin(t * 10)); marker.scale.setScalar(T < 2.2 ? 1.3 - (T - 0.8) / 1.4 * 0.3 : 1); }
      if (T < 1.2 || T > 4.4) {
        r.position.copy(home); faceTo(r, tgt.x, tgt.z);
        const flex = Math.sin(t * 3.2);
        h.armL.rotation.x = -0.5 - flex * 0.25; h.armR.rotation.x = -0.5 - flex * 0.25;
        h.armL.rotation.z = 1.7 + flex * 0.3; h.armR.rotation.z = -1.7 - flex * 0.3; r.rotation.x = 0;
        landed = false;
      } else if (T < 2.2) {
        const f = (T - 1.2) / 1.0;
        r.position.lerpVectors(home, tgt, f); r.position.y += Math.sin(f * Math.PI) * 26;
        h.armL.rotation.x = h.armR.rotation.x = -2.9; h.armL.rotation.z = 0.25; h.armR.rotation.z = -0.25;
        r.rotation.x = Math.sin(f * Math.PI) * 0.3;
      } else if (T < 3.3) {
        r.position.copy(tgt); r.rotation.x = 0.25; h.armL.rotation.z = 0.25; h.armR.rotation.z = -0.25;
        const s = (T - 2.2) * 5.5;
        h.armL.rotation.x = h.armR.rotation.x = -2.9 + Math.abs(Math.sin(s)) * 2.3;
        if (!landed) { landed = true; crack.material.opacity = 0.55; ctx.world.race?.fx.dust({ pos: tgt, yaw: 0 }, 0x9a9a8a, 14); ctx.world.race?.audio.sfx('crash', tgt); }
        kind = T < 2.8 ? 'wreck' : 'bump';
      } else {
        const f = (T - 3.3) / 1.1;
        r.position.lerpVectors(tgt, home, f); r.position.y += Math.sin(f * Math.PI) * 22;
        h.armL.rotation.x = h.armR.rotation.x = -2.6; r.rotation.x = -0.2;
      }
      crack.position.copy(tgt); crack.position.y += 0.03;
      if (crack.material.opacity > 0) crack.material.opacity = Math.max(0, crack.material.opacity - dt * 0.25);
    },
    test(p) { return kind && Math.hypot(p.x - tgt.x, p.z - tgt.z) < (kind === 'wreck' ? 5.4 : 4.2) && Math.abs(p.y - tgt.y) < 8 ? kind : null; },
    near(p, r) { return marker.visible && Math.hypot(p.x - tgt.x, p.z - tgt.z) < 5.5 + r; },
  };
}

// Thor calls lightning onto marked spots of the Bifrost.
function lightning(ctx, source, spots, { period = 2.8, offset = 0, warn = 1.3 } = {}) {
  const tr = ctx.track;
  const marker = ringMarker(ctx, 0x9fe0ff, 4.2);
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const segGeo = new THREE.BoxGeometry(0.5, 0.5, 1).translate(0, 0, 0.5);
  const bolt = new THREE.Group(); const segs = [];
  for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(segGeo, boltMat); segs.push(s); bolt.add(s); }
  const flash = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), boltMat); bolt.add(flash);
  bolt.visible = false; ctx.group.add(bolt);
  const tgt = new THREE.Vector3(), src = new THREE.Vector3(), pts = [...Array(9)].map(() => new THREE.Vector3());
  let striking = false, lastCyc = -1;
  return {
    update(dt, t) {
      const T = ((t + offset) % period + period) % period, cyc = Math.floor((t + offset) / period);
      if (cyc !== lastCyc) {
        lastCyc = cyc;
        const [kk, lf] = spots[((cyc % spots.length) + spots.length) % spots.length];
        const i = tr.kToIndex(kk) + ((cyc * 7) % 11) - 5, ii = tr.wrap(i);
        tr.at(ii, (lf + (((cyc * 13) % 7) - 3) * 0.06) * tr.HW[ii], 0.08, tgt);
      }
      marker.visible = T < warn + 0.35;
      if (marker.visible) { marker.position.copy(tgt); marker.material.opacity = T < warn ? 0.35 + 0.5 * Math.abs(Math.sin(t * 14)) : 1; marker.scale.setScalar(T < warn ? 1.5 - T / warn * 0.5 : 1); }
      striking = T >= warn && T < warn + 0.35;
      bolt.visible = striking;
      if (striking) {
        source.getWorldPosition(src);
        for (let k = 0; k <= 8; k++) {
          const f = k / 8;
          pts[k].lerpVectors(src, tgt, f);
          if (k > 0 && k < 8) { pts[k].x += (Math.random() - 0.5) * 5; pts[k].z += (Math.random() - 0.5) * 5; }
        }
        for (let k = 0; k < 8; k++) { const s = segs[k]; s.position.copy(pts[k]); s.lookAt(pts[k + 1]); s.scale.set(1 + Math.random(), 1, pts[k].distanceTo(pts[k + 1])); }
        flash.position.copy(tgt); flash.scale.setScalar(0.6 + Math.random() * 0.6);
        if (T - dt < warn) { ctx.world.race?.fx.explosion(tgt); ctx.world.race?.audio.sfx('storm', tgt); }
      }
    },
    test(p) { return striking && Math.hypot(p.x - tgt.x, p.z - tgt.z) < 4.2 && Math.abs(p.y - tgt.y) < 6 ? 'spin' : null; },
    near(p, r) { return marker.visible && Math.hypot(p.x - tgt.x, p.z - tgt.z) < 4.2 + r; },
  };
}

// Captain America throws his shield across the road; it curves back like a boomerang.
function shieldThrow(ctx, k, side, { period = 4.4, offset = 0, s = 2.6 } = {}) {
  const tr = ctx.track, i = tr.kToIndex(k);
  const cap = captain(); cap.root.scale.setScalar(s);
  const home = tr.at(i, side * (tr.HW[i] + tr.SH[i] + 2.5), 0);
  cap.root.position.copy(home);
  const far = tr.at(i + 6, -side * (tr.HW[i] + 1), 1.6);
  const hand = tr.at(i, side * (tr.HW[i] + tr.SH[i]), 3.2);
  faceTo(cap.root, far.x, far.z);
  ctx.group.add(cap.root);
  const fly = shieldMesh(2.1); fly.visible = false; ctx.group.add(fly);
  const tx = tr.T[i * 3], tz = tr.T[i * 3 + 2];
  const pos = new THREE.Vector3();
  let out = false;
  return {
    update(dt, t) {
      const T = ((t + offset) % period + period) % period;
      out = T > 1.5 && T < 3.9;
      cap.shield.visible = !out;
      fly.visible = out;
      if (T < 1.0) { cap.armL.rotation.x = -0.3; cap.armL.rotation.z = 0.2; cap.armR.rotation.x = Math.sin(t * 3) * 0.2; }
      else if (T < 1.5) { const f = (T - 1.0) / 0.5; cap.armL.rotation.x = -0.3 - f * 0.6; cap.armL.rotation.z = 0.2 + f * 1.0; cap.root.rotation.z = 0; }
      else if (out) {
        const u = T < 2.7 ? (T - 1.5) / 1.2 : 1 - (T - 2.7) / 1.2;
        const f = u * u * (3 - 2 * u);
        pos.lerpVectors(hand, far, f);
        pos.x += tx * Math.sin(f * Math.PI) * 7; pos.z += tz * Math.sin(f * Math.PI) * 7;
        pos.y = hand.y + (far.y - hand.y) * Math.min(1, f * 1.6);
        fly.position.copy(pos);
        fly.rotation.y += dt * 18; fly.rotation.x = 0.12;
        cap.armL.rotation.x = -1.4; cap.armL.rotation.z = -0.2;
      } else { cap.armL.rotation.x = -1.0; cap.armL.rotation.z = 0.3; }
    },
    test(p) { return out && Math.hypot(p.x - pos.x, p.z - pos.z) < 3.2 && Math.abs(p.y - pos.y) < 3.5 ? 'spin' : null; },
    near(p, r) { return out && Math.hypot(p.x - pos.x, p.z - pos.z) < 3.2 + r; },
  };
}

// Spider-Man's web splats stuck on the road
let webTex = null;
function webPatch(ctx, i, lat) {
  const tr = ctx.track;
  webTex ||= canvasTexture(256, 256, (g, w) => {
    const c = w / 2; g.clearRect(0, 0, w, w); g.strokeStyle = '#f8f8f8'; g.lineWidth = 5; g.lineCap = 'round';
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * 0.95, c + Math.sin(a) * c * 0.95); g.stroke(); }
    for (let r = 0.18; r < 0.95; r += 0.16) { g.beginPath(); for (let k = 0; k <= 12; k++) { const a = k / 12 * 6.283; g.lineTo(c + Math.cos(a) * c * r, c + Math.sin(a) * c * r); } g.stroke(); }
  });
  const p = tr.at(i, lat, 0.07);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: webTex, transparent: true, depthWrite: false, roughness: 0.6, emissive: 0x666666, emissiveMap: webTex }));
  m.position.copy(p); m.rotation.y = tr.yawAt(i) + 0.3; ctx.group.add(m);
  return {
    update() {},
    test(q) { return Math.hypot(q.x - p.x, q.z - p.z) < 2.6 && Math.abs(q.y - p.y) < 2 ? 'spin' : null; },
    near(q, r) { return Math.hypot(q.x - p.x, q.z - p.z) < 2.6 + r; },
  };
}

// ---- meshes for movers -----------------------------------------------------------------------
function cabMesh() {
  const b = new BrickBuilder(1);
  b.box(0, 0.5, 0, 2.7, 1.3, 5.4, C.yellow);
  b.box(0, 1.8, -0.4, 2.4, 1.0, 2.8, C.yellow);
  b.box(0, 1.9, 0.9, 2.2, 0.8, 0.1, 0, { mat: plastic(0x2a3a4a, { trans: true, opacity: 0.7 }) });
  b.box(0, 2.8, -0.4, 1.0, 0.4, 0.4, C.white);
  b.box(0, 0.9, 0, 2.75, 0.25, 5.45, C.black);
  for (const [x, z] of [[1.25, 1.7], [-1.25, 1.7], [1.25, -1.7], [-1.25, -1.7]]) b.cyl(x, 0, z, 0.55, 0.5, C.black, { seg: 10 });
  for (const sd of [-1, 1]) b.box(sd * 0.85, 0.8, 2.72, 0.5, 0.35, 0.05, 0, { mat: glow(0xfff0a0, 1.5) });
  return b.build({ name: 'cab' });
}
function cartMesh() {
  const b = new BrickBuilder(1);
  b.box(0, 0.5, 0, 2.8, 1.8, 4.6, 0x3a3e48);
  b.box(0, 2.3, 0, 2.9, 0.3, 4.7, M.gold);
  for (let k = 0; k < 5; k++) b.cone(-0.8 + (k % 3) * 0.8, 2.3, -1.4 + k * 0.7, 0.5, 1.4, 0, { mat: glow(M.vib, 1.8), seg: 5 });
  b.box(0, 0.1, 0, 2.2, 0.4, 4, 0, { mat: glow(M.vib, 2) });
  return b.build({ name: 'cart' });
}

// ---- scenery helpers ----------------------------------------------------------------------------
function panthers(b, x, z, yaw, s = 1) {
  // a giant sitting panther statue (Wakanda)
  const ca = Math.cos(yaw), sa = Math.sin(yaw);
  const L = (fx, fz) => [x + ca * fx + sa * fz, z - sa * fx + ca * fz];
  const blk = 0x202228;
  let [px, pz] = L(0, 0); b.box(px, 0, pz, 14 * s, 3 * s, 20 * s, C.dkstone, { rot: yaw });
  [px, pz] = L(0, -3 * s); b.boxM(mat4(px, 11 * s, pz, -0.35, yaw, 0, 9 * s, 16 * s, 9 * s), blk);
  for (const sd of [-1, 1]) { [px, pz] = L(sd * 3 * s, 4 * s); b.box(px, 3 * s, pz, 2.4 * s, 10 * s, 2.6 * s, blk, { rot: yaw }); [px, pz] = L(sd * 3.5 * s, -5 * s); b.box(px, 3 * s, pz, 3.6 * s, 5 * s, 9 * s, blk, { rot: yaw }); }
  [px, pz] = L(0, 2.5 * s); b.box(px, 18 * s, pz, 7 * s, 6 * s, 7 * s, blk, { rot: yaw });
  [px, pz] = L(0, 6.5 * s); b.box(px, 18.3 * s, pz, 4 * s, 3.2 * s, 2.5 * s, blk, { rot: yaw });
  for (const sd of [-1, 1]) {
    [px, pz] = L(sd * 2.4 * s, 2.5 * s); b.cone(px, 24 * s, pz, 1.4 * s, 2.6 * s, blk, { seg: 4 });
    [px, pz] = L(sd * 1.8 * s, 6.1 * s); b.box(px, 21.5 * s, pz, 1.4 * s, 0.7 * s, 0.4 * s, 0, { rot: yaw, mat: glow(0xa06aff, 2.2) });
  }
  [px, pz] = L(0, -11 * s); b.boxM(mat4(px, 1.2 * s, pz, 0, yaw, 0, 1.6 * s, 1.6 * s, 10 * s), blk);
}
function waterfall(ctx, x, y, z, w, h, yaw) {
  const mat = texMat('fall', 64, 256, (g, W, H) => { for (let yy = 0; yy < H; yy += 8) { g.fillStyle = yy % 16 ? '#ffffff' : '#bfe8ff'; g.fillRect(0, yy, W, 8); } }, { transparent: true, opacity: 0.85, emissive: 0x3a7aaa, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y + h / 2, z); m.rotation.y = yaw;
  ctx.scene.add(m);
  return mat;
}

export default {
  id: 'marvel', name: 'Avengers Brick Assemble', subtitle: 'Battle of New York, the Bifrost, Wakanda and the Guardians',
  cup: 'movie', seed: 199, width: 28, shoulder: 4, edge: 'wall', start: 0.5,
  points: [[-278, -160, 0], [-280, -61, 0], [-271, 38, 0], [-230, 132, 3], [-141, 177, 9], [-49, 158, 16], [36, 188, 22], [120, 226, 28], [221, 235, 30], [299, 202, 30], [357, 120, 16], [367, 19, 4], [316, -55, 0], [338, -141, 0], [267, -209, 0], [158, -188, 0], [66, -136, 0], [-38, -175, 0], [-155, -224, 0]],
  sections: [
    { from: 2.95, to: 6.7, shoulder: 2 },
    { from: 6.7, to: 9.12, surface: 'rainbow', edge: 'void', shoulder: 0, support: 'none', width: 26 },
    { from: 9.12, to: 10.42, gap: true },
    { from: 10.42, to: 11.3, surface: 'wakanda', edge: 'fence', shoulder: 5, support: 'bank' },
    { from: 11.3, to: 12.45, surface: 'wakanda', edge: 'open', shoulder: 10 },
    { from: 12.45, to: 13.5, surface: 'vibranium', edge: 'wall', shoulder: 2, width: 26 },
    { from: 13.5, to: 13.9, surface: 'wakanda', edge: 'open', shoulder: 8 },
    { from: 15.38, to: 15.44, gap: true },
  ],
  items: [1.0, 4.3, 7.2, 11.0, 13.95, 16.8],
  boosts: [[3.3, 0], [5.6, -0.4], [8.55, 0], [10.9, 0.35], [12.3, 0], [15.1, 0], [17.7, -0.3]],
  ramps: [15.28],
  gliders: [9.0],
  studs: [[0.7, -0.4, 8], [2.6, 0.3, 6], [4.8, 0, 8], [7.6, 0, 8], [11.6, -0.3, 6], [13.0, 0, 8], [14.5, 0.3, 6], [16.2, -0.3, 6], [18.3, 0, 8]],
  theme: {
    sky: [0x3a78c8, 0xd6e6f4, 0x9aa8b8], fog: [0xd0e0ee, 220, 1100], sun: { color: 0xfff0dc, intensity: 2.6, dir: [0.5, 1, 0.35] },
    hemi: [0xdfefff, 0x6a6a72, 1.2], envIntensity: 0.75,
    ground: 0x8d9397, groundPitch: 1.6, shoulder: 0x9aa0a4, dust: 0xb0a890,
    road: { base: '#4a4d50', line: '#f2cd37' },
    surfaces: {
      wakanda: { base: '#9a6a4a', line: '#e3b23c', seams: 'rgba(60,30,10,0.35)' },
      vibranium: { base: '#2a2440', line: '#a06aff', seams: 'rgba(160,106,255,0.55)', emissive: 0x4a2a8a, emissiveIntensity: 0.5, metal: 0.3, rough: 0.35 },
    },
    wall: [M.red, C.white, M.blue], curb: [M.red, C.white], gate: [M.red, M.blue], fence: [0x202228, M.gold],
    support: 'pillar', pillar: C.ltgray, pillar2: C.white, skirt: ['#a0a5a9', '#7c8084'], skirtColor: C.ltgray,
    rail: 0x9fe8ff, rampSide: M.blue, ramp: M.red,
    music: { bpm: 140, root: 62, scale: 'major', style: 'rock' },
  },
  decor(ctx) {
    const { b, rand, track: tr, scene } = ctx;
    const I = (k) => tr.kToIndex(k);
    const P = (k, lat = 0, h = 0) => tr.at(I(k), lat, h);
    const edgeLat = (k, extra = 0) => tr.HW[I(k)] + tr.SH[I(k)] + extra;
    const figs = [];
    const add = (f, s, x, y, z, lookX, lookZ) => { f.root.scale.setScalar(s); f.root.position.set(x, y, z); if (lookX !== undefined) faceTo(f.root, lookX, lookZ); ctx.group.add(f.root); figs.push(f); return f; };
    const addAt = (f, s, k, lat, h = 0) => { const p = P(k, lat, h); const c = P(k, 0, 0); return add(f, s, p.x, p.y, p.z, c.x, c.z); };

    // ---- ground: Asgard's cosmic sea under the Bifrost + Warrior Falls gorge, Wakanda grass ------
    const seaK = (i) => inRange(tr, i, 6.55, 10.3);
    const ASG = [310, 442];
    const cut = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = '#000'; strokeTrack(g, tr, toPx, sc, 58, seaK);
      disc(g, toPx, sc, ASG[0], ASG[1], 190); disc(g, toPx, sc, 170, 367, 112); disc(g, toPx, sc, 442, 310, 104);
    });
    ctx.cutGround(cut);
    const sea = ctx.makeMask(1800, 1024, (g, toPx, sc) => {
      g.fillStyle = '#fff'; strokeTrack(g, tr, toPx, sc, 62, seaK);
      disc(g, toPx, sc, ASG[0], ASG[1], 194); disc(g, toPx, sc, 170, 367, 116); disc(g, toPx, sc, 442, 310, 108);
    });
    liquid(ctx, sea, 0x1a3a9a, -7, { size: 1800, speed: 0.04, emissive: 0x10206a, opacity: 0.92 });
    const isSea = (x, z) => !cut.test(x, z);
    const inWak = (x, z) => ((x > 180 && z < 170) || (x > 400 && z < 440)) && !isSea(x, z) && !(z < -215 && x < 240);
    const wak = ctx.makeMask(1800, 1024, (g, toPx, sc) => {
      g.fillStyle = '#fff';
      const pts = [[180, 170], [400, 170], [400, 440], [900, 440], [900, -900], [240, -900], [240, -215], [180, -190]];
      g.beginPath(); pts.forEach(([x, z], n) => { const [a, c] = toPx(x, z); if (n) g.lineTo(a, c); else g.moveTo(a, c); }); g.closePath(); g.fill();
      g.fillStyle = '#000'; strokeTrack(g, tr, toPx, sc, 58, seaK); disc(g, toPx, sc, 442, 310, 104);
    });
    const wakG = groundPlane(0x5a9a3a, -0.04, 1800, 1.6, { mask: wak }); wakG.material.polygonOffset = true; wakG.material.polygonOffsetFactor = -1; wakG.material.polygonOffsetUnits = -2; scene.add(wakG);
    // Asgard island
    b.cyl(ASG[0], -8, ASG[1] + 40, 118, 7.6, C.dktan, { seg: 40 });
    b.cyl(ASG[0], -0.4, ASG[1] + 40, 112, 0.4, 0xd8b84a, { seg: 40 });
    for (let n = 0; n < 24; n++) { const a = n / 24 * 6.283; rock(b, ASG[0] + Math.cos(a) * 116, -3, ASG[1] + 40 + Math.sin(a) * 116, 2.2, rand, [C.dkstone, C.dktan]); }
    ctx.claim(ASG[0], ASG[1] + 40, 120);

    // ---- New York: Park Avenue, Grand Central, Avengers Tower --------------------------------
    const TW = [-167, 73];
    ctx.claim(TW[0], TW[1], 34);
    // Avengers Tower
    {
      const x = TW[0], z = TW[1];
      const glass = 0x46627e, gm = plastic(glass, { rough: 0.1, metal: 0.5 });
      building(b, x, z, 36, 36, 6, C.ltgray, rand, { glass, trim: C.white });
      let y = 20.5;
      for (let f = 0; f < 30; f++) {
        b.box(x, y, z, 26, 3.2, 22, 0, { mat: gm });
        b.box(x, y + 3.2, z, 26.4, 0.4, 22.4, f % 5 === 4 ? C.white : C.ltgray);
        y += 3.6;
      }
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b.box(x + sx * 13.2, 20.5, z + sz * 11.2, 1.4, y - 20.5 + 4, 1.4, C.white);
      // the crown: glass drum, flat roof, landing pad and spire
      const dy = y;
      b.cyl(x, y, z, 14, 20, 0, { seg: 28, mat: gm });
      for (let k = 0; k < 4; k++) b.cyl(x, y + 4 + k * 4.4, z, 14.3, 0.5, C.white, { seg: 28 });
      y += 20;
      b.cyl(x, y, z, 15.5, 1.4, C.ltgray, { seg: 28 });
      b.box(x + 10, dy - 6, z + 13, 6, 6, 10, C.ltgray);
      b.cyl(x + 10, dy, z + 19, 9, 1.2, C.dkgray, { seg: 24 });
      b.cyl(x + 10, dy + 1.2, z + 19, 7.5, 0.12, C.yellow, { seg: 24 });
      b.box(x - 11, y, z - 3, 2.6, 34, 2.6, C.white); b.cyl(x - 11, y + 34, z - 3, 0.3, 10, C.ltgray, { seg: 6 });
      const top = y + 1.4;
      y = dy + 10;
      // big "A" logos
      const logo = texMat('alogo', 256, 256, (g, w) => {
        g.clearRect(0, 0, w, w); const c = w / 2;
        g.strokeStyle = '#eef6ff'; g.lineWidth = 16; g.beginPath(); g.arc(c, c, c * 0.84, 0.25, Math.PI * 2 - 0.25); g.stroke();
        g.fillStyle = '#eef6ff'; g.beginPath(); g.moveTo(c - 70, c + 90); g.lineTo(c + 10, c - 105); g.lineTo(c + 45, c - 105); g.lineTo(c + 45, c + 90); g.lineTo(c + 12, c + 90); g.lineTo(c + 12, c + 45); g.lineTo(c - 25, c + 45); g.lineTo(c - 45, c + 90); g.closePath(); g.fill();
        g.fillStyle = '#46627e'; g.beginPath(); g.moveTo(c - 12, c + 18); g.lineTo(c + 12, c - 45); g.lineTo(c + 12, c + 18); g.closePath(); g.fill();
        g.fillRect(c + 45, c - 8, 80, 16);
      }, { transparent: true, alphaTest: 0.4, emissive: 0xffffff, emissiveIntensity: 0.8, side: THREE.DoubleSide });
      for (const a of [Math.atan2(-140, -300), Math.atan2(-40, 140)]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(17, 17), logo);
        m.position.set(x + Math.sin(a) * 14.6, y, z + Math.cos(a) * 14.6); m.rotation.y = a;
        ctx.group.add(m);
      }
      // Loki on the roof with the scepter, the Tesseract beam and the Chitauri portal
      const lk = add(loki(), 3.4, x + 2, top, z - 4, -300, -200);
      lk.armR.rotation.x = -2.4;
      b.box(x + 9, top, z - 2, 3, 3, 3, C.dkgray);
      b.box(x + 9, top + 3, z - 2, 1.6, 1.6, 1.6, 0, { mat: glow(0x3ab0ff, 3) });
      const PORT = new THREE.Vector3(x + 9, top + 150, z - 2);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, PORT.y - top - 4, 10, 1, true).translate(0, (PORT.y - top - 4) / 2, 0), new THREE.MeshBasicMaterial({ color: 0x6ad0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      beam.position.set(x + 9, top + 4.6, z - 2); scene.add(beam);
      const hole = new THREE.Group(); hole.position.copy(PORT);
      const starTex = canvasTexture(512, 512, (g, w) => {
        const c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, '#000010'); gr.addColorStop(0.7, '#0a0a3a'); gr.addColorStop(0.92, '#5ab0ff'); gr.addColorStop(1, 'rgba(120,200,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill();
        for (let k = 0; k < 260; k++) { const a = Math.random() * 6.28, r = Math.random() * c * 0.8; g.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 2, 2); }
      });
      const disk = new THREE.Mesh(new THREE.CircleGeometry(60, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: starTex, transparent: true, fog: false, side: THREE.DoubleSide, depthWrite: false }));
      hole.add(disk);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(58, 2.2, 8, 64).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, fog: false }));
      hole.add(rim);
      hole.rotation.x = 0.25;
      scene.add(hole);
      // chitauri swarm spilling out of the portal
      const swarm = [];
      for (let n = 0; n < 7; n++) { const c = chariot(); c.scale.setScalar(1.6); scene.add(c); swarm.push({ c, r: 40 + n * 12, s: 0.25 + (n % 3) * 0.08, o: n * 0.9, h: -20 - n * 9 }); }
      // Iron Man flying loops round the tower
      const im = ironman(); im.root.scale.setScalar(2.6); scene.add(im.root);
      im.root.rotation.order = 'YXZ';
      ctx.anim((dt, t) => {
        disk.rotation.y = t * 0.15; rim.rotation.y = -t * 0.3;
        beam.material.opacity = 0.55 + Math.sin(t * 17) * 0.15;
        for (const q of swarm) { const a = t * q.s + q.o; q.c.position.set(PORT.x + Math.cos(a) * q.r, PORT.y + q.h + Math.sin(t + q.o) * 6, PORT.z + Math.sin(a) * q.r); q.c.rotation.y = -a; }
        const a = t * 0.45, R = 62;
        im.root.position.set(x + Math.cos(a) * R, 70 + Math.sin(a * 2) * 26, z + Math.sin(a) * R);
        im.root.rotation.y = -a + Math.PI; im.root.rotation.x = Math.PI / 2 - Math.cos(a * 2) * 0.5; im.root.rotation.z = Math.sin(t * 0.7) > 0.8 ? (t * 6) % 6.283 : 0;
        im.armL.rotation.x = im.armR.rotation.x = 0.25; im.armL.rotation.z = 0.25; im.armR.rotation.z = -0.25;
        im.jets.scale.y = 0.8 + Math.random() * 0.5;
      });
      // Leviathan circling Midtown
      const lev = leviathanParts(); const segs = [];
      scene.add(lev.head); for (let n = 0; n < 9; n++) { const s = lev.seg.clone(); scene.add(s); segs.push(s); } scene.add(lev.tail); segs.push(lev.tail);
      const levPos = (u, out) => out.set(-226 + Math.cos(u) * 140, 88 + Math.sin(u * 2) * 10, 38 + Math.sin(u) * 104);
      ctx.anim((dt, t) => {
        const u0 = t * 0.09;
        levPos(u0, lev.head.position); levPos(u0 + 0.02, V1); lev.head.lookAt(V1);
        segs.forEach((s, n) => { const u = u0 - 0.055 * (n + 1); levPos(u, s.position); s.position.y += Math.sin(t * 2 - n * 0.6) * 2; levPos(u + 0.02, V2); s.lookAt(V2); });
      });
    }
    // Grand Central Terminal (east side of Park Avenue)
    {
      const i = I(1.75), p = tr.at(i, edgeLat(1.75, 26), 0), yaw = tr.yawAt(i);
      const cx = p.x, cz = p.z;
      b.box(cx, 0, cz, 32, 16, 42, C.tan, { rot: yaw });
      b.box(cx, 16, cz, 34, 2, 44, C.dktan, { rot: yaw });
      b.box(cx, 18, cz, 20, 3, 30, C.tan, { rot: yaw });
      const rx = tr.R[i * 2], rz = tr.R[i * 2 + 1];
      const fx = cx - rx * 16.2, fz = cz - rz * 16.2;
      for (let k = -1; k <= 1; k++) {
        const ox = Math.sin(yaw) * k * 12, oz = Math.cos(yaw) * k * 12;
        b.box(fx + ox, 3, fz + oz, 0.4, 10, 8, 0, { rot: yaw, mat: plastic(0x3a5a7a, { rough: 0.1, metal: 0.4 }) });
        b.cyl(fx + ox, 13, fz + oz, 4, 0.2, C.tan, { seg: 12 });
      }
      for (let k = -2; k <= 2; k++) b.box(fx + Math.sin(yaw) * k * 6, 0, fz + Math.cos(yaw) * k * 6, 1.6, 16, 1.6, C.white, { rot: yaw });
      b.cyl(fx + rx * 0.6, 17, fz + rz * 0.6, 2.2, 0.6, M.gold, { seg: 16 });
      b.box(fx, 19.5, fz, 1.2, 4, 6, M.gold, { rot: yaw });
      ctx.claim(cx, cz, 30);
    }
    // Sanctum Sanctorum (177A Bleecker Street) with Doctor Strange and his portal over the road
    {
      const k = 2.35, i = I(k), yaw = tr.yawAt(i), p = tr.at(i, -edgeLat(k, 20), 0);
      b.box(p.x, 0, p.z, 22, 24, 18, 0x7c4a3a, { rot: yaw });
      for (let f = 0; f < 3; f++) b.box(p.x, 7.8 + f * 7.6, p.z, 22.6, 0.6, 18.6, C.tan, { rot: yaw });
      const rx = tr.R[i * 2], rz = tr.R[i * 2 + 1];
      const fx = p.x + rx * 11.05, fz = p.z + rz * 11.05;
      for (let f = 0; f < 2; f++) for (const o of [-6, 6]) b.box(fx + Math.sin(yaw) * o, 2 + f * 7.6, fz + Math.cos(yaw) * o, 0.4, 4.5, 3.6, 0, { rot: yaw, mat: plastic(0x2a3a4a, { rough: 0.1 }) });
      const win = texMat('seal', 256, 256, (g, w) => {
        const c = w / 2; g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 10; g.beginPath(); g.arc(c, c, c - 8, 0, 7); g.stroke();
        g.lineWidth = 9; for (let k = 0; k < 3; k++) { const a = k * 2.094 - Math.PI / 2; g.beginPath(); g.arc(c + Math.cos(a) * 36, c + Math.sin(a) * 36, 50, a + 2.2, a + 5.2); g.stroke(); }
        g.beginPath(); g.arc(c, c, 26, 0, 7); g.stroke();
      }, { emissive: 0xffffff, emissiveIntensity: 0.35 });
      const wm = new THREE.Mesh(new THREE.CircleGeometry(4.5, 28), win);
      wm.position.set(fx + rx * 0.25, 19, fz + rz * 0.25); wm.rotation.y = Math.atan2(rx, rz);
      for (let n = 0; n < 4; n++) b.box(fx + rx * (0.6 + n * 0.6), 0, fz + rz * (0.6 + n * 0.6), 4, 1.6 - n * 0.4, 0.6, C.tan, { rot: yaw });
      b.box(p.x, 24, p.z, 23, 1.2, 19, C.tan, { rot: yaw });
      ctx.group.add(wm);
      b.box(fx, 0, fz, 1.2, 3.6, 3, 0x3a1a10, { rot: yaw });
      ctx.claim(p.x, p.z, 16);
      // Doctor Strange floats in front with spinning mandalas
      const sp = tr.at(i, -edgeLat(k, 4.5), 4);
      const ds = add(strange(), 2.6, sp.x, sp.y, sp.z, tr.px(i), tr.pz(i));
      ds.armL.rotation.x = ds.armR.rotation.x = -1.4; ds.armL.rotation.z = 0.5; ds.armR.rotation.z = -0.5;
      const mands = [];
      for (const s of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), mandalaMat()); m.position.set(s * 1.9, 2.1, 1.3); m.scale.setScalar(0.8); ds.root.add(m); mands.push(m); }
      // the portal ring over the road
      const pk = 2.72, pi = I(pk), pc = tr.at(pi, 0, 0);
      const R = tr.HW[pi] + tr.SH[pi] + 3.5;
      const ring = new THREE.Group(); ring.position.copy(pc); ring.rotation.y = tr.yawAt(pi); ctx.group.add(ring);
      const orange = new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const t1 = new THREE.Mesh(new THREE.TorusGeometry(R, 0.8, 6, 64), orange); ring.add(t1);
      const t2 = new THREE.Mesh(new THREE.TorusGeometry(R - 1.6, 0.35, 5, 64), orange); ring.add(t2);
      for (const sd of [-1, 1]) { const q = tr.at(pi, sd * (R - 1), 0); b.box(q.x, 0, q.z, 2, 1, 2, C.dkgray); }
      ctx.anim((dt, t) => {
        ds.root.position.y = sp.y + Math.sin(t * 1.3) * 0.8;
        mands.forEach((m, n) => { m.rotation.z = t * (n ? -2 : 2); });
        t1.rotation.z = t * 1.5; t2.rotation.z = -t * 2.2;
        if (Math.random() < 0.5) { const a = Math.random() * Math.PI; ctx.world.race?.fx.spark(pc.x + Math.cos(ring.rotation.y) * Math.cos(a) * R, pc.y + Math.sin(a) * R, pc.z - Math.sin(ring.rotation.y) * Math.cos(a) * R, (Math.random() - 0.5) * 6, -3, (Math.random() - 0.5) * 6, 0xffa030, 0.5, 8); }
      });
    }
    // Spider-Man swinging across Park Avenue between two towers
    {
      const k = 18.3, i = I(k), yaw = tr.yawAt(i);
      for (const sd of [-1, 1]) { const p = tr.at(i, sd * edgeLat(k, 10), 0); building(b, p.x, p.z, 16, 16, 16, sd > 0 ? C.sand : C.white, rand, { glass: 0x3a5a7a, trim: C.dkgray }); ctx.claim(p.x, p.z, 12); }
      const piv = new THREE.Group(); piv.position.copy(tr.at(i, 0, 46)); piv.rotation.y = yaw; ctx.group.add(piv);
      const swing = new THREE.Group(); piv.add(swing);
      const L = 27;
      const web = new THREE.Mesh(new THREE.BoxGeometry(0.2, L, 0.2).translate(0, -L / 2, 0), plastic(C.white)); swing.add(web);
      const sm = spiderman(); sm.root.scale.setScalar(2.3);
      sm.armR.rotation.x = -Math.PI; sm.armL.rotation.x = -0.6; sm.armL.rotation.z = 0.9;
      const hang = new THREE.Group(); hang.position.y = -L; swing.add(hang);
      sm.root.position.set(0.7 * 2.3, -4.0 * 2.3, 0); hang.add(sm.root);
      ctx.anim((dt, t) => { const a = Math.sin(t * 1.1) * 0.95; swing.rotation.z = a; hang.rotation.z = -a * 0.25; hang.rotation.y = Math.PI / 2 + Math.cos(t * 1.1) * 0.6; sm.armL.rotation.x = -0.6 + Math.sin(t * 2.2) * 0.4; });
      [[18.15, 0.45], [18.38, -0.4], [18.6, 0.1]].forEach(([kk, l]) => ctx.hazard(webPatch(ctx, I(kk), l * tr.HW[I(kk)])));
    }
    // Hulk leaping onto Park Avenue
    ctx.hazard(hulkLeap(ctx, 2.0, 1, { period: 5.6 }));
    // yellow cabs
    [[0.4, 18], [-0.4, 20], [0.35, 19]].forEach(([lat, sp], n) => ctx.hazard(trackMover(ctx, { mesh: cabMesh(), from: 17.3, to: 2.95, oneWay: true, lat, speed: sp, radius: 2.2, kind: 'bump', offset: n / 3 + 0.1 })));
    // Chitauri chariots strafing the viaduct (oncoming)
    [[3.75, 0], [4.7, 0.5], [5.6, 0.25]].forEach(([k, o]) => {
      const i = I(k), w = tr.HW[i] + 6;
      ctx.hazard(mover(ctx, { mesh: chariot(), path: [tr.at(i - 6, -w, 0), tr.at(i + 6, w, 0)], loop: false, speed: 8, radius: 2.3, kind: 'bump', yOffset: 1.6, offset: o, bob: 3 }));
    });
    // Battle of New York wreckage: rubble, crashed chariots, police cars
    edges(ctx, 0.2, 2.9, 26, 5, (p, i, sd) => {
      if (!ctx.free(p.x, p.z, 3)) return;
      const r = rand();
      if (r < 0.35) { const c = chariot(); c.position.set(p.x, 0.6, p.z); c.rotation.set(0.35 * sd, rand() * 6, 0.5); bake(b, c); }
      else if (r < 0.6) {
        const yaw = rand() * 6;
        b.box(p.x, 0, p.z, 2.6, 1.3, 5.2, C.white, { rot: yaw }); b.box(p.x, 1.3, p.z, 2.3, 1, 2.6, C.dkblue, { rot: yaw });
        b.box(p.x, 2.3, p.z, 1.6, 0.3, 0.5, 0, { rot: yaw, mat: glow(rand() < 0.5 ? 0xff2020 : 0x2060ff, 2) });
      } else for (let n = 0; n < 6; n++) b.boxM(mat4(p.x + (rand() - 0.5) * 5, rand() * 1.5, p.z + (rand() - 0.5) * 5, rand(), rand() * 3, rand(), 1.5 + rand() * 2, 1 + rand(), 1.5 + rand() * 2), pick(rand, [C.ltgray, C.tan, C.dkgray, 0x8a4a3a]));
      ctx.claim(p.x, p.z, 3);
    });
    // Hawkeye and Black Widow on the rooftops along the viaduct
    {
      const hk = 4.35, hi = I(hk), hp = tr.at(hi, -edgeLat(hk, 12), 0);
      const top = building(b, hp.x, hp.z, 16, 16, 5, C.dkgray, rand, { glass: 0x2d4d6d, trim: C.white });
      ctx.claim(hp.x, hp.z, 12);
      const hw = add(hawkeye(), 2.4, hp.x, top, hp.z, TW[0], TW[1]);
      hw.armL.rotation.x = -1.9; hw.armL.rotation.z = -0.2;
      const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3), plastic(M.purple)); scene.add(arrow);
      const from = new THREE.Vector3(hp.x, top + 7, hp.z);
      ctx.anim((dt, t) => {
        const T = t % 2.4;
        hw.armR.rotation.x = T < 1.2 ? -1.9 + T * 0.3 : -1.9; hw.armR.rotation.z = T < 1.2 ? -T * 0.5 : -0.2;
        hw.root.rotation.y = Math.atan2(TW[0] - hp.x, TW[1] - hp.z) + Math.sin(t * 0.4) * 0.6;
        arrow.visible = T > 1.2;
        if (arrow.visible) { const f = (T - 1.2) / 1.2, a = hw.root.rotation.y; arrow.position.set(from.x + Math.sin(a) * f * 90, from.y + f * 70 - f * f * 20, from.z + Math.cos(a) * f * 90); arrow.rotation.set(-0.6 + f * 0.6, a, 0, 'YXZ'); }
      });
      const wk = 5.35, wi = I(wk), wp = tr.at(wi, edgeLat(wk, 11), 0);
      const wtop = building(b, wp.x, wp.z, 14, 14, Math.round((tr.py(wi) + 1) / 3.3), C.white, rand, { glass: 0x2d4d6d, trim: C.dkgray });
      ctx.claim(wp.x, wp.z, 11);
      const bw = add(widow(), 2.3, wp.x, wtop, wp.z, tr.px(wi), tr.pz(wi));
      ctx.anim((dt, t) => { bw.armL.rotation.x = -1.2 + Math.sin(t * 4) * 0.8; bw.armR.rotation.x = -1.2 - Math.sin(t * 4) * 0.8; bw.root.rotation.y = Math.atan2(tr.px(wi) - wp.x, tr.pz(wi) - wp.z) + Math.sin(t * 2) * 0.5; });
    }
    // Manhattan blocks
    const nyc = (x, z) => (x < 90 && z > -170) || (x < 140 && z > 200);
    const glasses = [0x2d4d6d, 0x3a5a6a, 0x4a4a5a, 0x5a7a9a, 0x2a3a4a, 0x6a8aa0];
    const cols = [C.white, C.tan, C.sand, C.ltgray, C.dkgray, 0xb08a6a, C.rbrown, 0xd8d0c0, C.mdblue, 0x8a4a3a];
    for (let x = -600; x < 160; x += 30) for (let z = -170; z < 420; z += 30) {
      const bx = x + (rand() - 0.5) * 8, bz = z + (rand() - 0.5) * 8;
      if (!nyc(bx, bz) || isSea(bx, bz)) continue;
      const w = 14 + Math.floor(rand() * 5) * 2, d = 14 + Math.floor(rand() * 5) * 2, r = Math.max(w, d) * 0.72;
      const c = tr.clearance(bx, bz, 160);
      if (c < r + 3 || c > 150 || !ctx.free(bx, bz, r)) continue;
      ctx.claim(bx, bz, r);
      const mid = Math.max(0, 1 - Math.hypot(bx - TW[0], bz - TW[1]) / 260);
      if (Math.hypot(bx - TW[0], bz - TW[1]) < 70) { building(b, bx, bz, w, d, 2 + Math.floor(rand() * 3), pick(rand, cols), rand, { trim: C.white }); continue; }
      building(b, bx, bz, w, d, 3 + Math.floor(rand() * 6 + mid * 10 + rand() * rand() * 10), pick(rand, cols), rand, { trim: pick(rand, [C.white, C.dkgray, C.tan]), glass: pick(rand, glasses) });
    }
    // street lamps and parked cabs along the city blocks
    edges(ctx, 17.4, 2.9, 22, 2.2, (p) => { b.cyl(p.x, p.y, p.z, 0.2, 6, C.dkgray, { seg: 6 }); b.box(p.x, p.y + 6, p.z, 0.8, 0.4, 0.8, 0, { mat: glow(0xffe8a0, 1.2) }); });
    const signs = [['STARK INDUSTRIES', '#1a1d22', '#e3b23c'], ['DAILY BUGLE', '#f4f4f4', '#b3121b'], ['AVENGERS ASSEMBLE', '#1f3a93', '#f4f4f4'], ['S.H.I.E.L.D.', '#1a1d22', '#c8ccd4'], ['OSCORP', '#2a4a3a', '#ffffff']];
    [[0.25, -1], [1.0, 1], [2.1, -1], [17.65, 1], [1.5, -1]].forEach(([k, sd], n) => {
      const i = I(k), p = tr.at(i, edgeLat(k, 6) * sd, 0);
      const [t, bg, fg] = signs[n % signs.length];
      billboard(ctx.group, b, p.x, 0, p.z, tr.yawAt(i) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI / 2, t, bg, fg, 16, 5);
    });

    // ---- Asgard: the Bifrost, Thor, the palace and the observatory -------------------------
    // Thor hovering beside the bridge, calling lightning onto it
    {
      const k = 7.9, i = I(k), p = tr.at(i, -(tr.HW[i] + 9), 14);
      const th = add(thor(), 4.0, p.x, p.y, p.z, tr.px(i), tr.pz(i));
      th.armR.rotation.x = -2.9; th.armL.rotation.x = -0.4; th.armL.rotation.z = 0.5;
      const tip = new THREE.Object3D(); tip.position.set(0, -1.5, 0); th.hammer.add(tip);
      ctx.anim((dt, t) => { th.root.position.y = p.y + Math.sin(t * 1.4) * 1.2; th.hammer.rotation.x = t * 9; th.root.rotation.z = Math.sin(t * 0.9) * 0.08; });
      ctx.hazard(lightning(ctx, tip, [[7.35, -0.4], [7.6, 0.35], [7.85, -0.1], [8.15, 0.45], [8.4, -0.45]], { period: 1.9 }));
      ctx.hazard(lightning(ctx, tip, [[8.3, 0.2], [7.45, 0.1], [8.05, -0.5]], { period: 3.1, offset: 1.0 }));
      // storm clouds over Thor
      for (let n = 0; n < 7; n++) ctx.bNoShadow.sphere(p.x + (rand() - 0.5) * 60, 80 + rand() * 10, p.z + (rand() - 0.5) * 60, 7 + rand() * 5, pick(rand, [0x4a5060, 0x5a6070, 0x3a4050]), { sy: 0.45 });
    }
    // Asgard palace: golden organ-pipe spires on the island
    {
      const [ax, az] = [ASG[0], ASG[1] + 40];
      const gold = [M.gold, C.pearl, 0xd8a830];
      const spire = (x, z, r, h) => { let y = -0.5; const n = 5; for (let k = 0; k < n; k++) y = b.cyl(x, y, z, r * (1 - k * 0.14), h / n, gold[k % 3], { seg: 10 }); b.cone(x, y, z, r * 0.3, h * 0.3, M.gold, { seg: 8 }); };
      spire(ax, az, 16, 120);
      for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, rr = 26 + (k % 3) * 14; spire(ax + Math.cos(a) * rr, az + Math.sin(a) * rr, 5 + (k % 4) * 1.5, 40 + ((k * 37) % 50)); }
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 + 0.3; b.box(ax + Math.cos(a) * 70, -0.5, az + Math.sin(a) * 70, 14, 10 + (k % 3) * 6, 10, C.tan, { rot: -a }); }
    }
    // the observatory at the broken end of the bridge
    {
      const k = 9.2, i = I(k), p = tr.at(i, -(tr.HW[i] + 40), 0);
      b.cyl(p.x, -7, p.z, 4, p.y + 7, M.gold, { seg: 12 });
      b.cyl(p.x, p.y, p.z, 14, 1.2, C.dkgray, { seg: 24 });
      b.sphere(p.x, p.y + 1.2, p.z, 12, M.gold, { sy: 0.8 });
      b.box(p.x, p.y + 10, p.z, 1, 8, 1, M.gold);
    }
    // broken bridge shards tumbling in the gap
    each(tr, 9.12, 9.3, 7, (i) => { const p = tr.at(i, (rand() - 0.5) * 20, -6 - rand() * 14); b.boxM(mat4(p.x, p.y, p.z, rand(), rand() * 3, rand(), 6 + rand() * 6, 1, 4 + rand() * 4), pick(rand, [0xff3a8a, 0x3ad0ff, 0xffe03a, 0x7aff5a, 0xb05aff])); });
    arch(ctx, 8.95, { cols: [0x3ad0ff, M.gold], text: 'BIFROST GLIDE!', bg: '#1a2a6a', fg: '#ffe03a' });

    // ---- Warrior Falls & Wakanda ----------------------------------------------------------------
    {
      // cliffs with waterfalls either side of the glide + spectators on top
      const falls = [];
      for (const [k, sd] of [[9.55, -1], [9.95, 1], [10.2, -1], [9.4, 1]]) {
        const i = I(k), yaw = tr.yawAt(i), p = tr.at(i, sd * (tr.HW[i] + 36), 0);
        let y = -7; for (let n = 0; n < 6; n++) y = b.box(p.x + (rand() - 0.5) * 3, y, p.z + (rand() - 0.5) * 3, 26 - n * 1.6, 5, 22 - n * 1.4, n % 2 ? C.dkstone : 0x6a6a5a, { rot: yaw + rand() * 0.3 });
        for (let n = 0; n < 12; n++) minifig(b, p.x + (rand() - 0.5) * 12, y, p.z + (rand() - 0.5) * 10, rand() * 6, pick(rand, [M.purple, C.red, M.blue, 0x2a7a4a]), rand);
        const fx = p.x - Math.cos(yaw) * sd * -12, fz = p.z + Math.sin(yaw) * sd * -12;
        falls.push(waterfall(ctx, fx, -7, fz, 12, y + 7, yaw + Math.PI / 2));
      }
      ctx.anim((dt, t) => { if (falls[0]) falls[0].map.offset.y = t * 1.6; });
    }
    // giant panther statues guarding the landing
    for (const sd of [-1, 1]) { const k = 10.75, i = I(k), p = tr.at(i, sd * edgeLat(k, 18), 0); panthers(b, p.x, p.z, tr.yawAt(i) + Math.PI, 1.3); ctx.claim(p.x, p.z, 16); }
    arch(ctx, 10.9, { cols: [0x202228, M.gold], text: 'WAKANDA FOREVER', bg: '#202228', fg: '#b07aff' });
    // Black Panther leaping between the rocks
    {
      const k = 11.55, i = I(k), a = tr.at(i, edgeLat(k, 8), 0), c = tr.at(I(k + 0.3), edgeLat(k + 0.3, 10), 0);
      for (const p of [a, c]) { b.cyl(p.x, 0, p.z, 3.4, 7, C.dkstone, { seg: 7 }); b.cyl(p.x, 7, p.z, 2.8, 1, 0x6a6a5a, { seg: 7 }); ctx.claim(p.x, p.z, 5); }
      const bp = add(panther(), 3.2, a.x, 8, a.z, tr.px(i), tr.pz(i));
      const glowMat = bp.root.children[0].children.find((m) => m.material.emissiveMap)?.material;
      ctx.anim((dt, t) => {
        const T = t % 5, from = Math.floor(t / 5) % 2 ? c : a, to = from === a ? c : a;
        if (T < 3.8) { bp.root.position.set(from.x, 8, from.z); bp.root.rotation.x = 0; bp.armL.rotation.x = bp.armR.rotation.x = -0.4 - Math.sin(t * 3) * 0.2; faceTo(bp.root, tr.px(i), tr.pz(i)); }
        else { const f = (T - 3.8) / 1.2; bp.root.position.lerpVectors(from, to, f); bp.root.position.y = 8 + Math.sin(f * Math.PI) * 16; faceTo(bp.root, to.x, to.z); bp.root.rotation.x = f * 6.283; bp.armL.rotation.x = bp.armR.rotation.x = -2.6; }
        if (glowMat) glowMat.emissiveIntensity = 1 + Math.abs(Math.sin(t * 2.2)) * 2.5;
      });
    }
    // Captain America's shield (Battle of Wakanda)
    ctx.hazard(shieldThrow(ctx, 12.05, -1, { period: 4.4 }));
    // Birnin Zana: towers with rounded crowns and green glass
    const teal = 0x3a8a7a, dark = 0x2a2c33;
    const wakTower = (x, z, h, r, col) => {
      const v = rand();
      if (v < 0.4) {
        // stacked drum tower with terraces and a golden crown
        let y = 0; const n = Math.max(3, Math.round(h / 7));
        for (let k = 0; k < n; k++) { y = b.cyl(x, y, z, r * (1 - k * 0.05), 5.4, k % 3 === 1 ? dark : col, { seg: 12 }); y = b.cyl(x, y, z, r * (1.1 - k * 0.05), 1.2, k % 2 ? M.gold : teal, { seg: 12 }); if (k % 2) b.cyl(x, y, z, r * (1 - k * 0.05) - 0.4, 0.6, C.green, { seg: 10 }); }
        b.sphere(x, y, z, r * 0.8, M.gold, { sy: 0.55 });
        b.cyl(x, y + r * 0.4, z, 0.25, r, M.gold, { seg: 6 });
      } else if (v < 0.7) {
        // slim tower with a bulbous (baobab) top
        let y = b.cyl(x, 0, z, r * 0.45, h, col, { seg: 10 });
        for (let k = 1; k < 4; k++) b.cyl(x, h * k / 4, z, r * 0.5, 0.8, teal, { seg: 10 });
        b.sphere(x, y + r * 0.6, z, r * 1.1, dark, { sy: 0.8 });
        b.cyl(x, y + r * 0.35, z, r * 1.12, 1.2, M.gold, { seg: 16 });
        b.sphere(x, y + r * 1.4, z, r * 0.6, C.green, { sy: 0.5 });
      } else {
        // terraced block with a rounded crown and roof gardens
        let y = 0, w = r * 2;
        for (let k = 0; k < 4; k++) { y = b.box(x, y, z, w, h / 4, w * 0.8, k % 2 ? col : dark); b.box(x, y - 1.2, z, w + 0.4, 1.2, w * 0.8 + 0.4, teal); b.box(x, y, z, w * 0.9, 0.6, w * 0.7, C.green); w *= 0.78; }
        b.cyl(x, y, z, w * 0.5, w * 0.4, M.gold, { seg: 14 });
        b.sphere(x, y + w * 0.4, z, w * 0.5, M.gold, { sy: 0.4 });
      }
    };
    ctx.scatter(46, { minC: 10, maxC: 150, r: 9, pad: 200, test: (x, z) => inWak(x, z) && x < 700 }, (x, z, c) => wakTower(x, z, 16 + rand() * 30 + (c > 60 ? rand() * 40 : 0), 4 + rand() * 5, pick(rand, [C.tan, C.dktan, 0xb08a6a, C.sand])));
    ctx.scatter(40, { minC: 2, maxC: 120, r: 3, pad: 220, test: inWak }, (x, z) => { b.cyl(x, 0, z, 0.5, 5, C.rbrown, { seg: 6 }); b.cyl(x, 5, z, 4 + rand() * 2, 1.2, pick(rand, [C.green, 0x6a8a2a, C.dkgreen]), { seg: 10 }); });
    // Mount Bhashanti and the vibranium mine
    {
      const MX = 486, MZ = -150;
      let y = 0;
      for (let k = 0; k < 14; k++) y = b.cyl(MX + Math.sin(k) * 3, y, MZ + Math.cos(k) * 3, 118 - k * 7.6, 5, k % 3 === 2 ? 0x3a4a3a : k % 2 ? C.dkstone : 0x4a5a4a, { seg: 20 });
      ctx.claim(MX, MZ, 120);
      for (let n = 0; n < 26; n++) { const a = rand() * 6.28, r = 30 + rand() * 80; const x = MX + Math.cos(a) * r, z = MZ + Math.sin(a) * r; b.cone(x, Math.max(0, (118 - r) / 7.6 * 5 - 4), z, 2 + rand() * 2, 5 + rand() * 6, 0, { mat: glow(M.vib, 1.8), seg: 5 }); }
      tunnel(ctx, 12.45, 13.5, { wall: 0x3a3e48, roof: 0x2a2c33, height: 11, lights: 0xa06aff });
      each(tr, 12.5, 13.45, 5, (i) => {
        const c = tr.at(i, 0, 0), yaw = tr.yawAt(i);
        b.box(c.x, 12.6, c.z, 2 * (tr.HW[i] + tr.SH[i]) + 12, 6 + rand() * 6, 6, pick(rand, [C.dkstone, 0x4a5a4a, 0x3a4a3a]), { rot: yaw + (rand() - 0.5) * 0.3 });
        for (const sd of [-1, 1]) { const p = tr.at(i, sd * (tr.HW[i] + tr.SH[i] + 0.4), 1 + rand() * 6); b.cone(p.x, p.y, p.z, 0.5, 1.6 + rand(), 0, { mat: glow(M.vib, 2.2), seg: 5 }); }
      });
      [[-0.4, 0], [0.35, 0.5]].forEach(([lat, o]) => ctx.hazard(trackMover(ctx, { mesh: cartMesh(), from: 12.5, to: 13.45, oneWay: true, lat, speed: 12, radius: 2.4, kind: 'bump', offset: o })));
      arch(ctx, 12.42, { cols: [0x2a2c33, M.vib], text: 'VIBRANIUM MINE', bg: '#2a2440', fg: '#c8a0ff' });
    }

    // ---- Stark Expo (Flushing Meadows) ---------------------------------------------------------------
    {
      // Unisphere
      const [ux, uz] = [132, -99];
      const steel = plastic(0xc8ccd2, { metal: 0.6, rough: 0.3 });
      b.cyl(ux, 0, uz, 26, 0.8, C.ltgray, { seg: 28 }); b.cyl(ux, 0.4, uz, 24, 0.5, 0, { seg: 28, mat: plastic(0x3a8ad8, { trans: true, opacity: 0.75, rough: 0.05 }) });
      b.cyl(ux, 0.8, uz, 1.6, 8, C.dkgray, { seg: 10 });
      const cy = 24, R = 16;
      const lat = new THREE.TorusGeometry(1, 0.035, 5, 40);
      for (let k = -3; k <= 3; k++) { const a = k * 0.4, rr = Math.cos(a) * R; b.add(lat.clone().rotateX(Math.PI / 2), steel, ux, cy + Math.sin(a) * R, uz, 0, rr, rr, rr); }
      for (let k = 0; k < 6; k++) b.add(lat, steel, ux, cy, uz, k * Math.PI / 6, R, R, R);
      for (let k = 0; k < 5; k++) { const a = k * 1.3; b.box(ux + Math.cos(a) * R * 0.6, cy + Math.sin(a * 2) * 6, uz + Math.sin(a) * R * 0.6, 6, 0.8, 5, C.dkgray, { rot: a }); }
      const orbit = new THREE.TorusGeometry(1, 0.03, 5, 48);
      [[0.5, 0.3], [-0.6, 1.4], [0.2, 2.5]].forEach(([tx, ry]) => b.addMatrix(orbit, steel, new THREE.Matrix4().compose(new THREE.Vector3(ux, cy, uz), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + tx, ry, 0)), new THREE.Vector3(R * 1.25, R * 1.25, R * 1.25))));
      ctx.claim(ux, uz, 28);
      // expo pavilions
      for (const [x, z, w, d, c] of [[60, -95, 30, 18, C.white], [230, -160, 24, 24, M.blue], [20, -300, 28, 16, C.white]]) {
        if (tr.clearance(x, z, 40) < Math.max(w, d) * 0.7 + 3 || !ctx.free(x, z, Math.max(w, d) * 0.7)) continue;
        ctx.claim(x, z, Math.max(w, d) * 0.7);
        b.box(x, 0, z, w, 8, d, c); b.box(x, 8, z, w + 1, 1, d + 1, M.red); b.cyl(x, 9, z, Math.min(w, d) * 0.4, 3, C.white, { seg: 16 }); b.sphere(x, 12, z, Math.min(w, d) * 0.35, 0, { mat: plastic(0x6ad0ff, { trans: true, opacity: 0.6 }), sy: 0.5 });
      }
      arch(ctx, 14.3, { cols: [M.red, M.gold], text: 'STARK EXPO', bg: '#b3121b', fg: '#ffe9a0' });
      // Hall of Armor: Iron Man suits on pedestals
      edges(ctx, 14.45, 15.15, 16, 5, (p, i, sd) => {
        const f = ironman(); f.root.scale.setScalar(2.2); f.root.position.set(p.x, 1.5, p.z); faceTo(f.root, tr.px(i), tr.pz(i));
        if (sd > 0) f.armR.rotation.x = -1.6; else { f.armL.rotation.x = -3.0; }
        f.jets.visible = false;
        b.cyl(p.x, 0, p.z, 2.4, 1.5, C.dkgray, { seg: 12 });
        bake(b, f.root);
      });
      // reflecting pool under the jump
      const ji = I(15.41), jp = tr.at(ji, 0, 0);
      const pool = ctx.makeMask(3000, 2048, (g, toPx, sc) => { g.drawImage(cut, 0, 0); g.fillStyle = '#000'; disc(g, toPx, sc, jp.x, jp.z, 13); });
      ctx.cutGround(pool);
      const poolW = ctx.makeMask(600, 256, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, jp.x, jp.z, 15); });
      liquid(ctx, poolW, 0x3a8ad8, -2, { size: 600 });
      // Ultron on a pavilion roof, sentries circling
      const uk = 15.8, ui = I(uk), up = tr.at(ui, edgeLat(uk, 14), 0);
      b.box(up.x, 0, up.z, 12, 7, 12, C.dkgray); b.box(up.x, 7, up.z, 13, 0.8, 13, M.red); ctx.claim(up.x, up.z, 10);
      const ul = add(ultron(), 3.2, up.x, 7.8, up.z, tr.px(ui), tr.pz(ui));
      const sentries = [0, 1, 2].map((n) => { const s = ultron(); s.root.scale.setScalar(1.4); s.armL.rotation.x = s.armR.rotation.x = -1.4; scene.add(s.root); return s; });
      ctx.anim((dt, t) => {
        ul.armR.rotation.x = -1.5 + Math.sin(t * 1.3) * 0.5; ul.armL.rotation.x = -0.3 - Math.max(0, Math.sin(t * 0.7)) * 2.5;
        sentries.forEach((s, n) => { const a = t * 0.6 + n * 2.094; s.root.position.set(up.x + Math.cos(a) * 16, 20 + Math.sin(t * 1.5 + n) * 3, up.z + Math.sin(a) * 16); s.root.rotation.set(0.9, -a, 0, 'YXZ'); });
      });
    }

    // ---- Guardians of the Galaxy: the Milano, the team, Knowhere and Thanos ---------------------------
    {
      const k = 17.35, i = I(k), yaw = tr.yawAt(i);
      const mp = tr.at(i, edgeLat(k, 34), 0);
      const ship = milano(); ship.position.set(mp.x, 0.2, mp.z); ship.rotation.y = yaw + 0.5; ctx.group.add(ship); ctx.claim(mp.x, mp.z, 26);
      const spot = (dk, lat) => { const q = tr.at(I(k + dk), edgeLat(k + dk, lat), 0); return q; };
      let q = spot(-0.18, 8); const sl = add(starlord(), 2.5, q.x, 0, q.z, tr.px(i), tr.pz(i));
      q = spot(0.12, 12); const gr = groot(); gr.root.scale.setScalar(1.3); gr.root.position.set(q.x, 0, q.z); faceTo(gr.root, tr.px(i), tr.pz(i)); ctx.group.add(gr.root);
      q = spot(-0.04, 6); const rk = rocket(); rk.root.scale.setScalar(1.9); rk.root.position.set(q.x, 0, q.z); faceTo(rk.root, tr.px(i), tr.pz(i)); ctx.group.add(rk.root);
      q = spot(0.26, 7); const gm = add(gamora(), 2.5, q.x, 0, q.z, tr.px(i), tr.pz(i));
      q = spot(-0.3, 12); const dx = add(drax(), 2.5, q.x, 0, q.z, tr.px(i), tr.pz(i));
      gm.armR.rotation.x = -1.0; dx.armL.rotation.x = dx.armR.rotation.x = -1.2;
      for (const p of [sl.root.position, gm.root.position, dx.root.position, rk.root.position, gr.root.position]) ctx.claim(p.x, p.z, 5);
      const slYaw = sl.root.rotation.y, gYaw = gr.root.rotation.y, rYaw = rk.root.rotation.y;
      ctx.anim((dt, t) => {
        const beat = t * 4.4;
        sl.root.rotation.y = slYaw + Math.sin(beat * 0.5) * 0.6; sl.root.rotation.z = Math.sin(beat) * 0.12; sl.root.position.y = Math.abs(Math.sin(beat)) * 0.5;
        sl.armL.rotation.x = -1.4 + Math.sin(beat) * 1.1; sl.armR.rotation.x = -1.4 - Math.sin(beat) * 1.1; sl.armL.rotation.z = 0.4; sl.armR.rotation.z = -0.4;
        gr.armR.rotation.z = -2.3 + Math.sin(t * 3) * 0.45; gr.armR.rotation.x = -0.2; gr.armL.rotation.z = 0.15 + Math.sin(t * 0.8) * 0.05;
        gr.root.rotation.y = gYaw + Math.sin(t * 0.5) * 0.15;
        rk.root.rotation.y = rYaw + Math.sin(t * 0.9) * 0.7; rk.gun.rotation.x = -0.25 + Math.max(0, Math.sin(t * 5)) * -0.2;
        gm.armR.rotation.x = -1.2 + Math.sin(t * 2.2) * 0.9;
        dx.root.rotation.y += 0; dx.armL.rotation.x = -1.2 + Math.sin(t * 1.7) * 0.4;
      });
      arch(ctx, 16.75, { cols: [M.orange, M.blue], text: 'GUARDIANS', bg: '#2a3a6a', fg: '#ffb060' });
      // Knowhere, the Celestial's head, in the southern sky
      const kn = new BrickBuilder(1);
      kn.boxM(mat4(0, 0, 0, 0, 0, 0, 60, 70, 56), 0x7a5a3a);
      kn.boxM(mat4(0, -40, 10, 0.2, 0, 0, 44, 20, 40), 0x6a4a2a);
      kn.boxM(mat4(0, 40, -6, 0, 0, 0, 52, 14, 48), 0x5a4028);
      for (const s of [-1, 1]) { kn.boxM(mat4(s * 14, 8, 28, 0, 0, 0, 14, 9, 2), 0x2a1a10); kn.boxM(mat4(s * 32, 0, 0, 0, 0, s * 0.3, 8, 30, 30), 0x6a4a2a); }
      kn.boxM(mat4(0, -12, 30, 0, 0, 0, 10, 14, 6), 0x6a4a2a);
      for (let n = 0; n < 60; n++) kn.box((rand() - 0.5) * 56, (rand() - 0.5) * 60, 28.4, 1.2, 1.2, 0.3, 0, { mat: glow(pick(rand, [0xffd070, 0xff8a3a, 0x6ad0ff]), 2) });
      const kng = kn.build({ name: 'knowhere' }); kng.position.set(40, 170, -620); kng.rotation.set(0.2, 0.2, 0.35); scene.add(kng);
      ctx.anim((dt, t) => { kng.rotation.z = 0.35 + Math.sin(t * 0.05) * 0.05; });
      // Thanos looming over the south with the Infinity Gauntlet
      const tp = [-179, -376];
      let y = 0; for (let n = 0; n < 7; n++) y = b.cyl(tp[0] + Math.sin(n) * 2, y, tp[1] + Math.cos(n) * 2, 44 - n * 5, 4.5, n % 2 ? 0x8a5a3a : 0x6a4a2a, { seg: 9 });
      ctx.claim(tp[0], tp[1], 90);
      const tn = add(thanos(), 11, tp[0], y, tp[1], -110, -200);
      tn.armL.rotation.x = -2.7; tn.armL.rotation.z = 0.2;
      const flash = new THREE.Mesh(new THREE.SphereGeometry(6, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      tn.armL.add(flash); flash.position.set(0.05, -2.4, 0.2); flash.scale.setScalar(1 / 11);
      ctx.anim((dt, t) => {
        const T = t % 9;
        tn.armL.rotation.x = -2.7 + (T > 6 && T < 7.5 ? Math.sin((T - 6) / 1.5 * Math.PI) * 0.3 : 0);
        const snap = T > 7.2 && T < 8.2 ? 1 - Math.abs(T - 7.4) / 0.8 : 0;
        flash.material.opacity = Math.max(0, snap); flash.visible = snap > 0;
        tn.stones.forEach((m) => { m.emissiveIntensity = 2.5 + snap * 4; });
        tn.armR.rotation.x = -0.3 + Math.sin(t * 0.6) * 0.1;
      });
    }

    // ---- Queens filler, lamps, clouds ------------------------------------------------------------------
    const queens = (x, z) => z < -150 && x < 170;
    for (let x = -600; x < 200; x += 34) for (let z = -700; z < -140; z += 34) {
      const bx = x + (rand() - 0.5) * 8, bz = z + (rand() - 0.5) * 8;
      if (!queens(bx, bz)) continue;
      const w = 12 + Math.floor(rand() * 4) * 2, r = w * 0.75;
      const c = tr.clearance(bx, bz, 160);
      if (c < r + 4 || c > 150 || !ctx.free(bx, bz, r) || Math.hypot(bx + 179, bz + 376) < 100) continue;
      ctx.claim(bx, bz, r);
      building(b, bx, bz, w, w, 1 + Math.floor(rand() * 3), pick(rand, [0xb08a6a, C.rbrown, C.tan, C.white, 0x8a4a3a]), rand, { trim: C.white });
    }
    ctx.scatter(40, { minC: 3, maxC: 100, r: 3, test: (x, z) => queens(x, z) }, (x, z) => { b.cyl(x, 0, z, 0.5, 3, C.rbrown, { seg: 6 }); b.sphere(x, 5, z, 3, pick(rand, [C.green, 0x6a9a3a]), { sy: 0.9 }); });
    for (let k = 0; k < 16; k++) cloud(ctx.bNoShadow, (rand() - 0.5) * 1300, 120 + rand() * 50, (rand() - 0.5) * 1300, 2.5, rand);
    void rock; void part; void fig; void V3;
  },
};
