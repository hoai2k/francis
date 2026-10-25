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
