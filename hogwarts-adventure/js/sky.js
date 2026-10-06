// Day/night sky dome, sun & moon lighting, fog colour, and the Great Hall's enchanted ceiling.
import * as THREE from 'three';
import { G } from './state.js';
import { smoothstep, lerp, clamp } from './util.js';

const NOISE = /* glsl */ `
  float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash2(i),hash2(i+vec2(1,0)),u.x), mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),u.x), u.y); }
  float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=vnoise(p)*a; p*=2.03; a*=0.5; } return s; }
`;

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }
`;
const skyFrag = /* glsl */ `
  uniform vec3 sunDir, moonDir, zenith, horizon, sunColor;
  uniform float night, time, cloud;
  varying vec3 vDir;
  ${NOISE}
  float stars(vec3 d){
    vec3 p = d * 260.0; vec3 c = floor(p); float h = hash(c);
    if (h < 0.9965) return 0.0;
    vec3 f = fract(p) - 0.5; float b = smoothstep(0.35, 0.0, length(f));
    return b * (0.6 + 0.4*sin(time*3.0 + h*900.0)) * (h-0.9965)*285.0;
  }
  void main(){
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 col = mix(horizon, zenith, pow(smoothstep(-0.05, 0.85, h), 0.6));
    // sun
    float sd = max(dot(d, sunDir), 0.0);
    col += sunColor * (pow(sd, 900.0) * 30.0 + pow(sd, 12.0) * 0.45 + pow(sd, 3.0) * 0.12) * (1.0 - night);
    // moon
    float md = dot(d, moonDir);
    float disc = smoothstep(0.9994, 0.9997, md);
    vec2 mp = (d.xy - moonDir.xy) * 900.0;
    float crat = 0.75 + 0.25*vnoise(mp*0.2);
    col += vec3(0.9,0.95,1.1) * disc * 6.0 * crat * night;
    col += vec3(0.35,0.45,0.75) * pow(max(md,0.0), 60.0) * 0.6 * night;
    // stars
    col += vec3(0.9,0.95,1.0) * stars(d) * night * smoothstep(0.0, 0.25, d.y) * 2.5;
    // milky band
    float band = exp(-pow(dot(d, normalize(vec3(0.3,0.5,0.8))), 2.0) * 18.0);
    col += vec3(0.12,0.12,0.22) * band * fbm(d.xz*6.0) * night * smoothstep(0.0,0.3,d.y);
    // clouds
    if (d.y > 0.0) {
      vec2 uv = d.xz / (d.y + 0.12) * 0.9 + vec2(time * 0.006, time*0.002);
      float c = fbm(uv * 1.4);
      c = smoothstep(0.48 - cloud*0.15, 0.82, c);
      vec3 lit = mix(vec3(0.95,0.93,0.9), sunColor*1.2 + 0.1, 0.45) * (1.0 - night*0.92) + vec3(0.04,0.05,0.09)*night;
      float edge = pow(max(dot(d, sunDir),0.0), 6.0);
      lit += sunColor * edge * 0.6 * (1.0-night);
      col = mix(col, lit, c * smoothstep(0.0, 0.18, d.y) * 0.85);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Sky {
  constructor(scene) {
    this.uniforms = {
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      moonDir: { value: new THREE.Vector3(0, -1, 0) },
      zenith: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sunColor: { value: new THREE.Color() },
      night: { value: 0 },
      time: { value: 0 },
      cloud: { value: 0.4 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: skyVert, fragmentShader: skyFrag,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    scene.add(this.mesh);
    this.tod = 0.68; // time of day: 0 midnight, .25 sunrise, .5 noon, .75 sunset
    this.lock = null; // forced time of day (story)
    this.sunDir = new THREE.Vector3();
    this.fogColor = new THREE.Color();
    this.tmp = new THREE.Color();
  }

  update(dt, focus) {
    const lenMin = G.settings?.dayLength ?? 12;
    if (this.lock != null) this.tod = lerp(this.tod, this.lock, 1 - Math.exp(-dt * 0.8));
    else if (lenMin > 0) this.tod = (this.tod + dt / (lenMin * 60)) % 1;
    const a = (this.tod - 0.25) * Math.PI * 2;
    const sun = this.sunDir.set(Math.cos(a) * 0.85, Math.sin(a), 0.42).normalize();
    const moon = new THREE.Vector3(-sun.x * 0.7, Math.max(0.35, -sun.y), -0.55).normalize();
    const elev = sun.y;
    const day = smoothstep(-0.12, 0.22, elev);
    const night = 1 - smoothstep(-0.18, 0.05, elev);
    const dusk = smoothstep(0.42, 0.0, Math.abs(elev)) * (1 - night * 0.6);
    G.night = night;
    G.dayF = day;
    const u = this.uniforms;
    u.sunDir.value.copy(sun);
    u.moonDir.value.copy(moon);
    u.night.value = night;
    u.time.value = G.time;
    // palette
    const zen = new THREE.Color(0.1, 0.25, 0.62).lerp(new THREE.Color(0.17, 0.12, 0.33), dusk * 0.7).lerp(new THREE.Color(0.006, 0.01, 0.03), night);
    const hor = new THREE.Color(0.6, 0.74, 0.92).lerp(new THREE.Color(1.0, 0.52, 0.26), dusk).lerp(new THREE.Color(0.03, 0.045, 0.09), night);
    u.zenith.value.copy(zen);
    u.horizon.value.copy(hor);
    const sc = new THREE.Color(1, 0.96, 0.88).lerp(new THREE.Color(1.0, 0.55, 0.25), dusk);
    u.sunColor.value.copy(sc);
    this.mesh.position.copy(G.camera.position);

    // lights (only when outdoors; zones override otherwise)
    if (G.zone?.outdoor) {
      const s = G.sun;
      const useSun = elev > -0.05;
      const ldir = useSun ? sun : moon;
      s.position.copy(focus).addScaledVector(ldir, 120);
      s.target.position.copy(focus);
      if (useSun) {
        s.color.copy(sc);
        s.intensity = 3.4 * smoothstep(-0.05, 0.15, elev);
      } else {
        s.color.setRGB(0.55, 0.66, 1.0);
        s.intensity = 0.75 * night;
      }
      G.hemi.color.copy(zen).lerp(new THREE.Color(0.7, 0.8, 1), 0.35).multiplyScalar(1 - night * 0.4);
      G.hemi.groundColor.setRGB(0.24, 0.2, 0.14).multiplyScalar(day * 0.8 + 0.25);
      G.hemi.intensity = 0.55 + day * 0.55 + night * 0.35;
      this.fogColor.copy(hor).lerp(zen, 0.15);
      if (G.scene.fog) G.scene.fog.color.copy(this.fogColor);
      G.renderer.toneMappingExposure = 1.0 + night * 0.35;
      G.scene.environmentIntensity = 0.12 + day * 0.35;
    }
  }
}

// Great Hall enchanted ceiling: drifting clouds and twinkling stars on a plane.
export function ceilingMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, night: { value: 1 } },
    fog: false,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: /* glsl */ `
      uniform float time, night; varying vec2 vUv; ${NOISE}
      void main(){
        vec2 uv = vUv * vec2(1.0, 3.0);
        vec3 day = mix(vec3(0.25,0.45,0.85), vec3(0.55,0.7,0.95), vUv.x);
        vec3 nt = mix(vec3(0.01,0.015,0.05), vec3(0.04,0.03,0.12), fbm(uv*2.0));
        vec3 col = mix(day, nt, night);
        vec2 sp = uv * 90.0; vec2 c = floor(sp); float h = hash2(c);
        float st = step(0.985, h) * smoothstep(0.45, 0.0, length(fract(sp)-0.5)) * (0.5+0.5*sin(time*2.0+h*500.0));
        col += vec3(1.0,0.97,0.9) * st * 3.0 * night;
        float cl = smoothstep(0.5, 0.85, fbm(uv*1.6 + vec2(time*0.02, time*0.008)));
        col = mix(col, mix(vec3(0.95), vec3(0.12,0.12,0.2), night), cl*0.6);
        // shooting star
        float t = fract(time*0.07); vec2 sp2 = vec2(t*1.4-0.2, 0.7 - t*0.4) * vec2(1.0,3.0);
        float d = length((uv - sp2) * vec2(1.0, 4.0));
        col += vec3(1.0,0.9,0.7) * smoothstep(0.05, 0.0, d) * 3.0 * night * step(t,0.6);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
