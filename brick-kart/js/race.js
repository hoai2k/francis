// A single race: world + karts + items + cameras + HUD. Handles the intro
// flyover, countdown (with start boosts), pickups, bumping, laps, finishing
// and split-screen rendering for up to four local players.
import * as THREE from 'three';
import { World } from './world.js';
import { Kart, angleDiff, lerpAngle } from './kart.js';
import { Effects } from './effects.js';
import { Items, rollItem, MULTI } from './items.js';
import { AIDriver } from './ai.js';
import { CHARACTERS } from './characters.js';
import { DRIVERS } from './driver.js';
import { KARTS } from './vehicles.js';
import { GLIDERS } from './gliders.js';
import { ABILITY, ABILITIES } from './abilities.js';
import { MAP_FROM } from './tracks.js';
import { HUD, splitCells } from './hud.js';
import { Hazards } from './hazards.js';

export const MAX_RACERS = 12;   // karts per race, players included
const V = new THREE.Vector3();
const THROWS = new Set(['rocket', 'rocket3', 'cannon', 'cannon3', 'ice', 'boomerang', 'seeker', 'bomb']);
const TRAPS = new Set(['trap', 'puddle', 'fakebox']);


class ChaseCam {
  constructor() {
    this.cam = new THREE.PerspectiveCamera(72, 1, 0.1, 3000);
    this.yaw = 0; this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.init = false; this.shake = 0; this.fov = 72;
  }
  update(dt, k) {
    this.yaw = lerpAngle(this.yaw, k.yaw + k.driftVis * 0.45, 1 - Math.exp(-(this.init ? 5 : 100) * dt));
    const yaw = this.yaw + (k.lookBack ? Math.PI : 0);
    const dist = 7.4 + (k.boosting ? 1.2 : 0) + k.camLift * 0.6, h = 3.1 + k.camLift;
    const tgt = V.set(k.pos.x - Math.sin(yaw) * dist, k.pos.y + h, k.pos.z - Math.cos(yaw) * dist);
    const frozen = k.respawn > 0 && !k.respawnPlaced;
    if (!frozen) {
      // don't dive under the road when the kart falls
      tgt.y = Math.max(tgt.y, (k.loc.y ?? k.pos.y) + 1.5);
      if (!this.init || k.lookBack !== this.lastLook) { this.pos.copy(tgt); this.init = true; }
      else this.pos.lerp(tgt, 1 - Math.exp(-11 * dt));
    }
    this.lastLook = k.lookBack;
    this.look.set(k.pos.x + Math.sin(yaw) * 4, k.pos.y + 1.3 + k.camLift * 0.5, k.pos.z + Math.cos(yaw) * 4);
    this.cam.position.copy(this.pos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.5;
      this.cam.position.x += (Math.random() - 0.5) * s; this.cam.position.y += (Math.random() - 0.5) * s;
    }
    this.cam.lookAt(this.look);
    const fov = 70 + Math.min(10, Math.max(0, k.speed - 22) * 0.5) + (k.boosting ? 6 : 0);
    this.fov += (fov - this.fov) * Math.min(1, dt * 4);
    if (Math.abs(this.cam.fov - this.fov) > 0.05) { this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); }
  }
}

// Cinematic camera for the title screen / 4th split-screen quadrant.
class TVCam {
  constructor() {
    this.cam = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
    this.t = 0; this.mode = 0; this.pick = 0;
  }
  update(dt, race) {
    this.t += dt;
    if (this.t > 7) { this.t = 0; this.mode = (this.mode + 1) % 3; this.pick = Math.floor(Math.random() * Math.min(4, race.karts.length)); }
    const k = race.order[this.pick] || race.karts[0];
    const c = this.cam;
    if (this.mode === 0) {
      const a = this.t * 0.25 + k.yaw;
      c.position.set(k.pos.x + Math.sin(a) * 12, k.pos.y + 4.5, k.pos.z + Math.cos(a) * 12);
      c.lookAt(k.pos.x, k.pos.y + 1.2, k.pos.z);
    } else if (this.mode === 1) {
      if (!this.side || this.t < dt * 2) {
        const tr = race.track, i = tr.wrap((k.loc.i ?? 0) + 45);
        this.side = tr.at(i, (tr.HW[i] + tr.SH[i] + 2) * (Math.random() < 0.5 ? -1 : 1), 2.5);
      }
      c.position.copy(this.side);
      c.lookAt(k.pos.x, k.pos.y + 1, k.pos.z);
      c.fov = 40; c.updateProjectionMatrix();
    } else {
      c.position.set(k.pos.x - Math.sin(k.yaw) * 18, k.pos.y + 12, k.pos.z - Math.cos(k.yaw) * 18);
      c.lookAt(k.pos.x + Math.sin(k.yaw) * 8, k.pos.y, k.pos.z + Math.cos(k.yaw) * 8);
    }
    if (this.mode !== 1 && c.fov !== 55) { c.fov = 55; c.updateProjectionMatrix(); }
    this.focus = k.pos;
  }
}

export class Race {
  constructor(game, opts) {
    this.game = game;
    this.opts = opts;
    this.audio = game.audio;
    this.input = game.input;
    this.mode = opts.mode;
    this.laps = opts.laps ?? 3;
    this.cc = opts.cc ?? 0.92;
    this.scene = new THREE.Scene();
    this.scene.environment = game.envMap;
    this.world = new World(opts.def, this.scene);
    this.world.race = this;
    this.track = this.world.track;
    this.hazards = new Hazards(this, this.world.hazards);
    this.fx = new Effects(this.scene, this.track);
    this.items = new Items(this);
    this.karts = [];
    this.drivers = new Map();
    this.cams = [];
    this.started = false;
    this.time = 0;
    this.results = [];

    // roster & grid
    const humans = opts.players || [];
    const used = new Set(humans.map((p) => p.charIndex));
    // Simplified mode only trims the select screen: CPU racers still use the whole roster
    this.simple = !!opts.simple;
    const others = CHARACTERS.map((_, i) => i).filter((i) => !used.has(i));
    for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    const total = this.mode === 'tt' ? humans.length : Math.min(MAX_RACERS, Math.max(humans.length, opts.racers ?? MAX_RACERS));
    // every kart gets a character driver (CPU drivers are unique while there are enough);
    // the classic minifig racers are only a fallback if no driver pack loaded
    this.useChars = DRIVERS.length > 0;
    // movie tracks favour their own movie's abilities
    this.movieFrom = MAP_FROM[opts.def?.id] || null;
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    let grid = opts.grid;   // array of { charIndex, driverIndex?, player }
    if (!grid) {
      grid = [];
      const ai = Array.from({ length: total - humans.length }, (_, n) => ({ charIndex: others[n % others.length], player: null }));
      if (this.useChars) {
        const usedD = new Set(humans.map((p) => p.driverIndex));
        let freeD = shuffle(DRIVERS.map((_, i) => i).filter((i) => !usedD.has(i)));
        if (!freeD.length) freeD = shuffle(DRIVERS.map((_, i) => i));
        ai.forEach((g, i) => { g.driverIndex = freeD[i % freeD.length]; });
        // CPU karts: a movie driver picks a ride from their own movie with a chance that scales
        // with how many that movie has (6 rides = 60%, 3 = 30%), any kart 10% of the time, and
        // otherwise an original kart (the originals and the Wild Rides). Original drivers pick
        // those 90% of the time and a movie kart 10%.
        const usedK = new Set(humans.map((p) => p.kartIndex));
        const all = KARTS.map((_, i) => i);
        const isOriginal = (i) => KARTS[i].domain === 'classic' || KARTS[i].domain === 'wild';
        const originalsK = all.filter(isOriginal);
        ai.forEach((g) => {
          const from = DRIVERS[g.driverIndex]?.from, r = Math.random();
          let pool;
          if (from === 'classic') pool = r < 0.9 ? originalsK : all.filter((i) => !isOriginal(i));
          else {
            const own = all.filter((i) => KARTS[i].domain === from);
            const pOwn = Math.min(0.6, 0.1 * own.length);
            pool = r < pOwn ? own : r < 0.9 ? originalsK : all;
          }
          if (!pool.length) pool = all;
          // prefer a kart nobody else has yet
          const fresh = pool.filter((i) => !usedK.has(i));
          const pick = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
          g.kartIndex = pick; usedK.add(pick);
        });
        // CPU gliders: half the time one from the driver's own movie / game, otherwise any
        const allG = GLIDERS.map((_, i) => i);
        ai.forEach((g) => {
          const from = DRIVERS[g.driverIndex]?.from, own = allG.filter((i) => GLIDERS[i].group === (from === 'classic' ? 'originals' : from));
          const pool = own.length && Math.random() < 0.5 ? own : allG;
          g.gliderIndex = pool[Math.floor(Math.random() * pool.length)];
        });
      }
      grid.push(...ai, ...humans.map((p) => ({ charIndex: p.charIndex, driverIndex: p.driverIndex, kartIndex: p.kartIndex, gliderIndex: p.gliderIndex, player: p })));
    }
    grid.forEach((g, n) => {
      const drv = this.useChars ? DRIVERS[g.driverIndex ?? n % DRIVERS.length] : null;
      const ch = this.useChars ? (KARTS[g.kartIndex] || CHARACTERS[g.charIndex] || KARTS[0]) : CHARACTERS[g.charIndex];
      const k = new Kart(this, ch, n, g.player, drv, GLIDERS[g.gliderIndex] || null);
      k.driverIndex = drv ? DRIVERS.indexOf(drv) : -1;
      const row = n;
      const i = this.track.wrap(Math.round(-7 - row * 3.4));
      const lat = (n % 2 ? 1 : -1) * this.track.HW[i] * 0.4;
      k.place(i, lat);
      k.lap = 0;
      k._prevI = k.loc.i;
      this.karts.push(k);
      if (g.player) {
        g.player.kart = k;
        const cc = new ChaseCam();
        this.cams.push({ chase: cc, kart: k, player: g.player });
        k.engine = this.audio.engine();
      } else {
        this.drivers.set(k, new AIDriver(k, this, opts.difficulty || 'normal'));
      }
    });
    this.order = [...this.karts];
    this.tv = new TVCam();
    this.state = this.mode === 'attract' ? 'race' : 'intro';
    this.introT = 0;
    this.countdown = 3.6;
    this.lastCount = 4;
    if (this.mode === 'attract') { this.started = true; this.countdown = 0; }
    this.hud = this.mode === 'attract' ? null : new HUD(this, game.hudRoot);
    this.finalLapShown = false;
    this.doneTimer = -1;
    this.flashEl = game.flashEl;
    this.introCam = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
    for (const k of this.karts) { k.lapTimes = []; k.lapStart = 0; k.lapSeen = 0; k.gasHold = -1; }
    if (this.mode === 'tt') for (const k of this.karts) { k.item = 'boost3'; k.itemCount = 3; }
    this.audio.music(this.mode === 'attract' ? null : { file: './music/arcade-kart-dash.mp3' });
  }

  flash(color) {
    if (!this.flashEl) return;
    this.flashEl.style.background = '#' + new THREE.Color(color).getHexString();
    this.flashEl.classList.remove('go'); void this.flashEl.offsetWidth; this.flashEl.classList.add('go');
  }

  humanKarts() { return this.cams.map((c) => c.kart); }

  update(dt) {
    if (!(dt > 0)) return;   // never step backwards (see Kart.update)
    dt = Math.min(dt, 0.1);
    const tr = this.track;
    // intro flyover
    if (this.state === 'intro') {
      this.introT += dt;
      const anyOk = this.game.menuEvents.some(([, m]) => m.ok || m.start) || this.input.touch.edge?.size;
      if (this.introT > 4.2 || (anyOk && this.introT > 0.4)) { this.state = 'countdown'; this.hud?.hideTitle(); }
    } else if (this.state === 'countdown') {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n < this.lastCount && n >= 1 && n <= 3) { this.lastCount = n; this.audio.sfx('count'); tr.setStartLights(4 - n, false); this.hud?.count(n); }
      if (this.countdown <= 0) {
        this.state = 'race'; this.started = true; this.time = 0;
        this.game.input?.calibrateTilt?.();   // tilt steering: however the phone is held at GO is straight ahead
        tr.setStartLights(4, true);
        this.audio.sfx('go');
        this.hud?.count('GO!');
        for (const k of this.karts) k.emote('ready', k.human ? 'go' : null);
        for (const k of this.karts) {
          if (k.human) {
            if (k.gasHold > 0.3 && k.gasHold < 1.7) k.boost(1.1);
            else if (k.gasHold >= 2.4) { k.spinTime = 0.6; }
          } else if (Math.random() < this.drivers.get(k).d.skill * 0.8) k.boost(0.8 + Math.random() * 0.4);
        }
      }
    }
    if (this.started) this.time += dt;

    // controls
    const humanLead = this.cams.length ? Math.max(...this.cams.map((c) => c.kart.raceDist)) : null;
    for (const k of this.karts) {
      let ctl;
      if (k.human && !k.finished) {
        ctl = this.input.race(k.player.device, k.player.autoGas);
        if (ctl.pause && this.state !== 'intro') { this.game.pause(k.player); }
        k.lookBack = ctl.look;
        if (this.state === 'countdown') {
          if (ctl.throttle > 0.5) { if (k.gasHold < 0) k.gasHold = this.countdown; } else k.gasHold = -1;
        }
      } else {
        let drv = this.drivers.get(k);
        if (!drv) { drv = new AIDriver(k, this, 'normal'); drv.d = { ...drv.d, skill: 0.5 }; this.drivers.set(k, drv); }
        if (this.mode !== 'tt' && !k.finished) drv.band(humanLead);
        else k.speedMult = 0.9;
        ctl = drv.update(dt);
        k.lookBack = false;
      }
      if (!this.started) { ctl = { ...ctl, throttle: 0, brake: 0, steer: 0, driftPressed: false, itemPressed: false }; }
      if (ctl.itemPressed && k.item && k.roulette <= 0 && !k.stunned && this.started) {
        const it = k.item;
        this.items.use(k);
        if (k.anim) {
          const back = ctl.back || (TRAPS.has(it) && !ctl.aimFwd);
          const ab = ABILITY[it];
          if (ab) k.emote(ab.gesture === 'throwF' && back ? 'throwB' : ab.gesture, ab.gesture === 'use' ? 'yay' : 'throw');
          else if (THROWS.has(it) || TRAPS.has(it)) k.emote(back ? 'throwB' : 'throwF', 'throw');
          else k.emote('use', 'yay');
        }
      }
      k.update(dt, ctl);
      if (k.roulette > 0) {
        k.roulette -= dt;
        if (k.human && Math.random() < dt * 18) this.audio.sfx('roll');
        if (k.roulette <= 0) {
          k.item = k.rouletteItem; k.itemCount = MULTI[k.item] || 1;
          if (k.human) this.audio.sfx('itemget');
        }
      }
      // second slot: the next item waiting behind the current one
      if (k.roulette2 > 0) {
        k.roulette2 -= dt;
        if (k.roulette2 <= 0) { k.nextItem = k.rouletteItem2; if (k.human) this.audio.sfx('itemget'); }
      }
      if (k.item === 'goldturbo' && k.goldTurboStarted && k.goldTurboTime <= 0) { k.item = null; k.goldTurboStarted = false; }
      if (!k.item && k.roulette <= 0 && k.nextItem && k.roulette2 <= 0) {
        k.item = k.nextItem; k.itemCount = MULTI[k.item] || 1; k.nextItem = null;
      }
    }

    // pickups: item boxes, studs, boost pads, ramps
    const n = this.karts.length;
    for (const k of this.karts) {
      if (k.respawn > 0) continue;
      for (const b of tr.itemBoxes) {
        if (!b.active) continue;
        if (Math.abs(b.pos.x - k.pos.x) < 2.6 && Math.abs(b.pos.z - k.pos.z) < 2.6 && Math.abs(b.pos.y - k.pos.y - 1) < 2.6) {
          b.active = false; b.timer = 2.2;
          this.fx.itemBoxBreak(b.pos);
          if (k.human) this.audio.sfx('box');
          const rf = n > 1 ? (k.rank - 1) / (n - 1) : 0;
          const lead = this.order.find((o) => !o.finished) || this.order[0];
          const behind = lead ? lead.raceDist - k.raceDist : 0;
          if (!k.item && k.roulette <= 0 && !k.nextItem && !(k.roulette2 > 0)) {
            k.rouletteItem = rollItem(rf, Math.random, behind, this.movieFrom, this.simple);
            k.roulette = k.human ? 1.3 : 1.0;
          } else if (!k.nextItem && !(k.roulette2 > 0)) {
            k.rouletteItem2 = rollItem(rf, Math.random, behind, this.movieFrom, this.simple);
            k.roulette2 = k.human ? 1.3 : 1.0;
          }
        }
      }
      for (const s of tr.studs) {
        if (!s.active) continue;
        if (Math.abs(s.pos.x - k.pos.x) < 2 && Math.abs(s.pos.z - k.pos.z) < 2 && Math.abs(s.pos.y - k.pos.y - 1) < 2) {
          s.active = false; s.timer = 9;
          k.studs = Math.min(10, k.studs + 1);
          this.fx.studPickup(s.pos);
          if (k.human) this.audio.sfx('stud');
        }
      }
      if (k.grounded) {
        for (const bp of tr.boosts) {
          const di = Math.abs(((k.loc.i - bp.i + tr.N + tr.N / 2) % tr.N) - tr.N / 2);
          if (di < 3.6 && Math.abs(k.loc.lat - bp.lat) < 2.5 && (k.padCool ?? 0) <= 0) { k.boost(1.0); k.padCool = 0.4; }
        }
        for (const r of tr.ramps) {
          const di = ((r.i - k.loc.i) + tr.N) % tr.N;
          if (di <= 2 && Math.abs(k.loc.lat) < tr.HW[r.i] && k.speed > 8) {
            if (r.glide) { k.launch(15, true); k.boostTime = Math.max(k.boostTime, 0.6); k.speed = Math.max(k.speed, k.topSpeed * 0.95); }
            else { k.launch(14 + Math.min(10, k.speed * 0.14)); k.boostTime = Math.max(k.boostTime, 0.25); }
          }
        }
      }
      k.padCool = (k.padCool ?? 0) - dt;
      // static obstacles: slide around them
      const o = tr.obstacles.length ? tr.obstacleAt(k.pos.x, k.pos.y, k.pos.z, 1.3) : null;
      if (o) {
        let nx = k.pos.x - o.x, nz = k.pos.z - o.z;
        const d = Math.hypot(nx, nz) || 0.01; nx /= d; nz /= d;
        k.pos.x = o.x + nx * (o.r + 1.31); k.pos.z = o.z + nz * (o.r + 1.31);
        const kn = k.kvx * nx + k.kvz * nz;   // knocked into it: bounce off
        if (kn < 0) { k.kvx -= nx * kn * 1.3; k.kvz -= nz * kn * 1.3; }
        let vx = Math.sin(k.moveYaw) * k.speed, vz = Math.cos(k.moveYaw) * k.speed;
        const vn = vx * nx + vz * nz;
        if (vn < 0) {
          vx -= nx * vn * 1.4; vz -= nz * vn * 1.4;
          const hard = -vn / Math.max(1, Math.abs(k.speed));
          k.moveYaw = Math.atan2(vx, vz);
          k.speed = Math.hypot(vx, vz) * (1 - 0.35 * hard) * Math.sign(k.speed || 1);
          if (hard > 0.3 && k.wallCool <= 0) { k.wallCool = 0.3; if (k.human) { this.audio.sfx('wall', k.pos); k.player.rumble(0.4, 120); } }
        }
      }
    }

    // kart vs kart bumping: an impulse exchange between two masses (the karts' weights). Rear-ending
    // someone hands them some of your speed; a side swipe knocks both apart sideways (the lighter
    // kart further) without killing anyone's speed. Only power-ups turn contact into a hit.
    const va = this._va ||= { x: 0, z: 0 }, vb = this._vb ||= { x: 0, z: 0 };
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const A = this.karts[a], B = this.karts[b];
      if (A.respawn > 0 || B.respawn > 0 || A.ghostTime > 0 || B.ghostTime > 0) continue;
      const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z;
      const d2 = dx * dx + dz * dz;
      const reach = 1.35 * (A.megaScale + B.megaScale) + (A.bulletTime > 0 || B.bulletTime > 0 ? 1.5 : 0);
      if (d2 > reach * reach || Math.abs(A.pos.y - B.pos.y) > 2 * Math.max(A.megaScale, B.megaScale)) continue;
      const d = Math.sqrt(d2) || 0.01;
      const nx = dx / d, nz = dz / d;   // from A to B
      // bullets blast through, and they, mega and golden karts bowl normal ones over and fling them
      // aside (a spin-out, like Mario Kart's Bullet Bill and Star, not a full wreck)
      const fling = (V, by, s, kind) => { V.hit(kind, by); if (V.bumpCool <= 0) { V.bumpCool = 0.5; V.shove(s * nx * 14 / V.weight, s * nz * 14 / V.weight, s * 1.5); } };
      if (A.bulletTime > 0 || B.bulletTime > 0) {
        if (A.bulletTime > 0 && B.bulletTime <= 0) fling(B, A, 1, 'spin');
        if (B.bulletTime > 0 && A.bulletTime <= 0) fling(A, B, -1, 'spin');
        continue;
      }
      if (A.megaTime > 0 && B.megaTime <= 0) { fling(B, A, 1, 'spin'); continue; }
      if (B.megaTime > 0 && A.megaTime <= 0) { fling(A, B, -1, 'spin'); continue; }
      const over = reach - d;
      const mA = A.weight, mB = B.weight;
      const wa = mB / (mA + mB), wb = 1 - wa;
      A.pos.x -= nx * over * wa; A.pos.z -= nz * over * wa;
      B.pos.x += nx * over * wb; B.pos.z += nz * over * wb;
      if (A.goldenTime > 0 && B.goldenTime <= 0) { fling(B, A, 1, 'spin'); continue; }
      if (B.goldenTime > 0 && A.goldenTime <= 0) { fling(A, B, -1, 'spin'); continue; }
      A.velocity(va); B.velocity(vb);
      const close = -((vb.x - va.x) * nx + (vb.z - va.z) * nz);   // closing speed along the contact normal
      let j = 0;
      if (close > 0) {
        // restitution 0.4, and any real contact is felt (a minimum push)
        j = (close > 0.5 ? Math.max(1.4 * close, 3) : 1.4 * close) * (mA * mB / (mA + mB));
        A.shove(-nx * j / mA, -nz * j / mA);
        B.shove(nx * j / mB, nz * j / mB);
      }
      if (A.bumpCool <= 0 && B.bumpCool <= 0) {
        A.bumpCool = B.bumpCool = 0.35;
        const hard = Math.min(1, j / 8);
        if (hard > 0.25) { A.anim?.play('bonk'); B.anim?.play('bonk'); }
        // abilities can react to bumps (e.g. a charged-up punch)
        A.onBump?.(B); B.onBump?.(A);
        if (A.human || B.human) this.audio.sfx('bump', A.pos);
        A.player?.rumble(0.1 + 0.4 * hard * wa, 90); B.player?.rumble(0.1 + 0.4 * hard * wb, 90);
      }
    }

    this.items.update(dt);
    this.hazards.update(dt);
    this.fx.update(dt);

    // standings
    this.order.sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.raceDist - a.raceDist;
    });
    this.order.forEach((k, i) => {
      // overtaking: the driver looks back and taunts the kart they just passed
      if (this.useChars && this.started && !k.finished && k.prevRank && i + 1 < k.prevRank && this.time > 4) {
        const passed = this.order[i + 1];
        k.tauntCool = (k.tauntCool || 0);
        if (passed && k.tauntCool < this.time && passed.pos.distanceTo(k.pos) < 12 && Math.random() < (k.human ? 0.6 : 0.3)) {
          k.tauntCool = this.time + 7; k.emote('taunt');
        }
      }
      k.rank = k.prevRank = i + 1;
    });

    // laps & finishing
    for (const k of this.karts) {
      if (k.finished || !this.started) continue;
      if (k.lap > k.lapSeen) {
        k.lapSeen = k.lap;
        if (k.lap >= 2) { k.lapTimes.push(this.time - k.lapStart); }
        k.lapStart = this.time;
        if (k.lap > this.laps) {
          k.finished = true; k.finishTime = this.time;
          this.results.push(k);
          this.voice(k, k.rank <= 3 ? 'win' : 'lose');
          if (k.human) {
            this.audio.sfx('finish');
            this.hud?.finish(k);
            k.player.rumble(0.6, 300);
            k.engine?.set(0, false, false);
          }
          if (this.mode === 'tt') this.doneTimer = 3;
        } else if (k.human && k.lap === this.laps) {
          this.hud?.message(k, 'FINAL LAP!', 'final');
          if (!this.finalLapShown) { this.finalLapShown = true; this.audio.sfx('finallap'); this.audio.musicRate(1.12); }
        } else if (k.human && k.lap > 1) {
          this.hud?.message(k, `LAP ${k.lap}`, 'lap');
          this.audio.sfx('lap');
        }
      }
    }
    if (this.mode !== 'attract' && this.doneTimer < 0 && this.cams.length && this.cams.every((c) => c.kart.finished)) this.doneTimer = 3.2;
    if (this.doneTimer > 0) {
      this.doneTimer -= dt;
      if (this.doneTimer <= 0) this.finish();
    }

    // cameras, audio, world
    for (const c of this.cams) {
      c.chase.update(dt, c.kart);
      const k = c.kart;
      k.engine?.set(Math.min(1.3, Math.abs(k.speed) / k.topSpeed), k.boosting, !k.finished && k.respawn <= 0, 1 / Math.sqrt(this.cams.length));
    }
    if (this.mode === 'attract' || this.cams.length === 3) this.tv.update(dt, this);
    if (this.state === 'intro') this.updateIntroCam();
    const focus = this.cams[0]?.kart.pos || this.tv.focus || this.karts[0].pos;
    this.audio.listener = focus;
    this.world.update(dt, focus);
    this.hud?.update(dt);
  }

  updateIntroCam() {
    const tr = this.track, t = this.introT;
    const i = tr.wrap(-30 + t * 8);
    const p = tr.at(i, 0, 0);
    const a = t * 0.35 + 0.6;
    this.introCam.position.set(p.x + Math.sin(a) * 40, p.y + 18 - t * 2, p.z + Math.cos(a) * 40);
    const s = tr.at(-12, 0, 1);
    this.introCam.lookAt(s);
  }

  finish() {
    if (this.finishedCalled) return;
    this.finishedCalled = true;
    // unfinished karts: estimate finish times from remaining distance
    const rest = this.order.filter((k) => !k.finished);
    for (const k of rest) {
      const remain = (this.laps + 1) * this.track.N - k.raceDist;
      k.finishTime = this.time + Math.max(0.5, remain / Math.max(15, k.topSpeed * 0.9)) + Math.random() * 0.3;
      k.finished = true; k.estimated = true;
    }
    const all = [...this.karts].sort((a, b) => a.finishTime - b.finishTime);
    this.onDone?.(all.map((k, i) => ({ place: i + 1, kart: k, charIndex: CHARACTERS.indexOf(k.ch), kartIndex: KARTS.indexOf(k.ch), driverIndex: k.driverIndex, player: k.player, time: k.finishTime, laps: k.lapTimes, estimated: !!k.estimated })));
  }

  viewports(W, H) {
    // GL viewports (origin bottom-left) for the split-screen cells, top row first
    return splitCells(this.cams.length).map(([c, r, cols, rows]) => [c * W / cols, H - (r + 1) * H / rows, W / cols, H / rows]);
  }

  render(renderer) {
    const size = renderer.getSize(V);
    const W = size.x, H = size.y;
    if (this.mode === 'attract' || !this.cams.length) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, W, H);
      this.tv.cam.aspect = W / H; this.tv.cam.updateProjectionMatrix();
      this.world.aimSun(this.tv.focus || this.karts[0].pos);
      renderer.render(this.scene, this.tv.cam);
      return;
    }
    if (this.state === 'intro') {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, W, H);
      this.introCam.aspect = W / H; this.introCam.updateProjectionMatrix();
      this.world.aimSun(this.track.at(-20, 0, 0));
      renderer.render(this.scene, this.introCam);
      return;
    }
    const vps = this.viewports(W, H);
    const shareShadow = vps.length >= 5;
    renderer.shadowMap.autoUpdate = !shareShadow;
    renderer.setScissorTest(true);
    vps.forEach((vp, i) => {
      const [x, y, w, h] = vp;
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      let cam, focus;
      if (this.cams[i]) { cam = this.cams[i].chase.cam; focus = this.cams[i].kart.pos; }
      else { cam = this.tv.cam; focus = this.tv.focus || this.karts[0].pos; }
      if (Math.abs(cam.aspect - w / h) > 0.001) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
      // with 5+ screens the sun's shadow map is drawn once per frame (around player 1) and shared
      if (!shareShadow || i === 0) { this.world.aimSun(focus); renderer.shadowMap.needsUpdate = true; }
      renderer.render(this.scene, cam);
    });
    renderer.shadowMap.autoUpdate = true;
    renderer.setScissorTest(false);
  }

  onHit(k, kind, by) {
    const c = this.cams.find((c) => c.kart === k);
    if (c) c.chase.shake = kind === 'spin' ? 0.6 : 1.2;
    // the attacker celebrates
    if (by && by !== k && !by.finished) by.emote('cheer');
  }

  // a short voice line for a character driver (rate-limited; CPU drivers only when nearby)
  voice(k, mood) {
    if (!mood || !k.driver || this.mode === 'attract') return;
    if ((k.voiceT || 0) > this.time) return;
    let vol = 1;
    if (!k.human) {
      vol = Math.max(...this.cams.map((c) => (c.kart.pos.distanceTo(k.pos) < 40 ? 1 - c.kart.pos.distanceTo(k.pos) / 40 : 0)), 0) * 0.65;
      if (vol < 0.12 || (this.voiceT || 0) > this.time) return;
      this.voiceT = this.time + 0.5;
    }
    k.voiceT = this.time + 0.9;
    this.audio.voice?.(k.driver.voice, mood, vol);
  }

  // Compile every material in the scene up front, including parts that start hidden
  // (driver gesture effects, gliders, shield bubbles, auras…), so nothing stalls the
  // frame mid-race the first time it appears.
  warmup(renderer) {
    // movie abilities can hand over sample meshes so their materials compile now too
    const samples = [];
    for (const a of ABILITIES) {
      try { const o = a.prewarm?.(this.items.ctx); for (const m of [].concat(o || [])) { m.position.set(0, -200, 0); this.scene.add(m); samples.push(m); } } catch (e) { console.warn('prewarm failed', a.id, e); }
    }
    const hidden = [];
    this.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    try {
      const cam = this.cams[0]?.chase.cam || this.introCam;
      if (renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile')) renderer.compileAsync(this.scene, cam).catch(() => {});
      else renderer.compile(this.scene, cam);
    } catch (e) { console.warn('shader warm-up failed', e); }
    for (const o of hidden) o.visible = false;
    for (const m of samples) this.scene.remove(m);
  }

  dispose() {
    for (const c of this.cams) c.kart.engine?.stop();
    this.items.dispose();
    this.hud?.dispose();
    this.world.dispose();
    this.scene.clear();
  }
}
