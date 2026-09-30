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

With --og (`npm run og`) it writes only the social cards (spec §6.3, §11.3), to og/ in the output:
  og/<kind>.png            1200x630, one per template kind in src/lib/social-image.ts: the §6.3
                           lock-up ([techsider], "AI that ships.", "Measured before it ships.") and
                           the kind's bracket tag, or the Home prompt line, on carbon with the
                           scan-line texture. A tEXt chunk, "techsider-og", records the card's kind
                           and the SHA-256 of every input it was drawn from; tests/social-images.test.mjs
                           fails when one no longer matches the repo, so re-run this after changing
                           the copy, this script or a font.

Glyphs are real JetBrains Mono Bold outlines (wght=700 instance of the variable font
shipped in node_modules/@fontsource-variable/jetbrains-mono), converted to SVG paths,
so no font is needed to display the logo. The social cards outline their text the same way:
Archivo (node_modules/@fontsource-variable/archivo) for the slogan, at width 125 and weight 850
as the site sets display type, and the proof line, at width 100 and weight 600, both with the
font's pair kerning; JetBrains Mono for the wordmark, the tag and the host.

Needs: python3 with fontTools + brotli + Pillow; node with `sharp` in node_modules (and, for
--og, Node 22.18 or later, which imports src/lib/social-image.ts as it is).
Run from the repo root:  python3 scripts/generate_brand.py [--out DIR] [--og]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from io import BytesIO
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image
from PIL.PngImagePlugin import PngInfo

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"
ARCHIVO = ROOT / "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2"

CARBON = "#0B0B0C"
BONE = "#F2F1EC"
ACID = "#C8FF2E"
GRAPHITE = "#2A2B2E"
MUTED = "#9A9A94"

# The social cards' spec, read from the site's own module so the cards carry the site's copy.
OG_SPEC_JS = (
    "import { socialImageSpec } from './src/lib/social-image.ts';"
    "process.stdout.write(JSON.stringify(socialImageSpec()));"
)
# The PNG tEXt keyword that records a card's kind and input hashes (tests/social-images.test.mjs).
OG_KEY = "techsider-og"


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


def rasterize(svg: str, width: int, height: int | None = None, density: int = 1200) -> Image.Image:
    """PNG of the SVG through sharp: square at `width` unless `height` is given. `density` is the
    DPI sharp renders the vector at before resizing: the icons' tiny grids need 1200; a social card,
    drawn at its pixel size, renders at 72 (one SVG unit per pixel)."""
    js = (
        "const sharp=require('sharp');let b=[];process.stdin.on('data',c=>b.push(c));"
        f"process.stdin.on('end',async()=>{{const png=await sharp(Buffer.concat(b),{{density:{density}}})"
        f".resize({width},{height or width}).png().toBuffer();process.stdout.write(png);}});"
    )
    out = subprocess.run(["node", "-e", js], input=svg.encode(), capture_output=True, cwd=ROOT, check=True)
    return Image.open(BytesIO(out.stdout)).convert("RGBA")


def instance(path: Path, **axes: float) -> TTFont:
    """A static instance of a variable font at the given axis values, e.g. wdth=125, wght=850."""
    return instantiateVariableFont(TTFont(path), axes)


def pair_kern(font: TTFont, left: str, right: str) -> int:
    """The GPOS 'kern' adjustment between two glyphs, in font units (PairPos formats 1 and 2, direct
    or inside an extension lookup). Within a lookup the first subtable that covers the pair applies."""
    if "GPOS" not in font:
        return 0
    gpos = font["GPOS"].table
    indices = sorted({i for fr in gpos.FeatureList.FeatureRecord if fr.FeatureTag == "kern" for i in fr.Feature.LookupListIndex})
    total = 0
    for index in indices:
        lookup = gpos.LookupList.Lookup[index]
        for sub in lookup.SubTable:
            if lookup.LookupType == 9:
                if sub.ExtensionLookupType != 2:
                    continue
                sub = sub.ExtSubTable
            elif lookup.LookupType != 2:
                continue
            covered = sub.Coverage.glyphs
            if left not in covered:
                continue
            if sub.Format == 1:
                pairs = sub.PairSet[covered.index(left)].PairValueRecord
                record = next((r for r in pairs if r.SecondGlyph == right), None)
                if record is None:
                    continue
                value = record.Value1
            else:
                first = sub.ClassDef1.classDefs.get(left, 0)
                second = sub.ClassDef2.classDefs.get(right, 0)
                value = sub.Class1Record[first].Class2Record[second].Value1
            total += getattr(value, "XAdvance", 0) or 0
            break
    return total


def text_run(font: TTFont, text: str, size: float, x: float, baseline: float, tracking: float = 0.0) -> tuple[list[tuple[str, str]], float]:
    """Outlined text set from x along a baseline: (character, SVG path data) per character, and the
    pen's end x. Advances are the font's, plus its pair kerning and `tracking` in em (CSS
    letter-spacing, which follows every character)."""
    scale = size / font["head"].unitsPerEm
    cmap = font.getBestCmap()
    glyphs, prev = [], None
    for ch in text:
        name = cmap[ord(ch)]
        if prev is not None:
            x += pair_kern(font, prev, name) * scale
        d, _ = glyph_path(font, ch, scale, x, baseline)
        glyphs.append((ch, d))
        x += font["hmtx"][name][0] * scale + tracking * size
        prev = name
    return glyphs, x


def card_svg(spec: dict, card: dict, fonts: dict[str, TTFont]) -> str:
    """One social card: the §6.3 lock-up on carbon with the scan-line texture, as the Home hero sets
    it. Top to bottom: the [techsider] wordmark; the kind's bracket tag or the Home prompt line; the
    slogan in display caps with its highlighted word in the lime block; the proof line directly
    beneath; the host. Exits with a message when a line would run past the right margin."""
    w, h = spec["width"], spec["height"]
    left, right = 80, w - 80
    fills: list[tuple[str, str]] = []
    rects: list[str] = []

    def paint(fill: str, glyphs: list[tuple[str, str]]) -> None:
        d = " ".join(d for _, d in glyphs if d)
        if d:
            fills.append((fill, d))

    def fits(end: float, what: str) -> None:
        if end > right:
            raise SystemExit(f"social card {card['kind']}: {what} runs {end - right:.0f}px past the right margin")

    # The wordmark: lime brackets, bone letters (spec §6.3).
    mark, end = text_run(fonts["mono-bold"], "[techsider]", 44, left, 104)
    paint(ACID, [g for g in mark if g[0] in "[]"])
    paint(BONE, [g for g in mark if g[0] not in "[]"])
    fits(end, "the wordmark")

    # Above the slogan: the section's bracket tag (lime brackets, bone label), or the Home hero's
    # prompt line (lime caret, muted command), as PageHero sets its eyebrow and prompt.
    if card["tag"]:
        tag, end = text_run(fonts["mono"], f"[{card['tag']}]", 32, left, 262)
        paint(ACID, [g for g in tag if g[0] in "[]"])
        paint(BONE, [g for g in tag if g[0] not in "[]"])
        fits(end, "the tag")
    elif card["prompt"]:
        caret, x = text_run(fonts["mono"], "> ", 32, left, 262)
        rest, end = text_run(fonts["mono"], f"{card['prompt']['command']} {card['prompt']['args']}", 32, x, 262)
        paint(ACID, caret)
        paint(MUTED, rest)
        fits(end, "the prompt line")

    # The slogan in display caps (Archivo at width 125, weight 850, tracking -0.01em), with its one
    # highlighted word in carbon on a lime block padded 0.15em each side, as the hero's .hl sets it.
    slogan, word = spec["slogan"], spec["highlight"]
    match = re.search(rf"\b{re.escape(word)}\b", slogan)
    if match is None:
        raise SystemExit(f"social cards: the highlight {word!r} is not a whole word of {slogan!r}")
    size, baseline, display = 100, 384, fonts["display"]
    pad = 0.15 * size
    before, x = text_run(display, slogan[: match.start()].upper(), size, left, baseline, -0.01)
    lit, lit_end = text_run(display, match.group().upper(), size, x + pad, baseline, -0.01)
    after, end = text_run(display, slogan[match.end():].upper(), size, lit_end + pad, baseline, -0.01)
    scale = size / display["head"].unitsPerEm
    top = baseline - display["hhea"].ascent * scale
    bottom = baseline - display["hhea"].descent * scale
    rects.append(f'<rect x="{x:.2f}" y="{top:.2f}" width="{lit_end + pad - x:.2f}" height="{bottom - top:.2f}" fill="{ACID}"/>')
    paint(BONE, before + after)
    paint(CARBON, lit)
    fits(end, "the slogan")

    # The proof line, directly beneath (spec §6.3): Archivo at width 100, weight 600.
    proof, end = text_run(fonts["text"], spec["proofLine"], 50, left, 462)
    paint(BONE, proof)
    fits(end, "the proof line")

    host, end = text_run(fonts["mono"], spec["host"], 26, left, 566)
    paint(MUTED, host)
    fits(end, "the host")

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
        '<defs><pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">'
        f'<rect y="3" width="4" height="1" fill="{GRAPHITE}" fill-opacity="0.6"/></pattern></defs>'
        f'<rect width="{w}" height="{h}" fill="{CARBON}"/>'
        f'<rect width="{w}" height="{h}" fill="url(#scan)"/>'
        + "".join(rects)
        + "".join(f'<path fill="{fill}" d="{d}"/>' for fill, d in fills)
        + "</svg>\n"
    )


def write_social_cards(out: Path) -> None:
    """<out>/<kind>.png for every card in socialImageSpec(), each recording its input hashes; a PNG
    for a kind the spec no longer has is deleted."""
    # stderr isn't captured, so a failed import (Node before 22.18 can't load .ts) prints its reason.
    raw = subprocess.run(["node", "--input-type=module", "-e", OG_SPEC_JS], stdout=subprocess.PIPE, cwd=ROOT, check=True).stdout
    spec = json.loads(raw)
    inputs = {"spec": hashlib.sha256(raw).hexdigest()}
    for path in (Path(__file__).resolve(), FONT, ARCHIVO):
        inputs[path.relative_to(ROOT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    fonts = {
        "mono": instance(FONT, wght=400),
        "mono-bold": load_bold(),
        "display": instance(ARCHIVO, wdth=125, wght=850),
        "text": instance(ARCHIVO, wdth=100, wght=600),
    }
    out.mkdir(parents=True, exist_ok=True)
    kinds = [card["kind"] for card in spec["cards"]]
    for old in out.glob("*.png"):
        if old.stem not in kinds:
            old.unlink()
    for card in spec["cards"]:
        png = rasterize(card_svg(spec, card, fonts), spec["width"], spec["height"], density=72).convert("RGB")
        info = PngInfo()
        info.add_text(OG_KEY, json.dumps({"kind": card["kind"], "inputs": inputs}, sort_keys=True, separators=(",", ":")))
        png.save(out / f"{card['kind']}.png", pnginfo=info, optimize=True)
    print(f"wrote {len(kinds)} social cards to {out}: {', '.join(kinds)}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "public"))
    ap.add_argument("--og", action="store_true", help="write only the social cards, to og/ in the output")
    args = ap.parse_args()
    out = Path(args.out)
    if args.og:
        write_social_cards(out / "og")
        return
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
