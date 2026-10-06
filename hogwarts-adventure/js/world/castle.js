// Hogwarts castle exterior: courtyard, gatehouse, Great Hall block, wings and towers.
import * as THREE from 'three';
import { Builder, mat4, BOX, instanced } from './builder.js';
import { materials } from './materials.js';
import { PLATEAU } from './terrain.js';
import { bannerTex, textTexture } from '../textures.js';
import { HOUSE_KEYS } from '../state.js';

const Y = PLATEAU;

export function buildCastle(group, col, anchors) {
  const M = materials();
  const B = new Builder();
  const windows = []; // matrices for instanced window planes
  const flags = [];

  const addWindow = (x, y, z, ry, w = 1.4, h = 2.8) => windows.push(mat4(x, y, z, ry, w, h, 1));

  // facade windows on a box face
  function faceWindows(cx, cz, w, d, y0, h, rows, spacing = 4.5, skipCenter = 0) {
    const faces = [
      [0, d / 2, 0, w], [0, -d / 2, Math.PI, w], [w / 2, 0, Math.PI / 2, d], [-w / 2, 0, -Math.PI / 2, d],
    ];
    for (const [ox, oz, ry, len] of faces) {
      const n = Math.max(1, Math.floor((len - 4) / spacing));
      for (let r = 0; r < rows; r++) {
        const wy = y0 + 4 + r * (h - 6) / Math.max(1, rows);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n - 0.5;
          if (skipCenter && Math.abs(t * len) < skipCenter && r === 0) continue;
          const lx = Math.cos(ry) * t * len, lz = -Math.sin(ry) * t * len;
          const nx = Math.sin(ry), nz = Math.cos(ry);
          addWindow(cx + ox + lx + nx * 0.08, wy, cz + oz + lz + nz * 0.08, ry, 1.3, 2.6);
        }
      }
    }
  }

  function merlonsLine(x0, z0, x1, z1, y, size = 0.9) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.floor(len / (size * 2));
    const ry = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      B.add(BOX, M.stone, mat4(x0 + (x1 - x0) * t, y + size * 0.6, z0 + (z1 - z0) * t, ry, size * 0.8, size * 1.2, size));
    }
  }

  function block(cx, cz, w, d, h, opts = {}) {
    const y0 = opts.y0 ?? Y;
    B.box(opts.mat || M.stone, cx, y0 + h / 2, cz, w, h, d);
    // plinth and cornice
    B.box(M.stoneDark, cx, y0 + 0.6, cz, w + 0.6, 1.2, d + 0.6);
    B.box(M.stoneDark, cx, y0 + h - 0.3, cz, w + 0.8, 0.6, d + 0.8);
    if (opts.crenel !== false) {
      const t = y0 + h;
      merlonsLine(cx - w / 2, cz - d / 2, cx + w / 2, cz - d / 2, t);
      merlonsLine(cx - w / 2, cz + d / 2, cx + w / 2, cz + d / 2, t);
      merlonsLine(cx - w / 2, cz - d / 2, cx - w / 2, cz + d / 2, t);
      merlonsLine(cx + w / 2, cz - d / 2, cx + w / 2, cz + d / 2, t);
    }
    if (opts.windows !== false) faceWindows(cx, cz, w, d, y0, h, opts.rows ?? Math.max(1, Math.floor(h / 7)), 4.5, opts.skipCenter || 0);
    if (!opts.noCol) col.box(cx, y0 + h / 2, cz, w / 2, h / 2, d / 2);
  }

  const roofProfile = (r, h, flare = 1.15) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const rr = r * flare * Math.pow(1 - t, 1.25) * (1 + 0.06 * Math.sin(t * Math.PI));
      pts.push(new THREE.Vector2(Math.max(0.001, rr), t * h));
    }
    return new THREE.LatheGeometry(pts, 20);
  };

  function roundTower(x, z, r, h, roofH, opts = {}) {
    const y0 = opts.y0 ?? Y;
    const cyl = new THREE.CylinderGeometry(r, r * 1.08, h, 24, 1, true);
    B.add(cyl, M.stone, mat4(x, y0 + h / 2, z));
    B.add(new THREE.CylinderGeometry(r * 1.12, r * 1.12, 1.4, 24), M.stoneDark, mat4(x, y0 + 0.7, z));
    // corbelled top ring
    B.add(new THREE.CylinderGeometry(r * 1.18, r * 0.98, 1.6, 24), M.stoneDark, mat4(x, y0 + h - 0.8, z));
    const top = y0 + h;
    if (roofH > 0) {
      B.add(roofProfile(r * 1.12, roofH), M.roof, mat4(x, top, z));
      // finial
      B.add(new THREE.SphereGeometry(0.35, 10, 8), M.gold, mat4(x, top + roofH + 0.1, z));
      B.add(new THREE.CylinderGeometry(0.05, 0.08, 2.4, 6), M.iron, mat4(x, top + roofH + 1.1, z));
      if (opts.flag) flags.push({ x, y: top + roofH + 1.6, z, house: opts.flag });
    } else {
      B.add(new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.4, 24), M.stone, mat4(x, top, z));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        B.add(BOX, M.stone, mat4(x + Math.cos(a) * r * 1.1, top + 0.9, z + Math.sin(a) * r * 1.1, -a, 0.6, 1.2, 1.1));
      }
    }
    // windows spiralling up
    const levels = Math.floor((h - 6) / 6);
    for (let l = 0; l < levels; l++) {
      for (let k = 0; k < 3; k++) {
        const a = l * 1.1 + (k / 3) * Math.PI * 2 + (opts.phase || 0);
        const wx = x + Math.sin(a) * (r + 0.06), wz = z + Math.cos(a) * (r + 0.06);
        addWindow(wx, y0 + 6 + l * 6, wz, a, 1.0, 2.0);
      }
    }
    if (!opts.noCol) col.cyl(x, z, r * 1.08, y0 - 2, top + roofH);
  }

  function squareTower(x, z, w, h, roofH, opts = {}) {
    const y0 = opts.y0 ?? Y;
    block(x, z, w, w, h, { crenel: roofH <= 0, rows: Math.floor(h / 8), y0, mat: opts.mat });
    if (roofH > 0) {
      const g = new THREE.ConeGeometry(w * 0.82, roofH, 4, 1, true);
      g.rotateY(Math.PI / 4);
      B.add(g, M.roof, mat4(x, y0 + h + roofH / 2, z));
      B.add(new THREE.SphereGeometry(0.4, 10, 8), M.gold, mat4(x, y0 + h + roofH + 0.2, z));
      if (opts.flag) flags.push({ x, y: y0 + h + roofH + 1.2, z, house: opts.flag });
    }
  }

  function gableRoof(cx, cz, w, len, y, rise, mat = M.roof) {
    const slope = Math.atan2(rise, w / 2);
    const sl = Math.hypot(rise, w / 2);
    B.box(mat, cx - w / 4, y + rise / 2, cz, sl + 0.6, 0.5, len + 1.2, 0, 0, slope);
    B.box(mat, cx + w / 4, y + rise / 2, cz, sl + 0.6, 0.5, len + 1.2, 0, 0, -slope);
    // gable ends
    const tri = new THREE.BufferGeometry();
    const v = [-w / 2, 0, 0, w / 2, 0, 0, 0, rise, 0];
    tri.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    tri.computeVertexNormals();
    const triG = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise)]), { depth: 0.8, bevelEnabled: false });
    B.add(triG, M.stone, mat4(cx, y, cz - len / 2 - 0.4));
    B.add(triG, M.stone, mat4(cx, y, cz + len / 2 - 0.4));
    // ridge
    B.box(M.stoneDark, cx, y + rise + 0.1, cz, 0.5, 0.4, len + 1.4);
  }

  // ---------------------------------------------------------------- courtyard
  B.box(M.floor, 0, Y + 0.02, 0, 64, 0.1, 48);
  // side walls with arcades
  for (const sx of [-1, 1]) {
    const x = sx * 32;
    B.box(M.stone, x, Y + 3.5, 0, 1.6, 7, 48);
    col.box(x, Y + 3.5, 0, 0.8, 4, 24);
    merlonsLine(x, -24, x, 24, Y + 7);
    B.box(M.roof, x - sx * 2.2, Y + 5.6, 0, 4.6, 0.3, 48, 0, 0, sx * 0.35);
    for (let z = -20; z <= 20; z += 5) {
      B.add(new THREE.CylinderGeometry(0.32, 0.38, 4.6, 10), M.stoneWarm, mat4(x - sx * 4, Y + 2.3, z));
      col.cyl(x - sx * 4, z, 0.4, Y, Y + 5);
    }
  }
  // fountain
  B.add(new THREE.CylinderGeometry(4.2, 4.5, 0.9, 32), M.stoneWarm, mat4(0, Y + 0.45, 0));
  B.add(new THREE.CylinderGeometry(1, 1.3, 2.6, 12), M.stoneWarm, mat4(0, Y + 1.3, 0));
  B.add(new THREE.CylinderGeometry(1.9, 0.6, 0.5, 20), M.stoneWarm, mat4(0, Y + 2.7, 0));
  B.add(new THREE.SphereGeometry(0.45, 12, 10), M.gold, mat4(0, Y + 3.2, 0));
  col.cyl(0, 0, 4.4, Y - 1, Y + 0.9);
  const fountainWater = new THREE.Mesh(new THREE.CircleGeometry(3.95, 32), new THREE.MeshStandardMaterial({ color: 0x1a4a5a, roughness: 0.05, metalness: 0.4, emissive: 0x0a3040, emissiveIntensity: 0.6 }));
  fountainWater.rotation.x = -Math.PI / 2;
  fountainWater.position.set(0, Y + 0.82, 0);
  group.add(fountainWater);
  // braziers
  for (const [x, z] of [[-10, 10], [10, 10], [-10, -16], [10, -16]]) {
    B.add(new THREE.CylinderGeometry(0.18, 0.28, 2.2, 8), M.iron, mat4(x, Y + 1.1, z));
    B.add(new THREE.CylinderGeometry(0.7, 0.3, 0.6, 12, 1, true), M.iron, mat4(x, Y + 2.4, z));
    col.cyl(x, z, 0.4, Y, Y + 2.6);
    anchors.push({ pos: new THREE.Vector3(x, Y + 3, z), color: 0xff9944, intensity: 40, distance: 16, flicker: true, night: true, flame: true });
  }
  // benches
  for (const [x, z, r] of [[-20, 4, Math.PI / 2], [20, 4, -Math.PI / 2], [-20, -10, Math.PI / 2], [20, -10, -Math.PI / 2]]) {
    B.box(M.wood, x, Y + 0.55, z, 3, 0.15, 0.7, r);
    B.box(M.stoneDark, x + Math.cos(r) * 1.2, Y + 0.25, z - Math.sin(r) * 1.2, 0.3, 0.5, 0.6, r);
    B.box(M.stoneDark, x - Math.cos(r) * 1.2, Y + 0.25, z + Math.sin(r) * 1.2, 0.3, 0.5, 0.6, r);
  }

  // ---------------------------------------------------------------- gatehouse
  squareTower(-9.5, 25, 6, 15, 7, { flag: 'gryffindor' });
  squareTower(9.5, 25, 6, 15, 7, { flag: 'hufflepuff' });
  B.box(M.stone, 0, Y + 11.5, 25, 13, 5, 4);
  B.add(new THREE.TorusGeometry(3.3, 0.6, 8, 20, Math.PI), M.stoneDark, mat4(0, Y + 8.4, 25, 0, 1, 1, 1));
  merlonsLine(-6.5, 25, 6.5, 25, Y + 14);
  for (const sx of [-1, 1]) {
    B.box(M.stone, sx * 22.5, Y + 3.5, 24.5, 19, 7, 1.5);
    col.box(sx * 22.5, Y + 3.5, 24.5, 9.5, 4, 0.8);
    merlonsLine(sx * 13, 24.5, sx * 32, 24.5, Y + 7);
    // winged boar statues
    B.box(M.stoneDark, sx * 4.6, Y + 1, 29, 1.2, 2, 1.2);
    B.add(new THREE.SphereGeometry(0.8, 10, 8), M.stoneWarm, mat4(sx * 4.6, Y + 2.6, 29, 0, 1.2, 0.8, 0.9));
    B.add(new THREE.ConeGeometry(0.5, 1.6, 4), M.stoneWarm, mat4(sx * 4.6 + sx * 0.6, Y + 3.2, 29, 0, 0.3, 1, 1, 0, sx * 0.9));
    col.box(sx * 4.6, Y + 1.5, 29, 0.7, 1.5, 0.7);
  }
  // corner towers of the courtyard
  roundTower(-32, 24, 3.2, 11, 6, { flag: 'ravenclaw' });
  roundTower(32, 24, 3.2, 11, 6, { flag: 'slytherin' });

  // ---------------------------------------------------------------- main facade
  block(0, -30, 92, 12, 24, { rows: 3, skipCenter: 6 });
  // grand doors
  B.add(new THREE.TorusGeometry(3.6, 0.8, 8, 24, Math.PI), M.stoneWarm, mat4(0, Y + 6.5, -23.8));
  B.box(M.stoneWarm, -3.6, Y + 3.25, -23.8, 1.6, 6.5, 1.2);
  B.box(M.stoneWarm, 3.6, Y + 3.25, -23.8, 1.6, 6.5, 1.2);
  const doorG = new THREE.ExtrudeGeometry((() => {
    const s = new THREE.Shape();
    s.moveTo(-2.9, 0); s.lineTo(2.9, 0); s.lineTo(2.9, 6.5); s.absarc(0, 6.5, 2.9, 0, Math.PI, false); s.lineTo(-2.9, 0);
    return s;
  })(), { depth: 0.3, bevelEnabled: false });
  B.add(doorG, M.woodDark, mat4(0, Y, -23.95));
  for (const sx of [-1, 1]) B.box(M.iron, sx * 1.4, Y + 4, -23.6, 0.5, 0.5, 0.15);
  B.box(M.stoneDark, 0, Y + 0.25, -22.6, 10, 0.5, 2.5);
  // rose window
  const rose = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffaa55, emissiveIntensity: 1.5, emissiveMap: textTexture([{ text: '✺', font: '420px serif', color: '#fff', y: 280 }], { w: 512, h: 512, bg: '#211' }).tex }));
  rose.position.set(0, Y + 16, -23.9);
  group.add(rose);
  group.userData.rose = rose;
  roundTower(-16, -23.5, 4.5, 34, 12, { flag: 'gryffindor', phase: 0.4 });
  roundTower(16, -23.5, 4.5, 34, 12, { flag: 'slytherin', phase: 1.2 });

  // ---------------------------------------------------------------- Great Hall
  block(0, -66, 26, 60, 22, { crenel: false, windows: false });
  for (let i = 0; i < 7; i++) {
    const z = -40 - i * 8.6;
    for (const sx of [-1, 1]) {
      addWindow(sx * 13.1, Y + 12, z, sx * Math.PI / 2, 2.4, 9);
      B.box(M.stoneDark, sx * 13.9, Y + 9, z + 4.3, 1.6, 18, 1.4);
      B.add(new THREE.ConeGeometry(0.7, 2.4, 4), M.stoneDark, mat4(sx * 13.9, Y + 19.2, z + 4.3, Math.PI / 4));
    }
  }
  gableRoof(0, -66, 27, 60, Y + 22, 13);
  for (let i = 0; i < 4; i++) {
    const z = -44 - i * 14;
    B.add(new THREE.ConeGeometry(0.6, 5, 6), M.roof, mat4(0, Y + 37.5, z));
  }

  // ---------------------------------------------------------------- wings
  block(-58, -57, 24, 62, 20, { rows: 2 });
  block(58, -55, 24, 58, 18, { rows: 2 });
  gableRoof(-58, -57, 22, 60, Y + 20, 7);
  gableRoof(58, -55, 22, 56, Y + 18, 7);
  roundTower(-70, -26, 6, 34, 14, { flag: 'gryffindor', phase: 2 });
  roundTower(-72, -88, 7, 46, 18, { flag: 'gryffindor', phase: 0.7 });
  roundTower(70, -26, 6, 32, 12, { flag: 'hufflepuff', phase: 1.7 });
  roundTower(70, -84, 6, 38, 14, { flag: 'hufflepuff' });
  roundTower(-46, -38, 3.5, 30, 9, { phase: 0.3 });
  roundTower(46, -38, 3.5, 30, 9, { phase: 2.3 });

  // ---------------------------------------------------------------- back range and keep
  block(0, -108, 92, 24, 26, { rows: 3 });
  squareTower(0, -108, 18, 46, 16, { flag: 'ravenclaw' });
  // clock face
  const clock = textTexture([], { w: 256, h: 256 });
  {
    const x = clock.ctx;
    x.fillStyle = '#e8dcc0'; x.beginPath(); x.arc(128, 128, 120, 0, 7); x.fill();
    x.strokeStyle = '#2a2016'; x.lineWidth = 8; x.stroke();
    x.font = 'bold 26px Cinzel, serif'; x.fillStyle = '#2a2016'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    R.forEach((r, i) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; x.fillText(r, 128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); });
    clock.tex.needsUpdate = true;
  }
  const clockMesh = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32), new THREE.MeshStandardMaterial({ map: clock.tex, emissive: 0xffe0a0, emissiveMap: clock.tex, emissiveIntensity: 0.2, roughness: 0.6 }));
  clockMesh.position.set(0, Y + 38, -98.9);
  group.add(clockMesh);
  const hands = new THREE.Group();
  hands.position.set(0, Y + 38, -98.7);
  const hh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 0.1), M.iron); hh.position.y = 1.1;
  const mh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 0.1), M.iron); mh.position.y = 1.7;
  const hG = new THREE.Group(); hG.add(hh); const mG = new THREE.Group(); mG.add(mh);
  hands.add(hG, mG);
  group.add(hands);
  group.userData.clock = { hG, mG };

  roundTower(-40, -128, 6, 52, 16, { flag: 'ravenclaw', phase: 0.2 });
  roundTower(40, -128, 6.5, 72, 16, { flag: 'slytherin', phase: 1.4 }); // Astronomy Tower
  roundTower(-78, -116, 5, 36, 12, { phase: 0.9 });
  roundTower(78, -110, 5, 30, 0, { phase: 2.9 });
  block(-60, -116, 34, 18, 18, { rows: 2 });
  block(60, -112, 32, 18, 16, { rows: 2 });
  // flying buttress bridge to the Astronomy Tower
  B.box(M.stone, 40, Y + 30, -118, 3, 1.5, 14);

  // ---------------------------------------------------------------- build
  B.build(group);
  const winMesh = instanced(new THREE.PlaneGeometry(1, 1), M.window, windows, { cast: false, receive: false });
  group.add(winMesh);

  // house flags
  const flagMeshes = flags.map((f) => {
    const g = new THREE.PlaneGeometry(3.2, 1.8, 10, 4);
    g.translate(1.6, -0.9, 0);
    const mat = new THREE.MeshStandardMaterial({ map: bannerTex(f.house), side: THREE.DoubleSide, roughness: 0.9 });
    // banner texture is portrait; rotate UVs to fit landscape flag
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, 1 - v, u * 0.8 + 0.2); }
    const m = new THREE.Mesh(g, mat);
    m.position.set(f.x, f.y, f.z);
    m.rotation.y = 0.6;
    m.castShadow = true;
    m.userData.base = Float32Array.from(g.attributes.position.array);
    group.add(m);
    return m;
  });

  return {
    update(t) {
      for (const m of flagMeshes) {
        const p = m.geometry.attributes.position, b = m.userData.base;
        for (let i = 0; i < p.count; i++) {
          const x = b[i * 3];
          p.setZ(i, Math.sin(t * 4 + x * 1.6 + m.position.x) * 0.18 * x);
        }
        p.needsUpdate = true;
        m.geometry.computeVertexNormals();
      }
      const d = new Date();
      const hrs = d.getHours() % 12 + d.getMinutes() / 60;
      group.userData.clock.hG.rotation.z = -(hrs / 12) * Math.PI * 2;
      group.userData.clock.mG.rotation.z = -(d.getMinutes() / 60) * Math.PI * 2;
    },
  };
}

export { HOUSE_KEYS };
