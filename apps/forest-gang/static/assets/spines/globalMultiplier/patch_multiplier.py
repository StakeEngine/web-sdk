"""
Replace Frame_Multiplier (and its glow version) in multiframe.png
with scatter_frame-style wood board using 9-slice scaling.
"""
import os
from PIL import Image, ImageFilter

DIR       = os.path.dirname(os.path.abspath(__file__))
SRC_FRAME = "/Users/stanislavmilev/Development/stake/forestSlot/apps/forest-gang/static/assets/components/frames/scatter_frame.png"
ATLAS_F   = os.path.join(DIR, "multiframe.png")
OUT_WEBP  = os.path.join(DIR, "multiframe.webp")

# Atlas regions from multiframe.atlas (scale:0.3)
# Frame_Multiplier  bounds:2,2,211,135   offsets:3,0,218,135
# Frame_Multiplier_glow  bounds:215,3,180,134  offsets:1,0,182,135
FRAME_X, FRAME_Y, FRAME_W, FRAME_H       = 2,   2,   211, 135
GLOW_X,  GLOW_Y,  GLOW_W,  GLOW_H       = 215, 3,   180, 134

sf = Image.open(SRC_FRAME).convert("RGBA")
SW, SH = sf.size   # 218 × 441

def nine_slice(src, sw, sh, cs_src, target_w, target_h, cs_dst):
    """Return a new image of (target_w × target_h) nine-sliced from src."""
    cw = target_w - 2 * cs_dst
    ch = target_h - 2 * cs_dst

    def crop(x1, y1, x2, y2):
        return src.crop((x1, y1, x2, y2))

    def rs(img, w, h):
        return img.resize((max(1, w), max(1, h)), Image.LANCZOS)

    tl = rs(crop(0,      0,        cs_src,    cs_src),    cs_dst, cs_dst)
    tc = rs(crop(cs_src, 0,        sw-cs_src, cs_src),    cw,     cs_dst)
    tr = rs(crop(sw-cs_src, 0,     sw,        cs_src),    cs_dst, cs_dst)
    ml = rs(crop(0,      cs_src,   cs_src,    sh-cs_src), cs_dst, ch)
    mc = rs(crop(cs_src, cs_src,   sw-cs_src, sh-cs_src), cw,     ch)
    mr = rs(crop(sw-cs_src, cs_src, sw,       sh-cs_src), cs_dst, ch)
    bl = rs(crop(0,      sh-cs_src, cs_src,   sh),        cs_dst, cs_dst)
    bc = rs(crop(cs_src, sh-cs_src, sw-cs_src, sh),       cw,     cs_dst)
    br = rs(crop(sw-cs_src, sh-cs_src, sw,    sh),        cs_dst, cs_dst)

    out = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    out.paste(tl, (0,           0))
    out.paste(tc, (cs_dst,      0))
    out.paste(tr, (cs_dst + cw, 0))
    out.paste(ml, (0,           cs_dst))
    out.paste(mc, (cs_dst,      cs_dst))
    out.paste(mr, (cs_dst + cw, cs_dst))
    out.paste(bl, (0,           cs_dst + ch))
    out.paste(bc, (cs_dst,      cs_dst + ch))
    out.paste(br, (cs_dst + cw, cs_dst + ch))
    return out

# ── Frame_Multiplier ──────────────────────────────────────────────────────────
CS_SRC = 68   # corner size in scatter_frame source (covers leaves + border)
CS_DST = 40   # corner size in destination atlas pixels
frame_board = nine_slice(sf, SW, SH, CS_SRC, FRAME_W, FRAME_H, CS_DST)
print(f"Frame_Multiplier: {FRAME_W}×{FRAME_H} with corner={CS_DST}")

# ── Frame_Multiplier_glow: same wood board + soft gold glow overlay ───────────
glow_board = nine_slice(sf, SW, SH, CS_SRC, GLOW_W, GLOW_H, CS_DST)
# Add a subtle warm gold glow tint over the border area
overlay = Image.new("RGBA", (GLOW_W, GLOW_H), (255, 200, 60, 0))
# Feathered glow: brighter toward edges, fade toward center
for y in range(GLOW_H):
    for x in range(GLOW_W):
        dist = min(x, y, GLOW_W-1-x, GLOW_H-1-y)
        alpha = max(0, int(120 * (1 - dist / CS_DST))) if dist < CS_DST else 0
        overlay.putpixel((x, y), (255, 200, 60, alpha))
glow_board = Image.alpha_composite(glow_board, overlay)
print(f"Frame_Multiplier_glow: {GLOW_W}×{GLOW_H}")

# ── Patch atlas ───────────────────────────────────────────────────────────────
atlas = Image.open(ATLAS_F).convert("RGBA")
atlas.paste(frame_board, (FRAME_X, FRAME_Y))
atlas.paste(glow_board,  (GLOW_X,  GLOW_Y))

atlas.save(ATLAS_F)
atlas.save(OUT_WEBP, format="WEBP", quality=92)
print(f"Saved: {ATLAS_F} + .webp")

frame_board.save("/tmp/multiplier_frame_preview.png")
glow_board.save("/tmp/multiplier_glow_preview.png")
print("Done!")
