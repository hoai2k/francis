// A friend who walks with you: follows in exploration, fights with their own spells,
// steps out of telegraphed attacks, heals or shields you, and takes simple orders
// from the command wheel (follow, attack my target, hold here, special).
import * as THREE from 'three';
import { G } from './state.js';
import { makeWizard } from './models.js';
import { SPELL_BY_ID } from './spelldata.js';
import { FRIENDS, friendLevel } from './friends.js';
import { damp, dampAngle, rand, clamp } from './util.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
// what each friend's special does
const SPECIALS = {
  pip: { name: 'Mending charm', desc: 'heals you', cd: 18 },
  oren: { name: 'Frost nova', desc: 'chills every nearby foe', cd: 16 },
  tamsin: { name: 'Blasting curse', desc: 'a big explosion on your target', cd: 14 },
  kofi: { name: 'Giggle bomb', desc: 'nearby foes collapse laughing', cd: 18 },
  isolde: { name: 'Severing volley', desc: 'three piercing blades', cd: 14 },
  ruairi: { name: 'Banishing wave', desc: 'blasts nearby foes away from you', cd: 14 },
  mei: { name: 'Duellist’s flurry', desc: 'five rapid Stupefies', cd: 14 },
  bram: { name: 'Shield charm', desc: 'shields you for a few seconds', cd: 20 },
  cassius: { name: 'Hoist', desc: 'hoists your target into the air', cd: 16 },
};
export { SPECIALS };

export class Companion {
  constructor(id) {
    const F = FRIENDS[id];
    this.id = id;
    this.F = F;
    this.name = F.short;
    this.team = 'player';
    this.ally = true;
    this.radius = 0.38;
    this.height = 1.7;
    this.maxHp = 120 + friendLevel(id) * 20;
    this.hp = this.maxHp;
    this.alive = true;
    this.downT = 0;
    this.pos = G.player.pos.clone().add(new THREE.Vector3(1.5, 0, 1.5));
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.order = 'follow';
    this.holdAt = null;
    this.castCd = 1.5;
    this.specialCd = 4;
    this.target = null;
    this.status = {};
    this.model = makeWizard({ ...F.look, scarf: true });
    this.root = new THREE.Group();
    this.root.add(this.model.root);
    this.anim = this.model.anim;
    G.scene.add(this.root);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(F.color).multiplyScalar(1.5), transparent: true, opacity: 0.5, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.root.add(this.ring);
    this.placeNear();
    G.enemies.allies = [this];
  }
  placeNear() {
    const p = G.player;
    const back = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    this.pos.copy(p.pos).addScaledVector(back, 1.8).add(new THREE.Vector3(Math.cos(p.yaw) * 1.2, 0, -Math.sin(p.yaw) * 1.2));
    this.pos.y = G.zone.colliders.ground(this.pos.x, this.pos.z, p.pos.y + 1).y;
    this.root.position.copy(this.pos);
  }
  remove() {
    G.scene.remove(this.root);
    G.enemies.allies = G.enemies.allies.filter((a) => a !== this);
  }
  heal(n) { if (this.alive) this.hp = Math.min(this.maxHp, this.hp + n); }
  damage(amount) {
    if (!this.alive) return false;
    this.hp -= amount * 0.7;
    this.anim.trigger('hit');
    if (this.hp <= 0) {
      this.alive = false;
      this.downT = 8;
      this.anim.set('down');
      G.ui.toast(`${this.name} is down! They’ll be back on their feet in a moment.`, 'info');
    }
    return true;
  }
  command(c) {
    this.order = c;
    if (c === 'hold') this.holdAt = this.pos.clone();
    if (c === 'attack') this.target = G.cam.lockTarget || G.spells.aimPoint(G.player.wandPos()).target || this.nearestEnemy(30);
    if (c === 'special') { this.special(); this.order = 'follow'; }
    G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.2), { follow: 'Right behind you!', attack: this.target ? 'On it!' : 'At what?', hold: 'Holding here.', special: '' }[c] || '', 'combo');
  }
  nearestEnemy(r = 22) {
    let best = null, bd = r;
    for (const e of G.enemies.list) {
      if (!e.alive || e.hidden || e.ally) continue;
      const d = e.pos.distanceTo(this.pos);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  // ------------------------------------------------------------ per-frame
  update(dt) {
    const p = G.player;
    const col = G.zone.colliders;
    if (!this.alive) {
      this.downT -= dt;
      if (this.downT <= 0) { this.alive = true; this.hp = this.maxHp * 0.5; this.anim.set('idle'); G.fx.burst(this.pos.clone().setY(this.pos.y + 1), 0x80ff9a, 30, 3); }
      this.anim.update(dt, 0);
      return;
    }
    if (this.hp < this.maxHp && Math.random() < dt) this.hp = Math.min(this.maxHp, this.hp + 4);
    this.castCd -= dt;
    this.specialCd -= dt;
    // too far behind (another floor, a cutscene teleport): catch up
    if (this.pos.distanceTo(p.pos) > 30 || Math.abs(this.pos.y - p.pos.y) > 6) this.placeNear();
    // pick a target
    if (!this.target || !this.target.alive) this.target = this.order === 'attack' ? null : this.nearestEnemy();
    const tgt = this.target;
    let goal;
    if (this.order === 'hold' && this.holdAt) goal = this.holdAt;
    else if (tgt && this.order !== 'follow-only') {
      // keep a duelling distance from the target, on the player's side
      const to = _v.subVectors(tgt.pos, this.pos).setY(0);
      const d = to.length();
      goal = d > 11 ? tgt.pos.clone() : d < 6 ? this.pos.clone().addScaledVector(to.normalize(), -3) : this.pos.clone().add(new THREE.Vector3(-to.z, 0, to.x).normalize().multiplyScalar(Math.sin(G.time * 0.7 + this.id.length) * 2));
      if (goal.distanceTo(p.pos) > 14) goal.lerp(p.pos, 0.5);
    } else {
      const back = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      goal = p.pos.clone().addScaledVector(back, 2).add(new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw)).multiplyScalar(1.4));
    }
    // step out of telegraphed attacks
    for (const t of G.enemies.telegraphs) {
      if (t.opts.line || t.fired) continue;
      const d = Math.hypot(this.pos.x - t.pos.x, this.pos.z - t.pos.z);
      if (d < t.r + 0.6) { goal = t.pos.clone().add(_w.subVectors(this.pos, t.pos).setY(0).normalize().multiplyScalar(t.r + 2)); break; }
    }
    const to = _v.subVectors(goal, this.pos).setY(0);
    const dist = to.length();
    const speed = dist > 6 ? 7.5 : dist > 1.2 ? 4.8 : 0;
    const want = dist > 0.01 ? to.multiplyScalar(speed / dist) : to.set(0, 0, 0);
    this.vel.x = damp(this.vel.x, want.x, 8, dt);
    this.vel.z = damp(this.vel.z, want.z, 8, dt);
    this.vel.y -= 19 * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    col.resolve(this.pos, this.radius, this.height);
    this.pos.y += this.vel.y * dt;
    const g = col.ground(this.pos.x, this.pos.z, this.pos.y + 0.6);
    if (this.pos.y <= g.y + 0.05) { this.pos.y = g.y; this.vel.y = 0; }
    // never let the companion walk into deep water or fall forever
    if (this.pos.y < (G.zone.killY ?? -30)) this.placeNear();
    // face the target when fighting, otherwise the way we walk
    const flat = Math.hypot(this.vel.x, this.vel.z);
    if (tgt && tgt.pos.distanceTo(this.pos) < 22) this.yaw = dampAngle(this.yaw, Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z), 10, dt);
    else if (flat > 0.4) this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 10, dt);
    // fight
    if (tgt && tgt.alive && G.mode === 'play' && this.castCd <= 0 && tgt.pos.distanceTo(this.pos) < 24) this.cast(tgt);
    // support: heal / shield the player when hurt
    if (this.specialCd <= 0 && (this.id === 'pip' || this.id === 'bram') && p.hp < p.maxHp * 0.45) this.special();
    else if (this.specialCd <= 0 && tgt && Math.random() < dt * 0.15 && this.id !== 'pip' && this.id !== 'bram') this.special();
    this.anim.set(this.aimT > 0 ? 'aim' : 'idle');
    this.aimT = Math.max(0, (this.aimT || 0) - dt);
    this.anim.update(dt, flat);
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
    this.ring.material.opacity = 0.35 + Math.sin(G.time * 3) * 0.1;
  }
  wandPos() { this.root.updateMatrixWorld(true); return this.model.wandTip ? this.model.wandTip.getWorldPosition(new THREE.Vector3()) : this.pos.clone().setY(this.pos.y + 1.3); }
  cast(tgt) {
    const id = this.F.spells.find((s) => s !== 'episkey') || 'stupefy';
    const pickId = Math.random() < 0.6 ? id : this.F.spells[this.F.spells.length - 1];
    const sp = SPELL_BY_ID[pickId === 'episkey' ? 'stupefy' : pickId] || SPELL_BY_ID.stupefy;
    this.castCd = rand(1.3, 2.1);
    this.aimT = 0.6;
    this.anim.trigger('cast');
    const from = this.wandPos();
    const aimAt = tgt.pos.clone().setY(tgt.pos.y + tgt.height * 0.55);
    if (sp.kind !== 'bolt') { // cone spells: a gentle push at the target
      tgt.takeHit({ dmg: 8, spell: sp.id, dir: _v.subVectors(tgt.pos, this.pos).setY(0).normalize().clone() });
      G.fx.emit({ pos: from, color: sp.color, count: 20, speed: 6, size: 0.25, life: 0.5, intensity: 2.5, vel: _v.subVectors(aimAt, from).normalize().multiplyScalar(8) });
      return;
    }
    const def = { ...sp, dmg: sp.dmg * 0.6 * (1 + friendLevel(this.id) * 0.1), companion: true };
    G.spells.spawnProjectile(def, from, aimAt.sub(from).normalize(), 'player', this, tgt);
    G.audio.sfx(sp.id);
  }
  special() {
    const p = G.player;
    const S = SPECIALS[this.id];
    if (!S || this.specialCd > 0) return;
    this.specialCd = S.cd;
    this.anim.trigger('cast');
    const tgt = this.target && this.target.alive ? this.target : this.nearestEnemy();
    G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.3), S.name + '!', 'combo');
    const near = (r, at = this.pos) => G.enemies.list.filter((e) => e.alive && !e.ally && e.pos.distanceTo(at) < r);
    switch (this.id) {
      case 'pip': p.heal(35); G.fx.emit({ pos: p.pos.clone().setY(p.pos.y + 1), color: 0x80ff9a, count: 40, speed: 3, size: 0.25, life: 1, intensity: 2.5, up: 2 }); G.audio.sfx('episkey'); break;
      case 'oren': near(7).forEach((e) => { e.status.chill = 4; }); G.fx.shock(this.pos.clone().setY(this.pos.y + 0.2), 0xa8f0ff, 7, 0.6, { intensity: 1.5 }); G.audio.sfx('glacius'); break;
      case 'tamsin': if (tgt) G.spells.explodeAt(tgt.pos.clone(), 4, 40, 0xff6a30, 'incendio'); break;
      case 'kofi': near(7).forEach((e) => { e.status.laugh = e.def.boss ? 0.8 : 3; }); G.fx.burst(this.pos.clone().setY(this.pos.y + 1), 0xffd040, 50, 6); G.audio.sfx('rictusempra'); break;
      case 'isolde': if (tgt) for (let i = 0; i < 3; i++) setTimeout(() => this.alive && tgt.alive && G.spells.spawnProjectile({ ...SPELL_BY_ID.diffindo, dmg: 18 }, this.wandPos(), tgt.pos.clone().setY(tgt.pos.y + 1).sub(this.wandPos()).normalize(), 'player', this, tgt), i * 150); break;
      case 'ruairi': near(8, p.pos).forEach((e) => { e.vel.addScaledVector(_v.subVectors(e.pos, p.pos).setY(0).normalize(), e.def.boss ? 2 : 14); e.status.stun = Math.max(e.status.stun, 1); }); G.fx.shock(p.pos.clone().setY(p.pos.y + 0.2), 0xff9ad0, 8, 0.5, { intensity: 1.5 }); G.audio.sfx('depulso'); break;
      case 'mei': if (tgt) for (let i = 0; i < 5; i++) setTimeout(() => this.alive && tgt.alive && G.spells.spawnProjectile({ ...SPELL_BY_ID.stupefy, dmg: 12 }, this.wandPos(), tgt.pos.clone().setY(tgt.pos.y + 1).sub(this.wandPos()).normalize(), 'player', this, tgt), i * 120); break;
      case 'bram': p.buffs.shielded = 5; p.shieldBuff = 5; G.ui.updateBuffs(); G.fx.shock(p.pos.clone().setY(p.pos.y + 1), 0x9fe08a, 2, 0.5, { sphere: true, intensity: 1.5 }); G.audio.sfx('protego'); break;
      case 'cassius': if (tgt && !tgt.def.boss) { tgt.lift(); tgt.hoisted = true; tgt.status.lifted = 4; } break;
    }
  }
}
