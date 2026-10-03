// Toy Factory: a brick-making plant. Conveyor belts push you along, stampers
// slam down, wrecking arms spin over the hairpins and forklifts cross the road.
import { THREE, C, plastic, groundPlane, pick, gear, smokestack, crate, robotArm, crusher, spinner, crossing, tunnel, disc, edges, arch, built, each, canvasTexture } from './kit.js';

function forklift() {
  return built((b) => {
    b.box(0, 0.6, 0, 2.6, 1.6, 3.6, C.yellow); b.box(0, 2.2, -0.6, 2.2, 1.8, 1.6, C.yellow);
    b.box(0, 2.2, 0.4, 2.1, 1.6, 0.1, C.azure, { matOpts: { trans: true, opacity: 0.5 } });
    for (const sd of [-1, 1]) { b.box(sd * 0.9, 0, 2.2, 0.3, 4.2, 0.3, C.dkgray); b.box(sd * 0.6, 0.6, 3.2, 0.4, 0.2, 2.2, C.dkgray); }
    b.box(0, 1, 3.4, 2.4, 1.6, 1.6, C.red);
    for (const [x, z] of [[1.3, 1], [-1.3, 1], [1.3, -1.2], [-1.3, -1.2]]) b.cyl(x, 0, z, 0.55, 0.5, C.black, { seg: 10 });
  }, 'forklift');
}

export default {
  id: 'factory', name: 'Toy Factory', subtitle: 'Conveyor belts, stampers and wrecking arms',
  cup: 'galaxy', seed: 61, width: 26, shoulder: 3, edge: 'wall', surface: 'metal', start: 0.5,
  points: [[-220, -160, 0], [-60, -170, 0], [80, -150, 0], [200, -170, 0], [260, -90, 0], [180, -40, 4], [60, -60, 8], [-60, -30, 12], [-80, 40, 14], [40, 60, 14], [170, 40, 12], [260, 90, 8], [250, 190, 4], [120, 210, 0], [-40, 190, 0], [-180, 200, 0], [-270, 120, 0], [-280, -40, 0]],
  sections: [
    { from: 1.1, to: 2.4, surface: 'conveyor' },
    { from: 2.6, to: 3.35, width: 30 },
    { from: 5.2, to: 11.8, support: 'pillar' },
    { from: 9.2, to: 10.2, surface: 'conveyor' },
    { from: 12.2, to: 12.32, gap: true },
    { from: 13.2, to: 14.4, surface: 'conveyor' },
    { from: 14.5, to: 15.5, edge: 'wall', shoulder: 2 },
  ],
  items: [0.9, 4.6, 7.4, 10.6, 13.0, 16.2],
  boosts: [[0.5, 0], [4.0, 0], [7.9, 0], [11.4, 0], [16.8, 0]],
  ramps: [12.12],
  studs: [[0.6, 0.4, 6], [1.6, -0.4, 6], [4.8, 0, 6], [6.6, 0, 6], [9.6, 0, 8], [13.6, 0, 8], [16.9, 0, 6]],
  theme: {
    sky: [0x4a6a9a, 0xd8c8a8, 0x6a5a4a], fog: [0xc8b8a0, 160, 900], sun: { color: 0xffe8c8, intensity: 2.4, dir: [0.5, 1, -0.3] },
    hemi: [0xf0e0d0, 0x5a5048, 1.2], envIntensity: 1.0,
    ground: 0x6a6e72, groundPitch: 1.6, shoulder: 0x4a4e52, dust: 0xaaaaaa,
    surfaces: { metal: { base: '#5a6068', line: '#f2cd37', seams: 'rgba(0,0,0,0.35)', dashed: true, rough: 0.35, metal: 0.3 } },
    wall: [C.yellow, C.black], curb: [C.yellow, C.black], gate: [C.yellow, C.black],
    support: 'pillar', pillar: C.yellow, pillar2: C.dkgray, skirt: ['#6a6e72', '#3a3e42'], skirtColor: C.dkgray,
    rampSide: C.dkgray, ramp: C.yellow,
    music: { bpm: 144, root: 55, scale: 'minor', style: 'rock' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    // warning-stripe floor under the elevated section
    const stripes = canvasTexture(128, 128, (g, w) => { for (let k = -4; k < 8; k++) { g.fillStyle = k % 2 ? '#f2cd37' : '#1b2a34'; g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32 + 32, 0); g.lineTo(k * 32 + 32 - w, w); g.lineTo(k * 32 - w, w); g.fill(); } });
    stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping; stripes.repeat.set(30, 30);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7 }));
    floor.position.set(40, -0.05, 10); floor.receiveShadow = true; scene.add(floor);
    // factory halls around the yard
    const hcols = [C.ltgray, C.dkgray, C.rbrown, C.tan, C.dkstone];
    ctx.scatter(26, { minC: 6, maxC: 150, r: 26, pad: 230, tries: 50 }, (x, z) => {
      const w = 30 + rand() * 30, d = 24 + rand() * 20, h = 16 + rand() * 20;
      const col = pick(rand, hcols);
      b.box(x, 0, z, w, h, d, col);
      for (let k = 0; k < 4; k++) b.box(x, h + k * 0.01, z - d / 2 + (k + 0.5) * d / 4, w, 3, d / 4 - 1, k % 2 ? C.dkgray : col);
      for (let k = 0; k < 3; k++) b.box(x - w / 2 + (k + 0.5) * w / 3, h * 0.45, z + d / 2 + 0.05, w / 4, h * 0.3, 0.2, C.azure, { matOpts: { emissive: 0xffe0a0, emissiveIntensity: 0.3 } });
      b.brick(x, h + 3, z, Math.round(w / 3), Math.round(d / 3), 1, col, { pitch: 3 });
    });
    for (const [x, z] of [[-360, 250], [330, -220], [360, 280], [-350, -240], [80, 330]]) smokestack(ctx, x, z, 60 + rand() * 30, pick(rand, [C.red, C.dkgray]));
    // giant gears on the walls, crates and robot arms beside the road
    edges(ctx, 0, 17.9, 60, 4, (p, i, sd) => { if (tr.py(i) < 1) gear(ctx, p.x, 8 + rand() * 4, p.z, 5 + rand() * 4, pick(rand, [C.ltgray, C.yellow, C.orange]), (rand() - 0.5) * 1.2, 'z', tr.yawAt(i) + Math.PI / 2); });
    edges(ctx, 0.2, 4.9, 16, 3, (p, i) => { if (rand() < 0.7) crate(b, p.x, p.z, 1 + rand() * 0.5, pick(rand, [C.rbrown, C.blue, C.red, C.green])); });
    edges(ctx, 12.4, 17.9, 18, 3, (p) => { if (rand() < 0.6) { crate(b, p.x, p.z, 1.2, pick(rand, [C.rbrown, C.blue])); crate(b, p.x, p.z, 0.9, C.yellow, 3.6); } });
    edges(ctx, 14.6, 17.5, 40, 6, (p) => robotArm(ctx, p.x, p.z, 1.1, pick(rand, [C.orange, C.yellow, C.red])));
    // giant brick stacks (the product!)
    ctx.scatter(14, { minC: 4, maxC: 80, r: 8, test: () => true }, (x, z) => { let y = 0; for (let k = 0; k < 2 + rand() * 4; k++) y = b.brick(x + (rand() - 0.5), y, z + (rand() - 0.5), 2, 4, 3, pick(rand, [C.red, C.blue, C.yellow, C.green, C.white]), { pitch: 2.2, rot: (rand() < 0.5 ? 0 : Math.PI / 2) }); });
    // stampers on the belt exit and in the hall
    [[2.75, -0.45], [2.95, 0.45], [3.15, -0.1]].forEach(([k, l], n) => ctx.hazard(crusher(ctx, { i: tr.kToIndex(k), lat: l * 15, period: 2.8, offset: n * 0.9, size: 7, color: pick(rand, [C.red, C.blue, C.yellow]) })));
    [[14.75, 0.4], [15.05, -0.4], [15.3, 0.1]].forEach(([k, l], n) => ctx.hazard(crusher(ctx, { i: tr.kToIndex(k), lat: l * 13, period: 3.0, offset: n * 1.0, size: 6.5, color: C.dkgray })));
    tunnel(ctx, 14.5, 15.5, { wall: C.dkgray, roof: C.ltgray, height: 12, lights: 0xfff0c0 });
    // wrecking arms spinning in the hairpins of the elevated section
    for (const k of [5.1, 8.35, 11.3]) {
      const i = tr.kToIndex(k);
      const inside = tr.CURV[i] > 0 ? -1 : 1;
      const c = tr.at(i, inside * (tr.HW[i] + 4), 0);
      ctx.hazard(spinner(ctx, { center: c, length: tr.HW[i] * 1.5, speed: 1.1, balls: 5, color: C.dkgray, glow: false, kind: 'spin', height: 1.6 }));
    }
    // forklifts crossing
    ctx.hazard(crossing(ctx, { mesh: forklift(), k: 16.5, speed: 6, kind: 'bump', radius: 2.6 }));
    ctx.hazard(crossing(ctx, { mesh: forklift(), k: 0.3, speed: 5, kind: 'bump', radius: 2.6, offset: 0.5 }));
    // pit under the jump
    ctx.cutGround(ctx.makeMask(3000, 2048, (g, toPx, sc) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048); g.fillStyle = '#000'; for (let i = tr.kToIndex(12.14); i < tr.kToIndex(12.36); i += 2) { const [x, y] = toPx(tr.px(i), tr.pz(i)); g.beginPath(); g.arc(x, y, (tr.HW[i] + 1) * sc, 0, Math.PI * 2); g.fill(); } }));
    each(tr, 12.15, 12.35, 4, (i) => { const p = tr.at(i, 0, 0); b.box(p.x, -6, p.z, 40, 0.6, 5, 0xff5a00, { rot: tr.yawAt(i), matOpts: { emissive: 0xff4000, emissiveIntensity: 1.5 } }); });
    arch(ctx, 1.05, { cols: [C.yellow, C.black], text: 'CONVEYOR', bg: '#1b2a34', fg: '#f2cd37' });
    arch(ctx, 5.0, { cols: [C.red, C.white], text: 'ASSEMBLY LINE', bg: '#c91a09' });
    void plastic; void groundPlane; void disc;
  },
};
