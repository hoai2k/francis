/* Terra Realis: live WebGL2 preview of the texture pack + shader, texture
   gallery, and in-browser zipping of both packs for download. */
(() => {
  'use strict';

  const BLOCK_DIR = 'pack/assets/minecraft/textures/block/';
  const $ = (s) => document.querySelector(s);
  const manifestP = fetch('manifest.json').then((r) => r.json());

  // ------------------------------------------------------------------
  // Downloads: zip pack/ or shaderpack/ in the browser
  // ------------------------------------------------------------------
  const ZIP_NAMES = { pack: 'Terra-Realis-256x.zip', shaderpack: 'Terra-Realis-Shaders.zip' };

  document.querySelectorAll('.dl').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const kind = btn.dataset.kind;
      const bar = btn.nextElementSibling;
      const fill = bar.firstElementChild;
      const label = btn.textContent;
      btn.disabled = true;
      bar.hidden = false;
      try {
        const files = (await manifestP)[kind];
        const zip = new JSZip();
        let done = 0;
        const queue = files.slice();
        const worker = async () => {
          while (queue.length) {
            const f = queue.shift();
            const res = await fetch(`${kind}/${f}`);
            if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
            zip.file(f, await res.arrayBuffer(), { binary: true });
            done++;
            fill.style.width = `${(done / files.length) * 90}%`;
            btn.textContent = `Fetching ${done}/${files.length}…`;
          }
        };
        await Promise.all(Array.from({ length: 6 }, worker));
        btn.textContent = 'Zipping…';
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } },
          (m) => { fill.style.width = `${90 + m.percent * 0.1}%`; });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = ZIP_NAMES[kind];
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 30000);
        btn.textContent = 'Downloaded ✓';
      } catch (e) {
        console.error(e);
        btn.textContent = 'Download failed, try again';
      } finally {
        btn.disabled = false;
        setTimeout(() => { btn.textContent = label; bar.hidden = true; fill.style.width = '0'; }, 2500);
      }
    });
  });

  // ------------------------------------------------------------------
  // Gallery
  // ------------------------------------------------------------------
  const grid = $('#grid');
  let galleryMap = '';
  function renderGallery(blocks) {
    grid.innerHTML = '';
    for (const b of blocks) {
      const fig = document.createElement('figure');
      fig.className = 'tile';
      const box = document.createElement('div');
      box.className = 'img';
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = b.replace(/_/g, ' ');
      img.src = `${BLOCK_DIR}${b}${galleryMap}.png`;
      box.appendChild(img);
      const cap = document.createElement('figcaption');
      cap.textContent = b.replace(/_/g, ' ');
      fig.append(box, cap);
      grid.appendChild(fig);
    }
  }
  manifestP.then((m) => renderGallery(m.blocks));
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', async () => {
    document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
    galleryMap = b.dataset.map;
    renderGallery((await manifestP).blocks);
  }));

  // ------------------------------------------------------------------
  // Preview: math helpers
  // ------------------------------------------------------------------
  const M4 = {
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
      return o;
    },
    persp(fovy, aspect, n, f) {
      const t = 1 / Math.tan(fovy / 2);
      return new Float32Array([t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]);
    },
    ortho(l, r, b, t, n, f) {
      return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0,
        -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]);
    },
    lookAt(e, c, up) {
      const z = norm(sub(e, c));
      const x = norm(cross(up, z));
      const y = cross(z, x);
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
        -dot(x, e), -dot(y, e), -dot(z, e), 1]);
    },
    inv(m) {
      const inv = new Float32Array(16);
      const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
      const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
      const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
      inv[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      inv[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      inv[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      inv[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      inv[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      inv[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      inv[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      inv[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      inv[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      inv[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      inv[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      inv[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      inv[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      inv[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      inv[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      inv[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return inv;
    },
  };
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  const srgb = (hex) => [0, 2, 4].map((i) => Math.pow(parseInt(hex.slice(i + 1, i + 3), 16) / 255, 2.2));
  const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

  // ------------------------------------------------------------------
  // Preview: the diorama
  // ------------------------------------------------------------------
  const SX = 22, SY = 16, SZ = 22, WATER_Y = 6;
  const GRASS = srgb('#91BD59'), OAK_FOL = srgb('#77AB2F'), SPRUCE_FOL = srgb('#619961'), BIRCH_FOL = srgb('#80A755');

  // Block table. flags: 1 foliage (subsurface), 2 leaves (cutout, wind),
  // 3 cross-model plant (sways from the base), 4 upper half of a tall plant
  const DEFS = [
    null,
    { n: 'grass', top: 'grass_block_top', side: 'grass_block_side', bottom: 'dirt', overlay: 'grass_block_side_overlay', topTint: GRASS, flags: 1 },
    { n: 'dirt', all: 'dirt' },
    { n: 'stone', all: 'stone' },
    { n: 'sand', all: 'sand' },
    { n: 'gravel', all: 'gravel' },
    { n: 'cobblestone', all: 'cobblestone' },
    { n: 'mossy_cobblestone', all: 'mossy_cobblestone' },
    { n: 'oak_log', top: 'oak_log_top', side: 'oak_log', bottom: 'oak_log_top' },
    { n: 'oak_leaves', all: 'oak_leaves', tint: OAK_FOL, flags: 2, transparent: true },
    { n: 'spruce_log', top: 'oak_log_top', side: 'spruce_log', bottom: 'oak_log_top' },
    { n: 'spruce_leaves', all: 'spruce_leaves', tint: SPRUCE_FOL, flags: 2, transparent: true },
    { n: 'oak_planks', all: 'oak_planks' },
    { n: 'bricks', all: 'bricks' },
    { n: 'stone_bricks', all: 'stone_bricks' },
    { n: 'mossy_stone_bricks', all: 'mossy_stone_bricks' },
    { n: 'cracked_stone_bricks', all: 'cracked_stone_bricks' },
    { n: 'deepslate', top: 'deepslate_top', side: 'deepslate', bottom: 'deepslate_top' },
    { n: 'bedrock', all: 'bedrock' },
    { n: 'coal_ore', all: 'coal_ore' },
    { n: 'iron_ore', all: 'iron_ore' },
    { n: 'gold_ore', all: 'gold_ore' },
    { n: 'diamond_ore', all: 'diamond_ore' },
    { n: 'emerald_ore', all: 'emerald_ore' },
    { n: 'lapis_ore', all: 'lapis_ore' },
    { n: 'redstone_ore', all: 'redstone_ore' },
    { n: 'glowstone', all: 'glowstone' },
    { n: 'gold_block', all: 'gold_block' },
    { n: 'iron_block', all: 'iron_block' },
    { n: 'copper_block', all: 'copper_block' },
    { n: 'andesite', all: 'andesite' },
    { n: 'granite', all: 'granite' },
    { n: 'diorite', all: 'diorite' },
    { n: 'clay', all: 'clay' },
    { n: 'obsidian', all: 'obsidian' },
    { n: 'spruce_planks', all: 'spruce_planks' },
    { n: 'birch_log', top: 'birch_log_top', side: 'birch_log', bottom: 'birch_log_top' },
    { n: 'birch_leaves', all: 'birch_leaves', tint: BIRCH_FOL, flags: 2, transparent: true },
    { n: 'dirt_path', top: 'dirt_path_top', side: 'dirt_path_side', bottom: 'dirt' },
    { n: 'diamond_block', all: 'diamond_block' },
    { n: 'amethyst_block', all: 'amethyst_block' },
    { n: 'moss_block', all: 'moss_block' },
    { n: 'short_grass', cross: 'short_grass', tint: GRASS, flags: 3, transparent: true },
    { n: 'fern', cross: 'fern', tint: GRASS, flags: 3, transparent: true },
    { n: 'tall_grass_bottom', cross: 'tall_grass_bottom', tint: GRASS, flags: 3, transparent: true },
    { n: 'tall_grass_top', cross: 'tall_grass_top', tint: GRASS, flags: 4, transparent: true },
    { n: 'dandelion', cross: 'dandelion', flags: 3, transparent: true },
    { n: 'poppy', cross: 'poppy', flags: 3, transparent: true },
  ];
  const ID = {};
  DEFS.forEach((d, i) => { if (d) ID[d.n] = i; });

  const world = new Uint8Array(SX * SY * SZ);
  const idx = (x, y, z) => (y * SZ + z) * SX + x;
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ;
  const get = (x, y, z) => (inside(x, y, z) ? world[idx(x, y, z)] : 0);
  const set = (x, y, z, b) => { if (inside(x, y, z)) world[idx(x, y, z)] = ID[b]; };
  const groundTop = new Uint8Array(SX * SZ);
  const isWater = new Uint8Array(SX * SZ);

  function rng(seed) {
    return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  }

  function buildWorld() {
    const r = rng(7);
    const heights = [];
    for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      const pond = Math.hypot((x - 15.5) / 1.25, z - 6.5);
      let h = 8 + 1.6 * Math.sin(x * 0.38 + 0.6) + 1.2 * Math.cos(z * 0.33 + 1.3) + 0.8 * Math.sin((x + z) * 0.6);
      h -= Math.max(0, 5.2 - pond) * 1.25;
      h = Math.round(Math.max(3, Math.min(11, h)));
      heights.push(h);
    }
    const H = (x, z) => heights[z * SX + x];
    for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      const h = H(x, z);
      const wet = h < WATER_Y;
      const beach = h <= WATER_Y;
      for (let y = 0; y <= h; y++) {
        let b = 'stone';
        if (y === 0) b = 'bedrock';
        else if (y === 1 && r() < 0.3) b = 'bedrock';
        else if (y <= 2) b = 'deepslate';
        else if (y >= h - 2) b = beach ? (y === h && wet && r() < 0.4 ? 'gravel' : 'sand') : (y === h ? 'grass' : 'dirt');
        else {
          const q = r();
          if (q < 0.035) b = 'coal_ore';
          else if (q < 0.055) b = 'iron_ore';
          else if (q < 0.065) b = y < 5 ? 'diamond_ore' : 'gold_ore';
          else if (q < 0.072) b = 'redstone_ore';
          else if (q < 0.078) b = 'lapis_ore';
          else if (q < 0.082) b = 'emerald_ore';
          else if (q < 0.15) b = ['andesite', 'granite', 'diorite'][Math.floor(r() * 3)];
        }
        if (y === h && beach && h === WATER_Y && r() < 0.15) b = 'clay';
        set(x, y, z, b);
      }
      groundTop[z * SX + x] = h + 1;
      isWater[z * SX + x] = h < WATER_Y ? 1 : 0;
    }
    // ensure the ore-rich edge faces show something
    set(0, 4, 9, 'diamond_ore'); set(SX - 1, 3, 12, 'diamond_ore'); set(9, 4, SZ - 1, 'gold_ore');
    set(4, 5, SZ - 1, 'emerald_ore'); set(SX - 1, 5, 17, 'redstone_ore'); set(0, 3, 14, 'lapis_ore');

    const surf = (x, z) => H(x, z) + 1;
    // oak tree
    const tree = (x, z, log, leaves, trunk, spruce) => {
      const y0 = surf(x, z);
      if (spruce) {
        for (let y = 0; y < trunk + 2; y++) {
          const rad = y < 2 ? 0 : Math.max(0, Math.round((trunk + 2 - y) * 0.45));
          for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
            if (Math.abs(dx) + Math.abs(dz) > rad + (y % 2 ? 0 : 1)) continue;
            if (get(x + dx, y0 + y, z + dz) === 0) set(x + dx, y0 + y, z + dz, leaves);
          }
        }
        set(x, y0 + trunk + 2, z, leaves);
      } else {
        for (let dy = trunk - 2; dy <= trunk + 1; dy++) {
          const rad = dy >= trunk ? 1 : 2;
          for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
            if (Math.abs(dx) === rad && Math.abs(dz) === rad && (dy === trunk + 1 || r() < 0.5)) continue;
            set(x + dx, y0 + dy, z + dz, leaves);
          }
        }
      }
      for (let y = 0; y < trunk; y++) set(x, y0 + y, z, log);
    };
    tree(5, 6, 'oak_log', 'oak_leaves', 5, false);
    tree(17, 16, 'spruce_log', 'spruce_leaves', 6, true);
    tree(3, 17, 'birch_log', 'birch_leaves', 5, false);

    // ruined wall
    for (let x = 8; x <= 13; x++) {
      const y0 = surf(x, 19);
      const hgt = [2, 3, 3, 2, 1, 2][x - 8];
      for (let y = 0; y < hgt; y++) {
        const q = r();
        set(x, y0 + y, 19, q < 0.3 ? 'mossy_stone_bricks' : q < 0.45 ? 'cracked_stone_bricks' : 'stone_bricks');
      }
    }
    // cobble path + lamp post
    for (let z = 9; z <= 17; z++) {
      const x = 8 + Math.round(Math.sin(z * 0.6));
      const y = surf(x, z) - 1;
      if (get(x, y, z) === ID.grass) set(x, y, z, r() < 0.65 ? 'dirt_path' : r() < 0.5 ? 'mossy_cobblestone' : 'gravel');
    }
    {
      const y0 = surf(10, 12);
      set(10, y0, 12, 'cobblestone'); set(10, y0 + 1, 12, 'cobblestone'); set(10, y0 + 2, 12, 'glowstone');
      lampPos = [10.5, y0 + 2.5, 12.5];
    }
    // display blocks
    [['gold_block', 3, 10], ['iron_block', 4, 11], ['copper_block', 3, 12], ['diamond_block', 4, 9], ['amethyst_block', 2, 11]].forEach(([b, x, z]) => {
      set(x, surf(x, z), z, b);
    });
    // brick + plank shed corner
    for (let y = 0; y < 3; y++) {
      set(18, surf(18, 19) + y, 19, 'bricks');
      set(19, surf(19, 19) + y, 19, 'bricks');
      set(19, surf(19, 18) + y, 18, y === 1 ? 'spruce_planks' : 'bricks');
    }
    // dock into the pond
    for (let x = 11; x <= 14; x++) if (H(x, 6) <= WATER_Y) set(x, WATER_Y + 1, 6, 'oak_planks');
    // ground cover: grass tufts, ferns, tall grass and a few flowers on open grass
    for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      const y = surf(x, z);
      if (get(x, y - 1, z) !== ID.grass || get(x, y, z) !== 0) continue;
      const q = r();
      if (q < 0.30) set(x, y, z, 'short_grass');
      else if (q < 0.36) set(x, y, z, 'fern');
      else if (q < 0.41 && get(x, y + 1, z) === 0) { set(x, y, z, 'tall_grass_bottom'); set(x, y + 1, z, 'tall_grass_top'); }
      else if (q < 0.45) set(x, y, z, r() < 0.5 ? 'dandelion' : 'poppy');
      else if (q < 0.47) set(x, y - 1, z, 'moss_block');
    }
  }
  let lampPos = [10.5, 10, 12.5];

  // Mesh: pos3 n3 t3 b3 uv2 layer overlay tint3 flags ao = 21 floats
  const STRIDE = 21;
  const FACES = [
    { n: [0, 1, 0], o: [0, 1, 0], t: [1, 0, 0], b: [0, 0, 1], k: 'top' },
    { n: [0, -1, 0], o: [0, 0, 1], t: [1, 0, 0], b: [0, 0, -1], k: 'bottom' },
    { n: [1, 0, 0], o: [1, 1, 1], t: [0, 0, -1], b: [0, -1, 0], k: 'side' },
    { n: [-1, 0, 0], o: [0, 1, 0], t: [0, 0, 1], b: [0, -1, 0], k: 'side' },
    { n: [0, 0, 1], o: [0, 1, 1], t: [1, 0, 0], b: [0, -1, 0], k: 'side' },
    { n: [0, 0, -1], o: [1, 1, 0], t: [-1, 0, 0], b: [0, -1, 0], k: 'side' },
  ];

  function opaque(b) { return b !== 0 && !DEFS[b].transparent; }

  function buildMesh(layerOf) {
    const v = [];
    const ind = [];
    for (let y = 0; y < SY; y++) for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      const id = get(x, y, z);
      if (!id) continue;
      const d = DEFS[id];
      if (d.cross) {
        // two crossed double-sided quads, lit as if facing up (how plants are usually shaded)
        const layer = layerOf[d.cross];
        const tint = d.tint || [1, 1, 1];
        for (const [ax, az, bx, bz] of [[0.15, 0.15, 0.85, 0.85], [0.85, 0.15, 0.15, 0.85]]) {
          const t = norm([bx - ax, 0, bz - az]);
          const base = v.length / STRIDE;
          for (const [u, w] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
            const p = [x + ax + (bx - ax) * u, y + 1 - w, z + az + (bz - az) * u];
            v.push(...p, 0, 1, 0, ...t, 0, -1, 0, u, w, layer, -1, ...tint, d.flags, 1);
          }
          ind.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 2, base + 1, base, base + 3, base + 2);
        }
        continue;
      }
      for (const f of FACES) {
        const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
        const nb = get(nx, ny, nz);
        if (opaque(nb) || (nb === id && !d.flags)) continue;
        // faces under the pond surface still render (seen through water)
        const tex = d.all || d[f.k];
        const layer = layerOf[tex];
        const overlay = f.k === 'side' && d.overlay ? layerOf[d.overlay] : -1;
        const tint = d.tint || (f.k === 'top' && d.topTint) || (overlay >= 0 ? GRASS : [1, 1, 1]);
        const base = v.length / STRIDE;
        const flags = d.flags || 0;
        for (const [u, w] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
          const p = [x + f.o[0] + f.t[0] * u + f.b[0] * w, y + f.o[1] + f.t[1] * u + f.b[1] * w, z + f.o[2] + f.t[2] * u + f.b[2] * w];
          // vertex ambient occlusion from the 3 neighbours in front of this corner
          const su = u ? 1 : -1, sv = w ? 1 : -1;
          const s1 = opaque(get(nx + f.t[0] * su, ny + f.t[1] * su, nz + f.t[2] * su)) ? 1 : 0;
          const s2 = opaque(get(nx + f.b[0] * sv, ny + f.b[1] * sv, nz + f.b[2] * sv)) ? 1 : 0;
          const c = opaque(get(nx + f.t[0] * su + f.b[0] * sv, ny + f.t[1] * su + f.b[1] * sv, nz + f.t[2] * su + f.b[2] * sv)) ? 1 : 0;
          const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
          v.push(...p, ...f.n, ...f.t, ...f.b, u, w, layer, overlay, ...tint, flags, 0.42 + 0.58 * ao / 3);
        }
        const flip = dot(cross(f.t, f.b), f.n) < 0;
        if (flip) ind.push(base, base + 2, base + 1, base, base + 3, base + 2);
        else ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    return { verts: new Float32Array(v), inds: new Uint32Array(ind) };
  }

  function buildWaterMesh() {
    const v = [], ind = [];
    const top = WATER_Y + 0.875;
    const quad = (pts, n) => {
      const base = v.length / 6;
      pts.forEach((p) => v.push(...p, ...n));
      const e1 = sub(pts[1], pts[0]), e2 = sub(pts[2], pts[0]);
      if (dot(cross(e1, e2), n) < 0) ind.push(base, base + 2, base + 1, base, base + 3, base + 2);
      else ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
      if (!isWater[z * SX + x]) continue;
      quad([[x, top, z], [x + 1, top, z], [x + 1, top, z + 1], [x, top, z + 1]], [0, 1, 0]);
      const g = groundTop[z * SX + x];
      // walls at the edge of the diorama
      if (x === 0) quad([[0, g, z], [0, g, z + 1], [0, top, z + 1], [0, top, z]], [-1, 0, 0]);
      if (x === SX - 1) quad([[SX, g, z + 1], [SX, g, z], [SX, top, z], [SX, top, z + 1]], [1, 0, 0]);
      if (z === 0) quad([[x + 1, g, 0], [x, g, 0], [x, top, 0], [x + 1, top, 0]], [0, 0, -1]);
      if (z === SZ - 1) quad([[x, g, SZ], [x + 1, g, SZ], [x + 1, top, SZ], [x, top, SZ]], [0, 0, 1]);
    }
    return { verts: new Float32Array(v), inds: new Uint32Array(ind) };
  }

  // ------------------------------------------------------------------
  // Preview: GLSL (ported from the shader pack's lib/common + lib/lighting)
  // ------------------------------------------------------------------
  const COMMON = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
precision highp sampler2DShadow;
const float PI = 3.14159265;
uniform vec3 uSunDir;   // world, toward the sun
uniform vec3 uLightDir; // world, toward the shadow-casting light
uniform vec3 uLightCol;
uniform vec3 uSkyAmb;
uniform float uRain;
uniform float uTime;
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float dayFactor(float h) { return smoothstep(-0.06, 0.18, h); }
vec3 sunlightColor(float h) {
  vec3 c = mix(vec3(1.0, 0.42, 0.14), vec3(1.0, 0.92, 0.80), smoothstep(0.0, 0.45, h));
  return c * 3.2 * smoothstep(-0.02, 0.10, h);
}
vec3 skyColorAt(vec3 dir, vec3 sunDir) {
  float sunH = sunDir.y;
  float day = dayFactor(sunH);
  float up = max(dir.y, 0.0);
  float horizon = pow(1.0 - up, 4.0);
  vec3 col = mix(mix(vec3(0.003, 0.006, 0.016), vec3(0.010, 0.016, 0.032), horizon),
                 mix(vec3(0.10, 0.27, 0.72), vec3(0.58, 0.74, 0.98), horizon) * 1.5, day);
  float sd = max(dot(dir, sunDir), 0.0);
  float twilight = 1.0 - smoothstep(0.0, 0.32, abs(sunH + 0.03));
  col += vec3(1.25, 0.42, 0.10) * twilight * pow(1.0 - up, 5.0) * (0.25 + 0.75 * pow(sd, 3.0)) * 1.6;
  col += sunlightColor(max(sunH, 0.0)) * (pow(sd, 10.0) * 0.18 + pow(sd, 120.0) * 0.6) * smoothstep(-0.1, 0.05, sunH);
  col = mix(col, col * vec3(0.35, 0.36, 0.38), smoothstep(0.0, -0.25, dir.y));
  col = mix(col, vec3(luma(col)) * vec3(0.9, 0.95, 1.0) * 0.65, uRain * 0.85);
  return col;
}
vec3 windOffset(vec3 wp, float amount) {
  float t = uTime;
  float gust = 0.6 + 0.4 * sin(t * 0.35 + wp.x * 0.05 + wp.z * 0.04);
  float s = amount * gust * (1.0 + uRain * 1.5);
  vec3 o;
  o.x = sin(t * 1.7 + wp.x * 0.6 + wp.z * 0.3) * 0.55 + sin(t * 3.3 + wp.x * 1.4 + wp.y * 0.8) * 0.2;
  o.z = sin(t * 1.3 + wp.z * 0.7 + wp.x * 0.25) * 0.45 + sin(t * 2.9 + wp.z * 1.2 + wp.y) * 0.2;
  o.y = sin(t * 2.1 + wp.x + wp.z) * 0.08;
  return o * s * 0.07;
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float waterHeight(vec2 p) {
  float t = uTime;
  float h = sin(dot(p, vec2(0.82, 0.57)) * 0.55 + t * 0.8) * 0.30 + sin(dot(p, vec2(-0.48, 0.88)) * 0.90 + t * 1.1) * 0.18;
  vec2 q = p * 1.1;
  float amp = 0.55;
  const mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    float n = vnoise(q + t * vec2(0.45, 0.30) * (1.0 + float(i) * 0.7));
    h += (1.0 - abs(n * 2.0 - 1.0) - 0.5) * amp;
    q = rot * q * 2.07;
    amp *= 0.45;
  }
  return h;
}
float caustics(vec2 p) {
  float t = uTime * 0.7;
  vec2 q = p * 1.6;
  float a = vnoise(q + vec2(t * 0.6, t * 0.3) + vnoise(q * 0.7 - t * 0.2) * 1.5);
  float b = vnoise(q * 1.3 - vec2(t * 0.4, -t * 0.5) + vnoise(q * 0.9 + t * 0.25) * 1.5);
  float ra = 1.0 - abs(a * 2.0 - 1.0), rb = 1.0 - abs(b * 2.0 - 1.0);
  return pow(ra, 6.0) + pow(rb, 6.0) + pow(ra * rb, 3.0) * 1.5;
}
vec3 waterNormal(vec2 p, float strength) {
  const float e = 0.03;
  float dx = (waterHeight(p + vec2(e, 0.0)) - waterHeight(p - vec2(e, 0.0))) / (2.0 * e);
  float dz = (waterHeight(p + vec2(0.0, e)) - waterHeight(p - vec2(0.0, e))) / (2.0 * e);
  return normalize(vec3(-dx * strength, 1.0, -dz * strength));
}
vec3 fresnelSchlick(float c, vec3 F0) { return F0 + (1.0 - F0) * pow(1.0 - c, 5.0); }
float ggx(vec3 N, vec3 V, vec3 L, float r) {
  vec3 H = normalize(V + L);
  float NdotH = max(dot(N, H), 0.0), NdotL = max(dot(N, L), 0.0), NdotV = max(dot(N, V), 0.001);
  float a2 = r * r;
  float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
  float k = r * 0.5;
  float G = (NdotL / (NdotL * (1.0 - k) + k)) * (NdotV / (NdotV * (1.0 - k) + k));
  return a2 / (PI * d * d) * G / max(4.0 * NdotL * NdotV, 0.001);
}
`;

  const SHADOW_LIB = `
uniform sampler2DShadow uShadow;
uniform mat4 uShadowVP;
const vec2 poisson[12] = vec2[12](
  vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
  vec2(0.962, -0.195), vec2(0.473, -0.480), vec2(0.519, 0.767), vec2(0.185, -0.893),
  vec2(0.507, 0.064), vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598));
float getShadow(vec3 wp, vec3 n, float NdotL) {
  vec3 p = wp + n * (0.03 + 0.06 * (1.0 - NdotL));
  vec4 c = uShadowVP * vec4(p, 1.0);
  vec3 s = c.xyz / c.w * 0.5 + 0.5;
  s.z -= 0.0006;
  float a = ign(gl_FragCoord.xy) * 6.2831853;
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  float sum = 0.0;
  for (int i = 0; i < 12; i++) sum += texture(uShadow, vec3(s.xy + rot * poisson[i] * (1.7 / 2048.0), s.z));
  return sum / 12.0;
}
`;

  const SCENE_VS = `${COMMON}
uniform mat4 uVP;
uniform float uMode;
in vec3 aPos; in vec3 aN; in vec3 aT; in vec3 aB; in vec2 aUV;
in float aLayer; in float aOverlay; in vec3 aTint; in float aFlags; in float aAO;
out vec3 vPos; out vec3 vN; out vec3 vT; out vec3 vB; out vec2 vUV;
flat out float vLayer; flat out float vOverlay; out vec3 vTint; flat out float vFlags; out float vAO;
void main() {
  vec3 p = aPos;
  if (uMode > 0.5) {
    if (aFlags > 2.5) p += windOffset(aPos, 0.9) * (aFlags > 3.5 ? 2.0 - aUV.y : 1.0 - aUV.y);
    else if (aFlags > 1.5) p += windOffset(p, 0.45);
  }
  vPos = p; vN = aN; vT = aT; vB = aB; vUV = aUV; vLayer = aLayer; vOverlay = aOverlay;
  vTint = aTint; vFlags = aFlags; vAO = aAO;
  gl_Position = uVP * vec4(p, 1.0);
}`;

  const SCENE_FS = `${COMMON}${SHADOW_LIB}
uniform sampler2DArray uAlb, uNrm, uSpec;
uniform vec3 uCam;
uniform vec3 uLamp;
uniform float uMode;    // 0 vanilla look, 1 shaders
uniform float uPbr;
uniform float uClipY;   // reflection pass: drop everything below the water
uniform float uLampOn;
uniform sampler2D uGround;  // per column: ground top height, +128 if the column holds water
uniform float uWaterTop;
in vec3 vPos; in vec3 vN; in vec3 vT; in vec3 vB; in vec2 vUV;
flat in float vLayer; flat in float vOverlay; in vec3 vTint; flat in float vFlags; in float vAO;
out vec4 frag;
void main() {
  if (vPos.y < uClipY) discard;
  vec2 uv = vUV;
  vec2 dx = dFdx(vUV), dy = dFdy(vUV);
  float pomShadow = 1.0;
  // Parallax occlusion mapping from the LabPBR height (normal alpha: 1 = surface, 0 = 1/4 block deep)
  vec3 T = normalize(vT), Bt = normalize(vB), Nf = normalize(vN);
  vec3 toFrag = vPos - uCam;
  float fragDist = length(toFrag);
  vec3 tView = vec3(dot(T, toFrag), dot(Bt, toFrag), dot(Nf, toFrag)) / fragDist;
  float depthScale = 0.25 * (1.0 - smoothstep(26.0, 40.0, fragDist));
  if (uPbr > 0.5 && uMode > 0.5 && vFlags < 1.5 && vOverlay < 0.0 && tView.z < -0.02 && depthScale > 0.001) {
    const float layers = 32.0;
    vec2 delta = tView.xy / -tView.z * depthScale / layers;
    float rayH = 1.0;
    float h = textureGrad(uNrm, vec3(uv, vLayer), dx, dy).a;
    for (int i = 0; i < 32; i++) {
      if (h >= rayH) break;
      uv += delta;
      rayH -= 1.0 / layers;
      h = textureGrad(uNrm, vec3(uv, vLayer), dx, dy).a;
    }
    vec2 prev = uv - delta;
    float after = h - rayH;
    float before = textureGrad(uNrm, vec3(prev, vLayer), dx, dy).a - (rayH + 1.0 / layers);
    uv = mix(uv, prev, clamp(after / (after - before + 1e-5), 0.0, 1.0));
    vec3 tL = vec3(dot(T, uLightDir), dot(Bt, uLightDir), dot(Nf, uLightDir));
    if (tL.z > 0.0) {
      float sh = textureGrad(uNrm, vec3(uv, vLayer), dx, dy).a;
      vec2 sdelta = tL.xy / tL.z * depthScale / layers;
      vec2 sc = uv;
      float blocked = 0.0;
      for (int i = 0; i < 16; i++) {
        sc += sdelta;
        sh += 1.0 / layers;
        if (sh >= 1.0) break;
        blocked = max(blocked, clamp((textureGrad(uNrm, vec3(sc, vLayer), dx, dy).a - sh) * layers * 0.5, 0.0, 1.0));
      }
      pomShadow = 1.0 - blocked;
    }
  }
  vec4 a = textureGrad(uAlb, vec3(uv, vLayer), dx, dy);
  vec4 nm = textureGrad(uNrm, vec3(uv, vLayer), dx, dy);
  vec4 sp = textureGrad(uSpec, vec3(uv, vLayer), dx, dy);
  vec3 albedo = a.rgb;
  if (vOverlay >= 0.0) {
    vec4 o = textureGrad(uAlb, vec3(uv, vOverlay), dx, dy);
    albedo = mix(albedo, o.rgb * vTint, o.a);
    nm = mix(nm, textureGrad(uNrm, vec3(uv, vOverlay), dx, dy), o.a);
    sp = mix(sp, textureGrad(uSpec, vec3(uv, vOverlay), dx, dy), o.a);
  } else {
    albedo *= vTint;
  }
  if (a.a < 0.5) discard;

  vec3 geoN = normalize(vN);
  vec3 V = normalize(uCam - vPos);
  float lampD = length(uLamp - vPos);
  vec3 lampL = vec3(1.0, 0.62, 0.30) * 3.0 * uLampOn / (1.0 + lampD * lampD * 0.35) * smoothstep(9.0, 3.0, lampD);

  if (uMode < 0.5) {
    // vanilla-style: flat textures, fixed face shading, baked AO, no maps
    float face = geoN.y > 0.5 ? 1.0 : geoN.y < -0.5 ? 0.5 : abs(geoN.x) > 0.5 ? 0.6 : 0.8;
    float sky = mix(0.2, 1.0, dayFactor(uSunDir.y)) * (1.0 - uRain * 0.3);
    vec3 c = albedo * face * vAO * (sky + lampL * 0.5);
    c += albedo * max(sp.a * 255.0 < 254.5 ? sp.a : 0.0, 0.0) * 1.2;
    frag = vec4(c, 1.0);
    return;
  }

  vec3 N = geoN;
  float ao = 1.0;
  float rough = 0.85; vec3 F0 = vec3(0.04); float metal = 0.0; float sss = 0.0; float emis = 0.0;
  if (uPbr > 0.5) {
    vec2 nxy = nm.xy * 2.0 - 1.0;
    N = normalize(mat3(normalize(vT), normalize(vB), geoN) * vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.0))));
    ao = nm.b;
    rough = clamp(pow(1.0 - sp.r, 2.0), 0.02, 1.0);
    float g = sp.g * 255.0;
    if (g > 229.5) {
      metal = 1.0;
      F0 = g < 230.5 ? vec3(0.56, 0.57, 0.58) : g < 231.5 ? vec3(1.0, 0.71, 0.29) : g < 234.5 ? vec3(0.95, 0.64, 0.54) : albedo;
      if (g > 231.5 && g < 233.5) F0 = vec3(0.91, 0.92, 0.92);
    } else F0 = vec3(sp.g);
    float b = sp.b * 255.0;
    sss = b > 64.5 ? (b - 65.0) / 190.0 : 0.0;
    float e = sp.a * 255.0;
    emis = e < 254.5 ? e / 254.0 : 0.0;
  } else if (vFlags > 0.5) {
    sss = 0.6;
  }
  if (dot(N, V) < 0.0) N = normalize(N + geoN * (0.05 - dot(N, V)));

  // rain: darker, glossier upward faces with puddles in the hollows
  float wetUp = smoothstep(0.7, 0.95, geoN.y) * uRain * (1.0 - step(0.5, vFlags) * 0.6);
  float puddle = smoothstep(0.45, 0.75, 1.0 - ao + 0.55 * sin(vPos.x * 0.91) * sin(vPos.z * 0.77));
  float wet = wetUp * mix(0.45, 1.0, puddle);
  albedo *= 1.0 - 0.45 * wet;
  rough = mix(rough, 0.03, wet);
  N = normalize(mix(N, geoN, wet * puddle));

  vec3 diff = albedo * (1.0 - metal);
  vec3 L = uLightDir;
  float NdotL = max(dot(N, L), 0.0);
  float geoL = smoothstep(-0.02, 0.12, dot(geoN, L));
  float shadow = (dot(geoN, L) > 0.0 || sss > 0.0) ? getShadow(vPos, geoN, max(dot(geoN, L), 0.0)) : 0.0;
  vec3 light = uLightCol * shadow * pomShadow;
  vec3 uwAmb = vec3(1.0);
  if (vPos.y < uWaterTop) {
    ivec2 cell = ivec2(floor(vPos.xz - geoN.xz * 0.01));
    if (cell.x >= 0 && cell.y >= 0 && cell.x < ${SX} && cell.y < ${SZ} && texelFetch(uGround, cell, 0).r * 255.0 > 127.5) {
      float dh = uWaterTop - vPos.y;
      float path = dh / max(L.y, 0.25);
      float c = caustics(vPos.xz + L.xz * path);
      light *= exp(-path * vec3(0.45, 0.12, 0.09)) * (0.4 + 1.8 * c * exp(-dh * 0.15));
      uwAmb = exp(-dh * vec3(0.30, 0.10, 0.08));
    }
  }
  vec3 F = fresnelSchlick(max(dot(normalize(V + L), V), 0.0), F0);
  float plant = step(2.5, vFlags);  // thin sprites: softer direct light, no sky sheen
  vec3 col = diff * (1.0 - F) * NdotL * geoL * light * (1.0 - 0.35 * plant);
  col += F * ggx(N, V, L, max(rough, 0.04)) * NdotL * geoL * light * (1.0 - plant);
  col += diff * sss * light * (0.25 + 1.5 * pow(max(dot(-V, L), 0.0), 6.0)) * 0.5;
  float skyL = vAO;
  vec3 amb = uSkyAmb * skyL * (0.55 + 0.45 * N.y) * uwAmb;
  col += diff * amb * ao;
  vec3 R = reflect(-V, N);
  vec3 env = skyColorAt(normalize(vec3(R.x, abs(R.y), R.z)), uSunDir) * 0.6;
  vec3 Fa = fresnelSchlick(max(dot(N, V), 0.0), F0);
  col += Fa * mix(amb * 1.4, env, (1.0 - rough) * (1.0 - rough)) * ao * vAO * (1.0 - plant);
  col += diff * lampL * max(dot(N, normalize(uLamp - vPos)), 0.0) * ao;
  col += albedo * emis * 6.0;
  col += diff * vec3(0.012, 0.012, 0.016) * ao;

  // aerial perspective
  float dist = length(uCam - vPos);
  vec3 fogC = skyColorAt(-V, uSunDir);
  col = mix(col, fogC, 1.0 - exp(-dist * (0.004 + uRain * 0.016)));
  frag = vec4(col, 1.0);
}`;

  const SHADOW_VS = `${COMMON}
uniform mat4 uVP;
in vec3 aPos; in vec2 aUV; in float aLayer; in float aFlags;
out vec2 vUV; flat out float vLayer;
void main() {
  vec3 p = aPos;
  if (aFlags > 2.5) p += windOffset(aPos, 0.9) * (aFlags > 3.5 ? 2.0 - aUV.y : 1.0 - aUV.y);
  else if (aFlags > 1.5) p += windOffset(p, 0.45);
  vUV = aUV; vLayer = aLayer;
  gl_Position = uVP * vec4(p, 1.0);
}`;
  const SHADOW_FS = `${COMMON}
uniform sampler2DArray uAlb;
in vec2 vUV; flat in float vLayer;
out vec4 frag;
void main() {
  if (texture(uAlb, vec3(vUV, vLayer)).a < 0.5) discard;
  frag = vec4(1.0);
}`;

  const FULL_VS = `#version 300 es
out vec2 vUV;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUV = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const SKY_FS = `${COMMON}
uniform mat4 uInvVP;
uniform float uMode;
in vec2 vUV;
out vec4 frag;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec4 a = uInvVP * vec4(vUV * 2.0 - 1.0, -1.0, 1.0);
  vec4 b = uInvVP * vec4(vUV * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize(b.xyz / b.w - a.xyz / a.w);
  if (uMode < 0.5) {
    float day = dayFactor(uSunDir.y);
    vec3 c = mix(vec3(0.0, 0.0, 0.02), mix(vec3(0.47, 0.65, 1.0), vec3(0.75, 0.85, 1.0), pow(1.0 - max(dir.y, 0.0), 3.0)), day);
    c = pow(c, vec3(2.2));
    float sd = dot(dir, uSunDir);
    if (sd > 0.9985) c = vec3(1.0, 1.0, 0.85);
    frag = vec4(c, 1.0);
    return;
  }
  vec3 col = skyColorAt(dir, uSunDir);
  // sun disc and moon
  float sd = dot(dir, uSunDir);
  col += vec3(1.0, 0.93, 0.82) * 40.0 * smoothstep(0.99955, 0.99975, sd) * smoothstep(-0.03, 0.02, uSunDir.y) * (1.0 - uRain);
  float md = dot(dir, -uSunDir);
  float night = 1.0 - dayFactor(uSunDir.y);
  col += vec3(0.85, 0.9, 1.0) * 1.5 * smoothstep(0.99965, 0.99985, md) * night * (1.0 - uRain);
  // stars
  vec3 sp = floor(dir * 300.0);
  float st = step(0.9975, hash(sp)) * smoothstep(0.0, 0.2, dir.y);
  col += vec3(0.9, 0.95, 1.0) * st * night * 0.6 * (1.0 - uRain);
  frag = vec4(col, 1.0);
}`;

  const WATER_VS = `${COMMON}
uniform mat4 uVP;
in vec3 aPos; in vec3 aN;
out vec3 vPos; out vec3 vN;
void main() { vPos = aPos; vN = aN; gl_Position = uVP * vec4(aPos, 1.0); }`;

  const WATER_FS = `${COMMON}${SHADOW_LIB}
uniform vec3 uCam;
uniform vec2 uRes;
uniform sampler2D uRefl;
uniform sampler2D uScene;   // opaque scene, copied before the water is drawn
uniform sampler2D uGround;
uniform float uMode;
in vec3 vPos; in vec3 vN;
out vec4 frag;
float colData(ivec2 c) { return texelFetch(uGround, clamp(c, ivec2(0), ivec2(${SX - 1}, ${SZ - 1})), 0).r * 255.0; }
bool isWater(ivec2 c) {
  if (c.x < 0 || c.y < 0 || c.x >= ${SX} || c.y >= ${SZ}) return true;  // open water past the edge
  return colData(c) > 127.5;
}
void main() {
  vec3 V = normalize(uCam - vPos);
  bool top = vN.y > 0.5;
  vec2 suv = gl_FragCoord.xy / uRes;
  if (uMode < 0.5) {
    vec3 behind = texture(uScene, suv).rgb;
    frag = vec4(behind * 0.35 + vec3(0.03, 0.08, 0.35) * mix(0.2, 1.0, dayFactor(uSunDir.y)), 1.0);
    return;
  }
  float dist = length(uCam - vPos);
  vec3 N = top ? waterNormal(vPos.xz, 0.16 * exp(-dist * 0.015)) : vN;
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  ivec2 cell = ivec2(floor(vPos.xz - vN.xz * 0.01));
  float ground = mod(colData(cell), 128.0);
  float vdepth = max(vPos.y - ground, 0.0);
  float depth = top ? vdepth / max(V.y, 0.25) : vdepth * 0.5 + 1.5;
  vec3 transmit = exp(-depth * vec3(0.65, 0.26, 0.22));

  // refraction: look through the wave-bent surface
  vec2 lean = top ? N.xz : vec2(0.0);
  vec3 behind = texture(uScene, suv + lean * 0.07 * clamp(vdepth * 0.5, 0.0, 1.0) / max(1.0, dist * 0.04)).rgb;

  vec3 scatter = vec3(0.006, 0.05, 0.055) * (uSkyAmb * 2.0 + uLightCol * 0.15) * (1.0 - transmit);
  vec3 refl = top ? texture(uRefl, suv + N.xz * 0.035).rgb : skyColorAt(reflect(-V, N), uSunDir);
  vec3 L = uLightDir;
  float sh = getShadow(vPos, vec3(0.0, 1.0, 0.0), 1.0);
  vec3 spec = fresnelSchlick(max(dot(normalize(V + L), V), 0.0), vec3(0.02)) * ggx(N, V, L, 0.05) * max(dot(N, L), 0.0) * uLightCol * sh;
  vec3 col = (behind * transmit + scatter) * (1.0 - fres) + refl * fres + min(spec, vec3(60.0));

  if (top) {
    // foam along the shore: distance to the nearest land edge of this cell
    vec2 f = fract(vPos.xz);
    float d = 1.0;
    if (!isWater(cell + ivec2(-1, 0))) d = min(d, f.x);
    if (!isWater(cell + ivec2(1, 0))) d = min(d, 1.0 - f.x);
    if (!isWater(cell + ivec2(0, -1))) d = min(d, f.y);
    if (!isWater(cell + ivec2(0, 1))) d = min(d, 1.0 - f.y);
    float n = vnoise(vPos.xz * 3.0 + uTime * 0.25) * 0.6 + vnoise(vPos.xz * 9.0 - uTime * 0.4) * 0.4;
    float edge = smoothstep(0.35, 0.0, d + (n - 0.5) * 0.12);
    float foam = edge * smoothstep(0.5, 0.72, n + edge * 0.4);
    vec3 foamLight = uSkyAmb * 1.2 + uLightCol * 0.45 * sh;
    col = mix(col, vec3(0.85) * foamLight, foam * 0.9);
  }
  frag = vec4(col, 1.0);
}`;

  const POST_FS = `${COMMON}
uniform sampler2D uHdr;
uniform vec2 uRes;
uniform float uMode;
uniform float uExposure;
in vec2 vUV;
out vec4 frag;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 col = texture(uHdr, vUV).rgb;
  if (uMode < 0.5) {
    frag = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
    return;
  }
  vec2 px = 1.0 / uRes;
  vec3 bloom = vec3(0.0); float ws = 0.0;
  for (int i = 2; i <= 6; i++) {
    float lod = float(i);
    vec2 o = px * exp2(lod) * 0.75;
    vec3 b = textureLod(uHdr, vUV + o, lod).rgb + textureLod(uHdr, vUV - o, lod).rgb
           + textureLod(uHdr, vUV + vec2(o.x, -o.y), lod).rgb + textureLod(uHdr, vUV + vec2(-o.x, o.y), lod).rgb;
    float w = 1.0 / (1.0 + float(i - 2) * 0.5);
    bloom += b * 0.25 * w; ws += w;
  }
  bloom /= ws;
  col += max(bloom - 0.8, 0.0) * 0.10 + bloom * 0.012;
  col *= uExposure;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  col = mix(vec3(luma(col)), col, 1.05);
  vec2 c = vUV - 0.5;
  col *= 1.0 - dot(c, c) * 0.4;
  // rain streaks
  if (uRain > 0.0) {
    vec2 r = vec2(vUV.x * 90.0 + vUV.y * 6.0, vUV.y * 6.0 + uTime * 9.0);
    float lane = floor(r.x);
    float h = fract(sin(lane * 91.7) * 4375.85);
    float y = fract(r.y * (0.6 + h) + h * 7.0);
    float drop = smoothstep(0.0, 0.08, y) * smoothstep(0.24, 0.08, y) * smoothstep(0.5, 0.0, abs(fract(r.x) - 0.5) * 2.0 - 0.3);
    col += vec3(0.55, 0.6, 0.65) * drop * 0.12 * uRain * step(0.55, h);
  }
  col += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  frag = vec4(col, 1.0);
}`;

  // ------------------------------------------------------------------
  // Preview: GL setup
  // ------------------------------------------------------------------
  const canvas = $('#view');
  const msg = $('#stageMsg');
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) { msg.textContent = 'WebGL2 is not available in this browser, so the live preview is off.'; return; }
  const hdrOK = !!gl.getExtension('EXT_color_buffer_float');
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

  function compile(vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }

  let progs;
  try {
    progs = {
      scene: compile(SCENE_VS, SCENE_FS),
      shadow: compile(SHADOW_VS, SHADOW_FS),
      sky: compile(FULL_VS, SKY_FS),
      water: compile(WATER_VS, WATER_FS),
      post: compile(FULL_VS, POST_FS),
    };
  } catch (e) {
    console.error(e);
    msg.textContent = 'Could not compile the preview shaders on this device.';
    return;
  }

  function setU(prog, name, val) {
    const loc = prog.u[name];
    if (loc == null) return;
    if (typeof val === 'number') gl.uniform1f(loc, val);
    else if (val.length === 2) gl.uniform2fv(loc, val);
    else if (val.length === 3) gl.uniform3fv(loc, val);
    else if (val.length === 16) gl.uniformMatrix4fv(loc, false, val);
  }
  function setI(prog, name, unit) { if (prog.u[name] != null) gl.uniform1i(prog.u[name], unit); }

  function makeVAO(prog, mesh, layout, stride) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.verts, gl.STATIC_DRAW);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.inds, gl.STATIC_DRAW);
    let off = 0;
    for (const [name, size] of layout) {
      const loc = gl.getAttribLocation(prog.p, name);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4);
      }
      off += size;
    }
    gl.bindVertexArray(null);
    return { vao, count: mesh.inds.length };
  }

  const SCENE_LAYOUT = [['aPos', 3], ['aN', 3], ['aT', 3], ['aB', 3], ['aUV', 2], ['aLayer', 1], ['aOverlay', 1],
    ['aTint', 3], ['aFlags', 1], ['aAO', 1]];

  // render targets
  const SHADOW_RES = 2048;
  const shadowTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, shadowTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW_RES, SHADOW_RES);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  const shadowFB = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
  const shadowColor = gl.createRenderbuffer(); // some drivers want a colour attachment
  gl.bindRenderbuffer(gl.RENDERBUFFER, shadowColor);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, SHADOW_RES, SHADOW_RES);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, shadowColor);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const COLOR_FMT = hdrOK ? gl.RGBA16F : gl.RGBA8;
  let W = 0, H = 0, samples = 0;
  let msFB, msColor, msDepth, hdrFB, hdrTex, reflFB, reflTex, reflDepth, copyFB, copyTex, levels = 1;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w === W && h === H) return;
    W = canvas.width = w;
    H = canvas.height = h;
    for (const o of [msFB, hdrFB, reflFB, copyFB]) if (o) gl.deleteFramebuffer(o);
    for (const o of [msColor, msDepth, reflDepth]) if (o) gl.deleteRenderbuffer(o);
    for (const o of [hdrTex, reflTex, copyTex]) if (o) gl.deleteTexture(o);

    samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
    msFB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFB);
    msColor = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, msColor);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, COLOR_FMT, W, H);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msColor);
    msDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, msDepth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, W, H);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDepth);

    levels = Math.floor(Math.log2(Math.max(W, H))) + 1;
    hdrTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, hdrTex);
    gl.texStorage2D(gl.TEXTURE_2D, levels, COLOR_FMT, W, H);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    hdrFB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, hdrTex, 0);

    copyTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, copyTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, COLOR_FMT, W, H);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    copyFB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, copyFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, copyTex, 0);

    const rw = Math.max(1, W >> 1), rh = Math.max(1, H >> 1);
    reflTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, reflTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, COLOR_FMT, rw, rh);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    reflFB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, reflFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, reflTex, 0);
    reflDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, reflDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, rw, rh);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, reflDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ------------------------------------------------------------------
  // Preview: textures
  // ------------------------------------------------------------------
  const LAYERS = [...new Set(DEFS.filter(Boolean).flatMap((d) => [d.all, d.top, d.side, d.bottom, d.overlay, d.cross]).filter(Boolean))];
  const layerOf = {};
  LAYERS.forEach((n, i) => { layerOf[n] = i; });

  function makeArray(fmt) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 9, fmt, 256, 256, LAYERS.length);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D_ARRAY, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t;
  }
  const texAlb = makeArray(gl.SRGB8_ALPHA8);
  const texNrm = makeArray(gl.RGBA8);
  const texSpec = makeArray(gl.RGBA8);

  async function loadTextures() {
    let done = 0;
    const total = LAYERS.length * 3;
    const jobs = [];
    for (const [suffix, tex] of [['', texAlb], ['_n', texNrm], ['_s', texSpec]]) {
      LAYERS.forEach((name, layer) => {
        jobs.push((async () => {
          const res = await fetch(`${BLOCK_DIR}${name}${suffix}.png`);
          const bmp = await createImageBitmap(await res.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
          gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, 256, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
          bmp.close && bmp.close();
          done++;
          msg.textContent = `Loading textures… ${Math.round((done / total) * 100)}%`;
        })());
      });
    }
    await Promise.all(jobs);
    for (const t of [texAlb, texNrm, texSpec]) {
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    }
  }

  // ------------------------------------------------------------------
  // Preview: state, input, frame
  // ------------------------------------------------------------------
  const state = { shader: true, pbr: true, rain: 0, rainTarget: 0, spin: true, time: 0.36 };
  const cam = { yaw: 1.95, pitch: 0.5, dist: 24, target: [SX / 2, 6.5, SZ / 2] };

  const timeIn = $('#time'), timeOut = $('#timeOut');
  const fmtTime = (t) => {
    const m = Math.round(t * 24 * 60) % (24 * 60);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  timeIn.addEventListener('input', () => { state.time = +timeIn.value; timeOut.textContent = fmtTime(state.time); });
  timeOut.textContent = fmtTime(state.time);
  const toggle = (id, key, onChange) => {
    const b = $(id);
    b.addEventListener('click', () => {
      const on = !b.classList.contains('on');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      onChange(on);
    });
  };
  toggle('#tShader', 'shader', (on) => { state.shader = on; });
  toggle('#tPbr', 'pbr', (on) => { state.pbr = on; });
  toggle('#tRain', 'rain', (on) => { state.rainTarget = on ? 1 : 0; });
  toggle('#tSpin', 'spin', (on) => { state.spin = on; });

  const pointers = new Map();
  let pinch0 = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 1) {
      cam.yaw -= (e.clientX - prev[0]) * 0.006;
      cam.pitch = Math.min(1.45, Math.max(-0.15, cam.pitch + (e.clientY - prev[1]) * 0.005));
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch0) cam.dist = Math.min(70, Math.max(10, cam.dist * pinch0 / d));
      pinch0 = d;
    }
  });
  const up = (e) => { pointers.delete(e.pointerId); pinch0 = 0; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.dist = Math.min(70, Math.max(10, cam.dist * Math.exp(e.deltaY * 0.001)));
  }, { passive: false });

  let sceneVAO, shadowVAO, waterVAO, groundTex;
  const emptyVAO = gl.createVertexArray();

  function sunDirection(t) {
    const a = (t * 24 - 6) / 12 * Math.PI; // 06:00 sunrise, 18:00 sunset
    const tilt = -30 * Math.PI / 180;
    return norm([Math.cos(a), Math.sin(a) * Math.cos(tilt), Math.sin(a) * Math.sin(tilt)]);
  }

  function lighting(sun, rain) {
    const h = sun[1];
    const day = smooth(-0.06, 0.18, h);
    let lightDir, lightCol;
    if (h > 0) {
      const k = smooth(0, 0.45, h);
      const c = [1, 0.42 + 0.5 * k, 0.14 + 0.66 * k];
      const s = 3.2 * smooth(-0.02, 0.1, h);
      lightDir = sun; lightCol = c.map((x) => x * s);
    } else {
      const s = 0.10 * smooth(0.02, -0.1, h);
      lightDir = sun.map((x) => -x); lightCol = [0.42 * s, 0.55 * s, 0.85 * s];
    }
    lightCol = lightCol.map((x) => x * (1 - rain * 0.88));
    let amb = [0, 1, 2].map((i) => [0.020, 0.028, 0.050][i] + ([0.285, 0.399, 0.589][i] - [0.020, 0.028, 0.050][i]) * day);
    const l = 0.2126 * amb[0] + 0.7152 * amb[1] + 0.0722 * amb[2];
    amb = amb.map((x) => x + (l * 0.75 - x) * rain * 0.7);
    return { lightDir, lightCol, amb, day };
  }

  function drawScene(prog, vp, camPos, L, clipY, mode) {
    gl.useProgram(prog.p);
    setU(prog, 'uVP', vp);
    setU(prog, 'uCam', camPos);
    setU(prog, 'uClipY', clipY);
    setU(prog, 'uMode', mode);
    setU(prog, 'uPbr', state.pbr ? 1 : 0);
    setU(prog, 'uLamp', lampPos);
    setU(prog, 'uLampOn', 1 - smooth(-0.05, 0.25, L.sun[1]) * 0.85);
    commonUniforms(prog, L);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texAlb); setI(prog, 'uAlb', 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texNrm); setI(prog, 'uNrm', 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texSpec); setI(prog, 'uSpec', 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, shadowTex); setI(prog, 'uShadow', 3);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, groundTex); setI(prog, 'uGround', 5);
    setU(prog, 'uWaterTop', WATER_Y + 0.875);
    gl.bindVertexArray(sceneVAO.vao);
    gl.drawElements(gl.TRIANGLES, sceneVAO.count, gl.UNSIGNED_INT, 0);
  }

  function commonUniforms(prog, L) {
    setU(prog, 'uSunDir', L.sun);
    setU(prog, 'uLightDir', L.lightDir);
    setU(prog, 'uLightCol', L.lightCol);
    setU(prog, 'uSkyAmb', L.amb);
    setU(prog, 'uRain', state.rain);
    setU(prog, 'uTime', L.t);
    setU(prog, 'uShadowVP', L.shadowVP);
  }

  function drawSky(vp, L, mode) {
    const p = progs.sky;
    gl.useProgram(p.p);
    setU(p, 'uInvVP', M4.inv(vp));
    setU(p, 'uMode', mode);
    commonUniforms(p, L);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.bindVertexArray(emptyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
  }

  const t0 = performance.now();
  let last = t0;
  function frame(now) {
    requestAnimationFrame(frame);
    resize();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.spin && pointers.size === 0) cam.yaw += dt * 0.06;
    state.rain += (state.rainTarget - state.rain) * Math.min(1, dt * 1.5);
    const t = (now - t0) / 1000;
    const mode = state.shader ? 1 : 0;

    const sun = sunDirection(state.time);
    const L = lighting(sun, state.rain);
    L.sun = sun; L.t = t;

    // shadow map
    const c = cam.target;
    const lightPos = [c[0] + L.lightDir[0] * 40, c[1] + L.lightDir[1] * 40, c[2] + L.lightDir[2] * 40];
    const lightView = M4.lookAt(lightPos, c, Math.abs(L.lightDir[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0]);
    L.shadowVP = M4.mul(M4.ortho(-19, 19, -19, 19, 5, 80), lightView);
    if (mode) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB);
      gl.viewport(0, 0, SHADOW_RES, SHADOW_RES);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(1.5, 3);
      gl.disable(gl.CULL_FACE);
      const sp = progs.shadow;
      gl.useProgram(sp.p);
      setU(sp, 'uVP', L.shadowVP);
      setU(sp, 'uTime', t);
      setU(sp, 'uRain', state.rain);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texAlb); setI(sp, 'uAlb', 0);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, null); setI(sp, 'uShadow', 3);
      gl.bindVertexArray(shadowVAO.vao);
      gl.drawElements(gl.TRIANGLES, shadowVAO.count, gl.UNSIGNED_INT, 0);
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    // camera
    const eye = [c[0] + Math.cos(cam.pitch) * Math.sin(cam.yaw) * cam.dist, c[1] + Math.sin(cam.pitch) * cam.dist,
      c[2] + Math.cos(cam.pitch) * Math.cos(cam.yaw) * cam.dist];
    const proj = M4.persp(0.9, W / H, 0.3, 300);
    const vp = M4.mul(proj, M4.lookAt(eye, c, [0, 1, 0]));
    const waterTop = WATER_Y + 0.875;

    // planar reflection for the pond (mirror the world about the water plane)
    if (mode) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, reflFB);
      gl.viewport(0, 0, Math.max(1, W >> 1), Math.max(1, H >> 1));
      gl.clear(gl.DEPTH_BUFFER_BIT);
      const mirror = new Float32Array([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 2 * waterTop, 0, 1]);
      const vpR = M4.mul(vp, mirror);
      drawSky(vpR, L, mode);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT);
      drawScene(progs.scene, vpR, [eye[0], 2 * waterTop - eye[1], eye[2]], L, waterTop - 0.05, mode);
      gl.cullFace(gl.BACK);
    }

    // main view
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFB);
    gl.viewport(0, 0, W, H);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    drawSky(vp, L, mode);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    drawScene(progs.scene, vp, eye, L, -1e9, mode);

    // water: copy the opaque scene so the water can refract it, then draw the surface on top
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFB);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, copyFB);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFB);
    const wp = progs.water;
    gl.useProgram(wp.p);
    setU(wp, 'uVP', vp);
    setU(wp, 'uCam', eye);
    setU(wp, 'uRes', [W, H]);
    setU(wp, 'uMode', mode);
    commonUniforms(wp, L);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, shadowTex); setI(wp, 'uShadow', 3);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, reflTex); setI(wp, 'uRefl', 4);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, groundTex); setI(wp, 'uGround', 5);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, copyTex); setI(wp, 'uScene', 6);
    gl.bindVertexArray(waterVAO.vao);
    gl.depthMask(false);
    gl.drawElements(gl.TRIANGLES, waterVAO.count, gl.UNSIGNED_INT, 0);
    gl.depthMask(true);

    // resolve MSAA, build bloom mips, tonemap to the screen
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFB);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, hdrFB);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, hdrTex);
    if (hdrOK && mode) gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.DEPTH_TEST);
    const pp = progs.post;
    gl.useProgram(pp.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hdrTex); setI(pp, 'uHdr', 0);
    setU(pp, 'uRes', [W, H]);
    setU(pp, 'uMode', hdrOK ? mode : 0);
    setU(pp, 'uExposure', 1.0 * (3.0 + (1.0 - 3.0) * (0.35 + 0.65 * L.day)) * (1 + state.rain * 0.5));
    commonUniforms(pp, L);
    gl.bindVertexArray(emptyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
  }

  (async () => {
    try {
      buildWorld();
      await loadTextures();
      const mesh = buildMesh(layerOf);
      sceneVAO = makeVAO(progs.scene, mesh, SCENE_LAYOUT, STRIDE);
      shadowVAO = makeVAO(progs.shadow, mesh, SCENE_LAYOUT, STRIDE);
      waterVAO = makeVAO(progs.water, buildWaterMesh(), [['aPos', 3], ['aN', 3]], 6);
      groundTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, groundTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      const groundData = groundTop.map((g, i) => g + (isWater[i] ? 128 : 0));
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, SX, SZ, 0, gl.RED, gl.UNSIGNED_BYTE, groundData);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      msg.textContent = '';
      requestAnimationFrame(frame);
    } catch (e) {
      console.error(e);
      msg.textContent = 'The preview failed to load.';
    }
  })();
})();
