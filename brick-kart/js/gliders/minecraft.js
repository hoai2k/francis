// Minecraft gliders (see the contract at the top of js/gliders.js): the Elytra, built from stepped
// pixel slats with an enchantment shimmer, and a Ghast whose pixel-skinned cube floats overhead
// while its tentacles dangle and sway (the driver hangs on to the middle one).
import * as THREE from 'three';
import { BrickBuilder, C } from '../lego.js';
import { skin, atlasGeo, rows } from '../drivers/minecraft-kit.js';

const e = new THREE.Euler(), q = new THREE.Quaternion();
const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const S = Math.sin;

// ---- Elytra: two grey-violet membrane wings made of pixel slats, each a step shorter going back ------
const EL = { lt: 0xaaa6c0, md: 0x8f89aa, dk: 0x6c6688, edge: 0x4c4666 };
let glintMat = null;
const elytra = {
  id: 'mc-elytra', name: 'Elytra', blurb: 'Found in an End City, enchanted for the ramps', colors: [EL.md, EL.edge],
  build({ mast }) {
    const b = new BrickBuilder(0.4);
    mast(b, 1.72, C.dkgray);
    // the leather harness the wings hang from, with a pixel trim
    b.boxM(M(0, 1.8, 0.05, 0, 0, 0, 0.7, 0.18, 1.2), EL.edge);
    b.boxM(M(0, 1.9, 0.05, 0, 0, 0, 0.44, 0.06, 0.9), EL.dk);
    const mesh = b.build({ name: 'mc-elytra' });
    glintMat ||= new THREE.MeshBasicMaterial({ color: 0xb070ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
    const wings = [];
    for (const sd of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(sd * 0.3, 1.82, 0.05);
      const wb = new BrickBuilder(0.4), gb = new BrickBuilder(0.4);
      // spanwise slats from the leading edge back: long at the front, a pixel step shorter each row
      for (let j = 0; j < 7; j++) {
        const len = 3.25 - j * 0.38, z = 0.48 - j * 0.24, col = j % 2 ? EL.md : EL.lt;
        wb.boxM(M(sd * len / 2, -j * 0.012, z, 0, 0, 0, len, 0.09, 0.24), col);
        wb.boxM(M(sd * (len - 0.12), -j * 0.012 - 0.005, z, 0, 0, 0, 0.24, 0.1, 0.25), EL.dk);   // darker tip pixel
        if (j > 0 && j < 6) wb.boxM(M(sd * (0.45 + (j % 3) * 0.5), 0.05 - j * 0.012, z, 0, 0, 0, 0.24, 0.02, 0.24), EL.dk); // feather spots
        gb.boxM(M(sd * len / 2, 0.06 - j * 0.012, z, 0, 0, 0, len - 0.1, 0.01, 0.22), 0, { mat: glintMat });
      }
      // thick leading edge (the wing's "arm") curling down at the tip
      wb.boxM(M(sd * 1.6, 0.04, 0.68, 0, 0, 0, 3.2, 0.16, 0.2), EL.edge);
      wb.boxM(M(sd * 3.3, -0.06, 0.6, 0, 0, sd * -0.5, 0.3, 0.14, 0.2), EL.edge);
      p.add(wb.build({ name: 'mc-elytra-wing', shadows: true }), gb.build({ name: 'mc-elytra-glint', shadows: false }));
      wings.push({ p, sd });
    }
    return {
      mesh, parts: wings.map((w) => w.p),
      fx(s) {
        const f = S(s.t * 2.4), sp = s.speed01 || 0;
        for (const { p, sd } of wings) {
          p.rotation.z = sd * (0.1 + f * 0.09);        // slow flap (dihedral breathing)
          p.rotation.y = sd * (0.06 + sp * 0.16);       // sweep back as it speeds up
          p.rotation.x = -0.06 + f * 0.03;
        }
        glintMat.opacity = 0.14 + 0.12 * (0.5 + 0.5 * S(s.t * 3.1));
      },
    };
  },
};

// ---- Ghast: a big white cube with a crying pixel face and nine tentacles --------------------------------
const W = 0xf0f0f0, L = 0xd8d8d8, K = 0x3a3a3a, Gy = 0xa8a8a8, R = 0xb02020;
const face = (g, p, n = 0.04) => ({ g, p, n });
const side = face(rows(['wwwwwwww', 2], ['wwwlwwww'], ['wwwwwwlw'], ['wwwwwwww', 2], ['wlwwwwww'], ['wwwwwwww']), { w: W, l: L });
const sleepy = face([
  'wwwwwwwwwwww', 'wwwwwwwwwwww', 'wwwwwwwwwwww', 'wwwwwwwwwwww',
  'wkkkwwwwkkkw', 'wwgwwwwwwgww', 'wwgwwwwwwgww', 'wwwwwwwwwwww',
  'wwwwkkkkwwww', 'wwwwkkkkwwww', 'wwwwwwwwwwww', 'wwwwwwwwwwww'], { w: W, k: K, g: Gy });
const angry = face([
  'wwwwwwwwwwww', 'wwwwwwwwwwww', 'wwwwwwwwwwww', 'wkkkwwwwkkkw',
  'wkrkwwwwkrkw', 'wkkkwwwwkkkw', 'wwgwwwwwwgww', 'wwwwwwwwwwww',
  'wwwkkkkkkwww', 'wwwkrrrrkwww', 'wwwkrrrrkwww', 'wwwkkkkkkwww'], { w: W, k: K, g: Gy, r: R });
const tent = face(rows(['wwww', 3], ['llll']), { w: W, l: L });
const ghast = {
  id: 'mc-ghast', name: 'Ghast', blurb: 'A Nether ghast, too sleepy to shoot', colors: [W, Gy], scale: 1.3, lift: 2.2,   // a huge ghast floating high overhead on a leash
  build() {
    const calm = skin('mcg-ghast', { front: sleepy, all: side });
    const mad = skin('mcg-ghast-mad', { front: angry, all: side });
    const tm = skin('mcg-ghast-tent', { all: tent, top: W, bottom: W });
    const b = new BrickBuilder(0.4);
    b.addMatrix(atlasGeo(2.4, 1.9, 2.2), calm, M(0, 2.3, 0));
    // the middle tentacle hangs to the driver's hands and ends in a grip bar
    b.addMatrix(atlasGeo(0.24, 1.35, 0.24), tm, M(0, 0.68, 0));
    b.boxM(M(0, 0, 0, 0, 0, 0, 0.9, 0.16, 0.16), C.ltgray);
    const mesh = b.build({ name: 'mc-ghast' });
    const body = mesh.children.find((m) => m.material === calm);
    // eight swaying tentacles round it (3 x 3 grid minus the middle)
    const tents = [];
    let i = 0;
    for (const x of [-0.78, 0, 0.78]) for (const z of [-0.72, 0, 0.72]) {
      if (!x && !z) continue;
      const len = 0.6 + ((i * 7) % 5) * 0.12;
      const p = new THREE.Group(); p.position.set(x, 1.36, z);
      const m = new THREE.Mesh(atlasGeo(0.24, len, 0.24), tm); m.position.y = -len / 2; m.castShadow = true;
      p.add(m); tents.push({ p, ph: i * 1.7, ph2: i * 2.3 }); i++;
    }
    let mood = 0;
    return {
      mesh, parts: tents.map((o) => o.p),
      fx(s) {
        const sp = s.speed01 || 0;
        for (const { p, ph, ph2 } of tents) {
          p.rotation.x = 0.12 + sp * 0.35 + S(s.t * 2.3 + ph) * 0.22;
          p.rotation.z = S(s.t * 1.7 + ph2) * 0.16;
        }
        // now and then it opens its eyes and screeches
        const m = (s.t % 7) > 6.3 ? 1 : 0;
        if (body && m !== mood) { mood = m; body.material = m ? mad : calm; }
      },
    };
  },
};

export default [elytra, ghast];
