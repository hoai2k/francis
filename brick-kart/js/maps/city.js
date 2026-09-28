// Brick City Circuit: a big figure-8 through downtown with an overpass,
// traffic, a canal jump, a fountain splitting the road and a tunnel.
import { THREE, BrickBuilder, C, plastic, groundPlane, building, roundTree, tree, lamp, grandstand, billboard, cloud, canvasTexture, pick, trackMover, tunnel, arch, liquid, disc, each, edges, built } from './kit.js';

function carMesh(body, top = C.white) {
  return built((b) => {
    b.box(0, 0.5, 0, 2.6, 1.3, 5, body);
    b.box(0, 1.8, -0.3, 2.3, 1.1, 2.6, top);
    b.box(0, 1.9, 1.0, 2.1, 0.8, 0.1, C.azure, { matOpts: { trans: true, opacity: 0.6 } });
    for (const [x, z] of [[1.2, 1.6], [-1.2, 1.6], [1.2, -1.6], [-1.2, -1.6]]) b.cyl(x, 0, z, 0.55, 0.5, C.black, { seg: 10 });
    b.box(0.8, 0.8, 2.52, 0.5, 0.35, 0.05, C.yellow, { matOpts: { emissive: 0xfff0a0, emissiveIntensity: 1.5 } });
    b.box(-0.8, 0.8, 2.52, 0.5, 0.35, 0.05, C.yellow, { matOpts: { emissive: 0xfff0a0, emissiveIntensity: 1.5 } });
  }, 'car');
}
function busMesh() {
  return built((b) => {
    b.box(0, 0.6, 0, 3, 3.4, 10, C.yellow);
    b.box(0, 2.2, 0, 3.05, 1.1, 9.2, C.azure, { matOpts: { trans: true, opacity: 0.6 } });
    b.box(0, 4.0, 0, 2.6, 0.3, 9, C.white);
    for (const z of [3.4, -3.4]) for (const x of [1.4, -1.4]) b.cyl(x, 0, z, 0.7, 0.6, C.black, { seg: 10 });
  }, 'bus');
}

export default {
  id: 'city', name: 'Brick City Circuit', subtitle: 'Dodge the traffic, jump the canal, fly over the overpass',
  cup: 'stud', seed: 11, width: 28, shoulder: 5, edge: 'wall', start: 0.4,
  points: [[-150, -150, 0], [-60, -60, 0], [60, 60, 0], [150, 150, 0], [240, 185, 2], [310, 110, 5], [275, 30, 8], [320, -60, 11], [250, -165, 15], [150, -150, 16], [60, -60, 16], [-60, 60, 16], [-150, 150, 16], [-240, 185, 14], [-310, 110, 10], [-270, 20, 6], [-320, -70, 3], [-250, -170, 1]],
  sections: [
    { from: 2.62, to: 2.72, gap: true },
    { from: 5.25, to: 6.15, width: 44, edge: 'fence' },
    { from: 8.6, to: 12.4, edge: 'wall', shoulder: 2 },
  ],
  items: [1.25, 4.5, 7.4, 10.3, 13.2, 16.3],
  boosts: [[0.9, 0], [3.5, 0.5], [6.7, -0.4], [11.0, 0], [14.0, -0.4], [17.2, 0.4]],
  ramps: [2.57],
  studs: [[0.6, -0.5, 8], [3.2, 0.4, 6], [5.4, 0.6, 6], [5.4, -0.6, 6], [9.3, 0, 10], [12.6, -0.4, 6], [15.0, 0.4, 6], [17.4, 0, 6]],
  theme: {
    sky: [0x3f8fe0, 0xcfe8ff, 0x9ab0c0], fog: [0xcfe8ff, 180, 950], sun: { color: 0xfff1d8, intensity: 2.6, dir: [0.6, 1, 0.3] },
    hemi: [0xdfefff, 0x6a7a6a, 1.2], ground: 0x8d9397, groundPitch: 1.6, shoulder: 0x9aa0a4,
    road: { base: '#55595c', line: '#f4f4f4' }, wall: [C.red, C.white], curb: [C.red, C.white], gate: [C.red, C.white], fence: [C.dkgray, C.yellow],
    support: 'pillar', pillar: C.ltgray, pillar2: C.white, skirt: ['#a0a5a9', '#7c8084'], skirtColor: C.ltgray,
    music: { bpm: 136, root: 60, scale: 'major', style: 'pop' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    // canal under the jump (hole in the pavement + water)
    const ci = tr.kToIndex(2.67);
    const cx = tr.px(ci), cz = tr.pz(ci), rx = tr.R[ci * 2], rz = tr.R[ci * 2 + 1];
    const canal = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.strokeStyle = '#000'; g.lineWidth = 22 * sc; g.lineCap = 'butt';
      const [a1, a2] = toPx(cx - rx * 600, cz - rz * 600), [b1, b2] = toPx(cx + rx * 600, cz + rz * 600);
      g.beginPath(); g.moveTo(a1, a2); g.lineTo(b1, b2); g.stroke();
    });
    ctx.cutGround(canal);
    const water = ctx.makeMask(1400, 1024, (g, toPx, sc) => {
      g.strokeStyle = '#fff'; g.lineWidth = 24 * sc;
      const [a1, a2] = toPx(cx - rx * 600, cz - rz * 600), [b1, b2] = toPx(cx + rx * 600, cz + rz * 600);
      g.beginPath(); g.moveTo(a1, a2); g.lineTo(b1, b2); g.stroke();
    });
    liquid(ctx, water, 0x2a7ad0, -2.5, { size: 1400 });
    for (const sd of [-1, 1]) for (let t = -520; t < 520; t += 40) {
      const x = cx + rx * t + tr.T[ci * 3] * sd * 12, z = cz + rz * t + tr.T[ci * 3 + 2] * sd * 12;
      if (tr.clearance(x, z, 8) < 2) continue;
      b.box(x, -0.3, z, 3, 1.4, 3, C.ltgray);
    }
    // little boats on the canal
    for (let n = 0; n < 3; n++) {
      const boat = built((bb) => { bb.box(0, 0, 0, 3, 1.2, 7, [C.red, C.blue, C.white][n]); bb.box(0, 1.2, -1, 2, 1.4, 2.4, C.white); }, 'boat');
      scene.add(boat);
      const off = rand() * 1000;
      ctx.anim((dt, t) => { const s = ((t * 12 + off) % 1000) - 500; boat.position.set(cx + rx * s, -2.3, cz + rz * s); boat.rotation.y = Math.atan2(rx, rz); });
    }
    // parks in each lobe with fountains
    const parkMask = ctx.makeMask(1600, 512, (g, toPx, sc) => {
      g.fillStyle = '#fff';
      for (const [x, z, r] of [[225, 20, 55], [-235, 20, 55], [0, -190, 36], [0, 190, 36]]) disc(g, toPx, sc, x, z, r);
    });
    scene.add(groundPlane(C.green, tr.groundY - 0.04, 1600, 1.6, { mask: parkMask }));
    const fountain = (x, z, s = 1) => {
      let y = b.cyl(x, 0, z, 7 * s, 0.9, C.ltgray, { seg: 24 });
      b.cyl(x, y - 0.3, z, 6.2 * s, 0.4, C.azure, { seg: 24, matOpts: { trans: true, opacity: 0.7, rough: 0.05 } });
      y = b.cyl(x, y, z, 1.1 * s, 3.2 * s, C.ltgray);
      b.cyl(x, y, z, 2.6 * s, 0.5, C.ltgray);
      b.sphere(x, y + 1.3, z, 1 * s, C.azure, { matOpts: { trans: true, opacity: 0.6 } });
    };
    fountain(225, 20); fountain(-235, 20);
    // fountain in the middle of the widened road (splits the lanes)
    const fi = tr.kToIndex(5.7), fp = tr.at(fi, 0, 0);
    fountain(fp.x, fp.z, 0.75);
    ctx.obstacle(fp.x, fp.z, 5.4);
    ctx.scatter(90, { minC: 2, maxC: 60, r: 3, test: (x, z) => parkMask.test(x, z) }, (x, z) => (rand() < 0.5 ? roundTree : tree)(b, x, 0, z, 0.9 + rand() * 0.5, rand() < 0.3 ? C.lime : C.green));
    // skyscrapers
    const cols = [C.white, C.tan, C.sand, C.red, C.blue, C.yellow, C.dkgray, C.azure, C.ltgray, C.mdblue, C.orange];
    for (let x = bounds.minX - 220; x < bounds.maxX + 220; x += 30) {
      for (let z = bounds.minZ - 220; z < bounds.maxZ + 220; z += 30) {
        const bx = x + (rand() - 0.5) * 8, bz = z + (rand() - 0.5) * 8;
        const w = 14 + Math.floor(rand() * 6) * 2, d = 14 + Math.floor(rand() * 6) * 2;
        const r = Math.max(w, d) * 0.72;
        const c = tr.clearance(bx, bz, 140);
        if (c < r + 3 || c > 130 || parkMask.test(bx, bz) || !canal.test(bx, bz) || !ctx.free(bx, bz, r)) continue;
        ctx.claim(bx, bz, r);
        const floors = 3 + Math.floor(rand() * 3 + c * 0.06 + rand() * rand() * 12);
        building(b, bx, bz, w, d, floors, pick(rand, cols), rand, { trim: pick(rand, [C.white, C.dkgray, C.yellow]) });
      }
    }
    // tunnel through a skyscraper on the west lobe
    tunnel(ctx, 14.35, 15.3, { wall: C.tan, roof: C.white, height: 9 });
    each(tr, 14.4, 15.25, 6, (i) => { const p = tr.at(i, 0, 0); b.box(p.x, p.y + 10.6, p.z, 2 * (tr.HW[i] + 8), 30, 7, C.mdblue, { rot: tr.yawAt(i) }); });
    // street furniture right next to the road
    edges(ctx, 0, 17.9, 26, 2.6, (p, i) => { if (tr.py(i) < 0.6) lamp(b, p.x, p.y, p.z); });
    edges(ctx, 0.2, 2.4, 9, 7, (p, i, sd) => { // cafe umbrellas along the start straight
      if (sd < 0) return;
      b.cyl(p.x, 0, p.z, 0.12, 3.2, C.white, { seg: 6 }); b.cone(p.x, 3.2, p.z, 2.2, 0.9, pick(rand, [C.red, C.blue, C.yellow, C.green]), { seg: 8 });
      b.cyl(p.x + 1, 0, p.z, 0.8, 1.1, C.white, { seg: 10 });
    });
    grandstand(b, tr, tr.N - 75, 68, -1, rand);
    grandstand(b, tr, tr.N - 75, 68, 1, rand);
    arch(ctx, 9.8, { cols: [C.blue, C.white], text: 'OVERPASS', bg: '#0055bf' });
    arch(ctx, 16.9, { cols: [C.yellow, C.black], text: 'DOWNTOWN', bg: '#1b2a34', fg: '#f2cd37' });
    const signs = [['BRICK KART', '#c91a09', '#f2cd37'], ['STUDS = SPEED', '#0055bf', '#ffffff'], ['BUILD IT FAST', '#f2cd37', '#1b2a34'], ['2x4 PIZZA', '#237841', '#f4f4f4'], ['CLICK!', '#81007b', '#f2cd37'], ['PLATE CAFE', '#fe8a18', '#fff']];
    let si = 0;
    for (const k of [1.9, 4.1, 7.8, 11.6, 13.8, 16.4]) {
      const i = tr.kToIndex(k);
      const side = si % 2 ? 1 : -1;
      const p = tr.at(i, (tr.HW[i] + tr.SH[i] + 7) * side, 0);
      const [t, bg, fg] = signs[si++ % signs.length];
      billboard(ctx.group, b, p.x, Math.max(0, tr.py(i) - 2), p.z, tr.yawAt(i) + (side > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI / 2, t, bg, fg);
    }
    for (let k = 0; k < 18; k++) cloud(ctx.bNoShadow, bounds.cx + (rand() - 0.5) * 1000, 100 + rand() * 60, bounds.cz + (rand() - 0.5) * 1000, 2 + rand() * 2, rand);
    // blimp
    const bl = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshStandardMaterial({ color: C.yellow, roughness: 0.4, map: canvasTexture(512, 256, (g, w, h) => { g.fillStyle = '#f2cd37'; g.fillRect(0, 0, w, h); g.fillStyle = '#c91a09'; g.fillRect(0, h * 0.38, w, h * 0.24); g.fillStyle = '#fff'; g.font = '900 44px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('BRICK KART', w * 0.25, h * 0.55); g.fillText('BRICK KART', w * 0.75, h * 0.55); }) }));
    env.scale.set(10, 10, 28); bl.add(env);
    bl.add(built((f) => { f.box(0, -2, -24, 0.6, 10, 5, C.red); f.box(0, 3, -24, 10, 0.6, 5, C.red); f.box(0, -12, 0, 3, 2.5, 8, C.white); }));
    ctx.group.add(bl);
    ctx.anim((dt, t) => { const a = t * 0.04; bl.position.set(bounds.cx + Math.cos(a) * 320, 90, bounds.cz + Math.sin(a) * 320); bl.rotation.y = -a; });
    // traffic driving the course
    const cars = [[C.red, 0.3], [C.blue, -0.3], [C.white, 0.35], [C.green, -0.35], [C.orange, 0.3]];
    cars.forEach(([col, lat], n) => ctx.hazard(trackMover(ctx, { mesh: carMesh(col), from: 0, lat, speed: 17 + n, radius: 2.2, kind: 'bump', offset: n / 6 + 0.08 })));
    ctx.hazard(trackMover(ctx, { mesh: busMesh(), from: 0, lat: -0.25, speed: 14, radius: 3.2, kind: 'bump', offset: 0.55 }));
    // traffic lights at the start
    for (const sd of [-1, 1]) {
      const p = tr.at(tr.N - 30, (tr.HW[0] + tr.SH[0] + 2) * sd, 0);
      b.box(p.x, 0, p.z, 0.5, 7, 0.5, C.black);
      b.box(p.x, 7, p.z, 1.2, 3, 1.2, C.black);
      ['#ff2020', '#ffd020', '#20ff40'].forEach((c, n) => b.sphere(p.x, 9.4 - n * 0.9, p.z, 0.35, parseInt(c.slice(1), 16), { matOpts: { emissive: parseInt(c.slice(1), 16), emissiveIntensity: 1.2 } }));
    }
    void plastic; void BrickBuilder;
  },
};
