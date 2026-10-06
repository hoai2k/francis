// Quidditch practice: fly the broom through golden rings, dodge Bludgers and catch the Snitch.
import * as THREE from 'three';
import { G } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { Flight, FlightMarker, makeRing, passedRing } from './flight.js';
import { makeBroom, makeSnitch, makeBludger } from '../models.js';
import { glyph } from '../input.js';
import { rand, clamp } from '../util.js';
import { postHit, postFlash } from '../engine.js';
import { SPOTS } from '../world/terrain.js';

export async function play() {
  const g = G.world.zones.grounds;
  const P = SPOTS.pitch;
  const py = g.pitchY;
  await G.ui.fade(1, 0.35);
  G.world.setZone('grounds', { pos: new THREE.Vector3(P.x, py, P.z), yaw: Math.PI / 2 });
  G.skyObj.lock = 0.42;
  G.skyObj.tod = 0.42;
  const p = G.player;
  p.flying = true;
  p.status.override = 'fly';
  const broom = makeBroom();
  broom.position.set(0, 0.92, 0.05);
  p.model.root.add(broom);
  p.model.root.position.y = -0.55;
  const flight = new Flight({ pos: new THREE.Vector3(P.x - 40, py + 12, P.z), yaw: Math.PI / 2, speed: 17, boost: 31, mount: p.root, bounds: { cx: P.x, cz: P.z, r: 120 }, minAlt: 1.6, maxAlt: 70 });
  // ring course: the six goal hoops plus rings looping the stands
  const rings = [];
  const course = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    course.push(new THREE.Vector3(P.x + Math.cos(a) * 62, py + 9 + Math.sin(i * 1.7) * 6 + (i % 3) * 4, P.z + Math.sin(a) * 40));
  }
  // weave in the goal hoops
  course.splice(4, 0, g.hoops[4]); course.splice(12, 0, g.hoops[1]);
  course.forEach((c, i) => {
    const r = makeRing(c === g.hoops[4] || c === g.hoops[1] ? 2.0 : 2.6);
    r.position.copy(c);
    const nx = course[(i + 1) % course.length];
    r.lookAt(nx);
    if (c === g.hoops[4] || c === g.hoops[1]) r.rotation.set(0, Math.PI / 2, 0);
    G.scene.add(r);
    rings.push(r);
  });
  const snitch = makeSnitch();
  snitch.visible = false;
  G.scene.add(snitch);
  const snitchLight = G.lights.attach(snitch, 0xffd060, 0, 8);
  const bludgers = [0, 1].map((i) => {
    const b = makeBludger();
    b.position.set(P.x + 30 * (i ? 1 : -1), py + 25, P.z + 20);
    G.scene.add(b);
    return { m: b, vel: new THREE.Vector3(), cd: 4 + i * 3 };
  });
  const marker = new FlightMarker('');
  const snMarker = new FlightMarker('Snitch!');
  snMarker.el.classList.add('gold');
  G.cam.setCinematic(flight.pos.clone().add(new THREE.Vector3(-8, 3, 0)), flight.pos, 100);
  G.ui.fade(0, 0.5);
  const S = { t: 90, score: 0, ringsHit: 0, next: 0, snitchOn: false, caught: false, hits: 0, done: false, intro: 2.2, snitchT: 0 };
  const sv = new THREE.Vector3(), sTarget = new THREE.Vector3();
  G.ui.banner('Quidditch Practice', 'Fly through the rings · dodge the Bludgers · catch the Snitch!', '');
  G.audio.sfx('gong');

  return new Promise((resolve) => {
    const finish = (aborted) => {
      if (S.done) return;
      S.done = true;
      rings.forEach((r) => G.scene.remove(r));
      bludgers.forEach((b) => G.scene.remove(b.m));
      G.scene.remove(snitch);
      snitchLight.release();
      marker.remove(); snMarker.remove();
      p.model.root.remove(broom);
      p.model.root.position.y = 0;
      p.flying = false;
      p.status.override = null;
      G.skyObj.lock = null;
      G.camera.fov = 60; G.camera.updateProjectionMatrix();
      G.audio.wind(0);
      mgExit();
      const score = S.score + (S.caught ? Math.round(S.t * 3) : 0);
      resolve(aborted ? { aborted: true } : {
        title: S.caught ? 'You caught the Snitch!' : 'Time!', success: S.score > 0, score, snitch: S.caught,
        points: Math.round(score / 12),
        lines: [['Rings', S.ringsHit], ['Snitch', S.caught ? 'Caught! +150' : 'Escaped'], ['Bludger hits', S.hits], ['Score', score]],
      });
    };
    mgEnter({
      music: 'quidditch',
      wantsPointer: true,
      abort: () => finish(true),
      update(dt) {
        if (S.done) return;
        if (S.intro > 0) {
          S.intro -= dt;
          p.anim.update(dt, 0);
          flight.mount.position.copy(flight.pos);
          G.cam.setCinematic(flight.pos.clone().add(new THREE.Vector3(-7, 2.5, 3)), flight.pos.clone().add(new THREE.Vector3(10, 0, 0)), 3);
          return;
        }
        const prev = flight.pos.clone();
        flight.update(dt);
        p.pos.copy(flight.pos);
        p.anim.update(dt, 0, { bank: 0 });
        S.t -= dt;
        // rings
        rings.forEach((r, i) => {
          const active = i === S.next;
          r.userData.torus.material.color.setRGB(active ? 4 : 1.2, active ? 3 : 0.9, active ? 1 : 0.4);
          r.userData.inner.material.opacity = active ? 0.18 + Math.sin(G.time * 6) * 0.06 : 0.04;
          r.scale.setScalar(active ? 1 + Math.sin(G.time * 5) * 0.04 : 1);
        });
        const nr = rings[S.next];
        if (nr && passedRing(nr, prev, flight.pos)) {
          S.ringsHit++;
          S.score += 10 + (flight.boosting ? 5 : 0);
          S.t += 2;
          G.audio.sfx('ring');
          G.fx.burst(nr.position, 0xffd060, 50, 7, { size: 0.3 });
          G.fx.shock(nr.position, 0xffd060, 4, 0.4, { sphere: true, intensity: 1 });
          G.input.rumble(0.1, 0.3, 60);
          G.ui.floatText(nr.position.clone(), '+10', 'combo');
          S.next = (S.next + 1) % rings.length;
        }
        marker.set(rings[S.next].position, `${Math.round(rings[S.next].position.distanceTo(flight.pos))}m`);
        // the Snitch appears after a few rings
        if (!S.snitchOn && (S.ringsHit >= 6 || S.t < 50)) {
          S.snitchOn = true;
          snitch.visible = true;
          snitch.position.copy(flight.pos).add(new THREE.Vector3(rand(-20, 20), rand(4, 10), rand(-20, 20)));
          snitchLight.intensity = 30;
          G.ui.banner('The Golden Snitch!', 'Catch it for 150 points!', 'unlock');
          G.audio.sfx('snitch');
        }
        if (S.snitchOn && !S.caught) {
          S.snitchT -= dt;
          if (S.snitchT <= 0 || snitch.position.distanceTo(sTarget) < 2) {
            S.snitchT = rand(0.6, 1.6);
            sTarget.set(P.x + rand(-60, 60), py + rand(4, 30), P.z + rand(-35, 35));
            // flee from the player when close
            const away = snitch.position.clone().sub(flight.pos);
            if (away.length() < 18) sTarget.copy(snitch.position).addScaledVector(away.normalize(), 25).setY(clamp(sTarget.y, py + 4, py + 30));
          }
          const want = sTarget.clone().sub(snitch.position).normalize().multiplyScalar(19 + Math.sin(G.time * 3) * 4);
          sv.lerp(want, dt * 3);
          snitch.position.addScaledVector(sv, dt);
          snitch.position.y += Math.sin(G.time * 11) * 0.05;
          snitch.userData.update(G.time);
          snitch.lookAt(snitch.position.clone().add(sv));
          if (Math.random() < 0.6) G.fx.emit({ pos: snitch.position, color: 0xffd060, count: 1, speed: 0.2, size: 0.15, life: 0.5, intensity: 3, noScale: true });
          if (Math.random() < 0.03) G.audio.sfx('snitch');
          snMarker.set(snitch.position, `Snitch · ${Math.round(snitch.position.distanceTo(flight.pos))}m`);
          if (snitch.position.distanceTo(flight.pos.clone().add(new THREE.Vector3(0, 1, 0))) < 2.2) {
            S.caught = true;
            S.score += 150;
            snitch.visible = false;
            G.slowmo = 1.2;
            postFlash(0.2);
            G.audio.sfx('victory');
            G.ui.banner('Snitch caught!', '+150', 'unlock');
            G.input.rumble(0.6, 0.6, 400);
            setTimeout(() => finish(false), 1800);
          }
        } else snMarker.set(null);
        // Bludgers hunt the player
        for (const b of bludgers) {
          b.cd -= dt;
          const to = flight.pos.clone().sub(b.m.position);
          const d = to.length();
          const sp = b.cd > 0 ? 10 : 23;
          b.vel.lerp(to.normalize().multiplyScalar(sp), dt * (b.cd > 0 ? 0.5 : 1.4));
          b.m.position.addScaledVector(b.vel, dt);
          b.m.rotation.x += dt * 6; b.m.rotation.y += dt * 4;
          if (Math.random() < 0.3) G.fx.smokePuff(b.m.position, 0x303030, 1, { size: 0.5, size1: 1.2, life: 0.6, alpha: 0.3 });
          if (d < 8 && b.cd <= 0 && Math.random() < 0.05) G.audio.sfx('bludger');
          if (d < 1.6 && b.cd <= 0) {
            b.cd = 3;
            b.vel.multiplyScalar(-0.6);
            if (flight.iframes > 0) { G.ui.floatText(flight.pos.clone().add(new THREE.Vector3(0, 2, 0)), 'Dodged!', 'dodge'); continue; }
            S.hits++;
            S.score = Math.max(0, S.score - 5);
            S.t -= 3;
            flight.knock.copy(b.vel).setY(4).multiplyScalar(-1.2);
            flight.speed *= 0.5;
            G.audio.sfx('slam');
            G.cam.shake(0.6);
            G.input.rumble(1, 0.8, 300);
            postHit(1.5);
            G.ui.floatText(flight.pos.clone().add(new THREE.Vector3(0, 2, 0)), 'Bludger! -3s', 'hurt');
          }
        }
        if (S.t <= 0 && !S.caught) finish(false);
        const stam = Math.round(flight.stamina * 100);
        G.ui.minigameHUD(`<div class="mg-row"><span><b>${Math.max(0, S.t).toFixed(0)}</b>s</span><span>Score <b>${S.score}</b></span><span>Rings <b>${S.ringsHit}</b></span></div><div class="stam"><i style="width:${stam}%"></i></div><small>${flightHelp()}</small>`);
      },
    });
  });
}

export function flightHelp() {
  const d = G.input.device;
  if (d === 'pad') return `Left stick steer · ${glyph('cast')} boost · ${glyph('jump')} roll-dodge`;
  if (d === 'touch') return 'Joystick steer · ✦ boost · ⤒ roll-dodge';
  return `WASD / mouse steer · Shift or click boost · Space roll-dodge`;
}
