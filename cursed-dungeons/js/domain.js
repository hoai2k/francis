// Domain Expansion as a real barrier technique.
//
// Cast: a short hand sign (≈0.5 s, no camera move, no slow motion) with a
// "DOMAIN EXPANSION · <name>" banner. Then a barrier dome closes around the
// caster: everything inside it is TRAPPED (players, allies, curses, bosses
// can't cross the wall; projectiles stop at it), everything outside stays
// out. Inside, the world becomes the domain (floor takeover via U.domain*,
// sky dome, environment grade, each kit's own set-pieces); from outside the
// barrier is a black sphere. Malevolent Shrine is the exception: an open
// domain with no barrier and a vast radius. A domain lasts 10–20 s (the
// central table below, keyed by def.key / boss domain name, so the kits don't
// have to change), with a timer under the banner, and ends with the barrier
// cracking and shattering.
//
// API (unchanged for kits and bosses):
//   start(caster, def) → bool     def: { name, key, type (6 = custom: def.look), duration, radius, sound, color, flash, sureHit, onStart, onTick, onEnd, center? }
//   inside(pos)                    within the domain (any phase but the cast)
//   sureHit(player)                this player's domain is up and has a sure-hit
//   collapse()                     end it now with the shatter animation (caster died, verdict carried out…)
//   end()                          end it immediately (level teardown)
//   remaining()                    seconds left (0 when none)
import * as THREE from 'three/webgpu';
import { uniform, positionLocal, normalize, vec4 } from 'three/tsl';
import { U } from './gfx/materials.js';
import { DOMAINS } from './world/biomes.js';
import { skyUniforms, skyColor, makeBarrier, WALL } from './gfx/barrier.js';

// ---------------------------------------------------------------- the table
// dur: seconds (10–20) · radius: barrier radius · open: no barrier (Shrine)
// rim: barrier rim / timer colour · power: who wins a domain clash
// pad: the visible shell sits this much outside the trap radius (thick set-pieces built at the edge)
// bonus: technique-tree duration ranks still add a little (kit duration above 8 s, halved), capped at 20 s
const PLAYER_DOMAINS = {
  unlimited_void:          { dur: 16, radius: 26, rim: 0x9ad8ff, power: 10, bonus: true },
  malevolent_shrine:       { dur: 17, radius: 40, rim: 0xff3a2a, power: 10, bonus: true, open: true },
  chimera_garden:          { dur: 10, radius: 22, rim: 0x6a6aff, power: 4, bonus: true },   // incomplete
  pure_love_train:         { dur: 15, radius: 24, rim: 0x3aff8a, power: 7, bonus: true },   // Idle Death Gamble
  deadly_sentencing:       { dur: 20, radius: 22, rim: 0xffd27a, power: 7 },                // the court adjourns on its verdict
  self_embodiment:         { dur: 14, radius: 22, rim: 0x7ac8f0, power: 8, bonus: true },
  coffin_iron_mountain:    { dur: 14, radius: 24, rim: 0xff5a1a, power: 7, bonus: true, pad: 5 },     // the crater walls are thick and lean
  authentic_mutual_love:   { dur: 15, radius: 24, rim: 0xe8b8ff, power: 9, bonus: true },
  ceremonial_sea_of_light: { dur: 13, radius: 24, rim: 0xfff0a0, power: 6, bonus: true },
  time_cell_moon_palace:   { dur: 12, radius: 24, rim: 0xa8f0ff, power: 6, bonus: true },
  reverse_transcendence:   { dur: 15, radius: 25, rim: 0xfff4c8, power: 9, bonus: true },   // Dabura (JJK Modulo)
  captivating_skandha:     { dur: 14, radius: 25, rim: 0x5ad8ff, power: 6, bonus: true },   // Dagon
  womb_profusion:          { dur: 15, radius: 25, rim: 0xc83a5a, power: 9, bonus: true },   // Kenjaku
  threefold_affliction:    { dur: 13, radius: 24, rim: 0xd8d8e8, power: 8, bonus: true },   // Yorozu
};
// boss domains, keyed by name (several share a DOMAINS env key)
const BOSS_DOMAINS = {
  'Malevolent Shrine':                  { dur: 14, radius: 34, rim: 0xff3a2a, power: 10, open: true },
  'Coffin of the Iron Mountain':        { dur: 12, rim: 0xff5a1a, power: 7 },
  'Ceremonial Sea of Light':            { dur: 11, rim: 0xffe08a, power: 6 },
  'Horizon of the Captivating Skandha': { dur: 12, rim: 0x5ad8ff, power: 6 },
};
const BY_NAME = {
  'Unlimited Void': 'unlimited_void', 'Malevolent Shrine': 'malevolent_shrine', 'Chimera Shadow Garden': 'chimera_garden',
  'Idle Death Gamble': 'pure_love_train', 'Deadly Sentencing': 'deadly_sentencing', 'Self-Embodiment of Perfection': 'self_embodiment',
  'Coffin of the Iron Mountain': 'coffin_iron_mountain', 'Authentic Mutual Love': 'authentic_mutual_love',
  'Ceremonial Sea of Light': 'ceremonial_sea_of_light', 'Time Cell Moon Palace': 'time_cell_moon_palace',
  'Otherworld Between Darkness and Light: Reverse Transcendence': 'reverse_transcendence',
  'Womb Profusion': 'womb_profusion', 'Threefold Affliction': 'threefold_affliction',
};
export function domainSpec(caster, def) {
  const boss = !!caster?.isBoss;
  const T = (boss ? BOSS_DOMAINS[def.name] : null) ?? PLAYER_DOMAINS[def.key] ?? PLAYER_DOMAINS[BY_NAME[def.name]] ?? BOSS_DOMAINS[def.name] ?? {};
  let dur = T.dur ?? Math.min(20, Math.max(10, def.duration ?? 12));
  if (T.bonus && !boss) dur += Math.max(0, (def.duration ?? 8) - 8) * 0.5;
  dur = Math.min(20, Math.max(10, dur));
  return {
    dur, radius: Math.max(T.radius ?? def.radius ?? 24, def.minRadius ?? 0), open: !!(T.open ?? def.open), power: T.power ?? def.power ?? 5,
    rim: T.rim ?? def.color ?? 0x6ad8ff, pad: boss ? 0 : T.pad ?? 0,
  };
}

const CAST = 0.5;        // hand sign
const FORM = 0.5;        // barrier pours closed
const CRACK = 0.45, SHATTER = 0.6;
const tmpC = new THREE.Color();

function domeMaterial(S) {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, transparent: true });
  const fade = uniform(0);
  m.colorNode = vec4(skyColor(normalize(positionLocal), S), fade);
  m.userData = { ...S, fade };
  return m;
}

export class DomainSystem {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.sky = skyUniforms();
    // far backdrop sky (fills whatever the barrier's cut-away leaves open)
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), domeMaterial(this.sky));
    this.dome.visible = false; this.dome.frustumCulled = false; this.dome.renderOrder = -1;
    game.scene.add(this.dome);
    this.barrier = makeBarrier(this.sky);
    this.B = this.barrier.material.userData;
    game.scene.add(this.barrier);
    this.banner = null;
  }

  // ------------------------------------------------------------- casting
  start(caster, def) {
    const g = this.game;
    const spec = domainSpec(caster, def);
    if (this.active) {
      const cur = this.active;
      if (cur.phase === 'collapse') this.finish();   // the old barrier is already shattering
      else if (cur.caster === caster) return false;
      // Domain clash: the more refined domain overwrites the other; ties go to the one already standing.
      else if (spec.power <= cur.spec.power) {
        this.clashFx(caster.pos, def.color);
        this.showBanner('DOMAIN CLASH', `${cur.def.name} holds`, cur.spec.rim, 1.4);
        return false;
      } else {
        this.clashFx(cur.center, def.color);
        this.end();
      }
    }
    const dd = { ...def, duration: spec.dur, radius: spec.radius };
    const d = { def: dd, spec, caster, t: 0, age: 0, phase: 'cast', center: (def.center ?? caster.pos).clone(), radius: 0, R: spec.radius, sides: new Map(), proj: new WeakMap(), viewIn: null };
    this.active = d; g.domain = d;
    caster.domainActive = true;
    caster.invulnerable = true;
    if (!caster.isBoss) caster.action = { type: 'sign', dur: CAST + 0.05, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.audio?.domain(def.sound);
    this.showBanner('DOMAIN EXPANSION · 領域展開', def.name, spec.rim, spec.dur + CAST + FORM);
    const col = new THREE.Color(def.color ?? spec.rim);
    g.lights.flash(caster.pos.clone().setY(caster.pos.y + 1.5), col, 5, 10, 0.8, { priority: 5 });
    g.fx.flash(def.color ?? spec.rim, 0.25, 0.25);
    return true;
  }
  clashFx(at, color) {
    const g = this.game;
    g.fx.flash(0xffffff, 0.8, 0.35);
    g.fx.screenWave?.(at.clone().setY(at.y + 1), 1.6, 0.7);
    g.shake?.(0.7);
    g.fx.shockwave?.(at, color ?? 0xffffff, 10, 0.6);
  }

  // ------------------------------------------------------------- per frame
  update(dt, realDt) {
    const d = this.active;
    if (!d) { if (this.banner) this.tickBanner(realDt); return; }
    const g = this.game, def = d.def;
    d.t += realDt; d.age += realDt;
    this.tickBanner(realDt);
    if (d.phase === 'cast') {
      // energy converging on the caster's hands
      const c = d.caster.pos;
      tmpC.set(def.color ?? d.spec.rim);
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3;
        g.particles.glow.emit(c.x + Math.cos(a) * r, c.y + 0.3 + Math.random() * 2.2, c.z + Math.sin(a) * r, -Math.cos(a) * r * 3 - Math.sin(a) * 3, 0.4, -Math.sin(a) * r * 3 + Math.cos(a) * 3, 0.35, tmpC.r * 3, tmpC.g * 3, tmpC.b * 3, 0.14, 0, 2.5, 0.3, 1);
      }
      if (d.t >= CAST) this.expand(d);
      return;
    }
    if (d.phase === 'hold') {
      const k = Math.min(1, d.t / FORM);
      U.domainRadius.value = d.R * (1 - Math.pow(1 - k, 3));
      this.B.form.value = d.spec.open ? 0 : k;
      this.barrier.scale.setScalar((d.R + d.spec.pad) * (0.35 + 0.65 * (1 - Math.pow(1 - k, 2))));
      if (!d.spec.open) { this.trap(d); this.stopProjectiles(d); }
      this.view(d, realDt);
      def.onTick?.(g, d, dt);
      if (this.active === d && d.phase === 'hold' && d.t >= def.duration) this.collapse();
      return;
    }
    if (d.phase === 'collapse') {
      const tc = d.t;
      this.view(d, realDt);
      this.B.crack.value = Math.min(1, tc / CRACK);
      const s = Math.max(0, (tc - CRACK) / SHATTER);
      this.B.shatter.value = s;
      if (tc >= CRACK && !d.burst) { d.burst = true; this.shatterFx(d); }
      U.domainRadius.value = d.R * Math.max(0, 1 - s);
      this.dome.material.userData.fade.value = Math.max(0, 1 - s) * (d.viewIn ? 1 : 0);
      if (s >= 1) this.finish();
    }
  }
  expand(d) {
    const g = this.game, def = d.def;
    d.phase = 'hold'; d.t = 0;
    d.radius = d.R;   // logic radius is the full barrier from the first frame (onStart can already query inside())
    d.caster.action = null; d.caster.invulnerable = false;
    const c = d.center;
    g.fx.flash(def.flash ?? 0xffffff, 0.45, 0.25);
    g.fx.screenWave?.(c.clone().setY(c.y + 1), 1.2, 0.6);
    g.shake?.(0.5);
    U.domainType.value = def.type; U.domainCenter.value.copy(c); U.domainRadius.value = 0;
    const S = this.sky;
    S.type.value = def.type;
    if (def.type === 6) {
      const L = def.look ?? {};
      U.domainFloor.value.set(L.floor ?? 0x202020); U.domainSeam.value.set(L.seam ?? 0x000000); U.domainSparkle.value.set(L.sparkle ?? 0x000000);
      S.cTop.value.set(L.skyTop ?? 0x000000); S.cHor.value.set(L.skyHorizon ?? 0x303030); S.cStars.value = L.stars ?? 0; S.cBand.value.set(L.band ?? 0x000000);
    }
    this.dome.position.copy(c); this.dome.scale.setScalar(Math.max(60, d.R * 2.4)); this.dome.material.userData.fade.value = 0;
    this.dome.visible = !d.spec.open;
    const B = this.B;
    B.radius.value = d.R + d.spec.pad; B.rim.value.set(d.spec.rim); B.form.value = 0; B.crack.value = 0; B.shatter.value = 0;
    this.barrier.position.copy(c); this.barrier.scale.setScalar((d.R + d.spec.pad) * 0.35);
    this.barrier.visible = !d.spec.open;
    // who is on which side when the barrier closes
    for (const e of this.entities()) d.sides.set(e, this.flatDist(d, e.pos) < d.R);
    d.viewIn = null; this.view(d, 1);
    def.onStart?.(g, d);
    if (d.spec.open) this.dome.visible = false;   // an open domain keeps the real sky
  }
  // the viewer (the players the camera follows) inside or outside the barrier?
  view(d, realDt) {
    const g = this.game;
    const alive = g.players.filter((p) => !p.dead);
    const f = new THREE.Vector3();
    if (alive.length) { for (const p of alive) f.add(p.pos); f.divideScalar(alive.length); } else f.copy(g.rig?.focus ?? d.center);
    this.B.focus.value.set(f.x, f.y + 1, f.z);
    const vin = d.spec.open || this.flatDist(d, f) < d.R;
    if (vin !== d.viewIn && d.phase !== 'collapse') {
      d.viewIn = vin;
      g.env.set(vin ? (DOMAINS[d.def.key] ?? DOMAINS.resonance) : g.biome, false);
    }
    this.B.inside.value = d.viewIn ? 1 : 0;
    if (d.phase === 'hold') {
      const fd = this.dome.material.userData.fade;
      fd.value += ((d.viewIn ? Math.min(1, d.t / FORM) : 0) - fd.value) * Math.min(1, realDt * 6);
      this.dome.visible = !d.spec.open && (d.viewIn || fd.value > 0.02);   // outsiders see the real sky around the black shell
    }
  }
  flatDist(d, p) { return Math.hypot(p.x - d.center.x, p.z - d.center.z); }
  entities() { const g = this.game; return [...g.players, ...(g.allies ?? []), ...g.enemies]; }
  // the barrier is a wall: nobody crosses it, either way
  trap(d) {
    const g = this.game, c = d.center, R = d.R;
    for (const e of this.entities()) {
      if (e.dead || !e.pos) continue;
      let side = d.sides.get(e);
      const dx = e.pos.x - c.x, dz = e.pos.z - c.z, r = Math.hypot(dx, dz);
      if (side === undefined) { side = r < R; d.sides.set(e, side); }
      const rad = Math.min(2.5, e.radius ?? 0.5);
      const lim = side ? R - rad - 0.2 : R + rad + 0.2;
      if (side ? r <= lim : r >= lim) continue;
      const nx = r > 1e-4 ? dx / r : 1, nz = r > 1e-4 ? dz / r : 0;
      e.pos.x = c.x + nx * lim; e.pos.z = c.z + nz * lim;
      const sgn = side ? 1 : -1;   // the blocked direction: outward when inside, inward when outside
      for (const v of [e.vel, e.knock]) {
        if (!v) continue;
        const vn = (v.x * nx + v.z * nz) * sgn;
        if (vn > 0) { v.x -= nx * vn * sgn; v.z -= nz * vn * sgn; }
      }
      // a ripple of cursed energy where it touches the wall
      if ((e._barrierFx ?? 0) < g.time) {
        e._barrierFx = g.time + 0.25;
        tmpC.set(d.spec.rim);
        const wx = c.x + nx * R, wz = c.z + nz * R, wy = e.pos.y + 0.4 + Math.random() * 1.5;
        for (let i = 0; i < 5; i++) g.particles.glow.emit(wx, wy + (Math.random() - 0.5), wz, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.35, tmpC.r * 2.5, tmpC.g * 2.5, tmpC.b * 2.5, 0.16, 0, 3, 0.05, 1);
      }
    }
  }
  stopProjectiles(d) {
    const g = this.game, list = g.projectiles?.list; if (!list) return;
    const c = d.center, R = d.R, H = WALL * R;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      // inside the wall-plus-dome shape
      const r2 = (p.pos.x - c.x) ** 2 + (p.pos.z - c.z) ** 2, dy = p.pos.y - c.y;
      const inn = r2 < R * R && dy < H + Math.sqrt(Math.max(0, R * R - r2));
      const side = d.proj.get(p);
      if (side === undefined) { d.proj.set(p, inn); continue; }
      if (side === inn) continue;
      tmpC.set(d.spec.rim);
      for (let k = 0; k < 8; k++) g.particles.glow.emit(p.pos.x, p.pos.y, p.pos.z, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0.3, tmpC.r * 3, tmpC.g * 3, tmpC.b * 3, 0.14, 0, 3, 0.05, 1);
      g.projectiles.kill(p, 'barrier');
    }
  }
  shatterFx(d) {
    const g = this.game, c = d.center, R = d.R + d.spec.pad;
    g.audio?.impact?.(1.4);
    g.shake?.(0.35);
    if (d.spec.open) return;
    tmpC.set(d.spec.rim);
    for (let i = 0; i < 140; i++) {
      // shards fall from the shell
      const a = Math.random() * Math.PI * 2, q = Math.random() * (1 + WALL);
      const y = q < WALL ? q : WALL + Math.sin((q - WALL) * Math.PI / 2), rr = q < WALL ? 1 : Math.cos((q - WALL) * Math.PI / 2);
      const x = c.x + Math.cos(a) * rr * R, z = c.z + Math.sin(a) * rr * R, h = c.y + y * R;
      const dark = Math.random() < 0.65;
      const k = dark ? 0.02 : 2.5;
      g.particles.glow.emit(x, h, z, Math.cos(a) * (1 + Math.random() * 3), -1 - Math.random() * 2, Math.sin(a) * (1 + Math.random() * 3), 0.9 + Math.random() * 0.6, dark ? k : tmpC.r * k, dark ? k : tmpC.g * k, dark ? k : tmpC.b * k, dark ? 0.6 : 0.22, 9, 0.5, 0.4, dark ? 1 : 3);
    }
  }

  // ------------------------------------------------------------- ending
  // end with the crack-and-shatter animation
  collapse() {
    const g = this.game, d = this.active;
    if (!d || d.phase === 'collapse') return;
    if (d.phase === 'cast') { this.end(); return; }
    d.phase = 'collapse'; d.t = 0;
    d.def.onEnd?.(g, d);
    if (this.active !== d) return;
    g.env.set(g.biome, false);
    d.viewIn = d.viewIn && !d.spec.open;
    d.caster.domainActive = false;
    this.hideBanner();
  }
  // immediate cleanup (no animation)
  end() {
    const g = this.game, d = this.active;
    if (!d) return;
    this.active = null; g.domain = null;
    if (d.phase !== 'collapse') { g.env.set(g.biome, false); d.def.onEnd?.(g, d); }
    this.reset(d);
    this.hideBanner(true);
  }
  finish() { const d = this.active; this.active = null; this.game.domain = null; if (d) this.reset(d); }
  reset(d) {
    const g = this.game;
    U.domainType.value = 0; U.domainRadius.value = 0;
    this.dome.visible = false; this.barrier.visible = false;
    this.B.crack.value = 0; this.B.shatter.value = 0;
    d.caster.domainActive = false; d.caster.invulnerable = false;
    if (d.caster.action?.type === 'sign') d.caster.action = null;
    g.frozen = false; g.fx.dimTarget = 0;
  }
  inside(pos) { const d = this.active; return !!d && d.phase !== 'cast' && Math.hypot(pos.x - d.center.x, pos.z - d.center.z) < d.radius; }
  sureHit(player) { const d = this.active; return !!d && d.phase === 'hold' && d.caster === player && d.def.sureHit !== false; }
  remaining() { const d = this.active; return !d ? 0 : d.phase === 'cast' ? d.def.duration : d.phase === 'hold' ? Math.max(0, d.def.duration - d.t) : 0; }

  // ------------------------------------------------------------- banner + timer
  showBanner(kicker, name, rim, life) {
    this.hideBanner(true);
    const el = document.createElement('div');
    el.className = 'dx-banner';
    el.style.setProperty('--dx', '#' + new THREE.Color(rim).getHexString());
    el.innerHTML = '<div class="dx-kicker"></div><div class="dx-name"></div><div class="dx-timer"><i></i></div>';
    el.querySelector('.dx-kicker').textContent = kicker;
    el.querySelector('.dx-name').textContent = name;
    document.body.appendChild(el);
    this.banner = { el, bar: el.querySelector('.dx-timer i'), age: 0, life, timed: kicker.startsWith('DOMAIN EXPANSION') };
    document.body.classList.add('dx-big');
    requestAnimationFrame(() => el.classList.add('in'));
  }
  tickBanner(realDt) {
    const b = this.banner; if (!b) return;
    b.age += realDt;
    if (b.timed) {
      const d = this.active;
      const frac = !d ? 0 : d.phase === 'cast' ? 1 : d.phase === 'hold' ? Math.max(0, 1 - d.t / d.def.duration) : 0;
      b.bar.style.transform = `scaleX(${frac.toFixed(4)})`;
      if (b.age > 2.4 && !b.el.classList.contains('compact')) { b.el.classList.add('compact'); document.body.classList.remove('dx-big'); }
      if (d && d.phase === 'hold' && d.def.duration - d.t < 3) b.el.classList.add('ending');
    } else if (b.age > b.life) this.hideBanner();
  }
  hideBanner(now) {
    const b = this.banner; if (!b) return;
    this.banner = null;
    document.body.classList.remove('dx-big');
    if (now) { b.el.remove(); return; }
    b.el.classList.add('out');
    setTimeout(() => b.el.remove(), 500);
  }
}
