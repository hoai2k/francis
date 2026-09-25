// Node materials shared by the world: voxel blocks, roofs, water, glowing
// liquids and decorations. Includes the camera-occlusion dither that makes
// walls between the camera and any player see-through.
import * as THREE from 'three/webgpu';
import {
  uniform, uniformArray, attribute, texture, uv, vec2, vec3, vec4, float, positionWorld, positionLocal,
  screenCoordinate, interleavedGradientNoise, smoothstep, dot, clamp, max, sin, cos, time, mix,
  transformNormalToView, normalize, fract, abs, step, length, floor,
} from 'three/tsl';

export const U = {
  time: uniform(0),              // game time (respects slow-mo / pause)
  camPos: uniform(new THREE.Vector3()),
  players: uniformArray(new Array(4).fill(0).map(() => new THREE.Vector4(0, -999, 0, 0)), 'vec4'),
  wind: uniform(1),
  occlusionRadius: uniform(2.4),
  bakeStrength: uniform(1),
  // Domain Expansion: radial takeover of the world's look
  domainCenter: uniform(new THREE.Vector3()),
  domainRadius: uniform(0),
  domainType: uniform(0),        // 1 void, 2 shrine, 3 garden, 4 fire, 5 resonance
  trench: uniform(new THREE.Vector4(0, 0, 0, 0)),
};

// Colour + emissive of the domain surface for the current domain type.
function domainLook(albedo) {
  const p = positionWorld;
  const cell = floor(p.mul(4));
  const h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
  const e = fract(p);
  const edge = max(max(smoothstep(0.93, 0.99, e.x), smoothstep(0.07, 0.01, e.x)), max(smoothstep(0.93, 0.99, e.z), smoothstep(0.07, 0.01, e.z)));
  const lum = dot(albedo, vec3(0.3, 0.59, 0.11));
  const t = U.domainType;
  // 1: Unlimited Void — near-black with star specks and cyan grid seams
  const voidC = vec3(0.006, 0.008, 0.02).add(vec3(0.01, 0.015, 0.04).mul(lum));
  const voidE = vec3(0.8, 0.9, 1.4).mul(step(0.994, h)).mul(sin(U.time.mul(3).add(h.mul(40))).mul(0.5).add(0.5)).mul(3).add(vec3(0.05, 0.12, 0.35).mul(edge).mul(0.18));
  // 2: Malevolent Shrine — blood-red stone, black seams
  const shrC = vec3(0.16, 0.012, 0.012).mul(lum.mul(1.2).add(0.25)).mul(float(1).sub(edge.mul(0.85)));
  const shrE = vec3(0.6, 0.03, 0.0).mul(step(0.99, h)).add(vec3(0.05, 0.0, 0.0).mul(edge));
  // 3: Chimera Shadow Garden — glossy black liquid shadow
  const garC = vec3(0.01, 0.01, 0.015);
  const garE = vec3(0.1, 0.1, 0.25).mul(smoothstep(0.6, 1.0, sin(p.x.mul(0.8).add(p.z.mul(0.6)).add(U.time.mul(1.5))))).mul(0.4);
  // 4: fire / 5: resonance
  const fireC = vec3(0.12, 0.03, 0.02).mul(lum.add(0.4));
  const fireE = vec3(0.7, 0.2, 0.04).mul(edge).mul(sin(U.time.mul(4).add(h.mul(20))).mul(0.3).add(0.7)).add(vec3(1.2, 0.4, 0.1).mul(step(0.993, h)));
  const resC = vec3(0.16, 0.08, 0.05).mul(lum.add(0.5));
  const resE = vec3(1.4, 0.5, 0.15).mul(step(0.992, h)).mul(sin(U.time.mul(5).add(h.mul(30))).mul(0.5).add(0.5)).add(vec3(0.18, 0.05, 0.01).mul(edge));
  const sel = (i) => step(i - 0.5, t).mul(step(t, i + 0.5));
  const col = voidC.mul(sel(1)).add(shrC.mul(sel(2))).add(garC.mul(sel(3))).add(fireC.mul(sel(4))).add(resC.mul(sel(5)));
  const emi = voidE.mul(sel(1)).add(shrE.mul(sel(2))).add(garE.mul(sel(3))).add(fireE.mul(sel(4))).add(resE.mul(sel(5)));
  const d = length(p.xz.sub(U.domainCenter.xz));
  const mask = smoothstep(U.domainRadius, U.domainRadius.sub(1.2), d).mul(step(0.5, t));
  const rim = smoothstep(1.4, 0.0, abs(d.sub(U.domainRadius))).mul(step(0.5, t)).mul(step(0.1, U.domainRadius));
  return { col, emi, mask, rim };
}
export { domainLook };

// Glowing trench left by Hollow Purple (x,z start; w = unused; direction in trenchDir)
export const Trench = { a: uniform(new THREE.Vector3(0, -99, 0)), b: uniform(new THREE.Vector3(0, -99, 0)), width: uniform(0), glow: uniform(0) };
function trenchGlow() {
  const p = positionWorld;
  const ab = Trench.b.sub(Trench.a);
  const t = clamp(dot(p.sub(Trench.a), ab).div(max(dot(ab, ab), 0.001)), 0, 1);
  const d = length(p.sub(Trench.a.add(ab.mul(t))).xz);
  const k = smoothstep(Trench.width, Trench.width.mul(0.4), d).mul(smoothstep(Trench.a.y.add(1.5), Trench.a.y.sub(1.0), p.y)).mul(Trench.glow);
  return vec3(0.9, 0.3, 1.6).mul(k).mul(sin(U.time.mul(3).add(p.x.add(p.z))).mul(0.25).add(0.9));
}

// 1 where a fragment blocks the view of a player, 0 elsewhere.
function occlusionAmount() {
  const cam = U.camPos;
  let amt = float(0);
  for (let i = 0; i < 4; i++) {
    const p = U.players.element(i);
    const target = p.xyz.add(vec3(0, 1.0, 0));
    const seg = target.sub(cam);
    const t = clamp(dot(positionWorld.sub(cam), seg).div(dot(seg, seg)), 0, 1);
    const closest = cam.add(seg.mul(t));
    const d = length(positionWorld.sub(closest));
    const radial = smoothstep(U.occlusionRadius, U.occlusionRadius.mul(0.45), d);
    const inFront = smoothstep(0.97, 0.85, t);
    const aboveFeet = smoothstep(p.y.add(0.25), p.y.add(0.9), positionWorld.y);
    amt = max(amt, radial.mul(inFront).mul(aboveFeet).mul(p.w));
  }
  return amt;
}
function ditherMask(fade) {
  const n = interleavedGradientNoise(screenCoordinate.xy);
  return n.greaterThan(fade.mul(0.88));
}

export function createBlockMaterial(atlas, { occlude = true } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ normalMap: atlas.normalMap });
  m.normalScale = new THREE.Vector2(1, 1);
  const mat = attribute('mat', 'vec3');        // rough, metal, emit
  const bake = attribute('bake', 'vec3');      // baked coloured light
  const ao = attribute('color', 'vec3');
  m.metalnessNode = mat.y;
  const albedo = texture(atlas.map, uv()).rgb;
  const D = domainLook(albedo);
  m.colorNode = vec4(mix(albedo, D.col, D.mask).mul(ao), 1);
  m.roughnessNode = mix(mat.x, float(0.06), D.mask.mul(step(U.domainType, 3.5)).mul(float(1).sub(step(1.5, U.domainType).mul(step(U.domainType, 2.5)))));
  const baseEmit = albedo.mul(mat.z.mul(1.6)).add(albedo.mul(bake).mul(ao).mul(U.bakeStrength));
  m.emissiveNode = mix(baseEmit, D.emi, D.mask).add(vec3(0.6, 0.8, 1.4).mul(D.rim).mul(2)).add(trenchGlow());
  if (occlude) m.maskNode = ditherMask(occlusionAmount());
  return m;
}

// Roof: fades out (dithered) as a whole when a player walks underneath.
export function createRoofMaterial(atlas) {
  const m = createBlockMaterial(atlas, { occlude: false });
  const fade = uniform(0);
  m.maskNode = ditherMask(fade.div(0.88));
  m.userData.fade = fade;
  return m;
}

// Water: dark, glossy, animated normals; SSR + environment probe reflect in it.
export function createWaterMaterial(color = 0x0c2440) {
  const m = new THREE.MeshStandardNodeMaterial({ color, roughness: 0.03, metalness: 0.55 });
  const p = positionWorld.xz;
  const t = U.time;
  const w1 = sin(p.x.mul(1.3).add(t.mul(1.1))).mul(cos(p.y.mul(1.1).sub(t.mul(0.9))));
  const w2 = sin(p.x.mul(-2.7).add(p.y.mul(2.1)).add(t.mul(1.7)));
  const dx = cos(p.x.mul(1.3).add(t.mul(1.1))).mul(0.08).add(cos(p.x.mul(-2.7).add(p.y.mul(2.1)).add(t.mul(1.7))).mul(-0.05));
  const dz = sin(p.y.mul(1.1).sub(t.mul(0.9))).mul(-0.08).add(w2.mul(0.04));
  m.normalNode = transformNormalToView(normalize(vec3(dx.negate(), 1, dz.negate())));
  m.positionNode = positionLocal.add(vec3(0, w1.mul(0.03), 0));
  const foam = smoothstep(0.55, 0.95, w1.mul(0.5).add(0.5)).mul(0.04);
  m.emissiveNode = vec3(0.02, 0.06, 0.1).add(foam);
  return m;
}

// Glowing liquid (cursed energy pools, lava): flowing emissive surface.
export function createGlowLiquidMaterial(atlas, tint, strength = 2.5) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0 });
  const flow = uv().add(vec2(U.time.mul(0.012), U.time.mul(0.008)));
  const tex = texture(atlas.map, uv()).rgb;
  const pulse = sin(U.time.mul(2.0).add(positionWorld.x.mul(0.7)).add(positionWorld.z.mul(0.5))).mul(0.25).add(1);
  const tintC = new THREE.Color(tint);
  m.colorNode = tex.mul(0.3);
  m.emissiveNode = tex.mul(vec3(tintC.r, tintC.g, tintC.b)).mul(strength).mul(pulse);
  m.positionNode = positionLocal.add(vec3(0, sin(U.time.mul(1.5).add(positionWorld.x.add(positionWorld.z))).mul(0.025), 0));
  void flow;
  return m;
}

// Alpha-tested cross-quad decorations (grass, webs, talismans) with wind sway.
export function createDecoMaterial(spriteMap, { sway = true } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ map: spriteMap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, vertexColors: true });
  if (sway) {
    const swayAmt = attribute('sway', 'float');
    const ph = positionWorld.x.mul(0.8).add(positionWorld.z.mul(0.6));
    const s = sin(U.time.mul(2.2).add(ph)).mul(0.08).add(sin(U.time.mul(5.1).add(ph.mul(2.0))).mul(0.025));
    m.positionNode = positionLocal.add(vec3(s, 0, s.mul(0.6)).mul(swayAmt).mul(U.wind));
  }
  const emit = attribute('emit', 'float');
  const tex = texture(spriteMap, uv());
  const D = domainLook(tex.rgb);
  m.colorNode = vec4(mix(tex.rgb, D.col, D.mask), tex.a);
  m.emissiveNode = mix(tex.rgb.mul(emit), D.emi, D.mask);
  return m;
}

export { ditherMask, occlusionAmount };
