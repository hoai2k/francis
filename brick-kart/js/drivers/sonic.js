// Sonic the Hedgehog drivers: brick-built Mobians (./sonic-kit.js) with big round heads,
// sculpted eyes, quills, white gloves and chunky shoes, plus Dr. Eggman. Each has a signature
// cheer / taunt / trick with effect parts run by rig.fx: Sonic's finger-wag and thumbs up with
// orbiting rings, Tails' spinning twin tails, Knuckles' spiked punches, Amy's Piko Piko Hammer,
// Shadow's Chaos Control flash, Silver's psychokinesis, Rouge's wings and jewel, Cream's Cheese,
// Blaze's fire, Metal Sonic's overdrive, Big's fishing rod with Froggy and Eggman's shaking fist.
import {
  THREE, BrickBuilder, C, plastic, S, CO, PI, abs, UP, LOOP, seg, sm, lerp, bump, vis,
  GLOVE, PEACH, EMERALDS, neon, metal, addGlow, fxg, blob, spike, ring, emerald, heartGeo, burst, flame, orbit,
  toon, part, rod,
} from './sonic-kit.js';
import { seatedFig } from './kit.js';

const winF = (t) => (t % 1.6) / 1.6;
// show a prop only for some gestures (the whole time for the looping win phase)
const during = (n, f, list, a = 0.06, b = 0.94) => list.includes(n) && (n === 'win' || (f > a && f < b));
// a spinning spark star (impact / glint) parented to p
const star = (p, c, size = 0.5, seed = 3) => burst(p, c, 8, size, seed);
const pulse = (g, t, k = 1) => { g.rotation.set(t * 7, t * 11, 0); g.scale.setScalar(k * (0.75 + abs(S(t * 23)) * 0.45)); };

// ---- Sonic ---------------------------------------------------------------------------------
const BLUE = 0x1f5fd8;
function sonicQuills(H, c, o = {}) {
  const r = o.r ?? 0.46;
  H.quill(PI, 0.65, 0.5, 2.35, r, c);
  for (const sd of [-1, 1]) {
    H.quill(PI - sd * 0.7, 0.35, 0.22, 2.2, r * 0.95, c, PI - sd * 0.95);
    H.quill(PI - sd * 0.95, -0.15, -0.4, 1.95, r * 0.8, c, PI - sd * 1.25);
    H.quill(PI - sd * 0.45, -0.1, -0.2, 2.1, r * 0.9, c, PI - sd * 0.55);
  }
  H.quill(PI, -0.05, -0.32, 2.15, r * 0.95, c);
}
function sonic() {
  const rig = toon({
    name: 'sonic', body: BLUE, belly: PEACH, iris: 0x22b04a, mouth: 'smirk',
    eyes: { dx: 0.2, w: 0.22, h: 0.32, joined: true },
    ears: { inner: PEACH },
    head: (H) => sonicQuills(H, BLUE),
    torso: (b, d) => { const s = d.s; for (const sd of [-1, 1]) spike(b, [sd * 0.12 * s, d.chestY + 0.5 * s, -0.12 * s], [sd * 0.14 * s, d.chestY + 0.3 * s, -0.55 * s], 0.13 * s, BLUE); },
  });
  const s = rig.dims.s;
  // index finger (finger-wag) and thumb (thumbs up) on the right glove
  const finger = part(rig.armR, (b) => b.cyl(0, -0.9 * s, 0, 0.045 * s, 0.22 * s, GLOVE, { seg: 8 }), 'sonic-finger');
  const thumb = part(rig.armR, (b) => blob(b, 0, -0.6 * s, 0.17 * s, 0.05 * s, 0.05 * s, 0.13 * s, GLOVE), 'sonic-thumb');
  const glint = star(thumb, 0xffffff, 0.35, 7); glint.position.set(0, -0.6 * s, 0.32 * s);
  const rings = orbit(rig.root, Array.from({ length: 7 }, () => ring(new THREE.Group(), 1.1)), 1.4);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer';
    vis(finger, (ch && f < 0.5) || n === 'taunt');
    const th = (ch && f >= 0.5) || n === 'win';
    vis(thumb, th); vis(glint, th && (n === 'win' ? winF(t) > 0.1 && winF(t) < 0.5 : f > 0.55 && f < 0.85));
    if (glint.visible) pulse(glint, t, 0.7);
    rings.set(n === 'win', t, 1.75, 2.6);
  };
  return rig;
}

// ---- Tails -----------------------------------------------------------------------------------
const TAILS = 0xf5a224;
function tails() {
  const rig = toon({
    name: 'tails', body: TAILS, skin: 0xfaf4e8, belly: 0xfaf4e8, arms: TAILS, iris: 0x2a78e0, mouth: 'smile',
    eyes: { dx: 0.28, w: 0.19, h: 0.3 }, ears: { inner: 0xfaf4e8, len: 0.75, r: 0.26, a: 0.55 },
    head: (H) => { for (const k of [-1, 0, 1]) H.quill(k * 0.18, 0.62, 0.42 - abs(k) * 0.1, 1.28, 0.2, TAILS, k * 0.3); for (const sd of [-1, 1]) H.quill(sd * 1.2, -0.1, -0.35, 1.25, 0.24, 0xfaf4e8, sd * 1.35); },
    torso: (b, d) => { const s = d.s; for (const k of [-1, 0, 1]) spike(b, [k * 0.08 * s, d.chestY + 0.72 * s, 0.12 * s], [k * 0.14 * s, d.chestY + 0.5 * s, 0.34 * s], 0.09 * s, 0xfaf4e8); },
  });
  const s = rig.dims.s;
  // the twin tails on a rotor behind the seat: they wag, then spin like a propeller
  const rotor = new THREE.Group(); rotor.position.set(0, 0.35 * s, -0.3 * s); rig.torso.add(rotor);
  const tb = new BrickBuilder(1);
  for (const sd of [-1, 1]) {
    const dx = S(sd * 0.55) * 0.85, dy = CO(0.55) * 0.85, dz = -0.45;
    for (let k = 1; k <= 4; k++) { const u = k / 4, r = (0.13 + S(u * PI) * 0.09) * s; blob(tb, dx * u * s, dy * u * s, dz * u * s, r, r, r * 1.2, k === 4 ? 0xfaf4e8 : TAILS); }
    blob(tb, dx * 1.18 * s, dy * 1.18 * s, dz * 1.18 * s, 0.12 * s, 0.12 * s, 0.14 * s, 0xfaf4e8);
  }
  rotor.add(tb.build({ name: 'tails-tails', shadows: false }));
  const blur = addGlow(rotor, 0xffe2a0, 1.6 * s, 0, 0.4 * s, -0.35 * s, 0.35); blur.visible = false;
  let spin = 0;
  rig.idle = (t, dt, an, st) => {
    const g = an.g?.name, fast = st.gliding || st.phase === 'win' || g === 'cheer' || g === 'trick';
    if (fast) { spin += dt * (st.gliding ? 22 : 16); rotor.rotation.z = spin; }
    else { spin = spin % PI; spin += (S(t * 3) * 0.25 - spin) * Math.min(1, dt * 6); rotor.rotation.z = spin; }
    vis(blur, fast);
  };
  return rig;
}

// ---- Knuckles ---------------------------------------------------------------------------------
const KNUX = 0xd2202c;
function knuckles() {
  const rig = toon({
    name: 'knuckles', s: 1.2, wide: 0.9, body: KNUX, arms: KNUX, iris: 0x7a36c8, mouth: 'frown', shoes: 0x2f9a3a, strap: 0xf2c020,
    eyes: { dx: 0.28, w: 0.2, h: 0.28, lid: KNUX },
    head: (H) => {
      // dreadlocks hanging down the back and sides
      H.quill(PI, 0.4, -0.75, 2.15, 0.34);
      for (const sd of [-1, 1]) { H.quill(PI - sd * 0.55, 0.35, -0.7, 2.1, 0.32, KNUX, PI - sd * 0.8); H.quill(PI - sd * 1.1, 0.3, -0.65, 1.95, 0.3, KNUX, PI - sd * 1.45); H.quill(sd * 1.45, 0.55, -0.45, 1.75, 0.28, KNUX, sd * 1.75); }
      H.quill(0, 0.85, 0.55, 1.2, 0.2, KNUX);
    },
    torso: (b, d) => { const s = d.s; for (const sd of [-1, 1]) blob(b, sd * 0.1 * s, d.chestY + 0.6 * s, 0.215 * s, 0.15 * s, 0.045 * s, 0.03 * s, C.white, [0, 0, 1], -sd * 0.55); },
    arm: (ab, sd, d) => {
      const s = d.s;
      ab.sphere(0, -0.66 * s, 0, 0.19 * s, GLOVE);
      for (const x of [-1, 1]) spike(ab, [x * 0.06 * s, -0.74 * s, 0.06 * s], [x * 0.07 * s, -0.95 * s, 0.1 * s], 0.055 * s, GLOVE);
    },
  });
  const s = rig.dims.s;
  const hitR = star(rig.armR, 0xffd040, 0.55, 3), hitL = star(rig.armL, 0xffd040, 0.55, 9);
  hitR.position.y = hitL.position.y = -1.0 * s;
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', w = n === 'win';
    const k = ch ? S(t * 14) : w ? S(t * LOOP * 2) : 0;
    vis(hitR, (ch || w) && k > 0.75); vis(hitL, ch && k < -0.75);
    if (hitR.visible) pulse(hitR, t); if (hitL.visible) pulse(hitL, t);
  };
  return rig;
}
const punch = (f, t) => { const k = S(t * 14); return { rx: -1.15 - Math.max(0, k) * 0.55, rz: 0.1, lx: -1.15 - Math.max(0, -k) * 0.55, lz: -0.1, ty: k * 0.3, hx: -0.1, tz: k * 0.04, by: abs(k) * 0.03 }; };

// ---- Amy Rose ------------------------------------------------------------------------------------
const AMY = 0xf47fb6, DRESS = 0xd8202c;
function amy() {
  const rig = toon({
    name: 'amy', s: 1.1, body: AMY, torso: DRESS, iris: 0x3eb04a, mouth: 'smile', legs: DRESS, hips: DRESS, cuff: 0xf2c020, shoes: DRESS,
    eyes: { dx: 0.27, w: 0.2, h: 0.3, lash: true }, ears: { inner: PEACH, len: 0.45 },
    head: (H, hb) => {
      for (const sd of [-1, 0, 1]) H.quill(sd * 0.32, 0.72, 0.42, 1.18, 0.22, AMY, sd * 0.42);   // bangs
      for (const sd of [-1, 1]) { H.quill(PI - sd * 0.45, 0.1, -0.7, 1.45, 0.3, AMY, PI - sd * 0.55); H.quill(sd * 1.5, 0.1, -0.75, 1.35, 0.28, AMY, sd * 1.6); }
      H.quill(PI, 0.2, -0.75, 1.5, 0.3, AMY);
      hb.cyl(0, H.cy + 0.42 * H.R, 0, H.R * 0.94, 0.13 * H.R, DRESS, { seg: 20 });                 // headband
    },
    torso: (b, d) => { const s = d.s; b.cyl(0, d.chestY + 0.78 * s, 0, 0.27 * s * d.W, 0.06 * s, C.white, { seg: 16 }); b.box(0, d.chestY - 0.02 * s, 0, 1.0 * s * d.W, 0.08 * s, 0.52 * s, C.white); },
  });
  const s = rig.dims.s;
  // Piko Piko Hammer: yellow handle, red head with yellow bands
  const hammer = part(rig.armR, (b) => {
    b.cyl(0, -1.15 * s, 0, 0.05 * s, 0.6 * s, 0xf2c020, { seg: 8 });
    rod(b, [0, -1.25 * s, -0.26 * s], [0, -1.25 * s, 0.26 * s], 0.22 * s, DRESS, 14);
    for (const z of [-0.2, 0.2]) rod(b, [0, -1.25 * s, (z - 0.035) * s], [0, -1.25 * s, (z + 0.035) * s], 0.225 * s, 0xf2c020, 14);
  }, 'piko-hammer');
  const boom = star(hammer, 0xffe060, 0.7, 5); boom.position.set(0, -1.25 * s, 0.4 * s);
  const hearts = fxg(rig.root);
  for (let k = 0; k < 4; k++) { const h = new THREE.Mesh(heartGeo(), neon(0xff5aa0, 1.2)); h.scale.setScalar(0.32); hearts.add(h); }
  rig.fx = (n, f, t) => {
    vis(hammer, during(n, f, ['cheer', 'win', 'use', 'throwF']));
    const hit = n === 'cheer' && f > 0.45 && f < 0.7;
    vis(boom, hit); if (hit) pulse(boom, t, 1.2);
    const hv = n === 'taunt' || n === 'win' || (n === 'cheer' && f > 0.5);
    vis(hearts, hv);
    if (hv) hearts.children.forEach((h, k) => { const u = ((n === 'win' ? t * 0.6 : f * 1.4) + k * 0.25) % 1; h.position.set(S(k * 2.3 + u * 4) * 0.6, 1.6 + u * 1.6, 0.4 + CO(k * 1.7) * 0.4); h.rotation.y = t * 2 + k; h.scale.setScalar(0.32 * S(u * PI)); });
  };
  return rig;
}

// ---- Shadow ------------------------------------------------------------------------------------
const SHADOW = 0x24252c, STREAK = 0xd8202c;
function shadow() {
  const rig = toon({
    name: 'shadow', body: SHADOW, skin: 0xe8b890, belly: null, iris: 0xd81818, mouth: 'smirk', cuff: 0xf2c020, shoes: 0xf2f2f2, strap: STREAK, sole: 0x24252c,
    eyes: { dx: 0.24, w: 0.21, h: 0.27, lid: SHADOW, tilt: -0.2 }, ears: { inner: 0xe8b890 },
    head: (H) => {
      // upswept quills with red streaks
      const q = (yaw, p0, p1, len, r, yaw1 = yaw) => { H.quill(yaw, p0, p1, len, r, SHADOW, yaw1); H.quill(yaw, p0 + 0.1, p1 + 0.08, len * 0.94, r * 0.62, STREAK, yaw1); };
      q(PI, 0.55, 0.88, 2.0, 0.4);
      for (const sd of [-1, 1]) { q(PI - sd * 0.55, 0.25, 0.5, 1.9, 0.38, PI - sd * 0.45); q(PI - sd * 0.8, -0.2, -0.05, 1.6, 0.3, PI - sd * 0.75); }
      q(PI, -0.05, 0.2, 1.85, 0.36);
    },
    torso: (b, d) => { const s = d.s; blob(b, 0, d.chestY + 0.72 * s, 0.17 * s, 0.22 * s, 0.17 * s, 0.13 * s, C.white); },
  });
  const s = rig.dims.s;
  const gem = new THREE.Group(); gem.position.set(0, -0.86 * s, 0.05 * s); rig.armR.add(gem); gem.visible = false;
  emerald(gem, EMERALDS[0], 0.24); addGlow(gem, 0x40ff70, 0.9, 0, 0, 0, 0.7);
  const flash = fxg(rig.root, 0, 1.4, 0); addGlow(flash, 0xffffff, 3, 0, 0, 0, 0.95); addGlow(flash, 0x60ff90, 5, 0, 0, 0, 0.6);
  // hover-shoe jets
  const jets = [-1, 1].map((sd) => { const g = addGlow(rig.torso, 0x40c0ff, 0.7 * s, sd * 0.2 * s, -0.42 * s, 0.5 * s, 0.85); g.visible = false; return g; });
  rig.fx = (n, f, t) => {
    vis(gem, during(n, f, ['cheer', 'win', 'use']));
    const fl = n === 'cheer' ? bump(f, 0.45, 0.8) : n === 'win' ? Math.max(0, S(t * LOOP) - 0.6) * 2.5 : 0;
    vis(flash, fl > 0.02); if (fl > 0.02) flash.scale.setScalar(0.4 + fl * 1.3);
    if (gem.visible) gem.rotation.y = t * 3;
  };
  rig.idle = (t, dt, an, st) => { const on = !!st.boosting || !st.grounded; for (const j of jets) { vis(j, on); if (on) j.scale.setScalar(0.7 * s * (0.8 + abs(S(t * 31)) * 0.4)); } };
  return rig;
}

// ---- Silver --------------------------------------------------------------------------------------
const SILVER = 0xdfe5ec, PSY = 0x30f0e0;
function silver() {
  const rig = toon({
    name: 'silver', body: SILVER, skin: 0xe8c9a0, iris: 0xf0b018, mouth: 'smile', cuff: 0xf2c020, shoes: 0xf4f4f4, strap: PSY, sole: 0x2a2a30,
    eyes: { dx: 0.27, w: 0.2, h: 0.28 },
    head: (H) => {
      // the crown of front quills, swept up and back
      H.quill(0, 0.55, 1.42, 1.95, 0.32, SILVER);
      for (const sd of [-1, 1]) { H.quill(sd * 0.4, 0.5, 1.15, 1.8, 0.3, SILVER, sd * 0.6); H.quill(sd * 0.8, 0.35, 0.85, 1.6, 0.28, SILVER, sd * 1.05); H.quill(PI - sd * 0.5, -0.1, -0.4, 1.45, 0.3, SILVER, PI - sd * 0.55); }
      H.quill(PI, 0.1, -0.2, 1.55, 0.32, SILVER);
    },
    torso: (b, d) => { const s = d.s; blob(b, 0, d.chestY + 0.68 * s, 0.17 * s, 0.3 * s, 0.24 * s, 0.17 * s, C.white); },
    arm: (ab, sd, d) => blob(ab, 0, -0.62 * d.s, 0.12 * d.s, 0.07 * d.s, 0.07 * d.s, 0.03 * d.s, neon(PSY, 1.5)),
  });
  const s = rig.dims.s;
  const glows = [rig.armL, rig.armR].map((a) => { const g = addGlow(a, PSY, 0.9 * s, 0, -0.72 * s, 0, 0.85); g.visible = false; return g; });
  // psychokinesis: debris bricks float round him, outlined in cyan
  const deb = Array.from({ length: 6 }, (_, k) => { const g = new THREE.Group(); const b = new BrickBuilder(1); b.brick(0, -0.12, 0, 2, 1, 1, [C.dkgray, C.ltgray, C.tan][k % 3], { pitch: 0.4 }); g.add(b.build({ name: 'debris', shadows: false })); addGlow(g, PSY, 0.8, 0, 0, 0, 0.5); return g; });
  const debris = orbit(rig.root, deb, 1.5);
  rig.fx = (n, f, t) => {
    const on = during(n, f, ['cheer', 'win', 'use', 'throwF', 'taunt']);
    for (const g of glows) { vis(g, on); if (on) g.scale.setScalar(0.9 * s * (0.8 + abs(S(t * 17)) * 0.35)); }
    debris.set(n === 'cheer' || n === 'win', t, 1.6 + (n === 'cheer' ? (1 - f) * 0.6 : 0), 1.8, 0.35);
  };
  return rig;
}

// ---- Rouge -------------------------------------------------------------------------------------
const ROUGE = 0xf4f4ee, SUIT = 0x1d1b24, PINK = 0xf0609e, WING = 0x3a2a4a;
function rouge() {
  const rig = toon({
    name: 'rouge', s: 1.1, body: ROUGE, torso: SUIT, hips: SUIT, legs: SUIT, skin: 0xeac39a, arms: ROUGE, iris: 0x24a890, mouth: 'smirk', cuff: PINK, shoes: ROUGE, strap: PINK,
    eyes: { dx: 0.27, w: 0.2, h: 0.28, lash: true, lid: 0x5a78d8, lidRoll: -0.1 }, ears: { inner: 0xeac39a, len: 0.95, r: 0.34, a: 0.75, p: 0.55 },
    torso: (b, d) => { const s = d.s; b.add(heartGeo(), plastic(PINK, { rough: 0.3 }), 0, d.chestY + 0.6 * s, 0.24 * s, 0, 0.52 * s, 0.42 * s, 0.5 * s); },
  });
  const s = rig.dims.s;
  // bat wings on pivots at her back
  const wings = [-1, 1].map((sd) => {
    const g = part(rig.torso, (b) => {
      for (let k = 0; k < 3; k++) { const a = 0.15 + k * 0.42; blob(b, sd * S(a) * 0.42 * s, CO(a) * 0.38 * s, 0, 0.36 * s, 0.07 * s, 0.025 * s, WING, null, sd * (PI / 2 - a)); }
      rod(b, [0, 0, 0], [sd * 0.55 * s, 0.5 * s, 0], 0.03 * s, ROUGE, 6);
    }, 'rouge-wing', sd * 0.12 * s, 0.75 * s, -0.22 * s);
    g.rotation.y = sd * 0.5; return g;
  });
  const gem = new THREE.Group(); gem.position.set(0, -0.82 * s, 0.05 * s); rig.armL.add(gem); gem.visible = false;
  emerald(gem, 0x40c8ff, 0.2); const sp = star(gem, 0xffffff, 0.4, 13);
  const kiss = new THREE.Mesh(heartGeo(), neon(PINK, 1.4)); kiss.visible = false; rig.root.add(kiss);
  rig.idle = (t, dt, an, st) => {
    const g = an.g?.name, flap = st.gliding || st.phase === 'win' || g === 'cheer' || g === 'trick';
    for (const [i, w] of wings.entries()) { const sd = i ? 1 : -1; w.rotation.y = sd * (flap ? 0.2 + S(t * 16) * 0.55 : 0.55 + S(t * 2) * 0.05); }
  };
  rig.fx = (n, f, t) => {
    vis(gem, n === 'win' || (n === 'cheer' && f < 0.5)); vis(sp, gem.visible); if (gem.visible) { gem.rotation.y = t * 2.5; pulse(sp, t, 0.6); }
    const k = n === 'taunt' || (n === 'cheer' && f > 0.5) ? seg(n === 'taunt' ? f : (f - 0.5) * 2, 0.3, 1) : 0;
    vis(kiss, k > 0); if (k > 0) { kiss.position.set(0.3, 1.9 + k * 0.6, 0.6 + k * 2); kiss.scale.setScalar(0.25 + k * 0.3); kiss.rotation.y = S(t * 6) * 0.4; }
  };
  return rig;
}

// ---- Cream & Cheese ----------------------------------------------------------------------------
const CREAM = 0xf2d9a4, CDRESS = 0xf2782a, EARTIP = 0xc87a3a;
function cheeseChao(size = 1) {
  const g = new THREE.Group(), b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 0.17, 0xa8d8f2); b.sphere(0, -0.2, 0, 0.12, 0xa8d8f2);
  rod(b, [0, 0.15, 0], [0, 0.26, 0.02], 0.02, 0xa8d8f2, 6); b.sphere(0, 0.3, 0.02, 0.06, 0xf8e040);
  for (const sd of [-1, 1]) { b.sphere(sd * 0.06, 0.02, 0.15, 0.035, 0x141414); blob(b, sd * 0.16, -0.12, -0.08, 0.1, 0.05, 0.02, 0xf8e8a0, [sd, 0, -0.6]); blob(b, sd * 0.05, -0.12, 0.11, 0.05, 0.035, 0.03, 0xd82020); }
  g.add(b.build({ name: 'cheese', shadows: false }));
  g.scale.setScalar(size);
  return g;
}
function cream() {
  const rig = toon({
    name: 'cream', s: 1.0, body: CREAM, torso: CDRESS, hips: CDRESS, legs: CDRESS, skin: 0xfbf1e0, arms: CREAM, iris: 0x8a4a1e, mouth: 'smile', shoes: CDRESS, strap: 0xf2c020,
    eyes: { dx: 0.28, w: 0.21, h: 0.3, lash: true },
    torso: (b, d) => { const s = d.s; blob(b, 0, d.chestY + 0.74 * s, 0.22 * s, 0.13 * s, 0.1 * s, 0.07 * s, 0x2a52d0); b.box(0, d.chestY - 0.02 * s, 0, 1.0 * s * d.W, 0.08 * s, 0.52 * s, C.white); },
  });
  const s = rig.dims.s, R = rig.R;
  // long rabbit ears on pivots, so they flap when she flies
  const ears = [-1, 1].map((sd) => {
    const g = part(rig.head, (b) => { blob(b, 0, 0.55 * R, 0, 0.17 * R, 0.62 * R, 0.08 * R, CREAM); blob(b, 0, 1.0 * R, 0.01 * R, 0.13 * R, 0.2 * R, 0.07 * R, EARTIP); }, 'cream-ear', sd * 0.35 * R, 1.6 * R, -0.1 * R);
    g.rotation.z = -sd * 0.2; return g;
  });
  const ch = cheeseChao(0.9); const cheese = new THREE.Group(); cheese.add(ch); rig.root.add(cheese);
  rig.idle = (t, dt, an, st) => {
    const fly = st.gliding || an.g?.name === 'trick';
    for (const [i, e] of ears.entries()) { const sd = i ? 1 : -1; e.rotation.z = -sd * (fly ? 1.0 + S(t * 18) * 0.5 : 0.2 + S(t * 2 + i) * 0.05); e.rotation.x = fly ? 0.4 : -0.1; }
  };
  rig.fx = (n, f, t) => {
    if (n === 'cheer' || n === 'win') { const a = t * 3; cheese.position.set(S(a) * 1.3, 1.7 + S(t * 9) * 0.2, CO(a) * 1.3); cheese.rotation.set(0, a + PI / 2, 0); }
    else { cheese.position.set(0.85 * s, 1.75 * s + S(t * 3) * 0.08, 0.1); cheese.rotation.set(0, -0.3, 0); }
  };
  return rig;
}

// ---- Blaze -------------------------------------------------------------------------------------
const BLAZE = 0x9a72cc, COAT = 0x6a2a8e, FUCHSIA = 0xe03a8a;
function blaze() {
  const rig = toon({
    name: 'blaze', s: 1.12, body: BLAZE, torso: COAT, arms: COAT, legs: C.white, hips: C.white, skin: 0xf6ead8, iris: 0xe8b81a, mouth: 'frown', shoes: FUCHSIA, strap: C.white, cuff: FUCHSIA,
    eyes: { dx: 0.27, w: 0.2, h: 0.27, lash: true, lid: BLAZE, lidRoll: 0.15 }, ears: { inner: 0xf0a0c0, len: 0.42, r: 0.24, a: 0.66 },
    head: (H) => {
      H.quill(PI, 0.85, 1.05, 2.05, 0.3, BLAZE);                                          // ponytail
      H.blob(H.at(PI, 1.0, 1.0), 0.15 * H.R, 0.1 * H.R, 0.15 * H.R, C.white);
      for (const sd of [-1, 1]) H.quill(sd * 0.55, 0.25, -0.35, 1.25, 0.26, BLAZE, sd * 0.6);
      H.blob(H.at(0, 0.62, 0.98), 0.08 * H.R, 0.1 * H.R, 0.05 * H.R, neon(0xe0186a, 0.8), H.n(0, 0.62));
    },
    torso: (b, d) => { const s = d.s; b.cyl(0, d.chestY + 0.76 * s, 0, 0.26 * s * d.W, 0.08 * s, FUCHSIA, { seg: 16 }); b.box(0, d.chestY + 0.3 * s, 0.22 * s, 0.1 * s, 0.55 * s, 0.04 * s, FUCHSIA); },
  });
  const s = rig.dims.s;
  const fires = [rig.armL, rig.armR].map((a) => { const g = flame(a, 1.0); g.position.y = -0.74 * s; g.rotation.x = PI; return g; });
  const ringF = orbit(rig.root, Array.from({ length: 8 }, () => { const h = new THREE.Group(); flame(h, 0.9).visible = true; return h; }), 0.9);
  rig.fx = (n, f, t) => {
    const on = during(n, f, ['cheer', 'win', 'use', 'throwF']);
    for (const g of fires) { vis(g, on); if (on) g.scale.set(1, 1 + S(t * 29) * 0.2, 1); }
    ringF.set(n === 'win' || (n === 'cheer' && f > 0.35), t, 1.5, 4, 0.05);
  };
  return rig;
}

// ---- Metal Sonic ---------------------------------------------------------------------------------
const MBLUE = 0x1c3c9a;
function metalSonic() {
  const mb = metal(MBLUE, 0.3), ms = metal(0xc4c8d0, 0.35);
  const rig = toon({
    name: 'metal-sonic', body: MBLUE, headMat: mb, skin: ms, arms: mb, hands: ms, cuff: ms, iris: 0xff2020, mouth: null, nose: null, shoes: 0xc8202a, strap: ms,
    muzzle: { y: -0.32, w: 0.5, h: 0.36, d: 0.55 },
    eyes: { dx: 0.22, w: 0.22, h: 0.3, white: 0x101014, irisMat: neon(0xff1010, 1.3), pupil: null, shine: false },
    ears: { col: mb, inner: ms, len: 0.6, r: 0.18 },
    head: (H) => sonicQuills(H, mb, { r: 0.36 }),
    torso: (b, d) => {
      const s = d.s;
      rod(b, [0, d.chestY + 0.5 * s, 0.05 * s], [0, d.chestY + 0.5 * s, 0.32 * s], 0.15 * s, ms, 14);
      rod(b, [0, d.chestY + 0.5 * s, 0.3 * s], [0, d.chestY + 0.5 * s, 0.335 * s], 0.1 * s, neon(0xffb020, 2.2), 14);
      for (const sd of [-1, 1]) spike(b, [sd * 0.12 * s, d.chestY + 0.5 * s, -0.12 * s], [sd * 0.16 * s, d.chestY + 0.35 * s, -0.55 * s], 0.12 * s, mb);
    },
  });
  const s = rig.dims.s;
  const core = addGlow(rig.torso, 0xffa020, 0.6 * s, 0, rig.dims.chestY + 0.5 * s, 0.4 * s, 0.9);
  const aura = fxg(rig.root, 0, 1.2, 0);
  aura.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), new THREE.MeshBasicMaterial({ color: 0x40a0ff, wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
  addGlow(aura, 0x3a8aff, 3.2, 0, 0, 0, 0.45);
  rig.idle = (t, dt, an, st) => { core.scale.setScalar(s * (st.boosting ? 1.5 + S(t * 40) * 0.3 : 0.6)); };
  rig.fx = (n, f, t) => {
    const on = n === 'win' || (n === 'cheer' && f > 0.35);
    vis(aura, on); if (on) { aura.rotation.set(t * 3, t * 5, 0); aura.scale.setScalar(0.9 + abs(S(t * 13)) * 0.15); }
  };
  return rig;
}

// ---- Big the Cat -------------------------------------------------------------------------------
const BIG = 0x7a58c8, BCREAM = 0xf2e2b8;
function froggy() {
  const b = new BrickBuilder(1), g = new THREE.Group();
  b.sphere(0, 0, 0, 0.16, 0x3aa83a, { sy: 0.75 }); b.sphere(0, 0.06, 0.1, 0.11, 0x3aa83a);
  for (const sd of [-1, 1]) { b.sphere(sd * 0.06, 0.14, 0.13, 0.045, C.white); b.sphere(sd * 0.065, 0.15, 0.165, 0.022, 0x141414); blob(b, sd * 0.13, -0.08, -0.02, 0.06, 0.04, 0.12, 0x3aa83a); }
  blob(b, 0, -0.02, -0.18, 0.04, 0.04, 0.1, 0x2a7a2a, [0, -0.5, -1]);
  b.sphere(0, -0.02, 0.13, 0.08, 0xf2e070, { sy: 0.6 });
  g.add(b.build({ name: 'froggy', shadows: false }));
  return g;
}
function big() {
  const rig = toon({
    name: 'big', s: 1.35, R: 0.4, wide: 1.45, deep: 1.35, body: BIG, skin: BCREAM, belly: BCREAM, arms: BIG, iris: 0xf0d020, mouth: 'smile', shoes: 0x1b1b22, strap: 0xf2c020,
    eyes: { dx: 0.3, w: 0.16, h: 0.22 }, ears: { inner: 0xf0b0c8, len: 0.35, r: 0.24, a: 0.62 },
    muzzle: { y: -0.4, w: 0.62, h: 0.42, d: 0.5 },
    torso: (b, d) => { const s = d.s; b.box(0, d.chestY + 0.02 * s, 0, 0.98 * s * d.W, 0.12 * s, 0.5 * s * d.D, 0xf2c020); b.box(0, d.chestY - 0.01 * s, 0.25 * s * d.D, 0.2 * s, 0.18 * s, 0.04 * s, 0xc89010); },
  });
  const s = rig.dims.s;
  // fishing rod in the right hand; Froggy hangs off the line
  const rodG = part(rig.armR, (b) => { rod(b, [0, -0.5 * s, 0], [0, -1.6 * s, 0.08 * s], 0.025 * s, 0x6a4022, 6); b.cyl(0, -0.72 * s, 0.05 * s, 0.07 * s, 0.08 * s, 0xa0a5a9, { seg: 10 }); }, 'big-rod');
  const tip = new THREE.Group(); tip.position.set(0, -1.6 * s, 0.08 * s); rodG.add(tip);
  const frog = froggy(); rig.root.add(frog);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4).translate(0, 0.5, 0), plastic(0xf4f4f4)); rig.root.add(line);
  const tp = new THREE.Vector3(), fp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  rig.fx = (n, f, t) => {
    const on = during(n, f, ['cheer', 'win', 'use', 'taunt']);
    vis(rodG, on); vis(frog, on); vis(line, on);
    if (!on) return;
    rig.root.updateMatrixWorld(true);
    tip.getWorldPosition(tp); rig.root.worldToLocal(tp);
    if (n === 'cheer') { const k = sm(seg(f, 0.35, 0.65)); fp.set(tp.x + S(t * 5) * 0.2, lerp(tp.y - 0.6, 0.6, k), tp.z + k * 1.6); }
    else fp.set(tp.x + S(t * 4) * 0.25, tp.y - 0.9 - abs(S(t * 6)) * 0.2, tp.z + CO(t * 4) * 0.1);
    frog.position.copy(fp); frog.rotation.y = S(t * 3) * 0.5;
    const dir = tp.clone().sub(fp); const len = dir.length();
    line.position.copy(fp); line.scale.set(1, len, 1); line.quaternion.copy(q.setFromUnitVectors(up, dir.normalize()));
  };
  return rig;
}

// ---- Dr. Eggman --------------------------------------------------------------------------------
const EGG = 0xf2c49a, JACKET = 0xd2201a, MOUSTACHE = 0xc0601a;
function eggman() {
  const rig = seatedFig({
    name: 'eggman', s: 1.45, wide: 1.45, deep: 1.35, noStud: true, torso: JACKET, arms: JACKET, hands: GLOVE, legs: 0x1b1b22, hips: 0x1b1b22, skin: EGG,
    head: (hb, d) => {
      const s = d.s, R = 0.36 * s, cy = R * 1.05;
      blob(hb, 0, cy, 0, R, R * 1.18, R * 1.02, EGG);
      blob(hb, 0, cy - 0.05 * R, 0.98 * R, 0.17 * R, 0.15 * R, 0.14 * R, 0xf0a090);                              // nose
      for (const sd of [-1, 1]) {
        blob(hb, sd * 0.45 * R, cy - 0.32 * R, 0.82 * R, 0.55 * R, 0.17 * R, 0.2 * R, MOUSTACHE, [sd * 0.4, 0, 1], sd * 0.25);    // moustache
        blob(hb, sd * 0.95 * R, cy - 0.18 * R, 0.5 * R, 0.25 * R, 0.12 * R, 0.14 * R, MOUSTACHE, [sd, 0, 0.5], sd * 0.6);
        // round blue spectacles
        rod(hb, [sd * 0.33 * R, cy + 0.2 * R, 0.86 * R], [sd * 0.33 * R, cy + 0.2 * R, 0.96 * R], 0.21 * R, 0x1b1b22, 14);
        rod(hb, [sd * 0.33 * R, cy + 0.2 * R, 0.96 * R], [sd * 0.33 * R, cy + 0.2 * R, 0.97 * R], 0.17 * R, neon(0x3a7ad8, 0.5), 14);
        blob(hb, sd * 0.3 * R, cy + 0.2 * R, 0.975 * R, 0.05 * R, 0.07 * R, 0.01 * R, 0x101018);
        // goggles on the forehead
        rod(hb, [sd * 0.3 * R, cy + 0.72 * R, 0.62 * R], [sd * 0.3 * R, cy + 0.82 * R, 0.82 * R], 0.19 * R, 0x8a8e94, 12);
        rod(hb, [sd * 0.3 * R, cy + 0.82 * R, 0.82 * R], [sd * 0.3 * R, cy + 0.83 * R, 0.84 * R], 0.15 * R, neon(0xe86a20, 0.6), 12);
      }
      hb.cyl(0, cy + 0.6 * R, 0, R * 0.92, 0.12 * R, 0x1b1b22, { seg: 20 });
      blob(hb, 0, cy - 0.62 * R, 0.82 * R, 0.16 * R, 0.06 * R, 0.06 * R, 0x5a1a10, [0, -0.3, 1]);
      d.headH = cy + R * 1.18;
    },
    torsoExtra: (b, d) => {
      const s = d.s;
      blob(b, 0, d.chestY + 0.3 * s, 0.14 * s, 0.56 * s, 0.42 * s, 0.32 * s, JACKET);                    // the famous round belly
      for (const sd of [-1, 1]) blob(b, sd * 0.13 * s, d.chestY + 0.4 * s, 0.44 * s, 0.03 * s, 0.3 * s, 0.03 * s, 0xf2c020, [0, 0.1, 1]);
      for (const y of [0.2, 0.36, 0.52]) b.sphere(0.24 * s, d.chestY + y * s, 0.43 * s, 0.035 * s, 0xf2c020);
      b.cyl(0, d.chestY + 0.78 * s, 0, 0.3 * s * d.W, 0.06 * s, C.white, { seg: 16 });
      for (const sd of [-1, 1]) b.box(sd * 0.22 * s * d.W, -0.3 * s, 0.75 * s, 0.34 * s * d.W, 0.36 * s, 0.5 * s, 0x1b1b22);
    },
    arm: (ab, sd, d) => { ab.sphere(0, -0.62 * d.s, 0, 0.13 * d.s, GLOVE); ab.cyl(0, -0.52 * d.s, 0, 0.13 * d.s, 0.06 * d.s, 0xf2c020, { seg: 10 }); },
  });
  const steam = [-1, 1].map((sd) => { const g = addGlow(rig.head, 0xd8d8d8, 0.6, sd * 0.4, 1.3, 0, 0.8); g.visible = false; return g; });
  rig.fx = (n, f, t) => {
    const on = n === 'cheer' || n === 'taunt';
    steam.forEach((g, i) => { vis(g, on); if (on) { const u = (t * 1.8 + i * 0.5) % 1; g.position.y = 1.2 + u * 0.8; g.scale.setScalar(0.4 + u * 0.7); } });
  };
  return rig;
}
const shake = (f, t) => ({ rx: -2.45 + S(t * 32) * 0.22, rz: -0.25, lx: -0.6, lz: 0.4, hx: -0.15, hz: S(t * 32) * 0.06, tz: S(t * 32) * 0.05, jaw: 1 });

// ---- roster ------------------------------------------------------------------------------------
const spinBall = (f) => ({ ty: f * PI * 2, tx: 0.35, lx: -0.5, rx: -0.5, lz: -0.2, rz: 0.2, hx: 0.35, by: S(f * PI) * 0.2 });
export default [
  {
    id: 'sonic-hog', name: 'Sonic', blurb: "Gotta go fast!", weight: 'medium', color: BLUE,
    voice: { kind: 'human', pitch: 1.2 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      // finger-wag, then thumbs up
      cheer: (f, t) => (f < 0.5
        ? { rx: -2.5, rz: -0.12 + S(t * 24) * 0.32, lx: -0.6, lz: 0.5, hy: -0.25, hz: S(t * 12) * 0.1, hx: -0.1, ty: -0.15 }
        : { rx: -1.5, rz: 0.15, lx: -0.6, lz: 0.6, ty: -0.25, hy: -0.2, hx: -0.15, by: bump(f, 0.5, 0.7) * 0.08 }),
      taunt: (f, t, a) => ({ rx: -2.4, rz: -0.15 + S(t * 24) * 0.3, hy: -0.7, ty: -0.35, hz: S(t * 12) * 0.12, hx: -0.1 }),
      trick: spinBall,
      win: (f, t) => ({ rx: -1.5, rz: 0.15, lx: -0.25, lz: 0.95, ty: -0.2, hy: -0.25, hx: -0.2, by: abs(S(t * LOOP)) * 0.05 }),
    },
    build: sonic,
  },
  {
    id: 'tails', name: 'Tails', blurb: 'Two-tailed ace pilot and mechanic', weight: 'light', color: TAILS,
    voice: { kind: 'squeak', pitch: 0.85 }, style: { cheer: 'both', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ lx: UP, rx: UP, lz: 0.35 + S(t * 13) * 0.3, rz: -0.35 - S(t * 13) * 0.3, hx: -0.3, by: 0.12 + abs(S(t * 13)) * 0.08 }),
      win: (f, t) => ({ lx: UP + S(t * LOOP * 2) * 0.3, rx: -1.6, rz: 0.1, lz: 0.4, hx: -0.3, by: 0.1 + abs(S(t * LOOP * 2)) * 0.06 }),
    },
    build: tails,
  },
  {
    id: 'knuckles', name: 'Knuckles', blurb: 'Guardian of the Master Emerald', weight: 'heavy', color: KNUX,
    voice: { kind: 'human', pitch: 0.92 }, style: { cheer: 'flex', trick: 'superman' },
    gestures: {
      cheer: punch,
      taunt: (f, t) => ({ lx: -1.4, lz: -0.35, rx: -1.4, rz: 0.35 + abs(S(t * 16)) * 0.15, hy: 0.4, hx: 0.1, tz: S(t * 16) * 0.03 }),
      win: (f, t) => ({ ...punch(f, t * 0.8), rx: -2.6 + S(t * LOOP * 2) * 0.2, rz: -0.2, hx: -0.3 }),
    },
    build: knuckles,
  },
  {
    id: 'amy', name: 'Amy Rose', blurb: 'Piko Piko Hammer at the ready', weight: 'light', color: AMY,
    voice: { kind: 'human', pitch: 1.5 }, style: { cheer: 'both', trick: 'twist' },
    gestures: {
      // wind up over the head, then smash
      cheer: (f, t) => ({ rx: f < 0.4 ? lerp(-1.4, -3.2, sm(f / 0.4)) : lerp(-3.2, -1.05, sm(seg(f, 0.4, 0.52))), rz: -0.1, lx: -0.8, lz: 0.4, tx: f < 0.4 ? -0.15 : 0.18, hx: f < 0.4 ? -0.3 : 0.1, by: bump(f, 0.45, 0.6) * 0.06 }),
      taunt: (f, t) => ({ lx: lerp(-2.4, -1.6, sm(seg(f, 0.3, 0.6))), lz: lerp(-0.4, 0.3, sm(seg(f, 0.3, 0.6))), hz: 0.15, hx: -0.15, hy: -0.2 }),
      win: (f, t) => ({ rx: -2.9 + S(t * LOOP * 2) * 0.2, rz: -0.15, lx: -0.5, lz: 0.8, hx: -0.25, hz: S(t * LOOP) * 0.12, by: abs(S(t * LOOP * 2)) * 0.06 }),
    },
    build: amy,
  },
  {
    id: 'shadow-hog', name: 'Shadow', blurb: 'The Ultimate Life Form', weight: 'medium', color: 0x24252c,
    voice: { kind: 'human', pitch: 0.82 }, style: { cheer: 'point', trick: 'superman' },
    gestures: {
      // emerald raised: "Chaos… Control!"
      cheer: (f, t) => ({ rx: f < 0.45 ? lerp(-1.4, -2.9, sm(f / 0.3)) : -2.9, rz: -0.1, lx: -0.4, lz: 0.3, hx: -0.3, tx: -0.1, ty: f > 0.45 && f < 0.6 ? S(t * 60) * 0.06 : 0 }),
      taunt: (f, t) => ({ lx: -1.25, lz: -0.75, rx: -1.25, rz: 0.75, hy: 0.6, hx: -0.15, ty: 0.15 }),
      win: (f, t) => ({ lx: -1.25, lz: -0.75, rx: -1.25, rz: 0.75, hy: -0.25 + S(t * LOOP * 0.5) * 0.1, hx: -0.12 }),
    },
    build: shadow,
  },
  {
    id: 'silver-hog', name: 'Silver', blurb: "It's no use! Psychokinesis from the future", weight: 'medium', color: SILVER,
    voice: { kind: 'human', pitch: 1.1 }, style: { cheer: 'both', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.8 + S(t * 6) * 0.1, rx: -1.8 - S(t * 6) * 0.1, lz: 0.5, rz: -0.5, hx: -0.15, by: 0.08 + S(t * 4) * 0.03 }),
      win: (f, t) => ({ lx: UP, rx: UP, lz: 0.6, rz: -0.6, hx: -0.35, by: 0.1 + S(t * LOOP) * 0.04 }),
    },
    build: silver,
  },
  {
    id: 'rouge', name: 'Rouge', blurb: 'Treasure-hunting bat and spy', weight: 'light', color: PINK,
    voice: { kind: 'human', pitch: 1.3 }, style: { cheer: 'wave', trick: 'superman' },
    gestures: {
      // admires her jewel, then blows a kiss
      cheer: (f, t) => (f < 0.5 ? { lx: -1.9, lz: -0.3, hx: -0.1, hy: 0.3, rx: -0.6, rz: 0.4 } : { rx: lerp(-2.2, -1.5, sm(seg(f, 0.6, 0.8))), rz: lerp(0.4, -0.2, sm(seg(f, 0.6, 0.8))), hz: 0.15, hy: -0.15 }),
      taunt: (f, t) => ({ rx: lerp(-2.2, -1.5, sm(seg(f, 0.3, 0.6))), rz: lerp(0.4, -0.2, sm(seg(f, 0.3, 0.6))), hz: 0.18, hy: -0.4, ty: -0.2 }),
      win: (f, t) => ({ lx: -1.9, lz: -0.3, rx: -0.3, rz: -0.9, hy: 0.3, hz: S(t * LOOP) * 0.08, by: 0.06 + S(t * LOOP) * 0.03 }),
    },
    build: rouge,
  },
  {
    id: 'cream', name: 'Cream & Cheese', blurb: 'Polite little rabbit with her Chao', weight: 'light', color: CDRESS,
    voice: { kind: 'squeak', pitch: 1.0 }, style: { cheer: 'clap', win: 'wave', trick: 'twist' },
    gestures: { taunt: (f, t) => ({ tx: 0.4 * S(f * PI), hx: 0.3 * S(f * PI), lx: -0.3, rx: -0.3 }) },
    build: cream,
  },
  {
    id: 'blaze-cat', name: 'Blaze', blurb: 'Pyrokinetic princess of the Sol Dimension', weight: 'medium', color: BLAZE,
    voice: { kind: 'human', pitch: 1.2 }, style: { cheer: 'spin', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ ty: sm(f) * PI * 2, lx: -1.5, rx: -1.5, lz: 1.2, rz: -1.2, hx: -0.15, by: S(f * PI) * 0.15 }),
      win: (f, t) => ({ rx: -2.3, rz: -0.1, lx: -0.4, lz: 0.6, hx: -0.3, hy: -0.15, by: abs(S(t * LOOP)) * 0.04 }),
    },
    build: blaze,
  },
  {
    id: 'metal-sonic', name: 'Metal Sonic', blurb: "Eggman's robot rival, V. Maximum Overdrive", weight: 'medium', color: MBLUE,
    voice: { kind: 'robot', pitch: 1.0 }, style: { cheer: 'point', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ rx: -1.7, rz: 0.05, ty: -0.2, hx: -0.1, lx: f > 0.35 ? -0.5 : -1.0, lz: f > 0.35 ? 1.0 : 0.3, tx: -0.1 }),
      win: (f, t) => ({ lx: -0.5, rx: -0.5, lz: 1.1, rz: -1.1, tx: -0.2, hx: -0.3, by: 0.06 + abs(S(t * LOOP * 2)) * 0.03 }),
    },
    build: metalSonic,
  },
  {
    id: 'big-cat', name: 'Big the Cat', blurb: 'Gentle giant fishing for Froggy', weight: 'heavy', color: BIG,
    voice: { kind: 'deep', pitch: 1.05 }, style: { cheer: 'both', trick: 'arms' },
    gestures: {
      // cast the line out over the bonnet
      cheer: (f, t) => ({ rx: f < 0.35 ? lerp(-1.4, -3.0, sm(f / 0.35)) : lerp(-3.0, -1.6, sm(seg(f, 0.35, 0.5))), rz: -0.1, lx: -1.0, lz: 0.2, hx: -0.2, tx: f < 0.35 ? -0.12 : 0.1 }),
      taunt: (f, t) => ({ rx: -2.2, rz: -0.15, lx: -1.3, lz: 0.6, hy: -0.4, hz: S(t * 5) * 0.1 }),
      win: (f, t) => ({ rx: -2.5, rz: -0.1, lx: UP + S(t * LOOP * 2) * 0.3, lz: 0.5, hx: -0.3, by: abs(S(t * LOOP * 2)) * 0.06 }),
    },
    build: big,
  },
  {
    id: 'eggman', name: 'Dr. Eggman', blurb: 'Evil genius with an IQ of 300', weight: 'heavy', color: JACKET,
    voice: { kind: 'deep', pitch: 1.25 }, style: { cheer: 'fist', trick: 'arms' },
    gestures: {
      cheer: shake,
      taunt: (f, t, a) => ({ ...shake(f, t), hy: a.tauntSide * 0.9, ty: a.tauntSide * 0.3 }),
      // "Ohohoho!": arms out, belly laugh
      win: (f, t) => ({ lx: -2.2, rx: -2.2, lz: 0.9, rz: -0.9, hx: -0.45, tx: -0.15, by: abs(S(t * LOOP * 4)) * 0.05, jaw: 1 }),
    },
    build: eggman,
  },
];
