// Base class for a sorcerer's technique kit: an ability LIBRARY, the
// player's LOADOUT (4 equipped active abilities + 3 passive talismans),
// cooldowns and Cursed Energy costs, input routing, timed buffs, and a
// toolkit of helpers that abilities are written with.
//
// ============================================================================
//  HOW TO GIVE A TECHNIQUE ITS 20+ ABILITIES  (pattern for every kit)
// ============================================================================
//  In the kit's constructor, after super(p), fill `this.library` and
//  (optionally) `this.passives`, and DON'T assign `this.slots` yourself:
//
//    import { Kit, ability, passive } from './kit.js';
//    this.branches = ['Blue', 'Red', 'Infinity'];          // tree columns, left→right
//    this.library = {
//      red: ability({ name: 'Reversal: Red', icon: '🔴', kind: 'basic',
//        desc: 'A crimson orb that detonates in a repulsion blast.',
//        cd: 1.6, ce: 0, branch: 'Red', tier: 0, start: true, legacy: 'ranged',
//        use: () => this.red() }),
//      lapse_blue: ability({ name: 'Lapse: Blue', icon: '🔵', kind: 'technique',
//        desc: '...', cd: 7, ce: 12, branch: 'Blue', tier: 1, legacy: 't1',
//        use: () => this.blue() }),
//      blue_max: ability({ ..., tier: 4, req: 'lapse_blue', cost: 2 }),
//    };
//    this.passives = {
//      six_eyes: passive({ name: 'Six Eyes', icon: '👁️', desc: 'Techniques cost 25% less CE.',
//        branch: 'Six Eyes', tier: 2, req: 'teleport', apply: (p, kit) => { kit.ceMul *= 0.75; } }),
//    };
//
//  Ability fields
//    name, icon, desc   display (icon = one emoji)
//    kind               'basic' | 'technique' | 'movement' | 'defence' | 'summon' |
//                       'buff' | 'heal' — only 'basic' (or rmb: true) may go in RMB
//    cd, ce             cooldown (s) and Cursed Energy cost
//    use()              cast it; return false to refund (no cooldown / no CE spent)
//    hold, onRelease, maxCharges/chargesLeft/gateTime   as before (charges, channels)
//    branch, tier       position on the technique tree (tier 0 = root row … 5)
//    req                id (or array of ids) of library abilities / passives / skill
//                       nodes that must be unlocked first (prefix 'ab:', 'pa:', 'up:'
//                       to disambiguate). Default: none.
//    cost               technique points (default from tier: 0/1/1/2/2/3)
//    start              unlocked from the beginning (the first technique)
//    legacy             'ranged'|'t1'|'t2'|'t3' — the slot this ability used to sit in
//                       before loadouts; old saves' unlock_t1..t3 unlock it and
//                       it is equipped there by default.
//  Passive fields: name, icon, desc, branch, tier, req, cost, apply(player, kit)
//    — apply() runs when the kit is built if the passive is equipped in a
//    talisman slot. Check `this.talisman(id)` anywhere for conditional effects.
//
//  Kits that never define a library (the techniques not yet extended) keep
//  working: their `this.slots = { ranged, t1, t2, t3 }` becomes a 4-ability
//  library unlocked by the old unlock_t1..t3 nodes.
//
//  `this.slots.ranged/t1/t2/t3` always exist after construction: they are
//  the EQUIPPED abilities (or an 'Empty' placeholder), so HUD / Mahoraga /
//  other code that reads them keeps working. createKit() calls initLoadout().
//
//  Helpers (see the toolkit section below): after, during, foes, target,
//  line, hit, blast, stun, slow, dash, blink, closeIn, pose, shoot, aimGround,
//  buff, statBuff, zone, groundAt, fwd, aimAngle, blackFlashStrike, rctHeal.
//  Hooks a kit may define: tick(dt, inp), onCast(ability), onHitEnemy(e, dealt, o),
//  onKill(e), incoming(amount, src, o) (damage taken; return the new amount). Use them — they keep abilities short and
//  their effects tidy across pauses, level changes and kit rebuilds.
// ============================================================================
import * as THREE from 'three/webgpu';
import { BASE_COMBO } from '../combat.js';

export const SLOT_KEYS = ['ranged', 't1', 't2', 't3'];
export const TALISMAN_SLOTS = 3;
export const ABILITY_KINDS = {
  basic: { label: 'Basic', color: '#9ad8ff' },
  technique: { label: 'Technique', color: '#c070ff' },
  movement: { label: 'Movement', color: '#7aff9a' },
  defence: { label: 'Defence', color: '#ffd84a' },
  summon: { label: 'Summon', color: '#8a8aff' },
  buff: { label: 'Buff', color: '#ff9a4a' },
  heal: { label: 'Heal', color: '#6affc8' },
};
const TIER_COST = [0, 1, 1, 2, 2, 3];

export function ability(o) { return { cdLeft: 0, charges: 1, kind: 'technique', tier: 1, ...o }; }
export function passive(o) { return { tier: 2, cost: 1, ...o, isPassive: true }; }
export function abilityCost(ab) { return ab.cost ?? (ab.start ? 0 : TIER_COST[Math.min(5, ab.tier ?? 1)] ?? 1); }
export function rmbOk(ab) { return !!ab && !ab.empty && (ab.rmb === true || ab.kind === 'basic'); }

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

export class Kit {
  constructor(player) {
    this.p = player; this.game = player.game;
    this.combo = BASE_COMBO;
    this.slots = {
      ranged: this.ability({ name: 'Cursed Blast', icon: '✦', kind: 'basic', cd: 0.55, ce: 0, use: () => this.cursedBlast() }),
    };
    this.library = null;    // id -> ability (see header)
    this.passives = null;   // id -> passive talisman
    this.domain = null;
    this.ultimate = null;   // { name, icon, use } — F for sorcerers without a canon domain
    this.skills = {};
    this.buffs = new Map();
    this.ceMul = 1;         // CE cost multiplier (passives)
    this.cdMul = 1;         // cooldown multiplier (passives)
  }
  ability(o) { return ability(o); }
  dispose() {
    this.disposed = true;
    for (const o of this.owned ?? []) this.game.scene.remove(o);
    for (const b of this.buffs.values()) b.onEnd?.(true);
    this.buffs.clear();
  }
  own(o) { (this.owned || (this.owned = [])).push(o); this.game.scene.add(o); return o; }
  rank(id) { return this.p.skills?.[id] ?? 0; }
  get cdr() { return (1 - (this.p.stats.cdr ?? 0)) * this.cdMul; }

  // ---------------------------------------------------------------- library / loadout
  // Called once by createKit() after the subclass constructor.
  initLoadout() {
    if (!this.library || !Object.keys(this.library).length) {
      // a kit without a library: its four fixed slots become the library
      const lib = {};
      for (const k of SLOT_KEYS) {
        const s = this.slots[k]; if (!s) continue;
        lib[k] = Object.assign(s, { kind: k === 'ranged' ? 'basic' : s.kind, tier: k === 'ranged' ? 0 : +k[1], branch: 'Techniques', start: k === 'ranged', legacy: k, key: k === 'ranged' ? null : 'unlock_' + k, req: k === 't1' || k === 'ranged' ? null : 't' + (+k[1] - 1) });
        if (k === 'ranged') lib[k].rmb = true;
      }
      this.library = lib;
      this.legacyKit = true;
    }
    for (const id in this.library) { const a = this.library[id]; a.id = id; a.key ??= 'ab_' + id; a.cdLeft ??= 0; }
    this.passives = { ...(this.passives ?? {}) };
    for (const id in this.passives) { const a = this.passives[id]; a.id = id; a.key ??= 'pa_' + id; }
    for (const [id, gp] of Object.entries(GENERIC_PASSIVES)) if (!this.passives[id]) this.passives[id] = { ...gp, id, key: 'pa_' + id, generic: true };
    // the saved loadout (per technique), migrated from the old fixed slots
    const S = this.game.save?.sorc?.(this.p.sorcerer);
    let L = S?.loadout ?? this.p._loadout;
    if (!L || typeof L !== 'object') L = this.defaultLoadout();
    L.talismans = Array.isArray(L.talismans) ? L.talismans.slice(0, TALISMAN_SLOTS) : [];
    while (L.talismans.length < TALISMAN_SLOTS) L.talismans.push(null);
    for (const k of SLOT_KEYS) {
      if (L[k] && !this.library[L[k]]) L[k] = null;
      if (k === 'ranged' && L[k] && !rmbOk(this.library[L[k]])) L[k] = null;
    }
    if (!L.ranged) L.ranged = this.defaultLoadout().ranged;
    // no ability twice
    const seen = new Set();
    for (const k of SLOT_KEYS) { if (L[k] && seen.has(L[k])) L[k] = null; if (L[k]) seen.add(L[k]); }
    L.talismans = L.talismans.map((id) => (id && this.passives[id] ? id : null));
    if (S) S.loadout = L; else this.p._loadout = L;
    this.loadout = L;
    this.slots = {};
    for (const k of SLOT_KEYS) this.slots[k] = (L[k] && this.library[L[k]]) || emptySlot(k);
    for (const id of L.talismans) if (id && this.hasPassive(id)) this.passives[id].apply?.(this.p, this);
    this.p.hp = Math.min(this.p.hp, this.p.maxHp);
  }
  defaultLoadout() {
    const lib = this.library, L = { ranged: null, t1: null, t2: null, t3: null, talismans: [null, null, null] };
    for (const id in lib) if (lib[id].legacy && SLOT_KEYS.includes(lib[id].legacy) && !L[lib[id].legacy]) L[lib[id].legacy] = id;
    if (!L.ranged) L.ranged = Object.keys(lib).find((id) => lib[id].start && rmbOk(lib[id])) ?? Object.keys(lib).find((id) => rmbOk(lib[id])) ?? null;
    return L;
  }
  // unlocked on the technique tree (or from the start)
  has(id) {
    const a = this.library?.[id]; if (!a) return false;
    if (a.start || this.rank(a.key) > 0) return true;
    return !!(a.legacy && a.legacy !== 'ranged' && this.rank('unlock_' + a.legacy) > 0);
  }
  hasPassive(id) { const a = this.passives?.[id]; return !!a && this.rank(a.key) > 0; }
  talisman(id) { return !!this.loadout?.talismans?.includes(id) && this.hasPassive(id); }
  // an equipped slot that can't be used: empty, or not unlocked yet
  locked(k) { const s = this.slots[k]; return !s || !!s.empty || (s.id != null && !this.has(s.id)); }
  get domainLocked() { return !this.rank('unlock_domain'); }

  update(dt, inp) {
    for (const k in this.slots) {
      const s = this.slots[k];
      if (s.maxCharges) {
        // charge-based ability: recharges one charge at a time
        if (s.chargesLeft < s.maxCharges) { s.recharge = (s.recharge ?? 0) + dt; if (s.recharge >= s.cd * this.cdr) { s.recharge = 0; s.chargesLeft++; } }
        s.gate = Math.max(0, (s.gate ?? 0) - dt);
        s.cdLeft = s.chargesLeft > 0 ? s.gate : s.cd * this.cdr - (s.recharge ?? 0);
      } else s.cdLeft = Math.max(0, s.cdLeft - dt);
      if (this.locked(k)) { if (inp.pressed[k]) this.lockedPing(k); continue; }
      const pressed = s.hold ? inp.held[k] : inp.pressed[k];
      const ce = (s.ce ?? 0) * this.ceMul;
      if (pressed && s.cdLeft <= 0 && this.p.ce >= ce && this.canCast(s)) {
        if (s.use() !== false) {
          if (s.maxCharges) { s.chargesLeft--; s.gate = s.gateTime ?? 0.3; } else s.cdLeft = s.cd * this.cdr;
          this.p.ce -= ce;
          this.onCast?.(s);
        }
      }
      if (s.onRelease && inp.released[k]) s.onRelease();
    }
    // F: a Domain Expansion, or for sorcerers without a canon domain, an
    // ultimate attack. Both need a full Cursed Energy bar.
    if (inp.pressed.domain && (this.domain || this.ultimate)) {
      if (this.domainLocked) this.lockedPing('domain');
      else if (this.p.ce >= this.p.maxCe && this.canCast(this.domain ?? this.ultimate)) {
        // another caster's domain can be answered with your own (domain clash: the stronger one wins)
        if (this.domain && this.game.domain?.caster !== this.p) { if (this.game.startDomain(this.p, this.domain) !== false) this.p.ce = 0; }
        else if (this.ultimate && this.ultimate.use() !== false) this.p.ce = 0;
      }
    }
    // timed buffs
    for (const [id, b] of this.buffs) {
      b.left -= dt;
      b.onTick?.(dt, b);
      if (b.left <= 0) { this.buffs.delete(id); b.onEnd?.(false); }
    }
    this.tick?.(dt, inp);
  }
  lockedPing(k) {
    const g = this.game;
    if ((g.time - (this.pingT ?? -9)) < 1.2) return;
    this.pingT = g.time;
    const s = this.slots[k];
    if (k !== 'domain' && s?.empty) g.toast?.('No ability in this slot — equip one in the Loadout (pause menu or Yaga\'s shrine)');
    else g.toast?.(`🔒 ${k === 'domain' ? (this.domain ? 'Domain Expansion' : this.ultimate?.name ?? 'Ultimate') : s?.name ?? 'Technique'} is locked — unlock it on the technique tree (Shrine steps)`);
    g.audio?.ui('back');
  }
  canCast() { const a = this.p.action; return this.p.dodgeT <= 0 && !(a && a.type === 'cast' && a.lock); }
  cast(dur = 0.35, both = false, extra = {}) { this.p.action = { type: 'cast', dur, elapsed: 0, t: 0, both, moveScale: 0.35, ...extra }; this.p.facing = Math.atan2(this.p.aimDir.x, this.p.aimDir.z); }
  handPos(out = new THREE.Vector3()) {
    const p = this.p; return out.set(p.pos.x + Math.sin(p.facing) * 0.6, p.pos.y + 1.35, p.pos.z + Math.cos(p.facing) * 0.6);
  }
  aimTarget() { return this.p.autoTarget || this.game.nearestEnemy(this.p.aimPoint, 3.5); }
  // damage-taken hook (player.takeDamage). Buffs with incoming(amount, src)
  // can reduce it; returning 0 cancels the hit. Subclasses call super.
  onIncoming(amount, src, o) {
    for (const b of this.buffs.values()) if (b.incoming) { amount = b.incoming(amount, src, o); if (amount <= 0) return 0; }
    if (this.incoming) { amount = this.incoming(amount, src, o); if (amount <= 0) return 0; }
    return amount;
  }
  cursedBlast() {
    const g = this.game, p = this.p;
    this.cast(0.3);
    const from = this.handPos();
    const dir = p.aimDir.clone(); const col = p.rig.look?.accent ?? 0x6ad8ff;
    g.projectiles.fire({ pos: from, vel: dir.multiplyScalar(22), team: 'player', dmg: 9, shape: 'orb', color: col, life: 0.9, light: 3, scale: 0.8,
      trail: (pr) => g.particles.burst(pr.pos, { count: 1, color: col, speed: 0.3, life: 0.25, size: 0.25, sizeEnd: 0.1 }),
      onHit: (e, pr) => { g.combat.damageEnemy(e, 9, p, { knock: pr.vel.clone().setLength(3), stagger: 0.2 }); g.fx.hitSpark(pr.pos, null, { color: col }); } });
    g.audio?.whoosh(0.7);
  }

  // ================================================================ toolkit
  // Run fn after `sec` seconds of game time (pauses with the game, dropped
  // when the level changes or the kit is rebuilt).
  after(sec, fn) {
    let t = 0;
    this.game.addUpdater((dt) => { if (this.disposed) return false; t += dt; if (t < sec) return true; fn(); return false; });
  }
  // Call fn(t, dt, k) every frame for `dur` seconds (k = 0..1). Return false to stop early.
  during(dur, fn, onEnd) {
    let t = 0;
    this.game.addUpdater((dt) => {
      if (this.disposed) { onEnd?.(); return false; }
      t += dt;
      if (fn(t, dt, Math.min(1, t / dur)) === false || t >= dur) { onEnd?.(); return false; }
      return true;
    });
  }
  aimAngle() { return Math.atan2(this.p.aimDir.x, this.p.aimDir.z); }
  fwd(out = new THREE.Vector3()) { return out.set(this.p.aimDir.x, 0, this.p.aimDir.z).normalize(); }
  groundAt(x, z, yHint = this.p.pos.y) { const gy = this.game.world.groundBelow(x, z, yHint + 3); return isFinite(gy) ? gy : yHint; }
  // aim point clamped to `range`, snapped to the ground (or the domain's sure-hit target)
  aimGround(range = 10) {
    const p = this.p, g = this.game;
    const sure = g.domainSys?.sureHit(p) ? g.nearestEnemy(p.pos, 30) : null;
    const d = sure ? sure.pos.clone() : p.aimPoint.clone();
    v1.subVectors(d, p.pos).setY(0); if (v1.length() > range) d.copy(p.pos).addScaledVector(v1.normalize(), range);
    d.y = this.groundAt(d.x, d.z, p.pos.y);
    return d;
  }
  // living enemies within R of c (optionally only in a cone around dir)
  foes(c, R, dir = null, arc = Math.PI) { return this.game.combat.query(c, dir ?? v2.set(0, 0, 1), R, dir ? arc : Math.PI); }
  // the curse you are aiming at: in front first, then the nearest
  target(range = 12, cone = 0.35) {
    const g = this.game, p = this.p;
    if (g.domainSys?.sureHit(p)) { const t = g.nearestEnemy(p.pos, 30); if (t) return t; }
    if (p.autoTarget && !p.autoTarget.dead && p.autoTarget.pos.distanceTo(p.pos) < range) return p.autoTarget;
    let best = null, bd = range;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable) continue;
      v1.subVectors(e.pos, p.pos).setY(0); const d = v1.length();
      if (d < bd && v1.normalize().dot(p.aimDir) > cone) { bd = d; best = e; }
    }
    return best ?? g.nearestEnemy(p.pos, range * 0.6);
  }
  // capsule from `from` along `dir` (length L, half-width W): fn(e, along) per enemy hit
  line(from, dir, L, W, fn) {
    let n = 0;
    for (const e of this.game.enemies) {
      if (e.dead || e.untargetable) continue;
      v1.subVectors(e.pos, from); const along = v1.x * dir.x + v1.z * dir.z;
      if (along < -0.5 || along > L) continue;
      const lat = Math.abs(v1.x * dir.z - v1.z * dir.x);
      if (lat > W + (e.radius ?? 0.4) || Math.abs(v1.y) > 3.5) continue;
      fn(e, along); n++;
    }
    return n;
  }
  hit(e, dmg, o = {}) { return this.game.combat.damageEnemy(e, dmg, this.p, o); }
  // circle damage + a readable explosion / shockwave
  blast(c, R, dmg, o = {}) {
    const g = this.game;
    const n = g.combat.aoe(c, R, dmg, this.p, { knock: 8, stagger: 0.5, ...o });
    const col = o.color ?? this.p.rig.look?.accent ?? 0xffffff;
    if (o.fx !== false) {
      if (o.explode !== false) g.fx.explosion(c, col, R * 0.8);
      g.fx.shockwave(c, col, R + 0.5);
      g.shake(Math.min(0.8, 0.15 + R * 0.06));
      if (o.sound !== false) g.audio?.impact(1 + Math.min(1, R / 6));
    }
    return n;
  }
  stun(e, t) {
    if (e.dead) return;
    if (e.isBoss) { e.cancelAttack?.(); e.stagger = Math.max(e.stagger ?? 0, Math.min(0.8, t * 0.3)); return; }
    e.sealT = Math.max(e.sealT ?? 0, t); e.cancelAttack?.();
  }
  slow(e, t) { if (!e.dead) e.slowT = Math.max(e.slowT ?? 0, t); }
  // dash: move along dir for dist over dur (collides with the world);
  // opts: { iframes, hitR, dmg, hitOpts, onHit(e), color, onEnd, style }
  dash(dir, dist, dur, o = {}) {
    const p = this.p, g = this.game;
    const d = dir.clone().setY(0).normalize();
    p.facing = Math.atan2(d.x, d.z);
    p.action = { type: 'cast', dur, elapsed: 0, t: 0, both: true, moveScale: 0, lock: true, hold: true, cancelable: false, faceAim: false, root: d.clone().multiplyScalar(dist / dur) };
    p.iframes = Math.max(p.iframes, o.iframes ?? dur + 0.1);
    const hitSet = new Set();
    const col = o.color ?? p.rig.look?.accent ?? 0xffffff;
    this.during(dur, () => {
      if (p.action?.root) p.action.root.copy(d).multiplyScalar(dist / dur);
      g.particles.burst(v1.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 2, color: col, speed: 1, life: 0.3, size: 0.3, sizeEnd: 0.05 });
      if (o.hitR) for (const e of this.foes(p.pos, o.hitR)) {
        if (hitSet.has(e)) continue; hitSet.add(e);
        if (o.dmg) this.hit(e, o.dmg, { stagger: 0.4, knock: v2.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(6), ...(o.hitOpts ?? {}) });
        o.onHit?.(e);
      }
    }, () => { if (p.action?.root) p.action = null; o.onEnd?.(hitSet); });
    g.fx.dodgeTrail?.(p);
    return hitSet;
  }
  // teleport to `to` if there's room; returns false (and plays a refusal) otherwise
  blink(to, o = {}) {
    const p = this.p, g = this.game, w = g.world;
    const gy = w.groundBelow(to.x, to.z, Math.max(p.pos.y, to.y) + 3);
    if (!isFinite(gy) || Math.abs(gy - p.pos.y) > (o.maxRise ?? 5) || w.solidAt(to.x, gy + 0.5, to.z) || w.solidAt(to.x, gy + 1.5, to.z)) { if (!o.quiet) g.audio?.ui('back'); return false; }
    const col = o.color ?? p.rig.look?.accent ?? 0xffffff;
    g.fx.blinkPuff?.(p.pos, col);
    p.pos.set(to.x, gy, to.z); p.visY = gy; p.vel.set(0, 0, 0);
    g.fx.blinkPuff?.(p.pos, col);
    p.iframes = Math.max(p.iframes, o.iframes ?? 0.3);
    return true;
  }
  shoot(o) {
    const p = this.p;
    return this.game.projectiles.fire({ pos: this.handPos(), vel: p.aimDir.clone().multiplyScalar(o.speed ?? 24), team: 'player', shape: 'orb', life: 1, ...o });
  }
  // timed self-buff (ticks in update; onEnd(disposing) runs when it expires or the kit is rebuilt)
  buff(id, dur, o = {}) {
    const old = this.buffs.get(id);
    if (old) { old.left = Math.max(old.left, dur); return old; }
    const b = { id, left: dur, dur, ...o };
    this.buffs.set(id, b);
    b.onStart?.(b);
    return b;
  }
  // stat buff: adds `mods` to player.stats for `dur` seconds, then removes them
  statBuff(id, dur, mods, o = {}) {
    const st = this.p.stats;
    return this.buff(id, dur, { ...o,
      onStart: (b) => { for (const k in mods) st[k] = (st[k] ?? 0) + mods[k]; o.onStart?.(b); },
      onEnd: (disposing) => { if (!disposing) for (const k in mods) st[k] -= mods[k]; o.onEnd?.(disposing); } });
  }
  // blink beside a curse (keeps your side of it); returns false if no room
  closeIn(t, color) {
    const p = this.p;
    v1.subVectors(p.pos, t.pos).setY(0); if (v1.lengthSq() < 0.01) v1.set(0, 0, -1);
    const ok = this.blink(v2.copy(t.pos).add(v1.setLength((t.radius ?? 0.5) + 1)), { color, quiet: true });
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    return ok;
  }
  // play a melee swing pose for `dur` seconds (no hit logic)
  pose(style = 'punch', dur = 0.3) { this.p.action = { type: 'attack', step: { style, strike: 0.5, windup: 0.3 }, style, dur, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0 }; }
  // close in and land a guaranteed Black Flash (shared by every physical kit)
  blackFlashStrike(dmg = 42, range = 7) {
    const g = this.game, p = this.p, t = this.target(range);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.closeIn(t, 0xff2020);
    this.pose('punch', 0.35);
    this.after(0.08, () => {
      if (t.dead) return;
      this.hit(t, dmg, { melee: true, blackFlash: true, unblockable: true, crit: false, stagger: 1, knock: v1.subVectors(t.pos, p.pos).setY(0).normalize().multiplyScalar(12) });
      g.combat.blackFlashFx(p, t);
      g.fx.hitSpark(t.pos.clone().setY(t.pos.y + t.height * 0.6), null, { color: 0xff2020, big: true });
      g.hitStop(0.1); g.shake(0.6); g.audio?.impact(1.8, 'crit');
      p.gainCE(15);
      this.onBlackFlash?.(t);
    });
  }
  // Reverse Cursed Technique as an ability: heal `frac` of max health over `dur`
  rctHeal(frac = 0.3, dur = 1.5, color = 0x9affd8) {
    const g = this.game, p = this.p;
    if (p.hp >= p.maxHp) { g.toast?.('Already at full health'); g.audio?.ui('back'); return false; }
    p.healOverTime = { left: p.maxHp * frac, t: dur };
    g.fx.heal(p.pos, color); g.audio?.energy('heal');
    g.fx.rings.spawn(v1.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color, r0: 0.3, r1: 3, dur: 0.5, thick: 0.15 });
    this.cast(0.5, true);
  }
  // lingering ground zone: fn(foesInside, dt) every `every` seconds for `dur`
  zone(c, R, dur, every, fn, o = {}) {
    const g = this.game, col = o.color ?? 0xffffff;
    let tick = 0;
    g.fx.rings.spawn(v1.set(c.x, c.y + 0.06, c.z), { color: col, r0: 0.3, r1: R, dur: 0.35, thick: 0.15 });
    this.during(dur, (t, dt) => {
      tick -= dt;
      if (Math.random() < (o.particles ?? 0.6)) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
        g.particles.glow.emit(c.x + Math.cos(a) * r, c.y + 0.1, c.z + Math.sin(a) * r, 0, 1 + Math.random(), 0, 0.6, ...new THREE.Color(col).toArray(), 0.18, 0, 1, 0.05, 0);
      }
      if (tick <= 0) {
        tick = every;
        if (o.ring !== false) g.fx.rings.spawn(v1.set(c.x, c.y + 0.06, c.z), { color: col, r0: R * 0.95, r1: R, dur: every, thick: 0.08 });
        fn(this.foes(c, R), every);
      }
    }, o.onEnd);
  }
}

function emptySlot(k) { return { name: 'Empty', icon: '＋', empty: true, kind: k === 'ranged' ? 'basic' : 'technique', cd: 1, ce: 0, cdLeft: 0, use: () => false }; }

// Talismans every technique can equip (the technique's own come first on its tree).
export const GENERIC_PASSIVES = {
  iron_body: passive({ name: 'Reinforced Body', icon: '🛡️', desc: '+20 max health.', branch: 'Core', tier: 1, apply: (p) => { p.maxHp += 20; p.hp += 20; } }),
  keen_eye: passive({ name: 'Keen Eye', icon: '🎯', desc: '+6% critical hit chance.', branch: 'Core', tier: 1, apply: (p) => { p.stats.crit += 0.06; } }),
  overflow: passive({ name: 'Overflowing Energy', icon: '💧', desc: '+25% Cursed Energy gained.', branch: 'Core', tier: 2, req: 'pa:keen_eye', apply: (p) => { p.stats.ceGain += 0.25; } }),
  swift: passive({ name: 'Swift Feet', icon: '👟', desc: '+10% movement speed.', branch: 'Core', tier: 2, req: 'pa:iron_body', apply: (p) => { p.stats.speed += 0.1; } }),
  focus: passive({ name: 'Focused Mind', icon: '🧘', desc: 'Technique cooldowns -10%.', branch: 'Core', tier: 3, req: 'pa:overflow', apply: (p, k) => { k.cdMul *= 0.9; } }),
  brute: passive({ name: 'Brute Force', icon: '💪', desc: '+12% melee damage.', branch: 'Core', tier: 3, req: 'pa:swift', apply: (p) => { p.stats.meleeMult += 0.12; } }),
  technician: passive({ name: 'Technician', icon: '📜', desc: '+12% technique damage.', branch: 'Core', tier: 4, req: 'pa:focus', apply: (p) => { p.stats.techMult += 0.12; } }),
  leech: passive({ name: 'Soul Leech', icon: '🩸', desc: 'Heal for 3% of the damage you deal.', branch: 'Core', tier: 4, req: 'pa:brute', apply: (p) => { p.stats.lifesteal += 0.03; } }),
};
