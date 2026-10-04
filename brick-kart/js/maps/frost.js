// Frosty Peaks: climb through an ice cave while giant snowballs roll down,
// glide off the summit onto the frozen lake, dodge penguins, hit the ski jump.
import { THREE, BrickBuilder, C, plastic, groundPlane, pine, snowman, crystal, mountain, cloud, trackMover, crossing, tunnel, disc, strokeTrack, inRange, edges, arch, built } from './kit.js';

function snowball() {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(3, 18, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
  s.position.y = 3; s.castShadow = true;
  g.add(s); g.userData.spin = s;
  return g;
}
function penguin() {
  return built((b) => {
    b.sphere(0, 1.3, 0, 1, C.black, { sy: 1.4 }); b.sphere(0, 1.2, 0.35, 0.75, C.white, { sy: 1.3 });
    b.sphere(0, 2.8, 0, 0.7, C.black); b.cone(0, 2.7, 0.6, 0.18, 0.5, C.orange, { rot: 0 });
    for (const sd of [-1, 1]) { b.sphere(sd * 0.25, 2.95, 0.55, 0.12, C.white); b.box(sd * 0.4, 0, 0.2, 0.4, 0.15, 0.6, C.orange); }
  }, 'penguin');
}

export default {
  id: 'frost', name: 'Frosty Peaks', subtitle: 'Ice cave, rolling snowballs, a summit glide and a ski jump',
  cup: 'brick', seed: 44, width: 26, shoulder: 8, edge: 'fence', start: 0.5,
  points: [[0, 0, 0], [162, -38, 0], [300, 25, 4], [338, 150, 10], [262, 262, 16], [138, 250, 22], [75, 338, 28], [-75, 312, 34], [-150, 238, 24], [-212, 150, 12], [-275, 62, 2], [-325, -62, 0], [-250, -175, 0], [-160, -130, 0], [-90, -205, 0], [-15, -150, 0], [-75, -50, 0]],
  sections: [
    { from: 2.5, to: 7.1, support: 'bank', shoulder: 5 },
    { from: 3.2, to: 4.2, edge: 'wall', shoulder: 2 },
    { from: 7.15, to: 9.55, gap: true },
    { from: 9.6, to: 11.6, surface: 'ice', support: 'none', shoulder: 6, width: 32, edge: 'open' },
  ],
  items: [1.3, 4.8, 9.9, 12.8, 15.6],
  boosts: [[2.2, 0], [5.8, 0.3], [11.0, 0], [14.1, -0.3], [16.4, 0]],
  ramps: [15.25],
  gliders: [7.05],
  studs: [[0.8, 0.3, 8], [2.9, 0, 6], [5.2, -0.3, 6], [6.5, 0.3, 5], [10.3, 0, 8], [13.4, 0, 6], [15.8, 0, 6]],
  theme: {
    sky: [0x2f7ad8, 0xdcefff, 0xbcd4e8], fog: [0xdcefff, 180, 1000], sun: { color: 0xffffff, intensity: 2.8, dir: [0.4, 1, 0.6] },
    hemi: [0xe6f4ff, 0x8aa0b0, 1.3], envIntensity: 0.9,
    ground: 0xf4f8ff, groundPitch: 1.6, shoulder: 0xf4f8ff, dust: 0xffffff,
    road: { base: '#7d8a96', line: '#e8f6ff' }, wall: [C.white, C.azure, C.mdblue], curb: [C.red, C.white], gate: [C.azure, C.white], fence: [C.red, C.white],
    support: 'bank', pillar: C.white, skirt: ['#f4f8ff', '#b4c8d8'], skirtColor: C.white,
    rampSide: C.white, ramp: C.azure, particles: 'snow',
    music: { bpm: 128, root: 62, scale: 'major', style: 'jingle' },
  },
  decor(ctx) {
    const { b, rand, track: tr, bounds, scene } = ctx;
    const onIce = (i) => inRange(tr, i, 9.3, 11.9);
    const inGlide = (i) => inRange(tr, i, 7.1, 9.6);
    const lake = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; strokeTrack(g, tr, toPx, sc, 30, (i) => onIce(i) || inGlide(i)); disc(g, toPx, sc, -200, 170, 60); });
    const lm = groundPlane(0xa8dcff, -0.03, 1600, 1.6, { mask: lake, rough: 0.05 });
    lm.material.metalness = 0.2; lm.material.bumpScale = 0.2;
    scene.add(lm);
    ctx.scatter(16, { minC: 2, maxC: 40, r: 3, test: (x, z) => lake.test(x, z) }, (x, z) => crystal(b, x, 0, z, 1.3, rand));
    // big mountain under the summit (the glide launches off its shoulder)
    const sp = tr.at(tr.kToIndex(7.0), 0, 0);
    mountain(b, sp.x + 40, 0, sp.z + 70, 70, 80, rand, [C.ltgray, C.white, C.dkgray], C.white, tr);
    ctx.claim(sp.x + 40, sp.z + 70, 70);
    ctx.scatter(18, { minC: 70, maxC: 360, r: 50, pad: 340, tries: 60 }, (x, z) => mountain(b, x, 0, z, 40 + rand() * 50, 60 + rand() * 80, rand, [C.ltgray, C.white, C.dkgray], C.white, tr));
    ctx.scatter(190, { minC: 2, maxC: 130, r: 3, pad: 200, test: (x, z) => !lake.test(x, z) }, (x, z) => pine(b, x, 0, z, 0.9 + rand() * 0.9, true));
    edges(ctx, 0, 16.9, 13, 2, (p, i) => { if (!lake.test(p.x, p.z) && rand() < 0.7) pine(b, p.x, p.y, p.z, 1 + rand() * 0.5, true); });
    ctx.scatter(12, { minC: 3, maxC: 50, r: 3, test: (x, z) => !lake.test(x, z) }, (x, z) => snowman(b, x, 0, z, 1 + rand() * 0.5));
    // ice cave with crystals
    tunnel(ctx, 3.2, 4.2, { wall: C.azure, roof: C.white, height: 11, lights: 0x7ad8ff });
    for (let i = tr.kToIndex(3.25); i < tr.kToIndex(4.15); i += 9) for (const sd of [-1, 1]) { const p = tr.at(i, (tr.HW[i] + 1) * sd, 0); crystal(b, p.x, p.y, p.z, 1.1, rand, C.azure); }
    // snowballs rolling down the climb
    for (let n = 0; n < 5; n++) ctx.hazard(trackMover(ctx, { mesh: snowball(), from: 4.4, to: 6.9, reverse: true, oneWay: true, lat: [-0.5, 0.3, 0.6, -0.15, -0.6][n], speed: 17, radius: 3, kind: 'spin', roll: 3, offset: n / 5 }));
    // penguins crossing
    for (const [k, o] of [[12.3, 0], [12.5, 0.5], [14.5, 0.25]]) ctx.hazard(crossing(ctx, { mesh: penguin(), k, speed: 3.5, kind: 'spin', offset: o }));
    // ski lodge + lift
    const li = tr.kToIndex(0.2), lp = tr.at(li, -(tr.HW[li] + tr.SH[li] + 16), 0);
    b.box(lp.x, 0, lp.z, 16, 6, 12, C.rbrown);
    for (let k = 0; k < 4; k++) b.box(lp.x, 1 + k * 1.4, lp.z, 16.4, 0.3, 12.4, C.brown);
    for (const sd of [-1, 1]) b.boxM(new THREE.Matrix4().compose(new THREE.Vector3(lp.x, 8.5, lp.z + sd * 3.3), new THREE.Quaternion().setFromEuler(new THREE.Euler(-sd * 0.6, 0, 0)), new THREE.Vector3(18, 0.8, 8.6)), C.red);
    b.box(lp.x + 3, 2, lp.z + 6.1, 3, 2, 0.3, C.yellow, { matOpts: { emissive: 0xffc040, emissiveIntensity: 0.8 } });
    ctx.claim(lp.x, lp.z, 12);
    const top = new THREE.Vector3(sp.x + 40, 78, sp.z + 70), bottom = new THREE.Vector3(lp.x + 10, 6, lp.z - 10);
    // lift pylons (none on the road: the cable just spans over it)
    for (let k = 0; k <= 7; k++) { const p = bottom.clone().lerp(top, k / 7); if (tr.clearance(p.x, p.z, 10) < 5) continue; b.box(p.x, 0, p.z, 1, p.y + 4, 1, C.dkgray); b.box(p.x, p.y + 4, p.z, 6, 0.6, 1, C.dkgray); }
    const cable = new THREE.BufferGeometry().setFromPoints([bottom.clone().add(new THREE.Vector3(2.5, 4, 0)), top.clone().add(new THREE.Vector3(2.5, 4, 0)), top.clone().add(new THREE.Vector3(-2.5, 4, 0)), bottom.clone().add(new THREE.Vector3(-2.5, 4, 0))]);
    ctx.group.add(new THREE.LineLoop(cable, new THREE.LineBasicMaterial({ color: 0x222222 })));
    const chairProto = built((c) => { c.box(0, -3, 0, 2.6, 0.4, 1.4, C.red); c.box(0, -3, -0.6, 2.6, 1.6, 0.3, C.red); c.box(0, -3, 0, 0.2, 3, 0.2, C.black); });
    const chairs = [];
    for (let k = 0; k < 14; k++) { const c = chairProto.clone(); ctx.group.add(c); chairs.push(c); }
    const dir = top.clone().sub(bottom);
    ctx.anim((dt, t) => chairs.forEach((c, k) => {
      let f = ((t * 0.02 + k / 14) % 1) * 2; const up = f < 1; if (!up) f = 2 - f;
      c.position.copy(bottom).addScaledVector(dir, f).add(new THREE.Vector3(up ? 2.5 : -2.5, 4, 0));
      c.rotation.y = Math.atan2(dir.x, dir.z) + (up ? 0 : Math.PI);
    }));
    // ski jump tower by the ramp
    const ji = tr.kToIndex(15.25), jp = tr.at(ji, tr.HW[ji] + tr.SH[ji] + 8, 0);
    const jb = new BrickBuilder(1);
    for (let k = 0; k < 8; k++) jb.box(jp.x, k * 3, jp.z, 5 - k * 0.3, 3, 5 - k * 0.3, k % 2 ? C.red : C.white);
    ctx.group.add(jb.build());
    arch(ctx, 7.0, { cols: [C.azure, C.white], text: 'SUMMIT GLIDE', bg: '#1a8cff' });
    arch(ctx, 15.1, { cols: [C.red, C.white], text: 'SKI JUMP', bg: '#c91a09' });
    for (let k = 0; k < 16; k++) cloud(ctx.bNoShadow, bounds.cx + (rand() - 0.5) * 1100, 120 + rand() * 60, bounds.cz + (rand() - 0.5) * 1100, 2.5, rand);
    void plastic;
  },
};
