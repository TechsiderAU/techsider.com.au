#!/usr/bin/env python3
"""Generate the Techsider brand mark at every size the site uses.

Concept: a heavy sculptural T (Anthropic-style slab letterform) intersected
horizontally by a single accent-blue line that does double duty:
  - reads as a data/inference flow crossing the T (AI workflow signal)
  - mirrors the crossbar position in Anthropic's A glyph (places Techsider
    in the AI category by typographic association)
  - anchors the T with a subtle baseline accent

One letter + one line = one signature design move.

Outputs land in two places:
  public/                  — favicon.svg, favicon.ico, apple-touch-icon.png,
                             icon-192.png, icon-512.png, og.png
  logos/final/             — logo.svg, logo-{16,32,48,192,512,1024,2048}.png
                             (reference set, mirrors the logo-designer skill)

Run from anywhere; paths are resolved against this file's location.
"""
from __future__ import annotations

from pathlib import Path
from typing import Tuple

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
LOGO_DIR = ROOT / "logos" / "final"
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
LOGO_DIR.mkdir(parents=True, exist_ok=True)

# --- Design parameters --------------------------------------------------------
# Squircle radius (Apple icon style). Close-enough rounded-rect approximation.
SQUIRCLE_RADIUS = 0.225  # fraction of side

# Background: subtle navy gradient. Top slightly raised, bottom deepens.
BG_TOP = (14, 26, 49)        # #0e1a31
BG_BOTTOM = (7, 16, 30)      # #07101e

# Foreground T: softened white (Vuesub's trick — keeps the glyph from punching).
FG = (244, 246, 250, 240)    # #f4f6fa @ ~94% opacity

# Accent line: the one signature element.
ACCENT = (109, 169, 255, 255)  # #6da9ff

# T glyph proportions (fractions of icon side).
CROSSBAR_W = 0.62
CROSSBAR_H = 0.11
STEM_W = 0.18
STEM_H = 0.50          # height of stem (not including crossbar)
TOP_MARGIN = 0.17      # space above the crossbar

# Accent line — passes horizontally through the lower third of the T's stem.
LINE_W = 0.74          # extends beyond the T on both sides
LINE_H = 0.045
LINE_Y = 0.70          # vertical center as a fraction of side
LINE_RADIUS = 0.022    # capsule ends


def lerp(a: Tuple[int, int, int], b: Tuple[int, int, int], t: float) -> Tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def gradient_image(width: int, height: int) -> Image.Image:
    """Vertical linear gradient, top → bottom."""
    strip = Image.new("RGB", (1, height))
    for y in range(height):
        t = y / max(1, height - 1)
        strip.putpixel((0, y), lerp(BG_TOP, BG_BOTTOM, t))
    return strip.resize((width, height), Image.NEAREST)


def make_icon(size: int) -> Image.Image:
    """Render the icon at `size`x`size`. Heavy lifting at 4× supersampling
    so the squircle edge and accent line stay crisp after downscaling."""
    work = size * 4

    # --- Background squircle ---------------------------------------------------
    bg_layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    grad = gradient_image(work, work).convert("RGBA")
    mask = Image.new("L", (work, work), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, work - 1, work - 1),
        radius=int(work * SQUIRCLE_RADIUS),
        fill=255,
    )
    bg_layer.paste(grad, (0, 0), mask)

    # --- Foreground T glyph ----------------------------------------------------
    fg = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    draw = ImageDraw.Draw(fg)

    cb_w = int(work * CROSSBAR_W)
    cb_h = int(work * CROSSBAR_H)
    stem_w = int(work * STEM_W)
    stem_h = int(work * STEM_H)
    top_m = int(work * TOP_MARGIN)

    # Crossbar: full-width sculptural slab at the top of the glyph area.
    cb_x0 = (work - cb_w) // 2
    cb_y0 = top_m
    draw.rectangle((cb_x0, cb_y0, cb_x0 + cb_w, cb_y0 + cb_h), fill=FG)

    # Stem: centered vertical slab descending from the crossbar's bottom.
    stem_x0 = (work - stem_w) // 2
    stem_y0 = cb_y0 + cb_h
    draw.rectangle((stem_x0, stem_y0, stem_x0 + stem_w, stem_y0 + stem_h), fill=FG)

    # --- Accent line: the signature design move --------------------------------
    line_w = int(work * LINE_W)
    line_h = int(work * LINE_H)
    line_radius = int(work * LINE_RADIUS)
    line_y_center = int(work * LINE_Y)
    line_x0 = (work - line_w) // 2
    line_y0 = line_y_center - line_h // 2
    draw.rounded_rectangle(
        (line_x0, line_y0, line_x0 + line_w, line_y0 + line_h),
        radius=line_radius,
        fill=ACCENT,
    )

    # Composite and downscale to target.
    icon_4x = Image.alpha_composite(bg_layer, fg)
    return icon_4x.resize((size, size), Image.LANCZOS)


def write_svg() -> Path:
    """Emit a self-contained SVG with the same geometry, normalized to a
    512x512 viewBox so the browser can rasterize at any size without loss."""
    s = 512
    cb_w = round(s * CROSSBAR_W, 2)
    cb_h = round(s * CROSSBAR_H, 2)
    stem_w = round(s * STEM_W, 2)
    stem_h = round(s * STEM_H, 2)
    top_m = round(s * TOP_MARGIN, 2)
    line_w = round(s * LINE_W, 2)
    line_h = round(s * LINE_H, 2)
    line_radius = round(s * LINE_RADIUS, 2)
    line_y_center = round(s * LINE_Y, 2)

    cb_x0 = round((s - cb_w) / 2, 2)
    stem_x0 = round((s - stem_w) / 2, 2)
    stem_y0 = round(top_m + cb_h, 2)
    line_x0 = round((s - line_w) / 2, 2)
    line_y0 = round(line_y_center - line_h / 2, 2)

    sq_radius = round(s * SQUIRCLE_RADIUS, 2)

    bg_top = "#{:02x}{:02x}{:02x}".format(*BG_TOP)
    bg_bot = "#{:02x}{:02x}{:02x}".format(*BG_BOTTOM)
    fg_hex = "#f4f6fa"
    accent_hex = "#6da9ff"

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s} {s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{bg_top}"/>
      <stop offset="100%" stop-color="{bg_bot}"/>
    </linearGradient>
  </defs>
  <rect width="{s}" height="{s}" rx="{sq_radius}" fill="url(#bg)"/>
  <g fill="{fg_hex}" fill-opacity="0.94">
    <rect x="{cb_x0}" y="{top_m}" width="{cb_w}" height="{cb_h}"/>
    <rect x="{stem_x0}" y="{stem_y0}" width="{stem_w}" height="{stem_h}"/>
  </g>
  <rect x="{line_x0}" y="{line_y0}" width="{line_w}" height="{line_h}" rx="{line_radius}" fill="{accent_hex}"/>
</svg>
"""
    out = PUBLIC_DIR / "favicon.svg"
    out.write_text(svg)
    (LOGO_DIR / "logo.svg").write_text(svg)
    return out


def make_og_image(width: int = 1200, height: int = 630) -> Image.Image:
    """Open Graph card: full dark navy panel, icon centered-left, wordmark right."""
    img = Image.new("RGB", (width, height), BG_BOTTOM)

    # Soft gradient backdrop.
    grad = gradient_image(width, height)
    img.paste(grad)

    # Drop the icon at ~360x360 on the left.
    icon_side = 360
    icon = make_icon(icon_side)
    img.paste(icon, (110, (height - icon_side) // 2), icon)

    draw = ImageDraw.Draw(img)
    # No reliable system-font path here — let the Astro `og:image` carry styling
    # at the HTML level instead. The icon-only OG card still works and is
    # consistent with the favicon. (A future iteration can render a custom
    # wordmark via Pillow + a bundled .ttf if needed.)
    return img


def main() -> None:
    # SVG (the canonical site asset).
    svg_path = write_svg()
    print(f"  Wrote {svg_path}")

    # Public-facing PNGs.
    base = make_icon(1024)
    public_sizes = {
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }
    for name, sz in public_sizes.items():
        path = PUBLIC_DIR / name
        base.resize((sz, sz), Image.LANCZOS).save(path)
        print(f"  Wrote {path}")

    # favicon.ico — multi-size legacy.
    favicon_ico = PUBLIC_DIR / "favicon.ico"
    base.save(
        favicon_ico,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )
    print(f"  Wrote {favicon_ico}")

    # Open Graph card.
    og = make_og_image()
    og_path = PUBLIC_DIR / "og.png"
    og.save(og_path)
    print(f"  Wrote {og_path}")

    # Reference set (matches the logo-designer skill's output sizes).
    for sz in (16, 32, 48, 192, 512, 1024, 2048):
        path = LOGO_DIR / f"logo-{sz}.png"
        base.resize((sz, sz), Image.LANCZOS).save(path)
        print(f"  Wrote {path}")


if __name__ == "__main__":
    main()
