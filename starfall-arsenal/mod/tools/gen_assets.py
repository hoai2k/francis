#!/usr/bin/env python3
"""Generate Starfall Arsenal textures and 3D item models.

Run from anywhere:  python3 tools/gen_assets.py
Outputs into src/main/resources/assets/starfall/. The outputs are committed, so
this only needs re-running after changing the designs below.
"""
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "src/main/resources/assets/starfall"
MODELS = ASSETS / "models/item"
TEX = ASSETS / "textures"

# ---------------------------------------------------------------- palette ---
# One 64x64 texture of 8x8-pixel material swatches; every model face samples a
# swatch. Index -> (name, base colour, style)
MATERIALS = [
    ("dark_metal", (42, 45, 62), "metal"),
    ("steel", (138, 147, 168), "metal"),
    ("gold", (232, 181, 58), "metal"),
    ("dark_gold", (168, 116, 26), "metal"),
    ("star_white", (255, 246, 208), "glow"),
    ("cyan", (94, 240, 255), "glow"),
    ("violet", (123, 77, 255), "gem"),
    ("deep_violet", (58, 31, 138), "metal"),
    ("red", (255, 59, 59), "glow"),
    ("green", (87, 255, 122), "glow"),
    ("pink", (255, 122, 217), "gem"),
    ("black", (17, 17, 24), "metal"),
    ("navy", (27, 36, 72), "metal"),
    ("orange", (255, 154, 46), "glow"),
    ("leather", (90, 58, 36), "wrap"),
    ("silver", (207, 214, 230), "metal"),
    ("star_core", (255, 236, 150), "core"),
    ("nebula", (60, 30, 120), "nebula"),
    ("screen", (12, 30, 60), "screen"),
    ("edge", (214, 248, 255), "glow"),
]
MAT = {name: i for i, (name, _, _) in enumerate(MATERIALS)}


def clamp(v):
    return max(0, min(255, int(v)))


def shade(c, f):
    return tuple(clamp(x * f) for x in c)


def mix(a, b, t):
    return tuple(clamp(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_swatch(img, idx, base, style, rng):
    ox, oy = (idx % 8) * 8, (idx // 8) * 8
    for y in range(8):
        for x in range(8):
            n = rng.uniform(-0.06, 0.06)
            if style == "metal":
                f = 1.12 - y * 0.035 + n
                if x == 0 or y == 0:
                    f += 0.18
                if x == 7 or y == 7:
                    f -= 0.22
                c = shade(base, f)
            elif style == "glow":
                d = math.hypot(x - 3.5, y - 3.5) / 5
                c = mix((255, 255, 255), base, min(1, d * 1.3 + 0.15 + n))
            elif style == "gem":
                f = 1.3 - (x + y) * 0.06 + n
                c = shade(base, f)
                if (x, y) in ((1, 1), (2, 1), (1, 2)):
                    c = mix(c, (255, 255, 255), 0.7)
            elif style == "wrap":
                f = 1.0 + (0.18 if (x + y) % 4 < 2 else -0.12) + n
                c = shade(base, f)
            elif style == "core":
                d = math.hypot(x - 3.5, y - 3.5) / 5
                c = mix((255, 255, 255), base, min(1, d))
            elif style == "nebula":
                t = (math.sin(x * 0.9 + y * 0.5) + 1) / 2
                c = mix(base, (40, 90, 200), t * 0.7 + n)
            elif style == "screen":
                c = shade(base, 1 + n)
                if x % 3 == 0 or y % 3 == 0:
                    c = mix(c, (40, 200, 255), 0.25)
            img.putpixel((ox + x, oy + y), c + (255,))
    if style == "nebula":
        for _ in range(5):
            img.putpixel((ox + rng.randrange(8), oy + rng.randrange(8)), (255, 255, 235, 255))
    if style == "screen":
        img.putpixel((ox + 5, oy + 2), (255, 240, 120, 255))
        img.putpixel((ox + 4, oy + 2), (255, 160, 60, 255))


def make_palette():
    rng = random.Random(7)
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    for i, (_, base, style) in enumerate(MATERIALS):
        draw_swatch(img, i, base, style, rng)
    (TEX / "item").mkdir(parents=True, exist_ok=True)
    img.save(TEX / "item/palette.png")


def uv(mat):
    i = MAT[mat]
    u, v = (i % 8) * 2, (i // 8) * 2
    return [u + 0.1, v + 0.1, u + 1.9, v + 1.9]


# ----------------------------------------------------------------- models ---
def box(frm, to, mat, rot=None, faces=None):
    """faces: optional {face: material} overrides."""
    el = {"from": list(frm), "to": list(to), "faces": {}}
    for f in ("north", "south", "east", "west", "up", "down"):
        m = (faces or {}).get(f, mat)
        el["faces"][f] = {"uv": uv(m), "texture": "#palette"}
    if rot:
        axis, angle = rot[0], rot[1]
        origin = rot[2] if len(rot) > 2 else [(frm[i] + to[i]) / 2 for i in range(3)]
        el["rotation"] = {"angle": angle, "axis": axis, "origin": list(origin)}
    return el


def centered(cx, cy, cz, sx, sy, sz, mat, rot=None, faces=None):
    frm = (cx - sx / 2, cy - sy / 2, cz - sz / 2)
    to = (cx + sx / 2, cy + sy / 2, cz + sz / 2)
    if rot and len(rot) == 2:
        rot = (rot[0], rot[1], [cx, cy, cz])
    return box(frm, to, mat, rot, faces)


def star(cx, cy, cz, size, core="star_white", halo="cyan"):
    """A little twinkling star: a cube plus a 45-degree rotated halo."""
    return [
        centered(cx, cy, cz, size, size, size * 0.6, core),
        centered(cx, cy, cz, size * 0.75, size * 0.75, size * 0.9, halo, ("z", 45)),
    ]


def octagon_ring(cx, cy, cz, radius, thick, depth, mat, plane):
    """Ring of 8 segments. plane: 'xy' (axis z), 'zy' (axis x), 'xz' (axis y)."""
    side = 2 * radius * math.tan(math.pi / 8) + thick * 0.4
    out = []
    for k in range(8):
        a = math.radians(45 * k)
        u, v = radius * math.cos(a), radius * math.sin(a)
        angle = [0, 45, 0, -45][k % 4]
        if plane == "xy":
            c = (cx + u, cy + v, cz)
            size = (thick, side, depth) if k % 4 in (0, 1, 3) else (side, thick, depth)
            if k % 4 == 2:
                size = (side, thick, depth)
            if k % 4 == 0:
                size = (thick, side, depth)
            if k % 4 in (1, 3):
                size = (thick, side, depth)
            out.append(centered(*c, *size, mat, ("z", angle) if angle else None))
        elif plane == "zy":
            c = (cx, cy + v, cz + u)
            size = (depth, side, thick) if k % 4 != 2 else (depth, thick, side)
            out.append(centered(*c, *size, mat, ("x", -angle) if angle else None))
        else:  # xz
            c = (cx + u, cy, cz + v)
            size = (thick, depth, side) if k % 4 != 2 else (side, depth, thick)
            out.append(centered(*c, *size, mat, ("y", -angle) if angle else None))
    return out


def stellar_remote():
    e = []
    e.append(box((5, 0, 6.5), (11, 9, 9.5), "dark_metal"))
    e.append(box((4.75, 0.5, 6.75), (5, 8.5, 9.25), "gold"))
    e.append(box((11, 0.5, 6.75), (11.25, 8.5, 9.25), "gold"))
    e.append(box((5.5, 4.5, 6.25), (10.5, 8.5, 6.5), "screen"))
    e.append(box((5.5, 8.5, 6.25), (10.5, 8.75, 6.5), "gold"))
    e.append(box((6.25, 1.25, 6.1), (9.75, 3.75, 6.5), "steel"))
    e.append(box((6.75, 1.75, 5.25), (9.25, 3.25, 6.1), "red"))
    e.append(box((7.25, 2.1, 5.0), (8.75, 2.9, 5.25), "orange"))
    e.append(box((5.6, 3.9, 6.2), (6.2, 4.4, 6.5), "green"))
    e.append(box((9.8, 3.9, 6.2), (10.4, 4.4, 6.5), "cyan"))
    e.append(box((5.5, 9, 7), (10.5, 10, 9), "steel"))
    e.append(box((6, 0.25, 9.5), (10, 8, 9.75), "navy"))
    e.append(box((11.25, 5.5, 7.25), (12, 7.5, 8.75), "gold"))
    e.append(box((11.25, 2, 7.6), (11.75, 4.5, 8.4), "dark_gold"))
    e.append(box((9, 10, 7.75), (9.5, 15, 8.25), "silver"))
    e.append(box((8.85, 12, 7.6), (9.65, 12.4, 8.4), "gold"))
    e += star(9.25, 15.75, 8, 1.4)
    e.append(box((7, -1, 7.5), (9, 0, 8.5), "gold"))
    e.append(box((6.5, 0, 7), (9.5, 0.5, 9), "dark_gold"))
    return e


def starfall_blade():
    e = []
    e += star(8, -6, 8, 2.2)
    e.append(box((7.5, -5, 7.5), (8.5, 1, 8.5), "leather"))
    for y in (-3.5, -1.5, 0.5):
        e.append(box((7.3, y, 7.3), (8.7, y + 0.5, 8.7), "gold"))
    e.append(box((3.5, 1, 7.1), (12.5, 2.5, 8.9), "gold"))
    e.append(box((6.75, 0.5, 6.5), (9.25, 3, 9.5), "dark_gold"))
    e.append(centered(8, 1.75, 8, 1.5, 1.5, 3.4, "violet", ("z", 45)))
    e.append(centered(4.0, 3.0, 8, 4, 1, 1.2, "gold", ("z", -22.5)))
    e.append(centered(12.0, 3.0, 8, 4, 1, 1.2, "gold", ("z", 22.5)))
    e.append(centered(2.6, 1.75, 8, 1.2, 1.8, 1.4, "cyan", ("z", 45)))
    e.append(centered(13.4, 1.75, 8, 1.2, 1.8, 1.4, "cyan", ("z", 45)))
    e.append(box((6, 2.5, 7.5), (10, 6, 8.5), "steel"))
    e.append(box((6.5, 6, 7.6), (9.5, 25.5, 8.4), "nebula"))
    e.append(box((6, 6, 7.75), (6.5, 25, 8.25), "edge"))
    e.append(box((9.5, 6, 7.75), (10, 25, 8.25), "edge"))
    e.append(box((7.75, 3.5, 7.45), (8.25, 22, 8.55), "cyan"))
    e.append(centered(8, 25.5, 8, 2.12, 2.12, 0.8, "edge", ("z", 45)))
    e.append(centered(8, 25.5, 8, 1.2, 1.2, 0.9, "nebula", ("z", 45)))
    for (x, y, s) in ((11.5, 12, 0.8), (4.6, 17, 0.7), (11.2, 21, 0.6), (4.8, 9, 0.5)):
        e += star(x, y, 8, s)
    return e


DIPPER = [(0, 0), (2.2, 0.6), (3.7, 0.3), (5.1, -0.2), (5.5, -2.1), (7.9, -1.9), (7.7, 0.7)]


def seven_stars_scepter():
    e = []
    e.append(box((7.4, -10, 7.4), (8.6, 20, 8.6), "deep_violet"))
    e.append(box((7, -11, 7), (9, -9, 9), "gold"))
    e += star(8, -12, 8, 1.4)
    for y in (-2, 6, 13):
        e.append(box((7.1, y, 7.1), (8.9, y + 0.8, 8.9), "gold"))
        e.append(centered(8, y + 0.4, 8, 0.9, 0.9, 2.0, "cyan", ("z", 45)))
    e.append(box((7.2, -8, 7.2), (8.8, -3, 8.8), "leather"))
    e.append(box((6.5, 20, 6.5), (9.5, 22, 9.5), "gold"))
    e.append(centered(5.3, 23.4, 8, 1, 5.5, 1, "gold", ("z", 22.5)))
    e.append(centered(10.7, 23.4, 8, 1, 5.5, 1, "gold", ("z", -22.5)))
    e.append(centered(8, 23.8, 5.3, 1, 5.0, 1, "dark_gold", ("x", -22.5)))
    e.append(centered(8, 23.8, 10.7, 1, 5.0, 1, "dark_gold", ("x", 22.5)))
    e.append(centered(8, 24, 8, 3.2, 3.2, 3.2, "violet", ("y", 45)))
    e.append(centered(8, 24, 8, 1.8, 4.2, 1.8, "star_white", ("y", 45)))
    e += octagon_ring(8, 24, 8, 4.2, 0.5, 0.5, "gold", "xy")
    # The Big Dipper floating above the head: seven stars.
    ox, oy = 4.1, 29.5
    for i, (x, y) in enumerate(DIPPER):
        size = 1.3 if i in (0, 6) else 1.05
        e += star(ox + x, oy + y, 8, size, "star_white", "cyan" if i % 2 else "pink")
    return e


def supernova_core():
    e = []
    e.append(box((7, -5, 7), (9, 2, 9), "dark_metal"))
    e.append(box((7.2, -4.5, 7.2), (8.8, 0, 8.8), "leather"))
    e.append(box((6.25, 1.5, 6.25), (9.75, 3, 9.75), "gold"))
    e.append(box((6.75, -6, 6.75), (9.25, -5, 9.25), "gold"))
    e.append(centered(8, 9, 8, 4, 4, 4, "star_core", ("y", 45)))
    e.append(centered(8, 9, 8, 4.4, 2.2, 2.2, "orange", ("x", 45)))
    e.append(centered(8, 9, 8, 2.2, 4.8, 2.2, "star_white", ("z", 45)))
    e.append(centered(8, 9, 8, 2.2, 2.2, 5.2, "orange", ("y", 45)))
    e += octagon_ring(8, 9, 8, 5.4, 0.7, 0.9, "gold", "xy")
    e += octagon_ring(8, 9, 8, 6.4, 0.6, 0.8, "cyan", "zy")
    e += octagon_ring(8, 9, 8, 7.3, 0.5, 0.6, "violet", "xz")
    e.append(box((7.6, 3, 7.6), (8.4, 3.8, 8.4), "dark_gold"))
    for (x, y, z, s) in ((2.5, 15, 8, 0.8), (13.8, 13, 9, 0.7), (12.5, 3.8, 6, 0.6), (3, 4.5, 10, 0.6)):
        e += star(x, y, z, s)
    return e


def extents(elements):
    lo = [min(el["from"][i] for el in elements) for i in range(3)]
    hi = [max(el["to"][i] for el in elements) for i in range(3)]
    return lo, hi


def r(v):
    return [round(x, 3) for x in v]


def display_for(kind, elements):
    lo, hi = extents(elements)
    length = hi[1] - lo[1]
    gui_scale = round(min(0.9, 15.0 / (length * 0.72 + (hi[0] - lo[0]) * 0.3)), 3)
    cy = (lo[1] + hi[1]) / 2
    if kind == "small":
        size = max(hi[i] - lo[i] for i in range(3))
        fp = round(0.68 * 14 / size, 3)
        tp = round(0.75 * 16 / size, 3)
        return {
            "thirdperson_righthand": {"rotation": [0, 180, 0], "translation": [0, 3.5, 1], "scale": [tp] * 3},
            "thirdperson_lefthand": {"rotation": [0, 180, 0], "translation": [0, 3.5, 1], "scale": [tp] * 3},
            "firstperson_righthand": {"rotation": [0, 160, 15], "translation": [1.13, 2.4, 1.13], "scale": [fp] * 3},
            "firstperson_lefthand": {"rotation": [0, 200, -15], "translation": [1.13, 2.4, 1.13], "scale": [fp] * 3},
            "ground": {"translation": [0, 2, 0], "scale": [round(0.5 * 16 / size, 3)] * 3},
            "gui": {"rotation": [15, 200, 0], "translation": [0, round((8 - cy) * gui_scale, 3), 0], "scale": [gui_scale] * 3},
            "fixed": {"rotation": [0, 180, 0], "scale": [round(0.75 * 16 / size, 3)] * 3},
            "head": {"translation": [0, 14, 0]},
        }
    # Long weapons are modelled upright, so tilt them 45 degrees further than
    # vanilla's diagonal 'handheld' sprites to get the same hand pose.
    hand = 1.0 * 22 / length
    fp = 0.58 * 22 / length
    grip = 8 - (lo[1] + 6)
    return {
        "thirdperson_righthand": {"rotation": [0, -90, 10], "translation": [0, 4 + grip * hand * 0.5, 0.5], "scale": r([hand] * 3)},
        "thirdperson_lefthand": {"rotation": [0, 90, -10], "translation": [0, 4 + grip * hand * 0.5, 0.5], "scale": r([hand] * 3)},
        "firstperson_righthand": {"rotation": [0, -90, -20], "translation": [1.13, 2.6 + grip * fp * 0.25, 1.13], "scale": r([fp] * 3)},
        "firstperson_lefthand": {"rotation": [0, 90, 20], "translation": [1.13, 2.6 + grip * fp * 0.25, 1.13], "scale": r([fp] * 3)},
        "ground": {"rotation": [0, 0, -45], "translation": [0, 2, 0], "scale": r([0.5 * 16 / length * 1.4] * 3)},
        "gui": {"rotation": [0, 0, -45], "translation": [0, 0, 0], "scale": r([gui_scale] * 3)},
        "fixed": {"rotation": [0, 180, -45], "scale": r([gui_scale * 1.2] * 3)},
        "head": {"rotation": [0, 0, -45], "translation": [0, 14, 0], "scale": r([fp] * 3)},
    }


def write_model(name, elements, kind):
    model = {
        "credit": "Starfall Arsenal - generated by tools/gen_assets.py",
        "gui_light": "front",
        "texture_size": [64, 64],
        "textures": {"palette": "starfall:item/palette", "particle": "starfall:item/palette"},
        "elements": elements,
        "display": display_for(kind, elements),
    }
    for el in elements:
        el["from"], el["to"] = r(el["from"]), r(el["to"])
        if "rotation" in el:
            el["rotation"]["origin"] = r(el["rotation"]["origin"])
        for i in range(3):
            assert -16 <= el["from"][i] <= 32 and -16 <= el["to"][i] <= 32, (name, el)
    MODELS.mkdir(parents=True, exist_ok=True)
    (MODELS / f"{name}.json").write_text(json.dumps(model, indent=1) + "\n")


def item_definition(name):
    """Minecraft 1.21.4+ looks items up in assets/<ns>/items/ before the model."""
    items = ASSETS / "items"
    items.mkdir(parents=True, exist_ok=True)
    (items / f"{name}.json").write_text(json.dumps({"model": {"type": "minecraft:model", "model": f"starfall:item/{name}"}}, indent=1) + "\n")


def flat_item(name):
    model = {"parent": "minecraft:item/generated", "textures": {"layer0": f"starfall:item/{name}"}}
    (MODELS / f"{name}.json").write_text(json.dumps(model, indent=1) + "\n")


# --------------------------------------------------------------- textures ---
def star_fragment():
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = []
    for k in range(8):
        a = math.pi / 2 + k * math.pi / 4
        rad = 7 if k % 2 == 0 else 2.6
        pts.append((7.5 + rad * math.cos(a), 7.5 - rad * math.sin(a)))
    d.polygon(pts, fill=(255, 214, 90, 255), outline=(170, 110, 20, 255))
    d.polygon([(7.5, 3), (9, 7.5), (7.5, 12), (6, 7.5)], fill=(255, 250, 220, 255))
    img.putpixel((7, 7), (255, 255, 255, 255))
    img.putpixel((8, 7), (255, 255, 255, 255))
    img.putpixel((2, 2), (140, 240, 255, 255))
    img.putpixel((13, 12), (140, 240, 255, 255))
    img.save(TEX / "item/star_fragment.png")


def radial(size, falloff, power=2.0):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - c, y - c) / c
            v = max(0.0, 1 - d) ** power * falloff
            v = min(1.0, v)
            img.putpixel((x, y), (clamp(255 * v), clamp(255 * v), clamp(255 * v), 255))
    return img


def to_alpha(img):
    """White with alpha = brightness, for the translucent (beacon beam) render layer."""
    out = Image.new("RGBA", img.size)
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            v = img.getpixel((x, y))[0]
            out.putpixel((x, y), (255, 255, 255, v))
    return out


def entity_textures():
    out = TEX / "entity"
    out.mkdir(parents=True, exist_ok=True)
    to_alpha(radial(64, 1.6, 2.2)).save(out / "glow.png")
    # Four-point sparkle.
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            dx, dy = abs(x - c) / c, abs(y - c) / c
            ray = max(0, 1 - dx * 6) * max(0, 1 - dy) ** 1.5 + max(0, 1 - dy * 6) * max(0, 1 - dx) ** 1.5
            core = max(0, 1 - math.hypot(dx, dy) * 2.2) ** 1.5
            v = min(1, ray + core)
            img.putpixel((x, y), (clamp(255 * v),) * 3 + (255,))
    to_alpha(img).save(out / "sparkle.png")
    # Shockwave ring.
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - c, y - c) / c
            v = max(0, 1 - abs(d - 0.85) * 8) + max(0, 0.85 - d) * 0.15
            img.putpixel((x, y), (clamp(255 * v),) * 3 + (255,))
    to_alpha(img).save(out / "ring.png")


def icon():
    size = 128
    img = Image.new("RGBA", (size, size), (10, 8, 30, 255))
    rng = random.Random(3)
    d = ImageDraw.Draw(img)
    for _ in range(60):
        x, y = rng.randrange(size), rng.randrange(size)
        b = rng.randrange(120, 255)
        d.point((x, y), fill=(b, b, 255, 255))
    trail = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    td = ImageDraw.Draw(trail)
    for i in range(40):
        t = i / 40
        x, y = 10 + t * 70, 10 + t * 70
        rr = 2 + t * 10
        a = int(40 + t * 160)
        td.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(255, 200 - int(t * 80), 90, a))
    trail = trail.filter(ImageFilter.GaussianBlur(3))
    img.alpha_composite(trail)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((60, 60, 120, 120), fill=(255, 150, 60, 200))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    img.alpha_composite(glow)
    d = ImageDraw.Draw(img)
    pts = []
    for k in range(8):
        a = math.pi / 2 + k * math.pi / 4
        rad = 22 if k % 2 == 0 else 7
        pts.append((88 + rad * math.cos(a), 88 - rad * math.sin(a)))
    d.polygon(pts, fill=(255, 245, 210, 255))
    img.save(ASSETS / "icon.png")


def main():
    make_palette()
    write_model("stellar_remote", stellar_remote(), "small")
    write_model("starfall_blade", starfall_blade(), "long")
    write_model("seven_stars_scepter", seven_stars_scepter(), "long")
    write_model("supernova_core", supernova_core(), "small")
    flat_item("star_fragment")
    for name in ("stellar_remote", "starfall_blade", "seven_stars_scepter", "supernova_core", "star_fragment"):
        item_definition(name)
    star_fragment()
    entity_textures()
    icon()
    print("assets written to", ASSETS)


if __name__ == "__main__":
    main()
