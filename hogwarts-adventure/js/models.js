// Procedural character & creature models with code-driven animation rigs.
import * as THREE from 'three';
import { HOUSES } from './state.js';
import { scarfTex, tatterTex, fabricTex, rockTex, glowSprite } from './textures.js';
import { damp, clamp, lerp } from './util.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Merge sibling meshes that share a material (per animated bone) to cut draw calls.
export function compact(root) {
  const visit = (obj) => {
    const groups = new Map();
    for (const c of obj.children) {
      if (c.isMesh && !c.userData.keep && c.children.length === 0) {
        const k = c.material.uuid + (c.castShadow ? 's' : 'n');
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(c);
      }
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const geos = list.map((m) => {
        m.updateMatrix();
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        g.applyMatrix4(m.matrix);
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        return g;
      });
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, list[0].material);
      mesh.castShadow = list[0].castShadow;
      mesh.receiveShadow = true;
      for (const m of list) obj.remove(m);
      obj.add(mesh);
    }
    for (const c of [...obj.children]) if (!c.isMesh) visit(c);
  };
  visit(root);
  return root;
}

const mats = new Map();
function std(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return mats.get(key);
}
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function grp(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}
const capsule = (r, l, s = 8) => new THREE.CapsuleGeometry(r, l, 4, s);

export const SKIN_TONES = ['#f6d3b8', '#e8b48f', '#c98b62', '#9a6440', '#6b4127', '#4a2c1a'];
export const HAIR_COLORS = ['#1b1210', '#4a2a16', '#7a4520', '#b5682a', '#d9b26a', '#e8dcc0', '#8a8a8a', '#a8322a'];
export const HAIR_STYLES = ['short', 'long', 'curly', 'bun', 'ponytail', 'messy'];
export const WAND_WOODS = { holly: '#c9b48a', yew: '#7a4a2a', vine: '#5a6a3a', elder: '#d8d0c0', ebony: '#2a2020', willow: '#a8845a' };

// ======================================================================== WIZARD
export function makeWizard(o = {}) {
  const house = o.house || null;
  const skin = std(o.skin || SKIN_TONES[1], { roughness: 0.62 });
  const hairM = std(o.hairColor || HAIR_COLORS[1], { roughness: 0.75 });
  const robeCol = o.robeColor || '#17161c';
  const fab = fabricTex();
  const robe = new THREE.MeshStandardMaterial({ color: robeCol, roughness: 0.92, map: fab.map, side: THREE.FrontSide });
  const lining = std(house ? HOUSES[house].c1 : o.liningColor || '#3a3a44', { roughness: 0.8, side: THREE.BackSide });
  const trim = std(house ? HOUSES[house].c1 : o.liningColor || '#2a2a30', { roughness: 0.8 });
  const trousers = std('#22222a', { roughness: 0.9 });
  const shoes = std('#0d0b0a', { roughness: 0.4, metalness: 0.1 });
  const shirt = std('#e8e6e0', { roughness: 0.85 });

  const root = new THREE.Group();
  const body = grp(root); // roll / fall pivot
  const hips = grp(body, 0, 0.95, 0);

  // robe skirt (outer + lining)
  const prof = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    prof.push(new THREE.Vector2(0.19 + Math.pow(t, 1.3) * 0.2 + Math.sin(t * 3) * 0.01, -t * 0.86));
  }
  prof.reverse();
  const skirtG = new THREE.LatheGeometry(prof, 28);
  const skirt = grp(hips);
  mesh(skirtG, robe, 0, 0, 0, skirt);
  const skirtIn = mesh(skirtG, lining, 0, 0, 0, skirt);
  skirtIn.castShadow = false;
  const hem = mesh(new THREE.TorusGeometry(0.39, 0.015, 4, 24), trim, 0, -0.85, 0, skirt);
  // front opening trim running down the robe
  for (const sx of [-1, 1]) {
    const tr = mesh(new THREE.BoxGeometry(0.018, 0.86, 0.012), trim, sx * 0.03, -0.43, 0.29, skirt);
    tr.rotation.x = -0.2;
    tr.rotation.z = sx * 0.04;
  }
  hem.rotation.x = Math.PI / 2;

  // legs
  const legs = [-1, 1].map((s) => {
    const leg = grp(hips, s * 0.09, -0.02, 0);
    mesh(capsule(0.065, 0.36), trousers, 0, -0.22, 0, leg);
    const knee = grp(leg, 0, -0.45, 0);
    mesh(capsule(0.055, 0.34), trousers, 0, -0.2, 0, knee);
    const shoe = mesh(new THREE.SphereGeometry(0.065, 14, 10), shoes, 0, -0.44, 0.045, knee);
    shoe.scale.set(0.85, 0.62, 1.75);
    mesh(new THREE.CylinderGeometry(0.06, 0.062, 0.02, 14), std('#2a2018', { roughness: 0.9 }), 0, -0.473, 0.045, knee).scale.set(0.9, 1, 1.6);
    return { leg, knee };
  });

  // torso
  const torso = grp(hips, 0, 0, 0);
  const chest = mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.52, 22, 1, false, 0.42, Math.PI * 2 - 0.84), robe, 0, 0.26, 0, torso);
  chest.scale.z = 0.78;
  // shirt V + tie
  if (house) {
    const tie = mesh(new THREE.BoxGeometry(0.035, 0.16, 0.01), std(HOUSES[house].c2), 0, 0.4, 0.182, torso);
    tie.castShadow = false;
  }
  // knitted jumper under the robe
  const jumper = std('#5a5a62', { roughness: 0.95 });
  const jp = mesh(new THREE.CylinderGeometry(0.17, 0.165, 0.34, 16, 1, false, -0.55, 1.1), jumper, 0, 0.2, 0, torso);
  jp.scale.z = 0.98;
  if (house) {
    const band = mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.018, 16, 1, true, -0.55, 1.1), std(HOUSES[house].c1), 0, 0.05, 0, torso);
    band.scale.z = 0.98;
  }
  // robe lapels
  for (const s of [-1, 1]) {
    const lap = mesh(new THREE.BoxGeometry(0.05, 0.44, 0.02), trim, s * 0.085, 0.27, 0.168, torso);
    lap.rotation.z = s * 0.18;
  }
  // house crest patch
  if (house) {
    const patch = mesh(new THREE.CircleGeometry(0.035, 12), std(HOUSES[house].c1, { emissive: HOUSES[house].c1, emissiveIntensity: 0.2 }), -0.11, 0.38, 0.165, torso);
    patch.castShadow = false;
  }
  // hood draped on the back
  const hood = mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), robe, 0, 0.44, -0.12, torso);
  hood.scale.set(1, 0.6, 0.7);
  hood.rotation.x = -0.9;

  // scarf
  let scarf = null;
  if (house || o.scarf) {
    const sm = new THREE.MeshStandardMaterial({ map: scarfTex(house || 'gryffindor'), roughness: 0.95 });
    const ring = mesh(new THREE.TorusGeometry(0.12, 0.045, 8, 20), sm, 0, 0.51, 0.01, torso);
    ring.rotation.x = Math.PI / 2 + 0.15;
    const tails = [];
    for (const [x, len, rz] of [[0.07, 0.36, 0.08], [0.12, 0.3, -0.05]]) {
      const tg = grp(torso, x, 0.5, 0.13);
      const t = mesh(new THREE.BoxGeometry(0.085, len, 0.022), sm, 0, -len / 2, 0, tg);
      t.rotation.z = rz;
      tails.push(tg);
    }
    scarf = { ring, tails };
  }

  // neck & head
  const neck = grp(torso, 0, 0.52, 0);
  mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.12, 14), skin, 0, 0.04, 0, neck);
  // shirt collar points
  for (const s of [-1, 1]) {
    const c = mesh(new THREE.BoxGeometry(0.055, 0.012, 0.05), shirt, s * 0.035, 0.0, 0.055, neck);
    c.rotation.set(0.5, s * 0.5, s * 0.35);
  }
  const head = grp(neck, 0, 0.175, 0);
  head.scale.setScalar(1.08); // slightly larger heads read better at game distance
  // one smooth, slightly egg-shaped head (narrower towards the chin)
  const skullG = new THREE.SphereGeometry(0.125, 32, 24);
  { const pa = skullG.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); const k = y < 0 ? 1 + y * 1.1 : 1; pa.setX(i, pa.getX(i) * k); pa.setZ(i, pa.getZ(i) * (y < 0 ? 1 + y * 0.5 : 1)); } skullG.computeVertexNormals(); }
  const skull = mesh(skullG, skin, 0, 0.0, 0.0, head);
  skull.scale.set(0.95, 1.06, 0.98);
  // ears
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.028, 12, 10), skin, s * 0.112, -0.005, -0.008, head);
    ear.scale.set(0.45, 0.95, 0.7);
  }
  // small rounded nose
  mesh(new THREE.SphereGeometry(0.014, 12, 10), skin, 0, -0.018, 0.119, head).scale.set(1, 0.85, 0.8);
  // friendly stylised eyes: glossy dark ovals with a highlight
  const eyeM = o.eyeGlow ? new THREE.MeshBasicMaterial({ color: new THREE.Color(o.eyeGlow).multiplyScalar(4) }) : std(new THREE.Color(o.eyeColor || '#3a2a1a').multiplyScalar(0.55).getStyle(), { roughness: 0.15 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.0195, 16, 12), eyeM, s * 0.041, 0.012, 0.105, head);
    e.scale.set(0.82, 1.15, 0.5);
    const sh = mesh(new THREE.SphereGeometry(0.0048, 8, 6), shine, s * 0.042 + 0.005, 0.02, 0.114, head);
    sh.castShadow = false;
    eyes.push(e, sh);
    // thin, gently arched brows
    const brow = mesh(new THREE.CapsuleGeometry(0.0045, 0.026, 3, 6), hairM, s * 0.043, 0.047, 0.108, head);
    brow.rotation.z = Math.PI / 2 + s * 0.12;
  }
  // a small smile (scaled while talking)
  const mouth = mesh(new THREE.TorusGeometry(0.014, 0.0035, 5, 12, Math.PI), std('#5a2a24', { roughness: 0.6 }), 0, -0.048, 0.104, head);
  mouth.rotation.z = Math.PI;
  mouth.castShadow = false;
  mouth.userData.keep = true;

  // hair, built from a scalp cap plus strands so it has some volume
  const style = o.hairStyle || 'short';
  const strand = (x, y, z, len, rx, rz, r = 0.026) => {
    const m = mesh(new THREE.CapsuleGeometry(r, len, 4, 8), hairM, x, y, z, head);
    m.rotation.set(rx, 0, rz);
    return m;
  };
  if (!o.hood && !o.bald) {
    const cap = mesh(new THREE.SphereGeometry(0.134, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.018, -0.02, head);
    cap.scale.set(0.97, 1.06, 1.06);
    cap.rotation.x = -0.5; // hairline sits above the brows at the front, low at the back
    // back of the head / nape
    const nape = mesh(new THREE.SphereGeometry(0.128, 24, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.35), hairM, 0, 0.0, -0.025, head);
    nape.scale.set(0.98, 1.05, 1.05);
    nape.rotation.x = -0.5;
    // fringe: a row of angled strands over the forehead
    // a swept fringe across the forehead (separate spiky strands for messy hair)
    const fringe = mesh(new THREE.SphereGeometry(0.12, 20, 10, -0.9, 1.8, Math.PI * 0.32, Math.PI * 0.16), hairM, 0, 0.012, 0.012, head);
    fringe.rotation.set(-0.2, 0.25, 0);
    fringe.scale.set(1.1, 1, 1.12);
    const fr = style === 'messy' ? 7 : 0;
    for (let i = 0; i < fr; i++) {
      const t = i / (fr - 1) - 0.5;
      strand(t * 0.16, 0.105 - Math.abs(t) * 0.03, 0.088 - Math.abs(t) * 0.05, 0.035 + (i % 2) * 0.01, 1.45 + (style === 'messy' ? (i % 3) * 0.15 : 0), -t * 1.2, 0.02);
    }
    // side locks over the ears
    for (const s of [-1, 1]) strand(s * 0.112, 0.01, 0.01, style === 'long' ? 0.16 : 0.05, 0.1, s * 0.12, 0.024);
    if (style === 'long' || style === 'ponytail' || style === 'bun') {
      const n = style === 'long' ? 9 : 5;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2.4;
        const len = style === 'long' ? 0.24 + (i % 2) * 0.03 : 0.08;
        strand(Math.sin(a) * 0.11, style === 'long' ? -0.1 : -0.02, -Math.cos(a) * 0.095, len, 0.12, Math.sin(a) * 0.12, 0.03);
      }
    }
    if (style === 'ponytail') {
      mesh(new THREE.TorusGeometry(0.022, 0.008, 6, 12), std('#c03040'), 0, 0.02, -0.135, head).rotation.x = 0.4;
      const pt = strand(0, -0.09, -0.17, 0.2, 0.35, 0, 0.038);
      pt.scale.set(1, 1, 0.85);
    }
    if (style === 'bun') {
      mesh(new THREE.SphereGeometry(0.058, 14, 12), hairM, 0, 0.1, -0.12, head);
      mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), hairM, 0, 0.1, -0.12, head).rotation.x = 0.8;
    }
    if (style === 'curly' || style === 'messy') {
      const n = style === 'curly' ? 34 : 14;
      for (let i = 0; i < n; i++) {
        const a = i * 2.39996, b = 0.15 + ((i * 0.618) % 1) * (style === 'curly' ? 1.45 : 1.0);
        if (Math.sin(a) > 0.3 && b > 0.75) continue; // leave the face clear
        const r = 0.132;
        mesh(new THREE.SphereGeometry(style === 'curly' ? 0.042 : 0.034, 10, 8), hairM, Math.cos(a) * Math.sin(b) * r, Math.cos(b) * r + 0.02, Math.sin(a) * Math.sin(b) * r - 0.015 - (b > 1.1 ? 0.02 : 0), head);
      }
    }
  }
  if (o.beard) {
    const beard = mesh(new THREE.ConeGeometry(0.1, o.beard === 'long' ? 0.45 : 0.18, 10), std(o.beardColor || '#d8d4cc', { roughness: 0.9 }), 0, -0.15 - (o.beard === 'long' ? 0.14 : 0), 0.07, head);
    beard.rotation.x = Math.PI + 0.15;
  }
  if (o.glasses) {
    const gm = std('#2a2418', { metalness: 0.8, roughness: 0.3 });
    for (const s of [-1, 1]) {
      const r = mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 16), gm, s * 0.046, 0.02, 0.125, head);
      r.castShadow = false;
    }
    mesh(new THREE.BoxGeometry(0.03, 0.005, 0.005), gm, 0, 0.025, 0.128, head);
  }
  if (o.hood) {
    const h = mesh(new THREE.SphereGeometry(0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), robe, 0, 0.02, -0.02, head);
    h.scale.set(1, 1.15, 1.12);
    const tip = mesh(new THREE.ConeGeometry(0.1, 0.25, 10), robe, 0, 0.08, -0.17, head);
    tip.rotation.x = -1.9;
  }
  if (o.mask) {
    const mk = mesh(new THREE.SphereGeometry(0.13, 16, 12, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.2, Math.PI * 0.62), std('#c8c8cc', { metalness: 0.9, roughness: 0.25 }), 0, 0, 0.012, head);
    mk.scale.set(0.98, 1.08, 1.05);
    for (const s of [-1, 1]) {
      const eg = mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(o.eyeGlow || '#ff3030').multiplyScalar(5) }), s * 0.045, 0.025, 0.14, head);
      eg.castShadow = false;
    }
  }
  let hat = null;
  if (o.hat) {
    const hp = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0.3, 0.012), new THREE.Vector2(0.16, 0.03)];
    for (let i = 1; i <= 8; i++) hp.push(new THREE.Vector2(0.15 * (1 - i / 8) + 0.004, 0.03 + i * 0.05));
    hat = grp(head, 0, 0.1, -0.01);
    mesh(new THREE.LatheGeometry(hp, 20), std(o.hatColor || robeCol, { roughness: 0.9, side: THREE.DoubleSide }), 0, 0, 0, hat);
    const tip = mesh(new THREE.ConeGeometry(0.03, 0.18, 8), std(o.hatColor || robeCol), 0.05, 0.45, -0.04, hat);
    tip.rotation.z = -0.9;
    mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 20), std(o.hatBand || '#7a5a2a'), 0, 0.04, 0, hat).rotation.x = Math.PI / 2;
  }

  // arms
  const sleeveG = new THREE.CylinderGeometry(0.06, 0.085, 0.32, 10);
  sleeveG.translate(0, -0.16, 0);
  const foreG = new THREE.CylinderGeometry(0.075, 0.12, 0.3, 10, 1, true);
  foreG.translate(0, -0.15, 0);
  const arms = [-1, 1].map((s) => {
    const sh = grp(torso, s * 0.24, 0.46, 0);
    mesh(new THREE.SphereGeometry(0.075, 10, 8), robe, 0, 0, 0, sh);
    mesh(sleeveG, robe, 0, 0, 0, sh);
    const elbow = grp(sh, 0, -0.31, 0);
    const fore = mesh(foreG, robe, 0, 0, 0, elbow);
    fore.material = robe;
    const cuff = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12, 1, true), trim, 0, -0.29, 0, elbow);
    cuff.castShadow = false;
    const hand = grp(elbow, 0, -0.32, 0);
    // palm, four curled fingers and a thumb
    mesh(new THREE.BoxGeometry(0.06, 0.07, 0.03), skin, 0, -0.03, 0, hand);
    mesh(new THREE.SphereGeometry(0.032, 10, 8), skin, 0, -0.025, 0, hand).scale.set(0.95, 1.05, 0.55);
    for (let f = 0; f < 4; f++) {
      const fg = mesh(new THREE.CapsuleGeometry(0.0085, 0.032, 3, 6), skin, (f - 1.5) * 0.0145, -0.075, 0.01, hand);
      fg.rotation.x = 0.9;
    }
    const th = mesh(new THREE.CapsuleGeometry(0.009, 0.03, 3, 6), skin, -s * 0.033, -0.035, 0.018, hand);
    th.rotation.set(0.6, 0, -s * 0.7);
    return { sh, elbow, hand };
  });
  // wand
  const wand = grp(arms[1].hand, 0, -0.04, 0.03);
  const wandM = std(o.wandColor || WAND_WOODS.holly, { roughness: 0.5 });
  const wandG = new THREE.CylinderGeometry(0.006, 0.012, 0.36, 6);
  wandG.translate(0, 0.18, 0);
  const wandMesh = mesh(wandG, wandM, 0, 0, 0, wand);
  const handle = mesh(new THREE.CylinderGeometry(0.014, 0.013, 0.09, 8), std('#2a1a10'), 0, 0.03, 0, wand);
  wand.rotation.x = Math.PI - 0.2; // runs along the forearm so casting points it forward
  const wandTip = grp(wand, 0, 0.37, 0);
  if (o.noWand) wand.visible = false;

  // small facial details never need to cast shadows
  head.traverse((c) => { if (c.isMesh && c !== skull) c.castShadow = false; });
  compact(root);
  if (o.noShadow) root.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  const s = o.scale || 1;
  root.scale.setScalar(s);
  const parts = { body, hips, torso, neck, head, legs, arms, wand, wandTip, skirt, scarf, hat, mouth, chest };
  const anim = new HumanoidAnim(parts);
  return { root, parts, anim, wandTip, height: 1.78 * s };
}

// Code-driven humanoid animation with blending and one-shot overlays.
export class HumanoidAnim {
  constructor(p) {
    this.p = p;
    this.state = 'idle';
    this.t = 0;
    this.phase = 0;
    this.shots = []; // {name, t, dur}
    this.cur = {};
    this.flyLean = 0;
    this.speed = 0;
    this.blend = { walk: 0, run: 0 };
  }
  set(state) { this.state = state; }
  trigger(name, dur) {
    const d = dur ?? { cast: 0.38, hit: 0.4, wave: 1.2, nod: 0.6, flick: 0.5, point: 1, cheer: 1.2 }[name] ?? 0.4;
    this.shots = this.shots.filter((s) => s.name !== name);
    this.shots.push({ name, t: 0, dur: d });
  }
  shot(name) { return this.shots.find((s) => s.name === name); }
  update(dt, speed = 0, extra = {}) {
    const P = this.p;
    this.t += dt;
    const st = this.state;
    this.speed = damp(this.speed, speed, 10, dt);
    const sp = this.speed;
    const moving = sp > 0.3 && (st === 'idle' || st === 'walk' || st === 'run' || st === 'block' || st === 'aim');
    this.phase += dt * (moving ? 2.2 + sp * 1.25 : 0);
    const ph = this.phase;
    const amp = clamp(sp / 7, 0, 1);
    const T = {
      bodyY: 0, bodyX: 0, bodyZ: 0, hipsY: 0.95, torsoX: 0.03, torsoY: 0, torsoZ: 0, headX: 0, headY: 0,
      lL: 0, lR: 0, kL: 0, kR: 0, aLx: 0.05, aLz: -0.12, aRx: -0.25, aRz: 0.12, eL: -0.2, eR: -0.55, skirtX: 0, legSpreadL: 0, legSpreadR: 0,
    };
    const br = Math.sin(this.t * 2.2) * 0.015;
    T.torsoX += br;
    T.aLz -= br; T.aRz += br;
    if (moving) {
      const sw = Math.sin(ph);
      T.lL = sw * (0.35 + amp * 0.55); T.lR = -T.lL;
      T.kL = Math.max(0, -Math.cos(ph)) * (0.4 + amp * 0.9);
      T.kR = Math.max(0, Math.cos(ph)) * (0.4 + amp * 0.9);
      T.aLx = -T.lL * 0.7; T.aRx = st === 'aim' || st === 'block' ? T.aRx : -T.lR * 0.6 - 0.2;
      T.eL = -0.3 - amp * 0.6; T.eR = -0.5 - amp * 0.5;
      T.bodyY = Math.abs(Math.cos(ph)) * 0.05 * (0.5 + amp);
      T.torsoX = 0.05 + amp * 0.18;
      T.torsoY = Math.sin(ph) * 0.08 * amp;
      T.skirtX = -amp * 0.12;
    }
    if (st === 'jump') {
      T.lL = -0.6; T.lR = 0.2; T.kL = 1.1; T.kR = 0.5; T.aLz = -0.6; T.aRz = 0.5; T.aLx = -0.3; T.skirtX = 0.15;
    } else if (st === 'fall') {
      T.lL = -0.2; T.lR = 0.3; T.kL = 0.3; T.aLz = -1.1; T.aRz = 1.1; T.skirtX = 0.2;
    } else if (st === 'roll') {
      T.lL = -1.6; T.lR = -1.6; T.kL = 2.2; T.kR = 2.2; T.torsoX = 0.9; T.aLx = -1; T.aRx = -1; T.eL = -1.5; T.eR = -1.5; T.headX = 0.6;
    } else if (st === 'block') {
      T.aRx = -1.35; T.aRz = -0.5; T.eR = -1.2; T.aLx = -1.2; T.aLz = 0.4; T.eL = -1.2; T.torsoX = 0.12;
    } else if (st === 'aim') {
      T.aRx = -1.3; T.eR = -0.25; T.torsoY = 0.25; T.headY = -0.2;
    } else if (st === 'down') {
      T.bodyX = -Math.PI / 2; T.bodyY = 0.15; T.aLz = -1.3; T.aRz = 1.3; T.lL = 0.1; T.lR = -0.15; T.headX = -0.2;
    } else if (st === 'sit') {
      T.hipsY = 0.55; T.lL = -1.5; T.lR = -1.5; T.kL = 1.5; T.kR = 1.5; T.aLx = -0.6; T.aRx = -0.6; T.eL = -0.9; T.eR = -0.9;
    } else if (st === 'fly') {
      T.lL = -1.1; T.lR = -1.1; T.kL = 1.5; T.kR = 1.5; T.legSpreadL = 0.25; T.legSpreadR = -0.25; T.torsoX = 0.45 + (extra.lean || 0) * 0.2;
      T.aLx = -1.1; T.aRx = -1.1; T.eL = -0.4; T.eR = -0.4; T.aLz = 0.15; T.aRz = -0.15; T.headX = -0.35; T.skirtX = 0.5;
      T.bodyZ = extra.bank || 0;
    } else if (st === 'ride') {
      T.lL = -0.4; T.lR = -0.4; T.kL = 0.8; T.kR = 0.8; T.legSpreadL = 0.7; T.legSpreadR = -0.7; T.torsoX = 0.3;
      T.aLx = -0.9; T.aRx = -0.9; T.eL = -0.6; T.eR = -0.6; T.skirtX = 0.4; T.bodyZ = extra.bank || 0;
    } else if (st === 'bow') {
      T.torsoX = 0.85; T.headX = 0.3; T.aLx = 0.1; T.aRx = 0.1;
    } else if (st === 'stir') {
      T.aRx = -1.0 + Math.sin(this.t * 6) * 0.15; T.aRz = Math.cos(this.t * 6) * 0.25; T.eR = -0.6; T.torsoX = 0.25;
    } else if (st === 'stunned') {
      T.torsoX = 0.35; T.headX = 0.5; T.headY = Math.sin(this.t * 3) * 0.3; T.aLz = -0.3; T.aRz = 0.3; T.aRx = 0.2; T.eR = -0.1;
    } else if (st === 'frozen') {
      // keep the current pose
      return;
    } else if (st === 'lifted') {
      T.lL = 0.4; T.lR = -0.3; T.kL = 0.6; T.kR = 0.8; T.aLz = -1.3; T.aRz = 1.2; T.aLx = -0.4; T.headX = -0.3; T.bodyZ = Math.sin(this.t * 2) * 0.3;
    } else if (st === 'cheer') {
      T.aLx = -2.8; T.aRx = -2.8; T.aLz = -0.3; T.aRz = 0.3; T.eL = -0.2; T.eR = -0.2; T.bodyY = Math.abs(Math.sin(this.t * 7)) * 0.12;
    } else if (st === 'talk') {
      T.aLx = -0.4 + Math.sin(this.t * 2.3) * 0.2; T.eL = -0.9; T.aLz = -0.2 + Math.sin(this.t * 1.7) * 0.1; T.headY = Math.sin(this.t * 0.9) * 0.15; T.headX = Math.sin(this.t * 1.3) * 0.05;
    }
    // overlays
    for (const s of this.shots) s.t += dt;
    this.shots = this.shots.filter((s) => s.t < s.dur);
    const cast = this.shot('cast');
    if (cast) {
      const k = cast.t / cast.dur;
      const thrust = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
      T.aRx = lerp(T.aRx, -1.55, Math.min(1, thrust * 1.4));
      T.aRz = lerp(T.aRz, -0.1, thrust);
      T.eR = lerp(T.eR, -0.05, thrust);
      T.torsoY += 0.35 * thrust;
      T.torsoX += 0.05 * thrust;
      T.aLz -= 0.4 * thrust; T.aLx += 0.3 * thrust;
    }
    const flick = this.shot('flick');
    if (flick) {
      const k = flick.t / flick.dur;
      T.aRx = -1.2 - Math.sin(k * Math.PI * 2) * 0.6; T.eR = -0.6 + Math.sin(k * Math.PI) * 0.5; T.aRz = Math.sin(k * Math.PI * 2) * 0.4;
    }
    const hit = this.shot('hit');
    if (hit) {
      const k = Math.sin((hit.t / hit.dur) * Math.PI);
      T.torsoX -= 0.5 * k; T.headX -= 0.4 * k; T.aLz -= 0.7 * k; T.aRz += 0.7 * k; T.bodyX -= 0.12 * k;
    }
    const wave = this.shot('wave');
    if (wave) { T.aLx = -2.6; T.aLz = -0.3 + Math.sin(wave.t * 12) * 0.3; T.eL = -0.4; }
    const nod = this.shot('nod');
    if (nod) T.headX += Math.sin((nod.t / nod.dur) * Math.PI * 2) * 0.25;
    const point = this.shot('point');
    if (point) { T.aLx = -1.5; T.eL = 0; T.aLz = 0.1; }

    // apply with damping
    const L = st === 'roll' ? 30 : 16;
    const c = this.cur;
    for (const k in T) c[k] = c[k] === undefined ? T[k] : damp(c[k], T[k], L, dt);
    P.body.position.y = c.bodyY;
    P.body.rotation.x = c.bodyX;
    P.body.rotation.z = c.bodyZ;
    P.hips.position.y = c.hipsY;
    P.torso.rotation.set(c.torsoX, c.torsoY, c.torsoZ);
    P.head.rotation.set(c.headX, c.headY, 0);
    P.legs[0].leg.rotation.set(c.lL, 0, c.legSpreadL);
    P.legs[1].leg.rotation.set(c.lR, 0, c.legSpreadR);
    P.legs[0].knee.rotation.x = c.kL;
    P.legs[1].knee.rotation.x = c.kR;
    P.arms[0].sh.rotation.set(c.aLx, 0, c.aLz);
    P.arms[1].sh.rotation.set(c.aRx, 0, c.aRz);
    P.arms[0].elbow.rotation.x = c.eL;
    P.arms[1].elbow.rotation.x = c.eR;
    P.skirt.rotation.x = c.skirtX;
    if (P.scarf) {
      P.scarf.tails[0].rotation.x = -0.15 - amp * 0.6 + Math.sin(this.t * 7) * 0.05 * amp;
      P.scarf.tails[1].rotation.x = -0.1 - amp * 0.5 + Math.sin(this.t * 6 + 1) * 0.05 * amp;
    }
    if (P.mouth) P.mouth.scale.y = st === 'talk' ? 1 + Math.abs(Math.sin(this.t * 14)) * 1.6 : 1;
  }
}

// ======================================================================== TROLL
export function makeTroll() {
  const rt = rockTex();
  const skin = new THREE.MeshStandardMaterial({ color: '#7d8a6a', roughness: 0.95, normalMap: rt.normalMap, normalScale: new THREE.Vector2(0.6, 0.6) });
  const cloth = std('#4a3826', { roughness: 1 });
  const root = new THREE.Group();
  const body = grp(root);
  const hips = grp(body, 0, 1.5, 0);
  const torso = grp(hips, 0, 0, 0);
  const belly = mesh(new THREE.SphereGeometry(1, 20, 16), skin, 0, 0.7, 0.1, torso);
  belly.scale.set(1.05, 1.15, 0.95);
  const chest = mesh(new THREE.SphereGeometry(0.85, 18, 14), skin, 0, 1.45, -0.05, torso);
  chest.scale.set(1.2, 0.9, 0.9);
  const loin = mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.6, 14, 1, true), cloth, 0, 0.05, 0.05, hips);
  loin.material.side = THREE.DoubleSide;
  const neck = grp(torso, 0, 1.95, 0.35);
  const head = grp(neck, 0, 0.2, 0.15);
  const skull = mesh(new THREE.SphereGeometry(0.38, 16, 12), skin, 0, 0, 0, head);
  skull.scale.set(1, 0.85, 1.05);
  const nose = mesh(new THREE.SphereGeometry(0.13, 10, 8), skin, 0, -0.05, 0.38, head);
  nose.scale.set(0.9, 0.8, 1.3);
  mesh(new THREE.BoxGeometry(0.4, 0.06, 0.1), std('#2a1a14'), 0, -0.2, 0.33, head);
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.3) }), s * 0.13, 0.08, 0.33, head);
    const ear = mesh(new THREE.SphereGeometry(0.12, 8, 6), skin, s * 0.38, 0.02, 0, head);
    ear.scale.set(0.4, 1, 0.7);
    mesh(new THREE.ConeGeometry(0.04, 0.12, 5), std('#e8e0c0'), s * 0.12, -0.22, 0.32, head).rotation.x = Math.PI;
  }
  const arms = [-1, 1].map((s) => {
    const sh = grp(torso, s * 1.15, 1.5, 0);
    mesh(new THREE.SphereGeometry(0.42, 12, 10), skin, 0, 0, 0, sh);
    mesh(capsule(0.3, 0.7), skin, 0, -0.55, 0, sh);
    const elbow = grp(sh, 0, -1.05, 0);
    mesh(capsule(0.34, 0.7), skin, 0, -0.5, 0, elbow);
    const hand = grp(elbow, 0, -1.05, 0);
    mesh(new THREE.SphereGeometry(0.32, 10, 8), skin, 0, 0, 0, hand).scale.set(1, 0.85, 1.1);
    return { sh, elbow, hand };
  });
  const legs = [-1, 1].map((s) => {
    const leg = grp(hips, s * 0.5, -0.1, 0);
    mesh(capsule(0.36, 0.45), skin, 0, -0.4, 0, leg);
    const knee = grp(leg, 0, -0.8, 0);
    mesh(capsule(0.32, 0.35), skin, 0, -0.3, 0, knee);
    mesh(new THREE.SphereGeometry(0.36, 10, 8), skin, 0, -0.6, 0.15, knee).scale.set(1, 0.5, 1.4);
    return { leg, knee };
  });
  // club
  const club = grp(arms[1].hand, 0, 0, 0);
  const clubG = new THREE.CylinderGeometry(0.28, 0.1, 2.6, 10);
  clubG.translate(0, 1.0, 0);
  const wood = std('#5a3a20', { roughness: 0.9 });
  mesh(clubG, wood, 0, 0, 0, club);
  for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(0.1, 6, 5), wood, Math.cos(i) * 0.22, 1.6 + i * 0.12, Math.sin(i) * 0.22, club);
  club.rotation.x = Math.PI / 2;
  const clubTip = grp(club, 0, 2.2, 0);
  const anim = {
    t: 0, state: 'idle', phase: 0, cur: {}, k: 0,
    set(s) { if (this.state !== s) { this.state = s; this.k = 0; } },
    update(dt, speed = 0) {
      this.t += dt; this.k += dt;
      this.phase += dt * speed * 1.2;
      const T = { bodyX: 0, bodyY: 0, torsoX: 0.15, torsoY: 0, headX: 0, lL: 0, lR: 0, kL: 0, kR: 0, aLx: 0.1, aLz: -0.25, aRx: -0.3, aRz: 0.25, eL: -0.3, eR: -0.7 };
      const st = this.state;
      T.torsoX += Math.sin(this.t * 1.5) * 0.03;
      if (speed > 0.2) {
        const s = Math.sin(this.phase);
        T.lL = s * 0.45; T.lR = -s * 0.45; T.kL = Math.max(0, -Math.cos(this.phase)) * 0.6; T.kR = Math.max(0, Math.cos(this.phase)) * 0.6;
        T.aLx = -s * 0.4; T.bodyY = Math.abs(Math.cos(this.phase)) * 0.12; T.torsoY = s * 0.12;
      }
      if (st === 'windup') { T.aRx = -2.9; T.eR = -0.6; T.torsoX = -0.25; T.aLx = -0.8; T.headX = -0.3; }
      else if (st === 'slam') { T.aRx = -0.9; T.eR = -0.1; T.torsoX = 0.75; T.headX = 0.2; T.kL = 0.5; T.kR = 0.5; T.bodyY = -0.25; }
      else if (st === 'sweepWind') { T.aRx = -1.4; T.aRz = 1.4; T.torsoY = 0.9; T.eR = -0.3; }
      else if (st === 'sweep') { T.aRx = -1.4; T.aRz = -0.4; T.torsoY = -0.9; T.eR = -0.1; }
      else if (st === 'throw') { T.aLx = -2.6; T.eL = -0.5; T.torsoX = -0.2; }
      else if (st === 'roar') { T.headX = -0.6; T.aLz = -1.2; T.aRz = 1.2; T.torsoX = -0.25; T.aLx = -0.4; T.aRx = -0.6; }
      else if (st === 'stagger') { T.torsoX = 0.6 + Math.sin(this.t * 6) * 0.1; T.headX = 0.4; T.headY = Math.sin(this.t * 3) * 0.4; T.aLz = -0.5; T.aRz = 0.5; T.kL = 0.4; T.kR = 0.4; T.bodyY = -0.2; }
      else if (st === 'down') { T.bodyX = -1.45; T.bodyY = 0.4; T.aLz = -1.3; T.aRz = 1.3; }
      else if (st === 'frozen') return;
      T.headY = T.headY || 0;
      const L = st === 'slam' || st === 'sweep' ? 18 : 7;
      for (const k in T) this.cur[k] = this.cur[k] === undefined ? T[k] : damp(this.cur[k], T[k], L, dt);
      const c = this.cur;
      body.rotation.x = c.bodyX; body.position.y = c.bodyY;
      torso.rotation.set(c.torsoX, c.torsoY, 0);
      head.rotation.set(c.headX, c.headY, 0);
      legs[0].leg.rotation.x = c.lL; legs[1].leg.rotation.x = c.lR;
      legs[0].knee.rotation.x = c.kL; legs[1].knee.rotation.x = c.kR;
      arms[0].sh.rotation.set(c.aLx, 0, c.aLz); arms[1].sh.rotation.set(c.aRx, 0, c.aRz);
      arms[0].elbow.rotation.x = c.eL; arms[1].elbow.rotation.x = c.eR;
    },
  };
  compact(root);
  return { root, anim, club, clubTip, height: 4.2, parts: { head, arms, torso } };
}

// ======================================================================== PIXIE
const pixieWingMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.8, 1.6), transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
export function makePixie() {
  const blue = std('#2f6cf0', { roughness: 0.5, emissive: '#0a2a80', emissiveIntensity: 0.4 });
  const root = new THREE.Group();
  const body = grp(root, 0, 0, 0);
  mesh(capsule(0.06, 0.1), blue, 0, 0, 0, body);
  const head = mesh(new THREE.SphereGeometry(0.085, 12, 10), blue, 0, 0.14, 0.01, body);
  head.scale.set(1, 1.1, 0.95);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.025, 0.14, 5), blue, s * 0.09, 0.2, 0, body);
    ear.rotation.z = -s * 1.0;
    mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.8, 0.4) }), s * 0.032, 0.15, 0.075, body);
    mesh(capsule(0.018, 0.08), blue, s * 0.08, -0.01, 0.02, body).rotation.z = s * 0.8;
    mesh(capsule(0.02, 0.08), blue, s * 0.035, -0.13, 0, body);
  }
  mesh(new THREE.BoxGeometry(0.06, 0.012, 0.01), std('#101020'), 0, 0.105, 0.08, body);
  const wingG = new THREE.CircleGeometry(0.13, 10);
  wingG.scale(0.5, 1, 1);
  wingG.translate(0, 0.12, 0);
  const wings = [];
  for (const s of [-1, 1]) {
    for (const k of [0, 1]) {
      const w = grp(body, s * 0.03, 0.03 - k * 0.05, -0.04);
      const m = new THREE.Mesh(wingG, pixieWingMat);
      m.rotation.z = -s * (0.6 + k * 0.6);
      w.add(m);
      w.userData.s = s;
      wings.push(w);
    }
  }
  root.scale.setScalar(1.6);
  compact(root);
  const anim = {
    t: 0,
    update(dt) {
      this.t += dt;
      for (const w of wings) w.rotation.y = w.userData.s * (0.6 + Math.sin(this.t * 55) * 0.6);
      body.position.y = Math.sin(this.t * 6) * 0.04;
      body.rotation.z = Math.sin(this.t * 3) * 0.2;
    },
    set() {},
  };
  return { root, anim, height: 0.5 };
}

// ======================================================================== DEMENTOR
export function makeDementor() {
  const cloak = new THREE.MeshStandardMaterial({ color: '#0c0b0e', roughness: 1, alphaMap: tatterTex(), alphaTest: 0.5, side: THREE.DoubleSide });
  const uni = { time: { value: 0 } };
  cloak.onBeforeCompile = (sh) => {
    sh.uniforms.time = uni.time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float low = clamp(-position.y / 2.6, 0.0, 1.0);
        transformed.x += sin(time*3.0 + position.y*3.0 + position.z*4.0) * 0.18 * low;
        transformed.z += cos(time*2.6 + position.y*2.5 + position.x*4.0) * 0.18 * low - low*low*0.4;`);
  };
  const root = new THREE.Group();
  const body = grp(root, 0, 0, 0);
  const prof = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const r = t < 0.12 ? 0.22 + t * 1.6 : 0.41 + Math.pow(t - 0.12, 1.2) * 0.75;
    prof.push(new THREE.Vector2(r, -t * 2.7));
  }
  prof.reverse();
  const robeG = new THREE.LatheGeometry(prof, 24);
  // map UVs so the tattered alpha sits at the hem
  const uv = robeG.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i));
  const robeM = mesh(robeG, cloak, 0, 2.6, 0, body);
  // hood
  const hood = grp(body, 0, 2.75, 0.05);
  const hoodM = mesh(new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.75), std('#0a090c', { side: THREE.DoubleSide, roughness: 1 }), 0, 0, 0, hood);
  hoodM.scale.set(1, 1.25, 1.15);
  hoodM.rotation.x = -0.35;
  const voidM = mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, -0.05, 0.12, hood);
  voidM.castShadow = false;
  // skeletal hands
  const handM = std('#5a5a58', { roughness: 0.9 });
  const arms = [-1, 1].map((s) => {
    const sh = grp(body, s * 0.42, 2.3, 0.05);
    const sleeve = mesh(new THREE.CylinderGeometry(0.1, 0.22, 0.9, 10, 1, true), cloak, 0, -0.45, 0, sh);
    const hand = grp(sh, 0, -0.95, 0);
    mesh(capsule(0.035, 0.12), handM, 0, 0, 0, hand);
    for (let f = 0; f < 4; f++) {
      const fg = mesh(new THREE.CylinderGeometry(0.01, 0.006, 0.2, 4), handM, (f - 1.5) * 0.025, -0.15, 0.02, hand);
      fg.rotation.x = 0.4;
    }
    return { sh, hand };
  });
  const anim = {
    t: Math.random() * 10, state: 'idle', reach: 0,
    set(s) { this.state = s; },
    update(dt) {
      this.t += dt;
      uni.time.value = this.t;
      body.position.y = 0.6 + Math.sin(this.t * 1.3) * 0.2;
      body.rotation.z = Math.sin(this.t * 0.7) * 0.05;
      const r = this.state === 'reach' ? 1 : 0;
      this.reach = damp(this.reach, r, 5, dt);
      for (const [i, a] of arms.entries()) {
        a.sh.rotation.x = -0.4 - this.reach * 1.1 + Math.sin(this.t * 1.7 + i) * 0.1;
        a.sh.rotation.z = (i ? 1 : -1) * (0.25 - this.reach * 0.15);
      }
      hood.rotation.x = 0.1 + Math.sin(this.t * 0.9) * 0.08 + this.reach * 0.2;
    },
  };
  return { root, anim, height: 3.2, cloak };
}

// ======================================================================== HIPPOGRIFF
export function makeHippogriff() {
  const coat = std('#6e6e72', { roughness: 0.95 });
  const feather = std('#a8a49c', { roughness: 0.95, flatShading: true });
  const beakM = std('#d8a840', { roughness: 0.4 });
  const root = new THREE.Group();
  const body = grp(root, 0, 1.6, 0);
  const barrel = mesh(capsule(0.48, 1.2, 12), coat, 0, 0, 0, body);
  barrel.rotation.x = Math.PI / 2;
  const chest = mesh(new THREE.SphereGeometry(0.58, 14, 12), feather, 0, 0.1, 0.65, body);
  chest.scale.set(0.95, 1.05, 0.9);
  const neck = grp(body, 0, 0.35, 0.9);
  const neckM = mesh(capsule(0.26, 0.6), feather, 0, 0.35, 0.12, neck);
  neckM.rotation.x = 0.45;
  const head = grp(neck, 0, 0.8, 0.35);
  mesh(new THREE.SphereGeometry(0.26, 14, 12), feather, 0, 0, 0, head).scale.set(0.9, 0.95, 1.15);
  const beak = mesh(new THREE.ConeGeometry(0.1, 0.36, 8), beakM, 0, -0.06, 0.38, head);
  beak.rotation.x = Math.PI / 2 + 0.35;
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: '#e87a10', emissive: '#a04000', emissiveIntensity: 0.6, roughness: 0.2 }), s * 0.16, 0.06, 0.16, head);
    const crest = mesh(new THREE.ConeGeometry(0.05, 0.3, 4), feather, s * 0.06, 0.2, -0.2, head);
    crest.rotation.x = -1.1;
  }
  const legs = [];
  for (const [x, z, front] of [[-0.3, 0.6, 1], [0.3, 0.6, 1], [-0.3, -0.6, 0], [0.3, -0.6, 0]]) {
    const leg = grp(body, x, -0.25, z);
    mesh(capsule(0.12, 0.5), front ? feather : coat, 0, -0.35, 0, leg);
    const knee = grp(leg, 0, -0.7, 0);
    mesh(capsule(0.07, 0.5), front ? beakM : coat, 0, -0.32, 0, knee);
    if (!front) mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8), std('#2a2420'), 0, -0.65, 0, knee);
    else for (let t = -1; t <= 1; t++) mesh(new THREE.ConeGeometry(0.025, 0.14, 4), std('#2a2420'), t * 0.05, -0.66, 0.06, knee).rotation.x = 1.6;
    legs.push({ leg, knee, front });
  }
  const tail = grp(body, 0, 0.15, -1.0);
  mesh(new THREE.ConeGeometry(0.14, 0.9, 8), std('#c8c6c0'), 0, -0.4, -0.1, tail).rotation.x = Math.PI - 0.5;
  // wings
  const wings = [-1, 1].map((s) => {
    const w = grp(body, s * 0.4, 0.4, 0.35);
    const outer = grp(w, s * 1.1, 0, 0);
    for (let i = 0; i < 7; i++) {
      const f = mesh(new THREE.BoxGeometry(0.22, 0.04, 1.0 - i * 0.06), feather, s * (0.15 + i * 0.15), 0, -0.3 - i * 0.03, w);
      f.rotation.y = -s * 0.1 * i;
      const f2 = mesh(new THREE.BoxGeometry(0.2, 0.035, 1.25 - i * 0.12), feather, s * (0.12 + i * 0.16), 0, -0.4 - i * 0.06, outer);
      f2.rotation.y = -s * (0.15 + 0.1 * i);
    }
    w.userData.s = s;
    w.userData.outer = outer;
    return w;
  });
  const saddle = grp(body, 0, 0.5, 0.2); // rider attach
  compact(root);
  const anim = {
    t: 0, state: 'idle', phase: 0, flap: 0,
    set(s) { this.state = s; },
    update(dt, speed = 0, extra = {}) {
      this.t += dt;
      const st = this.state;
      this.phase += dt * speed * 1.6;
      const fly = st === 'fly' || st === 'glide';
      for (const [i, l] of legs.entries()) {
        if (fly) {
          l.leg.rotation.x = damp(l.leg.rotation.x, l.front ? -0.9 : 0.9, 6, dt);
          l.knee.rotation.x = damp(l.knee.rotation.x, l.front ? 1.4 : -0.6, 6, dt);
        } else {
          const ph = this.phase + (i === 0 || i === 3 ? 0 : Math.PI);
          l.leg.rotation.x = Math.sin(ph) * 0.45 * Math.min(1, speed / 3);
          l.knee.rotation.x = Math.max(0, Math.cos(ph)) * 0.5 * Math.min(1, speed / 3) * (l.front ? 1 : -1);
        }
      }
      let wingA = 0.0, outerA = 0.0;
      if (st === 'fly') { const f = Math.sin(this.t * (extra.flapRate || 5)); wingA = f * 0.7; outerA = f * 0.4 + 0.1; }
      else if (st === 'glide') { wingA = 0.05 + Math.sin(this.t * 2) * 0.05; outerA = 0; }
      else if (st === 'spread') { wingA = 0.2 + Math.sin(this.t * 6) * 0.3; outerA = 0.2; }
      else { wingA = -1.2; outerA = -2.2; }
      for (const w of wings) {
        const s = w.userData.s;
        w.rotation.z = damp(w.rotation.z, s * wingA * (st === 'idle' || st === 'bow' || st === 'walk' ? 1 : 1), 10, dt);
        w.rotation.y = damp(w.rotation.y, st === 'idle' || st === 'walk' || st === 'bow' ? -s * 1.3 : 0, 5, dt);
        w.userData.outer.rotation.z = damp(w.userData.outer.rotation.z, s * outerA, 10, dt);
      }
      const bow = st === 'bow' ? 1 : 0;
      body.rotation.x = damp(body.rotation.x, bow * 0.35 + (extra.pitch || 0), 4, dt);
      body.rotation.z = damp(body.rotation.z, extra.bank || 0, 4, dt);
      neck.rotation.x = damp(neck.rotation.x, bow * 1.0 + Math.sin(this.t * 0.8) * 0.06, 4, dt);
      head.rotation.y = Math.sin(this.t * 0.5) * 0.25 * (fly ? 0.2 : 1);
      tail.rotation.x = Math.sin(this.t * 2) * 0.15;
      body.position.y = 1.6 + (fly ? Math.sin(this.t * (extra.flapRate || 5)) * 0.08 : 0) - bow * 0.3;
    },
  };
  return { root, anim, saddle, height: 2.3 };
}

// ======================================================================== PATRONUS STAG
export function makeStag() {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.9, 3.0), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const root = new THREE.Group();
  const body = grp(root, 0, 1.25, 0);
  const torso = mesh(capsule(0.32, 0.9, 10), m, 0, 0, 0, body);
  torso.rotation.x = Math.PI / 2;
  const neck = grp(body, 0, 0.2, 0.55);
  mesh(capsule(0.14, 0.45), m, 0, 0.3, 0.1, neck).rotation.x = 0.5;
  const head = grp(neck, 0, 0.62, 0.25);
  const hm = mesh(new THREE.ConeGeometry(0.13, 0.45, 8), m, 0, 0, 0.12, head);
  hm.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    const a = grp(head, s * 0.08, 0.12, -0.05);
    const main = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.7, 5), m, 0, 0.35, 0, a);
    a.rotation.z = -s * 0.5; a.rotation.x = -0.3;
    for (let i = 0; i < 3; i++) {
      const tine = mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.3, 4), m, 0, 0.2 + i * 0.18, 0.05, a);
      tine.rotation.x = 0.9; tine.position.z = 0.1;
    }
    mesh(new THREE.ConeGeometry(0.05, 0.14, 4), m, s * 0.12, 0.06, -0.08, head).rotation.z = -s * 1.2;
  }
  const legs = [];
  for (const [x, z] of [[-0.18, 0.45], [0.18, 0.45], [-0.18, -0.45], [0.18, -0.45]]) {
    const leg = grp(body, x, -0.15, z);
    mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.6, 6), m, 0, -0.3, 0, leg);
    const knee = grp(leg, 0, -0.6, 0);
    mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.55, 6), m, 0, -0.27, 0, knee);
    legs.push({ leg, knee });
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(0.6, 0.9, 1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }));
  glow.scale.set(5, 4, 1);
  glow.position.y = 1.3;
  root.add(glow);
  root.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  const anim = {
    t: 0,
    update(dt) {
      this.t += dt;
      const ph = this.t * 9;
      legs.forEach((l, i) => {
        const o = i < 2 ? 0 : Math.PI * 0.9;
        l.leg.rotation.x = Math.sin(ph + o) * 0.8;
        l.knee.rotation.x = Math.max(0, Math.sin(ph + o + 1)) * 1.1 * (i < 2 ? -1 : 1);
      });
      body.position.y = 1.25 + Math.abs(Math.sin(ph)) * 0.2;
      body.rotation.x = Math.sin(ph) * 0.08;
    },
    set() {},
    material: m,
  };
  return { root, anim, material: m };
}

// ======================================================================== PROPS
export function makeBroom() {
  const g = new THREE.Group();
  const wood = std('#6a4428', { roughness: 0.6 });
  const handle = mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.9, 8), wood, 0, 0, 0.25, g);
  handle.rotation.x = Math.PI / 2;
  const bristles = mesh(new THREE.ConeGeometry(0.16, 0.7, 12, 1, true), std('#b8925a', { roughness: 1, side: THREE.DoubleSide }), 0, 0, -0.95, g);
  bristles.rotation.x = -Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), std('#c0a050', { metalness: 1, roughness: 0.3 }), 0, 0, -0.62, g);
  return g;
}

export function makeSnitch() {
  const g = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffcf40', metalness: 1, roughness: 0.15, emissive: '#a07010', emissiveIntensity: 0.8 }), 0, 0, 0, g);
  const wm = new THREE.MeshStandardMaterial({ color: '#f8f0d8', metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide, emissive: '#806020', emissiveIntensity: 0.4 });
  const wg = new THREE.PlaneGeometry(0.34, 0.12);
  wg.translate(0.17, 0, 0);
  const wings = [-1, 1].map((s) => {
    const w = grp(g, s * 0.07, 0.02, 0);
    const m = new THREE.Mesh(wg, wm);
    if (s < 0) m.rotation.y = Math.PI;
    w.add(m);
    return w;
  });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(2, 1.6, 0.5), blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(1.4, 1.4, 1);
  g.add(glow);
  g.userData.update = (t) => { wings.forEach((w, i) => (w.rotation.x = Math.sin(t * 60 + i) * 0.9)); };
  return g;
}

export function makeBludger() {
  const g = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshStandardMaterial({ color: '#2a2a2e', metalness: 0.8, roughness: 0.45 }), 0, 0, 0, g);
  for (let i = 0; i < 8; i++) {
    const r = mesh(new THREE.SphereGeometry(0.04, 6, 4), std('#444'), 0, 0, 0, g);
    r.position.setFromSphericalCoords(0.31, Math.acos(1 - 2 * ((i + 0.5) / 8)), i * 2.4);
  }
  return g;
}

export function makeFrog() {
  const g = new THREE.Group();
  const choc = new THREE.MeshStandardMaterial({ color: '#5a3018', roughness: 0.35, metalness: 0.1 });
  const body = mesh(new THREE.SphereGeometry(0.16, 14, 10), choc, 0, 0.12, 0, g);
  body.scale.set(1, 0.7, 1.2);
  const head = mesh(new THREE.SphereGeometry(0.11, 12, 10), choc, 0, 0.17, 0.15, g);
  head.scale.set(1.1, 0.8, 1);
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.04, 8, 6), choc, s * 0.07, 0.25, 0.17, g);
    mesh(new THREE.SphereGeometry(0.015, 6, 4), std('#ffd040', { emissive: '#ffa000', emissiveIntensity: 1 }), s * 0.07, 0.27, 0.2, g);
    const leg = mesh(capsule(0.04, 0.16), choc, s * 0.15, 0.06, -0.08, g);
    leg.rotation.x = 1.2;
    mesh(capsule(0.03, 0.08), choc, s * 0.1, 0.05, 0.16, g).rotation.x = -0.5;
  }
  return g;
}

export function makeSortingHat() {
  const g = new THREE.Group();
  const felt = new THREE.MeshStandardMaterial({ color: '#5a4430', roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.48, 0.0), new THREE.Vector2(0.5, 0.04), new THREE.Vector2(0.24, 0.07)];
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(0.24 * (1 - t) + 0.02 + Math.sin(t * 9) * 0.02, 0.07 + t * 0.7));
  }
  const lg = new THREE.LatheGeometry(pts, 18);
  const p = lg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const bend = Math.max(0, y - 0.45);
    p.setX(i, p.getX(i) + bend * bend * 2.2);
    p.setY(i, y - bend * bend * 0.8);
    p.setZ(i, p.getZ(i) * (1 + Math.sin(y * 30) * 0.04));
  }
  lg.computeVertexNormals();
  const hat = mesh(lg, felt, 0, 0, 0, g);
  const dark = std('#2a1c10', { roughness: 1 });
  for (const s of [-1, 1]) {
    const brow = mesh(new THREE.TorusGeometry(0.06, 0.018, 5, 10, Math.PI), dark, s * 0.08, 0.32, 0.17, g);
    brow.rotation.z = s * 0.3;
  }
  const mouth = mesh(new THREE.BoxGeometry(0.2, 0.025, 0.04), dark, 0, 0.17, 0.2, g);
  mouth.userData.keep = true;
  g.userData.mouth = mouth;
  g.userData.talk = false;
  g.userData.update = (t) => {
    mouth.scale.y = g.userData.talk ? 1 + Math.abs(Math.sin(t * 13)) * 3 : 1;
    hat.rotation.z = Math.sin(t * 1.2) * 0.04;
  };
  return g;
}

export function makeCard() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * 0.3, y = Math.sin(a) * 0.3;
    i ? shape.lineTo(x, y) : shape.moveTo(x, y);
  }
  const card = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }), new THREE.MeshStandardMaterial({ color: '#7a4a22', metalness: 0.5, roughness: 0.3, emissive: '#e0a030', emissiveIntensity: 0.5 }), 0, 0, -0.02, g);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(2, 1.4, 0.5), blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(1.6, 1.6, 1);
  g.add(glow);
  return g;
}

export function makeBean(color) {
  const g = new THREE.Group();
  const b = mesh(capsule(0.06, 0.06), new THREE.MeshStandardMaterial({ color, roughness: 0.25, emissive: color, emissiveIntensity: 0.6 }), 0, 0, 0, g);
  b.rotation.z = 1.2;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(color).multiplyScalar(2), blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(0.8, 0.8, 1);
  g.add(glow);
  return g;
}
