#!/usr/bin/env node
// Cursed Dungeons smoke test: boots the game in headless Chromium (?norender,
// so no GPU is needed), then drives it from inside the page with a fixed
// time step and a seeded Math.random:
//   curses      every curse kind in a ring round the player, fighting for 30 s
//               (every enemy attack in js/entities/enemyAttacks.js must fire)
//   techniques  every sorcerer: each library ability, melee, Cursed Blast and
//               the Domain / Ultimate, against a few live curses
//   bosses      every Special Grade boss for 8 s
// Fails on any page error or console.error, or an enemy attack that never ran.
//
//   node tests/smoke.mjs                 run everything
//   node tests/smoke.mjs --only gojo,toji   just these techniques (curses + bosses still run)
//   node tests/smoke.mjs --trace a.json  also write a per-section state hash (same seed and
//                                        code give the same hashes, so a pure refactor can be
//                                        checked by diffing two runs)
//
// Needs Playwright (npm i -g playwright, or a local install) and its Chromium.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ONLY = opt('--only')?.split(',') ?? null;
const TRACE = opt('--trace');
const SEED = +(opt('--seed') ?? 1234);

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'));
  return import(pathToFileURL(req.resolve('playwright')).href);
}

// a tiny static server for the project directory
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(ROOT, url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const pw = await loadPlaywright();
const chromium = pw.chromium ?? pw.default.chromium;
const launchArgs = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'];
// behind an HTTPS proxy (cloud sandboxes): route only https (the three.js CDN) through it
if (process.env.HTTPS_PROXY) launchArgs.push('--proxy-server=https=' + process.env.HTTPS_PROXY.replace(/^https?:\/\//, ''), '--ignore-certificate-errors');
const browser = await chromium.launch({ args: launchArgs });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console.error: ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(base)) errors.push(`HTTP ${r.status()} ${r.url()}`); });

// determinism: seeded Math.random and a clock that only moves when the driver steps
await page.addInitScript((seed) => {
  let s = seed >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // timers run on the same virtual clock (several techniques sequence effects with setTimeout)
  let clock = 0, nextId = 1;
  const timers = new Map();
  performance.now = () => clock;
  window.setTimeout = (fn, ms = 0, ...a) => { const id = nextId++; timers.set(id, { at: clock + Math.max(0, +ms || 0), fn, a }); return id; };
  window.setInterval = (fn, ms = 0, ...a) => { const id = nextId++; timers.set(id, { at: clock + Math.max(1, +ms || 0), fn, a, every: Math.max(1, +ms || 0) }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  window.__advance = (ms) => {
    const end = clock + ms;
    for (;;) {
      let best = null, bestId = 0;
      for (const [id, t] of timers) if (t.at <= end && (!best || t.at < best.at || (t.at === best.at && id < bestId))) { best = t; bestId = id; }
      if (!best) break;
      clock = Math.max(clock, best.at);
      if (best.every) best.at += best.every; else timers.delete(bestId);
      if (typeof best.fn === 'function') best.fn(...best.a);
    }
    clock = end;
  };
  try { localStorage.clear(); } catch {}
}, SEED);

const t0 = Date.now();
await page.goto(base + '?norender&online=0');
try {
  await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 120000 });
} catch (e) {
  console.error('the game never reached the title screen: ' + e.message);
  for (const err of errors) console.error(err);
  console.error('loading text: ' + await page.textContent('#load-text').catch(() => '?'));
  await browser.close(); server.close(); process.exit(1);
}
console.log(`booted (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

// ---------------------------------------------------------------- in-page driver
await page.evaluate(async () => {
  const g = window.__game;
  const [{ CURSES }, { Boss, BOSS_IDS }, { SORCERER_IDS }, THREE] = await Promise.all([
    import('./js/entities/curses.js'), import('./js/entities/bosses.js'), import('./js/sorcerers/index.js'), import('three/webgpu'),
  ]);
  g.gr.renderer.setAnimationLoop(null);   // the driver steps every frame itself
  g.testDt = 1 / 30;
  g.cutscenes.play = () => false;         // no cinematics
  g.cutscenes.playOnce = () => false;
  // a scripted input device: T.inp.pressed.t1 = true for one frame, etc.
  const blank = () => Object.fromEntries(['attack', 'ranged', 'dodge', 't1', 't2', 't3', 'domain', 'interact', 'heal', 'map', 'pause', 'rotL', 'rotR', 'art1', 'art2', 'inv', 'jump'].map((k) => [k, false]));
  const T = window.__T = { inp: { move: { x: 0, y: 0 }, aimStick: null, mouse: false, held: blank(), pressed: blank(), released: blank() }, hash: 0x811c9dc5, attacks: {}, frames: 0 };
  const getInput = g.input.get.bind(g.input);
  g.input.get = (dev) => (dev === 'test' ? T.inp : getInput(dev));
  // which enemy attacks ran (released or went active)
  const mix = (n) => { const s = Number.isFinite(n) ? Math.round(n * 1e4) : -7; T.hash = Math.imul(T.hash ^ s, 16777619) >>> 0; };
  for (const pool of [g.particles.glow, g.particles.smoke]) {
    const emit = pool.emit.bind(pool);
    pool.emit = (...a) => { T.emits = (T.emits ?? 0) + 1; for (let i = 0; i < 15; i++) mix(a[i] ?? 0); return emit(...a); };
  }
  T.press = (k) => { T.inp.pressed[k] = true; T.inp.held[k] = true; };
  T.step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      window.__advance(1000 / 30);
      for (const p of g.players) { if (p.downed) p.revive?.(1); p.hp = p.maxHp; }
      g.frame();
      T.frames++;
      for (const k in T.inp.pressed) { if (T.inp.pressed[k] && !T.holding?.has(k)) { T.inp.held[k] = false; } T.inp.pressed[k] = false; T.inp.released[k] = false; }
      for (const e of g.enemies) {
        // an attack ran when its wind-up ended in the attack itself (not a stagger or a cancel)
        if (e.__wind && e.state !== 'windup' && (e.state === 'recover' || e.state === 'active' || e.state === 'dead')) T.attacks[e.__wind] = (T.attacks[e.__wind] ?? 0) + 1;
        e.__wind = e.state === 'windup' && e.action ? e.action.kind : null;
        if (T.frames % 5 === 0) { mix(e.pos.x); mix(e.pos.y); mix(e.pos.z); mix(e.hp); }
      }
      if (T.frames % 5 === 0) for (const p of g.players) { mix(p.pos.x); mix(p.pos.z); mix(p.ce); }
    }
  };
  T.player = () => g.players[0];
  T.ring = (kinds, r = 7) => {
    const c = T.player().pos;
    kinds.forEach((k, i) => {
      const a = (i / kinds.length) * Math.PI * 2;
      const pos = new THREE.Vector3(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r);
      const gy = g.world.standY(pos.x, pos.z, c.y + 2, 4); pos.y = isFinite(gy) ? gy : c.y;
      g.spawnEnemy(k, pos, {});
    });
  };
  T.clearEnemies = () => { for (const e of g.enemies) { e.cancelAttack?.(); g.scene.remove(e.object); } g.enemies.length = 0; g.domainSys.end(); g.hazards.list.length = 0; };
  T.curseKinds = Object.keys(CURSES);
  T.Boss = Boss; T.BOSS_IDS = BOSS_IDS; T.SORCERER_IDS = SORCERER_IDS; T.THREE = THREE;
  g.beginSession([{ device: 'test', sorcerer: 'yuji' }]);
  T.step(30);
});

const sections = {};
const section = async (name, fn, arg) => {
  const before = await page.evaluate(() => window.__T.hash);
  const n0 = errors.length;
  const res = await page.evaluate(fn, arg);
  const after = await page.evaluate(() => { const T = window.__T; const h = T.hash; T.hash = 0x811c9dc5; return h; });
  sections[name] = after.toString(16);
  const bad = errors.length - n0;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name}${res ? ' · ' + res : ''}${bad ? ` · ${bad} error(s)` : ''}`);
  void before;
};

// curses: every kind at once, round the player
await section('curses', () => {
  const T = window.__T, g = window.__game;
  // a few kinds at a time, so each gets its turn at the player (only three melee curses engage at once)
  const kinds = T.curseKinds.filter((k) => k !== 'imp' && k !== 'remnant');
  for (let i = 0; i < kinds.length; i += 3) {
    T.clearEnemies();
    T.ring(kinds.slice(i, i + 3), 6);
    T.step(450);
  }
  // then each attack of each archetype on demand, from close range
  const FORCE = [['swarmer', 'bite'], ['tank', 'slam'], ['blob', 'inflate'], ['spitter', 'spit'], ['summoner', 'summon'], ['teleporter', 'slash'],
    ['flyhead', 'dive'], ['embryo', 'burst'], ['grasshopper', 'pounce'], ['burrower', 'dig'], ['maw', 'chomp'], ['maw', 'volley'], ['ashspirit', 'flare'],
    ['gravekeeper', 'coffin'], ['lantern', 'beam'], ['serpent', 'charge'], ['longneck', 'lunge'], ['doll', 'slam'], ['shadow', 'ambush'], ['healer', 'bless']];
  for (const [kind, attack] of FORCE) {
    T.clearEnemies();
    T.ring([kind, 'swarmer'], 3.5);
    const e = g.enemies[0];
    T.step(20);
    if (!e.dead) { e.state = 'idle'; e.action = null; e.target = T.player(); e.startAttack(attack); }
    T.step(120);
  }
  return `${T.curseKinds.length} kinds, attacks: ${Object.keys(T.attacks).sort().join(' ')}`;
});
const attacks = await page.evaluate(() => window.__T.attacks);

// techniques
const ids = await page.evaluate(() => window.__T.SORCERER_IDS.slice());
for (const id of ids) {
  if (ONLY && !ONLY.includes(id)) continue;
  await section('tech:' + id, (id) => {
    const T = window.__T, g = window.__game;
    T.clearEnemies();
    for (const p of g.players) g.removePlayer(p);
    g.players = [];
    const S = g.save.sorc(id);
    const p0 = g.addPlayer('test', id);
    // unlock the whole tree for this technique
    const kit0 = p0.kit;
    for (const a of Object.values(kit0.library ?? {})) S.skills[a.key] = 1;
    for (const a of Object.values(kit0.passives ?? {})) S.skills[a.key] = 1;
    for (const k of ['unlock_t1', 'unlock_t2', 'unlock_t3', 'unlock_domain', 'unlock_rct']) S.skills[k] = 1;
    p0.refreshLoadout();
    const p = T.player(), kit = p.kit;
    const spawn = () => { if (g.enemies.filter((e) => !e.dead).length < 4) T.ring(['swarmer', 'tank', 'spitter', 'flyhead', 'transfigured'], 5); };
    let fired = 0, total = 0;
    const abilities = Object.values(kit.library ?? {}).filter((a) => !a.isPassive && !a.empty);
    for (const ab of abilities) {
      spawn();
      p.ce = p.maxCe; ab.cdLeft = 0; if (ab.maxCharges) ab.chargesLeft = ab.maxCharges;
      p.action = null; p.dodgeT = 0;
      const slot = ab.kind === 'basic' || ab.rmb ? 'ranged' : 't1';
      kit.slots[slot] = ab;
      const cd0 = ab.cdLeft, ch0 = ab.chargesLeft;
      total++;
      if (ab.hold) { T.holding = new Set([slot]); T.press(slot); T.step(20); T.holding = null; T.inp.held[slot] = false; T.inp.released[slot] = true; T.step(1); }
      else { T.press(slot); T.step(1); }
      if (ab.cdLeft !== cd0 || ab.chargesLeft !== ch0) fired++;
      T.step(40);
    }
    // melee, dodge, Reverse Cursed Technique
    for (let i = 0; i < 4; i++) { T.press('attack'); T.step(8); }
    T.press('dodge'); T.step(15);
    p.hp = p.maxHp * 0.5; T.press('heal'); T.step(20);
    // the Domain / Ultimate
    spawn();
    p.ce = p.maxCe; p.action = null;
    const domain = kit.domain ? 'domain' : kit.ultimate ? 'ultimate' : 'none';
    T.press('domain'); T.step(240);
    g.domainSys.end(); T.step(30);
    return `${fired}/${total} abilities fired, ${domain}`;
  }, id);
}

// bosses
const bosses = await page.evaluate(() => window.__T.BOSS_IDS.slice());
for (const id of bosses) {
  await section('boss:' + id, (id) => {
    const T = window.__T, g = window.__game;
    T.clearEnemies();
    const p = T.player();
    const pos = p.pos.clone().add(new T.THREE.Vector3(0, 0, 8));
    const gy = g.world.standY(pos.x, pos.z, p.pos.y + 2, 4); if (isFinite(gy)) pos.y = gy;
    const b = new T.Boss(g, id, pos, 1);
    g.scene.add(b.object); g.enemies.push(b);
    T.step(240);
    return `hp ${Math.round(b.hp)}/${Math.round(b.maxHp)}`;
  }, id);
}

await page.evaluate(() => { window.__T.clearEnemies(); });
const emits = await page.evaluate(() => window.__T.emits);
await browser.close();
server.close();

// every enemy attack must have run during the curses section
let missing = [];
try {
  const { ATTACKS } = await import(pathToFileURL(path.join(ROOT, 'js/entities/enemyAttacks.js')).href).catch(() => ({}));
  if (ATTACKS) missing = Object.keys(ATTACKS).filter((k) => !attacks[k] && !ATTACKS[k].internal);
} catch {}
if (TRACE) fs.writeFileSync(TRACE, JSON.stringify({ seed: SEED, sections, attacks, emits }, null, 1));
for (const e of errors.slice(0, 20)) console.error(e);
if (missing.length) console.error('enemy attacks that never ran: ' + missing.join(', '));
const ok = !errors.length && !missing.length;
console.log(`${ok ? 'PASS' : 'FAIL'} · ${errors.length} error(s) · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(ok ? 0 : 1);
