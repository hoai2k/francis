// A full Quidditch match on the school pitch: seven players a side, the Quaffle, two
// Bludgers and the Golden Snitch, with commentary and a cheering crowd. You play one
// position: Seeker (catch the Snitch), Chaser (carry, pass and shoot the Quaffle),
// Keeper (guard the hoops) or Beater (bat Bludgers at the other team).
import * as THREE from 'three';
import { G, HOUSES, HOUSE_KEYS } from '../state.js';
import { mgEnter, mgExit } from './index.js';
import { Flight, FlightMarker } from './flight.js';
import { makeBroom, makeSnitch, makeBludger } from '../models.js';
import { glyph } from '../input.js';
import { rand, clamp, damp, pick } from '../util.js';
import { postFlash, postHit } from '../engine.js';
import { SPOTS } from '../world/terrain.js';
import { broomStats } from '../quidditch.js';

const ROLES = ['keeper', 'chaser', 'chaser', 'chaser', 'beater', 'beater', 'seeker'];
const SURN = ['Ashby', 'Bramwell', 'Corrigan', 'Dunmore', 'Ellery', 'Fairweather', 'Galloway', 'Hartley', 'Irving', 'Jessop', 'Kerridge', 'Lyle', 'Marsh', 'Northcott', 'Oakes', 'Pennick', 'Quill', 'Rookwood', 'Sallow', 'Thorne', 'Underhill', 'Vance', 'Whitlock', 'Yardley'];
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export async function play(opts = {}) {
  const g = G.world.zones.grounds;
  const P = SPOTS.pitch;
  const py = g.pitchY;
  const us = G.save.house || 'gryffindor';
  const them = opts.opponent || pick(HOUSE_KEYS.filter((h) => h !== us));
  const role = opts.position || G.save.qc?.position || 'seeker';
  const skill = clamp(opts.skill ?? 0.5, 0.2, 0.95); // opponent strength
  const LEN = opts.length || 210;
  await G.ui.fade(1, 0.35);
  G.world.setZone('grounds', { pos: new THREE.Vector3(P.x - 30, py, P.z), yaw: Math.PI / 2 });
  G.skyObj.lock = 0.45;
  const p = G.player;
  p.flying = true;
  p.status.override = 'fly';
  const broom = makeBroom();
  broom.position.set(0, 0.92, 0.05);
  p.model.root.add(broom);
  p.model.root.position.y = -0.55;
  const bs = broomStats();
  const startPos = new THREE.Vector3(P.x - (role === 'keeper' ? 44 : 20), py + 12, P.z + (role === 'seeker' ? 10 : 0));
  const flight = new Flight({ pos: startPos, yaw: Math.PI / 2, speed: bs.speed, boost: bs.boost, turn: bs.turn, mount: p.root, bounds: { cx: P.x, cz: P.z, r: role === 'keeper' ? 999 : 82 }, minAlt: 2, maxAlt: 45 });
  // ---------------------------------------------------------------- teams (instanced riders)
  const robeGeo = new THREE.ConeGeometry(0.42, 1.3, 8); robeGeo.translate(0, 0.6, 0);
  const headGeo = new THREE.SphereGeometry(0.2, 8, 6); headGeo.translate(0, 1.42, 0);
  const broomGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.9, 5); broomGeo.rotateX(Math.PI / 2); broomGeo.translate(0, 0.35, 0.1);
  const mk = (geo, color, n) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }), n); m.frustumCulled = false; m.castShadow = true; G.scene.add(m); return m; };
  const flyers = [];
  const teamMesh = {};
  for (const [t, house] of [['A', us], ['B', them]]) {
    const n = t === 'A' ? 6 : 7;
    teamMesh[t] = { robe: mk(robeGeo, HOUSES[house].c1, n), head: mk(headGeo, '#e8b48f', n), broom: mk(broomGeo, '#6a4428', n) };
    let k = 0;
    ROLES.forEach((r, i) => {
      if (t === 'A' && r === role && !flyers.some((f) => f.team === 'A' && f.role === r && f.isPlayer)) { flyers.push({ team: 'A', role: r, isPlayer: true, name: G.save.name, pos: flight.pos, vel: new THREE.Vector3(), stun: 0 }); return; }
      const side = t === 'A' ? -1 : 1;
      const pos = new THREE.Vector3(P.x + side * (r === 'keeper' ? 44 : 18 + i * 2), py + 10 + i, P.z + (i - 3) * 6);
      flyers.push({ team: t, role: r, idx: k++, name: pick(SURN), pos, vel: new THREE.Vector3(), yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2, stun: 0, home: pos.clone() });
    });
  }
  const me = flyers.find((f) => f.isPlayer);
  const ourHoops = g.hoops.slice(0, 3), theirHoops = g.hoops.slice(3, 6);
  const hoopsOf = (team) => (team === 'A' ? ourHoops : theirHoops); // hoops a team defends
  const targetHoops = (team) => (team === 'A' ? theirHoops : ourHoops);
  // ---------------------------------------------------------------- balls
  const quaffle = { m: new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshStandardMaterial({ color: 0x9a2a1a, roughness: 0.6 })), pos: new THREE.Vector3(P.x, py + 14, P.z), vel: new THREE.Vector3(), carrier: null, lastTeam: null, shot: null, cool: 0 };
  G.scene.add(quaffle.m);
  const bludgers = [0, 1].map((i) => { const m = makeBludger(); G.scene.add(m); return { m, pos: new THREE.Vector3(P.x, py + 12, P.z + (i ? 6 : -6)), vel: new THREE.Vector3(rand(-8, 8), 6, rand(-8, 8)), target: null, cd: 2 + i, batted: 0, by: null }; });
  const snitch = makeSnitch(); snitch.visible = false; G.scene.add(snitch);
  const snitchLight = G.lights.attach(snitch, 0xffd060, 0, 8);
  const sn = { on: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), target: new THREE.Vector3(), t: 0 };
  // ---------------------------------------------------------------- crowd on the stand towers
  const crowdPos = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.31, h = 14 + (i % 2) * 4;
    const cx = P.x + Math.cos(a) * 66, cz = P.z + Math.sin(a) * 34;
    for (let k = 0; k < 9; k++) crowdPos.push({ x: cx + rand(-2.4, 2.4), y: py + h + 0.6, z: cz + rand(-2.4, 2.4), house: HOUSE_KEYS[i % 4], ph: rand(0, 6) });
  }
  const crowdM = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.5, 2, 6), new THREE.MeshStandardMaterial({ roughness: 0.8 }), crowdPos.length);
  crowdPos.forEach((c, i) => crowdM.setColorAt(i, new THREE.Color(HOUSES[c.house].c1)));
  crowdM.frustumCulled = false;
  G.scene.add(crowdM);
  // ---------------------------------------------------------------- HUD bits
  const qMarker = new FlightMarker('Quaffle');
  const snMarker = new FlightMarker('Snitch!'); snMarker.el.classList.add('gold');
  const S = { t: LEN, A: 0, B: 0, done: false, intro: 2.5, log: [], cheer: 0, saves: 0, goals: 0, hits: 0, caught: null, tackles: 0 };
  const say = (txt) => { S.log.unshift(txt); S.log.length = Math.min(S.log.length, 3); };
  const teamName = (t) => HOUSES[t === 'A' ? us : them].name;
  const col = (t) => (t === 'A' ? HOUSES[us].c2 : HOUSES[them].c2);
  const nm = (f) => `<b style="color:${col(f.team)}">${f.isPlayer ? G.save.name : f.name}</b>`;
  say(`Welcome to the match! ${teamName('A')} against ${teamName('B')}. You are playing ${role}.`);
  G.ui.banner(`${teamName('A')} v ${teamName('B')}`, `You play ${role[0].toUpperCase() + role.slice(1)}. ${roleTip(role)}`, '');
  G.audio.sfx('gong');
  G.ui.fade(0, 0.5);

  const cheer = (k = 1) => { S.cheer = 2.5 * k; G.audio.sfx('points'); };
  const giveQuaffle = (f) => { quaffle.carrier = f; quaffle.shot = null; quaffle.lastTeam = f.team; quaffle.cool = 0.4; };
  const dropQuaffle = () => { if (!quaffle.carrier) return; quaffle.vel.copy(quaffle.carrier.vel).multiplyScalar(0.5).add(new THREE.Vector3(0, -2, 0)); quaffle.carrier = null; quaffle.cool = 0.8; };
  const score = (team) => {
    S[team] += 10;
    if (me.role === 'chaser' && quaffle.shooter === me) S.goals++;
    say(`GOAL! ${quaffle.shooter ? nm(quaffle.shooter) : teamName(team)} scores for ${teamName(team)}! ${S.A}–${S.B}`);
    cheer(team === 'A' ? 1.5 : 0.6);
    G.fx.burst(quaffle.pos, team === 'A' ? 0xffd060 : 0xff6060, 60, 8);
    if (team === 'A') G.input.rumble(0.3, 0.5, 200);
    // the defending keeper restarts play
    const keeper = flyers.find((f) => f.team !== team && f.role === 'keeper');
    quaffle.pos.copy(keeper.pos);
    giveQuaffle(keeper);
  };
  const dist = (a, b) => a.distanceTo(b);

  return new Promise((resolve) => {
    const finish = (aborted) => {
      if (S.done) return;
      S.done = true;
      for (const t of ['A', 'B']) for (const k in teamMesh[t]) G.scene.remove(teamMesh[t][k]);
      G.scene.remove(quaffle.m, snitch, crowdM);
      bludgers.forEach((b) => G.scene.remove(b.m));
      snitchLight.release();
      qMarker.remove(); snMarker.remove();
      p.model.root.remove(broom);
      p.model.root.position.y = 0;
      p.flying = false;
      p.status.override = null;
      G.skyObj.lock = null;
      G.camera.fov = 60; G.camera.updateProjectionMatrix();
      G.audio.wind(0);
      mgExit();
      const won = S.A > S.B;
      resolve(aborted ? { aborted: true } : {
        title: won ? `${teamName('A')} win!` : S.A === S.B ? 'A draw!' : `${teamName('B')} win`,
        sub: S.caught ? `${S.caught === 'A' ? 'Your' : 'Their'} Seeker caught the Golden Snitch.` : 'Time ran out before anyone caught the Snitch.',
        success: won, won, us: S.A, them: S.B, opponent: them, score: S.A, points: won ? 50 : 10, noRetry: !!opts.fixture,
        lines: [['Score', `${S.A} – ${S.B}`], ['Position', role], ...(role === 'chaser' ? [['Your goals', S.goals]] : []), ...(role === 'keeper' ? [['Saves', S.saves]] : []), ...(role === 'beater' ? [['Bludger hits', S.hits]] : []), ...(role === 'seeker' ? [['Snitch', S.caught === 'A' ? 'Caught!' : 'Lost']] : [])],
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
          flight.mount.position.copy(flight.pos);
          G.cam.setCinematic(new THREE.Vector3(P.x, py + 30, P.z + 55), new THREE.Vector3(P.x, py + 10, P.z), 2);
          p.anim.update(dt, 0);
          renderAll(dt);
          return;
        }
        S.t -= dt;
        // ---------------- player
        const prevPos = flight.pos.clone();
        if (me.stun > 0) { me.stun -= dt; flight.speed *= 0.97; }
        flight.update(dt);
        me.vel.copy(flight.vel);
        p.pos.copy(flight.pos);
        p.anim.update(dt, 0, { bank: 0 });
        // keeper stays near the hoops
        if (role === 'keeper') {
          const hc = ourHoops[1];
          const d = Math.hypot(flight.pos.x - hc.x, flight.pos.z - hc.z);
          if (d > 22) { flight.pos.x = hc.x + (flight.pos.x - hc.x) * 22 / d; flight.pos.z = hc.z + (flight.pos.z - hc.z) * 22 / d; flight.yaw += (Math.atan2(hc.x - flight.pos.x, hc.z - flight.pos.z) - flight.yaw) * dt * 2; }
        }
        const act = G.input.isPressed('interact') || (G.input.device !== 'kbm' && G.input.isPressed('block'));
        const shoot = G.input.isPressed('lock') || G.input.isPressed('book') && false || G.input.isPressed('confirm') && G.input.device === 'kbm' || G.input.isPressed('next');
        // pass / shoot with the quaffle (chaser and keeper)
        if (quaffle.carrier === me && (act || shoot)) {
          const fwd = flight.forward(new THREE.Vector3());
          const hoop = targetHoops('A').map((h) => ({ h, a: _v.subVectors(h, flight.pos).normalize().dot(fwd), d: dist(h, flight.pos) })).filter((x) => x.a > 0.8 && x.d < 34).sort((a, b) => b.a - a.a)[0];
          const mate = flyers.filter((f) => f.team === 'A' && !f.isPlayer && f.role === 'chaser' && f.stun <= 0).map((f) => ({ f, a: _v.subVectors(f.pos, flight.pos).normalize().dot(fwd), d: dist(f.pos, flight.pos) })).filter((x) => x.a > 0.6 && x.d < 40).sort((a, b) => b.a - a.a)[0];
          quaffle.carrier = null; quaffle.cool = 0.6; quaffle.shooter = me;
          if (hoop && (!mate || hoop.a > mate.a - 0.1 || act === false)) { launch(hoop.h, 34, 'A'); say(`${nm(me)} shoots!`); }
          else if (mate) { launch(mate.f.pos.clone().addScaledVector(mate.f.vel, 0.4), 30, 'A', mate.f); say(`${nm(me)} passes to ${nm(mate.f)}.`); }
          else { quaffle.vel.copy(fwd).multiplyScalar(28); quaffle.shot = { team: 'A' }; }
          G.audio.sfx('throw');
        } else if (act && role === 'chaser' && quaffle.carrier && quaffle.carrier.team === 'B' && dist(quaffle.carrier.pos, flight.pos) < 3.2) {
          // tackle
          if (Math.random() < 0.55 + G.save.level * 0.01) { say(`${nm(me)} steals the Quaffle from ${nm(quaffle.carrier)}!`); giveQuaffle(me); cheer(0.8); S.tackles++; }
          else say(`${nm(quaffle.carrier)} shrugs off the tackle.`);
          G.audio.sfx('slam'); G.cam.shake(0.2); G.input.rumble(0.4, 0.4, 150);
        }
        // beater: bat a nearby bludger at the nearest opponent ahead
        if (role === 'beater' && (act || shoot)) {
          const b = bludgers.filter((b) => dist(b.pos, flight.pos) < 4.5).sort((a, b2) => dist(a.pos, flight.pos) - dist(b2.pos, flight.pos))[0];
          if (b) {
            const fwd = flight.forward(new THREE.Vector3());
            const tgt = flyers.filter((f) => f.team === 'B').map((f) => ({ f, a: _v.subVectors(f.pos, flight.pos).normalize().dot(fwd) })).sort((a, c) => c.a - a.a)[0];
            b.target = tgt && tgt.a > 0.3 ? tgt.f : null;
            b.vel.copy(tgt && tgt.a > 0.3 ? _v.subVectors(tgt.f.pos, b.pos).normalize() : fwd).multiplyScalar(34);
            b.batted = 1.6; b.by = 'A'; b.cd = 0;
            G.audio.sfx('bludger'); G.cam.shake(0.15); G.input.rumble(0.3, 0.3, 100);
            say(`${nm(me)} sends a Bludger flying${tgt && tgt.a > 0.3 ? ` at ${nm(tgt.f)}` : ''}!`);
          }
        }
        // ---------------- AI flyers
        for (const f of flyers) if (!f.isPlayer) ai(f, dt);
        // ---------------- quaffle
        quaffle.cool -= dt;
        if (quaffle.carrier) {
          quaffle.pos.copy(quaffle.carrier.pos).add(new THREE.Vector3(0, 1.1, 0));
        } else {
          quaffle.vel.y -= 4 * dt;
          quaffle.vel.multiplyScalar(Math.exp(-dt * 0.25));
          quaffle.pos.addScaledVector(quaffle.vel, dt);
          if (quaffle.pos.y < py + 1) { quaffle.pos.y = py + 1; quaffle.vel.y = Math.abs(quaffle.vel.y) * 0.4; quaffle.vel.multiplyScalar(0.6); }
          // goals: through a hoop ring (rings face along x)
          if (quaffle.shot) for (const [team, hoops] of [['A', theirHoops], ['B', ourHoops]]) for (const h of hoops) {
            if (Math.abs(quaffle.pos.x - h.x) < 0.9 && Math.hypot(quaffle.pos.y - h.y, quaffle.pos.z - h.z) < 2.0 && quaffle.shot.team === team) { quaffle.shot = null; score(team); }
          }
          // pick-ups
          if (quaffle.cool <= 0) {
            for (const f of flyers) {
              if (f.stun > 0 || (f.role !== 'chaser' && f.role !== 'keeper')) continue;
              const r = f.isPlayer ? 2.6 : 1.8;
              if (dist(f.pos, quaffle.pos) < r) {
                // keepers save shots aimed at their hoops
                if (quaffle.shot && f.role === 'keeper' && quaffle.shot.team !== f.team) { say(`Saved by ${nm(f)}!`); if (f.isPlayer) { S.saves++; cheer(1); G.input.rumble(0.3, 0.5, 150); } }
                else if (f.isPlayer) say(`${nm(f)} has the Quaffle!`);
                giveQuaffle(f);
                break;
              }
            }
          }
        }
        // ---------------- bludgers
        for (const b of bludgers) {
          b.cd -= dt; b.batted -= dt;
          if (!b.target || b.target.stun > 0 || Math.random() < dt * 0.15) b.target = b.batted > 0 ? b.target : pick(flyers.filter((f) => f.role !== 'beater'));
          if (b.batted <= 0 && b.target) {
            const want = _v.subVectors(b.target.pos, b.pos).normalize().multiplyScalar(b.cd > 0 ? 8 : 20);
            b.vel.lerp(want, dt * 1.2);
          }
          b.pos.addScaledVector(b.vel, dt);
          b.pos.y = Math.max(py + 2, b.pos.y);
          if (Math.hypot(b.pos.x - P.x, b.pos.z - P.z) > 85) b.vel.add(_v.set(P.x - b.pos.x, 0, P.z - b.pos.z).normalize().multiplyScalar(dt * 30));
          if (Math.random() < 0.25) G.fx.smokePuff(b.pos, 0x303030, 1, { size: 0.5, size1: 1.2, life: 0.5, alpha: 0.3 });
          for (const f of flyers) {
            if (f.stun > 0 || f.role === 'beater' || dist(f.pos, b.pos) > 1.5 || b.cd > 0) continue;
            if (f.isPlayer && flight.iframes > 0) { G.ui.floatText(flight.pos.clone().add(new THREE.Vector3(0, 2, 0)), 'Dodged!', 'dodge'); b.cd = 1; continue; }
            f.stun = 2.4; b.cd = 2.5; b.vel.multiplyScalar(-0.6);
            if (quaffle.carrier === f) dropQuaffle();
            if (b.by === 'A' && f.team === 'B') { S.hits++; cheer(0.7); }
            say(`${nm(f)} is hit by a Bludger!`);
            if (f.isPlayer) { flight.knock.copy(b.vel).setY(4).multiplyScalar(-1); flight.speed *= 0.4; G.audio.sfx('slam'); G.cam.shake(0.6); G.input.rumble(1, 0.8, 300); postHit(1.5); }
            b.by = null;
          }
          // AI beaters protect their team
          for (const f of flyers) {
            if (f.isPlayer || f.role !== 'beater' || f.stun > 0 || dist(f.pos, b.pos) > 3 || b.batted > 0) continue;
            const opp = pick(flyers.filter((o) => o.team !== f.team && o.role !== 'beater'));
            b.vel.copy(_v.subVectors(opp.pos, b.pos).normalize().multiplyScalar(26 + skill * 6 * (f.team === 'B' ? 1 : 0.8)));
            b.target = opp; b.batted = 1.4; b.by = f.team;
            G.audio.sfx('bludger');
          }
        }
        // ---------------- snitch
        if (!sn.on && LEN - S.t > 25 + Math.random() * 3) {
          sn.on = true; snitch.visible = true; snitchLight.intensity = 30;
          sn.pos.set(P.x + rand(-30, 30), py + rand(8, 20), P.z + rand(-20, 20));
          say('The Golden Snitch has been sighted!');
          if (role === 'seeker') G.ui.banner('The Golden Snitch!', 'Catch it to win 150 points and end the match', 'unlock');
          G.audio.sfx('snitch');
        }
        if (sn.on && !S.caught) {
          sn.t -= dt;
          if (sn.t <= 0 || dist(sn.pos, sn.target) < 2) {
            sn.t = rand(0.5, 1.4);
            sn.target.set(P.x + rand(-60, 60), py + rand(3, 28), P.z + rand(-34, 34));
            const near = flyers.filter((f) => f.role === 'seeker').reduce((a, f) => Math.min(a, dist(f.pos, sn.pos)), 99);
            if (near < 14) { const away = sn.pos.clone().sub(flyers.find((f) => f.role === 'seeker' && dist(f.pos, sn.pos) === near).pos).normalize(); sn.target.copy(sn.pos).addScaledVector(away, 22); sn.target.y = clamp(sn.target.y, py + 3, py + 28); }
          }
          sn.vel.lerp(_v.subVectors(sn.target, sn.pos).normalize().multiplyScalar(19 + Math.sin(G.time * 3) * 4), dt * 3);
          sn.pos.addScaledVector(sn.vel, dt);
          snitch.position.copy(sn.pos);
          snitch.userData.update(G.time);
          if (Math.random() < 0.5) G.fx.emit({ pos: sn.pos, color: 0xffd060, count: 1, speed: 0.2, size: 0.15, life: 0.5, intensity: 3, noScale: true });
          for (const f of flyers) {
            if (f.role !== 'seeker' || f.stun > 0) continue;
            const r = f.isPlayer ? 2.3 : 1.3;
            const d = dist(f.pos, sn.pos);
            const chance = f.isPlayer ? 1 : f.team === 'B' ? 0.5 + skill * 0.4 : 0.55;
            if (d < r && (f.isPlayer || Math.random() < chance * dt * 3)) {
              S.caught = f.team; S[f.team] += 150;
              snitch.visible = false; snitchLight.intensity = 0;
              say(`${nm(f)} CATCHES THE SNITCH! 150 points to ${teamName(f.team)}!`);
              G.slowmo = 1.4; postFlash(0.25);
              cheer(f.team === 'A' ? 2 : 0.5);
              if (f.isPlayer) G.input.rumble(0.6, 0.6, 400);
              setTimeout(() => finish(false), 2200);
            }
          }
        }
        if (S.t <= 0 && !S.caught) {
          // the referee calls time — whichever Seeker is nearer usually snatches it at the whistle
          finish(false);
          return;
        }
        renderAll(dt);
        // markers and HUD
        if (role === 'seeker') { snMarker.set(sn.on && !S.caught ? sn.pos : null, sn.on ? `Snitch · ${Math.round(dist(sn.pos, flight.pos))}m` : ''); qMarker.set(null); }
        else { qMarker.set(quaffle.carrier === me ? null : quaffle.pos, quaffle.carrier ? (quaffle.carrier.team === 'A' ? 'Quaffle (ours)' : 'Quaffle (theirs)') : 'Quaffle'); snMarker.set(null); }
        const stam = Math.round(flight.stamina * 100);
        G.ui.minigameHUD(`<div class="mg-row"><span style="color:${HOUSES[us].c2 === '#2b2622' ? '#f0d060' : HOUSES[us].c2}"><b>${S.A}</b> ${HOUSES[us].name}</span><span><b>${Math.max(0, Math.ceil(S.t))}</b>s</span><span>${HOUSES[them].name} <b>${S.B}</b></span></div><div class="stam"><i style="width:${stam}%"></i></div><div class="qlog">${S.log.map((l) => `<div>${l}</div>`).join('')}</div><small>${controlsFor(role, quaffle.carrier === me)}</small>`);
      },
    });

    function launch(target, speed, team, receiver) {
      const to = _v.subVectors(target, quaffle.pos);
      const t = to.length() / speed;
      quaffle.vel.copy(to).multiplyScalar(1 / t).add(new THREE.Vector3(0, 2 * t, 0));
      quaffle.shot = receiver ? null : { team };
      quaffle.pass = receiver || null;
      quaffle.cool = receiver ? 0.15 : 0.35;
    }
    function steer(f, goal, speed, dt) {
      const want = _w.subVectors(goal, f.pos);
      const d = want.length();
      if (d > 0.01) want.multiplyScalar(Math.min(speed, d * 2) / d);
      f.vel.lerp(want, dt * 2.2);
      f.pos.addScaledVector(f.vel, dt);
      f.pos.y = clamp(f.pos.y, py + 2, py + 40);
      if (f.vel.lengthSq() > 1) f.yaw = Math.atan2(f.vel.x, f.vel.z);
    }
    function ai(f, dt) {
      if (f.stun > 0) { f.stun -= dt; f.vel.multiplyScalar(0.96); f.vel.y -= 4 * dt; f.pos.addScaledVector(f.vel, dt); f.pos.y = Math.max(py + 2, f.pos.y); return; }
      const sk = f.team === 'B' ? skill : 0.55;
      const sp = { chaser: 14, keeper: 12, beater: 14, seeker: 17 }[f.role] * (0.85 + sk * 0.3);
      if (f.role === 'keeper') {
        const hc = hoopsOf(f.team)[1];
        let goal = hc.clone().add(new THREE.Vector3(f.team === 'A' ? 4 : -4, -2, 0));
        if (quaffle.carrier === f) {
          // hold briefly, then pass to a chaser
          f.holdT = (f.holdT || 0) + dt;
          if (f.holdT > 1.2) { f.holdT = 0; const mate = pick(flyers.filter((m) => m.team === f.team && m.role === 'chaser' && m.stun <= 0)); if (mate) { quaffle.carrier = null; launch(mate.pos.clone(), 26, f.team, mate); quaffle.shooter = f; } }
        } else if (quaffle.shot && quaffle.shot.team !== f.team) {
          // move into the shot's path
          goal = quaffle.pos.clone().addScaledVector(quaffle.vel, 0.3);
          goal.x = clamp(goal.x, Math.min(hc.x, hc.x + (f.team === 'A' ? 6 : -6)), Math.max(hc.x, hc.x + (f.team === 'A' ? 6 : -6)));
          const reach = sk * 0.9 + 0.2;
          if (Math.random() > reach) goal.y += 3;
        } else if (quaffle.carrier && quaffle.carrier.team !== f.team) goal.z = clamp(quaffle.carrier.pos.z, hc.z - 7, hc.z + 7);
        steer(f, goal, sp, dt);
        return;
      }
      if (f.role === 'seeker') {
        const goal = sn.on && !S.caught ? sn.pos.clone().addScaledVector(sn.vel, 0.25) : new THREE.Vector3(P.x + Math.sin(G.time * 0.3 + (f.team === 'A' ? 0 : 3)) * 40, py + 30, P.z + Math.cos(G.time * 0.25) * 20);
        steer(f, goal, sp * (sn.on ? 1.1 : 0.7), dt);
        return;
      }
      if (f.role === 'beater') {
        const near = bludgers.reduce((a, b) => (dist(b.pos, f.pos) < dist(a.pos, f.pos) ? b : a));
        const mates = flyers.filter((m) => m.team === f.team && m.role !== 'beater');
        const guard = mates.reduce((a, m) => (dist(m.pos, near.pos) < dist(a.pos, near.pos) ? m : a));
        steer(f, guard.pos.clone().lerp(near.pos, 0.5), sp, dt);
        return;
      }
      // chasers
      if (quaffle.carrier === f) {
        const hoop = targetHoops(f.team)[Math.floor((f.idx || 0) % 3)];
        const goal = hoop.clone().add(new THREE.Vector3(f.team === 'A' ? -14 : 14, 0, 0));
        steer(f, goal, sp * 0.95, dt);
        const pressure = flyers.some((o) => o.team !== f.team && o.role === 'chaser' && dist(o.pos, f.pos) < 4);
        if (dist(f.pos, hoop) < 24 + sk * 4) {
          quaffle.carrier = null; quaffle.shooter = f;
          const err = (1 - sk) * 3.5 + (f.team === 'A' ? 1.8 : 0);
          launch(hoop.clone().add(new THREE.Vector3(0, rand(-err, err), rand(-err, err))), 30, f.team);
          say(`${nm(f)} shoots…`);
        } else if (pressure && Math.random() < dt * 2) {
          const mate = pick(flyers.filter((m) => m.team === f.team && (m.role === 'chaser') && m !== f && m.stun <= 0));
          if (mate) { quaffle.carrier = null; quaffle.shooter = f; launch(mate.pos.clone().addScaledVector(mate.vel, 0.4), 28, f.team, mate); }
        }
        return;
      }
      if (quaffle.carrier && quaffle.carrier.team === f.team) {
        // support run: spread out ahead of the carrier
        const ahead = quaffle.carrier.pos.clone().add(new THREE.Vector3(f.team === 'A' ? 12 : -12, (f.idx % 3) * 3 - 3, ((f.idx % 3) - 1) * 9));
        steer(f, ahead, sp, dt);
      } else if (quaffle.carrier) {
        steer(f, quaffle.carrier.pos, sp * 1.05, dt);
        if (dist(f.pos, quaffle.carrier.pos) < 1.6 && Math.random() < dt * (1 + sk)) {
          const victim = quaffle.carrier;
          if (Math.random() < 0.35 + sk * 0.25) { say(`${nm(f)} steals it from ${nm(victim)}!`); giveQuaffle(f); if (victim.isPlayer) { G.input.rumble(0.4, 0.3, 150); G.cam.shake(0.2); } }
        }
      } else steer(f, quaffle.pos.clone().addScaledVector(quaffle.vel, 0.3), sp * 1.1, dt);
    }
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
    function renderAll(dt) {
      for (const f of flyers) {
        if (f.isPlayer) continue;
        const T = teamMesh[f.team];
        _e.set(f.stun > 0 ? Math.sin(G.time * 12) * 0.6 : -0.25, f.yaw, 0, 'YXZ');
        _q.setFromEuler(_e);
        _m.compose(f.pos, _q, _s);
        T.robe.setMatrixAt(f.idx, _m); T.head.setMatrixAt(f.idx, _m); T.broom.setMatrixAt(f.idx, _m);
      }
      for (const t of ['A', 'B']) for (const k in teamMesh[t]) teamMesh[t][k].instanceMatrix.needsUpdate = true;
      quaffle.m.position.copy(quaffle.pos);
      for (const b of bludgers) { b.m.position.copy(b.pos); b.m.rotation.x += dt * 6; }
      S.cheer = Math.max(0, S.cheer - dt);
      crowdPos.forEach((c, i) => {
        const jump = S.cheer > 0 ? Math.abs(Math.sin(G.time * 9 + c.ph)) * 0.5 : Math.sin(G.time * 2 + c.ph) * 0.03;
        _m.makeTranslation(c.x, c.y + jump, c.z);
        crowdM.setMatrixAt(i, _m);
      });
      crowdM.instanceMatrix.needsUpdate = true;
    }
  });
}

function roleTip(role) {
  return { seeker: 'Find and catch the Golden Snitch.', chaser: 'Grab the Quaffle, pass and shoot through their hoops.', keeper: 'Block shots at your three hoops.', beater: 'Bat Bludgers at the other team and protect your own.' }[role];
}
function controlsFor(role, holding) {
  const d = G.input.device;
  const a = d === 'pad' ? glyph('interact') : d === 'touch' ? '✋' : 'E';
  const fly = d === 'pad' ? 'Left stick steer' : d === 'touch' ? 'Joystick steer' : 'WASD / mouse steer';
  const boost = d === 'pad' ? glyph('cast') : d === 'touch' ? '✦' : 'Shift / click';
  if (role === 'chaser') return `${fly} · ${boost} boost · ${a} ${holding ? 'pass / shoot (aim at a hoop to shoot)' : 'tackle the carrier'}`;
  if (role === 'keeper') return `${fly} · ${boost} boost · get in front of shots · ${a} pass when you hold the Quaffle`;
  if (role === 'beater') return `${fly} · ${boost} boost · ${a} bat a nearby Bludger at the opponent you face`;
  return `${fly} · ${boost} boost · ${glyph('jump')} roll-dodge · fly into the Snitch to catch it`;
}
