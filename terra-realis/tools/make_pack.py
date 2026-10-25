#!/usr/bin/env python3
"""Generate the Terra Realis resource pack procedurally.

Every texture is synthesised from tileable noise (spectral synthesis on a
torus, so all maps wrap seamlessly), Voronoi cells and simple rasterised
shapes. For each block three maps are written in the LabPBR 1.3 layout:

  <name>.png    albedo (sRGB, alpha = cutout / translucency)
  <name>_n.png  R,G = normal XY (DirectX, Y down), B = AO, A = height
  <name>_s.png  R = smoothness, G = F0 or metal id, B = porosity / SSS,
                A = emission (0 = none)

Usage:  python3 tools/make_pack.py [--res 256] [--out pack]
Needs numpy and Pillow. Output is deterministic (fixed seeds).
"""

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent.parent
N = 256  # set from --res


# --------------------------------------------------------------------------
# Noise and image helpers (all periodic)
# --------------------------------------------------------------------------

def _freqs(n):
    f = np.fft.fftfreq(n) * n
    return np.meshgrid(f, f, indexing="ij")  # FY (rows), FX (cols)


def norm01(a, lo_pct=0.5, hi_pct=99.5):
    lo, hi = np.percentile(a, lo_pct), np.percentile(a, hi_pct)
    return np.clip((a - lo) / max(hi - lo, 1e-9), 0.0, 1.0)


def spectral(seed, beta=2.0, fmin=1.0, fmax=None, sx=1.0, sy=1.0, n=None):
    """Tileable fractal noise in 0..1. Power spectrum ~ f^-beta.

    sx/sy > 1 damp variation along that axis, so features stretch along
    it (sx large -> streaks running horizontally)."""
    n = n or N
    r = np.random.default_rng(seed)
    F = np.fft.fft2(r.standard_normal((n, n)))
    FY, FX = _freqs(n)
    f = np.sqrt((FX * sx) ** 2 + (FY * sy) ** 2) * (256.0 / n)
    amp = np.where(f >= fmin, 1.0 / np.maximum(f, 1e-6) ** (beta / 2.0), 0.0)
    if fmax:
        amp *= np.exp(-((f / fmax) ** 2))
    return norm01(np.real(np.fft.ifft2(F * amp)))


def blur(a, sigma):
    if sigma <= 0:
        return a
    n = a.shape[0]
    FY, FX = _freqs(n)
    g = np.exp(-2 * (math.pi ** 2) * (sigma ** 2) * ((FX / n) ** 2 + (FY / n) ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def sample(img, x, y):
    """Periodic bilinear sample of a 2D array at float pixel coords."""
    n = img.shape[0]
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    x0 %= n
    y0 %= n
    x1, y1 = (x0 + 1) % n, (y0 + 1) % n
    a = img[y0, x0] * (1 - fx) + img[y0, x1] * fx
    b = img[y1, x0] * (1 - fx) + img[y1, x1] * fx
    return a * (1 - fy) + b * fy


def grid(n=None):
    n = n or N
    y, x = np.mgrid[0:n, 0:n].astype(np.float64)
    return x, y


def voronoi(pts, x=None, y=None, n=None):
    """Periodic Voronoi. Returns F1, F2 distances (px) and nearest index."""
    n = n or N
    if x is None:
        x, y = grid(n)
    f1 = np.full(x.shape, 1e9)
    f2 = np.full(x.shape, 1e9)
    idx = np.zeros(x.shape, dtype=int)
    for i, (px, py) in enumerate(pts):
        dx = np.abs(x - px) % n
        dy = np.abs(y - py) % n
        dx = np.minimum(dx, n - dx)
        dy = np.minimum(dy, n - dy)
        d = np.sqrt(dx * dx + dy * dy)
        closer = d < f1
        f2 = np.where(closer, f1, np.minimum(f2, d))
        idx = np.where(closer, i, idx)
        f1 = np.where(closer, d, f1)
    return f1, f2, idx


def jittered(seed, cells, jitter=0.8, n=None):
    n = n or N
    r = np.random.default_rng(seed)
    step = n / cells
    pts = []
    for j in range(cells):
        for i in range(cells):
            pts.append(((i + 0.5 + (r.random() - 0.5) * jitter) * step,
                        (j + 0.5 + (r.random() - 0.5) * jitter) * step))
    return np.array(pts)


def warped_grid(seed, amount, beta=2.4, n=None):
    x, y = grid(n)
    wx = (spectral(seed, beta, n=n) - 0.5) * 2 * amount
    wy = (spectral(seed + 1, beta, n=n) - 0.5) * 2 * amount
    return x + wx, y + wy


def ramp(t, stops):
    """Map 0..1 array through colour stops [(pos, (r,g,b)), ...] (0..1)."""
    pos = [s[0] for s in stops]
    out = np.zeros(t.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(t, pos, [s[1][c] for s in stops])
    return out


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def rgb(*c):
    return np.array(c, dtype=np.float64) / 255.0


def shade_var(col, amount, seed, beta=2.0):
    """Multiply colour by low-frequency brightness variation."""
    v = 1 + (spectral(seed, beta) - 0.5) * 2 * amount
    return col * v[..., None]


def cavity_ao(h, radius=6.0, strength=3.0, floor=0.35):
    return np.clip(1 - np.maximum(blur(h, radius) - h, 0) * strength, floor, 1.0)


# --------------------------------------------------------------------------
# Writer
# --------------------------------------------------------------------------

class Pack:
    def __init__(self, root):
        self.root = root
        self.block = root / "assets/minecraft/textures/block"
        self.block.mkdir(parents=True, exist_ok=True)
        self.names = []

    def save(self, name, albedo, height, smooth, f0=0.04, porosity=0.0, sss=0.0,
             emission=None, alpha=None, ao=None, depth=4.0, ao_into_albedo=0.6,
             folder=None, metal=None):
        """albedo: HxWx3 (0..1, sRGB). height/smooth/porosity/sss: arrays or
        scalars 0..1. depth: bump depth in px at 256 res. metal: LabPBR id."""
        folder = folder or self.block
        h = np.clip(height, 0, 1)
        if ao is None:
            ao = cavity_ao(h)
        scale = N / 256.0
        s = depth * scale
        dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * s
        dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * s
        nx, ny, nz = -dx, -dy, np.ones_like(h)
        ln = np.sqrt(nx * nx + ny * ny + nz * nz)
        nx, ny = nx / ln, ny / ln

        alb = np.clip(albedo * (1 - ao_into_albedo + ao_into_albedo * ao)[..., None], 0, 1)
        a = np.ones(h.shape) if alpha is None else np.clip(alpha, 0, 1)
        if alpha is not None and (a < 0.5).any() and (a > 0.5).any():
            # Bleed colour into transparent pixels so mipmaps don't get dark fringes.
            w = (a > 0.5).astype(float)
            fill = np.dstack([blur(alb[..., c] * w, 4) for c in range(3)]) / np.maximum(blur(w, 4), 1e-4)[..., None]
            alb = np.where(w[..., None] > 0, alb, np.clip(fill, 0, 1))
        img = np.dstack([alb, a])
        self._png(folder / f"{name}.png", img)

        # LabPBR height: alpha 255 = surface, 0 = 25% of a block deep. Scale the
        # relief per material so parallax depth matches the bump depth
        # (sand stays shallow, cobblestone and bark get deep gaps).
        relief = min(depth * 2.5 / 256.0, 0.2)
        ha = 1.0 - (1.0 - h) * relief / 0.25
        nmap = np.dstack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, ao, (1 + ha * 254) / 255.0])
        self._png(folder / f"{name}_n.png", nmap)

        sm = np.broadcast_to(np.clip(smooth, 0, 1), h.shape)
        if metal is not None:
            g = np.broadcast_to(np.asarray(metal, dtype=np.float64) / 255.0, h.shape)
        else:
            g = np.broadcast_to(np.clip(np.asarray(f0, dtype=np.float64), 0, 229 / 255.0), h.shape)
        poro = np.broadcast_to(np.asarray(porosity, dtype=np.float64), h.shape)
        sss_a = np.broadcast_to(np.asarray(sss, dtype=np.float64), h.shape)
        b = np.where(sss_a > 0.01, (65 + sss_a * 190) / 255.0, poro * 64 / 255.0)
        e = np.zeros(h.shape) if emission is None else np.clip(emission, 0, 1) * 254 / 255.0
        self._png(folder / f"{name}_s.png", np.dstack([sm, g, b, e]))
        self.names.append(name)

    def animated(self, name, frames, smooth, f0, emission_frames=None, frametime=2,
                 interpolate=True, depth=3.0):
        """frames: list of (albedo HxWx3, height, alpha). Stacked vertically."""
        alb = np.concatenate([f[0] for f in frames], axis=0)
        h = np.concatenate([f[1] for f in frames], axis=0)
        a = np.concatenate([f[2] for f in frames], axis=0)
        n = frames[0][1].shape[0]
        s = depth * n / 256.0
        dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * s
        # vertical gradient must wrap inside each frame
        hs = h.reshape(len(frames), n, n)
        dy = ((np.roll(hs, -1, 1) - np.roll(hs, 1, 1)) * 0.5 * s).reshape(h.shape)
        ln = np.sqrt(dx * dx + dy * dy + 1)
        self._png(self.block / f"{name}.png", np.dstack([alb, a]))
        self._png(self.block / f"{name}_n.png",
                  np.dstack([-dx / ln * 0.5 + 0.5, -dy / ln * 0.5 + 0.5, np.ones_like(h), (1 + h * 254) / 255]))
        e = np.zeros(h.shape) if emission_frames is None else np.concatenate(emission_frames, 0) * 254 / 255
        self._png(self.block / f"{name}_s.png",
                  np.dstack([np.full(h.shape, smooth), np.full(h.shape, f0), np.zeros(h.shape), e]))
        meta = {"animation": {"frametime": frametime, "interpolate": interpolate}}
        for suffix in ("", "_n", "_s"):
            (self.block / f"{name}{suffix}.png.mcmeta").write_text(json.dumps(meta, indent=2) + "\n")
        self.names.append(name)

    @staticmethod
    def _png(path, arr):
        img = Image.fromarray(np.clip(np.round(arr * 255), 0, 255).astype(np.uint8), "RGBA")
        img.save(path, optimize=True)


# --------------------------------------------------------------------------
# Material recipes
# --------------------------------------------------------------------------

def stone_base(seed, tone=(128, 128, 126), contrast=0.22):
    big = spectral(seed, 2.4, fmin=1)
    mid = spectral(seed + 1, 1.8, fmin=4)
    fine = spectral(seed + 2, 0.9, fmin=16)
    h = 0.45 * big + 0.35 * mid + 0.2 * fine
    # hairline fractures
    x, y = warped_grid(seed + 3, 10)
    f1, f2, _ = voronoi(jittered(seed + 4, 5), x, y)
    crack = smoothstep(2.5, 0.0, f2 - f1) * smoothstep(0.55, 0.75, spectral(seed + 5, 2.2))
    h = np.clip(h - crack * 0.35, 0, 1)
    base = rgb(*tone)
    v = 1 + (h - 0.5) * contrast * 2
    col = base * v[..., None]
    tint = spectral(seed + 6, 2.6)
    col = col * (1 + (tint[..., None] - 0.5) * np.array([0.08, 0.02, -0.06]))
    specks = smoothstep(0.8, 0.95, spectral(seed + 7, 0.3))
    col = col * (1 - specks[..., None] * 0.25)
    return col, h, crack


def stone(p):
    col, h, crack = stone_base(10)
    p.save("stone", col, h, 0.22 + 0.15 * (1 - h), f0=0.04, porosity=0.25, depth=5)


def speckled(p, name, seed, base_stops, speck_cols, depth=4, smooth=0.3):
    t = 0.6 * spectral(seed + 3, 2.2) + 0.4 * spectral(seed + 8, 1.2, fmin=6, fmax=40)
    col = ramp(t, base_stops)
    h = 0.5 * spectral(seed + 5, 2.2) + 0.5 * spectral(seed + 4, 1.0, fmin=12)
    glint = np.zeros((N, N))
    for i, (prob, c) in enumerate(speck_cols):
        # mineral grains: thresholded high-frequency noise, a little clumped
        g = 0.75 * spectral(seed + 20 + i, 1.2, fmin=6, fmax=34) + 0.25 * spectral(seed + 40 + i, 2.0)
        thr = np.percentile(g, 100 * (1 - prob))
        m = smoothstep(thr, thr + 0.03, g)
        shade = 0.8 + 0.4 * spectral(seed + 60 + i, 1.0, fmin=8)
        col = col * (1 - m[..., None]) + (rgb(*c) * shade[..., None]) * m[..., None]
        h = h + 0.12 * m
        glint = np.maximum(glint, m * (i % 2))
    p.save(name, col, np.clip(h, 0, 1), smooth + 0.3 * glint, f0=0.045, porosity=0.2, depth=depth)


def cobble_parts(seed, cells=5):
    x, y = warped_grid(seed, 14)
    pts = jittered(seed + 1, cells, 0.9)
    f1, f2, idx = voronoi(pts, x, y)
    r = np.random.default_rng(seed + 2)
    rnd = r.random(len(pts))
    edge = f2 - f1
    dome = smoothstep(0, 26, edge) ** 0.55
    surf = spectral(seed + 3, 1.7, fmin=4)
    h = dome * (0.72 + 0.28 * rnd[idx]) * (0.8 + 0.2 * surf)
    gap = smoothstep(6, 1, edge)
    return h, gap, idx, rnd, surf


def cobblestone(p, name="cobblestone", mossy=False):
    seed = 20
    h, gap, idx, rnd, surf = cobble_parts(seed)
    tones = ramp(rnd[idx], [(0, rgb(92, 92, 92)), (0.5, rgb(132, 130, 126)), (1, rgb(160, 156, 150))])
    col = tones * (0.75 + 0.35 * surf)[..., None]
    grit = spectral(seed + 9, 0.6)
    col = col * (0.9 + 0.2 * grit)[..., None]
    dirt = rgb(52, 46, 40) * (0.7 + 0.6 * grit)[..., None]
    col = col * (1 - gap[..., None]) + dirt * gap[..., None]
    smooth = 0.25 + 0.2 * h
    sss = 0.0
    if mossy:
        m = spectral(seed + 30, 2.3)
        moss = np.clip(smoothstep(0.45, 0.65, m) + gap * smoothstep(0.3, 0.5, m), 0, 1)
        fuzz = spectral(seed + 31, 0.5)
        moss = moss * smoothstep(0.2, 0.5, fuzz + moss * 0.4)
        mcol = ramp(fuzz, [(0, rgb(40, 62, 22)), (0.6, rgb(78, 108, 38)), (1, rgb(120, 140, 60))])
        col = col * (1 - moss[..., None]) + mcol * moss[..., None]
        h = h + moss * 0.15 * fuzz
        smooth = smooth * (1 - moss) + 0.08 * moss
        sss = moss * 0.5
    p.save(name, col, h, smooth, f0=0.04, porosity=0.3, sss=sss, depth=9)


def dirt_parts(seed):
    crumb = spectral(seed, 1.2, fmin=6)
    big = spectral(seed + 1, 2.4)
    t = 0.6 * big + 0.4 * crumb
    col = ramp(t, [(0, rgb(58, 40, 26)), (0.45, rgb(98, 70, 46)), (1, rgb(132, 98, 66))])
    h = 0.4 * big + 0.6 * crumb
    # pebbles
    pts = np.random.default_rng(seed + 2).random((70, 2)) * N
    f1, _, idx = voronoi(pts)
    r = np.random.default_rng(seed + 3)
    rad = (2 + r.random(len(pts)) * 6) * N / 256
    peb = smoothstep(rad[idx], rad[idx] * 0.4, f1)
    ptone = r.random(len(pts))
    pcol = ramp(ptone[idx], [(0, rgb(90, 84, 76)), (0.5, rgb(130, 118, 100)), (1, rgb(160, 150, 136))])
    col = col * (1 - peb[..., None]) + pcol * peb[..., None]
    h = h * (1 - peb) + (0.6 + 0.4 * peb) * peb
    # dark organic specks
    org = smoothstep(0.78, 0.9, spectral(seed + 4, 0.8))
    col = col * (1 - 0.45 * org[..., None])
    return col, h, peb


def dirt(p):
    col, h, peb = dirt_parts(40)
    p.save("dirt", col, h, 0.12 + 0.3 * peb, f0=0.03, porosity=0.85, depth=6)


def blades(seed, count, length, width, n=None, up_only=False, hang=None):
    """Rasterise grass blades. Returns brightness, height, coverage."""
    n = n or N
    r = np.random.default_rng(seed)
    bright = np.zeros((n, n))
    height = np.zeros((n, n))
    cover = np.zeros((n, n))
    zbuf = np.full((n, n), -1.0)
    sc = n / 256
    xs, ys, zs, vs = [], [], [], []
    for _ in range(count):
        if hang is not None:
            x0 = r.random() * n
            y0 = 0.0
            ang = math.pi / 2 + (r.random() - 0.5) * 0.6
            L = (hang[0] + r.random() * (hang[1] - hang[0])) * sc
        else:
            x0, y0 = r.random() * n, r.random() * n
            ang = r.random() * 2 * math.pi
            L = (length[0] + r.random() * (length[1] - length[0])) * sc
        bend = (r.random() - 0.5) * 0.8
        b = 0.55 + r.random() * 0.45
        z = r.random()
        steps = max(int(L * 2), 2)
        t = np.linspace(0, 1, steps)
        a = ang + bend * t
        px = x0 + np.cumsum(np.cos(a)) * (L / steps)
        py = y0 + np.cumsum(np.sin(a)) * (L / steps)
        w = width * sc * (1 - 0.7 * t)
        for o in np.linspace(-0.5, 0.5, max(int(math.ceil(width * sc)), 1)):
            xs.append(px - np.sin(a) * o * w)
            ys.append(py + np.cos(a) * o * w)
            if hang is not None:
                zs.append(z + 0 * t)
                vs.append(b * (1.0 - 0.45 * t))  # brighter at the top edge
            else:
                zs.append(z + t * 0.5)
                vs.append(b * (0.45 + 0.55 * t))
    X = np.concatenate(xs)
    Y = np.concatenate(ys)
    Z = np.concatenate(zs)
    V = np.concatenate(vs)
    if hang is not None:
        keep = Y < n
        X, Y, Z, V = X[keep], Y[keep], Z[keep], V[keep]
    order = np.argsort(Z)
    xi = np.floor(X[order]).astype(int) % n
    yi = np.floor(Y[order]).astype(int) % n
    bright[yi, xi] = V[order]
    zbuf[yi, xi] = Z[order]
    cover[yi, xi] = 1
    height = np.where(cover > 0, 0.3 + 0.7 * np.clip(zbuf, 0, 1.5) / 1.5, 0)
    return bright, height, cover


def grass_top(p):
    b, h, c = blades(60, 9000, (8, 22), 2.2)
    soil = 0.18 + 0.1 * spectral(61, 1.0)
    g = np.where(c > 0, b, soil)
    g = g * (0.85 + 0.3 * spectral(62, 2.5))  # patchy variation
    h = blur(np.where(c > 0, h, 0.0), 0.6)
    # grayscale: the game tints it with the biome colour
    col = np.dstack([g, g, g]) * 1.05
    p.save("grass_block_top", col, h, 0.12 + 0.15 * b * c, f0=0.03, sss=0.55 * c,
           depth=5, ao_into_albedo=0.8)


def grass_side(p):
    dcol, dh, peb = dirt_parts(40)
    b, h, c = blades(70, 1400, None, 2.4, hang=(20, 80))
    # wavy solid strip at the very top
    x, _ = grid()
    edge = (10 + 8 * spectral(71, 2.0)[0][None, :].repeat(N, 0)) * N / 256
    _, y = grid()
    strip = (y < edge).astype(float)
    cov = np.clip(c + strip, 0, 1)
    bright = np.where(strip > 0, 0.75 + 0.2 * spectral(72, 1.0), b)
    hh = np.where(cov > 0, np.maximum(h, 0.6 * strip), 0)
    # Base: dirt, with a dark untinted green fringe under the overlay
    green = rgb(64, 88, 38) * (0.7 + 0.5 * bright)[..., None]
    base = dcol * (1 - cov[..., None]) + green * cov[..., None]
    shadow = blur(cov, 3) * (1 - cov)
    base = base * (1 - 0.35 * shadow[..., None])
    p.save("grass_block_side", base, np.maximum(dh * (1 - cov), hh), 0.15, f0=0.03,
           porosity=0.8 * (1 - cov), sss=0.5 * cov, depth=6)
    g = bright
    p.save("grass_block_side_overlay", np.dstack([g, g, g]), hh, 0.15, f0=0.03, sss=0.55,
           alpha=cov, depth=4, ao_into_albedo=0.4)


def sand(p, name="sand", stops=None, seed=80):
    stops = stops or [(0, rgb(178, 156, 112)), (0.5, rgb(214, 194, 150)), (1, rgb(236, 222, 184))]
    grain = spectral(seed, 0.2, fmin=40)
    x, y = grid()
    warp = spectral(seed + 1, 2.6) * 6.0
    ripple = 0.5 + 0.5 * np.sin(2 * math.pi * (3 * x / N + 2 * y / N) + warp)
    big = spectral(seed + 2, 2.4)
    t = 0.45 * big + 0.35 * grain + 0.2 * ripple
    col = ramp(t, stops)
    dark = smoothstep(0.85, 0.97, spectral(seed + 3, 0.0, fmin=60))
    light = smoothstep(0.88, 0.98, spectral(seed + 4, 0.0, fmin=60))
    col = col * (1 - 0.4 * dark[..., None]) + 0.25 * light[..., None]
    h = 0.4 * ripple + 0.4 * grain + 0.2 * big
    p.save(name, col, h, 0.18 + 0.25 * light, f0=0.04, porosity=1.0, depth=2.5, ao_into_albedo=0.3)


def gravel(p):
    seed = 90
    x, y = warped_grid(seed, 4)
    pts = np.random.default_rng(seed + 1).random((150, 2)) * N
    f1, f2, idx = voronoi(pts, x, y)
    r = np.random.default_rng(seed + 2)
    tone = r.random(len(pts))
    kind = r.random(len(pts))
    edge = f2 - f1
    dome = smoothstep(0, 9, edge) ** 0.6
    h = dome * (0.6 + 0.4 * r.random(len(pts))[idx])
    pal = np.where((kind[idx] < 0.25)[..., None],
                   ramp(tone[idx], [(0, rgb(110, 92, 78)), (1, rgb(160, 130, 108))]),
                   ramp(tone[idx], [(0, rgb(70, 70, 72)), (0.5, rgb(122, 118, 114)), (1, rgb(176, 170, 162))]))
    surf = spectral(seed + 3, 1.0, fmin=8)
    col = pal * (0.8 + 0.3 * surf)[..., None]
    gap = smoothstep(3, 0.5, edge)
    col = col * (1 - 0.7 * gap[..., None])
    p.save("gravel", col, h, 0.25 + 0.3 * dome * (kind[idx] > 0.6), f0=0.045, porosity=0.5, depth=8)


def wood_grain(seed, base_stops, rings=7.0):
    """Long flowing grain: parallel lines displaced by a very smooth warp."""
    x, y = grid()
    warp = (spectral(seed + 1, 3.2) - 0.5) * 50 * N / 256
    yy = y + warp
    r = np.random.default_rng(seed)
    # 1D grain profile (periodic) sampled along the warped rows
    prof = np.real(np.fft.ifft(np.fft.fft(r.standard_normal(N)) *
                               np.where(np.abs(np.fft.fftfreq(N) * N) >= 2,
                                        1 / np.maximum(np.abs(np.fft.fftfreq(N) * N), 1) ** 0.6, 0)))
    prof = norm01(prof)
    idx = np.floor(yy).astype(int) % N
    fr = yy - np.floor(yy)
    lines = prof[idx] * (1 - fr) + prof[(idx + 1) % N] * fr
    rings_ = (0.5 + 0.5 * np.sin(2 * math.pi * rings * yy / N)) ** 4
    pores = smoothstep(0.7, 0.9, spectral(seed + 3, 0.8, sx=40.0, sy=1.0, fmin=4))
    tone = spectral(seed + 4, 2.6)
    t = 0.72 - 0.35 * rings_ + 0.35 * (lines - 0.5) - 0.15 * pores + 0.2 * (tone - 0.5)
    t = np.clip(t, 0, 1)
    return ramp(t, base_stops), t, lines


def planks(p, name, stops, seed):
    boards = 4
    bh = N // boards
    col = np.zeros((N, N, 3))
    hgt = np.zeros((N, N))
    r = np.random.default_rng(seed)
    x, y = grid()
    for i in range(boards):
        c, t, fine = wood_grain(seed + 10 * i, stops, rings=6 + r.random() * 8)
        shift = int(r.random() * N)
        c = np.roll(c, shift, 1)
        t = np.roll(t, shift, 1)
        fine = np.roll(fine, shift, 1)
        c = c * (0.88 + 0.24 * r.random())
        sl = slice(i * bh, (i + 1) * bh)
        col[sl] = c[sl]
        hgt[sl] = 0.62 + 0.3 * np.clip(t[sl], 0, 1) + 0.08 * fine[sl]
        # end joint on some boards
        if r.random() < 0.6:
            jx = int(r.random() * N)
            d = np.abs((x[sl] - jx + N / 2) % N - N / 2)
            seam = smoothstep(2.2 * N / 256, 0.5, d)
            col[sl] *= (1 - 0.6 * seam)[..., None]
            hgt[sl] -= 0.5 * seam
            for nx in (jx - 8, jx + 8):
                for ny in (i * bh + bh * 0.3, i * bh + bh * 0.7):
                    dd = np.hypot((x - nx * N / 256 + N / 2) % N - N / 2, y - ny)
                    nail = smoothstep(2.5 * N / 256, 1.0 * N / 256, dd)
                    col *= (1 - 0.55 * nail)[..., None]
                    hgt -= 0.3 * nail
    gap = np.zeros((N, N))
    for i in range(boards):
        dy = np.abs((y - i * bh + N / 2) % N - N / 2)
        gap = np.maximum(gap, smoothstep(3.0 * N / 256, 0.5, dy))
    col *= (1 - 0.65 * gap)[..., None]
    hgt = np.clip(hgt - 0.6 * gap, 0, 1)
    wear = spectral(seed + 99, 2.2)
    col *= (0.92 + 0.12 * wear)[..., None]
    p.save(name, col, hgt, 0.32 + 0.15 * wear, f0=0.04, porosity=0.2, depth=7)


OAK = [(0, rgb(112, 78, 44)), (0.4, rgb(156, 116, 70)), (0.75, rgb(186, 146, 94)), (1, rgb(206, 170, 116))]
SPRUCE = [(0, rgb(70, 46, 26)), (0.5, rgb(108, 74, 44)), (1, rgb(140, 100, 62))]
BIRCH = [(0, rgb(176, 150, 104)), (0.5, rgb(206, 186, 140)), (1, rgb(228, 212, 170))]


def bark(seed, dark, mid, light, furrow=0.6):
    furrows = spectral(seed, 2.0, sx=1.0, sy=14.0)  # streaks along y (vertical)
    ridged = 1 - np.abs(furrows * 2 - 1)
    x, y = warped_grid(seed + 1, 8)
    detail = spectral(seed + 2, 1.2, sy=4.0, fmin=6)
    cracks = smoothstep(0.75, 0.95, spectral(seed + 3, 2.0, sx=3.0, sy=1.0))
    h = 0.55 * ridged + 0.3 * detail + 0.15 * spectral(seed + 4, 2.5)
    h = h * (1 - furrow * (1 - smoothstep(0.15, 0.55, ridged)))
    h = np.clip(h - 0.3 * cracks, 0, 1)
    col = ramp(h, [(0, rgb(*dark)), (0.5, rgb(*mid)), (1, rgb(*light))])
    lichen = smoothstep(0.7, 0.85, spectral(seed + 5, 1.8)) * smoothstep(0.4, 0.7, h)
    col = col * (1 - 0.5 * lichen[..., None]) + rgb(120, 130, 96) * 0.5 * lichen[..., None]
    return col, h


def oak_log(p):
    col, h = bark(100, (34, 26, 18), (78, 60, 40), (120, 100, 76))
    p.save("oak_log", col, h, 0.12, f0=0.03, porosity=0.6, depth=10)


def log_top(p, name, stops, bark_args, seed):
    x, y = grid()
    c = N / 2 + 6 * N / 256
    r = np.hypot(x - c, y - c * 0.97)
    warp = spectral(seed, 2.2) * 6
    rings = 0.5 + 0.5 * np.sin(r / (5.5 * N / 256) * 2 * math.pi / 2 + warp)
    t = 0.6 * rings + 0.4 * spectral(seed + 1, 1.0)
    col = ramp(t, stops)
    ang = np.arctan2(y - c, x - c)
    radial = np.zeros_like(r)
    for a0 in np.random.default_rng(seed + 2).random(4) * 2 * math.pi:
        da = np.abs((ang - a0 + math.pi) % (2 * math.pi) - math.pi) * r
        radial = np.maximum(radial, smoothstep(2.0, 0.3, da) * smoothstep(N * 0.05, N * 0.35, r))
    col *= (1 - 0.5 * radial)[..., None]
    h = 0.7 + 0.1 * rings - 0.4 * radial
    saw = 0.5 + 0.5 * np.sin(2 * math.pi * 40 * (x + y * 0.2) / N)
    h = h + 0.05 * saw
    bcol, bh = bark(*bark_args)
    edge = np.minimum(np.minimum(x, N - 1 - x), np.minimum(y, N - 1 - y))
    bw = (18 + 6 * spectral(seed + 3, 2.0)) * N / 256
    m = smoothstep(bw, bw - 2, edge)
    col = col * (1 - m[..., None]) + bcol * m[..., None]
    col *= (1 - 0.4 * smoothstep(bw + 6, bw, edge) * (1 - m))[..., None]
    h = h * (1 - m) + bh * m
    p.save(name, col, h, 0.2 * (1 - m) + 0.1, f0=0.035, porosity=0.4, depth=6)


def leaves(p, name, seed, count=900, size=(14, 26), alpha_keep=0.85, needles=False):
    r = np.random.default_rng(seed)
    n = N
    sc = n / 256
    bright = np.zeros((n, n))
    height = np.zeros((n, n))
    alpha = np.zeros((n, n))
    zbuf = np.full((n, n), -1.0)
    x, y = grid()
    for i in range(count):
        cx, cy = r.random() * n, r.random() * n
        L = (size[0] + r.random() * (size[1] - size[0])) * sc
        W = L * (0.12 if needles else (0.32 + r.random() * 0.12))
        a = r.random() * 2 * math.pi
        z = r.random()
        R = int(L) + 2
        x0, y0 = int(cx) - R, int(cy) - R
        ys_ = (np.arange(y0, y0 + 2 * R) % n)
        xs_ = (np.arange(x0, x0 + 2 * R) % n)
        lx, ly = np.meshgrid(np.arange(x0, x0 + 2 * R) - cx, np.arange(y0, y0 + 2 * R) - cy)
        u = lx * math.cos(a) + ly * math.sin(a)
        v = -lx * math.sin(a) + ly * math.cos(a)
        # leaf outline: pointed ellipse
        tt = np.clip(u / L, -1, 1)
        halfw = W * np.sqrt(np.maximum(1 - tt * tt, 0)) * (1 - 0.3 * tt)
        inside = (np.abs(u) <= L) & (np.abs(v) <= halfw)
        if not inside.any():
            continue
        sub_z = zbuf[np.ix_(ys_, xs_)]
        win = inside & (z > sub_z)
        b = 0.55 + 0.45 * r.random()
        vein = smoothstep(1.2 * sc, 0.2, np.abs(v)) * 0.18
        side = 0.85 + 0.15 * np.sign(v)
        val = b * (0.75 + 0.25 * (u / L + 1) / 2) * side - vein
        hv = z * 0.6 + 0.4 * (1 - np.abs(v) / np.maximum(halfw, 1e-3)) * inside
        blk = bright[np.ix_(ys_, xs_)]
        hb = height[np.ix_(ys_, xs_)]
        zb = sub_z
        blk = np.where(win, val, blk)
        hb = np.where(win, hv, hb)
        zb = np.where(win, z, zb)
        bright[np.ix_(ys_, xs_)] = blk
        height[np.ix_(ys_, xs_)] = hb
        zbuf[np.ix_(ys_, xs_)] = zb
        alpha[np.ix_(ys_, xs_)] = np.maximum(alpha[np.ix_(ys_, xs_)], inside.astype(float))
    # dark interior where leaves are deep in the canopy
    occl = blur(alpha, 4)
    g = bright * (0.65 + 0.35 * (1 - occl)) + 0.15
    g = np.clip(g, 0, 1)
    p.save(name, np.dstack([g, g, g]), height, 0.35 + 0.2 * bright, f0=0.035, sss=0.85,
           alpha=alpha, depth=4, ao_into_albedo=0.5)


def bricks(p):
    seed = 120
    rows, per = 8, 2
    rh, bw = N / rows, N / per
    x, y = grid()
    row = np.floor(y / rh).astype(int)
    off = (row % 2) * bw / 2
    bx = np.floor((x + off) / bw).astype(int) % per
    brick_id = row * per + bx
    lx = (x + off) % bw
    ly = y % rh
    mortar_w = 5 * N / 256
    erosion = spectral(seed, 1.5) * 4 * N / 256
    d_edge = np.minimum(np.minimum(lx, bw - lx), np.minimum(ly, rh - ly)) - erosion * 0.6
    brick = smoothstep(mortar_w * 0.5, mortar_w * 0.5 + 2, d_edge)
    r = np.random.default_rng(seed + 1)
    tone = r.random(rows * per)
    burn = r.random(rows * per)
    base = ramp(tone[brick_id], [(0, rgb(120, 52, 38)), (0.5, rgb(150, 70, 50)), (1, rgb(172, 92, 66))])
    surf = spectral(seed + 2, 1.3, fmin=4)
    base = base * (0.82 + 0.3 * surf)[..., None]
    char = smoothstep(0.6, 1.0, burn[brick_id]) * smoothstep(rh * 0.5, 0, d_edge + 6)
    base = base * (1 - 0.35 * char[..., None])
    pits = smoothstep(0.82, 0.95, spectral(seed + 3, 0.6, fmin=10))
    base = base * (1 - 0.35 * pits[..., None])
    mortar = rgb(170, 164, 152) * (0.75 + 0.35 * spectral(seed + 4, 0.8))[..., None]
    col = mortar * (1 - brick[..., None]) + base * brick[..., None]
    h = brick * (0.75 + 0.15 * surf - 0.25 * pits) + (1 - brick) * 0.25 * spectral(seed + 5, 1.0)
    p.save("bricks", col, h, 0.22 + 0.1 * brick, f0=0.04, porosity=0.6, depth=8)


def stone_bricks(p, name="stone_bricks", mossy=False, cracked=False):
    seed = 140
    rows = 2
    rh = N / rows
    bw = N
    x, y = grid()
    row = np.floor(y / rh).astype(int)
    off = (row % 2) * bw / 2
    lx = (x + off) % bw
    ly = y % rh
    bid = row * 2 + np.floor(((x + off) % N) / bw).astype(int)
    erosion = spectral(seed, 1.6) * 5 * N / 256
    d_edge = np.minimum(np.minimum(lx, bw - lx), np.minimum(ly, rh - ly)) - erosion * 0.5
    gap = 3 * N / 256
    block = smoothstep(gap, gap + 2, d_edge)
    bevel = smoothstep(gap, gap + 12 * N / 256, d_edge)
    col, h, crack = stone_base(seed + 1, tone=(124, 124, 122))
    r = np.random.default_rng(seed + 2)
    col = col * (0.9 + 0.2 * r.random(8)[bid % 8])[..., None]
    h = 0.35 * h + 0.65 * bevel
    if cracked:
        xw, yw = warped_grid(seed + 5, 16)
        f1, f2, _ = voronoi(jittered(seed + 6, 3), xw, yw)
        big = smoothstep(3.5, 0, f2 - f1) * smoothstep(0.4, 0.6, spectral(seed + 7, 2))
        h = h - 0.6 * big
        col *= (1 - 0.65 * big)[..., None]
    col = col * (1 - block[..., None]) * 0.35 + col * block[..., None]
    sss = 0.0
    smooth = 0.25 + 0.1 * bevel
    if mossy:
        m = spectral(seed + 30, 2.3)
        fuzz = spectral(seed + 31, 0.5)
        moss = np.clip(smoothstep(0.5, 0.7, m) + (1 - bevel) * smoothstep(0.25, 0.5, m), 0, 1)
        moss = moss * smoothstep(0.25, 0.55, fuzz + moss * 0.4)
        mcol = ramp(fuzz, [(0, rgb(40, 62, 22)), (0.6, rgb(78, 108, 38)), (1, rgb(118, 138, 58))])
        col = col * (1 - moss[..., None]) + mcol * moss[..., None]
        h = h + 0.15 * moss * fuzz
        sss = 0.5 * moss
        smooth = smooth * (1 - moss) + 0.08 * moss
    p.save(name, col, np.clip(h, 0, 1), smooth, f0=0.04, porosity=0.3, sss=sss, depth=8)


def deepslate(p, name="deepslate", top=False, seed=160):
    if top:
        streak = spectral(seed, 2.0)
    else:
        streak = spectral(seed, 2.0, sx=6.0, sy=1.0)
    fine = spectral(seed + 1, 1.0, fmin=8, sx=1.0 if top else 3.0)
    h = 0.6 * streak + 0.4 * fine
    if top:
        x, y = warped_grid(seed + 2, 10)
        f1, f2, _ = voronoi(jittered(seed + 3, 4), x, y)
        h = h * smoothstep(0, 5, f2 - f1)
    col = ramp(h, [(0, rgb(32, 32, 38)), (0.5, rgb(68, 68, 74)), (1, rgb(98, 98, 104))])
    p.save(name, col, h, 0.3 + 0.2 * fine, f0=0.045, porosity=0.15, depth=6)


def ore(p, name, seed, color_stops, smooth=0.6, f0=0.05, metal=None, emission=0.0,
        clusters=5, crystal=True, base="stone"):
    col, h, _ = stone_base(10)
    r = np.random.default_rng(seed)
    x, y = grid()
    mask = np.zeros((N, N))
    for _ in range(clusters):
        cx, cy = r.random() * N, r.random() * N
        rad = (16 + r.random() * 22) * N / 256
        dx = (x - cx + N / 2) % N - N / 2
        dy = (y - cy + N / 2) % N - N / 2
        d = np.hypot(dx, dy) / rad
        mask = np.maximum(mask, 1 - d)
    blob = spectral(seed + 1, 1.6, fmin=4)
    m = smoothstep(0.35, 0.5, mask + (blob - 0.5) * 0.6)
    xw, yw = warped_grid(seed + 2, 3)
    pts = r.random((420, 2)) * N
    f1, f2, idx = voronoi(pts, xw, yw)
    facet = r.random(len(pts))
    # break the vein into separate grains with stone between them
    grains = smoothstep(0.5, 2.5, f2 - f1) * (facet[idx] > 0.25)
    m = m * np.where(m > 0.85, 1.0, grains)
    if crystal:
        sh = 0.5 + 0.5 * facet[idx] * smoothstep(0, 3, f2 - f1)
    else:
        sh = 0.6 + 0.4 * spectral(seed + 3, 1.0)
    ocol = ramp(np.clip(sh, 0, 1), color_stops)
    rim = smoothstep(0.0, 0.25, m) * (1 - smoothstep(0.25, 0.6, m))
    col = col * (1 - 0.35 * rim[..., None])
    col = col * (1 - m[..., None]) + ocol * m[..., None]
    h = h * (1 - m) + (0.75 + 0.25 * sh) * m
    smap = 0.25 * (1 - m) + smooth * m * (0.7 + 0.3 * facet[idx])
    if metal is not None:
        g = np.where(m > 0.5, metal, 10)
        p.save(name, col, h, smap, metal=g, porosity=0.2 * (1 - m), emission=emission * m, depth=7)
    else:
        p.save(name, col, h, smap, f0=0.04 * (1 - m) + f0 * m, porosity=0.2 * (1 - m),
               emission=emission * m * sh, depth=7)


def metal_block(p, name, seed, stops, metal, smooth=0.8, panels=2):
    x, y = grid()
    brushed = spectral(seed, 0.4, sx=1.0, sy=40.0)
    scratch = smoothstep(0.85, 0.98, spectral(seed + 1, 0.5, sx=0.2, sy=1.0))
    pw = N / panels
    lx, ly = x % pw, y % pw
    d = np.minimum(np.minimum(lx, pw - lx), np.minimum(ly, pw - ly))
    bevel = smoothstep(2 * N / 256, 12 * N / 256, d)
    groove = smoothstep(3 * N / 256, 0, d)
    t = 0.6 + 0.25 * brushed + 0.15 * spectral(seed + 2, 2.2)
    col = ramp(np.clip(t, 0, 1), stops)
    col *= (1 - 0.5 * groove)[..., None]
    rivets = np.zeros_like(x)
    for ox in (10, pw - 10):
        for oy in (10, pw - 10):
            dd = np.hypot(lx - ox * N / 256 if ox == 10 else lx - (pw - 10 * N / 256),
                          ly - oy * N / 256 if oy == 10 else ly - (pw - 10 * N / 256))
            rivets = np.maximum(rivets, smoothstep(5 * N / 256, 2 * N / 256, dd))
    h = 0.5 * bevel + 0.1 * brushed + 0.35 * rivets
    sm = smooth - 0.25 * scratch - 0.1 * (1 - bevel) + 0.05 * brushed
    p.save(name, col, h, sm, metal=metal, porosity=0.0, depth=6, ao_into_albedo=0.4)


def obsidian(p):
    seed = 200
    x, y = warped_grid(seed, 6)
    pts = jittered(seed + 1, 7, 1.0)
    f1, f2, idx = voronoi(pts, x, y)
    r = np.random.default_rng(seed + 2)
    tone = r.random(len(pts))
    conch = 0.5 + 0.5 * np.sin(f1 * 0.25 + tone[idx] * 6) * spectral(seed + 4, 2.0)
    t = 0.5 * tone[idx] + 0.3 * conch + 0.2 * spectral(seed + 3, 1.2)
    col = ramp(t, [(0, rgb(6, 5, 10)), (0.6, rgb(20, 14, 30)), (0.9, rgb(44, 28, 66)), (1, rgb(84, 60, 116))])
    h = 0.6 * smoothstep(0, 4, f2 - f1) + 0.3 * conch * 0.3 + 0.2 * tone[idx]
    p.save("obsidian", col, h, 0.85 + 0.1 * conch, f0=0.05, depth=5, ao_into_albedo=0.3)


def bedrock(p):
    seed = 210
    h = spectral(seed, 1.8)
    x, y = warped_grid(seed + 1, 12)
    f1, f2, idx = voronoi(jittered(seed + 2, 6), x, y)
    chunks = smoothstep(0, 10, f2 - f1)
    h = 0.5 * h + 0.5 * chunks * np.random.default_rng(seed + 3).random(36)[idx]
    col = ramp(h, [(0, rgb(18, 18, 18)), (0.45, rgb(60, 60, 60)), (0.8, rgb(118, 116, 112)), (1, rgb(160, 158, 152))])
    p.save("bedrock", col, h, 0.2, f0=0.04, porosity=0.1, depth=14)


def snow(p):
    seed = 220
    h = 0.6 * spectral(seed, 2.4) + 0.4 * spectral(seed + 1, 1.0, fmin=10)
    col = ramp(h, [(0, rgb(200, 212, 228)), (0.6, rgb(236, 242, 250)), (1, rgb(252, 253, 255))])
    sparkle = smoothstep(0.93, 0.99, spectral(seed + 2, 0.0, fmin=60))
    p.save("snow", col, h, 0.35 + 0.6 * sparkle, f0=0.02, sss=0.6, depth=3, ao_into_albedo=0.4)


def ice(p, name="ice", alpha=0.75, seed=230):
    xw, yw = warped_grid(seed, 10)
    f1, f2, _ = voronoi(jittered(seed + 1, 4), xw, yw)
    cracks = smoothstep(2.0, 0, f2 - f1) * smoothstep(0.35, 0.6, spectral(seed + 2, 2.0))
    bub = smoothstep(0.88, 0.97, spectral(seed + 3, 0.2, fmin=30))
    t = 0.6 * spectral(seed + 4, 2.4) + 0.4 * bub
    col = ramp(t, [(0, rgb(120, 160, 214)), (0.6, rgb(160, 196, 238)), (1, rgb(214, 232, 252))])
    col = col + 0.4 * cracks[..., None]
    h = 0.8 - 0.4 * cracks + 0.1 * spectral(seed + 5, 2.0)
    a = np.clip(alpha + 0.25 * cracks + 0.15 * bub, 0, 1)
    p.save(name, np.clip(col, 0, 1), h, 0.95 - 0.4 * cracks, f0=0.02, alpha=a, depth=3, ao_into_albedo=0.0)


def clay(p):
    seed = 240
    h = 0.6 * spectral(seed, 2.4) + 0.4 * spectral(seed + 1, 1.2, fmin=6)
    col = ramp(h, [(0, rgb(130, 136, 150)), (0.5, rgb(158, 164, 176)), (1, rgb(180, 186, 196))])
    p.save("clay", col, h, 0.35, f0=0.04, porosity=0.9, depth=3)


def glowstone(p):
    seed = 250
    x, y = warped_grid(seed, 5)
    pts = np.random.default_rng(seed + 1).random((120, 2)) * N
    f1, f2, idx = voronoi(pts, x, y)
    r = np.random.default_rng(seed + 2)
    glow = r.random(len(pts))
    edge = smoothstep(0, 5, f2 - f1)
    t = np.clip(glow[idx] * edge * (0.7 + 0.3 * spectral(seed + 3, 1.0)), 0, 1)
    col = ramp(t, [(0, rgb(90, 60, 30)), (0.4, rgb(190, 130, 60)), (0.75, rgb(250, 210, 120)), (1, rgb(255, 245, 200))])
    h = 0.3 + 0.7 * edge * glow[idx]
    p.save("glowstone", col, h, 0.6, f0=0.05, emission=smoothstep(0.25, 0.8, t), depth=6, ao_into_albedo=0.2)


def glass(p):
    x, y = grid()
    d = np.minimum(np.minimum(x, N - 1 - x), np.minimum(y, N - 1 - y))
    frame = (d < 4 * N / 256).astype(float)
    corner = smoothstep(14 * N / 256, 0, np.hypot(np.minimum(x, N - 1 - x), np.minimum(y, N - 1 - y))) * (1 - frame)
    alpha = np.clip(frame * 0.9 + corner * 0.5, 0, 1)
    alpha = np.where(alpha > 0.12, alpha, 0)
    col = np.dstack([0.82 + 0 * x, 0.9 + 0 * x, 0.94 + 0 * x])
    col = col * (0.85 + 0.15 * spectral(260, 2))[..., None]
    p.save("glass", col, 0.9 - 0.3 * frame, 0.97, f0=0.04, alpha=alpha, depth=2, ao_into_albedo=0)


def water_frames(seed, frames, n, flow=False):
    r = []
    base = [spectral(seed + i, 2.4, fmin=2, n=n) - 0.5 for i in range(6)]
    fine = [spectral(seed + 10 + i, 1.6, fmin=6, n=n) - 0.5 for i in range(2)]
    for f in range(frames):
        a = 2 * math.pi * f / frames
        h = (base[0] * math.cos(a) + base[1] * math.sin(a)
             + 0.6 * (base[2] * math.cos(2 * a) + base[3] * math.sin(2 * a))
             + 0.5 * (fine[0] * math.cos(3 * a) + fine[1] * math.sin(3 * a)))
        if flow:
            h = np.roll(h, int(round(f * n / frames)), 0)
        h = np.clip(h * 0.9 + 0.5, 0, 1)
        g = 0.62 + 0.3 * h
        alb = np.dstack([g, g, g])
        r.append((alb, h, np.full((n, n), 0.72)))
    return r


def lava_frames(seed, frames, n, flow=False):
    out, emis = [], []
    base = [spectral(seed + i, 2.2, fmin=2, n=n) - 0.5 for i in range(4)]
    cells = [spectral(seed + 10 + i, 1.4, fmin=4, n=n) - 0.5 for i in range(2)]
    for f in range(frames):
        a = 2 * math.pi * f / frames
        h = base[0] * math.cos(a) + base[1] * math.sin(a) + 0.5 * (base[2] * math.cos(2 * a) + base[3] * math.sin(2 * a))
        c = cells[0] * math.cos(a) + cells[1] * math.sin(a)
        if flow:
            h = np.roll(h, int(round(f * n / frames)), 0)
            c = np.roll(c, int(round(f * n / frames)), 0)
        t = np.clip(0.5 + h * 1.1 + c * 0.6, 0, 1)
        col = ramp(t, [(0, rgb(40, 8, 2)), (0.35, rgb(150, 30, 4)), (0.6, rgb(240, 100, 10)),
                       (0.85, rgb(255, 190, 50)), (1, rgb(255, 240, 160))])
        out.append((col, 1 - t, np.ones((n, n))))
        emis.append(np.clip(0.2 + t, 0, 1))
    return out, emis


def environment(root):
    env = root / "assets/minecraft/textures/environment"
    env.mkdir(parents=True, exist_ok=True)
    n = 128
    x, y = np.mgrid[0:n, 0:n].astype(float)
    r = np.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2)
    core = smoothstep(0.24, 0.18, r)
    glow = np.exp(-r * 6) * 0.9 + np.exp(-r * 2.2) * 0.25
    v = np.clip(core + glow, 0, 1)
    col = np.dstack([v, v * 0.93 + 0.0 * r, v * 0.8, np.ones_like(v)])
    col[..., :3] = np.clip(col[..., :3] * np.array([1.0, 0.97, 0.88]), 0, 1)
    Pack._png(env / "sun.png", col)


def pack_icon(root):
    blk = root / "assets/minecraft/textures/block"
    names = ["grass_block_side", "cobblestone", "oak_planks", "diamond_ore"]
    icon = Image.new("RGBA", (128, 128))
    for i, nm in enumerate(names):
        im = Image.open(blk / f"{nm}.png").convert("RGBA").resize((64, 64), Image.LANCZOS)
        if nm == "grass_block_side":
            ov = Image.open(blk / "grass_block_side_overlay.png").convert("RGBA").resize((64, 64), Image.LANCZOS)
            tint = Image.new("RGBA", ov.size, (124, 189, 107, 255))
            from PIL import ImageChops
            ov2 = ImageChops.multiply(ov, tint)
            ov2.putalpha(ov.split()[3])
            im.alpha_composite(ov2)
        icon.paste(im, ((i % 2) * 64, (i // 2) * 64))
    icon.save(root / "pack.png", optimize=True)


# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# More blocks: stone family, sedimentary, dirt family, wood, minerals,
# Nether/End, plants. Built from the same primitives as above.
# --------------------------------------------------------------------------

def border_dist(panels=1):
    x, y = grid()
    pw = N / panels
    lx, ly = x % pw, y % pw
    return np.minimum(np.minimum(lx, pw - lx), np.minimum(ly, pw - ly))


def masonry_layout(rows, cols, offset=True, jitter_seed=None):
    """Brick/tile layout. Returns distance to the nearest joint (px) and a brick id."""
    x, y = grid()
    rh, bw = N / rows, N / cols
    row = np.floor(y / rh).astype(int)
    off = (row % 2) * bw / 2 if offset else 0
    bx = np.floor(((x + off) % N) / bw).astype(int)
    lx = (x + off) % bw
    ly = y % rh
    d = np.minimum(np.minimum(lx, bw - lx), np.minimum(ly, rh - ly))
    return d, row * cols + bx


def masonry(p, name, seed, face, rows, cols, offset=True, gap=3.0, bevel=10.0, mortar=(40, 38, 36),
            smooth=0.3, f0=0.04, porosity=0.3, depth=8, tone_var=0.15, chip=4.0):
    """face(seed) -> (col, h) surface of a single brick/tile material."""
    d, bid = masonry_layout(rows, cols, offset)
    s = N / 256
    erosion = spectral(seed, 1.6) * chip * s
    d = d - erosion * 0.5
    block = smoothstep(gap * s, gap * s + 1.5, d)
    bev = smoothstep(gap * s, (gap + bevel) * s, d)
    col, h = face(seed + 1)
    r = np.random.default_rng(seed + 2)
    tone = 1 + (r.random(rows * cols) - 0.5) * 2 * tone_var
    col = col * tone[bid % (rows * cols)][..., None]
    mcol = rgb(*mortar) * (0.8 + 0.4 * spectral(seed + 3, 0.8))[..., None]
    col = col * block[..., None] + mcol * (1 - block[..., None])
    hh = 0.3 * h + 0.7 * bev
    p.save(name, col, np.clip(hh, 0, 1), smooth * block + 0.15 * (1 - block), f0=f0, porosity=porosity, depth=depth)


def face_stone(stops, beta=2.0, fine=0.35):
    def f(seed):
        h = (1 - fine) * spectral(seed, beta) + fine * spectral(seed + 1, 0.9, fmin=10)
        return ramp(h, stops), h
    return f


def speckled_parts(seed, base_stops, speck_cols):
    t = 0.6 * spectral(seed + 3, 2.2) + 0.4 * spectral(seed + 8, 1.2, fmin=6, fmax=40)
    col = ramp(t, base_stops)
    h = 0.5 * spectral(seed + 5, 2.2) + 0.5 * spectral(seed + 4, 1.0, fmin=12)
    for i, (prob, c) in enumerate(speck_cols):
        g = 0.75 * spectral(seed + 20 + i, 1.2, fmin=6, fmax=34) + 0.25 * spectral(seed + 40 + i, 2.0)
        thr = np.percentile(g, 100 * (1 - prob))
        m = smoothstep(thr, thr + 0.03, g)
        shade = 0.8 + 0.4 * spectral(seed + 60 + i, 1.0, fmin=8)
        col = col * (1 - m[..., None]) + (rgb(*c) * shade[..., None]) * m[..., None]
        h = h + 0.12 * m
    return col, np.clip(h, 0, 1)


def polished(p, name, col, h, seed, smooth=0.7, border=14):
    d = border_dist()
    s = N / 256
    bev = smoothstep(1 * s, border * s, d)
    groove = smoothstep(3 * s, 0, d)
    col = col * (1 - 0.35 * groove)[..., None]
    scratches = smoothstep(0.9, 0.99, spectral(seed + 70, 0.4, sx=0.15))
    hh = 0.12 * h + 0.88 * bev
    p.save(name, col, hh, smooth - 0.25 * scratches - 0.2 * (1 - bev), f0=0.045, porosity=0.05, depth=5,
           ao_into_albedo=0.4)


ANDESITE = ([(0, rgb(110, 110, 110)), (1, rgb(150, 150, 148))], [(0.15, (60, 60, 62)), (0.12, (200, 200, 198))])
GRANITE = ([(0, rgb(140, 92, 74)), (1, rgb(180, 122, 100))], [(0.18, (40, 34, 34)), (0.15, (220, 196, 186)), (0.2, (196, 110, 90))])
DIORITE = ([(0, rgb(200, 200, 198)), (1, rgb(236, 236, 234))], [(0.18, (50, 50, 54)), (0.15, (140, 140, 140))])


def smooth_stone(p):
    col, h, _ = stone_base(900, tone=(160, 160, 158), contrast=0.08)
    d = border_dist()
    s = N / 256
    frame = smoothstep(10 * s, 6 * s, d) * smoothstep(1 * s, 4 * s, d)
    col = col * (1 - 0.18 * frame)[..., None]
    p.save("smooth_stone", col, 0.2 * h + 0.6 + 0.2 * smoothstep(1 * s, 8 * s, d) - 0.15 * frame,
           0.45, f0=0.04, porosity=0.15, depth=3)


def sedimentary(p, prefix, seed, stops):
    """Sandstone: side with bedding layers and a cap band, plus top and bottom."""
    x, y = grid()
    warp = spectral(seed, 2.6) * 10
    layers = 0.5 + 0.5 * np.sin(2 * math.pi * 9 * (y + warp) / N)
    grain = spectral(seed + 1, 0.4, fmin=30)
    big = spectral(seed + 2, 2.4)
    t = 0.45 * layers + 0.25 * grain + 0.3 * big
    col = ramp(t, stops)
    s = N / 256
    cap = smoothstep(46 * s, 42 * s, y)
    col = col * (1 + 0.08 * cap)[..., None]
    joint = smoothstep(4 * s, 0, np.abs(y - 44 * s))
    col = col * (1 - 0.35 * joint)[..., None]
    pits = smoothstep(0.85, 0.95, spectral(seed + 3, 0.6, fmin=8))
    h = 0.4 * layers + 0.2 * grain + 0.3 * big + 0.15 * cap - 0.3 * joint - 0.3 * pits
    p.save(f"{prefix}", col * (1 - 0.3 * pits)[..., None], np.clip(h, 0, 1), 0.2, f0=0.04, porosity=0.9, depth=6)
    # top: smooth, wind-polished with a frame
    t2 = 0.5 * big + 0.3 * grain + 0.2 * spectral(seed + 4, 1.4)
    d = border_dist()
    frame = smoothstep(12 * s, 8 * s, d)
    col2 = ramp(t2, stops) * (1 - 0.15 * frame)[..., None]
    p.save(f"{prefix}_top", col2, 0.5 + 0.3 * t2 - 0.2 * frame, 0.25, f0=0.04, porosity=0.9, depth=3)
    # bottom: rough, pitted
    t3 = 0.4 * big + 0.6 * grain
    pits3 = smoothstep(0.78, 0.92, spectral(seed + 5, 0.8, fmin=6))
    p.save(f"{prefix}_bottom", ramp(t3, stops) * (1 - 0.35 * pits3)[..., None], np.clip(t3 - 0.5 * pits3, 0, 1),
           0.15, f0=0.04, porosity=1.0, depth=7)
    # cut: two smooth slabs
    masonry(p, f"cut_{prefix}", seed + 10, face_stone(stops, 2.4, 0.4), 2, 1, offset=False, gap=2.0, bevel=6,
            mortar=tuple(int(c * 255 * 0.55) for c in stops[0][1]), smooth=0.25, porosity=0.9, depth=5)


def dirt_variant(p, name, seed, pebbles=70, peb_size=(2, 8), tint=None, wet=0.0, roots=False):
    crumb = spectral(seed, 1.2, fmin=6)
    big = spectral(seed + 1, 2.4)
    t = 0.6 * big + 0.4 * crumb
    stops = [(0, rgb(58, 40, 26)), (0.45, rgb(98, 70, 46)), (1, rgb(132, 98, 66))]
    col = ramp(t, stops)
    if tint is not None:
        col = col * np.array(tint)
    h = 0.4 * big + 0.6 * crumb
    pts = np.random.default_rng(seed + 2).random((pebbles, 2)) * N
    f1, _, idx = voronoi(pts)
    r = np.random.default_rng(seed + 3)
    rad = (peb_size[0] + r.random(len(pts)) * (peb_size[1] - peb_size[0])) * N / 256
    peb = smoothstep(rad[idx], rad[idx] * 0.4, f1)
    pcol = ramp(r.random(len(pts))[idx], [(0, rgb(80, 76, 70)), (0.5, rgb(128, 118, 102)), (1, rgb(160, 152, 140))])
    col = col * (1 - peb[..., None]) + pcol * peb[..., None]
    h = h * (1 - peb) + (0.6 + 0.4 * peb) * peb
    if roots:
        rt = 1 - np.abs(spectral(seed + 5, 2.0, sx=0.4) * 2 - 1)
        rt2 = 1 - np.abs(spectral(seed + 6, 2.0, sy=0.4) * 2 - 1)
        root = np.maximum(smoothstep(0.93, 0.98, rt), smoothstep(0.94, 0.985, rt2))
        col = col * (1 - root[..., None]) + rgb(150, 112, 74) * root[..., None]
        h = h + 0.25 * root
    col = col * (1 - 0.35 * wet)
    return col, np.clip(h, 0, 1), peb


def top_strip(base_col, base_h, cover_col, cover_h, seed, depth_px=(14, 40)):
    """Overlay an irregular band of another material along the top edge."""
    x, y = grid()
    s = N / 256
    edge = (depth_px[0] + (depth_px[1] - depth_px[0]) * spectral(seed, 1.8)[0][None, :].repeat(N, 0)) * s
    m = smoothstep(edge + 2, edge - 2, y)
    shade = blur(m, 3) * (1 - m)
    col = base_col * (1 - m[..., None]) + cover_col * m[..., None]
    col = col * (1 - 0.35 * shade[..., None])
    h = base_h * (1 - m) + (0.55 + 0.45 * cover_h) * m
    return col, np.clip(h, 0, 1), m


def soil_family(p):
    col, h, peb = dirt_variant(p, None, 1000, pebbles=180, peb_size=(3, 10))
    p.save("coarse_dirt", col, h, 0.15 + 0.3 * peb, f0=0.03, porosity=0.85, depth=8)
    col, h, peb = dirt_variant(p, None, 1010, roots=True)
    p.save("rooted_dirt", col, h, 0.15, f0=0.03, porosity=0.85, depth=7)

    # podzol: needle and leaf litter
    b, bh, c = blades(1020, 5000, (6, 16), 1.6)
    litter = np.where(c > 0, b, 0.3)
    lc = ramp(litter, [(0, rgb(48, 30, 16)), (0.5, rgb(104, 66, 32)), (1, rgb(150, 98, 50))])
    lh = blur(np.where(c > 0, bh, 0.0), 0.6)
    p.save("podzol_top", lc, lh, 0.15, f0=0.03, porosity=0.8, depth=5)
    dcol, dh, _ = dirt_variant(p, None, 1021)
    col, h, _ = top_strip(dcol, dh, lc, lh, 1022)
    p.save("podzol_side", col, h, 0.15, f0=0.03, porosity=0.8, depth=6)

    # mycelium: grey-violet fungal felt
    fz = 0.6 * spectral(1030, 0.6, fmin=12) + 0.4 * spectral(1031, 2.2)
    spores = smoothstep(0.86, 0.96, spectral(1032, 0.2, fmin=40))
    mc = ramp(fz, [(0, rgb(86, 70, 84)), (0.6, rgb(124, 108, 120)), (1, rgb(150, 138, 148))]) + 0.18 * spores[..., None]
    p.save("mycelium_top", mc, fz, 0.1, f0=0.03, sss=0.2, depth=3)
    col, h, _ = top_strip(dcol, dh, mc, fz, 1033, (10, 30))
    p.save("mycelium_side", col, h, 0.12, f0=0.03, porosity=0.6, depth=6)

    # moss block (not biome-tinted)
    fuzz = spectral(1040, 0.5)
    clumps = spectral(1041, 2.2)
    t = 0.55 * fuzz + 0.45 * clumps
    mcol = ramp(t, [(0, rgb(40, 62, 22)), (0.55, rgb(84, 112, 40)), (1, rgb(130, 150, 64))])
    p.save("moss_block", mcol, t, 0.08, f0=0.03, sss=0.55, depth=5)

    # dirt path: compacted, lighter, with wheel ruts
    pcol, ph, peb = dirt_variant(p, None, 1050, pebbles=40, tint=(1.18, 1.12, 1.0))
    x, _ = grid()
    rut = np.exp(-((x / N - 0.3) ** 2) / 0.004) + np.exp(-((x / N - 0.72) ** 2) / 0.004)
    pcol = pcol * (1 - 0.12 * rut)[..., None]
    ph = 0.4 + 0.35 * ph - 0.2 * rut
    p.save("dirt_path_top", pcol, ph, 0.25, f0=0.035, porosity=0.6, depth=4)
    col, h, _ = top_strip(dcol, dh, pcol, ph, 1051, (24, 34))
    p.save("dirt_path_side", col, h, 0.2, f0=0.03, porosity=0.7, depth=6)

    # farmland: tilled furrows
    for name, wet in (("farmland", 0.0), ("farmland_moist", 1.0)):
        fcol, fh, _ = dirt_variant(p, None, 1060, pebbles=30, wet=0.15 + 0.35 * wet)
        _, y = grid()
        warp = spectral(1061, 2.4) * 8
        furrow = 0.5 + 0.5 * np.cos(2 * math.pi * 4 * (y + warp) / N)
        fcol = fcol * (0.7 + 0.3 * furrow)[..., None]
        fh = 0.45 * fh + 0.55 * furrow
        p.save(name, fcol, fh, 0.15 + 0.45 * wet * (1 - furrow), f0=0.03 + 0.01 * wet, porosity=0.9 - 0.5 * wet, depth=9)

    # grass block side under snow
    snow_h = 0.6 * spectral(220, 2.4) + 0.4 * spectral(221, 1.0, fmin=10)
    scol = ramp(snow_h, [(0, rgb(200, 212, 228)), (0.6, rgb(236, 242, 250)), (1, rgb(252, 253, 255))])
    col, h, m = top_strip(dcol, dh, scol, snow_h, 1070, (30, 60))
    p.save("grass_block_snow", col, h, 0.2 + 0.2 * m, f0=0.03, porosity=0.6 * (1 - m), sss=0.5 * m, depth=6)

    # mud: wet, glossy, dark
    mh = 0.6 * spectral(1080, 2.4) + 0.4 * spectral(1081, 1.0, fmin=8)
    mcol = ramp(mh, [(0, rgb(40, 34, 32)), (0.5, rgb(62, 54, 50)), (1, rgb(84, 74, 66))])
    puddle = smoothstep(0.35, 0.2, mh)
    p.save("mud", mcol, mh, 0.55 + 0.4 * puddle, f0=0.03, porosity=0.2, depth=5)
    # packed mud: dried, with straw fibres
    pk = 0.6 * spectral(1090, 2.2) + 0.4 * spectral(1091, 1.0, fmin=8)
    pcol = ramp(pk, [(0, rgb(120, 86, 64)), (0.5, rgb(150, 112, 84)), (1, rgb(176, 136, 104))])
    straw = np.zeros((N, N))
    for i in range(3):
        f = spectral(1092 + i, 2.0, sx=0.3 if i % 2 else 3.0, sy=3.0 if i % 2 else 0.3)
        straw = np.maximum(straw, smoothstep(0.035, 0.0, np.abs(f - 0.5)) * smoothstep(0.5, 0.7, spectral(1095 + i, 1.5)))
    pcol = pcol * (1 - straw[..., None]) + rgb(196, 168, 100) * straw[..., None]
    p.save("packed_mud", pcol, pk + 0.15 * straw, 0.2, f0=0.035, porosity=0.8, depth=4)

    def mud_face(seed):
        hh = 0.6 * spectral(seed, 2.0) + 0.4 * spectral(seed + 1, 1.0, fmin=10)
        return ramp(hh, [(0, rgb(124, 92, 70)), (0.5, rgb(152, 116, 88)), (1, rgb(176, 140, 108))]), hh
    masonry(p, "mud_bricks", 1100, mud_face, 4, 2, gap=4, bevel=6, mortar=(96, 74, 58), smooth=0.2, porosity=0.8)


def stone_family(p):
    smooth_stone(p)
    for name, (stops, specks), seed in (("andesite", ANDESITE, 500), ("granite", GRANITE, 510), ("diorite", DIORITE, 520)):
        col, h = speckled_parts(seed, stops, specks)
        polished(p, f"polished_{name}", col, h, seed)

    deep = [(0, rgb(32, 32, 38)), (0.5, rgb(68, 68, 74)), (1, rgb(98, 98, 104))]
    # cobbled deepslate: dark angular cobbles
    h, gap, idx, rnd, surf = cobble_parts(1200, cells=6)
    col = ramp(rnd[idx], deep) * (0.75 + 0.4 * surf)[..., None]
    col = col * (1 - gap[..., None]) + rgb(16, 16, 20) * gap[..., None]
    p.save("cobbled_deepslate", col, h, 0.3, f0=0.045, porosity=0.2, depth=9)
    masonry(p, "deepslate_bricks", 1210, face_stone(deep, 2.0), 4, 2, gap=3, bevel=8, mortar=(18, 18, 22), smooth=0.3)
    masonry(p, "deepslate_tiles", 1220, face_stone(deep, 2.0), 4, 4, offset=False, gap=3, bevel=6,
            mortar=(14, 14, 18), smooth=0.35)
    col, h = face_stone(deep, 2.2, 0.2)(1230)
    polished(p, "polished_deepslate", col, h, 1230, smooth=0.6)

    tuff_c, tuff_h = speckled_parts(1240, [(0, rgb(90, 92, 84)), (1, rgb(122, 124, 112))],
                                    [(0.12, (60, 58, 52)), (0.1, (150, 146, 128))])
    vesicles = smoothstep(0.84, 0.94, spectral(1241, 0.8, fmin=10))
    p.save("tuff", tuff_c * (1 - 0.4 * vesicles)[..., None], np.clip(tuff_h - 0.5 * vesicles, 0, 1), 0.2,
           f0=0.04, porosity=0.6, depth=6)
    cal = 0.6 * spectral(1250, 2.2) + 0.4 * spectral(1251, 1.6, fmin=5)
    veins = smoothstep(0.03, 0.0, np.abs(spectral(1252, 2.2) - 0.5))
    ccol = ramp(cal, [(0, rgb(210, 212, 208)), (1, rgb(240, 242, 238))]) * (1 - 0.15 * veins)[..., None]
    p.save("calcite", ccol, cal, 0.45, f0=0.045, porosity=0.2, sss=0.15, depth=3)

    sedimentary(p, "sandstone", 1300, [(0, rgb(196, 172, 122)), (0.5, rgb(218, 200, 150)), (1, rgb(234, 220, 176))])
    sedimentary(p, "red_sandstone", 1310, [(0, rgb(150, 70, 30)), (0.5, rgb(184, 98, 44)), (1, rgb(206, 126, 66))])

    # terracotta: fired clay, matte, gently mottled
    tc = 0.6 * spectral(1320, 2.4) + 0.4 * spectral(1321, 1.0, fmin=10)
    p.save("terracotta", ramp(tc, [(0, rgb(132, 74, 50)), (1, rgb(166, 98, 70))]), tc, 0.3, f0=0.04, porosity=0.5, depth=2)
    wc = 0.6 * spectral(1330, 2.6) + 0.4 * spectral(1331, 0.6, fmin=20)
    p.save("white_concrete", ramp(wc, [(0, rgb(196, 198, 198)), (1, rgb(222, 224, 224))]), wc, 0.35, f0=0.04,
           porosity=0.3, depth=1.5)


def wood_family(p):
    DARK_OAK = [(0, rgb(46, 28, 14)), (0.5, rgb(70, 44, 22)), (1, rgb(96, 64, 34))]
    JUNGLE = [(0, rgb(120, 76, 50)), (0.5, rgb(156, 106, 72)), (1, rgb(184, 132, 94))]
    ACACIA = [(0, rgb(150, 70, 34)), (0.5, rgb(186, 98, 52)), (1, rgb(212, 124, 72))]
    planks(p, "dark_oak_planks", DARK_OAK, 1400)
    planks(p, "jungle_planks", JUNGLE, 1410)
    planks(p, "acacia_planks", ACACIA, 1420)

    logs = [
        ("dark_oak_log", (1430, (20, 14, 8), (44, 32, 20), (74, 58, 40)), DARK_OAK),
        ("jungle_log", (1440, (44, 34, 18), (86, 70, 40), (126, 108, 70)), JUNGLE),
        ("acacia_log", (1450, (54, 50, 44), (96, 90, 80), (130, 124, 112)), ACACIA),
        ("spruce_log", (110, (24, 16, 10), (54, 38, 24), (86, 64, 44)), SPRUCE),
    ]
    for name, args, stops in logs:
        if name != "spruce_log":
            p.save(name, *bark(*args)[:2], 0.12, 0.03, 0.6, depth=10)
        log_top(p, f"{name}_top", stops, args, args[0] + 5)

    # birch: white bark with dark horizontal lenticels and scars
    base = 0.6 * spectral(1460, 2.2) + 0.4 * spectral(1461, 0.8, fmin=10)
    col = ramp(base, [(0, rgb(196, 192, 182)), (1, rgb(236, 234, 226))])
    dash = smoothstep(0.82, 0.9, spectral(1462, 1.4, sx=8.0, fmin=4))
    scars = smoothstep(0.72, 0.85, spectral(1463, 2.4, sx=2.5))
    dark = np.clip(dash + scars, 0, 1)
    col = col * (1 - dark[..., None]) + rgb(40, 36, 32) * dark[..., None]
    peel = smoothstep(0.86, 0.95, spectral(1464, 1.8, sx=4.0))
    col = col * (1 - 0.15 * peel[..., None]) + rgb(200, 150, 110) * 0.15 * peel[..., None]
    p.save("birch_log", col, 0.7 * base + 0.3 - 0.5 * dark + 0.1 * peel, 0.25, 0.03, 0.4, depth=6)
    log_top(p, "birch_log_top", BIRCH, (1465, (40, 36, 32), (190, 186, 176), (232, 230, 222)), 1466)

    # stripped oak: bare vertical grain
    c, t, lines = wood_grain(1470, OAK, rings=8)
    c, t = np.transpose(c, (1, 0, 2)), t.T
    p.save("stripped_oak_log", c, 0.6 + 0.4 * t, 0.35, f0=0.04, porosity=0.25, depth=4)
    log_top(p, "stripped_oak_log_top", OAK, (1471, (112, 78, 44), (156, 116, 70), (186, 146, 94)), 1472)


def gem_block(p, name, seed, stops, smooth, f0=None, metal=None, emission=0.0, cells=60, sss=0.0):
    d = border_dist()
    s = N / 256
    bev = smoothstep(2 * s, 16 * s, d)
    x, y = warped_grid(seed, 2)
    pts = np.random.default_rng(seed + 1).random((cells, 2)) * N
    f1, f2, idx = voronoi(pts, x, y)
    facet = np.random.default_rng(seed + 2).random(cells)
    edge = smoothstep(0, 3, f2 - f1)
    t = np.clip(0.25 + 0.6 * facet[idx] * edge + 0.15 * spectral(seed + 3, 1.0) + 0.15 * (1 - bev), 0, 1)
    col = ramp(t, stops) * (0.7 + 0.3 * bev)[..., None]
    h = 0.55 * bev + 0.35 * edge * facet[idx] + 0.1
    kw = dict(emission=emission * t if emission else None, depth=5, ao_into_albedo=0.3)
    if metal is not None:
        p.save(name, col, h, smooth * (0.8 + 0.2 * edge), metal=metal, **kw)
    else:
        p.save(name, col, h, smooth * (0.8 + 0.2 * edge), f0=f0, sss=sss, **kw)


def mineral_family(p):
    gem_block(p, "diamond_block", 1500, [(0, rgb(40, 150, 150)), (0.6, rgb(110, 225, 220)), (1, rgb(225, 255, 252))], 0.95, f0=0.17)
    gem_block(p, "emerald_block", 1510, [(0, rgb(10, 100, 40)), (0.6, rgb(50, 200, 100)), (1, rgb(170, 255, 190))], 0.92, f0=0.07)
    gem_block(p, "redstone_block", 1520, [(0, rgb(110, 6, 4)), (0.6, rgb(200, 24, 14)), (1, rgb(255, 90, 60))], 0.6, f0=0.05, emission=0.15)
    gem_block(p, "amethyst_block", 1530, [(0, rgb(70, 40, 120)), (0.6, rgb(142, 96, 200)), (1, rgb(214, 180, 255))], 0.85, f0=0.05, cells=140, sss=0.2)
    gem_block(p, "coal_block", 1540, [(0, rgb(8, 8, 10)), (0.7, rgb(28, 28, 32)), (1, rgb(70, 70, 76))], 0.5, f0=0.05, cells=90)
    lap = 0.6 * spectral(1550, 1.8) + 0.4 * spectral(1551, 0.8, fmin=10)
    lcol = ramp(lap, [(0, rgb(14, 34, 110)), (0.6, rgb(36, 70, 170)), (1, rgb(70, 110, 220))])
    pyrite = smoothstep(0.9, 0.97, spectral(1552, 0.4, fmin=20))
    lcol = lcol * (1 - pyrite[..., None]) + rgb(220, 180, 80) * pyrite[..., None]
    d = border_dist()
    bev = smoothstep(2 * N / 256, 14 * N / 256, d)
    p.save("lapis_block", lcol * (0.75 + 0.25 * bev)[..., None], 0.6 * bev + 0.3 * lap, 0.55 + 0.3 * pyrite,
           metal=np.where(pyrite > 0.5, 231, 12), depth=5)
    metal_block(p, "netherite_block", 1560, [(0, rgb(40, 36, 38)), (1, rgb(88, 80, 82))], 255, 0.72)

    for name, seed, stops, metal in (("raw_iron_block", 1570, [(0, rgb(120, 90, 74)), (1, rgb(216, 182, 158))], 230),
                                     ("raw_gold_block", 1580, [(0, rgb(160, 110, 20)), (1, rgb(250, 214, 90))], 231)):
        h, gap, idx, rnd, surf = cobble_parts(seed, cells=7)
        col = ramp(rnd[idx] * 0.6 + 0.4 * surf, stops)
        col = col * (1 - 0.6 * gap[..., None])
        shine = smoothstep(0.6, 0.85, surf) * (1 - gap)
        p.save(name, col, h, 0.35 + 0.4 * shine, metal=np.where(shine > 0.4, metal, 20), depth=9)

    # quartz: polished white with faint veins
    q = 0.7 * spectral(1590, 2.6) + 0.3 * spectral(1591, 0.8, fmin=12)
    veins = smoothstep(0.02, 0.0, np.abs(spectral(1592, 2.0) - 0.5)) * 0.6
    qcol = ramp(q, [(0, rgb(222, 216, 208)), (1, rgb(244, 240, 234))]) * (1 - 0.12 * veins)[..., None]
    polished(p, "quartz_block_side", qcol, q, 1590, smooth=0.75, border=4)
    polished(p, "quartz_block_top", qcol, q, 1593, smooth=0.75, border=16)
    polished(p, "quartz_block_bottom", qcol * 0.97, q, 1594, smooth=0.7, border=4)

    # prismarine: shifting teal mineral tiles
    pr = spectral(1600, 1.6)
    h, gap, idx, rnd, surf = cobble_parts(1601, cells=4)
    pcol = ramp(0.5 * pr + 0.5 * rnd[idx], [(0, rgb(52, 110, 100)), (0.5, rgb(90, 160, 148)), (1, rgb(140, 200, 180))])
    pcol = pcol * (1 - 0.5 * gap[..., None])
    p.save("prismarine", pcol, h, 0.55, f0=0.05, porosity=0.1, depth=7)

    def dp_face(seed):
        hh = spectral(seed, 1.8)
        return ramp(hh, [(0, rgb(26, 62, 52)), (1, rgb(56, 100, 84))]), hh
    masonry(p, "dark_prismarine", 1610, dp_face, 4, 2, gap=2.5, bevel=5, mortar=(14, 34, 30), smooth=0.55)


def nether_end_family(p):
    # netherrack: fleshy, porous rock
    x, y = warped_grid(1700, 8)
    f1, f2, idx = voronoi(jittered(1701, 9, 1.0), x, y)
    lump = smoothstep(0, 9, f2 - f1)
    pores = smoothstep(0.82, 0.93, spectral(1702, 0.6, fmin=12))
    t = 0.5 * lump + 0.3 * spectral(1703, 1.2) + 0.2 * np.random.default_rng(1704).random(81)[idx]
    col = ramp(t, [(0, rgb(70, 20, 20)), (0.5, rgb(112, 36, 34)), (1, rgb(150, 62, 58))]) * (1 - 0.5 * pores)[..., None]
    p.save("netherrack", col, np.clip(t - 0.5 * pores, 0, 1), 0.25, f0=0.04, porosity=0.5, depth=8)

    def nb_face(seed):
        hh = 0.6 * spectral(seed, 2.0) + 0.4 * spectral(seed + 1, 1.0, fmin=10)
        return ramp(hh, [(0, rgb(36, 14, 18)), (0.5, rgb(52, 22, 26)), (1, rgb(76, 34, 38))]), hh
    masonry(p, "nether_bricks", 1710, nb_face, 8, 4, gap=3, bevel=4, mortar=(18, 8, 10), smooth=0.3)

    ss = 0.5 * spectral(1720, 2.2) + 0.5 * spectral(1721, 0.6, fmin=16)
    holes = smoothstep(0.82, 0.92, spectral(1722, 1.6, fmin=6))
    col = ramp(ss, [(0, rgb(52, 38, 30)), (0.5, rgb(84, 64, 50)), (1, rgb(112, 88, 70))]) * (1 - 0.6 * holes)[..., None]
    p.save("soul_sand", col, np.clip(ss - 0.7 * holes, 0, 1), 0.1, f0=0.03, porosity=1.0, depth=8)

    bs, bsh, _ = stone_base(1730, tone=(44, 40, 46), contrast=0.35)
    p.save("blackstone", bs, bsh, 0.3, f0=0.045, porosity=0.2, depth=6)
    x, y = warped_grid(1731, 10)
    f1, f2, idx = voronoi(jittered(1732, 5), x, y)
    poly = smoothstep(0, 4, f2 - f1)
    p.save("blackstone_top", bs * (0.6 + 0.4 * poly)[..., None], 0.4 * bsh + 0.6 * poly, 0.32, f0=0.045, depth=6)

    es = 0.6 * spectral(1740, 2.2) + 0.4 * spectral(1741, 0.8, fmin=10)
    pits = smoothstep(0.8, 0.9, spectral(1742, 1.0, fmin=8))
    col = ramp(es, [(0, rgb(196, 192, 136)), (1, rgb(232, 230, 176))]) * (1 - 0.45 * pits)[..., None]
    p.save("end_stone", col, np.clip(es - 0.6 * pits, 0, 1), 0.25, f0=0.04, porosity=0.4, depth=7)

    col_s = spectral(1750, 2.0, sy=14.0)
    ridged = 1 - np.abs(col_s * 2 - 1)
    bas = ramp(0.6 * ridged + 0.4 * spectral(1751, 1.0, fmin=8), [(0, rgb(34, 34, 38)), (0.5, rgb(76, 76, 82)), (1, rgb(110, 110, 116))])
    p.save("basalt_side", bas, ridged, 0.3, f0=0.045, porosity=0.2, depth=8)
    x, y = warped_grid(1752, 3)
    f1, f2, _ = voronoi(jittered(1753, 3, 0.4), x, y)
    hexes = smoothstep(0, 5, f2 - f1)
    btop = ramp(0.7 * hexes + 0.3 * spectral(1754, 1.0, fmin=8), [(0, rgb(24, 24, 28)), (1, rgb(96, 96, 102))])
    p.save("basalt_top", btop, hexes, 0.3, f0=0.045, depth=7)

    # magma: cooled crust plates over glowing cracks
    x, y = warped_grid(1760, 6)
    f1, f2, idx = voronoi(jittered(1761, 6, 1.0), x, y)
    crack = smoothstep(5, 0, f2 - f1)
    crust = ramp(spectral(1762, 1.2), [(0, rgb(40, 20, 14)), (1, rgb(96, 46, 26))])
    hot = ramp(crack, [(0, rgb(150, 40, 6)), (1, rgb(255, 170, 50))])
    col = crust * (1 - crack[..., None]) + hot * crack[..., None]
    p.save("magma", col, 1 - crack, 0.35, f0=0.05, emission=crack, depth=7, ao_into_albedo=0.2)

    # crying obsidian: obsidian with glowing violet tears
    x, y = warped_grid(1770, 6)
    f1, f2, idx = voronoi(jittered(1771, 7, 1.0), x, y)
    tone = np.random.default_rng(1772).random(49)
    t = 0.5 * tone[idx] + 0.5 * spectral(1773, 1.2)
    col = ramp(t, [(0, rgb(6, 5, 10)), (0.7, rgb(24, 14, 36)), (1, rgb(60, 36, 90))])
    tears = smoothstep(0.75, 0.9, spectral(1774, 1.6, sy=0.3)) * smoothstep(0.4, 0.7, spectral(1775, 2.0))
    col = col * (1 - tears[..., None]) + rgb(160, 60, 255) * tears[..., None]
    p.save("crying_obsidian", col, 0.6 * smoothstep(0, 4, f2 - f1) + 0.3 * tone[idx], 0.9, f0=0.05,
           emission=tears, depth=5, ao_into_albedo=0.3)


def textile_family(p):
    # wool: dense tangled fibres
    fib = np.zeros((N, N))
    for i in range(4):
        f = spectral(1800 + i, 2.0, sx=0.5 if i % 2 else 2.0, sy=2.0 if i % 2 else 0.5, fmin=3)
        fib = np.maximum(fib, smoothstep(0.05, 0.0, np.abs(f - 0.5)) * (0.6 + 0.4 * spectral(1805 + i, 1.5)))
    tufts = spectral(1810, 1.8, fmin=4)
    wool = 0.35 * fib + 0.45 * tufts + 0.2 * spectral(1811, 2.4)
    p.save("white_wool", ramp(wool, [(0, rgb(200, 202, 204)), (1, rgb(240, 242, 242))]), wool, 0.05, f0=0.03,
           porosity=0.6, sss=0.35, depth=4)

    # hay: straw stalks bound by bands
    x, y = grid()
    stalks = np.zeros((N, N))
    for i in range(3):
        f = spectral(1820 + i, 1.6, sx=0.08, sy=4.0, fmin=4)
        stalks = np.maximum(stalks, smoothstep(0.06, 0.0, np.abs(f - 0.5)))
    s = 0.5 * stalks + 0.5 * spectral(1825, 0.8, sx=0.1, fmin=6)
    col = ramp(s, [(0, rgb(150, 112, 30)), (0.6, rgb(206, 170, 60)), (1, rgb(236, 206, 100))])
    sc = N / 256
    band = np.zeros((N, N))
    for by in (60, 196):
        band = np.maximum(band, smoothstep(10 * sc, 6 * sc, np.abs(y - by * sc)))
    col = col * (1 - band[..., None]) + rgb(110, 40, 26) * (0.8 + 0.4 * s)[..., None] * band[..., None]
    p.save("hay_block_side", col, 0.6 * s + 0.3 * band, 0.15, f0=0.035, porosity=0.7, sss=0.2, depth=7)
    ends = np.random.default_rng(1826).random((400, 2)) * N
    f1, f2, idx = voronoi(ends)
    tube = smoothstep(3.5 * sc, 1.5 * sc, f1)
    hole = smoothstep(1.4 * sc, 0.6 * sc, f1)
    tcol = ramp(spectral(1827, 1.0), [(0, rgb(120, 86, 20)), (1, rgb(210, 172, 70))])
    tcol = tcol * (0.5 + 0.5 * tube)[..., None] * (1 - 0.6 * hole)[..., None]
    p.save("hay_block_top", tcol, tube - hole, 0.15, f0=0.035, porosity=0.7, depth=6)


# ---- plants (cross-model sprites, alpha cutout) ----

def _flip(arrs):
    return [a[::-1] for a in arrs]


def plant_save(p, name, col, cover, height, sss=0.45, smooth=0.12):
    p.save(name, col, height, smooth, f0=0.03, sss=sss * cover, alpha=(cover > 0.5).astype(float), depth=2,
           ao_into_albedo=0.3)


def grass_sprite(p, name, seed, count, reach):
    b, h, c = blades(seed, count, None, 3.0, hang=reach)
    b, h, c = _flip([b, h, c])  # grow up from the bottom edge
    _, y = grid()
    # darker at the base, as in a real tuft
    g = np.clip((0.35 + 0.65 * b) * (0.8 + 0.25 * (1 - y / N)), 0, 1)
    plant_save(p, name, np.dstack([g, g, g]), c, h)


def draw_leaflet(canvas, alpha, cx, cy, L, W, ang, color, z=None, zbuf=None):
    n = canvas.shape[0]
    R = int(L) + 2
    x0, y0 = int(cx) - R, int(cy) - R
    xs = np.clip(np.arange(x0, x0 + 2 * R), 0, n - 1)
    ys = np.clip(np.arange(y0, y0 + 2 * R), 0, n - 1)
    lx, ly = np.meshgrid(np.arange(x0, x0 + 2 * R) - cx, np.arange(y0, y0 + 2 * R) - cy)
    u = lx * math.cos(ang) + ly * math.sin(ang)
    v = -lx * math.sin(ang) + ly * math.cos(ang)
    tt = np.clip(u / L, -1, 1)
    halfw = W * np.sqrt(np.maximum(1 - tt * tt, 0))
    inside = (np.abs(u) <= L) & (np.abs(v) <= halfw)
    sub = canvas[np.ix_(ys, xs)]
    shade = (0.8 + 0.2 * np.sign(v))[..., None] * (0.85 + 0.15 * (u / L + 1) / 2)[..., None]
    sub = np.where(inside[..., None], np.array(color) * shade, sub)
    canvas[np.ix_(ys, xs)] = sub
    alpha[np.ix_(ys, xs)] = np.maximum(alpha[np.ix_(ys, xs)], inside.astype(float))


def draw_stem(canvas, alpha, pts, width, color):
    n = canvas.shape[0]
    for (xa, ya), (xb, yb) in zip(pts[:-1], pts[1:]):
        steps = int(max(abs(xb - xa), abs(yb - ya)) * 2) + 1
        for t in np.linspace(0, 1, steps):
            x, y = xa + (xb - xa) * t, ya + (yb - ya) * t
            r = width / 2
            x0, x1 = int(max(x - r, 0)), int(min(x + r + 1, n))
            y0, y1 = int(max(y - r, 0)), int(min(y + r + 1, n))
            canvas[y0:y1, x0:x1] = color
            alpha[y0:y1, x0:x1] = 1


def fern(p):
    n = N
    s = n / 256
    canvas = np.zeros((n, n, 3))
    alpha = np.zeros((n, n))
    r = np.random.default_rng(1900)
    for k in range(7):
        ang = -math.pi / 2 + (k - 3) * 0.32 + (r.random() - 0.5) * 0.15
        length = (150 + r.random() * 80) * s
        bend = (k - 3) * 0.06
        pts = []
        x, y = n / 2 + (r.random() - 0.5) * 20 * s, n - 2
        a = ang
        for i in range(24):
            pts.append((x, y))
            x += math.cos(a) * length / 24
            y += math.sin(a) * length / 24
            a += bend
        draw_stem(canvas, alpha, pts, 2.2 * s, (0.35, 0.35, 0.35))
        for i, (px, py) in enumerate(pts[2:], start=2):
            tfrac = i / len(pts)
            L = (16 - 12 * tfrac) * s
            seg_a = math.atan2(pts[min(i + 1, len(pts) - 1)][1] - py, pts[min(i + 1, len(pts) - 1)][0] - px)
            for side in (-1, 1):
                la = seg_a + side * 1.1
                cx, cy = px + math.cos(la) * L, py + math.sin(la) * L
                b = 0.75 + 0.25 * r.random()
                draw_leaflet(canvas, alpha, cx, cy, L, L * 0.35, la, (b, b, b))
    h = blur(alpha, 1.5)
    plant_save(p, "fern", canvas, alpha, h)


def flower(p, name, seed, petal_col, center_col, petals=5, petal_len=26, head_y=70):
    n = N
    s = n / 256
    r = np.random.default_rng(seed)
    canvas = np.zeros((n, n, 3))
    alpha = np.zeros((n, n))
    stem_col = (0.24, 0.42, 0.14)
    cx = n / 2
    hy = head_y * s
    pts = [(cx + math.sin(t * 2.5) * 6 * s, n - 1 - t * (n - 1 - hy)) for t in np.linspace(0, 1, 20)]
    draw_stem(canvas, alpha, pts, 4 * s, stem_col)
    for side, yy in ((-1, 200), (1, 170), (-1, 140)):
        la = math.pi / 2 + side * 1.0 + math.pi
        draw_leaflet(canvas, alpha, cx + side * 26 * s, yy * s, 30 * s, 8 * s, la if side > 0 else la - math.pi * 0.0,
                     (0.22 + 0.06 * r.random(), 0.44, 0.15))
    hx, hy2 = pts[-1]
    for k in range(petals * 2):
        a = k / (petals * 2) * 2 * math.pi + r.random() * 0.2
        L = petal_len * s * (0.8 + 0.3 * r.random())
        pc = np.array(petal_col) * (0.8 + 0.25 * r.random())
        draw_leaflet(canvas, alpha, hx + math.cos(a) * L * 0.8, hy2 + math.sin(a) * L * 0.55, L, L * 0.45, a, tuple(pc))
    draw_leaflet(canvas, alpha, hx, hy2, 9 * s, 9 * s, 0, center_col)
    h = blur(alpha, 1.5)
    p.save(name, np.clip(canvas, 0, 1), h, 0.2, f0=0.03, sss=0.4 * alpha, alpha=alpha, depth=2, ao_into_albedo=0.2)


def plant_family(p):
    grass_sprite(p, "short_grass", 1950, 260, (90, 200))
    grass_sprite(p, "tall_grass_bottom", 1960, 320, (200, 300))
    grass_sprite(p, "tall_grass_top", 1970, 180, (60, 220))
    fern(p)
    flower(p, "dandelion", 1980, (1.0, 0.78, 0.08), (0.9, 0.6, 0.02), petals=12, petal_len=16)
    flower(p, "poppy", 1990, (0.82, 0.08, 0.05), (0.08, 0.06, 0.04), petals=4, petal_len=30)


EXTRA_STEPS = [stone_family, soil_family, wood_family, mineral_family, nether_end_family, textile_family,
               plant_family]


def main():
    global N
    ap = argparse.ArgumentParser()
    ap.add_argument("--res", type=int, default=256)
    ap.add_argument("--out", default=str(HERE / "pack"))
    args = ap.parse_args()
    N = args.res
    root = Path(args.out)
    p = Pack(root)

    steps = [
        stone, dirt, grass_top, grass_side, gravel, oak_log, bricks, obsidian, bedrock,
        snow, clay, glowstone, glass,
        lambda p: cobblestone(p),
        lambda p: cobblestone(p, "mossy_cobblestone", mossy=True),
        lambda p: sand(p),
        lambda p: sand(p, "red_sand", [(0, rgb(150, 70, 30)), (0.5, rgb(186, 100, 46)), (1, rgb(210, 130, 70))], 85),
        lambda p: planks(p, "oak_planks", OAK, 300),
        lambda p: planks(p, "spruce_planks", SPRUCE, 310),
        lambda p: planks(p, "birch_planks", BIRCH, 320),
        lambda p: log_top(p, "oak_log_top", OAK, (100, (34, 26, 18), (78, 60, 40), (120, 100, 76)), 330),
        lambda p: p.save("spruce_log", *bark(110, (24, 16, 10), (54, 38, 24), (86, 64, 44))[:2], 0.12, 0.03, 0.6, depth=10),
        lambda p: leaves(p, "oak_leaves", 400),
        lambda p: leaves(p, "birch_leaves", 410, count=800, size=(10, 20)),
        lambda p: leaves(p, "spruce_leaves", 420, count=2600, size=(10, 18), needles=True),
        lambda p: stone_bricks(p),
        lambda p: stone_bricks(p, "mossy_stone_bricks", mossy=True),
        lambda p: stone_bricks(p, "cracked_stone_bricks", cracked=True),
        lambda p: speckled(p, "andesite", 500, [(0, rgb(110, 110, 110)), (1, rgb(150, 150, 148))],
                           [(0.15, (60, 60, 62)), (0.12, (200, 200, 198))]),
        lambda p: speckled(p, "granite", 510, [(0, rgb(140, 92, 74)), (1, rgb(180, 122, 100))],
                           [(0.18, (40, 34, 34)), (0.15, (220, 196, 186)), (0.2, (196, 110, 90))]),
        lambda p: speckled(p, "diorite", 520, [(0, rgb(200, 200, 198)), (1, rgb(236, 236, 234))],
                           [(0.18, (50, 50, 54)), (0.15, (140, 140, 140))]),
        lambda p: deepslate(p),
        lambda p: deepslate(p, "deepslate_top", top=True),
        lambda p: ore(p, "coal_ore", 600, [(0, rgb(10, 10, 12)), (1, rgb(54, 54, 60))], smooth=0.55),
        lambda p: ore(p, "iron_ore", 610, [(0, rgb(150, 110, 90)), (1, rgb(226, 192, 166))], smooth=0.45, f0=0.08),
        lambda p: ore(p, "gold_ore", 620, [(0, rgb(170, 120, 20)), (1, rgb(255, 222, 90))], smooth=0.8, metal=231),
        lambda p: ore(p, "diamond_ore", 630, [(0, rgb(30, 150, 160)), (0.6, rgb(90, 230, 220)), (1, rgb(220, 255, 252))],
                      smooth=0.95, f0=0.17),
        lambda p: ore(p, "emerald_ore", 640, [(0, rgb(10, 110, 40)), (1, rgb(90, 240, 130))], smooth=0.9, f0=0.07),
        lambda p: ore(p, "lapis_ore", 650, [(0, rgb(14, 34, 120)), (1, rgb(60, 100, 220))], smooth=0.5, crystal=False),
        lambda p: ore(p, "redstone_ore", 660, [(0, rgb(120, 0, 0)), (1, rgb(255, 40, 30))], smooth=0.6, emission=0.25),
        lambda p: metal_block(p, "iron_block", 700, [(0, rgb(150, 150, 152)), (1, rgb(232, 232, 234))], 230),
        lambda p: metal_block(p, "gold_block", 710, [(0, rgb(200, 140, 30)), (1, rgb(255, 226, 110))], 231, 0.88),
        lambda p: metal_block(p, "copper_block", 720, [(0, rgb(170, 86, 56)), (1, rgb(232, 140, 100))], 234, 0.75),
        lambda p: ice(p),
        lambda p: ice(p, "packed_ice", alpha=1.0, seed=235),
    ]
    steps += EXTRA_STEPS
    for i, fn in enumerate(steps):
        fn(p)
        print(f"  [{i + 1}/{len(steps)}] done", flush=True)

    wn = max(N // 2, 16)
    p.animated("water_still", water_frames(800, 32, wn), 1.0, 0.02 * 1, frametime=2)
    p.animated("water_flow", water_frames(810, 32, wn, flow=True), 1.0, 0.02, frametime=1)
    lf, le = lava_frames(820, 20, wn)
    p.animated("lava_still", lf, 0.4, 0.05, emission_frames=le, frametime=3)
    lf, le = lava_frames(830, 32, wn, flow=True)
    p.animated("lava_flow", lf, 0.4, 0.05, emission_frames=le, frametime=2)

    environment(root)
    pack_icon(root)
    mcmeta = {
        "pack": {
            "pack_format": 34,
            "supported_formats": {"min_inclusive": 15, "max_inclusive": 999},
            "min_format": 15,
            "max_format": 999,
            "description": f"§aTerra Realis §7{N}x PBR §8(LabPBR)"
        }
    }
    (root / "pack.mcmeta").write_text(json.dumps(mcmeta, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {len(p.names)} textures at {N}x to {root}")


if __name__ == "__main__":
    main()
