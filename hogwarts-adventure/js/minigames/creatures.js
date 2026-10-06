// Care of Magical Creatures: earn the Hippogriff's trust with a well-timed bow,
// then fly Silvermane through a ring course over the grounds.
import * as THREE from 'three';
import { G } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { Flight, FlightMarker, makeRing, passedRing } from './flight.js';
import { flightHelp } from './quidditch.js';
import { glyph } from '../input.js';
import { rand, clamp, dampAngle } from '../util.js';
import { SPOTS, groundHeight, PLATEAU } from '../world/terrain.js';

export async function play() {
  const pad = SPOTS.paddock;
  const H = G.story.hippogriff;
  const h = H.root;
  H.busy = true;
  await G.ui.fade(1, 0.35);
  G.world.setZone('grounds', { pos: new THREE.Vector3(pad.x - 7, groundHeight(pad.x - 7, pad.z), pad.z), yaw: Math.PI / 2 });
  const p = G.player;
  const hpos = new THREE.Vector3(pad.x + 1, groundHeight(pad.x + 1, pad.z), pad.z);
  h.position.copy(hpos);
  h.rotation.set(0, -Math.PI / 2, 0);
  p.teleport(new THREE.Vector3(pad.x - 6, groundHeight(pad.x - 6, pad.z), pad.z), Math.PI / 2);
  const side = new THREE.Vector3(0, 0, 1);
  G.cam.setCinematic(new THREE.Vector3(pad.x - 3.5, hpos.y + 2.4, pad.z + 7.5), new THREE.Vector3(pad.x - 2, hpos.y + 1.4, pad.z), 100);
  G.ui.fade(0, 0.5);
  const S = { phase: 'tame', trust: 0, mood: 'calm', moodT: 2, rears: 0, done: false, t: 0, rings: 0, next: 0, flightT: 0 };
  let flight = null, rings = [], marker = null;
  const meter = document.createElement('div');
  meter.className = 'trust';
  meter.innerHTML = '<div class="tr-eye"></div><div class="tr-bar"><i></i></div><span>Trust</span>';
  document.getElementById('hud').appendChild(meter);
  G.ui.banner('Care of Magical Creatures', 'Keep eye contact. Bow while Silvermane is calm.', '');

  const startFlight = () => {
    S.phase = 'fly';
    meter.remove();
    p.flying = true;
    p.status.override = 'ride';
    // rider sits on the hippogriff's saddle
    p.model.root.position.set(0, 0, 0);
    H.saddle.add(p.root);
    p.root.position.set(0, 0.1, 0);
    p.root.rotation.set(0, 0, 0);
    flight = new Flight({ pos: hpos.clone().add(new THREE.Vector3(0, 3, 0)), yaw: -Math.PI / 2 + Math.PI, speed: 19, boost: 32, mount: h, bounds: { cx: 0, cz: 0, r: 300 }, minAlt: 2.5, maxAlt: 120, turn: 1.3, camDist: 8, camH: 2.6 });
    flight.yaw = Math.atan2(-pad.x, -pad.z);
    // course: castle loop, lake, quidditch pitch, forest edge, back
    const pts = [
      [80, 30, 60], [40, 45, 10], [0, 62, -40], [-60, 55, -90], [-110, 30, -130], [-170, 18, -70], [-180, 14, 10], [-130, 22, 110],
      [-60, 30, 150], [20, 26, 140], [140, 34, 120], [170, 30, 40], [140, 24, -20], [100, 14, 70],
    ];
    pts.forEach(([x, y, z], i) => {
      const r = makeRing(3.4, 0xa0e8ff);
      const gy = Math.max(groundHeight(x, z), 0);
      r.position.set(x, gy + y * 0.6 + 6, z);
      G.scene.add(r);
      rings.push(r);
    });
    rings.forEach((r, i) => r.lookAt(rings[(i + 1) % rings.length].position));
    marker = new FlightMarker('');
    G.audio.sfx('screech');
    G.ui.banner('Fly, Silvermane!', 'Through every ring and back to the paddock.', 'unlock');
  };

  return new Promise((resolve) => {
    const finish = (aborted, success) => {
      if (S.done) return;
      S.done = true;
      meter.remove();
      rings.forEach((r) => G.scene.remove(r));
      marker?.remove();
      // dismount
      if (p.root.parent !== G.scene) { p.root.parent?.remove(p.root); G.scene.add(p.root); }
      p.flying = false;
      p.status.override = null;
      h.position.copy(hpos); h.rotation.set(0, -Math.PI / 2, 0);
      H.anim.set('idle');
      H.busy = false;
      G.camera.fov = 60; G.camera.updateProjectionMatrix();
      G.audio.wind(0);
      mgExit();
      const time = S.flightT;
      const score = success ? Math.max(100, Math.round(3000 - time * 12)) : S.rings * 50;
      resolve(aborted ? { aborted: true } : {
        title: success ? 'What a flight!' : S.phase === 'tame' ? 'Silvermane would not bow' : 'Flight cut short',
        success, score, points: success ? 25 + Math.max(0, Math.round((150 - time) / 6)) : 3,
        lines: success ? [['Rings', `${S.rings} / ${rings.length}`], ['Flight time', time.toFixed(1) + 's'], ['Bows needed', S.rears + 1]] : [['Trust', Math.round(S.trust) + '%'], ['Rings', S.rings]],
      });
    };
    mgEnter({
      music: 'castle',
      wantsPointer: true,
      abort: () => finish(true),
      update(dt) {
        if (S.done) return;
        const I = G.input;
        if (S.phase === 'tame') {
          S.moodT -= dt;
          if (S.moodT <= 0) {
            if (S.mood === 'calm') { S.mood = 'ruffled'; S.moodT = rand(0.8, 1.6); H.anim.set('spread'); G.audio.sfx('screech'); }
            else { S.mood = 'calm'; S.moodT = rand(1.6, 3.2); H.anim.set('idle'); }
          }
          const bowing = I.isHeld('interact') || I.isHeld('block') || I.isHeld('cast') || I.isHeld('confirm');
          p.status.override = bowing ? 'bow' : null;
          p.anim.set(bowing ? 'bow' : 'idle');
          p.anim.update(dt, 0);
          H.anim.update(dt, 0);
          if (bowing && S.mood === 'calm') S.trust = Math.min(100, S.trust + dt * 26);
          else if (bowing && S.mood === 'ruffled') {
            S.trust = Math.max(0, S.trust - dt * 45);
            if (!S.warned) { S.warned = true; G.cam.shake(0.25); G.input.rumble(0.4, 0.4, 200); G.ui.floatText(hpos.clone().setY(hpos.y + 3), 'She rears up!', 'hurt'); S.rears++; setTimeout(() => (S.warned = false), 900); }
          } else S.trust = Math.max(0, S.trust - dt * 3);
          meter.querySelector('i').style.width = S.trust + '%';
          meter.querySelector('.tr-eye').className = 'tr-eye ' + S.mood;
          meter.querySelector('.tr-eye').textContent = S.mood === 'calm' ? 'calm — bow now' : 'ruffled — wait!';
          G.ui.minigameHUD(`<div class="mg-row"><span>Earn her trust</span></div><small>Hold ${glyph('interact')} to bow while she is calm · ${glyph('pause')} menu</small>`);
          if (S.trust >= 100) {
            S.phase = 'bowback';
            H.anim.set('bow');
            G.audio.sfx('unlock');
            G.ui.banner('Silvermane bows back!', 'Climb on…', 'unlock');
            setTimeout(() => !S.done && startFlight(), 1800);
          }
          return;
        }
        if (S.phase === 'bowback') { H.anim.update(dt, 0); p.anim.update(dt, 0); return; }
        // flying
        S.flightT += dt;
        const prev = flight.pos.clone();
        flight.update(dt);
        H.anim.set(flight.boosting || flight.pitch > 0.2 ? 'fly' : 'glide');
        H.anim.update(dt, 0, { flapRate: flight.boosting ? 7 : 4.5, bank: 0 });
        p.anim.update(dt, 0);
        p.pos.copy(flight.pos);
        if (Math.random() < 0.05 && flight.boosting) G.audio.sfx('whoosh');
        rings.forEach((r, i) => {
          const active = i === S.next;
          r.userData.torus.material.color.setRGB(active ? 1.6 : 0.5, active ? 3.6 : 0.9, active ? 4.6 : 1.2);
          r.userData.inner.material.opacity = active ? 0.2 : 0.03;
          r.visible = i >= S.next || S.next === rings.length;
        });
        const nr = rings[S.next];
        if (nr) {
          marker.set(nr.position, `${Math.round(nr.position.distanceTo(flight.pos))}m`);
          if (passedRing(nr, prev, flight.pos)) {
            S.rings++;
            S.next++;
            G.audio.sfx('ring');
            G.fx.burst(nr.position, 0xa0e8ff, 50, 8, { size: 0.35 });
            G.input.rumble(0.1, 0.3, 60);
          }
        } else {
          // head home to the paddock
          const home = hpos.clone().setY(hpos.y + 4);
          marker.set(home, 'Land at the paddock');
          if (flight.pos.distanceTo(home) < 14) finish(false, true);
        }
        if (S.flightT > 240) finish(false, false);
        const stam = Math.round(flight.stamina * 100);
        G.ui.minigameHUD(`<div class="mg-row"><span>Rings <b>${S.rings}</b>/${rings.length}</span><span><b>${S.flightT.toFixed(0)}</b>s</span></div><div class="stam"><i style="width:${stam}%"></i></div><small>${flightHelp()}</small>`);
      },
    });
  });
}
