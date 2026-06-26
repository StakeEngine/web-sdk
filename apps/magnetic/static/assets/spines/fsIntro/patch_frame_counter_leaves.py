#!/usr/bin/env python3
"""
Patch Frame_FSCounter with compact leaf clusters at all 4 corners,
matching Image #10 style (wooden board with small natural corner leaves).
"""
import os, math, io
import cairosvg
from PIL import Image

BASE  = os.path.dirname(__file__)
ATLAS = os.path.join(BASE, 'fs_screen.png')
WEBP  = os.path.join(BASE, 'fs_screen.webp')
ORIG  = '/tmp/fs_screen_orig.png'   # clean git HEAD version

BX, BY, BW, BH = 692, 649, 788, 592

PALETTE = [
    ('#5ab828', '#1e5010'),
    ('#4aaa20', '#184008'),
    ('#68c838', '#246014'),
    ('#42a01c', '#163808'),
    ('#5eba30', '#1c4c0c'),
    ('#72d040', '#286018'),
]

def leaf_svg(canvas_w, canvas_h, leaf_defs):
    """leaf_defs = [(cx,cy,L,W,angle_deg,palette_idx), ...]"""
    grads, shapes = [], []
    for i, (cx, cy, L, W, ang, pi) in enumerate(leaf_defs):
        hw = W * 0.5
        bright, dark = PALETTE[pi % len(PALETTE)]
        gid = f'g{i}'
        # Broad oval leaf
        d = (f"M 0,0 "
             f"C {L*.12:.1f},{-hw*1.1:.1f} {L*.42:.1f},{-hw*1.28:.1f} {L*.70:.1f},{-hw*.92:.1f} "
             f"C {L*.88:.1f},{-hw*.38:.1f} {L*.88:.1f},{hw*.38:.1f} {L*.70:.1f},{hw*.92:.1f} "
             f"C {L*.42:.1f},{hw*1.28:.1f} {L*.12:.1f},{hw*1.1:.1f} 0,0 Z")
        vein = f"M 0,0 L {L*.80:.1f},0"
        for t in [.25,.42,.60]:
            vx=t*L
            vein += f" M {vx:.1f},0 L {vx+L*.12:.1f},{-hw*.45:.1f} M {vx:.1f},0 L {vx+L*.12:.1f},{hw*.45:.1f}"
        grads.append(
            f'<linearGradient id="{gid}" x1="0" y1="-1" x2="0" y2="1" gradientUnits="objectBoundingBox">'
            f'<stop offset="0%" stop-color="{dark}" stop-opacity=".9"/>'
            f'<stop offset="40%" stop-color="{bright}"/>'
            f'<stop offset="100%" stop-color="{dark}" stop-opacity=".85"/>'
            f'</linearGradient>')
        shapes.append(
            f'<g transform="translate({cx:.1f},{cy:.1f}) rotate({ang:.1f})">'
            f'<path d="{d}" fill="url(#{gid})" stroke="{dark}" stroke-width="1.2"/>'
            f'<path d="{vein}" fill="none" stroke="#0a1e04" stroke-width=".8" opacity=".4"/>'
            f'</g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{canvas_w}" height="{canvas_h}">'
            f'<defs>'
            f'<filter id="sh"><feDropShadow dx="1" dy="2" stdDeviation="2.5" '
            f'flood-color="#061505" flood-opacity=".6"/></filter>'
            + ''.join(grads)
            + f'</defs><g filter="url(#sh)">'
            + ''.join(shapes)
            + '</g></svg>')

def render(canvas_w, canvas_h, leaf_defs):
    svg  = leaf_svg(canvas_w, canvas_h, leaf_defs)
    data = cairosvg.svg2png(bytestring=svg.encode(), output_width=canvas_w, output_height=canvas_h)
    return Image.open(io.BytesIO(data)).convert('RGBA')

def make_corner(ox, oy, n, a_start, a_end, mirror_x=False):
    leaves = []
    for i in range(n):
        t   = i / (n-1) if n > 1 else .5
        ang = a_start + t*(a_end - a_start)
        if mirror_x:
            ang = 180 - ang
        ctr = 1 - 2*abs(t-.5)
        L   = 55 + 22*ctr        # 55–77 px  ← visible but not blobby
        W   = L * (.50 + .06*ctr)
        jit = 7*(1-ctr)
        a_rad = math.radians(ang)
        perp  = a_rad + math.pi/2
        cx = ox + jit*math.cos(perp)
        cy = oy + jit*math.sin(perp)
        if mirror_x:
            cx = BW - cx
        leaves.append((cx, cy, L, W, ang, i))
    return leaves

# ── Corners: single layer each, no heavy overlap ─────────────────────────────
# y-safe zone: anchor at y=50 (top) or y=BH-50 (bottom).
# Worst-case arc extent: hw_max * 1.28 ≈ 77*.56*0.5*1.28 ≈ 27px → safe ✓
TX, TY, BY_ = 50, 50, BH - 50

tl = make_corner(TX, TY,  6, -20, +75)
tr = make_corner(TX, TY,  6, -20, +75, mirror_x=True)
bl = make_corner(TX, BY_, 6, -75, +20)
br = make_corner(TX, BY_, 6, -75, +20, mirror_x=True)

# ── Composite ────────────────────────────────────────────────────────────────
orig_atlas = Image.open(ORIG).convert('RGBA')
board = orig_atlas.crop((BX, BY, BX+BW, BY+BH)).convert('RGBA')

for group in [tl, tr, bl, br]:
    board = Image.alpha_composite(board, render(BW, BH, group))

board.save('/tmp/frame_counter_preview.png')

atlas = Image.open(ATLAS).convert('RGBA')
atlas.paste(board, (BX, BY))
atlas.save(ATLAS, 'PNG')
atlas.save(WEBP,  'WEBP', quality=90)
print('Done — 4-corner compact leaf clusters applied')
