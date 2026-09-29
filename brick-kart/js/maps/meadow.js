// Windmill Meadows: countryside with windmills, hot-air balloons, tulip
// fields and farm animals, a hill climb and a long glide across the lake.
import { THREE, C, plastic, groundPlane, tree, roundTree, cloud, pick, windmill, balloon, cowMesh, sheepMesh, flowerBed, house, hayBale, crossing, liquid, disc, strokeTrack, inRange, each, edges, arch, built, rock } from './kit.js';

export default {
  id: 'meadow', name: 'Windmill Meadows', subtitle: 'Balloons, tulips and a glide across the lake',
  cup: 'stud', seed: 21, width: 28, shoulder: 14, edge: 'open', start: 0.5,
  points: [[-220, -165, 0], [-121, -209, 0], [-11, -165, 0], [88, -220, 0], [198, -209, 2], [286, -132, 4], [275, -22, 8], [330, 66, 14], [286, 165, 24], [209, 237, 33], [132, 237, 36], [11, 226, 26], [-88, 220, 14], [-176, 209, 3], [-275, 165, 0], [-330, 77, 0], [-250, 10, 0], [-215, -60, 0], [-300, -135, 0]],
  sections: [
    { from: 5.6, to: 10.1, edge: 'fence', shoulder: 4, support: 'bank' },
    { from: 10.15, to: 12.35, gap: true },
    { from: 12.35, to: 13.2, edge: 'fence', shoulder: 5 },
    { from: 15.6, to: 16.2, surface: 'wood', edge: 'wall', shoulder: 1, support: 'pillar' },
    { from: 17.4, to: 18.2, width: 42 },
  ],
  items: [1.8, 5.2, 8.4, 13.4, 16.8],
  boosts: [[3.1, 0], [7.2, 0.4], [9.6, 0], [14.6, -0.3], [18.5, 0.3]],
  ramps: [4.3],
  gliders: [10.05],
  studs: [[0.8, 0.4, 8], [2.6, -0.4, 6], [6.2, 0, 8], [8.8, 0.3, 6], [13.8, 0, 8], [16.3, 0.5, 6], [17.8, -0.5, 6]],
  theme: {
    sky: [0x3a90f0, 0xd6f0ff, 0x9ad0a0], fog: [0xd6f0ff, 220, 1100], sun: { color: 0xfff4e0, intensity: 2.7, dir: [0.5, 1, 0.4] },
    hemi: [0xe0f0ff, 0x5a8a4a, 1.25], ground: 0x4fae3a, groundPitch: 1.6, shoulder: 0x62bf45, dust: 0x8a6a3a,
    road: { base: '#8a7a64', line: '#f4f0e0' }, wall: [C.rbrown, C.tan], curb: [C.red, C.white], gate: [C.red, C.white], fence: [C.white, C.rbrown],
    support: 'bank', skirt: ['#5aaa3a', '#3a7a2a'], skirtColor: C.green, rampSide: C.rbrown, ramp: C.yellow,
    music: { bpm: 124, root: 62, scale: 'major', style: 'jingle' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    // the lake under the glide (and a pond)
    const inGlide = (i) => inRange(tr, i, 10.0, 12.5);
    const lake = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = '#000';
      strokeTrack(g, tr, toPx, sc, 40, inGlide);
      disc(g, toPx, sc, -20, 300, 110); disc(g, toPx, sc, 60, 330, 90); disc(g, toPx, sc, -130, 320, 80);
      disc(g, toPx, sc, 40, -40, 45);
    });
    ctx.cutGround(lake);
    const water = ctx.makeMask(1600, 1024, (g, toPx, sc) => {
      g.fillStyle = '#fff';
      strokeTrack(g, tr, toPx, sc, 44, inGlide);
      disc(g, toPx, sc, -20, 300, 114); disc(g, toPx, sc, 60, 330, 94); disc(g, toPx, sc, -130, 320, 84); disc(g, toPx, sc, 40, -40, 49);
    });
    liquid(ctx, water, 0x2a8ae0, -2.2, { size: 1600 });
    // sandy shore rocks
    ctx.scatter(30, { minC: 0, maxC: 120, r: 3, pad: 200, test: (x, z) => water.test(x, z) && lake.test(x, z) }, (x, z) => rock(b, x, 0, z, 1.2, rand, [C.ltgray, C.tan]));
    // stream under the covered bridge
    const bi = tr.kToIndex(15.9);
    const bx = tr.px(bi), bz = tr.pz(bi), tx = tr.T[bi * 3], tz = tr.T[bi * 3 + 2];
    const stream = ctx.makeMask(1600, 1024, (g, toPx, sc) => {
      g.strokeStyle = '#fff'; g.lineWidth = 14 * sc;
      const [a1, a2] = toPx(bx - tz * 400, bz + tx * 400), [b1, b2] = toPx(bx + tz * 400, bz - tx * 400);
      g.beginPath(); g.moveTo(a1, a2); g.lineTo(b1, b2); g.stroke();
    });
    ctx.cutGround((() => { const c = ctx.makeMask(3000, 2048, (g, toPx, sc) => { g.drawImage(lake, 0, 0); g.strokeStyle = '#000'; g.lineWidth = 13 * sc; const [a1, a2] = toPx(bx - tz * 400, bz + tx * 400), [b1, b2] = toPx(bx + tz * 400, bz - tx * 400); g.beginPath(); g.moveTo(a1, a2); g.lineTo(b1, b2); g.stroke(); }); return c; })());
    liquid(ctx, stream, 0x3a9ae8, -2.0, { size: 1600, speed: 0.3 });
    // covered bridge roof
    each(tr, 15.6, 16.2, 4, (i) => {
      const w = tr.HW[i] + 2;
      for (const sd of [-1, 1]) { const p = tr.at(i, w * sd, 0); b.box(p.x, p.y, p.z, 1, 8, 1, C.rbrown); }
      const c = tr.at(i, 0, 0);
      b.boxM(new THREE.Matrix4().compose(new THREE.Vector3(c.x, c.y + 9, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, tr.yawAt(i) + Math.PI / 2, 0.45, 'YXZ')), new THREE.Vector3(w * 1.2, 0.6, 4.4)), C.red);
      b.boxM(new THREE.Matrix4().compose(new THREE.Vector3(c.x, c.y + 9, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, tr.yawAt(i) + Math.PI / 2, -0.45, 'YXZ')), new THREE.Vector3(w * 1.2, 0.6, 4.4)), C.red);
    });
    // tulip fields in stripes
    const tulipCols = [C.red, C.yellow, C.pink, C.orange, C.purple, C.white];
    const fields = [[-60, -80], [150, -80], [-150, 80], [110, 60], [-330, -40]];
    fields.forEach(([fx, fz], n) => {
      if (tr.clearance(fx, fz, 60) < 20) return;
      ctx.claim(fx, fz, 30);
      for (let r = 0; r < 9; r++) flowerBed(b, fx - 24 + r * 6, fz, 22, tulipCols[(r + n) % tulipCols.length], Math.PI / 2);
    });
    // windmills and farm houses
    const mills = [[-160, -110], [60, -110], [200, -90], [-300, 20], [230, 20], [-80, -250], [150, -270], [-380, 150]];
    for (const [x, z] of mills) if (tr.clearance(x, z, 40) > 10 && ctx.free(x, z, 8)) windmill(ctx, x, z, 1.1 + rand() * 0.3, rand() * 6);
    const hcols = [C.orange, C.white, C.tan, C.red, C.dkblue];
    ctx.scatter(16, { minC: 6, maxC: 70, r: 8, test: (x, z) => lake.test(x, z) && stream.test(x, z) === false }, (x, z) => house(b, x, z, 8, 7, 5 + rand() * 3, pick(rand, hcols), pick(rand, [C.red, C.dkgray, C.rbrown]), rand() * 6));
    // trees at the edge of the open grass, hay bales, animals grazing
    edges(ctx, 0, 18.9, 11, 1.5, (p, i) => { if (!tr.GAP[i] && tr.EDGE[i] === 2 && rand() < 0.7 && lake.test(p.x, p.z)) (rand() < 0.5 ? roundTree : tree)(b, p.x, 0, p.z, 0.9 + rand() * 0.6, rand() < 0.3 ? C.lime : C.green); });
    ctx.scatter(70, { minC: 3, maxC: 140, r: 3, pad: 220, test: (x, z) => lake.test(x, z) }, (x, z) => (rand() < 0.5 ? roundTree : tree)(b, x, 0, z, 1 + rand() * 0.6));
    edges(ctx, 0.3, 18.9, 43, -7, (p, i) => { if (tr.EDGE[i] === 2 && rand() < 0.6) { hayBale(b, p.x, p.z, rand() * 3); ctx.obstacle(p.x, p.z, 1.6, 2.4); } });
    for (let n = 0; n < 14; n++) {
      const m = rand() < 0.5 ? cowMesh() : sheepMesh();
      let x, z;
      for (let t = 0; t < 40; t++) { x = bounds.cx + (rand() - 0.5) * 700; z = bounds.cz + (rand() - 0.5) * 700; if (tr.clearance(x, z, 30) > 6 && lake.test(x, z)) break; }
      m.position.set(x, 0, z); m.rotation.y = rand() * 6; scene.add(m);
    }
    // animals wandering across the road
    ctx.hazard(crossing(ctx, { mesh: sheepMesh(), k: 2.3, speed: 4, kind: 'spin' }));
    ctx.hazard(crossing(ctx, { mesh: sheepMesh(), k: 2.45, speed: 5, kind: 'spin', offset: 0.5 }));
    ctx.hazard(crossing(ctx, { mesh: cowMesh(), k: 14.0, speed: 3.5, kind: 'bump', radius: 2.4 }));
    ctx.hazard(crossing(ctx, { mesh: sheepMesh(), k: 17.0, speed: 4.5, kind: 'spin', offset: 0.3 }));
    // big oak splitting the wide road
    const oi = tr.kToIndex(17.8), op = tr.at(oi, 0, 0);
    roundTree(b, op.x, op.y, op.z, 2.2); b.cyl(op.x, op.y, op.z, 3, 0.8, C.dkgray, { seg: 16 });
    ctx.obstacle(op.x, op.z, 3, 12);
    // hot-air balloons
    const bcols = [[C.red, C.white], [C.blue, C.white], [C.yellow, C.red], [C.green, C.yellow], [C.purple, C.pink], [C.orange, C.blue], [C.azure, C.white], [C.red, C.yellow]];
    bcols.forEach((cc, n) => {
      const a = n / bcols.length * Math.PI * 2;
      const r = n % 2 ? 150 : 250;
      balloon(ctx, bounds.cx + Math.cos(a) * r, 45 + rand() * 50, bounds.cz + Math.sin(a) * r, 1 + rand() * 0.5, cc);
    });
    balloon(ctx, 60, 30, 230, 1.3, [C.red, C.white]); // over the glide
    arch(ctx, 10.2, { cols: [C.azure, C.white], text: 'GLIDE!', bg: '#1a8cff' });
    arch(ctx, 3.8, { cols: [C.red, C.yellow], text: 'TULIP TOWN', bg: '#c91a09', fg: '#f2cd37' });
    for (let k = 0; k < 20; k++) cloud(ctx.bNoShadow, bounds.cx + (rand() - 0.5) * 1100, 110 + rand() * 60, bounds.cz + (rand() - 0.5) * 1100, 2.5, rand);
    void plastic; void groundPlane; void built;
  },
};
