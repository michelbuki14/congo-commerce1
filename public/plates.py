#!/usr/bin/env python3
"""Render the section plates (stills from the same world as the film)."""

import pathlib

import render as R

OUT = pathlib.Path(
    "/home/user/403f0700-b256-42e3-8b18-9b77c05dc261/"
    "congo-commerce-ddb0fc94-2d3e-45dd-9229-f29b46104d8c/app/public/assets/plates"
)
OUT.mkdir(parents=True, exist_ok=True)

PLATES = [
    ("plate-lattice", 0.40),
    ("plate-field", 0.62),
    ("plate-sphere", 0.90),
    ("plate-close", 0.97),
]

for name, p in PLATES:
    img = R.render_frame(p).resize((1600, 900))
    path = OUT / f"{name}.jpg"
    img.save(path, format="JPEG", quality=88, optimize=True, progressive=True)
    print(name, round(path.stat().st_size / 1024), "KB")
