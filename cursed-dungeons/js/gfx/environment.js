// Environment controller: time of day, sky dome + voxel clouds, fog with sun
// scattering, sun/moon light and shadows, hemisphere ambient, the reflection
// probe, colour grading, foliage and sun shafts, per region. Domain
// Expansions override the look and blend back when they end.
//
// ------------------------------------------------------------------ API for region builders
//   biome.look = {                       put this on the region's biome object (world/biomes.js shape);
//                                        env.set(biome) applies it when the region loads
//     timeOfDay: 'cycle' | 17.2 | 'night' | 'golden' | 'day' | 'dawn' | 'dusk' | 'sunset' | 'noon',
//                                        a number or preset name pins the clock (Shibuya: 'night'),
//                                        'cycle' (default) lets it run
//     start: 17.2,                       hour to start at when cycling and arriving from a pinned region
//     dayLength: 1500,                   real seconds per day while cycling
//     sunAzimuth: 0,                     degrees, rotates the sun's path (which side the shadows fall)
//     palette: { skyTop, skyHorizon, fog, sun, hemiSky, hemiGround },
//                                        hex colours as they should look at NOON; every other hour is
//                                        tinted by the same ratio (so dusk/night keep the region's hue)
//     fog: { density: 0.0075, start: 34, height: 10, heightDensity: 0.04, sun: 0.7, color },
//                                        distance haze, extra ground haze below `height`, glow towards the sun
//     clouds: { coverage: 0.45, height: 84, speed: 1.6, shadows: 0.24, thickness: 5, enabled: true, tint },
//     grade: { tint: [r,g,b], lift: [r,g,b], sat, contrast, vignette, warmth, shadows: [r,g,b], highlights: [r,g,b] },
//     sun: 1, ambient: 1, exposure: 1,   multipliers
//     torch: null,                       force the lantern weight (0..1), e.g. 1 for always-lit interiors
//     foliage: { …rules } | false,       game.foliage rules for this region (see gfx/foliage.js), false = none
//     shafts: true,                      automatic sun shafts under tree canopies
//     abyss: true,                       sky below the horizon fades to a void (floating levels)
//     wind: 1,
//   }
//   game.env.setRegionLook(look, instant = false)   change the current look at runtime (merges)
//   game.env.setBlend(biome, k)                     the seamless world (world/seamless.js): mix in the
//                                                   neighbouring region's look by k (0..0.5 at the border)
//                                                   as you walk towards it; null / 0 = none
//   game.env.set(biome, { seamless: true })         cross into that region with no jump (keeps the clock)
//   game.timeOfDay  (gfx/timeOfDay.js)              .hour, .set(h), .pin(h|null), .isNight
//   game.foliage    (gfx/foliage.js)                .populate(world, rules) — also automatic from
//                                                   L.foliage or biome.look.foliage when a world loads
//   L.shafts.addAuto(world, { count })              (world/shafts.js) is called automatically too
import * as THREE from 'three/webgpu';
import { positionWorld, cameraPosition, normalize, dot, max, pow, mix, vec3, vec4, float, exp, smoothstep, clamp, output, positionView } from 'three/tsl';
import { Grade } from './renderer.js';
import { E } from './envNodes.js';
import { Sky } from './sky.js';
import { Foliage } from './foliage.js';
import { TimeOfDay, hourOf } from './timeOfDay.js';
import { U } from './materials.js';

const BASE_EXPOSURE = 1.12;
const _c = new THREE.Color(), _v = new THREE.Vector3(), _v2 = new THREE.Color();

const arr3 = (a, d) => (Array.isArray(a) ? new THREE.Color(a[0], a[1], a[2]) : a != null ? new THREE.Color(a) : d.clone());

export class Environment {
  constructor(scene, lights, game) {
    this.scene = scene; this.lights = lights;
    this.game = game ?? (typeof window !== 'undefined' ? window.__game : null);
    this.tod = new TimeOfDay();
    this.sky = new Sky(scene);
    this.foliage = new Foliage(scene);
    if (this.game) {
      this.game.timeOfDay = this.tod;
      this.game.foliage = this.foliage;
      if (this.game.materials) this.game.materials.foliage = this.foliage;
    }
    // compatibility: photo mode / older code read these
    this.skyTop = E.skyTop; this.skyHor = E.skyHor;
    this.fog = { color: E.fogColor.value, density: 0.008 };
    scene.fog = null;
    scene.fogNode = this.makeFogNode();
    this.biome = null; this.look = this.resolve({});
    this.override = null; this.ovK = 0; this.ovTarget = 0;
    this.world = null;
    this.probeHour = -99; this.probeRT = null; this.pmrem = null; this.renderer = null;
    this.state = this.blank();
    this.state2 = this.blank();
    this.tod2 = new TimeOfDay();            // the neighbouring region's sky (blend)
    this.freeHour = this.tod.hour;          // the running clock, even while a region pins its hour
    this.blend = null;                      // { biome, look, k }
    this.Sb = null;
    this.sky.setClouds({ ...this.look.clouds });
  }

  // ---------------------------------------------------------------- fog
  makeFogNode() {
    const viewZ = positionView.z.negate();
    const dir = normalize(positionWorld.sub(cameraPosition));
    const sunAmt = pow(max(dot(dir, E.sunDir), 0), 6).mul(E.fogSun);
    const col = mix(vec3(E.fogColor), vec3(E.fogColor).mul(0.6).add(vec3(E.sunColor).mul(0.22)), clamp(sunAmt, 0, 1));
    const dist = float(1).sub(exp(E.fogDensity.mul(max(viewZ.sub(E.fogStart), 0)).pow(2).negate()));
    const low = clamp(E.fogHeight.sub(positionWorld.y).div(6), 0, 1).mul(float(1).sub(exp(viewZ.mul(E.fogHeightDensity).negate())));
    const f = clamp(dist.add(low), 0, 0.92);
    return vec4(mix(output.rgb, col, f), output.a);
  }

  // ---------------------------------------------------------------- looks
  resolve(b) {
    const L = b.look ?? {};
    const P = L.palette ?? {};
    // palette colours are what the region should look like at its reference hour
    // (the pinned hour, or noon when cycling); other hours keep the same ratio
    const pinned = hourOf(L.timeOfDay);
    const ref = new TimeOfDay(); ref.sunAzimuth = 0; ref.pin(pinned ?? 12.5);
    const R0 = ref.state;
    const REF = { skyTop: R0.top, skyHorizon: R0.hor, fog: R0.fog, sun: R0.sun, hemiSky: R0.hs, hemiGround: R0.hg };
    const ratio = (hex, key) => {
      if (hex == null) return null;
      const c = new THREE.Color(hex), n = REF[key];
      const f = (a, d) => Math.min(5, Math.max(0.15, a / Math.max(0.01, d)));
      return new THREE.Color(f(c.r, n.r), f(c.g, n.g), f(c.b, n.b));
    };
    const g = { ...(b.grade ?? {}), ...(L.grade ?? {}) };
    return {
      pinned: pinned != null, timeOfDay: L.timeOfDay ?? 'cycle', start: L.start ?? null, dayLength: L.dayLength ?? 1500, sunAzimuth: L.sunAzimuth ?? 0,
      tint: { skyTop: ratio(P.skyTop, 'skyTop'), skyHor: ratio(P.skyHorizon, 'skyHorizon'), fog: ratio(P.fog, 'fog'), sun: ratio(P.sun, 'sun'), hs: ratio(P.hemiSky, 'hemiSky'), hg: ratio(P.hemiGround, 'hemiGround') },
      fog: { density: L.fog?.density ?? 0.0075, start: L.fog?.start ?? 34, height: L.fog?.height ?? -1e3, heightDensity: L.fog?.heightDensity ?? 0, sun: L.fog?.sun ?? 0.7, color: L.fog?.color != null ? new THREE.Color(L.fog.color) : null },
      clouds: { coverage: 0.45, height: 84, speed: 1.6, shadows: 0.24, thickness: 5, enabled: true, ...(L.clouds ?? {}) },
      grade: {
        tint: arr3(g.tint, new THREE.Color(1, 1, 1)), lift: arr3(g.lift, new THREE.Color(0, 0, 0)),
        sat: g.sat ?? 1.04, contrast: g.contrast ?? 1.06, vignette: Math.min(g.vignette ?? 0.24, 0.32), warmth: g.warmth ?? 0,
        shadows: g.shadows ? arr3(g.shadows) : null, highlights: g.highlights ? arr3(g.highlights) : null,
      },
      sun: L.sun ?? 1, ambient: L.ambient ?? 1, exposure: L.exposure ?? 1, torch: L.torch ?? null,
      foliage: L.foliage, shafts: L.shafts ?? true, abyss: L.abyss ?? true, wind: L.wind ?? b.wind ?? 1,
    };
  }
  applyLook(look, { arriving = false, seamless = false } = {}) {
    const prevPinned = this.tod.pinned != null;
    this.look = look;
    this.tod.dayLength = look.dayLength;
    this.tod.sunAzimuth = look.sunAzimuth;
    const h = hourOf(look.timeOfDay);
    if (h != null) this.tod.pin(h);
    else if (seamless) { this.tod.pin(null); this.tod.set(this.freeHour); }   // walking in: the clock you saw from the border
    else { this.tod.pin(null); if (look.start != null && (prevPinned || arriving)) this.tod.set(look.start); }
    this.applyUserTime();
    const c = look.clouds;
    const o = this.sky.opts;
    // (walking over a border keeps the cloud layer you can see: rebuilding it would pop)
    if (seamless && this.sky.mesh) { /* keep */ }
    else if (c.coverage !== o.coverage || c.height !== o.height || c.thickness !== o.thickness || c.seed !== o.seed || !this.sky.mesh) this.sky.setClouds({ ...c });
    else Object.assign(o, c);
    this.sky.cloudTint.value.copy(c.tint != null ? new THREE.Color(c.tint) : new THREE.Color(1, 1, 1));
    E.abyss.value = look.abyss ? 1 : 0;
    U.wind.value = look.wind;
  }
  // settings: a player-chosen time overrides the region's
  applyUserTime() {
    const st = this.game?.settings ?? {};
    const t = st.timeOfDay ?? 'auto';
    if (t !== 'auto' && hourOf(t) != null) this.tod.pin(hourOf(t));
    else if (t === 'auto') { const h = hourOf(this.look.timeOfDay); this.tod.pin(h); }
    this.tod.speed = st.daySpeed ?? 1;
    this.sky.enabled = (st.clouds ?? true) && this.look.clouds.enabled !== false && (this.game?.gr?.preset?.clouds ?? true);
  }
  setRegionLook(look, instant = false) {
    const b = { ...(this.biome ?? {}), look: { ...(this.biome?.look ?? {}), ...look } };
    this.biome = b;
    this.applyLook(this.resolve(b));
    void instant;
  }

  // Region biome or Domain Expansion look (legacy API used by main.js / domain.js).
  set(b, instant = true) {
    if (!b) return;
    const seamless = typeof instant === 'object' && !!instant?.seamless;
    if (typeof instant === 'object') instant = !seamless;
    if (b.__domain || !('name' in b) && b.floor && !b.look) {
      this.override = this.snapshot(b); this.ovTarget = 1;
      if (instant) this.ovK = 1;
      return;
    }
    this.ovTarget = 0; if (instant) this.ovK = 0;
    if (b !== this.biome) {
      this.biome = b;
      this.applyLook(this.blend?.biome === b ? this.blend.look : this.resolve(b), { arriving: !seamless, seamless });
    }
    if (!seamless) { this.blend = null; this.attachWorld(); this.update(0); }
  }
  // Mix in another region's look (the neighbour you are walking towards) by k in 0..1.
  setBlend(biome, k = 0) {
    if (!biome || k <= 0.0005) { this.blend = null; return; }
    if (this.blend?.biome !== biome) this.blend = { biome, look: this.resolve(biome), k };
    this.blend.k = Math.min(1, k);
  }
  // the seamless world made another tile current: its foliage layer is already there
  adoptWorld(W) { this.world = W; }
  snapshot(b) {
    const g = b.grade ?? {};
    return {
      top: new THREE.Color(b.skyTop), hor: new THREE.Color(b.skyHorizon), fog: new THREE.Color(b.fog), fogD: b.fogDensity ?? 0.02,
      hs: new THREE.Color(b.hemiSky), hg: new THREE.Color(b.hemiGround), hi: b.hemiI ?? 1, sun: new THREE.Color(b.sun), sunI: b.sunI ?? 1,
      tint: arr3(g.tint, new THREE.Color(1, 1, 1)), lift: arr3(g.lift, new THREE.Color(0, 0, 0)), sat: g.sat ?? 1, contrast: g.contrast ?? 1.1, vignette: g.vignette ?? 0.4,
    };
  }
  // the world just loaded: grow its foliage and sun shafts
  attachWorld() {
    const g = this.game, L = g?.level, W = L?.world;
    if (!W || W === this.world) return;
    this.world = W;
    const rules = L.foliage ?? this.look.foliage;
    if (rules === false) this.foliage.clear();
    else this.foliage.populate(W, rules ?? {});
    this.syncQuality();
    const focus = L.spawn ?? { x: W.sx / 2, z: W.sz / 2 };
    E.focus.value.set(focus.x, focus.y ?? 0, focus.z);
    this.foliage.prime(focus);
    const P = g.gr?.preset ?? {};
    if (this.look.shafts !== false && P.sunShafts > 0 && L.shafts?.addAuto) {
      try { L.shafts.addAuto(W, { count: P.sunShafts }); } catch (e) { console.warn('sun shafts', e); }
    }
  }
  syncQuality() {
    const g = this.game, P = g?.gr?.preset ?? {};
    const st = g?.settings ?? {};
    const user = st.foliage == null || st.foliage === 'auto' ? 1 : Number(st.foliage);
    this.foliage.setDensity(P.foliage ?? 0.5, isFinite(user) ? user : 1);
    E.foliageFade.value = P.foliageFade ?? 40;
    this.quality = g?.gr?.quality;
    this.applyUserTime();
  }

  blank() {
    return { top: new THREE.Color(), hor: new THREE.Color(), fog: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), sun: new THREE.Color(), tint: new THREE.Color(), lift: new THREE.Color(), sh: new THREE.Color(), hl: new THREE.Color() };
  }

  // ---------------------------------------------------------------- per frame
  // One region's look at one sky sample -> colours in F, the scalars returned.
  compose(look, S, F) {
    const night = 1 - S.day;
    const T = look.tint;
    const tk = (c, r, k = 1) => { if (r) { _c.setRGB(1 + (r.r - 1) * k, 1 + (r.g - 1) * k, 1 + (r.b - 1) * k); c.multiply(_c); } return c; };
    const tintK = look.pinned ? 1 : 1 - night * 0.45;
    tk(F.top.copy(S.top), T.skyTop, tintK); tk(F.hor.copy(S.hor), T.skyHor, tintK);
    if (look.fog.color) F.fog.copy(look.fog.color).lerp(S.fog, night * 0.6); else tk(F.fog.copy(S.fog), T.fog, tintK);
    tk(F.sun.copy(S.sun), T.sun, tintK); tk(F.hs.copy(S.hs), T.hs, tintK); tk(F.hg.copy(S.hg), T.hg, tintK);
    const G = look.grade;
    F.tint.copy(S.tint).multiply(G.tint);
    if (G.warmth) F.tint.multiply(_c.setRGB(1 + G.warmth * 0.06, 1, 1 - G.warmth * 0.08));
    F.lift.copy(G.lift);
    // split toning: cool shadows / warm highlights in the golden hour, blue nights
    F.sh.setRGB(1, 1, 1).lerp(_c.setRGB(0.96, 0.985, 1.04), S.golden).lerp(_c.setRGB(0.9, 0.95, 1.1), night * 0.8);
    F.hl.setRGB(1, 1, 1).lerp(_c.setRGB(1.06, 1.0, 0.9), S.golden);
    if (G.shadows) F.sh.multiply(G.shadows);
    if (G.highlights) F.hl.multiply(G.highlights);
    return {
      sunI: S.sunI * look.sun, hi: S.hi * look.ambient, fogD: look.fog.density * (1 + night * 0.25),
      sat: S.sat * G.sat, contrast: G.contrast, vignette: G.vignette,
      exposure: BASE_EXPOSURE * S.exp * look.exposure, torch: look.torch ?? S.torch,
      fogStart: look.fog.start, fogHeight: look.fog.height, fogHD: look.fog.heightDensity, fogSun: look.fog.sun * (0.35 + 0.65 * S.day),
      day: S.day, golden: S.golden, stars: S.stars, clouds: look.clouds.shadows ?? 0.24, wind: look.wind,
    };
  }
  // the sky sample mixed between two clocks (for the sky dome, sun disc, shadows)
  mixSample(A, Bs, k) {
    const M = this.Sb ??= { sunDir: new THREE.Vector3(), lightDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), sun: new THREE.Color(), top: new THREE.Color(), hor: new THREE.Color(), fog: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), tint: new THREE.Color() };
    for (const key of ['sunDir', 'lightDir', 'moonDir']) M[key].copy(A[key]).lerp(Bs[key], k).normalize();
    for (const key of ['sun', 'top', 'hor', 'fog', 'hs', 'hg', 'tint']) M[key].copy(A[key]).lerp(Bs[key], k);
    for (const key of ['sunEl', 'sunI', 'hi', 'exp', 'stars', 'torch', 'sat', 'day', 'golden']) M[key] = A[key] + (Bs[key] - A[key]) * k;
    M.moon = k < 0.5 ? A.moon : Bs.moon;
    return M;
  }
  update(realDt) {
    const g = this.game;
    const dt = g?.paused ? 0 : realDt;
    if (g?.gr && g.gr.quality !== this.quality) this.syncQuality();
    this.tod.update(dt);
    // the free clock keeps running while a region pins its hour (what a cycling neighbour shows)
    if (this.tod.pinned == null) this.freeHour = this.tod.hour;
    else if (dt && this.tod.speed) { const nightNow = this.freeHour > 19.15 || this.freeHour < 5.4; this.freeHour = (this.freeHour + dt * (24 / this.tod.dayLength) * this.tod.speed * (nightNow ? this.tod.nightSpeed : 1)) % 24; }
    let S = this.tod.sample();
    const look = this.look, F = this.state;
    const v = this.compose(look, S, F);
    // the neighbouring region's look, mixed in near the border (seamless world)
    const Bl = this.blend;
    if (Bl && Bl.k > 0) {
      const t2 = this.tod2, lb = Bl.look, st = this.game?.settings ?? {};
      t2.sunAzimuth = lb.sunAzimuth;
      const user = st.timeOfDay && st.timeOfDay !== 'auto' ? hourOf(st.timeOfDay) : null;
      t2.hour = user ?? hourOf(lb.timeOfDay) ?? this.freeHour;
      const S2 = t2.sample(), F2 = this.state2, k = Bl.k;
      const v2 = this.compose(lb, S2, F2);
      for (const key of ['top', 'hor', 'fog', 'sun', 'hs', 'hg', 'tint', 'lift', 'sh', 'hl']) F[key].lerp(F2[key], k);
      for (const key of Object.keys(v)) v[key] += (v2[key] - v[key]) * k;
      S = this.mixSample(S, S2, k);
    }
    let { sunI, hi, fogD, sat, contrast, vignette, exposure, torch } = v;
    // Domain Expansion override blend
    this.ovK += (this.ovTarget - this.ovK) * Math.min(1, realDt * 2.2);
    if (this.ovTarget === 0 && this.ovK < 0.002) this.ovK = 0;
    const O = this.override;
    if (O && this.ovK > 0) {
      const k = this.ovK;
      F.top.lerp(O.top, k); F.hor.lerp(O.hor, k); F.fog.lerp(O.fog, k); F.hs.lerp(O.hs, k); F.hg.lerp(O.hg, k); F.sun.lerp(O.sun, k);
      F.tint.lerp(O.tint, k); F.lift.lerp(O.lift, k); F.sh.lerp(_c.setRGB(1, 1, 1), k); F.hl.lerp(_c.setRGB(1, 1, 1), k);
      sunI += (O.sunI * 1.6 - sunI) * k; hi += (O.hi - hi) * k; fogD += (O.fogD * 0.6 - fogD) * k;
      sat += (O.sat - sat) * k; contrast += (O.contrast - contrast) * k; vignette += (O.vignette - vignette) * k;
      exposure += (1.15 - exposure) * k; torch += (1 - torch) * k;
    }
    // ---- write it all out
    E.skyTop.value.copy(F.top); E.skyHor.value.copy(F.hor); E.fogColor.value.copy(F.fog);
    E.fogDensity.value = fogD; E.fogStart.value = v.fogStart * (1 - this.ovK * 0.8); E.fogHeight.value = v.fogHeight; E.fogHeightDensity.value = v.fogHD;
    E.fogSun.value = v.fogSun;
    E.sunDir.value.copy(S.lightDir);
    E.sunColor.value.copy(F.sun).multiplyScalar(sunI);
    E.moon.value = S.moon ? 1 : 0;
    E.day.value = v.day * (1 - this.ovK); E.golden.value = v.golden * (1 - this.ovK);
    E.torch.value = torch; E.stars.value = v.stars * (1 - this.ovK);
    if (Bl) U.wind.value = v.wind;
    this.fog.density = fogD;
    const L = this.lights;
    L.hemi.color.copy(F.hs); L.hemi.groundColor.copy(F.hg); L.hemi.intensity = hi;
    L.setSun(S.lightDir, F.sun, sunI, { moon: S.moon });
    L.torch = torch;
    Grade.tint.value.copy(F.tint); Grade.lift.value.copy(F.lift);
    Grade.saturation.value = sat; Grade.contrast.value = contrast; Grade.vignette.value = vignette;
    Grade.shadowTint.value.copy(F.sh); Grade.highlightTint.value.copy(F.hl);
    Grade.bloomThreshold.value = 0.85 + 0.9 * v.day * (1 - this.ovK);
    if (g?.gr?.renderer) g.gr.renderer.toneMappingExposure = exposure;
    this.scene.environmentIntensity = 0.2 + 0.1 * v.day;
    // clouds, cloud shadows, sun on screen
    const P = g?.gr?.preset ?? {};
    this.sky.update(dt, S);
    if (Bl) this.sky.cloudTint.value.copy(_c.set(look.clouds.tint ?? 0xffffff)).lerp(_v2.set(Bl.look.clouds.tint ?? 0xffffff), Bl.k);
    else if (this.blendWas) this.sky.cloudTint.value.copy(_c.set(look.clouds.tint ?? 0xffffff));
    this.blendWas = !!Bl;
    E.cloudShadow.value = this.sky.enabled && P.cloudShadows ? v.clouds * v.day * (1 - this.ovK) : 0;
    const rig = g?.rig;
    if (rig) {
      E.focus.value.copy(rig.focus);
      L.viewDist = rig.cine ? (rig.cine.dist ?? 30) * 1.3 : rig.dist ?? 30;
      if (P.godrays) this.updateSunScreen(rig.camera, S, F);
      else Grade.sunScreen.value.z = 0;
    }
    if (this.world && this.foliage.world !== this.world && this.foliage.world === null && this.look.foliage !== false && this.game?.level?.foliage !== false) this.foliage.populate(this.world, this.game?.level?.foliage ?? this.look.foliage ?? {});
    this.foliage.update(E.focus.value);
    // refresh the reflection probe as the sky changes (and as you walk through a border's blend)
    const bk = Bl ? Bl.k : 0;
    if (this.renderer && !this.ovK && ((Math.abs(this.tod.hour - this.probeHour) > (P.ssr ? 0.35 : 1.0) && Math.abs(this.tod.hour - this.probeHour) < 23.5) || Math.abs(bk - (this.probeBlend ?? 0)) > 0.12)) { this.probeBlend = bk; this.bakeProbe(); }
  }
  updateSunScreen(camera, S, F) {
    _v.copy(camera.position).addScaledVector(S.sunDir, 150).project(camera);
    const behind = _v.z > 1 || _v.z < -1;
    const off = Math.max(Math.abs(_v.x), Math.abs(_v.y));
    const vis = behind || S.sunEl < -0.02 ? 0 : smooth01(1.6, 0.9, off);
    Grade.sunScreen.value.set(_v.x * 0.5 + 0.5, 0.5 - _v.y * 0.5, vis * S.day * (0.28 + 0.4 * S.golden) * (1 - this.ovK));
    Grade.sunScatterColor.value.copy(F.sun).multiplyScalar(1.2);
  }

  // Reflection probe: a PMREM of the current sky, used for water/metal on every tier.
  buildProbe(renderer) { this.renderer = renderer; this.bakeProbe(); }
  bakeProbe() {
    const r = this.renderer; if (!r) return;
    this.probeHour = this.tod.hour;
    const env = this.probeScene ?? (this.probeScene = new THREE.Scene());
    if (!this.probeMesh) {
      const geo = new THREE.SphereGeometry(10, 32, 16);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
      this.probeMesh = new THREE.Mesh(geo, new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.BackSide }));
      env.add(this.probeMesh);
    }
    const geo = this.probeMesh.geometry, p = geo.attributes.position, col = geo.attributes.color;
    const top = E.skyTop.value, hor = E.skyHor.value, fog = E.fogColor.value, sd = E.sunDir.value, sc = E.sunColor.value;
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / 10, y = p.getY(i) / 10, z = p.getZ(i) / 10;
      c.copy(hor).lerp(top, 1 - Math.exp(-6.5 * Math.max(0, y)));
      if (y < 0) c.copy(fog).multiplyScalar(0.55);
      const s = Math.max(0, x * sd.x + y * sd.y + z * sd.z);
      c.r += sc.r * Math.pow(s, 8) * 0.25; c.g += sc.g * Math.pow(s, 8) * 0.25; c.b += sc.b * Math.pow(s, 8) * 0.25;
      col.setXYZ(i, c.r * 1.6, c.g * 1.6, c.b * 1.6);
    }
    col.needsUpdate = true;
    try {
      this.pmrem ??= new THREE.PMREMGenerator(r);
      const rt = this.pmrem.fromScene(env, 0.02);
      const old = this.probeRT;
      this.probeRT = rt;
      this.scene.environment = rt.texture;
      if (old) setTimeout(() => old.dispose(), 100);
    } catch (e) { console.warn('probe', e); }
  }
}
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
void smoothstep;
