// Light manager: a fixed pool of point lights (so shaders never recompile)
// is assigned every frame to the most relevant light sources — static
// torches/lanterns/cursed pools plus short-lived dynamic flashes from
// attacks and projectiles. Also owns the sun/moon directional light, whose
// direction, colour and intensity the environment (time of day) sets every
// frame with setSun(). Its shadow map follows the camera focus with a
// stabilised orthographic frustum (snapped to shadow-map texels, so shadows
// don't shimmer as you walk) sized to what the camera can see.
import * as THREE from 'three/webgpu';

const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), _c = new THREE.Vector3();

export class LightManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.static = [];
    this.dynamic = [];
    this.hemi = new THREE.HemisphereLight(0x8090c0, 0x201820, 0.6);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xaab8ff, 1.2);
    this.sun.position.set(-20, 40, 12);
    this.sun.target.position.set(0, 0, 0);
    scene.add(this.sun, this.sun.target);
    this.sunOffset = new THREE.Vector3(-18, 36, 10);
    this.sunDir = this.sunOffset.clone().normalize();   // towards the light; env.setSun() overrides
    this.torch = 1;          // 0..1: lanterns & torches dim by day, take over at night
    this.viewDist = 30;      // how far the camera sees (sizes the shadow frustum)
    this.extent = 0;
    this.t = 0;
  }
  setSun(dir, color, intensity, { moon = false } = {}) {
    this.sunDir.copy(dir);
    this.sun.color.copy(color); this.sun.intensity = intensity;
    if (this.sun.shadow && 'intensity' in this.sun.shadow) this.sun.shadow.intensity = moon ? 0.72 : 1;
  }
  configure(preset) {
    for (const l of this.pool) { this.scene.remove(l); l.dispose?.(); }
    this.pool = [];
    for (let i = 0; i < preset.pointLights; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      if (i < preset.pointShadows && preset.shadows) {
        l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.004; l.shadow.radius = 4;
        l.shadow.camera.near = 0.3;
      }
      this.scene.add(l); this.pool.push(l);
    }
    const s = this.sun;
    s.castShadow = preset.shadows;
    this.preset = preset;
    this.extent = 0;
    if (preset.shadows) {
      s.shadow.mapSize.set(preset.shadowSize, preset.shadowSize);
      s.shadow.bias = preset.shadowType === 'vsm' ? -0.0004 : -0.0006;
      s.shadow.normalBias = preset.shadowSize >= 4096 ? 0.03 : 0.045;
      s.shadow.radius = preset.shadowRadius ?? (preset.shadowType === 'vsm' ? 9 : preset.shadowSize >= 2048 ? 3.5 : 2);
      s.shadow.blurSamples = preset.shadowType === 'vsm' ? 18 : 8;
      this.fitShadow(34);
    }
  }
  // Orthographic shadow frustum of half-size e around the focus.
  fitShadow(e) {
    const cam = this.sun.shadow.camera;
    cam.left = -e; cam.right = e; cam.top = e; cam.bottom = -e; cam.near = 1; cam.far = 320;
    cam.updateProjectionMatrix();
    this.extent = e;
  }
  setStatic(list) { this.static = list.map((L) => ({ ...L, flicker: L.flicker ?? (L.block ? 0.12 : 0.25), seed: Math.random() * 100 })); }
  // Short-lived light for hits, projectiles, techniques. Returns handle.
  flash(pos, color, intensity, distance, ttl = 0.25, opts = {}) {
    const d = { x: pos.x, y: pos.y, z: pos.z, color: new THREE.Color(color), intensity, distance, ttl, life: ttl, priority: opts.priority ?? 2, follow: opts.follow || null, fade: opts.fade ?? true };
    this.dynamic.push(d); return d;
  }
  // Persistent light that follows an object until removed.
  attach(obj, color, intensity, distance, opts = {}) {
    const d = { follow: obj, x: 0, y: 0, z: 0, color: new THREE.Color(color), intensity, distance, ttl: Infinity, life: Infinity, priority: opts.priority ?? 1.5, offsetY: opts.offsetY ?? 1, fade: false };
    this.dynamic.push(d); return d;
  }
  remove(d) { const i = this.dynamic.indexOf(d); if (i >= 0) this.dynamic.splice(i, 1); }
  update(dt, focus) {
    this.t += dt;
    // shadow frustum: big enough for the view (title / cutscene cameras see more), in steps so it rarely changes
    if (this.sun.castShadow) {
      const want = Math.min(this.preset?.shadowMaxExtent ?? 80, Math.max(22, Math.ceil(this.viewDist * 1.1 / 6) * 6));
      if (want !== this.extent) this.fitShadow(want);
    }
    // stabilise: move the light only in whole shadow-map texels across its view plane
    const dir = this.sunDir;
    _f.copy(dir).negate();
    _r.set(0, 1, 0).cross(_f); if (_r.lengthSq() < 1e-6) _r.set(1, 0, 0); _r.normalize();
    _u.copy(_f).cross(_r).normalize();
    const texel = (2 * (this.extent || 34)) / (this.sun.shadow.mapSize.x || 1024);
    const a = Math.round(focus.dot(_r) / texel) * texel, b = Math.round(focus.dot(_u) / texel) * texel, c = focus.dot(_f);
    _c.copy(_r).multiplyScalar(a).addScaledVector(_u, b).addScaledVector(_f, c);
    this.sun.position.copy(_c).addScaledVector(dir, 160);
    this.sun.target.position.copy(_c);
    this.sun.target.updateMatrixWorld();
    const cands = [];
    for (let i = this.dynamic.length - 1; i >= 0; i--) {
      const d = this.dynamic[i];
      d.ttl -= dt;
      if (d.ttl <= 0) { this.dynamic.splice(i, 1); continue; }
      if (d.follow) { const p = d.follow.position || d.follow.pos || d.follow; d.x = p.x; d.y = p.y + (d.offsetY || 0); d.z = p.z; }
      const k = d.fade && isFinite(d.life) ? d.ttl / d.life : 1;
      const dist2 = (d.x - focus.x) ** 2 + (d.z - focus.z) ** 2;
      cands.push({ s: d.priority * d.intensity * k / (1 + dist2 / 200), d, k });
    }
    for (const L of this.static) {
      const dist2 = (L.x - focus.x) ** 2 + (L.z - focus.z) ** 2;
      if (dist2 > 38 * 38) continue;
      const fl = 1 + Math.sin(this.t * 13 + L.seed) * L.flicker * 0.5 + Math.sin(this.t * 7.3 + L.seed * 2) * L.flicker * 0.5;
      cands.push({ s: L.intensity / (1 + dist2 / 120), d: L, k: fl * (0.3 + 0.7 * this.torch) });
    }
    cands.sort((a, b) => b.s - a.s);
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i], c = cands[i];
      if (!c) { l.intensity = 0; continue; }
      l.position.set(c.d.x, c.d.y, c.d.z);
      l.color.copy(c.d.color);
      l.distance = c.d.distance;
      l.intensity = c.d.intensity * c.k * 6;
    }
  }
}
