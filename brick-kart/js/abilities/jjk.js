// Jujutsu Kaisen abilities (see ../abilities.js for the contract): Hollow Purple,
// Domain Expansion: Infinite Void, Black Flash and Divine Dogs. Heavy shared visuals
// (brick energy shells, starfield, lightning, dog models) live in jjk-fx.js.
import * as THREE from 'three';
import { brickGeometry } from '../lego.js';
import {
  own, disposeOwned, glowSprite, basic, additive, rimMaterial, sphereGeo, lowSphereGeo, discGeo, planeGeo,
  starTex, ringTex, poolTex, once, brickShell, fistModel, dogModel, Bolts, vol, humanNear, shake,
} from './jjk-fx.js';

const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const alive = (o) => o && o.respawn <= 0 && !o.finished;

// =====================================================================================
// 1. HOLLOW PURPLE -- red (Reversal) and blue (Lapse) orbs spiral together in front of
// the kart, merge into a huge brick-shelled purple sphere that tears down the track
// wrecking every kart it passes through, leaving a scorched, sparking trench behind.
// =====================================================================================
const HP = { charge: 0.85, speed: 120, travel: 300, R: 5.2, H: 3.0, tiles: 220, tileLife: 3.1 };
const torusGeo = () => once('torus', () => new THREE.TorusGeometry(1.32, 0.035, 6, 56));
const _c = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _q = new THREE.Vector3(), _w = new THREE.Vector3();
const _m4 = new THREE.Matrix4(), _quat = new THREE.Quaternion(), _sc = new THREE.Vector3(), _col = new THREE.Color();
const HOT = new THREE.Color(0xb436ff), COLD = new THREE.Color(0x4a1880), WHITE = new THREE.Color(0xffffff);

function orb(key, mats, color) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(lowSphereGeo(), basic(0xffffff, { transparent: false })); core.scale.setScalar(0.5);
  const shell = brickShell(key, mats, 56, 0.34);
  const rim = new THREE.Mesh(lowSphereGeo(), rimMaterial(color, 1.8, 1.5)); rim.scale.setScalar(1.2);
  const glow = glowSprite(color, 7, 0.95);
  g.add(core, shell, rim, glow);
  g.userData.shell = shell;
  return g;
}

function hollowPurple(k, ctx) {
  const { scene, fx, track: tr, race, audio } = ctx;
  const root = new THREE.Group();
  scene.add(root);
  const red = orb('red', [[0xc91a09, 0xff2010, 1.6], [0xff7a60, 0xff3a20, 2.4]], 0xff2a20);
  const blue = orb('blue', [[0x0055bf, 0x1a5aff, 1.6], [0x7ab8ff, 0x3a8aff, 2.4]], 0x2a7aff);
  root.add(red, blue);
  // the merged sphere
  const ball = new THREE.Group(); ball.visible = false;
  const core = new THREE.Mesh(sphereGeo(), basic(0xfff0ff, { transparent: false })); core.scale.setScalar(0.62);
  const inner = new THREE.Mesh(sphereGeo(), additive(0x8a2aff, 0.75)); inner.scale.setScalar(0.85);
  const shell = brickShell('purple', [[0x6a1ad0, 0x5a0ad0, 1.2], [0xa040ff, 0x8a2aff, 1.5], [0x3a0870, 0x40009a, 1.1]], 150, 0.2);
  const shell2 = brickShell('purple-out', [[0xc060ff, 0xa040ff, 1.6], [0xff70ff, 0xd040ff, 1.4]], 40, 0.26); shell2.scale.setScalar(1.22);
  const rim = new THREE.Mesh(sphereGeo(), rimMaterial(0xb050ff, 2.0, 1.8)); rim.scale.setScalar(1.3);
  const halo = glowSprite(0x9a3aff, 5.2, 0.9), hot = glowSprite(0xffd8ff, 2.2, 1);
  const bands = [0, 1, 2].map((j) => { const m = new THREE.Mesh(torusGeo(), additive(j === 1 ? 0xff9aff : 0xb050ff, 0.9)); m.rotation.set(j * 1.1, j * 0.7, 0); return m; });
  ball.add(core, inner, shell, shell2, rim, halo, hot, ...bands);
  root.add(ball);
  // scorched trench: brick plates that glow hot purple, cool to charcoal and crumble
  const tileMat = own(new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }));
  const trench = own(new THREE.InstancedMesh(brickGeometry(2, 2, 1, 0.75, true, 8), tileMat, HP.tiles));
  trench.frustumCulled = false; trench.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let n = 0; n < HP.tiles; n++) trench.setColorAt(n, HOT);
  trench.count = 0;
  scene.add(trench);
  const tPos = new Float32Array(HP.tiles * 3), tYaw = new Float32Array(HP.tiles), tAge = new Float32Array(HP.tiles).fill(99);
  let nTiles = 0, tileAcc = 0;

  const st = { t: 0, phase: 'charge', s: 0, lat: 0, dist: 0, flyT: 0, hit: new Set(), debrisT: 0 };
  const pos = new THREE.Vector3();
  const a0 = vol(ctx, k.pos);
  audio.tone(180, 0.95, { type: 'sine', vol: 0.14 * a0, slide: 4.5 });
  audio.tone(240, 0.95, { type: 'triangle', vol: 0.08 * a0, slide: 3.5, at: 0.05 });
  audio.noiseHit(0.9, { vol: 0.18 * a0, freq: 300, sweep: 8, q: 3 });

  function chargeCenter(out) {
    k.forward(_f);
    return out.copy(k.pos).addScaledVector(_f, 5.5).setY(k.pos.y + 3.2);
  }
  function launch() {
    st.phase = 'fly';
    const i = k.loc.i ?? 0, hw = tr.HW[tr.wrap(i)] || 8;
    st.s = i + 5; st.lat = Math.max(-hw * 0.6, Math.min(hw * 0.6, k.loc.lat || 0));
    red.visible = blue.visible = false;
    ball.visible = true;
    const a = vol(ctx, pos);
    audio.noiseHit(1.6, { vol: 0.55 * a, freq: 160, sweep: 4, type: 'lowpass' });
    audio.tone(65, 1.8, { type: 'sawtooth', vol: 0.3 * a, slide: 0.45, filter: 700 });
    audio.tone(1500, 0.9, { type: 'sine', vol: 0.1 * a, slide: 0.25 });
    audio.tone(mtof(50), 1.4, { type: 'square', vol: 0.08 * a, filter: 900, at: 0.04 });
    ctx.ring(pos, 22, 0xb050ff); ctx.ring(pos, 12, 0xffffff);
    for (let j = 0; j < 70; j++) {
      const th = Math.random() * 6.28, ph = Math.acos(rnd()), s = 14 + Math.random() * 16;
      fx.spark(pos.x, pos.y, pos.z, Math.cos(th) * Math.sin(ph) * s, Math.cos(ph) * s, Math.sin(th) * Math.sin(ph) * s, [0xb050ff, 0xffffff, 0xff4040, 0x4080ff][j % 4], 0.5 + Math.random() * 0.3);
    }
    if (k.human || humanNear(ctx, pos, 60)) race.flash(0xb060ff);
    shake(ctx, k, 0.8);
  }
  function addTile(x, y, z, yaw) {
    const n = nTiles % HP.tiles; nTiles++;
    tPos[n * 3] = x; tPos[n * 3 + 1] = y; tPos[n * 3 + 2] = z; tYaw[n] = yaw; tAge[n] = 0;
    trench.count = Math.min(HP.tiles, nTiles);
  }
  function updateTiles(dt) {
    let any = false;
    for (let n = 0; n < trench.count; n++) {
      const age = (tAge[n] += dt);
      const life = HP.tileLife - (n % 5) * 0.12;
      let s = 1;
      if (age > life) s = Math.max(0, 1 - (age - life) / 0.7);
      if (s > 0) any = true;
      const heat = Math.max(0, 1 - age / (life * 0.8));
      _col.copy(COLD).lerp(HOT, heat * heat);
      if (age < 0.12) _col.lerp(WHITE, 1 - age / 0.12);
      trench.setColorAt(n, _col);
      _quat.setFromAxisAngle(_q.set(0, 1, 0), tYaw[n]);
      _m4.compose(_w.set(tPos[n * 3], tPos[n * 3 + 1] - (1 - s) * 0.3, tPos[n * 3 + 2]), _quat, _sc.set(s, s * (0.6 + heat * 0.6), s));
      trench.setMatrixAt(n, _m4);
      // sparks keep crackling out of the hot trench
      if (heat > 0.25 && Math.random() < 0.05) fx.spark(tPos[n * 3] + rnd(0.6), tPos[n * 3 + 1] + 0.3, tPos[n * 3 + 2] + rnd(0.6), rnd(1.5), 4 + Math.random() * 5, rnd(1.5), Math.random() < 0.3 ? 0xffffff : 0xb050ff, 0.5, 6);
    }
    trench.instanceMatrix.needsUpdate = true;
    if (trench.instanceColor) trench.instanceColor.needsUpdate = true;
    return any;
  }

  ctx.spawn({
    update(dt) {
      st.t += dt;
      if (st.phase === 'charge') {
        // the two orbs spiral in front of the kart and pull energy in
        chargeCenter(pos);
        const f = Math.min(1, st.t / HP.charge), r = 4.6 * Math.pow(1 - f, 1.3) + 0.2, a = f * Math.PI * 2.2;
        k.forward(_f); _r.set(_f.z, 0, -_f.x);
        red.position.copy(pos).addScaledVector(_r, Math.cos(a) * r).add(_q.set(0, Math.sin(a) * r * 0.6, 0));
        blue.position.copy(pos).addScaledVector(_r, -Math.cos(a) * r).add(_q.set(0, -Math.sin(a) * r * 0.6, 0));
        const s = 1.0 + f * 0.7;
        red.scale.setScalar(s); blue.scale.setScalar(s);
        red.userData.shell.rotation.y += dt * 6; blue.userData.shell.rotation.y -= dt * 6;
        for (let j = 0; j < 5; j++) {
          // energy pulled in from all around
          const th = Math.random() * 6.28, ph = Math.acos(rnd()), d = 7 + Math.random() * 3;
          _w.set(Math.cos(th) * Math.sin(ph), Math.cos(ph), Math.sin(th) * Math.sin(ph));
          fx.spark(pos.x + _w.x * d, pos.y + _w.y * d, pos.z + _w.z * d, -_w.x * d * 2.6 + k.speed * _f.x, -_w.y * d * 2.6, -_w.z * d * 2.6 + k.speed * _f.z, j % 2 ? 0xff3a2a : 0x3a7aff, 0.35);
        }
        if (st.t >= HP.charge) launch();
        return true;
      }
      if (st.phase === 'fly') {
        st.flyT += dt;
        const step = HP.speed * dt;
        st.s += step; st.dist += step;
        st.lat *= Math.exp(-dt * 1.2);
        const i0 = Math.floor(st.s), fr = st.s - i0;
        tr.at(i0, st.lat, HP.H, _c); tr.at(i0 + 1, st.lat, HP.H, _w);
        const prevX = pos.x, prevZ = pos.z;
        pos.lerpVectors(_c, _w, fr);
        // grow out of the merge, then hold a wobbling, churning size
        const g = st.flyT < 0.22 ? 1.1 + (HP.R - 1.1) * ease(st.flyT / 0.22) * 1.08 : HP.R * (1 + Math.sin(st.t * 30) * 0.03);
        ball.position.copy(pos); ball.scale.setScalar(g);
        shell.rotation.x += dt * 5; shell.rotation.y += dt * 3; shell2.rotation.y -= dt * 7; shell2.rotation.z += dt * 4;
        bands.forEach((b, j) => { b.rotation.x += dt * (4 + j * 2); b.rotation.y += dt * (3 - j * 2.5); });
        hot.material.opacity = 0.8 + Math.random() * 0.2;
        const dirX = pos.x - prevX, dirZ = pos.z - prevZ, dl = Math.hypot(dirX, dirZ) || 1;
        // tear through the road: sparks, flung bricks, and the trench
        const gy = pos.y - HP.H;
        for (let j = 0; j < 9; j++) {
          const sd = Math.random() < 0.5 ? -1 : 1, lat = (0.5 + Math.random()) * g * 0.7;
          fx.spark(pos.x + (dirZ / dl) * sd * lat, gy + 0.3, pos.z - (dirX / dl) * sd * lat, (dirZ / dl) * sd * 9 + rnd(3), 6 + Math.random() * 12, -(dirX / dl) * sd * 9 + rnd(3), [0xb050ff, 0xffffff, 0xe0a0ff][j % 3], 0.5 + Math.random() * 0.4, 18);
        }
        for (let j = 0; j < 4; j++) {
          const th = Math.random() * 6.28, ph = Math.acos(rnd());
          _w.set(Math.cos(th) * Math.sin(ph), Math.cos(ph), Math.sin(th) * Math.sin(ph)).multiplyScalar(g * 1.05);
          fx.spark(pos.x + _w.x, pos.y + _w.y, pos.z + _w.z, _w.x * 2, _w.y * 2, _w.z * 2, j % 2 ? 0xd8a0ff : 0x8a2aff, 0.25);
        }
        st.debrisT -= dt;
        if (st.debrisT <= 0) {
          st.debrisT = 0.045;
          const sd = Math.random() < 0.5 ? -1 : 1;
          fx.debrisOne(_w.set(pos.x + (dirZ / dl) * sd * 3, gy + 0.4, pos.z - (dirX / dl) * sd * 3), [0x6b6e70, 0x3a3a44, 0x8a2ae0, 0x1b1b22][Math.floor(Math.random() * 4)], new THREE.Vector3((dirZ / dl) * sd * (6 + Math.random() * 8), 9 + Math.random() * 10, -(dirX / dl) * sd * (6 + Math.random() * 8)), 1.2);
        }
        tileAcc += step;
        while (tileAcc > 2.3) {
          tileAcc -= 2.3;
          const ii = Math.round(st.s), yaw = tr.yawAt(ii);
          for (const sd of [-1, 1]) {
            const l = st.lat + sd * (0.4 + Math.random() * HP.R * 0.55);
            tr.at(ii, l, 0.03, _c);
            addTile(_c.x, _c.y, _c.z, yaw + rnd(0.35));
          }
          if (Math.random() < 0.6) { tr.at(ii, st.lat + rnd(0.6), 0.05, _c); addTile(_c.x, _c.y, _c.z, yaw + rnd(0.8)); }
        }
        // wreck everything in the way; erase stray traps
        const hr = g + 1.6;
        for (const o of race.karts) {
          if (o === k || st.hit.has(o) || o.respawn > 0) continue;
          if (o.pos.distanceToSquared(_c.copy(pos).setY(pos.y - 1.6)) < hr * hr) {
            st.hit.add(o);
            if (ctx.hit(o, 'wreck', k, 'hollowpurple')) { fx.pop(o.pos, 0xc070ff); fx.pop(o.pos, 0xffffff); }
          }
        }
        const items = race.items;
        if (items?.traps) for (let n = items.traps.length - 1; n >= 0; n--) {
          const t = items.traps[n];
          if (t.pos.distanceToSquared(pos) < (g + 2) ** 2) { fx.pop(t.pos, 0xb050ff); items.removeTrap(t); }
        }
        if (Math.random() < dt * 5) audio.noiseHit(0.3, { vol: 0.2 * vol(ctx, pos), freq: 120, type: 'lowpass' });
        if (st.dist >= HP.travel || st.flyT > 3.2) {
          st.phase = 'fade'; st.fadeT = 0;
          ctx.ring(pos, 18, 0xb050ff);
          audio.noiseHit(0.8, { vol: 0.35 * vol(ctx, pos), freq: 400, sweep: 0.2, q: 2 });
          for (let j = 0; j < 40; j++) fx.spark(pos.x, pos.y, pos.z, rnd(16), rnd(16), rnd(16), j % 2 ? 0xb050ff : 0xffffff, 0.5);
        }
        updateTiles(dt);
        return true;
      }
      if (st.phase === 'fade') {
        // the sphere implodes into a point
        st.fadeT += dt;
        const f = Math.min(1, st.fadeT / 0.3);
        ball.scale.setScalar(HP.R * (1 + f * 0.25) * (1 - f * f));
        halo.material.opacity = 0.9 * (1 - f);
        if (f >= 1) { ball.visible = false; st.phase = 'trench'; }
      }
      return updateTiles(dt) || st.phase === 'fade';
    },
    dispose() { disposeOwned(root); disposeOwned(trench); },
    // no deflect(): Hollow Purple can't be pushed or cut
    // CPUs try to dodge the sphere itself (the cooling trench is harmless)
    danger(p, r) { return st.phase === 'fly' && p.distanceToSquared(pos) < (HP.R + r) ** 2; },
  });
}

// =====================================================================================
// 2. DOMAIN EXPANSION: INFINITE VOID -- a starfield dome bursts out around the user with
// the glowing "eye" ring above; every rival inside is flooded with information and
// frozen in place, while the user drives on out of the domain.
// =====================================================================================
const IV = { R: 35, grow: 0.38, hold: 1.85, fade: 0.5, freezeFor: 1.5, catchUntil: 1.25 };
function infiniteVoid(k, ctx) {
  const { scene, fx, race, audio } = ctx;
  const c = k.pos.clone();
  const root = new THREE.Group(); root.position.copy(c); scene.add(root);
  const skyMat = basic(0xffffff, { map: starTex(), side: THREE.DoubleSide, opacity: 0 });
  const sky = new THREE.Mesh(sphereGeo(), skyMat);
  const rimM = rimMaterial(0x6ad0ff, 3.2, 1.6);
  const rim = new THREE.Mesh(sphereGeo(), rimM);
  const eyeMat = basic(0xffffff, { map: ringTex(), blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 });
  const eye = new THREE.Mesh(planeGeo(), eyeMat); eye.position.y = 13;
  const eyeGlow = glowSprite(0xbff4ff, 9, 0); eyeGlow.position.y = 13;
  const burst = glowSprite(0xffffff, 1, 1); burst.position.y = 2;
  const floorMat = basic(0x05051a, { opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 });
  const floor = new THREE.Mesh(discGeo(), floorMat); floor.position.y = 0.12;
  const dome = new THREE.Group(); dome.add(sky, rim, floor); dome.scale.setScalar(0.01);
  root.add(dome, eye, eyeGlow, burst);
  const hitSet = new Set(), victims = [];
  let t = 0;
  // sound: a deep drop, a rushing wind and a cold shimmering chord
  const a = vol(ctx, c);
  audio.tone(55, 2.4, { type: 'sine', vol: 0.4 * a });
  audio.tone(110, 2.0, { type: 'triangle', vol: 0.12 * a, slide: 0.5 });
  audio.noiseHit(1.8, { vol: 0.45 * a, freq: 140, sweep: 7, type: 'lowpass' });
  [0, 7, 12, 19, 24, 31].forEach((n, j) => audio.tone(mtof(72 + n), 1.4, { type: 'sine', vol: 0.06 * a, at: 0.15 + j * 0.07 }));
  if (k.human || humanNear(ctx, c, IV.R + 5)) race.flash(0x0a0a40);
  ctx.ring(c, IV.R * 0.5, 0x6ad0ff);
  for (let j = 0; j < 80; j++) {
    const th = Math.random() * 6.28;
    fx.spark(c.x, c.y + 1.5, c.z, Math.cos(th) * 40, Math.random() * 6, Math.sin(th) * 40, j % 3 ? 0xbff4ff : 0xffffff, 0.8);
  }

  ctx.spawn({
    update(dt) {
      t += dt;
      const end = IV.grow + IV.hold;
      let R = IV.R * ease(t / IV.grow), op = 0.9;
      if (t > end) { const f = (t - end) / IV.fade; R = IV.R * (1 + f * 0.08); op = 0.9 * (1 - f); }
      dome.scale.setScalar(Math.max(0.01, R));
      eye.scale.setScalar(Math.max(0.01, R * 0.8));
      skyMat.opacity = Math.min(op, 0.9 * Math.min(1, t / 0.12));
      rimM.uniforms.opacity.value = 1.6 * (op / 0.9);
      eyeMat.opacity = op;
      eye.rotation.y += dt * 0.6;
      eyeGlow.material.opacity = 0.9 * op / 0.9 * (0.8 + Math.sin(t * 9) * 0.2);
      floorMat.opacity = 0.72 * op / 0.9;
      burst.scale.setScalar(2 + t * 60);
      burst.material.opacity = Math.max(0, 1 - t * 2.5);
      // information streams racing through the void
      if (R > 3 && op > 0.2) for (let j = 0; j < 10; j++) {
        const th = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * R * 0.85, y = Math.random() * R * 0.55;
        const vth = Math.random() * 6.28, sp = 20 + Math.random() * 30;
        fx.spark(c.x + Math.cos(th) * rr, c.y + y, c.z + Math.sin(th) * rr, Math.cos(vth) * sp, rnd(8), Math.sin(vth) * sp, [0xffffff, 0xbff4ff, 0x9a8aff][j % 3], 0.3);
      }
      // catch every rival inside the domain
      if (t < IV.catchUntil) for (const o of race.karts) {
        if (o === k || hitSet.has(o) || o.respawn > 0 || o.finished) continue;
        const dx = o.pos.x - c.x, dz = o.pos.z - c.z, dy = o.pos.y - c.y;
        if (dx * dx + dz * dz < R * R && Math.abs(dy) < R * 0.7) {
          hitSet.add(o);
          if (ctx.hit(o, 'freeze', k, 'infinitevoid')) {
            o.frozenTime = IV.freezeFor;
            victims.push(o);
            for (let j = 0; j < 24; j++) fx.spark(o.pos.x + rnd(1), o.pos.y + 2, o.pos.z + rnd(1), rnd(3), 14 + Math.random() * 16, rnd(3), j % 2 ? 0xffffff : 0xbff4ff, 0.6);
            if (o.human) race.flash(0x101050);
          }
        }
      }
      // overloaded victims: a halo of data swirling around their heads
      for (const o of victims) {
        if (o.frozenTime <= 0 || o.respawn > 0) continue;
        for (let j = 0; j < 3; j++) {
          const an = t * 9 + j * 2.094;
          fx.spark(o.pos.x + Math.cos(an) * 1.7, o.pos.y + 3 + Math.sin(t * 5 + j) * 0.3, o.pos.z + Math.sin(an) * 1.7, -Math.sin(an) * 4, 1.5, Math.cos(an) * 4, j ? 0xbff4ff : 0xffffff, 0.28);
        }
      }
      return t < end + IV.fade;
    },
    dispose() { disposeOwned(root); },
  });
}

// =====================================================================================
// 3. BLACK FLASH -- a brick fist wreathed in black-and-red lightning hovers by the kart
// for a few seconds; the next rival you bump (or get right next to) takes a Black Flash:
// a distorted black shockwave that wrecks them and launches you forward.
// =====================================================================================
const BF = { life: 4.2, reach: 4.3, lungeR: 12, fist: 2.3 };
// the charged fist: black brick fist in a red rim aura and glow, with crawling lightning
function makeChargedFist() {
  const holder = new THREE.Group(); holder.position.set(-2.5, 2.7, 0.6);
  const fist = fistModel(); fist.scale.setScalar(BF.fist);
  const glow = glowSprite(0xff1a0a, 7.5, 0.9);
  const aura = new THREE.Mesh(lowSphereGeo(), rimMaterial(0xff2010, 1.6, 1.8)); aura.scale.set(1.5, 1.4, 1.8); aura.position.y = -0.4;
  const bolts = new Bolts(5, 5, { glow: 0xff1a0a, glowScale: 2.6 });
  holder.add(glow, aura, fist, bolts.group);
  return { holder, fist, glow, aura, bolts };
}
function blackFlashBurst(ctx, p, by) {
  const { scene, fx, race, audio } = ctx;
  const root = new THREE.Group(); root.position.copy(p); scene.add(root);
  const darkMat = basic(0x000000, { opacity: 0.92 });
  const dark = new THREE.Mesh(sphereGeo(), darkMat);
  const rimM = rimMaterial(0xff1a0a, 1.5, 2.2);
  const rim = new THREE.Mesh(sphereGeo(), rimM);
  const red = glowSprite(0xff2010, 9, 0.55);
  const bolts = new Bolts(12, 6, { glow: 0xff1a0a, glowOpacity: 0.75, glowScale: 2.2 });
  dark.renderOrder = 4;
  root.add(red, dark, rim, bolts.group);
  const dirs = [];
  for (let j = 0; j < 12; j++) { const th = j / 12 * 6.28 + rnd(0.2), el = rnd(0.7); dirs.push(new THREE.Vector3(Math.cos(th) * Math.cos(el), Math.sin(el) + 0.15, Math.sin(th) * Math.cos(el))); }
  // crack, boom and a ringing echo
  const a = vol(ctx, p);
  audio.noiseHit(0.09, { vol: 0.6 * a, freq: 4200, q: 0.7, type: 'highpass' });
  audio.tone(48, 0.7, { type: 'square', vol: 0.4 * a, slide: 0.5, filter: 500 });
  audio.noiseHit(0.7, { vol: 0.45 * a, freq: 260, type: 'lowpass' });
  audio.tone(2600, 0.25, { type: 'sawtooth', vol: 0.1 * a, slide: 0.15 });
  audio.tone(mtof(45), 1.1, { type: 'sawtooth', vol: 0.12 * a, filter: 600, at: 0.08 });
  for (let j = 0; j < 70; j++) {
    const th = Math.random() * 6.28, ph = Math.acos(rnd()), s = 10 + Math.random() * 22;
    fx.spark(p.x, p.y, p.z, Math.cos(th) * Math.sin(ph) * s, Math.abs(Math.cos(ph)) * s, Math.sin(th) * Math.sin(ph) * s, j % 3 ? 0xff2010 : 0xffffff, 0.45 + Math.random() * 0.3, 12);
  }
  for (let j = 0; j < 22; j++) fx.puff(p.x + rnd(1), p.y + rnd(1), p.z + rnd(1), rnd(9), rnd(6) + 2, rnd(9), 0x050505, 1.0);
  ctx.ring(p.clone().setY(p.y - 1.2), 14, 0xff1a0a);
  if (by.human || humanNear(ctx, p, 25)) race.flash(0x200000);
  shake(ctx, by, 1.0);
  let t = 0, zap = 0;
  ctx.spawn({
    update(dt) {
      t += dt;
      const f = Math.min(1, t / 0.22);
      dark.scale.setScalar(0.5 + ease(f) * 3.2);
      rim.scale.setScalar(0.6 + ease(f) * 3.8);
      const fade = Math.max(0, 1 - Math.max(0, t - 0.18) / 0.4);
      darkMat.opacity = 0.92 * fade; rimM.uniforms.opacity.value = 2.2 * fade;
      red.material.opacity = 0.55 * fade; red.scale.setScalar(9 + t * 14);
      zap -= dt;
      if (zap <= 0) {
        zap = 0.04;
        const L = 3 + ease(t / 0.3) * 8;
        for (let j = 0; j < 12; j++) { const d = dirs[j], l = L * (0.6 + Math.random() * 0.5); bolts.set(j, 0, 0, 0, d.x * l, d.y * l, d.z * l, 0.9, 0.22); }
        bolts.show(12);
      }
      bolts.glowMat.opacity = 0.75 * fade;
      bolts.group.visible = fade > 0.02;
      return t < 0.62;
    },
    dispose() { disposeOwned(root); },
  });
}

function blackFlash(k, ctx) {
  const { fx, race, audio } = ctx;
  k._jjkBlackFlash?.end();               // a fresh charge replaces an old one
  k.boost(0.55);
  const { holder, fist, glow, aura, bolts } = makeChargedFist();
  k.model.root.add(holder);
  const st = { t: 0, zap: 0, done: false, lunged: false, aim: null };
  const wp = new THREE.Vector3();
  const a = vol(ctx, k.pos);
  audio.tone(90, 0.5, { type: 'sawtooth', vol: 0.18 * a, slide: 2.5, filter: 1200 });
  audio.noiseHit(0.35, { vol: 0.25 * a, freq: 3000, q: 2, sweep: 0.5 });
  function end() {
    if (st.done) return;
    st.done = true;
    if (k.onBump === strike) k.onBump = null;
    if (st.aim && k.aimAt === st.aim) k.aimAt = null;
    st.aim = null;
    if (k._jjkBlackFlash === api) k._jjkBlackFlash = null;
  }
  function strike(o) {
    if (st.done || !alive(o) || o === k) return;
    if (!ctx.hit(o, 'wreck', k, 'blackflash')) return;      // shields/invulnerability: keep the charge
    holder.getWorldPosition(wp);
    const p = wp.lerp(o.pos, 0.6).setY(Math.max(k.pos.y, o.pos.y) + 1.6);
    blackFlashBurst(ctx, p.clone(), k);
    k.boost(1.2);
    k.emote('throwF', 'cheer');
    end();
  }
  const api = { end };
  k._jjkBlackFlash = api;
  k.onBump = strike;
  ctx.spawn({
    update(dt) {
      if (st.done) return false;
      st.t += dt;
      if (st.t > BF.life || k.respawn > 0 || k.finished) { end(); return false; }
      // fist pulses, lightning re-strikes every few frames
      const pulse = 1 + Math.sin(st.t * 22) * 0.07;
      fist.scale.setScalar(BF.fist * pulse);
      fist.rotation.z = Math.sin(st.t * 13) * 0.08;
      glow.material.opacity = 0.6 + Math.random() * 0.4;
      glow.scale.setScalar(7.5 * (0.9 + Math.random() * 0.2));
      aura.rotation.y += dt * 3;
      aura.material.uniforms.opacity.value = 1.6 + Math.sin(st.t * 30) * 0.5;
      st.zap -= dt;
      if (st.zap <= 0) {
        st.zap = 0.05;
        for (let j = 0; j < 5; j++) {
          const th = Math.random() * 6.28, el = rnd(1.1), l = 1.8 + Math.random() * 2.2;
          bolts.set(j, rnd(0.3), rnd(0.3), 0.3, Math.cos(th) * Math.cos(el) * l, Math.sin(el) * l, Math.sin(th) * Math.cos(el) * l + 0.3, 0.45, 0.1);
        }
        bolts.show(st.t > BF.life - 0.8 && Math.random() < 0.5 ? 2 : 5);   // sputters before it fades
      }
      holder.getWorldPosition(wp);
      if (Math.random() < 0.7) fx.spark(wp.x + rnd(0.6), wp.y + rnd(0.6), wp.z + rnd(0.6), rnd(4), rnd(4) + 1, rnd(4), Math.random() < 0.8 ? 0xff2010 : 0xffffff, 0.25);
      if (Math.random() < 0.35) fx.puff(wp.x + rnd(0.5), wp.y, wp.z + rnd(0.5), rnd(1), 1.5, rnd(1), 0x0a0a0a, 0.5);
      // a rival right next to you counts as a hit; one just ahead pulls you into a lunge
      k.forward(_f);
      let best = null, bestD = 45 * 45;
      for (const o of race.karts) {
        if (o === k || !alive(o)) continue;
        const dx = o.pos.x - k.pos.x, dz = o.pos.z - k.pos.z, d2 = dx * dx + dz * dz;
        if (d2 < bestD && (dx * _f.x + dz * _f.z) > 0) { best = o; bestD = d2; }
        const reach = BF.reach * Math.max(1, k.megaScale || 1);
        if (d2 < reach * reach && Math.abs(o.pos.y - k.pos.y) < 3) { strike(o); if (st.done) return false; continue; }
        if (!st.lunged && d2 < BF.lungeR * BF.lungeR && (dx * _f.x + dz * _f.z) > Math.sqrt(d2) * 0.93 && !k.stunned) {
          st.lunged = true; k.boost(0.45);
          audio.tone(140, 0.25, { type: 'sawtooth', vol: 0.12 * vol(ctx, k.pos), slide: 2.2, filter: 1400 });
        }
      }
      // CPU drivers steer at the nearest rival ahead while the fist is charged
      if (best !== st.aim && (!k.aimAt || k.aimAt === st.aim)) { k.aimAt = best; st.aim = best; }   // never steal another ability's aim
      return true;
    },
    dispose() { end(); disposeOwned(holder); },
  });
}

// =====================================================================================
// 4. DIVINE DOGS -- Ten Shadows: a pool of shadow opens under the kart and the white and
// black dogs leap out, race along the track to the two karts just ahead and bite them.
// =====================================================================================
const DD = { emerge: 0.38, maxRun: 9, bite: 0.45, home: 30 };
function divineDogs(k, ctx) {
  const { scene, fx, track: tr, race, audio } = ctx;
  let targets = ctx.ahead(k, 2).filter(alive);
  if (targets.length < 2) targets = targets.concat(ctx.behind(k, 3).filter(alive)).slice(0, 2);
  const root = new THREE.Group(); scene.add(root);
  // the shadow pool stays where it was cast
  const poolMat = basic(0xffffff, { map: poolTex(), opacity: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const pool = new THREE.Mesh(discGeo(), poolMat);
  pool.position.copy(k.pos).setY(k.pos.y + 0.1); pool.scale.setScalar(0.1);
  root.add(pool);
  k.forward(_f); _r.set(_f.z, 0, -_f.x);
  const dogs = [true, false].map((white, j) => {
    const mesh = dogModel(white);
    const aura = new THREE.Mesh(lowSphereGeo(), rimMaterial(white ? 0xb8a0ff : 0x9a3aff, 3.5, white ? 0.8 : 1.4));
    aura.scale.set(1.1, 1.5, 2.4); aura.position.set(0, 1.6, 0.2);
    const eyes = glowSprite(0xffd040, 1.6, 0.7); eyes.position.set(0, 2.25, 2.0);
    mesh.add(aura, eyes);
    const holder = new THREE.Group(); holder.add(mesh); root.add(holder);
    const sd = j ? 1 : -1;
    const pos = k.pos.clone().addScaledVector(_r, sd * 1.4).addScaledVector(_f, 0.5);
    holder.position.copy(pos);
    return { holder, mesh, pos, yaw: k.yaw, si: k.loc.i ?? 0, loc: {}, target: targets[j] || targets[0] || null, phase: 'emerge', t: 0, sd, y0: k.pos.y, speed: Math.max(30, k.speed) };
  });
  const a = vol(ctx, k.pos);
  audio.noiseHit(0.5, { vol: 0.3 * a, freq: 500, sweep: 0.3, q: 1 });
  audio.tone(420, 0.45, { type: 'sawtooth', vol: 0.08 * a, slide: 1.7, filter: 1600, at: 0.1 });
  audio.tone(560, 0.55, { type: 'sawtooth', vol: 0.07 * a, slide: 1.6, filter: 1600, at: 0.18 });
  for (let j = 0; j < 30; j++) fx.puff(k.pos.x + rnd(2), k.pos.y + 0.3, k.pos.z + rnd(2), rnd(4), 3 + Math.random() * 5, rnd(4), j % 2 ? 0x12081e : 0x2a1048, 0.9);

  let t = 0;
  function vanish(d) {
    d.phase = 'gone'; d.holder.visible = false;
    for (let j = 0; j < 16; j++) fx.puff(d.pos.x + rnd(1), d.pos.y + 1 + rnd(1), d.pos.z + rnd(1), rnd(3), 2 + Math.random() * 3, rnd(3), j % 2 ? 0x12081e : 0x3a1a60, 0.8);
  }
  function updateDog(d, dt) {
    d.t += dt;
    const tg = d.target && alive(d.target) ? d.target : null;
    if (d.phase === 'emerge') {
      // leap up out of the pool
      const f = Math.min(1, d.t / DD.emerge);
      d.pos.x += Math.sin(d.yaw) * d.speed * dt; d.pos.z += Math.cos(d.yaw) * d.speed * dt;
      tr.locate(d.pos.x, d.pos.y, d.pos.z, d.si, d.loc); d.si = d.loc.i;
      const gy = d.loc.y ?? d.y0;
      d.pos.y = gy - 3 * (1 - f) + Math.sin(f * Math.PI) * 3;
      d.holder.position.copy(d.pos);
      d.holder.rotation.set(-0.6 * (1 - f * 2), d.yaw, 0);
      if (f >= 1) { d.phase = 'run'; d.t = 0; }
      return;
    }
    if (d.phase === 'run') {
      if (d.t > DD.maxRun || (d.target && !tg)) { vanish(d); return; }
      const want = Math.min(115, Math.max(78, (tg ? tg.speed : 40) + 38));
      d.speed += (want - d.speed) * Math.min(1, dt * 3);
      let aim;
      if (tg && tg.pos.distanceToSquared(d.pos) < DD.home * DD.home) aim = Math.atan2(tg.pos.x - d.pos.x, tg.pos.z - d.pos.z);
      else {
        const lat = tg ? Math.max(-5, Math.min(5, tg.loc.lat || 0)) : d.sd * 2;
        tr.at(d.si + 12, lat, 0, _c);
        aim = Math.atan2(_c.x - d.pos.x, _c.z - d.pos.z);
        if (!tg && d.t > 3) { vanish(d); return; }
      }
      let da = aim - d.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
      d.yaw += Math.max(-9 * dt, Math.min(9 * dt, da));
      d.pos.x += Math.sin(d.yaw) * d.speed * dt; d.pos.z += Math.cos(d.yaw) * d.speed * dt;
      tr.locate(d.pos.x, d.pos.y, d.pos.z, d.si, d.loc); d.si = d.loc.i;
      const gy = Number.isFinite(d.loc.y) ? d.loc.y : d.pos.y;
      const gallop = Math.abs(Math.sin(d.t * 11 + d.sd));
      d.pos.y = gy + gallop * 0.9;
      d.holder.position.copy(d.pos);
      d.holder.rotation.set(Math.cos(d.t * 11 + d.sd) * 0.18, d.yaw, 0);
      // shadow trail
      fx.puff(d.pos.x + rnd(0.5), d.pos.y + 0.8, d.pos.z + rnd(0.5), rnd(1), 1 + Math.random(), rnd(1), d.sd > 0 ? 0x12081e : 0x2a1048, 0.55);
      if (Math.random() < 0.4) fx.spark(d.pos.x + rnd(0.6), d.pos.y + 1.4, d.pos.z + rnd(0.6), 0, 2, 0, 0x9a3aff, 0.4);
      if (tg && tg.pos.distanceToSquared(d.pos) < (2.6 * (tg.megaScale || 1)) ** 2) {
        // bite!
        const ok = ctx.hit(tg, 'spin', k, 'divinedogs');
        d.phase = 'bite'; d.t = 0;
        for (let j = 0; j < 14; j++) fx.spark(tg.pos.x + rnd(0.6), tg.pos.y + 1.5, tg.pos.z + rnd(0.6), rnd(8), 4 + Math.random() * 8, rnd(8), j % 2 ? 0xffffff : 0xb050ff, 0.4);
        const av = vol(ctx, tg.pos);
        audio.noiseHit(0.12, { vol: 0.4 * av, freq: 1400, q: 1.5 });
        audio.tone(220, 0.14, { type: 'square', vol: 0.12 * av, slide: 0.5, filter: 1200 });
        if (ok) audio.tone(700, 0.35, { type: 'sawtooth', vol: 0.06 * av, slide: 1.5, filter: 1600, at: 0.05 });
      }
      return;
    }
    if (d.phase === 'bite') {
      // cling on for a moment, then sink back into the shadows
      const f = Math.min(1, d.t / DD.bite);
      if (d.target) d.pos.copy(d.target.pos).add(_w.set(Math.sin(d.yaw) * -1.2, 1.4 + Math.sin(f * Math.PI) * 1.2, Math.cos(d.yaw) * -1.2));
      d.holder.position.copy(d.pos);
      d.holder.rotation.set(-0.5, d.yaw, Math.sin(d.t * 30) * 0.25);
      d.mesh.scale.setScalar(1 - f * f * 0.9);
      if (f >= 1) vanish(d);
    }
  }

  ctx.spawn({
    update(dt) {
      t += dt;
      // pool opens fast, lingers, then closes
      const ps = t < 0.25 ? ease(t / 0.25) : t > 1.3 ? Math.max(0, 1 - (t - 1.3) / 0.4) : 1;
      pool.scale.setScalar(Math.max(0.01, 4.2 * ps));
      pool.rotation.y += dt;
      poolMat.opacity = ps;
      for (const d of dogs) if (d.phase !== 'gone') updateDog(d, dt);
      return t < 1.7 || dogs.some((d) => d.phase !== 'gone');
    },
    dispose() { disposeOwned(root); },
    // Force Push / Lightsaber Spin: a running shikigami is dispelled back into the shadows
    deflect(p, r, by) {
      if (by === k) return;
      for (const d of dogs) if ((d.phase === 'run' || d.phase === 'emerge') && d.pos.distanceToSquared(p) < (r + 1.5) ** 2) vanish(d);
    },
  });
}

// =====================================================================================
// prewarm samples: one of each special material so the race compiles the shaders at load
// (shared caches are reused by later uses; the samples' own materials are tiny)
// =====================================================================================
function prewarmHP() {
  const g = new THREE.Group();
  g.add(orb('red', [[0xc91a09, 0xff2010, 1.6], [0xff7a60, 0xff3a20, 2.4]], 0xff2a20));
  g.add(brickShell('purple', [[0x6a1ad0, 0x5a0ad0, 1.2], [0xa040ff, 0x8a2aff, 1.5], [0x3a0870, 0x40009a, 1.1]], 150, 0.2));
  g.add(new THREE.Mesh(torusGeo(), additive(0xb050ff, 0.9)), new THREE.Mesh(sphereGeo(), additive(0x8a2aff, 0.75)));
  const tr = new THREE.InstancedMesh(brickGeometry(2, 2, 1, 0.75, true, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), 1);
  tr.setColorAt(0, HOT); tr.frustumCulled = false;
  g.add(tr);
  return g;
}
function prewarmIV() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(sphereGeo(), basic(0xffffff, { map: starTex(), side: THREE.DoubleSide, opacity: 0.9 })));
  g.add(new THREE.Mesh(sphereGeo(), rimMaterial(0x6ad0ff, 3.2, 1.6)));
  g.add(new THREE.Mesh(planeGeo(), basic(0xffffff, { map: ringTex(), blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.9 })));
  g.add(new THREE.Mesh(discGeo(), basic(0x05051a, { opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -2 })), glowSprite(0xbff4ff, 9, 0.9));
  return g;
}
function prewarmBF() {
  const f = makeChargedFist();
  f.bolts.set(0, 0, 0, 0, 1, 1, 1, 0.3, 0.1); f.bolts.show(1);
  f.holder.add(new THREE.Mesh(sphereGeo(), basic(0x000000, { opacity: 0.9 })));
  return f.holder;
}
function prewarmDD() {
  const g = new THREE.Group();
  g.add(dogModel(true), dogModel(false), new THREE.Mesh(lowSphereGeo(), rimMaterial(0x9a3aff, 3.5, 1.4)));
  g.add(new THREE.Mesh(discGeo(), basic(0xffffff, { map: poolTex(), opacity: 1, polygonOffset: true, polygonOffsetFactor: -2 })), glowSprite(0xffd040, 1.6, 0.7));
  return g;
}

// =====================================================================================
// definitions
// =====================================================================================
const aheadGap = (k, o) => o.raceDist - k.raceDist;

export default [
  {
    id: 'hollowpurple', name: 'Hollow Purple', color: '#9a3aff',
    help: 'Red and blue merge into a giant purple sphere that tears down the track, wrecking every kart in its path.',
    icon: '<svg viewBox="0 0 64 64"><circle cx="34" cy="34" r="25" fill="#5a10a0" stroke="#1b2a34" stroke-width="3"/><circle cx="34" cy="34" r="17" fill="#b45aff"/><circle cx="34" cy="34" r="9" fill="#f6e6ff"/><ellipse cx="29" cy="27" rx="6" ry="3" fill="#fff" opacity=".75"/><g stroke="#1b2a34" stroke-width="3"><circle cx="12" cy="13" r="9" fill="#e0301a"/><circle cx="54" cy="55" r="8" fill="#2a6aff"/></g><path d="M18 20q6 3 8 8M48 49q-5-3-7-7" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><g fill="#d8a0ff" stroke="#1b2a34" stroke-width="1.5"><rect x="50" y="20" width="6" height="5"/><rect x="8" y="42" width="6" height="5"/></g></svg>',
    odds: [0, 0, 1, 4, 7],
    gesture: 'throwF',
    ai: (k, ctx) => ctx.ahead(k, 4).some((o) => { const g = aheadGap(k, o); return g > 4 && g < 230; }),
    use: (k, ctx) => hollowPurple(k, ctx),
    prewarm: () => prewarmHP(),
  },
  {
    id: 'infinitevoid', name: 'Infinite Void', color: '#4a6aff',
    help: 'Domain Expansion: a starry dome bursts out around you and freezes every rival inside while you drive on.',
    icon: '<svg viewBox="0 0 64 64"><rect x="4" y="46" width="56" height="12" rx="2" fill="#6c6e68" stroke="#1b2a34" stroke-width="3"/><path d="M8 46a24 24 0 0 1 48 0z" fill="#0d0d36" stroke="#1b2a34" stroke-width="3"/><ellipse cx="32" cy="31" rx="15" ry="5" fill="none" stroke="#9ae0ff" stroke-width="3.5"/><circle cx="32" cy="31" r="4" fill="#fff"/><g fill="#fff"><circle cx="17" cy="40" r="1.6"/><circle cx="46" cy="41" r="1.6"/><circle cx="23" cy="25" r="1.3"/><circle cx="43" cy="23" r="1.5"/><circle cx="50" cy="35" r="1.1"/><circle cx="14" cy="33" r="1"/></g><g fill="#a0a5a9"><rect x="12" y="49" width="8" height="3"/><rect x="28" y="49" width="8" height="3"/><rect x="44" y="49" width="8" height="3"/></g></svg>',
    odds: [1, 2, 3, 4, 3],
    gesture: 'use',
    ai: (k, ctx) => { const n = ctx.near(k.pos, 30, k).filter((o) => !o.finished); return n.length >= 2 || n.some((o) => o.pos.distanceTo(k.pos) < 16); },
    use: (k, ctx) => infiniteVoid(k, ctx),
    prewarm: () => prewarmIV(),
  },
  {
    id: 'blackflash', name: 'Black Flash', color: '#d01a1a',
    help: 'Your fist crackles with black lightning: the next kart you bump is wrecked by a Black Flash and you blast forward.',
    icon: '<svg viewBox="0 0 64 64"><path d="M5 9l14 12-6 4 15 10M59 7L47 21l6 3-14 13M7 57l14-12 2 6 9-9" stroke="#ff2a2a" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M5 9l14 12-6 4 15 10M59 7L47 21l6 3-14 13M7 57l14-12 2 6 9-9" stroke="#0a0a0a" stroke-width="2.5" fill="none" stroke-linejoin="round"/><g stroke="#ff3a2a" stroke-width="2.5"><rect x="19" y="24" width="30" height="26" rx="4" fill="#15151a"/><rect x="19" y="17" width="8" height="11" rx="2" fill="#2a2a30"/><rect x="27" y="16" width="8" height="11" rx="2" fill="#2a2a30"/><rect x="35" y="16" width="8" height="11" rx="2" fill="#2a2a30"/><rect x="43" y="18" width="7" height="10" rx="2" fill="#2a2a30"/><rect x="14" y="32" width="16" height="9" rx="3" fill="#2a2a30"/></g><path d="M24 44h20" stroke="#ff3a2a" stroke-width="2.5"/></svg>',
    odds: [3, 4, 3, 2, 1],
    gesture: 'use',
    ai: (k, ctx) => ctx.near(k.pos, 22, k).some((o) => {
      if (o.finished) return false;
      const f = k.forward(_q), dx = o.pos.x - k.pos.x, dz = o.pos.z - k.pos.z, d = Math.hypot(dx, dz) || 1;
      return (dx * f.x + dz * f.z) / d > 0.6 || d < 6;
    }),
    use: (k, ctx) => blackFlash(k, ctx),
    prewarm: () => prewarmBF(),
  },
  {
    id: 'divinedogs', name: 'Divine Dogs', color: '#3a2a5a',
    help: 'Two shadow dogs leap out of the shadows and chase down the two karts just ahead of you.',
    icon: '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="54" rx="28" ry="7" fill="#1a0a2a" stroke="#7a3ac0" stroke-width="2.5"/><g stroke="#1b2a34" stroke-width="2.5" stroke-linejoin="round"><path d="M6 50V30h4l3-12 4 12h6v6h7v8h-9v6z" fill="#f4f4f4"/><path d="M58 50V30h-4l-3-12-4 12h-6v6h-7v8h9v6z" fill="#1b1b22" stroke="#c8b8ff"/></g><rect x="16" y="32" width="4" height="3" fill="#ffc020"/><rect x="44" y="32" width="4" height="3" fill="#ffc020"/><rect x="27" y="37" width="3" height="3" fill="#1b2a34"/><rect x="34" y="37" width="3" height="3" fill="#fff"/></svg>',
    odds: [4, 4, 4, 3, 2],
    gesture: 'use',
    ai: (k, ctx) => ctx.ahead(k, 2).some((o) => !o.finished && aheadGap(k, o) < 260) || ctx.behind(k, 1).some((o) => k.raceDist - o.raceDist < 50),
    use: (k, ctx) => divineDogs(k, ctx),
    prewarm: () => prewarmDD(),
  },
];
