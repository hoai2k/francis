// Power-ups: roulette odds, item use and projectiles/traps on the track.
import * as THREE from 'three';
import { BrickBuilder, C, plastic, brickGeometry } from './lego.js';
import { angleDiff } from './kart.js';

export const ITEMS = {
  boost:  { name: 'Turbo Stud', color: '#ff9a1a' },
  boost3: { name: 'Triple Turbo', color: '#ff6a00' },
  rocket: { name: 'Homing Rocket', color: '#e0301a' },
  cannon: { name: 'Bouncer Brick', color: '#2fa84a' },
  trap:   { name: 'Stray Bricks', color: '#f2cd37' },
  shield: { name: 'Brick Shield', color: '#36aebf' },
  golden: { name: 'Golden Brick', color: '#ffd040' },
  storm:  { name: 'Brick Storm', color: '#9a5aff' },
  bullet: { name: 'Bullet Brick', color: '#1b2a34' },
  rocket3: { name: 'Triple Rockets', color: '#e0301a' },
  cannon3: { name: 'Triple Bouncers', color: '#2fa84a' },
  mega: { name: 'Mega Brick', color: '#c91a09' },
  seeker: { name: 'Leader Seeker', color: '#0055bf' },
  ice: { name: 'Freeze Brick', color: '#9ae0ff' },
  ghost: { name: 'Ghost Brick', color: '#dfe6ee' },
  puddle: { name: 'Paint Puddle', color: '#81007b' },
  fakebox: { name: 'Fake Box', color: '#ff4aa8' },
  bomb: { name: 'Boom Brick', color: '#1b2a34' },
  studbag: { name: 'Stud Bag', color: '#dcbc81' },
  goldturbo: { name: 'Gold Turbo', color: '#ffd040' },
  boomerang: { name: 'Boomerang', color: '#fe8a18' },
  ink: { name: 'Ink Splat', color: '#1b1b3a' },
  horn: { name: 'Brick Horn', color: '#f2cd37' },
};
// items that come with several uses
export const MULTI = { boost3: 3, rocket3: 3, cannon3: 3 };

// SVG icons drawn in a LEGO style
export const ICONS = {
  boost: `<svg viewBox="0 0 64 64"><circle cx="32" cy="36" r="20" fill="#f2cd37" stroke="#1b2a34" stroke-width="3"/><ellipse cx="32" cy="30" rx="12" ry="5" fill="#fff6c0"/><path d="M26 8l12 0-4 10 8 0-16 22 4-16-8 0z" fill="#ff7a00" stroke="#1b2a34" stroke-width="2"/></svg>`,
  boost3: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="2.5"><circle cx="18" cy="42" r="12" fill="#f2cd37"/><circle cx="46" cy="42" r="12" fill="#f2cd37"/><circle cx="32" cy="22" r="12" fill="#f2cd37"/></g><path d="M29 12h7l-3 7h5l-10 12 3-9h-5z" fill="#ff7a00"/><path d="M15 32h7l-3 7h5l-10 12 3-9h-5z" fill="#ff7a00"/><path d="M43 32h7l-3 7h5l-10 12 3-9h-5z" fill="#ff7a00"/></svg>`,
  rocket: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"><path d="M32 4c10 8 12 20 10 34H22C20 24 22 12 32 4z" fill="#c91a09"/><path d="M22 30l-10 14 10-2zM42 30l10 14-10-2z" fill="#f4f4f4"/><rect x="24" y="38" width="16" height="8" fill="#6c6e68"/></g><circle cx="32" cy="20" r="5" fill="#9ad8ff" stroke="#1b2a34" stroke-width="2"/><path d="M26 48l6 12 6-12z" fill="#ff9a1a"/></svg>`,
  cannon: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3"><ellipse cx="32" cy="42" rx="22" ry="10" fill="#1a6a32"/><rect x="10" y="26" width="44" height="16" fill="#237841"/><ellipse cx="32" cy="26" rx="22" ry="10" fill="#4fbf6a"/><ellipse cx="32" cy="22" rx="10" ry="5" fill="#8ae09a"/></g></svg>`,
  trap: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="2.5"><rect x="8" y="34" width="24" height="14" fill="#c91a09" transform="rotate(-12 20 41)"/><rect x="30" y="30" width="26" height="14" fill="#f2cd37" transform="rotate(14 43 37)"/><rect x="20" y="14" width="18" height="14" fill="#0055bf" transform="rotate(8 29 21)"/></g><g fill="#fff" opacity=".6"><rect x="12" y="32" width="5" height="3"/><rect x="34" y="28" width="5" height="3"/><rect x="24" y="12" width="5" height="3"/></g></svg>`,
  shield: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#9ad8ff" fill-opacity=".55" stroke="#36aebf" stroke-width="4"/><path d="M32 14l14 6v10c0 10-6 16-14 20-8-4-14-10-14-20V20z" fill="#0055bf" stroke="#1b2a34" stroke-width="2.5"/><circle cx="32" cy="30" r="5" fill="#f2cd37"/></svg>`,
  golden: `<svg viewBox="0 0 64 64"><g stroke="#7a5a00" stroke-width="3"><rect x="10" y="26" width="44" height="26" rx="2" fill="#ffd040"/><rect x="16" y="16" width="12" height="10" fill="#ffe680"/><rect x="36" y="16" width="12" height="10" fill="#ffe680"/></g><path d="M16 32h32" stroke="#fff6c0" stroke-width="4"/><path d="M8 10l4 4M56 10l-4 4M32 4v6" stroke="#fff6a0" stroke-width="3"/></svg>`,
  bullet: `<svg viewBox="0 0 64 64"><g stroke="#000" stroke-width="3" stroke-linejoin="round"><path d="M10 20h26c12 0 20 6 20 12s-8 12-20 12H10z" fill="#1b2a34"/><rect x="6" y="18" width="8" height="28" fill="#6c6e68"/><path d="M14 18l-6-8h10zM14 46l-6 8h10z" fill="#6c6e68"/></g><circle cx="40" cy="28" r="5" fill="#fff"/><circle cx="41" cy="28" r="2.4" fill="#000"/><path d="M34 38q8 4 14-2" stroke="#fff" stroke-width="3" fill="none"/></svg>`,
  rocket3: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="2.5" stroke-linejoin="round"><path d="M14 30c5 4 6 10 5 17H9c-1-7 0-13 5-17z" fill="#c91a09"/><path d="M50 30c5 4 6 10 5 17H45c-1-7 0-13 5-17z" fill="#c91a09"/><path d="M32 6c7 6 8 14 7 24H25c-1-10 0-18 7-24z" fill="#c91a09"/></g><g fill="#9ad8ff"><circle cx="32" cy="16" r="3"/><circle cx="14" cy="38" r="2"/><circle cx="50" cy="38" r="2"/></g></svg>`,
  cannon3: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="2.5"><ellipse cx="18" cy="44" rx="12" ry="7" fill="#237841"/><ellipse cx="46" cy="44" rx="12" ry="7" fill="#237841"/><ellipse cx="32" cy="22" rx="12" ry="7" fill="#237841"/></g><g fill="#8ae09a"><ellipse cx="18" cy="41" rx="6" ry="3"/><ellipse cx="46" cy="41" rx="6" ry="3"/><ellipse cx="32" cy="19" rx="6" ry="3"/></g></svg>`,
  mega: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3"><rect x="8" y="22" width="48" height="34" rx="2" fill="#c91a09"/><rect x="12" y="10" width="16" height="12" fill="#e0301a"/><rect x="36" y="10" width="16" height="12" fill="#e0301a"/></g><path d="M22 40l10-10 10 10M32 30v18" stroke="#fff" stroke-width="5" fill="none"/></svg>`,
  seeker: `<svg viewBox="0 0 64 64"><g stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"><path d="M4 30l14-10 4 12zM60 30l-14-10-4 12z" fill="#fff"/><ellipse cx="32" cy="36" rx="16" ry="14" fill="#0055bf"/></g><g fill="#fff" stroke="#1b2a34" stroke-width="2"><path d="M24 24l3-9 4 8zM33 23l4-9 3 9zM20 32l-7-3 6 7z"/></g><circle cx="32" cy="38" r="5" fill="#f2cd37"/></svg>`,
  ice: `<svg viewBox="0 0 64 64"><rect x="10" y="12" width="44" height="42" rx="4" fill="#bfe8ff" fill-opacity=".85" stroke="#36aebf" stroke-width="4"/><path d="M32 18v30M19 25l26 16M45 25L19 41" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
  ghost: `<svg viewBox="0 0 64 64"><path d="M14 56V28a18 18 0 0 1 36 0v28l-6-6-6 6-6-6-6 6-6-6z" fill="#f4f4f4" stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"/><circle cx="25" cy="30" r="4" fill="#1b2a34"/><circle cx="39" cy="30" r="4" fill="#1b2a34"/><path d="M26 40q6 5 12 0" stroke="#1b2a34" stroke-width="3" fill="none"/></svg>`,
  puddle: `<svg viewBox="0 0 64 64"><path d="M8 40c0-8 10-8 12-14 3-8 14-8 16 0 4-6 16-4 16 6 6 2 6 12-4 14H14C8 46 8 44 8 40z" fill="#81007b" stroke="#1b2a34" stroke-width="3"/><ellipse cx="26" cy="36" rx="6" ry="3" fill="#d25ad0"/><circle cx="46" cy="18" r="4" fill="#81007b"/></svg>`,
  fakebox: `<svg viewBox="0 0 64 64"><rect x="10" y="14" width="44" height="40" rx="4" fill="#ff8ac8" fill-opacity=".7" stroke="#c91a09" stroke-width="4"/><text x="32" y="46" font-size="34" font-weight="900" text-anchor="middle" fill="#fff" stroke="#1b2a34" stroke-width="2" font-family="Arial Black,Arial">!</text></svg>`,
  bomb: `<svg viewBox="0 0 64 64"><circle cx="30" cy="38" r="20" fill="#1b2a34" stroke="#000" stroke-width="3"/><path d="M40 20q6-10 14-8" stroke="#958a73" stroke-width="4" fill="none"/><circle cx="55" cy="11" r="5" fill="#ff9a1a"/><circle cx="23" cy="36" r="4" fill="#fff"/><circle cx="37" cy="36" r="4" fill="#fff"/><path d="M22 46h16" stroke="#fff" stroke-width="3"/></svg>`,
  studbag: `<svg viewBox="0 0 64 64"><path d="M20 20l-8 30c0 6 40 6 40 0l-8-30z" fill="#958a73" stroke="#1b2a34" stroke-width="3"/><path d="M22 20q10-10 20 0" stroke="#1b2a34" stroke-width="3" fill="#e4cd9e"/><circle cx="32" cy="38" r="9" fill="#ffd040" stroke="#7a5a00" stroke-width="3"/><circle cx="32" cy="38" r="4" fill="#fff6c0"/></svg>`,
  goldturbo: `<svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="22" fill="#ffd040" stroke="#7a5a00" stroke-width="3"/><path d="M26 10h12l-4 12h8L24 50l5-18h-8z" fill="#fff6c0" stroke="#7a5a00" stroke-width="2"/></svg>`,
  boomerang: `<svg viewBox="0 0 64 64"><path d="M8 50L32 10l24 40-8 4-16-28-16 28z" fill="#fe8a18" stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"/><path d="M28 18l4-6 4 6" stroke="#fff" stroke-width="3" fill="none"/></svg>`,
  ink: `<svg viewBox="0 0 64 64"><path d="M32 6c10 0 14 10 12 18 8-4 16 4 10 12 8 4 2 16-8 12 0 8-10 12-14 6-6 8-18 2-14-6-10 2-14-10-6-14-8-6 0-16 8-12-2-8 2-16 12-16z" fill="#1b1b3a" stroke="#000" stroke-width="2"/><circle cx="26" cy="28" r="4" fill="#fff"/><circle cx="38" cy="28" r="4" fill="#fff"/></svg>`,
  horn: `<svg viewBox="0 0 64 64"><path d="M8 26h10l24-14v40L18 38H8z" fill="#f2cd37" stroke="#1b2a34" stroke-width="3" stroke-linejoin="round"/><path d="M48 22q8 10 0 20M52 14q14 18 0 36" stroke="#ff4a3a" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  storm: `<svg viewBox="0 0 64 64"><path d="M14 30c-8 0-8-12 0-12 2-10 16-12 20-4 6-6 18-2 16 8 8 2 6 12-2 12H14z" fill="#6a5a9a" stroke="#1b2a34" stroke-width="3"/><g stroke="#1b2a34" stroke-width="2"><rect x="14" y="40" width="10" height="7" fill="#c91a09" transform="rotate(20 19 43)"/><rect x="30" y="46" width="10" height="7" fill="#f2cd37" transform="rotate(-15 35 49)"/><rect x="44" y="40" width="10" height="7" fill="#0055bf" transform="rotate(30 49 43)"/></g></svg>`,
};

// Odds by race position (0 = leader, 1 = last). Front-runners get defensive,
// weaker items; the further back you are the stronger the items get.
const TABLES = [
  [0.01, { trap: 16, cannon: 16, puddle: 12, fakebox: 12, boost: 8, shield: 12, studbag: 10, boomerang: 8, horn: 8 }],
  [0.25, { cannon: 13, trap: 9, puddle: 8, fakebox: 6, rocket: 13, boomerang: 10, bomb: 9, boost: 10, shield: 8, studbag: 7, ice: 7 }],
  [0.5, { rocket: 13, cannon3: 8, bomb: 9, boost3: 12, ice: 8, boomerang: 6, ghost: 6, ink: 6, seeker: 4, mega: 6, rocket3: 6, shield: 5, studbag: 7, horn: 4 }],
  [0.75, { boost3: 13, rocket3: 11, mega: 10, golden: 10, goldturbo: 9, seeker: 7, ink: 8, ghost: 6, storm: 5, bomb: 5, cannon3: 5, bullet: 6 }],
  [1.01, { bullet: 24, golden: 15, goldturbo: 15, storm: 12, seeker: 7, mega: 10, boost3: 10, rocket3: 7 }],
];
export function rollItem(rankFrac, rand = Math.random, gapBehind = 0) {
  // being far behind the leader counts as being further back
  rankFrac = Math.min(1, rankFrac + Math.min(0.3, Math.max(0, gapBehind) / 1500));
  const t = TABLES.find(([u]) => rankFrac <= u)[1];
  let sum = 0;
  for (const w of Object.values(t)) sum += w;
  let r = rand() * sum;
  for (const [k, w] of Object.entries(t)) { r -= w; if (r <= 0) return k; }
  return 'boost';
}

// ---- meshes -----------------------------------------------------------------------
function rocketMesh() {
  const b = new BrickBuilder(0.5);
  b.cyl(0, 0, 0, 0.45, 1.8, C.red, { seg: 12 });
  b.cone(0, 1.8, 0, 0.45, 0.8, C.white, { seg: 12 });
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; b.box(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, 0.1, 0.7, 0.5, C.white, { rot: -a }); }
  b.cyl(0, -0.3, 0, 0.3, 0.3, 0xffa020, { seg: 10, matOpts: { emissive: 0xff6a00, emissiveIntensity: 3 } });
  const g = b.build();
  g.children.forEach((c) => c.geometry.rotateX(Math.PI / 2));
  const holder = new THREE.Group();
  holder.add(g);
  return holder;
}
function cannonMesh(col = 0x237841, top = 0x4fbf6a, trans = false) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.1, 20), trans ? plastic(col, { trans: true, opacity: 0.7, emissive: col, emissiveIntensity: 0.4 }) : plastic(col));
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16).translate(0, 0.7, 0), plastic(top));
  body.castShadow = true;
  const inner = new THREE.Group();
  inner.add(body, stud);
  g.add(inner);
  g.userData.inner = inner;
  return g;
}
function seekerMesh() {
  const b = new BrickBuilder(1);
  b.sphere(0, 0, 0, 1.4, C.blue, { sy: 0.8 });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.cone(Math.cos(a) * 0.9, 0.4, Math.sin(a) * 0.9, 0.35, 0.9, C.white, { seg: 6 }); }
  for (const sd of [-1, 1]) b.boxM(new THREE.Matrix4().compose(new THREE.Vector3(sd * 1.8, 0.3, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, sd * 0.4)), new THREE.Vector3(2.2, 0.15, 1.2)), C.white);
  return b.build({ name: 'seeker' });
}
function boomerangMesh() {
  const b = new BrickBuilder(1);
  for (const sd of [-1, 1]) b.boxM(new THREE.Matrix4().compose(new THREE.Vector3(sd * 0.7, 0, 0.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sd * 0.8, 0)), new THREE.Vector3(0.6, 0.25, 2.4)), C.orange);
  const g = new THREE.Group(); const inner = b.build({ name: 'boomerang' }); g.add(inner); g.userData.inner = inner;
  return g;
}
function bombMesh() {
  const b = new BrickBuilder(1);
  b.sphere(0, 1.1, 0, 1.1, C.black);
  b.cyl(0, 2.1, 0, 0.25, 0.4, C.dkgray, { seg: 8 });
  for (const sd of [-1, 1]) b.sphere(sd * 0.4, 1.4, 0.95, 0.18, C.white);
  b.box(0, 0.8, 1.02, 0.6, 0.1, 0.05, C.white);
  const g = b.build({ name: 'bomb' });
  const fuse = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa020 }));
  fuse.position.y = 2.6; g.add(fuse); g.userData.fuse = fuse;
  return g;
}
function puddleMesh() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CircleGeometry(3.4, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x81007b, roughness: 0.1, metalness: 0.1, emissive: 0x3a0038 }));
  m.position.y = 0.06;
  for (let k = 0; k < 4; k++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.6 + Math.random() * 0.6, 10).rotateX(-Math.PI / 2), m.material); d.position.set((Math.random() - 0.5) * 6, 0.07, (Math.random() - 0.5) * 6); g.add(d); }
  g.add(m);
  return g;
}
let fakeTex = null;
function fakeBoxMesh() {
  if (!fakeTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.font = 'bold 104px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = '#1b2a34'; g.strokeText('?', 64, 70); g.fillStyle = '#ffd0e8'; g.fillText('?', 64, 70);
    fakeTex = new THREE.CanvasTexture(c); fakeTex.colorSpace = THREE.SRGBColorSpace;
  }
  const g = new THREE.Group();
  const box = new THREE.Mesh(brickGeometry(2, 2, 3, 1.05, true, 12), new THREE.MeshStandardMaterial({ color: 0xff6ab0, transparent: true, opacity: 0.6, roughness: 0.1, emissive: 0xff2a80, emissiveIntensity: 0.4, depthWrite: false }));
  box.position.y = 0.6;
  const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: fakeTex })); q.scale.setScalar(1.3); q.position.y = 1.2;
  g.add(box, q); g.userData.inner = box;
  return g;
}

const trapGeos = [brickGeometry(2, 1, 3, 0.55, true, 8), brickGeometry(1, 1, 3, 0.55, true, 8), brickGeometry(2, 2, 1, 0.55, true, 8)];
function trapMesh() {
  const g = new THREE.Group();
  const cols = [C.red, C.yellow, C.blue, C.green, C.white, C.orange];
  for (let k = 0; k < 6; k++) {
    const m = new THREE.Mesh(trapGeos[k % 3], plastic(cols[Math.floor(Math.random() * cols.length)]));
    m.position.set((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6);
    m.rotation.set(Math.random() < 0.3 ? Math.PI / 2 : 0, Math.random() * 6, Math.random() < 0.3 ? 0.4 : 0);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}
function stormMesh() {
  const g = new THREE.Group();
  const cloud = new BrickBuilder(0.8);
  for (let k = 0; k < 5; k++) cloud.brick((k - 2) * 1.4, (k % 2) * 0.6, (Math.random() - 0.5), 3, 2, 3, 0x4a4a6a, {});
  g.add(cloud.build({ shadows: false }));
  return g;
}

export class Items {
  constructor(race) {
    this.race = race;
    this.track = race.track;
    this.scene = race.scene;
    this.proj = [];   // rockets, bouncers, freeze bricks, boomerangs, seekers
    this.traps = [];  // stray bricks, puddles, fake boxes, bombs
    this.storms = [];
    this.rings = [];  // horn shockwaves
    this.tmp = new THREE.Vector3();
    this.loc = {};
  }

  makeBulletMesh(ch) {
    const b = new BrickBuilder(1);
    b.cyl(0, 0, 0, 2.2, 6, C.black, { seg: 20 });
    b.sphere(0, 6, 0, 2.2, C.black);
    b.cyl(0, -0.6, 0, 2.4, 0.8, C.dkgray, { seg: 20 });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; b.box(Math.cos(a) * 2.2, -0.6, Math.sin(a) * 2.2, 0.3, 2.6, 2, ch.kart, { rot: -a }); }
    const g = b.build({ name: 'bullet' });
    g.children.forEach((c) => c.geometry.rotateX(Math.PI / 2));
    const face = new BrickBuilder(1);
    for (const sd of [-1, 1]) { face.sphere(sd * 0.9, 1.2, 6.6, 0.55, C.white); face.sphere(sd * 0.9, 1.25, 7.05, 0.25, C.black); }
    face.box(0, -0.6, 7.2, 1.8, 0.25, 0.1, C.white);
    const hold = new THREE.Group();
    hold.add(g, face.build());
    hold.position.set(0, 1.4, -2.2);
    return hold;
  }

  use(k) {
    const it = k.item;
    if (!it) return;
    const back = k.ctl.back;
    const au = this.race.audio;
    let keep = false;
    switch (it) {
      case 'boost': case 'boost3': k.boost(1.2); break;
      case 'rocket': case 'rocket3': this.fireRocket(k); au.sfx('rocket', k.pos); break;
      case 'cannon': case 'cannon3': this.fireCannon(k, back); au.sfx('cannon', k.pos); break;
      case 'ice': this.fireCannon(k, back, 'ice'); au.sfx('cannon', k.pos); break;
      case 'trap': this.dropTrap(k, !back && !!k.ctl.aimFwd); au.sfx('trap', k.pos); break;
      case 'puddle': this.dropTrap(k, !back && !!k.ctl.aimFwd, 'puddle'); au.sfx('splash', k.pos); break;
      case 'fakebox': this.dropTrap(k, !back && !!k.ctl.aimFwd, 'fakebox'); au.sfx('box', k.pos); break;
      case 'bomb': this.dropTrap(k, !back, 'bomb'); au.sfx('cannon', k.pos); break;
      case 'shield': k.shieldTime = 12; au.sfx('shield', k.pos); break;
      case 'golden': k.goldenTime = 7.5; k.boost(0.6); au.sfx('golden', k.pos); break;
      case 'storm': this.brickStorm(k); break;
      case 'bullet': k.bulletTime = 6.5; k.cancelDrift(); au.sfx('rocket', k.pos); au.sfx('golden', k.pos); break;
      case 'mega': k.megaTime = 8; k.boost(0.4); au.sfx('golden', k.pos); break;
      case 'seeker': this.fireSeeker(k); au.sfx('rocket', k.pos); break;
      case 'boomerang': this.fireBoomerang(k); au.sfx('cannon', k.pos); break;
      case 'ghost': this.ghost(k); break;
      case 'studbag': k.studs = Math.min(10, k.studs + 5); this.race.fx.studPickup(k.pos); au.sfx('stud', k.pos); k.boost(0.4); break;
      case 'goldturbo':
        if (!k.goldTurboStarted) { k.goldTurboStarted = true; k.goldTurboTime = 7; }
        k.boost(0.8); keep = k.goldTurboTime > 0; break;
      case 'ink': this.inkSplat(k); break;
      case 'horn': this.horn(k); break;
    }
    if (keep) { this.race.onItemUsed?.(k, it); return; }
    if (MULTI[it]) {
      k.itemCount--;
      if (k.itemCount <= 0) k.item = null;
    } else k.item = null;
    if (it === 'goldturbo') k.goldTurboStarted = false;
    if (k._stolen && !k.item) { k.item = k._stolen; k.itemCount = MULTI[k.item] || 1; }
    k._stolen = null;
    this.race.onItemUsed?.(k, it);
  }

  fireRocket(k) {
    const mesh = rocketMesh();
    this.scene.add(mesh);
    // target: the kart one place ahead (or leader when in first: none)
    const order = this.race.order;
    const my = order.indexOf(k);
    const target = my > 0 ? order[my - 1] : null;
    const p = k.pos.clone().add(k.forward().multiplyScalar(3)).setY(k.pos.y + 1);
    this.proj.push({ type: 'rocket', mesh, pos: p, yaw: k.yaw, owner: k, target, life: 14, si: k.loc.i, speed: Math.max(58, k.speed + 20), safe: 0.4 });
  }
  fireCannon(k, back, type = 'cannon') {
    const mesh = type === 'ice' ? cannonMesh(0x9ae0ff, 0xffffff, true) : cannonMesh();
    this.scene.add(mesh);
    const yaw = back ? k.yaw + Math.PI : k.yaw;
    const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const p = k.pos.clone().addScaledVector(f, 3.2).setY(k.pos.y + 0.9);
    this.proj.push({ type, mesh, pos: p, yaw, owner: k, life: 9, si: k.loc.i, speed: back ? 40 : Math.max(52, k.speed + 18), safe: 0.35, bounces: 0, vy: 0 });
  }
  fireSeeker(k) {
    const mesh = seekerMesh();
    this.scene.add(mesh);
    const p = k.pos.clone().setY(k.pos.y + 4);
    this.proj.push({ type: 'seeker', mesh, pos: p, yaw: k.yaw, owner: k, life: 25, si: k.loc.i, speed: 95, safe: 1.5, diving: false });
  }
  fireBoomerang(k) {
    const mesh = boomerangMesh();
    this.scene.add(mesh);
    const p = k.pos.clone().add(k.forward().multiplyScalar(3)).setY(k.pos.y + 1.2);
    this.proj.push({ type: 'boomerang', mesh, pos: p, yaw: k.yaw, owner: k, life: 4, si: k.loc.i, speed: Math.max(55, k.speed + 20), safe: 0.6, t: 0, hitSet: new Set() });
  }
  dropTrap(k, forward, kind = 'bricks') {
    const mesh = kind === 'puddle' ? puddleMesh() : kind === 'fakebox' ? fakeBoxMesh() : kind === 'bomb' ? bombMesh() : trapMesh();
    this.scene.add(mesh);
    const f = k.forward();
    const t = { kind, mesh, pos: k.pos.clone().addScaledVector(f, forward ? 3 : -3.6), vel: null, si: k.loc.i, owner: k, safe: 0.5, air: false, life: kind === 'puddle' ? 25 : kind === 'bomb' ? 99 : 1e9, fuse: kind === 'bomb' ? 2.2 : 0 };
    if (forward) { t.vel = f.clone().multiplyScalar(k.speed + (kind === 'bomb' ? 26 : 22)).setY(kind === 'bomb' ? 14 : 12); t.air = true; t.pos.y += 1; }
    mesh.position.copy(t.pos);
    this.traps.push(t);
    if (this.traps.length > 50) this.removeTrap(this.traps[0]);
  }
  removeTrap(t) {
    this.scene.remove(t.mesh);
    const i = this.traps.indexOf(t);
    if (i >= 0) this.traps.splice(i, 1);
  }
  explode(pos, radius, by) {
    this.race.fx.explosion(pos);
    this.race.fx.explosion(pos.clone().add(new THREE.Vector3(2, 1, 0)));
    this.race.audio.sfx('crash', pos);
    for (const o of this.race.karts) if (o.pos.distanceTo(pos) < radius) { if (o.hit('wreck', by)) this.race.onProjectileHit?.(by, o, 'bomb'); }
    for (const t of [...this.traps]) if (t.kind !== 'bomb' && t.pos.distanceTo(pos) < radius) this.removeTrap(t);
    this.ring(pos, radius, 0xffa020);
  }
  ring(pos, radius, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(pos).add(new THREE.Vector3(0, 0.6, 0));
    this.scene.add(m);
    this.rings.push({ m, t: 0, radius });
  }
  brickStorm(k) {
    this.race.audio.sfx('storm');
    this.race.flash(0xb0a0ff);
    for (const o of this.race.karts) {
      if (o === k || o.finished) continue;
      if (o.rank > k.rank && Math.random() < 0.5) continue; // mostly hits karts ahead
      const cloud = stormMesh();
      this.scene.add(cloud);
      this.storms.push({ kart: o, cloud, t: 0, hit: false, by: k });
    }
  }
  ghost(k) {
    k.ghostTime = 5;
    this.race.audio.sfx('shield', k.pos);
    // steal an item from a rival, preferring karts ahead
    const others = this.race.order.filter((o) => o !== k && (o.item || o.nextItem));
    const ahead = others.filter((o) => o.rank < k.rank);
    const pool = ahead.length ? ahead : others;
    const v = pool[Math.floor(Math.random() * pool.length)];
    if (v) {
      if (v.nextItem) { k._stolen = v.nextItem; v.nextItem = null; }
      else { k._stolen = v.item; v.item = null; v.itemCount = 0; }
      if (k._stolen === 'goldturbo') v.goldTurboStarted = false;
      v.player?.rumble(0.3, 150);
    }
  }
  inkSplat(k) {
    this.race.audio.sfx('splash');
    this.race.flash(0x1b1b3a);
    for (const o of this.race.karts) if (o !== k && o.rank < k.rank && o.bulletTime <= 0 && !o.shieldBlocks()) o.inkTime = 4.5;
  }
  horn(k) {
    this.race.audio.sfx('bump', k.pos); this.race.audio.sfx('storm');
    this.ring(k.pos, 16, 0xf2cd37);
    const R = 16;
    for (let n = this.proj.length - 1; n >= 0; n--) { const p = this.proj[n]; if (p.pos.distanceTo(k.pos) < R + (p.type === 'seeker' ? 10 : 0)) { this.race.fx.explosion(p.pos); this.scene.remove(p.mesh); this.proj.splice(n, 1); } }
    for (const t of [...this.traps]) if (t.pos.distanceTo(k.pos) < R) { this.race.fx.debris(t.pos, [C.red, C.yellow], 4); this.removeTrap(t); }
    for (const o of this.race.karts) if (o !== k && o.pos.distanceTo(k.pos) < 12) o.hit('spin', k);
  }

  hitKart(k, p, kind) {
    if (k.hit(kind, p.owner)) this.race.onProjectileHit?.(p.owner, k, p.type);
  }

  update(dt) {
    const tr = this.track;
    const karts = this.race.karts;
    // projectiles
    for (let n = this.proj.length - 1; n >= 0; n--) {
      const p = this.proj[n];
      p.life -= dt; p.safe -= dt;
      let dead = p.life <= 0;
      const loc = tr.locate(p.pos.x, p.pos.y, p.pos.z, p.si, this.loc);
      p.si = loc.i;
      if (p.type === 'rocket') {
        let aimYaw;
        const tgt = p.target && !p.target.finished ? p.target : null;
        if (tgt && tgt.pos.distanceTo(p.pos) < 32) {
          aimYaw = Math.atan2(tgt.pos.x - p.pos.x, tgt.pos.z - p.pos.z);
          p.yaw += Math.max(-8 * dt, Math.min(8 * dt, angleDiff(p.yaw, aimYaw)));
        } else {
          const tp = tr.at(tr.wrap(loc.i + 10), 0, 0, this.tmp);
          aimYaw = Math.atan2(tp.x - p.pos.x, tp.z - p.pos.z);
          p.yaw += Math.max(-5 * dt, Math.min(5 * dt, angleDiff(p.yaw, aimYaw)));
        }
        p.pos.x += Math.sin(p.yaw) * p.speed * dt;
        p.pos.z += Math.cos(p.yaw) * p.speed * dt;
        p.pos.y += ((loc.y + 1.0) - p.pos.y) * Math.min(1, dt * 8);
        if (Math.random() < 0.35) this.race.fx.puff(p.pos.x, p.pos.y, p.pos.z, 0, 1, 0, 0xdddddd, 0.5);
        this.race.fx.spark(p.pos.x, p.pos.y, p.pos.z, (Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2, 0xff8a20, 0.2);
        p.mesh.rotation.set(0, p.yaw, 0);
      } else if (p.type === 'seeker') {
        // flies above the track to the leader, then dives on them
        const leader = this.race.order.find((o) => !o.finished) || this.race.order[0];
        if (!p.diving) {
          const tp = tr.at(tr.wrap(loc.i + 18), 0, 9, this.tmp);
          p.yaw = Math.atan2(tp.x - p.pos.x, tp.z - p.pos.z);
          p.pos.x += Math.sin(p.yaw) * p.speed * dt; p.pos.z += Math.cos(p.yaw) * p.speed * dt;
          p.pos.y += (tp.y - p.pos.y) * Math.min(1, dt * 4);
          const ahead = (leader.loc.i - loc.i + tr.N) % tr.N;
          if (leader.pos.distanceTo(p.pos) < 40 || ahead < 25) p.diving = true;
        } else {
          const d = this.tmp.copy(leader.pos).add(new THREE.Vector3(0, 1, 0)).sub(p.pos);
          const L = d.length();
          p.pos.addScaledVector(d.normalize(), Math.min(L, 75 * dt));
          if (L < 2.5) { this.explode(leader.pos, 8, p.owner); dead = true; }
        }
        p.mesh.position.copy(p.pos);
        p.mesh.rotation.y += dt * 8;
        this.race.fx.spark(p.pos.x, p.pos.y, p.pos.z, 0, -2, 0, 0x6ab0ff, 0.3);
      } else if (p.type === 'boomerang') {
        p.t += dt;
        if (p.t > 1.0 && !p.owner.finished) {
          const want = Math.atan2(p.owner.pos.x - p.pos.x, p.owner.pos.z - p.pos.z);
          p.yaw += Math.max(-6 * dt, Math.min(6 * dt, angleDiff(p.yaw, want)));
          if (p.pos.distanceTo(p.owner.pos) < 3 && p.t > 1.4) dead = true;
        }
        p.pos.x += Math.sin(p.yaw) * p.speed * dt; p.pos.z += Math.cos(p.yaw) * p.speed * dt;
        p.pos.y += ((loc.y + 1.2) - p.pos.y) * Math.min(1, dt * 8);
        p.mesh.userData.inner.rotation.y += dt * 18;
      } else {
        // bouncer / freeze brick: straight, bounce off walls, follow ground, fall off void edges
        const nx = p.pos.x + Math.sin(p.yaw) * p.speed * dt;
        const nz = p.pos.z + Math.cos(p.yaw) * p.speed * dt;
        tr.locate(nx, p.pos.y, nz, p.si, this.loc);
        const L = this.loc;
        const abs = Math.abs(L.lat);
        if ((L.edge === 0 || L.edge === 3 || L.edge === 2) && !L.gap && abs > L.hw + L.sh - 0.9) {
          const ty = Math.atan2(L.tx, L.tz);
          p.yaw = ty - angleDiff(ty, p.yaw);
          p.bounces++;
          this.race.audio.sfx('bounce', p.pos);
        } else { p.pos.x = nx; p.pos.z = nz; }
        const ground = (!L.gap && (abs <= L.hw + 0.3 || (L.edge !== 1 && abs <= L.hw + L.sh))) ? L.y + 0.85 : -Infinity;
        if (p.pos.y > ground + 0.05) { p.vy -= 40 * dt; p.pos.y += p.vy * dt; if (p.pos.y < ground) { p.pos.y = ground; p.vy = 0; } }
        else { p.pos.y = ground; p.vy = 0; }
        if (p.pos.y < loc.y - 12) dead = true;
        p.mesh.rotation.y = p.yaw;
        p.mesh.userData.inner.rotation.y += dt * 10;
        if (p.bounces > 6) dead = true;
        if (p.type === 'ice' && Math.random() < 0.5) this.race.fx.spark(p.pos.x, p.pos.y, p.pos.z, 0, 1, 0, 0xbfe8ff, 0.4);
      }
      if (p.type !== 'seeker') p.mesh.position.copy(p.pos);
      // hits
      if (!dead && p.type !== 'seeker') {
        for (const k of karts) {
          if (k === p.owner && p.safe > 0) continue;
          if (k.respawn > 0) continue;
          if (k.pos.distanceToSquared(p.pos) < (2.4 * k.megaScale) ** 2 && Math.abs(k.pos.y + 0.8 - p.pos.y) < 2.5 * k.megaScale) {
            if (p.type === 'boomerang') {
              if (k === p.owner || p.hitSet.has(k)) continue;
              p.hitSet.add(k); this.hitKart(k, p, 'spin'); continue;
            }
            this.hitKart(k, p, p.type === 'ice' ? 'freeze' : 'wreck');
            this.race.fx.explosion(p.pos);
            dead = true; break;
          }
        }
      }
      if (!dead && p.type !== 'seeker') {
        for (const t of this.traps) if (t.pos.distanceToSquared(p.pos) < 2.4 * 2.4) {
          if (t.kind === 'bomb') { this.explode(t.pos, 8, t.owner); this.removeTrap(t); dead = true; break; }
          if (t.kind === 'puddle') continue;
          this.race.fx.debris(t.pos, [C.red, C.yellow, C.blue], 6); this.removeTrap(t); dead = p.type !== 'boomerang';
          this.race.fx.explosion(p.pos); this.race.audio.sfx('crash', p.pos);
          break;
        }
      }
      if (!dead && p.type !== 'seeker') for (const q of this.proj) if (q !== p && q.type !== 'seeker' && q.pos.distanceToSquared(p.pos) < 2 * 2) { q.life = 0; dead = true; this.race.fx.explosion(p.pos); break; }
      if (dead) { this.scene.remove(p.mesh); this.proj.splice(n, 1); }
    }
    // traps
    for (let n = this.traps.length - 1; n >= 0; n--) {
      const t = this.traps[n];
      if (!t) continue;
      t.safe -= dt; t.life -= dt;
      if (t.life <= 0) { this.removeTrap(t); continue; }
      if (t.air) {
        t.vel.y -= 40 * dt;
        t.pos.addScaledVector(t.vel, dt);
        const L = tr.locate(t.pos.x, t.pos.y, t.pos.z, t.si, this.loc);
        t.si = L.i;
        if (!L.gap && Math.abs(L.lat) < L.hw + L.sh && t.pos.y <= L.y) { t.pos.y = L.y; t.air = false; }
        if (t.pos.y < L.y - 15) { this.removeTrap(t); continue; }
        t.mesh.position.copy(t.pos);
      }
      if (t.kind === 'fakebox') { t.mesh.userData.inner.rotation.y += dt * 1.3; }
      if (t.kind === 'bomb' && !t.air) {
        t.fuse -= dt;
        t.mesh.userData.fuse.visible = Math.floor(t.fuse * (t.fuse < 0.8 ? 16 : 6)) % 2 === 0;
        if (t.fuse <= 0) { this.explode(t.pos, 8, t.owner); this.removeTrap(t); continue; }
      }
      const r = t.kind === 'puddle' ? 3.4 : t.kind === 'fakebox' ? 2.2 : t.kind === 'bomb' ? 2.2 : 1.9;
      for (const k of karts) {
        if (k === t.owner && t.safe > 0) continue;
        if (k.respawn > 0 || (!k.grounded && k.pos.y > t.pos.y + 1.5)) continue;
        if (k.pos.distanceToSquared(t.pos) < (r + (k.megaScale - 1) * 2) ** 2) {
          if (t.kind === 'bomb') { this.explode(t.pos, 8, t.owner); this.removeTrap(t); break; }
          // mega karts and bullets squash traps
          if (k.megaTime > 0 || k.bulletTime > 0 || k.goldenTime > 0) { if (t.kind !== 'puddle') { this.race.fx.debris(t.pos, [C.red, C.yellow, C.blue], 6); this.removeTrap(t); } break; }
          if (t.kind === 'puddle') { if (k.invuln <= 0 && k.hit('spin', t.owner)) this.race.onProjectileHit?.(t.owner, k, 'puddle'); continue; }
          if (k.hit(t.kind === 'fakebox' ? 'wreck' : 'spin', t.owner)) this.race.onProjectileHit?.(t.owner, k, t.kind);
          this.race.fx.debris(t.pos, t.kind === 'fakebox' ? [0xff6ab0, 0xffffff] : [C.red, C.yellow, C.blue, C.green], 6, 0.7);
          if (t.kind === 'fakebox') this.race.fx.explosion(t.pos);
          this.removeTrap(t);
          break;
        }
      }
    }
    // brick storms: a cloud gathers over each victim then rains bricks on them
    for (let n = this.storms.length - 1; n >= 0; n--) {
      const s = this.storms[n];
      s.t += dt;
      const k = s.kart;
      s.cloud.position.set(k.pos.x, k.pos.y + 7 - Math.min(1, s.t) * 1.5, k.pos.z);
      s.cloud.rotation.y += dt;
      if (s.t > 0.8 && s.t < 1.4) {
        this.race.fx.debrisOne(s.cloud.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, -1, (Math.random() - 0.5) * 3)), [C.red, C.yellow, C.blue, C.green][Math.floor(Math.random() * 4)], new THREE.Vector3(0, -12, 0), 1.2);
      }
      if (s.t > 1.1 && !s.hit) { s.hit = true; k.hit('wreck', s.by); }
      if (s.t > 1.8) { this.scene.remove(s.cloud); this.storms.splice(n, 1); }
    }
    // shockwave rings
    for (let n = this.rings.length - 1; n >= 0; n--) {
      const r = this.rings[n];
      r.t += dt;
      r.m.scale.setScalar(1 + r.t * r.radius * 2.2);
      r.m.material.opacity = Math.max(0, 0.9 - r.t * 2);
      if (r.t > 0.45) { this.scene.remove(r.m); this.rings.splice(n, 1); }
    }
  }

  // AI helper: is there a trap near a point ahead?
  dangerNear(pos, r = 6) {
    for (const t of this.traps) if (t.pos.distanceToSquared(pos) < (r + (t.kind === 'puddle' ? 2 : 0)) ** 2) return t.pos;
    return null;
  }

  dispose() {
    for (const p of this.proj) this.scene.remove(p.mesh);
    for (const t of this.traps) this.scene.remove(t.mesh);
    for (const s of this.storms) this.scene.remove(s.cloud);
    for (const r of this.rings) this.scene.remove(r.m);
  }
}
