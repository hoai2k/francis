// Sonic gliders (see the contract at the top of js/gliders.js): a mini Tornado (Tails' red biplane
// wings with a spinning propeller and ring roundels) and Tails' own twin tails spun up into a rotor.
import { THREE, BrickBuilder, C, plastic, PI, S, M, G, rbox, rod, ell, ring } from '../vehicles/sonic-kit.js';

const RED = 0xd8202c, WHITE = 0xf4f4f4, GOLD = 0xf2c020, WOOD = 0x6a4022;

// ---- Tornado: two stacked red wings, a stubby fuselage with a propeller, a little tail -------------
const tornado = {
  id: 'sn-tornado', name: 'Tornado Wings', blurb: "Tails' biplane wings, propeller and all", colors: [RED, WHITE],
  build({ mast }) {
    const b = new BrickBuilder(0.4);
    mast(b, 1.42, C.dkgray);
    // the wings: upper on top, lower just above the driver, white tips and gold ring roundels
    for (const [y, half, z] of [[2.15, 3.2, 0.2], [1.45, 2.8, 0.1]]) {
      rbox(b, 0, y, z, half * 2, 0.1, 0.9, 0, 0, 0, RED);
      for (const sd of [-1, 1]) {
        rbox(b, sd * (half - 0.3), y + 0.006, z, 0.6, 0.1, 0.91, 0, 0, 0, WHITE);
        ring(b, sd * (half - 1.1), y + 0.07, z, 0.2, 0, null, PI / 2);
      }
    }
    // interplane struts and wires near the tips, cabane struts at the middle
    for (const sd of [-1, 1]) {
      for (const dz of [-0.25, 0.3]) rod(b, [sd * 2.3, 1.5, 0.1 + dz], [sd * 2.4, 2.1, 0.2 + dz], 0.04, C.dkgray);
      rod(b, [sd * 2.3, 1.5, 0.1], [sd * 0.4, 2.1, 0.2], 0.015, C.ltgray);
      rod(b, [sd * 0.3, 1.5, 0.3], [sd * 0.35, 2.1, 0.4], 0.035, C.dkgray);
    }
    // fuselage stub between the wings, white cheat line, cowl and spinner
    rbox(b, 0, 1.78, 0.25, 0.62, 0.52, 1.5, 0, 0, 0, RED);
    for (const sd of [-1, 1]) rbox(b, sd * 0.315, 1.82, 0.25, 0.02, 0.08, 1.5, 0, 0, 0, WHITE);
    b.addMatrix(G.cylZ, plastic(RED), M(0, 1.78, 1.12, 0, 0, 0, 0.36, 0.36, 0.3));
    b.addMatrix(G.cylZ, plastic(C.dkgray), M(0, 1.78, 1.29, 0, 0, 0, 0.3, 0.3, 0.05));
    ell(b, 0, 1.78, 1.36, 0.13, 0.13, 0.16, WHITE);
    // tail boom, stabiliser and fin with a white stripe
    rbox(b, 0, 1.84, -0.85, 0.36, 0.3, 1.1, 0.06, 0, 0, RED);
    rbox(b, 0, 1.9, -1.4, 1.5, 0.06, 0.4, 0, 0, 0, RED);
    rbox(b, 0, 2.12, -1.42, 0.07, 0.48, 0.4, 0, 0, 0, RED);
    rbox(b, 0, 2.2, -1.42, 0.08, 0.08, 0.41, 0, 0, 0, WHITE);
    const mesh = b.build({ name: 'sn-tornado' });
    // the propeller (two wooden blades with gold tips) and its blur disc
    const prop = new THREE.Group(); prop.position.set(0, 1.78, 1.38);
    const pb = new BrickBuilder(0.4);
    rbox(pb, 0, 0, 0, 0.13, 1.3, 0.04, 0, 0.25, 0, WOOD);
    for (const sd of [-1, 1]) rbox(pb, 0, sd * 0.58, 0, 0.14, 0.14, 0.05, 0, 0.25, 0, GOLD);
    prop.add(pb.build({ name: 'sn-tornado-prop', shadows: false }));
    blurMat ||= new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const blur = new THREE.Mesh(blurGeo ||= new THREE.CircleGeometry(0.66, 20), blurMat);
    blur.position.set(0, 1.78, 1.4);
    return {
      mesh, parts: [prop, blur],
      fx(s, dt) { prop.rotation.z += dt * (24 + (s.speed01 || 0) * 14); },
    };
  },
};
let blurMat = null, blurGeo = null, discMat = null, discGeo = null;

// ---- Tails' twin tails: two fluffy orange tails with white tips, spun up as a rotor -----------------
const FOX = 0xf5a224, FLUFF = 0xfaf4e8;
const tails = {
  id: 'sn-tails', name: 'Tails Rotor', blurb: 'Two tails spinning like a propeller', colors: [FOX, FLUFF],
  build({ mast }) {
    const b = new BrickBuilder(0.4);
    mast(b, 1.72, C.dkgray);
    b.cyl(0, 1.66, 0, 0.16, 0.14, C.dkgray, { seg: 10 });
    const mesh = b.build({ name: 'sn-tails' });
    const rotor = new THREE.Group(); rotor.position.set(0, 1.9, 0); rotor.rotation.y = 0.7;
    const rb = new BrickBuilder(0.4);
    ell(rb, 0, 0, 0, 0.3, 0.24, 0.3, FOX);
    for (const sd of [-1, 1]) {
      // a chain of blobs that swells then tapers, curving round like a propeller blade
      const n = 10;
      for (let k = 1; k <= n; k++) {
        const u = k / n, x = sd * (0.15 + u * 2.75), y = S(u * PI) * 0.16, z = sd * 0.35 * u * u;
        const r = 0.17 + S(Math.min(1, u * 1.15) * PI * 0.85) * 0.24;
        ell(rb, x, y, z, r * 1.15, r * 0.8, r, k >= n - 1 ? FLUFF : FOX);
      }
      ell(rb, sd * 3.08, 0.06, sd * 0.4, 0.2, 0.15, 0.17, FLUFF);
    }
    rotor.add(rb.build({ name: 'sn-tails-rotor' }));
    discMat ||= new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(discGeo ||= new THREE.CircleGeometry(3.2, 28).rotateX(-PI / 2), discMat);
    disc.position.set(0, 1.92, 0);
    return {
      mesh, parts: [rotor, disc],
      fx(s, dt) { rotor.rotation.y += dt * (8 + (s.speed01 || 0) * 6); },
    };
  },
};

export default [tornado, tails];
