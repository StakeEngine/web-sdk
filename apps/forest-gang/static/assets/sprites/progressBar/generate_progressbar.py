"""
Generate forest-themed progress bar sprites matching reference:
  progressBarFrame.png  — gold pill frame + leaf clusters at ends & center
  progressBarBackground — dark rounded track (inside the frame)
  progressBar           — dark-green fill with subtle glow/gradient

Spritesheet layout: 3 frames × 492×87 px → atlas 1482×89, scale "0.25"
We generate at 4× (1968×348) then downscale to 492×87 for quality.
"""
import io, os, json, math, random
import cairosvg
from PIL import Image

DIR      = os.path.dirname(os.path.abspath(__file__))
OUT_PNG  = os.path.join(DIR, "progressBar.png")
OUT_WEBP = os.path.join(DIR, "progressBar.webp")
JSON_F   = os.path.join(DIR, "progressBar.json")

# Atlas dimensions (final) — must match progressBar.json frame positions exactly
FW, FH = 492, 87
# JSON frame positions: progressBar@(1,1), progressBarBackground@(495,1), progressBarFrame@(989,1)
X_FILL  = 1
X_BG    = 495
X_FRAME = 989
ATL_W   = 1482
ATL_H   = 89

# Render at 4× (= actual display size @ scale 0.25)
S  = 4
RW = FW * S   # 1968
RH = FH * S   # 348

# ── Palette ───────────────────────────────────────────────────────────────────
GOLD_DARK  = "#6B4A08"
GOLD_MID   = "#C89020"
GOLD_LIGHT = "#F0C030"
GOLD_EDGE  = "#FFE878"
GRN_DARK   = "#0A1A06"
GRN_MID    = "#142E08"
GRN_FILL   = "#1E4A0C"
GRN_GLOW   = "#2A6A10"
GRN_LEAF   = "#3E8A14"
GRN_LDARK  = "#1C4806"
GRN_LHI    = "#5EAA24"

# ── Pill geometry ──────────────────────────────────────────────────────────────
R       = RH // 2           # pill end radius = 174
BORDER  = 20                # gold border thickness in render pixels
R_INNER = R - BORDER        # inner radius

# ── Leaf helper ────────────────────────────────────────────────────────────────
def leaf(cx, cy, angle, sc=1.0, flip=False):
    sx = -1 if flip else 1
    lw, lh = 38 * sc, 65 * sc
    p  = (f'M 0,{-lh:.1f} '
          f'C {sx*lw*0.85:.1f},{-lh*0.5:.1f} {sx*lw:.1f},{lh*0.3:.1f} 0,{lh:.1f} '
          f'C {-sx*lw:.1f},{lh*0.3:.1f} {-sx*lw*0.85:.1f},{-lh*0.5:.1f} 0,{-lh:.1f} Z')
    v  = f'M 0,{-lh*0.85:.1f} L 0,{lh*0.8:.1f}'
    vl = f'M 0,{-lh*0.1:.1f} Q {sx*lw*0.5:.1f},{lh*0.2:.1f} {sx*lw*0.45:.1f},{lh*0.5:.1f}'
    vr = f'M 0,{-lh*0.1:.1f} Q {-sx*lw*0.5:.1f},{lh*0.2:.1f} {-sx*lw*0.45:.1f},{lh*0.5:.1f}'
    return (f'<g transform="translate({cx:.0f},{cy:.0f}) rotate({angle})">'
            f'<path d="{p}" fill="{GRN_LEAF}" stroke="{GRN_LDARK}" stroke-width="3.5"/>'
            f'<path d="{p}" fill="{GRN_LHI}" stroke="none" opacity="0.2"/>'
            f'<path d="{v}" stroke="{GRN_LDARK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
            f'<path d="{vl}" stroke="{GRN_LDARK}" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
            f'<path d="{vr}" stroke="{GRN_LDARK}" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
            f'</g>')

def clusters():
    cy = RH // 2
    parts = []
    # Left end cluster (4 leaves fanning out from left)
    parts += [
        leaf(80,  cy - 28, -55, 1.1),
        leaf(38,  cy,       -90, 1.2),
        leaf(80,  cy + 28,  -125, 1.1),
        leaf(118, cy,       -90, 0.90),
    ]
    # Right end cluster (mirrored)
    parts += [
        leaf(RW - 80,  cy - 28,  55, 1.1, True),
        leaf(RW - 38,  cy,        90, 1.2, True),
        leaf(RW - 80,  cy + 28,  125, 1.1, True),
        leaf(RW - 118, cy,        90, 0.90, True),
    ]
    # Center cluster (3 leaves pointing up, slightly above bar top)
    cx_m = RW // 2
    parts += [
        leaf(cx_m,      cy - 10, -90, 1.0),
        leaf(cx_m - 52, cy + 10, -115, 0.85),
        leaf(cx_m + 52, cy + 10,  -65, 0.85, True),
    ]
    return "\n".join(parts)

# ── SVG: gold frame (transparent interior via evenodd rule) ───────────────────
def frame_svg():
    def pill_d(inset=0):
        r = R - inset
        x1, x2 = r, RW - r
        y1, y2 = inset, RH - inset
        return (f'M {x1:.1f},{y1:.1f} L {x2:.1f},{y1:.1f} '
                f'A {r:.1f},{r:.1f} 0 0,1 {x2:.1f},{y2:.1f} '
                f'L {x1:.1f},{y2:.1f} '
                f'A {r:.1f},{r:.1f} 0 0,1 {x1:.1f},{y1:.1f} Z')

    # evenodd: outer CW + inner CW → XOR creates transparent hole
    ring_d = pill_d(0) + ' ' + pill_d(BORDER)

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{RW}" height="{RH}">
<defs>
  <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="{GOLD_EDGE}"/>
    <stop offset="28%"  stop-color="{GOLD_LIGHT}"/>
    <stop offset="65%"  stop-color="{GOLD_MID}"/>
    <stop offset="100%" stop-color="{GOLD_DARK}"/>
  </linearGradient>
  <linearGradient id="gHi" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="white" stop-opacity="0.3"/>
    <stop offset="50%"  stop-color="white" stop-opacity="0"/>
  </linearGradient>
  <filter id="lsh">
    <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.7"/>
  </filter>
</defs>
<!-- gold ring with transparent interior (evenodd) -->
<path fill-rule="evenodd" d="{ring_d}" fill="url(#gV)"/>
<!-- top-edge specular highlight on gold ring -->
<path fill-rule="evenodd" d="{ring_d}" fill="url(#gHi)"/>
<!-- inner edge dark shadow -->
<path d="{pill_d(BORDER)}" fill="none" stroke="{GOLD_DARK}" stroke-width="5" opacity="0.6"/>
<!-- leaf clusters on top of frame -->
<g filter="url(#lsh)">
  {clusters()}
</g>
</svg>"""

# ── SVG: dark track background ─────────────────────────────────────────────────
def background_svg():
    r = R_INNER
    x1, x2 = r + BORDER, RW - r - BORDER
    y1 = BORDER; y2 = RH - BORDER
    pill_path = (f'M {x1},{y1} L {x2},{y1} A {r},{r} 0 0,1 {x2},{y2} '
                 f'L {x1},{y2} A {r},{r} 0 0,1 {x1},{y1} Z')
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{RW}" height="{RH}">
<defs>
  <radialGradient id="bkR" cx="50%" cy="50%" r="55%">
    <stop offset="0%"   stop-color="{GRN_MID}"/>
    <stop offset="100%" stop-color="{GRN_DARK}"/>
  </radialGradient>
</defs>
<path d="{pill_path}" fill="url(#bkR)"/>
<path d="{pill_path}" fill="none" stroke="{GRN_DARK}" stroke-width="4" opacity="0.8"/>
</svg>"""

# ── SVG: green fill bar ────────────────────────────────────────────────────────
def fill_svg():
    r = R_INNER
    x1, x2 = r + BORDER, RW - r - BORDER
    y1 = BORDER; y2 = RH - BORDER
    pill_path = (f'M {x1},{y1} L {x2},{y1} A {r},{r} 0 0,1 {x2},{y2} '
                 f'L {x1},{y2} A {r},{r} 0 0,1 {x1},{y1} Z')
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{RW}" height="{RH}">
<defs>
  <linearGradient id="fV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="{GRN_GLOW}"/>
    <stop offset="40%"  stop-color="{GRN_FILL}"/>
    <stop offset="100%" stop-color="{GRN_MID}"/>
  </linearGradient>
  <linearGradient id="fH" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="{GRN_MID}" stop-opacity="0.7"/>
    <stop offset="20%"  stop-color="{GRN_FILL}"/>
    <stop offset="80%"  stop-color="{GRN_FILL}"/>
    <stop offset="100%" stop-color="{GRN_GLOW}" stop-opacity="0.9"/>
  </linearGradient>
  <clipPath id="fClip">
    <path d="{pill_path}"/>
  </clipPath>
</defs>
<path d="{pill_path}" fill="url(#fV)"/>
<!-- horizontal glow overlay -->
<path d="{pill_path}" fill="url(#fH)" opacity="0.6"/>
<!-- subtle top shine -->
<path d="M {x1},{y1+6} L {x2},{y1+6}" stroke="rgba(100,220,60,0.25)" stroke-width="{(y2-y1)*0.3:.0f}" stroke-linecap="round"/>
</svg>"""

# ── Render all three sprites ───────────────────────────────────────────────────
def render(svg_str):
    raw = cairosvg.svg2png(bytestring=svg_str.encode(), output_width=RW, output_height=RH)
    hi  = Image.open(io.BytesIO(raw)).convert("RGBA")
    return hi.resize((FW, FH), Image.LANCZOS)

print("Rendering progressBarFrame…")
frame_img = render(frame_svg())

print("Rendering progressBarBackground…")
bg_img    = render(background_svg())

print("Rendering progressBar fill…")
fill_img  = render(fill_svg())

# ── Pack into spritesheet (1482×89) ───────────────────────────────────────────
atlas = Image.new("RGBA", (ATL_W, ATL_H), (0, 0, 0, 0))
# Positions match progressBar.json exactly
atlas.paste(fill_img,  (X_FILL,  1))
atlas.paste(bg_img,    (X_BG,    1))
atlas.paste(frame_img, (X_FRAME, 1))

atlas.save(OUT_PNG)
atlas.save(OUT_WEBP, format="WEBP", quality=92)
print(f"Saved: {OUT_PNG}  ({ATL_W}×{ATL_H})")

# JSON already has correct size (1482×89) and frame positions — no update needed

# Preview individual frames
frame_img.save("/tmp/pb_frame_preview.png")
bg_img.save("/tmp/pb_bg_preview.png")
fill_img.save("/tmp/pb_fill_preview.png")
print("Done!")
