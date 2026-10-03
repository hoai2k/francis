// Rainbow Bricks: a glowing rainbow road through space with steep banked
// turns, a spiral, a jump, a long glide between planets and drifting asteroids.
import { THREE, BrickBuilder, C, plastic, baseplateMat, brickGeometry, faceTexture, mover, arch } from './kit.js';

function studPlanet(r, color) {
  const m = baseplateMat(color, 1, 0.5);
  m.map.repeat.set(r * 0.8, r * 0.4); m.bumpMap.repeat.copy(m.map.repeat);
  m.fog = false;
  return new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), m);
}
function asteroid(col) {
  const g = new THREE.Group();
  const s = new THREE.Mesh(brickGeometry(2, 4, 3, 1.6, true, 8), plastic(col));
  s.position.y = 2; s.castShadow = true;
  g.add(s); g.userData.spin = s;
  return g;
}

export default {
  id: 'space', name: 'Rainbow Bricks', subtitle: 'Banked rainbow turns, a planet glide and drifting asteroids',
  cup: 'galaxy', seed: 55, width: 26, shoulder: 0, edge: 'void', surface: 'rainbow', start: 0.5, bank: 1.9,
  points: [[0, 0, 45], [196, 0, 45], [308, 70, 51], [322, 196, 60], [238, 280, 69], [112, 266, 75], [28, 210, 72], [-28, 126, 66], [70, 77, 60], [140, 161, 54], [70, 245, 48], [-56, 266, 42], [-168, 224, 28], [-238, 126, 18], [-224, 14, 22], [-140, -42, 36], [-70, -28, 45]],
  sections: [
    { from: 3.65, to: 3.77, gap: true },
    { from: 6.0, to: 10.4, edge: 'wall', shoulder: 1.5 },
    { from: 11.15, to: 12.9, gap: true },
  ],
  items: [1.5, 4.6, 8.5, 10.6, 13.6, 16.2],
  boosts: [[1.0, -0.45], [1.0, 0.45], [5.4, 0], [7.8, 0], [9.4, 0], [14.5, 0.3], [15.5, -0.3], [16.6, 0]],
  ramps: [3.55],
  gliders: [11.05],
  studs: [[0.6, 0, 10], [2.6, 0.3, 6], [4.2, 0, 6], [6.8, -0.3, 6], [9.0, 0, 6], [13.2, 0, 8], [15.0, 0, 8]],
  theme: {
    sky: [0x05020f, 0x2a0a4a, 0x0a0420], fog: [0x160626, 300, 1300], sun: { color: 0xd8c8ff, intensity: 2.0, dir: [-0.3, 1, 0.4] },
    hemi: [0x8a7aff, 0x2a1a4a, 1.2], envIntensity: 1.0,
    noGround: true, stars: 6000, groundY: -60, noSigns: false,
    road: { base: '#ffffff', line: null }, wall: [0xff3a8a, 0x3ad0ff, 0xffe03a, 0x7aff5a], curb: null, gate: [C.magenta, C.dkblue],
    support: 'none', skirt: ['#2a1a5a', '#140a30'], skirtColor: 0x1a0a3a, rail: 0x7ad8ff,
    rampSide: C.dkblue, ramp: 0xff3a8a,
    music: { bpm: 142, root: 64, scale: 'lydian', style: 'space' },
  },
  decor(ctx) {
    const { rand, bounds, scene, track: tr } = ctx;
    const planets = [
      { p: [-560, 60, 420], r: 150, c: 0xd06a2a, ring: 0xf2cd37 },
      { p: [680, 180, -460], r: 100, c: 0x3a8ad8 },
      { p: [220, -170, 650], r: 70, c: 0x7ae07a },
      { p: [-320, 320, -640], r: 50, c: 0xd84aa8 },
      { p: [80, 20, 380], r: 34, c: 0xffd040 },
    ];
    const pm = [];
    for (const pl of planets) {
      const m = studPlanet(pl.r, pl.c);
      m.position.set(...pl.p);
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
    const head = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 96, 48), [new THREE.MeshStandardMaterial({ map: faceTexture('grin'), roughness: 0.4, fog: false }), plastic(C.fig), plastic(C.fig)]);
    head.material.forEach((mm) => { mm.fog = false; });
    head.rotation.y = Math.PI;
    moon.add(head);
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 20, 32), new THREE.MeshStandardMaterial({ color: C.fig, roughness: 0.4, fog: false }));
    stud.position.y = 58; moon.add(stud);
    moon.position.set(bounds.cx + 150, 170, bounds.cz + 720);
    scene.add(moon);
    ctx.anim((dt, t) => { pm.forEach((m, k) => { m.rotation.y = t * (0.02 + k * 0.01); }); moon.rotation.y = Math.PI + Math.sin(t * 0.1) * 0.5; moon.rotation.z = Math.sin(t * 0.07) * 0.1; });
    // neon rings over the road
    const ringMat = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2 });
    [0.3, 2.2, 5.0, 7.3, 9.7, 14.2, 15.8].forEach((k, n) => {
      const i = tr.kToIndex(k), p = tr.at(i, 0, 0);
      const r = new THREE.Mesh(new THREE.TorusGeometry(tr.HW[i] + 3, 0.6, 8, 48), ringMat([0xff3a8a, 0x3ad0ff, 0xffe03a, 0x7aff5a, 0xb05aff][n % 5]));
      r.position.copy(p); r.rotation.y = tr.yawAt(i);
      scene.add(r);
    });
    // glide rings to fly through
    for (let f = 0.15; f < 1; f += 0.22) {
      const k = 11.15 + f * 1.7, i = tr.kToIndex(k), p = tr.at(i, 0, 14 - f * 10);
      const r = new THREE.Mesh(new THREE.TorusGeometry(10, 0.7, 8, 40), ringMat(0x7ad8ff));
      r.position.copy(p); r.rotation.y = tr.yawAt(i);
      scene.add(r);
    }
    // space station
    const st = new BrickBuilder(1);
    st.cyl(0, -8, 0, 8, 16, C.ltgray, { seg: 24 });
    st.cyl(0, -1, 0, 9, 2, C.blue, { seg: 24 });
    st.cyl(0, 8, 0, 3, 6, C.ltgray, { seg: 16, stud: 3 });
    const panel = plastic(0x1a2a6a, { metal: 0.6, rough: 0.2, emissive: 0x1a3aa0, emissiveIntensity: 0.4 });
    for (const s of [-1, 1]) { st.box(s * 22, -0.5, 0, 28, 1, 1, C.ltgray); for (let k = 0; k < 3; k++) st.box(s * (14 + k * 8), -0.5, 0, 7, 0.3, 14, 0, { mat: panel }); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; st.box(Math.cos(a) * 8.1, 2, Math.sin(a) * 8.1, 1.4, 2, 1.4, C.yellow, { rot: -a, matOpts: { emissive: 0xffd040, emissiveIntensity: 1.5 } }); }
    const stg = st.build(); stg.position.set(bounds.cx - 40, 80, bounds.cz - 260); stg.scale.setScalar(1.6); scene.add(stg);
    ctx.anim((dt, t) => { stg.rotation.y = t * 0.08; });
    // tumbling background asteroids
    const n = 180;
    const ast = new THREE.InstancedMesh(brickGeometry(2, 4, 3, 2, true, 8), plastic(0xffffff), n);
    const data = [];
    const col = new THREE.Color();
    for (let k = 0; k < n; k++) {
      let p;
      for (let tries = 0; tries < 20; tries++) {
        p = new THREE.Vector3(bounds.cx + (rand() - 0.5) * 1000, -80 + rand() * 260, bounds.cz + (rand() - 0.5) * 1000);
        if (tr.clearance(p.x, p.z, 40) > 30 || Math.abs(p.y - 45) > 35) break;
      }
      data.push({ p, r: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6), s: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5), sc: 0.6 + rand() * 2.2 });
      col.setHSL(rand(), 0.7, 0.55); ast.setColorAt(k, col);
    }
    scene.add(ast);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    ctx.anim((dt) => { data.forEach((d, k) => { d.r.x += d.s.x * dt; d.r.y += d.s.y * dt; d.r.z += d.s.z * dt; q.setFromEuler(d.r); m4.compose(d.p, q, sc.setScalar(d.sc)); ast.setMatrixAt(k, m4); }); ast.instanceMatrix.needsUpdate = true; });
    // asteroids drifting across the road
    for (const [k, o] of [[2.2, 0], [8.0, 0.3], [15.1, 0.6], [16.0, 0.1]]) {
      const i = tr.kToIndex(k), w = tr.HW[i] + 10;
      ctx.hazard(mover(ctx, { mesh: asteroid([0xff3a8a, 0x3ad0ff, 0xffe03a, 0x7aff5a][Math.floor(rand() * 4)]), path: [tr.at(i, -w, 0), tr.at(i, w, 0)], loop: false, speed: 7, radius: 3.4, kind: 'spin', roll: 2, offset: o }));
    }
    // rocket ships flying laps
    const rk = new BrickBuilder(1);
    rk.cyl(0, 0, 0, 1.6, 8, C.white, { seg: 12 }); rk.cone(0, 8, 0, 1.6, 3.5, C.red, { seg: 12 });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; rk.box(Math.cos(a) * 1.8, 0, Math.sin(a) * 1.8, 0.3, 3, 2.2, C.red, { rot: -a }); }
    rk.cyl(0, -1.5, 0, 1.1, 1.5, 0xff8a18, { seg: 10, matOpts: { emissive: 0xff6a00, emissiveIntensity: 3 } });
    const rkg = rk.build();
    rkg.children.forEach((c) => { c.geometry.rotateX(Math.PI / 2); });
    const rockets = [0, 1, 2].map((k) => { const g = rkg.clone(); scene.add(g); return { g, k }; });
    ctx.anim((dt, t) => rockets.forEach(({ g, k }) => {
      const a = t * 0.12 + k * 2.1, R = 360 + k * 70;
      g.position.set(bounds.cx + Math.cos(a) * R, 90 + Math.sin(t * 0.3 + k) * 30 + k * 30, bounds.cz + Math.sin(a) * R);
      g.rotation.y = -a + Math.PI;
    }));
    arch(ctx, 11.0, { cols: [0xff3a8a, 0x3ad0ff], text: 'HYPER GLIDE', bg: '#2a0a4a', fg: '#7ad8ff' });
  },
};
