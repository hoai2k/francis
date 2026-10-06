// Spell casting, projectiles, the Protego shield, Lumos, Leviosa lifting/throwing,
// the Patronus stag, status effects and spell combos.
import * as THREE from 'three';
import { G } from './state.js';
import { SPELLS, SPELL_BY_ID } from './spelldata.js';
import { makeStag } from './models.js';
import { postFlash } from './engine.js';
import { glowSprite } from './textures.js';
import { clamp, rand } from './util.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _u = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export const ENEMY_SPELLS = {
  curse: { id: 'curse', name: 'Dark curse', color: 0x40ff70, color2: 0xb0ffc0, dmg: 12, speed: 26, radius: 0.4, kind: 'bolt', enemy: true },
  stupefyE: { id: 'stupefy', name: 'Stupefy', color: 0xff2348, color2: 0xff9ab0, dmg: 10, speed: 30, radius: 0.35, kind: 'bolt', enemy: true, stun: 0.5 },
  expelliarmusE: { id: 'expelliarmus', name: 'Expelliarmus', color: 0xff6a2a, color2: 0xffd27a, dmg: 8, speed: 32, radius: 0.35, kind: 'bolt', enemy: true, knock: 6 },
  incendioE: { id: 'incendio', name: 'Incendio', color: 0xff7a10, color2: 0xffe070, dmg: 14, speed: 22, radius: 0.5, kind: 'bolt', enemy: true, burn: 2 },
  boulder: { id: 'boulder', name: 'Boulder', color: 0x886655, color2: 0x443322, dmg: 22, speed: 18, radius: 0.9, kind: 'boulder', enemy: true, gravity: 9 },
  soul: { id: 'soul', name: 'Soul drain', color: 0x7090c0, color2: 0x203050, dmg: 9, speed: 16, radius: 0.6, kind: 'bolt', enemy: true, smoke: true },
  killing: { id: 'killing', name: 'Dark lance', color: 0x30ff60, color2: 0xe0ffe0, dmg: 20, speed: 34, radius: 0.45, kind: 'bolt', enemy: true },
};

export class Spells {
  constructor() {
    this.unlocked = new Set(G.save.spells || []);
    this.selected = 0;
    this.cooldowns = {};
    this.projectiles = [];
    this.stags = [];
    this.shieldUp = false;
    this.shieldT = 0;
    this.lumosOn = false;
    this.lumosLight = null;
    this.held = null; // {target, kind:'enemy'|'prop'}
    this.thrown = [];
    // projectile meshes
    this.coreGeo = new THREE.SphereGeometry(1, 12, 10);
    this.glowTex = glowSprite();
    // player shield bubble
    this.shieldMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0.4, 0.8, 1.6) }, strength: { value: 1 }, hit: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float time, strength, hit; uniform vec3 color; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ float f = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.5);
          vec2 h = vec2(atan(vP.z, vP.x)*6.0, vP.y*8.0); vec2 g = abs(fract(h + vec2(0.0, time*0.3)) - 0.5);
          float hex = smoothstep(0.42, 0.5, max(g.x, g.y));
          float a = (f*0.9 + hex*0.18 + 0.05) * strength + hit*0.6*f;
          a = clamp(a, 0.0, 1.0); gl_FragColor = vec4(color * a * (1.0 + hit*2.0), a); }`,
    });
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 20), this.shieldMat);
    this.shield.visible = false;
    G.scene.add(this.shield);
    this.shieldHit = 0;
  }

  get current() { return SPELLS[this.selected]; }
  unlock(id, silent) {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    G.save.spells = [...this.unlocked];
    G.ui.buildSpellBar();
    if (!silent) {
      const s = SPELL_BY_ID[id];
      G.ui.banner(`New spell: ${s.name}`, s.desc, 'unlock');
      G.audio.sfx('unlock');
      this.select(SPELLS.indexOf(s));
    }
  }
  select(i) {
    const s = SPELLS[i];
    if (!s || !this.unlocked.has(s.id)) return;
    if (this.selected !== i) G.audio.sfx('uimove');
    this.selected = i;
  }
  cycle(dir) {
    for (let k = 1; k <= 8; k++) {
      const i = (this.selected + dir * k + 80) % 8;
      if (this.unlocked.has(SPELLS[i].id)) { this.select(i); return; }
    }
  }

  // ------------------------------------------------------------ aiming
  aimPoint(origin) {
    // ray from the camera through the screen centre (or swipe direction on touch)
    const cam = G.camera;
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const sw = G.input.swipe;
    if (sw) {
      const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
      dir.addScaledVector(right, sw.x * 0.35).addScaledVector(UP, sw.y * 0.2).normalize();
    }
    const camPos = cam.position;
    // lock-on target wins
    const lt = G.cam.lockTarget;
    if (lt && lt.alive) return { point: lt.pos.clone().setY(lt.pos.y + lt.height * 0.55), target: lt };
    // soft auto-aim: best enemy within a cone of the view ray
    let best = null, bestScore = Infinity;
    for (const e of G.enemies.list) {
      if (!e.alive || e.hidden) continue;
      const c = _v.copy(e.pos).setY(e.pos.y + e.height * 0.55);
      const to = _w.subVectors(c, camPos);
      const d = to.length();
      if (d > 60) continue;
      const ang = Math.acos(clamp(to.dot(dir) / d, -1, 1));
      const cone = G.input.device === 'kbm' ? 0.09 : 0.2;
      if (ang < cone + e.radius / d) {
        const score = ang * 10 + d * 0.02;
        if (score < bestScore) { bestScore = score; best = e; }
      }
    }
    if (best) return { point: best.pos.clone().setY(best.pos.y + best.height * 0.55), target: best };
    const col = G.zone.colliders;
    const hit = col.raycast(camPos, dir, 120);
    const dist = hit === Infinity ? 80 : hit;
    return { point: camPos.clone().addScaledVector(dir, dist), target: null };
  }

  // ------------------------------------------------------------ player casting
  update(dt) {
    const I = G.input, p = G.player;
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    if (!this.unlocked.has(this.current.id) && this.unlocked.size) this.cycle(1);
    const canAct = G.mode === 'play' && p.alive && p.control && !G.ui.wheel;
    if (canAct) {
      for (let i = 1; i <= 8; i++) if (I.isPressed('spell' + i)) this.select(i - 1);
      if (I.isPressed('next')) this.cycle(1);
      if (I.isPressed('prev')) this.cycle(-1);
      if (I.isPressed('wheel')) G.ui.openWheel();
      if (I.isPressed('lock')) this.toggleLock();
      else if (I.device === 'pad' && I.isReleased('lock')) G.cam.lockTarget = null; // LT is hold-to-lock
      const cur = this.current;
      const wantsBlock = (I.isHeld('block') || (cur.id === 'protego' && I.isHeld('cast'))) && this.unlocked.has('protego');
      this.setShield(wantsBlock && p.mana > 0.5, dt);
      if (I.isPressed('cast') && cur.id !== 'protego') this.castPlayer(cur);
      if (I.device === 'pad' && I.rt > 0.5 && !I.isPressed('cast') && I.isHeld('cast') && (cur.id === 'stupefy' || cur.id === 'expelliarmus')) {
        // holding RT auto-repeats quick bolts
        if ((this.cooldowns[cur.id] || 0) <= 0 && p.lastCast > 0.5) this.castPlayer(cur);
      }
    } else this.setShield(false, dt);
    // lumos drain
    if (this.lumosOn) {
      p.mana -= dt * SPELL_BY_ID.lumos.drain;
      if (p.mana <= 0) this.toggleLumos(false);
    }
    this.updateHeld(dt);
    this.updateProjectiles(dt);
    this.updateStags(dt);
    this.updateThrown(dt);
    // shield visual
    this.shieldMat.uniforms.time.value += dt;
    this.shieldHit = Math.max(0, this.shieldHit - dt * 3);
    this.shieldMat.uniforms.hit.value = this.shieldHit;
    if (this.shield.visible) this.shield.position.copy(p.pos).setY(p.pos.y + 1.0);
  }

  toggleLock() {
    const cam = G.cam;
    if (cam.lockTarget) { cam.lockTarget = null; return; }
    const p = G.player;
    const fwd = G.camera.getWorldDirection(new THREE.Vector3());
    let best = null, bs = Infinity;
    for (const e of G.enemies.list) {
      if (!e.alive || e.hidden) continue;
      const to = _v.subVectors(e.pos, p.pos);
      const d = to.length();
      if (d > 40) continue;
      const s = d * (1.5 - to.normalize().dot(fwd));
      if (s < bs) { bs = s; best = e; }
    }
    cam.lockTarget = best;
    if (best) G.audio.sfx('uimove');
  }

  setShield(on, dt) {
    const p = G.player;
    if (on && !this.shieldUp) {
      if (p.mana < SPELL_BY_ID.protego.mana) on = false;
      else {
        p.mana -= SPELL_BY_ID.protego.mana;
        this.shieldT = 0;
        G.audio.sfx('protego');
        G.fx.emit({ pos: p.pos.clone().setY(p.pos.y + 1), color: 0x6cc4ff, count: 30, speed: 4, size: 0.18, life: 0.4, intensity: 3 });
      }
    }
    this.shieldUp = on;
    p.blocking = on;
    this.shield.visible = on;
    if (on) {
      this.shieldT += dt;
      p.mana -= dt * SPELL_BY_ID.protego.drain;
      p.lastCast = 0;
      this.shieldMat.uniforms.strength.value = Math.min(1, this.shieldT * 6);
      if (p.mana <= 0) { this.shieldUp = false; p.blocking = false; this.shield.visible = false; G.audio.sfx('shatter'); G.ui.floatText(p.pos.clone().setY(p.pos.y + 2), 'Shield broken!', 'hurt'); }
    }
  }

  // called by Player.damage while blocking
  shieldAbsorb(amount, info) {
    const p = G.player;
    const perfect = this.shieldT < 0.28;
    this.shieldHit = 1;
    G.cam.shake(0.12);
    G.input.rumble(0.3, 0.5, 90);
    if (perfect && info.proj && info.proj.def.kind === 'bolt') {
      G.audio.sfx('reflect');
      G.ui.floatText(p.pos.clone().setY(p.pos.y + 2.2), 'Perfect block!', 'combo');
      this.reflect(info.proj);
      G.story?.onEvent('perfectBlock');
      return false;
    }
    G.audio.sfx('block');
    p.mana = Math.max(0, p.mana - amount * 0.6);
    G.fx.burst(info.proj ? info.proj.pos : p.pos.clone().setY(p.pos.y + 1), 0x6cc4ff, 18, 4);
    return false;
  }

  reflect(proj) {
    const owner = proj.owner;
    const p = G.player;
    const from = proj.pos.clone();
    let dir;
    if (owner && owner.alive) dir = owner.pos.clone().setY(owner.pos.y + owner.height * 0.5).sub(from).normalize();
    else dir = G.camera.getWorldDirection(new THREE.Vector3());
    const def = { ...proj.def, dmg: proj.def.dmg * 2.2, enemy: false };
    this.spawnProjectile(def, from, dir, 'player', p, owner);
  }

  castPlayer(s) {
    const p = G.player;
    if (!this.unlocked.has(s.id)) return;
    if ((this.cooldowns[s.id] || 0) > 0) return;
    if (s.id === 'lumos') { this.toggleLumos(!this.lumosOn); this.cooldowns.lumos = s.cd; return; }
    if (s.id === 'leviosa' && this.held) { this.throwHeld(); this.cooldowns.leviosa = 0.3; return; }
    const cost = s.mana * (p.buffs.focus ? 0.75 : 1);
    if (p.mana < cost) {
      G.ui.floatText(p.pos.clone().setY(p.pos.y + 2.1), 'Not enough magic', 'warn');
      G.audio.sfx('fail');
      this.cooldowns[s.id] = 0.3;
      return;
    }
    p.mana -= cost;
    p.lastCast = 0;
    p.aimT = 0.9;
    this.cooldowns[s.id] = s.cd;
    p.anim.trigger(s.id === 'leviosa' ? 'flick' : 'cast');
    const origin = p.wandPos();
    // spells leave from slightly in front of the wand so they never start inside walls
    const aim = this.aimPoint(origin);
    const dir = aim.point.clone().sub(origin).normalize();
    G.audio.sfx(s.id);
    G.input.rumble(0.15, 0.25, 60);
    G.fx.emit({ pos: origin, color: s.color, count: 20, speed: 3, size: 0.2, life: 0.35, intensity: 3 });
    G.lights.flash(origin, s.color, 25, 6, 0.2);
    if (s.kind === 'patronus') { this.castPatronus(origin, dir); return; }
    const def = { ...s, dmg: s.dmg * (p.buffs.strength ? 1.35 : 1) * (p.buffs.mastery ? 1.25 : 1) };
    this.spawnProjectile(def, origin, dir, 'player', p, aim.target);
    G.story?.onEvent('cast', s.id);
  }

  // ------------------------------------------------------------ projectiles
  spawnProjectile(def, origin, dir, team, owner, homing = null) {
    const core = new THREE.Mesh(this.coreGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color).multiplyScalar(5) }));
    const r = def.radius ?? 0.35;
    core.scale.setScalar(def.kind === 'boulder' ? r : r * 0.45);
    if (def.kind === 'boulder') {
      core.material = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 1, flatShading: true });
      core.geometry = new THREE.DodecahedronGeometry(1, 0);
      core.castShadow = true;
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: new THREE.Color(def.color).multiplyScalar(2.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(def.kind === 'boulder' ? 0.01 : r * 5);
    core.add(glow);
    glow.scale.divideScalar(core.scale.x);
    core.position.copy(origin);
    G.scene.add(core);
    const pr = {
      def, team, owner, homing, mesh: core, pos: core.position, vel: dir.clone().multiplyScalar(def.speed ?? 30), life: 2.6, age: 0, radius: r,
      light: def.kind === 'boulder' ? null : G.lights.attach(core, def.color, 14, 7),
    };
    if (def.kind === 'boulder') pr.vel.y += 5;
    this.projectiles.push(pr);
    return pr;
  }

  updateProjectiles(dt) {
    const col = G.zone.colliders;
    for (const pr of this.projectiles) {
      pr.age += dt;
      pr.life -= dt;
      // light homing
      if (pr.homing && pr.homing.alive && pr.age < 1.2) {
        const tgt = _v.copy(pr.homing.pos).setY(pr.homing.pos.y + pr.homing.height * 0.55);
        const want = tgt.sub(pr.pos).normalize().multiplyScalar(pr.vel.length());
        pr.vel.lerp(want, Math.min(1, dt * (pr.team === 'player' ? 6 : 1.5)));
      }
      if (pr.def.gravity) pr.vel.y -= pr.def.gravity * dt;
      const step = pr.vel.length() * dt;
      const dir = _w.copy(pr.vel).normalize();
      // world collision via raycast along the step
      const hitW = col.raycast(pr.pos, dir, step + pr.radius * 0.5);
      pr.pos.addScaledVector(pr.vel, dt);
      pr.mesh.rotation.x += dt * 5;
      // trail
      this.trail(pr, dt);
      let done = false;
      // entities
      const targets = pr.team === 'player' ? G.enemies.list : [G.player, ...G.enemies.allies];
      for (const e of targets) {
        if (!e.alive || e.hidden || e === pr.owner) continue;
        const c = _u.copy(e.pos);
        const dy = pr.pos.y - (c.y + e.height * 0.5);
        const dxz = Math.hypot(pr.pos.x - c.x, pr.pos.z - c.z);
        if (dxz < e.radius + pr.radius && Math.abs(dy) < e.height * 0.5 + pr.radius) {
          this.hitEntity(pr, e);
          done = true;
          break;
        }
      }
      // props (Leviosa can grab them)
      if (!done && pr.team === 'player' && pr.def.id === 'leviosa') {
        for (const prop of G.zone.props) {
          if (prop.mesh.position.distanceTo(pr.pos) < prop.radius + pr.radius + 0.3) {
            this.liftProp(prop);
            this.impactFX(pr.pos, pr.def, 0.6);
            done = true;
            break;
          }
        }
      }
      if (!done && hitW !== Infinity) {
        this.impactFX(pr.pos, pr.def, 0.8);
        if (pr.def.splash) this.splash(pr.pos, pr.def, pr.team, null);
        if (pr.def.kind === 'boulder') {
          G.audio.sfx('slam'); G.cam.shake(0.25);
          G.fx.smokePuff(pr.pos, 0x6a5a4a, 10, { speed: 3 });
          if (pr.team === 'enemy' && G.player.pos.distanceTo(pr.pos) < 2.6) G.player.damage(pr.def.dmg * (G.enemies.dmgScale || 1), { knock: new THREE.Vector3(0, 5, 0) });
        }
        done = true;
      }
      if (pr.life <= 0) done = true;
      if (done) this.removeProjectile(pr);
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  removeProjectile(pr) {
    pr.dead = true;
    G.scene.remove(pr.mesh);
    pr.mesh.material.dispose();
    pr.light?.release();
  }

  trail(pr, dt) {
    const d = pr.def;
    const p = pr.pos;
    const id = d.id;
    const back = _u.copy(pr.vel).multiplyScalar(-0.05);
    if (id === 'incendio') {
      G.fx.emit({ pos: p, color: 0xffc040, color2: 0xff3000, count: 4, speed: 1, size: 0.55, size1: 0.1, life: 0.35, intensity: 3, intensity2: 1.5, vel: back, up: 1.5, spread: 0.3 });
      if (Math.random() < 0.4) G.fx.smokePuff(p, 0x2a2420, 1, { size: 0.5, size1: 1.4, life: 0.8 });
    } else if (id === 'petrificus') {
      G.fx.emit({ pos: p, color: 0xcff8ff, count: 3, speed: 0.6, size: 0.14, life: 0.7, intensity: 2.5, gravity: 2, spread: 0.3 });
    } else if (id === 'leviosa') {
      const t = pr.age * 18;
      const r = _w.set(Math.cos(t) * 0.25, Math.sin(t) * 0.25, 0);
      G.fx.emit({ pos: _v.copy(p).add(r), color: d.color, color2: d.color2, count: 2, speed: 0.2, size: 0.18, life: 0.5, intensity: 3 });
    } else if (id === 'expelliarmus') {
      const t = pr.age * 25;
      G.fx.emit({ pos: _v.set(p.x + Math.cos(t) * 0.18, p.y + Math.sin(t) * 0.18, p.z), color: d.color2, count: 2, speed: 0.3, size: 0.12, life: 0.4, intensity: 3 });
      G.fx.emit({ pos: p, color: d.color, count: 2, speed: 0.4, size: 0.3, life: 0.2, intensity: 3, vel: back });
    } else if (d.kind === 'boulder') {
      if (Math.random() < 0.5) G.fx.smokePuff(p, 0x5a4a3a, 1, { size: 0.8, life: 0.6 });
    } else if (d.smoke) {
      G.fx.smokePuff(p, 0x101420, 2, { size: 0.6, size1: 1.4, life: 0.6, alpha: 0.5 });
    } else {
      G.fx.emit({ pos: p, color: d.color, color2: d.color2, count: 3, speed: 0.5, size: 0.28, size1: 0.02, life: 0.28, intensity: 3.5, vel: back });
    }
  }

  impactFX(pos, def, scale = 1) {
    G.fx.burst(pos, def.color, Math.round(26 * scale), 6 * scale, { color2: def.color2, size: 0.22 });
    G.fx.emit({ pos, color: def.color2 ?? 0xffffff, count: 8, speed: 1.2, size: 0.8 * scale, size1: 0.1, life: 0.25, intensity: 3 });
    G.fx.shock(pos, def.color, 1.6 * scale, 0.35, { sphere: true, intensity: 1.5 });
    G.lights.flash(pos, def.color, 40 * scale, 8, 0.25);
    if (def.id === 'incendio' || def.id === 'incendioE') G.fx.smokePuff(pos, 0x2a2420, 6);
    G.audio.sfx('impact');
  }

  splash(pos, def, team, except) {
    const r = def.splash;
    G.fx.shock(pos, def.color, r * 1.3, 0.45, { intensity: 2 });
    G.fx.emit({ pos, color: 0xffd060, color2: 0xff2000, count: 40, speed: 6, size: 0.5, size1: 0.1, life: 0.6, intensity: 3, up: 3 });
    G.audio.sfx('explode');
    const list = team === 'player' ? G.enemies.list : [G.player];
    for (const e of list) {
      if (!e.alive || e === except) continue;
      if (e.pos.distanceTo(pos) < r + e.radius) {
        if (team === 'player') e.takeHit({ dmg: def.dmg * 0.6, spell: def.id, splash: true, dir: _v.subVectors(e.pos, pos).normalize().clone() });
        else G.player.damage(def.dmg * 0.6, { dodgeable: true });
      }
    }
  }

  hitEntity(pr, e) {
    const def = pr.def;
    if (pr.team === 'enemy') {
      // enemy spell hitting the player (or allies)
      if (e === G.player) {
        const knock = def.knock ? _v.copy(pr.vel).setY(0).normalize().multiplyScalar(def.knock) : null;
        const hit = G.player.damage(def.dmg * (G.enemies.dmgScale || 1), { proj: pr, knock: knock?.clone() });
        if (hit) {
          this.impactFX(pr.pos, def, 0.7);
          if (def.burn) G.player.status.burn = def.burn;
        }
      }
      return;
    }
    this.impactFX(pr.pos, def);
    G.cam.shake(0.08);
    G.input.rumble(0.2, 0.4, 70);
    const dir = _v.copy(pr.vel).setY(0).normalize().clone();
    // combos are resolved before normal effects
    if (this.tryCombo(def, e, dir)) return;
    e.takeHit({ dmg: def.dmg, spell: def.id, dir, proj: pr });
    if (def.splash) this.splash(pr.pos, def, 'player', e);
  }

  tryCombo(def, e, dir) {
    const s = e.status;
    const id = def.id;
    let name = null;
    if (s.lifted > 0 && id === 'incendio') {
      name = 'Fire Comet';
      e.endLift?.();
      this.explodeAt(e.pos.clone().setY(e.pos.y + 1), 4.5, 48, 0xff7010, 'incendio');
      e.takeHit({ dmg: 30, spell: 'combo', dir, combo: true });
      e.status.burn = 4;
    } else if (s.lifted > 0 && id === 'stupefy') {
      name = 'Meteor Slam';
      e.endLift?.(true);
      e.takeHit({ dmg: 38, spell: 'combo', dir, combo: true });
      e.status.stun = 3;
      const at = e.pos.clone();
      setTimeout(() => this.explodeAt(at, 4, 22, 0xc28bff, 'slam', { stun: 2 }), 250);
    } else if (s.frozen > 0 && (id === 'stupefy' || id === 'expelliarmus')) {
      name = 'Shatter';
      s.frozen = 0;
      e.takeHit({ dmg: def.dmg * 3.2, spell: 'combo', dir, combo: true });
      G.fx.emit({ pos: e.pos.clone().setY(e.pos.y + 1), color: 0xcff8ff, count: 70, speed: 9, size: 0.25, life: 0.9, intensity: 3, gravity: 9 });
      G.audio.sfx('shatter');
    } else if (s.burn > 0 && id === 'petrificus') {
      name = 'Steam Blast';
      s.burn = 0;
      G.fx.smokePuff(e.pos.clone().setY(e.pos.y + 1), 0xe8eef2, 26, { size: 2, size1: 4, speed: 5, alpha: 0.5 });
      this.explodeAt(e.pos.clone(), 4, 20, 0xe8f6ff, 'steam', { stun: 2.6 });
    } else if (s.disarmed > 0 && id === 'stupefy') {
      name = 'Knockout';
      e.takeHit({ dmg: def.dmg * 1.6, spell: 'stupefy', dir, combo: true });
      s.stun = 4;
    }
    if (!name) return false;
    G.ui.combo(name);
    G.audio.sfx('combo');
    G.cam.shake(0.35);
    G.input.rumble(0.7, 0.7, 220);
    postFlash(0.12);
    G.story?.onEvent('combo', name);
    if (G.save.house) {
      G.story?.addPoints(G.save.house, 2, null, true);
    }
    return true;
  }

  explodeAt(pos, r, dmg, color, kind, opts = {}) {
    G.fx.shock(pos, color, r * 1.2, 0.5, { intensity: 2.5 });
    G.fx.shock(pos, color, r * 0.6, 0.35, { sphere: true, intensity: 1.5 });
    G.fx.burst(pos, color, 60, 9, { size: 0.35, life: 0.8 });
    if (kind === 'incendio') G.fx.smokePuff(pos, 0x2a2420, 12, { speed: 3 });
    G.lights.flash(pos, color, 120, 14, 0.5);
    G.audio.sfx(kind === 'slam' ? 'slam' : 'explode');
    G.cam.shake(0.3);
    for (const e of G.enemies.list) {
      if (!e.alive) continue;
      if (e.pos.distanceTo(pos) < r + e.radius) {
        e.takeHit({ dmg, spell: kind, dir: _v.subVectors(e.pos, pos).setY(0).normalize().clone(), splash: true });
        if (opts.stun) e.status.stun = Math.max(e.status.stun || 0, opts.stun);
      }
    }
  }

  // ------------------------------------------------------------ Lumos
  toggleLumos(on) {
    const p = G.player;
    if (on === this.lumosOn) return;
    if (on) {
      if (p.mana < SPELL_BY_ID.lumos.mana) { G.audio.sfx('fail'); return; }
      p.mana -= SPELL_BY_ID.lumos.mana;
      this.lumosOn = true;
      this.lumosLight = G.lights.attach(p.wandTip, 0xfff0d0, 60, 22);
      this.lumosSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: new THREE.Color(3, 2.8, 2.2), blending: THREE.AdditiveBlending, depthWrite: false }));
      this.lumosSprite.scale.setScalar(0.6 / 1);
      p.wandTip.add(this.lumosSprite);
      G.audio.sfx('lumos');
      const at = p.wandPos();
      G.fx.burst(at, 0xfff2c0, 60, 10, { size: 0.3 });
      G.fx.shock(at, 0xfff2c0, 9, 0.5, { sphere: true, intensity: 1.2 });
      postFlash(0.18);
      for (const e of G.enemies.list) {
        if (!e.alive) continue;
        const d = e.pos.distanceTo(p.pos);
        if (d < 10) e.onLumos?.(d);
      }
      G.story?.onEvent('cast', 'lumos');
    } else {
      this.lumosOn = false;
      this.lumosLight?.release();
      this.lumosLight = null;
      if (this.lumosSprite) { this.lumosSprite.parent?.remove(this.lumosSprite); this.lumosSprite = null; }
      G.audio.sfx('nox');
    }
  }

  // ------------------------------------------------------------ Leviosa
  liftProp(prop) {
    if (this.held) this.dropHeld();
    prop.lifted = true;
    prop.vel = new THREE.Vector3();
    this.held = { kind: 'prop', target: prop };
    G.ui.floatText(prop.mesh.position.clone().setY(prop.mesh.position.y + 1), 'Leviosa!', 'combo');
    G.story?.onEvent('liftProp');
  }
  holdEnemy(e) {
    if (this.held) this.dropHeld();
    this.held = { kind: 'enemy', target: e };
  }
  dropHeld() {
    const h = this.held;
    if (!h) return;
    this.held = null;
    if (h.kind === 'prop') { h.target.lifted = false; this.thrown.push({ prop: h.target, vel: new THREE.Vector3(0, 0, 0), team: 'player' }); }
    else h.target.endLift?.();
  }
  throwHeld() {
    const h = this.held;
    this.held = null;
    const p = G.player;
    const origin = p.wandPos();
    const aim = this.aimPoint(origin);
    const from = h.kind === 'prop' ? h.target.mesh.position : h.target.pos;
    const dir = aim.point.clone().sub(from).normalize();
    G.audio.sfx('throw');
    p.anim.trigger('cast');
    p.aimT = 0.6;
    G.fx.emit({ pos: from.clone(), color: 0xc28bff, count: 30, speed: 5, size: 0.25, life: 0.4, intensity: 3 });
    if (h.kind === 'prop') {
      h.target.lifted = false;
      this.thrown.push({ prop: h.target, vel: dir.multiplyScalar(24).add(new THREE.Vector3(0, 2, 0)), team: 'player', homing: aim.target });
    } else {
      h.target.throwTo?.(dir.multiplyScalar(18).add(new THREE.Vector3(0, 4, 0)));
    }
  }
  updateHeld(dt) {
    const h = this.held;
    if (!h) return;
    const p = G.player;
    if (h.kind === 'prop') {
      const m = h.target.mesh;
      const want = G.camera.getWorldDirection(_v).setY(0).normalize().multiplyScalar(2.6).add(p.pos).setY(p.pos.y + 2.2 + Math.sin(G.time * 3) * 0.15);
      m.position.lerp(want, 1 - Math.exp(-dt * 8));
      m.rotation.y += dt * 1.5;
      m.rotation.x = Math.sin(G.time * 2) * 0.3;
      if (Math.random() < 0.4) G.fx.emit({ pos: m.position, color: 0xc28bff, count: 1, speed: 0.6, size: 0.15, life: 0.6, intensity: 3, spread: 1 });
      if (m.position.distanceTo(p.pos) > 12) this.dropHeld();
    } else if (!h.target.alive || !(h.target.status.lifted > 0)) this.held = null;
  }
  updateThrown(dt) {
    const col = G.zone.colliders;
    for (const t of this.thrown) {
      const m = t.prop.mesh;
      if (t.homing && t.homing.alive) {
        const want = _v.copy(t.homing.pos).setY(t.homing.pos.y + 1).sub(m.position).normalize().multiplyScalar(t.vel.length());
        t.vel.lerp(want, dt * 3);
      }
      t.vel.y -= 14 * dt;
      m.position.addScaledVector(t.vel, dt);
      m.rotation.x += dt * 8;
      for (const e of G.enemies.list) {
        if (!e.alive) continue;
        if (Math.hypot(e.pos.x - m.position.x, e.pos.z - m.position.z) < e.radius + 0.6 && m.position.y > e.pos.y - 0.3 && m.position.y < e.pos.y + e.height) {
          e.takeHit({ dmg: 32, spell: 'thrown', dir: t.vel.clone().setY(0).normalize() });
          e.status.stun = Math.max(e.status.stun || 0, 1.5);
          t.done = true;
          G.fx.burst(m.position, 0xc28bff, 30, 6);
          G.fx.smokePuff(m.position, 0x6a5a4a, 8);
          G.audio.sfx('slam');
          G.cam.shake(0.25);
          G.story?.onEvent('thrownHit');
          break;
        }
      }
      const g = col.ground(m.position.x, m.position.z, m.position.y + 0.5);
      if (m.position.y - 0.45 <= g.y) {
        m.position.y = g.y + 0.45;
        if (t.vel.length() > 6) { G.audio.sfx('land'); G.fx.smokePuff(m.position, 0x6a5a4a, 4); }
        t.vel.multiplyScalar(0.3);
        t.vel.y = Math.abs(t.vel.y) * 0.3;
        if (t.vel.length() < 1.2) t.done = true;
      }
      col.resolve(m.position, 0.45, 0.9);
    }
    this.thrown = this.thrown.filter((t) => !t.done);
  }

  // ------------------------------------------------------------ Patronus
  castPatronus(origin, dir) {
    const p = G.player;
    const stag = makeStag();
    const flat = dir.clone().setY(0).normalize();
    stag.root.position.copy(p.pos).addScaledVector(flat, 1.5);
    stag.root.rotation.y = Math.atan2(flat.x, flat.z);
    stag.root.scale.setScalar(0.1);
    G.scene.add(stag.root);
    const light = G.lights.attach(stag.root, 0xbfe6ff, 90, 20);
    this.stags.push({ stag, dir: flat, t: 0, light, hit: new Set() });
    postFlash(0.12);
    G.cam.shake(0.3);
    G.input.rumble(0.5, 0.8, 400);
    G.fx.burst(origin, 0xcfeaff, 70, 9, { size: 0.22, life: 0.9 });
    G.fx.shock(p.pos.clone().setY(p.pos.y + 0.2), 0xbfe6ff, 9, 0.8, { intensity: 1.2 });
    for (const e of G.enemies.list) if (e.alive && e.pos.distanceTo(p.pos) < 25) e.onPatronus?.(p.pos);
    G.story?.onEvent('cast', 'patronum');
  }
  updateStags(dt) {
    for (const s of this.stags) {
      s.t += dt;
      const r = s.stag.root;
      r.scale.setScalar(Math.min(1.3, 0.1 + s.t * 4));
      // the stag gallops toward the nearest Dementor it has not struck yet
      let prey = null, pd = 32;
      for (const e of G.enemies.list) {
        if (!e.alive || s.hit.has(e) || e.type !== 'dementor') continue;
        const d = e.pos.distanceTo(r.position);
        if (d < pd) { pd = d; prey = e; }
      }
      if (prey) {
        const want = _v.subVectors(prey.pos, r.position).setY(0).normalize();
        s.dir.lerp(want, Math.min(1, dt * 4)).normalize();
        r.rotation.y = Math.atan2(s.dir.x, s.dir.z);
        if (s.t > 1.6) s.t = 1.6; // keep running while there is prey
        s.chase = (s.chase || 0) + dt;
        if (s.chase > 5) s.t = 2.0;
      }
      r.position.addScaledVector(s.dir, dt * 16);
      const col = G.zone.colliders;
      const g = col.ground(r.position.x, r.position.z, r.position.y + 2);
      r.position.y = Math.max(g.y, col.water); // the stag runs across the lake surface
      s.stag.anim.update(dt);
      const fade = s.t > 2.0 ? Math.max(0, 1 - (s.t - 2.0) / 0.5) : 1;
      s.stag.material.opacity = 0.55 * fade;
      G.fx.emit({ pos: r.position.clone().setY(r.position.y + 1.2), color: 0xcfeaff, count: 4, speed: 1.2, size: 0.22, size1: 0.04, life: 0.8, intensity: 2, spread: 1.6 });
      for (const e of G.enemies.list) {
        if (!e.alive || s.hit.has(e)) continue;
        if (Math.hypot(e.pos.x - r.position.x, e.pos.z - r.position.z) < 2.8 + e.radius) {
          s.hit.add(e);
          e.takeHit({ dmg: e.type === 'dementor' ? 400 : 45, spell: 'patronum', dir: s.dir.clone() });
          G.fx.burst(e.pos.clone().setY(e.pos.y + 1.5), 0xcfeaff, 50, 8);
        }
      }
      if (s.t > 2.5) s.done = true;
    }
    this.stags = this.stags.filter((s) => {
      if (s.done) { G.scene.remove(s.stag.root); s.light.release(); return false; }
      return true;
    });
  }

  clear() {
    for (const pr of this.projectiles) this.removeProjectile(pr);
    this.projectiles = [];
    for (const s of this.stags) { G.scene.remove(s.stag.root); s.light.release(); }
    this.stags = [];
    this.held = null;
    this.thrown = [];
    for (const p of G.zone?.props || []) { p.mesh.position.copy(p.home); p.mesh.rotation.set(0, 0, 0); p.lifted = false; }
  }
}
