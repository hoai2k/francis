// Sweet Treat Valley: pink candy roads, gumballs rolling down Cake Mountain,
// a glide over the chocolate lake, lollipop forests and cupcake obstacles.
import { THREE, C, groundPlane, cloud, pick, lollipop, candyCane, cupcake, donut, gumdrop, iceCream, trackMover, liquid, disc, strokeTrack, inRange, edges, arch, built, each } from './kit.js';

function gumball(col) {
  const g = new THREE.Group();
  const spin = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), new THREE.MeshStandardMaterial({ color: col, roughness: 0.15, metalness: 0.05 }));
  spin.position.y = 2.6; spin.castShadow = true;
  g.add(spin); g.userData.spin = spin;
  return g;
}

export default {
  id: 'candy', name: 'Sweet Treat Valley', subtitle: 'Dodge gumballs on Cake Mountain, then glide over the chocolate lake',
  cup: 'brick', seed: 41, width: 28, shoulder: 10, edge: 'fence', surface: 'candy', start: 0.5,
  points: [[-207, -184, 0], [-46, -218, 0], [69, -161, 2], [172, -218, 4], [276, -138, 8], [276, -12, 12], [218, 80, 18], [115, 103, 24], [23, 57, 28], [-34, 150, 18], [-57, 247, 6], [-103, 334, 0], [-230, 334, 0], [-276, 253, 0], [-368, 207, 0], [-345, 103, 0], [-264, 0, 2], [-299, -103, 0]],
  sections: [
    { from: 0, to: 3.2, edge: 'open', shoulder: 14 },
    { from: 3.8, to: 8.1, support: 'bank', shoulder: 5 },
    { from: 8.15, to: 10.1, gap: true },
    { from: 12.6, to: 13.3, surface: 'cookie', edge: 'wall', shoulder: 1, support: 'pillar' },
    { from: 14.5, to: 15.5, width: 44, edge: 'open', shoulder: 12 },
  ],
  items: [1.5, 4.6, 7.2, 11.2, 14.1, 16.6],
  boosts: [[2.4, 0], [6.1, -0.3], [10.8, 0.3], [13.8, 0], [17.4, 0]],
  ramps: [12.3],
  gliders: [8.05],
  studs: [[0.8, 0, 8], [3.0, 0.4, 6], [5.2, -0.3, 6], [7.0, 0.3, 6], [11.6, 0, 8], [14.9, 0.6, 6], [14.9, -0.6, 6], [16.9, 0, 6]],
  theme: {
    sky: [0xff9ad8, 0xffe4f4, 0xffc0e0], fog: [0xffe4f4, 220, 1100], sun: { color: 0xfff0f8, intensity: 2.5, dir: [0.4, 1, 0.5] },
    hemi: [0xffe8ff, 0x9a6a8a, 1.3], envIntensity: 0.9,
    ground: 0x9ae07a, groundPitch: 1.6, shoulder: 0xc8f0a0, dust: 0xffffff,
    surfaces: { candy: { base: '#ff8ac8', line: '#ffffff', seams: 'rgba(255,255,255,0.35)', dashed: true, rough: 0.3 }, cookie: { base: '#c8904a', line: null, seams: 'rgba(90,50,20,0.5)' } },
    wall: [C.pink, C.white, C.lavender], curb: [C.red, C.white], gate: [C.pink, C.white], fence: [C.white, C.red, C.white],
    support: 'bank', skirt: ['#f8e0c0', '#ff8ac8'], skirtColor: C.pink, rampSide: C.pink, ramp: 0xff4aa8,
    music: { bpm: 132, root: 65, scale: 'major', style: 'jingle' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    const inGlide = (i) => inRange(tr, i, 8.0, 10.2);
    // chocolate lake + river
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = '#000'; strokeTrack(g, tr, toPx, sc, 34, inGlide); disc(g, toPx, sc, -40, 200, 75);
      g.strokeStyle = '#000'; g.lineWidth = 16 * sc; g.beginPath(); const [a, bb] = toPx(-40, 200), [c1, c2] = toPx(-300, 400); g.moveTo(a, bb); g.lineTo(c1, c2); g.stroke();
    });
    ctx.cutGround(hole);
    const choc = ctx.makeMask(1600, 1024, (g, toPx, sc) => {
      g.fillStyle = '#fff'; strokeTrack(g, tr, toPx, sc, 38, inGlide); disc(g, toPx, sc, -40, 200, 79);
      g.strokeStyle = '#fff'; g.lineWidth = 20 * sc; g.beginPath(); const [a, bb] = toPx(-40, 200), [c1, c2] = toPx(-300, 400); g.moveTo(a, bb); g.lineTo(c1, c2); g.stroke();
    });
    liquid(ctx, choc, 0x5a2a12, -1.8, { opacity: 1, size: 1600, rough: 0.2, speed: 0.02 });
    // pink sugar patches
    const sugar = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; for (const [x, z, r] of [[100, -60, 60], [-150, -40, 70], [-160, 180, 50], [180, 200, 40]]) disc(g, toPx, sc, x, z, r); });
    scene.add(groundPlane(0xffc0e0, -0.05, 1600, 1.6, { mask: sugar }));
    // cake mountain layers under the climb (skirts do the sides) + candles on top
    const top = tr.at(tr.kToIndex(8.0), 0, 0);
    for (let k = 0; k < 6; k++) b.cyl(top.x + 20, 0, top.z - 40, 70 - k * 9, 4.5 * (k + 1), k % 2 ? 0xffd0e8 : 0xf8e0c0, { seg: 32 });
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const x = top.x + 20 + Math.cos(a) * 20, z = top.z - 40 + Math.sin(a) * 20; b.cyl(x, 27, z, 1, 7, k % 2 ? C.azure : C.yellow, { seg: 10 }); b.cone(x, 34, z, 0.7, 1.8, C.orange, { seg: 8, matOpts: { emissive: 0xff8a00, emissiveIntensity: 2 } }); }
    ctx.claim(top.x + 20, top.z - 40, 72);
    // gumballs rolling down the climb (toward the racers)
    const gcols = [0xff3a5a, 0x3ab0ff, 0xffe03a, 0x5ae05a, 0xb05aff, 0xff8a1a];
    gcols.forEach((c, n) => ctx.hazard(trackMover(ctx, { mesh: gumball(c), from: 3.9, to: 7.95, reverse: true, oneWay: true, lat: [-0.5, 0.2, 0.55, -0.2, 0.4, -0.55][n], speed: 16, radius: 2.6, kind: 'spin', roll: 2.6, offset: n / gcols.length })));
    // lollipop forest, candy canes, gumdrops and ice creams
    const lcols = [C.pink, C.red, C.azure, C.lime, C.orange, C.purple, C.yellow];
    ctx.scatter(90, { minC: 2, maxC: 110, r: 4, pad: 180, test: (x, z) => hole.test(x, z) }, (x, z) => {
      const r = rand();
      if (r < 0.4) lollipop(b, x, z, 0.9 + rand() * 0.8, pick(rand, lcols));
      else if (r < 0.6) candyCane(b, x, z, 1 + rand() * 0.6, rand() * 6);
      else if (r < 0.85) gumdrop(b, x, z, 1 + rand() * 1.5, pick(rand, lcols));
      else iceCream(b, x, z, 1 + rand() * 0.5, [pick(rand, [C.pink, C.white, C.yellow]), pick(rand, [C.rbrown, C.lime, C.azure]), C.pink]);
    });
    edges(ctx, 0, 3.2, 16, 1, (p) => { if (rand() < 0.8) lollipop(b, p.x, p.z, 1 + rand() * 0.5, pick(rand, lcols)); });
    edges(ctx, 10.2, 12.4, 12, 1, (p, i, sd) => candyCane(b, p.x, p.z, 1.1, sd > 0 ? 0 : Math.PI));
    // cupcakes splitting the wide section
    for (const [k, lat] of [[14.75, -0.35], [15.2, 0.35]]) {
      const i = tr.kToIndex(k), p = tr.at(i, lat * tr.HW[i], 0);
      cupcake(b, p.x, p.z, 1.3, pick(rand, [C.pink, C.azure, C.white]));
      ctx.obstacle(p.x, p.z, 4.2, 9);
    }
    // donut arches over the road
    for (const k of [1.2, 11.0, 16.2]) {
      const i = tr.kToIndex(k), p = tr.at(i, 0, 0);
      const d = donut(ctx, p.x, p.y + 4, p.z, (tr.HW[i] + 4) / 3.2, pick(rand, [C.pink, C.white, 0x7a3a1a]), 0);
      d.rotation.y = tr.yawAt(i);
      d.scale.z = 0.35;
      d.position.y = p.y - 1;
    }
    // giant donuts lying in the grass
    ctx.scatter(8, { minC: 10, maxC: 90, r: 8, test: (x, z) => hole.test(x, z) }, (x, z) => donut(ctx, x, 1.4, z, 1.6, pick(rand, [C.pink, C.white, C.azure])));
    // milk river under the cookie bridge
    each(tr, 12.6, 13.3, 5, (i) => { const p = tr.at(i, 0, 0); b.box(p.x, -0.5, p.z, 60, 0.5, 6, C.white, { rot: tr.yawAt(i) }); });
    // gummy crowd at the start
    for (let i = tr.N - 70; i < tr.N - 6; i += 3) for (const sd of [-1, 1]) {
      const p = tr.at(i, (tr.HW[tr.wrap(i)] + tr.SH[tr.wrap(i)] + 3 + rand() * 4) * sd, 0);
      const c = pick(rand, [0xff3a5a, 0x3ab0ff, 0xffe03a, 0x5ae05a, 0xff8a1a]);
      b.sphere(p.x, 1.4, p.z, 1.1, c, { sy: 1.3, matOpts: { trans: true, opacity: 0.85, rough: 0.2 } });
      b.sphere(p.x, 3.1, p.z, 0.8, c, { matOpts: { trans: true, opacity: 0.85, rough: 0.2 } });
    }
    arch(ctx, 8.0, { cols: [C.pink, C.white], text: 'GLIDE!', bg: '#ff4aa8' });
    arch(ctx, 4.0, { cols: [C.azure, C.white], text: 'CAKE MOUNTAIN', bg: '#36aebf' });
    // cotton candy clouds
    for (let k = 0; k < 22; k++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(8 + rand() * 8, 12, 8), new THREE.MeshStandardMaterial({ color: pick(rand, [0xffc0e8, 0xc0e8ff, 0xffffff]), roughness: 1 }));
      c.position.set(bounds.cx + (rand() - 0.5) * 1100, 90 + rand() * 60, bounds.cz + (rand() - 0.5) * 1100);
      c.scale.y = 0.6;
      scene.add(c);
    }
    void cloud; void built;
  },
};
