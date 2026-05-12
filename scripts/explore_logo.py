#!/usr/bin/env python3
"""Logo exploration script v3 — agent-workflow marks (no letter T).

Each variant visualizes a different shape of AI agent system:
  - hub-spoke   : 1 orchestrator + 5 agents (single tier)
  - mesh        : 6 fully-interconnected agents (peer mesh)
  - dag         : directional pipeline that branches into parallel agents
  - orbital     : orchestrator with two concentric tiers of agents

All variants share the modern base: navy gradient squircle + radial top-left
highlight + Apple-style 22.5% corner radius. 4× supersampling, LANCZOS down.

Run: python3 scripts/explore_logo.py
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Callable, Tuple

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
EXPLORE_DIR = ROOT / "logos" / "explore"
PREVIEW_HTML = ROOT / "logos" / "preview.html"
EXPLORE_DIR.mkdir(parents=True, exist_ok=True)

# --- Design tokens ------------------------------------------------------------
SQUIRCLE_RADIUS = 0.225

BG_TOP = (20, 36, 64)
BG_BOTTOM = (5, 12, 24)

FG_WHITE = (244, 246, 250, 240)
NODE_WHITE = (244, 246, 250, 255)
ACCENT = (109, 169, 255, 255)
ACCENT_LIGHT = (158, 200, 255, 255)
ACCENT_DEEP = (60, 130, 215, 255)
LINE_BLUE = (109, 169, 255, 200)
LINE_FAINT = (158, 200, 255, 130)


def lerp(a: Tuple[int, int, int], b: Tuple[int, int, int], t: float) -> Tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def gradient_image(width: int, height: int) -> Image.Image:
    strip = Image.new("RGB", (1, height))
    for y in range(height):
        t = y / max(1, height - 1)
        strip.putpixel((0, y), lerp(BG_TOP, BG_BOTTOM, t))
    return strip.resize((width, height), Image.NEAREST)


def radial_highlight(size: int, cx_frac: float = 0.30, cy_frac: float = 0.22,
                     radius_frac: float = 0.75, peak_alpha: int = 60) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx, cy = int(size * cx_frac), int(size * cy_frac)
    max_r = size * radius_frac
    px = img.load()
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy)
            if d >= max_r:
                continue
            t = 1.0 - (d / max_r)
            a = int(peak_alpha * (t * t))
            px[x, y] = (255, 255, 255, a)
    return img.filter(ImageFilter.GaussianBlur(radius=size // 24))


def draw_node(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float,
              fill, stroke=None, stroke_w: int = 0) -> None:
    bbox = (cx - r, cy - r, cx + r, cy + r)
    if stroke is not None:
        d.ellipse(bbox, fill=fill, outline=stroke, width=stroke_w)
    else:
        d.ellipse(bbox, fill=fill)


def draw_line(d: ImageDraw.ImageDraw, p1: Tuple[float, float], p2: Tuple[float, float],
              color, width: int) -> None:
    d.line([p1, p2], fill=color, width=width)


# --- Glyph variants -----------------------------------------------------------

def glyph_hub_spoke(work: int) -> Image.Image:
    """Hub & Spoke — 1 orchestrator + 5 agents in a pentagon around it.
    The orchestrator carries an accent-blue inner dot (active state).
    Reads as: one supervisor coordinating multiple agents."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = work / 2, work / 2

    # Agent positions: pentagon, top vertex at -90 degrees.
    n_agents = 5
    spoke_r = work * 0.32
    agent_r = work * 0.068
    orch_r = work * 0.14
    line_w = max(1, int(work * 0.018))

    agents = []
    for i in range(n_agents):
        angle = math.radians(-90 + i * (360 / n_agents))
        ax = cx + spoke_r * math.cos(angle)
        ay = cy + spoke_r * math.sin(angle)
        agents.append((ax, ay))

    # Draw connecting spokes first (behind nodes).
    for (ax, ay) in agents:
        d.line([(cx, cy), (ax, ay)], fill=LINE_BLUE, width=line_w)

    # Draw agent nodes.
    for (ax, ay) in agents:
        draw_node(d, ax, ay, agent_r, NODE_WHITE)

    # Draw orchestrator (larger, white) + inner accent dot.
    draw_node(d, cx, cy, orch_r, NODE_WHITE)
    draw_node(d, cx, cy, orch_r * 0.42, ACCENT)
    return layer


def glyph_mesh(work: int) -> Image.Image:
    """Mesh Network — 6 nodes in a hexagon, each connected to its 2 neighbors
    AND across the hex (forming the inner star). Top node is accent-colored
    to imply the orchestrator. Reads as: peer agent collaboration."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = work / 2, work / 2

    n_nodes = 6
    hex_r = work * 0.30
    node_r = work * 0.075
    line_w = max(1, int(work * 0.014))

    nodes = []
    for i in range(n_nodes):
        angle = math.radians(-90 + i * (360 / n_nodes))
        nx = cx + hex_r * math.cos(angle)
        ny = cy + hex_r * math.sin(angle)
        nodes.append((nx, ny))

    # Cross-connections (skip-1: connect each node to the 2 nodes across via
    # one-step skip). This produces the 6-pointed star pattern inside the hex.
    for i in range(n_nodes):
        target = (i + 2) % n_nodes
        d.line([nodes[i], nodes[target]], fill=LINE_FAINT, width=line_w)

    # Outer hex perimeter (each node to next).
    for i in range(n_nodes):
        target = (i + 1) % n_nodes
        d.line([nodes[i], nodes[target]], fill=LINE_BLUE, width=line_w)

    # Nodes — peer agents white, top node accent (orchestrator).
    for i, (nx, ny) in enumerate(nodes):
        color = ACCENT if i == 0 else NODE_WHITE
        draw_node(d, nx, ny, node_r, color)

    return layer


def glyph_dag(work: int) -> Image.Image:
    """DAG / Directional Pipeline — single input → orchestrator → branches
    into 3 parallel agents → converges to single output. Reads as: agentic
    pipeline with parallelism."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = work / 2, work / 2

    node_r = work * 0.062
    line_w = max(1, int(work * 0.016))

    # 5 nodes total: input (top), orchestrator (just below), 3 agents
    # (mid-row), output (bottom).
    y_input = cy - work * 0.32
    y_orch = cy - work * 0.10
    y_agents = cy + work * 0.10
    y_output = cy + work * 0.32

    input_node = (cx, y_input)
    orch_node = (cx, y_orch)
    agent_nodes = [
        (cx - work * 0.20, y_agents),
        (cx,               y_agents),
        (cx + work * 0.20, y_agents),
    ]
    output_node = (cx, y_output)

    # Connections.
    d.line([input_node, orch_node], fill=LINE_BLUE, width=line_w)
    for an in agent_nodes:
        d.line([orch_node, an], fill=LINE_BLUE, width=line_w)
        d.line([an, output_node], fill=LINE_BLUE, width=line_w)

    # Nodes.
    draw_node(d, *input_node, node_r * 0.85, NODE_WHITE)
    draw_node(d, *orch_node, node_r * 1.15, ACCENT)
    for an in agent_nodes:
        draw_node(d, *an, node_r, NODE_WHITE)
    draw_node(d, *output_node, node_r * 0.85, NODE_WHITE)
    return layer


def glyph_orbital(work: int) -> Image.Image:
    """Orbital Orchestration — central orchestrator + 2 concentric tiers of
    agents. Inner tier: 3 strategic agents. Outer tier: 6 specialist agents.
    Reads as: tiered agent hierarchy with the orchestrator at the core."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = work / 2, work / 2

    inner_r = work * 0.20
    outer_r = work * 0.36
    line_w = max(1, int(work * 0.012))
    orch_r = work * 0.085
    inner_node_r = work * 0.060
    outer_node_r = work * 0.038

    # Inner tier nodes (3).
    inner = []
    for i in range(3):
        a = math.radians(-90 + i * 120)
        inner.append((cx + inner_r * math.cos(a), cy + inner_r * math.sin(a)))

    # Outer tier nodes (6) — offset 30° so they sit between inner tier nodes.
    outer = []
    for i in range(6):
        a = math.radians(-90 + 30 + i * 60)
        outer.append((cx + outer_r * math.cos(a), cy + outer_r * math.sin(a)))

    # Faint orbit ring (inner).
    d.ellipse(
        (cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r),
        outline=LINE_FAINT, width=max(1, int(work * 0.006)),
    )
    # Faint orbit ring (outer).
    d.ellipse(
        (cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r),
        outline=LINE_FAINT, width=max(1, int(work * 0.006)),
    )

    # Spokes from orchestrator to inner tier.
    for p in inner:
        d.line([(cx, cy), p], fill=LINE_BLUE, width=line_w)

    # Spokes from each inner node to its 2 nearest outer nodes.
    for i, ip in enumerate(inner):
        # Nearest outer node indices: 2*i and 2*i + 1 (rough mapping).
        for j in (2 * i, 2 * i + 1):
            d.line([ip, outer[j % 6]], fill=LINE_FAINT, width=line_w)

    # Outer agent nodes.
    for p in outer:
        draw_node(d, *p, outer_node_r, NODE_WHITE)
    # Inner strategic agents.
    for p in inner:
        draw_node(d, *p, inner_node_r, ACCENT_LIGHT)
    # Orchestrator (center).
    draw_node(d, cx, cy, orch_r, NODE_WHITE)
    draw_node(d, cx, cy, orch_r * 0.42, ACCENT_DEEP)
    return layer


def glyph_agentic_t_network(work: int) -> Image.Image:
    """Agentic-T Network — dense version with side tools, cross-links between
    crossbar agents, accent halo on orchestrator, and flow-token dots along
    the connection lines. Multiple visual tiers:
      - Tier 1 (focal):    orchestrator with accent halo + accent core
      - Tier 2 (primary):  4 peer agents on the crossbar
      - Tier 3 (stages):   5 pipeline stages descending the stem
      - Tier 4 (tools):    4 side-tool dots offset from the stem
      - Tier 5 (tokens):   small accent dots scattered along the lines
                           (implied data flow)"""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    line_w = max(1, int(work * 0.012))
    thin_w = max(1, int(work * 0.008))

    # --- Crossbar -------------------------------------------------------------
    y_cb = work * 0.26
    xs = [work * 0.14, work * 0.30, work * 0.50, work * 0.70, work * 0.86]

    # Linear crossbar connections.
    for i in range(len(xs) - 1):
        d.line([(xs[i], y_cb), (xs[i + 1], y_cb)], fill=LINE_BLUE, width=line_w)
    # Two arched cross-links from outermost agents to the orchestrator
    # (rendered as faint arcs above the crossbar).
    arc_r = work * 0.20
    for (px, py), (qx, qy) in [
        ((xs[0], y_cb), (xs[2], y_cb)),
        ((xs[4], y_cb), (xs[2], y_cb)),
    ]:
        midx = (px + qx) / 2
        midy = y_cb - arc_r * 0.5
        # Approximate the arc with a quadratic Bezier sampled to a polyline.
        pts = []
        for t in [k / 24 for k in range(25)]:
            x = (1 - t) ** 2 * px + 2 * (1 - t) * t * midx + t ** 2 * qx
            y = (1 - t) ** 2 * py + 2 * (1 - t) * t * midy + t ** 2 * qy
            pts.append((x, y))
        d.line(pts, fill=LINE_FAINT, width=thin_w)

    # --- Stem -----------------------------------------------------------------
    cx = xs[2]
    stem_ys = [work * 0.40, work * 0.52, work * 0.64, work * 0.76]
    out_y = work * 0.86

    # Vertical stem.
    prev = (cx, y_cb)
    for sy in stem_ys + [out_y]:
        d.line([prev, (cx, sy)], fill=LINE_BLUE, width=line_w)
        prev = (cx, sy)

    # Side tool branches at stem stages 1 and 3 (left + right offset).
    tool_offset = work * 0.16
    tool_pairs = [
        (stem_ys[0], tool_offset),
        (stem_ys[2], tool_offset),
    ]
    tool_positions = []
    for (sy, off) in tool_pairs:
        tl_x, tl_y = cx - off, sy - work * 0.045
        tr_x, tr_y = cx + off, sy - work * 0.045
        d.line([(cx, sy), (tl_x, tl_y)], fill=LINE_FAINT, width=thin_w)
        d.line([(cx, sy), (tr_x, tr_y)], fill=LINE_FAINT, width=thin_w)
        tool_positions.extend([(tl_x, tl_y), (tr_x, tr_y)])

    # --- Nodes ---------------------------------------------------------------
    agent_r = work * 0.058
    orch_r = work * 0.110
    stage_r = work * 0.050
    tool_r = work * 0.026
    out_r = work * 0.062
    token_r = work * 0.014

    # Tools first (behind), then everything else on top.
    for tp in tool_positions:
        draw_node(d, *tp, tool_r, ACCENT_LIGHT)

    # Crossbar agents.
    for x in (xs[0], xs[1], xs[3], xs[4]):
        draw_node(d, x, y_cb, agent_r, NODE_WHITE)

    # Stem stages (progressive saturation).
    stage_colors = [NODE_WHITE, ACCENT_LIGHT, ACCENT, ACCENT_DEEP]
    for sy, col in zip(stem_ys, stage_colors):
        draw_node(d, cx, sy, stage_r, col)

    # Output node.
    draw_node(d, cx, out_y, out_r, ACCENT_DEEP)
    draw_node(d, cx, out_y, out_r * 0.42, ACCENT_LIGHT)

    # Orchestrator (largest, last so it's on top of the cross-arc endpoints).
    # Outer halo (faint ring).
    halo_r = orch_r * 1.45
    d.ellipse(
        (cx - halo_r, y_cb - halo_r, cx + halo_r, y_cb + halo_r),
        outline=LINE_FAINT, width=max(1, int(work * 0.008)),
    )
    draw_node(d, cx, y_cb, orch_r, NODE_WHITE)
    draw_node(d, cx, y_cb, orch_r * 0.48, ACCENT)

    # Flow tokens — small accent dots along the stem.
    token_ys = [
        (y_cb + stem_ys[0]) / 2,
        (stem_ys[0] + stem_ys[1]) / 2,
        (stem_ys[1] + stem_ys[2]) / 2,
        (stem_ys[2] + stem_ys[3]) / 2,
        (stem_ys[3] + out_y) / 2,
    ]
    for ty in token_ys:
        draw_node(d, cx, ty, token_r, ACCENT_LIGHT)

    return layer


def glyph_agentic_t_constellation(work: int) -> Image.Image:
    """Agentic-T Constellation — denser graph: 7 crossbar nodes with full
    peer-to-peer connections (every node sees every other within a 2-skip
    radius), 6-node stem with side micro-clusters. Reads as: a constellation
    of agents organized in T-form, fully connected."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    line_w = max(1, int(work * 0.010))
    thin_w = max(1, int(work * 0.007))

    # --- Crossbar with 7 nodes ------------------------------------------------
    y_cb = work * 0.25
    cb_xs = [work * (0.12 + i * 0.127) for i in range(7)]
    cx = cb_xs[3]

    # Full peer-to-peer up to skip-2 (each node connects to next 2 neighbors).
    for i, x1 in enumerate(cb_xs):
        for k in (1, 2):
            j = i + k
            if j >= len(cb_xs):
                continue
            color = LINE_BLUE if k == 1 else LINE_FAINT
            w = line_w if k == 1 else thin_w
            d.line([(x1, y_cb), (cb_xs[j], y_cb)], fill=color, width=w)

    # --- Stem with 5 main nodes + 4 side micro-cluster nodes ------------------
    stem_ys = [work * 0.40, work * 0.52, work * 0.64, work * 0.76]
    out_y = work * 0.87

    # Main vertical line.
    prev = (cx, y_cb)
    for sy in stem_ys + [out_y]:
        d.line([prev, (cx, sy)], fill=LINE_BLUE, width=line_w)
        prev = (cx, sy)

    # Side micro-clusters: at each of stem_ys[1] and stem_ys[2], two small
    # nodes branch off + connect to each other.
    cluster_positions = []
    cluster_offset = work * 0.14
    for sy in (stem_ys[1], stem_ys[2]):
        lx, ly = cx - cluster_offset, sy
        rx, ry = cx + cluster_offset, sy
        # Branches.
        d.line([(cx, sy), (lx, ly)], fill=LINE_FAINT, width=thin_w)
        d.line([(cx, sy), (rx, ry)], fill=LINE_FAINT, width=thin_w)
        # Side-to-side faint connection (peer link).
        d.line([(lx, ly), (rx, ry)], fill=LINE_FAINT, width=thin_w)
        cluster_positions.extend([(lx, ly), (rx, ry)])

    # --- Render nodes ---------------------------------------------------------
    cluster_r = work * 0.025
    agent_r = work * 0.046
    orch_r = work * 0.090
    stage_r = work * 0.045
    out_r = work * 0.058

    # Micro-cluster nodes.
    for cp in cluster_positions:
        draw_node(d, *cp, cluster_r, ACCENT_LIGHT)

    # Crossbar peer agents.
    for i, x in enumerate(cb_xs):
        if i == 3:
            continue  # orchestrator drawn last
        draw_node(d, x, y_cb, agent_r, NODE_WHITE)

    # Stem stages.
    colors = [NODE_WHITE, ACCENT_LIGHT, ACCENT, ACCENT_DEEP]
    for sy, col in zip(stem_ys, colors):
        draw_node(d, cx, sy, stage_r, col)
    draw_node(d, cx, out_y, out_r, ACCENT_DEEP)
    draw_node(d, cx, out_y, out_r * 0.42, ACCENT_LIGHT)

    # Orchestrator (halo + core).
    halo_r = orch_r * 1.55
    d.ellipse(
        (cx - halo_r, y_cb - halo_r, cx + halo_r, y_cb + halo_r),
        outline=LINE_FAINT, width=max(1, int(work * 0.007)),
    )
    draw_node(d, cx, y_cb, orch_r, NODE_WHITE)
    draw_node(d, cx, y_cb, orch_r * 0.48, ACCENT)

    return layer


def glyph_agentic_t_federation(work: int) -> Image.Image:
    """Agentic-T Federation — each 'position' in the T is a micro-cluster of
    3 nodes (a sub-team of agents), not a single node. The whole T is a
    federation of agent teams. Most dense + most narrative."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    line_w = max(1, int(work * 0.010))
    thin_w = max(1, int(work * 0.006))

    cluster_positions = [
        ("agent", work * 0.16, work * 0.27),   # left agent team
        ("orch",  work * 0.50, work * 0.25),   # orchestrator team (slightly higher)
        ("agent", work * 0.84, work * 0.27),   # right agent team
        ("stage", work * 0.50, work * 0.46),   # stage 1
        ("stage", work * 0.50, work * 0.62),   # stage 2
        ("output", work * 0.50, work * 0.81),  # output cluster
    ]

    cluster_r = work * 0.062   # mini-cluster outer radius
    node_r = work * 0.020      # individual node inside cluster

    def draw_cluster(cx_: float, cy_: float, kind: str) -> None:
        # 3 nodes in a triangle around (cx, cy).
        offsets = [(0, -cluster_r * 0.55), (-cluster_r * 0.48, cluster_r * 0.30),
                   (cluster_r * 0.48, cluster_r * 0.30)]
        # Internal connections inside the cluster.
        positions = [(cx_ + ox, cy_ + oy) for ox, oy in offsets]
        for i in range(3):
            d.line([positions[i], positions[(i + 1) % 3]],
                   fill=LINE_FAINT, width=thin_w)

        if kind == "orch":
            for p in positions:
                draw_node(d, *p, node_r * 1.15, ACCENT_LIGHT)
            # Orchestrator center dot.
            draw_node(d, cx_, cy_, node_r * 0.95, ACCENT)
        elif kind == "agent":
            for p in positions:
                draw_node(d, *p, node_r, NODE_WHITE)
        elif kind == "stage":
            colors = [NODE_WHITE, ACCENT_LIGHT, ACCENT]
            for p, col in zip(positions, colors):
                draw_node(d, *p, node_r, col)
        elif kind == "output":
            for p in positions:
                draw_node(d, *p, node_r * 1.1, ACCENT_DEEP)
            draw_node(d, cx_, cy_, node_r * 0.8, ACCENT_LIGHT)

    # Inter-cluster connections (the T's skeleton).
    orch_pos = (cluster_positions[1][1], cluster_positions[1][2])
    # Crossbar links: left → orch, orch → right.
    d.line([(cluster_positions[0][1], cluster_positions[0][2]), orch_pos],
           fill=LINE_BLUE, width=line_w)
    d.line([(cluster_positions[2][1], cluster_positions[2][2]), orch_pos],
           fill=LINE_BLUE, width=line_w)
    # Stem links.
    prev = orch_pos
    for kind, cx_, cy_ in cluster_positions[3:]:
        d.line([prev, (cx_, cy_)], fill=LINE_BLUE, width=line_w)
        prev = (cx_, cy_)

    # Now render each cluster's internal trio.
    for kind, cx_, cy_ in cluster_positions:
        draw_cluster(cx_, cy_, kind)

    return layer


def glyph_agentic_t_sparse(work: int) -> Image.Image:
    """Agentic-T (sparse) — T constructed entirely from agent-workflow graph
    primitives. 3 nodes across the top form the crossbar (the 3 service
    practices: LLM Ops / RAG / Agents). Center node is the orchestrator
    (accent inner dot). 3 nodes down the stem are pipeline stages, ending
    in an accent-blue output. Reads simultaneously as: letter T + agent
    DAG + production pipeline."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    line_w = max(1, int(work * 0.018))
    agent_r = work * 0.067
    orch_r = work * 0.105
    stage_r = work * 0.060

    # Crossbar: 3 nodes at y = 0.30, x = 0.18 / 0.50 / 0.82
    y_cb = work * 0.30
    left_x, center_x, right_x = work * 0.18, work * 0.50, work * 0.82

    # Stem: 3 nodes below the orchestrator at y = 0.50 / 0.66 / 0.82
    y_s1, y_s2, y_out = work * 0.50, work * 0.66, work * 0.82

    # Connections — crossbar (horizontal).
    d.line([(left_x, y_cb), (center_x, y_cb)], fill=LINE_BLUE, width=line_w)
    d.line([(center_x, y_cb), (right_x, y_cb)], fill=LINE_BLUE, width=line_w)
    # Stem (vertical).
    d.line([(center_x, y_cb), (center_x, y_s1)], fill=LINE_BLUE, width=line_w)
    d.line([(center_x, y_s1), (center_x, y_s2)], fill=LINE_BLUE, width=line_w)
    d.line([(center_x, y_s2), (center_x, y_out)], fill=LINE_BLUE, width=line_w)

    # Crossbar nodes — agents in white.
    draw_node(d, left_x, y_cb, agent_r, NODE_WHITE)
    draw_node(d, right_x, y_cb, agent_r, NODE_WHITE)
    # Orchestrator at the T-junction.
    draw_node(d, center_x, y_cb, orch_r, NODE_WHITE)
    draw_node(d, center_x, y_cb, orch_r * 0.42, ACCENT)

    # Stem nodes — pipeline stages, progressively saturated.
    draw_node(d, center_x, y_s1, stage_r, NODE_WHITE)
    draw_node(d, center_x, y_s2, stage_r, ACCENT_LIGHT)
    draw_node(d, center_x, y_out, stage_r * 1.05, ACCENT)
    return layer


def glyph_agentic_t_branched(work: int) -> Image.Image:
    """Agentic-T (branched) — same T identity, but the stem fans out at the
    bottom into 3 parallel agent paths that re-converge into a single output
    node. The fan-out reads as parallel agent execution; the convergence is
    eval/aggregation."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    line_w = max(1, int(work * 0.016))
    agent_r = work * 0.060
    orch_r = work * 0.094
    leaf_r = work * 0.045
    out_r = work * 0.060

    y_cb = work * 0.28
    left_x, center_x, right_x = work * 0.20, work * 0.50, work * 0.80

    y_mid = work * 0.50      # mid-stem junction
    y_leaves = work * 0.66   # 3 parallel leaves
    y_out = work * 0.82

    leaf_xs = [work * 0.30, work * 0.50, work * 0.70]

    # Crossbar lines.
    d.line([(left_x, y_cb), (center_x, y_cb)], fill=LINE_BLUE, width=line_w)
    d.line([(center_x, y_cb), (right_x, y_cb)], fill=LINE_BLUE, width=line_w)
    # Stem to mid-junction.
    d.line([(center_x, y_cb), (center_x, y_mid)], fill=LINE_BLUE, width=line_w)
    # Branches from mid-junction to leaves.
    for lx in leaf_xs:
        d.line([(center_x, y_mid), (lx, y_leaves)], fill=LINE_BLUE, width=line_w)
        # Leaf to output (converge).
        d.line([(lx, y_leaves), (center_x, y_out)], fill=LINE_FAINT, width=line_w)

    # Crossbar agents.
    draw_node(d, left_x, y_cb, agent_r, NODE_WHITE)
    draw_node(d, right_x, y_cb, agent_r, NODE_WHITE)
    # Orchestrator.
    draw_node(d, center_x, y_cb, orch_r, NODE_WHITE)
    draw_node(d, center_x, y_cb, orch_r * 0.42, ACCENT)
    # Mid-junction.
    draw_node(d, center_x, y_mid, agent_r * 0.85, NODE_WHITE)
    # Leaves (parallel agents).
    for lx in leaf_xs:
        draw_node(d, lx, y_leaves, leaf_r, ACCENT_LIGHT)
    # Output node.
    draw_node(d, center_x, y_out, out_r, ACCENT)
    return layer


def glyph_agentic_t_dense(work: int) -> Image.Image:
    """Agentic-T (dense) — 5-node crossbar (3 agents + 2 inter-link tools)
    and 4-node stem (orchestrator + 2 stages + output). The richest, most
    'agent system' reading; trades icon clarity at favicon scale for depth
    of metaphor."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    line_w = max(1, int(work * 0.015))
    agent_r = work * 0.060
    tool_r = work * 0.035
    orch_r = work * 0.095
    stage_r = work * 0.055

    # Crossbar at y = 0.28 with 5 evenly-spaced nodes.
    y_cb = work * 0.28
    xs = [work * 0.16, work * 0.32, work * 0.50, work * 0.68, work * 0.84]

    # Crossbar lines.
    for i in range(len(xs) - 1):
        d.line([(xs[i], y_cb), (xs[i + 1], y_cb)], fill=LINE_BLUE, width=line_w)

    # Stem positions.
    cx = xs[2]
    ys = [work * 0.45, work * 0.60, work * 0.75]
    out_y = work * 0.86

    # Stem lines.
    d.line([(cx, y_cb), (cx, ys[0])], fill=LINE_BLUE, width=line_w)
    for i in range(len(ys) - 1):
        d.line([(cx, ys[i]), (cx, ys[i + 1])], fill=LINE_BLUE, width=line_w)
    d.line([(cx, ys[-1]), (cx, out_y)], fill=LINE_BLUE, width=line_w)

    # Crossbar nodes — agents (positions 0, 2, 4) and inter-link tools (1, 3).
    draw_node(d, xs[0], y_cb, agent_r, NODE_WHITE)
    draw_node(d, xs[1], y_cb, tool_r, ACCENT_LIGHT)
    draw_node(d, xs[2], y_cb, orch_r, NODE_WHITE)
    draw_node(d, xs[2], y_cb, orch_r * 0.42, ACCENT)
    draw_node(d, xs[3], y_cb, tool_r, ACCENT_LIGHT)
    draw_node(d, xs[4], y_cb, agent_r, NODE_WHITE)

    # Stem nodes — pipeline stages, progressively saturated.
    draw_node(d, cx, ys[0], stage_r, NODE_WHITE)
    draw_node(d, cx, ys[1], stage_r, ACCENT_LIGHT)
    draw_node(d, cx, ys[2], stage_r, ACCENT)
    draw_node(d, cx, out_y, stage_r * 1.05, ACCENT_DEEP)
    return layer


def _draw_solid_t(d: ImageDraw.ImageDraw, work: int, cb_w_frac: float = 0.60,
                   cb_h_frac: float = 0.105, stem_w_frac: float = 0.175,
                   stem_h_frac: float = 0.52, top_m_frac: float = 0.20,
                   fill = FG_WHITE) -> Tuple[float, float, float, float, float, float]:
    """Draw a sculptural T centered horizontally. Returns the geometry
    (cb_x0, cb_y0, cb_x1, stem_x0, stem_y0, stem_y1) so callers can place
    decorations relative to it."""
    cb_w = work * cb_w_frac
    cb_h = work * cb_h_frac
    stem_w = work * stem_w_frac
    stem_h = work * stem_h_frac
    top_m = work * top_m_frac
    cb_x0 = (work - cb_w) / 2
    cb_y0 = top_m
    cb_x1 = cb_x0 + cb_w
    cb_y1 = cb_y0 + cb_h
    stem_x0 = (work - stem_w) / 2
    stem_y0 = cb_y1
    stem_y1 = stem_y0 + stem_h
    stem_x1 = stem_x0 + stem_w
    d.rectangle((cb_x0, cb_y0, cb_x1, cb_y1), fill=fill)
    d.rectangle((stem_x0, stem_y0, stem_x1, stem_y1), fill=fill)
    return cb_x0, cb_y0, cb_x1, stem_x0, stem_y0, stem_y1


def glyph_t_haloed(work: int) -> Image.Image:
    """T-Haloed — solid sculptural T at the center, surrounded by 6 small
    agent nodes orbiting around the crossbar (haloing it). Faint accent arcs
    connect the agents to the orchestrator T. Reads: bold T identity +
    'agents orbit the brand' signaling."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # Faint orbit ring (sits behind everything else).
    halo_cx, halo_cy = work / 2, work * 0.28
    halo_rx, halo_ry = work * 0.42, work * 0.16
    d.ellipse(
        (halo_cx - halo_rx, halo_cy - halo_ry, halo_cx + halo_rx, halo_cy + halo_ry),
        outline=LINE_FAINT, width=max(1, int(work * 0.005)),
    )

    # Agent nodes around the halo. Position them at evenly-spaced angles,
    # skipping the very top/very bottom since the T occupies those slots.
    agent_r = work * 0.035
    big_agent_r = work * 0.048
    agent_angles = [-160, -110, -70, -20, 200, 250]  # degrees from positive x-axis
    agent_positions = []
    for a in agent_angles:
        rad = math.radians(a)
        ax = halo_cx + halo_rx * math.cos(rad)
        ay = halo_cy + halo_ry * math.sin(rad)
        agent_positions.append((ax, ay))

    # Draw faint arc spokes from each agent toward the orchestrator (T's center).
    orch_anchor = (work / 2, work * 0.30)
    for (ax, ay) in agent_positions:
        d.line([(ax, ay), orch_anchor], fill=LINE_FAINT, width=max(1, int(work * 0.005)))

    # The T (drawn on top of orbit + spokes so it sits in front).
    _draw_solid_t(d, work)

    # Agent nodes (after T so they appear in front of any overlap).
    for i, (ax, ay) in enumerate(agent_positions):
        r = big_agent_r if i in (0, 3) else agent_r  # accent the outer ones slightly
        color = ACCENT_LIGHT if i in (0, 3) else NODE_WHITE
        draw_node(d, ax, ay, r, color)

    # Subtle accent dot riding the orbit at the top-right (the "active satellite").
    a = math.radians(-35)
    sx = halo_cx + halo_rx * math.cos(a)
    sy = halo_cy + halo_ry * math.sin(a)
    draw_node(d, sx, sy, agent_r * 1.2, ACCENT)
    return layer


def glyph_t_circuit(work: int) -> Image.Image:
    """T-Circuit — solid bold T with a fine circuit-trace network running
    across its surface. Small accent nodes mark trace junctions. Reads:
    'the brand T is a chip; agents are routed through it.'"""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))

    # Draw the T solid on a layer first.
    t_layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    td = ImageDraw.Draw(t_layer)
    geom = _draw_solid_t(td, work)
    cb_x0, cb_y0, cb_x1, stem_x0, stem_y0, stem_y1 = geom
    cb_y1 = cb_y0 + work * 0.105

    # Create a mask of the T silhouette for clipping the traces inside it.
    t_mask = Image.new("L", (work, work), 0)
    md = ImageDraw.Draw(t_mask)
    md.rectangle((cb_x0, cb_y0, cb_x1, cb_y1), fill=255)
    md.rectangle((stem_x0, cb_y1, stem_x0 + (work * 0.175), stem_y1), fill=255)

    # Compose the traces on a separate layer, then clip to the T silhouette.
    traces = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    trd = ImageDraw.Draw(traces)
    trace_w = max(1, int(work * 0.008))
    junction_r = work * 0.018
    accent_r = work * 0.022

    cx = work / 2
    cb_mid_y = (cb_y0 + cb_y1) / 2
    # Crossbar horizontal trace.
    trd.line([(cb_x0 + work * 0.04, cb_mid_y), (cb_x1 - work * 0.04, cb_mid_y)],
             fill=LINE_BLUE, width=trace_w)
    # Crossbar junctions at 4 positions.
    cb_junctions = [cb_x0 + work * 0.04, cb_x0 + work * 0.18, cb_x1 - work * 0.18,
                    cb_x1 - work * 0.04]
    # Crossbar drop-traces toward the stem.
    for jx in (cb_x0 + work * 0.18, cb_x1 - work * 0.18):
        trd.line([(jx, cb_mid_y), (cx, cb_y1 + work * 0.02)],
                 fill=LINE_FAINT, width=trace_w)
    # Stem vertical trace down the center.
    trd.line([(cx, cb_mid_y), (cx, stem_y1 - work * 0.025)],
             fill=LINE_BLUE, width=trace_w)
    # Stem side-tap junctions (small horizontal stubs).
    stub = work * 0.045
    stub_ys = [stem_y0 + work * 0.07, stem_y0 + work * 0.20, stem_y0 + work * 0.33]
    for sy in stub_ys:
        trd.line([(cx - stub, sy), (cx + stub, sy)], fill=LINE_FAINT, width=trace_w)

    # Trace junctions (small accent nodes at the key points).
    for jx in cb_junctions:
        ImageDraw.Draw(traces).ellipse(
            (jx - junction_r, cb_mid_y - junction_r,
             jx + junction_r, cb_mid_y + junction_r), fill=ACCENT)
    for sy in stub_ys:
        ImageDraw.Draw(traces).ellipse(
            (cx - junction_r, sy - junction_r, cx + junction_r, sy + junction_r),
            fill=ACCENT_LIGHT)
    # Stem terminal node (output).
    out_y = stem_y1 - work * 0.025
    ImageDraw.Draw(traces).ellipse(
        (cx - accent_r, out_y - accent_r, cx + accent_r, out_y + accent_r),
        fill=ACCENT_DEEP)

    # Clip traces to the T silhouette.
    clipped = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    clipped.paste(traces, (0, 0), t_mask)

    # Composite: T first, then clipped traces on top.
    layer = Image.alpha_composite(layer, t_layer)
    layer = Image.alpha_composite(layer, clipped)
    return layer


def glyph_t_stem_pipeline(work: int) -> Image.Image:
    """T-Stem-Pipeline — solid sculptural T at top (crossbar), with the stem
    rebuilt as a visible vertical pipeline of distinct agent stages: 4
    pipeline-stage blocks descending the stem with thin accent connectors
    between them, ending at an output node. Single accent halo on the
    crossbar suggests the orchestrator hovering above the pipeline."""
    layer = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # Crossbar only (no solid stem — we replace it with the pipeline).
    cb_w = work * 0.62
    cb_h = work * 0.105
    top_m = work * 0.20
    cb_x0 = (work - cb_w) / 2
    cb_y0 = top_m
    cb_x1 = cb_x0 + cb_w
    cb_y1 = cb_y0 + cb_h
    d.rectangle((cb_x0, cb_y0, cb_x1, cb_y1), fill=FG_WHITE)

    # Accent halo above the crossbar (small horizontal lozenge — "orchestrator
    # presence").
    cx = work / 2
    halo_w = work * 0.22
    halo_h = work * 0.018
    d.rounded_rectangle(
        (cx - halo_w / 2, cb_y0 - work * 0.04 - halo_h,
         cx + halo_w / 2, cb_y0 - work * 0.04),
        radius=int(work * 0.009), fill=ACCENT,
    )

    # Pipeline: 4 stages + output, descending below the crossbar.
    stage_w = work * 0.175
    stage_h = work * 0.082
    gap = work * 0.020
    stage_x0 = cx - stage_w / 2
    stage_y = cb_y1 + work * 0.018
    radius = int(work * 0.014)
    colors = [
        FG_WHITE,
        (220, 234, 254, 245),
        (170, 205, 250, 250),
        (109, 169, 255, 255),
    ]
    connector_w = max(1, int(work * 0.014))
    for i, col in enumerate(colors):
        # Stage block.
        y0 = stage_y + i * (stage_h + gap)
        y1 = y0 + stage_h
        d.rounded_rectangle((stage_x0, y0, stage_x0 + stage_w, y1),
                            radius=radius, fill=col)
        # Tiny inner accent dot in each stage.
        dot_r = work * 0.010
        d.ellipse(
            (cx - dot_r, y0 + stage_h / 2 - dot_r,
             cx + dot_r, y0 + stage_h / 2 + dot_r),
            fill=ACCENT if i < 3 else NODE_WHITE,
        )
        # Connector to next stage.
        if i < len(colors) - 1:
            next_y0 = y0 + stage_h
            d.line([(cx, next_y0), (cx, next_y0 + gap)],
                   fill=LINE_BLUE, width=connector_w)

    # Output node — a single small accent-deep blue circle below the last stage.
    last_y1 = stage_y + len(colors) * (stage_h + gap) - gap
    out_y = last_y1 + work * 0.028
    out_r = work * 0.038
    d.line([(cx, last_y1), (cx, out_y)], fill=LINE_BLUE, width=connector_w)
    draw_node(d, cx, out_y, out_r, ACCENT_DEEP)
    draw_node(d, cx, out_y, out_r * 0.42, ACCENT_LIGHT)
    return layer


VARIANTS: dict[str, Tuple[str, Callable[[int], Image.Image]]] = {
    "t-haloed": (
        "T-Haloed — solid sculptural T with 6 agent nodes orbiting around "
        "the crossbar on a faint elliptical ring, plus a 'satellite' accent "
        "dot riding the orbit. T identity leads; agents halo around it.",
        glyph_t_haloed,
    ),
    "t-circuit": (
        "T-Circuit — solid bold T treated as a silicon chip die. Fine "
        "accent-blue traces run across its surface (crossbar bus + stem "
        "vertical + side-tap stubs), with junction nodes at each tap and "
        "an output node at the foot.",
        glyph_t_circuit,
    ),
    "t-stem-pipeline": (
        "T-Stem-Pipeline — solid crossbar above, then the stem replaced by "
        "a visible 4-stage pipeline block stack (progressive saturation), "
        "connected with accent stubs, terminating at an output node. Small "
        "accent halo above the crossbar = orchestrator presence.",
        glyph_t_stem_pipeline,
    ),
}


def make_icon(size: int, glyph_fn: Callable[[int], Image.Image]) -> Image.Image:
    work = size * 4

    # Background squircle.
    bg = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    grad = gradient_image(work, work).convert("RGBA")
    mask = Image.new("L", (work, work), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, work - 1, work - 1),
        radius=int(work * SQUIRCLE_RADIUS), fill=255,
    )
    bg.paste(grad, (0, 0), mask)

    # Radial highlight clipped to squircle.
    hi = radial_highlight(work)
    clipped = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    clipped.paste(hi, (0, 0), mask)
    bg = Image.alpha_composite(bg, clipped)

    # Glyph layer.
    glyph = glyph_fn(work)

    composed = Image.alpha_composite(bg, glyph)
    return composed.resize((size, size), Image.LANCZOS)


def render_preview_html() -> None:
    cards = []
    for key, (desc, _) in VARIANTS.items():
        cards.append(f"""
    <div class="card">
      <div class="hero"><img src="explore/{key}/logo-512.png"></div>
      <div class="sizes">
        <div class="tile"><img src="explore/{key}/logo-128.png"><span>128</span></div>
        <div class="tile"><img src="explore/{key}/logo-64.png"><span>64</span></div>
        <div class="tile"><img src="explore/{key}/logo-32.png"><span>32</span></div>
        <div class="tile"><img src="explore/{key}/logo-16.png"><span>16</span></div>
      </div>
      <div class="label"><strong>{key}</strong> — {desc}</div>
    </div>""")

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Techsider — Agent Workflow Marks</title>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family:-apple-system,BlinkMacSystemFont,sans-serif; padding:2.5rem; background:#0b1424; color:#f4f6fa; }}
  h1 {{ font-size:1.4rem; font-weight:600; margin-bottom:0.4rem; }}
  .sub {{ opacity:0.6; margin-bottom:2rem; font-size:0.9rem; max-width:80ch; line-height:1.5; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(380px,1fr)); gap:1.5rem; }}
  .card {{ background:#07101e; border:1px solid #1f2a40; border-radius:14px; padding:1.5rem; }}
  .hero {{ display:flex; justify-content:center; padding:1rem 0 1.5rem; }}
  .hero img {{ width:200px; height:200px; }}
  .sizes {{ display:flex; gap:1rem; align-items:end; justify-content:center; padding:1rem 0; border-top:1px solid #1f2a40; border-bottom:1px solid #1f2a40; }}
  .tile {{ display:flex; flex-direction:column; align-items:center; gap:0.3rem; }}
  .tile span {{ font-size:0.65rem; opacity:0.5; }}
  .label {{ font-size:0.82rem; line-height:1.5; opacity:0.85; padding-top:1rem; }}
  .label strong {{ color:#6da9ff; }}
</style></head>
<body>
<h1>Techsider — Agent Workflow Marks (T abandoned)</h1>
<p class="sub">Concept: visualize AI agent systems directly. Each variant is a different shape of agent collaboration. Generated via <code>scripts/explore_logo.py</code>.</p>
<div class="grid">{''.join(cards)}
</div>
</body></html>
"""
    PREVIEW_HTML.write_text(html)


def main() -> None:
    sizes = [16, 32, 64, 128, 512]
    for key, (_, fn) in VARIANTS.items():
        outdir = EXPLORE_DIR / key
        outdir.mkdir(parents=True, exist_ok=True)
        base = make_icon(1024, fn)
        for sz in sizes:
            path = outdir / f"logo-{sz}.png"
            base.resize((sz, sz), Image.LANCZOS).save(path)
        print(f"  {key}: rendered {len(sizes)} sizes")
    render_preview_html()
    print(f"  Wrote preview at {PREVIEW_HTML}")


if __name__ == "__main__":
    main()
