// Arcade kart physics + model animation.
import * as THREE from 'three';
import { buildKart } from './characters.js';
import { buildDriver, DriverAnim, combinedStats } from './driver.js';
import { plastic } from './lego.js';

const G = 42;
const DRIFT_LEVELS = [1.0, 2.1, 3.3];
const DRIFT_BOOST = [0.7, 1.15, 1.7];
export const SPARK_COLORS = [0x7fd4ff, 0xff9a1a, 0xd05aff];

// Angle helpers are constant-time and never loop: a while-loop wrap spins forever on a
// huge or infinite angle (that froze the game once after a bad time step).
const TAU = Math.PI * 2;
export function wrapAngle(a) {
  if (!Number.isFinite(a)) return 0;
  if (a >= -Math.PI && a <= Math.PI) return a;
  a = (a + Math.PI) % TAU;
  return (a < 0 ? a + TAU : a) - Math.PI;
}
export function angleDiff(a, b) { return wrapAngle(b - a); }
export function lerpAngle(a, b, t) {
  t = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  return wrapAngle(a + angleDiff(a, b) * t);
}
const clampN = (v, lo, hi, def = 0) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def);

export class Kart {
  constructor(race, ch, idx, player = null, driver = null, glider = null) {
    this.race = race;
    this.track = race.track;
    this.ch = ch;
    this.driver = driver;            // character driver definition (null only if no driver pack loaded)
    this.gliderDef = glider;         // glider definition (gliders.js); null = the default Brick Wing
    this.idx = idx;
    this.player = player;            // local player object or null for AI
    this.human = !!player;
    const rig = driver ? buildDriver(driver) : null;
    const m = buildKart(ch, rig, glider);
    if (rig) this.anim = new DriverAnim(rig);
    this.camLift = m.top ? Math.max(0, m.top - 2.2) * 0.85 : 0;   // tall drivers: chase camera rides higher
    this.model = m;
    race.scene.add(m.root);
    m.root.rotation.order = 'YXZ';
    // only the chassis and wheels cast shadows (keeps the shadow pass cheap with 13+ karts)
    m.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    for (const sh of [].concat(m.shadow || m.body.children[0])) sh?.traverse((o) => { if (o.isMesh && !o.material.transparent) o.castShadow = true; });
    for (const w of m.wheels) w.spin.castShadow = true;
    const s = driver ? combinedStats(ch.stats, driver) : ch.stats;
    const cc = race.cc;
    this.topSpeed = 37 * cc * (0.935 + s.speed * 0.026);
    this.accel = 15.5 * (0.78 + s.accel * 0.1) * (0.85 + cc * 0.15);
    this.turnRate = 2.05 * (0.86 + s.handling * 0.045);
    this.weight = 0.7 + s.weight * 0.15;
    this.speedMult = 1;               // AI rubber-banding
    this.pos = new THREE.Vector3();
    this.yaw = 0; this.moveYaw = 0;
    this.speed = 0; this.vy = 0; this.grounded = true;
    this.loc = {};
    this.lap = 0; this.finished = false; this.finishTime = 0;
    this.rank = idx + 1;
    this.item = null; this.itemCount = 0; this.roulette = 0; this.rouletteItem = null;
    this.nextItem = null; this.roulette2 = 0; this.rouletteItem2 = null;
    this.bulletTime = 0; this.megaTime = 0; this.ghostTime = 0; this.frozenTime = 0; this.inkTime = 0; this.goldTurboTime = 0; this.megaScale = 1;
    this.studs = 0;
    this.drift = { active: false, dir: 0, charge: 0, level: 0, queued: false };
    this.boostTime = 0; this.spinTime = 0; this.wreckTime = 0; this.invuln = 0;
    this.goldenTime = 0; this.shieldTime = 0; this.respawn = 0; this.airTime = 0;
    this.trick = false; this.trickDone = false;
    this.offroad = false; this.surf = 'road';
    this.lastSafe = 0;
    this.visYaw = 0; this.visPitch = 0; this.visRoll = 0; this.driftVis = 0; this.squash = 0;
    this.bumpCool = 0; this.wallCool = 0;
    // collision physics: a sideways "knock" velocity that slides off, a yaw kick and a body rock
    this.kvx = 0; this.kvz = 0; this.yawKick = 0; this.knockRoll = 0;
    this.heat = 0;                    // recent hits (decays): back-to-back hits earn extra recovery time
    this.startBoost = 0;
    this.wrongWay = 0;
    this.ctl = { throttle: 0, brake: 0, steer: 0, drift: false, driftPressed: false, itemPressed: false, back: false };
    // exhaust flames
    this.flames = [];
    const fm = plastic(0xffa020, { trans: true, opacity: 0.9, emissive: 0xff6a00, emissiveIntensity: 3 });
    // vehicles may say where their exhausts are (and the flames ride on their sprung body)
    // ([] = no flames; a 5th number scales a flame's width)
    const spots = m.exhaust ?? [[0.62, 1.24, -1.3], [-0.62, 1.24, -1.3]];
    for (const [x, y, z, rx, sc = 1] of spots) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.16 * sc, 1, 8).translate(0, 0.5, 0), fm);
      f.rotation.x = rx ?? -Math.PI / 2 + 0.9;
      f.position.set(x, y, z);
      f.scale.setScalar(0.001);
      (m.exhaust && m.sprung ? m.sprung : m.body).add(f);
      this.flames.push(f);
    }
    // shield & golden aura
    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 16), new THREE.MeshStandardMaterial({ color: 0x66ccff, transparent: true, opacity: 0.25, roughness: 0.05, emissive: 0x2288ff, emissiveIntensity: 0.6, depthWrite: false }));
    this.bubble.position.y = 1; this.bubble.visible = false;
    m.root.add(this.bubble);
    this.aura = new THREE.Mesh(new THREE.SphereGeometry(2.8, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.aura.position.y = 1; this.aura.visible = false;
    m.root.add(this.aura);
    this.hidden = 0;
  }

  place(i, lat) {
    const tr = this.track;
    tr.at(i, lat, 0, this.pos);
    this.yaw = this.moveYaw = tr.yawAt(i);
    this.speed = 0; this.vy = 0; this.grounded = true; this.kvx = this.kvz = this.yawKick = 0;
    tr.locate(this.pos.x, this.pos.y, this.pos.z, i, this.loc);
    this.lastSafe = this.loc.i;
    this.syncModel(0);
  }

  get raceDist() { return this.lap * this.track.N + this.loc.i + this.loc.t; }
  get boosting() { return this.boostTime > 0 || this.goldenTime > 0; }
  get stunned() { return this.spinTime > 0 || this.wreckTime > 0 || this.respawn > 0 || this.frozenTime > 0; }
  get invincible() { return this.goldenTime > 0 || this.invuln > 0 || this.respawn > 0 || this.bulletTime > 0 || this.ghostTime > 0; }
  forward(out = new THREE.Vector3()) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }

  boost(t, instant = true) {
    this.boostTime = Math.max(this.boostTime, t);
    if (instant) this.speed = Math.max(this.speed, this.topSpeed * 1.12);
    this.race.fx.boostBurst(this);
    if (this.human) this.race.audio.sfx('boost');
  }

  // world-space velocity, knock included
  velocity(out = { x: 0, z: 0 }) {
    out.x = Math.sin(this.moveYaw) * this.speed + this.kvx;
    out.z = Math.cos(this.moveYaw) * this.speed + this.kvz;
    return out;
  }
  // A physical shove: a change of velocity (world space). The part along the direction of travel
  // speeds the kart up or slows it down (never below 55% in one shove, so a bump can't stop you
  // dead); the rest knocks it sideways and slides off over a moment. Callers divide impulses by
  // weight, so heavy karts barely move and light ones get thrown about.
  shove(dvx, dvz, spin = 0) {
    if (this.respawn > 0 || this.bulletTime > 0) return;
    const fx = Math.sin(this.moveYaw), fz = Math.cos(this.moveYaw);
    const along = dvx * fx + dvz * fz;
    if (along < 0) this.speed = this.speed > 0 ? Math.max(this.speed * 0.55, this.speed + along) : this.speed + along * 0.5;
    else this.speed = Math.min(this.speed + along, Math.max(this.speed, this.topSpeed * 1.1));
    let kx = this.kvx + dvx - fx * along, kz = this.kvz + dvz - fz * along;
    const m = Math.hypot(kx, kz);
    if (m > 16) { kx *= 16 / m; kz *= 16 / m; }
    this.kvx = kx; this.kvz = kz;
    // the nose swings a little with the shove and the body rocks away from it
    const lat = dvx * -Math.cos(this.yaw) + dvz * Math.sin(this.yaw);   // > 0: pushed to the right
    this.yawKick = Math.max(-2.5, Math.min(2.5, this.yawKick + spin - lat * 0.1));
    this.knockRoll = Math.max(-0.35, Math.min(0.35, this.knockRoll - lat * 0.03));
    if (Math.abs(lat) > 3) this.cancelDrift();
  }

  // --- hits ----------------------------------------------------------------
  shieldBlocks() {
    if (this.shieldTime > 0) {
      this.shieldTime = 0; this.bubble.visible = false;
      this.race.fx.pop(this.pos, 0x66ccff);
      this.race.audio.sfx('shield', this.pos);
      return true;
    }
    return false;
  }
  hit(kind, by = null) {
    if (this.invincible || this.finishedCoast) return false;
    if (this.shieldBlocks()) return false;
    this.cancelDrift();
    if (this.megaTime > 0) {
      // a hit only shrinks a mega kart back to normal size
      this.megaTime = 0; this.speed *= 0.6; this.invuln = 1.2;
      this.race.audio.sfx('spin', this.pos);
      this.race.onHit?.(this, 'spin', by);
      this.emote('ouch');
      return true;
    }
    if (kind === 'freeze') {
      this.frozenTime = 1.8; this.speed *= 0.3;
      this.race.audio.sfx('shield', this.pos);
      this.race.fx.pop(this.pos, 0x9ae0ff);
      this.invuln = 2.4;
      if (this.player) this.player.rumble(0.5, 250);
      this.race.onHit?.(this, 'spin', by);
      this.emote('ouch');
      return true;
    }
    if (kind === 'spin') {
      this.spinTime = 0.9; this.speed *= 0.35; this.dropStuds(2);
      this.race.audio.sfx('spin', this.pos);
      this.race.fx.debris(this.pos, [0xffffff, 0xf2cd37], 5);
    } else {
      // brick-apart wreck
      this.wreckTime = 1.5; this.speed *= 0.1; this.vy = 7; this.grounded = false;
      this.dropStuds(3);
      this.race.fx.debris(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), this.model.colors, 22);
      this.race.audio.sfx('crash', this.pos);
      this.hidden = 0.85;
    }
    this.invuln = Math.max(this.invuln, kind === 'spin' ? 1.4 : 2.2);
    // hit again soon after the last one: a longer grace period so nobody gets chain-wrecked
    this.heat += 1;
    if (this.heat > 1.3) this.invuln += 1.2;
    this.emote('ouch');
    if (this.player) this.player.rumble(kind === 'spin' ? 0.5 : 1, kind === 'spin' ? 250 : 450);
    if (by && by !== this && by.human) by.player?.rumble(0.2, 80);
    this.race.onHit?.(this, kind, by);
    return true;
  }
  dropStuds(n) {
    const k = Math.min(n, this.studs);
    this.studs -= k;
    if (k) this.race.fx.studBurst(this.pos, k);
  }
  cancelDrift() { this.drift.active = false; this.drift.charge = 0; this.drift.level = 0; this.drift.queued = false; }

  startRespawn() {
    if (this.respawn > 0) return;
    this.respawn = 1.6; this.respawnPlaced = false;
    this.cancelDrift();
    this.speed = 0; this.kvx = this.kvz = this.yawKick = 0;
    this.setGliding(false);
    this.race.audio.sfx('splash', this.pos);
    this.race.fx.splash(this.pos, this.track.theme.groundOpts?.emissive ? 0xff6a00 : 0x66ccff);
    this.dropStuds(2);
  }

  // Is sample i a safe place to put a kart back down?
  spawnOk(i, lat = 0) {
    const tr = this.track;
    i = tr.wrap(i);
    // real road here and for a good stretch ahead (no jump gaps to fall into)
    for (let o = -4; o <= 36; o++) if (tr.GAP[tr.wrap(i + o)]) return false;
    const p = tr.at(i, lat, 0);
    // not under water / lava (flat roads sit just above the ground plane, at groundY + 0.06)
    if (!tr.theme.noGround && p.y < tr.groundY + 0.02) return false;
    // the spot must resolve to this same road layer (raised highways over lower roads)
    const L = tr.locate(p.x, p.y + 1, p.z, i, {});
    if (L.gap || Math.abs(L.lat - lat) > 2 || Math.abs(L.y - p.y) > 1.5 || Math.abs(L.i - i) > 3 && Math.abs(L.i - i) < tr.N - 3) return false;
    // no hazards or obstacles on the spot
    if (this.race.hazards?.near(p, 7) || tr.obstacleAt(p.x, p.y, p.z, 3)) return false;
    return true;
  }

  // Choose where the crane puts the kart back. Falling into a jump gap puts you on the
  // landing side; dying again right after a respawn without getting anywhere pushes the
  // next spawn further ahead each time.
  pickSpawn() {
    const tr = this.track, N = tr.N;
    let base = this.lastSafe;
    for (let o = 0; o < 50; o++) {
      if (tr.GAP[tr.wrap(base + o)]) {
        base += o;
        for (let k = 0; k < 400 && tr.GAP[tr.wrap(base)]; k++) base++;
        base += 6;
        break;
      }
    }
    const now = this.race.time;
    const progress = this.spawnI === undefined ? N : ((this.lastSafe - this.spawnI + N) % N);
    if (this.spawnT !== undefined && now - this.spawnT < 10 && (progress < 80 || progress > N - 80)) this.spawnPush = (this.spawnPush || 0) + 45;
    else this.spawnPush = 0;
    base += this.spawnPush;
    for (let o = 0; o < 600; o += 3) {
      for (const lat of [0, -0.35, 0.35]) {
        const i = tr.wrap(base + o), l = lat * tr.HW[i];
        if (this.spawnOk(i, l)) { this.spawnI = i; this.spawnT = now; return { i, lat: l }; }
      }
    }
    const i = tr.wrap(base);
    this.spawnI = i; this.spawnT = now;
    return { i, lat: 0 };
  }

  // --- per-frame physics --------------------------------------------------------
  // One physics step. Time never runs backwards or jumps (a stale frame timestamp after a
  // long load once gave dt = -11 s, which blew the kart's heading up to 1e90), and any
  // non-finite state is caught and approximated before it can spread.
  update(dt, ctl) {
    if (!(dt > 0)) return;
    this.step(Math.min(dt, 0.1), ctl);
    this.sanitize();
  }
  sanitize() {
    this.yaw = wrapAngle(this.yaw); this.moveYaw = wrapAngle(this.moveYaw);
    const p = this.pos;
    const fin = (v) => Number.isFinite(v) && Math.abs(v) < 1e5;
    if (fin(p.x) && fin(p.y) && fin(p.z) && Number.isFinite(this.speed) && Number.isFinite(this.vy)) {
      const cap = this.topSpeed * 3;
      this.speed = clampN(this.speed, -cap, cap); this.vy = clampN(this.vy, -150, 150);
      (this.safePos ||= new THREE.Vector3()).copy(p);
      return;
    }
    // approximate: back to the last good spot, stopped, and let the crane put it on the road
    if (this.safePos) p.copy(this.safePos); else this.track.at(this.lastSafe ?? 0, 0, 1, p);
    this.speed = 0; this.vy = 0;
    this.startRespawn();
  }
  step(dt, ctl) {
    const tr = this.track;
    this.ctl = ctl;
    this.bumpCool -= dt; this.wallCool -= dt;
    this.heat = Math.max(0, this.heat - dt / 5);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hidden = Math.max(0, this.hidden - dt);
    if (this.goldenTime > 0) this.goldenTime -= dt;
    if (this.shieldTime > 0) { this.shieldTime -= dt; if (this.shieldTime <= 0) this.bubble.visible = false; }

    if (this.respawn > 0) {
      this.respawn -= dt;
      if (this.respawn < 1.0 && !this.respawnPlaced) {
        this.respawnPlaced = true;
        const i0 = this.pickSpawn();
        let i = i0.i;
        i = tr.wrap(i);
        tr.at(i, i0.lat, 7, this.pos);
        this.yaw = this.moveYaw = tr.yawAt(i);
        this.speed = 0; this.vy = 0; this.grounded = false;
        tr.locate(this.pos.x, this.pos.y, this.pos.z, i, this.loc);
        this.invuln = 2.5;
      }
      if (this.respawnPlaced) {
        // lowered by the crane
        const ground = this.loc.y;
        this.pos.y = Math.max(ground, this.pos.y - dt * 7);
        if (this.respawn <= 0) { this.grounded = true; this.pos.y = ground; }
      }
      this.syncModel(dt);
      return;
    }

    if (this.megaTime > 0) this.megaTime -= dt;
    if (this.ghostTime > 0) this.ghostTime -= dt;
    if (this.inkTime > 0) this.inkTime -= dt;
    if (this.goldTurboTime > 0) this.goldTurboTime -= dt;
    if (this.frozenTime > 0) this.frozenTime -= dt;
    if (this.bulletTime > 0) { this.kvx = this.kvz = this.yawKick = 0; this.updateBullet(dt); return; }

    const stunned = this.spinTime > 0 || this.wreckTime > 0 || this.frozenTime > 0;
    const on = this.race.started && !stunned && !this.finishedCoast;
    let throttle = on ? ctl.throttle : 0, brake = on ? ctl.brake : 0, steer = on ? ctl.steer : 0;
    if (this.finishedCoast) { throttle = 0.6; steer = this.aiSteer || 0; }
    if (this.spinTime > 0) this.spinTime -= dt;
    if (this.wreckTime > 0) this.wreckTime -= dt;

    const loc = tr.locate(this.pos.x, this.pos.y, this.pos.z, this.loc.i ?? 0, this.loc);
    const prevI = this._prevI ?? loc.i;
    const absLat = Math.abs(loc.lat);
    const onRoad = !loc.gap && absLat <= loc.hw + 0.3;
    const onShoulder = !loc.gap && !onRoad && loc.edge !== 1 && absLat <= loc.hw + loc.sh;
    const hasGround = onRoad || onShoulder || (loc.edge === 0 && !loc.gap);
    const groundY = hasGround ? loc.y : -Infinity;
    const inField = !onRoad && !onShoulder && loc.edge !== 1 && this.grounded && !!this.race.world?.groundAt?.(this.pos.x, this.pos.z);
    this.surf = onRoad ? loc.surf : onShoulder || inField ? 'offroad' : 'air';
    this.offroad = (onShoulder || inField) && this.grounded;

    // --- speed -----------------------------------------------------------------
    let max = this.topSpeed * this.speedMult * (1 + this.studs * 0.012);
    if (this.megaTime > 0) max *= 1.08;
    if (this.inkTime > 0 && !this.human) max *= 0.9;
    if (this.boostTime > 0) { this.boostTime -= dt; max *= 1.32; }
    if (this.goldenTime > 0) max *= 1.22;
    if (this.offroad && !this.boosting) max *= 0.52;
    if (this.drift.active) max *= 0.99;
    if (this.grounded) {
      if (throttle > 0 && this.speed >= -0.5) {
        if (this.speed < max) this.speed = Math.min(max, this.speed + this.accel * throttle * dt * (1.2 - 0.9 * Math.max(0, this.speed) / max));
      }
      if (brake > 0) {
        if (this.speed > 0.5) this.speed = Math.max(0, this.speed - 42 * brake * dt);
        else if (throttle <= 0) this.speed = Math.max(-max * 0.35, this.speed - 16 * brake * dt);
      }
      if (throttle <= 0 && brake <= 0) this.speed *= Math.exp(-0.9 * dt);
      if (this.speed > max) this.speed -= (this.speed - max) * (this.offroad ? 3.5 : 1.4) * dt;
      if (this.boosting && throttle <= 0 && this.speed < max) this.speed = Math.min(max, this.speed + this.accel * 2 * dt);
    }
    if (this.boostTime > 0 && this.speed < max * 0.95) this.speed += 60 * dt;
    // conveyor belts push you along; shallow water splashes
    if (this.grounded && this.surf === 'conveyor' && this.speed > -1) { this.speed = Math.min(max * 1.18, this.speed + 22 * dt); if (Math.random() < 0.3) this.race.fx.spark(this.pos.x, this.pos.y + 0.2, this.pos.z, (Math.random() - 0.5) * 4, 3, (Math.random() - 0.5) * 4, 0xffe060, 0.25, 15); }
    if (this.grounded && this.surf === 'water' && Math.abs(this.speed) > 8 && Math.random() < 0.6) this.race.fx.puff(this.pos.x + (Math.random() - 0.5) * 2, this.pos.y + 0.2, this.pos.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 5, 4 + Math.random() * 4, (Math.random() - 0.5) * 5, 0xbfe8ff, 0.5);
    if (stunned) this.speed *= Math.exp(-(this.frozenTime > 0 ? 5 : 2.5) * dt);

    // --- steering / drift ----------------------------------------------------------
    const d = this.drift;
    if (ctl.driftPressed && on && this.grounded && this.speed > 6 && !d.active) {
      this.vy = 6.5; this.grounded = false; d.queued = true; this.hop = true;
      if (this.human) this.race.audio.sfx('hop');
    }
    if (!ctl.drift) d.queued = false;
    const absV = Math.abs(this.speed);
    let sf = Math.min(1, absV / 9) * (1 - 0.18 * Math.min(1, Math.max(0, (absV - 26) / 14)));
    if (this.speed < 0) sf = -sf;
    let turn;
    if (d.active) {
      const k = d.dir * (0.58 + 0.42 * steer * d.dir);
      turn = this.turnRate * 1.05 * k * Math.min(1, absV / 12);
      d.charge += dt * (1 + 0.9 * Math.max(0, steer * d.dir));
      const lvl = d.charge > DRIFT_LEVELS[2] ? 3 : d.charge > DRIFT_LEVELS[1] ? 2 : d.charge > DRIFT_LEVELS[0] ? 1 : 0;
      if (lvl > d.level) { d.level = lvl; if (this.human) this.race.audio.sfx('spark' + lvl); }
      if (!ctl.drift || absV < 8 || !on || this.offroad) {
        if (d.level > 0 && !this.offroad) this.boost(DRIFT_BOOST[d.level - 1]);
        this.cancelDrift();
      }
    } else {
      turn = this.turnRate * steer * sf;
    }
    if (this.goldenTime > 0) turn *= 1.05;
    if (!this.grounded) turn *= this.gliding ? 0.85 : 0.6;
    if (this.spinTime > 0) turn = 0;
    // steer > 0 = right = decreasing yaw (yaw is atan2(x, z))
    this.yaw -= turn * dt;

    // grip: how fast the travel direction follows the facing direction
    let grip = 16;
    if (d.active) grip = 5.5;
    if (this.surf === 'ice') grip = d.active ? 2.2 : 2.8;
    if (!this.grounded) grip = this.gliding ? 3.5 : 0.4;
    this.moveYaw = lerpAngle(this.moveYaw, this.yaw, 1 - Math.exp(-grip * dt));
    const drag = Math.abs(angleDiff(this.moveYaw, this.yaw));
    if (this.grounded && drag > 0.5 && !d.active) this.speed *= Math.exp(-0.6 * drag * dt);

    this.pos.x += Math.sin(this.moveYaw) * this.speed * dt;
    this.pos.z += Math.cos(this.moveYaw) * this.speed * dt;
    // knocked sideways: slide, with tyre grip (much less on ice or in the air) bleeding it off
    if (this.kvx || this.kvz) {
      this.pos.x += this.kvx * dt; this.pos.z += this.kvz * dt;
      const f = Math.exp(-(!this.grounded ? 0.5 : this.surf === 'ice' ? 1.2 : 3.5) * dt);
      this.kvx *= f; this.kvz *= f;
      if (this.kvx * this.kvx + this.kvz * this.kvz < 0.01) this.kvx = this.kvz = 0;
    }
    if (this.yawKick) { this.yaw += this.yawKick * dt; this.yawKick *= Math.exp(-5 * dt); if (Math.abs(this.yawKick) < 0.01) this.yawKick = 0; }

    // --- vertical -----------------------------------------------------------------------
    tr.locate(this.pos.x, this.pos.y, this.pos.z, loc.i, loc);
    const absLat2 = Math.abs(loc.lat);
    const onRoad2 = !loc.gap && absLat2 <= loc.hw + 0.3;
    const onSh2 = !loc.gap && !onRoad2 && loc.edge !== 1 && absLat2 <= loc.hw + loc.sh + 0.2;
    // beside the road (not a void edge): the map's ground is drivable, slowly, wherever it exists
    // (water, lava and holes still drop you into a respawn)
    const onField = !onRoad2 && !onSh2 && loc.edge !== 1 && !!this.race.world?.groundAt?.(this.pos.x, this.pos.z);
    const gY = (onRoad2 || onSh2) ? loc.y : onField ? tr.groundY : -Infinity;
    if (this.grounded && onField) { this.offroad = true; this.surf = 'offroad'; }
    void groundY;
    if (this.grounded) {
      const ballistic = this.pos.y + this.vy * dt - 0.5 * G * dt * dt;
      if (gY >= ballistic - 0.06) {
        const nvy = (gY - this.pos.y) / Math.max(dt, 1e-4);
        this.vy = Math.max(-30, Math.min(20, nvy));
        this.pos.y = gY;
      } else {
        this.grounded = false; this.airTime = 0; this.trick = false; this.trickDone = false;
        this.vy -= G * dt; this.pos.y = ballistic;
      }
    } else {
      this.airTime += dt;
      if (this.gliding) {
        // gentle glide: low gravity, capped sink rate, speed held. Once the gap has been crossed
        // and there's ground below again, come down twice as fast.
        if (gY === -Infinity) this.glideGap = true;
        const sink = this.glideGap && gY > -Infinity ? 2 : 1;
        this.vy -= G * 0.18 * sink * dt;
        this.vy = Math.max(this.vy, -4.2 * sink);
        if (this.speed < this.topSpeed * 0.85) this.speed += 10 * dt;
      } else this.vy -= G * dt;
      this.pos.y += this.vy * dt;
      if (gY > -Infinity && this.pos.y <= gY && this.pos.y > gY - 3) {
        this.land(gY, ctl);
      }
    }
    // tricks off ramps/jumps: tap drift while airborne
    if (!this.grounded && this.airTime > 0.1 && this.canTrick && ctl.driftPressed && !this.trickDone && on) {
      this.trickDone = true; this.trickSpin = 0.45;
      this.emote('trick');
      if (this.human) this.race.audio.sfx('trick');
    }
    if ((this.pos.y < loc.y - 14 && !onField) || this.pos.y < tr.groundY - 1) { this.startRespawn(); this.syncModel(dt); return; }
    // off in the field: a soft boundary keeps karts near the track, and anyone stranded below a
    // raised stretch of road (no way back up) gets craned back after a moment
    if (onField && this.grounded) {
      const lim = loc.hw + loc.sh + 10;
      if (absLat2 > lim) {
        const sg = Math.sign(loc.lat), pen = absLat2 - lim;
        this.pos.x -= loc.rx * sg * pen; this.pos.z -= loc.rz * sg * pen;
        const kn = (this.kvx * loc.rx + this.kvz * loc.rz) * sg;
        if (kn > 0) { this.kvx -= loc.rx * sg * kn; this.kvz -= loc.rz * sg * kn; }
        const ty = Math.atan2(loc.tx, loc.tz), rel = angleDiff(ty, this.moveYaw);
        this.moveYaw = lerpAngle(this.moveYaw, Math.cos(rel) >= 0 ? ty : ty + Math.PI, 0.25);
      }
      this.stranded = loc.y - tr.groundY > 3.5 ? (this.stranded || 0) + dt : 0;
      if (this.stranded > 2.5) { this.stranded = 0; this.startRespawn(); this.syncModel(dt); return; }
    } else this.stranded = 0;

    // --- walls ------------------------------------------------------------------------------
    if (loc.edge === 0 && !loc.gap && this.pos.y < loc.y + 4) {
      const lim = loc.hw + loc.sh - 1.2;
      if (absLat2 > lim) {
        const s = Math.sign(loc.lat), pen = absLat2 - lim;
        this.pos.x -= loc.rx * s * pen; this.pos.z -= loc.rz * s * pen;
        // a knock into the wall bounces back off it a little
        const kn = (this.kvx * loc.rx + this.kvz * loc.rz) * s;
        if (kn > 0) { this.kvx -= loc.rx * s * kn * 1.3; this.kvz -= loc.rz * s * kn * 1.3; }
        const ty = Math.atan2(loc.tx, loc.tz);
        // heading relative to track tangent; reflect the lateral component
        const rel = angleDiff(ty, this.moveYaw);
        {
          const impact = Math.abs(Math.sin(rel));
          if (impact > 0.25 && this.wallCool <= 0) {
            this.wallCool = 0.3;
            this.speed *= 1 - Math.min(0.55, impact * 0.6);
            if (this.human) { this.race.audio.sfx('wall', this.pos); this.player.rumble(0.35, 120); }
            this.race.fx.debris(this.pos.clone().addScaledVector(new THREE.Vector3(loc.rx, 0, loc.rz), s * 1.2).add(new THREE.Vector3(0, 0.8, 0)), this.track.theme.wall || [0xffffff], 3, 0.5);
          }
          const fwd = Math.cos(rel) >= 0 ? ty : ty + Math.PI;
          this.moveYaw = lerpAngle(this.moveYaw, fwd + s * 0.12 * Math.sign(Math.cos(rel)), 0.7);
          this.yaw = lerpAngle(this.yaw, this.moveYaw, 0.35);
        }
      }
    }

    // --- progress / laps --------------------------------------------------------------------
    const N = tr.N;
    const di = loc.i - prevI;
    if (di < -N / 2) this.lap++;
    else if (di > N / 2) this.lap--;
    this._prevI = loc.i;
    // remember a safe spot only after driving steadily on real road for a moment
    if (!loc.gap && this.grounded && onRoad2 && !stunned) { this.safeT = (this.safeT || 0) + dt; if (this.safeT > 0.4) this.lastSafe = loc.i; }
    else this.safeT = 0;
    // wrong-way detection
    const ty = Math.atan2(loc.tx, loc.tz);
    if (this.speed > 5 && Math.abs(angleDiff(ty, this.yaw)) > 2.1) this.wrongWay += dt; else this.wrongWay = Math.max(0, this.wrongWay - dt * 2);

    // --- effects ---------------------------------------------------------------------------
    if (d.active && this.grounded) this.race.fx.driftSparks(this, d.level);
    if (this.offroad && absV > 8) this.race.fx.dust(this, this.track.theme.dust ?? this.track.theme.shoulder);
    if (this.goldenTime > 0) this.race.fx.sparkle(this);
    this.syncModel(dt);
  }

  // Bullet Brick: autopilot along the racing line, hovering over gaps
  updateBullet(dt) {
    const tr = this.track, N = tr.N;
    this.bulletTime -= dt;
    const loc = tr.locate(this.pos.x, this.pos.y, this.pos.z, this.loc.i ?? 0, this.loc);
    const prevI = this._prevI ?? loc.i;
    const j = tr.wrap(loc.i + 16);
    const tx = tr.px(j), tz = tr.pz(j);
    const want = Math.atan2(tx - this.pos.x, tz - this.pos.z);
    this.yaw = this.yaw + angleDiff(this.yaw, want) * Math.min(1, dt * 6);
    this.moveYaw = this.yaw;
    this.speed = this.topSpeed * 1.9;
    this.pos.x += Math.sin(this.yaw) * this.speed * dt;
    this.pos.z += Math.cos(this.yaw) * this.speed * dt;
    const hy = Math.max(tr.py(loc.i), tr.py(j)) + 1.6;
    this.pos.y += (hy - this.pos.y) * Math.min(1, dt * 6);
    this.vy = 0; this.grounded = false; this.gliding = false; this.cancelDrift();
    if (this.model.glider) this.model.glider.visible = false;
    // don't drop out of the bullet over a gap
    if (this.bulletTime <= 0) {
      let gapNear = false;
      for (let o = -4; o < 40; o++) if (tr.GAP[tr.wrap(loc.i + o)]) { gapNear = true; break; }
      if (gapNear) this.bulletTime = 0.05;
      else { this.invuln = 1.2; this.speed = this.topSpeed * 1.2; this.boostTime = 0.6; this.race.fx.explosion(this.pos); }
    }
    const di = loc.i - prevI;
    if (di < -N / 2) this.lap++; else if (di > N / 2) this.lap--;
    this._prevI = loc.i;
    if (!loc.gap) this.lastSafe = loc.i;
    this.wrongWay = 0;
    if (Math.random() < 0.8) this.race.fx.puff(this.pos.x - Math.sin(this.yaw) * 4, this.pos.y + 1, this.pos.z - Math.cos(this.yaw) * 4, 0, 1, 0, 0xcccccc, 0.7);
    this.syncModel(dt);
  }

  setGliding(on) {
    this.gliding = on;
    this.glideGap = false;
    if (this.model.glider) this.model.glider.visible = on;
    this.gliderT = 0;
  }

  land(gY, ctl) {
    const fallSpeed = -this.vy;
    if (this.gliding) this.setGliding(false);
    this.pos.y = gY; this.vy = 0; this.grounded = true;
    this.squash = Math.min(0.25, fallSpeed * 0.012);
    if (this.trickDone) { this.boost(0.8); }
    this.trickDone = false; this.canTrick = false;
    if (this.drift.queued && ctl.drift && Math.abs(ctl.steer) > 0.2 && this.speed > 8) {
      this.drift.active = true; this.drift.dir = Math.sign(ctl.steer); this.drift.charge = 0; this.drift.level = 0;
    }
    this.drift.queued = false;
    if (fallSpeed > 8 && this.human) this.race.audio.sfx('land');
    if (fallSpeed > 12) this.race.fx.dust(this, this.track.theme.shoulder, 10);
  }

  // ramp launch
  launch(vy, glide = false) {
    if (!this.grounded) return;
    this.vy = vy; this.grounded = false; this.airTime = 0; this.canTrick = true; this.trickDone = false;
    this.drift.queued = false;
    this.cancelDrift();
    if (glide) { this.setGliding(true); if (this.human) this.race.audio.sfx('glide'); }
  }

  syncModel(dt) {
    const m = this.model;
    const d = this.drift;
    m.root.position.copy(this.pos);
    m.root.visible = !(this.respawn > 0 && !this.respawnPlaced) && !(this.hidden > 0.05 && this.hidden < 0.8);
    // spin-out & wreck rotations
    let extraYaw = 0;
    if (this.spinTime > 0) extraYaw = (1 - this.spinTime / 0.9) * Math.PI * 4;
    if (this.trickSpin > 0) { this.trickSpin -= dt; }
    const driftTarget = d.active ? -d.dir * 0.42 : 0;
    this.driftVis += (driftTarget - this.driftVis) * Math.min(1, dt * 8);
    m.root.rotation.y = this.yaw + this.driftVis + extraYaw;
    // pitch from slope / air
    const slope = this.grounded ? Math.asin(Math.max(-1, Math.min(1, this.loc.ty || 0))) * Math.cos(angleDiff(Math.atan2(this.loc.tx || 0, this.loc.tz || 1), this.yaw)) : Math.max(-0.5, Math.min(0.4, this.vy * 0.02));
    this.visPitch += (slope - this.visPitch) * Math.min(1, dt * 10);
    m.root.rotation.x = -this.visPitch;
    // lean into steering, drift lean, and follow the track banking when grounded
    const rel = angleDiff(Math.atan2(this.loc.tx || 0, this.loc.tz || 1), this.yaw);
    const bankRoll = this.grounded ? -Math.atan(this.loc.bank || 0) * Math.cos(rel) : 0;
    const glideRoll = this.gliding ? -(this.ctl.steer || 0) * 0.35 : 0;
    const roll = -(this.ctl.steer || 0) * Math.min(1, Math.abs(this.speed) / 30) * 0.08 + this.driftVis * 0.18 + bankRoll + glideRoll;
    this.visRoll += (roll - this.visRoll) * Math.min(1, dt * 8);
    this.knockRoll *= Math.exp(-4 * dt);
    m.root.rotation.z = this.visRoll + this.knockRoll + (this.wreckTime > 0 ? Math.sin(this.wreckTime * 20) * 0.2 : 0);
    // squash & hop
    this.squash = Math.max(0, this.squash - dt * 1.5);
    const sq = this.squash;
    m.body.scale.set(1 + sq, 1 - sq, 1 + sq * 0.5);
    let sc = 1;
    if (this.hidden > 0 && this.hidden < 0.3) { const f = 1 - this.hidden / 0.3; sc = 0.3 + 0.7 * f + Math.sin(f * Math.PI) * 0.15; }
    const megaT = this.megaTime > 0 ? 1.9 : 1;
    this.megaScale += (megaT - this.megaScale) * Math.min(1, dt * 5);
    m.root.scale.setScalar(sc * this.megaScale);
    if (this.bulletTime > 0 && !this.bulletMesh) { this.bulletMesh = this.race.items.makeBulletMesh(this.ch); m.root.add(this.bulletMesh); }
    if (this.bulletMesh) this.bulletMesh.visible = this.bulletTime > 0;
    if (this.frozenTime > 0 && !this.iceMesh) {
      this.iceMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3, 5), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.5, roughness: 0.05, emissive: 0x3a8aff, emissiveIntensity: 0.3, depthWrite: false }));
      this.iceMesh.position.y = 1.3; m.root.add(this.iceMesh);
    }
    if (this.iceMesh) this.iceMesh.visible = this.frozenTime > 0;
    if (this.trickSpin > 0) m.body.rotation.z = (1 - this.trickSpin / 0.45) * Math.PI * 2; else m.body.rotation.z = 0;
    // wheels
    for (const w of m.wheels) {
      w.spin.rotation.x += (this.speed * dt) / w.r;
      if (w.front) w.g.rotation.y = -(this.ctl.steer || 0) * 0.45;
    }
    m.head.rotation.y = -(this.ctl.steer || 0) * 0.35 + (this.lookBack ? Math.PI * 0.6 : 0);
    if (this.anim) {
      const race = this.race;
      const phase = this.finished ? (this.rank <= 3 ? 'win' : 'lose') : !race.started ? 'pre' : 'race';
      this.anim.update(dt, {
        steer: this.ctl.steer || 0, drift: this.drift.active ? this.drift.dir : 0, speed01: Math.min(1, Math.abs(this.speed) / this.topSpeed),
        grounded: this.grounded, gliding: this.gliding, boosting: this.boostTime > 0, look: this.lookBack, phase, rank: this.rank,
      });
      m.steerControl?.(this.anim.steer);
    }
    m.update?.(dt, { speed01: Math.min(1, Math.abs(this.speed) / this.topSpeed), steer: this.anim ? this.anim.steer : (this.ctl.steer || 0), boosting: this.boosting, gliding: this.gliding, grounded: this.grounded });
    // flames
    const fl = this.boosting ? 1.1 + Math.random() * 0.6 : 0;
    for (const f of this.flames) { f.visible = fl > 0; f.scale.set(1, fl || 1, 1); }
    // blinking when invulnerable after a hit
    if (this.bulletTime > 0) m.body.visible = false;
    else if (this.ghostTime > 0) m.body.visible = Math.floor(performance.now() / 70) % 3 !== 0;
    else if (this.invuln > 0 && this.hidden <= 0 && this.respawn <= 0.0) m.body.visible = Math.floor(this.invuln * 12) % 2 === 0;
    else m.body.visible = true;
    if (this.gliding && m.glider) {
      this.gliderT = Math.min(1, (this.gliderT || 0) + dt * 4);
      m.glider.scale.set(this.gliderT, 1, 1);
      m.glider.rotation.z = Math.sin(performance.now() * 0.004) * 0.05;
      const gfx = m.glider.userData.fx;
      if (gfx) { const s = this._gfx ||= { t: 0, steer: 0, speed01: 0 }; s.t += dt; s.steer = this.ctl?.steer || 0; s.speed01 = Math.min(1, Math.abs(this.speed) / (this.topSpeed || 1)); gfx(s, dt); }
    }
    this.bubble.visible = this.shieldTime > 0;
    if (this.bubble.visible) this.bubble.scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.03);
    this.aura.visible = this.goldenTime > 0;
    if (this.aura.visible) { this.aura.material.color.setHSL(0.12 + Math.sin(performance.now() * 0.01) * 0.03, 1, 0.55); this.aura.scale.setScalar(1 + Math.sin(performance.now() * 0.02) * 0.08); }
  }

  // a character gesture plus a voice line
  emote(name, voice = name) {
    if (!this.anim) return;
    if (!this.anim.play(name)) return;
    this.race.voice?.(this, voice);
  }

  dispose() { this.race.scene.remove(this.model.root); }
}
