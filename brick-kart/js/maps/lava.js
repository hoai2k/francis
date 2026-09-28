// Lava Castle: lava bombs from the volcano, geysers on the hairpins, crushers
// at the castle gate, fire bars in the courtyard, a glide over the lava lake
// and a bridge with no rails.
import { THREE, BrickBuilder, C, plastic, groundPlane, pick, rock, crystal, tower, wallSeg, brickGeometry, canvasTexture, cannon, geyser, crusher, spinner, disc, strokeTrack, inRange, edges, arch, each } from './kit.js';

export default {
  id: 'lava', name: 'Lava Castle', subtitle: 'Lava bombs, geysers, fire bars and a glide over the lava lake',
  cup: 'galaxy', seed: 33, width: 26, shoulder: 5, edge: 'wall', start: 0.5,
  points: [[-146, -242, 0], [48, -259, 0], [194, -227, 0], [276, -146, 2], [227, -65, 5], [130, -65, 8], [97, 0, 11], [179, 65, 14], [276, 97, 18], [242, 194, 24], [130, 211, 30], [17, 242, 30], [-97, 227, 28], [-211, 179, 12], [-292, 82, 6], [-300, -48, 3], [-242, -179, 1]],
  sections: [
    { from: 12.12, to: 13.6, gap: true },
    { from: 13.9, to: 15.3, edge: 'void', shoulder: 0, support: 'pillar', width: 22 },
  ],
  items: [1.5, 4.9, 8.2, 10.9, 14.4, 16.3],
  boosts: [[2.3, 0], [7.4, 0], [11.5, 0], [15.6, 0]],
  gliders: [12.02],
  ramps: [16.4],
  studs: [[0.8, 0.3, 8], [3.2, 0, 6], [6.3, 0, 6], [9.5, 0, 6], [10.4, 0, 8], [14.3, 0, 8], [16.0, -0.3, 5]],
  theme: {
    sky: [0x0b0612, 0x6a1c0e, 0x2a0800], fog: [0x3a0e08, 120, 780], sun: { color: 0xff9a60, intensity: 1.5, dir: [0.3, 1, -0.5] },
    hemi: [0x6a4a8a, 0x8a2a00, 0.95], envIntensity: 0.45,
    groundY: -2, ground: 0xff5a00, groundPitch: 1.6, groundOpts: { emissive: 0xff4a00, emissiveIntensity: 1.3, rough: 0.5 },
    shoulder: C.dkstone, dust: 0x3a3a3a, road: { base: '#3b3e40', line: '#ff8a18' }, wall: [C.dkgray, C.black, C.dkstone], curb: [C.orange, C.black], gate: [C.dkgray, C.black],
    support: 'bank', pillar: C.dkstone, pillar2: C.black, skirt: ['#595d60', '#2a2c2e'], skirtColor: C.black,
    rampSide: C.black, ramp: C.red, particles: 'embers',
    music: { bpm: 152, root: 52, scale: 'minor', style: 'rock' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    const V = [-60, -60];
    const lavaOpen = (i) => inRange(tr, i, 12.0, 15.4);
    const mask = ctx.makeMask(1600, 1024, (g, toPx, sc) => {
      g.fillStyle = '#fff';
      strokeTrack(g, tr, toPx, sc, 18, (i) => !lavaOpen(i));
      disc(g, toPx, sc, V[0], V[1], 100);
      for (let k = 0; k < 16; k++) disc(g, toPx, sc, bounds.cx + (rand() - 0.5) * 800, bounds.cz + (rand() - 0.5) * 800, 20 + rand() * 40);
      g.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 10; k++) disc(g, toPx, sc, V[0] + (rand() - 0.5) * 180, V[1] + (rand() - 0.5) * 180, 6 + rand() * 8);
    });
    scene.add(groundPlane(C.dkstone, -0.4, 1600, 1.6, { mask, rough: 0.8 }));
    const lava = scene.children.find((o) => o.isMesh && o.material?.emissiveMap);
    if (lava) ctx.anim((dt, t) => { lava.material.map.offset.set(t * 0.02, Math.sin(t * 0.4) * 0.2); lava.material.emissiveIntensity = 1.2 + Math.sin(t * 2.3) * 0.2; });
    // volcano
    let y = -0.4;
    for (let k = 0; k < 16; k++) y = b.cyl(V[0] + Math.sin(k) * 1.5, y, V[1] + Math.cos(k) * 1.5, 85 - k * 4.8, 3.6, k % 3 === 2 ? C.black : k % 2 ? C.dkstone : C.dkgray, { seg: 28 });
    b.cyl(V[0], y - 0.2, V[1], 10, 0.4, 0xff6a00, { seg: 24, matOpts: { emissive: 0xff5000, emissiveIntensity: 2.2 } });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.4; b.box(V[0] + Math.cos(a) * 36, -0.4, V[1] + Math.sin(a) * 36, 3, y - 2, 1.2, 0xff5a00, { rot: -a, matOpts: { emissive: 0xff4a00, emissiveIntensity: 1.8 } }); }
    const vlight = new THREE.PointLight(0xff5a1a, 5, 260, 1.4); vlight.position.set(V[0], y + 10, V[1]); scene.add(vlight);
    ctx.claim(V[0], V[1], 90);
    const smokeG = new THREE.InstancedMesh(brickGeometry(2, 2, 3, 2, true, 8), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1, transparent: true, opacity: 0.7 }), 40);
    scene.add(smokeG);
    const sm = [...Array(40)].map((_, k) => ({ t: k / 40 * 8, a: rand() * 6.28 }));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e = new THREE.Euler();
    const top = y;
    ctx.anim((dt) => {
      sm.forEach((s, k) => { s.t += dt; if (s.t > 8) { s.t = 0; s.a = rand() * 6.28; } const f = s.t / 8; p3.set(V[0] + Math.cos(s.a) * f * 20, top + f * 70, V[1] + Math.sin(s.a) * f * 20 + f * 25); s3.setScalar(1 + f * 3); q.setFromEuler(e.set(f * 2, s.a, f)); m4.compose(p3, q, s3); smokeG.setMatrixAt(k, m4); });
      smokeG.instanceMatrix.needsUpdate = true;
    });
    // the volcano lobs lava bombs onto the road
    const vent = new THREE.Vector3(V[0], top + 2, V[1]);
    ctx.hazard(cannon(ctx, { from: vent, targets: [[0.7, 0], [1.3, 0.3], [2.0, -0.3], [15.7, 0], [16.5, 0.3]], period: 2.6, color: 0xff5a00 }));
    ctx.hazard(cannon(ctx, { from: vent, targets: [[4.6, 0], [5.4, 0], [6.0, 0.3]], period: 3.4, offset: 1.3, color: 0xff5a00 }));
    // geysers on the hairpins
    [[4.3, 0.4], [4.7, -0.4], [5.35, 0.2], [5.8, -0.45], [6.3, 0.35]].forEach(([k, l], n) => ctx.hazard(geyser(ctx, { i: tr.kToIndex(k), lat: l * 13, period: 4.2, offset: n * 0.8 })));
    // castle: walls along the courtyard, towers at the gates
    const c0 = tr.kToIndex(9.3), c1 = tr.kToIndex(11.6);
    const wallLat = (i) => tr.HW[i] + tr.SH[i] + 2.5;
    let prev = null;
    for (let i = c0; i <= c1; i += 6) {
      for (const side of [-1, 1]) {
        const p = tr.at(i, wallLat(i) * side, 0);
        if (prev && prev[side]) wallSeg(b, prev[side].x, prev[side].z, p.x, p.z, -2, p.y + 8, C.ltgray);
        prev ||= {}; prev[side] = p;
      }
    }
    const torches = [];
    for (const i of [c0, c1]) {
      for (const side of [-1, 1]) {
        const p = tr.at(i, (wallLat(i) + 2) * side, 0);
        tower(b, p.x, -2, p.z, 5, p.y + 16, C.ltgray, C.dkred);
        torches.push(tr.at(i, (wallLat(i) - 1) * side, 4));
      }
      const a = tr.at(i, 0, 11);
      b.box(a.x, a.y, a.z, (wallLat(i) + 2) * 2, 3.5, 3, C.dkgray, { rot: tr.yawAt(i) });
    }
    // crushers under the entrance gate, fire bars in the courtyard
    [[9.2, -0.4], [9.35, 0.4]].forEach(([k, l], n) => ctx.hazard(crusher(ctx, { i: tr.kToIndex(k), lat: l * 13, period: 3.4, offset: n * 1.7, size: 8, color: C.dkgray })));
    for (const [k, sd] of [[10.0, -1], [10.7, 1], [11.3, -1]]) {
      const i = tr.kToIndex(k);
      ctx.hazard(spinner(ctx, { center: tr.at(i, sd * (tr.HW[i] + 1), 0), length: tr.HW[i] * 1.1, speed: sd * 1.4, balls: 7 }));
    }
    const ki = tr.kToIndex(10.4), kp = tr.at(ki, -(tr.HW[ki] + 36), 0);
    tower(b, kp.x, -2, kp.z, 13, 44, C.ltgray, C.dkred);
    tower(b, kp.x + 12, -2, kp.z - 9, 6, 58, C.dkgray, C.dkred);
    const banTex = canvasTexture(128, 256, (g, w, h) => { g.fillStyle = '#9a0f0f'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2cd37'; g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w - 20, 110); g.lineTo(w / 2, 200); g.lineTo(20, 110); g.fill(); });
    for (let i = c0 + 10; i < c1 - 5; i += 22) for (const side of [-1, 1]) {
      const p = tr.at(i, (wallLat(i) - 1.3) * side, 1);
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(3, 6), new THREE.MeshStandardMaterial({ map: banTex, side: THREE.DoubleSide }));
      ban.position.copy(p); ban.position.y += 3; ban.rotation.y = tr.yawAt(i) + Math.PI / 2;
      ctx.group.add(ban);
    }
    const flameMat = plastic(0xff9a20, { trans: true, opacity: 0.85, emissive: 0xff7010, emissiveIntensity: 2.5 });
    const lights = [];
    torches.forEach((p, k) => {
      b.cyl(p.x, p.y - 2, p.z, 0.25, 2, C.black, { seg: 6 });
      b.cone(p.x, p.y, p.z, 0.5, 1.3, 0, { mat: flameMat, seg: 8 });
      if (k % 2 === 0) { const l = new THREE.PointLight(0xff7a2a, 3, 45, 1.5); l.position.copy(p).add(new THREE.Vector3(0, 1.5, 0)); scene.add(l); lights.push(l); }
    });
    ctx.anim((dt, t) => lights.forEach((l, k) => { l.intensity = 2.6 + Math.sin(t * 13 + k * 3) * 0.5; }));
    // lava falls off the castle cliff under the glide
    each(tr, 12.1, 12.3, 6, (i) => { for (const sd of [-1, 1]) { const p = tr.at(i, sd * (tr.HW[i] + 8), 0); b.box(p.x, -2, p.z, 6, p.y + 2, 1, 0xff5a00, { rot: tr.yawAt(i), matOpts: { emissive: 0xff4a00, emissiveIntensity: 1.8 } }); } });
    // obsidian, glowing crystals, dead trees
    ctx.scatter(50, { minC: 3, maxC: 100, r: 4, test: (x, z) => mask.test(x, z) }, (x, z) => (rand() < 0.6 ? rock(b, x, -0.4, z, 1.7, rand, [C.black, C.dkstone, C.dkgray]) : crystal(b, x, -0.4, z, 1.5, rand, rand() < 0.5 ? 0xff3a1a : 0xff9a10)));
    edges(ctx, 0, 11.9, 17, 3, (p) => { if (rand() < 0.5) { b.cyl(p.x, p.y, p.z, 0.5, 6, C.black, { seg: 6 }); for (let k = 0; k < 3; k++) { const a = rand() * 6.28; b.box(p.x + Math.cos(a) * 1.4, p.y + 3 + k * 1.2, p.z + Math.sin(a) * 1.4, 3, 0.4, 0.4, C.black, { rot: -a }); } } });
    // skull rock beside the lava bridge
    const si = tr.kToIndex(14.6), sp = tr.at(si, tr.HW[si] + 40, 0);
    const sk = new BrickBuilder(2);
    sk.sphere(0, 14, 0, 12, C.white, { sy: 0.95 }); sk.box(0, 0, 0, 12, 8, 10, C.white);
    sk.sphere(-4.5, 15, 9, 3.4, C.black); sk.sphere(4.5, 15, 9, 3.4, C.black);
    for (let k = -2; k <= 2; k++) sk.box(k * 2.2, 3, 5.2, 1.2, 3, 0.6, C.black);
    const skg = sk.build(); skg.position.set(sp.x, -2, sp.z); skg.rotation.y = tr.yawAt(si) - Math.PI / 2; ctx.group.add(skg);
    arch(ctx, 12.0, { cols: [C.dkgray, C.red], text: 'GLIDE!', bg: '#720e0f', fg: '#ffd040' });
    void pick;
  },
};
