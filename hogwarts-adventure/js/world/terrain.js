// Grounds heightfield, splat-mapped terrain mesh, lake water and grass.
import * as THREE from 'three';
import { fbm, noise2, smoothstep, lerp, clamp } from '../util.js';
import * as T from '../textures.js';

export const PLATEAU = 12;
export const WATER_Y = -0.8;
export const SPOTS = {
  spawn: new THREE.Vector3(0, PLATEAU, 14),
  pitch: new THREE.Vector3(-125, 0, 150),
  paddock: new THREE.Vector3(118, 0, 105),
  hut: new THREE.Vector3(96, 0, 82),
  clearing: new THREE.Vector3(250, 0, 40),
  lakeShore: new THREE.Vector3(-110, 0, 70),
};

function sdRoundBox(x, z, cx, cz, hx, hz, r) {
  const qx = Math.abs(x - cx) - hx + r, qz = Math.abs(z - cz) - hz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
}
function flatten(h, target, d, inner, outer) {
  return lerp(target, h, smoothstep(inner, outer, d));
}

// Analytic height of the grounds.
export function groundHeight(x, z) {
  let h = (fbm(x * 0.006 + 10, z * 0.006 - 4, 4) - 0.5) * 16 + 1.5;
  h += (noise2(x * 0.05, z * 0.05) - 0.5) * 0.8;
  // forest gets lumpier
  const forest = smoothstep(100, 160, x);
  h += forest * (fbm(x * 0.02, z * 0.02, 3) - 0.5) * 8;
  // lake basins
  const l1 = Math.hypot((x + 205) / 1.15, z + 40) - 105;
  const l2 = Math.hypot(x + 60, (z + 265) / 1.2) - 115;
  const lake = Math.min(l1, l2);
  const shore = smoothstep(-28, 6, lake);
  h = lerp(-9 + noise2(x * 0.03, z * 0.03) * 2, h, shore);
  // flats
  h = flatten(h, 0.3, Math.hypot(x - SPOTS.pitch.x, (z - SPOTS.pitch.z) * 1.4) - 82, 0, 24);
  h = flatten(h, 0.6, Math.hypot(x - 110, z - 96) - 34, 0, 20);
  h = flatten(h, 0.5, Math.hypot(x - SPOTS.clearing.x, z - SPOTS.clearing.z) - 30, 0, 14);
  // castle plateau with cliffs
  const d = sdRoundBox(x, z, 0, -60, 88, 88, 18);
  const cliff = smoothstep(0, 9, d);
  const base = h;
  h = lerp(PLATEAU, base, cliff);
  if (d > 0 && d < 12) h += (noise2(x * 0.2, z * 0.2) - 0.5) * 3 * (1 - smoothstep(6, 12, d)) * smoothstep(0, 2, d);
  // road from the courtyard gate down to the grounds
  if (z > 10 && z < 100) {
    const rh = lerp(PLATEAU, base, smoothstep(24, 88, z));
    const w = 1 - smoothstep(8, 16, Math.abs(x));
    h = lerp(h, rh, w * smoothstep(10, 22, z));
  }
  // distant mountains enclosing the valley
  const r = Math.hypot(x, z + 40);
  h += smoothstep(330, 520, r) * (60 + fbm(x * 0.01, z * 0.01, 4) * 90);
  return h;
}

export function buildTerrain(quality) {
  const seg = quality.terrainSeg;
  const size = 1000;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const splat = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
    const slope = 1 - nrm.getY(i);
    let rock = smoothstep(0.18, 0.4, slope);
    let dirt = 0;
    // paths
    if (z > 18 && z < 100 && Math.abs(x) < 7 + noise2(z * 0.2, 1) * 2) dirt = 1;
    const pathTo = (ax, az, bx, bz, w) => {
      const vx = bx - ax, vz = bz - az, wx = x - ax, wz = z - az;
      const t = clamp((wx * vx + wz * vz) / (vx * vx + vz * vz), 0, 1);
      const d = Math.hypot(wx - vx * t, wz - vz * t);
      return 1 - smoothstep(w * 0.6, w, d + (noise2(x * 0.15, z * 0.15) - 0.5) * 2);
    };
    dirt = Math.max(dirt, pathTo(0, 95, -110, 140, 5), pathTo(0, 95, 100, 92, 5), pathTo(100, 92, 175, 70, 4), pathTo(175, 70, 250, 40, 3.5));
    if (y < WATER_Y + 1.2) dirt = Math.max(dirt, smoothstep(WATER_Y + 1.2, WATER_Y, y));
    if (y < WATER_Y - 0.5) rock = Math.max(rock, 0.3);
    if (Math.hypot(x - SPOTS.clearing.x, z - SPOTS.clearing.z) < 26) dirt = Math.max(dirt, 0.6);
    if (x > 120) dirt = Math.max(dirt, 0.25 * noise2(x * 0.1, z * 0.1));
    rock = Math.max(rock, smoothstep(25, 60, y) * 0.8);
    const grass = Math.max(0, 1 - rock - dirt);
    const s = grass + dirt + rock || 1;
    splat[i * 3] = grass / s; splat[i * 3 + 1] = dirt / s; splat[i * 3 + 2] = rock / s;
  }
  geo.setAttribute('splat', new THREE.BufferAttribute(splat, 3));
  const grass = T.grassTex(), dirtT = T.dirtTex(), rockT = T.rockTex();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, map: grass.map, normalMap: grass.normalMap });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tDirt = { value: dirtT.map };
    sh.uniforms.tRock = { value: rockT.map };
    sh.uniforms.tRockN = { value: rockT.normalMap };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 splat; varying vec3 vSplat; varying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSplat = splat; vWP = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tDirt, tRock, tRockN; varying vec3 vSplat; varying vec3 vWP;')
      .replace('#include <map_fragment>', `
        vec2 wuv = vWP.xz;
        vec3 g1 = texture2D(map, wuv * 0.22).rgb;
        vec3 g2 = texture2D(map, wuv * 0.031).rgb;
        vec3 gcol = g1 * g2 * 2.1;
        vec3 dcol = texture2D(tDirt, wuv * 0.2).rgb;
        vec3 rcol = mix(texture2D(tRock, wuv * 0.08).rgb, texture2D(tRock, vec2(wuv.x + wuv.y, vWP.y) * 0.1).rgb, 0.5);
        vec3 sp = vSplat;
        sp.y = clamp(sp.y + (g2.g - 0.3) * 0.6 * sp.y, 0.0, 1.0);
        diffuseColor.rgb *= gcol * sp.x + dcol * sp.y + rcol * sp.z;
      `)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = texture2D(normalMap, vWP.xz * 0.22).xyz * 2.0 - 1.0;
        vec3 rN = texture2D(tRockN, vWP.xz * 0.08).xyz * 2.0 - 1.0;
        mapN = normalize(mix(mapN, rN, vSplat.z));
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );
      `);
  };
  // the terrain needs tangent frames for normal_fragment_maps' tbn: use derivative path
  mat.normalMapType = THREE.TangentSpaceNormalMap;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

export function buildWater(sky) {
  const geo = new THREE.PlaneGeometry(900, 900, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const noise = T.noiseTex();
  const mat = new THREE.ShaderMaterial({
    fog: true,
    transparent: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { time: { value: 0 }, tNoise: { value: null }, sunDir: { value: new THREE.Vector3() }, moonDir: { value: new THREE.Vector3() }, sunColor: { value: new THREE.Color() },
        zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, night: { value: 0 } },
    ]),
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vWP;
      void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWP = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float time, night; uniform sampler2D tNoise; uniform vec3 sunDir, moonDir, sunColor, zenith, horizon;
      varying vec3 vWP;
      void main(){
        vec2 uv = vWP.xz;
        vec2 n1 = texture2D(tNoise, uv * 0.011 + vec2(time*0.006, time*0.004)).rg - 0.5;
        vec2 n2 = texture2D(tNoise, uv * 0.043 - vec2(time*0.012, -time*0.009)).rg - 0.5;
        vec2 n3 = texture2D(tNoise, uv * 0.17 + vec2(time*0.03, time*0.021)).rg - 0.5;
        vec3 N = normalize(vec3((n1.x+n2.x*0.6+n3.x*0.3)*0.55, 1.0, (n1.y+n2.y*0.6+n3.y*0.3)*0.55));
        vec3 V = normalize(cameraPosition - vWP);
        vec3 R = reflect(-V, N);
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 sky = mix(horizon, zenith, clamp(R.y*1.4, 0.0, 1.0));
        vec3 deep = mix(vec3(0.015,0.05,0.06), vec3(0.003,0.008,0.015), night);
        vec3 col = mix(deep, sky, fres);
        float sp = pow(max(dot(R, sunDir), 0.0), 220.0) * 18.0 * (1.0-night);
        float mp = pow(max(dot(R, moonDir), 0.0), 300.0) * 6.0 * night;
        col += sunColor * sp + vec3(0.7,0.8,1.0) * mp;
        col += vec3(0.6,0.8,1.0) * pow(max(dot(R, sunDir),0.0), 8.0) * 0.08 * (1.0-night);
        gl_FragColor = vec4(col, 0.93);
        #include <fog_fragment>
      }`,
  });
  mat.uniforms.tNoise.value = noise;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(-120, WATER_Y, -140);
  mesh.renderOrder = 1;
  mesh.update = (t) => {
    const u = mat.uniforms;
    u.time.value = t;
    u.sunDir.value.copy(sky.uniforms.sunDir.value);
    u.moonDir.value.copy(sky.uniforms.moonDir.value);
    u.sunColor.value.copy(sky.uniforms.sunColor.value);
    u.zenith.value.copy(sky.uniforms.zenith.value);
    u.horizon.value.copy(sky.uniforms.horizon.value);
    u.night.value = sky.uniforms.night.value;
  };
  return mesh;
}

// Instanced grass tufts swaying in the wind.
export function buildGrass(count, accept) {
  if (!count) return null;
  const blade = new THREE.BufferGeometry();
  const verts = [], cols = [];
  for (let b = 0; b < 7; b++) {
    const a = (b / 7) * Math.PI * 2 + Math.random();
    const r = Math.random() * 0.25;
    const ox = Math.cos(a) * r, oz = Math.sin(a) * r;
    const h = 0.35 + Math.random() * 0.4, w = 0.05;
    const dx = Math.cos(a + 1.5) * w, dz = Math.sin(a + 1.5) * w;
    const lean = 0.15;
    verts.push(ox - dx, 0, oz - dz, ox + dx, 0, oz + dz, ox + Math.cos(a) * lean, h, oz + Math.sin(a) * lean);
    cols.push(0.35, 0.5, 0.18, 0.35, 0.5, 0.18, 0.75, 0.85, 0.4);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  blade.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  blade.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 });
  const uniforms = { time: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.time = uniforms.time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float time;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        float sway = sin(time*1.7 + ip.x*0.35 + ip.z*0.2) * 0.12 + sin(time*3.1 + ip.z*0.9)*0.04;
        transformed.x += sway * position.y; transformed.z += sway * 0.6 * position.y;`);
    sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = vec3(0.0,1.0,0.0);');
  };
  const mats = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let tries = 0;
  while (mats.length < count && tries < count * 6) {
    tries++;
    const x = (Math.random() - 0.5) * 520, z = (Math.random() - 0.5) * 520 + 40;
    const r = accept(x, z);
    if (r == null) continue;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28);
    const sc = 0.7 + Math.random() * 0.8;
    mats.push(m.compose(p.set(x, r, z), q, s.set(sc, sc, sc)).clone());
  }
  const mesh = new THREE.InstancedMesh(blade, mat, mats.length);
  mats.forEach((mx, i) => mesh.setMatrixAt(i, mx));
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.computeBoundingSphere();
  mesh.update = (t) => { uniforms.time.value = t; };
  return mesh;
}
