// What other players look like on this screen:
// - RemotePlayer: a friend's student, drawn from their presence updates with snapshot
//   interpolation, with their spell shield, Lumos light, broom or Hippogriff and a name tag
// - Proxy (host only): a stand-in for a guest that enemies can chase, aim at and hurt; the hurt is
//   sent to that guest, whose own screen decides whether it lands (dodge rolls, Protego)
// - puppets (guests only): the host's enemies, drawn from the host's updates. Spells that hit a
//   puppet are forwarded to the host, who owns every enemy.
import * as THREE from 'three';
import { G, HOUSES, HOUSE_KEYS } from '../state.js';
import { makeWizard, makeBroom, makeHippogriff, SKIN_TONES, HAIR_COLORS, HAIR_STYLES, WAND_WOODS } from '../models.js';
import { Enemy, TYPES } from '../enemies.js';
import { glowSprite } from '../textures.js';
import { dampAngle, rand } from '../util.js';
import { Clock, num, int, str, vec } from './session.js';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const ANIM_RE = /^[a-zA-Z]{1,12}$/;
export const PF = { SHIELD: 1, LUMOS: 2, ALIVE: 4, TARGET: 8, VISIBLE: 16, BUSY: 32 };
export const EF = { ALIVE: 1, AGGRO: 2, STUN: 4, FROZEN: 8, BURN: 16, LIFTED: 32, DISARMED: 64, SHIELD: 128, BLOCK: 256, CLUB: 512, INVULN: 1024 };
const TRIGGERS = new Set(['cast', 'flick', 'hit', 'wave', 'nod', 'point', 'cheer']);

// look <-> compact array: [skin, hairStyle, hairColor, glasses, hat, wand, eyes]
export function packLook(look = {}) {
  return [look.skin ?? 1, look.hairStyle || 'short', look.hairColor ?? 1, look.glasses ? 1 : 0, look.hat ? 1 : 0, look.wand || 'holly', look.eyes || '#3a2a1a'];
}
export function unpackLook(k) {
  const a = Array.isArray(k) ? k : [];
  return {
    skin: int(a[0], 0, SKIN_TONES.length - 1, 1),
    hairStyle: HAIR_STYLES.includes(a[1]) ? a[1] : 'short',
    hairColor: int(a[2], 0, HAIR_COLORS.length - 1, 1),
    glasses: a[3] === 1,
    hat: a[4] === 1,
    wand: typeof a[5] === 'string' && WAND_WOODS[a[5]] ? a[5] : 'holly',
    eyes: typeof a[6] === 'string' && /^#[0-9a-fA-F]{6}$/.test(a[6]) ? a[6] : '#3a2a1a',
  };
}
export const cleanHouse = (h) => (HOUSE_KEYS.includes(h) ? h : null);

// interpolate a buffer of { t, p (Vector3), q (Quaternion) } samples at time rt
function sampleAt(buf, rt, outP, outQ) {
  const n = buf.length;
  if (!n) return null;
  if (rt == null || rt >= buf[n - 1].t) {
    const b = buf[n - 1];
    // a little dead reckoning when updates are late, then hold
    if (rt != null && n > 1 && b.z === buf[n - 2].z) {
      const a = buf[n - 2];
      const dt = b.t - a.t;
      const ahead = Math.min(rt - b.t, 0.25);
      if (dt > 0.001 && dt < 0.5) outP.copy(b.p).addScaledVector(_v.subVectors(b.p, a.p), ahead / dt);
      else outP.copy(b.p);
    } else outP.copy(b.p);
    outQ.copy(b.q);
    return b;
  }
  if (rt <= buf[0].t) { outP.copy(buf[0].p); outQ.copy(buf[0].q); return buf[0]; }
  let i = n - 2;
  while (i > 0 && buf[i].t > rt) i--;
  const a = buf[i], b = buf[i + 1];
  if (a.z !== b.z) { outP.copy(a.p); outQ.copy(a.q); return a; } // never slide between zones
  const k = (rt - a.t) / Math.max(1e-4, b.t - a.t);
  outP.lerpVectors(a.p, b.p, k);
  outQ.slerpQuaternions(a.q, b.q, k);
  return a;
}

// ------------------------------------------------------------------ name tags
function makeTag() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 72;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  s.scale.set(1.9, 0.53, 1);
  s.renderOrder = 20;
  return { sprite: s, canvas: c, tex, key: '' };
}
function drawTag(tag, name, house, hp, away) {
  const key = `${name}|${house}|${Math.round(hp * 10)}|${away}`;
  if (key === tag.key) return;
  tag.key = key;
  const x = tag.canvas.getContext('2d');
  x.clearRect(0, 0, 256, 72);
  x.font = '600 30px "EB Garamond", Georgia, serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const H = HOUSES[house];
  const col = H ? (H.c2 === '#2b2622' ? '#f0d060' : H.c2) : '#f3e6c8';
  const label = name + (away ? ' (away)' : '');
  x.lineWidth = 6; x.strokeStyle = 'rgba(10,6,16,.85)';
  x.strokeText(label, 128, 26, 248);
  x.fillStyle = away ? '#b0a8a0' : col;
  x.fillText(label, 128, 26, 248);
  // health bar
  x.fillStyle = 'rgba(10,6,16,.8)'; x.fillRect(58, 50, 140, 12);
  x.fillStyle = hp > 0.3 ? '#7ad86a' : '#e05a4a'; x.fillRect(60, 52, 136 * Math.max(0, Math.min(1, hp)), 8);
  tag.tex.needsUpdate = true;
}

// ------------------------------------------------------------------ a friend's student
export class RemotePlayer {
  constructor(uid) {
    this.uid = uid;
    this.root = new THREE.Group();
    this.root.visible = false;
    G.scene.add(this.root);
    this.buf = [];
    this.clock = new Clock();
    this.lookKey = '';
    this.name = 'Friend';
    this.house = null;
    this.hp = 1;
    this.lastAt = performance.now();
    this.lastT = -1;
    this.trigSeq = -1;
    this.cur = null;
    this.pos = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.rollT = 0;
    this.tag = makeTag();
    this.root.add(this.tag.sprite);
    this.tag.sprite.position.y = 2.35;
    const m = G.spells.shieldMat.clone();
    m.uniforms = THREE.UniformsUtils.clone(G.spells.shieldMat.uniforms);
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16), m);
    this.shield.visible = false;
    G.scene.add(this.shield);
    this.lumos = null;
  }

  // name, house and look; the model is rebuilt only when they change
  setInfo(d) {
    this.name = str(d.n, 16) || 'Friend';
    this.house = cleanHouse(d.h);
    const look = unpackLook(d.k);
    const key = JSON.stringify([this.house, look]);
    if (key === this.lookKey) return;
    this.lookKey = key;
    this.setLumos(false);
    if (this.model) this.model.root.parent?.remove(this.model.root);
    this.model = makeWizard({
      house: this.house, skin: SKIN_TONES[look.skin], hairColor: HAIR_COLORS[look.hairColor], hairStyle: look.hairStyle,
      glasses: look.glasses, hat: look.hat, wandColor: WAND_WOODS[look.wand], eyeColor: look.eyes, scarf: true,
    });
    this.root.add(this.model.root);
    this.broom = null;
    this.mountKind = 0;
  }

  // one presence update (already validated by the caller for the basics)
  push(d, recvAt) {
    const t = num(d.t, 0, 1e12, -1) / 1000;
    if (t <= this.lastT) return; // duplicate or reordered
    this.lastT = t;
    this.lastAt = recvAt;
    this.clock.sample(t * 1000, recvAt);
    const p = vec(d.p);
    const q = Array.isArray(d.q) && d.q.length === 4 && d.q.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1.01) ? d.q : null;
    if (!p) return;
    const s = {
      t, z: str(d.z, 20), p: new THREE.Vector3(p[0], p[1], p[2]),
      q: q ? new THREE.Quaternion(q[0], q[1], q[2], q[3]).normalize() : new THREE.Quaternion(),
      a: typeof d.a === 'string' && ANIM_RE.test(d.a) ? d.a : 'idle', s: num(d.s, 0, 60), f: int(d.f, 0, 1 << 16), m: int(d.m, 0, 2),
    };
    this.buf.push(s);
    if (this.buf.length > 40) this.buf.shift();
    this.hp = num(d.hp, 0, 100, 100) / 100;
    // one-shot animations since the last update
    if (Array.isArray(d.tr) && d.tr.length > 1) {
      const seq = int(d.tr[0], 0, 1e9, -1);
      if (seq > this.trigSeq) {
        this.trigSeq = seq;
        for (const n of d.tr.slice(1, 6)) if (TRIGGERS.has(n)) this.model?.anim.trigger(n);
      }
    }
  }

  get latest() { return this.buf[this.buf.length - 1] || null; }
  get zone() { return this.latest?.z || null; }
  get away() { return performance.now() - this.lastAt > 4000; }

  setLumos(on) {
    if (on && !this.lumos && this.model) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(3, 2.8, 2.2), blending: THREE.AdditiveBlending, depthWrite: false }));
      sprite.scale.setScalar(0.6);
      this.model.wandTip.add(sprite);
      this.lumos = { sprite, light: G.lights.attach(this.model.wandTip, 0xfff0d0, 50, 18) };
    } else if (!on && this.lumos) {
      this.lumos.light.release();
      this.lumos.sprite.parent?.remove(this.lumos.sprite);
      this.lumos.sprite.material.dispose();
      this.lumos = null;
    }
  }

  setMount(m) {
    if (m === this.mountKind || !this.model) return;
    const mr = this.model.root;
    if (this.broom) { mr.remove(this.broom); this.broom = null; }
    mr.position.set(0, 0, 0);
    if (mr.parent !== this.root) { mr.parent?.remove(mr); this.root.add(mr); }
    if (this.hippo) this.hippo.root.visible = false;
    if (m === 1) {
      this.broom = makeBroom();
      this.broom.position.set(0, 0.92, 0.05);
      mr.add(this.broom);
      mr.position.y = -0.55;
    } else if (m === 2) {
      if (!this.hippo) { this.hippo = makeHippogriff(); G.scene.add(this.hippo.root); }
      this.hippo.root.visible = true;
      this.hippo.saddle.add(mr);
      mr.position.set(0, 0.1, 0);
    }
    this.mountKind = m;
  }

  update(dt, nowMs) {
    if (!this.model) return;
    const rt = this.clock.renderTime(nowMs);
    const cur = sampleAt(this.buf, rt, this.pos, this.quat);
    this.cur = cur;
    const here = !!cur && cur.z === G.zone?.name && (cur.f & PF.VISIBLE) && G.mode !== 'menu' && G.mode !== 'menu-custom';
    this.root.visible = !!here;
    if (this.hippo) this.hippo.root.visible = !!here && this.mountKind === 2;
    this.shield.visible = !!here && !!(cur.f & PF.SHIELD);
    if (!here) { this.setLumos(false); return; }
    this.setMount(cur.m);
    const top = this.mountKind === 2 ? this.hippo.root : this.root;
    top.position.copy(this.pos);
    top.quaternion.copy(this.quat);
    if (this.mountKind === 2) {
      this.root.position.copy(this.pos); // keeps the name tag and shield with the rider
      this.hippo.anim.set(cur.s > 20 ? 'fly' : 'glide');
      this.hippo.anim.update(dt, 0, {});
    }
    const anim = this.model.anim;
    anim.set(cur.f & PF.ALIVE ? cur.a : 'down');
    anim.update(dt, cur.a === 'fly' || cur.a === 'ride' ? 0 : cur.s);
    if (cur.a === 'roll') { this.rollT = Math.min(0.42, this.rollT + dt); this.model.parts.body.rotation.x = (this.rollT / 0.42) * Math.PI * 2; }
    else this.rollT = 0;
    this.setLumos(!!(cur.f & PF.LUMOS));
    if (this.shield.visible) {
      this.shield.position.copy(this.pos).setY(this.pos.y + 1.0);
      const u = this.shield.material.uniforms;
      u.time.value += dt;
      u.strength.value = 1;
    }
    // name tag: above the head, or above the Hippogriff
    if (this.mountKind === 2) this.tag.sprite.position.set(0, 3.2, 0);
    else this.tag.sprite.position.set(0, 2.35, 0);
    drawTag(this.tag, this.name, this.house, this.hp, this.away);
  }

  wandPos(out = new THREE.Vector3()) {
    if (!this.model || !this.root.visible) return out.copy(this.pos).setY(this.pos.y + 1.3);
    this.root.updateMatrixWorld(true);
    return this.model.wandTip.getWorldPosition(out);
  }

  dispose() {
    this.setLumos(false);
    G.scene.remove(this.root);
    G.scene.remove(this.shield);
    if (this.hippo) G.scene.remove(this.hippo.root);
    this.tag.tex.dispose();
    this.tag.sprite.material.dispose();
    this.shield.geometry.dispose();
    this.shield.material.dispose();
  }
}

// ------------------------------------------------------------------ host: a guest enemies can chase
export class Proxy {
  constructor(coop, avatar) {
    this.coop = coop;
    this.avatar = avatar;
    this.uid = avatar.uid;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.radius = 0.38;
    this.height = 1.8;
    this.team = 'player';
    this.remote = true;
    this.alive = false;
    this.drainAcc = 0;
  }
  get house() { return this.avatar.house; }
  // where the guest is right now as far as we know: their latest update, nudged forward
  refresh() {
    const b = this.avatar.buf, n = b.length;
    const L = b[n - 1];
    this.targetable = !!L && L.z === G.zone?.name && !!(L.f & PF.TARGET) && !(L.f & PF.BUSY) && !this.avatar.away;
    this.alive = this.targetable && !!(L.f & PF.ALIVE);
    if (!L) return;
    if (n > 1 && b[n - 2].z === L.z) {
      const dt = L.t - b[n - 2].t;
      if (dt > 0.001 && dt < 0.5) this.vel.subVectors(L.p, b[n - 2].p).divideScalar(dt);
    } else this.vel.set(0, 0, 0);
    const age = Math.min(0.15, (performance.now() - this.avatar.lastAt) / 1000);
    this.pos.copy(L.p).addScaledVector(this.vel, age);
  }
  damage(amount, info = {}) {
    if (!this.alive) return false;
    this.coop.hurt(this.uid, amount, info);
    return true;
  }
  drain(a) { this.drainAcc += a; }
  faint() {}
}

// ------------------------------------------------------------------ guest: the host's enemies
// E entries: [id, type, x, y, z, rotY, hp, maxHp, flags, anim, speed, phaseLabel, name, buildOpts]
export function readEnemy(a) {
  if (!Array.isArray(a) || a.length < 11) return null;
  const id = int(a[0], 1, 1e9, 0), type = a[1];
  if (!id || !TYPES[type]) return null;
  const x = num(a[2], -5000, 5000, NaN), y = num(a[3], -5000, 5000, NaN), z = num(a[4], -5000, 5000, NaN);
  if (!Number.isFinite(x + y + z)) return null;
  const o = a[13] && typeof a[13] === 'object' ? a[13] : {};
  return {
    id, type, p: new THREE.Vector3(x, y, z), r: num(a[5], -1e4, 1e4), hp: num(a[6], -1e5, 1e5), max: num(a[7], 1, 1e5, 100),
    f: int(a[8], 0, 1 << 16), a: typeof a[9] === 'string' && ANIM_RE.test(a[9]) ? a[9] : '', s: num(a[10], 0, 60),
    l: str(a[11], 40), n: str(a[12], 40),
    o: { house: cleanHouse(o.house), hat: o.hat === true, robe: typeof o.robe === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.robe) ? o.robe : undefined },
  };
}
export function writeEnemy(e) {
  const S = e.status;
  let f = 0;
  if (e.alive) f |= EF.ALIVE;
  if (e.aggro) f |= EF.AGGRO;
  if (S.stun > 0) f |= EF.STUN;
  if (S.frozen > 0) f |= EF.FROZEN;
  if (S.burn > 0) f |= EF.BURN;
  if (S.lifted > 0) f |= EF.LIFTED;
  if (S.disarmed > 0) f |= EF.DISARMED;
  if (e.shieldMesh?.visible) f |= EF.SHIELD;
  if (e.blocking) f |= EF.BLOCK;
  if (e.clubGone > 0) f |= EF.CLUB;
  if (e.invuln) f |= EF.INVULN;
  const p = e.root.position;
  const r = (v) => Math.round(v * 100) / 100;
  const o = e.type === 'duelist' ? { house: e.o.house, hat: !!e.o.hat, robe: e.o.robe } : 0;
  return [e.id, e.type, r(p.x), r(p.y), r(p.z), r(e.root.rotation.y), Math.round(e.hp), e.maxHp, f, e.anim.state || '', r(Math.hypot(e.vel.x, e.vel.z)), e.phaseLabel || '', e.name, o];
}

export function makePuppet(coop, s) {
  const e = new Enemy(s.type, s.p, { ...s.o, aggro: false, yaw: s.r });
  e.remote = true;
  e.netId = s.id;
  e.buf = [];
  e.maxHp = s.max;
  e.hp = s.hp;
  e.name = s.n || e.name;
  e.update = () => {}; // driven by updatePuppet
  // everything the local spells do to an enemy goes to the host instead
  const fwd = (k, d) => coop.forward(k, e, d);
  e.takeHit = (h) => {
    if (!e.alive) return;
    fwd('th', { dmg: h.dmg, spell: h.spell, splash: !!h.splash, combo: !!h.combo, stun: h.stun || 0, dir: h.dir ? [h.dir.x, h.dir.y, h.dir.z] : null });
  };
  e.endLift = (slam) => { e.status.lifted = 0; e.liftGrace = 0; fwd('end', { slam: !!slam }); };
  e.throwTo = (v) => { e.status.lifted = 0; e.liftGrace = 0; fwd('thr', { v: [v.x, v.y, v.z] }); };
  e.onLumos = (d) => fwd('lum', { d, from: [G.player.pos.x, G.player.pos.y, G.player.pos.z] });
  e.onPatronus = () => fwd('pat', {});
  e.die = () => {};
  e.disarm = () => {};
  e.lift = () => {};
  applyPuppet(e, s, true);
  return e;
}

export function pushPuppet(e, s, t) {
  if (e.buf.length && t <= e.buf[e.buf.length - 1].t) return;
  e.buf.push({ t, z: 0, p: s.p, q: new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, s.r) });
  if (e.buf.length > 30) e.buf.shift();
  e.snap = s;
}

// status and looks from the latest host update
function applyPuppet(e, s, first) {
  const S = e.status, f = s.f;
  e.hp = s.hp; e.maxHp = s.max;
  e.phaseLabel = s.l;
  e.aggro = !!(f & EF.AGGRO);
  S.stun = f & EF.STUN ? 1 : 0;
  S.frozen = f & EF.FROZEN ? 1 : 0;
  S.burn = f & EF.BURN ? 1 : 0;
  S.disarmed = f & EF.DISARMED ? 1 : 0;
  // a Leviosa we just cast holds the lift until the host has seen it
  if (f & EF.LIFTED) { S.lifted = 3.5; e.liftGrace = 0; } else if (!(e.liftGrace > 0)) S.lifted = 0;
  e.invuln = !!(f & EF.INVULN);
  e.blocking = !!(f & EF.BLOCK);
  e.shield = f & (EF.SHIELD | EF.BLOCK) ? 1 : 0;
  if (f & EF.SHIELD) e.ensureShield(); else if (e.shieldMesh) e.shieldMesh.visible = false;
  if (e.model.parts?.wand) e.model.parts.wand.visible = !(f & EF.DISARMED);
  if (e.model.club) e.model.club.visible = !(f & EF.CLUB);
  e.ice.visible = !!(f & EF.FROZEN);
  if (s.a && e.anim.set) e.anim.set(s.a);
  const alive = !!(f & EF.ALIVE);
  if (!alive && e.alive) {
    e.alive = false;
    e.deadT = 0;
    e.ice.visible = false;
    if (e.shieldMesh) e.shieldMesh.visible = false;
    if (G.cam.lockTarget === e) G.cam.lockTarget = null;
    if (!first) {
      if (e.type === 'pixie') { G.fx.burst(e.pos.clone().setY(e.pos.y + 0.3), 0x5aa0ff, 40, 5); G.audio.sfx('pixie'); }
      if (e.type === 'dementor') { G.fx.smokePuff(e.pos.clone().setY(e.pos.y + 1.6), 0x0a0a10, 30, { size: 2, size1: 4, speed: 4, alpha: 0.6 }); G.fx.burst(e.pos.clone().setY(e.pos.y + 1.6), 0xcfeaff, 60, 8); G.audio.sfx('dementor'); }
    }
  }
}

export function updatePuppet(e, dt, rt) {
  if (e.snap) { applyPuppet(e, e.snap, false); e.snap = null; }
  e.liftGrace = Math.max(0, (e.liftGrace || 0) - dt);
  const prev = _v.copy(e.pos);
  if (sampleAt(e.buf, rt, e.pos, _q)) {
    e.root.position.copy(e.pos);
    const yaw = _e.setFromQuaternion(_q, 'YXZ').y;
    e.root.rotation.y = e.status.lifted > 0 ? e.root.rotation.y + dt * 1.5 : dampAngle(e.root.rotation.y, yaw, 20, dt);
    e.yaw = yaw;
  }
  if (dt > 0) e.vel.subVectors(e.pos, prev).divideScalar(dt);
  const S = e.status;
  if (!e.alive) {
    e.deadT = (e.deadT || 0) + dt;
    if (e.type === 'dementor' || e.type === 'pixie') e.root.scale.multiplyScalar(1 - Math.min(0.5, dt * 2));
    e.anim.set?.('down');
  } else {
    if (S.stun > 0 && Math.random() < 0.15) G.fx.emit({ pos: _v.copy(e.pos).setY(e.pos.y + e.height + 0.2), color: 0xffe060, count: 1, speed: 1, size: 0.15, life: 0.5, intensity: 3, noScale: true });
    if (S.burn > 0 && Math.random() < 0.6) G.fx.emit({ pos: _v.copy(e.pos).setY(e.pos.y + rand(0.2, e.height)), color: 0xffb030, color2: 0xff2000, count: 2, speed: 1, size: 0.4, size1: 0.1, life: 0.5, intensity: 3, up: 2, spread: e.radius * 2, noScale: true });
    if (S.lifted > 0 && Math.random() < 0.5) G.fx.emit({ pos: e.pos, color: 0xc28bff, count: 1, speed: 0.8, size: 0.2, life: 0.6, intensity: 3, spread: 1, noScale: true });
  }
  if (e.shieldMesh) {
    e.shieldMesh.position.copy(e.pos).setY(e.pos.y + e.height * 0.55);
    e.shieldMesh.material.uniforms.time.value = (e.t += dt);
  }
  if (S.frozen > 0) return; // frozen solid: keep the pose
  e.anim.update?.(dt, Math.hypot(e.vel.x, e.vel.z));
}
