// Pirate Cove: sunset island with docks, a galleon firing its cannons at
// the beach, crabs, a sea cave, a broken-dock jump and a cliff glide.
import { THREE, BrickBuilder, C, groundPlane, palm, rock, tower, cloud, canvasTexture, crossing, cannon, tunnel, liquid, disc, strokeTrack, trackPolygon, inRange, edges, arch, built } from './kit.js';

function skullTexture(bg = '#111', fg = '#f4f4f4') {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.22, 0, Math.PI * 2); g.fill();
    g.fillRect(w * 0.36, h * 0.5, w * 0.28, h * 0.16);
    g.fillStyle = bg;
    g.beginPath(); g.arc(w * 0.42, h * 0.42, w * 0.06, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(w * 0.58, h * 0.42, w * 0.06, 0, Math.PI * 2); g.fill();
    g.strokeStyle = fg; g.lineWidth = w * 0.06; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w * 0.22, h * 0.72); g.lineTo(w * 0.78, h * 0.9); g.stroke();
    g.beginPath(); g.moveTo(w * 0.78, h * 0.72); g.lineTo(w * 0.22, h * 0.9); g.stroke();
  });
}
function crabMesh() {
  return built((b) => {
    b.sphere(0, 0.9, 0, 1.2, C.red, { sy: 0.55 });
    for (const sd of [-1, 1]) {
      b.box(sd * 1.6, 0.9, 0.9, 0.9, 0.6, 0.7, C.red); b.box(sd * 1.9, 0.9, 1.4, 0.5, 0.8, 0.4, C.red);
      b.cyl(sd * 0.4, 1.2, 0.6, 0.08, 0.6, C.red, { seg: 4 }); b.sphere(sd * 0.4, 1.9, 0.6, 0.18, C.white);
      for (let k = -1; k <= 1; k++) b.box(sd * 1.3, 0, k * 0.5, 0.9, 0.2, 0.15, C.red);
    }
  }, 'crab');
}

export default {
  id: 'pirate', name: 'Pirate Cove', subtitle: 'Cannon fire, a sea cave and a cliff glide over the bay',
  cup: 'stud', seed: 22, width: 26, shoulder: 9, edge: 'fence', start: 0.5,
  points: [[-193, -64, 0], [-64, -153, 0], [97, -169, 0], [225, -129, 0], [330, -64, 0.6], [386, 48, 0.6], [346, 161, 0.6], [241, 217, 0], [145, 241, 0], [80, 177, 3], [129, 97, 9], [48, 32, 16], [-48, 80, 24], [-97, 177, 10], [-177, 225, 5], [-282, 185, 0.6], [-362, 80, 0.6], [-314, -16, 0.6]],
  sections: [
    { from: 0, to: 3.8, edge: 'open', shoulder: 12 },
    { from: 4.2, to: 6.8, surface: 'wood', edge: 'void', shoulder: 0, support: 'pillar', width: 22 },
    { from: 5.45, to: 5.58, gap: true },
    { from: 8.3, to: 9.5, edge: 'wall', shoulder: 2 },
    { from: 12.12, to: 13.45, gap: true },
    { from: 15.2, to: 17.8, surface: 'wood', edge: 'void', shoulder: 0, support: 'pillar', width: 22 },
  ],
  items: [1.6, 4.5, 7.6, 10.8, 14.1, 16.5],
  boosts: [[2.3, 0], [7.0, 0.3], [11.4, 0], [14.9, -0.2], [17.3, 0]],
  ramps: [5.36],
  gliders: [12.02],
  studs: [[0.9, 0.4, 8], [2.8, -0.4, 6], [4.7, 0, 5], [6.3, 0, 6], [8.6, 0, 8], [10.3, 0, 6], [13.8, 0, 6], [16.0, -0.3, 8]],
  theme: {
    sky: [0x3a3f8f, 0xffa06a, 0x1e5a8a], fog: [0xf2a27a, 200, 1000], sun: { color: 0xffc080, intensity: 2.5, dir: [-0.8, 0.55, 0.2] },
    hemi: [0xffd0b0, 0x4a6a8a, 1.2], envIntensity: 0.8,
    groundY: -1.6, ground: 0x1673c9, groundPitch: 1.6, groundOpts: { transparent: true, opacity: 0.88, rough: 0.12 },
    shoulder: C.tan, dust: 0xe4cd9e, road: { base: '#b89a6a', line: '#f4f4f4' }, wall: [C.rbrown, C.dktan], curb: [C.red, C.white], gate: [C.rbrown, C.dktan], fence: [C.rbrown, C.dktan],
    support: 'bank', pillar: C.rbrown, pillar2: C.brown, skirt: ['#d8c090', '#9c8458'],
    rampSide: C.rbrown, ramp: C.orange,
    music: { bpm: 122, root: 57, scale: 'dorian', style: 'shanty' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    const islets = [[-190, -190, 30], [390, -250, 44], [-400, 280, 48], [430, 280, 34], [0, 360, 40]];
    const onDock = (i) => inRange(tr, i, 4.0, 7.0) || inRange(tr, i, 15.0, 18.0);
    const inGlide = (i) => inRange(tr, i, 12.0, 13.6);
    const mask = ctx.makeMask(1600, 1024, (g, toPx, sc) => {
      g.fillStyle = '#fff';
      trackPolygon(g, tr, toPx); g.fill();
      strokeTrack(g, tr, toPx, sc, 30, (i) => !onDock(i) && !inGlide(i));
      for (const [x, z, r] of islets) disc(g, toPx, sc, x, z, r);
      g.globalCompositeOperation = 'destination-out';
      strokeTrack(g, tr, toPx, sc, 18, (i) => inRange(tr, i, 4.5, 6.5) || inRange(tr, i, 15.5, 17.5) || inRange(tr, i, 12.4, 13.3));
      g.globalCompositeOperation = 'source-over';
    });
    scene.add(groundPlane(C.tan, -0.12, 1600, 1.6, { mask }));
    const grass = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; for (const [x, z, r] of [[150, -30, 50], [-120, 30, 50], [0, -60, 40], [60, 120, 40]]) disc(g, toPx, sc, x, z, r); });
    scene.add(groundPlane(C.green, -0.06, 1600, 1.6, { mask: grass }));
    const water = scene.children.find((o) => o.isMesh && o.material?.transparent && o.position.y < -1);
    if (water) ctx.anim((dt, t) => { water.material.map.offset.set(Math.sin(t * 0.3) * 0.3, t * 0.05); water.material.bumpMap.offset.copy(water.material.map.offset); });
    ctx.scatter(120, { minC: 2, maxC: 80, r: 3, test: (x, z) => mask.test(x, z) }, (x, z) => palm(b, x, 0, z, 0.9 + rand() * 0.6, rand));
    edges(ctx, 0, 3.8, 14, 1, (p) => { if (rand() < 0.8) palm(b, p.x, 0, p.z, 1 + rand() * 0.4, rand); });
    ctx.scatter(40, { minC: 2, maxC: 80, r: 4, test: (x, z) => mask.test(x, z) }, (x, z) => rock(b, x, 0, z, 1.5, rand, [C.dkgray, C.ltgray, C.dktan]));
    for (const [x, z, r] of islets) for (let k = 0; k < 5; k++) palm(b, x + (rand() - 0.5) * r, 0, z + (rand() - 0.5) * r, 1.2, rand);
    ctx.scatter(26, { minC: 6, maxC: 70, r: 2, test: (x, z) => !mask.test(x, z) }, (x, z) => { b.cyl(x, -2.2, z, 1, 2.6, C.rbrown, { seg: 12 }); b.cyl(x, -1.2, z, 1.05, 0.3, C.dkgray, { seg: 12 }); });
    // sea cave: rocky tunnel
    tunnel(ctx, 8.3, 9.5, { wall: C.dkgray, roof: C.dkstone, height: 11, lights: 0x7af0ff });
    // cliff: rocks around the glider ramp and down to the bay
    for (let i = tr.kToIndex(11.3); i < tr.kToIndex(12.1); i += 6) for (const sd of [-1, 1]) rock(b, tr.px(i) + tr.R[i * 2] * sd * 26, -1.6, tr.pz(i) + tr.R[i * 2 + 1] * sd * 26, 3, rand, [C.dkgray, C.ltgray, C.dktan]);
    // waterfall from the cliff into the bay
    const wi = tr.kToIndex(12.3), wp = tr.at(wi, 0, 0);
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(14, 24), new THREE.MeshStandardMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.75, emissive: 0x2a6aaa, emissiveIntensity: 0.4, side: THREE.DoubleSide, map: canvasTexture(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? '#ffffff' : '#bfe8ff'; g.fillRect(0, y, w, 8); } }) }));
    fall.material.map.wrapT = THREE.RepeatWrapping;
    fall.position.set(wp.x + tr.R[wi * 2] * 34, 10, wp.z + tr.R[wi * 2 + 1] * 34); fall.rotation.y = tr.yawAt(wi);
    scene.add(fall);
    ctx.anim((dt, t) => { fall.material.map.offset.y = t * 1.5; });
    // lighthouse on the islet
    const [lx, lz] = [-190, -190];
    let y = 0;
    for (let k = 0; k < 13; k++) y = b.cyl(lx, y, lz, 4.2 - k * 0.12, 2.4, k % 2 ? C.white : C.red, { seg: 18 });
    b.cyl(lx, y, lz, 3.6, 0.6, C.dkgray, { seg: 18 });
    b.cyl(lx, y + 0.6, lz, 2.4, 3, C.yellow, { seg: 18, matOpts: { trans: true, opacity: 0.7, emissive: 0xffe060, emissiveIntensity: 2 } });
    b.cone(lx, y + 3.6, lz, 3.2, 2.6, C.red, { seg: 18 });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(7, 80, 16, 1, true).translate(0, -40, 0).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    beam.position.set(lx, y + 2, lz);
    ctx.group.add(beam);
    ctx.anim((dt, t) => { beam.rotation.y = t * 0.8; });
    // galleon anchored off the south beach, firing at the road
    const ship = new BrickBuilder(1);
    const L = 52;
    for (let k = 0; k < 5; k++) ship.box(0, k * 1.6, 0, 15 - Math.abs(k - 1.5) * 1.6, 1.6, L - Math.abs(k - 2) * 5, k % 2 ? C.rbrown : C.brown);
    ship.box(0, 8, -L / 2 + 6, 14, 5, 10, C.rbrown); ship.box(0, 13, -L / 2 + 6, 14.6, 0.6, 10.6, C.dktan);
    ship.box(0, 8, L / 2 - 3, 8, 2.5, 6, C.rbrown);
    for (let k = -1; k <= 1; k++) ship.cyl(0, 8, k * 13, 0.7, 36 - Math.abs(k) * 6, C.brown);
    for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) { ship.cyl(s * 7.6, 5, k * 7.5, 0.55, 0.4, C.black, { seg: 8 }); ship.box(s * 7.3, 4.2, k * 7.5, 0.4, 1.6, 1.6, C.black); }
    const shipG = ship.build({ name: 'ship' });
    const sailTex = skullTexture('#f4f0e0', '#1b1b1b');
    for (let k = -1; k <= 1; k++) {
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(17 - Math.abs(k) * 3, 15, 8, 1), new THREE.MeshStandardMaterial({ map: sailTex, side: THREE.DoubleSide, roughness: 0.8 }));
      const pa = sail.geometry.attributes.position;
      for (let v = 0; v < pa.count; v++) pa.setZ(v, Math.cos(pa.getX(v) / 8 * 1.3) * 2);
      sail.geometry.computeVertexNormals();
      sail.position.set(0, 23 - Math.abs(k) * 3, k * 13 + 0.8);
      sail.castShadow = true;
      shipG.add(sail);
    }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ map: skullTexture(), side: THREE.DoubleSide }));
    flag.position.set(0, 38, 3); shipG.add(flag);
    const shipPos = new THREE.Vector3(40, -2.2, -300);
    shipG.position.copy(shipPos); shipG.rotation.y = 1.4;
    ctx.group.add(shipG);
    ctx.anim((dt, t) => { shipG.rotation.z = Math.sin(t * 0.7) * 0.04; shipG.position.y = -2.2 + Math.sin(t * 0.9) * 0.3; flag.rotation.y = Math.sin(t * 3) * 0.3; });
    ctx.hazard(cannon(ctx, { from: shipPos.clone().add(new THREE.Vector3(0, 8, 0)), targets: [[1.4, 0], [1.9, 0.4], [2.5, -0.3], [3.1, 0.2]], period: 3.2 }));
    ctx.hazard(cannon(ctx, { from: shipPos.clone().add(new THREE.Vector3(0, 8, 10)), targets: [[4.6, 0], [2.2, -0.4]], period: 4.1, offset: 1.6 }));
    // crabs scuttling across the beach road
    ctx.hazard(crossing(ctx, { mesh: crabMesh(), k: 0.9, speed: 6, kind: 'spin' }));
    ctx.hazard(crossing(ctx, { mesh: crabMesh(), k: 3.3, speed: 7, kind: 'spin', offset: 0.4 }));
    ctx.hazard(crossing(ctx, { mesh: crabMesh(), k: 14.7, speed: 5, kind: 'spin', offset: 0.7 }));
    // fort gate
    const gi = tr.kToIndex(2.0), span = tr.HW[gi] + tr.SH[gi] + 3;
    const gate = new BrickBuilder(1);
    for (const s of [-1, 1]) tower(gate, s * span, 0, 0, 3.4, 13, C.ltgray, C.dkred);
    gate.box(0, 12, 0, span * 2, 3, 3, C.dkgray);
    for (let x = -span; x <= span; x += 3.2) gate.brick(x, 15, 0, 1, 1, 3, C.dkgray, { pitch: 1.6 });
    const gg = gate.build(); gg.position.copy(tr.at(gi, 0, 0)); gg.position.y = 0; gg.rotation.y = tr.yawAt(gi);
    const gflag = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshStandardMaterial({ map: skullTexture(), side: THREE.DoubleSide }));
    gflag.position.set(0, 19, 0); gg.add(gflag);
    ctx.group.add(gg);
    arch(ctx, 12.0, { cols: [C.azure, C.white], text: 'GLIDE!', bg: '#1a8cff' });
    // treasure
    const ci = tr.kToIndex(10.6), cp = tr.at(ci, tr.HW[ci] + tr.SH[ci] + 5, 0);
    b.box(cp.x, cp.y, cp.z, 3, 2, 2, C.rbrown); b.box(cp.x, cp.y + 2, cp.z, 3.1, 0.8, 2.1, C.pearl, { matOpts: { metal: 0.8, rough: 0.2 } });
    for (let k = 0; k < 9; k++) b.cyl(cp.x + (rand() - 0.5) * 6, cp.y, cp.z + (rand() - 0.5) * 6, 0.5, 0.2, C.pearl, { matOpts: { metal: 0.9, rough: 0.2, emissive: 0x6a4a00 } });
    for (let k = 0; k < 16; k++) cloud(ctx.bNoShadow, bounds.cx + (rand() - 0.5) * 1000, 110 + rand() * 50, bounds.cz + (rand() - 0.5) * 1000, 2.5, rand);
    void liquid;
  },
};
