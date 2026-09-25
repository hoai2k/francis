// Block debris: pooled instanced cubes with simple physics that bounce off the
// voxel world, used when crates, barrels, walls and pillars shatter and for
// Hollow Purple's flying rubble.
import * as THREE from 'three/webgpu';
import { tileAvgColor } from './textures.js';
import { BLOCKS } from '../world/blocks.js';

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), E = new THREE.Euler();

export class Debris {
  constructor(game, max = 400) {
    this.game = game; this.max = max;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    const c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < max; i++) { this.mesh.setColorAt(i, c); M.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, M); }
    this.items = []; this.head = 0;
    game.scene.add(this.mesh);
  }
  spawn(pos, vel, size, color, life = 2.5) {
    const i = this.head; this.head = (this.head + 1) % this.max;
    const it = this.items[i] || (this.items[i] = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Vector3(), spin: new THREE.Vector3() });
    it.pos.copy(pos); it.vel.copy(vel); it.size = size; it.life = life; it.t = 0; it.active = true;
    it.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); it.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
    this.mesh.setColorAt(i, color); this.mesh.instanceColor.needsUpdate = true;
  }
  burst(center, def, n = 8, power = 1) {
    const col = tileAvgColor[def.side ?? def] ?? new THREE.Color(0.5, 0.5, 0.5);
    const cnt = Math.round(n * (this.game.particles?.budget ?? 1));
    for (let k = 0; k < cnt; k++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 5, (Math.random() - 0.5) * 6).multiplyScalar(power);
      const p = center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6));
      this.spawn(p, v, 0.18 + Math.random() * 0.22, col.clone().multiplyScalar(0.8 + Math.random() * 0.4));
    }
    this.game.fx?.debris(center, col, 3);
  }
  update(dt) {
    if (!dt) return;
    const w = this.game.world;
    let any = false;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]; if (!it || !it.active) continue;
      any = true;
      it.t += dt;
      it.vel.y -= 26 * dt;
      it.pos.addScaledVector(it.vel, dt);
      const id = w ? w.get(Math.floor(it.pos.x), Math.floor(it.pos.y - it.size * 0.5), Math.floor(it.pos.z)) : 0;
      if (id && BLOCKS[id].solid) {
        it.pos.y = Math.floor(it.pos.y - it.size * 0.5) + 1 + it.size * 0.5;
        it.vel.y *= -0.35; it.vel.x *= 0.6; it.vel.z *= 0.6; it.spin.multiplyScalar(0.6);
      }
      it.rot.addScaledVector(it.spin, dt);
      const fade = Math.min(1, Math.max(0, (it.life - it.t) / 0.6));
      const s = it.size * fade;
      if (it.t >= it.life || it.pos.y < -20) { it.active = false; S.set(0, 0, 0); } else S.set(s, s, s);
      Q.setFromEuler(E.set(it.rot.x, it.rot.y, it.rot.z));
      M.compose(it.pos, Q, S); this.mesh.setMatrixAt(i, M);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Crackling lightning bolts (Black Flash): pooled thin boxes, black core with
// a red glow shell, re-randomised every few frames while alive.
export class Bolts {
  constructor(scene, max = 240) {
    this.max = max;
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
    this.core = new THREE.InstancedMesh(geo, new THREE.MeshBasicNodeMaterial({ color: 0x050005 }), max);
    const glowMat = new THREE.MeshBasicNodeMaterial({ color: 0xff1a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    this.glow = new THREE.InstancedMesh(geo, glowMat, max);
    for (const m of [this.core, this.glow]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; scene.add(m); }
    this.glow.renderOrder = 21;
    this.bolts = [];
    this.t = 0;
  }
  spawn(origin, { count = 7, length = 4, life = 0.35, color = null } = {}) {
    this.bolts.push({ origin: origin.clone(), count, length, life, t: 0 });
  }
  update(dt) {
    this.t += dt;
    let n = 0;
    const put = (a, b, w) => {
      if (n >= this.max) return;
      const d = S.subVectors(b, a); const len = d.length();
      Q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize());
      M.compose(a, Q, new THREE.Vector3(w, w, len)); this.core.setMatrixAt(n, M);
      M.compose(a, Q, new THREE.Vector3(w * 3.2, w * 3.2, len)); this.glow.setMatrixAt(n, M);
      n++;
    };
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.t += dt;
      if (b.t > b.life) { this.bolts.splice(i, 1); continue; }
      const seed = Math.floor(this.t * 30);  // re-jag at 30 Hz
      let r = seed * 9301 + i * 49297;
      const rnd = () => { r = (r * 16807 + 11) % 2147483647; return r / 2147483647; };
      for (let k = 0; k < b.count; k++) {
        let p = b.origin.clone();
        const dir = new THREE.Vector3(rnd() - 0.5, (rnd() - 0.3) * 0.8, rnd() - 0.5).normalize();
        const segs = 5;
        for (let s = 0; s < segs; s++) {
          const q = p.clone().addScaledVector(dir, b.length / segs).add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.6));
          put(p, q, 0.05 * (1 - s / segs) + 0.02);
          p = q;
        }
      }
    }
    this.core.count = n; this.glow.count = n;
    if (n) { this.core.instanceMatrix.needsUpdate = true; this.glow.instanceMatrix.needsUpdate = true; }
  }
}
