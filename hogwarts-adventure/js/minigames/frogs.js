// Chocolate Frog chase: catch the escaped frogs around the courtyard before time runs out.
// Stun them with Stupefy or Petrificus to make them easier to grab.
import * as THREE from 'three';
import { G } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { makeFrog } from '../models.js';
import { glyph } from '../input.js';
import { rand, clamp, dampAngle } from '../util.js';
import { PLATEAU, groundHeight } from '../world/terrain.js';
import { FlightMarker } from './flight.js';

const FROG_FACTS = ['Merlin', 'Morgana', 'Circe', 'Paracelsus', 'Cliodna', 'Agrippa', 'Ptolemy', 'Nicolas Flamel', 'Medea', 'Taliesin', 'Baba Yaga', 'Hengist'];

export async function play() {
  await G.ui.fade(1, 0.35);
  const spawn = new THREE.Vector3(0, PLATEAU, 10);
  G.world.setZone('grounds', { pos: spawn, yaw: Math.PI });
  G.cam.snap();
  G.ui.fade(0, 0.5);
  const p = G.player;
  const N = 7;
  const frogs = [];
  const area = { x0: -29, x1: 29, z0: -20, z1: 22 };
  for (let i = 0; i < N; i++) {
    const m = makeFrog();
    m.scale.setScalar(1.6);
    const pos = new THREE.Vector3(rand(area.x0, area.x1), PLATEAU, rand(area.z0, area.z1));
    m.position.copy(pos);
    G.scene.add(m);
    frogs.push({ m, pos, vel: new THREE.Vector3(), hop: rand(0.2, 1.5), air: false, stun: 0, caught: false, yaw: rand(0, 6) });
  }
  const marker = new FlightMarker('');
  const S = { t: 70, caught: 0, done: false };
  G.ui.banner('Chocolate Frog Chase!', 'Catch them all — stun them with spells to make it easier.', '');

  return new Promise((resolve) => {
    const finish = (aborted) => {
      if (S.done) return;
      S.done = true;
      frogs.forEach((f) => G.scene.remove(f.m));
      marker.remove();
      mgExit();
      // first full catch earns a real collectible card
      let bonus = '';
      if (!aborted && S.caught === N) {
        const missing = FROG_FACTS.map((_, i) => i).filter((i) => !G.save.cards.includes(i));
        if (missing.length) {
          const i = missing[Math.floor(Math.random() * missing.length)];
          G.save.cards.push(i);
          const c = G.story.collectibles.find((c) => c.kind === 'card' && c.i === i);
          if (c) { c.got = true; c.mesh.parent?.remove(c.mesh); }
          bonus = FROG_FACTS[i];
        }
      }
      const score = S.caught * 100 + Math.round(Math.max(0, S.t) * 10);
      resolve(aborted ? { aborted: true } : {
        title: S.caught === N ? 'Every frog caught!' : `${S.caught} frogs caught`,
        sub: bonus ? `Pip lets you keep a rare card: ${bonus}!` : '',
        success: S.caught >= 4, score, points: S.caught * 2 + (S.caught === N ? 10 : 0),
        lines: [['Frogs', `${S.caught} / ${N}`], ['Time left', Math.max(0, S.t).toFixed(1) + 's'], ['Score', score]],
      });
    };
    mgEnter({
      music: 'castle',
      combat: true,
      abort: () => finish(true),
      update(dt) {
        if (S.done) return;
        S.t -= dt;
        let nearest = null, nd = Infinity;
        for (const f of frogs) {
          if (f.caught) continue;
          const d = Math.hypot(f.pos.x - p.pos.x, f.pos.z - p.pos.z);
          if (d < nd) { nd = d; nearest = f; }
          // spells stun frogs
          for (const pr of G.spells.projectiles) {
            if (pr.team === 'player' && !pr.dead && pr.pos.distanceTo(f.pos) < 1.1) {
              f.stun = pr.def.id === 'petrificus' ? 5 : 3;
              G.spells.impactFX(pr.pos, pr.def, 0.6);
              G.spells.removeProjectile(pr);
              G.ui.floatText(f.pos.clone().setY(f.pos.y + 1), 'Stunned!', 'combo');
              G.audio.sfx('frog');
            }
          }
          f.stun -= dt;
          if (f.stun > 0) {
            f.m.rotation.z = Math.sin(G.time * 10) * 0.1;
            if (Math.random() < 0.1) G.fx.emit({ pos: f.pos.clone().setY(f.pos.y + 0.6), color: 0xffe060, count: 1, speed: 1, size: 0.12, life: 0.5, intensity: 3, noScale: true });
          } else if (!f.air) {
            f.hop -= dt;
            if (f.hop <= 0) {
              // hop away from the player when near, otherwise wander
              let dir;
              if (d < 7) dir = new THREE.Vector3(f.pos.x - p.pos.x, 0, f.pos.z - p.pos.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), rand(-0.8, 0.8));
              else { const a = rand(0, Math.PI * 2); dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); }
              const power = d < 7 ? rand(5, 7.5) : rand(2, 4);
              f.vel.copy(dir).multiplyScalar(power).setY(rand(4.5, 6.5));
              f.air = true;
              f.yaw = Math.atan2(dir.x, dir.z);
              f.hop = d < 7 ? rand(0.15, 0.45) : rand(0.8, 2);
              if (Math.random() < 0.3) G.audio.sfx('frog');
            }
          }
          if (f.air) {
            f.vel.y -= 16 * dt;
            f.pos.addScaledVector(f.vel, dt);
            // keep inside the courtyard (bounce off walls)
            if (f.pos.x < area.x0 || f.pos.x > area.x1) { f.vel.x *= -1; f.pos.x = clamp(f.pos.x, area.x0, area.x1); }
            if (f.pos.z < area.z0 || f.pos.z > area.z1) { f.vel.z *= -1; f.pos.z = clamp(f.pos.z, area.z0, area.z1); }
            G.zone.colliders.resolve(f.pos, 0.3, 0.5);
            const gy = G.zone.colliders.ground(f.pos.x, f.pos.z, f.pos.y + 0.5).y;
            if (f.pos.y <= gy) { f.pos.y = gy; f.air = false; f.vel.set(0, 0, 0); }
          }
          f.m.position.copy(f.pos);
          f.m.rotation.y = dampAngle(f.m.rotation.y, f.yaw, 10, dt);
          f.m.rotation.x = f.air ? -0.4 : 0;
          if (Math.random() < 0.04) G.fx.emit({ pos: f.pos.clone().setY(f.pos.y + 0.4), color: 0xffc070, count: 1, speed: 0.3, size: 0.1, life: 0.6, intensity: 2, noScale: true });
          // catch on contact (or interact nearby)
          const grab = d < 1.0 + (f.stun > 0 ? 0.6 : 0) || (d < 2 && G.input.isPressed('interact'));
          if (grab && f.pos.y - p.pos.y < 1.6) {
            f.caught = true;
            S.caught++;
            G.scene.remove(f.m);
            G.audio.sfx('card');
            G.fx.burst(f.pos.clone().setY(f.pos.y + 0.5), 0xffc060, 40, 5);
            G.ui.floatText(f.pos.clone().setY(f.pos.y + 1.2), `Caught! ${FROG_FACTS[Math.floor(Math.random() * FROG_FACTS.length)]} card`, 'combo');
            G.input.rumble(0.2, 0.4, 100);
          }
        }
        marker.set(nearest ? nearest.pos.clone().setY(nearest.pos.y + 1.4) : null, nearest ? `${Math.round(nd)}m` : '');
        if (S.caught === N || S.t <= 0) finish(false);
        G.ui.minigameHUD(`<div class="mg-row"><span><b>${Math.max(0, S.t).toFixed(0)}</b>s</span><span>Frogs <b>${S.caught}</b>/${N}</span></div><small>Run into frogs to catch them · stun them with ${glyph('cast')} Stupefy or Petrificus</small>`);
      },
    });
  });
}
