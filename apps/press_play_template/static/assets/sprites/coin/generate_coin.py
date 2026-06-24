"""
Generate a forest-themed coin sprite sheet to replace SD2_Coin.png.
Produces 12 rotation frames (front → edge → back → edge → front).
"""
import math
import json
import os
import cairosvg
from PIL import Image
import io

# ── Design constants ──────────────────────────────────────────────────────────
SIZE   = 684          # source frame size
COIN_D = 640          # coin diameter
CX = CY = SIZE // 2   # center

def pt(bearing_deg, r):
    """Point on circle: bearing 0=top, CW."""
    a = math.radians(bearing_deg)
    return (CX + r * math.sin(a), CY - r * math.cos(a))

# ── Tree of life SVG (centered in inner circle, ~310×300) ────────────────────
TREE = """
<g id="tree" transform="translate(172, 188)">
  <!-- ── Root system ── -->
  <path d="M148,294 C120,308 86,306 56,296 C66,278 102,272 132,278 C138,282 144,288 148,294" fill="#C89820"/>
  <path d="M172,294 C200,308 234,306 264,296 C254,278 218,272 188,278 C182,282 176,288 172,294" fill="#C89820"/>
  <path d="M135,300 C130,316 134,328 160,334 C186,328 190,316 185,300 C178,292 164,288 160,285 C156,288 142,292 135,300" fill="#D4A62A"/>
  <!-- Root tendrils -->
  <path d="M148,280 C124,290 98,292 72,286 C80,272 106,268 130,272" fill="#C89820"/>
  <path d="M172,280 C196,290 222,292 248,286 C240,272 214,268 190,272" fill="#C89820"/>

  <!-- ── Main trunk (wide organic shape) ── -->
  <path d="M136,286 C134,260 130,228 128,192 C126,168 128,148 140,132 C148,124 160,120 160,120
           C160,120 172,124 180,132 C192,148 194,168 192,192 C190,228 186,260 184,286 Z"
        fill="#D4A62A"/>
  <!-- Trunk center shade for depth -->
  <path d="M155,286 C154,258 152,228 152,192 C152,168 154,148 160,132
           C166,148 168,168 168,192 C168,228 166,258 165,286 Z"
        fill="#B88815" opacity="0.45"/>

  <!-- ── Left branches ── -->
  <!-- Lower-left -->
  <path d="M138,230 C110,212 80,196 54,172 C62,156 82,166 104,184 C122,200 138,220 140,228" fill="#C89820"/>
  <!-- Upper-left -->
  <path d="M140,180 C110,158 88,126 76,90 C92,80 112,100 128,130 C140,154 141,174 141,180" fill="#C89820"/>

  <!-- ── Right branches ── -->
  <!-- Lower-right -->
  <path d="M182,230 C210,212 240,196 266,172 C258,156 238,166 216,184 C198,200 182,220 180,228" fill="#C89820"/>
  <!-- Upper-right -->
  <path d="M180,180 C210,158 232,126 244,90 C228,80 208,100 192,130 C180,154 179,174 179,180" fill="#C89820"/>

  <!-- ── Center top branch ── -->
  <path d="M155,145 C154,115 156,90 160,68 C164,90 166,115 165,145" fill="#C89820"/>

  <!-- ── LEAVES (almond/teardrop shapes) ── -->
  <!-- Far-left lower cluster -->
  <path d="M50,172 C36,162 28,148 32,132 C40,116 58,114 70,126 C82,138 82,158 72,170 C64,178 56,178 50,172 Z"
        fill="#D4A62A"/>
  <path d="M74,122 C62,108 60,90 72,78 C84,68 102,72 108,86 C114,100 108,118 96,126 C86,132 78,130 74,122 Z"
        fill="#D4A62A"/>
  <!-- Left mid leaf -->
  <path d="M106,182 C96,172 94,156 100,144 C108,132 122,132 130,142 C138,152 136,168 128,178 C120,186 112,186 106,182 Z"
        fill="#D4A62A"/>

  <!-- Far-right lower cluster -->
  <path d="M270,172 C284,162 292,148 288,132 C280,116 262,114 250,126 C238,138 238,158 248,170 C256,178 264,178 270,172 Z"
        fill="#D4A62A"/>
  <path d="M246,122 C258,108 260,90 248,78 C236,68 218,72 212,86 C206,100 212,118 224,126 C234,132 242,130 246,122 Z"
        fill="#D4A62A"/>
  <!-- Right mid leaf -->
  <path d="M214,182 C224,172 226,156 220,144 C212,132 198,132 190,142 C182,152 184,168 192,178 C200,186 208,186 214,182 Z"
        fill="#D4A62A"/>

  <!-- Upper-left cluster -->
  <path d="M72,88 C60,72 60,50 74,38 C88,28 108,34 114,50 C120,66 112,86 98,94 C86,100 78,98 72,88 Z"
        fill="#D4A62A"/>
  <path d="M104,60 C96,42 100,20 116,10 C132,2 150,10 152,28 C154,44 142,62 126,68 C112,72 106,72 104,60 Z"
        fill="#D4A62A"/>
  <path d="M116,110 C106,96 106,76 118,66 C130,56 148,60 152,76 C156,90 148,108 134,116 C122,122 120,120 116,110 Z"
        fill="#D4A62A"/>

  <!-- Upper-right cluster -->
  <path d="M248,88 C260,72 260,50 246,38 C232,28 212,34 206,50 C200,66 208,86 222,94 C234,100 242,98 248,88 Z"
        fill="#D4A62A"/>
  <path d="M216,60 C224,42 220,20 204,10 C188,2 170,10 168,28 C166,44 178,62 194,68 C208,72 214,72 216,60 Z"
        fill="#D4A62A"/>
  <path d="M204,110 C214,96 214,76 202,66 C190,56 172,60 168,76 C164,90 172,108 186,116 C198,122 200,120 204,110 Z"
        fill="#D4A62A"/>

  <!-- Center top cluster -->
  <path d="M160,68 C148,52 148,28 160,16 C172,28 172,52 160,68 Z" fill="#D4A62A"/>
  <path d="M134,74 C122,58 124,36 136,24 C150,14 168,20 170,38 C172,52 162,68 148,76 C140,80 136,80 134,74 Z"
        fill="#D4A62A"/>
  <path d="M186,74 C198,58 196,36 184,24 C170,14 152,20 150,38 C148,52 158,68 172,76 C180,80 184,80 186,74 Z"
        fill="#D4A62A"/>

  <!-- Leaf vein lines for clarity -->
  <line x1="50" y1="169" x2="64" y2="135" stroke="#B08010" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
  <line x1="74" y1="119" x2="92" y2="88"  stroke="#B08010" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
  <line x1="248" y1="169" x2="256" y2="135" stroke="#B08010" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
  <line x1="246" y1="119" x2="228" y2="88"  stroke="#B08010" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
  <line x1="160" y1="66" x2="160" y2="20"  stroke="#B08010" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
</g>
"""

# ── Cardinal leaf ornaments ────────────────────────────────────────────────────
def cardinal_leaf(bearing, size=28):
    """Pointed leaf centered on the inner ring at bearing."""
    x, y = pt(bearing, 220)
    rot = bearing  # tip points outward (bearing direction)
    hw, hh = size * 0.45, size
    return f"""<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{hw}" ry="{hh}"
      transform="rotate({rot} {x:.1f} {y:.1f})"
      fill="#D4A62A" stroke="#A07015" stroke-width="1.2"/>
    <line x1="{x:.1f}" y1="{y - hh*0.85:.1f}" x2="{x:.1f}" y2="{y + hh*0.85:.1f}"
      transform="rotate({rot} {x:.1f} {y:.1f})"
      stroke="#8B5E0A" stroke-width="1.5" stroke-linecap="round"/>"""

CARDINAL_LEAVES = "\n".join(cardinal_leaf(b) for b in [0, 90, 180, 270])

# ── Vine helpers ──────────────────────────────────────────────────────────────
def arc_path(b1, b2, r, cw=True):
    x1, y1 = pt(b1, r)
    x2, y2 = pt(b2, r)
    span = ((b2 - b1 + 360) % 360) if cw else ((b1 - b2 + 360) % 360)
    large = 1 if span > 180 else 0
    sweep = 1 if cw else 0
    return f"M {x1:.1f},{y1:.1f} A {r},{r} 0 {large} {sweep} {x2:.1f},{y2:.1f}"

def vine_leaf(bearing, r_delta, rx=10, ry=18):
    x, y = pt(bearing, 284 + r_delta)
    rot = bearing - 90
    # Teardrop leaf: pointed both ends (approximated by path)
    h = ry
    w = rx
    # leaf points along Y axis before rotation
    path = (f'M 0,{-h} C {w},{-h*0.3} {w},{h*0.3} 0,{h} '
            f'C {-w},{h*0.3} {-w},{-h*0.3} 0,{-h} Z')
    return (f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.1f})">'
            f'<path d="{path}" fill="#4EA020" stroke="#1E4A08" stroke-width="0.7"/>'
            f'<line x1="0" y1="{-h*0.8:.1f}" x2="0" y2="{h*0.8:.1f}" '
            f'stroke="#2A6008" stroke-width="1" stroke-linecap="round" opacity="0.7"/>'
            f'</g>')

# Vine 1: CW from 300° → 260° (320° sweep through right and bottom)
vine1 = arc_path(300, 260, 284, cw=True)
# Vine 2: CW from 310° → 50° (100° through the top)
vine2 = arc_path(310, 50, 276, cw=True)

# Leaves at regular intervals
leaf_bearings1  = list(range(310, 670, 38))   # vine1 leaves (outer)
leaf_bearings1i = list(range(325, 660, 50))   # vine1 leaves (inner)
leaf_bearings2  = [325, 355, 20]              # vine2 leaves (top)
accent_bearings = list(range(10, 370, 45))    # prominent accent leaves

VINE_LEAVES = "\n".join([
    *[vine_leaf(b,  18, 10, 18) for b in leaf_bearings1],
    *[vine_leaf(b, -18,  8, 14) for b in leaf_bearings1i],
    *[vine_leaf(b,  18, 10, 17) for b in leaf_bearings2],
    *[vine_leaf(b,  24, 12, 21) for b in accent_bearings],
])

# ── Full coin face SVG ─────────────────────────────────────────────────────────
def coin_svg(scale_x=1.0, scale_y=1.0, opacity=1.0):
    """
    Returns SVG for a coin face.
    scale_x/scale_y squeeze the coin for rotation frames (perspective effect).
    """
    # Width and height after perspective squeeze
    w = COIN_D * scale_x
    h = COIN_D * scale_y
    ox = (SIZE - w) / 2   # offset to keep centered
    oy = (SIZE - h) / 2

    # Whether we're showing "back" (>180° rotation) — back is plain gold
    is_front = scale_x >= 0

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}"
     viewBox="0 0 {SIZE} {SIZE}">
<defs>
  <radialGradient id="goldRing" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#F0D27A"/>
    <stop offset="45%"  stop-color="#DAAA3C"/>
    <stop offset="80%"  stop-color="#C28519"/>
    <stop offset="100%" stop-color="#7D4C0A"/>
  </radialGradient>
  <radialGradient id="greenFace" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#2B5F0F" stop-opacity="1"/>
    <stop offset="60%"  stop-color="#1E3D0A" stop-opacity="1"/>
    <stop offset="100%" stop-color="#0D1F04" stop-opacity="1"/>
  </radialGradient>
  <radialGradient id="trunkShade" cx="50%" cy="50%" r="50%">
    <stop offset="0%"  stop-color="#000000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
  </radialGradient>
  <filter id="treeShadow">
    <feDropShadow dx="2" dy="3" stdDeviation="5" flood-color="#3D2000" flood-opacity="0.55"/>
  </filter>
  <mask id="ringMask">
    <ellipse cx="{CX}" cy="{CY}" rx="{w/2:.1f}" ry="{h/2:.1f}" fill="white"/>
    <ellipse cx="{CX}" cy="{CY}" rx="{w/2 * 0.808:.1f}" ry="{h/2 * 0.808:.1f}" fill="black"/>
  </mask>
  <clipPath id="coinClip">
    <ellipse cx="{CX}" cy="{CY}" rx="{w/2:.1f}" ry="{h/2:.1f}"/>
  </clipPath>
</defs>

<g opacity="{opacity}" clip-path="url(#coinClip)"
   transform="translate({(SIZE-w)/2:.1f},{(SIZE-h)/2:.1f}) scale({scale_x:.4f},{scale_y:.4f}) translate({-(SIZE-w)/2/scale_x:.1f},{-(SIZE-h)/2/scale_y:.1f})">

  <!-- Drop shadow -->
  <ellipse cx="{CX}" cy="{CY+8}" rx="{COIN_D/2}" ry="{COIN_D/2 * 0.12}"
    fill="rgba(0,30,0,0.45)" filter="url(#treeShadow)"/>

  <!-- Outer gold ring -->
  <ellipse cx="{CX}" cy="{CY}" rx="{COIN_D/2}" ry="{COIN_D/2}" fill="url(#goldRing)"/>

  <!-- Inner bevel (dark edge between ring and face) -->
  <ellipse cx="{CX}" cy="{CY}" rx="263" ry="263" fill="#2A1200"/>

  <!-- Green face -->
  <ellipse cx="{CX}" cy="{CY}" rx="258" ry="258" fill="url(#greenFace)"/>

  <!-- Face texture overlay -->
  <ellipse cx="{CX}" cy="{CY}" rx="258" ry="258"
    fill="none" stroke="rgba(80,160,20,0.12)" stroke-width="1"/>

  <!-- Inner gold ring borders -->
  <ellipse cx="{CX}" cy="{CY}" rx="224" ry="224"
    fill="none" stroke="#C28519" stroke-width="9"/>
  <ellipse cx="{CX}" cy="{CY}" rx="215" ry="215"
    fill="none" stroke="#F0D27A" stroke-width="2.5"/>
  <ellipse cx="{CX}" cy="{CY}" rx="232" ry="232"
    fill="none" stroke="#7D4C0A" stroke-width="3"/>

  <!-- Vines on outer gold ring -->
  <g mask="url(#ringMask)">
    <path d="{vine1}" stroke="#1E4A08" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="{vine1}" stroke="#4EA020" stroke-width="8"  fill="none" stroke-linecap="round"/>
    <path d="{vine1}" stroke="#7ECF40" stroke-width="3"  fill="none" stroke-linecap="round" opacity="0.6"/>
    <path d="{vine2}" stroke="#1E4A08" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="{vine2}" stroke="#4EA020" stroke-width="6.5" fill="none" stroke-linecap="round"/>
    <path d="{vine2}" stroke="#7ECF40" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.6"/>
    {VINE_LEAVES}
  </g>

  <!-- Ring highlight (top edge glow) -->
  <ellipse cx="{CX}" cy="{CY}" rx="{COIN_D/2}" ry="{COIN_D/2}"
    fill="none" stroke="rgba(255,230,120,0.28)" stroke-width="6"/>

  <!-- Tree of life (front only) -->
  {"<g filter='url(#treeShadow)'>" + TREE + "</g>" if scale_x > 0.05 else ""}

  <!-- Cardinal leaf ornaments -->
  {"<g>" + CARDINAL_LEAVES + "</g>" if scale_x > 0.05 else ""}

  <!-- Inner ring shine -->
  <ellipse cx="{CX}" cy="{CY-10}" rx="218" ry="210"
    fill="none" stroke="rgba(255,240,150,0.18)" stroke-width="4"/>

</g>
</svg>"""
    return svg

# ── Generate 12 rotation frames ───────────────────────────────────────────────
# Coin rotates around Y-axis: frames 1-12 evenly spaced over one full rotation.
# Perspective squeeze: visible width = cos(rotation_angle) * full_width.
# Front face = 0°, edge = 90°, back = 180°.

def frame_scale(frame_idx):
    """Returns (scale_x, is_front) for a rotation frame."""
    angle = (frame_idx / 12) * 360   # 0..330 degrees
    sx = abs(math.cos(math.radians(angle)))
    is_front = (angle < 90) or (angle > 270)
    return sx, is_front

def render_svg(svg_str, size=SIZE):
    """Render SVG to PIL Image."""
    png_data = cairosvg.svg2png(bytestring=svg_str.encode(), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png_data)).convert("RGBA")

print("Rendering 12 coin rotation frames...")

# Generate front face first (for preview)
front_svg = coin_svg(scale_x=1.0, scale_y=1.0)
front_img = render_svg(front_svg)
preview_path = "/tmp/forest_coin_front.png"
front_img.save(preview_path)
print(f"Front face saved to {preview_path}")

# Render all 12 frames
frames = []
for i in range(12):
    angle = (i / 12) * 360
    sx = abs(math.cos(math.radians(angle)))
    sx = max(sx, 0.02)  # never fully zero
    is_front = (angle < 90) or (angle > 270)
    scale = sx if is_front else sx   # back face would mirror, but we keep same face for simplicity
    svg = coin_svg(scale_x=scale, scale_y=1.0)
    img = render_svg(svg)
    frames.append(img)
    print(f"  Frame {i+1}: angle={angle:.0f}° scale_x={scale:.3f}")

print("All frames rendered.")

# ── Pack into sprite sheet ─────────────────────────────────────────────────────
# Mimic original SD2_Coin.json layout: each source frame is SIZE×SIZE
# Pack all 12 side by side in a simple row (will also generate proper JSON)

# Use a simple grid layout: 4 columns × 3 rows
COLS, ROWS = 4, 3
SHEET_W = SIZE * COLS
SHEET_H = SIZE * ROWS

sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))
frame_data = {}
animations = {"coin": []}

for i, img in enumerate(frames):
    col = i % COLS
    row = i // COLS
    x = col * SIZE
    y = row * SIZE

    sheet.paste(img, (x, y), img)

    name = f"{i+1}.png"
    frame_data[name] = {
        "frame":           {"x": x, "y": y, "w": SIZE, "h": SIZE},
        "rotated":         False,
        "trimmed":         False,
        "spriteSourceSize": {"x": 0, "y": 0, "w": SIZE, "h": SIZE},
        "sourceSize":      {"w": SIZE, "h": SIZE},
    }
    animations["coin"].append(name)

out_dir = "/Users/stanislavmilev/Development/stake/forestSlot/apps/forest-gang/static/assets/sprites/coin"
sheet_path = os.path.join(out_dir, "SD2_Coin.png")
json_path  = os.path.join(out_dir, "SD2_Coin.json")

sheet.save(sheet_path, "PNG")
print(f"Sprite sheet saved: {sheet_path}  ({SHEET_W}×{SHEET_H})")

# Save JSON (update to match simple non-rotated packed layout)
json_data = {
    "frames": frame_data,
    "animations": animations,
    "meta": {
        "app": "custom-coin-generator",
        "version": "1.0",
        "image": "SD2_Coin.png",
        "format": "RGBA8888",
        "size": {"w": SHEET_W, "h": SHEET_H},
        "scale": "2",
    }
}
with open(json_path, "w") as f:
    json.dump(json_data, f, indent=2)
print(f"JSON saved: {json_path}")

# Also save preview of sheet at smaller scale
preview_sheet = sheet.resize((SHEET_W // 4, SHEET_H // 4), Image.LANCZOS)
preview_sheet.save("/tmp/forest_coin_sheet_preview.png")
print("Done!")
