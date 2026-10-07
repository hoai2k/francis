// Enemies: Cornish pixies, dark wizards / duellists, Dementors, the mountain troll
// and the final boss. Telegraphed area attacks, status effects, drops and slow-mo finishers.
import * as THREE from 'three';
import { G, HOUSES } from './state.js';
import { makeWizard, makeTroll, makePixie, makeDementor, SKIN_TONES, HAIR_COLORS } from './models.js';
import { ENEMY_SPELLS } from './spells.js';
import { clamp, damp, dampAngle, rand, pick, lerp } from './util.js';
import { setFrost, postFlash } from './engine.js';
import { glowSprite } from './textures.js';
import { controlMult, comboMult, addXP } from './progress.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
// story banners and tips during fights are shown to friends in the same room too
const banner = (t, sub, cls) => { G.ui.banner(t, sub, cls); G.net?.share('banner', t, sub, cls); };
const tip = (t, kind) => { G.ui.toast(t, kind); G.net?.share('toast', t.replace(/<[^>]+>/g, '')); };

// ------------------------------------------------------------------ telegraphs
const teleMat = (color) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  polygonOffset: true, polygonOffsetFactor: -2,
  uniforms: { progress: { value: 0 }, color: { value: new THREE.Color(color) }, line: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform float progress, line; uniform vec3 color; varying vec2 vUv;
    void main(){
      float r = line > 0.5 ? abs(vUv.x - 0.5) * 2.0 : length(vUv - 0.5) * 2.0;
      float along = line > 0.5 ? vUv.y : r;
      if (r > 1.0) discard;
      float edge = smoothstep(0.9, 0.97, r) * (1.0 - smoothstep(0.97, 1.0, r));
      float fill = line > 0.5 ? step(along, progress) * 0.35 : step(r, progress) * 0.35;
      float a = edge * 0.9 + fill + 0.08;
      gl_FragColor = vec4(color * a * 2.0, a);
    }`,
});

class Telegraph {
  constructor(pos, r, delay, onFire, opts = {}) {
    this.t = 0; this.delay = delay; this.onFire = onFire; this.pos = pos.clone(); this.r = r;
    const geo = opts.line ? new THREE.PlaneGeometry(opts.width || 2, opts.length || 12) : new THREE.CircleGeometry(1, 40);
    if (opts.line) geo.translate(0, (opts.length || 12) / 2, 0);
    geo.rotateX(Math.PI / 2);
    const mat = teleMat(opts.color ?? 0xff3020);
    mat.uniforms.line.value = opts.line ? 1 : 0;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(pos).setY(pos.y + 0.06);
    if (!opts.line) this.mesh.scale.set(r, 1, r);
    else this.mesh.rotation.y = opts.yaw || 0;
    this.mesh.renderOrder = 3;
    G.scene.add(this.mesh);
    this.opts = opts;
  }
  update(dt) {
    this.t += dt;
    this.mesh.material.uniforms.progress.value = Math.min(1, this.t / this.delay);
    if (this.t >= this.delay && !this.fired) {
      this.fired = true;
      this.onFire(this);
      G.scene.remove(this.mesh);
      this.mesh.material.dispose();
      return false;
    }
    return true;
  }
  cancel() { if (!this.fired) { this.fired = true; G.scene.remove(this.mesh); } }
}

// ------------------------------------------------------------------ types
export const TYPES = {
  pixie: { name: 'Cornish Pixie', hp: 22, radius: 0.35, height: 0.6, speed: 7, weak: { incendio: 2, petrificus: 2, stupefy: 1.2, glacius: 2, ventus: 2, flipendo: 2, confringo: 1.5 }, resist: { expelliarmus: 0.4 }, points: 1, flying: true },
  wizard: { name: 'Dark Wizard', hp: 95, radius: 0.4, height: 1.8, speed: 4.2, weak: { expelliarmus: 1.3 }, resist: {}, points: 3 },
  duelist: { name: 'Duellist', hp: 90, radius: 0.4, height: 1.8, speed: 4.4, weak: {}, resist: {}, points: 0 },
  dementor: { name: 'Dementor', hp: 160, radius: 0.7, height: 3.2, speed: 2.6, weak: { patronum: 1 }, resist: { all: 0.06, lumos: 1 }, points: 5, flying: true },
  troll: { name: 'Mountain Troll', hp: 700, radius: 1.3, height: 4.2, speed: 2.6, weak: { thrown: 1.5, combo: 1.3, reducto: 1.6, bombarda: 1.3 }, resist: { stupefy: 0.45, expelliarmus: 0.3, depulso: 0.3, flipendo: 0.3 }, points: 50, boss: true },
  malachar: { name: 'Malachar the Hollow', hp: 1600, radius: 0.55, height: 2.3, speed: 4.5, weak: { expelliarmus: 1.2 }, resist: { stupefy: 0.8 }, points: 100, boss: true },
};

let uid = 0;
export class Enemy {
  constructor(type, pos, o = {}) {
    const def = TYPES[type];
    this.id = ++uid;
    this.type = type;
    this.def = def;
    this.name = o.name || def.name;
    this.pos = pos.clone();
    this.vel = new THREE.Vector3();
    this.yaw = o.yaw ?? 0;
    this.radius = def.radius;
    this.height = def.height;
    const hs = G.enemies.hpScale || 1;
    this.maxHp = Math.round((o.hp || def.hp) * (def.boss ? 1 + (hs - 1) * 0.3 : hs) * (G.diffHp ?? 1));
    this.hp = this.maxHp;
    this.alive = true;
    this.team = 'enemy';
    this.status = { stun: 0, frozen: 0, burn: 0, lifted: 0, disarmed: 0, wet: 0, chill: 0, blind: 0, silence: 0, bound: 0, laugh: 0 };
    this.o = o;
    this.level = o.level || 1;
    this.t = rand(0, 3);
    this.castCd = rand(1.5, 3);
    this.state = 'idle';
    this.aggro = o.aggro ?? true;
    this.hoverY = def.flying ? (type === 'pixie' ? rand(1.4, 2.6) : 0) : 0;
    this.build(o);
    G.scene.add(this.root);
    this.root.position.copy(this.pos);
    // ice shell for Petrificus
    this.ice = new THREE.Mesh(new THREE.CapsuleGeometry(this.radius * 1.25, this.height * 0.7, 4, 10), new THREE.MeshStandardMaterial({ color: 0xbff0ff, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.3, emissive: 0x204060, emissiveIntensity: 0.6 }));
    this.ice.position.y = this.height / 2;
    this.ice.visible = false;
    this.root.add(this.ice);
  }

  build(o) {
    if (this.def.model) {
      this.model = this.def.model(o);
      this.root = new THREE.Group();
      this.root.add(this.model.root);
      this.anim = this.model.anim;
      return;
    }
    if (this.type === 'pixie') { this.model = makePixie(); }
    else if (this.type === 'troll') { this.model = makeTroll(); }
    else if (this.type === 'dementor') { this.model = makeDementor(); if (o.lord) { this.model.root.scale.setScalar(1.8); this.radius = 1.2; this.height = 5.6; } }
    else if (this.type === 'malachar') {
      this.model = makeWizard({ robeColor: '#101014', liningColor: '#1a4a2a', hood: true, mask: true, eyeGlow: '#40ff70', scale: 1.28, skin: '#d8d0c8' });
    } else if (this.type === 'duelist') {
      this.model = o.look ? makeWizard({ ...o.look, scarf: true }) : makeWizard({ house: o.house, skin: pick(SKIN_TONES), hairColor: pick(HAIR_COLORS), hairStyle: pick(['short', 'long', 'curly', 'bun', 'messy']), glasses: Math.random() < 0.3, hat: o.hat, robeColor: o.robe || '#17161c' });
    } else {
      this.model = makeWizard({ robeColor: '#1a1a1e', liningColor: '#3a0a0a', hood: true, mask: true, eyeGlow: '#ff3030', skin: '#c8b8a8' });
    }
    this.root = new THREE.Group();
    this.root.add(this.model.root);
    this.anim = this.model.anim;
  }

  get canAct() { const S = this.status; return this.alive && S.stun <= 0 && S.frozen <= 0 && !(S.lifted > 0) && !(S.bound > 0) && !(S.laugh > 0) && !this.thrown; }

  takeHit(h) {
    if (!this.alive) return;
    this.creditHouse = G.net?.credit || null; // a friend's hit: their house gets the points
    let dmg = h.dmg;
    const sp = h.spell;
    const def = this.def;
    // dementors shrug off almost everything
    let mult = 1;
    if (def.resist.all != null && sp !== 'patronum') mult = def.resist.all;
    if (def.weak[sp]) mult *= def.weak[sp];
    if (def.resist[sp] != null && def.resist.all == null) mult *= def.resist[sp];
    // shields
    if (this.shield > 0 && !h.splash && sp !== 'patronum') {
      if (this.type === 'malachar') {
        // his shield cracks under any spell; Expelliarmus shatters it at once
        this.shieldHits = (this.shieldHits ?? 3) - (sp === 'expelliarmus' || sp === 'finite' || sp === 'reducto' ? 3 : 1);
        if (this.shieldHits <= 0) {
          this.shield = 0;
          this.shieldMesh && (this.shieldMesh.visible = false);
          G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.6), 'Shield broken!', 'combo');
          G.audio.sfx('shatter');
          this.status.stun = 1.5;
        } else {
          G.audio.sfx('block');
          G.fx.burst(this.pos.clone().setY(this.pos.y + 1.2), 0x30c060, 20, 4);
          G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.4), `Shield cracking (${this.shieldHits})`, 'warn');
        }
        return;
      }
      if (sp === 'finite' || sp === 'reducto') { this.shield = 0; this.blockT = 0; if (this.shieldMesh) this.shieldMesh.visible = false; G.audio.sfx('shatter'); G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.3), 'Shield broken!', 'combo'); return; }
      if (this.type !== 'malachar' && h.proj && Math.random() < 0.5 + this.level * 0.08) {
        // reflect back at the player
        G.audio.sfx('reflect');
        const from = h.proj.pos.clone();
        const to = G.player.pos.clone().setY(G.player.pos.y + 1).sub(from).normalize();
        G.spells.spawnProjectile({ ...h.proj.def, dmg: h.proj.def.dmg * 0.6, enemy: true }, from, to, 'enemy', this);
      } else G.audio.sfx('block');
      G.fx.burst(this.pos.clone().setY(this.pos.y + 1.2), 0x6cc4ff, 20, 4);
      G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.3), 'Blocked', 'warn');
      return;
    }
    if (this.invuln) {
      G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.5), 'Immune', 'warn');
      G.fx.burst(this.pos.clone().setY(this.pos.y + 1.5), 0x40ff70, 16, 3);
      return;
    }
    if (this.status.frozen > 0 && !h.combo) mult *= 1.2;
    if (h.combo) mult *= comboMult();
    dmg *= mult;
    if (G.player.buffs.luck && Math.random() < 0.25) { dmg *= 2; G.ui.floatText(this.pos.clone().setY(this.pos.y + this.height + 0.6), 'Lucky!', 'combo'); }
    this.hp -= dmg;
    this.lastHitBy = sp;
    const top = this.pos.clone().setY(this.pos.y + this.height + 0.2);
    const cls = mult > 1.15 ? 'weak' : mult < 0.7 ? 'resist' : h.combo ? 'combo' : '';
    G.ui.floatText(top, `${Math.round(dmg)}${mult > 1.15 ? ' WEAK!' : mult < 0.3 ? ' resisted' : ''}`, 'dmg ' + cls);
    G.audio.sfx('enemyHurt');
    this.hurtT = 0.25;
    this.aggro = true;
    // spell effects
    if (this.hp > 0) {
      if (sp === 'stupefy') this.status.stun = Math.max(this.status.stun, (this.def.boss ? 0.5 : 1.7) * controlMult());
      if (sp === 'expelliarmus') {
        if (this.type === 'wizard' || this.type === 'duelist') this.disarm();
        if (h.dir) this.vel.addScaledVector(h.dir, this.def.boss ? 2 : 7);
      }
      if (sp === 'incendio') this.status.burn = 3;
      if (sp === 'petrificus') {
        if (this.type === 'dementor') G.ui.floatText(top, 'No effect', 'warn');
        else { this.status.frozen = (this.def.boss ? 1.4 : 3.5) * controlMult(); G.audio.sfx('petrificus'); }
      }
      if (sp === 'leviosa') this.lift(h.remote);
      if (sp === 'patronum' && this.type === 'dementor') this.flee = 3;
      if (this.type === 'troll') this.trollHit(sp);
      if (!this.status.stun && !this.status.frozen && this.anim.trigger) this.anim.trigger('hit');
    }
    if (this.hp <= 0) this.die(h);
    else if (this.o.fleeAt && this.hp < this.maxHp * this.o.fleeAt) {
      // escapes rather than falling: a swirl of smoke, then gone
      G.fx.smokePuff(this.pos.clone().setY(this.pos.y + 1), 0x101810, 30, { size: 1.5, size1: 4, speed: 4, alpha: 0.6 });
      G.audio.sfx('dementor');
      if (this.o.fleeLine) G.ui.banner(this.name + ' escapes!', this.o.fleeLine, '');
      this.fled = true;
      this.root.visible = false;
      this.die({ fled: true });
    }
  }

  // blinded foes stumble about and cannot aim
  wanderBlind(dt) {
    this.blindT = (this.blindT ?? 0) - dt;
    if (this.blindT <= 0) { this.blindT = rand(0.8, 1.6); this.blindDir = new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize(); }
    this.moveToward(this.pos.clone().addScaledVector(this.blindDir, 3), this.def.speed * 0.4, dt, 3);
    this.yaw = Math.atan2(this.blindDir.x, this.blindDir.z);
    this.castWind = 0;
    this.anim.update?.(dt, 1);
  }
  statusFX(dt) {
    const S = this.status, r = Math.random();
    const at = () => _v.copy(this.pos).setY(this.pos.y + rand(0.2, this.height));
    if (S.wet > 0 && r < 0.3) G.fx.emit({ pos: at(), color: 0x6ab8ff, count: 1, speed: 0.3, size: 0.1, life: 0.5, intensity: 1.6, gravity: 9, noScale: true });
    if (S.chill > 0 && r < 0.3) G.fx.emit({ pos: at(), color: 0xd8f8ff, count: 1, speed: 0.4, size: 0.14, life: 0.7, intensity: 2.2, noScale: true });
    if (S.blind > 0 && r < 0.25) G.fx.smokePuff(_v.copy(this.pos).setY(this.pos.y + this.height * 0.9), 0x14101c, 1, { size: 0.4, size1: 0.8, life: 0.5, alpha: 0.5 });
    if (S.silence > 0 && r < 0.12) G.fx.emit({ pos: _v.copy(this.pos).setY(this.pos.y + this.height + 0.3), color: 0xc0c8d8, count: 1, speed: 0.4, size: 0.18, life: 0.6, intensity: 2, noScale: true });
    if (S.bound > 0 && r < 0.3) G.fx.emit({ pos: at(), color: 0xd8b070, count: 1, speed: 0.6, size: 0.12, life: 0.4, intensity: 1.8, noScale: true });
    if (S.laugh > 0) { if (r < 0.15) G.fx.emit({ pos: _v.copy(this.pos).setY(this.pos.y + this.height + 0.2), color: 0xffd040, count: 1, speed: 1.2, size: 0.15, life: 0.5, intensity: 3, noScale: true }); this.root.rotation.z = Math.sin(this.t * 25) * 0.08; }
    else if (this.root.rotation.z) this.root.rotation.z = 0;
    if (this.tumble > 0) { this.tumble -= dt; this.model.root.rotation.x = (1 - this.tumble / 0.7) * Math.PI * 2; if (this.tumble <= 0) this.model.root.rotation.x = 0; }
  }

  disarm() {
    if (this.status.disarmed > 0) return;
    this.status.disarmed = 4.5;
    if (this.model.parts?.wand) this.model.parts.wand.visible = false;
    // the wand spins away
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.36, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a4a }));
    w.position.copy(this.pos).setY(this.pos.y + 1.3);
    G.scene.add(w);
    const v = new THREE.Vector3(rand(-3, 3), 6, rand(-3, 3));
    G.enemies.debris.push({ m: w, v, t: 0, life: 2 });
    G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.4), 'Disarmed!', 'combo');
    G.story?.onEvent('disarm');
  }

  lift(remote) {
    if (this.def.boss && this.type !== 'troll') { G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.4), 'Too strong', 'warn'); return; }
    if (this.type === 'troll') return; // handled by trollHit (the club)
    this.status.lifted = 3.5 * controlMult();
    this.liftBase = this.pos.y;
    if (!remote) G.spells.holdEnemy(this); // a friend's Leviosa: they hold it on their screen
    G.ui.floatText(this.pos.clone().setY(this.pos.y + 2.4), 'Levitating', 'combo');
  }
  endLift(slam) {
    this.status.lifted = 0;
    if (this.hoisted) { this.hoisted = false; this.root.rotation.x = 0; }
    if (slam) {
      this.vel.y = -22;
      this.slamming = true;
    }
  }
  throwTo(v) {
    this.status.lifted = 0;
    this.thrown = true;
    this.vel.copy(v);
  }

  onLumos(d, from = G.player.pos) {
    if (this.type === 'pixie') { this.status.stun = 2.5; G.ui.floatText(this.pos.clone().setY(this.pos.y + 1), 'Dazzled', 'combo'); }
    if (this.type === 'dementor') {
      this.takeHit({ dmg: 260, spell: 'lumos' });
      this.vel.add(_v.subVectors(this.pos, from || G.player.pos).setY(0).normalize().multiplyScalar(6));
    }
  }
  onPatronus() {
    if (this.type === 'dementor') { this.flee = 4; this.takeHit({ dmg: 60, spell: 'patronum' }); }
  }

  die(h = {}) {
    this.alive = false;
    this.hp = 0;
    this.deadT = 0;
    this.status.lifted = 0;
    this.ice.visible = false;
    if (this.shieldMesh) this.shieldMesh.visible = false;
    if (this.anim.set) this.anim.set('down');
    const dir = h.dir || _v.subVectors(this.pos, G.player.pos).setY(0).normalize();
    this.vel.copy(dir).multiplyScalar(this.def.boss ? 2 : 6).setY(this.type === 'pixie' ? 2 : 3);
    G.enemies.onDeath(this, h);
    if (this.type === 'pixie') {
      G.fx.burst(this.pos.clone().setY(this.pos.y + 0.3), 0x5aa0ff, 40, 5);
      G.audio.sfx('pixie');
    }
    if (this.type === 'dementor') {
      G.fx.smokePuff(this.pos.clone().setY(this.pos.y + 1.6), 0x0a0a10, 30, { size: 2, size1: 4, speed: 4, alpha: 0.6 });
      G.fx.burst(this.pos.clone().setY(this.pos.y + 1.6), 0xcfeaff, 60, 8);
      G.audio.sfx('dementor');
    }
    if (this.cleanupBoss) this.cleanupBoss();
    this.def.onDie?.call(this, h);
  }

  // ------------------------------------------------------------ per-frame
  // online: chase whichever student is nearer (sticking with the current one unless the other
  // is clearly closer); minigame opponents only ever face the host
  pickTarget(dt) {
    const P = G.player;
    const others = G.minigame ? null : G.net?.proxies();
    if (!others || !others.length) return (this.tgt = P);
    this.tgtT = (this.tgtT || 0) - dt;
    const cur = this.tgt;
    if (this.tgtT > 0 && cur && cur.alive && (cur === P || others.includes(cur))) return cur;
    this.tgtT = 0.8;
    // a student in a menu is left alone while someone else is still playing
    let best = P, bd = P.alive && !G.paused ? P.pos.distanceTo(this.pos) - (cur === P ? 3 : 0) : Infinity;
    for (const q of others) {
      if (!q.alive) continue;
      const d = q.pos.distanceTo(this.pos) - (cur === q ? 3 : 0);
      if (d < bd) { bd = d; best = q; }
    }
    return (this.tgt = best);
  }

  update(dt0) {
    const S = this.status;
    // Glacius chill and Arresto Momentum slow everything this foe does
    this.inSlow = G.spells.fields?.length ? G.spells.inSlowField(this.pos) : false;
    const dt = dt0 * (this.inSlow ? 0.3 : 1) * (S.chill > 0 ? 0.55 : 1);
    this.t += dt;
    const p = this.pickTarget(dt);
    if (!this.alive) {
      this.deadT += dt;
      this.vel.y -= 20 * dt;
      this.vel.x = damp(this.vel.x, 0, 2, dt); this.vel.z = damp(this.vel.z, 0, 2, dt);
      this.pos.addScaledVector(this.vel, dt);
      const g = G.zone.colliders.ground(this.pos.x, this.pos.z, this.pos.y + 1);
      if (this.pos.y < g.y) { this.pos.y = g.y; this.vel.y = 0; }
      if (this.type === 'dementor' || this.type === 'pixie') this.root.scale.multiplyScalar(1 - dt * 2);
      if (this.deadT > 2.2) this.root.position.y -= dt * 0.8; else this.root.position.copy(this.pos);
      this.anim.update?.(dt, 0);
      if (this.deadT > 3.5) this.remove = true;
      return;
    }
    for (const k of ['stun', 'frozen', 'disarmed', 'wet', 'chill', 'blind', 'silence', 'bound', 'laugh']) S[k] = Math.max(0, S[k] - dt0);
    this.pulledT = Math.max(0, (this.pulledT || 0) - dt0);
    this.grounded = Math.max(0, (this.grounded || 0) - dt0);
    this.statusFX(dt0);
    // banished foes slammed into walls are stunned
    if (this.banished > 0) {
      this.banished -= dt0;
      const sp0 = Math.hypot(this.vel.x, this.vel.z);
      if (this._lastSp > 8 && sp0 < this._lastSp * 0.4) { this.banished = 0; this.takeHit({ dmg: 18, spell: 'thrown' }); this.status.stun = Math.max(this.status.stun, 2); G.audio.sfx('slam'); G.cam.shake(0.2); G.fx.smokePuff(this.pos, 0x6a5a4a, 8); }
      this._lastSp = sp0;
    }
    if (S.disarmed <= 0 && this.model.parts?.wand) this.model.parts.wand.visible = true;
    // burning
    if (S.burn > 0) {
      S.burn -= dt;
      this.hp -= dt * 7;
      if (Math.random() < 0.6) G.fx.emit({ pos: _v.copy(this.pos).setY(this.pos.y + rand(0.2, this.height)), color: 0xffb030, color2: 0xff2000, count: 2, speed: 1, size: 0.4, size1: 0.1, life: 0.5, intensity: 3, up: 2, spread: this.radius * 2, noScale: true });
      if (this.hp <= 0) { this.die({ spell: 'incendio' }); return; }
    }
    this.ice.visible = S.frozen > 0;
    this.hurtT = Math.max(0, (this.hurtT || 0) - dt);
    // lifted by Leviosa
    if (S.lifted > 0) {
      S.lifted -= dt;
      const g = G.zone.colliders.ground(this.pos.x, this.pos.z, this.pos.y + 1).y;
      this.pos.y = damp(this.pos.y, g + 2.6, 4, dt);
      this.root.rotation.y += dt * 1.5;
      if (this.hoisted) { this.root.rotation.x = Math.PI; this.root.position.y = this.pos.y + this.height; }
      this.anim.set?.(this.type === 'wizard' || this.type === 'duelist' ? 'lifted' : 'idle');
      if (Math.random() < 0.5) G.fx.emit({ pos: this.pos, color: 0xc28bff, count: 1, speed: 0.8, size: 0.2, life: 0.6, intensity: 3, spread: 1, noScale: true });
      if (S.lifted <= 0) { this.vel.y = -2; this.hoisted = false; this.root.rotation.x = 0; }
      if (!this.hoisted) this.root.position.copy(this.pos);
      else this.root.position.set(this.pos.x, this.pos.y + this.height, this.pos.z);
      this.anim.update?.(dt, 0);
      return;
    }
    // thrown / slammed ballistic flight
    if (this.thrown || this.slamming) {
      this.vel.y -= 22 * dt;
      this.pos.addScaledVector(this.vel, dt);
      const g = G.zone.colliders.ground(this.pos.x, this.pos.z, this.pos.y + 0.5);
      G.zone.colliders.resolve(this.pos, this.radius, this.height);
      if (this.pos.y <= g.y) {
        this.pos.y = g.y;
        const impact = this.slamming ? 0 : 26;
        this.thrown = false; this.slamming = false;
        this.vel.set(0, 0, 0);
        G.fx.smokePuff(this.pos, 0x6a5a4a, 10);
        G.fx.shock(this.pos.clone().setY(this.pos.y + 0.1), 0xc28bff, 3, 0.4);
        G.audio.sfx('slam');
        G.cam.shake(0.2);
        this.status.stun = 1.5;
        if (impact) this.takeHit({ dmg: impact, spell: 'thrown' });
        for (const e of G.enemies.list) if (e !== this && e.alive && e.pos.distanceTo(this.pos) < 2.5) e.takeHit({ dmg: 18, spell: 'thrown', splash: true });
      }
      this.root.position.copy(this.pos);
      this.anim.update?.(dt, 0);
      return;
    }
    if (S.frozen > 0) { this.root.position.copy(this.pos); return; }
    if (S.stun > 0) {
      this.anim.set?.('stunned');
      if (Math.random() < 0.15) G.fx.emit({ pos: _v.copy(this.pos).setY(this.pos.y + this.height + 0.2), color: 0xffe060, count: 1, speed: 1, size: 0.15, life: 0.5, intensity: 3, noScale: true });
    }
    // AI
    const awake = this.canAct && G.mode === 'play' && p.alive && !(p === G.player && G.paused);
    if (this.canAct && this.status.blind > 0 && G.mode === 'play') this.wanderBlind(dt);
    else if (awake && this.def.ai) this.def.ai.call(this, dt, p);
    else if (awake) this[this.type === 'duelist' ? 'aiWizard' : 'ai_' + this.type]?.(dt, p);
    else { this.vel.x = damp(this.vel.x, 0, 6, dt); this.vel.z = damp(this.vel.z, 0, 6, dt); }
    // physics
    if (this.def.flying) {
      this.pos.addScaledVector(this.vel, dt);
      // flyers hover over water rather than sinking to the lake bed
      const g = Math.max(G.zone.colliders.ground(this.pos.x, this.pos.z, this.pos.y + 3).y, G.zone.colliders.water);
      this.pos.y = damp(this.pos.y, g + (this.grounded > 0 ? 0 : this.hoverY), 3, dt);
    } else {
      this.vel.y -= 20 * dt;
      this.pos.addScaledVector(this.vel, dt);
      const g = G.zone.colliders.ground(this.pos.x, this.pos.z, this.pos.y + 0.6);
      if (this.pos.y <= g.y + 0.05) { this.pos.y = g.y; this.vel.y = 0; }
    }
    G.zone.colliders.resolve(this.pos, this.radius, this.height);
    // separation from others & player
    for (const e of G.enemies.list) {
      if (e === this || !e.alive) continue;
      const dx = this.pos.x - e.pos.x, dz = this.pos.z - e.pos.z, d = Math.hypot(dx, dz), m = this.radius + e.radius;
      if (d < m && d > 0.001) { this.pos.x += (dx / d) * (m - d) * 0.5; this.pos.z += (dz / d) * (m - d) * 0.5; }
    }
    if (!this.def.flying || this.type === 'dementor') {
      const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, d = Math.hypot(dx, dz), m = this.radius + p.radius;
      if (d < m && d > 0.001) { this.pos.x += (dx / d) * (m - d); this.pos.z += (dz / d) * (m - d); }
    }
    this.root.position.copy(this.pos);
    this.root.rotation.y = dampAngle(this.root.rotation.y, this.yaw, 10, dt);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (S.stun <= 0 && this.anim.set && (this.type === 'wizard' || this.type === 'duelist' || this.type === 'malachar')) {
      this.anim.set(this.blocking ? 'block' : this.castWind > 0 ? 'aim' : 'idle');
    }
    this.anim.update?.(dt, sp);
    if (this.shieldMesh) {
      this.shieldMesh.position.copy(this.pos).setY(this.pos.y + this.height * 0.55);
      this.shieldMesh.material.uniforms.time.value = this.t;
    }
  }

  face(target, dt, rate = 8) {
    const want = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    this.yaw = dampAngle(this.yaw, want, rate, dt);
  }
  moveToward(target, speed, dt, accel = 6) {
    _v.subVectors(target, this.pos).setY(0);
    const d = _v.length();
    if (d > 0.01) _v.multiplyScalar(speed / d);
    this.vel.x = damp(this.vel.x, _v.x, accel, dt);
    this.vel.z = damp(this.vel.z, _v.z, accel, dt);
    return d;
  }
  wandPos() {
    this.root.updateMatrixWorld(true);
    return this.model.wandTip ? this.model.wandTip.getWorldPosition(new THREE.Vector3()) : this.pos.clone().setY(this.pos.y + this.height * 0.7);
  }
  castAt(def, target, lead = 0.5, spread = 0) {
    const from = this.wandPos();
    const tp = target.pos.clone().setY(target.pos.y + 1.1);
    const dist = tp.distanceTo(from);
    tp.addScaledVector(target.vel, (dist / (def.speed || 25)) * lead);
    const dir = tp.sub(from).normalize();
    if (spread) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread).normalize();
    G.spells.spawnProjectile(def, from, dir, 'enemy', this);
    G.audio.sfx(def.id === 'curse' || def.id === 'killing' ? 'curse' : def.id);
    this.anim.trigger?.('cast');
    G.fx.emit({ pos: from, color: def.color, count: 14, speed: 3, size: 0.2, life: 0.3, intensity: 3 });
  }

  // ------------------------------------------------------------ AI: pixie
  ai_pixie(dt, p) {
    this.anim.update(dt);
    const d = this.pos.distanceTo(p.pos);
    if (!this.aggro && d > 14) return;
    this.aggro = true;
    this.state = this.state === 'idle' ? 'orbit' : this.state;
    this.diveT = (this.diveT ?? rand(1.5, 4)) - dt;
    if (this.state === 'orbit') {
      const a = this.t * 1.4 + this.id;
      const tgt = _w.set(p.pos.x + Math.cos(a) * 4, 0, p.pos.z + Math.sin(a) * 4);
      this.moveToward(tgt, this.def.speed, dt, 3);
      this.hoverY = 1.8 + Math.sin(this.t * 2 + this.id) * 0.8;
      if (this.diveT <= 0) { this.state = 'dive'; this.diveTime = 0; G.audio.sfx('pixie'); }
    } else if (this.state === 'dive') {
      this.diveTime += dt;
      this.moveToward(p.pos, 11, dt, 8);
      this.hoverY = 1.0;
      if (d < 1.2) {
        p.damage(6 * (G.enemies.dmgScale || 1), { knock: _v.subVectors(p.pos, this.pos).setY(0).normalize().multiplyScalar(3).clone() });
        this.state = 'orbit'; this.diveT = rand(2.5, 4.5);
        this.vel.multiplyScalar(-1);
      }
      if (this.diveTime > 2) { this.state = 'orbit'; this.diveT = rand(2, 4); }
    }
    this.face(p.pos, dt);
  }

  // ------------------------------------------------------------ AI: dark wizard / duellist
  ai_wizard(dt, p) { this.aiWizard(dt, p); }
  aiWizard(dt, p) {
    if (this.o.hold) { this.face(p.pos, dt); this.vel.x = this.vel.z = 0; return; } // waiting for the duel to start
    const d = this.pos.distanceTo(p.pos);
    if (!this.aggro && d > 20) return;
    this.aggro = true;
    const L = this.level;
    this.face(p.pos, dt);
    // strafe at preferred range
    this.strafeT = (this.strafeT ?? 0) - dt;
    if (this.strafeT <= 0) { this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.strafeT = rand(1.2, 3); }
    const want = this.o.range || 10;
    const to = _v.subVectors(p.pos, this.pos).setY(0).normalize();
    const side = new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(this.strafeDir);
    const radial = d > want + 2 ? 1 : d < want - 3 ? -1 : 0;
    const mv = side.multiplyScalar(0.8).addScaledVector(to, radial);
    if (this.status.disarmed > 0) mv.copy(to).multiplyScalar(-1).add(side);
    const target = this.pos.clone().addScaledVector(mv, 3);
    if (this.o.bounds) { target.x = clamp(target.x, this.o.bounds.x0, this.o.bounds.x1); target.z = clamp(target.z, this.o.bounds.z0, this.o.bounds.z1); }
    this.moveToward(target, this.def.speed * (this.blocking ? 0.4 : 1), dt, 5);
    // react to incoming player spells
    this.blockT = Math.max(0, (this.blockT || 0) - dt);
    this.blocking = this.blockT > 0;
    if (this.shieldMesh) this.shieldMesh.visible = this.blocking;
    this.shield = this.blocking ? 1 : 0;
    this.reactCd = (this.reactCd || 0) - dt;
    if (this.reactCd <= 0 && this.status.disarmed <= 0) {
      for (const pr of G.spells.projectiles) {
        if (pr.team !== 'player' && pr.team !== 'remote') continue;
        const dd = pr.pos.distanceTo(this.pos);
        if (dd < 9 && pr.vel.dot(_w.subVectors(this.pos, pr.pos)) > 0) {
          this.reactCd = 1.2;
          const r = Math.random();
          const blockChance = this.o.block ?? 0.12 + L * 0.08;
          const dodgeChance = this.o.dodge ?? 0.1 + L * 0.06;
          if (r < blockChance) { this.blockT = 0.9; this.ensureShield(); }
          else if (r < blockChance + dodgeChance) {
            this.vel.addScaledVector(new THREE.Vector3(-to.z, 0, to.x), (Math.random() < 0.5 ? -1 : 1) * 9);
            G.fx.smokePuff(this.pos, 0x888888, 4);
          }
          break;
        }
      }
    }
    // casting with a readable wind-up
    if (this.status.disarmed > 0 || this.blocking || this.status.silence > 0) { this.castWind = 0; return; }
    this.castCd -= dt;
    if (this.castWind > 0) {
      this.castWind -= dt;
      if (Math.random() < 0.7) G.fx.emit({ pos: this.wandPos(), color: this.nextSpell.color, count: 2, speed: 1, size: 0.25, life: 0.3, intensity: 3, noScale: true });
      if (this.castWind <= 0) {
        const s = this.nextSpell;
        const volley = this.o.volley || (L >= 4 ? 2 : 1);
        for (let i = 0; i < volley; i++) setTimeout(() => this.alive && this.canAct && this.castAt(s, p, 0.3 + L * 0.12, (i - (volley - 1) / 2) * 0.08), i * 160);
        this.castCd = (this.o.rate || Math.max(0.9, 2.6 - L * 0.32)) * rand(0.8, 1.25);
      }
    } else if (this.castCd <= 0 && d < 30) {
      const pool = this.o.spells || ['curse'];
      this.nextSpell = ENEMY_SPELLS[pick(pool)];
      this.castWind = Math.max(0.25, 0.6 - L * 0.06);
    }
  }
  ensureShield() {
    if (this.shieldMesh) { this.shieldMesh.visible = true; return; }
    const m = G.spells.shieldMat.clone();
    m.uniforms = THREE.UniformsUtils.clone(G.spells.shieldMat.uniforms);
    m.uniforms.color.value = new THREE.Color(this.type === 'malachar' ? 0x30c060 : 0x4a90ff).multiplyScalar(1.4);
    m.uniforms.strength.value = 1;
    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(this.type === 'malachar' ? 1.6 : 1.2, 24, 16), m);
    G.scene.add(this.shieldMesh);
  }

  // ------------------------------------------------------------ AI: dementor
  ai_dementor(dt, p) {
    this.anim.update(dt);
    if (this.o.lord) {
      this.summonT = (this.summonT ?? 6) - dt;
      if (this.summonT <= 0 && G.enemies.list.filter((e) => e.alive && e.type === 'dementor').length < 6) {
        this.summonT = 11;
        for (let i = 0; i < 2; i++) { const e = G.enemies.spawn('dementor', this.pos.clone().add(new THREE.Vector3(rand(-6, 6), 0, rand(-6, 6))), { aggro: true }); e.summon = true; }
        G.ui.toast('The Dementor lord calls more of its kind!', 'info');
        G.audio.sfx('dementor');
      }
    }
    this.hoverY = 0;
    const d = this.pos.distanceTo(p.pos);
    if (!this.aggro && d > 22) return;
    this.aggro = true;
    if (this.flee > 0) {
      this.flee -= dt;
      this.moveToward(_v.copy(this.pos).add(_w.subVectors(this.pos, p.pos).setY(0).normalize().multiplyScalar(10)), 6, dt, 4);
      this.anim.set('idle');
      return;
    }
    this.face(p.pos, dt, 3);
    this.moveToward(p.pos, d > 4 ? this.def.speed : 0.5, dt, 1.5);
    if (d < 8) {
      const a = dt * 4 * (G.enemies.dmgScale || 1);
      if (p.drain) p.drain(a); // a friend: their screen applies it
      else {
        p.hp -= a;
        p.lastHurt = 0;
        p.mana = Math.max(0, p.mana - dt * 4);
        if (p.hp <= 0 && p.alive) p.faint();
      }
    }
    this.atkT = (this.atkT ?? rand(2, 4)) - dt;
    this.anim.set(this.atkT < 0.7 ? 'reach' : 'idle');
    if (this.atkT <= 0 && d < 16) {
      this.atkT = rand(3, 5);
      this.castAt(ENEMY_SPELLS.soul, p, 0.2);
    }
  }

  // ------------------------------------------------------------ AI: troll boss
  trollHit(sp) {
    if (sp === 'leviosa' && this.club && !this.clubGone) {
      // the canon trick: float the club out of its hand
      this.clubGone = 8;
      this.status.stun = 3.5;
      const club = this.model.club;
      const wp = club.getWorldPosition(new THREE.Vector3());
      const wq = club.getWorldQuaternion(new THREE.Quaternion());
      club.parent.remove(club);
      G.scene.add(club);
      club.position.copy(wp);
      club.quaternion.copy(wq);
      G.enemies.floatingClub = { club, t: 0, troll: this, base: wp.clone() };
      banner('Wingardium Leviosa!', 'The troll’s club floats out of its hand. Now hit it — or drop the club on its head!', 'unlock');
      G.audio.sfx('leviosa');
      G.story?.onEvent('trollClub');
      this.anim.set('stagger');
    } else if (sp === 'leviosa') G.ui.floatText(this.pos.clone().setY(this.pos.y + 4.6), 'Too heavy to lift', 'warn');
  }
  ai_troll(dt, p) {
    const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    this.club = this.model.club;
    if (!this.aggro && d > 22) { this.anim.update(dt, 0); return; }
    if (!this.roared) { this.roared = true; this.anim.set('roar'); this.atk = { kind: 'roar', t: 0 }; G.audio.sfx('roar'); G.cam.shake(0.4); }
    const phase2 = this.hp < this.maxHp * 0.5;
    this.phaseLabel = phase2 ? 'Enraged!' : '';
    if (phase2 && !this.enraged) { this.enraged = true; this.anim.set('roar'); this.atk = { kind: 'roar', t: 0 }; G.audio.sfx('roar'); banner('The troll is enraged!', 'Watch for shockwaves — jump over them!', ''); }
    const spd = phase2 ? 1.25 : 1;
    if (this.clubGone > 0) {
      this.clubGone -= dt;
      if (this.clubGone <= 0) {
        const fc = G.enemies.floatingClub;
        if (fc) { G.scene.remove(fc.club); this.model.root.traverse(() => {}); }
        // grab it back
        const hand = this.model.parts.arms[1].hand;
        const club = this.model.club;
        if (club.parent !== hand) { club.parent?.remove(club); hand.add(club); club.position.set(0, 0, 0); club.rotation.set(Math.PI / 2, 0, 0); }
        G.enemies.floatingClub = null;
      }
    }
    const atk = this.atk;
    if (atk) {
      atk.t += dt * spd;
      if (atk.kind === 'roar') { if (atk.t > 1.4) this.atk = null; this.anim.update(dt, 0); return; }
      if (atk.kind === 'slam') {
        this.anim.set(atk.t < 0.9 ? 'windup' : 'slam');
        if (atk.t > 1.8) this.atk = null;
      } else if (atk.kind === 'sweep') {
        this.anim.set(atk.t < 0.85 ? 'sweepWind' : 'sweep');
        if (atk.t > 1.6) this.atk = null;
      } else if (atk.kind === 'throw') {
        this.anim.set('throw');
        if (atk.t > 1.2) this.atk = null;
      } else if (atk.kind === 'stomp') {
        this.anim.set(atk.t < 0.8 ? 'windup' : 'slam');
        if (atk.t > 1.6) this.atk = null;
      }
      this.vel.x = damp(this.vel.x, 0, 8, dt); this.vel.z = damp(this.vel.z, 0, 8, dt);
      this.anim.update(dt, 0);
      return;
    }
    this.face(p.pos, dt, 3);
    this.atkCd = (this.atkCd ?? 1.5) - dt * spd;
    const unarmed = this.clubGone > 0;
    if (d > 5) { this.moveToward(p.pos, this.def.speed * spd, dt, 3); this.anim.set('idle'); }
    else { this.vel.x = damp(this.vel.x, 0, 6, dt); this.vel.z = damp(this.vel.z, 0, 6, dt); }
    if (this.atkCd <= 0) {
      const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      if (d < 7 && !unarmed) {
        if (Math.random() < 0.55) {
          // overhead slam: circle in front
          const at = this.pos.clone().addScaledVector(fwd, 3.2);
          this.atk = { kind: 'slam', t: 0 };
          G.enemies.telegraph(at, 3.2, 0.9 / spd, () => {
            G.audio.sfx('slam'); G.cam.shake(0.55); G.input.rumble(0.9, 0.6, 300);
            G.fx.shock(at.clone().setY(at.y + 0.1), 0xd8b080, 5, 0.5);
            G.fx.smokePuff(at, 0x7a6a5a, 16, { speed: 4 });
            for (const q of G.enemies.players()) if (q.pos.distanceTo(at) < 3.4 && q.pos.y - at.y < 1.5) q.damage(28 * (G.enemies.dmgScale || 1), { knock: _v.subVectors(q.pos, at).setY(0).normalize().multiplyScalar(8).clone() });
            if (phase2) this.shockwave(at);
          });
        } else {
          // horizontal sweep: wide circle around the troll
          this.atk = { kind: 'sweep', t: 0 };
          G.enemies.telegraph(this.pos.clone(), 5.2, 0.85 / spd, () => {
            G.audio.sfx('whoosh'); G.cam.shake(0.3);
            for (const q of G.enemies.players()) if (q.pos.distanceTo(this.pos) < 5.4 && q.pos.y - this.pos.y < 1.2) q.damage(20 * (G.enemies.dmgScale || 1), { knock: _v.subVectors(q.pos, this.pos).setY(0).normalize().multiplyScalar(10).clone() });
          }, { color: 0xff8020 });
        }
        this.atkCd = rand(1.6, 2.6);
      } else if (d >= 7 || unarmed) {
        if (phase2 && Math.random() < 0.4) {
          this.atk = { kind: 'stomp', t: 0 };
          G.enemies.telegraph(this.pos.clone(), 3, 0.8 / spd, () => { G.audio.sfx('slam'); G.cam.shake(0.5); this.shockwave(this.pos.clone()); });
        } else {
          // throw a boulder where the player is standing
          this.atk = { kind: 'throw', t: 0 };
          const at = p.pos.clone();
          G.enemies.telegraph(at, 2.2, 1.1 / spd, () => {});
          setTimeout(() => {
            if (!this.alive) return;
            const from = this.pos.clone().setY(this.pos.y + 4.5);
            const flat = Math.hypot(at.x - from.x, at.z - from.z);
            const tFlight = 0.9;
            const vel = new THREE.Vector3((at.x - from.x) / tFlight, (at.y - from.y + 0.5 * 9 * tFlight * tFlight) / tFlight, (at.z - from.z) / tFlight);
            const pr = G.spells.spawnProjectile(ENEMY_SPELLS.boulder, from, vel.clone().normalize(), 'enemy', this);
            pr.vel.copy(vel);
            pr.life = 3;
            pr.splashOnLand = at;
          }, 350 / spd);
        }
        this.atkCd = rand(2.2, 3.2);
      }
    }
    this.anim.update(dt, Math.hypot(this.vel.x, this.vel.z));
  }
  shockwave(center) {
    G.enemies.addWave(center);
    G.net?.wave(center); // every screen runs its own copy and checks its own student
  }

  // ------------------------------------------------------------ AI: final boss
  ai_malachar(dt, p) {
    const B = this;
    const d = this.pos.distanceTo(p.pos);
    if (!this.aggro && d > 30) { this.anim.update(dt, 0); return; }
    this.aggro = true;
    const f = this.hp / this.maxHp;
    const phase = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
    if (phase !== this.phase) this.enterPhase(phase);
    this.face(p.pos, dt, 6);
    const C = this.o.center;
    if (phase === 2) {
      // shielded at the centre while his summons fight
      this.invuln = true;
      this.moveToward(C, 3, dt);
      this.hoverY = 0;
      this.phase2T = (this.phase2T ?? 0) + dt;
      const left = G.enemies.list.filter((e) => e.alive && e.summon).length;
      this.phaseLabel = left ? `Defeat his summons (${left})` : '';
      // never let this phase stall: after 40 s his remaining summons vanish
      if (left && this.phase2T > 40) {
        for (const e of G.enemies.list) if (e.alive && e.summon) e.die({});
        tip('The darkness falters — Malachar is exposed!', 'info');
      }
      if ((!left || this.phase2T > 40) && this.summoned) {
        this.invuln = false;
        this.shieldMesh && (this.shieldMesh.visible = false);
        this.hp = Math.min(this.hp, this.maxHp * 0.33);
        this.enterPhase(3);
      }
      this.attackT = (this.attackT ?? 2) - dt;
      if (this.attackT <= 0) { this.attackT = 3.2; this.eruptions(3, 1.2); }
      this.anim.update(dt, 0);
      return;
    }
    this.strafeT = (this.strafeT ?? 0) - dt;
    if (this.strafeT <= 0) { this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.strafeT = rand(1.5, 3); }
    const to = _v.subVectors(p.pos, this.pos).setY(0).normalize();
    const side = new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(this.strafeDir);
    const radial = d > 13 ? 1 : d < 8 ? -1 : 0;
    const tgt = this.pos.clone().addScaledVector(side.addScaledVector(to, radial), 3);
    if (tgt.distanceTo(C) > 20) tgt.lerp(C, 0.5);
    this.moveToward(tgt, this.def.speed * (phase === 3 ? 1.3 : 1), dt, 4);
    if (phase === 3) {
      this.hoverY = 1.2 + Math.sin(this.t * 2) * 0.3;
      this.pos.y = damp(this.pos.y, G.zone.colliders.ground(this.pos.x, this.pos.z, this.pos.y + 3).y + this.hoverY, 3, dt);
      if (Math.random() < 0.4) G.fx.emit({ pos: this.pos.clone().setY(this.pos.y + 1), color: 0x30ff60, count: 1, speed: 1, size: 0.6, size1: 0.1, life: 1, intensity: 2, spread: 1.5, noScale: true });
    }
    // shield cycle (phase 1): only Expelliarmus breaks it
    this.shieldCd = (this.shieldCd ?? 6) - dt;
    if (phase === 1 && this.shieldCd <= 0 && !this.shield) {
      this.shield = 1; this.shieldHits = 3; this.shieldT = 6; this.ensureShield(); this.shieldMesh.visible = true; this.shieldCd = 12;
      tip('Malachar raises a dark shield: hit it 3 times or shatter it with <b>Expelliarmus</b>!', 'info');
    }
    // the shield never lasts long
    if (this.shield) { this.shieldT = (this.shieldT ?? 6) - dt; if (this.shieldT <= 0 || phase !== 1) { this.shield = 0; G.audio.sfx('nox'); } }
    if (this.shieldMesh) this.shieldMesh.visible = this.shield > 0;
    this.attackT = (this.attackT ?? 2) - dt;
    if (this.attackT <= 0) {
      const r = Math.random();
      if (phase === 1) {
        if (r < 0.55) this.volley(3, 0.14);
        else this.eruptions(2, 1.1);
        this.attackT = rand(1.6, 2.4);
      } else {
        if (r < 0.35) this.volley(5, 0.12);
        else if (r < 0.65) this.beam();
        else this.meteorRain();
        this.attackT = rand(1.4, 2.0);
      }
    }
    this.anim.update(dt, Math.hypot(this.vel.x, this.vel.z));
  }
  enterPhase(n) {
    this.phase = n;
    if (n === 1) { this.phaseLabel = 'Phase I'; return; }
    if (n === 2) {
      this.phaseLabel = 'Phase II';
      this.shield = 0;
      this.ensureShield();
      this.shieldMesh.visible = true;
      banner('Malachar calls the darkness', 'He is untouchable while his Dementors and pixies remain. Expecto Patronum!', '');
      G.audio.sfx('dementor');
      postFlash(0.2);
      const C = this.o.center;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const e = G.enemies.spawn('dementor', C.clone().add(new THREE.Vector3(Math.cos(a) * 12, 0, Math.sin(a) * 12)), { aggro: true });
        e.summon = true;
      }
      for (let i = 0; i < 4; i++) {
        const e = G.enemies.spawn('pixie', C.clone().add(new THREE.Vector3(rand(-8, 8), 2, rand(-8, 8))), { aggro: true });
        e.summon = true;
      }
      this.summoned = true;
    }
    if (n === 3) {
      this.phaseLabel = 'Phase III — Enraged';
      this.invuln = false;
      if (this.shieldMesh) this.shieldMesh.visible = false;
      this.shield = 0;
      banner('Malachar rises!', 'Watch the ground and dodge the beam!', '');
      G.audio.sfx('roar');
      G.cam.shake(0.4);
    }
  }
  volley(n, spread) {
    const p = this.tgt || G.player;
    this.anim.set('aim');
    G.fx.emit({ pos: this.wandPos(), color: 0x40ff70, count: 20, speed: 2, size: 0.3, life: 0.4, intensity: 3 });
    setTimeout(() => {
      if (!this.alive || !this.canAct) return;
      for (let i = 0; i < n; i++) this.castAt(ENEMY_SPELLS.curse, p, 0.4, (i - (n - 1) / 2) * spread);
    }, 400);
  }
  eruptions(n, delay) {
    const p = this.tgt || G.player;
    for (let i = 0; i < n; i++) {
      const at = p.pos.clone().add(new THREE.Vector3(rand(-3, 3) * (i ? 1 : 0), 0, rand(-3, 3) * (i ? 1 : 0)));
      at.y = G.zone.colliders.ground(at.x, at.z, at.y + 2).y;
      G.enemies.telegraph(at, 2.4, delay + i * 0.2, () => {
        G.fx.emit({ pos: at.clone().setY(at.y + 0.3), color: 0x30ff60, color2: 0x003010, count: 50, speed: 7, size: 0.5, life: 0.8, intensity: 3, up: 8 });
        G.fx.shock(at.clone().setY(at.y + 0.1), 0x30ff60, 3, 0.4);
        G.audio.sfx('explode');
        G.cam.shake(0.2);
        for (const q of G.enemies.players()) if (q.pos.distanceTo(at) < 2.6) q.damage(18 * (G.enemies.dmgScale || 1), { knock: new THREE.Vector3(0, 6, 0) });
      }, { color: 0x30ff60 });
    }
  }
  meteorRain() {
    const p = this.tgt || G.player;
    for (let i = 0; i < 6; i++) {
      const at = p.pos.clone().add(new THREE.Vector3(rand(-7, 7), 0, rand(-7, 7)));
      if (i === 0) at.copy(p.pos);
      at.y = G.zone.colliders.ground(at.x, at.z, at.y + 2).y;
      G.enemies.telegraph(at, 2, 1.3 + i * 0.15, () => {
        G.fx.burst(at.clone().setY(at.y + 0.5), 0x40ff70, 40, 8);
        G.fx.smokePuff(at, 0x102010, 8);
        G.audio.sfx('explode');
        G.cam.shake(0.15);
        for (const q of G.enemies.players()) if (q.pos.distanceTo(at) < 2.2) q.damage(16 * (G.enemies.dmgScale || 1));
      }, { color: 0x40ff70 });
    }
  }
  beam() {
    const p = this.tgt || G.player;
    const yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    const from = this.pos.clone();
    G.enemies.telegraph(from, 1, 1.1, () => {
      const len = 30;
      const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, len, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 4, 1.4), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      beam.position.copy(from).addScaledVector(dir, len / 2).setY(from.y + 1.2);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      G.scene.add(beam);
      G.audio.sfx('patronum');
      G.cam.shake(0.3);
      G.lights.flash(from.clone().addScaledVector(dir, 6).setY(from.y + 1), 0x40ff70, 160, 20, 0.6);
      // damage along the line
      for (const q of G.enemies.players()) {
        const rel = _v.subVectors(q.pos, from);
        const along = rel.dot(dir);
        const perp = Math.abs(rel.x * dir.z - rel.z * dir.x);
        if (along > 0 && along < len && perp < 1.4 && q.pos.y - from.y < 2.2) q.damage(30 * (G.enemies.dmgScale || 1), { knock: new THREE.Vector3(-dir.z, 3, dir.x).multiplyScalar(4) });
      }
      let t = 0;
      const fade = () => { t += 0.05; beam.material.opacity = 0.85 * (1 - t); beam.scale.x = beam.scale.z = 1 - t * 0.8; if (t < 1) setTimeout(fade, 30); else G.scene.remove(beam); };
      fade();
    }, { line: true, width: 2.8, length: 30, yaw, color: 0x40ff70 });
  }

  dispose() {
    this.def.dispose?.call(this);
    G.scene.remove(this.root);
    if (this.shieldMesh) G.scene.remove(this.shieldMesh);
  }
}

// ------------------------------------------------------------------ manager
export class Enemies {
  constructor() {
    this.list = [];
    this.allies = [];
    this.telegraphs = [];
    this.waves = [];
    this.debris = [];
    this.drops = [];
    this.hpScale = 1;
    this.dmgScale = 1;
    this.floatingClub = null;
    this.hazards = [];
    this.dropGeo = new THREE.SphereGeometry(0.12, 8, 6);
  }
  spawn(type, pos, o = {}) {
    const e = new Enemy(type, pos, o);
    this.list.push(e);
    if (TYPES[type].boss) G.ui.boss(e);
    return e;
  }
  telegraph(pos, r, delay, fn, opts) {
    const t = new Telegraph(pos, r, delay, fn, opts);
    this.telegraphs.push(t);
    G.net?.telegraph(pos, r, delay, opts);
    return t;
  }
  // lingering damaging puddle (venom, fire, cursed ground)
  hazard(pos, r, dur, dps, color) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.copy(pos).setY(pos.y + 0.05);
    G.scene.add(m);
    this.hazards.push({ pos: pos.clone(), r, t: dur, dps, color, m });
  }
  // the students area attacks can hit: me, plus friends in this room when I'm the host
  players() {
    const others = G.minigame ? null : G.net?.proxies();
    return others && others.length ? [G.player, ...others] : [G.player];
  }
  // a troll shockwave: an expanding ring the player must jump over
  addWave(center) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = Math.PI / 2; m.position.copy(center).setY(center.y + 0.25);
    G.scene.add(m);
    this.waves.push({ c: center.clone(), r: 0.5, speed: 9, hit: false, mesh: m });
  }
  get aliveCount() { return this.list.filter((e) => e.alive).length; }
  clearZone() {
    for (const e of this.list) e.dispose();
    this.list = [];
    for (const t of this.telegraphs) t.cancel();
    this.telegraphs = [];
    for (const w of this.waves) G.scene.remove(w.mesh);
    this.waves = [];
    for (const h of this.hazards) G.scene.remove(h.m);
    this.hazards = [];
    for (const d of this.drops) G.scene.remove(d.m);
    this.drops = [];
    if (this.floatingClub) { G.scene.remove(this.floatingClub.club); this.floatingClub = null; }
    G.ui.boss(null);
    G.cam && (G.cam.lockTarget = null);
    G.spells?.clear();
    setFrost(0);
  }

  onDeath(e, h) {
    const p = G.player;
    if (G.cam.lockTarget === e) G.cam.lockTarget = null;
    const house = e.creditHouse || G.save.house;
    addXP((e.def.xp ?? (e.def.boss ? 400 : 12 + e.def.points * 6)) * (e.o.xpScale ?? 1));
    if (house && e.def.points) G.story?.addPoints(house, e.def.points, e.def.boss ? `Defeated ${e.name}` : null, !e.def.boss);
    // drops
    const n = e.def.boss ? 8 : e.type === 'pixie' ? (Math.random() < 0.4 ? 1 : 0) : 2;
    for (let i = 0; i < n; i++) {
      const kind = Math.random() < 0.5 ? 'hp' : 'mana';
      const m = new THREE.Mesh(this.dropGeo, new THREE.MeshBasicMaterial({ color: kind === 'hp' ? new THREE.Color(0.6, 3, 0.8) : new THREE.Color(0.6, 1.4, 3.5) }));
      m.position.copy(e.pos).setY(e.pos.y + 1.2);
      G.scene.add(m);
      this.drops.push({ m, kind, v: new THREE.Vector3(rand(-3, 3), rand(3, 6), rand(-3, 3)), t: 0 });
    }
    // slow-motion on finishing blows (last enemy of a fight or a boss)
    const remaining = this.list.filter((x) => x.alive && x !== e).length;
    if (e.def.boss || (remaining === 0 && this.list.length > 1)) {
      G.slowmo = e.def.boss ? 2.2 : 1.0;
      G.audio.sfx('slowmo');
      G.cam.shake(0.5);
      G.input.rumble(1, 1, 500);
      postFlash(0.25);
    }
    G.story?.onEvent('kill', e);
  }

  update(dt) {
    for (const e of this.list) e.update(dt);
    const gone = this.list.filter((e) => e.remove);
    for (const e of gone) e.dispose();
    if (gone.length) this.list = this.list.filter((e) => !e.remove);
    this.telegraphs = this.telegraphs.filter((t) => t.update(dt));
    const p = G.player;
    // troll shockwaves
    for (const w of this.waves) {
      w.r += w.speed * dt;
      w.mesh.scale.set(w.r, w.r, 1);
      w.mesh.material.opacity = Math.max(0, 1 - w.r / 22);
      const d = Math.hypot(p.pos.x - w.c.x, p.pos.z - w.c.z);
      if (!w.hit && Math.abs(d - w.r) < 0.6 && p.pos.y - w.c.y < 0.7) { w.hit = true; p.damage(14 * this.dmgScale, { knock: new THREE.Vector3(0, 5, 0), dodgeable: true }); }
      if (w.r > 22) { G.scene.remove(w.mesh); w.done = true; }
    }
    this.waves = this.waves.filter((w) => !w.done);
    for (const h of this.hazards) {
      h.t -= dt;
      h.m.material.opacity = Math.min(0.5, h.t) * (0.8 + Math.sin(G.time * 6) * 0.2);
      if (Math.random() < 0.2) G.fx.emit({ pos: h.pos.clone().add(new THREE.Vector3(rand(-h.r, h.r), 0.1, rand(-h.r, h.r))), color: h.color, count: 1, speed: 0.6, size: 0.2, life: 0.6, intensity: 2, up: 1, noScale: true });
      if (Math.hypot(p.pos.x - h.pos.x, p.pos.z - h.pos.z) < h.r && p.pos.y - h.pos.y < 1) { p.hp -= h.dps * dt * this.dmgScale * (G.diffDmg ?? 1); p.lastHurt = 0; if (p.hp <= 0 && p.alive) p.faint(); }
      if (h.t <= 0) { G.scene.remove(h.m); h.done = true; }
    }
    this.hazards = this.hazards.filter((h) => !h.done);
    // floating troll club: hovers, then drops on the troll's head
    const fc = this.floatingClub;
    if (fc) {
      fc.t += dt;
      const tr = fc.troll;
      if (fc.t < 3) {
        fc.club.position.lerp(_v.copy(tr.pos).setY(tr.pos.y + 7), dt * 2);
        fc.club.rotation.z += dt * 2;
      } else if (!fc.dropped) {
        fc.club.position.y -= dt * 25;
        if (fc.club.position.y < tr.pos.y + 4.4) {
          fc.dropped = true;
          tr.takeHit({ dmg: 120, spell: 'thrown', combo: true });
          tr.status.stun = 3;
          G.ui.combo('Club Drop');
          G.audio.sfx('slam');
          G.cam.shake(0.6);
          G.fx.burst(fc.club.position, 0xffe080, 50, 8);
        }
      }
    }
    // debris (wands etc.)
    for (const d of this.debris) {
      d.t += dt;
      d.v.y -= 15 * dt;
      d.m.position.addScaledVector(d.v, dt);
      d.m.rotation.x += dt * 15;
      if (d.t > d.life) { G.scene.remove(d.m); d.done = true; }
    }
    this.debris = this.debris.filter((d) => !d.done);
    // drops
    for (const d of this.drops) {
      d.t += dt;
      const dist = d.m.position.distanceTo(_v.copy(p.pos).setY(p.pos.y + 1));
      if (d.t > 0.6 && dist < 7) {
        d.m.position.lerp(_v, Math.min(1, dt * (4 + d.t * 4)));
        if (dist < 0.6) {
          if (d.kind === 'hp') p.heal(10); else p.mana = Math.min(p.maxMana, p.mana + 20);
          G.audio.sfx('pickup');
          d.done = true;
          G.scene.remove(d.m);
        }
      } else {
        d.v.y -= 9 * dt;
        d.v.multiplyScalar(Math.exp(-dt * 1.5));
        d.m.position.addScaledVector(d.v, dt);
        const g = G.zone.colliders.ground(d.m.position.x, d.m.position.z, d.m.position.y + 1).y + 0.4;
        if (d.m.position.y < g) { d.m.position.y = g; d.v.y = Math.abs(d.v.y) * 0.4; }
      }
      if (d.t > 20) { d.done = true; G.scene.remove(d.m); }
    }
    this.drops = this.drops.filter((d) => !d.done);
    // dementor chill
    let chill = 0;
    for (const e of this.list) if (e.alive && e.type === 'dementor') chill = Math.max(chill, 1 - e.pos.distanceTo(p.pos) / 14);
    setFrost(Math.max(0, chill));
  }
}
