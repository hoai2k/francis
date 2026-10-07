// House-team tryouts: three flying drills at the pitch. Rings against the clock, catching
// Quaffles thrown by Madam Hale, then surviving two Bludgers. Pass all three to make the team.
import * as THREE from 'three';
import { G, HOUSES } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { Flight, FlightMarker, makeRing, passedRing } from './flight.js';
import { flightHelp } from './quidditch.js';
import { makeBroom, makeBludger } from '../models.js';
import { rand } from '../util.js';
import { postHit } from '../engine.js';
import { SPOTS } from '../world/terrain.js';
import { broomStats } from '../quidditch.js';

export async function play() {
  const g = G.world.zones.grounds;
  const P = SPOTS.pitch, py = g.pitchY;
  await G.ui.fade(1, 0.35);
  G.world.setZone('grounds', { pos: new THREE.Vector3(P.x, py, P.z), yaw: Math.PI / 2 });
  G.skyObj.lock = 0.4;
  const p = G.player;
  p.flying = true; p.status.override = 'fly';
  const broom = makeBroom(); broom.position.set(0, 0.92, 0.05); p.model.root.add(broom); p.model.root.position.y = -0.55;
  const bs = broomStats();
  const flight = new Flight({ pos: new THREE.Vector3(P.x - 40, py + 10, P.z), yaw: Math.PI / 2, speed: bs.speed, boost: bs.boost, turn: bs.turn, mount: p.root, bounds: { cx: P.x, cz: P.z, r: 90 }, minAlt: 1.6, maxAlt: 50 });
  const marker = new FlightMarker('');
  const S = { drill: 0, t: 45, rings: 0, next: 0, catches: 0, throws: 0, hits: 0, done: false, pause: 2 };
  // drill 1: rings
  const rings = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = makeRing(2.6);
    r.position.set(P.x + Math.cos(a) * 45, py + 8 + (i % 3) * 5, P.z + Math.sin(a) * 28);
    r.lookAt(new THREE.Vector3(P.x + Math.cos(a + 0.8) * 45, r.position.y, P.z + Math.sin(a + 0.8) * 28));
    G.scene.add(r); rings.push(r);
  }
  // drill 2: quaffles
  const quaffle = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshStandardMaterial({ color: 0x9a2a1a, roughness: 0.6 }));
  quaffle.visible = false; G.scene.add(quaffle);
  const qv = new THREE.Vector3();
  // drill 3: bludgers
  const bl = [0, 1].map((i) => { const m = makeBludger(); m.visible = false; G.scene.add(m); return { m, v: new THREE.Vector3(), cd: 2 + i }; });
  G.ui.banner('House team tryouts', `Drill 1: fly through the eight rings in ${S.t} seconds`, '');
  G.audio.sfx('gong');
  G.ui.fade(0, 0.5);
  const throwQuaffle = () => {
    S.throws++;
    quaffle.visible = true;
    quaffle.position.set(P.x, py + 3, P.z);
    const tgt = new THREE.Vector3(P.x + rand(-40, 40), py, P.z + rand(-24, 24));
    qv.set((tgt.x - P.x) / 2.6, 22, (tgt.z - P.z) / 2.6);
    G.audio.sfx('throw');
  };
  return new Promise((resolve) => {
    const finish = (aborted) => {
      if (S.done) return;
      S.done = true;
      rings.forEach((r) => G.scene.remove(r));
      G.scene.remove(quaffle);
      bl.forEach((b) => G.scene.remove(b.m));
      marker.remove();
      p.model.root.remove(broom); p.model.root.position.y = 0;
      p.flying = false; p.status.override = null;
      G.skyObj.lock = null;
      G.camera.fov = 60; G.camera.updateProjectionMatrix();
      G.audio.wind(0);
      mgExit();
      const pass = S.rings >= 5 && S.catches >= 3 && S.hits <= 3;
      resolve(aborted ? { aborted: true } : {
        title: pass ? 'You made the team!' : 'Not this time', success: pass, score: S.rings * 20 + S.catches * 40 - S.hits * 15, points: pass ? 30 : 5,
        sub: pass ? `Welcome to the ${HOUSES[G.save.house]?.name || 'house'} team.` : 'You need 5 rings, 3 catches and no more than 3 Bludger hits.',
        lines: [['Rings', `${S.rings} / 8`], ['Catches', `${S.catches} / 5`], ['Bludger hits', S.hits]],
      });
    };
    mgEnter({
      music: 'quidditch', wantsPointer: true, abort: () => finish(true),
      update(dt) {
        if (S.done) return;
        const prev = flight.pos.clone();
        flight.update(dt);
        p.pos.copy(flight.pos);
        p.anim.update(dt, 0, { bank: 0 });
        if (S.pause > 0) { S.pause -= dt; marker.set(null); return; }
        S.t -= dt;
        let hud = '';
        if (S.drill === 0) {
          rings.forEach((r, i) => { r.visible = i >= S.next; r.userData.torus.material.color.setRGB(i === S.next ? 4 : 1.2, i === S.next ? 3 : 0.9, i === S.next ? 1 : 0.4); });
          const r = rings[S.next];
          if (r && passedRing(r, prev, flight.pos)) { S.rings++; S.next++; G.audio.sfx('ring'); G.fx.burst(r.position, 0xffd060, 40, 6); }
          marker.set(r ? r.position : null, r ? `${Math.round(r.position.distanceTo(flight.pos))}m` : '');
          if (S.next >= rings.length || S.t <= 0) { S.drill = 1; S.t = 40; S.pause = 2; rings.forEach((x) => (x.visible = false)); G.ui.banner('Drill 2', 'Catch the Quaffles Madam Hale throws before they hit the ground', ''); throwQuaffle(); }
          hud = `Rings <b>${S.rings}</b>/8`;
        } else if (S.drill === 1) {
          if (quaffle.visible) {
            qv.y -= 9 * dt;
            quaffle.position.addScaledVector(qv, dt);
            marker.set(quaffle.position, 'Quaffle');
            if (quaffle.position.distanceTo(flight.pos) < 2.4) { S.catches++; quaffle.visible = false; G.audio.sfx('card'); G.input.rumble(0.2, 0.4, 100); G.ui.floatText(flight.pos.clone().add(new THREE.Vector3(0, 2, 0)), 'Caught!', 'combo'); setTimeout(() => S.throws < 5 && !S.done && throwQuaffle(), 700); }
            else if (quaffle.position.y < py + 0.4) { quaffle.visible = false; G.audio.sfx('fail'); setTimeout(() => S.throws < 5 && !S.done && throwQuaffle(), 700); }
          }
          if ((S.throws >= 5 && !quaffle.visible) || S.t <= 0) { S.drill = 2; S.t = 25; S.pause = 2; quaffle.visible = false; bl.forEach((b, i) => { b.m.visible = true; b.m.position.set(P.x + (i ? 30 : -30), py + 20, P.z); }); G.ui.banner('Drill 3', 'Survive 25 seconds of Bludgers — roll to dodge', ''); }
          hud = `Catches <b>${S.catches}</b>/5`;
        } else {
          for (const b of bl) {
            b.cd -= dt;
            const to = flight.pos.clone().sub(b.m.position);
            b.v.lerp(to.normalize().multiplyScalar(b.cd > 0 ? 8 : 21), dt * 1.3);
            b.m.position.addScaledVector(b.v, dt);
            b.m.rotation.x += dt * 6;
            if (b.m.position.distanceTo(flight.pos) < 1.6 && b.cd <= 0) {
              b.cd = 2.5; b.v.multiplyScalar(-0.6);
              if (flight.iframes > 0) { G.ui.floatText(flight.pos.clone().add(new THREE.Vector3(0, 2, 0)), 'Dodged!', 'dodge'); continue; }
              S.hits++; flight.knock.copy(b.v).setY(4).multiplyScalar(-1); flight.speed *= 0.5;
              G.audio.sfx('slam'); G.cam.shake(0.5); G.input.rumble(1, 0.8, 250); postHit(1.4);
            }
          }
          marker.set(null);
          if (S.t <= 0) finish(false);
          hud = `Bludger hits <b>${S.hits}</b> (max 3)`;
        }
        G.ui.minigameHUD(`<div class="mg-row"><span>Drill <b>${S.drill + 1}</b>/3</span><span><b>${Math.max(0, S.t).toFixed(0)}</b>s</span><span>${hud}</span></div><div class="stam"><i style="width:${Math.round(flight.stamina * 100)}%"></i></div><small>${flightHelp()}</small>`);
      },
    });
  });
}
