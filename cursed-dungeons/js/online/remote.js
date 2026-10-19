// What the other screens look like on this one:
// - figures: another screen's players, as real Player objects (their sorcerer model, kit and
//   animations) driven by that screen's presence updates with snapshot interpolation. Their kit
//   replays the abilities they use (the visuals, sounds and crowd control), but never deals damage
//   here: the player's own screen does that (combat.js ignores a remote source). Hosting, curses
//   chase them like anyone else, and a hit on one is sent to its own screen.
// - puppets (guests only): the host's curses, bosses and cursed objects, drawn from the host's
//   updates. Hits on a puppet go to the host, who applies them.
// - name tags over the other players' heads.
import * as THREE from 'three/webgpu';
import { Player, PLAYER_COLORS } from '../entities/player.js';
import { buildCurseModel, CURSES, addEliteShell } from '../entities/curses.js';
import { BOSSES } from '../entities/bosses.js';
import { FLASH_MATERIAL } from '../entities/character.js';
import { buildLook } from '../world/cursedObject.js';
import { dressAsSorcerer } from '../world/cullingGame.js';
import { SORCERERS } from '../sorcerers/index.js';
import { num, int, str, fin } from './session.js';
import { damp, dampAngle } from '../util.js';

const WORD = /^[a-zA-Z]{1,14}$/;
const ELITES = new Set(['swift', 'armored', 'vampiric', 'explosive', 'shadow']);
const ELITE_COL = { swift: 0x4affd8, armored: 0xffc24a, vampiric: 0xff3a5a, explosive: 0xff8a2a, shadow: 0xb05aff };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

// player flags in presence
export const PF = { ALIVE: 1, DOWN: 2, DEAD: 4, AIR: 8, DOMAIN: 16, IFRAME: 32, BUSY: 64, HURT: 128, HIDDEN: 256, INVULN: 512 };
// enemy flags
export const EF = { DEAD: 1, FLASH: 2, HIDDEN: 4, UNTARGET: 8, SHIELDED: 16 };

const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// ------------------------------------------------------------------ figures
// A stand-in save while building a figure: the remote player's own progression lives on their
// screen, so the figure must not touch (or add entries to) this screen's save.
const GHOST_SAVE = { sorc: () => ({ skills: {}, gear: [null, null, null, null], loadout: null }), gearFor: () => [], data: { inventory: [] }, write() { return true; } };

export function makeFigure(net, scr, slot, sorcerer) {
  const g = net.g;
  if (!SORCERERS[sorcerer]) sorcerer = 'yuji';
  const real = g.save;
  let p;
  g.save = GHOST_SAVE;
  try { p = new Player(g, 4, 'remote', sorcerer); } finally { g.save = real; }
  // (the light pool is for this screen's players; kits still tint "their" light)
  if (p.heroLight) g.lights.remove(p.heroLight);
  p.heroLight = { color: new THREE.Color(1, 1, 1), intensity: 1, distance: 7, ghost: true };
  p.isRemote = true;
  p.remote = { uid: scr.uid, slot };
  p.key = scr.uid + ':' + slot;
  p.netName = 'Sorcerer';
  p.buf = [];       // interpolation samples (sender frame)
  p.evq = [];       // ability events waiting for the playback time to reach them
  p.inWorld = false;
  p.hp = p.maxHp; p.ce = 0;
  p.update = () => {};   // driven by updateFigure
  // Hosting, curses hit the figure like anyone: the hit goes to the player's own screen, which
  // applies it (its i-frames, dodge and technique defences decide). Anything else (its own replayed
  // technique, a teammate's) never hurts it here.
  p.takeDamage = (amount, src, o = {}) => {
    if (!net.isHost || p.dead || p.downed || !p.inWorld || p.away || !(amount > 0)) return 0;
    if (!src?.isEnemy && !o.enemyHit) return 0;
    if (!o.pure && (p.iframes > 0 || p.invulnerable)) return 0;
    net.hurt(p, amount, src, o);
    return amount;
  };
  p.heal = () => {};
  p.object.visible = false;
  g.scene.add(p.object);
  return p;
}
export function disposeFigure(net, p) {
  const g = net.g;
  if (g.domain?.caster === p) { try { g.domainSys.collapse(); } catch { /* gone */ } }
  try { p.kit?.dispose?.(); } catch (e) { net.logError('figure dispose', e); }
  for (const a of [...g.allies]) if (a.owner === p) { try { a.dispose?.(); } catch { /* gone */ } g.scene.remove(a.object); g.allies.splice(g.allies.indexOf(a), 1); }
  g.scene.remove(p.object);
  if (p.tag) { p.tag.remove(); p.tag = null; }
}

// one presence entry -> a sample (null when malformed)
// P entry: [slot, name, sorcerer, x, y, z, facing, vx, vz, vy, flags, hp, maxHp, ce, maxCe, act, actT, style, both]
export function readPlayer(a) {
  if (!Array.isArray(a) || a.length < 15) return null;
  const slot = int(a[0], 0, 3, -1);
  if (slot < 0 || ![a[3], a[4], a[5]].every((v) => fin(v))) return null;
  return {
    slot, name: str(a[1], 16), sorcerer: typeof a[2] === 'string' && SORCERERS[a[2]] ? a[2] : null,
    x: a[3], y: a[4], z: a[5], fa: num(a[6], -100, 100), vx: num(a[7], -80, 80), vz: num(a[8], -80, 80), vy: num(a[9], -80, 80),
    fl: int(a[10], 0, 1 << 16), hp: num(a[11], 0, 1e6), maxHp: num(a[12], 1, 1e6, 100), ce: num(a[13], 0, 1e5), maxCe: num(a[14], 1, 1e5, 100),
    act: typeof a[15] === 'string' && WORD.test(a[15]) ? a[15] : null, at: num(a[16], 0, 1), st: typeof a[17] === 'string' && WORD.test(a[17]) ? a[17] : null, both: a[18] === 1,
  };
}
export function writePlayer(p, slot, name) {
  let f = 0;
  if (!p.dead && !p.downed) f |= PF.ALIVE;
  if (p.downed) f |= PF.DOWN;
  if (p.dead) f |= PF.DEAD;
  if (!p.grounded && !p.inLiquid && p.dodgeT <= 0) f |= PF.AIR;
  if (p.domainActive) f |= PF.DOMAIN;
  if (p.iframes > 0 || p.dodgeT > 0) f |= PF.IFRAME;
  if (p.game.inputFrozen?.(p)) f |= PF.BUSY;
  if (p.hurtT > 0) f |= PF.HURT;
  if (!p.object.visible) f |= PF.HIDDEN;
  if (p.invulnerable) f |= PF.INVULN;
  const a = p.action, r = (v) => Math.round(v * 100) / 100;
  const out = [slot, name, p.sorcerer, r(p.pos.x), r(p.visY ?? p.pos.y), r(p.pos.z), r(p.facing), r(p.vel.x), r(p.vel.z), r(p.vel.y), f,
    Math.round(Math.max(0, p.hp)), Math.round(p.maxHp), Math.round(p.ce), Math.round(p.maxCe)];
  if (a && typeof a.type === 'string' && WORD.test(a.type)) out.push(a.type, r(Math.min(1, a.t ?? 0)), typeof (a.style ?? a.step?.style) === 'string' ? (a.style ?? a.step.style) : 0, a.both ? 1 : 0);
  return out;
}

// Interpolate the figure at the sender's playback time rt; returns false when it is not in this world.
export function updateFigure(net, p, scr, dt, rt) {
  const g = net.g, buf = p.buf, n = buf.length;
  if (!n) { p.inWorld = false; p.object.visible = false; return false; }
  let s0, s1, k = 0;
  if (rt == null || rt >= buf[n - 1].t) {
    s0 = s1 = buf[n - 1];
    // late: carry on along the last velocity for a moment
    const ahead = rt == null ? 0 : Math.min(0.25, rt - s0.t);
    if (!net.toLocal(s0.f, s0.x + s0.vx * ahead, s0.y, s0.z + s0.vz * ahead, _v)) { p.inWorld = false; p.object.visible = false; return false; }
  } else if (rt <= buf[0].t) {
    s0 = s1 = buf[0];
    if (!net.toLocal(s0.f, s0.x, s0.y, s0.z, _v)) { p.inWorld = false; p.object.visible = false; return false; }
  } else {
    let i = n - 2;
    while (i > 0 && buf[i].t > rt) i--;
    s0 = buf[i]; s1 = buf[i + 1];
    if (s0.f !== s1.f) { s1 = s0; k = 0; } else k = (rt - s0.t) / Math.max(1e-4, s1.t - s0.t);
    if (!net.toLocal(s0.f, s0.x + (s1.x - s0.x) * k, s0.y + (s1.y - s0.y) * k, s0.z + (s1.z - s0.z) * k, _v)) { p.inWorld = false; p.object.visible = false; return false; }
  }
  const s = k > 0.5 ? s1 : s0;
  p.pos.copy(_v);   // (the playback itself is smooth: it runs on the sender's clock)
  p.inWorld = true;
  p.vel.set(s0.vx + (s1.vx - s0.vx) * k, s.vy, s0.vz + (s1.vz - s0.vz) * k);
  p.facing = lerpAngle(s0.fa, s1.fa, k);
  p.hp = s.hp; p.maxHp = s.maxHp; p.ce = s.ce; p.maxCe = s.maxCe;
  p.dead = !!(s.fl & PF.DEAD); p.downed = !!(s.fl & PF.DOWN);
  p.netBusy = !!(s.fl & PF.BUSY);
  p.iframes = s.fl & PF.IFRAME ? 0.2 : 0;
  p.invulnerable = !!(s.fl & PF.INVULN);
  p.grounded = !(s.fl & PF.AIR);
  p.domainActive = !!(s.fl & PF.DOMAIN);
  if (p.dead || p.downed) p.deadT = (p.deadT ?? 0) + dt; else p.deadT = 0;
  // the pose
  const act = s.act ? (p._act ??= {}) : null;
  if (act) { act.type = s.act; act.t = s.at; act.style = s.st; act.both = s.both; act.windup = 0.3; act.strike = 0.5; act.step = 0; }
  p.object.visible = !(s.fl & PF.HIDDEN);
  p.object.position.copy(p.pos);
  p.object.rotation.y = p.facing;
  if (s.fl & PF.HURT) { p.rig.swap(g.flashMaterial ?? FLASH_MATERIAL); p._hurtT = 0.1; }
  else if ((p._hurtT -= dt) <= 0) p.rig.swap(null);
  const speed = Math.min(1, Math.hypot(p.vel.x, p.vel.z) / p.speed);
  try {
    p.rig.animate({ dt, speed: act?.type === 'dodge' ? 0 : speed, vel: p.vel, air: p.grounded || act ? null : p.vel.y,
      action: p.dead ? { type: 'death', t: Math.min(1, p.deadT) } : p.downed ? { type: 'down', t: 1 } : act });
  } catch (e) { net.logError('figure anim', e); }
  // the kit: buffs and channelled effects of the abilities it replayed
  if (dt > 0 && !p.kitBroken) {
    try { p.kit.update(dt, net.blankInput); } catch (e) { p.kitBroken = (p.kitErrs = (p.kitErrs ?? 0) + 1) > 3; net.logError('figure kit', e); }
  }
  return true;
}

// ------------------------------------------------------------------ name tags
export function updateTag(g, p, show) {
  if (!show) { if (p.tag) p.tag.style.display = 'none'; return; }
  if (!p.tag) {
    const layer = document.getElementById('net-tags') ?? (() => { const d = document.createElement('div'); d.id = 'net-tags'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d); return d; })();
    p.tag = document.createElement('div');
    p.tag.className = 'net-tag';
    layer.appendChild(p.tag);
    p.tagKey = '';
  }
  const key = `${p.netName}|${p.color}|${p.downed ? 1 : 0}|${p.dead ? 1 : 0}|${p.netBusy ? 1 : 0}|${Math.round(Math.max(0, p.hp) / p.maxHp * 20)}`;
  if (key !== p.tagKey) {
    p.tagKey = key;
    p.tag.style.setProperty('--pc', p.color);
    p.tag.textContent = '';
    const nm = document.createElement('b'); nm.textContent = p.netName + (p.downed ? ' ✚' : p.dead ? ' ✖' : p.netBusy ? ' ⏸' : '');
    const bar = document.createElement('i'); bar.style.setProperty('--hp', (Math.max(0, p.hp) / p.maxHp * 100).toFixed(0) + '%');
    p.tag.append(nm, bar);
  }
  _v.set(p.pos.x, p.pos.y + 2.55, p.pos.z).project(g.rig.camera);
  if (_v.z > 1 || Math.abs(_v.x) > 1.2 || Math.abs(_v.y) > 1.2) { p.tag.style.display = 'none'; return; }
  p.tag.style.display = '';
  p.tag.style.transform = `translate(${((_v.x * 0.5 + 0.5) * window.innerWidth).toFixed(1)}px, ${((-_v.y * 0.5 + 0.5) * window.innerHeight).toFixed(1)}px) translate(-50%, -100%)`;
}

// ------------------------------------------------------------------ host: curses -> snapshot
// E entry: [id, type, elite, level, x, y, z, rotY, hp, maxHp, flags, act, actT, style, name, look, phase]
export function enemyType(e) {
  if (e.isBoss) return BOSSES[e.id] ? 'B:' + e.id : null;
  if (e.isCursedObject) return 'O:' + (e.o?.look === 'womb' ? 'womb' : 'nest');
  if (e.isDummy || e.isPuppet) return null;
  return CURSES[e.kind] ? e.kind : null;
}
function enemyAct(e) {
  if (e.isBoss) { const a = e.anim ?? (e.intro > 0 ? { type: 'raise', t: 0 } : null); return a && typeof a.type === 'string' ? [a.type, a.t ?? 0, a.style ?? 0] : null; }
  const a = e.action, st = e.state;
  if (st === 'windup' && a) return a.anim === 'none' ? null : a.anim === 'raise' ? ['raise', 0, 0] : a.anim === 'cast' ? ['cast', 1, 0] : ['attack', Math.min(0.28, e.stateT / a.windup * 0.25), a.style];
  if ((st === 'recover' || st === 'active') && a && a.anim !== 'none') return ['attack', 0.3 + Math.min(0.7, e.stateT / (a.recover || 0.35) * 0.7), a.style];
  if (st === 'stagger') return ['hit', Math.min(1, e.stateT / Math.max(0.2, e.stagger)), 0];
  return null;
}
export function writeEnemy(e, id, type) {
  let f = 0;
  if (e.dead) f |= EF.DEAD;
  if (e.flashT > 0) f |= EF.FLASH;
  if (!e.object.visible) f |= EF.HIDDEN;
  if (e.untargetable || e.burrowed) f |= EF.UNTARGET;
  if (e.isCursedObject && e.shielded?.()) f |= EF.SHIELDED;
  const o = e.object.position, r = (v) => Math.round(v * 100) / 100;
  const a = enemyAct(e);
  return [id, type, e.elite ?? 0, e.level ?? 1, r(o.x), r(o.y), r(o.z), r(e.object.rotation.y), Math.round(Math.max(0, e.hp)), Math.round(e.maxHp), f,
    a ? a[0] : 0, a ? r(a[1]) : 0, a && typeof a[2] === 'string' ? a[2] : 0, e.displayName ?? (e._dressed ? e.name : 0), e._look ?? 0, e.phase ?? 0, e._plateText ?? 0];
}
export function readEnemy(a) {
  if (!Array.isArray(a) || a.length < 11) return null;
  const id = int(a[0], 1, 1e9, 0), type = typeof a[1] === 'string' ? a[1] : '';
  if (!id || !validType(type) || ![a[4], a[5], a[6]].every((v) => fin(v))) return null;
  return {
    id, type, elite: ELITES.has(a[2]) ? a[2] : null, level: int(a[3], 1, 20, 1), x: a[4], y: a[5], z: a[6], r: num(a[7], -100, 100),
    hp: num(a[8], -1e7, 1e7), maxHp: num(a[9], 1, 1e7, 100), f: int(a[10], 0, 1 << 16),
    act: typeof a[11] === 'string' && WORD.test(a[11]) ? a[11] : null, at: num(a[12], 0, 1), st: typeof a[13] === 'string' && WORD.test(a[13]) ? a[13] : null,
    name: typeof a[14] === 'string' ? str(a[14], 40) : null, look: typeof a[15] === 'string' && SORC_LOOK.test(a[15]) ? a[15] : null, phase: int(a[16], 0, 2), plate: typeof a[17] === 'string' ? str(a[17], 40) : null,
  };
}
const SORC_LOOK = /^[a-z0-9_]{1,24}$/;
function validType(t) {
  if (t.startsWith('B:')) return !!BOSSES[t.slice(2)];
  if (t === 'O:nest' || t === 'O:womb') return true;
  return Object.hasOwn(CURSES, t);
}

// ------------------------------------------------------------------ guest: a puppet curse
export class Puppet {
  constructor(net, s) {
    const g = this.game = net.g;
    this.net = net; this.netId = s.id; this.type = s.type;
    this.isPuppet = true; this.isEnemy = true;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.buf = [];
    this.dead = false; this.deathT = 0; this.flashT = 0; this.untargetable = false; this.state = 'idle'; this.stateT = 0;
    this.level = s.level; this.elite = s.elite; this.hp = s.hp; this.maxHp = s.maxHp; this.facing = s.r; this.st = {}; this.phase = s.phase;
    this.home = new THREE.Vector3();
    if (s.type.startsWith('B:')) {
      const id = s.type.slice(2), B = BOSSES[id];
      this.isBoss = true; this.id = id; this.B = B;
      this.def = { name: B.name, grade: 'S', knockResist: 0.95 };
      this.displayName = B.hudName ?? B.name;
      this.radius = B.radius ?? 1.1; this.height = B.height ?? 4.2;
      this.rig = B.build();
    } else if (s.type.startsWith('O:')) {
      this.isDummy = true; this.isCursedObject = true; this.kind = 'cursed_object';
      this.radius = 0.9; this.height = 2.4;
      this.def = { name: s.name || 'Cursed Object', grade: '-', radius: 0.9, height: 2.4, rooted: true };
      this.displayName = s.name || 'Cursed Object';
      this.look = buildLook(s.type === 'O:womb' ? 'womb' : 'nest');
      this.rig = { root: this.look.grp, swap: () => {}, animate: () => {} };
      this.objT = Math.random() * 10;
    } else {
      this.kind = s.type; this.def = CURSES[s.type];
      this.radius = this.def.radius; this.height = this.def.height;
      this.rig = buildCurseModel(this.def.model);
      if (s.elite) addEliteShell(this.rig, ELITE_COL[s.elite] ?? 0xffffff, s.elite, this.def.radius);
    }
    this.object = this.rig.root;
    this.apply(s, true);
    this.object.position.copy(this.pos);
    g.scene.add(this.object);
    // a Culling Game player: dressed as the sorcerer the host sees
    if (s.look && !this.isBoss && !this.isCursedObject) { try { dressAsSorcerer(g, this, s.look, { name: s.name ?? undefined, plateText: s.plate ?? s.name ?? undefined, plate: !!(s.plate || s.name) }); } catch (e) { net.logError('dress puppet', e); } }
    else if (s.name && !this.isBoss) this.displayName = s.name;
  }
  get name() { return this.displayName ?? this.def?.name ?? 'Curse'; }
  // latest host state (hp, flags, pose); position goes through the buffer
  apply(s, first = false) {
    this.hp = Math.min(this.hp, s.hp); if (first || s.hp > this.hp + 0.5 || this.pendingT <= 0) this.hp = s.hp;
    this.maxHp = s.maxHp; this.phase = s.phase;
    this.untargetable = !!(s.f & EF.UNTARGET);
    this.hidden = !!(s.f & EF.HIDDEN);
    this.burrowed = this.hidden && !this.isBoss;
    if (s.f & EF.FLASH) this.flashT = 0.1;
    this.shieldedNow = !!(s.f & EF.SHIELDED);
    this.act = s.act; this.actT = s.at; this.actStyle = s.st;
    this.state = s.act === 'attack' ? (s.at < 0.3 ? 'windup' : 'recover') : s.act === 'hit' ? 'stagger' : 'idle';
    if ((s.f & EF.DEAD) && !this.dead) this.kill(first);
    if (first) this.pos.set(s.x, s.y, s.z);
  }
  push(s, t) {
    if (this.buf.length && t <= this.buf[this.buf.length - 1].t) return;
    this.buf.push({ t, f: this.net.hostFrame, x: s.x, y: s.y, z: s.z, r: s.r });
    if (this.buf.length > 30) this.buf.shift();
    this.apply(s);
  }
  shielded() { return this.shieldedNow; }
  // the host says it died
  kill(silent) {
    if (this.dead) return;
    this.dead = true; this.deathT = 0; this.hp = 0;
    const g = this.game;
    if (g.hud?.bossRef === this) g.hud.setBoss(null);
    if (silent) return;
    const c = _w.copy(this.pos); c.y += this.height * 0.5;
    if (this.isCursedObject) { g.fx?.explosion?.(c, 0x9a3aff, 2.2); g.audio?.energy?.('explode'); }
    else if (this.isBoss) { g.shake(1); g.fx.flash(0xffffff, 0.7, 0.4); g.audio?.enemyDie(true); g.audio?.gong?.(); }
    else { g.fx.curseDeath(c, this.height, this.elite ? 0xff8aff : 0x7a3aa8); g.audio?.enemyDie(this.def?.grade <= '2'); }
  }
  // the whole enemy interface that techniques poke at
  takeDamage(amount, src, o = {}) { return this.netHit(amount, src, o); }
  netHit(dmg, src, o = {}) {
    if (this.dead || this.untargetable || !(dmg > 0)) return 0;
    let d = dmg * (1 - (this.def?.armor ?? 0));
    if (this.isCursedObject && this.shieldedNow) d *= 0.25;
    this.net.sendHit(this, dmg, src, o);
    // show it now; the host's next update corrects the health
    this.hp = Math.max(1, this.hp - d); this.pendingT = 0.6;
    this.flashT = 0.1;
    if (src?.isPlayer && !src.isRemote) this.game.audio?.enemyHurt(this.def?.pitch ?? 1);
    return d;
  }
  cancelAttack() {} blink() {} explode() {} die() {} enterPhase() {}
  // stuns and slows go to the host too
  set sealT(v) { if (v > 0 && !this.dead) this.net.sendCC(this, 'stun', v); }
  get sealT() { return 0; }
  set slowT(v) { if (v > 0.3 && !this.dead && (this.game.time - (this._slowAt ?? -9)) > 0.5) { this._slowAt = this.game.time; this.net.sendCC(this, 'slow', v); } }
  get slowT() { return 0; }
  update(dt) {
    const g = this.game;
    this.pendingT = (this.pendingT ?? 0) - dt;
    if (this.dead) {
      this.deathT += dt;
      this.rig.swap?.(null);
      const sc = this.rig.spec?.scale ?? 1;
      if (this.isBoss) {
        if (Math.random() < 0.4) g.fx.explosion(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * this.height, (Math.random() - 0.5) * 3)), this.B.color, 1.5);
        this.object.scale.setScalar(Math.max(0.01, 1 - this.deathT / 1.8) * sc); this.object.rotation.y += dt * 4;
        return this.deathT < 1.8;
      }
      this.object.scale.setScalar(Math.max(0.01, 1 - this.deathT * 2.2) * sc);
      if (!this.isCursedObject) this.rig.animate?.({ dt, speed: 0, vel: this.vel, action: { type: 'death', t: Math.min(1, this.deathT * 2) } });
      return this.deathT < 0.6;
    }
    // playback at the host's clock
    const rt = this.net.hostRenderTime();
    const prev = _w.copy(this.pos);
    if (this.sample(rt)) {
      if (dt > 0) this.vel.subVectors(this.pos, prev).divideScalar(dt);
      this.object.visible = !this.hidden;
    } else this.object.visible = false;
    this.flashT -= dt;
    this.object.position.copy(this.pos);
    this.object.rotation.y = this.facing;
    if (this.isCursedObject) {
      const L = this.look; this.objT += dt;
      const pulse = 1 + Math.sin(this.objT * 3) * 0.05;
      for (const m of L.body) m.scale.setScalar(pulse);
      L.tags.rotation.y += dt * 0.8; L.ring.visible = this.shieldedNow;
      return true;
    }
    this.rig.swap?.(this.flashT > 0 ? FLASH_MATERIAL : null);
    const speed = Math.min(1, Math.hypot(this.vel.x, this.vel.z) / Math.max(1, this.def?.speed ?? this.B?.speed ?? 3));
    const act = this.act ? { type: this.act, t: this.actT, style: this.actStyle, windup: 0.3, strike: 0.5, both: true } : null;
    try {
      this.rig.animate({ dt, speed, vel: this.vel, action: act });
      if (!this.idleBroken) this.rig.idle?.(dt, this);
    } catch (e) { this.idleBroken = true; this.net.logError('puppet anim', e); }
    return true;
  }
  sample(rt) {
    const b = this.buf, n = b.length; if (!n) return false;
    let x, y, z, r, f;
    if (rt == null || rt >= b[n - 1].t) { const s = b[n - 1]; x = s.x; y = s.y; z = s.z; r = s.r; f = s.f; }
    else if (rt <= b[0].t) { const s = b[0]; x = s.x; y = s.y; z = s.z; r = s.r; f = s.f; }
    else {
      let i = n - 2; while (i > 0 && b[i].t > rt) i--;
      const a = b[i], c = b[i + 1];
      if (a.f !== c.f) { x = a.x; y = a.y; z = a.z; r = a.r; f = a.f; }
      else { const k = (rt - a.t) / Math.max(1e-4, c.t - a.t); x = a.x + (c.x - a.x) * k; y = a.y + (c.y - a.y) * k; z = a.z + (c.z - a.z) * k; r = lerpAngle(a.r, c.r, k); f = a.f; }
    }
    if (!this.net.toLocal(f, x, y, z, _v)) return false;
    if (this.pos.distanceToSquared(_v) > 100) this.pos.copy(_v); else this.pos.copy(_v);
    this.facing = r;
    return true;
  }
  dispose() {
    const g = this.game;
    g.scene.remove(this.object);
    if (g.hud?.bossRef === this) g.hud.setBoss(null);
  }
}
void PLAYER_COLORS; void damp; void dampAngle;
