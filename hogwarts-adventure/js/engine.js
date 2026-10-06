// Renderer, post-processing chain, global lights and the dynamic point-light pool.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { G } from './state.js';
import { damp } from './util.js';

export const QUALITY = {
  low: { dpr: 0.85, shadow: 1024, ao: false, bloom: true, msaa: 0, particles: 0.45, lights: 4, terrainSeg: 110, grass: 0, trees: 0.5 },
  medium: { dpr: 1.3, shadow: 2048, ao: false, bloom: true, msaa: 4, particles: 0.75, lights: 7, terrainSeg: 170, grass: 0.5, trees: 0.8 },
  high: { dpr: 2, shadow: 4096, ao: true, bloom: true, msaa: 4, particles: 1, lights: 10, terrainSeg: 230, grass: 1, trees: 1 },
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 1.0 },
    saturation: { value: 1.08 },
    aberration: { value: 0.0 },
    flash: { value: 0.0 },
    tint: { value: new THREE.Color(1, 1, 1) },
    frost: { value: 0.0 },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float vignette, saturation, aberration, flash, frost, time; uniform vec3 tint;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 d = uv - 0.5; float r = length(d);
      vec3 c;
      if (aberration > 0.0001) {
        c.r = texture2D(tDiffuse, uv + d * aberration).r;
        c.g = texture2D(tDiffuse, uv).g;
        c.b = texture2D(tDiffuse, uv - d * aberration).b;
      } else c = texture2D(tDiffuse, uv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c *= tint;
      // frost creeping in from the edges (Dementors)
      float fr = frost * smoothstep(0.25, 0.75, r + h(floor(uv*240.0))*0.12);
      c = mix(c, vec3(l*0.6+0.12, l*0.7+0.16, l*0.85+0.24), fr);
      c += flash;
      float v = smoothstep(0.95, 0.32, r);
      c *= mix(1.0, v, vignette);
      // subtle film grain
      c += (h(uv * 997.0 + time) - 0.5) * 0.012;
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

export function initEngine(canvas, quality) {
  G.quality = quality;
  const Q = QUALITY[quality];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  G.renderer = renderer;

  const scene = new THREE.Scene();
  G.scene = scene;
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1800);
  G.camera = camera;
  scene.add(camera);

  // Neutral image-based lighting for metals and soft fill.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  // Global lights: one shadow-casting key light + hemisphere fill.
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  const sc = sun.shadow.camera;
  sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 260;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x3a3020, 0.8);
  scene.add(hemi);
  G.sun = sun;
  G.hemi = hemi;

  G.lights = new LightPool(scene, Q.lights);

  buildComposer();
  window.addEventListener('resize', onResize);
  return renderer;
}

function buildComposer() {
  const Q = QUALITY[G.quality];
  const r = G.renderer;
  const size = r.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: Q.msaa });
  const composer = new EffectComposer(r, rt);
  composer.addPass(new RenderPass(G.scene, G.camera));
  G.aoPass = null;
  if (Q.ao && G.settings?.ao !== false) {
    try {
      const ao = new GTAOPass(G.scene, G.camera, size.x, size.y);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.blendIntensity = 0.75;
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      // keep sprites, particles and see-through effects out of the AO depth/normal pass
      ao._overrideVisibility = function () {
        const cache = this._visibilityCache;
        this.scene.traverse((o) => {
          if (!o.visible) return;
          const m = o.material;
          if (o.isPoints || o.isLine || o.isSprite || (m && !Array.isArray(m) && (m.transparent || m.depthWrite === false))) {
            o.visible = false;
            cache.push(o);
          }
        });
      };
      composer.addPass(ao);
      G.aoPass = ao;
    } catch (e) {
      console.warn('GTAO unavailable', e);
    }
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.5, 0.5, 1.0);
  composer.addPass(bloom);
  G.bloom = bloom;
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  G.grade = grade;
  composer.addPass(new OutputPass());
  if (G.composer) G.composer.dispose();
  G.composer = composer;
}

export function setQuality(q) {
  if (!QUALITY[q]) return;
  G.quality = q;
  const Q = QUALITY[q];
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr));
  G.sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  if (G.sun.shadow.map) {
    G.sun.shadow.map.dispose();
    G.sun.shadow.map = null;
  }
  buildComposer();
  onResize();
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  G.camera.aspect = w / h;
  G.camera.updateProjectionMatrix();
  G.renderer.setSize(w, h);
  const s = G.renderer.getDrawingBufferSize(new THREE.Vector2());
  G.composer.setSize(w, h);
  if (G.aoPass) G.aoPass.setSize(s.x, s.y);
}

// Post FX state, driven by gameplay (hits, slow-mo, dementors).
const fxState = { flash: 0, aberr: 0, desat: 0, frost: 0, frostTarget: 0 };
export function postHit(strength = 1) {
  fxState.aberr = Math.max(fxState.aberr, 0.012 * strength);
  fxState.flash = Math.max(fxState.flash, 0.05 * strength);
}
export function postFlash(v = 0.3) { fxState.flash = Math.max(fxState.flash, v); }
export function setFrost(v) { fxState.frostTarget = v; }
export function updatePost(dt, realDt) {
  const u = G.grade.uniforms;
  fxState.flash = damp(fxState.flash, 0, 8, realDt);
  fxState.aberr = damp(fxState.aberr, 0, 6, realDt);
  fxState.frost = damp(fxState.frost, fxState.frostTarget, 2.5, realDt);
  const slow = G.slowmo > 0 ? 1 : 0;
  fxState.desat = damp(fxState.desat, slow, 6, realDt);
  u.flash.value = fxState.flash;
  u.aberration.value = fxState.aberr + fxState.desat * 0.004;
  u.saturation.value = 1.08 - fxState.desat * 0.55 - fxState.frost * 0.5;
  u.frost.value = fxState.frost;
  u.time.value = G.realTime % 100;
}

// A fixed number of point lights reused everywhere: dynamic flashes (spells,
// impacts, Lumos) first, then the static torches/candles nearest the player.
// Keeping the count constant avoids shader recompiles.
export class LightPool {
  constructor(scene, n) {
    this.lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      l.castShadow = false;
      scene.add(l);
      this.lights.push(l);
    }
    this.dynamic = []; // {pos, color, intensity, distance, life, maxLife, follow}
    this.anchors = [];
    this.sorted = [];
    this.sortTimer = 0;
  }
  setAnchors(list) {
    this.anchors = list || [];
    this.sortTimer = 0;
  }
  flash(pos, color, intensity = 30, distance = 10, life = 0.3) {
    const d = { pos: pos.clone(), color: new THREE.Color(color), intensity, distance, life, maxLife: life };
    this.dynamic.push(d);
    if (this.dynamic.length > 6) this.dynamic.shift();
    return d;
  }
  // persistent light that follows an object; return handle with .release()
  attach(obj, color, intensity, distance) {
    const d = { obj, pos: new THREE.Vector3(), color: new THREE.Color(color), intensity, distance, life: Infinity, maxLife: Infinity };
    this.dynamic.push(d);
    d.release = () => { d.life = 0; };
    return d;
  }
  update(dt, focus) {
    for (const d of this.dynamic) {
      d.life -= dt;
      if (d.obj) d.obj.getWorldPosition(d.pos);
    }
    this.dynamic = this.dynamic.filter((d) => d.life > 0);
    this.sortTimer -= dt;
    if (this.sortTimer <= 0) {
      this.sortTimer = 0.3;
      for (const a of this.anchors) a._d = a.pos.distanceToSquared(focus);
      this.sorted = this.anchors.slice().sort((a, b) => a._d - b._d);
    }
    let i = 0;
    const L = this.lights;
    const nDyn = Math.min(this.dynamic.length, Math.max(1, Math.floor(L.length / 2)));
    for (let k = this.dynamic.length - nDyn; k < this.dynamic.length && i < L.length; k++, i++) {
      const d = this.dynamic[k];
      const f = d.maxLife === Infinity ? 1 : Math.max(0, d.life / d.maxLife);
      L[i].position.copy(d.pos);
      L[i].color.copy(d.color);
      L[i].intensity = d.intensity * f;
      L[i].distance = d.distance;
    }
    const t = G.realTime;
    for (let k = 0; i < L.length; k++, i++) {
      const a = this.sorted[k];
      if (!a) {
        L[i].intensity = 0;
        continue;
      }
      L[i].position.copy(a.pos);
      L[i].color.set(a.color);
      const fl = a.flicker ? 0.82 + 0.18 * Math.sin(t * 13 + k * 7.1) * Math.sin(t * 7.3 + k) : 1;
      // fade by distance so lights do not pop when the nearest set changes
      const fade = Math.max(0, Math.min(1, (60 * 60 - a._d) / (25 * 25)));
      L[i].intensity = a.intensity * fl * fade * (a.scale ?? 1);
      L[i].distance = a.distance;
    }
  }
}
