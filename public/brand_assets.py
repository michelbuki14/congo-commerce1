#!/usr/bin/env python3
"""CONGO COMMERCE — logo SVG files, favicon/head kit, OG + cover cards."""

import math
import pathlib
import textwrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(
    "/home/user/403f0700-b256-42e3-8b18-9b77c05dc261/"
    "congo-commerce-ddb0fc94-2d3e-45dd-9229-f29b46104d8c/app/public"
)
BRAND = ROOT / "assets" / "brand"
BRAND.mkdir(parents=True, exist_ok=True)

INK = (237, 242, 238)
JADE = (18, 168, 122)
JADE_HI = (25, 196, 141)
BG = (8, 13, 11)
MUTED = (132, 150, 140)
COPPER = (200, 122, 69)

FONTS = {
    "sora": "/home/.fonts/sora.ttf",
    "manrope": "/home/.fonts/manrope.ttf",
    "mono": "/home/.fonts/jetbrains-mono.ttf",
}


def font(name: str, size: int, weight: int | None = None):
    f = ImageFont.truetype(FONTS[name], size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


# --------------------------------------------------------------- logo SVG --

def mark_svg(stroke_a="#12A87A", stroke_b="#EDF2EE", node="#19C48D", size=64):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 64 64" role="img" aria-label="CONGO COMMERCE">
  <path d="M33.03 43.47 A14 14 0 1 1 33.03 20.53" fill="none" stroke="{stroke_a}" stroke-width="7" stroke-linecap="round"/>
  <path d="M30.97 43.47 A14 14 0 1 0 30.97 20.53" fill="none" stroke="{stroke_b}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="3.6" fill="{node}"/>
</svg>
"""


WORDMARK = (
    '<text x="0" y="0" font-family="Sora, Segoe UI, sans-serif" font-weight="700" '
    'font-size="26" letter-spacing="1.7" fill="#EDF2EE">CONGO</text>'
)


def horizontal_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" width="330" height="64" viewBox="0 0 330 64" role="img" aria-label="CONGO COMMERCE">
  <g>
    <path d="M33.03 43.47 A14 14 0 1 1 33.03 20.53" fill="none" stroke="#12A87A" stroke-width="7" stroke-linecap="round"/>
    <path d="M30.97 43.47 A14 14 0 1 0 30.97 20.53" fill="none" stroke="#EDF2EE" stroke-width="7" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="3.6" fill="#19C48D"/>
  </g>
  <text x="76" y="41" font-family="Sora, Segoe UI, sans-serif" font-weight="700" font-size="25" letter-spacing="2" fill="#EDF2EE">CONGO <tspan fill="#12A87A">COMMERCE</tspan></text>
</svg>
"""


def stacked_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180" role="img" aria-label="CONGO COMMERCE">
  <g transform="translate(88,16)">
    <path d="M33.03 43.47 A14 14 0 1 1 33.03 20.53" fill="none" stroke="#12A87A" stroke-width="7" stroke-linecap="round"/>
    <path d="M30.97 43.47 A14 14 0 1 0 30.97 20.53" fill="none" stroke="#EDF2EE" stroke-width="7" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="3.6" fill="#19C48D"/>
  </g>
  <text x="120" y="122" text-anchor="middle" font-family="Sora, Segoe UI, sans-serif" font-weight="700" font-size="26" letter-spacing="4" fill="#EDF2EE">CONGO</text>
  <text x="120" y="150" text-anchor="middle" font-family="Sora, Segoe UI, sans-serif" font-weight="600" font-size="17" letter-spacing="5" fill="#12A87A">COMMERCE</text>
</svg>
"""


(BRAND / "logo-mark.svg").write_text(mark_svg())
(BRAND / "logo-mark-mono.svg").write_text(
    mark_svg(stroke_a="#EDF2EE", stroke_b="#84968C", node="#EDF2EE")
)
(BRAND / "logo-primary.svg").write_text(horizontal_svg())
(BRAND / "logo-stacked.svg").write_text(stacked_svg())
(BRAND / "favicon.svg").write_text(mark_svg(size=64))


# ------------------------------------------------------------ mark draw ----

def draw_mark(img_size, mark_frac=0.72, ground=None, radius=None, glow=True, simple=False):
    """Return an RGBA image of the mark, optionally on a rounded ground.

    `simple` drops the centre node and fattens the strokes so the mark still
    reads at 16-32px instead of turning to mush.
    """
    ss = 4
    S = img_size * ss
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    m = S * mark_frac
    off = (S - m) / 2
    k = m / 64.0
    stroke = 9.5 if simple else 7
    w = max(1, int(stroke * k))

    def arc(cx, cy, start, end, colour):
        box = [off + (cx - 14) * k, off + (cy - 14) * k, off + (cx + 14) * k, off + (cy + 14) * k]
        d.arc(box, start=start, end=end, fill=colour, width=w)
        for ang in (start, end):
            px = off + (cx + 14 * math.cos(math.radians(ang))) * k
            py = off + (cy + 14 * math.sin(math.radians(ang))) * k
            d.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=colour)

    arc(25, 32, 55, 305, JADE + (255,))
    arc(39, 32, 305, 415, INK + (255,))
    if not simple:
        node_r = 3.6 * k
        nx, ny = off + 32 * k, off + 32 * k
        d.ellipse([nx - node_r, ny - node_r, nx + node_r, ny + node_r], fill=JADE_HI + (255,))

    mark = layer.resize((img_size, img_size), Image.LANCZOS)

    if ground is None:
        return mark

    canvas = Image.new("RGBA", (img_size, img_size), ground + (255,))
    if glow:
        g = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        r = img_size * 0.62
        gd.ellipse(
            [img_size / 2 - r, img_size * 0.62 - r, img_size / 2 + r, img_size * 0.62 + r],
            fill=(18, 168, 122, 60),
        )
        canvas = Image.alpha_composite(canvas, g.filter(ImageFilter.GaussianBlur(img_size * 0.16)))
    canvas = Image.alpha_composite(canvas, mark)

    if radius:
        mask = Image.new("L", (img_size * 4, img_size * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, img_size * 4 - 1, img_size * 4 - 1], radius=radius * 4, fill=255
        )
        mask = mask.resize((img_size, img_size), Image.LANCZOS)
        canvas.putalpha(mask)
    return canvas


# favicon / PWA set
draw_mark(32, 0.94, ground=BG, radius=7, simple=True).save(BRAND / "favicon-32.png")
draw_mark(16, 0.96, ground=BG, radius=4, simple=True).save(BRAND / "favicon-16.png")
draw_mark(64, 0.86, ground=BG, radius=14, simple=True).save(BRAND / "favicon-64.png")
draw_mark(180, 0.70, ground=BG, radius=40).save(BRAND / "apple-touch-icon.png")
draw_mark(192, 0.72, ground=BG, radius=42).save(BRAND / "icon-192.png")
draw_mark(512, 0.72, ground=BG, radius=110).save(BRAND / "icon-512.png")
draw_mark(512, 0.58, ground=BG).save(BRAND / "icon-512-maskable.png")
ico = draw_mark(64, 0.90, ground=BG, radius=14, simple=True)
ico.save(BRAND / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

(BRAND / "site.webmanifest").write_text(
    """{
  "name": "CONGO COMMERCE",
  "short_name": "CONGO",
  "description": "One operating system for modern commerce.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#080D0B",
  "theme_color": "#080D0B",
  "icons": [
    { "src": "/assets/brand/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/brand/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/assets/brand/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
"""
)


# ----------------------------------------------------------- OG / cover ----

PLATE = ROOT / "assets" / "plates"


def plate_bg(w, h, name, darken=0.55, blur=0):
    src = Image.open(PLATE / f"{name}.jpg").convert("RGB")
    scale = max(w / src.width, h / src.height)
    src = src.resize((int(src.width * scale) + 1, int(src.height * scale) + 1), Image.LANCZOS)
    left = (src.width - w) // 2
    top = (src.height - h) // 2
    bg = src.crop((left, top, left + w, top + h))
    if blur:
        bg = bg.filter(ImageFilter.GaussianBlur(blur))
    bg = Image.eval(bg, lambda v: int(v * darken))
    return bg


def og_card(path, w, h, title_lines, kicker=None, sub=None):
    img = plate_bg(w, h, "plate-field", darken=0.78, blur=2).convert("RGBA")

    # scrim: heavy over the type block, clearing by the right third so the
    # network stays visible and the card is not left-heavy.
    scrim = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scrim)
    for x in range(w):
        t = x / w
        a = int(238 * max(0.0, 1 - (t / 0.58) ** 0.55))
        sd.line([(x, 0), (x, h)], fill=(8, 13, 11, a))
    img = Image.alpha_composite(img, scrim)

    mark = draw_mark(int(h * 0.19), 0.82, simple=True)
    img.alpha_composite(mark, (int(w * 0.068), int(h * 0.095)))

    d = ImageDraw.Draw(img)
    f_word = font("sora", int(h * 0.047), 700)
    f_title = font("sora", int(h * 0.112), 700)
    f_kick = font("mono", int(h * 0.031), 700)
    f_sub = font("manrope", int(h * 0.035), 600)

    wx = int(w * 0.068) + int(h * 0.235)
    d.text((wx, int(h * 0.156)), "CONGO", font=f_word, fill=INK)
    ww = d.textlength("CONGO ", font=f_word)
    d.text((wx + ww, int(h * 0.156)), "COMMERCE", font=f_word, fill=JADE)

    if kicker:
        d.rectangle(
            [int(w * 0.068), int(h * 0.312), int(w * 0.068) + 3, int(h * 0.312) + int(h * 0.034)],
            fill=JADE_HI,
        )
        d.text((int(w * 0.082), int(h * 0.310)), kicker.upper(), font=f_kick, fill=INK)

    y = int(h * 0.415)
    for line in title_lines:
        d.text((int(w * 0.068), y), line, font=f_title, fill=INK)
        y += int(h * 0.118)
    if sub:
        for line in textwrap.wrap(sub, width=54)[:2]:
            d.text((int(w * 0.068), y + int(h * 0.024)), line, font=f_sub, fill=MUTED)
            y += int(h * 0.048)

    d.rectangle(
        [int(w * 0.068), int(h * 0.845), int(w * 0.068) + int(w * 0.045), int(h * 0.845) + 4],
        fill=JADE,
    )
    d.text((int(w * 0.068) + int(w * 0.058), int(h * 0.826)), "congo-commerce", font=f_kick, fill=MUTED)

    img.convert("RGB").save(path, format="PNG", optimize=True)
    print(path.name, round(path.stat().st_size / 1024), "KB")


og_card(
    BRAND / "og.png",
    1200,
    630,
    ["COMMERCE,", "REIMAGINED."],
    kicker="One operating system for modern commerce",
)
og_card(
    BRAND / "cover.png",
    1500,
    1000,
    ["CONGO", "COMMERCE"],
    kicker="Commerce, reimagined",
    sub="Build, discover, sell, market, fulfill and scale from one intelligent commerce platform.",
)

print("brand kit written to", BRAND)
