"""
patch_scatter_leaves.py
-----------------------
Replaces the corner decorations on scatter_frame.png with large, lush leaf
clusters inspired by the FOREST GANG logo banner style.

Run from the frames directory:
    python3 patch_scatter_leaves.py
"""

import io
import math
import os

import cairosvg
from PIL import Image

DIR = os.path.dirname(os.path.abspath(__file__))
FRAME_PATH = os.path.join(DIR, "scatter_frame.png")

# ── Leaf geometry constants ────────────────────────────────────────────────────
LEAF_LENGTH = 52       # px (tip-to-base)
LEAF_WIDTH  = 24       # px (max width)
GRAD_BRIGHT = "#6ab83e"
GRAD_DARK   = "#2d6614"
VEIN_COLOR  = "#1a4a0a"

# ── Corner base positions (cx, cy) and fan angles ──────────────────────────────
# Angles: 0° = tip points UP, 90° = tip points RIGHT, clockwise positive.
CORNERS = [
    # (base_cx, base_cy, angle_list, erase_radius)
    (22,  22,  [-60, -30, -10, 15, 40, 65],         36),   # top-left
    (196, 22,  [ 60,  30,  10, -15, -40, -65],       36),   # top-right
    (22,  419, [120, 150, 170, 195, 220, 245],        36),   # bottom-left
    (196, 419, [240, 210, 190, 165, 140, 115],        36),   # bottom-right
]


def leaf_svg_el(bx: float, by: float, length: float, width: float,
                angle_deg: float, uid: str) -> str:
    """
    Build an SVG <path> string for one leaf.

    Parameters
    ----------
    bx, by     : base (stem attachment) point in SVG canvas coords
    length     : tip-to-base distance in px
    width      : maximum width of the leaf
    angle_deg  : 0 = tip points UP, 90 = tip points RIGHT (clockwise)
    uid        : unique string used for gradient / clip IDs

    The leaf is drawn in local coords (base at origin, tip at (0, -length)),
    then rotated by angle_deg and translated to (bx, by).
    """
    # Cubic bezier control distances
    hw = width / 2.0
    cp1_y = -length * 0.25   # first control point height
    cp2_y = -length * 0.70   # second control point height
    tip_y = -length

    # Left edge: base → tip
    # Right edge: tip → base
    # Leaf is symmetric about the Y axis (in local space)
    path_d = (
        f"M 0,0 "
        f"C {-hw},{cp1_y}  {-hw * 0.95},{cp2_y}  0,{tip_y} "
        f"C {hw * 0.95},{cp2_y}  {hw},{cp1_y}  0,0 Z"
    )

    # Midrib vein: straight line from base to tip
    midrib = f"M 0,0 L 0,{tip_y}"

    # Lateral veins (5 pairs)
    n_veins = 5
    laterals = ""
    for i in range(1, n_veins + 1):
        t = i / (n_veins + 1)          # position along midrib 0→1
        vy = tip_y * t                  # y along midrib (negative)
        # vein spread shrinks toward tip
        spread = hw * (1 - t) * 0.85
        vlen   = spread * 0.9
        # slight upward curve at tips
        vend_y = vy - vlen * 0.25
        laterals += (
            f"M 0,{vy:.2f} C {-spread*0.4:.2f},{vy:.2f} {-spread*0.9:.2f},{vend_y:.2f} {-spread:.2f},{vend_y:.2f} "
            f"M 0,{vy:.2f} C {spread*0.4:.2f},{vy:.2f} {spread*0.9:.2f},{vend_y:.2f} {spread:.2f},{vend_y:.2f} "
        )

    # SVG transform: translate(bx,by) first to place the base, then rotate
    # around that base point so the leaf fans in the desired direction.
    # (SVG transforms are applied right-to-left, so writing
    #  translate(bx,by) rotate(angle_deg) means: rotate local coords,
    #  then translate to (bx,by).  The local origin (0,0) = base stays at
    #  (bx,by); the local tip (0,-length) gets rotated to point in
    #  angle_deg direction.)
    transform = f"translate({bx},{by}) rotate({angle_deg})"

    # Gradient along the leaf midrib (local y axis, base→tip)
    # In local space midrib runs from (0,0) to (0,tip_y).
    # gradientUnits="userSpaceOnUse" with gradientTransform matching the
    # group transform keeps the gradient aligned with each leaf.
    grad_id = f"lg_{uid}"
    svg_el = f"""
  <defs>
    <linearGradient id="{grad_id}" x1="0" y1="0" x2="0" y2="{tip_y}"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate({bx},{by}) rotate({angle_deg})">
      <stop offset="0%"   stop-color="{GRAD_BRIGHT}" stop-opacity="1"/>
      <stop offset="100%" stop-color="{GRAD_DARK}"   stop-opacity="1"/>
    </linearGradient>
  </defs>
  <g transform="{transform}">
    <path d="{path_d}" fill="url(#{grad_id})" stroke="{GRAD_DARK}" stroke-width="0.5" opacity="0.95"/>
    <path d="{midrib}" fill="none" stroke="{VEIN_COLOR}" stroke-width="0.8" opacity="0.8"/>
    <path d="{laterals}" fill="none" stroke="{VEIN_COLOR}" stroke-width="0.5" opacity="0.65"/>
  </g>"""
    return svg_el


def render_leaf_cluster(base_cx: float, base_cy: float, angles: list[float],
                         canvas_w: int, canvas_h: int) -> Image.Image:
    """
    Render all leaves for one corner cluster into a transparent RGBA image
    of size (canvas_w × canvas_h).
    """
    elements = []
    for i, angle in enumerate(angles):
        uid = f"c{int(base_cx)}_{int(base_cy)}_l{i}"
        # Stagger leaf lengths slightly for natural look
        length = LEAF_LENGTH + (i % 3) * 5
        width  = LEAF_WIDTH  + (i % 2) * 4
        elements.append(
            leaf_svg_el(base_cx, base_cy, length, width, angle, uid)
        )

    body = "\n".join(elements)
    svg_str = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{canvas_w}" height="{canvas_h}" '
        f'viewBox="0 0 {canvas_w} {canvas_h}">'
        f'{body}'
        f'</svg>'
    )

    png_bytes = cairosvg.svg2png(bytestring=svg_str.encode())
    return Image.open(io.BytesIO(png_bytes)).convert("RGBA")


def erase_corner(img: Image.Image, cx: int, cy: int, radius: int) -> None:
    """
    Blank out a square region around (cx, cy) to remove existing corner art.
    Operates in-place on the RGBA image.
    """
    import numpy as np
    arr = img.load()
    x0, x1 = max(0, cx - radius), min(img.width,  cx + radius)
    y0, y1 = max(0, cy - radius), min(img.height, cy + radius)
    for y in range(y0, y1):
        for x in range(x0, x1):
            arr[x, y] = (0, 0, 0, 0)


def main():
    # Load base frame
    frame = Image.open(FRAME_PATH).convert("RGBA")
    W, H = frame.size
    print(f"Loaded scatter_frame.png  {W}×{H}  mode={frame.mode}")

    # ── Erase existing corner decorations ────────────────────────────────────
    for cx, cy, angles, erase_r in CORNERS:
        erase_corner(frame, cx, cy, erase_r)
    print("Erased existing corner decorations")

    # ── Render and composite new leaf clusters ────────────────────────────────
    for corner_idx, (cx, cy, angles, _erase_r) in enumerate(CORNERS):
        cluster = render_leaf_cluster(cx, cy, angles, W, H)
        frame = Image.alpha_composite(frame, cluster)
        print(f"  Corner {corner_idx+1}/4 composited  base=({cx},{cy})")

    print(f"Final image size: {frame.size}")

    # ── Save outputs ──────────────────────────────────────────────────────────
    frame.save(FRAME_PATH)
    webp_path = os.path.join(DIR, "scatter_frame.webp")
    frame.save(webp_path, format="WEBP", quality=92)
    print(f"Saved: {FRAME_PATH}")
    print(f"Saved: {webp_path}")


if __name__ == "__main__":
    main()
