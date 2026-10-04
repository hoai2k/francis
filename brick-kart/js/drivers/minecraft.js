// Minecraft drivers: blocky mobs with cube heads and pixel-art skins (./minecraft-kit.js), each
// with a signature move on cheer / win: Steve mines with his diamond pickaxe, Alex sweeps her
// sword, the Creeper swells, flashes and puffs, the Zombie burns in the sun, the Skeleton looses
// an arrow, the Enderman teleports in purple sparks, the Villager trades an emerald, the Iron
// Golem offers a poppy, the Piglin admires gold, the Witch throws a splash potion, the Snow
// Golem lobs snowballs and the Pig floats hearts.
import {
  THREE, BrickBuilder, plastic, rbox, S, PI, abs, UP, LOOP, seg, sm, lerp, bump, winF, vis,
  skin, cube, rep, rows, pixItem, ITEMS, bowItem, arrowItem, fxMat, fxg, particles, fxItem, pop, mob, hold,
} from './minecraft-kit.js';

// ---- shared skins ----------------------------------------------------------------------------
const STEVE = { s: 0xb98a63, t: 0x12a8a8, T: 0x0b8a8a, p: 0x3434a0, g: 0x6a6a6a };
// a sleeve-then-skin arm (4 or 3 px wide)
const armSkin = (key, sleeve, sk, n = 4, w = 4) => skin(key, {
  all: { g: rows(['a'.repeat(w), n], ['b'.repeat(w), 12 - n]), p: { a: sleeve, b: sk } }, top: sleeve, bottom: sk,
});
// a seated thigh (long along +Z): shoes at the front end
const legSkin = (key, pants, shoe) => skin(key, {
  side: { g: rep('ss' + 'p'.repeat(10), 4), p: { s: shoe, p: pants } }, top: pants, bottom: pants, front: shoe, back: pants,
});
const shirt = (key, pal, front, side) => skin(key, { front: { g: front, p: pal }, side: side ?? pal.a, back: pal.a, top: pal.a, bottom: pal.a });
const face = (g, p, n) => ({ g, p, n });

// item orientations in the fist: tools point forward out of the hand, flowers point up when the arm is held out
const TOOL = { rx: PI / 4, ry: -PI / 2 };
const UPRIGHT = { rx: PI / 2 };
// a looping 0..1 phase
const loop = (t, rate, off = 0) => ((t * rate + off) % 1 + 1) % 1;
// a parabolic throw in the root frame: from a to b with a hump
function lob(o, k, a, b, hump) {
  pop(o, k > 0 && k < 1 ? 1 : 0);
  if (!o.visible) return;
  o.position.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k) + Math.sin(PI * k) * hump, lerp(a[2], b[2], k));
}

// ---- Steve -----------------------------------------------------------------------------------
function steve() {
  const c = { h: 0x3b2614, s: STEVE.s, w: 0xf4f4f4, b: 0x4a3fae, n: 0x8a5a3a, m: 0x6a3a26 };
  const rig = mob({
    name: 'steve', head: [0.8, 0.8, 0.8], body: [0.8, 1.2, 0.4], arm: [0.4, 1.2, 0.4], leg: [0.4, 1.2], legColor: STEVE.p,
    skins: {
      head: skin('mc-steve-head', {
        front: face(['hhhhhhhh', 'hhhhhhhh', 'hssssssh', 'ssssssss', 'swbssbws', 'sssnnsss', 'ssmmmmss', 'ssssssss'], c),
        side: face(['hhhhhhhh', 'hhhhhhhh', 'sshhhhhh', 'ssshhhhh', 'sssshhhh', 'sssssshh', 'ssssssss', 'ssssssss'], c),
        back: face(rows(['hhhhhhhh', 6], ['ssssssss', 2]), c), top: c.h, bottom: c.s,
      }),
      body: shirt('mc-steve-body', { a: STEVE.t, T: STEVE.T, s: STEVE.s }, rows(['aaassaaa'], ['aaaaaaaa', 10], ['TTTTTTTT'])),
      arm: armSkin('mc-steve-arm', STEVE.t, STEVE.s), leg: legSkin('mc-steve-leg', STEVE.p, STEVE.g),
    },
  });
  const [grid, pal] = ITEMS.pickaxe;
  hold(rig, 'R', pixItem('pickaxe', grid, pal, 0.055, 2, 9), TOOL);
  const crumbs = particles(rig.root, { n: 9, colors: [0x7a5230, 0x5aa83a, 0x8a6a4a, 0x6a6a6a], add: false, op: 1, size: 0.13, spread: 0.9, rise: 0.5, grav: 1.6, seed: 4 });
  crumbs.position.set(-0.5, 0.7, 1.6);
  const shine = particles(rig.root, { n: 8, colors: [0x5ef2e0, 0xffffff], size: 0.09, spread: 0.7, rise: 0.8, up: true, seed: 9 });
  shine.position.set(-0.4, 2.8, 0.3);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer' && f > 0.08 && f < 0.92;
    crumbs.set(ch ? loop(t, 14 / (PI * 2), 0.75) : 0);
    shine.set(n === 'win' ? loop(t, 0.9) : 0);
  };
  return rig;
}

// ---- Alex ------------------------------------------------------------------------------------
function alex() {
  const c = { o: 0xe0782a, s: 0xf0c8a0, w: 0xf4f4f4, e: 0x3a9a4a, m: 0xc87060 };
  const G = 0x6aa84f;
  const rig = mob({
    name: 'alex', head: [0.8, 0.8, 0.8], body: [0.8, 1.2, 0.4], arm: [0.3, 1.2, 0.4], leg: [0.4, 1.2], legColor: 0x6b4a2a,
    skins: {
      head: skin('mc-alex-head', {
        front: face(['oooooooo', 'oooooooo', 'ooosssso', 'osssssso', 'swessews', 'ssssssss', 'sssmmsss', 'ssssssss'], c),
        side: face(['oooooooo', 'oooooooo', 'sooooooo', 'ssoooooo', 'ssoooooo', 'sssooooo', 'sssooooo', 'sssooooo'], c),
        back: c.o, top: c.o, bottom: c.s,
      }),
      body: shirt('mc-alex-body', { a: G, G: 0x4f8a3a, s: c.s, b: 0x6b4a2a }, rows(['aaassaaa'], ['aaaaaaaa', 9], ['bbbbbbbb'], ['GGGGGGGG'])),
      arm: armSkin('mc-alex-arm', G, c.s, 4, 3), leg: legSkin('mc-alex-leg', 0x6b4a2a, 0x3a2a1a),
    },
    headExtra: (hb, h, w, d) => { hb.box(0, h * 0.05, -d / 2 - 0.05, w * 0.7, h * 0.6, 0.1, c.o); return h; },   // ponytail
  });
  const [grid, pal] = ITEMS.sword;
  hold(rig, 'R', pixItem('sword', grid, pal, 0.06, 1, 10), TOOL);
  // the sweep attack: a pale crescent swung round in front
  const sweep = fxg(rig.root, 0, 1.0, 0.2);
  const arc = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 12, 1, 0, PI * 0.8), fxMat(0xeaeaea, 0.75));
  arc.rotation.x = -PI / 2; sweep.add(arc);
  const sparks = particles(rig.root, { n: 7, colors: [0xffffff, 0xd0d0d0], size: 0.1, spread: 1.0, seed: 6 });
  sparks.position.set(0, 1.0, 1.4);
  rig.fx = (n, f, t) => {
    const k = n === 'cheer' ? seg(f, 0.25, 0.55) : n === 'win' ? seg(winF(t), 0.1, 0.45) : 0;
    vis(sweep, k > 0 && k < 1);
    if (sweep.visible) { sweep.rotation.y = lerp(-1.6, 0.6, k); sweep.scale.setScalar(0.8 + k * 0.4); }
    sparks.set(k);
  };
  return rig;
}

// ---- Creeper (no arms: it drives with its head) --------------------------------------------------
function creeper() {
  const p = { a: 0x5aa83a, g: 0x4a9a2e, L: 0x8ad06a, k: 0x141414, K: 0x203a14 };
  const n = 0.22;
  const head = skin('mc-creeper-head', {
    front: face(['aaaaaaaa', 'aLaagaaa', 'akkaakka', 'akkaakka', 'aaakkaaa', 'aakKKkaa', 'aakkkkaa', 'aakaakaa'], p, n),
    all: face(rep('aaaaaaaa', 8), p, n),
  }, { unique: true });
  const body = skin('mc-creeper-body', { all: face(rep('aaaa', 12), p, n) }, { unique: true });
  for (const m of [head, body]) { m.emissive.setHex(0xffffff); m.emissiveIntensity = 0; }
  const root = new THREE.Group(); root.name = 'creeper';
  const torso = new THREE.Group(); root.add(torso);
  cube(torso, body, 0.8, 1.25, 0.45, 0, 0.5, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cube(torso, body, 0.4, 0.45, 0.4, sx * 0.2, -0.25, sz * 0.3 + 0.15);
  const hd = new THREE.Group(); hd.position.y = 1.12; torso.add(hd);
  cube(hd, head, 0.8, 0.8, 0.8, 0, 0.4, 0);
  const rig = { root, torso, head: hd, height: 1.95, width: 0.9, armLen: 0.8 };
  const smoke = particles(root, { n: 10, colors: [0xd8d8d8, 0xb0b0b0, 0xf4f4f4], add: false, op: 0.85, size: 0.4, spread: 1.6, rise: 0.8, seed: 13 });
  smoke.position.set(0, 1.3, 0);
  rig.fx = (nm, f, t) => {
    let fl = 0, sw = 0, k = 0;
    const g = nm === 'cheer' ? f : nm === 'win' ? winF(t) : -1;
    if (g >= 0) {
      const a = seg(g, 0.05, 0.7);
      sw = a * 0.14; fl = a > 0 && g < 0.7 && S(t * (16 + a * 30)) > 0 ? 0.35 + a * 0.6 : 0;
      k = seg(g, 0.7, 1);
    }
    head.emissiveIntensity = body.emissiveIntensity = fl;
    torso.scale.setScalar(1 + sw);
    smoke.set(k);
  };
  return rig;
}

// ---- Zombie ----------------------------------------------------------------------------------
function zombie() {
  const c = { H: 0x2f5a26, z: 0x4c8a3a, Z: 0x3a7030, k: 0x101810 };
  const rig = mob({
    name: 'zombie', head: [0.8, 0.8, 0.8], body: [0.8, 1.2, 0.4], arm: [0.4, 1.2, 0.4], leg: [0.4, 1.2], legColor: 0x3a3a8a,
    skins: {
      head: skin('mc-zombie-head', {
        front: face(['HHHHHHHH', 'HHzHHHzH', 'zzzzzzzz', 'zzzzzzzz', 'zkkzzkkz', 'zzzZZzzz', 'zZzzzzZz', 'zzZZZZzz'], c, 0.12),
        side: face(rows(['HHHHHHHH'], ['zzHHHHHH'], ['zzzzzzzz', 6]), c, 0.12), back: face(rows(['HHHHHHHH', 2], ['zzzzzzzz', 6]), c, 0.12), top: c.H, bottom: c.z,
      }),
      body: shirt('mc-zombie-body', { a: 0x1a9a9a, T: 0x0e7a7a, z: c.z }, rows(['aaazzaaa'], ['aaaaaaaa', 8], ['aTaaaTaa'], ['aaaaaaaa'], ['TTTTTTTT'])),
      arm: armSkin('mc-zombie-arm', 0x1a9a9a, c.z, 3), leg: legSkin('mc-zombie-leg', 0x3a3a8a, 0x4a4a4a),
    },
  });
  // it burns in the sunlight: flames lick up from its head
  const fire = [0, 0.5].map((o, i) => { const p = particles(rig.head, { n: 7, colors: [0xff8a20, 0xffd040, 0xff4010], size: 0.16, spread: 0.45, rise: 0.7, up: true, seed: 3 + i }); p.position.set(0, 0.85, 0); return [p, o]; });
  rig.fx = (n, f, t) => { const on = (n === 'cheer' && f > 0.1 && f < 0.92) || n === 'win'; for (const [p, o] of fire) p.set(on ? loop(t, 1.8, o) : 0); };
  return rig;
}

// ---- Skeleton --------------------------------------------------------------------------------
function skeleton() {
  const c = { b: 0xc8c8c8, B: 0x9a9a9a, k: 0x2a2a2a };
  const rib = rows(['bbbbbbbb'], ['kkkbbkkk'], ['bbbbbbbb'], ['kkkbbkkk'], ['bbbbbbbb'], ['kkkbbkkk', 4], ['bbbbbbbb', 2], ['kkkkkkkk']);
  const rig = mob({
    name: 'skeleton', head: [0.8, 0.8, 0.8], body: [0.72, 1.2, 0.36], arm: [0.2, 1.2, 0.2], leg: [0.22, 1.2], legColor: 0xb8b8b8,
    skins: {
      head: skin('mc-skeleton-head', { front: face(['bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bkkbbkkb', 'bkkbbkkb', 'bbbkkbbb', 'bkkkkkkb', 'bbbbbbbb'], c, 0.08), all: c.b }),
      body: skin('mc-skeleton-body', { front: face(rib, c), back: face(rib, c), side: c.B, top: c.b, bottom: c.b }),
      arm: skin('mc-skeleton-arm', { all: c.b }), leg: skin('mc-skeleton-leg', { all: c.b }),
    },
  });
  // bow in the left fist, standing upright when the arm is held out
  hold(rig, 'L', bowItem(0.06), { rx: PI / 2, rz: -PI / 2, y: 0.02 });
  const arrow = fxg(rig.root); arrow.add(arrowItem(0.05)); arrow.rotation.y = -PI / 2;
  const puff = particles(rig.root, { n: 6, colors: [0xffffff], size: 0.1, spread: 0.6, seed: 8 });
  rig.fx = (n, f, t) => {
    const k = n === 'cheer' ? seg(f, 0.45, 0.78) : n === 'win' ? seg(winF(t), 0.3, 0.6) : 0;
    vis(arrow, k > 0 && k < 1);
    if (arrow.visible) arrow.position.set(0.5, 1.15 + k * 0.6, 1.3 + k * 9);
    puff.position.set(0.5, 1.15, 1.4); puff.set(k * 2.5);
  };
  return rig;
}

// ---- Enderman --------------------------------------------------------------------------------
const GRASS = () => skin('mc-grass', {
  top: face(rep('gggggggg', 8), { g: 0x5aa83a }, 0.18),
  side: face(rows(['gggggggg'], ['gdgggdgg'], ['dddddddd', 6]), { g: 0x5aa83a, d: 0x7a5230 }, 0.18),
  bottom: face(rep('dddddddd', 8), { d: 0x7a5230 }, 0.18),
});
function enderman() {
  const c = { e: 0x151515, E: 0x0c0c0c, p: 0xe070ff, P: 0xb030d0 };
  const rig = mob({
    name: 'enderman', head: [0.8, 0.8, 0.8], body: [0.8, 1.3, 0.4], arm: [0.2, 1.75, 0.2], leg: [0.22, 1.1], stand: false, headY: 0.06,
    skins: {
      head: skin('mc-enderman-head', { front: face(rows(['eeeeeeee', 4], ['PpPeePpP'], ['eeeeeeee', 3]), c, 0.05), all: face(rep('eeee', 4), c, 0.05) }),
      body: skin('mc-enderman-body', { all: face(rep('eeee', 4), c, 0.05) }),
      arm: skin('mc-enderman-arm', { all: c.e }), leg: skin('mc-enderman-leg', { all: c.e }),
    },
  });
  // glowing eyes on top of the black face
  const eb = new BrickBuilder(1);
  for (const sd of [-1, 1]) eb.box(sd * 0.25, 0.36, 0.401, 0.3, 0.1, 0.01, 0xe070ff, { matOpts: { emissive: 0xd040ff, emissiveIntensity: 1.6 } });
  rig.head.add(eb.build({ name: 'ender-eyes', shadows: false }));
  // a grass block carried overhead on the win
  const block = fxg(rig.root, 0, 3.0, 0.2); cube(block, GRASS(), 0.6, 0.6, 0.6);
  const ambient = particles(rig.root, { n: 6, colors: [0xd060ff, 0x9030e0], size: 0.08, spread: 0.9, rise: 0.5, seed: 21 });
  ambient.position.set(0, 1.3, 0);
  const out = particles(rig.root, { n: 14, colors: [0xd060ff, 0x9030e0, 0xff90ff], size: 0.13, spread: 1.3, seed: 22 });
  const back = particles(rig.root, { n: 14, colors: [0xd060ff, 0x9030e0, 0xff90ff], size: 0.13, spread: 1.3, seed: 23 });
  out.position.set(0, 1.3, 0); back.position.set(0, 1.3, 0);
  rig.fx = (n, f, t) => {
    const g = n === 'cheer' ? f : -1;
    vis(rig.torso, !(g > 0.3 && g < 0.6));
    out.set(g >= 0 ? seg(g, 0.25, 0.6) : 0);
    back.set(g >= 0 ? seg(g, 0.55, 0.9) : 0);
    ambient.set(loop(t, 0.7));
    vis(block, n === 'win');
  };
  return rig;
}

// ---- Villager --------------------------------------------------------------------------------
const villagerFace = (key, c, o = {}) => skin(key, {
  front: face(rows(['vvvvvvvv', 4], [o.brow ?? 'vUUUUUUv'], ['vwevvewv'], ['vvvvvvvv', 3], ['vvVVVVvv'], ['vvvvvvvv', 2]), c, 0.06),
  side: face(rep('vvvv', 6), c, 0.06), top: c.v, bottom: c.v,
});
const nose = (hb, h, d, col, wart) => { hb.box(0, h * 0.18, d / 2 + 0.1, 0.2, h * 0.38, 0.2, col); if (wart) hb.box(0.06, h * 0.26, d / 2 + 0.205, 0.07, 0.07, 0.02, wart); };
function villager() {
  const c = { v: 0xb98a6a, V: 0x8a5a3e, U: 0x4a2a1a, e: 0x2a8a3a, w: 0xf4f4f4 };
  const R = 0x6b4a2e;
  const rig = mob({
    name: 'villager', head: [0.8, 1.0, 0.8], body: [0.8, 1.2, 0.6], arm: [0.36, 1.1, 0.4], leg: [0.4, 1.2], legColor: R,
    skins: {
      head: villagerFace('mc-villager-head', c),
      body: shirt('mc-villager-body', { a: R, R: 0x4a321e }, rows(['aaaaaaaa', 5], ['aRRRRRRa'], ['aaaaaaaa', 6])),
      arm: armSkin('mc-villager-arm', R, c.v, 9), leg: legSkin('mc-villager-leg', R, 0x4a321e),
    },
    headExtra: (hb, h, w, d) => { nose(hb, h, d, c.V); return h; },
  });
  const [grid, pal] = ITEMS.emerald;
  const gem = hold(rig, 'R', pixItem('emerald', grid, pal, 0.06, 3, 7), UPRIGHT);
  const happy = particles(rig.root, { n: 8, colors: [0x40ff60, 0xa0ffa0], size: 0.09, spread: 0.8, rise: 0.4, up: true, seed: 31 });
  happy.position.set(0, 2.0, 0.3);
  rig.fx = (n, f, t) => {
    const on = (n === 'cheer' && f > 0.1) || n === 'win';
    vis(gem, on); happy.set(on ? loop(t, 1.2) : 0);
  };
  return rig;
}

// ---- Witch -----------------------------------------------------------------------------------
function witch() {
  const c = { v: 0xa8886a, V: 0x8a6a4e, U: 0x3a2a1a, e: 0x8a3aaa, w: 0xf4f4f4 };
  const R = 0x3e2252, HAT = 0x22182a;
  const rig = mob({
    name: 'witch', head: [0.8, 1.0, 0.8], body: [0.8, 1.2, 0.6], arm: [0.36, 1.1, 0.4], leg: [0.4, 1.2], legColor: R,
    skins: {
      head: villagerFace('mc-witch-head', c, { brow: 'vvUvvUvv' }),
      body: shirt('mc-witch-body', { a: R, g: 0x3a7a3a, R: 0x2a1438 }, rows(['aaaaaaaa', 6], ['gggggggg'], ['aaaaaaaa', 4], ['RRRRRRRR'])),
      arm: armSkin('mc-witch-arm', R, c.v, 9), leg: legSkin('mc-witch-leg', R, 0x2a1438),
    },
    headExtra: (hb, h, w, d) => {
      nose(hb, h, d, c.V, 0x3a8a2a);
      // stepped witch hat, its tip bent back
      hb.box(0, h * 0.94, 0, w * 1.25, 0.08, d * 1.25, HAT);
      hb.box(0, h * 0.94 + 0.08, 0, w * 0.82, 0.12, d * 0.82, 0x3a8a3a);
      hb.box(0, h * 0.94 + 0.2, -0.02, w * 0.78, 0.26, d * 0.78, HAT);
      hb.box(0, h * 0.94 + 0.46, -0.06, w * 0.5, 0.24, d * 0.5, HAT);
      hb.box(0, h * 0.94 + 0.66, -0.16, w * 0.26, 0.2, d * 0.32, HAT);
      hb.box(0, h * 0.94 + 0.76, -0.3, w * 0.16, 0.1, d * 0.3, HAT);
      return h + 0.95;
    },
  });
  const [grid, pal] = ITEMS.potion;
  const inHand = hold(rig, 'R', pixItem('potion', grid, pal, 0.06, 3, 3), UPRIGHT);
  const flying = fxg(rig.root); flying.add(pixItem('potion-fly', grid, pal, 0.06, 3, 3));
  const splash = particles(rig.root, { n: 12, colors: [0xc050f0, 0xf0a0ff, 0x8020c0], size: 0.15, spread: 1.4, rise: 0.4, grav: 0.6, seed: 41 });
  splash.position.set(-0.2, 0.3, 4.2);
  const fizz = particles(rig.root, { n: 7, colors: [0xc050f0, 0xf0a0ff], size: 0.08, spread: 0.6, rise: 0.5, up: true, seed: 42 });
  fizz.position.set(0, 2.1, 0.4);
  rig.fx = (n, f, t) => {
    const ch = n === 'cheer', win = n === 'win';
    vis(inHand, (ch && f < 0.36) || win);
    const k = ch ? seg(f, 0.36, 0.7) : 0;
    lob(flying, k, [-0.5, 2.0, 0.4], [-0.2, 0.3, 4.2], 1.2);
    if (flying.visible) flying.rotation.x = k * 9;
    splash.set(ch ? seg(f, 0.7, 1) : 0);
    fizz.set(win ? loop(t, 1.1) : 0);
  };
  return rig;
}

// ---- Iron Golem ------------------------------------------------------------------------------
function irongolem() {
  const c = { i: 0xd8d2c8, I: 0xa8a096, v: 0x4a8a2a, r: 0xb02010, k: 0x4a4238 };
  const n = 0.1;
  const iron = skin('mc-golem-iron', { all: face(rep('iiii', 4), c, n) });
  const rig = mob({
    name: 'irongolem', head: [0.6, 0.75, 0.6], body: [1.35, 0.85, 0.8], bodyY: 0.45, headY: -0.12, headZ: 0.12,
    arm: [0.32, 1.7, 0.45], leg: [0.45, 1.1], legColor: 0xc8c2b8,
    skins: {
      head: skin('mc-golem-head', {
        front: face(rows(['iiiiiiii', 4], ['IIIIIIII'], ['IkriirkI'], ['iiiiiiii', 3], ['iIIIIIIi'], ['iiiiiiii', 2]), c, n),
        side: face(rows(['iiiiiiii', 3], ['iiviiiii'], ['ivviiiii'], ['iivviiii'], ['iiiiiiii', 6]), c, n), back: face(rep('iiii', 4), c, n), top: c.i, bottom: c.i,
      }),
      body: skin('mc-golem-body', {
        front: face(['iiiiiiii', 'iviiiiIi', 'ivviiiii', 'iivvviii', 'iiiivvii', 'iiiiiiii'], c, n), side: face(['iiii', 'ivii', 'vvii', 'iiii'], c, n), back: face(rep('iiii', 4), c, n), top: c.i, bottom: c.i,
      }),
      arm: skin('mc-golem-arm', { all: face(rows(['iiii', 4], ['ivii'], ['vvii'], ['iviv'], ['iivv'], ['iiii', 3], ['IIII']), c, n), top: c.i, bottom: c.I }),
      leg: skin('mc-golem-leg', { all: face(rep('iiii', 4), c, n) }),
    },
    headExtra: (hb, h, w, d) => { hb.box(0, h * 0.12, d / 2 + 0.08, 0.15, h * 0.32, 0.16, 0xc8c0b4); return h; },
    extra: (r) => cube(r.torso, iron, 0.75, 0.47, 0.5, 0, 0.235, 0),
  });
  const [grid, pal] = ITEMS.poppy;
  const flower = hold(rig, 'R', pixItem('poppy', grid, pal, 0.06, 2, 7), UPRIGHT);
  rig.fx = (n, f) => vis(flower, (n === 'cheer' && f > 0.12) || n === 'win');
  return rig;
}

// ---- Piglin ----------------------------------------------------------------------------------
function piglin() {
  const c = { p: 0xeaa18c, P: 0xc87a6a, k: 0x2a1a1a, w: 0xf4f4f4, n: 0xf6bca8, b: 0x6a4a2a, g: 0xf0c030 };
  const rig = mob({
    name: 'piglin', head: [1.0, 0.8, 0.8], body: [0.8, 1.2, 0.4], arm: [0.4, 1.2, 0.4], leg: [0.4, 1.2], legColor: 0x4a321e,
    skins: {
      head: skin('mc-piglin-head', {
        front: face(['pppppppppppp', 'pPpppppppPpp', 'pppppppppppp', 'ppwkppppkwpp', 'pppppppppppp', 'pppppppppppp', 'pPpppppppPpp', 'pppppppppppp'], c, 0.08),
        side: face(rep('pppp', 4), c, 0.08), top: face(rep('pPpp', 4), c, 0.1), bottom: c.p,
      }),
      body: shirt('mc-piglin-body', { a: c.b, p: c.p, g: c.g }, rows(['aaappaaa', 8], ['gggggggg'], ['aaaaaaaa', 3])),
      arm: armSkin('mc-piglin-arm', c.b, c.p, 3), leg: legSkin('mc-piglin-leg', 0x4a321e, 0x2a1a10),
    },
    headExtra: (hb, h, w, d) => {
      for (const sd of [-1, 1]) {
        rbox(hb, sd * (w / 2 + 0.06), h * 0.62, 0, 0.08, 0.48, 0.3, 0, 0, sd * 0.35, c.p);   // floppy ears
        hb.box(sd * 0.2, h * 0.05, d / 2 + 0.02, 0.08, 0.14, 0.08, c.w);                      // tusks
      }
      return h;
    },
    extra: (r) => {
      const sn = skin('mc-piglin-snout', { front: face(['nnnnnn', 'nknnkn', 'nnnnnn'], c, 0.04), all: c.n });
      cube(r.head, sn, 0.5, 0.36, 0.14, 0, 0.26, 0.47);
    },
  });
  const [sg, sp] = ITEMS.sword;
  hold(rig, 'R', pixItem('gold-sword', sg, { ...sp, I: 0xc89010, i: 0xffd640, h: 0x6a4a1a }, 0.06, 1, 10), TOOL);
  const [ig, ip] = ITEMS.ingot;
  const ingot = hold(rig, 'L', pixItem('ingot', ig, ip, 0.07, 4, 2, { emissive: 0xffb000, emissiveIntensity: 0.25 }), UPRIGHT);
  const glint = particles(rig.root, { n: 8, colors: [0xffe060, 0xffffff], size: 0.08, spread: 0.6, rise: 0.3, up: true, seed: 51 });
  glint.position.set(0.25, 2.0, 0.7);
  rig.fx = (n, f, t) => { const on = (n === 'cheer' && f > 0.1) || n === 'win'; vis(ingot, on); glint.set(on ? loop(t, 1.3) : 0); };
  return rig;
}

// ---- Snow Golem ------------------------------------------------------------------------------
function snowgolem() {
  const sp = { a: 0xf2f6f8, S: 0xd8e2ea };
  const snow = skin('mc-snow', { all: face(rows(['aaaaaaaa', 3], ['aaSaaaaa'], ['aaaaaSaa', 2], ['aaaaaaaa', 2]), sp, 0.04) });
  const c = { o: 0xe0901c, O: 0xb8700e, k: 0x3a2208, g: 0x5a6a2a };
  const pumpkin = skin('mc-pumpkin', {
    front: face(['oOooooOo', 'oOooooOo', 'okkOOkko', 'okkOOkko', 'oOooooOo', 'okkkkkko', 'ookOOkoo', 'oOooooOo'], c, 0.08),
    side: face(rep('oOooooOo', 8), c, 0.08), top: face(rows(['oooooooo', 3], ['oookgooo', 2], ['oooooooo', 3]), c, 0.08), bottom: c.o,
  });
  const root = new THREE.Group(); root.name = 'snowgolem';
  const torso = new THREE.Group(); root.add(torso);
  cube(torso, snow, 1.0, 1.0, 1.0, 0, 0.28, 0);
  cube(torso, snow, 0.82, 0.82, 0.82, 0, 1.19, 0);
  const head = new THREE.Group(); head.position.y = 1.6; torso.add(head);
  cube(head, pumpkin, 0.72, 0.72, 0.72, 0, 0.36, 0);
  const arms = [];
  for (const sd of [1, -1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 0.44, 1.4, 0); torso.add(pv);
    const b = new BrickBuilder(1);
    b.box(0, -0.95, 0, 0.07, 0.95, 0.07, 0x6a4a26);
    b.boxM(new THREE.Matrix4().compose(new THREE.Vector3(sd * 0.08, -0.55, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, sd * 0.7)), new THREE.Vector3(0.05, 0.3, 0.05)), 0x6a4a26);
    pv.add(b.build({ name: 'stick-arm', shadows: false }));
    arms.push(pv);
  }
  const rig = { root, torso, head, armL: arms[0], armR: arms[1], armLen: 0.85, height: 2.32, width: 1.1 };
  const ballMat = plastic(0xf8fbff);
  const balls = [0.12, 0.38, 0.64].map((f0, i) => {
    const g = fxg(root); const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), ballMat); g.add(m);
    const puff = particles(root, { n: 6, colors: [0xffffff, 0xdde8f0], add: false, op: 1, size: 0.12, spread: 0.7, rise: 0.4, grav: 0.8, seed: 61 + i });
    puff.position.set((i - 1) * 0.4, 0.25, 5);
    return { g, puff, f0, x: (i - 1) * 0.4 };
  });
  rig.fx = (n, f, t) => {
    const g = n === 'cheer' ? f : n === 'win' ? winF(t) : -1;
    for (const b of balls) {
      const k = g >= 0 ? seg(g, b.f0, b.f0 + 0.24) : 0;
      lob(b.g, k, [0, 2.0, 0.5], [b.x, 0.25, 5], 1.1);
      b.puff.set(g >= 0 ? seg(g, b.f0 + 0.24, b.f0 + 0.45) : 0);
    }
  };
  return rig;
}

// ---- Pig -------------------------------------------------------------------------------------
function pig() {
  const c = { p: 0xf0a4a0, P: 0xe08c8a, n: 0xf8bcb8, k: 0x8a4a4a, w: 0xf4f4f4, e: 0x1a1a1a };
  const pk = skin('mc-pig-body', { all: face(rows(['pppppppp', 2], ['ppPppppp'], ['pppppPpp'], ['pppppppp', 4]), c, 0.06) });
  const hs = skin('mc-pig-head', { front: face(rows(['pppppppp', 3], ['ewppppwe'], ['pppppppp', 4]), c, 0.05), all: face(rep('pppppppp', 8), c, 0.06) });
  const sn = skin('mc-pig-snout', { front: face(['nnnn', 'knnk', 'nnnn'], c, 0.03), all: c.n });
  const root = new THREE.Group(); root.name = 'pig';
  const torso = new THREE.Group(); root.add(torso);
  cube(torso, pk, 1.0, 1.05, 0.9, 0, 0.42, -0.05);
  for (const sd of [-1, 1]) cube(torso, pk, 0.36, 0.36, 0.75, sd * 0.26, -0.12, 0.45);
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.12); torso.add(head);
  cube(head, hs, 0.8, 0.8, 0.8, 0, 0.36, 0.05);
  cube(head, sn, 0.4, 0.3, 0.1, 0, 0.2, 0.5);
  const arms = [];
  for (const sd of [1, -1]) {
    const pv = new THREE.Group(); pv.position.set(sd * 0.36, 0.7, 0.32); torso.add(pv);
    cube(pv, pk, 0.3, 0.62, 0.3, 0, -0.24, 0);
    arms.push(pv);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.45, -0.5); torso.add(tail);
  cube(tail, pk, 0.12, 0.12, 0.2, 0, 0, -0.08); cube(tail, pk, 0.1, 0.18, 0.1, 0.05, 0.08, -0.16);
  const rig = { root, torso, head, tail, armL: arms[0], armR: arms[1], armLen: 0.5, height: 1.85, width: 1.2 };
  const hearts = [0, 0.33, 0.66].map((o, i) => { const h = fxItem(root, 'heart', 0.06); return { h, o, x: (i - 1) * 0.45 }; });
  rig.fx = (n, f, t) => {
    const on = (n === 'cheer' && f > 0.08) || n === 'win';
    for (const h of hearts) {
      const k = on ? loop(t, 0.9, h.o) : 0;
      pop(h.h, on ? Math.min(1, S(PI * k) * 1.6) : 0);
      if (on) h.h.position.set(h.x + S(t * 3 + h.o * 9) * 0.12, 2.0 + k * 1.3, 0.2);
    }
  };
  return rig;
}

// ---- roster ----------------------------------------------------------------------------------
export default [
  {
    id: 'steve', name: 'Steve', blurb: 'Punches trees, mines diamonds', weight: 'medium', color: 0x12a8a8,
    voice: { kind: 'human', pitch: 1.0 }, style: { cheer: 'fist', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ rx: -1.85 + S(t * 14) * 0.95, rz: -0.1, ty: -0.2, tx: 0.06 + S(t * 14) * 0.05, hx: 0.12, lx: -0.8, lz: 0.3 }),
      win: (f, t) => ({ rx: UP + S(t * LOOP * 2) * 0.3, rz: -0.2, lx: -1.0, lz: 0.6 + S(t * LOOP * 2) * 0.2, hx: -0.3, by: abs(S(t * LOOP)) * 0.05 }),
    },
    build: steve,
  },
  {
    id: 'alex', name: 'Alex', blurb: 'Explorer with an iron sword', weight: 'light', color: 0x6aa84f,
    voice: { kind: 'human', pitch: 1.35 }, style: { cheer: 'both', trick: 'twist' },
    gestures: {
      cheer: (f, t) => { const k = sm(seg(f, 0.2, 0.5)); return { rx: -1.55, rz: lerp(-1.3, 0.9, k), ty: lerp(-0.45, 0.5, k), lx: -0.6, lz: 0.4, hx: -0.1, hy: lerp(-0.4, 0.4, k) }; },
      win: (f, t) => { const k = sm(seg(winF(t), 0.1, 0.45)); return { rx: -1.6, rz: lerp(-1.2, 0.8, k), ty: lerp(-0.4, 0.45, k), lx: UP, lz: 0.4, hx: -0.25 }; },
    },
    build: alex,
  },
  {
    id: 'creeper-mob', name: 'Creeper', blurb: 'Tsssss… BOOM!', weight: 'medium', color: 0x5aa83a,
    voice: { kind: 'beast', pitch: 1.3 }, style: { cheer: 'beep', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ hx: -0.15, tz: S(t * 30) * 0.04 * seg(f, 0.1, 0.7), by: f > 0.7 ? 0.1 * bump(f, 0.7, 1) : 0 }),
      win: (f, t) => ({ hx: -0.2, hy: S(t * LOOP) * 0.4, by: abs(S(t * LOOP * 2)) * 0.08 }),
      taunt: (f, t, a, an) => ({ hy: an.tauntSide * 1.2, ty: an.tauntSide * 0.4, hz: S(t * 9) * 0.1 }),
    },
    build: creeper,
  },
  {
    id: 'zombie', name: 'Zombie', blurb: 'Groans, shambles, burns in the sun', weight: 'medium', color: 0x4c8a3a,
    voice: { kind: 'beast', pitch: 0.8 }, style: { cheer: 'roar', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ lx: -1.57 + S(t * 5) * 0.12, rx: -1.57 - S(t * 5) * 0.12, lz: 0.08, rz: -0.08, hz: S(t * 3.5) * 0.25, hx: 0.1, tz: S(t * 3.5) * 0.08 }),
      win: (f, t) => ({ lx: -1.6 + S(t * LOOP * 2) * 0.2, rx: -1.6 - S(t * LOOP * 2) * 0.2, hz: S(t * LOOP) * 0.3, tz: S(t * LOOP) * 0.1, by: abs(S(t * LOOP * 2)) * 0.05 }),
    },
    build: zombie,
  },
  {
    id: 'skeleton', name: 'Skeleton', blurb: 'Bony archer of the night', weight: 'light', color: 0xc8c8c8,
    voice: { kind: 'robot', pitch: 1.15 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => { const d = sm(seg(f, 0.1, 0.42)) * (1 - sm(seg(f, 0.46, 0.55))); return { lx: -1.6, lz: -0.05, rx: -1.55, rz: -0.55 + d * 0.5, ty: 0.25, hy: 0.15, hz: S(t * 30) * 0.04 }; },
      win: (f, t) => ({ lx: UP + S(t * LOOP * 2) * 0.2, lz: 0.3, rx: -1.0 + S(t * LOOP * 4) * 0.4, rz: -0.4, hz: S(t * LOOP * 4) * 0.15, tz: S(t * LOOP * 2) * 0.1, hx: -0.2 }),
    },
    build: skeleton,
  },
  {
    id: 'enderman', name: 'Enderman', blurb: "Don't look it in the eye", weight: 'heavy', color: 0x2a1a3a,
    voice: { kind: 'deep', pitch: 0.75 }, style: { cheer: 'roar', trick: 'superman' },
    gestures: {
      cheer: (f, t) => ({ hx: -0.2, hz: S(t * 40) * 0.08 * (f < 0.3 ? 1 : 0), lx: -1.2, rx: -1.2, lz: 0.4, rz: -0.4 }),
      win: (f, t) => ({ lx: -2.9, rx: -2.9, lz: 0.1, rz: -0.1, hx: -0.25, hz: S(t * 30) * 0.03, by: abs(S(t * LOOP)) * 0.04 }),
    },
    build: enderman,
  },
  {
    id: 'villager', name: 'Villager', blurb: 'Hrmm! Fair trades only', weight: 'medium', color: 0x6b4a2e,
    voice: { kind: 'deep', pitch: 1.45 }, style: { cheer: 'clap', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ rx: UP + 0.25, rz: -0.15, lx: -0.6, lz: 0.2, hx: S(t * 10) * 0.18 - 0.1, by: abs(S(t * 10)) * 0.04 }),
      win: (f, t) => ({ rx: UP + S(t * LOOP * 2) * 0.25, rz: -0.2, lx: UP - S(t * LOOP * 2) * 0.25, lz: 0.2, hx: S(t * LOOP * 2) * 0.2 - 0.15 }),
    },
    build: villager,
  },
  {
    id: 'irongolem', name: 'Iron Golem', blurb: 'Gentle giant, guards the village', weight: 'heavy', color: 0xd8d2c8,
    voice: { kind: 'deep', pitch: 0.6 }, style: { cheer: 'flex', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ rx: -1.45, rz: 0.12, ty: -0.2, hx: 0.25, hz: 0.18, lx: -0.5, lz: 0.2, tx: 0.08 }),
      win: (f, t) => ({ lx: -2.3 + S(t * LOOP * 2) * 0.6, rx: -2.3 - S(t * LOOP * 2) * 0.6, lz: 0.2, rz: -0.2, hx: -0.2, by: abs(S(t * LOOP * 2)) * 0.05 }),
    },
    build: irongolem,
  },
  {
    id: 'piglin', name: 'Piglin', blurb: 'Loves gold more than anything', weight: 'heavy', color: 0xf0c030,
    voice: { kind: 'beast', pitch: 1.35 }, style: { cheer: 'fist', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ lx: -2.15, lz: -0.35, hy: 0.3, hx: 0.12, hz: S(t * 6) * 0.1, rx: -0.9, rz: -0.2, by: abs(S(t * 6)) * 0.03 }),
      win: (f, t) => ({ rx: UP + S(t * LOOP * 2) * 0.25, rz: -0.2, lx: -2.1, lz: -0.3, hy: 0.25, hx: -0.1, by: abs(S(t * LOOP * 2)) * 0.05 }),
    },
    build: piglin,
  },
  {
    id: 'witch', name: 'Witch', blurb: 'Cackles and throws splash potions', weight: 'medium', color: 0x3e2252,
    voice: { kind: 'human', pitch: 1.55 }, style: { cheer: 'point', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ rx: f < 0.3 ? lerp(-1.0, -2.9, sm(f / 0.3)) : lerp(-2.9, -1.1, sm(seg(f, 0.3, 0.45))), rz: -0.15, ty: f < 0.3 ? 0.3 : -0.2, lx: -0.7, lz: 0.3, hx: -0.1, hz: S(t * 18) * 0.06 }),
      win: (f, t) => ({ rx: -2.45, rz: 0.75, hx: -0.4, lx: -0.6, lz: 0.4, by: abs(S(t * LOOP * 2)) * 0.03 }),
    },
    build: witch,
  },
  {
    id: 'snowgolem', name: 'Snow Golem', blurb: 'Pumpkin head, endless snowballs', weight: 'light', color: 0xe0901c,
    voice: { kind: 'squeak', pitch: 0.9 }, style: { cheer: 'both', trick: 'arms' },
    gestures: {
      cheer: (f, t) => ({ hx: -0.1 + S(t * 13) * 0.2, lx: -2.2 + S(t * 9) * 0.4, rx: -2.2 - S(t * 9) * 0.4, lz: 0.4, rz: -0.4, by: abs(S(t * 13)) * 0.03 }),
      win: (f, t) => ({ hx: -0.1 + S(t * LOOP * 3) * 0.2, lx: UP + S(t * LOOP * 2) * 0.3, rx: UP - S(t * LOOP * 2) * 0.3, lz: 0.5, rz: -0.5 }),
    },
    build: snowgolem,
  },
  {
    id: 'pig', name: 'Pig', blurb: 'Oink! Happiest with a carrot', weight: 'light', color: 0xf0a4a0,
    voice: { kind: 'squeak', pitch: 0.75 }, style: { cheer: 'both', trick: 'twist' },
    gestures: {
      cheer: (f, t) => ({ by: abs(S(t * 12)) * 0.14, hx: S(t * 12) * 0.12 - 0.15, lx: -1.9 + S(t * 12) * 0.3, rx: -1.9 - S(t * 12) * 0.3, lz: 0.3, rz: -0.3 }),
      win: (f, t) => ({ by: abs(S(t * LOOP * 2)) * 0.16, hx: -0.25, hz: S(t * LOOP) * 0.15, lx: -2.2, rx: -2.2, lz: 0.4 + S(t * LOOP * 2) * 0.2, rz: -0.4 - S(t * LOOP * 2) * 0.2 }),
    },
    build: pig,
  },
];
