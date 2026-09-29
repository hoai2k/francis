// Jungle Ruins: dirt tracks through the jungle, boulders rolling down the
// temple steps, crushers inside the temple, a rope bridge and a waterfall glide.
import { THREE, C, groundPlane, pick, jungleTree, fern, temple, stoneHead, rock, trackMover, crusher, tunnel, liquid, disc, strokeTrack, inRange, edges, arch, each, canvasTexture } from './kit.js';

function boulder() {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.DodecahedronGeometry(3, 0), new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.9, flatShading: true }));
  s.position.y = 3; s.castShadow = true;
  g.add(s); g.userData.spin = s;
  return g;
}

export default {
  id: 'jungle', name: 'Jungle Ruins', subtitle: 'Crushers in the temple, a rope bridge and a waterfall glide',
  cup: 'brick', seed: 51, width: 26, shoulder: 12, edge: 'open', surface: 'dirt', start: 0.5,
  points: [[-240, -144, 0], [-96, -204, 0], [60, -192, 4], [180, -228, 10], [300, -168, 16], [324, -48, 20], [252, 48, 24], [144, 84, 24], [48, 48, 24], [-48, 72, 24], [-132, 132, 24], [-180, 216, 12], [-228, 300, 2], [-336, 312, 0], [-396, 192, 0], [-360, 48, 0], [-336, -72, 0]],
  sections: [
    { from: 2.5, to: 10.15, edge: 'fence', shoulder: 5, support: 'bank' },
    { from: 6.2, to: 7.7, edge: 'wall', shoulder: 2 },
    { from: 8.3, to: 9.6, surface: 'wood', edge: 'void', shoulder: 0, support: 'pillar', width: 20 },
    { from: 10.2, to: 11.85, gap: true },
    { from: 13.9, to: 14.5, surface: 'water' },
    { from: 15.3, to: 16.1, width: 42 },
  ],
  items: [1.4, 4.4, 7.9, 12.4, 15.0],
  boosts: [[3.0, 0], [5.3, 0], [9.9, 0], [13.3, 0.3], [16.4, -0.3]],
  ramps: [13.1],
  gliders: [10.1],
  studs: [[0.8, 0.3, 8], [2.4, -0.3, 6], [5.6, 0, 6], [8.6, 0, 8], [12.1, 0, 6], [14.2, 0, 6], [15.7, 0.6, 5], [15.7, -0.6, 5]],
  theme: {
    sky: [0x5aa0d8, 0xd8f0d0, 0x6a9a5a], fog: [0xc8e8c0, 150, 850], sun: { color: 0xfff0c8, intensity: 2.4, dir: [0.3, 1, 0.5] },
    hemi: [0xe8ffe0, 0x3a5a2a, 1.25], envIntensity: 0.7,
    ground: 0x2f7a2a, groundPitch: 1.6, shoulder: 0x3f8a2f, dust: 0x8a6a3a,
    surfaces: { dirt: { base: '#9a7a4a', line: null, seams: 'rgba(60,40,20,0.3)' } },
    wall: [C.dkstone, C.sand], curb: [C.dktan, C.sand], gate: [C.sand, C.dkgreen], fence: [C.rbrown, C.green],
    support: 'bank', skirt: ['#8a8a6a', '#5a5a4a'], skirtColor: C.dkstone, rampSide: C.rbrown, ramp: C.rbrown,
    particles: 'fireflies', noAIDrift: false,
    music: { bpm: 128, root: 57, scale: 'dorian', style: 'rock' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    const inGlide = (i) => inRange(tr, i, 10.0, 12.0);
    const onBridge = (i) => inRange(tr, i, 8.2, 9.7);
    // river gorge: under the rope bridge, down the waterfall and through the ford
    const pts = [tr.at(tr.kToIndex(8.95), 0, 0), tr.at(tr.kToIndex(10.9), 0, 0), tr.at(tr.kToIndex(14.2), 0, 0), new THREE.Vector3(-560, 0, 150)];
    const drawRiver = (g, toPx, sc, w) => { g.lineWidth = w * sc; g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, n) => { const [x, y] = toPx(p.x, p.z); if (n) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); };
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.strokeStyle = '#000'; drawRiver(g, toPx, sc, 40); g.fillStyle = '#000'; strokeTrack(g, tr, toPx, sc, 20, (i) => inGlide(i) || onBridge(i));
    });
    ctx.cutGround(hole);
    const water = ctx.makeMask(1800, 1024, (g, toPx, sc) => { g.strokeStyle = '#fff'; drawRiver(g, toPx, sc, 44); g.fillStyle = '#fff'; strokeTrack(g, tr, toPx, sc, 24, (i) => inGlide(i) || onBridge(i)); });
    liquid(ctx, water, 0x3a9ac8, -4, { size: 1800, speed: 0.25 });
    // waterfall off the plateau
    const wi = tr.kToIndex(10.3), wp = tr.at(wi, 0, 0);
    for (const off of [-14, 14]) {
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(12, 28), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.8, emissive: 0x3a7aaa, emissiveIntensity: 0.4, side: THREE.DoubleSide, map: canvasTexture(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? '#ffffff' : '#bfe8ff'; g.fillRect(0, y, w, 8); } }) }));
      fall.material.map.wrapS = fall.material.map.wrapT = THREE.RepeatWrapping;
      fall.position.set(wp.x + tr.R[wi * 2] * off, 10, wp.z + tr.R[wi * 2 + 1] * off); fall.rotation.y = tr.yawAt(wi);
      scene.add(fall);
      ctx.anim((dt, t) => { fall.material.map.offset.y = t * 1.8; });
    }
    // temple over the tunnel with crushers inside
    const ti = tr.kToIndex(6.95);
    // push the pyramid out until it clears every part of the road
    let off = 40, tx = 0, tz = 0;
    for (; off < 160; off += 4) { tx = tr.px(ti) - tr.R[ti * 2] * off; tz = tr.pz(ti) - tr.R[ti * 2 + 1] * off; if (tr.clearance(tx, tz, 60) > 34) break; }
    temple(b, tx, tz, 50, 7);
    ctx.claim(tx, tz, 36);
    tunnel(ctx, 6.25, 7.65, { wall: C.sand, roof: C.dktan, height: 11, lights: 0xff9a3a });
    [[6.55, -0.4], [6.8, 0.4], [7.1, -0.2], [7.35, 0.45]].forEach(([k, l], n) => ctx.hazard(crusher(ctx, { i: tr.kToIndex(k), lat: l * 13, period: 3.2, offset: n * 0.8, size: 7, color: C.dkstone })));
    // boulders rolling down the temple steps toward the racers
    for (let n = 0; n < 5; n++) ctx.hazard(trackMover(ctx, { mesh: boulder(), from: 2.6, to: 6.1, reverse: true, oneWay: true, lat: [-0.5, 0.3, 0.6, -0.1, -0.6][n], speed: 18, radius: 3, kind: 'wreck', roll: 3, offset: n / 5 }));
    // rope bridge posts and ropes
    each(tr, 8.3, 9.6, 6, (i) => {
      for (const sd of [-1, 1]) {
        const p = tr.at(i, (tr.HW[i] + 0.6) * sd, 0);
        b.box(p.x, p.y - 0.5, p.z, 0.6, 3, 0.6, C.rbrown);
        b.box(p.x, p.y + 2.2, p.z, 0.25, 0.25, 6.2, C.tan, { rot: tr.yawAt(i) });
      }
    });
    // jungle
    edges(ctx, 0, 16.9, 10, 2, (p, i) => { if (tr.EDGE[i] === 2 && hole.test(p.x, p.z) && rand() < 0.85) jungleTree(b, p.x, p.z, 1 + rand() * 0.5, rand); });
    ctx.scatter(170, { minC: 2, maxC: 150, r: 4, pad: 220, test: (x, z) => hole.test(x, z) }, (x, z) => (rand() < 0.65 ? jungleTree(b, x, z, 1 + rand() * 0.8, rand) : fern(b, x, z, 1.5 + rand(), rand)));
    ctx.scatter(30, { minC: 3, maxC: 90, r: 5, test: (x, z) => hole.test(x, z) }, (x, z) => rand() < 0.5 ? rock(b, x, 0, z, 1.6, rand, [C.dkstone, C.sand, C.dkgreen]) : b.box(x, 0, z, 3, 8 + rand() * 8, 3, C.sand, { rot: rand() * 3 }));
    // stone heads splitting the wide section, more heads watching the road
    for (const [k, lat] of [[15.45, -0.3], [15.9, 0.35]]) {
      const i = tr.kToIndex(k), p = tr.at(i, lat * tr.HW[i], 0);
      stoneHead(b, p.x, p.z, 0.8, tr.yawAt(i) + Math.PI);
      ctx.obstacle(p.x, p.z, 3.4, 9);
    }
    edges(ctx, 0.3, 2.3, 30, 4, (p, i, sd) => stoneHead(b, p.x, p.z, 1.3, tr.yawAt(i) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2)));
    arch(ctx, 10.05, { cols: [C.sand, C.dkgreen], text: 'GLIDE!', bg: '#237841' });
    arch(ctx, 6.1, { cols: [C.sand, C.dktan], text: 'TEMPLE', bg: '#958a73' });
    // birds
    const birds = [];
    for (let n = 0; n < 8; n++) {
      const bird = new THREE.Group();
      const c = pick(rand, [C.red, C.blue, C.yellow, C.green]);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 2), new THREE.MeshStandardMaterial({ color: c }));
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1), new THREE.MeshStandardMaterial({ color: c }));
      bird.add(body, w1);
      scene.add(bird);
      birds.push({ bird, w1, r: 60 + rand() * 200, h: 30 + rand() * 30, s: 0.2 + rand() * 0.3, o: rand() * 6 });
    }
    ctx.anim((dt, t) => birds.forEach((q) => { const a = t * q.s + q.o; q.bird.position.set(bounds.cx + Math.cos(a) * q.r, q.h + Math.sin(t * 2 + q.o) * 2, bounds.cz + Math.sin(a) * q.r); q.bird.rotation.y = -a; q.w1.rotation.z = Math.sin(t * 12 + q.o) * 0.6; }));
    void groundPlane; void disc;
  },
};
