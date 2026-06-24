"""
Replace ALL rock regions (rock1-rock8) in the transition spine with coins.
rock9 uses rock4 which is already replaced.
"""
import json, os, io, math, re
import cairosvg
from PIL import Image

DIR     = os.path.dirname(os.path.abspath(__file__))
ATLAS   = os.path.join(DIR, "transition.atlas")
JSON_F  = os.path.join(DIR, "transition.json")
SRC_PNG = os.path.join(DIR, "transition.png")
OUT_WBP = os.path.join(DIR, "transition.webp")

# All rock regions: name → (atlas_x, atlas_y, atlas_w, atlas_h, rotated)
ROCKS = {
    "rock1": (2,   6,   77,  93,  True),
    "rock2": (808, 179, 139, 163, True),
    "rock3": (688, 320, 238, 284, True),
    "rock4": (204, 2,   300, 339, True),   # already patched but redo cleanly
    "rock5": (545, 4,   261, 298, False),
    "rock6": (974, 359, 199, 222, True),
    "rock7": (97,  25,  49,  58,  False),
    "rock8": (974, 155, 202, 220, True),
}

# ── Coin SVG generator (size S, rendered at S) ────────────────────────────────
def coin_svg(S):
    cx = cy = S / 2
    R_outer     = S * 0.485
    R_ring_in   = S * 0.440
    R_trim      = S * 0.390
    R_face      = S * 0.368
    R_inner_rim = S * 0.330
    R_tree      = S * 0.305

    # colours
    GO = "#C88A0A"; GM = "#E0A820"; GL = "#F8D060"; GE = "#FFF0A0"
    GD = "#7A4E04"; GS = "#3C2402"
    GF = "#2A4A14"; GFD = "#121E06"; GFM = "#3A5C1A"
    GV = "#3A7A10"; GVD = "#1C4A08"; GVL = "#5AAA28"

    def arc(r, a1, a2, sw=1):
        a1r, a2r = math.radians(a1), math.radians(a2)
        x1 = cx + r * math.cos(a1r); y1 = cy + r * math.sin(a1r)
        x2 = cx + r * math.cos(a2r); y2 = cy + r * math.sin(a2r)
        la = 1 if abs(a2 - a1) > 180 else 0
        return f"M{x1:.1f},{y1:.1f} A{r:.1f},{r:.1f} 0 {la},{sw} {x2:.1f},{y2:.1f}"

    # vines
    vine_r = (R_ring_in + R_trim) / 2
    vines = []
    vines.append(f'<path d="{arc(vine_r,-110,200,1)}" fill="none" stroke="{GV}" stroke-width="{max(2,S*0.013):.1f}" stroke-linecap="round"/>')
    vines.append(f'<path d="{arc(vine_r+S*0.012, 170, 350,1)}" fill="none" stroke="{GV}" stroke-width="{max(1.5,S*0.010):.1f}" stroke-linecap="round" opacity="0.8"/>')
    lf_sc = max(0.3, S / 600)
    for ang in [-80, -30, 30, 90, 150, 210, 270, 330]:
        a = math.radians(ang)
        lx = cx + vine_r * math.cos(a); ly = cy + vine_r * math.sin(a)
        lw = 18*lf_sc; lh = 30*lf_sc
        la = ang + 90
        p = f'M0,{-lh:.1f} C{lw:.1f},{-lh*0.4:.1f} {lw:.1f},{lh*0.3:.1f} 0,{lh:.1f} C{-lw:.1f},{lh*0.3:.1f} {-lw:.1f},{-lh*0.4:.1f} 0,{-lh:.1f} Z'
        vines.append(f'<g transform="translate({lx:.1f},{ly:.1f}) rotate({la})">'
                     f'<path d="{p}" fill="{GVL}" stroke="{GVD}" stroke-width="{max(1,S*0.004):.1f}"/>'
                     f'</g>')

    # tree (scaled to R_tree)
    sc = R_tree / 185
    tx, ty = cx, cy + S * 0.085

    def tp(path): return f'<path d="{path}" fill="{GM}" stroke="{GD}" stroke-width="{max(1,S*0.006):.1f}" stroke-linejoin="round"/>'
    def te(x,y,rx,ry,rot=0):
        return (f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" '
                f'transform="rotate({rot},{x},{y})" fill="{GM}" stroke="{GD}" stroke-width="{max(1,S*0.005):.1f}"/>')

    s = sc
    tree = f'<g transform="translate({tx:.1f},{ty:.1f}) scale({s:.3f})">'
    tree += tp("M0,0 Q-30,18 -52,26 Q-38,14 -18,6 Z")
    tree += tp("M0,0 Q30,18 52,26 Q38,14 18,6 Z")
    tree += tp("M0,0 Q-12,28 -22,46 Q-8,30 0,16 Z")
    tree += tp("M0,0 Q12,28 22,46 Q8,30 0,16 Z")
    tree += tp("M-20,0 C-22,-30 -20,-80 -16,-118 C-12,-155 -8,-168 0,-178 C8,-168 12,-155 16,-118 C20,-80 22,-30 20,0 Z")
    tree += tp("M-12,-85 C-32,-95 -62,-86 -80,-72 C-58,-78 -32,-84 -12,-78 Z")
    tree += tp("M12,-85 C32,-95 62,-86 80,-72 C58,-78 32,-84 12,-78 Z")
    tree += tp("M-10,-118 C-28,-124 -56,-112 -72,-96 C-52,-104 -28,-116 -10,-110 Z")
    tree += tp("M10,-118 C28,-124 56,-112 72,-96 C52,-104 28,-116 10,-110 Z")
    tree += tp("M-6,-146 C-20,-150 -42,-140 -54,-126 C-38,-132 -20,-144 -6,-138 Z")
    tree += tp("M6,-146 C20,-150 42,-140 54,-126 C38,-132 20,-144 6,-138 Z")
    tree += te(-82,-80, 18,12,-20); tree += te(-68,-96, 14,10,-40); tree += te(-98,-66, 15,10,10)
    tree += te( 82,-80, 18,12, 20); tree += te( 68,-96, 14,10, 40); tree += te( 98,-66, 15,10,-10)
    tree += te(-74,-105,16,11,-25); tree += te(-60,-120,13, 9,-45)
    tree += te( 74,-105,16,11, 25); tree += te( 60,-120,13, 9, 45)
    tree += te(-56,-134,14,10,-30); tree += te( 56,-134,14,10, 30)
    tree += te(0,-190, 13,17,0); tree += te(-16,-182,11,15,-15); tree += te(16,-182,11,15,15)
    tree += '</g>'

    # radial texture lines on face
    rad_lines = "".join(
        f'<line x1="{cx:.1f}" y1="{cy:.1f}" '
        f'x2="{cx+R_face*math.cos(math.radians(a)):.1f}" y2="{cy+R_face*math.sin(math.radians(a)):.1f}" '
        f'stroke="white" stroke-width="0.8"/>'
        for a in range(0, 360, 10))

    sw = max(1.5, S * 0.005)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">
<defs>
  <radialGradient id="oR" cx="38%" cy="35%" r="65%">
    <stop offset="0%" stop-color="{GL}"/><stop offset="45%" stop-color="{GM}"/>
    <stop offset="78%" stop-color="{GO}"/><stop offset="100%" stop-color="{GS}"/>
  </radialGradient>
  <radialGradient id="fR" cx="42%" cy="38%" r="62%">
    <stop offset="0%" stop-color="{GFM}"/><stop offset="55%" stop-color="{GF}"/>
    <stop offset="100%" stop-color="{GFD}"/>
  </radialGradient>
  <radialGradient id="iR" cx="40%" cy="36%" r="60%">
    <stop offset="0%" stop-color="{GE}"/><stop offset="45%" stop-color="{GM}"/>
    <stop offset="100%" stop-color="{GD}"/>
  </radialGradient>
  <filter id="sh"><feDropShadow dx="0" dy="{S*0.015:.1f}" stdDeviation="{S*0.02:.1f}" flood-color="#000" flood-opacity="0.65"/></filter>
  <clipPath id="fC"><circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_face:.1f}"/></clipPath>
</defs>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_outer:.1f}" fill="rgba(0,0,0,0.4)" filter="url(#sh)"/>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_outer:.1f}" fill="url(#oR)"/>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_outer-S*0.007:.1f}" fill="none" stroke="{GE}" stroke-width="{sw*0.7:.1f}" opacity="0.5"/>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_ring_in+S*0.004:.1f}" fill="none" stroke="{GS}" stroke-width="{sw:.1f}"/>
{''.join(vines)}
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_trim+S*0.004:.1f}" fill="url(#iR)"/>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_trim-S*0.005:.1f}" fill="none" stroke="{GE}" stroke-width="{sw*0.6:.1f}" opacity="0.55"/>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_trim-S*0.018:.1f}" fill="none" stroke="{GS}" stroke-width="{sw:.1f}"/>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_face:.1f}" fill="url(#fR)"/>
<g clip-path="url(#fC)" opacity="0.07">{rad_lines}</g>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_inner_rim+S*0.005:.1f}" fill="none" stroke="{GD}" stroke-width="{sw:.1f}"/>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_inner_rim:.1f}" fill="none" stroke="{GM}" stroke-width="{sw*0.8:.1f}"/>
{tree}
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R_face:.1f}" fill="none" stroke="{GFD}" stroke-width="{S*0.013:.1f}" opacity="0.55"/>
</svg>"""

# ── Patch atlas image and text ─────────────────────────────────────────────────
atlas_img = Image.open(SRC_PNG).convert("RGBA")

with open(ATLAS) as f:
    atlas_src = f.read()

with open(JSON_F) as f:
    spine = json.load(f)

for name, (ax, ay, aw, ah, rotated) in ROCKS.items():
    # Display size: if rotated, spine rotates 90° so display is ah×aw
    if rotated:
        disp_w, disp_h = ah, aw
    else:
        disp_w, disp_h = aw, ah

    # Make coin square using the smaller display dimension
    coin_disp = min(disp_w, disp_h)

    # Render coin at 2× for quality then downscale to fit in atlas region
    render_size = min(600, coin_disp * 2)
    svg = coin_svg(render_size)
    raw = cairosvg.svg2png(bytestring=svg.encode(),
                           output_width=render_size, output_height=render_size)
    coin_hi = Image.open(io.BytesIO(raw)).convert("RGBA")

    # The coin occupies a square of side coin_disp in atlas pixels
    # Centre it inside the (aw × ah) atlas region
    coin_px = coin_disp   # atlas pixels (atlas scale=1)
    coin_at = coin_hi.resize((coin_px, coin_px), Image.LANCZOS)

    patch = Image.new("RGBA", (aw, ah), (0, 0, 0, 0))
    off_x = (aw - coin_px) // 2
    off_y = (ah - coin_px) // 2
    patch.paste(coin_at, (off_x, off_y))
    atlas_img.paste(patch, (ax, ay))

    # New bounds/offsets: coin centred at (ax+off_x, ay+off_y, coin_px, coin_px)
    new_bx = ax + off_x
    new_by = ay + off_y
    new_bw = coin_px
    new_bh = coin_px

    # Patch atlas text — remove rotate:90 if present, update bounds+offsets
    # Match existing entry
    old_patterns = [
        f"{name}\nbounds:{ax},{ay},{aw},{ah}\noffsets:.*\nrotate:90",
        f"{name}\nbounds:{ax},{ay},{aw},{ah}\noffsets:.*",
    ]
    new_entry = (f"{name}\nbounds:{new_bx},{new_by},{new_bw},{new_bh}\n"
                 f"offsets:0,0,{coin_disp},{coin_disp}")
    replaced = False
    for pat in old_patterns:
        new_src, n = re.subn(pat, new_entry, atlas_src)
        if n:
            atlas_src = new_src
            replaced = True
            break
    if not replaced:
        print(f"  WARNING: could not patch atlas entry for {name}")

    # Patch JSON attachment dimensions
    for skin in spine.get("skins", []):
        for slot_name, slot_atts in skin.get("attachments", {}).items():
            for att_name, att_data in slot_atts.items():
                if att_name == name:
                    att_data["width"]  = coin_disp
                    att_data["height"] = coin_disp

    print(f"  {name}: atlas ({ax},{ay},{aw}×{ah}) → coin {coin_px}×{coin_px} at ({new_bx},{new_by})")

atlas_img.save(SRC_PNG)
atlas_img.save(OUT_WBP, format="WEBP", quality=92)
print("Saved transition.png + .webp")

with open(ATLAS, "w") as f:
    f.write(atlas_src)
print("Updated: transition.atlas")

with open(JSON_F, "w") as f:
    json.dump(spine, f, separators=(",", ":"))
print("Updated: transition.json")
print("Done!")
