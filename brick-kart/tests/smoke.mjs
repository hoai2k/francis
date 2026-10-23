// Brick Kart smoke test: loads the game in headless Chromium and fails on any page error or
// console error. It covers every map (a short race each), every item and movie ability (used by
// the player's kart on one map), the menus up to the character select, and the driver, kart and
// glider line-ups cycling their poses (which build every driver, vehicle and glider).
//
//   node brick-kart/tests/smoke.mjs            (from the repository root; needs Playwright)
//   node brick-kart/tests/smoke.mjs city jjk   (only these maps, plus the rest of the checks)
//
// Pages load with ?norender, so it runs everything but drawing (see main.js).
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 8000 + Math.floor(Math.random() * 900);
const BASE = `http://127.0.0.1:${PORT}/brick-kart/`;
const MAPS = ['city', 'meadow', 'pirate', 'candy', 'jungle', 'frost', 'factory', 'lava', 'space', 'jurassic', 'starwars', 'marvel', 'hogwarts', 'jjk-goodwill', 'jjk-inventory', 'jjk', 'jjk-culling', 'minecraft', 'pokemon', 'sonic'];
const only = process.argv.slice(2);

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '-d', ROOT], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(600);

const executablePath = process.env.CHROMIUM || undefined;
const browser = await playwright.chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const failures = [];

async function check(name, url, fn) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const t0 = Date.now();
  try {
    await page.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
    await fn(page);
  } catch (e) { errors.push('test: ' + e.message); }
  await page.close();
  const ok = !errors.length;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  for (const e of errors.slice(0, 8)) console.log('     ' + e.split('\n').slice(0, 4).join('\n     '));
  if (!ok) failures.push(name);
}

const raceReady = (page) => page.waitForFunction(() => window.game?.race?.state === 'race' && window.game.race.mode !== 'attract', null, { timeout: 60000 });

// every map: get into the race, drive a few seconds, and see the karts move
for (const id of MAPS.filter((m) => !only.length || only.includes(m))) {
  await check(`map ${id}`, `?quick=${id}&norender`, async (page) => {
    await raceReady(page);
    const d0 = await page.evaluate(() => Math.max(...window.game.race.karts.map((k) => k.raceDist)));
    await sleep(3000);
    const d1 = await page.evaluate(() => Math.max(...window.game.race.karts.map((k) => k.raceDist)));
    if (!(d1 > d0)) throw new Error(`karts did not move (${d0} -> ${d1})`);
    // every jump: a CPU kart set down at speed before it must take off, land back on the road
    // (no respawn) and carry on past it
    const res = await page.evaluate(async () => {
      const race = window.game.race, tr = race.track;
      const cpus = race.karts.filter((k) => !k.human);
      const out = [];
      for (let b = 0; b < tr.ramps.length; b += cpus.length) {
        const batch = tr.ramps.slice(b, b + cpus.length).map((r, n) => {
          const k = cpus[n], i0 = tr.wrap(r.i - 45);
          k.place(i0, 0); k.lastSafe = i0; k.speed = k.topSpeed; k.respawn = 0;
          const st = { r, k, i0, flew: false, landed: false, respawned: false, trick: false };
          k._jt = st;
          const orig = k.startRespawn;
          k.startRespawn = function () { if (this._jt) this._jt.respawned = true; return orig.call(this); };
          return st;
        });
        const t0 = performance.now();
        await new Promise((done) => {
          const tick = () => {
            for (const st of batch) {
              const k = st.k, past = (k.loc.i - st.r.i + tr.N) % tr.N;
              if (st.done) continue;
              if (!k.grounded && k.launched) st.flew = true;
              if (k.trickDone) st.trick = true;
              if (st.flew && k.grounded) st.landed = true;
              // landed and driven on: this jump is done (what happens further on is another jump's)
              if (st.landed && past > 30 && past < tr.N / 2) { st.done = true; st.past = past; delete k._jt; }
            }
            // (a glider flight can last 11 s)
            if (performance.now() - t0 > 20000 || batch.every((s) => s.done)) done(); else requestAnimationFrame(tick);
          };
          tick();
        });
        for (const st of batch) {
          const past = st.past ?? (st.k.loc.i - st.r.i + tr.N) % tr.N;
          out.push({ i: st.r.i, kind: st.r.kind, flew: st.flew, landed: st.landed, respawned: st.respawned, past: past < tr.N / 2 ? past : past - tr.N, trick: st.trick });
          delete st.k._jt;
        }
      }
      return out;
    });
    const bad = res.filter((j) => !j.flew || !j.landed || j.respawned || j.past < 20);
    console.log(`     ${res.length} jumps (${res.map((j) => ({ ramp: 'R', bump: 'b', boost: 'B', glide: 'G' })[j.kind]).join('')}), ${res.filter((j) => j.trick).length} tricked by CPUs`);
    if (bad.length) throw new Error('jumps that went wrong: ' + JSON.stringify(bad));
  });
}

// every item and movie ability, used by player 1 (forward, then behind), with time to play out
await check('items and abilities', '?quick=city&norender&abilities=all', async (page) => {
  await raceReady(page);
  const ids = await page.evaluate(async () => {
    const { ITEMS } = await import('./js/items.js');
    const { ABILITIES } = await import('./js/abilities.js');
    return [...Object.keys(ITEMS), ...ABILITIES.map((a) => a.id)];
  });
  if (ids.length < 40) throw new Error(`only ${ids.length} items and abilities`);
  for (const [i, id] of ids.entries()) {
    await page.evaluate(({ id, back }) => {
      const race = window.game.race, k = race.karts.find((o) => o.human) || race.karts[0];
      k.item = id; k.itemCount = 3;
      k.ctl = { ...k.ctl, back, aimFwd: !back };
      race.items.use(k);
    }, { id, back: i % 2 === 1 });
    await sleep(350);
  }
  await sleep(3000);
});

// feedback for bonuses: player 1 (keyboard) hits a boost ramp, tricks in the air (Space) and lands;
// then charges a drift to purple sparks and lets go. Each must sound and show.
await check('bonus feedback', '?quick=city&norender', async (page) => {
  await raceReady(page);
  await page.evaluate(() => {
    const race = window.game.race, tr = race.track, k = race.karts.find((o) => o.human);
    window.__heard = [];
    const sfx = race.audio.sfx.bind(race.audio);
    race.audio.sfx = (name, ...a) => { window.__heard.push(name); return sfx(name, ...a); };
    window.__bursts = 0;
    const burst = race.fx.boostBurst.bind(race.fx);
    race.fx.boostBurst = (...a) => { window.__bursts++; return burst(...a); };
    const r = tr.ramps.find((x) => x.kind === 'boost');
    for (const o of race.karts) if (o !== k) o.place(tr.wrap(r.i + 400), 0);
    k.place(tr.wrap(r.i - 50), 0); k.speed = k.topSpeed;
  });
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => { const k = window.game.race.karts.find((o) => o.human); return !k.grounded && k.launched && k.airTime > 0.2; }, null, { timeout: 8000 })
    .catch(() => { throw new Error('the kart never left the boost ramp'); });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.game.race.karts.find((o) => o.human).grounded, null, { timeout: 8000 });
  await sleep(300);
  const jump = await page.evaluate(() => ({ heard: window.__heard.splice(0), bursts: window.__bursts, flames: window.game.race.karts.find((o) => o.human).boosting }));
  for (const s of ['boost', 'jump', 'trick']) if (!jump.heard.includes(s)) throw new Error(`no "${s}" sound off the boost ramp (heard ${jump.heard.join(', ')})`);
  if (jump.heard.filter((s) => s === 'boost').length < 2) throw new Error(`no boost sound on landing the trick (heard ${jump.heard.join(', ')})`);
  if (jump.bursts < 2 || !jump.flames) throw new Error('no boost burst / flames for the boost ramp and the trick landing');
  // a drift (Space held) charged through all three spark colours, then let go
  await page.keyboard.down('Space'); await sleep(400);
  const drift = await page.evaluate(async () => {
    const race = window.game.race, tr = race.track, k = race.karts.find((o) => o.human);
    const i0 = tr.wrap(tr.ramps.find((x) => x.kind === 'boost').i + 120);
    window.__bursts = 0;
    const ticks = [];
    for (const c of [1.05, 2.15, 3.35]) {
      // (set down mid-road at speed each time, so the drift never runs into a wall)
      k.place(i0, 0); k.speed = k.topSpeed;
      Object.assign(k.drift, { active: true, dir: 1, charge: c - 0.04, level: ticks.length });
      await new Promise((r) => setTimeout(r, 150)); ticks.push(k.drift.level);
    }
    k.place(i0, 0); k.speed = k.topSpeed;
    return { ticks };
  });
  await page.keyboard.up('Space'); await sleep(300);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => ({ heard: window.__heard.splice(0), bursts: window.__bursts }));
  for (const s of ['spark1', 'spark2', 'spark3']) if (!after.heard.includes(s)) throw new Error(`no "${s}" sound as the drift charged (heard ${after.heard.join(', ')}; levels ${drift.ticks})`);
  if (!after.heard.includes('boost') || !after.bursts) throw new Error(`no Ultra Mini-Turbo boost when the drift was let go (heard ${after.heard.join(', ')})`);
});

// the menus: title, main menu, Grand Prix select, a driver and a kart and a glider locked in
await check('menus and select', '?norender', async (page) => {
  await page.waitForFunction(() => window.game?.onTitle !== undefined && document.querySelector('#ui').innerHTML.length > 0, null, { timeout: 60000 });
  const press = async (key, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(key); await sleep(150); } };
  await press('Enter');
  await page.waitForFunction(() => !window.game.onTitle, null, { timeout: 10000 });
  await page.evaluate(() => window.game.showSelect('gp'));
  await sleep(400);
  const until = (fn, what) => page.waitForFunction(fn, null, { timeout: 8000 }).catch(() => { throw new Error('select: ' + what); });
  const step = () => page.evaluate(() => document.querySelector('.pvstep')?.textContent || '');
  await press('ArrowRight', 3); await press('ArrowDown');
  await press('Enter');            // driver
  await until(() => /pick a kart/.test(document.querySelector('.pvstep')?.textContent), 'no kart step after locking in a driver');
  await press('ArrowRight', 2);
  await press('Enter');            // kart: a lock-in spin, then the glider step
  await until(() => /pick a glider/.test(document.querySelector('.pvstep')?.textContent), 'no glider step after locking in a kart');
  await sleep(900);   // the preview finishes sliding to the glider
  await press('ArrowRight');
  await press('Enter');            // glider: ready, and on to the cups
  await until(() => document.querySelector('.cup'), 'did not reach the cup screen after locking in');
  // back from the cup screen keeps the players locked in; Back steps back to the glider, kart, driver
  await page.evaluate(() => window.game.showSelect('gp', true));
  await until(() => /ready/.test(document.querySelector('.pvstep')?.textContent), 'resumed players are not ready');
  for (const want of ['pick a glider', 'pick a kart', 'pick a driver']) {
    await press('Escape');
    await until(new Function(`return /${want}/.test(document.querySelector('.pvstep')?.textContent)`), `Back did not step back to "${want}" (shows "${await step()}")`);
    await sleep(900);
  }
  // mouse: tap a driver card, then the on-screen kart arrows and lock-in buttons
  const tap = (sel) => page.evaluate((sel) => document.querySelector(sel)?.click(), sel);
  await page.evaluate(() => window.game.showSelect('race'));
  await sleep(400);
  await page.evaluate(() => window.game.screen.click(+document.querySelectorAll('.dcard')[5].dataset.i));
  await until(() => /pick a kart/.test(document.querySelector('.pvstep')?.textContent), 'tapping a driver did not lock it in');
  await tap('[data-act^="knext"]'); await sleep(200);
  await tap('[data-act^="kprev"]'); await sleep(200);
  await tap('[data-act^="kok"]');
  await until(() => /pick a glider/.test(document.querySelector('.pvstep')?.textContent), 'the Lock in button did not lock in the kart');
  await sleep(900);
  await tap('[data-act^="knext"]'); await sleep(200);
  await tap('[data-act^="kok"]');
  await until(() => document.querySelector('.tcard'), 'did not reach the map screen after locking in with the mouse');
  // Simplified mode's smaller roster, and Time Trial
  await page.evaluate(() => { window.game.settings.simple = true; window.game.showSelect('race'); });
  await sleep(500);
  await press('ArrowRight', 2); await press('Enter');
  await until(() => /pick a kart/.test(document.querySelector('.pvstep')?.textContent), 'Simplified mode: no kart step');
  await page.evaluate(() => { window.game.settings.simple = false; window.game.showSelect('tt'); });
  await sleep(500);
});

// the line-ups: every driver in its kart, every vehicle, every glider, cycling their poses
await check('driver gallery', '?gallery=all&norender', async (page) => {
  await page.waitForFunction(() => window.galleryPose, null, { timeout: 90000 });
  for (const p of ['steerL', 'steerR', 'cheer', 'taunt', 'trick', 'throwF', 'throwB', 'use', 'ouch', 'glide', 'look', 'win', 'lose', 'pre']) {
    await page.evaluate((p) => window.galleryPose(p), p);
    await sleep(500);
  }
});
await check('garage', '?garage=all&pose=boost&norender', async (page) => {
  await page.waitForFunction(() => window.galleryPose, null, { timeout: 90000 });
  await sleep(2500);
});
await check('gliders', '?glider=all&norender', async (page) => {
  await page.waitForFunction(() => window.galleryPose, null, { timeout: 90000 });
  await sleep(2500);
});

await browser.close();
server.kill();
console.log(failures.length ? `\n${failures.length} failed: ${failures.join(', ')}` : '\nall passed');
process.exit(failures.length ? 1 : 0);
