// Mission runtime: activates rooms as players arrive (curses rise out of the
// ground in waves), tracks the objective (exorcise N curses, rescue trapped
// students, seal cursed objects), opens the boss gate, stages the boss intro
// and spawns the exit + reward chest when the boss falls.
import * as THREE from 'three/webgpu';
import { Boss } from './entities/bosses.js';
import { buildSorcererModel } from './entities/models.js';
import { B } from './world/blocks.js';
import { toast } from './ui/ui.js';

const OBJ_TEXT = {
  exorcise: (o) => ['Exorcise the Curses', `${o.done} / ${o.need} curses exorcised`],
  rescue: (o) => ['Rescue the Students', `${o.done} / ${o.need} students freed`],
  seal: (o) => ['Seal the Cursed Objects', `${o.done} / ${o.need} objects sealed`],
};

export class Mission {
  constructor(game, def, level) {
    this.game = game; this.def = def; this.L = level;
    this.obj = level.objective;
    this.bossSpawned = false; this.boss = null; this.complete = false;
    this.props = [];
    this.stats = { kills: 0, damage: 0, time: 0, coins: 0, secrets: 0, deaths: 0, loot: [] };
  }
  setup() {
    const g = this.game, L = this.L;
    // objective props
    for (const it of this.obj.items) {
      if (this.obj.type === 'rescue') this.makeCage(it); else this.makeAltar(it);
    }
    for (const c of L.chests) this.makeChest(c);
    this.updateText();
    g.minimap.reveal(L.rooms[0]);
  }
  updateText() {
    const [t, d] = OBJ_TEXT[this.obj.type](this.obj);
    this.game.hud.setObjective(this.objDone ? 'Defeat the Boss' : t, this.objDone ? (this.boss && this.boss.dead ? 'Reach the exit torii' : 'The arena gate is open') : d);
  }
  // ---------------------------------------------------------------- props
  addProp(obj) { this.game.scene.add(obj); this.props.push(obj); return obj; }
  makeCage(it) {
    const g = this.game;
    const grp = new THREE.Group(); grp.position.copy(it.pos);
    const student = buildSorcererModel(['yuji', 'megumi', 'nobara'][this.obj.items.indexOf(it) % 3]);
    student.root.scale.setScalar(0.95); grp.add(student.root);
    student.armR.rotation.x = -2.6; student.armL.rotation.x = -2.4;
    const bars = new THREE.MeshStandardNodeMaterial({ color: 0xffe0a0, emissive: 0xffc860, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), bars); bar.position.set(Math.cos(a) * 0.9, 1.3, Math.sin(a) * 0.9); grp.add(bar); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.15, 8), bars); top.position.y = 2.65; grp.add(top);
    this.addProp(grp);
    it.object = grp; it.rig = student;
    g.lights.attach(grp, 0xffc860, 3, 6, { offsetY: 2 });
    g.interactables.push({ id: 'obj' + this.obj.items.indexOf(it), pos: it.pos, radius: 2.4, label: 'Free student', hold: 1.2, action: () => this.completeItem(it), enabled: () => !it.done });
  }
  makeAltar(it) {
    const g = this.game;
    const grp = new THREE.Group(); grp.position.copy(it.pos);
    const stone = new THREE.MeshStandardNodeMaterial({ color: 0x5a5560, roughness: 0.8 });
    const glow = new THREE.MeshStandardNodeMaterial({ color: 0x8a1a2a, emissive: 0xff2a4a, emissiveIntensity: 2.5 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.4), stone); base.position.y = 0.45; base.castShadow = true;
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), glow); finger.position.y = 1.3; finger.rotation.z = 0.3;
    grp.add(base, finger);
    this.addProp(grp);
    it.object = grp; it.finger = finger;
    it.light = g.lights.attach(finger, 0xff2a4a, 4, 7, { offsetY: 0 });
    g.interactables.push({ id: 'obj' + this.obj.items.indexOf(it), pos: it.pos, radius: 2.4, label: 'Seal cursed object', hold: 2.5, onHoldStart: () => this.altarWave(it), action: () => this.completeItem(it), enabled: () => !it.done });
  }
  altarWave(it) {
    if (it.waved) return; it.waved = true;
    const g = this.game;
    toast('The cursed object resists!');
    for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2; const p = it.pos.clone().add(new THREE.Vector3(Math.cos(a) * 5, 0, Math.sin(a) * 5)); const gy = g.world.groundBelow(p.x, p.z, p.y + 3); if (!isFinite(gy)) continue; p.y = gy; g.spawnEnemy(i === 0 ? 'spitter' : 'swarmer', p, { level: this.def.difficulty }); g.fx.summonCircle(p, 0xff2a4a); }
  }
  makeChest(c) {
    const g = this.game;
    const grp = new THREE.Group(); grp.position.copy(c.pos);
    const wood = new THREE.MeshStandardNodeMaterial({ color: c.rarity === 'rare' ? 0x2a4a8a : 0x7a5230, roughness: 0.7 });
    const trim = new THREE.MeshStandardNodeMaterial({ color: 0xd8b040, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), wood); body.position.y = 0.35; body.castShadow = true;
    const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.4);
    const lidM = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 0.85), wood); lidM.position.set(0, 0.15, 0.4); lidM.castShadow = true; lid.add(lidM);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.1), trim); lock.position.set(0, 0.6, 0.42);
    grp.add(body, lid, lock); grp.rotation.y = Math.random() * Math.PI * 2;
    this.addProp(grp);
    c.object = grp; c.lid = lid;
    g.interactables.push({ id: 'chest' + this.L.chests.indexOf(c), pos: c.pos, radius: 2, label: 'Open chest', action: (p) => this.openChest(c, p), enabled: () => !c.opened });
  }
  openChest(c, p) {
    if (c.opened) return; c.opened = true;
    const g = this.game;
    g.audio?.loot(c.rarity);
    let t = 0; g.addUpdater((dt) => { t += dt; c.lid.rotation.x = -Math.min(1.9, t * 6); return t < 0.4; });
    g.particles.burst(c.pos.clone().setY(c.pos.y + 0.8), { count: 24, color: c.rarity === 'rare' ? 0x4ad0ff : 0xffd23a, speed: 4, up: 2, life: 0.8, size: 0.14, shape: 1 });
    g.pickups.drop('coin', c.pos, 6 + Math.floor(Math.random() * 6) + (c.rarity === 'rare' ? 10 : 0), 1);
    if (Math.random() < 0.5) g.pickups.drop('heal', c.pos, 1);
    g.onChestOpened?.(c, p);
    if (c.room.type === 'secret') { this.stats.secrets++; toast('Secret found!'); }
  }
  completeItem(it) {
    if (it.done) return;
    const g = this.game;
    it.done = true; this.obj.done++;
    g.audio?.energy('heal'); g.audio?.levelUp();
    if (this.obj.type === 'rescue') {
      g.fx.heal(it.pos, 0xffd23a);
      let t = 0; g.addUpdater((dt) => { t += dt; it.object.position.y += dt * 3; it.object.scale.setScalar(Math.max(0.01, 1 - t)); return t < 1; });
      toast('Student rescued!');
    } else {
      g.fx.heal(it.pos, 0xff5a7a);
      it.finger.material = new THREE.MeshStandardNodeMaterial({ color: 0xe8dcb0 });
      g.lights.remove(it.light);
      toast('Cursed object sealed!');
    }
    this.checkObjective();
  }
  onKill(e) {
    this.stats.kills++;
    if (this.obj.type === 'exorcise' && !e.isBoss) { this.obj.done = Math.min(this.obj.need, this.obj.done + 1); this.checkObjective(); }
  }
  checkObjective() {
    this.updateText();
    if (this.objDone || this.obj.done < this.obj.need) return;
    this.objDone = true; this.game.objectiveDone = true;
    const g = this.game;
    toast('Objective complete — the arena gate opens', 'big');
    g.audio?.gong();
    for (const gate of this.L.gates) this.openGate(gate);
    this.updateText();
  }
  openGate(gate) {
    const g = this.game;
    gate.open = true;
    let i = 0;
    for (const [x, y, z] of gate.blocks) {
      setTimeout(() => { g.world.set(x, y, z, 0); g.particles.burst(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), { count: 6, color: 0x5ad8ff, speed: 3, life: 0.6, size: 0.2 }); }, (i++) * 25);
    }
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, L = this.L;
    this.stats.time += dt;
    for (const room of L.rooms) {
      const inside = g.players.some((p) => !p.dead && p.pos.x >= room.x0 - 1 && p.pos.x <= room.x1 + 2 && p.pos.z >= room.z0 - 1 && p.pos.z <= room.z1 + 2);
      if (inside && !room.activated) this.activate(room);
      if (room.activated && room.waveIdx < room.waves.length) {
        const alive = room.enemies.filter((e) => !e.dead).length;
        if (alive <= 1 && room.waveT <= 0) { this.spawnWave(room); }
        room.waveT -= dt;
      }
      if (room.type === 'boss' && inside && this.objDone && !this.bossSpawned) {
        const all = g.players.filter((p) => !p.dead).every((p) => p.pos.x >= room.x0 && p.pos.x <= room.x1 && p.pos.z >= room.z0 && p.pos.z <= room.z1);
        if (all || this.bossWaitT > 4) this.startBoss(room);
        this.bossWaitT = (this.bossWaitT ?? 0) + dt;
      }
    }
    // spin altars, bob cages
    for (const it of this.obj.items) if (!it.done && it.finger) it.finger.rotation.y += dt * 2;
  }
  activate(room) {
    const g = this.game;
    room.activated = true; room.enemies = []; room.waveIdx = 0; room.waveT = 0;
    g.minimap.reveal(room);
    if (room.type === 'secret') toast('A hidden chamber…');
    if (room.waves.length) this.spawnWave(room);
  }
  spawnWave(room) {
    const g = this.game;
    const wave = room.waves[room.waveIdx++];
    room.waveT = 2.5;
    const spots = room.spawns.length ? room.spawns : [[room.center.x, room.center.y, room.center.z]];
    const cap = g.gr.preset.enemyCap;
    wave.forEach((s, i) => {
      if (g.enemies.filter((e) => !e.dead).length >= cap) return;
      const sp = spots[(i * 7 + room.waveIdx * 3) % spots.length];
      const pos = new THREE.Vector3(sp[0] + (Math.random() - 0.5) * 1.5, sp[1], sp[2] + (Math.random() - 0.5) * 1.5);
      const gy = g.world.groundBelow(pos.x, pos.z, pos.y + 3); if (!isFinite(gy)) return; pos.y = gy;
      const e = g.spawnEnemy(s.kind, pos, { elite: s.elite, level: this.def.difficulty });
      if (e) { room.enemies.push(e); g.fx.summonCircle(pos, e.elite ? 0xff9aff : 0x9a5aff); }
    });
    g.audio?.energy('summon');
  }
  startBoss(room) {
    const g = this.game;
    this.bossSpawned = true;
    // seal the arena behind the players
    for (const gate of this.L.gates) for (const [x, y, z] of gate.blocks) g.world.set(x, y, z, B.blue_energy);
    const sp = room.spawns[0] ?? [room.center.x, room.y, room.center.z];
    const pos = new THREE.Vector3(sp[0], sp[1], sp[2]);
    const boss = new Boss(g, this.def.boss, pos, this.def.difficulty);
    g.scene.add(boss.object); g.enemies.push(boss);
    this.boss = boss;
    g.rig.cinematic({ center: pos.clone().setY(pos.y + 2), dur: 3, dist: 14, pitch: 32 * Math.PI / 180, orbit: 0.12 });
    g.targetDof = 0.25; setTimeout(() => { g.targetDof = 0; }, 2800);
    toast(boss.B.title, 'domain');
    g.audio?.boss(); g.audio?.setMusic('boss');
    g.hud.setBoss(boss);
    g.shake(0.4);
    this.updateText();
  }
  onBossKilled(boss) {
    const g = this.game;
    g.pickups.drop('coin', boss.pos, 40, 1);
    g.pickups.drop('heal', boss.pos, 3);
    setTimeout(() => {
      // exit torii + reward chest
      const exit = boss.home.clone();
      g.exitPortal = { pos: exit };
      const grp = new THREE.Group(); grp.position.copy(exit);
      const red = new THREE.MeshStandardNodeMaterial({ color: 0xc82a1f, emissive: 0xff3a1a, emissiveIntensity: 0.6 });
      const glow = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0x7affd8).multiplyScalar(2), transparent: true, opacity: 0.55, side: THREE.DoubleSide });
      for (const x of [-1.6, 1.6]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), red); pl.position.set(x, 2, 0); grp.add(pl); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 0.5), red); beam.position.y = 4.1; grp.add(beam);
      const portal = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.7), glow); portal.position.y = 1.9; grp.add(portal);
      this.addProp(grp);
      g.lights.attach(grp, 0x7affd8, 6, 10, { offsetY: 2 });
      g.interactables.push({ id: 'exit', pos: exit, radius: 2.8, label: 'Leave the mission', action: () => g.completeMission() });
      const chest = { pos: exit.clone().add(new THREE.Vector3(3, 0, 0)), room: this.L.bossRoom, rarity: 'rare', opened: false, boss: true };
      chest.pos.y = g.world.groundBelow(chest.pos.x, chest.pos.z, chest.pos.y + 3); if (!isFinite(chest.pos.y)) chest.pos.y = exit.y;
      this.L.chests.push(chest); this.makeChest(chest);
      for (const gate of this.L.gates) this.openGate(gate);
      this.updateText();
      g.audio?.setMusic(this.L.biome.music);
    }, 1900);
    this.updateText();
  }
  dispose() { for (const p of this.props) this.game.scene.remove(p); }
}
