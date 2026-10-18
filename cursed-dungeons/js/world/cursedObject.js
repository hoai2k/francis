// Shared pieces of the open-world spawning systems (world/spawnDirector.js,
// world/worldEvents.js):
//
//   new CursedObject(game, { pos, hp, look: 'nest'|'womb', name, shielded: () => bool, onBreak })
//       a breakable cursed object that sits in game.enemies like the training
//       dummy (isDummy: no XP, never targeted by curse AIs), so any attack hits
//       it. While shielded() is true it takes a quarter damage. When it breaks
//       it calls onBreak(src) and shrinks away. o.interact: true also offers a
//       "hold to break" prompt once it is not shielded (for techniques that
//       skip dummies).
//   grantReward(game, pos, { coins, xp, loot: 'common'|'rare'|'unique'|null, power, label })
//       coins on the floor, XP (level-ups), and a chest roll into the inventory.
//   new Ping(game, { color, icon })  .set(pos, label) / .update() / .dispose()
//       a world beam plus a screen-edge arrow with the distance (events).
import * as THREE from 'three/webgpu';
import { rollChest, itemInfo, RARITY } from '../loot.js';
import { toast } from '../ui/ui.js';

const tmp = new THREE.Vector3();

// ------------------------------------------------------------------ meshes (shared geometry/materials)
let PARTS = null;
function parts() {
  if (PARTS) return PARTS;
  const purple = new THREE.Color(0x9a3aff);
  const glow = new THREE.MeshBasicNodeMaterial(); glow.color = purple.clone().multiplyScalar(2.2);
  PARTS = {
    egg: new THREE.IcosahedronGeometry(0.75, 1).scale(1, 1.55, 1).translate(0, 1.35, 0),
    shell: new THREE.IcosahedronGeometry(0.82, 0).scale(1, 1.6, 1).translate(0, 1.35, 0),
    spike: new THREE.ConeGeometry(0.18, 1.3, 5).translate(0, 0.65, 0),
    disc: new THREE.CircleGeometry(3.2, 28).rotateX(-Math.PI / 2),
    ring: new THREE.TorusGeometry(2.6, 0.06, 6, 40).rotateX(Math.PI / 2),
    tag: new THREE.PlaneGeometry(0.26, 0.62),
    womb: new THREE.SphereGeometry(0.9, 14, 10).scale(1, 1.25, 1).translate(0, 1.0, 0),
    vein: new THREE.TorusGeometry(0.92, 0.05, 5, 18),
    mats: {
      core: new THREE.MeshStandardNodeMaterial({ color: 0x1e0a2a, roughness: 0.35, metalness: 0.2, emissive: 0x6a1aff, emissiveIntensity: 0.9, flatShading: true }),
      shell: new THREE.MeshBasicNodeMaterial({ color: 0x3a0a5a, wireframe: true, transparent: true, opacity: 0.55 }),
      spike: new THREE.MeshStandardNodeMaterial({ color: 0x140a1c, roughness: 0.8, flatShading: true }),
      disc: new THREE.MeshBasicNodeMaterial({ color: 0x0a0410, transparent: true, opacity: 0.62, depthWrite: false }),
      ring: glow,
      tag: new THREE.MeshBasicNodeMaterial({ color: 0xf2e2b0, side: THREE.DoubleSide }),
      womb: new THREE.MeshStandardNodeMaterial({ color: 0x5a1a2a, roughness: 0.4, emissive: 0xff2a6a, emissiveIntensity: 0.45 }),
      vein: (() => { const m = new THREE.MeshBasicNodeMaterial(); m.color = new THREE.Color(0xff3a7a).multiplyScalar(2); return m; })(),
      flash: (() => { const m = new THREE.MeshBasicNodeMaterial(); m.color = new THREE.Color(3, 3, 3); return m; })(),
    },
  };
  return PARTS;
}

function buildLook(look) {
  const P = parts(), M = P.mats, grp = new THREE.Group();
  const add = (geo, mat, o = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = !!o.shadow; m.receiveShadow = false; if (o.pos) m.position.set(...o.pos); if (o.rot) m.rotation.set(...o.rot); grp.add(m); return m; };
  const disc = add(P.disc, M.disc, { pos: [0, 0.05, 0] }); disc.renderOrder = 1;
  const ring = add(P.ring, M.ring, { pos: [0, 0.08, 0] });
  const body = [];
  if (look === 'womb') {
    body.push(add(P.womb, M.womb, { shadow: true }));
    for (let i = 0; i < 3; i++) body.push(add(P.vein, M.vein, { pos: [0, 0.6 + i * 0.4, 0], rot: [Math.PI / 2 + (i - 1) * 0.3, 0, i * 0.7] }));
  } else {
    body.push(add(P.egg, M.core, { shadow: true }));
    body.push(add(P.shell, M.shell));
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4, r = 1.1 + (i % 3) * 0.35;
    add(P.spike, M.spike, { pos: [Math.cos(a) * r, 0, Math.sin(a) * r], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], shadow: true }).scale.setScalar(0.6 + (i % 2) * 0.5);
  }
  const tags = new THREE.Group(); tags.position.y = 1.4; grp.add(tags);
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(P.tag, M.tag); const a = (i / 4) * Math.PI * 2; t.position.set(Math.cos(a) * 1.3, Math.sin(i * 1.7) * 0.3, Math.sin(a) * 1.3); t.rotation.y = -a; tags.add(t); }
  return { grp, body, ring, tags, disc };
}

// ------------------------------------------------------------------ the breakable object
export class CursedObject {
  constructor(game, o = {}) {
    this.game = game; this.o = o;
    this.pos = o.pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = 0.9; this.height = 2.4;
    this.maxHp = o.hp ?? 200; this.hp = this.maxHp;
    this.isDummy = true; this.isCursedObject = true; this.kind = 'cursed_object'; this.level = 1;
    this.def = { name: o.name ?? 'Cursed Object', grade: '-', radius: 0.9, height: 2.4, rooted: true };
    this.displayName = o.name ?? 'Cursed Object';
    this.facing = 0; this.flashT = 0; this.dead = false; this.deathT = 0; this.t = Math.random() * 10;
    const L = buildLook(o.look ?? 'nest');
    this.look = L; this.object = L.grp; this.object.position.copy(this.pos);
    this.rig = { root: this.object, swap: () => {}, animate: () => {} };
    game.scene.add(this.object); game.enemies.push(this);
    this.light = game.lights?.attach(this.object, o.look === 'womb' ? 0xff3a7a : 0xa040ff, 2.4, 8, { offsetY: 1.6 });
    if (o.interact !== false) {
      this.it = { id: 'cobj-' + Math.random().toString(36).slice(2, 8), pos: this.pos, radius: 2.4, hold: 1.1, label: `Break the ${this.displayName.toLowerCase()}`,
        enabled: () => !this.dead && !this.shielded(), action: (p) => this.takeDamage(this.hp + 1, p, { unblockable: true }) };
      game.interactables.push(this.it);
    }
  }
  get name() { return this.displayName; }
  shielded() { return !!this.o.shielded?.(); }
  cancelAttack() {} blink() {}
  die(o = {}) { if (!this.dead) this.takeDamage(this.hp + 1, null, o); }
  takeDamage(amount, src, o = {}) {
    if (this.dead || !(amount > 0)) return 0;
    const g = this.game, sh = this.shielded();
    const dmg = amount * (sh ? 0.25 : 1);
    this.hp -= dmg; this.flashT = 0.09;
    if (sh && Math.random() < 0.35) g.fx?.hitSpark?.(tmp.copy(this.pos).setY(this.pos.y + 1.4), null, { color: 0xb070ff });
    if (sh && !this.warned && src?.isPlayer) { this.warned = true; toast('The cursed object is shielded by its curses — defeat them to break it'); }
    if (this.hp <= 0) this.shatter(src);
    return dmg;
  }
  shatter(src) {
    if (this.dead) return;
    const g = this.game;
    this.dead = true; this.deathT = 0; this.hp = 0;
    const c = tmp.copy(this.pos).setY(this.pos.y + 1.3);
    g.fx?.curseDeath?.(c, 2.2, this.o.look === 'womb' ? 0xff3a7a : 0xa040ff);
    g.fx?.explosion?.(c, this.o.look === 'womb' ? 0xff3a7a : 0x9a3aff, 2.2);
    g.shake?.(0.3);
    g.audio?.energy?.('explode');
    if (this.light) { g.lights?.remove(this.light); this.light = null; }
    if (this.it) { const i = g.interactables.indexOf(this.it); if (i >= 0) g.interactables.splice(i, 1); this.it = null; }
    try { this.o.onBreak?.(src); } catch (e) { console.warn('cursed object', e); }
  }
  // gone without breaking (region unload, event timeout)
  remove() {
    const g = this.game;
    if (this.light) { g.lights?.remove(this.light); this.light = null; }
    if (this.it) { const i = g.interactables.indexOf(this.it); if (i >= 0) g.interactables.splice(i, 1); this.it = null; }
    this.dead = true; this.deathT = 0.6;
    g.scene.remove(this.object);
  }
  update(dt) {
    const L = this.look;
    if (this.dead) {
      this.deathT += dt;
      this.object.scale.setScalar(Math.max(0.01, 1 - this.deathT * 1.8));
      return this.deathT < 0.6;
    }
    this.t += dt; this.flashT -= dt;
    const pulse = 1 + Math.sin(this.t * 3) * 0.05 * (this.shielded() ? 1 : 2);
    for (const m of L.body) m.scale.setScalar(pulse);
    if (L.body[1]) L.body[1].rotation.y += dt * 0.6;
    L.tags.rotation.y += dt * 0.8;
    L.tags.position.y = 1.4 + Math.sin(this.t * 1.7) * 0.15;
    L.ring.scale.setScalar(1 + Math.sin(this.t * 2) * 0.04);
    L.ring.visible = this.shielded();
    const f = this.flashT > 0;
    if (f !== this.flashing) { this.flashing = f; for (const m of L.body) { m.userData.mat ??= m.material; m.material = f ? parts().mats.flash : m.userData.mat; } }
    if (Math.random() < dt * 6) this.game.particles?.glow?.emit(this.pos.x + (Math.random() - 0.5) * 2.4, this.pos.y + 0.2, this.pos.z + (Math.random() - 0.5) * 2.4, 0, 0.8 + Math.random(), 0, 1.2, 0.6, 0.15, 1.1, 0.22, -0.2, 1.4, 0.1, 0);
    return true;
  }
}

// ------------------------------------------------------------------ rewards
export function grantReward(game, pos, o = {}) {
  const g = game, sd = g.save.data;
  if (o.coins) g.pickups?.drop('coin', pos, o.coins, 1);
  if (o.heal) g.pickups?.drop('heal', pos, 1);
  const got = [];
  if (o.loot) {
    const power = Math.max(1, Math.round((sd.level ?? 1) / 3) + 1 + (o.power ?? 0));
    const items = rollChest(power, o.loot === 'unique' ? 'boss' : o.loot);
    items.forEach((it, i) => {
      sd.inventory.push(it);
      const b = itemInfo(it), R = RARITY[b.rarity];
      got.push(b.name);
      setTimeout(() => { toast(`${b.icon} ${R.label}: ${b.name}`); g.audio?.loot?.(b.rarity); }, 450 + i * 450);
    });
    g.particles?.burst(tmp.copy(pos).setY(pos.y + 1), { count: 30, color: o.loot === 'common' ? 0xffd23a : 0x4ad0ff, speed: 3, up: 4, life: 1.2, size: 0.18, gravity: -2, shape: 1 });
  }
  if (o.xp) { const ups = g.save.addXp(o.xp); if (ups) g.levelUp?.(); }
  g.save.write();
  return got;
}

// ------------------------------------------------------------------ event ping: world beam + screen-edge arrow
export class Ping {
  constructor(game, o = {}) {
    this.game = game; this.pos = null; this.label = '';
    const col = new THREE.Color(o.color ?? 0xff4a5a);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 26, 10, 1, true).translate(0, 13, 0),
      new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(1.6), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.beam.frustumCulled = false; this.beam.castShadow = false; this.beam.visible = false;
    game.scene.add(this.beam); (game.hubProps ??= []).push(this.beam);
    const el = this.el = document.createElement('div');
    el.className = 'wev-ping';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;left:0;top:0;z-index:30;pointer-events:none;display:none;transform:translate(-50%,-50%);font:bold 13px "Pixelify Sans",sans-serif;color:#fff;text-shadow:0 0 3px #000,0 1px 2px #000;white-space:nowrap;text-align:center';
    el.innerHTML = `<div class="ic" style="font-size:22px;line-height:1;color:${o.css ?? '#ff5a6a'}">${o.icon ?? '⚠'}</div><div class="d"></div>`;
    document.body.appendChild(el);
  }
  set(pos, label = '') { this.pos = pos ? pos.clone() : null; this.label = label; if (this.pos) this.beam.position.copy(this.pos); }
  update() {
    const g = this.game, el = this.el;
    const lead = g.players.find((p) => !p.dead) ?? null;
    const show = this.pos && lead && g.state === 'playing' && !g.ui?.active && !g.cutscenes?.active && !document.getElementById('hud')?.classList.contains('hidden');
    this.beam.visible = !!show;
    if (!show) { el.style.display = 'none'; return; }
    if (this.beam.parent !== g.scene) g.scene.add(this.beam);
    const dist = Math.hypot(this.pos.x - lead.pos.x, this.pos.z - lead.pos.z);
    this.beam.material.opacity = Math.min(0.3, 0.06 + dist * 0.006);
    tmp.copy(this.pos).setY(this.pos.y + 3).project(g.rig.camera);
    const behind = tmp.z > 1, sw = window.innerWidth, sh = window.innerHeight;
    let sx = (tmp.x * 0.5 + 0.5) * sw, sy = (-tmp.y * 0.5 + 0.5) * sh;
    if (behind) { sx = sw - sx; sy = sh - sy; }
    const m = 56;
    if (behind || sx < m || sx > sw - m || sy < m + 40 || sy > sh - m - 90) {
      const cx = sw / 2, cy = sh / 2; let dx = sx - cx, dy = sy - cy; if (Math.hypot(dx, dy) < 1) dy = -1;
      const k = Math.min((cx - m) / Math.abs(dx || 1e-6), (cy - m - 60) / Math.abs(dy || 1e-6));
      sx = cx + dx * k; sy = cy + dy * k;
    }
    el.style.display = 'block';
    el.style.left = sx.toFixed(0) + 'px'; el.style.top = sy.toFixed(0) + 'px';
    const txt = `${this.label ? this.label + ' · ' : ''}${Math.round(dist)} m`;
    const d = el.lastChild; if (d.textContent !== txt) d.textContent = txt;
  }
  dispose() { this.el.remove(); this.game.scene.remove(this.beam); this.beam.geometry.dispose(); }
}

// A small banner under the objective line (event progress).
export class Banner {
  constructor() {
    const el = this.el = document.createElement('div');
    el.className = 'wev-banner';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:25;pointer-events:none;padding:5px 14px;border-radius:6px;background:rgba(30,6,16,0.82);border:2px solid #ff5a6a;color:#ffe0e4;font:bold 14px "Pixelify Sans",sans-serif;text-shadow:0 1px 2px #000;display:none;max-width:92vw;text-align:center';
    document.body.appendChild(el);
  }
  set(text) { if (!text) { this.el.style.display = 'none'; return; } this.el.style.display = 'block'; if (this.el.textContent !== text) this.el.textContent = text; }
  dispose() { this.el.remove(); }
}
