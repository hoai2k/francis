// Pokémon drivers: Ash and eleven brick-built Pokémon in the driver-rig format (see ../driver.js;
// shapes and effects in ./pokemon-kit.js). Creatures are seated: the torso holds the body with
// stubby legs along the seat, the head sits on a neck pivot (for round Pokémon the "head" pivot
// is the centre of the body ball, so its face slides over the ball as it looks around), the arms
// or forelegs reach the wheel and tails sway behind. Signature moves on cheer / taunt / win:
// Pikachu's sparks, Charmander's and Charizard's fire, Squirtle's Water Gun and shades,
// Bulbasaur's Vine Whip, Jigglypuff's song, Gengar fading into the shadows, Lucario's Aura Sphere,
// Mewtwo's Psystrike and Snorlax's Zzz. Voices say their names (voice.say lines).
import {
  THREE, C, seatedFig, faceMat, rbox, shape, S, CO, PI, abs, UP, LOOP, seg, sm, bump, vis,
  part, pv, fxg, onEll, pokeBall, addGlow, sparks, flame, jet, notes, zzz, orb,
} from './pokemon-kit.js';

const BK = 0x1b1b1b, WH = C.white;
const FIRE = [0xff6a10, 0xff9a20, 0xe83a08];
const winF = (t) => (t % 1.6) / 1.6;
// a box between two points in the y/z plane (flat tails, wing bones), thickness along x
function slab(L, x, y0, z0, y1, z1, w, th, col, o = {}) {
  const dy = y1 - y0, dz = z1 - z0;
  L.box(x, (y0 + y1) / 2, (z0 + z1) / 2, th, Math.hypot(dy, dz), w, col, { ...o, rx: Math.atan2(dz, dy) });
}
// a chain of ellipsoids through [y, z, r] points (curly tails), at x
function chain(L, x, pts, col, sx = 1) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [y0, z0, r0] = pts[i], [y1, z1, r1] = pts[i + 1];
    for (let k = 0; k < 3; k++) { const u = k / 3; L.ell(x, y0 + (y1 - y0) * u, z0 + (z1 - z0) * u, (r0 + (r1 - r0) * u) * sx, r0 + (r1 - r0) * u, r0 + (r1 - r0) * u, col); }
  }
  const [y, z, r] = pts[pts.length - 1];
  L.ell(x, y, z, r * sx, r, r, col);
}
// two eyes on a head ellipsoid
function eyes(L, c, r, yaw, pitch, size, o = {}) {
  for (const sd of [-1, 1]) { const p = onEll(c, r, sd * yaw, pitch); L.eye(p[0], p[1], p[2], size, sd * yaw, { ...o, side: sd, roll: (o.roll || 0) * sd }); }
}
// a "voice" that says the Pokémon's name: syllables [vowel, pitch start, end, seconds, gap]
const cry = (syl, sad) => ({ cheer: syl, win: syl.map((s, i) => (i === syl.length - 1 ? [s[0], s[1] * 1.1, s[2] * 1.15, s[3] * 1.3, 0] : s)), yay: syl, taunt: syl, go: syl, ...(sad ? { ouch: sad, lose: sad } : {}) });

// ---- shared gestures --------------------------------------------------------------------------
const G = {
  hop: (f, t) => ({ lx: UP, rx: UP, lz: 0.45 + S(t * 14) * 0.2, rz: -0.45 - S(t * 14) * 0.2, hx: -0.3, by: abs(S(t * 12)) * 0.14 }),
  wiggle: (f, t, rig, a) => ({ hy: a.tauntSide * 0.8, hz: S(t * 12) * 0.25, ty: a.tauntSide * 0.3, [a.tauntSide > 0 ? 'lx' : 'rx']: -2.2, [a.tauntSide > 0 ? 'lz' : 'rz']: a.tauntSide * (0.5 + S(t * 14) * 0.4), by: abs(S(t * 9)) * 0.05 }),
  // crouch and shake while charging, then leap with both arms up
  charge: (f, t) => (f < 0.45
    ? { tx: 0.2, lx: 0.4, rx: 0.4, lz: 0.5, rz: -0.5, hx: 0.15, tz: S(t * 55) * 0.05, hy: S(t * 47) * 0.06, by: -0.04 }
    : { lx: UP, rx: UP, lz: 0.5, rz: -0.5, hx: -0.35, tx: -0.15, by: bump(f, 0.45, 1) * 0.22 }),
  // head up, mouth open: breath attacks (fire, water)
  breath: (f, t) => ({ hx: -0.25 + (f > 0.2 ? 0.1 : 0), jaw: f > 0.15 ? 1 : f * 6, tx: -0.12, lx: -1.3, rx: -1.3, lz: 0.3, rz: -0.3, tz: S(t * 30) * 0.03 }),
  breathUp: (f, t) => ({ hx: -0.75, jaw: 1, tx: -0.2, lx: UP, rx: UP, lz: 0.5 + S(t * 9) * 0.15, rz: -0.5 - S(t * 9) * 0.15, by: abs(S(t * 9)) * 0.05 }),
  // both palms forward, energy between the hands
  palms: (f, t) => ({ lx: -1.45, rx: -1.45, lz: -0.35, rz: 0.35, tx: 0.1, hx: 0.05, ty: S(t * 3) * 0.05, tz: S(t * 40) * 0.015 }),
  palmsUp: (f, t) => ({ lx: UP - 0.15, rx: UP - 0.15, lz: 0.12, rz: -0.12, hx: -0.4, tx: -0.12, by: 0.05 + S(t * 3) * 0.04 }),
  sway: (f, t) => ({ tz: S(t * 5) * 0.16, hz: S(t * 5) * 0.2, rx: -1.9, rz: 0.35, lx: -0.5 + S(t * 5) * 0.3, lz: 0.6, by: abs(S(t * 5)) * 0.04 }),
};

// ============================================================================================
// Pikachu
// ============================================================================================
function pikachu() {
  const Y = 0xf6cf2a, BR = 0x8a5222, RED = 0xe4402a;
  const root = new THREE.Group(); root.name = 'pikachu';
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.42, 0, 0.5, 0.56, 0.44, Y);
    for (const y of [0.5, 0.72]) L.ell(0, y, -0.38, 0.26, 0.05, 0.08, BR);
    for (const sd of [-1, 1]) { L.ell(sd * 0.26, 0.06, 0.3, 0.2, 0.17, 0.32, Y); L.ell(sd * 0.27, 0.0, 0.62, 0.14, 0.08, 0.2, Y); }
  }, 'pika-body'));
  const HC = [0, 0.3, 0], HR = [0.52, 0.44, 0.46];
  const head = pv(torso, 0, 0.98, 0.04, part((L) => {
    L.ell(...HC, ...HR, Y);
    eyes(L, HC, HR, 0.42, 0.16, 0.085);
    for (const sd of [-1, 1]) { const p = onEll(HC, HR, sd * 0.86, -0.2); L.ell(p[0], p[1], p[2], 0.11, 0.1, 0.04, RED, { ry: sd * 0.86 }); }
    L.ell(0, 0.29, 0.455, 0.03, 0.022, 0.02, BK);
    for (const sd of [-1, 1]) L.box(sd * 0.04, 0.215, 0.445, 0.085, 0.022, 0.02, 0x5a2a1a, { rz: sd * 0.5, ry: sd * 0.1 });
    L.stud(0, 0.73, -0.02, 0.09, Y);
  }, 'pika-head'));
  const ears = [1, -1].map((sd) => {
    const e = pv(head, sd * 0.25, 0.62, -0.04, part((L) => {
      L.ell(0, 0.36, 0, 0.11, 0.4, 0.07, Y);
      L.ell(0, 0.66, 0, 0.078, 0.16, 0.055, BK);
    }, 'pika-ear'));
    e.rotation.set(-0.1, 0, -sd * 0.38); e.sd = sd;
    return e;
  });
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.38, 0.66, 0.2, part((L) => {
    L.ell(0, -0.16, 0, 0.1, 0.2, 0.1, Y);
    L.ell(0, -0.36, 0.02, 0.09, 0.08, 0.09, Y);
  }, 'pika-arm')));
  // the lightning-bolt tail (flat, so it never hides Pikachu from the chase camera)
  const tail = pv(torso, 0, 0.3, -0.4, part((L) => {
    slab(L, 0, 0, 0, 0.2, -0.22, 0.1, 0.08, BR);
    slab(L, 0, 0.18, -0.22, 0.42, -0.1, 0.16, 0.08, Y);
    slab(L, 0, 0.42, -0.1, 0.62, -0.5, 0.2, 0.08, Y);
    slab(L, 0, 0.62, -0.5, 0.92, -0.36, 0.3, 0.08, Y);
    slab(L, 0, 0.92, -0.36, 1.32, -0.82, 0.48, 0.08, Y);
  }, 'pika-tail'));
  tail.rotation.y = 0.3;
  const rig = { root, torso, head, tail, armL: arms[0], armR: arms[1], armLen: 0.42, height: 1.8, width: 1.05 };
  // sparks around the cheeks / whole body
  const zap = sparks(torso, 0, 1.15, 0.1, 0.8, 7);
  const cheeks = [1, -1].map((sd) => addGlow(head, 0xfff060, 0.5, sd * 0.42, 0.22, 0.32, 0.8));
  rig.fx = (n, f, t) => {
    const big = (n === 'cheer' && f > 0.25) || n === 'win' || n === 'use' || n === 'throwF';
    const cheek = big || n === 'taunt' || (n === 'cheer');
    vis(zap, big);
    if (big) zap.update(t, n === 'win' ? 0.9 + abs(S(t * 6)) * 0.4 : 1.2);
    for (const c of cheeks) { c.visible = cheek; if (cheek) c.scale.setScalar(0.35 + Math.random() * 0.35); }
    // ears twitch
    for (const e of ears) e.rotation.z = -e.sd * (0.38 + (n === 'taunt' ? S(t * 18) * 0.15 : Math.max(0, S(t * 1.3 + e.sd)) ** 20 * 0.25));
  };
  return rig;
}

// ============================================================================================
// Ash Ketchum: the red-and-white League cap with the green 'L', spiky black hair, big determined
// anime eyes with the zig-zag cheek marks, the open blue jacket with white sleeves and collar over
// a black tee, green fingerless gloves and a Poké Ball on his belt
// ============================================================================================
// local shape helpers for Ash and Mewtwo (custom geometry into a shape kit's builder)
import { taperGeo as akTaper, plastic as akPlastic, cached as akCached } from './kit.js';
const _am = new THREE.Matrix4(), _aq = new THREE.Quaternion(), _ae = new THREE.Euler(), _ap = new THREE.Vector3(), _as = new THREE.Vector3();
const _aUp = new THREE.Vector3(0, 1, 0), _ad = new THREE.Vector3();
function putGeo(L, geo, col, x, y, z, rx, ry, rz, sx, sy, sz) {
  L.b.addMatrix(geo, akPlastic(col), _am.compose(_ap.set(x, y, z), _aq.setFromEuler(_ae.set(rx, ry, rz)), _as.set(sx, sy, sz)));
}
// a cone from base point a along dir (length len, base radius r, squashed by flat across it)
function spike(L, a, dir, len, r, col, flat = 1) {
  _aq.setFromUnitVectors(_aUp, _ad.set(dir[0], dir[1], dir[2]).normalize());
  const geo = akCached('ak-cone8', () => new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0));
  L.b.addMatrix(geo, akPlastic(col), _am.compose(_ap.set(a[0], a[1], a[2]), _aq, _as.set(r, len, r * flat)));
}
// a smooth tube through points whose radius follows rad(u), u = 0..1 along it (tails, cables)
function taperTube(L, key, pts, rad, col, n = 24, rs = 10) {
  const geo = akCached('ak-tube-' + key, () => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const g = new THREE.TubeGeometry(curve, n, 1, rs, false);
    const pos = g.attributes.position, P = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      curve.getPointAt(i / n, P); const r = rad(i / n);
      for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; v.fromBufferAttribute(pos, k).sub(P).multiplyScalar(r).add(P); pos.setXYZ(k, v.x, v.y, v.z); }
    }
    return g;
  });
  L.b.addMatrix(geo, akPlastic(col), _am.identity());
  const a = pts[0], e = pts[pts.length - 1], r0 = rad(0), r1 = rad(1);
  L.ell(a[0], a[1], a[2], r0, r0, r0, col);
  L.ell(e[0], e[1], e[2], r1, r1, r1, col);
}

function ash() {
  const SK = 0xf3c9a0, VEST = 0x2456c0, HAIR = 0x17171d, CAP = 0xd8242a, TEE = 0x1e1e24, GLOVE = 0x2c9a48, GLOVE2 = 0x1f7a36, LOGO = 0x1c8c3c;
  const rig = seatedFig({
    name: 'ash', s: 1.3, torso: VEST, arms: WH, legs: 0x34508a, hips: 0x34508a, skin: SK, hands: GLOVE, noStud: true, extraHeight: 0.22,
    face: faceMat('pk-ash2', (g) => {
      const y = 70;
      g.lineCap = 'round'; g.lineJoin = 'round';
      // a fringe of black hair peeking out under the brim
      g.fillStyle = '#17171d';
      g.beginPath(); g.moveTo(84, 0); g.lineTo(172, 0); g.lineTo(172, 30);
      for (let i = 0; i <= 8; i++) g.lineTo(172 - i * 11, 30 + (i % 2 ? 10 : 0) + (i === 4 ? 4 : 0));
      g.closePath(); g.fill();
      for (const s of [-1, 1]) {
        const x = 128 + s * 16;
        // big anime eyes: white, deep brown iris looking a touch inward, pupil, two shines
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, 8.5, 15, 0, 0, PI * 2); g.fill();
        g.fillStyle = '#4a2a14'; g.beginPath(); g.ellipse(x - s * 1.2, y + 2, 6.4, 12.5, 0, 0, PI * 2); g.fill();
        g.fillStyle = '#100804'; g.beginPath(); g.ellipse(x - s * 1.2, y + 3, 3.4, 7.5, 0, 0, PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x - s * 1.2 + 2, y - 4, 2.2, 4.2, 0, 0, PI * 2); g.fill();
        g.beginPath(); g.ellipse(x - s * 1.2 - 2, y + 8, 1.2, 2.2, 0, 0, PI * 2); g.fill();
        // heavy upper lid with a flick at the outer corner, thin lower lid
        g.strokeStyle = '#120a06'; g.lineWidth = 5;
        g.beginPath(); g.ellipse(x, y + 1, 9.5, 16, 0, PI * 1.1, PI * 1.92); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.moveTo(x + s * 8, y - 9); g.lineTo(x + s * 12, y - 13); g.stroke();
        g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y, 8.5, 15, 0, PI * 0.25, PI * 0.75); g.stroke();
        // determined brows, low at the nose
        g.lineWidth = 6; g.beginPath(); g.moveTo(128 + s * 5, y - 17); g.lineTo(128 + s * 27, y - 25); g.stroke();
        // the zig-zag cheek marks
        g.strokeStyle = '#8a4a2a'; g.lineWidth = 2.8;
        const cx = 128 + s * 29, cy = y + 19;
        g.beginPath(); g.moveTo(cx - s * 5, cy - 4); g.lineTo(cx + s * 1, cy - 4); g.lineTo(cx - s * 3, cy + 2); g.lineTo(cx + s * 4, cy + 2); g.stroke();
      }
      // small nose, big open grin
      g.strokeStyle = '#c08a64'; g.lineWidth = 2; g.beginPath(); g.moveTo(129, y + 14); g.lineTo(131, y + 20); g.stroke();
      g.fillStyle = '#5a1210'; g.beginPath(); g.moveTo(116, y + 27); g.quadraticCurveTo(128, y + 25, 140, y + 27); g.quadraticCurveTo(138, y + 45, 128, y + 46); g.quadraticCurveTo(118, y + 45, 116, y + 27); g.fill();
      g.fillStyle = '#e8606a'; g.beginPath(); g.ellipse(128, y + 41, 7, 4.5, 0, 0, PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(117, y + 27.5); g.quadraticCurveTo(128, y + 25.5, 139, y + 27.5); g.lineTo(138, y + 31); g.quadraticCurveTo(128, y + 29.5, 118, y + 31); g.fill();
      g.strokeStyle = '#2a0a06'; g.lineWidth = 2; g.beginPath(); g.moveTo(116, y + 27); g.quadraticCurveTo(128, y + 25, 140, y + 27); g.quadraticCurveTo(138, y + 45, 128, y + 46); g.quadraticCurveTo(118, y + 45, 116, y + 27); g.stroke();
    }, '#f3c9a0'),
    torsoExtra: (b, d) => {
      const s = d.s, c = d.chestY, L = shape(b);
      // black tee in the open jacket, a brown belt
      rbox(b, 0, c + 0.42 * s, 0.226 * s, 0.32 * s, 0.82 * s, 0.03, -0.025, 0, 0, TEE);
      rbox(b, 0, c + 0.05 * s, 0.232 * s, 0.33 * s, 0.07 * s, 0.03, -0.025, 0, 0, 0x4a3020);
      rbox(b, 0, c + 0.05 * s, 0.238 * s, 0.07 * s, 0.06 * s, 0.02, -0.025, 0, 0, 0xc8a040);
      // white trim down the open edges, yellow tabs at the hem
      for (const sd of [-1, 1]) {
        rbox(b, sd * 0.175 * s, c + 0.4 * s, 0.234 * s, 0.05 * s, 0.8 * s, 0.03, -0.025, 0, 0, WH);
        rbox(b, sd * 0.33 * s, c + 0.08 * s, 0.234 * s, 0.13 * s, 0.07 * s, 0.03, -0.025, 0, 0, 0xf2cd37);
        // the white collar: wide flaps folded down on the shoulders
        rbox(b, sd * 0.17 * s, c + 0.8 * s, 0.13 * s, 0.2 * s, 0.05 * s, 0.24 * s, 0.18, 0, -sd * 0.22, WH);
        rbox(b, sd * 0.15 * s, c + 0.73 * s, 0.22 * s, 0.1 * s, 0.14 * s, 0.04 * s, -0.12, 0, sd * 0.5, WH);
      }
      rbox(b, 0, c + 0.82 * s, -0.12 * s, 0.4 * s, 0.1 * s, 0.1 * s, -0.25, 0, 0, WH);
      // a Poké Ball clipped to the belt on his right hip
      pokeBall(L, -0.36 * s, c + 0.06 * s, 0.25 * s, 0.075 * s);
    },
    arm: (ab, sd, d) => {
      const s = d.s;
      // short white sleeve with a hem, bare forearm, green fingerless glove with a dark cuff
      ab.add(akTaper(0.226, 0.247, 0.27, 0.266), akPlastic(SK), 0, -0.52 * s, 0, 0, s, s, s);
      ab.add(akTaper(0.262, 0.264, 0.05, 0.28), akPlastic(WH), 0, -0.27 * s, 0, 0, s, s, s);
      ab.cyl(0, -0.55 * s, 0, 0.108 * s, 0.05 * s, GLOVE2, { seg: 12 });
      ab.cyl(0, -0.735 * s, 0, 0.09 * s, 0.06 * s, SK, { seg: 12 });
    },
    headExtra: (hb, d) => {
      const L = shape(hb), H = d.headH, R = d.headR;
      const y0 = H * 0.78, cx = R * 1.15, cy = H * 0.54;
      // messy black hair bursting out under the cap at the sides and back
      L.ell(0, H * 0.66, -R * 0.14, R * 1.08, H * 0.2, R * 1.04, HAIR);
      for (const a of [1.45, 1.85, 2.3, 2.75, -1.45, -1.85, -2.3, -2.75, PI]) {
        const sx = S(a), cz = CO(a);
        spike(L, [sx * R * 0.92, H * 0.72, cz * R * 0.92], [sx, -0.12, cz - 0.15], R * (0.62 + (abs(a) > 2 ? 0.1 : 0)), R * 0.24, HAIR, 0.7);
        spike(L, [sx * R * 0.9, H * 0.56, cz * R * 0.9], [sx * 0.9, -0.75, cz - 0.1], R * 0.5, R * 0.2, HAIR, 0.7);
      }
      for (const sd of [-1, 1]) {
        // sideburn tufts in front of the ears
        spike(L, [sd * R * 0.95, H * 0.7, R * 0.42], [sd * 0.3, -1, 0.12], R * 0.42, R * 0.15, HAIR, 0.6);
        spike(L, [sd * R * 0.98, H * 0.74, R * 0.12], [sd * 0.55, -0.8, -0.05], R * 0.48, R * 0.17, HAIR, 0.6);
      }
      // short bangs under the brim
      for (const x of [-0.42, -0.05, 0.32]) spike(L, [x * R, H * 0.8, R * 0.93], [x * 0.6, -1, 0.35], R * 0.2, R * 0.12, HAIR, 0.5);
      // the cap: red crown with a white front panel and a red button, band and long brim
      L.hemi(0, y0, 0, cx, cy, cx, CAP);
      L.cyl(0, y0 + 0.012, 0, cx * 1.005, 0.03 * d.s, CAP, { seg: 20 });
      const panel = akCached('ash-panel', () => new THREE.SphereGeometry(1, 18, 8, PI / 2 - 1.4, 2.8, 0.2, PI / 2 - 0.2));
      putGeo(L, panel, WH, 0, y0 + 0.005, 0, 0, 0, 0, cx * 1.015, cy * 1.015, cx * 1.015);
      L.ell(0, y0 + cy * 1.0, 0, R * 0.13, R * 0.07, R * 0.13, CAP);
      const brim = akCached('ash-brim', () => new THREE.CylinderGeometry(1, 1, 1, 24, 1, false, -PI / 2, PI));
      putGeo(L, brim, CAP, 0, y0 - 0.005, R * 0.08, 0.16, 0, 0, cx * 0.97, 0.05 * d.s, R * 1.75);
      // the green League 'L' on the front panel
      const e = 0.5, a = Math.atan2(S(e) / cy, CO(e) / cx), cxz = cx * 1.03;
      const P0 = [0, y0 + cy * 1.03 * S(e), cxz * CO(e)], Y = [0, CO(a), -S(a)], N = [0, S(a), CO(a)];
      const at = (lx, ly, ln = 0) => [lx, P0[1] + ly * Y[1] + ln * N[1], P0[2] + ly * Y[2] + ln * N[2]];
      L.box(...at(-R * 0.1, R * 0.04), R * 0.13, R * 0.46, 0.025, LOGO, { rx: -a });
      L.box(...at(R * 0.04, -R * 0.14), R * 0.4, R * 0.12, 0.025, LOGO, { rx: -a });
      L.box(...at(R * 0.2, -R * 0.06), R * 0.1, R * 0.26, 0.025, LOGO, { rx: -a });
      // the adjuster opening at the back
      L.ell(0, y0 + cy * 0.12, -cx * 0.985, R * 0.24, H * 0.09, R * 0.05, TEE);
    },
  });
  // the Poké Ball in his right hand (counter the minifig arm stretch so it stays round)
  const s = rig.dims.s;
  const ball = fxg(rig.armR, 0, -0.76 * s, 0.04);
  ball.scale.set(1 / 1.1, 1 / 1.22, 1 / 1.1);
  ball.add(part((L) => pokeBall(L, 0, 0, 0, 0.17)));
  ball.rotation.x = -PI / 2;
  const burst = sparks(rig.armR, 0, -0.8 * s, 0.1, 0.4, 5, 0xffffff);
  rig.fx = (n, f, t) => {
    const hold = (n === 'cheer' && f < 0.62) || n === 'win' || ((n === 'use' || n === 'throwF' || n === 'throwB') && f < 0.5);
    vis(ball, hold);
    const pop = n === 'cheer' && f > 0.62 && f < 0.85;
    vis(burst, pop);
    if (pop) burst.update(t, 1.4);
  };
  return rig;
}

// ============================================================================================
// Charmander
// ============================================================================================
function charmander() {
  const OR = 0xf28a32, BEL = 0xf8dc8a;
  const root = new THREE.Group(); root.name = 'charmander';
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.42, 0, 0.42, 0.52, 0.38, OR);
    L.ell(0, 0.38, 0.17, 0.3, 0.4, 0.24, BEL);
    for (const sd of [-1, 1]) {
      L.ell(sd * 0.24, 0.08, 0.28, 0.17, 0.15, 0.3, OR); L.ell(sd * 0.25, 0.0, 0.6, 0.13, 0.08, 0.18, OR);
      for (const x of [-0.06, 0.06]) L.ell(sd * 0.25 + x, 0.01, 0.76, 0.03, 0.03, 0.03, WH);
    }
  }, 'char-body'));
  const HC = [0, 0.3, 0.05], HR = [0.42, 0.38, 0.4];
  const head = pv(torso, 0, 0.92, 0.05, part((L) => {
    L.ell(...HC, ...HR, OR);
    L.ell(0, 0.2, 0.3, 0.3, 0.2, 0.24, OR);
    eyes(L, HC, HR, 0.5, 0.25, 0.08, { iris: 0x2a4a8a, tall: 1.4 });
    for (const sd of [-1, 1]) L.ell(sd * 0.07, 0.27, 0.53, 0.015, 0.012, 0.01, BK);
    L.ell(0, 0.12, 0.38, 0.2, 0.035, 0.12, 0x8a1a10);
    L.stud(0, 0.66, 0.05, 0.08, OR);
  }, 'char-head'));
  const jaw = pv(head, 0, 0.12, 0.2, part((L) => { L.ell(0, -0.01, 0.12, 0.2, 0.05, 0.15, OR); }, 'char-jaw'));
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.36, 0.66, 0.2, part((L) => {
    L.ell(0, -0.16, 0, 0.08, 0.19, 0.08, OR);
    L.ell(0, -0.34, 0.02, 0.08, 0.07, 0.08, OR);
  }, 'char-arm')));
  const tail = pv(torso, 0, 0.18, -0.32, part((L) => chain(L, 0, [[0, -0.08, 0.14], [0.1, -0.38, 0.12], [0.28, -0.6, 0.1], [0.52, -0.7, 0.08]], OR)));
  tail.rotation.y = 0.6;
  const tailFire = flame(tail, 0, 0.58, -0.72, 0.2);
  const breath = jet(head, 0, 0.14, 0.55, FIRE, 2.4, 0.16);
  const rig = { root, torso, head, jaw, jawOpen: 0.5, tail, armL: arms[0], armR: arms[1], armLen: 0.42, height: 1.7, width: 0.95 };
  rig.fx = (n, f, t) => {
    const fire = (n === 'cheer' && f > 0.2 && f < 0.9) || (n === 'win' && S(t * LOOP) > 0);
    vis(breath, fire);
    if (fire) breath.update(t, n === 'win' ? 0.7 : 1);
    breath.rotation.x = n === 'win' ? -0.9 : 0;
    tailFire.update(t, n === 'cheer' || n === 'win' ? 1.7 : n === 'ouch' ? 0.6 : 1);
  };
  return rig;
}

// ============================================================================================
// Squirtle
// ============================================================================================
function squirtle() {
  const BL = 0x7cc8e8, SH = 0x9a5a2a, RIM = 0xf2e2a0, BEL = 0xf2d888;
  const root = new THREE.Group(); root.name = 'squirtle';
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.45, -0.08, 0.48, 0.55, 0.4, SH);
    L.ell(0, 0.45, 0.0, 0.5, 0.56, 0.32, RIM);
    L.ell(0, 0.43, 0.1, 0.4, 0.5, 0.28, BEL);
    for (const y of [0.3, 0.5]) L.box(0, y, 0.37, 0.4, 0.025, 0.03, 0xc8a050);
    L.box(0, 0.42, 0.38, 0.025, 0.42, 0.03, 0xc8a050);
    for (const [x, y] of [[0.22, 0.65], [-0.2, 0.3], [0, 0.85], [0.3, 0.35], [-0.32, 0.6]]) L.ell(x, y, -0.43, 0.1, 0.1, 0.04, 0x7a4220);
    for (const sd of [-1, 1]) { L.ell(sd * 0.25, 0.06, 0.28, 0.17, 0.15, 0.3, BL); L.ell(sd * 0.26, 0.0, 0.6, 0.13, 0.08, 0.18, BL); }
    L.ell(0, 0.88, 0.02, 0.2, 0.12, 0.2, BL);
  }, 'squirt-body'));
  const HC = [0, 0.28, 0.02], HR = [0.44, 0.4, 0.42];
  const head = pv(torso, 0, 0.96, 0.05, part((L) => {
    L.ell(...HC, ...HR, BL);
    eyes(L, HC, HR, 0.42, 0.12, 0.085, { iris: 0x8a3a2a, pupil: BK, tall: 1.3 });
    L.ell(0, 0.13, 0.42, 0.13, 0.03, 0.05, 0x7a2a2a);
    for (const sd of [-1, 1]) L.ell(sd * 0.05, 0.27, 0.44, 0.012, 0.012, 0.01, BK);
    L.stud(0, 0.68, 0.02, 0.08, BL);
  }, 'squirt-head'));
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.4, 0.68, 0.16, part((L) => {
    L.ell(0, -0.16, 0, 0.09, 0.2, 0.09, BL);
    L.ell(0, -0.35, 0.02, 0.09, 0.08, 0.09, BL);
  }, 'squirt-arm')));
  // the curly tail
  const tail = pv(torso, 0, 0.18, -0.42, part((L) => chain(L, 0, [[0, -0.05, 0.12], [0.08, -0.3, 0.14], [0.3, -0.42, 0.13], [0.48, -0.32, 0.11], [0.46, -0.16, 0.09], [0.32, -0.16, 0.08]], BL, 0.7)));
  tail.rotation.y = 0.5;
  // Water Gun and the Squirtle Squad shades
  const water = jet(head, 0, 0.13, 0.48, [0x9ad8ff, 0xffffff, 0x4aa8ff], 2.6, 0.13);
  const shades = fxg(head);
  shades.add(part((L) => {
    for (const sd of [-1, 1]) { const p = onEll(HC, HR, sd * 0.4, 0.14); L.ell(p[0], p[1], p[2] + 0.03, 0.15, 0.1, 0.05, 0x111111, { ry: sd * 0.4, matOpts: { rough: 0.1, metal: 0.4 } }); }
    L.box(0, 0.33, 0.45, 0.2, 0.03, 0.03, 0x111111);
    for (const sd of [-1, 1]) L.box(sd * 0.42, 0.34, 0.12, 0.03, 0.03, 0.45, 0x111111, { ry: sd * 0.3 });
  }, 'squirt-shades'));
  const rig = { root, torso, head, tail, armL: arms[0], armR: arms[1], armLen: 0.42, height: 1.72, width: 1.05 };
  rig.fx = (n, f, t) => {
    const wet = (n === 'cheer' && f > 0.15 && f < 0.88) || n === 'win';
    vis(water, wet);
    if (wet) { water.update(t, n === 'win' ? 0.8 : 1); water.rotation.x = n === 'win' ? -1.25 : 0; }
    vis(shades, n === 'taunt' || n === 'win');
  };
  return rig;
}

// ============================================================================================
// Bulbasaur: a quadruped, the forelegs reach the wheel and Vine Whips lash out of the bulb
// ============================================================================================
function bulbasaur() {
  const TL = 0x78c8a8, SP = 0x3a8a72, BU = 0x4aa84a, BU2 = 0x2e7a3a;
  const root = new THREE.Group(); root.name = 'bulbasaur';
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.34, -0.02, 0.5, 0.42, 0.52, TL);
    for (const [x, y, z] of [[0.36, 0.45, 0.15], [-0.4, 0.3, -0.1], [0.2, 0.62, -0.25], [-0.25, 0.6, 0.2]]) L.ell(x, y, z, 0.1, 0.08, 0.1, SP);
    // the bulb on its back
    L.ell(0, 0.88, -0.22, 0.44, 0.4, 0.42, BU);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; L.ell(S(a) * 0.3, 0.92, -0.22 + CO(a) * 0.3, 0.06, 0.38, 0.06, BU2, { rx: CO(a) * 0.6, rz: -S(a) * 0.6 }); }
    L.cone(0, 1.3, -0.22, 0.12, 0.2, BU, { seg: 8 });
    for (const sd of [-1, 1]) { L.ell(sd * 0.3, 0.06, 0.3, 0.18, 0.16, 0.3, TL); L.ell(sd * 0.31, 0.0, 0.6, 0.14, 0.08, 0.18, TL); for (const x of [-0.06, 0.06]) L.cone(sd * 0.31 + x, 0.02, 0.76, 0.025, 0.07, WH, { rx: PI / 2 }); }
  }, 'bulba-body'));
  const HC = [0, 0.16, 0.08], HR = [0.48, 0.36, 0.42];
  const head = pv(torso, 0, 0.72, 0.38, part((L) => {
    L.ell(...HC, ...HR, TL);
    for (const [x, y, z] of [[0.22, 0.42, 0.0], [-0.12, 0.45, -0.05], [0.0, 0.38, 0.28]]) L.ell(x, y, z, 0.08, 0.04, 0.08, SP);
    eyes(L, HC, HR, 0.62, 0.12, 0.085, { iris: 0xd03030, tall: 1.1 });
    for (const sd of [-1, 1]) {
      L.cone(sd * 0.3, 0.5, -0.04, 0.09, 0.22, TL, { rz: -sd * 0.5 });
      L.ell(sd * 0.06, 0.2, 0.5, 0.015, 0.012, 0.01, BK);
    }
    L.ell(0, 0.04, 0.44, 0.22, 0.03, 0.08, 0x8a2a2a);
  }, 'bulba-head'));
  const jaw = pv(head, 0, 0.04, 0.2, part((L) => { L.ell(0, -0.04, 0.12, 0.3, 0.06, 0.18, TL); }, 'bulba-jaw'));
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.42, 0.56, 0.36, part((L) => {
    L.ell(0, -0.17, 0, 0.13, 0.2, 0.13, TL);
    L.ell(0, -0.34, 0.03, 0.12, 0.08, 0.13, TL);
    for (const x of [-0.05, 0.05]) L.cone(x, -0.36, 0.16, 0.022, 0.06, WH, { rx: PI / 2 });
  }, 'bulba-leg')));
  // Vine Whip: two vines curl out of the sides of the bulb
  const vines = [1, -1].map((sd) => {
    const g = fxg(torso, sd * 0.32, 0.9, -0.1);
    g.add(part((L) => {
      const pts = [[0, 0, 0], [sd * 0.3, 0.25, 0.15], [sd * 0.5, 0.55, 0.45], [sd * 0.45, 0.85, 0.8], [sd * 0.25, 0.95, 1.1]];
      for (let i = 0; i < pts.length - 1; i++) L.rod(pts[i], pts[i + 1], 0.045 - i * 0.005, 0x3a9a3a);
      L.ell(sd * 0.22, 0.97, 1.16, 0.08, 0.03, 0.12, 0x5aba4a, { ry: sd * 0.4 });
    }, 'vine'));
    g.sd = sd;
    return g;
  });
  const rig = { root, torso, head, jaw, jawOpen: 0.5, armL: arms[0], armR: arms[1], armLen: 0.4, height: 1.4, width: 1.15 };
  rig.idle = (t) => { torso.scale.set(1, 1 + S(t * 2.2) * 0.012, 1); };
  rig.fx = (n, f, t) => {
    const on = (n === 'cheer' && f > 0.1 && f < 0.92) || n === 'win' || n === 'taunt';
    for (const v of vines) {
      vis(v, on);
      if (on) { const k = n === 'cheer' ? sm(seg(f, 0.1, 0.3)) : 1; v.scale.setScalar(0.2 + 0.8 * k); v.rotation.set(S(t * 9 + v.sd) * 0.4 - 0.2, v.sd * S(t * 7) * 0.4, v.sd * S(t * 11) * 0.2); }
    }
  };
  return rig;
}

// ============================================================================================
// Eevee
// ============================================================================================
function eevee() {
  const BR = 0x9a6236, CR = 0xf2e2bc, DK = 0x5a3a20;
  const root = new THREE.Group(); root.name = 'eevee';
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.38, 0, 0.38, 0.45, 0.36, BR);
    // the fluffy cream ruff
    for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2; L.ell(S(a) * 0.32, 0.78 - Math.max(0, CO(a)) * 0.1, CO(a) * 0.3 + 0.03, 0.17, 0.15, 0.17, CR); }
    L.ell(0, 0.62, 0.3, 0.2, 0.18, 0.12, CR);
    for (const sd of [-1, 1]) { L.ell(sd * 0.22, 0.06, 0.28, 0.15, 0.14, 0.28, BR); L.ell(sd * 0.23, 0.0, 0.58, 0.11, 0.07, 0.15, BR); }
  }, 'eevee-body'));
  const HC = [0, 0.26, 0.05], HR = [0.4, 0.34, 0.36];
  const head = pv(torso, 0, 0.94, 0.06, part((L) => {
    L.ell(...HC, ...HR, BR);
    L.ell(0, 0.17, 0.3, 0.17, 0.12, 0.14, BR);
    eyes(L, HC, HR, 0.45, 0.14, 0.1, { iris: 0x5a2a10, tall: 1.15 });
    L.ell(0, 0.22, 0.44, 0.03, 0.022, 0.02, BK);
    L.ell(0, 0.12, 0.42, 0.06, 0.012, 0.02, 0x4a2010);
  }, 'eevee-head'));
  const ears = [1, -1].map((sd) => {
    const e = pv(head, sd * 0.22, 0.48, -0.02, part((L) => {
      L.ell(0, 0.4, 0, 0.17, 0.44, 0.06, BR);
      L.ell(0, 0.4, 0.035, 0.1, 0.32, 0.03, DK);
    }, 'eevee-ear'));
    e.rotation.set(-0.1, 0, -sd * 0.6); e.sd = sd;
    return e;
  });
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.3, 0.6, 0.2, part((L) => {
    L.ell(0, -0.16, 0, 0.09, 0.2, 0.09, BR);
    L.ell(0, -0.35, 0.02, 0.09, 0.07, 0.09, BR);
  }, 'eevee-arm')));
  const tail = pv(torso, 0, 0.28, -0.32, part((L) => {
    L.ell(0, 0.3, -0.25, 0.24, 0.42, 0.22, BR, { rx: -0.65 });
    L.ell(0, 0.62, -0.52, 0.21, 0.24, 0.2, CR, { rx: -0.65 });
  }, 'eevee-tail'));
  tail.rotation.y = 0.45;
  const charm = sparks(head, 0, 0.35, 0.2, 0.75, 6, 0xff8ad0);
  const rig = { root, torso, head, tail, armL: arms[0], armR: arms[1], armLen: 0.42, height: 1.75, width: 1.0 };
  rig.fx = (n, f, t) => {
    const on = (n === 'cheer' && f > 0.3) || n === 'win';
    vis(charm, on);
    if (on) charm.update(t, 1);
    for (const e of ears) e.rotation.z = -e.sd * (0.6 + (n === 'taunt' || n === 'cheer' ? S(t * 16) * 0.18 : 0));
  };
  return rig;
}

// ============================================================================================
// Jigglypuff: a pink ball; its face slides over the ball as it turns. Sings with a mic-marker,
// puffs up in a huff on a taunt.
// ============================================================================================
function jigglypuff() {
  const PK = 0xf6a8c4, PK2 = 0xe888a8;
  const root = new THREE.Group(); root.name = 'jigglypuff';
  const R = 0.64, BC = [0, 0, 0], BR = [R, R, R * 0.96];
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.6, 0, R, R, R * 0.96, PK);
    for (const sd of [-1, 1]) L.ell(sd * 0.24, 0.02, 0.36, 0.15, 0.09, 0.22, PK);
  }, 'jiggly-body'));
  const head = pv(torso, 0, 0.6, 0, part((L) => {
    eyes(L, BC, BR, 0.38, 0.12, 0.15, { iris: 0x2a8ac8, tall: 1.05 });
    for (const sd of [-1, 1]) {
      const p = onEll(BC, BR, sd * 0.62, 0.62);
      L.cone(p[0], p[1] + 0.06, p[2], 0.16, 0.3, PK, { rz: -sd * 0.55, rx: -0.2 });
      L.cone(p[0] + sd * 0.01, p[1] + 0.06, p[2] + 0.06, 0.08, 0.2, 0x2a2a2a, { rz: -sd * 0.55, rx: -0.2 });
    }
    const m = onEll(BC, BR, 0, -0.18);
    L.ell(m[0], m[1], m[2] - 0.01, 0.07, 0.03, 0.03, 0x9a2a4a);
    // the forehead curl
    for (let i = 0; i < 6; i++) { const a = i * 0.9; L.ell(S(a) * 0.08 * (1 - i * 0.1), R * 0.9 + CO(a) * 0.08, 0.3 + i * 0.03, 0.07, 0.07, 0.07, PK2); }
  }, 'jiggly-face'));
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.52, 0.52, 0.32, part((L) => { L.ell(0, -0.12, 0.02, 0.1, 0.16, 0.1, PK); }, 'jiggly-arm')));
  const mic = fxg(arms[1], 0, -0.25, 0.08);
  mic.add(part((L) => { L.cyl(0, -0.12, 0, 0.045, 0.32, 0x5a9adf); L.cone(0, -0.33, 0, 0.045, 0.1, BK, { rx: PI }); L.cyl(0, 0.05, 0, 0.05, 0.05, WH); }, 'jiggly-mic'));
  mic.rotation.x = PI;
  const song = notes(torso, 0, 1.0, 0.2);
  const rig = { root, torso, head, armL: arms[0], armR: arms[1], armLen: 0.3, height: 1.45, width: 1.3 };
  rig.fx = (n, f, t) => {
    const sing = n === 'cheer' || n === 'win';
    vis(mic, sing); vis(song, sing);
    if (sing) song.update(t);
    // a huff: puffed up
    const puff = n === 'taunt' ? bump(f, 0, 1) : n === 'ouch' ? bump(f, 0, 1) * 0.5 : 0;
    torso.scale.setScalar(1 + puff * (0.16 + S(t * 20) * 0.02));
  };
  return rig;
}

// ============================================================================================
// Gengar: a grinning purple shadow that fades away (own see-through material)
// ============================================================================================
function gengar() {
  const PU = 0x6a4a9a;
  const GM = new THREE.MeshStandardMaterial({ color: PU, roughness: 0.34, transparent: true, opacity: 1 });
  const root = new THREE.Group(); root.name = 'gengar';
  const R = [0.66, 0.62, 0.54];
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.6, 0, ...R, 0, { mat: GM });
    // spikes down the back
    for (const [x, y] of [[0, 1.05], [0.3, 0.95], [-0.3, 0.95], [0.45, 0.7], [-0.45, 0.7], [0.15, 0.75], [-0.15, 0.75]]) L.cone(x, y, -0.42, 0.11, 0.32, 0, { mat: GM, rx: -1.1 - (1.05 - y) * 0.8, rz: -x * 0.8 });
    for (const sd of [-1, 1]) { L.ell(sd * 0.3, 0.06, 0.3, 0.2, 0.17, 0.3, 0, { mat: GM }); L.ell(sd * 0.31, 0.0, 0.62, 0.15, 0.08, 0.2, 0, { mat: GM }); }
  }, 'gengar-body'));
  const C0 = [0, 0, 0];
  const head = pv(torso, 0, 0.6, 0, part((L) => {
    eyes(L, C0, R, 0.33, 0.28, 0.13, { rim: 0xd02020, tall: 0.75, roll: -0.35, oneShine: true });
    // the grin
    for (let i = -6; i <= 6; i++) {
      const y = i / 6, p = onEll(C0, R, y * 0.62, -0.2 + y * y * 0.22);
      L.box(p[0], p[1], p[2], 0.11, 0.1 - abs(y) * 0.04, 0.05, WH, { ry: y * 0.62 });
      L.box(p[0], p[1] - 0.05 + abs(y) * 0.02, p[2], 0.11, 0.02, 0.055, 0x2a1030, { ry: y * 0.62 });
    }
    for (const sd of [-1, 1]) L.cone(sd * 0.38, 0.55, -0.05, 0.13, 0.36, 0, { mat: GM, rz: -sd * 0.45 });
  }, 'gengar-face'));
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.58, 0.62, 0.15, part((L) => {
    L.ell(0, -0.18, 0, 0.11, 0.22, 0.11, 0, { mat: GM });
    for (const x of [-0.05, 0, 0.05]) L.cone(x, -0.42, 0.02, 0.035, 0.1, 0, { mat: GM, rx: PI });
  }, 'gengar-arm')));
  const tail = pv(torso, 0, 0.25, -0.5, part((L) => { L.cone(0, 0.0, -0.15, 0.1, 0.32, 0, { mat: GM, rx: -1.6 }); }, 'gengar-tail'));
  const ball = orb(torso, 0, 0.75, 0.95, 0x6a1ad0, 0.28, 0x1a0030);
  const rig = { root, torso, head, tail, armL: arms[0], armR: arms[1], armLen: 0.48, height: 1.55, width: 1.4 };
  rig.fx = (n, f, t) => {
    // fade into the shadows (cheer), flicker on a win; the eyes and grin stay
    let op = 1;
    if (n === 'cheer') op = 1 - 0.85 * bump(f, 0.05, 0.95);
    else if (n === 'win') op = 0.35 + abs(S(t * 2.2)) * 0.65;
    else if (n === 'taunt') op = 0.6 + abs(S(t * 9)) * 0.4;
    GM.opacity = op; GM.depthWrite = op > 0.95;
    const orbOn = (n === 'cheer' && f > 0.35) || n === 'win' || n === 'use';
    vis(ball, orbOn);
    if (orbOn) { ball.update(t, n === 'win' ? 1.2 : 1); ball.position.set(0, n === 'win' ? 1.9 : 0.75, n === 'win' ? 0.2 : 0.95); }
  };
  return rig;
}

// ============================================================================================
// Lucario: the Aura Pokémon, an Aura Sphere between its palms
// ============================================================================================
function lucario() {
  const BL = 0x3a6ac8, DK = 0x1e1e28, CR = 0xe8d48a;
  const root = new THREE.Group(); root.name = 'lucario';
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.05, 0, 0.36, 0.2, 0.28, DK);
    for (const sd of [-1, 1]) { L.ell(sd * 0.2, 0.06, 0.3, 0.14, 0.13, 0.32, BL); L.ell(sd * 0.21, -0.05, 0.62, 0.11, 0.14, 0.12, DK); }
    L.ell(0, 0.38, 0, 0.32, 0.3, 0.25, BL);
    L.ell(0, 0.72, 0.02, 0.38, 0.32, 0.28, CR);
    L.cone(0, 0.72, 0.36, 0.06, 0.2, WH, { rx: PI / 2 });
    L.ell(0, 0.95, 0.0, 0.42, 0.12, 0.24, BL);
    for (const sd of [-1, 1]) L.ell(sd * 0.3, 0.5, -0.05, 0.12, 0.2, 0.16, CR);
  }, 'lucario-body'));
  const HC = [0, 0.22, 0], HR = [0.3, 0.28, 0.3];
  const head = pv(torso, 0, 1.06, 0.04, part((L) => {
    L.ell(...HC, ...HR, BL);
    L.ell(0, 0.12, 0.24, 0.15, 0.12, 0.18, BL);
    L.ell(0, 0.18, 0.41, 0.04, 0.03, 0.03, DK);
    L.ell(0, 0.26, 0.04, 0.315, 0.075, 0.3, DK);
    eyes(L, HC, HR, 0.42, 0.13, 0.055, { rim: 0xd02a2a, tall: 0.9, roll: -0.25, oneShine: true });
    for (const sd of [-1, 1]) {
      L.cone(sd * 0.17, 0.62, -0.04, 0.08, 0.42, BL, { rz: -sd * 0.18 });
      // the four aura appendages hang from the back of the head
      for (const dz of [0, 0.1]) L.rod([sd * 0.1, 0.2 - dz, -0.24], [sd * 0.16, -0.22 - dz, -0.42 - dz], 0.035, DK);
    }
  }, 'lucario-head'));
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.4, 0.92, 0.02, part((L) => {
    L.ell(0, -0.16, 0, 0.1, 0.18, 0.1, BL);
    L.ell(0, -0.42, 0.0, 0.09, 0.16, 0.09, DK);
    L.ell(0, -0.6, 0.02, 0.085, 0.07, 0.085, DK);
    L.cone(0, -0.55, -0.1, 0.035, 0.12, WH, { rx: -PI / 2 });
  }, 'lucario-arm')));
  const tail = pv(torso, 0, 0.15, -0.28, part((L) => { L.ell(0, 0.05, -0.2, 0.12, 0.1, 0.24, BL, { rx: 0.4 }); }, 'lucario-tail'));
  const aura = orb(torso, 0, 0.82, 0.92, 0x4aa0ff, 0.26);
  const rig = { root, torso, head, tail, armL: arms[0], armR: arms[1], armLen: 0.66, height: 2.0, width: 1.0 };
  rig.fx = (n, f, t) => {
    const on = (n === 'cheer' && f > 0.15) || n === 'win' || n === 'use';
    vis(aura, on);
    if (on) {
      const k = n === 'cheer' ? sm(seg(f, 0.15, 0.5)) * 1.2 : 1;
      aura.update(t, k);
      if (n === 'win') aura.position.set(0, 2.25 + S(t * 3) * 0.05, 0.1); else aura.position.set(0, 0.82, 0.92);
    }
  };
  return rig;
}

// ============================================================================================
// Mewtwo: a smallish feline skull (wide at the back, short flat muzzle, two blunt horns set wide)
// with narrow, slanted violet eyes on the sides of the head, a long neck and the tube from the
// back of the skull to the upper back; narrow shoulders with bony collar knobs, a slim chest and
// waist over wide hips and thick thighs (bottom-heavy), the purple belly, slender arms with
// three bulb-tipped fingers and a long, thick purple tail. It floats in a purple aura with a
// Shadow Ball overhead
// ============================================================================================
function mewtwo() {
  const LV = 0xb9a6d6, LV2 = 0x9e88c0, PU = 0x8a42c4, EYE = 0x7a1ed0, INK = 0x22102e;
  const root = new THREE.Group(); root.name = 'mewtwo';
  const torso = pv(root, 0, 0, 0, part((L) => {
    // wide hips and very thick thighs along the seat, slimmer shins down into the tub, toed feet
    L.ell(0, 0.13, -0.05, 0.31, 0.19, 0.24, LV);
    for (const sd of [-1, 1]) {
      L.ell(sd * 0.2, 0.1, 0.2, 0.185, 0.18, 0.36, LV, { ry: sd * 0.06 });
      L.ell(sd * 0.22, 0.07, 0.54, 0.12, 0.12, 0.12, LV);
      L.ell(sd * 0.22, -0.17, 0.6, 0.075, 0.24, 0.08, LV);
      L.ell(sd * 0.22, -0.42, 0.68, 0.075, 0.055, 0.13, LV);
      for (const x of [-0.035, 0.035]) L.ell(sd * 0.22 + x, -0.43, 0.8, 0.038, 0.04, 0.05, LV);
    }
    // slim waist, the purple abdomen down between the legs
    L.ell(0, 0.42, -0.06, 0.155, 0.24, 0.135, LV);
    L.ell(0, 0.37, 0.0, 0.142, 0.27, 0.13, PU, { rx: -0.28 });
    L.ell(0, 0.15, 0.09, 0.12, 0.11, 0.13, PU);
    // slim chest and narrow shoulders with the bony collar / shoulder knobs
    L.ell(0, 0.68, -0.05, 0.205, 0.2, 0.16, LV);
    L.ell(0, 0.56, -0.04, 0.17, 0.13, 0.14, LV);
    for (const sd of [-1, 1]) {
      L.ell(sd * 0.09, 0.82, 0.05, 0.075, 0.035, 0.04, LV2, { rz: -sd * 0.25 });
      L.ell(sd * 0.22, 0.83, -0.03, 0.065, 0.055, 0.075, LV2);
    }
    // a long neck leaning forward, and the tube from the upper back to the back of the skull
    L.rod([0, 0.76, -0.04], [0, 1.0, 0.05], 0.08, LV);
    taperTube(L, 'mew2-tube', [[0, 0.72, -0.15], [0, 0.86, -0.26], [0, 1.02, -0.27], [0, 1.13, -0.16]], (u) => 0.056 - 0.006 * u, LV, 14, 8);
  }, 'mewtwo-body'));
  // the skull: wide rounded cranium at the back, narrower face, short flat muzzle
  const FC = [0, 0.1, 0.03], FR = [0.13, 0.11, 0.13];
  const head = pv(torso, 0, 1.0, 0.05, part((L) => {
    L.ell(0, 0.15, -0.07, 0.165, 0.125, 0.15, LV);
    L.ell(0, 0.17, -0.13, 0.15, 0.11, 0.1, LV);
    L.ell(...FC, ...FR, LV);
    L.ell(0, 0.05, 0.11, 0.072, 0.045, 0.052, LV);
    L.box(0, 0.027, 0.152, 0.046, 0.007, 0.01, 0x4a3458);
    // narrow, slanted violet eyes on the sides of the head under heavy brows
    for (const sd of [-1, 1]) {
      const yw = sd * 0.98, e = onEll(FC, FR, yw, 0.18), nx = S(yw), nz = CO(yw), tx = CO(yw), tz = -S(yw);
      const at = (n, t, u) => [e[0] + nx * n + tx * t, e[1] + u, e[2] + nz * n + tz * t];
      const o = { ry: yw, rz: sd * 0.32 };
      let p = at(-0.004, 0, 0); L.ell(p[0], p[1], p[2], 0.05, 0.024, 0.016, INK, o);
      p = at(0.004, -sd * 0.004, -0.001); L.ell(p[0], p[1], p[2], 0.038, 0.018, 0.012, EYE, o);
      p = at(0.01, -sd * 0.012, -0.002); L.ell(p[0], p[1], p[2], 0.009, 0.014, 0.006, INK, o);
      p = at(0.012, -sd * 0.024, 0.006); L.ell(p[0], p[1], p[2], 0.006, 0.006, 0.004, WH, o);
      p = at(-0.004, sd * 0.004, 0.026); L.ell(p[0], p[1], p[2], 0.055, 0.015, 0.024, LV2, { ry: yw, rz: sd * 0.42 });
    }
    // two short blunt horn-ears set wide on top
    for (const sd of [-1, 1]) {
      L.ell(sd * 0.115, 0.255, -0.08, 0.046, 0.07, 0.046, LV, { rz: -sd * 0.3, rx: -0.15 });
      L.ell(sd * 0.135, 0.3, -0.085, 0.04, 0.04, 0.04, LV);
    }
  }, 'mewtwo-head'));
  head.children[0].scale.setScalar(1.12);
  // slender arms, three fingers ending in round bulbs
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.25, 0.83, -0.02, part((L) => {
    L.ell(0, -0.02, 0, 0.065, 0.065, 0.065, LV);
    L.ell(0, -0.17, 0, 0.06, 0.16, 0.06, LV);
    L.ell(0, -0.43, 0.01, 0.064, 0.15, 0.064, LV);
    L.ell(0, -0.6, 0.015, 0.05, 0.045, 0.055, LV);
    for (const [x, z, l] of [[-0.035, 0.035, 0.1], [0.005, 0.04, 0.12], [0.04, -0.01, 0.09]]) {
      const tip = [x * 1.3, -0.61 - l, z * 1.2];
      L.rod([x * 0.6, -0.61, z], tip, 0.016, LV);
      L.ell(tip[0], tip[1], tip[2], 0.026, 0.026, 0.026, LV);
    }
  }, 'mewtwo2-arm')));
  // the long, thick tail from the base of the spine, tapering to a rounded bulb, curving up
  const tail = pv(torso, 0, 0.14, -0.24, part((L) => {
    taperTube(L, 'mew2-tail', [[0, 0, 0], [0, -0.06, -0.3], [0, -0.02, -0.62], [0, 0.14, -0.88], [0, 0.4, -1.0], [0, 0.68, -0.94]],
      (u) => 0.16 - 0.11 * Math.pow(u, 0.75) + 0.035 * sm((u - 0.82) / 0.18), PU, 36, 12);
  }, 'mewtwo-tail'));
  tail.rotation.y = 0.55;
  const aura = fxg(root);
  for (const [x, y, z, s] of [[0, 0.8, 0, 2.6], [0, 1.4, 0, 1.6], [0.5, 0.6, 0.2, 1.0], [-0.5, 0.6, 0.2, 1.0]]) addGlow(aura, 0xb070ff, s, x, y, z, 0.4);
  const ball = orb(torso, 0.4, 2.1, 0.2, 0x6a2aba, 0.3, 0x2a0a4a);
  const rig = { root, torso, head, tail, armL: arms[0], armR: arms[1], armLen: 0.66, height: 1.45, width: 0.95 };
  rig.fx = (n, f, t) => {
    const psy = n === 'cheer' || n === 'win' || n === 'use' || n === 'taunt';
    vis(aura, psy);
    if (psy) aura.scale.setScalar(1 + S(t * 7) * 0.08);
    const on = (n === 'cheer' && f > 0.25) || n === 'win' || n === 'use';
    vis(ball, on);
    if (on) ball.update(t, n === 'cheer' ? sm(seg(f, 0.25, 0.55)) * 1.3 : 1.1);
  };
  return rig;
}

// ============================================================================================
// Charizard: wings fold along the back and spread to glide; breathes fire on a cheer
// ============================================================================================
function charizard() {
  const OR = 0xf08030, CR = 0xf6e09a, WG = 0x2a8aa0;
  const root = new THREE.Group(); root.name = 'charizard';
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.62, 0, 0.6, 0.74, 0.52, OR);
    L.ell(0, 0.58, 0.22, 0.44, 0.6, 0.34, CR);
    L.ell(0, 1.28, 0.12, 0.27, 0.36, 0.26, OR);
    L.ell(0, 1.26, 0.25, 0.18, 0.3, 0.16, CR);
    for (const sd of [-1, 1]) {
      L.ell(sd * 0.34, 0.1, 0.3, 0.26, 0.24, 0.42, OR); L.ell(sd * 0.36, -0.02, 0.74, 0.18, 0.12, 0.22, OR);
      for (const x of [-0.08, 0.08]) L.cone(sd * 0.36 + x, 0.0, 0.95, 0.03, 0.09, WH, { rx: PI / 2 });
    }
  }, 'zard-body'));
  const HC = [0, 0.18, 0.06], HR = [0.3, 0.27, 0.32];
  const head = pv(torso, 0, 1.58, 0.22, part((L) => {
    L.ell(...HC, ...HR, OR);
    L.ell(0, 0.12, 0.36, 0.22, 0.16, 0.24, OR);
    eyes(L, HC, HR, 0.55, 0.2, 0.06, { iris: 0x2a5aa0, tall: 1.2, roll: -0.2 });
    for (const sd of [-1, 1]) { L.cone(sd * 0.17, 0.42, -0.2, 0.06, 0.38, OR, { rx: -1.0, rz: -sd * 0.2 }); L.ell(sd * 0.07, 0.2, 0.58, 0.015, 0.012, 0.01, BK); }
    L.ell(0, 0.04, 0.4, 0.17, 0.03, 0.17, 0x8a1a10);
  }, 'zard-head'));
  const jaw = pv(head, 0, 0.06, 0.14, part((L) => { L.ell(0, -0.04, 0.24, 0.19, 0.06, 0.22, CR); for (const sd of [-1, 1]) L.cone(sd * 0.12, 0.02, 0.38, 0.02, 0.06, WH); }, 'zard-jaw'));
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.55, 1.12, 0.22, part((L) => {
    L.ell(0, -0.18, 0, 0.12, 0.22, 0.12, OR);
    L.ell(0, -0.44, 0.03, 0.1, 0.12, 0.1, OR);
    for (const x of [-0.05, 0, 0.05]) L.cone(x, -0.56, 0.08, 0.02, 0.07, WH, { rx: PI * 0.8 });
  }, 'zard-arm')));
  // wings: pivots on the back, span along ±X, teal membrane
  const wings = [1, -1].map((sd) => {
    const p = pv(torso, sd * 0.28, 1.32, -0.36);
    const fl = pv(p, 0, 0, 0, part((L) => {
      L.rod([0, 0, 0], [sd * 0.8, 0.55, -0.1], 0.06, OR);
      L.rod([sd * 0.8, 0.55, -0.1], [sd * 1.45, 0.2, -0.2], 0.05, OR);
      L.cone(sd * 0.82, 0.68, -0.1, 0.04, 0.16, OR, { rz: -sd * 0.3 });
      // membrane panels: orange outside, teal inside
      for (const [a, b, c] of [[[0.05, 0.02], [0.8, 0.55], [0.5, -0.45]], [[0.5, -0.45], [0.8, 0.55], [1.1, -0.3]], [[1.1, -0.3], [0.8, 0.55], [1.45, 0.2]]]) {
        const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
        const w = Math.max(abs(a[0] - b[0]), abs(b[0] - c[0]), abs(a[0] - c[0])), h = Math.max(abs(a[1] - b[1]), abs(b[1] - c[1]), abs(a[1] - c[1]));
        L.box(sd * cx, cy, -0.15, w * 0.8, h * 0.75, 0.04, WG);
        L.box(sd * cx, cy, -0.19, w * 0.8, h * 0.75, 0.04, OR);
      }
    }, 'zard-wing'));
    p.sd = sd; p.fl = fl;
    return p;
  });
  const tail = pv(torso, 0, 0.35, -0.45, part((L) => chain(L, 0, [[0, -0.1, 0.2], [0.05, -0.5, 0.17], [0.2, -0.85, 0.13], [0.45, -1.05, 0.1]], OR)));
  tail.rotation.y = 0.75;
  const tailFire = flame(tail, 0, 0.52, -1.08, 0.3);
  const fire = jet(head, 0, 0.1, 0.62, FIRE, 3.4, 0.22);
  const rig = { root, torso, head, jaw, jawOpen: 0.55, tail, armL: arms[0], armR: arms[1], armLen: 0.6, height: 2.3, width: 1.5 };
  let glide = false, open = 0;
  rig.idle = (t, dt, a, s) => { glide = !!s.gliding; };
  rig.fx = (n, f, t) => {
    const breath = (n === 'cheer' && f > 0.18 && f < 0.9) || (n === 'win' && S(t * LOOP) > -0.2);
    vis(fire, breath);
    if (breath) { fire.update(t, n === 'win' ? 0.6 : 1); fire.rotation.x = n === 'win' ? -0.85 : 0.05; }
    tailFire.update(t, n === 'cheer' || n === 'win' ? 1.5 : 1);
    // wings: folded back along the body, open to glide / win, flap on a cheer
    const want = glide || n === 'win' || n === 'cheer' || n === 'trick' ? 1 : 0;
    open += (want - open) * 0.12;
    const flap = glide ? S(t * 3) * 0.12 : n === 'win' || n === 'cheer' ? S(t * 11) * 0.45 : 0;
    for (const w of wings) {
      w.rotation.y = w.sd * (1.15 * (1 - open));
      w.fl.rotation.z = w.sd * (-0.25 * (1 - open) + flap * open);
    }
  };
  return rig;
}

// ============================================================================================
// Snorlax: huge, sleepy; drums its belly, dozes off with Zzz, yawns and stretches on a win
// ============================================================================================
function snorlax() {
  const BD = 0x2e5f73, CR = 0xf0e0bc;
  const root = new THREE.Group(); root.name = 'snorlax';
  const torso = pv(root, 0, 0, 0, part((L) => {
    L.ell(0, 0.62, 0, 0.98, 0.86, 0.7, BD);
    L.ell(0, 0.55, 0.28, 0.8, 0.72, 0.5, CR);
    for (const sd of [-1, 1]) {
      L.ell(sd * 0.48, 0.02, 0.4, 0.32, 0.25, 0.42, BD);
      L.ell(sd * 0.5, 0.0, 0.82, 0.24, 0.3, 0.12, CR);
      for (const x of [-0.12, 0, 0.12]) L.cone(sd * 0.5 + x, 0.24, 0.86, 0.035, 0.1, WH);
    }
  }, 'lax-body'));
  const HC = [0, 0.26, 0], HR = [0.62, 0.42, 0.5];
  const head = pv(torso, 0, 1.38, 0.14, part((L) => {
    L.ell(...HC, ...HR, BD);
    L.ell(0, 0.18, 0.16, 0.5, 0.32, 0.38, CR);
    // closed eyes, a wide smile and two little fangs
    for (const sd of [-1, 1]) {
      const p = onEll([0, 0.18, 0.16], [0.5, 0.32, 0.38], sd * 0.36, 0.25);
      L.box(p[0], p[1], p[2], 0.18, 0.03, 0.03, BK, { ry: sd * 0.36 });
      L.cone(sd * 0.22, 0.06, 0.5, 0.03, 0.08, WH);
      L.cone(sd * 0.42, 0.62, -0.04, 0.12, 0.24, BD, { rz: -sd * 0.4 });
    }
    for (let i = -3; i <= 3; i++) { const p = onEll([0, 0.18, 0.16], [0.5, 0.32, 0.38], i * 0.12, -0.32 + (i * i) * 0.012); L.box(p[0], p[1], p[2], 0.07, 0.025, 0.03, BK, { ry: i * 0.12 }); }
    L.stud(0, 0.66, 0, 0.12, BD);
  }, 'lax-head'));
  const arms = [1, -1].map((sd) => pv(torso, sd * 0.8, 1.0, 0.36, part((L) => {
    L.ell(0, -0.26, 0, 0.2, 0.33, 0.2, BD);
    L.ell(0, -0.62, 0.04, 0.18, 0.16, 0.18, BD);
    for (const x of [-0.08, 0, 0.08]) L.cone(x, -0.74, 0.14, 0.03, 0.09, WH, { rx: PI * 0.7 });
  }, 'lax-arm')));
  const doze = zzz(head, 0.4, 0.75, 0.1);
  const rig = { root, torso, head, armL: arms[0], armR: arms[1], armLen: 0.76, height: 2.3, width: 2.0 };
  rig.idle = (t) => { torso.scale.set(1 + S(t * 1.6) * 0.012, 1 + S(t * 1.6) * 0.018, 1 + S(t * 1.6) * 0.012); };
  rig.fx = (n, f, t) => {
    const sleepy = n === 'taunt' || n === 'lose' || (n === 'pre' && S(t * 0.4) > 0.6);
    vis(doze, sleepy);
    if (sleepy) doze.update(t);
  };
  return rig;
}

// ---- signature gestures ------------------------------------------------------------------------
const P = {
  ashCheer: (f, t) => (f < 0.62
    ? { rx: -2.9 + S(t * 8) * 0.08, rz: -0.15, lx: -0.6, lz: 0.5, hx: -0.3, tx: -0.08, by: abs(S(t * 8)) * 0.04 }
    : { rx: -1.4, rz: 0.05, ty: -0.2, tx: 0.1, lx: -0.4, lz: 0.4, hx: 0.05 }),
  ashWin: (f, t) => ({ rx: -2.9 + S(t * LOOP * 2) * 0.1, rz: -0.2, lx: -2.2 + S(t * LOOP * 2) * 0.3, lz: 0.6, hx: -0.3, by: abs(S(t * LOOP)) * 0.06 }),
  pikaTaunt: (f, t, rig, a) => ({ hz: S(t * 10) * 0.3, hy: a.tauntSide * 0.6, [a.tauntSide > 0 ? 'lx' : 'rx']: -2.4, [a.tauntSide > 0 ? 'lz' : 'rz']: a.tauntSide * (0.3 + S(t * 16) * 0.4), by: abs(S(t * 10)) * 0.06 }),
  squirtTaunt: (f, t, rig, a) => ({ hy: a.tauntSide * 0.4, hx: -0.15, lx: -1.0, rx: -1.0, lz: -0.6, rz: 0.6, tx: -0.15, ty: a.tauntSide * 0.2 }),
  vine: (f, t) => ({ hx: -0.2, jaw: 0.5, by: abs(S(t * 9)) * 0.04, tz: S(t * 9) * 0.05, lx: -1.0, rx: -1.0 }),
  jigglyTaunt: (f, t) => ({ tz: S(t * 22) * 0.05, hx: 0.05, lx: -0.9, rx: -0.9, lz: 0.9, rz: -0.9 }),
  gengarCheer: (f, t) => ({ lx: -1.6, rx: -1.6, lz: -0.2, rz: 0.2, tx: 0.08, hx: -0.1, tz: S(t * 6) * 0.08, by: S(t * 3) * 0.05 }),
  gengarTaunt: (f, t, rig, a) => ({ hy: a.tauntSide * 0.5, tz: S(t * 14) * 0.1, lx: -1.2, rx: -1.2, lz: 0.9 + S(t * 14) * 0.3, rz: -0.9 - S(t * 14) * 0.3, by: abs(S(t * 14)) * 0.06 }),
  zardCheer: (f, t) => ({ hx: -0.2, jaw: f > 0.15 ? 1 : f * 6, tx: -0.15, lx: -1.6, rx: -1.6, lz: 0.6, rz: -0.6, tz: S(t * 30) * 0.03, by: S(f * PI) * 0.06 }),
  laxCheer: (f, t) => ({ lx: -0.8 - abs(S(t * 12)) * 0.4, rx: -0.8 - abs(S(t * 12 + 1.5)) * 0.4, lz: -0.45, rz: 0.45, hx: -0.15, by: abs(S(t * 12)) * 0.06, hy: S(t * 3) * 0.2 }),
  laxTaunt: (f, t) => ({ hx: 0.35, hz: 0.25, tx: 0.1, lx: -0.5, rx: -0.5, lz: 0.2, rz: -0.2, by: S(t * 2) * 0.03 }),
  laxWin: (f, t) => ({ lx: UP, rx: UP, lz: 0.6 + S(t * 2) * 0.1, rz: -0.6 - S(t * 2) * 0.1, hx: -0.5, tx: -0.15, by: abs(S(t * 2)) * 0.05 }),
  mewtwoCheer: (f, t) => ({ rx: -2.75, rz: -0.25, lx: -1.0, lz: 0.4, hx: -0.15, tx: -0.08, by: 0.08 + S(t * 4) * 0.05 }),
  mewtwoWin: (f, t) => ({ lx: -1.3, rx: -1.3, lz: 0.9, rz: -0.9, hx: -0.15, by: 0.12 + S(t * 3) * 0.06, ty: S(t * 1.5) * 0.25 }),
};

export default [
  {
    id: 'pikachu', name: 'Pikachu', blurb: 'Pika-PI! Sparks fly', weight: 'light', color: 0xf6cf2a,
    voice: { kind: 'squeak', pitch: 1.25, say: cry([['i', 1.3, 1.35, 0.09, 0.02], ['a', 1.2, 1.3, 0.1, 0.03], ['u', 1.5, 1.8, 0.26, 0]], [['i', 1.3, 1.2, 0.09, 0.02], ['a', 1.2, 1.0, 0.1, 0.02], ['u', 1.0, 0.7, 0.3, 0]]) },
    style: { cheer: 'both', trick: 'twist' },
    gestures: { cheer: G.charge, taunt: P.pikaTaunt, win: G.hop },
    build: pikachu,
  },
  {
    id: 'ash', name: 'Ash Ketchum', blurb: 'Gotta catch \'em all!', weight: 'medium', color: 0xd0262a,
    voice: { kind: 'human', pitch: 1.3 }, style: { cheer: 'fist', trick: 'superman' },
    gestures: { cheer: P.ashCheer, win: P.ashWin },
    build: ash,
  },
  {
    id: 'charmander', name: 'Charmander', blurb: 'Keeps its tail flame lit', weight: 'light', color: 0xf28a32,
    voice: { kind: 'squeak', pitch: 1.05, say: cry([['a', 1.2, 1.25, 0.1, 0.02], ['a', 1.1, 1.15, 0.1, 0.02], ['e', 1.3, 1.6, 0.22, 0]]) },
    style: { cheer: 'roar', trick: 'twist' },
    gestures: { cheer: G.breath, taunt: G.wiggle, win: G.breathUp },
    build: charmander,
  },
  {
    id: 'squirtle', name: 'Squirtle', blurb: 'Squirtle Squad leader', weight: 'light', color: 0x7cc8e8,
    voice: { kind: 'squeak', pitch: 1.0, say: cry([['e', 1.2, 1.3, 0.14, 0.03], ['u', 1.4, 1.7, 0.26, 0]]) },
    style: { cheer: 'roar', trick: 'twist' },
    gestures: { cheer: G.breath, taunt: P.squirtTaunt, win: G.breathUp },
    build: squirtle,
  },
  {
    id: 'bulbasaur', name: 'Bulbasaur', blurb: 'Vine Whip on every bend', weight: 'light', color: 0x78c8a8,
    voice: { kind: 'squeak', pitch: 0.9, say: cry([['u', 1.1, 1.15, 0.1, 0.02], ['a', 1.15, 1.2, 0.09, 0.02], ['o', 1.3, 1.5, 0.24, 0]]) },
    style: { cheer: 'roar', trick: 'arms' },
    gestures: { cheer: P.vine, taunt: G.wiggle, win: P.vine },
    build: bulbasaur,
  },
  {
    id: 'eevee', name: 'Eevee', blurb: 'Could evolve into anything', weight: 'light', color: 0x9a6236,
    voice: { kind: 'squeak', pitch: 1.2, say: cry([['i', 1.2, 1.3, 0.14, 0.04], ['i', 1.5, 1.85, 0.26, 0]]) },
    style: { cheer: 'both', trick: 'twist' },
    gestures: { cheer: G.hop, taunt: G.wiggle, win: G.hop },
    build: eevee,
  },
  {
    id: 'jigglypuff', name: 'Jigglypuff', blurb: 'Sings rivals to sleep', weight: 'light', color: 0xf6a8c4,
    voice: { kind: 'squeak', pitch: 1.35, say: cry([['i', 1.0, 1.0, 0.16, 0.02], ['i', 1.19, 1.19, 0.12, 0.02], ['u', 0.89, 0.89, 0.34, 0]]) },
    style: { cheer: 'wave', trick: 'twist' },
    gestures: { cheer: G.sway, taunt: P.jigglyTaunt, win: G.sway },
    build: jigglypuff,
  },
  {
    id: 'gengar', name: 'Gengar', blurb: 'Grins in the shadows', weight: 'medium', color: 0x6a4a9a,
    voice: { kind: 'beast', pitch: 1.9, say: cry([['e', 1.1, 1.2, 0.14, 0.03], ['a', 1.3, 0.95, 0.32, 0]]) },
    style: { cheer: 'roar', trick: 'twist' },
    gestures: { cheer: P.gengarCheer, taunt: P.gengarTaunt, win: P.gengarTaunt },
    build: gengar,
  },
  {
    id: 'lucario', name: 'Lucario', blurb: 'Reads the aura of the race', weight: 'medium', color: 0x3a6ac8,
    voice: { kind: 'human', pitch: 0.9, say: cry([['u', 1.0, 1.05, 0.1, 0.02], ['a', 1.1, 1.15, 0.1, 0.02], ['i', 1.2, 1.2, 0.08, 0.02], ['o', 1.25, 1.4, 0.22, 0]]) },
    style: { cheer: 'point', trick: 'superman' },
    gestures: { cheer: G.palms, win: G.palmsUp },
    build: lucario,
  },
  {
    id: 'mewtwo', name: 'Mewtwo', blurb: 'Psychic, proud, unbeatable', weight: 'medium', color: 0x8a5ab0,
    voice: { kind: 'deep', pitch: 1.0, say: cry([['u', 1.0, 1.05, 0.16, 0.03], ['u', 1.1, 0.95, 0.32, 0]]) },
    style: { cheer: 'point', trick: 'superman' },
    gestures: { cheer: P.mewtwoCheer, win: P.mewtwoWin },
    build: mewtwo,
  },
  {
    id: 'charizard', name: 'Charizard', blurb: 'Breathes fire, flies high', weight: 'heavy', color: 0xf08030,
    voice: { kind: 'beast', pitch: 0.9, say: cry([['a', 1.0, 1.1, 0.14, 0.02], ['i', 1.1, 1.15, 0.08, 0.02], ['a', 1.3, 0.9, 0.38, 0]]) },
    style: { cheer: 'roar', trick: 'superman' },
    gestures: { cheer: P.zardCheer, taunt: G.wiggle, win: G.breathUp },
    build: charizard,
  },
  {
    id: 'snorlax', name: 'Snorlax', blurb: 'Blocks the road, then naps', weight: 'heavy', color: 0x2e5f73,
    voice: { kind: 'deep', pitch: 0.8, say: cry([['o', 1.0, 1.05, 0.2, 0.04], ['a', 1.05, 0.85, 0.42, 0]]) },
    style: { cheer: 'both', trick: 'arms' },
    gestures: { cheer: P.laxCheer, taunt: P.laxTaunt, win: P.laxWin },
    build: snorlax,
  },
];
