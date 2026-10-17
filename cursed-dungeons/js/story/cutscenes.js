// The game's cutscenes, and game.cutscenes (the player for them).
//   opening          first launch: a school in Sendai at night, a cursed finger,
//                    a curse attacks, your technique awakens, Gojo arrives and
//                    recruits you to Jujutsu High (then the hub loads)
//   arrive_hub       an establishing shot of Jujutsu High, the first time you enter
//   mission_<id>     a short briefing over the level (Ijichi / Nitta), first time per mission
//   boss_<bossId>    the Special Grade reveal with its name card (jogo, hanami, mahito)
//   boss_down_<id>   the boss exorcised
// Each builds its set in the engine (world/cutsceneSets.js, or the level that
// is loaded) and returns its shots for story/cutscene.js.
//
// game.cutscenes.play(id, { onEnd, opts }) -> boolean   plays it (false: no such cutscene)
// game.cutscenes.playOnce(id, ...)                       only if this save hasn't seen it
// game.cutscenes.seen(id) / .active
import * as THREE from 'three/webgpu';
import { Cutscene, move, keys, orbit, actor, gameplayPose } from './cutscene.js';
import { buildSchoolSet } from '../world/cutsceneSets.js';
import { BIOMES } from '../world/biomes.js';
import { buildSorcererModel, SORCERER_LOOKS } from '../entities/models.js';
import { buildCurseModel } from '../entities/curses.js';
import { SORCERERS } from '../sorcerers/index.js';
import { MISSIONS } from '../ui/screens.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GOJO = '#6ad8ff', IJICHI = '#c8d0e0', NITTA = '#ffb070', CURSE = '#c08aff';

// ------------------------------------------------------------------ helpers
function heroId(game) {
  const p = game.players.find((q) => !q.ai) ?? game.players[0];
  const id = p?.sorcerer ?? game.save?.data?.technique;
  return SORCERERS[id] ? id : 'yuji';
}
function heroColor(id) {
  const c = SORCERERS[id]?.color ?? SORCERER_LOOKS[id]?.accent ?? '#a05aff';
  return new THREE.Color(c);
}
const hex = (c) => '#' + c.getHexString();
function hidePlayers(game, v = false) { for (const p of game.players) p.object.visible = v; }
// stage a set as the current level
function setLevel(game, L, biome) {
  game.clearLevel();
  game.loadWorld(L, biome);
  game.minimap.level = null; game.hud.mini?.classList.add('hidden');
  game.placePlayers(L.spawn);
  game.mode = 'cutscene';
  hidePlayers(game);
}
// lift a camera position out of any block it would sit inside
function clear(game, v) {
  const w = game.world; if (!w) return v;
  for (let i = 0; i < 24 && w.solidAt(v.x, v.y, v.z); i++) v.y += 1;
  return v;
}
const centroid = (game) => {
  const ps = game.players.filter((p) => !p.dead);
  const c = V(0, 0, 0); if (!ps.length) return game.level?.spawn?.clone() ?? c;
  for (const p of ps) c.add(p.pos); return c.divideScalar(ps.length);
};
// a glowing sphere (Lapse: Blue, cursed energy)
function orb(color, r = 1, opacity = 0.85) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(color).multiplyScalar(3), transparent: true, opacity, depthWrite: false }));
  m.material.fog = false; return m;
}

// ------------------------------------------------------------------ mission briefings
const BRIEF = {
  m1: { who: 'Ijichi', color: IJICHI, a: 'Curses slipped past the school barrier tonight. Mostly Grade 3.', b: 'Exorcise them. Something bigger is nesting at the far end.' },
  m2: { who: 'Nitta', color: NITTA, a: 'Three first-years went in and never came out. They\'re caged downtown.', b: 'Break the talisman cages. A curse that toys with souls was sighted.' },
  m3: { who: 'Ijichi', color: IJICHI, a: 'Cursed objects are buried all through this forest. It\'s rotting.', b: 'Seal every one. Whatever feeds on them will come for you.' },
  m4: { who: 'Ijichi', color: IJICHI, a: 'The Toei line flooded last week. Now the water is boiling.', b: 'Clear the tunnels. Whatever lives down there runs hot.' },
  m5: { who: 'Nitta', color: NITTA, a: 'October 31st. A curtain fell over Shibuya with civilians inside.', b: 'Get them out. Every sorcerer in Tokyo is already in there.' },
  m6: { who: 'Ijichi', color: IJICHI, a: 'A Special Grade is erupting under Shibuya. This is the big one.', b: 'Seal the sources. And please... come back alive.' },
};
const OBJ_LINE = { exorcise: 'Exorcise the curses, then the arena opens.', rescue: 'Free the trapped students, then the arena opens.', seal: 'Seal the cursed objects, then the arena opens.' };

// ------------------------------------------------------------------ bosses
const BOSS = {
  jogo: { name: 'JOGO', kanji: '漏瑚', sub: 'Special Grade Cursed Spirit · Disaster Flames', line: 'Humans are fakes. We curses are the real thing!', down: 'A hundred years from now... we will be the humans.', color: '#ff6a1a' },
  hanami: { name: 'HANAMI', kanji: '花御', sub: 'Special Grade Cursed Spirit · Disaster Plants', line: 'I only wish to protect this planet. From you.', down: 'The earth... will remember...', color: '#7aff5a' },
  mahito: { name: 'MAHITO', kanji: '真人', sub: 'Special Grade Cursed Spirit · Idle Transfiguration', line: 'The soul comes before the body. Let me show you.', down: 'Heh... Curses never really die, you know.', color: '#7ad8ff' },
};

// ------------------------------------------------------------------ definitions
const NIGHT = { ...BIOMES.jujutsu_high, name: 'Sendai', sub: 'Night', fogDensity: 0.011, skyTop: 0x060a24, skyHorizon: 0x26244a, particles: 'fireflies' };

function openingDef() {
  return {
    id: 'opening', title: 'Awakening',
    build(game, cs) {
      const L = buildSchoolSet();
      setLevel(game, L, NIGHT);
      game.audio.setMusic('title');
      const me = heroId(game), info = SORCERERS[me], col = heroColor(me), colHex = hex(col);
      const YOU = L.you, FY = L.FY;
      const actors = [], extra = [], lights = [];
      const add = (o) => { game.scene.add(o); extra.push(o); return o; };
      // the moon, huge and pale, over the school roof (anime-style)
      const moon = add(orb(0xdfe6ff, 9, 1)); moon.material.color = new THREE.Color(0xe8eeff).multiplyScalar(1.6); moon.position.set(-2, 108, -72);
      const halo = add(orb(0x8a9ad8, 15, 0.12)); halo.position.copy(moon.position);
      // you, with the finger (still wrapped in its seal) in your right hand
      const you = actor(game, buildSorcererModel(me), YOU, Math.PI); actors.push(you);
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), new THREE.MeshStandardNodeMaterial({ color: 0x4a3030, emissive: 0xff1a2a, emissiveIntensity: 0, roughness: 0.7 }));
      finger.position.set(0, -0.1, 0.1); finger.rotation.x = Math.PI / 2; you.rig.handR.add(finger);
      const seal = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.09), new THREE.MeshStandardNodeMaterial({ color: 0xefe2bc, emissive: 0x7a1a10, emissiveIntensity: 0.25, roughness: 0.9 }));
      finger.add(seal);
      let sealFall = null;
      const fingerLight = game.lights.attach(finger, 0xff2a4a, 0, 5, { offsetY: 0 }); lights.push(fingerLight);
      // the curse that comes for it, and the smaller ones behind it
      const big = actor(game, buildCurseModel('tank'), L.roof, 0, { scale: 1.7 }); big.show(false); actors.push(big);
      const swarm = [];
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.15 + (i / 6) * Math.PI * 1.7, r = 6 + (i % 2) * 1.6;
        const p = V(YOU.x + Math.sin(a) * r, FY, YOU.z - 2 + Math.cos(a) * r);
        const s = actor(game, buildCurseModel(['swarmer', 'spitter', 'teleporter'][i % 3]), p, 0); s.show(false); s.faceTo(YOU); actors.push(s); swarm.push(s);
      }
      const gojo = actor(game, buildSorcererModel('gojo'), L.gojoRoof, 0); gojo.show(false); actors.push(gojo);
      // Lapse: Blue
      const blue = add(orb(0x3a7aff, 1, 0.9)); blue.visible = false; const blueCore = orb(0xcfe6ff, 0.45, 1); blue.add(blueCore);
      let blueLight = null, pull = null;
      // the awakening aura
      let aura = 0, auraLight = null;
      const heartbeat = () => { game.audio.tone({ freq: 62, to: 40, dur: 0.18, gain: 0.45 }); setTimeout(() => game.audio.tone({ freq: 58, to: 38, dur: 0.16, gain: 0.35 }), 180); };
      const curseTo = V(0, 0, 0);
      const mid = YOU.clone().lerp(L.gojoLand, 0.5);
      const isGojo = me === 'gojo', isSukuna = me === 'sukuna';
      const shots = [
        // 1 — the school at night
        { dur: 5.6, fadeIn: 'black',
          cam: move({ pos: [40.5, 9, 80], look: [40.5, 10, 18] }, { pos: [40.5, 7.2, 64], look: [40.5, 9, 20] }, { fov: 40, fov2: 37 }),
          cards: [{ at: 0.7, dur: 4.2, kind: 'place', kicker: 'Sendai · 11:47 PM', title: 'Sugisawa Third High', kanji: '杉沢第三高校' }],
          lines: [{ at: 1.6, text: 'Some things are sealed away for a reason.' }] },
        // 2 — you, and the occult club's "lucky charm"
        { dur: 5.4,
          enter: () => you.pose('cast'),
          cam: orbit(YOU, { r: 6, r2: 5, y: 2.1, y2: 1.8, a0: Math.PI - 0.8, a1: Math.PI - 0.35, lookY: 1.3, fov: 34 }),
          lines: [{ at: 0.4, who: 'You', color: colHex, text: isSukuna ? 'The occult club\'s lucky charm... Why does it feel like mine?' : 'The occult club\'s "lucky charm"... it\'s just an old finger?' }],
          act: (k, dt, t) => {
            if (t > 2.6 && !sealFall) { sealFall = { v: V(0.4, 1.2, 0.8), w: 0 }; const wp = seal.getWorldPosition(V()); finger.remove(seal); seal.position.copy(wp); add(seal); game.audio.whoosh(0.6); }
            if (sealFall) { sealFall.v.y -= 6 * dt; seal.position.addScaledVector(sealFall.v, dt); seal.rotation.x += dt * 5; seal.rotation.z += dt * 3; if (seal.position.y < FY + 0.05) { seal.position.y = FY + 0.05; sealFall.v.set(0, 0, 0); } }
            if (t > 2.6) { const e = Math.min(1, (t - 2.6) / 1.5); finger.material.emissiveIntensity = e * 1.1; fingerLight.intensity = e * 4; }
          } },
        // 3 — the finger, close
        { dur: 4.4, dof: 0.6,
          cam: (k) => {
            const f = finger.getWorldPosition(V());
            return move({ pos: [YOU.x + 1.1, FY + 2.1, YOU.z - 2.8], look: f }, { pos: [YOU.x + 0.6, FY + 1.8, YOU.z - 2.1], look: f }, { fov: 30, fov2: 24 })(k);
          },
          lines: [{ at: 0.3, text: 'A Special Grade cursed object: a finger of Ryomen Sukuna, the King of Curses.' }, { at: 2.6, text: 'And curses can smell it.' }],
          flash: [{ at: 0.6, color: 0xff1a2a, amount: 0.18, dur: 0.25 }, { at: 1.5, color: 0xff1a2a, amount: 0.22, dur: 0.25 }, { at: 2.4, color: 0xff1a2a, amount: 0.28, dur: 0.3 }],
          enter: () => { heartbeat(); setTimeout(heartbeat, 900); setTimeout(heartbeat, 1800); },
          act: (k, dt) => {
            finger.material.emissiveIntensity = 1.1 + Math.sin(game.time * 7) * 0.5; fingerLight.intensity = 4 + Math.sin(game.time * 7) * 1.5;
            const f = finger.getWorldPosition(V());
            if (Math.random() < dt * 30) game.particles.burst(f, { count: 2, color: 0xff2a4a, speed: 0.6, up: 1.2, life: 0.8, size: 0.06, drag: 1 });
          } },
        // 4 — something on the roof
        { dur: 5,
          enter: () => { big.show(true); big.faceTo(YOU); big.pose('raise'); game.audio.boss(); game.audio.setMusic('boss'); },
          cam: keys([
            { k: 0, pos: [YOU.x + 1.8, FY + 1.2, YOU.z + 4.5], look: [L.roof.x, L.roof.y + 2.4, L.roof.z], fov: 46 },
            { k: 0.5, pos: [YOU.x + 1.5, FY + 1.3, YOU.z + 4], look: [L.roof.x, L.roof.y + 2.8, L.roof.z], fov: 40 },
            { k: 1, pos: [YOU.x + 4.5, FY + 1.8, YOU.z + 5.5], look: [L.curseLand.x, FY + 3, L.curseLand.z], fov: 42, ease: 'out' },
          ]),
          lines: [{ at: 0.5, who: 'Curse', color: CURSE, text: 'Gim... me... GIVE IT TO MEEEE!' }],
          shake: [{ at: 0.4, amount: 0.25 }],
          act: (k, dt, t) => {
            if (t > 2.5 && !big.leapt) { big.leapt = true; big.pose(null); big.leap(L.curseLand, 1.0, 5); game.audio.whoosh(1.4); }
            if (t > 3.5 && !big.landed) { big.landed = true; cs.shake(0.9); game.fx.shockwave(L.curseLand, 0xb05aff, 6); game.fx.landDust(L.curseLand, 12); game.audio.impact(1.8); game.fx.debris?.(L.curseLand, 0x8a7a6a, 14); }
          } },
        // 5 — it lands in front of you
        { dur: 3.6,
          enter: () => { big.faceTo(YOU); big.pose('attack', { style: 'slam', dur: 0.7, once: true }); },
          cam: move({ pos: [YOU.x + 11, FY + 2.4, YOU.z - 2.4], look: [YOU.x, FY + 2.2, YOU.z - 2.8] }, { pos: [YOU.x + 9.6, FY + 2, YOU.z - 1.8], look: [YOU.x, FY + 2.1, YOU.z - 2.6] }, { fov: 40 }),
          lines: [{ at: 0.9, who: 'You', color: colHex, text: 'What... what IS that?!' }],
          act: (k, dt, t) => {
            if (t > 0.45 && !you.hitT) { you.hitT = 1; you.pose('hit', { dur: 0.6, once: true }); cs.shake(0.6); game.fx.shockwave(YOU, 0xb05aff, 3); game.audio.impact(1.2); game.fx.flash(0xffffff, 0.25, 0.12); }
            if (t > 0.45 && t < 0.9) you.pos.z += dt * 2.6;
          } },
        // 6 — the awakening
        { dur: 5.6, dof: 0.35,
          enter: () => { you.pose('sign'); you.face(Math.PI); game.audio.charge(4.6, 0.8); auraLight = game.lights.attach(you.rig.root, col, 0, 10, { offsetY: 1.4, priority: 4 }); lights.push(auraLight); },
          cam: move({ pos: [YOU.x - 0.5, FY + 1.5, YOU.z - 4.6], look: [YOU.x, FY + 1.5, YOU.z + 1] }, { pos: [YOU.x - 0.2, FY + 1.75, YOU.z - 3.1], look: [YOU.x, FY + 1.9, YOU.z + 1.2] }, { fov: 34, fov2: 28 }),
          lines: [{ at: 0.3, who: 'You', color: colHex, text: 'Something inside me just... woke up.' }],
          cards: [{ at: 1.4, dur: 3.6, kind: 'technique', kicker: 'Cursed Technique', title: (info.technique ?? 'Awakening').toUpperCase(), kanji: '術式覚醒', color: colHex, sub: info.title ?? '' }],
          flash: [{ at: 4.9, color: 0xffffff, amount: 0.85, dur: 0.45 }],
          shake: [{ at: 4.9, amount: 0.7 }],
          act: (k, dt, t) => {
            aura = Math.min(1, Math.max(0, (t - 0.6) / 3.5));
            if (t > 3.6 && you.action?.type !== 'raise') you.pose('raise');
            if (t > 4.9 && !you.burst) { you.burst = true; game.fx.shockwave(you.pos, col, 7); game.lights.flash(you.pos.clone().setY(FY + 2), col, 14, 16, 0.6); game.audio.energy('blue'); }
          } },
        // 7 — your first strike, and more curses
        { dur: 4.4,
          enter: () => { you.pos.copy(YOU).setZ(YOU.z + 0.6); you.face(Math.PI); you.pose('attack', { style: 'punch', dur: 0.5, once: true }); },
          cam: move({ pos: [YOU.x + 6.5, FY + 2.6, YOU.z - 1], look: [YOU.x, FY + 1.6, YOU.z - 3] }, { pos: [YOU.x + 7.5, FY + 3.6, YOU.z + 2.2], look: [YOU.x, FY + 1.4, YOU.z - 2] }, { fov: 40 }),
          lines: [{ at: 2, who: 'You', color: colHex, text: 'There\'s... more of them.' }],
          act: (k, dt, t) => {
            if (t > 0.22 && !big.knocked) {
              big.knocked = true; const at = big.pos.clone().setY(FY + 2);
              game.fx.explosion(at, col, 3); game.fx.shockwave(big.pos, col, 5); game.fx.hitSpark?.(at, V(0, 0, -1), { color: col.getHex(), big: true, crit: true });
              game.audio.impact(1.8); cs.shake(0.7); game.hitStop?.(0.08);
              big.leap(V(L.curseLand.x, FY, L.curseLand.z - 4), 0.5, 1.2); big.pose('hit', { dur: 0.6, once: true });
            }
            if (t > 1.5 && !swarm[0].visible) { for (const s of swarm) { s.show(true); game.fx.summonCircle(s.pos, 0xb05aff); s.walk(s.pos.clone().lerp(YOU, 0.25), 1.2); } game.audio.energy('summon'); }
          } },
        // 8 — on the roof, against the moon
        { dur: 4.4,
          enter: () => { gojo.show(true); gojo.face(0.35); game.fx.blinkPuff(gojo.pos, 0x6ad8ff); game.audio.setMusic(null); game.audio.whoosh(1); },
          cam: move({ pos: [34.8, FY + 1.6, 33.5], look: [L.gojoRoof.x, L.gojoRoof.y + 1.6, L.gojoRoof.z] }, { pos: [34, FY + 1.3, 32], look: [L.gojoRoof.x, L.gojoRoof.y + 2.0, L.gojoRoof.z] }, { fov: 24, fov2: 19 }),
          lines: [{ at: 0.6, who: 'Gojo', color: GOJO, text: 'Yo. That\'s a lot of curses for one high schooler.' }] },
        // 9 — Lapse: Blue
        { dur: 4.4,
          enter: () => {
            gojo.pose('cast');
            for (const s of swarm) { s.to = null; }
            const c = V(YOU.x, FY + 2.2, YOU.z - 5); blue.position.copy(c); blue.visible = true; blue.scale.setScalar(0.01);
            blueLight = game.lights.attach(blue, 0x4a8aff, 0, 16, { offsetY: 0, priority: 4 }); lights.push(blueLight);
            pull = { c, t: 0, from: [...swarm, big].map((a) => a.pos.clone()) };
            game.audio.energy('blue');
          },
          cam: move({ pos: [YOU.x, FY + 7.5, YOU.z + 11], look: [YOU.x, FY + 2, YOU.z - 4] }, { pos: [YOU.x - 2, FY + 6, YOU.z + 9], look: [YOU.x, FY + 2.2, YOU.z - 5] }, { fov: 44, fov2: 40 }),
          lines: [{ at: 0.2, who: 'Gojo', color: GOJO, text: 'Cursed Technique Lapse. Blue.' }],
          cards: [{ at: 0.6, dur: 2.4, kind: 'technique', kicker: 'Cursed Technique Lapse', title: 'BLUE', kanji: '蒼', color: '#4a9aff', y: 74 }],
          flash: [{ at: 2.7, color: 0x6aaaff, amount: 0.8, dur: 0.4 }],
          shake: [{ at: 0.6, amount: 0.3 }, { at: 2.7, amount: 0.9 }],
          act: (k, dt, t) => {
            if (!pull) return;
            const grow = Math.min(1, t / 0.6) * (t < 2.6 ? 1 : Math.max(0, 1 - (t - 2.6) * 5));
            blue.scale.setScalar(Math.max(0.01, grow * 1.7 * (1 + Math.sin(t * 30) * 0.05))); blueLight.intensity = grow * 10;
            blue.rotation.y += dt * 4;
            const pk = Math.min(1, Math.max(0, (t - 0.5) / 1.8));
            [...swarm, big].forEach((a, i) => {
              if (!a.visible) return;
              a.hop = null; a.pos.lerpVectors(pull.from[i], pull.c, pk * pk); a.pos.y = pull.from[i].y + (pull.c.y - 1 - pull.from[i].y) * pk;
              a.rig.root.scale.setScalar(a.rig.spec.scale * (a === big ? 1.7 : 1) * Math.max(0.05, 1 - pk * 0.9)); a.rig.root.rotation.z = pk * 3;
              if (pk >= 1) { a.show(false); game.fx.curseDeath(pull.c, 1.2, 0x7a3aa8); }
            });
            if (Math.random() < dt * 40) game.particles.burst(blue.position, { count: 3, color: 0x6aaaff, speed: -4, life: 0.5, size: 0.12, shape: 1 });
            if (t > 2.7 && !pull.boom) { pull.boom = true; game.fx.shockwave(V(pull.c.x, FY, pull.c.z), 0x6aaaff, 9); game.fx.explosion(pull.c, 0x4a8aff, 3); game.audio.impact(2); blue.visible = false; game.fx.screenWave?.(pull.c, 1, 0.5); }
          } },
        // 10 — "I'm the strongest"
        { dur: 4.8,
          enter: () => {
            game.fx.blinkPuff(gojo.pos, 0x6ad8ff); gojo.pos.copy(L.gojoLand); gojo.pose(null); gojo.faceTo(YOU); game.fx.blinkPuff(gojo.pos, 0x6ad8ff); game.audio.whoosh(0.8);
            you.pos.copy(YOU); you.pose(null); you.faceTo(L.gojoLand); aura = 0.12;
            game.audio.setMusic('hub');
          },
          cam: move({ pos: [mid.x + 0.8, FY + 1.9, mid.z - 7.4], look: [mid.x, FY + 1.35, mid.z] }, { pos: [mid.x + 0.5, FY + 1.8, mid.z - 6.4], look: [mid.x, FY + 1.4, mid.z] }, { fov: 36, fov2: 33 }),
          lines: [{ at: 0.5, who: 'Gojo', color: GOJO, text: 'Don\'t worry. I\'m the strongest.' }, ...(isGojo ? [{ at: 2.9, who: 'Gojo', color: GOJO, text: '...Huh. Great hair, by the way.' }] : [])] },
        // 11 — the offer
        { dur: 6.6, dof: 0.25,
          cam: orbit(mid, { r: 5.4, r2: 4.6, y: 2, y2: 1.8, a0: Math.PI + 0.75, a1: Math.PI + 0.2, lookY: 1.55, fov: 34, fov2: 30 }),
          lines: [{ at: 0.3, who: 'Gojo', color: GOJO, text: 'Your cursed technique woke up tonight. That makes you a sorcerer.' }, { at: 3.4, who: 'Gojo', color: GOJO, text: 'Come to Jujutsu High in Tokyo. Class starts tomorrow.' }] },
        // 12 — up into the night: chapter card
        { dur: 5.2, fadeOut: 'black',
          cam: move({ pos: [YOU.x + 0.5, FY + 2.6, YOU.z + 5.5], look: [mid.x, FY + 1.4, mid.z] }, { pos: [40.5, 30, 64], look: [40.5, 12, 16] }, { fov: 36, fov2: 42, ease: 'inOut' }),
          enter: () => { gojo.walk(L.gate, 1.6); you.walk(L.gate.clone().setX(L.gate.x - 1.2), 1.6); },
          cards: [{ at: 0.9, dur: 3.8, kind: 'chapter', kicker: 'Chapter 1', title: 'JUJUTSU HIGH', kanji: '呪術高専', sub: 'Your first year begins' }] },
      ];
      return {
        shots,
        update: (t, dt) => {
          for (const a of actors) if (a.visible) a.update(dt);
          if (aura > 0) {
            you.rig.setGlow?.(col.clone().multiplyScalar(aura * 0.12));
            if (auraLight) auraLight.intensity = aura * 7;
            if (Math.random() < dt * 60 * aura) game.particles.burst(you.pos.clone().setY(you.pos.y + 0.4 + Math.random() * 1.6), { count: 2, color: col, speed: 1.2, up: 3, life: 0.9, size: 0.14, drag: 1.5, shape: Math.random() < 0.5 ? 1 : 0 });
          }
          halo.lookAt(game.rig.camera.position);
        },
        dispose: () => {
          for (const a of actors) a.dispose();
          for (const o of extra) game.scene.remove(o);
          for (const l of lights) game.lights.remove(l);
          hidePlayers(game, true);
        },
      };
    },
  };
}

function arriveHubDef() {
  return {
    id: 'arrive_hub', title: 'Jujutsu High',
    build(game) {
      const L = game.level; if (!L) return { shots: [] };
      const S = L.spots ?? {};
      const spawn = (L.spawn ?? centroid(game)).clone();
      const hall = (S.mainHall ?? S.shrine ?? L.skills ?? L.stage ?? spawn).clone();
      const gate = (S.gate ?? spawn).clone();
      const dir = V(hall.x - gate.x, 0, hall.z - gate.z); if (dir.lengthSq() < 4) dir.set(-0.5, 0, -1); dir.normalize();
      const side = V(dir.z, 0, -dir.x);
      const end = gameplayPose(game);
      const p = (base, along, up, across) => clear(game, base.clone().addScaledVector(dir, along).addScaledVector(side, across).setY(base.y + up));
      return {
        shots: [
          { dur: 4.6, fadeIn: 'black',
            cam: move({ pos: p(gate, -22, 24, -10), look: hall.clone().setY(hall.y + 2) }, { pos: p(gate, -12, 15, -6), look: hall.clone().setY(hall.y + 3) }, { fov: 42, fov2: 38 }),
            cards: [{ at: 0.6, dur: 3.8, kind: 'place', kicker: 'Tokyo Prefectural', title: 'Jujutsu High', kanji: '東京都立呪術高等専門学校', sub: 'Jujutsu Technical College' }],
            lines: [{ at: 0.8, who: 'Gojo', color: GOJO, text: 'Welcome to Tokyo Jujutsu High. One of only two in Japan.' }] },
          { dur: 4,
            cam: move({ pos: p(spawn, -6, 8, 9), look: spawn.clone().addScaledVector(dir, 8).setY(spawn.y + 1) }, { pos: p(spawn, -4, 7, -7), look: spawn.clone().addScaledVector(dir, 7).setY(spawn.y + 1.4) }, { fov: 42 }),
            lines: [{ at: 0.3, who: 'Gojo', color: GOJO, text: 'Missions come from the map table. Gear up, train, then go exorcise.' }] },
          { dur: 2.2,
            cam: move({ pos: p(spawn, -4, 7, -7), look: spawn.clone().addScaledVector(dir, 7).setY(spawn.y + 1.4) }, end, { fov: 40, fov2: 35, ease: 'inOut' }) },
        ],
      };
    },
  };
}

function missionDef(id) {
  const M = MISSIONS.find((m) => m.id === id);
  return {
    id: 'mission_' + id, title: M?.name ?? 'Mission',
    build(game) {
      const L = game.level, mis = game.mission;
      if (!L?.rooms?.length) return { shots: [] };
      const def = mis?.def ?? M ?? {};
      const B = BRIEF[id] ?? { who: 'Ijichi', color: IJICHI, a: def.desc ?? 'Curses reported in the area.', b: OBJ_LINE[def.objective] ?? 'Exorcise them.' };
      const r0 = L.rooms[0], r1 = L.rooms[1] ?? r0, boss = L.bossRoom ?? L.rooms[L.rooms.length - 1];
      const c0 = r0.center.clone(), c1 = r1.center.clone(), cb = boss.center.clone();
      const d = V(c1.x - c0.x, 0, c1.z - c0.z); if (d.lengthSq() < 1) d.set(0, 0, -1); d.normalize();
      const sd = V(d.z, 0, -d.x);
      const end = gameplayPose(game);
      const idx = MISSIONS.findIndex((m) => m.id === id);
      const biome = L.biome ?? {};
      // the curtain (veil): a dark dome that falls over the area
      const R = 46;
      const veil = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: 0x05030a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      veil.material.fog = false; veil.position.copy(c0).setY(c0.y + R * 1.4); veil.renderOrder = 5; game.scene.add(veil);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.25, 6, 96), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0x9a6aff).multiplyScalar(3), transparent: true, opacity: 0.8, depthWrite: false }));
      rim.rotation.x = Math.PI / 2; rim.material.fog = false; veil.add(rim);
      const at = (base, along, up, across) => clear(game, base.clone().addScaledVector(d, along).addScaledVector(sd, across).setY(base.y + up));
      return {
        shots: [
          { dur: 3.4, fadeIn: 'black',
            cam: move({ pos: at(c0, -12, 17, -9), look: c1.clone().setY(c1.y + 1) }, { pos: at(c0, -6, 13, -6), look: c1.clone().setY(c1.y + 1) }, { fov: 42 }),
            cards: [{ at: 0.3, dur: 3, kind: 'mission', kicker: idx >= 0 ? `Mission ${String(idx + 1).padStart(2, '0')}` : 'Mission', title: def.name ?? M?.name ?? 'Mission', sub: `${biome.name ?? ''}${biome.sub ? ' · ' + biome.sub : ''}` }],
            lines: [{ at: 0.4, who: B.who, color: B.color, text: B.a }] },
          { dur: 3.2,
            cam: orbit(cb, { r: 22, r2: 19, y: 18, y2: 15, a0: Math.atan2(-d.x, -d.z) - 0.4, a1: Math.atan2(-d.x, -d.z) + 0.1, lookY: 1, fov: 40 }),
            lines: [{ at: 0.2, who: B.who, color: B.color, text: B.b }] },
          { dur: 3.2,
            cam: move({ pos: at(c0, -9, 9, 4), look: c0.clone().setY(c0.y + 4) }, end, { fov: 44, fov2: 35, ease: 'inOut' }),
            lines: [{ at: 0.15, who: B.who, color: B.color, text: 'Emerge from the darkness, blacker than black. Purify the impure.' }],
            act: (k) => {
              const f = Math.min(1, k * 1.5);
              veil.position.y = c0.y + R * 1.4 * (1 - f) - 2 * f;
              veil.material.opacity = f < 1 ? f * 0.55 : Math.max(0, 0.55 - (k - 0.67) * 2.4);
              rim.material.opacity = 0.8 * (1 - Math.max(0, k - 0.6) * 2.5);
            } },
        ],
        dispose: () => { game.scene.remove(veil); veil.geometry.dispose(); rim.geometry.dispose(); },
      };
    },
  };
}

function bossDef(bossId) {
  const I = BOSS[bossId] ?? { name: bossId.toUpperCase(), kanji: '呪霊', sub: 'Special Grade Cursed Spirit', line: '...', color: '#ff3a5a' };
  return {
    id: 'boss_' + bossId, title: I.name,
    build(game, cs) {
      const boss = cs.opts.boss ?? game.mission?.boss;
      if (!boss) return { shots: [] };
      const pos = boss.pos.clone(), col = new THREE.Color(I.color), scl = boss.rig.root.scale.x / (boss.rig.spec.scale ?? 1);
      const pc = centroid(game);
      const d = V(pc.x - pos.x, 0, pc.z - pos.z); if (d.lengthSq() < 1 || d.length() > 30) d.set(0, 0, 1); d.normalize();
      const sd = V(d.z, 0, -d.x);
      boss.facing = Math.atan2(d.x, d.z); boss.object.rotation.y = boss.facing;
      const H = 3.3 * scl;
      const end = gameplayPose(game);
      let rise = cs.opts.short ? 0 : 1;
      const at = (along, up, across) => clear(game, pos.clone().addScaledVector(d, along).addScaledVector(sd, across).setY(pos.y + up));
      const head = pos.clone().setY(pos.y + H * 0.85);
      const behind = clear(game, pc.clone().addScaledVector(d, 5).addScaledVector(sd, 2).setY(pc.y + 3.2));
      const reveal = { dur: cs.opts.short ? 2.4 : 2.9, dof: 0.4,
        cam: move({ pos: at(8, H * 0.7, 1.8), look: head }, { pos: at(6.2, H * 0.85, 1), look: head.clone().setY(head.y + 0.15) }, { fov: 30, fov2: 24 }),
        cards: [{ at: 0.25, dur: cs.opts.short ? 2.1 : 2.6, kind: 'boss', kicker: I.sub, title: I.name, kanji: I.kanji, color: I.color }],
        lines: cs.opts.short ? [] : [{ at: 0.6, who: I.name, color: I.color, text: I.line }],
        flash: [{ at: 0.05, color: col.getHex(), amount: 0.35, dur: 0.3 }],
        enter: () => { boss.anim = null; game.audio.boss(); } };
      return {
        shots: [
          !cs.opts.short && { dur: 2.8, fadeIn: 'black',
            cam: move({ pos: at(11, 1, 4), look: pos.clone().setY(pos.y + 2) }, { pos: at(9.5, 0.8, 3), look: pos.clone().setY(pos.y + 3) }, { fov: 44, fov2: 38 }),
            shake: [{ at: 0.2, amount: 0.4 }, { at: 1.4, amount: 0.5 }],
            flash: [{ at: 1.9, color: col.getHex(), amount: 0.4, dur: 0.3 }],
            enter: () => { game.audio.charge(2.2, 0.5); },
            act: (k, dt) => {
              rise = 1 - Math.min(1, k / 0.75);
              if (Math.random() < dt * 30) game.particles.burst(pos.clone().add(V((Math.random() - 0.5) * 4, 0.2, (Math.random() - 0.5) * 4)), { count: 3, color: col, speed: 2, up: 4, life: 0.9, size: 0.2 });
              if (k > 0.7 && !boss._csBoom) { boss._csBoom = true; game.fx.shockwave(pos, col.getHex(), 8); game.fx.debris?.(pos, 0x6a5a50, 16); game.audio.impact(1.6); }
            } },
          reveal,
          { dur: 1.9,
            cam: move({ pos: behind, look: pos.clone().setY(pos.y + 2.4) }, end, { fov: 40, fov2: 35, ease: 'inOut' }) },
        ],
        update: (t, dt) => {
          boss.object.position.set(boss.pos.x, boss.pos.y - rise * 5, boss.pos.z);
          boss.rig.animate({ dt, speed: 0, vel: boss.vel, action: { type: 'raise', t: 0 } });
          boss.rig.idle?.(dt, boss);
        },
        dispose: () => { boss.object.position.copy(boss.pos); boss.intro = Math.min(boss.intro ?? 0, 0.8); delete boss._csBoom; },
      };
    },
  };
}

function bossDownDef(bossId) {
  const I = BOSS[bossId] ?? { name: bossId.toUpperCase(), down: '...', color: '#ff3a5a' };
  return {
    id: 'boss_down_' + bossId, title: I.name,
    build(game, cs) {
      const boss = cs.opts.boss ?? game.mission?.boss;
      if (!boss) return { shots: [] };
      const pos = boss.pos.clone(), col = new THREE.Color(I.color);
      const s0 = boss.object.scale.x;
      const end = gameplayPose(game);
      const a0 = Math.atan2(end.pos.x - pos.x, end.pos.z - pos.z);
      return {
        shots: [
          { dur: 3.4, dof: 0.3,
            cam: orbit(pos, { r: 9, r2: 7, y: 2.6, y2: 3.4, a0: a0 - 0.5, a1: a0 + 0.3, lookY: 2.2, fov: 36, fov2: 32 }),
            lines: [{ at: 0.3, who: I.name, color: I.color, text: I.down }],
            cards: [{ at: 1.4, dur: 2.2, kind: 'defeat', kicker: 'Special Grade', title: 'EXORCISED', sub: I.name, color: I.color }],
            flash: [{ at: 0.02, color: 0xffffff, amount: 0.6, dur: 0.3 }],
            act: (k, dt) => {
              boss.object.scale.setScalar(Math.max(0.01, s0 * (1 - k * 0.97)));
              boss.object.rotation.y += dt * (1 + k * 6);
              try { boss.rig.setDissolve?.(k * 0.9); } catch (e) { /* custom material */ }
              if (Math.random() < dt * 8) game.fx.explosion(pos.clone().add(V((Math.random() - 0.5) * 3, Math.random() * 4 * (1 - k), (Math.random() - 0.5) * 3)), col.getHex(), 1.4);
              if (Math.random() < dt * 40) game.particles.burst(pos.clone().setY(pos.y + 1 + Math.random() * 3 * (1 - k)), { count: 2, color: col, speed: 2, up: 5, life: 1, size: 0.16 });
            } },
          { dur: 1.6, cam: move({ pos: clear(game, pos.clone().add(V(Math.sin(a0 + 0.3) * 7, 3.4, Math.cos(a0 + 0.3) * 7))), look: pos.clone().setY(pos.y + 2.2) }, end, { fov: 32, fov2: 35, ease: 'inOut' }),
            enter: () => { game.fx.curseDeath(pos.clone().setY(pos.y + 2), 3, col.getHex()); game.audio.gong(); } },
        ],
        dispose: () => { boss.object.scale.setScalar(0.01); boss.deathT = Math.max(boss.deathT ?? 0, 1.79); },
      };
    },
  };
}

// a cutscene definition by id (the parameterised ones are built on request)
export function getCutscene(id) {
  if (id === 'opening') return openingDef();
  if (id === 'arrive_hub') return arriveHubDef();
  if (id.startsWith('mission_')) return missionDef(id.slice(8));
  if (id.startsWith('boss_down_')) return bossDownDef(id.slice(10));
  if (id.startsWith('boss_')) return bossDef(id.slice(5));
  return null;
}

// ------------------------------------------------------------------ game.cutscenes
export class Cutscenes {
  constructor(game) { this.game = game; this.cur = null; }
  get active() { return this.cur && !this.cur.done ? this.cur : null; }
  has(id) { return !!getCutscene(id); }
  seen(id) {
    const d = this.game.save?.data ?? {};
    return !!(d.seenCutscenes?.[id] || (id === 'opening' && d.openingSeen));
  }
  markSeen(id) {
    const s = this.game.save; if (!s) return;
    (s.data.seenCutscenes ??= {})[id] = true;
    if (id === 'opening') s.data.openingSeen = true;
    s.write();
  }
  // returns false when there is no such cutscene (or it failed to start): the caller carries on without it
  play(id, { onEnd = null, opts = {} } = {}) {
    const def = getCutscene(id); if (!def) return false;
    const g = this.game;
    // a cutscene cut short by another hands its HUD state on, so the HUD always comes back
    if (this.active) { this.active.abort(); this.restore?.(); }
    const hud = g.hud?.root, touch = g.touch?.root;
    const was = { hud: hud && !hud.classList.contains('hidden'), touch: touch && !touch.classList.contains('hidden') };
    const restore = () => {
      if (this.restore === restore) this.restore = null;
      document.body.classList.remove('cs-on');
      const playing = g.state === 'playing' && g.players?.length;
      if (was.hud || playing) g.hud.show(true);
      if ((was.touch || playing) && g.touch) g.touch.show(true);
    };
    this.restore = restore;
    g.hud?.show(false); g.touch?.show?.(false);
    document.body.classList.add('cs-on');
    const cs = new Cutscene(g, def, {
      opts,
      onEnd: (c, skipped) => {
        if (this.cur === cs) this.cur = null;
        restore(); this.markSeen(id);
        g.last = performance.now();
        try { onEnd?.(skipped); } catch (e) { console.error(e); }
      },
    });
    this.cur = cs;
    try { cs.start(); } catch (e) {
      console.error('cutscene failed:', id, e);
      this.cur = null; cs.abort(); restore();
      return false;
    }
    if (!cs.shots.length) { cs.finish(true); return true; }
    return true;
  }
  playOnce(id, o) { return this.seen(id) ? false : this.play(id, o); }
  update(dt) {
    const cs = this.active; if (!cs) return;
    try { cs.update(dt); } catch (e) { console.error('cutscene error:', cs.id, e); cs.finish(true); }
    // the players stand and breathe while the scene plays out
    for (const p of this.game.players) if (p.object.visible && !p.dead) p.rig?.animate?.({ dt, speed: 0, vel: p.vel ?? new THREE.Vector3() });
  }
  applyCamera() {
    const cs = this.active; if (!cs) return;
    cs.applyCamera();
    this.game.rig.focus.copy(cs.cam.look);   // (lights and the sun's shadows follow the shot)
  }
  abort() { this.active?.abort(); this.cur = null; this.restore?.(); document.body.classList.remove('cs-on'); }
}
