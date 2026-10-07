// Castle interiors, each built at its own far-away offset and shown one at a time:
// Great Hall, Grand Staircase, Charms Corridor and the Dungeons.
import * as THREE from 'three';
import { G, HOUSES, HOUSE_KEYS } from '../state.js';
import { Colliders } from '../collision.js';
import { Builder, mat4, BOX, instanced } from './builder.js';
import { materials } from './materials.js';
import { ceilingMaterial } from '../sky.js';
import { bannerTex, stainedGlassTex, portraitTex, shelfTex, flameSprite, glowSprite, textTexture, drawCrest } from '../textures.js';
import { mulberry32 } from '../util.js';

export const OFFSETS = {
  greatHall: new THREE.Vector3(2000, 0, 0),
  staircase: new THREE.Vector3(3000, 0, 0),
  corridor: new THREE.Vector3(4000, 0, 0),
  dungeon: new THREE.Vector3(5000, 0, 0),
};

// Wraps a Colliders so interior code can use local coordinates.
function localCol(col, o) {
  return {
    box: (x, y, z, hx, hy, hz, r, opts) => col.box(x + o.x, y + o.y, z + o.z, hx, hy, hz, r, opts),
    aabb: (x0, y0, z0, x1, y1, z1, opts) => col.aabb(x0 + o.x, y0 + o.y, z0 + o.z, x1 + o.x, y1 + o.y, z1 + o.z, opts),
    cyl: (x, z, r, y0, y1, opts) => col.cyl(x + o.x, z + o.z, r, y0 + o.y, y1 + o.y, opts),
    ramp: (x, z, hx, hz, rot, y0, y1, opts) => col.ramp(x + o.x, z + o.z, hx, hz, rot, y0 + o.y, y1 + o.y, opts),
  };
}

function makeZone(name, label, opts) {
  const o = OFFSETS[name];
  const group = new THREE.Group();
  group.name = name;
  group.position.copy(o);
  const worldGroup = new THREE.Group(); // world-space children (props, NPCs)
  worldGroup.name = name + '-world';
  const col = new Colliders();
  col.terrain = () => o.y;
  const zone = {
    name, label, outdoor: false, group, world: worldGroup, colliders: col, C: localCol(col, o), anchors: [], portals: [], props: [], flames: [],
    W: (x, y, z) => new THREE.Vector3(x + o.x, y + o.y, z + o.z),
    offset: o,
    ...opts,
  };
  return zone;
}

// Room shell: floor, ceiling, four walls with door gaps. doors: [{side:'n'|'s'|'e'|'w', at, w, h}]
function room(B, C, M, x0, z0, x1, z1, h, opts = {}) {
  const wallMat = opts.wall || M.stone;
  const t = 1;
  const y0 = opts.y0 || 0;
  B.box(opts.floor || M.floor, (x0 + x1) / 2, y0 - 0.25, (z0 + z1) / 2, x1 - x0 + 2, 0.5, z1 - z0 + 2);
  if (opts.ceiling !== false) B.box(opts.ceilMat || M.stoneDark, (x0 + x1) / 2, y0 + h + 0.25, (z0 + z1) / 2, x1 - x0 + 2, 0.5, z1 - z0 + 2);
  const doors = opts.doors || [];
  const wall = (side, a0, a1, fixed) => {
    const ds = doors.filter((d) => d.side === side).sort((p, q) => p.at - q.at);
    let cur = a0;
    const seg = (s0, s1, yb = y0, yt = y0 + h) => {
      if (s1 - s0 < 0.01) return;
      const mid = (s0 + s1) / 2, len = s1 - s0, hh = yt - yb;
      if (side === 'n' || side === 's') {
        B.box(wallMat, mid, yb + hh / 2, fixed, len, hh, t);
        C.box(mid, yb + hh / 2, fixed, len / 2, hh / 2, t / 2);
      } else {
        B.box(wallMat, fixed, yb + hh / 2, mid, t, hh, len);
        C.box(fixed, yb + hh / 2, mid, t / 2, hh / 2, len / 2);
      }
    };
    for (const d of ds) {
      seg(cur, d.at - d.w / 2);
      seg(d.at - d.w / 2, d.at + d.w / 2, y0 + (d.h || 4), y0 + h);
      cur = d.at + d.w / 2;
      if (d.cam) {
        // portal doorways stop the camera without blocking the player
        const hh = (d.h || 4) / 2;
        if (side === 'n' || side === 's') C.box(d.at, y0 + hh, fixed, d.w / 2, hh, 0.3, 0, { noWall: true, noFloor: true });
        else C.box(fixed, y0 + hh, d.at, 0.3, hh, d.w / 2, 0, { noWall: true, noFloor: true });
      }
    }
    seg(cur, a1);
  };
  wall('n', x0, x1, z0);
  wall('s', x0, x1, z1);
  wall('w', z0, z1, x0);
  wall('e', z0, z1, x1);
}

function doorFrame(B, M, x, z, ry, w = 3, h = 4, y = 0, dark = true) {
  B.add(new THREE.TorusGeometry(w / 2 + 0.2, 0.3, 6, 16, Math.PI), M.stoneWarm, mat4(x, y + h - w / 2, z, ry));
  B.box(M.stoneWarm, x + Math.cos(ry) * (w / 2 + 0.2), y + (h - w / 2) / 2, z - Math.sin(ry) * (w / 2 + 0.2), 0.6, h - w / 2, 0.8, ry);
  B.box(M.stoneWarm, x - Math.cos(ry) * (w / 2 + 0.2), y + (h - w / 2) / 2, z + Math.sin(ry) * (w / 2 + 0.2), 0.6, h - w / 2, 0.8, ry);
  if (dark) {
    // glowing doorway to hint a passage
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
    B.add(new THREE.ShapeGeometry(s), DOORGLOW, mat4(x, y, z, ry));
  }
}
const DOORGLOW = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.22, 0.13), side: THREE.DoubleSide });
DOORGLOW.userData.noShadow = true;

function torch(zone, B, M, x, y, z, ry, color = 0xff9a40, flameColor) {
  B.box(M.iron, x, y - 0.35, z, 0.12, 0.7, 0.12, ry);
  B.add(new THREE.CylinderGeometry(0.16, 0.08, 0.3, 8), M.iron, mat4(x, y, z));
  const fm = new THREE.SpriteMaterial({ map: flameSprite(), color: flameColor || new THREE.Color(3.2, 1.8, 0.7), blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const sp = new THREE.Sprite(fm);
  sp.position.set(x, y + 0.42, z);
  sp.scale.set(0.42, 0.8, 1);
  zone.group.add(sp);
  zone.flames.push(sp);
  zone.anchors.push({ pos: zone.W(x, y + 0.5, z), color, intensity: 22, distance: 11, flicker: true });
}

function animateFlames(zone, t) {
  zone.flames.forEach((f, i) => {
    const s = 0.85 + Math.sin(t * 17 + i * 3.1) * 0.08 + Math.sin(t * 9 + i) * 0.07;
    f.scale.set(0.42 * s, 0.8 * (2 - s), 1);
  });
}

function prop(zone, kind, x, y, z, M) {
  let mesh;
  if (kind === 'barrel') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 14), M.wood);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.04, 6, 18), M.iron);
    hoop.rotation.x = Math.PI / 2; hoop.position.y = 0.3; mesh.add(hoop);
    const h2 = hoop.clone(); h2.position.y = -0.3; mesh.add(h2);
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), M.woodDark);
  }
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.position.copy(zone.W(x, y + 0.55, z));
  zone.world.add(mesh);
  zone.props.push({ mesh, kind, home: mesh.position.clone(), radius: 0.55 });
}

// ============================================================== GREAT HALL
export function buildGreatHall(Q) {
  const M = materials();
  const zone = makeZone('greatHall', 'The Great Hall', { fog: { color: 0x1a1420, density: 0.012 } });
  const { C, W } = zone;
  const B = new Builder();
  const L = 13, F = 40, H = 20;
  room(B, C, M, -L, -F, L, F, H, {
    ceiling: false, wall: M.stoneWarm,
    doors: [{ side: 's', at: 0, w: 5, h: 7, cam: true }, { side: 'e', at: -30, w: 3, h: 4.5, cam: true }],
  });
  doorFrame(B, M, 0, F - 0.4, 0, 5, 7);
  doorFrame(B, M, L - 0.4, -30, Math.PI / 2, 3, 4.5);
  // enchanted ceiling
  const ceilMat = ceilingMaterial();
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * F), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H;
  zone.group.add(ceil);
  // hammer-beam trusses fading into the sky
  for (let z = -36; z <= 36; z += 9) {
    B.box(M.woodDark, -L + 1.2, H - 2, z, 2.4, 0.6, 0.6, 0, 0, 0.5);
    B.box(M.woodDark, L - 1.2, H - 2, z, 2.4, 0.6, 0.6, 0, 0, -0.5);
    B.box(M.woodDark, -L + 0.6, H - 5, z, 0.6, 6, 0.7);
    B.box(M.woodDark, L - 0.6, H - 5, z, 0.6, 6, 0.7);
  }
  // windows down both long walls
  const win = new THREE.MeshStandardMaterial({ map: stainedGlassTex(), emissive: 0xffffff, emissiveMap: stainedGlassTex(), emissiveIntensity: 0.9, roughness: 0.3, side: THREE.DoubleSide });
  win.userData.noShadow = true;
  for (let z = -32; z <= 32; z += 9.5) {
    for (const sx of [-1, 1]) {
      B.add(new THREE.PlaneGeometry(3.2, 7.5), win, mat4(sx * (L - 0.52), 10, z, -sx * Math.PI / 2));
      B.box(M.stoneDark, sx * (L - 0.6), 5.9, z, 0.8, 0.4, 3.8);
    }
  }
  // dais and head table
  B.box(M.wood, 0, 0.4, -35, 2 * L, 0.8, 10);
  C.box(0, 0.4, -35, L, 0.4, 5);
  B.box(M.woodDark, 0, 1.6, -34, 16, 0.15, 1.6);
  for (const sx of [-7.6, 7.6]) B.box(M.woodDark, sx, 1.2, -34, 0.3, 0.8, 1.4);
  C.box(0, 1.2, -34, 8, 0.8, 0.8);
  // headmistress' chair
  B.box(M.gold, 0, 2.6, -36.3, 1.6, 3.6, 0.3);
  B.box(M.woodDark, 0, 1.3, -35.6, 1.4, 0.2, 1.2);
  // big stained window behind the dais
  B.add(new THREE.PlaneGeometry(9, 16), win, mat4(0, 11, -F + 0.55));
  // house tables + benches
  const tables = new THREE.Group();
  const TB = new Builder();
  const tableCols = [];
  const goldPlate = M.gold;
  HOUSE_KEYS.forEach((house, i) => {
    const x = -9 + i * 6;
    TB.box(M.wood, x, 1.0, 5, 2.2, 0.14, 54);
    for (let z = -20; z <= 30; z += 6.5) {
      TB.box(M.woodDark, x - 0.8, 0.5, z, 0.16, 1, 0.16);
      TB.box(M.woodDark, x + 0.8, 0.5, z, 0.16, 1, 0.16);
    }
    for (const sx of [-1, 1]) {
      TB.box(M.woodDark, x + sx * 1.75, 0.5, 5, 0.6, 0.1, 54);
      TB.box(M.woodDark, x + sx * 1.75, 0.25, 5, 0.12, 0.5, 52);
    }
    for (let z = -20; z <= 30; z += 1.6) {
      for (const sx of [-1, 1]) {
        TB.add(new THREE.CylinderGeometry(0.22, 0.18, 0.03, 14), goldPlate, mat4(x + sx * 0.6, 1.1, z));
        if ((z * 3 + i) % 3 < 1) TB.add(new THREE.CylinderGeometry(0.06, 0.05, 0.22, 8), goldPlate, mat4(x + sx * 0.3, 1.2, z + 0.4));
      }
    }
    tableCols.push(C.box(x, 0.6, 5, 2.1, 0.6, 27));
    // banners
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 7.2), new THREE.MeshStandardMaterial({ map: bannerTex(house), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 }));
    banner.position.set(x, 13.5, 0);
    banner.rotation.y = Math.PI / 2 * 0;
    banner.userData.sway = i;
    tables.add(banner);
    // wall banners too
    const wb = banner.clone();
    wb.position.set(i < 2 ? -L + 0.6 : L - 0.6, 13, -14 + (i % 2) * 28);
    wb.rotation.y = i < 2 ? Math.PI / 2 : -Math.PI / 2;
    zone.group.add(wb);
  });
  TB.build(tables);
  zone.group.add(tables);
  zone.tables = tables;
  zone.tableCols = tableCols;

  // duelling stage (shown only during Duelling Club)
  const stage = new THREE.Group();
  const SB = new Builder();
  SB.box(M.woodDark, 0, 0.6, 4, 7, 1.2, 30);
  SB.box(M.gold, 0, 1.22, 4, 7.2, 0.05, 0.3);
  for (let z = -10; z <= 18; z += 4) for (const sx of [-1, 1]) SB.add(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), M.gold, mat4(sx * 3.7, 1.8, z));
  SB.box(M.gold, -3.7, 2.4, 4, 0.08, 0.08, 28);
  SB.box(M.gold, 3.7, 2.4, 4, 0.08, 0.08, 28);
  const carpet = new THREE.MeshStandardMaterial({ color: 0x5a1520, roughness: 0.95 });
  SB.box(carpet, 0, 1.21, 4, 5.5, 0.03, 29);
  SB.build(stage);
  stage.visible = false;
  zone.group.add(stage);
  zone.stage = stage;
  zone.stageCols = [
    C.box(0, 0.6, 4, 3.5, 0.6, 15, 0, { disabled: true }),
    C.box(-3.85, 2, 4, 0.15, 2, 15, 0, { disabled: true, noFloor: true }),
    C.box(3.85, 2, 4, 0.15, 2, 15, 0, { disabled: true, noFloor: true }),
  ];
  zone.stageCols.forEach((c) => (c.disabled = true));
  zone.setDuelMode = (on) => {
    tables.visible = !on;
    stage.visible = on;
    tableCols.forEach((c) => (c.disabled = on));
    zone.stageCols.forEach((c) => (c.disabled = !on));
  };

  // floating candles (bob in the vertex shader)
  const nC = Math.floor(320 * (Q.particles + 0.2));
  const rnd = mulberry32(77);
  const cand = [];
  const flamePos = new Float32Array(nC * 3);
  for (let i = 0; i < nC; i++) {
    const x = (rnd() - 0.5) * 2 * (L - 1.5), z = (rnd() - 0.5) * 2 * (F - 3), y = 9 + rnd() * 6;
    const h = 0.35 + rnd() * 0.3;
    cand.push(mat4(x, y, z, 0, 1, h / 0.5, 1));
    flamePos.set([x, y + h / 2 + 0.12, z], i * 3);
  }
  const bobUniform = { value: 0 };
  const candleMat = M.candle.clone();
  candleMat.onBeforeCompile = (sh) => {
    sh.uniforms.time = bobUniform;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        transformed.y += sin(time*0.8 + ip.x*1.3 + ip.z*0.7) * 0.25 / max(0.6, instanceMatrix[1][1]);`);
  };
  const candles = instanced(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), candleMat, cand, { cast: false, receive: false });
  zone.group.add(candles);
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(flamePos, 3));
  const flameMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: bobUniform, map: { value: glowSprite() } },
    vertexShader: `uniform float time; varying float vF;
      void main(){ vec3 p = position; p.y += sin(time*0.8 + p.x*1.3 + p.z*0.7) * 0.25;
        vF = 0.85 + 0.15*sin(time*20.0 + p.x*40.0);
        vec4 mv = modelViewMatrix * vec4(p,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 260.0 * vF / -mv.z; }`,
    fragmentShader: `uniform sampler2D map; varying float vF;
      void main(){ vec2 uv = gl_PointCoord; uv.y = uv.y*0.8 + 0.1; float a = texture2D(map, uv).a; gl_FragColor = vec4(vec3(3.0,1.7,0.6)*vF*a, a); }`,
  });
  const flames = new THREE.Points(fg, flameMat);
  flames.frustumCulled = false;
  zone.group.add(flames);
  for (let i = 0; i < 6; i++) zone.anchors.push({ pos: W((i % 2 ? 1 : -1) * 6, 12, -30 + Math.floor(i / 2) * 26), color: 0xffb070, intensity: 120, distance: 32, flicker: true });

  // torches on the walls
  for (let z = -28; z <= 30; z += 14) for (const sx of [-1, 1]) torch(zone, B, M, sx * (L - 0.7), 5, z + 4.5, 0);

  // house-point hourglasses on the dais
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.0, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
  const hourglasses = {};
  HOUSE_KEYS.forEach((house, i) => {
    const x = -10.5 + i * 7 * (i < 2 ? 1 : 1) + (i >= 2 ? 0 : 0);
    const hx = [-11, -8.4, 8.4, 11][i];
    const z = -38;
    B.add(new THREE.CylinderGeometry(1.1, 1.2, 0.5, 16), M.gold, mat4(hx, 1.05, z));
    B.add(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 16), M.gold, mat4(hx, 7.4, z));
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      B.add(new THREE.CylinderGeometry(0.06, 0.06, 6.2, 6), M.gold, mat4(hx + Math.cos(a) * 1.05, 4.2, z + Math.sin(a) * 1.05));
    }
    const bulbTop = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 14, 0, Math.PI * 2, 0, Math.PI), glass);
    bulbTop.scale.set(1, 1.4, 1); bulbTop.position.set(hx, 5.7, z);
    const bulbBot = bulbTop.clone(); bulbBot.position.y = 2.7;
    zone.group.add(bulbTop, bulbBot);
    const gemMat = new THREE.MeshStandardMaterial({ color: HOUSES[house].c1, emissive: HOUSES[house].c1, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.3 });
    const fill = new THREE.Mesh(new THREE.SphereGeometry(0.88, 18, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gemMat);
    fill.scale.set(1, 1.3, 1);
    fill.position.set(hx, 2.7, z);
    const fillTop = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1, 18), gemMat);
    fillTop.position.set(hx, 2.7, z);
    zone.group.add(fill, fillTop);
    // plaque
    const plaque = textTexture([{ text: HOUSES[house].name, font: 'bold 40px Cinzel, serif', color: house === 'hufflepuff' ? HOUSES[house].c1 : HOUSES[house].c2, y: 60 }, { text: '0', font: 'bold 70px Cinzel, serif', color: '#fff', y: 150 }], { w: 256, h: 200, bg: '#1a1210' });
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7), new THREE.MeshStandardMaterial({ map: plaque.tex, emissive: 0xffffff, emissiveMap: plaque.tex, emissiveIntensity: 0.35 }));
    pm.position.set(hx, 8.8, z + 0.3);
    zone.group.add(pm);
    hourglasses[house] = { fill, fillTop, plaque, x: hx, house };
    C.cyl(hx, z, 1.3, 0, 8);
  });
  zone.setHousePoints = (pts) => {
    const max = Math.max(500, ...Object.values(pts)) * 1.1;
    for (const k of HOUSE_KEYS) {
      const hg = hourglasses[k];
      const f = Math.min(1, pts[k] / max);
      hg.fillTop.scale.y = 0.02 + f * 1.3;
      hg.fillTop.position.y = 2.7 + hg.fillTop.scale.y / 2;
      const x = hg.plaque.ctx;
      x.fillStyle = '#1a1210'; x.fillRect(0, 100, 256, 100);
      x.font = 'bold 70px Cinzel, serif'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(String(pts[k]), 128, 150);
      hg.plaque.tex.needsUpdate = true;
    }
  };

  // sorting stool & hat stand point
  B.add(new THREE.CylinderGeometry(0.4, 0.45, 0.8, 12), M.woodDark, mat4(0, 0.4 + 0.8, -28.6));
  zone.stoolPos = W(0, 1.6, -28.6);
  zone.spots = { stage: W(0, 0, -29), duelA: W(0, 1.2, 14), duelB: W(0, 1.2, -6), lecternPos: W(0, 0.8, -32) };

  B.build(zone.group);
  zone.dirLight = { dir: new THREE.Vector3(0.4, 1, 0.3), color: 0xffd2a0, intensity: 0.8 };
  zone.hemi = { sky: 0x8a6e58, ground: 0x2a1c14, intensity: 0.75 };
  zone.exposure = 1.1;
  zone.env = 0.25;
  zone.spawn = { pos: W(0, 0, 34), yaw: Math.PI };
  zone.portals.push({ pos: W(0, 0, F - 1), r: 2.6, to: 'grounds', at: 'hallDoor', label: 'Go outside' });
  zone.portals.push({ pos: W(L - 1, 0, -30), r: 1.8, to: 'staircase', at: 'fromHall', label: 'Grand Staircase' });
  zone.entries = {
    fromGrounds: { pos: W(0, 0, 35), yaw: Math.PI },
    fromStairs: { pos: W(L - 3, 0, -30), yaw: -Math.PI / 2 },
  };
  zone.update = (dt, t) => {
    bobUniform.value = t;
    ceilMat.uniforms.time.value = t;
    ceilMat.uniforms.night.value = Math.max(0.55, G.night ?? 1);
    animateFlames(zone, t);
    tables.children.forEach((c) => { if (c.userData.sway != null) c.rotation.y = Math.sin(t * 0.6 + c.userData.sway) * 0.08; });
  };
  return zone;
}

// ============================================================== GRAND STAIRCASE
export function buildStaircase(Q) {
  const M = materials();
  const zone = makeZone('staircase', 'Grand Staircase', { fog: { color: 0x15121a, density: 0.015 } });
  const { C, W } = zone;
  const B = new Builder();
  const S = 14, H = 30;
  room(B, C, M, -S, -S, S, S, H, {
    doors: [{ side: 'w', at: 0, w: 3, h: 4.5, cam: true }, { side: 'e', at: 6, w: 3, h: 4, cam: true }],
  });
  doorFrame(B, M, -S + 0.4, 0, Math.PI / 2, 3, 4.5);
  doorFrame(B, M, S - 0.4, 6, -Math.PI / 2, 3, 4);
  // landing A (y=8) along north wall with a door to the Charms Corridor
  const landA = 8, landB = 16;
  B.box(M.stoneDark, 0, landA - 0.3, -S + 1.8, 2 * S, 0.6, 3.6);
  C.box(0, landA - 0.3, -S + 1.8, S, 0.3, 1.8);
  B.box(M.stoneDark, 0, landB - 0.3, S - 1.8, 2 * S, 0.6, 3.6);
  C.box(0, landB - 0.3, S - 1.8, S, 0.3, 1.8);
  // the north wall door at landing A is drawn as a frame on the wall
  doorFrame(B, M, 0, -S + 0.55, 0, 3, 4, landA);
  doorFrame(B, M, -6, S - 0.55, Math.PI, 3, 4, landB);
  // banisters on landing edges, with gaps where flights arrive
  const ban = (x0, x1, z, y) => {
    const len = x1 - x0;
    if (len <= 0) return;
    B.box(M.woodDark, (x0 + x1) / 2, y + 1, z, len, 0.15, 0.2);
    for (let x = x0; x <= x1; x += 1.2) B.box(M.woodDark, x, y + 0.5, z, 0.1, 1, 0.1);
    C.box((x0 + x1) / 2, y + 0.6, z, len / 2, 0.6, 0.12, 0, { noFloor: true });
  };
  ban(-S, -1.8, -S + 3.6, landA); ban(1.8, 8.3, -S + 3.6, landA); ban(11.7, S, -S + 3.6, landA);
  ban(-S, 8.2, S - 3.6, landB); ban(11.8, S, S - 3.6, landB);
  // portraits
  let pi = 0;
  for (const [x, y, z, ry] of [[-S + 0.55, 4, -7, Math.PI / 2], [-S + 0.55, 4, 8, Math.PI / 2], [S - 0.55, 4, -6, -Math.PI / 2], [-S + 0.55, 12, -4, Math.PI / 2], [S - 0.55, 12, 2, -Math.PI / 2], [-S + 0.55, 20, 4, Math.PI / 2], [S - 0.55, 20, -6, -Math.PI / 2], [-8, 12, -S + 0.55, 0], [8, 21, S - 0.55, Math.PI], [S - 0.55, 26, 6, -Math.PI / 2], [-S + 0.55, 26, -8, Math.PI / 2], [0, 26, -S + 0.55, 0]]) {
    const w = 2 + (pi % 3) * 0.4, h = w * 1.33;
    B.add(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: portraitTex(pi), roughness: 0.6 }), mat4(x + Math.sin(ry) * 0.05, y, z + Math.cos(ry) * 0.05, ry));
    B.box(M.gold, x, y, z, ry === 0 || ry === Math.PI ? w + 0.3 : 0.1, h + 0.3, ry === 0 || ry === Math.PI ? 0.1 : w + 0.3);
    pi++;
  }
  // chandelier
  B.add(new THREE.TorusGeometry(3, 0.12, 8, 32), M.gold, mat4(0, H - 6, 0, 0, 1, 1, 1, Math.PI / 2));
  B.add(new THREE.CylinderGeometry(0.04, 0.04, 6, 4), M.iron, mat4(0, H - 3, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const fm = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameSprite(), color: new THREE.Color(3, 1.7, 0.7), blending: THREE.AdditiveBlending, depthWrite: false }));
    fm.position.set(Math.cos(a) * 3, H - 5.6, Math.sin(a) * 3);
    fm.scale.set(0.3, 0.55, 1);
    zone.group.add(fm);
    zone.flames.push(fm);
  }
  zone.anchors.push({ pos: W(0, H - 6, 0), color: 0xffb070, intensity: 90, distance: 30, flicker: true });
  torch(zone, B, M, -S + 0.7, 3.5, -4, 0);
  torch(zone, B, M, S - 0.7, 3.5, 0, 0);
  torch(zone, B, M, -3, landA + 3, -S + 0.7, 0);
  torch(zone, B, M, 3, landA + 3, -S + 0.7, 0);
  torch(zone, B, M, -10, landB + 3, S - 0.7, 0);
  torch(zone, B, M, 4, landB + 3, S - 0.7, 0);

  B.build(zone.group);

  // moving staircases
  const flights = [];
  const makeFlight = (pivot, len, rise, angles, period, offset) => {
    const g = new THREE.Group();
    g.position.copy(pivot);
    const FB = new Builder();
    const steps = Math.ceil(len / 0.5);
    for (let i = 0; i < steps; i++) {
      const z = -(i + 0.5) * (len / steps);
      const y = (i + 0.5) * (rise / steps);
      FB.box(M.stoneWarm, 0, y - 0.25, z, 3, 0.5 + 0.1, len / steps + 0.02);
    }
    FB.box(M.woodDark, -1.55, rise / 2 + 1, -len / 2, 0.15, 0.15, Math.hypot(len, rise), 0, Math.atan2(rise, len));
    FB.box(M.woodDark, 1.55, rise / 2 + 1, -len / 2, 0.15, 0.15, Math.hypot(len, rise), 0, Math.atan2(rise, len));
    FB.box(M.stoneDark, 0, rise / 2 - 0.9, -len / 2, 3.2, 0.6, Math.hypot(len, rise), 0, Math.atan2(rise, len));
    FB.build(g);
    zone.group.add(g);
    const wp = W(pivot.x, pivot.y, pivot.z);
    // collider: a ramp centred along the flight, rotated with it
    const ramp = zone.colliders.ramp(0, 0, 1.5, len / 2, 0, wp.y, wp.y + rise, { dynamic: true });
    const sideL = zone.colliders.box(0, 0, 0, 0.1, 1, len / 2, 0, { dynamic: true, noFloor: true });
    const sideR = zone.colliders.box(0, 0, 0, 0.1, 1, len / 2, 0, { dynamic: true, noFloor: true });
    const f = { g, pivot: wp, len, rise, angles, period, offset, angle: angles[0], ramp, sideL, sideR, prevAngle: angles[0] };
    flights.push(f);
    return f;
  };
  // flight 1: ground floor up to landing A (north)
  makeFlight(new THREE.Vector3(0, 0, 9), 19.6, landA, [Math.PI * 2, Math.PI * 2 - 0.6], 14, 0);
  // flight 2: landing A up to landing B (south)
  makeFlight(new THREE.Vector3(10, landA, -S + 3.4), 20.8, landB - landA, [Math.PI, Math.PI - 0.5], 16, 5);
  zone.flights = flights;

  const updateFlightCols = (f) => {
    // ramp centre sits halfway along the flight's local -z
    const a = f.angle;
    const cx = f.pivot.x - Math.sin(a) * f.len / 2, cz = f.pivot.z - Math.cos(a) * f.len / 2;
    f.ramp.x = cx; f.ramp.z = cz;
    zone.colliders.setRot(f.ramp, a + Math.PI);
    f.ramp.y0 = f.pivot.y; f.ramp.y1 = f.pivot.y + f.rise;
    for (const [s, side] of [[-1, f.sideL], [1, f.sideR]]) {
      side.x = cx + Math.cos(a) * 1.6 * s; side.z = cz - Math.sin(a) * 1.6 * s;
      side.y = f.pivot.y + f.rise / 2 + 0.5; side.hy = f.rise / 2 + 1.2;
      zone.colliders.setRot(side, a);
    }
  };
  flights.forEach(updateFlightCols);

  zone.spawn = { pos: W(-S + 3, 0, 0), yaw: Math.PI / 2 };
  zone.portals.push({ pos: W(-S + 1, 0, 0), r: 1.8, to: 'greatHall', at: 'fromStairs', label: 'Great Hall' });
  zone.portals.push({ pos: W(S - 1, 0, 6), r: 1.8, to: 'dungeon', at: 'fromStairs', label: 'Dungeons' });
  zone.portals.push({ pos: W(0, landA, -S + 1.2), r: 1.6, to: 'corridor', at: 'fromStairs', label: 'Charms Corridor' });
  zone.portals.push({ pos: W(-6, landB, S - 1.2), r: 1.6, to: 'tower', at: 'fromStairs', label: "Headmistress's Tower" });
  zone.entries = {
    fromHall: { pos: W(-S + 3, 0, 0), yaw: Math.PI / 2 },
    fromDungeon: { pos: W(S - 3, 0, 6), yaw: -Math.PI / 2 },
    fromCorridor: { pos: W(0, landA, -S + 3), yaw: 0 },
    fromTower: { pos: W(-6, landB, S - 3), yaw: Math.PI },
  };
  zone.dirLight = { dir: new THREE.Vector3(-0.3, 1, 0.2), color: 0xa8b8ff, intensity: 0.5 };
  zone.hemi = { sky: 0x6a5a68, ground: 0x2a2018, intensity: 0.7 };
  zone.exposure = 1.15;
  zone.env = 0.2;
  zone.update = (dt, t) => {
    animateFlames(zone, t);
    for (const f of flights) {
      const ph = ((t + f.offset) % f.period) / f.period;
      // hold connected, swing away, hold, swing back
      let k;
      if (ph < 0.5) k = 0; else if (ph < 0.6) k = (ph - 0.5) / 0.1; else if (ph < 0.85) k = 1; else k = 1 - (ph - 0.85) / 0.15;
      k = k * k * (3 - 2 * k);
      f.prevAngle = f.angle;
      f.angle = f.angles[0] + (f.angles[1] - f.angles[0]) * k;
      f.g.rotation.y = f.angle;
      updateFlightCols(f);
      f.moving = Math.abs(f.angle - f.prevAngle) > 1e-5;
      // carry the player when standing on a moving flight
      const p = G.player;
      if (f.moving && p && p.support === f.ramp) {
        const da = f.angle - f.prevAngle;
        const dx = p.pos.x - f.pivot.x, dz = p.pos.z - f.pivot.z;
        const c = Math.cos(da), s = Math.sin(da);
        p.pos.x = f.pivot.x + dx * c + dz * s;
        p.pos.z = f.pivot.z - dx * s + dz * c;
        p.yaw += da;
        if (!f.creak) { f.creak = true; G.audio?.sfx('stairs'); }
      } else if (!f.moving) f.creak = false;
    }
  };
  return zone;
}

// ============================================================== CORRIDOR + CHARMS
export function buildCorridor(Q) {
  const M = materials();
  const zone = makeZone('corridor', 'Charms Corridor', { fog: { color: 0x12121c, density: 0.02 } });
  const { C, W } = zone;
  const B = new Builder();
  const w = 4.5, len = 78, h = 7;
  room(B, C, M, -w, -len, w, 0, h, { doors: [{ side: 's', at: 0, w: 3, h: 4.5, cam: true }, { side: 'n', at: 0, w: 4, h: 5 }], ceilMat: M.stoneDark });
  doorFrame(B, M, 0, -0.4, 0, 3, 4.5);
  // vaulted ribs
  for (let z = -3; z > -len; z -= 6) {
    B.add(new THREE.TorusGeometry(w - 0.1, 0.25, 6, 18, Math.PI), M.stoneWarm, mat4(0, h - w + 0.4, z, 0, 1, 0.8, 1));
    for (const sx of [-1, 1]) B.box(M.stoneWarm, sx * (w - 0.35), (h - w + 0.4) / 2, z, 0.7, h - w + 0.4, 0.7);
  }
  // windows w/ moonbeams on the west wall, torches on the east
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.38, 0.7), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  beamMat.userData.noShadow = true;
  const winMat = new THREE.MeshStandardMaterial({ color: 0x223, emissive: 0x8899ff, emissiveIntensity: 0.9, roughness: 0.2 });
  for (let z = -6; z > -len + 3; z -= 12) {
    B.add(new THREE.PlaneGeometry(1.6, 3.2), winMat, mat4(-w + 0.52, 4, z, Math.PI / 2));

    torch(zone, B, M, w - 0.6, 3.6, z - 6, 0);
  }
  // suits of armour and tapestries
  const armour = (x, z, ry) => {
    B.box(M.stoneDark, x, 0.25, z, 1, 0.5, 1);
    B.add(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 10), M.silver, mat4(x, 1.6, z));
    B.add(new THREE.CylinderGeometry(0.11, 0.1, 0.8, 8), M.silver, mat4(x - 0.15, 0.85, z));
    B.add(new THREE.CylinderGeometry(0.11, 0.1, 0.8, 8), M.silver, mat4(x + 0.15, 0.85, z));
    B.add(new THREE.SphereGeometry(0.2, 12, 10), M.silver, mat4(x, 2.25, z));
    B.add(new THREE.ConeGeometry(0.1, 0.4, 6), M.gold, mat4(x, 2.55, z));
    B.add(new THREE.CylinderGeometry(0.08, 0.07, 0.8, 8), M.silver, mat4(x - 0.38, 1.6, z));
    B.add(new THREE.CylinderGeometry(0.08, 0.07, 0.8, 8), M.silver, mat4(x + 0.38, 1.6, z));
    B.add(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), M.iron, mat4(x + 0.45, 1.3, z));
    B.add(new THREE.ConeGeometry(0.1, 0.4, 4), M.silver, mat4(x + 0.45, 2.5, z));
    C.box(x, 1.2, z, 0.5, 1.2, 0.5);
  };
  for (let z = -12; z > -len + 6; z -= 12) armour(w - 1.1, z + 3, -Math.PI / 2);
  HOUSE_KEYS.forEach((house, i) => {
    B.add(new THREE.PlaneGeometry(2, 4), new THREE.MeshStandardMaterial({ map: bannerTex(house), transparent: true, alphaTest: 0.3, roughness: 0.9 }), mat4(-w + 0.55, 4.5, -18 - i * 14, Math.PI / 2));
  });
  // crates/barrels for Leviosa practice
  prop(zone, 'barrel', -3, 0, -22, M);
  prop(zone, 'crate', -3.2, 0, -34, M);
  prop(zone, 'barrel', 3, 0, -46, M);
  prop(zone, 'crate', -3, 0, -58, M);

  // Charms classroom at the far end
  const R0 = -len, R1 = -len - 26;
  room(B, C, M, -13, R1, 13, R0, 9, { doors: [{ side: 's', at: 0, w: 4, h: 5 }], wall: M.stoneWarm, floor: M.wood });
  // desks
  for (let r = 0; r < 3; r++) {
    for (const sx of [-1, 1]) {
      const x = sx * 5, z = R0 - 8 - r * 4;
      B.box(M.wood, x, 1, z, 5, 0.12, 1.4);
      B.box(M.woodDark, x - 2.2, 0.5, z, 0.12, 1, 1.2);
      B.box(M.woodDark, x + 2.2, 0.5, z, 0.12, 1, 1.2);
      B.box(M.woodDark, x, 0.5, z + 1.2, 5, 0.1, 0.5);
      C.box(x, 0.5, z, 2.5, 0.55, 0.7);
      B.add(new THREE.BoxGeometry(0.5, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: 0x6a1a1a }), mat4(x - 1, 1.1, z));
    }
  }
  // lectern stack of books + blackboard
  for (let i = 0; i < 6; i++) B.box(new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i * 0.15, 0.5, 0.3) }), -4, 0.2 + i * 0.3, R1 + 4, 1.4 - i * 0.05, 0.28, 1, i * 0.2);
  C.box(-4, 1, R1 + 4, 0.8, 1, 0.6);
  const board = textTexture([{ text: 'Wingardium Leviosa', font: 'italic 54px "EB Garamond", serif', color: '#f0ece0', y: 70 }, { text: 'swish  &  flick', font: 'italic 40px "EB Garamond", serif', color: '#d8d0b8', y: 150 }], { w: 512, h: 256, bg: '#1e2b22' });
  B.add(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ map: board.tex, roughness: 0.9 }), mat4(0, 4.5, R1 + 0.56));
  B.box(M.woodDark, 0, 4.5, R1 + 0.5, 8.4, 4.4, 0.1);
  zone.board = board;
  // bookshelves
  const shelfMat = new THREE.MeshStandardMaterial({ map: shelfTex(), roughness: 0.85 });
  for (const sx of [-1, 1]) {
    B.add(new THREE.PlaneGeometry(10, 6), shelfMat, mat4(sx * 12.45, 3.2, R1 + 13, -sx * Math.PI / 2));
    B.box(M.woodDark, sx * 12.6, 3.2, R1 + 13, 0.3, 6.2, 10.2);
  }
  // floating books
  const books = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.5, 0.3) }));
    m.position.set((Math.random() - 0.5) * 18, 4 + Math.random() * 3, R1 + 4 + Math.random() * 18);
    m.userData.s = Math.random() * 10;
    zone.group.add(m);
    books.push(m);
  }
  torch(zone, B, M, -12.4, 4, R0 - 6, 0);
  torch(zone, B, M, 12.4, 4, R0 - 6, 0);
  torch(zone, B, M, -12.4, 4, R1 + 6, 0);
  torch(zone, B, M, 12.4, 4, R1 + 6, 0);
  zone.anchors.push({ pos: W(0, 7, R1 + 12), color: 0xffd6a0, intensity: 70, distance: 26 });
  B.build(zone.group);

  zone.spots = { lectern: W(0, 0, R1 + 7.5), professor: W(0, 0, R1 + 4), classCenter: W(0, 0, R1 + 13), pixieSpawn: W(0, 2.5, -40) };
  zone.spawn = { pos: W(0, 0, -3), yaw: Math.PI };
  zone.portals.push({ pos: W(0, 0, -0.8), r: 1.8, to: 'staircase', at: 'fromCorridor', label: 'Grand Staircase' });
  zone.entries = { fromStairs: { pos: W(0, 0, -5), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(-1, 1.2, 0.1), color: 0x8090d0, intensity: 0.7 };
  zone.hemi = { sky: 0x4a4a62, ground: 0x221a14, intensity: 0.7 };
  zone.exposure = 1.2;
  zone.env = 0.2;
  zone.update = (dt, t) => {
    animateFlames(zone, t);
    for (const b of books) {
      b.position.y += Math.sin(t + b.userData.s) * 0.004;
      b.rotation.y += dt * 0.2;
    }
  };
  return zone;
}

// ============================================================== DUNGEONS + POTIONS
export function buildDungeon(Q) {
  const M = materials();
  const zone = makeZone('dungeon', 'The Dungeons', { fog: { color: 0x0b1410, density: 0.025 } });
  const { C, W } = zone;
  const B = new Builder();
  // entry passage
  room(B, C, M, -3, -10, 3, 0, 5, { doors: [{ side: 's', at: 0, w: 3, h: 4, cam: true }, { side: 'n', at: 0, w: 3, h: 4 }], wall: M.stoneDark });
  doorFrame(B, M, 0, -0.4, 0, 3, 4);
  // potions classroom
  room(B, C, M, -13, -38, 13, -10, 8, { doors: [{ side: 's', at: 0, w: 3, h: 4 }, { side: 'n', at: 0, w: 4, h: 5 }], wall: M.stoneDark });
  // vaulted pillars
  for (const [x, z] of [[-6, -18], [6, -18], [-6, -30], [6, -30]]) {
    B.add(new THREE.CylinderGeometry(0.6, 0.7, 8, 10), M.stone, mat4(x, 4, z));
    C.cyl(x, z, 0.7, 0, 8);
  }
  // shelves of glowing jars
  const jarCols = [0x40ff90, 0xff60c0, 0x60c0ff, 0xffd040, 0xa060ff];
  const jarMats = jarCols.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7, roughness: 0.2, transparent: true, opacity: 0.85 }));
  for (const sx of [-1, 1]) {
    for (let r = 0; r < 4; r++) {
      B.box(M.woodDark, sx * 12.2, 1 + r * 1.4, -24, 1.2, 0.1, 22);
      for (let k = 0; k < 18; k++) {
        const z = -34 + k * 1.2 + ((r * 7) % 3) * 0.2;
        const hh = 0.3 + ((k * 13 + r * 7) % 5) * 0.08;
        B.add(new THREE.CylinderGeometry(0.16, 0.18, hh, 8), jarMats[(k + r * 2) % 5], mat4(sx * 12.2, 1.05 + r * 1.4 + hh / 2, z));
      }
    }
  }
  // cauldrons on tables
  const cauldronMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.7, roughness: 0.5 });
  const cauldronG = new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75);
  const brewMat = new THREE.MeshStandardMaterial({ color: 0x30ff80, emissive: 0x20c060, emissiveIntensity: 1.4, roughness: 0.2 });
  for (let r = 0; r < 2; r++) {
    for (const sx of [-1, 1]) {
      const x = sx * 5.5, z = -16 - r * 9;
      B.box(M.woodDark, x, 0.9, z, 4, 0.15, 2);
      B.box(M.woodDark, x, 0.45, z, 3.6, 0.9, 1.6);
      C.box(x, 0.5, z, 2, 0.6, 1);
      for (const dx of [-1, 1]) {
        B.add(cauldronG, cauldronMat, mat4(x + dx, 1.5, z));
        B.add(new THREE.CircleGeometry(0.55, 16), brewMat, mat4(x + dx, 1.62, z, 0, 1, 1, 1, -Math.PI / 2));
      }
    }
  }
  // the player's cauldron (front, used by the Potions minigame)
  const big = new THREE.Group();
  const bc = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16, 0, Math.PI * 2, Math.PI * 0.22, Math.PI * 0.78), cauldronMat);
  bc.castShadow = true;
  const brew = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), new THREE.MeshStandardMaterial({ color: 0x3a6a3a, emissive: 0x204020, emissiveIntensity: 1, roughness: 0.15 }));
  brew.rotation.x = -Math.PI / 2; brew.position.y = 0.62;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.08, 8, 32), cauldronMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.85;
  big.add(bc, brew, rim);
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.9, 6), M.iron);
    const a = (i / 3) * Math.PI * 2;
    leg.position.set(Math.cos(a) * 0.8, -0.8, Math.sin(a) * 0.8);
    big.add(leg);
  }
  big.position.set(0, 1.25, -33);
  zone.group.add(big);
  C.cyl(0, -33, 1.2, 0, 1.6);
  zone.cauldron = { group: big, brew, pos: W(0, 1.9, -33) };
  zone.anchors.push({ pos: W(0, 1.2, -33), color: 0xff7a30, intensity: 0, distance: 8, cauldronFire: true });

  // green-flamed torches
  const green = new THREE.Color(0.6, 3, 1.2);
  for (const [x, z] of [[-12.4, -14], [12.4, -14], [-12.4, -34], [12.4, -34]]) torch(zone, B, M, x, 3.4, z, 0, 0x50ff90, green);
  torch(zone, B, M, -2.4, 3, -5, 0);
  zone.anchors.push({ pos: W(0, 6, -24), color: 0x60ffa0, intensity: 40, distance: 24 });

  // troll hall (beyond the classroom)
  const T0 = -38, T1 = -82;
  room(B, C, M, -20, T1, 20, T0, 12, { doors: [{ side: 's', at: 0, w: 4, h: 5 }], wall: M.stoneDark });
  for (const [x, z] of [[-11, -50], [11, -50], [-11, -70], [11, -70]]) {
    B.add(new THREE.CylinderGeometry(1, 1.2, 12, 12), M.stone, mat4(x, 6, z));
    C.cyl(x, z, 1.2, 0, 12);
  }
  for (const [x, z] of [[-17, -44], [17, -46], [-17, -78], [17, -76], [0, -79]]) torch(zone, B, M, x + (x > 0 ? 2.4 : x < 0 ? -2.4 : 0), 4, z, 0);
  prop(zone, 'barrel', -6, 0, -45, M);
  prop(zone, 'barrel', 7, 0, -60, M);
  prop(zone, 'crate', -15, 0, -62, M);
  prop(zone, 'barrel', 15, 0, -68, M);
  prop(zone, 'crate', -4, 0, -76, M);
  prop(zone, 'barrel', 4, 0, -52, M);
  // bones & rubble
  const bone = new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.8 });
  const rnd = mulberry32(31);
  for (let i = 0; i < 24; i++) B.add(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), bone, mat4(-18 + rnd() * 36, 0.05, T1 + 2 + rnd() * 40, rnd() * 6, 1, 1, 1, Math.PI / 2));
  for (let i = 0; i < 14; i++) B.add(new THREE.DodecahedronGeometry(0.4 + rnd() * 0.5, 0), M.stoneDark, mat4(-19 + rnd() * 38, 0.2, T1 + 1 + rnd() * 42, rnd() * 6));
  B.build(zone.group);

  zone.spots = { cauldron: W(0, 0, -30.4), professor: W(-3.5, 0, -35.5), trollSpawn: W(0, 0, -70), hallCenter: W(0, 0, -60) };
  zone.spawn = { pos: W(0, 0, -3), yaw: Math.PI };
  zone.portals.push({ pos: W(0, 0, -0.8), r: 1.8, to: 'staircase', at: 'fromDungeon', label: 'Grand Staircase' });
  zone.entries = { fromStairs: { pos: W(0, 0, -5), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(0.2, 1, 0.5), color: 0x70ffb0, intensity: 0.35 };
  zone.hemi = { sky: 0x2c4a3a, ground: 0x140e0a, intensity: 0.75 };
  zone.exposure = 1.25;
  zone.env = 0.18;
  zone.update = (dt, t) => {
    animateFlames(zone, t);
    brewMat.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.3;
  };
  return zone;
}

// ============================================================== HEADMISTRESS' TOWER
export function buildTower(Q) {
  const M = materials();
  OFFSETS.tower = new THREE.Vector3(6000, 0, 0);
  const zone = makeZone('tower', "Headmistress's Tower", { fog: { color: 0x141026, density: 0.02 } });
  const { C, W } = zone;
  const B = new Builder();
  // circular study
  const R = 11, H = 12;
  const n = 16;
  B.add(new THREE.CylinderGeometry(R + 1, R + 1, 0.5, 32), M.wood, mat4(0, -0.25, 0));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.sin(a) * R, z = Math.cos(a) * R;
    const isDoor = i === 0;
    const segW = 2 * R * Math.sin(Math.PI / n) + 0.2;
    if (isDoor) {
      B.box(M.stoneWarm, x, H - 1.5, z, segW, 3, 1, a);
      C.box(x, H - 1.5, z, segW / 2, 1.5, 0.5, a);
      doorFrame(B, M, x * 0.96, z * 0.96, a, 3, 4.5);
      C.box(x, 2.25, z, segW / 2, 2.25, 0.3, a, { noWall: true, noFloor: true });
      continue;
    }
    B.box(i % 2 ? M.stoneWarm : M.plaster, x, H / 2, z, segW, H, 1, a);
    C.box(x, H / 2, z, segW / 2, H / 2, 0.5, a);
    if (i % 2 === 0) {
      B.add(new THREE.PlaneGeometry(1.4, 3.2), new THREE.MeshStandardMaterial({ color: 0x223, emissive: 0x9aa8ff, emissiveIntensity: 1.3 }), mat4(x * 0.95, 6, z * 0.95, a + Math.PI));
    } else {
      B.add(new THREE.PlaneGeometry(1.8, 2.4), new THREE.MeshStandardMaterial({ map: portraitTex(i + 20), roughness: 0.6 }), mat4(x * 0.95, 4, z * 0.95, a + Math.PI));
    }
  }
  B.add(new THREE.ConeGeometry(R + 1.5, 8, 32, 1, true), M.woodDark, mat4(0, H + 4, 0));
  // desk, perch, pensieve-like basin, instruments
  B.box(M.woodDark, 0, 1, -6, 4, 0.15, 2);
  B.box(M.woodDark, 0, 0.5, -6, 3.6, 1, 1.6);
  C.box(0, 0.6, -6, 2, 0.6, 1);
  B.add(new THREE.CylinderGeometry(0.8, 0.4, 1.2, 16), M.stoneWarm, mat4(-6, 0.6, -3));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.5, 2.2) }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(-6, 1.22, -3);
  zone.group.add(pool);
  C.cyl(-6, -3, 0.9, 0, 1.2);
  const instruments = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Mesh(new THREE.TorusGeometry(0.3 + i * 0.05, 0.03, 6, 20), M.silver);
    g.position.set(5 + (i % 2), 1.6 + i * 0.25, -4 + i * 0.4);
    zone.group.add(g);
    instruments.push(g);
  }
  zone.anchors.push({ pos: W(0, 8, 0), color: 0xb0a0ff, intensity: 60, distance: 24 });
  zone.anchors.push({ pos: W(-6, 2, -3), color: 0x99ccff, intensity: 15, distance: 6 });
  torch(zone, B, M, -9.5, 4, 4, 0);
  torch(zone, B, M, 9.5, 4, 4, 0);
  B.build(zone.group);
  zone.spots = { headmistress: W(0, 0, -3.5), practice: W(0, 0, 2) };
  zone.spawn = { pos: W(0, 0, 8), yaw: Math.PI };
  zone.portals.push({ pos: W(0, 0, R - 0.8), r: 1.6, to: 'staircase', at: 'fromTower', label: 'Grand Staircase' });
  zone.entries = { fromStairs: { pos: W(0, 0, 6.5), yaw: Math.PI } };
  zone.dirLight = { dir: new THREE.Vector3(0.3, 1, -0.4), color: 0xb0b8ff, intensity: 0.7 };
  zone.hemi = { sky: 0x6a5a8a, ground: 0x2a2018, intensity: 0.8 };
  zone.exposure = 1.15;
  zone.env = 0.3;
  zone.update = (dt, t) => {
    animateFlames(zone, t);
    instruments.forEach((g, i) => { g.rotation.x += dt * (0.5 + i * 0.3); g.rotation.y += dt * 0.4; });
  };
  return zone;
}
