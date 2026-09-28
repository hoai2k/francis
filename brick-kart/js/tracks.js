// The five maps. Track points are [x, z, y]; placement values (items,
// boosts, ramps, sections...) are given in "k" units = control point index
// (fractional values interpolate between points).
import * as THREE from 'three';
import { BrickBuilder, C, plastic, baseplateMat, faceTexture, brickGeometry } from './lego.js';
import { tree, roundTree, pine, palm, rock, lamp, building, snowman, crystal, tower, wallSeg, cloud, mountain, grandstand, billboard, canvasTexture, pick, rng } from './decor.js';
import { groundPlane } from './world.js';

// ---- shared helpers ------------------------------------------------------------
function trackPolygon(g, tr, toPx) {
  g.beginPath();
  for (let i = 0; i < tr.N; i += 4) { const [x, y] = toPx(tr.px(i), tr.pz(i)); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.closePath();
}
function strokeTrack(g, tr, toPx, scale, pad, filter = () => true) {
  g.lineCap = g.lineJoin = 'round';
  for (let i = 0; i < tr.N; i += 3) {
    if (!filter(i)) continue;
    const [x, y] = toPx(tr.px(i), tr.pz(i));
    const r = (tr.HW[i] + tr.SH[i] + pad) * scale;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
}
function inRange(tr, i, a, b) {
  const ia = tr.kToIndex(a), ib = tr.kToIndex(b);
  return ia <= ib ? i >= ia && i <= ib : i >= ia || i <= ib;
}
function skullTexture(bg = '#111', fg = '#f4f4f4') {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.22, 0, Math.PI * 2); g.fill();
    g.fillRect(w * 0.36, h * 0.5, w * 0.28, h * 0.16);
    g.fillStyle = bg;
    g.beginPath(); g.arc(w * 0.42, h * 0.42, w * 0.06, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(w * 0.58, h * 0.42, w * 0.06, 0, Math.PI * 2); g.fill();
    g.fillRect(w * 0.44, h * 0.58, w * 0.03, h * 0.08); g.fillRect(w * 0.53, h * 0.58, w * 0.03, h * 0.08);
    g.strokeStyle = fg; g.lineWidth = w * 0.06; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w * 0.22, h * 0.72); g.lineTo(w * 0.78, h * 0.9); g.stroke();
    g.beginPath(); g.moveTo(w * 0.78, h * 0.72); g.lineTo(w * 0.22, h * 0.9); g.stroke();
  });
}
function studPlanet(r, color, rough = 0.5) {
  const m = baseplateMat(color, 1, rough);
  m.map.repeat.set(r * 0.8, r * 0.4); m.bumpMap.repeat.copy(m.map.repeat);
  return new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), m);
}

// =====================================================================================
export const TRACKS = [
  // ---------------------------------------------------------------------------------
  {
    id: 'city', name: 'Brick City Circuit', subtitle: 'Figure-8 overpass through downtown',
    seed: 11, width: 20, shoulder: 5, start: 0.45,
    points: [[-100, -100, 0], [-40, -40, 0], [40, 40, 0], [100, 100, 0], [160, 120, 1], [200, 60, 3], [200, -50, 6], [160, -110, 9], [100, -100, 10], [40, -40, 10], [-40, 40, 10], [-100, 100, 10], [-160, 120, 9], [-200, 60, 6], [-200, -50, 3], [-160, -110, 1]],
    items: [2.35, 6.2, 10.4, 14.1],
    boosts: [[1.5, 0], [5.3, -0.45], [9.6, 0.4], [13.2, -0.3], [15.5, 0.4]],
    ramps: [3.0],
    studs: [[1.0, -0.5, 6], [4.4, 0.5, 6], [8.4, 0, 8], [11.8, -0.5, 6], [14.8, 0.5, 5]],
    theme: {
      sky: [0x3f8fe0, 0xcfe8ff, 0x9ab0c0], fog: [0xcfe8ff, 150, 800], sun: { color: 0xfff1d8, intensity: 2.6, dir: [0.6, 1, 0.3] },
      hemi: [0xdfefff, 0x6a7a6a, 1.2], ground: 0x8d9397, groundPitch: 1.6, shoulder: C.green,
      road: { base: '#5d6164', line: '#f4f4f4' }, wall: [C.red, C.white], curb: [C.red, C.white], gate: [C.red, C.white],
      support: 'pillar', pillar: C.ltgray, pillar2: C.white, skirt: ['#a0a5a9', '#7c8084'],
      music: { bpm: 132, root: 60, scale: 'major', style: 'pop' },
    },
    decor(ctx) {
      const { b, rand, track: tr, bounds } = ctx;
      // green parks inside each lobe of the 8
      const parkMask = ctx.makeMask(1200, 512, (g, toPx, sc) => {
        g.fillStyle = '#fff';
        for (const [x, z, r] of [[165, 10, 45], [-165, 10, 45], [0, -150, 30], [0, 150, 30]]) { const [px, py] = toPx(x, z); g.beginPath(); g.arc(px, py, r * sc, 0, Math.PI * 2); g.fill(); }
      });
      ctx.scene.add(groundPlane(C.green, tr.groundY - 0.04, 1200, 1.6, { mask: parkMask }));
      // fountains in the parks
      for (const x of [165, -165]) {
        let y = b.cyl(x, 0, 10, 7, 0.8, C.ltgray, { seg: 24 });
        b.cyl(x, y - 0.3, 10, 6.2, 0.4, C.azure, { seg: 24, matOpts: { trans: true, opacity: 0.7, rough: 0.05 } });
        y = b.cyl(x, y, 10, 1, 3, C.ltgray);
        b.cyl(x, y, 10, 2.5, 0.5, C.ltgray);
        b.sphere(x, y + 1.2, 10, 0.9, C.azure, { matOpts: { trans: true, opacity: 0.6 } });
        ctx.claim(x, 10, 9);
      }
      ctx.scatter(70, { minC: 2, maxC: 50, r: 3, test: (x, z) => parkMask.test(x, z) }, (x, z) => (rand() < 0.5 ? roundTree : tree)(b, x, 0, z, 0.9 + rand() * 0.5, rand() < 0.3 ? C.lime : C.green));
      // skyscrapers on a jittered grid around the circuit
      const cols = [C.white, C.tan, C.sand, C.red, C.blue, C.yellow, C.dkgray, C.azure, C.ltgray, C.mdblue, C.orange];
      for (let x = bounds.minX - 200; x < bounds.maxX + 200; x += 28) {
        for (let z = bounds.minZ - 200; z < bounds.maxZ + 200; z += 28) {
          const bx = x + (rand() - 0.5) * 8, bz = z + (rand() - 0.5) * 8;
          const w = 12 + Math.floor(rand() * 6) * 2, d = 12 + Math.floor(rand() * 6) * 2;
          const r = Math.max(w, d) * 0.72;
          const c = tr.clearance(bx, bz, 120);
          if (c < r + 2 || c > 110 || parkMask.test(bx, bz) || !ctx.free(bx, bz, r)) continue;
          ctx.claim(bx, bz, r);
          const floors = 2 + Math.floor(rand() * 3 + c * 0.07 + rand() * rand() * 10);
          building(b, bx, bz, w, d, floors, pick(rand, cols), rand, { trim: pick(rand, [C.white, C.dkgray, C.yellow]) });
        }
      }
      // street lamps at ground level
      ctx.alongside(36, 2.6, (p, i) => { if (tr.py(i) < 0.5) lamp(b, p.x, 0, p.z); });
      // grandstands along the start straight
      grandstand(b, tr, tr.N - 70, 60, -1, rand);
      grandstand(b, tr, tr.N - 70, 60, 1, rand);
      // billboards
      const signs = [['BRICK KART', '#c91a09', '#f2cd37'], ['STUDS = SPEED', '#0055bf', '#ffffff'], ['BUILD IT FAST', '#f2cd37', '#1b2a34'], ['2x4 PIZZA', '#237841', '#f4f4f4'], ['CLICK!', '#81007b', '#f2cd37']];
      let si = 0;
      for (const k of [1.8, 5.8, 9.9, 13.6, 15.2]) {
        const i = tr.kToIndex(k);
        const side = si % 2 ? 1 : -1;
        const p = tr.at(i, (tr.HW[i] + tr.SH[i] + 6) * side, 0);
        const [t, bg, fg] = signs[si++ % signs.length];
        billboard(ctx.group, b, p.x, Math.max(0, tr.py(i) - 2), p.z, tr.yawAt(i) + (side > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI / 2, t, bg, fg);
      }
      // clouds
      const cb = ctx.bNoShadow;
      for (let k = 0; k < 18; k++) cloud(cb, bounds.cx + (rand() - 0.5) * 900, 90 + rand() * 60, bounds.cz + (rand() - 0.5) * 900, 2 + rand() * 2, rand);
      // construction crane with rotating jib
      const cx = bounds.maxX + 70, cz = bounds.cz - 60;
      let y = 0;
      for (let k = 0; k < 22; k++) { b.box(cx, y, cz, 3, 2.6, 3, k % 2 ? C.yellow : C.orange); y += 2.6; }
      const jib = new BrickBuilder(1);
      jib.box(-14, 0, 0, 50, 2, 2, C.yellow); jib.box(-38, -3, 0, 5, 5, 5, C.dkgray); jib.box(0, 2, 0, 4, 4, 3, C.yellow);
      jib.cyl(20, -18, 0, 0.1, 18, C.black, { seg: 4 }); jib.box(20, -21, 0, 3, 3, 3, C.red);
      const jg = jib.build(); jg.position.set(cx, y, cz); ctx.group.add(jg);
      ctx.anim((dt, t) => { jg.rotation.y = Math.sin(t * 0.15) * 1.2; });
      // blimp circling the city
      const bl = new THREE.Group();
      const env = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshStandardMaterial({ color: C.yellow, roughness: 0.4, map: canvasTexture(512, 256, (g, w, h) => { g.fillStyle = '#f2cd37'; g.fillRect(0, 0, w, h); g.fillStyle = '#c91a09'; g.fillRect(0, h * 0.38, w, h * 0.24); g.fillStyle = '#fff'; g.font = '900 44px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('BRICK KART', w * 0.25, h * 0.55); g.fillText('BRICK KART', w * 0.75, h * 0.55); }) }));
      env.scale.set(9, 9, 26); bl.add(env);
      const fins = new BrickBuilder(1); fins.box(0, -2, -22, 0.6, 10, 5, C.red); fins.box(0, 3, -22, 10, 0.6, 5, C.red, {}); fins.box(0, -11, 0, 3, 2.5, 8, C.white);
      bl.add(fins.build());
      ctx.group.add(bl);
      ctx.anim((dt, t) => { const a = t * 0.05; bl.position.set(bounds.cx + Math.cos(a) * 260, 75, bounds.cz + Math.sin(a) * 260); bl.rotation.y = -a; });
    },
  },
  // ---------------------------------------------------------------------------------
  {
    id: 'pirate', name: 'Pirate Cove', subtitle: 'Docks, a cliff jump and a sunset galleon',
    seed: 22, width: 18, shoulder: 5, start: 0.5,
    points: [[-120, -40, 0], [-40, -95, 0], [60, -105, 0], [140, -80, 0], [205, -40, 0.6], [240, 30, 0.6], [215, 100, 0.6], [150, 135, 0], [90, 150, 0], [50, 110, 2], [80, 60, 5], [30, 20, 8], [-30, 50, 11], [-60, 110, 7], [-110, 140, 3], [-175, 115, 0.6], [-225, 50, 0.6], [-195, -10, 0.6]],
    sections: [
      { from: 4.25, to: 6.8, surface: 'wood', edge: 'void', shoulder: 0, support: 'pillar', width: 17 },
      { from: 15.2, to: 17.8, surface: 'wood', edge: 'void', shoulder: 0, support: 'pillar', width: 17 },
      { from: 12.1, to: 12.3, gap: true },
    ],
    items: [2.4, 5.5, 9.6, 14.3, 16.5],
    boosts: [[3.3, 0], [8.1, 0.3], [11.4, 0], [14.8, -0.3]],
    ramps: [12.05],
    studs: [[1.2, 0.4, 6], [4.6, 0, 6], [10.2, 0, 5], [13.3, 0, 6], [16, -0.3, 6]],
    theme: {
      sky: [0x3a3f8f, 0xffa06a, 0x1e5a8a], fog: [0xf2a27a, 150, 850], sun: { color: 0xffc080, intensity: 2.4, dir: [-0.8, 0.55, 0.2] },
      hemi: [0xffd0b0, 0x4a6a8a, 1.2], envIntensity: 0.8,
      groundY: -1.6, ground: 0x1673c9, groundPitch: 1.6, groundOpts: { transparent: true, opacity: 0.88, rough: 0.12 },
      shoulder: C.tan, road: { base: '#b89a6a', line: '#f4f4f4' }, wall: [C.rbrown, C.dktan], curb: [C.red, C.white], gate: [C.rbrown, C.dktan],
      support: 'bank', pillar: C.rbrown, pillar2: C.brown, skirt: ['#d8c090', '#9c8458'],
      rampSide: C.rbrown, ramp: C.orange,
      music: { bpm: 120, root: 57, scale: 'dorian', style: 'shanty' },
    },
    decor(ctx) {
      const { b, rand, track: tr, bounds, scene } = ctx;
      const islets = [[-160, -140, 26], [330, -220, 40], [-330, 230, 45], [380, 230, 30]];
      const onDock = (i) => inRange(tr, i, 4.0, 7.0) || inRange(tr, i, 15.0, 18.0);
      const mask = ctx.makeMask(1400, 1024, (g, toPx, sc) => {
        g.fillStyle = '#fff';
        trackPolygon(g, tr, toPx); g.fill();
        strokeTrack(g, tr, toPx, sc, 26, (i) => !onDock(i));
        for (const [x, z, r] of islets) { const [px, py] = toPx(x, z); g.beginPath(); g.arc(px, py, r * sc, 0, Math.PI * 2); g.fill(); }
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < tr.N; i += 3) if (inRange(tr, i, 4.5, 6.5) || inRange(tr, i, 15.5, 17.5)) {
          const [px, py] = toPx(tr.px(i), tr.pz(i));
          g.beginPath(); g.arc(px, py, (tr.HW[i] + 14) * sc, 0, Math.PI * 2); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      });
      scene.add(groundPlane(C.tan, -0.12, 1400, 1.6, { mask }));
      // grass patches on the island
      const grass = ctx.makeMask(1400, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; for (const [x, z, r] of [[120, -20, 40], [-100, 40, 40], [0, -30, 35]]) { const [px, py] = toPx(x, z); g.beginPath(); g.arc(px, py, r * sc, 0, Math.PI * 2); g.fill(); } });
      scene.add(groundPlane(C.green, -0.06, 1400, 1.6, { mask: grass }));
      // animate the water studs
      const water = scene.children.find((o) => o.isMesh && o.material?.transparent && o.position.y < -1);
      if (water) ctx.anim((dt, t) => { water.material.map.offset.set(Math.sin(t * 0.3) * 0.3, t * 0.05); water.material.bumpMap.offset.copy(water.material.map.offset); });
      // palms, rocks, barrels
      ctx.scatter(90, { minC: 2, maxC: 60, r: 3, test: (x, z) => mask.test(x, z) }, (x, z) => palm(b, x, 0, z, 0.9 + rand() * 0.5, rand));
      ctx.scatter(30, { minC: 2, maxC: 60, r: 4, test: (x, z) => mask.test(x, z) }, (x, z) => rock(b, x, 0, z, 1.4, rand, [C.dkgray, C.ltgray, C.dktan]));
      for (const [x, z, r] of islets) { for (let k = 0; k < 4; k++) palm(b, x + (rand() - 0.5) * r, 0, z + (rand() - 0.5) * r, 1.2, rand); }
      ctx.scatter(18, { minC: 6, maxC: 50, r: 2, test: (x, z) => !mask.test(x, z) }, (x, z) => { b.cyl(x, -2.2, z, 1, 2.6, C.rbrown, { seg: 12 }); b.cyl(x, -1.2, z, 1.05, 0.3, C.dkgray, { seg: 12 }); });
      // lighthouse on the islet with rotating beam
      const [lx, , lz] = [-160, 0, -140];
      let y = 0;
      for (let k = 0; k < 12; k++) y = b.cyl(lx, y, lz, 4 - k * 0.12, 2.4, k % 2 ? C.white : C.red, { seg: 18 });
      b.cyl(lx, y, lz, 3.6, 0.6, C.dkgray, { seg: 18 });
      b.cyl(lx, y + 0.6, lz, 2.4, 3, C.yellow, { seg: 18, matOpts: { trans: true, opacity: 0.7, emissive: 0xffe060, emissiveIntensity: 2 } });
      b.cone(lx, y + 3.6, lz, 3.2, 2.6, C.red, { seg: 18 });
      const beam = new THREE.Mesh(new THREE.ConeGeometry(6, 70, 16, 1, true).translate(0, -35, 0).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      beam.position.set(lx, y + 2, lz);
      ctx.group.add(beam);
      ctx.anim((dt, t) => { beam.rotation.y = t * 0.8; });
      // pirate galleon anchored off the south beach
      const ship = new BrickBuilder(1);
      const L = 46;
      for (let k = 0; k < 5; k++) {
        const w = 14 - Math.abs(k - 1.5) * 1.6, len = L - Math.abs(k - 2) * 5;
        ship.box(0, k * 1.6, 0, w, 1.6, len, k % 2 ? C.rbrown : C.brown);
      }
      ship.box(0, 8, -L / 2 + 6, 13, 5, 10, C.rbrown); ship.box(0, 13, -L / 2 + 6, 13.6, 0.6, 10.6, C.dktan);
      ship.box(0, 8, L / 2 - 3, 8, 2.5, 6, C.rbrown);
      for (let k = -1; k <= 1; k++) ship.cyl(0, 8, k * 12, 0.7, 34 - Math.abs(k) * 6, C.brown);
      for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) { ship.cyl(s * 7.2, 5, k * 7, 0.55, 0.4, C.black, { seg: 8 }); ship.box(s * 6.9, 4.2, k * 7, 0.4, 1.6, 1.6, C.black); }
      ship.box(0, 8, L / 2 + 2, 0.5, 0.5, 10, C.brown);
      const shipG = ship.build({ name: 'ship' });
      const sailTex = skullTexture('#f4f0e0', '#1b1b1b');
      for (let k = -1; k <= 1; k++) {
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(16 - Math.abs(k) * 3, 14, 8, 1), new THREE.MeshStandardMaterial({ map: sailTex, side: THREE.DoubleSide, roughness: 0.8 }));
        const pa = sail.geometry.attributes.position;
        for (let v = 0; v < pa.count; v++) pa.setZ(v, Math.cos(pa.getX(v) / 8 * 1.3) * 2);
        sail.geometry.computeVertexNormals();
        sail.position.set(0, 22 - Math.abs(k) * 3, k * 12 + 0.8);
        sail.castShadow = true;
        shipG.add(sail);
      }
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ map: skullTexture(), side: THREE.DoubleSide }));
      flag.position.set(0, 36, 3); shipG.add(flag);
      shipG.position.set(40, -2.2, -210); shipG.rotation.y = 1.3;
      ctx.group.add(shipG);
      ctx.anim((dt, t) => { shipG.rotation.z = Math.sin(t * 0.7) * 0.04; shipG.rotation.x = Math.sin(t * 0.5) * 0.02; shipG.position.y = -2.2 + Math.sin(t * 0.9) * 0.3; flag.rotation.y = Math.sin(t * 3) * 0.3; });
      // fort gate over the beach road
      const gi = tr.kToIndex(2.0);
      const gyaw = tr.yawAt(gi);
      const span = tr.HW[gi] + tr.SH[gi] + 3;
      const gate = new BrickBuilder(1);
      for (const s of [-1, 1]) tower(gate, s * span, 0, 0, 3, 12, C.ltgray, C.dkred);
      gate.box(0, 11, 0, span * 2, 3, 3, C.dkgray);
      for (let x = -span; x <= span; x += 3.2) gate.brick(x, 14, 0, 1, 1, 3, C.dkgray, { pitch: 1.6 });
      // local x is lateral once rotated by the track yaw
      const gg = gate.build(); gg.position.copy(tr.at(gi, 0, 0)); gg.position.y = 0; gg.rotation.y = gyaw;
      ctx.group.add(gg);
      const gflag = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshStandardMaterial({ map: skullTexture(), side: THREE.DoubleSide }));
      gflag.position.set(0, 18, 0); gg.add(gflag);
      // treasure chest and cannons near the cliff
      const ci = tr.kToIndex(11.2);
      const cp = tr.at(ci, (tr.HW[ci] + tr.SH[ci] + 5), 0);
      b.box(cp.x, 0, cp.z, 3, 2, 2, C.rbrown); b.box(cp.x, 2, cp.z, 3.1, 0.8, 2.1, C.pearl, { matOpts: { metal: 0.8, rough: 0.2 } });
      for (let k = 0; k < 7; k++) b.cyl(cp.x + (rand() - 0.5) * 5, 0, cp.z + (rand() - 0.5) * 5, 0.5, 0.2, C.pearl, { matOpts: { metal: 0.9, rough: 0.2, emissive: 0x6a4a00 } });
      // rocks in the chasm under the jump
      for (let i = tr.kToIndex(12.05); i < tr.kToIndex(12.5); i += 3) rock(b, tr.px(i) + (rand() - 0.5) * 20, -1.6, tr.pz(i) + (rand() - 0.5) * 20, 1.8, rand, [C.dkgray, C.ltgray]);
      // clouds
      for (let k = 0; k < 14; k++) cloud(ctx.bNoShadow, bounds.cx + (rand() - 0.5) * 900, 100 + rand() * 50, bounds.cz + (rand() - 0.5) * 900, 2.5, rand);
    },
  },
  // ---------------------------------------------------------------------------------
  {
    id: 'lava', name: 'Lava Castle', subtitle: 'Climb the volcano, storm the keep, cross the lava bridge',
    seed: 33, width: 18, shoulder: 4, start: 0.5,
    points: [[-90, -150, 0], [30, -160, 0], [120, -140, 0], [170, -90, 1], [140, -40, 3], [80, -40, 5], [60, 0, 7], [110, 40, 9], [170, 60, 11], [150, 120, 14], [80, 130, 16], [10, 150, 16], [-60, 140, 15], [-130, 110, 12], [-180, 50, 8], [-185, -30, 4], [-150, -110, 1]],
    sections: [
      { from: 11.7, to: 14.2, edge: 'void', shoulder: 0, support: 'pillar', width: 16 },
    ],
    items: [2.5, 6.6, 10.4, 14.6],
    boosts: [[1.6, 0], [5.5, 0], [8.4, -0.3], [12.6, 0], [15.6, 0.3]],
    ramps: [16.3],
    studs: [[1.1, 0.3, 6], [4.4, 0, 5], [7.4, 0, 6], [11.9, 0, 8], [15.1, -0.4, 5]],
    theme: {
      sky: [0x0b0612, 0x6a1c0e, 0x2a0800], fog: [0x3a0e08, 90, 650], sun: { color: 0xff9a60, intensity: 1.4, dir: [0.3, 1, -0.5] },
      hemi: [0x6a4a8a, 0x8a2a00, 0.9], envIntensity: 0.45,
      groundY: -2, ground: 0xff5a00, groundPitch: 1.6, groundOpts: { emissive: 0xff4a00, emissiveIntensity: 1.3, rough: 0.5 },
      shoulder: C.dkstone, road: { base: '#3b3e40', line: '#ff8a18' }, wall: [C.dkgray, C.black, C.dkstone], curb: [C.orange, C.black], gate: [C.dkgray, C.black],
      support: 'bank', pillar: C.dkstone, pillar2: C.black, skirt: ['#595d60', '#2a2c2e'], skirtColor: C.black,
      rampSide: C.black, ramp: C.red, particles: 'embers',
      music: { bpm: 150, root: 52, scale: 'minor', style: 'rock' },
    },
    decor(ctx) {
      const { b, rand, track: tr, bounds, scene } = ctx;
      const onBridge = (i) => inRange(tr, i, 11.5, 14.4);
      const V = [-40, -40];
      const mask = ctx.makeMask(1400, 1024, (g, toPx, sc) => {
        g.fillStyle = '#fff';
        strokeTrack(g, tr, toPx, sc, 16, (i) => !onBridge(i));
        const [vx, vy] = toPx(V[0], V[1]); g.beginPath(); g.arc(vx, vy, 90 * sc, 0, Math.PI * 2); g.fill();
        for (let k = 0; k < 16; k++) { const [px, py] = toPx(bounds.cx + (rand() - 0.5) * 700, bounds.cz + (rand() - 0.5) * 700); g.beginPath(); g.arc(px, py, (20 + rand() * 40) * sc, 0, Math.PI * 2); g.fill(); }
        g.globalCompositeOperation = 'destination-out';
        for (let k = 0; k < 10; k++) { const [px, py] = toPx(V[0] + (rand() - 0.5) * 160, V[1] + (rand() - 0.5) * 160); g.beginPath(); g.arc(px, py, (6 + rand() * 8) * sc, 0, Math.PI * 2); g.fill(); }
      });
      scene.add(groundPlane(C.dkstone, -0.4, 1400, 1.6, { mask, rough: 0.8 }));
      const lava = scene.children.find((o) => o.isMesh && o.material?.emissiveMap);
      if (lava) ctx.anim((dt, t) => { lava.material.map.offset.set(t * 0.02, Math.sin(t * 0.4) * 0.2); lava.material.emissiveIntensity = 1.2 + Math.sin(t * 2.3) * 0.2; });
      // volcano: stepped round bricks with a glowing crater
      let y = -0.4;
      for (let k = 0; k < 14; k++) {
        const r = 70 - k * 4.4;
        y = b.cyl(V[0] + Math.sin(k) * 1.5, y, V[1] + Math.cos(k) * 1.5, r, 3.4, k % 3 === 2 ? C.black : k % 2 ? C.dkstone : C.dkgray, { seg: 24 });
      }
      b.cyl(V[0], y - 0.2, V[1], 10, 0.4, 0xff6a00, { seg: 24, matOpts: { emissive: 0xff5000, emissiveIntensity: 2.2 } });
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.4;
        b.box(V[0] + Math.cos(a) * 30, -0.4, V[1] + Math.sin(a) * 30, 3, y - 2, 1.2, 0xff5a00, { rot: -a, matOpts: { emissive: 0xff4a00, emissiveIntensity: 1.8 } });
      }
      const vlight = new THREE.PointLight(0xff5a1a, 4, 220, 1.4); vlight.position.set(V[0], y + 10, V[1]); scene.add(vlight);
      ctx.claim(V[0], V[1], 75);
      // smoke & lava bombs
      const smokeG = new THREE.InstancedMesh(brickGeometry(2, 2, 3, 2, true, 8), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1, transparent: true, opacity: 0.7 }), 40);
      const bombG = new THREE.InstancedMesh(brickGeometry(1, 1, 3, 2, true, 8), new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff4000, emissiveIntensity: 2 }), 16);
      scene.add(smokeG, bombG);
      const sm = [...Array(40)].map((_, k) => ({ t: k / 40 * 8, a: rand() * 6.28 }));
      const bombs = [...Array(16)].map(() => ({ t: -rand() * 6, v: new THREE.Vector3(), p: new THREE.Vector3() }));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e = new THREE.Euler();
      const top = y;
      ctx.anim((dt) => {
        sm.forEach((s, k) => {
          s.t += dt; if (s.t > 8) { s.t = 0; s.a = rand() * 6.28; }
          const f = s.t / 8;
          p3.set(V[0] + Math.cos(s.a) * f * 20, top + f * 70, V[1] + Math.sin(s.a) * f * 20 + f * 25);
          s3.setScalar(1 + f * 3); q.setFromEuler(e.set(f * 2, s.a, f)); m4.compose(p3, q, s3); smokeG.setMatrixAt(k, m4);
        });
        smokeG.instanceMatrix.needsUpdate = true;
        bombs.forEach((bm, k) => {
          bm.t += dt;
          if (bm.t > 0 && bm.p.y < -2) bm.t = -rand() * 4;
          if (bm.t <= 0) { bm.p.set(V[0], top, V[1]); const a = rand() * 6.28; bm.v.set(Math.cos(a) * (8 + rand() * 12), 25 + rand() * 20, Math.sin(a) * (8 + rand() * 12)); s3.setScalar(0.0001); }
          else { bm.v.y -= 25 * dt; bm.p.addScaledVector(bm.v, dt); s3.setScalar(1); }
          q.setFromEuler(e.set(bm.t * 3, bm.t * 2, 0)); m4.compose(bm.p, q, s3); bombG.setMatrixAt(k, m4);
        });
        bombG.instanceMatrix.needsUpdate = true;
      });
      // castle around the courtyard section (k 9..11.3)
      const cb = b;
      const c0 = tr.kToIndex(9.0), c1 = tr.kToIndex(11.3);
      const wallLat = (i) => tr.HW[i] + tr.SH[i] + 2.5;
      let prev = null;
      for (let i = c0; i <= c1; i += 6) {
        for (const side of [-1, 1]) {
          const p = tr.at(i, wallLat(i) * side, 0);
          if (prev && prev[side]) wallSeg(cb, prev[side].x, prev[side].z, p.x, p.z, -2, p.y + 6 + 2, C.ltgray);
          prev ||= {}; prev[side] = p;
        }
      }
      const torches = [];
      for (const i of [c0, c1]) {
        const yaw = tr.yawAt(i);
        for (const side of [-1, 1]) {
          const p = tr.at(i, (wallLat(i) + 2) * side, 0);
          tower(cb, p.x, -2, p.z, 4, p.y + 14, C.ltgray, C.dkred);
          torches.push(tr.at(i, (wallLat(i) - 1) * side, 4));
        }
        // gate arch
        const a = tr.at(i, 0, 9);
        cb.box(a.x, a.y, a.z, (wallLat(i) + 2) * 2, 3.5, 3, C.dkgray, { rot: yaw });
      }
      // keep: big tower beside the courtyard, outside the loop
      const ki = tr.kToIndex(10.2);
      const kp = tr.at(ki, -(tr.HW[ki] + 30), 0);
      tower(cb, kp.x, -2, kp.z, 12, 36, C.ltgray, C.dkred);
      tower(cb, kp.x + 10, -2, kp.z - 8, 5, 48, C.dkgray, C.dkred);
      // banners
      const banTex = canvasTexture(128, 256, (g, w, h) => { g.fillStyle = '#9a0f0f'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2cd37'; g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w - 20, 110); g.lineTo(w / 2, 200); g.lineTo(20, 110); g.fill(); g.fillStyle = '#9a0f0f'; g.fillRect(w / 2 - 10, 80, 20, 70); });
      for (let i = c0 + 10; i < c1 - 5; i += 24) for (const side of [-1, 1]) {
        const p = tr.at(i, (wallLat(i) - 1.3) * side, 1);
        const ban = new THREE.Mesh(new THREE.PlaneGeometry(3, 6), new THREE.MeshStandardMaterial({ map: banTex, side: THREE.DoubleSide }));
        ban.position.copy(p); ban.position.y += 3; ban.rotation.y = tr.yawAt(i) + Math.PI / 2;
        ctx.group.add(ban);
      }
      // torches with flickering lights
      const flameMat = plastic(0xff9a20, { trans: true, opacity: 0.85, emissive: 0xff7010, emissiveIntensity: 2.5 });
      const lights = [];
      torches.forEach((p, k) => {
        b.cyl(p.x, p.y - 2, p.z, 0.25, 2, C.black, { seg: 6 });
        b.cone(p.x, p.y, p.z, 0.5, 1.3, 0, { mat: flameMat, seg: 8 });
        if (k % 2 === 0) { const l = new THREE.PointLight(0xff7a2a, 3, 40, 1.5); l.position.copy(p).add(new THREE.Vector3(0, 1.5, 0)); scene.add(l); lights.push(l); }
      });
      ctx.anim((dt, t) => lights.forEach((l, k) => { l.intensity = 2.6 + Math.sin(t * 13 + k * 3) * 0.5 + Math.sin(t * 7.3 + k) * 0.4; }));
      // obsidian spikes and glowing crystals on the rock islands
      ctx.scatter(40, { minC: 3, maxC: 80, r: 4, test: (x, z) => mask.test(x, z) }, (x, z) => (rand() < 0.6 ? rock(b, x, -0.4, z, 1.6, rand, [C.black, C.dkstone, C.dkgray]) : crystal(b, x, -0.4, z, 1.4, rand, rand() < 0.5 ? 0xff3a1a : 0xff9a10)));
      // skull rock beside the lava bridge
      const si = tr.kToIndex(13.0);
      const sp = tr.at(si, tr.HW[si] + 34, 0);
      const sk = new BrickBuilder(2);
      sk.sphere(0, 14, 0, 12, C.white, { sy: 0.95 }); sk.box(0, 0, 0, 12, 8, 10, C.white);
      sk.sphere(-4.5, 15, 9, 3.4, C.black); sk.sphere(4.5, 15, 9, 3.4, C.black);
      for (let k = -2; k <= 2; k++) sk.box(k * 2.2, 3, 5.2, 1.2, 3, 0.6, C.black);
      const skg = sk.build(); skg.position.set(sp.x, -2, sp.z); skg.rotation.y = tr.yawAt(si) - Math.PI / 2; ctx.group.add(skg);
      const eyes = [-4.5, 4.5].map((x) => { const l = new THREE.PointLight(0xff2000, 3, 30); l.position.set(x, 15, 11); skg.add(l); return l; });
      ctx.anim((dt, t) => eyes.forEach((l) => { l.intensity = 2 + Math.sin(t * 2) * 1.5; }));
      // dead trees
      ctx.scatter(18, { minC: 3, maxC: 40, r: 3, test: (x, z) => mask.test(x, z) }, (x, z) => {
        b.cyl(x, -0.4, z, 0.5, 6, C.black, { seg: 6 });
        for (let k = 0; k < 3; k++) { const a = rand() * 6.28; b.box(x + Math.cos(a) * 1.4, 3 + k * 1.2, z + Math.sin(a) * 1.4, 3, 0.4, 0.4, C.black, { rot: -a }); }
      });
    },
  },
  // ---------------------------------------------------------------------------------
  {
    id: 'frost', name: 'Frosty Peaks', subtitle: 'Summit jump, frozen lake and a ski lift',
    seed: 44, width: 18, shoulder: 5, start: 0.5,
    points: [[0, 0, 0], [100, -20, 0], [180, 20, 3], [200, 100, 8], [140, 160, 14], [60, 140, 18], [0, 180, 20], [-70, 150, 16], [-100, 80, 8], [-160, 60, 2], [-190, -20, 0], [-140, -80, 0], [-60, -60, 0]],
    sections: [
      { from: 9.2, to: 11.2, surface: 'ice', support: 'none', shoulder: 2, width: 22 },
    ],
    items: [2.2, 5.4, 8.5, 11.6],
    boosts: [[1.4, 0], [4.6, 0.35], [7.6, -0.3], [12.2, 0]],
    ramps: [6.25],
    studs: [[1.0, 0.4, 6], [3.8, 0, 6], [7.0, 0, 5], [9.8, 0, 8], [12.5, -0.4, 5]],
    theme: {
      sky: [0x2f7ad8, 0xdcefff, 0xbcd4e8], fog: [0xdcefff, 140, 820], sun: { color: 0xffffff, intensity: 2.8, dir: [0.4, 1, 0.6] },
      hemi: [0xe6f4ff, 0x8aa0b0, 1.3], envIntensity: 0.9,
      ground: 0xf4f8ff, groundPitch: 1.6, shoulder: 0xf4f8ff,
      road: { base: '#7d8a96', line: '#e8f6ff' }, wall: [C.white, C.azure, C.mdblue], curb: [C.red, C.white], gate: [C.azure, C.white],
      support: 'bank', pillar: C.white, skirt: ['#f4f8ff', '#b4c8d8'], skirtColor: C.white,
      rampSide: C.white, ramp: C.azure, particles: 'snow',
      music: { bpm: 126, root: 62, scale: 'major', style: 'jingle' },
    },
    decor(ctx) {
      const { b, rand, track: tr, bounds, scene } = ctx;
      const onIce = (i) => inRange(tr, i, 9.0, 11.4);
      const lake = ctx.makeMask(1400, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; strokeTrack(g, tr, toPx, sc, 26, onIce); });
      const lm = groundPlane(0xa8dcff, -0.03, 1400, 1.6, { mask: lake, rough: 0.05 });
      lm.material.metalness = 0.2; lm.material.bumpScale = 0.2;
      scene.add(lm);
      ctx.scatter(12, { minC: 2, maxC: 30, r: 3, test: (x, z) => lake.test(x, z) }, (x, z) => crystal(b, x, 0, z, 1.2, rand));
      // mountains ring
      ctx.scatter(16, { minC: 60, maxC: 320, r: 50, pad: 320, tries: 60 }, (x, z) => mountain(b, x, 0, z, 35 + rand() * 45, 50 + rand() * 70, rand, [C.ltgray, C.white, C.dkgray]));
      // pines everywhere (not on the lake)
      ctx.scatter(170, { minC: 2, maxC: 110, r: 3, test: (x, z) => !lake.test(x, z) }, (x, z) => pine(b, x, 0, z, 0.9 + rand() * 0.8, true));
      ctx.scatter(10, { minC: 3, maxC: 40, r: 3, test: (x, z) => !lake.test(x, z) }, (x, z) => snowman(b, x, 0, z, 1 + rand() * 0.4));
      // igloos
      ctx.scatter(3, { minC: 8, maxC: 50, r: 7, test: (x, z) => !lake.test(x, z) }, (x, z) => {
        const dome = new THREE.SphereGeometry(5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        b.add(dome, plastic(C.white), x, 0, z);
        b.box(x, 0, z + 5, 3, 3, 3, C.white);
        b.box(x, 0, z + 6.55, 2, 2.2, 0.2, C.black);
      });
      // ski lodge near the start and a ski lift up the hill
      const li = tr.kToIndex(0.2);
      const lp = tr.at(li, -(tr.HW[li] + tr.SH[li] + 16), 0);
      b.box(lp.x, 0, lp.z, 16, 6, 12, C.rbrown);
      for (let k = 0; k < 4; k++) b.box(lp.x, 1 + k * 1.4, lp.z, 16.4, 0.3, 12.4, C.brown);
      const roofL = new THREE.Matrix4().compose(new THREE.Vector3(lp.x, 8.5, lp.z - 3.3), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0, 0)), new THREE.Vector3(18, 0.8, 8.6));
      const roofR = new THREE.Matrix4().compose(new THREE.Vector3(lp.x, 8.5, lp.z + 3.3), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.6, 0, 0)), new THREE.Vector3(18, 0.8, 8.6));
      b.boxM(roofL, C.red); b.boxM(roofR, C.red);
      b.box(lp.x - 5, 0, lp.z + 6.1, 2, 3.4, 0.3, C.dkred);
      b.box(lp.x + 3, 2, lp.z + 6.1, 3, 2, 0.3, C.yellow, { matOpts: { emissive: 0xffc040, emissiveIntensity: 0.8 } });
      b.box(lp.x + 5, 6, lp.z - 2, 1.6, 5, 1.6, C.dkgray);
      ctx.claim(lp.x, lp.z, 12);
      // lift: from lodge to a mountain top
      const top = new THREE.Vector3(bounds.cx + 20, 40, bounds.cz - 260);
      const bottom = new THREE.Vector3(lp.x + 10, 6, lp.z - 10);
      const towers = 6;
      for (let k = 0; k <= towers; k++) {
        const p = bottom.clone().lerp(top, k / towers);
        const h = p.y + 4;
        b.box(p.x, 0, p.z, 1, h, 1, C.dkgray); b.box(p.x, h, p.z, 6, 0.6, 1, C.dkgray);
      }
      mountain(b, top.x, 0, top.z, 30, 40, rand, [C.ltgray, C.white]);
      const cable = new THREE.BufferGeometry().setFromPoints([bottom.clone().add(new THREE.Vector3(2.5, 4, 0)), top.clone().add(new THREE.Vector3(2.5, 4, 0)), top.clone().add(new THREE.Vector3(-2.5, 4, 0)), bottom.clone().add(new THREE.Vector3(-2.5, 4, 0))]);
      ctx.group.add(new THREE.LineLoop(cable, new THREE.LineBasicMaterial({ color: 0x222222 })));
      const chairB = new BrickBuilder(1);
      chairB.box(0, -3, 0, 2.6, 0.4, 1.4, C.red); chairB.box(0, -3, -0.6, 2.6, 1.6, 0.3, C.red); chairB.box(0, -3, 0, 0.2, 3, 0.2, C.black);
      const chairProto = chairB.build();
      const chairs = [];
      for (let k = 0; k < 12; k++) { const c = chairProto.clone(); ctx.group.add(c); chairs.push(c); }
      const dir = top.clone().sub(bottom);
      ctx.anim((dt, t) => chairs.forEach((c, k) => {
        let f = ((t * 0.02 + k / 12) % 1) * 2; const up = f < 1; if (!up) f = 2 - f;
        c.position.copy(bottom).addScaledVector(dir, f).add(new THREE.Vector3(up ? 2.5 : -2.5, 4, 0));
        c.rotation.y = Math.atan2(dir.x, dir.z) + (up ? 0 : Math.PI);
      }));
      // clouds
      for (let k = 0; k < 16; k++) cloud(ctx.bNoShadow, bounds.cx + (rand() - 0.5) * 1000, 110 + rand() * 60, bounds.cz + (rand() - 0.5) * 1000, 2.5, rand);
    },
  },
  // ---------------------------------------------------------------------------------
  {
    id: 'space', name: 'Rainbow Bricks', subtitle: 'A glowing road through outer space - mind the edge!',
    seed: 55, width: 20, shoulder: 0, edge: 'void', surface: 'rainbow', start: 0.5,
    points: [[0, 0, 30], [140, 0, 30], [220, 50, 34], [230, 140, 40], [170, 200, 46], [80, 190, 50], [20, 150, 48], [-20, 90, 44], [50, 55, 40], [100, 115, 36], [50, 175, 32], [-40, 190, 28], [-120, 160, 24], [-170, 90, 22], [-160, 10, 24], [-100, -30, 28], [-50, -20, 30]],
    sections: [
      { from: 6.2, to: 10.2, edge: 'wall', shoulder: 1.5 },
      { from: 12.33, to: 12.5, gap: true },
    ],
    items: [2.5, 5.6, 9.4, 13.6, 15.8],
    boosts: [[1.5, -0.45], [1.5, 0.45], [4.4, 0], [7.2, 0], [10.9, 0], [14.5, 0.3], [16.3, -0.3]],
    ramps: [12.25],
    studs: [[1.0, 0, 8], [3.3, 0.3, 6], [6.5, -0.3, 6], [8.8, 0, 6], [11.3, 0, 6], [14.9, 0, 6]],
    theme: {
      sky: [0x05020f, 0x2a0a4a, 0x0a0420], fog: [0x160626, 250, 1100], sun: { color: 0xd8c8ff, intensity: 2.0, dir: [-0.3, 1, 0.4] },
      hemi: [0x8a7aff, 0x2a1a4a, 1.2], envIntensity: 1.0,
      noGround: true, stars: 5000, groundY: -60,
      road: { base: '#ffffff', line: null }, wall: [0xff3a8a, 0x3ad0ff, 0xffe03a, 0x7aff5a], curb: null, gate: [C.magenta, C.dkblue],
      support: 'none', skirt: ['#2a1a5a', '#140a30'], skirtColor: 0x1a0a3a, rail: 0x7ad8ff,
      rampSide: C.dkblue, ramp: 0xff3a8a,
      music: { bpm: 140, root: 64, scale: 'lydian', style: 'space' },
    },
    decor(ctx) {
      const { rand, bounds, scene } = ctx;
      // studded planets
      const planets = [
        { p: [-520, 60, 380], r: 140, c: 0xd06a2a, ring: 0xf2cd37 },
        { p: [620, 180, -420], r: 90, c: 0x3a8ad8 },
        { p: [200, -160, 600], r: 60, c: 0x7ae07a },
        { p: [-300, 300, -600], r: 45, c: 0xd84aa8 },
      ];
      const pm = [];
      for (const pl of planets) {
        const m = studPlanet(pl.r, pl.c);
        m.position.set(...pl.p);
        m.material.fog = false;
        scene.add(m); pm.push(m);
        if (pl.ring) {
          const rm = baseplateMat(pl.ring, 3, 0.5);
          rm.side = THREE.DoubleSide; rm.fog = false;
          rm.map.repeat.set(60, 6); rm.bumpMap.repeat.copy(rm.map.repeat);
          const ring = new THREE.Mesh(new THREE.RingGeometry(pl.r * 1.4, pl.r * 2.1, 96, 1), rm);
          ring.rotation.x = -Math.PI / 2 + 0.35; ring.rotation.y = 0.2;
          m.add(ring);
        }
      }
      // giant minifig-head moon
      const moon = new THREE.Group();
      const head = new THREE.Mesh(new THREE.CylinderGeometry(55, 55, 90, 48), [new THREE.MeshStandardMaterial({ map: faceTexture('grin'), roughness: 0.4, fog: false }), plastic(C.fig), plastic(C.fig)]);
      head.material.forEach((mm) => { mm.fog = false; });
      head.rotation.y = Math.PI;
      moon.add(head);
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 18, 32), new THREE.MeshStandardMaterial({ color: C.fig, roughness: 0.4, fog: false }));
      stud.position.y = 54; moon.add(stud);
      moon.position.set(bounds.cx + 150, 150, bounds.cz + 650);
      scene.add(moon);
      ctx.anim((dt, t) => { pm.forEach((m, k) => { m.rotation.y = t * (0.02 + k * 0.01); }); moon.rotation.y = Math.PI + Math.sin(t * 0.1) * 0.5; moon.rotation.z = Math.sin(t * 0.07) * 0.1; });
      // space station
      const st = new BrickBuilder(1);
      st.cyl(0, -8, 0, 8, 16, C.ltgray, { seg: 24 });
      st.cyl(0, -1, 0, 9, 2, C.blue, { seg: 24 });
      st.cyl(0, 8, 0, 3, 6, C.ltgray, { seg: 16, stud: 3 });
      const panel = plastic(0x1a2a6a, { metal: 0.6, rough: 0.2, emissive: 0x1a3aa0, emissiveIntensity: 0.4 });
      for (const s of [-1, 1]) {
        st.box(s * 22, -0.5, 0, 28, 1, 1, C.ltgray);
        for (let k = 0; k < 3; k++) st.box(s * (14 + k * 8), -0.5, 0, 7, 0.3, 14, 0, { mat: panel });
      }
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; st.box(Math.cos(a) * 8.1, 2, Math.sin(a) * 8.1, 1.4, 2, 1.4, C.yellow, { rot: -a, matOpts: { emissive: 0xffd040, emissiveIntensity: 1.5 } }); }
      st.cyl(0, 14, 0, 0.3, 12, C.ltgray, { seg: 6 }); st.sphere(0, 26, 0, 1, C.red, { matOpts: { emissive: 0xff2020, emissiveIntensity: 2 } });
      const stg = st.build(); stg.position.set(bounds.cx - 40, 60, bounds.cz - 230); scene.add(stg);
      ctx.anim((dt, t) => { stg.rotation.y = t * 0.08; });
      // tumbling asteroid bricks
      const n = 160;
      const ast = new THREE.InstancedMesh(brickGeometry(2, 4, 3, 2, true, 8), plastic(0xffffff), n);
      const data = [];
      const col = new THREE.Color();
      for (let k = 0; k < n; k++) {
        let p;
        for (let tries = 0; tries < 20; tries++) {
          p = new THREE.Vector3(bounds.cx + (rand() - 0.5) * 900, -80 + rand() * 220, bounds.cz + (rand() - 0.5) * 900);
          if (ctx.track.clearance(p.x, p.z, 40) > 30 || Math.abs(p.y - 35) > 30) break;
        }
        data.push({ p, r: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6), s: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5), sc: 0.6 + rand() * 2.2 });
        col.setHSL(rand(), 0.7, 0.55); ast.setColorAt(k, col);
      }
      scene.add(ast);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
      ctx.anim((dt) => {
        data.forEach((d, k) => {
          d.r.x += d.s.x * dt; d.r.y += d.s.y * dt; d.r.z += d.s.z * dt;
          q.setFromEuler(d.r); m4.compose(d.p, q, sc.setScalar(d.sc)); ast.setMatrixAt(k, m4);
        });
        ast.instanceMatrix.needsUpdate = true;
      });
      // rocket ships flying laps
      const rk = new BrickBuilder(1);
      rk.cyl(0, 0, 0, 1.6, 8, C.white, { seg: 12 }); rk.cone(0, 8, 0, 1.6, 3.5, C.red, { seg: 12 });
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; rk.box(Math.cos(a) * 1.8, 0, Math.sin(a) * 1.8, 0.3, 3, 2.2, C.red, { rot: -a }); }
      rk.cyl(0, -1.5, 0, 1.1, 1.5, 0xff8a18, { seg: 10, matOpts: { emissive: 0xff6a00, emissiveIntensity: 3 } });
      const rkg = rk.build();
      rkg.children.forEach((c) => { c.geometry.rotateX(Math.PI / 2); });
      const rockets = [0, 1].map((k) => { const g = rkg.clone(); scene.add(g); return { g, k }; });
      ctx.anim((dt, t) => rockets.forEach(({ g, k }) => {
        const a = t * 0.12 + k * Math.PI, R = 320 + k * 80;
        g.position.set(bounds.cx + Math.cos(a) * R, 80 + Math.sin(t * 0.3 + k) * 30 + k * 40, bounds.cz + Math.sin(a) * R);
        g.rotation.y = -a + (k ? 0 : Math.PI);
      }));
    },
  },
];

export function trackById(id) { return TRACKS.find((t) => t.id === id) || TRACKS[0]; }
export { rng };
