// Renderer bootstrap: GPU/feature detection, automatic quality tier,
// WebGPURenderer (WebGPU backend, falling back to WebGL2), and the
// per-tier post-processing chain built from three.js TSL nodes.
import * as THREE from 'three/webgpu';
import {
  pass, mrt, output, normalView, metalness, roughness, diffuseColor, velocity, emissive,
  vec2, vec3, vec4, float, uniform, sample, packNormalToRGB, unpackRGBToNormal, renderOutput,
  screenUV, mix, luminance, smoothstep, length, clamp, step, max, min, sin, add, dot, normalize,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { ao as gtao } from 'three/addons/tsl/display/GTAONode.js';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { sharpen } from 'three/addons/tsl/display/SharpenNode.js';
import { motionBlur } from 'three/addons/tsl/display/MotionBlur.js';
import { isMobile } from '../util.js';

export const QUALITY_ORDER = ['low', 'medium', 'high', 'ultra'];
export const QUALITY_LABEL = { low: 'Low / Mobile', medium: 'Medium', high: 'High', ultra: 'Ultra · Ray Traced' };

// Tier presets. Everything the rest of the game needs to know lives here.
export const PRESETS = {
  low: { pixelRatio: 0.7, maxPR: 1, shadows: false, shadowSize: 0, pointLights: 2, pointShadows: 0, bloom: 0.35, ao: false, ssr: false, ssgi: false, fxaa: false, traa: false, shafts: false, particles: 1200, enemyCap: 14, bake: 1.0, fogDetail: 0, decoDensity: 0.4 },
  medium: { pixelRatio: 1, maxPR: 1.25, shadows: true, shadowSize: 1024, shadowType: 'pcf', pointLights: 6, pointShadows: 0, bloom: 0.6, ao: false, ssr: false, ssgi: false, fxaa: true, traa: false, shafts: false, particles: 3000, enemyCap: 24, bake: 0.55, fogDetail: 1, decoDensity: 0.7 },
  high: { pixelRatio: 1, maxPR: 1.5, shadows: true, shadowSize: 2048, shadowType: 'pcf', pointLights: 16, pointShadows: 1, bloom: 0.8, ao: true, ssr: 'water', ssgi: false, fxaa: true, traa: false, shafts: true, particles: 6000, enemyCap: 36, bake: 0.4, fogDetail: 2, decoDensity: 1 },
  ultra: { pixelRatio: 1, maxPR: 2, shadows: true, shadowSize: 4096, shadowType: 'vsm', pointLights: 48, pointShadows: 2, bloom: 0.9, ao: true, ssr: 'all', ssgi: true, fxaa: false, traa: true, shafts: true, particles: 12000, enemyCap: 48, bake: 0.25, fogDetail: 3, decoDensity: 1, clustered: true },
};

// Compatibility shim: some Chromium builds reject the default 'rgba'
// component-swizzle string three.js puts on every texture view.
if (typeof GPUTexture !== 'undefined' && !GPUTexture.prototype.__cdPatched) {
  const orig = GPUTexture.prototype.createView;
  GPUTexture.prototype.createView = function (d) {
    if (d && d.swizzle === 'rgba') { const { swizzle, ...rest } = d; return orig.call(this, rest); }
    return orig.call(this, d);
  };
  GPUTexture.prototype.__cdPatched = true;
}

// ------------------------------------------------------------ detection
export async function detectGPU() {
  const info = { webgpu: false, webgl2: false, vendor: '', renderer: '', arch: '', mobile: isMobile, software: false, discrete: false, tier: 'medium' };
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (adapter) {
        info.webgpu = true;
        const ai = adapter.info || {};
        info.vendor = ai.vendor || ''; info.arch = ai.architecture || ''; info.gpuDesc = ai.description || '';
        info.software = !!ai.isFallbackAdapter;
        info.maxTex = adapter.limits?.maxTextureDimension2D;
        info.features = [...adapter.features];
      }
    } catch (e) { /* no adapter */ }
  }
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (gl) {
      info.webgl2 = true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      info.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      if (!info.vendor) info.vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : '';
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch (e) { /* ignore */ }
  const s = (info.renderer + ' ' + info.vendor + ' ' + info.arch + ' ' + (info.gpuDesc || '')).toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|basic render|microsoft basic|software/.test(s)) info.software = true;
  info.discrete = /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|rx \d{3,4}|arc a\d|amd radeon\(tm\) rx|apple m\d (pro|max|ultra)/.test(s);
  const integrated = /intel|uhd|iris|radeon\(tm\) graphics|vega \d+ graphics|apple m1\b|mali|adreno|powervr|apple gpu/.test(s);
  if (info.software) info.tier = 'low';
  else if (info.mobile) info.tier = (info.webgpu && /apple/.test(s) && !/iphone/i.test(navigator.userAgent)) ? 'medium' : 'low';
  else if (info.discrete && info.webgpu) info.tier = 'ultra';
  else if (info.discrete) info.tier = 'high';
  else if (/apple/.test(s)) info.tier = info.webgpu ? 'high' : 'medium';
  else if (integrated) info.tier = 'medium';
  else info.tier = info.webgpu ? 'high' : 'medium';
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2 && info.tier !== 'low') info.tier = 'low';
  info.name = (info.gpuDesc || info.renderer || info.vendor || 'Unknown GPU').replace(/^ANGLE \(|\)$/g, '').slice(0, 64);
  return info;
}

// ------------------------------------------------------------ grading uniforms
export const Grade = {
  tint: uniform(new THREE.Color(1, 1, 1)),
  lift: uniform(new THREE.Color(0, 0, 0)),
  saturation: uniform(1.05),
  contrast: uniform(1.08),
  vignette: uniform(0.35),
  flash: uniform(new THREE.Vector4(1, 1, 1, 0)),     // rgb + amount
  blackFlash: uniform(0),                             // red/black inversion
  dim: uniform(0),                                    // screen dimming (Hollow Purple)
  wave: uniform(new THREE.Vector4(0.5, 0.5, 0, 0)),   // screen-space shockwave: x,y,radius,strength
  dofAmount: uniform(0),
  dofFocus: uniform(20),
  bloomStrength: uniform(0.8),
  chroma: uniform(0),
};

export class GameRenderer {
  constructor() {
    this.info = null; this.quality = 'medium'; this.preset = PRESETS.medium;
    this.renderer = null; this.pipeline = null; this.scene = null; this.camera = null;
    this.scale = 1; this.fpsSamples = []; this.fps = 60; this.targetFps = isMobile ? 30 : 60;
    this.lastScaleChange = 0; this.dynRes = true;
  }
  async init(canvasParent, { forceWebGL = false, quality = 'auto' } = {}) {
    this.info = await detectGPU();
    const useWebGPU = this.info.webgpu && !forceWebGL;
    const r = new THREE.WebGPURenderer({ antialias: false, forceWebGL: !useWebGPU, powerPreference: 'high-performance' });
    r.setSize(window.innerWidth, window.innerHeight);
    await r.init();
    this.backend = r.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
    r.toneMapping = THREE.AgXToneMapping;
    r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true;
    canvasParent.appendChild(r.domElement);
    this.renderer = r;
    this.setQualityPreset(quality === 'auto' ? this.info.tier : quality, false);
    return this;
  }
  setQualityPreset(q, rebuild = true) {
    if (!PRESETS[q]) q = 'medium';
    // WebGPU-only extras degrade gracefully on WebGL2
    this.quality = q;
    this.preset = { ...PRESETS[q] };
    if (this.backend !== 'WebGPU') { this.preset.clustered = false; if (q === 'ultra') this.preset.pointLights = 24; }
    const r = this.renderer;
    r.shadowMap.enabled = this.preset.shadows;
    r.shadowMap.type = this.preset.shadowType === 'vsm' ? THREE.VSMShadowMap : THREE.PCFShadowMap;
    this.scale = 1;
    this.applyPixelRatio();
    Grade.bloomStrength.value = this.preset.bloom;
    if (rebuild && this.scene) this.buildPipeline();
  }
  applyPixelRatio() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.preset.maxPR);
    this.pixelRatio = Math.max(0.35, dpr * this.preset.pixelRatio * this.scale);
    this.renderer.setPixelRatio(this.pixelRatio);
  }
  setScene(scene, camera) { this.scene = scene; this.camera = camera; this.buildPipeline(); }
  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.applyPixelRatio();
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  buildPipeline() {
    const { scene, camera, renderer } = this;
    const P = this.preset;
    if (this.pipeline) this.pipeline.dispose?.();
    const pipeline = new THREE.RenderPipeline(renderer);
    pipeline.outputColorTransform = false;
    const scenePass = pass(scene, camera);
    this.scenePass = scenePass;
    const needNormals = P.ao || P.ssr || P.ssgi;
    const outputs = { output };
    // normal.rgb + roughness in alpha keeps the G-buffer within WebGPU's 32-byte limit
    if (needNormals) outputs.normal = vec4(packNormalToRGB(normalView), roughness);
    if (P.ssgi) outputs.diffuse = diffuseColor;
    if (P.traa || this.motionBlur) outputs.velocity = velocity;
    if (Object.keys(outputs).length > 1) scenePass.setMRT(mrt(outputs));
    if (outputs.normal) scenePass.getTexture('normal').type = THREE.UnsignedByteType;
    if (outputs.diffuse) scenePass.getTexture('diffuse').type = THREE.UnsignedByteType;

    const colorTex = scenePass.getTextureNode('output');
    const depthTex = scenePass.getTextureNode('depth');
    // screen-space shockwave distortion (Black Flash etc.) applied on the beauty pass
    const W = Grade.wave;
    const aspect = vec2(screenUV.x.sub(W.x).mul(renderer.domElement.width / Math.max(1, renderer.domElement.height)), screenUV.y.sub(W.y));
    const d = length(aspect);
    const ring = smoothstep(0.09, 0.0, d.sub(W.z).abs()).mul(W.w);
    const warpUV = screenUV.sub(normalize(aspect.add(vec2(1e-5))).mul(ring).mul(0.05));
    let color = colorTex.sample(warpUV);
    // chromatic split for heavy hits
    const ch = Grade.chroma.mul(0.006);
    color = vec4(colorTex.sample(warpUV.add(vec2(ch, 0))).r, color.g, colorTex.sample(warpUV.sub(vec2(ch, 0))).b, color.a);

    let normalNode = null;
    if (needNormals) {
      const nTex = scenePass.getTextureNode('normal');
      normalNode = sample((u) => unpackRGBToNormal(nTex.sample(u).rgb));
    }
    if (P.ssgi) {
      const gi = ssgi(colorTex, depthTex, normalNode, camera);
      gi.sliceCount.value = 2; gi.stepCount.value = 8;
      this.giPass = gi;
      const diffuse = scenePass.getTextureNode('diffuse');
      const aoN = gi.getAONode(), giN = gi.getGINode();
      color = vec4(add(color.rgb.mul(aoN), diffuse.rgb.mul(giN.rgb).mul(1.4)), color.a);
    } else if (P.ao) {
      const aoPass = gtao(depthTex, normalNode, camera);
      aoPass.resolutionScale = 0.5;
      aoPass.radius.value = 0.6; aoPass.thickness.value = 1;
      color = vec4(color.rgb.mul(aoPass.getTextureNode().r.mul(0.85).add(0.15)), color.a);
    }
    if (P.ssr) {
      const rough = scenePass.getTextureNode('normal').a;
      // only glossy surfaces (water, wet asphalt, polished stone) reflect
      const s = ssr(colorTex, depthTex, normalNode, { metalnessNode: smoothstep(0.55, 0.08, rough), roughnessNode: rough, camera });
      s.quality.value = P.ssr === 'all' ? 0.6 : 0.35;
      s.maxDistance.value = P.ssr === 'all' ? 12 : 8;
      s.thickness.value = 0.02;
      s.resolutionScale = P.ssr === 'all' ? 1 : 0.5;
      color = vec4(color.rgb.add(s.rgb), color.a);
    }
    if (P.traa) {
      color = traa(color, depthTex, scenePass.getTextureNode('velocity'), camera);
    }
    if (this.motionBlur && outputs.velocity) {
      color = motionBlur(color, scenePass.getTextureNode('velocity').mul(0.6));
    }
    if (P.bloom > 0) {
      color = color.add(bloom(color, Grade.bloomStrength, 0.45, 0.72));
    }
    if (P.quality === 'ultra' || this.quality === 'ultra' || this.quality === 'high') {
      const vz = scenePass.getViewZNode();
      const dofNode = dof(color, vz, Grade.dofFocus, 6, Grade.dofAmount.mul(4));
      color = mix(color, dofNode, clamp(Grade.dofAmount, 0, 1));
    }
    // ---- tone map (AgX) + colour grading in display space
    let out = renderOutput(color);
    let c = out.rgb;
    const lum = luminance(c);
    c = mix(vec3(lum), c, Grade.saturation);
    c = c.sub(0.5).mul(Grade.contrast).add(0.5);
    c = c.mul(Grade.tint).add(Grade.lift);
    const uvc = screenUV.sub(0.5);
    const vig = smoothstep(0.35, 0.95, length(uvc.mul(vec2(1.0, 0.8))).mul(1.25));
    c = c.mul(float(1).sub(vig.mul(Grade.vignette)));
    c = c.mul(float(1).sub(Grade.dim));
    // Black Flash: posterised red on black
    const bf = vec3(step(0.32, lum), step(0.75, lum).mul(0.15), step(0.75, lum).mul(0.12)).mul(vec3(1.0, 0.9, 0.9));
    c = mix(c, bf, Grade.blackFlash);
    c = mix(c, Grade.flash.xyz, Grade.flash.w);
    out = vec4(clamp(c, 0, 1), 1);
    if (P.fxaa) out = fxaa(out);
    if (P.traa) out = sharpen(out, 0.6);
    pipeline.outputNode = out;
    this.pipeline = pipeline;
  }
  render() { this.pipeline.render(); }

  // Dynamic resolution: drop render scale before cutting effects.
  trackFps(dt, now) {
    this.fpsSamples.push(dt);
    if (this.fpsSamples.length > 60) this.fpsSamples.shift();
    const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    this.fps = 1 / Math.max(1e-4, avg);
    if (!this.dynRes || now - this.lastScaleChange < 1.5 || this.fpsSamples.length < 50) return;
    const target = this.targetFps;
    let s = this.scale;
    if (this.fps < target * 0.9 && s > 0.5) s = Math.max(0.5, s - 0.1);
    else if (this.fps > target * 1.12 && s < 1) s = Math.min(1, s + 0.05);
    if (s !== this.scale) { this.scale = s; this.applyPixelRatio(); this.lastScaleChange = now; this.fpsSamples.length = 0; }
  }
}
