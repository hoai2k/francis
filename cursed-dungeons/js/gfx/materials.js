// Node materials shared by the world: voxel blocks, roofs, water, glowing
// liquids and decorations. Includes the camera-occlusion dither that makes
// walls between the camera and any player see-through.
import * as THREE from 'three/webgpu';
import {
  uniform, uniformArray, attribute, texture, uv, vec2, vec3, vec4, float, positionWorld, positionLocal,
  screenCoordinate, interleavedGradientNoise, smoothstep, dot, clamp, max, sin, cos, time, mix,
  transformNormalToView, normalize, fract, abs, step, length,
} from 'three/tsl';

export const U = {
  time: uniform(0),              // game time (respects slow-mo / pause)
  camPos: uniform(new THREE.Vector3()),
  players: uniformArray(new Array(4).fill(0).map(() => new THREE.Vector4(0, -999, 0, 0)), 'vec4'),
  wind: uniform(1),
  occlusionRadius: uniform(2.4),
  bakeStrength: uniform(1),
};

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
  const m = new THREE.MeshStandardNodeMaterial({ map: atlas.map, normalMap: atlas.normalMap, vertexColors: true });
  m.normalScale = new THREE.Vector2(1, 1);
  const mat = attribute('mat', 'vec3');        // rough, metal, emit
  const bake = attribute('bake', 'vec3');      // baked coloured light
  const ao = attribute('color', 'vec3');
  m.roughnessNode = mat.x;
  m.metalnessNode = mat.y;
  const albedo = texture(atlas.map, uv()).rgb;
  m.emissiveNode = albedo.mul(mat.z.mul(1.6)).add(albedo.mul(bake).mul(ao).mul(U.bakeStrength));
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
  m.emissiveNode = texture(spriteMap, uv()).rgb.mul(emit);
  return m;
}

export { ditherMask, occlusionAmount };
