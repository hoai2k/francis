// Jurassic gliders (see the contract at the top of js/gliders.js).
import { THREE, BrickBuilder, C, mat, box, cyl, cone, sphere, rod, plate } from './movie-kit.js';
import { decal } from '../vehicles/heroes-kit.js';

const PI = Math.PI;

// ---- Pteranodon: hang on to its feet while it flaps (colours of the Pteranodon driver) ----
const P = { body: 0x7c503a, wing: 0xa07a50, membrane: 0x8a5a3a, crest: C.dkred, beak: 0xe0b060 };
const PTERA = {
  id: 'pteraride', name: 'Ptera Ride', blurb: 'Hitch a lift from the Aviary',
  colors: [P.membrane, P.crest],
  build() {
    const b = new BrickBuilder(0.4);
    const Y = 1.85;
    // body, tail stub and the legs reaching down to the driver's bar
    box(b, null, 0, Y, -0.05, 0.58, 0.46, 1.1, P.body, { rx: 0.08 });
    box(b, null, 0, Y - 0.2, 0.05, 0.4, 0.12, 0.8, P.wing);
    box(b, null, 0, Y + 0.05, -0.75, 0.22, 0.18, 0.5, P.body, { rx: 0.25 });
    box(b, null, 0, Y + 0.12, 0.6, 0.3, 0.3, 0.4, P.body, { rx: -0.5 });
    for (const sd of [-1, 1]) {
      rod(b, null, [sd * 0.18, Y - 0.15, -0.4], [sd * 0.25, 0.85, -0.15], 0.07, P.body);
      rod(b, null, [sd * 0.25, 0.85, -0.15], [sd * 0.3, 0.1, 0], 0.05, P.body);
      for (const dx of [-0.06, 0.06]) box(b, null, sd * 0.3 + dx, 0.0, 0.08, 0.04, 0.14, 0.04, C.black, { rx: 0.5 });
    }
    box(b, null, 0, 0, 0, 0.9, 0.08, 0.08, C.rbrown);
    // head on its own pivot so it looks into the turns: beak, crest, eyes
    const hb = new BrickBuilder(0.4);
    box(hb, null, 0, 0.05, 0.1, 0.3, 0.28, 0.4, P.body);
    box(hb, null, 0, 0.04, 0.55, 0.16, 0.12, 0.6, P.beak);
    box(hb, null, 0, 0.04, 0.95, 0.09, 0.07, 0.3, P.beak);
    box(hb, null, 0, -0.06, 0.5, 0.13, 0.06, 0.6, P.beak);
    box(hb, null, 0, 0.3, -0.3, 0.07, 0.22, 0.75, P.crest, { rx: 0.45 });
    for (const sd of [-1, 1]) { box(hb, null, sd * 0.152, 0.11, 0.15, 0.02, 0.07, 0.08, 0xffb020); box(hb, null, sd * 0.158, 0.11, 0.16, 0.015, 0.06, 0.03, C.black); }
    const head = new THREE.Group(); head.position.set(0, Y + 0.28, 0.7); head.scale.setScalar(1.25); head.add(hb.build({ name: 'ptera-head' }));
    // two leathery wings on shoulder pivots: bony leading edge, membrane, little hand claws
    const wings = [-1, 1].map((sd) => {
      const wb = new BrickBuilder(0.4), X = (x) => sd * x;
      plate(wb, null, [X(0), 0, -0.85, 0.15], [X(1.3), 0.1, -0.95, 0.35], 0.06, P.membrane);
      plate(wb, null, [X(1.3), 0.1, -0.95, 0.35], [X(1.95), 0.05, -0.85, 0.22], 0.06, P.membrane);
      plate(wb, null, [X(1.95), 0.05, -0.85, 0.22], [X(3.5), -0.18, -0.68, -0.52], 0.05, P.membrane);
      rod(wb, null, [0, 0, 0.12], [X(1.3), 0.1, 0.35], 0.09, P.wing);
      rod(wb, null, [X(1.3), 0.1, 0.35], [X(1.95), 0.06, 0.22], 0.08, P.wing);
      rod(wb, null, [X(1.95), 0.06, 0.22], [X(3.5), -0.18, -0.58], 0.05, P.wing);
      sphere(wb, null, X(1.95), 0.06, 0.22, 0.1, P.body);
      for (let i = 0; i < 3; i++) box(wb, null, X(1.9 + i * 0.07), 0.06, 0.38, 0.03, 0.03, 0.18, C.black, { ry: sd * (i - 1) * 0.3 });
      const g = new THREE.Group(); g.position.set(sd * 0.26, Y + 0.08, 0.1); g.add(wb.build({ name: 'ptera-wing' }));
      return g;
    });
    return {
      mesh: b.build({ name: 'pteraride' }), parts: [head, ...wings],
      fx(s) {
        // a few strong beats, then a soaring hold
        const beat = Math.sin(s.t * 6.5), soar = 0.5 + 0.5 * Math.sin(s.t * 0.9);
        const a = 0.12 + (0.06 + 0.3 * soar) * beat;
        wings[0].rotation.z = -a; wings[1].rotation.z = a;
        head.rotation.y = -s.steer * 0.45;
        head.rotation.x = 0.06 * Math.sin(s.t * 6.5 + 1);
      },
    };
  },
};

// ---- Jurassic Park para-sail: a red, yellow and black ram-air wing with the park logo ------
const JPRED = 0xb8141c, JPYEL = 0xf2c414, JPBLK = 0x1b1b1b;
const PARASAIL = {
  id: 'parkparasail', name: 'Park Para-sail', blurb: 'Welcome... to Jurassic Park!',
  colors: [JPRED, JPYEL],
  build() {
    const b = new BrickBuilder(0.4);
    // the grip: a black bar with yellow brake toggles
    box(b, null, 0, 0, 0, 0.9, 0.08, 0.08, JPBLK);
    for (const sd of [-1, 1]) cyl(b, null, sd * 0.42, 0, 0, 0.07, 0.18, JPYEL, 'x', { seg: 8 });
    // the canopy: seven cells on an arc, open mouths at the front, lines down to the grip
    const cb = new BrickBuilder(0.4);
    const N = 7, R = 5.5, TOP = 2.2, CW = 0.92, COLS = [JPRED, JPYEL, JPRED, JPRED, JPRED, JPYEL, JPRED];
    for (let i = 0; i < N; i++) {
      const th = ((i - (N - 1) / 2) / ((N - 1) / 2)) * 0.56, x = R * Math.sin(th), y = TOP - R * (1 - Math.cos(th));
      const ch = 1.75 - Math.abs(th) * 0.9, base = mat(x, y, 0.05, 0, 0, -th);
      box(cb, base, 0, 0, 0, CW, 0.3, ch, COLS[i]);
      box(cb, base, 0, 0.02, ch / 2 - 0.12, CW - 0.06, 0.2, 0.26, JPBLK);
      box(cb, base, 0, 0.17, -ch * 0.12, CW + 0.02, 0.05, ch * 0.7, COLS[i], { rx: -0.08 });
      box(cb, base, CW / 2, 0, 0, 0.04, 0.32, ch, 0xd8c39a);
      for (const zz of [ch * 0.38, -ch * 0.38]) {
        const p = new THREE.Vector3(0, -0.15, zz).applyMatrix4(base);
        rod(cb, null, [Math.sign(x) * 0.36, 0, 0], [p.x, p.y, p.z], 0.016, C.ltgray, { seg: 3 });
      }
    }
    // the logo printed on top of the middle cell (readable from the chase camera)
    decal(cb, 0, 0, TOP + 0.24, -0.05, 1.1, 1.1, 'up');
    const canopy = new THREE.Group(); canopy.add(cb.build({ name: 'parasail' }));
    return {
      mesh: b.build({ name: 'parkparasail-bar' }), parts: [canopy],
      fx(s) {
        canopy.rotation.x = -0.08 * s.speed01 + 0.05 * Math.sin(s.t * 1.7);
        canopy.rotation.z = -s.steer * 0.1 + 0.03 * Math.sin(s.t * 1.1);
        canopy.scale.y = 1 + 0.03 * Math.sin(s.t * 3.1);
      },
    };
  },
};

export default [PTERA, PARASAIL];
