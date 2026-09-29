// Computer drivers: follow the track with a personal lane, cut corners,
// drift through bends, grab item boxes / boost pads, dodge traps and use items.
import { angleDiff } from './kart.js';

export const DIFFICULTY = {
  easy: { base: 0.86, skill: 0.25, band: 0.06 },
  normal: { base: 0.95, skill: 0.6, band: 0.09 },
  hard: { base: 1.01, skill: 0.95, band: 0.11 },
};

export class AIDriver {
  constructor(kart, race, diff = 'normal') {
    this.k = kart;
    this.race = race;
    this.d = DIFFICULTY[diff] || DIFFICULTY.normal;
    this.seed = Math.random() * 100;
    this.lane = (Math.random() - 0.5) * 0.8;
    this.laneTarget = this.lane;
    this.itemTimer = 1 + Math.random() * 2;
    this.stuck = 0; this.reverse = 0;
    this.driftHeld = false;
    this.ctl = { throttle: 1, brake: 0, steer: 0, drift: false, driftPressed: false, itemPressed: false, back: false, aimFwd: false };
    this.t = 0;
  }

  update(dt) {
    const k = this.k, tr = this.race.track, c = this.ctl, sk = this.d.skill;
    this.t += dt;
    c.driftPressed = false; c.itemPressed = false; c.back = false; c.aimFwd = false; c.brake = 0;
    if (k.respawn > 0) return c;
    const i = k.loc.i ?? 0;
    const speed = k.speed;
    const la = Math.round(7 + Math.max(0, speed) * 0.42);
    // curvature ahead
    const y0 = tr.yawAt(i + 3), y2 = tr.yawAt(i + la * 2 + 6);
    const bend = angleDiff(y0, y2);
    const curv = Math.abs(bend);
    // lane: wander + inside line in bends + go for boxes/pads + dodge traps
    let want = Math.sin(this.t * 0.23 + this.seed) * 0.45;
    // bend > 0 = track turns left (yaw increasing); take the inside line
    if (curv > 0.35) want = -Math.sign(bend) * 0.5 * Math.min(1, curv) * (0.4 + sk * 0.6);
    if (!k.nextItem && !(k.roulette2 > 0)) {
      for (const b of tr.itemBoxes) {
        const di = (b.i - i + tr.N) % tr.N;
        if (di > 8 && di < 60 && b.active) { want = tr.HW[b.i] ? (b.pos.clone().sub(tr.at(b.i)).dot({ x: tr.R[b.i * 2], y: 0, z: tr.R[b.i * 2 + 1] }) / tr.HW[b.i]) : want; break; }
      }
    }
    if (sk > 0.5) for (const bp of tr.boosts) {
      const di = (bp.i - i + tr.N) % tr.N;
      if (di > 5 && di < 50) { want = bp.lat / tr.HW[bp.i]; break; }
    }
    // dodge traps, hazards and obstacles on the line ahead
    for (let a = 6; a < 44; a += 5) {
      const j = tr.wrap(i + a);
      const p = tr.at(j, this.lane * tr.HW[j], 0);
      if (this.race.items.dangerNear(p, 4) || (sk > 0.3 && this.race.hazards.near(p, 3)) || tr.obstacleAt(p.x, p.y, p.z, 2.4)) {
        // pick whichever side is clear
        const alt = [0.6, -0.6, 0, 0.85, -0.85].find((l) => { const q = tr.at(j, l * tr.HW[j], 0); return !tr.obstacleAt(q.x, q.y, q.z, 2.4) && !this.race.hazards.near(q, 2.5); });
        want = alt ?? (this.lane > 0 ? -0.55 : 0.55);
        break;
      }
    }
    this.laneTarget = Math.max(-0.85, Math.min(0.85, want));
    this.lane += (this.laneTarget - this.lane) * Math.min(1, dt * 2.2);
    // line up straight for ramps
    for (const r of tr.ramps) {
      const di = (r.i - i + tr.N) % tr.N;
      if (di < 45) { want = 0; this.lane *= 0.9; break; }
    }
    // steer to target point
    const j = tr.wrap(i + la);
    const tp = tr.at(j, this.lane * tr.HW[j] * 0.85, 0);
    const want_yaw = Math.atan2(tp.x - k.pos.x, tp.z - k.pos.z);
    const err = angleDiff(k.yaw, want_yaw);
    c.steer = Math.max(-1, Math.min(1, -err * 2.6));
    c.throttle = 1;
    if (curv > 1.25 && speed > k.topSpeed * 0.8 && !k.drift.active) { c.throttle = 0.4; if (curv > 1.8) c.brake = 0.3; }
    // drifting
    const canDrift = sk > 0.35 && !tr.theme.noAIDrift;
    if (canDrift) {
      if (!k.drift.active && !this.driftHeld && curv > 0.6 && speed > 20 && k.grounded && Math.abs(err) > 0.05 && !tr.ramps.some((r) => (r.i - i + tr.N) % tr.N < 40)) {
        c.driftPressed = true; this.driftHeld = true; this.holdT = 0; c.steer = -Math.sign(bend) || 1;
      }
      this.holdT = (this.holdT || 0) + dt;
      if (this.driftHeld) {
        const release = (k.drift.active && curv < 0.22 && k.drift.level >= 1) || (k.drift.active && -Math.sign(err) !== k.drift.dir && Math.abs(err) > 0.35) || speed < 10;
        if (release || (!k.drift.active && k.grounded && this.holdT > 0.45)) this.driftHeld = false;
      }
    }
    c.drift = this.driftHeld;
    // stuck recovery
    if (this.race.started && c.throttle > 0 && Math.abs(speed) < 3 && !k.stunned) this.stuck += dt; else this.stuck = Math.max(0, this.stuck - dt);
    if (this.stuck > 1.5 && this.reverse <= 0) this.reverse = 1.0;
    if (this.reverse > 0) { this.reverse -= dt; c.throttle = 0; c.brake = 1; c.steer = -c.steer; }
    if (this.stuck > 5) { k.startRespawn(); this.stuck = 0; }
    // items
    if (k.item && k.roulette <= 0) {
      this.itemTimer -= dt;
      if (this.itemTimer <= 0) this.decideItem(curv);
    }
    return c;
  }

  decideItem(curv) {
    const k = this.k, c = this.ctl, race = this.race;
    const order = race.order, my = order.indexOf(k);
    const ahead = my > 0 ? order[my - 1] : null, behind = my < order.length - 1 ? order[my + 1] : null;
    const gapAhead = ahead ? ahead.raceDist - k.raceDist : 1e9;
    const gapBehind = behind ? k.raceDist - behind.raceDist : 1e9;
    let use = false;
    switch (k.item) {
      case 'boost': case 'boost3': case 'golden': use = curv < 0.5 && !k.offroad || k.offroad; break;
      case 'rocket': use = !!ahead && gapAhead < 180; break;
      case 'cannon': {
        if (ahead && gapAhead < 45) {
          const a = Math.atan2(ahead.pos.x - k.pos.x, ahead.pos.z - k.pos.z);
          use = Math.abs(angleDiff(k.yaw, a)) < 0.2;
        }
        if (!use && behind && gapBehind < 18) { use = true; c.back = true; }
        if (!use && this.itemTimer < -8) use = true;
        break;
      }
      case 'trap': use = (behind && gapBehind < 25) || this.itemTimer < -6; break;
      case 'shield': use = this.itemTimer < -1.5 || race.items.proj.some((p) => p.owner !== k && p.pos.distanceTo(k.pos) < 35); break;
      case 'storm': use = true; break;
    }
    if (use) { c.itemPressed = true; this.itemTimer = 0.5 + Math.random() * (1.5 - this.d.skill); }
  }

  // speed multiplier relative to the best human player (rubber-banding)
  band(humanLead) {
    const k = this.k;
    let m = this.d.base;
    if (humanLead !== null) {
      const diff = humanLead - k.raceDist;   // >0 when the AI is behind the humans
      if (diff > 0) m += Math.min(this.d.band, diff / 1400);
      else m -= Math.min(0.07, -diff / 1800);
    }
    k.speedMult = m;
  }
}
