// Star Wars gliders (see the contract at the top of js/gliders.js).
import { THREE, BrickBuilder, C, mat, box, cyl, cone, frustum, sphere, geo, rod, glow, morphPair, plate, deployClock } from './movie-kit.js';

const PI = Math.PI;

// ---- X-wing: a white fuselage whose S-foils split into an X once the glider is out ---------
const XWING = {
  id: 'sfoilwing', name: 'S-Foil Wing', blurb: 'Lock S-foils in attack position',
  colors: [C.white, C.red],
  build({ mast }) {
    const W = C.white, R = C.red, G = C.ltgray, D = C.dkgray, BK = C.black;
    const b = new BrickBuilder(0.4);
    const Y = 2.0;
    mast(b, Y - 0.25, D);
    // fuselage: long white body, tapered nose with red stripes, dark canopy, R2 unit behind it
    box(b, null, 0, Y, -0.35, 0.62, 0.5, 1.9, W);
    frustum(b, null, 0, Y - 0.02, 0.6, 1.55, 0.62, 0.46, 0.22, 0.2, W, { drop: -0.1 });
    for (const sd of [-1, 1]) box(b, null, sd * 0.315, Y - 0.08, -0.2, 0.02, 0.1, 1.4, R);
    box(b, null, 0, Y - 0.1, 1.3, 0.3, 0.2, 0.06, R);
    box(b, null, 0, Y + 0.3, 0.25, 0.42, 0.18, 0.75, BK, { rx: 0.18 });
    box(b, null, 0, Y + 0.3, 0.25, 0.06, 0.2, 0.77, G, { rx: 0.18 });
    cyl(b, null, 0, Y + 0.29, -0.45, 0.17, 0.12, W, 'y', { seg: 12 });
    sphere(b, null, 0, Y + 0.35, -0.45, 0.17, 0xc9ccd0, { sy: 0.8 });
    box(b, null, 0, Y + 0.45, -0.37, 0.12, 0.06, 0.05, C.blue);
    box(b, null, 0, Y - 0.05, -1.35, 0.7, 0.5, 0.2, G);
    // the four S-foils, built closed (k = 0) and open (k = 1) so one morph opens them
    const eng = glow(0xff3018, 1.4, { base: 0xff2000 });
    const foils = morphPair(0.4, (fb, k) => {
      for (const sd of [-1, 1]) for (const up of [-1, 1]) {
        const a = sd * up * (0.04 + 0.21 * k);
        const base = mat(sd * 0.28, Y + up * 0.13, 0, 0, 0, a);
        const X = (x) => sd * x;
        plate(fb, base, [X(0), 0, -1.35, 0.25], [X(2.95), 0, -1.0, -0.45], 0.07, W);
        if (up > 0) plate(fb, base, [X(0.9), 0.045, -1.2, 0.0], [X(1.35), 0.045, -1.15, -0.15], 0.02, R);
        plate(fb, base, [X(1.9), up * 0.045, -1.08, -0.3], [X(2.5), up * 0.045, -1.04, -0.38], 0.02, G);
        // engine on the wing root with a glowing exhaust, cannon on the tip
        cyl(fb, base, X(0.45), up * 0.18, -0.7, 0.2, 1.5, G, 'z', { seg: 12 });
        cyl(fb, base, X(0.45), up * 0.18, 0.08, 0.22, 0.12, D, 'z', { seg: 12 });
        cyl(fb, base, X(0.45), up * 0.18, -1.47, 0.15, 0.06, 0, 'z', { mat: eng, seg: 12 });
        cyl(fb, base, X(2.95), 0, -0.5, 0.07, 1.4, G, 'z', { seg: 8 });
        cyl(fb, base, X(2.95), 0, 0.5, 0.045, 1.0, D, 'z', { seg: 6 });
        cyl(fb, base, X(2.95), 0, 1.05, 0.07, 0.14, R, 'z', { seg: 6 });
      }
    }, 'sfoils');
    const tick = deployClock(foils.group, 0.8);
    return {
      mesh: b.build({ name: 'sfoilwing' }), parts: [foils.group],
      fx(s, dt) {
        const k = tick(dt), e = k * k * (3 - 2 * k);
        for (const m of foils.meshes) m.morphTargetInfluences[0] = e;
        eng.emissiveIntensity = 1.2 + 0.8 * s.speed01 + 0.25 * Math.sin(s.t * 31);
      },
    };
  },
};

// ---- TIE fighter: the ball cockpit between two hexagonal solar panels ----------------------
const TGREY = 0x8f969c, TPANEL = 0x23262c;
const TIEWING = {
  id: 'tiepanels', name: 'TIE Panels', blurb: 'Twin ion engines, solar wings',
  colors: [TGREY, TPANEL],
  build({ mast }) {
    const G = TGREY, D = C.dkgray, BK = TPANEL;
    const b = new BrickBuilder(0.4);
    const Y = 1.9, HR = 1.45, WX = 2.2, TILT = 0.42;
    const ion = glow(0xff5a3a, 1.2);
    mast(b, Y - 0.45, D);
    // the ball: grey sphere, octagonal front window, twin ion engines at the back
    sphere(b, null, 0, Y, 0, 0.55, G, { w: 16, h: 12 });
    cyl(b, null, 0, Y, 0.5, 0.3, 0.1, BK, 'z', { seg: 8, spin: PI / 8 });
    geo(b, null, new THREE.TorusGeometry(0.3, 0.045, 4, 8), D, mat(0, Y, 0.55, 0, 0, PI / 8));
    for (let i = 0; i < 4; i++) box(b, null, 0, Y, 0.55, 0.58, 0.03, 0.03, D, { rz: (i * PI) / 4 });
    cyl(b, null, 0, Y + 0.35, -0.05, 0.25, 0.4, D, 'y', { seg: 12 });
    cyl(b, null, 0, Y + 0.56, -0.05, 0.28, 0.04, G, 'y', { seg: 12 });
    for (const sd of [-1, 1]) {
      cyl(b, null, sd * 0.2, Y - 0.05, -0.5, 0.13, 0.12, D, 'z', { seg: 12 });
      cyl(b, null, sd * 0.2, Y - 0.05, -0.57, 0.1, 0.04, 0, 'z', { mat: ion, seg: 12 });
      cyl(b, null, sd * 0.18, Y - 0.38, 0.38, 0.045, 0.3, D, 'z', { seg: 6 });
    }
    // pylons out to the wings
    for (const sd of [-1, 1]) {
      box(b, null, sd * 0.85, Y, 0, 0.8, 0.26, 0.42, G);
      box(b, null, sd * 1.25, Y, 0, 0.3, 0.38, 0.5, D);
      sphere(b, null, sd * 0.5, Y, 0, 0.24, G);
    }
    // the hexagonal panels: dark prism, grey rim, six spokes and a hub, tilted up into a shallow V
    const vtx = (i) => [Math.cos((i * PI) / 3) * HR, Math.sin((i * PI) / 3) * HR];
    for (const sd of [-1, 1]) {
      const base = mat(sd * WX, Y + 0.25, 0, 0, 0, sd * TILT);
      cyl(b, base, 0, 0, 0, HR, 0.06, BK, 'y', { seg: 6, spin: PI / 2 });
      for (let i = 0; i < 6; i++) {
        const [x0, z0] = vtx(i), [x1, z1] = vtx(i + 1);
        rod(b, base, [x0, 0, z0], [x1, 0, z1], 0.07, G, { seg: 6 });
        for (const h of [-0.045, 0.045]) {
          rod(b, base, [0, h, 0], [x0 * 0.97, h, z0 * 0.97], 0.035, D, { seg: 4 });
          for (const f of [0.35, 0.68]) rod(b, base, [x0 * f, h, z0 * f], [x1 * f, h, z1 * f], 0.02, D, { seg: 4 });
        }
      }
      cyl(b, base, 0, 0, 0, 0.3, 0.16, G, 'y', { seg: 6, spin: PI / 2 });
      cyl(b, base, 0, 0, 0, 0.14, 0.2, D, 'y', { seg: 6, spin: PI / 2 });
    }
    // the ion glow behind the ball (flickers with speed)
    const pb = new BrickBuilder(0.4), trail = glow(0xff5a3a, 1.2, { trans: true, opacity: 0.4 });
    for (const sd of [-1, 1]) cone(pb, null, sd * 0.2, 0, 0, 0.09, 0.6, 0, 'z', { mat: trail, seg: 8 });
    const exhaust = new THREE.Group(); exhaust.position.set(0, Y - 0.05, -0.59); exhaust.rotation.y = PI;
    exhaust.add(pb.build({ name: 'ion', shadows: false }));
    return {
      mesh: b.build({ name: 'tiepanels' }), parts: [exhaust],
      fx(s) {
        const f = 0.7 + 0.5 * s.speed01 + 0.15 * Math.sin(s.t * 41);
        exhaust.scale.set(1, 1, f);
        ion.emissiveIntensity = 1 + f;
      },
    };
  },
};

export default [XWING, TIEWING];
