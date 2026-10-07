// Zone manager: builds every area, switches between them and handles doorways.
import * as THREE from 'three';
import { G } from '../state.js';
import { buildGrounds } from './grounds.js';
import { buildGreatHall, buildStaircase, buildCorridor, buildDungeon, buildTower } from './interiors.js';
import { PLATEAU } from './terrain.js';
import { buildStation, buildTrain, buildCountryside } from './journey.js';
import { buildUndercroft, addUndercroftDoor } from './years.js';

export class World {
  constructor() {
    this.zones = {};
    this.transitioning = false;
    this.nearPortal = null;
  }

  async build(Q, progress) {
    const steps = [
      ['grounds', () => buildGrounds(Q), 'Raising the castle'],
      ['greatHall', () => buildGreatHall(Q), 'Lighting the floating candles'],
      ['staircase', () => buildStaircase(Q), 'Persuading the staircases'],
      ['corridor', () => buildCorridor(Q), 'Polishing suits of armour'],
      ['dungeon', () => buildDungeon(Q), 'Brewing in the dungeons'],
      ['tower', () => buildTower(Q), "Winding the Headmistress's instruments"],
      ['station', () => buildStation(Q), 'Finding Platform Nine and Three-Quarters'],
      ['train', () => buildTrain(Q), 'Stoking the Hogwarts Express'],
      ['countryside', () => buildCountryside(Q), 'Laying track across the Highlands'],
      ['undercroft', () => buildUndercroft(Q), 'Hiding the Undercroft'],
    ];
    for (let i = 0; i < steps.length; i++) {
      const [name, fn, label] = steps[i];
      await progress?.(label, i / steps.length);
      const z = fn();
      z.group.visible = false;
      z.world.visible = false;
      G.scene.add(z.group, z.world);
      this.zones[name] = z;
    }
    const g = this.zones.grounds;
    g.portals.push({ pos: new THREE.Vector3(0, PLATEAU, -22.5), r: 3.2, to: 'greatHall', at: 'fromGrounds', label: 'Enter the Great Hall' });
    addUndercroftDoor();
    g.entries = {
      hallDoor: { pos: new THREE.Vector3(0, PLATEAU, -18), yaw: 0 },
      spawn: g.spawn,
    };
  }

  // Pre-compile every zone's shaders so the first visit does not hitch.
  precompile() {
    for (const z of Object.values(this.zones)) z.group.visible = z.world.visible = true;
    try { G.renderer.compile(G.scene, G.camera); } catch (e) { /* ignore */ }
    for (const z of Object.values(this.zones)) z.group.visible = z.world.visible = false;
    if (G.zone) G.zone.group.visible = G.zone.world.visible = true;
  }

  setZone(name, entry) {
    const z = this.zones[name];
    if (!z) return;
    this.portalArmed = false;
    if (G.zone && G.zone !== z) G.zone.group.visible = G.zone.world.visible = false;
    G.zone = z;
    z.group.visible = z.world.visible = true;
    if (G.skyObj) G.skyObj.mesh.visible = z.outdoor;
    if (z.onEnter) z.onEnter();
    else G.scene.fog = new THREE.FogExp2(z.fog.color, z.fog.density);
    if (!z.outdoor) {
      const d = z.dirLight;
      G.sun.color.set(d.color);
      G.sun.intensity = d.intensity;
      G.hemi.color.set(z.hemi.sky);
      G.hemi.groundColor.set(z.hemi.ground);
      G.hemi.intensity = z.hemi.intensity;
      G.renderer.toneMappingExposure = z.exposure;
      G.scene.environmentIntensity = z.env;
      G.scene.background = new THREE.Color(z.fog.color);
    } else {
      G.scene.background = null;
    }
    G.lights.setAnchors(z.anchors);
    let e = typeof entry === 'string' ? z.entries?.[entry] : entry;
    if (!e) e = z.spawn;
    if (G.player) {
      G.player.teleport(e.pos, e.yaw);
      G.cam?.snap();
    }
    G.save && (G.save.zone = name);
    G.events?.emit('zone', name);
  }

  // fade out, switch, fade in
  async travel(name, entry) {
    if (this.transitioning) return;
    this.transitioning = true;
    G.audio?.sfx('door');
    await G.ui.fade(1, 0.35);
    G.enemies?.clearZone();
    this.setZone(name, entry);
    G.events?.emit('arrive', name);
    await G.ui.fade(0, 0.45);
    this.transitioning = false;
    G.ui.toast(this.zones[name].label, 'zone');
  }

  update(dt, t) {
    const z = G.zone;
    if (!z) return;
    z.update?.(dt, t);
    if (!z.outdoor) {
      // interiors keep the key light near the player for character shadows
      const p = G.player.pos;
      G.sun.position.set(p.x, p.y, p.z).addScaledVector(z.dirLight.dir.clone().normalize(), 40);
      G.sun.target.position.copy(p);
    }
    // portals
    this.nearPortal = null;
    if (G.mode !== 'play' || !G.player) return;
    const pl = G.player;
    let inside = false;
    for (const p of z.portals) {
      if (p.locked && p.locked()) continue;
      const dy = Math.abs(p.pos.y - pl.pos.y);
      if (dy > 3) continue;
      const d = Math.hypot(p.pos.x - pl.pos.x, p.pos.z - pl.pos.z);
      if (d < p.r + 0.6) this.nearPortal = p;
      // walking into a doorway takes you through it
      if (d < p.r * 0.85 + 0.4) {
        inside = true;
        const vx = pl.vel.x, vz = pl.vel.z;
        const toward = vx * (p.pos.x - pl.pos.x) + vz * (p.pos.z - pl.pos.z);
        if (this.portalArmed && Math.hypot(vx, vz) > 1 && toward > 0 && !G.minigame && !G.story?.busy && pl.alive) {
          this.portalArmed = false;
          this.travel(p.to, p.at);
          return;
        }
      }
    }
    // after arriving, re-arm only once the player has stepped away from every doorway
    if (!inside) this.portalArmed = true;
  }
}
