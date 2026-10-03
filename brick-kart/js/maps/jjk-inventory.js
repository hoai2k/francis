// Hidden Inventory Okinawa (Jujutsu Kaisen Season 2, Gojo's Past): leave a summery Tokyo
// Jujutsu High, cruise the Okinawa coast past the aquarium while Geto's rainbow dragon dives
// at the road, glide off the cliff over the turquoise sea, pass the Star Religious Group temple
// and its clapping devotees, then descend into Tengen's Tomb: an endless corridor of doors where
// Toji sweeps his Inverted Spear of Heaven, and the barrier tree chamber where his storage
// worm bursts out of the floor.
import { THREE, BrickBuilder, C, plastic, groundPlane, palm, rock, roundTree, pine, cloud, crossing, liquid, disc, strokeTrack, trackPolygon, inRange, each, edges, arch, mat4, canvasTexture } from './kit.js';
import * as P from './jjk-props.js';
import * as Q from './jjk-inventory-props.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const fxOf = (ctx) => ctx.world.race?.fx;

// ---- hazards --------------------------------------------------------------------------------

// Geto's rainbow dragon: circles over the sea, then dives low straight across the road along a
// flashing rainbow band (one pass per cycle, alternating between the given k values).
let bandTex = null;
function rainbowTex() {
  if (bandTex) return bandTex;
  bandTex = canvasTexture(256, 32, (g, w, h) => { Q.RAINBOW.forEach((c, k) => { g.fillStyle = '#' + c.toString(16).padStart(6, '0'); g.fillRect(k * w / 7, 0, w / 7 + 1, h); }); });
  return bandTex;
}
function rainbowDragon(ctx, { home, alt = 50, R = 46, passes, period = 8.5, offset = 0 }) {
  const tr = ctx.track;
  const NS = 18, GAP = 3.1;
  const head = new THREE.Group(); head.add(Q.dragonHead(1.2));
  const body = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ roughness: 0.35, emissive: 0x222222 }), NS);
  const fins = new THREE.InstancedMesh(new THREE.ConeGeometry(0.6, 1.8, 6).translate(0, 0.9, 0), plastic(C.white), NS);
  const col = new THREE.Color();
  for (let k = 0; k < NS; k++) body.setColorAt(k, col.setHex(Q.RAINBOW[Math.floor(k / NS * 7)]));
  body.frustumCulled = fins.frustumCulled = false; body.castShadow = true;
  ctx.group.add(head, body, fins);
  const C0 = new THREE.Vector3(home[0], alt, home[1]);
  // one closed flight loop per pass, all starting from the same point over the sea
  const loops = passes.map((k) => {
    const i = tr.kToIndex(k), hw = tr.HW[i] + tr.SH[i];
    const pp = tr.at(i, hw + 10, 0), pm = tr.at(i, -hw - 10, 0);
    const sea = Math.hypot(pp.x - home[0], pp.z - home[1]) < Math.hypot(pm.x - home[0], pm.z - home[1]) ? 1 : -1;
    const A = tr.at(i, sea * (hw + 16), 3.4), B = tr.at(i, -sea * (hw + 16), 3.4);
    const d = V1.subVectors(B, A).normalize().clone();
    const Ap = A.clone().addScaledVector(d, -46); Ap.y = 30;
    const Bp = B.clone().addScaledVector(d, 46); Bp.y = 34;
    const Up = Bp.clone().lerp(C0, 0.5); Up.y = alt + 14;
    const pts = [new THREE.Vector3(home[0] + R, alt, home[1]), new THREE.Vector3(home[0], alt + 6, home[1] + R), new THREE.Vector3(home[0] - R, alt, home[1]), Ap, A, B, Bp, Up];
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    let uA = 0, uB = 0, dA = 1e9, dB = 1e9;
    for (let n = 0; n < 600; n++) { const q = curve.getPointAt(n / 600, V2); const a = q.distanceTo(A), b = q.distanceTo(B); if (a < dA) { dA = a; uA = n / 600; } if (b < dB) { dB = b; uB = n / 600; } }
    if (uB < uA) uB += 1;
    const mid = A.clone().lerp(B, 0.5), L = A.distanceTo(B);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2 * (tr.HW[i] + 1)).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: rainbowTex(), transparent: true, opacity: 0, depthWrite: false }));
    band.position.copy(tr.at(i, 0, 0.12)); band.rotation.y = Math.atan2(d.x, d.z);
    ctx.group.add(band);
    return { curve, len: curve.getLength(), uA, uB, A, B, d, L, band, mid };
  });
  const pos = []; for (let k = 0; k <= NS; k++) pos.push(new THREE.Vector3());
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), lk = new THREE.Matrix4();
  let cur = loops[0], low = false, roared = -1;
  return {
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / period), u = (tt % period) / period;
      cur = loops[n % loops.length];
      for (const l of loops) if (l !== cur) l.band.material.opacity = 0;
      for (let k = 0; k <= NS; k++) cur.curve.getPointAt((((u - k * GAP / cur.len) % 1) + 1) % 1, pos[k]);
      head.position.copy(pos[0]); head.lookAt(V1.copy(pos[0]).multiplyScalar(2).sub(pos[1]));
      head.position.y += Math.sin(t * 6) * 0.2;
      for (let k = 1; k <= NS; k++) {
        const s = 1.9 * (1 - (k / NS) * 0.55);
        lk.lookAt(pos[k], pos[k - 1], up); qt.setFromRotationMatrix(lk);
        m4.compose(pos[k], qt, sc.set(s, s * 0.9, s * 1.2)); body.setMatrixAt(k - 1, m4);
        m4.compose(V2.copy(pos[k]).addScaledVector(up, s * 0.8), qt, sc.setScalar(s * 0.7)); fins.setMatrixAt(k - 1, m4);
      }
      body.instanceMatrix.needsUpdate = fins.instanceMatrix.needsUpdate = true;
      // telegraph band before and during the low pass
      const lead = (cur.uA - u + 1) % 1, inPass = (u - cur.uA + 1) % 1 < cur.uB - cur.uA + 0.06, warn = !inPass && lead < 0.2;
      cur.band.material.opacity = inPass ? 0.85 : warn ? (0.2 + 0.6 * (1 - lead / 0.2)) * (0.55 + 0.45 * Math.sin(t * 18)) : Math.max(0, cur.band.material.opacity - dt * 2);
      low = inPass || pos[NS].y < cur.A.y + 4;
      if (warn && lead < 0.06 && roared !== n) { roared = n; ctx.world.race?.audio.sfx('cannon', cur.mid); }
      const fx = fxOf(ctx);
      if (fx && low && Math.random() < 0.7) { const c = Q.RAINBOW[Math.floor(Math.random() * 7)]; fx.spark(pos[3].x, pos[3].y, pos[3].z, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, c, 0.8, 4); }
    },
    test(p) {
      if (!low) return null;
      for (let k = 0; k <= NS; k += 1) { const q = pos[k]; if (Math.abs(p.y + 0.8 - q.y) < 3 && Math.hypot(p.x - q.x, p.z - q.z) < 2.6) return 'spin'; }
      return null;
    },
    near(p, r) {
      if (cur.band.material.opacity < 0.15) return false;
      const dx = p.x - cur.mid.x, dz = p.z - cur.mid.z;
      return Math.abs(dx * cur.d.x + dz * cur.d.z) < cur.L / 2 && Math.abs(dx * cur.d.z - dz * cur.d.x) < 3.5 + r;
    },
  };
}

// Toji's Inverted Spear of Heaven on its chain: rests along one road edge, whirls (red sector
// flashes on the floor), then sweeps across the road like a wiper to the other end.
function tojiChain(ctx, { k, side = 1, period = 3.8, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k), hw = tr.HW[i];
  const piv = tr.at(i, side * (hw + 1.4), 0), yaw = tr.yawAt(i), L = hw * 2 + 1.5, H = 1.4;
  const hold = new THREE.Group(); hold.position.copy(piv); hold.rotation.y = yaw; ctx.group.add(hold);
  const arm = new THREE.Group(); hold.add(arm);
  const cb = new BrickBuilder(1);
  for (let x = 1.2, n = 0; x < L - 3; x += 0.75, n++) cb.boxM(mat4(x, H, 0, n % 2 ? Math.PI / 2 : 0, 0, 0, 0.8, 0.22, 0.42), 0x9aa0aa, { matOpts: { metal: 0.6, rough: 0.35 } });
  Q.invertedSpear(cb, L - 3.4, H, 0, 1);
  const chainG = cb.build({ name: 'toji-chain' }); arm.add(chainG);
  const glowS = P.glow(0xff3030, 6, 0); glowS.position.set(L - 1, H, 0); arm.add(glowS);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, L, 28, 1, side > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  ring.position.y = 0.15; hold.add(ring);
  // Toji himself on the shoulder, turning with his swing
  const tj = Q.toji(2.6); const tg = new THREE.Group(); tg.add(tj.root); tg.position.set(0, 0, 0); hold.add(tg);
  tj.armR.rotation.set(-1.5, 0, 0); tj.armL.rotation.set(-0.3, 0, 0.3);
  const ang = (f) => -Math.PI / 2 + 0.06 + side * (Math.PI - 0.12) * f;
  const hd = period / 2, SW = 0.5, TEL = 0.75;
  let state = 0, swung = -1;
  const dir = new THREE.Vector3();
  return {
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / hd), ph = tt % hd;
      const f0 = n % 2, f1 = 1 - f0;
      let f = f0;
      if (ph > hd - SW) { state = 2; const x = (ph - hd + SW) / SW; f = f0 + (f1 - f0) * x * x * (3 - 2 * x); if (swung !== n) { swung = n; ctx.world.race?.audio.sfx('spin', piv); } }
      else state = ph > hd - SW - TEL ? 1 : 0;
      const a = ang(f);
      arm.rotation.y = a;
      chainG.rotation.x = state === 1 ? (ph - (hd - SW - TEL)) * 14 : 0;   // whirl the chain while winding up
      tg.rotation.y = a + Math.PI / 2;
      tj.armR.rotation.x = state === 1 ? -2.6 + Math.sin(t * 20) * 0.3 : -1.5;
      ring.material.opacity = state === 1 ? 0.18 + 0.22 * Math.abs(Math.sin(t * 14)) : state === 2 ? 0.3 : 0;
      glowS.material.opacity = state ? 0.9 : 0;
      dir.set(Math.cos(yaw + a), 0, -Math.sin(yaw + a));
    },
    test(p) {
      if (state !== 2) return null;
      const dx = p.x - piv.x, dz = p.z - piv.z, s = Math.max(1.5, Math.min(L, dx * dir.x + dz * dir.z));
      return Math.hypot(dx - dir.x * s, dz - dir.z * s) < 1.8 && Math.abs(p.y - piv.y - 0.5) < 3 ? 'spin' : null;
    },
    near(p, r) { return state > 0 && Math.hypot(p.x - piv.x, p.z - piv.z) < L + r; },
  };
}

// Toji's storage worm: the floor cracks and glows, then the worm arcs out of the road and bites.
let crackTex = null;
function crackTexture() {
  if (crackTex) return crackTex;
  crackTex = canvasTexture(256, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(120,20,90,0.95)'); gr.addColorStop(0.6, 'rgba(60,10,50,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ff7ae0'; g.lineWidth = 3; g.lineCap = 'round';
    for (let k = 0; k < 14; k++) { let x = w / 2, y = h / 2; g.beginPath(); g.moveTo(x, y); const a = k / 14 * 6.28; for (let s = 0; s < 5; s++) { x += Math.cos(a + (Math.random() - 0.5)) * 22; y += Math.sin(a + (Math.random() - 0.5)) * 11; g.lineTo(x, y); } g.stroke(); }
  });
  return crackTex;
}
function storageWorm(ctx, { k, lat = 0, period = 4.6, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k), T = tr.at(i, lat * tr.HW[i], 0), yaw = tr.yawAt(i);
  const hold = new THREE.Group(); hold.position.copy(T); hold.rotation.y = yaw; ctx.group.add(hold);
  const w = Q.storageWorm(1.05); w.visible = false; hold.add(w);
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(17, 7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, opacity: 0, depthWrite: false }));
  crack.position.y = 0.14; hold.add(crack);
  const lx = Math.cos(yaw), lz = -Math.sin(yaw), fx0 = Math.sin(yaw), fz0 = Math.cos(yaw);
  let up = 0, bit = false;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.52 hidden, .52-.78 cracking, .78-.84 burst, .84-.94 up, .94-1 sink
      if (ph < 0.52) { up = 0; crack.material.opacity = Math.max(0, crack.material.opacity - dt * 2); }
      else if (ph < 0.78) { up = 0; crack.material.opacity = (0.3 + 0.7 * (ph - 0.52) / 0.26) * (0.6 + 0.4 * Math.sin(t * 22)); }
      else if (ph < 0.84) { up = (ph - 0.78) / 0.06; crack.material.opacity = 1; }
      else if (ph < 0.94) up = 1;
      else up = 1 - (ph - 0.94) / 0.06;
      w.visible = up > 0.01;
      w.position.y = -13 + up * 12;
      w.rotation.x = Math.sin(t * 7) * 0.08 * up;
      if (ph > 0.52 && ph < 0.78 && Math.random() < 0.5) { const fx = fxOf(ctx); if (fx) { const s = (Math.random() - 0.5) * 14; fx.spark(T.x + lx * s, T.y + 0.3, T.z + lz * s, (Math.random() - 0.5) * 3, 4 + Math.random() * 5, (Math.random() - 0.5) * 3, Math.random() < 0.5 ? 0xff7ae0 : 0x8a7a70, 0.7, 14); } }
      if (up > 0.6 && !bit) { bit = true; const fx = fxOf(ctx); if (fx) { fx.dust({ pos: T, yaw: 0 }, 0xb8a8a0, 16); fx.pop(T, 0xff7ae0); } ctx.world.race?.audio.sfx('wall', T); }
      if (up === 0) bit = false;
    },
    test(p) {
      if (up < 0.45) return null;
      const dx = p.x - T.x, dz = p.z - T.z, a = dx * lx + dz * lz, f = dx * fx0 + dz * fz0;
      return Math.abs(a) < 8.4 && Math.abs(f) < 2.8 && p.y < T.y + 7 ? 'wreck' : null;
    },
    near(p, r) {
      if (crack.material.opacity < 0.2 && up === 0) return false;
      const dx = p.x - T.x, dz = p.z - T.z;
      return Math.abs(dx * lx + dz * lz) < 8.4 + r && Math.abs(dx * fx0 + dz * fz0) < 3 + r;
    },
  };
}

// little flying-fish curses that hop across the north beach road
function fishCurse() {
  const b = new BrickBuilder(1);
  b.sphere(0, 1.6, 0, 1.2, 0x5a8aa8, { sy: 0.8 }); b.box(0, 1.0, -0.2, 1.4, 0.4, 1.8, 0xd8e8f0);
  P.spike(b, 0, 1.6, -1.1, 0.7, 1.4, -Math.PI / 2, 0, 0x3a6a88);
  for (const sd of [-1, 1]) { P.rbox(b, sd * 1.3, 1.8, 0.1, 1.8, 0.12, 0.9, 0, 0, sd * 0.4, 0x8ac8e8); b.sphere(sd * 0.55, 1.95, 0.8, 0.3, C.white); b.sphere(sd * 0.62, 1.95, 0.96, 0.15, C.black); b.box(sd * 0.4, 0, 0.2, 0.25, 0.9, 0.25, 0x3a6a88); }
  b.box(0, 1.2, 1.05, 0.8, 0.2, 0.1, 0x2a0a1a);
  const g = new THREE.Group(); g.add(b.build({ name: 'fish-curse' })); return g;
}

// ---- the map ----------------------------------------------------------------------------------
export default {
  id: 'jjk-inventory', name: 'Hidden Inventory Okinawa', subtitle: 'Season 2 · Gojo\'s Past: Okinawa, a sea glide and Tengen\'s Tomb', cup: 'jjk', seed: 61,
  width: 28, shoulder: 8, edge: 'fence', start: 0.5,
  points: [[-80, 238, 0], [30, 246, 0], [140, 232, 0], [226, 182, 0], [266, 100, 0], [276, 15, 0], [266, -65, 0], [284, -140, 4], [266, -206, 12], [214, -252, 16], [130, -286, 14], [40, -300, 10], [-50, -306, 4], [-140, -292, 0], [-216, -252, 0], [-266, -182, 0], [-286, -96, 0], [-280, -10, 0], [-246, 66, 0], [-190, 122, 0], [-158, 192, 0]],
  sections: [
    { from: 20.5, to: 1.6, surface: 'stone' },
    { from: 3.3, to: 6.7, edge: 'open', shoulder: 13, surface: 'coast' },
    { from: 6.9, to: 9.25, edge: 'wall', shoulder: 3, support: 'bank' },
    { from: 9.3, to: 10.75, gap: true },
    { from: 10.75, to: 12.1, edge: 'fence', shoulder: 5, support: 'bank' },
    { from: 12.15, to: 12.95, edge: 'open', shoulder: 12, surface: 'coast' },
    { from: 13.1, to: 14.45, surface: 'stone' },
    { from: 15.0, to: 17.05, edge: 'wall', shoulder: 2, width: 26, surface: 'tomb' },
    { from: 17.25, to: 19.6, width: 34, shoulder: 5, edge: 'wall', surface: 'vault' },
  ],
  items: [1.5, 4.3, 7.4, 11.5, 13.7, 16.3, 18.95],
  boosts: [[2.6, 0], [5.6, -0.35], [8.5, 0], [11.9, 0.3], [14.75, 0], [17.4, 0], [20.15, 0]],
  ramps: [3.85, 14.25],
  gliders: [9.2],
  studs: [[0.9, 0, 8], [2.2, -0.4, 6], [3.5, 0.4, 6], [4.8, 0, 8], [6.4, 0.3, 6], [7.9, 0, 6], [8.9, 0, 6], [11.1, 0, 6], [12.55, -0.4, 6], [13.4, 0.3, 6], [15.5, 0, 8], [17.75, -0.5, 6], [19.8, 0.3, 8]],
  theme: {
    sky: [0x1a78e0, 0xcdeeff, 0x7ad6e8], fog: [0xd6efff, 280, 1200], sun: { color: 0xfff2d8, intensity: 2.9, dir: [0.45, 1, 0.3] },
    hemi: [0xe8f6ff, 0x6a9a6a, 1.25], envIntensity: 0.8,
    groundY: -1.6, ground: 0x16b4c8, groundPitch: 1.6, groundOpts: { transparent: true, opacity: 0.86, rough: 0.1 },
    shoulder: 0xe4d6a8, dust: 0xe8d8a8,
    road: { base: '#5c5f64', line: '#f4f4f4' },
    surfaces: {
      stone: { base: '#bdb4a2', line: null, seams: 'rgba(60,50,30,0.35)' },
      coast: { base: '#6a6d72', line: '#f2cd37', dashed: true },
      tomb: { base: '#6a4630', line: null, seams: 'rgba(30,15,5,0.5)' },
      vault: { base: '#8c8678', line: '#e0c070', seams: 'rgba(30,25,15,0.4)', emissive: 0x1a1408, emissiveIntensity: 1 },
    },
    wall: [C.ltgray, C.white], curb: [C.red, C.white], gate: [C.red, C.white], fence: [C.white, C.azure],
    support: 'bank', pillar: C.ltgray, pillar2: C.white, skirt: ['#c8b48a', '#8e7a58'], skirtColor: C.dktan,
    rampSide: C.dkblue, ramp: C.yellow,
    music: { bpm: 140, root: 64, scale: 'major', style: 'summer' },
  },

  decor(ctx) {
    const { b, rand, track: tr, scene } = ctx;
    const nb = ctx.bNoShadow;
    const K = (k) => tr.kToIndex(k);
    const edgeLat = (i) => tr.HW[i] + tr.SH[i];
    const spot = (k, lat, r) => {
      const i = K(k), sd = Math.sign(lat) || 1;
      for (let l = Math.abs(lat); l < Math.abs(lat) + 160; l += 2) { const p = tr.at(i, l * sd, 0); if (tr.clearance(p.x, p.z, r + 4) >= r) { p.y = 0; return p; } }
      const p = tr.at(i, lat, 0); p.y = 0; return p;
    };
    const faceRoad = (obj, k) => { const q = tr.at(K(k), 0, 0); obj.rotation.y = Math.atan2(q.x - obj.position.x, q.z - obj.position.z); };
    const add = (f, p, k, y = 0) => { f.root.position.set(p.x, y, p.z); faceRoad(f.root, k); ctx.group.add(f.root); ctx.claim(p.x, p.z, f.s * 1.2); return f; };

    // ---- ground: an island in a turquoise sea, a bay under the glide, beaches and grass -------
    const LAND = [[-460, -440], [-80, -440], [-40, -345], [80, -338], [230, -300], [330, -220], [318, -120], [322, 0], [316, 140], [290, 260], [160, 330], [0, 420], [-300, 420], [-480, 260], [-480, -200]];
    const COAST = LAND.slice(1, 11);
    const BAY = [[150, -268, 72], [220, -300, 60], [90, -320, 50]];
    const gliding = (i) => inRange(tr, i, 9.25, 10.8);
    const poly = (g, toPx, pts) => { g.beginPath(); pts.forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); };
    const landDraw = (g, toPx, sc) => {
      g.fillStyle = '#fff'; poly(g, toPx, LAND); g.closePath(); g.fill();
      g.globalCompositeOperation = 'destination-out';
      for (const [x, z, r] of BAY) disc(g, toPx, sc, x, z, r);
      strokeTrack(g, tr, toPx, sc, 26, gliding);
      g.globalCompositeOperation = 'source-over';
      strokeTrack(g, tr, toPx, sc, 22, (i) => !gliding(i));
    };
    const land = ctx.makeMask(1600, 1024, landDraw);
    scene.add(groundPlane(0xe8d8a6, -0.12, 1600, 1.6, { mask: land }));
    const grass = ctx.makeMask(1600, 1024, (g, toPx, sc) => {
      landDraw(g, toPx, sc);
      g.globalCompositeOperation = 'destination-out';
      g.lineWidth = 130 * sc; g.lineJoin = g.lineCap = 'round'; g.strokeStyle = '#000'; poly(g, toPx, COAST); g.stroke();
      for (const [x, z, r] of BAY) disc(g, toPx, sc, x, z, r + 50);
      strokeTrack(g, tr, toPx, sc, 30, (i) => inRange(tr, i, 3.0, 13.0));
      g.globalCompositeOperation = 'source-over';
    });
    scene.add(groundPlane(0x4aa83a, -0.07, 1600, 1.6, { mask: grass }));
    // stone floor of Tengen's barrier chamber
    const VAULT = [-205, 40];
    const vault = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, VAULT[0], VAULT[1], 120); strokeTrack(g, tr, toPx, sc, 4, (i) => inRange(tr, i, 14.9, 17.2)); });
    scene.add(groundPlane(0x6a645a, -0.04, 1600, 1.6, { mask: vault, rough: 0.8 }));
    // light-turquoise reef shallows hugging the coast
    const reef = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.lineWidth = 70 * sc; g.lineJoin = g.lineCap = 'round'; g.strokeStyle = '#fff'; poly(g, toPx, COAST); g.stroke(); g.fillStyle = '#fff'; for (const [x, z, r] of BAY) disc(g, toPx, sc, x, z, r * 0.8); });
    liquid(ctx, reef, 0x6ae8dc, -1.0, { opacity: 0.55, speed: 0.04, size: 1600 });
    const sea = scene.children.find((o) => o.isMesh && o.material?.transparent && o.position.y < -1.5);
    if (sea) ctx.anim((dt, t) => { sea.material.map.offset.set(Math.sin(t * 0.25) * 0.3, t * 0.03); sea.material.bumpMap.offset.copy(sea.material.map.offset); });

    // ---- Tokyo Jujutsu High in summer (start straight) -------------------------------------
    const campus = [[-20, 160, 30, 18, 8, 2, 0.05], [90, 165, 24, 16, 7, 1, -0.1], [-70, 320, 26, 16, 7, 1, Math.PI], [60, 322, 22, 14, 7, 2, Math.PI + 0.05], [170, 300, 20, 14, 6, 1, Math.PI + 0.5]];
    for (const [x, z, w, d, h, tiers, rot] of campus) if (tr.clearance(x, z, 40) > Math.max(w, d) * 0.6) { P.hall(b, x, z, w, d, h, rot, { tiers }); ctx.claim(x, z, Math.max(w, d) * 0.75); }
    { const x = -150, z = 300; P.hall(b, x, z, 12, 12, 6, 0.3, { tiers: 4, wall: C.dkred, wood: C.black }); ctx.claim(x, z, 11); }
    for (const k of [1.2, 20.7]) { const i = K(k), p = tr.at(i, 0, 0); P.torii(b, p.x, 0, p.z, 2 * (edgeLat(i) + 2), 13, tr.yawAt(i), C.red); }
    edges(ctx, 20.6, 1.7, 14, 3, (p) => P.lantern(b, p.x, p.z, 1.1));
    arch(ctx, 0.95, { cols: [C.red, C.white], text: 'TOKYO JUJUTSU HIGH', bg: '#c91a09', fg: '#fff6c0' });
    // summer: big leafy trees, sunflowers, a vending machine under the shade
    ctx.scatter(70, { minC: 6, maxC: 90, r: 4, test: (x, z) => grass.test(x, z) && z > 120 }, (x, z) => roundTree(b, x, 0, z, 1.4 + rand() * 0.6, rand() < 0.5 ? C.green : 0x2e8a3a));
    for (let n = 0; n < 4; n++) { const p = spot(0.3 + n * 0.12, 18 + (n % 2) * 3, 1.5); for (let m = 0; m < 6; m++) Q.sunflower(b, p.x + (m % 3) * 1.6, p.z + Math.floor(m / 3) * 1.6, 1 + rand() * 0.3); }
    { const p = spot(1.45, -20, 4); const r0 = tr.at(K(1.45), 0, 0), rot = Math.atan2(r0.x - p.x, r0.z - p.z); Q.vending(b, p.x, p.z, rot, C.red); Q.vending(b, p.x + Math.cos(rot) * 3, p.z - Math.sin(rot) * 3, rot, C.blue); b.box(p.x + Math.sin(rot) * 4, 0, p.z + Math.cos(rot) * 4, 6, 1.4, 1.6, C.rbrown, { rot }); }

    // ---- Okinawa coast road ----------------------------------------------------------------
    edges(ctx, 3.3, 6.7, 9, 2, (p, i, sd) => { if (rand() < 0.75) palm(b, p.x, 0, p.z, 1.1 + rand() * 0.5, rand); }, [1]);
    edges(ctx, 3.3, 6.7, 9, 2, (p) => { if (rand() < 0.5) Q.hibiscus(b, p.x, p.z, 1 + rand() * 0.4, rand); }, [-1]);
    ctx.scatter(80, { minC: 3, maxC: 70, r: 3, test: (x, z) => land.test(x, z) && !grass.test(x, z) }, (x, z) => { if (rand() < 0.65) palm(b, x, 0, z, 1 + rand() * 0.6, rand); else Q.umbrella(b, x, z, rand() < 0.5 ? C.red : C.azure, 1 + rand() * 0.3); });
    // shisa pairs guarding the coast road
    for (const k of [3.4, 6.6, 12.2]) { const i = K(k); for (const sd of [-1, 1]) { const p = tr.at(i, sd * (edgeLat(i) + 1.5), 0); Q.shisa(b, p.x, 0, p.z, tr.yawAt(i) + Math.PI, 1.3, sd > 0 ? 0xc8743a : 0xb8642a); } }
    // red-tiled Ryukyu houses inland
    for (let n = 0; n < 9; n++) { const k = 3.4 + n * 0.37, p = spot(k, -(30 + (n % 3) * 18), 9); if (!ctx.free(p.x, p.z, 8)) continue; const r0 = tr.at(K(k), 0, 0); Q.ryukyuHouse(b, p.x, p.z, 10 + (n % 2) * 3, 8, Math.atan2(r0.x - p.x, r0.z - p.z), n % 3 ? 0xf2ead8 : 0xe8dcc0); ctx.claim(p.x, p.z, 9); }
    arch(ctx, 3.3, { cols: [C.azure, C.white], text: 'OKINAWA', bg: '#1aa0c8', fg: '#fff' });
    // the aquarium: curved-roof hall with a giant glass tank facing the road
    { const k = 5.0, i = K(k), p = spot(k, -(edgeLat(i) + 26), 26), r0 = tr.at(i, 0, 0), rot = Math.atan2(r0.x - p.x, r0.z - p.z);
      const ca = Math.cos(rot), sa = Math.sin(rot), L = (lx, lz) => [p.x + lx * ca + lz * sa, p.z - lx * sa + lz * ca];
      b.box(p.x, 0, p.z, 56, 2, 34, C.ltgray, { rot });
      let [x, z] = L(0, -6); b.box(x, 2, z, 54, 14, 20, C.white, { rot });
      for (let n = 0; n < 6; n++) { const [rx, rz] = L(0, -6 + (n - 2.5) * 3.6); b.box(rx, 16 + Math.cos((n - 2.5) / 3) * 3, rz, 56, 0.8, 3.8, n % 2 ? 0x2a7ac8 : 0x3a8ad8, { rot }); }
      [x, z] = L(0, 8); b.box(x, 2, z, 46, 0.6, 9, 0x2a3a4a, { rot }); b.box(x, 18, z, 47, 1, 9.4, C.white, { rot });
      for (const sd of [-1, 1]) { const [cx, cz] = L(sd * 23.2, 8); b.box(cx, 2, cz, 1, 16, 9, C.white, { rot }); }
      const tank = new THREE.Mesh(new THREE.BoxGeometry(45, 15.4, 8.4), new THREE.MeshStandardMaterial({ color: 0x2ab0e0, transparent: true, opacity: 0.45, roughness: 0.05, emissive: 0x0a4a7a, emissiveIntensity: 0.5, depthWrite: false }));
      tank.position.set(x, 10.3, z); tank.rotation.y = rot; ctx.group.add(tank);
      const fishG = new THREE.Group(); fishG.position.set(x, 9, z); fishG.rotation.y = rot; ctx.group.add(fishG);
      const ws = Q.whaleShark(1.0); ws.rotation.y = Math.PI / 2; const wsH = new THREE.Group(); wsH.add(ws); fishG.add(wsH);
      const mts = [0, 1].map((n) => { const m = Q.manta(0.8); fishG.add(m); return m; });
      ctx.anim((dt, t) => {
        const s = Math.sin(t * 0.35); wsH.position.set(s * 13, Math.sin(t * 0.6) * 1.2, 0); wsH.rotation.y = Math.cos(t * 0.35) > 0 ? 0 : Math.PI; ws.rotation.z = Math.sin(t * 2) * 0.05;
        mts.forEach((m, n) => { const a = t * 0.5 + n * 3; m.position.set(Math.cos(a) * 16, 3.5 - n * 6 + Math.sin(a * 2) * 0.6, Math.sin(a) * 2); m.rotation.y = -a; m.rotation.z = Math.sin(t * 2 + n) * 0.25; });
      });
      // AQUARIUM sign on the roof
      const tex = canvasTexture(512, 96, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a7ac8'; g.font = '900 64px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AQUARIUM', w / 2, h / 2 + 3); });
      const sgn = new THREE.Mesh(new THREE.PlaneGeometry(30, 5.6), new THREE.MeshBasicMaterial({ map: tex })); [x, z] = L(0, 4.25);
      sgn.position.set(x, 23.5, z); sgn.rotation.y = rot; ctx.group.add(sgn);
      [x, z] = L(0, 4); b.box(x, 19, z, 31, 7, 0.6, C.white, { rot });
      ctx.claim(p.x, p.z, 30);
      // Riko and Kuroi pressed up against the glass, Geto watching them
      const rk = Q.riko(2.4); const kp = L(-6, 15.5); rk.root.position.set(kp[0], 2, kp[1]); rk.root.rotation.y = rot + Math.PI; ctx.group.add(rk.root); rk.armR.rotation.set(-2.6, 0, 0.2); rk.armL.rotation.set(-2.6, 0, -0.2);
      const ku = Q.kuroi(2.4); const kq = L(-1, 15.5); ku.root.position.set(kq[0], 2, kq[1]); ku.root.rotation.y = rot + Math.PI; ctx.group.add(ku.root); ku.armR.rotation.x = -1.2;
      const ge = Q.youngGeto(2.6); const kg = L(9, 18); ge.root.position.set(kg[0], 2, kg[1]); ge.root.rotation.y = rot + 0.3; ctx.group.add(ge.root);
      ctx.anim((dt, t) => { rk.root.position.y = 2 + Math.abs(Math.sin(t * 4)) * 0.4; ku.armR.rotation.x = -1.2 + Math.sin(t * 2) * 0.2; });
    }
    // on the beach: young Gojo in his sunglasses waving from the sand, Riko playing in the surf
    { const p = spot(4.15, 28, 4); const gj = add(Q.youngGojo(3.0), p, 4.15); ctx.anim((dt, t) => { gj.armR.rotation.set(-0.2, 0, -2.6 + Math.sin(t * 6) * 0.4); }); Q.umbrella(b, p.x + 4, p.z + 3, C.red, 1.3); }
    { const p = spot(6.1, 34, 4); const r2 = add(Q.riko(2.6), p, 6.1); r2.armR.rotation.z = -2.4; r2.armL.rotation.z = 2.4; ctx.anim((dt, t) => { r2.root.position.y = Math.abs(Math.sin(t * 3.5)) * 1.2; }); for (let n = 0; n < 3; n++) b.cyl(p.x + 3 + n * 1.6, 0, p.z - 2, 0.9 - n * 0.2, 1.4 + n * 0.8, C.tan, { seg: 8 }); }

    // ---- the cliff, the lighthouse and the glide over the Okinawa sea --------------------------
    each(tr, 7.0, 9.2, 7, (i) => { for (const sd of [-1, 1]) rock(b, tr.px(i) + tr.R[i * 2] * sd * (edgeLat(i) + 8), -1.6, tr.pz(i) + tr.R[i * 2 + 1] * sd * (edgeLat(i) + 8), 2.6, rand, [C.ltgray, C.dktan, 0xc8b490]); });
    { const p = spot(8.6, 30, 6); let y = 0; for (let k = 0; k < 11; k++) y = b.cyl(p.x, y, p.z, 4 - k * 0.12, 2.4, C.white, { seg: 16 });
      b.cyl(p.x, y, p.z, 3.4, 0.6, C.dkgray, { seg: 16 }); b.cyl(p.x, y + 0.6, p.z, 2.2, 2.6, C.yellow, { seg: 16, matOpts: { trans: true, opacity: 0.7, emissive: 0xffe060, emissiveIntensity: 1.6 } }); b.cone(p.x, y + 3.2, p.z, 3, 2.4, C.red, { seg: 16 }); ctx.claim(p.x, p.z, 6); }
    arch(ctx, 9.05, { cols: [C.azure, C.white], text: 'GLIDE!', bg: '#1a8cff' });
    // under the glide: coral heads, a glass-bottom boat, rocky islets, sea turtles
    const coral = [0xff6a8a, 0xffa040, 0xfff070, 0xb06aff, 0x6ae0a0];
    for (let n = 0; n < 70; n++) { const [cx, cz, r] = BAY[n % 3]; const a = rand() * 6.28, d = rand() * r * 0.85, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (land.test(x, z)) continue; nb.sphere(x, -2.6, z, 1 + rand() * 1.6, coral[n % 5], { sy: 0.6 }); }
    for (const [x, z, s] of [[170, -330, 1], [100, -360, 0.8], [250, -340, 1.2], [370, -150, 1.1], [380, 120, 0.9]]) { rock(b, x, -1.6, z, 3 * s, rand, [C.ltgray, C.dktan]); palm(b, x + 3, 0.5, z + 2, 1.1 * s, rand); }
    { const boat = new BrickBuilder(1); boat.box(0, 0, 0, 5, 1.6, 13, C.white); boat.box(0, 1.6, -1, 4, 0.4, 7, 0x2a8ac8); boat.box(0, 2, -1, 4.2, 2.6, 7.2, C.white, { matOpts: { trans: true, opacity: 0.3 } }); boat.box(0, 4.6, -1, 4.6, 0.4, 7.6, 0xffe040);
      const bg = boat.build({ name: 'boat' }); scene.add(bg);
      ctx.anim((dt, t) => { const a = t * 0.08; bg.position.set(150 + Math.cos(a) * 45, -1.9 + Math.sin(t * 1.3) * 0.15, -275 + Math.sin(a) * 25); bg.rotation.y = -a; }); }
    const turtle = () => { const tb = new BrickBuilder(1); tb.sphere(0, 0, 0, 1.6, 0x4a7a3a, { sy: 0.45 }); tb.sphere(0, 0, 1.8, 0.6, 0x8aa86a); for (const sd of [-1, 1]) for (const fz of [-1, 1]) P.rbox(tb, sd * 1.6, 0, fz * 0.9, 1.4, 0.15, 0.6, 0, sd * fz * 0.4, 0, 0x8aa86a); return tb.build({ name: 'turtle' }); };
    for (let n = 0; n < 3; n++) { const tt = turtle(); scene.add(tt); const ph = n * 2.1; ctx.anim((dt, t) => { const a = t * 0.12 + ph; tt.position.set(150 + Math.cos(a) * 30 * (1 + n * 0.3), -2.2, -280 + Math.sin(a) * 18); tt.rotation.y = -a; }); }

    // ---- north beach landing: flying-fish curses hop across -------------------------------------
    edges(ctx, 11.2, 12.95, 9, 2, (p) => { if (rand() < 0.7) palm(b, p.x, 0, p.z, 1 + rand() * 0.5, rand); });
    for (const [k, sp, off] of [[12.4, 5, 0], [12.7, 6, 0.5]]) ctx.hazard(crossing(ctx, { mesh: fishCurse(), k, speed: sp, radius: 1.6, kind: 'bump', offset: off }));

    // ---- Star Religious Group temple -------------------------------------------------------------
    { const k = 13.6, i = K(k), p = spot(k, edgeLat(i) + 34, 26), r0 = tr.at(i, 0, 0), rot = Math.atan2(r0.x - p.x, r0.z - p.z);
      const top = P.hall(b, p.x, p.z, 40, 24, 9, rot, { wall: C.white, wood: GOLDC, roof: 0x3a3e4a, tiers: 2 });
      b.cyl(p.x, top, p.z, 0.5, 8, GOLDC, { seg: 6 }); b.sphere(p.x, top + 8.5, p.z, 1.6, 0xffe080, { matOpts: { emissive: 0xffc040, emissiveIntensity: 1.5 } });
      const ca = Math.cos(rot), sa = Math.sin(rot);
      for (let n = -3; n <= 3; n++) { const lz = 16 + Math.abs(n) * 0.2; b.box(p.x + n * 3.2 * ca + lz * sa, 0, p.z - n * 3.2 * sa + lz * ca, 2.6, 0.5 + (3 - Math.abs(n)) * 0.01, 6, C.white, { rot }); }
      ctx.claim(p.x, p.z, 30);
      // rows of devotees in white, applauding
      const devs = [];
      for (let r = 0; r < 2; r++) for (let n = -3; n <= 3; n++) {
        const lx = n * 4.4 + r * 2.2, lz = 24 + r * 5, x = p.x + lx * ca + lz * sa, z = p.z - lx * sa + lz * ca;
        if (tr.clearance(x, z, 10) < 4) continue;
        const d = Q.devotee(2.3, n + r * 7 + 9); d.root.position.set(x, 0, z); d.root.rotation.y = rot; ctx.group.add(d.root); devs.push([d, rand() * 3]);
      }
      ctx.anim((dt, t) => { for (const [d, ph] of devs) { const c = Math.abs(Math.sin(t * 7 + ph)); d.armR.rotation.set(-1.2, 0, 0.6 - c * 0.7); d.armL.rotation.set(-1.2, 0, -0.6 + c * 0.7); } });
    }
    edges(ctx, 13.1, 14.45, 13, 3, (p) => P.lantern(b, p.x, p.z, 1.2));
    { const i = K(13.15), p = tr.at(i, 0, 0); P.torii(b, p.x, 0, p.z, 2 * (edgeLat(i) + 2), 12, tr.yawAt(i), C.white); }
    ctx.scatter(60, { minC: 6, maxC: 80, r: 4, test: (x, z) => grass.test(x, z) && z < -120 }, (x, z) => pine(b, x, 0, z, 1.3 + rand() * 0.6, false, rand() < 0.5 ? C.green : C.dkgreen));

    // ---- Tengen's Tomb: the entrance gate and the endless corridor of doors -----------------
    { const i = K(14.95), p = tr.at(i, 0, 0), yaw = tr.yawAt(i), w = edgeLat(i) + 6;
      for (const sd of [-1, 1]) { const q = tr.at(i, sd * w, 0); b.box(q.x, 0, q.z, 6, 16, 8, 0x8a8478, { rot: yaw }); }
      b.box(p.x, 14, p.z, 2 * w + 6, 3, 9, 0x3a3e4a, { rot: yaw });
      for (const sd of [-1, 1]) b.boxM(mat4(p.x + Math.cos(yaw) * sd * w * 0.55, 18.5, p.z - Math.sin(yaw) * sd * w * 0.55, 0, yaw, -sd * 0.3, w * 1.25, 0.8, 11), 0x2a2e36);
      b.box(p.x, 18.2 + w * 0.18, p.z, 3, 1.4, 11.5, 0x2a2e36, { rot: yaw });
      // rocky hill the corridor burrows into
      ctx.claim(p.x, p.z, 10);
    }
    { const DOOR = 0xf4ecd8, FRAME = 0x5a3220, ROOF = 0x3a2418;
      const lamp = plastic(0xffd890, { emissive: 0xffc060, emissiveIntensity: 1.8 });
      let n = 0;
      each(tr, 15.0, 17.05, 4, (i) => {
        const w = edgeLat(i) + 1.4, yaw = tr.yawAt(i);
        for (const sd of [-1, 1]) {
          const q = tr.at(i, w * sd, 0);
          b.box(q.x, q.y - 1, q.z, 1.2, 11, 4.2, FRAME, { rot: yaw });
          const f = tr.at(i, (w - 0.62) * sd, 0);
          nb.box(f.x, f.y + 0.2, f.z, 0.1, 7.6, 3.4, n % 7 === 3 ? 0x2a1a10 : DOOR, { rot: yaw });
          nb.box(f.x, f.y + 3.9, f.z, 0.16, 0.18, 3.5, FRAME, { rot: yaw }); nb.box(f.x, f.y + 0.2, f.z, 0.16, 7.6, 0.18, FRAME, { rot: yaw });
          nb.box(f.x, f.y + 7.8, f.z, 0.2, 2.2, 3.6, 0x8a5a30, { rot: yaw });
        }
        const c = tr.at(i, 0, 0), top = Math.max(tr.surfaceY(i, -w), tr.surfaceY(i, w)) + 10;
        b.box(c.x, top, c.z, w * 2 + 2, 1.4, 4.2, n % 2 ? ROOF : FRAME, { rot: yaw });
        b.box(c.x, top + 1.4, c.z, w * 2 + 8, 6, 4.2, 0x7a7468, { rot: yaw });
        if (n % 3 === 0) { nb.cyl(c.x, top - 2.2, c.z, 0.7, 1.6, 0, { mat: lamp, seg: 8 }); nb.box(c.x, top - 0.6, c.z, 0.1, 0.6, 0.1, C.black); }
        n++;
      });
    }
    // Toji in the corridor, sweeping his chain across the road
    ctx.hazard(tojiChain(ctx, { k: 15.85, side: 1, period: 3.6 }));
    ctx.hazard(tojiChain(ctx, { k: 16.55, side: -1, period: 3.6, offset: 0.9 }));
    // a few warm points of light so the corridor reads at speed
    for (const k of [15.4, 16.2, 16.9]) { const p = tr.at(K(k), 0, 7); const l = new THREE.PointLight(0xffc070, 3, 60, 1.3); l.position.copy(p); scene.add(l); }

    // ---- Tengen's barrier chamber: the great tree, cliffs and the storage worm ----------------------
    { const [vx, vz] = VAULT;
      b.cyl(vx, 0, vz, 26, 3, 0x8a8478, { seg: 20 }); b.cyl(vx, 3, vz, 20, 3, 0x9a9488, { seg: 20 }); b.cyl(vx, 6, vz, 14, 4, 0x8a8478, { seg: 20 });
      let y = 10; for (let k = 0; k < 7; k++) y = b.cyl(vx + Math.sin(k) * 0.6, y, vz + Math.cos(k) * 0.6, 5 - k * 0.28, 5, k % 2 ? 0xe8e2d4 : 0xd8d0c0, { seg: 12 });
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28, l = 18 + (k % 3) * 6; P.rbox(b, vx + Math.cos(a) * l * 0.45, y + 2 + (k % 3) * 3, vz + Math.sin(a) * l * 0.45, l, 1.6, 1.6, 0, -a, 0.35, 0xe8e2d4);
        b.sphere(vx + Math.cos(a) * l * 0.9, y + 6 + (k % 3) * 4, vz + Math.sin(a) * l * 0.9, 5 + (k % 2) * 2, [0xf4f0e4, 0xfff4c0, 0xe8f8ff][k % 3], { matOpts: { emissive: 0xfff0b0, emissiveIntensity: 0.35 } }); }
      // little shrines on the branches
      for (const a of [0.4, 2.5, 4.4]) { const x = vx + Math.cos(a) * 9, z = vz + Math.sin(a) * 9; P.hall(b, x, z, 5, 4, 2.5, -a, { wall: C.white, wood: C.dkred, roof: 0x2a2e36 }); }
      ctx.claim(vx, vz, 30); ctx.obstacle(vx, vz, 26, 12);
      const halo = P.glow(0xfff0c0, 70, 0.22); halo.position.set(vx, y + 10, vz); scene.add(halo);
      // tall rock cliffs closing the chamber on the outside
      each(tr, 17.0, 19.8, 6, (i) => { const sd = Math.hypot(tr.at(i, 10, 0).x - vx, tr.at(i, 10, 0).z - vz) > Math.hypot(tr.at(i, -10, 0).x - vx, tr.at(i, -10, 0).z - vz) ? 1 : -1; const q = tr.at(i, sd * (edgeLat(i) + 8 + rand() * 10), 0); let yy = -1; const yaw = tr.yawAt(i); for (let k = 0; k < 5; k++) yy = b.box(q.x + (rand() - 0.5) * 3, yy, q.z + (rand() - 0.5) * 3, 9 + rand() * 4, 6 + rand() * 6, 9 + rand() * 4, k % 2 ? 0x7a7468 : 0x6a645a, { rot: yaw + rand() }); });
      arch(ctx, 17.3, { cols: [C.white, C.dkred], text: 'STAR PLASMA VESSEL', bg: '#3a1a10', fg: '#ffe0a0' });
      // awakened Gojo floating above the tree, a sphere of purple gathering in his hands
      const ga = Q.gojoAwake(3.2); ga.root.position.set(vx + 20, 34, vz - 10); ga.root.rotation.y = Math.atan2(tr.px(K(18.2)) - vx, tr.pz(K(18.2)) - vz); scene.add(ga.root);
      ga.armR.rotation.set(-1.3, 0, -0.4); ga.armL.rotation.set(-1.3, 0, 0.4);
      const orb = new THREE.Group(); orb.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf0d8ff })), P.glow(0xb04aff, 14, 0.95)); orb.position.set(0, 7.4, 5.4); ga.root.add(orb);
      ctx.anim((dt, t) => { ga.root.position.y = 34 + Math.sin(t * 0.9) * 1.2; orb.scale.setScalar(1 + Math.sin(t * 3) * 0.15); });
    }
    [[18.0, -0.45, 0], [18.45, 0.45, 1.5], [18.9, -0.15, 3.0]].forEach(([k, lat, off]) => ctx.hazard(storageWorm(ctx, { k, lat, period: 4.6, offset: off })));
    // Toji's ambush point: the man himself at the chamber exit, arms crossed
    { const p = spot(19.35, 24, 4); const tj = add(Q.toji(3.4), p, 19.35); tj.armR.rotation.set(-1.4, 0, 0.9); tj.armL.rotation.set(-1.4, 0, -0.9); const sb = new BrickBuilder(1); Q.invertedSpear(sb, 0, 0, 0, 1.2); const sp = sb.build({ name: 'spear' }); sp.position.set(3, 0.4, 2); sp.rotation.z = Math.PI / 2; tj.root.add(sp); }

    // ---- back up to the school: summer forest ----------------------------------------------
    ctx.scatter(50, { minC: 6, maxC: 70, r: 4, test: (x, z) => grass.test(x, z) && !vault.test(x, z) && z > -120 && z < 140 }, (x, z) => roundTree(b, x, 0, z, 1.3 + rand() * 0.7, rand() < 0.5 ? C.green : 0x2e8a3a));
    ctx.scatter(30, { minC: 8, maxC: 120, r: 3, test: (x, z) => grass.test(x, z) && !vault.test(x, z) }, (x, z) => rock(b, x, 0, z, 1.2, rand, [C.ltgray, C.dkgray]));

    // ---- characters around the school -----------------------------------------------------------
    // young Gojo and Geto, the strongest duo, hanging out by the vending machines
    { const p = spot(1.6, -26, 4); const g1 = add(Q.youngGojo(3.4), p, 1.6); g1.armL.rotation.set(-0.3, 0, 0.2); g1.armR.rotation.set(-1.9, 0, -0.3);
      const blue = new THREE.Group(); blue.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), P.neon(0x3ab8ff, 2.5)), P.glow(0x5ac8ff, 7)); blue.position.set(-0.6 * 3.4, 9.6, 4.6); g1.root.add(blue);
      ctx.anim((dt, t) => { blue.position.y = 9.6 + Math.sin(t * 3) * 0.4; blue.rotation.y = t * 3; }); }
    { const p = spot(1.85, -26, 4); const g2 = add(Q.youngGeto(3.4), p, 1.85); g2.armR.rotation.set(-1.0, 0, -0.2);
      const cb = new BrickBuilder(1); for (let n = 0; n < 6; n++) { const a = n / 6 * 6.28; cb.sphere(Math.cos(a) * 3, 0, Math.sin(a) * 3, 0.8, [0x3a1a4a, 0x1a3a2a, 0x4a1a1a][n % 3]); cb.sphere(Math.cos(a) * 3.3, 0.3, Math.sin(a) * 3.3, 0.25, 0xffe040, { matOpts: { emissive: 0xffd020, emissiveIntensity: 2 } }); }
      const ring = cb.build({ name: 'curses' }); ring.position.set(0, 12, 0); g2.root.add(ring); ctx.anim((dt, t) => { ring.rotation.y = t * 1.2; }); }
    // Shoko and Utahime at the school gate
    { const p = spot(0.25, 24, 4); const sh = add(Q.shoko(3.2), p, 0.25); sh.armR.rotation.x = -0.8; ctx.anim((dt, t) => { sh.armR.rotation.x = -0.8 + Math.sin(t * 0.7) * 0.2; }); }
    { const p = spot(0.55, 24, 4); const ut = add(Q.utahime(3.2), p, 0.55); ut.armR.rotation.set(-0.4, 0, -0.9); ut.armL.rotation.set(-0.4, 0, 0.9); ctx.anim((dt, t) => { ut.armR.rotation.z = -0.9 - Math.max(0, Math.sin(t * 2.5)) * 0.6; }); }
    // Riko and Kuroi waiting with luggage by the gate (the escort begins)
    { const p = spot(20.35, -24, 4); const r1 = add(Q.riko(3.0), p, 20.35); r1.armR.rotation.z = -2.6; ctx.anim((dt, t) => { r1.armR.rotation.z = -2.6 + Math.sin(t * 5) * 0.3; }); b.box(p.x + 3, 0, p.z + 1, 2, 3, 1.2, 0xc83a5a); }
    { const p = spot(20.1, -24, 4); add(Q.kuroi(3.0), p, 20.1); }

    // ---- Geto's rainbow dragon circling over the sea ------------------------------------------
    ctx.hazard(rainbowDragon(ctx, { home: [360, -20], passes: [5.15, 6.05, 4.55], period: 8.5 }));

    // ---- summer sky: towering cumulus clouds --------------------------------------------------
    for (let n = 0; n < 14; n++) { const a = n / 14 * 6.28 + rand() * 0.3, r = 520 + rand() * 200, x = Math.cos(a) * r, z = Math.sin(a) * r; for (let k = 0; k < 4; k++) cloud(nb, x + (rand() - 0.5) * 30, 60 + k * 14, z + (rand() - 0.5) * 30, 4 - k * 0.6, rand); }
    for (let k = 0; k < 10; k++) cloud(nb, (rand() - 0.5) * 900, 120 + rand() * 40, (rand() - 0.5) * 900, 2.4, rand);
    const sun = P.glow(0xfff4c0, 240, 0.8); sun.position.set(450, 600, 320); scene.add(sun);
    // TEMPCAM
    { const q = new URLSearchParams(location.search); const ck = q.get('camk'), cw = q.get('camw');
      if (ck || cw) { let p, tg; if (ck) { const [k, lat, h, dk, th = 2] = ck.split(',').map(Number); p = tr.at(K(k), lat, h); tg = tr.at(K(k + dk), 0, th); } else { const a = cw.split(',').map(Number); p = new THREE.Vector3(a[0], a[1], a[2]); tg = new THREE.Vector3(a[3], a[4], a[5]); }
        ctx.anim(() => { const r = ctx.world.race; if (!r) return; for (const c of [r.introCam, r.cams?.[0]?.chase.cam, r.tv?.cam]) if (c) { c.position.copy(p); c.lookAt(tg); if (c.far < 3000) { c.far = 3000; c.updateProjectionMatrix(); } } }); }
      if (q.get('laps')) { let nt = 0; ctx.anim((dt, t) => { const r = ctx.world.race; if (!r || t < nt) return; nt = t + 10; console.warn('LAPS t=' + t.toFixed(0) + ' ' + r.karts.map((k) => k.lap + ':' + (k.raceDist | 0)).join(' ')); }); } }
    // /TEMPCAM
    void trackPolygon; void V2;
  },
};

const GOLDC = 0xdcbc81;
