#!/usr/bin/env python3
"""Generate the Techsider asset set from the legacy 2021 brand artwork.

Source of truth:
  logos/Techsider logo/SVG/techsiderfavicon.svg        — cloud icon-only mark
  logos/Techsider logo/SVG/techsider-fontwhite.svg     — combination mark
                                                          (cloud + lowercase
                                                           "techsider", white)

Pipeline:
  1. Copy the icon-only SVG to public/favicon.svg (browser-native vector).
  2. Use Node+sharp (available via Astro's transitive deps) to rasterize
     the SVG to a 2048x2048 master PNG with transparent background.
  3. Use PIL to downscale to every size the site needs + pack favicon.ico.
  4. Compose the OG card (1200x630) with the combination wordmark centered
     on a navy gradient.

Run: python3 scripts/generate_logo.py
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Tuple

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
LEGACY_DIR = ROOT / "logos" / "Techsider logo"
ICON_SVG = LEGACY_DIR / "SVG" / "techsiderfavicon.svg"
COMBO_SVG = LEGACY_DIR / "SVG" / "techsider-fontwhite.svg"
PUBLIC_DIR = ROOT / "public"
LOGO_DIR = ROOT / "logos" / "final"
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
LOGO_DIR.mkdir(parents=True, exist_ok=True)

BG_TOP = (14, 26, 49)        # #0e1a31
BG_BOTTOM = (7, 16, 30)      # #07101e


def lerp(a: Tuple[int, int, int], b: Tuple[int, int, int], t: float) -> Tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def gradient_image(width: int, height: int) -> Image.Image:
    strip = Image.new("RGB", (1, height))
    for y in range(height):
        t = y / max(1, height - 1)
        strip.putpixel((0, y), lerp(BG_TOP, BG_BOTTOM, t))
    return strip.resize((width, height), Image.NEAREST)


def rasterize_svg(svg: Path, width: int, height: int, out_png: Path) -> None:
    """Use Node+sharp (from node_modules) to rasterize SVG → PNG."""
    if not (ROOT / "node_modules" / "sharp").exists():
        sys.exit("sharp not found in node_modules. Run `npm install` first.")
    js = f"""
const sharp = require('sharp');
sharp({str(svg)!r}, {{ density: 600 }})
  .resize({width}, {height}, {{ fit: 'contain', background: {{ r: 0, g: 0, b: 0, alpha: 0 }} }})
  .png()
  .toFile({str(out_png)!r})
  .then(() => process.exit(0))
  .catch(e => {{ console.error(e); process.exit(1); }});
""".strip()
    subprocess.run(["node", "-e", js], cwd=ROOT, check=True)


def main() -> None:
    if not ICON_SVG.exists():
        sys.exit(f"Missing source: {ICON_SVG}")

    # 1. Copy the icon SVG to public as the canonical favicon.
    dst_svg = PUBLIC_DIR / "favicon.svg"
    shutil.copyfile(ICON_SVG, dst_svg)
    shutil.copyfile(ICON_SVG, LOGO_DIR / "logo.svg")
    print(f"  Wrote {dst_svg}")

    # 2. Rasterize to a high-res master PNG (2048x2048, transparent bg).
    with tempfile.TemporaryDirectory() as tmp:
        master_png = Path(tmp) / "master.png"
        rasterize_svg(ICON_SVG, 2048, 2048, master_png)
        master = Image.open(master_png).convert("RGBA")

        # 3. Site assets — favicons, apple-touch, PWA icons.
        site_outputs = {
            "apple-touch-icon.png": 180,
            "icon-192.png": 192,
            "icon-512.png": 512,
        }
        for name, sz in site_outputs.items():
            resized = master.resize((sz, sz), Image.LANCZOS)
            # apple-touch + PWA icons want an opaque background.
            if name == "apple-touch-icon.png":
                bg = Image.new("RGB", (sz, sz), (11, 20, 36))  # #0b1424
                bg.paste(resized, (0, 0), resized)
                bg.save(PUBLIC_DIR / name)
            else:
                bg = Image.new("RGBA", (sz, sz), (11, 20, 36, 255))
                bg = Image.alpha_composite(bg, resized)
                bg.save(PUBLIC_DIR / name)
            print(f"  Wrote {PUBLIC_DIR / name} ({sz}x{sz})")

        # 4. favicon.ico — multi-size legacy.
        ico = PUBLIC_DIR / "favicon.ico"
        ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
        master.save(ico, format="ICO", sizes=ico_sizes)
        print(f"  Wrote {ico}")

        # 5. Reference set (mirrors the logo-designer skill output sizes).
        for sz in (16, 32, 48, 192, 512, 1024, 2048):
            path = LOGO_DIR / f"logo-{sz}.png"
            master.resize((sz, sz), Image.LANCZOS).save(path)

        # 6. OG card — combination wordmark on navy gradient (1200x630).
        og_path = PUBLIC_DIR / "og.png"
        og_w, og_h = 1200, 630
        og_bg = gradient_image(og_w, og_h)
        # Rasterize the combination mark wide and center it horizontally.
        combo_w, combo_h = 800, int(800 * 73.86 / 473.23)
        combo_master = Path(tmp) / "combo.png"
        rasterize_svg(COMBO_SVG, combo_w, combo_h, combo_master)
        combo = Image.open(combo_master).convert("RGBA")
        og_bg = og_bg.convert("RGBA")
        offset = ((og_w - combo_w) // 2, (og_h - combo_h) // 2)
        og_bg.alpha_composite(combo, offset)
        og_bg.convert("RGB").save(og_path)
        print(f"  Wrote {og_path}")


if __name__ == "__main__":
    main()
