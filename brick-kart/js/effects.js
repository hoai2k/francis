// Particles: flying LEGO debris (instanced bricks), additive sparks, dust puffs.
import * as THREE from 'three';
import { brickGeometry } from './lego.js';
import { SPARK_COLORS } from './kart.js';

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpE = new THREE.Euler();
const col = new THREE.Color();

export class Effects {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    // debris bricks
    this.DN = 260;
    const geos = [brickGeometry(2, 1, 3, 0.4, true, 8), brickGeometry(1, 1, 3, 0.4, true, 8), brickGeometry(2, 2, 1, 0.4, true, 8)];
    this.debrisMeshes = geos.map((g) => {
      const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.35 }), this.DN);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.castShadow = true;
      m.frustumCulled = false;
      for (let i = 0; i < this.DN; i++) { m.setMatrixAt(i, tmpM.makeScale(0, 0, 0)); m.setColorAt(i, col.set(0xffffff)); }
      scene.add(m);
      return m;
    });
    this.debrisList = [];
    this.dCursor = 0;
    // sparks (points)
    this.SN = 1500;
    this.sPos = new Float32Array(this.SN * 3);
    this.sCol = new Float32Array(this.SN * 3);
    this.sVel = new Float32Array(this.SN * 3);
    this.sLife = new Float32Array(this.SN);
    this.sGrav = new Float32Array(this.SN);
    this.sCursor = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.sPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.sCol, 3).setUsage(THREE.DynamicDrawUsage));
    const sprite = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    this.sparks = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.7, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparks.frustumCulled = false;
    scene.add(this.sparks);
    // dust (normal blending, bigger)
    this.DU = 500;
    this.uPos = new Float32Array(this.DU * 3);
    this.uCol = new Float32Array(this.DU * 3);
    this.uVel = new Float32Array(this.DU * 3);
    this.uLife = new Float32Array(this.DU);
    this.uCursor = 0;
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(this.uPos, 3).setUsage(THREE.DynamicDrawUsage));
    g2.setAttribute('color', new THREE.BufferAttribute(this.uCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.dust2 = new THREE.Points(g2, new THREE.PointsMaterial({ size: 0.8, map: sprite, vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false }));
    this.dust2.frustumCulled = false;
    scene.add(this.dust2);
    for (let i = 0; i < this.SN; i++) this.sPos[i * 3 + 1] = -9999;
    for (let i = 0; i < this.DU; i++) this.uPos[i * 3 + 1] = -9999;
    this.tmp = new THREE.Vector3();
  }

  debrisOne(p, color, vel, scale = 1) {
    const i = this.dCursor++ % (this.DN * this.debrisMeshes.length);
    const mi = i % this.debrisMeshes.length, slot = Math.floor(i / this.debrisMeshes.length);
    const old = this.debrisList.findIndex((d) => d.mi === mi && d.slot === slot);
    if (old >= 0) this.debrisList.splice(old, 1);
    this.debrisMeshes[mi].setColorAt(slot, col.set(color));
    this.debrisMeshes[mi].instanceColor.needsUpdate = true;
    this.debrisList.push({ mi, slot, p: p.clone(), v: vel, r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14), life: 1.6 + Math.random() * 0.6, s: scale, floor: p.y - 1 });
  }
  debris(p, colors, n = 12, power = 1) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * (3 + Math.random() * 7) * power, (6 + Math.random() * 9) * power, Math.sin(a) * (3 + Math.random() * 7) * power);
      this.debrisOne(p, colors[k % colors.length], v, 1);
    }
  }
  spark(x, y, z, vx, vy, vz, color, life = 0.4, grav = 0) {
    const i = this.sCursor++ % this.SN;
    this.sPos[i * 3] = x; this.sPos[i * 3 + 1] = y; this.sPos[i * 3 + 2] = z;
    this.sVel[i * 3] = vx; this.sVel[i * 3 + 1] = vy; this.sVel[i * 3 + 2] = vz;
    col.set(color);
    this.sCol[i * 3] = col.r; this.sCol[i * 3 + 1] = col.g; this.sCol[i * 3 + 2] = col.b;
    this.sLife[i] = life; this.sGrav[i] = grav;
  }
  puff(x, y, z, vx, vy, vz, color, life = 0.8) {
    const i = this.uCursor++ % this.DU;
    this.uPos[i * 3] = x; this.uPos[i * 3 + 1] = y; this.uPos[i * 3 + 2] = z;
    this.uVel[i * 3] = vx; this.uVel[i * 3 + 1] = vy; this.uVel[i * 3 + 2] = vz;
    col.set(color);
    this.uCol[i * 3] = col.r; this.uCol[i * 3 + 1] = col.g; this.uCol[i * 3 + 2] = col.b;
    this.uLife[i] = life;
  }

  rearWheels(k, side) {
    const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
    return this.tmp.set(k.pos.x - fx * 1.3 + fz * 1.4 * side, k.pos.y + 0.25, k.pos.z - fz * 1.3 - fx * 1.4 * side);
  }
  driftSparks(k, level) {
    if (level === 0 && Math.random() < 0.6) return;
    const c = level > 0 ? SPARK_COLORS[level - 1] : 0xb8b0a0;
    const n = level > 0 ? 3 : 1;
    for (const side of [-1, 1]) {
      const p = this.rearWheels(k, side);
      for (let j = 0; j < n; j++) this.spark(p.x, p.y, p.z, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, c, 0.25 + Math.random() * 0.2, 20);
    }
  }
  boostBurst(k) {
    const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
    for (let j = 0; j < 16; j++) this.spark(k.pos.x - fx * 2, k.pos.y + 1.1, k.pos.z - fz * 2, -fx * 12 + (Math.random() - 0.5) * 6, Math.random() * 4, -fz * 12 + (Math.random() - 0.5) * 6, j % 2 ? 0xffa020 : 0xffe060, 0.35);
  }
  dust(k, color = 0xcccccc, n = 1) {
    if (n === 1 && Math.random() < 0.5) return;
    for (const side of [-1, 1]) {
      const p = this.rearWheels(k, side);
      for (let j = 0; j < n; j++) this.puff(p.x, p.y + 0.2, p.z, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, color, 0.6);
    }
  }
  sparkle(k) {
    const c = [0xfff080, 0xffd040, 0xffffff][Math.floor(Math.random() * 3)];
    this.spark(k.pos.x + (Math.random() - 0.5) * 3, k.pos.y + Math.random() * 2.5, k.pos.z + (Math.random() - 0.5) * 3, 0, 2, 0, c, 0.5);
  }
  pop(p, color) {
    for (let j = 0; j < 30; j++) {
      const a = Math.random() * 6.28, b = Math.random() * 3.14;
      this.spark(p.x, p.y + 1, p.z, Math.cos(a) * Math.sin(b) * 12, Math.cos(b) * 12, Math.sin(a) * Math.sin(b) * 12, color, 0.5);
    }
  }
  explosion(p) {
    for (let j = 0; j < 50; j++) {
      const a = Math.random() * 6.28, b = Math.random() * 3.14, s = 6 + Math.random() * 14;
      this.spark(p.x, p.y + 0.5, p.z, Math.cos(a) * Math.sin(b) * s, Math.abs(Math.cos(b)) * s, Math.sin(a) * Math.sin(b) * s, j % 3 ? 0xff7a10 : 0xffe060, 0.5 + Math.random() * 0.3, 10);
    }
    for (let j = 0; j < 14; j++) this.puff(p.x, p.y + 0.5, p.z, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, 0x555555, 1.2);
  }
  studBurst(p, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.28;
      this.debrisOne(p.clone().add(new THREE.Vector3(0, 1, 0)), 0xdcbc81, new THREE.Vector3(Math.cos(a) * 5, 10, Math.sin(a) * 5), 1);
    }
  }
  studPickup(p) {
    for (let j = 0; j < 10; j++) this.spark(p.x, p.y, p.z, (Math.random() - 0.5) * 8, Math.random() * 8, (Math.random() - 0.5) * 8, 0xffe070, 0.4);
  }
  splash(p, color) {
    for (let j = 0; j < 40; j++) this.puff(p.x + (Math.random() - 0.5) * 3, p.y, p.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 8, 6 + Math.random() * 10, (Math.random() - 0.5) * 8, color, 1.0);
  }
  itemBoxBreak(p) {
    for (let j = 0; j < 24; j++) {
      col.setHSL(Math.random(), 1, 0.6);
      this.spark(p.x, p.y, p.z, (Math.random() - 0.5) * 14, Math.random() * 10, (Math.random() - 0.5) * 14, col.getHex(), 0.5, 15);
    }
  }

  update(dt) {
    // debris
    const alive = [];
    for (const d of this.debrisList) {
      d.life -= dt;
      const mesh = this.debrisMeshes[d.mi];
      if (d.life <= 0) { mesh.setMatrixAt(d.slot, tmpM.makeScale(0, 0, 0)); continue; }
      d.v.y -= 32 * dt;
      d.p.addScaledVector(d.v, dt);
      if (d.p.y < d.floor) { d.p.y = d.floor; d.v.y *= -0.35; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.6); }
      d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt;
      const s = d.s * Math.min(1, d.life * 3);
      tmpM.compose(d.p, tmpQ.setFromEuler(tmpE.copy(d.r)), tmpS.setScalar(s));
      mesh.setMatrixAt(d.slot, tmpM);
      alive.push(d);
    }
    this.debrisList = alive;
    for (const m of this.debrisMeshes) m.instanceMatrix.needsUpdate = true;
    // sparks
    for (let i = 0; i < this.SN; i++) {
      if (this.sLife[i] <= 0) continue;
      this.sLife[i] -= dt;
      if (this.sLife[i] <= 0) { this.sPos[i * 3 + 1] = -9999; continue; }
      this.sVel[i * 3 + 1] -= this.sGrav[i] * dt;
      this.sPos[i * 3] += this.sVel[i * 3] * dt; this.sPos[i * 3 + 1] += this.sVel[i * 3 + 1] * dt; this.sPos[i * 3 + 2] += this.sVel[i * 3 + 2] * dt;
    }
    this.sparks.geometry.attributes.position.needsUpdate = true;
    this.sparks.geometry.attributes.color.needsUpdate = true;
    for (let i = 0; i < this.DU; i++) {
      if (this.uLife[i] <= 0) continue;
      this.uLife[i] -= dt;
      if (this.uLife[i] <= 0) { this.uPos[i * 3 + 1] = -9999; continue; }
      this.uVel[i * 3 + 1] -= 6 * dt;
      this.uPos[i * 3] += this.uVel[i * 3] * dt; this.uPos[i * 3 + 1] += this.uVel[i * 3 + 1] * dt; this.uPos[i * 3 + 2] += this.uVel[i * 3 + 2] * dt;
    }
    this.dust2.geometry.attributes.position.needsUpdate = true;
    this.dust2.geometry.attributes.color.needsUpdate = true;
  }
}
