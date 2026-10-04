// Green Brick Zone (Sonic the Hedgehog): start in Green Hill beside a giant
// loop-de-loop, dodge Motobugs, spiral up the corkscrew around a waterfall lake
// and over the start straight, spring across the cliff tops under Buzz Bombers,
// glide over the ocean, bounce through Casino Night's pinball bumpers, then race
// through Dr. Eggman's base under the Death Egg past his wrecking ball.
import { THREE, BrickBuilder, C, plastic, groundPlane, liquid, disc, strokeTrack, inRange, each, arch, crossing, trackMover } from './kit.js';
import * as P from './sonic-props.js';

const SN = P.SN;
const fxOf = (ctx) => ctx.world.race?.fx;
const sfx = (ctx, name, p) => ctx.world.race?.audio.sfx(name, p);

// ---- hazards --------------------------------------------------------------------------------

// Buzz Bomber: flies to a spot above the road, a red ring marks where it aims while
// its stinger charges, then it fires an energy shot straight down.
function buzzBomber(ctx, { targets, period = 4.4, offset = 0, radius = 3.6, height = 9 }) {
  const tr = ctx.track;
  const bz = P.buzzBomber(1.4); ctx.group.add(bz);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0, depthWrite: false });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xff8a20, transparent: true, opacity: 0, depthWrite: false });
  const marker = new THREE.Group();
  marker.add(new THREE.Mesh(new THREE.RingGeometry(radius - 0.6, radius, 28).rotateX(-Math.PI / 2), ringMat));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.6, 28).rotateX(-Math.PI / 2), fillMat); marker.add(fill);
  ctx.group.add(marker);
  const shot = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), P.neon(0xff7a20, 3)); shot.visible = false; ctx.group.add(shot);
  const target = new THREE.Vector3(), from = new THREE.Vector3(), hover = new THREE.Vector3(), cur = new THREE.Vector3();
  let state = 0, cycle = -1, boom = false, ti = 0;
  const FLY = 1.3, AIM = 1.4, SHOT = 0.22, HIT = 0.3;
  const pickT = () => {
    const [k, lf] = targets[ti++ % targets.length];
    const i = tr.wrap(tr.kToIndex(k) + Math.floor((Math.random() - 0.5) * 12));
    tr.at(i, (lf + (Math.random() - 0.5) * 0.4) * tr.HW[i], 0.14, target);
  };
  pickT(); cur.copy(target).y += height;
  return {
    update(dt, t) {
      const tt = t + offset, n = Math.floor(tt / period), ph = tt - n * period;
      if (n !== cycle) { cycle = n; from.copy(cur); pickT(); boom = false; }
      hover.copy(target); hover.y += height;
      marker.position.copy(target);
      if (ph < FLY) { state = 0; const f = ph / FLY, e = f * f * (3 - 2 * f); cur.lerpVectors(from, hover, e); cur.y += Math.sin(f * Math.PI) * 4; ringMat.opacity = fillMat.opacity = 0; shot.visible = false; }
      else if (ph < FLY + AIM) { state = 1; const f = (ph - FLY) / AIM; cur.copy(hover); ringMat.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t * 9)); fillMat.opacity = 0.1 + 0.25 * f; fill.scale.setScalar(Math.max(0.01, f)); }
      else if (ph < FLY + AIM + SHOT) { state = 1; const f = (ph - FLY - AIM) / SHOT; cur.copy(hover); shot.visible = true; shot.position.lerpVectors(hover, target, f); shot.position.y -= 1.5 * (1 - f); }
      else if (ph < FLY + AIM + SHOT + HIT) {
        state = 2; cur.copy(hover); shot.visible = false; ringMat.opacity = 0.9; fillMat.opacity = 0.5;
        if (!boom) { boom = true; const fx = fxOf(ctx); if (fx) { fx.pop(target, 0xff8a20); for (let m = 0; m < 16; m++) { const a = Math.random() * 6.28; fx.spark(target.x, target.y + 0.4, target.z, Math.cos(a) * 9, 3 + Math.random() * 5, Math.sin(a) * 9, m % 2 ? 0xffe040 : 0xff5020, 0.5, 14); } } sfx(ctx, 'cannon', target); }
      } else { state = 0; cur.copy(hover); ringMat.opacity = fillMat.opacity = Math.max(0, ringMat.opacity - dt * 3); }
      bz.position.copy(cur); bz.position.y += Math.sin(t * 3 + offset) * 0.4;
      const dx = hover.x - from.x, dz = hover.z - from.z;
      if (state === 0 && ph < FLY && dx * dx + dz * dz > 1) bz.rotation.y = Math.atan2(dx, dz);
      bz.rotation.x = state === 1 ? -0.25 : 0;
      const fl = Math.sin(t * 40) * 0.5; bz.userData.wings[0].rotation.z = fl; bz.userData.wings[1].rotation.z = -fl;
    },
    test(p) { return state === 2 && Math.hypot(p.x - target.x, p.z - target.z) < radius + 0.4 && Math.abs(p.y - target.y) < 4 ? 'spin' : null; },
    near(p, r) { return state > 0 && Math.hypot(p.x - target.x, p.z - target.z) < radius + r; },
  };
}

// Spike strip across part of the road: the slots flash red, spikes peek, then pop up.
function spikeStrip(ctx, { k, lat0, lat1, period = 3.6, offset = 0, depth = 3.2 }) {
  const tr = ctx.track, i = tr.kToIndex(k), hw = tr.HW[i];
  const a = lat0 * hw, b = lat1 * hw, w = Math.abs(b - a), lc = (a + b) / 2;
  const base = tr.at(i, lc, 0), yaw = tr.yawAt(i);
  const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = tr.R[i * 2], rz = tr.R[i * 2 + 1];
  const hold = new THREE.Group(); hold.position.copy(base); hold.rotation.order = 'YXZ'; hold.rotation.y = yaw; hold.rotation.z = -Math.atan(tr.BK[i]);
  const slotMat = plastic(0x2a2e34, { emissive: 0xff2010, emissiveIntensity: 0 });
  hold.add(P.part((L) => { L.box(0, 0.06, 0, w, 0.12, depth, 0, { mat: slotMat }); for (const sd of [-1, 1]) L.box(0, 0.08, sd * (depth / 2 + 0.15), w, 0.16, 0.3, SN.gold); }, 'spike-plate'));
  const spikes = P.part((L) => { const n = Math.max(3, Math.round(w / 1.6)); for (let m = 0; m < n; m++) for (const z of [-0.8, 0.8]) L.cone(-w / 2 + (m + 0.5) * w / n, 0, z, 0.55, 1.9, 0xd8dce2, { seg: 6, matOpts: { metal: 0.8, rough: 0.25 } }); }, 'spikes');
  hold.add(spikes); ctx.group.add(hold);
  let state = 0, up = false;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.4 down, .4-.62 warning, .62-.92 up, .92-1 retract
      if (ph < 0.4) { state = 0; spikes.position.y = -2; slotMat.emissiveIntensity = 0; up = false; }
      else if (ph < 0.62) { state = 1; spikes.position.y = -1.7 + Math.max(0, Math.sin(t * 30)) * 0.3; slotMat.emissiveIntensity = 0.6 + 0.6 * Math.sin(t * 24); }
      else if (ph < 0.92) { state = 2; spikes.position.y = Math.min(0, -2 + (ph - 0.62) * 60); slotMat.emissiveIntensity = 0.5; if (!up) { up = true; sfx(ctx, 'trap', base); } }
      else { state = 0; spikes.position.y = -2 * (ph - 0.92) / 0.08; slotMat.emissiveIntensity = 0; }
    },
    test(p) {
      if (state !== 2 || p.y > base.y + 3) return null;
      const dx = p.x - base.x, dz = p.z - base.z, al = dx * fx + dz * fz, la = dx * rx + dz * rz;
      return Math.abs(al) < depth / 2 + 0.8 && Math.abs(la) < w / 2 + 0.6 ? 'spin' : null;
    },
    near(p, r) { if (!state) return false; const dx = p.x - base.x, dz = p.z - base.z; return Math.abs(dx * fx + dz * fz) < depth / 2 + r && Math.abs(dx * rx + dz * rz) < w / 2 + r; },
  };
}

// Casino Night pinball bumper: solid, lights up and knocks you away on contact.
function pinBumper(ctx, pos, r, col) {
  const m = P.bumper(r, col); m.position.copy(pos); ctx.group.add(m);
  ctx.obstacle(pos.x, pos.z, r * 0.7, 4, pos.y);
  const cap = m.userData.cap, base = cap.material.emissiveIntensity;
  let flash = 0;
  const h = {
    pos,
    update(dt, t) { flash = Math.max(0, flash - dt * 3); cap.material.emissiveIntensity = base + flash * 3 + Math.sin(t * 4 + pos.x) * 0.3; m.scale.setScalar(1 + flash * 0.25); },
    test(p) {
      if (Math.hypot(p.x - pos.x, p.z - pos.z) < r + 1.5 && Math.abs(p.y - pos.y) < 4) { if (flash < 0.3) sfx(ctx, 'bounce', pos); flash = 1; return 'bump'; }
      return null;
    },
    near(p, rr) { return Math.hypot(p.x - pos.x, p.z - pos.z) < r + rr; },
  };
  return h;
}

// Dr. Eggman hovers over the road in the Egg Mobile swinging the checkered wrecking
// ball across it like a pendulum; its shadow on the road shows where it'll be.
function wreckingBall(ctx, { k, period = 3.6, offset = 0, amp = 1.05 }) {
  const tr = ctx.track, i = tr.kToIndex(k), c = tr.at(i, 0, 0), yaw = tr.yawAt(i);
  const rx = tr.R[i * 2], rz = tr.R[i * 2 + 1];
  const H = 17, Lc = 13.2, BR = 2.7;
  const pv = new THREE.Vector3(c.x, c.y + H, c.z);
  const egg = P.eggMobile(1.15); egg.position.copy(pv); egg.position.y += 1.2; egg.rotation.y = yaw + Math.PI; ctx.group.add(egg);
  const ball = P.wreckBall(BR); ctx.group.add(ball);
  const linkM = plastic(0x4a5058, { metal: 0.6, rough: 0.35 }), linkG = new THREE.TorusGeometry(0.42, 0.13, 6, 10);
  const links = [];
  for (let n = 0; n < 9; n++) { const l = new THREE.Mesh(linkG, linkM); l.rotation.y = n % 2 ? Math.PI / 2 : 0; ctx.group.add(l); links.push(l); }
  const shMat = new THREE.MeshBasicMaterial({ color: 0x200000, transparent: true, opacity: 0.2, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(BR + 0.6, 24).rotateX(-Math.PI / 2), shMat); ctx.group.add(shadow);
  const bp = new THREE.Vector3();
  let th = 0, lastSide = 0;
  return {
    pos: bp,
    update(dt, t) {
      th = amp * Math.sin((t + offset) / period * Math.PI * 2);
      const lx = Math.sin(th) * Lc, ly = -Math.cos(th) * Lc;
      bp.set(pv.x + rx * lx, pv.y + ly, pv.z + rz * lx);
      ball.position.copy(bp); ball.rotation.set(0, yaw, -th);
      for (let n = 0; n < links.length; n++) { const f = (n + 0.5) / links.length * (Lc - BR) / Lc; links[n].position.set(pv.x + rx * lx * f, pv.y + ly * f, pv.z + rz * lx * f); }
      egg.position.y = pv.y + 1.2 + Math.sin(t * 2.2) * 0.3; egg.rotation.z = -th * 0.15;
      shadow.position.set(bp.x, (tr.roadHeightNear(bp.x, bp.z) ?? c.y) + 0.12, bp.z);
      const low = Math.max(0, 1 - (bp.y - c.y - BR) / 7);
      shMat.opacity = 0.12 + 0.5 * low; shMat.color.setHex(low > 0.6 ? 0x6a0000 : 0x200000);
      const sd = Math.sign(th);
      if (sd && sd !== lastSide && Math.abs(th) < 0.1) sfx(ctx, 'rocket', bp);
      lastSide = sd;
    },
    test(p) { return Math.hypot(p.x - bp.x, p.z - bp.z) < BR + 1.2 && p.y + 1 > bp.y - BR - 0.6 && p.y < bp.y + BR ? 'wreck' : null; },
    near(p, r) { return bp.y - c.y < 8 && Math.hypot(p.x - bp.x, p.z - bp.z) < BR + r + 3; },
  };
}

// ---- the map ------------------------------------------------------------------------------------------
export default {
  id: 'sonic', name: 'Green Brick Zone', subtitle: 'Loops, springs, Casino Night bumpers and Eggman\'s wrecking ball', cup: 'games', seed: 1991,
  width: 28, shoulder: 6, edge: 'fence', start: 0.5,
  points: [[-215,-162,0],[-138,-172,0],[-60,-167,0],[17,-159,0],[86,-165,0],[150,-162,0],[206,-136,2],[225,-85,5],[198,-38,8],[142,-30,11],[99,-67,13],[108,-123,15],[138,-175,16],[176,-220,19],[236,-233,23],[277,-193,26],[292,-128,24],[286,-42,12],[273,27,4],[249,96,0],[189,148,0],[112,173,0],[34,182,0],[-43,165,0],[-112,195,0],[-185,182,0],[-241,122,0],[-251,44,0],[-236,-33,0],[-245,-110,0]],
  sections: [
    { from: 29.3, to: 5.5, surface: 'hill', shoulder: 7 },
    { from: 5.5, to: 12.5, surface: 'hill', edge: 'wall', shoulder: 3, bank: 1.4 },
    { from: 12.5, to: 15.66, surface: 'hill', edge: 'wall', shoulder: 3, support: 'bank' },
    { from: 13.6, to: 13.66, gap: true },
    { from: 15.7, to: 17.2, gap: true },
    { from: 17.2, to: 18.95, surface: 'sand', edge: 'open', shoulder: 8, support: 'bank' },
    { from: 18.95, to: 23.1, surface: 'casino', edge: 'wall', shoulder: 3 },
    { from: 19.85, to: 21.5, width: 42, shoulder: 4 },
    { from: 23.1, to: 29.3, surface: 'egg', edge: 'wall', shoulder: 2 },
  ],
  items: [1.4, 4.1, 7.3, 10.4, 13.0, 17.7, 19.45, 22.6, 24.4, 26.6, 28.6],
  boosts: [[1.9, 0], [3.0, -0.45], [3.0, 0.45], [5.4, 0], [8.8, 0.3], [11.1, -0.3], [12.85, 0], [14.9, 0], [15.35, 0], [18.4, 0.3], [21.8, 0], [24.0, -0.3], [25.9, 0.3], [27.7, 0], [29.15, 0]],
  ramps: [13.55, 22.25],
  gliders: [15.63],
  studs: [[0.8, -0.4, 8], [2.4, 0.4, 8], [3.6, 0, 6], [6.0, 0.3, 6], [7.6, -0.3, 8], [9.5, 0, 8], [11.4, 0.3, 6], [12.4, 0, 6], [14.3, 0, 8], [17.6, 0, 6], [19.3, -0.4, 6], [20.6, 0, 6], [23.4, 0.4, 6], [24.9, -0.4, 6], [26.2, 0, 8], [28.0, 0.3, 6]],
  theme: {
    sky: [0x1a62e0, 0xb4e2ff, 0x4a9ad8], fog: [0xc4e8ff, 260, 1250],
    sun: { color: 0xfff4dc, intensity: 2.7, dir: [0.4, 1, 0.45] },
    hemi: [0xe4f4ff, 0x3a7a3a, 1.25], envIntensity: 0.75,
    ground: SN.grass, groundPitch: 1.6, shoulder: 0x4cc444, dust: 0xc8884a,
    road: { base: '#c88a4a', line: '#fff4c8' },
    surfaces: {
      hill: { base: '#c88a4a', line: null, seams: 'rgba(90,40,10,0.3)', rough: 0.7 },
      sand: { base: '#ecd59a', line: null, seams: 'rgba(150,110,50,0.25)', rough: 0.85 },
      casino: { base: '#2a1258', line: '#ffd23a', seams: 'rgba(255,90,200,0.4)', emissive: 0x2a0a50, emissiveIntensity: 0.5, rough: 0.3, dashed: true },
      egg: { base: '#5a5e66', line: '#ff3a2a', seams: 'rgba(0,0,0,0.5)', metal: 0.35, rough: 0.45 },
    },
    wall: [SN.brown, SN.dkbrown], curb: [SN.blue, C.white], gate: [SN.blue, SN.gold], fence: [SN.dkbrown, SN.gold, SN.red],
    support: 'pillar', pillar: SN.brown, pillar2: SN.dkbrown, skirt: ['#b8692a', '#7a4219'], skirtColor: SN.dkbrown,
    rampSide: SN.red, ramp: SN.gold,
    music: { bpm: 152, root: 62, scale: 'major', style: 'rock' },
  },

  decor(ctx) {
    const { b, rand, track: tr, scene, bounds } = ctx;
    const nb = ctx.bNoShadow;
    const K = (k) => tr.kToIndex(k);
    const edgeLat = (i) => tr.HW[i] + tr.SH[i];
    const cx = bounds.cx, cz = bounds.cz;
    const outSide = (i) => { const p = tr.at(i, 10, 0), q = tr.at(i, -10, 0); return Math.hypot(p.x - cx, p.z - cz) > Math.hypot(q.x - cx, q.z - cz) ? 1 : -1; };
    // yaw that turns a prop's +Z towards the road from side sd
    const faceRoad = (i, sd) => Math.atan2(-sd * tr.R[i * 2], -sd * tr.R[i * 2 + 1]);
    const anims = [];
    ctx.anim((dt, t) => { for (const f of anims) f(dt, t); });
    const nearI = (x, z) => { let bi = 0, bd = 1e12; for (let i = 0; i < tr.N; i += 3) { const d = (tr.px(i) - x) ** 2 + (tr.pz(i) - z) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
    const zone = (x, z) => { const i = nearI(x, z); return inRange(tr, i, 23.05, 29.25) ? 'egg' : inRange(tr, i, 18.9, 23.05) ? 'casino' : inRange(tr, i, 16.6, 18.9) ? 'beach' : 'hill'; };
    const add = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; ctx.group.add(obj); return obj; };

    // ---- restyle the shared track pieces: checkered Green Hill road, dash panels, gold rings ----
    const roadChk = P.tex('roadchk', 256, 256, (g, w, h) => {
      for (let a = 0; a < 8; a++) for (let c = 0; c < 8; c++) { g.fillStyle = (a + c) % 2 ? '#a8622c' : '#d0904c'; g.fillRect(a * w / 8, c * h / 8, w / 8, h / 8); }
      g.fillStyle = 'rgba(60,24,6,0.35)'; for (let a = 0; a <= 8; a++) { g.fillRect(a * w / 8 - 1, 0, 2, h); g.fillRect(0, a * h / 8 - 1, w, 2); }
      g.fillStyle = '#fff4c8'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
    }, true);
    const hillMat = tr.surfMats?.hill;
    if (hillMat) { hillMat.map = roadChk; hillMat.needsUpdate = true; }
    const dash = P.tex('dash', 128, 256, (g, w, h) => {
      g.fillStyle = '#1a3aa8'; g.fillRect(0, 0, w, h);
      for (let n = 0; n < 2; n++) {
        const y = n * h / 2 + 18;
        g.fillStyle = '#ffd21a'; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w - 12, y + 56); g.lineTo(w - 40, y + 56); g.lineTo(w / 2, y + 28); g.lineTo(40, y + 56); g.lineTo(12, y + 56); g.closePath(); g.fill();
        g.fillStyle = '#ff3a1a'; g.beginPath(); g.moveTo(w / 2, y + 40); g.lineTo(w - 30, y + 86); g.lineTo(w - 52, y + 86); g.lineTo(w / 2, y + 62); g.lineTo(52, y + 86); g.lineTo(30, y + 86); g.closePath(); g.fill();
      }
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
    }, true);
    for (const bp of tr.boosts) { bp.mat.map = dash; bp.mat.emissiveMap = dash; bp.mat.emissive.setHex(0x8a8aff); bp.mat.emissiveIntensity = 0.6; bp.mat.needsUpdate = true; }
    if (tr.studMesh) { tr.studMesh.geometry.dispose(); tr.studMesh.geometry = new THREE.TorusGeometry(0.66, 0.2, 8, 22); tr.studMesh.material = P.goldMat(); }
    // springs at both sides of each ramp lip, big ones at the glider
    for (const r of tr.ramps) {
      for (const sd of [-1, 1]) {
        const p = tr.at(r.i, sd * (tr.HW[r.i] + 2.2), 0);
        const s = P.spring(r.glide ? 1.4 : 1, r.glide ? SN.gold : SN.red); add(s, p.x, p.y, p.z, tr.yawAt(r.i));
        const ph = rand() * 6; anims.push((dt, t) => { s.scale.y = (r.glide ? 1.4 : 1) * (1 + Math.max(0, Math.sin(t * 3 + ph)) * 0.18); });
      }
    }

    // ---- ground: ocean to the east (under the glide), the corkscrew lake, Casino and Eggman ground ----
    const LAKE = [163, -80, 27];
    const gliding = (i) => inRange(tr, i, 15.66, 17.25);
    const gully = (i) => inRange(tr, i, 13.58, 13.68);
    const OCX = 322;
    const ocean = (g, toPx, sc, pad) => { const [x0, y0] = toPx(OCX - pad, -1500); g.fillRect(x0, y0, 4000, 4000); };
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = '#000'; ocean(g, toPx, sc, 0); disc(g, toPx, sc, LAKE[0], LAKE[1], LAKE[2]);
      strokeTrack(g, tr, toPx, sc, 22, gliding); strokeTrack(g, tr, toPx, sc, 4, gully);
    });
    ctx.cutGround(hole);
    const water = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; ocean(g, toPx, sc, 6); disc(g, toPx, sc, LAKE[0], LAKE[1], LAKE[2] + 3); strokeTrack(g, tr, toPx, sc, 28, gliding); strokeTrack(g, tr, toPx, sc, 8, gully); });
    liquid(ctx, water, 0x1a7ad8, -2.2, { size: 1600, speed: 0.05, rough: 0.08, opacity: 0.88 });
    // sandy shore along the ocean and around the landing beach
    const sand = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; const [x0, y0] = toPx(OCX - 24, -1500); g.fillRect(x0, y0, 4000, 4000); strokeTrack(g, tr, toPx, sc, 16, (i) => inRange(tr, i, 17.0, 19.0)); });
    scene.add(groundPlane(0xe8d090, -0.06, 1600, 1.6, { mask: sand, rough: 0.9 }));
    const zoneGround = (from, to, pad, col, y) => {
      const m = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; strokeTrack(g, tr, toPx, sc, pad, (i) => inRange(tr, i, from, to)); });
      scene.add(groundPlane(col, y, 1600, 1.6, { mask: m, rough: 0.6 }));
    };
    zoneGround(19.1, 22.9, 60, 0x2a1a4a, -0.04);
    zoneGround(23.3, 29.0, 64, 0x4a4e56, -0.03);
    const fallM = P.fallMat();
    anims.push((dt, t) => { fallM.map.offset.y = t * 1.2; });

    // ---- Green Hill: checkered cliffs, palms, sunflowers, totems --------------------------------
    // a wall of tiered checkered cliffs behind the start straight, with waterfalls into a stream
    {
      const sd0 = outSide(K(1.5));
      let n = 0;
      each(tr, 28.9, 5.2, 9, (i) => {
        const sd = outSide(i); if (sd !== sd0) return;
        const e = edgeLat(i), yaw = tr.yawAt(i);
        const d1 = e + 40 + (n % 3) * 4, h1 = 14 + ((n * 7) % 5) * 3;
        const p = tr.at(i, sd * d1, 0); p.y = 0;
        if (!inRange(tr, i, 1.6, 3.2)) { P.cliff(b, p.x, 0, p.z, 11, h1, 10, yaw); ctx.claim(p.x, p.z, 8); }
        const q = tr.at(i, sd * (d1 + 12), 0);
        P.cliff(b, q.x, 0, q.z, 12, h1 + 8 + (n % 2) * 6, 11, yaw); ctx.claim(q.x, q.z, 8);
        if (n % 5 === 2 && !inRange(tr, i, 1.4, 3.4)) {
          const f = tr.at(i, sd * (d1 - 5.3), 0);
          P.waterfall(ctx.group, f.x, 0, h1 + 0.6, f.z, 6, yaw + (sd > 0 ? Math.PI : 0));
        }
        n++;
      });
      // the stream at the cliff foot
      const strm = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; each(tr, 28.9, 5.2, 3, (i) => { if (outSide(i) !== sd0) return; const p = tr.at(i, sd0 * (edgeLat(i) + 30), 0); disc(g, toPx, sc, p.x, p.z, 5); }); });
      const st = groundPlane(0x3aa0f0, 0.02, 1600, 1.6, { mask: strm, rough: 0.1 }); st.material.emissive = new THREE.Color(0x1a60b0); st.material.emissiveIntensity = 0.3; scene.add(st);
    }
    // the giant loop-de-loop beside the start straight, with Sonic spin-dashing round it
    {
      const i = K(2.4), sd = outSide(i), p = tr.at(i, sd * (edgeLat(i) + 17), 0), yaw = tr.yawAt(i);
      const R = 17, loop = P.loopDeLoop(R, 11); add(loop, p.x, 0, p.z, yaw);
      for (let o = -20; o <= 20; o += 8) ctx.claim(p.x + Math.sin(yaw) * o, p.z + Math.cos(yaw) * o, 12);
      const ball = P.spinBall(1); ctx.group.add(ball);
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      anims.push((dt, t) => {
        // run in along the base, loop round, run out: 5 s cycle
        const T = (t % 5) / 5;
        let along, y;
        if (T < 0.25) { along = -40 + T / 0.25 * 40; y = 2.7; }
        else if (T < 0.65) { const a = (T - 0.25) / 0.4 * Math.PI * 2; along = Math.sin(a) * (R - 1.5); y = R + 1.2 - Math.cos(a) * (R - 1.5); }
        else { along = (T - 0.65) / 0.35 * 45; y = 2.7; }
        ball.position.set(p.x + fx * along, y, p.z + fz * along);
        ball.userData.ball.rotation.x += dt * 22;
        ball.rotation.y = yaw;
      });
      // a speed-shoes monitor and a ring monitor at the loop's foot
      for (const [o, ic] of [[-14, 'R'], [14, 'S']]) {
        const m = P.part((L) => { L.boxB(0, 0, 0, 2.8, 2.8, 2.4, 0xc0c4c8); L.boxB(0, 0.5, 1.2, 2.2, 1.7, 0.1, 0x10141c); L.box(0, 3.0, 0, 1.4, 0.4, 1.0, SN.dksteel); }, 'monitor');
        add(m, p.x + fx * o - sd * tr.R[i * 2] * 9, 0, p.z + fz * o - sd * tr.R[i * 2 + 1] * 9, faceRoad(i, sd));
        const icon = ic === 'R' ? P.bigRing(0.55, 0.16) : new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), P.neon(SN.red, 1));
        icon.position.set(0, 1.35, 1.3); m.add(icon);
      }
    }
    // giant gold rings standing over the road (the road runs through them)
    for (const k of [3.55, 28.25, 18.1]) {
      const i = K(k), e = edgeLat(i) + 3, R = e / 0.92, ring = P.bigRing(R, 1.5);
      const c = tr.at(i, 0, 0); ring.position.set(c.x, c.y + R * 0.4 - 0.2, c.z); ring.rotation.y = tr.yawAt(i);
      ctx.group.add(ring);
      const ph = rand() * 6; anims.push((dt, t) => { ring.material.emissiveIntensity = 0.45 + 0.25 * Math.sin(t * 3 + ph); });
    }
    // goal signpost spinning at the start line
    {
      const i = K(0.5), sd = -outSide(i), p = tr.at(i, sd * (edgeLat(i) + 3), 0);
      const sp = P.signpost(1.3); add(sp, p.x, p.y, p.z, faceRoad(i, sd));
      anims.push((dt, t) => { sp.userData.spin.rotation.y = t * 2.4; });
    }
    // sunflowers lining the Green Hill roads (heads spin) and palms, totems, flowers
    const flowersAnim = [];
    anims.push((dt, t) => { for (const f of flowersAnim) f.userData.head.rotation.z = t * f.userData.sp; });
    let fn = 0;
    each(tr, 28.8, 5.5, 13, (i) => {
      if (tr.GAP[i]) return;
      for (const sd of [-1, 1]) {
        if ((fn++) % 3 === 0) continue;
        const p = tr.at(i, sd * (edgeLat(i) + 2.6), 0);
        if (!ctx.free(p.x, p.z, 1.5) && p.y < 1) continue;
        const f = P.sunflower(1.0 + rand() * 0.3); f.userData.sp = (rand() < 0.5 ? -1 : 1) * (0.6 + rand() * 0.6);
        add(f, p.x, p.y, p.z, faceRoad(i, sd)); flowersAnim.push(f);
      }
    });
    each(tr, 28.6, 5.3, 17, (i) => { for (const sd of [-1, 1]) { const p = tr.at(i, sd * (edgeLat(i) + 7 + rand() * 4), 0); if (!ctx.free(p.x, p.z, 3)) continue; ctx.claim(p.x, p.z, 3); P.ghPalm(b, p.x, p.z, 1.1 + rand() * 0.4, rand); ctx.obstacle(p.x, p.z, 0.9, 10); } });
    ctx.scatter(70, { minC: 4, maxC: 120, r: 3, test: (x, z) => x < OCX - 30 && zone(x, z) === 'hill' && Math.hypot(x - LAKE[0], z - LAKE[1]) > LAKE[2] + 4 }, (x, z) => P.ghPalm(b, x, z, 1.0 + rand() * 0.6, rand));
    ctx.scatter(16, { minC: 6, maxC: 70, r: 3, test: (x, z) => zone(x, z) === 'hill' && Math.hypot(x - LAKE[0], z - LAKE[1]) > LAKE[2] + 4 }, (x, z) => { const i = nearI(x, z); P.totem(b, x, z, 1.0 + rand() * 0.3, Math.atan2(tr.px(i) - x, tr.pz(i) - z), rand); });
    ctx.scatter(110, { minC: 2, maxC: 90, r: 1.5, test: (x, z) => zone(x, z) !== 'egg' && zone(x, z) !== 'casino' && x < OCX - 26 && Math.hypot(x - LAKE[0], z - LAKE[1]) > LAKE[2] + 2 }, (x, z) => P.flowers(nb, x, z, rand));
    ctx.scatter(26, { minC: 8, maxC: 150, r: 2, test: (x, z) => zone(x, z) === 'hill' && x < OCX - 30 && Math.hypot(x - LAKE[0], z - LAKE[1]) > LAKE[2] + 4 }, (x, z) => { const f = P.sunflower(1.2 + rand() * 0.5); f.userData.sp = 0.8; add(f, x, 0, z, rand() * 6); flowersAnim.push(f); });
    // far hills: big checkered mesas around the outside
    ctx.scatter(26, { minC: 120, maxC: 260, r: 16, pad: 260, test: (x, z) => x < OCX - 40 }, (x, z) => {
      const r0 = rand() * 6, w = 18 + rand() * 14, h = 18 + rand() * 30;
      let y = P.cliff(b, x, 0, z, w, h, w * 0.9, r0, { cell: 3.2 });
      if (rand() < 0.6) y = P.cliff(b, x + 2, y, z - 1, w * 0.6, 8 + rand() * 10, w * 0.5, r0, { cell: 3.2 });
      if (rand() < 0.7) P.ghPalm(b, x, z, 1.4, rand, y);
    });

    // ---- the corkscrew: lake, rock pillars with waterfalls and the giant ring -------------------
    {
      const [lx, lz] = LAKE;
      // central checkered pillars and their falls
      const pillars = [[0, 0, 9, 34], [-12, 8, 6, 22], [10, 10, 6, 18], [6, -13, 5, 26]];
      for (const [dx, dz, w, h] of pillars) {
        P.cliff(b, lx + dx, -2.4, lz + dz, w, h + 2.4, w, 0.3, { cell: 2.2 });
        ctx.claim(lx + dx, lz + dz, w);
      }
      for (const [dx, dz, h, ry] of [[0, 4.7, 34, 0], [-4.7, 0, 30, Math.PI / 2], [-12, 11.2, 22, 0], [10, 13.2, 18, 0]]) P.waterfall(ctx.group, lx + dx, -2.2, h, lz + dz, 4.4, ry);
      // the giant (special stage) ring spinning above the lake
      const ring = P.bigRing(9, 1.4); ring.position.set(lx, 48, lz); ctx.group.add(ring);
      const glow = new THREE.PointLight(0xffd040, 4, 90, 1.3); glow.position.set(lx, 48, lz); scene.add(glow);
      anims.push((dt, t) => { ring.rotation.y = t * 1.2; ring.position.y = 48 + Math.sin(t * 1.4) * 1.5; });
      // palms on the lake shore
      for (let n = 0; n < 9; n++) { const a = n / 9 * Math.PI * 2 + 0.3, x = lx + Math.cos(a) * (LAKE[2] + 5), z = lz + Math.sin(a) * (LAKE[2] + 5); if (tr.clearance(x, z, 20) > 3) { P.ghPalm(b, x, z, 1.2, rand); ctx.claim(x, z, 3); } }
    }
    // a "GREEN BRICK ZONE" title sign on the bridge where the corkscrew crosses the start straight
    {
      const iu = K(11.82), il = K(4.65), pu = tr.at(iu, 0, 0), yl = tr.yawAt(il);
      const t = P.textSign('GREEN BRICK ZONE', { w: 1024, h: 128, bg: '#1e52d6', fg: '#ffd21a', glow: '#ffffff', font: '900 80px "Arial Black", Arial' });
      P.signPlane(ctx.group, t, pu.x - Math.sin(yl) * 17, pu.y - 2.6, pu.z - Math.cos(yl) * 17, yl + Math.PI, 30, 3.75, 0.4).material.side = THREE.FrontSide;
    }
    // Crabmeat scuttling across the corkscrew entry
    {
      const crab = P.crabmeat(1.25), hold = new THREE.Group(); crab.rotation.y = Math.PI / 2; hold.add(crab);
      ctx.hazard(crossing(ctx, { mesh: hold, k: 6.55, speed: 5, radius: 2.4, kind: 'bump', span: 0.95 }));
      anims.push((dt, t) => { const a = Math.sin(t * 5) * 0.4; crab.userData.arms[0].rotation.z = a; crab.userData.arms[1].rotation.z = -a; });
    }
    // Motobugs patrolling the start straight (back and forth)
    for (const [lat, off, sp] of [[0.45, 0, 11], [-0.4, 0.5, 9], [0.05, 0.25, 10]]) {
      const m = P.motobug(1.2); m.userData.spin = m.userData.wheel;
      ctx.hazard(trackMover(ctx, { mesh: m, from: 1.2, to: 4.2, lat, speed: sp, radius: 2.0, kind: 'spin', offset: off, roll: 1.1 }));
    }
    // spike strips on the corkscrew
    ctx.hazard(spikeStrip(ctx, { k: 9.1, lat0: -0.95, lat1: 0.02, period: 3.8 }));
    ctx.hazard(spikeStrip(ctx, { k: 9.45, lat0: -0.02, lat1: 0.95, period: 3.8, offset: 1.9 }));

    // ---- cliff tops: checkered mesa under the road, the spring gully, Buzz Bombers ---------------
    each(tr, 12.45, 15.66, 7, (i) => {
      if (tr.GAP[i]) return;
      const yaw = tr.yawAt(i);
      for (const sd of [-1, 1]) {
        const e = edgeLat(i) + 3.6, p = tr.at(i, sd * e, 0), top = tr.surfaceY(i, sd * e);
        P.cliff(b, p.x, 0, p.z, 7.6, Math.max(1, top - 1.2), 7, yaw, { cell: 2.4 });
      }
    });
    each(tr, 12.6, 15.5, 20, (i) => { for (const sd of [-1, 1]) { if (tr.GAP[i]) continue; const p = tr.at(i, sd * (edgeLat(i) - 1.2), 0); const f = P.sunflower(0.9); f.userData.sp = sd; add(f, p.x, p.y, p.z, faceRoad(i, sd)); flowersAnim.push(f); } });
    // the gully under the spring jump: a waterfall pours through it
    { const i = K(13.63), yaw = tr.yawAt(i), c = tr.at(i, 0, 0); P.waterfall(ctx.group, c.x, -2, c.y - 1.5, c.z, edgeLat(i) * 2 + 4, yaw + Math.PI / 2); }
    ctx.hazard(buzzBomber(ctx, { targets: [[12.9, 0.3], [13.3, -0.3], [14.2, 0], [14.6, 0.35]], period: 4.4 }));
    ctx.hazard(buzzBomber(ctx, { targets: [[14.0, -0.35], [14.9, 0.25], [12.8, -0.2], [15.2, -0.3]], period: 4.9, offset: 2.3 }));
    // a big waterfall off the cliff edge into the ocean, and Tails flying the Tornado over the bay
    { const i = K(15.3), sd = outSide(i), p = tr.at(i, sd * (edgeLat(i) + 7), 0), top = tr.surfaceY(i, 0);
      P.cliff(b, p.x, 0, p.z, 9, top - 1.2, 8, tr.yawAt(i)); P.waterfall(ctx.group, p.x + sd * tr.R[i * 2] * 4.6, -2.2, top - 1.2, p.z + sd * tr.R[i * 2 + 1] * 4.6, 7, tr.yawAt(i) + Math.PI / 2); }
    {
      const tp = P.tornado(1.6); ctx.group.add(tp);
      const c = tr.at(K(16.4), 40, 0);
      anims.push((dt, t) => { const a = t * 0.35; tp.position.set(c.x + 30 + Math.cos(a) * 70, 40 + Math.sin(t * 0.8) * 4, c.z + Math.sin(a) * 110); tp.rotation.set(0, -a, -0.35); tp.userData.prop.rotation.z = t * 30; });
    }
    // sea stacks in the bay
    for (const [x, z, w, h] of [[380, -150, 14, 20], [420, -40, 10, 14], [360, 60, 12, 10], [460, -230, 18, 28], [400, 180, 16, 22]]) { P.cliff(b, x, -2.4, z, w, h + 2.4, w * 0.9, x * 0.01, { cell: 2.6 }); P.ghPalm(b, x, z, 1.2, rand, h + 1); }

    // ---- the beach (landing): palms, umbrellas, Crabmeat ---------------------------------------------
    each(tr, 17.3, 18.9, 10, (i) => { for (const sd of [-1, 1]) { const p = tr.at(i, sd * (edgeLat(i) + 4 + rand() * 6), 0); if (!ctx.free(p.x, p.z, 3)) continue; ctx.claim(p.x, p.z, 3); P.ghPalm(b, p.x, p.z, 1.2 + rand() * 0.3, rand, Math.max(0, p.y - 0.2)); } });
    for (const k of [17.6, 18.5]) { const i = K(k), sd = outSide(i), p = tr.at(i, sd * (edgeLat(i) + 12), 0); p.y = 0;
      b.cyl(p.x, 0, p.z, 0.15, 4.2, C.white, { seg: 6 }); b.cone(p.x, 4.2, p.z, 3.2, 1.2, k > 18 ? SN.red : SN.blue, { seg: 8 }); b.box(p.x + 2, 0, p.z, 3.4, 0.3, 1.6, SN.gold); }
    {
      const crab = P.crabmeat(1.25), hold = new THREE.Group(); crab.rotation.y = Math.PI / 2; hold.add(crab);
      ctx.hazard(crossing(ctx, { mesh: hold, k: 18.45, speed: 5.5, radius: 2.4, kind: 'bump', offset: 0.4, span: 0.9 }));
      anims.push((dt, t) => { const a = Math.sin(t * 6 + 1) * 0.4; crab.userData.arms[0].rotation.z = a; crab.userData.arms[1].rotation.z = -a; });
    }

    // ---- Casino Night: neon towers, bumpers, slot machine, flippers ---------------------------------
    arch(ctx, 19.05, { cols: [SN.purple, SN.pink], text: 'CASINO NIGHT', bg: '#1a0a3a', fg: '#ffd23a', height: 12 });
    const neonCols = [0xff4aa8, 0x3ad8ff, 0xffd23a, 0x8a5aff, 0x4aff7a];
    {
      let n = 0;
      each(tr, 19.2, 22.95, 11, (i) => {
        for (const sd of [-1, 1]) {
          const e = edgeLat(i) + 8 + (n % 3) * 3, p = tr.at(i, sd * e, 0); p.y = 0;
          if (!ctx.free(p.x, p.z, 6)) continue;
          ctx.claim(p.x, p.z, 7);
          const yaw = tr.yawAt(i), h = 16 + ((n * 5) % 4) * 7, w = 9 + (n % 2) * 3, col = neonCols[n % neonCols.length];
          nb.box(p.x, 0, p.z, w, h, 8, n % 2 ? 0x2a1a5a : 0x1a1440, { rot: yaw });
          for (let y = 3; y < h - 1; y += 4) nb.box(p.x, y, p.z, w + 0.3, 0.5, 8.3, 0, { rot: yaw, mat: P.neon(col, 1.8) });
          nb.box(p.x, h, p.z, w * 0.6, 3, 5, 0, { rot: yaw, mat: P.neon(neonCols[(n + 2) % 5], 1.4) });
          nb.cone(p.x, h + 3, p.z, 1.6, 4, SN.gold, { seg: 4 });
          n++;
        }
      });
      // big neon signs
      for (const [k, txt, fg] of [[19.9, 'CASINO', '#ff4aa8'], [21.3, '777', '#ffd23a'], [22.7, 'BONUS', '#3ad8ff']]) {
        const i = K(k), sd = -outSide(i), p = tr.at(i, sd * (edgeLat(i) + 6), 0); p.y = 0;
        const yaw = faceRoad(i, sd);
        nb.box(p.x, 0, p.z, 0.8, 12, 0.8, SN.dksteel); nb.box(p.x + Math.cos(yaw) * 6, 0, p.z - Math.sin(yaw) * 6, 0.8, 12, 0.8, SN.dksteel);
        P.signPlane(ctx.group, P.textSign(txt, { fg, glow: fg }), p.x + Math.cos(yaw) * 3, 15, p.z - Math.sin(yaw) * 3, yaw, 14, 3.5, 0.9);
      }
      // pinball bumpers on the wide section (staggered so there's always a line through)
      const BUMP = [[20.0, -0.45], [20.0, 0.4], [20.35, 0], [20.7, -0.55], [20.7, 0.55], [21.05, -0.15], [21.05, 0.35]];
      BUMP.forEach(([k, lf], n) => { const i = K(k), p = tr.at(i, lf * tr.HW[i], 0); ctx.hazard(pinBumper(ctx, p, 2.2, neonCols[n % 5])); });
      // pinball flippers and star posts along the edges of the bumper field
      for (const [k, sd] of [[20.2, -1], [20.2, 1], [21.3, -1], [21.3, 1]]) {
        const i = K(k), p = tr.at(i, sd * (edgeLat(i) + 1.6), 0), yaw = tr.yawAt(i);
        const fl = P.part((L) => { L.cyl(0, 0, 0, 1.1, 1.6, SN.white, { seg: 12 }); L.boxB(0, 0.3, 3.6, 1.6, 1.1, 7, SN.red); L.cyl(0, 0.3, 7.1, 0.8, 1.1, SN.red, { seg: 10 }); }, 'flipper');
        const hold = add(new THREE.Group(), p.x, p.y, p.z, yaw); hold.add(fl);
        const ph = rand() * 6; anims.push((dt, t) => { const s = Math.max(0, Math.sin(t * 2.2 + ph)); fl.rotation.y = sd * (0.6 - s * 0.9); });
      }
      // the slot machine landmark
      { const i = K(21.9), sd = outSide(i), p = tr.at(i, sd * (edgeLat(i) + 12), 0); p.y = 0;
        const sm = P.slotMachine(1.3); add(sm, p.x, 0, p.z, faceRoad(i, sd)); ctx.claim(p.x, p.z, 12);
        const sp = [3.1, 4.3, 5.6]; anims.push((dt, t) => { const T = t % 6; sm.userData.reels.forEach((tx, k) => { tx.offset.y = T < 3 + k * 0.5 ? (t * sp[k]) % 1 : 0.0; }); });
        const l = new THREE.PointLight(0xff60c0, 5, 60, 1.3); l.position.set(p.x, 10, p.z); scene.add(l); }
      // plunger at the launch ramp
      { const i = K(22.25); for (const sd of [-1, 1]) { const p = tr.at(i, sd * (edgeLat(i) + 1), 0); b.cyl(p.x, p.y, p.z, 0.9, 5, 0xc0c4c8, { seg: 10, matOpts: { metal: 0.6, rough: 0.3 } }); b.sphere(p.x, p.y + 5.4, p.z, 1.1, SN.red); } }
      // lights over the strip
      for (const k of [19.6, 20.6, 21.6, 22.5]) { const c = tr.at(K(k), 0, 0); const l = new THREE.PointLight(neonCols[Math.round(k * 3) % 5], 4, 70, 1.2); l.position.set(c.x, c.y + 14, c.z); scene.add(l); }
      ctx.scatter(30, { minC: 14, maxC: 70, r: 5, test: (x, z) => zone(x, z) === 'casino' }, (x, z) => {
        const h = 10 + rand() * 26, w = 6 + rand() * 6, col = neonCols[Math.floor(rand() * 5)], r0 = rand() * 3;
        nb.box(x, 0, z, w, h, w, 0x22163e, { rot: r0 });
        for (let y = 2.5; y < h; y += 3.5) nb.box(x, y, z, w + 0.25, 0.4, w + 0.25, 0, { rot: r0, mat: P.neon(col, 1.6) });
      });
    }

    // ---- Dr. Eggman's base: emblem gate, factories, pipes, the Death Egg, wrecking ball, spikes -------
    {
      const gate = arch(ctx, 23.2, { cols: [SN.dksteel, SN.red], text: 'EGGMAN EMPIRE', bg: '#1b1b22', fg: '#ff3a2a', height: 13 });
      const emb = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshStandardMaterial({ map: P.eggEmblem(), emissive: 0xffffff, emissiveMap: P.eggEmblem(), emissiveIntensity: 0.25 }));
      emb.position.set(0, 18.6, -0.9); emb.rotation.y = Math.PI; gate.add(emb);
      const emb2 = emb.clone(); emb2.position.z = 0.9; emb2.rotation.y = 0; gate.add(emb2);
      // factory blocks with hazard stripes and pipes
      let n = 0;
      each(tr, 23.4, 28.9, 10, (i) => {
        for (const sd of [-1, 1]) {
          const e = edgeLat(i) + 8 + (n % 2) * 5, p = tr.at(i, sd * e, 0); p.y = 0;
          if (!ctx.free(p.x, p.z, 6)) continue; ctx.claim(p.x, p.z, 7);
          const yaw = tr.yawAt(i), h = 10 + ((n * 3) % 4) * 4, w = 10;
          b.box(p.x, 0, p.z, w, h, 9, n % 3 ? 0x6a707a : 0x8a9098, { rot: yaw });
          b.box(p.x, h, p.z, w + 0.4, 1.2, 9.4, (n % 2) ? SN.red : SN.gold, { rot: yaw });
          if (n % 3 === 0) b.sphere(p.x, h + 1.2, p.z, 3.6, 0xa8aeb6, { sy: 0.6 });
          else if (n % 3 === 1) { b.cyl(p.x, h + 1.2, p.z, 1.4, 8, SN.dksteel, { seg: 10 }); b.cyl(p.x, h + 9.2, p.z, 1.7, 1, SN.red, { seg: 10 }); }
          // windows
          for (let y = 3; y < h - 2; y += 4) nb.box(p.x, y, p.z, w + 0.2, 1.0, 9.2, 0, { rot: yaw, mat: P.neon(0xffb040, 0.9) });
          n++;
        }
      });
      // red/yellow pipes running alongside the road on the outside
      each(tr, 23.5, 28.8, 6, (i) => { const sd = outSide(K(26)), p = tr.at(i, sd * (edgeLat(i) + 2.4), 0); nb.cyl(p.x, p.y, p.z, 0.3, 4.2, SN.dksteel, { seg: 6 }); });
      { const sd = outSide(K(26)), pts = []; each(tr, 23.5, 28.8, 6, (i) => pts.push(tr.at(i, sd * (edgeLat(i) + 2.4), 4.4)));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, 0.7, 8, false), plastic(SN.red, { rough: 0.3, metal: 0.3 })); tube.castShadow = true; ctx.group.add(tube); }
      // smokestacks and the Eggman robot statue
      for (const [k, d] of [[24.4, 34], [26.4, 40], [28.0, 32]]) {
        const i = K(k), sd = outSide(i), p = tr.at(i, sd * (edgeLat(i) + d), 0); p.y = 0;
        let y = 0; for (let m = 0; y < 30; m++) y = b.cyl(p.x, y, p.z, 3, 3, m % 2 ? SN.red : 0x6a707a, { seg: 14 }); ctx.claim(p.x, p.z, 5);
        const puffs = [], pm = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, transparent: true, opacity: 0.55, roughness: 1 });
        for (let m = 0; m < 5; m++) { const s = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), pm); ctx.group.add(s); puffs.push(s); }
        anims.push((dt, t) => puffs.forEach((pf, m) => { const f = (t * 0.25 + m / 5) % 1; pf.position.set(p.x + f * 8, y + f * 26, p.z + Math.sin(f * 6 + m) * 3); pf.scale.setScalar(0.6 + f * 2.4); }));
      }
      { const i = K(25.6), sd = -outSide(i), p = tr.at(i, sd * (edgeLat(i) + 14), 0); p.y = 0;
        const st = P.eggMobile(3.2); add(st, p.x, 10, p.z, faceRoad(i, sd)); ctx.claim(p.x, p.z, 12);
        b.cyl(p.x, 0, p.z, 6, 3, SN.dksteel, { seg: 16 }); b.cyl(p.x, 3, p.z, 2, 3.5, 0x6a707a, { seg: 10 });
        anims.push((dt, t) => { st.position.y = 10.5 + Math.sin(t * 1.3) * 0.8; st.rotation.z = Math.sin(t * 0.9) * 0.05; }); }
      // the seven Chaos Emeralds on display
      { const i = K(27.2), sd = -outSide(i), cols = [0x2ad84a, 0x2a6aff, 0xff3a2a, 0xffd21a, 0xd8d8f0, 0x3ad8ff, 0xc04ad8];
        cols.forEach((col, m) => { const p = tr.at(tr.wrap(i + (m - 3) * 5), sd * (edgeLat(i) + 4), 0); P.emerald(nb, p.x, p.z, col); }); }
      // the animal capsule at the end of the zone
      { const i = K(28.75), sd = outSide(i), p = tr.at(i, sd * (edgeLat(i) + 9), 0); p.y = 0;
        b.cyl(p.x, 0, p.z, 4.5, 2, SN.dksteel, { seg: 16 }); b.cyl(p.x, 2, p.z, 4, 5, 0xc0c4c8, { seg: 16, matOpts: { metal: 0.5, rough: 0.3 } }); b.box(p.x, 2.2, p.z, 8.2, 1, 1, SN.gold);
        b.sphere(p.x, 7, p.z, 4, 0xc0c4c8, { sy: 0.5 }); b.cyl(p.x, 8.8, p.z, 1, 1.4, SN.red, { seg: 10 }); ctx.claim(p.x, p.z, 6); }
      // filler: metal sheds, crates and pylons in the base's yard
      ctx.scatter(36, { minC: 12, maxC: 80, r: 5, test: (x, z) => zone(x, z) === 'egg' }, (x, z) => {
        const r0 = rand() * 3;
        if (rand() < 0.5) { const h = 6 + rand() * 10; b.box(x, 0, z, 8, h, 8, 0x6a707a, { rot: r0 }); b.box(x, h, z, 8.4, 0.8, 8.4, rand() < 0.5 ? SN.red : SN.gold, { rot: r0 }); }
        else { b.cyl(x, 0, z, 3, 6, 0x8a9098, { seg: 12 }); b.sphere(x, 6, z, 3, 0xa8aeb6, { sy: 0.6 }); b.box(x, 2.5, z, 6.2, 0.8, 0.5, SN.red, { rot: r0 }); }
      });
      // the Death Egg hangs in the western sky
      const de = P.deathEgg(70); de.position.set(-560, 210, 120); de.rotation.y = Math.PI / 2 - 0.3; ctx.group.add(de);
      anims.push((dt, t) => { de.position.y = 210 + Math.sin(t * 0.2) * 6; de.rotation.y = Math.PI / 2 - 0.3 + Math.sin(t * 0.07) * 0.1; });
    }
    ctx.hazard(wreckingBall(ctx, { k: 25.05, period: 3.6 }));
    ctx.hazard(spikeStrip(ctx, { k: 27.25, lat0: -0.95, lat1: -0.05, period: 3.4 }));
    ctx.hazard(spikeStrip(ctx, { k: 27.25, lat0: 0.05, lat1: 0.95, period: 3.4, offset: 1.7 }));
    ctx.hazard(spikeStrip(ctx, { k: 26.0, lat0: -0.3, lat1: 0.3, period: 4.2, offset: 0.9 }));

    // ---- clouds over Green Hill ----
    for (let n = 0; n < 14; n++) { const a = n / 14 * Math.PI * 2, d = 420 + rand() * 200, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = 90 + rand() * 60; for (let m = 0; m < 4; m++) nb.sphere(x + m * 9 - 14, y + (m % 2) * 3, z + rand() * 6, 9 + rand() * 4, C.white, { sy: 0.55 }); }
  },
};
