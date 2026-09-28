#!/usr/bin/env python3
"""Generate the Acid Signal brand asset kit for techsider.com.au.

Outputs (default: public/):
  logo.svg                 [techsider] wordmark for carbon backgrounds (lime brackets, bone letters)
  logo-on-bone.svg         same wordmark for bone backgrounds (all carbon)
  favicon.svg              bracketed "t" mark on a carbon rounded square (32-unit grid)
  favicon.ico              16/32/48 px, each rendered from the SVG at its own size
  apple-touch-icon.png     180 px, full-bleed carbon (iOS applies its own mask)
  icon-192.png, icon-512.png
  icon-maskable-512.png    full-bleed carbon, mark inside the 80% safe zone
  site.webmanifest

Glyphs are real JetBrains Mono Bold outlines (wght=700 instance of the variable font
shipped in node_modules/@fontsource-variable/jetbrains-mono), converted to SVG paths,
so no font is needed to display the logo.

Needs: python3 with fontTools + brotli + Pillow; node with `sharp` in node_modules.
Run from the repo root:  python3 scripts/generate_brand.py [--out DIR]
"""
from __future__ import annotations

import argparse
import json
import subprocess
from io import BytesIO
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"

CARBON = "#0B0B0C"
BONE = "#F2F1EC"
ACID = "#C8FF2E"


def load_bold() -> TTFont:
    font = TTFont(FONT)
    return instantiateVariableFont(font, {"wght": 700})


def glyph_path(font: TTFont, ch: str, scale: float, dx: float, baseline: float) -> tuple[str, tuple]:
    """SVG path data for one character, y flipped, plus its bounds in SVG space."""
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord(ch)]
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    # font units → SVG: x' = scale*x + dx ; y' = -scale*y + baseline
    gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, dx, baseline)))
    bp = BoundsPen(gs)
    gs[name].draw(TransformPen(bp, (scale, 0, 0, -scale, dx, baseline)))
    return pen.getCommands(), bp.bounds


def advance(font: TTFont, ch: str) -> int:
    return font["hmtx"][font.getBestCmap()[ord(ch)]][0]


def wordmark_svg(font: TTFont, bracket_fill: str, letter_fill: str) -> str:
    text = "[techsider]"
    upm = font["head"].unitsPerEm
    scale = 100 / upm  # 100 SVG units per em
    baseline = 100.0
    x = 0.0
    brackets, letters, boxes = [], [], []
    for ch in text:
        d, b = glyph_path(font, ch, scale, x, baseline)
        (brackets if ch in "[]" else letters).append(d)
        if b:
            boxes.append(b)
        x += advance(font, ch) * scale
    xmin = min(b[0] for b in boxes)
    ymin = min(b[1] for b in boxes)
    xmax = max(b[2] for b in boxes)
    ymax = max(b[3] for b in boxes)
    pad = 2
    vb = f"{xmin - pad:.2f} {ymin - pad:.2f} {xmax - xmin + 2 * pad:.2f} {ymax - ymin + 2 * pad:.2f}"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Techsider">'
        f'<path fill="{bracket_fill}" d="{" ".join(brackets)}"/>'
        f'<path fill="{letter_fill}" d="{" ".join(letters)}"/>'
        "</svg>\n"
    )


def mark_svg(font: TTFont, *, rounded: bool, content_scale: float) -> str:
    """Bracketed-t mark on a 32-unit grid. content_scale shrinks the brackets + t about the centre."""
    # Brackets drawn as geometry (crisper at 16 px than font brackets); arms stop short of the t.
    left = "M5 6h5v3H8v14h2v3H5z"
    right = "M27 6h-5v3h2v14h-2v3h5z"
    # 't' glyph scaled to 14 units tall, centred in the 32 grid.
    _, b = glyph_path(font, "t", 1.0, 0, 0)
    gw, gh = b[2] - b[0], b[3] - b[1]
    s = 14 / gh
    dx = 16 - (b[0] + gw / 2) * s
    base = 16 - (b[1] + gh / 2) * s
    d, _ = glyph_path(font, "t", s, dx, base)
    rx = ' rx="6"' if rounded else ""
    c = content_scale
    t = f"translate({16 - 16 * c:.3f} {16 - 16 * c:.3f}) scale({c})"
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        f'<rect width="32" height="32"{rx} fill="{CARBON}"/>'
        f'<g transform="{t}"><path fill="{ACID}" d="{left} {right}"/>'
        f'<path fill="{BONE}" d="{d}"/></g>'
        "</svg>\n"
    )


def rasterize(svg: str, size: int) -> Image.Image:
    js = (
        "const sharp=require('sharp');let b=[];process.stdin.on('data',c=>b.push(c));"
        "process.stdin.on('end',async()=>{const png=await sharp(Buffer.concat(b),{density:1200})"
        f".resize({size},{size}).png().toBuffer();process.stdout.write(png);}});"
    )
    out = subprocess.run(["node", "-e", js], input=svg.encode(), capture_output=True, cwd=ROOT, check=True)
    return Image.open(BytesIO(out.stdout)).convert("RGBA")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "public"))
    out = Path(ap.parse_args().out)
    out.mkdir(parents=True, exist_ok=True)
    font = load_bold()

    (out / "logo.svg").write_text(wordmark_svg(font, ACID, BONE))
    (out / "logo-on-bone.svg").write_text(wordmark_svg(font, CARBON, CARBON))

    fav = mark_svg(font, rounded=True, content_scale=1.0)
    (out / "favicon.svg").write_text(fav)
    ico = [rasterize(fav, s) for s in (16, 32, 48)]
    ico[2].save(out / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])

    rasterize(mark_svg(font, rounded=False, content_scale=0.9), 180).save(out / "apple-touch-icon.png")
    rasterize(fav, 192).save(out / "icon-192.png")
    rasterize(fav, 512).save(out / "icon-512.png")
    rasterize(mark_svg(font, rounded=False, content_scale=0.72), 512).save(out / "icon-maskable-512.png")

    manifest = {
        "name": "Techsider",
        "short_name": "Techsider",
        "start_url": "/",
        "display": "browser",
        "background_color": CARBON,
        "theme_color": CARBON,
        "icons": [
            {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    (out / "site.webmanifest").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote brand kit to {out}")


if __name__ == "__main__":
    main()
