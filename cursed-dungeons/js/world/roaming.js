// Roaming curses in the open world: now and then a curse (or a small pack)
// crawls out of the wild when a sorcerer is in or near a roam zone. They
// never enter a safe zone (Tengen's barrier over Jujutsu High, towns, camps):
// a curse that wanders across the line burns away. Capped (fewer on Low),
// spawned out of sight, despawned when everyone is far away, and paused in
// menus, dialogue and cutscenes. Kills give the usual coins and XP.
//   new Roaming(game, L)   L.roam: [{ x0, z0, x1, z1, kinds?, level?, dense? }] spawn zones
//                          L.safe: [{ x0, z0, x1, z1 }] (and the old L.core) no-curse rects
//   update(dt)             call every frame while in the world
import * as THREE from 'three/webgpu';

const tmp = new THREE.Vector3();
const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
// distance from a point to a rect (0 inside)
const rectDist = (r, x, z) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));

export class Roaming {
  constructor(game, L) {
    this.game = game;
    this.zones = L.roam ?? [];
    this.core = L.core ?? null;
    this.safe = [...(L.safe ?? []), ...(L.core && !(L.safe ?? []).length ? [L.core] : [])];
    this.dense = this.zones.some((z) => z.dense);
    this.groundAt = L.groundAt ?? ((x, z) => game.world.groundBelow(x, z, game.world.sy - 1));   // terrain height (ignores tree tops)
    this.list = [];
    this.t = 12 + Math.random() * 8;   // a breather after arriving
    this.warned = false;
  }
  get cap() { const q = this.game.gr?.quality; return (q === 'low' ? 2 : q === 'medium' ? 3 : 4) + (this.dense ? 3 : 0); }
  live() { this.list = this.list.filter((e) => !e.dead && this.game.enemies.includes(e)); return this.list; }
  active() {
    const g = this.game;
    return g.state === 'playing' && (g.mode === 'world' || g.mode === 'hub') && !g.paused && !g.dialogue?.active && !g.cutscenes?.active && !g.cutscene && this.zones.length > 0;
  }
  update(dt) {
    if (!this.active()) return;
    this.keepOut(dt);
    this.t -= dt;
    if (this.t > 0) return;
    this.t = (this.dense ? 6 : 14) + Math.random() * (this.dense ? 6 : 12);
    if (this.live().length >= this.cap) return;
    this.spawn();
  }
  spawn() {
    const g = this.game, hs = g.players.filter((p) => !p.dead && !p.downed);
    if (!hs.length) return 0;
    // only for someone who is near a forest edge
    const out = hs.filter((p) => this.zones.some((z) => rectDist(z, p.pos.x, p.pos.z) < 16));
    if (!out.length) return 0;
    for (let tries = 0; tries < 20; tries++) {
      const h = out[Math.floor(Math.random() * out.length)];
      // a spot 11–24 m from them, inside a roam zone
      const ang = Math.random() * Math.PI * 2, dd = 11 + Math.random() * 13;
      const x = h.pos.x + Math.cos(ang) * dd, z = h.pos.z + Math.sin(ang) * dd;
      const zone = this.zones.find((r) => inRect(r, x, z));
      if (!zone) continue;
      if (hs.some((p) => Math.hypot(x - p.pos.x, z - p.pos.z) < 10)) continue;
      if (this.safe.some((r) => inRect(r, x, z))) continue;
      if (g.world.isLoaded && !g.world.isLoaded(x, z)) continue;
      const y = this.groundAt(x, z);
      if (!isFinite(y) || g.world.liquidAt(x, y + 0.2, z) || g.world.solidAt(x, y + 0.5, z) || g.world.solidAt(x, y + 1.5, z)) continue;
      if (this.onScreen(tmp.set(x, y + 0.6, z))) continue;
      const kinds = zone.kinds ?? ['swarmer', 'swarmer', 'swarmer', 'spitter'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const n = kind === 'swarmer' || kind === 'flyhead' ? 1 + Math.floor(Math.random() * 3) : 1;
      let made = 0;
      for (let i = 0; i < n; i++) {
        const px = x + (Math.random() - 0.5) * 2.5, pz = z + (Math.random() - 0.5) * 2.5;
        const py = this.groundAt(px, pz);
        if (!isFinite(py) || Math.abs(py - y) > 1.5) continue;
        const e = g.spawnEnemy(kind, new THREE.Vector3(px, py, pz), { level: zone.level ?? 1 });
        if (!e) continue;
        e.roamer = true; e.spawnT = 0.6;
        this.list.push(e); made++;
      }
      if (made) g.particles?.burst(tmp.set(x, y + 0.4, z), { count: 16, color: 0x151018, additive: false, speed: 1.6, up: 1.2, life: 1.0, size: 0.5, drag: 2, sizeEnd: 2.2 });
      return made;
    }
    return 0;
  }
  onScreen(v) {
    const cam = this.game.rig?.camera; if (!cam) return false;
    const p = v.clone().project(cam);
    return p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
  }
  // Far from everyone: gone. Across the barrier line: burned away.
  keepOut(dt) {
    const g = this.game, hs = g.players.filter((p) => !p.dead);
    for (const e of this.live()) {
      const far = hs.length ? Math.min(...hs.map((p) => p.pos.distanceTo(e.pos))) : 99;
      e.farT = far > 42 ? (e.farT ?? 0) + dt : 0;
      if (e.farT > 4) { this.vanish(e, false); continue; }
      const zone = this.safe.find((r) => inRect(r, e.pos.x, e.pos.z));
      if (zone) {
        e.coreT = (e.coreT ?? 0) + dt;
        if (e.coreT > 0.35) {
          this.vanish(e, true);
          if (!this.warned) { this.warned = true; g.toast?.(zone === this.core || (this.core && zone.x0 === this.core.x0) ? 'Tengen\'s barrier burns away a curse that strayed onto the campus' : 'A barrier burns away a curse that strayed too close'); }
        }
      } else e.coreT = 0;
    }
  }
  vanish(e, burn) {
    const g = this.game;
    if (burn) { g.fx?.curseDeath?.(e.pos, e.height ?? 1.5, 0xffd890); g.lights?.flash(tmp.copy(e.pos).setY(e.pos.y + 1), 0xffe0a0, 5, 6, 0.4); }
    if (e.marker) { try { g.markers.cancel(e.marker); } catch (err) { /* already gone */ } e.marker = null; }
    e.dead = true; e.deathT = burn ? 0 : 0.5;   // Enemy.update shrinks it away, then main removes it (no loot)
    this.list = this.list.filter((x) => x !== e);
  }
}
