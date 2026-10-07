// The second task: with gillyweed you swim to the merfolk village on the bed of the Black
// Lake, cut your friend free from the statue, and race back to the surface before the hour
// runs out. Grindylows lurk in the kelp; roll to shake them off.
import * as THREE from 'three';
import { G } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { Flight, FlightMarker } from './flight.js';
import { FRIENDS } from '../friends.js';
import { makeWizard } from '../models.js';
import { glyph } from '../input.js';
import { rand } from '../util.js';
import { postHit } from '../engine.js';

function makeGrindylow() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x3a6a4a, roughness: 0.6 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), skin); g.add(head);
  for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.02, 0.9, 5), skin); const a = (i / 6) * Math.PI * 2; t.position.set(Math.cos(a) * 0.2, -0.5, Math.sin(a) * 0.2); t.rotation.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4); g.add(t); }
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 0.4) })); e.position.set(s * 0.13, 0.1, 0.3); g.add(e); }
  return g;
}

export async function play(opts = {}) {
  const z = G.world.zones.lakebed;
  await G.ui.fade(1, 0.4);
  G.world.setZone('lakebed', { pos: z.spots.start, yaw: Math.PI });
  const p = G.player;
  p.flying = true;
  p.status.override = 'fly';
  const flight = new Flight({ pos: z.spots.start, yaw: Math.PI, speed: 6.5, boost: 12, turn: 1.3, mount: p.root, minAlt: 1, maxAlt: 29.5, camDist: 5, camH: 1.2 });
  const fid = opts.friend && FRIENDS[opts.friend] ? opts.friend : 'pip';
  const friend = makeWizard({ ...FRIENDS[fid].look, scarf: true, noWand: true });
  friend.root.position.copy(z.spots.statue);
  friend.anim.set('idle');
  z.world.add(friend.root);
  const ropes = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 16), new THREE.MeshStandardMaterial({ color: 0x8a7a50 }));
  ropes.rotation.x = Math.PI / 2; ropes.position.copy(z.spots.statue).setY(z.spots.statue.y + 1);
  z.world.add(ropes);
  const grind = [];
  for (let i = 0; i < 7; i++) { const m = makeGrindylow(); m.position.copy(z.spots.village).add(new THREE.Vector3(rand(-50, 50), rand(4, 14), rand(30, 110))); z.world.add(m); grind.push({ m, v: new THREE.Vector3(), cd: rand(0, 2), home: m.position.clone() }); }
  // merfolk circling the village
  const mer = [];
  for (let i = 0; i < 5; i++) { const m = makeWizard({ robeColor: '#2a5a5a', skin: '#8ab0a0', hairStyle: 'long', hairColor: '#1a3a2a', noWand: true, noShadow: true }); m.root.scale.setScalar(1.1); z.world.add(m.root); mer.push({ m, a: (i / 5) * Math.PI * 2 }); }
  const marker = new FlightMarker('');
  const S = { air: opts.time || 110, freed: false, done: false, hits: 0 };
  G.ui.fade(0, 0.5);
  G.ui.banner('The Second Task', `Find ${FRIENDS[fid].short} in the merfolk village and bring them back up`, '');
  G.audio.music('forest');
  return new Promise((resolve) => {
    const finish = (aborted, won) => {
      if (S.done) return;
      S.done = true;
      grind.forEach((g) => z.world.remove(g.m));
      mer.forEach((m) => z.world.remove(m.m.root));
      z.world.remove(friend.root, ropes);
      marker.remove();
      p.flying = false; p.status.override = null;
      G.camera.fov = 60; G.camera.updateProjectionMatrix();
      G.audio.wind(0);
      mgExit();
      resolve(aborted ? { aborted: true } : {
        title: won ? 'Back to the surface!' : 'The gillyweed wore off…', success: !!won, score: won ? Math.round(S.air * 10) : 0, points: won ? 40 : 5, restore: true,
        lines: [['Time to spare', won ? `${Math.round(S.air)}s` : '—'], ['Grindylow grabs', S.hits]],
      });
    };
    mgEnter({
      music: 'forest', wantsPointer: true, abort: () => finish(true),
      update(dt) {
        if (S.done) return;
        S.air -= dt;
        flight.update(dt);
        p.pos.copy(flight.pos);
        p.anim.update(dt, 0, { bank: 0 });
        G.audio.wind(0.1);
        if (Math.random() < 0.3) G.fx.emit({ pos: flight.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), color: 0xd0f0ff, count: 1, speed: 0.3, size: 0.1, life: 1.5, intensity: 1.5, gravity: -2, noScale: true });
        // grindylows chase when you swim near
        for (const g of grind) {
          g.cd -= dt;
          const d = g.m.position.distanceTo(flight.pos);
          const want = d < 16 && g.cd <= 0 ? flight.pos.clone().sub(g.m.position).normalize().multiplyScalar(7.5) : g.home.clone().sub(g.m.position).multiplyScalar(0.3);
          g.v.lerp(want, dt * 2);
          g.m.position.addScaledVector(g.v, dt);
          g.m.lookAt(flight.pos);
          if (d < 1.3 && g.cd <= 0) {
            g.cd = 3; g.v.multiplyScalar(-1.5);
            if (flight.iframes > 0) { G.ui.floatText(flight.pos.clone().add(new THREE.Vector3(0, 2, 0)), 'Shaken off!', 'dodge'); continue; }
            S.hits++; S.air -= 6; flight.speed *= 0.3;
            G.audio.sfx('hurt'); G.cam.shake(0.3); G.input.rumble(0.6, 0.4, 200); postHit(1);
            G.ui.floatText(flight.pos.clone().add(new THREE.Vector3(0, 2, 0)), 'Grindylow! -6s', 'hurt');
          }
        }
        mer.forEach((m, i) => { m.a += dt * 0.3; const c = z.spots.village; m.m.root.position.set(c.x + Math.cos(m.a) * 22, c.y + 4 + Math.sin(G.time + i) * 1.5, c.z + Math.sin(m.a) * 22); m.m.root.rotation.set(0.6, -m.a, 0); m.m.anim.update(dt, 0); });
        if (!S.freed) {
          marker.set(z.spots.statue.clone().setY(z.spots.statue.y + 2), `${FRIENDS[fid].short} · ${Math.round(flight.pos.distanceTo(z.spots.statue))}m`);
          if (flight.pos.distanceTo(z.spots.statue.clone().setY(z.spots.statue.y + 1)) < 3 && (G.input.isPressed('interact') || G.input.isPressed('confirm'))) {
            S.freed = true;
            ropes.visible = false;
            G.audio.sfx('diffindo');
            G.fx.burst(ropes.position, 0xe0ff70, 40, 5);
            G.ui.banner('Diffindo!', `${FRIENDS[fid].short} is free — now swim for the surface!`, 'unlock');
          }
        } else {
          // the friend swims behind you
          friend.root.position.lerp(flight.pos.clone().add(new THREE.Vector3(0, -0.5, 0)).addScaledVector(flight.forward(new THREE.Vector3()), -2.2), dt * 2);
          friend.root.rotation.y = flight.yaw;
          marker.set(new THREE.Vector3(flight.pos.x, z.offset.y + 29.5, flight.pos.z), `Surface · ${Math.round(29 - flight.pos.y)}m`);
          if (flight.pos.y > z.offset.y + 28.5) { G.audio.sfx('splash'); finish(false, true); }
        }
        if (S.air <= 0) finish(false, false);
        const near = !S.freed && flight.pos.distanceTo(z.spots.statue) < 3.5;
        G.ui.minigameHUD(`<div class="mg-row"><span>Gillyweed <b>${Math.max(0, S.air).toFixed(0)}</b>s</span><span>${S.freed ? `<b>${FRIENDS[fid].short}</b> is with you` : 'Find your friend'}</span></div><div class="stam"><i style="width:${Math.max(0, S.air / (opts.time || 110)) * 100}%"></i></div><small>${near ? `${glyph('interact')} cut the ropes` : `Steer to swim · ${glyph('cast')} kick faster · ${glyph('jump')} roll to shake off grindylows`}</small>`);
      },
    });
  });
}
