#!/usr/bin/env python3
"""
CONGO COMMERCE - scroll-scrub film renderer (v2).

One continuous camera move: a lone commerce node in a deep ink-green-black
void, pushed into as its jade light ignites outward into a deforming network
that finally wraps into a calm luminous sphere. No cuts, locked "exposure",
depth-of-field bands, bloom, volumetric dust.

Streams raw RGB frames to stdout for ffmpeg to encode.

Palette: ink #080D0B, jade #12A87A, copper #C87A45, ivory #EDF2EE.
"""

import sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

W, H = 1920, 1080
FPS = 30
SECONDS = 15.0
FRAMES = int(FPS * SECONDS)
F = 1500.0


def x_shift(p):
    """Bias the subject right, harder near the end, so the left third stays
    clear for chapter copy."""
    return 120.0 + 150.0 * smoothstep(p)

BG_TOP = np.array([11, 18, 16], dtype=np.float32)
BG_BOT = np.array([4, 7, 6], dtype=np.float32)
JADE = np.array([16, 168, 122], dtype=np.float32)
JADE_HOT = np.array([140, 246, 212], dtype=np.float32)
COPPER = np.array([206, 126, 72], dtype=np.float32)
IVORY = np.array([237, 242, 238], dtype=np.float32)

rng = np.random.default_rng(20260927)

N = 760


def cluster():
    return rng.normal(0.0, 0.80, size=(N, 3)).astype(np.float32)


def lattice():
    pts = np.zeros((N, 3), dtype=np.float32)
    rings = 11
    per = N // rings
    idx = 0
    for r in range(rings):
        radius = 1.1 + r * 1.30
        count = per if r < rings - 1 else N - idx
        ang = rng.uniform(0, 2 * math.pi, size=count)
        rad = radius + rng.normal(0, 0.16 * (1 + r * 0.25), size=count)
        pts[idx:idx + count, 0] = np.cos(ang) * rad
        pts[idx:idx + count, 2] = np.sin(ang) * rad
        pts[idx:idx + count, 1] = rng.normal(0, 0.34, size=count)
        idx += count
    return pts


def shell():
    v = rng.normal(0, 1, size=(N, 3))
    v /= np.linalg.norm(v, axis=1, keepdims=True)
    rad = (6.4 + rng.normal(0, 0.95, size=N))[:, None]
    return (v * rad).astype(np.float32)


A, B, C = cluster(), lattice(), shell()


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def positions(p):
    morph = smoothstep(np.clip(p / 0.5, 0, 1))
    wrap = smoothstep(np.clip((p - 0.5) / 0.5, 0, 1))
    mid = A * (1 - morph) + B * morph
    return mid * (1 - wrap) + C * wrap


# topology from the cluster
d = ((A[:, None, :] - A[None, :, :]) ** 2).sum(-1)
np.fill_diagonal(d, 1e9)
edges = []
for i in range(N):
    for j in np.argsort(d[i])[:3]:
        if i < int(j):
            edges.append((i, int(j)))
edges = np.array(edges, dtype=np.int32)
long_edges = np.array([(int(a), int(b)) for a, b in rng.integers(0, N, (30, 2))], dtype=np.int32)

kind = rng.random(N)
is_copper = kind < 0.11
is_ivory = (kind >= 0.11) & (kind < 0.16)
size_var = rng.uniform(0.62, 1.55, size=N)
phase = rng.uniform(0, math.tau, size=N)
amp = rng.uniform(0.05, 0.24, size=N)

# volumetric dust
ND = 900
dust = (rng.uniform(-1, 1, size=(ND, 3)) * np.array([24.0, 9.0, 24.0])).astype(np.float32)
dust_b = rng.uniform(0.02, 0.11, size=ND)
dust_ph = rng.uniform(0, math.tau, size=ND)

yy = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]
grad = BG_TOP[None, None, :] * (1 - yy[..., None]) + BG_BOT[None, None, :] * yy[..., None]
grad = np.repeat(grad, W, axis=1)
vx = np.linspace(-1, 1, W, dtype=np.float32)[None, :]
vy = np.linspace(-0.5625, 0.5625, H, dtype=np.float32)[:, None]
rr = np.sqrt(vx ** 2 + vy ** 2)
vign = np.clip(1.0 - 0.58 * np.clip(rr / 1.05, 0, 1.4) ** 2, 0.0, 1.0)[..., None].astype(np.float32)
BASE = (grad * vign).astype(np.float32)


def project(pos, p, ycam):
    rel = pos.copy()
    rel[:, 1] -= ycam
    pitch = -0.20 + 0.32 * smoothstep(p)
    cp, sp = math.cos(pitch), math.sin(pitch)
    ry = rel[:, 1] * cp - rel[:, 2] * sp
    rz = rel[:, 1] * sp + rel[:, 2] * cp
    rx = rel[:, 0]
    zcam = 26.0 - 19.6 * smoothstep(p)
    depth = np.maximum(rz + zcam, 1.2)
    sx = W / 2 + x_shift(p) + F * rx / depth
    sy = H / 2 - F * ry / depth
    return sx, sy, depth


def render_frame(p):
    pos = positions(p) + np.sin(phase[..., None] + p * 6.0 * math.tau) * amp[:, None] * 0.6
    ycam = -1.2 + 4.6 * smoothstep(p)
    sx, sy, depth = project(pos, p, ycam)

    ramp = 0.86 + 0.14 * smoothstep(np.clip(p / 0.15, 0, 1))
    dist = np.linalg.norm(pos, axis=1)
    wave = (0.85 + p * 0.45) * (dist.max() + 2.4)
    ignite = smoothstep((wave - dist) / 3.4 + 0.10)
    depth_fade = np.clip(1.45 - depth / 40.0, 0.10, 1.0)
    bright = np.clip(ignite * depth_fade * (0.34 + 0.66 * ignite) * ramp, 0, 1.4)
    radius = np.clip(F * 0.055 * size_var / depth, 0.5, 28.0)

    lo, hi = np.percentile(depth, [22, 72])
    band = np.where(depth < lo, 0, np.where(depth < hi, 1, 2))

    layers = [Image.new("RGB", (W, H), (0, 0, 0)) for _ in range(3)]
    drs = [ImageDraw.Draw(l) for l in layers]

    dx, dy, ddepth = project(dust + np.sin(dust_ph[..., None] + p * 3.0) * 0.5, p, ycam)
    dr = drs[2]
    for i in range(ND):
        if not (-40 < dx[i] < W + 40 and -40 < dy[i] < H + 40):
            continue
        b = dust_b[i] * ramp * np.clip(1.2 - ddepth[i] / 36.0, 0.05, 1.0)
        v = int(150 * b)
        r = 1.0 + 1.6 * ((i * 37) % 7) / 7.0
        dr.ellipse((dx[i] - r, dy[i] - r, dx[i] + r, dy[i] + r), fill=(v, v, v))

    for (i, j) in edges:
        a = min(bright[i], bright[j])
        if a < 0.02:
            continue
        b = int(band[i])
        if not (-600 < sx[i] < W + 600 and -600 < sy[i] < H + 600):
            continue
        if not (-600 < sx[j] < W + 600 and -600 < sy[j] < H + 600):
            continue
        col = COPPER * (0.46 * a) if (is_copper[i] and is_copper[j]) else JADE * (0.46 * a)
        try:
            drs[b].line(
                (float(sx[i]), float(sy[i]), float(sx[j]), float(sy[j])),
                fill=(int(col[0]), int(col[1]), int(col[2])),
                width=2 if b == 0 else 1,
            )
        except (ValueError, OverflowError):
            continue
    for (i, j) in long_edges:
        a = min(bright[i], bright[j])
        if a < 0.03:
            continue
        b = int(band[i])
        col = COPPER * (0.30 * a)
        try:
            drs[b].line(
                (float(sx[i]), float(sy[i]), float(sx[j]), float(sy[j])),
                fill=(int(col[0]), int(col[1]), int(col[2])),
                width=1,
            )
        except (ValueError, OverflowError):
            continue

    for k in np.argsort(-depth):
        b0 = bright[k]
        if b0 < 0.02:
            continue
        x, y, r = float(sx[k]), float(sy[k]), float(radius[k])
        if x < -80 or x > W + 80 or y < -80 or y > H + 80:
            continue
        bb = int(band[k])
        if is_ivory[k]:
            col = IVORY
        elif is_copper[k]:
            col = COPPER
        else:
            col = JADE + (JADE_HOT - JADE) * min(1.0, b0 * 0.95)
        c = (int(col[0] * b0), int(col[1] * b0), int(col[2] * b0))
        drs[bb].ellipse((x - r, y - r, x + r, y + r), fill=c)
        if bb == 0 and b0 > 0.55 and 2.2 < r < 16.0:
            drs[0].ellipse((x - r * 0.45, y - r * 0.45, x + r * 0.45, y + r * 0.45), fill=(255, 255, 255))

    near = layers[0]
    mid = layers[1].filter(ImageFilter.GaussianBlur(7))
    far = layers[2].filter(ImageFilter.GaussianBlur(21))

    core = Image.new("RGB", (W, H), (0, 0, 0))
    dc = ImageDraw.Draw(core)
    cx = W / 2 + x_shift(p)
    cy = H / 2 + 50 * (1 - p)
    gr = int(190 + 210 * smoothstep(p))
    dc.ellipse((cx - gr, cy - gr, cx + gr, cy + gr), fill=(20, 118, 90))
    core = core.filter(ImageFilter.GaussianBlur(150))

    bright_all = ImageChops.add(ImageChops.add(near, mid, scale=1.0), far, scale=1.0)
    bloom = bright_all.filter(ImageFilter.GaussianBlur(34))
    bloom2 = bright_all.filter(ImageFilter.GaussianBlur(96))

    base = Image.fromarray(np.clip(BASE, 0, 255).astype(np.uint8), "RGB")
    out = ImageChops.add(base, core, scale=1.0)
    out = ImageChops.add(out, bloom2, scale=2.4)
    out = ImageChops.add(out, bloom, scale=1.35)
    out = ImageChops.add(out, near, scale=1.12)
    out = ImageChops.add(out, mid, scale=0.95)
    out = ImageChops.add(out, far, scale=0.78)

    arr = np.asarray(out, dtype=np.float32) * 0.99
    arr += rng.normal(0, 2.6, size=(H, W, 1)).astype(np.float32)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def main():
    out = sys.stdout.buffer
    for f in range(FRAMES):
        img = render_frame(f / (FRAMES - 1))
        out.write(img.tobytes())
        if f % 30 == 0:
            print(f"frame {f}/{FRAMES}", file=sys.stderr, flush=True)
    out.flush()


if __name__ == "__main__":
    main()
