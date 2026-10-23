// Naoya-style kit — Projection Sorcery. 22 abilities on the technique tree;
// four are equipped (RMB takes a basic one) plus F.
//   The 24fps rule: every technique moves you in fixed frames, and anything
//   you touch that can't keep up is frozen inside a flat frame "panel".
//   Speed stacks build with every hit and technique (faster movement, harder
//   techniques) and fade if you stop moving.
//   LMB         lightning-fast strikes; each hit adds a stack.
//   Projection  Projection Dash (start, RMB), Panel Jab, Afterimage, Frame Skip,
//               Zigzag Projection
//   Frames      Frame Freeze, Panel Shatter, 24-Frame Lock, Film Reel
//   Speed       Acceleration, Momentum, Supersonic Kick, Maximum Speed
//   Strikes     Blitz, Palm Barrage, Axe Kick, Frame Cutter, Mach Strike
//   Zenin       Zenin Pride, Projection Counter, Sonic Boom, Cursed Spirit Form
//   F           Domain: Time Cell Moon Palace — Projection Sorcery on every body
//               inside: whatever moves breaks apart in proportion to how far it
//               moved (attacking counts), freezing in 24fps panels; holding still
//               is the only defence. A full moon and a ring of 24 film frames.
import * as THREE from 'three/webgpu';
import { Kit, ability, passive } from './kit.js';
import { registerKit, registerSorcerer } from './index.js';
import { registerLook } from '../entities/models.js';
import { registerDomainEnv } from '../world/biomes.js';
import { B } from '../world/blocks.js';

const FRAME = 0xa8f0ff, GOLD = 0xffd870;
const FPS = 1 / 24;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

registerSorcerer('naoya', { name: 'Naoya', technique: 'Projection Sorcery', rarity: 'rare', title: 'Zenin Heir', desc: 'Frame-by-frame dashes freeze curses in panels while ever-growing speed stacks fuel blitz strikes and a Mach punch.', domain: 'Time Cell Moon Palace', color: '#a8f0ff' });

registerLook('naoya', {
  paint: { skinTone: 0xf0d0b4, hair: 0xe8c878, undercut: 0x2a2018, hairVolume: true, top: 0x16161c, kimono: true, sash: 0x5a5a64, sleeve: 0x16161c, pants: 0x4a4a54, shoes: 0x16161c, eye: 0x6a4a20, fringe: 2, hairSide: 3, hairBack: 4 },
  paintExtra: (S) => { S.px(10, 12, 0x2a1a10); S.px(13, 12, 0x2a1a10); }, // narrow, smug eyes
  hair: (m) => [
    { x: -1.8, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.4, rz: 0.3, material: m },
    { x: 1.8, y: 8, z: 1.5, w: 3, h: 2.5, d: 3, rx: 0.4, rz: -0.3, material: m },
    { x: 0, y: 8.5, z: -0.5, w: 5, h: 2.5, d: 5, rx: -0.3, material: m },
  ],
  hairColor: 0xe8c878, accent: FRAME, emit: 0.2,
  cape: { color: 0x16161c, length: 7, width: 8, segments: 3 },
  props(rig, K) {
    const gold = K.mat(GOLD, { metalness: 1, roughness: 0.25 });
    for (const s of [-1, 1]) { K.box(rig.head, 0.6, 0.6, 0.6, gold, s * 4.7, 3.4, 0.5); K.box(rig.head, 0.5, 0.5, 0.5, gold, s * 4.7, 4.6, 0.2); }
  },
});

registerDomainEnv('time_cell_moon_palace', {
  skyTop: 0x02030a, skyHorizon: 0x1a2a4a, fog: 0x060a18, fogDensity: 0.016, hemiSky: 0xb0c8ff, hemiGround: 0x0a0a14, hemiI: 1.0, sun: 0xe0ecff, sunI: 1.1,
  grade: { tint: [0.95, 1.0, 1.1], lift: [0.0, 0.0, 0.02], sat: 0.85, contrast: 1.2, vignette: 0.55 }, floor: B.tatami,
});

export const NAOYA_SKILLS = [
  { id: 'tempo', name: 'Tempo', icon: '🥁', desc: '+1 max speed stack per rank, and stacks last longer.', max: 3, branch: 'Speed', tier: 0 },
  { id: 'frames', name: 'Frame Lock', icon: '🖼️', desc: 'Panels hold curses longer.', max: 3, req: 'ab:frame_freeze', branch: 'Frames', tier: 2 },
  { id: 'dash', name: 'Projection', icon: '🎞️', desc: 'Projection Dash reaches further and hits harder.', max: 3, req: 'ab:dash', branch: 'Projection', tier: 1 },
  { id: 'blitz', name: 'Blitz', icon: '⚡', desc: 'More Blitz strikes.', max: 2, req: 'ab:blitz', branch: 'Strikes', tier: 2 },
  { id: 'mach', name: 'Sound Barrier', icon: '💨', desc: 'Mach Strike and Sonic Boom scale harder with stacks.', max: 3, req: 'tempo', branch: 'Speed', tier: 1 },
  { id: 'palace', name: 'Moon Palace', icon: '🌕', desc: 'Time Cell Moon Palace lasts 2s longer and moving bodies break harder.', max: 1, req: 'frames', branch: 'Frames', tier: 5 },
];

class NaoyaKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    const fast = { trail: FRAME, sparkColor: 0xe0faff, stagger: 0.25 };
    this.combo = [
      { ...fast, style: 'punch', dur: 0.22, windup: 0.25, strike: 0.45, dmg: 10, range: 2.5, arc: 1.1, lunge: 8, knock: 2.5, stop: 0.035, shake: 0.12, chainAt: 0.5 },
      { ...fast, style: 'punch', dur: 0.22, windup: 0.25, strike: 0.45, dmg: 10, range: 2.5, arc: 1.1, lunge: 8, knock: 2.5, stop: 0.035, shake: 0.12, chainAt: 0.5 },
      { ...fast, style: 'swingR', dur: 0.26, windup: 0.27, strike: 0.48, dmg: 12, range: 2.7, arc: 1.2, lunge: 8, knock: 3, stop: 0.04, shake: 0.14, chainAt: 0.5 },
      { ...fast, style: 'swingL', dur: 0.26, windup: 0.27, strike: 0.48, dmg: 12, range: 2.7, arc: 1.2, lunge: 8, knock: 3, stop: 0.04, shake: 0.14, chainAt: 0.5 },
      { ...fast, style: 'uppercut', dur: 0.4, windup: 0.3, strike: 0.5, dmg: 22, range: 2.8, arc: 1.0, lunge: 6, knock: 8, stop: 0.08, shake: 0.3, ring: true, ringColor: FRAME, stagger: 0.5 },
    ];
    this.branches = ['Projection', 'Frames', 'Speed', 'Strikes', 'Zenin'];
    this.stackPow = 0.05; this.decayMul = 1; this.frameMul = 1;
    this.library = {
      // ---- Projection
      dash: ability({ name: 'Projection Dash', icon: '🎞️', kind: 'basic', desc: 'A frame-by-frame dash that panels everything it passes.', cd: 1.4, ce: 0, branch: 'Projection', tier: 0, start: true, legacy: 'ranged', use: () => this.dash() }),
      panel_jab: ability({ name: 'Panel Jab', icon: '👉', kind: 'basic', desc: 'Two frames to reach the curse you aim at, one jab, and it is frozen in a panel.', cd: 1.1, ce: 0, branch: 'Projection', tier: 1, req: 'dash', use: () => this.panelJab() }),
      afterimage: ability({ name: 'Afterimage', icon: '👥', kind: 'defence', desc: 'For 3s you leave afterimages a frame behind: most hits strike the afterimage instead of you.', cd: 14, ce: 10, branch: 'Projection', tier: 2, req: 'panel_jab', use: () => this.afterimage() }),
      frame_skip: ability({ name: 'Frame Skip', icon: '⏭️', kind: 'movement', desc: 'Skip three frames ahead to the aim point; you cannot be hit in between.', cd: 4, ce: 4, branch: 'Projection', tier: 2, req: 'dash', use: () => this.frameSkip() }),
      zigzag: ability({ name: 'Zigzag Projection', icon: '〽️', kind: 'movement', desc: 'Three projected dashes in a zigzag, panelling and striking everything along the way.', cd: 7, ce: 10, branch: 'Projection', tier: 3, req: 'frame_skip', use: () => this.zigzag() }),
      // ---- Frames
      frame_freeze: ability({ name: 'Frame Freeze', icon: '🧊', kind: 'technique', desc: 'Every curse around you is caught out of step and frozen in a panel.', cd: 9, ce: 12, branch: 'Frames', tier: 1, use: () => this.frameFreeze() }),
      panel_shatter: ability({ name: 'Panel Shatter', icon: '💥', kind: 'technique', desc: 'Every panelled curse shatters with its frame — harder with more speed stacks.', cd: 8, ce: 14, branch: 'Frames', tier: 2, req: 'frame_freeze', use: () => this.panelShatter() }),
      frame_lock: ability({ name: '24-Frame Lock', icon: '🔒', kind: 'technique', desc: 'Lock one curse into 24 frames: it is struck once per frame, then the last frame breaks.', cd: 12, ce: 16, branch: 'Frames', tier: 3, req: 'panel_shatter', use: () => this.frameLock() }),
      film_reel: ability({ name: 'Film Reel', icon: '📽️', kind: 'technique', desc: '24 film frames circle you for 4s; any curse inside the reel is panelled and cut, frame after frame.', cd: 20, ce: 30, branch: 'Frames', tier: 4, req: 'frame_lock', use: () => this.filmReel() }),
      // ---- Speed
      accelerate: ability({ name: 'Acceleration', icon: '⏩', kind: 'buff', desc: 'Max stacks; for a few seconds every blow panels its target.', cd: 14, ce: 16, branch: 'Speed', tier: 1, legacy: 't2', use: () => this.accelerate() }),
      momentum: ability({ name: 'Momentum', icon: '🏃', kind: 'buff', desc: '+4 speed stacks, and none of them fade for 8s.', cd: 18, ce: 10, branch: 'Speed', tier: 2, req: 'accelerate', use: () => this.momentum() }),
      sonic_kick: ability({ name: 'Supersonic Kick', icon: '🦵', kind: 'technique', desc: 'Close in over three frames and kick a curse so fast it flies off and breaks whatever it hits.', cd: 8, ce: 12, branch: 'Speed', tier: 3, req: 'momentum', use: () => this.sonicKick() }),
      max_speed: ability({ name: 'Maximum Speed', icon: '🌪️', kind: 'technique', desc: 'For 3s you move at the limit of 24 frames: you strike every curse nearby, over and over, untouchable.', cd: 24, ce: 40, branch: 'Speed', tier: 4, req: 'sonic_kick', use: () => this.maxSpeed() }),
      // ---- Strikes
      blitz: ability({ name: 'Blitz', icon: '⚡', kind: 'technique', desc: 'Rapid-fire strikes that jump from curse to curse.', cd: 7, ce: 14, branch: 'Strikes', tier: 1, legacy: 't1', use: () => this.blitz() }),
      palm_rush: ability({ name: 'Palm Barrage', icon: '🖐️', kind: 'technique', desc: 'A palm strike on every other frame for half a second, then a final shove.', cd: 6, ce: 8, branch: 'Strikes', tier: 2, req: 'blitz', use: () => this.palmRush() }),
      axe_kick: ability({ name: 'Axe Kick', icon: '🪓', kind: 'technique', desc: 'Project up and come down heel-first on the aim point, panelling what you land on.', cd: 7, ce: 10, branch: 'Strikes', tier: 2, req: 'blitz', use: () => this.axeKick() }),
      frame_cutter: ability({ name: 'Frame Cutter', icon: '✂️', kind: 'technique', desc: 'Six frames down a straight line, a cut on each: everything on the line is panelled.', cd: 9, ce: 14, branch: 'Strikes', tier: 3, req: 'palm_rush', use: () => this.frameCutter() }),
      mach: ability({ name: 'Mach Strike', icon: '💨', kind: 'technique', desc: 'Spend every stack on one sound-barrier-breaking dash punch; panelled curses shatter.', cd: 15, ce: 30, branch: 'Strikes', tier: 3, legacy: 't3', req: 'blitz', use: () => this.mach() }),
      // ---- Zenin
      zenin_pride: ability({ name: 'Zenin Pride', icon: '👑', kind: 'buff', desc: 'The heir of the Zenin clan does not lose: +20% damage and +10% damage reduction for 8s.', cd: 20, ce: 12, branch: 'Zenin', tier: 1, use: () => this.zeninPride() }),
      counter: ability({ name: 'Projection Counter', icon: '🔁', kind: 'defence', desc: 'Stand ready for 1.2s: the first attack is read frame by frame — you slip behind the attacker and panel it.', cd: 10, ce: 8, branch: 'Zenin', tier: 2, req: 'zenin_pride', use: () => this.counter() }),
      sonic_boom: ability({ name: 'Sonic Boom', icon: '🔊', kind: 'basic', desc: 'Punch faster than sound: the shockwave flies on and hits everything in a line.', cd: 1.6, ce: 4, branch: 'Zenin', tier: 3, req: 'zenin_pride', use: () => this.sonicBoom() }),
      cursed_spirit: ability({ name: 'Cursed Spirit Form', icon: '👹', kind: 'buff', desc: 'Return as a vengeful cursed spirit for 12s: +4 max stacks, stacks never fade, every blow lets out a sonic boom and heals you.', cd: 40, ce: 35, branch: 'Zenin', tier: 4, req: 'counter', use: () => this.cursedSpirit() }),
    };
    this.passives = {
      projection_mastery: passive({ name: 'Projection Mastery', icon: '🎬', desc: 'Panels hold 30% longer.', branch: 'Projection', tier: 3, req: 'frame_skip', apply: (pl, k) => { k.frameMul *= 1.3; } }),
      fluid_frames: passive({ name: 'Fluid Frames', icon: '🌊', desc: 'Speed stacks fade half as fast.', branch: 'Speed', tier: 2, req: 'accelerate', apply: (pl, k) => { k.decayMul *= 0.5; } }),
      arrogance: passive({ name: 'Heir\'s Arrogance', icon: '😏', desc: 'Each speed stack adds 8% damage instead of 5%.', branch: 'Speed', tier: 3, req: 'momentum', apply: (pl, k) => { k.stackPow = 0.08; } }),
      spirit_body: passive({ name: 'Cursed Body', icon: '🩸', desc: '+25 max health and heal for 3% of the damage you deal.', branch: 'Zenin', tier: 3, req: 'zenin_pride', apply: (pl) => { pl.maxHp += 25; pl.hp += 25; pl.stats.lifesteal += 0.03; } }),
    };
    // Time Cell Moon Palace: Projection Sorcery applied to the cells of every
    // body inside. Anything that moves out of step with the 24 frames breaks
    // itself apart — damage is proportional to how far it moved (attacking
    // counts as moving), and each break freezes it in a flat 24fps panel.
    this.domain = {
      name: 'Time Cell Moon Palace', icon: '🌕', key: 'time_cell_moon_palace', type: 6, color: FRAME, sound: 'void', flash: 0xe0f4ff,
      look: { floor: 0x161a2c, seam: 0xa8f0ff, sparkle: 0xffffff, skyTop: 0x000004, skyHorizon: 0x1a2a4a, stars: 0.8, band: 0xd8e8ff },
      duration: 8 + r('palace') * 2, radius: 24,
      onStart: (g, d) => {
        for (const e of g.enemies) e.cellPos = e.pos.clone();
        this.stacks = this.maxStacks;
        this.buildPalace(g, d);
        g.toast?.('Every body inside now moves at 24 frames per second — moving breaks it');
      },
      onTick: (g, d, dt) => {
        this.stacks = this.maxStacks; this.stackT = 3;
        if (this.palace) { this.palace.userData.strip.rotation.y += dt * 0.08; }
        d.tick = (d.tick ?? 0) - dt;
        if (d.tick > 0) return;
        d.tick = 0.25;
        for (const e of g.enemies) {
          if (e.dead || e.isDummy || !g.domainSys.inside(e.pos)) { if (!e.dead) e.cellPos = null; continue; }
          let moved = e.cellPos ? Math.hypot(e.pos.x - e.cellPos.x, e.pos.z - e.cellPos.z) + Math.abs(e.pos.y - e.cellPos.y) : 0;
          e.cellPos = (e.cellPos ?? new THREE.Vector3()).copy(e.pos);
          if (e.state === 'windup' || e.state === 'recover') moved += 0.6;   // swinging is moving too
          if (moved < 0.05) continue;   // perfectly still: the cells hold
          const dmg = 2 + moved * (26 + r('palace') * 10) * (e.isBoss ? 0.6 : 1);
          g.combat.damageEnemy(e, dmg, this.p, { stagger: moved > 0.5 ? 0.35 : 0, ceGain: 0, unblockable: true, crit: false, color: '#a8f0ff' });
          // the body cracks along the frame lines
          g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.5), { count: 4 + Math.min(12, Math.round(moved * 6)), color: Math.random() < 0.5 ? FRAME : 0xffffff, speed: 3, life: 0.35, size: 0.1, drag: 3, shape: 1, intensity: 3 });
          if (moved > 0.3) this.panel(e, 0.25);
        }
      },
      onEnd: (g) => { for (const e of g.enemies) e.cellPos = null; this.clearPalace(); },
    };
    this.stacks = 0; this.stackT = 0; this.accelT = 0;
    this.panels = [];
    this.panelGeo = { face: new THREE.PlaneGeometry(1, 1), bar: new THREE.BoxGeometry(1, 0.05, 0.05), side: new THREE.BoxGeometry(0.05, 1, 0.05) };
    this.panelMats = { face: new THREE.MeshBasicNodeMaterial({ color: FRAME, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), edge: new THREE.MeshStandardNodeMaterial({ color: 0xffffff, emissive: FRAME, emissiveIntensity: 3 }) };
  }
  get maxStacks() { return 8 + this.rank('tempo') + (this.spiritT > 0 ? 4 : 0); }
  get speedMul() { return 1 + this.stacks * 0.05 + (this.accelT > 0 ? 0.25 : 0); }
  get power() { return 1 + this.stacks * this.stackPow; }
  dispose() { super.dispose(); for (const pn of this.panels) this.game.scene.remove(pn.mesh); this.panels = []; this.clearPalace(); }
  // Domain set-piece: a vast full moon over the palace and a ring of 24 film
  // frames (with sprocket holes) circling the arena.
  buildPalace(g, d) {
    this.clearPalace();
    const grp = new THREE.Group();
    const moonMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xfff6e0).multiplyScalar(2.2), fog: false });
    const haloMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xa8c8ff).multiplyScalar(0.8), transparent: true, opacity: 0.35, depthWrite: false, fog: false });
    const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 48), moonMat);
    const halo = new THREE.Mesh(new THREE.RingGeometry(9.2, 13, 48), haloMat);
    const mp = d.center.clone().add(new THREE.Vector3(0, 16, -34));
    for (const m of [moon, halo]) { m.position.copy(mp); m.lookAt(d.center.x, d.center.y + 2, d.center.z); grp.add(m); }
    halo.position.addScaledVector(tmp.subVectors(d.center, mp).normalize(), -0.2);
    // the film strip: 24 frames, one for each frame of a second
    const strip = new THREE.Group(); strip.position.copy(d.center).setY(d.center.y + 4.5);
    const edge = this.panelMats.edge, holeMat = new THREE.MeshBasicNodeMaterial({ color: 0x05060a });
    const bar = new THREE.BoxGeometry(1, 1, 1);
    const R = d.radius - 3, W = (2 * Math.PI * R) / 24 * 0.86, H = 3.2;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const f = new THREE.Group(); f.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); f.rotation.y = -a - Math.PI / 2;
      const add = (m, w, h, dd, x, y) => { const o = new THREE.Mesh(bar, m); o.scale.set(w, h, dd); o.position.set(x, y, 0); f.add(o); };
      add(edge, W, 0.08, 0.08, 0, H / 2); add(edge, W, 0.08, 0.08, 0, -H / 2);
      add(edge, 0.08, H, 0.08, -W / 2, 0); add(edge, 0.08, H, 0.08, W / 2, 0);
      for (const y of [H / 2 + 0.3, -H / 2 - 0.3]) for (let k = 0; k < 4; k++) add(holeMat, 0.3, 0.22, 0.1, -W / 2 + (k + 0.5) * W / 4, y);
      add(edge, W + 0.3, 0.05, 0.05, 0, H / 2 + 0.6); add(edge, W + 0.3, 0.05, 0.05, 0, -H / 2 - 0.6);
      strip.add(f);
    }
    grp.add(strip);
    grp.userData = { strip, geos: [moon.geometry, halo.geometry, bar] };
    g.scene.add(grp); this.palace = grp;
  }
  clearPalace() {
    if (!this.palace) return;
    this.game.scene.remove(this.palace);
    for (const geo of this.palace.userData.geos) geo.dispose();
    this.palace = null;
  }
  addStack(n = 1) { this.stacks = Math.min(this.maxStacks, this.stacks + n); this.stackT = 2.5 + this.rank('tempo') * 0.5; }
  onMeleeHit(e) { this.addStack(1); if (this.accelT > 0) this.panel(e, 0.8); if (this.spiritT > 0) this.spiritBoom(e); }
  // ------------------------------------------------------------ panels
  makePanel() {
    const grp = new THREE.Group(), M = this.panelMats, G = this.panelGeo;
    const face = new THREE.Mesh(G.face, M.face); face.renderOrder = 22; grp.add(face);
    for (const y of [-0.5, 0.5]) { const m = new THREE.Mesh(G.bar, M.edge); m.position.y = y; grp.add(m); }
    for (const x of [-0.5, 0.5]) { const m = new THREE.Mesh(G.side, M.edge); m.position.x = x; grp.add(m); }
    return grp;
  }
  // Freeze a curse inside a flat frame (bosses are only slowed).
  panel(e, dur) {
    if (e.dead) return;
    const g = this.game;
    dur *= (1 + this.rank('frames') * 0.2) * this.frameMul;
    if (e.isBoss) e.slowT = Math.max(e.slowT ?? 0, dur);
    else { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.1; e.sealT = Math.max(e.sealT ?? 0, dur); }
    e.panelEnd = Math.max(e.panelEnd ?? 0, g.time + dur);
    if (this.panels.some((pn) => pn.e === e)) return;
    let mesh = this.panels.length < 16 ? this.makePanel() : null;
    if (!mesh) return;
    g.scene.add(mesh);
    this.panels.push({ e, mesh });
    g.audio?.tone({ freq: 1400, to: 1400, dur: 0.05, gain: 0.05, type: 'square', filter: 5000 });
  }
  tick(dt) {
    const g = this.game, p = this.p;
    this.accelT = Math.max(0, this.accelT - dt);
    this.spiritT = Math.max(0, (this.spiritT ?? 0) - dt);
    if (!this.holdStacks && !(this.spiritT > 0)) this.stackT -= dt * this.decayMul;
    if (this.stackT <= 0 && this.stacks > 0) { this.stacks--; this.stackT = 0.35; }
    // panels follow their curse and face the camera
    for (let i = this.panels.length - 1; i >= 0; i--) {
      const pn = this.panels[i], e = pn.e;
      if (e.dead || !(e.panelEnd > g.time)) { g.scene.remove(pn.mesh); this.panels.splice(i, 1); continue; }
      pn.mesh.position.set(e.pos.x, e.pos.y + e.height * 0.5, e.pos.z);
      pn.mesh.quaternion.copy(g.rig.camera.quaternion);
      pn.mesh.scale.set(e.radius * 2.6 + 0.6, e.height + 0.5, 1);
    }
    // speed lines at high stacks, an afterimage trail while accelerating
    const k = this.stacks / this.maxStacks;
    if (Math.random() < k * 0.8 || this.accelT > 0) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.5, y: p.pos.y + 0.2 + Math.random() * 1.6, z: p.pos.z + (Math.random() - 0.5) * 0.5, vx: -p.vel.x * 0.3, vy: 0.2, vz: -p.vel.z * 0.3, life: 0.3, r: 1.2, g: 2.2, b: 2.6, size: 0.1 + k * 0.08, drag: 2, shape: 'square' });
    if (p.rig.material?.userData?.emitMask) p.rig.material.userData.emitMask.value = 0.2 + k;
  }
  // ------------------------------------------------------------ movement helper
  // Walk a straight line in 0.5 m steps and stop before walls or drops.
  reach(dir, dist) {
    const g = this.game, p = this.p, w = g.world;
    let last = p.pos.clone();
    for (let s = 0.5; s <= dist; s += 0.5) {
      const q = tmp2.copy(p.pos).addScaledVector(dir, s);
      const gy = w.groundBelow(q.x, q.z, last.y + 1.5);
      if (!isFinite(gy) || Math.abs(gy - last.y) > 1.2 || w.solidAt(q.x, gy + 0.5, q.z) || w.solidAt(q.x, gy + 1.5, q.z)) break;
      last = q.clone().setY(gy);
    }
    return last;
  }
  // Move along a path in discrete 24fps frames, panelling whatever is close.
  frameMove(from, to, frames, onFrame) {
    const g = this.game, p = this.p;
    p.iframes = Math.max(p.iframes, frames * FPS + 0.15);
    for (let f = 1; f <= frames; f++) this.after(f * FPS, () => {
      const prev = p.pos.clone();
      p.pos.lerpVectors(from, to, f / frames); p.visY = p.pos.y; p.vel.set(0, 0, 0);
      g.particles.burst(prev.setY(prev.y + 1), { count: 6, color: FRAME, speed: 0.5, life: 0.25, size: 0.6, sizeEnd: 0.2, intensity: 1.4 });
      onFrame?.(f);
    });
  }
  // ------------------------------------------------------------ RMB
  dash() {
    const g = this.game, p = this.p, rk = this.rank('dash');
    const dir = p.aimDir.clone().setY(0).normalize();
    const to = this.reach(dir, 7 + rk * 1.2);
    if (to.distanceTo(p.pos) < 1) { g.audio?.ui('back'); return false; }
    p.facing = Math.atan2(dir.x, dir.z);
    const from = p.pos.clone(), dmg = (12 + rk * 5) * this.power, hit = new Set();
    this.frameMove(from, to, 4, () => {
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || e.pos.distanceTo(p.pos) > 1.6 + e.radius) continue;
        hit.add(e);
        g.combat.damageEnemy(e, dmg, p, { stagger: 0.2, knock: dir.clone().multiplyScalar(2) });
        this.panel(e, 0.9);
        g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.6), dir, { color: FRAME });
      }
    });
    this.after(4 * FPS + 0.01, () => { if (hit.size) { g.hitStop(0.05); g.shake(0.2); g.audio?.impact(1.1); } this.addStack(1 + hit.size); });
    g.audio?.whoosh(1.2); g.audio?.energy('teleport');
  }
  // ------------------------------------------------------------ 1
  blitz() {
    const g = this.game, p = this.p;
    const n = 6 + this.rank('blitz') * 2;
    const pool = this.targetsNear(p.pos, 11);
    if (!pool.length) { g.toast?.('No curses in reach'); g.audio?.ui('back'); return false; }
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.3, windup: 0.2 }, style: 'punch', dur: n * FPS * 2 + 0.2, elapsed: 0, t: 0, windup: 0.2, strike: 0.3, struck: true, moveScale: 0, lock: true, cancelable: false };
    p.iframes = Math.max(p.iframes, n * FPS * 2 + 0.3);
    for (let i = 0; i < n; i++) this.after(i * FPS * 2, () => {
      const alive = pool.filter((e) => !e.dead);
      if (!alive.length) return;
      const e = alive[i % alive.length];
      // reappear on the near side of the target, one frame later
      tmp.subVectors(p.pos, e.pos).setY(0); if (tmp.lengthSq() < 0.01) tmp.set(0, 0, 1);
      const spot = e.pos.clone().addScaledVector(tmp.normalize(), e.radius + 0.9);
      const gy = g.world.groundBelow(spot.x, spot.z, e.pos.y + 1.5);
      if (isFinite(gy) && Math.abs(gy - e.pos.y) < 1.5 && !g.world.solidAt(spot.x, gy + 0.5, spot.z) && !g.world.solidAt(spot.x, gy + 1.5, spot.z)) {
        g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: 8, color: FRAME, speed: 1, life: 0.25, size: 0.5, sizeEnd: 0.1 });
        p.pos.set(spot.x, gy, spot.z); p.visY = gy; p.vel.set(0, 0, 0);
      }
      p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.6);
      g.combat.damageEnemy(e, (14 + this.stacks * 1.5) * this.power, p, { stagger: 0.3, knock: new THREE.Vector3() });
      if (e.panelEnd > g.time) g.combat.damageEnemy(e, 8 * this.power, p, { stagger: 0, crit: false, color: '#a8f0ff' });
      this.panel(e, 0.5);
      g.fx.hitSpark(at, null, { color: i % 2 ? FRAME : 0xffffff, big: i === n - 1 });
      g.fx.slashArc(p.pos, p.facing, FRAME, 1.6, 0.4, 0.1, i % 2 === 1);
      this.addStack(1);
      g.hitStop(0.025); g.shake(0.12); g.audio?.impact(0.9 + i * 0.05);
      if (i === n - 1) { p.action = null; g.fx.screenWave(at, 0.6, 0.3); }
    });
  }
  // ------------------------------------------------------------ 2
  accelerate() {
    const g = this.game, p = this.p;
    this.stacks = this.maxStacks; this.stackT = 5; this.accelT = 5;
    g.toast?.('Acceleration — 24 frames per second');
    g.fx.flash(0xc0f4ff, 0.25, 0.15); g.fx.chroma(0.6);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: FRAME, r0: 0.4, r1: 4, dur: 0.35, thick: 0.15 });
    g.audio?.charge(0.4, 1.4);
  }
  // ------------------------------------------------------------ 3
  mach() {
    const g = this.game, p = this.p, rk = this.rank('mach');
    const dir = p.aimDir.clone().setY(0).normalize();
    const to = this.reach(dir, 11);
    const st = this.stacks;
    const dmg = (50 + st * (10 + rk * 4)) * (1 + (this.accelT > 0 ? 0.2 : 0));
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.5, windup: 0.3 }, style: 'punch', dur: 0.45, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0, lock: true, cancelable: false };
    const from = p.pos.clone(), hit = new Set();
    g.audio?.whoosh(2);
    this.frameMove(from, to, 3, (f) => {
      for (const e of g.enemies) {
        if (e.dead || hit.has(e)) continue;
        tmp.subVectors(e.pos, from).setY(0); const along = tmp.dot(dir);
        if (along < -0.5 || along > from.distanceTo(p.pos) + 1.5) continue;
        if (Math.abs(tmp.x * dir.z - tmp.z * dir.x) > 1.6 + e.radius) continue;
        hit.add(e);
        const shatter = e.panelEnd > g.time;
        g.combat.damageEnemy(e, dmg * (shatter ? 1.5 : 1), p, { stagger: 1, unblockable: true, knock: dir.clone().multiplyScalar(16) });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 7);
        if (shatter) { e.panelEnd = 0; g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.5), { count: 24, color: FRAME, speed: 9, life: 0.5, size: 0.14, drag: 3, shape: 1, intensity: 4 }); }
      }
      if (f === 3) {
        // the sound barrier breaks
        const c = p.pos.clone().setY(p.pos.y + 1.1);
        g.fx.rings.spawn(c, { color: 0xffffff, r0: 0.5, r1: 6 + st * 0.3, dur: 0.4, thick: 0.12, tilt: new THREE.Quaternion().setFromUnitVectors(tmp2.set(0, 0, 1), dir) });
        g.fx.shockwave(p.pos, FRAME, 5 + st * 0.3); g.fx.screenWave(c, 1.2, 0.5); g.fx.flash(0xe0f8ff, 0.4, 0.15); g.fx.chroma(1);
        g.combat.aoe(p.pos, 3, dmg * 0.3, p, { knock: 8, stagger: 0.5 });
        g.shake(0.6 + st * 0.03); g.hitStop(0.09); g.audio?.blackFlash();
        this.stacks = 0;
      }
    });
  }
  // ============================================================== new abilities
  // a free spot on the near side of a curse (or null)
  besideSpot(e, side = 1) {
    const w = this.game.world, p = this.p;
    tmp.subVectors(p.pos, e.pos).setY(0); if (tmp.lengthSq() < 0.01) tmp.set(0, 0, 1);
    const spot = e.pos.clone().addScaledVector(tmp.normalize(), side * (e.radius + 0.9));
    const gy = w.groundBelow(spot.x, spot.z, e.pos.y + 1.5);
    if (!isFinite(gy) || Math.abs(gy - e.pos.y) > 1.5 || w.solidAt(spot.x, gy + 0.5, spot.z) || w.solidAt(spot.x, gy + 1.5, spot.z)) return null;
    return spot.setY(gy);
  }
  frameFlash(at, s = 1) {
    const g = this.game;
    g.fx.rings.spawn(tmp2.set(at.x, at.y + 0.06, at.z), { color: FRAME, r0: 0.3, r1: 2.5 * s, dur: 0.25, thick: 0.1 });
    g.particles.burst(tmp2.set(at.x, at.y + 1, at.z), { count: 8, color: Math.random() < 0.5 ? FRAME : 0xffffff, speed: 3, life: 0.3, size: 0.1, drag: 3, shape: 1, intensity: 3 });
  }
  strike(e, dmg, o = {}) {
    const g = this.game;
    this.hit(e, dmg * this.power, { stagger: 0.3, ...o });
    g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + e.height * 0.6), null, { color: o.spark ?? FRAME, big: !!o.big });
  }
  spiritBoom(e) {
    const g = this.game, p = this.p;
    if ((this.boomT ?? 0) > g.time) return;
    this.boomT = g.time + 0.25;
    const at = e.pos.clone();
    g.combat.aoe(at, 2.4, 10 * this.power, p, { knock: 6, stagger: 0.3 });
    g.fx.rings.spawn(tmp.set(at.x, at.y + 1, at.z), { color: 0xffffff, r0: 0.3, r1: 2.6, dur: 0.25, thick: 0.08 });
    p.heal(3, true);
  }
  panelJab() {
    const g = this.game, p = this.p, t = this.target(8);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    const spot = this.besideSpot(t) ?? p.pos.clone();
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.5, windup: 0.3 }, style: 'punch', dur: 0.25, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0 };
    this.frameMove(p.pos.clone(), spot, 2, (f) => {
      if (f < 2 || t.dead) return;
      p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
      this.strike(t, 14 + this.rank('dash') * 3, { knock: new THREE.Vector3() });
      this.panel(t, 1);
      this.addStack(1); g.audio?.impact(0.9);
    });
    g.audio?.whoosh(0.8);
  }
  afterimage() {
    const g = this.game, p = this.p;
    g.audio?.energy('teleport'); g.fx.chroma(0.5);
    const ghosts = [];
    let gt = 0;
    this.buff('afterimage', 3, {
      incoming: (a) => {
        if (Math.random() < 0.7) {
          const m = this.makePanel(); m.position.set(p.pos.x, p.pos.y + 1, p.pos.z); m.quaternion.copy(g.rig.camera.quaternion); m.scale.set(1.4, 2, 1); g.scene.add(m);
          this.after(0.3, () => g.scene.remove(m));
          g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 10, color: FRAME, speed: 2, life: 0.3, size: 0.4, sizeEnd: 0.1 });
          this.addStack(1);
          return 0;
        }
        return a;
      },
      onTick: (dt) => {
        gt -= dt; if (gt > 0) return; gt = FPS * 3;
        g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 3, color: FRAME, speed: 0.1, life: 0.35, size: 0.9, sizeEnd: 0.7, intensity: 1 });
      },
      onEnd: () => { for (const m of ghosts) g.scene.remove(m); },
    });
  }
  frameSkip() {
    const g = this.game, p = this.p;
    const dir = this.fwd(), to = this.reach(dir, Math.min(9, Math.max(2, Math.hypot(p.aimPoint.x - p.pos.x, p.aimPoint.z - p.pos.z))));
    if (to.distanceTo(p.pos) < 1) { g.audio?.ui('back'); return false; }
    p.facing = Math.atan2(dir.x, dir.z);
    this.frameMove(p.pos.clone(), to, 3);
    p.iframes = Math.max(p.iframes, 0.4);
    this.addStack(1);
    g.audio?.energy('teleport');
  }
  zigzag() {
    const g = this.game, p = this.p, base = this.aimAngle(), hit = new Set();
    p.iframes = Math.max(p.iframes, 0.7);
    for (let leg = 0; leg < 3; leg++) this.after(leg * 0.17, () => {
      const a = base + (leg === 1 ? -0.7 : 0.7) * (leg === 2 ? 0.6 : 1);
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const to = this.reach(dir, 4.5);
      p.facing = a;
      this.frameMove(p.pos.clone(), to, 3, () => {
        for (const e of this.foes(p.pos, 1.8)) { if (hit.has(e)) continue; hit.add(e); this.strike(e, 16 + this.rank('dash') * 3, { knock: dir.clone().multiplyScalar(3) }); this.panel(e, 0.8); this.addStack(1); }
      });
      g.audio?.whoosh(1);
    });
    this.after(0.55, () => { if (hit.size) { g.hitStop(0.04); g.shake(0.2); } });
  }
  frameFreeze() {
    const g = this.game, p = this.p, R = 5.5;
    this.cast(0.3, true);
    const list = this.foes(p.pos, R);
    g.fx.flash(0xd0f4ff, 0.3, 0.1); g.fx.chroma(0.8);
    for (let k = 0; k < 3; k++) this.after(k * FPS * 2, () => g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: k % 2 ? 0xffffff : FRAME, r0: 0.4, r1: R, dur: 0.3, thick: 0.12 }));
    for (const e of list) { this.strike(e, 10, { stagger: 0.2, knock: new THREE.Vector3() }); this.panel(e, 1.5); }
    this.addStack(list.length);
    g.audio?.tone({ freq: 1400, dur: 0.2, gain: 0.08, type: 'square', filter: 5000 }); g.audio?.energy('teleport');
  }
  panelShatter() {
    const g = this.game, p = this.p;
    const list = [...this.near(p.pos, 22, (e) => e.panelEnd > g.time)];
    if (!list.length) { g.toast?.('Nothing is panelled'); g.audio?.ui('back'); return false; }
    this.cast(0.35, true);
    for (const e of list) {
      const at = e.pos.clone().setY(e.pos.y + e.height * 0.5);
      this.strike(e, 40 + this.stacks * 3, { stagger: 0.8, unblockable: true, big: true });
      e.panelEnd = 0; if (!e.isBoss) e.sealT = 0;
      g.particles.burst(at, { count: 28, color: FRAME, speed: 9, life: 0.5, size: 0.14, drag: 3, shape: 1, intensity: 4 });
      g.particles.burst(at, { count: 1, color: 0xffffff, speed: 0, life: 0.15, size: 2.6, sizeEnd: 1.4, drag: 0, intensity: 2.5 });
      g.combat.aoe(at, 2, 12 * this.power, p, { knock: 5, stagger: 0.3 });
    }
    g.shake(0.35); g.hitStop(0.06); g.fx.chroma(0.8);
    g.audio?.noise({ dur: 0.35, gain: 0.5, type: 'highpass', freq: 3000, sweep: 9000 }); g.audio?.impact(1.4);
  }
  frameLock() {
    const g = this.game, p = this.p, t = this.target(13);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    this.cast(0.4, true);
    this.panel(t, 2.6);
    g.toast?.('24 frames');
    let f = 0, acc = 0;
    this.during(2.4, (tt, dt) => {
      acc += dt;
      while (acc >= 0.1 && f < 24) {
        acc -= 0.1; f++;
        if (t.dead) return false;
        this.hit(t, 3 * this.power, { stagger: 0, knock: new THREE.Vector3(), crit: false, color: '#a8f0ff' });
        g.particles.burst(tmp.copy(t.pos).setY(t.pos.y + t.height * (0.2 + Math.random() * 0.7)), { count: 3, color: f % 2 ? FRAME : 0xffffff, speed: 2, life: 0.25, size: 0.08, shape: 1 });
        if (f % 4 === 0) g.audio?.tone({ freq: 1200 + f * 40, dur: 0.04, gain: 0.04, type: 'square', filter: 5000 });
      }
    }, () => {
      if (t.dead) return;
      this.strike(t, 34, { stagger: 1, unblockable: true, big: true });
      g.particles.burst(tmp.copy(t.pos).setY(t.pos.y + t.height * 0.5), { count: 24, color: FRAME, speed: 8, life: 0.5, size: 0.14, drag: 3, shape: 1, intensity: 4 });
      g.shake(0.3); g.audio?.impact(1.4);
    });
  }
  filmReel() {
    const g = this.game, p = this.p, R = 6, N = 24, dur = 4;
    this.cast(0.5, true);
    g.toast?.('Film Reel'); g.audio?.charge(0.4, 1.6);
    const frames = [];
    for (let i = 0; i < N; i++) { const m = this.makePanel(); m.scale.set(1.3, 2, 1); g.scene.add(m); frames.push(m); }
    let tick = 0;
    this.during(dur, (t, dt) => {
      const grow = Math.min(1, t * 3) * (t > dur - 0.3 ? Math.max(0.05, (dur - t) / 0.3) : 1);
      frames.forEach((m, i) => {
        const a = i / N * Math.PI * 2 + t * 1.6, r = R * grow;
        m.position.set(p.pos.x + Math.cos(a) * r, p.pos.y + 1.2, p.pos.z + Math.sin(a) * r);
        m.rotation.set(0, -a, 0);
      });
      tick -= dt; if (tick > 0) return; tick = 0.4;
      for (const e of this.foes(p.pos, R * grow)) { this.hit(e, 8 * this.power, { stagger: 0.15, knock: new THREE.Vector3(), color: '#a8f0ff' }); this.panel(e, 0.5); }
      this.addStack(1);
    }, () => { for (const m of frames) g.scene.remove(m); });
  }
  momentum() {
    const g = this.game, p = this.p;
    this.addStack(4);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: GOLD, r0: 0.4, r1: 3.5, dur: 0.35, thick: 0.15 });
    g.audio?.charge(0.3, 1.6); g.toast?.('Momentum');
    this.buff('momentum', 8, { onStart: () => { this.holdStacks = true; }, onEnd: () => { this.holdStacks = false; },
      onTick: () => { if (Math.random() < 0.3) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 0.3, p.pos.z), { count: 1, color: GOLD, speed: 0.5, up: 1, life: 0.4, size: 0.12 }); } });
  }
  sonicKick() {
    const g = this.game, p = this.p, t = this.target(9);
    if (!t) { g.toast?.('No curse in reach'); g.audio?.ui('back'); return false; }
    const spot = this.besideSpot(t) ?? p.pos.clone();
    p.action = { type: 'attack', step: { style: 'spin', strike: 0.6, windup: 0.3 }, style: 'spin', dur: 0.35, elapsed: 0, t: 0, windup: 0.3, strike: 0.6, struck: true, moveScale: 0, lock: true, cancelable: false };
    this.frameMove(p.pos.clone(), spot, 3, (f) => {
      if (f < 3 || t.dead) return;
      const dir = tmp2.subVectors(t.pos, p.pos).setY(0).normalize().clone();
      p.facing = Math.atan2(dir.x, dir.z);
      this.strike(t, 40 + this.rank('mach') * 6, { stagger: 1, unblockable: true, knock: dir.clone().multiplyScalar(t.isBoss ? 4 : 22), big: true });
      if (!t.isBoss) t.vel.y = Math.max(t.vel.y, 5);
      g.fx.rings.spawn(tmp.copy(t.pos).setY(t.pos.y + 1), { color: 0xffffff, r0: 0.4, r1: 3.5, dur: 0.3, thick: 0.1, tilt: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir) });
      // whatever it flies into gets hit too
      let tt = 0;
      this.during(0.5, (x, dt) => { tt += dt; for (const o of this.foes(t.pos, 1.6)) if (o !== t && !o._kicked) { o._kicked = true; this.strike(o, 18, { stagger: 0.6, knock: dir.clone().multiplyScalar(8) }); this.after(0.5, () => { o._kicked = false; }); } });
      this.addStack(2); g.hitStop(0.07); g.shake(0.45); g.audio?.blackFlash?.();
    });
    g.audio?.whoosh(1.4);
  }
  maxSpeed() {
    const g = this.game, p = this.p;
    if (!this.foes(p.pos, 11).length) { g.toast?.('No curses in reach'); g.audio?.ui('back'); return false; }
    this.stacks = this.maxStacks; this.stackT = 4;
    g.toast?.('Maximum Speed'); g.fx.flash(0xe0f8ff, 0.35, 0.15); g.fx.chroma(1.2);
    p.iframes = Math.max(p.iframes, 3.2);
    let tick = 0, i = 0;
    this.during(3, (t, dt) => {
      p.iframes = Math.max(p.iframes, 0.2);
      tick -= dt; if (tick > 0) return; tick = FPS * 3;
      const pool = this.foes(p.pos, 11);
      if (!pool.length) return;
      const e = pool[i++ % pool.length];
      const spot = this.besideSpot(e, i % 2 ? 1 : -1) ?? this.besideSpot(e);
      if (spot) { g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 6, color: FRAME, speed: 0.5, life: 0.25, size: 0.6, sizeEnd: 0.2 }); p.pos.copy(spot); p.visY = spot.y; p.vel.set(0, 0, 0); }
      p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      p.action = { type: 'attack', step: { style: i % 2 ? 'punch' : 'swingL', strike: 0.4, windup: 0.2 }, style: i % 2 ? 'punch' : 'swingL', dur: FPS * 3, elapsed: 0, t: 0, windup: 0.2, strike: 0.4, struck: true, moveScale: 0 };
      this.strike(e, 12, { knock: new THREE.Vector3(), stagger: 0.25 });
      this.panel(e, 0.4);
      g.combat.aoe(e.pos, 2, 5 * this.power, p, { knock: 2, stagger: 0.1 });
      if (i % 4 === 0) { g.fx.rings.spawn(tmp.copy(p.pos).setY(p.pos.y + 1), { color: 0xffffff, r0: 0.3, r1: 3, dur: 0.25, thick: 0.08 }); g.shake(0.15); }
      g.audio?.impact(0.8 + (i % 5) * 0.08);
    }, () => { p.action = null; });
  }
  palmRush() {
    const g = this.game, p = this.p, R = 3;
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.3, windup: 0.2 }, style: 'punch', dur: 0.6, elapsed: 0, t: 0, windup: 0.2, strike: 0.3, struck: true, moveScale: 0.2 };
    p.facing = this.aimAngle();
    let f = 0;
    this.during(0.55, (t) => {
      const nf = Math.floor(t / (FPS * 2));
      while (f < nf && f < 12) {
        f++;
        const dir = tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing));
        const hand = this.handPos().add(tmp.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.6, 0));
        g.particles.burst(hand.addScaledVector(dir, 0.6), { count: 2, color: FRAME, speed: 1, life: 0.15, size: 0.4, sizeEnd: 0.1 });
        for (const e of this.foes(p.pos, R, dir, 0.7)) { this.hit(e, 5 * this.power, { stagger: 0.12, knock: new THREE.Vector3(), crit: f % 3 === 0 }); if (f === 12) this.panel(e, 0.6); }
        if (f % 2) g.audio?.impact(0.6 + f * 0.03);
      }
    }, () => {
      const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
      for (const e of this.foes(p.pos, R + 0.5, dir, 0.8)) this.strike(e, 18, { stagger: 0.7, knock: dir.clone().multiplyScalar(10) });
      this.addStack(2); g.shake(0.25); g.fx.screenWave(this.handPos(), 0.5, 0.25);
    });
  }
  axeKick() {
    const g = this.game, p = this.p;
    const to = this.aimGround(7), from = p.pos.clone(), R = 3;
    g.markers.spawn({ pos: to, dur: FPS * 6, radius: R, color: FRAME });
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.8, windup: 0.3 }, style: 'slam', dur: FPS * 7, elapsed: 0, t: 0, windup: 0.3, strike: 0.8, struck: true, moveScale: 0, lock: true, cancelable: false };
    p.iframes = Math.max(p.iframes, FPS * 7);
    const top = from.clone().lerp(to, 0.5).setY(Math.max(from.y, to.y) + 3.5);
    if (g.world.solidAt(top.x, top.y + 1, top.z)) top.y = Math.max(from.y, to.y) + 0.5;
    this.frameMove(from, top, 3, (f) => {
      if (f < 3) return;
      this.frameMove(top, to, 3, (f2) => {
        if (f2 < 3) return;
        for (const e of this.foes(to, R)) { this.strike(e, 32 + this.rank('blitz') * 4, { stagger: 0.8, knock: tmp2.subVectors(e.pos, to).setY(0).normalize().multiplyScalar(5) }); this.panel(e, 0.7); }
        g.fx.shockwave(to, FRAME, R + 1); g.fx.landDust(to, 20);
        this.addStack(2); g.shake(0.4); g.hitStop(0.05); g.audio?.impact(1.5);
        p.action = null;
      });
    });
    g.audio?.whoosh(1.1);
  }
  frameCutter() {
    const g = this.game, p = this.p, dir = this.fwd(), hit = new Set();
    const to = this.reach(dir, 9), from = p.pos.clone();
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'attack', step: { style: 'swingR', strike: 0.4, windup: 0.2 }, style: 'swingR', dur: 6 * FPS + 0.1, elapsed: 0, t: 0, windup: 0.2, strike: 0.4, struck: true, moveScale: 0, lock: true, cancelable: false };
    this.frameMove(from, to, 6, (f) => {
      const a = from.clone().lerp(to, (f - 1) / 6).setY(p.pos.y + 1), L = from.distanceTo(to) / 6 + 0.5;
      g.fx.slashLine(a, dir, L, f % 2 ? FRAME : 0xffffff, 0.3, 0.25, (f % 2 ? 1 : -1) * 0.6);
      for (const e of this.foes(p.pos, 2)) { if (hit.has(e)) continue; hit.add(e); this.strike(e, 20 + this.rank('dash') * 3, { stagger: 0.5, knock: new THREE.Vector3() }); this.panel(e, 1); }
      if (f === 6) { p.action = null; this.addStack(1 + hit.size); if (hit.size) { g.hitStop(0.05); g.shake(0.25); } }
    });
    g.audio?.energy('slash'); g.audio?.whoosh(1.2);
  }
  zeninPride() {
    const g = this.game, p = this.p;
    this.cast(0.4, true);
    g.toast?.('Zenin Pride'); g.audio?.charge(0.3, 1.2);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: GOLD, r0: 0.4, r1: 3, dur: 0.4, thick: 0.18 });
    this.statBuff('zenin_pride', 8, { meleeMult: 0.2, techMult: 0.2, armor: 0.1 }, {
      onTick: () => { if (Math.random() < 0.35) { const a = Math.random() * Math.PI * 2; g.particles.glow.spawn({ x: p.pos.x + Math.cos(a) * 0.6, y: p.pos.y + 0.2, z: p.pos.z + Math.sin(a) * 0.6, vy: 1.6, life: 0.6, r: 2.6, g: 2.1, b: 1.1, size: 0.12, drag: 1, sizeEnd: 0.05, shape: 'square' }); } },
    });
  }
  counter() {
    const g = this.game, p = this.p;
    p.action = { type: 'cast', both: true, dur: 1.2, elapsed: 0, t: 0, moveScale: 0, lock: false };
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { color: FRAME, r0: 1.5, r1: 0.4, dur: 0.3, thick: 0.1 });
    g.audio?.tone({ freq: 900, to: 1400, dur: 0.15, gain: 0.06, type: 'triangle' });
    this.buff('counter', 1.2, {
      incoming: (a, src) => {
        const b = this.buffs.get('counter'); if (b) b.left = 0.01;
        p.action = null;
        const e = src && src.maxHp && !src.dead && src.pos ? src : this.target(6);
        g.fx.flash(0xd0f4ff, 0.3, 0.1); g.audio?.energy('teleport');
        if (e) {
          const spot = this.besideSpot(e, -1) ?? this.besideSpot(e);
          if (spot) { g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 10, color: FRAME, speed: 0.5, life: 0.3, size: 0.6, sizeEnd: 0.2 }); p.pos.copy(spot); p.visY = spot.y; p.vel.set(0, 0, 0); }
          p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
          this.pose('punch', 0.25);
          this.strike(e, 40, { stagger: 1, unblockable: true, big: true, knock: new THREE.Vector3() });
          this.panel(e, 1.5);
          g.hitStop(0.08); g.shake(0.35); g.audio?.impact(1.5);
        }
        p.iframes = Math.max(p.iframes, 0.5);
        this.addStack(3);
        return 0;
      },
    });
  }
  sonicBoom() {
    const g = this.game, p = this.p;
    this.pose('punch', 0.25); p.facing = this.aimAngle();
    const dmg = (18 + this.rank('mach') * 4) * this.power;
    const dir = this.fwd();
    g.projectiles.fire({ pos: this.handPos(), vel: dir.clone().multiplyScalar(40), team: 'player', shape: 'slash', color: 0xe8fbff, emissive: 3, scale: 1.4, life: 0.4, radius: 1, pierce: true,
      trail: (q) => { if (Math.random() < 0.5) g.fx.rings.spawn(tmp.copy(q.pos), { color: 0xffffff, r0: 0.3, r1: 1.4, dur: 0.15, thick: 0.05, tilt: new THREE.Quaternion().setFromUnitVectors(tmp2.set(0, 0, 1), dir) }); },
      onHit: (e, q) => { this.hit(e, dmg, { knock: dir.clone().multiplyScalar(8), stagger: 0.5 }); g.fx.hitSpark(q.pos, dir, { color: 0xffffff }); } });
    g.fx.rings.spawn(this.handPos(), { color: 0xffffff, r0: 0.2, r1: 1.6, dur: 0.2, thick: 0.08, tilt: new THREE.Quaternion().setFromUnitVectors(tmp2.set(0, 0, 1), dir) });
    this.addStack(1);
    g.audio?.whoosh(1.6); g.audio?.impact(0.7);
  }
  cursedSpirit() {
    const g = this.game, p = this.p;
    p.action = { type: 'cast', both: true, dur: 0.7, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false };
    g.toast?.('Cursed Spirit Form', 'domain');
    g.fx.flash(0x200018, 0.45, 0.3); g.fx.chroma(1); g.shake(0.4);
    g.audio?.energy('summon'); g.audio?.tone({ freq: 60, to: 35, dur: 1.2, gain: 0.35, type: 'sawtooth', filter: 400, rev: 0.6 });
    this.blast(p.pos.clone(), 4, 24, { color: 0x8a5aff, knock: 10, stagger: 0.6 });
    this.after(0.7, () => { if (p.action?.lock) p.action = null; });
    this.spiritT = 12;
    this.statBuff('cursed_spirit', 12, { lifesteal: 0.05, speed: 0.1 }, {
      onStart: () => { this.stacks = this.maxStacks; },
      onTick: () => {
        if (Math.random() < 0.6) g.particles.glow.spawn({ x: p.pos.x + (Math.random() - 0.5) * 0.9, y: p.pos.y + Math.random() * 2, z: p.pos.z + (Math.random() - 0.5) * 0.9, vy: 0.6, life: 0.6, r: 1.2, g: 0.5, b: 2, size: 0.18, gravity: -0.4, drag: 1.5, sizeEnd: 0.3 });
        if (Math.random() < 0.2) g.particles.burst(tmp.set(p.pos.x, p.pos.y + 1, p.pos.z), { count: 1, color: FRAME, speed: 1, life: 0.3, size: 0.1, shape: 1 });
      },
      onEnd: () => { this.spiritT = 0; this.stacks = Math.min(this.stacks, this.maxStacks); },
    });
  }
}
registerKit('naoya', NaoyaKit, NAOYA_SKILLS);
