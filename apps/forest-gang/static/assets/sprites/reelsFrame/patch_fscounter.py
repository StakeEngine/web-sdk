"""
Replace Frame_FSCounter in reels_frame.png using scatter_frame.png as source.
Uses 9-slice scaling: corners keep their leaf clusters, edges/center stretch.
"""
import json, os
from PIL import Image

DIR       = os.path.dirname(os.path.abspath(__file__))
SRC_FRAME = "/Users/stanislavmilev/Development/stake/forestSlot/apps/forest-gang/static/assets/components/frames/scatter_frame.png"
ATLAS_F   = os.path.join(DIR, "reels_frame.png")
JSON_F    = os.path.join(DIR, "reels_frame.json")

with open(JSON_F) as f:
    meta = json.load(f)
fc = meta["frames"]["Frame_FSCounter.png"]
ax, ay, aw, ah = fc["frame"]["x"], fc["frame"]["y"], fc["frame"]["w"], fc["frame"]["h"]
print(f"Atlas slot: ({ax},{ay})  {aw}×{ah}")

# ── Source scatter_frame (218×441) ────────────────────────────────────────────
sf    = Image.open(SRC_FRAME).convert("RGBA")
SW, SH = sf.size          # 218, 441
CS    = 72                # corner size in source pixels (covers leaves + border)

# 9 source slices
def crop_src(x1, y1, x2, y2):
    return sf.crop((x1, y1, x2, y2))

s_tl = crop_src(0,    0,    CS,   CS)
s_tc = crop_src(CS,   0,    SW-CS, CS)
s_tr = crop_src(SW-CS, 0,   SW,   CS)
s_ml = crop_src(0,    CS,   CS,   SH-CS)
s_mc = crop_src(CS,   CS,   SW-CS, SH-CS)
s_mr = crop_src(SW-CS, CS,  SW,   SH-CS)
s_bl = crop_src(0,    SH-CS, CS,  SH)
s_bc = crop_src(CS,   SH-CS, SW-CS, SH)
s_br = crop_src(SW-CS, SH-CS, SW, SH)

# ── Destination layout in atlas slot (aw × ah) ────────────────────────────────
CD = 72   # corner size in destination (same absolute size = crisp leaves)
# Clamp so corners don't overflow
CD = min(CD, aw//3, ah//3)

cw = aw - 2 * CD   # center width
ch = ah - 2 * CD   # center height
print(f"Corner={CD}  center={cw}×{ch}")

def resize(img, w, h):
    return img.resize((max(1, w), max(1, h)), Image.LANCZOS)

# Scale all 9 pieces
d_tl = resize(s_tl, CD, CD)
d_tc = resize(s_tc, cw, CD)
d_tr = resize(s_tr, CD, CD)
d_ml = resize(s_ml, CD, ch)
d_mc = resize(s_mc, cw, ch)
d_mr = resize(s_mr, CD, ch)
d_bl = resize(s_bl, CD, CD)
d_bc = resize(s_bc, cw, CD)
d_br = resize(s_br, CD, CD)

# ── Assemble result ───────────────────────────────────────────────────────────
result = Image.new("RGBA", (aw, ah), (0, 0, 0, 0))
result.paste(d_tl, (0,        0))
result.paste(d_tc, (CD,       0))
result.paste(d_tr, (CD + cw,  0))
result.paste(d_ml, (0,        CD))
result.paste(d_mc, (CD,       CD))
result.paste(d_mr, (CD + cw,  CD))
result.paste(d_bl, (0,        CD + ch))
result.paste(d_bc, (CD,       CD + ch))
result.paste(d_br, (CD + cw,  CD + ch))

# ── Patch into atlas ──────────────────────────────────────────────────────────
atlas = Image.open(ATLAS_F).convert("RGBA")
atlas.paste(result, (ax, ay))
atlas.save(ATLAS_F)
print(f"Saved: {ATLAS_F}")

result.save("/tmp/fscounter_preview.png")
print("Preview: /tmp/fscounter_preview.png")
print("Done!")
