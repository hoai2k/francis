// Enemy types added by the later years. Each entry may define model(o) and ai(dt, p)
// (called with `this` = the Enemy) plus onDie / dispose hooks.
import * as THREE from 'three';
import { G } from './state.js';
import { TYPES, Enemy } from './enemies.js';
import { ENEMY_SPELLS } from './spells.js';
import { makeWizard, SKIN_TONES } from './models.js';
import { makeSnake, makeSerpent, makeDummy, makeWerewolf, makeThestral, makeDragon, makeSpider } from './models2.js';
import { rand, pick, damp, dampAngle, clamp } from './util.js';
import { postFlash } from './engine.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
G.makeThestral = makeThestral;
const D = () => G.enemies.dmgScale || 1;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const groundAt = (x, z, y) => G.zone.colliders.ground(x, z, y + 2).y;

ENEMY_SPELLS.venom = { id: 'venom', name: 'Venom', color: 0x80ff40, color2: 0x204010, dmg: 12, speed: 18, radius: 0.5, kind: 'bolt', enemy: true, gravity: 12, burn: 3 };

// ------------------------------------------------------------------ training dummy
TYPES.dummy = {
  name: 'Duelling dummy', hp: 30, radius: 0.4, height: 2.2, speed: 0, weak: { flipendo: 2 }, resist: {}, points: 0, xp: 4,
  model: () => makeDummy(),
  ai() { this.vel.set(0, 0, 0); },
};

// ------------------------------------------------------------------ snake-spawn
TYPES.snake = {
  name: 'Undercroft serpent', hp: 46, radius: 0.45, height: 0.6, speed: 5.5, weak: { incendio: 1.6, confringo: 1.6, flipendo: 1.5, glacius: 1.5 }, resist: { leviosa: 1 }, points: 2,
  model: () => makeSnake(pick(['#3a5a2a', '#4a4a20', '#2a4a3a'])),
  ai(dt, p) {
    const d = flat(this.pos, p.pos);
    if (!this.aggro && d > 16) { this.anim.update(dt, 0); return; }
    this.aggro = true;
    this.biteT = (this.biteT ?? rand(1, 2)) - dt;
    if (this.lunge > 0) {
      this.lunge -= dt;
      if (!this.bit && d < 1.3) { this.bit = true; p.damage(11 * D(), { knock: _v.subVectors(p.pos, this.pos).setY(0).normalize().multiplyScalar(4).clone() }); if (p.status && !p.blocking) p.status.burn = 2; }
    } else {
      // slither in a weaving line toward the player
      const to = _v.subVectors(p.pos, this.pos).setY(0).normalize();
      const side = _w.set(-to.z, 0, to.x).multiplyScalar(Math.sin(this.t * 3 + this.id) * 0.8);
      this.moveToward(this.pos.clone().add(to.add(side).multiplyScalar(3)), this.def.speed, dt, 5);
      this.face(p.pos, dt, 6);
      if (d < 4 && this.biteT <= 0) {
        this.biteT = rand(1.6, 2.6);
        const yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
        G.enemies.telegraph(this.pos.clone(), 1, 0.45, () => {
          if (!this.alive || !this.canAct) return;
          this.lunge = 0.35; this.bit = false;
          this.vel.set(Math.sin(yaw) * 14, 0, Math.cos(yaw) * 14);
          this.anim.trigger('bite');
          G.audio.sfx('whoosh');
        }, { line: true, width: 0.8, length: 4.5, yaw, color: 0x80ff40 });
      }
    }
    this.anim.update(dt, Math.hypot(this.vel.x, this.vel.z));
  },
};

// ------------------------------------------------------------------ Professor Crane, possessed (Year 2 mini-boss)
TYPES.crane = {
  name: 'Professor Crane — possessed', hp: 1150, radius: 0.45, height: 1.9, speed: 4.6, weak: { flipendo: 1.2 }, resist: { stupefy: 0.7 }, points: 60, boss: true, xp: 500,
  model: () => makeWizard({ robeColor: '#2a2a3a', liningColor: '#3a6a2a', hairStyle: 'short', hairColor: '#7a4520', skin: SKIN_TONES[1], eyeGlow: '#80ff40', glasses: true, scale: 1.05 }),
  ai(dt, p) {
    const f = this.hp / this.maxHp;
    const ph = f > 0.6 ? 1 : f > 0.3 ? 2 : 3;
    if (ph !== this.phase) {
      this.phase = ph;
      this.phaseLabel = ['', 'Phase I', 'Phase II — the serpents answer', 'Phase III — the amulet burns'][ph];
      if (ph > 1) {
        G.ui.banner(ph === 2 ? 'Crane calls the serpents!' : 'The amulet blazes green!', ph === 2 ? 'Flipendo knocks the snakes senseless.' : 'Dodge the volleys and keep casting!', '');
        G.audio.sfx('dementor');
        postFlash(0.2);
        const C = this.o.center || this.pos;
        for (let i = 0; i < (ph === 2 ? 3 : 4); i++) { const a = (i / 4) * Math.PI * 2; const e = G.enemies.spawn('snake', C.clone().add(new THREE.Vector3(Math.cos(a) * 7, 0, Math.sin(a) * 7)), { aggro: true }); e.summon = true; }
      }
    }
    this.level = 3 + ph;
    this.o.spells = ph === 1 ? ['curse', 'stupefyE'] : ph === 2 ? ['curse', 'incendioE', 'venom'] : ['killing', 'venom', 'incendioE'];
    this.o.volley = ph === 3 ? 3 : ph === 2 ? 2 : 1;
    this.o.range = 11;
    this.aiWizard(dt, p);
    // the amulet's green glow
    if (Math.random() < 0.3) G.fx.emit({ pos: this.pos.clone().setY(this.pos.y + 1.3), color: 0x80ff40, count: 1, speed: 0.6, size: 0.2, life: 0.6, intensity: 3, noScale: true });
  },
};

// ------------------------------------------------------------------ the Wyrm of the Undercroft (Year 2 boss)
TYPES.serpent = {
  name: 'The Wyrm of the Undercroft', hp: 1900, radius: 1.6, height: 3.2, speed: 7, weak: { combo: 1.3, confringo: 1.2 }, resist: { stupefy: 0.5, leviosa: 0, petrificus: 0.4, flipendo: 0.2, accio: 0 }, points: 150, boss: true, xp: 900, flying: true,
  model: () => makeSerpent(),
  ai(dt, p) {
    const B = this;
    const C = B.o.center;
    const m = B.model;
    if (!B.init) {
      B.init = true; B.phase = 1; B.phaseLabel = 'Phase I'; B.atkT = 2; B.hoverY = 2.5;
      G.scene.add(m.body);
      B.roar(1);
    }
    const f = B.hp / B.maxHp;
    const ph = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
    if (ph !== B.phase) B.serpentPhase(ph);
    const spd = ph === 3 ? 1.3 : 1;
    // submerged in a pool (phase 2 trick): invulnerable, then bursts out with a lunge
    if (B.under > 0) {
      B.under -= dt;
      B.invuln = true;
      B.hidden = true;
      B.hoverY = -4;
      if (B.under <= 0) {
        const pool = pick(B.o.pools);
        B.pos.set(pool.x, pool.y, pool.z);
        B.hoverY = 2.5;
        B.invuln = false; B.hidden = false;
        G.fx.emit({ pos: pool.clone().setY(pool.y + 0.5), color: 0x6ab8ff, count: 80, speed: 9, size: 0.3, life: 1, intensity: 2, gravity: 12, up: 6 });
        G.audio.sfx('splash'); G.cam.shake(0.4);
        B.lungeAt(p, 0.7);
      }
      m.layBody(dt, groundAt(B.pos.x, B.pos.z, B.pos.y), true);
      return;
    }
    // the gaze: eyes blaze, and anyone looking straight at it without a shield is petrified
    if (B.gazeT > 0) {
      B.gazeT -= dt;
      m.anim.gaze = true;
      B.face(p.pos, dt, 3);
      if (G.spells.lumosOn && !B.dazzled && flat(B.pos, p.pos) < 22) {
        B.dazzled = true; B.gazeT = 0; m.anim.gaze = false;
        B.status.stun = 3.2; B.vulnT = 3.2;
        G.ui.banner('Dazzled!', 'Lumos blinded the Wyrm — hit it now!', 'unlock');
        G.audio.sfx('lumos');
      } else if (B.gazeT <= 0) {
        m.anim.gaze = false;
        const look = G.camera.getWorldDirection(_v);
        const to = _w.subVectors(B.pos, G.camera.position).normalize();
        if (look.dot(to) > 0.55 && !p.blocking && p.alive && flat(B.pos, p.pos) < 30) {
          p.damage(18 * D(), { blockable: false });
          p.petrified = 2.4;
          G.ui.floatText(p.pos.clone().setY(p.pos.y + 2.2), 'Petrified!', 'hurt');
          G.audio.sfx('petrificus');
        } else G.ui.floatText(p.pos.clone().setY(p.pos.y + 2.2), 'You looked away!', 'dodge');
      }
    }
    // lunge in progress
    if (B.lunge > 0) {
      B.lunge -= dt;
      B.pos.addScaledVector(B.lungeV, dt);
      if (!B.bit && flat(B.pos, p.pos) < 2.6) { B.bit = true; p.damage(30 * D(), { knock: B.lungeV.clone().setY(0).normalize().multiplyScalar(10) }); }
      m.layBody(dt, groundAt(B.pos.x, B.pos.z, B.pos.y), false);
      return;
    }
    // circle the arena, keeping its head up
    B.circleA = (B.circleA ?? 0) + dt * 0.35 * spd;
    const R = 13;
    const goal = C.clone().add(new THREE.Vector3(Math.cos(B.circleA) * R, 0, Math.sin(B.circleA) * R));
    B.moveToward(goal, B.def.speed * spd, dt, 2);
    B.face(p.pos, dt, 4);
    B.hoverY = 2.4 + Math.sin(B.t * 1.5) * 0.4;
    B.atkT -= dt * spd;
    if (B.atkT <= 0 && !B.gazeT) {
      const r = Math.random();
      const d = flat(B.pos, p.pos);
      if (ph >= 2 && r < 0.2) { B.gazeT = 1.6; G.ui.toast('The Wyrm’s eyes blaze! <b>Look away</b>, raise <b>Protego</b> — or dazzle it with <b>Lumos</b>!', 'tip', 3000); G.audio.sfx('roar'); B.dazzled = false; B.atkT = 3; }
      else if (ph === 2 && r < 0.35) { B.dive(); B.atkT = 4; }
      else if (r < 0.55 || d > 14) { B.lungeAt(p, 1.0); B.atkT = rand(2.2, 3); }
      else if (r < 0.8) { B.spit(p, ph); B.atkT = rand(2, 2.8); }
      else { B.tailSweep(p); B.atkT = rand(2, 2.6); }
      if (ph === 3 && Math.random() < 0.5) B.rockfall(p);
    }
    m.anim.update(dt, 0);
    m.layBody(dt, groundAt(B.pos.x, B.pos.z, B.pos.y), false);
    if (B.vulnT > 0) { B.vulnT -= dt; }
  },
  onDie() {
    const m = this.model;
    let t = 0;
    const sink = () => { t += 0.016; m.body.position.y -= 0.03; if (t < 3) requestAnimationFrame(sink); else G.scene.remove(m.body); };
    sink();
  },
  dispose() { G.scene.remove(this.model.body); },
};

// helpers mixed into Enemy for the serpent
export const serpentMixin = {
  roar(k = 1) { this.anim.set('roar'); G.audio.sfx('roar'); G.cam.shake(0.4 * k); setTimeout(() => this.anim.set('idle'), 1200); },
  serpentPhase(ph) {
    this.phase = ph;
    this.phaseLabel = ['', 'Phase I', 'Phase II — it hides in the pools', 'Phase III — the chamber collapses'][ph];
    this.roar(1.2);
    postFlash(0.2);
    if (ph === 2) {
      G.ui.banner('The Wyrm dives!', 'It strikes from the pools — and its gaze petrifies. Look away or block!', '');
      for (let i = 0; i < 3; i++) { const e = G.enemies.spawn('snake', this.o.center.clone().add(new THREE.Vector3(rand(-8, 8), 0, rand(-8, 8))), { aggro: true }); e.summon = true; }
      this.dive();
    }
    if (ph === 3) G.ui.banner('The chamber shakes!', 'Rocks are falling. Keep moving!', '');
  },
  dive() {
    const pool = this.o.pools.reduce((a, b) => (flat(a, this.pos) < flat(b, this.pos) ? a : b));
    G.fx.emit({ pos: pool.clone().setY(pool.y + 0.5), color: 0x6ab8ff, count: 60, speed: 7, size: 0.3, life: 1, intensity: 2, gravity: 12, up: 5 });
    G.audio.sfx('splash');
    this.under = rand(2.5, 3.5);
  },
  lungeAt(p, delay) {
    const yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    const dist = Math.min(26, flat(this.pos, p.pos) + 6);
    G.enemies.telegraph(this.pos.clone().setY(groundAt(this.pos.x, this.pos.z, this.pos.y)), 1, delay, () => {
      if (!this.alive || this.under > 0) return;
      this.lunge = 0.55; this.bit = false;
      this.lungeV = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(dist / 0.55);
      this.anim.trigger('bite', 0.6);
      G.audio.sfx('roar');
    }, { line: true, width: 3.2, length: dist, yaw, color: 0xff3020 });
  },
  spit(p, ph) {
    this.anim.trigger('bite', 0.6);
    const n = ph === 3 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const at = p.pos.clone().add(new THREE.Vector3(i ? rand(-4, 4) : 0, 0, i ? rand(-4, 4) : 0));
      at.y = groundAt(at.x, at.z, at.y);
      G.enemies.telegraph(at, 2.2, 1.1 + i * 0.12, () => {
        G.fx.emit({ pos: at.clone().setY(at.y + 0.3), color: 0x80ff40, color2: 0x204010, count: 40, speed: 4, size: 0.4, life: 0.8, intensity: 2.5, up: 3 });
        G.audio.sfx('splash');
        if (flat(p.pos, at) < 2.3 && p.pos.y - at.y < 1.5) { p.damage(14 * D(), { dodgeable: true }); p.status.burn = 3; }
        G.enemies.hazard?.(at, 2, 4, 6, 0x80ff40);
      }, { color: 0x80ff40 });
    }
    G.audio.sfx('curse');
  },
  tailSweep(p) {
    const tail = this.model.trail[Math.min(this.model.trail.length - 1, 60)] || this.pos;
    const c = new THREE.Vector3(tail.x, groundAt(tail.x, tail.z, tail.y), tail.z);
    G.enemies.telegraph(c, 6, 1.0, () => {
      G.audio.sfx('whoosh'); G.cam.shake(0.3);
      if (flat(p.pos, c) < 6.2 && p.pos.y - c.y < 1.2) p.damage(22 * D(), { knock: _v.subVectors(p.pos, c).setY(0).normalize().multiplyScalar(10).clone() });
    }, { color: 0xff8020 });
  },
  rockfall(p) {
    for (let i = 0; i < 4; i++) {
      const at = p.pos.clone().add(new THREE.Vector3(rand(-6, 6), 0, rand(-6, 6)));
      if (i === 0) at.copy(p.pos);
      at.y = groundAt(at.x, at.z, at.y);
      G.enemies.telegraph(at, 1.8, 1.2 + i * 0.2, () => {
        G.fx.smokePuff(at, 0x6a6058, 10, { speed: 3 });
        G.audio.sfx('slam'); G.cam.shake(0.2);
        if (flat(p.pos, at) < 1.9) p.damage(18 * D());
      });
    }
  },
};
Object.assign(Enemy.prototype, serpentMixin);

// ------------------------------------------------------------------ werewolf (Year 3 full-moon chase: you cannot win, only escape)
TYPES.werewolf = {
  name: 'The werewolf', hp: 99999, radius: 0.7, height: 2.4, speed: 6.4, weak: {}, resist: { all: 0.02 }, points: 0, xp: 300,
  model: () => makeWerewolf(),
  ai(dt, p) {
    const d = flat(this.pos, p.pos);
    this.atkT = (this.atkT ?? 2) - dt;
    if (this.leap > 0) {
      this.leap -= dt;
      this.pos.addScaledVector(this.leapV, dt);
      if (!this.hit && d < 1.6) { this.hit = true; p.damage(20 * D(), { knock: this.leapV.clone().setY(0).normalize().multiplyScalar(9) }); }
      this.anim.update(dt, 10);
      return;
    }
    if (this.howlT > 0) { this.howlT -= dt; this.anim.set('howl'); this.anim.update(dt, 0); return; }
    this.anim.set('idle');
    this.face(p.pos, dt, 6);
    const sp = this.def.speed * (d > 25 ? 1.35 : 1); // rubber band so it stays on your heels
    this.moveToward(p.pos, sp, dt, 4);
    if (this.atkT <= 0 && d < 9) {
      this.atkT = rand(1.8, 2.6);
      const yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      G.enemies.telegraph(this.pos.clone(), 1, 0.65, () => {
        if (!this.alive || !this.canAct) return;
        this.leap = 0.45; this.hit = false;
        this.leapV = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(22);
        G.audio.sfx('roar');
      }, { line: true, width: 1.6, length: 10, yaw, color: 0xff3020 });
    } else if (this.atkT <= 0 && Math.random() < 0.02) { this.howlT = 1.2; G.audio.sfx('roar'); this.atkT = 3; }
    this.anim.update(dt, Math.hypot(this.vel.x, this.vel.z));
  },
};

// ------------------------------------------------------------------ the dragon (Year 4 first task: subdue it, then grab the golden egg)
ENEMY_SPELLS.dragonfire = { id: 'incendio', name: 'Dragonfire', color: 0xff6010, color2: 0xffe070, dmg: 16, speed: 20, radius: 0.8, kind: 'bolt', enemy: true, burn: 3, gravity: 6 };
TYPES.dragon = {
  name: 'The Ridgeback', hp: 2400, radius: 2.4, height: 5, speed: 3.2, weak: { glacius: 1.5, aguamenti: 1.6, combo: 1.3 }, resist: { stupefy: 0.45, leviosa: 0, accio: 0, depulso: 0.1, flipendo: 0.1, incendio: 0.2, confringo: 0.4, petrificus: 0.3 }, points: 200, boss: true, xp: 1200, flying: true,
  model: (o) => { const m = makeDragon(o.color || '#5a2a1a'); m.root.scale.setScalar(1.25); return m; },
  ai(dt, p) {
    const B = this, C = B.o.center || B.pos;
    if (!B.init) { B.init = true; B.phase = 1; B.phaseLabel = 'Phase I'; B.atkT = 2.5; B.hoverY = 0; B.roar(1); }
    const f = B.hp / B.maxHp;
    const ph = f > 0.6 ? 1 : f > 0.3 ? 2 : 3;
    if (ph !== B.phase) {
      B.phase = ph;
      B.phaseLabel = ['', 'Phase I', 'Phase II — it takes to the air', 'Phase III — enraged'][ph];
      B.roar(1.3); postFlash(0.2);
      if (ph === 2) { G.ui.banner('The dragon takes flight!', 'Watch the ground for its fire runs — Glacius and Aguamenti hurt it most', ''); B.anim.set('fly'); B.flyT = 16; }
      if (ph === 3) { G.ui.banner('The dragon is enraged!', 'It lands — and the arena burns', ''); B.anim.set('idle'); B.flyT = 0; }
    }
    const spd = ph === 3 ? 1.35 : 1;
    const d = flat(B.pos, p.pos);
    // airborne: circle high above the arena, strafing lines of fire and lobbing fireballs
    if (B.flyT > 0) {
      B.flyT -= dt;
      B.hoverY = damp(B.hoverY, 11, 1.5, dt);
      B.circleA = (B.circleA ?? 0) + dt * 0.45;
      B.moveToward(C.clone().add(new THREE.Vector3(Math.cos(B.circleA) * 24, 0, Math.sin(B.circleA) * 24)), 9, dt, 2);
      B.face(p.pos, dt, 2);
      B.atkT -= dt;
      if (B.atkT <= 0) {
        if (Math.random() < 0.5) B.fireRun(p); else B.fireballs(p, 3);
        B.atkT = rand(2.4, 3.2);
      }
      if (B.flyT <= 0) { B.anim.set('idle'); G.ui.toast('The dragon lands, panting smoke — hit it!', 'tip', 2500); B.status.stun = 2.5; B.landT = rand(10, 14); }
      B.anim.update(dt, 0);
      return;
    }
    B.hoverY = damp(B.hoverY, 0, 2, dt);
    if (ph === 2 && B.landT !== undefined && (B.landT -= dt) <= 0) { B.landT = undefined; B.flyT = 14; B.anim.set('fly'); B.roar(1); G.ui.toast('It takes off again — <b>Descendo</b> drags it down!', 'tip', 2500); }
    if (B.breathT > 0) {
      // a sweeping cone of fire in front of the head
      B.breathT -= dt;
      B.anim.set('breath');
      B.yaw += B.sweep * dt;
      const fwd = _v.set(Math.sin(B.yaw), 0, Math.cos(B.yaw));
      const head = B.model.parts.head.getWorldPosition(_w);
      G.fx.emit({ pos: head, vel: fwd.clone().multiplyScalar(18), color: 0xffa020, color2: 0xff2000, count: 4, speed: 3, size: 0.9, size1: 2.2, life: 0.7, intensity: 3, spread: 0.4, drag: 0.6 });
      const to = new THREE.Vector3().subVectors(p.pos, B.pos).setY(0);
      const dist = to.length();
      if (dist < 15 && to.normalize().dot(fwd) > 0.8 && !B.breathHit) {
        B.breathHit = 0.35;
        p.damage(9 * D(), { dodgeable: true }); if (!p.blocking) p.status.burn = 2.5;
      }
      if (B.breathHit) B.breathHit = Math.max(0, B.breathHit - dt);
      if (Math.random() < dt * 4) G.enemies.hazard(B.pos.clone().addScaledVector(fwd, rand(5, 12)).setY(groundAt(B.pos.x, B.pos.z, B.pos.y)), 1.8, 4, 8, 0xff6010);
      if (B.breathT <= 0) B.anim.set('idle');
      B.anim.update(dt, 0);
      return;
    }
    B.face(p.pos, dt, 2 * spd);
    if (d > 9) B.moveToward(p.pos, B.def.speed * spd, dt, 2); else { B.vel.x = damp(B.vel.x, 0, 4, dt); B.vel.z = damp(B.vel.z, 0, 4, dt); }
    B.atkT -= dt * spd;
    if (B.atkT <= 0) {
      const r = Math.random();
      const behind = _v.subVectors(p.pos, B.pos).setY(0).normalize().dot(_w.set(Math.sin(B.yaw), 0, Math.cos(B.yaw))) < -0.3;
      if (behind && d < 9) B.tailWhip(p);
      else if (d < 15 && r < 0.5) B.breath(ph);
      else if (d < 8) B.stomp();
      else B.fireballs(p, ph === 3 ? 5 : 3);
      B.atkT = rand(2.2, 3) / spd;
      if (ph === 3 && Math.random() < 0.3) B.fireRun(p);
    }
    B.anim.update(dt, Math.hypot(B.vel.x, B.vel.z));
  },
  onSpell(sp) {
    // Descendo drags it out of the sky
    if (sp === 'descendo' && this.flyT > 0.5) { this.flyT = 0.01; this.hoverY = 0; G.ui.banner('Grounded!', 'Descendo brought the dragon crashing down', 'unlock'); G.cam.shake(0.6); G.audio.sfx('slam'); this.takeHit({ dmg: 120, spell: 'thrown' }); }
  },
  onDie() {
    // subdued, not slain: it limps off into the sky and the handlers take over
    const root = this.root;
    this.root = new THREE.Group();
    G.ui.banner('The dragon is subdued!', 'It retreats to its handlers — grab the golden egg', 'unlock');
    let t = 0;
    const fly = () => { t += 0.016; root.position.y += t * 0.25; root.position.z -= 0.15; root.rotation.x = -0.3; if (t < 4 && root.parent) requestAnimationFrame(fly); else root.parent?.remove(root); };
    this.model.anim.set('fly');
    fly();
  },
};
Object.assign(Enemy.prototype, {
  breath(ph) {
    const yaw0 = this.yaw - 0.6;
    G.enemies.telegraph(this.pos.clone().setY(groundAt(this.pos.x, this.pos.z, this.pos.y)), 1, 0.9, () => {
      if (!this.alive || !this.canAct) return;
      this.yaw = yaw0; this.sweep = ph === 3 ? 0.9 : 0.6; this.breathT = 2;
      G.audio.sfx('incendio'); G.audio.sfx('roar');
    }, { line: true, width: 9, length: 15, yaw: this.yaw, color: 0xff5010 });
  },
  tailWhip(p) {
    const c = this.pos.clone().addScaledVector(_v.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), 3);
    c.y = groundAt(c.x, c.z, c.y);
    this.anim.trigger('sweep', 0.8);
    G.enemies.telegraph(c, 5.5, 0.8, () => {
      G.audio.sfx('whoosh'); G.cam.shake(0.3);
      if (flat(p.pos, c) < 5.7 && p.pos.y - c.y < 1.5) p.damage(24 * D(), { knock: _v.subVectors(p.pos, c).setY(0).normalize().multiplyScalar(12).clone() });
    }, { color: 0xff8020 });
  },
  stomp() {
    const c = this.pos.clone().setY(groundAt(this.pos.x, this.pos.z, this.pos.y));
    G.enemies.telegraph(c, 7, 1.0, () => { G.audio.sfx('slam'); G.cam.shake(0.6); this.shockwave(c); });
  },
  fireballs(p, n) {
    this.anim.set('roar');
    setTimeout(() => {
      if (!this.alive) return;
      this.anim.set(this.flyT > 0 ? 'fly' : 'idle');
      const from = this.model.parts.head.getWorldPosition(new THREE.Vector3());
      for (let i = 0; i < n; i++) {
        const at = p.pos.clone().add(new THREE.Vector3(i ? rand(-5, 5) : 0, 0, i ? rand(-5, 5) : 0));
        at.y = groundAt(at.x, at.z, at.y);
        G.enemies.telegraph(at, 2.4, 1.0 + i * 0.15, () => {
          G.fx.emit({ pos: at.clone().setY(at.y + 0.4), color: 0xffa020, color2: 0xff2000, count: 40, speed: 6, size: 0.6, life: 0.7, intensity: 3, up: 4 });
          G.audio.sfx('confringo');
          if (flat(p.pos, at) < 2.5 && p.pos.y - at.y < 1.6) { p.damage(16 * D(), { dodgeable: true }); p.status.burn = 2; }
          G.enemies.hazard(at, 2, 3, 8, 0xff6010);
        }, { color: 0xff5010 });
        G.fx.emit({ pos: from, color: 0xffa020, count: 10, speed: 4, size: 0.6, life: 0.4, intensity: 3 });
      }
      G.audio.sfx('incendio');
    }, 500);
  },
  fireRun(p) {
    // a straight line of fire across the arena, through where you stand
    const yaw = rand(0, Math.PI * 2);
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const start = p.pos.clone().addScaledVector(dir, -14);
    start.y = groundAt(start.x, start.z, start.y);
    G.enemies.telegraph(start, 1, 1.3, () => {
      G.audio.sfx('roar');
      for (let i = 0; i <= 7; i++) {
        const at = start.clone().addScaledVector(dir, i * 4);
        at.y = groundAt(at.x, at.z, at.y);
        setTimeout(() => {
          G.fx.emit({ pos: at.clone().setY(at.y + 0.4), color: 0xffa020, color2: 0xff2000, count: 18, speed: 4, size: 0.7, life: 0.6, intensity: 3, up: 3 });
          if (flat(p.pos, at) < 2.6 && p.pos.y - at.y < 1.6) { p.damage(14 * D(), { dodgeable: true }); p.status.burn = 2; }
          if (i % 2 === 0) G.enemies.hazard(at, 2, 3, 8, 0xff6010);
        }, i * 70);
      }
    }, { line: true, width: 3.5, length: 28, yaw, color: 0xff5010 });
  },
});

// ------------------------------------------------------------------ acromantula (forest depths and the maze)
TYPES.spider = {
  name: 'Acromantula', hp: 90, radius: 0.9, height: 1.3, speed: 6, weak: { incendio: 1.8, confringo: 1.8, lumos: 1, diffindo: 1.4 }, resist: { leviosa: 0.5 }, points: 3, xp: 14,
  model: (o) => makeSpider(o.scale || 1),
  ai(dt, p) {
    const d = flat(this.pos, p.pos);
    if (!this.aggro && d > 18) { this.anim.update(dt, 0); return; }
    this.aggro = true;
    this.atkT = (this.atkT ?? rand(1, 2.5)) - dt;
    if (this.lunge > 0) {
      this.lunge -= dt;
      if (!this.bit && d < 1.6) { this.bit = true; p.damage(13 * D(), { knock: _v.subVectors(p.pos, this.pos).setY(0).normalize().multiplyScalar(5).clone() }); if (!p.blocking) p.status.burn = 1.5; }
      this.anim.update(dt, 8);
      return;
    }
    // skitter sideways while closing in
    const to = _v.subVectors(p.pos, this.pos).setY(0).normalize();
    const side = _w.set(-to.z, 0, to.x).multiplyScalar(Math.sin(this.t * 1.7 + this.id * 2) * 1.2);
    if (d > 3) this.moveToward(this.pos.clone().add(to.add(side).multiplyScalar(3)), this.def.speed, dt, 6);
    else { this.vel.x = damp(this.vel.x, 0, 6, dt); this.vel.z = damp(this.vel.z, 0, 6, dt); }
    this.face(p.pos, dt, 7);
    if (this.atkT <= 0) {
      this.atkT = rand(1.8, 2.8);
      const yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (d < 6) {
        G.enemies.telegraph(this.pos.clone(), 1, 0.5, () => {
          if (!this.alive || !this.canAct) return;
          this.lunge = 0.35; this.bit = false;
          this.vel.set(Math.sin(yaw) * 16, 0, Math.cos(yaw) * 16);
          this.anim.trigger('bite');
          G.audio.sfx('whoosh');
        }, { line: true, width: 1.2, length: 6, yaw, color: 0xff3020 });
      } else if (d < 16) {
        // web spit: a sticky patch that roots you for a moment
        const at = p.pos.clone(); at.y = groundAt(at.x, at.z, at.y);
        G.enemies.telegraph(at, 1.8, 0.9, () => {
          G.fx.emit({ pos: at.clone().setY(at.y + 0.3), color: 0xe8e8e0, count: 30, speed: 3, size: 0.25, life: 0.8, intensity: 1.5 });
          if (flat(p.pos, at) < 1.9 && p.pos.y - at.y < 1.5 && p.alive) { p.petrified = Math.max(p.petrified || 0, 1.1); G.ui.floatText(p.pos.clone().setY(p.pos.y + 2.2), 'Webbed!', 'hurt'); }
        }, { color: 0xe8e8e0 });
        G.audio.sfx('splash');
      }
    }
    this.anim.update(dt, Math.hypot(this.vel.x, this.vel.z));
  },
};

// ------------------------------------------------------------------ the Hollow King (returns in Year 4; the final duel in Year 7)
TYPES.hollowking = {
  name: 'The Hollow King', hp: 99999, radius: 0.55, height: 2.5, speed: 4.2, weak: {}, resist: { all: 0.02 }, points: 0, boss: true, xp: 0,
  model: () => makeWizard({ robeColor: '#0a0a0c', liningColor: '#0a3a1a', hood: false, mask: true, eyeGlow: '#40ff70', skin: '#e8e4dc', bald: true, scale: 1.4 }),
  ai(dt, p) {
    this.level = this.o.level || 7;
    this.o.spells = this.o.spells || ['killing', 'curse', 'curse'];
    this.o.volley = this.o.volley || 2;
    this.o.range = 18;
    this.aiWizard(dt, p);
    if (Math.random() < 0.4) G.fx.emit({ pos: this.pos.clone().setY(this.pos.y + rand(0.2, 2.4)), color: 0x40ff70, count: 1, speed: 0.4, size: 0.25, life: 0.8, intensity: 2.5, noScale: true });
  },
};
