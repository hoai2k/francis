// Domain Expansion: a cinematic cast (hand sign, slow-mo, camera orbit,
// dimming), then the arena is rewritten — a radial shader takeover turns
// floors and walls into the domain's surface, a sky dome and environment
// grade replace the biome, and for ~8 seconds every attack is a sure hit.
import * as THREE from 'three/webgpu';
import { uniform, positionLocal, normalize, vec3, vec4, float, sin, cos, atan, mix, smoothstep, pow, abs, fract, floor, dot, max, step, length, positionWorld, positionWorldDirection } from 'three/tsl';
import { U } from './gfx/materials.js';
import { Grade } from './gfx/renderer.js';
import { DOMAINS } from './world/biomes.js';
import { toast } from './ui/ui.js';

// Sky dome shader per domain type.
function domeMaterial() {
  const type = uniform(1), fade = uniform(0);
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, transparent: true });
  const d = normalize(positionLocal);
  const t = U.time;
  // stars
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
  const col = voidCol.mul(sel(1)).add(shrineCol.mul(sel(2))).add(garden.mul(sel(3))).add(fireCol.mul(sel(4))).add(resCol.mul(sel(5)));
  m.colorNode = vec4(col, fade);
  m.userData = { type, fade };
  return m;
}

export class DomainSystem {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), domeMaterial());
    this.dome.visible = false; this.dome.frustumCulled = false; this.dome.renderOrder = -1;
    game.scene.add(this.dome);
  }
  // def: { name, key (DOMAINS key), type, duration, radius, sound, color, sureHit, onStart, onTick, onEnd }
  start(caster, def) {
    const g = this.game;
    if (this.active) return false;
    const d = { def, caster, t: 0, phase: 'cast', center: caster.pos.clone(), radius: 0 };
    this.active = d; g.domain = d;
    caster.domainActive = true;
    caster.invulnerable = true;
    caster.action = { type: 'sign', dur: 1.4, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.slowMo(1.2, 0.15);
    g.fx.dimTarget = 0.55;
    g.rig.cinematic({ center: caster.pos.clone().setY(caster.pos.y + 0.5), dur: def.duration + 1.8, dist: 15, pitch: 30 * Math.PI / 180, orbit: 0.22 });
    Grade.dofFocus.value = 15; g.targetDof = 0.3;
    g.audio?.domain(def.sound);
    toast('DOMAIN EXPANSION', 'domain');
    setTimeout(() => toast(def.name.toUpperCase(), 'domain'), 700);
    // hand-sign energy gathering
    const col = new THREE.Color(def.color ?? 0x6ad8ff);
    d.gather = 1.2;
    g.lights.flash(caster.pos.clone().setY(caster.pos.y + 1.5), col, 5, 10, 1.6, { priority: 5 });
    return true;
  }
  update(dt, realDt) {
    const d = this.active; if (!d) return;
    const g = this.game, def = d.def;
    d.t += realDt;
    const col = new THREE.Color(def.color ?? 0x6ad8ff);
    if (d.phase === 'cast') {
      // swirl of energy converging on the caster
      const c = d.caster.pos;
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 4;
        g.particles.glow.emit(c.x + Math.cos(a) * r, c.y + 0.3 + Math.random() * 2.5, c.z + Math.sin(a) * r, -Math.cos(a) * r * 1.6 - Math.sin(a) * 3, 0.4, -Math.sin(a) * r * 1.6 + Math.cos(a) * 3, 0.55, col.r * 3, col.g * 3, col.b * 3, 0.14, 0, 2.5, 0.3, 1);
      }
      if (d.t >= 1.3) {
        d.phase = 'expand'; d.t = 0;
        g.fx.flash(def.flash ?? 0xffffff, 0.6, 0.3);
        g.fx.screenWave(c.clone().setY(c.y + 1), 1.4, 0.8);
        g.shake(0.6);
        g.env.set(DOMAINS[def.key], false);
        U.domainType.value = def.type; U.domainCenter.value.copy(d.center);
        this.dome.material.userData.type.value = def.type;
        this.dome.visible = true; this.dome.position.copy(d.center); this.dome.scale.setScalar(55); this.dome.material.userData.fade.value = 0;
        d.caster.action = null; d.caster.invulnerable = false;
        g.fx.dimTarget = 0;
        def.onStart?.(g, d);
      }
      return;
    }
    if (d.phase === 'expand' || d.phase === 'hold') {
      const R = def.radius ?? 24;
      d.radius = Math.min(R, d.radius + realDt * R * 2.2);
      U.domainRadius.value = d.radius;
      this.dome.scale.setScalar(55);
      this.dome.material.userData.fade.value = Math.min(1, d.radius / R);
      if (d.phase === 'expand' && d.radius >= R) { d.phase = 'hold'; d.t = 0; }
      if (d.phase === 'hold') {
        def.onTick?.(g, d, dt);
        if (d.t >= def.duration) { d.phase = 'collapse'; d.t = 0; g.fx.flash(0x000000, 0.5, 0.25); g.env.set(g.biome, false); def.onEnd?.(g, d); g.targetDof = 0; }
      }
    } else if (d.phase === 'collapse') {
      const R = def.radius ?? 24;
      d.radius = Math.max(0, d.radius - realDt * R * 2.5);
      U.domainRadius.value = d.radius;
      this.dome.material.userData.fade.value = d.radius / R;
      if (d.radius <= 0) this.end();
    }
  }
  end() {
    const g = this.game, d = this.active;
    if (!d) return;
    if (d.phase !== 'collapse') { g.env.set(g.biome, false); d.def.onEnd?.(g, d); }
    U.domainType.value = 0; U.domainRadius.value = 0;
    this.dome.visible = false;
    d.caster.domainActive = false; d.caster.invulnerable = false;
    g.frozen = false; g.fx.dimTarget = 0; g.targetDof = 0;
    this.active = null; g.domain = null;
  }
  inside(pos) { const d = this.active; return d && d.phase !== 'cast' && Math.hypot(pos.x - d.center.x, pos.z - d.center.z) < d.radius; }
  sureHit(player) { const d = this.active; return d && d.phase === 'hold' && d.caster === player && d.def.sureHit !== false; }
}
