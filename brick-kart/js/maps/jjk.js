// Cursed Brick Shibuya (Jujutsu Kaisen): start in the yard of Tokyo Jujutsu High,
// race through a tunnel of torii, over the river bridge into night-time Shibuya
// (scramble crossing, 109, the station and the Fukutoshin subway), up the
// expressway past Yuta and Rika, glide into Sukuna's Malevolent Shrine, dodge
let slashTex = null;
function slashTexture() {
  if (slashTex) return slashTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, 'rgba(255,40,60,0)'); gr.addColorStop(0.25, 'rgba(255,120,130,0.8)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,120,130,0.8)'); gr.addColorStop(1, 'rgba(255,40,60,0)');
  g.shadowColor = '#ff2030'; g.shadowBlur = 18; g.fillStyle = gr;
  g.beginPath(); g.moveTo(8, 112); g.quadraticCurveTo(256, -30, 504, 112); g.quadraticCurveTo(256, 50, 8, 112); g.fill();
  slashTex = new THREE.CanvasTexture(c); slashTex.colorSpace = THREE.SRGBColorSpace;
  return slashTex;
}

// Jogo's meteors and Gojo's Hollow Purple in the Unlimited Void and head home.
import { THREE, BrickBuilder, C, plastic, groundPlane, pine, rock, lamp, building, crossing, liquid, disc, strokeTrack, inRange, each, edges, arch, tunnel, mat4, canvasTexture, brickGeometry } from './kit.js';
import * as P from './jjk-props.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const fxOf = (ctx) => ctx.world.race?.fx;

// ---- hazards --------------------------------------------------------------------------------

// Sukuna's Dismantle: a red line flickers on the road, then a white-hot slash cuts along it.
function dismantle(ctx, { k, lat = 0, len = 16, ang = 0, period = 2.8, offset = 0 }) {
  const tr = ctx.track, i = tr.kToIndex(k);
  const c = tr.at(i, lat, 0.1);
  const r = tr.yawAt(i) + ang;
  const dir = new THREE.Vector3(Math.cos(r), 0, -Math.sin(r)), nrm = new THREE.Vector3(Math.sin(r), 0, Math.cos(r));
  const g = new THREE.Group(); g.position.copy(c); g.rotation.y = r;
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const line = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.7), lineMat);
  const bladeMat = new THREE.MeshBasicMaterial({ map: slashTexture(), color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const blade = new THREE.Mesh(new THREE.PlaneGeometry(len * 1.25, 5).translate(0, 2.2, 0), bladeMat); blade.scale.y = 0.001;
  const blade2 = new THREE.Mesh(new THREE.PlaneGeometry(len * 1.35, 6).translate(0, 2.6, 0), new THREE.MeshBasicMaterial({ map: slashTexture(), color: 0xff2030, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  blade2.rotation.x = -0.35; blade2.scale.x = -1; blade2.visible = false;
  g.add(line, blade, blade2);
  ctx.group.add(g);
  let state = 0, cut = false;
  const TEL = 1.1, HIT = 0.32;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period);
      const s0 = period - TEL - HIT;
      if (ph < s0) { state = 0; lineMat.opacity = Math.max(0, lineMat.opacity - dt * 3); blade.scale.y = 0.001; blade2.visible = false; cut = false; return; }
      if (ph < s0 + TEL) {
        state = 1; const f = (ph - s0) / TEL;
        lineMat.color.setHex(0xff2030); lineMat.opacity = (0.25 + 0.55 * f) * (0.6 + 0.4 * Math.sin(t * 40));
        line.scale.z = 0.4 + f * 0.6; blade.scale.y = 0.001;
        return;
      }
      state = 2; const f = (ph - s0 - TEL) / HIT;
      lineMat.color.setHex(0xffffff); lineMat.opacity = 1; line.scale.z = 1.6;
      blade.scale.y = Math.sin(f * Math.PI) * 1.2 + 0.001; blade2.visible = true; blade2.position.y = f * 3;
      if (!cut) {
        cut = true;
        const fx = fxOf(ctx);
        if (fx) for (let n = 0; n < 26; n++) { const a = (n / 25 - 0.5) * len; fx.spark(c.x + dir.x * a, c.y + 0.4, c.z + dir.z * a, nrm.x * (Math.random() - 0.5) * 16, 4 + Math.random() * 8, nrm.z * (Math.random() - 0.5) * 16, n % 3 ? 0xff2a2a : 0xffffff, 0.5, 12); }
        ctx.world.race?.audio.sfx('spin', c);
      }
    },
    test(p) {
      if (state !== 2) return null;
      const dx = p.x - c.x, dz = p.z - c.z;
      const a = dx * dir.x + dz * dir.z, n = dx * nrm.x + dz * nrm.z;
      return Math.abs(a) < len / 2 + 0.6 && Math.abs(n) < 1.8 && Math.abs(p.y - c.y) < 3 ? 'spin' : null;
    },
    near(p, rr) {
      if (state === 0) return false;
      const dx = p.x - c.x, dz = p.z - c.z;
      const a = dx * dir.x + dz * dir.z, n = dx * nrm.x + dz * nrm.z;
      return Math.abs(a) < len / 2 + rr && Math.abs(n) < 2 + rr;
    },
  };
}

// Jogo's meteors: a molten brick lobbed from his volcano head onto a marked spot.
function meteors(ctx, { from, targets, period = 2.6, offset = 0 }) {
  const tr = ctx.track;
  const rb = new BrickBuilder(1);
  rb.brick(0, -1.2, 0, 2, 2, 3, 0x2a1a14, { pitch: 1.1 });
  rb.box(0.4, -1.3, 0.3, 1.6, 1.6, 1.6, 0xff5a10, { matOpts: { emissive: 0xff4a00, emissiveIntensity: 2.4 } });
  rb.box(-0.5, -0.1, -0.4, 1.2, 1.2, 1.2, 0xffa020, { matOpts: { emissive: 0xff8a10, emissiveIntensity: 2.4 } });
  const rockG = new THREE.Group(); rockG.add(rb.build({ name: 'meteor' })); rockG.add(P.glow(0xff7a20, 9, 0.9));
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5a10, transparent: true, opacity: 0.8, depthWrite: false });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xff2a00, transparent: true, opacity: 0.35, depthWrite: false });
  const marker = new THREE.Group();
  marker.add(new THREE.Mesh(new THREE.RingGeometry(3.4, 4.2, 28).rotateX(-Math.PI / 2), ringMat));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(3.4, 28).rotateX(-Math.PI / 2), fillMat);
  marker.add(fill);
  ctx.group.add(rockG, marker);
  rockG.visible = marker.visible = false;
  let t0 = -offset, flying = false, boom = 0;
  const target = new THREE.Vector3(), src = new THREE.Vector3();
  const FLIGHT = 1.9;
  return {
    update(dt, t) {
      boom = Math.max(0, boom - dt);
      if (!flying && t - t0 > period) {
        t0 = t; flying = true;
        const [k, latF] = targets[Math.floor(Math.random() * targets.length)];
        const i = tr.wrap(tr.kToIndex(k) + Math.floor((Math.random() - 0.5) * 16));
        tr.at(i, (latF + (Math.random() - 0.5) * 0.5) * tr.HW[i], 0.12, target);
        src.copy(typeof from === 'function' ? from() : from);
      }
      if (!flying) { rockG.visible = marker.visible = false; return; }
      const f = (t - t0) / FLIGHT;
      if (f >= 1) {
        flying = false; boom = 0.28;
        const fx = fxOf(ctx);
        if (fx) { fx.explosion(target); for (let n = 0; n < 20; n++) { const a = Math.random() * 6.28; fx.spark(target.x, target.y + 0.5, target.z, Math.cos(a) * 9, 8 + Math.random() * 8, Math.sin(a) * 9, 0xff4a00, 0.8, 18); } }
        ctx.world.race?.audio.sfx('cannon', target);
        rockG.visible = marker.visible = false;
        return;
      }
      rockG.visible = marker.visible = true;
      rockG.position.lerpVectors(src, target, f);
      rockG.position.y += Math.sin(f * Math.PI) * 38;
      rockG.rotation.set(t * 3, t * 2, 0);
      marker.position.copy(target);
      fill.scale.setScalar(Math.max(0.01, f));
      ringMat.opacity = 0.45 + 0.45 * Math.abs(Math.sin(t * 10));
      const fx = fxOf(ctx);
      if (fx && Math.random() < 0.8) fx.spark(rockG.position.x, rockG.position.y, rockG.position.z, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, Math.random() < 0.5 ? 0xff7a10 : 0xffd040, 0.6, 0);
    },
    test(p) { return boom > 0 && p.y < target.y + 4.5 && Math.hypot(p.x - target.x, p.z - target.z) < 4.4 ? 'wreck' : null; },
    near(p, r) { return flying && Math.hypot(p.x - target.x, p.z - target.z) < 4.4 + r; },
  };
}

// Gojo's Hollow Purple: red and blue orbs gather, merge, and a huge purple sphere
// tears straight across the road along a glowing telegraph band.
function hollowPurple(ctx, { from, to, period = 7, offset = 0, radius = 4.2 }) {
  const g = new THREE.Group();
  const mk = (col, r, glowSize) => { const o = new THREE.Group(); o.add(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), P.neon(col, 2.6))); o.add(P.glow(col, glowSize, 0.95)); g.add(o); return o; };
  const red = mk(0xff2a3a, 1.1, 7), blue = mk(0x3ab8ff, 1.1, 7);
  const purple = new THREE.Group();
  purple.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 0.55, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe8ff })));
  const shellMat = new THREE.MeshBasicMaterial({ color: 0xb04aff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  purple.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 22, 16), shellMat));
  purple.add(P.glow(0xc060ff, radius * 6, 1));
  g.add(purple);
  const dir = V1.subVectors(to, from).clone(); const L = dir.length(); dir.normalize();
  const bandMat = new THREE.MeshBasicMaterial({ color: 0xa040ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, L).rotateX(-Math.PI / 2), bandMat);
  band.position.set((from.x + to.x) / 2, Math.min(from.y, to.y) - 3.1, (from.z + to.z) / 2); band.rotation.y = Math.atan2(dir.x, dir.z);
  // the band sits on the road: find road height at the middle
  const midY = ctx.track.roadHeightNear(band.position.x, band.position.z);
  band.position.y = (midY ?? 0) + 0.15;
  g.add(band);
  ctx.group.add(g);
  const pos = new THREE.Vector3(), side = new THREE.Vector3(-dir.z, 0, dir.x);
  let state = 0, fired = false;
  const CH = 2.6, FIRE = 1.0;
  return {
    update(dt, t) {
      const ph = (t + offset) % period;
      if (ph < CH) {
        state = ph > CH - 1.5 ? 1 : 0; fired = false;
        const f = ph / CH;
        const a = t * 5, rr = 6 * (1 - f) + 0.8;
        red.visible = blue.visible = true; purple.visible = false;
        red.position.set(from.x + side.x * rr * Math.cos(a), from.y + Math.sin(a) * rr * 0.6, from.z + side.z * rr * Math.cos(a));
        blue.position.set(from.x - side.x * rr * Math.cos(a), from.y - Math.sin(a) * rr * 0.6, from.z - side.z * rr * Math.cos(a));
        red.scale.setScalar(0.6 + f); blue.scale.setScalar(0.6 + f);
        bandMat.opacity = state ? (0.2 + 0.35 * Math.abs(Math.sin(t * 9))) * (ph - (CH - 1.5)) / 1.5 + 0.08 : 0.05;
        pos.set(0, -999, 0);
        return;
      }
      red.visible = blue.visible = false;
      if (ph < CH + FIRE) {
        state = 2;
        const f = (ph - CH) / FIRE;
        pos.lerpVectors(from, to, f * f * (3 - 2 * f) * 0.3 + f * 0.7);
        purple.visible = true; purple.position.copy(pos); purple.scale.setScalar(Math.min(1, 0.3 + f * 4));
        purple.rotation.y = t * 4;
        bandMat.opacity = 0.75;
        if (!fired) { fired = true; ctx.world.race?.audio.sfx('cannon', pos); }
        const fx = fxOf(ctx);
        if (fx) for (let n = 0; n < 3; n++) fx.spark(pos.x + (Math.random() - 0.5) * radius * 2, pos.y + (Math.random() - 0.5) * radius * 2, pos.z + (Math.random() - 0.5) * radius * 2, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, n ? 0xc060ff : 0xffffff, 0.7);
        return;
      }
      state = 0;
      const f = Math.min(1, (ph - CH - FIRE) / 0.5);
      purple.visible = f < 1; purple.scale.setScalar(Math.max(0.01, 1 - f)); purple.position.copy(to);
      bandMat.opacity = Math.max(0.05, 0.75 * (1 - f * 2));
      pos.set(0, -999, 0);
    },
    test(p) { return state === 2 && Math.hypot(p.x - pos.x, p.z - pos.z) < radius + 1.3 && Math.abs(p.y + 1 - pos.y) < radius + 1.5 ? 'wreck' : null; },
    near(p, r) {
      if (!state) return false;
      const dx = p.x - from.x, dz = p.z - from.z;
      const a = dx * dir.x + dz * dir.z, n = Math.abs(dx * dir.z - dz * dir.x);
      return a > -r && a < L + r && n < radius + r;
    },
  };
}

// Rika's giant arm swings down from her shoulder S onto a marked spot T on the road.
function rikaSlam(ctx, { S, T, period = 4.4, offset = 0 }) {
  const hx = T.x - S.x, hz = T.z - S.z, dh = Math.hypot(hx, hz), dy = S.y - T.y - 1.2;
  const len = Math.hypot(dh, dy), aDown = Math.atan2(dh, dy), aUp = aDown + 1.3;
  const pivot = new THREE.Group(); pivot.position.copy(S); pivot.rotation.y = Math.atan2(-hz, hx);
  const inner = new THREE.Group(); pivot.add(inner);
  const arm = P.rikaArm(len); arm.position.y = -len; inner.add(arm);
  ctx.group.add(pivot);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0xff1030, transparent: true, opacity: 0.2, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(4.6, 24).rotateX(-Math.PI / 2), shadowMat);
  shadow.position.copy(T); ctx.group.add(shadow);
  let a = aUp, down = false;
  return {
    update(dt, t) {
      const ph = ((t + offset) % period) / period;
      // 0-.45 raised, .45-.62 wind-up shake, .62-.68 slam, .68-.82 down, .82-1 lift
      if (ph < 0.45) a = aUp;
      else if (ph < 0.62) a = aUp + 0.15 + Math.sin(t * 50) * 0.03;
      else if (ph < 0.68) a = aUp + 0.15 + (aDown - aUp - 0.15) * ((ph - 0.62) / 0.06);
      else if (ph < 0.82) a = aDown;
      else a = aDown + (aUp - aDown) * ((ph - 0.82) / 0.18);
      inner.rotation.z = a;
      const isDown = Math.abs(a - aDown) < 0.02;
      if (isDown && !down) { down = true; const fx = fxOf(ctx); if (fx) { fx.dust({ pos: T, yaw: 0 }, 0xcfc8ff, 14); fx.pop(T, 0xc0a0ff); } ctx.world.race?.audio.sfx('wall', T); }
      if (!isDown) down = false;
      shadowMat.opacity = ph > 0.4 && ph < 0.82 ? 0.25 + 0.35 * Math.abs(Math.sin(t * 12)) : 0.12;
    },
    test(p) { return down && Math.hypot(p.x - T.x, p.z - T.z) < 4.8 && p.y < T.y + 4 ? 'wreck' : null; },
    near(p, r) { return Math.hypot(p.x - T.x, p.z - T.z) < 4.8 + r && (down || shadowMat.opacity > 0.2); },
  };
}

// ---- effects helpers ------------------------------------------------------------------------------
// Floating cursed-energy motes swirling around a spot.
function motes(ctx, x, y, z, radius, height, n, color, size = 1.1, speed = 1) {
  const pos = new Float32Array(n * 3), a0 = new Float32Array(n), r0 = new Float32Array(n), h0 = new Float32Array(n), w = new Float32Array(n);
  for (let k = 0; k < n; k++) { a0[k] = Math.random() * 6.28; r0[k] = radius * Math.sqrt(Math.random()); h0[k] = Math.random() * height; w[k] = (0.2 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: P.glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.position.set(x, y, z); pts.frustumCulled = false;
  ctx.group.add(pts);
  ctx.anim((dt, t) => {
    for (let k = 0; k < n; k++) {
      const a = a0[k] + t * w[k] * speed, hh = (h0[k] + t * 2.2 * speed * Math.abs(w[k])) % height;
      pos[k * 3] = Math.cos(a) * r0[k]; pos[k * 3 + 1] = hh; pos[k * 3 + 2] = Math.sin(a) * r0[k];
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}
// thick beam (box) between two points
function beam(b, ax, ay, az, bx, by, bz, t, color, opts) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
  const yaw = Math.atan2(dx, dz), pitch = -Math.asin(dy / L);
  b.boxM(mat4((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, pitch, yaw, 0, t, t, L), color, opts);
}

// neon sign atlas: 4 x 8 cells of 256 x 128
const SIGNS = [
  ['SHIBUYA', '#ff3a8a'], ['109', '#ff4a4a'], ['RAMEN', '#ffb020'], ['KARAOKE', '#3ad8ff'], ['CURSED', '#b04aff'], ['TOKYO', '#ffffff'], ['ARCADE', '#7aff5a'], ['SUSHI', '#ff7a3a'],
  ['JUJUTSU', '#6ad8ff'], ['DOMAIN', '#ff3a3a'], ['PACHINKO', '#ffe040'], ['HACHIKO', '#ffd0a0'], ['QFRONT', '#40ffd0'], ['HOTEL', '#ff60c0'], ['CAFE', '#ffcf6a'], ['BRICK', '#ffe040'],
  ['OPEN 24H', '#3aff9a'], ['MANGA', '#ff5a5a'], ['GOJO FAN CLUB', '#8ae0ff'], ['GAMES', '#c080ff'], ['TAXI', '#ffd040'], ['BAR', '#ff4aa0'], ['NOODLES', '#ffa040'], ['STATION', '#6ab0ff'],
  ['SHIBUYA STN', '#ffffff'], ['FUKUTOSHIN', '#c8a060'], ['SHUTO EXPWY', '#ffffff'], ['EXIT', '#40ff60'], ['TOKYO JUJUTSU HIGH', '#ffd070'], ['VEIL', '#9a6aff'], ['YAKINIKU', '#ff6a3a'], ['LIVE', '#ff3a3a'],
];
let signAtlas = null;
function signMaterial() {
  if (signAtlas) return signAtlas;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const g = c.getContext('2d');
  SIGNS.forEach(([text, col], k) => {
    const x = (k % 4) * 256, y = Math.floor(k / 4) * 128;
    g.fillStyle = k === 26 ? '#0f5a2a' : '#120a1a'; g.fillRect(x, y, 256, 128);
    g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(x + 8, y + 8, 240, 112);
    g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 16;
    let fs = 70; g.font = `900 ${fs}px Arial Black, Arial`;
    while (g.measureText(text).width > 220 && fs > 16) { fs -= 4; g.font = `900 ${fs}px Arial Black, Arial`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + 128, y + 66); g.shadowBlur = 0;
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  signAtlas = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide });
  return signAtlas;
}
const signGeos = new Map();
function signGeo(k) {
  let g = signGeos.get(k);
  if (!g) {
    g = new THREE.PlaneGeometry(1, 1);
    const u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 8, uv = g.attributes.uv;
    for (let n = 0; n < uv.count; n++) uv.setXY(n, u0 + uv.getX(n) * 0.25, v0 + uv.getY(n) * 0.125);
    signGeos.set(k, g);
  }
  return g;
}
function sign(b, k, x, y, z, w, rot, vertical = false) {
  const h = w / 2;
  b.addMatrix(signGeo(k), signMaterial(), mat4(x, y, z, 0, rot, vertical ? Math.PI / 2 : 0, w, h, 1));
}

// ---- the map ------------------------------------------------------------------------------------------
export default {
  id: 'jjk', name: 'Cursed Brick Shibuya', subtitle: 'Season 2 · Shibuya Incident and three Domain Expansions', cup: 'jjk', seed: 77,
  width: 28, shoulder: 6, edge: 'fence', start: 0.5,
  points: [[235,171,0],[241,96,0],[231,20,2],[201,-40,6],[209,-103,12],[213,-171,16],[199,-238,14],[154,-286,8],[79,-310,3],[0,-312,0],[-77,-299,0],[-130,-275,0],[-183,-286,0],[-229,-241,0],[-257,-167,0],[-265,-86,4],[-260,-14,10],[-253,41,16],[-248,77,18],[-236,145,22],[-215,201,20],[-165,233,20],[-89,239,20],[-34,213,10],[28,227,0],[96,213,0],[167,233,0],[217,215,0]],
  sections: [
    { from: 26.7, to: 1.8, surface: 'stone', edge: 'fence' },
    { from: 1.9, to: 3.9, support: 'bank', shoulder: 5 },
    { from: 4.05, to: 5.75, edge: 'wall', shoulder: 1.5, width: 26, support: 'pillar' },
    { from: 8.55, to: 9.45, width: 46, shoulder: 4 },
    { from: 12.75, to: 14.3, edge: 'wall', shoulder: 2 },
    { from: 14.6, to: 18.1, edge: 'wall', shoulder: 1.5, width: 26, surface: 'express', support: 'pillar' },
    { from: 18.12, to: 20.15, gap: true },
    { from: 20.15, to: 22.7, surface: 'blood', edge: 'wall', shoulder: 4, support: 'bank' },
    { from: 22.7, to: 23.6, support: 'bank', edge: 'wall', shoulder: 3 },
    { from: 24.0, to: 26.2, surface: 'void', edge: 'open', shoulder: 8 },
  ],
  items: [1.45, 5.1, 7.9, 12.2, 16.2, 21.4, 25.5],
  boosts: [[2.7, 0], [6.6, 0.4], [10.3, -0.35], [14.9, 0], [17.5, 0], [23.45, 0.4], [26.3, -0.3]],
  ramps: [1.75],
  gliders: [18.02],
  studs: [[0.9, -0.4, 8], [3.2, 0, 8], [5.2, 0.4, 6], [8.9, -0.6, 6], [8.9, 0.6, 6], [11.0, 0, 6], [13.3, 0, 8], [16.8, 0, 6], [21.3, -0.5, 6], [23.9, 0, 8], [25.9, 0.3, 6]],
  theme: {
    sky: [0x060818, 0x2c2466, 0x0b0a18], fog: [0x1e1c4a, 170, 980], stars: 4000,
    sun: { color: 0xc8d4ff, intensity: 1.7, dir: [-0.35, 1, 0.45] },
    hemi: [0xa8b4ff, 0x3a2e52, 1.35], envIntensity: 0.4,
    ground: 0x2c3038, groundPitch: 1.6, shoulder: 0x444852, dust: 0x7a7a8a,
    road: { base: '#3a3d46', line: '#e8e8f0' },
    surfaces: {
      stone: { base: '#8f887c', line: null, seams: 'rgba(40,30,20,0.4)' },
      express: { base: '#2c2f36', line: '#f2cd37', dashed: true, seams: 'rgba(0,0,0,0.3)' },
      blood: { base: '#4a0e14', line: '#ff3040', seams: 'rgba(0,0,0,0.45)', emissive: 0x2a0004, emissiveIntensity: 1 },
      void: { base: '#1c1650', line: '#9ad8ff', seams: 'rgba(160,200,255,0.25)', emissive: 0x241a70, emissiveIntensity: 0.9, rough: 0.25 },
    },
    wall: [C.dkgray, C.ltgray], curb: [C.red, C.white], gate: [C.red, C.black], fence: [C.dkred, C.black],
    support: 'pillar', pillar: C.dkgray, pillar2: C.ltgray, skirt: ['#50545c', '#35383e'], skirtColor: C.dkgray,
    rampSide: C.dkblue, ramp: C.purple,
    music: { bpm: 150, root: 50, scale: 'minor', style: 'rock' },
  },

  decor(ctx) {
    const { b, rand, track: tr, scene } = ctx;
    const nb = ctx.bNoShadow;
    const K = (k) => tr.kToIndex(k);
    const edgeLat = (i) => tr.HW[i] + tr.SH[i];
    // the first spot at/after `lat` (signed: + outside, - infield) with `r` clearance from all road
    const spot = (k, lat, r) => {
      const i = K(k), sd = Math.sign(lat) || 1;
      for (let l = Math.abs(lat); l < Math.abs(lat) + 160; l += 2) { const p = tr.at(i, l * sd, 0); if (tr.clearance(p.x, p.z, r + 4) >= r) { p.y = 0; return p; } }
      const p = tr.at(i, lat, 0); p.y = 0; return p;
    };
    const faceRoad = (obj, k) => { const q = tr.at(K(k), 0, 0); obj.rotation.y = Math.atan2(q.x - obj.position.x, q.z - obj.position.z); };
    const add = (f, p, k, y = 0) => { f.root.position.set(p.x, y, p.z); faceRoad(f.root, k); ctx.group.add(f.root); return f; };
    const pl = (col, x, y, z, I, d) => { const l = new THREE.PointLight(col, I, d, 1.3); l.position.set(x, y, z); scene.add(l); return l; };

    // ---- ground: river + lake, blood lake of the Malevolent Shrine, lava, grass, the Void ---------
    const SHRINE = [-308, 241];
    const VOLC = [-64, 363];
    const gliding = (i) => inRange(tr, i, 18.0, 20.25);
    const riverPath = (g, toPx, sc, w) => { g.lineWidth = w * sc; g.lineCap = g.lineJoin = 'round'; g.beginPath(); [[828, -156], [386, -152], [225, -147], [110, -138], [37, -120]].forEach(([x, z], n) => { const [px, py] = toPx(x, z); if (n) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); };
    const hole = ctx.makeMask(3000, 2048, (g, toPx, sc) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
      g.fillStyle = g.strokeStyle = '#000';
      riverPath(g, toPx, sc, 32); disc(g, toPx, sc, 28, -110, 66);
      disc(g, toPx, sc, SHRINE[0], SHRINE[1], 105); strokeTrack(g, tr, toPx, sc, 22, gliding);
    });
    ctx.cutGround(hole);
    const water = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = g.strokeStyle = '#fff'; riverPath(g, toPx, sc, 36); disc(g, toPx, sc, 28, -110, 70); });
    liquid(ctx, water, 0x1a4a8a, -2.2, { size: 1600, speed: 0.2 });
    const bloodM = ctx.makeMask(1600, 1024, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, SHRINE[0], SHRINE[1], 109); strokeTrack(g, tr, toPx, sc, 26, gliding); });
    liquid(ctx, bloodM, 0x4a0610, -1.6, { size: 1600, speed: 0.08, opacity: 1, emissive: 0x3a0006, rough: 0.45 });
    // grass around the school and forest, scorched earth near the volcano
    const grass = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, 304, 147, 175); disc(g, toPx, sc, 156, 110, 110); disc(g, toPx, sc, 276, -28, 110); disc(g, toPx, sc, 175, -55, 65); });
    scene.add(groundPlane(0x2c5a34, -0.05, 1600, 1.6, { mask: grass }));
    const scorch = ctx.makeMask(1600, 512, (g, toPx, sc) => { g.fillStyle = '#fff'; disc(g, toPx, sc, VOLC[0], VOLC[1], 150); });
    scene.add(groundPlane(0x3a2420, -0.05, 1600, 1.6, { mask: scorch, rough: 0.9 }));
    // Unlimited Void floor: a starfield disc under the southern straight
    const VOIDC = [74, 304];
    const voidTex = canvasTexture(1024, 1024, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, '#3a3aa0'); gr.addColorStop(0.5, '#1a1450'); gr.addColorStop(1, '#05030f');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 1400; k++) { const a = Math.random() * 6.28, r = Math.random() * w / 2; g.fillStyle = `rgba(${200 + Math.random() * 55},${200 + Math.random() * 55},255,${0.4 + Math.random() * 0.6})`; const s = Math.random() < 0.1 ? 3 : 1.5; g.fillRect(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, s, s); }
      g.strokeStyle = 'rgba(150,210,255,0.35)'; g.lineWidth = 3;
      for (let k = 0; k < 6; k++) { g.beginPath(); for (let a = 0; a < 9; a += 0.05) { const r = 20 + a * 26 + k * 6; const px = w / 2 + Math.cos(a + k) * r, py = h / 2 + Math.sin(a + k) * r; if (a) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); }
    });
    const voidFloor = new THREE.Mesh(new THREE.CircleGeometry(152, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: voidTex, emissive: 0xffffff, emissiveMap: voidTex, emissiveIntensity: 0.9, roughness: 0.3 }));
    voidFloor.position.set(VOIDC[0], -0.03, VOIDC[1]); voidFloor.receiveShadow = true; scene.add(voidFloor);
    ctx.anim((dt, t) => { voidFloor.rotation.y = t * 0.03; });

    // ---- Tokyo Jujutsu High (around the start) ---------------------------------------------
    const campus = [[324, 147, 30, 18, 8, 2, Math.PI / 2], [317, 37, 24, 16, 7, 1, Math.PI / 2], [331, 258, 26, 16, 7, 1, Math.PI / 2 + 0.3], [166, 129, 22, 14, 6, 1, -Math.PI / 2], [161, 37, 18, 12, 6, 1, -Math.PI / 2 + 0.2]];
    for (const [x, z, w, d, h, tiers, rot] of campus) if (tr.clearance(x, z, 40) > Math.max(w, d) * 0.6) { P.hall(b, x, z, w, d, h, rot, { tiers }); ctx.claim(x, z, Math.max(w, d) * 0.75); }
    // five-storey pagoda
    { const x = 386, z = 92; P.hall(b, x, z, 14, 14, 6, 0.3, { tiers: 5, wall: C.dkred, wood: C.black }); b.cyl(x, 45, z, 0.4, 10, GOLDC, { seg: 6 }); ctx.claim(x, z, 12); }
    // big torii at the school gate and along the yard
    for (const k of [1.25, 26.95]) { const i = K(k), p = tr.at(i, 0, 0); P.torii(b, p.x, 0, p.z, 2 * (edgeLat(i) + 2), 13, tr.yawAt(i) + Math.PI / 2 * 0 + 0, C.red); }
    edges(ctx, 26.8, 1.8, 16, 3, (p) => P.lantern(b, p.x, p.z, 1.1));
    ctx.scatter(40, { minC: 5, maxC: 70, r: 4, test: (x, z) => grass.test(x, z) && Math.hypot(x - 304, z - 147) < 175 }, (x, z) => P.sakura(b, x, z, 1 + rand() * 0.4, rand));
    arch(ctx, 26.55, { cols: [C.red, C.black], text: 'TOKYO JUJUTSU HIGH', bg: '#5a0a0a', fg: '#ffd070' });

    // ---- torii forest path ---------------------------------------------------------------
    each(tr, 1.95, 3.75, 11, (i) => { const p = tr.at(i, 0, 0); P.torii(b, p.x, 0, p.z, 2 * (edgeLat(i) + 0.5), p.y + 10, tr.yawAt(i), C.red); });
    edges(ctx, 1.9, 4.0, 12, 5, (p) => { pine(b, p.x, 0, p.z, 1.3 + rand() * 0.5, false, rand() < 0.5 ? C.dkgreen : 0x1f3a2a); });
    ctx.scatter(90, { minC: 8, maxC: 110, r: 4, test: (x, z) => grass.test(x, z) && Math.hypot(x - 304, z - 147) > 110 }, (x, z) => pine(b, x, 0, z, 1.3 + rand() * 0.8, false, rand() < 0.5 ? C.dkgreen : 0x1f3a2a));

    // ---- river bridge ------------------------------------------------------------------------
    const towers = [];
    for (const k of [4.25, 5.55]) {
      const i = K(k), yaw = tr.yawAt(i);
      for (const sd of [-1, 1]) {
        const p = tr.at(i, sd * (edgeLat(i) + 2.5), 0);
        let y = -2; for (let n = 0; y < 44; n++) y = b.brick(p.x, y, p.z, 3, 3, 3, n % 2 ? C.white : C.red, { pitch: 1.3, studs: false, rot: yaw });
        b.box(p.x, 44, p.z, 5, 2, 5, C.red, { rot: yaw }); b.sphere(p.x, 47, p.z, 0.8, 0xff3030, { matOpts: { emissive: 0xff2020, emissiveIntensity: 2 } });
        towers.push({ p, sd, i });
      }
      const c = tr.at(i, 0, 0); b.box(c.x, 36, c.z, 2 * (edgeLat(i) + 3), 2.5, 2.5, C.red, { rot: yaw + Math.PI / 2 * 0 });
    }
    for (const { p, sd, i } of towers) for (let n = 1; n <= 5; n++) for (const dir of [-1, 1]) {
      const q = tr.at(tr.wrap(i + dir * n * 9), sd * (tr.HW[tr.wrap(i + dir * n * 9)] + 1.2), 1.2);
      beam(b, p.x, 42 - n * 1.5, p.z, q.x, q.y, q.z, 0.3, C.white);
    }
    each(tr, 4.1, 5.7, 5, (i) => { for (const sd of [-1, 1]) { const q = tr.at(i, sd * (edgeLat(i) + 0.3), 0); b.sphere(q.x, q.y + 2.6, q.z, 0.35, 0xffe08a, { matOpts: { emissive: 0xffd070, emissiveIntensity: 1.6 } }); } });
    // boats on the river
    for (let n = 0; n < 2; n++) {
      const boat = new BrickBuilder(1); boat.box(0, 0, 0, 4, 1.4, 10, n ? C.white : C.red); boat.box(0, 1.4, -1, 3, 2, 4, C.white); boat.box(0, 2.2, 1.05, 2.4, 0.8, 0.1, 0xffe08a, { matOpts: { emissive: 0xffd070, emissiveIntensity: 1.2 } });
      const bg = boat.build({ name: 'boat' }); scene.add(bg);
      ctx.anim((dt, t) => { const s = ((t * 9 + n * 300) % 600); bg.position.set(640 - s, -2.1, -155 + n * 6); bg.rotation.y = -Math.PI / 2; });
    }

    // ---- Shibuya -----------------------------------------------------------------------------------
    // city blocks with lit windows north of the road, around the station and along the expressway
    const cols = [0x2a2e38, 0x3a3e48, 0x4a4e58, C.dkgray, 0x5a5048, 0x384858, C.white, 0x6a6a74];
    const cityZone = (x, z) => (z < -161 && x < 198 && x > -405) || (x < -317 && z < 55 && z > -276) || (x > -267 && x < -189 && z < 18 && z > -230);
    const special = [];
    // Shibuya 109: silver cylinder tower at the fork
    { const p = spot(11, -34, 11); const x = p.x, z = p.z; special.push([x, z, 12]);
      let y = 0; for (let n = 0; n < 12; n++) { y = b.cyl(x, y, z, 9, 3.2, n % 2 ? 0xc8ccd4 : 0x9aa0aa, { seg: 20 }); }
      b.cyl(x, y, z, 5, 12, 0xc8ccd4, { seg: 16 });
      const r0 = tr.at(K(11), 0, 0), rot = Math.atan2(r0.x - x, r0.z - z);
      sign(nb, 1, x + Math.sin(rot) * 5.3, y + 6, z + Math.cos(rot) * 5.3, 12, rot, true);
      sign(nb, 1, x + Math.sin(rot) * 9.3, 20, z + Math.cos(rot) * 9.3, 10, rot);
      ctx.claim(x, z, 12); }
    // Shibuya station (infield side of the crossing) with Hachiko
    { const i = K(9.0), p = tr.at(i, -(edgeLat(i) + 26), 0), yaw = tr.yawAt(i);
      if (tr.clearance(p.x, p.z, 40) > 18) {
        b.box(p.x, 0, p.z, 84, 12, 34, 0x8a8478, { rot: yaw }); b.box(p.x, 12, p.z, 88, 1.2, 38, C.dkgray, { rot: yaw });
        const f = tr.at(i, -(edgeLat(i) + 8.9), 0);
        for (let n = -4; n <= 4; n++) { const q = V2.set(f.x + Math.sin(yaw) * n * 9, 0, f.z + Math.cos(yaw) * n * 9); b.box(q.x, 3, q.z, 6, 5, 0.3, 0xffe8a0, { rot: yaw, matOpts: { emissive: 0xffd070, emissiveIntensity: 0.9 } }); }
        sign(nb, 24, f.x, 9, f.z, 16, yaw + Math.PI);
        ctx.claim(p.x, p.z, 30);
        const h = tr.at(K(8.6), -(edgeLat(K(8.6)) + 5), 0); P.hachiko(b, h.x, h.z, yaw - Math.PI / 2, 0.8);
      } }
    // QFRONT with a giant video screen facing the crossing
    const screenTex = canvasTexture(512, 1024, (g, w, h) => {
      const pan = (y, bg, fn) => { g.fillStyle = bg; g.fillRect(0, y, w, 256); fn(y); };
      g.textAlign = 'center'; g.textBaseline = 'middle';
      pan(0, '#0a1030', (y) => { g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(256, y + 110, 60, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(186, y + 95, 140, 26); g.fillStyle = '#9ad8ff'; g.font = '900 44px Arial Black'; g.fillText('THE STRONGEST', 256, y + 210); });
      pan(256, '#300010', (y) => { g.fillStyle = '#ff3040'; g.font = '900 60px Arial Black'; g.fillText('DOMAIN', 256, y + 90); g.fillText('EXPANSION', 256, y + 170); });
      pan(512, '#200840', (y) => { const gr = g.createRadialGradient(256, y + 128, 10, 256, y + 128, 120); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, '#c060ff'); gr.addColorStop(1, 'rgba(60,0,120,0)'); g.fillStyle = gr; g.fillRect(0, y, w, 256); g.fillStyle = '#fff'; g.font = '900 40px Arial Black'; g.fillText('HOLLOW PURPLE', 256, y + 228); });
      pan(768, '#101010', (y) => { g.fillStyle = '#f2cd37'; g.font = '900 56px Arial Black'; g.fillText('BRICK KART', 256, y + 100); g.fillStyle = '#ff5a5a'; g.fillText('SHIBUYA GP', 256, y + 170); });
    });
    screenTex.wrapT = THREE.RepeatWrapping; screenTex.repeat.set(1, 0.25);
    { const i = K(8.7), p = spot(8.7, 36, 14), r0 = tr.at(i, 0, 0), rot = Math.atan2(r0.x - p.x, r0.z - p.z);
      b.box(p.x, 0, p.z, 26, 40, 22, 0x2a2e38, { rot }); b.box(p.x, 40, p.z, 27, 1, 23, C.ltgray, { rot });
      for (let f = 0; f < 11; f++) b.box(p.x, 2 + f * 3.4, p.z, 26.3, 1.3, 22.3, 0x2d4d6d, { rot, matOpts: { emissive: 0xffd070, emissiveIntensity: 0.3, rough: 0.1 } });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(20, 18), new THREE.MeshBasicMaterial({ map: screenTex }));
      scr.position.set(p.x + Math.sin(rot) * 11.2, 26, p.z + Math.cos(rot) * 11.2); scr.rotation.y = rot; ctx.group.add(scr);
      let frame = 0; ctx.anim((dt, t) => { const f = Math.floor(t / 2.5) % 4; if (f !== frame) { frame = f; screenTex.offset.y = 0.75 - f * 0.25; } });
      sign(nb, 12, p.x + Math.sin(rot) * 11.3, 12, p.z + Math.cos(rot) * 11.3, 12, rot);
      ctx.claim(p.x, p.z, 18); special.push([p.x, p.z, 18]); }
    // Scramble Square: tallest glass tower
    { const p = spot(9.6, 60, 14); building(b, p.x, p.z, 24, 24, 26, 0x384858, rand, { night: true, trim: 0x9ab0c8 }); b.box(p.x, 86, p.z, 18, 4, 18, 0x9ab0c8); ctx.claim(p.x, p.z, 18); }
    let signK = 0;
    for (let x = -470; x < 260; x += 28) for (let z = -640; z < 80; z += 28) {
      const bx = x + (rand() - 0.5) * 8, bz = z + (rand() - 0.5) * 8;
      if (!cityZone(bx, bz) || !hole.test(bx, bz)) continue;
      const w = 12 + Math.floor(rand() * 5) * 2, d = 12 + Math.floor(rand() * 5) * 2, r = Math.max(w, d) * 0.72;
      const c = tr.clearance(bx, bz, 160);
      if (c < r + 2 || c > 150 || !ctx.free(bx, bz, r)) continue;
      ctx.claim(bx, bz, r);
      const floors = 3 + Math.floor(rand() * 4 + c * 0.05 + rand() * rand() * 10);
      const top = building(b, bx, bz, w, d, floors, cols[Math.floor(rand() * cols.length)], rand, { night: true, trim: rand() < 0.5 ? 0x8a8e98 : C.dkgray });
      if (c < 40) {
        // neon signs on the side facing the road
        let best = 0, bi = 0; for (let i = 0; i < tr.N; i += 8) { const dd = Math.hypot(tr.px(i) - bx, tr.pz(i) - bz); if (!best || dd < best) { best = dd; bi = i; } }
        const rot = Math.atan2(tr.px(bi) - bx, tr.pz(bi) - bz);
        const fx = Math.sin(rot), fz = Math.cos(rot), half = Math.max(w, d) / 2;
        // project onto the nearest face
        const off = Math.abs(fx) > Math.abs(fz) ? w / 2 : d / 2;
        const nx = Math.abs(fx) > Math.abs(fz) ? Math.sign(fx) : 0, nz = nx ? 0 : Math.sign(fz);
        const srot = Math.atan2(nx, nz);
        const kk = [0, 2, 3, 4, 5, 6, 7, 10, 13, 14, 16, 17, 19, 21, 22, 30, 31, 18, 8, 9][signK++ % 20];
        sign(nb, kk, bx + nx * (off + 0.6), Math.min(top - 4, 8 + rand() * 10), bz + nz * (off + 0.6), Math.min(half * 1.4, 12), srot);
        if (rand() < 0.5) { const lx = nz * (half * 0.7), lz = -nx * (half * 0.7); sign(nb, [3, 6, 11, 21, 30, 5][signK % 6], bx + nx * (off + 1.2) + lx, Math.min(top - 6, 14), bz + nz * (off + 1.2) + lz, 9, srot, true); }
      }
    }
    // scramble crossing: zebra stripes + side streets
    const zebra = plastic(0xf4f4f4, { rough: 0.6 });
    const iC = K(9.0), yawC = tr.yawAt(iC), pc = tr.at(iC, 0, 0);
    const fwd = [Math.sin(yawC), Math.cos(yawC)], rgt = [-Math.cos(yawC), Math.sin(yawC)];
    const W2 = tr.HW[iC];
    const asphalt = plastic(0x2c2f36, { rough: 0.8 });
    for (const sd of [-1, 1]) {   // side streets leaving the crossing
      const cx = pc.x + rgt[0] * sd * (W2 + 40), cz = pc.z + rgt[1] * sd * (W2 + 40);
      b.box(cx, -0.04, cz, 22, 0.1, 72, 0, { rot: yawC + Math.PI / 2, mat: asphalt });
    }
    for (const along of [-17, 17]) for (let n = -9; n <= 9; n++) {   // stripes across the road
      const x = pc.x + fwd[0] * along + rgt[0] * n * 2.3, z = pc.z + fwd[1] * along + rgt[1] * n * 2.3;
      nb.box(x, pc.y + 0.03, z, 1.1, 0.06, 5, 0, { rot: yawC, mat: zebra });
    }
    for (const sd of [-1, 1]) for (let n = -3; n <= 3; n++) {        // stripes over the side streets
      const x = pc.x + rgt[0] * sd * (W2 + 7) + fwd[0] * n * 2.4, z = pc.z + rgt[1] * sd * (W2 + 7) + fwd[1] * n * 2.4;
      nb.box(x, pc.y + 0.03, z, 5, 0.06, 1.1, 0, { rot: yawC, mat: zebra });
    }
    for (const dg of [0.62, -0.62]) for (let n = -6; n <= 6; n++) {   // the famous diagonals
      const x = pc.x + (fwd[0] * Math.cos(dg) + rgt[0] * Math.sin(dg)) * n * 2.4, z = pc.z + (fwd[1] * Math.cos(dg) + rgt[1] * Math.sin(dg)) * n * 2.4;
      if (Math.abs(n) < 2) continue;
      nb.box(x, pc.y + 0.035, z, 4.4, 0.06, 1.0, 0, { rot: yawC + dg, mat: zebra });
    }
    // Prison Realm (the cube that sealed Gojo) splitting the crossing
    { const x = pc.x, z = pc.z;
      b.box(x, 0, z, 6.5, 1, 6.5, C.dkgray, { rot: yawC });
      const pr = new BrickBuilder(1); pr.brick(0, 0, 0, 4, 4, 9, 0x6a6a74, { pitch: 1.2 });
      for (const [fx, fz, ry] of [[0, 2.45, 0], [0, -2.45, Math.PI], [2.45, 0, Math.PI / 2], [-2.45, 0, -Math.PI / 2]]) for (const [ex, ey] of [[-0.8, 3], [0.8, 3], [0, 1.7], [-0.9, 1.2], [0.9, 1.4]]) {
        pr.boxM(mat4(fx + Math.cos(ry) * ex, ey, fz - Math.sin(ry) * ex, 0, ry, 0, 0.9, 0.5, 0.1), C.white);
        pr.boxM(mat4(fx * 1.02 + Math.cos(ry) * ex, ey, fz * 1.02 - Math.sin(ry) * ex, 0, ry, 0, 0.35, 0.4, 0.1), 0x9a2aff, { matOpts: { emissive: 0x9a2aff, emissiveIntensity: 2 } });
      }
      const prg = pr.build({ name: 'prison-realm' }); const hold = new THREE.Group(); hold.add(prg); hold.position.set(x, 1, z); ctx.group.add(hold);
      hold.add(P.glow(0x9a4aff, 14, 0.5)).children[1].position.y = 3;
      ctx.anim((dt, t) => { prg.rotation.y = t * 0.6; prg.position.y = 0.4 + Math.sin(t * 1.8) * 0.4; });
      ctx.obstacle(x, z, 3.6, 7); }
    // street lamps and neon lamp posts along Shibuya streets
    edges(ctx, 7.2, 12.6, 22, 1.5, (p) => lamp(b, p.x, p.y, p.z, 0xff9ae0));
    // the Veil over Shibuya: a dark translucent dome
    arch(ctx, 8.15, { cols: [C.black, C.magenta], text: 'SHIBUYA', bg: '#1a0a20', fg: '#ff4aa0' });

    // ---- subway ---------------------------------------------------------------------------------
    tunnel(ctx, 12.8, 14.25, { wall: C.white, roof: 0x3a3e46, height: 9, lights: 0xe0f0ff });
    each(tr, 12.8, 14.25, 6, (i) => { const p = tr.at(i, 0, 0); b.box(p.x, 11, p.z, 2 * (edgeLat(i) + 10), 7, 6.5, 0x4a4e58, { rot: tr.yawAt(i) }); });
    each(tr, 12.85, 14.2, 9, (i) => { for (const sd of [-1, 1]) { const q = tr.at(i, sd * (edgeLat(i) + 0.15), 0); nb.box(q.x, q.y + 0.9, q.z, 0.3, 0.9, 5, 0xf2cd37, { rot: tr.yawAt(i), matOpts: { emissive: 0xc8a020, emissiveIntensity: 0.8 } }); } });
    { const i = K(12.8), p = tr.at(i, 0, 0), yaw = tr.yawAt(i); sign(nb, 25, p.x - Math.sin(yaw) * 3.6, p.y + 14, p.z - Math.cos(yaw) * 3.6, 16, yaw + Math.PI); sign(nb, 23, p.x - Math.sin(yaw) * 3.6 + Math.cos(yaw) * 15, p.y + 15, p.z - Math.cos(yaw) * 3.6 - Math.sin(yaw) * 15, 8, yaw + Math.PI); }

    // ---- expressway ----------------------------------------------------------------------------------
    each(tr, 14.7, 18.0, 16, (i) => { for (const sd of [-1, 1]) { const q = tr.at(i, sd * (edgeLat(i) + 0.4), 0); b.cyl(q.x, q.y + 1.2, q.z, 0.2, 7, C.ltgray, { seg: 6 }); b.box(q.x - Math.cos(tr.yawAt(i)) * sd * 1.2, q.y + 8, q.z + Math.sin(tr.yawAt(i)) * sd * 1.2, 2.6, 0.4, 0.8, 0xe8f4ff, { rot: tr.yawAt(i), matOpts: { emissive: 0xd8ecff, emissiveIntensity: 1.5 } }); } });
    { const i = K(15.3), p = tr.at(i, 0, 0), yaw = tr.yawAt(i), sp = edgeLat(i) + 1;
      for (const sd of [-1, 1]) { const q = tr.at(i, sd * sp, 0); b.box(q.x, q.y, q.z, 0.8, 11, 0.8, C.dkgray); }
      b.box(p.x, p.y + 11, p.z, sp * 2 + 1, 0.8, 0.8, C.dkgray, { rot: yaw });
      sign(nb, 26, p.x, p.y + 13.5, p.z, 14, yaw + Math.PI); sign(nb, 27, p.x + Math.cos(yaw) * 9, p.y + 13, p.z - Math.sin(yaw) * 9, 7, yaw + Math.PI); }
    arch(ctx, 17.55, { cols: [C.black, C.red], text: 'DOMAIN EXPANSION', bg: '#2a0000', fg: '#ff3a3a' });

    // ---- Malevolent Shrine ---------------------------------------------------------------------------
    { const [x, z] = SHRINE, rot = Math.atan2(73, -112);
      const ca = Math.cos(rot), sa = Math.sin(rot), L = (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca];
      b.box(x, -2, z, 52, 3, 40, 0x2a1414, { rot });
      const WOOD = 0x3a0a0e, ROOF = 0x140a0c;
      for (let n = -2; n <= 2; n++) for (const r of [-1, 1]) { const [px, pz] = L(n * 9, r * 12); b.box(px, 1, pz, 2, 20, 2, WOOD, { rot }); }
      b.box(x, 1, z, 36, 14, 18, 0x2a0a0c, { rot });
      let y = 21;
      for (let t = 0; t < 2; t++) {
        const w = 50 - t * 14, d = 34 - t * 10;
        for (const sd of [-1, 1]) { const [px, pz] = L(0, sd * d * 0.28); b.boxM(mat4(px, y + d * 0.14, pz, sd * 0.55, rot, 0, w, 1.2, d * 0.66), ROOF, { matOpts: { rough: 0.9 } }); }
        b.box(x, y + d * 0.3, z, w - 4, 1.6, 2, ROOF, { rot });
        if (t === 0) { for (const sd of [-1, 1]) { const [px, pz] = L(sd * 12, 0); b.box(px, y - 1, pz, 2, 8, 2, WOOD, { rot }); } b.box(x, y, z, 28, 7, 14, WOOD, { rot }); }
        y += 10;
      }
      // the mouth: fanged jaws on the front of the shrine
      const [mx, mz] = L(0, 10.5);
      b.box(mx, 6, mz, 26, 8, 1, 0x6a0008, { rot, matOpts: { emissive: 0x6a0008, emissiveIntensity: 1.2 } });
      for (let n = -5; n <= 5; n++) { const [tx, tz] = L(n * 2.2, 11.2); P.spike(b, tx, 14, tz, 0.8, 3, Math.PI, 0, C.white); P.spike(b, tx, 2, tz, 0.8, 3, 0, 0, C.white); }
      for (const sd of [-1, 1]) { const [hx, hz] = L(sd * 20, 0); P.spike(b, hx, 37, hz, 1.4, 12, 0, sd * 0.5, 0xf2eee4, rot); }
      // skulls and bones around the shrine
      for (let n = 0; n < 60; n++) {
        const a = rand() * 6.28, r = 28 + rand() * 60, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (tr.clearance(px, pz, 20) < 6) continue;
        const s = 0.8 + rand() * 1.6, hy = -1.8 + rand() * 1;
        if (rand() < 0.6) { b.sphere(px, hy + s, pz, s, 0xefe6d2); b.box(px, hy + 0.2 * s, pz + 0.3 * s, s * 1.1, s * 0.6, s * 1.2, 0xefe6d2); for (const e of [-1, 1]) b.sphere(px + e * 0.4 * s, hy + s * 1.05, pz + s * 0.85, s * 0.25, 0x1b0a0a); }
        else rbox(b, px, hy + 0.5, pz, s * 5, s * 0.5, s * 0.5, 0, rand() * 3, 0.3, 0xefe6d2);
      }
      for (let n = 0; n < 8; n++) { const a = n / 8 * 6.28, px = x + Math.cos(a) * 30, pz = z + Math.sin(a) * 24; if (tr.clearance(px, pz, 12) < 4) continue; b.box(px, -2, pz, 1.4, 14, 1.4, WOOD); b.sphere(px, 13, pz, 1.6, 0xefe6d2); P.spike(b, px + 1.4, 13.5, pz, 0.4, 2.4, 0, -1.2, 0xefe6d2); P.spike(b, px - 1.4, 13.5, pz, 0.4, 2.4, 0, 1.2, 0xefe6d2); }
      pl(0xff2030, x + 30 * sa, 18, z + 30 * ca, 6, 190);
      motes(ctx, x, -1, z, 70, 40, 180, 0xff3040, 1.2);
      ctx.claim(x, z, 50);
      // Sukuna, King of Curses, in front of his shrine
      const [sx, sz] = L(0, 16);
      const sk = P.sukuna(6); sk.root.position.set(sx, 1, sz); sk.root.rotation.y = rot; ctx.group.add(sk.root);
      sk.armR.rotation.set(-0.3, 0, -1.2); sk.armL.rotation.set(-0.3, 0, 1.2);
      ctx.anim((dt, t) => {
        const s1 = Math.sin(t * 1.3), s2 = Math.sin(t * 1.3 + 1.6);
        sk.armR.rotation.z = -0.9 - 0.7 * Math.max(0, s1); sk.armR.rotation.x = -0.6 + s1 * 0.8;
        sk.armL.rotation.z = 0.9 + 0.7 * Math.max(0, s2); sk.armL.rotation.x = -0.6 + s2 * 0.8;
        sk.lowR.rotation.x = -1.2 + Math.sin(t * 0.7) * 0.05; sk.lowL.rotation.x = -1.2 + Math.sin(t * 0.7) * 0.05;
        sk.lowR.rotation.z = -0.35; sk.lowL.rotation.z = 0.35;
        sk.root.position.y = 1 + Math.sin(t * 0.9) * 0.3;
      });
    }
    // Mahoraga at the landing, the Dharma wheel clunks round every few seconds
    { const p = spot(21.3, -38, 8); const mh = add(P.mahoraga(4.2), p, 21.3);
      mh.armR.rotation.x = -0.4;
      ctx.anim((dt, t) => { const s = Math.floor(t / 3), f = Math.min(1, (t % 3) / 0.4); mh.wheel.rotation.z = (s + f * f * (3 - 2 * f)) * Math.PI / 4; mh.armL.rotation.x = Math.sin(t * 0.8) * 0.2; }); }
    // Sukuna's slashes on the domain road
    [[21.6, -0.45, 0.35], [21.85, 0.45, -0.4], [22.1, -0.3, -0.3], [22.35, 0.4, 0.35], [22.6, -0.4, 0.5]].forEach(([k, l, ang], n) => {
      const i = K(k); ctx.hazard(dismantle(ctx, { k, lat: l * tr.HW[i], len: tr.HW[i] * 1.05, ang, period: 2.9, offset: n * 0.62 }));
    });
    edges(ctx, 20.2, 22.7, 10, 2, (p, i) => { if (rand() < 0.7) { const s = 0.7 + rand() * 0.6; b.sphere(p.x, s, p.z, s, 0xefe6d2); b.sphere(p.x + 0.3 * s, s * 1.05, p.z + 0.3 * s, 0.22 * s, 0x1b0a0a); } else { b.box(p.x, 0, p.z, 0.6, 6, 0.6, 0x3a0a0e); b.sphere(p.x, 6.3, p.z, 0.7, 0xff3030, { matOpts: { emissive: 0xff1020, emissiveIntensity: 2 } }); } });

    // ---- Jogo's volcano -------------------------------------------------------------------------------
    { const [vx, vz] = VOLC; let y = -0.1;
      for (let k = 0; k < 13; k++) y = b.cyl(vx + Math.sin(k) * 1.2, y, vz + Math.cos(k) * 1.2, 62 - k * 4.4, 3.3, k % 3 === 2 ? 0x2a1a14 : k % 2 ? 0x4a3a30 : 0x3a2a24, { seg: 24 });
      b.cyl(vx, y - 0.2, vz, 7, 0.4, 0xff6a00, { seg: 20, matOpts: { emissive: 0xff5000, emissiveIntensity: 2.4 } });
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + 0.3; rbox(b, vx + Math.cos(a) * 30, y * 0.5, vz + Math.sin(a) * 30, 2.6, y * 1.02, 1, -Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62, 0xff5a00, { matOpts: { emissive: 0xff4a00, emissiveIntensity: 1.8 } }); }
      ctx.claim(vx, vz, 64);
      pl(0xff5a1a, vx, y + 12, vz, 7, 280);
      const vTop = new THREE.Vector3(vx, y + 1, vz);
      ctx.anim(() => { const fx = fxOf(ctx); if (fx && Math.random() < 0.7) fx.spark(vTop.x + (Math.random() - 0.5) * 8, vTop.y, vTop.z + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, 14 + Math.random() * 14, (Math.random() - 0.5) * 6, Math.random() < 0.5 ? 0xff5a10 : 0xffc040, 1.4, 12); });
      const smoke = new THREE.InstancedMesh(brickGeometry(2, 2, 3, 2, true, 8), new THREE.MeshStandardMaterial({ color: 0x2a2226, roughness: 1, transparent: true, opacity: 0.7 }), 30);
      scene.add(smoke);
      const sm = [...Array(30)].map((_, k) => ({ t: k / 30 * 8, a: rand() * 6.28 }));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e = new THREE.Euler();
      ctx.anim((dt) => { sm.forEach((s, k) => { s.t += dt; if (s.t > 8) { s.t = 0; s.a = rand() * 6.28; } const f = s.t / 8; p3.set(vx + Math.cos(s.a) * f * 18, y + f * 70, vz + Math.sin(s.a) * f * 18 + f * 20); s3.setScalar(1 + f * 3); q.setFromEuler(e.set(f * 2, s.a, f)); m4.compose(p3, q, s3); smoke.setMatrixAt(k, m4); }); smoke.instanceMatrix.needsUpdate = true; });
    }
    // Jogo himself beside the road, head erupting as he throws meteors
    const JS = 5.6, jp = spot(23.45, 34, 10);
    const jg = add(P.jogo(JS), jp, 23.45);
    const headTop = new THREE.Vector3(jp.x, jg.top + 0.9 * JS, jp.z);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 10).translate(0, 3.5, 0), P.neon(0xff6a10, 2.8));
    flame.position.set(0, jg.top + 0.9 * JS, 0); jg.root.add(flame);
    const fglow = P.glow(0xff7a20, 22, 0.9); fglow.position.copy(flame.position); fglow.position.y += 3; jg.root.add(fglow);
    ctx.anim((dt, t) => {
      const e = Math.max(0, Math.sin(t * 2.4));
      flame.scale.set(0.6 + e * 0.8, 0.3 + e * 1.6 + Math.sin(t * 17) * 0.1, 0.6 + e * 0.8);
      fglow.scale.setScalar(12 + e * 16);
      jg.armR.rotation.x = -1.6 * e; jg.armL.rotation.x = -0.4 + Math.sin(t * 1.2) * 0.2;
      const fx = fxOf(ctx); if (fx && e > 0.6) fx.spark(headTop.x, headTop.y + 2, headTop.z, (Math.random() - 0.5) * 8, 10 + Math.random() * 10, (Math.random() - 0.5) * 8, 0xff6a10, 1, 14);
    });
    const jTargets = [[22.95, 0], [23.2, -0.3], [23.45, 0.3], [23.7, 0], [23.9, -0.3]];
    ctx.hazard(meteors(ctx, { from: headTop, targets: jTargets, period: 2.5 }));
    ctx.hazard(meteors(ctx, { from: headTop, targets: jTargets, period: 3.1, offset: 1.2 }));
    motes(ctx, jp.x, 0, jp.z, 30, 25, 120, 0xff7a20, 1.3);
    arch(ctx, 22.5, { cols: [C.black, C.orange], text: 'COFFIN OF THE IRON MOUNTAIN', bg: '#3a1000', fg: '#ffb040' });
    edges(ctx, 22.85, 23.9, 14, 3, (p) => { if (rand() < 0.7) rock(b, p.x, 0, p.z, 1.2, rand, [0x2a1a14, 0x3a2a24, C.dkgray]); });

    // ---- Unlimited Void ------------------------------------------------------------------------------
    arch(ctx, 24.02, { cols: [C.white, C.azure], text: 'UNLIMITED VOID', bg: '#0a0830', fg: '#9ad8ff' });
    { // the bright ring of the Void, far beyond the straight
      const ring = new THREE.Mesh(new THREE.TorusGeometry(120, 4, 10, 72), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, fog: false }));
      ring.position.set(VOIDC[0] + 60, 115, VOIDC[1] + 480); ring.rotation.y = 0.1; scene.add(ring);
      const eclipse = new THREE.Mesh(new THREE.CircleGeometry(115, 48), new THREE.MeshBasicMaterial({ color: 0x03020a, fog: false }));
      eclipse.position.copy(ring.position); eclipse.position.z += 1; eclipse.rotation.y = Math.PI + 0.1; scene.add(eclipse);
      const halo = P.glow(0xa8d8ff, 480, 0.55); halo.position.copy(ring.position); halo.position.z += 4; scene.add(halo);
      ctx.anim((dt, t) => { halo.material.opacity = 0.45 + Math.sin(t * 1.3) * 0.1; });
    }
    motes(ctx, VOIDC[0], 0, VOIDC[1], 150, 40, 360, 0x9ad8ff, 1.0, 0.6);
    // Gojo floating over the Void, orbs of Red and Blue in his hands
    const gp = spot(24.85, -34, 6);
    const gj = add(P.gojo(3.2, true), gp, 24.85, 7);
    gj.armR.rotation.set(-1.2, 0, -0.5); gj.armL.rotation.set(-1.2, 0, 0.5);
    const gRed = new THREE.Group(); gRed.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), P.neon(0xff2a3a, 2.5)), P.glow(0xff3a4a, 7));
    const gBlue = new THREE.Group(); gBlue.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), P.neon(0x3ab8ff, 2.5)), P.glow(0x5ac8ff, 7));
    gRed.position.set(-2.4, 5.2, 4.4); gBlue.position.set(2.4, 5.2, 4.4); gj.root.add(gRed, gBlue);
    const aura = P.glow(0x7ad8ff, 30, 0.35); aura.position.y = 7; gj.root.add(aura);
    ctx.anim((dt, t) => { gj.root.position.y = 7 + Math.sin(t * 1.1) * 0.8; aura.material.opacity = 0.25 + 0.12 * Math.sin(t * 3); gRed.position.y = gBlue.position.y = 5.2 + Math.sin(t * 4) * 0.3; });
    pl(0x9a6aff, gp.x, 16, gp.z, 5, 170);
    // Hollow Purple shots from beside Gojo across the road
    for (const [k, off] of [[24.55, 0], [25.15, 3.5]]) {
      const i = K(k);
      const from = tr.at(i, -(edgeLat(i) + 8), 5); from.y = 5;
      const to = tr.at(i, edgeLat(i) + 26, 3); to.y = 3;
      ctx.hazard(hollowPurple(ctx, { from, to, period: 7, offset: off }));
    }
    edges(ctx, 24.1, 26.2, 12, 4, (p, i) => { if (rand() < 0.7) { const h = 3 + rand() * 6; nb.box(p.x, h, p.z, 0.4, 0.4 + rand() * 2, 0.4, 0xbfe8ff, { matOpts: { emissive: 0x9ad8ff, emissiveIntensity: 1.8 } }); } });

    // ---- characters -------------------------------------------------------------------------------------
    // Yuji throwing Black Flash in the school yard
    { const p = spot(0.95, -30, 6); const yj = add(P.yuji(3.6), p, 0.95);
      const bolts = new BrickBuilder(1);
      for (let n = 0; n < 7; n++) { const a = n * 0.9; P.rbox(bolts, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0, 3.2, 0.25, 0.25, 0, 0, a + 0.6, 0xff1020, { matOpts: { emissive: 0xff1020, emissiveIntensity: 3 } }); P.rbox(bolts, Math.cos(a) * 3.6, Math.sin(a) * 3.6, 0, 1.6, 0.35, 0.35, 0, 0, a - 0.8, 0x1b0a0a); }
      const flash = bolts.build({ name: 'black-flash' }); const fl = new THREE.Group(); fl.add(flash, P.glow(0xff2030, 16, 1)); fl.position.set(-0.6 * 3.6, 9.2, 6.2); fl.visible = false; yj.root.add(fl);
      let fired = false;
      ctx.anim((dt, t) => {
        const ph = (t % 3.2) / 3.2;
        const punch = ph < 0.55 ? -0.3 + ph * 0.6 : ph < 0.62 ? -0.0 - (ph - 0.55) / 0.07 * 1.55 : ph < 0.8 ? -1.55 : -1.55 + (ph - 0.8) / 0.2 * 1.25;
        yj.armR.rotation.x = punch; yj.armL.rotation.x = -0.4 - Math.max(0, -punch) * 0.2;
        const on = ph > 0.61 && ph < 0.74; fl.visible = on; if (on) { flash.rotation.z = t * 20; fl.scale.setScalar(0.6 + (ph - 0.61) * 8); }
        if (on && !fired) { fired = true; const fx = fxOf(ctx); if (fx) { V2.copy(fl.position).applyMatrix4(yj.root.matrixWorld); for (let n = 0; n < 24; n++) { const a = Math.random() * 6.28, bb = Math.random() * 3; fx.spark(V2.x, V2.y, V2.z, Math.cos(a) * Math.sin(bb) * 14, Math.cos(bb) * 14, Math.sin(a) * Math.sin(bb) * 14, n % 2 ? 0xff1020 : 0x400008, 0.5); } } }
        if (!on) fired = false;
      }); }
    // Megumi with his Divine Dogs, Nue circling above the yard
    { const p = spot(1.3, 30, 7); const mg = add(P.megumi(3.4), p, 1.3); mg.armR.rotation.set(-1.3, 0, 0.35); mg.armL.rotation.set(-1.3, 0, -0.35);
      for (const [dx, col] of [[-7, C.white], [7, 0x15161c]]) { const d = P.divineDog(col, 1.8); const h = new THREE.Group(); h.add(d); h.position.set(dx, 0, 3); mg.root.add(h); }
      motes(ctx, p.x, 0, p.z, 10, 14, 60, 0x2a2aff, 1.2);
      const nu = P.nue(1.6); ctx.group.add(nu);
      ctx.anim((dt, t) => { const a = t * 0.35; nu.position.set(276 + Math.cos(a) * 55, 32 + Math.sin(t * 0.7) * 4, 110 + Math.sin(a) * 80); nu.rotation.y = -a + Math.PI; const fl = Math.sin(t * 5) * 0.5; nu.userData.wings[0].rotation.z = fl; nu.userData.wings[1].rotation.z = -fl; mg.armR.rotation.z = 0.35 + Math.sin(t * 2) * 0.05; }); }
    // Nobara swinging her hammer, nails glowing
    { const p = spot(0.55, 30, 6); const nbf = add(P.nobara(3.4), p, 0.55);
      const nails = new BrickBuilder(1); for (let n = 0; n < 4; n++) { P.rbox(nails, (n - 1.5) * 1.3, 0, 0, 0.18, 2.2, 0.18, 0, 0, 0.3, 0x9ad8ff, { matOpts: { emissive: 0x6ab8ff, emissiveIntensity: 2.4 } }); nails.box((n - 1.5) * 1.3 + 0.3, 1.0, 0, 0.6, 0.2, 0.6, 0x9ad8ff, { matOpts: { emissive: 0x6ab8ff, emissiveIntensity: 2.4 } }); }
      const ng = nails.build({ name: 'nails' }); ng.position.set(4, 9, 4); nbf.root.add(ng);
      ctx.anim((dt, t) => { const ph = (t % 2) / 2; nbf.armR.rotation.x = ph < 0.7 ? -2.8 + ph * 0.6 : -2.4 + (ph - 0.7) / 0.3 * 2.6; ng.position.y = 9 + Math.sin(t * 2) * 0.6; ng.rotation.y = t * 0.8; }); }
    // Panda waving and Maki spinning her polearm
    { const p = spot(0.15, -30, 7); const pd = P.panda(3.2); pd.root.position.set(p.x, 0, p.z); faceRoad(pd.root, 0.15); ctx.group.add(pd.root); ctx.anim((dt, t) => { pd.armL.rotation.z = 2.4 + Math.sin(t * 5) * 0.4; }); }
    { const p = spot(27.6, -30, 6); const mk = add(P.maki(3.4), p, 27.6); mk.armR.rotation.x = -1.4; ctx.anim((dt, t) => { mk.armR.rotation.y = t * 3; }); }
    // blindfolded Gojo statue guarding the school gate
    { const p = spot(26.95, 30, 7); const g2 = add(P.gojo(4.2), p, 26.95); g2.armR.rotation.set(0.2, 0, 0.1); g2.armL.rotation.set(-1.4, 0, -0.3); const o = new THREE.Group(); o.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 10), P.neon(0x3ab8ff, 2.5)), P.glow(0x5ac8ff, 9)); o.position.set(0.56 * 4.2 + 0.5, 2.64 * 4.2, 1.52 * 4.2); g2.root.add(o); ctx.anim((dt, t) => { o.position.y = 11.1 + Math.sin(t * 2.4) * 0.4; }); }
    // Todo clapping (Boogie Woogie) at the end of the bridge
    { const p = spot(6.75, 28, 7); const td = add(P.todo(3.8), p, 6.75); let clapped = false;
      ctx.anim((dt, t) => { const ph = (t % 1.6) / 1.6, c = ph < 0.2 ? Math.sin(ph / 0.2 * Math.PI) : 0; td.armR.rotation.set(-1.3, 0, 0.9 - c * 0.9 - 0.1); td.armL.rotation.set(-1.3, 0, -0.9 + c * 0.9 + 0.1); if (c > 0.95 && !clapped) { clapped = true; const fx = fxOf(ctx); if (fx) fx.pop(V2.set(p.x, 12, p.z), 0x6ad8ff); } if (c < 0.5) clapped = false; }); }
    // Nanami at the station
    { const p = spot(11.9, -30, 6); const nn = add(P.nanami(3.4), p, 11.9); nn.armR.rotation.x = -0.9; ctx.anim((dt, t) => { nn.armR.rotation.x = -0.9 + Math.sin(t * 0.8) * 0.3; }); }
    // Mahito at the crossing: arms spread, transfiguring
    { const p = spot(9.35, 36, 9); const mh = add(P.mahito(6), p, 9.35);
      ctx.anim((dt, t) => { mh.armR.rotation.z = -1.2 - Math.sin(t * 1.5) * 0.4; mh.armL.rotation.z = 1.2 + Math.sin(t * 1.5 + 1) * 0.4; mh.armR.rotation.x = mh.armL.rotation.x = -0.4; mh.body.rotation.z = Math.sin(t * 0.9) * 0.05; });
      motes(ctx, p.x, 0, p.z, 16, 26, 90, 0x8aa0ff, 1.1);
      for (let n = 0; n < 5; n++) { const tf = P.transfigured(n); const a = n * 1.3; tf.position.set(p.x + Math.cos(a) * 10, 0, p.z + Math.sin(a) * 10); tf.rotation.y = rand() * 6; ctx.group.add(tf); } }
    // Geto (Kenjaku) at the subway entrance with a vortex of cursed spirits
    { const p = spot(12.55, 28, 7); const gt = add(P.geto(3.6), p, 12.55); gt.armR.rotation.set(-1.2, 0, 0.3);
      const vort = new THREE.Group(); vort.position.set(p.x, 0, p.z); ctx.group.add(vort);
      const cb = new BrickBuilder(1); for (let n = 0; n < 9; n++) { const a = n / 9 * 6.28, r = 7 + (n % 3) * 2, y = 6 + n * 1.3; cb.sphere(Math.cos(a) * r, y, Math.sin(a) * r, 1 + (n % 3) * 0.4, [0x3a1a4a, 0x1a3a2a, 0x4a1a1a][n % 3]); cb.sphere(Math.cos(a) * r * 1.08, y + 0.3, Math.sin(a) * r * 1.08, 0.35, 0xffe040, { matOpts: { emissive: 0xffd020, emissiveIntensity: 2 } }); }
      vort.add(cb.build({ name: 'curse-vortex' }));
      ctx.anim((dt, t) => { vort.rotation.y = t * 0.9; gt.armR.rotation.y = Math.sin(t) * 0.3; });
      motes(ctx, p.x, 0, p.z, 12, 22, 80, 0x7a3aff, 1.2); }
    // Yuta and Rika looming over the expressway; Rika's arms slam down onto the road
    { const RS = 6.5, iR = K(16.45), rp = tr.at(iR, edgeLat(iR) + 15, 0); rp.y = 0;
      const ry = P.rika(RS); ry.root.position.copy(rp); faceRoad(ry.root, 16.45); ctx.group.add(ry.root);
      ry.armL.visible = ry.armR.visible = false;
      ry.root.updateMatrixWorld(true);
      [[1, -5, 0], [-1, 4, 2.2]].forEach(([sd, lat, off]) => {
        const S = new THREE.Vector3(sd * 1.9 * RS, 3.4 * RS, 0).applyMatrix4(ry.root.matrixWorld);
        let bi = iR, bd = 1e9; for (let o = -40; o <= 40; o++) { const j = tr.wrap(iR + o), d = Math.hypot(tr.px(j) - S.x, tr.pz(j) - S.z); if (d < bd) { bd = d; bi = j; } }
        ctx.hazard(rikaSlam(ctx, { S, T: tr.at(bi, lat, 0.1), period: 4.4, offset: off }));
      });
      motes(ctx, rp.x, 0, rp.z, 24, 44, 90, 0xe0d8ff, 1.4);
      const yp = spot(15.6, 28, 5); const yt = add(P.yuta(3.2), yp, 15.6); yt.armR.rotation.x = -1.0;
      ctx.anim((dt, t) => { yt.armR.rotation.x = -1.0 + Math.sin(t * 1.4) * 0.3; }); }

    // ---- moving hazards: transfigured humans at the crossing, Divine Dogs in the torii forest -------
    for (const [k, sp, off] of [[8.75, 3.2, 0], [9.25, 2.8, 0.6], [9.42, 2.4, 0.2]]) {
      const hold = new THREE.Group(); const tf = P.transfigured(Math.floor(k * 10)); hold.add(tf);
      ctx.hazard(crossing(ctx, { mesh: hold, k, speed: sp, radius: 1.9, kind: 'spin', offset: off, span: 1.0 }));
      const ph = rand() * 6; ctx.anim((dt, t) => { tf.rotation.z = Math.sin(t * 3 + ph) * 0.18; tf.rotation.x = Math.sin(t * 2.3 + ph) * 0.1; });
    }
    for (const [k, col, off] of [[2.85, C.white, 0], [3.25, 0x15161c, 0.5]]) {
      const hold = new THREE.Group(); hold.add(P.divineDog(col, 1.2));
      ctx.hazard(crossing(ctx, { mesh: hold, k, speed: 6, radius: 1.4, kind: 'bump', offset: off, span: 1.05 }));
    }

    // ---- distant Tokyo skyline and Tokyo Tower ---------------------------------------------------
    { const win = plastic(0xffe0a0, { emissive: 0xffc860, emissiveIntensity: 1.1 }), red = plastic(0xff3020, { emissive: 0xff2010, emissiveIntensity: 2 });
      for (let a = 0; a < Math.PI * 2; a += 0.028) {
        const r = 760 + rand() * 200, x = Math.cos(a) * r, z = -40 + Math.sin(a) * r;
        if (!hole.test(x, z) || Math.hypot(x - VOIDC[0] - 60, z - VOIDC[1] - 480) < 150) continue;
        const w = 20 + rand() * 34, h = 40 + rand() * rand() * 220, rot = -a;
        nb.box(x, 0, z, w, h, w * 0.8, rand() < 0.5 ? 0x1c1e2c : 0x262838, { rot });
        const fx = -Math.cos(a), fz = -Math.sin(a);
        for (let yy = 6; yy < h - 6; yy += 7) if (rand() < 0.6) nb.box(x + fx * w * 0.42, yy, z + fz * w * 0.42, w * (0.3 + rand() * 0.6), 2, 1, 0, { rot: rot + Math.PI / 2, mat: win });
        if (h > 140) nb.sphere(x, h + 2, z, 2, 0, { mat: red });
      }
      const tx = 640, tz = -760; let y = 0;
      for (let n = 0; n < 12; n++) { const w = 26 - n * 2; y = nb.box(tx, y, tz, w, 11, w, n % 2 ? C.white : 0xe04a1a, { matOpts: n % 3 === 0 ? { emissive: 0xff6a20, emissiveIntensity: 0.5 } : undefined }); if (n === 5 || n === 9) nb.box(tx, y - 3, tz, w + 6, 3, w + 6, C.white); }
      nb.cyl(tx, y, tz, 1.2, 30, C.white, { seg: 6 }); nb.sphere(tx, y + 31, tz, 1.5, 0, { mat: red });
    }

    // ---- light & atmosphere -------------------------------------------------------------------------
    pl(0xff4aa0, pc.x, 16, pc.z, 4, 150);
    pl(0xffc070, 267, 18, 147, 3, 160);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: 0xfff4d8, fog: false }));
    moon.position.set(500, 420, -900); moon.lookAt(0, 0, 0); scene.add(moon);
    const mglow = P.glow(0xd8e0ff, 260, 0.5); mglow.position.copy(moon.position); scene.add(mglow);
  },
};

const GOLDC = 0xdcbc81;
function rbox(b, x, y, z, sx, sy, sz, rx, ry, rz, color, opts) { b.boxM(mat4(x, y, z, rx, ry, rz, sx, sy, sz), color, opts); }
