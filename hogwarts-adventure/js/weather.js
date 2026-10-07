// Seasons from the school calendar: snowfall outdoors in winter (heavier at Christmas),
// a frosty tint on the fog, and Christmas trees and wreaths in the Great Hall.
import * as THREE from 'three';
import { G } from './state.js';
import { today } from './progress.js';
import { glowSprite } from './textures.js';
import { materials } from './world/materials.js';
import { Builder, mat4 } from './world/builder.js';

export class Weather {
  constructor(scene, q) {
    const n = Math.floor(2600 * Math.max(0.35, q));
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos.set([(Math.random() - 0.5) * 60, Math.random() * 30, (Math.random() - 0.5) * 60], i * 3); seed[i] = Math.random(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.uniforms = { time: { value: 0 }, center: { value: new THREE.Vector3() }, amount: { value: 0 }, map: { value: glowSprite() } };
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: this.uniforms,
      vertexShader: `uniform float time, amount; uniform vec3 center; attribute float seed; varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y - time * (1.2 + seed * 0.8), 30.0);
          p.x += sin(time * 0.7 + seed * 40.0) * 1.2;
          p.z += cos(time * 0.5 + seed * 30.0) * 1.2;
          // wrap the box around the camera
          p.x = mod(p.x - center.x + 30.0, 60.0) - 30.0 + center.x;
          p.z = mod(p.z - center.z + 30.0, 60.0) - 30.0 + center.z;
          p.y += center.y - 8.0;
          vA = step(seed, amount);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (6.0 + seed * 6.0) * 30.0 / -mv.z;
        }`,
      fragmentShader: `uniform sampler2D map; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.02) discard; gl_FragColor = vec4(vec3(1.0), a * 0.85); }`,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.amount = 0;
    this.decorated = null;
  }
  update(dt) {
    const z = G.zone;
    const d = G.save?.started ? today() : null;
    const want = d && z?.outdoor && (d.winter || G.save.flags?.xmas) && G.settings.weather !== false ? (d.christmas || G.save.flags?.xmas ? 0.9 : 0.5) : 0;
    this.amount += (want - this.amount) * Math.min(1, dt * 0.8);
    this.uniforms.amount.value = this.amount;
    this.uniforms.time.value += dt;
    this.uniforms.center.value.copy(G.camera.position);
    this.points.visible = this.amount > 0.01;
    if (this.amount > 0.05 && G.scene.fog && z?.outdoor) G.scene.fog.color.lerp(new THREE.Color(0.78, 0.82, 0.9), this.amount * 0.5);
    // Christmas in the Great Hall
    const xmas = !!(d && (d.christmas || G.save.flags?.xmas));
    if (xmas !== this.decorated) { this.decorated = xmas; this.decorate(xmas); }
  }
  decorate(on) {
    const gh = G.world.zones.greatHall;
    if (!this.trees) {
      const M = materials();
      const g = new THREE.Group();
      const B = new Builder();
      const needles = new THREE.MeshStandardMaterial({ color: 0x1a4a24, roughness: 0.9 });
      const baubles = [0xd02030, 0xe0b030, 0x3050c0, 0xc0c8d0].map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.7, roughness: 0.25, emissive: c, emissiveIntensity: 0.3 }));
      for (const [x, z] of [[-11, -24], [11, -24], [-11, 24], [11, 24]]) {
        for (let k = 0; k < 4; k++) B.add(new THREE.ConeGeometry(2.4 - k * 0.5, 2.6, 10), needles, mat4(x, 1.3 + k * 1.6, z));
        B.add(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8), M.woodDark, mat4(x, 0.4, z));
        for (let i = 0; i < 18; i++) { const a = i * 2.4, h = Math.random() * 6; const r = (2.3 - h * 0.3); B.add(new THREE.SphereGeometry(0.16, 8, 6), baubles[i % 4], mat4(x + Math.cos(a) * r, 1 + h, z + Math.sin(a) * r)); }
        const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(3, 2.5, 0.8), blending: THREE.AdditiveBlending, depthWrite: false }));
        star.position.set(x, 8, z); star.scale.setScalar(1.6);
        g.add(star);
        gh.colliders.cyl(gh.offset.x + x, gh.offset.z + z, 2, 0, 3, { disabled: true }).xmas = true;
      }
      // wreaths and garlands on the walls
      const wreath = new THREE.MeshStandardMaterial({ color: 0x1a4a24, roughness: 0.9 });
      for (let z = -30; z <= 30; z += 15) for (const sx of [-1, 1]) B.add(new THREE.TorusGeometry(0.9, 0.25, 6, 16), wreath, mat4(sx * 12.4, 8, z, sx * Math.PI / 2));
      B.build(g);
      g.position.copy(gh.offset);
      gh.group.add(g);
      this.trees = g;
    }
    this.trees.visible = on;
    for (const c of gh.colliders.list) if (c.xmas) c.disabled = !on;
  }
}
