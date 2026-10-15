// Hedwig, Harry Potter's snowy owl, the Hogwarts map's rescue helper. She flies (no cloud) above
// a stuck kart, gripping the fishing rod in her right foot.
//
// Reference: a female snowy owl (as in the books): mostly white with sparse dark grey/black
// barring on the back, wings, flanks and crown and a clean white face and bib; a big round
// head with no ear tufts; large golden-yellow eyes with black pupils and dark lid rims; a small
// black hooked beak almost buried in face bristles; heavily feathered legs and toes ("boots")
// with black talons; broad rounded wings with layered primaries/secondaries, white underneath,
// with dark bars and spots towards the tips. Smooth sculpted plastic like the LEGO 75979
// brick-built Hedwig (white with light grey shading, printed round eyes).
//
// Contract: facing +Z, +Y up, origin at the bottom-centre of her body. Wings are pivot groups
// `wingL` / `wingR` at the shoulders (each with a `handL` / `handR` wrist joint), the head pivot
// is `head`. userData.grip / gripDir say where the game's rod goes; userData.animate flaps.
import * as THREE from 'three';
import { BrickBuilder, plastic } from '../lego.js';

const WHITE = 0xf5f5f2, SHADE = 0xe2e5e8, SHADE2 = 0xd3d7dc, DARK = 0x34393f, MID = 0x7b8189;
const YELLOW = 0xf6c21c, BLACK = 0x15171a, LID = 0x2a2d31;

const sph = new THREE.SphereGeometry(1, 20, 14);
const sphLo = new THREE.SphereGeometry(1, 12, 8);
const cone = new THREE.ConeGeometry(1, 1, 10).translate(0, 0.5, 0);
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0), Z = V(0, 0, 1);

// ellipsoid at p with radii s, rotated by Euler (rx, ry, rz)
function ell(b, p, s, rot, color, geo = sph) {
  tmpQ.setFromEuler(tmpE.set(rot[0], rot[1], rot[2]));
  b.addMatrix(geo, plastic(color), tmpM.compose(p, tmpQ, s));
}
// a flat mark lying on a surface (normal n): sx along the horizontal tangent, sy across it
function fleck(b, p, n, sx, sy, spin, color = DARK) {
  n = n.clone().normalize();
  let t = new THREE.Vector3().crossVectors(Y, n);
  if (t.lengthSq() < 1e-4) t.set(1, 0, 0);
  t.normalize().applyAxisAngle(n, spin);
  const bt = new THREE.Vector3().crossVectors(n, t);
  tmpM.makeBasis(t.multiplyScalar(sx), bt.multiplyScalar(sy), n.clone().multiplyScalar(0.016)).setPosition(p);
  b.addMatrix(sphLo, plastic(color), tmpM);
}
// a feather lying in the wing (XZ) plane: base at p, pointing along (dx, dz), length len
function feather(b, p, dx, dz, len, wid, thick, color, bars = 0, barColor = DARK) {
  const a = Math.atan2(dx, dz), d = V(Math.sin(a), 0, Math.cos(a));
  ell(b, p.clone().addScaledVector(d, len * 0.5), V(wid, thick, len * 0.5), [0, a, 0], color, sphLo);
  // dark bars across the top surface towards the tip
  for (let i = 0; i < bars; i++) {
    const f = 0.82 - i * 0.24;
    const c = p.clone().addScaledVector(d, len * f);
    const w = wid * Math.sqrt(1 - Math.pow(2 * f - 1, 2)) * 0.8;
    ell(b, c.setY(c.y + thick * 0.82), V(w, 0.016, 0.035), [0, a, 0], barColor, sphLo);
  }
}
// point + normal on an ellipsoid (centre c, radii r) in direction (dx, dy, dz)
function onEll(c, r, dx, dy, dz) {
  const u = V(dx, dy, dz).normalize();
  return { p: V(r.x * u.x, r.y * u.y, r.z * u.z).add(c), n: V(u.x / r.x, u.y / r.y, u.z / r.z).normalize() };
}

// ---- one wing (sd = +1 right / +X, -1 left), root at the shoulder, span along sd*X, chord along Z
function wing(sd) {
  const pivot = new THREE.Group();
  pivot.name = sd > 0 ? 'wingR' : 'wingL';
  pivot.rotation.order = 'ZYX';         // twist about the span first, then sweep, then flap
  const b = new BrickBuilder(1);
  const X = (x) => x * sd;
  // shoulder blending into the body, and the plump leading edge of the arm
  ell(b, V(X(0.05), 0.0, -0.05), V(0.26, 0.17, 0.32), [0, 0, 0], WHITE);
  ell(b, V(X(0.42), 0.03, 0.04), V(0.36, 0.085, 0.17), [0, X(0.05), 0], WHITE);
  ell(b, V(X(0.88), 0.03, 0.02), V(0.3, 0.075, 0.14), [0, X(-0.06), 0], WHITE);
  // lesser coverts: a scalloped row of short rounded feathers
  for (let i = 0; i < 6; i++) {
    const x = 0.12 + i * 0.19;
    feather(b, V(X(x), 0.035, 0.08), X(0.05), -1, 0.34, 0.12, 0.055, i % 2 ? WHITE : SHADE, i > 3 ? 1 : 0);
  }
  // greater coverts
  for (let i = 0; i < 7; i++) {
    const x = 0.1 + i * 0.165;
    feather(b, V(X(x), 0.015, -0.12), X(0.08), -1, 0.36, 0.11, 0.045, i % 2 ? SHADE : WHITE, i > 4 ? 1 : 0, MID);
  }
  // secondaries: broad, round-tipped, forming the trailing edge
  for (let i = 0; i < 8; i++) {
    const x = 0.08 + i * 0.145, len = 0.62 + Math.sin((i / 7) * Math.PI) * 0.08;
    feather(b, V(X(x), -0.005, -0.08), X(0.04 + i * 0.03), -1, len, 0.115, 0.04, i % 2 ? SHADE2 : WHITE, i > 5 ? 2 : (i > 3 ? 1 : 0), MID);
  }
  const arm = b.build({ name: 'wingArm' });
  pivot.add(arm);

  // the hand (wrist joint) carries the primaries; it flexes back on the up-stroke
  const hand = new THREE.Group();
  hand.name = sd > 0 ? 'handR' : 'handL';
  hand.position.set(X(1.14), 0, 0.02);
  const h = new BrickBuilder(1);
  ell(h, V(X(0.16), 0.025, 0.0), V(0.26, 0.07, 0.12), [0, X(-0.2), 0], WHITE);
  // primary coverts
  for (let i = 0; i < 4; i++) {
    const t = i / 3, a = 0.15 + t * 0.9;
    feather(h, V(X(0.02 + t * 0.26), 0.02, 0.02 - t * 0.02), X(Math.sin(a)), -Math.cos(a), 0.34, 0.1, 0.045, i % 2 ? SHADE : WHITE, 1);
  }
  // primaries: long, fanning from backwards to outwards, slightly fingered, dark-barred tips
  const P = 7;
  for (let i = 0; i < P; i++) {
    const t = i / (P - 1), a = 0.25 + t * 1.15;
    const len = 0.66 + t * 0.26 - t * t * 0.12;
    feather(h, V(X(-0.02 + t * 0.32), -0.01 - t * 0.012, -0.02 - t * 0.03), X(Math.sin(a)), -Math.cos(a), len, 0.1, 0.035,
      i % 2 ? SHADE2 : WHITE, i > 1 ? 3 : 2);
  }
  hand.add(h.build({ name: 'wingHand' }));
  pivot.add(hand);
  return pivot;
}

// ---- toes curling round an axis (the rod) at grip, coming from the leg side
function gripFoot(b, grip, axis, legFrom) {
  const e1 = new THREE.Vector3().subVectors(legFrom, grip);
  e1.addScaledVector(axis, -e1.dot(axis)).normalize();              // towards the leg, across the rod
  const e2 = new THREE.Vector3().crossVectors(axis, e1);
  const R = 0.135;
  const at = (phi, off, r = R) => grip.clone().addScaledVector(e1, Math.cos(phi) * r).addScaledVector(e2, Math.sin(phi) * r).addScaledVector(axis, off);
  // the fluffy foot pad on the leg side of the rod
  ell(b, at(0, 0, R + 0.05), V(0.13, 0.12, 0.13), [0, 0, 0], WHITE);
  // two toes wrap one way, two the other (owls' zygodactyl grip)
  const toes = [[1, -0.075], [1, 0.03], [-1, -0.03], [-1, 0.075]];
  for (const [dir, off] of toes) {
    const pts = [];
    for (let k = 0; k <= 6; k++) pts.push(at(dir * (0.15 + (k / 6) * 1.85), off));
    const curve = new THREE.CatmullRomCurve3(pts);
    b.addMatrix(new THREE.TubeGeometry(curve, 10, 0.042, 7, false), plastic(WHITE), tmpM.identity());
    // feather fluff on the toe and the black talon curling inwards at its end
    ell(b, at(dir * 0.55, off, R + 0.02), V(0.06, 0.06, 0.06), [0, 0, 0], WHITE, sphLo);
    const end = at(dir * 2.0, off), tan = at(dir * 2.25, off, R * 0.8).sub(end).normalize();
    tmpQ.setFromUnitVectors(Y, tan);
    b.addMatrix(cone, plastic(BLACK, { rough: 0.2 }), tmpM.compose(end, tmpQ, V(0.03, 0.11, 0.03)));
  }
}

export function build() {
  const root = new THREE.Group();
  root.name = 'hedwig';

  // ---- body: a plump egg tilted forward (hovering, reaching for the catch) ----
  const bodyG = new THREE.Group();
  bodyG.rotation.x = 0.38;
  const b = new BrickBuilder(1);
  // one smooth solid of revolution: round bottom, full belly, sloping shoulders up into the head
  const PROF = [[0, 0], [0.3, 0.04], [0.5, 0.15], [0.6, 0.33], [0.645, 0.58], [0.635, 0.85], [0.6, 1.1],
    [0.54, 1.33], [0.46, 1.52], [0.34, 1.68], [0.16, 1.78], [0, 1.8]];
  const ZS = 0.92;                                                             // a little deeper than wide
  const latheG = new THREE.LatheGeometry(PROF.map(([r, y]) => new THREE.Vector2(r, y)), 32);
  b.addMatrix(latheG, plastic(WHITE), tmpM.makeScale(1, 1, ZS));
  const rAt = (y) => {
    for (let i = 1; i < PROF.length; i++) if (y <= PROF[i][1]) {
      const [r0, y0] = PROF[i - 1], [r1, y1] = PROF[i], k = (y - y0) / (y1 - y0);
      return { r: r0 + (r1 - r0) * k, dr: (r1 - r0) / (y1 - y0) };
    }
    return { r: 0, dr: 0 };
  };
  const onBody = (dx, dy, dz) => {
    const u = V(dx, dy, dz).normalize(), a = Math.atan2(u.x, u.z), y = 0.9 + 0.88 * u.y;
    const { r, dr } = rAt(y);
    return { p: V(Math.sin(a) * r, y, Math.cos(a) * r * ZS), n: V(Math.sin(a), -dr, Math.cos(a) / ZS).normalize() };
  };
  // tail: a short rounded fan at the back-bottom, with dark bars
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.22;
    const p = V(Math.sin(a) * 0.14, 0.3, -0.3);
    const d = V(Math.sin(a) * 0.7, -0.85, -1).normalize();
    const len = 0.62 - Math.abs(i - 2) * 0.05;
    const q = new THREE.Quaternion().setFromUnitVectors(Z, d);
    const c = p.clone().addScaledVector(d, len * 0.5);
    b.addMatrix(sphLo, plastic(i % 2 ? SHADE : WHITE), tmpM.compose(c, q, V(0.12, 0.04, len * 0.5)));
    for (const f of [0.6, 0.85]) {
      const m = p.clone().addScaledVector(d, len * f).add(V(0, 0.035, 0).applyQuaternion(q));
      b.addMatrix(sphLo, plastic(DARK), tmpM.compose(m, q, V(0.07, 0.014, 0.03)));
    }
  }
  // sparse dark barring: denser on the back and flanks, a few on the lower breast; bib stays white
  const marks = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {          // back
    if (rnd() < 0.3) continue;
    const ang = Math.PI + (j - 1.5) * 0.42 + (i % 2) * 0.2 + (rnd() - 0.5) * 0.2, y = -0.4 + i * 0.16 + (rnd() - 0.5) * 0.06;
    marks.push([Math.sin(ang), y, Math.cos(ang), 0.06 + rnd() * 0.025, 0.024]);
  }
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) for (let j = 0; j < 2; j++) {  // flanks
    if (rnd() < 0.3) continue;
    const ang = sd * (1.3 + j * 0.4) + (i % 2) * 0.15 * sd, y = -0.6 + i * 0.2 + (rnd() - 0.5) * 0.06;
    marks.push([Math.sin(ang), y, Math.cos(ang), 0.065, 0.022]);
  }
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4 - (i % 2); j++) {  // lower breast, thinning out upwards
    if (rnd() < 0.25 + i * 0.12) continue;
    const ang = (j - 1.5 + (i % 2) * 0.5) * 0.38 + (rnd() - 0.5) * 0.2, y = -0.62 + i * 0.16 + (rnd() - 0.5) * 0.05;
    marks.push([Math.sin(ang), y, Math.cos(ang), 0.05 + rnd() * 0.015, 0.019]);
  }
  for (const [dx, dy, dz, sx, sy] of marks) {
    const { p, n } = onBody(dx, dy, dz);
    fleck(b, p, n, sx, sy, (rnd() - 0.5) * 0.4);                         // a short dark bar
  }
  bodyG.add(b.build({ name: 'hedwigBody' }));
  root.add(bodyG);

  // ---- head: big, round, no ear tufts; on a pivot at the neck ----
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.5, 0.62);
  head.scale.setScalar(1.1);
  const hb = new BrickBuilder(1);
  const HC = V(0, 0.36, 0.02), HR = V(0.53, 0.47, 0.5);
  ell(hb, HC, HR, [0, 0, 0], WHITE);
  ell(hb, V(0, 0.3, 0.2), V(0.47, 0.38, 0.36), [0, 0, 0], WHITE);           // cheeks / facial disc
  // speckled crown and nape
  for (let i = 0; i < 14; i++) {
    const a = i * 2.399, r = 0.25 + (i % 4) * 0.17;
    const { p, n } = onEll(HC, HR, Math.sin(a) * r, 0.75 - (i % 3) * 0.12, Math.cos(a) * r - 0.35);
    if (n.z > 0.45 && n.y < 0.7) continue;                                 // keep the face clean
    fleck(hb, p, n, 0.028, 0.02, a, i % 3 ? DARK : MID);
  }
  for (let i = 0; i < 6; i++) {                                            // nape bars
    const a = Math.PI + (i - 2.5) * 0.35;
    const { p, n } = onEll(HC, HR, Math.sin(a), -0.15 + (i % 2) * 0.18, Math.cos(a));
    fleck(hb, p, n, 0.055, 0.02, 0);
  }
  // eyes: big golden-yellow discs, black pupils, dark lid rims, a white glint; white brows over them
  const EC = V(0, 0.3, 0.2), ER = V(0.47, 0.38, 0.36);
  for (const sd of [-1, 1]) {
    const { p, n } = onEll(EC, ER, sd * 0.42, 0.18, 0.9);
    const q = new THREE.Quaternion().setFromUnitVectors(Z, n);
    const put = (off, s, col, mo) => hb.addMatrix(sph, plastic(col, mo), tmpM.compose(p.clone().addScaledVector(n, off), q, s));
    put(-0.012, V(0.145, 0.145, 0.05), LID);
    put(0.0, V(0.125, 0.125, 0.05), YELLOW, { rough: 0.15 });
    put(0.022, V(0.062, 0.066, 0.035), BLACK, { rough: 0.1 });
    const g = p.clone().addScaledVector(n, 0.05).add(V(sd * 0.02 + 0.015, 0.03, 0));
    hb.addMatrix(sphLo, plastic(0xffffff), tmpM.compose(g, q, V(0.02, 0.02, 0.01)));
    // brow: a soft white ridge slightly lidding the top of the eye (that fierce owl look)
    ell(hb, p.clone().add(V(-sd * 0.005, 0.125, -0.012)), V(0.135, 0.04, 0.07), [-0.25, sd * 0.35, sd * 0.1], WHITE);
  }
  // beak: small, black and hooked, mostly hidden in the bristly face feathers
  {
    const { p } = onEll(EC, ER, 0, -0.12, 1);
    ell(hb, p.clone().add(V(0, 0.0, -0.01)), V(0.055, 0.075, 0.06), [0.3, 0, 0], BLACK);
    tmpQ.setFromEuler(tmpE.set(Math.PI * 0.82, 0, 0));
    hb.addMatrix(cone, plastic(BLACK, { rough: 0.2 }), tmpM.compose(p.clone().add(V(0, -0.02, 0.035)), tmpQ, V(0.035, 0.1, 0.035)));
    for (const sd of [-1, 1]) {                                             // bristle tufts round the beak
      ell(hb, p.clone().add(V(sd * 0.06, 0.02, -0.012)), V(0.06, 0.08, 0.05), [0, 0, sd * 0.4], WHITE, sphLo);
      ell(hb, p.clone().add(V(sd * 0.045, -0.065, -0.025)), V(0.05, 0.045, 0.045), [0, 0, sd * 0.3], WHITE, sphLo);
    }
    ell(hb, p.clone().add(V(0, 0.07, -0.015)), V(0.045, 0.055, 0.045), [0, 0, 0], WHITE, sphLo);
  }
  head.add(hb.build({ name: 'hedwigHead' }));
  root.add(head);

  // ---- legs: fluffy feathered "boots"; the right foot (+X) grips the rod in front of her ----
  const gripDir = V(0.55, 0.72, 0.42).normalize();
  const grip = V(0.42, -0.32, 0.92);
  const lb = new BrickBuilder(1);
  for (const sd of [-1, 1]) ell(lb, V(sd * 0.26, 0.3, 0.42), V(0.22, 0.26, 0.24), [0.5, 0, -sd * 0.2], WHITE);   // thighs ("trousers")
  // right leg reaching down and forward to the rod
  {
    const top = V(0.3, 0.2, 0.52), knee = grip.clone().lerp(top, 0.5).add(V(0.02, 0.0, -0.03));
    const curve = new THREE.CatmullRomCurve3([top, knee, grip.clone().add(V(-0.05, 0.16, -0.12))]);
    lb.addMatrix(new THREE.TubeGeometry(curve, 10, 0.13, 10, false), plastic(WHITE), tmpM.identity());
    for (let k = 0; k < 4; k++) ell(lb, curve.getPoint(0.12 + k * 0.24), V(0.18 - k * 0.015, 0.16, 0.18 - k * 0.015), [0, 0, 0], k % 2 ? WHITE : SHADE, sphLo);
    gripFoot(lb, grip, gripDir, curve.getPoint(0.85));
  }
  // left leg tucked up under the body, toes balled, talons showing
  {
    const top = V(-0.28, 0.18, 0.5), foot = V(-0.3, -0.08, 0.72);
    const curve = new THREE.CatmullRomCurve3([top, top.clone().lerp(foot, 0.5).add(V(0, 0, -0.03)), foot]);
    lb.addMatrix(new THREE.TubeGeometry(curve, 8, 0.12, 10, false), plastic(WHITE), tmpM.identity());
    ell(lb, curve.getPoint(0.5), V(0.15, 0.15, 0.15), [0, 0, 0], SHADE, sphLo);
    ell(lb, foot, V(0.15, 0.11, 0.16), [0, 0, 0], WHITE);
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.5;
      const p = foot.clone().add(V(Math.sin(a) * 0.1, -0.06, 0.1 + Math.cos(a) * 0.03));
      tmpQ.setFromUnitVectors(Y, V(Math.sin(a) * 0.3, -0.7, 0.4).normalize());
      lb.addMatrix(cone, plastic(BLACK, { rough: 0.2 }), tmpM.compose(p, tmpQ, V(0.028, 0.1, 0.028)));
    }
  }
  root.add(lb.build({ name: 'hedwigLegs' }));

  // ---- wings on shoulder pivots, at rest half-raised (mid up-stroke) ----
  for (const sd of [-1, 1]) {
    const w = wing(sd);
    w.position.set(sd * 0.42, 1.38, 0.12);
    w.rotation.set(-0.6, sd * 0.12, sd * 0.55);   // pitched up: underside to the front, braking to grab
    root.add(w);
  }

  root.userData.grip = grip.clone();
  root.userData.gripDir = gripDir.clone();
  // flapping: ~2.3 beats a second, quicker down-stroke with the leading edge pitched down, a slower
  // up-stroke with the hands flexed back; the head stays steady with a slow curious tilt
  root.userData.animate = (obj, t) => {
    const ph = (t * 2.3) % 1;
    const down = ph < 0.42;
    const s = down ? Math.cos(Math.PI * ph / 0.42) : -Math.cos(Math.PI * (ph - 0.42) / 0.58);   // 1 = top, -1 = bottom
    const v = down ? Math.sin(Math.PI * ph / 0.42) : -Math.sin(Math.PI * (ph - 0.42) / 0.58);   // >0 going down
    for (const sd of [-1, 1]) {
      const w = obj.getObjectByName(sd > 0 ? 'wingR' : 'wingL');
      if (w) {
        w.rotation.z = sd * (0.3 + 0.62 * s);
        w.rotation.x = -0.45 + 0.32 * v;
        w.rotation.y = sd * (0.12 - 0.08 * v);
      }
      const h = obj.getObjectByName(sd > 0 ? 'handR' : 'handL');
      if (h) {
        h.rotation.y = sd * (v < 0 ? -v * 0.45 : 0);     // fold back on the up-stroke
        h.rotation.z = sd * (-0.12 * s + 0.08);           // tips lag the stroke
      }
    }
    const hd = obj.getObjectByName('head');
    if (hd) { hd.rotation.z = 0.14 * Math.sin(t * 1.1); hd.rotation.y = 0.12 * Math.sin(t * 0.7 + 1); hd.rotation.x = 0.03 * s; }
  };
  return root;
}
