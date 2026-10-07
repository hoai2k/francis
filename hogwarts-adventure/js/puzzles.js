// Spell puzzles placed around the castle and the year dungeons. Each object listens
// for particular spells: Alohomora opens locks, Reparo mends, Confringo / Bombarda /
// Reducto blast cracked walls, Diffindo and fire cut webs, Incendio lights braziers,
// Aguamenti and Ventus douse them, Finite dissolves barriers, Accio fetches,
// Depulso / Flipendo push blocks, Ventus turns windmills, Glacius freezes water.
import * as THREE from 'three';
import { G } from './state.js';
import { materials } from './world/materials.js';
import { glowSprite, flameSprite } from './textures.js';
import { addXP } from './progress.js';
import { addCoins, addItem, ITEMS } from './items.js';
import { writeSave } from './save.js';
import { rand } from './util.js';

const _v = new THREE.Vector3();
const solvedSet = () => (G.save.puzzles ||= {});

export class Puzzles {
  constructor() {
    this.list = [];
    this.byId = {};
  }
  add(o) {
    o.solved = !!solvedSet()[o.id];
    this.list.push(o);
    this.byId[o.id] = o;
    const z = G.world.zones[o.zone];
    if (o.mesh) z.world.add(o.mesh);
    o.build?.(z);
    if (o.solved) o.applySolved?.(true);
    if (o.interact) G.story.interactables.push({ zone: o.zone, pos: o.pos, r: o.ir || 2.2, label: () => o.interact.label(), cond: () => !o.hidden && o.interact.cond(), act: () => o.interact.act() });
    return o;
  }
  solve(o, quiet) {
    if (o.solved) return;
    o.solved = true;
    solvedSet()[o.id] = true;
    o.applySolved?.(false);
    if (!quiet) {
      G.audio.sfx('quest');
      addXP(o.xp ?? 40, o.label || 'Puzzle solved');
    }
    o.onSolved?.();
    G.events.emit('puzzle', o.id);
    G.story?.onEvent('puzzle', o.id);
    writeSave();
  }
  isSolved(id) { return !!solvedSet()[id]; }
  here() { return this.list.filter((o) => o.zone === G.zone?.name && !o.hidden); }
  hitProjectile(pr) {
    const id = pr.def.id;
    for (const o of this.here()) {
      if (!o.accepts?.includes(id) || (o.solved && !o.reusable)) continue;
      if (pr.pos.distanceTo(o.pos) < (o.r || 1.5) + pr.radius) { o.onSpell(id, pr.pos); return true; }
    }
    return false;
  }
  spellArea(id, pos, r) {
    for (const o of this.here()) if (o.accepts?.includes(id) && (!o.solved || o.reusable) && o.pos.distanceTo(pos) < r + (o.r || 1)) o.onSpell(id, pos);
  }
  spellCone(id, origin, fwd, range, ang) {
    for (const o of this.here()) {
      if (!o.accepts?.includes(id) || (o.solved && !o.reusable)) continue;
      const to = _v.subVectors(o.pos, origin).setY(0);
      const d = to.length();
      if (d > range + (o.r || 1)) continue;
      if (Math.acos(Math.min(1, to.normalize().dot(fwd))) < ang + 0.2) o.onSpell(id, o.pos);
    }
  }
  accioTargets() { return this.here().filter((o) => o.onAccio && !o.solved); }
  update(dt) { for (const o of this.here()) o.update?.(dt); }
  // reset puzzles that should re-arm when the player leaves (e.g. braziers)
}

const M = () => materials();
const no = (o, txt) => { G.ui.floatText(o.pos.clone().setY(o.pos.y + 1.5), txt, 'warn'); G.audio.sfx('block'); };

// ------------------------------------------------------------------ reward chest
// reward: { coins, item, card, xp }
export function chest(P, id, zone, pos, yaw = 0, reward = { coins: 15 }, locked = true) {
  const g = new THREE.Group();
  const wood = M().woodDark, iron = M().iron, gold = M().gold;
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), wood); base.position.y = 0.3; base.castShadow = true;
  const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.35);
  const lm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 10, 1, false, 0, Math.PI), wood); lm.rotation.z = Math.PI / 2; lm.rotation.y = Math.PI / 2; lm.position.z = 0.35; lm.castShadow = true;
  lid.add(lm);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.06), gold); lock.position.set(0, 0.55, 0.37);
  for (const x of [-0.4, 0.4]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.72), iron); b.position.set(x, 0.31, 0); g.add(b); }
  g.add(base, lid, lock);
  g.position.copy(pos); g.rotation.y = yaw;
  const o = {
    id, zone, pos: pos.clone().setY(pos.y + 0.5), r: 1, mesh: g, accepts: locked ? ['alohomora'] : [], label: 'Chest opened', xp: 25,
    onSpell() { if (!o.unlocked) { o.unlocked = true; lock.visible = false; G.audio.sfx('alohomora'); G.fx.burst(o.pos, 0xd8b8ff, 30, 4); G.ui.floatText(o.pos.clone().setY(o.pos.y + 1), 'Unlocked!', 'combo'); } },
    interact: {
      label: () => (o.solved ? '' : o.unlocked || !locked ? 'Open the chest' : 'Locked (Alohomora)'),
      cond: () => !o.solved,
      act: async () => {
        if (locked && !o.unlocked) { G.ui.toast(G.spells.unlocked.has('alohomora') ? 'It’s locked. Cast <b>Alohomora</b> at it.' : 'It’s locked tight. Perhaps a charm could open it…', 'tip'); return; }
        P.solve(o);
      },
    },
    applySolved(instant) {
      lock.visible = false;
      if (instant) { lid.rotation.x = -1.9; return; }
      let t = 0;
      const anim = () => { t += 0.05; lid.rotation.x = -1.9 * Math.min(1, t); if (t < 1) requestAnimationFrame(anim); };
      anim();
      G.fx.burst(o.pos.clone().setY(o.pos.y + 0.3), 0xffd070, 50, 5);
      giveReward(reward, o.pos);
    },
  };
  return P.add(o);
}
export function giveReward(r, pos) {
  const parts = [];
  if (r.coins) { addCoins(r.coins); parts.push(`${r.coins} Sickles`); }
  if (r.item) { addItem(r.item, r.n || 1); parts.push(`${ITEMS[r.item].icon} ${ITEMS[r.item].short}${r.n > 1 ? ' ×' + r.n : ''}`); }
  if (r.xp) addXP(r.xp);
  if (r.gear && G.gear) { G.gear.give(r.gear); parts.push(G.gear.name(r.gear)); }
  if (parts.length) { G.audio.sfx('card'); G.ui.toast(`Found: ${parts.join(' · ')}`, 'points', 3500); }
}

// ------------------------------------------------------------------ cracked wall (blast it)
export function crackedWall(P, id, zone, pos, yaw, w = 3, h = 3.6, onSolved) {
  const z = G.world.zones[zone];
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.95, emissive: 0x201008, emissiveIntensity: 0.3 });
  const g = new THREE.Group();
  const blocks = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w / 4 - 0.04, h / 5 - 0.04, 0.6), mat);
    b.position.set(-w / 2 + (i + 0.5) * (w / 4), (j + 0.5) * (h / 5), 0);
    b.castShadow = b.receiveShadow = true;
    g.add(b); blocks.push(b);
  }
  // glowing cracks
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.4), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  crack.position.set(0, h / 2, 0.31);
  g.add(crack);
  g.position.copy(pos); g.rotation.y = yaw;
  const col = z.colliders.box(pos.x, pos.y + h / 2, pos.z, w / 2, h / 2, 0.35, yaw);
  const o = {
    id, zone, pos: pos.clone().setY(pos.y + h / 2), r: Math.max(w, h) / 2 + 0.3, mesh: g, accepts: ['confringo', 'bombarda', 'reducto', 'incendio', 'stupefy', 'expelliarmus', 'depulso'], label: 'Wall blasted open', onSolved,
    onSpell(sid) {
      if (!['confringo', 'bombarda', 'reducto'].includes(sid)) { no(o, 'Cracked… it needs a blasting spell'); return; }
      P.solve(o);
    },
    applySolved(instant) {
      col.disabled = true;
      crack.visible = false;
      if (instant) { g.visible = false; return; }
      G.audio.sfx('explode'); G.cam.shake(0.4);
      G.fx.smokePuff(o.pos, 0x8a8070, 24, { speed: 5, size: 1.5, size1: 4 });
      const vels = blocks.map(() => new THREE.Vector3(rand(-3, 3), rand(2, 6), rand(2, 6)));
      let t = 0;
      const anim = () => { t += 0.016; blocks.forEach((b, i) => { vels[i].y -= 0.25; b.position.addScaledVector(vels[i], 0.016); b.rotation.x += 0.1; }); if (t < 1.6) requestAnimationFrame(anim); else g.visible = false; };
      anim();
    },
  };
  return P.add(o);
}

// ------------------------------------------------------------------ cobweb / vines (cut or burn)
export function web(P, id, zone, pos, yaw, w = 3, h = 3.4, onSolved) {
  const z = G.world.zones[zone];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  x.strokeStyle = 'rgba(235,235,240,0.85)'; x.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * 90, 64 + Math.sin(a) * 90); x.stroke(); }
  for (let r = 8; r < 90; r += 9) { x.beginPath(); for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; const rr = r + Math.sin(i * 3) * 2; if (i) x.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); else x.moveTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } x.stroke(); }
  const tex = new THREE.CanvasTexture(cv);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, roughness: 1 }));
  m.position.copy(pos).setY(pos.y + h / 2); m.rotation.y = yaw;
  const col = z.colliders.box(pos.x, pos.y + h / 2, pos.z, w / 2, h / 2, 0.2, yaw);
  const o = {
    id, zone, pos: m.position.clone(), r: Math.max(w, h) / 2, mesh: m, accepts: ['diffindo', 'incendio', 'confringo', 'stupefy', 'expelliarmus'], label: 'Web cleared', onSolved,
    onSpell(sid) { if (['diffindo', 'incendio', 'confringo'].includes(sid)) P.solve(o); else no(o, 'Sticky… cut it or burn it'); },
    applySolved(instant) { col.disabled = true; m.visible = false; if (!instant) { G.fx.emit({ pos: o.pos, color: 0xeeeeee, count: 50, speed: 3, size: 0.2, life: 1, intensity: 1.5, gravity: 4, spread: 2 }); G.audio.sfx('diffindo'); } },
  };
  return P.add(o);
}

// ------------------------------------------------------------------ brazier (light / douse); group solved when all lit
export function brazier(P, id, zone, pos, opts = {}) {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.25, 0.4, 12), M().iron); bowl.position.y = 1.2; bowl.castShadow = true;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 1.1, 8), M().iron); stand.position.y = 0.55;
  g.add(bowl, stand);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameSprite(), color: new THREE.Color(3.4, 1.9, 0.7), blending: THREE.AdditiveBlending, depthWrite: false }));
  fl.position.y = 1.85; fl.scale.set(0.9, 1.4, 1);
  g.add(fl);
  g.position.copy(pos);
  const z = G.world.zones[zone];
  z.colliders.cyl(pos.x, pos.z, 0.5, pos.y, pos.y + 1.4);
  const anchor = { pos: pos.clone().setY(pos.y + 1.9), color: 0xff9a40, intensity: 0, distance: 10, flicker: true };
  z.anchors.push(anchor);
  const o = {
    id, zone, pos: pos.clone().setY(pos.y + 1.4), r: 1.0, mesh: g, accepts: ['incendio', 'confringo', 'aguamenti', 'ventus'], reusable: true, lit: !!opts.lit, label: 'Brazier lit', xp: 10,
    setLit(v) { o.lit = v; fl.visible = v; anchor.intensity = v ? 26 : 0; },
    onSpell(sid) {
      const want = ['incendio', 'confringo'].includes(sid);
      if (want === o.lit) return;
      o.setLit(want);
      G.audio.sfx(want ? 'incendio' : 'aguamenti');
      G.fx.emit({ pos: o.pos.clone().setY(o.pos.y + 0.4), color: want ? 0xffb040 : 0xd0eaff, count: 30, speed: 3, size: 0.3, life: 0.6, intensity: 3, up: 2 });
      opts.onChange?.(o);
    },
    update() { if (o.lit) fl.scale.set(0.9 + Math.sin(G.time * 17) * 0.08, 1.4 + Math.sin(G.time * 11) * 0.1, 1); },
    build() { o.setLit(o.lit); },
  };
  return P.add(o);
}
export function brazierGroup(P, id, zone, positions, onSolved) {
  const list = [];
  const check = () => { if (list.every((b) => b.lit) && !P.isSolved(id)) { P.solve(group); } };
  const group = { id, zone, pos: positions[0].clone(), hidden: true, label: 'The flames roar to life', onSolved, applySolved(instant) { if (instant) list.forEach((b) => b.setLit(true)); } };
  positions.forEach((p, i) => list.push(brazier(P, `${id}-${i}`, zone, p, { onChange: check })));
  P.add(group);
  group.list = list;
  return group;
}

// ------------------------------------------------------------------ broken thing mended by Reparo (statue, bridge, window)
export function broken(P, id, zone, pos, kind = 'statue', opts = {}) {
  const z = G.world.zones[zone];
  const g = new THREE.Group();
  const mat = kind === 'bridge' ? M().wood : M().stoneWarm;
  const pieces = [];
  if (kind === 'bridge') {
    const len = opts.len || 8, w = opts.w || 2.4;
    for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, len / 8 - 0.05), mat); b.position.set(0, 0, -len / 2 + (i + 0.5) * (len / 8)); b.castShadow = b.receiveShadow = true; g.add(b); pieces.push(b); }
  } else {
    const parts = [[0, 0.5, 0, 0.9, 1, 0.9], [0, 1.5, 0, 0.6, 1, 0.45], [0, 2.25, 0, 0.42, 0.45, 0.42], [-0.45, 1.5, 0, 0.2, 0.8, 0.2], [0.45, 1.5, 0, 0.2, 0.8, 0.2]];
    for (const [x, y, zz, w, h, d] of parts) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, zz); b.castShadow = true; g.add(b); pieces.push(b); }
  }
  const home = pieces.map((p) => ({ p: p.position.clone(), r: p.rotation.clone() }));
  const scatter = pieces.map((p, i) => ({ p: p.position.clone().add(new THREE.Vector3(rand(-2, 2), kind === 'bridge' ? -3 - rand(0, 3) : -p.position.y + 0.2, rand(-2, 2))), r: new THREE.Euler(rand(-1, 1), rand(-1, 1), rand(-1, 1)) }));
  pieces.forEach((p, i) => { p.position.copy(scatter[i].p); p.rotation.copy(scatter[i].r); });
  g.position.copy(pos);
  g.rotation.y = opts.yaw || 0;
  let col = null;
  if (kind === 'bridge') col = z.colliders.box(pos.x, pos.y - 0.12, pos.z, (opts.w || 2.4) / 2, 0.15, (opts.len || 8) / 2, opts.yaw || 0, { disabled: true });
  const o = {
    id, zone, pos: pos.clone().setY(pos.y + (kind === 'bridge' ? 0 : 1)), r: kind === 'bridge' ? (opts.len || 8) / 2 : 1.6, mesh: g, accepts: ['reparo'], label: kind === 'bridge' ? 'Bridge repaired' : 'Repaired', onSolved: opts.onSolved,
    onSpell() { P.solve(o); },
    applySolved(instant) {
      if (col) col.disabled = false;
      if (instant) { pieces.forEach((p, i) => { p.position.copy(home[i].p); p.rotation.copy(home[i].r); }); return; }
      G.audio.sfx('reparo');
      let t = 0;
      const anim = () => {
        t += 0.02;
        const k = Math.min(1, t) ** 2;
        pieces.forEach((p, i) => { p.position.lerpVectors(scatter[i].p, home[i].p, k); p.rotation.set(scatter[i].r.x * (1 - k), scatter[i].r.y * (1 - k), scatter[i].r.z * (1 - k)); });
        if (Math.random() < 0.5) G.fx.emit({ pos: o.pos, color: 0xffe9a8, count: 3, speed: 2, size: 0.15, life: 0.6, intensity: 3, spread: 2 });
        if (t < 1) requestAnimationFrame(anim);
      };
      anim();
    },
  };
  if (opts.reward) { const prev = o.applySolved; o.applySolved = (inst) => { prev(inst); if (!inst) giveReward(opts.reward, o.pos); }; }
  return P.add(o);
}

// ------------------------------------------------------------------ magical barrier (Finite)
export function barrier(P, id, zone, pos, yaw, w = 3, h = 3.6, onSolved) {
  const z = G.world.zones[zone];
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0.5, 0.9, 1.6) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float time; uniform vec3 color; varying vec2 vUv; void main(){ float r = sin(vUv.x*40.0 + time*3.0)*sin(vUv.y*30.0 - time*2.0); float e = smoothstep(0.4,0.5,abs(vUv.x-0.5)) + smoothstep(0.4,0.5,abs(vUv.y-0.5)); float a = 0.12 + 0.12*r + e*0.4; gl_FragColor = vec4(color*a, a); }',
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.copy(pos).setY(pos.y + h / 2); m.rotation.y = yaw;
  const col = z.colliders.box(pos.x, pos.y + h / 2, pos.z, w / 2, h / 2, 0.25, yaw);
  const o = {
    id, zone, pos: m.position.clone(), r: Math.max(w, h) / 2, mesh: m, accepts: ['finite', 'stupefy', 'expelliarmus', 'incendio', 'confringo', 'reducto'], label: 'Barrier dispelled', onSolved,
    onSpell(sid) { if (sid === 'finite') P.solve(o); else no(o, 'The barrier absorbs it'); },
    update() { mat.uniforms.time.value = G.time; },
    applySolved(instant) { col.disabled = true; m.visible = false; if (!instant) { G.audio.sfx('finite'); G.fx.burst(o.pos, 0x9ae0ff, 60, 6); } },
  };
  return P.add(o);
}

// ------------------------------------------------------------------ locked gate (Alohomora)
export function gate(P, id, zone, pos, yaw, w = 3, h = 4, onSolved) {
  const z = G.world.zones[zone];
  const g = new THREE.Group();
  for (let i = 0; i <= 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 6), M().iron); b.position.set(-w / 2 + (i / 6) * w, h / 2, 0); b.castShadow = true; g.add(b); }
  for (const y of [0.3, h - 0.3]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.1), M().iron); b.position.y = y; g.add(b); }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), M().gold); lock.position.set(0, h / 2, 0.08); g.add(lock);
  g.position.copy(pos); g.rotation.y = yaw;
  const col = z.colliders.box(pos.x, pos.y + h / 2, pos.z, w / 2, h / 2, 0.2, yaw);
  const o = {
    id, zone, pos: pos.clone().setY(pos.y + h / 2), r: Math.max(w, h) / 2, mesh: g, accepts: ['alohomora'], label: 'Gate unlocked', onSolved,
    onSpell() { P.solve(o); },
    applySolved(instant) {
      col.disabled = true; lock.visible = false;
      if (instant) { g.position.y = pos.y + h - 0.3; return; }
      G.audio.sfx('alohomora');
      let t = 0; const anim = () => { t += 0.02; g.position.y = pos.y + (h - 0.3) * Math.min(1, t); if (t < 1) requestAnimationFrame(anim); }; anim();
    },
  };
  return P.add(o);
}

// ------------------------------------------------------------------ an item on a ledge (Accio, or Descendo the ledge)
export function ledgeItem(P, id, zone, pos, reward = { coins: 20 }, onSolved) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xa07010, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.3 }));
  g.add(m);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: new THREE.Color(2, 1.5, 0.5), blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(1.6); g.add(glow);
  g.position.copy(pos);
  const o = {
    id, zone, pos: pos.clone(), r: 0.9, mesh: g, accepts: ['accio', 'descendo'], label: 'Fetched!', onSolved, xp: 20,
    onSpell() { o.onAccio(); },
    onAccio() { P.solve(o); },
    update() { m.rotation.y += 0.03; m.position.y = Math.sin(G.time * 2) * 0.1; },
    applySolved(instant) { g.visible = false; if (!instant) { G.fx.burst(o.pos, 0x9ad8ff, 30, 4); giveReward(reward, o.pos); } },
  };
  return P.add(o);
}

// ------------------------------------------------------------------ heavy block pushed onto a pressure plate (Depulso / Flipendo)
export function pushBlock(P, id, zone, pos, platePos, onSolved) {
  const z = G.world.zones[zone];
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a7468, roughness: 0.9 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), mat);
  m.castShadow = m.receiveShadow = true;
  m.position.copy(pos).setY(pos.y + 0.7);
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.4, 2.2), transparent: true, opacity: 0.7 }));
  rune.position.z = 0.71; m.add(rune);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0x404858, emissive: 0x204060, emissiveIntensity: 0.8 }));
  plate.position.copy(platePos).setY(platePos.y + 0.04);
  const col = z.colliders.box(m.position.x, m.position.y, m.position.z, 0.7, 0.7, 0.7, 0, { dynamic: true });
  const o = {
    id, zone, pos: m.position, r: 1.1, mesh: m, accepts: ['depulso', 'flipendo', 'accio'], label: 'Pressure plate pressed', onSolved, vel: new THREE.Vector3(),
    build(zz) { zz.world.add(plate); },
    onSpell(sid) {
      const dir = _v.subVectors(m.position, G.player.pos).setY(0).normalize();
      if (sid === 'accio') dir.multiplyScalar(-1);
      // snap to the dominant axis so blocks slide like proper puzzle blocks
      if (Math.abs(dir.x) > Math.abs(dir.z)) dir.set(Math.sign(dir.x), 0, 0); else dir.set(0, 0, Math.sign(dir.z));
      o.vel.copy(dir).multiplyScalar(sid === 'depulso' ? 9 : 5);
      G.audio.sfx('stairs');
    },
    update(dt) {
      if (o.vel.lengthSq() < 0.01) return;
      const step = o.vel.clone().multiplyScalar(dt);
      const next = m.position.clone().add(step);
      // stop against walls
      const hit = z.colliders.raycast(m.position.clone().setY(m.position.y), o.vel.clone().normalize(), step.length() + 0.75);
      if (hit !== Infinity) { o.vel.set(0, 0, 0); G.cam.shake(0.1); G.audio.sfx('land'); return; }
      m.position.copy(next);
      o.vel.multiplyScalar(Math.exp(-dt * 1.2));
      col.x = m.position.x; col.z = m.position.z;
      if (Math.random() < 0.3) G.fx.smokePuff(m.position.clone().setY(m.position.y - 0.6), 0x8a8070, 1, { size: 0.5, size1: 1.2, life: 0.6, alpha: 0.3 });
      if (!o.solved && Math.hypot(m.position.x - platePos.x, m.position.z - platePos.z) < 0.8) { o.vel.set(0, 0, 0); m.position.x = platePos.x; m.position.z = platePos.z; col.x = m.position.x; col.z = m.position.z; P.solve(o); }
    },
    applySolved(instant) { plate.material.emissive.setHex(0x40ff80); if (instant) { m.position.set(platePos.x, platePos.y + 0.7, platePos.z); col.x = m.position.x; col.z = m.position.z; } },
  };
  return P.add(o);
}

// ------------------------------------------------------------------ windmill / fan (Ventus)
export function windmill(P, id, zone, pos, yaw, onSolved) {
  const g = new THREE.Group();
  const hub = new THREE.Group(); hub.position.y = 2.4; g.add(hub);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 8), M().wood); post.position.y = 1.2; g.add(post);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.05), M().wood); b.position.y = 0.75; const a = new THREE.Group(); a.rotation.z = (i / 4) * Math.PI * 2; a.add(b); hub.add(a); }
  g.position.copy(pos); g.rotation.y = yaw;
  const o = {
    id, zone, pos: pos.clone().setY(pos.y + 2.4), r: 1.6, mesh: g, accepts: ['ventus'], label: 'The mechanism turns', onSolved, spin: 0,
    onSpell() { o.spin = 12; if (!o.solved) setTimeout(() => P.solve(o), 600); },
    update(dt) { hub.rotation.z += dt * (o.solved ? 2 + o.spin : o.spin); o.spin = Math.max(0, o.spin - dt * 2); },
  };
  return P.add(o);
}

// ------------------------------------------------------------------ pool that Glacius freezes into a walkable sheet
export function pool(P, id, zone, pos, w, d, onSolved) {
  const z = G.world.zones[zone];
  const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0x1a3a50, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.copy(pos);
  const col = z.colliders.box(pos.x, pos.y - 0.1, pos.z, w / 2, 0.12, d / 2, 0, { disabled: true });
  const o = {
    id, zone, pos: pos.clone(), r: Math.max(w, d) / 2, mesh: water, accepts: ['glacius'], label: 'The water freezes solid', onSolved,
    onSpell() { P.solve(o); },
    applySolved(instant) { col.disabled = false; water.material.color.setHex(0xb8e8f8); water.material.roughness = 0.3; water.material.opacity = 0.95; if (!instant) { G.audio.sfx('glacius'); G.fx.emit({ pos: pos.clone().setY(pos.y + 0.3), color: 0xd8f8ff, count: 80, speed: 3, size: 0.25, life: 1, intensity: 2.5, spread: w }); } },
  };
  return P.add(o);
}

// ------------------------------------------------------------------ swinging blade trap (Arresto Momentum slows it)
export function pendulum(P, id, zone, pos, yaw, len = 4.5, phase = 0) {
  const g = new THREE.Group();
  const arm = new THREE.Group();
  arm.position.y = len + 0.6;
  g.add(arm);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), M().iron); rod.position.y = -len / 2; arm.add(rod);
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.06, 20, 1, false, Math.PI * 0.2, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.2 }));
  blade.rotation.z = Math.PI / 2; blade.position.y = -len; blade.castShadow = true; arm.add(blade);
  g.position.copy(pos); g.rotation.y = yaw;
  const o = {
    id, zone, pos: pos.clone().setY(pos.y + 1), r: 1.4, mesh: g, accepts: [], reusable: true, t: phase, hidden: false, slowLabel: 0,
    update(dt) {
      const slow = G.spells.inSlowField?.(o.pos) ? 0.18 : 1;
      o.t += dt * 1.8 * slow;
      arm.rotation.z = Math.sin(o.t) * 1.1;
      if (slow < 1 && Math.random() < 0.2) G.fx.emit({ pos: o.pos.clone().setY(o.pos.y + 1), color: 0x8ab0ff, count: 1, speed: 0.2, size: 0.15, life: 0.8, intensity: 2, noScale: true });
      // blade tip in world space
      const tip = new THREE.Vector3(0, -len, 0).applyMatrix4(arm.matrixWorld);
      const p = G.player;
      o.cd = (o.cd || 0) - dt;
      if (o.cd <= 0 && Math.hypot(tip.x - p.pos.x, tip.z - p.pos.z) < 1.1 && Math.abs(tip.y - (p.pos.y + 0.9)) < 1.2) {
        o.cd = 1;
        const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(Math.sign(Math.cos(o.t)) * 8);
        p.damage(16, { knock: side, dodgeable: true });
      }
    },
  };
  return P.add(o);
}
