// Photo Mode: pauses the game and re-renders the current frame with a real
// path tracer (three-gpu-pathtracer on a WebGL2 canvas), converging sample by
// sample. The scene is rebuilt from the live one with standard materials so
// the voxel world, characters, props and lights all bounce light.
export async function openPhotoMode(game) {
  if (game.photo) return;
  game.paused = true;
  game.ui.closeAll();
  const overlay = document.createElement('div');
  overlay.id = 'photo-mode';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:90;background:#000;display:flex;flex-direction:column';
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:0;right:0;top:0;display:flex;gap:8px;align-items:center;padding:10px calc(12px + env(safe-area-inset-right,0px)) 10px calc(12px + env(safe-area-inset-left,0px));background:linear-gradient(#000c,#0000);z-index:2;font:15px var(--font);color:#fff';
  const label = document.createElement('div'); label.style.flex = '1'; label.id = 'photo-label'; label.textContent = 'Photo Mode · preparing path tracer…';
  const save = document.createElement('button'); save.className = 'btn small primary'; save.textContent = '💾 Save PNG';
  const close = document.createElement('button'); close.className = 'btn small'; close.textContent = 'Close';
  bar.append(label, save, close);
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  overlay.append(bar, canvas);
  document.body.appendChild(overlay);
  let running = true, renderer = null, pt = null;
  const shut = () => {
    running = false;
    try { pt?.dispose?.(); renderer?.dispose(); } catch (e) { /* ignore */ }
    overlay.remove(); game.photo = null; game.paused = false; game.last = performance.now();
  };
  close.onclick = shut;
  game.photo = { close: shut };
  window.addEventListener('keydown', function esc(e) { if (e.code === 'Escape' && game.photo) { shut(); window.removeEventListener('keydown', esc); } });
  try {
    const T = await import('three-classic');
    const { WebGLPathTracer } = await import('three-gpu-pathtracer');
    const W = window.innerWidth, H = window.innerHeight;
    renderer = new T.WebGLRenderer({ canvas, preserveDrawingBuffer: true, antialias: false });
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    renderer.toneMapping = T.AgXToneMapping; renderer.toneMappingExposure = 2.2;
    renderer.outputColorSpace = T.SRGBColorSpace;
    const scene = new T.Scene();
    // ---- materials
    const atlas = new T.CanvasTexture(game.atlas.canvas);
    atlas.colorSpace = T.SRGBColorSpace; atlas.magFilter = T.NearestFilter; atlas.minFilter = T.NearestFilter; atlas.generateMipmaps = false;
    const blockMat = new T.MeshStandardMaterial({ map: atlas, vertexColors: true, roughness: 0.75 });
    const water = new T.MeshStandardMaterial({ color: 0x0c2a44, roughness: 0.04, metalness: 0.2 });
    const glow = { cursed: new T.MeshStandardMaterial({ color: 0x3a1060, emissive: 0xb040ff, emissiveIntensity: 3 }), lava: new T.MeshStandardMaterial({ color: 0x401000, emissive: 0xff6a1a, emissiveIntensity: 4 }) };
    const M = game.materials;
    const cache = new Map();
    const convert = (m) => {
      if (cache.has(m)) return cache.get(m);
      let out;
      if (m === M.block || m.userData?.fade) out = blockMat;
      else if (m === M.water) out = water;
      else if (m === M.glow.cursed) out = glow.cursed;
      else if (m === M.glow.lava) out = glow.lava;
      else if (m === M.deco) out = new T.MeshStandardMaterial({ map: m.map, alphaTest: 0.5, transparent: false, side: T.DoubleSide, roughness: 0.9 });
      else {
        const e = m.emissive ? m.emissive.clone() : new T.Color(0, 0, 0);
        out = new T.MeshStandardMaterial({ map: m.map ?? null, color: m.color ? m.color.clone() : 0xffffff, roughness: m.roughness ?? 0.7, metalness: m.metalness ?? 0, emissive: e, emissiveIntensity: m.emissiveIntensity ?? 1, alphaTest: m.alphaTest ?? 0 });
        if (m.map) out.color.set(0xffffff);
      }
      cache.set(m, out); return out;
    };
    let tris = 0;
    game.scene.updateMatrixWorld(true);
    game.scene.traverseVisible((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.count > 1 || !o.geometry?.attributes?.position) return;
      const m = o.material;
      if (!m || m.blending === 2 || m.isSpriteNodeMaterial || (m.transparent && m !== M.deco && !m.userData?.fade) || o.userData.shell) return;
      if (m.userData?.fade && m.userData.fade.value > 0.5) return;       // hidden roofs
      const mesh = new T.Mesh(o.geometry, convert(m));
      mesh.matrixAutoUpdate = false; mesh.matrix.copy(o.matrixWorld);
      scene.add(mesh);
      tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    });
    // ---- lights
    const L = game.lights;
    const sun = new T.DirectionalLight(L.sun.color, L.sun.intensity * 1.8); sun.position.copy(L.sun.position); sun.target.position.copy(L.sun.target.position); scene.add(sun, sun.target);
    for (const l of L.pool) if (l.intensity > 0.01) { const pl = new T.PointLight(l.color, l.intensity, l.distance, 2); pl.position.copy(l.position); scene.add(pl); }
    // environment: the biome sky + abyss gradient
    const env = new T.DataTexture(new Float32Array(64 * 32 * 4), 64, 32, T.RGBAFormat, T.FloatType);
    const top = game.env.skyTop.value, hor = game.env.skyHor.value, hemi = L.hemi.color;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) {
      const v = 1 - y / 31; const up = v * 2 - 1;
      const c = up > 0 ? hor.clone().lerp(top, Math.pow(up, 0.6)).lerp(hemi, 0.35) : hor.clone().multiplyScalar(0.35 * (1 + up));
      const o = (y * 64 + x) * 4; env.image.data[o] = c.r * 1.6; env.image.data[o + 1] = c.g * 1.6; env.image.data[o + 2] = c.b * 1.6; env.image.data[o + 3] = 1;
    }
    env.mapping = T.EquirectangularReflectionMapping; env.needsUpdate = true;
    scene.environment = env; scene.background = env; scene.environmentIntensity = L.hemi.intensity * 2;
    // ---- camera
    const src = game.rig.camera;
    const cam = new T.PerspectiveCamera(src.fov, W / H, src.near, src.far);
    cam.position.copy(src.position); cam.quaternion.copy(src.quaternion); cam.updateMatrixWorld();
    // ---- path tracer
    pt = new WebGLPathTracer(renderer);
    pt.bounces = 5; pt.filterGlossyFactor = 0.5; pt.minSamples = 1; pt.renderDelay = 0; pt.fadeDuration = 0;
    pt.renderScale = 1; pt.tiles.set(2, 2);
    label.textContent = `Photo Mode · building BVH for ${Math.round(tris / 1000)}k triangles…`;
    await new Promise((r) => setTimeout(r, 30));
    await new Promise((r) => requestAnimationFrame(() => r()));
    pt.setScene(scene, cam);
    const MAX = 512;
    const loop = () => {
      if (!running) return;
      if (pt.samples < MAX) pt.renderSample();
      label.textContent = `Photo Mode · path tracing · ${Math.floor(pt.samples)} / ${MAX} samples${pt.samples >= MAX ? ' · done' : ''}`;
      requestAnimationFrame(loop);
    };
    loop();
    save.onclick = () => {
      canvas.toBlob((b) => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `cursed-dungeons-${Date.now()}.png`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, 'image/png');
    };
  } catch (e) {
    console.error(e);
    label.textContent = 'Photo Mode unavailable on this device: ' + (e.message || e);
  }
}
