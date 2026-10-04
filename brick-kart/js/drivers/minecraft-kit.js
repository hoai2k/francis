// Helpers for the Minecraft drivers (see ./minecraft.js and ../driver.js for the rig contract):
// blocky mobs whose cube heads, bodies and limbs wear pixel-art skins (one 6-tile canvas atlas
// per part, nearest filtering), extruded pixel items (pickaxe, sword, bow, emerald…) and
// cube-particle effects (block crumbs, smoke puffs, portal sparks, hearts).
import { THREE, BrickBuilder, C, plastic, cached, mat4, rbox } from './kit.js';

export { THREE, BrickBuilder, C, plastic, mat4, rbox };
export const S = Math.sin, PI = Math.PI, abs = Math.abs, UP = -2.75;
export const LOOP = (PI * 2) / 1.6;   // one cycle of the looped win pose
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const seg = (f, a, b) => clamp01((f - a) / (b - a));
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const bump = (f, a, b) => Math.sin(PI * seg(f, a, b));
export const winF = (t) => (t % 1.6) / 1.6;
export const vis = (o, on) => { if (o.visible !== on) o.visible = on; };
export const rng = (seed) => { let s = (seed | 0) || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

// ---- pixel skins -----------------------------------------------------------------------------
// A face spec is a colour (noisy solid fill) or { g: rows, p: { char: colour }, n: noise, flip }.
// Rows are drawn as seen from outside the box (row 0 = top, column 0 = viewer's left); a 'side'
// face is mirrored automatically for the right-hand side so both start at the front.
const T = 24;   // tile size: grids 1, 2, 3, 4, 6, 8, 12 or 24 wide divide it evenly
const col = new THREE.Color();
function drawTile(g, x0, spec, rnd, flip) {
  if (typeof spec !== 'object') spec = { g: ['aaaa', 'aaaa', 'aaaa', 'aaaa'], p: { a: spec } };
  const rows = spec.g, n = spec.n ?? 0.07, ny = rows.length, nx = rows[0].length, cw = T / nx, ch = T / ny;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = rows[j][flip ? nx - 1 - i : i], v = spec.p[c] ?? spec.p.a;
    col.set(v); const k = 1 + (rnd() - 0.5) * 2 * n;
    g.fillStyle = `rgb(${Math.min(255, col.r * 255 * k) | 0},${Math.min(255, col.g * 255 * k) | 0},${Math.min(255, col.b * 255 * k) | 0})`;
    g.fillRect(x0 + Math.floor(i * cw), Math.floor(j * ch), Math.ceil(cw), Math.ceil(ch));
  }
}
const skins = new Map();
// faces: { all, front, back, side, left, right, top, bottom } -> MeshStandardMaterial (cached by key;
// unique: true returns a private copy whose emissive can flash)
export function skin(key, f, { unique = false } = {}) {
  let m = skins.get(key);
  if (!m) {
    const list = [
      [f.left ?? f.side ?? f.all, false], [f.right ?? f.side ?? f.all, !f.right], [f.top ?? f.all, false],
      [f.bottom ?? f.top ?? f.all, false], [f.front ?? f.side ?? f.all, false], [f.back ?? f.side ?? f.all, false],
    ];
    const c = document.createElement('canvas'); c.width = T * 6; c.height = T;
    const g = c.getContext('2d'), rnd = rng(key.length * 977 + key.charCodeAt(0));
    list.forEach(([sp, flip], i) => drawTile(g, i * T, sp ?? '#ff00ff', rnd, flip));
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
    skins.set(key, m);
  }
  return unique ? m.clone() : m;
}
// a box whose six faces map onto the six atlas tiles (BoxGeometry face order: +x -x +y -y +z -z)
export const atlasGeo = (w, h, d) => cached(`mcBox${w},${h},${d}`, () => {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, e = 0.5 / T;
  for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4); uv.setXY(i, (f + e + uv.getX(i) * (1 - 2 * e)) / 6, e + uv.getY(i) * (1 - 2 * e)); }
  return g;
});
// a skinned cube centred at (x, y, z)
export function cube(parent, mat, w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(atlasGeo(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
// grid helpers for skins: n rows of the same string, and a row list from [string, count] pairs
export const rep = (s, n) => Array(n).fill(s);
export const rows = (...pairs) => pairs.flatMap(([s, n = 1]) => rep(s, n));

// ---- pixel items -----------------------------------------------------------------------------
// An extruded pixel sprite (Minecraft's held items) merged into one mesh. The grid lies in the
// local XY plane (x right, y up), px thick along Z, with pixel (ax, ay) at the origin.
export function pixItem(name, grid, pal, px = 0.05, ax = 0, ay = 0, matOpts = null) {
  const b = new BrickBuilder(1);
  grid.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = pal[r[i]]; if (c === undefined) continue; b.box((i - ax) * px, (ay - j) * px - px / 2, 0, px, px, px, c, matOpts ? { matOpts } : undefined); } });
  return b.build({ name, shadows: false });
}
export const ITEMS = {
  pickaxe: [[
    '...DDDDD....', '..DdddddD...', '........dD..', '........ddD.', '.......w.dD.', '......w..dD.',
    '.....w...dD.', '....w....dD.', '...w......D.', '..w.........', '.w..........', 'w...........',
  ], { D: 0x1a9c8c, d: 0x5ef2e0, w: 0x6b4a26 }],
  sword: [[
    '..........Ii', '.........IiI', '........IiI.', '.......IiI..', '......IiI...', '.....IiI....',
    '..h.IiI.....', '...hiI......', '...whh......', '..w..h......', '.w..........', 'w...........',
  ], { I: 0x8a8a8a, i: 0xf0f0f0, h: 0x3a2a1a, w: 0x6b4a26 }],
  emerald: [['..GG..', '.GggG.', 'GgLggG', 'GgLggG', 'GggggG', 'GggggG', '.GggG.', '..GG..'], { G: 0x0f8a3a, g: 0x2ed06a, L: 0xb0ffd0 }],
  poppy: [['..rr..', '.rRRr.', '.rRRr.', '..rr..', '..g...', '..g.l.', '..gl..', '..g...'], { r: 0xd02020, R: 0x5a1010, g: 0x3a8a2a, l: 0x5ab03a }],
  potion: [['..cc..', '..gg..', '.gppg.', 'gpPppg', 'gppppg', 'gppppg', '.gggg.'], { c: 0x8a5a2a, g: 0xd8e8f0, p: 0xb040d0, P: 0xf0a0ff }],
  heart: [['.RR.RR.', 'RrrRrrR', 'RrwrrrR', 'RrrrrrR', '.RrrrR.', '..RrR..', '...R...'], { R: 0x8a0a10, r: 0xe02030, w: 0xffa0a0 }],
  carrot: [['......gg', '.....gGg', '....ooG.', '...ooo..', '..ooo...', '.ooo....', 'oo......', 'o.......'], { g: 0x3a9a2a, G: 0x2a6a1a, o: 0xf08a20 }],
  ingot: [['.YYYYYY.', 'YyyyyyyY', 'YyyyyyyY', '.YYYYYY.'], { Y: 0xc89010, y: 0xffd640 }],
};
// bow: an arc of wood with a taut string (built facing +X, grip at the origin)
export function bowItem(px = 0.05) {
  const g = [], arc = [4, 3, 2, 1, 1, 0, 0, 1, 1, 2, 3, 4];
  for (let j = 0; j < 12; j++) { const r = Array(6).fill('.'); r[arc[j]] = 'w'; if (j && j < 11) r[5] = 's'; g.push(r.join('')); }
  g[0] = '....ws'; g[11] = '....ws';
  return pixItem('bow', g, { w: 0x6b4a26, s: 0xd8d8d8 }, px, 0, 5.5);
}
export function arrowItem(px = 0.04) {
  return pixItem('arrow', ['f.........', 'fwwwwwwwwH', 'f.........'], { f: 0xf0f0f0, w: 0x6b4a26, H: 0x9a9a9a }, px, 9, 1);
}

// ---- fx -----------------------------------------------------------------------------------------
const fxMats = new Map();
export const fxMat = (c, op = 0.9, add = true) => { const k = `${c}|${op}|${add}`; let m = fxMats.get(k); if (!m) { m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, toneMapped: false }); fxMats.set(k, m); } return m; };
export function fxg(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.visible = false; parent.add(g); return g; }
const unit = () => cached('mcUnit', () => new THREE.BoxGeometry(1, 1, 1));
// A burst of little square particles flying out from the group origin. set(k) with k in 0..1
// places them (k <= 0 or >= 1 hides the burst). o: { n, colors, size, spread, rise, grav, seed, add, up }
export function particles(parent, o = {}) {
  const g = fxg(parent), n = o.n ?? 10, rnd = rng(o.seed ?? 11), cols = o.colors ?? [0xffffff], ps = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(unit(), o.mats ? o.mats[i % o.mats.length] : fxMat(cols[i % cols.length], o.op ?? 0.95, o.add ?? true));
    const a = rnd() * PI * 2, u = o.up ? 0.3 + rnd() * 0.7 : rnd() * 2 - 1, q = Math.sqrt(1 - u * u), sp = 0.6 + rnd() * 0.6;
    ps.push({ m, dx: q * Math.cos(a) * sp, dy: u * sp, dz: q * Math.sin(a) * sp, s: (o.size ?? 0.12) * (0.6 + rnd() * 0.7), r: rnd() * 6 });
    g.add(m);
  }
  const spread = o.spread ?? 1, rise = o.rise ?? 0, grav = o.grav ?? 0;
  g.set = (k) => {
    const on = k > 0 && k < 1; vis(g, on);
    if (!on) return g;
    const e = 1 - (1 - k) * (1 - k);
    for (const p of ps) {
      p.m.position.set(p.dx * spread * e, p.dy * spread * e + rise * k - grav * k * k, p.dz * spread * e);
      p.m.scale.setScalar(p.s * (1 - k * 0.7));
      p.m.rotation.set(p.r + k * 3, p.r * 2 + k * 4, 0);
    }
    return g;
  };
  return g;
}
// a pixel sprite that always lies in a vertical plane (hearts, happy-villager sparkles)
export function fxItem(parent, key, px = 0.05, o = {}) {
  const [grid, pal] = ITEMS[key];
  const g = fxg(parent);
  const m = pixItem('fx-' + key, grid, pal, px, grid[0].length / 2, grid.length / 2, o.glow ? { emissive: o.glow, emissiveIntensity: 0.8 } : null);
  g.add(m);
  return g;
}
// smoothly hide/show: 0 hides the object, otherwise scales it
export function pop(o, k) { const on = k > 0.01; vis(o, on); if (on) o.scale.setScalar(k); }

// ---- mob rig -------------------------------------------------------------------------------------
// A blocky humanoid in the seat frame (hips at the origin, +Z forward), sizes in world units:
// o: { name, head: [w, h, d], body: [w, h, d], arm: [w, len, d], leg: [w, len], skins: { head, body,
//      arm, leg (seated thigh, length along +Z) }, legColor, headY (neck offset), headZ, armY,
//      bodyY (lifts the chest: waists go in extra), headExtra(hb, h, w, d) (BrickBuilder in the head
//      frame, base at y 0; returns the new top), bodyExtra(b), extra(rig) (skinned add-ons),
//      stand (false = a pedestal on the select stage) }
// Returns a rig plus hands [L, R] (groups at the fists, in unscaled arm space) and hd = head size.
const ARM_K = [1 / 1.1, 1 / 1.22, 1 / 1.1];   // undo the minifig arm stretch buildDriver applies with dims
export function mob(o) {
  const root = new THREE.Group(); root.name = o.name || 'mob';
  const torso = new THREE.Group(); root.add(torso);
  const [bw, bh, bd] = o.body, [hw, hh, hd] = o.head, [aw, al, ad] = o.arm, [lw, ll] = o.leg, by = o.bodyY ?? 0;
  cube(torso, o.skins.body, bw, bh, bd, 0, by + bh / 2, 0);
  // seated thighs reaching forward into the tub
  for (const sd of [-1, 1]) cube(torso, o.skins.leg, lw, lw, ll, sd * lw / 2, -lw / 2 - 0.01, ll / 2 - bd / 2 - 0.02);
  if (o.bodyExtra) { const b = new BrickBuilder(1); o.bodyExtra(b); torso.add(b.build({ name: 'mob-extra', shadows: false })); }
  const head = new THREE.Group(); head.position.set(0, by + bh + (o.headY ?? 0), o.headZ ?? 0); torso.add(head);
  cube(head, o.skins.head, hw, hh, hd, 0, hh / 2, 0);
  let top = hh;
  if (o.headExtra) { const hb = new BrickBuilder(1); top = Math.max(top, o.headExtra(hb, hh, hw, hd) || 0); head.add(hb.build({ name: 'mob-head-extra', shadows: false })); }
  const arms = [], hands = [], stand = o.stand !== false;
  for (const sd of [1, -1]) {
    const pv = new THREE.Group(); pv.position.set(sd * (bw / 2 + aw / 2 + 0.005), by + bh - aw / 2 + (o.armY ?? 0), 0);
    const inner = new THREE.Group(); if (stand) inner.scale.set(...ARM_K); pv.add(inner);
    cube(inner, o.skins.arm, aw, al, ad, 0, aw / 2 - al / 2, 0);
    const hand = new THREE.Group(); hand.position.y = aw / 2 - al + aw * 0.4; inner.add(hand);
    torso.add(pv); arms.push(pv); hands.push(hand);
  }
  const reach = al - aw * 0.7;
  const rig = {
    root, torso, head, armL: arms[0], armR: arms[1], hands, hd: [hw, hh, hd],
    armLen: stand ? reach / 1.22 : reach, height: by + bh + (o.headY ?? 0) + top, width: bw + aw * 2,
  };
  o.extra?.(rig);
  // stand-up legs on the select stage come from the minifig dims (sized to match the thighs)
  if (stand) { const s = ll / 0.86; rig.dims = { s, W: lw / (0.4 * s), D: bd / (0.46 * s), chestY: 0, legColor: o.legColor ?? 0x3a3aa0 }; }
  return rig;
}
// hold an item in a hand: g is parented to the fist, pointing forward along the fist (+Z when the
// arm hangs), tilted with rx/ry/rz
export function hold(rig, side, obj, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); g.add(obj);
  rig.hands[side === 'L' ? 0 : 1].add(g);
  return g;
}
