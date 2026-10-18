// Domain barrier: the dome a Domain Expansion closes around its caster (a short
// vertical wall capped by a hemisphere, so set-pieces near the edge stay inside).
// From outside it is a black, faintly rippling shell with a cursed-energy
// rim; from inside its inner face *is* the domain's world (the same sky the
// dome shows), so the outside terrain disappears. Whatever stands between the
// gameplay camera and the players is cut away (dithered), so the barrier never
// blocks the view. Collapse: crack lines glow, then the shell shatters shard
// by shard.
import * as THREE from 'three/webgpu';
import { uniform, positionLocal, positionWorld, normalize, vec3, float, sin, atan, mix, smoothstep, abs, fract, floor, dot, step, length, min, max, pow } from 'three/tsl';
import { U } from './materials.js';

// Shared sky uniforms (dome and barrier inner face read the same ones).
export function skyUniforms() {
  return { type: uniform(1), cTop: uniform(new THREE.Color(0, 0, 0)), cHor: uniform(new THREE.Color(0.2, 0.2, 0.2)), cStars: uniform(0), cBand: uniform(new THREE.Color(0, 0, 0)) };
}

// Domain sky colour for a unit direction d (types: 1 void, 2 shrine, 3 garden, 4 fire, 5 resonance, 6 custom).
export function skyColor(d, S) {
  const t = U.time, type = S.type;
  const cell = floor(d.mul(90));
  const h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
  const stars = step(0.985, h).mul(sin(t.mul(2).add(h.mul(60))).mul(0.4).add(0.6));
  const ang = atan(d.z, d.x);
  // void: swirling galaxy band + white horizon ring
  const band = smoothstep(0.35, 0.0, abs(d.y.sub(sin(ang.mul(2).add(t.mul(0.2))).mul(0.15))));
  const swirl = sin(ang.mul(5).add(d.y.mul(8)).sub(t.mul(0.6))).mul(0.5).add(0.5);
  const voidCol = vec3(0.0, 0.002, 0.01).add(vec3(0.12, 0.2, 0.6).mul(band).mul(swirl).mul(0.45)).add(vec3(1.4, 1.6, 2.0).mul(stars)).add(vec3(0.6, 0.7, 1.0).mul(smoothstep(0.03, 0.0, abs(d.y.add(0.02)))).mul(0.8));
  // shrine: blood sky, black sun
  const sunD = length(d.sub(normalize(vec3(0.3, 0.55, -0.6))));
  const shrineCol = mix(vec3(0.5, 0.02, 0.02), vec3(0.08, 0.0, 0.0), smoothstep(-0.1, 0.6, d.y)).mul(step(0.18, sunD)).add(vec3(1.5, 0.2, 0.1).mul(smoothstep(0.24, 0.18, sunD)).mul(step(0.16, sunD)));
  // garden: inky dark with drifting shadow ripples
  const garden = vec3(0.01, 0.01, 0.02).add(vec3(0.06, 0.06, 0.14).mul(sin(d.y.mul(20).add(t))).mul(0.5).add(0.02));
  // fire / resonance
  const fireCol = mix(vec3(1.0, 0.3, 0.05), vec3(0.15, 0.02, 0.0), smoothstep(-0.2, 0.7, d.y));
  const resCol = mix(vec3(0.9, 0.55, 0.25), vec3(0.2, 0.08, 0.04), smoothstep(-0.2, 0.7, d.y)).add(vec3(1, 0.7, 0.3).mul(stars).mul(0.5));
  const sel = (i) => step(i - 0.5, type).mul(step(type, i + 0.5));
  // 6: custom gradient sky with optional stars and a glowing horizon band
  const cusCol = mix(vec3(S.cHor), vec3(S.cTop), smoothstep(-0.1, 0.7, d.y)).add(vec3(1.2, 1.2, 1.3).mul(stars).mul(S.cStars)).add(vec3(S.cBand).mul(smoothstep(0.06, 0.0, abs(d.y.add(0.02)))));
  return cusCol.mul(sel(6)).add(voidCol.mul(sel(1)).add(shrineCol.mul(sel(2))).add(garden.mul(sel(3))).add(fireCol.mul(sel(4))).add(resCol.mul(sel(5))));
}

// height of the vertical part of the barrier wall, as a fraction of its radius (tall set-pieces
// standing near the edge, like Jogo's crater walls, stay inside)
export const WALL = 0.4;

export function barrierMaterial(S) {
  const B = {
    radius: uniform(24),
    focus: uniform(new THREE.Vector3()),   // where the players are (cut-away reference)
    inside: uniform(1),                    // 1: the viewer is inside the barrier
    rim: uniform(new THREE.Color(0x6ad8ff)),
    form: uniform(0),                      // 0..1 barrier closing (bright seam pours down)
    crack: uniform(0),                     // 0..1 crack lines glowing
    shatter: uniform(0),                   // 0..1 shards falling away
  };
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, fog: false, transparent: false });
  m.alphaTest = 0.5;
  const t = U.time;
  // shape: a short vertical wall (WALL × radius high) capped by a dome, in unit local space
  const pl = positionLocal;
  const d = normalize(pl);                                  // sky direction from the centre on the ground
  const capped = step(WALL, pl.y);
  const nrm = normalize(mix(vec3(pl.x, 0, pl.z), pl.sub(vec3(0, WALL, 0)), capped));   // outward surface normal
  const hy = pl.y.div(1 + WALL);                            // 0 at the ground, 1 at the zenith
  const pw = positionWorld;
  const ang = atan(d.z, d.x);
  // ---- cut-away: anything nearer the camera than the players goes (dithered edge)
  // (U.camPos, set by the game loop from the gameplay camera: the built-in cameraPosition node read
  // wrong inside the post-processing scene pass on the WebGL2 fallback)
  const camD = length(pw.sub(U.camPos));
  const focD = length(B.focus.sub(U.camPos));
  const dith = fract(sin(dot(floor(pw.mul(3.0)), vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
  // inside: everything nearer than the players goes; outside: only a tunnel around the camera→players ray,
  // so the black shell stays whole and a window opens wherever it would hide the players
  const rel = pw.sub(U.camPos), ray = normalize(B.focus.sub(U.camPos));
  const along = dot(rel, ray), perp = length(rel.sub(ray.mul(along)));
  const nearer = smoothstep(focD.sub(4.0), focD.sub(0.8), camD);
  const tunnel = max(smoothstep(focD.sub(4.0), focD.sub(0.8), along), smoothstep(5.0, 7.5, perp));
  const cut = mix(tunnel, nearer, B.inside);
  const cutVis = step(dith.mul(0.9).add(0.05), cut);
  const cutEdge = smoothstep(0.55, 0.0, abs(cut.sub(0.5))).mul(step(0.02, cut));
  // ---- triangular crack lattice in the shell's surface
  const u = ang.mul(B.radius).mul(0.3).add(sin(hy.mul(9).add(ang.mul(3))).mul(0.35));
  const v = hy.mul(B.radius).mul(0.5).add(sin(ang.mul(7)).mul(0.3));
  const a1 = u, a2 = u.mul(0.5).add(v.mul(0.866)), a3 = u.mul(-0.5).add(v.mul(0.866));
  const lineD = min(min(abs(fract(a1).sub(0.5)), abs(fract(a2).sub(0.5))), abs(fract(a3).sub(0.5)));
  const lines = smoothstep(0.07, 0.0, lineD);
  const shardId = fract(sin(dot(vec3(floor(a1), floor(a2), floor(a3)), vec3(17.13, 31.71, 11.37))).mul(43758.5453));
  const shardVis = step(B.shatter.mul(1.15), shardId.add(0.001));
  // ---- closing: the barrier pours down from the zenith
  const formLine = float(1).sub(B.form.mul(1.8));
  const formVis = step(formLine, hy);
  const seam = smoothstep(0.07, 0.0, abs(hy.sub(formLine))).mul(step(B.form, 0.999));
  // ---- outside: black shell with slow cursed-energy ripples and a coloured rim
  const viewDir = normalize(U.camPos.sub(pw));
  const fres = pow(float(1).sub(abs(dot(nrm, viewDir))), 6.0);
  const ripple = sin(ang.mul(6).add(hy.mul(11)).sub(t.mul(0.7))).mul(sin(ang.mul(-4).add(hy.mul(7)).add(t.mul(0.5)))).mul(0.5).add(0.5);
  const rim = vec3(B.rim);
  // (AgX lifts the shadows a lot: keep these tiny so the shell reads as black)
  const outCol = vec3(0.0004, 0.0003, 0.0008).add(rim.mul(ripple.mul(ripple).mul(0.004))).add(rim.mul(fres.mul(0.3))).add(rim.mul(lines.mul(0.0025)));
  // ---- inside: the domain's own world, with a glowing seam where the wall meets the ground
  const ground = smoothstep(0.08, 0.0, hy).mul(step(-0.03, hy));
  const inCol = skyColor(d, S).add(rim.mul(ground.mul(0.9))).add(rim.mul(lines.mul(ground).mul(1.2))).add(rim.mul(cutEdge.mul(1.6)));
  // which face: geometric (outward normal toward the camera) — gl_FrontFacing flips when the
  // WebGL2 fallback renders into a flipped render target
  const fr = step(0.0, dot(nrm, viewDir));
  const base = mix(inCol, outCol, fr);
  const glow = rim.mul(lines.mul(B.crack).mul(6.0)).add(vec3(1, 1, 1).mul(seam.mul(4.0)));
  m.colorNode = base.add(glow);
  const sideVis = mix(float(1), float(1).sub(B.inside), fr);   // the inner face always draws (seen through the window from outside)
  // seen from inside, the deep lower half goes (x-ray cut-outs in the floor must not show the shell);
  // from outside the whole sphere stays (the ground hides what is buried)
  const above = mix(float(1), step(-0.25, hy), B.inside);
  m.opacityNode = sideVis.mul(cutVis).mul(shardVis).mul(formVis).mul(above);
  m.userData = B;
  return m;
}

export function makeBarrier(S) {
  const prof = [new THREE.Vector2(1, -0.6), new THREE.Vector2(1, WALL)];
  for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a)), WALL + Math.sin(a))); }
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), barrierMaterial(S));
  mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 2;
  mesh.castShadow = false; mesh.receiveShadow = false;
  return mesh;
}
